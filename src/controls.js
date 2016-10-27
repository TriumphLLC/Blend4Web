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
 * Controls internal API.
 * @name controls
 * @namespace
 * @exports exports as controls
 */
b4w.module["__controls"] = function(exports, require) {

var m_cfg   = require("__config");
var m_cont  = require("__container");
var m_input = require("__input");
var m_obj   = require("__objects");
var m_print = require("__print");
var m_phy   = require("__physics");
var m_quat  = require("__quat");
var m_time  = require("__time");
var m_tsr   = require("__tsr");
var m_util  = require("__util");
var m_vec3  = require("__vec3");

var cfg_ctl = m_cfg.controls;
var cfg_dft = m_cfg.defaults;

var _objects = [];
var _global_object = {};

var _sensors_cache = [];
var _manifolds_cache = [];
var _accumulators_cache = [];

var _vec2_tmp  = new Float32Array(2);
var _vec2_tmp2 = new Float32Array(2);

var _vec3_tmp = m_vec3.create();
var _quat_tmp = m_quat.create();

// flag and counter to maintain object cache and manifolds consistency
var _manifolds_updated = false;
var _update_counter = 0;

// sensor types for internal usage
var ST_CUSTOM            = 10;
var ST_KEYBOARD          = 20;
var ST_MOUSE_WHEEL       = 30;
var ST_MOUSE_MOVE        = 40;
var ST_MOUSE_CLICK       = 50;
var ST_TOUCH_MOVE        = 60;
var ST_TOUCH_ZOOM        = 70;
var ST_TOUCH_ROTATE      = 75;
var ST_TOUCH_CLICK       = 80;
var ST_COLLISION         = 90;
var ST_COLLISION_IMPULSE = 100;
var ST_RAY               = 110;
var ST_MOTION            = 120;
var ST_V_VELOCITY        = 130;
var ST_TIMER             = 140;
var ST_ELAPSED           = 150;
var ST_TIMELINE          = 160;
var ST_SELECTION         = 170;
var ST_GYRO_DELTA        = 180;
var ST_GYRO_ANGLES       = 190;
var ST_GYRO_QUAT         = 200;
var ST_HMD_QUAT          = 210;
var ST_HMD_POSITION      = 220;
var ST_CALLBACK          = 230;
var ST_GAMEPAD_BTNS      = 240;
var ST_GMPD_AXIS         = 250;

// control types
exports.CT_POSITIVE   = 10;
exports.CT_CONTINUOUS = 20;
exports.CT_TRIGGER    = 30;
exports.CT_SHOT       = 40;
exports.CT_LEVEL      = 50;
exports.CT_CHANGE     = 60;

exports.PL_SINGLE_TOUCH_MOVE      = 0;
exports.PL_MULTITOUCH_MOVE_ZOOM   = 1;
exports.PL_MULTITOUCH_MOVE_PAN    = 2;
exports.PL_MULTITOUCH_MOVE_ROTATE = 3;

var SENSOR_SMOOTH_PERIOD = 0.3;

var KEY_SHIFT = 16;

var MAX_COUNT_FINGERS = 10;

exports.update = function(timeline, elapsed) {
    // prepare sensor accumulators
    for (var i = 0; i < _accumulators_cache.length; i++) {
        var accum = _accumulators_cache[i];
        prepare_accumulator(accum);
    }

    for (var i = 0; i < _sensors_cache.length; i++) {
        var sensor = _sensors_cache[i];
        update_sensor(sensor, timeline, elapsed);
    }

    for (var i = 0; i < _objects.length; i++) {
        var obj = _objects[i];
        var manifolds_arr = obj.sensor_manifolds_arr;

        for (var j = 0; j < manifolds_arr.length; j++) {
            var manifold = manifolds_arr[j];

            // already updated
            if (manifold.update_counter == _update_counter)
                continue;

            manifold.update_counter = _update_counter;

            var pulse = manifold_gen_pulse(manifold);
            if (pulse) {
                var cb_obj = (obj == _global_object) ? null : obj;
                _manifolds_updated = false;
                manifold.callback(cb_obj, manifold.id, pulse, manifold.callback_param);
                // go to loop start
                if (_manifolds_updated) {
                    i = -1;
                    break;
                }
            }
        }
    }

    // discharge after ALL callback exec
    for (var i = 0; i < _objects.length; i++) {
        var obj = _objects[i];
        var manifolds_arr = obj.sensor_manifolds_arr;

        for (var j = 0; j < manifolds_arr.length; j++) {
            var manifold = manifolds_arr[j];
            discharge_sensors(manifold.sensors);
        }
    }

    // update sensor accumulators state after ALL callback exec
    for (var i = 0; i < _accumulators_cache.length; i++) {
        var accum = _accumulators_cache[i];
        update_accumulator(accum);
    }

    _update_counter++;
}

exports.create_custom_sensor = function(value) {
    var sensor = init_sensor(ST_CUSTOM);
    sensor_set_value(sensor, value);
    return sensor;
}

function init_sensor(type, element) {
    if (!element)
        element = m_cont.get_container();

    var sensor = {
        type: type,
        value: 0,
        payload: null,
        element: element,

        do_activation: false,

        // for ST_KEYBOARD
        key: 0,

        // for ST_COLLISION and ST_RAY
        collision_id: "",
        calc_pos_norm: false,

        // for ST_COLLISION
        collision_obj: null,
        collision_cb: function() {},

        // for ST_COLLISION_IMPULSE
        col_imp_obj: null,
        col_imp_cb: function() {},

        // for ST_RAY, ST_MOTION and ST_SELECTION
        source_object: null,

        // for ST_RAY
        from: new Float32Array(3),
        to: new Float32Array(3),
        is_binary_value: false,
        ign_src_rot: false,
        ray_test_id: 0,
        ray_test_cb: function() {},

        // for ST_MOUSE_MOVE and ST_TOUCH_MOVE
        axis: "",

        // for ST_MOTION, ST_V_VELOCITY, ST_TIMER and ST_ELAPSED
        time_last: 0.0,

        // for ST_MOTION and ST_V_VELOCITY
        trans_last: new Float32Array(3),
        quat_last: new Float32Array(4),
        threshold: 0.0,

        // for ST_MOTION
        quat_temp: new Float32Array(4),
        avg_linear_vel: 0.0,
        avg_angular_vel: 0.0,
        rotation_threshold: 0.0,

        // for ST_V_VELOCITY
        avg_vertical_vel: 0.0,

        // for ST_TIMER
        period: 0.0,
        repeat: false,

        // for ST_SELECTION
        enable_toggle_switch: false,

        // for ST_GAMEPAD_BTNS
        gamepad_id: 0,

        // for ST_CALLBACK
        callback: function() {}
    };

    return sensor;
}

function prepare_accumulator(accum) {
    if (!accum.mouse_select_data.is_updated) {
        accum.mouse_select_data.obj = m_obj.pick_object(
                accum.mouse_select_data.coord[0],
                accum.mouse_select_data.coord[1]);
        accum.mouse_select_data.is_updated = true;
        accum.global_selected_obj = accum.mouse_select_data.obj;
    }

    for (var i = 0; i < MAX_COUNT_FINGERS; ++i) {
        var touch_data = accum.touch_select_dlist[i];
        if (!touch_data.is_updated) {
            touch_data.obj = m_obj.pick_object(
                    touch_data.coord[0], touch_data.coord[1]);
            touch_data.is_updated = true;
            accum.global_selected_obj = touch_data.obj;
        }
    }
}

function update_accumulator(accum) {
    // is_updated_keyboard is used for optimization
    if (!accum.is_updated_keyboard) {
        for (var i = 0; i < accum.downed_keys.length; i++) {
            if (accum.downed_keys[i] == 1)
                accum.downed_keys[i] = 2;
            else if (accum.downed_keys[i] == 3)
                accum.downed_keys[i] = 0;
        }
        accum.is_updated_keyboard = true;
    }

    accum.wheel_delta = 0;
    accum.mouse_last_x = accum.mouse_curr_x;
    accum.mouse_last_y = accum.mouse_curr_y;
    accum.downed_keys[0] = false;

    accum.touches_last_x.set(accum.touches_curr_x);
    accum.touches_last_y.set(accum.touches_curr_y);
    accum.touch_zoom_last_dist = accum.touch_zoom_curr_dist;

    accum.gyro_gamma_last = accum.gyro_gamma_new;
    accum.gyro_beta_last = accum.gyro_beta_new;
    accum.gyro_alpha_last = accum.gyro_alpha_new;

    accum.is_updated_gyro_quat = false;
}

function get_accumulator(element) {
    if (!element)
        element = m_cont.get_container();

    for (var i = 0; i < _accumulators_cache.length; i++) {
        var accumulator = _accumulators_cache[i];
        if (element == accumulator.element)
            return accumulator;
    }

    var accumulator = {
        element: element,

        is_updated_keyboard: true,
        is_mouse_downed: false,
        is_touch_ended: true,
        // for ST_MOUSE_MOVE sensor
        mouse_last_x: 0,
        mouse_last_y: 0,
        mouse_curr_x: 0,
        mouse_curr_y: 0,

        // for ST_TOUCH_MOVE sensor
        touches_last_x: new Float32Array(2),
        touches_curr_x: new Float32Array(2),
        touches_last_y: new Float32Array(2),
        touches_curr_y: new Float32Array(2),
        touch_zoom_curr_dist: 0,
        touch_zoom_last_dist: 0,
        touch_start_rot: 0,

        // for ST_KEYBOARD sensor
        downed_keys: new Uint8Array(256),

        // for ST_MOUSE_WHEEL sensor
        wheel_delta: 0,

        // for ST_SELECTION sensor
        global_selected_obj: null,
        mouse_select_data: create_input_point(),
        touch_select_dlist: new Array(MAX_COUNT_FINGERS),

        // for ST_GYRO_QUAT sensor
        is_updated_gyro_quat: false,
        gyro_quat: m_quat.create(),

        // for ST_GYRO_ANGLES, ST_GYRO_DELTA sensor
        gyro_gamma_new : 0.0,
        gyro_beta_new : 0.0,
        gyro_alpha_new : 0.0,

        // for ST_GYRO_DELTA sensor
        gyro_gamma_last : 0.0,
        gyro_beta_last : 0.0,
        // random unattainable value for initialization
        gyro_alpha_last : Infinity,

        // callbacks
        orientation_quat_cb: null,
        orientation_angles_cb: null,
        mouse_wheel_cb: null,
        mouse_down_which_cb: null,
        mouse_select_cb: null,
        touch_select_start_cb: null,
        touch_select_end_cb: null,
        mouse_up_which_cb: null,
        mouse_location_cb: null,
        keyboard_downed_keys_cb: null,
        touch_start_cb: null,
        touch_move_cb: null,
        touch_end_cb: null,

        registered_accum_values: {},
    };
    for (var i = 0; i < MAX_COUNT_FINGERS; ++i)
        accumulator.touch_select_dlist[i] = create_input_point();

    function create_input_point() {
        return {
            coord: new Float32Array(2),
            is_updated: true,
            obj: null,

            // use for touch
            identifier: -1,
            is_released: true
        };
    }

    accumulator.orientation_quat_cb = function(angles) {
        // calculate gyro_quat only one time per frame
        if (!accumulator.is_updated_gyro_quat) {
            m_input.gyro_angles_to_quat(angles, accumulator.gyro_quat);
            accumulator.is_updated_gyro_quat = true;
        }
    }

    accumulator.orientation_angles_cb = function(quat) {
        var euler_angles = m_vec3.copy(quat, _vec3_tmp);
        accumulator.gyro_alpha_new = euler_angles[0];
        accumulator.gyro_beta_new = euler_angles[1];
        accumulator.gyro_gamma_new = euler_angles[2];

        if (accumulator.gyro_alpha_last == Infinity) {
            accumulator.gyro_alpha_last = euler_angles[0];
            accumulator.gyro_beta_last = euler_angles[1];
            accumulator.gyro_gamma_last = euler_angles[2];
        }
    }

    accumulator.mouse_wheel_cb = function(wd) {
        // accumulated
        accumulator.wheel_delta += wd * cfg_ctl.mouse_wheel_notch_multiplier;
    }

    accumulator.mouse_down_which_cb = function(wd) {
        var device = m_input.get_device_by_type_element(m_input.DEVICE_MOUSE,
                accumulator.element);
        var loc = m_input.get_vector_param(device, m_input.MOUSE_LOCATION, _vec2_tmp);
        accumulator.mouse_last_x = loc[0];
        accumulator.mouse_last_y = loc[1];
        accumulator.mouse_curr_x = loc[0];
        accumulator.mouse_curr_y = loc[1];
        accumulator.is_mouse_downed = true;
        accumulator.which = wd;
    }

    accumulator.mouse_select_cb = function(wd) {
        var device = m_input.get_device_by_type_element(m_input.DEVICE_MOUSE,
                accumulator.element);
        var loc = m_input.get_vector_param(device, m_input.MOUSE_LOCATION, _vec2_tmp);
        var canvas_xy = m_cont.client_to_canvas_coords(loc[0], loc[1], _vec2_tmp);
        accumulator.mouse_select_data.is_updated = false;
        accumulator.mouse_select_data.coord[0] = canvas_xy[0];
        accumulator.mouse_select_data.coord[1] = canvas_xy[1];
    }

    accumulator.touch_select_start_cb = function(touches) {
        for (var i = 0; i < touches.length; ++i) {
            var touch = touches[i];
            var rel_touch = null;
            var cur_touch = null;
            for (var j = 0; j < accumulator.touch_select_dlist.length; j++) {
                var t = accumulator.touch_select_dlist[j];
                if (t.identifier == touch.identifier) {
                    if (t.is_released)
                        cur_touch = t;
                    break;
                } else if (!rel_touch && t.is_released) {
                    rel_touch = t;
                    rel_touch.identifier = touch.identifier;
                }
            }

            var result_touch = cur_touch || rel_touch;
            if (result_touch) {
                var canvas_xy = m_cont.client_to_canvas_coords(
                        touches[i].clientX, touches[i].clientY, _vec2_tmp);

                result_touch.is_updated = false;
                result_touch.is_released = false;
                result_touch.coord[0] = canvas_xy[0];
                result_touch.coord[1] = canvas_xy[1];
            }
        }
    }

    accumulator.touch_select_end_cb = function(touches) {
        for (var i = 0; i < accumulator.touch_select_dlist.length; ++i) {
            var touch_select = accumulator.touch_select_dlist[i];
            var found = false;
            for (var j = 0; j < touches.length; ++j) {
                var touch = touches[j];
                if (touch.identifier == touch_select.identifier) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                touch_select.is_updated = true;
                touch_select.is_released = true;
                touch_select.obj = null;
            }
        }
    }

    accumulator.mouse_up_which_cb = function(wd) {
        accumulator.is_mouse_downed = false;
    }

    accumulator.mouse_location_cb = function(location) {
        if (!cfg_dft.ie11_edge_touchscreen_hack || accumulator.is_mouse_downed) {
            accumulator.mouse_curr_x = location[0];
            accumulator.mouse_curr_y = location[1];
        }
    }

    accumulator.keyboard_down_keys_cb = function(key) {
        if (accumulator.downed_keys[key] != 2) {
            accumulator.downed_keys[key] = 1;
            accumulator.is_updated_keyboard = false;
        }
    }

    accumulator.keyboard_down_mod_keys_cb = function(key) {
        for(var i = 0; i < accumulator.downed_keys.length; i++)
            if (accumulator.downed_keys[i] != 0) {
                accumulator.downed_keys[i] = 3;
                accumulator.is_updated_keyboard = false;
            }
    }

    accumulator.keyboard_up_keys_cb = function(key) {
        if (accumulator.downed_keys[key] == 1)
            accumulator.downed_keys[key] = 0;
        else {
            accumulator.is_updated_keyboard &= false;
            accumulator.downed_keys[key] = 3;
        }
    }

    accumulator.touch_start_cb = function(touches) {
        accumulator.is_touch_ended = false;

        if (touches.length == 1) {
            // reset coords from last touch session
            accumulator.touches_last_x[0] = touches[0].clientX;
            accumulator.touches_last_x[1] = -1;
            accumulator.touches_last_y[0] = touches[0].clientY;
            accumulator.touches_last_y[1] = -1;

        } else if (touches.length > 1) {
            var zoom_dist = touch_zoom_dist(touches);
            accumulator.touch_zoom_curr_dist = accumulator.touch_zoom_last_dist = zoom_dist;

            // reset coords from last touch session
            accumulator.touches_last_x[0] = touches[0].clientX;
            accumulator.touches_last_x[1] = touches[1].clientX;
            accumulator.touches_last_y[0] = touches[0].clientY;
            accumulator.touches_last_y[1] = touches[1].clientY;

            accumulator.touch_start_rot = touch_rotation(touches);
        }

        // reset coords from last touch session
        accumulator.touches_curr_x.set(accumulator.touches_last_x);
        accumulator.touches_curr_y.set(accumulator.touches_last_y);
    }

    accumulator.touch_move_cb = function(touches) {
        if (touches.length === 1) { // panning
            accumulator.touches_curr_x[0] = touches[0].clientX;
            accumulator.touches_curr_x[1] = -1;
            accumulator.touches_curr_y[0] = touches[0].clientY;
            accumulator.touches_curr_y[1] = -1;
        } else if (touches.length > 1) {
            accumulator.touches_curr_x[0] = touches[0].clientX;
            accumulator.touches_curr_x[1] = touches[1].clientX;
            accumulator.touches_curr_y[0] = touches[0].clientY;
            accumulator.touches_curr_y[1] = touches[1].clientY;

            var zoom_dist = touch_zoom_dist(touches);

            accumulator.touch_zoom_curr_dist = zoom_dist;
        }
    }

    accumulator.touch_end_cb = function(touches) {
        if (touches.length == 0)
            accumulator.is_touch_ended = true;
    }

    _accumulators_cache.push(accumulator);
    return accumulator;
}

function register_accum_value(accum, value_name) {
    if (value_name in accum.registered_accum_values &&
            accum.registered_accum_values[value_name] > 0) {
        accum.registered_accum_values[value_name] += 1
        return;
    }

    accum.registered_accum_values[value_name] = 1;
    switch (value_name) {
    case "orientation_quat":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_GYRO);
        if (device)
            m_input.attach_param_cb(device, m_input.GYRO_ORIENTATION_ANGLES,
                    accum.orientation_quat_cb);
        break;
    case "orientation_angles":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_GYRO);
        if (device)
            m_input.attach_param_cb(device, m_input.GYRO_ORIENTATION_ANGLES,
                    accum.orientation_angles_cb);
        break;
    case "mouse_wheel":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_MOUSE,
                accum.element);
        if (device)
            m_input.attach_param_cb(device, m_input.MOUSE_WHEEL,
                    accum.mouse_wheel_cb);
        break;
    case "mouse_down_which":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_MOUSE,
                accum.element);
        if (device)
            m_input.attach_param_cb(device, m_input.MOUSE_DOWN_WHICH,
                    accum.mouse_down_which_cb);
        break;
    case "mouse_select":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_MOUSE,
                accum.element);
        if (device)
            m_input.attach_param_cb(device, m_input.MOUSE_DOWN_WHICH,
                    accum.mouse_select_cb);
        break;
    case "touch_select":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_TOUCH,
                accum.element);
        if (device) {
            m_input.attach_param_cb(device, m_input.TOUCH_START,
                    accum.touch_select_start_cb);
            m_input.attach_param_cb(device, m_input.TOUCH_END,
                    accum.touch_select_end_cb);
        }
        break;
    case "mouse_up_which":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_MOUSE,
                accum.element);
        if (device)
            m_input.attach_param_cb(device, m_input.MOUSE_UP_WHICH,
                    accum.mouse_up_which_cb);
        break;
    case "mouse_location":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_MOUSE,
                accum.element);
        if (device)
            m_input.attach_param_cb(device, m_input.MOUSE_LOCATION,
                    accum.mouse_location_cb);
        break;
    case "keyboard_downed_keys":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_KEYBOARD,
                accum.element);
        if (device) {
            m_input.attach_param_cb(device, m_input.KEYBOARD_DOWN,
                    accum.keyboard_down_keys_cb);
            m_input.attach_param_cb(device, m_input.KEYBOARD_DOWN_MODIFIED,
                    accum.keyboard_down_mod_keys_cb);
            m_input.attach_param_cb(device, m_input.KEYBOARD_UP,
                    accum.keyboard_up_keys_cb);
        }
        break;
    case "touch_start":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_TOUCH,
                accum.element);
        if (device)
            m_input.attach_param_cb(device, m_input.TOUCH_START,
                    accum.touch_start_cb);
        break;
    case "touch_move":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_TOUCH,
                accum.element);
        if (device)
            m_input.attach_param_cb(device, m_input.TOUCH_MOVE,
                    accum.touch_move_cb);
        break;
    case "touch_end":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_TOUCH,
                accum.element);
        if (device)
            m_input.attach_param_cb(device, m_input.TOUCH_END,
                    accum.touch_end_cb);
        break;
    }
}

