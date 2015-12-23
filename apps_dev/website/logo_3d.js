"use strict";

b4w.register("logo_3d_main", function(exports, require) {

var m_app   = require("app");
var m_cfg   = require("config");
var m_ctl   = require("controls");
var m_data  = require("data");
var m_main  = require("main");

var CANVAS_CONTAINER_ID  = "main_canvas_container";
var CANVAS_REPLACMENT    = "no_webgl_logo";
var ENGINE_PAUSE_TIMEOUT = 10000;

var _canvas_elem = null;
var _engine_pause_func = null;


exports.init = function() {
    m_app.init({
        canvas_container_id: CANVAS_CONTAINER_ID,
        callback: init_cb,
        gl_debug: false,
        physics_enabled: false,
        quality: m_cfg.P_HIGH,
        report_init_failure: false,
        alpha: true,
        track_container_position: true,
        force_container_ratio: 661 / 316,
        autoresize: true
    });
}

function init_cb(canvas_elem, success) {
    if (!success)
        return;

    _canvas_elem = canvas_elem;

    load_stuff();

    m_ctl.register_mouse_events(canvas_elem, true, true);
    m_ctl.register_wheel_events(canvas_elem);
    m_ctl.register_touch_events(canvas_elem, true);
}

function load_stuff() {
    m_data.load(m_cfg.get_std_assets_path() +
                "website/logo_3d/logo_3d_horizontal.json",
                loaded_callback, false, true);
}

function loaded_callback(data_id) {
    var canv_repl = document.getElementById(CANVAS_REPLACMENT);

    if (canv_repl)
        canv_repl.style.display = "none";

    _canvas_elem.oncontextmenu = function(e) {
        e.preventDefault();
        e.stopPropagation();

        return false;
    }

    _canvas_elem.style.display = "block";

    m_app.enable_camera_controls(false, false, true);

    enable_timeout();

    window.addEventListener("beforeunload", function() {
        _canvas_elem.style.display = "none";
        canv_repl.style.display = "block";
    }, false)

    _canvas_elem.addEventListener("mousedown", resume_engine, false);
    _canvas_elem.addEventListener("mousewheel", resume_engine, false);
    _canvas_elem.addEventListener("mousemove", resume_engine, false);
    _canvas_elem.addEventListener("DOMMouseScroll", resume_engine, false);
    _canvas_elem.addEventListener("touchstart", resume_engine, false);
    _canvas_elem.addEventListener("touchmove", resume_engine, false);
}

function resume_engine() {
    clearTimeout(_engine_pause_func);
    m_main.resume();
    enable_timeout();
}

function enable_timeout() {
    _engine_pause_func = setTimeout(pause_engine, ENGINE_PAUSE_TIMEOUT);
}

function pause_engine() {
    m_main.pause();
}

});

window.addEventListener("load", function() {
    b4w.require("logo_3d_main", "LOGO_NS").init();
}, false);
