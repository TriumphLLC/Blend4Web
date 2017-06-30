"use strict"

if (b4w.module_check("character"))
    throw "Failed to register module: character";

b4w.register("character", function(exports, require) {

var m_main  = require("main");
var m_ctl   = require("controls");
var m_scs   = require("scenes");
var m_phy   = require("physics");
var m_anim  = require("animation");
var m_sfx   = require("sfx");
var m_time  = require("time");
var m_trans = require("transform");
var m_util  = require("util");
var m_vec3  = require("vec3");
var m_cons  = require("constraints");
var m_mouse = require("mouse");
var m_cam   = require("camera");
var m_cont  = require("container");
var m_mat   = require("material");

var m_conf = require("game_config");
var m_combat = require("combat");
var m_interface = require("interface");
var m_bonuses = require("bonuses");

var _level_conf = null; // specified during initialization

var _char_run_spk = null;
var _char_attack_spk = null;
var _char_hit_spk = null;
var _char_land_spk = null;
var _gem_pickup_spk = null;
var _char_win_spk = null;
var _char_jump_spks = [];
var _char_voice_attack_spks = [];
var _char_hurt_spks = [];

var _char_wrapper = null;
var _rotation_cb = null;

var _char_attack_anims = [];
var _char_death_anims = [];

var _last_hurt_time = -100;
var _cam_indicator = null;

var _vec2_tmp = new Float32Array(2);
var _vec3_tmp = new Float32Array(3);
var _vec3_tmp_2 = new Float32Array(3);
var _vec3_tmp_3 = new Float32Array(3);
var _quat4_tmp = new Float32Array(4);

exports.init_wrapper = function(level_conf, json_name) {
    _level_conf = level_conf;
    _char_wrapper = {
        phys_body: m_scs.get_first_character(),
        rig:    m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY, m_conf.CHAR_ARMAT),
        body:   m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY, m_conf.CHAR_MODEL),
        picker: m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY, m_conf.CHAR_PICKER),
        target: m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY, "camera_target"),
        lava_shield_prot: m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY, m_conf.CHAR_SPHERE),
        hitsparks: m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY, "sword_hitsparks_emitter"),
        foot_smoke: m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY, "foots_smoke_emitter"),
        hp:    m_conf.MAX_CHAR_HP,
        state: m_conf.CH_STILL,
        move_state: {forw_back:0, left_right:0},
        gem_slot: null,
        island: -1
    };
    m_anim.apply_def(_char_wrapper.hitsparks);
    m_anim.set_behavior(_char_wrapper.hitsparks, m_anim.AB_FINISH_RESET);
    m_mat.set_nodemat_value(_char_wrapper.lava_shield_prot,
                            ["lava_shield_prot", "lava_prot_switcher"],
                            0);
    m_mat.set_nodemat_value(_char_wrapper.lava_shield_prot,
                            ["lava_shield_prot", "shield_switcher"],
                            0);

    m_scs.hide_object(_char_wrapper.foot_smoke);

    if (level_conf && level_conf.LEVEL_NAME == "dungeon")
        m_mat.set_nodemat_value(_char_wrapper.body,
                                ["petigor", m_conf.CHAR_SWORD_SWITCHER],
                                1);
    else
        m_mat.set_nodemat_value(_char_wrapper.body,
                                ["petigor", m_conf.CHAR_SWORD_SWITCHER],
                                0);

    cleanup_cache();
    precache_speakers();
    precache_animations();
    setup_hurt_indicator();
}

