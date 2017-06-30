"use strict"

if (b4w.module_check("character"))
    throw "Failed to register module: character";

b4w.register("character", function(exports, require) {

var m_ctl = require("controls");
var m_scs = require("scenes");
var m_time  = require("time");
var m_phy = require("physics");
var m_anim = require("animation");
var m_sfx = require("sfx");
var m_trans = require("transform");
var m_util  = require("util");
var m_vec3  = require("vec3");
var m_cons  = require("constraints");

var m_conf = require("game_config");
var m_combat = require("combat");
var m_interface = require("interface");
var m_bonuses = require("bonuses");
var m_env = require("environment");

var _char_run_spk = null;
var _char_attack_spk = null;
var _char_hit_spk = null;
var _char_land_spk = null;
var _gem_pickup_spk = null;
var _char_jump_spks = [];
var _char_voice_attack_spks = [];
var _char_hurt_spks = [];


var _char_wrapper = null;

var _last_hurt_sound = -100;

var _vec3_tmp = new Float32Array(3);
var _vec3_tmp_2 = new Float32Array(3);
var _vec3_tmp_3 = new Float32Array(3);
var _quat4_tmp = new Float32Array(4);

exports.init_wrapper = function() {
    _char_wrapper = {
        phys_body: m_scs.get_first_character(),
        rig:    m_scs.get_object_by_dupli_name("character", "character_rig"),
        body:   m_scs.get_object_by_dupli_name("character", "character_body"),
        picker: m_scs.get_object_by_dupli_name("character", "character_picker"),
        shield_sphere: m_scs.get_object_by_dupli_name("character",
                                                      "shield_sphere"),
        hp:    m_conf.MAX_CHAR_HP,
        state: m_conf.CH_STILL,
        gem_slot: null,
        island: -1
    };
}

exports.setup_controls = function (elapsed_sensor) {

    precache_speakers();
    init_island_detection();

    var right_arrow = m_ctl.create_custom_sensor(0);
    var left_arrow  = m_ctl.create_custom_sensor(0);
    var up_arrow    = m_ctl.create_custom_sensor(0);
    var down_arrow  = m_ctl.create_custom_sensor(0);
    var touch_jump  = m_ctl.create_custom_sensor(0);
    var touch_attack = m_ctl.create_custom_sensor(0);

    var on_ground_sens = m_ctl.create_custom_sensor(0);

    setup_ground_sensor(on_ground_sens);

    if(detect_mobile()) {
        m_interface.setup_touch_controls(right_arrow, up_arrow, left_arrow,
                                         down_arrow, touch_jump, touch_attack);
    }

    setup_movement(up_arrow, down_arrow, on_ground_sens);
    setup_rotation(right_arrow, left_arrow, elapsed_sensor);
    setup_jumping(touch_jump, on_ground_sens);
    setup_attack(touch_attack, elapsed_sensor);
}

function precache_speakers() {
    _char_run_spk = m_scs.get_object_by_dupli_name("character",
                                                   m_conf.CHAR_RUN_SPEAKER);
    _char_attack_spk = m_scs.get_object_by_dupli_name("character",
                                                     m_conf.CHAR_ATTACK_SPEAKER);
    _char_hit_spk = m_scs.get_object_by_dupli_name("character",
                                                   m_conf.CHAR_SWORD_SPEAKER);
    _char_land_spk = m_scs.get_object_by_dupli_name("character",
                                                     m_conf.CHAR_LANDING_SPEAKER);
    _gem_pickup_spk = m_scs.get_object_by_dupli_name("character",
                                                     m_conf.GEM_PICKUP_SPEAKER);
    for (var i = 0; i < m_conf.CHAR_JUMP_SPKS.length; i++) {
        var jump_spk_name = m_conf.CHAR_JUMP_SPKS[i];
        var jump_spk = m_scs.get_object_by_dupli_name("character", jump_spk_name);
        _char_jump_spks.push(jump_spk);
    }
    for (var i = 0; i < m_conf.CHAR_ATTACK_VOICE_SPKS.length; i++) {
        var attack_spk_name = m_conf.CHAR_ATTACK_VOICE_SPKS[i];
        var attack_spk = m_scs.get_object_by_dupli_name("character", attack_spk_name);
        _char_voice_attack_spks.push(attack_spk);
    }
    for (var i = 0; i < m_conf.CHAR_HURT_SPKS.length; i++) {
        var hurt_spk_name = m_conf.CHAR_HURT_SPKS[i];
        var hurt_spk = m_scs.get_object_by_dupli_name("character", hurt_spk_name);
        _char_hurt_spks.push(hurt_spk);
    }
}

function init_island_detection() {

    var isl_cb = function(obj, id, pulse) {
        if (pulse == 1)
            // get island number from the manifold name
            _char_wrapper.island = parseInt(id[id.length-1]);
        else
            _char_wrapper.island = -1;
    }

    // init sensor manifold for every island
    for (var i = 0; i < m_conf.NUM_ISLANDS; i++) {
        var coll_sens = m_ctl.create_collision_sensor(_char_wrapper.picker, "ISLAND"+i);
        m_ctl.create_sensor_manifold(_char_wrapper.picker, "ISLE_COLL"+i, m_ctl.CT_TRIGGER,
                                     [coll_sens], null, isl_cb);
    }
}

function setup_ground_sensor(ground_sens) {
    var island_sens = m_ctl.create_ray_sensor(_char_wrapper.phys_body, [0, 0, 0],
                                          [0, 0, -0.30], "ISLAND", true);
    var lava_sens = m_ctl.create_ray_sensor(_char_wrapper.phys_body, [0, 0, 0],
                                          [0, 0, -0.30], "LAVA", true);
    function ground_cb(obj, id, pulse) {
        var val = pulse == 1? 1: 0;
        m_ctl.set_custom_sensor(ground_sens, val)
    }

    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "GROUND SENS",
            m_ctl.CT_TRIGGER, [island_sens, lava_sens],
            function(s) {return s[0] || s[1]}, ground_cb);
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


function setup_movement(up_arrow, down_arrow, on_ground_sens) {
    var key_w     = m_ctl.create_keyboard_sensor(m_ctl.KEY_W);
    var key_s     = m_ctl.create_keyboard_sensor(m_ctl.KEY_S);
    var key_up    = m_ctl.create_keyboard_sensor(m_ctl.KEY_UP);
    var key_down  = m_ctl.create_keyboard_sensor(m_ctl.KEY_DOWN);

    var move_array = [
        key_w, key_up, up_arrow,
        key_s, key_down, down_arrow,
        on_ground_sens
    ];

    var forward_logic  = function(s){return (s[0] || s[1] || s[2])};
    var backward_logic = function(s){return (s[3] || s[4] || s[5])};

    function move_cb(obj, id, pulse) {

        if (_char_wrapper.state == m_conf.CH_ATTACK) {
            m_phy.set_character_move_dir(obj, 0, 0);
            return;
        }
        var island = m_ctl.get_sensor_value(obj, id, 6);

        if (pulse == 1) {
            switch(id) {
            case "FORWARD":
                var move_dir = 1;
                break;
            case "BACKWARD":
                var move_dir = -1;
                break;
            }
            if (_char_wrapper.state == m_conf.CH_STILL && island) {
                m_anim.apply(_char_wrapper.rig, "character_run");
                m_anim.play(_char_wrapper.rig);
                m_anim.set_behavior(_char_wrapper.rig, m_anim.AB_CYCLIC);
            }
            _char_wrapper.state = m_conf.CH_RUN;
        } else {
            var move_dir = 0;
            if (_char_wrapper.state == m_conf.CH_RUN && island) {
                m_anim.apply(_char_wrapper.rig, "character_idle_01");
                m_anim.set_behavior(_char_wrapper.rig, m_anim.AB_CYCLIC);
                m_anim.play(_char_wrapper.rig);
            }
            _char_wrapper.state = m_conf.CH_STILL;
        }

        if (move_dir && island) {
            if (!m_sfx.is_playing(_char_run_spk))
                m_sfx.play_def(_char_run_spk);
        } else {
            if (m_sfx.is_playing(_char_run_spk))
                m_sfx.stop(_char_run_spk);
        }

        m_phy.set_character_move_dir(obj, move_dir, 0);
    };

    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "FORWARD",
        m_ctl.CT_CONTINUOUS, move_array, forward_logic, move_cb);
    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "BACKWARD",
        m_ctl.CT_CONTINUOUS, move_array, backward_logic, move_cb);

    // skeletal animation
    m_anim.apply(_char_wrapper.rig, "character_idle_01");
    m_anim.play(_char_wrapper.rig);
    m_anim.set_behavior(_char_wrapper.rig, m_anim.AB_CYCLIC);

    // character material animation
    m_anim.apply(_char_wrapper.body, "HEAL_run");
    m_anim.apply(_char_wrapper.body, "LAVA_grow", m_anim.SLOT_1);
    m_anim.apply(_char_wrapper.body, "SHIELD_grow", m_anim.SLOT_2);
    m_anim.apply(_char_wrapper.shield_sphere, "SHIELD_GLOW_grow");

    // sound
    m_sfx.stop(_char_run_spk);
}

