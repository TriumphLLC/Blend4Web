import b4w from "blend4web";
import * as locale from "./locale.js";
import style from "../scss/webplayer.scss";

const m_app = b4w.app;
const m_camera_anim = b4w.camera_anim;
const m_camera = b4w.camera;
const m_cfg = b4w.config;
const m_cont = b4w.container;
const m_ctl = b4w.controls;
const m_data = b4w.data;
const m_gp_conf = b4w.gp_conf;
const m_hmd = b4w.hmd;
const m_nla = b4w.nla;
const m_hmd_conf = b4w.hmd_conf;
const m_input = b4w.input;
const m_main = b4w.main;
const m_math = b4w.math;
const m_quat = b4w.quat;
const m_scs = b4w.scenes;
const m_screen = b4w.screen;
const m_sfx = b4w.sfx;
const m_storage = b4w.storage;
const m_trans = b4w.transform;
const m_util = b4w.util;
const m_vec3 = b4w.vec3;
const m_version = b4w.version;
const m_time = b4w.time;

const DEFAULT_LANG = "en";
const BUILT_IN_SCRIPTS_ID = "built_in_scripts";
const DEFAULT_QUALITY = "HIGH";
const DEFAULT_STEREO = "NONE";
const CAMERA_AUTO_ROTATE_SPEED = 0.3;
const CIRCUMFERENCE = 2 * Math.PI * 54;
const DEFAULT_CAM_TYPE = m_camera.MS_STATIC;

const TWITTER_CHAR = "t";
const FB_CHAR = "f";
const GOOGLE_CHAR = "g";
const VK_CHAR = "v";
const WEIBO_CHAR = "w";

let _nla_fps = 24;
let _no_social = false;
let _socials = [];
let _lang = DEFAULT_LANG;

let _preloader_cont;
let _logo_cont;
let _circle;
let _btns_cont;
let _quality_btn;
let _stereo_btn;
let _social_btn;
let _help_cont;
let _help_btn;
let _selected_object;
let _stereo_mode;
let _ctrl_cont;
let _canvas_cont;
let _stereo_menu;
let _social_menu;
let _quality_menu;
let _timeline_cont;
let _ctrl_wrap;

let _vec2_tmp = new Float32Array(2);
let _vec3_tmp = new Float32Array(3);
let _vec3_tmp2 = new Float32Array(3);
let _quat_tmp = new Float32Array(4);

let _is_touch = false;
let _is_down = false;
let _pick = m_scs.pick_object;
let _active_elem = null;
let _active_cb = null;
let _window_width = 0;
let _focus_cb = function () {};
let _blur_cb = function () {};

let _player_btns = [{
        type: "simple_button",
        id: "close_help",
        callback: close_help
    },
    {
        type: "simple_button",
        id: "ru",
        callback: switch_ru
    },
    {
        type: "simple_button",
        id: "en",
        callback: switch_en
    },
    {
        type: "simple_button",
        id: "low",
        callback: change_quality
    },
    {
        type: "simple_button",
        id: "high",
        callback: change_quality
    },
    {
        type: "simple_button",
        id: "ultra",
        callback: change_quality
    },
    {
        type: "simple_button",
        id: "none",
        callback: change_stereo
    },
    {
        type: "simple_button",
        id: "hmd",
        callback: change_stereo
    },
    {
        type: "simple_button",
        id: "anaglyph",
        callback: change_stereo
    },
    {
        type: "simple_button",
        id: "sidebyside",
        callback: change_stereo
    },
    {
        type: "menu_button",
        id: "help_btn",
        callback: open_help
    },
    {
        type: "menu_button",
        id: "soc_btn",
        callback: open_social
    },
    {
        type: "menu_button",
        id: "stereo_btn",
        callback: open_stereo
    },
    {
        type: "menu_button",
        id: "quality_btn",
        callback: open_quality
    },
    {
        type: "trigger_button",
        id: "sound_btn",
        callback: play_sound
    },
    {
        type: "trigger_button",
        id: "play_btn",
        callback: play_engine
    },
    {
        type: "trigger_button",
        id: "fullscreen_btn",
        callback: fullscreen_cb
    },
    {
        type: "trigger_button",
        id: "auto_rotate_btn",
        callback: rotate_camera
    }
]

const LOAD_PARAM_STR = "__ASSETS_LOADING_PATH__";
const PVR_PARAM_STR = "__COMPRESSED_TEXTURES_PVR__";
const DDS_PARAM_STR = "__COMPRESSED_TEXTURES_DDS__";
const FPS_PARAM_STR = "__SHOW_FPS__";
const SOCIAL_PARAM_STR = "__NO_SOCIAL__";
const ALPHA_PARAM_STR = "__ALPHA__";
const MIN_CAP_PARAM_STR = "__MIN_CAPABILITIES__";
const AUTOROTATE_PARAM_STR = "__AUTOROTATE__";
const GZIP_PARAM_STR = "__COMPRESSED_GZIP__";

const _url_params = {
    "load": LOAD_PARAM_STR,
    "compressed_textures_pvr": PVR_PARAM_STR,
    "compressed_textures_dds": DDS_PARAM_STR,
    "show_fps": FPS_PARAM_STR,
    "no_social": SOCIAL_PARAM_STR,
    "alpha": ALPHA_PARAM_STR,
    "min_capabilities": MIN_CAP_PARAM_STR,
    "autorotate": AUTOROTATE_PARAM_STR,
    "compressed_gzip": GZIP_PARAM_STR
};

function switch_ru() {
    let en = document.querySelector("#en");

    en.classList.remove("active");
    this.classList.add("active");

    _lang = "ru";

    switch_lang();
}

function switch_en() {
    let ru = document.querySelector("#ru");

    ru.classList.remove("active");
    this.classList.add("active");

    _lang = "en";

    switch_lang();
}

