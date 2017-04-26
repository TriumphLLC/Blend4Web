"use strict"

// check if module exists
if (b4w.module_check("start_menu"))
    throw "Failed to register module: intro_main";

b4w.register("start_menu", function(exports, require) {

var m_main   = require("main");
var m_app    = require("app");
var m_cam    = require("camera");
var m_data   = require("data");
var m_ctl    = require("controls");
var m_scs    = require("scenes");
var m_cfg    = require("config");
var m_print  = require("print");
var m_sfx    = require("sfx");
var m_assets = require("assets");
var m_mat    = require("material");
var m_cont   = require("container");
var m_nla    = require("nla");
var m_trans  = require("transform");
var m_version = require("version");
var m_phy   = require("physics");
var m_math  = require("math");

var m_vec3  = require("vec3");

var m_conf = require("game_config");

var game_main = require("game_main");

var _hq_loaded = false;
var _button_clicked = false;

var _selected_obj = null;
var _buttons_info = {};

var _disable_plalist = false;
var _intro_spk = null;
var _playlist_spks = [];
var _end_spk = null;

var _ray_id = null;

var _cam_from = new Float32Array(3);
var _cam_to = new Float32Array(3);
var _cam_pline = m_math.create_pline();

var _canvas_elem = null;
var _mouse_x = 0;
var _mouse_y = 0;

var _default_cam_rot = new Float32Array(2);
var _cam_dist = null;
var _cam_pivot = new Float32Array(3);
var _cam_rot_fac = 0;

var _vec3_tmp = new Float32Array(3);

var _lang = "en";

var _back_to_menu_button = null;

var _vec2_tmp = new Float32Array(2);
var ASSETS_PATH = m_cfg.get_std_assets_path() + "petigors_tale/";

exports.init = function() {
    window.addEventListener("load", menu_initialization);
}

function init_cb(canvas_elem, success) {
    if (!success) {
        m_print.log("b4w init failure");
        return;
    }

    _canvas_elem = canvas_elem;

    var preloader_cont = document.getElementById("preloader_cont");
    preloader_cont.style.visibility = "visible"

    //var level_name = "level_01";
    //var json_path = ASSETS_PATH + level_name + ".json";
    //m_data.load(json_path,
    //            function(data_id) {
    //                game_main.level_load_cb(data_id, level_name, preloader_cb,
    //                                        intro_load_cb, load_level);
    //            },
    //            preloader_cb, true);

    if (m_main.detect_mobile())
        m_data.load(ASSETS_PATH + "intro_LQ.json", intro_load_cb, preloader_cb,
                    true);
    else
        m_data.load(ASSETS_PATH + "intro_HQ.json", intro_load_cb, preloader_cb,
                    true);
}

function intro_load_cb(data_id) {

    _hq_loaded = false;
    _button_clicked = false;
    _selected_obj = null;

    _mouse_x = _canvas_elem.width / 2;
    _mouse_y = _canvas_elem.height / 2;

    m_assets.enqueue([{id:"config", type:m_assets.AT_JSON, url:"js/intro_config.json"}],
            process_config);

    var camobj = m_scs.get_active_camera();
    m_cam.get_camera_angles(camobj, _default_cam_rot);

    setTimeout(function() {
            var canvas_cont = m_cont.get_container();
            canvas_cont.style.opacity = 1;
        }, 1000);
    
    if (!m_main.detect_mobile()) {

        var ray_test_cb = function(sens_obj, id, pulse) {
            var sens_val = m_ctl.get_sensor_value(sens_obj, id, 0);
            var payload = m_ctl.get_sensor_payload(sens_obj, id, 0);
            var obj = payload.obj_hit;
            _ray_id = payload.ray_test_id;

            if (!sens_val) {
                _selected_obj = null;
                return;
            }

            if (obj != _selected_obj) {
                _selected_obj = obj;
                var binfo = _buttons_info[obj.name];
                if (binfo && binfo.speaker)
                    m_sfx.play_def(binfo.speaker);
            }
        }

        var ray_sens = m_ctl.create_ray_sensor(camobj, _cam_from, _cam_to, "BUTTON",
                                         true, false, true);
        m_ctl.create_sensor_manifold(null, "BUTTON_HOVER", m_ctl.CT_CONTINUOUS,
                                    [ray_sens], function(s){return true}, ray_test_cb);

        _canvas_elem.addEventListener("mousedown", main_canvas_click, false);
        _canvas_elem.addEventListener("mousemove", main_canvas_mouse_move, false);
        setTimeout(function() {
            if (!_hq_loaded && !_button_clicked)
                load_HQ_elements();
        }, 10000)

    } else
        _canvas_elem.addEventListener("touchstart", main_canvas_touch, false);
}

function setup_language(config) {

    var lang_val = 1;

    if (_lang == "ru")
        lang_val = 0

    var lang_obj = m_scs.get_object_by_dupli_name_list(config["language_obj"].split("*"));
    m_mat.set_nodemat_value(lang_obj,
                            ["main_menu_stone", "language_switcher"],
                            lang_val);

    if (!m_main.detect_mobile()) {
        _back_to_menu_button = m_scs.get_object_by_name(config["back_to_menu_obj_name"]);
        m_mat.set_nodemat_value(_back_to_menu_button,
                                ["back_to_main_menu", "back_button_language"],
                                lang_val);
    }
}

function process_config(data, id, type, url) {
    setup_buttons(data);
    setup_music(data);
    setup_language(data);

    var camobj = m_scs.get_active_camera();

    _cam_rot_fac = data["camera_rotation_fac"];
    m_vec3.copy(data["camera_pivot"], _cam_pivot);

    m_trans.get_translation(camobj, _vec3_tmp);
    _cam_dist = m_vec3.distance(_cam_pivot, _vec3_tmp);
}

function setup_buttons(config) {
    var bdata = config["buttons_info"];
    var elapsed_sensor = m_ctl.create_elapsed_sensor();

    for (var i = 0; i < bdata.length; i++) {
        var binfo = bdata[i];
        var obj = m_scs.get_object_by_dupli_name_list(binfo["button_name"].split("*"));
        if (obj)
            _buttons_info[obj.name] = init_button_info(binfo);
    }
    m_ctl.create_sensor_manifold(null, "GLOW", m_ctl.CT_CONTINUOUS,
                                [elapsed_sensor], null, button_glow_cb);
    m_ctl.create_sensor_manifold(null, "ROT_CAMERA", m_ctl.CT_CONTINUOUS,
                                [elapsed_sensor], null, rotate_cam_cb);
}

function init_button_info(binfo) {
    var speaker = m_scs.get_object_by_dupli_name_list(binfo["mouse_over_speaker"].split("*"));
    m_sfx.stop(speaker);

    var glow_objs = [];
    var glow_obj_names = binfo["glow_obj_names"];

    if (typeof(glow_obj_names) == "object") { // array
        for (var j = 0; j < glow_obj_names.length; j++) {
            var glow_obj = m_scs.get_object_by_dupli_name_list(glow_obj_names[j].split("*"));
            if (glow_obj)
                glow_objs.push(glow_obj);
        }
    } else
        glow_objs.push(m_scs.get_object_by_dupli_name_list(glow_obj_names.split("*")));

    return {
        glow_objs:       glow_objs,
        speaker:         speaker,
        level_name:      binfo["level_name"],
        material:        binfo["material"],
        value_node_name: binfo["value_node_name"],

        glow_grow_time:  binfo["glow_grow_time"],
        min_glow_value:  binfo["min_glow_value"],
        max_glow_value:  binfo["max_glow_value"],
        glow_curr_value: binfo["min_glow_value"],

        outline_grow_time:  binfo["outline_grow_time"],
        min_outline_value:  binfo["min_outline_value"],
        max_outline_value:  binfo["max_outline_value"],
        outline_curr_value: binfo["min_outline_value"],
    };
}

function setup_music(config) {

    _intro_spk = m_scs.get_object_by_dupli_name_list(
                    config["intro_speaker"].split("*"));
    _end_spk = m_scs.get_object_by_dupli_name_list(
                    config["end_speaker"].split("*"));

    var playlist_names = config["playlist_speakers"];
    for (var i = 0; i < playlist_names.length; i++) {
        var spk_name = playlist_names[i];
        var spk = m_scs.get_object_by_dupli_name_list(spk_name.split("*"));
        m_sfx.stop(spk);
        _playlist_spks.push(spk);
        m_sfx.mute(spk, false);
    }

    var intro_duration = m_sfx.get_duration(_intro_spk) * m_sfx.get_playrate(_intro_spk);
    m_sfx.mute(_intro_spk, false);
    m_sfx.mute(_end_spk, false);

    var playlist_cb = function(obj, id, pulse) {
        if (_disable_plalist)
            return;
        m_sfx.stop(_intro_spk);
        m_sfx.apply_playlist(_playlist_spks, 0, true);
    }

    m_sfx.stop(_end_spk);
    m_sfx.play_def(_intro_spk);

    m_ctl.create_sensor_manifold(null, "PLAYLIST", m_ctl.CT_SHOT,
        [m_ctl.create_timer_sensor(intro_duration)], null, playlist_cb);
}


function button_glow_cb(obj, id, pulse) {
    var elapsed = m_ctl.get_sensor_value(obj, id, 0);

    for (var objname in _buttons_info) {
        var binfo = _buttons_info[objname];

        var cur_glow_val = binfo.glow_curr_value;
        var min_glow_val = binfo.min_glow_value;
        var max_glow_val = binfo.max_glow_value;
        var incr_gl = elapsed / binfo.glow_grow_time;

        var cur_outline_val = binfo.outline_curr_value;
        var min_outline_val = binfo.min_outline_value;
        var max_outline_val = binfo.max_outline_value;
        var incr_outl = elapsed / binfo.outline_grow_time;

        if (_selected_obj && objname == _selected_obj.name) {
            if (cur_glow_val < max_glow_val)
                binfo.glow_curr_value += incr_gl;
            if (cur_outline_val !== undefined && cur_outline_val < max_outline_val)
                binfo.outline_curr_value += incr_outl;
        }
        if (!_selected_obj || objname != _selected_obj.name) {
            if (cur_glow_val > min_glow_val)
                binfo.glow_curr_value -= incr_gl;
            if (cur_outline_val !== undefined && cur_outline_val > min_outline_val)
                binfo.outline_curr_value -= incr_outl;
        }

        if (cur_glow_val !== undefined &&
                binfo.glow_curr_value != cur_glow_val)
            for (var i = 0; i < binfo.glow_objs.length; i++)
                m_mat.set_nodemat_value(binfo.glow_objs[i],
                                [binfo.material, binfo.value_node_name],
                                 binfo.glow_curr_value);

        if (cur_outline_val !== undefined &&
                binfo.outline_curr_value != cur_outline_val)
            for (var i = 0; i < binfo.glow_objs.length; i++)
                m_scs.set_outline_intensity(binfo.glow_objs[i],
                                        binfo.outline_curr_value);
    }
}

function rotate_cam_cb(obj, id, pulse) {

    if (m_nla.is_play())
        return;

    if (_cam_dist === null)
        return;

    var camobj = m_scs.get_active_camera();

    var default_x = _canvas_elem.width / 2;
    var default_y = _canvas_elem.height / 2;

    m_cam.get_camera_angles(camobj, _vec2_tmp);

    var dx = (default_x - _mouse_x) / _canvas_elem.width * _cam_rot_fac;
    var dy = (default_y - _mouse_y) / _canvas_elem.height * _cam_rot_fac;
    var x = _default_cam_rot[0] - dx;
    var y = -_default_cam_rot[1] - dy;

    _vec3_tmp[0] = _cam_pivot[0] + _cam_dist * Math.sin(x);
    _vec3_tmp[1] = _cam_pivot[1] - _cam_dist * Math.cos(x);
    _vec3_tmp[2] = _cam_pivot[2] + _cam_dist * Math.sin(y);

    m_cam.static_set_look_at(camobj, _vec3_tmp, _cam_pivot);
    m_cam.correct_up(camobj);
}

function main_canvas_mouse_move(e) {

    if (e.preventDefault)
        e.preventDefault();

    var x = e.offsetX;
    var y = e.offsetY;
    _mouse_x = x;
    _mouse_y = y;

    if (_ray_id !== null) {
        var camobj = m_scs.get_active_camera();
        m_cam.calc_ray(camobj, x, y, _cam_pline);
        m_math.get_pline_directional_vec(_cam_pline, _cam_to);
        m_vec3.scale(_cam_to, 100, _cam_to);
        m_phy.change_ray_test_from_to(_ray_id, _cam_from, _cam_to);
    }
}

function main_canvas_touch(e) {
    if (e.preventDefault)
        e.preventDefault();
    var touches = e.changedTouches;
    var touch = touches[0];
    var x = touch.clientX;
    var y = touch.clientY;
    var canvas_xy = m_cont.client_to_canvas_coords(x, y, _vec2_tmp);
    process_screen_click(canvas_xy[0], canvas_xy[1]);
}

function main_canvas_click(e) {
    if (e.preventDefault)
        e.preventDefault();
    var x = e.offsetX;
    var y = e.offsetY;
    process_screen_click(x, y);
}

function process_screen_click(x, y) {
    var obj = m_scs.pick_object(x, y);
    if (obj) {
        _selected_obj = obj;
        if (_buttons_info[obj.name]) {
            var level_name = _buttons_info[obj.name].level_name

            if (level_name) {
                cleanup_events();
                setTimeout(function() {load_level(level_name)},
                           1000 * m_conf.LEVEL_LOAD_DELAY);
            } else if (!m_main.detect_mobile()) {
                play_ending_speaker();
                cleanup_events();
                start_intro();
            }
        }
    }
}

function cleanup_events() {
    _button_clicked = true;
    if (m_main.detect_mobile())
        _canvas_elem.removeEventListener("touchstart", main_canvas_touch, false);
    else {
        _canvas_elem.removeEventListener("mousedown", main_canvas_click);
        _canvas_elem.removeEventListener("mousemove", main_canvas_mouse_move);
    }
}

function start_intro() {

    if (!_hq_loaded)
        load_HQ_elements();

    m_ctl.remove_sensor_manifold(null, "ROT_CAMERA");
    m_ctl.remove_sensor_manifold(null, "BUTTON_HOVER");
    m_ctl.create_sensor_manifold(null, "TIMELINE_CHECK",
                 m_ctl.CT_SHOT,
                [m_ctl.create_elapsed_sensor()],
                function(s) {return m_nla.get_frame() >= m_nla.get_frame_end()},
                function(){load_level("level_01")});
}

function load_HQ_elements() {
    m_sfx.duck(null, 0, 1);
    var LQ_obj = m_scs.get_object_by_name("environment_LQ");

    var preloader_cont = document.getElementById("preloader_cont");
    preloader_cont.style.visibility = "visible"

    m_data.load(ASSETS_PATH + "intro_HQ_environment.json", function() {
            m_scs.hide_object(LQ_obj);
            m_sfx.duck(null, 1, 1);
            _hq_loaded = true;
        }, preloader_cb, true, false);
}

function play_ending_speaker(speaker) {
    for (var i = 0; i < _playlist_spks.length; i++) {
        var spk = _playlist_spks[i];
        if (m_sfx.is_playing(spk))
            m_sfx.duck(spk, 0, 1);
    }
    m_sfx.duck(_intro_spk, 0, 1);
    setTimeout(function() {
                    m_sfx.clear_playlist();
                    _disable_plalist = true;
                    m_sfx.play_def(_end_spk)
               },
               1000);
}

function load_level(level_name) {
    if (level_name == "quest")
        window.open("quest.html","_self");
    else {
        m_data.unload(m_data.DATA_ID_ALL);
        var json_path = ASSETS_PATH + level_name + ".json";
        var preloader_cont = document.getElementById("preloader_cont");
        preloader_cont.style.visibility = "visible"
        m_data.load(json_path,
                    function(data_id) {
                        game_main.level_load_cb(data_id, level_name, preloader_cb,
                                                intro_load_cb, load_level);
                    },
                    preloader_cb, true);
    }
}

function preloader_cb(percentage) {
    var prelod_dynamic_path = document.getElementById("prelod_dynamic_path");
    var percantage_num      = prelod_dynamic_path.nextElementSibling;

    prelod_dynamic_path.style.width = percentage + "%";
    percantage_num.innerHTML = percentage + "%";

    if (percentage == 100) {
        remove_preloader();

        return;
    }
}

function remove_preloader() {
    var preloader_cont = document.getElementById("preloader_cont");

    setTimeout(function(){
            preloader_cont.style.visibility = "hidden"
        }, 1000);
}

function menu_initialization() {
    var start_elem = document.getElementById("start_game");
    var start_glow = document.getElementById("start_game_hover");
    var quality_elem = document.getElementById("quality");
    var menu_elem = document.getElementById("start_cont");
    var lang_elem_ru = document.getElementById("lang_ru");
    var lang_elem_en = document.getElementById("lang_en");
    var qual_elem_low = document.getElementById("low_qual");
    var qual_elem_high = document.getElementById("high_qual");
    var body_elem = document.body;
    var brand = document.getElementsByClassName("brand")[0];
    var soc = document.getElementsByClassName("soc")[0];

    menu_elem.style.display = "block";
    menu_elem.style.opacity = 1;

    document.location.hash = "quality=high";

    function switch_lang(lang) {
        body_elem.setAttribute("lang", lang);
        start_elem.setAttribute("src", "interface/start_game_" + lang + ".png");
        _lang = lang;
    }

    function init_app() {
        var is_mobile = m_main.detect_mobile();
        var is_debug = m_version.type() == "DEBUG";

        var quality_elem = document.getElementById("quality");
        var qual_kind = quality_elem.getAttribute("quality");

        if (qual_kind == "high" && !is_mobile)
            var quality = m_cfg.P_HIGH;
        else
            var quality = m_cfg.P_LOW;

        m_app.init({
            canvas_container_id: "canvas3d",
            callback: init_cb,
            quality: quality,
            physics_enabled: true,
            console_verbose: true,
            alpha: false,
            physics_use_workers: !is_mobile,
            assets_dds_available: !is_debug,
            assets_pvr_available: !is_debug,
            assets_min50_available: !is_debug,
            show_fps: is_debug,
            autoresize: true
        });
    }

    function switch_qual(qual) {
        quality_elem.setAttribute("quality", qual);
        document.location.hash = "quality=" + qual;
    }

    function show_start_btn_glow() {
        start_glow.style.display = "inline-block";
    }

    function show_brand_glow() {
        brand.className = "brand hover";
    }

    function show_soc_glow() {
        soc.className = "soc hover";
    }

    function hide_start_btn_glow() {
        start_glow.style.display = "";
    }

    function hide_brand_glow() {
        brand.className = "brand";
    }

    function hide_soc_glow() {
        soc.className = "soc";
    }

    lang_elem_ru.addEventListener("click", function() {switch_lang("ru")}, false);
    lang_elem_en.addEventListener("click", function() {switch_lang("en")}, false);

    qual_elem_low.addEventListener("click", function() {switch_qual("low")}, false);
    qual_elem_high.addEventListener("click", function() {switch_qual("high")}, false);

    if (m_main.detect_mobile()) {
        start_elem.addEventListener("touchstart", show_start_btn_glow);
        start_elem.addEventListener("touchend", hide_start_btn_glow);

        brand.addEventListener("touchstart", show_brand_glow);
        brand.addEventListener("touchend", hide_brand_glow);

        soc.addEventListener("touchstart", show_soc_glow);
        soc.addEventListener("touchend", hide_soc_glow);
        switch_qual("low");
    } else {
        start_elem.addEventListener("mousedown", show_start_btn_glow);
        start_elem.addEventListener("mouseup", hide_start_btn_glow);
        start_elem.addEventListener("mouseleave", hide_start_btn_glow);

        brand.addEventListener("mousedown", show_brand_glow);
        brand.addEventListener("mouseup", hide_brand_glow);
        brand.addEventListener("mouseleave", hide_brand_glow);

        soc.addEventListener("mousedown", show_soc_glow);
        soc.addEventListener("mouseup", hide_soc_glow);
        soc.addEventListener("mouseleave", hide_soc_glow);
    }

    start_elem.addEventListener("click",
                                function () {
                                    menu_elem.style.visibility = "hidden";
                                    init_app();
                                }
                                , false)
}

});

b4w.require("start_menu").init("en");
