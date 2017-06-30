/**
 * Copyright (C) 2014-2017 Triumph LLC
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
 * Add-on for first person applications.
 * It makes creating FPS applications, binding controls and
 * controlling character movement easier.
 * @module fps
 * @local ChangeStateCallback
 * @local PlockCallback
 * @local CharMotionCallback
 */

b4w.module["fps"] = function(exports, require) {

/**
 * Function which is called when the given ID state is changed.
 * @callback ChangeStateCallback
 * @param {number} old_state_id Previous state ID.
 * @param {number} new_state_id New state ID.
 */

/**
 * Function which is called when pointerlock state was changed.
 * @callback PlockCallback
 * @param {HTMLElement} elem HTML element, which required pointerlock
 */

/**
 * Function which is called when character changes his movement direction.
 * @callback CharMotionCallback
 * @param {number} forw_back Forward/backward direction (can be -1, 1 or 0).
 * @param {number} right_left Right/left direction (can be -1, 1 or 0).
 */

/**
 * Callback for characters/camera rotation
 * @callback CharRotationCallback
 * @param {Object3D} character Character
 * @param {number} x rotation around X-axis in radians
 * @param {number} y rotation around Y-axis in radians
 */

var m_cam   = require("camera");
var m_ctl   = require("controls");
var m_phy   = require("physics");
var m_scs   = require("scenes");
var m_util  = require("util");
var m_main  = require("main");
var m_cont  = require("container");
var m_input = require("input");
var m_screen = require("screen");
var m_trans = require("transform");
var m_const = require("constraints");
var m_vec3  = require("vec3");
var m_hmd   = require("hmd");
var m_print = require("__print");

var AT_PRESSED = 1;
var AT_RELEASED = 2;
var AT_CONTINUOUS = 3;

var CS_STAY = 0;
var CS_WALK = 1;
var CS_RUN = 2;
var CS_FLY = 3;
var CS_CLIMB = 4;

var MOBILE_FORWARD_BTN_ID = "B4W_DEFAULT_BTN_1";
var MOBILE_BACKWARD_BTN_ID = "B4W_DEFAULT_BTN_2";

var FORWARD_SVG = 'url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+PHN2ZyBpZD0ic3ZnMzQwMCIgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMTQuMTExbW0iIHdpZHRoPSIxNC4xMTFtbSIgdmVyc2lvbj0iMS4xIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHZpZXdCb3g9IjAgMCA0OS45OTk5OTggNDkuOTk5OTk5Ij4gPG1ldGFkYXRhIGlkPSJtZXRhZGF0YTM0MDUiPjxyZGY6UkRGPjxjYzpXb3JrIHJkZjphYm91dD0iIj48ZGM6Zm9ybWF0PmltYWdlL3N2Zyt4bWw8L2RjOmZvcm1hdD48ZGM6dHlwZSByZGY6cmVzb3VyY2U9Imh0dHA6Ly9wdXJsLm9yZy9kYy9kY21pdHlwZS9TdGlsbEltYWdlIi8+PGRjOnRpdGxlLz48L2NjOldvcms+PC9yZGY6UkRGPiA8L21ldGFkYXRhPiA8ZyBpZD0ibGF5ZXIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIC0xMDAyLjQpIj48cmVjdCBpZD0icmVjdDI0MTI2IiBvcGFjaXR5PSIwLjU0MyIgZmlsbC1vcGFjaXR5PSIuODM2MTEiIGhlaWdodD0iNTAiIHdpZHRoPSI1MCIgeT0iMTAwMi40IiB4PSIwIiBmaWxsPSIjZmZmIi8+PHBhdGggaWQ9InBhdGgyNDEyOCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibTM5LjE0MiAxMDMzLjUtMTQuMTQyLTE0LjE0Mi0xNC4xNDIgMTQuMTQyIiBzdHJva2U9IiM2ZTZlNmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+IDwvZz48L3N2Zz4=);';

var DRAG_TOUCH_DELTA_MULT = 4;
var DRAG_MOUSE_DELTA_MULT = 2;
var CAM_SMOOTH_CHARACTER_COEFF = 0.2
var AXIS_THRESHOLD = 0.05;
var ROT_STEP = 2.5;
var MIN_VERT_ANG = (-Math.PI + 0.1) / 2;
var MAX_VERT_ANG = (Math.PI - 0.1) / 2;
var MULT_SCALE = 200000;
var GMPD_BTNS_OFFSET = 300;
var GMPD_AXIS_OFFSET = 326;

var _move_delta = new Float32Array(2);
var _smooth_factor = 1;
var _fps_camera_mult = 0.0004;
var _manifold_counter = 0;
var _character_sm = null;
var _plock_sensor = null;
var _plock_cb = {
    enable_cb  : null,
    disable_cb : null
};
var _rotation_cb = function() {};
var _curr_gamepad_id = 0;
var _state_counter = 4;
var _is_freezed = false;

var _vec2_tmp = new Float32Array(2);
var _vec3_tmp = new Float32Array(3);
var _vec3_tmp2 = new Float32Array(3);

function default_rotation_cb(character, rot_x, rot_y) {
    var camera = m_scs.get_active_camera();
    m_cam.rotate_camera(camera, rot_x, rot_y);
    var angles = m_cam.get_camera_angles_char(camera, _vec2_tmp);
    m_phy.set_character_rotation(character, angles[0], angles[1]);
}

function smooth_cb(obj, id, pulse, rot_callback) {
    if (Math.abs(_move_delta[0]) > 0.01 || Math.abs(_move_delta[1]) > 0.01) {
        var elapsed = m_ctl.get_sensor_value(obj, id, 0);
        var rot_x = m_util.smooth(_move_delta[0], 0, elapsed, smooth_coeff());
        var rot_y = m_util.smooth(_move_delta[1], 0, elapsed, smooth_coeff());

        _move_delta[0] -= rot_x;
        _move_delta[1] -= rot_y;

        rot_callback(obj, -rot_x * _fps_camera_mult, -rot_y * _fps_camera_mult);
    }
}

function set_smooth_factor(value) {
    _smooth_factor = value;
}

function smooth_coeff() {
    return CAM_SMOOTH_CHARACTER_COEFF * _smooth_factor;
}

function create_mobile_controls(character, parent_elem) {
    var forward_btn = document.createElement("div");

    forward_btn.style.cssText =
        "position: absolute;" +
        "left: 10px;" +
        "bottom: 70px;" +
        "width: 53px;" +
        "height: 53px;" +
        "background-image: " + FORWARD_SVG;
    forward_btn.setAttribute("id", MOBILE_FORWARD_BTN_ID);


    var backwards_btn = document.createElement("div");
    backwards_btn.style.cssText =
        "position: absolute;" +
        "left: 10px;" +
        "bottom: 10px;" +
        "width: 53px;" +
        "height: 53px;" +
        "background-image: " + FORWARD_SVG +
        "transform: rotate(180deg);" +
        "transform-origin: center;";
    backwards_btn.setAttribute("id", MOBILE_BACKWARD_BTN_ID);

    parent_elem.appendChild(forward_btn);
    parent_elem.appendChild(backwards_btn);
}

function check_pointerlock(elem) {
    var request_plock = elem.requestPointerLock ||
            elem.webkitRequestPointerLock || elem.mozRequestPointerLock;
    return typeof request_plock === "function";
}

function rotate_cam_by_axis(obj, camobj, id, elapsed) {
    var h_axis = m_ctl.get_sensor_value(obj, id, 1);
    var v_axis = m_ctl.get_sensor_value(obj, id, 2);
    var rot_step_value = elapsed * ROT_STEP;
    var vert_axis_val = Math.abs(v_axis) < AXIS_THRESHOLD ? 0 : v_axis;
    var vert_ang = - vert_axis_val * rot_step_value;
    var hor_axis_val = Math.abs(h_axis) < AXIS_THRESHOLD ? 0 : h_axis;
    var hor_ang = - hor_axis_val * rot_step_value;
    vert_ang = m_util.clamp(vert_ang, MIN_VERT_ANG, MAX_VERT_ANG);
    m_cam.rotate_camera(camobj, hor_ang, vert_ang);
    var cam_angls = m_cam.get_camera_angles(camobj, _vec2_tmp);
    m_phy.set_character_rotation(obj, cam_angls[0] + Math.PI, 0);
}

function enable_rotation(elem, character) {
    if (check_pointerlock(elem) && !m_main.detect_mobile()) {
 
        var plock_mouse_sen = m_ctl.create_plock_mouse_sensor(elem);
        var plock_sen = _plock_sensor ? _plock_sensor : m_ctl.create_plock_sensor(elem);
        _plock_sensor = plock_sen;

        var fps_plock_logic_func = function(s) {
            return s[0] && s[1];
        }

        var fps_plock_sensors_cb = function(obj, id, pulse) {
            if (pulse > 0) {
                var payload = m_ctl.get_sensor_payload(obj, id, 0);
                _rotation_cb(obj, -payload.coords[0] * _fps_camera_mult,
                        -payload.coords[1] * _fps_camera_mult);
            }
        }
        m_ctl.create_sensor_manifold(character, "FPS_PLOCK", 
                m_ctl.CT_CONTINUOUS, [plock_mouse_sen, plock_sen],
                fps_plock_logic_func, fps_plock_sensors_cb);

        var fps_act_logic_func = function(s) {
            return s[0];
        }

        var fps_act_sensor_cb = function(obj, id, pulse) {
            if (pulse > 0) {
                if (_plock_cb.enable_cb)
                    _plock_cb.enable_cb(elem);
            } else
                if (_plock_cb.disable_cb)
                    _plock_cb.disable_cb(elem);
        }
        m_ctl.create_sensor_manifold(null, "FPS_ACTIVATE_PLOCK", 
                m_ctl.CT_TRIGGER, [plock_sen],
                fps_act_logic_func, fps_act_sensor_cb);
    } else {

        if (m_main.detect_mobile()) {
            var move_sen = m_ctl.create_touch_move_sensor("XY", elem);
            var click_sen = m_ctl.create_touch_click_sensor(elem);
            var drag_mult = DRAG_TOUCH_DELTA_MULT;
        } else {
            var move_sen = m_ctl.create_mouse_move_sensor("XY", elem);
            var click_sen = m_ctl.create_mouse_click_sensor(elem);
            var drag_mult = DRAG_MOUSE_DELTA_MULT;

            var camera = m_scs.get_active_camera();
            var cam_rot_sensor_cb = function(obj, id, pulse) {
                if (pulse > 0) {
                    var elapsed = m_ctl.get_sensor_value(obj, id, 0);
                    rotate_cam_by_axis(obj, camera, id, elapsed);
                }
            }
            var logic_func = function(s) {
                return Math.abs(s[1]) > AXIS_THRESHOLD || Math.abs(s[2]) > AXIS_THRESHOLD;
            };
            var e_s = m_ctl.create_elapsed_sensor();
            var h_axis = m_ctl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_2);
            var v_axis = m_ctl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_3);
            m_ctl.create_sensor_manifold(character, "FPS_CAM_ROT", m_ctl.CT_CONTINUOUS,
                    [e_s, h_axis, v_axis], logic_func, cam_rot_sensor_cb);
        }

        var move_x = 0;
        var move_y = 0;

        var press_logic_func = function(s) {
            return s[0];
        }
        var press_sensor_cb = function(obj, id, pulse) {
            if (pulse == 1) {
                var payload = m_ctl.get_sensor_payload(obj, id, 0);
                var coords = payload.coords;
                move_x = coords[0];
                move_y = coords[1];
            }
        }
        m_ctl.create_sensor_manifold(null, "FPS_DRAG_PRESS", 
                m_ctl.CT_SHOT, [click_sen],
                press_logic_func, press_sensor_cb);

        var move_logic_func = function(s) {
            return s[0] && s[1];
        }
        var move_sensor_cb = function(obj, id, pulse) {
            if (pulse == 1) {
                var payload = m_ctl.get_sensor_payload(obj, id, 0);
                var coords = payload.coords;
                _move_delta[0] += (coords[0] - move_x) * drag_mult;
                _move_delta[1] += (coords[1] - move_y) * drag_mult;

                move_x = coords[0];
                move_y = coords[1];
            }
        }
        m_ctl.create_sensor_manifold(null, "FPS_DRAG_MOVE", 
                m_ctl.CT_CONTINUOUS, [move_sen, click_sen],
                move_logic_func, move_sensor_cb);

        var elapsed = m_ctl.create_elapsed_sensor();

        m_ctl.create_sensor_manifold(character, "FPS_SMOOTH_DRAG", m_ctl.CT_CONTINUOUS,
            [elapsed], null, smooth_cb, _rotation_cb);
    }
}

