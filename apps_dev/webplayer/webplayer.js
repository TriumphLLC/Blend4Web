"use strict";

b4w.register("embed_main", function(exports, require) {

var m_app         = require("app");
var m_camera_anim = require("camera_anim");
var m_cfg         = require("config");
var m_scs         = require("scenes");
var m_data        = require("data");
var m_main        = require("main");
var m_sfx         = require("sfx");
var m_storage     = require("storage");
var m_version     = require("version");

var BUILT_IN_SCRIPTS_ID      = "built_in_scripts";
var DEFAULT_QUALITY          = "HIGH";
var CAMERA_AUTO_ROTATE_SPEED = 0.3;

var HIDE_MENU_DELAY          = 2000;
var ANIM_ELEM_DELAY          = 50;
var LOGO_SHOW_DELAY          = 300;
var LOGO_HIDE_DELAY          = 300;
var LOGO_CIRCLE_HIDE_DELAY   = 300;
var CAPTION_SHOW_DELAY       = 300;
var CAPTION_HIDE_DELAY       = 300;
var MENU_BUTTON_SHOW_DELAY   = 300;
var PRELOADER_HIDE_DELAY     = 300;

var _menu_close_func         = null;
var _is_panel_open_top       = false;
var _is_panel_open_left      = false;
var _is_anim_top             = false;
var _is_anim_left            = false;
var _is_qual_menu_opened     = false;
var _is_help_menu_opened     = false;

var _circle_container;
var _preloader_caption;
var _first_stage;
var _second_stage;
var _third_stage;
var _load_container;
var _preloader_container;
var _opened_button;
var _logo_container;
var _buttons_container;
var _quality_buttons_container;
var _help_info_container;
var _help_button;

var _player_buttons = [
    {type: "simple_button", id: "opened_button", callback: open_menu},

    {type: "simple_button", id: "help_button", callback: open_help},

    {type: "simple_button", id: "close_help", callback: close_help},

    {type:              "trigger_button",
     id:                "fullscreen_on_button",
     callback:          enter_fullscreen,
     replace_button_id: "fullscreen_off_button",
     replace_button_cb: exit_fullscreen},

    {type:              "trigger_button",
     id:                "pause_button",
     callback:          pause_engine,
     replace_button_id: "play_button",
     replace_button_cb: resume_engine},

    {type:              "trigger_button",
     id:                "auto_rotate_on_button",
     callback:          rotate_camera,
     replace_button_id: "auto_rotate_off_button",
     replace_button_cb: stop_camera},

    {type:              "trigger_button",
     id:                "sound_on_button",
     callback:          play_sound,
     replace_button_id: "sound_off_button",
     replace_button_cb: stop_sound},

    {type:                   "menu_button",
     id:                     "quality_buttons_container",
     callback:               open_qual_menu,
     child_buttons_array_id: ["low_mode_button",
                              "high_mode_button",
                              "ultra_mode_button"],
     child_buttons_array_cb: [
                 function(){change_quality(m_cfg.P_LOW)},
                 function(){change_quality(m_cfg.P_HIGH)},
                 function(){change_quality(m_cfg.P_ULTRA)}]}
]


exports.init = function() {
    m_cfg.set("background_color", [0.224, 0.224, 0.224, 1.0]);

    var is_debug = (m_version.type() == "DEBUG");
    var show_fps = false;
    var dds_available = false;
    var min50_available = false;
    var url_params = m_app.get_url_params();

    if (url_params &&"compressed_textures" in url_params &&
            !is_html && !is_debug) {
        dds_available = true;
        min50_available = true;
    }

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
        fps_wrapper_id: "fps_wrapper",
        assets_dds_available: dds_available,
        assets_min50_available: min50_available
    });
}

function init_cb(canvas_element, success) {
    define_dom_elems();

    if (!success) {
        display_no_webgl_bg();
        return;
    }

    m_main.pause();

    add_engine_version();

    check_fullscreen();

    set_quality_button();

    init_control_buttons();

    var file = search_file();

    if (!file)
        return;

    anim_logo(file);

    m_app.enable_controls();

    window.addEventListener("resize", on_resize, false);

    on_resize();
}