exports.setup_controls = function (elapsed_sensor) {

    if (_level_conf && _level_conf.LEVEL_NAME == "volcano")
        init_island_detection();

    var right_arrow = m_ctl.create_custom_sensor(0);
    var left_arrow  = m_ctl.create_custom_sensor(0);
    var up_arrow    = m_ctl.create_custom_sensor(0);
    var down_arrow  = m_ctl.create_custom_sensor(0);
    var touch_jump  = m_ctl.create_custom_sensor(0);
    var touch_attack = m_ctl.create_custom_sensor(0);

    var ground_sens = m_ctl.create_custom_sensor(0);

    setup_ground_sensor(ground_sens);

    var camobj = m_scs.get_active_camera();
    var offset = new Float32Array(m_conf.CAM_OFFSET);
    var dist = m_vec3.length(offset);

    var clamp_left  = -Math.PI / 2;
    var clamp_right = Math.PI / 2;
    var clamp_up    = Math.PI / 3;
    var clamp_down  = 0.01;

    function rotation_cb(rot_x, rot_z) {
        m_phy.character_rotation_inc(_char_wrapper.phys_body, rot_x, 0);
        if (rot_z) {
            m_cam.rotate_camera(camobj, 0, rot_z);

            m_cam.get_camera_angles(camobj, _vec3_tmp);
            offset[1] =  dist * Math.cos(_vec3_tmp[1]);
            offset[2] = -dist * Math.sin(_vec3_tmp[1]);

            m_cons.append_semi_stiff(camobj, _char_wrapper.target, offset, null,
                                 clamp_left, clamp_right, clamp_up, clamp_down);
        }
    }
    _rotation_cb = rotation_cb;

    if(m_main.detect_mobile())
        m_interface.setup_touch_controls(right_arrow, up_arrow, left_arrow,
                                         down_arrow, touch_jump, touch_attack,
                                         rotation_cb);
    else
        setup_mouse_rotation();

    setup_movement(up_arrow, down_arrow, left_arrow, right_arrow, ground_sens);
    setup_jumping(touch_jump, ground_sens);
    setup_attack(touch_attack, elapsed_sensor);

    var targ_pos = m_trans.get_translation(_char_wrapper.target, _vec3_tmp);
    m_cons.append_semi_stiff(camobj, _char_wrapper.target, offset, null,
                        clamp_left, clamp_right, clamp_up, clamp_down);
    m_cam.eye_set_look_at(camobj, null, targ_pos);

    if (_level_conf) {
        _cam_indicator = m_scs.get_object_by_dupli_name_list(m_conf.CAMERA_INDICTAOR);
        m_mat.set_nodemat_value(_cam_indicator,
                                ["camera_indicator", m_conf.CAM_INDICATOR_VAL], 0);
    }
}

exports.pointerlock_cb = pointerlock_cb;
function pointerlock_cb(e) {
    var game_menu   = document.getElementById("game_menu");
    var canvas_shadow = document.getElementById("canvas_shadow");

    function plock_disabled_cb() {
        if (_char_wrapper.hp > 0 && _char_wrapper.state != m_conf.CH_VICTORY) {
            m_interface.show_elem(game_menu);
            m_interface.show_elem(canvas_shadow);
            m_main.pause();
        }
    }

    var canvas_elem = m_cont.get_canvas();
    if (_char_wrapper.hp > 0 && !m_main.is_paused() && _char_wrapper.state != m_conf.CH_VICTORY)
        m_mouse.request_pointerlock(canvas_elem, null, plock_disabled_cb, null, null, function (x,y) {
            _rotation_cb(m_conf.MOUSE_ROT_MULT * x, m_conf.MOUSE_ROT_MULT * y);
        });
}


