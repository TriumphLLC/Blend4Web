"use strict";

/**
 * Animation internal API.
 * @name animation
 * @namespace
 * @exports exports as animation
 */
b4w.module["__animation"] = function(exports, require) {

var m_config    = require("__config");
var m_particles = require("__particles");
var m_phy       = require("__physics");
var m_print     = require("__print");
var m_scs       = require("__scenes");
var m_sfx       = require("__sfx");
var m_trans     = require("__transform");
var m_tsr       = require("__tsr");
var m_util      = require("__util");
var m_reformer  = require("__reformer");

var m_mat4 = require("mat4");
var m_quat = require("quat");
var m_vec4 = require("vec4");
var m_vec3 = require("vec3");

var cfg_ani = m_config.animation;

var OBJ_ANIM_TYPE_ARMATURE   = 10;
var OBJ_ANIM_TYPE_OBJECT     = 20;
var OBJ_ANIM_TYPE_VERTEX     = 30;
var OBJ_ANIM_TYPE_SOUND      = 40;
var OBJ_ANIM_TYPE_PARTICLES  = 50;
var OBJ_ANIM_TYPE_MATERIAL   = 60;

exports.OBJ_ANIM_TYPE_ARMATURE  = OBJ_ANIM_TYPE_ARMATURE;
exports.OBJ_ANIM_TYPE_OBJECT    = OBJ_ANIM_TYPE_OBJECT;
exports.OBJ_ANIM_TYPE_VERTEX    = OBJ_ANIM_TYPE_VERTEX;
exports.OBJ_ANIM_TYPE_SOUND     = OBJ_ANIM_TYPE_SOUND;
exports.OBJ_ANIM_TYPE_PARTICLES = OBJ_ANIM_TYPE_PARTICLES;
exports.OBJ_ANIM_TYPE_MATERIAL  = OBJ_ANIM_TYPE_MATERIAL;

var SLOT_0   = 0;
var SLOT_1   = 1;
var SLOT_2   = 2;
var SLOT_3   = 3;
var SLOT_4   = 4;
var SLOT_5   = 5;
var SLOT_6   = 6;
var SLOT_7   = 7;
var SLOT_ALL = -1;

exports.SLOT_0   = SLOT_0;
exports.SLOT_1   = SLOT_1;
exports.SLOT_2   = SLOT_2;
exports.SLOT_3   = SLOT_3;
exports.SLOT_4   = SLOT_4;
exports.SLOT_5   = SLOT_5;
exports.SLOT_6   = SLOT_6;
exports.SLOT_7   = SLOT_7;
exports.SLOT_ALL = SLOT_ALL;

// values specified in exporter
var KF_INTERP_BEZIER = 0;
var KF_INTERP_LINEAR = 1;
var KF_INTERP_CONSTANT = 2;

// animation behavior
var AB_CYCLIC = 10;
var AB_FINISH_RESET = 20;
var AB_FINISH_STOP = 30;

var VECTORS_RESERVED = 50;

exports.AB_CYCLIC = AB_CYCLIC;
exports.AB_FINISH_RESET = AB_FINISH_RESET;
exports.AB_FINISH_STOP = AB_FINISH_STOP;

var _frame_info_tmp = new Array(3);
var _vec3_tmp = new Float32Array(3);
var _vec3_tmp2 = new Float32Array(3);
var _quat4_tmp = new Float32Array(4);
var _quat4_tmp2 = new Float32Array(4);
var _tsr8_tmp = new Float32Array(8);
var _mat4_tmp = new Float32Array(16);

// populated after init_anim()
var _anim_objs_cache = [];
var _actions = [];

exports.get_max_bones = function() {
    return m_util.trunc((m_config.defaults.max_vertex_uniform_vectors - VECTORS_RESERVED) / 4);
}

exports.frame_to_sec = function(frame) {
    return frame/cfg_ani.framerate;
}

/**
 * Called every frame
 */
exports.update = function(elapsed) {
    for (var i = 0; i < _anim_objs_cache.length; i++) {
        var obj = _anim_objs_cache[i];

        for (var j = 0; j < 8; j++)
            animate(obj, elapsed, j);

        if (obj._render.anim_mixing) {
            process_mix_factor(obj, elapsed);
            mix_skeletal_animation(obj, elapsed);
        }
    }

    // exec finish callbacks after animation updates to eliminate
    // possible race conditions
    for (var i = 0; i < _anim_objs_cache.length; i++) {
        var obj = _anim_objs_cache[i];
        for (var j = 0; j < 8; j++) {
            // NOTE: anim_slots may be cleared in some of finish callbacks
            if (!obj._anim_slots.length)
                break;
            handle_finish_callback(obj, j);
        }
    }
}

function handle_finish_callback(obj, slot_num) {
    var anim_slot = obj._anim_slots[slot_num];

    if (!anim_slot)
        return;

    if (anim_slot.finish_callback && anim_slot.exec_finish_callback) {
        anim_slot.exec_finish_callback = false;
        anim_slot.finish_callback(obj);
    }
}

exports.get_all_actions = function() {
    return _actions;
}

function apply_vertex_anim(obj, va, slot_num) {

    var anim_slot = obj._anim_slots[slot_num];

    anim_slot.type = OBJ_ANIM_TYPE_VERTEX;

    var start = va["frame_start"];
    // last frame will be rendered
    var length = va["frame_end"] - start + 1;
    anim_slot.start = start;
    anim_slot.length = length;
    anim_slot.current_frame_float = start;

    anim_slot.animation_name = va["name"];

    // calculate VBO offset for given vertex animation
    var va_frame_offset = 0;
    for (var i = 0; i < obj["data"]["b4w_vertex_anim"].length; i++) {
        var va_i = obj["data"]["b4w_vertex_anim"][i];

        if (va_i == va)
            break;
        else
            va_frame_offset += (va_i["frame_end"] - va_i["frame_start"] + 1);
    }

    anim_slot.va_frame_offset = va_frame_offset;
}

function apply_particles_anim(obj, psys, slot_num) {
    var anim_slot = obj._anim_slots[slot_num];

    anim_slot.type = OBJ_ANIM_TYPE_PARTICLES;
    anim_slot.animation_name = psys["name"];

    var pset = psys["settings"];
    anim_slot.start  = pset["frame_start"];
    anim_slot.length = pset["frame_end"] - anim_slot.start;

    if (!psys["settings"]["b4w_cyclic"])
        anim_slot.length += pset["lifetime"];

    anim_slot.particle_system = psys;
}

function init_anim(obj, slot_num) {

    var anim_slot = {
        type: null,
        animation_name: null,

        action_frame_range: null,
        action_step: 0,
        action_bflags: null,
        channels_mask: null,

        quats: null,
        trans: null,

        skinning_data: [],

        play: false,
        behavior: AB_FINISH_RESET,

        // cff = 0-length
        current_frame_float: 0,
        start: 0,
        length: 0,

        trans_smooth_period: 0,
        quat_smooth_period: 0,

        exec_finish_callback: false,

        va_frame_offset: null,
        speed: 1,

        volume: null,
        pitch: null,

        nodemat_values: [],
        node_value_inds: [],

        nodemat_rgbs: [],
        node_rgb_inds: []
    };

    if (!obj._anim_slots.length)
        for (var i = 0; i < 8; i++)
            obj._anim_slots.push(null);

    obj._anim_slots[slot_num] = anim_slot;

    obj._action_anim_cache = obj._action_anim_cache || [];
}

function update_anim_cache(obj) {
    if (_anim_objs_cache.indexOf(obj) == -1)
        _anim_objs_cache.push(obj);
}

exports.get_anim_names = function(obj) {
    var anim_names = [];

    if (has_vertex_anim(obj)) {
        for (var i = 0; i < obj["data"]["b4w_vertex_anim"].length; i++)
            anim_names.push(obj["data"]["b4w_vertex_anim"][i]["name"]);
    }

    var actions = get_actions(obj);
    for (var i = 0; i < actions.length; i++) {
        anim_names.push(strip_baked_suffix(actions[i]["name"]));
    }

    if (m_particles.has_particles(obj) && m_particles.has_anim_particles(obj))
        for (var i = 0; i < obj["particle_systems"].length; i++) {
            anim_names.push(obj["particle_systems"][i]["name"]);
        }

    return anim_names;
}

exports.strip_baked_suffix = strip_baked_suffix;
function strip_baked_suffix(name) {
    return name.replace(/_B4W_BAKED$/, "");
}

exports.get_anim_type = function(obj, slot_num) {
    var anim_slot = obj._anim_slots[slot_num]
    if (anim_slot)
        return anim_slot.type;

    return null;
}

/**
 * Search for possible object animations init and apply one of each type
 * (object, vertex, armature, etc...)
 */
exports.apply_def = function(obj) {
    var slot_num = SLOT_0;

    var actions = get_default_actions(obj);
    for (var i = 0; i < actions.length; i++) {
        var action = actions[i]

        do_before_apply(obj, slot_num);
        if (apply_action(obj, action, slot_num)) {
            do_after_apply(obj, slot_num);
            obj._anim_slots[slot_num].behavior =
                    anim_behavior_bpy_b4w(obj["b4w_anim_behavior"]);
            slot_num++
        } else
            obj._anim_slots[slot_num] = null;
    }

    var psystems = obj["particle_systems"];
    for (var i = 0; i < psystems.length; i++) {
        var psys = psystems[i];
        var psettings = psys["settings"];
        if (psettings["type"] == "EMITTER") {
            do_before_apply(obj, slot_num);
            apply_particles_anim(obj, psys, slot_num);
            do_after_apply(obj, slot_num);
            obj._anim_slots[slot_num].behavior =
                    anim_behavior_bpy_b4w(obj["b4w_anim_behavior"]);
            if (psettings["b4w_cyclic"])
                obj._anim_slots[slot_num].behavior = AB_CYCLIC;
            slot_num++
        }
    }

    if (has_vertex_anim(obj)) {
        do_before_apply(obj, slot_num);
        apply_vertex_anim(obj, obj["data"]["b4w_vertex_anim"][0], slot_num);
        do_after_apply(obj, slot_num);
        obj._anim_slots[slot_num].behavior =
                anim_behavior_bpy_b4w(obj["b4w_anim_behavior"]);
        slot_num++

    }
}

function anim_behavior_bpy_b4w(b4w_behavior) {
    switch (b4w_behavior) {
    case "CYCLIC":
        return AB_CYCLIC;
    case "FINISH_RESET":
        return AB_FINISH_RESET;
    case "FINISH_STOP":
        return AB_FINISH_STOP;
    default:
        m_util.panic("Wrong animation behavior");
    }
}

/**
 * Returns object specific actions
 */
function get_actions(obj) {

    var act_list = [];

    for (var i = 0; i < _actions.length; i++) {
        var action = _actions[i];
        var bones = action._render.bones;
        var bones_num = m_util.get_dict_length(bones);
        var act_render = action._render;

        if (bones_num) {
            if (obj["type"] == "ARMATURE")
                act_list.push(action);
        } else if (act_render.params["volume"] || act_render.params["pitch"]) {
            if (m_sfx.is_speaker(obj))
                act_list.push(action);
        } else if (!is_material_action(action) &&
                   m_util.get_dict_length(action["fcurves"])) {
            act_list.push(action);
        }
    }

    if (obj["type"] == "MESH")
        act_list = act_list.concat(get_material_actions(obj));

    return act_list;
}

/**
 * Try to get action from the following places:
 *  obj.animation_data.action
 *  spkobj.data.animation_data
 *  obj.data.materials.node_tree.animation_data
 * @param {Object} obj Object ID
 * @returns Default action or null
 */
function get_default_actions(obj) {

    var act_list = [];

    // animation_data
    var anim_data = obj["animation_data"];

    if (anim_data && anim_data["action"]) {
        var action = anim_data["action"];
        // do not return actions without fcurves
        if (m_util.get_dict_length(action["fcurves"])) {
            var bones = action._render.bones;
            var bones_num = m_util.get_dict_length(bones);
            if (obj["type"] == "ARMATURE" || !bones_num)
                act_list.push(action);
        }
    }

    if (m_sfx.is_speaker(obj) && obj["data"]["animation_data"] &&
            obj["data"]["animation_data"]["action"])
        act_list.push(obj["data"]["animation_data"]["action"]);

    if (obj["type"] == "MESH")
        act_list = act_list.concat(get_material_actions(obj));

    return act_list;
}

function get_material_actions(obj) {

    var act_list = [];

    var materials = obj["data"]["materials"];
    for (var i = 0; i < materials.length; i++) {
        var mat = materials[i];
        var node_tree = mat["node_tree"];

        if (node_tree)
            get_node_tree_actions_r(node_tree, act_list);
    }
    return act_list;
}

function get_node_tree_actions_r(node_tree, container) {
    if (node_tree["animation_data"]) {
        var anim_data = node_tree["animation_data"];
        var action = anim_data["action"];
        // do not return actions without fcurves
        if (action && m_util.get_dict_length(action["fcurves"])) {
            container.push(action);
        }
    }
    var nodes = node_tree["nodes"];
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (node["node_group"]) {
            var g_node_tree = node["node_group"]["node_tree"];
            if (g_node_tree)
                get_node_tree_actions_r(g_node_tree, container);
        }
    }
}