const init = function () {
    init_help();

    let is_debug = (m_version.type() == "DEBUG");
    let is_html = b4w.module_check(m_cfg.get("built_in_module_name"));

    let url_params = m_app.get_url_params();

    let load = "";

    if (url_params && _url_params["load"] != LOAD_PARAM_STR)
        load = _url_params["load"];
    else
        load = window.location.href;

    let show_fps = _url_params["show_fps"] != FPS_PARAM_STR;
    let allow_cors = check_cors();
    let alpha = _url_params["alpha"] != ALPHA_PARAM_STR;
    let dds_available = _url_params["compressed_textures_dds"] != DDS_PARAM_STR;
    let min_capabilities = _url_params["min_capabilities"] != MIN_CAP_PARAM_STR;
    let pvr_available = _url_params["compressed_textures_pvr"] != PVR_PARAM_STR;
    let gzip_available = _url_params["compressed_gzip"] != GZIP_PARAM_STR;

    _no_social = _url_params["no_social"] != SOCIAL_PARAM_STR;

    let min50_available = false;

    if ((dds_available || pvr_available) && !is_html && !is_debug)
        min50_available = true;

    if (url_params) {
        if (!is_html && !is_debug) {
            if (!dds_available && "compressed_textures" in url_params) {
                min50_available = true;
                dds_available = true;
            }

            if (!pvr_available && "compressed_textures_pvr" in url_params) {
                min50_available = true;
                pvr_available = true;
            }

            if (!gzip_available && "compressed_gzip" in url_params)
                gzip_available = true;
        }

        if (!show_fps && "show_fps" in url_params)
            show_fps = true;

        if (!_no_social && "no_social" in url_params)
            _no_social = true;

        if (!alpha && "alpha" in url_params)
            alpha = true;

        if ("load" in url_params)
            load = url_params["load"];

        if (!min_capabilities && "min_capabilities" in url_params)
            min_capabilities = true;

        if ("socials" in url_params) {
            let socials = url_params["socials"].split("");

            _socials = socials.filter(function (value, index, array) {
                return array.indexOf(value) == index;
            })
        }
    }

    m_storage.init("b4w_webplayer:" + load);

    cache_dom_elems();

    set_quality_config();
    update_quality_menu(m_storage.get("quality"));

    if (!alpha)
        m_cfg.set("background_color", [0.224, 0.224, 0.224, 1.0]);

    // disable physics in HTML version
    m_app.init({
        canvas_container_id: "main_canvas_cont",
        callback: init_cb,
        gl_debug: is_debug,
        physics_enabled: !is_html,
        show_fps: show_fps,
        report_init_failure: false,
        console_verbose: is_debug,
        error_purge_elements: ["control_panel"],
        alpha: alpha,
        allow_cors: allow_cors,
        key_pause_enabled: false,
        fps_elem_id: "fps_cont",
        fps_wrapper_id: "fps_cont",
        assets_pvr_available: pvr_available,
        assets_dds_available: dds_available,
        assets_min50_available: min50_available,
        min_capabilities: min_capabilities,
        assets_gzip_available: gzip_available,
        shaders_path: "../../../shaders/"
    })
}

function init_cb(canvas_element, success) {
    set_stereo_config();
    check_preview_image();

    if (!success) {
        display_no_webgl_bg();

        return;
    }

    _window_width = window.innerWidth;

    m_main.pause();

    add_engine_version();

    fill_tooltips();

    check_touch();

    check_cors();

    check_fullscreen();

    set_quality_btn();

    prevent_context_menu();

    init_ctrl_btns();

    calc_stereo_menu_pos();

    prepare_soc_btns();

    init_links();

    m_gp_conf.update();

    let file = search_file();

    if (!file)
        return;

    anim_logo(file);

    window.addEventListener("resize", on_resize);

    add_keycodes();

    on_resize();
}

function check_cors() {
    let url_params = m_app.get_url_params();

    if (url_params && "allow_cors" in url_params)
        return true;

    return false;
}

function check_touch() {
    _is_touch = "ontouchstart" in window || navigator.maxTouchPoints;
}

function fill_tooltips() {
    let tooltips = document.querySelectorAll(".tooltip");

    for (let i = 0; i < tooltips.length; i++) {
        tooltips[i].innerText = locale.LANG_DICT[tooltips[i].id][_lang];

        let tooltip_offset = tooltips[i].offsetWidth / 2;
        let elem = document.querySelector("#" + locale.LANG_DICT[tooltips[i].id]["elem_id"]);

        if (!elem)
            continue;

        let elem_offset = elem.offsetWidth / 2;
        let elem_offset_left = elem.getBoundingClientRect();
        let offset_left = window.innerWidth - elem_offset_left.right;
        let max_offset_left = window.innerWidth - elem_offset_left.right + elem_offset;

        if (tooltip_offset > max_offset_left)
            tooltips[i].style.right = "0";
        else
            tooltips[i].style.right = (max_offset_left - tooltip_offset) + "px";
    }
}

function check_lang() {
    let url_params = m_app.get_url_params();
    if (url_params) {
        if ("lang" in url_params && (url_params["lang"] == 1 || url_params["lang"] == "ru"))
            _lang = "ru";
    } else
        _lang = "en";

    let device_type = (_is_touch ? "mobile" : "desk");
    let cam_type = "static";
    let cam = m_scs.get_active_camera();

    if (m_camera.is_target_camera(cam))
        cam_type = "target";

    if (m_camera.is_hover_camera(cam))
        cam_type = "hover";

    if (m_camera.is_eye_camera(cam))
        cam_type = "eye";

    let text_string = "#help_body div .wrap." + device_type + "." + cam_type + "." + _lang;

    let help_text = document.querySelector(text_string);
    
    let cam_type_head = document.querySelector(".cam_type");

    cam_type_head.innerText = locale.LANG_DICT["cam_type"][cam_type][_lang];

    help_text.classList.add("active");
}

function switch_lang() {
    let help_text = document.querySelector("#help_cont .wrap.active");
    let device_type = _is_touch ? "mobile" : "desk";
    let cam_type = "static";
    let cam = m_scs.get_active_camera();

    if (m_camera.is_target_camera(cam))
        cam_type = "target";

    if (m_camera.is_hover_camera(cam))
        cam_type = "hover";

    if (m_camera.is_eye_camera(cam))
        cam_type = "eye";

    if (help_text)
        help_text.classList.remove("active");

    help_text = document.querySelector("#help_cont .wrap." + _lang + "." + device_type + "." + cam_type);
    help_text.classList.add("active");

    fill_tooltips();
}

function check_preview_image() {
    let url_params = m_app.get_url_params();

    if (!url_params)
        return;

    let bg = "";

    if ("preview_image" in url_params)
        bg = url_params["preview_image"];
    else
        return;

    _preloader_cont.querySelector("#bg").style.backgroundImage = "url(" + bg + ")";
}