function set_characters_camera(character, lock_camera) {
    var cam_obj = m_scs.get_active_camera();
    if (lock_camera) {
        var cam_trans = m_trans.get_translation(cam_obj, _vec3_tmp);
        var char_trans = m_trans.get_translation(character, _vec3_tmp2);
        m_vec3.subtract(cam_trans, char_trans, cam_trans);
        m_const.append_stiff_trans(cam_obj, character, cam_trans);
    }
    var angles = m_cam.get_camera_angles_char(cam_obj, _vec2_tmp);
    m_phy.set_character_rotation(character, angles[0], angles[1]);
}

function register_hmd(elem) {
    // camera rotation is enabled with HMD
    m_hmd.enable_hmd(m_hmd.HMD_ALL_AXES_MOUSE_NONE);

    m_input.add_click_listener(elem, m_screen.request_fullscreen_hmd);
}

function create_character_vr_rotate_sensor(character) {

    var e_s = m_ctl.create_elapsed_sensor();
    var camobj = m_scs.get_active_camera();

    var sensor_cb = function(obj, id, pulse) {
        var hor_angle = m_cam.get_camera_angles_char(camobj, _vec2_tmp)[0];
        m_phy.set_character_rotation(obj, hor_angle /*+ Math.PI*/, 0);
    }
    m_ctl.create_sensor_manifold(character, "FPS_CHARECTER_VR_ROT", m_ctl.CT_CONTINUOUS,
                [e_s], null, sensor_cb);
}

