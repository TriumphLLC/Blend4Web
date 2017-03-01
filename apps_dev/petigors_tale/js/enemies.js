"use strict"

if (b4w.module_check("enemies"))
    throw "Failed to register module: enemies";

b4w.register("enemies", function(exports, require) {

var m_ctl   = require("controls");
var m_scs   = require("scenes");
var m_anim  = require("animation");
var m_sfx   = require("sfx");
var m_trans = require("transform");
var m_util  = require("util");
var m_vec3  = require("vec3");
var m_quat  = require("quat");

var m_conf     = require("game_config");
var m_char     = require("character");
var m_combat   = require("combat");
var m_obelisks = require("obelisks");
var m_bonuses  = require("bonuses");
var m_gems     = require("gems");

var m_phy      = require("physics");

var _level_conf = null; // specified during initialization

var _enemies_wrappers = [];

var _vec3_tmp   = new Float32Array(3);
var _vec3_tmp_2 = new Float32Array(3);
var _vec3_tmp_3 = new Float32Array(3);
var _quat4_tmp  = new Float32Array(4);
var _quat4_tmp2 = new Float32Array(4);

var _golems_spawn_timer = 0;

var ZERO_VEC = new Float32Array(3);

exports.init = function(elapsed_sensor, level_conf) {
    _level_conf = level_conf;
    _golems_spawn_timer = m_conf.GOLEMS_SPAWN_INTERVAL;
    _enemies_wrappers.length = 0;

    function char_ray_cb(golem_wrapper, id, pulse) {
        var value = m_ctl.get_sensor_value(golem_wrapper, "CHAR_RAY", 0);
        var payload = m_ctl.get_sensor_payload(golem_wrapper, "CHAR_RAY", 0);
        if (value == 0)
            golem_wrapper.can_see_char = true;
        else
            golem_wrapper.can_see_char = false;
        var ray_id = payload.ray_test_id;
        var char_wrapper = m_char.get_wrapper();
        var char_trans = m_trans.get_translation(char_wrapper.phys_body, _vec3_tmp);
        var golem_trans = m_trans.get_translation(golem_wrapper.empty, _vec3_tmp_2);
        m_phy.change_ray_test_from_to(ray_id, golem_trans, char_trans);
    }

    for (var i = 0; i < _level_conf.GOLEMS_EMPTIES.length; i++) {

        var empty_name = _level_conf.GOLEMS_EMPTIES[i];

        var empty = m_scs.get_object_by_name(empty_name);
        var golem = m_scs.get_object_by_dupli_name(empty_name, "golem_collider");
        var rig = m_scs.get_object_by_dupli_name(empty_name, "golem_armature");

        if (!golem || !rig || !empty)
            continue;

        var golem_wrapper = init_enemy_wrapper(golem, rig, empty);

        var type = golem["name"].indexOf("lava") != -1 ?
            "lava":
            "stone";

        set_unit_params(golem_wrapper, type);

        var gound_ray_sens = m_ctl.create_ray_sensor(golem, ZERO_VEC, [0, 0, -10],
                                               "GROUND", false, false, true);
        var common_ray_sens = m_ctl.create_ray_sensor(null, ZERO_VEC, [0, 0, -10],
                                               "COMMON", true, false, true);

        m_ctl.create_sensor_manifold(golem_wrapper, "CHAR_RAY", m_ctl.CT_CONTINUOUS,
                 [common_ray_sens], function(s){return true},
                 char_ray_cb);
        m_ctl.create_sensor_manifold(golem_wrapper, "GOLEM", m_ctl.CT_CONTINUOUS,
                 [elapsed_sensor, gound_ray_sens], function(s){return true},
                 golem_ai_cb);

        _enemies_wrappers.push(golem_wrapper);
        m_combat.append_enemy(golem_wrapper);
    }
    init_spawn(elapsed_sensor);
}

function init_enemy_wrapper(body, rig, empty) {
    return {
        // constant
        body: body,
        rig: rig,
        empty: empty,

        height: 0,
        type: m_conf.EN_TYPE_GOLEM_LAVA,
        view_distance: 10,

        walk_speaker: null,
        attack_speaker: null,
        hit_speaker: null,
        getout_speaker: null,
        death_empty_name: null,

        // variable
        hp: m_conf.GOLEM_HP,
        speed: m_conf.GOLEM_SPEED,
        island_id: -1,
        dest_point: -1,
        prev_dest: -1,
        dest_pos: new Float32Array(3),
        dist_to_ground: 0,

        can_see_char: false,

        last_target: m_conf.GT_POINT,

        state: m_conf.GS_NONE,

        attack_point: new Float32Array(3),
        attack_done: false
    }
}

function set_unit_params(wrapper, type) {
    var empty_name = wrapper.empty.name;
    wrapper.walk_speaker = m_scs.get_object_by_dupli_name(empty_name,
                                              m_conf.GOLEM_WALK_SPEAKER);
    wrapper.attack_speaker = m_scs.get_object_by_dupli_name(empty_name,
                                              m_conf.GOLEM_ATTACK_SPEAKER);
    wrapper.hit_speaker = m_scs.get_object_by_dupli_name(empty_name,
                                              m_conf.GOLEM_HIT_SPEAKER);
    wrapper.getout_speaker = m_scs.get_object_by_dupli_name(empty_name,
                                              m_conf.GOLEM_GETOUT_SPEAKER);

    switch (type) {
    case "lava":
        wrapper.type = m_conf.EN_TYPE_GOLEM_LAVA;
        break;
    case "stone":
        wrapper.type = m_conf.EN_TYPE_GOLEM_STONE;
        break;
    default:
        break;
    }

    wrapper.death_anim = "golem_death";
    wrapper.walk_anim = "golem_walk";
    wrapper.atack_anim = ["golem_atack_01", "golem_atack_02", "golem_atack_03"];
    wrapper.getout_anim = "golem_" + type + "_getout";
    wrapper.death_empty_name = "golem_" + type + "_death";

    var bb = m_trans.get_object_bounding_box(wrapper.body);
    wrapper.height = bb.max_z - bb.min_z;
}

function golem_ai_cb(golem_wrapper, id, pulse) {
    if (golem_wrapper.hp <= 0) {
        kill(golem_wrapper);
        return;
    }

    if (m_char.get_wrapper().state == m_conf.CH_VICTORY)
        return;

    var ray_dist = m_ctl.get_sensor_value(golem_wrapper, id, 1);
    golem_wrapper.dist_to_ground = ray_dist * 10 - golem_wrapper.height / 2;

    switch (golem_wrapper.state) {
    case m_conf.GS_ATTACKING:
        process_attack(golem_wrapper);
        break;
    case m_conf.GS_WALKING:
        var elapsed = m_ctl.get_sensor_value(golem_wrapper, id, 0);
        move(golem_wrapper, elapsed);
        break;
    default:
        break;
    }
}

function init_spawn(elapsed_sensor) {

    var lava_spawn_points = [];
    var stone_spawn_points = [];
    var lava_spawn_quats = [];
    var stone_spawn_quats = [];

    for (var i = 0; i < _level_conf.LAVA_GOLEM_SPAWN_POINTS.length; i++) {
        var spawn_obj = m_scs.get_object_by_name(_level_conf.LAVA_GOLEM_SPAWN_POINTS[i]);
        var spawn_pos = m_trans.get_translation(spawn_obj);
        var spawn_rot = m_trans.get_rotation(spawn_obj);
        lava_spawn_points.push(spawn_pos);
        lava_spawn_quats.push(spawn_rot);
    }
    if (_level_conf.STONE_GOLEM_SPAWN_POINTS)
        for (var i = 0; i < _level_conf.STONE_GOLEM_SPAWN_POINTS.length; i++) {
            var spawn_obj = m_scs.get_object_by_name(_level_conf.STONE_GOLEM_SPAWN_POINTS[i]);
            var spawn_pos = m_trans.get_translation(spawn_obj);
            var spawn_rot = m_trans.get_rotation(spawn_obj);
            stone_spawn_points.push(spawn_pos);
            stone_spawn_quats.push(spawn_rot);
        }

    function golems_spawn_cb(obj, id) {

        var golem_wrapper = get_first_free_golem();
        if (!golem_wrapper)
            return;

        var elapsed = m_ctl.get_sensor_value(obj, id, 0);
        _golems_spawn_timer -= elapsed;

        if (_golems_spawn_timer <= 0) {
            _golems_spawn_timer = m_conf.GOLEMS_SPAWN_INTERVAL;

            if (_level_conf.LEVEL_NAME == "volcano") {
                var island_id = get_random_available_island();
                if (island_id == null) // no available islands
                    return;
            } else {
                var island_id = 0;
            }

            if (golem_wrapper.type == m_conf.EN_TYPE_GOLEM_LAVA)
                spawn(golem_wrapper, island_id, lava_spawn_points, lava_spawn_quats);
            else
                spawn(golem_wrapper, island_id, stone_spawn_points, stone_spawn_quats);

        }
    }
    m_ctl.create_sensor_manifold(null, "GOLEMS_SPAWN", m_ctl.CT_CONTINUOUS,
                                 [elapsed_sensor], null, golems_spawn_cb);
}

function spawn(golem_wrapper, island_id, spawn_points, spawn_quats) {
    var golem_empty = golem_wrapper.empty;

    var num_spawns = _level_conf.LEVEL_NAME == "volcano" ? 
        spawn_points.length / _level_conf.NUM_OBELISKS:
        spawn_points.length;

    var spawn_id = Math.floor(Math.random() * num_spawns);
    var spawn_pt_id = num_spawns * island_id + spawn_id;
    var spawn_point = spawn_points[spawn_pt_id];
    var spawn_quat = spawn_quats[spawn_pt_id];

    m_trans.set_translation_v(golem_empty, spawn_point);
    m_trans.set_rotation_v(golem_empty, spawn_quat);

    set_state(golem_wrapper, m_conf.GS_GETTING_OUT)

    m_sfx.play_def(golem_wrapper.getout_speaker);

    if (_level_conf.LEVEL_NAME == "volcano") {
        golem_wrapper.island_id = island_id;
        m_vec3.copy(spawn_point, golem_wrapper.dest_pos);
    } else
        set_nearest_dest_point(golem_wrapper, spawn_point);
}

function kill(golem_wrapper) {
    var golem = golem_wrapper.empty;
    var golem_death_empty = m_scs.get_object_by_name(golem_wrapper.death_empty_name);
    var golem_death = m_scs.get_object_by_dupli_name(golem_wrapper.death_empty_name,
                                                     m_conf.GOLEM_DEATH_RIG);
    var golem_death_blow = m_scs.get_object_by_dupli_name(golem_wrapper.death_empty_name,
                                                          m_conf.GOLEM_DEATH_BLOW);
    var trans = _vec3_tmp;
    var quat = _quat4_tmp;

    m_trans.get_translation(golem, trans);
    m_trans.get_rotation(golem, quat);
    m_trans.set_translation_v(golem_death_empty, trans);
    m_trans.set_rotation_v(golem_death_empty, quat);

    m_anim.apply(golem_death, golem_wrapper.death_anim);
    m_anim.set_behavior(golem_death, m_anim.AB_FINISH_STOP);
    m_anim.play(golem_death);

    m_anim.play(golem_death_blow);
    m_sfx.stop(golem_wrapper.walk_speaker);

    m_trans.set_translation_v(golem, m_conf.DEFAULT_POS);
    m_gems.spawn(trans);

    if (_level_conf.LEVEL_NAME == "volcano") {
        var island_id = golem_wrapper.island_id;
        golem_wrapper.island_id = -1;
        m_obelisks.try_to_capture(island_id);
    }
    golem_wrapper.hp = 100;
    set_state(golem_wrapper, m_conf.GS_NONE)
}

function process_attack(golem_wrapper) {
    if (!golem_wrapper.attack_done) {
        var frame = m_anim.get_frame(golem_wrapper.rig);
        if (frame >= m_conf.GOLEM_ATTACK_ANIM_FRAME) {
            if (golem_wrapper.last_target == m_conf.GT_CHAR)
                process_golem_char_attack(golem_wrapper);
            else if (golem_wrapper.last_target == m_conf.GT_OBELISK)
                process_golem_obelisk_attack(golem_wrapper);
            golem_wrapper.attack_done = true;
        }
    }
}

function process_golem_char_attack(golem_wrapper) {

    if(!m_combat.check_attack(golem_wrapper.attack_point,
       m_char.get_wrapper().phys_body, m_conf.GOLEM_ATTACK_DIST))
        return;

    var damage = m_conf.GOLEM_ATTACK_STRENGTH;
    if (m_bonuses.shield_time_left() > 0)
        damage *= m_conf.BONUS_SHIELD_EFFECT
    m_char.change_hp(-damage);
    m_sfx.play_def(golem_wrapper.hit_speaker);
}

function process_golem_obelisk_attack(golem_wrapper) {
    var island_id = golem_wrapper.island_id;

    if (m_obelisks.num_gems(island_id))
        m_obelisks.damage_obelisk(island_id);
    m_sfx.play_def(golem_wrapper.hit_speaker);
}

function move(golem_wrapper, elapsed) {

    var char_wrapper = m_char.get_wrapper();

    if (_level_conf.LEVEL_NAME == "volcano") {
        var island_id = golem_wrapper.island_id;
        if (char_wrapper.island == island_id && char_wrapper.hp > 0) {
            attack_target(golem_wrapper, char_wrapper.phys_body, elapsed);
            golem_wrapper.last_target = m_conf.GT_CHAR;
        } else if (m_obelisks.num_gems(island_id)) {
            var obelisk = get_obelisk_by_island_id(island_id);
            attack_target(golem_wrapper, obelisk, elapsed);
            golem_wrapper.last_target = m_conf.GT_OBELISK;
        } else {
            patrol(golem_wrapper, elapsed);
        }
    } else if (_level_conf.LEVEL_NAME == "dungeon") {
         if (char_wrapper.hp > 0 &&
                m_combat.check_visibility(golem_wrapper, char_wrapper) &&
                golem_wrapper.can_see_char) {
            attack_target(golem_wrapper, char_wrapper.phys_body, elapsed);
            golem_wrapper.last_target = m_conf.GT_CHAR;
        } else {
            patrol(golem_wrapper, elapsed);
        }
    } else {
        patrol(golem_wrapper, elapsed);
    }
}

function attack_target(golem_wrapper, target, elapsed) {

    var golem_empty = golem_wrapper.empty;
    var trans       = _vec3_tmp;
    var targ_trans  = _vec3_tmp_2;

    m_trans.get_translation(golem_empty, trans);
    m_trans.get_translation(target, targ_trans);
    targ_trans[2] = trans[2];
    m_vec3.copy(targ_trans, golem_wrapper.dest_pos);

    var dist_to_targ = m_vec3.distance(trans, targ_trans);
    var angle_to_targ = rotate_to_dest(golem_wrapper, elapsed);

    if ((Math.abs(angle_to_targ) < Math.PI / 6) &&
            (dist_to_targ >= m_conf.GOLEM_ATTACK_DIST))
        translate(golem_wrapper, elapsed);
    else if (Math.abs(angle_to_targ) < 0.05 * Math.PI)
        perform_attack(golem_wrapper);

    if (golem_wrapper.type == m_conf.EN_TYPE_GOLEM_STONE) {
        m_anim.set_speed(golem_wrapper.rig, m_conf.STONE_GOLEMS_SP_MULT);
        golem_wrapper.speed = m_conf.GOLEM_SPEED * m_conf.STONE_GOLEMS_SP_MULT;
    }
}

function perform_attack(golem_wrapper) {

    var golem_empty = golem_wrapper.empty;
    var at_pt       = golem_wrapper.attack_point;
    var trans       = _vec3_tmp;
    var cur_dir     = _vec3_tmp_2;

    golem_wrapper.attack_done = false;
    set_state(golem_wrapper, m_conf.GS_ATTACKING)

    m_trans.get_translation(golem_empty, trans);
    m_vec3.scaleAndAdd(trans, cur_dir, m_conf.GOLEM_ATTACK_DIST, at_pt);
    at_pt[2] += golem_wrapper.height / 2; // raise attack point a bit

    if (m_sfx.is_playing(golem_wrapper.walk_speaker))
        m_sfx.stop(golem_wrapper.walk_speaker);

    m_sfx.play_def(golem_wrapper.attack_speaker);
}

function patrol(golem_wrapper, elapsed) {
    m_anim.set_speed(golem_wrapper.rig, 1)
    golem_wrapper.speed = m_conf.GOLEM_SPEED;
    set_dest_point(golem_wrapper);
    var ang_to_dest = rotate_to_dest(golem_wrapper, elapsed);
    if (Math.abs(ang_to_dest) < Math.PI / 6)
        translate(golem_wrapper, elapsed);
}

function set_dest_point(golem_wrapper) {

    var golem_empty = golem_wrapper.empty;
    var dest_pos = golem_wrapper.dest_pos;

    var trans = _vec3_tmp;

    m_trans.get_translation(golem_empty, trans);

    var dist_to_dest = hor_distance(trans, dest_pos);
    if (dist_to_dest > 0.05 && golem_wrapper.last_target == m_conf.GT_POINT)
        return;

    golem_set_random_destination(golem_wrapper, trans);
    golem_wrapper.last_target = m_conf.GT_POINT;
}

function hor_distance(vec1, vec2) {
    var tmp_z = vec1[2];
    vec1[2] = vec2[2];
    var dist = m_vec3.distance(vec1, vec2);
    vec1[2] = tmp_z;
    return dist;
}

function golem_set_random_destination(golem_wrapper, trans) {
    if (_level_conf.LEVEL_NAME == "volcano")
        set_destination_by_island(golem_wrapper, trans);
    else {
        if (golem_wrapper.last_target == m_conf.GT_CHAR)
            set_nearest_dest_point(golem_wrapper, trans);
        else
            set_destination_by_id(golem_wrapper, trans);
    }
}

function set_destination_by_island(golem_wrapper, trans) {
    var dest_pos = golem_wrapper.dest_pos;
    var dest_point = golem_wrapper.dest_point;

    var island_id = golem_wrapper.island_id;
    var patrol_points = _level_conf.GOLEM_PATROL_POINTS;
    var num_points = patrol_points.length / _level_conf.NUM_OBELISKS;

    var rand = Math.random();
    var point_ind = Math.floor(num_points * rand);
    var pind = 0;

    for (var i = 0; i < num_points; i++) {
        if (i != dest_point && pind++ == point_ind) {
            var new_pind  = num_points * island_id + i;
            var point_name = patrol_points[new_pind];
            var point_obj  = m_scs.get_object_by_name(point_name);
            m_trans.get_translation(point_obj, dest_pos);
            dest_pos[2] = trans[2];

            golem_wrapper.prev_dest = dest_point;
            golem_wrapper.dest_point = i;
            return;
        }
    }
    golem_wrapper.dest_point = -1;
}

function set_destination_by_id(golem_wrapper, trans) {
    var dest_pos = golem_wrapper.dest_pos;
    var dest_point = golem_wrapper.dest_point;

    var patrol_points = _level_conf.GOLEM_PATROL_POINTS;
    var patrol_inds = _level_conf.GOLEM_PATROL_MAP[dest_point];
    var num_points = patrol_inds.length - 1;

    var rand = Math.random();
    var point_ind = patrol_inds[Math.floor(num_points * rand)];

    var point_name = patrol_points[point_ind];
    var point_obj  = m_scs.get_object_by_name(point_name);
    m_trans.get_translation(point_obj, dest_pos);
    dest_pos[2] = trans[2];

    golem_wrapper.prev_dest = dest_point;
    golem_wrapper.dest_point = point_ind;
}

function set_nearest_dest_point(golem_wrapper, trans) {
    var patrol_points = _level_conf.GOLEM_PATROL_POINTS;
    var num_points = patrol_points.length;
    var dest_pos = golem_wrapper.dest_pos;

    var min_dist = 1000;
    var min_id = -1;

    for (var i = 0; i < num_points; i++) {
        var point_name = patrol_points[i];
        var point_obj  = m_scs.get_object_by_name(point_name);
        m_trans.get_translation(point_obj, _vec3_tmp_2);
        var dist = m_vec3.distance(_vec3_tmp_2, trans);
        if (dist < min_dist) {
            min_dist = dist;
            min_id = i;
            m_vec3.copy(_vec3_tmp_2, dest_pos);
            dest_pos[2] = trans[2];
        }
    }
    golem_wrapper.dest_point = min_id;
}

function rotate_to_dest(golem_wrapper, elapsed) {

    var golem_empty = golem_wrapper.empty;
    var dest_pos = golem_wrapper.dest_pos;

    var trans       = _vec3_tmp;
    var cur_dir     = _vec3_tmp_2;
    var dir_to_dest = _vec3_tmp_3;
    var cur_rot_q   = _quat4_tmp;
    var new_rot_q   = _quat4_tmp2;

    m_trans.get_translation(golem_empty, trans);
    m_trans.get_rotation(golem_empty, cur_rot_q);
    m_vec3.transformQuat(m_util.AXIS_MY, cur_rot_q, cur_dir);

    m_vec3.subtract(dest_pos, trans, dir_to_dest);
    dir_to_dest[2] = 0;
    m_vec3.normalize(dir_to_dest, dir_to_dest);

    m_quat.rotationTo(cur_dir, dir_to_dest, new_rot_q);
    m_quat.multiply(new_rot_q, cur_rot_q, new_rot_q);

    var vec_dot = m_vec3.dot(cur_dir, dir_to_dest);
    vec_dot = vec_dot > 1? 1: vec_dot < -1? -1: vec_dot;

    var angle_to_turn = Math.acos(vec_dot);
    var angle_ratio   = Math.abs(angle_to_turn) / Math.PI;
    var slerp         = elapsed / angle_ratio * m_conf.GOLEM_ROT_SPEED;

    m_quat.slerp(cur_rot_q, new_rot_q, Math.min(slerp, 1), new_rot_q);
    m_trans.set_rotation_v(golem_empty, new_rot_q);

    return angle_to_turn;
}

function translate(golem_wrapper, elapsed) {
    var trans     = _vec3_tmp;
    var cur_dir   = _vec3_tmp_2;
    var cur_rot_q = _quat4_tmp;

    var empty = golem_wrapper.empty;
    var walk_speaker = golem_wrapper.walk_speaker;

    m_trans.get_rotation(empty, cur_rot_q);
    m_trans.get_translation(empty, trans);

    m_vec3.transformQuat(m_util.AXIS_MY, cur_rot_q, cur_dir);
    m_vec3.scaleAndAdd(trans, cur_dir, golem_wrapper.speed * elapsed, trans);
    
    var delta = elapsed / 3;

    if (golem_wrapper.dist_to_ground > delta)
        var z_correction = delta;
    else if (golem_wrapper.dist_to_ground < -delta)
        var z_correction = -delta;
    else 
        var z_correction = delta;

    trans[2] -= z_correction;
    m_trans.set_translation_v(empty, trans);

    if (!m_sfx.is_playing(walk_speaker)) {
        m_sfx.play_def(walk_speaker);
        m_sfx.cyclic(walk_speaker, true);
    }
}

function set_state(golem_wrapper, state) {
    var golem_rig = golem_wrapper.rig;
    switch (state) {
    case m_conf.GS_WALKING:
        m_anim.apply(golem_rig, golem_wrapper.walk_anim)
        m_anim.set_behavior(golem_rig, m_anim.AB_CYCLIC);
        m_anim.play(golem_rig);
        break;
    case m_conf.GS_ATTACKING:
        var rand = Math.floor(golem_wrapper.atack_anim.length
                              * Math.random());
        m_anim.apply(golem_rig, golem_wrapper.atack_anim[rand]);
        m_anim.play(golem_rig, function() {
            if (golem_wrapper.state != m_conf.GS_NONE)
                set_state(golem_wrapper, m_conf.GS_WALKING);
        });
        break;
    case m_conf.GS_GETTING_OUT:
        m_anim.apply(golem_rig, golem_wrapper.getout_anim);
        m_anim.play(golem_rig, function() {
            if (golem_wrapper.state != m_conf.GS_NONE)
                set_state(golem_wrapper, m_conf.GS_WALKING)
        });
        break;
    }
    golem_wrapper.state = state;
}

function get_first_free_golem() {
    for (var i = 0; i < _enemies_wrappers.length; i++) {
        var gw = _enemies_wrappers[i];
        if (gw.state == m_conf.GS_NONE)
            return gw;
    }
    return null;
}

function get_random_available_island() {
    var num_free = _level_conf.NUM_OBELISKS;
    for (var i = 0; i < _enemies_wrappers.length; i++) {
        if (!is_available_island(i))
            num_free--;
    }

    if (num_free == 0)
        return null;

    var id = Math.floor(Math.random() * num_free);

    var free_id = 0;
    for (var i = 0; i < _level_conf.NUM_OBELISKS; i++) {
        if (is_available_island(i) && free_id++ == id)
                return i;
    }
    return null;
}

function is_available_island(island_id) {

    if (m_obelisks.is_filled(island_id))
        return false;

    for (var i = 0; i < _enemies_wrappers.length; i++)
        if (_enemies_wrappers[i].island_id == island_id)
            return false;

    return true;
}

function get_obelisk_by_island_id(island_id) {
    var obelisk = m_scs.get_object_by_dupli_name("obelisk_" + island_id,
                                                 "obelisk");
    return obelisk;
}

exports.reset = function() {
    _golems_spawn_timer = m_conf.GOLEMS_SPAWN_INTERVAL;
    for (var i = 0; i < _enemies_wrappers.length; i++) {
        var gw = _enemies_wrappers[i];
        gw.island_id = -1;
        set_state(gw, m_conf.GS_NONE)
        var golem = gw.empty;
        m_trans.set_translation_v(golem, m_conf.DEFAULT_POS);
        m_sfx.stop(gw.walk_speaker);
    }
}

// for volcano level
exports.island_has_enemies = function(island_id) {
    for (var i = 0; i < _enemies_wrappers.length; i++)
        if (_enemies_wrappers[i].island_id == island_id)
            return true;

    return false;
}

})
