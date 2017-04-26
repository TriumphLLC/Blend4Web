"use strict"

b4w.register("petigor_states", function(exports, require) {

var m_anim      = require("animation");
var m_trans     = require("transform");
var m_sm        = require("state_machine");
var m_sfx       = require("sfx");
var m_util      = require("util");
var m_ctl       = require("controls");
var m_quat      = require("quat");
var m_phy       = require("physics");
var m_scenes    = require("scenes");
var m_vec3      = require("vec3");
var m_tsr       = require("tsr");

// Petigor's states
var START = 0;
var STANDING = 1;
var MOVING = 2;
var MOVING_TO_TARGET = 3;
var INTERACTING = 4;
var _state_map = {};
_state_map["START"] = START
_state_map["STANDING"] = STANDING
_state_map["MOVING"] = MOVING
_state_map["MOVING_TO_TARGET"] = MOVING_TO_TARGET
_state_map["INTERACTING"] = INTERACTING

var _vec3_tmp  = new Float32Array(3);
var _vec3_tmp1  = new Float32Array(3);
var _vec3_tmp2  = new Float32Array(3);
var _vec3_tmp3  = new Float32Array(3);
var _vec4_tmp  = new Float32Array(4);
var _vec4_tmp2  = new Float32Array(4);

exports.state_id_by_name = function(name) {
    return _state_map[name];
};

exports.STANDING = STANDING;
exports.MOVING = MOVING;
exports.MOVING_TO_TARGET = MOVING_TO_TARGET;
exports.INTERACTING = INTERACTING;

var _sm = null; // state machine
var _id = null; // state machine instance id
var _gs = null; // global state variable
var _tsr = m_tsr.create();
var _tsr_inv = m_tsr.create();

function translate(obj, target, elapsed, accurate) {
    var trans = _vec3_tmp;
    var cur_dir = _vec3_tmp2;
    var cur_rot_q = _vec4_tmp;
    var dist = _vec3_tmp3;

    m_trans.get_rotation(obj, cur_rot_q);
    m_trans.get_translation(obj, trans);
    m_vec3.subtract(target, trans, dist);

    var passed_dist = _gs.speed * elapsed;

    if (passed_dist * passed_dist < m_vec3.dot(dist, dist)) {
        if (accurate) {
            m_vec3.normalize(dist, cur_dir);
        } else {
            m_vec3.transformQuat(m_util.AXIS_MY, cur_rot_q, cur_dir);
            m_vec3.normalize(cur_dir, cur_dir);
        }
        m_vec3.scaleAndAdd(trans, cur_dir, passed_dist, trans);
    } else {
        trans = target;
    }
    // ray_test for projecting the position on the surface
    var ray_test_cb = function (id, hit_fract, obj_hit, hit_time, hit_pos, hit_norm) {
        trans[2] = hit_pos[2];
        m_trans.set_translation_v(obj, trans);
    };
    m_phy.append_ray_test_ext(obj, [0, 0, 0.5], [0, 0, -1], "raytest_floor",
        ray_test_cb, true, false, true, true);
    m_trans.set_translation_v(obj, trans);

    m_vec3.subtract(target, trans, dist);
    dist[2] = 0;
    return m_vec3.dot(dist, dist);
}

function rotate_to_dir(obj, dir_to_dest, elapsed) {
    var cur_dir = _vec3_tmp1;
    var cur_rot_q = _vec4_tmp;
    var new_rot_q = _vec4_tmp2;

    m_trans.get_rotation(obj, cur_rot_q);
    m_vec3.transformQuat(m_util.AXIS_MY, cur_rot_q, cur_dir);

    dir_to_dest[2] = 0;
    m_vec3.normalize(dir_to_dest, dir_to_dest);
    m_quat.rotationTo(cur_dir, dir_to_dest, new_rot_q);
    m_quat.multiply(new_rot_q, cur_rot_q, new_rot_q);

    var vec_dot = m_vec3.dot(cur_dir, dir_to_dest);
    vec_dot = vec_dot > 1 ? 1 : vec_dot < -1 ? -1 : vec_dot;

    var angle_to_turn = Math.acos(vec_dot);
    var slerp = elapsed * (_gs.speed / _gs.dist_err) / Math.abs(angle_to_turn)*Math.PI/2;
    slerp = Math.min(slerp, 1);
    m_quat.slerp(cur_rot_q, new_rot_q, slerp, new_rot_q);
    m_trans.set_rotation_v(obj, new_rot_q);

    return angle_to_turn - angle_to_turn * slerp;
}

function rotate_to_quat(obj, quat, elapsed) {
    var dir = _vec3_tmp3;
    m_vec3.transformQuat(m_util.AXIS_MY, quat, dir);
    return rotate_to_dir(obj, dir, elapsed);
}

function rotate_to_dest(obj, dest, elapsed) {
    var dest_pos = dest
    var trans = _vec3_tmp;
    var dir_to_dest = _vec3_tmp2;

    m_trans.get_translation(obj, trans);
    m_vec3.subtract(dest_pos, trans, dir_to_dest);

    return rotate_to_dir(obj, dir_to_dest, elapsed);
}

function init_anims(node) {
    var obj = node.payload.anim_obj;
    var inst = node.instances[_gs.ro_sm_node_state.instance_id];
    inst.anim = {};
    for (var i = 0; i < node.payload.anim.length; i++) {
        var anim = node.payload.anim[i];
        var slot_num = m_anim.get_slot_num_by_anim(obj, anim.name);
        if (slot_num < 0) {
            slot_num = anim.slot;
            inst.anim[anim.name] = slot_num;
            m_anim.apply(obj, anim.name, slot_num);
        }
        m_anim.set_behavior(obj, anim.flags, slot_num);
    }
}

function play_anims(node) {
    var obj = node.payload.anim_obj;
    var anim = node.payload.anim;
    var inst = node.instances[_gs.ro_sm_node_state.instance_id];
    for (var i = 0; i < anim.length; i++) {
        if (inst.anim) {
            var slot_num = inst.anim[anim.name];
            if (!slot_num)
                slot_num = anim[i].slot;
            m_anim.play(obj, null, slot_num);
        }
    }
}

function stop_anims(node, do_not_reset) {
    var obj = node.payload.anim_obj;
    var anim = node.payload.anim;
    var inst = node.instances[_gs.ro_sm_node_state.instance_id];
    for (var i = 0; i < anim.length; i++) {
        if (inst.anim) {
            var slot_num = inst.anim[anim.name];
            if (!slot_num)
                slot_num = anim[i].slot;
            if (!do_not_reset)
                m_anim.set_frame(obj, 0, slot_num)
            m_anim.stop(obj, slot_num)
        }
    }
}

function moving_callback(obj, id, pulse) {
    var node = _gs.ro_sm_node_state.node
    var inst = node.instances[_gs.ro_sm_node_state.instance_id];
    if (inst.pause) {
        return;
    }
    play_anims(node);

    var elapsed = m_ctl.get_sensor_value(obj, id, 0);
    var path = inst.path;

    if (!path) {
        // path is not found
        _switch_state(STANDING);
        return;
    }
    var len = path.length/3;
    if (inst.path_point_index >= len) {
        if (_gs.dest_rotation) {
            // the case of rotation to concrete direction
            var angle = rotate_to_quat(_gs.character, _gs.dest_rotation, elapsed);
            if (Math.abs(angle) < 0.001 * Math.PI) {
                // rotation is completed
                _gs.accurate_translation = false;
                _switch_state(STANDING);
                return;
            }
        }
        else {
            _gs.accurate_translation = false;
            _switch_state(STANDING);
            return;
        }
    } else {
        if (path.length && path[inst.path_point_index*3]) {
            var point = new Float32Array(3);

            point[0] = path[inst.path_point_index * 3];
            point[1] = path[inst.path_point_index * 3 + 1];
            point[2] = path[inst.path_point_index * 3 + 2];

            var err2 = _gs.dist_err * _gs.dist_err;
            var dist_to_targ2 = translate(_gs.character, point, elapsed, _gs.accurate_translation);
            if (dist_to_targ2 < err2) {
                _gs.accurate_translation = true;
                if (inst.path_point_index >= len && !_gs.dest_rotation) {
                    _switch_state(STANDING);
                    _gs.accurate_translation = false;
                    return;
                }
                if (dist_to_targ2 < err2/1000)
                    inst.path_point_index++;
            } else {
                rotate_to_dest(_gs.character, point, elapsed);
            }
        } else {
            _gs.accurate_translation = false;
            _switch_state(STANDING);
            return;
        }
    }
}

function find_path(instance) {
    m_trans.get_translation(_gs.character, _gs.source);
    m_trans.get_tsr(_gs.navmesh_obj, _tsr);
    m_tsr.invert(_tsr, _tsr_inv);
    m_tsr.transform_vec3(_gs.source, _tsr_inv, _vec3_tmp1);
    m_tsr.transform_vec3(_gs.destination, _tsr_inv, _vec3_tmp2);

    var island = m_phy.navmesh_get_island(_gs.navmesh_obj, _vec3_tmp1);
    var options = {
        "navmesh_island": island
    }
    var path_info = m_phy.navmesh_find_path(_gs.navmesh_obj, _vec3_tmp1,
            _vec3_tmp2, options);
    var path = path_info["positions"];

    if (!path || !path.length) {
        instance.path_point_index = 0;
        return;
    } else
        instance.path_point_index = 1;

    instance.path = path;

    _gs.positions = path;
}

function prepare_speakers(node, instance_id) {
    var inst = node.instances[instance_id];
    inst.action.speakers = [];
    var sounds = node.payload.sound;
    for (var i in sounds) {
        inst.action.speakers.push(m_scenes.get_object_by_name(sounds[i].name));
    }
}

function init_action(node, instance_id, manifold_name, callback) {
    var inst = node.instances[instance_id];
    inst.action = {speakers: null, manifold_name: manifold_name, callback: callback};
    prepare_speakers(node, instance_id);
}

function pause_action(node, instance_id) {
    var inst = node.instances[instance_id];
    if (!inst.action)
        return;
    var speakers = inst.action.speakers;
    for (var i in inst.speakers)
        m_sfx.pause(speakers[i]);
    stop_anims(node, true);
    inst.pause = true;
}

function stop_action(node, instance_id) {
    var inst = node.instances[instance_id];
    if (!inst.action)
        return;
    var speakers = inst.action.speakers;
    var manifold_name = inst.action.manifold_name;
    var manifold_owner = node.payload.anim_obj;
    for (var i in speakers) {
        m_sfx.pause(speakers[i])
        m_sfx.stop(speakers[i]);
    }
    stop_anims(node);
    if (manifold_name && m_ctl.check_sensor_manifold(manifold_owner, manifold_name))
        m_ctl.remove_sensor_manifold(manifold_owner, manifold_name);
}

function play_action(node, instance_id) {
    var inst = node.instances[instance_id];
    if (!inst.action)
        return;
    var speakers = inst.action.speakers;
    var manifold_name = inst.action.manifold_name;
    var callback = inst.action.callback;
    var manifold_owner = node.payload.anim_obj;
    if (!inst.pause) {
        init_anims(node);
        var e_s = m_ctl.create_elapsed_sensor();
        if (manifold_name && callback) {
            m_ctl.create_sensor_manifold(manifold_owner, manifold_name, m_ctl.CT_CONTINUOUS,
                [e_s],
                null, callback);
        }
    }
    for (var i in speakers)
        m_sfx.play(speakers[i]);
    play_anims(node);
    inst.pause = false;
}

// Moving
function init_moving_state(node, instance_id) {
    init_action(node, instance_id, "moving", moving_callback);
}

function switch_from_moving(eq, from, old_state, new_state, old_node, new_node, instance_id) {
    if (!eq)
        stop_action(old_node, instance_id);
    else
        pause_action(old_node, instance_id);
}

function switch_to_moving(eq, from, old_state, new_state, old_node, new_node, instance_id) {
    var inst = new_node.instances[instance_id];
    find_path(inst);
    play_action(new_node, instance_id, true);

}

// Standing
function init_standing_state(node, instance_id) {
    init_action(node, instance_id, "standing");
}

function switch_from_standing(eq, from, old_state, new_state, old_node, new_node, instance_id) {
    if (!eq) {
        stop_action(old_node, instance_id);
    }
}

function switch_to_standing(eq, from, old_state, new_state, old_node, new_node, instance_id) {
    play_action(new_node, instance_id);
}

function switch_state_callback(old_state, new_state, old_node, new_node, instance_id) {
    _gs.ro_sm_node_state = {
        node: new_node,
        instance_id: instance_id
    };
}

exports.init = init;
function init(global_state) {
    if (_sm)
        throw "It's a singleton!!!";
    _gs = global_state;
    _sm = m_sm.state_machine_create();

    // fake state where actually nothing is happening
    m_sm.state_machine_add_state(_sm, START, [INTERACTING], null, switch_state_callback);

    m_sm.state_machine_add_state(_sm, STANDING, [STANDING, MOVING, INTERACTING,
        MOVING_TO_TARGET], null, switch_state_callback, switch_from_standing,
        switch_to_standing, init_standing_state, {anim_obj: _gs.character_armature,
        anim: [{slot: m_anim.SLOT_0, name: "petigor_quest_idle",
        flags: m_anim.AB_CYCLIC}], sound: []});

    m_sm.state_machine_add_state(_sm, MOVING, [STANDING, MOVING, MOVING_TO_TARGET],
        null, switch_state_callback, switch_from_moving, switch_to_moving,
        init_moving_state, {anim_obj: _gs.character_armature,
        anim: [{slot: m_anim.SLOT_0, name: "petigor_quest_walk", flags: m_anim.AB_CYCLIC}],
        sound: [{name: "quest_walking_circle"}]});

    m_sm.state_machine_add_state(_sm, MOVING_TO_TARGET, [STANDING], null,
        switch_state_callback, switch_from_moving, switch_to_moving, init_moving_state,
        {anim_obj: _gs.character_armature, anim: [{slot: m_anim.SLOT_0,
        name: "petigor_quest_walk", flags: m_anim.AB_CYCLIC}],
        sound: [{name: "quest_walking_circle"}]});

    m_sm.state_machine_add_state(_sm, INTERACTING, [STANDING, INTERACTING], null,
        switch_state_callback, null, null, null, {});

    m_sm.state_machine_validate(_sm);
    _id = m_sm.state_machine_create_instance(_sm);
    m_sm.state_machine_set_start_node(_sm, START, _id);

    // The game starts with logic nodes interaction
    _switch_state(INTERACTING);
}

exports.get_state = _get_state;
function _get_state() {
    return m_sm.state_machine_get_state_id(_sm, _id);
};

exports.switch_state = _switch_state;
function _switch_state(state) {
    return m_sm.state_machine_switch_state(_sm, state, _id);
};

})