function check_vr_support() {
    var support = m_hmd.check_browser_support() && !m_main.detect_mobile();
    var device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
    if (device)
        support = support && m_input.get_value_param(device, m_input.HMD_WEBVR_TYPE) &
                        m_input.HMD_WEBVR1;
    return support;
}

function enable_camera_rotation(elem, character) {
    if (check_vr_support()) {
        register_hmd(elem);
        create_character_vr_rotate_sensor(character);
    } else {
        enable_rotation(elem, character);
    }
}

function enable_movements(elem, character, motion_cb, settings) {
    if (m_main.detect_mobile()) {
        var parent_elem = elem.parentElement ? elem.parentElement : elem;
        create_mobile_controls(character, parent_elem);
    }
    var sm = init_character_states(character);
    var move_state = {
        left: 0,
        right: 0,
        forw: 0,
        back: 0
    }
    var movestyle = -1;

    var move_dir_cd = settings.move_dir_cd;

    var check_character_look = function() {
        if (_is_freezed) {
            move_state.left = 0;
            move_state.right = 0;
            move_state.forw = 0;
            move_state.back = 0;
            return false;
        }
        return true;
    }

    var set_char_state = function(for_back, right_left) {
        var curr_state = get_state_machine_state(sm).id;
        if (!for_back && !right_left && curr_state != CS_CLIMB)
            state_machine_switch_state(sm, CS_STAY);
        else if (curr_state == CS_STAY) {
            if (movestyle > 0)
                state_machine_switch_state(sm, CS_RUN);
            else
                state_machine_switch_state(sm, CS_WALK);
        }
    }

    var move_forward_cb = function(value) {
        if (!check_character_look())
            return;
        var for_back_pr = move_state.forw + move_state.back;
        move_state.forw = value;
        var for_back = move_state.forw + move_state.back;
        var right_left = move_state.left + move_state.right;
        m_phy.set_character_move_dir(character, for_back, right_left);
        if (motion_cb)
            motion_cb(for_back, right_left);
        set_char_state(for_back, right_left);
        if (move_dir_cd && for_back_pr != for_back)
            move_dir_cd(for_back, right_left, 0);
    }
    var move_backward_cb = function(value) {
        if (!check_character_look())
            return;
        value = value > 0.0 ? 1.0 : value;
        value = value < 0.0 ? -1.0 : value;
        var for_back_pr = move_state.forw + move_state.back;
        move_state.back = -value;
        var for_back = move_state.forw + move_state.back;
        var right_left = move_state.left + move_state.right;
        m_phy.set_character_move_dir(character, for_back, right_left);
        if (motion_cb)
            motion_cb(for_back, right_left);
        set_char_state(for_back, right_left);
        if (move_dir_cd && for_back_pr != for_back)
            move_dir_cd(for_back, right_left, 0);
    }
    var move_right_cb = function(value) {
        if (!check_character_look())
            return;
        var curr_state = get_state_machine_state(sm).id;
        if (curr_state == CS_CLIMB)
            value = 0;
        value = value > 0.0 ? 1.0 : value;
        value = value < 0.0 ? -1.0 : value;
        var right_left_pr = move_state.left + move_state.right;
        move_state.right = -value;
        var for_back = move_state.forw + move_state.back;
        var right_left = move_state.left + move_state.right;
        m_phy.set_character_move_dir(character, for_back, right_left);
        if (motion_cb)
            motion_cb(for_back, right_left);
        set_char_state(for_back, right_left);
        if (move_dir_cd && right_left_pr != right_left)
            move_dir_cd(for_back, right_left, 0);
    }
    var move_left_cb = function(value) {
        if (!check_character_look())
            return;
        var curr_state = get_state_machine_state(sm).id;
        if (curr_state == CS_CLIMB)
            value = 0;
        var right_left_pr = move_state.left + move_state.right;
        move_state.left = value;
        var for_back = move_state.forw + move_state.back;
        var right_left = move_state.left + move_state.right;
        m_phy.set_character_move_dir(character, for_back, right_left);
        if (motion_cb)
            motion_cb(for_back, right_left);
        set_char_state(for_back, right_left);
        if (move_dir_cd && right_left_pr != right_left)
            move_dir_cd(for_back, right_left, 0);
    }

    var jump_cb = function(value) {
        if (!check_character_look())
            return;
        if (value > 0.0) {
            m_phy.character_jump(character);
            if (move_dir_cd)
                move_dir_cd(move_state.forw + move_state.back,
                        move_state.left + move_state.right, 1);
        }
    }
    var change_movestyle = function(value) {
        movestyle = value;
        if (Math.abs(move_state.forw + move_state.back) +
                Math.abs(move_state.left + move_state.right)) {
            if (value > 0.0)
                state_machine_switch_state(sm, CS_RUN);
            else
                state_machine_switch_state(sm, CS_WALK);
            if (move_dir_cd)
                move_dir_cd(move_state.forw + move_state.back,
                        move_state.left + move_state.right, 0);
        } else
            state_machine_switch_state(sm, CS_STAY);
    }

    var change_flystyle = function(value) {
        if (value > 0.0) {
            var state = get_state_machine_state(_character_sm).id;
            if (state == CS_WALK || state == CS_STAY)
                state_machine_switch_state(sm, CS_FLY);
            else
                state_machine_switch_state(sm, CS_WALK);
        }
    }
    var forward_sens_arr = settings.forward_sens_arr;
    var backward_sens_arr = settings.backward_sens_arr;
    var right_sens_arr = settings.right_sens_arr;
    var left_sens_arr = settings.left_sens_arr;
    var jump_sens_arr = settings.jump_sens_arr;
    var run_sens_arr = settings.run_sens_arr;
    var fly_sens_arr = settings.fly_sens_arr;

    bind_action(AT_PRESSED, forward_sens_arr, move_forward_cb);
    bind_action(AT_PRESSED, backward_sens_arr, move_backward_cb);
    bind_action(AT_PRESSED, right_sens_arr, move_right_cb);
    bind_action(AT_PRESSED, left_sens_arr, move_left_cb);
    bind_action(AT_PRESSED, jump_sens_arr, jump_cb);

    bind_action(AT_CONTINUOUS, [m_input.GMPD_AXIS_0], move_right_cb);
    bind_action(AT_CONTINUOUS, [m_input.GMPD_AXIS_1], move_backward_cb);

    bind_action(AT_PRESSED, run_sens_arr, change_movestyle);
    bind_action(AT_PRESSED, fly_sens_arr, change_flystyle);
}

