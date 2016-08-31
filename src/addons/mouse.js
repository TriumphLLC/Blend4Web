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
 * Pointer lock and mouse actions add-on.
 * Provides support for mouse pointer lock and low-level movement.
 * For more generic cases use {@link module:controls|sensor-based API}.
 * @see http://www.w3.org/TR/pointerlock/
 * @module mouse
 * @local UseMouseControlCallback
 * @local PointerlockEnabledCallback
 * @local PointerlockDisabledCallback
 * @local PointerlockMouseMoveCallback
 * @local RotationCallback
 */
b4w.module["mouse"] = function(exports, require) {

var m_cam   = require("camera");
var m_cont  = require("container");
var m_ctl   = require("controls");
var m_phy   = require("physics");
var m_print = require("print");
var m_scs   = require("scenes");
var m_util  = require("util");
var m_main  = require("main");

var FPS_MOUSE_MULT = 0.0004;
var DRAG_MOUSE_DELTA_MULT = 2;

var _smooth_factor = 1;
var CAM_SMOOTH_CHARACTER_MOUSE = 0.1;
var CAM_SMOOTH_CHARACTER_TOUCH = 0.2; // unused

var PLS_NONE = 0;
var PLS_POINTERLOCK = 1;
var PLS_DRAG = 2;

// mouse drag control
var _mouse_x = 0;
var _mouse_y = 0;

var _mouse_delta = new Float32Array(2);

var _vec2_tmp = new Float32Array(2);

var _use_mouse_control_cb = null;

var _chosen_object = null;

var _plock_state = PLS_NONE;


/**
 * Callback which allows user to specify whether the camera/character movement
 * is controlled by mouse module or not.
 * @callback UseMouseControlCallback
 * @returns {Boolean} False to disable mouse control of active camera/character
 */

/**
 * Callback which will be executed when pointer lock is enable.
 * @callback PointerlockEnabledCallback
 */

/**
 * Callback which will be executed when pointer lock is disabled.
 * @callback PointerlockDisabledCallback
 */

/**
 * Mouse movement event callback
 * @callback PointerlockMouseMoveCallback
 * @param {MouseEvent} e mousemove event
 */

/**
 * Callback for camera/characters rotation
 * @callback RotationCallback
 * @param {rot_x} x rotation around X-axis
 * @param {rot_y} y rotation around Y-axis
 */

/**
 * Request pointer lock mode.
 * Security issues: execute by user event.
 * @method module:mouse.request_pointerlock
 * @param {HTMLElement} elem Element
 * @param {PointerlockEnabledCallback} [enabled_cb] Enabled callback
 * @param {PointerlockDisabledCallback} [disabled_cb] Disabled callback
 * @param {PointerlockMouseMoveCallback} [mouse_move_cb] Mouse movement event callback
 * @param {UseMouseControlCallback} [use_mouse_control_cb] Callback to check the camera/character control
 * @param {RotationCallback} [rotation_cb] Callback for camera rotation. If not specified, the default one will be used.
 */
exports.request_pointerlock = function(elem, enabled_cb, disabled_cb,
        mouse_move_cb, use_mouse_control_cb, rotation_cb) {

    if (_plock_state == PLS_POINTERLOCK)
        return;
    _plock_state = PLS_POINTERLOCK;

    enabled_cb  = enabled_cb  || function() {};
    disabled_cb = disabled_cb || function() {};
    rotation_cb = rotation_cb || default_rotation_cb;

    use_mouse_control_cb = use_mouse_control_cb || function() {return true};

    mouse_move_cb = mouse_move_cb || function(e) {
        if (use_mouse_control_cb()) {
            // NOTE: for compatibility with older browsers
            if (typeof e.movementX == "number") {
                var mx = e.movementX;
                var my = e.movementY;
            } else if (typeof e.webkitMovementX == "number") {
                var mx = e.webkitMovementX;
                var my = e.webkitMovementY;
            } else if (typeof e.mozMovementX == "number") {
                var mx = e.mozMovementX;
                var my = e.mozMovementY;
            } else {
                var mx = 0;
                var my = 0;
            }

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
                    [elapsed], null, smooth_cb, rotation_cb);
            }

            enabled_cb();
        } else {
            //m_print.log("Pointer Lock disabled");
            
            elem.removeEventListener("mousemove", mouse_move_cb, false);

            _plock_state = PLS_NONE;
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
 * @method module:mouse.exit_pointerlock
 */
exports.exit_pointerlock = exit_pointerlock;
function exit_pointerlock() {

    if (_plock_state == PLS_POINTERLOCK)
        _plock_state = PLS_NONE;

    var exit_plock = document.exitPointerLock || document.webkitExitPointerLock ||
        document.mozExitPointerLock;

    if (typeof exit_plock === "function")
        exit_plock.apply(document);

    m_ctl.remove_sensor_manifold(m_scs.get_active_camera(), "SMOOTH_PL");
}

/**
 * Check the pointer lock.
 * @method module:mouse.check_pointerlock
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
 * @param {UseMouseControlCallback} [use_mouse_control_cb] Callback to check the mouse control
 * @param {RotationCallback} [rotation_cb] Callback for camera rotation. If not specified, the default one will be used.
 * @method module:mouse.request_mouse_drag
 */
exports.request_mouse_drag = request_mouse_drag;
function request_mouse_drag(elem, use_mouse_control_cb, rotation_cb) {

    if (_plock_state == PLS_DRAG)
        return;
    _plock_state = PLS_DRAG;

    exit_pointerlock();

    _use_mouse_control_cb = use_mouse_control_cb || function() {return true};
    rotation_cb = rotation_cb || default_rotation_cb;

    elem.addEventListener("mousedown", drag_mouse_down_cb, false);
    elem.addEventListener("mouseup",   drag_mouse_up_cb,   false);

    var camera = m_scs.get_active_camera();

    if (!m_ctl.check_sensor_manifold(camera, "SMOOTH_DRAG")) {
        var elapsed = m_ctl.create_elapsed_sensor();

        m_ctl.create_sensor_manifold(camera, "SMOOTH_DRAG", m_ctl.CT_CONTINUOUS,
            [elapsed], null, smooth_cb, rotation_cb);
    }
}

/**
 * Exit drag mode.
 * @param {HTMLElement} elem Element
 * @method module:mouse.exit_mouse_drag
 */
exports.exit_mouse_drag = exit_mouse_drag;
function exit_mouse_drag(elem) {
    if (_plock_state == PLS_DRAG)
        _plock_state = PLS_NONE;
    elem.removeEventListener("mousedown", drag_mouse_down_cb, false);
    elem.removeEventListener("mouseup",   drag_mouse_up_cb,   false);
    elem.removeEventListener("mousemove", drag_mouse_move_cb, false);

    m_ctl.remove_sensor_manifold(m_scs.get_active_camera(), "SMOOTH_DRAG");
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

function smooth_cb(obj, id, pulse, rot_callback) {
    if (Math.abs(_mouse_delta[0]) > 0.01 || Math.abs(_mouse_delta[1]) > 0.01) {
        var elapsed = m_ctl.get_sensor_value(obj, id, 0);
        var rot_x = m_util.smooth(_mouse_delta[0], 0, elapsed, smooth_coeff_mouse());
        var rot_y = m_util.smooth(_mouse_delta[1], 0, elapsed, smooth_coeff_mouse());

        _mouse_delta[0] -= rot_x;
        _mouse_delta[1] -= rot_y;

        rot_callback(-rot_x * FPS_MOUSE_MULT, -rot_y * FPS_MOUSE_MULT);
    }
}

function default_rotation_cb(rot_x, rot_y) {
    var character = m_scs.get_first_character();
    var camera    = m_scs.get_active_camera();
    m_cam.eye_rotate(camera, rot_x, rot_y);
    if (character) {
        var angles = m_cam.get_camera_angles_char(camera, _vec2_tmp);
        m_phy.set_character_rotation(character, angles[0], angles[1]);
    }
}
/**
 * Enable objects outlining by mouse hover.
 * @method module:mouse.enable_mouse_hover_outline
 */
exports.enable_mouse_hover_outline = enable_mouse_hover_outline;
function enable_mouse_hover_outline() {
    if (!m_main.detect_mobile()) {
        var main_canvas = m_cont.get_canvas();
        main_canvas.addEventListener("mousemove", objects_outline);
    }
}

/**
 * Disable objects outlining by mouse hover.
 * @method module:mouse.disable_mouse_hover_outline
 */
exports.disable_mouse_hover_outline = disable_mouse_hover_outline;
function disable_mouse_hover_outline() {
    if (!m_main.detect_mobile()) {
        var main_canvas = m_cont.get_canvas();
        main_canvas.removeEventListener("mousemove", objects_outline);
        if (_chosen_object)
            m_scs.set_outline_intensity(_chosen_object, 0);
    }
}

function objects_outline(e) {
    var canvas_xy = m_cont.client_to_canvas_coords(e.clientX, e.clientY, _vec2_tmp);

    var obj = m_scs.pick_object(canvas_xy[0], canvas_xy[1]);
    if (obj) {
        if (m_scs.outlining_is_enabled(obj))
            m_scs.set_outline_intensity(obj, 1);
        if (m_scs.outlining_is_enabled(_chosen_object) && obj != _chosen_object)
            m_scs.set_outline_intensity(_chosen_object, 0);
    } else
        if (m_scs.outlining_is_enabled(_chosen_object))
            m_scs.set_outline_intensity(_chosen_object, 0);
    _chosen_object = obj;
}
/**
 * Get mouse/touch X coordinate.
 * @param {MouseEvent|TouchEvent} event Mouse/touch event
 * @param {Boolean} [target_touches=false] Use only those touches that were 
 * started on the event target element (the targetTouches property).
 * @method module:mouse.get_coords_x
 * @returns {Number} Client area horizontal coordinate or -1 if not defined
 */
exports.get_coords_x = get_coords_x;
function get_coords_x(event, target_touches) {

    var touches = target_touches ? event.targetTouches : event.touches;

    if ("clientX" in event)
        return event.clientX;
    else if (touches && "clientX" in touches[0])
        return touches[0].clientX;
    else
        return -1;
}
/**
 * Get mouse/touch Y coordinate.
 * @param {MouseEvent|TouchEvent} event Mouse/touch event
 * @param {Boolean} [target_touches=false] Use only those touches that were 
 * started on the event target element (the targetTouches property).
 * @method module:mouse.get_coords_y
 * @returns {Number} Client area vertical coordinate or -1 if not defined
 */
exports.get_coords_y = get_coords_y;
function get_coords_y(event, target_touches) {

    var touches = target_touches ? event.targetTouches : event.touches;

    if ("clientY" in event)
        return event.clientY;
    else if (touches && "clientY" in touches[0])
        return touches[0].clientY;
    else
        return -1;
}

function smooth_coeff_mouse() {
    return CAM_SMOOTH_CHARACTER_MOUSE * _smooth_factor;
}

function smooth_coeff_touch() {
    return CAM_SMOOTH_CHARACTER_TOUCH * _smooth_factor;
}

/**
 * Set smooth factor for camera rotation while in pointerlock mode.
 * @method module:mouse.set_plock_smooth_factor
 * @param {Number} value New smooth factor
 */
exports.set_plock_smooth_factor = function(value) {
    _smooth_factor = value;
}

/**
 * Get smooth factor for camera rotation while in pointerlock mode.
 * @method module:mouse.get_plock_smooth_factor
 * @returns {Number} Smooth factor
 */
exports.get_plock_smooth_factor = function() {
    return _smooth_factor;
}

};