exports.run_victory = function() {

    _char_wrapper.state = m_conf.CH_VICTORY;

    disable_controls();

    m_anim.apply(_char_wrapper.rig, m_conf.CHAR_VICTORY_ANIM);
    m_anim.set_behavior(_char_wrapper.rig, m_anim.AB_CYCLIC);
    m_anim.play(_char_wrapper.rig);

    m_sfx.play_def(_char_win_spk);

    var camobj = m_scs.get_active_camera();
    m_cons.remove(camobj);

    var pivot = m_trans.get_translation(_char_wrapper.target);
    var cam_params = {pivot: pivot};
    m_cam.target_setup(camobj, cam_params);

    function cam_rotate_cb(obj, id, pulse) {
        var angles = m_cam.get_camera_angles(obj, _vec2_tmp);
        var dist = m_cam.target_get_distance(obj);

        var elapsed = m_ctl.get_sensor_value(obj, id, 0);
        var hor_angle = elapsed * 0.1;

        if (angles[1] < _level_conf.VICT_CAM_VERT_ANGLE)
            var vert_angle = elapsed * 0.05;
        else
            var vert_angle = 0;

        m_cam.rotate_camera(obj, hor_angle, vert_angle);

        if (dist > _level_conf.VICT_CAM_DIST) {
            dist -= elapsed;
            m_cam.target_set_distance(obj, dist);
        }
    }
    m_ctl.create_sensor_manifold(camobj, "CAMERA_ROTATION", m_ctl.CT_CONTINUOUS,
        [m_ctl.create_elapsed_sensor()], null, cam_rotate_cb);
}

function setup_mouse_rotation() {
    var canvas_elem = m_cont.get_canvas();
    canvas_elem.addEventListener("mouseup", pointerlock_cb, false);
}

function cleanup_cache() {
    _char_jump_spks.length = 0;
    _char_voice_attack_spks.length = 0;
    _char_hurt_spks.length = 0;
    _char_attack_anims.length = 0;
    _char_death_anims.length = 0;
}

function precache_speakers() {
    _char_run_spk = m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY,
                                                   m_conf.CHAR_RUN_SPEAKER);
    _char_attack_spk = m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY,
                                                      m_conf.CHAR_ATTACK_SPEAKER);
    _char_hit_spk = m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY,
                                                   m_conf.CHAR_SWORD_SPEAKER);
    _char_land_spk = m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY,
                                                    m_conf.CHAR_LANDING_SPEAKER);
    _char_win_spk = m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY,
                                                   m_conf.CHAR_WIN_SPEAKER);
    _gem_pickup_spk = m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY,
                                                     m_conf.GEM_PICKUP_SPEAKER);

    m_sfx.cyclic(_char_win_spk, true);
    for (var i = 0; i < m_conf.CHAR_JUMP_SPKS.length; i++) {
        var jump_spk_name = m_conf.CHAR_JUMP_SPKS[i];
        var jump_spk = m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY, jump_spk_name);
        _char_jump_spks.push(jump_spk);
    }
    for (var i = 0; i < m_conf.CHAR_ATTACK_VOICE_SPKS.length; i++) {
        var attack_spk_name = m_conf.CHAR_ATTACK_VOICE_SPKS[i];
        var attack_spk = m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY, attack_spk_name);
        _char_voice_attack_spks.push(attack_spk);
    }
    for (var i = 0; i < m_conf.CHAR_HURT_SPKS.length; i++) {
        var hurt_spk_name = m_conf.CHAR_HURT_SPKS[i];
        var hurt_spk = m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY, hurt_spk_name);
        _char_hurt_spks.push(hurt_spk);
    }
}