function add_keycodes() {

}

function prepare_soc_btns() {
    if (_no_social) {
        _social_btn.parentNode.remove(_social_btn);

        return;
    }

    let socials = _socials;

    if (!socials.length)
        return;

    const char_btns_array = [TWITTER_CHAR, FB_CHAR, GOOGLE_CHAR, VK_CHAR, WEIBO_CHAR];

    socials = socials.filter(function (value, index, array) {
        return char_btns_array.indexOf(value) >= 0;
    })

    if (!socials.length)
        return;

    const elem_ids = ["tw", "fb", "gplus", "vk", "weibo"];

    let ordered_elem_ids = [];
    let removing_elem_ids = [];

    for (var i = 0; i < socials.length; i++) {
        switch (socials[i]) {
            case TWITTER_CHAR:
                ordered_elem_ids.push("tw");
                break;
            case FB_CHAR:
                ordered_elem_ids.push("fb");
                break;
            case GOOGLE_CHAR:
                ordered_elem_ids.push("gplus");
                break;
            case VK_CHAR:
                ordered_elem_ids.push("vk");
                break;
            case WEIBO_CHAR:
                ordered_elem_ids.push("weibo");
                break;
        }
    }

    for (var i = 0; i < elem_ids.length; i++)
        if (ordered_elem_ids.indexOf(elem_ids[i]) < 0)
            removing_elem_ids.push(elem_ids[i])

    for (var i = 0; i < removing_elem_ids.length; i++) {
        let elem = document.getElementById(removing_elem_ids[i]);

        elem.parentElement.removeChild(elem);
    }

    let children = _social_menu.children;
    let ar = [];

    if (children.length > 5) {
        _social_menu.classList.remove("short");
        _social_menu.classList.add("long");
    } else {
        _social_menu.classList.remove("long");
        _social_menu.classList.add("short");
    }

    ar.slice.call(children).sort(function (a, b) {
        return ordered_elem_ids.indexOf(a.id) - ordered_elem_ids.indexOf(b.id);
    }).forEach(function (next) {
        _social_menu.appendChild(next);
    })
}

function display_no_webgl_bg() {
    const url_params = m_app.get_url_params(true);

    if (url_params && url_params["fallback_image"]) {
        const image_wrapper = document.createElement("div");

        image_wrapper.className = "image_wrapper";
        image_wrapper.style.backgroundImage = "url(" + url_params["fallback_image"] + ")";

        _preloader_cont.style.display = "none";
        document.body.appendChild(image_wrapper);
    } else if (url_params && url_params["fallback_video"]) {
        const video_wrapper = document.createElement("div");
        const video_elem = document.createElement("video");

        video_wrapper.className = "video_wrapper";
        video_elem.autoplay = true;

        for (let i = 0; i < url_params["fallback_video"].length; i++) {
            const source = document.createElement("source");
            source.src = url_params["fallback_video"][i];

            video_elem.appendChild(source);
        }

        video_wrapper.appendChild(video_elem);

        _preloader_cont.style.display = "none";

        document.body.appendChild(video_wrapper);
    } else
        show_error("Browser could not initialize WebGL", "For more info visit",
            "https://www.blend4web.com/doc/en/problems_and_solutions.html#problems-upon-startup");
}

function cache_dom_elems() {
    _preloader_cont = document.querySelector("#preloader_cont");
    _canvas_cont = document.querySelector("#main_canvas_cont");
    _logo_cont = document.querySelector("#logo_cont");
    _ctrl_cont = document.querySelector("#ctrl_cont");
    _timeline_cont = document.querySelector("#timeline_cont");
    _circle = _logo_cont.querySelector("circle");
    _btns_cont = document.querySelector("#btns_cont");
    _quality_btn = document.querySelector("#quality_btn");
    _stereo_btn = document.querySelector("#stereo_btn");
    _social_btn = document.querySelector("#soc_btn");
    _social_menu = document.querySelector("#social");
    _stereo_menu = document.querySelector("#stereo");
    _quality_menu = document.querySelector("#quality");
    _help_cont = document.querySelector("#help_cont");
    _help_btn = document.querySelector("#help_btn");
    _ctrl_wrap = document.querySelector("#ctrl_wrap");

    _circle.style["strokeDasharray"] = CIRCUMFERENCE;
    _circle.style["strokeDashoffset"] = CIRCUMFERENCE;
    _circle.setAttribute("transform", _circle.getAttribute("transform"));
}

function add_engine_version() {
    const version = m_version.version_str();

    if (version) {
        let version_cont = document.querySelector("#rel_version");

        version_cont.innerHTML = m_version.version_str();
    }
}

function check_fullscreen() {
    let fullscreen_btn = document.querySelector("#fullscreen_btn");

    if (!m_screen.check_fullscreen() && !m_screen.check_fullscreen_hmd())
        fullscreen_btn.parentElement.removeChild(fullscreen_btn);
}

function check_autorotate() {
    let autorotate_on_button = document.querySelector("#auto_rotate_btn");

    if (!m_camera_anim.check_auto_rotate())
        autorotate_on_button.parentElement.removeChild(autorotate_on_button);
}

function set_quality_btn() {
    let quality = m_storage.get("quality") || DEFAULT_QUALITY;

    if (quality == "CUSTOM") {
        quality = DEFAULT_QUALITY;
        m_storage.set("quality", quality);
    }

    let menu_elem = document.querySelector("#quality #" + quality.toLowerCase());

    menu_elem.classList.add("activated");
    // menu_elem.parentNode.removeChild(menu_elem);

    switch (quality) {
        case "LOW":
            _quality_btn.classList.add("low");
            break;
        case "HIGH":
            _quality_btn.classList.add("high");
            break;
        case "ULTRA":
            _quality_btn.classList.add("ultra");
            break;
    }
}

function render_mode_to_id(mode) {
    switch (mode) {
        case "ANAGLYPH":
            return "anaglyph";
            break;
        case "SIDEBYSIDE":
            return "sidebyside";
            break;
        case "HMD":
            return "hmd";
            break;
        case "NONE":
            return "none";
            break;
    }
}

