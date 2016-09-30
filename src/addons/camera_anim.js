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
var m_quat  = require("quat");

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
var _quat4_tmp          = new Float32Array(4);
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
 * Callback to be executed when the camera finishes its zoom animation.
 * See track_to_target() method.
 * @callback TrackToTargetZoomCallback
 */

/**
 * Smoothly rotate the EYE camera to make it pointing at the specified
 * target (an object or some position). Then smoothly zoom on this target,
 * pause and zoom back.
 * @param {Object3D} cam_obj Camera object 3D
 * @param {(Object3D|Vec3)} target Target object or target position
 * @param {Number} rot_speed Rotation speed, radians per second
 * @param {Number} zoom_mult Zoom level value
 * @param {Number} zoom_time Time it takes to zoom on the target, seconds
 * @param {Number} zoom_delay Delay before the camera zooms back, seconds
 * @param {TrackToTargetCallback} [callback] Finishing callback
 * @param {TrackToTargetZoomCallback} [zoom_cb] Zoom callback
 */
exports.track_to_target = function(cam_obj, target, rot_speed, zoom_mult,
                                    zoom_time, zoom_delay, callback, zoom_cb) {

    if (!m_cam.is_eye_camera(cam_obj)) {
        m_print.error("track_to_target(): wrong object");
        return;
    }

    if (!cam_obj)
        return;

    if (!target)
        return;
    else if (m_util.is_vector(target))
        var obj_pos = target;
    else {
        var obj_pos = _vec3_tmp3;
        m_trans.get_object_center(target, false, obj_pos);
    }

    var rot_sp  = rot_speed  || 1;
    var zoom_m  = zoom_mult  || 2;
    var zoom_t  = zoom_time  || 1;
    var zoom_d  = zoom_delay || 1;

    var def_dir = _vec3_tmp2;
    def_dir[0]  = 0;
    def_dir[1]  = -1;
    def_dir[2]  = 0;

    var cam_quat   = m_trans.get_rotation(cam_obj);
    var cam_dir    = m_util.quat_to_dir(cam_quat, def_dir);
    var cam_angles = m_cam.get_camera_angles(cam_obj, _vec2_tmp);

    // direction vector to the target
    var dir_to_obj = _vec3_tmp;
    var cam_pos    = m_trans.get_translation(cam_obj);
    m_vec3.subtract(obj_pos, cam_pos, dir_to_obj);
    m_vec3.normalize(dir_to_obj, dir_to_obj);

    // quaternion between current camera vector and new camera vector
    var rot_quat = m_quat.rotationTo(cam_dir, dir_to_obj, m_quat.create());

    // final quaternion for the camera
    var quat = _quat4_tmp;
    m_quat.multiply(rot_quat, cam_quat, quat);

    m_util.correct_cam_quat_up(quat, false);

    // distance to zoom point
    var sub_vec = _vec3_tmp2;
    m_vec3.subtract(obj_pos, cam_pos, sub_vec);
    var zoom_distance = m_vec3.length(sub_vec) * (1 - 1 / zoom_m);

    // destination angles
    var angle_to_obj_y = Math.asin(dir_to_obj[1]);
    var angle_to_obj_x =
                 Math.acos(-dir_to_obj[2] / Math.abs(Math.cos(angle_to_obj_y)));

    if (dir_to_obj[0] > 0)
        angle_to_obj_x = 2 * Math.PI - angle_to_obj_x;

    // delta rotate angles
    var angle_x = angle_to_obj_x - cam_angles[0];
    var angle_y = angle_to_obj_y - cam_angles[1];

    var cam_dir_z = _vec3_tmp3;
    cam_dir_z[0]  = 0;
    cam_dir_z[1]  = 0;
    cam_dir_z[2]  = -1;

    var cam_rot_quat = m_trans.get_rotation(cam_obj);
    var cam_rot_dir  = m_util.quat_to_dir(cam_rot_quat, cam_dir_z);

    if (cam_rot_dir[1] < 0) {
        if (cam_dir[1] > 0)
            angle_y = angle_to_obj_y - Math.PI + cam_angles[1];
        else
            angle_y = angle_to_obj_y + Math.PI + cam_angles[1];

        if (angle_x > 0)
            angle_x = -Math.PI + angle_x;
        else
            angle_x = Math.PI + angle_x;

    } else {
        if(Math.abs(angle_x) > Math.PI)
            if (angle_x > 0)
                angle_x = angle_x - 2 * Math.PI;
            else
                angle_x = angle_x + 2 * Math.PI;
    }

    // action conditions
    var cur_time       = 0;
    var elapsed        = m_ctl.create_elapsed_sensor();
    var rot_end_time_x = Math.abs(angle_x / rot_sp);
    var rot_end_time_y = Math.abs(angle_y / rot_sp);
    var rot_end_time   =
        rot_end_time_x > rot_end_time_y ? rot_end_time_x : rot_end_time_y;
    var zoom_end_time  = rot_end_time + zoom_t;
    var zoom_end_delay = zoom_end_time + zoom_d;
    var finish_time    = zoom_end_delay + zoom_t;

    var dest_ang_x   = angle_x;
    var dest_ang_y   = angle_y;
    var dest_trans_x = zoom_distance;

    var smooth_function = function(x) {
        var f = 6 * x * (1 - x);
        return f;
    }

    var track_cb = function(obj, id, pulse) {
        if (pulse) {

            // NOTE: if move_style was changed during the tracking
            if (!m_cam.is_eye_camera(obj)) {
                disable_cb();
                return;
            }

            var value = m_ctl.get_sensor_value(obj, id, 0);
            cur_time += value;

            if (cur_time < rot_end_time) {

                var delta_x = angle_x / rot_end_time * value;
                var delta_y = angle_y / rot_end_time * value;

                // smoothing
                var time_ratio = cur_time / rot_end_time;
                var slerp      = smooth_function(time_ratio);

                delta_x *= slerp;
                delta_y *= slerp;

                dest_ang_x -= delta_x;
                dest_ang_y -= delta_y;

                m_cam.eye_rotate(obj, delta_x, delta_y);

            } else if (cur_time < zoom_end_time) {

                if (dest_ang_x) {
                    m_cam.eye_rotate(obj, dest_ang_x, dest_ang_y);
                    dest_ang_x = 0;

                    if (zoom_cb)
                        zoom_cb();
                }

                var time_ratio = (cur_time - rot_end_time)/ zoom_t;
                var delta      = -zoom_distance * value / zoom_t;
                dest_trans_x  -= delta_x;

                delta *= smooth_function(time_ratio);
                m_trans.move_local(obj, 0, delta, 0);

            } else if (cur_time < zoom_end_delay) {
                if (dest_trans_x) {
                    m_trans.move_local(obj, 0, dest_trans_x, 0);
                    dest_trans_x = 0;
                }
                // waiting for zoom delay

            } else if (cur_time < finish_time) {
                var time_ratio = (cur_time - zoom_end_delay)/ zoom_t;
                var delta      = zoom_distance * value / zoom_t;

                delta *= smooth_function(time_ratio);
                m_trans.move_local(obj, 0, delta, 0);

            } else {
                m_trans.set_translation_v(obj, cam_pos);
                disable_cb();
            }
        }
    }

    var disable_cb = function() {
        m_ctl.remove_sensor_manifold(cam_obj, "TRACK_TO_TARGET");
        if (callback)
            callback();
    }

    m_ctl.create_sensor_manifold(cam_obj,
                                "TRACK_TO_TARGET",
                                m_ctl.CT_CONTINUOUS,
                                [elapsed],
                                null,
                                track_cb);
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
 * @param {Number} auto_rotate_ratio Rotation speed multiplier
 * @param {AutoRotateDisabledCallback} [callback] Callback to be executed when auto-rotation is disabled
 * @param {Boolean} [disable_on_mouse_wheel] Disable camera auto-rotation after mouse scrolling.
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
 * @returns {Boolean} Result of the check: true - when the camera is
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
 * @returns {Boolean} Result of the check: true - when auto-rotation is
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
 * @param {Number} cam_lin_speed Camera linear speed, meters per second
 * @param {Number} cam_angle_speed Camera angular speed, radians per second
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
 * @param {Number} angle_phi Horisontal rotation angle
 * @param {Number} angle_theta Vertical rotation angle
 * @param {Number} [time=1000] Rotation time in ms
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
 * Check if the camera is moving.
 * @method module:camera_anim.is_moving
 * @returns {Boolean} Result of the check: true - when the camera is
 * moving, false - otherwise.
 */
exports.is_moving = function() {
    return _is_camera_moving;
}

/**
 * Check if the camera is rotating.
 * @method module:camera_anim.is_rotating
 * @returns {Boolean} Result of the check: true - when the camera is
 * rotating, false - otherwise.
 */
exports.is_rotating = function() {
    return _is_camera_rotating;
}

}
