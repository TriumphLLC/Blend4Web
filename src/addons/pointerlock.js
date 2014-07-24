"use strict";

/**
 * Pointer lock add-on.
 * Provides support for mouse pointer lock and low-level movement.
 * @see http://www.w3.org/TR/pointerlock/
 * @module pointerlock
 */
b4w.module["pointerlock"] = function(exports, require) {

var m_cam   = require("camera");
var m_ctl   = require("controls");
var m_phy   = require("physics");
var m_print = require("print");
var m_scs   = require("scenes");
var m_util  = require("util");

var FPS_MOUSE_MULT = 0.0004;
var DRAG_MOUSE_DELTA_MULT = 2;

var CAM_SMOOTH_CHARACTER_MOUSE = 0.1;
var CAM_SMOOTH_CHARACTER_TOUCH = 0.2; // unused

// mouse drag control
var _mouse_x = 0;
var _mouse_y = 0;

var _mouse_delta = new Float32Array(2);

var _vec2_tmp = new Float32Array(2);

var _use_mouse_control_cb = null;

/**
 * Callback which allows user to specify whether the camera/character movement
 * is controlled by pointerlock module or not.
 * @callback use_mouse_control_callback
 * @returns {Boolean} False to disable mouse control of active camera/character
 */

/**
 * Callback which will be executed when pointer lock is enable.
 * @callback pointerlock_enabled_callback
 */

/**
 * Callback which will be executed when pointer lock is disabled.
 * @callback pointerlock_disabled_callback
 */

/**
 * Mouse movement event callback
 * @callback pointerlock_mouse_move_callback
 * @param {MouseEvent} e mousemove event
 */

/**
 * Request pointer lock mode.
 * Security issues: execute by user event.
 * @method module:pointerlock.request_pointerlock
 * @param {HTMLElement} elem Element
 * @param {pointerlock_enabled_callback} [enabled_cb] Enabled callback
 * @param {pointerlock_disabled_callback} [disabled_cb] Disabled callback
 * @param {pointerlock_mouse_move_callback} [mouse_move_cb] Mouse movement event callback
 * @param {use_mouse_control_callback} [use_mouse_control_cb] Callback to check the camera/character control
 */
exports.request_pointerlock = function(elem, enabled_cb, disabled_cb, 
        mouse_move_cb, use_mouse_control_cb) {

    enabled_cb  = enabled_cb  || function() {};
    disabled_cb = disabled_cb || function() {};

    use_mouse_control_cb = use_mouse_control_cb || function() {return true};

    mouse_move_cb = mouse_move_cb || function(e) {
        if (use_mouse_control_cb()) {
            var mx = e.movementX || e.webkitMovementX || e.mozMovementX || 0;
            var my = e.movementY || e.webkitMovementY || e.mozMovementY || 0;

            _mouse_delta[0] += mx;
            _mouse_delta[1] += my;
        }
    }

    function on_pointerlock_change() {
        if (document.pointerLockElement === elem ||
                document.webkitPointerLockElement === elem ||
                document.mozPointerLockElement === elem) {
            //m_print.log("Pointer Lock enabled");
    
            exit_mouse_drag(elem);

            elem.addEventListener("mousemove", mouse_move_cb, false);

            var camera = m_scs.get_active_camera();

            if (!m_ctl.check_sensor_manifold(camera, "SMOOTH_PL")) {
                var elapsed = m_ctl.create_elapsed_sensor();

                m_ctl.create_sensor_manifold(camera, "SMOOTH_PL", m_ctl.CT_CONTINUOUS,
                    [elapsed], null, smooth_cb);
            }

            enabled_cb();
        } else {
            //m_print.log("Pointer Lock disabled");
            
            elem.removeEventListener("mousemove", mouse_move_cb, false);

            document.removeEventListener("pointerlockchange", on_pointerlock_change, false);
            document.removeEventListener("webkitpointerlockchange", on_pointerlock_change, false);
            document.removeEventListener("mozpointerlockchange", on_pointerlock_change, false);

            disabled_cb();
        }
    }

    document.addEventListener("pointerlockchange", on_pointerlock_change, false);
    document.addEventListener("webkitpointerlockchange", on_pointerlock_change, false);
    document.addEventListener("mozpointerlockchange", on_pointerlock_change, false);

    var request_plock = elem.requestPointerLock ||
            elem.webkitRequestPointerLock || elem.mozRequestPointerLock;

    if (typeof request_plock === "function")
        request_plock.apply(elem);
    else
        m_print.error("Pointer lock is not available");
}

/**
 * Exit the pointer lock mode.
 * @method module:pointerlock.exit_pointerlock
 */
exports.exit_pointerlock = exit_pointerlock;
function exit_pointerlock() {

    var exit_plock = document.exitPointerLock || document.webkitExitPointerLock ||
        document.mozExitPointerLock;

    if (typeof exit_plock === "function")
        exit_plock.apply(document);
}

/**
 * Check the pointer lock.
 * @method module:pointerlock.check_pointerlock
 * @param {HTMLElement} elem Element
 * @returns {Boolean} Check result
 */
exports.check_pointerlock = function(elem) {
    var request_plock = elem.requestPointerLock ||
            elem.webkitRequestPointerLock || elem.mozRequestPointerLock;

    if (typeof request_plock === "function")
        return true;
    else
        return false;
}

/**
 * Request drag mode.
 * @param {HTMLElement} elem Element
 * @param {use_mouse_control_callback} [use_mouse_control_cb] Callback to check the mouse control
 * @method module:pointerlock.request_mouse_drag
 */
exports.request_mouse_drag = request_mouse_drag;
function request_mouse_drag(elem, use_mouse_control_cb) {

    exit_pointerlock();

    _use_mouse_control_cb = use_mouse_control_cb || function() {return true};

    elem.addEventListener("mousedown", drag_mouse_down_cb, false);
    elem.addEventListener("mouseup",   drag_mouse_up_cb,   false);

    var camera = m_scs.get_active_camera();

    if (!m_ctl.check_sensor_manifold(camera, "SMOOTH_DRAG")) {
        var elapsed = m_ctl.create_elapsed_sensor();

        m_ctl.create_sensor_manifold(camera, "SMOOTH_DRAG", m_ctl.CT_CONTINUOUS,
            [elapsed], null, smooth_cb);
    }

}
/**
 * Exit drag mode.
 * @param {HTMLElement} elem Element
 * @method module:pointerlock.exit_mouse_drag
 */
exports.exit_mouse_drag = exit_mouse_drag;
function exit_mouse_drag(elem) {
    elem.removeEventListener("mousedown", drag_mouse_down_cb, false);
    elem.removeEventListener("mouseup",   drag_mouse_up_cb,   false);
    elem.removeEventListener("mousemove", drag_mouse_move_cb, false);
}

function drag_mouse_move_cb(e) {
    if (_use_mouse_control_cb()) {

        _mouse_delta[0] += (e.clientX - _mouse_x) * DRAG_MOUSE_DELTA_MULT;
        _mouse_delta[1] += (e.clientY - _mouse_y) * DRAG_MOUSE_DELTA_MULT;

        _mouse_x = e.clientX;
        _mouse_y = e.clientY;
    }
    e.preventDefault();
}

function drag_mouse_down_cb(e) {
    _mouse_x = e.clientX;
    _mouse_y = e.clientY;

    e.currentTarget.addEventListener("mousemove", drag_mouse_move_cb, false);
    e.preventDefault();
}

function drag_mouse_up_cb(e) {
    e.currentTarget.removeEventListener("mousemove", drag_mouse_move_cb, false);
    e.preventDefault();
}

function smooth_cb(obj, id, pulse) {

    if (Math.abs(_mouse_delta[0]) > 0.01 || Math.abs(_mouse_delta[1]) > 0.01) {
        var elapsed = m_ctl.get_sensor_value(obj, id, 0);
        var rot_x = m_util.smooth(_mouse_delta[0], 0, elapsed, CAM_SMOOTH_CHARACTER_MOUSE);
        var rot_y = m_util.smooth(_mouse_delta[1], 0, elapsed, CAM_SMOOTH_CHARACTER_MOUSE);

        // TODO: need more control with this objects
        var character = m_scs.get_first_character();
        var camera    = m_scs.get_active_camera();

        m_cam.rotate(camera, -rot_x * FPS_MOUSE_MULT, rot_y * FPS_MOUSE_MULT);

        _mouse_delta[0] -= rot_x;
        _mouse_delta[1] -= rot_y;

        if (character) {
            var angles = _vec2_tmp;
            m_cam.get_angles(camera, angles);
            angles[0] += Math.PI;
            angles[1] *= -1;
            m_phy.set_character_rotation(character, angles[0], angles[1]);
        }
    }
}

};

if (window["b4w"])
    window["b4w"]["pointerlock"] = b4w.require("pointerlock");
else
    throw "Failed to register pointerlock, load b4w first";