function unregister_accum_value(accum, value_name) {
    if (!value_name in accum.registered_accum_values)
        return
    else
        if (accum.registered_accum_values[value_name] > 0) {
            accum.registered_accum_values[value_name] -= 1;
            if (accum.registered_accum_values[value_name])
                return;
        } else
            return;

    switch (value_name) {
    case "orientation_quat":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_GYRO);
        if (device)
            m_input.detach_param_cb(device, m_input.GYRO_ORIENTATION_QUAT,
                    accum.orientation_quat_cb);
        break;
    case "orientation_angles":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_GYRO);
        if (device)
            m_input.detach_param_cb(device, m_input.GYRO_ORIENTATION_ANGLES,
                    accum.orientation_angles_cb);
        break;
    case "mouse_wheel":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_MOUSE,
                accum.element);
        if (device)
            m_input.detach_param_cb(device, m_input.MOUSE_WHEEL,
                    accum.mouse_wheel_cb);
        break;
    case "mouse_down_which":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_MOUSE,
                accum.element);
        if (device)
            m_input.detach_param_cb(device, m_input.MOUSE_DOWN_WHICH,
                    accum.mouse_down_which_cb);
        break;
    case "mouse_select":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_MOUSE,
                accum.element);
        if (device)
            m_input.detach_param_cb(device, m_input.MOUSE_DOWN_WHICH,
                    accum.mouse_select_cb);
        break;
    case "touch_select":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_TOUCH,
                accum.element);
        if (device) {
            m_input.detach_param_cb(device, m_input.TOUCH_START,
                    accum.touch_select_start_cb);
            m_input.detach_param_cb(device, m_input.TOUCH_END,
                    accum.touch_select_end_cb);
        }
        break;
    case "mouse_up_which":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_MOUSE,
                accum.element);
        if (device)
            m_input.detach_param_cb(device, m_input.MOUSE_UP_WHICH,
                    accum.mouse_up_which_cb);
        break;
    case "mouse_location":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_MOUSE,
                accum.element);
        if (device)
            m_input.detach_param_cb(device, m_input.MOUSE_LOCATION,
                    accum.mouse_location_cb);
        break;
    case "keyboard_downed_keys":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_KEYBOARD,
                accum.element);
        if (device) {
            m_input.detach_param_cb(device, m_input.KEYBOARD_DOWN,
                    accum.keyboard_down_keys_cb);
            m_input.detach_param_cb(device, m_input.KEYBOARD_DOWN_MODIFIED,
                    accum.keyboard_down_mod_keys_cb);
            m_input.detach_param_cb(device, m_input.KEYBOARD_UP,
                    accum.keyboard_up_keys_cb);
        }
        break;
    case "touch_start":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_TOUCH,
                accum.element);
        if (device)
            m_input.detach_param_cb(device, m_input.TOUCH_START,
                    accum.touch_start_cb);
        break;
    case "touch_move":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_TOUCH,
                accum.element);
        if (device)
            m_input.detach_param_cb(device, m_input.TOUCH_MOVE,
                    accum.touch_move_cb);
        break;
    case "touch_end":
        var device = m_input.get_device_by_type_element(m_input.DEVICE_TOUCH,
                accum.element);
        if (device)
            m_input.detach_param_cb(device, m_input.TOUCH_END,
                    accum.touch_end_cb);
        break;
    }
}

