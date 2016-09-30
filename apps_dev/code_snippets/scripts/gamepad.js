"use strict";

b4w.register("gamepad", function(exports, require) {

var m_app     = require("app");
var m_anim    = require("animation");
var m_data    = require("data");
var m_cfg     = require("config");
var m_cnst    = require("constraints");
var m_ctl     = require("controls");
var m_cont    = require("container");
var m_gp_cf   = require("gp_conf");
var m_input   = require("input");
var m_obj     = require("objects");
var m_scenes  = require("scenes");
var m_trans   = require("transform");
var m_vec3    = require("vec3");
var m_quat    = require("quat");
var m_util    = require("util");
var m_version = require("version");

var DEBUG = (m_version.type() === "DEBUG");

var _vec3_tmp = new Float32Array(3);
var _vec3_tmp2 = new Float32Array(3);
var _vec3_tmp3 = new Float32Array(3);

var _quat_tmp = new Float32Array(4);

var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/gamepad/";
var STEP = 1.5;
var ROT_ANGLE = 3 * Math.PI / 5;
var AXIS_THRESHOLD = 0.1;
var ANIM_SPEED = 3.5;
var COLLISION_RAD = 6 * 6;

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas_cont",
        callback: init_cb,
        physics_enabled: false,
        alpha: true,
        show_fps: true,
        autoresize: true,
        assets_dds_available: !DEBUG,
        assets_min50_available: !DEBUG,
        console_verbose: true
    });
}

function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }
    load();
}

function load() {
    m_data.load(APP_ASSETS_PATH + "gamepad.json", load_cb);
}

function load_cb(data_id) {
    set_camera_pos();
    prepare_anim();
    create_interface();
    create_gmpd_sensors();
    m_gp_cf.update();
}

function prepare_anim() {
    var troll_rig = m_scenes.get_object_by_name("troll_rig");
    m_anim.apply(troll_rig, "troll_walk_B4W_BAKED", m_anim.SLOT_0);
    m_anim.set_behavior(troll_rig, m_anim.AB_CYCLIC, m_anim.SLOT_0);
}

function create_gmpd_sensors() {
    var troll_rig = m_scenes.get_object_by_name("troll_rig");

    var sensor_cb = function(obj, id, pulse) {

        var left_vert_axis = m_ctl.get_sensor_value(obj, id, 3);
        var left_hor_axis = m_ctl.get_sensor_value(obj, id, 4);
        var ellapsed = m_ctl.get_sensor_value(obj, id, 5);

        var troll_quat = m_trans.get_rotation(obj, _quat_tmp);
        var troll_view_vec = m_vec3.transformQuat(m_util.AXIS_MY, troll_quat, _vec3_tmp);
        m_vec3.scale(troll_view_vec, STEP, troll_view_vec);

        var troll_trans = m_trans.get_translation(obj, _vec3_tmp2);

        switch (id) {
        case "UP":
            var up = m_ctl.get_sensor_value(obj, id, 0)
                    || m_ctl.get_sensor_value(obj, id, 1)
                    || m_ctl.get_sensor_value(obj, id, 2);
            var vert = left_vert_axis > AXIS_THRESHOLD ? left_vert_axis : 0;
            if (up)
                m_vec3.scaleAndAdd(troll_trans, troll_view_vec, ellapsed, troll_trans);
            if (vert) {
                m_vec3.scaleAndAdd(troll_trans, troll_view_vec, -vert * STEP *ellapsed, troll_trans);
                m_anim.set_speed(obj, ANIM_SPEED * vert, m_anim.SLOT_0);
            }
            break;
        case "DOWN":
            var down = m_ctl.get_sensor_value(obj, id, 0) 
                    || m_ctl.get_sensor_value(obj, id, 1)
                    || m_ctl.get_sensor_value(obj, id, 2);
            var vert = left_vert_axis < -AXIS_THRESHOLD ? left_vert_axis : 0;
            if (down)
                m_vec3.scaleAndAdd(troll_trans, troll_view_vec, -ellapsed, troll_trans);
            if (vert) {
                m_anim.set_speed(obj, -ANIM_SPEED * vert, m_anim.SLOT_0);
                m_vec3.scaleAndAdd(troll_trans, troll_view_vec, -vert * STEP *ellapsed, troll_trans);
            }
            break;
        case "LEFT":
            var left = m_ctl.get_sensor_value(obj, id, 0)
                    || m_ctl.get_sensor_value(obj, id, 1)
                    || m_ctl.get_sensor_value(obj, id, 2);
            var hor = left_hor_axis > AXIS_THRESHOLD ? left_hor_axis : 0;
            if (left)
                m_quat.rotateZ(troll_quat, ROT_ANGLE * ellapsed, troll_quat);
            if (hor)
                m_quat.rotateZ(troll_quat, -hor * ROT_ANGLE * ellapsed, troll_quat);
            break;
        case "RIGHT":
            var right = m_ctl.get_sensor_value(obj, id, 0)
                    || m_ctl.get_sensor_value(obj, id, 1)
                    || m_ctl.get_sensor_value(obj, id, 2);
            var hor = left_hor_axis < -AXIS_THRESHOLD ? left_hor_axis : 0;
            if (right)
                m_quat.rotateZ(troll_quat, -ROT_ANGLE * ellapsed, troll_quat);
            if (hor)
                m_quat.rotateZ(troll_quat, -hor * ROT_ANGLE * ellapsed, troll_quat);
            break;
        };

        if ((up || down || vert) && chech_dist_from_middle(troll_trans))
            m_trans.set_translation_v(obj, troll_trans);
        if (right || left || hor)
            m_trans.set_rotation_v(obj, troll_quat);
    }

    var anim_sensor_cb = function(obj, id, pulse) {
        var up = m_ctl.get_sensor_value(obj, id, 0)
                || m_ctl.get_sensor_value(obj, id, 3)
                || m_ctl.get_sensor_value(obj, id, 5);
        var down = m_ctl.get_sensor_value(obj, id, 1)
                || m_ctl.get_sensor_value(obj, id, 4)
                || m_ctl.get_sensor_value(obj, id, 6);
        var vert = m_ctl.get_sensor_value(obj, id, 2);
        if (pulse == 1) {
            if (up || vert < 0)
                m_anim.set_speed(obj, ANIM_SPEED, m_anim.SLOT_0);
            if (down || vert > 0)
                m_anim.set_speed(obj, -ANIM_SPEED, m_anim.SLOT_0);
            m_anim.play(obj, m_anim.SLOT_0);
        } else
            m_anim.stop(obj, m_anim.SLOT_0);
    }

    var gamepad_id = get_last_gmpd_id();
    create_sensors(troll_rig, gamepad_id, sensor_cb, anim_sensor_cb);

    window.addEventListener("gamepadconnected", function() {
        var gamepad_id = get_last_gmpd_id();
        create_sensors(troll_rig, gamepad_id, sensor_cb, anim_sensor_cb);
    }, false);

}

