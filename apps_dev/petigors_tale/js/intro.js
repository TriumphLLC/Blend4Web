"use strict"

// check if module exists
if (b4w.module_check("intro_main"))
    throw "Failed to register module: intro_main";

b4w.register("intro_main", function(exports, require) {

var m_app    = require("app");
var m_cam_anim = require("camera_anim");
var m_cam    = require("camera");
var m_main   = require("main");
var m_data   = require("data");
var m_ctl    = require("controls");
var m_cons   = require("constraints");
var m_scs    = require("scenes");
var m_cfg    = require("config");
var m_print  = require("print");
var m_sfx    = require("sfx");
var m_assets = require("assets");
var m_obj    = require("objects");
var m_cont   = require("container");
var m_util   = require("util");

var m_vec3  = require("vec3");
var m_quat  = require("quat");

var m_conf = require("game_config");

var game_main = require("game_main");

var _intro_button = null;
var _lv1_button = null;
var _lv2_button = null;
var _training_button = null;
var _selected_obj = null;
var _buttons_info = {};

var _disable_plalist = false;
var _intro_spk = null;
var _playlist_spks = [];
var _end_spk = null;

var _canvas_elem = null;
var _mouse_x = 0;
var _mouse_y = 0;
var _default_cam_rot = new Float32Array(2);
var _cam_rot_fac = 0;

var _env_start_anim_delay;
var _env_anim_length;
var _env_energy_final;
var _env_horizon_final; 
var _env_zenith_final;

var _vec2_tmp = new Float32Array(2);
var ASSETS_PATH = m_cfg.get_std_assets_path() + "petigors_tale/";

exports.init = function() {

    var is_mobile = detect_mobile();

    if(is_mobile)
        var quality = m_cfg.P_LOW;
    else
        var quality = m_cfg.P_HIGH;

    m_app.init({
        canvas_container_id: "canvas3d",
        callback: init_cb,
        physics_enabled: true,
        quality: quality,
        console_verbose: true,
        show_fps: true,
        alpha: false,
        physics_use_workers: !is_mobile,
        autoresize: true
    });
}

function init_cb(canvas_elem, success) {
    if (!success) {
        m_print.log("b4w init failure");
        return;
    }

    _canvas_elem = canvas_elem;
    m_app.enable_controls(canvas_elem);

    //var json_path = ASSETS_PATH + "level_02.json";
    //m_data.load(json_path,
    //            function(data_id) {
    //                game_main.level_load_cb(data_id, "level_02");
    //            },
    //            preloader_cb, true);

    preloader_bg.style.visibility = "visible"
    if (detect_mobile())
        m_data.load(ASSETS_PATH + "intro_LQ.json", load_cb, preloader_cb, true);
    else
        m_data.load(ASSETS_PATH + "intro_HQ.json", load_cb, preloader_cb, true);
}

function detect_mobile() {
    if( navigator.userAgent.match(/Android/i)
     || navigator.userAgent.match(/webOS/i)
     || navigator.userAgent.match(/iPhone/i)
     || navigator.userAgent.match(/iPad/i)
     || navigator.userAgent.match(/iPod/i)
     || navigator.userAgent.match(/BlackBerry/i)
     || navigator.userAgent.match(/Windows Phone/i)) {
        return true;
    } else {
        return false;
    }
}

function load_cb(data_id) {

    _mouse_x = _canvas_elem.width / 2;
    _mouse_y = _canvas_elem.height / 2;

    m_cam.get_camera_angles(m_scs.get_active_camera(), _default_cam_rot);
    m_assets.enqueue([["config", m_assets.AT_JSON, "js/intro_config.json"]],
            process_config, null);

    _canvas_elem.addEventListener("mousemove", main_canvas_mouse_move, false);
    _canvas_elem.addEventListener("mouseup", main_canvas_click, false);
}

function init_url_params(config) {

    var url_params = m_app.get_url_params();

    if (url_params && "lang" in url_params) {
        var lang_obj = m_scs.get_object_by_dupli_name_list(config["language_obj"].split("*"));
        console.log("LANG OBJ", lang_obj);
        var lang_val = 1;

        if (url_params["lang"] == "ru")
            lang_val = 0

        m_obj.set_nodemat_value(lang_obj,
                                ["stones_n_dolmens", "language_switcher"],
                                lang_val);
    }
}

function process_config(data, uri, type, path) {
    setup_buttons(data);
    setup_music(data);
    init_url_params(data);

    _cam_rot_fac = data["camera_rotation_fac"];

    _env_start_anim_delay = data["environment_start_anim_delay"];
    _env_anim_length = data["environment_anim_length"];
    _env_energy_final = data["environment_energy_final"];
    _env_horizon_final = data["environment_horizon_final"];
    _env_zenith_final = data["environment_zenith_final"];
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
        stop_playlist:      binfo["stop_playlist_onclick"]
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
                m_obj.set_nodemat_value(binfo.glow_objs[i],
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

    var camobj = m_scs.get_active_camera();
    if (!m_cam.is_target_camera(camobj))
        return;

    var elapsed = m_ctl.get_sensor_value(obj, id, 0);

    var default_x = _canvas_elem.width / 2;
    var default_y = _canvas_elem.height / 2;

    m_cam.get_camera_angles(camobj, _vec2_tmp);

    var c_width = _canvas_elem.width;
    var dx = (default_x - _mouse_x) / _canvas_elem.width * _cam_rot_fac;
    var dy = (default_y - _mouse_y) / _canvas_elem.height * _cam_rot_fac;
    var x = _default_cam_rot[0] - dx;
    var y = _default_cam_rot[1] - dy;

    m_cam.target_rotate(camobj, x, y, true, true);
}

function main_canvas_mouse_move(e) {

    if (e.preventDefault)
        e.preventDefault();

    var x = e.clientX;
    var y = e.clientY;

    var obj = m_scs.pick_object(x, y);

    // outline
    if (obj && obj != _selected_obj) {
        _selected_obj = obj;
        var binfo = _buttons_info[obj.name];
        if (binfo && binfo.speaker)
            m_sfx.play_def(binfo.speaker);
    } else if (!obj && _selected_obj) {
        _selected_obj = null;
    }

    _mouse_x = x;
    _mouse_y = y;
}

function main_canvas_click(e) {

    if (e.preventDefault)
        e.preventDefault();

    var x = e.clientX;
    var y = e.clientY;

    var obj = m_scs.pick_object(x, y);

    if (obj && _buttons_info[obj.name]) {
        var binfo = _buttons_info[obj.name];

        if (binfo.stop_playlist) {
            play_ending_speaker();
            //run_environment_animation();
        }
        
        if (binfo.level_name)
            load_level(binfo.level_name);
    }
}

function play_ending_speaker(speaker) {
    for (var i = 0; i < _playlist_spks.length; i++) {
        var spk = _playlist_spks[i];
        if (m_sfx.is_play(spk))
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

function run_environment_animation() {

    var env_colors = m_scs.get_environment_colors();

    var start_energy = env_colors[0];
    var start_horizon = env_colors[1];
    var start_zenith = env_colors[2];
    var start_time = 0;
    var end_time = 0;

    var cur_horizon = [0,0,0];
    var cur_zenith = [0,0,0];

    var env_anim_cb = function() {
        var fac = (end_time - m_main.global_timeline()) / _env_anim_length;
        if (fac <= 0) {
            m_ctl.remove_sensor_manifold(null, "ANIMATE_ENV");
            m_scs.set_environment_colors(_env_energy_final, _env_horizon_final, _env_zenith_final);
            return;
        }
        var energy = m_util.lerp(fac, _env_energy_final, start_energy);
        m_vec3.lerp(_env_horizon_final, start_horizon, fac, cur_horizon);
        m_vec3.lerp(_env_zenith_final, start_zenith, fac, cur_zenith);
        m_scs.set_environment_colors(energy, cur_horizon, cur_zenith);
    }

    setTimeout(
        function() {
            start_time = m_main.global_timeline();
            end_time = start_time + _env_anim_length;
            var elapsed_sensor = m_ctl.create_elapsed_sensor();
            m_ctl.create_sensor_manifold(null, "ANIMATE_ENV", m_ctl.CT_CONTINUOUS,
                                        [elapsed_sensor], null, env_anim_cb);
        },
        1000 * _env_start_anim_delay);
}

function load_level(level_name) {
    var json_path = ASSETS_PATH + level_name + ".json";

    _canvas_elem.removeEventListener("mouseup", main_canvas_click);
    _canvas_elem.removeEventListener("touchscreen", main_canvas_click);
    _canvas_elem.removeEventListener("mousemove", main_canvas_mouse_move);

    m_data.unload();
    preloader_bg.style.visibility = "visible"
    m_data.load(json_path,
                function(data_id) {
                    game_main.level_load_cb(data_id, level_name);
                },
                preloader_cb, true);
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
    var preloader_bg = document.getElementById("preloader_bg");
    preloader_bg.style.visibility = "hidden"
}

});

b4w.require("intro_main").init();
