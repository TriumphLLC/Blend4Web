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

var m_mat4 = require("mat4");
var m_quat = require("quat");

var cfg_ani = m_config.animation;

var OBJ_ANIM_TYPE_ARMATURE   = 10;
var OBJ_ANIM_TYPE_SKELETAL   = 20;
var OBJ_ANIM_TYPE_OBJECT     = 30;
var OBJ_ANIM_TYPE_VERTEX     = 40;
var OBJ_ANIM_TYPE_SOUND      = 50;
var OBJ_ANIM_TYPE_STATIC     = 60;

exports.OBJ_ANIM_TYPE_ARMATURE = OBJ_ANIM_TYPE_ARMATURE;
exports.OBJ_ANIM_TYPE_SKELETAL = OBJ_ANIM_TYPE_SKELETAL;
exports.OBJ_ANIM_TYPE_OBJECT   = OBJ_ANIM_TYPE_OBJECT;
exports.OBJ_ANIM_TYPE_VERTEX   = OBJ_ANIM_TYPE_VERTEX;
exports.OBJ_ANIM_TYPE_SOUND    = OBJ_ANIM_TYPE_SOUND;
exports.OBJ_ANIM_TYPE_STATIC   = OBJ_ANIM_TYPE_STATIC;

// values specified in exporter
var KF_INTERP_BEZIER = 0;
var KF_INTERP_LINEAR = 1;
var KF_INTERP_CONSTANT = 2;

// animation behavior
var AB_CYCLIC = 10;
var AB_FINISH_RESET = 20;
var AB_FINISH_STOP = 30;

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

exports.frame_to_sec = function(frame) {
    return frame/cfg_ani.framerate;
}

/**
 * Called every frame
 */
exports.update = function(elapsed) {
    for (var i = 0; i < _anim_objs_cache.length; i++) {
        var obj = _anim_objs_cache[i];
        animate(obj, elapsed);
    }
}

exports.get_all_actions = function() {
    return _actions;
}

function apply_vertex_anim(obj, va) {

    obj._anim.type = OBJ_ANIM_TYPE_VERTEX;

    var start = va["frame_start"];
    // last frame will be rendered
    var length = va["frame_end"] - start + 1;
    obj._anim.start = start;
    obj._anim.current_frame_float = start;
    obj._anim.length = length;

    obj._anim.va_name = va["name"];

    // calculate VBO offset for given vertex animation
    var va_frame_offset = 0; 
    for (var i = 0; i < obj["data"]["b4w_vertex_anim"].length; i++) {
        var va_i = obj["data"]["b4w_vertex_anim"][i];

        if (va_i == va)
            break;
        else
            va_frame_offset += (va_i["frame_end"] - va_i["frame_start"] + 1);
    }

    obj._anim.va_frame_offset = va_frame_offset;
}

function init_anim(obj) {

    obj._anim = {};
    obj._anim.play = false;
    obj._anim.behavior = AB_FINISH_RESET;

    // cff = 0-length
    obj._anim.current_frame_float = 0;
    obj._anim.start = 0;
    obj._anim.length = 0;

    obj._anim.trans_smooth_period = 0;
    obj._anim.quat_smooth_period = 0;

    obj._action_anim_cache = obj._action_anim_cache || [];
}

function update_anim_cache(obj) {
    if (_anim_objs_cache.indexOf(obj) == -1)
        _anim_objs_cache.push(obj);
}

exports.get_current_action_name = function(obj) {
    if (obj._anim) 
        return strip_baked_suffix(obj._anim.action_name);
    else 
        return null;
}

exports.get_anim_names = function(obj) {
    var anim_names = [];

    if (has_vertex_anim(obj)) {
        for (var i = 0; i < obj["data"]["b4w_vertex_anim"].length; i++)
            anim_names.push(obj["data"]["b4w_vertex_anim"][i]["name"]);
    } else {
        // TODO: return object-specific actions
        for (var i = 0; i < _actions.length; i++)
            anim_names.push(strip_baked_suffix(_actions[i]["name"]));
    }

    return anim_names;
}

exports.strip_baked_suffix = strip_baked_suffix;
function strip_baked_suffix(name) {
    return name.replace(/_B4W_BAKED$/, "");
}


exports.get_current_va_name = function(obj) {
    if (obj._anim)
        return obj._anim.va_name;
    else
        return null;
}

exports.get_anim_type = function(obj) {
    return obj._anim.type;
}

exports.apply_def = apply_def;
/**
 * Search for possible object animations init and apply found one.
 */
