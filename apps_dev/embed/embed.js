"use strict";

b4w.register("embed_main", function(exports, require) {

var m_cfg            = require("config");
var m_main           = require("main");
var m_app            = require("app");
var m_preloader      = require("preloader");
var m_camera_anim    = require("camera_anim");
var m_sfx            = require("sfx");

var SCENE_PATH = null;
var BUILT_IN_SCRIPTS_ID = "built_in_scripts";
var DEFAULT_QUALITY = "HIGH";
var CAMERA_AUTO_ROTATE_SPEED = 0.3;

var _is_in_fullscreen = false;

var _player_buttons = [
    {"type": "simple_button",  "id": "closed_button",
                               "callback": close_menu},
    {"type": "simple_button",  "id": "opened_button",
                               "callback": open_menu},
    {"type": "trigger_button", "id": "fullscreen_on_button",
                               "replace_button_id": "fullscreen_off_button",
                               "replace_button_cb": check_fullscreen,
                               "callback": check_fullscreen},
    {"type": "trigger_button", "id": "pause_button",
                               "replace_button_id": "play_button",
                               "replace_button_cb": resume_clicked,
                               "callback": pause_clicked},
    {"type": "trigger_button", "id": "auto_rotate_on_button",
                               "replace_button_id": "auto_rotate_off_button",
                               "replace_button_cb": auto_rotate_camera,
                               "callback": auto_rotate_camera},
    {"type": "trigger_button", "id": "sound_on_button",
                               "replace_button_id": "sound_off_button",
                               "replace_button_cb": stop_sound,
                               "callback": play_sound},
    {"type": "menu_button",    "id": "quality_buttons_container",
                               "button_active_class": "active_quality_mode",
                               "child_buttons_array_id": ["low_mode_button",
                                                          "high_mode_button",
                                                          "ultra_mode_button"],
                               "child_buttons_array_cb": [
                                    function(){change_quality(m_cfg.P_LOW)},
                                    function(){change_quality(m_cfg.P_HIGH)},
                                    function(){change_quality(m_cfg.P_ULTRA)}],
                               "callback": display_qual_menu}
]

exports.init = function() {
    m_cfg.set("background_color", [0.224, 0.224, 0.224, 1.0]);

    var is_debug = (b4w.version.type() == "DEBUG");

    set_quality_config();

    b4w.app.init({
        canvas_container_id: "main_canvas_container",
        callback: init_cb,
        gl_debug: is_debug,
        physics_enabled: false,
        show_fps: false,
        console_verbose: is_debug,
        alpha: false
    });
}

function check_file_exist(file) {
    var file_exist = true;

    var xhr = new XMLHttpRequest();
    xhr.open("HEAD", file, false);

    try {
        xhr.send(null)
    } catch(e) {
        file_exist = false;
    }

    if (xhr.status != 200 && xhr.status != 0)
        file_exist = false;

    return file_exist;
}

function init_cb(canvas_element, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }

    m_cfg.set("smaa", false);

    m_preloader.create_rotation_preloader({
        canvas_container_id: "main_canvas_container",
        bg_color: "rgba(0,0,0,0)",
        frame_class: "frame_image",
        anim_elem_class: "anim_elem"
    });

    set_quality_button();

    init_control_buttons();

    check_device();

    if (window.parent != window)
        handle_iframe_scrolling(window, window.parent);


    // search source file
    var file = SCENE_PATH;
    var module_name = m_cfg.get("built_in_module_name");

    if (b4w.module_check(module_name)) {
        var bd = require(module_name);
        var file = bd["data"]["main_file"];
        remove_built_in_scripts();
    } else {
        var url_params = m_app.get_url_params();


        if (url_params && url_params.load) {
            var file_exist = check_file_exist(url_params.load);

            if (file_exist)
                file = url_params.load;
            else {
                control_panel.style.display = "none"
                closed_button.style.display = "none";
                m_app.report_app_error("Could not load a scene",
                                       "For more info visit",
                                       "http://blend4web.com/troubleshooting");
            }
        } else {
            control_panel.style.display = "none";
            closed_button.style.display = "none";
            m_app.report_app_error("Please specify a scene to load",
                                   "For more info visit",
                                   "http://blend4web.com/troubleshooting");
        }
    }

    // load
    b4w.data.load(file, loaded_callback, preloader_callback, false);
    b4w.app.enable_controls(canvas_element);


    window.onresize = on_resize;
    on_resize();
}

function check_device() {
    if (navigator.userAgent.match(/Android/i) ||
        navigator.userAgent.match(/webOS/i) ||
        navigator.userAgent.match(/iPhone/i) ||
        navigator.userAgent.match(/iPad/i)) {
            control_panel.style.cssText = "height: 70px; margin-top: -69px; margin-left: 30px; background-size: 1px 70px; padding-left: 0";
            logo_container.style.cssText = "width: 164px; height: 50px; margin-top:10px; background-size: 163px 50px; right: 40px; background-image: url('data:image/png;base64,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');";
            buttons_container.style.cssText = "width: 350px; height: 70px; margin-left: 10px";
            quality_buttons_container.style.cssText = "width: 70px; height: 200px; margin-top: -131px; margin-right: -5px;";
            closed_button.style.cssText = "display:block";

            var control_buttons = document.getElementsByClassName("control_panel_button");

            for (var i = 0; i < control_buttons.length; i++)
                control_buttons[i].style.cssText = "width: 60px; height: 60px; margin-left: 5px; margin-top: 5px; background-size: 60px;";

            if (window.parent != window)
                fullscreen_on_button.style.display = "none";
    }
}

function init_control_buttons() {

    for (var i = 0; i < _player_buttons.length; i++) {
        var button = _player_buttons[i];

        switch(button.type) {
            case "simple_button":
                var elem = document.getElementById(button["id"]);

                elem.addEventListener("mouseup", button.callback, false);
                break;
            case "menu_button":
                var elem = document.getElementsByClassName(
                                        button["button_active_class"])[0];

                elem.addEventListener("mouseup",
                      function(e) {
                          button.callback(e, button);
                      }, false);
                break;
            case "trigger_button":
                (function(button) {
                    var elem = document.getElementById(button["id"]);
                    var button_cb = {};

                    button_cb[button.id] = button.callback;
                    button_cb[button.replace_button_id] = button.replace_button_cb;

                    elem.addEventListener("mouseup", function(e) {
                        var old_elem_id = elem.id;
                        swap_buttons(elem, button);
                        button_cb[old_elem_id](elem, button);
                    }, false)
                }(button));
                break;
        }
    }
}

function swap_buttons(elem, button) {
    var old_elem_id = elem.id;
    elem.id = button.replace_button_id;
    button.replace_button_id = old_elem_id;
}

function turn_rotate_button_off(){
    var elem = document.getElementById("auto_rotate_off_button");
    if (elem)
        for (var i = 0; i < _player_buttons.length; i++)
            if (_player_buttons[i]["id"] == "auto_rotate_on_button") {
                var player_button = _player_buttons[i];
                var old_elem_id = elem.id;
                swap_buttons(elem, player_button);
                return;
            }
}

function auto_rotate_camera() {
    m_camera_anim.auto_rotate(CAMERA_AUTO_ROTATE_SPEED, turn_rotate_button_off);
}

function pause_clicked() {
    m_main.pause();
}

function resume_clicked() {
    m_main.resume();
}

function play_sound() {
    m_sfx.mute(null, true)
}

function stop_sound() {
    m_sfx.mute(null, false)
}

function close_menu() {
    control_panel.style.display = "none";
    closed_button.style.display = "none";
    opened_button.style.display = "block";
}

function open_menu() {
    control_panel.style.display = "block";
    closed_button.style.display = "block";
    opened_button.style.display = "none";
}

function display_qual_menu(e, button) {

    var elem = e.target;

    elem.style.display = "none";

    var elem_id = elem.id;
    var checked_elem_id = elem_id.replace('display', 'button');
    var child_id = button.child_buttons_array_id;
    var child_cb = button.child_buttons_array_cb;
    var clone_active_elem = null;

    for (var i = 0; i < child_id.length; i++) {
        var elem_child_id = child_id[i];

        if (elem_child_id == checked_elem_id) {
            var active_elem = document.getElementById(elem_child_id);

            if (active_elem) {
                active_elem.id = elem_id;
                active_elem.style.opacity = "0.2";
                clone_active_elem = active_elem.cloneNode(true);
                quality_buttons_container.removeChild(active_elem);
            }
        } else {
            var active_elem = document.getElementById(elem_child_id);
            active_elem.addEventListener("mouseup", child_cb[i], false);
        }
    }

    quality_buttons_container.appendChild(clone_active_elem);

    quality_buttons_container.style.display = "block";

    document.addEventListener("mousedown", function _close_menu(e) {
        var target = e.target;

        if (target.id.indexOf("_mode_button") == -1) {
            quality_buttons_container.style.display = "none";
            clone_active_elem.id = elem_id.replace('display', 'button');
            elem.style.display = "block";
        }
        document.removeEventListener("mousedown", _close_menu, false);
    }, false);
}

/**
 * Disable parent window scrolling if cursor is inside <iframe>
 */
function handle_iframe_scrolling(win, win_par) {

    try {
        var scroll_x = win_par.scrollX;
        var scroll_y = win_par.scrollY;

        var inside = false;

        win.onmouseover = function() {
            inside = true;
            scroll_x = win_par.scrollX;
            scroll_y = win_par.scrollY;
        };

        win.onmouseout = function() {
            inside = false;
        };

        win_par.onscroll = function(e) {
            if (inside)
                win_par.scroll(scroll_x, scroll_y);
        }
    } catch(e) {
        console.warn("Cross-origin iframe detected, disabling scroll-lock feature");
    }
}

function on_resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    b4w.main.resize(w, h);
}

