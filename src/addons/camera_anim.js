/**
 * Copyright (C) 2014-2017 Triumph LLC
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
 * Camera animation add-on.
 * Implements procedural animation for the camera.
 * @module camera_anim
 * @local TrackToTargetZoomCallback
 * @local TrackToTargetCallback
 * @local AutoRotateDisabledCallback
 * @local MoveCameraToPointCallback
 * @local RotateCameraCallback
 */
b4w.module["camera_anim"] = function(exports, require) {

var m_cam   = require("camera");
var m_ctl   = require("controls");
var m_print = require("print");
var m_scs   = require("scenes");
var m_time  = require("time");
var m_trans = require("transform");
var m_tsr   = require("tsr");
var m_util  = require("util");
var m_vec3  = require("vec3");

var ROTATION_OFFSET = 0.2;
var ROTATION_LIMITS_EPS = 1E-6;
var DEFAULT_CAM_LIN_SPEED = 1;
var DEFAULT_CAM_ANGLE_SPEED = 0.01;
var DEFAULT_CAM_ROTATE_TIME = 1000;

// cache vars
var _vec2_tmp           = new Float32Array(2);
var _vec2_tmp2          = new Float32Array(2);
var _vec3_tmp           = new Float32Array(3);
var _vec3_tmp2          = new Float32Array(3);
var _vec3_tmp3          = new Float32Array(3);
var _tsr_tmp            = m_tsr.create();
var _tsr_tmp2           = m_tsr.create();
var _tsr_tmp3           = m_tsr.create();

var _limits_tmp = {};

var _is_camera_moving = false;
var _is_camera_rotating = false;

var _is_camera_stop_moving = false;
var _is_camera_stop_rotating = false;

/**
 * Callback to be executed when the camera finishes its track animation.
 * See track_to_target() method.
 * @callback TrackToTargetCallback
 */

/**
 * Callback to be executed when the camera finishes its zoom-in animation.
 * See track_to_target() method.
 * @callback TrackToTargetZoomCallback
 */


/**
 * Smoothly rotate the EYE camera to make it pointing at the specified
 * target (an object or some position). Then smoothly zoom on this target,
 * pause and zoom back.
 * @param {Object3D} cam_obj Camera object 3D
 * @param {(Object3D|Vec3)} target Target object or target position
 * @param {?number} [rot_speed=1] Rotation speed, radians per second
 * @param {?number} [zoom_mult=2] Zoom level value
 * @param {?number} [zoom_time=1] Time it takes to zoom on the target, seconds
 * @param {?number} [zoom_delay=1] Delay before the camera zooms back, seconds
 * @param {?TrackToTargetCallback} [track_cb] Track finishing callback
 * @param {?TrackToTargetZoomCallback} [zoom_in_cb] Zoom-in callback
 */
exports.track_to_target = function(cam_obj, target, rot_speed, zoom_mult, 
        zoom_time, zoom_delay, track_cb, zoom_in_cb) {

    if (!m_cam.is_eye_camera(cam_obj)) {
        m_print.error("track_to_target(): Wrong camera object or camera move style");
        return;
    }

    if (m_util.is_vector(target))
        var obj_pos = target;
    else {
        var obj_pos = _vec3_tmp;
        m_trans.get_object_center(target, false, obj_pos);
    }

    rot_speed  = rot_speed  || 1;
    zoom_mult  = zoom_mult  || 2;
    zoom_time  = zoom_time  || 1;
    zoom_delay  = zoom_delay || 1;

    var cam_pos = m_trans.get_translation(cam_obj, _vec3_tmp2);
    var dir_to_target = m_vec3.subtract(obj_pos, cam_pos, _vec3_tmp3);

    var start_angles = m_cam.get_camera_angles(cam_obj, _vec2_tmp);
    var finish_angles = m_cam.get_camera_angles_dir(dir_to_target, _vec2_tmp2);

    var phi_angle = finish_angles[0] - start_angles[0];
    var theta_angle = finish_angles[1] - start_angles[1];

    // calculate arc angle on a unit sphere using the spherical law of cosines
    var arc_angle = Math.acos(Math.cos(phi_angle) * Math.cos(theta_angle));
    var rot_time = Math.abs(arc_angle / rot_speed);

    var zoom_dist = m_vec3.length(dir_to_target) * (1 - 1 / zoom_mult);


    var smooth_function = function(x) {
        var f = 6 * x * (1 - x);
        return f;
    }

    var _start_time = m_time.get_timeline();
    var _stage = 0;
    var track_to_target_cb = function(obj, id, pulse) {
        // NOTE: if move_style was changed during the tracking
        if (!m_cam.is_eye_camera(obj)) {
            disable_cb();
            return;
        }

        if (pulse == 1) {
            var curr_time = m_ctl.get_sensor_value(obj, id, 0) - _start_time;
            var elapsed = m_ctl.get_sensor_value(obj, id, 1);

            if (curr_time < rot_time) {
                var smooth_coeff = smooth_function(curr_time / rot_time);
                var phi_delta = smooth_coeff * phi_angle * elapsed / rot_time;
                var theta_delta = smooth_coeff * theta_angle * elapsed / rot_time;
                m_cam.rotate_camera(cam_obj, phi_delta, theta_delta);
            } else if (curr_time < rot_time + zoom_time) {

                if (_stage == 0) {
                    m_cam.rotate_camera(cam_obj, finish_angles[0], finish_angles[1], true);
                    _stage++;
                }

                var smooth_coeff = smooth_function(curr_time - rot_time / zoom_time);
                var delta_dist = smooth_coeff * zoom_dist * elapsed / zoom_time;
                m_trans.move_local(obj, 0, 0, -delta_dist);
            } else if (curr_time < rot_time + zoom_time + zoom_delay) {
                if (_stage <= 1) {
                    m_cam.rotate_camera(cam_obj, finish_angles[0], finish_angles[1], true);
                    m_cam.eye_set_look_at(cam_obj, cam_pos);
                    m_trans.move_local(obj, 0, 0, -zoom_dist);
                    if (zoom_in_cb)
                        zoom_in_cb();
                    
                    _stage++;
                }
            } else if (curr_time < rot_time + zoom_time + zoom_delay + zoom_time) {
                if (_stage <= 2) {
                    m_cam.rotate_camera(cam_obj, finish_angles[0], finish_angles[1], true);
                    m_cam.eye_set_look_at(cam_obj, cam_pos);
                    m_trans.move_local(obj, 0, 0, -zoom_dist);
                    _stage++;
                }
                var smooth_coeff = smooth_function(curr_time - rot_time - zoom_time - zoom_delay / zoom_time);
                var delta_dist = smooth_coeff * zoom_dist * elapsed / zoom_time;
                m_trans.move_local(obj, 0, 0, delta_dist);
            } else {
                m_cam.rotate_camera(cam_obj, finish_angles[0], finish_angles[1], true);
                m_cam.eye_set_look_at(cam_obj, cam_pos);
                disable_cb();
            }
        }
    }

    var disable_cb = function() {
        m_ctl.remove_sensor_manifold(cam_obj, "TRACK_TO_TARGET");
        if (track_cb)
            track_cb();
    }

    var timeline = m_ctl.create_timeline_sensor();
    var elapsed = m_ctl.create_elapsed_sensor();
    m_ctl.create_sensor_manifold(cam_obj, "TRACK_TO_TARGET", m_ctl.CT_CONTINUOUS,
            [timeline, elapsed], null, track_to_target_cb);
}

function init_limited_rotation_ratio(obj, limits, auto_rotate_ratio) {
    var phi = m_cam.get_camera_angles(obj, _vec2_tmp)[0];

    var delts = get_delta_to_limits(obj, phi, limits.left, limits.right, _vec2_tmp2);

    return auto_rotate_ratio * Math.min(1, delts[0] / ROTATION_OFFSET,
            delts[1] / ROTATION_OFFSET);
}

function get_delta_to_limits(obj, angle, limit_left, limit_right, dest) {
    // accurate delta calculation
    var diff_left = m_util.angle_wrap_0_2pi(angle - limit_left);
    var delta_to_left = Math.min(diff_left, 2 * Math.PI - diff_left);
    var diff_right = m_util.angle_wrap_0_2pi(limit_right - angle);
    var delta_to_right = Math.min(diff_right, 2 * Math.PI - diff_right);

    // some precision errors could be near the limits
    if (Math.abs(delta_to_left) < ROTATION_LIMITS_EPS 
            || 2 * Math.PI - Math.abs(delta_to_left) < ROTATION_LIMITS_EPS)
        delta_to_left = 0;
    if (Math.abs(delta_to_right) < ROTATION_LIMITS_EPS 
            || 2 * Math.PI - Math.abs(delta_to_right) < ROTATION_LIMITS_EPS)
        delta_to_right = 0;

    if (m_cam.is_eye_camera(obj)) {
        dest[0] = delta_to_right; // to min angle
        dest[1] = delta_to_left; // to max angle
    } else {
        dest[0] = delta_to_left; // to min angle
        dest[1] = delta_to_right; // to max angle
    }

    return dest;
}

/**
 * Callback to be executed when auto-rotating is disabled.
 * It is fired when either the user manually rotates the camera,
 * or the auto_rotate() method is executed again.
 * @callback AutoRotateDisabledCallback
 */

/**
 * Switch auto-rotation of the TARGET or HOVER camera around its pivot, or
 * auto-rotating of the EYE camera around itself.
 * When it is called for the first time, auto-rotation is enabled
 * while the next call will disable auto-rotation.
 * @param {number} auto_rotate_ratio Rotation speed multiplier
 * @param {AutoRotateDisabledCallback} [callback] Callback to be executed when auto-rotation is disabled
 * @param {boolean} [disable_on_mouse_wheel] Disable camera auto-rotation after mouse scrolling.
 */
exports.auto_rotate = function(auto_rotate_ratio, callback, disable_on_mouse_wheel) {

    callback = callback || function(){};

    var obj = m_scs.get_active_camera();

    if (m_cam.is_static_camera(obj)) {
        m_print.error("auto_rotate(): Wrong camera move style");
        return;
    }

    var angle_limits = {};
    var rot_offset = 0;
    var cur_rotate_ratio = 0;

    function update_limited_rotation_params(curr_limits) {
        angle_limits = angle_limits || {};
        angle_limits.left = curr_limits.left;
        angle_limits.right = curr_limits.right;
        rot_offset = Math.min(ROTATION_OFFSET,
                (m_util.angle_wrap_0_2pi(angle_limits.right - angle_limits.left)) / 2);
        cur_rotate_ratio = init_limited_rotation_ratio(obj,
                angle_limits, auto_rotate_ratio);
    }

    function elapsed_cb(obj, id, pulse) {
        if (pulse == 1) {
            var move_style = m_cam.get_move_style(obj);
            // NOTE: if move_style was changed to STATIC during the autorotation

            if (move_style == m_cam.MS_STATIC)
                disable_cb();
            else if ((move_style == m_cam.MS_TARGET_CONTROLS 
                    || move_style == m_cam.MS_EYE_CONTROLS) 
                    && m_cam.has_horizontal_rot_limits(obj)) {

                var curr_limits = (move_style == m_cam.MS_EYE_CONTROLS) 
                        ? m_cam.eye_get_horizontal_limits(obj, _limits_tmp)
                        : m_cam.target_get_horizontal_limits(obj, _limits_tmp);

                if (angle_limits === null || curr_limits.left != angle_limits.left
                        || curr_limits.right != angle_limits.right)
                    update_limited_rotation_params(curr_limits);
                limited_auto_rotate(obj, id);
            } else {
                angle_limits = null;
                unlimited_auto_rotate(obj, id);
            }
        }
    }

    function limited_auto_rotate(obj, id) {
        var value = m_ctl.get_sensor_value(obj, id, 0);

        var phi = m_cam.get_camera_angles(obj, _vec2_tmp)[0];
        var delts = get_delta_to_limits(obj, phi, angle_limits.left, angle_limits.right,
                _vec2_tmp2);

        if (delts[1] > rot_offset 
                && delts[0] > rot_offset)
            cur_rotate_ratio = m_util.sign(cur_rotate_ratio) * auto_rotate_ratio;

        else if (delts[1] < rot_offset)
            cur_rotate_ratio = cur_rotate_ratio - 
                    Math.pow(auto_rotate_ratio, 2) / (2 * ROTATION_OFFSET) * value;

        else if (delts[0] < rot_offset)
            cur_rotate_ratio = cur_rotate_ratio +
                    Math.pow(auto_rotate_ratio, 2) / (2 * ROTATION_OFFSET) * value;

        m_cam.rotate_camera(obj, value * cur_rotate_ratio, 0);
    }

    function unlimited_auto_rotate(obj, id) {
        var value = m_ctl.get_sensor_value(obj, id, 0);
        m_cam.rotate_camera(obj, value * auto_rotate_ratio, 0);
    }

    function disable_cb() {
        m_ctl.remove_sensor_manifold(obj, "AUTO_ROTATE");
        m_ctl.remove_sensor_manifold(obj, "DISABLE_AUTO_ROTATE");

        callback();
    }

    if (!m_ctl.check_sensor_manifold(obj, "AUTO_ROTATE")) {
        var mouse_move_x = m_ctl.create_mouse_move_sensor("X");
        var mouse_move_y = m_ctl.create_mouse_move_sensor("Y");
        var mouse_down   = m_ctl.create_mouse_click_sensor();
        var touch_move   = m_ctl.create_touch_move_sensor();
        var touch_zoom   = m_ctl.create_touch_zoom_sensor();
        var elapsed      = m_ctl.create_elapsed_sensor();

        if (disable_on_mouse_wheel)
            var wheel_zoom = m_ctl.create_mouse_wheel_sensor();
        else
            var wheel_zoom = m_ctl.create_custom_sensor(0);

        var logic_func = function(s) {return (s[0] && s[2]) || (s[1] && s[2]) || s[3] || s[4] || s[5]};

        m_ctl.create_sensor_manifold(obj, "DISABLE_AUTO_ROTATE", m_ctl.CT_LEVEL,
                                    [mouse_move_x, mouse_move_y, mouse_down,
                                    touch_move, touch_zoom, wheel_zoom], logic_func,
                                    disable_cb);

        m_ctl.create_sensor_manifold(obj, "AUTO_ROTATE", m_ctl.CT_CONTINUOUS,
                                    [elapsed], function(s) {return s[0]},
                                    elapsed_cb);
    } else
        disable_cb();
}

/**
 * Check if the camera is auto-rotating.
 * @method module:camera_anim.is_auto_rotate
 * @returns {boolean} Result of the check: true - when the camera is
 * auto-rotating, false - otherwise.
 */
exports.is_auto_rotate = function() {
    var obj = m_scs.get_active_camera();

    return m_ctl.check_sensor_manifold(obj, "AUTO_ROTATE");
}

/**
 * Check if auto-rotation is possible for the camera.
 * For example, the STATIC camera cannot be rotated.
 * @method module:camera_anim.check_auto_rotate
 * @returns {boolean} Result of the check: true - when auto-rotation is
 * possible, false - otherwise.
 */
exports.check_auto_rotate = function() {
    var obj = m_scs.get_active_camera();
    var cam_type = m_cam.get_move_style(obj);

    if (cam_type == m_cam.MS_STATIC)
        return false;

    return true;
}

/**
 * Callback to be executed when camera is finishes its moving animation.
 * See move_camera_to_point() method
 * @callback MoveCameraToPointCallback
 */

/**
 * Smoothly move the camera to the target point. Intended for STATIC cameras only.
 * @param {(Object3D|tsr)} cam_obj Camera object 3D
 * @param {(Object3D|tsr)} point_obj Target point object 3D
 * @param {number} cam_lin_speed Camera linear speed, meters per second
 * @param {number} cam_angle_speed Camera angular speed, radians per second
 * @param {MoveCameraToPointCallback} [cb] Finishing callback
 */
exports.move_camera_to_point = function(cam_obj, point_obj, cam_lin_speed, cam_angle_speed, cb) {
    if (m_cam.get_move_style(cam_obj) != m_cam.MS_STATIC) {
        m_print.error("move_camera_to_point(): wrong camera type");

        return;
    }

    if (_is_camera_moving)
        return;

    if (!cam_obj) {
        m_print.error("move_camera_to_point(): you must specify the camera object");

        return;
    }

    if (!point_obj) {
        m_print.error("move_camera_to_point(): you must specify the point object");

        return;
    }

    cam_lin_speed   = cam_lin_speed || DEFAULT_CAM_LIN_SPEED;
    cam_angle_speed = cam_angle_speed || DEFAULT_CAM_ANGLE_SPEED;

    if (m_util.is_vector(cam_obj))
        var cam_tsr = cam_obj;
    else
        var cam_tsr = m_trans.get_tsr(cam_obj, _tsr_tmp);

    if (m_util.is_vector(point_obj))
        var point_tsr = point_obj;
    else
        var point_tsr = m_trans.get_tsr(point_obj, _tsr_tmp2);

    var distance  = m_vec3.distance(m_tsr.get_trans_view(cam_tsr),
                                    m_tsr.get_trans_view(point_tsr));
    var move_time = distance / cam_lin_speed;

    var current_cam_dir = m_util.quat_to_dir(m_tsr.get_quat_view(cam_tsr),
                                             m_util.AXIS_MZ, _vec3_tmp);
    var target_cam_dir  = m_util.quat_to_dir(m_tsr.get_quat_view(point_tsr),
                                             m_util.AXIS_MZ, _vec3_tmp2);

    var vec_dot     = Math.min(Math.abs(m_vec3.dot(current_cam_dir,
                                                   target_cam_dir)), 1);
    var angle       = Math.acos(vec_dot);
    var rotate_time = angle / cam_angle_speed;

    var time = Math.max(move_time, rotate_time) * 1000;

    _is_camera_moving = true;

    var cur_animator = m_time.animate(0, 1, time, function(e) {
        var new_tsr = m_tsr.interpolate(cam_tsr, point_tsr,
                                        m_util.smooth_step(e), _tsr_tmp3);

        if (_is_camera_stop_moving) {
            m_time.clear_animation(cur_animator);
            _is_camera_stop_moving = false;
            _is_camera_moving = false;

            return;
        }

        m_trans.set_tsr(cam_obj, new_tsr);

        if (e == 1) {
            _is_camera_moving = false;

            if (cb)
                cb();
        }
    });
}

/**
 * Callback to be executed when camera is finishes its rotate animation.
 * See rotate_camera() method
 * @callback RotateCameraCallback
 */

/**
 * Smoothly rotate the camera. Intended for non-STATIC cameras.
 * @param {Object3D} cam_obj Camera object 3D
 * @param {number} angle_phi Horizontal rotation angle (in radians)
 * @param {number} angle_theta Vertical rotation angle (in radians)
 * @param {number} [time=1000] Rotation time in ms
 * @param {RotateCameraCallback} [cb] Finishing callback
 */
exports.rotate_camera = function(cam_obj, angle_phi, angle_theta, time, cb) {
    if (m_cam.get_move_style(cam_obj) == m_cam.MS_STATIC) {
        m_print.error("rotate_camera(): not supported for STATIC cameras");
        return;
    }

    if (_is_camera_rotating)
        return;

    if (!cam_obj) {
        m_print.error("rotate_camera(): you must specify the camera object");

        return;
    }

    if (!angle_phi && !angle_theta) {
        m_print.error("rotate_camera(): you must specify the rotation angle");

        return;
    }

    time = time || DEFAULT_CAM_ROTATE_TIME;

    _is_camera_rotating = true;

    var delta_phi   = 0;
    var delta_theta = 0;

    var angle = angle_phi != 0 ? angle_phi: angle_theta;

    var cur_animator = m_time.animate(0, angle, time, function(e) {
        if (_is_camera_stop_rotating) {
            m_time.clear_animation(cur_animator);
            _is_camera_stop_rotating = false;
            _is_camera_rotating = false;

            return;
        }

        delta_phi   -= e;
        delta_theta -= e;

        if (angle_theta && angle_phi)
            m_cam.rotate_camera(cam_obj, delta_phi, delta_theta);
        else if (angle_theta)
            m_cam.rotate_camera(cam_obj, 0, delta_theta);
        else if (angle_phi)
            m_cam.rotate_camera(cam_obj, delta_phi, 0);

        delta_phi   = e;
        delta_theta = e;

        if (e == angle) {
            _is_camera_rotating = false;

            if (cb)
                cb();
        }
    })
}

/**
 * Stop camera moving.
 * @method module:camera_anim.stop_cam_moving
 */
exports.stop_cam_moving = function() {
    _is_camera_stop_moving = true;
}

/**
 * Stop camera rotating.
 * @method module:camera_anim.stop_cam_rotating
 */
exports.stop_cam_rotating = function() {
    _is_camera_stop_rotating = true;
}

/**
 * Check if the camera is being moved by the 
 * {@link module:camera_anim.move_camera_to_point|move_camera_to_point} function.
 * @method module:camera_anim.is_moving
 * @returns {boolean} Result of the check: true - when the camera is
 * moving, false - otherwise.
 */
exports.is_moving = function() {
    return _is_camera_moving;
}

/**
 * Check if the camera is being rotated by the 
 * {@link module:camera_anim.rotate_camera|rotate_camera} function.
 * @method module:camera_anim.is_rotating
 * @returns {boolean} Result of the check: true - when the camera is
 * rotating, false - otherwise.
 */
exports.is_rotating = function() {
    return _is_camera_rotating;
}

}
