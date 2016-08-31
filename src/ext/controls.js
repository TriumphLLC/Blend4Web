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
 * @local ManifoldCallback
 * @local ManifoldLogicFunction
 * @local CollisionPayload
 * @local RayPayload
 * @local SensorCallback
 */
b4w.module["controls"] = function(exports, require) {

var m_ctl   = require("__controls");
var m_print = require("__print");

/**
 * Manifold's callback. It is executed when the manifold generates a pulse.
 * @callback ManifoldCallback
 * @param {?Object3D} obj Object 3D, or null to denote the global object
 * @param {String} id Manifold ID
 * @param {Number} pulse Additional callback condition for CT_TRIGGER or
 * CT_CONTINOUS manifolds: +1 or -1
 * @param {*} [param] Callback parameter. The user-defined parameter which is
 * passed to create_sensor_manifold(). Can be used, for example, as a storage
 * object to communicate between different manifolds.
 */
/**
 * Manifold's logic function. Specifies a logic expression which consists of
 * sensor values. This logic expression will be evaluated every frame. As a
 * result, the manifold changes its internal state and fires the callback.
 * @callback ManifoldLogicFunction
 * @param {Array} s Numeric array with sensor values.
 * @returns {Number} Result of evaluation of the logic expression
 */
/**
 * Collision sensor payload.
 * @callback CollisionPayload
 * @param {?Object3D} coll_obj The target collision object, i.e the object
 * the source object collides with (null for no collision or when this object
 * is represented by collision material).
 * @param {?Vec3} coll_pos Position of collision point.
 * @param {?Vec3} coll_norm Normal of collision point.
 * @param {?Number} coll_dist Distance between collision points of colliding
 * objects.
 */
/**
 * Ray sensor payload.
 * @callback RayPayload
 * @param {Number} hit_fract Fraction of ray length where hit has occured (0-1)
 * or -1 if there is no hit anymore.
 * @param {?Object3D} obj_hit The hit object.
 * @param {Number} hit_time Time the hit happened.
 * @param {Vec3} hit_pos Hit position in world space.
 * @param {Vec3} hit_norm Hit normal in world space.
 */
/**
 * Special callback for callback-sensor. It's executed every frame and
 * its return value is copied into the sensor value. Should return a numeric value.
 * @callback SensorCallback
 */

/**
 * Manifold control type: positive.
 * Such manifold executes the callback each frame when the result of
 * evaluation of its logic function is positive.
 * @const module:controls.CT_POSITIVE
 */
exports.CT_POSITIVE = m_ctl.CT_POSITIVE;

/**
 * Manifold control type: continuous.
 * Such manifold executes the callback with a positive pulse (+1) each frame
 * when the result of evaluation of its logic function is non-zero.
 * It executes a callback with a negative pulse (-1) once the logic function
 * evaluates to zero.
 * @const module:controls.CT_CONTINUOUS
 */
exports.CT_CONTINUOUS = m_ctl.CT_CONTINUOUS;

/**
 * Manifold control type: trigger.
 * Such manifold executes the callback with a single positive pulse (+1) once the result of
 * evaluation of its logic function is non-zero.
 * It executes a callback with a single negative pulse (-1) once the logic function
 * evaluates to zero.
 * @const module:controls.CT_TRIGGER
 */
exports.CT_TRIGGER = m_ctl.CT_TRIGGER;

/**
 * Manifold control type: shot.
 * Such manifold executes the callback once the result of evaluation of its
 * logic function becomes a non-zero value.
 * @const module:controls.CT_SHOT
 */
exports.CT_SHOT = m_ctl.CT_SHOT;

/**
 * Manifold control type: level.
 * Such manifold executes the callback each time the result of
 * evaluation of its logic function is changed.
 * @const module:controls.CT_LEVEL
 */
exports.CT_LEVEL = m_ctl.CT_LEVEL;

/**
 * Manifold control type: change.
 * Such manifold executes the callback each time the value
 * of any sensor is changed. The logic function is ignored.
 * @const module:controls.CT_CHANGE
 */
exports.CT_CHANGE = m_ctl.CT_CHANGE;

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
 * @const module:controls.KEY_NUM9
 */
exports.KEY_MULT = 106;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_NUM9
 */
exports.KEY_ADD = 107;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_NUM9
 */
exports.KEY_SUB = 109;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * Can only be used when NUM LOCK is turned on.
 * @const module:controls.KEY_DEC_POINT
 */
exports.KEY_DEC_POINT = 110;

/**
 * Keyboard sensor parameter. Corresponds to keyCode property of KeyboardEvent.
 * @const module:controls.KEY_NUM9
 */
exports.KEY_DIV = 111;

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
 * Payload value of a touch movement sensor. Returned by get_sensor_payload()
 * for multi-finger rotate gestures.
 * @const module:controls.PL_MULTITOUCH_MOVE_ROTATE
 */
exports.PL_MULTITOUCH_MOVE_ROTATE  = m_ctl.PL_MULTITOUCH_MOVE_ROTATE;
/**
 * Create a gamepad button sensor.
 * @method module:controls.create_gamepad_btn_sensor
 * @param {Number} ind Button number
 * @param {Number} [number] Connected gamepad number
 * @returns {Sensor} Sensor object
 */
exports.create_gamepad_btn_sensor = m_ctl.create_gamepad_btn_sensor;
/**
 * Create a gamepad an axis sensor.
 * @method module:controls.create_gamepad_axis_sensor
 * @param {Number} axis Axis number
 * @param {Number} [number] Connected gamepad number
 * @returns {Sensor} Sensor object
 */
exports.create_gamepad_axis_sensor = m_ctl.create_gamepad_axis_sensor;
/**
 * Create a custom sensor.
 * A custom sensor can be controlled manually by using the get_custom_sensor()
 * and set_custom_sensor() methods.
 * @method module:controls.create_custom_sensor
 * @param {Number} value Initial custom sensor value
 * @returns {Sensor} Sensor object
 */
exports.create_custom_sensor = m_ctl.create_custom_sensor;

/**
 * Create a keyboard sensor.
 * This sensor carries the following payload values:
 * 0 --- button wasn't pressed at the last frame, and it wasn't pressed at the current frame,
 * 1 --- button wasn't pressed at the last frame, but it was pressed at the current frame,
 * 2 --- button was pressed at the last frame, and it was pressed at the current frame,
 * 3 --- button was pressed at the last frame, and it wasn't pressed at the current frame.
 * @method module:controls.create_keyboard_sensor
 * @param {Number} key Sensor key KEY_*
 * @param {HTMLElement} [element=Canvas container element] HTML element
 * @returns {Sensor} Sensor object
 */
exports.create_keyboard_sensor = m_ctl.create_keyboard_sensor;

/**
 * Create a collision sensor.
 * Detects collisions between the object and the entities (objects or physics
 * materials) with the specified collision ID. If the collision ID is not
 * specified, the sensor will detect collisions with any entities.
 * This sensor carries the following {@link module:controls~CollisionPayload|payload}.
 * @method module:controls.create_collision_sensor
 * @param {Object3D} obj_src Collision object.
 * @param {?String} [collision_id="ANY"] Collision ID
 * @param {Boolean} [calc_pos_norm=false] Should the sensor return the
 * collision position/normal/distance or not.
 * @returns {Sensor} Sensor object
 * @cc_externs coll_obj coll_pos coll_norm coll_dist
 */
exports.create_collision_sensor = function(obj_src, collision_id, calc_pos_norm) {
    collision_id = collision_id || "ANY";
    calc_pos_norm = calc_pos_norm || false;

    return m_ctl.create_collision_sensor(obj_src, collision_id, calc_pos_norm);
}

/**
 * Create a collision impulse sensor.
 * It is intended to obtain the value of the impulse (that is, mass multiplied
 * by velocity) applied to the object at the collision point.
 * @method module:controls.create_collision_impulse_sensor
 * @param {Object3D} obj Collision object.
 * @returns {Sensor} Sensor object
 */
exports.create_collision_impulse_sensor = m_ctl.create_collision_impulse_sensor;

/**
 * Create a ray sensor.
 * The sensor casts a ray between the from and to positions.
 * These positions are specified relatively to the object's origin
 * (ign_src_rot = true), in the world space (obj_src = null) or in the local
 * space (ign_src_rot = false).
 * Checks intersection of this ray with the specified collision ID. If the
 * collision ID is not specified, the sensor will detect collisions with any
 * entities.
 * This sensor carries the following {@link module:controls~RayPayload|payload}.
 * @method module:controls.create_ray_sensor
 * @param {Object3D} obj_src Source object, pass a non-null value to perform ray casting
 * in object space, e.g. from/to vectors specified in object space.
 * @param {Vec3} from From vector.
 * @param {Vec3} to To vector.
 * @param {String} [collision_id="ANY"] Collision ID to detect intersection with
 * @param {Boolean} [is_binary_value=false] Calculate the value of the sensor as
 * a binary (hit/non-hit) instead of hit fraction.
 * @param {Boolean} [calc_pos_norm=false] Calculate hit position/normal
 * (accessed from payload object).
 * @param {Boolean} [ign_src_rot=false] Ignore any rotation of the source object
 * during ray casting.
 * @returns {Sensor} Sensor object.
 * @cc_externs hit_fract obj_hit hit_time hit_pos hit_norm
 */
exports.create_ray_sensor = function(obj_src, from, to, collision_id,
        is_binary_value, calc_pos_norm, ign_src_rot) {

    collision_id = collision_id || "ANY";
    is_binary_value = is_binary_value || false;
    calc_pos_norm = calc_pos_norm || false;
    ign_src_rot = ign_src_rot || false;

    return m_ctl.create_ray_sensor(obj_src, from, to, collision_id, is_binary_value,
            calc_pos_norm, ign_src_rot);
}

/**
 * Create a mouse click sensor.
 * @method module:controls.create_mouse_click_sensor
 * @param {HTMLElement} [element=Canvas container element] HTML element
 * @returns {Sensor} Sensor object
 */
exports.create_mouse_click_sensor = m_ctl.create_mouse_click_sensor;

/**
 * Create a mouse wheel sensor.
 * The sensor's value is 1 for a single wheel notch scrolled away from the user.
 * @method module:controls.create_mouse_wheel_sensor
 * @param {HTMLElement} [element=Canvas container element] HTML element
 * @returns {Sensor} Sensor object
 */
exports.create_mouse_wheel_sensor = m_ctl.create_mouse_wheel_sensor;

/**
 * Create a mouse movement sensor.
 * The sensor's value is a number of pixels, the sensor's payload is (are)
 * coordinate(s).
 * @method module:controls.create_mouse_move_sensor
 * @param {String} [axis="XY"] Coordinate(s) to track: "X", "Y", "XY"
 * @param {HTMLElement} [element=Canvas container element] HTML element
 * @returns {Sensor} Sensor object
 */
exports.create_mouse_move_sensor = m_ctl.create_mouse_move_sensor;

/**
 * Create a touch movement sensor.
 * The sensor's value is a number of pixels.
 * @method module:controls.create_touch_move_sensor
 * @param {String} [axis="XY"] Coordinate(s) to track: "X", "Y" or "XY"
 * @param {HTMLElement} [element=Canvas container element] HTML element
 * @returns {Sensor} Sensor object
 */
exports.create_touch_move_sensor = m_ctl.create_touch_move_sensor;

/**
 * Create a touch zoom sensor.
 * The sensor's value is the distance difference in pixels.
 * @method module:controls.create_touch_zoom_sensor
 * @param {HTMLElement} [element=Canvas container element] HTML element
 * @returns {Sensor} Sensor object
 */
exports.create_touch_zoom_sensor = m_ctl.create_touch_zoom_sensor;

/**
 * Create a touch rotate sensor.
 * The sensor's value is the angle from -PI to PI.
 * @method module:controls.create_touch_rotate_sensor
 * @param {HTMLElement} [element=Canvas container element] HTML element
 * @returns {Sensor} Sensor object
 */
exports.create_touch_rotate_sensor = m_ctl.create_touch_rotate_sensor;

/**
 * Create a touch click sensor.
 * The sensor's value is 1 for a touched fouchscreen.
 * @method module:controls.create_touch_click_sensor
 * @param {HTMLElement} [element=Canvas container element] HTML element
 * @returns {Sensor} Sensor object
 */
exports.create_touch_click_sensor = m_ctl.create_touch_click_sensor;

/**
 * Create a motion sensor.
 * The sensor's value is 1 if the object is in motion.
 * @method module:controls.create_motion_sensor
 * @param {Object3D} obj Object 3D
 * @param {Number} [threshold=0.1] Translation velocity threshold,
 * units (meters) per second
 * @param {Number} [rotation_threshold=0.1] Rotation velocity threshold,
 * radians per second
 * @returns {Sensor} Sensor object
 */
exports.create_motion_sensor = m_ctl.create_motion_sensor;

/**
 * Create a velocity sensor.
 * The sensor's value is 1 if abs() of the object's vertical velocity exceeds
 * the threshold.
 * @method module:controls.create_vertical_velocity_sensor
 * @param {Object3D} obj Object 3D
 * @param {Number} [threshold=1.0] Vertical velocity threshold,
 * units (meters) per second
 * @returns {Sensor} Sensor object
 */
exports.create_vertical_velocity_sensor = m_ctl.create_vertical_velocity_sensor;

/**
 * Create a gyroscope angle sensor.
 * The sensor's payload stores the Euler angles of orientation
 * of a mobile device.
 * @method module:controls.create_gyro_angles_sensor
 * @returns {Sensor} Sensor object
 */
exports.create_gyro_angles_sensor = m_ctl.create_gyro_angles_sensor;

/**
 * Create a gyroscope quaternion sensor.
 * The sensor's payload stores the quaternion of orientation
 * of a mobile device.
 * @method module:controls.create_gyro_quat_sensor
 * @returns {Sensor} Sensor object
 */
exports.create_gyro_quat_sensor = m_ctl.create_gyro_quat_sensor;

/**
 * Create a gyroscope delta sensor.
 * The sensor's payload stores the differences between Euler angles of the
 * current orientation and the previous orientation of a mobile device.
 * @method module:controls.create_gyro_delta_sensor
 * @returns {Sensor} Sensor object
 */
exports.create_gyro_delta_sensor = m_ctl.create_gyro_delta_sensor;

/**
 * Create a HMD quaternion sensor.
 * The sensor's payload stores the quaternion of orientation of a HMD.
 * @method module:controls.create_hmd_quat_sensor
 * @returns {Sensor} Sensor object
 */
exports.create_hmd_quat_sensor = m_ctl.create_hmd_quat_sensor;

/**
 * Create a HMD position sensor.
 * The sensor's payload stores the vector of HMD position.
 * @method module:controls.create_hmd_position_sensor
 * @returns {Sensor} Sensor object
 */
exports.create_hmd_position_sensor = m_ctl.create_hmd_position_sensor;

/**
 * Create a timer sensor.
 * The sensor's value becomes 1 for the frame which comes next after the
 * period of time has elapsed. After that, its value becomes 0 again.
 * The timer's precision depends on FPS, so it is not effective for measuring
 * short intervals.
 * @method module:controls.create_timer_sensor
 * @param {Number} period Timer period, in seconds
 * @param {Boolean} [do_repeat=false] Re-start the timer upon expiration
 * @returns {Sensor} Sensor object
 */
exports.create_timer_sensor = function(period, do_repeat) {
    return m_ctl.create_timer_sensor(period, do_repeat || false);
}

/**
 * Reset the timer sensor and set a new period value.
 * @method module:controls.reset_timer_sensor
 * @param {Object3D} obj Object 3D
 * @param {String} manifold_id Object's manifold ID
 * @param {Number} num Sensor's number in the manifold
 * @param {Number} period A new period value for the sensor
 */
exports.reset_timer_sensor = m_ctl.reset_timer_sensor;

/**
 * Create an elapsed sensor.
 * The sensor's value is the time elapsed from the previous frame.
 * @method module:controls.create_elapsed_sensor
 * @returns {Sensor} Sensor object
 */
exports.create_elapsed_sensor = m_ctl.create_elapsed_sensor;

/**
 * Create a timeline sensor.
 * The sensor's value is the value of the global engine timeline.
 * @method module:controls.create_timeline_sensor
 * @returns {Sensor} Sensor object
 */
exports.create_timeline_sensor = m_ctl.create_timeline_sensor;

/**
 * Create a selection sensor for the object.
 * The sensor's value becomes 1 when the object is selected by the user.
 * @param {Object3D} obj Object 3D
 * @param {Boolean} [enable_toggle_switch=false] If true, reset the sensor
 * (set it to 0) only when another object is selected. If false, reset the
 * sensor when the mouse button/touch is released.
 * @method module:controls.create_selection_sensor
 * @returns {Sensor} Sensor object
 */
exports.create_selection_sensor = function(obj, enable_toggle_switch) {
    return m_ctl.create_selection_sensor(obj, enable_toggle_switch || false);
}

/**
 * Create a callback sensor.
 * The given callback is executed every frame and its return value is copied into the sensor value.
 * @param {SensorCallback} callback A callback which modifies sensor value.
 * @param {Number} [value=0] Initial sensor value.
 * @method module:controls.create_callback_sensor
 * @returns {Sensor} Sensor object
 */
exports.create_callback_sensor = function(callback, value) {
    return m_ctl.create_callback_sensor(callback, value || 0);
}

/**
 * Set the value of the custom sensor.
 * @method module:controls.set_custom_sensor
 * @param {Sensor} sensor Sensor object
 * @param {Number} value New sensor value
 */
exports.set_custom_sensor = function(sensor, value) {
    m_ctl.sensor_set_value(sensor, value);
}

/**
 * Get the value of the custom sensor.
 * @method module:controls.get_custom_sensor
 * @param {Sensor} sensor Sensor object
 * @returns {Number} Sensor value
 */
exports.get_custom_sensor = function(sensor) {
    return sensor.value;
}

/**
 * Return the value of the sensor from the object's manifold. The sensor is
 * identified by its index in the manifold's array of sensors.
 * @method module:controls.get_sensor_value
 * @param {?Object3D} obj Object 3D, or null to denote the global object
 * @param {String} manifold_id Object's manifold ID
 * @param {Number} num Sensor index in manifold's array
 * @returns {Number} Sensor value
 */
exports.get_sensor_value = m_ctl.get_sensor_value;

/**
 * Return the payload data of the sensor from the object's manifold. The sensor
 * is identified by its index in the manifold's array of sensors.
 * @method module:controls.get_sensor_payload
 * @param {?Object3D} obj Object 3D, or null to denote the global object
 * @param {String} manifold_id Object's manifold ID
 * @param {Number} num Sensor index in manifold's array
 * @returns {*} Sensor payload
 */
exports.get_sensor_payload = m_ctl.get_sensor_payload;

/**
 * Create a sensor manifold.
 * @method module:controls.create_sensor_manifold
 * @param {?Object3D} obj Object 3D to attach the manifold to, or null to denote
 * the global object.
 * @param {String} id New manifold ID.
 * @param {Number} type Manifold control type (CT_SHOT, CT_TRIGGER etc).
 * @param {Sensor[]} sensors Array of sensors.
 * @param {ManifoldLogicFunction} logic_fun Manifold's logic function.
 * @param {ManifoldCallback} callback Manifold's callback.
 * @param {*} [callback_param] Parameter to pass to the manifold's callback
 * (e.g. some state).
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
 * @param {?Object3D} obj Object 3D to attach the manifold to, or null to denote
 * the global object
 * @param {String} id New manifold ID
 * @param {Number} type Manifold control type (CT_SHOT, CT_TRIGGER etc)
 * @param {Number} key Sensor key KEY_*
 * @param {ManifoldCallback} callback Manifold's callback
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
 * @param {?Object3D} obj Object 3D, or null to denote the global object
 * @returns {Boolean} Result of the check
 */
exports.check_sensor_manifolds = function(obj) {
    return m_ctl.check_sensor_manifold(obj, null);
}

/**
 * Check whether the object has the manifold attached.
 * @method module:controls.check_sensor_manifold
 * @param {?Object3D} obj Object 3D, or null to denote the global object
 * @param {String} id Manifold ID
 * @returns {Boolean} Result of the check
 */
exports.check_sensor_manifold = m_ctl.check_sensor_manifold;

/**
 * Remove the sensor manifold registered for the object.
 * @method module:controls.remove_sensor_manifold
 * @param {?Object3D} obj Object 3D to delete the manifold from, or null to denote
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
 * @deprecated Not needed anymore.
 */
exports.register_keyboard_events = function(){
    m_print.error_once("controls.register_keyboard_events() deprecated");
};

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
 * @deprecated Not needed anymore.
 */
exports.register_mouse_events = function(){
    m_print.error_once("controls.register_mouse_events() deprecated");
};

/**
 * Add mouse wheel event listeners (mousewheel and DOMMouseScroll) to
 * the HTML element. Required for work of mouse wheel sensors.
 * @param {HTMLElement} element HTML element to add event listeners to
 * @param {Boolean} prevent_default Prevent browser default actions for
 * registered events.
 * @method module:controls.register_wheel_events
 * @deprecated Not needed anymore.
 */
exports.register_wheel_events = function(){
    m_print.error_once("controls.register_wheel_events() deprecated");
};

/**
 * Add touch event listeners (touchstart and touchmove) to the HTML element.
 * Required for work of touch movement and touch zoom sensors.
 * @param {HTMLElement} element HTML element to add event listeners to
 * @param {Boolean} prevent_default Prevent browser default actions for
 * registered events.
 * @method module:controls.register_touch_events
 * @deprecated Not needed anymore.
 */
exports.register_touch_events = function(){
    m_print.error_once("controls.register_touch_events() deprecated");
};

/**
 * Add device orientation event listener (deviceorientation) to the DOM window.
 * @method module:controls.register_device_orientation
 * @deprecated Not needed anymore.
 */
exports.register_device_orientation = function(){
    m_print.error_once("controls.register_device_orientation() deprecated");
};

/**
 * Remove keyboard event listeners (keydown and keyup) from the HTML element.
 * @param {HTMLElement} element HTML element to remove event listeners from
 * @method module:controls.unregister_keyboard_events
 * @deprecated Not needed anymore.
 */
exports.unregister_keyboard_events = function(){
    m_print.error_once("controls.unregister_keyboard_events() deprecated");
};

/**
 * Remove mouse event listeners (mousedown, mouseup, mousemove and mouseout)
 * from the HTML element.
 * @param {HTMLElement} element HTML element to remove event listeners from
 * @method module:controls.unregister_mouse_events
 * @deprecated Not needed anymore.
 */
exports.unregister_mouse_events = function(){
    m_print.error_once("controls.unregister_mouse_events() deprecated");
};

/**
 * Remove mouse wheel event listeners (mousewheel and DOMMouseScroll) from
 * the HTML element.
 * @param {HTMLElement} element HTML element to remove event listeners from
 * @method module:controls.unregister_wheel_events
 * @deprecated Not needed anymore.
 */
exports.unregister_wheel_events = function(){
    m_print.error_once("controls.unregister_wheel_events() deprecated");
};

/**
 * Remove touch event listeners (touchstart and touchmove) from the HTML
 * element.
 * @param {HTMLElement} element HTML element to remove event listeners from
 * @method module:controls.unregister_touch_events
 * @deprecated Not needed anymore.
 */
exports.unregister_touch_events = function(){
    m_print.error_once("controls.unregister_touch_events() deprecated");
};

/**
 * Remove device orientation event listener (deviceorientation) from
 * the DOM window.
 * @method module:controls.unregister_device_orientation
 * @deprecated Not needed anymore.
 */
exports.unregister_device_orientation = function(){
    m_print.error_once("controls.unregister_device_orientation() deprecated");
};

}