function setup_rotation(right_arrow, left_arrow, elapsed_sensor) {
    var key_a     = m_ctl.create_keyboard_sensor(m_ctl.KEY_A);
    var key_d     = m_ctl.create_keyboard_sensor(m_ctl.KEY_D);
    var key_left  = m_ctl.create_keyboard_sensor(m_ctl.KEY_LEFT);
    var key_right = m_ctl.create_keyboard_sensor(m_ctl.KEY_RIGHT);

    var rotate_array = [
        key_a, key_left, left_arrow,
        key_d, key_right, right_arrow,
        elapsed_sensor
    ];

    var left_logic  = function(s){return (s[0] || s[1] || s[2])};
    var right_logic = function(s){return (s[3] || s[4] || s[5])};

    function rotate_cb(obj, id, pulse) {

        if (_char_wrapper.state == m_conf.CH_ATTACK)
            return;

        var elapsed = m_ctl.get_sensor_value(obj, "LEFT", 6);

        if (pulse == 1) {
            switch(id) {
            case "LEFT":
                m_phy.character_rotation_inc(obj, elapsed * m_conf.ROT_SPEED, 0);
                break;
            case "RIGHT":
                m_phy.character_rotation_inc(obj, -elapsed * m_conf.ROT_SPEED, 0);
                break;
            }
        }
    }

    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "LEFT",
        m_ctl.CT_CONTINUOUS, rotate_array, left_logic, rotate_cb);
    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "RIGHT",
        m_ctl.CT_CONTINUOUS, rotate_array, right_logic, rotate_cb);
}