function get_state_machine() {
    if (!_character_sm)
        _character_sm = {
            nodes: [],
            current_node: null,
            lock: false,
            last_state: null
        };
    return _character_sm;
}

function state_machine_add_state(state_machine, id, allowed_ids, call_switch,
        call_before_switch, call_after_switch) {
    state_machine.nodes.push({
        id: id,
        allowed_ids: allowed_ids,
        call_switch: call_switch,
        call_before_switch: call_before_switch,
        call_after_switch: call_after_switch
    });
}

function check_state_machine_validation(state_machine) {
    var names = [];
    for (var i = 0; i < state_machine.nodes; i++) {
        var id = state_machine.nodes[i].id;
        if (names.indexOf(id) >= 0)
            return false;
        else
            names.push(id);
    }
    for (var i = 0; i < state_machine.nodes; i++) {
        var node = state_machine.nodes[i];
        for (var j = 0; j < node.allowed_ids.length; j++) {
            if (names.indexOf(node.allowed_ids[j]) < 0)
                return false;
        }
    }
    return true;
}

function get_state_machine_node(state_machine, node_id) {
    var node = null;
    for (var i = 0; i < state_machine.nodes.length; i++) {
        if (state_machine.nodes[i].id == node_id) {
            node = state_machine.nodes[i];
            break;
        }
    }
    return node;
}

