"use strict";

/**
 * Camera animation add-on.
 * Implements procedural animation for the camera.
 * @module camera_anim
 * @local track_to_target_zoom_cb
 * @local track_to_target_cb
 * @local auto_rotate_disabled_cb
 */
b4w.module["camera_anim"] = function(exports, require) {

var m_cam   = require("camera");
var m_ctl   = require("controls");
var m_print = require("print");
var m_scs   = require("scenes");
var m_trans = require("transform");
var m_util  = require("util");
var m_vec3  = require("vec3");
var m_quat  = require("quat");

var PI = Math.PI;
var ROTATION_OFFSET = 0.2;
var ROTATION_LIMITS_EPS = 1E-6;

// cache vars
var _vec2_tmp           = new Float32Array(2);
var _vec2_tmp2          = new Float32Array(2);
var _vec3_tmp           = new Float32Array(3);
var _vec3_tmp2          = new Float32Array(3);
var _vec3_tmp3          = new Float32Array(3);
var _quat4_tmp          = new Float32Array(4);
var _angle_limits_tmp   = new Float32Array(2);
var _angle_limits_tmp2  = new Float32Array(2);

/**
 * Callback to be executed when the camera finishes its track animation.
 * See track_to_target() method.
 * @callback track_to_target_cb
 */

/**
 * Callback to be executed when the camera finishes its zoom animation.
 * See track_to_target() method.
 * @callback track_to_target_zoom_cb
 */

/**
 * Smoothly rotate the EYE camera to make it pointing at the specified
 * target (an object or some position). Then smoothly zoom on this target,
 * pause and zoom back.
 * @param {Object} cam_obj Camera object ID
 * @param {(Object|Float32Array)} target Target object or target position
 * @param {Number} rot_speed Rotation speed, radians per second
 * @param {Number} zoom_mult Zoom level value
 * @param {Number} zoom_time Time it takes to zoom on the target, seconds
 * @param {Number} zoom_delay Delay before the camera zooms back, seconds
 * @param {track_to_target_cb} [callback] Finishing callback
 * @param {track_to_target_zoom_cb} [zoom_cb] Zoom callback
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

    var def_dir    = _vec3_tmp2;
    def_dir[0]     = 0;
    def_dir[1]     = -1;
    def_dir[2]     = 0;

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

                m_cam.rotate_eye_camera(obj, delta_x, delta_y);

            } else if (cur_time < zoom_end_time) {

                if (dest_ang_x) {
                    m_cam.rotate_eye_camera(obj, dest_ang_x, dest_ang_y);
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

function init_limited_rotation_ratio(obj, limits, auto_rotate_ratio){
    var phi = m_cam.get_camera_angles(obj, _vec2_tmp)[0];

    var delts = get_delta_to_limits(phi, limits[0], limits[1], _vec2_tmp2);
    return auto_rotate_ratio * Math.min(1, delts[0] / ROTATION_OFFSET, 
            delts[1] / ROTATION_OFFSET);
}

function get_delta_to_limits(angle, limit_from, limit_to, dest) {
    // accurate delta calculation
    var delta_to_min = m_util.angle_wrap_0_2pi(angle - limit_from);
    var delta_to_max = m_util.angle_wrap_0_2pi(limit_to - angle);

    // some precision errors could be near the limits
    if (Math.abs(delta_to_min) < ROTATION_LIMITS_EPS 
            || 2 * Math.PI - Math.abs(delta_to_min) < ROTATION_LIMITS_EPS)
        delta_to_min = 0;
    if (Math.abs(delta_to_max) < ROTATION_LIMITS_EPS 
            || 2 * Math.PI - Math.abs(delta_to_max) < ROTATION_LIMITS_EPS)
        delta_to_max = 0;

    dest[0] = delta_to_min;
    dest[1] = delta_to_max;
    return dest;
}

/**
 * Callback to be executed when auto-rotating is disabled.
 * It is fired when either the user manually rotates the camera,
 * or the auto_rotate() method is executed again.
 * @callback auto_rotate_disabled_cb
 */

/**
 * Switch auto-rotating of the TARGET or HOVER camera around its pivot, or
 * auto-rotating of the EYE camera around itself.
 * When it is called for the first time, auto-rotating is enabled
 * while the next call will disable auto-rotating.
 * @param {Number} auto_rotate_ratio Multiplier for the rotation speed
 * @param {auto_rotate_disabled_cb} [callback] Callback to be executed when auto-rotating is disabled
 */
exports.auto_rotate = function(auto_rotate_ratio, callback) {

    callback = callback || function(){};

    var obj = m_scs.get_active_camera();

    if (m_cam.get_move_style(obj) == m_cam.MS_STATIC) {
        m_print.error("auto_rotate(): wrong camera type");
        return;
    }

    var angle_limits = null;
    var rot_offset = 0;
    var cur_rotate_ratio = 0;

    function update_limited_rotation_params(curr_limits) {
        angle_limits = angle_limits || _angle_limits_tmp;
        angle_limits.set(curr_limits);
        rot_offset = Math.min(ROTATION_OFFSET, 
                (m_util.angle_wrap_0_2pi(angle_limits[1] - angle_limits[0])) / 2);
        cur_rotate_ratio = init_limited_rotation_ratio(obj, 
                angle_limits, auto_rotate_ratio);
    }

    function elapsed_cb(obj, id, pulse) {
        if (pulse == 1) {
            var move_style = m_cam.get_move_style(obj);
            // NOTE: if move_style was changed to STATIC during the autorotation
            if (move_style == m_cam.MS_STATIC)
                disable_cb();
            else if (move_style != m_cam.MS_HOVER_CONTROLS
                    && m_cam.has_horizontal_limits(obj)) {
                var curr_limits = m_cam.get_horizontal_limits(obj, 
                        _angle_limits_tmp2);
                
                if (angle_limits === null || curr_limits[0] != angle_limits[0] 
                        || curr_limits[1] != angle_limits[1])
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
        var delts = get_delta_to_limits(phi, angle_limits[0], angle_limits[1], 
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

        var logic_func = function(s) {return (s[0] && s[2]) || (s[1] && s[2]) || s[3] || s[4]};

        m_ctl.create_sensor_manifold(obj, "DISABLE_AUTO_ROTATE", m_ctl.CT_LEVEL,
                                    [mouse_move_x, mouse_move_y, mouse_down,
                                    touch_move, touch_zoom], logic_func,
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

}
