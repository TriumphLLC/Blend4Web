"use strict"
if (b4w.module_check("game_main"))
    throw "Failed to register module: game_main";

b4w.register("game_main", function(exports, require) {

var m_app   = require("app");
var m_ctl   = require("controls");
var m_scs   = require("scenes");
var m_sfx   = require("sfx");
var m_cont  = require("container");
var m_quat  = require("quat");
var m_phy   = require("physics");

var m_conf = require("game_config");
var m_char = require("character");
var m_bonuses = require("bonuses");
var m_interface = require("interface");
var m_enemies = require("enemies");
var m_obelisks = require("obelisks");
var m_gems = require("gems");
var m_env = require("environment");

var _level_conf = null; // specified during initialization

exports.level_load_cb = function(data_id, level_name, preloader_cb,
                                 intro_load_cb, load_level) {

    var elapsed_sensor = m_ctl.create_elapsed_sensor();
    _level_conf = null;

    if (level_name != "under_construction") {

        if (level_name == "level_01" || level_name == "level_02")
            _level_conf = require(level_name + "_config");

        if (level_name != "level_02") {
            var sword_light = m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY, m_conf.CHAR_LIGHT);
            m_scs.hide_object(sword_light);
        }

        if (level_name == "training") {
            setup_physics_constraints(); 
        }
    
        m_char.init_wrapper(_level_conf, level_name)
        m_char.setup_controls(elapsed_sensor);

        if (_level_conf) {
            m_bonuses.init(elapsed_sensor, _level_conf);
            m_enemies.init(elapsed_sensor, _level_conf);
            m_gems.init(_level_conf);
            m_env.init(elapsed_sensor, _level_conf);
            m_obelisks.init(elapsed_sensor, _level_conf);
            setup_music();
        }
    } else {
        m_app.enable_camera_controls();
    }

    setTimeout(function(){
            var canvas_cont = m_cont.get_container();
            canvas_cont.style.opacity = 1;
        }, 1000);

    m_interface.init(cleanup_game, elapsed_sensor, intro_load_cb, preloader_cb,
                     m_char.pointerlock_cb, level_name, load_level);
}

function setup_physics_constraints() {
    var dummy_body = m_scs.get_object_by_dupli_name_list(["training_scene",
                                                          "training_dummy",
                                                          "training_dummy"]);
    var ground = m_scs.get_object_by_dupli_name_list(["training_scene",
                                                      "Circle"]);

    var limits = {};
    limits["use_limit_x"] = true;
    limits["use_limit_y"] = true;
    limits["use_limit_z"] = true;

    limits["use_angular_limit_x"] = true;
    limits["use_angular_limit_y"] = true;
    limits["use_angular_limit_z"] = false;

    limits["limit_max_x"] = 0;
    limits["limit_min_x"] = 0;
    limits["limit_max_y"] = 0;
    limits["limit_min_y"] = 0;
    limits["limit_max_z"] = 0;
    limits["limit_min_z"] = 0;

    limits["limit_angle_max_x"] = 0.5;
    limits["limit_angle_min_x"] = -0.5;
    limits["limit_angle_max_y"] = 0.5;
    limits["limit_angle_min_y"] = -0.5;
    limits["limit_angle_max_z"] = 0.5;
    limits["limit_angle_min_z"] = -0.5;

    var trans_a = [0, 0, -1.05];
    var quat_a = m_quat.create();

    var trans_b = [-3.5, 1.6, 0.1];
    var quat_b = m_quat.create();

    m_phy.apply_constraint("GENERIC_6_DOF_SPRING", dummy_body, trans_a, quat_a,
            ground, trans_b, quat_b, limits, [0, 0, 0, 200, 200, 200],
                                             [2, 2, 2, 0.01, 0.01, 0.01]);
}

function cleanup_game(elapsed_sensor) {

    m_ctl.remove_sensor_manifold(null, "PLAYLIST");

    m_char.reset();
    if (_level_conf) {
        m_gems.reset();
        m_bonuses.reset();
        m_enemies.reset();
        m_obelisks.reset();
        m_env.reset(elapsed_sensor);
    }

    m_char.setup_controls(elapsed_sensor);
    m_interface.update_hp_bar();
    setup_music();
}

function setup_music() {

    if (!_level_conf || !_level_conf.MUSIC_SPEAKERS)
        return;

    var intro_spk = m_scs.get_object_by_dupli_name_list(
                            _level_conf.MUSIC_INTRO_SPEAKER);
    var end_spk = m_scs.get_object_by_dupli_name_list(
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
            var spk = m_scs.get_object_by_dupli_name_list(spk_name);
            playlist_objs.push(spk);
        }
        m_sfx.apply_playlist(playlist_objs, 0, true);
    }

    m_ctl.create_sensor_manifold(null, "PLAYLIST", m_ctl.CT_SHOT,
        [m_ctl.create_timer_sensor(intro_duration)], null, playlist_cb);
}

})
