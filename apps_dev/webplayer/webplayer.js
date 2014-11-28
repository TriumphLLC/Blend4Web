"use strict";

b4w.register("embed_main", function(exports, require) {

var m_app         = require("app");
var m_camera_anim = require("camera_anim");
var m_cfg         = require("config");
var m_data        = require("data");
var m_main        = require("main");
var m_sfx         = require("sfx");
var m_storage     = require("storage");
var m_version     = require("version");

var SCENE_PATH               = null;
var BUILT_IN_SCRIPTS_ID      = "built_in_scripts";
var DEFAULT_QUALITY          = "HIGH";
var CAMERA_AUTO_ROTATE_SPEED = 0.3;

var HIDE_MENU_DELAY          = 2000;
var ANIM_ELEM_DELAY          = 20;
var LOGO_SHOW_DELAY          = 300;
var LOGO_HIDE_DELAY          = 300;
var LOGO_CIRCLE_HIDE_DELAY   = 300;
var CAPTION_SHOW_DELAY       = 300;
var CAPTION_HIDE_DELAY       = 300;
var MENU_BUTTON_SHOW_DELAY   = 300;
var PRELOADER_HIDE_DELAY     = 300;

var _is_in_fullscreen        = false;
var _menu_close_func         = null;
var _is_control_panel_opened = false;
var _is_anim_in_process      = false;
var _is_qual_menu_opened     = false;
var _is_help_menu_opened     = false;

var _player_buttons = [
    {type: "simple_button", id: "opened_button", callback: open_menu},
    {type: "simple_button", id: "help_button", callback: open_help},
    {type: "simple_button", id: "close_help", callback: close_help},
    {type: "trigger_button", id: "fullscreen_on_button",
            replace_button_id: "fullscreen_off_button",
            replace_button_cb: check_fullscreen,
            callback: check_fullscreen},
    {type: "trigger_button", id: "pause_button",
            replace_button_id: "play_button",
            replace_button_cb: resume_clicked,
            callback: pause_clicked},
    {type: "trigger_button", id: "auto_rotate_on_button",
            replace_button_id: "auto_rotate_off_button",
            replace_button_cb: auto_rotate_camera,
            callback: auto_rotate_camera},
    {type: "trigger_button", id: "sound_on_button",
            replace_button_id: "sound_off_button",
            replace_button_cb: stop_sound,
            callback: play_sound},
    {type: "menu_button", id: "quality_buttons_container",
            child_buttons_array_id: ["low_mode_button",
                                     "high_mode_button",
                                     "ultra_mode_button"],
            child_buttons_array_cb: [
                 function(){change_quality(m_cfg.P_LOW)},
                 function(){change_quality(m_cfg.P_HIGH)},
                 function(){change_quality(m_cfg.P_ULTRA)}],
            callback: open_qual_menu}
]

exports.init = function() {
    m_cfg.set("background_color", [0.224, 0.224, 0.224, 1.0]);

    var is_debug   = (m_version.type() == "DEBUG");
    var show_fps   = false;
    var url_params = m_app.get_url_params();

    if (url_params && "show_fps" in url_params)
        show_fps = true;

    if (url_params && url_params["load"])
        m_storage.init("b4w_webplayer:" + url_params["load"]);
    else
        m_storage.init("b4w_webplayer:" + window.location.href);

    set_quality_config();

    var is_html = b4w.module_check(m_cfg.get("built_in_module_name"));
    // disable physics in HTML version
    m_app.init({
        canvas_container_id: "main_canvas_container",
        callback: init_cb,
        gl_debug: is_debug,
        physics_enabled: !is_html,
        show_fps: show_fps,
        report_init_failure: false,
        console_verbose: is_debug,
        error_purge_elements: ['control_panel'],
        alpha: false,
        key_pause_enabled: false,
        fps_elem_id: "fps_container",
        fps_wrapper_id: "fps_wrapper"
    });
}

function open_help() {
    help_info_container.style.display = "block";
    help_button.style.display = "none";
    _is_help_menu_opened = true;
    clear_deffered_close();
}

function close_help(is_cb) {
    if (!_is_help_menu_opened)
        return;

    help_info_container.style.display = "none";
    help_button.style.display = "block";
    _is_help_menu_opened = false;

    if (is_cb)
        deffered_close();
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
        var url_params = m_app.get_url_params();

        if (url_params && url_params["fallback_image"]) {
            var image_wrapper = document.createElement("div");
            image_wrapper.className = "image_wrapper";
            document.body.appendChild(image_wrapper);
            preloader_container.style.display = "none";
            image_wrapper.style.backgroundImage = 'url(' + url_params["fallback_image"] + ')';
        } else
            report_app_error("Browser could not initialize WebGL", "For more info visit",
                          "https://www.blend4web.com/troubleshooting")

        return;
    }

    m_main.pause();

    set_quality_button();

    init_control_buttons();

    if (!m_app.check_fullscreen())
        fullscreen_on_button.parentElement.removeChild(fullscreen_on_button);

    // search source file
    var file = SCENE_PATH;

    var module_name = m_cfg.get("built_in_module_name");

    if (b4w.module_check(module_name)) {
        var bd = require(module_name);
        var file = bd["data"]["main_file"];

        remove_built_in_scripts();
    } else {
        var url_params = m_app.get_url_params();

        logo_container.style.display = "block";

        if (url_params && url_params["load"]) {
            var file_exist = check_file_exist(url_params["load"]);

            if (file_exist)
                file = url_params["load"];
            else {
                report_app_error("Could not load the scene",
                                       "For more info visit",
                                       "https://www.blend4web.com/troubleshooting");
                return null;
            }
        } else {
            report_app_error("Please specify a scene to load",
                                   "For more info visit",
                                   "https://www.blend4web.com/troubleshooting");
            return null;
        }
    }

    anim_elem(logo_container, "opacity", LOGO_SHOW_DELAY, 1, 0, "", "", function() {
        preloader_caption.style.display = "block";
        anim_elem(preloader_caption, "opacity", CAPTION_SHOW_DELAY, 1, 0, "", "", function() {
            m_main.resume();
        });
    })

    // load
    m_data.load(file, loaded_callback, preloader_callback, false);
    m_app.enable_controls(canvas_element);

    window.addEventListener("resize", on_resize, false);
    on_resize();
}

function init_control_buttons() {
    window.oncontextmenu = function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };

    for (var i = 0; i < _player_buttons.length; i++) {
        var button = _player_buttons[i];

        switch (button.type) {
        case "simple_button":
            var elem = document.getElementById(button.id);

            if (elem)
                elem.addEventListener("mouseup", button.callback, false);
            break;
        case "menu_button":
            var elem = document.getElementById(button.id);

            if (elem)
                elem.addEventListener("mouseup",
                      function(e) {
                          button.callback(e, button);
                      }, false);
            break;
        case "trigger_button":
            (function(button) {
                var elem = document.getElementById(button.id);
                var button_cb = {};

                button_cb[button.id] = button.callback;
                button_cb[button.replace_button_id] = button.replace_button_cb;

                if (elem)
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

function turn_rotate_button_off() {
    var elem = document.getElementById("auto_rotate_off_button");

    if (elem)
        for (var i = 0; i < _player_buttons.length; i++)
            if (_player_buttons[i].id == "auto_rotate_on_button") {
                var player_button = _player_buttons[i];
                var old_elem_id = elem.id;
                swap_buttons(elem, player_button);
                return;
            }
}

function auto_rotate_camera() {
    m_camera_anim.auto_rotate(CAMERA_AUTO_ROTATE_SPEED, turn_rotate_button_off);
}

function play_sound() {
    m_sfx.mute(null, true)
}

function stop_sound() {
    m_sfx.mute(null, false)
}

function close_menu() {
    if (_is_anim_in_process)
        return;

    close_qual_menu();

    close_help();

    _is_anim_in_process = true;

    var elem = help_button;

    var drop_down = function(elem) {
        anim_elem(elem, "marginRight", ANIM_ELEM_DELAY, -45, 0, "", "px", function() {
            elem.style.display = "none";
        });

        anim_elem(elem, "opacity", ANIM_ELEM_DELAY, 0, 1, "", "", function() {
            if (elem.previousElementSibling && elem.previousElementSibling.id != "opened_button")
                drop_down(elem.previousElementSibling);
            else {
                _is_anim_in_process = false;
                _is_control_panel_opened = false;
                return;
            }
        });
    }

    drop_down(elem);
}

function open_menu() {
    if (_is_anim_in_process)
        return;

    if (_is_control_panel_opened) {
        close_menu();
        return;
    }

    _is_anim_in_process = true;

    var elem = opened_button;

    var drop_down = function(elem) {
        elem.style.display = "block";
        elem.style.marginRight = "-45px";

        anim_elem(elem, "marginRight", ANIM_ELEM_DELAY, 0, -45, "", "px", function() {

            if (!elem.nextElementSibling) {
                _is_anim_in_process = false;
                _is_control_panel_opened = true;
                return;
            }

            drop_down(elem.nextElementSibling)
        });

        anim_elem(elem, "opacity", ANIM_ELEM_DELAY, 1, 0, "", "");
    }

    drop_down(elem.nextElementSibling);

    buttons_container.addEventListener("mouseleave", deffered_close, false);
    main_canvas_container.addEventListener("touchmove", deffered_close, false);
    buttons_container.addEventListener("mouseenter", clear_deffered_close, false);
}

function deffered_close() {
    if (_is_help_menu_opened)
        return;

    _menu_close_func = setTimeout(close_menu, HIDE_MENU_DELAY);
}

function clear_deffered_close() {
    clearTimeout(_menu_close_func);
}

function close_qual_menu(e) {
    if (!_is_qual_menu_opened)
        return;

    _is_qual_menu_opened = false;

    if (e) {
        e.stopPropagation();
        var active_elem = e.target;
    } else
        var active_elem = document.querySelectorAll(".active_elem")[0];

    var elem = quality_buttons_container;

    elem.style.marginRight = "0px";

    for (var i = 0; i < elem.children.length; i++) {
        elem.children[i].style.display = "none";
        elem.children[i].style.opacity = 0;
    }

    elem.className = "control_panel_button " + active_elem.id;
}

function open_qual_menu(e, button) {
    _is_qual_menu_opened = true;

    var elem = quality_buttons_container;

    elem.style.marginRight = "-30px";

    var child_id = button.child_buttons_array_id;
    var child_cb = button.child_buttons_array_cb;

    for (var i = 0; i < child_id.length; i++) {
        var child_elem = document.getElementById(child_id[i]);

        if (elem.className.indexOf(child_id[i]) < 0)
            child_elem.addEventListener("mouseup", child_cb[i], false)
        else {
            child_elem.className = "active_elem";
            child_elem.addEventListener("mouseup", close_qual_menu, false)
        }
    }

    elem.className = "quality_buttons_container";

    for (var i = 0; i < elem.children.length; i++) {
        elem.children[i].style.display = "block";
        elem.children[i].style.opacity = 1;
    }
}

function on_resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    m_main.resize(w, h);
}

function loaded_callback(data_id) {
    m_app.enable_camera_controls();
    m_main.set_render_callback(render_callback);
    on_resize();
}

function preloader_callback(percentage, load_time) {
    preloader_caption.innerHTML = percentage + "%";

    if (percentage < 33) {
        circle_container.style.display = "block";
        first_stage.style.width = percentage * 4.7 + "px";
        circle_container.style.webkitTransform = 'rotate('+ (percentage * 3.6 - 503) + 'deg)';
        circle_container.style.transform = 'rotate('+ (percentage * 3.6 - 503) + 'deg)';
    } else if (percentage < 66) {
        first_stage.style.width = 142 + "px";
        second_stage.style.backgroundColor = "#000";
        second_stage.style.marginTop = "135px";

        if (135 - (percentage - 33) * 4.5 > 0)
            second_stage.style.marginTop = 135 - (percentage - 33) * 3.5 + "px";

        circle_container.style.webkitTransform = 'rotate('+ (percentage * 3.6 - 503) + 'deg)';
        circle_container.style.transform = 'rotate('+ (percentage * 3.6 - 503) + 'deg)';
    } else if (percentage != 100) {
        second_stage.style.marginTop = "0px";
        third_stage.style.backgroundColor = "#000";
        third_stage.style.height = "0px";

        if (percentage > 75)
            third_stage.style.height = (percentage * 0.1) + "px";

        circle_container.style.webkitTransform = 'rotate('+ (percentage * 3.6 - 503) + 'deg)';
        circle_container.style.transform = 'rotate('+ (percentage * 3.6 - 503) + 'deg)';
    }

    if (percentage == 100) {
        var first_elem = document.getElementById("first_stage");

        if (!first_elem)
            return;

        if (!m_sfx.check_active_speakers())
            sound_on_button.parentElement.removeChild(sound_on_button);

        first_stage.parentElement.removeChild(first_stage)
        second_stage.parentElement.removeChild(second_stage)
        third_stage.parentElement.removeChild(third_stage)
        circle_container.parentElement.removeChild(circle_container)
        load_container.style.backgroundColor = "#000";

        anim_elem(preloader_caption, "opacity", CAPTION_HIDE_DELAY, 0, 1, "", "", function() {
            anim_elem(load_container, "opacity", LOGO_CIRCLE_HIDE_DELAY, 0, 1, "", "", function() {
                anim_elem(logo_container, "opacity", LOGO_HIDE_DELAY, 0, 1, "", "", function() {
                    anim_elem(preloader_container, "opacity", PRELOADER_HIDE_DELAY, 0, 1, "", "", function() {
                        preloader_container.parentElement.removeChild(preloader_container);
                    });
                });
                opened_button.style.display = "block";
                anim_elem(opened_button, "transform", MENU_BUTTON_SHOW_DELAY, 1, 0, "scale(", ")");
            });
        });
    }
}

function render_callback(elapsed, current_time) {}

function remove_built_in_scripts() {
    var scripts = document.getElementById(BUILT_IN_SCRIPTS_ID);

    scripts.parentElement.removeChild(scripts);
}

function pause_clicked() {
    m_main.pause();
}

function resume_clicked() {
    m_main.resume();
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

function check_fullscreen(elem, button) {
    if (!_is_in_fullscreen) {
        m_app.request_fullscreen(document.body,
            function() {
                if (!check_cursor_position("buttons_container"))
                    deffered_close();

                _is_in_fullscreen = true;
                update_fullscreen_button(_is_in_fullscreen, elem, button);
            },
            function() {
                if (!check_cursor_position("buttons_container"))
                    deffered_close();

                _is_in_fullscreen = false;
                update_fullscreen_button(_is_in_fullscreen, elem, button);
            });
    } else {
        m_app.exit_fullscreen();
    }
}

function check_cursor_position(elem_id) {
    var hover = false;

    if (document.querySelectorAll) {
        var elems = document.querySelectorAll( ":hover" );

        for (var i = 0; i < elems.length; i++) {
            if (elems[i].id == elem_id) {
                hover = true;
                break;
            }
        }
    }

    return hover;
}

function update_fullscreen_button(is_fullscreen, elem, button) {
    if (is_fullscreen && elem.id == "fullscreen_on_button"
            || !is_fullscreen && elem.id == "fullscreen_off_button")
        swap_buttons(elem, button);
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

function set_quality_button() {
    var quality = m_storage.get("quality");

    if (!quality || quality == "CUSTOM") {
        quality = DEFAULT_QUALITY;
        m_storage.set("quality", quality);
    }

    var elem = quality_buttons_container;

    if (!elem)
        return null;

    elem.className = "control_panel_button";

    switch (quality) {
    case "LOW":
        elem.className = "control_panel_button low_mode_button";
        break;
    case "HIGH":
        elem.className = "control_panel_button high_mode_button";
        break;
    case "ULTRA":
        elem.className = "control_panel_button ultra_mode_button";
        break;
    }
}

function anim_elem(elem, prop, time, max_val, min_val, prefix, suffix, cb) {
    elem = elem || null;
    prop = prop || null;
    time = time || 1000;
    max_val = isFinite(max_val)? max_val : 1;
    min_val = isFinite(min_val)? min_val : 0;
    prefix = prefix || "";
    suffix = suffix || "";
    cb = cb || null;

    if (!elem || !prop)
        return;

    if (elem instanceof Array)
        var test_elem = elem[0]
    else
        var test_elem = elem;

    if (test_elem.style[prop] != undefined) {

    } else if (test_elem.style["webkit" + prop.charAt(0).toUpperCase() + prop.slice(1)] != undefined) {
        prop = "webkit" + prop.charAt(0).toUpperCase() + prop.slice(1);
    } else if (test_elem.style["ms" + prop.charAt(0).toUpperCase() + prop.slice(1)] != undefined) {
        prop = "ms" + prop.charAt(0).toUpperCase() + prop.slice(1);
    }

    var requestAnimFrame =
        window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback) { return window.setTimeout(callback, 1000/60) };

    var start = new Date().getTime();

    var delta = max_val - min_val

    var frame = function() {
        var elapsed_total = new Date().getTime() - start;

        if (elapsed_total >= time) {
            if (elem instanceof Array)
                for (var i = 0; i < elem.length; i++)
                    elem[i].style[prop] = prefix + max_val + suffix;
            else
                elem.style[prop] = prefix + max_val + suffix;

            if (cb)
                cb();

            return;
        }

        var value = min_val + elapsed_total / time * delta;

        if (elem instanceof Array)
            for (var i = 0; i < elem.length; i++)
                elem[i].style[prop] = prefix + value + suffix;
        else
            elem.style[prop] = prefix + value + suffix;

        requestAnimFrame(frame);
    }

    requestAnimFrame(frame);
}

function report_app_error(text_message, link_message, link) {
    circle_container.style.display = "none";
    error_name.innerHTML = text_message;
    error_info.innerHTML = link_message + " <a href=" + link + ">" + link.replace("https://www.", "") + "</a>";
    error_container.style.display = "block";
    logo_container.style.opacity = 1;
    logo_container.style.marginTop = "-90px";
}

});

// to allow early built-in module check
window.addEventListener("load", function() {b4w.require("embed_main").init();}, false);