function update_mode_menu(stereo) {
    let main_stereo_items = _stereo_menu.querySelectorAll(".item");

    for (let i = 0; i < main_stereo_items.length; i++) {
        let item = main_stereo_items[i];
        item.classList.remove("activated");
        if (item.id == render_mode_to_id(stereo))
            item.classList.add("activated");
    }

    check_hmd();

    // update stereo_btn icon
    _stereo_btn.classList.remove("none", "anaglyph", "sidebyside", "hmd");
    _stereo_btn.classList.add(render_mode_to_id(stereo));
}

function update_quality_menu(quality) {
    _quality_btn.classList.remove("low", "high", "ultra");
    _stereo_btn.classList.add(quality.toLowerCase());
}

function prevent_context_menu() {
    window.oncontextmenu = function (e) {
        e.preventDefault();
        e.stopPropagation();

        return false;
    }
}

function calc_menu_pos(btn, menu) {
    let items = menu.querySelectorAll(".item");

    let max = 0;

    for (let i = 0; i < items.length; i++) {
        var item = items[i];
        if (item.classList.contains("disabled"))
            continue;

        let w = item.querySelector("div").getBoundingClientRect().width +
        item.querySelector("svg").getBoundingClientRect().width;

        if (w > max)
            max = w;
    }

    max = max + 24;

    let rect = btn.getBoundingClientRect();
    let btn_right = window.innerWidth - rect.right + rect.width;

    if (btn_right >= (max + 16))
        menu.style.right = Math.ceil(btn_right - max) + "px";
    else
        menu.style.right = "16px";

    menu.style.width = Math.ceil(max) + "px";
}

function calc_stereo_menu_pos() {
    calc_menu_pos(_stereo_btn, _stereo_menu);
}

function calc_quality_menu_pos() {
    calc_menu_pos(_quality_btn, _quality_menu);
}

function init_ctrl_btns() {
    let mousedown_event = _is_touch ? "touchstart" : "mousedown";
    let mouseup_event = _is_touch ? "touchend" : "mouseup";
    let mousemove_event = _is_touch ? "touchmove" : "mousemove";

    for (let i = 0; i < _player_btns.length; i++) {
        let button = _player_btns[i];
        let elem = document.getElementById(button.id);

        if (!elem)
            continue;

        elem.addEventListener(mousedown_event, function () {
            if (!this.classList.contains("hover"))
                this.classList.add("hover");
        });

        elem.addEventListener(mouseup_event, function () {
            setTimeout(() => {
                if (this.classList.contains("hover"))
                this.classList.remove("hover");
            }, 20);
        });

        elem.addEventListener("mouseenter", function () {
            if (!this.classList.contains("hover"))
                this.classList.add("hover");
        });

        elem.addEventListener("mouseleave", function () {
            if (this.classList.contains("hover"))
                this.classList.remove("hover");
        });

        switch (button.type) {
            case "menu_button":
                elem.addEventListener("click", function () {
                    show_hide_menu(elem, button.callback);
                })
                break;
            case "simple_button":
                elem.addEventListener(mouseup_event, button.callback);
            case "trigger_button":
                elem.addEventListener(mouseup_event, button.callback);
                elem.addEventListener("mouseenter", function () {

                });

                elem.addEventListener("mouseenter", function () {

                });
        }
    }

    let timeout = null;
    let init_x, init_y, final_x, final_y;

    _canvas_cont.addEventListener(mousedown_event, function (e) {
        _is_down = true;
        init_x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        init_y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;

        window.addEventListener(mousemove_event, on_mousemove); 
        if (_ctrl_cont.parentNode.parentNode.classList.contains("ctrl_active")) {
            _ctrl_cont.parentNode.parentNode.classList.remove("active","ctrl_active");
        }
    });

    window.addEventListener(mouseup_event, function () {
        if (_is_down && (_stereo_mode == "HMD" || _stereo_mode == "SIDEBYSIDE") ) {     
            hide_active_elems();
            window.removeEventListener(mousemove_event, on_mousemove);
            
        } else if (_is_down && !(_stereo_mode == "HMD" || _stereo_mode == "SIDEBYSIDE") ) {
            clearTimeout(timeout);
            _is_down = false;
            _ctrl_cont.parentNode.parentNode.classList.add("active");
            window.removeEventListener(mousemove_event, on_mousemove);
        }
    });

    function on_mousemove(e)  {
        final_x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        final_y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
        let x_abs = Math.abs(init_x - final_x);
        let y_abs = Math.abs(init_y - final_y);

        if (x_abs > 20 || y_abs > 20) {
            if (_stereo_mode == "HMD" || _stereo_mode == "SIDEBYSIDE") {
                clearTimeout(timeout);
                _ctrl_cont.parentNode.parentNode.classList.add("active", "ctrl_active");               
            } else {
                hide_active_elems();
                _ctrl_cont.parentNode.parentNode.classList.remove("active");
            }
        }
    }
}

function search_file() {
    let module_name = m_cfg.get("built_in_module_name");
    let file = "";

    if (b4w.module_check(module_name)) {
        let bd = b4w.require(module_name);
        file = bd["data"]["main_file"];

        remove_built_in_scripts();

        return file;
    } else {
        let url_params = m_app.get_url_params();

        if (url_params && url_params["load"]) {
            file = url_params["load"];

            return file;
        } else if (url_params && _url_params["load"] && _url_params["load"] != "__ASSETS_LOADING_PATH__") {
            file = _url_params["load"];

            return file;
        } else {
            show_error("Please specify a scene to load",
                "For more info visit",
                "https://www.blend4web.com/doc/en/web_player.html#scene-errors");
            return null;
        }
    }
}

function anim_logo(file) {
    _logo_cont.classList.add("active");

    setTimeout(function () {
        m_main.resume();
        m_data.load(file, loaded_callback, preloader_callback, false);
    }, 800);
}

function show_hide_menu(elem, cb) {
    let active = elem.classList.contains("active");
    hide_active_elems();
    _social_menu.classList.remove("active");
    _stereo_menu.classList.remove("active");
    _quality_menu.classList.remove("active");

    if (!active) {
        cb();
        elem.classList.add("active");
        elem.classList.add("manual_hover");
    } else {
        elem.classList.remove("manual_hover");
    }
}

function hide_active_elems() {
    let btns = document.querySelectorAll(".ctrl_btn");
    _social_menu.classList.remove("active");
    _stereo_menu.classList.remove("active");
    _quality_menu.classList.remove("active");

    for (let i = 0; i < btns.length; i++)
        btns[i].classList.remove("active", "manual_hover", "hover");
}