function setup_jumping(touch_jump, on_ground_sens) {
    var key_space = m_ctl.create_keyboard_sensor(m_ctl.KEY_SPACE);

    var jump_cb = function(obj, id, pulse) {
        if (_char_wrapper.state != m_conf.CH_ATTACK) {
            m_phy.character_jump(obj);
            var island = m_ctl.get_sensor_value(obj, id, 2);
            if (island) {
                id = Math.floor(2 * Math.random());
                m_sfx.play_def(_char_jump_spks[id]);

                m_anim.apply(_char_wrapper.rig, "character_jump");
                m_anim.set_behavior(_char_wrapper.rig, m_anim.AB_FINISH_STOP);
                m_anim.play(_char_wrapper.rig);
            }
        }
    }
    var landing_cb = function(obj, id, pulse) {
        m_sfx.play_def(_char_land_spk);
        if (_char_wrapper.state == m_conf.CH_STILL) {
            m_anim.apply(_char_wrapper.rig, "character_idle_01");
            m_anim.set_behavior(_char_wrapper.rig, m_anim.AB_CYCLIC);
            m_anim.play(_char_wrapper.rig);
        } else if (_char_wrapper.state == m_conf.CH_RUN){
            m_anim.apply(_char_wrapper.rig, "character_run");
            m_anim.set_behavior(_char_wrapper.rig, m_anim.AB_CYCLIC);
            m_anim.play(_char_wrapper.rig);
        }
    }

    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "JUMP",
        m_ctl.CT_SHOT, [key_space, touch_jump, on_ground_sens],
        function(s){return s[0] || s[1]}, jump_cb);
    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "LANDING",
        m_ctl.CT_SHOT, [on_ground_sens], null, landing_cb);
}

