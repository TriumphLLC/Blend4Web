"use strict";

/** 
 * Camera API. 
 * All functions require a valid camera object ID.
 * Constraints and standard translation/rotation functions also supported.
 * @module camera
 */
b4w.module["camera"] = function(exports, require) {

var camera      = require("__camera");
var config      = require("__config");
var m_print     = require("__print");
var constraints = require("__constraints");
var transform   = require("__transform");
var util        = require("__util");

var m_vec3 = require("vec3");
var m_vec4 = require("vec4");
var m_quat = require("quat");
var m_mat4 = require("mat4");

var cfg_ctl = config.controls;

var _vec3_tmp = new Float32Array(3);
var _vec3_tmp2 = new Float32Array(3);
var _quat4_tmp = new Float32Array(4);
var _vec4_tmp = new Float32Array(4);

/**
 * Camera movement style.
 * @const module:camera.MS_STATIC
 */
exports["MS_STATIC"] = camera.MS_STATIC;
/**
 * Camera movement style.
 * @const module:camera.MS_ANIMATION
 */
exports["MS_ANIMATION"] = camera.MS_ANIMATION;
/**
 * Camera movement style.
 * @const module:camera.MS_CONTROLS
 * @deprecated Use MS_TARGET_CONROLS or MS_EYE_CONTROLS
 */
exports["MS_CONTROLS"] = camera.MS_TARGET_CONTROLS;
/**
 * Camera movement style.
 * @const module:camera.MS_TARGET_CONTROLS
 */
exports["MS_TARGET_CONTROLS"] = camera.MS_TARGET_CONTROLS;
/**
 * Camera movement style.
 * @const module:camera.MS_EYE_CONTROLS
 */
exports["MS_EYE_CONTROLS"] = camera.MS_EYE_CONTROLS;

/**
 * Check if the object is a camera.
 * @method module:camera.is_camera
 * @param obj Object ID
 */
exports["is_camera"] = function(obj) {
    return camera.is_camera(obj);
}

/**
 * Set camera movement style (MS_*)
 * @method module:camera.set_move_style
 * @deprecated Read only now
 */
exports["set_move_style"] = function() {
    return;
}
/**
 * Get camera movement style
 * @method module:camera.get_move_style
 * @param camobj Camera Object ID
 */
exports["get_move_style"] = function(camobj) {
    if (!camera.is_camera(camobj)) {
        m_print.error("Wrong object");
        return null;
    }

    return camera.get_move_style(camobj);
}
/**
 * @method module:camera.change_eye_target_dist
 * @deprecated eye-target distance is a constant now
 */
exports["change_eye_target_dist"] = function() {
    m_print.error("change_eye_target_dist() deprecated");
}
/**
 * Multiply camera translation speed by a factor
 * @method module:camera.change_trans_speed
 * @param camobj Camera Object ID
 * @param factor Speed factor
 */
exports["change_trans_speed"] = function(camobj, factor) {

    var render = camobj._render;

    var trans_speed = render.trans_speed[0];
    trans_speed *= (1 + factor * cfg_ctl.cam_zoom_base_speed);
    render.trans_speed = [trans_speed, trans_speed, trans_speed];
}

exports["get_trans_speed"] = function(camobj) {
    if (!camera.is_camera(camobj)) {
        m_print.error("Wrong object");
        return 0;
    }

    return camobj._render.trans_speed[0];
}

/**
 * Low-level function: set camera position based on input parameters
 * @method module:camera.set_look_at
 * @param camobj Camera Object ID
 * @param eye Eye vector
 * @param target Target vector
 * @param elapsed Time elapsed from prevous execution
 */
exports["set_look_at"] = function(camobj, eye, target, up, elapsed) {
    var render = camobj._render;

    camera.eye_target_up_to_trans_quat(eye, target, up, render.trans, render.quat);

    transform.update_transform(camobj);
};

/**
 * Get camera eye vector
 * @method module:camera.get_eye
 * @param camobj Camera Object ID
 * @returns {vec3} Eye
 */
exports["get_eye"] = function(camobj) {
    return camobj._render.trans;
}

exports["set_pivot"] = set_pivot;
/**
 * Set pivot point for MS_TARGET_CONTROLS camera.
 * NOTE: removes all previous camera constraints
 * @method module:camera.set_pivot
 * @param camobj Camera Object ID
 * @param coords Pivot vector
 */
function set_pivot(camobj, coords) {

    if (!camera.is_target_camera(camobj)) {
        m_print.error("set_pivot(): Wrong object or camera move style");
        return;
    }

    camera.set_point_constraint(camobj, coords);
}

/**
 * Get the camera pivot point.
 * @method module:camera.get_pivot
 * @param camobj Camera Object ID
 * @param dest Destination pivot vector
 */
exports["get_pivot"] = function(camobj, dest) {

    if (!camera.is_target_camera(camobj)) {
        m_print.error("set_pivot(): Wrong object or camera move style");
        return;
    }

    if (!dest)
        var dest = new Float32Array(3);

    var render = camobj._render;

    m_vec3.copy(render.pivot, dest);
    return dest;
}

/**
 * Rotate MS_TARGET_CONTROLS camera around the pivot point.
 * +h from left to right (CCW around Y)
 * +v down (CCW around DIR x Y)
 * @method module:camera.rotate_pivot
 * @param camobj Camera Object ID
 * @param {Number} angle_h_delta Horizontal angle in radians
 * @param {Number} angle_v_delta Vertical angle in radians
 */
exports["rotate_pivot"] = function(camobj, angle_h_delta, angle_v_delta) {

    if (!camera.is_target_camera(camobj)) {
        m_print.error("rotate_pivot(): wrong object");
        return;
    }

    var render = camobj._render;

    var axis = _vec3_tmp;
    var rot = _quat4_tmp;

    // angle_h_delta around world Y
    axis[0] = 0;
    axis[1] = 1;
    axis[2] = 0;

    m_quat.setAxisAngle(axis, angle_h_delta, rot);
    util.rotate_point_pivot(render.trans, render.pivot, rot, render.trans);

    // angle_v_delta around local X transformed to world space
    axis[0] = 1;
    axis[1] = 0;
    axis[2] = 0;

    m_vec3.transformQuat(axis, render.quat, axis);
    m_quat.setAxisAngle(axis, angle_v_delta, rot);
    util.rotate_point_pivot(render.trans, render.pivot, rot, render.trans);

    transform.update_transform(camobj);
}

/**
 * Set vertical clamping limits for TARGET or EYE camera.
 * @method module:camera.apply_vertical_limits
 * @param camobj Camera Object ID
 * @param down_angle Vertical maximum down angle
 * @param up_angle Vertical maximum up angle
 */
exports["apply_vertical_limits"] = function(camobj, down_angle, up_angle) {
    var render = camobj._render;
    render.vertical_limits = {
        down: down_angle,
        up: up_angle
    };
}

/**
 * Remove vertical clamping limits from TARGET or EYE camera.
 * @method module:camera.clear_vertical_limits
 * @param camobj Camera Object ID
 */
exports["clear_vertical_limits"] = function(camobj) {
    var render = camobj._render;
    render.vertical_limits = null;
}

/**
 * Set eye params needed to set the camera target
 * @method module:camera.set_eye_params
 * @param camobj Camera Object ID
 * @param h_angle Horizontal angle
 * @param v_angle Vertiacal angle
 */
exports["set_eye_params"] = function(camobj, h_angle, v_angle) {

    var render = camobj._render;

    m_quat.identity(render.quat);

    camera.rotate_v_local(camobj, Math.PI/2);

    camera.rotate_h(camobj, h_angle);
    camera.rotate_v_local(camobj, -v_angle);

    transform.update_transform(camobj);
}
/**
 * Check if the camera is looking upwards
 * @method module:camera.is_look_up
 * @param camobj Camera Object ID
 */
exports["is_look_up"] = function(camobj) {
    var quat = camobj._render.quat;

    var dir = _vec3_tmp;
    util.quat_to_dir(quat, util.AXIS_MY, dir);

    if (dir[1] >= 0)
        return true;
    else 
        return false;
}
/**
 * Rotate the camera.
 * Around a target for MS_TARGET_CONTROLS, around the eye for MS_EYE_CONTROLS
 * @method module:camera.rotate
 * @param camobj Camera Object ID
 * @param {Number} angle_h_delta Horizontal angle in radians
 * @param {Number} angle_v_delta Vertical angle in radians
 */
exports["rotate"] = function(camobj, angle_h_delta, angle_v_delta) {

    // NOTE: MS_EYE_CONTROLS only
    camera.rotate_h(camobj, angle_h_delta);
    camera.rotate_v_local(camobj, -angle_v_delta);

    transform.update_transform(camobj);
}
/**
 * Get angles.
 * Get the camera horizontal and vertical angles
 * @method module:camera.get_angles
 * @param camobj Camera Object ID
 * @param {vec2} dest Destination vector for camera angles ([h, v])
 */
exports["get_angles"] = function(camobj, dest) {
    if (!dest)
        var dest = new Float32Array(2);
    camera.get_angles(camobj, dest);
    return dest;
}
/**
 * Set distance to the convergence plane for a stereo camera
 * @method module:camera.set_stereo_distance
 * @param camobj Camera Object ID
 * @param {Number} conv_dist Distance from convergence plane
 */
exports["set_stereo_distance"] = function(camobj, conv_dist) {

    var cameras = camobj._render.cameras;
    for (var i = 0; i < cameras.length; i++) {
        var cam = cameras[i];

        if (cam.type == camera.TYPE_STEREO_LEFT || 
                cam.type == camera.TYPE_STEREO_RIGHT)
            camera.set_stereo_params(cam, conv_dist, cam.stereo_eye_dist);
    }
}
/**
 * Get distance from the convergence plane for a stereo camera
 * @method module:camera.get_stereo_distance
 * @param camobj Camera Object ID
 * @returns {Number} Distance from convergence plane
 */
exports["get_stereo_distance"] = function(camobj, conv_dist) {

    var cameras = camobj._render.cameras;
    for (var i = 0; i < cameras.length; i++) {
        var cam = cameras[i];

        if (cam.type == camera.TYPE_STEREO_LEFT || 
                cam.type == camera.TYPE_STEREO_RIGHT)
            return cam.stereo_conv_dist;
    }

    return 0;
}
/**
 * Returns true if the camera's eye is located under the water surface
 * @method module:camera.is_underwater
 * @param camobj Camera Object ID
 * @returns {Boolean}
 * @deprecated Always returns false
 */
exports["is_underwater"] = function(camobj) {
    var render = camobj._render;
    return render.underwater;
}
/**
 * Translate the view plane.
 * @method module:camera.translate_view
 * @param camobj Camera Object ID
 * @param x X coord (positive left to right)
 * @param y Y coord (positive down to up)
 * @param angle Rotation angle (clockwise)
 */
exports["translate_view"] = function(camobj, x, y, angle) {

    var cameras = camobj._render.cameras;
    for (var i = 0; i < cameras.length; i++) {
        var cam = cameras[i];

        // NOTE: camera projection matrix already has been updated in 
        // set_view method of camera
        if (!cam.reflection_plane) 
            camera.set_projection(cam, cam.aspect);

        var vec3_tmp = _vec3_tmp;
        vec3_tmp[0] = -x;
        vec3_tmp[1] = -y;
        vec3_tmp[2] = 0;

        m_mat4.translate(cam.proj_matrix, vec3_tmp, cam.proj_matrix);
        m_mat4.rotateZ(cam.proj_matrix, angle, cam.proj_matrix);

        m_mat4.multiply(cam.proj_matrix, cam.view_matrix, cam.view_proj_matrix);
        camera.calc_view_proj_inverse(cam);
        camera.calc_sky_vp_inverse(cam);
    }
}
/**
 * Up correction is required in case of a change from constrainted to free mode
 */
exports["correct_up"] = function(camobj, y_axis) {
    if (!y_axis) {
        y_axis = util.AXIS_Y;
    }

    constraints.correct_up(camobj, y_axis);
}

/**
 * Zoom the camera on the object.
 * @method module:camera.zoom_object
 * @param camobj Camera Object ID
 * @param obj Object ID
 */
exports["zoom_object"] = function(camobj, obj) {

    if (!camera.is_target_camera(camobj)) {
        m_print.error("zoom_object(): wrong object");
        return;
    }

    var calc_bs_center = false;

    var center = _vec3_tmp;
    transform.get_object_center(obj, calc_bs_center, center);
    set_pivot(camobj, center);
    transform.update_transform(camobj);

    var radius = transform.get_object_size(obj);
    var ang_radius = camera.get_angular_diameter(camobj) / 2;

    var dist_need = radius / Math.sin(ang_radius);
    var dist_current = transform.obj_point_distance(camobj, center);

    // +y move backward
    transform.move_local(camobj, 0, dist_need - dist_current, 0);

    transform.update_transform(camobj);
}

/**
 * Calculate the direction of the camera ray based on screen coords
 * Screen space origin is the top left corner
 * @method module:camera.calc_ray
 * @param xpix X screen coordinate
 * @param ypix Y screen coordinate
 */
exports["calc_ray"] = function(camobj, xpix, ypix, dest) {

    if (!dest)
        var dest = new Float32Array(3);

    var cam = camobj._render.cameras[0];

    switch (cam.type) {
    case camera.TYPE_PERSP:
    case camera.TYPE_PERSP_ASPECT:
    case camera.TYPE_STEREO_LEFT:
    case camera.TYPE_STEREO_RIGHT:
        var top_1m = Math.tan(cam.fov * Math.PI / 360.0);
        var right_1m = top_1m * cam.aspect;

        var dir = _vec4_tmp;

        // in the camera's local space
        dir[0] = (2.0 * xpix / cam.width - 1.0) * right_1m;
        dir[1] = -1;
        dir[2] = (2.0 * ypix / cam.height - 1.0) * top_1m;
        dir[3] = 0;

        var wm = camobj._render.world_matrix;
        m_vec4.transformMat4(dir, wm, dir);

        dest[0] = dir[0];
        dest[1] = dir[1];
        dest[2] = dir[2];

        m_vec3.normalize(dest, dest);

        return dest;
    default:
        m_print.error("Non-compatible camera");
        return dest;
    }
}

}
