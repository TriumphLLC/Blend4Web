"use strict"

// register the application module
b4w.register("simple_app", function(exports, require) {

// import modules used by the app
var m_anim      = require("animation");
var m_app       = require("app");
var m_cfg       = require("config");
var m_data      = require("data");
var m_mouse     = require("mouse");
var m_preloader = require("preloader");
var m_scenes    = require("scenes");
var m_version   = require("version");

var DEBUG = (m_version.type() === "DEBUG");

var _previous_selected_obj = null;

/**
 * export the method to initialize the app (called at the bottom of this file)
 */
exports.init = function() {
    var show_fps = DEBUG;

    var url_params = m_app.get_url_params();

    if (url_params && "show_fps" in url_params)
        show_fps = true;

    m_app.init({
        canvas_container_id: "main_canvas_container",
        callback: init_cb,
        show_fps: show_fps,
        console_verbose: true,
        assets_dds_available: !DEBUG,
        assets_min50_available: !DEBUG,
        autoresize: true
    });
}

/**
 * callback executed when the app is initizalized 
 */
function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }

    m_preloader.create_preloader();

    canvas_elem.addEventListener("mousedown", main_canvas_click, false);
    canvas_elem.addEventListener("touchstart", main_canvas_click, false);

    load();
}

function preloader_cb(percentage) {
    m_preloader.update_preloader(percentage);
}

/**
 * load the scene data
 */
function load() {
    var load_path = m_cfg.get_std_assets_path() +
            "tutorials/interactive_web_application/simple_app.json";
    m_data.load(load_path, load_cb, preloader_cb);
}

/**
 * callback executed when the scene is loaded
 */
function load_cb(data_id) {
    m_app.enable_camera_controls();

    // place your code here

}

function main_canvas_click(e) {
    if (e.preventDefault)
        e.preventDefault();

    var x = m_mouse.get_coords_x(e);
    var y = m_mouse.get_coords_y(e);

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

// import the app module and start the app by calling the init method
b4w.require("simple_app").init();
