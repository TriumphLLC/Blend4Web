"use strict";

b4w.register("camera_animation", function(exports, require) {

var m_app     = require("app");
var m_cam     = require("camera");
var m_cfg     = require("config");
var m_cont    = require("container");
var m_ctl     = require("controls");
var m_data    = require("data");
var m_scenes  = require("scenes");
var m_time    = require("time");
var m_trans   = require("transform");
var m_vec3    = require("vec3");
var m_version = require("version");

var DEBUG = (m_version.type() === "DEBUG");

var ANIM_TIME = 2;
var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/camera_animation/";

var _anim_stop = false;
var _delta_target = ANIM_TIME;
var _cam_anim = {
    timeline: -ANIM_TIME,
    starting_eye: new Float32Array(3),
    starting_target: new Float32Array(3),
    final_eye: new Float32Array(3),
    final_target: new Float32Array(3),
    current_eye: new Float32Array(3),
    current_target: new Float32Array(3)
}

var _vec3_tmp = new Float32Array(3);

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
    m_data.load(APP_ASSETS_PATH + "camera_animation.json", load_cb);
}

function load_cb(data_id) {
    m_app.enable_camera_controls();
    var camobj = m_scenes.get_active_camera();
    init_camera_animation(camobj);

    var main_canvas = m_cont.get_canvas();
    main_canvas.addEventListener("mouseup", main_canvas_up);
    main_canvas.addEventListener("mousedown", main_canvas_down);
}

function main_canvas_up(e) {

    if (e.button != 0)
        return;

    if (e.preventDefault)
        e.preventDefault();

    var obj = m_scenes.pick_object(e.clientX, e.clientY);

    if (obj)
        switch(m_scenes.get_object_name(obj)) {
        case "Cube": 
            var target = m_scenes.get_object_by_name("Target_cube");
            var eye = m_scenes.get_object_by_name("Eye_cube");
            break;
        case "Cone":
            var target = m_scenes.get_object_by_name("Target_cone");
            var eye = m_scenes.get_object_by_name("Eye_cone");
            break;
        default:
            return;
        }

    if (eye && target) {
        var camobj = m_scenes.get_active_camera();
        var pos_view = m_trans.get_translation(eye);
        var pos_target = m_trans.get_translation(target);
        start_camera_animation(camobj, pos_view, pos_target);
    } 

}

function main_canvas_down(e) {

    if (e.button != 0)
        return;

    var camobj = m_scenes.get_active_camera();

    if (m_ctl.get_sensor_value(camobj, "CAMERA_MOVE", 0) - _cam_anim.timeline 
            < ANIM_TIME)
        _anim_stop = true;

}

function start_camera_animation(camobj, pos_view, pos_target) {
    // retrieve camera current position
    m_cam.target_get_pivot(camobj, _cam_anim.current_target);
    m_trans.get_translation(camobj, _cam_anim.current_eye);

    // set camera starting position
    m_vec3.copy(_cam_anim.current_target, _cam_anim.starting_target);
    m_vec3.copy(_cam_anim.current_eye, _cam_anim.starting_eye);

    // set camera final position
    m_vec3.copy(pos_view, _cam_anim.final_eye);
    m_vec3.copy(pos_target, _cam_anim.final_target);

    // start animation
    _delta_target = ANIM_TIME;
    _cam_anim.timeline = m_time.get_timeline();
}

function init_camera_animation(camobj) {

    var t_sensor = m_ctl.create_timeline_sensor();
    var e_sensor = m_ctl.create_elapsed_sensor();

    var logic_func = function(s) {
        // s[0] = m_time.get_timeline() (t_sensor value)
        return s[0] - _cam_anim.timeline < ANIM_TIME;
    }

    var cam_move_cb = function(camobj, id, pulse) {

        if (pulse == 1) {
            if (_anim_stop) {
                _cam_anim.timeline = -ANIM_TIME;
                return;
            }

            m_app.disable_camera_controls();

            // elapsed = frame time (e_sensor value)
            var elapsed = m_ctl.get_sensor_value(camobj, id, 1);
            var delta = elapsed / ANIM_TIME;

            m_vec3.subtract(_cam_anim.final_eye, _cam_anim.starting_eye, _vec3_tmp);
            m_vec3.scaleAndAdd(_cam_anim.current_eye, _vec3_tmp, delta, _cam_anim.current_eye);

            _delta_target -= elapsed;
            delta = 1 - _delta_target * _delta_target / (ANIM_TIME * ANIM_TIME);
            m_vec3.subtract(_cam_anim.final_target, _cam_anim.starting_target, _vec3_tmp);
            m_vec3.scaleAndAdd(_cam_anim.starting_target, _vec3_tmp, delta, _cam_anim.current_target);

            m_cam.target_set_trans_pivot(camobj, _cam_anim.current_eye, _cam_anim.current_target);

        } else {
            m_app.enable_camera_controls(false);
            if (!_anim_stop)
                m_cam.target_set_trans_pivot(camobj, _cam_anim.final_eye, 
                        _cam_anim.final_target);
            else
                _anim_stop = false;
        }
    }

    m_ctl.create_sensor_manifold(camobj, "CAMERA_MOVE", m_ctl.CT_CONTINUOUS,
            [t_sensor, e_sensor], logic_func, cam_move_cb);
}


});