function has_vertex_anim(obj) {
    if (m_util.is_mesh(obj) && obj._render.vertex_anim)
        return true;
    else
        return false;
}

exports.get_first_armature_object = get_first_armature_object;
function get_first_armature_object(obj) {
    var modifiers = obj["modifiers"];
    for (var i = 0; i < modifiers.length; i++) {
        var modifier = modifiers[i];
        if (modifier["type"] == "ARMATURE")
            return modifier["object"];
    }

    return null;
}


/**
 * Start to play preset animation
 * offset in seconds
 */
exports.play = function(obj, finish_callback, slot_num) {
    function play_slot(anim_slot) {
        anim_slot.play = true;

        if (finish_callback)
            anim_slot.finish_callback = finish_callback;
        else
            anim_slot.finish_callback = null;

        anim_slot.exec_finish_callback = false;
    }
    process_anim_slots(obj._anim_slots, slot_num, play_slot);

    if (obj._render.anim_mixing)
        sync_skeletal_animations(obj);
}

/**
 * Stop object animation
 */
exports.stop = function(obj, slot_num) {
    function stop_slot(anim_slot) {
        anim_slot.play = false;
        anim_slot.finish_callback = null;
        anim_slot.exec_finish_callback = false;
    }
    process_anim_slots(obj._anim_slots, slot_num, stop_slot);
}

exports.is_play = function(obj, slot_num) {
    var anim_slot = obj._anim_slots[slot_num];
    if (anim_slot)
        return anim_slot.play;

    return false;
}

exports.set_current_frame_float = function(obj, cff, slot_num) {
    var anim_slots = obj._anim_slots;
    if (slot_num == SLOT_ALL) {
        for (var i = 0; i < 8; i++) {
            var anim_slot = anim_slots[i]
            if (anim_slot) {
                anim_slot.current_frame_float = cff;
                update_object_animation(obj, 0, i, true)
            }
        }
    } else {
        var anim_slot = anim_slots[slot_num]
        if (anim_slot) {
            anim_slot.current_frame_float = cff;
            update_object_animation(obj, 0, slot_num, true)
        }
    }
}

exports.get_current_frame_float = function(obj, slot_num) {
    var anim_slot = obj._anim_slots[slot_num]
    if (anim_slot && anim_slot.current_frame_float)
        return anim_slot.current_frame_float;
    else
        return 0.0;
}

exports.is_cyclic = function(obj, slot_num) {
    var anim_slot = obj._anim_slots[slot_num]
    return anim_slot && anim_slot.behavior == AB_CYCLIC;
}

exports.set_behavior = function(obj, behavior, slot_num) {
    function set_slot_behavior(anim_slot) {
        anim_slot.behavior = behavior;
    }
    process_anim_slots(obj._anim_slots, slot_num, set_slot_behavior);
}

exports.get_behavior = function(obj, slot_num) {
    var anim_slot = obj._anim_slots[slot_num]
    return anim_slot && anim_slot.behavior;
}

exports.apply_smoothing = function(obj, trans_period, quat_period, slot_num) {
    function apply_slot_smoothing(anim_slot) {
        anim_slot.trans_smooth_period = trans_period || 0;
        anim_slot.quat_smooth_period = quat_period || 0;
    }
    process_anim_slots(obj._anim_slots, slot_num, apply_slot_smoothing);
}

exports.remove_slot_animation = function(obj, slot_num) {
    if (slot_num == SLOT_ALL)
        for (var i = 0; i < 8; i++)
            obj._anim_slots[i] = null;
    else
        obj._anim_slots[slot_num] = null;

    if (obj._render.anim_mixing)
        recalculate_armature_anim_slots(obj, slot_num);
}


function process_anim_slots(anim_slots, slot_num, procedure) {
    if (slot_num == SLOT_ALL)
        for (var i = 0; i < 8; i++) {
            var anim_slot = anim_slots[i]
            if (anim_slot)
                procedure(anim_slot)
        }
    else {
        var anim_slot = anim_slots[slot_num]
        if (anim_slot)
            procedure(anim_slot)
    }
}

/**
 * Update object animation (set object pose)
 */
exports.update_object_animation = update_object_animation;
function update_object_animation(obj, elapsed, slot_num, force_update) {
    animate(obj, elapsed, slot_num, force_update);
    handle_finish_callback(obj, slot_num);

    if (obj._render.anim_mixing) {
        process_mix_factor(obj, elapsed);
        mix_skeletal_animation(obj, elapsed);
    }
}

