"use strict";

/**
 * Controls API.
 *
 * <dl>
 *
 * <dt>Sensor</dt>
 * <dd>The sensor value is a result of some event occured on the scene, has
 * exactly one output value of type integer number (mostly 0 or 1)</dd>
 *
 * <dt>Sensor Manifold (or simply manifold)</dt>
 * <dd>A manifold of sensors. Has a single attached logic function, which performs
 * a logic operation on a set of sensor values. Generates a pulse based on the control
 * type and the logic function's result.</dd>
 * </dl>
 *
 * <p>Registering the user event callbacks is required to perform a correct
 * operation of input sensors, for more info see see *_cb() docs.
 * @module controls
 */
b4w.module["controls"] = function(exports, require) {

var m_ctl   = require("__controls");
var m_print = require("__print");

/**
 * Continuous control type.
 * Generates a positive pulse for each frame for the positive logic function.
 * Generates a single negative pulse for the negative logic function.
 * @const module:controls.CT_CONTINUOUS
 */
exports.CT_CONTINUOUS = m_ctl.CT_CONTINUOUS;

/**
 * Trigger control type.
 * Generates a single positive pulse for the positive logic function.
 * Generate a single negative pulse for the negative logic function.
 * @const module:controls.CT_TRIGGER
 */
exports.CT_TRIGGER = m_ctl.CT_TRIGGER;
/**
 * Shot control type.
 * Generates a single positive pulse for the positive logic function.
 * Produces no negative pulses.
 * @const module:controls.CT_SHOT
 */
exports.CT_SHOT = m_ctl.CT_SHOT;
/**
 * Level control type.
 * Generates a single positive pulse for each change of the manifold logic function
 * result. Produces no negative pulses.
 * @const module:controls.CT_LEVEL
 */
exports.CT_LEVEL = m_ctl.CT_LEVEL;

exports.KEY_SHIFT = 16;

exports.KEY_SPACE = 32;

exports.KEY_LEFT  = 37;
exports.KEY_UP    = 38;
exports.KEY_RIGHT = 39;
exports.KEY_DOWN = 40;

exports.KEY_NUM0 = 96;
exports.KEY_NUM1 = 97;
exports.KEY_NUM2 = 98;
exports.KEY_NUM3 = 99;
exports.KEY_NUM4 = 100;
exports.KEY_NUM5 = 101;
exports.KEY_NUM6 = 102;
exports.KEY_NUM7 = 103;
exports.KEY_NUM8 = 104;
exports.KEY_NUM9 = 105;

exports.KEY_A = 65;
exports.KEY_B = 66;
exports.KEY_C = 67;
exports.KEY_D = 68;
exports.KEY_E = 69;
exports.KEY_F = 70;
exports.KEY_G = 71;
exports.KEY_H = 72;
exports.KEY_I = 73;
exports.KEY_J = 74;
exports.KEY_K = 75;
exports.KEY_L = 76;
exports.KEY_M = 77;
exports.KEY_N = 78;
exports.KEY_O = 79;
exports.KEY_P = 80;
exports.KEY_Q = 81;
exports.KEY_R = 82;
exports.KEY_S = 83;
exports.KEY_T = 84;
exports.KEY_U = 85;
exports.KEY_V = 86;
exports.KEY_W = 87;
exports.KEY_X = 88;
exports.KEY_Y = 89;
exports.KEY_Z = 90;

exports.KEY_1 = 49;
exports.KEY_2 = 50;
exports.KEY_3 = 51;
exports.KEY_4 = 52;
exports.KEY_5 = 53;
exports.KEY_6 = 54;
exports.KEY_7 = 55;
exports.KEY_8 = 56;
exports.KEY_9 = 57;

// only when NUM LOCK is ON
exports.KEY_DEC_POINT = 110;

exports.KEY_SEMI_COLON    = 186;
exports.KEY_EQUAL_SIGN    = 187;
exports.KEY_COMMA         = 188;
exports.KEY_DASH          = 189;
exports.KEY_PERIOD        = 190;
exports.KEY_FORWARD_SLASH = 191;
exports.KEY_GRAVE_ACCENT  = 192;

exports.KEY_LEFT_SQ_BRACKET  = 219;
exports.KEY_BACK_SLASH       = 220;
exports.KEY_RIGHT_SQ_BRACKET = 221;
exports.KEY_SINGLE_QUOTE     = 222;


/**
 * Create a custom sensor.
 * Custom sensor controlled by set_custom_sensor()
 * @method module:controls.create_custom_sensor
 * @param {Number} value Initial custom sensor value
 * @returns {Object} Sensor object
 */
exports.create_custom_sensor = m_ctl.create_custom_sensor;
/**
 * Create a keyboard sensor.
 * @method module:controls.create_keyboard_sensor
 * @param {Number} key Sensor key KEY_*
 * @returns {Object} Sensor object
 */
exports.create_keyboard_sensor = m_ctl.create_keyboard_sensor;
/**
 * Create a collision sensor.
 * Performs detection of collisions between an object and an entity with a collision ID
 * @method module:controls.create_collision_sensor
 * @param {Object} obj Collision object ID
 * @param {String} collision_id Collision ID
 * @param {Boolean} need_payload Should sensor return collision point
 * @returns {Object} Sensor object
 */
exports.create_collision_sensor = m_ctl.create_collision_sensor;
/**
 * Create a collision impulse sensor.
 * Its value is the impulse applied at the collision point
 * @method module:controls.create_collision_impulse_sensor
 * @param {Object} obj Collision object ID
 * @returns {Object} Sensor object
 */
exports.create_collision_impulse_sensor = m_ctl.create_collision_impulse_sensor;
/**
 * Create a ray sensor.
 * Emits a ray from the object between start_offset and end_offset and checks the intersection
 * with an entity posessing a collision ID
 * @method module:controls.create_ray_sensor
 * @param {Object} obj Object ID
 * @param {Float32Array} start_offset Ray start point offset
 * @param {Float32Array} end_offset Ray end point offset
 * @param {Boolean} local_coords Consider offsets in object local space
 * @param {String} collision_id Destination collision ID
 * @returns {Object} Sensor object
 */
exports.create_ray_sensor = m_ctl.create_ray_sensor;
/**
 * Create a mouse click sensor.
 * @method module:controls.create_mouse_click_sensor
 * @returns {Object} Sensor object
 */
exports.create_mouse_click_sensor = m_ctl.create_mouse_click_sensor;
/**
 * Create a mouse wheel sensor.
 * The sensor's value is 1 for a single wheel notch scrolled away from the user
 * @method module:controls.create_mouse_wheel_sensor
 * @returns {Object} Sensor object
 */
exports.create_mouse_wheel_sensor = m_ctl.create_mouse_wheel_sensor;
/**
 * Create a mouse movement sensor.
 * The sensor's value is a number of pixels
 * @method module:controls.create_mouse_move_sensor
 * @param {String} [axis="XY"] Axis type "X", "Y", "XY"
 * @returns {Object} Sensor object
 */
exports.create_mouse_move_sensor = m_ctl.create_mouse_move_sensor;
/**
 * Create a touch movement sensor.
 * The sensor's value is a number of pixels
 * @method module:controls.create_touch_move_sensor
 * @param {String} [axis="XY"] Axis type "X", "Y", "XY"
 * @returns {Object} Sensor object
 */
exports.create_touch_move_sensor = m_ctl.create_touch_move_sensor;
/**
 * Create a touch zoom sensor.
 * The sensor's value is the distance delta in pixels
 * @method module:controls.create_touch_zoom_sensor
 * @returns {Object} Sensor object
 */
exports.create_touch_zoom_sensor = m_ctl.create_touch_zoom_sensor;
/**
 * Create a motion sensor.
 * The sensor's value is 1 if the object is in motion
 * @method module:controls.create_motion_sensor
 * @param {Object} obj Object ID
 * @param {Number} threshold Translation threshold per second
 * @param {Number} rotation_threshold Rotation threshold per second
 * @returns {Object} Sensor object
 */
exports.create_motion_sensor = m_ctl.create_motion_sensor;
/**
 * Create a velocity sensor.
 * The sensor's value is 1 if abs() of the object's vertical velocity exceeds the threshold
 * @method module:controls.create_vertical_velocity_sensor
 * @param {Object} obj Object ID
 * @param {Number} threshold Velocity threshold
 * @returns {Object} Sensor object
 */
exports.create_vertical_velocity_sensor = m_ctl.create_vertical_velocity_sensor;
/**
 * Create a timer sensor.
 * The sensor's value becomes 1 for the frame whcih comes next after the time period has elapsed.
 * Don't try to measure the period which is less than the frame's duration
 * @method module:controls.create_timer_sensor
 * @param {Number} period Timer period in seconds
 * @returns {Object} Sensor object
 */
exports.create_timer_sensor = m_ctl.create_timer_sensor;
/**
 * Reset the timer sensor.
 * @method module:controls.reset_timer_sensor
 * @param {Object} obj Object ID
 * @param {String} manifold_id Object's manifold ID
 * @param {Number} num Sensor number in manifold
 */
exports.reset_timer_sensor = m_ctl.reset_timer_sensor;
/**
 * Create an elapsed sensor.
 * The sensor's value is the time elapsed from the previous frame
 * @method module:controls.create_elapsed_sensor
 * @returns {Object} Sensor object
 */
exports.create_elapsed_sensor = m_ctl.create_elapsed_sensor;
/**
 * Create a timeline sensor.
 * The sensor's value is the global engine timeline
 * @method module:controls.create_timeline_sensor
 * @returns {Object} Sensor object
 */
exports.create_timeline_sensor = m_ctl.create_timeline_sensor;

/**
 * Create an object selection sensor.
 * The sensor's value become 1 for sensor on selected object, 0 for others
 * @method module:controls.create_selection_sensor
 * @returns {Object} Sensor object
 */
exports.create_selection_sensor = function(obj, auto_release) {
    return m_ctl.create_selection_sensor(obj, auto_release || false);
}

/**
 * Set the value of the custom sensor.
 * @method module:controls.set_custom_sensor
 * @param {Object} sensor Sensor object
 * @param {Number} value New sensor value
 */
exports.set_custom_sensor = function(sensor, value) {
    m_ctl.sensor_set_value(sensor, value);
}

/**
 * Get the value of the custom sensor.
 * @method module:controls.get_custom_sensor
 * @param {Object} sensor Sensor object
 * @returns {Number} Sensor value
 */
exports.get_custom_sensor = function(sensor, value) {
    return sensor.value;
}

/**
 * Return the sensor value.
 * @method module:controls.get_sensor_value
 * @param {?Object} obj Object ID or null for global object.
 * @param {String} manifold_id Object's manifold ID
 * @param {Number} num Sensor number in manifold
 * @returns {Number} Sensor value
 */
exports.get_sensor_value = m_ctl.get_sensor_value;

/**
 * Return the sensor payload data
 * @method module:controls.get_sensor_payload
 * @param {?Object} obj Object ID or null for global object.
 * @param {String} manifold_id Object's manifold ID
 * @param {Number} num Sensor number in manifold
 * @returns {*} Sensor payload
 */
exports.get_sensor_payload = m_ctl.get_sensor_payload;


exports.sensor_make_positive = function(sensor) {
    throw "Deprecated method execution";
}
exports.sensor_make_negative = function(sensor) {
    throw "Deprecated method execution";
}

/**
 * Create a sensor lock.
 * @method module:controls.create_sensor_lock
 * @param {Object} sensor Sensor object
 * @param {Array} lock_sensors The array of the sensors which lock the current sensor
 * @param lock_logic_fun Logic function
 * @deprecated Not necessary anymore
 */
exports.create_sensor_lock = function(sensor, lock_sensors, lock_logic_fun) {
    sensor.lock_sensors = lock_sensors.slice(0);
    // cache for logic function
    sensor.lock_sensor_values = new Array(lock_sensors.length);
    sensor.lock_logic_fun = lock_logic_fun || m_ctl.default_AND_logic_fun;
}
/**
 * Remove the sensor lock.
 * @method module:controls.remove_sensor_lock
 * @param {Object} sensor Sensor object
 * @deprecated Not necessary anymore
 */
exports.remove_sensor_lock = function(sensor) {
    sensor.lock_sensors = null;
    sensor.lock_sensor_values = null;
    sensor.lock_logic_fun = null;
}

/**
 * Function to handle a manifold's logic.
 * @callback manifold_logic_function
 * @param {Array} s Array with sensor values
 * @returns {Number} The result of a logic function
 */

/**
 * Manifold callback.
 * @callback manifold_callback
 * @param {?Object} obj Object ID or null for global object
 * @param {String} id Manifold ID
 * @param {Number} pulse Manifold pulse value
 * @param {*} [param] Callback param
 */

/**
 * Create a sensor manifold.
 * @method module:controls.create_sensor_manifold
 * @param {?Object} obj Object ID to attach the manifold to or null for global
 * object
 * @param {String} id New manifold ID
 * @param {Number} type Manifold control type
 * @param {Array} sensors Sensors in manifold
 * @param {manifold_logic_function} logic_fun Function to handle the manifold's logic
 * @param {manifold_callback} callback Manifold callback
 * @param {*} [callback_param] Param to pass to manifold callback (e.g some state)
 */
exports.create_sensor_manifold = function(obj, id, type, sensors,
                                          logic_fun, callback, callback_param) {

    callback_param = callback_param === undefined? null: callback_param;
    var logic_fun = logic_fun || m_ctl.default_AND_logic_fun;

    m_ctl.create_sensor_manifold(obj, id, type, sensors, logic_fun, callback,
                                 callback_param);
}


/**
 * Convenience function.
 * Create one keyboard sensor, create and attach a manifold.
 * @method module:controls.create_kb_sensor_manifold
 * @param {?Object} obj Object ID to attach the manifold to or null for global object
 * @param {String} id New manifold ID
 * @param {Number} type Manifold control type
 * @param {Number} key Keyboar key
 * @param {manifold_callback} callback Manifold callback
 * @param {*} [callback_param] Param to pass to manifold callback
 */
exports.create_kb_sensor_manifold = function(obj, id, type, key,
        callback, callback_param) {
    var kb_sensor = m_ctl.create_keyboard_sensor(key);

    callback_param = callback_param === undefined? null: callback_param;
    var logic_fun = m_ctl.default_AND_logic_fun;

    m_ctl.create_sensor_manifold(obj, id, type, [kb_sensor], logic_fun,
                                 callback, callback_param);
}

/**
 * Check whether an object has some manifold attached or not.
 * @method module:controls.check_sensor_manifolds
 * @param {?Object} obj Object ID or null for global object
 * @returns {Boolean} Check result
 */
exports.check_sensor_manifolds = function(obj) {
    return m_ctl.check_sensor_manifold(obj, null);
}

/**
 * Check whether an object has manifold attached or not.
 * @method module:controls.check_sensor_manifold
 * @param {?Object} obj Object ID or null for global object
 * @param {String} id Manifold ID
 * @returns {Boolean} Check result
 */
exports.check_sensor_manifold = m_ctl.check_sensor_manifold;

/**
 * Remove all sensor manifolds registered for the given object.
 * @method module:controls.remove_sensor_manifolds
 * @param {?Object} obj Object ID to delete manifolds from or null for global object
 * @deprecated Use remove_sensor_manifold with null manifold ID
 */
exports.remove_sensor_manifolds = function(obj) {
    m_ctl.remove_sensor_manifold(obj, null);
}
/**
 * Remove the sensor manifold registered for the given object.
 * @method module:controls.remove_sensor_manifold
 * @param {?Object} obj Object ID to delete manifolds from or null for global object
 * @param {String} [id=null] ID of the sensor manifold or null to delete all of
 * them
 */
exports.remove_sensor_manifold = m_ctl.remove_sensor_manifold;

/**
 * Reset controls for all the objects.
 * @method module:controls.reset
 */
exports.reset = m_ctl.reset;

/**
 * Register events for keyboard sensors (onkeydown, onkeyup).
 * @param {HTMLElement} element Target HTML element
 * @param {Boolean} prevent_default Prevent browser default actions for
 * registered events.
 * @method module:controls.register_keyboard_events
 */
exports.register_keyboard_events = m_ctl.register_keyboard_events;
/**
 * Register events for mouse sensors (onmousedown, onmouseup, onmousemove).
 * @param {HTMLElement} element Target HTML element
 * @param {Boolean} prevent_default Prevent browser default actions for
 * registered events.
 * @method module:controls.register_mouse_events
 */
exports.register_mouse_events = m_ctl.register_mouse_events;
/**
 * Register events for mouse wheel sensors (onmousewheel, DOMMouseScroll).
 * @param {HTMLElement} element Target HTML element
 * @param {Boolean} prevent_default Prevent browser default actions for
 * registered events.
 * @method module:controls.register_wheel_events
 */
exports.register_wheel_events = m_ctl.register_wheel_events;
/**
 * Register events for touchscreen sensors (touchstart, touchmove).
 * @param {HTMLElement} element Target HTML element
 * @param {Boolean} prevent_default Prevent browser default actions for
 * registered events.
 * @method module:controls.register_touch_events
 */
exports.register_touch_events = m_ctl.register_touch_events;

/**
 * Unregister events for keyboard sensors.
 * @param {HTMLElement} element Target HTML element
 * @method module:controls.unregister_keyboard_events
 */
exports.unregister_keyboard_events = m_ctl.unregister_keyboard_events;
/**
 * Unregister events for mouse sensors.
 * @param {HTMLElement} element Target HTML element
 * @method module:controls.unregister_mouse_events
 */
exports.unregister_mouse_events = m_ctl.unregister_mouse_events;
/**
 * Unregister events for mouse wheel sensors.
 * @param {HTMLElement} element Target HTML element
 * @method module:controls.unregister_wheel_events
 */
exports.unregister_wheel_events = m_ctl.unregister_wheel_events;
/**
 * Unregister events for touchscreen sensors.
 * @param {HTMLElement} element Target HTML element
 * @method module:controls.unregister_touch_events
 */
exports.unregister_touch_events = m_ctl.unregister_touch_events;
}
