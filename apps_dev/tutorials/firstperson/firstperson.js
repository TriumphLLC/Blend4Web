"use strict";

b4w.register("example_main", function(exports, require) {

var m_anim      = require("animation");
var m_app       = require("app");
var m_cfg       = require("config");
var m_cont      = require("container");
var m_ctl       = require("controls");
var m_data      = require("data");
var m_fps       = require("fps");
var m_input     = require("input");
var m_main      = require("main");
var m_preloader = require("preloader");
var m_scs       = require("scenes");
var m_sfx       = require("sfx");
var m_version   = require("version");

var DEBUG = (m_version.type() === "DEBUG");
var FPS_GAME_CAM_SMOOTH_FACTOR = 0.01;
var FPS_GAME_SENSITIVITY = 110;

var LEFT_MOUSE_BUTTON_ID = 1;
var RIGHT_MOUSE_BUTTON_ID = 3;

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
        alpha: false,
        stereo: get_hmd_type()
    });
}

function get_hmd_type() {
    if (m_input.can_use_device(m_input.DEVICE_HMD) && !m_main.detect_mobile())
        return "HMD";
    return "NONE";
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
    m_fps.enable_fps_controls();
    m_fps.set_cam_smooth_factor(FPS_GAME_CAM_SMOOTH_FACTOR);
    m_fps.set_cam_sensitivity(FPS_GAME_SENSITIVITY);
    prepare_anim();
    var container = m_cont.get_container();
    enable_shot_interaction(container);
}

function resize() {
    m_cont.resize_to_container();
}

function prepare_anim() {
    var gun = m_scs.get_object_by_dupli_name("gun", "lp.005");
    var emitter_1 = m_scs.get_object_by_dupli_name("gun", "Plane");
    var emitter_2 = m_scs.get_object_by_dupli_name("gun", "Plane.001");
    var emitter_3 = m_scs.get_object_by_dupli_name("gun", "Plane.002");
    var emitter_4 = m_scs.get_object_by_dupli_name("gun", "Plane.003");
    m_anim.apply(gun, "zoom_shoot", m_anim.SLOT_2);
    m_anim.set_behavior(gun, m_anim.AB_FINISH_RESET, m_anim.SLOT_2);
    m_anim.apply(gun, "shoot", m_anim.SLOT_0);
    m_anim.set_behavior(gun, m_anim.AB_FINISH_RESET, m_anim.SLOT_0);
    m_anim.apply(gun, "zoom", m_anim.SLOT_1);
    m_anim.set_behavior(gun, m_anim.AB_FINISH_STOP, m_anim.SLOT_1);

    m_anim.apply(emitter_1, "ParticleSystem", m_anim.SLOT_0);
    m_anim.set_behavior(emitter_1, m_anim.AB_FINISH_RESET, m_anim.SLOT_0);
    m_anim.apply(emitter_2, "ParticleSystem", m_anim.SLOT_0);
    m_anim.set_behavior(emitter_2, m_anim.AB_FINISH_RESET, m_anim.SLOT_0);
    m_anim.apply(emitter_3, "ParticleSystem", m_anim.SLOT_0);
    m_anim.set_behavior(emitter_3, m_anim.AB_FINISH_RESET, m_anim.SLOT_0);
    m_anim.apply(emitter_4, "ParticleSystem", m_anim.SLOT_0);
    m_anim.set_behavior(emitter_4, m_anim.AB_FINISH_RESET, m_anim.SLOT_0);
}

function start_shoot_smoke(em1, em2, em3, em4, speaker) {
    m_anim.play(em1, null, m_anim.SLOT_0);
    m_anim.play(em2, null, m_anim.SLOT_0);
    m_anim.play(em3, null, m_anim.SLOT_0);
    m_anim.play(em4, null, m_anim.SLOT_0);
}

function start_shoot_sound(speaker) {
     m_sfx.play(speaker);
}

function seet_zoom_speed(obj, is_zoom_mode, slot_num) {
    if (is_zoom_mode)
        m_anim.set_speed(obj, -1, slot_num);
    else
        m_anim.set_speed(obj, 1, slot_num);
}

function start_shoot_anim(obj, is_zoom_mode, anim_cb, slot_num, zoom_slot_num) {
    if (is_zoom_mode)
        m_anim.play(obj, anim_cb, zoom_slot_num);
    else
        m_anim.play(obj, anim_cb, slot_num);
}

function enable_shot_interaction(html_elemet) {
    var shot_speaker = m_scs.get_object_by_name("shot");
    var gun = m_scs.get_object_by_dupli_name("gun", "lp.005");
    var disable_interaction = false;
    var is_zoom_mode = false;
    var mouse_press_sensor = m_ctl.create_mouse_click_sensor(html_elemet);
    var emitter_1 = m_scs.get_object_by_dupli_name("gun", "Plane");
    var emitter_2 = m_scs.get_object_by_dupli_name("gun", "Plane.001");
    var emitter_3 = m_scs.get_object_by_dupli_name("gun", "Plane.002");
    var emitter_4 = m_scs.get_object_by_dupli_name("gun", "Plane.003");
    var logic_func = function(s) {
        return s[0];
    }
    var anim_cb = function(obj, slot_num) {
        disable_interaction = false;
    }
    var manifold_cb = function(obj, id, pulse) {
        if (pulse && !disable_interaction) {
            var payload = m_ctl.get_sensor_payload(obj, id, 0);
            switch(payload.which) {
            case LEFT_MOUSE_BUTTON_ID:
                disable_interaction = true;
                start_shoot_smoke(emitter_1, emitter_2, emitter_3, emitter_4);
                start_shoot_sound(shot_speaker);
                start_shoot_anim(obj, is_zoom_mode, anim_cb, m_anim.SLOT_0, m_anim.SLOT_2);
                break;
            case RIGHT_MOUSE_BUTTON_ID:
                disable_interaction = true;
                seet_zoom_speed(obj, is_zoom_mode, m_anim.SLOT_1);
                m_anim.play(obj, anim_cb, m_anim.SLOT_1);
                is_zoom_mode = !is_zoom_mode;
                break;
            }
        }
    }
    m_ctl.create_sensor_manifold(gun, "SHOT_MANIFOLD", m_ctl.CT_SHOT,
            [mouse_press_sensor], logic_func, manifold_cb);
}

});

b4w.require("example_main").init();

