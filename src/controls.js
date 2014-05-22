"use strict";

/**
 * Controls internal API.
 * @name controls
 * @namespace
 * @exports exports as controls
 */
b4w.module["__controls"] = function(exports, require) {

var m_cfg   = require("__config");
var m_print = require("__print");
var m_phy   = require("__physics");
var m_scs   = require("__scenes");
var m_util  = require("__util");

var m_vec3 = require("vec3");
var m_quat = require("quat");

var cfg_ctl = m_cfg.controls;

var _objects = [];
var _sensors = [];

// for ST_MOUSE_WHEEL sensor
var _wheel_delta = 0;

// for ST_MOUSE_MOVE sensor
var _mouse_curr_x = 0;
var _mouse_curr_y = 0;
var _mouse_last_x = 0;
var _mouse_last_y = 0;

// for ST_TOUCH_MOVE sensor
var _touch_curr_x = 0;
var _touch_curr_y = 0;
var _touch_last_x = 0;
var _touch_last_y = 0;

// for ST_TOUCH_ZOOM sensor
var _touch_zoom_curr_dist = 0;
var _touch_zoom_last_dist = 0;

var _timeline = 0;

// sensor types for internal usage
var ST_CUSTOM            = 10;
var ST_KEYBOARD          = 20;
var ST_MOUSE_WHEEL       = 30;
var ST_MOUSE_MOVE        = 40;
var ST_MOUSE_CLICK       = 50;
var ST_TOUCH_MOVE        = 60;
var ST_TOUCH_ZOOM        = 70;
var ST_COLLISION         = 80;
var ST_COLLISION_IMPULSE = 90;
var ST_RAY               = 100;
var ST_MOTION            = 110;
var ST_V_VELOCITY        = 120;
var ST_TIMER             = 130;
var ST_ELAPSED           = 140;
var ST_TIMELINE          = 150;

// control types
exports.CT_CONTINUOUS = 10;
exports.CT_TRIGGER    = 20;
exports.CT_SHOT       = 30;
exports.CT_LEVEL      = 40;

var SENSOR_SMOOTH_PERIOD = 0.3;

var KEY_SHIFT = 16;

exports.update = function(timeline, elapsed) {
    _timeline = timeline;

    var scene = m_scs.get_active();

    for (var i = 0; i < _sensors.length; i++) {
        var sensor = _sensors[i];
        update_sensor(sensor, timeline, elapsed);
    }

    for (var i = 0; i < _objects.length; i++) {
        var obj = _objects[i];

        for (var j in obj._sensor_manifolds) {
            var manifold = obj._sensor_manifolds[j];

            var logic_result = manifold_logic_result(manifold);
            var pulse = manifold_gen_pulse(manifold, logic_result);

            if (pulse) {
                manifold.callback(obj, j, pulse, manifold.callback_param);
                manifold.last_logic_result = logic_result;
            }

        }
    }

    // discharge after ALL callback exec
    for (var i = 0; i < _objects.length; i++) {
        var obj = _objects[i];

        for (var j in obj._sensor_manifolds) {
            var manifold = obj._sensor_manifolds[j];
            // TODO: consider using _sensors cache
            discharge_sensors(manifold.sensors);
        }
    }

    // update global values after ALL callback exec
    _wheel_delta = 0;
    
    _mouse_last_x = _mouse_curr_x;
    _mouse_last_y = _mouse_curr_y;

    _touch_last_x = _touch_curr_x;
    _touch_last_y = _touch_curr_y;

    _touch_zoom_last_dist = _touch_zoom_curr_dist;
}

exports.create_custom_sensor = function(value) {
    var sensor = init_sensor(ST_CUSTOM);
    sensor_set_value(value);
    return sensor;
}

function init_sensor(type) {
    var sensor = {};
    sensor.type = type;
    sensor.value = 0;
    sensor.payload = null;
    // for lock: sensors, values cache, logic function
    sensor.lock_sensors = null;
    sensor.lock_sensor_values = null;
    sensor.lock_logic_fun = null;

    return sensor;
}

exports.create_keyboard_sensor = function(key) {
    var sensor = init_sensor(ST_KEYBOARD);
    sensor.key = key;
    return sensor;
}

exports.create_collision_sensor = function(obj, collision_id,
                                           need_collision_pt) {

    if (!(obj && obj._physics)) {
        m_print.error("Wrong collision object");
        return null;
    }
    
    var sensor = init_sensor(ST_COLLISION);
    sensor.collision_obj = obj;
    sensor.collision_id = collision_id || null;

    sensor.collision_cb = function(is_collision, collision_point) {
        sensor_set_value(sensor, is_collision);

        if (is_collision && collision_point && need_collision_pt) {
            sensor.payload = sensor.payload || new Float32Array(3);
            sensor.payload[0] = collision_point[0];
            sensor.payload[1] = collision_point[1];
            sensor.payload[2] = collision_point[2];
        }
    }

    // NOTE: early activation (no manifolds taken in consideration)
    m_phy.append_collision_test(obj, sensor.collision_id, sensor.collision_cb,
                                need_collision_pt);
    return sensor;
}

exports.create_collision_impulse_sensor = function(obj) {
    if (!(obj && obj._physics)) {
        m_print.error("Wrong collision impulse object");
        return null;
    }
    
    var sensor = init_sensor(ST_COLLISION_IMPULSE);
    sensor.col_imp_obj = obj;
    sensor.col_imp_cb = function(impulse) {
        sensor_set_value(sensor, impulse);
    }

    // NOTE: early activation (no manifolds taken in consideration)
    m_phy.apply_collision_impulse_test(sensor.col_imp_obj, sensor.col_imp_cb);
    return sensor;
}

exports.create_ray_sensor = function(obj, start_offset, 
        end_offset, local_coords, collision_id) {

    if (!obj) {
        m_print.error("Wrong collision object");
        return null;
    }
    
    var sensor = init_sensor(ST_RAY);
    sensor.source_object = obj;
    sensor.start_offset = start_offset;
    sensor.end_offset = end_offset;
    sensor.local_coords = local_coords;
    sensor.collision_id = collision_id;

    sensor.ray_cb = function(is_hit, hit_frac) {
        sensor_set_value(sensor, is_hit);

        if (is_hit)
            sensor.payload = hit_frac;
    }
    // NOTE: early activation (no manifolds taken in consideration)
    m_phy.append_ray_test(obj, sensor.collision_id, start_offset, 
            end_offset, local_coords, sensor.ray_cb);
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
    return sensor;
}

exports.create_touch_move_sensor = function(axis) {
    var sensor = init_sensor(ST_TOUCH_MOVE);
    sensor.axis = axis || "XY";
    return sensor;
}

exports.create_touch_zoom_sensor = function() {
    var sensor = init_sensor(ST_TOUCH_ZOOM);
    return sensor;
}

exports.create_motion_sensor = function(obj, threshold, rotation_threshold) {

    if (!obj) {
        m_print.error("Wrong collision object");
        return null;
    }

    var sensor = init_sensor(ST_MOTION);

    sensor.source_object = obj;

    var trans = obj._render.trans;
    var quat = obj._render.quat;

    sensor.quat_temp = new Float32Array(4);
    sensor.trans_last = new Float32Array(trans);
    sensor.quat_last = new Float32Array(quat);

    sensor.avg_linear_vel = 0;
    sensor.avg_angular_vel = 0;

    sensor.threshold = threshold;
    sensor.rotation_threshold = rotation_threshold;

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

    var trans = obj._render.trans;
    var quat = obj._render.quat;

    sensor.trans_last = new Float32Array(trans);
    sensor.quat_last = new Float32Array(quat);

    sensor.avg_vertical_vel = 0;

    sensor.threshold = threshold;
    sensor.time_last = 0.0;

    sensor.payload = 0;

    return sensor;
}

exports.create_timer_sensor = function(period) {
    var sensor = init_sensor(ST_TIMER);
    sensor.period = period;
    sensor.time_last = _timeline;
    return sensor;
}

exports.reset_timer_sensor = function(obj, manifold_id, num, delay) {
    delay = delay || 0;

    var manifolds = obj._sensor_manifolds;

    if (!manifolds || !manifolds[manifold_id]) {
        m_print.error("reset_timer_sensor(): wrong object");
        return null;
    }

    var sensor = manifolds[manifold_id].sensors[num];
    if (!sensor) {
        m_print.error("reset_timer_sensor(): sensor not found");
        return null;
    }

    sensor.time_last = _timeline + delay;
}

exports.create_elapsed_sensor = function() {
    var sensor = init_sensor(ST_ELAPSED);
    sensor.time_last = 0.0;
    return sensor;
}

exports.create_timeline_sensor = function() {
    var sensor = init_sensor(ST_TIMELINE);
    return sensor;
}

exports.sensor_set_value = sensor_set_value;
function sensor_set_value(sensor, value) {

    if (lock_logic_result(sensor))
        return;

    sensor.value = Number(value);
}

/**
 * @returns true for locked sensor
 */
function lock_logic_result(sensor) {
    if (!sensor.lock_logic_fun)
        return false;

    // update sensor values before passing them to logic function
    // NOTE: maybe it's happening too often
    var sensors = sensor.lock_sensors;
    var values = sensor.lock_sensor_values;

    for (var i = 0; i < sensors.length; i++)
        values[i] = sensors[i].value;

    var logic_result = sensor.lock_logic_fun(values);
    return logic_result;
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


function update_sensor(sensor, timeline, elapsed) {
    if (!elapsed)
        return;

    var scene = m_scs.get_active();

    switch (sensor.type) {
    case ST_MOTION:

        var obj = sensor.source_object;

        var trans = obj._render.trans;
        var quat = obj._render.quat;

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
        var trans = obj._render.trans;

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
        if ((timeline - sensor.time_last) >= sensor.period) {
            sensor_set_value(sensor, 1);
            sensor.time_last = timeline;
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

    default:
        break;
    }
}

/**
 *  1 - positive pulse
 * -1 - negative pulse
 *  0 - no pulse
 */
function manifold_gen_pulse(manifold, logic_result) {

    var last_pulse = manifold.last_pulse;

    var pulse;
    var new_last_pulse;

    switch(manifold.type) {
    case exports.CT_CONTINUOUS:
        if (logic_result) {
            pulse = 1;
            new_last_pulse = 1;
        } else if (last_pulse == 1) {
            pulse = -1;
            new_last_pulse = -1;
        } else
            pulse = 0;

        break;
    case exports.CT_TRIGGER:
        if (logic_result && last_pulse == -1) {
            pulse = 1;
            new_last_pulse = 1;
        } else if (!logic_result && last_pulse == 1) {
            pulse = -1;
            new_last_pulse = -1;
        } else
            pulse = 0;

        break;
    case exports.CT_SHOT:
        if (logic_result && last_pulse == -1) {
            pulse = 1;
            new_last_pulse = 1;
        } else if (!logic_result && last_pulse == 1) {
            // give no ouput, but register negative pulse
            pulse = 0;
            new_last_pulse = -1;
        } else
            pulse = 0;

        break;

    case exports.CT_LEVEL:
        // ignore previous pulses
        var last_logic_result = manifold.last_logic_result;
        if (last_logic_result != logic_result)
            pulse = 1;
        else
            pulse = 0;
        break;
    default:
        throw "Wrong sensor manifold type: " + manifold.type;
        break;
    }

    if (new_last_pulse)
        manifold.last_pulse = new_last_pulse;

    return pulse;
}

/**
 * Manifold value is a value of first sensor.
 */
function manifold_get_value(manifold, logic_result) {
    
    if (logic_result)
        var value = manifold.sensors[0].value;
    else
        var value = 0.0;

    return value;
}

/**
 * Some sensors need to be discharged after pulse generation
 */
function discharge_sensors(sensors) {
    for (var i = 0; i < sensors.length; i++) {
        var sensor = sensors[i];

        switch(sensor.type) {
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
    _sensors = [];
    _timeline = 0;
}

exports.check_sensor_manifold = function(obj, id) {

    if (id)
        for (var i in obj._sensor_manifolds) {
            if (i === id)
                return true;
        }
    else
        for (var i in obj._sensor_manifolds)
            return true;

    return false;
}

exports.remove_sensor_manifold = function(obj, id) {
    var manifolds = obj._sensor_manifolds;

    if (id) {
        var manifold = manifolds[id];
        var sensors = manifold.sensors;
        for (var j = 0; j < sensors.length; j++)
            if (check_sensor_users(sensors[j], _objects) === 1) {
                remove_sensor(sensors[j], _sensors);
            }
        delete manifolds[id];
        
        // remove from objects if manifolds have 0 sensors
        if (!Object.getOwnPropertyNames(manifolds).length) {
            remove_from_objects(obj);
        }
        return;
    }

    // Remove all manifolds if id is not specified
    for (var i in manifolds) {
        var manifold = manifolds[i];
        var sensors = manifold.sensors;
        for (var j = 0; j < sensors.length; j++)
            if (check_sensor_users(sensors[j], _objects) === 1) {
                remove_sensor(sensors[j], _sensors);
            }
        delete manifolds[i];
    }
    remove_from_objects(obj);
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

function check_sensor_users(sensor, objects) {

    var users = 0;

    for (var i = 0; i < objects.length; i++) {

        var obj = objects[i];
        var manifolds = obj._sensor_manifolds;

        for (var j in manifolds) {
            var manifold = obj._sensor_manifolds[j];
            var sensors = manifold.sensors;

            for (var k = 0; k < sensors.length; k++)
                if (sensors[k] === sensor)
                    users++;
        }
    }

    return users;
}

/**
 * Remove sensor from given sensors array.
 * Physics sensors also require proper cleanup
 */
function remove_sensor(sensor, sensors) {
    switch (sensor.type) {
    case ST_COLLISION:
        m_phy.remove_collision_test(sensor.collision_obj, 
                sensor.collision_id, sensor.collision_cb);
        break;
    case ST_COLLISION_IMPULSE:
        m_phy.clear_collision_impulse_test(sensor.col_imp_obj);
        break;
    case ST_RAY:
        m_phy.remove_ray_test(sensor.source_object, sensor.collision_id, 
                sensor.start_offset, sensor.end_offset, sensor.local_coords);
        break;
    }

    var sens_index = sensors.indexOf(sensor);
    if (sens_index > -1)
        sensors.splice(sens_index, 1);
}

exports.create_sensor_manifold = function(obj, id, type, sensors, 
        logic_fun, callback, callback_param) {

    obj._sensor_manifolds = obj._sensor_manifolds || {};

    var manifold = {};
    manifold.name = name;
    manifold.type = type;
    manifold.sensors = sensors.slice(0);

    manifold.logic_fun = logic_fun || default_AND_logic_fun;
    // cache for logic function
    manifold.sensor_values = new Array(sensors.length);

    manifold.callback = callback;
    manifold.callback_param = callback_param || null;

    manifold.last_pulse = -1;
    // for LEVEL control type
    manifold.last_logic_result = 0;

    obj._sensor_manifolds[id] = manifold;

    if (_objects.indexOf(obj) == -1)
        _objects.push(obj);

    append_unique_sensors(manifold.sensors);
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
 * Append unique sensors to global _sensors array
 */
function append_unique_sensors(sensors) {
    for (var i = 0; i < sensors.length; i++) {
        var sensor = sensors[i];

        if (_sensors.indexOf(sensor) == -1)
            _sensors.push(sensor);
    }
}

exports.reset = function() {
    for (var i = 0; i < _objects.length; i++) {
        var obj = _objects[i];
        var manifolds = obj._sensor_manifolds;

        for (var j in manifolds)
            delete manifolds[j];
    }

    for (var i = 0; i < _sensors.length; i++) {
        remove_sensor(_sensors[i], _sensors);
        i--;
    }
    _objects.splice(0, _objects.length);
}

exports.debug = function() {
    var scene = m_scs.get_active();

    m_print.log(String(_objects.length) + " objects with manifolds", _objects);
    m_print.log(String(_sensors.length) + " sensors", _sensors);

    var collisions = [];
    var rays = [];
    
    for (var i = 0; i < _sensors.length; i++) {
        var sensor = _sensors[i];
        if (sensor.type == ST_COLLISION)
            collisions.push(sensor);
        if (sensor.type == ST_RAY)
            rays.push(sensor);
    }

    m_print.log(String(collisions.length) + " collision sensors", collisions);
    m_print.log(String(rays.length) + " ray sensors", rays);
}

exports.keydown_cb = function(e) {
    for (var i = 0; i < _sensors.length; i++) {
        var sensor = _sensors[i];

        if (sensor.type == ST_KEYBOARD && e.keyCode == sensor.key)
            sensor_set_value(sensor, 1);
    }
}

exports.keyup_cb = function(e) {
    for (var i = 0; i < _sensors.length; i++) {
        var sensor = _sensors[i];

        // NOTE: hack to prevent wrong keyup with chrome/webkit
        if (sensor.type == ST_KEYBOARD && e.keyCode == 0 && 
                sensor.key == KEY_SHIFT)
            sensor_set_value(sensor, 0);

        if (sensor.type == ST_KEYBOARD && e.keyCode == sensor.key)
            sensor_set_value(sensor, 0);
    }
}

exports.mouse_down_cb = function(e) {

    for (var i = 0; i < _sensors.length; i++) {
        var sensor = _sensors[i];

        if (sensor.type == ST_MOUSE_CLICK) {
            sensor_set_value(sensor, 1);
        }
    }
}

exports.mouse_up_cb = function(e) {
    for (var i = 0; i < _sensors.length; i++) {
        var sensor = _sensors[i];

        if (sensor.type == ST_MOUSE_CLICK) {
            sensor_set_value(sensor, 0);
        }
    }
}

exports.mouse_wheel_cb = function(e) {

    // chrome || firefox (both deprecated)
    var wd = e.wheelDelta || -40 * e.detail;
    wd *= cfg_ctl.mouse_wheel_notch_multiplier;

    // accumulated
    _wheel_delta += wd;

    for (var i = 0; i < _sensors.length; i++) {
        var sensor = _sensors[i];

        if (sensor.type === ST_MOUSE_WHEEL)
            sensor_set_value(sensor, _wheel_delta);
    }
}

exports.mouse_move_cb = function(e) {
    var x = e.clientX;
    var y = e.clientY;

    _mouse_curr_x = x;
    _mouse_curr_y = y;

    var delta_x = (x - _mouse_last_x);
    var delta_y = (y - _mouse_last_y);

    var delta = Math.sqrt(delta_x*delta_x + delta_y*delta_y);

    for (var i = 0; i < _sensors.length; i++) {
        var sensor = _sensors[i];

        if (sensor.type === ST_MOUSE_MOVE) {
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
}

exports.touch_start_cb = function(e) {

    var touches = e.targetTouches;

    if (touches.length == 1) {
        var touch = touches[0];

        var x = touch.pageX;
        var y = touch.pageY;

        // reset coords from last touch session
        _touch_curr_x = _touch_last_x = x;
        _touch_curr_y = _touch_last_y = y;

    } else if (touches.length > 1) {

        var zoom_dist = touch_zoom_dist(touches);

        _touch_zoom_curr_dist = _touch_zoom_last_dist = zoom_dist;
    }
}

exports.touch_move_cb = function(e) {

    var touches = e.targetTouches;

    if (touches.length === 0)
        return;

    // prevent default zoom/scrolling for e.g IOS devices
    e.preventDefault();

    if (touches.length === 1) { // panning

        var touch = touches[0];

        var x = touch.pageX;
        var y = touch.pageY;

        _touch_curr_x = x;
        _touch_curr_y = y;

        var delta_x = (x - _touch_last_x);
        var delta_y = (y - _touch_last_y);

        var delta = Math.sqrt(delta_x*delta_x + delta_y*delta_y);

        for (var i = 0; i < _sensors.length; i++) {
            var sensor = _sensors[i];

            if (sensor.type === ST_TOUCH_MOVE) {
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

    } else if (touches.length > 1) { // zooming

        var zoom_dist = touch_zoom_dist(touches);

        _touch_zoom_curr_dist = zoom_dist;

        var delta_dist = _touch_zoom_curr_dist - _touch_zoom_last_dist;

        for (var i = 0; i < _sensors.length; i++) {
            var sensor = _sensors[i];

            if (sensor.type === ST_TOUCH_ZOOM) 
                sensor_set_value(sensor, delta_dist);
        }
    }
} 

function touch_zoom_dist(touches) {

    var touch1 = touches[0];
    var touch2 = touches[1];

    var x1 = touch1.pageX;
    var y1 = touch1.pageY;

    var x2 = touch2.pageX;
    var y2 = touch2.pageY;

    var zoom_dist = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));

    return zoom_dist;
}

}