function display_no_webgl_bg() {
    var url_params = m_app.get_url_params(true);

    if (url_params && url_params["fallback_image"]) {
        var image_wrapper = document.createElement("div");
        image_wrapper.className = "image_wrapper";
        document.body.appendChild(image_wrapper);
        _preloader_container.style.display = "none";
        image_wrapper.style.backgroundImage = 'url(' + url_params["fallback_image"] + ')';
    } else if (url_params && url_params["fallback_video"]) {
        var video_wrapper = document.createElement("div");
        var video_elem = document.createElement("video");

        video_wrapper.className = "video_wrapper";
        video_wrapper.appendChild(video_elem);

        video_elem.autoplay = true;

        for (var i = 0; i < url_params["fallback_video"].length; i++) {
            var source = document.createElement("source");
            source.src = url_params["fallback_video"][i];

            video_elem.appendChild(source);
        }

        document.body.appendChild(video_wrapper);
        _preloader_container.style.display = "none";
    } else
        report_app_error("Browser could not initialize WebGL", "For more info visit",
                      "https://www.blend4web.com/troubleshooting")
}

function define_dom_elems() {
    _circle_container = document.querySelector("#circle_container");
    _preloader_caption = document.querySelector("#preloader_caption");
    _first_stage = document.querySelector("#first_stage");
    _second_stage = document.querySelector("#second_stage");
    _third_stage = document.querySelector("#third_stage");
    _load_container = document.querySelector("#load_container");
    _preloader_container = document.querySelector("#preloader_container");
    _opened_button = document.querySelector("#opened_button");
    _logo_container = document.querySelector("#logo_container");
    _buttons_container = document.querySelector("#buttons_container");
    _quality_buttons_container = document.querySelector("#quality_buttons_container");
    _help_info_container = document.querySelector("#help_info_container");
    _help_button = document.querySelector("#help_button");
}

function add_engine_version() {
    var version_cont = document.querySelector("#rel_version");
    var version = m_version.version();

    if (version)
        version_cont.innerHTML = m_version.version();
}

function check_fullscreen() {
    var fullscreen_on_button = document.querySelector("#fullscreen_on_button");

    if (!m_app.check_fullscreen())
        fullscreen_on_button.parentElement.removeChild(fullscreen_on_button);
}

function check_autorotate() {
    var autorotate_on_button = document.querySelector("#auto_rotate_on_button");

    if (!m_camera_anim.check_auto_rotate())
        autorotate_on_button.parentElement.removeChild(autorotate_on_button);
}

function set_quality_button() {
    var quality = m_storage.get("quality");

    if (!quality || quality == "CUSTOM") {
        quality = DEFAULT_QUALITY;
        m_storage.set("quality", quality);
    }

    _quality_buttons_container.className = "control_panel_button";

    switch (quality) {
    case "LOW":
        _quality_buttons_container.className = "control_panel_button low_mode_button";
        break;
    case "HIGH":
        _quality_buttons_container.className = "control_panel_button high_mode_button";
        break;
    case "ULTRA":
        _quality_buttons_container.className = "control_panel_button ultra_mode_button";
        break;
    }
}

function init_control_buttons() {
    window.oncontextmenu = function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };

    init_links();

    for (var i = 0; i < _player_buttons.length; i++) {
        var button = _player_buttons[i];

        var elem = document.getElementById(button.id);

        add_hover_class_to_button(elem);

        switch (button.type) {
        case "simple_button":
            if (elem)
                elem.addEventListener("mouseup", button.callback, false);
            break;
        case "menu_button":
            if (elem)
                elem.addEventListener("mouseup", function(e) {
                          button.callback(e, button);
                      }, false);
            break;
        case "trigger_button":
            (function(button){
                if (elem)
                    elem.addEventListener("mouseup", function(e) {
                        button.callback(e);
                    }, false);
            })(button);
            break;
        }
    }
}