function precache_animations() {
    for (var i = 0; i < m_conf.CHAR_ATTACK_ANIMS.length; i++) {
        var attack_anim = m_conf.CHAR_ATTACK_ANIMS[i];
        _char_attack_anims.push(attack_anim);
    }
    for (var i = 0; i < m_conf.CHAR_DEATH_ANIMS.length; i++) {
        var death_anim = m_conf.CHAR_DEATH_ANIMS[i];
        _char_death_anims.push(death_anim);
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
    for (var i = 0; i < _level_conf.NUM_OBELISKS; i++) {
        var coll_sens = m_ctl.create_collision_sensor(_char_wrapper.picker, "ISLAND"+i);
        m_ctl.create_sensor_manifold(_char_wrapper.picker, "ISLE_COLL"+i, m_ctl.CT_TRIGGER,
                                     [coll_sens], null, isl_cb);
    }
}

function setup_ground_sensor(on_ground) {
    var ground_sens = m_ctl.create_ray_sensor(_char_wrapper.phys_body, [0, 0, 0],
                                          [0, 0, -m_conf.CHAR_RAY_LENGTH], "GROUND", true);
    var lava_sens = m_ctl.create_ray_sensor(_char_wrapper.phys_body, [0, 0, 0],
                                          [0, 0, -m_conf.CHAR_RAY_LENGTH], "LAVA", true);
    var common_coll_sens = m_ctl.create_ray_sensor(_char_wrapper.phys_body, [0, 0, 0],
                                          [0, 0, -m_conf.CHAR_RAY_LENGTH], "COMMON", true);
    function ground_cb(obj, id, pulse) {
        var val = pulse == 1? 1: 0;
        m_ctl.set_custom_sensor(on_ground, val)
    }

    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "GROUND SENS",
            m_ctl.CT_TRIGGER, [ground_sens, lava_sens, common_coll_sens],
            function(s) {return s[0] || s[1] || s[2]}, ground_cb);
}

function setup_movement(up_arrow, down_arrow, left_arrow, right_arrow, on_ground_sens) {
    var key_w     = m_ctl.create_keyboard_sensor(m_ctl.KEY_W);
    var key_s     = m_ctl.create_keyboard_sensor(m_ctl.KEY_S);
    var key_up    = m_ctl.create_keyboard_sensor(m_ctl.KEY_UP);
    var key_down  = m_ctl.create_keyboard_sensor(m_ctl.KEY_DOWN);
    var key_a = m_ctl.create_keyboard_sensor(m_ctl.KEY_A);
    var key_d = m_ctl.create_keyboard_sensor(m_ctl.KEY_D);

    var move_array = [
        key_w, key_up, up_arrow,
        key_s, key_down, down_arrow,
        on_ground_sens,
        key_a, left_arrow,
        key_d, right_arrow
    ];

    var move_state = _char_wrapper.move_state;

    var forward_logic  = function(s){return (s[0] || s[1] || s[2])};
    var backward_logic = function(s){return (s[3] || s[4] || s[5])};
    var left_logic = function(s){return s[7] || s[8]};
    var right_logic = function(s){return s[9] || s[10]};

    function move_cb(obj, id, pulse) {

        if (_char_wrapper.state == m_conf.CH_ATTACK) {
            m_phy.set_character_move_dir(obj, 0, 0);
            return;
        }
        var on_ground = m_ctl.get_sensor_value(obj, id, 6);

        if (pulse == 1) {
            switch(id) {
            case "FORWARD":
                move_state.forw_back = 1;
                break;
            case "BACKWARD":
                move_state.forw_back = -1;
                break;
            case "LEFT":
                move_state.left_right = 1;
                break;
            case "RIGHT":
                move_state.left_right = -1;
                break;
            }
            if (_char_wrapper.state != m_conf.CH_JUMP)
                _char_wrapper.state = m_conf.CH_RUN;
        } else {
            switch(id) {
            case "FORWARD":
            case "BACKWARD":
                move_state.forw_back = 0;
                break;
            case "LEFT":
            case "RIGHT":
                move_state.left_right = 0;
                break;
            }
            if (_char_wrapper.state != m_conf.CH_JUMP)
                _char_wrapper.state = m_conf.CH_STILL;
        }

        if ((move_state.forw_back || move_state.left_right) && on_ground) {
            if (!m_sfx.is_playing(_char_run_spk))
                m_sfx.play_def(_char_run_spk);
        } else {
            if (m_sfx.is_playing(_char_run_spk))
                m_sfx.stop(_char_run_spk);
        }

        m_phy.set_character_move_dir(obj, move_state.forw_back,
                                          move_state.left_right);
    };

    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "FORWARD",
        m_ctl.CT_CONTINUOUS, move_array, forward_logic, move_cb);
    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "BACKWARD",
        m_ctl.CT_CONTINUOUS, move_array, backward_logic, move_cb);
    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "LEFT",
        m_ctl.CT_CONTINUOUS, move_array, left_logic, move_cb);
    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "RIGHT",
        m_ctl.CT_CONTINUOUS, move_array, right_logic, move_cb);

    function anim_cb(obj, id, pulse) {
        if (_char_wrapper.state == m_conf.CH_ATTACK)
            return;

        var cur_anim = m_anim.get_current_anim_name(_char_wrapper.rig);
        var required_anim = m_conf.CHAR_IDLE_ANIM;

        if (_char_wrapper.state == m_conf.CH_JUMP) {
            required_anim = m_conf.CHAR_JUMP_ANIM;
        } else if (move_state.forw_back == 1) {
            required_anim = m_conf.CHAR_RUN_ANIM;
        } else if (move_state.forw_back == -1) {
            required_anim = m_conf.CHAR_RUN_ANIM;
            m_anim.set_speed(_char_wrapper.rig, -1);
        } else if (move_state.left_right == 1) {
            required_anim = m_conf.CHAR_STRAFE;
            m_anim.set_speed(_char_wrapper.rig, -1);
        } else if (move_state.left_right == -1) {
            required_anim = m_conf.CHAR_STRAFE;
        }

        if (cur_anim != required_anim) {
            m_anim.apply(_char_wrapper.rig, required_anim);
            m_anim.play(_char_wrapper.rig);
            m_anim.set_behavior(_char_wrapper.rig, m_anim.AB_CYCLIC);
        }
    }

    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "CHAR_ANIM",
        m_ctl.CT_CONTINUOUS, [on_ground_sens], function(s){return true}, anim_cb);

    // character material animation
    if (_char_wrapper.body) {
        m_anim.apply(_char_wrapper.body, m_conf.CHAR_HEAL_PICK_ANIM);
        m_anim.apply(_char_wrapper.body, m_conf.CHAR_LAVA_PROT_ANIM,
                     m_anim.SLOT_1);
        m_anim.apply(_char_wrapper.body, m_conf.CHAR_SHIELD_PICK_ANIM,
                     m_anim.SLOT_2);
    }

    // sound
    m_sfx.stop(_char_run_spk);
}

