/**
 * Copyright (C) 2014-2016 Triumph LLC
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

/**
 * Camera internal API.
 * @name camera
 * @namespace
 * @exports exports as camera
 */
b4w.module["__camera"] = function(exports, require) {

var m_bounds   = require("__boundings");
var m_cfg      = require("__config");
var m_cons     = require("__constraints");
var m_cont     = require("__container");
var m_mat4     = require("__mat4");
var m_math     = require("__math");
var m_obj_util = require("__obj_util");
var m_print    = require("__print");
var m_quat     = require("__quat");
var m_scenes   = require("__scenes");
var m_subs     = require("__subscene");
var m_trans    = require("__transform");
var m_tsr      = require("__tsr");
var m_util     = require("__util");
var m_vec3     = require("__vec3");
var m_vec4     = require("__vec4");

var cfg_ctl = m_cfg.controls;
var cfg_def = m_cfg.defaults;

// constants
var TYPE_STEREO_LEFT = 70;
var TYPE_STEREO_RIGHT = 80;
var TYPE_HMD_LEFT = 90;
var TYPE_HMD_RIGHT = 100;

exports.TYPE_NONE = 10;
exports.TYPE_PERSP = 20;
exports.TYPE_ORTHO = 30;
exports.TYPE_PERSP_ASPECT = 40;
exports.TYPE_ORTHO_ASPECT = 50;
exports.TYPE_ORTHO_ASYMMETRIC = 60;
exports.TYPE_STEREO_LEFT = TYPE_STEREO_LEFT;
exports.TYPE_STEREO_RIGHT = TYPE_STEREO_RIGHT;
exports.TYPE_HMD_LEFT = TYPE_HMD_LEFT;
exports.TYPE_HMD_RIGHT = TYPE_HMD_RIGHT;

// contolled by low-level set_look_at()
exports.MS_STATIC = 0;

// controlled by keyboard key directions:
exports.MS_TARGET_CONTROLS = 2;

// controlled by keyboard key directions
exports.MS_EYE_CONTROLS = 3;

// controlled by keyboard key directions:
exports.MS_HOVER_CONTROLS = 4;

// global params for all cameras

var PIVOT_DEFAULT_DIST = 10;

// convergence distance
var STEREO_CONV_DIST = 6.0;
// left-right eye distance (1/30 convergence)
var STEREO_EYE_DIST = 0.065;

var DEF_WATER_PLANE_Y = -0.05;

var DEF_ORTHO_SCALE = 2.5;
var DEF_PERSP_FOV   = 40;
var DEF_PERSP_NEAR  = 0.1;
var DEF_PERSP_FAR   = 1000;

var MAX_HOVER_INIT_ANGLE = m_util.deg_to_rad(0.5);

// for internal usage
var _vec2_tmp = new Float32Array(2);
var _vec2_tmp2 = new Float32Array(2);
var _vec3_tmp = new Float32Array(3);
var _vec3_tmp2 = new Float32Array(3);
var _vec3_tmp3 = new Float32Array(3);
var _quat4_tmp = new Float32Array(4);
var _quat4_tmp2 = new Float32Array(4);
var _vec4_tmp = new Float32Array(4);
var _vec4_tmp2 = new Float32Array(4);
var _mat4_tmp = new Float32Array(16);

var _frustum_corners_tmp = new Float32Array(24);

var _pline_tmp = new Float32Array(6);

/**
 * Create camera from bpy camera object
 * uses _vec3_tmp2
 */
exports.camera_object_to_camera = function(bpy_camobj, camobj) {
    var render = camobj.render;

    var camobj_data = bpy_camobj["data"];

    switch (camobj_data["type"]) {
    case "PERSP":
        var cam = create_camera(exports.TYPE_PERSP);
        // NOTE: expect some issues with camera sensor fit
        if (camobj_data["angle_y"])
            var fov = m_util.rad_to_deg(camobj_data["angle_y"]);

        set_frustum(cam, fov, camobj_data["clip_start"],
                camobj_data["clip_end"]);
        break;
    case "ORTHO":
        var cam = create_camera(exports.TYPE_ORTHO);
        // vertical rotation fit is only supported
        var top_bound = camobj_data["ortho_scale"] / 2;
        set_frustum(cam, top_bound, camobj_data["clip_start"],
                camobj_data["clip_end"]);
        break;
    }

    cam.name = camobj.name;
    var cam_scenes_data = camobj.scenes_data;
    cam_scenes_data[0].cameras.push(cam);
    for (var i = 1; i < cam_scenes_data.length; i++) {
        var new_cam = clone_camera(cam, false);
        cam_scenes_data[i].cameras.push(new_cam);
    }

    render.move_style                = move_style_bpy_to_b4w(camobj_data["b4w_move_style"]);
    render.dof_distance              = camobj_data["dof_distance"];

    var dof_obj = camobj_data["dof_object"];
    render.dof_object = dof_obj ? dof_obj._object : null;

    render.dof_front_start           = camobj_data["b4w_dof_front_start"];
    render.dof_front_end             = camobj_data["b4w_dof_front_end"];
    render.dof_rear_start            = camobj_data["b4w_dof_rear_start"];
    render.dof_rear_end              = camobj_data["b4w_dof_rear_end"];
    render.dof_power                 = camobj_data["b4w_dof_power"];
    render.dof_bokeh                 = camobj_data["b4w_dof_bokeh"];
    render.dof_bokeh_intensity       = camobj_data["b4w_dof_bokeh_intensity"];
    render.dof_foreground_blur       = camobj_data["b4w_dof_foreground_blur"];

    render.velocity_trans = camobj_data["b4w_trans_velocity"];
    render.velocity_rot   = camobj_data["b4w_rot_velocity"];
    render.velocity_zoom  = camobj_data["b4w_zoom_velocity"];

    var hor_rot_limits = hor_rot_limits_bpy_to_b4w(bpy_camobj, camobj);
    var vert_rot_limits = vert_rot_limits_bpy_to_b4w(bpy_camobj, camobj);
    var dist_limits = dist_limits_bpy_to_b4w(bpy_camobj, camobj);
    var hor_trans_limits = hor_trans_limits_bpy_to_b4w(bpy_camobj, camobj);
    var vert_trans_limits = vert_trans_limits_bpy_to_b4w(bpy_camobj, camobj);
    var pivot_limits = pivot_limits_bpy_to_b4w(bpy_camobj, camobj);

    switch (render.move_style) {
    case exports.MS_STATIC:
        break;
    case exports.MS_EYE_CONTROLS:
        var pos = m_tsr.get_trans_view(camobj.render.world_tsr);
        setup_eye_model(camobj, pos, null, hor_rot_limits, vert_rot_limits);
        break;
    case exports.MS_TARGET_CONTROLS:
        var pos = m_tsr.get_trans_view(camobj.render.world_tsr);
        setup_target_model(camobj, pos, camobj_data["b4w_target"], 
                hor_rot_limits, vert_rot_limits, dist_limits, pivot_limits,
                camobj_data["b4w_use_panning"]);
        break;
    case exports.MS_HOVER_CONTROLS:
        var pos = m_tsr.get_trans_view(camobj.render.world_tsr);
        var pivot = init_hover_pivot(camobj, 
                bpy_camobj["data"]["b4w_hover_zero_level"], _vec3_tmp2);
        setup_hover_model(camobj, pos, pivot, dist_limits, vert_rot_limits, 
                hor_trans_limits, vert_trans_limits, 
                camobj_data["b4w_enable_hover_hor_rotation"]);
        break;
    }

    clamp_limits(camobj);
    init_ortho_props(camobj);
}

function hor_rot_limits_bpy_to_b4w(bpy_camobj, camobj) {
    var ms = camobj.render.move_style;
    var data = bpy_camobj["data"];

    var hor_rot_limits = null;

    if ((ms == exports.MS_TARGET_CONTROLS || ms == exports.MS_EYE_CONTROLS) 
            && data["b4w_use_horizontal_clamping"]) {
        
        hor_rot_limits = {
            left: data["b4w_rotation_left_limit"],
            right: data["b4w_rotation_right_limit"],
            camera_space: data["b4w_horizontal_clamping_type"] == "LOCAL"
        }

        if (ms == exports.MS_EYE_CONTROLS) {
            // CCW: right->left for EYE camera
            hor_rot_limits.left *= -1;
            hor_rot_limits.right *= -1;
        }

    }

    return hor_rot_limits;
}

function vert_rot_limits_bpy_to_b4w(bpy_camobj, camobj) {
    var ms = camobj.render.move_style;
    var data = bpy_camobj["data"];

    var vert_rot_limits = null;

    if ((ms == exports.MS_TARGET_CONTROLS || ms == exports.MS_EYE_CONTROLS) 
            && data["b4w_use_vertical_clamping"]) {

        vert_rot_limits = {
            down: data["b4w_rotation_down_limit"],
            up: data["b4w_rotation_up_limit"],
            camera_space: data["b4w_vertical_clamping_type"] == "LOCAL"
        }

        if (ms == exports.MS_TARGET_CONTROLS) {
            // CCW: up->down for TARGET camera
            vert_rot_limits.down *= -1;
            vert_rot_limits.up *= -1;
        }

    } else if (ms == exports.MS_HOVER_CONTROLS && data["b4w_use_zooming"]) {
        if (data["b4w_hover_angle_min"] <= data["b4w_hover_angle_max"]) {
            vert_rot_limits = {
                down: data["b4w_hover_angle_min"],
                up: data["b4w_hover_angle_max"]
            }

            // CCW: up->down for HOVER camera
            vert_rot_limits.down *= -1;
            vert_rot_limits.up *= -1;
        } else
            m_print.error("Wrong angle limits for the HOVER camera. Disabling angle limits.");
    }

    return vert_rot_limits;
}

function dist_limits_bpy_to_b4w(bpy_camobj, camobj) {
    var ms = camobj.render.move_style;
    var data = bpy_camobj["data"];

    var dist_limits = null;

    if (ms == exports.MS_TARGET_CONTROLS && data["b4w_use_target_distance_limits"] 
            && (data["b4w_distance_min"] <= data["b4w_distance_max"]))
        // enable distance clamping only if the distance limits are correct
        dist_limits = {
            min: data["b4w_distance_min"],
            max: data["b4w_distance_max"]
        }
    else if (ms === exports.MS_HOVER_CONTROLS && data["b4w_use_zooming"]) {
        if (data["b4w_distance_min"] <= data["b4w_distance_max"])
            dist_limits = {
                min: data["b4w_distance_min"],
                max: data["b4w_distance_max"]
            }
        else
            m_print.error("Wrong distance limits for the HOVER camera. Disabling distance limits.");
    }

    return dist_limits;
}

function hor_trans_limits_bpy_to_b4w(bpy_camobj, camobj) {
    var ms = camobj.render.move_style;
    var data = bpy_camobj["data"];

    var hor_trans_limits = null;

    if (ms == exports.MS_HOVER_CONTROLS && data["b4w_use_horizontal_clamping"]
            && (data["b4w_horizontal_translation_min"]
            <= data["b4w_horizontal_translation_max"]))
        hor_trans_limits = {
            min: data["b4w_horizontal_translation_min"],
            max: data["b4w_horizontal_translation_max"]
        }

    return hor_trans_limits;
}

function vert_trans_limits_bpy_to_b4w(bpy_camobj, camobj) {
    var ms = camobj.render.move_style;
    var data = bpy_camobj["data"];

    var vert_trans_limits = null;

    if (ms == exports.MS_HOVER_CONTROLS && data["b4w_use_vertical_clamping"]
            && (data["b4w_vertical_translation_min"]
            <= data["b4w_vertical_translation_max"])) {
        
        vert_trans_limits = {
            min: data["b4w_vertical_translation_min"],
            max: data["b4w_vertical_translation_max"]
        }
    }
    return vert_trans_limits;
}

function pivot_limits_bpy_to_b4w(bpy_camobj, camobj) {
    var ms = camobj.render.move_style;
    var data = bpy_camobj["data"];

    var pivot_limits = null;

    if (ms == exports.MS_TARGET_CONTROLS && data["b4w_use_pivot_limits"])
        pivot_limits = {
            min_z: data["b4w_pivot_z_min"],
            max_z: data["b4w_pivot_z_max"]
        }

    return pivot_limits;
}

exports.setup_eye_model = setup_eye_model;
function setup_eye_model(camobj, pos, look_at, hor_rot_lim, vert_rot_lim) {
    var render = camobj.render;

    m_trans.set_translation(camobj, pos);
    if (look_at)
        set_look_at_corrected(camobj, pos, look_at);

    set_horizontal_rot_limits(camobj, hor_rot_lim);
    set_vertical_rot_limits(camobj, vert_rot_lim);
}

exports.setup_target_model = setup_target_model;
function setup_target_model(camobj, pos, pivot, hor_rot_lim, vert_rot_lim, 
        dist_lim, pivot_lim, use_panning) {
    var render = camobj.render;

    m_trans.set_translation(camobj, pos);
    render.pivot.set(pivot);

    set_look_at_corrected(camobj, pos, pivot);

    set_horizontal_rot_limits(camobj, hor_rot_lim);
    set_vertical_rot_limits(camobj, vert_rot_lim);
    set_distance_limits(camobj, dist_lim);
    set_pivot_limits(camobj, pivot_lim);
    render.use_panning = use_panning;
}

exports.setup_hover_model = setup_hover_model;
function setup_hover_model(camobj, pos, pivot, dist_lim, angle_lim, 
        hor_trans_lim, vert_trans_lim, hor_rotation) {
    var render = camobj.render;

    m_trans.set_translation(camobj, pos);
    render.hover_pivot.set(pivot);
    set_look_at_corrected(camobj, pos, pivot);

    hover_set_distance_limits(camobj, dist_lim);
    hover_set_vertical_limits(camobj, angle_lim);

    set_hor_trans_limits(camobj, hor_trans_lim);
    set_vert_trans_limits(camobj, vert_trans_lim);

    render.enable_hover_hor_rotation = hor_rotation;
}

/**
 * uses _vec2_tmp, _vec3_tmp, _vec4_tmp
 */
function init_hover_pivot(camobj, zero_level, dest) {
    var render = camobj.render;
    var trans = m_tsr.get_trans_view(render.world_tsr);
    var quat = m_tsr.get_quat_view(render.world_tsr);
    
    var normal_plane_oxy = _vec4_tmp;
    normal_plane_oxy.set(m_util.AXIS_Z);
    normal_plane_oxy[3] = 0;

    var theta = get_camera_angles(camobj, _vec2_tmp)[1];

    var view_vector = m_util.quat_to_dir(quat, m_util.AXIS_MZ, _vec3_tmp);

    m_math.set_pline_initial_point(_pline_tmp, trans);
    m_math.set_pline_directional_vec(_pline_tmp, view_vector);
    var res = m_util.line_plane_intersect(normal_plane_oxy, 
            -zero_level, _pline_tmp, dest);

    // NOTE: It is used to check parallel line and plane
    if (!res || Math.abs(theta) < MAX_HOVER_INIT_ANGLE) {
        m_print.warn("Active hover camera view vector and the supporting plane " 
                + "are parallel to each other. Hover pivot will be set based on the " 
                + "camera position.");
        dest[0] = trans[0];
        dest[1] = 0;
        dest[2] = trans[2];
    }

    return dest;
}

exports.init_ortho_props = init_ortho_props;
function init_ortho_props(camobj) {
    var render = camobj.render;
    for (var i = 0; i < camobj.scenes_data.length; i++) {
        var main_cam = camobj.scenes_data[i].cameras[0];
        if (main_cam.type == exports.TYPE_ORTHO)    
            switch (render.move_style) {
            case exports.MS_TARGET_CONTROLS:
                var trans = m_tsr.get_trans_view(render.world_tsr);
                render.init_dist = m_vec3.dist(trans, render.pivot);
                render.init_top = main_cam.top;
                break;
            case exports.MS_HOVER_CONTROLS:
                var trans = m_tsr.get_trans_view(render.world_tsr);
                render.init_dist = m_vec3.dist(trans, render.hover_pivot);
                render.init_top = main_cam.top;
                break;
            }
    }
}

/**
 * Create and initialize generic camera object.
 */
function init_camera(type) {
    var cam = {
        type : type,

        name : "",

        size_mult : 1,

        width  : 0,
        height : 0,

        framebuffer : null,
        framebuffer_prev : null,
        color_attachment : null,
        depth_attachment : null,

        // frustum stuff
        aspect : 0,
        fov    : 0,
        near   : 0,
        far    : 0,
        left   : 0,
        right  : 0,
        top    : 0,
        bottom : 0,

        hmd_fov : m_vec4.create(),

        // some uniforms
        world_tsr             : new Float32Array(9),
        view_matrix           : new Float32Array(16),
        view_refl_matrix      : new Float32Array(16),
        proj_matrix           : new Float32Array(16),
        view_proj_matrix      : new Float32Array(16),
        view_proj_inv_matrix  : new Float32Array(16),
        prev_view_proj_matrix : new Float32Array(16),
        sky_vp_inv_matrix     : new Float32Array(16),

        view_tsr                        : m_tsr.create_ext(),
        view_tsr_inv                    : m_tsr.create_ext(),
        real_view_tsr                   : m_tsr.create_ext(), // for reflections
        real_view_tsr_inv               : m_tsr.create_ext(),
        shadow_cast_billboard_view_tsr  : m_tsr.create_ext(),

        // dof stuff
        dof_distance : 0,
        dof_front_start : 0,
        dof_front_end : 0,
        dof_rear_start : 0,
        dof_rear_end : 0,
        dof_power : 0,
        dof_bokeh_intensity : 0,
        dof_object : null,
        dof_bokeh_ : false,
        dof_foreground_blur : false,
        dof_on : false,
        lod_eye: new Float32Array(3),

        frustum_planes : create_frustum_planes(),
        stereo_conv_dist : 0,
        stereo_eye_dist : 0,

        reflection_plane : null,

        // shadow cascades stuff
        csm_centers: null,
        csm_radii: null,
        csm_center_dists: new Float32Array(4),
        pcf_blur_radii: new Float32Array(4)
    };

    // some default values
    cam.hmd_fov[0] = cam.hmd_fov[2] = 45;
    cam.hmd_fov[1] = cam.hmd_fov[3] = 55;
    return cam;
}

exports.clone_camera = clone_camera;
function clone_camera(cam, reset_attachments) {

    var cam_new = init_camera(cam.type);

    cam_new.name = cam.name;

    cam_new.size_mult = cam.size_mult;

    cam_new.width  = cam.width;
    cam_new.height = cam.height;

    if (!reset_attachments) {
        cam_new.framebuffer = cam.framebuffer;
        cam_new.framebuffer_prev = cam.framebuffer_prev;
        cam_new.color_attachment = cam.color_attachment;
        cam_new.depth_attachment = cam.depth_attachment;
    }

    // frustum stuff
    cam_new.aspect = cam.aspect;
    cam_new.fov    = cam.fov;
    cam_new.near   = cam.near;
    cam_new.far    = cam.far;
    cam_new.left   = cam.left;
    cam_new.right  = cam.right;
    cam_new.top    = cam.top;
    cam_new.bottom = cam.bottom;

    m_vec4.copy(cam.hmd_fov, cam_new.hmd_fov);

    // some uniforms
    m_tsr.copy(cam.world_tsr, cam_new.world_tsr);

    m_mat4.copy(cam.view_matrix, cam_new.view_matrix);
    m_mat4.copy(cam.proj_matrix, cam_new.proj_matrix);
    m_mat4.copy(cam.view_proj_matrix, cam_new.view_proj_matrix);
    m_mat4.copy(cam.view_proj_inv_matrix, cam_new.view_proj_inv_matrix);
    m_mat4.copy(cam.prev_view_proj_matrix, cam_new.prev_view_proj_matrix);
    m_mat4.copy(cam.sky_vp_inv_matrix, cam_new.sky_vp_inv_matrix);

    m_tsr.copy(cam.view_tsr, cam_new.view_tsr);
    m_tsr.copy(cam.view_tsr_inv, cam_new.view_tsr_inv);
    m_tsr.copy(cam.real_view_tsr, cam_new.real_view_tsr);
    m_tsr.copy(cam.real_view_tsr_inv, cam_new.real_view_tsr_inv);
    m_tsr.copy(cam.shadow_cast_billboard_view_tsr, cam_new.shadow_cast_billboard_view_tsr);

    // dof stuff
    cam_new.dof_distance = cam.dof_distance;
    cam_new.dof_front_start = cam.dof_front_start;
    cam_new.dof_front_end = cam.dof_front_end;
    cam_new.dof_rear_start = cam.dof_rear_start;
    cam_new.dof_rear_end = cam.dof_rear_end;
    cam_new.dof_power = cam.dof_power;
    cam_new.dof_bokeh_intensity = cam.dof_bokeh_intensity;
    cam_new.dof_object = cam.dof_object;
    cam_new.dof_bokeh_ = cam.dof_bokeh_;
    cam_new.dof_foreground_blur = cam.dof_foreground_blur;
    cam_new.dof_on = cam.dof_on;
    m_vec3.copy(cam.lod_eye, cam_new.lod_eye);

    copy_frustum_planes(cam.frustum_planes, cam_new.frustum_planes);
    cam_new.stereo_conv_dist = cam.stereo_conv_dist;
    cam_new.stereo_eye_dist = cam.stereo_eye_dist;

    if (cam.reflection_plane)
        cam_new.reflection_plane = m_vec4.clone(cam.reflection_plane);

    // shadow cascades stuff
    clone_camera_csm(cam, cam_new);
    m_vec4.copy(cam.csm_center_dists, cam_new.csm_center_dists);
    m_vec4.copy(cam.pcf_blur_radii, cam_new.pcf_blur_radii);

    return cam_new;
}


exports.create_frustum_planes = create_frustum_planes;
function create_frustum_planes() {
    var frustum_planes = {
        left:   new Float32Array([0, 0, 0, 0]),
        right:  new Float32Array([0, 0, 0, 0]),
        top:    new Float32Array([0, 0, 0, 0]),
        bottom: new Float32Array([0, 0, 0, 0]),
        near:   new Float32Array([0, 0, 0, 0]),
        far:    new Float32Array([0, 0, 0, 0])
    };
    return frustum_planes;
}

function copy_frustum_planes(planes, planes_new) {
    m_vec4.copy(planes.left, planes_new.left);
    m_vec4.copy(planes.right, planes_new.right);
    m_vec4.copy(planes.top, planes_new.top);
    m_vec4.copy(planes.bottom, planes_new.bottom);
    m_vec4.copy(planes.near, planes_new.near);
    m_vec4.copy(planes.far, planes_new.far);
    return planes_new;
}

exports.move_style_bpy_to_b4w = move_style_bpy_to_b4w
function move_style_bpy_to_b4w(bpy_move_style) {
    switch (bpy_move_style) {
    case "STATIC":
        return exports.MS_STATIC;
        break;
    case "TARGET":
        return exports.MS_TARGET_CONTROLS;
        break;
    case "EYE":
        return exports.MS_EYE_CONTROLS;
        break;
    case "HOVER":
        return exports.MS_HOVER_CONTROLS;
        break;
    default:
        m_util.panic("Unknown move style");
    }
}

exports.create_camera = create_camera;
function create_camera(type) {

    var cam = init_camera(type);

    if (type == exports.TYPE_NONE)
        return cam;

    switch (type) {
    case exports.TYPE_PERSP:
        set_frustum(cam, DEF_PERSP_FOV,
                DEF_PERSP_NEAR, DEF_PERSP_FAR);
        break;
    case exports.TYPE_ORTHO:
        set_frustum(cam, DEF_ORTHO_SCALE,
                DEF_PERSP_NEAR, DEF_PERSP_FAR);
        break;

    case exports.TYPE_PERSP_ASPECT:
        break;
    case exports.TYPE_ORTHO_ASPECT:
        break;
    case exports.TYPE_ORTHO_ASYMMETRIC:
        break;
    case exports.TYPE_STEREO_LEFT:
    case exports.TYPE_STEREO_RIGHT:
    case exports.TYPE_HMD_LEFT:
    case exports.TYPE_HMD_RIGHT:
        m_util.panic("Stereo camera may only be created from perspective one");
        break;
    default:
        m_util.panic("Unknown camera type");
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
        m_util.panic("Wrong attachment type: " + type);
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
        m_util.panic("Wrong attachment type: " + type);
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
        m_util.panic("Wrong attachment type: " + type);
        break;
    }
}


/**
 * Prepare camera for 3D stereo rendering
 * Only standard perspective camera can be made stereo
 * @param type Stereo camera type (TYPE_STEREO_LEFT, TYPE_STEREO_RIGHT, TYPE_HMD_LEFT, TYPE_HMD_RIGHT)
 */
exports.make_stereo = function(cam, type) {

    if (!(cam.type == exports.TYPE_PERSP &&
            (type == exports.TYPE_STEREO_LEFT ||
            type == exports.TYPE_STEREO_RIGHT ||
            type == exports.TYPE_HMD_LEFT ||
            type == exports.TYPE_HMD_RIGHT)))
        m_util.panic("make_stereo(): wrong camera type");

    cam.type = type;

    set_stereo_params(cam, STEREO_CONV_DIST, STEREO_EYE_DIST);
}

exports.set_stereo_params = set_stereo_params;
/**
 * Set params for camera used in 3D stereo rendering.
 */
function set_stereo_params(cam, conv_dist, eye_dist) {

    if (!(cam.type == exports.TYPE_STEREO_LEFT ||
                cam.type == exports.TYPE_STEREO_RIGHT ||
                cam.type == exports.TYPE_HMD_LEFT ||
                cam.type == exports.TYPE_HMD_RIGHT))
        m_util.panic("set_stereo_params(): wrong camera type");

    if (cam.type == exports.TYPE_STEREO_LEFT ||
            cam.type == exports.TYPE_STEREO_RIGHT)
        cam.stereo_conv_dist = conv_dist;

    cam.stereo_eye_dist = eye_dist;

    set_projection(cam, cam.aspect);

    // update camera shadows
    if (m_scenes.check_active()) {
        var active_scene = m_scenes.get_active();
        var sh_params = active_scene._render.shadow_params;

        if (sh_params) {
            var cam_scene_data = m_obj_util.get_scene_data(m_scenes.get_camera(active_scene),
                        active_scene);
            var upd_cameras = cam_scene_data.cameras;
            for (var i = 0; i < upd_cameras.length; i++)
                update_camera_shadows(upd_cameras[i], sh_params);
        }
    }
}



exports.get_camera_angles = get_camera_angles;
function get_camera_angles(cam, dest) {
    var quat = m_tsr.get_quat_view(cam.render.world_tsr);
    return get_camera_angles_from_quat(quat, dest);
}

/**
 * Camera-specific spherical coordinates from a quaternion
 * uses _vec3_tmp, _vec3_tmp2, _vec3_tmp3
 */
exports.get_camera_angles_from_quat = get_camera_angles_from_quat;
function get_camera_angles_from_quat(quat, dest) {
    var z_world_cam = m_util.quat_to_dir(quat, m_util.AXIS_Z, _vec3_tmp);
    var my_world_cam = m_util.quat_to_dir(quat, m_util.AXIS_MY, _vec3_tmp2);

    // base angles
    var base_theta = -Math.asin(z_world_cam[2] / m_vec3.length(z_world_cam));
    if (Math.abs(base_theta) > Math.PI / 4)
        var phi_dir = m_vec3.scale(my_world_cam, -m_util.sign(base_theta), _vec3_tmp3);
    else
        var phi_dir = m_vec3.scale(z_world_cam, -m_util.sign(my_world_cam[2]), _vec3_tmp3);
    var base_phi = Math.atan(Math.abs(phi_dir[0] / phi_dir[1]));

    // resulted theta
    var theta = base_theta;
    if (my_world_cam[2] > 0)
        theta = m_util.sign(theta) * Math.PI - theta;

    // resulted phi
    var phi = base_phi;
    if (phi_dir[1] > 0)
        phi = Math.PI - phi;
    if (phi_dir[0] < 0)
        phi = 2 * Math.PI - phi;

    dest[0] = phi;
    dest[1] = theta;

    return dest;
}

exports.get_camera_angles_char = function(cam, dest) {
    get_camera_angles(cam, dest);

    // phi
    dest[0] = m_util.angle_wrap_0_2pi(dest[0] + Math.PI);
    // theta
    dest[1] *= -1;

    return dest;
}

exports.set_frustum = set_frustum;
/**
 * Set frustum for symmetric camera with float or fixed aspect ratio
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
        cam.fov = v_fov_or_top;
        cam.aspect = h_fov_or_right / v_fov_or_top;
        break;
    case exports.TYPE_ORTHO_ASPECT:
        cam.top = v_fov_or_top;
        cam.aspect = h_fov_or_right / v_fov_or_top;
        break;
    case exports.TYPE_HMD_LEFT:
    case exports.TYPE_HMD_RIGHT:
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
function get_move_style(camobj) {
    return camobj.render.move_style;
}

exports.set_view = set_view;
/**
 * uses _vec3_tmp, _quat4_tmp, _mat4_tmp
 */
function set_view(cam, camobj) {
    // ignore scale for view_matrix
    var trans = m_tsr.get_trans(camobj.render.world_tsr, _vec3_tmp);
    var quat = m_tsr.get_quat(camobj.render.world_tsr, _quat4_tmp);
    var wm = m_mat4.fromRotationTranslation(quat, trans, _mat4_tmp);

    m_mat4.invert(wm, cam.view_matrix);

    var x = cam.view_matrix[12];
    var y = cam.view_matrix[13];
    var z = cam.view_matrix[14];

    if (m_scenes.check_active()) {
        var active_scene = m_scenes.get_active();
        var subs_stereo = m_scenes.get_subs(active_scene, m_subs.STEREO);
    }

    if (cam.type == exports.TYPE_STEREO_LEFT ||
            subs_stereo && subs_stereo.enable_hmd_stereo &&
            cam.type == exports.TYPE_HMD_LEFT)
        cam.view_matrix[12] += cam.stereo_eye_dist/2;
    else if (cam.type == exports.TYPE_STEREO_RIGHT ||
            subs_stereo && subs_stereo.enable_hmd_stereo &&
            cam.type == exports.TYPE_HMD_RIGHT)
        cam.view_matrix[12] -= cam.stereo_eye_dist/2;

    if (cam.reflection_plane) {
        // store original view tsr before reflecting the view matrix
        m_tsr.from_mat4(cam.view_matrix, cam.real_view_tsr);
        m_tsr.invert(cam.real_view_tsr, cam.real_view_tsr_inv);
        update_view_refl_matrix(cam);
        reflect_view_matrix(cam);
        reflect_proj_matrix(cam);
    }

    // update view tsr and view zup tsr
    m_tsr.from_mat4(cam.view_matrix, cam.view_tsr);
    m_tsr.invert(cam.view_tsr, cam.view_tsr_inv);

    // update view projection matrix and inversed view projection matrix
    calc_view_proj_inverse(cam);
    calc_sky_vp_inverse(cam);

    m_tsr.copy(camobj.render.world_tsr, cam.world_tsr);
}

/**
 * Update view_refl_matrix during reflection pass
 */
function update_view_refl_matrix(cam) {
    var Nx = cam.reflection_plane[0];
    var Ny = cam.reflection_plane[1];
    var Nz = cam.reflection_plane[2];
    var D  = cam.reflection_plane[3];

    var refl_mat = cam.view_refl_matrix;

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
}

/**
* Reflect view matrix during reflection pass
 */
function reflect_view_matrix(cam) {
    m_mat4.multiply(cam.view_matrix, cam.view_refl_matrix, cam.view_matrix);
}

/**
 * Change projection matrix for reflected camera during reflection pass
 * uses _vec4_tmp, _vec4_tmp2, _mat4_tmp
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
 */
function set_view_eye_target_up(cam, eye, target, up) {

    m_mat4.lookAt(eye, target, up, cam.view_matrix);

    var active_scene = m_scenes.get_active();
    var subs_stereo = m_scenes.get_subs(active_scene, m_subs.STEREO);

    if (m_scenes.check_active()) {
        var active_scene = m_scenes.get_active();
        var subs_stereo = m_scenes.get_subs(active_scene, m_subs.STEREO);
    }

    if (cam.type == exports.TYPE_STEREO_LEFT ||
            subs_stereo && subs_stereo.enable_hmd_stereo &&
            cam.type == exports.TYPE_HMD_LEFT)
        cam.view_matrix[12] += cam.stereo_eye_dist/2;
    else if (cam.type == exports.TYPE_STEREO_RIGHT ||
            subs_stereo && subs_stereo.enable_hmd_stereo &&
            cam.type == exports.TYPE_HMD_RIGHT)
        cam.view_matrix[12] -= cam.stereo_eye_dist/2;

    // update view tsr
    m_tsr.from_mat4(cam.view_matrix, cam.view_tsr);

    calc_view_proj_inverse(cam);
    calc_sky_vp_inverse(cam);


    m_tsr.set_trans(eye, cam.world_tsr);
}

/**
 * Simplified version to set non-camera object cams
 * uses _vec3_tmp, _vec3_tmp2
 * @param cam CAM object
 * @param {vec3} trans Translation
 * @param {vec4} quat Rotation quaternion
 */
exports.set_view_trans_quat = function(cam, trans, quat) {

    // eye relative target
    var target = _vec3_tmp;
    target[0] = 0;
    target[1] = 0;
    target[2] =-1;

    m_vec3.transformQuat(target, quat, target);

    // absolute target
    target[0] += trans[0];
    target[1] += trans[1];
    target[2] += trans[2];

    var up = _vec3_tmp2;
    up[0] = 0;
    up[1] = 1;
    up[2] = 0;
    m_vec3.transformQuat(up, quat, up);

    // NOTE: set view directly
    set_view_eye_target_up(cam, trans, target, up);
}

/**
 * uses _vec3_tmp, _quat4_tmp
 */
exports.set_look_at = set_look_at;
function set_look_at(camobj, trans, look_at) {
    var dest_vect = m_vec3.subtract(look_at, trans, _vec3_tmp);
    if (m_vec3.length(dest_vect)) {
        m_vec3.normalize(dest_vect, dest_vect);
        var quat = m_util.rotation_to_stable(m_util.AXIS_MZ, dest_vect, _quat4_tmp);

        m_trans.set_rotation(camobj, quat);
    }
    m_trans.set_translation(camobj, trans);
}

/**
 * uses _vec3_tmp
 * set_look_at which doesn't change previously corrected up vector
 */
exports.set_look_at_corrected = set_look_at_corrected;
function set_look_at_corrected(camobj, trans, look_at) {
    var render = camobj.render;

    var ups_down = is_upside_down(camobj);
    set_look_at(camobj, trans, look_at);

    if (ups_down) {
        var inv_axis = m_vec3.copy(render.vertical_axis, _vec3_tmp);
        m_vec3.negate(inv_axis, inv_axis);
        m_cons.correct_up(camobj, inv_axis, true);
    } else
        m_cons.correct_up(camobj, render.vertical_axis, true);
}

/**
 * uses _vec3_tmp
 */
exports.update_camera_transform = update_camera_transform;
function update_camera_transform(obj, cam_scene_data) {
    var render = obj.render;
    var cameras = cam_scene_data.cameras;

    if (!cameras)
        m_util.panic("Wrong object");

    var shadow_cameras = cam_scene_data.shadow_cameras;
    for (var i = 0; i < shadow_cameras.length; i++) {
        var cam = shadow_cameras[i];
        m_vec3.copy(m_tsr.get_trans_view(render.world_tsr), cam.lod_eye);
    }
    for (var i = 0; i < cameras.length; i++) {
        var cam = cameras[i];
        set_view(cam, obj);
        m_util.extract_frustum_planes(cam.view_proj_matrix, cam.frustum_planes);
        if (cam.dof_object) {
            if (cam.dof_on) {
                var cam_loc = m_tsr.get_trans_view(render.world_tsr);
                var obj_loc = m_trans.get_translation(cam.dof_object, _vec3_tmp);
                var dof_dist = m_vec3.dist(cam_loc, obj_loc);
                cam.dof_distance = dof_dist;
            }
        }
    }
}


exports.update_camera = function(obj) {
    var render = obj.render;

    clamp_limits(obj);
    update_ortho_scale(obj);

    switch (render.move_style) {

    case exports.MS_TARGET_CONTROLS:
        var trans = m_tsr.get_trans_view(render.world_tsr);
        var quat  = m_tsr.get_quat_view(render.world_tsr);
        m_cons.rotate_to(trans, quat, render.pivot);

        for (var j = 0; j < obj.scenes_data.length; j++) {
        // use pivot to set convergence plane for anaglyph stereo view
            var cams = obj.scenes_data[j].cameras;
            for (var i = 0; i < cams.length; i++) {
                var cam = cams[i];

                if (cam.type == exports.TYPE_STEREO_LEFT || 
                        cam.type == exports.TYPE_STEREO_RIGHT)
                    set_stereo_params(cam, m_vec3.dist(trans, render.pivot),
                            cam.stereo_eye_dist);
            }
        }

        m_cons.correct_up(obj, render.vertical_axis);
        break;

    case exports.MS_EYE_CONTROLS:
        // NOTE: correction was made previously in m_cons.update_constraint() 
        // for constrained cameras
        if (!obj.constraint)
            m_cons.correct_up(obj, render.vertical_axis);
        break;      
    }

    update_camera_upside_down(obj);
}

exports.update_camera_upside_down = update_camera_upside_down;
function update_camera_upside_down(camobj) {
    var render = camobj.render;
    if (render.move_style == exports.MS_TARGET_CONTROLS)
        render.target_cam_upside_down = is_upside_down(camobj);
}

/**
 * uses _vec3_tmp
 */ 
function is_upside_down(camobj) {
    var quat = m_tsr.get_quat_view(camobj.render.world_tsr);
    var y_world_cam = m_util.quat_to_dir(quat, m_util.AXIS_Y, _vec3_tmp);
    return y_world_cam[2] < 0;
}

exports.set_horizontal_rot_limits = set_horizontal_rot_limits;
function set_horizontal_rot_limits(camobj, limits) {
    var render = camobj.render;
    if (limits) {
        render.horizontal_limits = render.horizontal_limits || {};
        render.horizontal_limits.left = limits.left;
        render.horizontal_limits.right = limits.right;
        render.horizontal_limits.left_local = limits.left;
        render.horizontal_limits.right_local = limits.right;
        render.horizontal_limits.camera_space = Boolean(limits.camera_space);
        prepare_horizontal_limits(camobj);
    } else
        render.horizontal_limits = null;
}

/**
 * Prepare limits to respond to CCW style
 * uses _vec2_tmp
 */
function prepare_horizontal_limits(camobj) {
    var render = camobj.render;
    var limits = render.horizontal_limits;

    if (limits && (render.move_style == exports.MS_EYE_CONTROLS 
            || render.move_style == exports.MS_TARGET_CONTROLS)) {

        var angles = get_camera_angles(camobj, _vec2_tmp);
        if (limits.camera_space) {
            limits.left += angles[0];
            limits.right += angles[0];
        } else {
            limits.left_local -= angles[0];
            limits.right_local -= angles[0];
        }

        limits.left = m_util.angle_wrap_0_2pi(limits.left);
        limits.right = m_util.angle_wrap_0_2pi(limits.right);

        limits.left_local = m_util.angle_wrap_0_2pi(limits.left_local);
        limits.right_local = m_util.angle_wrap_0_2pi(limits.right_local);
    }
}

exports.set_vertical_rot_limits = set_vertical_rot_limits;
function set_vertical_rot_limits(camobj, limits) {
    var render = camobj.render;
    if (limits) {
        render.vertical_limits = render.vertical_limits || {};
        render.vertical_limits.down = limits.down;
        render.vertical_limits.up = limits.up;
        render.vertical_limits.down_local = limits.down;
        render.vertical_limits.up_local = limits.up;
        render.vertical_limits.camera_space = Boolean(limits.camera_space);
        prepare_vertical_limits(camobj);
    } else
        render.vertical_limits = null;
}

/**
 * uses _vec2_tmp
 */
exports.hover_set_vertical_limits = hover_set_vertical_limits;
function hover_set_vertical_limits(camobj, limits) {
    var render = camobj.render;

    if (!limits) {
        var angles = get_camera_angles(camobj, _vec2_tmp);
        limits = {
            down: angles[1],
            up: angles[1]
        }
    }

    render.vertical_limits = render.vertical_limits || {};
    render.vertical_limits.down = limits.down;
    render.vertical_limits.up = limits.up;
    prepare_vertical_limits(camobj);

    if (render.distance_limits && render.vertical_limits)
        hover_camera_update_distance(camobj);
}

/**
 * Prepare limits to respond to CCW style
 * uses _vec2_tmp
 */
function prepare_vertical_limits(camobj) {
    var render = camobj.render;
    var limits = render.vertical_limits;

    if (limits) {
        switch (render.move_style) {
        case exports.MS_EYE_CONTROLS:
        case exports.MS_TARGET_CONTROLS:
            var angles = get_camera_angles(camobj, _vec2_tmp);
            if (limits.camera_space) {
                limits.up += angles[1];
                limits.down += angles[1];
            } else {
                limits.up_local -= angles[1];
                limits.down_local -= angles[1];
            }

            limits.up = m_util.angle_wrap_periodic(limits.up, -Math.PI, Math.PI);
            limits.down = m_util.angle_wrap_periodic(limits.down, -Math.PI, Math.PI);

            limits.up_local = m_util.angle_wrap_periodic(limits.up_local, -Math.PI, Math.PI);
            limits.down_local = m_util.angle_wrap_periodic(limits.down_local, -Math.PI, Math.PI);
            break;
        case exports.MS_HOVER_CONTROLS:
            limits.up = m_util.angle_wrap_periodic(limits.up, -Math.PI, Math.PI);
            limits.down = m_util.angle_wrap_periodic(limits.down, -Math.PI, Math.PI);  
            limits.up = m_util.clamp(limits.up, -Math.PI / 2, 0);
            limits.down = m_util.clamp(limits.down, -Math.PI / 2, 0);          
            break;
        }
    }
}

exports.hover_set_distance_limits = hover_set_distance_limits;
function hover_set_distance_limits(camobj, limits) {
    var render = camobj.render;

    if (!limits) {
        var dist = m_trans.obj_point_distance(camobj, render.hover_pivot);
        limits = {
            min: dist,
            max: dist
        }
    }

    render.distance_limits = render.distance_limits || {};
    render.distance_limits.min = limits.min;
    render.distance_limits.max = limits.max;

    if (render.distance_limits && render.vertical_limits)
        hover_camera_update_distance(camobj);
}

exports.set_distance_limits = set_distance_limits;
function set_distance_limits(camobj, limits) {
    var render = camobj.render;
    
    if (limits) {
        render.distance_limits = render.distance_limits || {};
        render.distance_limits.min = limits.min;
        render.distance_limits.max = limits.max;
    } else
        render.distance_limits = null;
}

exports.set_pivot_limits = set_pivot_limits;
function set_pivot_limits(camobj, limits) {
    var render = camobj.render;

    if (limits) {
        render.pivot_limits = render.pivot_limits || {};
        render.pivot_limits.min_z = limits.min_z;
        render.pivot_limits.max_z = limits.max_z;
    } else
        render.pivot_limits = null;
}

exports.set_hor_trans_limits = set_hor_trans_limits;
function set_hor_trans_limits(camobj, limits) {
    var render = camobj.render;

    if (limits) {
        render.hover_horiz_trans_limits = render.hover_horiz_trans_limits || {};
        render.hover_horiz_trans_limits.min = limits.min;
        render.hover_horiz_trans_limits.max = limits.max;
    } else
        render.hover_horiz_trans_limits = null;
}

exports.set_vert_trans_limits = set_vert_trans_limits;
function set_vert_trans_limits(camobj, limits) {
    var render = camobj.render;

    if (limits) {
        render.hover_vert_trans_limits = render.hover_vert_trans_limits || {};
        render.hover_vert_trans_limits.min = limits.min;
        render.hover_vert_trans_limits.max = limits.max;
    } else
        render.hover_vert_trans_limits = null;
}

exports.update_ortho_scale = update_ortho_scale;
function update_ortho_scale(obj) {
    var render = obj.render;

    if (!m_obj_util.is_camera(obj))
        return;

    var scenes_data = obj.scenes_data;
    for (var j = 0; j < scenes_data.length; j++) {
        var cams = scenes_data[j].cameras;
        if (cams[0].type === exports.TYPE_ORTHO) {
            switch (render.move_style) {
            case exports.MS_TARGET_CONTROLS:
                var trans = m_tsr.get_trans_view(render.world_tsr);
                var dir_dist = m_vec3.dist(trans, render.pivot);
                var new_scale = dir_dist / render.init_dist * render.init_top;
                break;
            case exports.MS_HOVER_CONTROLS:
                var trans = m_tsr.get_trans_view(render.world_tsr);
                var dir_dist = m_vec3.distance(trans, render.hover_pivot);
                var new_scale = dir_dist / render.init_dist * render.init_top;  
                break;
            default:
                var new_scale = cams[0].top;
                break;
            }
            
            for (var i = 0; i < cams.length; i++) {
                var cam = cams[i];
                cam.top = new_scale;
                set_projection(cam, cam.aspect);
            }

            update_camera_transform(obj, scenes_data[j]);
        }
    }
}

/**
 * uses _vec2_tmp
 */
function clamp_limits(obj) {

    var render = obj.render;
    var ms = render.move_style;

    if (ms === exports.MS_TARGET_CONTROLS || ms === exports.MS_EYE_CONTROLS) {

        // horizontal rotation clamping
        if (render.horizontal_limits) {
            var left = render.horizontal_limits.left;
            var right = render.horizontal_limits.right;
            var angles = get_camera_angles(obj, _vec2_tmp);

            // CCW: left->right for TARGET camera; right->left for EYE camera
            if (ms == exports.MS_TARGET_CONTROLS)
                var ret_angle = m_util.calc_returning_angle(angles[0], left, right);
            else
                var ret_angle = m_util.calc_returning_angle(angles[0], right, left);

            if (ret_angle) {
                
                if (ms == exports.MS_TARGET_CONTROLS)
                    rotate_target_camera(obj, ret_angle, 0);
                else
                    rotate_eye_camera(obj, ret_angle, 0);
            }
        }

        // vertical rotation clamping
        if (render.vertical_limits) {
            var down = render.vertical_limits.down;
            var up = render.vertical_limits.up;
            var angles = get_camera_angles(obj, _vec2_tmp);

            // CCW: up->down for TARGET camera; down->up for EYE camera
            if (ms == exports.MS_TARGET_CONTROLS)
                var ret_angle = m_util.calc_returning_angle(angles[1], up, down);
            else
                var ret_angle = m_util.calc_returning_angle(angles[1], down, up);

            if (ret_angle) {
                if (ms == exports.MS_TARGET_CONTROLS)
                    rotate_target_camera(obj, 0, ret_angle);
                else
                    rotate_eye_camera(obj, 0, ret_angle);
            }
        }

        // distance clamping
        if (ms === exports.MS_TARGET_CONTROLS && render.distance_limits)
            target_cam_clamp_distance(obj);
    }

    if (ms === exports.MS_TARGET_CONTROLS && render.pivot_limits)
        target_clamp_pivot_limits(obj);
    
    if (ms === exports.MS_HOVER_CONTROLS) { 
        // horizontal, vertical translation clamping
        hover_cam_clamp_axis_limits(obj); 
        hover_cam_clamp_rotation(obj)
    }
}

/**
 * uses _vec2_tmp2 _vec3_tmp, _quat4_tmp, _quat4_tmp2
 */ 
exports.rotate_eye_camera = rotate_eye_camera;
function rotate_eye_camera(obj, phi, theta, phi_is_abs, theta_is_abs) {
    var render = obj.render;

    // prepare delta angles
    var d_phi = phi;
    var d_theta = theta;
    if (phi_is_abs || theta_is_abs) {
        var curr_angles = get_camera_angles(obj, _vec2_tmp2);
        if (phi_is_abs)
            d_phi = phi - curr_angles[0];
        if (theta_is_abs)
            d_theta = theta - curr_angles[1];
    }

    if (d_phi || d_theta) {
        var rot_quat = m_quat.identity(_quat4_tmp);

        if (d_phi) {
            var quat_phi = m_quat.setAxisAngle(render.vertical_axis, d_phi, _quat4_tmp2);
            m_quat.multiply(rot_quat, quat_phi, rot_quat);
        }

        var cam_quat = m_tsr.get_quat_view(render.world_tsr);
        if (d_theta) {
            var x_world_cam = m_util.quat_to_dir(cam_quat, m_util.AXIS_X, _vec3_tmp);
            var quat_theta = m_quat.setAxisAngle(x_world_cam, d_theta, _quat4_tmp2);
            // NOTE: cam_quat->x_world_cam->quat_theta->cam_quat leads to
            // error accumulation if quat_theta is not normalized
            m_quat.normalize(quat_theta, quat_theta);
            m_quat.multiply(rot_quat, quat_theta, rot_quat);
        }

        m_quat.multiply(rot_quat, cam_quat, cam_quat);
    }
}

/**
 * uses _vec2_tmp2
 */
exports.rotate_target_camera = rotate_target_camera;
function rotate_target_camera(obj, phi, theta, phi_is_abs, theta_is_abs) {
    var render = obj.render;

    // prepare delta angles
    var d_phi = phi;
    var d_theta = theta;
    if (phi_is_abs || theta_is_abs) {
        var curr_angles = get_camera_angles(obj, _vec2_tmp2);
        if (phi_is_abs)
            d_phi = phi - curr_angles[0];
        if (theta_is_abs)
            d_theta = theta - curr_angles[1];
    }

    camera_rotate_point_pivot(obj, obj.render.pivot, d_phi, d_theta);        

    // NOTE: need angles after(!) rotation
    var angles = get_camera_angles(obj, _vec2_tmp2);
    var dest_theta = m_util.angle_wrap_periodic(angles[1], -Math.PI, Math.PI);
    render.target_cam_upside_down = Math.abs(dest_theta) > Math.PI / 2;
}

/**
 * uses _vec2_tmp2
 */
exports.rotate_hover_camera = rotate_hover_camera;
function rotate_hover_camera(obj, phi, theta, phi_is_abs, theta_is_abs) {
    var render = obj.render;

    // prepare delta angles
    var d_phi = phi;
    var d_theta = theta;
    if (phi_is_abs || theta_is_abs) {
        var curr_angles = get_camera_angles(obj, _vec2_tmp2);
        if (phi_is_abs)
            d_phi = phi - curr_angles[0];
        if (theta_is_abs)
            d_theta = theta - curr_angles[1];
    }

    if (!render.enable_hover_hor_rotation)
        d_phi = 0;

    camera_rotate_point_pivot(obj, render.hover_pivot, d_phi, d_theta);

    if (d_theta)
        hover_camera_update_distance(obj);
}

/**
 * uses _vec3_tmp, _quat4_tmp, _quat4_tmp2
 */
function camera_rotate_point_pivot(obj, pivot, d_phi, d_theta) {
    var render = obj.render;

    if (d_phi || d_theta) {
        var rot_quat = m_quat.identity(_quat4_tmp);

        if (d_phi) {
            var quat_phi = m_quat.setAxisAngle(m_util.AXIS_Z, d_phi, _quat4_tmp2);
            m_quat.multiply(rot_quat, quat_phi, rot_quat);
        }

        var is_hover = is_hover_camera(obj);
        var cam_quat = m_tsr.get_quat_view(render.world_tsr);
        if (d_theta) {
            var x_world_cam = m_util.quat_to_dir(cam_quat, m_util.AXIS_X, _vec3_tmp);
            var quat_theta = m_quat.setAxisAngle(x_world_cam, d_theta, _quat4_tmp2);
            // NOTE: cam_quat->x_world_cam->quat_theta->cam_quat leads to
            // error accumulation if quat_theta is not normalized
            m_quat.normalize(quat_theta, quat_theta);
            m_quat.multiply(rot_quat, quat_theta, rot_quat);
        }
        var trans = m_tsr.get_trans_view(render.world_tsr);
        m_util.rotate_point_pivot(trans, pivot, rot_quat, trans);

        // direct camera to pivot
        m_quat.multiply(rot_quat, cam_quat, cam_quat);
    }
}

/**
 * Change distance to pivot according to current elevation angle
 * uses _vec2_tmp, _vec3_tmp
 */
function hover_camera_update_distance(obj) {
    var render = obj.render;

    var elevation_angle = get_camera_angles(obj, _vec2_tmp)[1];
    var dist = hover_cam_calc_distance_for_angle(obj, elevation_angle);

    // NOTE: don't use trans->pivot vector, because of errors near pivot (distance ~ 0)
    var trans = m_tsr.get_trans_view(render.world_tsr);
    var quat  = m_tsr.get_quat_view(render.world_tsr);
    var view_vector = m_util.quat_to_dir(quat, m_util.AXIS_MZ, _vec3_tmp);
    m_vec3.normalize(view_vector, view_vector);
    m_vec3.scale(view_vector, dist, view_vector);
    m_vec3.subtract(render.hover_pivot, view_vector, trans);
}

function hover_cam_calc_distance_for_angle(obj, elevation_angle) {
    var render = obj.render;

    var v_lims = render.vertical_limits;
    var d_lims = render.distance_limits;

    if (v_lims.down - v_lims.up) {
        var rot_factor = (v_lims.down - elevation_angle) / (v_lims.down - v_lims.up);
        rot_factor = Math.max(rot_factor, 0);
    } else
        // set minimum distance for equal up and down angles
        var rot_factor = 0

    return rot_factor * (d_lims.max - d_lims.min) + d_lims.min;
}

/**
 * uses _vec3_tmp, _vec3_tmp2
 */
function target_cam_clamp_distance(obj) {
    var render = obj.render;
    var trans = m_tsr.get_trans_view(render.world_tsr);
    var dist_vector = m_vec3.subtract(trans, render.pivot, _vec3_tmp);
    var len = m_vec3.length(dist_vector);

    if (len > render.distance_limits.max) {
        var scale = render.distance_limits.max / len;
        m_vec3.scale(dist_vector, scale, dist_vector);
        m_vec3.add(render.pivot, dist_vector, trans);
    } else if (len < render.distance_limits.min) {
        // add scaled camera view vector (the more the better) to stabilize
        // minimum distance clamping
        var quat = m_tsr.get_quat_view(render.world_tsr);
        var cam_view = m_util.quat_to_dir(quat, m_util.AXIS_MZ, _vec3_tmp2);
        m_vec3.scale(cam_view, 100 * render.distance_limits.min, cam_view);
        m_vec3.add(dist_vector, cam_view, dist_vector);

        // calculate clamped position on the arc of the minimum circle
        m_vec3.scale(dist_vector,
                -render.distance_limits.min / m_vec3.length(dist_vector), dist_vector);
        m_vec3.add(render.pivot, dist_vector, trans);
    }
}

function target_clamp_pivot_limits(obj) {
    var render = obj.render;

    var z_old = render.pivot[2];
    var z_new = m_util.clamp(render.pivot[2], render.pivot_limits.min_z,
            render.pivot_limits.max_z);

    if (z_new != z_old) {
        var correction_vec = m_vec3.set(0, 0, z_new - z_old, _vec3_tmp);
        m_vec3.add(render.pivot, correction_vec, render.pivot);

        var trans = m_tsr.get_trans_view(render.world_tsr);
        m_vec3.add(trans, correction_vec, trans);        
    }
}

function hover_cam_clamp_axis_limits(obj) {
    var render = obj.render;

    if (render.hover_horiz_trans_limits) {
        var horiz_delta = m_util.clamp(render.hover_pivot[0], 
                render.hover_horiz_trans_limits.min, render.hover_horiz_trans_limits.max)
                - render.hover_pivot[0];
        render.hover_pivot[0] += horiz_delta;
        var trans = m_tsr.get_trans_view(render.world_tsr);
        trans[0] += horiz_delta;
    }

    if (render.hover_vert_trans_limits) {
        var vert_delta = m_util.clamp(render.hover_pivot[1], 
                render.hover_vert_trans_limits.min, 
                render.hover_vert_trans_limits.max) 
                - render.hover_pivot[1];
        render.hover_pivot[1] += vert_delta;
        var trans = m_tsr.get_trans_view(render.world_tsr);
        trans[1] += vert_delta;
    }
}

/**
 * uses _vec2_tmp
 */
function hover_cam_clamp_rotation(obj) {
    var render = obj.render;

    var curr_angle = get_camera_angles(obj, _vec2_tmp)[1];
    var ret_angle = m_util.calc_returning_angle(curr_angle, 
            render.vertical_limits.up, render.vertical_limits.down);

    if (ret_angle)
        rotate_hover_camera(obj, 0, ret_angle);
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
exports.get_angular_diameter  = function(cam) {

    switch (cam.type) {
    case exports.TYPE_PERSP:
    case exports.TYPE_PERSP_ASPECT:
    case exports.TYPE_STEREO_LEFT:
    case exports.TYPE_STEREO_RIGHT:
        return m_util.deg_to_rad(cam.fov);
    default:
        m_print.error("get_angular_diameter(): Unsupported camera type: " + cam.type);
        return 0;
    }
}

exports.set_projection = set_projection;
/**
 * @param cam Camera ID
 * @param [aspect] Aspect ratio for camera with float aspect
 * @param [Boolean] keep_proj_view Don't update view projection matrix
 */
function set_projection(cam, aspect, keep_proj_view) {

    switch (cam.type) {
    case exports.TYPE_PERSP:
        if (!aspect)
            m_util.panic("No aspect ratio");
        cam.aspect = aspect;
        // continue
    case exports.TYPE_PERSP_ASPECT:
        m_mat4.perspective(m_util.deg_to_rad(cam.fov), cam.aspect, cam.near, cam.far,
                cam.proj_matrix);
        break;

    case exports.TYPE_ORTHO:
        if (!aspect)
            m_util.panic("No aspect ratio");
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
            m_util.panic("No aspect ratio");
        cam.aspect = aspect;
        set_projection_stereo(cam);
        break;
    case exports.TYPE_HMD_LEFT:
    case exports.TYPE_HMD_RIGHT:
        set_projection_hmd(cam, aspect);
        break;

    case exports.TYPE_NONE:
        return;
    default:
        m_util.panic("Wrong camera type: " + cam.type);
    }

    // update view projection matrix
    if (!keep_proj_view) {
        calc_view_proj_inverse(cam);
        calc_sky_vp_inverse(cam);
    }
}

function set_projection_stereo(cam) {
    // anaglyph
    var fov_tan = Math.tan(cam.fov * Math.PI / 360.0);

    var top = cam.near * fov_tan;
    var bottom = -top;

    // half of convergence plane in horizontal rotation direction
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

function set_projection_hmd(cam, aspect) {
    if (!m_scenes.check_active()) {
        return;
    }

    var active_scene = m_scenes.get_active();
    var subs_stereo = m_scenes.get_subs(active_scene, m_subs.STEREO);
    if (subs_stereo && subs_stereo.enable_hmd_stereo) {
        // VR mode
        var up_fov_tan    = Math.tan(m_util.deg_to_rad(cam.hmd_fov[0]));
        var right_fov_tan = Math.tan(m_util.deg_to_rad(cam.hmd_fov[1]));
        var down_fov_tan  = Math.tan(m_util.deg_to_rad(cam.hmd_fov[2]));
        var left_fov_tan  = Math.tan(m_util.deg_to_rad(cam.hmd_fov[3]));

        // NOTE: save for extraction
        cam.top    = cam.near * up_fov_tan;
        cam.right  = cam.near * right_fov_tan;
        cam.bottom = - cam.near * down_fov_tan;
        cam.left   = - cam.near * left_fov_tan;

        m_mat4.frustum(cam.left, cam.right, cam.bottom, cam.top, cam.near, cam.far,
                cam.proj_matrix);
    } else {
        // non-VR mode
        if (!aspect)
            aspect = cam.aspect;

        m_mat4.perspective(m_util.deg_to_rad(cam.fov), aspect, cam.near, cam.far,
                cam.proj_matrix);
    }
}

exports.set_color_pick_proj = function(camera, x, y, w, h) {
    // less is better
    var sq = 1 / Math.max(h, w);

    switch (camera.type) {
    case exports.TYPE_PERSP:
    case exports.TYPE_PERSP_ASPECT:
        var h2 = h / 2;
        var w2 = w / 2;
        var y = - (y - h2) / h2 * Math.tan(m_util.deg_to_rad(camera.fov) / 2.0);
        var x = (x - w2) / w2 * Math.tan(m_util.deg_to_rad(camera.fov) / 2.0) * camera.aspect;
        var top    = camera.near * (y + sq);
        var right  = camera.near * (x + sq);
        var bottom = camera.near * (y - sq);
        var left   = camera.near * (x - sq);
        m_mat4.frustum(left, right, bottom, top, camera.near, camera.far,
                camera.proj_matrix);
        break;
    case exports.TYPE_ORTHO:
    case exports.TYPE_ORTHO_ASPECT:
        camera.right = camera.top * camera.aspect;
        var y = - y / h;
        var x = x / w;
        var top    = camera.top + (y + sq) * (camera.top + camera.top);
        var right  = - camera.right + (x + sq) * (camera.right + camera.right);
        var bottom = camera.top + (y - sq) * (camera.top + camera.top);
        var left   = - camera.right + (x - sq) * (camera.right + camera.right);
        m_mat4.ortho(left, right, bottom, top, camera.near, camera.far,
                camera.proj_matrix);
        break;
    case exports.TYPE_ORTHO_ASYMMETRIC:
        var y = - y / h;
        var x = x / w;
        var top    = camera.top + (y + sq) * (camera.top - camera.bottom);
        var right  = camera.left + (x + sq) * (camera.right - camera.left);
        var bottom = camera.top + (y - sq) * (camera.top - camera.bottom);
        var left   = camera.left + (x - sq) * (camera.right - camera.left);
        m_mat4.ortho(left, right, bottom, top, camera.near, camera.far,
                camera.proj_matrix);
        break;
    }
    m_mat4.copy(camera.view_matrix, camera.view_proj_matrix);
    m_mat4.multiply(camera.proj_matrix, camera.view_proj_matrix,
            camera.view_proj_matrix);
    m_util.extract_frustum_planes(camera.view_proj_matrix,
            camera.frustum_planes);
}

exports.calc_sky_vp_inverse = calc_sky_vp_inverse;
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
function calc_view_proj_inverse(cam) {
    m_mat4.copy(cam.view_matrix, cam.view_proj_matrix);
    m_mat4.multiply(cam.proj_matrix, cam.view_proj_matrix,
            cam.view_proj_matrix);
    m_mat4.invert(cam.view_proj_matrix, cam.view_proj_inv_matrix);
}

/**
 * Extract frustum corner coords
 * uses _mat4_tmp
 */
exports.extract_frustum_corners = extract_frustum_corners;
function extract_frustum_corners(cam, near, far, corners, is_world_space) {
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
        m_util.panic("Extraction from NONE camera is not possible");
        break;

    case exports.TYPE_PERSP:
    case exports.TYPE_PERSP_ASPECT:
        top_near = near * Math.tan(cam.fov * Math.PI / 360.0);
        bottom_near = -top_near;
        right_near = top_near * cam.aspect;
        left_near = -right_near;

        var coeff = far / near;

        top_far = top_near * coeff;
        bottom_far = -top_far;
        right_far = top_far * cam.aspect;
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
        var coeff_near = near / cam.near;

        top_near = near * Math.tan(cam.fov * Math.PI / 360.0);
        bottom_near = -top_near;
        right_near = cam.right * coeff_near;
        left_near = cam.left * coeff_near;

        var coeff_far = far / near;

        top_far = top_near * coeff_far;
        bottom_far = -top_far;
        right_far = right_near * coeff_far;
        left_far = left_near * coeff_far;

        break;

    case exports.TYPE_HMD_LEFT:
    case exports.TYPE_HMD_RIGHT:
        var coeff_near = near / cam.near;

        top_near    = cam.top * coeff_near;
        bottom_near = cam.bottom * coeff_near;
        right_near  = cam.right * coeff_near;
        left_near   = cam.left * coeff_near;

        var coeff_far = far / near;

        top_far    = top_near * coeff_far;
        bottom_far = bottom_near * coeff_far;
        right_far  = right_near * coeff_far;
        left_far   = left_near * coeff_far;

        break;

    default:
        m_util.panic("Wrong camera type: " + cam.type);
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

    // to world space
    if (is_world_space) {
        var view_inv = _mat4_tmp;
        m_mat4.invert(cam.view_matrix, view_inv);
        m_util.positions_multiply_matrix(corners, view_inv, corners, 0);
    }

    return corners;
}

/**
 * Assign boundings for camera
 */
exports.assign_boundings = function(camobj) {

    var render = camobj.render;

    var bb = m_bounds.create_bb();

    bb.min_x =-1;
    bb.max_x = 1;
    bb.min_y =-1;
    bb.max_y = 1;
    bb.min_z =-1;
    bb.max_z = 1;

    render.bb_local = bb;

    var bs = m_bounds.bs_from_values(1, m_util.f32([0,0,0]));
    render.bs_local = bs;

    render.bcap_local = m_bounds.bcap_from_values(1, bb);
    render.bcyl_local = m_bounds.bcyl_from_values(1, bb);
    render.bcon_local = m_bounds.bcon_from_values(1, bb);
}

exports.is_static_camera = is_static_camera;
function is_static_camera(obj) {
    return m_obj_util.is_camera(obj) && obj.render 
            && obj.render.move_style == exports.MS_STATIC;
}

exports.is_target_camera = is_target_camera;
function is_target_camera(obj) {
    return m_obj_util.is_camera(obj) && obj.render 
            && obj.render.move_style == exports.MS_TARGET_CONTROLS;
}

exports.is_eye_camera = function(obj) {
    return m_obj_util.is_camera(obj) && obj.render 
            && obj.render.move_style == exports.MS_EYE_CONTROLS;
}

exports.is_hover_camera = is_hover_camera;
function is_hover_camera(obj) {
    return m_obj_util.is_camera(obj) && obj.render 
            && obj.render.move_style == exports.MS_HOVER_CONTROLS;
}

exports.is_ortho_camera = function(obj) {
    return m_obj_util.is_camera(obj) && obj.render 
            && obj.scenes_data[0].cameras[0].type == exports.TYPE_ORTHO;
}

exports.update_camera_shadows = update_camera_shadows;
function update_camera_shadows(cam, shadow_params) {
    if (shadow_params.enable_csm)
        update_camera_csm(cam, shadow_params);
    else
        cam.pcf_blur_radii[0] = shadow_params.first_cascade_blur_radius;
}

function update_camera_csm(cam, shadow_params) {
    var N = shadow_params.csm_num;

    if (!cam.csm_centers)
        init_camera_csm(cam, shadow_params);

    for (var i = 0; i < N; i++) {
        var near = (i == 0) ? cam.near : csm_far_plane(shadow_params, cam,
                i - 1);
        var far = csm_far_plane(shadow_params, cam, i);

        var corners = extract_frustum_corners(cam, near, far,
                _frustum_corners_tmp);

        var mec = m_bounds.get_frustum_mec(corners);

        cam.csm_centers[i].set(mec.center);
        cam.csm_radii[i] = mec.radius;
        cam.csm_center_dists[i] = m_vec3.length(mec.center);

        // calculate PCF blur radius
        var blur_rad_first = shadow_params.first_cascade_blur_radius;
        var blur_rad_last = shadow_params.last_cascade_blur_radius;

        cam.pcf_blur_radii[i] = get_cascade_interpolation(blur_rad_first,
                blur_rad_last, N, i);
    }
}

function init_camera_csm(cam, shadow_params) {
    var csm_num = shadow_params.csm_num;
    cam.csm_centers = new Array(csm_num);
    for (var i = 0; i < csm_num; i++)
        cam.csm_centers[i] = new Float32Array(3);

    cam.csm_radii = new Float32Array(csm_num);
}

function clone_camera_csm(cam, cam_new) {
    if (!cam.csm_centers)
        return;

    var csm_num = cam.csm_centers.length;
    cam_new.csm_centers = new Array(csm_num);
    for (var i = 0; i < csm_num; i++)
        cam_new.csm_centers[i] = m_vec3.clone(cam.csm_centers[i]);

    cam_new.csm_radii = new Float32Array(cam.csm_radii);
}

exports.csm_far_plane = csm_far_plane;
function csm_far_plane(shadow_params, cam, csm_index) {
    var N = shadow_params.csm_num;

    var border_first = m_util.clamp(shadow_params.csm_first_cascade_border,
            cam.near, cam.far);
    var border_last  = m_util.clamp(shadow_params.csm_last_cascade_border,
            cam.near, cam.far);
    var far = get_cascade_interpolation(border_first, border_last, N, csm_index);

    // clamp to camera near/far plane
    return m_util.clamp(far, cam.near, cam.far);
}

/**
 * Get interpolated value for specific casade
 */
function get_cascade_interpolation(val_first, val_last, casc_count, casc_index) {
    switch (casc_index) {
    case 0:
        var val = val_first;
        break;
    case casc_count - 1:
        var val = val_last;
        break;
    default:
        var val = (val_first == 0) ? 0 : val_first
                * Math.pow(val_last / val_first, casc_index / (casc_count - 1));
        break;
    }

    return val;
}

/**
 * uses _vec4_tmp
 */
exports.project_point = function(camobj, point, dest) {
    var cam = camobj.scenes_data[0].cameras[0];

    switch (cam.type) {
    case exports.TYPE_PERSP:
    case exports.TYPE_PERSP_ASPECT:
    case exports.TYPE_ORTHO:
    case exports.TYPE_ORTHO_ASPECT:
    case exports.TYPE_STEREO_LEFT:
    case exports.TYPE_STEREO_RIGHT:
    case exports.TYPE_HMD_LEFT:
    case exports.TYPE_HMD_RIGHT:
        var dir = _vec4_tmp;
        dir.set(point);
        dir[3] = 1;

        var vp = cam.view_proj_matrix;
        m_vec4.transformMat4(dir, vp, dir);

        var x = dir[0] / dir[3];
        // NOTE: flip y coordinate to match space origin (top left corner)
        // view+proj transformation doesn't do it
        var y = -dir[1] / dir[3];

        // transform from [-1, 1] to [0, cam.width] or [0, cam.height] interval
        dest[0] = (x + 1) / 2 * cam.width;
        dest[1] = (y + 1) / 2 * cam.height;

        // convert to CSS canvas cordinates
        m_cont.viewport_to_canvas_coords(dest[0], dest[1], dest, cam);

        // NOTE: depth factor (0-1)
        if (dest.length > 2)
            dest[2] = (dir[2] / Math.abs(dir[3]) + 1) / 2;

        return dest;
    default:
        m_print.error("Non-compatible camera");
        return dest;
    }
}

exports.get_first_cam = function(camobj) {
    return camobj.scenes_data[0].cameras[0];
}


/**
 * Get camera frustum/box edge in view space
 */
exports.get_edge = function(cam, edge_type) {
    switch (cam.type) {
    case exports.TYPE_PERSP:
    case exports.TYPE_PERSP_ASPECT:
    case exports.TYPE_STEREO_LEFT:
    case exports.TYPE_STEREO_RIGHT:
        var top_1m = Math.tan(m_util.deg_to_rad(cam.fov) / 2);
        switch (edge_type) {
        case "LEFT":
            return -top_1m * cam.aspect;
        case "RIGHT":
            return top_1m * cam.aspect;
        case "TOP":
            return top_1m;
        case "BOTTOM":
            return -top_1m;
        }
        break;
    case exports.TYPE_ORTHO:
    case exports.TYPE_ORTHO_ASPECT:
        switch (edge_type) {
        case "LEFT":
            return -cam.top * cam.aspect;
        case "RIGHT":
            return cam.top * cam.aspect;
        case "TOP":
            return cam.top;
        case "BOTTOM":
            return -cam.top;
        }
        break;
    case exports.TYPE_ORTHO_ASYMMETRIC:
        switch (edge_type) {
        case "LEFT":
            return cam.left;
        case "RIGHT":
            return cam.right;
        case "TOP":
            return cam.top;
        case "BOTTOM":
            return cam.bottom;
        }
        break;
    case exports.TYPE_HMD_LEFT:
    case exports.TYPE_HMD_RIGHT:
        switch (edge_type) {
        case "LEFT":
            return Math.tan(m_util.deg_to_rad(cam.hmd_fov[3]));
        case "RIGHT":
            return Math.tan(m_util.deg_to_rad(cam.hmd_fov[1]));
        case "TOP":
            return Math.tan(m_util.deg_to_rad(cam.hmd_fov[0]));
        case "BOTTOM":
            return Math.tan(m_util.deg_to_rad(cam.hmd_fov[2]));
        }
        break;
    default:
        m_util.panic("Unknown camera type");
        break;
    }
} 

exports.is_ortho = function(cam) {
    switch (cam.type) {
    case exports.TYPE_ORTHO:
    case exports.TYPE_ORTHO_ASPECT:
    case exports.TYPE_ORTHO_ASYMMETRIC:
        return true;
    default:
        return false;
    }
}

exports.get_fov = function(cam, is_horizontal) {
    switch (cam.type) {
    case exports.TYPE_PERSP:
    case exports.TYPE_PERSP_ASPECT:
    case exports.TYPE_STEREO_LEFT:
    case exports.TYPE_STEREO_RIGHT:
        var vfov = m_util.deg_to_rad(cam.fov);
        if (is_horizontal)
            return vfov * cam.aspect;
        else
            return vfov;
    default:
        return 0;
    }
}

exports.set_trans_pivot = function(camobj, trans, pivot) {
    var render = camobj.render;

    m_tsr.set_trans(trans, render.world_tsr);
    m_vec3.copy(pivot, render.pivot);

    // TODO: update quaternion based on the UP vector
    // var quat = m_tsr.get_quat_view(render.world_tsr);
    // m_cons.rotate_to(trans, quat, pivot);
}

/**
 * uses _vec3_tmp
 */
exports.set_hover_pivot = function(camobj, coords) {
    var render = camobj.render;

    var pivot_delta = m_vec3.subtract(coords, render.hover_pivot, _vec3_tmp);
    var old_trans = m_tsr.get_trans_view(render.world_tsr);
    var trans = m_vec3.add(pivot_delta, old_trans, pivot_delta);
    m_trans.set_translation(camobj, trans);

    m_vec3.copy(coords, render.hover_pivot);
}

/**
 * uses _vec3_tmp
 */
exports.set_target_pivot = function(camobj, coords) {
    var render = camobj.render;

    var pivot_delta = m_vec3.subtract(coords, render.pivot, _vec3_tmp);
    var old_trans = m_tsr.get_trans_view(render.world_tsr);
    var trans = m_vec3.add(pivot_delta, old_trans, pivot_delta);
    m_trans.set_translation(camobj, trans);

    m_vec3.copy(coords, render.pivot);
}

exports.get_eye = get_eye;
function get_eye(camobj, dest) {
    if (!dest)
        var dest = new Float32Array(3);

    var trans = m_tsr.get_trans_view(camobj.render.world_tsr);
    m_vec3.copy(trans, dest);
    return dest;
}

/**
 * NOTE: deprecated, used for compatibility
 * uses _vec3_tmp, _vec3_tmp2
 */
exports.set_move_style = function(camobj, move_style) {
    camobj.render.move_style = move_style;

    camobj.render.horizontal_limits = null;
    camobj.render.vertical_limits = null;
    camobj.render.distance_limits = null;
    camobj.render.hover_horiz_trans_limits = null;
    camobj.render.hover_vert_trans_limits = null;

    init_ortho_props(camobj);

    switch (move_style) {
    case exports.MS_STATIC:
    case exports.MS_EYE_CONTROLS:
        break;
    case exports.MS_HOVER_CONTROLS:
        var pos = m_tsr.get_trans_view(camobj.render.world_tsr);
        var pivot = init_hover_pivot(camobj, 0, _vec3_tmp2);
        setup_hover_model(camobj, pos, pivot, null, null, null, null, 
                camobj.render.enable_hover_hor_rotation);
        break;
    case exports.MS_TARGET_CONTROLS:
        var cam_eye = get_eye(camobj, _vec3_tmp);
        var quat = m_tsr.get_quat_view(camobj.render.world_tsr);
        var view_vector = m_util.quat_to_dir(quat, m_util.AXIS_MZ, _vec3_tmp2);
        var pivot = m_vec3.scaleAndAdd(cam_eye, view_vector, PIVOT_DEFAULT_DIST, view_vector);
        m_vec3.copy(pivot, camobj.render.pivot);
        break;
    }
}

exports.wipe_move_style = function(camobj) {
    var render = camobj.render;
    
    // default STATIC camera with clean settings
    render.move_style = 0;

    m_vec3.set(0, 0, 0, render.pivot);
    m_vec3.set(0, 0, 0, render.hover_pivot);
    render.target_cam_upside_down = false;
    render.use_panning = false;

    render.horizontal_limits = null;
    render.vertical_limits = null;
    render.distance_limits = null;
    render.hover_horiz_trans_limits = null;
    render.hover_vert_trans_limits = null;
    render.pivot_limits = null;

    render.enable_hover_hor_rotation = true;
}

exports.set_eye_distance = function(cameras, eye_dist) {
    for (var i = 0; i < cameras.length; i++) {
        var cam = cameras[i];
        if (cam.type == TYPE_STEREO_LEFT ||
                cam.type == TYPE_STEREO_RIGHT ||
                cam.type == TYPE_HMD_LEFT ||
                cam.type == TYPE_HMD_RIGHT)
            set_stereo_params(cam, cam.stereo_conv_dist, eye_dist);
    }
}

exports.set_hmd_fov = function(camobj, hmd_left_fov, hmd_right_fov) {
    var active_scene = m_scenes.get_active();
    var cam_scene_data = m_obj_util.get_scene_data(camobj, active_scene);
    var cameras = cam_scene_data.cameras;
    for (var i = 0; i < cameras.length; i++) {
        var cam = cameras[i];

        if (cam.type == TYPE_HMD_LEFT ||
                cam.type == TYPE_HMD_RIGHT) {

            if (cam.type == TYPE_HMD_LEFT)
                m_vec4.copy(hmd_left_fov, cam.hmd_fov);

            if (cam.type == TYPE_HMD_RIGHT)
                m_vec4.copy(hmd_right_fov, cam.hmd_fov);

            if (!cam.reflection_plane)
                set_projection(cam);

            calc_view_proj_inverse(cam);
            calc_sky_vp_inverse(cam);
        }
    }
}

}