function setup_attack(touch_attack, elapsed) {
    var key_enter = m_ctl.create_keyboard_sensor(m_ctl.KEY_ENTER);
    var char_attack_done = false;

    function finish_attack_cb(obj) {
        m_anim.apply(_char_wrapper.rig, "character_idle_01");
        m_anim.set_behavior(_char_wrapper.rig, m_anim.AB_CYCLIC);
        m_anim.play(_char_wrapper.rig);

        _char_wrapper.state = m_conf.CH_STILL;
    }

    function process_attack_speakers() {
        if (m_sfx.is_playing(_char_run_spk))
            m_sfx.stop(_char_run_spk);

        m_sfx.play_def(_char_attack_spk);

        var id = Math.floor(3 * Math.random());
        m_sfx.play_def(_char_voice_attack_spks[id]);
    }

    var attack_cb = function(obj, id, pulse) {
        if (pulse == 1 && _char_wrapper.state != m_conf.CH_ATTACK) {
            _char_wrapper.state = m_conf.CH_ATTACK;
            var rand = Math.floor(3 * Math.random()) + 1;
            m_anim.apply(_char_wrapper.rig, "character_atack_0" + rand);
            m_anim.set_behavior(_char_wrapper.rig, m_anim.AB_FINISH_STOP);
            m_anim.play(_char_wrapper.rig, finish_attack_cb);

            m_phy.set_character_move_dir(_char_wrapper.phys_body, 0, 0);
            char_attack_done = false;

            process_attack_speakers();
        }
    }

    var damage_enemies_cb = function(obj, id, pulse) {

        if (_char_wrapper.state != m_conf.CH_ATTACK)
            return;

        if (!char_attack_done) {
            var frame = m_anim.get_frame(_char_wrapper.rig);
            if (frame >= m_conf.CHAR_ATTACK_ANIM_FRAME) {
                var trans     = _vec3_tmp;
                var cur_dir   = _vec3_tmp_2;
                var at_pt     = _vec3_tmp_3;
                var cur_rot_q = _quat4_tmp;
                var at_dst = m_conf.CHAR_ATTACK_DIST;

                m_trans.get_translation(_char_wrapper.phys_body, trans);
                m_trans.get_rotation(_char_wrapper.phys_body, cur_rot_q);
                m_vec3.transformQuat(m_util.AXIS_MY, cur_rot_q, cur_dir);

                m_vec3.scaleAndAdd(trans, cur_dir, at_dst, at_pt);
                if (m_combat.process_attack_on_enemies(at_pt, at_dst))
                    m_sfx.play_def(_char_hit_spk);
                char_attack_done = true;
            }
        }
    }

    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "ATTACK", m_ctl.CT_TRIGGER,
        [key_enter, touch_attack], function(s){return s[0] || s[1]}, attack_cb);
    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "DAMAGE_GOLEMS", m_ctl.CT_CONTINUOUS,
        [elapsed], null, damage_enemies_cb);
}

exports.disable_controls = disable_controls;
function disable_controls() {
    if (m_ctl.check_sensor_manifolds(_char_wrapper.phys_body))
        m_ctl.remove_sensor_manifold(_char_wrapper.phys_body);
    m_phy.set_character_move_dir(_char_wrapper.phys_body, 0, 0);
    m_sfx.stop(_char_run_spk);
}

exports.reset = function() {
    _char_wrapper.state = m_conf.CH_STILL;
    _char_wrapper.hp = m_conf.MAX_CHAR_HP;
    _char_wrapper.island = -1;
    m_trans.get_rotation(_char_wrapper.phys_body, _quat4_tmp);
    m_phy.set_transform(_char_wrapper.phys_body, m_conf.CHAR_DEF_POS, _quat4_tmp);
    m_phy.set_character_move_dir(_char_wrapper.phys_body, 0, 0);
}


exports.apply_hp_potion = function() {
    change_hp(m_conf.BONUS_HP_INCR);
    m_anim.play(_char_wrapper.body);
}

exports.apply_lava_protect = function() {
    m_anim.apply(_char_wrapper.body, "LAVA_grow", m_anim.SLOT_1);
    m_anim.set_behavior(_char_wrapper.body, m_anim.AB_FINISH_STOP, m_anim.SLOT_1);
    m_anim.play(_char_wrapper.body, null, m_anim.SLOT_1);
}

exports.remove_lava_protect = remove_lava_protect;
function remove_lava_protect() {
    m_anim.apply(_char_wrapper.body, "LAVA_fall", m_anim.SLOT_1);
    m_anim.set_behavior(_char_wrapper.body, m_anim.AB_FINISH_STOP, m_anim.SLOT_1);
    m_anim.play(_char_wrapper.body, null, m_anim.SLOT_1);

    m_bonuses.set_lava_protect_time(0);
}