/**
 * <p>Check if animation possible
 * <p>animation is possible, if one of the following conditions is met:
 * <ol>
 * <li>obj is an armature
 * <li>obj has a link to an armature
 * <li>obj has an animation_data.action
 * <li>obj is a speaker with param animation
 * <li>obj has particle system
 * <li>obj has vertex animation
 * </ol>
 */
exports.is_animatable = function(bpy_obj) {

    if (bpy_obj["type"] == "ARMATURE")
        return true;

    var armobj = get_first_armature_object(bpy_obj);
    if (armobj)
        return true;

    // animation_data
    var anim_data = bpy_obj["animation_data"];
    if (anim_data && anim_data["action"])
        return true;

    if (bpy_obj["type"] == "SPEAKER" && bpy_obj["data"]["animation_data"] &&
            bpy_obj["data"]["animation_data"]["action"])
        return true;

    if (m_particles.has_particles(bpy_obj) && m_particles.has_anim_particles(bpy_obj))
        return true;

    if (bpy_obj["type"] == "MESH" &&
            bpy_obj["data"]["b4w_vertex_anim"].length)
        return true;

    if (has_animated_nodemats(bpy_obj))
        return true;

    return false;
}

exports.is_animated = function(obj) {
    return Boolean(obj._anim_slots.length);
}

/**
 * Calculate object animation data:
 * quats, trans for each bone (group) index and pierced point
 * save them to obj._anim_slots
 */
function apply_action(obj, action, slot_num) {

    var frame_range = action["frame_range"];

    var act_render = action._render;

    var anim_slot = obj._anim_slots[slot_num];

    anim_slot.animation_name = action["name"];
    anim_slot.action_frame_range = frame_range;
    anim_slot.action_step = act_render.pierce_step;
    anim_slot.action_bflags = act_render.bflags;
    anim_slot.channels_mask = act_render.channels_mask;

    anim_slot.start = frame_range[0];
    anim_slot.length = frame_range[1] - frame_range[0];
    anim_slot.current_frame_float = frame_range[0];

    var bones = act_render.bones;
    var num_bones = m_util.get_dict_length(bones);

    if (m_util.is_armature(obj) && num_bones) {
        anim_slot.type = OBJ_ANIM_TYPE_ARMATURE;

        var pose_data_frames = get_cached_anim_data(obj, action);
        if (!pose_data_frames) {
            var bone_pointers = calc_armature_bone_pointers(obj);
            var pose_data_frames = calc_pose_data_frames(obj, action, bone_pointers);
            cache_anim_data(obj, action, pose_data_frames);
        }

        anim_slot.trans = pose_data_frames.trans;
        anim_slot.quats = pose_data_frames.quats;

        init_skinned_objs_data(obj, slot_num, action);

    } else if (m_sfx.is_speaker(obj) && (act_render.params["volume"] ||
            act_render.params["pitch"])) {

        anim_slot.volume = act_render.params["volume"] || null;
        anim_slot.pitch = act_render.params["pitch"] || null;
        anim_slot.type = OBJ_ANIM_TYPE_SOUND;

    } else if (obj["type"] == "MESH" && is_material_action(action)) {
        anim_slot.type = OBJ_ANIM_TYPE_MATERIAL;

        var nodemat_anim_data = get_cached_anim_data(obj, action);

        if (!nodemat_anim_data) {
            nodemat_anim_data = calc_nodemat_anim_data(obj, action);
            cache_anim_data(obj, action, nodemat_anim_data);
        }

        anim_slot.node_value_inds = nodemat_anim_data.val_inds;
        anim_slot.nodemat_values = nodemat_anim_data.values;
        anim_slot.node_rgb_inds = nodemat_anim_data.rgb_inds;
        anim_slot.nodemat_rgbs = nodemat_anim_data.rgbs;

    } else {
        var tsr = act_render.params["tsr"];
        if (tsr) {

            anim_slot.type = OBJ_ANIM_TYPE_OBJECT;

            var obj_anim_data = get_cached_anim_data(obj, action);

            if (!obj_anim_data) {
                obj_anim_data = calc_obj_anim_data(obj, action, tsr);
                cache_anim_data(obj, action, obj_anim_data);
            }

            anim_slot.trans = obj_anim_data.trans;
            anim_slot.quats = obj_anim_data.quats;

            // move particles with world coordinate system to objects position
            if (m_particles.has_particles(obj)) {
                var trans = anim_slot.trans;
                var quats = anim_slot.quats;
                m_particles.update_start_pos(obj, trans, quats);
            }
        } else {
            m_print.warn("Incompatible action \"" + action["name"] + 
                    "\" has been applied to object \"" + obj["name"] + "\"");
            return false;
        }
    }
    if (m_util.is_armature(obj) && !num_bones)
        recalculate_armature_anim_slots(obj, slot_num);
    return true;
}

function get_cached_anim_data(obj, action) {

    var cache = obj._action_anim_cache;

    for (var i = 0; i < cache.length; i+=2)
        if (action == cache[i])
            return cache[i+1];

    return null;
}

function cache_anim_data(obj, action, data) {
    var cache = obj._action_anim_cache;
    cache.push(action, data);
}

function init_skinned_objs_data(armobj, slot_num, action) {

    var render = armobj._render;
    var skinned_renders = render.skinned_renders;

    var anim_slot = armobj._anim_slots[slot_num];
    var skinning_data = anim_slot.skinning_data;

    var skinning_data_cache = get_cached_skinning_data(render, action);

    if (!skinning_data_cache) {
        for (var i = 0; i < skinned_renders.length; i++) {
            var sk_rend = skinned_renders[i];
            var bone_pointers = sk_rend.bone_pointers;
            // calc anim data by posing armature object in every pierced point
            var pose_data_frames = calc_pose_data_frames(armobj, action, bone_pointers);
            skinning_data.push(pose_data_frames);
        }
        cache_skinning_data(render, action, skinning_data);
    } else
        anim_slot.skinning_data = skinning_data_cache;

    if (render.anim_mixing) {
        var skeletal_slots = render.two_last_skeletal_slots;
        if (slot_num > skeletal_slots[1]) {
            var tmp = skeletal_slots[1];
            skeletal_slots[1] = slot_num;
            skeletal_slots[0] = tmp;
        } else if (slot_num > skeletal_slots[0] && slot_num < skeletal_slots[1])
            skeletal_slots[0] = slot_num;

        sync_skeletal_animations(armobj);
    }
}

function get_cached_skinning_data(render, action) {
    var cache = render.skinning_data_cache;

    for (var i = 0; i < cache.length; i+=2)
        if (action == cache[i])
            return cache[i+1];

    return null;
}

function cache_skinning_data(render, action, skinning_data) {
    var cache = render.skinning_data_cache;
    cache.push(action, skinning_data);
}

function sync_skeletal_animations(armobj) {

    var skeletal_slots = armobj._render.two_last_skeletal_slots;

    // one or none skeletal animation applied
    if (skeletal_slots[0] == -1 || skeletal_slots[1] == -1)
        return;

    // last skeletal animation slot determines frame allignment
    var last_skel_slot = skeletal_slots[1];

    var anim_slots = armobj._anim_slots;
    var last_skel_anim = anim_slots[last_skel_slot];

    var cff = last_skel_anim.current_frame_float;
    var cff_int = Math.floor(cff);
    var frame_factor = cff - cff_int;

    var prev_skel_slot = skeletal_slots[0];
    var prev_skel_anim = anim_slots[prev_skel_slot];
    var cff = prev_skel_anim.current_frame_float;
    var cff_int = Math.floor(cff);

    prev_skel_anim.current_frame_float = cff_int + frame_factor;
}

function recalculate_armature_anim_slots(obj, overriden_slot) {

    var skeletal_slots = obj._render.two_last_skeletal_slots;

    var last_skel_slot = skeletal_slots[1];

    skeletal_slots[0] = -1;
    skeletal_slots[1] = -1;

    if (overriden_slot == SLOT_ALL)
        return;

    var anim_slots = obj._anim_slots;
    for (var i = last_skel_slot; i >= SLOT_0; i--) {

        var anim_slot = anim_slots[i];

        if (anim_slot && anim_slot.type == OBJ_ANIM_TYPE_ARMATURE) {
            if (i > skeletal_slots[1]) {
                skeletal_slots[1] = i;
                continue;
            } else if (i > skeletal_slots[0])
                skeletal_slots[1] = i;

            // two slots have been assigned
            break;
        }
    }
}

/**
 * Find constraint with type and target pointing to armature obj
 */
function find_armature_constraint(constraints, type) {
    for (var i = 0; i < constraints.length; i++) {
        var cons = constraints[i];

        if (cons["type"] == type) {

            var target = cons["target"];

            if (target && target["type"] == "ARMATURE")
                return cons;
        }
    }
    return false;
}

