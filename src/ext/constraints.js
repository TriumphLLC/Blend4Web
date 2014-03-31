"use strict";

/** 
 * Object constraints API.
 * @module constraints
 */
b4w.module["constraints"] = function(exports, require) {

var constraints = require("__constraints");

/**
 * Append stiff constraint.
 * @method module:constraints.append_stiff
 * @param obj Object ID
 * @param target Object ID or [Armature object ID, Bone Name]
 * @param {vec3} offset Offset in parent local space
 * @param {quat4} [rotation_offset] Rotation offset in parent local space
 */
exports["append_stiff"] = function(obj, target, offset, rotation_offset) {

    if (target instanceof Array && target.length == 2)
        constraints.append_stiff_bone(obj, target[0], target[1], offset, rotation_offset);
    else
        constraints.append_stiff_obj(obj, target, offset, rotation_offset);
}
/**
 * Append semi-stiff constraint.
 * @method module:constraints.append_semi_stiff
 * @param obj Object ID
 * @param target Object ID or [Armature object ID, Bone Name]
 * @param {vec3} offset Offset in parent local space
 * @param {quat4} [rotation_offset] Rotation offset in parent local space
 */
exports["append_semi_stiff"] = function(obj, target, offset, rotation_offset) {
    constraints.append_semi_stiff_obj(obj, target, offset, rotation_offset);
}
/**
 * Append semi-stiff constraint with camera rotation clamping.
 * @method module:constraints.append_semi_stiff_cam
 * @param obj Object ID
 * @param target Object ID or [Armature object ID, Bone Name]
 * @param {vec3} offset Offset in parent local space
 * @param {quat4} [rotation_offset] Rotation offset in parent local space
 * @param clamp_left Clamp camera rotation left for azimuth angle
 * @param clamp_right Clamp camera rotation right for azimuth angle
 * @param clamp_up Clamp camera rotation up for elevation angle
 * @param clamp_down Clamp camera rotation down for elevation angle
 */
exports["append_semi_stiff_cam"] = function(obj, target, offset, rotation_offset, 
                                            clamp_left, clamp_right, 
                                            clamp_up, clamp_down) {
    constraints.append_semi_stiff_cam_obj(obj, target, offset, rotation_offset, 
                                          clamp_left, clamp_right, 
                                          clamp_up, clamp_down);
}
/**
 * Append semi-soft constraint.
 * @method module:constraints.append_semi_soft_cam
 * @param obj Object ID
 * @param target Object ID or [Armature object ID, Bone Name]
 * @param {vec3} offset Offset in parent local space
 */
exports["append_semi_soft_cam"] = function(obj, target, offset) {
    constraints.append_semi_soft_cam_obj(obj, target, offset);
}
/**
 * Append stiff translation constraint.
 * @method module:constraints.append_stiff_trans
 * @param obj Object ID
 * @param target Object ID
 * @param {vec3} offset Offset in target local space
 */
exports["append_stiff_trans"] = function(obj, target, offset) {
    constraints.append_stiff_trans_obj(obj, target, offset);
}
/**
 * Append copy translatioin constraint.
 * @method module:constraints.append_copy_trans
 * @param obj Object ID
 * @param target Object ID
 * @param {vec3} offset Offset in world space
 */
exports["append_copy_trans"] = function(obj, target, offset) {
    constraints.append_copy_trans_obj(obj, target, offset);
}
exports["append_stiff_trans_rot"] = function(obj, target, offset, rotation_offset) {
    constraints.append_stiff_trans_rot_obj(obj, target, offset, rotation_offset);
}
/**
 * Append track constraint.
 * @method module:constraints.append_track
 * @param obj Object ID
 * @param target Target object ID or vector
 */
exports["append_track"] = function(obj, target) {
    if (target.length == 3)
        constraints.append_track_point(obj, target);
    else
        constraints.append_track_obj(obj, target);
}
/**
 * Append follow constraint.
 * @method module:constraints.append_follow
 * @param obj Object ID
 * @param target Target object ID or vector
 * @param {Number} offset Offset
 */
exports["append_follow"] = function(obj, target, offset_min, offset_max) {
    if (target.length == 3)
        constraints.append_follow_point(obj, target, offset_min, offset_max);
    else
        constraints.append_follow_obj(obj, target, offset_min, offset_max);
}
/**
 * Remove object constraint if any.
 * @method module:constraints.remove
 * @param obj Object ID
 */
exports["remove"] = function(obj) {
    if (obj._constraint)
        constraints.remove(obj);
}

}