function create_sensors(troll_rig, gamepad_id, sensor_cb, anim_sensor_cb) {
    var gs_w = m_ctl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_12, gamepad_id);
    var gs_d = m_ctl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_15, gamepad_id);
    var gs_s = m_ctl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_13, gamepad_id);
    var gs_a = m_ctl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_14, gamepad_id);
    var key_a = m_ctl.create_keyboard_sensor(m_ctl.KEY_A);
    var key_s = m_ctl.create_keyboard_sensor(m_ctl.KEY_S);
    var key_d = m_ctl.create_keyboard_sensor(m_ctl.KEY_D);
    var key_w = m_ctl.create_keyboard_sensor(m_ctl.KEY_W);
    var key_left = m_ctl.create_keyboard_sensor(m_ctl.KEY_LEFT);
    var key_down = m_ctl.create_keyboard_sensor(m_ctl.KEY_DOWN);
    var key_right = m_ctl.create_keyboard_sensor(m_ctl.KEY_RIGHT);
    var key_up = m_ctl.create_keyboard_sensor(m_ctl.KEY_UP);
    var left_vert_axis = m_ctl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_1, gamepad_id);
    var left_hor_axis = m_ctl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_0, gamepad_id);
    var e_s = m_ctl.create_elapsed_sensor();

    var anim_logic_func = function(s) {
        return s[0] || s[1] || s[2] || s[3] || s[4] || s[5] || s[6];
    }

    m_ctl.create_sensor_manifold(troll_rig, "UP", m_ctl.CT_CONTINUOUS,
            [gs_w, key_w, key_up, left_vert_axis, left_hor_axis, e_s],
            function() {return true}, sensor_cb);
    m_ctl.create_sensor_manifold(troll_rig, "DOWN", m_ctl.CT_CONTINUOUS,
            [gs_s, key_s, key_down, left_vert_axis, left_hor_axis, e_s],
            function() {return true}, sensor_cb);
    m_ctl.create_sensor_manifold(troll_rig, "RIGHT", m_ctl.CT_CONTINUOUS,
            [gs_d, key_d, key_right, left_vert_axis, left_hor_axis, e_s],
            function() {return true}, sensor_cb);
    m_ctl.create_sensor_manifold(troll_rig, "LEFT", m_ctl.CT_CONTINUOUS,
            [gs_a, key_a, key_left, left_vert_axis, left_hor_axis, e_s],
            function() {return true}, sensor_cb);
    m_ctl.create_sensor_manifold(troll_rig, "PLAY_ANIM", m_ctl.CT_TRIGGER,
            [gs_w, gs_s, left_vert_axis, key_w, key_s, key_up, key_down],
            anim_logic_func, anim_sensor_cb);
}

function get_last_gmpd_id() {
    var indices = m_input.check_enable_gamepad_indices();
    return indices.length ? indices[indices.length - 1] : 0;
}

function set_camera_pos() {
    var camobj = m_scenes.get_active_camera();
    var troll_rig = m_scenes.get_object_by_name("troll_rig");
    m_cnst.append_track(camobj, troll_rig);
}

function chech_dist_from_middle(point) {
    return (point[0] * point[0] + point[1] * point[1]) < COLLISION_RAD;
}

function create_interface() {
    var gmpd_settings = document.createElement("a");
    gmpd_settings.innerHTML = "Settings";
    gmpd_settings.className = "text";
    gmpd_settings.style.position = "absolute";
    gmpd_settings.style.bottom = "50px";
    gmpd_settings.style.right = "50px";
    var main_cont = m_cont.get_container();
    main_cont.appendChild(gmpd_settings);
    var is_hiden = true;

    gmpd_settings.onclick = function() {
        if (is_hiden)
            m_gp_cf.show();
        else
            m_gp_cf.hide();
        is_hiden = !is_hiden;
    }
}

});

