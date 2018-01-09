import b4w from "blend4web";

var m_app   = b4w.app;
var m_cfg   = b4w.config;
var m_data  = b4w.data;
var m_ctl   = b4w.controls;
var m_cons  = b4w.constraints;
var m_scs   = b4w.scenes;
var m_print = b4w.print;
var m_sfx   = b4w.sfx;

import * as m_conf from "./game_config.js"
import * as m_char from "./character.js"
import * as m_bonuses from "./bonuses.js"
import * as m_interface from "./interface.js"
import * as m_golems from "./golems.js"
import * as m_obelisks from "./obelisks.js"
import * as m_gems from "./gems.js"
import * as m_env from "./environment.js"


export function init() {
    
    var is_mobile = detect_mobile();

    if (is_mobile)
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
        autoresize: true,
        // NOTE: disable workers on mobile devices to prevent simulation
        // glitches due to huge message passing delays
        physics_use_workers: !is_mobile,
        alpha: false
    });
}

function init_cb(canvas_elem, success) {
    if (!success) {
        m_print.log("b4w init failure");
        return;
    }

    var load_path = m_cfg.get_std_assets_path() +
            "tutorials/making_a_game_p7-12/level_01.json";
    m_data.load(load_path, load_cb, null, true);
}

function load_cb(data_id) {

    m_char.init_wrapper()

    var elapsed_sensor = m_ctl.create_elapsed_sensor();

    m_bonuses.init(elapsed_sensor);
    m_golems.init(elapsed_sensor);
    m_golems.init_spawn(elapsed_sensor);
    m_obelisks.init();
    m_gems.init();

    m_char.setup_controls(elapsed_sensor);
    m_env.setup_falling_rocks(elapsed_sensor);
    m_env.setup_lava(elapsed_sensor);

    setup_camera();
    setup_music();

    function replay_cb() {
        document.getElementById("replay").style.visibility = "hidden";
        cleanup_game(elapsed_sensor);
    }

    m_interface.register_replay_cb(replay_cb);
}

function cleanup_game(elapsed_sensor) {

    m_ctl.remove_sensor_manifold(null, "PLAYLIST");

    m_char.reset();
    m_gems.reset();
    m_bonuses.reset();
    m_golems.reset();

    m_char.setup_controls(elapsed_sensor);
    m_obelisks.init();
    m_env.setup_lava(elapsed_sensor);
    m_env.setup_falling_rocks(elapsed_sensor);

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

function setup_camera() {
    var camera = m_scs.get_active_camera();
    var target = m_scs.get_object_by_dupli_name("character", "camera_target");
    m_cons.append_semi_soft(camera, target, m_conf.CAM_OFFSET, m_conf.CAM_SOFTNESS);
}

function setup_music() {
    var intro_spk = m_scs.get_object_by_dupli_name("enviroment",
                                                   m_conf.MUSIC_INTRO_SPEAKER);
    var end_spk = m_scs.get_object_by_dupli_name("enviroment",
                                                 m_conf.MUSIC_END_SPEAKER);

    m_sfx.play_def(intro_spk);
    m_sfx.stop(end_spk);

    var intro_duration = m_sfx.get_duration(intro_spk) * m_sfx.get_playrate(intro_spk);

    var playlist_cb = function(obj, id, pulse){
        m_ctl.remove_sensor_manifold(null, "PLAYLIST");
        if (m_char.get_wrapper().hp <= 0)
            return;
        var playlist_objs = [];
        var speakers = m_conf.MUSIC_SPEAKERS;
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

init();
