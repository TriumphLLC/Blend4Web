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

var m_char = require("character");
var m_conf = require("game_config");
var m_bonuses = require("bonuses");

var _vec3_tmp = new Float32Array(3);

exports.setup_falling_rocks = function(elapsed_sensor) {

    var falling_time = {};

    function rock_fall_cb(obj, id, pulse) {
        var elapsed = m_ctl.get_sensor_value(obj, id, 0);
        var obj_name = m_scs.get_object_name(obj);
        falling_time[obj_name] += elapsed;

        if (falling_time[obj_name] <= m_conf.ROCK_FALL_DELAY)
            return;

        var rock_pos = _vec3_tmp;
        m_trans.get_translation(obj, rock_pos);
        rock_pos[2] -= m_conf.ROCK_SPEED * elapsed;
        m_trans.set_translation_v(obj, rock_pos);
    }

    function rock_crush_cb(obj, id, pulse, params) {
        var char_pos = _vec3_tmp;
        var burst_emitter = params[0];
        var crush_speaker = params[1];

        var char_wrapper = m_char.get_wrapper();
        m_trans.get_translation(char_wrapper.phys_body, char_pos);

        var sensor_id = m_ctl.get_sensor_value(obj, id, 0)? 0: 1;

        var collision_pt = m_ctl.get_sensor_payload(obj, id, sensor_id).coll_pos;
        var dist_to_rock = m_vec3.distance(char_pos, collision_pt);

        m_trans.set_translation_v(burst_emitter, collision_pt);
        m_anim.set_frame(burst_emitter, 0, m_anim.SLOT_ALL);
        m_anim.play(burst_emitter, null, m_anim.SLOT_ALL);

        set_random_rock_position(obj);

        if (dist_to_rock < m_conf.ROCK_DAMAGE_RADIUS) {
            var damage = -m_conf.ROCK_DAMAGE
            if (m_bonuses.shield_time_left() > 0)
                damage *= m_conf.BONUS_SHIELD_EFFECT
            m_char.change_hp(damage);
        }

        var obj_name = m_scs.get_object_name(obj);
        falling_time[obj_name] = 0;

        var should_spawn_bonus = Math.random() < m_conf.BONUS_SPAWN_CHANCE;

        // spawn bonus only for lava collision
        should_spawn_bonus = should_spawn_bonus && sensor_id == 0;
        if (should_spawn_bonus)
            m_bonuses.spawn(collision_pt);

        m_sfx.play_def(crush_speaker);
    }

    function mark_pos_cb(obj, id, pulse, mark) {

        var sensor_id = m_ctl.get_sensor_value(obj, id, 0)? 0: 1;
        var ray_dist = m_ctl.get_sensor_payload(obj, id, sensor_id).hit_fract;

        var mark_pos = _vec3_tmp;
        var obj_name = m_scs.get_object_name(obj);

        if (falling_time[obj_name] <= m_conf.ROCK_FALL_DELAY) {
            m_trans.get_translation(obj, mark_pos);
            mark_pos[2] -= ray_dist * m_conf.ROCK_RAY_LENGTH - 0.01;
            m_trans.set_translation_v(mark, mark_pos);
        }

        m_trans.set_scale(mark, 1 - ray_dist);
    }

    for (var i = 0; i < m_conf.ROCK_EMPTIES.length; i++) {

        var dupli_name = m_conf.ROCK_EMPTIES[i];

        for (var j = 0; j < m_conf.ROCK_NAMES.length; j++) {
            
            var rock_name  = m_conf.ROCK_NAMES[j];
            var burst_name = m_conf.BURST_EMITTER_NAMES[j];
            var mark_name  = m_conf.MARK_NAMES[j];

            var rock  = m_scs.get_object_by_dupli_name(dupli_name, rock_name);
            var burst = m_scs.get_object_by_dupli_name(dupli_name, burst_name);
            var mark  = m_scs.get_object_by_dupli_name(dupli_name, mark_name);
            var speaker = m_scs.get_object_by_dupli_name(dupli_name,
                                                         m_conf.ROCK_HIT_SPEAKERS[j]);

            var coll_sens_lava = m_ctl.create_collision_sensor(rock, "LAVA", true);
            var coll_sens_island = m_ctl.create_collision_sensor(rock, "ISLAND", true);

            var ray_sens_island = m_ctl.create_ray_sensor(rock, [0, 0, 0],
                                        [0, 0, -m_conf.ROCK_RAY_LENGTH], "ISLAND", true);
            var ray_sens_lava = m_ctl.create_ray_sensor(rock, [0, 0, 0],
                                        [0, 0, -m_conf.ROCK_RAY_LENGTH], "LAVA", true);

            m_ctl.create_sensor_manifold(rock, "ROCK_FALL", m_ctl.CT_CONTINUOUS,
                                         [elapsed_sensor], null, rock_fall_cb);

            m_ctl.create_sensor_manifold(rock, "ROCK_CRASH", m_ctl.CT_SHOT,
                                         [coll_sens_island, coll_sens_lava],
                    function(s){return s[0] || s[1]}, rock_crush_cb, [burst, speaker]);

            m_ctl.create_sensor_manifold(rock, "MARK_POS", m_ctl.CT_CONTINUOUS,
                                        [ray_sens_island, ray_sens_lava],
                    function(s){return s[0] || s[1]}, mark_pos_cb, mark);

            set_random_rock_position(rock);
            rock_name = m_scs.get_object_name(rock);
            falling_time[rock_name] = 0;
        }
    }
}

function set_random_rock_position(rock) {
    var pos = _vec3_tmp;
    pos[0] = 8 * Math.random() - 4;
    pos[1] = 8 * Math.random() - 4;
    pos[2] = 4 * Math.random() + 2;
    m_trans.set_translation_v(rock, pos);
}


exports.setup_lava = function (elapsed_sensor) {
    var time_in_lava = 0;

    function lava_cb(obj, id, pulse, param) {
        if (pulse == 1) {

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
            time_in_lava = 0;
        }
    }

    var char_wrapper = m_char.get_wrapper();
    var lava_ray = m_ctl.create_ray_sensor(char_wrapper.phys_body, [0, 0, 0], [0, 0, -0.30],
                                           "LAVA", true);

    m_ctl.create_sensor_manifold(char_wrapper.phys_body, "LAVA_COLLISION",
        m_ctl.CT_CONTINUOUS, [lava_ray, elapsed_sensor],
        function(s) {return s[0]}, lava_cb);

}

exports.disable_environment = function () {
    for (var i = 0; i < m_conf.ROCK_EMPTIES.length; i++) {
        var dupli_name = m_conf.ROCK_EMPTIES[i];
        for (var j = 0; j < m_conf.ROCK_NAMES.length; j++) {
            var rock_name  = m_conf.ROCK_NAMES[j];
            var mark_name  = m_conf.MARK_NAMES[j];
            var rock  = m_scs.get_object_by_dupli_name(dupli_name, rock_name);
            var mark  = m_scs.get_object_by_dupli_name(dupli_name, mark_name);
            m_ctl.remove_sensor_manifold(rock);
            set_random_rock_position(rock);
            m_trans.set_translation_v(mark, m_conf.DEFAULT_POS);
        }
    }
}

})
