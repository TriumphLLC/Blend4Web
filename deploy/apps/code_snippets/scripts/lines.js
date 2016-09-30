"use strict"

b4w.register("lines", function(exports, require) {

var m_app     = require("app");
var m_cfg     = require("config");
var m_data    = require("data");
var m_geom    = require("geometry");
var m_mat     = require("material");
var m_scs     = require("scenes");
var m_obj     = require("objects");
var m_trans   = require("transform");
var m_version = require("version");

var DEBUG = (m_version.type() === "DEBUG");

var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/lines";

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas_cont",
        callback: init_cb,
        physics_enabled: false,
        show_fps: true,
        alpha: false,
        gl_debug: true,
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
    m_data.load(APP_ASSETS_PATH + "/lines.json", load_cb);
}

function load_cb(data_id) {
    m_app.enable_camera_controls();
    draw_lines();
}

function draw_lines() {
    var line1 = m_scs.get_object_by_name("Line1");
    var num_points = 200;
    var max_height = 10;
    var w = 30;
    var amp = 1;

    var positions1 = new Float32Array(3 * num_points);
    var positions2 = new Float32Array(3 * num_points);
    for (var i = 0; i < num_points; i++) {
        var t = i / num_points;
        positions1[3*i  ] = amp * Math.cos(w*t + Math.PI);
        positions1[3*i+1] = amp * Math.sin(Math.PI - w*t);
        positions1[3*i+2] = max_height * t;

        positions2[3*i  ] = amp * Math.cos(w*t);
        positions2[3*i+1] = amp * Math.sin(-w*t);
        positions2[3*i+2] = max_height * t;
    }
    m_geom.draw_line(line1, positions1);
    m_mat.set_line_params(line1, {
        color: new Float32Array([1.0, 0.0, 0.0, 1.0]),
        width: 5
    });

    var line2 = m_scs.get_object_by_name("Line2");
    m_geom.draw_line(line2, positions2, true);
    m_mat.set_line_params(line2, {
        color: new Float32Array([0.0, 0.0, 1.0, 1.0]),
        width: 5
    });
}



});