function setup_jumping(touch_jump, on_ground_sens) {
    var key_space = m_ctl.create_keyboard_sensor(m_ctl.KEY_SPACE);

    var jump_cb = function(obj, id, pulse) {
        if (pulse == 1 && _char_wrapper.state != m_conf.CH_ATTACK) {
            _char_wrapper.state = m_conf.CH_JUMP;
            m_phy.character_jump(obj);

            var jump_id = Math.floor(_char_jump_spks.length * Math.random());
            m_sfx.play_def(_char_jump_spks[jump_id]);

            m_anim.apply(_char_wrapper.rig, m_conf.CHAR_JUMP_ANIM);
            m_anim.set_behavior(_char_wrapper.rig, m_anim.AB_FINISH_STOP);
            m_anim.play(_char_wrapper.rig);

            _char_wrapper.move_state.forw_back = 0;
            _char_wrapper.move_state.left_right = 0;
        }
    }
    var landing_cb = function(obj, id, pulse) {
        if (pulse == 1) {
            m_sfx.play_def(_char_land_spk);
            if (_char_wrapper.state != m_conf.CH_ATTACK)
                _char_wrapper.state = m_conf.CH_STILL;
        }
    }

    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "JUMP",
        m_ctl.CT_TRIGGER, [key_space, touch_jump, on_ground_sens],
        function(s){return (s[0] || s[1]) && s[2]}, jump_cb);
    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "LANDING",
        m_ctl.CT_TRIGGER, [on_ground_sens], null, landing_cb);
}

