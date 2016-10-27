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
 * Input devices internal API.
 *
 * @name input
 * @namespace
 * @exports exports as input
 */
b4w.module["__input"] = function(exports, require) {

var m_compat = require("__compat");
var m_cont  = require("__container");
var m_cfg   = require("__config");
var m_print = require("__print");
var m_quat  = require("__quat");
var m_util  = require("__util");
var m_vec3  = require("__vec3");
var m_vec4  = require("__vec4");

var cfg_def = m_cfg.defaults;
var cfg_hmdp = m_cfg.hmd_params;

var DEVICE_GYRO = 10;
var DEVICE_HMD = 20;
var DEVICE_MOUSE = 30;
var DEVICE_KEYBOARD = 40;
var DEVICE_TOUCH = 50;
var DEVICE_GAMEPAD0 = 60;
var DEVICE_GAMEPAD1 = 70;
var DEVICE_GAMEPAD2 = 80;
var DEVICE_GAMEPAD3 = 90;

exports.DEVICE_GYRO = DEVICE_GYRO;
exports.DEVICE_HMD = DEVICE_HMD;
exports.DEVICE_MOUSE = DEVICE_MOUSE;
exports.DEVICE_KEYBOARD = DEVICE_KEYBOARD;
exports.DEVICE_TOUCH = DEVICE_TOUCH;
exports.DEVICE_GAMEPAD0 = DEVICE_GAMEPAD0;
exports.DEVICE_GAMEPAD1 = DEVICE_GAMEPAD1;
exports.DEVICE_GAMEPAD2 = DEVICE_GAMEPAD2;
exports.DEVICE_GAMEPAD3 = DEVICE_GAMEPAD3;

var HMD_WEBVR_DESKTOP = 0;
var HMD_WEBVR_MOBILE = 1;
var HMD_NON_WEBVR = 2;
var HMD_WEBVR1 = 3;

exports.HMD_WEBVR_DESKTOP = HMD_WEBVR_DESKTOP;
exports.HMD_WEBVR_MOBILE = HMD_WEBVR_MOBILE;
exports.HMD_NON_WEBVR = HMD_NON_WEBVR;
exports.HMD_WEBVR1 = HMD_WEBVR1;

var HMD_WEBVR_TYPE = 0;
var HMD_ORIENTATION_QUAT = 10;
var HMD_POSITION = 20;
var HMD_FOV_LEFT = 21;
var HMD_FOV_RIGHT = 22;
var HMD_EYE_DISTANCE = 23;
var HMD_DISTORTION = 24;
var HMD_BASELINE_DIST = 25;
var HMD_SCREEN_LENSE_DIST = 26;
var HMD_SCREEN_WIDTH = 27;
var HMD_SCREEN_HEIGHT = 28;
var HMD_BEVEL_SIZE = 29;
var MOUSE_LOCATION = 30;
var MOUSE_DOWN_WHICH = 40;
var MOUSE_UP_WHICH = 50;
var MOUSE_WHEEL = 60;
var KEYBOARD_UP = 70;
var KEYBOARD_DOWN = 80;
var KEYBOARD_DOWN_MODIFIED = 81;
var TOUCH_START = 90;
var TOUCH_MOVE = 100;
var TOUCH_END = 110;
var GYRO_ORIENTATION_QUAT = 120;
var GYRO_ORIENTATION_ANGLES = 130;
var DEVICE_ORIENTATION = 131;

exports.HMD_WEBVR_TYPE = HMD_WEBVR_TYPE;
exports.HMD_ORIENTATION_QUAT = HMD_ORIENTATION_QUAT;
exports.HMD_POSITION = HMD_POSITION;
exports.HMD_FOV_LEFT = HMD_FOV_LEFT;
exports.HMD_FOV_RIGHT = HMD_FOV_RIGHT;
exports.HMD_EYE_DISTANCE = HMD_EYE_DISTANCE;
exports.HMD_DISTORTION = HMD_DISTORTION;
exports.HMD_BASELINE_DIST = HMD_BASELINE_DIST;
exports.HMD_SCREEN_LENSE_DIST = HMD_SCREEN_LENSE_DIST;
exports.HMD_SCREEN_WIDTH = HMD_SCREEN_WIDTH;
exports.HMD_SCREEN_HEIGHT = HMD_SCREEN_HEIGHT;
exports.HMD_BEVEL_SIZE = HMD_BEVEL_SIZE;

exports.MOUSE_LOCATION = MOUSE_LOCATION;
exports.MOUSE_DOWN_WHICH = MOUSE_DOWN_WHICH;
exports.MOUSE_UP_WHICH = MOUSE_UP_WHICH;
exports.MOUSE_WHEEL = MOUSE_WHEEL;
exports.KEYBOARD_UP = KEYBOARD_UP;
exports.KEYBOARD_DOWN = KEYBOARD_DOWN;
exports.KEYBOARD_DOWN_MODIFIED = KEYBOARD_DOWN_MODIFIED;
exports.TOUCH_START = TOUCH_START;
exports.TOUCH_MOVE = TOUCH_MOVE;
exports.TOUCH_END = TOUCH_END;
exports.GYRO_ORIENTATION_QUAT = GYRO_ORIENTATION_QUAT;
exports.GYRO_ORIENTATION_ANGLES = GYRO_ORIENTATION_ANGLES;

exports.GMPD_BUTTON_0 = 0;
exports.GMPD_BUTTON_1 = 1;
exports.GMPD_BUTTON_2 = 2;
exports.GMPD_BUTTON_3 = 3;
exports.GMPD_BUTTON_4 = 4;
exports.GMPD_BUTTON_5 = 5;
exports.GMPD_BUTTON_6 = 6;
exports.GMPD_BUTTON_7 = 7;
exports.GMPD_BUTTON_8 = 8;
exports.GMPD_BUTTON_9 = 9;
exports.GMPD_BUTTON_10 = 10;
exports.GMPD_BUTTON_11 = 11;
exports.GMPD_BUTTON_12 = 12;
exports.GMPD_BUTTON_13 = 13;
exports.GMPD_BUTTON_14 = 14;
exports.GMPD_BUTTON_15 = 15;
exports.GMPD_BUTTON_16 = 16;
exports.GMPD_BUTTON_17 = 17;
exports.GMPD_BUTTON_18 = 18;
exports.GMPD_BUTTON_19 = 19;
exports.GMPD_BUTTON_20 = 20;
exports.GMPD_BUTTON_21 = 21;
exports.GMPD_BUTTON_22 = 22;
exports.GMPD_BUTTON_23 = 23;
exports.GMPD_BUTTON_24 = 24;
exports.GMPD_BUTTON_25 = 25;

exports.GMPD_AXIS_0 = 26;
exports.GMPD_AXIS_1 = 27;
exports.GMPD_AXIS_2 = 28;
exports.GMPD_AXIS_3 = 29;
exports.GMPD_AXIS_4 = 30;
exports.GMPD_AXIS_5 = 31;
exports.GMPD_AXIS_6 = 32;
exports.GMPD_AXIS_7 = 33;
exports.GMPD_AXIS_8 = 34;
exports.GMPD_AXIS_9 = 35;
exports.GMPD_AXIS_10 = 36;
exports.GMPD_AXIS_11 = 37;

var GMPD_AXIS_OFFSET = 26;
var HMD_UPDATING_DELAY = 1;

var _quat_tmp = m_quat.create();
var _quat_tmp2 = m_quat.create();
var _vec3_tmp = m_vec3.create();

var _last_updating_hmd_time = -Infinity;
// NOTE: prevent freez with calling navigator.getVRDevices
var _is_webvr_devices_requested = false;

// callbacks buffers
var _location = new Float32Array(2);
var _trans = m_vec3.create();
var _angles = m_vec3.create();
var _quat = m_quat.create();

var _exist_touch = "ontouchstart" in document.documentElement;

var _devices = [];
/**
 * add:
 *      "global" variable:
 *          var TYPE_[device_name] = [freed_number];
 *          exports.TYPE_[device_name] = TYPE_[device_name];
 *      into function:
 *          init_device:
 *              var device = { ...
 *                  [need_field]: [init_value]
 *              ... }
 *          update:
 *              case TYPE_[device_name]:
 *                  [every frame updating logic]
 *          reset_device:
 *              case TYPE_[device_name]:
 *                  [semantic reset device state]
 *      some stuff to functions:
 *          hardware data:
 *              attach_param_cb
 *              detach_param_cb
 *              get_value_param/get_vector_param
 *          users config:
 *              set_config/get_config
 */

exports.can_use_device = can_use_device;
function can_use_device(type) {
    var is_mobile = m_compat.detect_mobile();
    if (type == DEVICE_HMD && !navigator.getVRDevices &&
            !navigator.getVRDisplays && !is_mobile || type == DEVICE_GYRO &&
            (!is_mobile || !window.DeviceOrientationEvent))
        return false;
    else
        return true;
}

function init_device(type, element) {
    if (!can_use_device(type))
        return null;

    var device = {
        type: type,

        // Is device registered for listening statement changes?
        registered: false,

        // gyro callbacks
        orientation_quat_cb_list: [],
        orientation_angles_cb_list: [],

        // mouse callbacks
        mouse_down_which_cb_list: [],
        mouse_location_cb_list: [],
        mouse_up_which_cb_list: [],
        mouse_wheel_cb_list: [],

        // keyboard callbacks
        keyboard_down_cb_list: [],
        keyboard_down_mod_cb_list: [],
        keyboard_up_cb_list: [],

        // touch callbacks
        touch_start_cb_list: [],
        touch_move_cb_list: [],
        touch_end_cb_list: [],

        element: element,
        prevent_default: true,
        registered_event_listeners: [],

        mouse_location: new Float32Array(2),
        mouse_which: 0,

        // HMD properties
        distortion_coefs           : new Float32Array(2),
        chromatic_aberration_coefs : new Float32Array(4),
        // WebVR properties
        webvr_hmd_device: null,
        webvr_sensor_devices: null,
        // WebVR 1.0 properties
        webvr_display: null,
        orientation: m_quat.create(),
        position: m_vec3.create(),

        // non-WebVR HMD properties
        fov_left                   : new Float32Array(4),
        fov_right                  : new Float32Array(4),
        inter_lens_dist            : 0.0,
        base_line_dist             : 0.0,
        screen_to_lens_dist        : 0.0,

        // mobile properties
        width_dist                 : 0.0,
        height_dist                : 0.0,
        bevel_size                 : 0.0,

        // gamepad properties
        gamepad_btns               : [],
        gamepad_axes               : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        gamepad_prev_axes          : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        gamepad_mapping            : []

    };

    // default value
    device.fov_left[0] = device.fov_left[1] = device.fov_left[2] = device.fov_left[3] = 45;
    device.fov_right[0] = device.fov_right[1] = device.fov_right[2] = device.fov_right[3] = 45;

    if (type == DEVICE_MOUSE || type == DEVICE_KEYBOARD || type == DEVICE_TOUCH) {
        device.registered = Boolean(element);
        if (type == DEVICE_TOUCH)
            // HACK: fix touch events issue on some mobile devices
            document.addEventListener("touchstart", function(){});
        else if (type == DEVICE_KEYBOARD)
            device.prevent_default = false;
    } else if (type == DEVICE_GYRO) {
        device.registered = true;
    } else if (type == DEVICE_HMD) {
        if (navigator.getVRDisplays) {
            // NOTE: don't do distortion correction, it will be done by browser
        } else if (navigator.getVRDevices && !cfg_def.is_mobile_device)
            setup_distortion_coef(device, cfg_hmdp["webvr"]);
        else {
            setup_nonwebvr_hmd_device(device);
            device.registered = true;
        }
    }
    return device;
}

exports.get_device_by_type_element = get_device_by_type_element;
function get_device_by_type_element(type, element) {
    if (type == DEVICE_GYRO || type == DEVICE_HMD)
        element = window;
    else if (!element)
        if (type == DEVICE_KEYBOARD)
            element = document;
        else
            element = m_cont.get_container();

    for (var i = 0; i < _devices.length; i++)
        if (_devices[i].type == type && _devices[i].element == element)
            return _devices[i];

    var device = init_device(type, element);

    if (type == DEVICE_GAMEPAD0 || type == DEVICE_GAMEPAD1 ||
            type == DEVICE_GAMEPAD2 || type == DEVICE_GAMEPAD3)
        set_gamepad_mapping(device);

    if (device)
        _devices.push(device);
    return device;
}

function set_gamepad_mapping(device) {
    device.gamepad_mapping.push(exports.GMPD_BUTTON_0, exports.GMPD_BUTTON_1,
            exports.GMPD_BUTTON_2, exports.GMPD_BUTTON_3, exports.GMPD_BUTTON_4,
            exports.GMPD_BUTTON_5, exports.GMPD_BUTTON_6, exports.GMPD_BUTTON_7,
            exports.GMPD_BUTTON_8, exports.GMPD_BUTTON_9, exports.GMPD_BUTTON_10,
            exports.GMPD_BUTTON_11, exports.GMPD_BUTTON_12, exports.GMPD_BUTTON_13,
            exports.GMPD_BUTTON_14, exports.GMPD_BUTTON_15, exports.GMPD_BUTTON_16,
            exports.GMPD_BUTTON_17, exports.GMPD_BUTTON_18, exports.GMPD_BUTTON_19,
            exports.GMPD_BUTTON_20, exports.GMPD_BUTTON_21, exports.GMPD_BUTTON_22,
            exports.GMPD_BUTTON_23, exports.GMPD_BUTTON_24, exports.GMPD_BUTTON_25,
            exports.GMPD_AXIS_0, exports.GMPD_AXIS_1, exports.GMPD_AXIS_2,
            exports.GMPD_AXIS_3, exports.GMPD_AXIS_4, exports.GMPD_AXIS_5,
            exports.GMPD_AXIS_6, exports.GMPD_AXIS_7, exports.GMPD_AXIS_8,
            exports.GMPD_AXIS_9, exports.GMPD_AXIS_10, exports.GMPD_AXIS_11);
}

function get_devices_by_element(element) {
    var devices = [];
    for (var i = 0; i < _devices.length; i++)
        if (_devices[i].element == element)
            devices.push(_devices[i]);
    return devices;
}

exports.switch_prevent_default = function(device, prevent_default) {
    device.prevent_default = prevent_default;
}

function setup_nonwebvr_hmd_device(device) {
    var device_params = cfg_hmdp["nonwebvr"];
    device.width_dist = device_params.width_dist;
    device.height_dist = device_params.height_dist;
    device.bevel_size = device_params.bevel_size;

    setup_distortion_coef(device, device_params);

    device.inter_lens_dist = device_params.inter_lens_dist;
    device.base_line_dist = device_params.base_line_dist;
    device.screen_to_lens_dist = device_params.screen_to_lens_dist;

    update_nonwebvr_fov(device);
}

function setup_distortion_coef(device, device_params) {
    device.distortion_coefs[0] = device_params.distortion_coefs[0],
    device.distortion_coefs[1] = device_params.distortion_coefs[1];

    device.chromatic_aberration_coefs[0] = device_params.chromatic_aberration_coefs[0];
    device.chromatic_aberration_coefs[1] = device_params.chromatic_aberration_coefs[1];
    device.chromatic_aberration_coefs[2] = device_params.chromatic_aberration_coefs[2];
    device.chromatic_aberration_coefs[3] = device_params.chromatic_aberration_coefs[3];
}

function get_distort_fact_radius(distortion_coefs, radius) {
    var rsq = radius * radius;
    return radius * (1 + distortion_coefs[0] * rsq + distortion_coefs[1] * rsq * rsq);
}

function update_nonwebvr_fov(device) {
    var bottom_dist = device.base_line_dist - device.bevel_size;
    var top_dist    = device.height_dist - bottom_dist;
    var inner_dist  = device.inter_lens_dist / 2;
    var outer_dist  = (device.width_dist - device.inter_lens_dist) / 2;
    var distor_coef = device.distortion_coefs;

    var bottom_tang = get_distort_fact_radius(distor_coef,
            bottom_dist / device.screen_to_lens_dist);
    var bottom_angle = m_util.rad_to_deg(Math.atan(bottom_tang));
    var top_tang = get_distort_fact_radius(distor_coef,
            top_dist / device.screen_to_lens_dist);
    var top_angle = m_util.rad_to_deg(Math.atan(top_tang));
    var inner_tang = get_distort_fact_radius(distor_coef,
            inner_dist / device.screen_to_lens_dist);
    var inner_angle = m_util.rad_to_deg(Math.atan(inner_tang));
    var outer_tang = get_distort_fact_radius(distor_coef,
            outer_dist / device.screen_to_lens_dist);
    var outer_angle = m_util.rad_to_deg(Math.atan(outer_tang));

    // NOTE: 60...I don't know why
    if (top_angle)
        device.fov_left[0] = device.fov_right[0] = Math.min(top_angle, 60);
    if (inner_angle)
        device.fov_left[1] = device.fov_right[3] = Math.min(inner_angle, 60);
    if (bottom_angle)
        device.fov_left[2] = device.fov_right[2] = Math.min(bottom_angle, 60);
    if (outer_angle)
        device.fov_left[3] = device.fov_right[1] = Math.min(outer_angle, 60);
}

function setup_webvr_devices(device, webvr_devices) {
    var webvr_hmd_devices = webvr_devices.filter(function(device) {
        return device instanceof HMDVRDevice;
    });

    var webvr_hmd_device = null;
    if (webvr_hmd_devices.length) {
        // get first hmd device
        webvr_hmd_device = webvr_hmd_devices[0];
    }

    var webvr_sensor_devices = null;
    if (webvr_hmd_device) {
        webvr_sensor_devices = webvr_devices.filter(function(webvr_device) {
            return webvr_device.deviceName.toLowerCase().indexOf("oculus") !== -1 &&
                    webvr_device.hardwareUnitId == webvr_hmd_device.hardwareUnitId &&
                    webvr_device instanceof PositionSensorVRDevice;
        });
    }

    device.webvr_hmd_device = webvr_hmd_device;
    device.webvr_sensor_devices = webvr_sensor_devices;
}

exports.reset_device = reset_device;
function reset_device(device) {
    switch (device.type) {
    case DEVICE_HMD:
        if (device.registered)
            if (device.webvr_display)
                device.webvr_display.resetPose();
            else if (device.webvr_sensor_devices)
                for (var i = 0; i < device.webvr_sensor_devices.length; i++) {
                    var webvr_device = device.webvr_sensor_devices[i];
                    webvr_device.resetSensor();
                }
        break;
    default:
        m_print.error("reset_device() is undefined for device: ", device.type);
        return;
    }
}

function get_fov(device, eye, dest) {
    switch (device.type) {
    case DEVICE_HMD:
        var webvr_display = device.webvr_display || device.webvr_hmd_device;
        if (webvr_display) {
            var param = webvr_display.getEyeParameters(eye);
            var fov = param.fieldOfView || param.currentFieldOfView
            var distor_coef = device.distortion_coefs;
            var bottom_tang = get_distort_fact_radius(distor_coef,
                    Math.tan(m_util.deg_to_rad(fov["downDegrees"])));
            var bottom_angle = m_util.rad_to_deg(Math.atan(bottom_tang));
            var top_tang = get_distort_fact_radius(distor_coef,
                    Math.tan(m_util.deg_to_rad(fov["upDegrees"])));
            var top_angle = m_util.rad_to_deg(Math.atan(top_tang));
            var left_tang = get_distort_fact_radius(distor_coef,
                    Math.tan(m_util.deg_to_rad(fov["leftDegrees"])));
            var left_angle = m_util.rad_to_deg(Math.atan(left_tang));
            var right_tang = get_distort_fact_radius(distor_coef,
                    Math.tan(m_util.deg_to_rad(fov["rightDegrees"])));
            var right_angle = m_util.rad_to_deg(Math.atan(right_tang));

            // TODO: check Oculus FOV
            dest[0] = fov["upDegrees"];
            dest[1] = fov["rightDegrees"];
            dest[2] = fov["downDegrees"];
            dest[3] = fov["leftDegrees"];
        } else {
            if (eye == "left")
                var fov = device.fov_left;
            else
                var fov = device.fov_right;

            m_vec4.copy(fov, dest);
        }
        break;
    default:
        m_print.error("fov is undefined for device: ", device.type);
        break;
    }

    return dest;
}

//==============================================================================
//                        sync:  get_value_param
//                               get_vector_param
//                        async: attach_param_cb
//                               detach_param_cb
//==============================================================================

exports.get_vector_param = function(device, param, dest) {
    switch(param) {
    case HMD_ORIENTATION_QUAT:
        return get_orientation_quat(device, dest);
    case HMD_POSITION:
        return get_position(device, dest);
    case HMD_FOV_LEFT:
        return get_fov(device, "left", dest);
    case HMD_FOV_RIGHT:
        return get_fov(device, "right", dest);
    case MOUSE_LOCATION:
        dest[0] = device.mouse_location[0];
        dest[1] = device.mouse_location[1];
        return dest;
    }
}

exports.get_value_param = get_value_param;
function get_value_param(device, param) {
    switch(param) {
    case HMD_WEBVR_TYPE:
        if (navigator.getVRDisplays)
            return HMD_WEBVR1;
        else if (navigator.getVRDevices)
            if (cfg_def.is_mobile_device)
                return HMD_WEBVR_MOBILE;
            else
                return HMD_WEBVR_DESKTOP;
        return HMD_NON_WEBVR;
    case HMD_EYE_DISTANCE:
        var webvr_display = device.webvr_display || device.webvr_hmd_device;
        if (webvr_display) {
            var param_left = webvr_display.getEyeParameters("left");
            var param_right = webvr_display.getEyeParameters("right");
            if (device.webvr_display) {
                // NOTE: using WebVR 1.0
                return param_right["offset"][0] - param_left["offset"][0];
            } else {
                // NOTE: using WebVR
                return param_right.eyeTranslation["x"] - param_left.eyeTranslation["x"];
            }
        } else
            return device.inter_lens_dist;
    }
}

exports.set_config = function(device, config, value) {
    switch(device.type) {
    case DEVICE_HMD:
        if (get_value_param(device, HMD_WEBVR_TYPE) === HMD_WEBVR1)
            break;
        switch(config) {
        case HMD_DISTORTION:
            device.distortion_coefs[0] = value[0];
            device.distortion_coefs[1] = value[1];
            break;
        case HMD_EYE_DISTANCE:
            device.inter_lens_dist = value;
            update_nonwebvr_fov(device);
            break;
        case HMD_BASELINE_DIST:
            device.base_line_dist = value;
            update_nonwebvr_fov(device);
            break;
        case HMD_SCREEN_LENSE_DIST:
            device.screen_to_lens_dist = value;
            update_nonwebvr_fov(device);
            break;
        case HMD_SCREEN_WIDTH:
            device.width_dist = value;
            update_nonwebvr_fov(device);
            break;
        case HMD_SCREEN_HEIGHT:
            device.height_dist = value;
            update_nonwebvr_fov(device);
            break;
        case HMD_BEVEL_SIZE:
            device.bevel_size = value;
            update_nonwebvr_fov(device);
            break;
        }
        break;
    case DEVICE_GAMEPAD0:
    case DEVICE_GAMEPAD1:
    case DEVICE_GAMEPAD2:
    case DEVICE_GAMEPAD3:
        device.gamepad_mapping[config] = value;
        break;
    }
}

exports.get_gamepad_btn_value = function(device, btn) {
    if (btn < device.gamepad_btns.length)
        return device.gamepad_btns[get_gamepad_btn_key(device, btn)];
    else
        return false;
}

exports.get_gamepad_axis_value = function(device, btn) {
    if (btn - GMPD_AXIS_OFFSET < device.gamepad_axes.length) {
        return device.gamepad_axes[get_gamepad_btn_key(device, btn) - GMPD_AXIS_OFFSET];
    } else
        return 0;
}

exports.update = function(timeline) {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() :
            (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
    for (var i = 0; i < _devices.length; i++) {
        var device = _devices[i];
        switch(device.type) {
        case DEVICE_GAMEPAD0:
            clear_gamepad_device(device);
            update_gamepad_device(gamepads[0], device);
            break;
        case DEVICE_GAMEPAD1:
            clear_gamepad_device(device);
            update_gamepad_device(gamepads[1], device);
            break;
        case DEVICE_GAMEPAD2:
            clear_gamepad_device(device);
            update_gamepad_device(gamepads[2], device);
            break;
        case DEVICE_GAMEPAD3:
            clear_gamepad_device(device);
            update_gamepad_device(gamepads[3], device);
            break;
        case DEVICE_HMD:
            update_hmd(device, timeline);
            break;
        }
    }
}

function update_hmd(device, timeline) {
    if (device.webvr_display) {
        // NOTE: update position and orientation only one time per frame
        // to prevent strange behavior of WebVR API 1.0
        var display = device.webvr_display;
        var capabilities = display.capabilities;
        var webvr_pose = display.getPose();

        if (capabilities.hasOrientation && webvr_pose.orientation) {
            device.orientation[0] = webvr_pose.orientation[0];
            device.orientation[1] = webvr_pose.orientation[1];
            device.orientation[2] = webvr_pose.orientation[2];
            device.orientation[3] = webvr_pose.orientation[3];
        }

        if (capabilities.hasPosition && webvr_pose.position) {
            device.position[0] = webvr_pose.position[0];
            device.position[1] = -webvr_pose.position[2];
            device.position[2] = webvr_pose.position[1];
        }
    } else {
        if (timeline - _last_updating_hmd_time > HMD_UPDATING_DELAY) {
            _last_updating_hmd_time = timeline;
            if (navigator.getVRDisplays) {
                if (!device.webvr_display)
                    navigator.getVRDisplays().then(
                        function (displays) {
                            if (displays.length > 0) {
                                device.webvr_display = displays[0];
                                device.registered = true;
                            }
                        }, function(error) {
                            m_print.error_once("WebVR displays are not found.");
                            device.registered = false;
                        }
                    );
            } else if (navigator.getVRDevices) {
                if (!device.webvr_hmd_device && !_is_webvr_devices_requested)
                    navigator.getVRDevices().then(
                        function(webvr_devices) {
                            setup_webvr_devices(device, webvr_devices);
                            if (webvr_devices.length)
                                device.registered = true;
                            _is_webvr_devices_requested = true;
                        }, function(error) {
                            m_print.error_once("WebVR devices are not found.");
                            device.registered = false;
                            _is_webvr_devices_requested = true;
                        }
                    );
            } else if (!cfg_def.is_mobile_device)
                m_print.error_once("HMD isn't supported.");
        }
    }
}

function update_gamepad_device(gamepad, device) {
    if (gamepad) {
        for (var i = 0; i < gamepad["buttons"].length; i++)
            device.gamepad_btns[i] = gamepad["buttons"][i]["pressed"];
        if (gamepad["axes"] && gamepad["axes"].length <= 12)
            for (var i = 0; i < gamepad["axes"].length; i++)
                device.gamepad_axes[i] = gamepad["axes"][i];
    }
}

function clear_gamepad_device(device) {
    for (var i = 0; i < device.gamepad_btns; i++)
        device.gamepad_btns[i] = false;
    for (var i = 0; i < device.gamepad_axes.length; i++) {
        device.gamepad_prev_axes[i] = device.gamepad_axes[i];
        device.gamepad_axes[i] = 0;
    }
}

exports.attach_param_cb = function(device, param, cb) {
    switch(param) {
    case GYRO_ORIENTATION_QUAT:
        device.orientation_quat_cb_list.push(cb);
        param = DEVICE_ORIENTATION;
        break;
    case GYRO_ORIENTATION_ANGLES:
        device.orientation_angles_cb_list.push(cb);
        param = DEVICE_ORIENTATION;
        break;
    case MOUSE_DOWN_WHICH:
        device.mouse_down_which_cb_list.push(cb);
        break;
    case MOUSE_LOCATION:
        device.mouse_location_cb_list.push(cb);
        break;
    case MOUSE_UP_WHICH:
        device.mouse_up_which_cb_list.push(cb);
        break;
    case MOUSE_WHEEL:
        device.mouse_wheel_cb_list.push(cb);
        break;
    case KEYBOARD_DOWN:
        device.keyboard_down_cb_list.push(cb);
        break;
    case KEYBOARD_DOWN_MODIFIED:
        device.keyboard_down_mod_cb_list.push(cb);
        param = KEYBOARD_DOWN;
        break;
    case KEYBOARD_UP:
        device.keyboard_up_cb_list.push(cb);
        break;
    case TOUCH_START:
        device.touch_start_cb_list.push(cb);
        break;
    case TOUCH_MOVE:
        device.touch_move_cb_list.push(cb);
        break;
    case TOUCH_END:
        device.touch_end_cb_list.push(cb);
        break;
    }

    if (device.registered_event_listeners.indexOf(param) == -1) {
        device.registered_event_listeners.push(param);
        if (device.registered)
            register_event_listener(device, param);
    }
}

function replace_cb_with_null(cb_list, cb) {
    var cb_index = cb_list.indexOf(cb);
    if (cb_index >= 0)
        cb_list[cb_index] = null;
}

function is_null(x) {
    return x === null;
}

exports.detach_param_cb = function(device, param, cb) {
    unregister_event_listener(device, param, cb, false, false);
}


function unregister_event_listener(device, param, cb, force) {
    switch(param) {
    case GYRO_ORIENTATION_QUAT:
        cb && replace_cb_with_null(device.orientation_quat_cb_list, cb);
        if (force || (device.orientation_angles_cb_list.every(is_null) &&
                device.orientation_quat_cb_list.every(is_null))) {
            device.orientation_quat_cb_list.length = 0;
            device.orientation_angles_cb_list.length = 0;

            param = DEVICE_ORIENTATION;
            var param_index = device.registered_event_listeners.indexOf(param);
            if (param_index >= 0) {
                device.registered_event_listeners.splice(param_index, 1);
                device.element.removeEventListener("deviceorientation", device_orientation_cb, false);
            }
        }
        break;
    case GYRO_ORIENTATION_ANGLES:
        cb && replace_cb_with_null(device.orientation_angles_cb_list, cb);
        if (force || (device.orientation_angles_cb_list.every(is_null) &&
                device.orientation_quat_cb_list.every(is_null))) {
            device.orientation_quat_cb_list.length = 0;
            device.orientation_angles_cb_list.length = 0;

            param = DEVICE_ORIENTATION;
            var param_index = device.registered_event_listeners.indexOf(param);
            if (param_index >= 0) {
                device.registered_event_listeners.splice(param_index, 1);
                device.element.removeEventListener("deviceorientation", device_orientation_cb, false);
            }
        }
        break;
    case MOUSE_DOWN_WHICH:
        cb && replace_cb_with_null(device.mouse_down_which_cb_list, cb);
        if (force || device.mouse_down_which_cb_list.every(is_null)) {
            device.mouse_down_which_cb_list.length = 0;

            var param_index = device.registered_event_listeners.indexOf(param);
            if (param_index >= 0) {
                device.registered_event_listeners.splice(param_index, 1);
                device.element.removeEventListener("mousedown", mouse_down_cb, false);
            }
        }
        break;
    case MOUSE_LOCATION:
        cb && replace_cb_with_null(device.mouse_location_cb_list, cb);
        if (force || device.mouse_location_cb_list.every(is_null)) {
            device.mouse_location_cb_list.length = 0;

            var param_index = device.registered_event_listeners.indexOf(param);
            if (param_index >= 0) {
                device.registered_event_listeners.splice(param_index, 1);
                device.element.removeEventListener("mousemove", mouse_move_cb, false);
            }
        }
        break;
    case MOUSE_UP_WHICH:
        cb && replace_cb_with_null(device.mouse_up_which_cb_list, cb);
        if (force || device.mouse_up_which_cb_list.every(is_null)) {
            device.mouse_up_which_cb_list.length = 0;

            var param_index = device.registered_event_listeners.indexOf(param);
            if (param_index >= 0) {
                device.registered_event_listeners.splice(param_index, 1);
                device.element.removeEventListener("mouseout", mouse_out_cb, false);
                device.element.removeEventListener("mouseup", mouse_up_cb, false);
            }
            break;
        }
        break;
    case MOUSE_WHEEL:
        cb && replace_cb_with_null(device.mouse_wheel_cb_list, cb);
        if (force || device.mouse_wheel_cb_list.every(is_null)) {
            device.mouse_wheel_cb_list.length = 0;

            var param_index = device.registered_event_listeners.indexOf(param);
            if (param_index >= 0) {
                device.registered_event_listeners.splice(param_index, 1);
                device.element.removeEventListener("wheel", mouse_wheel_cb, false);
            }
        }
        break;
    case KEYBOARD_DOWN:
        cb && replace_cb_with_null(device.keyboard_down_cb_list, cb);
        if (force || device.keyboard_down_cb_list.every(is_null)) {
            device.keyboard_down_cb_list.length = 0;

            var param_index = device.registered_event_listeners.indexOf(param);
            if (param_index >= 0) {
                device.registered_event_listeners.splice(param_index, 1);
                device.element.removeEventListener("keydown", keyboard_down_cb, false);
            }
        }
        break;
    case KEYBOARD_UP:
        cb && replace_cb_with_null(device.keyboard_up_cb_list, cb);
        if (force || device.keyboard_up_cb_list.every(is_null)) {
            device.keyboard_up_cb_list.length = 0;

            var param_index = device.registered_event_listeners.indexOf(param);
            if (param_index >= 0) {
                device.registered_event_listeners.splice(param_index, 1);
                device.element.removeEventListener("keyup", keyboard_up_cb, false);
            }
        }
        break;
    case TOUCH_START:
        cb && replace_cb_with_null(device.touch_start_cb_list, cb);
        if (force || device.touch_start_cb_list.every(is_null)) {
            device.touch_start_cb_list.length = 0;

            var param_index = device.registered_event_listeners.indexOf(param);
            if (param_index >= 0) {
                device.registered_event_listeners.splice(param_index, 1);
                device.element.removeEventListener("touchstart", touch_start_cb, false);
            }
        }
        break;
    case TOUCH_MOVE:
        cb && replace_cb_with_null(device.touch_move_cb_list, cb);
        if (force || device.touch_move_cb_list.every(is_null)) {
            device.touch_move_cb_list.length = 0;

            var param_index = device.registered_event_listeners.indexOf(param);
            if (param_index >= 0) {
                device.registered_event_listeners.splice(param_index, 1);
                device.element.removeEventListener("touchmove", touch_move_cb, false);
            }
        }
        break;
    case TOUCH_END:
        cb && replace_cb_with_null(device.touch_end_cb_list, cb);
        if (force || device.touch_end_cb_list.every(is_null)) {
            device.touch_end_cb_list.length = 0;

            var param_index = device.registered_event_listeners.indexOf(param);
            if (param_index >= 0) {
                device.registered_event_listeners.splice(param_index, 1);
                device.element.removeEventListener("touchend", touch_end_cb, false);
            }
        }
        break;
    }
}

function is_ios() {
    return /iPad|iPhone|iPod/.test(navigator.platform);
}

function register_event_listener(device, event_name) {
    switch (event_name) {
    case MOUSE_DOWN_WHICH:
        if (!is_ios())
            device.element.addEventListener("mousedown", mouse_down_cb, false);
        break;
    case MOUSE_LOCATION:
        device.element.addEventListener("mousemove", mouse_move_cb, false);
        break;
    case MOUSE_UP_WHICH:
        if (!is_ios()) {
            if (device.element != window)
                device.element.addEventListener("mouseout", mouse_up_cb, false);
            device.element.addEventListener("mouseup", mouse_up_cb, false);
        }
        break;
    case MOUSE_WHEEL:
        device.element.addEventListener("wheel", mouse_wheel_cb, false);
        break;
    case KEYBOARD_DOWN:
        device.element.addEventListener("keydown", keyboard_down_cb, false);
        break;
    case KEYBOARD_UP:
        device.element.addEventListener("keyup", keyboard_up_cb, false);
        break;
    case TOUCH_START:
        device.element.addEventListener("touchstart", touch_start_cb, false);
        break;
    case TOUCH_MOVE:
        device.element.addEventListener("touchmove", touch_move_cb, false);
        break;
    case TOUCH_END:
        device.element.addEventListener("touchend", touch_end_cb, false);
        break;
    case DEVICE_ORIENTATION:
        device.element.addEventListener("deviceorientation", device_orientation_cb, false);
        break;
    }
}

function get_orientation_quat(device, dest) {
    switch (device.type) {
    case DEVICE_HMD:
        m_vec3.copy(m_util.QUAT4_IDENT, dest);
        if (device.webvr_display) {
            dest[0] = device.orientation[0];
            dest[1] = device.orientation[1];
            dest[2] = device.orientation[2];
            dest[3] = device.orientation[3];
            
        } else if (device.webvr_sensor_devices) {
            for (var i = 0; i < device.webvr_sensor_devices.length; i++) {
                var webvr_sensor_device = device.webvr_sensor_devices[i];
                var webvr_state = webvr_sensor_device.getState &&
                        webvr_sensor_device.getState() ||
                        webvr_sensor_device.getImmediateState &&
                        webvr_sensor_device.getImmediateState();
                if (webvr_state.orientation) {
                    dest[0] = webvr_state.orientation["x"];
                    dest[1] = webvr_state.orientation["y"];
                    dest[2] = webvr_state.orientation["z"];
                    dest[3] = webvr_state.orientation["w"];
                }
            }
        }
        // NOTE: normalize dest, bcz firefox doesn't do this
        m_quat.normalize(dest, dest);
        var quat = m_quat.setAxisAngle(m_util.AXIS_X, Math.PI / 2, _quat_tmp2);
        m_quat.multiply(quat, dest, dest);
        return dest;
    default:
        m_print.error("orientation_quat is undefined for device: ", device.type);
        return dest;
    }
}

function get_position(device, dest) {
    switch (device.type) {
    case DEVICE_HMD:
        m_vec3.copy(m_util.VEC3_UNIT, dest);
        if (device.webvr_display) {
            dest[0] = device.position[0];
            dest[1] = device.position[1];
            dest[2] = device.position[2];
        } else if (device.webvr_sensor_devices) {
            for (var i = 0; i < device.webvr_sensor_devices.length; i++) {
                var webvr_sensor_device = device.webvr_sensor_devices[i];
                var webvr_state = webvr_sensor_device.getState &&
                        webvr_sensor_device.getState() ||
                        webvr_sensor_device.getImmediateState &&
                        webvr_sensor_device.getImmediateState();

                if (webvr_state.position) {
                    dest[0] = webvr_state.position["x"];
                    dest[1] = -webvr_state.position["z"];
                    dest[2] = webvr_state.position["y"];
                }
            }
        }
        return dest;
    default:
        m_print.error("position is undefined for device: ", device.type);
        return dest;
    }
}

exports.gyro_angles_to_quat = gyro_angles_to_quat;
function gyro_angles_to_quat(angles, dest) {
    // NOTE: Euler rotation sequence for deviceorientation event is ZXY
    // see http://w3c.github.io/deviceorientation/spec-source-orientation.html
    m_util.ordered_angles_to_quat(angles, m_util.ZXY, dest);

    // NOTE: window.orientation deprecated
    // see https://developer.mozilla.org/en-US/docs/Web/API/Window/orientation
    // NOTE: use window["screen"] and ignore obfuscation
    if ("orientation" in window)
        var screen_orient = m_util.deg_to_rad(window["orientation"]);
    else if ("orientation" in window["screen"])
        var screen_orient = m_util.deg_to_rad(window["screen"]["orientation"]["angle"]);
    else
        var screen_orient = 0;

    var screen_quat = m_quat.setAxisAngle(m_util.AXIS_MZ,
            screen_orient, _quat_tmp2);
    m_quat.multiply(dest, screen_quat, dest);
    return dest;
}

function device_orientation_cb(event) {
    var euler_angles = _vec3_tmp;

    // https://www.w3.org/TR/orientation-event/#deviceorientation
    // alpha, beta, gamma might be null
    if (event.alpha === null || event.beta === null || event.gamma === null)
        euler_angles[0] = euler_angles[1] = euler_angles[2] = 0.0;
    else {
        euler_angles[0] = m_util.deg_to_rad(event.alpha);
        euler_angles[1] = m_util.deg_to_rad(event.beta);
        euler_angles[2] = m_util.deg_to_rad(event.gamma);
    }
    var device = get_device_by_type_element(DEVICE_GYRO, event.currentTarget);
    for (var i = 0; i < device.orientation_angles_cb_list.length; i++) {
        var cb = device.orientation_angles_cb_list[i];
        if (cb) {
            m_vec3.copy(euler_angles, _angles);
            cb(_angles);
        }
    }

    if (device.orientation_quat_cb_list.length) {
        // Angles are changed. Recalculate quaternion.
        var quaternion = gyro_angles_to_quat(euler_angles, _quat_tmp);

        for (var i = 0; i < device.orientation_quat_cb_list.length; i++) {
            var cb = device.orientation_quat_cb_list[i];
            if (cb) {
                m_quat.copy(quaternion, _quat);
                cb(_quat);
            }
        }
    }

    // remove unused callbacks
    for (var i = 0; i < device.orientation_quat_cb_list.length; i++)
        if (!device.orientation_quat_cb_list[i])
            device.orientation_quat_cb_list.splice(i, 1);
    for (var i = 0; i < device.orientation_angles_cb_list.length; i++)
        if (!device.orientation_angles_cb_list[i])
            device.orientation_angles_cb_list.splice(i, 1);
}

function update_device(device, event) {
    switch (device.type) {
    case DEVICE_MOUSE:
        device.mouse_location[0] = event.clientX;
        device.mouse_location[1] = event.clientY;
        device.mouse_which = event.which;
        break;
    }
}

function mouse_move_cb(event) {
    if (_exist_touch) {
        // optimization for Chrome
        // See https://developer.mozilla.org/en-US/docs/Web/API/InputDeviceCapabilities
        if (event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents)
            return;

        // optimization for Firefox
        // See https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/mozInputSource
        // event.mozInputSource == 5 means that the event was generated by touch.
        if (event.mozInputSource == 5)
            return;
    }

    var device = get_device_by_type_element(DEVICE_MOUSE, event.currentTarget);
    update_device(device, event);

    for (var i = 0; i < device.mouse_location_cb_list.length; i++) {
        var cb = device.mouse_location_cb_list[i];
        if (cb) {
            _location[0] = event.clientX;
            _location[1] = event.clientY;
            cb(_location);
        }
    }

    if (device.prevent_default)
        event.preventDefault();

    // remove unused callbacks
    for (var i = 0; i < device.mouse_location_cb_list.length; i++)
        if (!device.mouse_location_cb_list[i])
            device.mouse_location_cb_list.splice(i, 1);
}

function mouse_down_cb(event) {
    if (_exist_touch) {
        // optimization for Chrome
        // See https://developer.mozilla.org/en-US/docs/Web/API/InputDeviceCapabilities
        if (event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents)
            return;

        // optimization for Firefox
        // See https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/mozInputSource
        // event.mozInputSource == 5 means that the event was generated by touch.
        if (event.mozInputSource == 5)
            return;
    }

    var device = get_device_by_type_element(DEVICE_MOUSE, event.currentTarget);
    update_device(device, event);
    for (var i = 0; i < device.mouse_down_which_cb_list.length; i++) {
        var cb = device.mouse_down_which_cb_list[i];
        if (cb)
            cb(event.which);
    }

    if (device.prevent_default)
        event.preventDefault();

    // remove unused callbacks
    for (var i = 0; i < device.mouse_down_which_cb_list.length; i++)
        if (!device.mouse_down_which_cb_list[i])
            device.mouse_down_which_cb_list.splice(i, 1);
}

function mouse_out_cb(event) {
    if (!m_cont.is_child(event.relatedTarget))
        mouse_up_cb(event);
}

function mouse_up_cb(event) {
    if (_exist_touch) {
        // optimization for Chrome
        // See https://developer.mozilla.org/en-US/docs/Web/API/InputDeviceCapabilities
        if (event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents)
            return;

        // optimization for Firefox
        // See https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/mozInputSource
        // event.mozInputSource == 5 means that the event was generated by touch.
        if (event.mozInputSource == 5)
            return;
    }

    var device = get_device_by_type_element(DEVICE_MOUSE, event.currentTarget);
    update_device(device, event);

    for (var i = 0; i < device.mouse_up_which_cb_list.length; i++) {
        var cb = device.mouse_up_which_cb_list[i];
        if (cb)
            cb(event.which);
    }

    if (device.prevent_default)
        event.preventDefault();

    // remove unused callbacks
    for (var i = 0; i < device.mouse_up_which_cb_list.length; i++)
        if (!device.mouse_up_which_cb_list[i])
            device.mouse_up_which_cb_list.splice(i, 1);
}

function mouse_wheel_cb(event) {
    var device = get_device_by_type_element(DEVICE_MOUSE, event.currentTarget);
    for (var i = 0; i < device.mouse_wheel_cb_list.length; i++) {
        var cb = device.mouse_wheel_cb_list[i];
        if (cb)
            cb(-event.deltaY);
    }

    if (device.prevent_default)
        event.preventDefault();

    // remove unused callbacks
    for (var i = 0; i < device.mouse_wheel_cb_list.length; i++)
        if (!device.mouse_wheel_cb_list[i])
            device.mouse_wheel_cb_list.splice(i, 1);
}

function keyboard_down_cb(event) {
    var device = get_device_by_type_element(DEVICE_KEYBOARD, event.currentTarget);

    var cb_list = event.ctrlKey || event.altKey || event.metaKey?
            device.keyboard_down_mod_cb_list:
            device.keyboard_down_cb_list;

    for (var i = 0; i < cb_list.length; i++) {
        var cb = cb_list[i];
        if (cb)
            cb(event.keyCode);
        else
            // remove unused callbacks
            cb_list.splice(i--, 1);
    }

    if (device.prevent_default)
        event.preventDefault();
}

function keyboard_up_cb(event) {
    var device = get_device_by_type_element(DEVICE_KEYBOARD, event.currentTarget);
    for (var i = 0; i < device.keyboard_up_cb_list.length; i++) {
        var cb = device.keyboard_up_cb_list[i];
        if (cb)
            cb(event.keyCode);
    }

    if (device.prevent_default)
        event.preventDefault();

    // remove unused callbacks
    for (var i = 0; i < device.keyboard_up_cb_list.length; i++)
        if (!device.keyboard_up_cb_list[i])
            device.keyboard_up_cb_list.splice(i, 1);
}

function touch_start_cb(event) {
    var device = get_device_by_type_element(DEVICE_TOUCH, event.currentTarget);
    for (var i = 0; i < device.touch_start_cb_list.length; i++) {
        var cb = device.touch_start_cb_list[i];
        if (cb)
            cb(event.targetTouches);
    }

    // if (device.prevent_default)
    //     event.preventDefault();

    // remove unused callbacks
    for (var i = 0; i < device.touch_start_cb_list.length; i++)
        if (!device.touch_start_cb_list[i])
            device.touch_start_cb_list.splice(i, 1);
}

function touch_move_cb(event) {
    var device = get_device_by_type_element(DEVICE_TOUCH, event.currentTarget);
    for (var i = 0; i < device.touch_move_cb_list.length; i++) {
        var cb = device.touch_move_cb_list[i];
        if (cb)
            cb(event.targetTouches);
    }

    if (device.prevent_default)
        event.preventDefault();

    // remove unused callbacks
    for (var i = 0; i < device.touch_move_cb_list.length; i++)
        if (!device.touch_move_cb_list[i])
            device.touch_move_cb_list.splice(i, 1);
}

function touch_end_cb(event) {
    var device = get_device_by_type_element(DEVICE_TOUCH, event.currentTarget);
    for (var i = 0; i < device.touch_end_cb_list.length; i++) {
        var cb = device.touch_end_cb_list[i];
        if (cb)
            cb(event.targetTouches);
    }

    // if (device.prevent_default)
    //     event.preventDefault();

    // remove unused callbacks
    for (var i = 0; i < device.touch_end_cb_list.length; i++)
        if (!device.touch_end_cb_list[i])
            device.touch_end_cb_list.splice(i, 1);
}

exports.cleanup = function() {
    for (var i = 0; i < _devices.length; i++) {
        var device = _devices[i];

        for (var j = 0; j < device.registered_event_listeners.length; j++) {
            var param = device.registered_event_listeners[j];
            unregister_event_listener(device, param, null, true);
        }
    }

    _devices.length = 0;
}

exports.get_pressed_gmpd_btn = function(gamepad_id) {
    var type = get_gmpd_type_by_id(gamepad_id);
    var device = get_device_by_type_element(type);
    for (var i = 0; i < device.gamepad_btns.length; i++)
        if (device.gamepad_btns[i])
            return i;
    return -1;
}

exports.get_moved_gmpd_axis = function(gamepad_id) {
    var type = get_gmpd_type_by_id(gamepad_id);
    var device = get_device_by_type_element(type);
    for (var i = 0; i < device.gamepad_axes.length; i++)
        if (device.gamepad_prev_axes[i] - device.gamepad_axes[i])
            return i + GMPD_AXIS_OFFSET;
    return -1;
}

function get_gmpd_type_by_id(gamepad_id) {
    switch(gamepad_id) {
    case 0:
        var type = DEVICE_GAMEPAD0;
        break;
    case 1:
        var type = DEVICE_GAMEPAD1;
        break;
    case 2:
        var type = DEVICE_GAMEPAD2;
        break;
    case 3:
        var type = DEVICE_GAMEPAD3;
        break;
    default:
        var type = DEVICE_GAMEPAD0;
    }
    return type;
}

function get_gamepad_btn_key(device, btn) {
    return device.gamepad_mapping[btn];
}

exports.get_first_gmpd_id = function() {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() :
            (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
    for (var i = 0; i < gamepads.length; i++)
        if (gamepads[i])
            return i;
    return 0;
}

exports.get_webvr_display = function() {
    var hmd_device = get_device_by_type_element(DEVICE_HMD);
    return hmd_device && hmd_device.webvr_display;
}

}
