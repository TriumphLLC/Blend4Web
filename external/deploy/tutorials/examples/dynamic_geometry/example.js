"use strict"

if (b4w.module_check("example_main"))
    throw "Failed to register module: example_main";

b4w.register("example_main", function(exports, require) {

var m_app   = require("app");
var m_main  = require("main");
var m_data  = require("data");
var m_geom  = require("geometry");
var m_scs   = require("scenes");

var _character = null;
var _character_body = null;

var ROT_SPEED = 1.5;
var CAMERA_OFFSET = new Float32Array([0, 1.5, -4]);

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas3d",
        callback: init_cb,
        physics_enabled: false,
        show_fps: true,
        alpha: false
    });
}

function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }

    m_app.enable_controls(canvas_elem);

    window.onresize = on_resize;
    on_resize();
    load();
}

function on_resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    m_main.resize(w, h);
};

function load() {
    m_data.load("example.json", load_cb);
}

function load_cb(data_id) {
    m_app.enable_camera_controls();

    var plane = m_scs.get_object_by_name("Plane");

    var indices = new Uint16Array([0,1,2,3,4,5]);
    var positions = new Float32Array([-0,1,-0, -1,0,1, 1,0,-1, 1,0,-1, -1,0,1, 1,0,1]);
    m_geom.override_geometry(plane, "Material", indices, positions, false);
}

});

b4w.require("example_main").init();
