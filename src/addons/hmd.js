/**
 * Copyright (C) 2014-2015 Triumph LLC
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
 * Provides support for HMD devices using WebVR API.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebVR_API
 * @module hmd
 */

b4w.module["hmd"] = function(exports, require) {

var m_cam    = require("camera");
var m_ctl    = require("controls");
var m_cont   = require("container");
var m_quat   = require("quat");
var m_print  = require("print");
var m_scenes = require("scenes");
var m_trans  = require("transform");
var m_util   = require("util");
var m_vec3   = require("vec3");
var m_vec4   = require("vec4");

var _hmd_device = null;
var _sensor_devices = null;
var _last_cam_quat = m_quat.create();
var _yaw_cam_angle = 0;

var _vec3_tmp  = m_vec3.create();
var _vec3_tmp2 = m_vec3.create();
var _vec3_tmp3 = m_vec3.create();
var _vec4_tmp  = m_vec4.create();
var _vec4_tmp2 = m_vec4.create();
var _quat_tmp  = m_quat.create();
var _quat_tmp2 = m_quat.create();
var _quat_tmp3 = m_quat.create();

var _devices_params = {
    "oculus": {
        "distortion_coefs" : [0.22, 0.28],
        "distortion_scale" : 0.66,
        "chromatic_aberration_coefs" : [-0.015, 0.02, 0.025, 0.02]
    },
    "default": {
        "distortion_coefs" : [0.0, 0.0],
        "distortion_scale" : 1.0,
        "chromatic_aberration_coefs" : [0.0, 0.0, 0.0, 0.0]
    }
}

/**
 * The WebVR API representation a head mounted display.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/HMDVRDevice
 * @typedef HMDVRDevice
 * @type {Object}
 */

/**
 * HMD behavior enum.
 * @see {@link module:hmd.HMD_NONE_MOUSE_ALL_AXES},
 * {@link module:hmd.HMD_ALL_AXES_MOUSE_NONE},
 * {@link module:hmd.HMD_ROLL_PITCH_MOUSE_YAW},
 * {@link module:hmd.HMD_ALL_AXES_MOUSE_YAW}
 * @typedef HMDBehavior
 * @type {Number}
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
 * HMD behavior: HMD controls roll and ritch rotation,
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
    // NOTE: navigator.getVRDevices return a promise
    if (navigator.getVRDevices) {
        navigator.getVRDevices().then(function(devices) {
            setup_devices(devices);

            if (_hmd_device)
                process_hmd(control_type);
        });
    }
}

/**
 * Check if the browser supports WebVR API.
 * @method module:hmd.check_browser_support
 * @return {Boolean} Checking result.
 */
exports.check_browser_support = function() {
    return Boolean(navigator.getVRDevices);
}

function setup_devices(devices, control_type) {
    var hmd_devices = devices.filter(function(device) {
        return device instanceof HMDVRDevice;
    });

    if (hmd_devices.length)
        // get first hmd device
        _hmd_device = hmd_devices[0];

    if (_hmd_device) {
        _sensor_devices = devices.filter(function(device) {
            // NOTE: we tested only Oculus
            return device.deviceName.toLowerCase().indexOf("oculus") !== -1 &&
                    device.hardwareUnitId == _hmd_device.hardwareUnitId &&
                    device instanceof PositionSensorVRDevice;
        });
    }
}

/**
 * Get mounted devices.
 * @method module:hmd.get_hmd_device
 * @return {HMDVRDevice} HMD object.
 */
exports.get_hmd_device = get_hmd_device;
function get_hmd_device(devices) {
    return _hmd_device;
}

function get_sensor_orientation(dest) {
    if (_sensor_devices)
        for (var i = 0; i < _sensor_devices.length; i++) {
            var sensor = _sensor_devices[i];
            var state = sensor.getState();
            if (state.orientation) {
                if (!dest)
                    dest = m_quat.create();

                dest[0] = state.orientation["x"];
                dest[1] = state.orientation["y"];
                dest[2] = state.orientation["z"];
                dest[3] = state.orientation["w"];
                return dest;
            }
        }
}

function get_sensor_angular_velocity(dest) {
    if (_sensor_devices)
        for (var i = 0; i < _sensor_devices.length; i++) {
            var sensor = _sensor_devices[i];
            var state = sensor.getState();
            if (state.angularVelocity) {
                if (!dest)
                    dest = m_quat.create();

                dest[0] = state.angularVelocity["x"];
                dest[1] = state.angularVelocity["y"];
                dest[2] = state.angularVelocity["z"];
                dest[3] = state.angularVelocity["w"];

                return dest;
            }
        }
}

function get_sensor_position(dest) {
    if (_sensor_devices)
        for (var i = 0; i < _sensor_devices.length; i++) {
            var sensor = _sensor_devices[i];
            var state = sensor.getState();
            if (state.position) {
                if (!dest)
                    dest = m_vec3.create();

                dest[0] = state.position["x"];
                dest[1] = state.position["y"];
                dest[2] = state.position["z"];
                return dest;
            }
        }
}

function get_eye_distance(eye) {
    if (_hmd_device) {
        var param_left = _hmd_device.getEyeParameters("left");
        var param_right = _hmd_device.getEyeParameters("right");
        return param_right.eyeTranslation["x"] - param_left.eyeTranslation["x"];
    }
}

function get_fov(eye, dest) {
    if (_hmd_device) {
        var param = _hmd_device.getEyeParameters(eye);

        if (param && param.currentFieldOfView) {
            if (!dest)
                dest = m_vec4.create();

            dest[0] = param.currentFieldOfView["upDegrees"];
            dest[1] = param.currentFieldOfView["rightDegrees"];
            dest[2] = param.currentFieldOfView["downDegrees"];
            dest[3] = param.currentFieldOfView["leftDegrees"];

            return dest;
        }
    }
}

/**
 * Reset the sensors, return position and orientation sensors values to zero.
 * @method module:hmd.reset
 */
exports.reset = reset_hmd;
function reset_hmd() {
    if (_sensor_devices)
        for (var i = 0; i < _sensor_devices.length; i++) {
            var sensor = _sensor_devices[i];
            sensor.resetSensor();
        }
}

function process_hmd(control_type) {
    if (!_hmd_device) {
        m_print.warn("Head-mounted display is not found.")
        return;
    }

    var elapsed = m_ctl.create_elapsed_sensor();
    var updated_eye_data = false;
    var move_cam_cb = function(obj, id, pulse) {
        var cam_obj = m_scenes.get_active_camera();

        if (!cam_obj)
            return;

        if (pulse > 0) {
            // NOTE: init part
            if (!updated_eye_data) {
                var hmd_left_fov = get_fov("left", _vec4_tmp);
                var hmd_right_fov = get_fov("right", _vec4_tmp2);
                if (hmd_left_fov && hmd_left_fov)
                    m_cam.set_hmd_fov(cam_obj, hmd_left_fov, hmd_right_fov);

                var eye_distance = get_eye_distance();
                if (eye_distance)
                    m_cam.set_eye_distance(cam_obj, eye_distance);

                var hmd_params = {};
                if (_hmd_device.deviceName.toLowerCase().indexOf("oculus") !== -1)
                    var hmd_name = "oculus";
                else
                    var hmd_name = "default";

                hmd_params.distortion_coefs = [
                        _devices_params[hmd_name]["distortion_coefs"][0],
                        _devices_params[hmd_name]["distortion_coefs"][1]
                ];

                hmd_params.chromatic_aberration_coefs = [
                        _devices_params[hmd_name]["chromatic_aberration_coefs"][0],
                        _devices_params[hmd_name]["chromatic_aberration_coefs"][1],
                        _devices_params[hmd_name]["chromatic_aberration_coefs"][2],
                        _devices_params[hmd_name]["chromatic_aberration_coefs"][3]
                ];

                hmd_params.distortion_scale  = _devices_params[hmd_name]["distortion_scale"];
                // TODO: set distortion_offset
                hmd_params.distortion_offset = 0.0;
                hmd_params.enable_hmd_stereo = true;

                m_scenes.set_hmd_params(hmd_params);

                var canvas_container_elem = m_cont.get_container();
                var ccw = canvas_container_elem.clientWidth;
                var cch = canvas_container_elem.clientHeight;
                m_cont.resize(ccw, cch, true);

                updated_eye_data = true;

                _last_cam_quat = m_trans.get_rotation(cam_obj, _last_cam_quat);
                reset_hmd();
            }

            // NOTE: It is executed every frame.
            // uses _vec3_tmp, _vec3_tmp2, _vec3_tmp3, _quat_tmp, _quat_tmp2
            if (m_cam.is_eye_camera(cam_obj)) {
                if (control_type == HMD_ALL_AXES_MOUSE_NONE) {
                    var hmd_quat = get_sensor_orientation(_quat_tmp);

                    if (hmd_quat) {
                        var quat = m_quat.setAxisAngle(m_util.AXIS_X, Math.PI / 2, _quat_tmp2);
                        m_quat.normalize(quat, quat);
                        hmd_quat = m_quat.multiply(hmd_quat, quat, _quat_tmp);
                        var up_axis = m_vec3.transformQuat(m_util.AXIS_Z, hmd_quat, _vec3_tmp);
                        m_cam.set_vertical_axis(cam_obj, up_axis);
                        m_trans.set_rotation_v(cam_obj, hmd_quat);
                    }
                } else if (control_type == HMD_ROLL_PITCH_MOUSE_YAW ||
                        control_type == HMD_ALL_AXES_MOUSE_YAW) {
                    var hmd_quat = get_sensor_orientation(_quat_tmp);

                    if (hmd_quat) {
                        // NOTE: hmd_quat to WEBGL axis orientation
                        var quat = m_quat.setAxisAngle(m_util.AXIS_X, Math.PI / 2,
                                _quat_tmp2);
                        m_quat.normalize(quat, quat);
                        hmd_quat = m_quat.multiply(hmd_quat, quat, _quat_tmp);

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
                                    m_util.AXIS_Z, _vec3_tmp2);
                        else if (Math.abs(cur_vertical_axis[1]) < Math.PI / 4)
                            var first_horiz_vec = m_vec3.cross(cur_vertical_axis,
                                    m_util.AXIS_Y, _vec3_tmp2);

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
                        var yaw_cam_quat = m_quat.setAxisAngle(m_util.AXIS_Y,
                                -_yaw_cam_angle, _quat_tmp2);

                        if (control_type == HMD_ALL_AXES_MOUSE_YAW) {
                            var new_cam_quat = m_quat.multiply(yaw_cam_quat,
                                    hmd_quat, _quat_tmp);
                        } else {
                            var yaw_hmd_quat = m_util.quat_project(hmd_quat, m_util.AXIS_MY,
                                    m_util.AXIS_Y, m_util.AXIS_MZ, _quat_tmp3);
                            var yaw_hmd_inv_quat = m_quat.invert(yaw_hmd_quat, _quat_tmp3);
                            var vertical_hmd_quat = m_quat.multiply(
                                    yaw_hmd_inv_quat, hmd_quat, _quat_tmp3);

                            var new_cam_quat = m_quat.multiply(yaw_cam_quat,
                                    vertical_hmd_quat, _quat_tmp);
                        }
                        var up_axis = m_vec3.transformQuat(m_util.AXIS_Z,
                                new_cam_quat, _vec3_tmp);
                        m_cam.set_vertical_axis(cam_obj, up_axis);

                        m_trans.set_rotation_v(cam_obj, new_cam_quat);
                        m_quat.copy(new_cam_quat, _last_cam_quat)
                    }
                }
            }
        }
    }
    m_ctl.create_sensor_manifold(null, "HMD_ROTATE_CAMERA", m_ctl.CT_CONTINUOUS,
            [elapsed], null, move_cam_cb);
}

/**
 * Disable HMD.
 * @method module:hmd.disable_hmd
 */
exports.disable_hmd = function() {
    m_ctl.remove_sensor_manifold(null, "HMD_ROTATE_CAMERA");

    // set up non-vr mode
    var hmd_params = {};
    hmd_params.enable_hmd_stereo = false;
    m_scenes.set_hmd_params(hmd_params);

    // resize screen to canvas resolution (non-vr mode)
    var canvas_container_elem = m_cont.get_container();
    var ccw = canvas_container_elem.clientWidth;
    var cch = canvas_container_elem.clientHeight;
    m_cont.resize(ccw, cch, true);

    // correct up camera (non-vr mode)
    var cam_obj = m_scenes.get_active_camera();
    m_cam.set_vertical_axis(cam_obj, m_util.AXIS_Y);

    // TODO: update_transform
    var cam_quat = m_trans.get_rotation(cam_obj, _quat_tmp);
    m_trans.set_rotation_v(cam_obj, cam_quat);
}

};
