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
 * Head Mounted Devices add-on.
 * Provides support for HMD/VR devices using {@link https://w3c.github.io/webvr/|WebVR API}.
 * <p>For more info about stereo rendering check out the {@link https://www.blend4web.com/doc/en/stereo_rendering.html|user manual}.
 * @module hmd
 */

b4w.module["hmd"] = function(exports, require) {

var m_cam    = require("camera");
var m_ctl    = require("controls");
var m_input  = require("input");
var m_quat   = require("quat");
var m_scenes = require("scenes");
var m_screen = require("screen");
var m_trans  = require("transform");
var m_util   = require("util");
var m_vec3   = require("vec3");

var _last_cam_quat = m_quat.create();
var _yaw_cam_angle = 0;
var _was_target_camera = false;
var _was_hover_camera = false;
var _was_static_camera = false;

var _vec3_tmp  = m_vec3.create();
var _vec3_tmp2 = m_vec3.create();
var _vec3_tmp3 = m_vec3.create();
var _quat_tmp  = m_quat.create();
var _quat_tmp2 = m_quat.create();
var _quat_tmp3 = m_quat.create();
var _quat_tmp4 = m_quat.create();

var _offset_quat = m_quat.create();
var _offset_pos = m_vec3.create();
var _empty_params = {pivot: m_vec3.create()};

/**
 * HMD behavior enum.
 * @see {@link module:hmd.HMD_NONE_MOUSE_ALL_AXES},
 * {@link module:hmd.HMD_ALL_AXES_MOUSE_NONE},
 * {@link module:hmd.HMD_ROLL_PITCH_MOUSE_YAW},
 * {@link module:hmd.HMD_ALL_AXES_MOUSE_YAW}
 * @typedef {number} HMDBehavior
 */

/**
 * HMD behavior: HMD does not affect camera orientation,
 * mouse controls camera rotation.
 * @const {HMDBehavior} module:hmd.HMD_NONE_MOUSE_ALL_AXES
 */
var HMD_NONE_MOUSE_ALL_AXES = 0;
exports.HMD_NONE_MOUSE_ALL_AXES = HMD_NONE_MOUSE_ALL_AXES;

/**
 * HMD behavior: HMD controls camera rotation,
 * mouse does not affect camera orientation.
 * @const {HMDBehavior} module:hmd.HMD_ALL_AXES_MOUSE_NONE
 */
var HMD_ALL_AXES_MOUSE_NONE = 1;
exports.HMD_ALL_AXES_MOUSE_NONE = HMD_ALL_AXES_MOUSE_NONE;

/**
 * HMD behavior: HMD controls roll and pitch rotation,
 * mouse controls yaw rotation.
 * @const {HMDBehavior} module:hmd.HMD_ROLL_PITCH_MOUSE_YAW
 */
var HMD_ROLL_PITCH_MOUSE_YAW = 2;
exports.HMD_ROLL_PITCH_MOUSE_YAW = HMD_ROLL_PITCH_MOUSE_YAW;

/**
 * HMD behavior: HMD affects camera rotation,
 * mouse affect yaw rotation.
 * @const {HMDBehavior} module:hmd.HMD_ALL_AXES_MOUSE_YAW
 */
var HMD_ALL_AXES_MOUSE_YAW = 3;
exports.HMD_ALL_AXES_MOUSE_YAW = HMD_ALL_AXES_MOUSE_YAW;

/**
 * Enable HMD.
 * @method module:hmd.enable_hmd
 * @param {HMDBehavior} control_type Camera rotation type.
 */
exports.enable_hmd = function(control_type) {
    var sensor = null;
    var device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
    if (device) {
        if (m_input.get_value_param(device, m_input.HMD_WEBVR_TYPE) &
                (m_input.HMD_WEBVR_MOBILE | m_input.HMD_WEBVR_DESKTOP | m_input.HMD_WEBVR1))
            // use state of the WebVR device
            sensor = m_ctl.create_hmd_quat_sensor();
        else
            // use gyroscope state
            sensor = m_ctl.create_gyro_quat_sensor();
        process_hmd(control_type, sensor);
    }
}

/**
 * Check if the browser supports WebVR API or it is a mobile version of the browser.
 * @method module:hmd.check_browser_support
 * @return {boolean} Checking result.
 */
exports.check_browser_support = function() {
    return Boolean(m_input.can_use_device(m_input.DEVICE_HMD));
}

/**
 * Enable VR controllers.
 * @method module:hmd.enable_controllers
 * @param {Object3D} [gamepad_1] Object presenting controller.
 * @param {Object3D} [gamepad_2] Object presenting controller.
 * @example
 * var m_hmd = require("hmd");
 * var m_scenes = require("scenes");
 *
 * var gamepad_1 = m_scenes.get_object_by_name("my_gamepad_1");
 * var gamepad_2 = m_scenes.get_object_by_name("my_gamepad_2");
 * m_hmd.enable_controllers(gamepad_1, gamepad_2);
 */
exports.enable_controllers = function(gamepad_1, gamepad_2) {
    // TODO: add default models for gamepad_1, gamepad_2
    disable_controllers();

    if (!gamepad_1 && !gamepad_2)
        return;

    var gamepad_id = m_input.get_vr_controller_id(0);
    var gm_pos_sensor = m_ctl.create_gamepad_position_sensor(gamepad_id);
    var gm_ori_sensor = m_ctl.create_gamepad_orientation_sensor(gamepad_id);

    var gamepad_id2 = m_input.get_vr_controller_id(1);
    var gm_pos_sensor2 = m_ctl.create_gamepad_position_sensor(gamepad_id2);
    var gm_ori_sensor2 = m_ctl.create_gamepad_orientation_sensor(gamepad_id2);

    function position_cb(obj, id, pulse) {
        if (gamepad_1) {
            var gmpos1 = m_ctl.get_sensor_payload(obj, id, 0);
            var gmori1 = m_ctl.get_sensor_payload(obj, id, 2);

            m_vec3.add(_offset_pos, gmpos1, gmpos1);
            m_trans.set_translation_v(gamepad_1, gmpos1);
            m_trans.set_rotation_v(gamepad_1, gmori1);
        }

        if (gamepad_2) {
            var gmpos2 = m_ctl.get_sensor_payload(obj, id, 1);
            var gmori2 = m_ctl.get_sensor_payload(obj, id, 3);

            m_vec3.add(_offset_pos, gmpos2, gmpos2);
            m_trans.set_translation_v(gamepad_2, gmpos2);
            m_trans.set_rotation_v(gamepad_2, gmori2);
        }
    }
    m_ctl.create_sensor_manifold(null, "VR_CONTROLLERS", m_ctl.CT_CONTINUOUS,
            [gm_pos_sensor, gm_pos_sensor2, gm_ori_sensor, gm_ori_sensor2],
            null, position_cb);
}

/**
 * Disable VR controllers.
 * @method module:hmd.disable_controllers
 * @example
 * var m_hmd = require("hmd");
 *
 * m_hmd.disable_controllers();
 */
exports.disable_controllers = disable_controllers;
function disable_controllers() {
    m_ctl.remove_sensor_manifold(null, "VR_CONTROLLERS");
}

function process_hmd(control_type, sensor) {
    if (!sensor)
        return;

    var cam_obj = m_scenes.get_active_camera();
    if (!cam_obj)
        return;

    m_screen.request_split_screen(function() {
        if (!m_cam.is_eye_camera(cam_obj)) {
            _was_target_camera = m_cam.is_target_camera(cam_obj);
            _was_hover_camera = m_cam.is_hover_camera(cam_obj);
            _was_static_camera = m_cam.is_static_camera(cam_obj);

            m_cam.eye_setup(cam_obj);
        }

        var elapsed = m_ctl.create_elapsed_sensor();
        var pos_sensor = m_ctl.create_hmd_position_sensor();

        _last_cam_quat = m_trans.get_rotation(cam_obj, _last_cam_quat);
        m_ctl.create_sensor_manifold(null, "HMD_ROTATE_CAMERA", m_ctl.CT_CONTINUOUS,
                [elapsed, sensor, pos_sensor], null, move_cam_cb);
    });

    function move_cam_cb(obj, id, pulse) {
        if (pulse > 0) {
            var cam_obj = m_scenes.get_active_camera();
            if (!cam_obj)
                return;

            // NOTE: It is executed every frame.
            // uses _vec3_tmp, _vec3_tmp2, _vec3_tmp3, _quat_tmp, _quat_tmp2
            if (m_cam.is_eye_camera(cam_obj)) {
                var hmd_quat = m_ctl.get_sensor_payload(obj, id, 1);
                var hmd_pos = m_ctl.get_sensor_payload(obj, id, 2);

                var position = m_vec3.add(hmd_pos, _offset_pos, _vec3_tmp);
                m_trans.set_translation_v(cam_obj, position);

                if (hmd_quat) {
                    if (control_type == HMD_ALL_AXES_MOUSE_NONE) {
                        hmd_quat = m_quat.multiply(_offset_quat, hmd_quat, _quat_tmp4);
                        var up_axis = m_vec3.transformQuat(m_util.AXIS_MY, hmd_quat, _vec3_tmp);
                        m_cam.set_vertical_axis(cam_obj, up_axis);
                        m_trans.set_rotation_v(cam_obj, hmd_quat);
                    } else if (control_type == HMD_ROLL_PITCH_MOUSE_YAW ||
                            control_type == HMD_ALL_AXES_MOUSE_YAW) {
                        var cam_quat = m_trans.get_rotation(cam_obj,
                                _quat_tmp2);
                        var inv_cam_quat = m_quat.invert(cam_quat,
                                _quat_tmp2);
                        var diff_cam_quat = m_quat.multiply(_last_cam_quat,
                                inv_cam_quat, _quat_tmp2);

                        var cur_vertical_axis = m_cam.get_vertical_axis(cam_obj,
                                _vec3_tmp);
                        if (Math.abs(cur_vertical_axis[2]) < Math.PI / 4)
                            var first_horiz_vec = m_vec3.cross(cur_vertical_axis,
                                    m_util.AXIS_MY, _vec3_tmp2);
                        else if (Math.abs(cur_vertical_axis[1]) < Math.PI / 4)
                            var first_horiz_vec = m_vec3.cross(cur_vertical_axis,
                                    m_util.AXIS_Z, _vec3_tmp2);

                        m_vec3.normalize(first_horiz_vec, first_horiz_vec);

                        var rotated_first_horiz_vec = m_vec3.transformQuat(
                                first_horiz_vec, diff_cam_quat, _vec3_tmp3);

                        var vertical_coef = m_vec3.dot(cur_vertical_axis,
                                rotated_first_horiz_vec);
                        var second_horiz_vec = m_vec3.scaleAndAdd(rotated_first_horiz_vec,
                                cur_vertical_axis, -vertical_coef, _vec3_tmp3);
                        m_vec3.normalize(second_horiz_vec, second_horiz_vec);

                        var sign_horiz_vec = m_vec3.cross(cur_vertical_axis,
                                first_horiz_vec, _vec3_tmp);
                        var abs_yaw_angle = Math.acos(m_util.clamp(
                                m_vec3.dot(first_horiz_vec, second_horiz_vec),
                                0, 1));
                        var sign_yaw_angle = m_util.sign(m_vec3.dot(
                                second_horiz_vec, sign_horiz_vec));
                        var diff_yaw_cam_angle = abs_yaw_angle * sign_yaw_angle;

                        _yaw_cam_angle += diff_yaw_cam_angle;
                        var yaw_cam_quat = m_quat.setAxisAngle(m_util.AXIS_Z,
                                -_yaw_cam_angle, _quat_tmp2);

                        if (control_type == HMD_ALL_AXES_MOUSE_YAW) {
                            var new_cam_quat = m_quat.multiply(yaw_cam_quat,
                                    hmd_quat, _quat_tmp);
                        } else {
                            var yaw_hmd_quat = m_util.quat_project(hmd_quat, m_util.AXIS_MZ,
                                    m_util.AXIS_Z, m_util.AXIS_Y, _quat_tmp3);
                            var yaw_hmd_inv_quat = m_quat.invert(yaw_hmd_quat, _quat_tmp3);
                            var vertical_hmd_quat = m_quat.multiply(
                                    yaw_hmd_inv_quat, hmd_quat, _quat_tmp3);

                            var new_cam_quat = m_quat.multiply(yaw_cam_quat,
                                    vertical_hmd_quat, _quat_tmp);
                        }
                        var up_axis = m_vec3.transformQuat(m_util.AXIS_MY,
                                new_cam_quat, _vec3_tmp);
                        m_cam.set_vertical_axis(cam_obj, up_axis);

                        m_trans.set_rotation_v(cam_obj, new_cam_quat);
                        m_quat.copy(new_cam_quat, _last_cam_quat);
                    }
                }
            }
        }
    }
}

/**
 * Disable HMD.
 * @method module:hmd.disable_hmd
 */
exports.disable_hmd = function() {
    if (!m_ctl.check_sensor_manifold(null, "HMD_ROTATE_CAMERA"))
        return;

    m_ctl.remove_sensor_manifold(null, "HMD_ROTATE_CAMERA");

    m_screen.exit_split_screen();

    var cam_obj = m_scenes.get_active_camera();
    // TODO: add restoring camera's params
    if (_was_target_camera)
        m_cam.target_setup(cam_obj, _empty_params);
    else if (_was_hover_camera)
        m_cam.hover_setup(cam_obj, _empty_params);
    else if (_was_static_camera)
        m_cam.static_setup(cam_obj, _empty_params);

    // correct up camera (non-vr mode)
    m_cam.set_vertical_axis(cam_obj, m_util.AXIS_Z);
    // TODO: update_transform
    var cam_quat = m_trans.get_rotation(cam_obj, _quat_tmp);
    m_trans.set_rotation_v(cam_obj, cam_quat);
}
/**
 * Set hmd initial rotation quat.
 * @method module:hmd.set_rotate_quat
 * @param {Quat} quat Initial rotation quaternion.
 * @example
 * var m_hmd = require("hmd");
 *
 * m_hmd.set_rotate_quat([0,0,0,1]);
 */
exports.set_rotate_quat = function(quat) {
    m_quat.copy(quat, _offset_quat);
}
/**
 * Get hmd initial rotation quat.
 * @method module:hmd.get_rotate_quat
 * @param {Quat} dest Initial rotation quaternion.
 * @return {Quat} dest.
 * @example
 * var m_hmd = require("hmd");
 * var m_quat = require("quat");
 * var _quat_tmp = m_quat.create();
 *
 * var quat = m_hmd.get_rotate_quat(_quat_tmp);
 */
exports.get_rotate_quat = function(dest) {
    m_quat.copy(_offset_quat, dest);
    return dest;
}
/**
 * Set hmd initial position.
 * @method module:hmd.set_position
 * @param {Vec3} position Initial position.
 * @example
 * var m_hmd = require("hmd");
 *
 * m_hmd.set_position([0,0,0]);
 */
exports.set_position = function(position) {
    m_quat.copy(position, _offset_pos);
}
/**
 * Get hmd initial position.
 * @method module:hmd.get_position
 * @param {Vec3} dest Initial position.
 * @return {Vec3} dest.
 * @example
 * var m_hmd = require("hmd");
 * var m_vec3 = require("vec3");
 * var _vec3_tmp = m_vec3.create();
 *
 * var pos = m_hmd.get_position(_vec3_tmp);
 */
exports.get_position = function(dest) {
    m_quat.copy(_offset_pos, dest);
    return dest;
}

};
