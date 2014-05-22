"use strict";

/**
 * Pointerlock add-on.
 * Provides pointerlock support.
 * @module pointerlock
 */
b4w.module["pointerlock"] = function(exports, require) {

var m_camera     = require("camera");
var m_ctl        = require("controls");
var m_phy        = require("physics");
var m_print      = require("print");
var m_util       = require("util");

var FPS_MOUSE_MULT = 0.0004;
var DEFAULT_MOUSE_MULT = 2;

var CAM_SMOOTH_CHARACTER_MOUSE = 0.1;
var CAM_SMOOTH_CHARACTER_TOUCH = 0.2; // unused

var ENABLE_DRAG  = true;
var DISABLE_DRAG = false;

/**
 * @const module:pointerlock.ENABLE_DRAG
 */
exports.ENABLE_DRAG = ENABLE_DRAG;

/**
 * @const module:pointerlock.DISABLE_DRAG
 */
exports.DISABLE_DRAG = DISABLE_DRAG;

// mouse drag control
var _mouse_x;
var _mouse_y;

var _mouse_delta = new Float32Array(2);

/**
 * @callback check_mouse_control
 */
var _check_mouse_control;

// for internal usage
var _vec2_tmp = new Float32Array(2);

exports.request_pointerlock = request_pointerlock;
/**
 * Request pointer lock mode.
 * Security issues: execute by user event.
 * @method module:pointerlock.request_pointerlock
 * @param elem Element
 * @param [enabled_cb] Enabled callback
 * @param [disabled_cb] Disabled callback
 * @param [mouse_move_cb] Mouse movement event callback
 * @param [check_mouse_control] Check mouse control
 */
function request_pointerlock(elem, enabled_cb, disabled_cb, mouse_move_cb, check_mouse_control) {

    enabled_cb  = enabled_cb  || locked_cb;
    disabled_cb = disabled_cb || function() {};

    check_mouse_control = check_mouse_control || function() {return true};
    var default_mouse_move = function(e) {

        if (check_mouse_control()) {
            var mx = e.movementX || e.webkitMovementX || e.mozMovementX || 0;
            var my = e.movementY || e.webkitMovementY || e.mozMovementY || 0;

            _mouse_delta[0] += mx;
            _mouse_delta[1] += my;
        }
    }

    mouse_move_cb = mouse_move_cb || default_mouse_move;

    function on_pointerlock_change() {
        if (document.pointerLockElement === elem ||
                document.webkitPointerLockElement === elem ||
                document.mozPointerLockElement === elem) {
            // m_print.log("Pointer Lock enabled");

            elem.addEventListener("mousemove", mouse_move_cb, false);

            enabled_cb();

            var camera = b4w.scenes.get_active_camera();

            if (!m_ctl.check_sensor_manifold(camera, "SMOOTH_PL")) {
                var elapsed = m_ctl.create_elapsed_sensor();

                m_ctl.create_sensor_manifold(camera, "SMOOTH_PL", m_ctl.CT_CONTINUOUS,
                    [elapsed], null, smooth_cb);
            }

        } else {
            // m_print.log("Pointer Lock disabled");

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

    elem.requestPointerLock = elem.requestPointerLock ||
            elem.webkitRequestPointerLock || elem.mozRequestPointerLock;

    try {
        elem.requestPointerLock();
    } catch(e) {
        m_print.error("Pointer lock is not available");
    }
}

exports.exit_pointerlock = exit_pointerlock;
/**
 * Exit pointerlock.
 * @method module:pointerlock.exit_pointerlock
 */
function exit_pointerlock() {

    var exit_pl = document.exitPointerLock || document.webkitExitPointerLock ||
        document.mozExitPointerLock;

    if (typeof exit_pl === "function")
        exit_pl.apply(document);
    else
        m_print.error("Pointer lock is not available");
}

exports.request_mouse_drag = request_mouse_drag;
/**
 * Request drug mode.
 * @param elem Element
 * @param switch_drag Drag mouse mode (ENABLE_DRAG or DISABLE_DRAG)
 * @param {check_mouse_control} [check_mouse_control] Check mouse control
 * callback
 * @method module:pointerlock.requrest_mouse_drag
 */
function request_mouse_drag(elem, switch_drag, check_mouse_control) {

    _check_mouse_control = check_mouse_control || function() {return true};

    if (switch_drag) {
        elem.addEventListener("mousedown", default_mouse_down_cb, false);
        elem.addEventListener("mouseup",   default_mouse_up_cb,   false);

        var camera = b4w.scenes.get_active_camera();

        if (!m_ctl.check_sensor_manifold(camera, "SMOOTH_DRAG")) {
            var elapsed = m_ctl.create_elapsed_sensor();

            m_ctl.create_sensor_manifold(camera, "SMOOTH_DRAG", m_ctl.CT_CONTINUOUS,
                [elapsed], null, smooth_cb);
        }

    } else {
        elem.removeEventListener("mousedown", default_mouse_down_cb, false);
        elem.removeEventListener("mouseup",   default_mouse_up_cb,   false);
    }
}

function locked_cb() {
    request_mouse_drag(document.body, DISABLE_DRAG, null);
}

function mouse_move_cb(e) {
    if (_check_mouse_control()) {
        _mouse_delta[0] += (e.clientX - _mouse_x) * DEFAULT_MOUSE_MULT;
        _mouse_delta[1] += (e.clientY - _mouse_y) * DEFAULT_MOUSE_MULT;

        _mouse_x = e.clientX;
        _mouse_y = e.clientY;
    }
}

function default_mouse_down_cb(e) {
    _mouse_x = e.clientX;
    _mouse_y = e.clientY;

    document.body.addEventListener("mousemove", mouse_move_cb, false);
}

function default_mouse_up_cb(e) {
    document.body.removeEventListener("mousemove", mouse_move_cb, false);
}

function smooth_cb(obj, id, pulse) {

    if (Math.abs(_mouse_delta[0]) > 0.01 || Math.abs(_mouse_delta[1]) > 0.01) {
        var value = m_ctl.get_sensor_value(obj, id, 0);
        var rot_x = m_util.smooth(_mouse_delta[0], 0, value, CAM_SMOOTH_CHARACTER_MOUSE);
        var rot_y = m_util.smooth(_mouse_delta[1], 0, value, CAM_SMOOTH_CHARACTER_MOUSE);

        var character = b4w.scenes.get_first_character();
        var camera    = b4w.scenes.get_active_camera();

        b4w.camera.rotate(camera, -rot_x * FPS_MOUSE_MULT, rot_y * FPS_MOUSE_MULT);

        _mouse_delta[0] -= rot_x;
        _mouse_delta[1] -= rot_y;

        if (character) {
            var angles = _vec2_tmp;
            m_camera.get_angles(camera, angles);
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
