"use strict";

/**
 * Animation API.
 * @module animation
 */
b4w.module["animation"] = function(exports, require) {

var m_anim = require("__animation");
var m_cons = require("__constraints");
var m_phy  = require("__physics");
var m_util = require("__util");

/**
 * Animation behavior: cyclic.
 * @const module:animation.AB_CYCLIC
 */
exports["AB_CYCLIC"] = m_anim.AB_CYCLIC;
/**
 * Animation behavior: go back to frame zero after finishing.
 * @const module:animation.AB_FINISH_RESET
 */
exports["AB_FINISH_RESET"] = m_anim.AB_FINISH_RESET;
/**
 * Animation behavior: stop animation after finishing.
 * @const module:animation.AB_FINISH_STOP
 */
exports["AB_FINISH_STOP"] = m_anim.AB_FINISH_STOP;

var _vec4_tmp = new Float32Array(4);

/**
 * Check if object is currently animated
 * @method module:animation.is_animated
 * @param obj Object ID
 */
exports["is_animated"] = function(obj) {
    return m_anim.is_animated(obj);
}

/**
 * Return all available action names
 * @method module:animation.get_actions
 * @returns {Array} Action names.
 * @deprecated Use get_anim_names()
 */
exports["get_actions"] = function() {
    var anames = [];
    var actions = m_anim.get_all_actions();
    for (var i = 0; i < actions.length; i++)
        anames.push(actions[i]["name"]);

    return anames;
}

/**
 * Return applied action name
 * @method module:animation.get_current_action
 * @param obj Object ID
 * @deprecated Use get_current_anim_name()
 */
exports["get_current_action"] = function(obj) {
    return m_anim.get_current_action(obj);
}

/**
 * Return all available animation names.
 * @method module:animation.get_anim_names
 * @param obj Object ID
 * @returns {Array} Array of animation names
 */
exports["get_anim_names"] = function(obj) {
    if (!m_anim.is_animatable(obj))
        return [];

    return m_anim.get_anim_names(obj);
}

/**
 * Return applied animation name.
 * @method module:animation.get_current_anim_name
 * @param obj Object ID
 * @returns Current animation name or null
 */
exports["get_current_anim_name"] = function(obj) {
    if (!m_anim.is_animated(obj))
        return null;

    switch (m_anim.get_anim_type(obj)) {
    case m_anim.OBJ_ANIM_TYPE_ARMATURE:
    case m_anim.OBJ_ANIM_TYPE_SKELETAL:
    case m_anim.OBJ_ANIM_TYPE_OBJECT:
    case m_anim.OBJ_ANIM_TYPE_SOUND:
        return m_anim.get_current_action(obj);
    case m_anim.OBJ_ANIM_TYPE_VERTEX:
        return m_anim.get_current_va_name(obj);
    case m_anim.OBJ_ANIM_TYPE_STATIC:
    default:
        return null;
    }
}

/**
 * Apply animation to object
 * @method module:animation.apply
 * @param obj Object ID
 * @param {String} name Action name
 */
exports["apply"] = function(obj, name) {
    m_anim.apply(obj, name);
}

/**
 * Remove animation from object
 * @method module:animation.remove
 * @param obj Object ID
 */
exports["remove"] = function(obj) {
    m_anim.remove(obj);
}

/**
 * Apply default (specified in Blender) animation to object
 * @method module:animation.apply_def
 * @param obj Object ID
 */
exports["apply_def"] = function(obj) {
    m_anim.apply_def(obj);
}

/**
 * Play object animation.
 * @method module:animation.play
 * @param obj Object ID
 * @param [finish_callback] Callback to execute on finished animation
 * @param [offset=0] Offset in seconds
 */
exports["play"] = function(obj, finish_callback, offset) {
    m_anim.play(obj, finish_callback, offset);
    m_anim.update_object_animation(obj);
}
/**
 * Stop object animation
 * @method module:animation.stop
 * @param obj Object ID
 */
exports["stop"] = function(obj) {
    m_anim.stop(obj);
}
/**
 * Check if object animation is being run
 * @method module:animation.is_play
 * @param obj Object ID
 */
exports["is_play"] = function(obj) {
    return m_anim.is_play(obj);
}
/**
 * Set the current frame
 * @method module:animation.set_current_frame_float
 * @param obj Object ID
 * @param {Number} cff Current frame
 * @deprecated Replaced by set_frame
 */
exports["set_current_frame_float"] = function(obj, cff) {
    m_anim.set_current_frame_float(obj, cff);
}
/**
 * @method module:animation.get_current_frame_float
 * @param obj Object ID
 * @deprecated Replaced by get_frame()
 */
exports["get_current_frame_float"] = function(obj) {
    return m_anim.get_current_frame_float(obj);
}

/**
 * Set the current frame and update object animation.
 * @method module:animation.set_frame
 * @param obj Object ID.
 * @param {Number} frame Current frame (float).
 */
exports["set_frame"] = function(obj, frame) {
    m_anim.set_current_frame_float(obj, frame);
    m_anim.update_object_animation(obj, 0);
}
/**
 * Get the current frame.
 * @method module:animation.get_frame
 * @param obj Object ID
 * @returns {Number} Current frame
 */
exports["get_frame"] = function(obj) {
    return m_anim.get_current_frame_float(obj);
}

/**
 * Get animation frame range.
 * @method module:animation.get_frame_range
 * @param obj Object ID
 * @returns {Array} Frame range pair or null for incorrect object
 * @deprecated Use get_anim_start_frame() and get_anim_length() functions
 */
exports["get_frame_range"] = function(obj) {
    // GARBAGE
    if (obj._anim)
        return [obj._anim.start, obj._anim.start + obj._anim.length];
    else
        return null;
}

/**
 * Get animation starting frame
 * @method module:animation.get_anim_start_frame
 * @param obj Object ID
 * @returns {Number} Animation start frame or -1 for incorrect object
 */
exports["get_anim_start_frame"] = function(obj) {
    if (obj._anim)
        return obj._anim.start;
    else
        return -1;
}

/**
 * Get animation length in frames
 * @method module:animation.get_anim_length
 * @param obj Object ID
 * @returns {Number} Animation length or -1 for incorrect object
 */
exports["get_anim_length"] = function(obj) {
    if (obj._anim)
        return obj._anim.length;
    else
        return -1;
}

/**
 * Whether animation playback should be looped or not
 * @method module:animation.cyclic
 * @param obj Object ID
 * @param {Boolean} cyclic_flag
 * @deprecated Use set_behavior() instead.
 */
exports["cyclic"] = function(obj, cyclic_flag) {
    m_anim.cyclic(obj, cyclic_flag);
}
/**
 * Check if animation is cyclic
 * @method module:animation.is_cyclic
 * @param obj Object ID
 * @deprecated Use get_behavior() instead.
 */
exports["is_cyclic"] = function(obj) {
    return m_anim.is_cyclic(obj);
}

/**
 * Set animation behavior.
 * @method module:animation.set_behavior
 * @param obj Object ID
 * @param behavior Behavior enum
 */
exports["set_behavior"] = function(obj, behavior) {
    m_anim.set_behavior(obj, behavior);
}

/**
 * Get animation behavior.
 * @method module:animation.get_behavior
 * @param obj Object ID
 * @returns Behavior enum
 */
exports["get_behavior"] = function(obj) {
    return m_anim.get_behavior(obj);
}

/**
 * Apply smoothing. 
 * Specify zero periods in order to disable
 * @method module:animation.apply_smoothing
 * @param obj Object ID
 * @param {Number} [trans_period=0] Translation smoothing period
 * @param {Number} [quat_period=0] Rotation smoothing period
 */
exports["apply_smoothing"] = function(obj, trans_period, quat_period) {
    m_anim.apply_smoothing(obj, trans_period, quat_period);
}

/**
 * Update object animation (set the pose)
 * @method module:animation.update_object_animation
 * @param obj Object ID
 * @param {Number} elapsed Animation delay
 */
exports["update_object_animation"] = function(obj, elapsed) {
    m_anim.update_object_animation(obj, elapsed);
}

/**
 * Convert frames to seconds
 * @method module:animation.frame_to_sec
 * @param frame
 */
exports["frame_to_sec"] = function(frame) {
    return m_anim.frame_to_sec(frame);
}

/**
 * Switch the collision detection flag
 * @method module:animation.detect_collisions
 * @param obj Object ID
 * @param {Boolean} use Detect collisions
 * @deprecated Use physics.enable_simulation/physics.disable_simulation.
 */
exports["detect_collisions"] = function(obj, use) {
    if (use)
        m_phy.enable_simulation(obj);
    else
        m_phy.disable_simulation(obj);
}
/**
 * Get detect collisions flag
 * @method module:animation.is_detect_collisions_used
 * @param obj Object ID
 * @returns {Boolean} Detect collision usage flag
 * @deprecated Use physics.has_simulated_physics().
 */
exports["is_detect_collisions_used"] = function(obj) {
    return m_phy.has_simulated_physics(obj);
}

/**
 * Get bone translation for object with skeletal animation.
 * @method module:animation.get_bone_translation
 */
exports["get_bone_translation"] = function(armobj, bone_name, dest) {
    if (!m_util.is_armature(armobj))
        return null;

    if (!dest)
        var dest = new Float32Array(3);

    var trans_scale = _vec4_tmp;
    m_cons.get_bone_pose(armobj, bone_name, false, trans_scale, null);

    dest[0] = trans_scale[0];
    dest[1] = trans_scale[1];
    dest[2] = trans_scale[2];

    return dest;
}

/**
 * Get the first armature object used for mesh skinning.
 * @method module:animation.get_bone_translation
 * @param obj Object ID
 * @returns Armature object ID or null;
 */
exports["get_first_armature_object"] = function(obj) {
    if (m_util.is_mesh(obj))
        return m_anim.get_first_armature_object(obj);
    else
        return null;
}

exports["update_object_transform"] = function(obj) {
    throw("Deprecated method execution");
}
exports["set_translation"] = function(obj, x, y, z) {
    throw("Deprecated method execution");
}
exports["set_translation_v"] = function(obj, trans) {
    throw("Deprecated method execution");
}
exports["set_translation_rel"] = function(obj, x, y, z, obj_parent) {
    throw("Deprecated method execution");
}
exports["get_translation"] = function(obj, dest) {
    throw("Deprecated method execution");
}
exports["set_rotation_quat"] = function(obj, x, y, z, w) {
    throw("Deprecated method execution");
}
exports["set_rotation_quat_v"] = function(obj, quat) {
    throw("Deprecated method execution");
}
exports["get_rotation_quat"] = function(obj, dest) {
    throw("Deprecated method execution");
}
exports["set_rotation_euler"] = function(obj, x, y, z) {
    throw("Deprecated method execution");
}
exports["set_rotation_euler_v"] = function(obj, euler) {
    throw("Deprecated method execution");
}
exports["set_scale"] = function(obj, scale) {
    throw("Deprecated method execution");
}
exports["empty_reset_transform"] = function(obj) {
    throw("Deprecated method execution");
}

}