function apply_def(obj) {

    var action = get_default_action(obj);

    if (action) {
        do_before_apply(obj);
        apply_action(obj, action);
        do_after_apply(obj);
    } else if (has_vertex_anim(obj)) {
        do_before_apply(obj);
        apply_vertex_anim(obj, obj["data"]["b4w_vertex_anim"][0]);
        do_after_apply(obj);
    } else {
        do_before_apply(obj);
        obj._anim.type = OBJ_ANIM_TYPE_STATIC;
        // TODO: proper obj -> scene -> timeline
        
        var frame_range = m_scs.get_scene_timeline(m_scs.get_active());
        obj._anim.start = frame_range[0];
        obj._anim.current_frame_float = frame_range[0];
        // last frame will be rendered
        obj._anim.length = frame_range[1] - frame_range[0] + 1;
        do_after_apply(obj);
    }
}

/** 
 * Try to get action from the following places:
 *  obj.modifiers -> armature obj 
 *  obj.animation_data.action
 *  spkobj.data.animation_data
 * @param {Object} obj Object ID
 * @returns Default action or null
 */
function get_default_action(obj) {

    // armature from obj.modifieres
    var armobj = get_first_armature_object(obj);
    if (armobj) {
        var anim_data = armobj["animation_data"];
        if (anim_data && anim_data["action"])
            return anim_data["action"];
    }

    // animation_data
    var anim_data = obj["animation_data"];
    if (anim_data && anim_data["action"])
        return anim_data["action"];

    if (m_sfx.is_speaker(obj) && obj["data"]["animation_data"] &&
            obj["data"]["animation_data"]["action"])
        return obj["data"]["animation_data"]["action"];

    // not found
    return null;
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


exports.play = play;
/**
 * Start to play preset animation 
 * offset in seconds
 */
function play(obj, finish_callback, offset) {
    if (obj._anim) {

        if (obj._anim.play)
            stop(obj);

        if (offset)
            obj._anim.current_frame_float += cfg_ani.framerate * offset;

        obj._anim.play = true;

        if (finish_callback)
            obj._anim.finish_callback = finish_callback;
        else
            obj._anim.finish_callback = null;
    }
}

exports.stop = stop;
/**
 * Stop object animation 
 */
function stop(obj) {
    if (obj._anim) {
        obj._anim.play = false;
        delete obj._anim.finish_callback;
    }
}

exports.is_play = function(obj) {
    if (obj._anim) 
        return obj._anim.play;
}

exports.set_current_frame_float = function(obj, cff) {
    if (obj._anim)
        obj._anim.current_frame_float = cff;
}

exports.get_current_frame_float = function(obj) {
    if (obj._anim && obj._anim.current_frame_float)
        return obj._anim.current_frame_float;
    else
        return 0.0;
}

exports.cyclic = cyclic;
/**
 * Set cyclic flag for object animation
 * @methodOf animation
 */
function cyclic(obj, cyclic) {
    if (obj._anim) 
        obj._anim.behavior = cyclic ? AB_CYCLIC : AB_FINISH_RESET;
}


exports.is_cyclic = function(obj) {
    if (obj._anim) 
        return (obj._anim.behavior == AB_CYCLIC) ? true : false;
}

exports.set_behavior = function(obj, behavior) {
    if (obj._anim) 
        obj._anim.behavior = behavior;
}

exports.get_behavior = function(obj) {
    if (obj._anim) 
        return obj._anim.behavior;
}

exports.apply_smoothing = function(obj, trans_period, quat_period) {
    if (obj._anim) {
        obj._anim.trans_smooth_period = trans_period || 0;
        obj._anim.quat_smooth_period = quat_period || 0;
    }
}

/**
 * Update object animation (set object pose)
 */
exports.update_object_animation = function(obj, elapsed) {
    if (!elapsed)
        var elapsed = 0;
    animate(obj, elapsed);
}

/**
 * <p>Check if animation possible
 * <p>animation is possible, if one of the following conditions is met:
 * <ol>
 * <li>obj is an armature
 * <li>obj has a link to an armature 
 * <li>obj has an animation_data.action
 * <li>obj has NLA
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

    return false;
}

exports.is_animated = function(obj) {
    if (obj._anim)
        return true;
    else
        return false;
}

/**
 * Calculate object animation data:
 * quats, trans for each bone (group) index and pierced point
 * save them to obj._anim
 */
function apply_action(obj, action) {

    if (!m_util.get_dict_length(action["fcurves"]))
        throw new Error("No fcurves in action \"" + action["name"] + "\"");

    var frame_range = action["frame_range"];

    var act_render = action._render;

    obj._anim.action_name = action["name"];
    obj._anim.action_frame_range = frame_range;
    obj._anim.action_step = act_render.pierce_step;
    obj._anim.action_bflags = act_render.bflags; 

    obj._anim.start = frame_range[0];
    obj._anim.current_frame_float = frame_range[0];
    obj._anim.length = frame_range[1] - frame_range[0];

    // TODO: clarify length/frame_range/num_pierced
    var num_pierced = act_render.num_pierced;

    var armobj = get_first_armature_object(obj);

    // armature itself
    if (m_util.is_armature(obj)) {
        obj._anim.type = OBJ_ANIM_TYPE_ARMATURE;

        var pose_data_frames = get_cached_pose_data(obj, action);
        if (!pose_data_frames) {
            var bone_pointers = calc_armature_bone_pointers(obj);
            var pose_data_frames = calc_pose_data_frames(obj, action, bone_pointers);
            cache_pose_data(obj, action, pose_data_frames);
        }

        obj._anim.trans = pose_data_frames.trans;
        obj._anim.quats = pose_data_frames.quats;

    // skeletal mesh animation
    } else if (armobj) {
        obj._anim.type = OBJ_ANIM_TYPE_SKELETAL;

        var pose_data_frames = get_cached_pose_data(obj, action);
        if (!pose_data_frames) {
            var bone_pointers = obj._render.bone_pointers;
            // calc anim data by posing armature object in every pierced point
            var pose_data_frames = calc_pose_data_frames(armobj, action, bone_pointers);
            cache_pose_data(obj, action, pose_data_frames);
        }

        obj._anim.trans = pose_data_frames.trans;
        obj._anim.quats = pose_data_frames.quats;
    } else if (m_sfx.is_speaker(obj) && (act_render.params["volume"] ||
            act_render.params["pitch"])) {

        obj._anim.volume = act_render.params["volume"] || null;
        obj._anim.pitch = act_render.params["pitch"] || null;
        obj._anim.type = OBJ_ANIM_TYPE_SOUND;
    } else {
        var tsr = act_render.params["tsr"];
        if (tsr) {
            obj._anim.trans = [];
            obj._anim.quats = [];

            for (var i = 0; i < num_pierced; i++) {
                obj._anim.trans.push(tsr.subarray(i*8, i*8 + 4));
                obj._anim.quats.push(tsr.subarray(i*8 + 4, i*8 + 8));
            }
            obj._anim.type = OBJ_ANIM_TYPE_OBJECT;
        } else {
            m_print.warn("B4W Warning: Incompatible action \"" + 
                action["name"] + "\" has been applied to object \"" + 
                obj["name"] + "\"");
            obj._anim.type = OBJ_ANIM_TYPE_STATIC;
        }
    }
}

function get_cached_pose_data(obj, action) {

    var cache = obj._action_anim_cache;

    for (var i = 0; i < cache.length; i+=2)
        if (action == cache[i])
            return cache[i+1];

    return null;
}

function cache_pose_data(obj, action, pose_data) {
    var cache = obj._action_anim_cache;
    cache.push(action, pose_data);
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

function animate(obj, elapsed) {

    // not animatable
    if (!obj._anim) 
        return; 
    // update paused animation only if elapsed == 0
    if (!(obj._anim.play || elapsed == 0))
        return

    var render = obj._render;
    
    var cff = obj._anim.current_frame_float;
    var start = obj._anim.start;
    var length = obj._anim.length;

    var finish_callback;

    cff += elapsed * cfg_ani.framerate;

    if (cff >= start + length) {

        finish_callback = obj._anim.finish_callback;

        switch(obj._anim.behavior) {
        case AB_CYCLIC:
            cff = ((cff-start) % length) + start;
            break;
        case AB_FINISH_RESET:
            cff = start;
            stop(obj);
            break;
        case AB_FINISH_STOP:
            cff = start + length - 0.000001;
            stop(obj);
            break;
        }
    }
    obj._anim.current_frame_float = cff;
    obj._render.time = (cff - start) / cfg_ani.framerate;

    var anim_type = obj._anim.type;

    switch (anim_type) {
    case OBJ_ANIM_TYPE_ARMATURE:
    case OBJ_ANIM_TYPE_SKELETAL:

        var finfo = action_anim_finfo(obj._anim, cff, _frame_info_tmp);

        var frame = finfo[0];
        var frame_next = finfo[1];
        var frame_factor = finfo[2];

        var trans = obj._anim.trans;
        var quats = obj._anim.quats;

        render.quats_before = quats[frame];
        render.quats_after  = quats[frame_next];
        render.trans_before = trans[frame];
        render.trans_after  = trans[frame_next];
        render.frame_factor = frame_factor;

        if (anim_type === OBJ_ANIM_TYPE_ARMATURE)
            m_trans.update_transform(obj);

        break;

    case OBJ_ANIM_TYPE_OBJECT:
        var finfo = action_anim_finfo(obj._anim, cff, _frame_info_tmp);

        var trans = get_anim_translation(obj, 0, finfo, _vec3_tmp);
        var quat = get_anim_rotation(obj, 0, finfo, _quat4_tmp);
        var scale = get_anim_scale(obj, 0, finfo);

        if (obj._anim.trans_smooth_period) {
            var trans_old = _vec3_tmp2;
            m_trans.get_translation(obj, trans_old);
            m_util.smooth_v(trans, trans_old, elapsed,
                    obj._anim.trans_smooth_period, trans);
        }

        if (obj._anim.quat_smooth_period) {
            var quat_old = _quat4_tmp2;
            m_trans.get_rotation(obj, quat_old);
            m_util.smooth_q(quat, quat_old, elapsed,
                    obj._anim.quat_smooth_period, quat);
        }

        m_trans.set_translation(obj, trans);
        m_trans.set_rotation(obj, quat);
        m_trans.set_scale(obj, scale);

        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
        break;

    case OBJ_ANIM_TYPE_VERTEX:
        vertex_anim_finfo(obj._anim, cff, _frame_info_tmp);
        var finfo = _frame_info_tmp;

        render.va_frame = finfo[0];
        render.va_frame_factor = finfo[2];
        break;

    case OBJ_ANIM_TYPE_SOUND:
        var finfo = action_anim_finfo(obj._anim, cff, _frame_info_tmp);
        var fc = finfo[0];
        var fn = finfo[1];
        var ff = finfo[2];

        if (obj._anim.volume) {
            var volume = (1-ff) * obj._anim.volume[fc] + ff * obj._anim.volume[fn];
            m_sfx.set_volume(obj, volume);
        }
        
        if (obj._anim.pitch) {
            var pitch = (1-ff) * obj._anim.pitch[fc] + ff * obj._anim.pitch[fn];
            m_sfx.playrate(obj, pitch);
        }
        break;
    case OBJ_ANIM_TYPE_STATIC:
        // do nothing
        break;

    default:
        throw("Unknown animation type:" + anim_type);
        break;
    }
    
    if (finish_callback)
        finish_callback(obj);
    
}

/**
 * Calculate integer frame, frame_next and float frame_factor
 */
function action_anim_finfo(obj_anim, cff, dest) {
    if (!dest)
        var dest = new Array(3);

    var action_start = obj_anim.action_frame_range[0];
    var action_end = obj_anim.action_frame_range[1];

    var range = action_end - action_start;
    
    // index in fcurve' pierced points array
    var index_float = cff - action_start;

    if (index_float < 0)
        index_float = 0;
    if (index_float >= range) 
        index_float = range;

    var step = obj_anim.action_step;
    index_float /= step;

    var frame = Math.floor(index_float);
    var frame_next = frame + 1;

    var frame_factor;

    // NOTE: get from first group
    if (obj_anim.action_bflags[frame])
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
function vertex_anim_finfo(obj_anim, cff, dest) {
    if (!dest)
        var dest = new Array(3);

    // index in VBO array, starting from 0
    var index_float = cff - obj_anim.start;

    if (index_float < 0)
        index_float = 0;
    if (index_float >= obj_anim.length) 
        index_float = obj_anim.length;

    var frame = Math.floor(index_float);
    var frame_next = frame + 1;
    var frame_factor = index_float - frame;

    // handle last frame for non-cyclic animation
    // for cyclic animation we have last frame equal to first one 
    // see extract_submesh()
    if (obj_anim.behavior != AB_CYCLIC && frame_next == obj_anim.length) {
        frame = frame-1;
        frame_next = frame;
        frame_factor = 1.0; 
    }

    // take into account previous vertex anims
    var va_frame_offset = obj_anim.va_frame_offset;

    dest[0] = frame + va_frame_offset;
    dest[1] = frame_next + va_frame_offset;
    dest[2] = frame_factor;

    return dest;
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
            throw "Wrong storage default value";

        return storage;
    }

    var BONE_EXP = new RegExp(/pose.bones\[\".+\"\]/g);
    var TSR8_DEF = m_tsr.create();

    var get_storage = function(params, bones, data_path, pierced_points) {
        if (data_path.search(BONE_EXP) > -1) {
            var storage_obj = bones;
            var name = data_path.split("\"")[1];
            var def_val = TSR8_DEF;
        } else {
            var storage_obj = params;

            if (data_path.indexOf("location") > -1) {
                var name = "tsr";
                var def_val = TSR8_DEF;
            } else if (data_path.indexOf("rotation_quaternion") > -1) {
                var name = "tsr";
                var def_val = TSR8_DEF;
            } else if (data_path.indexOf("scale") > -1) {
                var name = "tsr";
                var def_val = TSR8_DEF;
            } else {
                var name = data_path;
                var def_val = 0.0;
            }
        }

        if (!storage_obj[name])
            storage_obj[name] = init_storage(pierced_points, def_val);
        
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
            var channel_offset = 0;
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

            if (!num_pierced)
                num_pierced = pp.length;

            var storage = get_storage(params, bones, data_path, num_pierced);
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
    
    _actions.push(action);
}

/**
 * @deprecated Unused
 */
function get_transform_from_group(channels, pierced_index, action_name) {

    var tran = [0, 0, 0];
    var quat = [1, 0, 0, 0];
    var scal = [1, 1, 1];

    var storage;

    var bflag = 0;
    
    // for every fcurve of the group
    for (var i = 0; i < channels.length; i++) {
        var fcurve = channels[i];

        var data_path = fcurve[0];
        var array_index = fcurve[1];
        var pp = fcurve._pierced_points;

        // if some channel is blended all transform will be blended
        var pp_bflag = pp[2*pierced_index];
        if (pp_bflag)
            bflag = 1;

        var pp_value = pp[2*pierced_index + 1];

        if (data_path.indexOf("location") > -1)
            storage = tran;
        else if (data_path.indexOf("rotation_quaternion") > -1) 
            storage = quat;
        else if (data_path.indexOf("scale") > -1)
            storage = scal;
        else {
            m_print.error("B4W warning: unsupported fcurve data path: " + data_path + 
                " (Action: " + action_name + ")");
            break;
        }

        storage[array_index] = pp_value;
    }

    // uniform scale supported
    scal = (scal[0] + scal[1] + scal[2]) / 3; 

    // pack scale to translation
    tran = [tran[0], tran[1], tran[2], scal];
    
    // convert quaternion: (w, x, y, z) -> (x, y, z, w) to use in shader
    quat = [quat[1], quat[2], quat[3], quat[0]];
    m_quat.normalize(quat, quat);

    return {tran: tran, quat: quat, bflag: bflag};
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
                        throw "Unknown keyframe intepolation mode: " + interp;
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
function get_anim_translation(obj, index, frame_info, dest) {
    if (!dest)
        var dest = new Float32Array(4);

    var frame = frame_info[0];
    var frame_next = frame_info[1];
    var frame_factor = frame_info[2];

    var trans = obj._anim.trans;

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
function get_anim_rotation(obj, index, frame_info, dest) {
    if (!dest)
        var dest = new Float32Array(4);

    var frame = frame_info[0];
    var frame_next = frame_info[1];
    var frame_factor = frame_info[2];

    var quats = obj._anim.quats;

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

function get_anim_scale(obj, index, frame_info) {
    var frame = frame_info[0];
    var frame_next = frame_info[1];
    var frame_factor = frame_info[2];

    var trans = obj._anim.trans;

    var s = trans[frame][4*index+3];
    var sn = trans[frame_next][4*index+3];

    var scale = (1-frame_factor) * s + frame_factor * sn;
    return scale;
}

function do_before_apply(obj) {
    init_anim(obj);
    update_anim_cache(obj);
}

function do_after_apply(obj) {
    // to update e.g bounding boxes
    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);

    // NOTE: not an animation
    if (m_particles.has_particles(obj))
        m_particles.update_emitter_animation(obj);
}

exports.apply = function(obj, name) {
    if (m_util.is_mesh(obj)) {
        var vertex_anim = m_util.keysearch("name", name,
                obj["data"]["b4w_vertex_anim"]);
        if (vertex_anim) {
            do_before_apply(obj);
            apply_vertex_anim(obj, vertex_anim);
            do_after_apply(obj);
            return;
        }
    }

    var action = m_util.keysearch("name", name, _actions) ||
            m_util.keysearch("name", name + "_B4W_BAKED", _actions);
    if (action) {
        do_before_apply(obj);
        apply_action(obj, action);
        do_after_apply(obj);
        return;
    }

    m_print.error("Unsupported object or animation name: ", name);
}

exports.remove = function(obj) {
    obj._anim = null;
    var ind = _anim_objs_cache.indexOf(obj);
    if (ind)
        _anim_objs_cache.splice(ind, 1);
    else
        m_print.error("Object ", obj.name, " doesn't have animation");
}

exports.cleanup = function() {
    _anim_objs_cache.length = 0;
    _actions.length = 0;
}


}
