"use strict";

b4w.register("camera_move_styles", function(exports, require) {

var m_app    = require("app");
var m_cam    = require("camera");
var m_cfg    = require("config");
var m_data   = require("data");
var m_scenes = require("scenes");
var m_trans  = require("transform");
var m_util   = require("util");

var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/camera_move_styles/";

var STATIC_POS = new Float32Array([-4.5, 0.5, 3]);
var STATIC_LOOK_AT = new Float32Array([-4.5, 0, 0]);

var EYE_POS = new Float32Array([-1.5, 0.5, 3]);
var EYE_LOOK_AT = new Float32Array([-1.5, 0.5, 0]);

var TARGET_POS = new Float32Array([1.5, 0, 3]);
var TARGET_PIVOT = new Float32Array([1.5, 0, 0]);

var DIST_LIMITS = {
    min: 1,
    max: 2
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
var HOVER_VERT_LIMITS = {
    down: -Math.PI/16, 
    up: -Math.PI/4
}

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
        autoresize: true
    });
}

function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }
    m_app.enable_controls();
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
    m_app.set_camera_move_style(m_cam.MS_STATIC);

    var camera = m_scenes.get_active_camera();
    m_cam.static_set_look_at(camera, STATIC_POS, STATIC_LOOK_AT, m_util.AXIS_Y);
}

function eye_camera_action() {
    m_app.set_camera_move_style(m_cam.MS_EYE_CONTROLS);

    var camera = m_scenes.get_active_camera();
    
    // setting camera position/orientation
    m_cam.eye_set_look_at(camera, EYE_POS, EYE_LOOK_AT);
    
    // setting some limits
    m_cam.eye_set_horizontal_limits(camera, EYE_HORIZ_LIMITS);
    m_cam.eye_set_vertical_limits(camera, EYE_VERT_LIMITS);

    // setting some rotation
    m_cam.rotate_camera(camera, 0, -Math.PI/16, true, true);
}

function target_camera_action() {
    m_app.set_camera_move_style(m_cam.MS_TARGET_CONTROLS);

    var camera = m_scenes.get_active_camera();
    
    // setting camera position/orientation
    m_cam.target_set_trans_pivot(camera, TARGET_POS, TARGET_PIVOT);
    
    // setting some limits
    m_cam.target_set_distance_limits(camera, DIST_LIMITS);
    m_cam.target_set_horizontal_limits(camera, TARGET_HORIZ_LIMITS);
    m_cam.target_set_vertical_limits(camera, TARGET_VERT_LIMITS);

    // setting some rotation
    m_cam.rotate_camera(camera, Math.PI/8, 0, true, true);   
}

function hover_camera_action() {
    m_app.set_camera_move_style(m_cam.MS_HOVER_CONTROLS);

    var camera = m_scenes.get_active_camera();

    // setting necessary parameters for the HOVER camera: the "pivot" point, 
    // the distance limits and the hover angle limits
    m_cam.hover_set_pivot_translation(camera, HOVER_PIVOT);
    m_cam.hover_set_distance_limits(camera, DIST_LIMITS);
    m_cam.hover_set_vertical_limits(camera, HOVER_VERT_LIMITS);

    // setting some rotation
    m_cam.rotate_camera(camera, -Math.PI/4, -Math.PI/8, true, true);
}

function reset_camera_action() {
    m_app.set_camera_move_style(m_cam.MS_STATIC);
    var camera = m_scenes.get_active_camera();
    m_trans.set_translation_v(camera, _default_pos);
    m_trans.set_rotation_v(camera, _default_rot);
}

});
