"use strict";

b4w.register("flight_main", function(exports, require) {

var m_anim      = require("animation");
var m_app       = require("app");
var m_cam       = require("camera");
var m_cfg       = require("config");
var m_data      = require("data");
var m_main      = require("main");
var m_preloader = require("preloader");
var m_scs       = require("scenes");
var m_sfx       = require("sfx");
var m_version   = require("version");

var m_vec3 = require("vec3");

var DEBUG = (m_version.type() === "DEBUG");
var PRELOADING = true;
var CAM_TRACKING_OFFSET = new Float32Array([13, 4.5, 13]);
var CAM_STAT_POS = new Float32Array([-20, 2, 120]);
var UP = new Float32Array([0, 1, 0]);
var APPROX_CESSNA_SPEED = 40;

var INIT_PARAMS = {
    canvas_container_id: "main_canvas_container",
    callback: init_cb,
    gl_debug: false,
    show_fps: false,

    // engine config
    alpha: false,
    physics_enabled: false,
    console_verbose: DEBUG,
    assets_dds_available: !DEBUG,

    // improves quality
    assets_min50_available: false,
    quality: m_cfg.P_HIGH
};

var TS_NONE     = 10;   // initial state
var TS_FOLLOW   = 20;   // follow the plane with offset
var TS_TRACK    = 30;   // track the plane from fixed point
var TS_CAM_ANIM = 40;   // camera animation

var _vec3_tmp  = new Float32Array(3);
var _vec3_tmp2 = new Float32Array(3);

var _cessna_arm = null;
var _cessna_spk = null;
var _pilot = null;
var _camera = null;

var _playing = false;
var _trigger_state = TS_NONE;

var _hover_panel_elem;


exports.init = function() {
    m_app.init(INIT_PARAMS);
}

function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }

    // cache dom hover element
    _hover_panel_elem = document.querySelector("#hover_panel");

    m_app.enable_controls();

    m_preloader.create_advanced_preloader({
        img_width: 165,
        preloader_width: 460,
        preloader_bar_id: "preloader_bar",
        fill_band_id: "fill_band",
        preloader_caption_id: "preloader_caption",
        preloader_container_id: "preloader_container",
        background_container_id: "background_image_container",
        canvas_container_id: "main_canvas_container"
    });

    var preloader_frame = document.querySelector("#preloader_frame");

    preloader_frame.style.visibility = "visible";

    init_control_button("pause_resume", function() {
        if (_playing)
            pause();
        else
            resume();
    })

    init_control_button("camera_view", function() {
        if (!_playing)
            return;
        switch_view_mode();
    })

    window.addEventListener("resize", on_resize, false);

    document.addEventListener("keydown", function(e) {
        if (e.keyCode == 13)    // enter
            m_app.request_fullscreen(document.body);
    }, false);

    load_stuff();
}

function on_resize() {
    m_app.resize_to_container();
};

function load_stuff() {
    var assets_dir = m_cfg.get_std_assets_path();

    m_data.set_debug_resources_root("/flight_over_island/");

    var p_cb = PRELOADING ? preloader_callback : null;

    m_data.load(assets_dir + "flight_over_island/flight_over_island.json",
                loaded_callback, p_cb, !true);

    on_resize();
}

function loaded_callback(data_id) {
    _camera = m_scs.get_active_camera();

    var get_by_dupli = m_scs.get_object_by_dupli_name;
    var set_behavior = m_anim.set_behavior;
    var apply_anim   = m_anim.apply;

    _cessna_arm = get_by_dupli("Cessna Rig",
            "Cessna Armature");
    _cessna_spk = get_by_dupli("Cessna Rig",
            "Engine Speaker");
    _pilot = get_by_dupli("golf_player_fmale_rig",
            "rig");

    apply_anim(_camera, "CameraAction.001");
    set_behavior(_camera, m_anim.AB_CYCLIC);

    apply_anim(_cessna_arm, "fly_cessna");
    set_behavior(_cessna_arm, m_anim.AB_FINISH_STOP);

    apply_anim(_pilot, "fly_girl");
    set_behavior(_pilot, m_anim.AB_FINISH_STOP);

    apply_anim_cycle(_cessna_arm, _cessna_spk, _pilot);

    switch_view_mode();

    m_main.set_render_callback(render_callback);

    _playing = true;
}

function apply_anim_cycle(cessna_arm, cessna_spk, pilot) {
    m_anim.set_first_frame(cessna_arm);
    m_anim.play(cessna_arm, finish_anim_callback);

    m_anim.stop(pilot);
    m_anim.set_first_frame(pilot);
    m_anim.play(pilot);

    m_sfx.speaker_reset_speed(cessna_spk, APPROX_CESSNA_SPEED);
}

function pause() {
    _playing = false;
    m_main.pause();
    change_controls_button_view("pause_resume", "resume");
}

function resume() {
    _playing = true;
    m_main.resume();
    change_controls_button_view("pause_resume", "pause");
}