function hide_menu(menu_elem) {
    menu_elem.classList.remove("active");
}

function btn_on(btn) {
    btn.classList.add("active");
}

function btn_off(btn) {
    btn.classList.remove("active");
}

function open_help() {
    _help_cont.classList.toggle("active");
    init_swipe();
}

function close_help() {
    _help_btn.classList.remove("active", "hover", "manual_hover");
    _help_cont.classList.remove("active");
}

function rotate_camera() {
    let rotate_btn = document.querySelector("#auto_rotate_btn");
    let is_rotate = rotate_btn.classList.contains("on");

    let tooltip_on = document.querySelector("#autorotate_on_tooltip");
    let tooltip_off = document.querySelector("#autorotate_off_tooltip");

    let timeout;

    if (!is_rotate) {
        if (m_main.is_paused()) {
            let play_btn = document.querySelector("#play_btn");
            play_btn.classList.add("on");
            play_btn.classList.remove("off");
            m_main.resume();
        }
    }

    rotate_btn.classList.toggle("on");

    m_camera_anim.auto_rotate(CAMERA_AUTO_ROTATE_SPEED, function () {
            let rotate_btn = document.querySelector("#auto_rotate_btn");
            let is_rotate = rotate_btn.classList.contains("on");
            if (is_rotate) {
                rotate_btn.classList.toggle("on");  
            }    
        });
        
    if (is_rotate) {
        tooltip_off.classList.add("active");
        clearTimeout(timeout);
        timeout = setTimeout(function () {
            tooltip_off.classList.remove("active");
        }, 400)
        tooltip_on.classList.remove("active");
    } else {
        tooltip_on.classList.add("active");
        clearTimeout(timeout);
        timeout = setTimeout(function () {
            tooltip_on.classList.remove("active");
        }, 400)
        tooltip_off.classList.remove("active");
    }
}

function play_sound() {
    let tooltip_on = document.querySelector("#sound_on_tooltip");
    let tooltip_off = document.querySelector("#sound_off_tooltip");

    let timeout;

    if (m_sfx.is_muted()) {
        m_sfx.mute(null, false);
        this.classList.add("on");
        this.classList.remove("off");

        tooltip_on.classList.add("active");
        clearTimeout(timeout);
        timeout = setTimeout(function () {
            tooltip_on.classList.remove("active");
        }, 400)
        tooltip_off.classList.remove("active");
    } else {
        m_sfx.mute(null, true);
        this.classList.add("off");
        this.classList.remove("on");

        tooltip_off.classList.add("active");
        clearTimeout(timeout);
        timeout = setTimeout(function () {
            tooltip_off.classList.remove("active");
        }, 400)
        tooltip_on.classList.remove("active");
    }
}

function play_engine() {
    let tooltip_on = document.querySelector("#play_tooltip");
    let tooltip_off = document.querySelector("#pause_tooltip");
    let timeline_cont = document.querySelector("#timeline_cont");
    let timeline_bar = timeline_cont.querySelector("#line");
    let cur_frame = m_nla.get_frame();
    let start_frame = m_nla.get_frame_start();
    let end_frame = m_nla.get_frame_end();
    let nla_frame_length = end_frame - start_frame;
    let cur_frame_in_percent = cur_frame * 100 / nla_frame_length;

    if (cur_frame_in_percent < 0)
        cur_frame_in_percent = 0;

    if (cur_frame_in_percent > 100)
        cur_frame_in_percent = 100;

    timeline_bar.style.transition = "none";
    timeline_bar.style.width = cur_frame_in_percent + "%";
    timeline_bar.innerText;

    let timeout;

    if (m_main.is_paused()) {
        let cur_sec = cur_frame / _nla_fps;
        let nla_sec_lenght = nla_frame_length / _nla_fps;
        let nla_left_sec = nla_sec_lenght - cur_sec;

        timeline_bar.style.transition = "width " + nla_left_sec + "s linear";
        timeline_bar.innerText;
        timeline_bar.style.width = "100%";

        m_main.resume();

        this.classList.add("on");
        this.classList.remove("off");

        tooltip_on.classList.add("active");
        clearTimeout(timeout);
        timeout = setTimeout(function () {
            tooltip_on.classList.remove("active");
        }, 400)
        tooltip_off.classList.remove("active");

    } else {
        let rotate_btn = document.querySelector("#auto_rotate_btn");
        let is_rotate;

        if (rotate_btn)
            is_rotate = rotate_btn.classList.contains("on");

        if (is_rotate && rotate_btn) {
            m_camera_anim.auto_rotate(CAMERA_AUTO_ROTATE_SPEED);
            rotate_btn.classList.remove("on");
        }

        m_main.pause();

        this.classList.add("off");
        this.classList.remove("on");

        tooltip_off.classList.add("active");
        clearTimeout(timeout);
        timeout = setTimeout(function () {
            tooltip_off.classList.remove("active");
        }, 400);
        tooltip_on.classList.remove("active");
    }
}

function enter_fullscreen() {
    let elem = document.querySelector("#fullscreen_btn");

    elem.classList.add("on");
}

function fullscreen_cb() {
    let elem = document.querySelector("#fullscreen_btn");
    let is_fs = elem.classList.contains("on");
    const is_hmd = m_screen.check_fullscreen_hmd();
    let exec_method = function () {};

    if (is_hmd) {
        if (is_fs)
            exec_method = m_screen.exit_fullscreen_hmd;
        else
            exec_method = m_screen.request_fullscreen_hmd;
    } else {
        if (is_fs)
            exec_method = m_screen.exit_fullscreen;
        else
            exec_method = m_screen.request_fullscreen;
    }

    exec_method(document.body, enter_fullscreen, exit_fullscreen);
}

function exit_fullscreen() {
    let elem = document.querySelector("#fullscreen_btn");

    elem.classList.remove("on");
}

function on_resize() {
    m_cont.resize_to_container();
    _window_width = window.innerWidth;
}

function get_selected_object() {
    return _selected_object;
}

function set_selected_object(obj) {
    _selected_object = obj;
}

