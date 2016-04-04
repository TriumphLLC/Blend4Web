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
 * @local DeviceParameterSync
 * @local DeviceParameterAsync
 */

b4w.module["input"] = function(exports, require) {

var m_input   = require("__input");
var m_cam     = require("__camera");
var m_cont    = require("__container");
var m_print   = require("__print");
var m_quat    = require("__quat");
var m_scgraph = require("__scenegraph");
var m_scs     = require("__scenes");
var m_vec4    = require("__vec4");

var _vec4_tmp = m_vec4.create();
var _vec4_tmp2 = m_vec4.create();

/**
 * Type of the names of the synchronous parameter of a device.
 * @typedef {Number} DeviceParameterSync
 */

/**
 * Type of the names of the asynchronous parameter of a device.
 * @typedef {Number} DeviceParameterAsync
 */

/**
 * Parameter of HMD orientation quaternion.
 * @const {DeviceParameterSync} module:input.HMD_ORIENTATION_QUAT
 */
exports.HMD_ORIENTATION_QUAT = m_input.HMD_ORIENTATION_QUAT;

/**
 * Parameter of HMD position.
 * @const {DeviceParameterSync} module:input.HMD_POSITION
 */
exports.HMD_POSITION = m_input.HMD_POSITION;

/**
 * Parameter of the mouse pointer coordinates.
 * @const {DeviceParameterSync | DeviceParameterAsync} module:input.MOUSE_LOCATION
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

var SYNC_PARAMS = {};
SYNC_PARAMS[m_input.DEVICE_HMD] = [m_input.HMD_ORIENTATION_QUAT,
        m_input.HMD_POSITION];
SYNC_PARAMS[m_input.DEVICE_MOUSE] = [m_input.MOUSE_LOCATION];

var ASYNC_PARAMS = {};
ASYNC_PARAMS[m_input.DEVICE_MOUSE] = [m_input.MOUSE_LOCATION,
        m_input.MOUSE_DOWN_WHICH, m_input.MOUSE_UP_WHICH, m_input.MOUSE_WHEEL];
ASYNC_PARAMS[m_input.DEVICE_KEYBOARD] = [m_input.KEYBOARD_UP,
        m_input.KEYBOARD_DOWN];
ASYNC_PARAMS[m_input.DEVICE_TOUCH] = [m_input.TOUCH_START, m_input.TOUCH_MOVE,
        m_input.TOUCH_END];
ASYNC_PARAMS[m_input.DEVICE_GYRO] = [m_input.GYRO_ORIENTATION_QUAT,
        m_input.GYRO_ORIENTATION_ANGLES];

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
 * @param {DeviceType} type Device type.
 * @method module:input.can_use_device
 */
exports.can_use_device = m_input.can_use_device;

/**
 * Get device object by associated device type and DOM element.
 * @param {DeviceType} type Device type.
 * @param {HtmlElement} element HTML element.
 * @method module:input.get_device_by_type_element
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
 */
exports.register_device = function(device) {
    if (device.type != m_input.DEVICE_HMD) {
        m_print.error("register_device is undefined for device.");
        return;
    }

    m_input.register_device(device);
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
 * @param {DeviceParameterSync} param Name of the device vector parameter.
 * @param {Float32Array} dest Destination vector.
 * @returns {Float32Array} Destination vector.
 * @method module:input.ctor
 */
exports.get_vector_param = function(device, param, dest) {
    if (device.type in SYNC_PARAMS &&
            SYNC_PARAMS[device.type].indexOf(param) >= 0)
        return m_input.get_vector_param(device, param, dest);
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
    if (device.type in ASYNC_PARAMS &&
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
    if (device.type in ASYNC_PARAMS &&
            ASYNC_PARAMS[device.type].indexOf(param) >= 0)
        return m_input.detach_param_cb(device, param, cb);
    else
        m_print.error("device hasn't param: ", param);
}

/**
 * Enable "split screen" mode.
 * @method module:input.enable_split_screen
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {Boolean} "Split screen" mode is enabled.
 */
exports.enable_split_screen = function(camobj) {
    var hmd_device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
    if (!hmd_device || !hmd_device.registered)
        return false;
    var hmd_left_fov = m_input.get_vector_param(hmd_device, m_input.HMD_FOV_LEFT, _vec4_tmp);
    var hmd_right_fov = m_input.get_vector_param(hmd_device, m_input.HMD_FOV_RIGHT, _vec4_tmp2);
    if (hmd_left_fov && hmd_left_fov)
        m_cam.set_hmd_fov(camobj, hmd_left_fov, hmd_right_fov);

    var eye_distance = m_input.get_value_param(hmd_device, m_input.HDM_EYE_DISTANCE);
    if (eye_distance)
        m_cam.set_eye_distance(camobj, eye_distance);

    var hmd_params = {};
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

    hmd_params.enable_hmd_stereo = true;
    if (hmd_device.base_line_dist && hmd_device.height_dist)
        hmd_params.base_line_factor = (hmd_device.base_line_dist - hmd_device.bevel_dist) /
                hmd_device.height_dist;
    else
        hmd_params.base_line_factor = 0.5;

    if (hmd_device.inter_lens_dist && hmd_device.width_dist)
        hmd_params.inter_lens_factor = hmd_device.inter_lens_dist /
                hmd_device.width_dist - 0.5;
    else
        hmd_params.inter_lens_factor = 0.0;

    m_scs.set_hmd_params(hmd_params);
    var distortion_scale = (1 + hmd_device.distortion_coefs[0] + hmd_device.distortion_coefs[1]);
    m_scgraph.multiply_size_mult(distortion_scale, distortion_scale);

    var canvas_container_elem = m_cont.get_container();
    var ccw = canvas_container_elem.clientWidth;
    var cch = canvas_container_elem.clientHeight;
    m_cont.resize(ccw, cch, true);

    m_input.reset_device(hmd_device);

    return true;
}

/**
 * Disable "split screen" mode.
 * @method module:input.disable_split_screen
 * @returns {Boolean} "Split screen" mode is disabled.
 */
exports.disable_split_screen = function() {
    var hmd_device = m_input.get_device_by_type_element(m_input.DEVICE_HMD)
    if (!hmd_device || !hmd_device.registered)
        return false;

    // set up non-vr mode
    var hmd_params = {};
    hmd_params.enable_hmd_stereo = false;
    m_scs.set_hmd_params(hmd_params);

    // resize screen to canvas resolution (non-vr mode)
    var canvas_container_elem = m_cont.get_container();
    var ccw = canvas_container_elem.clientWidth;
    var cch = canvas_container_elem.clientHeight;
    m_cont.resize(ccw, cch, true);
    return true;
}

}
