"use strict";

b4w.register("example_main", function(exports, require) {

var m_anim   = require("animation");
var m_app    = require("app");
var m_data   = require("data");
var m_scenes = require("scenes");

var _previous_selected_obj = null;


exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas3d", 
        callback: init_cb,
        physics_enabled: false,
        alpha: false,
        autoresize: true
    });
}

function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }

    m_app.enable_controls();
    canvas_elem.addEventListener("mousedown", main_canvas_click, false);
    load();
}

function load() {
    m_data.load("example.json", load_cb);
}

function load_cb(data_id) {
    m_app.enable_camera_controls();
}

function main_canvas_click(e) {
    if (e.preventDefault)
        e.preventDefault();

    var x = e.clientX;
    var y = e.clientY;

    var obj = m_scenes.pick_object(x, y);

    if (obj) {
        if (_previous_selected_obj) {
            m_anim.stop(_previous_selected_obj);
            m_anim.set_frame(_previous_selected_obj, 0);
        }
        _previous_selected_obj = obj;

        m_anim.apply_def(obj);
        m_anim.play(obj);
    }
}

});

b4w.require("example_main").init();