exports.create_keyboard_sensor = function(key) {
    var element = document;
    var sensor = init_sensor(ST_KEYBOARD, element);
    sensor.key = key;
    sensor.do_activation = true;
    return sensor;
}

exports.create_gamepad_btn_sensor = function(btn, id) {
    var element = document;
    var sensor = init_sensor(ST_GAMEPAD_BTNS, element);

    id = id || m_input.get_first_gmpd_id();
    sensor.gamepad_id = id;
    sensor.key = btn;
    sensor.do_activation = true;
    return sensor;
}

exports.create_gamepad_axis_sensor = function(axis, id) {
    var element = document;
    var sensor = init_sensor(ST_GMPD_AXIS, element);

    id = id == undefined ? m_input.get_first_gmpd_id() : id;
    sensor.gamepad_id = id;
    sensor.key = axis;
    sensor.do_activation = true;
    return sensor;
}

exports.create_collision_sensor = function(obj, collision_id,
                                           calc_pos_norm) {
    if (!(obj && m_phy.obj_has_physics(obj))) {
        m_print.error("Wrong collision object");
        return null;
    }

    var sensor = init_sensor(ST_COLLISION);
    sensor.collision_obj = obj;
    sensor.collision_id = collision_id;
    sensor.calc_pos_norm = calc_pos_norm;

    sensor.payload = {
        coll_obj: null,
        coll_pos: calc_pos_norm ? new Float32Array(3) : null,
        coll_norm: calc_pos_norm ? new Float32Array(3) : null,
        coll_dist: 0
    }

    sensor.collision_cb = function(is_collision, coll_obj, coll_pos, coll_norm, coll_dist) {
        sensor_set_value(sensor, is_collision);

        var payload = sensor.payload;

        payload.coll_obj = coll_obj;

        if (sensor.calc_pos_norm) {
            payload.coll_pos.set(coll_pos);
            payload.coll_norm.set(coll_norm);
            payload.coll_dist = coll_dist;
        }
    }
    sensor.do_activation = true;

    return sensor;
}