function init_links() {
    var button_links = document.querySelectorAll(".control_panel_button a");

    for (var i = 0; i < button_links.length; i++) {
        var link = button_links[i];

        if (link.hasAttribute("href"))
            link.href += document.location.href;

        add_hover_class_to_button(link.parentNode);
    }
}

function search_file() {
    var module_name = m_cfg.get("built_in_module_name");

    if (b4w.module_check(module_name)) {
        var bd = require(module_name);
        var file = bd["data"]["main_file"];

        remove_built_in_scripts();

        return file;
    } else {
        var url_params = m_app.get_url_params();

        _logo_container.style.display = "block";

        if (url_params && url_params["load"]) {
            file = url_params["load"];

            return file;
        }
        else {
            report_app_error("Please specify a scene to load",
                                   "For more info visit",
                                   "https://www.blend4web.com/troubleshooting");
            return null;
        }
    }
}

function anim_logo(file) {
    m_app.css_animate(_logo_container, "opacity", 0, 1, LOGO_SHOW_DELAY, "", "", function() {
        _preloader_caption.style.display = "block";
        m_app.css_animate(_preloader_caption, "opacity", 0, 1, CAPTION_SHOW_DELAY, "", "", function() {
            m_main.resume();
            m_data.load(file, loaded_callback, preloader_callback, false);
        });
    })
}

function open_help() {
    if (is_anim_in_process())
        return;

    if (is_touch())
        _help_info_container.className = "touch";
    else
        _help_info_container.className = "";

    _help_info_container.style.display = "block";
    _help_button.style.display = "none";
    _is_help_menu_opened = true;
}

function close_help(is_cb) {
    if (!_is_help_menu_opened)
        return;

    _help_info_container.style.display = "none";
    _help_button.style.display = "block";
    _is_help_menu_opened = false;
}

function get_button_object_from_id(elem_id) {
    for (var i = 0; i < _player_buttons.length; i++)
        if (_player_buttons[i].id == elem_id)
            return _player_buttons[i];

    return null;
}

function add_hover_class_to_button(elem) {
    if (!elem)
        return;

    if (is_touch()) {
        elem.addEventListener("touchstart", function() {
            elem.className += " hover";
            clear_deffered_close();
        }, false);
        elem.addEventListener("touchend", function() {
            elem.className = elem.className.replace(" hover", "");
            deffered_close();
        }, false);
    } else {
        elem.addEventListener("mouseenter", function() {
            elem.className += " hover";
        }, false);

        elem.addEventListener("mouseout", function(e) {
            elem.className = elem.className.replace(" hover", "");
        }, false);
    }
}

function rotate_camera(e) {
    if (is_anim_in_process())
        return;

    if (e)
        var elem = e.target
    else
        var elem = document.querySelector("#auto_rotate_on_button");

    m_camera_anim.auto_rotate(CAMERA_AUTO_ROTATE_SPEED, function(){
        if (elem)
            update_button(elem);
    });

    if (elem)
        update_button(elem);

    if (m_main.is_paused()) {
        resume_engine();
        update_play_pause_button();
    }
}

function stop_camera(e) {
    if (is_anim_in_process())
        return;

    m_camera_anim.auto_rotate(CAMERA_AUTO_ROTATE_SPEED);

    if (e)
        update_button(e.target);
}

function play_sound(e) {
    if (is_anim_in_process())
        return;

    m_sfx.mute(null, true);
    update_button(e.target);
}

function stop_sound(e) {
    if (is_anim_in_process())
        return;

    m_sfx.mute(null, false);
    update_button(e.target);
}

function pause_engine(e) {
    if (is_anim_in_process())
        return;

    m_main.pause();

    if (e)
        update_button(e.target);

    if (m_camera_anim.is_auto_rotate()) {
        stop_camera();
        update_auto_rotate_button();
    }
}

function resume_engine(e) {
    if (is_anim_in_process())
        return;

    m_main.resume();

    if (e)
        update_button(e.target);
}

function enter_fullscreen(e) {
    if (is_anim_in_process())
        return;

    m_app.request_fullscreen(document.body, fullscreen_cb, fullscreen_cb);
}