function switch_view_mode() {

    switch (_trigger_state) {
    case TS_NONE:
        _trigger_state = TS_FOLLOW;
        m_anim.stop(_camera);
        break;
    case TS_FOLLOW:
        _trigger_state = TS_TRACK;
        m_anim.stop(_camera);
        break;
    case TS_TRACK:
        _trigger_state = TS_CAM_ANIM;
        m_anim.play(_camera);
        break;
    case TS_CAM_ANIM:
        _trigger_state = TS_FOLLOW;
        m_anim.stop(_camera);
        break;
    }

    move_camera();

    switch (_trigger_state) {
    case TS_FOLLOW:
        m_sfx.listener_reset_speed(APPROX_CESSNA_SPEED);
        break;
    case TS_TRACK:
        m_sfx.listener_reset_speed(0);
        break;
    case TS_CAM_ANIM:
        m_sfx.listener_reset_speed(0);
        break;
    }
}

function init_control_button(elem_id, callback) {
    var target = document.getElementById(elem_id);

    // clone to prevent adding event listeners more than once
    var new_element = target.cloneNode(true);

    target.parentNode.replaceChild(new_element, target);

    new_element.addEventListener("mouseup", function(e) {
        button_up(elem_id, e);
        callback();
    }, false);

    new_element.addEventListener("mouseover", function(e) {
        mouseover_cb(elem_id, e);
    }, false);

    new_element.addEventListener("mouseout", function(e) {
        mouseout_cb(elem_id, e);
    }, false);

    new_element.addEventListener("mousedown", function(e) {
        button_down(elem_id, e);
    }, false);
}

function mouseover_cb(scene_id, e) {
    var isTouch = !!("ontouchstart" in window) ||
            window.navigator.msMaxTouchPoints > 0;
    if (isTouch)
        return null;

    var target     = e.target;
    var elem       = document.getElementById(scene_id);
    var parent     = elem.parentElement;
    var glow_hover = document.querySelector('#glow');

    if (!glow_hover) {
        var hover_glow_elem = document.createElement('div');

        hover_glow_elem.id = 'glow';
        hover_glow_elem.style.top = target.offsetTop;

        _hover_panel_elem.appendChild(hover_glow_elem);

        glow_hover = hover_glow_elem;
    }

    glow_hover.style.top = target.offsetTop - 20 + 'px';
}

function mouseout_cb(scene_id, e) {
    var elem = document.getElementById(scene_id);

    elem.className = elem.className.replace("button_down", "");

    clear_glow();
}

function button_up(button_id, e) {
    var elem = document.getElementById(button_id);
    var glow_down = document.querySelector('#glow_down');
    var hover_glow_elem = document.createElement('div');

    hover_glow_elem.id = 'glow';
    hover_glow_elem.style.top = e.target.offsetTop - 25 + 'px';

    if (glow_down) {
        _hover_panel_elem.removeChild(glow_down);
        _hover_panel_elem.appendChild(hover_glow_elem);
    }

    elem.className = elem.className.replace("button_down", "");
}

function button_down(scene_id, e) {
    var isTouch = !!("ontouchstart" in window) ||
            window.navigator.msMaxTouchPoints > 0;

    if (isTouch)
        return null;

    clear_glow();

    var elem = document.getElementById(scene_id);
    var down_glow_elem = document.createElement('div');

    down_glow_elem.id = 'glow_down';
    down_glow_elem.style.marginTop = e.target.offsetTop - 28 + 'px';
    _hover_panel_elem.appendChild(down_glow_elem);

    elem.className = elem.className + " button_down";
}

function clear_glow() {
    var glow_down = document.querySelector('#glow_down');
    var glow_hover = document.querySelector('#glow');

    if (glow_hover)
        _hover_panel_elem.removeChild(glow_hover);

    if (glow_down)
        _hover_panel_elem.removeChild(glow_down);
}

function change_controls_button_view(elem_id, class_name) {
    var controls_button = document.getElementById(elem_id);

    controls_button.className = class_name + " controls_button";
}

function preloader_callback(percentage) {
    m_preloader.update_preloader(percentage);
}

function finish_anim_callback() {
    if (_trigger_state != TS_CAM_ANIM)
        switch_view_mode();

    apply_anim_cycle(_cessna_arm, _cessna_spk, _pilot, _camera);
}

function render_callback(elapsed, current_time) {
    move_camera();
}

function move_camera() {
    if (_trigger_state == TS_CAM_ANIM)
        return;

    var target = _vec3_tmp;

    m_anim.get_bone_translation(_cessna_arm, "Root", target);

    if (_trigger_state == TS_TRACK)
        var eye = CAM_STAT_POS;
    else if (_trigger_state == TS_FOLLOW) {
        var eye = _vec3_tmp2;

        m_vec3.add(target, CAM_TRACKING_OFFSET, eye);
    }

    m_cam.set_look_at(_camera, eye, target, UP);
}

});

b4w.require("flight_main").init();
