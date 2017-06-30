"use strict"

if (b4w.module_check("game_example_main"))
    throw "Failed to register module: game_example_main";

b4w.register("game_example_main", function(exports, require) {

var m_anim  = require("animation");
var m_app   = require("app");
var m_cfg   = require("config");
var m_data  = require("data");
var m_ctl   = require("controls");
var m_phy   = require("physics");
var m_cons  = require("constraints");
var m_scs   = require("scenes");

var _character = null;
var _character_rig = null;

var ROT_SPEED = 1.5;
var CAMERA_OFFSET = new Float32Array([0, 4, 1.5]);

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas3d",
        callback: init_cb,
        physics_enabled: true,
        show_fps: true,
        autoresize: true,
        alpha: false
    });
}

function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }

    var load_path = m_cfg.get_std_assets_path() +
            "tutorials/making_a_game_p1-3/game_example.json";
    m_data.load(load_path, load_cb);
}

function load_cb(data_id) {
    _character = m_scs.get_first_character();
    _character_rig = m_scs.get_object_by_dupli_name("character",
                                                    "character_rig");
    setup_movement();
    setup_rotation();
    setup_jumping();

    m_anim.apply(_character_rig, "character_idle_01");
    m_anim.play(_character_rig);
    m_anim.set_behavior(_character_rig, m_anim.AB_CYCLIC);

    setup_camera();
}

function setup_movement() {
    var key_w     = m_ctl.create_keyboard_sensor(m_ctl.KEY_W);
    var key_s     = m_ctl.create_keyboard_sensor(m_ctl.KEY_S);
    var key_up    = m_ctl.create_keyboard_sensor(m_ctl.KEY_UP);
    var key_down  = m_ctl.create_keyboard_sensor(m_ctl.KEY_DOWN);

    var move_array = [
        key_w, key_up,
        key_s, key_down
    ];

    var forward_logic  = function(s){return (s[0] || s[1])};
    var backward_logic = function(s){return (s[2] || s[3])};

    function move_cb(obj, id, pulse) {
        if (pulse == 1) {
            switch(id) {
            case "FORWARD":
                var move_dir = 1;
                m_anim.apply(_character_rig, "character_run");
                break;
            case "BACKWARD":
                var move_dir = -1;
                m_anim.apply(_character_rig, "character_run");
                break;
            }
        } else {
            var move_dir = 0;
            m_anim.apply(_character_rig, "character_idle_01");
        }

        m_phy.set_character_move_dir(obj, move_dir, 0);

        m_anim.play(_character_rig);
        m_anim.set_behavior(_character_rig, m_anim.AB_CYCLIC);
    };

    m_ctl.create_sensor_manifold(_character, "FORWARD", m_ctl.CT_TRIGGER,
        move_array, forward_logic, move_cb);
    m_ctl.create_sensor_manifold(_character, "BACKWARD", m_ctl.CT_TRIGGER,
        move_array, backward_logic, move_cb);
}

function setup_rotation() {
    var key_a     = m_ctl.create_keyboard_sensor(m_ctl.KEY_A);
    var key_d     = m_ctl.create_keyboard_sensor(m_ctl.KEY_D);
    var key_left  = m_ctl.create_keyboard_sensor(m_ctl.KEY_LEFT);
    var key_right = m_ctl.create_keyboard_sensor(m_ctl.KEY_RIGHT);

    var elapsed_sensor = m_ctl.create_elapsed_sensor();

    var rotate_array = [
        key_a, key_left,
        key_d, key_right,
        elapsed_sensor
    ];

    var left_logic  = function(s){return (s[0] || s[1])};
    var right_logic = function(s){return (s[2] || s[3])};

    function rotate_cb(obj, id, pulse) {

        var elapsed = m_ctl.get_sensor_value(obj, "LEFT", 4);

        if (pulse == 1) {
            switch(id) {
            case "LEFT":
                m_phy.character_rotation_inc(obj, elapsed * ROT_SPEED, 0);
                break;
            case "RIGHT":
                m_phy.character_rotation_inc(obj, -elapsed * ROT_SPEED, 0);
                break;
            }
        }
    }

    m_ctl.create_sensor_manifold(_character, "LEFT", m_ctl.CT_CONTINUOUS,
        rotate_array, left_logic, rotate_cb);
    m_ctl.create_sensor_manifold(_character, "RIGHT", m_ctl.CT_CONTINUOUS,
        rotate_array, right_logic, rotate_cb);
}

function setup_jumping() {
    var key_space = m_ctl.create_keyboard_sensor(m_ctl.KEY_SPACE);

    var jump_cb = function(obj, id, pulse) {
        m_phy.character_jump(obj);
    }

    m_ctl.create_sensor_manifold(_character, "JUMP", m_ctl.CT_SHOT, 
        [key_space], null, jump_cb);
}

function setup_camera() {
    var camera = m_scs.get_active_camera();
    m_cons.append_semi_soft(camera, _character, CAMERA_OFFSET);
}

});

b4w.require("game_example_main").init();
