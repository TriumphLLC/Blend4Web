"use strict";

b4w.register("example_main", function(exports, require) {

var m_app       = require("app");
var m_cfg       = require("config");
var m_cons      = require("constraints");
var m_cont      = require("container");
var m_ctl       = require("controls");
var m_data      = require("data");
var m_input     = require("input");
var m_mouse     = require("mouse");
var m_phy       = require("physics")
var m_preloader = require("preloader");
var m_scs       = require("scenes");
var m_trans     = require("transform");
var m_version   = require("version");

var DEBUG = (m_version.type() === "DEBUG");

exports.init = function() {
    var show_fps = DEBUG;

    var url_params = m_app.get_url_params();

    if (url_params && "show_fps" in url_params)
        show_fps = true;

    m_app.init({
        canvas_container_id: "canvas3d",
        callback: init_cb,
        show_fps: show_fps,
        assets_dds_available: !DEBUG,
        assets_min50_available: !DEBUG,
        alpha: false
    });
}

function init_cb(canvas_elem, success) {
    if (!success) {
        console.log("b4w init failure");
        return;
    }

    m_preloader.create_preloader();

    window.addEventListener("resize", resize);

    load();
}

function preloader_cb(percentage) {
    m_preloader.update_preloader(percentage);
}

function load() {
    var load_path = m_cfg.get_std_assets_path() +
            "tutorials/firstperson/firstperson.json";
    m_data.load(load_path, load_cb, preloader_cb);
}

function load_cb(data_id) {
    // make camera follow the character
    var camobj = m_scs.get_active_camera();
    var character = m_scs.get_first_character();
    m_cons.append_stiff_trans(camobj, character, [0, 0, 0.7]);

    // enable rotation with mouse
    var canvas_elem = m_cont.get_canvas();
    canvas_elem.addEventListener("mouseup", function(e) {
        m_mouse.request_pointerlock(canvas_elem);
    }, false);

    setup_movement()
}

function resize() {
    m_cont.resize_to_container();
}

function setup_movement() {

    var key_a = m_ctl.create_keyboard_sensor(m_ctl.KEY_A);
    var key_s = m_ctl.create_keyboard_sensor(m_ctl.KEY_S);
    var key_d = m_ctl.create_keyboard_sensor(m_ctl.KEY_D);
    var key_w = m_ctl.create_keyboard_sensor(m_ctl.KEY_W);
    var key_space = m_ctl.create_keyboard_sensor(m_ctl.KEY_SPACE);
    var key_shift = m_ctl.create_keyboard_sensor(m_ctl.KEY_SHIFT);

    var move_state = {
        left_right: 0,
        forw_back: 0
    }

    var move_array = [key_w, key_s, key_a, key_d, key_shift];
    var character = m_scs.get_first_character();

    var move_cb = function(obj, id, pulse) {
        if (pulse == 1) {
            switch (id) {
            case "FORWARD":
                move_state.forw_back = 1;
                break;
            case "BACKWARD":
                move_state.forw_back = -1;
                break;
            case "LEFT":
                move_state.left_right = 1;
                break;
            case "RIGHT":
                move_state.left_right = -1;
                break;
            case "RUNNING":
                m_phy.set_character_move_type(obj, m_phy.CM_RUN);
                break;
            }
        } else {
            switch (id) {
            case "FORWARD":
            case "BACKWARD":
                move_state.forw_back = 0;
                break;
            case "LEFT":
            case "RIGHT":
                move_state.left_right = 0;
                break;
            case "RUNNING":
                m_phy.set_character_move_type(obj, m_phy.CM_WALK);
                break;
            }
        }

        m_phy.set_character_move_dir(obj, move_state.forw_back,
                                          move_state.left_right);
    };

    m_ctl.create_sensor_manifold(character, "FORWARD", m_ctl.CT_TRIGGER,
            move_array, function(s) {return s[0]}, move_cb);
    m_ctl.create_sensor_manifold(character, "BACKWARD", m_ctl.CT_TRIGGER,
            move_array, function(s) {return s[1]}, move_cb);
    m_ctl.create_sensor_manifold(character, "LEFT", m_ctl.CT_TRIGGER,
            move_array, function(s) {return s[2]}, move_cb);
    m_ctl.create_sensor_manifold(character, "RIGHT", m_ctl.CT_TRIGGER,
            move_array, function(s) {return s[3]}, move_cb);

    var running_logic = function(s) {
        return (s[0] || s[1] || s[2] || s[3]) && s[4];
    }
    m_ctl.create_sensor_manifold(character, "RUNNING", m_ctl.CT_TRIGGER,
            move_array, running_logic, move_cb);

    var jump_cb = function(obj, id, pulse) {
        m_phy.character_jump(obj);
    }
    m_ctl.create_sensor_manifold(character, "JUMP", m_ctl.CT_SHOT,
            [key_space], null, jump_cb);
}

});

b4w.require("example_main").init();

