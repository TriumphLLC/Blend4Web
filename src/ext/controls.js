"use strict";

/** 
 * Controls API.
 * Inspired by Blender Game Engine.
 * <dl>
 *
 * <dt>Sensor</dt>
 * <dd>based on the events occured on the scene, has exactly one output value (0 or 1)</dd>
 *
 * <dt>Sensor Manifold (or simply manifold)</dt>
 * <dd>A manifold of sensors. Has a single attached logic function, which performs 
 * a logic operation on a set of sensor values. Generates a pulse based on the control 
 * type and the logic function's result. Also has an output value which is equal to 
 * the output from the first sensor in the manifold.</dd>
 * </dl>
 *
 * <p>Registering the user input callbacks is required to perform a correct
 * operation of sensors, see *_cb() docs.
 * @module controls
 */
b4w.module["controls"] = function(exports, require) {

var m_print  = require("__print");
var controls = require("__controls");

/**
 * Continuous control type.
 * Generates a positive pulse for each frame for the positive logic function.
 * Generates a single negative pulse on the negative logic function.
 * @const module:controls.CT_CONTINUOUS
 */
exports["CT_CONTINUOUS"] = controls.CT_CONTINUOUS;

/**
 * Trigger control type.
 * Generate single positive pulse on positive logic function.
 * Generate single negative pulse on negative logic function.
 * @const module:controls.CT_TRIGGER
 */
exports["CT_TRIGGER"] = controls.CT_TRIGGER;
/**
 * Shot control type.
 * Generate single positive pulse on positive logic function.
 * Produces no negative pulses.
 * @const module:controls.CT_SHOT
 */
exports["CT_SHOT"] = controls.CT_SHOT;
/**
 * Level control type.
 * Generate single positive pulse for each change of manifold logic function
 * result. Produces no negative pulses.
 * @const module:controls.CT_LEVEL
 */
exports["CT_LEVEL"] = controls.CT_LEVEL;

exports["KEY_SHIFT"] = 16;

exports["KEY_SPACE"] = 32;

exports["KEY_LEFT"]  = 37;
exports["KEY_UP"]    = 38;
exports["KEY_RIGHT"] = 39;
exports["KEY_DOWN"] = 40;

exports["KEY_NUM0"] = 96;
exports["KEY_NUM1"] = 97;
exports["KEY_NUM2"] = 98;
exports["KEY_NUM3"] = 99;
exports["KEY_NUM4"] = 100;
exports["KEY_NUM5"] = 101;
exports["KEY_NUM6"] = 102;
exports["KEY_NUM7"] = 103;
exports["KEY_NUM8"] = 104;
exports["KEY_NUM9"] = 105;

exports["KEY_A"] = 65;
exports["KEY_B"] = 66;
exports["KEY_C"] = 67;
exports["KEY_D"] = 68;
exports["KEY_E"] = 69;
exports["KEY_F"] = 70;
exports["KEY_G"] = 71;
exports["KEY_H"] = 72;
exports["KEY_I"] = 73;
exports["KEY_J"] = 74;
exports["KEY_K"] = 75;
exports["KEY_L"] = 76;
exports["KEY_M"] = 77;
exports["KEY_N"] = 78;
exports["KEY_O"] = 79;
exports["KEY_P"] = 80;
exports["KEY_Q"] = 81;
exports["KEY_R"] = 82;
exports["KEY_S"] = 83;
exports["KEY_T"] = 84;
exports["KEY_U"] = 85;
exports["KEY_V"] = 86;
exports["KEY_W"] = 87;
exports["KEY_X"] = 88;
exports["KEY_Y"] = 89;
exports["KEY_Z"] = 90;

exports["KEY_1"] = 49;
exports["KEY_2"] = 50;
exports["KEY_3"] = 51;
exports["KEY_4"] = 52;
exports["KEY_5"] = 53;
exports["KEY_6"] = 54;
exports["KEY_7"] = 55;
exports["KEY_8"] = 56;
exports["KEY_9"] = 57;

// only when NUM LOCK is ON
exports["KEY_DEC_POINT"] = 110;

exports["KEY_SEMI_COLON"]    = 186;
exports["KEY_EQUAL_SIGN"]    = 187;
exports["KEY_COMMA"]         = 188;
exports["KEY_DASH"]          = 189;
exports["KEY_PERIOD"]        = 190;
exports["KEY_FORWARD_SLASH"] = 191;
exports["KEY_GRAVE_ACCENT"]  = 192;

exports["KEY_LEFT_SQ_BRACKET"]  = 219;
exports["KEY_BACK_SLASH"]       = 220;
exports["KEY_RIGHT_SQ_BRACKET"] = 221;
exports["KEY_SINGLE_QUOTE"]     = 222;

/**
 * Rotate camera horizontally
 * @const module:controls.H_ROT
 * @deprecated By new sensor-based api
 */
exports["H_ROT"] = 0;
/**
 * Rotate camera vertically
 * @const module:controls.V_ROT
 * @deprecated By new sensor-based api
 */
exports["V_ROT"] = 0;
/**
 * Translate camera horizontally
 * @const module:controls.H_TRA
 * @deprecated By new sensor-based api
 */
exports["H_TRA"] = 0;
/**
 * Translate camera vertically
 * @const module:controls.V_TRA
 * @deprecated By new sensor-based api
 */
exports["V_TRA"] = 0;
/**
 * Translate camera forward-backward
 * @const module:controls.F_TRA
 * @deprecated By new sensor-based api
 */
exports["F_TRA"] = 0;
/**
 * Jump
 * @const module:controls.JUMP
 * @deprecated By new sensor-based api
 */
exports["JUMP"] = 0;


/**
 * Translation along x axis
 * @const module:controls.X_TRA
 * @deprecated By new sensor-based api
 */
exports["X_TRA"] = 0;
/**
 * Translation along y axis
 * @const module:controls.Y_TRA
 * @deprecated By new sensor-based api
 */
exports["Y_TRA"] = 0;
/**
 * Translation along z axis
 * @const module:controls.Z_TRA
 * @deprecated By new sensor-based api
 */
exports["Z_TRA"] = 0;

/**
 * Set object control.
 * @method module:controls.set
 * @param bpy_obj Object ID
 * @param control_id Control ID
 * @param [value=1] Control value
 * @deprecated By new sensor-based api
 */
exports["set"] = function() {
    m_print.error("set() deprecated, use new sensor-based API");
}
/**
 * Get object control value.
 * @method module:controls.get
 * @param bpy_obj Object ID
 * @param control_id Control ID
 * @returns Control value
 * @deprecated By new sensor-based api
 */
exports["get"] = function() {
    m_print.error("get() deprecated, use new sensor-based API");
    return null;
}
/**
 * Get object control type.
 * @method module:controls.get_type
 * @param bpy_obj Object ID
 * @param control_id Control ID
 * @returns Control type or null in case of missing control
 * @deprecated By new sensor-based api
 */
exports["get_type"] = function() {
    m_print.error("get_type() deprecated, use new sensor-based API");
    return null;
}
/**
 * Release object control
 * @method module:controls.release
 * @param bpy_obj Object ID
 * @param control_id Control ID
 * @deprecated By new sensor-based api
 */
exports["release"] = function() {
    m_print.error("release() deprecated, use new sensor-based API");
}


/**
 * Create custom sensor.
 * Custom sensor controlled by set_custom_sensor()
 * @method module:controls.create_custom_sensor
 * @param value Initial custom sensor value
 * @returns Sensor object
 */
exports["create_custom_sensor"] = controls.create_custom_sensor;
/**
 * Create keyboard sensor.
 * @method module:controls.create_keyboard_sensor
 * @param key Sensor key
 * @returns Sensor object
 */
exports["create_keyboard_sensor"] = controls.create_keyboard_sensor;
/**
 * Create collision sensor.
 * performs detection of collision between object and collision ID
 * @method module:controls.create_collision_sensor
 * @param obj Collision object ID
 * @param {String} collision_id Collision ID
 * @param {Boolean} need_payload Should sensor return collision point
 * @returns Sensor object
 */
exports["create_collision_sensor"] = controls.create_collision_sensor;
/**
 * Create collision impulse sensor.
 * value is impulse applied on collision point
 * @method module:controls.create_collision_impulse_sensor
 * @param obj Collision object ID
 * @returns Sensor object
 */
exports["create_collision_impulse_sensor"] = controls.create_collision_impulse_sensor;
/**
 * Create ray sensor.
 * Emits ray from object at start_offset to end_offset and checks intersection
 * with collision ID
 * @method module:controls.create_ray_sensor
 * @param obj Object ID
 * @param {vec3} start_offset Ray start point offset
 * @param {vec3} end_offset Ray end point offset
 * @param {Boolean} local_coords Consider offsets in object local space
 * @param {String} collision_id Destination collision ID
 * @returns Sensor object
 */
exports["create_ray_sensor"] = controls.create_ray_sensor;
/**
 * Create mouse click sensor.
 * @method module:controls.create_mouse_click_sensor
 * @returns Sensor object
 */
exports["create_mouse_click_sensor"] = controls.create_mouse_click_sensor;
/**
 * Create mouse wheel sensor.
 * Sensor value is 1 for single wheel notch scrolled away from the user
 * @method module:controls.create_mouse_wheel_sensor
 * @returns Sensor object
 */
exports["create_mouse_wheel_sensor"] = controls.create_mouse_wheel_sensor;
/**
 * Create mouse move sensor.
 * Sensor value is a number of pixels
 * @method module:controls.create_mouse_move_sensor
 * @param [axis="XY"] Axis type "X", "Y", "XY"
 * @returns Sensor object
 */
exports["create_mouse_move_sensor"] = controls.create_mouse_move_sensor;
/**
 * Create touch move sensor.
 * Sensor value is a number of pixels
 * @method module:controls.create_touch_move_sensor
 * @param [axis="XY"] Axis type "X", "Y", "XY"
 * @returns Sensor object
 */
exports["create_touch_move_sensor"] = controls.create_touch_move_sensor;
/**
 * Create touch zoom sensor.
 * Sensor value is distance delta in pixels
 * @method module:controls.create_touch_zoom_sensor
 * @returns Sensor object
 */
exports["create_touch_zoom_sensor"] = controls.create_touch_zoom_sensor;
/**
 * Create motion sensor.
 * Sensor value is 1 if object is in motion
 * @method module:controls.create_motion_sensor
 * @param obj Object ID
 * @param threshold Tranlation threshold per second
 * @param rotation_threshold Rotation threshold per second
 * @returns Sensor object
 */
exports["create_motion_sensor"] = controls.create_motion_sensor;
/**
 * Create velocity sensor.
 * Sensor value is 1 if abs() of object vertical velocity exceeds threshold
 * @method module:controls.create_vertical_velocity_sensor
 * @param obj Object ID
 * @param threshold Velocity threshold
 * @returns Sensor object
 */
exports["create_vertical_velocity_sensor"] = controls.create_vertical_velocity_sensor;
/**
 * Create timer sensor.
 * Sensor value is 1 for frame after given period elapsed.
 * Don't try to measure periods less than frame duration
 * @method module:controls.create_timer_sensor
 * @param period Timer period in seconds
 * @returns Sensor object
 */
exports["create_timer_sensor"] = controls.create_timer_sensor;
/**
 * Reset timer sensor.
 * @method module:controls.reset_timer_sensor
 * @param obj Object ID
 * @param manifold_id Object's manifold ID 
 * @param num Sensor number in manifold
 */
exports["reset_timer_sensor"] = controls.reset_timer_sensor;
/**
 * Create elapsed sensor.
 * Sensor value is time elapsed from previous frame
 * @method module:controls.create_elapsed_sensor
 * @returns Sensor object
 */
exports["create_elapsed_sensor"] = controls.create_elapsed_sensor;
/**
 * Create timeline sensor.
 * Sensor value is global engine timeline 
 * @method module:controls.create_timeline_sensor
 * @returns Sensor object
 */
exports["create_timeline_sensor"] = controls.create_timeline_sensor;


/**
 * Set value of custom sensor.
 * @method module:controls.set_custom_sensor
 */
exports["set_custom_sensor"] = function(sensor, value) {
    controls.sensor_set_value(sensor, value);
}

/**
 * Get value of custom sensor.
 * @method module:controls.get_custom_sensor
 */
exports["get_custom_sensor"] = function(sensor, value) {
    return sensor.value;
}

/**
 * Return sensor value
 * @method module:controls.get_sensor_value
 * @param obj Object ID
 * @param manifold_id Object's manifold ID 
 * @param num Sensor number in manifold
 */
exports["get_sensor_value"] = function(obj, manifold_id, num) {

    var manifolds = obj._sensor_manifolds;

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

/**
 * Return sensor payload data
 * @method module:controls.get_sensor_payload
 * @param obj Object ID
 * @param manifold_id Object's manifold ID 
 * @param num Sensor number in manifold
 */
exports["get_sensor_payload"] = function(obj, manifold_id, num) {

    var manifolds = obj._sensor_manifolds;

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

exports["sensor_make_positive"] = function(sensor) {
    throw "Deprecated method execution";
}
exports["sensor_make_negative"] = function(sensor) {
    throw "Deprecated method execution";
}

/**
 * Create sensor lock.
 * @method module:controls.create_sensor_lock
 */
exports["create_sensor_lock"] = function(sensor, lock_sensors, lock_logic_fun) {
    sensor.lock_sensors = lock_sensors.slice(0);
    // cache for logic function
    sensor.lock_sensor_values = new Array(lock_sensors.length);
    sensor.lock_logic_fun = lock_logic_fun || controls.default_AND_logic_fun;
}
/**
 * Remove sensor lock.
 * @method module:controls.remove_sensor_lock
 */
exports["remove_sensor_lock"] = function(sensor) {
    sensor.lock_sensors = null;
    sensor.lock_sensor_values = null;
    sensor.lock_logic_fun = null;
}

/**
 * Function to handle manifold logic
 * @callback manifold_logic_function
 * @param {Array} s Array with sensor values
 */

/**
 * Manifold callback
 * @callback manifold_callback
 * @param obj Object ID
 * @param id Manifold ID
 * @param pulse Manifold pulse value
 * @param [param] Callback param
 */

/**
 * Create sensor manifold.
 * @method module:controls.create_sensor_manifold
 * @param obj Object ID to attach manifold to
 * @param id New manifold ID
 * @param type Manifold control type
 * @param {Array} sensors Sensors in manifold
 * @param {manifold_logic_function} logic_fun Function to handle manifold logic
 * @param {manifold_callback} callback Manifold callback
 * @param [callback_param] Param to pass to manifold callback
 */
exports["create_sensor_manifold"] = controls.create_sensor_manifold;

/**
 * Convenience function.
 * Create one keyboard sensor, create and attach manifold.
 * @method module:controls.create_kb_sensor_manifold
 */
exports["create_kb_sensor_manifold"] = function(obj, id, type, key, 
        callback, callback_param) {
    var kb_sensor = controls.create_keyboard_sensor(key);
    controls.create_sensor_manifold(obj, id, type, [kb_sensor], null,
            callback, callback_param);
}

exports["check_sensor_manifolds"] = function(obj) {
    return controls.check_sensor_manifold(obj, null);
}

exports["check_sensor_manifold"] = controls.check_sensor_manifold;

/**
 * Remove all sensor manifolds registered for given object.
 * @method module:controls.remove_sensor_manifolds
 * @param obj Object ID to delete manifolds from
 * @deprecated Use remove_sensor_manifold with null manifold ID
 */
exports["remove_sensor_manifolds"] = function(obj) {
    controls.remove_sensor_manifold(obj, null);
}
/**
 * Remove sensor manifold registered for given object.
 * @method module:controls.remove_sensor_manifold
 * @param obj Object ID to delete manifolds from
 * @param {String} [id=null] ID of sensor manifold or null to delete all of
 * them
 */
exports["remove_sensor_manifold"] = controls.remove_sensor_manifold; 

/**
 * Reset controls for all objects.
 * @method module:controls.reset
 */
exports["reset"] = controls.reset;

/**
 * Key-down callback.
 * Should be executed by external event callback.
 * @method module:controls.keydown_cb
 */
exports["keydown_cb"] = controls.keydown_cb;
/**
 * Key-up callback. 
 * Should be executed by external event callback.
 * @method module:controls.keyup_cb
 */
exports["keyup_cb"] = controls.keyup_cb;
/**
 * Mouse click callback. Should be executed by external event callback.
 * @method module:controls.mouse_down_cb
 */
exports["mouse_down_cb"] = controls.mouse_down_cb;
/**
 * Mouse click callback. Should be executed by external event callback.
 * @method module:controls.mouse_up_cb
 */
exports["mouse_up_cb"] = controls.mouse_up_cb;
/**
 * Mouse-wheel callback. Should be executed by external event callback.
 * @method module:controls.mouse_wheel_cb
 */
exports["mouse_wheel_cb"] = controls.mouse_wheel_cb;
/**
 * mousemove event handler
 */
exports["mouse_move_cb"] = controls.mouse_move_cb;
/**
 * touchstart event handler
 */
exports["touch_start_cb"] = controls.touch_start_cb;
/**
 * touchmove event handler
 */
exports["touch_move_cb"] = controls.touch_move_cb;

}