function set_state_machine_start_node(state_machine, node_id) {
    var node = get_state_machine_node(state_machine, node_id);
    state_machine.current_node = node;
    return node;
}

function get_state_machine_state(state_machine) {
    return state_machine.current_node;
}

function set_state_machine_node_after_cb(state_machine, state_id, callback) {
    var node = get_state_machine_node(state_machine, state_id);
    node.call_after_switch = callback;
}

function set_state_machine_node_before_cb(state_machine, state_id, callback) {
    var node = get_state_machine_node(state_machine, state_id);
    node.call_before_switch = callback;
}

function state_machine_switch_state(state_machine, new_state_id) {

    state_machine.last_state = new_state_id;
    if (state_machine.lock) {
        return false;
    }
    var cur_state = get_state_machine_state(state_machine);
    var old_state_id = cur_state.id;
    if (cur_state.allowed_ids.indexOf(new_state_id) >= 0) {
        var before = true;
        if (cur_state.call_before_switch) {
            before = cur_state.call_before_switch(old_state_id, new_state_id)
        }
        if (before) {
            set_state_machine_start_node(state_machine, new_state_id);
            if (cur_state.call_switch)
                cur_state.call_switch(old_state_id, new_state_id);
            if (cur_state.call_after_switch)
                cur_state.call_after_switch(old_state_id, new_state_id);
            return true
        }
    }
    return false
}

function init_character_states(character) {

    var sm = get_state_machine();

    var change_state_cb = function(old_state_id, new_state_id) {
        switch(new_state_id) {
        case CS_STAY:
        case CS_WALK:
            m_phy.set_character_move_type(character, m_phy.CM_WALK);
            break;
        case CS_RUN:
            m_phy.set_character_move_type(character, m_phy.CM_RUN);
            break;
        case CS_FLY:
            m_phy.set_character_move_type(character, m_phy.CM_FLY);
            break;
        case CS_CLIMB:
            m_phy.set_character_move_type(character, m_phy.CM_CLIMB);
            break;
        };
    }
    state_machine_add_state(sm, CS_STAY, [CS_WALK, CS_FLY, CS_RUN, CS_CLIMB], change_state_cb, 
            null, null);
    state_machine_add_state(sm, CS_WALK, [CS_RUN, CS_FLY, CS_CLIMB, CS_STAY], change_state_cb, 
            null, null);
    state_machine_add_state(sm, CS_RUN, [CS_WALK, CS_FLY, CS_CLIMB, CS_STAY], change_state_cb, 
            null, null);
    state_machine_add_state(sm, CS_FLY, [CS_WALK], change_state_cb, 
            null, null);
    state_machine_add_state(sm, CS_CLIMB, [CS_WALK, CS_RUN, CS_STAY], change_state_cb, 
            null, null);

    check_state_machine_validation(sm);
    set_state_machine_start_node(sm, CS_STAY);

    return _character_sm;
}

function remove_devices_controls() {
    for (var i = 0; i < _manifold_counter; i++)
        m_ctl.remove_sensor_manifold(null, "FPS_USER_CONTROL_ACTION_"
                + i.toString());
}

function remove_plock_controls(character, elem) {
    if (check_pointerlock(elem) && !m_main.detect_mobile()) {
        if (_plock_cb.disable_cb)
            _plock_cb.disable_cb(elem);
        m_ctl.remove_sensor_manifold(character, "FPS_PLOCK");
        m_ctl.remove_sensor_manifold(null, "FPS_ACTIVATE_PLOCK");
    }
}

function remove_drag_controls(character, elem) {
    if (!check_pointerlock(elem) || m_main.detect_mobile()) {
        m_ctl.remove_sensor_manifold(character, "FPS_CAM_ROT");
        m_ctl.remove_sensor_manifold(character, "FPS_DRAG_PRESS");
        m_ctl.remove_sensor_manifold(character, "FPS_DRAG_MOVE");
        m_ctl.remove_sensor_manifold(character, "FPS_SMOOTH_DRAG");
    }
}

function remove_hmd_controls(character) {
    if (check_vr_support())
        m_ctl.remove_sensor_manifold(character, "FPS_CHARECTER_VR_ROT");
}

function remove_mobile_controls(character, elem) {
    if (m_main.detect_mobile()) {
        var forward_btn = document.getElementById(MOBILE_FORWARD_BTN_ID);
        var backward_btn = document.getElementById(MOBILE_BACKWARD_BTN_ID);
        if (forward_btn)
            elem.removeChild(forward_btn);
        if (backward_btn)
            elem.removeChild(backward_btn);
    }
}
function set_curr_gamepad_id(new_id) {
    _curr_gamepad_id = new_id;
}
/**
 * Character state defining that character is staying.
 * @const {CharacterState} module:fps.CS_STAY
 */
exports.CS_STAY = CS_STAY;
/**
 * Character state defining that character is in walk-mode.
 * @const {CharacterState} module:fps.CS_WALK
 */
exports.CS_WALK = CS_WALK;
/**
 * Character state defining that character is in run-mode.
 * @const {CharacterState} module:fps.CS_RUN
 */
exports.CS_RUN = CS_RUN;
/**
 * Character state defining that character is in fly-mode.
 * @const {CharacterState} module:fps.CS_FLY
 */
exports.CS_FLY = CS_FLY;
/**
 * Character state defining that character is in climb-mode.
 * @const {CharacterState} module:fps.CS_CLIMB
 */
exports.CS_CLIMB = CS_CLIMB;

/**
 * An input type detecting a discrete user action, e.g. button press.
 * @const module:fps.AT_PRESSED
 */