exports.create_collision_impulse_sensor = function(obj) {
    if (!(obj && obj.physics)) {
        m_print.error("Wrong collision impulse object");
        return null;
    }

    var sensor = init_sensor(ST_COLLISION_IMPULSE);
    sensor.col_imp_obj = obj;
    sensor.col_imp_cb = function(impulse) {
        sensor_set_value(sensor, impulse);
    }
    sensor.do_activation = true;

    return sensor;
}

exports.create_ray_sensor = function(obj_src, from, to, collision_id,
        is_binary_value, calc_pos_norm, ign_src_rot) {

    var sensor = init_sensor(ST_RAY);
    sensor.source_object = obj_src;
    sensor.from = from;
    sensor.to = to;
    sensor.collision_id = collision_id;
    sensor.is_binary_value = is_binary_value;
    sensor.calc_pos_norm = calc_pos_norm;
    sensor.ign_src_rot = ign_src_rot;

    sensor.payload = {
        hit_fract: 0,
        obj_hit: null,
        hit_time: 0,
        hit_pos: new Float32Array(3),
        hit_norm: new Float32Array(3),
        ray_test_id: 0
    }

    sensor.ray_test_cb = function(id, hit_fract, obj_hit, hit_time,
            hit_pos, hit_norm) {
        if (sensor.is_binary_value)
            sensor_set_value(sensor, hit_fract == -1 ? 0 : 1);
        else
            sensor_set_value(sensor, hit_fract);

        sensor.payload.hit_fract = hit_fract;
        sensor.payload.obj_hit = obj_hit;
        sensor.payload.hit_time = hit_time;

        if (sensor.calc_pos_norm) {
            sensor.payload.hit_pos.set(hit_pos);
            sensor.payload.hit_norm.set(hit_norm);
        }
    }
    sensor.do_activation = true;

    return sensor;
}

exports.create_mouse_click_sensor = function(element) {
    var sensor = init_sensor(ST_MOUSE_CLICK, element);
    sensor.do_activation = true;
    sensor.payload = {coords: new Float32Array(2), which: null};
    return sensor;
}

exports.create_mouse_wheel_sensor = function(element) {
    var sensor = init_sensor(ST_MOUSE_WHEEL, element);
    sensor.do_activation = true;
    return sensor;
}

exports.create_mouse_move_sensor = function(axis, element) {
    var sensor = init_sensor(ST_MOUSE_MOVE, element);
    sensor.axis = axis || "XY";
    sensor.payload = {coords: new Float32Array(2)};
    sensor.do_activation = true;
    return sensor;
}

exports.create_touch_move_sensor = function(axis, element) {
    var sensor = init_sensor(ST_TOUCH_MOVE, element);
    sensor.axis = axis || "XY";
    sensor.payload = {coords: new Float32Array(2), gesture: 0};
    sensor.do_activation = true;
    return sensor;
}

exports.create_touch_zoom_sensor = function(element) {
    var sensor = init_sensor(ST_TOUCH_ZOOM, element);
    sensor.payload = 0;
    sensor.do_activation = true;
    return sensor;
}

exports.create_touch_rotate_sensor = function(element) {
    var sensor = init_sensor(ST_TOUCH_ROTATE, element);
    sensor.payload = 0;
    sensor.do_activation = true;
    return sensor;
}

exports.create_touch_click_sensor = function(element) {
    var sensor = init_sensor(ST_TOUCH_CLICK, element);
    sensor.payload = {coords: new Float32Array(2)};
    sensor.do_activation = true;
    return sensor;
}

exports.create_motion_sensor = function(obj, threshold, rotation_threshold) {

    if (!obj) {
        m_print.error("Wrong collision object");
        return null;
    }

    var sensor = init_sensor(ST_MOTION);

    sensor.source_object = obj;

    var trans = m_tsr.get_trans_view(obj.render.world_tsr);
    var quat = m_tsr.get_quat_view(obj.render.world_tsr);

    sensor.quat_temp = new Float32Array(4);
    sensor.trans_last = new Float32Array(trans);
    sensor.quat_last = new Float32Array(quat);

    sensor.avg_linear_vel = 0;
    sensor.avg_angular_vel = 0;

    sensor.threshold = threshold || 0.1;
    sensor.rotation_threshold = rotation_threshold || 0.1;

    sensor.time_last = 0.0;

    sensor.payload = new Float32Array([0, 0]);

    return sensor;
}

exports.create_vertical_velocity_sensor = function(obj, threshold) {

    if (!obj) {
        m_print.error("Wrong collision object");
        return null;
    }

    var sensor = init_sensor(ST_V_VELOCITY);

    sensor.source_object = obj;

    var trans = m_tsr.get_trans_view(obj.render.world_tsr);
    var quat = m_tsr.get_quat_view(obj.render.world_tsr);

    sensor.trans_last = new Float32Array(trans);
    sensor.quat_last = new Float32Array(quat);

    sensor.avg_vertical_vel = 0;

    sensor.threshold = threshold || 1.0;
    sensor.time_last = 0.0;

    sensor.payload = 0;

    return sensor;
}

exports.create_timer_sensor = function(period, do_repeat) {
    var sensor = init_sensor(ST_TIMER);
    // period < 0 for expired timer
    sensor.period = period;
    sensor.repeat = do_repeat;
    sensor.do_activation = true;
    return sensor;
}

exports.reset_timer_sensor = function(obj, manifold_id, num, period) {
    obj = obj || _global_object;

    var manifolds = obj.sensor_manifolds;

    if (!manifolds || !manifolds[manifold_id]) {
        m_print.error("reset_timer_sensor(): wrong object");
        return null;
    }

    var sensor = manifolds[manifold_id].sensors[num];
    if (!sensor) {
        m_print.error("reset_timer_sensor(): sensor not found");
        return null;
    }

    sensor.time_last = m_time.get_timeline();
    sensor.period = period;
}

exports.create_elapsed_sensor = function() {
    var sensor = init_sensor(ST_ELAPSED);
    sensor.time_last = 0.0;
    return sensor;
}

exports.create_gyro_delta_sensor = function() {
    var sensor = init_sensor(ST_GYRO_DELTA, window);
    sensor.payload = new Float32Array(3);
    var device = m_input.get_device_by_type_element(m_input.DEVICE_GYRO);
    if (device)
        sensor_set_value(sensor, 1);
    else
        sensor_set_value(sensor, 0);
    sensor.do_activation = true;
    return sensor;
}