function exit_fullscreen() {
    if (is_anim_in_process())
        return;

    m_app.exit_fullscreen();
}

function fullscreen_cb(e) {
    if (!check_cursor_position("buttons_container")) {
        deffered_close();
    }

    var fullscreen_button = document.querySelector("#fullscreen_on_button") ||
                            document.querySelector("#fullscreen_off_button");

    if (fullscreen_button)
        update_button(fullscreen_button);
}

function update_button(elem) {
    var old_elem_id = elem.id;
    var button = get_button_object_from_id(elem.id);
    var old_callback = button.callback;

    elem.id = button.id =  button.replace_button_id;
    button.replace_button_id = old_elem_id;

    if (!check_cursor_position(elem.id))
        elem.className = elem.className.replace(" hover", "");

    button.callback = button.replace_button_cb;
    button.replace_button_cb = old_callback;
}

function update_play_pause_button() {
    var elem = document.querySelector("#play_button") ||
               document.querySelector("#pause_button");

    if (elem)
        update_button(elem);
}

function update_auto_rotate_button() {
    var elem = document.querySelector("#auto_rotate_on_button") ||
               document.querySelector("#auto_rotate_off_button");

    if (elem)
        update_button(elem);
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

function close_menu() {
    if (is_anim_in_process())
        return;

    _buttons_container.removeEventListener("mouseleave", deffered_close);
    _buttons_container.removeEventListener("mouseenter", clear_deffered_close);
    document.body.removeEventListener("touchmove", deffered_close);

    close_qual_menu();

    var hor_elem  = document.querySelector("#help_button");
    var vert_elem = document.querySelector("#tw_button");

    var drop_left = function(elem) {
        _is_anim_left = true;

        m_app.css_animate(elem, "marginRight", 0, -45, ANIM_ELEM_DELAY, "", "px");

        m_app.css_animate(elem, "opacity", 1, 0, ANIM_ELEM_DELAY, "", "", function() {
            if (elem.nextElementSibling && elem.nextElementSibling.id != "opened_button")
                drop_left(elem.nextElementSibling);
            else {
                setTimeout(function() {
                    _is_anim_left = false;
                    _is_panel_open_left = false;
                    check_anim_end();
                }, 100);

                return;
            }
        });
    }

    var drop_top = function(elem) {
        _is_anim_top = true;

        m_app.css_animate(elem, "marginBottom", 0, -45, ANIM_ELEM_DELAY, "", "px");

        m_app.css_animate(elem, "opacity", 1, 0, ANIM_ELEM_DELAY, "", "", function() {
            if (elem.nextElementSibling && elem.nextElementSibling.id != "opened_button")
                drop_top(elem.nextElementSibling);
            else {
                setTimeout(function() {
                    _is_anim_top = false;
                    _is_panel_open_top = false;
                    check_anim_end();
                }, 100);

                return;
            }
        });
    }

    drop_left(hor_elem);
    drop_top(vert_elem);
}

function open_menu() {
    clear_deffered_close();

    if (is_anim_in_process())
        return;

    disable_opened_button();

    if (is_control_panel_opened()) {
        close_menu();
        return;
    }

    var hor_elem = document.querySelector("#fullscreen_on_button") ||
                   document.querySelector("#fullscreen_off_button") ||
                   document.querySelector("#quality_buttons_container");

    var vert_elem = document.querySelector("#vk_button");

    var drop_left = function(elem) {
        _is_anim_left = true;

        elem.style.marginRight = "-45px";

        if (elem.id == "help_button" && _is_help_menu_opened) {
            setTimeout(function() {
                _is_anim_left = false;
                _is_panel_open_left = true;
                check_anim_end();
            }, 100);

            return;
        }

        elem.style.display = "block";

        m_app.css_animate(elem, "marginRight", -45, 0, ANIM_ELEM_DELAY, "", "px", function() {

            if (!elem.previousElementSibling) {
                setTimeout(function() {
                    _is_anim_left = false;
                    _is_panel_open_left = true;
                    check_anim_end();
                }, 100);

                return;
            }

            drop_left(elem.previousElementSibling)
        });

        m_app.css_animate(elem, "opacity", 0, 1, ANIM_ELEM_DELAY, "", "");
    }

    var drop_top = function(elem) {
        _is_anim_top = true;

        elem.style.marginBottom = "-45px";
        elem.style.display = "block";

        m_app.css_animate(elem, "marginBottom", -45, 0, ANIM_ELEM_DELAY, "", "px", function() {

            if (!elem.previousElementSibling) {
                setTimeout(function() {
                    _is_anim_top = false;
                    _is_panel_open_top = true;
                    check_anim_end();
                }, 100);
                return;
            }

            drop_top(elem.previousElementSibling)
        });

        m_app.css_animate(elem, "opacity", 0, 1, ANIM_ELEM_DELAY, "", "");
    }

    drop_left(hor_elem);
    drop_top(vert_elem);

    _buttons_container.addEventListener("mouseleave", deffered_close, false);
    _buttons_container.addEventListener("mouseenter", clear_deffered_close, false);
    document.body.addEventListener("touchmove", deffered_close, false);
}

function check_anim_end() {
    if (!is_anim_in_process()) {
        enable_opened_button();

        if ((!check_cursor_position("buttons_container") &&
                is_control_panel_opened()) ||
                (is_touch() && is_control_panel_opened()))
            deffered_close();
    }
}

function is_touch() {
    return !!(("ontouchstart" in window && !isFinite(navigator.maxTouchPoints))
              || navigator.maxTouchPoints)
}

function is_anim_in_process() {
    return _is_anim_top || _is_anim_left;
}

function is_control_panel_opened() {
    return _is_panel_open_top || _is_panel_open_left;
}

function disable_opened_button() {
    _opened_button.removeEventListener("mouseup", open_menu);
}

function enable_opened_button() {
    _opened_button.addEventListener("mouseup", open_menu, false);
}

function deffered_close(e) {
    if (is_anim_in_process())
        return;

    clear_deffered_close();

    _menu_close_func = setTimeout(close_menu, HIDE_MENU_DELAY);
}

function clear_deffered_close() {
    clearTimeout(_menu_close_func);
}

function close_qual_menu(e) {
    if (is_anim_in_process())
        return;

    if (!_is_qual_menu_opened)
        return;

    _is_qual_menu_opened = false;

    if (e) {
        e.stopPropagation();
        var active_elem = e.target;
    } else
        var active_elem = document.querySelectorAll(".active_elem")[0];

    _quality_buttons_container.style.marginRight = "0px";

    for (var i = 0, child = _quality_buttons_container.children; i < child.length; i++) {
        child[i].style.display = "none";
        child[i].style.opacity = 0;
    }

    _quality_buttons_container.className = "control_panel_button " + active_elem.id;
}

function open_qual_menu(e, button) {
    if (is_anim_in_process())
        return;

    _is_qual_menu_opened = true;

    _quality_buttons_container.style.marginRight = "-30px";

    var child_id = button.child_buttons_array_id;
    var child_cb = button.child_buttons_array_cb;

    for (var i = 0; i < child_id.length; i++) {
        var child_elem = document.getElementById(child_id[i]);

        if (_quality_buttons_container.className.indexOf(child_id[i]) < 0)
            child_elem.addEventListener("mouseup", child_cb[i], false)
        else {
            child_elem.className = "active_elem";
            child_elem.addEventListener("mouseup", close_qual_menu, false)
        }
    }

    _quality_buttons_container.className = "quality_buttons_container";

    for (var i = 0, child = _quality_buttons_container.children; i < child.length; i++) {
        child[i].style.display = "block";
        child[i].style.opacity = 1;
    }
}

function on_resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;

    m_main.resize(w, h);
}