function loaded_callback(root) {
    b4w.app.enable_camera_controls();
    b4w.set_render_callback(render_callback);
}

function preloader_callback(percentage, load_time) {

    var elem = document.createElement("div");
    elem.id = "preloader";

    m_preloader.update_preloader(percentage);


    //var lp_elem = document.getElementById("loading_progress");
    //lp_elem.innerHTML = percentage + "% (" + 
    //    Math.round(10 * load_time / 1000)/10 + "s)";
}

function render_callback(elapsed, current_time) {}

function remove_built_in_scripts() {
    var scripts = document.getElementById(BUILT_IN_SCRIPTS_ID);
    scripts.parentElement.removeChild(scripts);
}

function pause_clicked() {
    b4w.pause();
}

function resume_clicked() {
    b4w.resume();
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
        console.log(quality);
        b4w.storage.set("quality", quality);

        setTimeout(function() {
            window.location.reload();
        }, 100);
    }
}

function check_fullscreen(elem, button) {
    if (!_is_in_fullscreen) {
        m_app.request_fullscreen(document.body,
            function() {
                _is_in_fullscreen = true;
                update_fullscreen_button(_is_in_fullscreen, elem, button);
            },
            function() {
                _is_in_fullscreen = false;
                update_fullscreen_button(_is_in_fullscreen, elem, button);
            });
    } else {
        m_app.exit_fullscreen();
    }
}

function update_fullscreen_button(is_fullscreen, elem, button) {
    if (is_fullscreen && elem.id == "fullscreen_on_button" 
            || !is_fullscreen && elem.id == "fullscreen_off_button")
        swap_buttons(elem, button);
}

function set_quality_config() {
    var quality = b4w.storage.get("quality");

    if (!quality || quality == "CUSTOM") {
        quality = DEFAULT_QUALITY;
        b4w.storage.set("quality", quality);
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

function set_quality_button() {
    var quality = b4w.storage.get("quality");

    if (!quality || quality == "CUSTOM") {
        quality = DEFAULT_QUALITY;
        b4w.storage.set("quality", quality);
    }

    var elem = document.getElementsByClassName("active_quality_mode")[0];
    elem.className = "control_panel_button";

    switch (quality) {
    case "LOW":
        elem.id = "low_mode_display";
        elem.className = "control_panel_button active_quality_mode";
        break;
    case "HIGH":
        elem.id = "high_mode_display";
        elem.className = "control_panel_button active_quality_mode";
        break;
    case "ULTRA":
        elem.id = "ultra_mode_display";
        elem.className = "control_panel_button active_quality_mode";
        break;
    }
}


});

b4w.require("embed_main").init();
