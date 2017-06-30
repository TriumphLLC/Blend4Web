"use strict";

b4w.register("new_year_main", function(exports, require) {

var m_tex       = require("textures");
var m_time      = require("time");
var m_data      = require("data");
var m_app       = require("app");
var m_main      = require("main");
var m_version   = require("version");
var m_scenes    = require("scenes");
var m_anim      = require("animation");
var m_cam       = require("camera");
var m_vec3      = require("vec3");
var m_cont      = require("container");
var m_controls  = require("controls");
var m_trans     = require("transform");
var m_sfx       = require("sfx");
var m_mouse     = require("mouse");
var mc_lang     = require("new_year_language");
var m_cfg       = require("config");

var _assets_dir;
var DEBUG = (m_version.type() === "DEBUG");

var PRELOADING = true;

var CANVAS_BKG_ALPHA_CLIP = 0.95;
var MAX_TEXT_ROW_LENGTH = 515;
var MARGIN_LEFT = 235;
var MARGIN_TOP = 185;
var LINE_SPACING = 1.25;
var MAX_INDEX_OF_LETTERS = 300;
var NUMBER_OF_END_ROW = 12;
var SPLITTERS = " ,.-+!?";

var _default_cam_eye, _current_cam_dist, _default_cam_dist, _default_cam_angles;
var _vec3_tmp, _vec3_tmp2 = new Float32Array(3);
var _current_cam_angles = new Float32Array(2);
var _timeline = 0;
var LETTER_ANIM_TIME = 25/24;

var _objs_confetti = [];
var _trigger_confetti_box = false;
var _trigger_monkey_box = false;
var _trigger_bear = false;
var _video_started = false;

var _disable_interaction = false;

var _pl_bar = null;
var _pl_caption = null;


exports.init = function() {
    var show_fps = DEBUG;

    var url_params = m_app.get_url_params();

    if (url_params && "show_fps" in url_params)
        show_fps = true;

    set_quality_config();

    m_app.init({
        canvas_container_id: "canvas3d",
        callback: init_cb,
        pause_invisible: false,
        physics_enabled: false,
        show_fps: show_fps,
        key_pause_enabled: false,
        assets_dds_available: !DEBUG,
        assets_pvr_available: !DEBUG,
        assets_min50_available: !DEBUG,
        console_verbose: DEBUG,
        gl_debug: DEBUG
    });
}

function init_cb(canvas_elem, success) {
    if(!success) {
        console.log("b4w init failure");
        return;
    }

    if (PRELOADING)
        create_preloader();

    if (!m_main.detect_mobile())
       canvas_elem.addEventListener("mousedown", main_canvas_down);

    canvas_elem.addEventListener("touchstart", main_canvas_down);

    window.onresize = on_resize;
    on_resize();
    load();
}

function create_preloader() {
    m_main.pause();

    var pl_cont = document.querySelector("#pl_cont");
    var pl_frame = pl_cont.querySelector("#pl_frame");

    _pl_bar = document.querySelector("#pl_bar");
    _pl_caption = document.querySelector("#pl_caption");

    m_app.css_animate(pl_cont, "opacity", 0, 1, 500, "", "", function() {
        m_main.resume();

        pl_frame.style.opacity = 1;
    })
}

function load() {
    if (DEBUG)
        _assets_dir =  "../../deploy/assets/new_year/";
    else
        _assets_dir = "../../assets/new_year/";
    var p_cb = PRELOADING ? preloader_cb : null;
    m_data.load( _assets_dir + "christmas_tree.json", load_cb, p_cb, true);
}

function fix_yandex_share_href() {
    var links = document.getElementsByTagName("a");

    for (var i =0; i < links.length; i++)
        links[i].href = links[i].href.replace("&amp;", "&");
}

function load_cb(data_id) {
    if (window.Ya) {
        new Ya.share({
            element: 'yandex_icons',
            elementStyle: {
                "type": "none",
                "quickServices": ["facebook" ,"twitter", "vkontakte", "odnoklassniki", 
                "gplus", "moimir"]
            },
            onready: function(instance){
                    set_language();
                    var send_button = document.getElementById("send_button");
                    send_button.onclick = function(){
                        send_button_click_cb();
                        instance.updateShareLink(window.location.href + " via Blend4Web", mc_lang.get_translation("title"));
                        fix_yandex_share_href();
                    }
                    instance.updateShareLink(window.location.href + " via Blend4Web", mc_lang.get_translation("title"));
                    fix_yandex_share_href();                  
                }
            });
    } else {
        var send_button = document.getElementById("send_button");
        send_button.onclick = function() {
            send_button_click_cb();
        }
    }
    var mail_button = document.getElementById("mail_to");
    mail_button.onclick = function(){
        this.href = "mailto:yourfriends?subject=" +
            mc_lang.get_translation("title") + "&body=" +
            window.location.href.replace('&', '%26');
    }
    m_app.enable_camera_controls();
    load_data();
    create_sensors();
    m_mouse.enable_mouse_hover_outline();
}

function load_data() {
    
    prepare_cam_and_lamp_params();
    prepare_objects_anim();

    var param = m_app.get_url_params();

    if (param && param["lang"] && param["lang"] == "ru") {
        mc_lang.set_language(param["lang"]);
        document.body.className = "lang_ru";
    } else
        document.body.className = "lang_en";

    if (param && param["text"])
        var message = param["text"];
    else
        var message = null;

    prepare_canvas();
    process_message(message);
}
function set_quality_config() {
    if (m_main.detect_mobile())
        m_cfg.set("quality", m_cfg.P_LOW);
}

function set_language() {
    var param = m_app.get_url_params();
    if (param && param["lang"] && param["lang"] == "ru")
        mc_lang.set_language(param["lang"]);
}

function prepare_canvas() {
    var obj_letter = m_scenes.get_object_by_dupli_name("letter", "letter");
    var ctx_image = m_tex.get_canvas_ctx(obj_letter, "canvas_texture");
    if (ctx_image) {
        ctx_image.clearRect(0, 0, ctx_image.canvas.width, ctx_image.canvas.height);
        ctx_image.globalAlpha = CANVAS_BKG_ALPHA_CLIP;
        ctx_image.globalAlpha = 1.0;
        ctx_image.font = "44px congratulatory_font, 'URW Chancery L', cursive";
        ctx_image.fillStyle = "#ffffff";
        m_tex.update_canvas_ctx(obj_letter, "canvas_texture");
    }
}

function prepare_objects_anim() {
    var obj_letter = m_scenes.get_object_by_name("letter");
    var obj_arm = m_scenes.get_object_by_dupli_name("letter", "armature_letter");
    var obj_letter_gift = m_scenes.get_object_by_dupli_name("gift", "Armature.001");

    m_anim.apply(obj_letter, "letter_fly_group");
    m_anim.apply(obj_letter_gift, "cap_fly");
    m_anim.apply(obj_arm, "letter_fly_fin");

    m_anim.set_behavior(obj_letter, m_anim.AB_FINISH_STOP);
    m_anim.set_behavior(obj_arm, m_anim.AB_FINISH_STOP);
    m_anim.set_behavior(obj_letter_gift, m_anim.AB_FINISH_STOP);

    var obj_monkey_box = m_scenes.get_object_by_dupli_name("gift_monkey", "Armature_gift_monkey");
    var obj_monkey = m_scenes.get_object_by_dupli_name("gift_monkey.001", "Armature");
     m_anim.apply(obj_monkey_box, "cap_fly");
     m_anim.set_behavior(obj_monkey_box, m_anim.AB_FINISH_STOP);
    m_anim.set_first_frame(obj_monkey);
    m_anim.apply(obj_monkey, "jump_B4W_BAKED");
    m_anim.set_behavior(obj_monkey, m_anim.AB_FINISH_STOP);

    _objs_confetti.push(m_scenes.get_object_by_dupli_name("confetti", "Cylinder"));
    _objs_confetti.push(m_scenes.get_object_by_dupli_name("confetti", "Cylinder.001"));
    _objs_confetti.push(m_scenes.get_object_by_dupli_name("confetti", "Cylinder.002"));
    _objs_confetti.push(m_scenes.get_object_by_dupli_name("confetti", "Cylinder.003"));
    _objs_confetti.push(m_scenes.get_object_by_dupli_name("confetti", "Cylinder.004"));
    _objs_confetti.push(m_scenes.get_object_by_dupli_name("confetti", "Cylinder.005"));
    var obj_confetti_box = m_scenes.get_object_by_dupli_name("gift_5", "Armature_gift_5");

    m_anim.apply(obj_confetti_box, "cap_fly");
    m_anim.set_behavior(obj_confetti_box, m_anim.AB_FINISH_STOP);

    for (var i = 0; i < _objs_confetti.length; i++) {
        m_anim.apply(_objs_confetti[i], "ParticleSystem 3");
        m_anim.set_behavior(_objs_confetti[i], m_anim.AB_FINISH_STOP);
    }

    var confetti_ribbons_above = m_scenes.get_object_by_dupli_name("confetti_ribbons", "ribbons_flom_above");
    var confetti_ribbons_below = m_scenes.get_object_by_dupli_name("confetti", "ribbons_from_below");

    m_anim.apply(confetti_ribbons_above, "Shader NodetreeAction.004");
    m_anim.set_behavior(confetti_ribbons_above, m_anim.AB_FINISH_STOP);

    m_anim.apply(confetti_ribbons_below, "Shader NodetreeAction");
    m_anim.set_behavior(confetti_ribbons_below, m_anim.AB_FINISH_STOP);

    var obj_bear = m_scenes.get_object_by_dupli_name("bear", "bear");
    m_anim.apply(obj_bear, "bear_wiggle");
    m_anim.set_behavior(obj_bear, m_anim.AB_FINISH_STOP);
    m_anim.set_first_frame(obj_bear);

    set_letter_objs_visibility(true);
    set_monkey_objs_visibility(true);
    set_confetti_objs_visibility(true);
}

function set_letter_objs_visibility(visibility) {
    var obj_letter_paper = m_scenes.get_object_by_dupli_name("letter", "letter");
    var obj_letter_seal = m_scenes.get_object_by_dupli_name("letter", "wax_seal_rope");
    if (!visibility) {
        m_scenes.show_object(obj_letter_paper);
        m_scenes.show_object(obj_letter_seal);
    } else {
        m_scenes.hide_object(obj_letter_paper);
        m_scenes.hide_object(obj_letter_seal);
    }
}

function set_monkey_objs_visibility(visibility) {
    var obj_monkey_head = m_scenes.get_object_by_dupli_name("gift_monkey.001", "monkey");
    var obj_monkey_neck = m_scenes.get_object_by_dupli_name("gift_monkey.001", "monkey.001");
    if (!visibility) {
        m_scenes.show_object(obj_monkey_head);
        m_scenes.show_object(obj_monkey_neck);
    } else {
        m_scenes.hide_object(obj_monkey_head);
        m_scenes.hide_object(obj_monkey_neck);
    }
}

function set_confetti_objs_visibility(visibility) {
    var confetti_ribbons_above = m_scenes.get_object_by_dupli_name("confetti_ribbons", "ribbons_flom_above");
    var confetti_ribbons_below = m_scenes.get_object_by_dupli_name("confetti", "ribbons_from_below");
    if (!visibility) {
        m_scenes.show_object(confetti_ribbons_above);
        m_scenes.show_object(confetti_ribbons_below);
        for (var i = 0; i < _objs_confetti.length; i++)
            m_scenes.show_object(_objs_confetti[i]);
    } else {
        m_scenes.hide_object(confetti_ribbons_above);
        m_scenes.hide_object(confetti_ribbons_below);
        for (var i = 0; i < _objs_confetti.length; i++)
            m_scenes.hide_object(_objs_confetti[i]);
    }
}

function prepare_cam_and_lamp_params() {

    var cam_obj = m_scenes.get_active_camera();
    _default_cam_eye = m_cam.get_translation(cam_obj);

    var cam_pivot = new Float32Array(3);
    m_cam.target_get_pivot(cam_obj, cam_pivot);
    _default_cam_dist = m_vec3.dist(cam_pivot, _default_cam_eye);
    _default_cam_angles = m_cam.get_camera_angles(cam_obj);
}

function process_message(message) {
    var text_area = document.getElementById("text_element");
    text_area.oninput = function() {
        if (text_area.value.length > MAX_INDEX_OF_LETTERS)
            text_area.value = text_area.value.substr(0, MAX_INDEX_OF_LETTERS);
    }
    var obj_letter = m_scenes.get_object_by_dupli_name("letter", "letter");
    var ctx_image = m_tex.get_canvas_ctx(obj_letter, "canvas_texture");
    if (message)
        text_area.value = decode_message(message);
    else
        text_area.value = mc_lang.get_translation("default_text");
    var text_message = prepare_text(text_area.value, ctx_image);
    print_text(text_message);
}

function start() {
    var container  = document.getElementById("container");
    var open_button = document.getElementById("open_button");
    var close_button = document.getElementById("close_button");
    var text_container = document.getElementById("text_container");

    var icons = document.getElementById("icons");
    icons.style.visibility = "visible";

    open_button.addEventListener("click", function() {
        text_container.style.visibility = "visible";
        close_button.style.visibility = "hidden";
        open_button.style.visibility = "hidden";
        prepare_canvas();
        show_textarea();
    }, false);

    close_button.addEventListener("click", function() {
        _disable_interaction = false;
        m_mouse.enable_mouse_hover_outline()
        container.style.visibility = "hidden";
        text_container.style.visibility = "hidden";
        icons.style.visibility = "hidden";

        var obj_letter = m_scenes.get_object_by_name("letter");
        var obj_arm = m_scenes.get_object_by_dupli_name("letter", "armature_letter");
        var obj_letter_gift = m_scenes.get_object_by_dupli_name("gift", "Armature.001");

        m_anim.set_speed(obj_letter, -2);
        m_anim.set_speed(obj_letter_gift, -2);
        m_anim.set_speed(obj_arm, -2);
        
        m_anim.play(obj_letter);
        m_anim.play(obj_letter_gift, set_letter_objs_visibility);
        m_anim.play(obj_arm);

        m_app.enable_camera_controls();
    }, false);

    container.style.visibility = "visible";
}

function show_textarea() {

    var open_button = document.getElementById("open_button");
    var text_area = document.getElementById("text_element");
    var text_container = document.getElementById("text_container");

    text_area.disabled = false;
    open_button.style.visibility = "hidden";
    text_container.style.visibility = "visible";
}

function send_button_click_cb() {
    var text_area = document.getElementById("text_element");
    var text_container = document.getElementById("text_container");
    var open_button = document.getElementById("open_button");
    var close_button = document.getElementById("close_button");
    var message = text_area.value;
    var obj_letter = m_scenes.get_object_by_dupli_name("letter", "letter");
    var ctx_image = m_tex.get_canvas_ctx(obj_letter, "canvas_texture");
    var text = prepare_text(message, ctx_image);
    print_text(text);

    text_container.style.visibility = "hidden";
    open_button.style.visibility = "inherit";
    close_button.style.visibility = "inherit";

    var message_text;
    
    message_text = encode_message(message);

    window.history.pushState("", "", "?lang=" + mc_lang.get_language() + "&text=" + message_text);

}

function on_resize() {

    m_cont.resize_to_container();

    var h = window.innerHeight;
    var w = window.innerWidth;

    var text_element = document.getElementById("text_element");
    text_element.style.fontSize = (0.025 * h).toString() + "px";

    if (navigator.userAgent.indexOf("iPad") == -1) {
        var html = document.getElementsByTagName("html")[0];
        html.style.height = h.toString() + "px";
        html.style.width = w.toString() + "px";
    }

    var bkg_img = document.getElementById("background_image_container");
    if (bkg_img) {
        bkg_img.style.height = h.toString() + "px";
        bkg_img.style.width = w.toString() + "px";
    }
    var preloader = document.getElementById("simple_preloader_container");
    if (preloader) {
        preloader.style.height = h.toString() + "px";
        preloader.style.width = w.toString() + "px";
    }

    var container = document.getElementById("container");

    container.style.width = (0.5 * h).toString() + "px";
    container.style.height = (0.6 * h).toString() + "px";
    container.style.top = (0.03 * h).toString() + "px";

}

function prepare_text(message, context) {
    var letters = message.split("");

    var row = "";
    var word = "";
    var text = [];

    for (var i = 0; i < letters.length; i++) {
        if (i >= MAX_INDEX_OF_LETTERS) {
            word += "...";
            break;
        }
        if (letters[i] == "\n") {
            row += word;
            text.push(row);
            row = "";
            word = "";
            continue;
        }
        if (SPLITTERS.indexOf(letters[i]) > -1) {
            if (context.measureText(row + word).width > MAX_TEXT_ROW_LENGTH) {
                text.push(row);
                row = "";
                row += word;
            } else
                row += word;
            word = "";
            row += letters[i];
        } else {
            word += letters[i];
            if (context.measureText(word).width > MAX_TEXT_ROW_LENGTH) {
                row += word;
                text.push(row);
                word = "";
                row = "";
            }
        }
    }

    if (context.measureText(row + word).width > MAX_TEXT_ROW_LENGTH) {
        text.push(row);
        row = "";
    }
    row += word;
    text.push(row);
    if (text.length > NUMBER_OF_END_ROW) {
        text.length = NUMBER_OF_END_ROW;
        text.push("...");
    }
    return text;
}

function print_text(text) {

    if (text) {
        var obj_letter = m_scenes.get_object_by_dupli_name("letter", "letter");
        var ctx_image = m_tex.get_canvas_ctx(obj_letter, "canvas_texture");
        var font = ctx_image.font.split("px");
        var font_height = parseInt(font[0]);
        for (var i = 0; i < text.length; i++)
            ctx_image.fillText(text[i], MARGIN_LEFT, Math.round(LINE_SPACING * font_height * i + MARGIN_TOP));
        m_tex.update_canvas_ctx(obj_letter, "canvas_texture");
    }

}

function encode_message(message) {
    var code, dif, message_text = "";
    var len = message.length > MAX_INDEX_OF_LETTERS ? MAX_INDEX_OF_LETTERS : message.length;
    for (var i = 0; i < len; i++) {
        code = message[i].charCodeAt(0).toString(16);
        dif = 4 - code.length;

        for (var j = 0; j < dif; j++)
            code = "0" + code;
        message_text += code;
    }
    return message_text;
}

function decode_message(message) {
    var bit = "";
    var text = "";

    for (var i = 0; i < message.length; i = i + 4) {
        bit += message[i] + message[i + 1] + message[i + 2] + message[i + 3];
        text += String.fromCharCode(parseInt(bit, 16));
        bit = "";
    }
    return text;
}

function main_canvas_down(e) {
    if (_disable_interaction)
        return;

    if (e.preventDefault)
        e.preventDefault();

    var x = m_mouse.get_coords_x(e);
    var y = m_mouse.get_coords_y(e);

    var obj = m_scenes.pick_object(x, y);
    if (obj)
        switch(m_scenes.get_object_name(obj)) {
        case "box":
            play_letter_box_anim();
            break;
        case "box_5":
            play_confetti_box_anim();
            break;
        case "box_6":
            play_monkey_box_anim();
            break;
        case "tv":
            tv_play();
            break;
        case "bear":
            play_bear_anim();
            break;
        }
}

function play_letter_box_anim() {
    var obj_letter = m_scenes.get_object_by_name("letter");
    var obj_arm = m_scenes.get_object_by_dupli_name("letter", "armature_letter");
    var obj_letter_gift = m_scenes.get_object_by_dupli_name("gift", "Armature.001");
    var speaker = m_scenes.get_object_by_dupli_name("gift", "letter");

    set_letter_objs_visibility();

    m_sfx.stop(speaker);
    m_sfx.play_def(speaker);

    _disable_interaction = true;
    m_mouse.disable_mouse_hover_outline();

    calc_camera_sensor_data();

    m_app.disable_camera_controls();

    m_anim.set_speed(obj_letter, 1);
    m_anim.set_speed(obj_letter_gift, 1);
    m_anim.set_speed(obj_arm, 1);

    m_anim.play(obj_letter, start);
    m_anim.play(obj_letter_gift);
    m_anim.play(obj_arm);
}

function play_bear_anim() {
    var obj_bear = m_scenes.get_object_by_dupli_name("bear", "bear");
    var speaker = m_scenes.get_object_by_dupli_name("bear", "spk_bear");
    m_sfx.stop(speaker);
    m_sfx.play_def(speaker);
    if (!_trigger_bear) {
        m_anim.set_speed(obj_bear, 1);
        m_anim.play(obj_bear);      

    } else {
        m_anim.set_speed(obj_bear, -1);
        m_anim.play(obj_bear);
    }
    _trigger_bear = !_trigger_bear;
}

function tv_play() {
    var speaker = m_scenes.get_object_by_dupli_name("TV", "speaker");

    if (_video_started) {
        m_tex.pause_video("Texture");
        m_tex.reset_video("Texture");
        m_sfx.stop(speaker);
    } else {
        m_tex.play_video("Texture");
        m_sfx.play_def(speaker);
    }
    _video_started = !_video_started;
}

function play_monkey_box_anim() {
    var obj_monkey_box = m_scenes.get_object_by_dupli_name("gift_monkey", "Armature_gift_monkey");
    var obj_monkey = m_scenes.get_object_by_dupli_name("gift_monkey.001", "Armature");
    var speaker = m_scenes.get_object_by_dupli_name("gift_monkey", "monkey");
    m_sfx.stop(speaker);
    m_sfx.play_def(speaker);
    if (!_trigger_monkey_box) {
        set_monkey_objs_visibility();
        m_anim.set_speed(obj_monkey_box, 1);
        m_anim.play(obj_monkey_box);

        m_anim.set_speed(obj_monkey, 1);
        m_anim.play(obj_monkey);

    } else {
        m_anim.set_speed(obj_monkey_box, -1.7);
        m_anim.play(obj_monkey_box, set_monkey_objs_visibility);

        m_anim.set_speed(obj_monkey, -3);
        m_anim.play(obj_monkey);
    }
    _trigger_monkey_box = !_trigger_monkey_box;
}

function play_confetti_box_anim() {
    var obj_confetti_box = m_scenes.get_object_by_dupli_name("gift_5", "Armature_gift_5");
    var confetti_ribbons_below = m_scenes.get_object_by_dupli_name("confetti", "ribbons_from_below");
    var confetti_ribbons_above = m_scenes.get_object_by_dupli_name("confetti_ribbons", "ribbons_flom_above");
    var speaker = m_scenes.get_object_by_dupli_name("gift_5", "fireworks");
    m_sfx.stop(speaker);

    if (!_trigger_confetti_box) {
        set_confetti_objs_visibility();
        m_anim.set_speed(obj_confetti_box, 1);
        m_anim.play(obj_confetti_box);
        m_anim.play(confetti_ribbons_below, play_confetti_ribbons_above);
        m_sfx.play_def(speaker);

        for (var i = 0; i < _objs_confetti.length; i++)
            m_anim.play(_objs_confetti[i]);
    } else {
        m_anim.set_speed(obj_confetti_box, -2);
        m_anim.play(obj_confetti_box);

        for (var i = 0; i < _objs_confetti.length; i++) {
            m_anim.stop(_objs_confetti[i]);
            var obj_name = m_scenes.get_object_name(_objs_confetti[i]);
            if (obj_name == "Cylinder" || obj_name == "Cylinder.001"
                    || obj_name == "Cylinder.002")
                m_anim.set_frame(_objs_confetti[i], 0);
            else
                m_anim.set_first_frame(_objs_confetti[i]);
        }
        m_anim.stop(confetti_ribbons_below);
        m_anim.set_first_frame(confetti_ribbons_below);
        m_anim.stop(confetti_ribbons_above);
        m_anim.set_first_frame(confetti_ribbons_above);
        set_confetti_objs_visibility(true);
    }
    _trigger_confetti_box = !_trigger_confetti_box;
}

function play_confetti_ribbons_above() {
    var confetti_ribbons_above = m_scenes.get_object_by_dupli_name("confetti_ribbons", "ribbons_flom_above");
    m_anim.play(confetti_ribbons_above, set_confetti_objs_visibility);
}

function calc_camera_sensor_data() {
    _timeline = m_time.get_timeline();

    var cam_obj = m_scenes.get_active_camera();
    var cam_pivot = m_cam.target_get_pivot(cam_obj, _vec3_tmp);
    var cam_eye = m_cam.get_translation(cam_obj, _vec3_tmp2);
    _current_cam_dist = m_vec3.dist(cam_pivot, cam_eye);
    m_cam.get_camera_angles(cam_obj, _current_cam_angles);
    if (_current_cam_angles[0] > Math.PI)
        _current_cam_angles[0] -= 2 * Math.PI;
}

function create_sensors() {
    var cam_obj = m_scenes.get_active_camera();

    var t_sensor = m_controls.create_timeline_sensor();
    var e_sensor = m_controls.create_elapsed_sensor();

    var logic_func = function(s) {
        return s[0] - _timeline < LETTER_ANIM_TIME;
    }

    var cam_move_cb = function(cam_obj, id, pulse) {
        if (pulse > 0) {
            var elapsed = m_controls.get_sensor_value(cam_obj, id, 1);
            var delta_distance = (_default_cam_dist - _current_cam_dist) * (elapsed/LETTER_ANIM_TIME);
            var delta_horisontal_angle = (_default_cam_angles[0] - _current_cam_angles[0]) * (elapsed/LETTER_ANIM_TIME);
            var delta_vertical_angle = (_default_cam_angles[1] - _current_cam_angles[1]) * (elapsed/LETTER_ANIM_TIME);
            m_trans.move_local(cam_obj, 0, 0, delta_distance);
            m_cam.rotate_camera(cam_obj, delta_horisontal_angle, delta_vertical_angle);
        } else
            m_cam.target_set_trans_pivot(cam_obj, _default_cam_eye, null);
    }

    m_controls.create_sensor_manifold(cam_obj, "CAMERA_MOVE", 
            m_controls.CT_CONTINUOUS, [t_sensor, e_sensor], logic_func, 
            cam_move_cb);
}

function preloader_cb(percentage) {
    _pl_bar.style.width = percentage + "%";
    _pl_caption.innerHTML = percentage + "%";

    if (percentage == 100) {
        var pl_cont = document.querySelector("#pl_cont");
        var pl_frame = pl_cont.querySelector("#pl_frame");

        pl_frame.style.opacity = 0;

        m_app.css_animate(pl_cont, "opacity", 1, 0, 2000, "", "", function() {
            pl_cont.parentNode.removeChild(pl_cont);
        })
    }
}

});
b4w.require("new_year_main").init();