function setup_attack(touch_attack, elapsed) {
    var click_sensor = m_ctl.create_mouse_click_sensor();
    var char_attack_done = false;

    function finish_attack_cb(obj) {
        m_anim.apply(_char_wrapper.rig, m_conf.CHAR_IDLE_ANIM);
        m_anim.set_behavior(_char_wrapper.rig, m_anim.AB_CYCLIC);
        m_anim.play(_char_wrapper.rig);

        _char_wrapper.state = m_conf.CH_STILL;
    }

    function process_attack_speakers() {
        if (m_sfx.is_playing(_char_run_spk))
            m_sfx.stop(_char_run_spk);

        m_sfx.play_def(_char_attack_spk);

        var id = Math.floor(_char_voice_attack_spks.length * Math.random());
        m_sfx.play_def(_char_voice_attack_spks[id]);
    }

    var attack_cb = function(obj, id, pulse) {
        if (pulse == 1 && _char_wrapper.state != m_conf.CH_ATTACK) {
            _char_wrapper.state = m_conf.CH_ATTACK;
            _char_wrapper.move_state.forw_back = 0;
            _char_wrapper.move_state.left_right = 0;
            var anim_id = Math.floor(_char_attack_anims.length * Math.random());
            var attack_anim = _char_attack_anims[anim_id];
            m_anim.apply(_char_wrapper.rig, attack_anim);
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
                if (m_combat.process_attack_on_enemies(at_pt, at_dst)) {
                    m_sfx.play_def(_char_hit_spk);
                    m_anim.play(_char_wrapper.hitsparks);
                }
                char_attack_done = true;
            }
        }
    }

    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "ATTACK", m_ctl.CT_TRIGGER,
        [click_sensor, touch_attack], function(s){return s[0] || s[1]}, attack_cb);
    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "DAMAGE_GOLEMS", m_ctl.CT_CONTINUOUS,
        [elapsed], null, damage_enemies_cb);
}

function disable_controls() {
    if (m_ctl.check_sensor_manifolds(_char_wrapper.phys_body))
        m_ctl.remove_sensor_manifold(_char_wrapper.phys_body);
    m_phy.set_character_move_dir(_char_wrapper.phys_body, 0, 0);
    m_sfx.stop(_char_run_spk);

    if (!m_main.detect_mobile())
        m_mouse.exit_pointerlock();
}

exports.reset = function() {
    _char_wrapper.state = m_conf.CH_STILL;
    _char_wrapper.hp = m_conf.MAX_CHAR_HP;
    _char_wrapper.island = -1;
    _char_wrapper.move_state.forw_back = 0;
    _char_wrapper.move_state.left_right = 0;
    if (_level_conf) {
        m_trans.get_rotation(_char_wrapper.phys_body, _quat4_tmp);
        m_phy.set_transform(_char_wrapper.phys_body, _level_conf.CHAR_DEF_POS, _quat4_tmp);
        m_phy.set_character_move_dir(_char_wrapper.phys_body, 0, 0);
        m_scs.hide_object(_char_wrapper.foot_smoke);
    }

    m_sfx.stop(_char_win_spk);
    var camobj = m_scs.get_active_camera();
    if (m_ctl.check_sensor_manifold(camobj, "CAMERA_ROTATION"))
        m_ctl.remove_sensor_manifold(camobj, "CAMERA_ROTATION");
    m_cam.eye_setup(camobj);
    setup_hurt_indicator();
}

function setup_hurt_indicator() {
    var prev_ind_val = 0;
    function char_hurt_cb() {
        var indicator_val = Math.max(_last_hurt_time - m_time.get_timeline() + 1, 0);
        if (indicator_val == prev_ind_val && prev_ind_val == 0) { // optimization
            prev_ind_val = indicator_val;
            return;
        }
        prev_ind_val = indicator_val;
        m_mat.set_nodemat_value(_cam_indicator,
                ["camera_indicator", m_conf.CAM_INDICATOR_VAL], indicator_val);
    }

    m_ctl.create_sensor_manifold(_char_wrapper.phys_body, "CHAR_HURT", m_ctl.CT_CONTINUOUS,
        [m_ctl.create_elapsed_sensor()], null, char_hurt_cb);
}