exports.AT_PRESSED = AT_PRESSED;
/**
 * An input type detecting a discrete user action, e.g. button release.
 * @const module:fps.AT_RELEASED
 */
exports.AT_RELEASED = AT_RELEASED;
/**
 * An input type detecting a continuous user action,
 * e.g. a held down button, mouse movement, gamepad stick tilt etc.
 * @const module:fps.AT_CONTINUOUS
 */
exports.AT_CONTINUOUS = AT_CONTINUOUS;

/**
 * Bind action callback to user controls. This allows to set and define an additional
 * action to an event and set the conditions to when and how the event happens.
 * @method module:fps.bind_action
 * @param {number} action_type Type of action
 * @param {Array} action_controls Array of sensor types
 * @param {Function} action_cb Function which applies logic
 * @example var m_ctl = require("controls");
 * var m_fps = require("fps");
 * var m_input = require("input");
 *
 * var action_cb = function(value) {
 *     console.log(value);
 * };
 *
 * // bind custom callback to be executed after pressing the W key or one of the gamepad 
 * // buttons or after clicking/touching the html element with the "forward_button_id" id
 * m_fps.bind_action(m_fps.AT_PRESSED, [m_ctl.KEY_W, m_input.GMPD_BUTTON_12,
 *          "forward_button_id"], action_cb);
 */
exports.bind_action = bind_action;
function bind_action(action_type, action_controls, action_cb) {

    if (!action_controls.length)
        return;

    var sensors = [];
    for (var j = 0; j < action_controls.length; j++) {
        if (typeof action_controls[j] == "number") {
            if (action_controls[j] < GMPD_BTNS_OFFSET)
                sensors.push(m_ctl.create_keyboard_sensor(action_controls[j]));
            else if (action_controls[j] < GMPD_AXIS_OFFSET) {
                sensors.push(m_ctl.create_gamepad_btn_sensor(action_controls[j],
                        _curr_gamepad_id));
            } else
                sensors.push(m_ctl.create_gamepad_axis_sensor(action_controls[j]));
        } else if (typeof action_controls[j] == "string") {
            var control_element = document.getElementById(action_controls[j]);
            if (control_element) {
                sensors.push(m_ctl.create_touch_click_sensor(control_element));
            } else
                m_print.error("Couldn't find element with " +
                        action_controls[j] + " ID.");
        }

    }

    var logic_func = function(s) {
        return false;
    }
    var type = m_ctl.CT_SHOT;
    var manifold_cb = function(obj, id, pulse, sens_num) {}

    switch(action_type) {
    case AT_PRESSED:
        type = m_ctl.CT_TRIGGER;
        logic_func = function(s) {
            for (var i = 0; i < s.length; i++)
                if (s[i])
                    return true;
                return false;
        }
        manifold_cb = function(obj, id, pulse, sens_num) {
            if (pulse > 0)
                action_cb(1.0);
            else
                action_cb(0.0);
        }
        break;
    case AT_RELEASED:
        type = m_ctl.CT_TRIGGER;
        logic_func = function(s) {
            for (var i = 0; i < s.length; i++)
                if (s[i])
                    return true;
                return false;
        }
        manifold_cb = function(obj, id, pulse, sens_num) {
            if (pulse < 0)
                action_cb(1.0);
            else
                action_cb(0.0);
        }
        break;
    case AT_CONTINUOUS:
        type = m_ctl.CT_CONTINUOUS;
        logic_func = function(s) {
            for (var i = 0; i < s.length; i++)
                if (Math.abs(s[i]) > AXIS_THRESHOLD)
                    return true;
                return false;
        }
        manifold_cb = function(obj, id, pulse, sens_num) {
            if (pulse > 0) {
                for (var i = 0; i < sens_num; i++) {
                    var value = m_ctl.get_sensor_value(obj, id, i);
                    if (Math.abs(value) > AXIS_THRESHOLD) {
                        action_cb(value);
                        return;
                    }
                }
            } else
                action_cb(0.0);
        }
        break;
    };

    var action_id = "FPS_USER_CONTROL_ACTION_" + _manifold_counter.toString();
    var sensors_number = sensors.length;
    m_ctl.create_sensor_manifold(null, action_id, type,
            sensors, logic_func, manifold_cb, sensors_number);
    _manifold_counter++;
}
/**
 * Enable FPS controls. This sets keyboard, gamepad and mouse controls.
 * VR is also plug-and-play ready.
 * @method module:fps.enable_fps_controls
 * @param {Object}   [options={}] Initialization options.
 * @param {Object3D}   [options.character=The result of the {@link module:scenes.get_first_character|get_first_character()} method call] Character.
 * @param {HTMLElement} [options.element=The result of the {@link module:container.get_canvas|get_canvas()} method call] HTML element to add event listeners to.
 * @param {CharMotionCallback}  [options.motion_cb=null] Motion callback function
 * @param {number}  [options.gamepad_id=0] Connected gamepad ID.
 * @param {number[]}  [options.forward_sens=[{@link module:controls.KEY_W|KEY_W}, {@link module:input.GMPD_BUTTON_12|GMPD_BUTTON_12}]] Array of sensor types used for forward motion.
 * @param {number[]}  [options.backward_sens=[{@link module:controls.KEY_S|KEY_S}, {@link module:input.GMPD_BUTTON_13|GMPD_BUTTON_13}]] Array of sensor types used for backward motion.
 * @param {number[]}  [options.right_sens=[{@link module:controls.KEY_D|KEY_D}, {@link module:input.GMPD_BUTTON_15|GMPD_BUTTON_15}]] Array of sensor types used for right motion.
 * @param {number[]}  [options.left_sens=[{@link module:controls.KEY_A|KEY_A}, {@link module:input.GMPD_BUTTON_14|GMPD_BUTTON_14}]] Array of sensor types used for left motion.
 * @param {number[]}  [options.jump_sens=[{@link module:controls.KEY_SPACE|KEY_SPACE}, {@link module:input.GMPD_BUTTON_1|GMPD_BUTTON_1}]] Array of sensor types used for jumping.
 * @param {number[]}  [options.fly_sens=[{@link module:controls.KEY_SHIFT|KEY_SHIFT}, {@link module:input.GMPD_BUTTON_7|GMPD_BUTTON_7}]] Array of sensor types used for flying.
 * @param {CharRotationCallback}  [options.rotation_cb] Callback for camera rotation. If not specified, the default one will be used.
 * @param {boolean} [options.lock_camera=false] Parent camera to the character
 * @cc_externs character element gamepad_id
 * @cc_externs forward_sens backward_sens right_sens left_sens
 * @cc_externs report_init_failure pause_invisible key_pause_enabled
 * @cc_externs jump_sens fly_sens rotation_cb lock_camera
 * @cc_externs move_dir_cd motion_cb
 * @example var m_fps = require("fps");
 *
 * var character = m_scene.get_first_character();
 *
 * var move_cb = function(forw_back, right_left) {
 *     console.log(forw_back, right_left);  
 * }
 *
 * m_fps.enable_fps_controls(character, null, move_cb);
 */
