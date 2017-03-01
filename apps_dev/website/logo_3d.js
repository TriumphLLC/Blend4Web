"use strict";

b4w.register("logo_3d_main", function(exports, require) {

var m_app      = require("app");
var m_cfg      = require("config");
var m_cont     = require("container");
var m_ctl      = require("controls");
var m_data     = require("data");
var m_main     = require("main");
var m_scs      = require("scenes");
var m_version  = require("version");

var DEBUG = (m_version.type() === "DEBUG");

var CANVAS_CONTAINER_ID  = "main_canvas_container";
var CANVAS_REPLACMENT    = "no_webgl_logo";
var ENGINE_PAUSE_TIMEOUT = 10000;

var _canvas_elem = null;
var _engine_pause_func = null;

var _is_init = false;


exports.init = function() {
    onresize();
}

function onresize() {
    if (!_is_init && window.innerWidth >= 768) {
        init_engine();

        return;
    }

    if (!_is_init && window.innerWidth < 768) {
        window.addEventListener("resize", onresize);

        return;
    }

    if (_is_init && window.innerWidth >= 768) {
        var cont = m_cont.get_container();

        cont.style.display = "block";

        return;
    }

    if (_is_init && window.innerWidth < 768) {
        var cont = m_cont.get_container();

        cont.style.display = "none";

        if (!m_main.is_paused())
            m_main.pause();

        return;
    }
}

function init_engine() {
    _is_init = true;

    m_app.init({
        canvas_container_id: CANVAS_CONTAINER_ID,
        callback: init_cb,
        gl_debug: false,
        physics_enabled: false,
        quality: m_cfg.P_HIGH,
        report_init_failure: false,
        alpha: true,
        assets_dds_available: !DEBUG,
        assets_min50_available: !DEBUG,
        force_container_ratio: 661 / 316,
        autoresize: true
    });
}

function init_cb(canvas_elem, success) {
    if (!success)
        return;

    _canvas_elem = canvas_elem;

    load_stuff();
}

function load_stuff() {
    m_data.load(m_cfg.get_std_assets_path() +
                "website/logo_3d/logo_3d_horizontal.json",
                loaded_callback, false, true);
}

function check_user_agent(str) {
    var user_agent = navigator.userAgent;

    if (user_agent.indexOf(str) > -1)
        return true;
    else
        return false;
}

function loaded_callback(data_id) {
    var canv_repl = document.getElementById(CANVAS_REPLACMENT);
    var cont = m_cont.get_container();

    if (canv_repl)
        canv_repl.style.display = "none";

    if (cont)
        cont.style.display = "block";

    _canvas_elem.oncontextmenu = function(e) {
        e.preventDefault();
        e.stopPropagation();

        return false;
    }

    _canvas_elem.style.display = "block";
    m_app.enable_camera_controls(false, true, true, _canvas_elem, true);

    var cam = m_scs.get_active_camera();

    m_ctl.remove_sensor_manifold(cam, "ROT_UP");
    m_ctl.remove_sensor_manifold(cam, "ROT_DOWN");
    m_ctl.remove_sensor_manifold(cam, "ROT_LEFT");
    m_ctl.remove_sensor_manifold(cam, "ROT_RIGHT");

    enable_timeout();

    window.addEventListener("beforeunload", function() {
        _canvas_elem.style.display = "none";

        if (canv_repl)
            canv_repl.style.display = "block";
    })

    _canvas_elem.addEventListener("mousedown", resume_engine, false);
    _canvas_elem.addEventListener("mousewheel", resume_engine, false);
    _canvas_elem.addEventListener("mousemove", resume_engine, false);
    _canvas_elem.addEventListener("DOMMouseScroll", resume_engine, false);
    _canvas_elem.addEventListener("touchstart", resume_engine, false);
    _canvas_elem.addEventListener("touchmove", resume_engine, false);

    window.removeEventListener("resize", onresize);
    window.addEventListener("resize", onresize);
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