exports.apply_hp_potion = function() {
    change_hp(m_conf.BONUS_HP_INCR);
    m_anim.play(_char_wrapper.body);
}

exports.apply_lava_protect = function() {
    m_anim.set_behavior(_char_wrapper.body, m_anim.AB_FINISH_STOP, m_anim.SLOT_1);
    m_anim.play(_char_wrapper.body, null, m_anim.SLOT_1);
    m_mat.set_nodemat_value(_char_wrapper.lava_shield_prot,
                            ["lava_shield_prot", "lava_prot_switcher"],
                            1);
}

exports.remove_lava_protect = remove_lava_protect;
function remove_lava_protect() {
    m_bonuses.set_lava_protect_time(0);
    m_mat.set_nodemat_value(_char_wrapper.lava_shield_prot,
                            ["lava_shield_prot", "lava_prot_switcher"],
                            0);
}

exports.apply_shield = apply_shield;
function apply_shield() {
    m_anim.set_behavior(_char_wrapper.body, m_anim.AB_FINISH_STOP, m_anim.SLOT_2);
    m_anim.play(_char_wrapper.body, null, m_anim.SLOT_2);
    m_mat.set_nodemat_value(_char_wrapper.lava_shield_prot,
                            ["lava_shield_prot", "shield_switcher"],
                            1);
}

exports.remove_shield = remove_shield;
function remove_shield() {
    m_bonuses.set_shield_time(0);
    m_mat.set_nodemat_value(_char_wrapper.lava_shield_prot,
                            ["lava_shield_prot", "shield_switcher"],
                            0);
}

exports.change_hp = change_hp;
function change_hp(amount) {

    if (_char_wrapper.hp <= 0)
        return;

    var cur_time = m_time.get_timeline();

    if (amount < 0 && _last_hurt_time < cur_time - 0.5) {
        var id = Math.floor(_char_hurt_spks.length * Math.random());
        m_sfx.play_def(_char_hurt_spks[id]);
        _last_hurt_time = cur_time;
    }

    _char_wrapper.hp += amount;
    _char_wrapper.hp = Math.min(_char_wrapper.hp, m_conf.MAX_CHAR_HP);

    if (_char_wrapper.hp <= 0)
        kill();

    m_interface.update_hp_bar();
}

function kill() {

    disable_controls()
    if (_level_conf.MUSIC_SPEAKERS) {
        m_sfx.clear_playlist();
        var intro_spk = m_scs.get_object_by_dupli_name_list(
                                _level_conf.MUSIC_INTRO_SPEAKER);
        var end_spk = m_scs.get_object_by_dupli_name_list(
                                _level_conf.MUSIC_END_SPEAKER);
        m_sfx.stop(intro_spk);
        m_sfx.play_def(end_spk);
    }

    var char_death_spk = m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY,
                                                     m_conf.CHAR_DEATH_SPEAKER);
    m_sfx.play_def(char_death_spk);

    var anim_id = Math.floor(_char_death_anims.length * Math.random());
    var death_anim = _char_death_anims[anim_id];
    m_anim.apply(_char_wrapper.rig, death_anim);
    m_anim.set_behavior(_char_wrapper.rig, m_anim.AB_FINISH_STOP);
    m_anim.play(_char_wrapper.rig);

    m_interface.show_replay_button(1);

    if (_char_wrapper.gem_slot)
        remove_gem();

    if (m_bonuses.shield_time_left() > 0)
        remove_shield();

    if (m_bonuses.lava_protect_time_left() > 0)
        remove_lava_protect();

    m_mat.set_nodemat_value(_cam_indicator,
            ["camera_indicator", m_conf.CAM_INDICATOR_VAL], 1.0);
}

exports.add_gem = function(gem_wrapper) {
    var gem_empty = gem_wrapper.empty;
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
