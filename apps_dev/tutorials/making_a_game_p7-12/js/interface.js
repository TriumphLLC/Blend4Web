"use strict"

if (b4w.module_check("interface"))
    throw "Failed to register module: interface";

b4w.register("interface", function(exports, require) {

var m_char = require("character");
var m_conf = require("game_config");
var m_ctl   = require("controls");
var m_time  = require("time");

exports.init_interface = function() {
    m_ctl.create_timer_sensor(1)
}

exports.update_hp_bar = function(hp) {

    hp = m_char.get_wrapper().hp

    var green_elem = document.getElementById("life_bar_green");
    var red_elem = document.getElementById("life_bar_red");
    var mid_elem = document.getElementById("life_bar_mid");

    var hp_px_ratio = 192 / m_conf.MAX_CHAR_HP;
    var green_width = Math.max(hp * hp_px_ratio, 0);
    var red_width = Math.min((m_conf.MAX_CHAR_HP - hp) * hp_px_ratio, 192);

    green_elem.style.width =  green_width + "px";
    red_elem.style.width =  red_width + "px";
    mid_elem.style.left = green_width + 19 + "px";
}

exports.setup_touch_controls = function (right_arrow, up_arrow, left_arrow,
                                         down_arrow, jump, attack) {

    var touch_start_pos = new Float32Array(2);

    var move_touch_idx;
    var jump_touch_idx;
    var attack_touch_idx;

    var tap_elem = document.getElementById("control_tap");
    var control_elem = document.getElementById("control_circle");
    var tap_elem_offset = tap_elem.clientWidth / 2;
    var ctrl_elem_offset = control_elem.clientWidth / 2;

    function touch_start_cb(event) {
        event.preventDefault();

        var w = window.innerWidth;

        var touches = event.changedTouches;

        for (var i = 0; i < touches.length; i++) {
            var touch = touches[i];
            var x = touch.clientX;
            var y = touch.clientY;

            if (x > w / 2) // right side of the screen
                break;

            touch_start_pos[0] = x;
            touch_start_pos[1] = y;
            move_touch_idx = touch.identifier;

            tap_elem.style.visibility = "visible";
            tap_elem.style.left = x - tap_elem_offset + "px";
            tap_elem.style.top  = y - tap_elem_offset + "px";

            control_elem.style.visibility = "visible";
            control_elem.style.left = x - ctrl_elem_offset + "px";
            control_elem.style.top  = y - ctrl_elem_offset + "px";
        }
    }

    function touch_jump_cb (event) {
        event.preventDefault();

        var touches = event.changedTouches;

        for (var i = 0; i < touches.length; i++) {
            var touch = touches[i];
            m_ctl.set_custom_sensor(jump, 1);
            jump_touch_idx = touch.identifier;
        }
    }

    function touch_attack_cb (event) {
        event.preventDefault();

        var touches = event.changedTouches;

        for (var i = 0; i < touches.length; i++) {
            var touch = touches[i];
            m_ctl.set_custom_sensor(attack, 1);
            attack_touch_idx = touch.identifier;
        }
    }

    function touch_move_cb(event) {
        event.preventDefault();

        m_ctl.set_custom_sensor(up_arrow, 0);
        m_ctl.set_custom_sensor(down_arrow, 0);
        m_ctl.set_custom_sensor(left_arrow, 0);
        m_ctl.set_custom_sensor(right_arrow, 0);

        var w = window.innerWidth;

        var touches = event.changedTouches;

        for (var i=0; i < touches.length; i++) {
            var touch = touches[i];
            var x = touch.clientX;
            var y = touch.clientY;

            if (x > w / 2) // right side of the screen
                break;

            tap_elem.style.left = x - tap_elem_offset + "px";
            tap_elem.style.top  = y - tap_elem_offset + "px";

            var d_x = x - touch_start_pos[0];
            var d_y = y - touch_start_pos[1];

            var r = Math.sqrt(d_x * d_x + d_y * d_y);

            if (r < 16) // don't move if control is too close to the center
                break;

            var cos = d_x / r;
            var sin = -d_y / r;

            if (cos > Math.cos(3 * Math.PI / 8))
                m_ctl.set_custom_sensor(right_arrow, 1);
            else if (cos < -Math.cos(3 * Math.PI / 8))
                m_ctl.set_custom_sensor(left_arrow, 1);

            if (sin > Math.sin(Math.PI / 8))
                m_ctl.set_custom_sensor(up_arrow, 1);
            else if (sin < -Math.sin(Math.PI / 8))
                m_ctl.set_custom_sensor(down_arrow, 1);
        }
    }

    function touch_end_cb(event) {
        event.preventDefault();

        var touches = event.changedTouches;

        for (var i=0; i < touches.length; i++) {

            if (touches[i].identifier == move_touch_idx) {
                m_ctl.set_custom_sensor(up_arrow, 0);
                m_ctl.set_custom_sensor(down_arrow, 0);
                m_ctl.set_custom_sensor(left_arrow, 0);
                m_ctl.set_custom_sensor(right_arrow, 0);
                tap_elem.style.visibility = "hidden";
                control_elem.style.visibility = "hidden";
                move_touch_idx = null;

            } else if (touches[i].identifier == jump_touch_idx) {
                m_ctl.set_custom_sensor(jump, 0);
                jump_touch_idx = null;
            } else if (touches[i].identifier == attack_touch_idx) {
                m_ctl.set_custom_sensor(attack, 0);
                attack_touch_idx = null;
            }
        }
    }

    document.getElementById("canvas3d").addEventListener("touchstart", touch_start_cb, false);
    document.getElementById("control_jump").addEventListener("touchstart", touch_jump_cb, false);
    document.getElementById("control_attack").addEventListener("touchstart", touch_attack_cb, false);

    document.getElementById("canvas3d").addEventListener("touchmove", touch_move_cb, false);

    document.getElementById("canvas3d").addEventListener("touchend", touch_end_cb, false);
    document.getElementById("controls").addEventListener("touchend", touch_end_cb, false);

    document.getElementById("control_jump").style.visibility = "visible";
    document.getElementById("control_attack").style.visibility = "visible";
}

exports.register_replay_cb = function(replay_cb) {
    document.getElementById("replay").addEventListener("touchstart", replay_cb, false);
    document.getElementById("replay").addEventListener("click", replay_cb, false);
}

exports.show_replay_button = function(period) {
    var replay_button = document.getElementById("replay");
    show_elem(replay_button, period);
}

exports.hide_replay_button = function(period) {
    var replay_button = document.getElementById("replay");
    hide_elem(replay_button, period);
}

exports.show_victory_element = function(period) {
    var victory_elem = document.getElementById("victory");
    show_elem(victory_elem, period);
}

exports.hide_victory_element = function(period) {
    var victory_elem = document.getElementById("victory");
    hide_elem(victory_elem, period);
}

function show_elem(elem, period) {

    period = period || 0;

    elem.style.opacity = 0;
    elem.style.visibility = "visible";

    var finish_time = m_time.get_timeline() + period;

    function show_elem_cb(obj, id, pulse) {
        var time_left = finish_time - m_time.get_timeline();
        if (time_left < 0) {
            m_ctl.remove_sensor_manifold(null, "SHOW_"+ elem.id);
            return;
        }
        var opacity = 1 - time_left / period;
        elem.style.opacity = opacity;
    }

    if (!m_ctl.check_sensor_manifold(null, "SHOW_" + elem.id)) {
        var elapsed_sens = m_ctl.create_elapsed_sensor();
        m_ctl.create_sensor_manifold(null, "SHOW_" + elem.id,
            m_ctl.CT_CONTINUOUS, [elapsed_sens], null, show_elem_cb);
    }
}

function hide_elem(elem, period) {

    period = period || 0;

    var start_opacity = elem.style.opacity;
    var finish_time = m_time.get_timeline() + period;

    function show_elem_cb(obj, id, pulse) {
        var time_left = finish_time - m_time.get_timeline();
        if (time_left < 0) {
            elem.style.visibility = "hidden";
            m_ctl.remove_sensor_manifold(null, "HIDE_"+ elem.id);
            return;
        }
        var opacity = time_left / period;
        elem.style.opacity = start_opacity * opacity;
    }

    if (!m_ctl.check_sensor_manifold(null, "HIDE_" + elem.id)) {
        var elapsed_sens = m_ctl.create_elapsed_sensor();
        m_ctl.create_sensor_manifold(null, "HIDE_" + elem.id,
            m_ctl.CT_CONTINUOUS, [elapsed_sens], null, show_elem_cb);
    }
}

})
