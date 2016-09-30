"use strict";

b4w.register("camera_move_styles", function(exports, require) {

var m_app     = require("app");
var m_cam     = require("camera");
var m_cfg     = require("config");
var m_data    = require("data");
var m_scenes  = require("scenes");
var m_trans   = require("transform");
var m_util    = require("util");
var m_version = require("version");

var DEBUG = (m_version.type() === "DEBUG");

var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/camera_move_styles/";

var STATIC_POS = new Float32Array([-4.5, -3, 0.5]);
var STATIC_LOOK_AT = new Float32Array([-4.5, 0, 0]);

var EYE_POS = new Float32Array([-1.5, -3, 0.5]);
var EYE_LOOK_AT = new Float32Array([-1.5, 0, 0.5]);

var TARGET_POS = new Float32Array([1.5, -2, 0]);
var TARGET_PIVOT = new Float32Array([1.5, 0, 0]);

var DIST_LIMITS = {
    min: 1,
    max: 3
};
var EYE_VERT_LIMITS = {
    down: -Math.PI/16, 
    up: Math.PI/16
}
var EYE_HORIZ_LIMITS = {
    left: Math.PI/4, 
    right: -Math.PI/4
}
var TARGET_VERT_LIMITS = {
    down: -Math.PI/16, 
    up: -Math.PI/4
}
var TARGET_HORIZ_LIMITS = {
    left: -Math.PI/4, 
    right: Math.PI/4
}
var HOVER_ANGLE_LIMITS = {
    down: -Math.PI/16, 
    up: -Math.PI/4
}

var HOVER_POS = new Float32Array([4.5, 3, 3]);
var HOVER_PIVOT = new Float32Array([4.5, 0, 0]);

var _default_pos = new Float32Array(3);
var _default_rot = new Float32Array(4);

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
        console_verbose: true,
        gl_debug: true
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
    m_data.load(APP_ASSETS_PATH + "camera_move_styles.json", load_cb);
}

function load_cb(data_id) {
    m_app.enable_camera_controls();
    init_interface();

    var camera = m_scenes.get_active_camera();
    m_trans.get_translation(camera, _default_pos);
    m_trans.get_rotation(camera, _default_rot);
}

function init_interface() {
    var controls_container = document.createElement("div");
    controls_container.id = "controls_container";

    var stat_b = create_button("STATIC CAMERA");
    stat_b.onclick = static_camera_action;
    controls_container.appendChild(stat_b);

    var eye_b = create_button("EYE CAMERA");
    eye_b.onclick = eye_camera_action;
    controls_container.appendChild(eye_b);

    var targ_b = create_button("TARGET CAMERA");
    targ_b.onclick = target_camera_action;
    controls_container.appendChild(targ_b);

    var hov_b = create_button("HOVER CAMERA");
    hov_b.onclick = hover_camera_action;
    controls_container.appendChild(hov_b);

    var reset_b = create_button("RESET");
    reset_b.onclick = reset_camera_action;
    controls_container.appendChild(reset_b);

    document.body.appendChild(controls_container);
}

function create_button(caption) {
    var button = document.createElement("div");
    button.className = "button_container";

    var label = document.createElement("label");
    label.className = "text";
    label.textContent = caption;

    button.appendChild(label);
    return button;
}

function static_camera_action() {
    var camera = m_scenes.get_active_camera();
    
    m_cam.static_setup(camera, { pos: STATIC_POS, look_at: STATIC_LOOK_AT });
    m_cam.correct_up(camera, m_util.AXIS_Y, true);
}

function eye_camera_action() {
    var camera = m_scenes.get_active_camera();

    m_cam.eye_setup(camera, { pos: EYE_POS, look_at: EYE_LOOK_AT, 
            horiz_rot_lim: EYE_HORIZ_LIMITS, vert_rot_lim: EYE_VERT_LIMITS });
    // setting some rotation
    m_cam.rotate_camera(camera, 0, -Math.PI/16, true, true);
}

function target_camera_action() {
    var camera = m_scenes.get_active_camera();

    m_cam.target_setup(camera, { pos: TARGET_POS, pivot: TARGET_PIVOT, 
            horiz_rot_lim: TARGET_HORIZ_LIMITS, vert_rot_lim: TARGET_VERT_LIMITS, 
            dist_lim: DIST_LIMITS });
    // setting some rotation
    m_cam.rotate_camera(camera, Math.PI/8, 0, true, true);   
}

function hover_camera_action() {
    var camera = m_scenes.get_active_camera();

    m_cam.hover_setup(camera, { pos: HOVER_POS, pivot: HOVER_PIVOT, 
            dist_lim: DIST_LIMITS, hover_angle_lim: HOVER_ANGLE_LIMITS, 
            enable_horiz_rot: true});
    // setting some rotation
    m_cam.rotate_camera(camera, -Math.PI/4, -Math.PI/8, true, true);
}

function reset_camera_action() {
    var camera = m_scenes.get_active_camera();
    m_cam.static_setup(camera, { pos: _default_pos });
    m_trans.set_rotation_v(camera, _default_rot);
}

});
