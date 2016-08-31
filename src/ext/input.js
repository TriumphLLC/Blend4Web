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
 * Input device API
 * @module input
 * @local DeviceType
 * @local DeviceVectorParameterSync
 * @local DeviceValueParameterSync
 * @local DeviceParameterAsync
 * @local DeviceHMDType
 * @local DeviceConfig
 */

b4w.module["input"] = function(exports, require) {

var m_input   = require("__input");
var m_cam     = require("__camera");
var m_cfg     = require("__config");
var m_cont    = require("__container");
var m_obj_util= require("__obj_util");
var m_print   = require("__print");
var m_scs     = require("__scenes");
var m_vec4    = require("__vec4");

var _vec4_tmp = m_vec4.create();
var _vec4_tmp2 = m_vec4.create();

var _splited_screen = false;

var cfg_dbg = m_cfg.debug_subs;

/**
 * Type of the names of the synchronous vector parameter of a device.
 * @typedef {Float32Array} DeviceVectorParameterSync
 */

/**
* Type of the names of the synchronous value parameter of a device.
* @typedef {Number} DeviceValueParameterSync
*/

/**
 * Type of the names of the asynchronous parameter of a device.
 * @typedef {Number} DeviceParameterAsync
 */

/**
 * HMD type enum. Value of {@link module:input.HMD_WEBVR_TYPE}.
 * @typedef {Number} DeviceHMDType
 */

/**
 * Type of the names of the device config.
 * @typedef {Number} DeviceConfig
 */

/**
 * Gamepad D-pad up button ID.
 * @const {Number} module:input.GMPD_BUTTON_12
 */
exports.GMPD_BUTTON_12 = m_input.GMPD_BUTTON_12;
/**
 * Gamepad D-pad down button ID.
 * @const {Number} module:input.GMPD_BUTTON_13
 */
exports.GMPD_BUTTON_13 = m_input.GMPD_BUTTON_13;
/**
 * Gamepad D-pad right button ID.
 * @const {Number} module:input.GMPD_BUTTON_15
 */
exports.GMPD_BUTTON_15 = m_input.GMPD_BUTTON_15;
/**
 * Gamepad D-pad left button ID.
 * @const {Number} module:input.GMPD_BUTTON_14
 */
exports.GMPD_BUTTON_14 = m_input.GMPD_BUTTON_14;
/**
 * Gamepad face panel up button ID.
 * @const {Number} module:input.GMPD_BUTTON_3
 */
exports.GMPD_BUTTON_3 = m_input.GMPD_BUTTON_3;
/**
 * Gamepad face panel down button ID.
 * @const {Number} module:input.GMPD_BUTTON_0
 */
exports.GMPD_BUTTON_0 = m_input.GMPD_BUTTON_0;
/**
 * Gamepad face panel right button ID.
 * @const {Number} module:input.GMPD_BUTTON_1
 */
exports.GMPD_BUTTON_1 = m_input.GMPD_BUTTON_1;
/**
 * Gamepad face panel left button ID.
 * @const {Number} module:input.GMPD_BUTTON_2
 */
exports.GMPD_BUTTON_2 = m_input.GMPD_BUTTON_2;
/**
 * Gamepad right top shoulder button ID.
 * @const {Number} module:input.GMPD_BUTTON_5
 */
exports.GMPD_BUTTON_5 = m_input.GMPD_BUTTON_5;
/**
 * Gamepad right bottom shoulder button ID.
 * @const {Number} module:input.GMPD_BUTTON_7
 */
exports.GMPD_BUTTON_7 = m_input.GMPD_BUTTON_7;
/**
 * Gamepad left top shoulder button ID.
 * @const {Number} module:input.GMPD_BUTTON_4
 */
exports.GMPD_BUTTON_4 = m_input.GMPD_BUTTON_4;
/**
 * Gamepad left bottom shoulder button ID.
 * @const {Number} module:input.GMPD_BUTTON_6
 */
exports.GMPD_BUTTON_6 = m_input.GMPD_BUTTON_6;
/**
 * Gamepad select/back button ID.
 * @const {Number} module:input.GMPD_BUTTON_8
 */
exports.GMPD_BUTTON_8 = m_input.GMPD_BUTTON_8;
/**
 * Gamepad start/forward button ID.
 * @const {Number} module:input.GMPD_BUTTON_9
 */
exports.GMPD_BUTTON_9 = m_input.GMPD_BUTTON_9;
/**
 * Gamepad left analog button ID.
 * @const {Number} module:input.GMPD_BUTTON_10
 */
exports.GMPD_BUTTON_10 = m_input.GMPD_BUTTON_10;
/**
 * Gamepad right analog button ID.
 * @const {Number} module:input.GMPD_BUTTON_11
 */
exports.GMPD_BUTTON_11 = m_input.GMPD_BUTTON_11;
/**
 * Gamepad main button ID.
 * @const {Number} module:input.GMPD_BUTTON_16
 */
exports.GMPD_BUTTON_16 = m_input.GMPD_BUTTON_16;
/**
 * Gamepad button.
 * @const {Number} module:input.GMPD_BUTTON_17
 */
exports.GMPD_BUTTON_17 = m_input.GMPD_BUTTON_17;
/**
 * Gamepad button.
 * @const {Number} module:input.GMPD_BUTTON_18
 */
exports.GMPD_BUTTON_18 = m_input.GMPD_BUTTON_18;
/**
 * Gamepad button.
 * @const {Number} module:input.GMPD_BUTTON_19
 */
exports.GMPD_BUTTON_19 = m_input.GMPD_BUTTON_19;
/**
 * Gamepad button.
 * @const {Number} module:input.GMPD_BUTTON_20
 */
exports.GMPD_BUTTON_20 = m_input.GMPD_BUTTON_20;
/**
 * Gamepad button.
 * @const {Number} module:input.GMPD_BUTTON_21
 */
exports.GMPD_BUTTON_21 = m_input.GMPD_BUTTON_21;
/**
 * Gamepad button.
 * @const {Number} module:input.GMPD_BUTTON_22
 */
exports.GMPD_BUTTON_22 = m_input.GMPD_BUTTON_22;
/**
 * Gamepad button.
 * @const {Number} module:input.GMPD_BUTTON_23
 */
exports.GMPD_BUTTON_23 = m_input.GMPD_BUTTON_23;
/**
 * Gamepad button.
 * @const {Number} module:input.GMPD_BUTTON_24
 */
exports.GMPD_BUTTON_24 = m_input.GMPD_BUTTON_24;
/**
 * Gamepad button.
 * @const {Number} module:input.GMPD_BUTTON_25
 */
exports.GMPD_BUTTON_25 = m_input.GMPD_BUTTON_25;
/**
 * Gamepad axis.
 * @const {Number} module:input.GMPD_AXIS_0
 */
exports.GMPD_AXIS_0 = m_input.GMPD_AXIS_0;
/**
 * Gamepad axis.
 * @const {Number} module:input.GMPD_AXIS_1
 */
exports.GMPD_AXIS_1 = m_input.GMPD_AXIS_1;
/**
 * Gamepad axis.
 * @const {Number} module:input.GMPD_AXIS_2
 */
exports.GMPD_AXIS_2 = m_input.GMPD_AXIS_2;
/**
 * Gamepad axis.
 * @const {Number} module:input.GMPD_AXIS_3
 */
exports.GMPD_AXIS_3 = m_input.GMPD_AXIS_3;
/**
 * Gamepad axis.
 * @const {Number} module:input.GMPD_AXIS_4
 */
exports.GMPD_AXIS_4 = m_input.GMPD_AXIS_4;
/**
 * Gamepad axis.
 * @const {Number} module:input.GMPD_AXIS_5
 */
exports.GMPD_AXIS_5 = m_input.GMPD_AXIS_5;
/**
 * Gamepad axis.
 * @const {Number} module:input.GMPD_AXIS_6
 */
exports.GMPD_AXIS_6 = m_input.GMPD_AXIS_6;
/**
 * Gamepad axis.
 * @const {Number} module:input.GMPD_AXIS_7
 */
exports.GMPD_AXIS_7 = m_input.GMPD_AXIS_7;
/**
 * Gamepad axis.
 * @const {Number} module:input.GMPD_AXIS_8
 */
exports.GMPD_AXIS_8 = m_input.GMPD_AXIS_8;
/**
 * Gamepad axis.
 * @const {Number} module:input.GMPD_AXIS_9
 */
exports.GMPD_AXIS_9 = m_input.GMPD_AXIS_9;
/**
 * Gamepad axis.
 * @const {Number} module:input.GMPD_AXIS_10
 */
exports.GMPD_AXIS_10 = m_input.GMPD_AXIS_10;
/**
 * Gamepad axis.
 * @const {Number} module:input.GMPD_AXIS_11
 */
exports.GMPD_AXIS_11 = m_input.GMPD_AXIS_11;

/**
 * Parameter of HMD orientation quaternion.
 * @const {DeviceVectorParameterSync} module:input.HMD_ORIENTATION_QUAT
 */
exports.HMD_ORIENTATION_QUAT = m_input.HMD_ORIENTATION_QUAT;

/**
 * Parameter of HMD position.
 * @const {DeviceVectorParameterSync} module:input.HMD_POSITION
 */
exports.HMD_POSITION = m_input.HMD_POSITION;

/**
 * Parameter of HMD type.
 * @const {DeviceValueParameterSync} module:input.HMD_WEBVR_TYPE
 */
exports.HMD_WEBVR_TYPE = m_input.HMD_WEBVR_TYPE;

/**
 * WebVR (old) desktop HMD
 * @const {DeviceHMDType} module:input.HMD_WEBVR_DESKTOP
 */
exports.HMD_WEBVR_DESKTOP = m_input.HMD_WEBVR_DESKTOP;

/**
 * WebVR (old) mobile HMD
 * @const {DeviceHMDType} module:input.HMD_WEBVR_MOBILE
 */
exports.HMD_WEBVR_MOBILE = m_input.HMD_WEBVR_MOBILE;

/**
 * Non-WebVR HMD
 * @const {DeviceHMDType} module:input.HMD_NON_WEBVR
 */
exports.HMD_NON_WEBVR = m_input.HMD_NON_WEBVR;

/**
 * WebVR API 1.0
 * @const {DeviceHMDType} module:input.HMD_WEBVR1
 */
exports.HMD_WEBVR1 = m_input.HMD_WEBVR1;

/**
 * Parameter of HMD eye distance.
 * @const {DeviceConfig} module:input.HMD_EYE_DISTANCE
 */
var HMD_EYE_DISTANCE = m_input.HMD_EYE_DISTANCE
exports.HMD_EYE_DISTANCE = HMD_EYE_DISTANCE;

/**
 * Parameter of HMD distortion coefficients.
 * @const {DeviceConfig} module:input.HMD_DISTORTION
 */
exports.HMD_DISTORTION = m_input.HMD_DISTORTION;

/**
 * Parameter of HMD baseline distance.
 * @const {DeviceConfig} module:input.HMD_BASELINE_DIST
 */
exports.HMD_BASELINE_DIST = m_input.HMD_BASELINE_DIST;

/**
 * Parameter of HMD screen to lense distance.
 * @const {DeviceConfig} module:input.HMD_SCREEN_LENSE_DIST
 */
exports.HMD_SCREEN_LENSE_DIST = m_input.HMD_SCREEN_LENSE_DIST;

/**
 * Parameter of mobile screen width.
 * @const {DeviceConfig} module:input.HMD_SCREEN_WIDTH
 */
exports.HMD_SCREEN_WIDTH = m_input.HMD_SCREEN_WIDTH;

/**
 * Parameter of mobile screen height.
 * @const {DeviceConfig} module:input.HMD_SCREEN_HEIGHT
 */
exports.HMD_SCREEN_HEIGHT = m_input.HMD_SCREEN_HEIGHT;

/**
 * Parameter of mobile bevel size.
 * @const {DeviceConfig} module:input.HMD_BEVEL_SIZE
 */
exports.HMD_BEVEL_SIZE = m_input.HMD_BEVEL_SIZE;

/**
 * Parameter of the mouse pointer coordinates.
 * @const {DeviceVectorParameterSync | DeviceParameterAsync} module:input.MOUSE_LOCATION
 */
exports.MOUSE_LOCATION = m_input.MOUSE_LOCATION;

/**
 * Parameter of the mouse downed key.
 * @const {DeviceParameterAsync} module:input.MOUSE_DOWN_WHICH
 */
exports.MOUSE_DOWN_WHICH = m_input.MOUSE_DOWN_WHICH;

/**
 * Parameter of the mouse upped key.
 * @const {DeviceParameterAsync} module:input.MOUSE_UP_WHICH
 */
exports.MOUSE_UP_WHICH = m_input.MOUSE_UP_WHICH;

/**
 * Parameter of the vertical scroll amount.
 * @const {DeviceParameterAsync} module:input.MOUSE_WHEEL
 */
exports.MOUSE_WHEEL = m_input.MOUSE_WHEEL;

/**
 * Parameter of the keyboard upped key.
 * @const {DeviceParameterAsync} module:input.KEYBOARD_UP
 */
exports.KEYBOARD_UP = m_input.KEYBOARD_UP;

/**
 * Parameter of the keyboard downed key.
 * @const {DeviceParameterAsync} module:input.KEYBOARD_DOWN
 */
exports.KEYBOARD_DOWN = m_input.KEYBOARD_DOWN;

/**
 * Parameter of started touch point list on the touch surface.
 * @const {DeviceParameterAsync} module:input.TOUCH_START
 */
exports.TOUCH_START = m_input.TOUCH_START;

/**
 * Parameter of moving touch list on the touch surface.
 * @const {DeviceParameterAsync} module:input.TOUCH_MOVE
 */
exports.TOUCH_MOVE = m_input.TOUCH_MOVE;

/**
 * Parameter of ended touch point list on the touch surface.
 * @const {DeviceParameterAsync} module:input.TOUCH_END
 */
exports.TOUCH_END = m_input.TOUCH_END;

/**
 * Parameter of gyroscope orientation quaternion.
 * @const {DeviceParameterAsync} module:input.GYRO_ORIENTATION_QUAT
 */
exports.GYRO_ORIENTATION_QUAT = m_input.GYRO_ORIENTATION_QUAT;

/**
 * Parameter of gyroscope orientation angles.
 * @const {DeviceParameterAsync} module:input.GYRO_ORIENTATION_ANGLES
 */
exports.GYRO_ORIENTATION_ANGLES = m_input.GYRO_ORIENTATION_ANGLES;

var SYNC_VECTOR_PARAMS = {};
SYNC_VECTOR_PARAMS[m_input.DEVICE_HMD] = [m_input.HMD_ORIENTATION_QUAT,
        m_input.HMD_POSITION];
SYNC_VECTOR_PARAMS[m_input.DEVICE_MOUSE] = [m_input.MOUSE_LOCATION];

var SYNC_VALUE_PARAMS = {};
SYNC_VALUE_PARAMS[m_input.DEVICE_HMD] = [m_input.HMD_WEBVR_TYPE];

var ASYNC_PARAMS = {};
ASYNC_PARAMS[m_input.DEVICE_MOUSE] = [m_input.MOUSE_LOCATION,
        m_input.MOUSE_DOWN_WHICH, m_input.MOUSE_UP_WHICH, m_input.MOUSE_WHEEL];
ASYNC_PARAMS[m_input.DEVICE_KEYBOARD] = [m_input.KEYBOARD_UP,
        m_input.KEYBOARD_DOWN];
ASYNC_PARAMS[m_input.DEVICE_TOUCH] = [m_input.TOUCH_START, m_input.TOUCH_MOVE,
        m_input.TOUCH_END];
ASYNC_PARAMS[m_input.DEVICE_GYRO] = [m_input.GYRO_ORIENTATION_QUAT,
        m_input.GYRO_ORIENTATION_ANGLES];

var CONF = {};
CONF[m_input.DEVICE_HMD] = [m_input.HMD_DISTORTION,
        m_input.HMD_EYE_DISTANCE, m_input.HMD_BASELINE_DIST,
        m_input.HMD_SCREEN_LENSE_DIST, m_input.HMD_SCREEN_WIDTH,
        m_input.HMD_SCREEN_HEIGHT, m_input.HMD_BEVEL_SIZE];

/**
 * Device type enum.
 * @typedef {Number} DeviceType
 */

/**
 * Gyroscope device type.
 * @const {DeviceType} module:input.DEVICE_GYRO
 */
exports.DEVICE_GYRO = m_input.DEVICE_GYRO;

/**
 * Head mounted device type.
 * @const {DeviceType} module:input.DEVICE_HMD
 */
exports.DEVICE_HMD = m_input.DEVICE_HMD;

/**
 * Mouse device type.
 * @const {DeviceType} module:input.DEVICE_MOUSE
 */
exports.DEVICE_MOUSE = m_input.DEVICE_MOUSE;

/**
 * Keyboard device type.
 * @const {DeviceType} module:input.DEVICE_KEYBOARD
 */
exports.DEVICE_KEYBOARD = m_input.DEVICE_KEYBOARD;

/**
 * Touch device type.
 * @const {DeviceType} module:input.DEVICE_TOUCH
 */
exports.DEVICE_TOUCH = m_input.DEVICE_TOUCH;

/**
 * Check if the device can be used.
 * @method module:input.can_use_device
 * @param {DeviceType} type Device type.
 * @returns {Boolean} Result of the check
 */
exports.can_use_device = m_input.can_use_device;

/**
 * Get device object by associated device type and DOM element.
 * If device is not available, then return null.
 * @method module:input.get_device_by_type_element
 * @param {DeviceType} type Device type.
 * @param {?HTMLElement} element HTML element to add event listeners to.
 * @returns {?Object} Device object.
 */
exports.get_device_by_type_element = m_input.get_device_by_type_element;

/**
 * Switch triggering of the browser default actions for registered events.
 * @param {Object} device Device object. Use
 * {@link module:input.get_device_by_type_element} to obtain it.
 * @param {Boolean} prevent_default Prevent default flag.
 * @method module:input.switch_prevent_default
 */
exports.switch_prevent_default = function(device, prevent_default) {
    if (device)
        m_input.switch_prevent_default(device, prevent_default);
}

/**
 * Register device. Right now it should be used for DEVICE_HMD.
 * @param {Object} device Device object. Use
 * {@link module:input.get_device_by_type_element} to obtain it.
 * @method module:input.register_device
 * @deprecated Not needed anymore.
 */
exports.register_device = function() {
    m_print.error_once("input.register_device() deprecated");
}

/**
 * Reset device. The device parameters values return to zero.
 * Right now it should be used for DEVICE_HMD.
 * @param {Object} device Device object. Use
 * {@link module:input.get_device_by_type_element} to obtain it.
 * @method module:input.reset_device
 */
exports.reset_device = function(device) {
    if (!device || device.type != m_input.DEVICE_HMD) {
        m_print.error("reset_device is undefined for device.");
        return;
    }

    m_input.reset_device(device);
}

/**
 * Get parameter vector.
 * @param {Object} device Device object. Use
 * {@link module:input.get_device_by_type_element} to obtain it.
 * @param {DeviceVectorParameterSync} param Name of the device vector parameter.
 * @param {Float32Array} dest Destination vector.
 * @returns {Float32Array} Destination vector.
 * @method module:input.get_vector_param
 */
exports.get_vector_param = function(device, param, dest) {
    if (device && device.type in SYNC_VECTOR_PARAMS &&
            SYNC_VECTOR_PARAMS[device.type].indexOf(param) >= 0)
        return m_input.get_vector_param(device, param, dest);
    else
        m_print.error("device hasn't param: ", param);
}

/**
 * Get parameter value.
 * @param {Object} device Device object. Use
 * {@link module:input.get_device_by_type_element} to obtain it.
 * @param {DeviceValueParameterSync} param Name of the device value parameter.
 * @returns {Number|Boolean} Parameter value.
 * @method module:input.get_value_param
 */
exports.get_value_param = function(device, param) {
    if (device && device.type in SYNC_VALUE_PARAMS &&
            SYNC_VALUE_PARAMS[device.type].indexOf(param) >= 0)
        return m_input.get_value_param(device, param);
    else
        m_print.error("device hasn't param: ", param);
}

/**
 * Attach callback to the device parameter. It is called when parameter is changed.
 * @param {Object} device Device object. Use
 * {@link module:input.get_device_by_type_element} to obtain it.
 * @param {DeviceParameterAsync} param Name of the device parameter.
 * @param {Callback} cb Callback.
 * @method module:input.attach_param_cb
 */
exports.attach_param_cb = function(device, param, cb) {
    if (device && device.type in ASYNC_PARAMS &&
            ASYNC_PARAMS[device.type].indexOf(param) >= 0)
        return m_input.attach_param_cb(device, param, cb);
    else
        m_print.error("device hasn't param: ", param);
}

/**
 * Detach callback from the device parameter.
 * @param {Object} device Device object. Use
 * {@link module:input.get_device_by_type_element} to obtain it.
 * @param {DeviceParameterAsync} param Name of the device parameter.
 * @param {Callback} cb Callback.
 * @method module:input.detach_param_cb
 */
exports.detach_param_cb = function(device, param, cb) {
    if (device && device.type in ASYNC_PARAMS &&
            ASYNC_PARAMS[device.type].indexOf(param) >= 0)
        return m_input.detach_param_cb(device, param, cb);
    else
        m_print.error("device hasn't param: ", param);
}

exports.set_config = function(device, config, value) {
    if (device && device.type in CONF &&
            CONF[device.type].indexOf(config) >= 0)
        return m_input.set_config(device, config, value);
    else
        m_print.error("device hasn't config: ", config);
}

exports.request_fullscreen_hmd = function() {
    if (m_scs.check_active()) {
         var cam_obj = m_scs.get_camera(m_scs.get_active());
         if (!cam_obj)
             return;
    } else
        return;

    enable_split_screen(cam_obj);

    var hmd_device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
    if (hmd_device) {
        var webvr_display = hmd_device.webvr_display;
        // TODO: add "&& !webvr_display.isPresenting" to "if" (optimization).
        // Right now webvr_display.isPresenting is allways "true" after
        // first requestPresent.
        if (webvr_display) {
            var capabilities = webvr_display.capabilities;
            if (!capabilities.canPresent)
                m_print.error("HMD fullscreen request failed.");
            else {
                var canvas = m_cont.get_canvas();
                webvr_display.requestPresent([{source: canvas}]).then(function () {
                    // TODO: uncomment code
                    // There is strange behavior Samsung Internet on GearVR

                    // var left_eye = webvr_display.getEyeParameters("left");
                    // var right_eye = webvr_display.getEyeParameters("right");
                    //
                    // m_cont.resize(
                    //         Math.max(left_eye.renderWidth, right_eye.renderWidth) * 2,
                    //         Math.max(left_eye.renderHeight, right_eye.renderHeight));
                }, function () {
                    m_print.error("HMD fullscreen request failed.");
                });
            }
        }
    }
}

/**
 * Enable "split screen" mode.
 * @method module:input.enable_split_screen
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {Boolean} "Split screen" mode is enabled.
 */
exports.enable_split_screen = enable_split_screen;
function enable_split_screen(camobj) {
    var hmd_device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
    if (!hmd_device || !hmd_device.registered)
        return false;

    if (_splited_screen)
        return true;

    var hmd_left_fov = m_input.get_vector_param(hmd_device, m_input.HMD_FOV_LEFT, _vec4_tmp);
    var hmd_right_fov = m_input.get_vector_param(hmd_device, m_input.HMD_FOV_RIGHT, _vec4_tmp2);
    m_cam.set_hmd_fov(camobj, hmd_left_fov, hmd_right_fov);

    var eye_distance = m_input.get_value_param(hmd_device, HMD_EYE_DISTANCE);
    if (eye_distance) {
        var active_scene = m_scs.get_active();
        var cam_scene_data = m_obj_util.get_scene_data(camobj, active_scene);
        var cameras = cam_scene_data.cameras;
        m_cam.set_eye_distance(cameras, eye_distance);
    }

    var hmd_params = {};
    hmd_params.base_line_factor = 0.5;
    hmd_params.inter_lens_factor = 0.5;
    hmd_params.enable_hmd_stereo = true;
    if (m_input.get_value_param(m_input.HMD_WEBVR_TYPE) !== m_input.HMD_WEBVR1) {
        hmd_params.distortion_coefs = [
            hmd_device.distortion_coefs[0],
            hmd_device.distortion_coefs[1]
        ];
        hmd_params.chromatic_aberration_coefs = [
            hmd_device.chromatic_aberration_coefs[0],
            hmd_device.chromatic_aberration_coefs[1],
            hmd_device.chromatic_aberration_coefs[2],
            hmd_device.chromatic_aberration_coefs[3]
        ];
        if (!hmd_device.webvr_hmd_device)
            if (hmd_device.base_line_dist && hmd_device.height_dist && hmd_device.bevel_size)
                hmd_params.base_line_factor = (hmd_device.base_line_dist - hmd_device.bevel_size) /
                        hmd_device.height_dist;
            else if (!hmd_device.bevel_size)
                hmd_params.base_line_factor = hmd_device.base_line_dist / hmd_device.height_dist;
        if (hmd_device.inter_lens_dist && hmd_device.width_dist && !hmd_device.webvr_hmd_device)
            hmd_params.inter_lens_factor = hmd_device.inter_lens_dist /
                    hmd_device.width_dist;

        // NOTE: prevent crash in case of difference of slink's dimensions.
        // For example: "debug" slink ~ 0.5 X 1.0,
        //              "origin" slink ~ distortion_scale * 0.5 X distortion_scale * 1.0
        if (!cfg_dbg.enabled) {
            var distortion_scale = (1 + hmd_device.distortion_coefs[0] + hmd_device.distortion_coefs[1]);
            m_scs.multiply_size_mult(distortion_scale, distortion_scale);
        }
    }
    m_scs.set_hmd_params(hmd_params);

    m_cont.resize_to_container(true);

    m_input.reset_device(hmd_device);

    _splited_screen = true;
    return true;
}

/**
 * Disable "split screen" mode.
 * @method module:input.disable_split_screen
 * @returns {Boolean} "Split screen" mode is disabled.
 */
exports.disable_split_screen = function() {
    var hmd_device = m_input.get_device_by_type_element(m_input.DEVICE_HMD)
    if (!_splited_screen && (!hmd_device || !hmd_device.registered))
        return false;

    // set up non-vr mode
    var hmd_params = {};
    hmd_params.enable_hmd_stereo = false;
    m_scs.set_hmd_params(hmd_params);

    var distortion_scale = 1 / (1 + hmd_device.distortion_coefs[0] + hmd_device.distortion_coefs[1]);
    m_scs.multiply_size_mult(distortion_scale, distortion_scale);
    // resize screen to canvas resolution (non-vr mode)
    m_cont.resize_to_container(true);
    return true;
}
/**
 * Set gamepad button key value.
 * @method module:input.set_gamepad_key
 * @param {Number} gamepad_id Connected gamepad number.
 * @param {Number} btn Button or axis identifier.
 * @param {Number} key Button key value.
 */
exports.set_gamepad_key = function(gamepad_id, btn, key) {
    var gmps_num = check_enable_gamepad_indices().length;

    switch(gamepad_id) {
    case 0:
        var type = m_input.DEVICE_GAMEPAD0;
        break;
    case 1:
        var type = m_input.DEVICE_GAMEPAD1;
        break;
    case 2:
        var type = m_input.DEVICE_GAMEPAD2;
        break;
    case 3:
        var type = m_input.DEVICE_GAMEPAD3;
        break;
    default:
        var type = m_input.DEVICE_GAMEPAD0;
    }
    var device = m_input.get_device_by_type_element(type);
    m_input.set_config(device, btn, key);
};
/**
 * Get pressed button key value.
 * @method module:input.get_pressed_gmpd_btn
 * @param {Number} gamepad_id Gamepad identifier (Connected device number 0-3).
 * @returns {Number} Pressed button key value.
 */
exports.get_pressed_gmpd_btn = m_input.get_pressed_gmpd_btn;
/**
 * Get moved axis key value.
 * @method module:input.get_moved_gmpd_axis
 * @param {Number} gamepad_id Gamepad identifier (Connected device number 0-3).
 * @returns {Number} Moved axis key value.
 */
exports.get_moved_gmpd_axis = m_input.get_moved_gmpd_axis;
/**
 * Check available gamepads indices.
 * @method module:input.check_enable_gamepad_indices
 * @returns {Array} Numeric array with indices
 * @cc_externs getGamepads webkitGetGamepads
 */
exports.check_enable_gamepad_indices = check_enable_gamepad_indices;
function check_enable_gamepad_indices() {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() :
            (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
    var indices = [];
    for (var i = 0; i < gamepads.length; i++)
        if (gamepads[i])
            indices.push(i);
    return indices;
}
}
