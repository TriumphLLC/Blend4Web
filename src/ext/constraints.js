"use strict";

/**
 * Object constraints API.
 * @module constraints
 */
b4w.module["constraints"] = function(exports, require) {

var m_cam   = require("__camera");
var m_cons  = require("__constraints");
var m_phy   = require("__physics");
var m_print = require("__print");
var m_trans = require("__transform");

/**
 * Attach the object to the other object or to the armature bone using a
 * stiff constraint. The child object will move, rotate and scale
 * together with its parent. Examples: a sword is parented to the
 * character's hand; the character is sitting in a vehicle.
 *
 * @method module:constraints.append_stiff
 * @param {Object3D} obj Object 3D
 * @param {(Object3D|Array)} target Object 3D or [Armature object, Bone Name]
 * @param {Vec3} offset Offset, in the parent's local space.
 * @param {Quat} [rotation_offset=null] Rotation offset, in the
 * parent's local space.
 * @param {Number} [scale_offset=1] Scale offset, in the parent's local space.
 */
exports.append_stiff = function(obj, target, offset, rotation_offset,
        scale_offset) {

    scale_offset = scale_offset || 1;

    if (target instanceof Array && target.length == 2)
        m_cons.append_stiff_bone(obj, target[0], target[1], offset,
                rotation_offset, scale_offset);
    else
        m_cons.append_stiff_obj(obj, target, offset, rotation_offset,
                scale_offset);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Attach the object to the other object using a
 * semi-stiff constraint. The child object will move and rotate together with
 * its parent, but it will be still possible to rotate it independently
 * in the parent's local space. Example: a tank turret.
 *
 * @method module:constraints.append_semi_stiff
 * @param {Object3D} obj Object 3D
 * @param {Object3D} target Object 3D
 * @param {Vec3} offset Offset, in the parent's local space
 * @param {Quat} [rotation_offset] Initial rotation offset, in the
 * parent's local space
 */
exports.append_semi_stiff = function(obj, target, offset, rotation_offset) {
    m_cons.append_semi_stiff_obj(obj, target, offset, rotation_offset);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Attach the EYE camera to the object using a
 * semi-stiff constraint. Also apply rotation limits to the camera.
 * The camera will move and rotate together with
 * its parent, but it will be still possible to rotate it independently
 * in the parent's local space. The camera's UP vector will be preserved.
 * Example: first-person vehicle view.
 *
 * @see https://www.blend4web.com/doc/en/camera.html#api
 * @method module:constraints.append_semi_stiff_cam
 * @param {Object3D} obj Object 3D
 * @param {Object3D} target Object 3D
 * @param {Vec3} offset Offset, in the parent's local space
 * @param {Quat} [rotation_offset] Initial rotation offset, in the
 * parent's local space
 * @param {Number} clamp_left Left camera rotation limit, in radians
 * @param {Number} clamp_right Right camera rotation limit, in radians
 * @param {Number} clamp_up Upward camera rotation limit, in radians
 * @param {Number} clamp_down Downward camera rotation limit, in radians
 */
exports.append_semi_stiff_cam = function(obj, target, offset, rotation_offset,
                                            clamp_left, clamp_right,
                                            clamp_up, clamp_down) {
    if (!m_cam.is_eye_camera(obj)) {
        m_print.error("append_semi_stiff_cam(): wrong object type, only EYE" +
            " camera objects can be parented.");
        return null;
    }

    m_cons.append_semi_stiff_cam_obj(obj, target, offset, rotation_offset,
                                          clamp_left, clamp_right,
                                          clamp_up, clamp_down);
    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Attach the EYE camera to the object using a
 * semi-soft constraint. The camera will smoothly follow the object's rear.
 * Example: third-person character or vehicle views.
 *
 * @method module:constraints.append_semi_soft_cam
 * @param {Object3D} obj Object 3D
 * @param {Object3D} target Object 3D
 * @param {Vec3} offset Offset, in the parent's local space
 * @param {Number} [softness=0.25] Camera smoothness ratio
 */
exports.append_semi_soft_cam = function(obj, target, offset, softness) {

    if (!m_cam.is_eye_camera(obj)) {
        m_print.error("append_semi_soft_cam(): wrong object type, only EYE" +
            " camera objects can be parented.");
        return null;
    }

    if (!softness || softness < 0)
        softness = 0.25;

    m_cons.append_semi_soft_cam_obj(obj, target, offset, softness);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Attach the object to the other object using a
 * stiff translation constraint. The child object will move together with
 * its parent, but will not rotate. It will be still possible to rotate it
 * independently from the parent.
 *
 * Example: attaching the camera to the physics character in order to
 * implement the first-person character view. Another example: the character
 * jumps in water and splashes' particle emitter is attached to the
 * first-person camera using this constraint - the bubbles will follow the
 * character but will not be rotated with the camera.
 *
 * @method module:constraints.append_stiff_trans
 * @param {Object3D} obj Object 3D
 * @param {Object3D} target Object 3D
 * @param {Vec3} offset Offset, in the parent's local space
 */
exports.append_stiff_trans = function(obj, target, offset) {
    m_cons.append_stiff_trans_obj(obj, target, offset);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Attach the object to the other object using a copy translation constraint.
 * The child object will move together with its parent, but will not rotate.
 * Note that the offset is specified in the world space.
 * Example: a light source attached to the character.
 *
 * @method module:constraints.append_copy_trans
 * @param {Object3D} obj Object 3D
 * @param {Object3D} target Object 3D
 * @param {Vec3} offset Offset, in the parent's world space
 */
exports.append_copy_trans = function(obj, target, offset) {
    m_cons.append_copy_trans_obj(obj, target, offset);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Attach the object to the other object using a
 * stiff translation/rotation constraint. The child object will move and rotate
 * together with its parent, but will not scale. It will be still possible to
 * scale it independently from the parent.
 *
 * Example: smoke emitter attached to the tractor pipe; exhaustion effects
 * are achieved by scaling the emitter.
 *
 * @method module:constraints.append_stiff_trans_rot
 * @param {Object3D} obj Object 3D
 * @param {Object3D} target Object 3D
 * @param {Vec3} offset Offset, in the parent's local space
 * @param {Quat} [rotation_offset] Rotation offset, in
 * the parent's local space
 */
exports.append_stiff_trans_rot = function(obj, target, offset, rotation_offset) {
    m_cons.append_stiff_trans_rot_obj(obj, target, offset, rotation_offset, 1.0);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Make the object "looking" at the target object or the position. The object's
 * facing direction is considered to be the -Y axis (-Z in Blender coordinates),
 * that is vertically downwards.
 *
 * Example: a spot light which is tracking the character; both objects can be
 * moved via API or animated.
 *
 * @method module:constraints.append_track
 * @param {Object3D} obj Object 3D
 * @param {(Object3D|Vec3)} target Target object or position vector
 */
exports.append_track = function(obj, target) {
    if (target.length == 3)
        m_cons.append_track_point(obj, target);
    else
        m_cons.append_track_obj(obj, target);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Attach the object to the other object using a follow constraint. The child
 * object will track and follow its parent position.
 *
 * Example: a follow-style camera view for the character.
 *
 * @method module:constraints.append_follow
 * @param {Object3D} obj Object 3D
 * @param {(Object3D|Vec3)} target Target object or position vector
 * @param {Number} dist_min Minimum distance
 * @param {Number} dist_max Maximum distance
 */
exports.append_follow = function(obj, target, dist_min, dist_max) {

    if (target.length == 3)
        m_cons.append_follow_point(obj, target, dist_min, dist_max);
    else
        m_cons.append_follow_obj(obj, target, dist_min, dist_max);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Append a stiff viewport constraint.
 * @method module:constraints.append_stiff_viewport
 * @param {Object3D} obj Object 3D
 * @param {Object3D} camobj Camera object.
 * @param {Number} x_rel X offset as fraction to camera height.
 * @param {Number} y_rel Y offset as fraction to camera height.
 * @param {Number} dist Distance from the camera
 */
exports.append_stiff_viewport = function(obj, camobj, positioning) {
    m_cons.append_stiff_viewport(obj, camobj, positioning);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Remove the object's constraint (if any).
 * @method module:constraints.remove
 * @param {Object3D} obj Object 3D
 */
exports.remove = function(obj) {
    if (obj._constraint)
        m_cons.remove(obj);
}

/**
 * Get object's parent object.
 * @method module:constraints.get_parent
 * @param {Object3D} obj Object 3D
 */
exports.get_parent = m_cons.get_parent;

}