function mouse_cb() {
    if (!m_scs.can_select_objects())
        return;

    const canvas_elem = m_cont.get_canvas();
    const mdevice = m_input.get_device_by_type_element(m_input.DEVICE_MOUSE, canvas_elem);
    let loc = m_input.get_vector_param(mdevice, m_input.MOUSE_LOCATION, _vec2_tmp);
    main_canvas_clicked(loc[0], loc[1]);
}

function touch_cb(touches) {
    if (!m_scs.can_select_objects())
        return;

    for (var i = 0; i < touches.length; i++)
        main_canvas_clicked(touches[i].clientX, touches[i].clientY);
}

function register_canvas_click() {
    const canvas_elem = m_cont.get_canvas();
    const mdevice = m_input.get_device_by_type_element(m_input.DEVICE_MOUSE, canvas_elem);
    const tdevice = m_input.get_device_by_type_element(m_input.DEVICE_TOUCH, canvas_elem);

    if (mdevice)
        m_input.attach_param_cb(mdevice, m_input.MOUSE_DOWN_WHICH, mouse_cb);

    if (tdevice)
        m_input.attach_param_cb(tdevice, m_input.TOUCH_START, touch_cb);
}

function main_canvas_clicked(x, y) {
    let prev_obj = get_selected_object();

    if (prev_obj && m_scs.outlining_is_enabled(prev_obj) && prev_obj.render.outline_on_select)
        m_scs.clear_outline_anim(prev_obj);

    let obj = _pick(x, y);
    set_selected_object(obj);
}

function check_nla() {
    if (!m_nla.check_nla() || m_nla.check_logic_nodes()) {
        if (!_ctrl_wrap.classList.contains("no_timer")) _ctrl_wrap.classList.add("no_timer");
        return;
    }
        
    let mousedown_event = _is_touch ? "touchstart" : "mousedown";
    let mouseup_event = _is_touch ? "touchend" : "mouseup";
    let mousemove_event = _is_touch ? "touchmove" : "mousemove";

    m_nla.stop();

    let timeline_cont = document.querySelector("#timeline_cont");
    let time_cont = document.querySelector("#time_cont");
    let timer = document.querySelector("#timer");
    let timeline_bar = timeline_cont.querySelector("#line");

    let start_frame = m_nla.get_frame_start();
    let end_frame = m_nla.get_frame_end();
    let nla_frame_length = end_frame - start_frame;
    let nla_sec_lenght = nla_frame_length / _nla_fps;
    let tmp_delta_time = 0;
    let tmp_width = 0;
    let ms = nla_sec_lenght % 1 * 100;
    let m = Math.floor(nla_sec_lenght / 60);
    let s = 0;

    timeline_cont.style.display = "block";
    timeline_cont.classList.add("active");

    m_main.set_render_callback(function (e) {
        let cur_frame = m_nla.get_frame();
        time_cont.innerText = get_str_time(cur_frame) + " / " + get_str_time(end_frame);
    })

    function get_str_time(cur_frame) {
        if (cur_frame < 0)
            return "00 : 00";

        let cur_sec = cur_frame / _nla_fps;
        let m = Math.floor(cur_sec / 60);
        let s = cur_sec - m * 60;
        let ms = cur_sec % 1 * 100;

        let str = "";

        if (m) {
            if (m > 9)
                str += m.toFixed(0) + " : ";
            else
                str += "0" + m.toFixed(0) + " : ";
        }

        if (s) {
            if (s > 9)
                str += s.toFixed(0) + " : ";
            else
                str += "0" + s.toFixed(0) + " : ";
        }

        if (ms) {
            if (ms > 9)
                str += ms.toFixed(0);
            else
                str += "0" + ms.toFixed(0);
        }

        if (str)
            return str;

        return "00 : 00";
    }

    timeline_cont.addEventListener(mousedown_event, on_mousedown);

    document.addEventListener("visibilitychange", on_visibilitychange);

    function on_visibilitychange(e) {
        if (!document.hidden)
            on_focus();
    }

    function on_focus() {
        if (m_main.is_paused())
            return;

        let cur_frame = m_nla.get_frame();
        let cur_frame_in_percent = cur_frame * 100 / nla_frame_length;

        if (cur_frame_in_percent < 0)
            cur_frame_in_percent = 0;

        if (cur_frame_in_percent > 100)
            cur_frame_in_percent = 100;

        let cur_sec = cur_frame / _nla_fps;
        let nla_left_sec = nla_sec_lenght - cur_sec;

        timeline_bar.style.width = cur_frame_in_percent + "%";
        timeline_bar.innerText;
        timeline_bar.style.transition = "width " + nla_left_sec + "s linear";
        timeline_bar.style.width = "100%";
    }

    function on_mouseup(e) {
        if (m_main.is_paused())
            return;

        let x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        window.removeEventListener(mousemove_event, on_mousemove);

        let cur_frame_in_percent = x / _window_width * 100;

        if (cur_frame_in_percent < 0)
            cur_frame_in_percent = 0;

        if (cur_frame_in_percent > 100)
            cur_frame_in_percent = 100;

        let cur_frame = cur_frame_in_percent * nla_frame_length / 100;
        let cur_sec = cur_frame / _nla_fps;
        let nla_left_sec = nla_sec_lenght - cur_sec;

        m_nla.set_frame(cur_frame);
        timeline_bar.style.transition = "width " + nla_left_sec + "s linear";
        timeline_bar.style.width = "100%";
        timer.style.display = "none";
        timeline_bar.classList.remove('inactive-pointer');

        window.removeEventListener(mouseup_event, on_mouseup);

        m_nla.set_frame(cur_frame);
        play_nla();
    }

    function on_mousedown(e) {
        if (m_main.is_paused())
            return;

        let x = e.touches ? e.touches[0].clientX : e.clientX;

        m_nla.stop();
        timeline_bar.style.transition = "none";

        window.addEventListener(mousemove_event, on_mousemove);
        window.addEventListener(mouseup_event, on_mouseup);

        let cur_frame_in_percent = x / _window_width * 100;

        if (cur_frame_in_percent < 0)
            cur_frame_in_percent = 0;

        if (cur_frame_in_percent > 100)
            cur_frame_in_percent = 100;

        let cur_frame = cur_frame_in_percent * nla_frame_length / 100;

        m_nla.set_frame(cur_frame);
        timeline_bar.style.width = cur_frame_in_percent + "%";
        timer.style.left = cur_frame_in_percent + "%";
        timer.innerText = get_str_time(cur_frame);

        if (x - 4 <= timer.getBoundingClientRect().width)
            timer.classList.add("rotated");
        else
            timer.classList.remove("rotated");

        timer.style.display = "block";
        timeline_bar.classList.add('inactive-pointer');
    }

    function on_mousemove(e) {
        let x = e.touches ? e.touches[0].clientX : e.clientX;
        timeline_bar.style.transition = "none";

        let cur_frame_in_percent = x / _window_width * 100;

        if (cur_frame_in_percent < 0)
            cur_frame_in_percent = 0;

        if (cur_frame_in_percent > 100)
            cur_frame_in_percent = 100;

        let cur_frame = cur_frame_in_percent * nla_frame_length / 100;
        let cur_sec = cur_frame / _nla_fps;

        m_nla.set_frame(cur_frame);
        timeline_bar.style.width = cur_frame_in_percent + "%";
        timer.innerText = get_str_time(cur_frame);
        timer.style.left = cur_frame_in_percent + "%";

        if (x - 4 <= timer.getBoundingClientRect().width)
            timer.classList.add("rotated");
        else
            timer.classList.remove("rotated");
    }

    function reset_nla() {
        timeline_bar.style.width = "0%";
        timeline_bar.style.transition = "none";
        m_nla.stop();
        m_nla.set_frame(start_frame);
    }

    function start_bar_anim() {
        timeline_bar.innerText;
        timeline_bar.style.transition = "width " + nla_sec_lenght + "s linear";
        timeline_bar.style.width = "100%";

        play_nla();
    }

    function play_nla() {
        m_nla.play(function () {
            reset_nla();
            start_bar_anim();
        });
    }

    start_bar_anim();
}