function loaded_callback(data_id, success) {
    if (!success) {
        report_app_error("Could not load the scene",
                "For more info visit",
                "https://www.blend4web.com/troubleshooting");

        return;
    }

    check_autorotate();

    m_app.enable_camera_controls();
    m_main.set_render_callback(render_callback);
    on_resize();

    var url_params = m_app.get_url_params();

    if (url_params && "autorotate" in url_params)
        rotate_camera();

    var meta_tags = m_scs.get_meta_tags();

    if (meta_tags.title)
        document.title = meta_tags.title;
}

function preloader_callback(percentage, load_time) {
    _preloader_caption.innerHTML = percentage + "%";

    if (percentage < 33) {
        _circle_container.style.display = "block";
        _first_stage.style.width = percentage * 4.7 + "px";
        _circle_container.style.webkitTransform = 'rotate('+ (percentage * 3.6 - 503) + 'deg)';
        _circle_container.style.transform = 'rotate('+ (percentage * 3.6 - 503) + 'deg)';
    } else if (percentage < 66) {
        _first_stage.style.width = 142 + "px";
        _second_stage.style.backgroundColor = "#000";
        _second_stage.style.marginTop = "135px";

        if (135 - (percentage - 33) * 4.5 > 0)
            _second_stage.style.marginTop = 135 - (percentage - 33) * 3.5 + "px";

        _circle_container.style.webkitTransform = 'rotate('+ (percentage * 3.6 - 503) + 'deg)';
        _circle_container.style.transform = 'rotate('+ (percentage * 3.6 - 503) + 'deg)';
    } else if (percentage != 100) {
        _second_stage.style.marginTop = "0px";
        _third_stage.style.backgroundColor = "#000";
        _third_stage.style.height = "0px";

        if (percentage > 75)
            _third_stage.style.height = (percentage * 0.1) + "px";

        _circle_container.style.webkitTransform = 'rotate('+ (percentage * 3.6 - 503) + 'deg)';
        _circle_container.style.transform = 'rotate('+ (percentage * 3.6 - 503) + 'deg)';
    }

    if (percentage == 100) {
        if (!m_sfx.check_active_speakers()) {
            var sound_on_button = document.querySelector("#sound_on_button");

            sound_on_button.parentElement.removeChild(sound_on_button);
        }

        _first_stage.parentElement.removeChild(_first_stage)
        _second_stage.parentElement.removeChild(_second_stage)
        _third_stage.parentElement.removeChild(_third_stage)
        _circle_container.parentElement.removeChild(_circle_container)
        _load_container.style.backgroundColor = "#000";

        m_app.css_animate(_preloader_caption, "opacity", 1, 0, CAPTION_HIDE_DELAY, "", "", function() {
            m_app.css_animate(_load_container, "opacity", 1, 0, LOGO_CIRCLE_HIDE_DELAY, "", "", function() {
                m_app.css_animate(_logo_container, "opacity", 1, 0, LOGO_HIDE_DELAY, "", "", function() {
                    m_app.css_animate(_preloader_container, "opacity", 1, 0, PRELOADER_HIDE_DELAY, "", "", function() {
                        _preloader_container.parentElement.removeChild(_preloader_container);
                        open_menu();
                    });
                });
                _opened_button.style.display = "block";
                m_app.css_animate(_opened_button, "transform", 0, 1, MENU_BUTTON_SHOW_DELAY, "scale(", ")");
            });
        });
    }
}

function render_callback(elapsed, current_time) {}

function remove_built_in_scripts() {
    var scripts = document.getElementById(BUILT_IN_SCRIPTS_ID);

    scripts.parentElement.removeChild(scripts);
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

function report_app_error(text_message, link_message, link) {
    var error_name = document.querySelector("#error_name");
    var error_info = document.querySelector("#error_info");
    var error_container = document.querySelector("#error_container");

    _circle_container.style.display = "none";
    error_name.innerHTML = text_message;
    error_info.innerHTML = link_message + " <a href=" + link + ">" + link.replace("https://www.", "") + "</a>";
    error_container.style.display = "block";
    _logo_container.style.opacity = 1;
    _logo_container.style.marginTop = "-90px";
}

});

// to allow early built-in module check
window.addEventListener("load", function() {b4w.require("embed_main").init();}, false);
