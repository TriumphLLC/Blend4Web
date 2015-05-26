"use strict";

/**
 * Implements the event-driven model of Blend4Web.
 *
 * <dl>
 * <dt>Sensor</dt>
 *
 * <dd>Sensor is a programming entity intended for detecting events occured in
 * the scene. Some sensors may carry a payload. For example the
 * ray-tracing sensor (Ray Sensor)
 * provides the relative length of the intersection ray.</dd>
 *
 * <dt>Sensor Manifold (or simply manifold)</dt>
 *
 * <dd>Sensors should be present in one or multiple collections - so called
 * sensor manifolds. A manifold is a logic container associated with a scene
 * object. It generates a response (pulse) to a defined set of sensor events by
 * executing a callback function.</dd>
 * </dl>
 *
 * <p>In order to use the input-output sensors, register the corresponding event
 * listeners by using register_* methods.</p>
 *
 * @see https://www.blend4web.com/doc/en/developers.html#event-model
 *
 * @module controls
 * @local manifold_callback
 */
b4w.module["controls"] = function(exports, require) {

var m_ctl   = require("__controls");
var m_print = require("__print");

/**
 * Manifold control type: continuous.
 * Such manifold generates a positive pulse (+1) each frame when the result of
 * evaluation of its logic function is non-zero.
 * It generates a single negative pulse (-1) once the logic function
 * evaluates to zero.
 * @const module:controls.CT_CONTINUOUS
 */
exports.CT_CONTINUOUS = m_ctl.CT_CONTINUOUS;

/**
 * Manifold control type: trigger.
 * Such manifold generates a single positive pulse (+1) once the result of
 * evaluation of its logic function is non-zero.
 * It generates a single negative pulse (-1) once the logic function
 * evaluates to zero.
 * @const module:controls.CT_TRIGGER
 */
exports.CT_TRIGGER = m_ctl.CT_TRIGGER;

/**
 * Manifold control type: shot.
 * Such manifold generates a single positive pulse (+1) once the result of
 * evaluation of its logic function is non-zero.
 * Produces no negative pulses.
 * @const module:controls.CT_SHOT
 */
exports.CT_SHOT = m_ctl.CT_SHOT;

/**
 * Manifold control type: level.
 * Such manifold generates a single positive pulse (+1) once the result of
 * evaluation of its logic function is changed.
 * Produces no negative pulses.
 * @const module:controls.CT_LEVEL
 */
exports.CT_LEVEL = m_ctl.CT_LEVEL;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_BACKSPACE
 */
exports.KEY_BACKSPACE   = 8;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_TAB
 */
exports.KEY_TAB         = 9;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_ENTER
 */
exports.KEY_ENTER       = 13;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_SHIFT
 */
exports.KEY_SHIFT       = 16;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_CTRL
 */
exports.KEY_CTRL        = 17;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_ALT
 */
exports.KEY_ALT         = 18;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_PAUSE
 */
exports.KEY_PAUSE       = 19;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_CAPSLOCK
 */
exports.KEY_CAPSLOCK    = 20;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_ESC
 */
exports.KEY_ESC         = 27;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_SPACE
 */
exports.KEY_SPACE       = 32;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_LEFT
 */
exports.KEY_LEFT        = 37;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_UP
 */
exports.KEY_UP          = 38;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_RIGHT
 */
exports.KEY_RIGHT       = 39;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_DOWN
 */
exports.KEY_DOWN        = 40;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_1
 */
exports.KEY_1 = 49;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_2
 */
exports.KEY_2 = 50;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_3
 */
exports.KEY_3 = 51;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_4
 */
exports.KEY_4 = 52;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_5
 */
exports.KEY_5 = 53;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_6
 */
exports.KEY_6 = 54;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_7
 */
exports.KEY_7 = 55;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_8
 */
exports.KEY_8 = 56;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_9
 */
exports.KEY_9 = 57;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_A
 */
exports.KEY_A = 65;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_B
 */
exports.KEY_B = 66;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_C
 */
exports.KEY_C = 67;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_D
 */
exports.KEY_D = 68;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_E
 */
exports.KEY_E = 69;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_F
 */
exports.KEY_F = 70;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_G
 */
exports.KEY_G = 71;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_H
 */
exports.KEY_H = 72;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_I
 */
exports.KEY_I = 73;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_J
 */
exports.KEY_J = 74;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_K
 */
exports.KEY_K = 75;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_L
 */
exports.KEY_L = 76;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_M
 */
exports.KEY_M = 77;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_N
 */
exports.KEY_N = 78;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_O
 */
exports.KEY_O = 79;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_P
 */
exports.KEY_P = 80;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_Q
 */
exports.KEY_Q = 81;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_R
 */
exports.KEY_R = 82;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_S
 */
exports.KEY_S = 83;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_T
 */
exports.KEY_T = 84;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_U
 */
exports.KEY_U = 85;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_V
 */
exports.KEY_V = 86;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_W
 */
exports.KEY_W = 87;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_X
 */
exports.KEY_X = 88;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_Y
 */
exports.KEY_Y = 89;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_Z
 */
exports.KEY_Z = 90;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_NUM0
 */
exports.KEY_NUM0 = 96;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_NUM1
 */
exports.KEY_NUM1 = 97;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_NUM2
 */
exports.KEY_NUM2 = 98;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_NUM3
 */
exports.KEY_NUM3 = 99;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_NUM4
 */
exports.KEY_NUM4 = 100;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_NUM5
 */
exports.KEY_NUM5 = 101;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_NUM6
 */
exports.KEY_NUM6 = 102;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_NUM7
 */
exports.KEY_NUM7 = 103;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_NUM8
 */
exports.KEY_NUM8 = 104;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_NUM9
 */
exports.KEY_NUM9 = 105;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * Can only be used when NUM LOCK is turned on.
 * @const module:controls.KEY_DEC_POINT
 */
exports.KEY_DEC_POINT = 110;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_SEMI_COLON
 */
exports.KEY_SEMI_COLON    = 186;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_EQUAL_SIGN
 */
exports.KEY_EQUAL_SIGN    = 187;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_COMMA
 */
exports.KEY_COMMA         = 188;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_DASH
 */
exports.KEY_DASH          = 189;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_PERIOD
 */
exports.KEY_PERIOD        = 190;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_FORWARD_SLASH
 */
exports.KEY_FORWARD_SLASH = 191;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_GRAVE_ACCENT
 */
exports.KEY_GRAVE_ACCENT  = 192;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_LEFT_SQ_BRACKET
 */
exports.KEY_LEFT_SQ_BRACKET  = 219;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_BACK_SLASH
 */
exports.KEY_BACK_SLASH       = 220;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_RIGHT_SQ_BRACKET
 */
exports.KEY_RIGHT_SQ_BRACKET = 221;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_SINGLE_QUOTE
 */
exports.KEY_SINGLE_QUOTE     = 222;

/**
 * Payload value of a touch movement sensor. Returned by get_sensor_payload()
 * for single-finger pan gestures.
 * @const module:controls.PL_SINGLE_TOUCH_MOVE
 */
exports.PL_SINGLE_TOUCH_MOVE    = m_ctl.PL_SINGLE_TOUCH_MOVE;

/**
 * Payload value of a touch movement sensor. Returned by get_sensor_payload()
 * for multi-finger zoom gestures.
 * @const module:controls.PL_MULTITOUCH_MOVE_ZOOM
 */
exports.PL_MULTITOUCH_MOVE_ZOOM = m_ctl.PL_MULTITOUCH_MOVE_ZOOM;

/**
 * Payload value of a touch movement sensor. Returned by get_sensor_payload()
 * for multi-finger pan gestures.
 * @const module:controls.PL_MULTITOUCH_MOVE_PAN
 */
exports.PL_MULTITOUCH_MOVE_PAN  = m_ctl.PL_MULTITOUCH_MOVE_PAN;

/**
 * Create a custom sensor.
 * A custom sensor can be controlled manually by using the get_custom_sensor()
 * and set_custom_sensor() methods.
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
 * Detects collisions between the object and the entities (objects or physics
 * materials) with the specified collision ID. If the collision ID is not
 * specified, the sensor will detect collisions with any entities.
 * @method module:controls.create_collision_sensor
 * @param {Object} obj Collision object ID
 * @param {String} [collision_id="ANY"] Collision ID
 * @param {Boolean} [need_collision_pt=false] Should the sensor return the
 * collision point
 * @returns {Object} Sensor object
 */
exports.create_collision_sensor = m_ctl.create_collision_sensor;

/**
 * Create a collision impulse sensor.
 * It is intended to obtain the value of the impulse (that is, mass multiplied
 * by velocity) applied to the object at the collision point.
 * @method module:controls.create_collision_impulse_sensor
 * @param {Object} obj Collision object ID
 * @returns {Object} Sensor object
 */
exports.create_collision_impulse_sensor = m_ctl.create_collision_impulse_sensor;

/**
 * Create a ray sensor.
 * The sensor casts a ray between the start_offset and end_offset positions.
 * These positions are specified relatively to the object's origin, in the
 * world space (use_local_coords = false) or in the local space
 * (use_local_coords = true).
 * Checks intersection of this ray with the specified collision ID. If the
 * collision ID is not specified, the sensor will detect collisions with any
 * entities.
 * @method module:controls.create_ray_sensor
 * @param {Object} obj Object ID
 * @param {Float32Array} start_offset Start point offset for the ray
 * @param {Float32Array} end_offset End point offset for the ray
 * @param {Boolean} [use_local_coords=false] Whether the offsets are specified
 * in the local space of the object
 * @param {String} [collision_id="ANY"] Collision ID to detect intersection with
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
 * The sensor's value is 1 for a single wheel notch scrolled away from the user.
 * @method module:controls.create_mouse_wheel_sensor
 * @returns {Object} Sensor object
 */
exports.create_mouse_wheel_sensor = m_ctl.create_mouse_wheel_sensor;

/**
 * Create a mouse movement sensor.
 * The sensor's value is a number of pixels, the sensor's payload is (are)
 * coordinate(s).
 * @method module:controls.create_mouse_move_sensor
 * @param {String} [axis="XY"] Coordinate(s) to track: "X", "Y", "XY"
 * @returns {Object} Sensor object
 */
exports.create_mouse_move_sensor = m_ctl.create_mouse_move_sensor;

/**
 * Create a touch movement sensor.
 * The sensor's value is a number of pixels.
 * @method module:controls.create_touch_move_sensor
 * @param {String} [axis="XY"] Coordinate(s) to track: "X", "Y" or "XY"
 * @returns {Object} Sensor object
 */
exports.create_touch_move_sensor = m_ctl.create_touch_move_sensor;

/**
 * Create a touch zoom sensor.
 * The sensor's value is the distance difference in pixels.
 * @method module:controls.create_touch_zoom_sensor
 * @returns {Object} Sensor object
 */
exports.create_touch_zoom_sensor = m_ctl.create_touch_zoom_sensor;

/**
 * Create a motion sensor.
 * The sensor's value is 1 if the object is in motion.
 * @method module:controls.create_motion_sensor
 * @param {Object} obj Object ID
 * @param {Number} [threshold=0.1] Translation velocity threshold,
 * units (meters) per second
 * @param {Number} [rotation_threshold=0.1] Rotation velocity threshold,
 * radians per second
 * @returns {Object} Sensor object
 */
exports.create_motion_sensor = m_ctl.create_motion_sensor;

/**
 * Create a velocity sensor.
 * The sensor's value is 1 if abs() of the object's vertical velocity exceeds
 * the threshold.
 * @method module:controls.create_vertical_velocity_sensor
 * @param {Object} obj Object ID
 * @param {Number} [threshold=1.0] Vertical velocity threshold,
 * units (meters) per second
 * @returns {Object} Sensor object
 */
exports.create_vertical_velocity_sensor = m_ctl.create_vertical_velocity_sensor;

/**
 * Create a gyroscope angle sensor.
 * The sensor's payload stores the Euler angles of orientation
 * of a mobile device.
 * @method module:controls.create_gyroscope_angles_sensor
 * @returns {Object} Sensor object
 */
exports.create_gyro_angles_sensor = m_ctl.create_gyro_angles_sensor;

/**
 * Create a gyroscope delta sensor.
 * The sensor's payload stores the differences between Euler angles of the
 * current orientation and the previous orientation of a mobile device.
 * @method module:controls.create_gyroscope_angles_sensor
 * @returns {Object} Sensor object
 */
exports.create_gyro_delta_sensor = m_ctl.create_gyro_delta_sensor;

/**
 * Create a timer sensor.
 * The sensor's value becomes 1 for the frame which comes next after the
 * period of time has elapsed. After that, its value becomes 0 again.
 * The timer's precision depends on FPS, so it is not effective for measuring
 * short intervals.
 * @method module:controls.create_timer_sensor
 * @param {Number} period Timer period, in seconds
 * @param {Boolean} [do_repeat=false] Re-start the timer upon expiration
 * @returns {Object} Sensor object
 */
exports.create_timer_sensor = function(period, do_repeat) {
    return m_ctl.create_timer_sensor(period, do_repeat || false);
}

/**
 * Reset the timer sensor and set a new period value.
 * @method module:controls.reset_timer_sensor
 * @param {Object} obj Object ID
 * @param {String} manifold_id Object's manifold ID
 * @param {Number} num Sensor's number in the manifold
 * @param {Number} period A new period value for the sensor
 */
exports.reset_timer_sensor = m_ctl.reset_timer_sensor;

/**
 * Create an elapsed sensor.
 * The sensor's value is the time elapsed from the previous frame.
 * @method module:controls.create_elapsed_sensor
 * @returns {Object} Sensor object
 */
exports.create_elapsed_sensor = m_ctl.create_elapsed_sensor;

/**
 * Create a timeline sensor.
 * The sensor's value is the value of the global engine timeline.
 * @method module:controls.create_timeline_sensor
 * @returns {Object} Sensor object
 */
exports.create_timeline_sensor = m_ctl.create_timeline_sensor;

/**
 * Create a selection sensor for the object.
 * The sensor's value becomes 1 when the object is selected by the user.
 * @param {Object} obj Object ID
 * @param {Boolean} [auto_release=false] If true, reset the sensor (set it to 0)
 * when the mouse button/touch is released. If false, reset the sensor only when
 * another object is selected.
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
 * Return the value of the sensor from the object's manifold. The sensor is
 * identified by its index in the manifold's array of sensors.
 * @method module:controls.get_sensor_value
 * @param {?Object} obj Object ID, or null to denote the global object
 * @param {String} manifold_id Object's manifold ID
 * @param {Number} num Sensor index in manifold's array
 * @returns {Number} Sensor value
 */
exports.get_sensor_value = m_ctl.get_sensor_value;

/**
 * Return the payload data of the sensor from the object's manifold. The sensor
 * is identified by its index in the manifold's array of sensors.
 * @method module:controls.get_sensor_payload
 * @param {?Object} obj Object ID, or null to denote the global object
 * @param {String} manifold_id Object's manifold ID
 * @param {Number} num Sensor index in manifold's array
 * @returns {*} Sensor payload
 */
exports.get_sensor_payload = m_ctl.get_sensor_payload;

/**
 * Create a sensor lock.
 * @method module:controls.create_sensor_lock
 * @param {Object} sensor Sensor object
 * @param {Array} lock_sensors The array of the sensors which lock
 * the current sensor
 * @param lock_logic_fun Logic function
 * @deprecated Not necessary anymore
 */
exports.create_sensor_lock = function(sensor, lock_sensors, lock_logic_fun) {
    m_print.error("create_sensor_lock() deprecated");
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
    m_print.error("remove_sensor_lock() deprecated");
    sensor.lock_sensors = null;
    sensor.lock_sensor_values = null;
    sensor.lock_logic_fun = null;
}

/**
 * Manifold's logic function. Specifies a logic expression which consists of
 * sensor values. This logic expression will be evaluated every frame. As a
 * result, the manifold can generate a pulse according to its type (CT_SHOT,
 * CT_TRIGGER etc) and internal state, and fire the callback.
 * @callback manifold_logic_function
 * @param {Array} s Array with sensor values
 * @returns {Number} Result of evaluation of the logic expression
 */

/**
 * Manifold's callback. It is executed when the manifold generates a pulse.
 * @callback manifold_callback
 * @param {?Object} obj Object ID, or null to denote the global object
 * @param {String} id Manifold ID
 * @param {Number} pulse Manifold pulse value: +1 (all manifold types) or
 * -1 (CT_TRIGGER or CT_CONTINUOUS only).
 * @param {*} [param] Callback parameter. The user-defined parameter which is
 * passed to create_sensor_manifold(). Can be used, for example, as a storage
 * object to communicate between different manifolds.
 */

/**
 * Create a sensor manifold.
 * @method module:controls.create_sensor_manifold
 * @param {?Object} obj Object ID to attach the manifold to, or null to denote
 * the global object
 * @param {String} id New manifold ID
 * @param {Number} type Manifold control type (CT_SHOT, CT_TRIGGER etc)
 * @param {Array} sensors Array of sensors
 * @param {manifold_logic_function} logic_fun Manifold's logic function
 * @param {manifold_callback} callback Manifold's callback
 * @param {*} [callback_param] Parameter to pass to the manifold's callback
 * (e.g. some state)
 */
exports.create_sensor_manifold = function(obj, id, type, sensors,
                                          logic_fun, callback, callback_param) {

    callback_param = callback_param === undefined? null: callback_param;
    var logic_fun = logic_fun || m_ctl.default_AND_logic_fun;

    m_ctl.create_sensor_manifold(obj, id, type, sensors, logic_fun, callback,
                                 callback_param);
}

/**
 * Convenience function: creates a manifold coupled with a single keyboard
 * sensor. Can be used to quickly create a single-key functionality.
 * @method module:controls.create_kb_sensor_manifold
 * @param {?Object} obj Object ID to attach the manifold to, or null to denote
 * the global object
 * @param {String} id New manifold ID
 * @param {Number} type Manifold control type (CT_SHOT, CT_TRIGGER etc)
 * @param {Number} key Sensor key KEY_*
 * @param {manifold_callback} callback Manifold's callback
 * @param {*} [callback_param] Parameter to pass to the manifold's callback
 * (e.g. some state)
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
 * Check whether the object has any manifolds attached.
 * @method module:controls.check_sensor_manifolds
 * @param {?Object} obj Object ID, or null to denote the global object
 * @returns {Boolean} Result of the check
 */
exports.check_sensor_manifolds = function(obj) {
    return m_ctl.check_sensor_manifold(obj, null);
}

/**
 * Check whether the object has the manifold attached.
 * @method module:controls.check_sensor_manifold
 * @param {?Object} obj Object ID, or null to denote the global object
 * @param {String} id Manifold ID
 * @returns {Boolean} Result of the check
 */
exports.check_sensor_manifold = m_ctl.check_sensor_manifold;

/**
 * Remove all sensor manifolds registered for the object.
 * @method module:controls.remove_sensor_manifolds
 * @param {?Object} obj Object ID to delete manifolds from, or null to denote
 * the global object
 * @deprecated Use remove_sensor_manifold with null manifold ID instead
 */
exports.remove_sensor_manifolds = function(obj) {
    m_print.error("remove_sensor_manifolds() deprecated, use" +
        " remove_sensor_manifold() instead");
    m_ctl.remove_sensor_manifold(obj, null);
}

/**
 * Remove the sensor manifold registered for the object.
 * @method module:controls.remove_sensor_manifold
 * @param {?Object} obj Object ID to delete the manifold from, or null to denote
 * the global object
 * @param {String} [id=null] ID of the sensor manifold, or null to delete all
 * manifolds
 */
exports.remove_sensor_manifold = m_ctl.remove_sensor_manifold;

/**
 * Reset controls for all the objects.
 * Calling this method is discouraged, use remove_sensor_manifold() instead.
 * @method module:controls.reset
 */
exports.reset = m_ctl.reset;

/**
 * Add keyboard event listeners (keydown and keyup) to the HTML element.
 * Required for work of keyboard sensors.
 * @param {HTMLElement} element HTML element to add event listeners to
 * @param {Boolean} prevent_default Prevent browsers' default actions for
 * registered events.
 * @method module:controls.register_keyboard_events
 */
exports.register_keyboard_events = m_ctl.register_keyboard_events;

/**
 * Add mouse event listeners (mousedown, mouseup, mousemove and mouseout) to
 * the HTML element. Required for work of mouse click and
 * mouse movement sensors.
 * @param {HTMLElement} element HTML element to add event listeners to
 * @param {Boolean} prevent_default Prevent browser default actions for
 * registered events.
 * @param {Boolean} [allow_element_exit=false] Continue receiving mouse events
 * even when the mouse is leaving the HTML element
 * @method module:controls.register_mouse_events
 */
exports.register_mouse_events = function(element, prevent_default,
                                         allow_element_exit) {

    m_ctl.register_mouse_events(element, prevent_default, !!allow_element_exit);
}

/**
 * Add mouse wheel event listeners (mousewheel and DOMMouseScroll) to
 * the HTML element. Required for work of mouse wheel sensors.
 * @param {HTMLElement} element HTML element to add event listeners to
 * @param {Boolean} prevent_default Prevent browser default actions for
 * registered events.
 * @method module:controls.register_wheel_events
 */
exports.register_wheel_events = m_ctl.register_wheel_events;

/**
 * Add touch event listeners (touchstart and touchmove) to the HTML element.
 * Required for work of touch movement and touch zoom sensors.
 * @param {HTMLElement} element HTML element to add event listeners to
 * @param {Boolean} prevent_default Prevent browser default actions for
 * registered events.
 * @method module:controls.register_touch_events
 */
exports.register_touch_events = m_ctl.register_touch_events;

/**
 * Add device orientation event listener (deviceorientation) to the DOM window.
 * @method module:controls.register_device_orientation
 */
exports.register_device_orientation = m_ctl.register_device_orientation;

/**
 * Remove keyboard event listeners (keydown and keyup) from the HTML element.
 * @param {HTMLElement} element HTML element to remove event listeners from
 * @method module:controls.unregister_keyboard_events
 */
exports.unregister_keyboard_events = m_ctl.unregister_keyboard_events;

/**
 * Remove mouse event listeners (mousedown, mouseup, mousemove and mouseout)
 * from the HTML element.
 * @param {HTMLElement} element HTML element to remove event listeners from
 * @method module:controls.unregister_mouse_events
 */
exports.unregister_mouse_events = m_ctl.unregister_mouse_events;

/**
 * Remove mouse wheel event listeners (mousewheel and DOMMouseScroll) from
 * the HTML element.
 * @param {HTMLElement} element HTML element to remove event listeners from
 * @method module:controls.unregister_wheel_events
 */
exports.unregister_wheel_events = m_ctl.unregister_wheel_events;

/**
 * Remove touch event listeners (touchstart and touchmove) from the HTML
 * element.
 * @param {HTMLElement} element HTML element to remove event listeners from
 * @method module:controls.unregister_touch_events
 */
exports.unregister_touch_events = m_ctl.unregister_touch_events;

/**
 * Remove device orientation event listener (deviceorientation) from
 * the DOM window.
 * @method module:controls.unregister_device_orientation
 */
exports.unregister_device_orientation = m_ctl.unregister_device_orientation;

}