function loaded_callback(data_id, success) {
    if (!success) {
        show_error("Could not load the scene",
            "For more info visit",
            "https://www.blend4web.com/doc/en/web_player.html#scene-errors");

        return;
    }

    _nla_fps = m_time.get_framerate();

    check_lang();

    register_canvas_click();
    check_autorotate();
    check_nla();

    m_app.enable_camera_controls(false, false, false, null, true);

    var mouse_move = m_ctl.create_mouse_move_sensor();
    var mouse_click = m_ctl.create_mouse_click_sensor();

    var canvas_cont = m_cont.get_container();

    function move_cb() {
        canvas_cont.className = "move";
    }

    function stop_cb(obj, id, pulse) {
        if (pulse == -1)
            canvas_cont.className = "";
    }

    m_ctl.create_sensor_manifold(null, "MOUSE_MOVE", m_ctl.CT_SHOT, [mouse_click, mouse_move], function (s) {
        return s[0] && s[1]
    }, move_cb);

    m_ctl.create_sensor_manifold(null, "MOUSE_STOP", m_ctl.CT_TRIGGER, [mouse_click], function (s) {
        return s[0]
    }, stop_cb);

    var url_params = m_app.get_url_params();

    if (url_params && "autorotate" in url_params ||
        _url_params["autorotate"] != AUTOROTATE_PARAM_STR)
        rotate_camera();

    var meta_tags = m_scs.get_meta_tags();

    if (meta_tags.title)
        document.title = meta_tags.title;

    check_hmd();
    if (_stereo_mode == "HMD")
        set_hmd()
}

function check_hmd() {
    let hmd_mode_button = document.querySelector("#hmd");

    if (!m_input.can_use_device(m_input.DEVICE_HMD)) {
        hmd_mode_button.classList.add("disabled");
        m_input.remove_click_listener(hmd_mode_button, change_stereo);
    }
}

function preloader_callback(percentage, load_time) {
    let dashoffset = CIRCUMFERENCE * (1 - percentage / 100);
    _circle.style["strokeDashoffset"] = dashoffset;

    if (percentage == 100) {
        if (!m_sfx.get_speaker_objects().length) {
            let sound_btn = document.querySelector("#sound_btn");

            sound_btn.parentElement.removeChild(sound_btn);
        }

        _logo_cont.classList.remove("active");
        _preloader_cont.classList.remove("active");
        setTimeout(function () {
            if(_stereo_mode !== "HMD" && _stereo_mode !== "SIDEBYSIDE")
                _ctrl_cont.parentNode.parentNode.classList.add("active");
            _preloader_cont.parentNode.removeChild(_preloader_cont);
        }, 1200)
    }
}

function extend_objs_props(objs, common_obj) {
    for (var i = objs.length; i--;)
        for (var prop in common_obj)
            objs[i][prop] = common_obj[prop];
}

function remove_built_in_scripts() {
    let scripts = document.getElementById(BUILT_IN_SCRIPTS_ID);

    scripts.parentElement.removeChild(scripts);
}

function change_quality() {
    if (this.classList.contains("activated"))
        return;
    let qual = this.id.toUpperCase();
    let cur_quality = m_cfg.get("quality");

    if (cur_quality == qual)
        return;

    m_storage.set("quality", qual);

    reload_app();
}

function set_hmd() {
    if (m_input.can_use_device(m_input.DEVICE_HMD))
        m_hmd_conf.update();
    if (m_camera_anim.is_auto_rotate()) {
        rotate_camera();
        update_auto_rotate_button();
    }

    var cam = m_scs.get_active_camera();
    var pos = m_trans.get_translation(cam, _vec3_tmp);
    var quat = m_trans.get_rotation(cam, _quat_tmp);
    var new_x = m_vec3.transformQuat(m_util.AXIS_X, quat, _vec3_tmp2);
    new_x[2] = 0;
    m_vec3.normalize(new_x, new_x);
    var offset_quat = m_quat.rotationTo(m_util.AXIS_X, new_x, _quat_tmp);
    m_hmd.set_position(pos);
    m_hmd.set_rotate_quat(offset_quat);

    m_hmd.enable_hmd(m_hmd.HMD_ALL_AXES_MOUSE_NONE);

    _pick = m_scs.pick_center;
    // Check if app is in fullscreen mode.
    let in_fullscreen = document.querySelector("#fullscreen.on");

    if (!in_fullscreen)
        fullscreen_cb();
    _ctrl_cont.parentNode.parentNode.classList.remove("active");
}

