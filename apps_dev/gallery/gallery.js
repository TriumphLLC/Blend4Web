"use strict";

b4w.register("gallery_main", function(exports, require) {

var m_app     = require("app");
var m_camera  = require("camera");
var m_cfg     = require("config");
var m_ctl     = require("controls");
var m_data    = require("data");
var m_main    = require("main");
var m_scenes  = require("scenes");
var m_storage = require("storage");
var m_util    = require("util");
var m_version = require("version");

var DEBUG = (m_version.type() === "DEBUG");

var INIT_PARAMS = {
    canvas_container_id: "main_canvas_container",
    callback: init_cb,
    physics_enabled: false,
    alpha : false,
    gl_debug: false,
    show_hud_debug_info: false,
    show_fps: true,
    fps_elem_id: "status_bar_fps",
    console_verbose: DEBUG,
    assets_dds_available: !DEBUG,
    assets_min50_available: !DEBUG,
    error_purge_elements: ["control_panel_over", "status_bar"]
};

var AUTO_ROTATE_RATIO = 0.1;

var ASSETS_PATH = m_cfg.get_std_assets_path();

var BUTTON_ACTIVE_STYLE = "0 0 15px #008eff";

var DEFAULT_QUALITY = "LOW";

var SCENES = [
    {
        icon: "icons/logo.png",
        name: "Logo",
        load_file: "misc/logo.json",
        tags: ["all", "nothing", "car", "naturemorte"]
    },
    // {
    //     icon: "icons/car.png",
    //     name: "Car",
    //     load_file: "capri/vehicles/car_bv_eb164/car_bv_eb164.json",
    //     tags: ["all", "car"]
    // },
    // {
    //     icon: "icons/boat.png",
    //     name: "Porsche Fearless 28",
    //     load_file : "capri/vehicles/boat_pf28/boat_pf28.json",
    //     tags: ["all", "capri"]
    // },
    // {
    //     icon: "icons/helicopter.png",
    //     name: "Mi 34s1",
    //     load_file : "capri/vehicles/mi_34s1/mi_34s1.json",
    //     tags: ["all", "capri"]
    // },
    {
        icon: "icons/milk.png",
        name: "Bottle",
        load_file: "fridge/bottle/bottle.json",
        tags: ["all", "naturemorte"]
    },
    {
        icon: "icons/naturmort.png",
        name: "Naturemorte",
        load_file : "fridge/naturmort/naturmort.json",
        tags: ["all", "naturemorte"]
    }
    // {
    //     icon: "icons/watch.png",
    //     name: "Watch",
    //     load_file : "capri/props/watch_scene/watch_scene.json",
    //     tags: ["all", "capri"]
    // },
    // {
    //     icon: "icons/elephants.png",
    //     name: "Elephants",
    //     load_file : "capri/buildings/fountain_elephants/fountain_elephants.json",
    //     tags: ["all", "capri"]
    // }
];

var _control_panel_elem;
var _fps_logger_elem;
var _preloader_elem;
var _resolution_elem;
var _status_bar_elem;
var _hover_panel_elem;
var _scroll_panel_elem;

var _is_in_fullscreen = false;
var _url_default = null;
var _url_tag = null;
var _force_default = null;


exports.init = function() {
    m_storage.init("b4w_gallery_storage");
    set_quality_config();
    m_app.init(INIT_PARAMS);
}

function set_quality_config() {
    var quality = m_storage.get("quality");

    if (!quality || quality == "CUSTOM") {
        quality = DEFAULT_QUALITY;
        m_storage.set("quality", quality);
    }

    switch (quality) {
    case "LOW":
        var qual = m_cfg.P_LOW;
        break;
    case "HIGH":
        var qual = m_cfg.P_HIGH;
        break;
    case "ULTRA":
        var qual = m_cfg.P_ULTRA;
        break;
    }

    m_cfg.set("quality", qual);
}

function init_cb(canvas_elem, success) {
    if (!success) {
        console.log("b4w init failure");
        return;
    }

    // cache dom elements
    _control_panel_elem = document.getElementById("control_panel");
    _scroll_panel_elem = document.getElementById("scroll_panel");
    _hover_panel_elem = document.getElementById("hover_panel");
    _preloader_elem = document.getElementById("status_bar_loading");
    _resolution_elem = document.getElementById("status_bar_resolution");
    _status_bar_elem = document.getElementById("status_bar");


    if (navigator.userAgent.indexOf('Firefox') != -1 ||
        navigator.userAgent.indexOf('rv:11') != -1) {
        _control_panel_elem.style.width = '90px';
        _hover_panel_elem.style.width = '90px';
        _scroll_panel_elem.style.width = '90px';
    }

    assign_url_params();

    m_app.enable_controls();

    // setup resize
    window.addEventListener("resize", on_resize, false);
    on_resize();

    fill_scene_buttons(_url_tag);

    // setup fullscreen button
    add_config_button("fullscreen_button", check_fullscreen);

    // setup auto rotate button
    add_config_button("auto_rotate_button", function() {
        button_up("auto_rotate_button");
        switch_auto_rotate_mode("auto_rotate_button");
    });

    add_config_button("low_mode_button", function() {
        button_up("low_mode_button");
        change_quality(m_cfg.P_LOW);
    });
    add_config_button("high_mode_button", function() {
        button_up("high_mode_button");
        change_quality(m_cfg.P_HIGH);
    });
    add_config_button("ultra_mode_button", function() {
        button_up("ultra_mode_button");
        change_quality(m_cfg.P_ULTRA);
    });

    // load last scene
    var last_scene_id = m_storage.get("last_scene_id");

    if (last_scene_id && validate_scene_id(last_scene_id, _url_tag) && !_force_default)
        load_scene(last_scene_id);
    else 
        load_scene(_url_default);
}

function add_config_button(button_id, cb) {
    window.oncontextmenu = function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };

    var elem = document.getElementById(button_id);

    elem.addEventListener('mousedown', function(e) {
        button_down(button_id, e);
    }, false);

    elem.addEventListener('mouseover', function(e) {
        mouseover_cb(button_id, e);
    }, false);

    elem.addEventListener('mouseout', function(e) {
        mouseout_cb(button_id, e);
    }, false);

    elem.addEventListener('mouseup', cb, false);
}

function mouseover_cb(scene_id, e) {
    var isTouch =  !!("ontouchstart" in window) || window.navigator.msMaxTouchPoints > 0;

    if (isTouch)
        return null;

    var elem = document.getElementById(scene_id);
    var parent = elem.parentElement;
    var hover_panel = document.getElementById('hover_panel');
    var glow_hover = document.getElementById('glow');

    if (!glow_hover) {

        var hover_glow_elem = document.createElement('div');

        hover_glow_elem.id = 'glow';
        hover_glow_elem.style.top = e.target.offsetTop;

        hover_panel.appendChild(hover_glow_elem);

        glow_hover = document.getElementById('glow');
    }

    glow_hover.style.top = e.target.offsetTop - 20 + 'px';
}

function mouseout_cb(scene_id) {
    var elem = document.getElementById(scene_id);

    elem.className = 'control_panel_button';

    clear_glow();
}

function button_up(button_id) {
    var elem = document.getElementById(button_id);
    var parent = elem.parentElement;
    var glow_hover = document.getElementById('glow');

    elem.className = 'control_panel_button'
}

function button_down(scene_id, e) {
    var isTouch =  !!("ontouchstart" in window) || window.navigator.msMaxTouchPoints > 0;

    if (isTouch)
        return null;

    e.preventDefault();
    clear_glow();

    var glow_active = document.getElementsByClassName(scene_id);

    if (glow_active.length)
        return null;

    var elem = document.getElementById(scene_id);
    var down_glow_elem = document.createElement('div');

    down_glow_elem.id = 'glow_down';
    down_glow_elem.style.marginTop = e.target.offsetTop - 28 + 'px';
    _hover_panel_elem.appendChild(down_glow_elem);

    elem.className = 'control_panel_button button_down';
}

function clear_glow() {
    var glow_down = document.getElementById('glow_down');
    var glow_hover = document.getElementById('glow');

    if (glow_hover)
        _hover_panel_elem.removeChild(glow_hover);

    if (glow_down)
        _hover_panel_elem.removeChild(glow_down);

}

function check_fullscreen() {
    if (!_is_in_fullscreen) {
        m_app.request_fullscreen(document.body,
            function() {
                _is_in_fullscreen = true;
                button_switch_active("fullscreen_button", true);
            },
            function() {
                _is_in_fullscreen = false;
                button_switch_active("fullscreen_button", false);
            });
    } else {
        m_app.exit_fullscreen();
    }
}

function assign_url_params() {
    var url_params = m_app.get_url_params();

    _url_default = (url_params && url_params["default"]) ? url_params["default"] : "Logo";
    _url_tag = (url_params && url_params["tag"]) ? url_params["tag"] : "nothing";

    _force_default = (url_params && url_params["force_default"] == 1) ? url_params["force_default"] : null;

    // validate url "tag" param
    var url_tag_valid = false;
    for (var i = 0; i < SCENES.length; i++) {
        var scene = SCENES[i];

        if (scene.tags.indexOf(_url_tag) > -1)
            url_tag_valid = true;
    }
    if (!url_tag_valid)
        _url_tag = "nothing";

    // validate url "default" param
    var url_default_valid = false;
    for (var i = 0; i < SCENES.length; i++) {
        var scene = SCENES[i];

        if (scene.name == _url_default && scene.tags.indexOf(_url_tag) > -1)
            url_default_valid = true;
    }
    if (!url_default_valid)
        _url_default = "Logo";
}

function change_quality(qual) {
    var cur_quality = m_cfg.get("quality");

    if (cur_quality != qual) {

        switch (qual) {
        case m_cfg.P_LOW:
            var quality = "LOW";
            break;
        case m_cfg.P_HIGH:
            var quality = "HIGH";
            break;
        case m_cfg.P_ULTRA:
            var quality = "ULTRA";
            break;
        }

        m_storage.set("quality", quality);

        setTimeout(function() {
            window.location.reload();
        }, 100);
    }
}

function validate_scene_id(scene_id, tag) {
    var scene = m_util.keysearch("name", scene_id, SCENES);

    if (scene && scene.tags.indexOf(tag) > -1)
        return true;
    else
        return false;
}

function load_scene(scene_id) {

    var load_file = m_util.keysearch("name", scene_id, SCENES).load_file;

    m_data.load(ASSETS_PATH + load_file, loaded_callback, 
            preloader_callback, false);

    button_switch_active(scene_id, true);

    m_storage.set("last_scene_id", scene_id);

    // always returns something, see set_quality_config()
    var quality = m_storage.get("quality");

    switch (quality) {
    case "LOW":
        button_switch_active("low_mode_button", true);
        break;
    case "HIGH":
        button_switch_active("high_mode_button", true);
        break;
    case "ULTRA":
        button_switch_active("ultra_mode_button", true);
        break;
    }
}

function switch_auto_rotate_mode(button_elem_id) {
    var camobj = m_scenes.get_active_camera();

    function disable_auto_rotate_cb() {

        m_ctl.remove_sensor_manifold(camobj, "AUTO_ROTATE");
        m_ctl.remove_sensor_manifold(camobj, "DISABLE_AUTO_ROTATE");
        button_switch_active(button_elem_id, false);
    }

    function elapsed_cb(obj, id, pulse) {
        if (pulse == 1) {
            var value = m_ctl.get_sensor_value(obj, id, 0);
            m_camera.rotate_target_camera(obj, value * AUTO_ROTATE_RATIO, 0);
        }
    }

    if (!m_ctl.check_sensor_manifold(camobj, "AUTO_ROTATE")) {

        var mouse_move   = m_ctl.create_mouse_move_sensor("XY");
        var mouse_down   = m_ctl.create_mouse_click_sensor();
        var touch_move   = m_ctl.create_touch_move_sensor("XY");
        var touch_zoom   = m_ctl.create_touch_zoom_sensor();

        var elapsed      = m_ctl.create_elapsed_sensor();
        var logic_func   = function(s) {
            return ((s[0] && s[1]) || s[2] || s[3]);
        };
        m_ctl.create_sensor_manifold(camobj, "AUTO_ROTATE", m_ctl.CT_CONTINUOUS,
                                    [elapsed], function(s) {return s[0]},
                                    elapsed_cb);
        m_ctl.create_sensor_manifold(camobj, "DISABLE_AUTO_ROTATE", m_ctl.CT_SHOT,
                                    [mouse_move, mouse_down, touch_move, touch_zoom],
                                    logic_func, disable_auto_rotate_cb);
        button_switch_active(button_elem_id, true);
    } else {
        disable_auto_rotate_cb();
    }
}

function button_switch_active(elem_id, is_active) {
    var elem = document.getElementById(elem_id);
    var active_glow_elem = document.createElement('div');

    clear_glow();

    active_glow_elem.id = 'glow_active';
    active_glow_elem.style.top = elem.offsetTop - 20 + 'px';

    if (is_active) {
        active_glow_elem.className = elem_id;
        _hover_panel_elem.appendChild(active_glow_elem);
        elem.className = 'control_panel_button';
    } else {
        var glow_active = document.getElementsByClassName(elem_id)[0];

        if (glow_active)
            _hover_panel_elem.removeChild(glow_active);
    }
}

function fill_scene_buttons(tag) {
    var s = "";

    for (var i = 0; i < SCENES.length; i++) {
        var id = SCENES[i].name;
        var path = SCENES[i].icon;
        var tags = SCENES[i].tags;

        if (tags.indexOf(tag) > -1)
            s += "<div id='" + id + 
                "' class='control_panel_button' style='background-image: url(" +
                path + ");'></div>";
    }
    _control_panel_elem.innerHTML += s;

    for (var i = 0; i < SCENES.length; i++) {
        var scene_id = SCENES[i].name;
        var tags = SCENES[i].tags;

        if (tags.indexOf(tag) > -1)
            init_scene_button(scene_id);
    }
}

function mouse_up_cb(scene_id) {
    cleanup();
    load_scene(scene_id);
}

function init_scene_button(scene_id) {
    var elem = document.getElementById(scene_id);

    elem.addEventListener('mousedown', function(e) {button_down(scene_id, e)}, true);
    elem.addEventListener('mouseup', function() {button_up(scene_id); mouse_up_cb(scene_id)}, true);
    elem.addEventListener('mouseover', function(e) {mouseover_cb(scene_id, e)}, true);
    elem.addEventListener('mouseout', function() {mouseout_cb(scene_id)}, true);
}

function cleanup() {
    m_data.cleanup();

    for (var i = 0; i < SCENES.length; i++) {
        var id = SCENES[i].name;
        var tags = SCENES[i].tags;
        if (tags.indexOf(_url_tag) > -1)
            button_switch_active(id, false);
    }

    button_switch_active("auto_rotate_button", false);
    button_switch_active("low_mode_button", false);
    button_switch_active("high_mode_button", false);
    button_switch_active("ultra_mode_button", false);
}

function loaded_callback(data_id) {
    if (m_cfg.get("antialiasing")) {
        // actually high quality by default has no perf penalty
        //m_scenes.set_aa_params({"aa_method": "AA_METHOD_FXAA_QUALITY"});
        //m_scenes.set_aa_params({"aa_method": "AA_METHOD_FXAA_LIGHT"});
    }

    m_app.enable_camera_controls();
}

function preloader_callback(percentage, load_time) {
    _preloader_elem.innerHTML = percentage + "% (" + 
        Math.round(10 * load_time / 1000)/10 + "s)";
}

function on_resize(e) {
    m_app.resize_to_container();

    var w = window.innerWidth;
    var h = window.innerHeight;

    _resolution_elem.innerHTML = Math.round(w) + "x" + Math.round(h);
}

});

b4w.require("gallery_main").init();