exports.calc_armature_bone_pointers = calc_armature_bone_pointers;
function calc_armature_bone_pointers(armobj) {
    var bones = armobj["data"]["bones"];
    var pose_bones = armobj["pose"]["bones"];

    var bone_pointers = {};

    for (var i = 0; i < bones.length; i++) {
        var bone = bones[i];
        var bone_name = bone["name"];

        bone_pointers[bone_name] = {
            bone_index: i,
            deform_bone_index: i,
            pose_bone_index: m_util.get_index_for_key_value(pose_bones, "name",
                    bone_name),
            vgroup_index: -1
        }
    }

    return bone_pointers;
}

function calc_nodemat_anim_data(obj, action) {

    var val_inds = [];
    var values = [];
    var rgb_inds = [];
    var rgbs = [];

    var act_render = action._render;
    var val_ind_pairs = obj._render.mats_anim_inds;
    var rgb_ind_pairs = obj._render.mats_rgb_anim_inds;

    for (var node_name in act_render.params) {
        var act_node_name = action["name"] + "%join%" + node_name;
        calc_node_act(node_name, act_node_name, act_render, values, val_inds,
                      val_ind_pairs);
        calc_node_act(node_name, act_node_name, act_render, rgbs, rgb_inds,
                      rgb_ind_pairs);
    }
    return {val_inds: val_inds, values: values,
            rgb_inds: rgb_inds, rgbs: rgbs};
}

function calc_node_act(node_name, act_node_name, act_render, values, inds,
                       val_ind_pairs) {
    for (var i = 0; i < val_ind_pairs.length; i+=2) {
        var name = val_ind_pairs[i];
        if (act_node_name == name) {
            var ind = val_ind_pairs[i+1];
            inds.push(ind);
            values.push(new Float32Array(act_render.params[node_name]));
        }
    }
}


function calc_obj_anim_data(obj, action, tsr) {

    var act_render = action._render;

    // TODO: clarify length/frame_range/num_pierced
    var num_pierced = act_render.num_pierced;

    var anim_trans = [];
    var anim_quats = [];
    for (var i = 0; i < num_pierced; i++) {
        anim_trans.push(tsr.subarray(i*8, i*8 + 4));
        anim_quats.push(tsr.subarray(i*8 + 4, i*8 + 8));
    }
    return {trans: anim_trans, quats: anim_quats};
}

/**
 * Find bone by name and calculate bone pointer
 */
function calc_bone_pointer(bone_name, armobj) {
    var bones = armobj["data"]["bones"];
    var pose_bones = armobj["pose"]["bones"];

    var bone = m_util.keysearch("name", bone_name, bones);
    var bone_index = m_util.get_index_for_key_value(bones, "name", bone_name);

    if (bone_index > -1) {
        var bone_pointer = {
            bone_index: bone_index,
            deform_bone_index: 0,
            pose_bone_index: m_util.get_index_for_key_value(pose_bones, "name",
                    bone_name),
            vgroup_index: -1
        }
        return bone_pointer;
    } else
        return null;
}

function is_material_action(action) {

    var act_render = action._render;

    for (var param in act_render.params)
        if (param.indexOf("nodes") != -1) {
            return true;
        }

    return false;
}

function animate(obj, elapsed, slot_num, force_update) {

    var anim_slot = obj._anim_slots[slot_num];

    if (!anim_slot || anim_slot.type == null)
        return;

    // update paused animation only if elapsed == 0
    if (!anim_slot.play && !force_update)
        return

    var render = obj._render;

    var cff = anim_slot.current_frame_float;
    var start = anim_slot.start;
    var length = anim_slot.length;

    cff += anim_slot.speed * elapsed * cfg_ani.framerate;

    var anim_type = anim_slot.type;
    var speed = anim_slot.speed;

    if ((speed >= 0 && cff >= start + length) ||
        (speed < 0 && cff < start)) {
        anim_slot.exec_finish_callback = true;

        switch (anim_slot.behavior) {
        case AB_CYCLIC:
            if (speed >= 0)
                cff = (cff - start) % length + start;
            else
                cff = start + length - 0.000001;
            break;
        case AB_FINISH_RESET:
            if (speed >= 0)
                cff = start;
            else
                cff = start + length - 0.000001;
            anim_slot.play = false;
            break;
        case AB_FINISH_STOP:
            if (speed >= 0)
                cff = start + length - 0.000001;
            else
                cff = start;
            anim_slot.play = false;
            break;
        }
    }
    anim_slot.current_frame_float = cff;

    switch (anim_type) {
    case OBJ_ANIM_TYPE_ARMATURE:
        // NOTE: skeletal animation blending is being processed after animate()
        if (!render.anim_mixing) {

            var finfo = action_anim_finfo(anim_slot, cff, _frame_info_tmp);

            var frame = finfo[0];
            var frame_next = finfo[1];
            var frame_factor = finfo[2];

            render.quats_before = anim_slot.quats[frame];
            render.quats_after  = anim_slot.quats[frame_next];
            render.trans_before = anim_slot.trans[frame];
            render.trans_after  = anim_slot.trans[frame_next];

            render.frame_factor = frame_factor;

            animate_skinned_objs(render, anim_slot, frame, frame_next, frame_factor);
            m_trans.update_transform(obj);
        }
        break;

    case OBJ_ANIM_TYPE_OBJECT:
        var finfo = action_anim_finfo(anim_slot, cff, _frame_info_tmp);

        var trans = get_anim_translation(anim_slot, 0, finfo, _vec3_tmp);
        var quat = get_anim_rotation(anim_slot, 0, finfo, _quat4_tmp);
        var scale = get_anim_scale(anim_slot, 0, finfo);

        if (anim_slot.trans_smooth_period) {
            var trans_old = _vec3_tmp2;
            m_trans.get_translation(obj, trans_old);
            m_util.smooth_v(trans, trans_old, elapsed,
                    anim_slot.trans_smooth_period, trans);
        }

        if (anim_slot.quat_smooth_period) {
            var quat_old = _quat4_tmp2;
            m_trans.get_rotation(obj, quat_old);
            m_util.smooth_q(quat, quat_old, elapsed,
                    anim_slot.quat_smooth_period, quat);
        }

        var mask = anim_slot.channels_mask;

        if (mask[0])
            m_trans.set_translation(obj, trans);
        if (mask[1])
            m_trans.set_rotation(obj, quat);
        if (mask[2])
            m_trans.set_scale(obj, scale);

        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
        break;

    case OBJ_ANIM_TYPE_VERTEX:
        vertex_anim_finfo(anim_slot, cff, _frame_info_tmp);
        var finfo = _frame_info_tmp;

        render.va_frame = finfo[0];
        render.va_frame_factor = finfo[2];
        break;

    case OBJ_ANIM_TYPE_SOUND:
        var finfo = action_anim_finfo(anim_slot, cff, _frame_info_tmp);
        var fc = finfo[0];
        var fn = finfo[1];
        var ff = finfo[2];

        if (anim_slot.volume) {
            var volume = (1-ff) * anim_slot.volume[fc] + ff * anim_slot.volume[fn];
            m_sfx.set_volume(obj, volume);
        }

        if (anim_slot.pitch) {
            var pitch = (1-ff) * anim_slot.pitch[fc] + ff * anim_slot.pitch[fn];
            m_sfx.playrate(obj, pitch);
        }
        break;

    case OBJ_ANIM_TYPE_PARTICLES:
        var time = cff / cfg_ani.framerate;
        var psys = anim_slot.particle_system;
        m_particles.set_time(psys, time);
        break;

    case OBJ_ANIM_TYPE_MATERIAL:
        var finfo = action_anim_finfo(anim_slot, cff, _frame_info_tmp);
        var fc = finfo[0];
        var fn = finfo[1];
        var ff = finfo[2];

        var values = anim_slot.nodemat_values;
        var val_indices = anim_slot.node_value_inds;

        var rgbs = anim_slot.nodemat_rgbs;
        var rgb_indices = anim_slot.node_rgb_inds;

        for (var i = 0; i < val_indices.length; i++) {
            var vals = values[i];
            var ind = val_indices[i];

            var nodemat_value = (1-ff) * vals[fc] + ff * vals[fn];
            obj._render.mats_values[ind] = nodemat_value;
        }
        for (var i = 0; i < rgb_indices.length; i++) {
            var rgb = rgbs[i];
            var ind = rgb_indices[i];

            var prev = rgb.subarray(fc*3, fc*3 + 3);
            var next = rgb.subarray(fn*3, fn*3 + 3);
            var curr = m_vec3.lerp(prev, next, ff, _vec3_tmp);
            obj._render.mats_rgbs[ind] = curr[0];
            obj._render.mats_rgbs[ind + 1] = curr[1];
            obj._render.mats_rgbs[ind + 2] = curr[2];
        }
        break;

    default:
        m_util.panic("Unknown animation type:" + anim_type);
        break;
    }
}