function change_stereo() {
    if (this.classList.contains("activated"))
        return;

    let stereo = this.id.toUpperCase();
    let reload = false;
    switch (stereo) {
        case "NONE":
            m_storage.set("stereo", "NONE");
            if (_stereo_mode == "ANAGLYPH" || _stereo_mode == "SIDEBYSIDE")
                reload = true;
            else {
                m_hmd.disable_hmd();
                _pick = m_scs.pick_object;
            }
            break;
        case "ANAGLYPH":
            m_storage.set("stereo", "ANAGLYPH");
            reload = true;
            break;
        case "SIDEBYSIDE":
            m_storage.set("stereo", "SIDEBYSIDE");
            reload = true;
            _ctrl_cont.parentNode.parentNode.classList.remove("active");
            break;
        case "HMD":
            m_storage.set("stereo", "HMD");
            if (_stereo_mode == "NONE") {
                set_hmd();
            } else {
                // m_storage.set("stereo", "NONE");
                reload = true;
            }

            break;
    }
    document.getElementById("stereo").classList.remove("active");
    if (reload) {
        reload_app();
    } else {
        update_mode_menu(stereo);
    }

    _stereo_mode = stereo;
}

function reload_app() {
    setTimeout(function () {
        window.location.reload();
    }, 100);
}

function set_quality_config() {
    let quality = m_storage.get("quality");

    if (!quality || quality == "CUSTOM") {
        quality = DEFAULT_QUALITY;
        m_storage.set("quality", quality);
    }

    let qual = m_cfg.P_LOW;

    switch (quality) {
        case "HIGH":
            qual = m_cfg.P_HIGH;
            break;
        case "ULTRA":
            qual = m_cfg.P_ULTRA;
            break;
    }

    m_cfg.set("quality", qual);
}

function open_social() {
    _social_menu.classList.add("active");
}

function open_stereo() {
    calc_stereo_menu_pos();

    _stereo_menu.classList.toggle("active");
    _stereo_btn.classList.toggle("active");

    _active_cb = open_stereo;
}

function open_quality(is_elem) {
    calc_quality_menu_pos();

    _quality_menu.classList.toggle("active");
    _quality_btn.classList.toggle("active");

    _active_cb = open_quality;
}

function set_stereo_config() {
    let stereo = m_storage.get("stereo") || DEFAULT_STEREO;

    _stereo_mode = stereo;

    // updating menu before HMD detection
    update_mode_menu(stereo);

    if (stereo == "NONE" && m_input.can_use_device(m_input.DEVICE_HMD))
        stereo = "HMD";

    m_cfg.set("stereo", stereo);
}

function create_help_structure(help_desc, device_type, lang) {
    let help_body = document.createElement("div");
    for (let key in help_desc) {
        let wrap = document.createElement("div");
        help_body.appendChild(wrap);
        wrap.classList.add("wrap");
        wrap.classList.add(device_type);
        wrap.classList.add(key);
        wrap.classList.add(lang);
        let ul = document.createElement("ul");
        wrap.appendChild(ul);
        for (let i = 0; i < help_desc[key].length; i++) {
            let li = document.createElement("li");
            ul.appendChild(li);
            let id = help_desc[key][i];
            let title = "t" in locale.HELP_DICT[device_type][id] ? locale.HELP_DICT[device_type][id]["t"][lang]: "";
            let help_entry = (new DOMParser())
            .parseFromString(
                "<div> \
                    <h3>" + title + "</h3>\
                    <div> \
                    </div> \
                    <div> \
                        <p>" + locale.HELP_DICT[device_type][id][lang] + "</p> \
                    </div> \
                </div>", 'text/html')
            .body.childNodes[0];
            
            help_entry.id = id;
            help_entry.classList.add("help_entry");
            li.appendChild(help_entry);
        }
    }
    return help_body;
}

function init_help() {    
    let languages = ["ru", "en"];
    let help_desktop_description = {
        "hover": [ "help_hover_rotate", "help_hover_lean", "help_hover_move", "help_hover_interact" ],
        "eye": [ "help_eye_rotation", "help_eye_zoom", "help_eye_move_cam_space"],
        "target": [ "help_target_rotate", "help_target_zoom", "help_target_interact" ],
        "static": [ "help_static" ]
    }
    let help_mobile_description = {
        "hover": [ "help_hover_zoom", "help_hover_rotate", "help_hover_move", "help_hover_interact" ],
        "eye": [ "help_eye_rotation", "help_eye_interact"],
        "target": [ "help_target_zoom", "help_target_rotate", "help_target_interact" ],
        "static": [ "help_static" ]
    }

    let help_body = document.querySelector("#help_body");

    for (let l in languages) {
        let desk = create_help_structure(help_desktop_description, "desk", languages[l]);
        help_body.appendChild(desk);
        let mob = create_help_structure(help_mobile_description, "mobile", languages[l]);
        help_body.appendChild(mob);
    }
    
}

function show_error(text_message, link_message, link) {
    let error_name = document.querySelector("#error_name");
    let error_info = document.querySelector("#error_info");
    let error_cont = document.querySelector("#error_cont");

    error_name.innerHTML = text_message;
    error_info.innerHTML = link_message + " <a href=" + link + ">" + link.replace("https://www.", "") + "</a>";
    error_cont.style.display = "block";
}

function init_swipe() {
    let initial_point;
    let final_point;
    let help_container = document.getElementById("help_cont");
    help_container.addEventListener('touchstart', function(event) {
        event.preventDefault();
        event.stopPropagation();
        initial_point=event.changedTouches[0];
    }, false);
    
    help_container.addEventListener('touchend', function(event) {
        event.preventDefault();
        event.stopPropagation();
        final_point=event.changedTouches[0];
        let x_abs = Math.abs(initial_point.pageX - final_point.pageX);
        let y_abs = Math.abs(initial_point.pageY - final_point.pageY);
        if (x_abs > 20 || y_abs > 20) {
            if (x_abs <= y_abs && final_point.pageY < initial_point.pageY) {
                    close_help();
                /*Swipe to the top*/
            } 
        }
    }, false);
}

function init_links() {
    var button_links = document.querySelectorAll("#social a");

    for (var i = 0; i < button_links.length; i++) {
        var link = button_links[i];

        if (link.hasAttribute("href"))
            link.href += document.location.href;
    }
}

// to allow early built-in module check
window.addEventListener("load", function () {
    init();
});