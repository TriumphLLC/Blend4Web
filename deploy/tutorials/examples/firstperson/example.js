"use strict";

b4w.register("example_main", function(exports, require) {

var m_app   = require("app");
var m_cons  = require("constraints");
var m_ctl   = require("controls");
var m_data  = require("data");
var m_main  = require("main");
var m_mouse = require("mouse");
var m_phy   = require("physics");
var m_scs   = require("scenes");
var m_trans = require("transform");

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas3d", 
        callback: init_cb,
        alpha: false
    });
}

function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }

    m_app.enable_controls(canvas_elem);

    window.addEventListener("resize", resize);

    load();
}

function load() {
    m_data.load("first-person.json", load_cb);
}

function load_cb(data_id) {
    // make camera follow the character
    var camobj = m_scs.get_active_camera();
    var character = m_scs.get_first_character();
    m_cons.append_stiff_trans(camobj, character, [0, 0.7, 0]);

    // enable rotation with mouse
    var canvas_elem = m_main.get_canvas_elem();
    canvas_elem.addEventListener("mouseup", function(e) {
        m_mouse.request_pointerlock(canvas_elem);
    }, false);

    setup_movement()
}

function resize() {
    m_app.resize_to_container();
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