exports.enable_fps_controls = function(options) {
    options = options || {lock_camera : true};
    var character = options.character || m_scs.get_first_character();
    if (!character)
        return;
    var elem = options.element || m_cont.get_canvas();
    var motion_cb = options.motion_cb || null;
    set_curr_gamepad_id(options.gamepad_id || 0);

    var forward_sens_arr = options.forward_sens || [m_ctl.KEY_W, m_input.GMPD_BUTTON_12];
    var backward_sens_arr = options.backward_sens || [m_ctl.KEY_S, m_input.GMPD_BUTTON_13];
    var right_sens_arr = options.right_sens || [m_ctl.KEY_D, m_input.GMPD_BUTTON_15];
    var left_sens_arr = options.left_sens || [m_ctl.KEY_A, m_input.GMPD_BUTTON_14];
    var jump_sens_arr = options.jump_sens || [m_ctl.KEY_SPACE, m_input.GMPD_BUTTON_1];
    var run_sens_arr = options.run_sens || [m_ctl.KEY_SHIFT, m_input.GMPD_BUTTON_7];
    var fly_sens_arr = options.fly_sens || [];

    if (m_main.detect_mobile()) {
        forward_sens_arr.push(MOBILE_FORWARD_BTN_ID);
        backward_sens_arr.push(MOBILE_BACKWARD_BTN_ID);
    }

    var move_dir_cd = options.move_dir_cd || null;

    var configs = {
        forward_sens_arr : forward_sens_arr,
        backward_sens_arr : backward_sens_arr,
        right_sens_arr : right_sens_arr,
        left_sens_arr : left_sens_arr,
        jump_sens_arr : jump_sens_arr,
        run_sens_arr : run_sens_arr,
        fly_sens_arr : fly_sens_arr,
        move_dir_cd: move_dir_cd
    };
    _rotation_cb = options.rotation_cb || default_rotation_cb;
    var lock_camera = typeof options.lock_camera != "undefined" ? options.lock_camera : true;
    set_characters_camera(character, lock_camera);
    enable_camera_rotation(elem, character);
    enable_movements(elem, character, motion_cb, configs);
}
/**
 * Disable FPS controls.
 * @method module:fps.disable_fps_controls
 * @param {Object3D} [character=The result of the {@link module:scenes.get_first_character|get_first_character()} method call] Character
 * @param {HTMLElement} [elem=Canvas container element] HTML element to add event listeners to
 * @example var m_fps = require("fps");
 *
 * m_fps.disable_fps_controls();
 */
exports.disable_fps_controls = function(character, elem) {
    character = character || m_scs.get_first_character();
    elem = elem || m_cont.get_container();

    if (!character)
        return;

    remove_devices_controls();
    remove_plock_controls(character, elem);
    remove_drag_controls(character, elem);
    remove_hmd_controls(character);
    remove_mobile_controls(character, elem);
}
/**
 * Set character state changing callback function.
 * @method module:fps.set_state_change_cb
 * @param {number} state_id State ID
 * @param {ChangeStateCallback} callback Callback function
 * @example var m_fps = require("fps");
 *
 * var state_changing_cb = function(old_state_id, new_state_id) {
 *     console.log(old_state_id, new_state_id);  
 * }
 *
 * m_fps.set_state_change_cb(m_fps.CS_WALK, state_changing_cb);
 */
exports.set_state_change_cb = function(state_id, callback) {
    var sm = _character_sm;
    set_state_machine_node_after_cb(sm, state_id, callback);
}
/**
 * Set character's camera smooth behavior
 * @method module:fps.set_cam_smooth_factor
 * @param {number} value Smooth factor
 * @example var m_fps = require("fps");
 *
 * m_fps.set_cam_smooth_factor(0.2);
 */
exports.set_cam_smooth_factor = function(value) {
    m_ctl.set_plock_smooth_factor(value);
    set_smooth_factor(value);
}
/**
 * Set character's camera smooth behavior
 * @method module:fps.get_cam_smooth_factor
 * @example var m_fps = require("fps");
 *
 * var smooth_factor = m_fps.get_cam_smooth_factor();
 */
