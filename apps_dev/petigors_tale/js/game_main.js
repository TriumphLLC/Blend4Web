"use strict"
if (b4w.module_check("game_main"))
    throw "Failed to register module: game_main";

b4w.register("game_main", function(exports, require) {

var m_app   = require("app");
var m_main  = require("main");
var m_ctl   = require("controls");
var m_cons  = require("constraints");
var m_scs   = require("scenes");
var m_cfg   = require("config");
var m_print = require("print");
var m_sfx   = require("sfx");
var m_trans = require("transform");
var m_phy   = require("physics");

var m_vec3  = require("vec3");
var m_quat  = require("quat");

var m_conf = require("game_config");
var m_char = require("character");
var m_combat = require("combat");
var m_bonuses = require("bonuses");
var m_interface = require("interface");
var m_enemies = require("enemies");
var m_obelisks = require("obelisks");
var m_gems = require("gems");
var m_env = require("environment");

var _level_conf = null; // specified during initialization

var _char_wrapper = null;

var _vec3_tmp = new Float32Array(3);
var _vec3_tmp_2 = new Float32Array(3);
var _vec3_tmp_3 = new Float32Array(3);
var _vec3_tmp_4 = new Float32Array(3);
var _quat4_tmp = new Float32Array(4);
var _quat4_tmp2 = new Float32Array(4);

exports.level_load_cb = function(data_id, level_name) {

    _level_conf = require(level_name + "_config");
    m_char.init_wrapper(_level_conf, level_name)

    var elapsed_sensor = m_ctl.create_elapsed_sensor();

    m_bonuses.init(elapsed_sensor, _level_conf);
    m_enemies.init(elapsed_sensor, _level_conf);
    m_obelisks.init(elapsed_sensor, _level_conf);
    m_gems.init(_level_conf);

    m_env.init(elapsed_sensor, _level_conf);

    setup_music();

    m_char.setup_controls(elapsed_sensor);
    setup_camera(elapsed_sensor);

    function replay_cb() {
        document.getElementById("replay").style.visibility = "hidden";
        cleanup_game(elapsed_sensor);
    }

    m_interface.init(replay_cb);
}

function cleanup_game(elapsed_sensor) {

    m_ctl.remove_sensor_manifold(null, "PLAYLIST");

    m_char.reset();
    m_gems.reset();
    m_bonuses.reset();
    m_enemies.reset();
    m_obelisks.reset();
    m_env.reset();

    m_char.setup_controls(elapsed_sensor);

    m_interface.update_hp_bar();

    setup_music();
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

function setup_camera(elapsed_sensor) {
    var camera = m_scs.get_active_camera();
    var target = m_scs.get_object_by_dupli_name("character", "camera_target");

    var cam_cb = function(obj, id, pulse){
        m_cons.remove(camera);
        if (pulse == 1)
            m_cons.append_semi_soft_cam(camera, target, [0, 12, -9], m_conf.CAM_SOFTNESS);
        else
            m_cons.append_semi_soft_cam(camera, target, m_conf.CAM_OFFSET, m_conf.CAM_SOFTNESS);
    }

    m_cons.append_semi_soft_cam(camera, target, m_conf.CAM_OFFSET, m_conf.CAM_SOFTNESS);

    var is_bin_value = true;
    var calc_pos_norm = true;
    var ign_src_rot = false;

    var wall_ray = m_ctl.create_ray_sensor(target, m_conf.CAM_OFFSET, [0, 0, 0],
                      "VISUAL_BLOCKER", is_bin_value, calc_pos_norm, ign_src_rot);
    m_ctl.create_sensor_manifold(target, "CAM_ADJUSTMENT", m_ctl.CT_TRIGGER,
            [wall_ray], null, cam_cb);
}

function setup_music() {

    if (!_level_conf.MUSIC_SPEAKERS)
        return;

    var intro_spk = m_scs.get_object_by_dupli_name("enviroment",
                                                   _level_conf.MUSIC_INTRO_SPEAKER);
    var end_spk = m_scs.get_object_by_dupli_name("enviroment",
                                                 _level_conf.MUSIC_END_SPEAKER);

    if (intro_spk && end_spk) {
        m_sfx.play_def(intro_spk);
        m_sfx.stop(end_spk);
    } else
        return;

    var intro_duration = m_sfx.get_duration(intro_spk) * m_sfx.get_playrate(intro_spk);

    var playlist_cb = function(obj, id, pulse){
        m_ctl.remove_sensor_manifold(null, "PLAYLIST");
        if (m_char.get_wrapper().hp <= 0)
            return;
        var playlist_objs = [];
        var speakers = _level_conf.MUSIC_SPEAKERS;
        for (var i = 0; i < speakers.length; i++) {
            var spk_name = speakers[i];
            var spk = m_scs.get_object_by_dupli_name("enviroment", spk_name);
            playlist_objs.push(spk);
        }
        m_sfx.apply_playlist(playlist_objs, 0, true);
    }

    m_ctl.create_sensor_manifold(null, "PLAYLIST", m_ctl.CT_SHOT,
        [m_ctl.create_timer_sensor(intro_duration)], null, playlist_cb);
}

})
