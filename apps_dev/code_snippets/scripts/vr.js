"use strict"

b4w.register("vr", function(exports, require) {

var m_app       = require("app");
var m_cfg       = require("config");
var m_cont      = require("container");
var m_data      = require("data");
var m_hmd       = require("hmd");
var m_hmd_conf  = require("hmd_conf");
var m_input     = require("input");
var m_preloader = require("preloader");
var m_screen    = require("screen");
var m_ver       = require("version");

var _switch_vr_button;
var _is_in_vr = false;

var DEBUG = (m_ver.type() == "DEBUG");

var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/vr/";

exports.init = function() {
    m_app.init({
        canvas_container_id: "main_canvas_container",
        callback: init_cb,
        show_fps: DEBUG,
        console_verbose: DEBUG,
        autoresize: true,
        stereo: "HMD"
    });
}

function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }

    m_preloader.create_preloader();

    canvas_elem.oncontextmenu = function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };

    var controls_container = document.createElement("div");
    controls_container.id = "controls_container";

    _switch_vr_button = create_button(m_input.can_use_device(m_input.DEVICE_HMD) ?
            "Open VR": "VR is not avaliable");

    // Apply splitscreen and some default behavior
    m_input.add_click_listener(_switch_vr_button, switch_vr_default_cb);

    // Apply only splitscreen.
    // It requires writing some camera behavior in init_cb or load_cb
    // m_input.add_click_listener(_switch_vr_button, switch_vr_custom_cb);

    controls_container.appendChild(_switch_vr_button);

    // uncomment next lines to configure Cardboard-like devices
    // if (m_hmd_conf.check())
    //     enable_hmd_configurator(controls_container);

    var container = m_cont.get_container();
    container.appendChild(controls_container);

    load();
}

function switch_vr_default_cb() {
    if (!_is_in_vr) {
        m_hmd.enable_hmd(m_hmd.HMD_ALL_AXES_MOUSE_YAW);
        m_screen.request_fullscreen_hmd(document.body, enable_fullscreen_cb, disable_fullscreen_cb);
        _is_in_vr = true;
    } else {
        m_hmd.disable_hmd();
        m_screen.exit_fullscreen_hmd();
        _is_in_vr = false;
    }
}

function switch_vr_custom_cb() {
    if (!_is_in_vr) {
        m_screen.request_split_screen();
        m_screen.request_fullscreen_hmd(document.body, enable_fullscreen_cb, disable_fullscreen_cb);
        _is_in_vr = true;
    } else {
        m_screen.disable_split_screen();
        m_screen.exit_fullscreen_hmd();
        _is_in_vr = false;
    }
}

function enable_fullscreen_cb() {
    console.log("We are in VR-mode.");
    _switch_vr_button.innerText = "Stop presentation";
}

function disable_fullscreen_cb() {
    console.log("We are in one-eye-mode.");
    _switch_vr_button.innerText = m_input.can_use_device(m_input.DEVICE_HMD) ?
            "Open VR": "VR is not avaliable";
}

function enable_hmd_configurator(controls_container) {
    var hmd_device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
    var hmd_type = m_input.get_value_param(hmd_device, m_input.HMD_WEBVR_TYPE);
    if (hmd_type & (m_input.HMD_NON_WEBVR | m_input.HMD_WEBVR_MOBILE |
            m_input.HMD_WEBVR_DESKTOP)) {

        m_hmd_conf.update();

        var is_in_conf = false;
        var hmd_conf_button = create_button("Open HMD conf.");

        m_input.add_click_listener(hmd_conf_button, function() {
            if (is_in_conf) {
                m_hmd_conf.hide();
                is_in_conf = false;
            } else {
                m_hmd_conf.show("hmd_conf_dialog");
                is_in_conf = true;
            }
        });

        controls_container.appendChild(hmd_conf_button);
    }
}


function create_button(caption) {
    var button = document.createElement("a");

    button.className = "btn";
    button.innerText = caption;

    return button;
}

function load() {
    m_data.load(APP_ASSETS_PATH + "vr.json", load_cb, preloader_cb);
}

function preloader_cb(percentage) {
    m_preloader.update_preloader(percentage);
}

function load_cb(data_id, success) {

    if (!success) {
        console.log("b4w load failure");
        return;
    }

    m_app.enable_camera_controls();
}


});