exports.get_cam_smooth_factor = function() {
    return _smooth_factor;
}
/**
 * Set character's camera mouse sensitivity
 * @method module:fps.set_cam_sensitivity
 * @param {number} value Sensitivity
 * @example var m_fps = require("fps");
 *
 * m_fps.set_cam_sensitivity(80);
 */
exports.set_cam_sensitivity = set_cam_sensitivity;
function set_cam_sensitivity(value) {
    _fps_camera_mult = value / MULT_SCALE;
}
/**
 * Get character's camera mouse sensitivity
 * @method module:fps.get_cam_sensitivity
 * @example var m_fps = require("fps");
 *
 * var sens = m_fps.get_cam_sensitivity();
 */
exports.get_cam_sensitivity = get_cam_sensitivity;
function get_cam_sensitivity() {
    return _fps_camera_mult * MULT_SCALE;
}
/**
 * Set pointerlock callback function, which is called when pointerlock is enabled
 * @method module:fps.set_plock_enable_cb
 * @param {PlockCallback} callback Callback function
 * @example var m_fps = require("fps");
 * var cb = function(element) {
 *     console.log("pointerlock is enabled");  
 * }
 *
 * m_fps.set_plock_enable_cb(cb);
 */
exports.set_plock_enable_cb = function(callback) {
    _plock_cb.enable_cb = callback;
}
/**
 * Set pointerlock callback function, which is called when pointerlock is disabled
 * @method module:fps.set_plock_disable_cb
 * @param {PlockCallback} callback Callback function
 * @example var m_fps = require("fps");
 *
 * var cb = function(element) {
 *     console.log("pointerlock is disabled");  
 * }
 *
 * m_fps.set_plock_disable_cb(cb);
 */
exports.set_plock_disable_cb = function(callback) {
    _plock_cb.disable_cb = callback;
}
/**
 * Get character's current state.
 * @method module:fps.get_character_state
 * @returns {CharacterState} Character's current state
 * @example var m_fps = require("fps");
 *
 * var curr_state = m_fps.get_character_state();
 *
 * if (curr_state == m_fps.CS_RUN) 
 *     console.log("Character is running");
 */
exports.get_character_state = function() {
    return get_state_machine_state(_character_sm).id;
}
/**
 * Add new character's state.
 * @method module:fps.add_new_state
 * @returns {CharacterState} Character's new state
 * @example var m_fps = require("fps");
 *
 * var new_state = m_fps.add_new_state();
 */
exports.add_new_state = function() {
    return _state_counter++;
}
/**
 * Add new character's state to its state machine.
 * @method module:fps.add_state
 * @param {CharacterState} new_state Character's new state
 * @param {CharacterState[]} enabled_transitions Enabled transitions to another states
 * @param {ChangeStateCallback} change_state_cb Callback function
 * @example var m_fps = require("fps");
 *
 * var new_state = m_fps.add_new_state();
 * var state_changing_cb = function(old_state_id, new_state_id) {
 *     console.log(old_state_id, new_state_id);  
 * }
 * m_fps.add_state(new_state, [m_fps.CS_WALK, m_fps.CS_RUN], state_changing_cb);
 */
exports.add_state = function(new_state, enabled_transitions, change_state_cb) {
    var sm = get_state_machine();
    state_machine_add_state(sm, new_state, enabled_transitions, change_state_cb, 
            null, null);
    if (!check_state_machine_validation(sm))
        m_print.error("Incorrect state machine.");
}
/**
 * Switch character's state.
 * @method module:fps.switch_state
 * @param {CharacterState} state Character's state
 * @example var m_fps = require("fps");
 *
 * m_fps.switch_state(m_fps.CS_WALK);
 */
exports.switch_state = function(state) {
    var sm = get_state_machine();
    state_machine_switch_state(sm, state);
}
/**
 * Lock character's state changing.
 * @method module:fps.lock_character
 * @example var m_fps = require("fps");
 *
 * m_fps.lock_character();
 */
exports.lock_character = function() {
    var sm = get_state_machine();
    sm.lock = true;
}
/**
 * Unlock character's state changing.
 * @method module:fps.unlock_character
 * @example var m_fps = require("fps");
 *
 * m_fps.unlock_character();
 */
exports.unlock_character = function() {
    var sm = get_state_machine();
    sm.lock = false;
}
/**
 * Check if character's state changing is locked.
 * @method module:fps.is_character_locked
 * @example var m_fps = require("fps");
 *
 * if (m_fps.is_character_locked())
 *     console.log("character is locked");
 */
exports.is_character_locked = function() {
    var sm = get_state_machine();
    return sm.lock;
}
/**
 * Set character rotation callback.
 * @method module:fps.set_rotation_cb
 * @param {CharRotationCallback} rotation_cb Character's rotation callback
 * @example var m_fps = require("fps");
 *
 * m_fps.set_rotation_cb(function(char, rot_x, rot_y) {});
 */
exports.set_rotation_cb = function(rotation_cb) {
    if (!rotation_cb)
        _rotation_cb = default_rotation_cb;
    else
        _rotation_cb = rotation_cb;
}
/**
 * Freeze character's movements.
 * @method module:fps.freeze_movements
 * @example var m_fps = require("fps");
 *
 * m_fps.freeze_movements();
 */
exports.freeze_movements = function() {
    _is_freezed = true;
}
/**
 * Unfreeze character's movements.
 * @method module:fps.unfreeze_movements
 * @example var m_fps = require("fps");
 *
 * m_fps.unfreeze_movements();
 */
exports.unfreeze_movements = function() {
    _is_freezed = false;
}

};
