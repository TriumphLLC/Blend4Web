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
 * Controls internal API.
 * @name controls
 * @namespace
 * @exports exports as controls
 */
b4w.module["__controls"] = function(exports, require) {

var m_cfg   = require("__config");
var m_cont  = require("__container");
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

// for ST_MOUSE_WHEEL sensor
var _wheel_delta = 0;

// for ST_MOUSE_MOVE sensor
var _mouse_curr_x = 0;
var _mouse_curr_y = 0;
var _mouse_last_x = 0;
var _mouse_last_y = 0;

// HACK: for touchscreen devices using IE11
var _is_mouse_downed = false;

// for ST_TOUCH_MOVE sensor; 2 points touch is supported
var _touches_curr_x = new Float32Array(2);
var _touches_curr_y = new Float32Array(2);
var _touches_last_x = new Float32Array(2);
var _touches_last_y = new Float32Array(2);

var _vec2_tmp  = new Float32Array(2);
var _vec2_tmp2 = new Float32Array(2);

// for ST_TOUCH_ZOOM sensor
var _touch_zoom_curr_dist = 0;
var _touch_zoom_last_dist = 0;

// for ST_TOUCH_ROTATE sensor
var _touch_start_rot = 0;

// flag and counter to maintain object cache and manifolds consistency
var _manifolds_updated = false;
var _update_counter = 0;

var _prev_def_keyboard_events = false;
var _prev_def_mouse_events = false;
var _prev_def_wheel_events = false;
var _prev_def_touch_events = false;
var _allow_element_mouse_event = false;

var _callback_keyboard_events = null;
var _callback_mouse_events = null;
var _callback_wheel_events = null;
var _callback_touch_events = null;

// sensor types for internal usage
var ST_CUSTOM            = 10;
var ST_KEYBOARD          = 20;
var ST_MOUSE_WHEEL       = 30;
var ST_MOUSE_MOVE        = 40;
var ST_MOUSE_CLICK       = 50;
var ST_TOUCH_MOVE        = 60;
var ST_TOUCH_ZOOM        = 70;
var ST_TOUCH_ROTATE      = 75;
var ST_COLLISION         = 80;
var ST_COLLISION_IMPULSE = 90;
var ST_RAY               = 100;
var ST_MOTION            = 110;
var ST_V_VELOCITY        = 120;
var ST_TIMER             = 130;
var ST_ELAPSED           = 140;
var ST_TIMELINE          = 150;
var ST_SELECTION         = 160;
var ST_GYRO_DELTA        = 170;
var ST_GYRO_ANGLES       = 180;
var ST_CALLBACK          = 190;

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

exports.update = function(timeline, elapsed) {
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

    // update sensors global state after ALL callback exec
    _wheel_delta = 0;
    _mouse_last_x = _mouse_curr_x;
    _mouse_last_y = _mouse_curr_y;
    _touches_last_x.set(_touches_curr_x);
    _touches_last_y.set(_touches_curr_y);

    _touch_zoom_last_dist = _touch_zoom_curr_dist;

    _update_counter++;
}

exports.create_custom_sensor = function(value) {
    var sensor = init_sensor(ST_CUSTOM);
    sensor_set_value(sensor, value);
    return sensor;
}

function init_sensor(type) {
    var sensor = {
        type: type,
        value: 0,
        payload: null,

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
        auto_release: false,

        // for ST_GYRO_DELTA and ST_GYRO_ANGLES sensor
        gyro_gamma_new : 0.0,
        gyro_beta_new : 0.0,
        gyro_alpha_new : 0.0,
        gyro_gamma_last : 0.0,
        gyro_beta_last : 0.0,
        gyro_alpha_last : 0.0,

        // for ST_CALLBACK
        callback: function() {}
    };

    return sensor;
}

exports.create_keyboard_sensor = function(key) {
    var sensor = init_sensor(ST_KEYBOARD);
    sensor.key = key;
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

exports.create_mouse_click_sensor = function() {
    var sensor = init_sensor(ST_MOUSE_CLICK);
    return sensor;
}

exports.create_mouse_wheel_sensor = function() {
    var sensor = init_sensor(ST_MOUSE_WHEEL);
    return sensor;
}

exports.create_mouse_move_sensor = function(axis) {
    var sensor = init_sensor(ST_MOUSE_MOVE);
    sensor.axis = axis || "XY";
    sensor.payload = (sensor.axis == "XY") ? new Float32Array(2) : 0;
    return sensor;
}

exports.create_touch_move_sensor = function(axis) {
    var sensor = init_sensor(ST_TOUCH_MOVE);
    sensor.axis = axis || "XY";
    sensor.payload = 0;
    return sensor;
}

exports.create_touch_zoom_sensor = function() {
    var sensor = init_sensor(ST_TOUCH_ZOOM);
    sensor.payload = 0;
    return sensor;
}

exports.create_touch_rotate_sensor = function(axis) {
    var sensor = init_sensor(ST_TOUCH_ROTATE);
    sensor.payload = 0;
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
    var sensor = init_sensor(ST_GYRO_DELTA);
    sensor.payload = new Float32Array(3);
    return sensor;
}

exports.create_gyro_angles_sensor = function() {
    var sensor = init_sensor(ST_GYRO_ANGLES);
    sensor.payload = new Float32Array(3);
    return sensor;
}

exports.create_timeline_sensor = function() {
    var sensor = init_sensor(ST_TIMELINE);
    return sensor;
}

exports.create_selection_sensor = function(obj, auto_release) {
    var sensor = init_sensor(ST_SELECTION);
    sensor.source_object = obj;
    sensor.auto_release = auto_release;
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

function update_sensor(sensor, timeline, elapsed) {
    if (!elapsed)
        return;

    switch (sensor.type) {
    case ST_MOTION:
        var obj = sensor.source_object;

        var trans = m_tsr.get_trans_view(obj.render.world_tsr);
        var quat = m_tsr.get_quat_view(obj.render.world_tsr);

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
        var trans = m_tsr.get_trans_view(obj.render.world_tsr);

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
        sensor.payload[0] = Math.PI * (sensor.gyro_gamma_new - sensor.gyro_gamma_last) / 180;
        sensor.payload[1] = Math.PI * (sensor.gyro_beta_new - sensor.gyro_beta_last) / 180;
        sensor.payload[2] = Math.PI * (sensor.gyro_alpha_new - sensor.gyro_alpha_last) / 180;

        sensor.gyro_gamma_last = sensor.gyro_gamma_new;
        sensor.gyro_beta_last = sensor.gyro_beta_new;
        sensor.gyro_alpha_last = sensor.gyro_alpha_new;
        break;

    case ST_GYRO_ANGLES:
        sensor.payload[0] = Math.PI * sensor.gyro_gamma_new / 180;
        sensor.payload[1] = Math.PI * sensor.gyro_beta_new / 180;
        sensor.payload[2] = Math.PI * sensor.gyro_alpha_new / 180;
        break;

    case ST_CALLBACK:
        sensor_set_value(sensor, sensor.callback());
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
            break;
        case ST_TIMER:
            sensor.time_last = m_time.get_timeline();
            // reset sensor if appended again
            if (sensor.period < 0)
                sensor.period = -sensor.period;
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
                    sens_users.splice(sens_users.indexOf(manifold, 1));
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

function keydown_cb(e) {
    for (var i = 0; i < _sensors_cache.length; i++) {
        var sensor = _sensors_cache[i];

        if (sensor.type == ST_KEYBOARD && e.keyCode == sensor.key)
            sensor_set_value(sensor, 1);
    }

    if (_prev_def_keyboard_events)
        e.preventDefault();

    if (_callback_keyboard_events)
        _callback_keyboard_events(e);
}

function keyup_cb(e) {
    for (var i = 0; i < _sensors_cache.length; i++) {
        var sensor = _sensors_cache[i];

        // NOTE: hack to prevent wrong keyup with chrome/webkit
        if (sensor.type == ST_KEYBOARD && e.keyCode == 0 &&
                sensor.key == KEY_SHIFT)
            sensor_set_value(sensor, 0);

        if (sensor.type == ST_KEYBOARD && e.keyCode == sensor.key)
            sensor_set_value(sensor, 0);
    }

    if (_prev_def_keyboard_events)
        e.preventDefault();

    if (_callback_keyboard_events)
        _callback_keyboard_events(e);
}

function mouse_down_cb(e) {
    var pick = false;
    var selected_obj = null;

    _is_mouse_downed = true;
    _mouse_last_x = e.clientX;
    _mouse_last_y = e.clientY;
    _mouse_curr_x = e.clientX;
    _mouse_curr_y = e.clientY;

    for (var i = 0; i < _sensors_cache.length; i++) {
        var sensor = _sensors_cache[i];

        if (sensor.type == ST_MOUSE_CLICK) {
            sensor_set_value(sensor, 1);
            sensor.payload = e.which;
        }

        // update selection sensors
        if (sensor.type == ST_SELECTION) {
            if (!pick) {
                var canvas_xy = m_cont.client_to_canvas_coords(e.clientX, e.clientY, 
                        _vec2_tmp);
                selected_obj = m_obj.pick_object(canvas_xy[0], canvas_xy[1]);
                pick = true;
            }

            if (selected_obj == sensor.source_object)
                sensor.value = 1;
            else
                sensor.value = 0;
        }
    }

    if (_prev_def_mouse_events)
        e.preventDefault();

    if (_callback_mouse_events)
        _callback_mouse_events(e);
}

function mouse_up_cb(e) {
    for (var i = 0; i < _sensors_cache.length; i++) {
        var sensor = _sensors_cache[i];

        if (sensor.type == ST_MOUSE_CLICK) {
            sensor_set_value(sensor, 0);
        }

        if (sensor.type == ST_SELECTION && sensor.auto_release)
            sensor.value = 0;
    }

    _is_mouse_downed = false;

    if (_prev_def_mouse_events && !_allow_element_mouse_event)
        e.preventDefault();

    if (_callback_mouse_events)
        _callback_mouse_events(e);
}

function mouse_move_cb(e) {

    var x = e.clientX;
    var y = e.clientY;

    _mouse_curr_x = x;
    _mouse_curr_y = y;

    if (!cfg_dft.ie11_edge_touchscreen_hack || _is_mouse_downed) {
        var delta_x = (x - _mouse_last_x);
        var delta_y = (y - _mouse_last_y);

        var delta = Math.sqrt(delta_x*delta_x + delta_y*delta_y);

        for (var i = 0; i < _sensors_cache.length; i++) {
            var sensor = _sensors_cache[i];

            if (sensor.type === ST_MOUSE_MOVE) {
                switch (sensor.axis) {
                case "X":
                    sensor_set_value(sensor, delta_x);
                    sensor.payload = x;
                    break;
                case "Y":
                    sensor_set_value(sensor, delta_y);
                    sensor.payload = y;
                    break;
                case "XY":
                    sensor_set_value(sensor, delta);
                    sensor.payload[0] = x;
                    sensor.payload[1] = y;
                    break;
                }
            }
        }
    }

    if (_prev_def_mouse_events && !_allow_element_mouse_event)
        e.preventDefault();

    if (_callback_mouse_events)
        _callback_mouse_events(e);
}

function mouse_out_cb(e) {

    // do UP logic of the sensor
    
    if (!m_cont.is_child(e.relatedTarget))
        mouse_up_cb(e);
}

function mouse_wheel_cb(e) {

    // chrome || firefox (both deprecated)
    var wd = e.wheelDelta || -40 * e.detail;
    wd *= cfg_ctl.mouse_wheel_notch_multiplier;

    // accumulated
    _wheel_delta += wd;

    for (var i = 0; i < _sensors_cache.length; i++) {
        var sensor = _sensors_cache[i];

        if (sensor.type === ST_MOUSE_WHEEL)
            sensor_set_value(sensor, _wheel_delta);
    }

    if (_prev_def_wheel_events)
        e.preventDefault();

    if (_callback_wheel_events)
        _callback_wheel_events(e);
}

function touch_start_cb(e) {

    var touches = e.targetTouches;

    if (touches.length == 1) {
        var touch = touches[0];

        var x = touch.clientX;
        var y = touch.clientY;

        // update selection sensors
        var pick = false;
        var selected_obj = null;

        for (var i = 0; i < _sensors_cache.length; i++) {
            var sensor = _sensors_cache[i];
            if (sensor.type == ST_SELECTION) {
                if (!pick) {
                    var canvas_xy = m_cont.client_to_canvas_coords(x, y, _vec2_tmp);
                    selected_obj = m_obj.pick_object(canvas_xy[0], canvas_xy[1]);
                    pick = true;
                }
                sensor.value = (selected_obj == sensor.source_object);
            }
        }

        // reset coords from last touch session
        _touches_last_x[0] = x;
        _touches_last_x[1] = -1;
        _touches_last_y[0] = y;
        _touches_last_y[1] = -1;
    } else if (touches.length > 1) {
        var zoom_dist = touch_zoom_dist(touches);
        _touch_zoom_curr_dist = _touch_zoom_last_dist = zoom_dist;

        // reset coords from last touch session
        _touches_last_x[0] = touches[0].clientX;
        _touches_last_x[1] = touches[1].clientX;
        _touches_last_y[0] = touches[0].clientY;
        _touches_last_y[1] = touches[1].clientY;

        _touch_start_rot = touch_rotation(touches);
    }

    // reset coords from last touch session
    _touches_curr_x.set(_touches_last_x);
    _touches_curr_y.set(_touches_last_y);

    // NOTE: issues with picking on mobile platforms
    //if (_prev_def_touch_events)
    //    e.preventDefault();
    
    if (_callback_touch_events)
        _callback_touch_events(e);
}

function touch_move_cb(e) {

    var touches = e.targetTouches;

    if (touches.length === 0)
        return;

    if (touches.length === 1) { // panning
        _touches_curr_x[0] = touches[0].clientX;
        _touches_curr_x[1] = -1;
        _touches_curr_y[0] = touches[0].clientY;
        _touches_curr_y[1] = -1;

        var delta_x = (_touches_curr_x[0] - _touches_last_x[0]);
        var delta_y = (_touches_curr_y[0] - _touches_last_y[0]);
        var delta = Math.sqrt(delta_x * delta_x + delta_y * delta_y);

        // perform calculations for secondary touch point
        if (_touches_last_x[1] != -1 && _touches_last_y[1] != -1) {
            var delta_second_x = (_touches_curr_x[0] - _touches_last_x[1]);
            var delta_second_y = (_touches_curr_y[0] - _touches_last_y[1]);
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

        for (var i = 0; i < _sensors_cache.length; i++) {
            var sensor = _sensors_cache[i];

            if (sensor.type === ST_TOUCH_MOVE) {
                sensor.payload = exports.PL_SINGLE_TOUCH_MOVE;
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
            }
        }

    } else if (touches.length > 1) {
        _touches_curr_x[0] = touches[0].clientX;
        _touches_curr_x[1] = touches[1].clientX;
        _touches_curr_y[0] = touches[0].clientY;
        _touches_curr_y[1] = touches[1].clientY;

        var zoom_dist = touch_zoom_dist(touches);

        _touch_zoom_curr_dist = zoom_dist;

        var delta_dist = _touch_zoom_curr_dist - _touch_zoom_last_dist;

        var cur_center = _vec2_tmp;
        cur_center[0] = (_touches_curr_x[0] + _touches_curr_x[1]) / 2;
        cur_center[1] = (_touches_curr_y[0] + _touches_curr_y[1]) / 2;

        var last_center = _vec2_tmp2;
        last_center[0] = (_touches_last_x[0] + _touches_last_x[1]) / 2;
        last_center[1] = (_touches_last_y[0] + _touches_last_y[1]) / 2;
        var delta_centers = touch_center_dist(cur_center, last_center);

        // rotation
        var delta_rotation = touch_rotation(touches);

        for (var i = 0; i < _sensors_cache.length; i++) {
            var sensor = _sensors_cache[i];

            switch (sensor.type) {
            case ST_TOUCH_ZOOM:
                sensor.payload = exports.PL_MULTITOUCH_MOVE_ZOOM;
                sensor_set_value(sensor, delta_dist);
                break;
            case ST_TOUCH_MOVE:
                sensor.payload = exports.PL_MULTITOUCH_MOVE_PAN;
                switch(sensor.axis) {
                case "X":
                    var delta_x = cur_center[0] - last_center[0];
                    sensor_set_value(sensor, delta_x);
                    break;
                case "Y":
                    var delta_y = cur_center[1] - last_center[1];
                    sensor_set_value(sensor, delta_y);
                    break;
                case "XY":
                    sensor_set_value(sensor, delta_centers);
                    break;
                }
                break;
            case ST_TOUCH_ROTATE:
                sensor.payload = exports.PL_MULTITOUCH_MOVE_ROTATE;
                sensor_set_value(sensor, delta_rotation - _touch_start_rot);
                break;
            }
        }
    }

    if (_prev_def_touch_events)
        e.preventDefault();

    if (_callback_touch_events)
        _callback_touch_events(e);
}

function touch_end_cb(e) {

    var touches = e.targetTouches;

    if (touches.length == 0) {

        for (var i = 0; i < _sensors_cache.length; i++) {
            var sensor = _sensors_cache[i];
            if (sensor.type == ST_SELECTION && sensor.auto_release)
                sensor_set_value(sensor, 0);
        }
    }

    // NOTE: issues with picking on mobile platforms
    //if (_prev_def_touch_events)
    //    e.preventDefault();

    if (_callback_touch_events)
        _callback_touch_events(e);
}

function orient_handler_cb(e) {

    for (var i = 0; i < _sensors_cache.length; i++) {
        var sensor = _sensors_cache[i];
        if (sensor.type == ST_GYRO_DELTA || sensor.type == ST_GYRO_ANGLES) {
            // gamma is the left-to-right tilt in degrees, where right is positive
            // beta is the front-to-back tilt in degrees, where front is positive
            // alpha is the compass direction the device is facing in degrees
            sensor.gyro_beta_new = e.beta;
            sensor.gyro_gamma_new = e.gamma;
            sensor.gyro_alpha_new = e.alpha;
            if (!sensor.value) {
                sensor.gyro_gamma_last = e.gamma;
                sensor.gyro_beta_last = e.beta;
                sensor.gyro_alpha_last = e.alpha;
                // NOTE: always 1
                sensor_set_value(sensor, 1);
            }
        }
    }
}

function touch_center_dist(first, second) {
    var x = first[0] - second[0],
        y = first[1] - second[1];
    return Math.sqrt(x*x + y*y);
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

exports.register_keyboard_events = function(element, prevent_default) {
    element.addEventListener("keydown", keydown_cb, false);
    element.addEventListener("keyup", keyup_cb, false);

    _prev_def_keyboard_events = prevent_default;
}

exports.register_mouse_events = function(element, prevent_default,
                                         allow_element_exit) {

    if (allow_element_exit)
        var replace_elem = window;
    else {
        var replace_elem = element;

        replace_elem.addEventListener("mouseout", mouse_out_cb, false);
    }

    element.addEventListener("mousedown", mouse_down_cb, false);
    replace_elem.addEventListener("mousemove", mouse_move_cb, false);
    replace_elem.addEventListener("mouseup", mouse_up_cb, false);

    _prev_def_mouse_events = prevent_default;
    _allow_element_mouse_event = allow_element_exit;
}

exports.register_wheel_events = function(element, prevent_default) {
    // NOTE: both deprecated by the new WheelEvent
    element.addEventListener("mousewheel",     mouse_wheel_cb, false); // chrome
    element.addEventListener("DOMMouseScroll", mouse_wheel_cb, false); // firefox

    _prev_def_wheel_events = prevent_default;
}

exports.register_touch_events = function(element, prevent_default) {
    element.addEventListener("touchstart", touch_start_cb, false);
    element.addEventListener("touchend", touch_end_cb, false);
    element.addEventListener("touchmove",  touch_move_cb, false);

    // HACK: fix touch events issue on some mobile devices
    document.addEventListener("touchstart", function(){});

    _prev_def_touch_events = prevent_default;
}

exports.register_device_orientation = function() {
    if (window.DeviceOrientationEvent && cfg_dft.gyro_use)
        window.addEventListener("deviceorientation", orient_handler_cb, false); 
}

exports.unregister_keyboard_events = function(element) {
    element.removeEventListener("keydown", keydown_cb, false);
    element.removeEventListener("keyup", keyup_cb, false);
}

exports.unregister_mouse_events = function(element) {
    element.removeEventListener("mousedown", mouse_down_cb, false);
    element.removeEventListener("mousemove", mouse_move_cb, false);
    element.removeEventListener("mouseout", mouse_out_cb, false);
    element.removeEventListener("mouseup", mouse_up_cb, false);
}

exports.unregister_wheel_events = function(element) {
    // NOTE: both deprecated by the new WheelEvent
    element.removeEventListener("mousewheel",     mouse_wheel_cb, false); // chrome
    element.removeEventListener("DOMMouseScroll", mouse_wheel_cb, false); // firefox
}

exports.unregister_touch_events = function(element) {
    element.removeEventListener("touchstart", touch_start_cb, false);
    element.removeEventListener("touchmove",  touch_move_cb, false);

    // HACK: fix touch events issue on some mobile devices
    document.removeEventListener("touchstart", function(){});
}

exports.unregister_device_orientation = function() {
    if (window.DeviceOrientationEvent && cfg_dft.gyro_use)
        window.removeEventListener('deviceorientation', orient_handler_cb, false);
}
/**
 * Assign single keyboard callback for internal usage
 * @param {?EventListener} cb Callback
 */
exports.assign_keyboard_callback = function(cb) {
    _callback_keyboard_events = cb;
}
/**
 * Assign single mouse callback for internal usage
 * @param {?EventListener} cb Callback
 */
exports.assign_mouse_callback = function(cb) {
    _callback_mouse_events = cb;
}
/**
 * Assign single wheel callback for internal usage
 * @param {?EventListener} cb Callback
 */
exports.assign_wheel_callback = function(cb) {
    _callback_wheel_events = cb;
}
/**
 * Assign single touch callback for internal usage
 * @param {?EventListener} cb Callback
 */
exports.assign_touch_callback = function(cb) {
    _callback_touch_events = cb;
}

}