/**
 * Calculate integer frame, frame_next and float frame_factor
 */
function action_anim_finfo(anim_slot, cff, dest) {
    if (!dest)
        var dest = new Array(3);

    var action_start = anim_slot.action_frame_range[0];
    var action_end = anim_slot.action_frame_range[1];

    var range = action_end - action_start;

    // index in fcurve' pierced points array
    var index_float = cff - action_start;

    if (index_float < 0)
        index_float = 0;
    if (index_float >= range)
        index_float = range;

    var step = anim_slot.action_step;
    index_float /= step;

    var frame = Math.floor(index_float);
    var frame_next = frame + 1;

    var frame_factor;

    // NOTE: get from first group
    if (anim_slot.action_bflags[frame])
        frame_factor = index_float - frame;
    else
        frame_factor = 0;

    dest[0] = frame;
    dest[1] = frame_next;
    dest[2] = frame_factor;

    return dest;
}

/**
 * Calculate integer frame, frame_next and float frame_factor
 */
function vertex_anim_finfo(anim_slot, cff, dest) {
    if (!dest)
        var dest = new Array(3);

    // index in VBO array, starting from 0
    var index_float = cff - anim_slot.start;

    if (index_float < 0)
        index_float = 0;
    if (index_float >= anim_slot.length)
        index_float = anim_slot.length;

    var frame = Math.floor(index_float);
    var frame_next = frame + 1;
    var frame_factor = index_float - frame;

    // handle last frame for non-cyclic animation
    // for cyclic animation we have last frame equal to first one
    // see extract_submesh()
    if (anim_slot.behavior != AB_CYCLIC && frame_next == anim_slot.length) {
        frame = frame-1;
        frame_next = frame;
        frame_factor = 1.0;
    }

    // take into account previous vertex anims
    var va_frame_offset = anim_slot.va_frame_offset;

    dest[0] = frame + va_frame_offset;
    dest[1] = frame_next + va_frame_offset;
    dest[2] = frame_factor;

    return dest;
}

function animate_skinned_objs(render, anim_slot, frame, frame_next, frame_factor) {
    // update skinned objects
    var skinned_renders = render.skinned_renders;
    var skinning_data = anim_slot.skinning_data;
    for (var i = 0; i < skinned_renders.length; i++) {
        var skinned_render = skinned_renders[i];
        var sk_data = skinning_data[i];
        skinned_render.quats_before = sk_data.quats[frame];
        skinned_render.quats_after  = sk_data.quats[frame_next];
        skinned_render.trans_before = sk_data.trans[frame];
        skinned_render.trans_after  = sk_data.trans[frame_next];
        skinned_render.frame_factor = frame_factor;
    }
}

/**
 * Mix two last skeletal animations based on mix_factor
 */
function mix_skeletal_animation(obj, elapsed) {
    var render = obj._render;

    var mix_factor = render.anim_mix_factor;

    var skeletal_slots = render.two_last_skeletal_slots;

    var ind_0 = skeletal_slots[0];
    var ind_1 = skeletal_slots[1];

    // no skeletal anim assigned to armature
    if (ind_1 == -1)
        return;

    if (ind_0 != -1) {
        // penult anim
        var skeletal_slot_0 = obj._anim_slots[ind_0];

        if (skeletal_slot_0.play || elapsed == 0) {

            var cff_0 = skeletal_slot_0.current_frame_float;
            var finfo_0 = action_anim_finfo(skeletal_slot_0, cff_0, _frame_info_tmp);

            var frame_0 = finfo_0[0];
            var frame_next_0 = finfo_0[1];
            var frame_factor = finfo_0[2];

            var quats_prev_0 = skeletal_slot_0.quats[frame_0];
            var quats_next_0 = skeletal_slot_0.quats[frame_next_0];
            var trans_prev_0 = skeletal_slot_0.trans[frame_0];
            var trans_next_0 = skeletal_slot_0.trans[frame_next_0];
        } else
            mix_factor = 1;
    } else
        mix_factor = 1;

    // last anim
    var skeletal_slot_1 = obj._anim_slots[ind_1];

    if (skeletal_slot_1.play || elapsed == 0) {

        var cff_1 = skeletal_slot_1.current_frame_float;
        var finfo_1 = action_anim_finfo(skeletal_slot_1, cff_1, _frame_info_tmp);

        var frame_1 = finfo_1[0];
        var frame_next_1 = finfo_1[1];

        // frame_factor is common for two animations as they are synced when applied
        frame_factor = finfo_1[2];
    } else if (ind_0 != -1 && skeletal_slot_0.play) {
        mix_factor = 0;
    } else {
        return;
    }

    var quats_prev_1 = skeletal_slot_1.quats[frame_1];
    var quats_next_1 = skeletal_slot_1.quats[frame_next_1];
    var trans_prev_1 = skeletal_slot_1.trans[frame_1];
    var trans_next_1 = skeletal_slot_1.trans[frame_next_1];

    if (mix_factor == 1) {
        render.quats_before.set(quats_prev_1);
        render.quats_after.set(quats_next_1);
        render.trans_before.set(trans_prev_1);
        render.trans_after.set(trans_next_1);
    } else if (mix_factor == 0) {
        render.quats_before.set(quats_prev_0);
        render.quats_after.set(quats_next_0);
        render.trans_before.set(trans_prev_0);
        render.trans_after.set(trans_next_0);
    } else {
        for (var i = 0; i < quats_prev_0.length; i+=4) {
            var quat1 = _quat4_tmp;
            var quat2 = _quat4_tmp2;

            // init quats_before
            for (var j = 0; j < 4; j++) {
                quat1[j] = quats_prev_0[i + j];
                quat2[j] = quats_prev_1[i + j];
            }

            m_quat.slerp(quat1, quat2, mix_factor, quat1);
            // write into buffer
            for (var j = 0; j < 4; j++)
                render.quats_before[i + j] = quat1[j];

            // init quats_after
            for (var j = 0; j < 4; j++) {
                quat1[j] = quats_next_0[i + j];
                quat2[j] = quats_next_1[i + j];
            }

            m_quat.slerp(quat1, quat2, mix_factor, quat1);
            // write into buffer
            for (var j = 0; j < 4; j++)
                render.quats_after[i + j] = quat1[j];
        }
        m_util.blend_arrays(trans_prev_0, trans_prev_1, mix_factor,
                            render.trans_before);
        m_util.blend_arrays(trans_next_0, trans_next_1, mix_factor,
                            render.trans_after);
    }
    m_trans.update_transform(obj);

    // update skinned objects
    var skinned_renders = render.skinned_renders;
    var bone_maps = render.mesh_to_arm_bone_maps;

    for (var i = 0; i < skinned_renders.length; i++) {

        var skinned_render = skinned_renders[i];
        var bone_map = bone_maps[i];

        for (var k = 0; k < bone_map.length; k+=2) {
            var sk_ind = bone_map[k];
            var arm_ind = bone_map[k+1];

            for (var l = 0; l < 4; l++) {
                skinned_render.quats_before[sk_ind + l] =
                                            render.quats_before[arm_ind + l];
                skinned_render.quats_after [sk_ind + l] =
                                            render.quats_after [arm_ind + l];
                skinned_render.trans_before[sk_ind + l] =
                                            render.trans_before[arm_ind + l];
                skinned_render.trans_after [sk_ind + l] =
                                            render.trans_after [arm_ind + l];
            }
        }

        skinned_render.frame_factor = frame_factor;
    }
}

function process_mix_factor(obj, elapsed) {

    var render = obj._render;
    var cur_mix_factor = render.anim_mix_factor;

    var speed = render.anim_mix_factor_change_speed;
    if (speed == 0)
        return;

    var dest_mix_factor = render.anim_destination_mix_factor;

    var delta = dest_mix_factor - cur_mix_factor;
    var increment = speed * elapsed;

    if (m_util.sign(delta) == m_util.sign(speed) // still need changes
            && Math.abs(increment) < Math.abs(delta))
        render.anim_mix_factor += increment;
    else {
        render.anim_mix_factor = render.anim_destination_mix_factor;
        render.anim_mix_factor_change_speed = 0;
    }
}

/**
 * Calculate skeletal animation data (i.e. pose) for every "pierced" frame
 * using prepared in action curves
 */
