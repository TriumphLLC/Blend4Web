"use strict"

if (b4w.module_check("interface"))
    throw "Failed to register module: interface";

b4w.register("interface", function(exports, require) {

var m_char  = require("character");
var m_conf  = require("game_config");
var m_ctl   = require("controls");
var m_main  = require("main");
var m_time  = require("time");
var m_data  = require("data");
var m_cfg   = require("config");
var m_cont  = require("container");

var ASSETS_PATH = m_cfg.get_std_assets_path() + "petigors_tale/";

var _touch_start_cb = null;
var _touch_jump_cb = null;
var _touch_attack_cb = null;
var _touch_move_cb = null;
var _touch_end_cb = null;

var _vec2_tmp = new Float32Array(2);

exports.init = function(replay_cb, elapsed_sensor, intro_load_cb,
                        preloader_cb, plock_cb, level_name,
                        load_level) {
    var replay_button = document.getElementById("replay");
    var life_bar      = document.getElementById("life_bar");

    var game_menu     = document.getElementById("game_menu");
    var menu_resume   = document.getElementById("menu_resume");
    var menu_help     = document.getElementById("menu_help");
    var menu_restart  = document.getElementById("menu_restart");
    var menu_exit     = document.getElementById("menu_exit");
    var menu_credits  = document.getElementById("menu_credits");

    var control_circle = document.getElementById("control_circle");
    var controls_elem = document.getElementById("controls");
    var game_menu_calling = document.getElementById("game_menu_calling");
    var next_level = document.getElementById("next_level");
    var victory_elem = document.getElementById("victory");

    var credits_panel  = document.getElementById("credits_panel");
    var authors_panel  = document.getElementById("authors_list");
    var authors_list_exit  = document.getElementById("authors_list_exit");
    var authors_click_area = document.getElementById("authors_click_area");
    var help_panel  = document.getElementById("help_panel");
    var preloader_cont = document.getElementById("preloader_cont");

    var back_to_menu  = document.getElementById("back_to_menu");
    var under_construction = document.getElementById("under_construct");

    var canvas_shadow = document.getElementById("canvas_shadow");
    var canvas_elem = m_cont.get_canvas();

    function resume_cb() {
        m_main.resume();
        hide_elem(game_menu, 0.5);
        hide_elem(canvas_shadow);
        plock_cb(); // should be after m_main.resume()
    }
    function credits_cb() {
        show_elem(credits_panel);
    }
    function authors_cb(e) {
        e.preventDefault();
        e.stopPropagation();

        show_elem(authors_panel);
    }
    function help_cb() {
        show_elem(help_panel);
    }
    function menu_exit_cb() {
        m_main.resume();
        m_data.unload();

        hide_elem(back_to_menu);
        hide_elem(under_construction);
        hide_elem(game_menu);
        hide_elem(canvas_shadow);
        hide_elem(life_bar);
        hide_elem(game_menu_calling);
        hide_elem(controls_elem);
        hide_elem(control_circle);

        show_elem(preloader_cont);
        canvas_elem.removeEventListener("mouseup", plock_cb);

        if (m_main.detect_mobile()) {
            remove_touch_controls();
            m_data.load(ASSETS_PATH + "intro_LQ.json", intro_load_cb, preloader_cb, true);
        } else
            m_data.load(ASSETS_PATH + "intro_HQ.json", intro_load_cb, preloader_cb, true);
    }
    function menu_restart_cb() {
        m_main.resume();
        hide_elem(game_menu);
        hide_elem(canvas_shadow);
        replay_cb(elapsed_sensor);
        plock_cb(); // should be after m_main.resume()
    }
    function replay_btn_cb() {
        hide_elem(replay_button);
        hide_elem(victory_elem);
        replay_cb(elapsed_sensor);
        plock_cb();
    }
    function show_menu_cb() {
        if (game_menu.style.visibility != "visible") {
            m_main.pause();
            hide_elem(replay_button);
            show_elem(game_menu);
            show_elem(canvas_shadow);
        }
    }
    function next_level_cb(e) {
        e.stopPropagation();
        e.preventDefault();
        hide_elem(victory_elem);
        hide_elem(life_bar);
        hide_elem(controls_elem);
        hide_elem(control_circle);
        switch (level_name) {
        case "level_01":
            load_level("level_02");
            break;
        case "level_02":
            load_level("quest");
            break;
        }
    }

    if (m_main.detect_mobile()) {
        menu_resume.addEventListener("touchstart", resume_cb, false);
        menu_help.addEventListener("touchstart", help_cb, false);
        menu_exit.addEventListener("touchstart", menu_exit_cb, false);
        menu_credits.addEventListener("touchstart", credits_cb, false);
        authors_click_area.addEventListener("touchstart", authors_cb, false);
        menu_restart.addEventListener("touchstart", menu_restart_cb, false);
        replay_button.addEventListener("touchstart", replay_btn_cb, false);
        victory_elem.addEventListener("touchstart", replay_btn_cb, false);
        credits_panel.addEventListener("touchstart", function(){hide_elem(credits_panel)}, false);
        authors_list_exit.addEventListener("touchstart", function(){hide_elem(authors_panel)}, false);
        help_panel.addEventListener("touchstart", function(){hide_elem(help_panel)}, false);
        next_level.addEventListener("touchstart", next_level_cb, false);
        help_panel.setAttribute("mobile", "1");

        back_to_menu.addEventListener("touchstart", menu_exit_cb, false);
        game_menu_calling.addEventListener("touchstart", show_menu_cb, false);
    } else {
        menu_resume.addEventListener("click", resume_cb, false);
        menu_help.addEventListener("click", help_cb, false);
        menu_exit.addEventListener("click", menu_exit_cb, false);
        menu_credits.addEventListener("click", credits_cb, false);
        authors_click_area.addEventListener("click", authors_cb, false);
        menu_restart.addEventListener("click", menu_restart_cb, false);
        replay_button.addEventListener("click", replay_btn_cb, false);
        victory_elem.addEventListener("click", replay_btn_cb, false);
        credits_panel.addEventListener("click", function(){hide_elem(credits_panel)}, false);
        authors_list_exit.addEventListener("click", function(){hide_elem(authors_panel)}, false);
        help_panel.addEventListener("click", function(){hide_elem(help_panel)}, false);
        next_level.addEventListener("click", next_level_cb, false);
        help_panel.setAttribute("mobile", "0");

        back_to_menu.addEventListener("click", menu_exit_cb, false);
        game_menu_calling.addEventListener("click", show_menu_cb, false);
    }

    if (level_name == "under_construction") {
        show_elem(back_to_menu);
        show_elem(under_construction);
    } else {
        show_elem(life_bar);
        if (m_main.detect_mobile())
            show_elem(game_menu_calling);

        var key_esc = m_ctl.KEY_ESC;
        m_ctl.create_kb_sensor_manifold(null, "SHOW_MENU", m_ctl.CT_SHOT, key_esc, show_menu_cb);
        exports.update_hp_bar();
    }
}

exports.update_hp_bar = function() {

    var hp = m_char.get_wrapper().hp

    var green_elem = document.getElementById("life_bar_green");
    var red_elem = document.getElementById("life_bar_red");

    var hp_px_ratio = 100 / m_conf.MAX_CHAR_HP;
    var green_width = Math.max(hp * hp_px_ratio, 0);
    var red_width = Math.min((m_conf.MAX_CHAR_HP - hp) * hp_px_ratio, 100);

    green_elem.style.width =  green_width + "%";
    red_elem.style.width =  red_width + "%";
}

function remove_touch_controls() {
    document.getElementById("canvas3d").removeEventListener("touchstart", _touch_start_cb);
    document.getElementById("control_jump").removeEventListener("touchstart", _touch_jump_cb);
    document.getElementById("control_attack").removeEventListener("touchstart", _touch_attack_cb);
    document.getElementById("canvas3d").removeEventListener("touchmove", _touch_move_cb);
    document.getElementById("canvas3d").removeEventListener("touchend", _touch_end_cb);
}

exports.setup_touch_controls = function(right_arrow, up_arrow, left_arrow,
                                        down_arrow, jump, attack, rotation_cb) {

    var move_touch_start_pos = new Float32Array(2);
    var rot_prev_touch = new Float32Array(2);

    var move_touch_idx;
    var rot_touch_idx;
    var jump_touch_idx;
    var attack_touch_idx;

    var tap_elem = document.getElementById("control_tap");
    var control_circle = document.getElementById("control_circle");
    var controls_elem = document.getElementById("controls");
    var tap_elem_offset = tap_elem.clientWidth / 2;
    var ctrl_elem_offset = control_circle.clientWidth / 2;

    function touch_start_cb(event) {
        event.preventDefault();

        var w = window.innerWidth;

        var touches = event.changedTouches;

        for (var i = 0; i < touches.length; i++) {
            var touch = touches[i];
            var client_x = touch.clientX;
            var client_y = touch.clientY;
            var canvas_xy = m_cont.client_to_canvas_coords(client_x, client_y, _vec2_tmp);
            var x = canvas_xy[0];
            var y = canvas_xy[1];

            if (x > w / 2) { // right side of the screen
                rot_prev_touch[0] = x;
                rot_prev_touch[1] = y;
                rot_touch_idx = touch.identifier;
                continue;
            }
            move_touch_start_pos[0] = x;
            move_touch_start_pos[1] = y;

            move_touch_idx = touch.identifier;

            tap_elem.style.left = x - tap_elem_offset + "px";
            tap_elem.style.top  = y - tap_elem_offset + "px";
            show_elem(tap_elem)

            control_circle.style.left = x - ctrl_elem_offset + "px";
            control_circle.style.top  = y - ctrl_elem_offset + "px";
            show_elem(control_circle)
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

        for (var i = 0; i < touches.length; i++) {
            var touch = touches[i];
            var client_x = touch.clientX;
            var client_y = touch.clientY;
            var canvas_xy = m_cont.client_to_canvas_coords(client_x, client_y, _vec2_tmp);
            var x = canvas_xy[0];
            var y = canvas_xy[1];

            if (x > w / 2 && touch.identifier == rot_touch_idx) { // right side of the screen
                var d_x = rot_prev_touch[0] - x;
                var d_y = rot_prev_touch[1] - y;
                rot_prev_touch[0] = x;
                rot_prev_touch[1] = y;
                rotation_cb(m_conf.TOUCH_ROT_MULT * d_x, m_conf.TOUCH_ROT_MULT * d_y);
                continue;
            }      
                   
            if (touch.identifier != move_touch_idx)
                continue;

            tap_elem.style.left = x - tap_elem_offset + "px";
            tap_elem.style.top  = y - tap_elem_offset + "px";

            var d_x = x - move_touch_start_pos[0];
            var d_y = y - move_touch_start_pos[1];

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
                hide_elem(tap_elem);
                hide_elem(control_circle);
                move_touch_idx = null;

            } else if (touches[i].identifier == rot_touch_idx) {
                rot_touch_idx = null;

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

    controls_elem.addEventListener("touchend", touch_end_cb, false);
    show_elem(controls_elem);

    _touch_start_cb = touch_start_cb;
    _touch_jump_cb = touch_jump_cb;
    _touch_attack_cb = touch_attack_cb;
    _touch_move_cb = touch_move_cb;
    _touch_end_cb = touch_end_cb;
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

exports.show_elem = show_elem;
function show_elem(elem, period) {

    elem.style.visibility = "visible";

    if (!period) {
        elem.style.opacity = 1;
        return
    }

    elem.style.opacity = 0;

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

    if (!period) {
        elem.style.opacity = 0;
        elem.style.visibility = "hidden";
        return
    }

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