exports.create_gyro_angles_sensor = function() {
    var sensor = init_sensor(ST_GYRO_ANGLES, window);
    sensor.payload = new Float32Array(3);
    var device = m_input.get_device_by_type_element(m_input.DEVICE_GYRO);
    if (device)
        sensor_set_value(sensor, 1);
    else
        sensor_set_value(sensor, 0);
    sensor.do_activation = true;
    return sensor;
}

exports.create_gyro_quat_sensor = function() {
    var sensor = init_sensor(ST_GYRO_QUAT, window);
    sensor.payload = m_quat.create();
    var device = m_input.get_device_by_type_element(m_input.DEVICE_GYRO);
    if (device)
        sensor_set_value(sensor, 1);
    else
        sensor_set_value(sensor, 0);
    sensor.do_activation = true;
    return sensor;
}

exports.create_hmd_quat_sensor = function() {
    var sensor = init_sensor(ST_HMD_QUAT, window);
    sensor.payload = m_quat.create();
    var device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
    if (device)
        sensor_set_value(sensor, 1);
    else
        sensor_set_value(sensor, 0);
    sensor.do_activation = true;
    return sensor;
}

exports.create_hmd_position_sensor = function() {
    var sensor = init_sensor(ST_HMD_POSITION, window);
    sensor.payload = m_vec3.create();
    var device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
    if (device)
        sensor_set_value(sensor, 1);
    else
        sensor_set_value(sensor, 0);
    sensor.do_activation = true;
    return sensor;
}

exports.create_timeline_sensor = function() {
    var sensor = init_sensor(ST_TIMELINE);
    return sensor;
}

exports.create_selection_sensor = function(obj, enable_toggle_switch) {
    var sensor = init_sensor(ST_SELECTION);
    sensor.source_object = obj;
    sensor.enable_toggle_switch = enable_toggle_switch;
    sensor.do_activation = true;
    return sensor;
}

exports.create_callback_sensor = function(callback, value) {
    var sensor = init_sensor(ST_CALLBACK);
    sensor.callback = callback;
    sensor_set_value(sensor, value);
    return sensor;
}

exports.sensor_set_value = sensor_set_value;
function sensor_set_value(sensor, value) {
    sensor.value = Number(value);
}

function manifold_logic_result(manifold) {
    // update sensor values before passing them to logic function
    // NOTE: maybe it's happening too often
    var sensors = manifold.sensors;
    var values = manifold.sensor_values;
    for (var i = 0; i < sensors.length; i++)
        values[i] = sensors[i].value;
    var logic_result = manifold.logic_fun(values);

    return logic_result;
}

exports.get_sensor_value = function(obj, manifold_id, num) {
    obj = obj || _global_object;

    var manifolds = obj.sensor_manifolds;

    if (!manifolds || !manifolds[manifold_id]) {
        m_print.error("get_sensor_value(): wrong object");
        return null;
    }

    var sensor = manifolds[manifold_id].sensors[num];
    if (!sensor) {
        m_print.error("get_sensor_value(): sensor not found");
        return null;
    }

    return sensor.value;
}

exports.get_sensor_payload = function(obj, manifold_id, num) {
    obj = obj || _global_object;

    var manifolds = obj.sensor_manifolds;

    if (!manifolds || !manifolds[manifold_id]) {
        m_print.error("get_sensor_payload(): wrong object");
        return null;
    }

    var sensor = manifolds[manifold_id].sensors[num];
    if (!sensor) {
        m_print.error("get_sensor_payload(): sensor not found");
        return null;
    }
    return sensor.payload;
}

/**
 * uses _vec2_tmp _vec2_tmp2 _vec3_tmp _quat_tmp
 */