function calc_pose_data_frames(armobj, action, bone_pointers) {

    var pose_bones = armobj["pose"]["bones"];

    // convert to form appropriate for renderer
    var trans_frames = [];
    var quats_frames = [];

    // for every pierced frame setup pose and calc pose data
    var num_pierced = action._render.num_pierced;

    for (var i = 0; i < num_pierced; i++) {
        // for every pose bone set its matrix_basis
        for (var j = 0; j < pose_bones.length; j++) {
            var pose_bone = pose_bones[j];

            // provide identity placeholder for bones not deformed in this action
            var tsr_basis = m_tsr.create();

            // retrieve transform for this pierced point
            var bone_tsr = action._render.bones[pose_bone["name"]];
            if (bone_tsr)
                m_tsr.copy(bone_tsr.subarray(i*8, i*8 + 8), tsr_basis);

            pose_bone._tsr_basis = tsr_basis;

            // reset cache state (for calc_pose_bone)
            pose_bone._tsr_channel_cache_valid = false;
        }

        var pose_data = calc_pose_data(armobj, bone_pointers);

        trans_frames.push(pose_data.trans);
        quats_frames.push(pose_data.quats);
    }

    return {trans: trans_frames, quats: quats_frames};
}

exports.calc_pose_data = calc_pose_data;
/**
 * Calculate pose trans/quats for armature object
 */
function calc_pose_data(armobj, bone_pointers) {
    var trans = [];
    var quats = [];

    var pose_bones = armobj["pose"]["bones"];

    var t = new Float32Array(4);
    var q = new Float32Array(4);

    for (var bone_name in bone_pointers) {
        var bone_pointer = bone_pointers[bone_name];

        var pose_bone_index = bone_pointer.pose_bone_index;
        var deform_bone_index = bone_pointer.deform_bone_index;

        var pose_bone = pose_bones[pose_bone_index];

        calc_pose_bone(pose_bone, t, q);

        // write to appropriate places in uniform arrays
        for (var i = 0; i < 4; i++) {
            /* quat, tran vec4 */
            var comp_index = 4 * deform_bone_index + i;
            trans[comp_index] = t[i];
            quats[comp_index] = q[i];
        }
    }

    trans = new Float32Array(trans);
    quats = new Float32Array(quats);

    return {trans: trans, quats: quats};
}

/**
 * Calculate pose data for given bone.
 * recursively calculate _tsr_channel_cache beginning from "root"
 * store _tsr_channel_cache_valid state in each pose bone
 */
function calc_pose_bone(pose_bone, dest_trans_scale, dest_quat) {
    var chain = pose_bone._chain;

    var pose_bone_root = chain[chain.length-1];
    var tsr_channel_parent = pose_bone_root._tsr_channel_cache;

    // reset "root" bone if not valid
    if (!pose_bone_root._tsr_channel_cache_valid)
        m_tsr.identity(tsr_channel_parent);

    // start from the last bone ("root" for chain)
    for (var i = chain.length - 1; i >= 0; i--) {
        var pose_bone = chain[i];

        var tsr_channel = pose_bone._tsr_channel_cache;

        // this can be already calculated because
        // a bone can participate in other chains
        // else calculate channel TSR
        if (pose_bone._tsr_channel_cache_valid) {
            tsr_channel_parent = tsr_channel;
            continue;
        }

        // bone armature-relative TSR
        var tsr_local = pose_bone._tsr_local;
        // pose bone-relative TSR
        var tsr_basis = pose_bone._tsr_basis;

        // apply basis translation (delta) in armature space
        // go to bone space, apply pose, return back to armature space
        // tsr_local * (tsr_basis * tsr_locali)
        m_tsr.invert(tsr_local, _tsr8_tmp);
        m_tsr.multiply(tsr_basis, _tsr8_tmp, _tsr8_tmp);
        m_tsr.multiply(tsr_local, _tsr8_tmp, _tsr8_tmp);

        // apply hierarchy
        m_tsr.multiply(tsr_channel_parent, _tsr8_tmp, tsr_channel);

        // save
        tsr_channel_parent = tsr_channel;
        pose_bone._tsr_channel_cache_valid = true;
    }

    // split and store calculated TSR
    var tsr = pose_bone._tsr_channel_cache;

    dest_trans_scale[0] = tsr[0];
    dest_trans_scale[1] = tsr[1];
    dest_trans_scale[2] = tsr[2];
    dest_trans_scale[3] = tsr[3];
    dest_quat[0] = tsr[4];
    dest_quat[1] = tsr[5];
    dest_quat[2] = tsr[6];
    dest_quat[3] = tsr[7];
    m_quat.normalize(dest_quat, dest_quat);
}

/**
 * Parse animation curves.
 */
