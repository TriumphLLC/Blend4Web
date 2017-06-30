/**
 * Copyright (C) 2014-2017 Triumph LLC
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
"use strict";

/**
 * Object constraints API. Please note that these constraints are not the same
 * as those assigned in Blender.
 * @module constraints
 * @local StiffViewportPositioning
 */
b4w.module["constraints"] = function(exports, require) {

var m_cam      = require("__camera");
var m_cons     = require("__constraints");
var m_obj_util = require("__obj_util");
var m_phy      = require("__physics");
var m_print    = require("__print");
var m_trans    = require("__transform");
var m_util     = require("__util");
var m_vec3     = require("__vec3");

/**
 * An object that defines positioning for the stiff viewport constraint.
 * @typedef {Object} StiffViewportPositioning
 * @property {number} [left] Offset from the left edge of the camera's viewport
 * @property {number} [right] Offset from the right edge of the camera's viewport
 * @property {number} [top] Offset from the top edge of the camera's viewport
 * @property {number} [bottom] Offset from the bottom edge of the camera's viewport
 * @property {number} [distance] Distance from the camera
 * @property {Quat} [rotation] Rotation offset
 * @property {string} [hor_units="widths"] Left/Right offset units: "heights" or "widths"
 * @property {string} [vert_units="heights"] Top/Bottom offset units: "heights" or "widths"
 * @cc_externs left right top bottom distance rotation hor_units vert_units
 */

/**
 * Attach the object to the other object or to the armature bone using a
 * stiff constraint. The child object will move, rotate and scale
 * together with its parent. Examples: a sword is parented to the
 * character's hand; the character is sitting in a vehicle.
 *
 * @method module:constraints.append_stiff
 * @param {Object3D} obj Constrained object
 * @param {(Object3D|Array)} target Target object or [Armature object, Bone Name]
 * @param {Vec3} [offset] Offset, in the parent's local space.
 * @param {Quat} [rotation_offset=null] Rotation offset, in the
 * parent's local space.
 * @param {number} [scale_offset=1] Scale offset, in the parent's local space.
 *
 * @example var m_scene = require("scenes");
 * var m_const = require("constraints");
 *
 * var my_offset_vector = new Float32Array([2.0, 2.0, 2.0]);
 *
 * var my_cube = m_scene.get_object_by_name("cube");
 * var my_sphere = m_scene.get_object_by_name("Icosphere");
 *
 * m_const.append_stiff(my_sphere, my_cube, my_offset_vector);
 */
exports.append_stiff = function(obj, target, offset, rotation_offset,
        scale_offset) {

    if (!m_obj_util.is_dynamic(obj)) {
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
        return;
    }
    offset = offset || new Float32Array(3);
    scale_offset = scale_offset || 1;
    rotation_offset =
            rotation_offset ? rotation_offset : [0, 0, 0, 1];

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
 * @param {Object3D} obj Constrained object
 * @param {Object3D} target Target object
 * @param {Vec3} [offset] Offset, in the parent's local space
 * @param {Quat} [rotation_offset] Initial rotation offset, in the
 * parent's local space
 * @param {number} [clamp_left] Left object rotation limit, in radians
 * @param {number} [clamp_right] Right object rotation limit, in radians
 * @param {number} [clamp_up] Upward object rotation limit, in radians
 * @param {number} [clamp_down] Downward object rotation limit, in radians
 *
 * @example var m_scene = require("scenes");
 * var m_const = require("constraints");
 *
 * var my_offset_vector = new Float32Array([2.0, 2.0, 2.0]);
 *
 * var my_cube = m_scene.get_object_by_name("cube");
 * var my_sphere = m_scene.get_object_by_name("Icosphere");
 *
 * m_const.append_semi_stiff(my_sphere, my_cube, my_offset_vector);
 */
exports.append_semi_stiff = function(obj, target, offset, rotation_offset,
                                            clamp_left, clamp_right,
                                            clamp_up, clamp_down) {
    if (!m_obj_util.is_dynamic(obj)) {
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
        return;
    }
    clamp_left  = m_util.isdef(clamp_left) ? clamp_left : Math.PI / 2;
    clamp_right = m_util.isdef(clamp_right) ? clamp_right : -Math.PI / 2;
    clamp_up    = m_util.isdef(clamp_up) ? clamp_up :  Math.PI / 2;
    clamp_down  = m_util.isdef(clamp_down) ? clamp_down : -Math.PI / 2;
    offset = offset || new Float32Array(3);
    rotation_offset =
            rotation_offset ? new Float32Array(rotation_offset) : null;

    m_cons.append_semi_stiff_obj(obj, target, offset, rotation_offset,
                                        clamp_left, clamp_right,
                                        clamp_up, clamp_down);

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
 * @param {Object3D} obj Constrained object
 * @param {Object3D} target Target object
 * @param {Vec3} [offset] Offset, in the parent's local space
 * @param {Quat} [rotation_offset] Initial rotation offset, in the
 * parent's local space
 * @param {number} [clamp_left] Left camera rotation limit, in radians
 * @param {number} [clamp_right] Right camera rotation limit, in radians
 * @param {number} [clamp_up] Upward camera rotation limit, in radians
 * @param {number} [clamp_down] Downward camera rotation limit, in radians
 * @deprecated [17.06] Use {@link module:constraints.append_semi_stiff} instead
 */
exports.append_semi_stiff_cam = function(obj, target, offset, rotation_offset,
                                            clamp_left, clamp_right,
                                            clamp_up, clamp_down) {
    m_print.error_deprecated("append_semi_stiff_cam", "append_semi_stiff");
    if (!m_cam.is_eye_camera(obj)) {
        m_print.error("append_semi_stiff_cam(): wrong object type, only EYE" +
            " camera objects can be parented.");
        return;
    }
    exports.append_semi_stiff(obj, target, offset, rotation_offset,
                                            clamp_left, clamp_right,
                                            clamp_up, clamp_down);
}

/**
 * Attach the EYE camera to the object using a
 * semi-soft constraint. The camera will smoothly follow the object's rear.
 * Example: third-person character or vehicle views.
 *
 * @method module:constraints.append_semi_soft_cam
 * @param {Object3D} obj Constrained object
 * @param {Object3D} target Target object
 * @param {Vec3} [offset] Offset, in the parent's local space
 * @param {number} [softness=0.25] Camera smoothness ratio
 * @deprecated [17.06] Use {@link module:constraints.append_semi_soft} instead
 */
exports.append_semi_soft_cam = function(obj, target, offset, softness) {

    m_print.error_deprecated("append_semi_soft_cam", "append_semi_soft");
    if (!m_cam.is_eye_camera(obj)) {
        m_print.error("append_semi_soft_cam(): wrong object type, only EYE" +
            " camera objects can be parented.");
        return;
    }
    exports.append_semi_soft(obj, target, offset, softness);
}

/**
 * Attach one object to another one using a
 * semi-soft constraint. The object will smoothly follow the object's rear.
 * Example: third-person character or vehicle views.
 *
 * @method module:constraints.append_semi_soft
 * @param {Object3D} obj Constrained object
 * @param {Object3D} target Target object
 * @param {Vec3} [offset] Offset, in the parent's local space
 * @param {number} [softness=0.25] Object smoothness ratio
 *
 * @example var m_scene = require("scenes");
 * var m_const = require("constraints");
 *
 * var my_offset_vector = new Float32Array([2.0, 2.0, 2.0]);
 * 
 * var my_cube = m_scene.get_object_by_name("cube");
 * var my_sphere = m_scene.get_object_by_name("Icosphere");
 *
 * m_const.append_semi_soft(my_sphere, my_cube, my_offset_vector, 0.5);
 */
exports.append_semi_soft = function(obj, target, offset, softness) {

    if (!m_obj_util.is_dynamic(obj)) {
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
        return;
    }

    if (!m_util.isdef(softness) || softness < 0)
        softness = 0.25;
    offset = offset || new Float32Array(3);

    m_cons.append_semi_soft_obj(obj, target, offset, softness);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Attach the object to the other object using a
 * stiff translation constraint. The child object will move together with
 * its parent, but will not rotate. It will be still possible to rotate it
 * independently from the parent.
 * <p>
 * Example: attaching the camera to the physics character in order to
 * implement the first-person character view.
 * </p>
 * </p>
 * Another example: the character
 * jumps in water and splashes' particle emitter is attached to the
 * first-person camera using this constraint - the bubbles will follow the
 * character but will not be rotated with the camera.
 * </p>
 * @method module:constraints.append_stiff_trans
 * @param {Object3D} obj Constrained object
 * @param {Object3D} target Target object
 * @param {Vec3} [offset] Offset, in the parent's local space
 *
 * @example var m_scene = require("scenes");
 * var m_const = require("constraints");
 *
 * var my_offset_vector = new Float32Array([-2.0, 2.0, 2.0]);
 *
 * var my_cube = m_scene.get_object_by_name("cube");
 * var my_sphere_4 = m_scene.get_object_by_name("Icosphere");
 *
 * m_const.append_stiff_trans(my_sphere, my_cube, my_offset_vector);
 */
exports.append_stiff_trans = function(obj, target, offset) {

    if (!m_obj_util.is_dynamic(obj)) {
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
        return;
    }
    offset = offset || new Float32Array(3);
    m_cons.append_stiff_trans_obj(obj, target, offset);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Attach the object to the other object using a copy location constraint.
 * The child object will move together with its parent, but will not rotate.
 * Note that the offset is the object's location in the world space.
 * <p>
 * This method works similarly to the <b>Copy Location</b> constraint in Blender.
 * </p>
 * @method module:constraints.append_copy_loc
 * @param {Object3D} obj Constrained object
 * @param {Object3D} target Target object
 * @param {string} [axes='XYZ'] Copy the target's location
 * @param {boolean} [use_offset=false] Add original location into copied location
 * @param {number} [influence=1] Amount of influence constraint will have on the final solution
 *
 * @example var m_scene = require("scenes");
 * var m_const = require("constraints");
 *
 * var my_cube = m_scene.get_object_by_name("cube");
 * var my_sphere = m_scene.get_object_by_name("Icosphere");
 *
 * m_const.append_copy_loc(my_sphere, my_cube, 'XYZ', false, 0.5);
 */
exports.append_copy_loc = function(obj, target, axes, use_offset, influence) {

    if (!m_obj_util.is_dynamic(obj)) {
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
        return;
    }

    use_offset = use_offset || false;
    axes = axes || "XYZ";
    influence = influence || 1;
    var offset = m_trans.get_translation(obj, new Float32Array(3));
    var used_axes = new Float32Array(3);
    used_axes[0] = axes.indexOf("-X") != -1 ? -1 : axes.indexOf("X") != -1 ? 1 : 0;
    used_axes[1] = axes.indexOf("-Y") != -1 ? -1 : axes.indexOf("Y") != -1 ? 1 : 0;
    used_axes[2] = axes.indexOf("-Z") != -1 ? -1 : axes.indexOf("Z") != -1 ? 1 : 0;
    m_cons.append_copy_loc_obj(obj, target, offset, used_axes, use_offset, influence);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Attach the object to the other object using a copy translation constraint.
 * The child object will move and rotate together with its parent.
 * <p>
 * This method works similarly to the <b>Copy Transforms</b> constraint in Blender.
 * </p>
 * @method module:constraints.append_copy_trans
 * @param {Object3D} obj Constrained object
 * @param {Object3D} target Target object
 * @param {number} [influence=1] Amount of influence constraint will have on the final solution
 *
 * @example var m_scene = require("scenes");
 * var m_const = require("constraints");
 *
 * var my_cube = m_scene.get_object_by_name("cube");
 * var my_sphere = m_scene.get_object_by_name("Icosphere");
 *
 * m_const.append_copy_trans(my_sphere, my_cube, 0.5);
 */
exports.append_copy_trans = function(obj, target, influence) {

    if (!m_obj_util.is_dynamic(obj)) {
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
        return;
    }
    influence = influence || 1;

    m_cons.append_copy_trans_obj(obj, target, influence);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Attach the object to the other object using a copy rotation constraint.
 * The child object will rotate together with its parent, but will not move.
 * Note that the offset is the object's rotation in the world space.
 * <p> 
 * This method works similarly to the <b>Copy Rotation</b> constraint in Blender.
 * </p>
 * @method module:constraints.append_copy_rot
 * @param {Object3D} obj Constrained object
 * @param {Object3D} target Target object
 * @param {string} [axes='XYZ'] Copy the target's location
 * @param {boolean} [use_offset=false] Add original location into copied location
 * @param {number} [influence=1] Amount of influence constraint will have on the final solution
 *
 * @example var m_scene = require("scenes");
 * var m_const = require("constraints");
 *
 * var my_cube = m_scene.get_object_by_name("cube");
 * var my_sphere = m_scene.get_object_by_name("Icosphere");
 *
 * m_const.append_copy_rot(my_sphere, my_cube, 'XYZ', 0.5);
 */
exports.append_copy_rot = function(obj, target, axes, use_offset, influence) {

    if (!m_obj_util.is_dynamic(obj)) {
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
        return;
    }
    use_offset = use_offset || false;
    axes = axes || "XYZ";
    influence = influence || 1;
    var used_axes = new Float32Array(3);
    used_axes[0] = axes.indexOf("-X") != -1 ? -1 : axes.indexOf("X") != -1 ? 1 : 0;
    used_axes[1] = axes.indexOf("-Y") != -1 ? -1 : axes.indexOf("Y") != -1 ? 1 : 0;
    used_axes[2] = axes.indexOf("-Z") != -1 ? -1 : axes.indexOf("Z") != -1 ? 1 : 0;
    m_cons.append_copy_rot_obj(obj, target, used_axes, use_offset, influence);

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
 * @param {Object3D} obj Constrained object
 * @param {Object3D} target Target object
 * @param {Vec3} [offset] Offset, in the parent's local space
 * @param {Quat} [rotation_offset] Rotation offset, in
 * the parent's local space
 *
 * @example var m_scene = require("scenes");
 * var m_const = require("constraints");
 *
 * var my_sphere = m_scene.get_object_by_name("Icosphere");
 * var my_cube = m_scene.get_object_by_name("cube");
 *
 * var my_offset_vector = new Float32Array([-2.0, 2.0, 2.0]);
 * m_const.append_stiff_trans_rot(my_sphere, my_cube, my_offset_vector);
 */
exports.append_stiff_trans_rot = function(obj, target, offset, rotation_offset) {

    if (!m_obj_util.is_dynamic(obj)) {
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
        return;
    }
    offset = offset || new Float32Array(3);
    rotation_offset =
            rotation_offset ? new Float32Array(rotation_offset) : [0, 0, 0, 1];
    m_cons.append_stiff_trans_rot_obj(obj, target, offset, rotation_offset, 1.0);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Make the object "looking" at the target object.
 *
 * Example: a spot light which is tracking the character; both objects can be
 * moved via API or animated.
 * <p>
 * This method works in a similar way to the <b>Track To</b> constraint in Blender.
 * </p>
 * @method module:constraints.append_track
 * @param {Object3D} obj Constrained object
 * @param {(Object3D)} target Target object
 * @param {string} [track_axis='Y'] Axis that points to the target object
 * @param {string} [up_axis='Z'] Axis that points upward
 * @param {boolean} [use_target_z=false] Target's Z axis, not World Z axis, will constraint the Up direction
 * @param {number} [influence=1] Amount of influence constraint will have on the final solution
 *
 * @example var m_scene = require("scenes");
 * var m_const = require("constraints");
 *
 * var my_cube = m_scene.get_object_by_name("cube");  
 * var my_camera = m_scene.get_object_by_name("Camera");
 *
 * m_const.append_track(my_camera, my_cube, "-X", "Z");
 */
exports.append_track = function(obj, target, track_axis, up_axis, use_target_z, influence) {

    if (!m_obj_util.is_dynamic(obj)) {
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
        return;
    }
    var track_axis_vec = m_util.AXIS_Y;
    if (track_axis == "-Y")
        track_axis_vec = m_util.AXIS_MY;
    else if (track_axis == "Y")
        track_axis_vec = m_util.AXIS_Y;
    else if (track_axis == "-X")
        track_axis_vec = m_util.AXIS_MX;
    else if (track_axis == "X")
        track_axis_vec = m_util.AXIS_X;
    else if (track_axis == "-Z")
        track_axis_vec = m_util.AXIS_MZ;
    else if (track_axis == "Z")
        track_axis_vec = m_util.AXIS_Z;

    var up_axis_vec = m_util.AXIS_Z;
    if (up_axis == "X")
        up_axis_vec = m_util.AXIS_X;
    else if (up_axis == "Y")
        up_axis_vec = m_util.AXIS_Y;

    if (Math.abs(m_vec3.dot(track_axis_vec, up_axis_vec)) == 1) {
        m_print.error("Can not use parallel vectors for track and up axes.");
        return;
    }

    influence = influence || 1;
    use_target_z = use_target_z || false;
    m_cons.append_track_obj(obj, target, track_axis_vec, up_axis_vec,
                    use_target_z, influence);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Attach the object to the other object using a follow constraint. The child
 * object will track and follow its parent position.
 * <p>
 * This method works similarly to the <b>Limit Distance</b> constraint in Blender, but, unlike it, does not set a precise distance.
 * </p>
 * Example: a follow-style camera view for the character.
 *
 * @method module:constraints.append_follow
 * @param {Object3D} obj Constrained object
 * @param {Object3D} target Target object
 * @param {number} dist_min Minimum distance
 * @param {number} dist_max Maximum distance
 *
 * @example var m_scene = require("scenes");
 * var m_const = require("constraints");
 *
 * var my_cube = m_scene.get_object_by_name("cube");
 * var my_camera = m_scene.get_object_by_name("Camera");
 *
 * m_const.append_follow(my_camera, my_cube, 2.0, 4.0);
 */
exports.append_follow = function(obj, target, dist_min, dist_max) {

    if (!m_obj_util.is_dynamic(obj)) {
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
        return;
    }

    m_cons.append_follow_obj(obj, target, dist_min, dist_max);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Attach the object to the camera using a stiff viewport constraint, so
 * the child object will preserve its orientation in the camera viewport.
 * This constraint is used to create onscreen 2D/3D user interfaces.
 * @method module:constraints.append_stiff_viewport
 * @param {Object3D} obj Constrained object
 * @param {Object3D} camobj Camera object
 * @param {StiffViewportPositioning} [positioning] Positioning
 *
 * @example var m_scene = require("scenes");
 * var m_const = require("constraints");
 *
 * var sphere_1 = m_scene.get_object_by_name("Icosphere");
 * var my_camera = m_scene.get_object_by_name("Camera");
 *
 * m_const.append_stiff_viewport(sphere_1, my_camera, { 
 *      left: 150,
 *      top: 100,
 *      distance: 1
 *  });
 */
exports.append_stiff_viewport = function(obj, camobj, positioning) {
    if (!m_obj_util.is_dynamic(obj)) {
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
        return;
    }
    positioning = positioning || {};
    m_cons.append_stiff_viewport(obj, camobj, positioning);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Remove the object's constraint (if any).
 * @method module:constraints.remove
 * @param {Object3D} obj Constrained object
 * @param {boolean} [restore_transform=false] Restore default transform
 *
 * @example var m_scene = require("scenes");
 * var m_const = require("constraints");
 *
 * var my_sphere = m_scene.get_object_by_name("Icosphere");
 *
 * m_const.remove(my_sphere);
 */
exports.remove = function(obj, restore_transform) {
    restore_transform = restore_transform || false;
    if (obj.constraint)
        m_cons.remove(obj, restore_transform);
    if (restore_transform)
        m_trans.update_transform(obj);
}

}