function update_sensor(sensor, timeline, elapsed) {
    if (!elapsed)
        return;

    switch (sensor.type) {
    case ST_MOTION:
        var obj = sensor.source_object;

        var trans = m_tsr.get_trans(obj.render.world_tsr, _vec3_tmp);
        var quat = m_tsr.get_quat(obj.render.world_tsr, _quat_tmp);

        var dist = m_vec3.dist(sensor.trans_last, trans);

        var quat_temp = sensor.quat_temp;

        m_quat.invert(sensor.quat_last, quat_temp);
        m_quat.multiply(quat, quat_temp, quat_temp);
        m_quat.normalize(quat_temp, quat_temp);
        var angle = Math.abs(2 * Math.acos(quat_temp[3]));

        var linear_vel = dist / elapsed;
        sensor.avg_linear_vel = m_util.smooth(linear_vel, sensor.avg_linear_vel,
                elapsed, SENSOR_SMOOTH_PERIOD);
        sensor.payload[0] = linear_vel;

        var angular_vel = angle / elapsed;
        sensor.avg_angular_vel = m_util.smooth(angular_vel,
                sensor.avg_angular_vel, elapsed, SENSOR_SMOOTH_PERIOD);
        sensor.payload[1] = angular_vel;

        if (sensor.avg_linear_vel >= sensor.threshold || sensor.avg_angular_vel
                >= sensor.rotation_threshold)
            sensor_set_value(sensor, 1);
        else
            sensor_set_value(sensor, 0);

        m_vec3.copy(trans, sensor.trans_last);
        m_quat.copy(quat, sensor.quat_last);

        sensor.time_last = timeline;
        break;

    case ST_V_VELOCITY:
        var obj = sensor.source_object;
        var trans = m_tsr.get_trans(obj.render.world_tsr, _vec3_tmp);

        var vel = Math.abs(trans[1] - sensor.trans_last[1]) / elapsed;
        sensor.avg_vertical_vel = m_util.smooth(vel, sensor.avg_vertical_vel,
                elapsed, SENSOR_SMOOTH_PERIOD);
        sensor.payload = vel;

        if (sensor.avg_vertical_vel >= sensor.threshold)
            sensor_set_value(sensor, 1);
        else
            sensor_set_value(sensor, 0);

        m_vec3.copy(trans, sensor.trans_last);

        sensor.time_last = timeline;
        break;

    case ST_TIMER:
        if (!sensor.do_activation && sensor.period >= 0 &&
                (timeline - sensor.time_last) >= sensor.period) {
            sensor_set_value(sensor, 1);
            if (sensor.repeat) {
                sensor.time_last = timeline;
            } else {
                sensor.period = -sensor.period;
            }
        }
        break;

    case ST_ELAPSED:
        if (!sensor.time_last) {
            sensor.time_last = timeline;
        }

        sensor_set_value(sensor, timeline - sensor.time_last);
        sensor.time_last = timeline;
        break;

    case ST_TIMELINE:
        sensor_set_value(sensor, timeline);
        break;

    case ST_GYRO_DELTA:
        var accum = get_accumulator(sensor.element);
        sensor.payload[0] = accum.gyro_gamma_new - accum.gyro_gamma_last;
        sensor.payload[1] = accum.gyro_beta_new - accum.gyro_beta_last;
        sensor.payload[2] = accum.gyro_alpha_new - accum.gyro_alpha_last;
        break;

    case ST_GYRO_ANGLES:
        var accum = get_accumulator(sensor.element);
        sensor.payload[0] = accum.gyro_gamma_new;
        sensor.payload[1] = accum.gyro_beta_new;
        sensor.payload[2] = accum.gyro_alpha_new;
        break;

    case ST_GYRO_QUAT:
        var accum = get_accumulator(sensor.element);
        m_quat.copy(accum.gyro_quat, sensor.payload);
        break;

    case ST_HMD_QUAT:
        var device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
        m_input.get_vector_param(device, m_input.HMD_ORIENTATION_QUAT, sensor.payload);
        break;

    case ST_HMD_POSITION:
        var device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
        m_input.get_vector_param(device, m_input.HMD_POSITION, sensor.payload);
        break;

    case ST_GAMEPAD_BTNS:
        var device = get_gmpd_device_by_id(sensor.gamepad_id);
        sensor.value = m_input.get_gamepad_btn_value(device, sensor.key);
        break;
    case ST_GMPD_AXIS:
        var device = get_gmpd_device_by_id(sensor.gamepad_id);
        sensor.value = m_input.get_gamepad_axis_value(device, sensor.key);
        break;
    case ST_CALLBACK:
        sensor_set_value(sensor, sensor.callback());
        break;

    case ST_MOUSE_WHEEL:
        var accum = get_accumulator(sensor.element);
        sensor_set_value(sensor, accum.wheel_delta);
        break;
    case ST_MOUSE_MOVE:
        var accum = get_accumulator(sensor.element);
        if (!cfg_dft.ie11_edge_touchscreen_hack || accum.is_mouse_downed) {
            var delta_x = accum.mouse_curr_x - accum.mouse_last_x;
            var delta_y = accum.mouse_curr_y - accum.mouse_last_y;

            sensor.payload.coords[0] = accum.mouse_curr_x;
            sensor.payload.coords[1] = accum.mouse_curr_y;
            switch (sensor.axis) {
            case "X":
                sensor_set_value(sensor, delta_x);
                break;
            case "Y":
                sensor_set_value(sensor, delta_y);
                break;
            case "XY":
                var delta = Math.sqrt(delta_x*delta_x + delta_y*delta_y);
                sensor_set_value(sensor, delta);
                break;
            }
        }
        break;
    case ST_MOUSE_CLICK:
        var accum = get_accumulator(sensor.element);
        sensor_set_value(sensor, accum.is_mouse_downed);
        sensor.payload.which = accum.which;
        sensor.payload.coords[0] = accum.mouse_curr_x;
        sensor.payload.coords[1] = accum.mouse_curr_y;
        break;
    case ST_SELECTION:
        var accum = get_accumulator(sensor.element);
        sensor_set_value(sensor, 0);
        if (!sensor.enable_toggle_switch) {
            if (accum.is_mouse_downed &&
                    accum.mouse_select_data.obj == sensor.source_object)
                sensor_set_value(sensor, 1);
            else if (!accum.is_touch_ended) {
                for (var i = 0; i < MAX_COUNT_FINGERS; ++i) {
                    var touch_data = accum.touch_select_dlist[i];
                    if (touch_data.obj == sensor.source_object) {
                        sensor_set_value(sensor, 1);
                        break;
                    }
                }
            }
        } else
            if (accum.global_selected_obj == sensor.source_object)
                sensor_set_value(sensor, 1);
        break;
    case ST_KEYBOARD:
        var accum = get_accumulator(sensor.element);

        // NOTE: accum.downed_keys[0] && sensor.key == KEY_SHIFT --- hack to
        // prevent wrong keyup with chrome/webkit
        sensor.payload = accum.downed_keys[sensor.key];
        if (sensor.payload == 1 || accum.downed_keys[0] && sensor.key == KEY_SHIFT)
            sensor_set_value(sensor, 1);
        else if (!sensor.payload || sensor.payload == 3)
            sensor_set_value(sensor, 0);
        break;
    case ST_TOUCH_MOVE:
        var accum = get_accumulator(sensor.element);

        if (accum.touches_curr_x[1] == -1 && accum.touches_curr_y[1] == -1) {
            var delta_x = (accum.touches_curr_x[0] - accum.touches_last_x[0]);
            var delta_y = (accum.touches_curr_y[0] - accum.touches_last_y[0]);
            var delta = Math.sqrt(delta_x * delta_x + delta_y * delta_y);

            // perform calculations for secondary touch point
            if (accum.touches_last_x[1] != -1 && accum.touches_last_y[1] != -1) {
                var delta_second_x = (accum.touches_curr_x[0] - accum.touches_last_x[1]);
                var delta_second_y = (accum.touches_curr_y[0] - accum.touches_last_y[1]);
                var delta_second = Math.sqrt(delta_second_x * delta_second_x
                        + delta_second_y * delta_second_y);

                // use second touch point (from the last touch) if it's closer to
                // current touch than the first point
                if (delta_second < delta) {
                    delta_x = delta_second_x;
                    delta_y = delta_second_y;
                    delta = delta_second;
                }
            }

            sensor.payload.gesture = exports.PL_SINGLE_TOUCH_MOVE;
        } else {
            var cur_center = _vec2_tmp;
            cur_center[0] = (accum.touches_curr_x[0] + accum.touches_curr_x[1]) / 2;
            cur_center[1] = (accum.touches_curr_y[0] + accum.touches_curr_y[1]) / 2;

            var last_center = _vec2_tmp2;
            last_center[0] = (accum.touches_last_x[0] + accum.touches_last_x[1]) / 2;
            last_center[1] = (accum.touches_last_y[0] + accum.touches_last_y[1]) / 2;

            var delta_x = (cur_center[0] - last_center[0]);
            var delta_y = (cur_center[1] - last_center[1]);
            var delta = Math.sqrt(delta_x * delta_x + delta_y * delta_y);

            sensor.payload.gesture = exports.PL_MULTITOUCH_MOVE_PAN;
        }
        sensor.payload.coords[0] = accum.touches_curr_x[0];
        sensor.payload.coords[1] = accum.touches_curr_y[0];
        switch(sensor.axis) {
        case "X":
            sensor_set_value(sensor, delta_x);
            break;
        case "Y":
            sensor_set_value(sensor, delta_y);
            break;
        case "XY":
            sensor_set_value(sensor, delta);
            break;
        }
        break;
    case ST_TOUCH_ZOOM:
        var accum = get_accumulator(sensor.element);
        var delta_dist = accum.touch_zoom_curr_dist - accum.touch_zoom_last_dist;
        sensor.payload = exports.PL_MULTITOUCH_MOVE_ZOOM;
        sensor_set_value(sensor, delta_dist);
        break;
    case ST_TOUCH_ROTATE:
        var accum = get_accumulator(sensor.element);
        if (accum.touches_curr_x[1] != -1) { // not panning
            var x = accum.touches_curr_x[0] - accum.touches_curr_x[1],
                y = accum.touches_curr_y[0] - accum.touches_curr_y[1];

            var delta_rotation = Math.atan2(y,x);
            sensor.payload = exports.PL_MULTITOUCH_MOVE_ROTATE;
            sensor_set_value(sensor, delta_rotation - accum.touch_start_rot);
        }
        break;
    case ST_TOUCH_CLICK:
        var accum = get_accumulator(sensor.element);
        sensor.payload.coords[0] = accum.touches_curr_x[0];
        sensor.payload.coords[1] = accum.touches_curr_y[0];
        if (accum.is_touch_ended)
            sensor_set_value(sensor, 0);
        else
            sensor_set_value(sensor, 1);
        break;
    default:
        break;
    }
}

/**
 *  1 - positive pulse
 * -1 - negative pulse
 *  0 - no pulse
 */
function manifold_gen_pulse(manifold) {

    var pulse = 0;

    switch (manifold.type) {
    case exports.CT_POSITIVE:
        var logic_result = manifold_logic_result(manifold);
        if (logic_result)
            pulse = 1;
        else
            pulse = 0;
        break;
    case exports.CT_CONTINUOUS:
        var last_pulse = manifold.last_pulse;
        var logic_result = manifold_logic_result(manifold);
        if (logic_result) {
            pulse = 1;
            manifold.last_pulse = 1;
        } else if (last_pulse == 1) {
            pulse = -1;
            manifold.last_pulse = -1;
        } else
            pulse = 0;

        break;
    case exports.CT_TRIGGER:
        var last_pulse = manifold.last_pulse;
        var logic_result = manifold_logic_result(manifold);

        if (logic_result && last_pulse == -1) {
            pulse = 1;
            manifold.last_pulse = 1;
        } else if (!logic_result && last_pulse == 1) {
            pulse = -1;
            manifold.last_pulse = -1;
        } else
            pulse = 0;

        break;
    case exports.CT_SHOT:
        var last_pulse = manifold.last_pulse;
        var logic_result = manifold_logic_result(manifold);

        if (logic_result && last_pulse == -1) {
            pulse = 1;
            manifold.last_pulse = 1;
        } else if (!logic_result && last_pulse == 1) {
            // give no ouput, but register negative pulse
            pulse = 0;
            manifold.last_pulse = -1;
        } else
            pulse = 0;

        break;

    case exports.CT_LEVEL:
        // ignore previous pulses
        var logic_result = manifold_logic_result(manifold);

        if (manifold.last_logic_result != logic_result) {
            pulse = 1;
            manifold.last_logic_result = logic_result;
        } else
            pulse = 0;
        break;

    case exports.CT_CHANGE:
        // ignore previous pulses and logic result
        var sensors = manifold.sensors;
        var last_values = manifold.last_sensor_values;

        for (var i = 0; i < sensors.length; i++) {
            var value = sensors[i].value;

            if (!pulse && value != last_values[i])
                pulse = 1;

            last_values[i] = value;
        }

        break;
    default:
        m_util.panic("Wrong sensor manifold type: " + manifold.type);
        break;
    }

    return pulse;
}