exports.append_action = function(action) {
    action._render = {};
    var act_render = action._render;
    act_render.pierce_step = 1 / cfg_ani.frame_steps;

    var init_storage = function(pierced_points, default_value) {
        if (typeof default_value == "object" && default_value.length) {
            var len = default_value.length;
            var storage = new Float32Array(pierced_points * len);

            for (var i = 0; i < pierced_points; i++)
                for (var j = 0; j < len; j++)
                    storage[i * len + j] = default_value[j];

        } else if (typeof default_value == "number") {
            var storage = new Float32Array(pierced_points);

            for (var i = 0; i < pierced_points; i++)
                storage[i] = default_value;
        } else
            m_util.panic("Wrong storage default value");

        return storage;
    }

    var BONE_EXP = new RegExp(/pose.bones\[\".+\"\]/g);
    var TSR8_DEF = m_tsr.create();

    var get_storage = function(params, bones, data_path, pierced_points,
                               num_channels) {
        if (data_path.search(BONE_EXP) > -1) {
            var storage_obj = bones;
            var name = data_path.split("\"")[1];
            var def_val = TSR8_DEF;
        } else {
            var storage_obj = params;
            if (num_channels == 8) {
                var name = "tsr";
                var def_val = TSR8_DEF;
            } else if (num_channels > 1) {
                var name = data_path;
                var def_val = new Float32Array(num_channels);
            } else {
                var name = data_path;
                var def_val = 0.0;
            }
        }

        if (!storage_obj[name]) {
            storage_obj[name] = init_storage(pierced_points, def_val);
        }

        return storage_obj[name];
    }

    var storage_offset = function(data_path, array_index) {
        if (data_path.indexOf("location") > -1) {
            var base_offset = 0;
            var channel_offset = array_index;
        } else if (data_path.indexOf("rotation_quaternion") > -1) {
            var base_offset = 4;
            // W X Y Z -> X Y Z W
            var channel_offset = (array_index == 0) ? 3 : array_index - 1;
        } else if (data_path.indexOf("scale") > -1) {
            var base_offset = 3;
            var channel_offset = 0;
        } else {
            var base_offset = 0;
            var channel_offset = array_index;
        }
        return base_offset + channel_offset;
    }
    var fcurves = action["fcurves"];

    var params = {};
    var bones = {};

    var num_pierced = 0;

    for (var data_path in fcurves) {
        var channels = fcurves[data_path];

        for (var array_index in channels) {
            var fcurve = channels[array_index];
            var pp = fcurve._pierced_points;
            m_reformer.check_anim_fcurve_completeness(fcurve, action);
            var num_channels = fcurve["num_channels"];

            if (!num_pierced)
                num_pierced = pp.length;

            var storage = get_storage(params, bones, data_path, num_pierced,
                                      num_channels);

            var stride = storage.length / num_pierced;
            // NOTE: converting JSON key "array_index" to Int
            var offset = storage_offset(data_path, array_index | 0);

            for (var i = 0; i < num_pierced; i++)
                storage[i * stride + offset] = pp[i];
        }
    }

    var prepare_tsr_arr = function(tsr_arr, num_pierced) {
        for (var i = 0; i < num_pierced; i++) {
            var quat = tsr_arr.subarray(i*8 + 4, i*8 + 8);
            m_quat.normalize(quat, quat);
        }
    }

    for (var p in params)
        if (p == "tsr")
            prepare_tsr_arr(params[p], num_pierced);

    for (var b in bones)
        prepare_tsr_arr(bones[b], num_pierced);

    act_render.params = params;
    act_render.bones = bones;
    act_render.bflags = action._bflags;
    act_render.num_pierced = num_pierced;

    if ("tsr" in params)
        act_render.channels_mask = set_act_channels_mask(fcurves);
    else
        act_render.channels_mask = null;

    _actions.push(action);
}

function set_act_channels_mask(fcurves) {
    var mask = [0,0,0];
    for (var data_path in fcurves) {
        var channels = fcurves[data_path];
        if (data_path == "location")
            mask[0] = 1;
        else if (data_path == "rotation_quaternion")
            mask[1] = 1;
        else if (data_path == "scale")
            mask[2] = 1;
    }
    return mask;
}

exports.get_approx_curve_length = function(start, end) {
    return (end - start) * cfg_ani.frame_steps + 1;
}

/**
 * Perform fcurve extrapolation/interpolation.
 * Write points array for each fcurve
 * Update bflags array for each fcurve in action (write only unit values)
 */
exports.approximate_curve = function(fcurve, fcurve_bin_data, points, bflags,
        start, end) {

    // initialize util arrays
    var v1 = new Float32Array(2);
    var v2 = new Float32Array(2);
    var v3 = new Float32Array(2);
    var v4 = new Float32Array(2);

    var step = 1 / cfg_ani.frame_steps;

    var first_frame = fcurve_bin_data[1];
    var first_frame_value = fcurve_bin_data[2];

    var last_frame = fcurve_bin_data[fcurve["last_frame_offset"] + 1];
    var last_frame_value = fcurve_bin_data[fcurve["last_frame_offset"] + 2];

    var out_cursor = 0;
    var bin_cursor = 0;
    var interp_prev = null;

    for (var i = start; i <= end; i++) {
        // make extrapolation before fcurve
        if (i < first_frame)
            for (var j = 0; j < cfg_ani.frame_steps; j++)
                points[out_cursor++] = first_frame_value;

        // make extrapolation after fcurve
        else if (i > last_frame)
            for (var j = 0; j < cfg_ani.frame_steps; j++)
                points[out_cursor++] = last_frame_value;

        // process points inside
        else {
            // calc properties of current keyframe
            var interp = fcurve_bin_data[bin_cursor];
            var offset_to_next_kf = 3;
            if (interp === KF_INTERP_BEZIER)
                offset_to_next_kf += 2;
            if (interp_prev === KF_INTERP_BEZIER)
                offset_to_next_kf += 2;
            var is_blended = (interp === KF_INTERP_CONSTANT) ? 0 : 1;

            // NOTE: if next frame time same as current (decimal converted to
            // integer) then move to next frame immediately
            if (fcurve_bin_data[bin_cursor + 1]
                    == fcurve_bin_data[bin_cursor + offset_to_next_kf + 1]) {
                interp_prev = interp;
                bin_cursor += offset_to_next_kf;
                continue;
            }

            // take base data from source array for integer point value
            var substep_from = 0;
            if (i == fcurve_bin_data[bin_cursor + 1]) {
                if (is_blended)
                    bflags[out_cursor] = 1;
                points[out_cursor] = fcurve_bin_data[bin_cursor + 2];
                out_cursor++;

                substep_from++;
            }

            // process points for fcurve last keyframe (extrapolation,
            // outside fcurve)
            if (i == last_frame)
                for (var j = substep_from; j < cfg_ani.frame_steps; j++)
                    points[out_cursor++] = last_frame_value;
            else {
                // control point
                v1[0] = fcurve_bin_data[bin_cursor + 1];
                v1[1] = fcurve_bin_data[bin_cursor + 2];
                // right handle
                if (interp !== KF_INTERP_BEZIER) {
                    v2[0] = 0;
                    v2[1] = 0;
                } else {
                    if (interp_prev === KF_INTERP_BEZIER) {
                        v2[0] = fcurve_bin_data[bin_cursor + 5];
                        v2[1] = fcurve_bin_data[bin_cursor + 6];
                    } else {
                        v2[0] = fcurve_bin_data[bin_cursor + 3];
                        v2[1] = fcurve_bin_data[bin_cursor + 4];
                    }
                }
                // left handle next
                if (interp !== KF_INTERP_BEZIER) {
                    v3[0] = 0;
                    v3[1] = 0;
                } else {
                    v3[0] = fcurve_bin_data[bin_cursor + offset_to_next_kf + 3];
                    v3[1] = fcurve_bin_data[bin_cursor + offset_to_next_kf + 4];
                }
                // control point next
                v4[0] = fcurve_bin_data[bin_cursor + offset_to_next_kf + 1];
                v4[1] = fcurve_bin_data[bin_cursor + offset_to_next_kf + 2];

                // make interpolation for decimal values
                for (var j = substep_from; j < cfg_ani.frame_steps; j++) {
                    var interp_val = i + j / cfg_ani.frame_steps;
                    switch (interp) {
                    case KF_INTERP_BEZIER:
                        correct_bezpart(v1, v2, v3, v4);
                        if (is_blended)
                            bflags[out_cursor] = 1;
                        points[out_cursor] = bezier(interp_val, v1, v2, v3, v4);
                        out_cursor++;
                        break;
                    case KF_INTERP_LINEAR:
                        var linear_params = calc_linear_params(v1, v4);
                        if (is_blended)
                            bflags[out_cursor] = 1;
                        points[out_cursor] = linear(interp_val, linear_params);
                        out_cursor++;
                        break;
                    case KF_INTERP_CONSTANT:
                        if (is_blended)
                            bflags[out_cursor] = 1;
                        points[out_cursor] = fcurve_bin_data[bin_cursor + 2];
                        out_cursor++;
                        break;
                    default:
                        m_util.panic("Unknown keyframe intepolation mode: " + interp);
                    }
                }
            }

            // reaching new keyframe point on next iteration
            if (i + 1 == fcurve_bin_data[bin_cursor + offset_to_next_kf + 1]) {
                interp_prev = interp;
                bin_cursor += offset_to_next_kf;
            }
        }
    }
}

function calc_linear_params(v1, v4) {
    var x1 = v1[0], y1 = v1[1],
        x2 = v4[0], y2 = v4[1];
    var k = (y2 - y1) / (x2 - x1);
    var b = y1 - k * x1;
    return {k: k, b: b};
}

function linear(x, linear_params) {
    return linear_params.k * x + linear_params.b;
}


/**
 * The total length of the handles is not allowed to be more
 * than the horizontal distance between (v1-v4).
 * (prevent curve loops)
 */
function correct_bezpart(v1, v2, v3, v4) {

    var h1 = [];
    var h2 = [];
    var len1, len2, len, fac;

	// calc handle deltas
	h1[0] = v1[0] - v2[0];
	h1[1] = v1[1] - v2[1];

	h2[0] = v4[0] - v3[0];
	h2[1] = v4[1] - v3[1];

	// calculate distances:
	// len- span of time between keyframes
	// len1	- length of handle of start key
	// len2	- length of handle of end key
	len = v4[0]- v1[0];
	len1 = Math.abs(h1[0]);
	len2 = Math.abs(h2[0]);

	// if the handles have no length, no need to do any corrections
	if ((len1 + len2) == 0)
		return;

	// the two handles cross over each other, so force them
	// apart using the proportion they overlap
	if (len1 + len2 > len) {
		fac = len / (len1 + len2);

		v2[0] = v1[0] - fac * h1[0];
		v2[1] = v1[1] - fac * h1[1];

		v3[0] = v4[0] - fac * h2[0];
		v3[1] = v4[1] - fac * h2[1];
	}
}

function bezier(x, v1, v2, v3, v4) {

    // first find parameter t corresponding to x
    var t = bezier_find_root(0, 1, x, v1[0], v2[0], v3[0], v4[0]);

    // then calc y from t
    var y = bezier_parametric(t, v1[1], v2[1], v3[1], v4[1]);

    return y;
}

function bezier_find_root(t0_so_far, t1_so_far, x_needed, x0, x1, x2, x3) {

    // split the interval
    var t = t0_so_far + (t1_so_far - t0_so_far) / 2;

    var x = bezier_parametric(t, x0, x1, x2, x3);

    var dx = x - x_needed;

    var precision = 0.02;

    if (Math.abs(dx) < precision)
        return t;

    if (dx > 0)
        return bezier_find_root(t0_so_far, t, x_needed, x0, x1, x2, x3);
    else
        return bezier_find_root(t, t1_so_far, x_needed, x0, x1, x2, x3);
}

function bezier_parametric(t, p0, p1, p2, p3) {
    var t1 = 1 - t;

    return p0 * t1 * t1 * t1 +
       3 * p1 * t1 * t1 * t +
       3 * p2 * t1 * t  * t +
           p3 * t  * t  * t;
}

/**
 * Return first animated object
 */
exports.first_animated = function(objs) {
    for (var i = 0; i < objs.length; i++)
        if (objs[i]._anim)
            return objs[i];
    return false;
}

/**
 * Get bone translation.
 */
function get_anim_translation(anim_slot, index, frame_info, dest) {
    if (!dest)
        var dest = new Float32Array(4);

    var frame = frame_info[0];
    var frame_next = frame_info[1];
    var frame_factor = frame_info[2];

    var trans = anim_slot.trans;

    var x = trans[frame][4*index];
    var y = trans[frame][4*index+1];
    var z = trans[frame][4*index+2];

    var xn = trans[frame_next][4*index];
    var yn = trans[frame_next][4*index+1];
    var zn = trans[frame_next][4*index+2];

    dest[0] = (1-frame_factor) * x + frame_factor * xn;
    dest[1] = (1-frame_factor) * y + frame_factor * yn;
    dest[2] = (1-frame_factor) * z + frame_factor * zn;

    return dest;
}

/**
 * Get bone rotation quaternion.
 */
function get_anim_rotation(anim_slot, index, frame_info, dest) {
    if (!dest)
        var dest = new Float32Array(4);

    var frame = frame_info[0];
    var frame_next = frame_info[1];
    var frame_factor = frame_info[2];

    var quats = anim_slot.quats;

    m_quat.slerp(quats[frame].subarray(4*index, 4*index+4),
            quats[frame_next].subarray(4*index, 4*index+4), frame_factor, dest);

    //var x = quats[frame][4*index];
    //var y = quats[frame][4*index+1];
    //var z = quats[frame][4*index+2];
    //var w = quats[frame][4*index+3];

    //var xn = quats[frame_next][4*index];
    //var yn = quats[frame_next][4*index+1];
    //var zn = quats[frame_next][4*index+2];
    //var wn = quats[frame_next][4*index+3];

    //dest[0] = (1-frame_factor) * x + frame_factor * xn;
    //dest[1] = (1-frame_factor) * y + frame_factor * yn;
    //dest[2] = (1-frame_factor) * z + frame_factor * zn;
    //dest[3] = (1-frame_factor) * w + frame_factor * wn;

    return dest;
}

function get_anim_scale(anim_slot, index, frame_info) {
    var frame = frame_info[0];
    var frame_next = frame_info[1];
    var frame_factor = frame_info[2];

    var trans = anim_slot.trans;

    var s = trans[frame][4*index+3];
    var sn = trans[frame_next][4*index+3];

    var scale = (1-frame_factor) * s + frame_factor * sn;
    return scale;
}

function do_before_apply(obj, slot_num) {
    init_anim(obj, slot_num);
    update_anim_cache(obj);
}

function do_after_apply(obj, slot_num) {
    // to update e.g bounding boxes
    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
    update_object_animation(obj, 0, slot_num, true);
}

exports.apply = apply;
function apply(obj, name, slot_num) {

    slot_num = slot_num || SLOT_0;

    if (m_util.is_mesh(obj)) {
        var vertex_anim = m_util.keysearch("name", name,
                obj["data"]["b4w_vertex_anim"]);
        if (vertex_anim) {
            do_before_apply(obj, slot_num);
            apply_vertex_anim(obj, vertex_anim, slot_num);
            do_after_apply(obj, slot_num);
            return true;
        }

        var psys = m_util.keysearch("name", name, obj["particle_systems"]);
        if (psys) {
            var psettings = psys["settings"];
            if (psettings["type"] == "EMITTER") {
                do_before_apply(obj, slot_num);
                apply_particles_anim(obj, psys, slot_num);
                do_after_apply(obj, slot_num);
                return true;
            }
        }
    }
    var action = m_util.keysearch("name", name, _actions) ||
            m_util.keysearch("name", name + "_B4W_BAKED", _actions);
    if (action) {
        do_before_apply(obj, slot_num);
        if (apply_action(obj, action, slot_num)) {
            do_after_apply(obj, slot_num);
            return true;
        } else
            obj._anim_slots[slot_num] = null;
    }

    m_print.error("Unsupported object: \"" + obj.name +
                  "\" or animation name: \"" + name + "\"");
    return false;
}

exports.apply_by_uuid = function(obj, uuid, slot_num) {
    slot_num = slot_num || SLOT_0;
    var action = m_util.keysearch("uuid", uuid, _actions);
    if (action) {
        do_before_apply(obj, slot_num);
        if (apply_action(obj, action, slot_num)) {
            do_after_apply(obj, slot_num);
            return true;
        } else
            obj._anim_slots[slot_num] = null;
    }

    m_print.error("Unsupported object: \"" + obj.name +
                  "\" or animation uuid: \"" + uuid + "\"");
    return false;
}

exports.validate_action_by_name = function(obj, name) {
    var action = m_util.keysearch("name", name, _actions) ||
            m_util.keysearch("name", name + "_B4W_BAKED", _actions);

    if (!action) {
        var psys = m_util.keysearch("name", name, obj["particle_systems"]);
        if (psys)
            return true;
        return false
    }

    if (!m_util.get_dict_length(action["fcurves"]))
        return false;

    return true;
}


exports.get_slot_num_by_anim = get_slot_num_by_anim
function get_slot_num_by_anim(obj, anim_name) {
    var anim_slots = obj._anim_slots;
    for (var i = 0; i < anim_slots.length; i++) {
        var anim_slot = anim_slots[i];
        if (anim_slot && strip_baked_suffix(anim_slot.animation_name) ==
                         strip_baked_suffix(anim_name))
            return i;
    }
    return -1;
}

exports.get_anim_by_slot_num = function(obj, slot_num) {
    var anim_slot = obj._anim_slots[slot_num];
    if (anim_slot && anim_slot.animation_name)
        return strip_baked_suffix(anim_slot.animation_name);

    return null;
}

exports.remove = function(obj) {
    obj._anim_slots.length = 0;
    var ind = _anim_objs_cache.indexOf(obj);
    if (ind != -1)
        _anim_objs_cache.splice(ind, 1);
}

exports.remove_actions = function(data_id) {
    for (var i = _actions.length - 1; i >= 0; i--)
        if (_actions[i]._data_id == data_id)
            _actions.splice(i, 1);
}

exports.apply_to_first_empty_slot = function(obj, name) {
    if (!obj._anim_slots.length) {
        if (apply(obj, name, SLOT_0))
            return SLOT_0;
        else
            return -1;
    }
    for (var i = 0; i < obj._anim_slots.length; i++) {
        if (!obj._anim_slots[i]) {
            if (apply(obj, name, i))
                return i;
            else
                return -1;
        }
    }
}

exports.set_skel_mix_factor = function(obj, factor, time) {
    var cur_mix_factor = obj._render.anim_mix_factor;
    var speed = (factor - cur_mix_factor) / time;

    obj._render.anim_mix_factor_change_speed = speed;
    obj._render.anim_destination_mix_factor = factor;
}

exports.set_speed = function(obj, speed, slot_num) {
    function set_speed(anim_slot) {
        anim_slot.speed = speed;
    }
    process_anim_slots(obj._anim_slots, slot_num, set_speed);
}

exports.get_speed = function(obj, slot_num) {
    return obj._anim_slots[slot_num].speed;
}

exports.get_anim_start_frame = function(obj, slot_num) {
    var anim_slot = obj._anim_slots[slot_num];
    return anim_slot.start;
}

exports.get_anim_length = function(obj, slot_num) {
    var anim_slot = obj._anim_slots[slot_num];
    return anim_slot.length;
}

exports.has_animated_nodemats = has_animated_nodemats;
function has_animated_nodemats(obj) {
    if (obj["type"] != "MESH" || !obj["data"])
        return false;

    var materials = obj["data"]["materials"];
    if (!materials)
        return false;

    for (var j = 0; j < materials.length; j++) {
        var mat = materials[j];
        var node_tree = mat["node_tree"];
        if (mat["use_nodes"] && node_tree) {
            if (check_node_tree_anim_data_r(node_tree))
                return true;
        }
    }

    return false;
}

function check_node_tree_anim_data_r(node_tree) {
    if (node_tree["animation_data"])
        return true;

    var nodes = node_tree["nodes"];
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (node["node_group"]) {
            var g_node_tree = node["node_group"]["node_tree"];
            if (g_node_tree && check_node_tree_anim_data_r(g_node_tree))
                return true;
        }
    }

    return false;
}

exports.cleanup = function() {
    _anim_objs_cache.length = 0;
    _actions.length = 0;
}

/**
 * uses _vec3_tmp, _quat4_tmp
 */
exports.fcurve_replace_euler_by_quat = function(fcurve) {
    var ch = fcurve[0] || fcurve[1] || fcurve[2];
    var pcount = ch._pierced_points.length;

    var quat = _quat4_tmp;
    var euler_angles = _vec3_tmp;

    var is_x_rot = Boolean(fcurve[0]);
    if (!is_x_rot)
        fcurve[0] = { _pierced_points: new Float32Array(pcount),
                        "num_channels": 8};
    var is_y_rot = Boolean(fcurve[1]);
    if (!is_y_rot)
        fcurve[1] = { _pierced_points: new Float32Array(pcount),
                        "num_channels": 8};
    var is_z_rot = Boolean(fcurve[2]);
    if (!is_z_rot)
        fcurve[2] = { _pierced_points: new Float32Array(pcount),
                        "num_channels": 8};
    fcurve[3] = { _pierced_points: new Float32Array(pcount),
                    "num_channels": 8};

    for (var i = 0; i < pcount; i++) {
        euler_angles[0] = (is_x_rot) ? fcurve[0]._pierced_points[i]: 0;
        euler_angles[1] = (is_y_rot) ? fcurve[1]._pierced_points[i]: 0;
        euler_angles[2] = (is_z_rot) ? fcurve[2]._pierced_points[i]: 0;
        m_util.euler_to_quat(euler_angles, quat);

        // (x, y, z, w) to (w, x, y, z) fcurve format
        fcurve[0]._pierced_points[i] = quat[3];
        fcurve[1]._pierced_points[i] = quat[0];
        fcurve[2]._pierced_points[i] = quat[1];
        fcurve[3]._pierced_points[i] = quat[2];
    }
}

}
