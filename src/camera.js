
"use strict";

/**
 * Camera internal API.
 * @name camera
 * @namespace
 * @exports exports as camera
 */
b4w.module["__camera"] = function(exports, require) {

var m_bounds = require("__boundings");
var m_cfg    = require("__config");
var m_cons   = require("__constraints");
var m_print  = require("__print");
var m_util   = require("__util");

var m_vec3 = require("vec3");
var m_vec4 = require("vec4");
var m_quat = require("quat");
var m_mat3 = require("mat3");
var m_mat4 = require("mat4");

var cfg_ctl = m_cfg.controls;

// constants

exports.TYPE_NONE = 10;
exports.TYPE_PERSP = 20;
exports.TYPE_ORTHO = 30;
exports.TYPE_PERSP_ASPECT = 40;
exports.TYPE_ORTHO_ASPECT = 50;
exports.TYPE_ORTHO_ASYMMETRIC = 60;
exports.TYPE_STEREO_LEFT = 70;
exports.TYPE_STEREO_RIGHT = 80;

// contolled by low-level set_look_at()
exports.MS_STATIC = 0;

// deprecated
exports.MS_ANIMATION = 1;

// controlled by keyboard key directions:
// set_target(), set_eye_params()
exports.MS_TARGET_CONTROLS = 2;

// controlled by keyboard key directions
exports.MS_EYE_CONTROLS = 3;

// global params for all cameras


// convergence distance
var STEREO_CONV_DIST = 3*2.0;
// left-right eye distance (1/30 convergence)
//var STEREO_EYE_DIST = 3*0.065;
var STEREO_EYE_DIST = 0.065;

var DEF_WATER_PLANE_Y = -0.05;

var DEF_ORTHO_SCALE = 2.5;
var DEF_PERSP_FOV   = 40;
var DEF_PERSP_NEAR  = 0.1;
var DEF_PERSP_FAR   = 1000;

// for internal usage
var _vec2_tmp = new Float32Array(2);
var _vec3_tmp = new Float32Array(3);
var _vec3_tmp2 = new Float32Array(3);
var _quat4_tmp = new Float32Array(4);
var _vec4_tmp = new Float32Array(4);
var _vec4_tmp2 = new Float32Array(4);
var _mat3_tmp = new Float32Array(16);
var _mat4_tmp = new Float32Array(16);

/**
 * Create camera from bpy camera object
 * @param camobj Camera Object ID
 */
exports.camera_object_to_camera = function(camobj) {

    var render = camobj._render;

    var camobj_data = camobj["data"];

    switch (camobj_data["type"]) {
    case "PERSP":
        var cam = create_camera(exports.TYPE_PERSP);
        // NOTE: expect some issues with camera sensor fit
        if (camobj_data["angle_y"])
            var fov = camobj_data["angle_y"] / Math.PI * 180;

        set_frustum(cam, fov, camobj_data["clip_start"], 
                camobj_data["clip_end"]);
        break;
    case "ORTHO":
        var cam = create_camera(exports.TYPE_ORTHO);
        // vertical fit is only supported
        var top_bound = camobj_data["ortho_scale"] / 2;
        set_frustum(cam, top_bound, camobj_data["clip_start"], 
                camobj_data["clip_end"]);
        break;
    }

    cam.name = camobj["name"];

    render.trans_speed        = cfg_ctl.cam_trans_base_speed.slice();
    render.underwater         = false;
    render.move_style         = move_style_bpy_to_b4w(camobj_data["b4w_move_style"]);
    render.dof_distance       = camobj["data"]["dof_distance"];
    render.dof_object         = camobj["data"]["dof_object"];
    render.dof_front          = camobj["data"]["b4w_dof_front"];
    render.dof_rear           = camobj["data"]["b4w_dof_rear"];
    render.dof_power          = camobj["data"]["b4w_dof_power"];

    render.cameras  = [cam];

    render.use_distance_limits = camobj_data["b4w_use_distance_limits"];
    render.distance_min = camobj_data["b4w_distance_min"];
    render.distance_max = camobj_data["b4w_distance_max"];

    if (render.move_style == exports.MS_TARGET_CONTROLS) {
        render.pivot = new Float32Array(3);
        var pivot = new Float32Array(camobj_data["b4w_target"]);
        exports.set_point_constraint(camobj, pivot);
    } else
        render.pivot = null;

    // NOTE: clamping used only for TARGET and EYE camera
    render.vertical_limits = null;
    if (render.move_style == exports.MS_TARGET_CONTROLS
            || render.move_style == exports.MS_EYE_CONTROLS)
        if (camobj_data["b4w_use_vertical_clamping"])
            render.vertical_limits = {
                down: camobj_data["b4w_rotation_down_limit"],
                up: camobj_data["b4w_rotation_up_limit"]
            };
}

exports.set_point_constraint = function(camobj, pivot) {
    var render = camobj._render;
    m_vec3.copy(pivot, render.pivot);

    if (render.use_distance_limits)
        m_cons.append_follow_point(camobj, render.pivot, 
                render.distance_min, 
                render.distance_max);
    else
        m_cons.append_track_point(camobj, render.pivot);    
}

/** 
 * do not look in blender object
 */
function init_camera(type) {

    var cam = {};

    cam.size_mult = 1;
    
    cam.type = type;

    cam.framebuffer = null;
    cam.color_attachment = null;
    cam.depth_attachment = null;

    return cam;
}

function move_style_bpy_to_b4w(bpy_move_style) {
    switch(bpy_move_style) {
    case "STATIC":
        return exports.MS_STATIC;
        break;
    case "TARGET":
        return exports.MS_TARGET_CONTROLS;
        break;
    case "EYE":
        return exports.MS_EYE_CONTROLS;
        break;
    default:
        throw "Unknown move style";
    }
}


exports.create_camera = create_camera;
/**
 * @methodOf camera
 */
function create_camera(type) {

    var cam = init_camera(type);

    if (type == exports.TYPE_NONE)
        return cam;

    // for rendering
    cam.eye                   = new Float32Array(3);
    cam.eye_last              = new Float32Array(3);
    cam.quat                  = new Float32Array(4);
    cam.view_matrix           = new Float32Array(16);
    cam.proj_matrix           = new Float32Array(16);
    cam.view_proj_inv_matrix  = new Float32Array(16);
    cam.prev_view_proj_matrix = new Float32Array(16);
    cam.sky_vp_inv_matrix = new Float32Array(16);

    // used to extract frustum planes from
    cam.view_proj_matrix = new Float32Array(16);

    cam.frustum_planes = {
        left:   [0, 0, 0, 0],
        right:  [0, 0, 0, 0],
        top:    [0, 0, 0, 0],
        bottom: [0, 0, 0, 0],
        near:   [0, 0, 0, 0],
        far:    [0, 0, 0, 0]
    };

    switch (type) {
    case exports.TYPE_PERSP:
        set_frustum(cam, DEF_PERSP_FOV, 
                DEF_PERSP_NEAR, DEF_PERSP_FAR)
        break;
    case exports.TYPE_ORTHO:
        set_frustum(cam, DEF_ORTHO_SCALE, 
                DEF_PERSP_NEAR, DEF_PERSP_FAR)
        break;

    case exports.TYPE_PERSP_ASPECT:
        break;
    case exports.TYPE_ORTHO_ASPECT:
        break;
    case exports.TYPE_ORTHO_ASYMMETRIC:
        break;
    case exports.TYPE_STEREO_LEFT:
    case exports.TYPE_STEREO_RIGHT:
        throw "Stereo camera may only be created from perspective one";
        break;
    default:
        throw "Unknown camera type";
        break;
    }

    return cam;
}

exports.check_attachment = function(cam, type) {
    switch (type) {
    case "COLOR":
    case "CUBEMAP":
        return Boolean(cam.color_attachment);
    case "DEPTH":
        return Boolean(cam.depth_attachment);
    case "SCREEN":
        return (!Boolean(cam.color_attachment) && !Boolean(cam.depth_attachment));
    default:
        throw "Wrong attachment type: " + type;
        break;
    }
}

exports.set_attachment = function(cam, type, tex) {
    switch (type) {
    case "COLOR":
    case "CUBEMAP":
        cam.color_attachment = tex;
        break;
    case "DEPTH":
        cam.depth_attachment = tex;
        break;
    case "SCREEN":
        cam.color_attachment = null;
        cam.depth_attachment = null;
        break;
    default:
        throw "Wrong attachment type: " + type;
        break;
    }
}

exports.get_attachment = function(cam, type) {
    switch (type) {
    case "COLOR":
    case "CUBEMAP":
        return cam.color_attachment;
    case "DEPTH":
        return cam.depth_attachment;
    case "SCREEN":
        return null;
    default:
        throw "Wrong attachment type: " + type;
        break;
    }
}


/**
 * <p>Prepare camera for 3D stereo rendering
 * <p>Only standard perspective camera can be made stereo
 * @param cam Camera ID
 * @param type Stereo camera type (TYPE_STEREO_LEFT, TYPE_STEREO_RIGHT)
 */
exports.make_stereo = function(cam, type) {

    if (!(cam.type == exports.TYPE_PERSP && 
            (type == exports.TYPE_STEREO_LEFT ||
            type == exports.TYPE_STEREO_RIGHT)))
        throw "make_stereo(): wrong camera type";

    cam.type = type;

    set_stereo_params(cam, STEREO_CONV_DIST, STEREO_EYE_DIST);
}

exports.set_stereo_params = set_stereo_params;
/**
 * Set params for camera used in 3D stereo rendering.
 * @param cam Camera ID
 * @param {Number} conv_dist Distance from convergence plane
 * @param {Number} eye_dist Distance between two (human) eyes
 */
function set_stereo_params(cam, conv_dist, eye_dist) {

    if (!(cam.type == exports.TYPE_STEREO_LEFT || 
                cam.type == exports.TYPE_STEREO_RIGHT))
        throw "set_stereo_params(): wrong camera type";

    cam.stereo_conv_dist = conv_dist;
    cam.stereo_eye_dist = eye_dist;

    set_projection(cam, cam.aspect);
}

exports.rotate_h = rotate_h;
/**
 * Rotate camera in world space
 * @methodOf camera
 */
function rotate_h(camobj, angle) {

    var quat = camobj._render.quat;

    var rot = _quat4_tmp;
    var axis = _vec3_tmp;
    axis[0] = 0;
    axis[1] = 1;
    axis[2] = 0;

    m_quat.setAxisAngle(axis, angle, rot);
    m_quat.multiply(rot, quat, quat);
}

exports.rotate_v = rotate_v;
/**
 * Rotate camera in world space
 * @methodOf camera
 */
function rotate_v(camobj, angle) {

    var quat = camobj._render.quat;

    var rot = _quat4_tmp;
    var axis = _vec3_tmp;
    axis[0] = 1;
    axis[1] = 0;
    axis[2] = 0;

    m_quat.setAxisAngle(axis, angle, rot);
    m_quat.multiply(rot, quat, quat);
}

exports.rotate_h_local = rotate_h_local;
/**
 * Rotate camera in local space
 * @methodOf camera
 */
function rotate_h_local(camobj, angle) {

    var quat = camobj._render.quat;
    m_quat.invert(quat, quat);

    var rot = _quat4_tmp;
    var axis = _vec3_tmp;
    axis[0] = 0;
    axis[1] = 0;
    axis[2] = 1;

    // NOTE: inverted angle
    m_quat.setAxisAngle(axis, -angle, rot);
    m_quat.multiply(rot, quat, quat);

    m_quat.invert(quat, quat);
}

exports.rotate_v_local = rotate_v_local;
/**
 * Rotate camera in local space
 * @methodOf camera
 */
function rotate_v_local(camobj, angle) {

    var quat = camobj._render.quat;
    m_quat.invert(quat, quat);

    var rot = _quat4_tmp;
    var axis = _vec3_tmp;
    axis[0] = 1;
    axis[1] = 0;
    axis[2] = 0;

    // NOTE: inverted angle
    m_quat.setAxisAngle(axis, -angle, rot);
    m_quat.multiply(rot, quat, quat);

    m_quat.invert(quat, quat);
}

exports.get_angles = get_angles;
/**
 * Get camera vertical and horizontal angles
 * @methodOf camera
 * @param cam Camera ID
 * @param {vec2} dest Destination vector for camera angles ([h, v])
 */
function get_angles(cam, dest) {
    var render = cam._render;

    var y_world_cam = m_util.quat_to_dir(render.quat, m_util.AXIS_MY, _vec3_tmp);
    var theta = Math.asin(y_world_cam[1] / m_vec3.length(y_world_cam));

    if (y_world_cam[0] == 0 && y_world_cam[2] == 0)
        var phi = 0;
    else {
        // z_world_cam instead of y_world_cam, because 
        // y_world_cam[0], y_world_cam[2] ~ 0 near zenith/nadir point
        if (Math.abs(theta) > Math.PI / 4) {
            var z_world_cam = m_util.quat_to_dir(render.quat, m_util.AXIS_Z, _vec3_tmp2);
            
            var phi = Math.atan(Math.abs(z_world_cam[0] / z_world_cam[2]));

            if (y_world_cam[1] <= 0) {
                if (z_world_cam[2] < 0)
                    phi = Math.PI - phi;
                if (z_world_cam[0] < 0)
                    phi = 2 * Math.PI - phi;
            } else {
                if (z_world_cam[2] > 0)
                    phi = Math.PI - phi;
                if (z_world_cam[0] > 0)
                    phi = 2 * Math.PI - phi;
            }
        } else {
            var phi = Math.atan(Math.abs(y_world_cam[0] / y_world_cam[2]));

            if (y_world_cam[2] > 0)
                phi = Math.PI - phi;
            if (y_world_cam[0] > 0)
                phi = 2 * Math.PI - phi;
        }
    }

    dest[0] = phi;
    dest[1] = theta;

    return dest;
}

exports.set_frustum = set_frustum;
/**
 * Set frustum for symmetric camera with float or fixed aspect ratio
 * @methodOf camera
 * @param cam Camera ID
 * @param v_fov_or_top Vertical size
 * @param near Distance to near plane
 * @param far Distance to far plane
 * @param [h_fov_or_right] Horizontal size for camera with fixed aspect ratio
 */
function set_frustum(cam, v_fov_or_top, near, far, h_fov_or_right) {

    switch (cam.type) {
    case exports.TYPE_PERSP:
    case exports.TYPE_STEREO_LEFT:
    case exports.TYPE_STEREO_RIGHT:
        cam.fov = v_fov_or_top;
        cam.aspect = 1;
        break;
    case exports.TYPE_ORTHO:
        cam.top = v_fov_or_top;
        cam.aspect = 1;
        break;

    case exports.TYPE_PERSP_ASPECT:
        delete cam.fov;
        cam.fov = v_fov_or_top;
        cam.aspect = h_fov_or_right / v_fov_or_top;
        break;
    case exports.TYPE_ORTHO_ASPECT:
        cam.top = v_fov_or_top;
        cam.aspect = h_fov_or_right / v_fov_or_top;
    break;
    default:
        m_print.error("set_frustum(): Unsupported camera type: " + cam.type);
        break;
    }

    cam.near = near;
    cam.far = far;
}

exports.set_frustum_asymmetric = set_frustum_asymmetric;
/**
 * Set asymmetric frustum for ortho or stereo camera
 * @methodOf camera
 */
function set_frustum_asymmetric(cam, left, right, bottom, top, near, far) {

    switch (cam.type) {
    case exports.TYPE_ORTHO_ASYMMETRIC:

        cam.left = left;
        cam.right = right;
        cam.bottom = bottom;
        cam.top = top;

        cam.near = near;
        cam.far = far;

        break;
    default:
        m_print.error("set_frustum_asymmetric(): " + 
                "Unsupported camera type: " + cam.type);
        break;
    }
}

exports.get_move_style = get_move_style;
/**
 * @methodOf camera
 * @param camobj Camera Object ID
 */
function get_move_style(camobj) {
    return camobj._render.move_style;
}

exports.set_view = set_view;
/**
 * @methodOf camera
 */
function set_view(cam, camobj) {

    var trans = camobj._render.trans;
    var quat  = camobj._render.quat;

    var wm = _mat4_tmp;

    m_mat4.rotateX(camobj._render.world_matrix, -Math.PI/2, wm);
    m_mat4.invert(wm, cam.view_matrix);

    if (cam.reflection_plane) {
        reflect_view_matrix(cam);
        reflect_proj_matrix(cam);
    }

    var x = cam.view_matrix[12];
    var y = cam.view_matrix[13];
    var z = cam.view_matrix[14];

    if (cam.type == exports.TYPE_STEREO_LEFT)
        cam.view_matrix[12] += cam.stereo_eye_dist/2;
    else if (cam.type == exports.TYPE_STEREO_RIGHT)
        cam.view_matrix[12] -= cam.stereo_eye_dist/2;

    m_mat4.copy(cam.view_proj_matrix, cam.prev_view_proj_matrix);

    // update view projection matrix
    m_mat4.multiply(cam.proj_matrix, cam.view_matrix, cam.view_proj_matrix);

    calc_view_proj_inverse(cam);
    calc_sky_vp_inverse(cam);
        
    m_vec3.copy(cam.eye, cam.eye_last);
    m_vec3.copy(trans, cam.eye);
    m_quat.copy(quat, cam.quat);
}

/**
 * Reflect view matrix during reflection pass
 */
function reflect_view_matrix(cam) {
    var Nx = cam.reflection_plane[0];
    var Ny = cam.reflection_plane[1];
    var Nz = cam.reflection_plane[2];
    var D  = cam.reflection_plane[3];

    var refl_mat = _mat4_tmp;

    refl_mat[0] = 1.0 - 2.0 * Nx * Nx;
    refl_mat[1] = -2.0 * Nx * Ny;
    refl_mat[2] = -2.0 * Nx * Nz;
    refl_mat[3] = 0.0;

    refl_mat[4] = -2.0 * Nx * Ny;
    refl_mat[5] = 1.0 - 2.0 * Ny * Ny;
    refl_mat[6] = -2.0 * Ny * Nz;
    refl_mat[7] = 0.0;    

    refl_mat[8] = -2.0 * Nx * Nz;
    refl_mat[9] = -2.0 * Ny * Nz;
    refl_mat[10] = 1.0 - 2.0 * Nz * Nz;
    refl_mat[11] = 0.0;

    refl_mat[12] = -2.0 * Nx * D;
    refl_mat[13] = -2.0 * Ny * D;
    refl_mat[14] = -2.0 * Nz * D;
    refl_mat[15] = 1.0;

    m_mat4.multiply(cam.view_matrix, refl_mat, cam.view_matrix);
}

/**
 * Change projection matrix for reflected camera during reflection pass
 */
function reflect_proj_matrix(cam) {
    set_projection(cam, cam.aspect, true);
    
    var plane = _vec4_tmp;
    var view_inv_transp_matrix = _mat4_tmp;

    m_mat4.invert(cam.view_matrix, view_inv_transp_matrix);
    m_mat4.transpose(view_inv_transp_matrix, view_inv_transp_matrix);
    m_vec4.transformMat4(cam.reflection_plane, view_inv_transp_matrix, plane);

    // NOTE: negate reflection plane if camera is behind the plane
    //if (plane[3] > 0)
    //    m_vec4.negate(plane, plane);

    var corner_point = _vec4_tmp2;
    corner_point[0] = (m_util.sign(plane[0]) + cam.proj_matrix[8]) / cam.proj_matrix[0];
    corner_point[1] = (m_util.sign(plane[1]) + cam.proj_matrix[9]) / cam.proj_matrix[5];
    corner_point[2] = -1;
    corner_point[3] = (1.0 + cam.proj_matrix[10] ) / cam.proj_matrix[14];
    var dot = plane[0] * corner_point[0] + plane[1] * corner_point[1] 
            + plane[2] * corner_point[2] + plane[3] * corner_point[3];

    m_vec4.scale(plane, 2.0/dot, plane);

    cam.proj_matrix[2]  = plane[0];
    cam.proj_matrix[6]  = plane[1];
    cam.proj_matrix[10] = plane[2] + 1.0;
    cam.proj_matrix[14] = plane[3];
}

exports.set_view_eye_target_up = set_view_eye_target_up;
/**
 * Set camera view matrix
 * @param cam CAM object
 * @param {vec3} eye Camera eye point
 * @param {vec3} target Camera target point
 * @param {vec3} up Camera up direction
 * @methodOf camera
 * @deprecated Deprecated
 */
function set_view_eye_target_up(cam, eye, target, up) {

    m_mat4.lookAt(eye, target, up, cam.view_matrix);

    if (cam.type == exports.TYPE_STEREO_LEFT)
        cam.view_matrix[12] += cam.stereo_eye_dist/2;
    else if (cam.type == exports.TYPE_STEREO_RIGHT)
        cam.view_matrix[12] -= cam.stereo_eye_dist/2;

    // update view projection matrix
    m_mat4.multiply(cam.proj_matrix, cam.view_matrix, cam.view_proj_matrix);

    calc_view_proj_inverse(cam);
    calc_sky_vp_inverse(cam);
        
    m_vec3.copy(eye, cam.eye);

    // NOTE: some eye_last,trans,quat manipulations
}

/**
 * Simplified version to set non-camera object cams
 * @param cam CAM object
 * @param {vec3} trans Translation
 * @param {vec4} quat Rotation quaternion
 */
exports.set_view_trans_quat = function(cam, trans, quat) {

    // eye relative target
    var target = _vec3_tmp;
    target[0] = 0;
    target[1] =-1;
    target[2] = 0;
    
    m_vec3.transformQuat(target, quat, target);

    // absolute target
    target[0] += trans[0];
    target[1] += trans[1];
    target[2] += trans[2];

    var up = _vec3_tmp2;
    up[0] = 0;
    up[1] = 0;
    up[2] =-1;
    m_vec3.transformQuat(up, quat, up);

    // NOTE: set view directly
    set_view_eye_target_up(cam, trans, target, up);
}

exports.set_camera_trans_quat = function(obj, trans, quat) {
    if (obj["type"] != "CAMERA")
        throw "Wrong camera object";

    var render = obj._render;

    render.trans[0] = trans[0];
    render.trans[1] = trans[1];
    render.trans[2] = trans[2];
    
    render.quat[0] = quat[0];
    render.quat[1] = quat[1];
    render.quat[2] = quat[2];
    render.quat[3] = quat[3];
}

exports.eye_target_up_to_trans_quat = function(eye, target, up, trans, quat) {
    trans[0] = eye[0];
    trans[1] = eye[1];
    trans[2] = eye[2];

    m_mat4.lookAt(eye, target, up, _mat4_tmp);
    m_mat4.invert(_mat4_tmp, _mat4_tmp);
    m_mat4.rotateX(_mat4_tmp, Math.PI/2, _mat4_tmp); 

    var rot_matrix = _mat3_tmp;
    m_mat3.fromMat4(_mat4_tmp, rot_matrix);
    m_util.mat3_to_quat(rot_matrix, quat);
}

exports.update_camera_transform = function(obj) {
    var cameras = obj._render.cameras;
    if (!cameras)
        throw "Wrong object";

    var render = obj._render;

    for (var i = 0; i < cameras.length; i++) {
        var cam = cameras[i];
        set_view(cam, obj);
        m_util.extract_frustum_planes(cam.view_proj_matrix, cam.frustum_planes);

        if (cam.dof_object) {
            if (cam.dof_on) {
                var cam_loc = render.trans;
                var obj_loc = cam.dof_object.location;
                var dof_dist = m_vec3.dist(cam_loc, obj_loc);
                cam.dof_distance = dof_dist;
            } else {
                cam.dof_distance = 0;
            }
        }
    }
}

exports.clamp_vertical_limits = function(obj) {
    var render = obj._render;

    if (render.vertical_limits !== null) {

        var angles = get_angles(obj, _vec2_tmp);
        var phi = angles[0];
        var theta = angles[1];

        var z_world_cam = m_util.quat_to_dir(render.quat, m_util.AXIS_Z, _vec3_tmp);
        var camera_upside_down = m_util.sign(z_world_cam[1]);

        // NOTE: overshoot case
        if (Math.abs(theta) > Math.PI / 4)
            if (camera_upside_down == 1)
                phi += Math.PI;

        // NOTE: clamping theta - [0, Pi]
        var clamping_theta = theta;        
        if (camera_upside_down == 1)
            clamping_theta = m_util.sign(theta) * Math.PI - theta;

        
        // NOTE: clamping
        var is_clamped = false;
        if (clamping_theta < -render.vertical_limits.down) {
            var new_theta = -render.vertical_limits.down;
            if (new_theta < -Math.PI / 2)
                new_theta = -Math.PI - new_theta;

            var return_rotation = -camera_upside_down * (new_theta - theta);

            // fix camera overshooting for limits smaller than PI/2
            if (camera_upside_down == 1 && render.vertical_limits.down < Math.PI / 2) {
                phi += Math.PI;
                return_rotation += Math.PI - 2 * render.vertical_limits.down;
            }
            is_clamped = true;

        }
        if (clamping_theta > render.vertical_limits.up) {
            var new_theta = render.vertical_limits.up;
            if (new_theta > Math.PI / 2)
                new_theta = Math.PI - new_theta;

            var return_rotation = -camera_upside_down * (new_theta - theta);

            // fix camera overshooting for limits smaller than PI/2
            if (camera_upside_down == 1 && render.vertical_limits.up < Math.PI / 2) {
                phi += Math.PI;
                return_rotation -= Math.PI - 2 * render.vertical_limits.up;
            }
            is_clamped = true;
        }   

        if (is_clamped) {
            // NOTE: if camera has TARGET move style, then change translation 
            // vector related to theta angle
            if (render.move_style == exports.MS_TARGET_CONTROLS) {
                
                var sin_phi = Math.sin(phi);
                var cos_phi = Math.cos(phi);

                var sin_theta = Math.sin(new_theta);
                var cos_theta = Math.cos(new_theta);

                // camera trans relative to target location
                render.trans[0] -= obj._constraint.target[0];
                render.trans[1] -= obj._constraint.target[1];
                render.trans[2] -= obj._constraint.target[2];

                var len = m_vec3.length(render.trans);
                render.trans[0] = cos_theta * sin_phi;
                render.trans[1] = -sin_theta;
                render.trans[2] = cos_theta * cos_phi;

                m_vec3.scale(render.trans, len / m_vec3.length(render.trans), render.trans);
                
                // returning into world coordinate system
                render.trans[0] += obj._constraint.target[0];
                render.trans[1] += obj._constraint.target[1];
                render.trans[2] += obj._constraint.target[2];
            }

            // NOTE: change camera quaternion 
            var axis = m_vec3.transformQuat(m_util.AXIS_X, render.quat, _vec3_tmp);
            // NOTE: avoid accumulating accuracy errors
            m_vec3.normalize(axis, axis);
            
            var clamp_rotation = m_quat.setAxisAngle(axis, return_rotation, 
                    _quat4_tmp);
            m_quat.multiply(clamp_rotation, render.quat, render.quat);
        }
    }
}

/**
 * Check if camera has float or fixed aspect ratio
 */
exports.is_float_aspect = function(cam) {
    switch (cam.type) {

    case exports.TYPE_PERSP:
    case exports.TYPE_ORTHO:
    case exports.TYPE_STEREO_LEFT:
    case exports.TYPE_STEREO_RIGHT:
        return true;

    default:
        return false;
    }
}

/**
 * Return camera angular diameter, calculated from FOV
 */
exports.get_angular_diameter  = function(camobj) {
    // NOTE: is it really ok?
    var cam = camobj._render.cameras[0];

    switch (cam.type) {
    case exports.TYPE_PERSP:
    case exports.TYPE_PERSP_ASPECT:
    case exports.TYPE_STEREO_LEFT:
    case exports.TYPE_STEREO_RIGHT:
        return (Math.PI * cam.fov / 180);
    default:
        m_print.error("get_min_fov(): Unsupported camera type: " + cam.type);
        return 0;
    }
}

exports.set_projection = set_projection;
/**
 * @methodOf camera
 * @param cam Camera ID
 * @param [aspect] Aspect ratio for camera with float aspect
 * @param [Boolean] keep_proj_view Don't update view projection matrix
 */
function set_projection(cam, aspect, keep_proj_view) {

    switch (cam.type) {
    case exports.TYPE_PERSP:
        if (!aspect)
            throw "No aspect ratio";
        cam.aspect = aspect;
        // continue
    case exports.TYPE_PERSP_ASPECT:
        m_mat4.perspective(m_util.rad(cam.fov), cam.aspect, cam.near, cam.far, 
                cam.proj_matrix);
        break;

    case exports.TYPE_ORTHO:
        if (!aspect)
            throw "No aspect ratio";
        cam.aspect = aspect;
        // continue
    case exports.TYPE_ORTHO_ASPECT:
        var right = cam.top * cam.aspect;
        m_mat4.ortho(-right, right, -cam.top, cam.top, 
                cam.near, cam.far, cam.proj_matrix);
        break;

    case exports.TYPE_ORTHO_ASYMMETRIC:
        // it seams that m_mat4.ortho in general needs positive z values
        m_mat4.ortho(cam.left, cam.right, cam.bottom, cam.top, 
                cam.near, cam.far, cam.proj_matrix);
        break;

    case exports.TYPE_STEREO_LEFT:
    case exports.TYPE_STEREO_RIGHT:
        if (!aspect)
            throw "No aspect ratio";
        cam.aspect = aspect;
        set_projection_stereo(cam);
        break;

    case exports.TYPE_NONE:
        return;
    default:
        throw "Wrong camera type: " + cam.type;
    }

    // update view projection matrix
    if (!keep_proj_view) {
        m_mat4.multiply(cam.proj_matrix, cam.view_matrix, cam.view_proj_matrix);
        calc_view_proj_inverse(cam);
        calc_sky_vp_inverse(cam);
    }
}

function set_projection_stereo(cam) {

    var fov_tan = Math.tan(cam.fov * Math.PI / 360.0);

    var top = cam.near * fov_tan;
    var bottom = -top;

    // half of convergence plane in horizontal direction
    var a = cam.aspect * cam.stereo_conv_dist * fov_tan;

    if (cam.type == exports.TYPE_STEREO_LEFT) {
        // part of convergence plane left to eye
        var b = a - cam.stereo_eye_dist/2;
        // part of convergence plane right to eye
        var c = a + cam.stereo_eye_dist/2;
    } else {
        var b = a + cam.stereo_eye_dist/2;
        var c = a - cam.stereo_eye_dist/2;
    }

    var left = -(cam.near / cam.stereo_conv_dist * b);
    var right = cam.near / cam.stereo_conv_dist * c;

    m_mat4.frustum(left, right, bottom, top, cam.near, cam.far, 
            cam.proj_matrix);

    // NOTE: save for extraction
    cam.left = left;
    cam.right = right;
}

exports.calc_sky_vp_inverse = calc_sky_vp_inverse;
/**
 * @methodOf camera
 */
function calc_sky_vp_inverse(cam) {
    //mat4.toRotationMat(cam.view_matrix, cam.sky_vp_inv_matrix);
    m_mat4.copy(cam.view_matrix, cam.sky_vp_inv_matrix);
    cam.sky_vp_inv_matrix[12] = 0;
    cam.sky_vp_inv_matrix[13] = 0;
    cam.sky_vp_inv_matrix[14] = 0;
    cam.sky_vp_inv_matrix[15] = 1;

    m_mat4.multiply(cam.proj_matrix, cam.sky_vp_inv_matrix,
            cam.sky_vp_inv_matrix);
    m_mat4.invert(cam.sky_vp_inv_matrix, cam.sky_vp_inv_matrix);
}

exports.calc_view_proj_inverse = calc_view_proj_inverse;
/**
 * @methodOf camera
 */
function calc_view_proj_inverse(cam) {
    m_mat4.copy(cam.view_matrix, cam.view_proj_inv_matrix);
    m_mat4.multiply(cam.proj_matrix, cam.view_proj_inv_matrix,
            cam.view_proj_inv_matrix);
    m_mat4.invert(cam.view_proj_inv_matrix, cam.view_proj_inv_matrix);
}

/**
 * Extract frustum corner coords (in world space)
 */
exports.extract_frustum_corners = function(cam, near, far, corners) {
    if (!corners)
        var corners = new Float32Array(24);

    if (!near)
        var near = cam.near;
    if (!far)
        var far = cam.far;

    var top_near, right_near, left_near, bottom_near;
    var top_far, right_far, left_far, bottom_far;

    switch (cam.type) {

    case exports.TYPE_NONE:
        throw "Extraction from NONE camera is not possible";
        break;

    case exports.TYPE_PERSP:
    case exports.TYPE_PERSP_ASPECT:
        top_near = near * Math.tan(cam.fov * Math.PI / 360.0);
        right_near = top_near * cam.aspect;

        bottom_near = -top_near;
        left_near = -right_near;

        top_far = far * Math.tan(cam.fov * Math.PI / 360.0);
        right_far = top_far * cam.aspect;

        bottom_far = -top_far;
        left_far = -right_far;

        break;
    case exports.TYPE_ORTHO:
    case exports.TYPE_ORTHO_ASPECT:
        var right = cam.top * cam.aspect;

        top_near = top_far = cam.top;
        right_near = right_far = right;

        bottom_near = bottom_far = -cam.top;
        left_near = left_far = -right;

        break;
    case exports.TYPE_ORTHO_ASYMMETRIC:
        top_near = top_far = cam.top;
        right_near = right_far = cam.right;

        bottom_near = bottom_far = cam.bottom;
        left_near = left_far = cam.left;

        break;

    case exports.TYPE_STEREO_LEFT:
    case exports.TYPE_STEREO_RIGHT:
        top_near = near * Math.tan(cam.fov * Math.PI / 360.0);
        right_near = cam.right;

        bottom_near = -top_near;
        left_near = cam.left;

        var k = far/near;

        top_far = top_near * k;
        right_far = right_near * k;

        bottom_far = bottom_near * k;
        left_far = left_near * k;

        break;

    default:
        throw "Wrong camera type: " + cam.type;
    }
 
    // near 1,2,3,4 CCW from zero point of view
    corners[0] = left_near;
    corners[1] = bottom_near;
    corners[2] = -near;

    corners[3] = right_near;
    corners[4] = bottom_near;
    corners[5] = -near;

    corners[6] = right_near;
    corners[7] = top_near;
    corners[8] = -near;

    corners[9] = left_near;
    corners[10] = top_near;
    corners[11] = -near;

    // far 5,6,7,8 CW from zero point of view
    corners[12] = left_far;
    corners[13] = bottom_far;
    corners[14] = -far;

    corners[15] = left_far;
    corners[16] = top_far;
    corners[17] = -far;

    corners[18] = right_far;
    corners[19] = top_far;
    corners[20] = -far;

    corners[21] = right_far;
    corners[22] = bottom_far;
    corners[23] = -far;

    var view_inv = _mat4_tmp;
    m_mat4.invert(cam.view_matrix, view_inv);
    // to world space
    m_util.positions_multiply_matrix(corners, view_inv, corners, 0);

    return corners;
}

/**
 * Assign boundings for camera
 */
exports.assign_boundings = function(camobj) {

    // camera collision capsule consists of the cylinder (with height) 
    // and two hemispheres (with radius)
    // its mass center coords are relative to camera pos
    
    var CAM_COLL_HEIGHT = 1.75; // how tall is camera collision volume
    var CAM_COLL_RADIUS = 0.35; // how fat is camera collision volume, equels to cylinder radius

    var render = camobj._render;

    // NOTE: center = 1/2 height
    var bb = m_bounds.zero_bounding_box();

    bb.min_x =-0.5,
    bb.max_x = 0.5,
    bb.min_y =-0.5,
    bb.max_y = 0.5
    bb.min_z = 0.0,
    bb.max_z = 1.8,

    render.bb_local = bb;

    var bs = m_bounds.zero_bounding_sphere();
    bs.radius = 2;
    render.bs_local = bs;

    var EYE_OFFSET = 0.15; //human eyes below head top

    render.bcap_local = {
        radius: CAM_COLL_RADIUS,
        height: CAM_COLL_HEIGHT - 2 * CAM_COLL_RADIUS,
        center: [0, 0, CAM_COLL_HEIGHT / 2 - EYE_OFFSET]
    };
}

exports.is_camera = is_camera;
/**
 * @methodOf camera
 */
function is_camera(obj) {
    if (obj["type"] === "CAMERA")
        return true;
    else
        return false;
}


/**
 * Check if object is camera and has MS_TARGET_CONTROLS move style
 */
exports.is_target_camera = function(obj) {
    if (is_camera(obj) && obj._render && 
            obj._render.move_style == exports.MS_TARGET_CONTROLS)
        return true;
    else
        return false;
}

}