/**
 * Some sensors need to be discharged after pulse generation
 */
function discharge_sensors(sensors) {
    for (var i = 0; i < sensors.length; i++) {
        var sensor = sensors[i];

        switch (sensor.type) {
        case ST_MOUSE_WHEEL:
            sensor_set_value(sensor, 0);
            break;
        case ST_MOUSE_MOVE:
            sensor_set_value(sensor, 0);
            break;
        case ST_TOUCH_MOVE:
            sensor_set_value(sensor, 0);
            break;
        case ST_TOUCH_ZOOM:
            sensor_set_value(sensor, 0);
            break;
        case ST_TOUCH_ROTATE:
            sensor_set_value(sensor, 0);
            break;
        case ST_TOUCH_CLICK:
            sensor_set_value(sensor, 0);
            break;
        case ST_TIMER:
            sensor_set_value(sensor, 0);
            break;
        default:
            // do nothing
            break;
        }
    }
}

exports.cleanup = function() {
    _objects = [];
    _global_object = {};

    for (var i = 0; i < _sensors_cache.length; i++)
        deactivate_sensor(_sensors_cache[i]);
    _sensors_cache.length = 0;
    _manifolds_cache.length = 0;
}

exports.check_sensor_manifold = function(obj, id) {
    obj = obj || _global_object;

    // NOTE: need to be initialized in object update routine
    if (!obj.sensor_manifolds)
        return false;

    if (id && obj.sensor_manifolds[id])
        return true;
    else if (id)
        return false;
    else
        for (var i in obj.sensor_manifolds)
            return true;

    return false;
}

exports.create_sensor_manifold = function(obj, id, type, sensors,
        logic_fun, callback, callback_param) {
    obj = obj || _global_object;

    obj.sensor_manifolds_arr = obj.sensor_manifolds_arr || [];
    obj.sensor_manifolds = obj.sensor_manifolds || {};

    var manifolds = obj.sensor_manifolds;
    var manifolds_arr = obj.sensor_manifolds_arr;

    var old_manifold = manifolds[id];
    if (old_manifold)
        remove_sensor_manifold(obj, id);

    var manifold = {
        id: id,
        type: type,
        sensors: sensors.slice(0),

        logic_fun: logic_fun,
        // cache for logic function
        sensor_values: new Array(sensors.length),

        callback: callback,
        callback_param: callback_param,

        // for CONTINUOUS, TRIGGER, SHOT control type
        last_pulse: -1,

        // for LEVEL control type
        last_logic_result: 0,

        // for CHANGE control type
        last_sensor_values: new Array(sensors.length),

        update_counter: -1
    };

    manifolds[id] = manifold;
    manifolds_arr.push(manifold);

    if (_objects.indexOf(obj) == -1)
        _objects.push(obj);

    var sensors = manifold.sensors;

    for (var i = 0; i < sensors.length; i++) {
        var sensor = sensors[i];
        activate_sensor(sensor);
        var sens_ind = _sensors_cache.indexOf(sensor);
        if (sens_ind == -1) {
            _sensors_cache.push(sensor);
            _manifolds_cache.push([manifold]);
        } else
            _manifolds_cache[sens_ind].push(manifold);
    }

    _manifolds_updated = true;
}

exports.default_AND_logic_fun = default_AND_logic_fun;
/**
 * Default AND logic function.
 * @see ECMA-262: Binary Logical Operators
 */
function default_AND_logic_fun(s) {
    for (var i = 0; i < s.length; i++) {
        if (!s[i])
            return s[i];
    }
    return s[s.length - 1];
}

/**
 * Default OR logic function.
 * @see ECMA-262: Binary Logical Operators
 */
exports.default_OR_logic_fun = function(s) {
    for (var i = 0; i < s.length; i++) {
        if (s[i])
            return s[i];
    }
    return s[s.length - 1];
}

function activate_sensor(sensor) {
    if (sensor.do_activation) {
        switch (sensor.type) {
        case ST_COLLISION:
            m_phy.append_collision_test(sensor.collision_obj,
                    sensor.collision_id, sensor.collision_cb,
                    sensor.calc_pos_norm);
            break;
        case ST_COLLISION_IMPULSE:
            m_phy.apply_collision_impulse_test(sensor.col_imp_obj,
                    sensor.col_imp_cb);
            break;
        case ST_RAY:
            sensor.ray_test_id = m_phy.append_ray_test(sensor.source_object,
                    sensor.from, sensor.to, sensor.collision_id,
                    sensor.ray_test_cb, false, false, sensor.calc_pos_norm,
                    sensor.ign_src_rot);
            sensor.payload.ray_test_id = sensor.ray_test_id;
            break;
        case ST_TIMER:
            sensor.time_last = m_time.get_timeline();
            // reset sensor if appended again
            if (sensor.period < 0)
                sensor.period = -sensor.period;
            break;
        case ST_KEYBOARD:
            var accumulator = get_accumulator(sensor.element);
            register_accum_value(accumulator, "keyboard_downed_keys");
            break;
        case ST_MOUSE_WHEEL:
            var accumulator = get_accumulator(sensor.element);
            register_accum_value(accumulator, "mouse_wheel");
            break;
        case ST_MOUSE_MOVE:
            var accumulator = get_accumulator(sensor.element);
            register_accum_value(accumulator, "mouse_down_which");
            register_accum_value(accumulator, "mouse_up_which");
            register_accum_value(accumulator, "mouse_location");
            break;
        case ST_MOUSE_CLICK:
            var accumulator = get_accumulator(sensor.element);
            register_accum_value(accumulator, "mouse_down_which");
            register_accum_value(accumulator, "mouse_up_which");
            break;
        case ST_TOUCH_MOVE:
            var accumulator = get_accumulator(sensor.element);
            register_accum_value(accumulator, "touch_start");
            register_accum_value(accumulator, "touch_move");
            register_accum_value(accumulator, "touch_end");
            break;
        case ST_TOUCH_ZOOM:
            var accumulator = get_accumulator(sensor.element);
            register_accum_value(accumulator, "touch_start");
            register_accum_value(accumulator, "touch_move");
            break;
        case ST_TOUCH_ROTATE:
            var accumulator = get_accumulator(sensor.element);
            register_accum_value(accumulator, "touch_start");
            register_accum_value(accumulator, "touch_move");
            break;
        case ST_TOUCH_CLICK:
            var accumulator = get_accumulator(sensor.element);
            register_accum_value(accumulator, "touch_start");
            register_accum_value(accumulator, "touch_end");
            break;
        case ST_SELECTION:
            var accumulator = get_accumulator(sensor.element);
            register_accum_value(accumulator, "mouse_select");
            register_accum_value(accumulator, "touch_select");
            register_accum_value(accumulator, "touch_start");
            register_accum_value(accumulator, "touch_end");
            register_accum_value(accumulator, "mouse_down_which");
            register_accum_value(accumulator, "mouse_up_which");
            break;
        case ST_GYRO_DELTA:
        case ST_GYRO_ANGLES:
            var accumulator = get_accumulator(sensor.element);
            register_accum_value(accumulator, "orientation_angles");
            break;
        case ST_GYRO_QUAT:
            var accumulator = get_accumulator(sensor.element);
            register_accum_value(accumulator, "orientation_quat");
            break;
        case ST_GAMEPAD_BTNS:
            if (sensor.gamepad_id == 0)
                m_input.get_device_by_type_element(m_input.DEVICE_GAMEPAD0);
            else if (sensor.gamepad_id == 1)
                m_input.get_device_by_type_element(m_input.DEVICE_GAMEPAD1);
            else if (sensor.gamepad_id == 2)
                m_input.get_device_by_type_element(m_input.DEVICE_GAMEPAD2);
            else
                m_input.get_device_by_type_element(m_input.DEVICE_GAMEPAD3);
            break;
        }

        sensor.do_activation = false;
    }
}

