"use strict";

b4w.register("gyro", function(exports, require) {

var m_data    = require("data");
var m_app     = require("app");
var m_cfg     = require("config");
var m_ctl     = require("controls");
var m_phy     = require("physics");
var m_scenes  = require("scenes");
var m_version = require("version");

var DEBUG = (m_version.type() === "DEBUG");

var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/gyro/";
var FORCE = 500;
var UP_THRESHOLD = 0.2;
var DOWN_THRESHOLD = 0.002;

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas_cont",
        callback: init_cb,
        physics_enabled: true,
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
    m_data.load(APP_ASSETS_PATH + "gyro.json", load_cb);
}

function load_cb(data_id) {
    m_app.enable_camera_controls();
    var obj = m_scenes.get_object_by_name("Plane");
    create_obj_rotation_sensors(obj);
}

function create_obj_rotation_sensors(obj) {

    var g_a_sensor = m_ctl.create_gyro_delta_sensor();
    var cam_rotate_cb = function(obj, id, pulse) {
        var curr_delta_angs = m_ctl.get_sensor_payload(obj, id, 0);
        clamp_delta(curr_delta_angs);
        m_phy.apply_torque(obj, - FORCE * curr_delta_angs[2], 0, 0);
    }

    m_ctl.create_sensor_manifold(obj, "GYRO", m_ctl.CT_POSITIVE, [g_a_sensor],
            null, cam_rotate_cb);
}

function clamp_delta(values) {
    for (var i = 0; i < values.length; i++)
        if (Math.abs(values[i]) > UP_THRESHOLD
                || Math.abs(values[i]) < DOWN_THRESHOLD)
            values[i] = 0;
}


});