exports.apply_shield = apply_shield;
function apply_shield() {
    m_anim.apply(_char_wrapper.body, "SHIELD_grow", m_anim.SLOT_2);
    m_anim.set_behavior(_char_wrapper.body, m_anim.AB_FINISH_STOP, m_anim.SLOT_2);
    m_anim.play(_char_wrapper.body, null, m_anim.SLOT_2);

    m_anim.apply(_char_wrapper.shield_sphere, "SHIELD_GLOW_grow");
    m_anim.set_behavior(_char_wrapper.shield_sphere, m_anim.AB_FINISH_STOP);
    m_anim.play(_char_wrapper.shield_sphere);
}

exports.remove_shield = remove_shield;
function remove_shield() {
    m_anim.apply(_char_wrapper.body, "SHIELD_flash", m_anim.SLOT_2);
    m_anim.set_behavior(_char_wrapper.body, m_anim.AB_FINISH_STOP, m_anim.SLOT_2);
    m_anim.play(_char_wrapper.body, null, m_anim.SLOT_2);

    m_anim.apply(_char_wrapper.shield_sphere, "SHIELD_GLOW_fall");
    m_anim.set_behavior(_char_wrapper.shield_sphere, m_anim.AB_FINISH_STOP);
    m_anim.play(_char_wrapper.shield_sphere);

    m_bonuses.set_shield_time(0);
}

exports.change_hp = change_hp;
function change_hp(amount) {

    if (_char_wrapper.hp <= 0)
        return;

    var cur_time = m_time.get_timeline();

    if (amount < 0 && _last_hurt_sound < cur_time - 0.5) {
        var id = Math.floor(2 * Math.random());
        m_sfx.play_def(_char_hurt_spks[id]);
        _last_hurt_sound = cur_time;
    }

    _char_wrapper.hp += amount;
    _char_wrapper.hp = Math.min(_char_wrapper.hp, m_conf.MAX_CHAR_HP);

    if (_char_wrapper.hp <= 0)
        kill();

    m_interface.update_hp_bar();
}

function kill() {

    disable_controls()
    m_env.disable_environment();

    m_sfx.clear_playlist();
    var intro_spk = m_scs.get_object_by_dupli_name("enviroment",
                                                   m_conf.MUSIC_INTRO_SPEAKER);
    m_sfx.stop(intro_spk);
    var end_spk = m_scs.get_object_by_dupli_name("enviroment",
                                                 m_conf.MUSIC_END_SPEAKER);
    var char_death_spk = m_scs.get_object_by_dupli_name("character",
                                                     m_conf.CHAR_DEATH_SPEAKER);
    m_sfx.play_def(end_spk);
    m_sfx.play_def(char_death_spk);

    m_anim.apply(_char_wrapper.rig, "character_death");
    m_anim.set_behavior(_char_wrapper.rig, m_anim.AB_FINISH_STOP);
    m_anim.play(_char_wrapper.rig);

    m_interface.show_replay_button(1);

    if (_char_wrapper.gem_slot)
        remove_gem();

    if (m_bonuses.shield_time_left > 0)
        remove_shield();

    if (m_bonuses.lava_protect_time_left > 0)
        remove_lava_protect();
}

exports.add_gem = function(gem_wrapper) {
    if (_char_wrapper.gem_slot) {
        if (_char_wrapper.gem_slot == gem_wrapper)
            return;
        remove_gem();
    }
    var gem_empty = gem_wrapper.empty;
    m_cons.append_stiff(gem_empty, _char_wrapper.phys_body, m_conf.GEM_OFFSET,
                        m_conf.GEM_ROT_OFFSET, m_conf.GEM_SCALE_OFFSET);
    gem_wrapper.state = m_conf.GM_CARRIED;
    _char_wrapper.gem_slot = gem_wrapper;
    m_sfx.play_def(_gem_pickup_spk);
}

exports.remove_gem = remove_gem;
function remove_gem() {
    var gem_empty = _char_wrapper.gem_slot.empty;
    m_cons.remove(gem_empty);
    m_trans.set_translation_v(gem_empty, m_conf.DEFAULT_POS);
    m_trans.set_scale(gem_empty, 1);
    _char_wrapper.gem_slot.state = m_conf.GM_SPARE;
    _char_wrapper.gem_slot = null;
}

exports.get_wrapper = function() {
    return _char_wrapper;
}

})