exports.remove_sensor_manifold = remove_sensor_manifold;
function remove_sensor_manifold(obj, id) {
    obj = obj || _global_object;

    var manifolds = obj.sensor_manifolds;
    if (!manifolds)
        return;

    var manifolds_arr = obj.sensor_manifolds_arr;

    if (id) {
        var manifold = manifolds[id];
        if (manifold) {
            var sensors = manifold.sensors;

            for (var i = 0; i < sensors.length; i++) {
                var sensor = sensors[i];

                var sens_users = get_sensor_users(sensor, _sensors_cache,
                        _manifolds_cache);

                if (sens_users.length == 1) {
                    deactivate_sensor(sensor);
                    var sens_ind = _sensors_cache.indexOf(sensor);
                    if (sens_ind > -1) {
                        _sensors_cache.splice(sens_ind, 1);
                        _manifolds_cache.splice(sens_ind, 1);
                    } else
                        m_util.panic("Sensors cache is corrupted");
                } else if (sens_users.length > 1)
                    sens_users.splice(sens_users.indexOf(manifold), 1);
            }

            delete manifolds[id];

            var man_index = manifolds_arr.indexOf(manifold);
            if (man_index > -1)
                manifolds_arr.splice(man_index, 1);
            else
                m_util.panic("Incorrect manifolds array");

            // remove from objects if manifolds have 0 sensors
            if (!Object.getOwnPropertyNames(manifolds).length)
                remove_from_objects(obj);
        }
    } else {
        // make a copy to ensure reliable results
        var removed_ids = [];
        for (var id in manifolds)
            removed_ids.push(id);

        for (var i = 0; i < removed_ids.length; i++)
            remove_sensor_manifold(obj, removed_ids[i]);
    }

    _manifolds_updated = true;
}

function remove_from_objects(obj) {
    // remove from _objects
    var obj_index = _objects.indexOf(obj);
    if (obj_index > -1)
        _objects.splice(obj_index, 1);
    else {
        m_print.error("Wrong object");
        return;
    }
}

function get_sensor_users(sensor, sensors_cache, manifolds_cache) {
    var sens_ind = sensors_cache.indexOf(sensor);
    if (sens_ind > -1)
        return manifolds_cache[sens_ind];
    else
        return [];
}

/**
 * Remove sensor from given sensors array.
 * Physics sensors also require proper cleanup
 */
function deactivate_sensor(sensor) {
    switch (sensor.type) {
    case ST_COLLISION:
        m_phy.remove_collision_test(sensor.collision_obj,
                sensor.collision_id, sensor.collision_cb);
        sensor.do_activation = true;
        break;
    case ST_COLLISION_IMPULSE:
        m_phy.clear_collision_impulse_test(sensor.col_imp_obj);
        sensor.do_activation = true;
        break;
    case ST_RAY:
        m_phy.remove_ray_test(sensor.ray_test_id);
        sensor.do_activation = true;
        break;
    case ST_TIMER:
        sensor.do_activation = true;
        break;
    case ST_KEYBOARD:
        var accumulator = get_accumulator(sensor.element);
        unregister_accum_value(accumulator, "keyboard_downed_keys");
        sensor.do_activation = true;
        break;
    case ST_MOUSE_WHEEL:
        var accumulator = get_accumulator(sensor.element);
        unregister_accum_value(accumulator, "mouse_wheel");
        sensor.do_activation = true;
        break;
    case ST_MOUSE_MOVE:
        var accumulator = get_accumulator(sensor.element);
        unregister_accum_value(accumulator, "mouse_down_which");
        unregister_accum_value(accumulator, "mouse_up_which");
        unregister_accum_value(accumulator, "mouse_location");
        sensor.do_activation = true;
        break;
    case ST_MOUSE_CLICK:
        var accumulator = get_accumulator(sensor.element);
        unregister_accum_value(accumulator, "mouse_down_which");
        unregister_accum_value(accumulator, "mouse_up_which");
        sensor.do_activation = true;
        break;
    case ST_TOUCH_MOVE:
        var accumulator = get_accumulator(sensor.element);
        unregister_accum_value(accumulator, "touch_start");
        unregister_accum_value(accumulator, "touch_move");
        unregister_accum_value(accumulator, "touch_end");
        sensor.do_activation = true;
        break;
    case ST_TOUCH_ZOOM:
        var accumulator = get_accumulator(sensor.element);
        unregister_accum_value(accumulator, "touch_start");
        unregister_accum_value(accumulator, "touch_move");
        sensor.do_activation = true;
        break;
    case ST_TOUCH_ROTATE:
        var accumulator = get_accumulator(sensor.element);
        unregister_accum_value(accumulator, "touch_start");
        unregister_accum_value(accumulator, "touch_move");
        sensor.do_activation = true;
        break;
    case ST_TOUCH_CLICK:
        var accumulator = get_accumulator(sensor.element);
        unregister_accum_value(accumulator, "touch_start");
        unregister_accum_value(accumulator, "touch_end");
        sensor.do_activation = true;
        break;
    case ST_SELECTION:
        var accumulator = get_accumulator(sensor.element);
        unregister_accum_value(accumulator, "mouse_select");
        unregister_accum_value(accumulator, "touch_select");
        unregister_accum_value(accumulator, "touch_start");
        unregister_accum_value(accumulator, "touch_end");
        unregister_accum_value(accumulator, "mouse_down_which");
        unregister_accum_value(accumulator, "mouse_up_which");
        sensor.do_activation = true;
        break;
    case ST_GYRO_DELTA:
    case ST_GYRO_ANGLES:
        var accumulator = get_accumulator(sensor.element);
        unregister_accum_value(accumulator, "orientation_angles");
        sensor.do_activation = true;
        break;
    case ST_GYRO_QUAT:
        var accumulator = get_accumulator(sensor.element);
        unregister_accum_value(accumulator, "orientation_quat");
        sensor.do_activation = true;
        break;
    case ST_HMD_QUAT:
    case ST_HMD_POSITION:
        sensor.do_activation = true;
        break;
    }
}


exports.reset = function() {
    for (var i = 0; i < _objects.length; i++) {
        var obj = _objects[i];
        var manifolds = obj.sensor_manifolds;
        var manifolds_arr = obj.sensor_manifolds_arr;

        for (var j in manifolds)
            delete manifolds[j];

        manifolds_arr.length = 0;
    }

    for (var i = 0; i < _sensors_cache.length; i++)
        deactivate_sensor(_sensors_cache[i]);

    _objects.length = 0;

    _sensors_cache.length = 0;
    _manifolds_cache.length = 0;
}

exports.debug = function() {
    m_print.log(String(_objects.length) + " objects with manifolds", _objects);
    m_print.log(String(_sensors_cache.length) + " sensors", _sensors_cache);

    var collisions = [];
    var rays = [];

    for (var i = 0; i < _sensors_cache.length; i++) {
        var sensor = _sensors_cache[i];
        if (sensor.type == ST_COLLISION)
            collisions.push(sensor);
        if (sensor.type == ST_RAY)
            rays.push(sensor);
    }

    m_print.log(String(collisions.length) + " collision sensors", collisions);
    m_print.log(String(rays.length) + " ray sensors", rays);
}

function touch_zoom_dist(touches) {
    var touch1 = touches[0];
    var touch2 = touches[1];

    var x = touch1.clientX - touch2.clientX,
        y = touch1.clientY - touch2.clientY;

    return Math.sqrt(x*x + y*y);
}

function touch_rotation(touches) {
    var touch1 = touches[0];
    var touch2 = touches[1];

    var x = touch1.clientX - touch2.clientX,
        y = touch1.clientY - touch2.clientY;

    return Math.atan2(y,x);
}

function get_gmpd_device_by_id(gamepad_id) {
    if (gamepad_id == 0)
        var device = m_input.get_device_by_type_element(m_input.DEVICE_GAMEPAD0);
    else if (gamepad_id == 1)
        var device = m_input.get_device_by_type_element(m_input.DEVICE_GAMEPAD1);
    else if (gamepad_id == 2)
        var device = m_input.get_device_by_type_element(m_input.DEVICE_GAMEPAD2);
    else
        var device = m_input.get_device_by_type_element(m_input.DEVICE_GAMEPAD3);

    return device;
}

}
