"use strict"

if (b4w.module_check("environment"))
    throw "Failed to register module: environment";

b4w.register("environment", function(exports, require) {

var m_anim  = require("animation");
var m_ctl   = require("controls");
var m_scs   = require("scenes");
var m_trans = require("transform");
var m_vec3  = require("vec3");
var m_sfx   = require("sfx");
var m_phy   = require("physics");

var m_char = require("character");
var m_conf = require("game_config");
var m_bonuses = require("bonuses");

var _level_conf = null; // specified during initialization
var _rock_wrappers = [];

var RAY_START = [0,0,0];

var _vec3_tmp = new Float32Array(3);
var _vec3_tmp_2 = new Float32Array(3);

var TT_NONE = -1;
var TT_LAVA = 0;
var TT_GROUND = 1;

exports.init = function(elapsed_sensor, level_conf) {
    _level_conf = level_conf;
    setup_lava(elapsed_sensor);

    if (_level_conf.ROCK_EMPTIES)
        setup_falling_rocks(elapsed_sensor, _level_conf);

    if (_level_conf.LEVEL_NAME == "dungeon")
        setup_random_bonus_spawn(level_conf);
}

function setup_random_bonus_spawn(level_conf) {
    var timer = m_ctl.create_timer_sensor(level_conf.BONUS_SPAWN_PERIOD, true);
    var sphere_empty = m_scs.get_object_by_name(level_conf.BONUS_SPAWN_SPHERE);
    var bonus_spawn_sphere = m_scs.get_object_by_dupli_name(
                                    level_conf.BONUS_SPAWN_SPHERE,
                                    level_conf.BONUS_SPAWN_SPHERE);
    m_anim.set_behavior(bonus_spawn_sphere, m_anim.AB_FINISH_RESET);
    m_anim.set_frame(bonus_spawn_sphere, 0);

    function ray_cb(id, fract, obj, time, pos, norm) {
        var spawned = m_bonuses.spawn(pos);
        if (spawned) {
            m_trans.set_translation_v(sphere_empty, pos);
            m_anim.play(bonus_spawn_sphere);
        }
    }

    function bonus_spawn_cb(obj, id, pulse) {
        var from = _vec3_tmp;
        var DIST = 20
        from[0] = 2 * DIST * Math.random() - DIST;
        from[1] = 2 * DIST * Math.random() - DIST;
        from[2] = 20;
        var to = _vec3_tmp_2;
        _vec3_tmp_2[0] = from[0];
        _vec3_tmp_2[1] = from[1];
        _vec3_tmp_2[2] = -10;
        m_phy.append_ray_test_ext(null, from, to, "GROUND", ray_cb, true,
                                  false, true, false);
    }
    m_ctl.create_sensor_manifold(null, "BONUS_SPAWN", m_ctl.CT_SHOT,
                                 [timer], null, bonus_spawn_cb);
}

function init_rock_wrapper(rock, mark, burst, speaker) {
    var rock_wrapper = {
        rock: rock,
        mark: mark,
        burst: burst,
        speaker: speaker,
        lava_height: _level_conf.ROCK_RAY_LENGTH,
        ground_height: _level_conf.ROCK_RAY_LENGTH,
        terrain_type: TT_NONE,
        falling_time: 0
    }
    return rock_wrapper;
}

function setup_falling_rocks(elapsed_sensor, level_conf) {

    function rock_fall_cb(obj, id, pulse, rock_wrapper) {
        var elapsed = m_ctl.get_sensor_value(obj, id, 0);
        var mark = rock_wrapper.mark;
        m_trans.set_scale(mark, 0);

        rock_wrapper.falling_time += elapsed;

        if (rock_wrapper.falling_time <= _level_conf.ROCK_FALL_DELAY) {
            rock_wrapper.terrain_type = TT_NONE;
            return;
        }

        var rock_pos = _vec3_tmp;
        var mark_pos = _vec3_tmp_2;

        m_trans.get_translation(obj, rock_pos);
        m_trans.get_translation(mark, mark_pos);

        rock_pos[2] -= _level_conf.ROCK_SPEED * elapsed;
        m_trans.set_translation_v(obj, rock_pos);

        var mark_scale = 1 - Math.abs((rock_pos[2] - mark_pos[2])) /
                             _level_conf.ROCK_RAY_LENGTH;
        m_trans.set_scale(mark, mark_scale);

        if (rock_pos[2] <= mark_pos[2])
            rock_crash(rock_wrapper)
    }

    function rock_crash(rock_wrapper) {
        var char_pos = _vec3_tmp;
        var burst_emitter = rock_wrapper.burst;
        var crush_speaker = rock_wrapper.speaker;
        var mark = rock_wrapper.mark;

        var char_wrapper = m_char.get_wrapper();
        m_trans.get_translation(char_wrapper.phys_body, char_pos);

        var collision_pt = _vec3_tmp_2;
        m_trans.get_translation(mark, collision_pt);

        var dist_to_rock = m_vec3.distance(char_pos, collision_pt);

        m_trans.set_translation_v(burst_emitter, collision_pt);
        m_anim.set_frame(burst_emitter, 0, m_anim.SLOT_ALL);
        m_anim.play(burst_emitter, null, m_anim.SLOT_ALL);

        if (dist_to_rock < _level_conf.ROCK_DAMAGE_RADIUS) {
            if (char_wrapper.state != m_conf.CH_VICTORY) {
                var damage = -_level_conf.ROCK_DAMAGE
                if (m_bonuses.shield_time_left() > 0)
                    damage *= m_conf.BONUS_SHIELD_EFFECT
                m_char.change_hp(damage);
            }
        }

        var should_spawn_bonus = Math.random() < m_conf.BONUS_SPAWN_CHANCE;

        // spawn bonus only for ground collision
        if (rock_wrapper.terrain_type == TT_GROUND && should_spawn_bonus)
            m_bonuses.spawn(collision_pt);

        m_sfx.play_def(crush_speaker);
        set_random_rock_position(rock_wrapper);
    }

    for (var i = 0; i < _level_conf.ROCK_EMPTIES.length; i++) {

        var dupli_name = _level_conf.ROCK_EMPTIES[i];

        for (var j = 0; j < _level_conf.ROCK_NAMES.length; j++) {
            
            var rock_name  = _level_conf.ROCK_NAMES[j];
            var burst_name = _level_conf.BURST_EMITTER_NAMES[j];
            var mark_name  = _level_conf.MARK_NAMES[j];

            var rock  = m_scs.get_object_by_dupli_name(dupli_name, rock_name);
            var mark  = m_scs.get_object_by_dupli_name(dupli_name, mark_name);
            var burst = m_scs.get_object_by_dupli_name(dupli_name, burst_name);
            var speaker = m_scs.get_object_by_dupli_name(dupli_name,
                                                         _level_conf.ROCK_HIT_SPEAKERS[j]);

            var rock_wrapper = init_rock_wrapper(rock, mark, burst, speaker);

            m_ctl.create_sensor_manifold(rock, "ROCK_FALL", m_ctl.CT_CONTINUOUS,
                                     [elapsed_sensor], null, rock_fall_cb,
                                     rock_wrapper);

            set_random_rock_position(rock_wrapper);
            append_ray_tests(rock_wrapper);

            _rock_wrappers.push(rock_wrapper);
        }
    }
}

function append_ray_tests(rock_wrapper) {
    var rock = rock_wrapper.rock;
    var mark = rock_wrapper.mark;
    var ROCK_POS = [0, 0, -_level_conf.ROCK_RAY_LENGTH];

    m_phy.append_ray_test_ext(rock, RAY_START, ROCK_POS, "LAVA",
                              function(id, fract, obj, time, pos, norm) {
                                  rock_wrapper.lava_height = pos[2];
                                  if (rock_wrapper.terrain_type == TT_NONE) {
                                      rock_wrapper.terrain_type = TT_LAVA;
                                      set_mark(mark, pos, fract);
                                  }
                              },
                              false, false, true, true);

    m_phy.append_ray_test_ext(rock, RAY_START, ROCK_POS, "GROUND",
                              function(id, fract, obj, time, pos, norm) {
                                  rock_wrapper.ground_height = pos[2];
                                  if (rock_wrapper.terrain_type != TT_GROUND) {
                                      rock_wrapper.terrain_type = TT_GROUND;
                                      set_mark(mark, pos, fract);
                                  }
                              },
                              false, false, true, true);
}

exports.reset = function(elapsed_sensor) {
    if (_level_conf.ROCK_EMPTIES)
        for (var i = 0; i < _rock_wrappers.length; i++)
            set_random_rock_position(_rock_wrappers[i]);
    setup_lava(elapsed_sensor);
}

function set_random_rock_position(rock_wrapper) {
    var pos = _vec3_tmp;
    var rock = rock_wrapper.rock;

    pos[0] = 4 * 8 * Math.random() - 16;
    pos[1] = 4 * 8 * Math.random() - 16;
    pos[2] = 4 * 4 * Math.random() + 8;
    m_trans.set_translation_v(rock, pos);

    rock_wrapper.falling_time = 0;
    rock_wrapper.terrain_type = TT_NONE;
}

function set_mark(mark, pos, ray_dist) {
    pos[2] += 0.1;
    m_trans.set_translation_v(mark, pos);
    m_trans.set_scale(mark, 1 - ray_dist);
}

function setup_lava(elapsed_sensor) {
    var time_in_lava = 0;
    var char_wrapper = m_char.get_wrapper();

    function lava_cb(obj, id, pulse) {
        if (pulse == 1) {
            m_scs.show_object(char_wrapper.foot_smoke);
            var elapsed = m_ctl.get_sensor_value(obj, id, 1);
            time_in_lava += elapsed;

            if (time_in_lava >= m_conf.LAVA_DAMAGE_INTERVAL) {

                if (elapsed < m_conf.LAVA_DAMAGE_INTERVAL)
                    var damage = 1;
                else
                    var damage = Math.floor(elapsed / m_conf.LAVA_DAMAGE_INTERVAL);

                if (m_bonuses.lava_protect_time_left() <= 0)
                    m_char.change_hp(-damage);
                time_in_lava = 0;
            }
        } else {
            m_scs.hide_object(char_wrapper.foot_smoke);
            time_in_lava = 0;
        }
    }

    var lava_ray = m_ctl.create_ray_sensor(char_wrapper.phys_body, [0, 0, 0],
            [0, 0, -m_conf.CHAR_RAY_LENGTH], "LAVA", true);

    m_ctl.remove_sensor_manifold(char_wrapper.phys_body, "LAVA_COLLISION");

    m_ctl.create_sensor_manifold(char_wrapper.phys_body, "LAVA_COLLISION",
        m_ctl.CT_CONTINUOUS, [lava_ray, elapsed_sensor],
        function(s) {return s[0]}, lava_cb);

    if (_level_conf.LEVEL_NAME == "dungeon") {
        var lava_obj = m_scs.get_object_by_dupli_name("level_02_enviroment", "lava");
        m_anim.apply_def(lava_obj);
        m_anim.set_behavior(lava_obj, m_anim.AB_FINISH_STOP);
        m_anim.stop(lava_obj);
        m_anim.set_frame(lava_obj, 0);
        var lava_death_ctrl = m_scs.get_object_by_dupli_name("lava_death_controller",
                                                             "lava_death_controller");
        m_anim.apply_def(lava_death_ctrl);
    }
}

exports.disable_environment = function () {
    for (var i = 0; i < _rock_wrappers.length; i++) {
        var rock_wrapper = _rock_wrappers[i];
        var rock = rock_wrapper.rock;
        var mark = rock_wrapper.mark;
        m_ctl.remove_sensor_manifold(rock);
        set_random_rock_position(rock_wrapper);
        m_trans.set_translation_v(mark, m_conf.DEFAULT_POS);
    }
    _rock_wrappers.length = 0;
}

})
