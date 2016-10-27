/**
 * Copyright (C) 2014-2016 Triumph LLC
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
 * Containts various utility methods for math, searching etc.
 * @module util
 */
b4w.module["util"] = function(exports, require) {

var m_compat   = require("__compat");
var m_obj_util = require("__obj_util");
var m_print    = require("__print");
var m_quat     = require("__quat");
var m_util     = require("__util");
var m_vec3     = require("__vec3");

var _pline_tmp = new Float32Array(6);
/**
 * X-axis vector.
 * @const {Vec3} module:util.AXIS_X
 */
exports.AXIS_X  = new Float32Array([1, 0, 0]);
/**
 * Y-axis vector.
 * @const {Vec3} module:util.AXIS_Y
 */
exports.AXIS_Y  = new Float32Array([0, 1, 0]);
/**
 * Z-axis vector.
 * @const {Vec3} module:util.AXIS_Z
 */
exports.AXIS_Z  = new Float32Array([0, 0, 1]);
/**
 * Negative x-axis vector.
 * @const {Vec3} module:util.AXIS_MX
 */
exports.AXIS_MX = new Float32Array([-1, 0, 0]);
/**
 * Negative y-axis vector.
 * @const {Vec3} module:util.AXIS_MY
 */
exports.AXIS_MY = new Float32Array([ 0,-1, 0]);
/**
 * Negative z-axis vector.
 * @const {Vec3} module:util.AXIS_MZ
 */
exports.AXIS_MZ = new Float32Array([ 0, 0,-1]);

/**
 * Rotation sequence enum.
 * @typedef RotationSequence
 * @type {Number}
 */

/**
 * Rotation sequence: XYX.
 * @const {RotationSequence} module:util.XYX
 */
exports.XYX = m_util.XYX;
/**
 * Rotation sequence: YZY.
 * @const {RotationSequence} module:util.YZY
 */
exports.YZY = m_util.YZY;
/**
 * Rotation sequence: ZXZ.
 * @const {RotationSequence} module:util.ZXZ
 */
exports.ZXZ = m_util.ZXZ;
/**
 * Rotation sequence: XZX.
 * @const {RotationSequence} module:util.XZX
 */
exports.XZX = m_util.XZX;
/**
 * Rotation sequence: YXY.
 * @const {RotationSequence} module:util.YXY
 */
exports.YXY = m_util.YXY;
/**
 * Rotation sequence: ZYZ.
 * @const {RotationSequence} module:util.ZYZ
 */
exports.ZYZ = m_util.ZYZ;
/**
 * Rotation sequence: XYZ.
 * @const {RotationSequence} module:util.XYZ
 */
exports.XYZ = m_util.XYZ;
/**
 * Rotation sequence: YZX.
 * @const {RotationSequence} module:util.YZX
 */
exports.YZX = m_util.YZX;
/**
 * Rotation sequence: ZXY.
 * @const {RotationSequence} module:util.ZXY
 */
exports.ZXY = m_util.ZXY;
/**
 * Rotation sequence: XZY.
 * @const {RotationSequence} module:util.XZY
 */
exports.XZY = m_util.XZY;
/**
 * Rotation sequence: YXZ.
 * @const {RotationSequence} module:util.YXZ
 */
exports.YXZ = m_util.YXZ;
/**
 * Rotation sequence: ZYX.
 * @const {RotationSequence} module:util.ZYX
 */
exports.ZYX = m_util.ZYX;

/**
 * Create a new Float32Array.
 * @param {Number | Array | TypedArray} param Constructor param
 * @returns {Float32Array} New Float32Array.
 */
exports.f32 = function(param) {
    param = param || 0;
    return m_util.f32(param);
}

/**
 * Abort the program if assertion is false.
 * @method module:util.assert
 * @param {Boolean} Boolean expression result
 */
exports.assert = m_util.assert;

/**
 * Search for object in array.
 * @method module:util.keyfind
 * @param {String} key Key
 * @param {*} value Value
 * @param {Object[]} array Array of objects.
 * @returns {Object[]} Array of found objects.
 */
exports.keyfind = m_util.keyfind;

/**
 * Search for object in array.
 * @method module:util.keysearch
 * @param {String} key Key.
 * @param {*} value Value.
 * @param {Array} array Array of objects.
 * @returns {?Object} First found object or null.
 */
exports.keysearch = m_util.keysearch;

/**
 * Extract rotation from the 4x4 matrix to quaternion vector.
 * @method module:util.matrix_to_quat
 * @param {Mat4} matrix 4x4 matrix
 * @returns {Quat} Quaternion
 */
exports.matrix_to_quat = function(matrix) {
    return m_util.matrix_to_quat(matrix);
}

/**
 * Convert euler angles in the ZYX intrinsic system to quaternion.
 * @method module:util.euler_to_quat
 * @param {Euler} euler Euler angles. The angles order: an angle of the rotation around the x axis,
 * an angle of the rotation around the y axis, an angle of the rotation around the z axis.
 * @param {Quat} quat Destination quaternion vector.
 * @returns {Quat} Quaternion vector.
 */
exports.euler_to_quat = function(euler, quat) {
    if (!quat)
        quat = new Float32Array(4);

    return m_util.euler_to_quat(euler, quat);
}

/**
 * Convert Euler angles in the ordered intrinsic system to quaternion.
 * @method module:util.ordered_angles_to_quat
 * @param {Euler} angles Ordered Euler angles. Euler angles have the same order as
 * the intrinsic rotation sequence.
 * @param {RotationSequence} order Intrinsic rotation sequence.
 * @param {Quat} quat Destination quaternion vector.
 * @returns {Quat} Quaternion vector.
 */
exports.ordered_angles_to_quat = function(angles, order, quat) {
    if (!quat)
        quat = m_quat.create();

    return m_util.ordered_angles_to_quat(angles, order, quat);
}

/**
 * Convert quaternion to Euler angles in the ordered intrinsic system.
 * @method module:util.quat_to_ordered_angles
 * @param {Quat} quat Quaternion vector.
 * @param {RotationSequence} order Intrinsic rotation sequence.
 * @param {Euler} euler Destination Euler angles vector. Euler angles have the same order as
 * the intrinsic rotation sequence.
 * @returns {Euler} Euler angles vector.
 */
exports.quat_to_ordered_angles = function(quat, order, angles) {
    if (!angles)
        angles = m_vec3.create();

    return m_util.quat_to_ordered_angles(quat, order, angles);
}

/**
 * Convert quaternion rotation to euler rotation.
 * @method module:util.quat_to_euler
 * @param {Quat} quat Quaternion vector
 * @param {Euler} euler Destination euler vector
 * @returns {Euler} Euler vector
 */
exports.quat_to_euler = function(quat, euler) {
    if (!euler)
        euler = new Float32Array(3);

    return m_util.quat_to_euler(quat, euler);
}

/**
 * Get sign of the number.
 * @method module:util.sign
 * @param {Number} value Input value
 * @returns {Number} -1,0,1 for negative, zero or positive number accordingly
 */
exports.sign = m_util.sign;

/**
 * Clamp the number.
 * @method module:util.clamp
 * @param {Number} value Input value
 * @param {Number} min Lower bound
 * @param {Number} max Upper bound
 * @returns {Number} Clamped value
 */
exports.clamp = m_util.clamp;

/**
 * Convert quaternion rotation to a directional vector.
 * @method module:util.quat_to_dir
 * @param {Quat} quat Rotation quaternion
 * @param {Vec3} ident Identity vector
 * @param {Vec3} [dest] Destination vector
 * @returns {Vec3} Destination vector.
 */
exports.quat_to_dir = m_util.quat_to_dir;

/**
 * Project camera quaternion rotation on a horizontal plane.
 * @method module:util.ground_project_quat
 * @param {Quat} quat Source quaternion.
 * @param {Quat} dest Destination quaternion.
 * @returns {Quat} Destination quaternion.
 */
exports.ground_project_quat = function(quat, dest) {
    return m_util.quat_project(quat, m_util.AXIS_MZ, m_util.AXIS_Z, m_util.AXIS_Y, dest);
}

/**
 * Transform a camera quaternion to a mesh quaternion.
 * @method module:util.cam_quat_to_mesh_quat
 * @param {Quat} cam_quat Camera quaternion.
 * @param {Quat} [dest] Destination quaternion.
 * @returns {Quat} Destination quaternion.
 */
exports.cam_quat_to_mesh_quat = function(cam_quat, dest) {
    return m_util.cam_quat_to_mesh_quat(cam_quat, dest);
}

/**
 * Perform quaternion projection.
 * @method module:util.quat_project
 * @param {Quat} quat Quaternion to project.
 * @param {Vec3} quat_ident_dir Direction corresponding to the identity quaternion.
 * @param {Vec3} plane Plane direction (normal).
 * @param {Vec3} plane_ident_dir Direction corresponding to the
 * identity quaternion in a plane.
 * @param {Quat} [dest=quat.create()] Destination quaternion.
 * @returns {Quat} Destination quaternion.
 */
exports.quat_project = function(quat, quat_ident_dir,
        plane, plane_ident_dir, dest) {

    if (m_vec3.dot(plane, plane_ident_dir) != 0) {
        m_print.error("Wrong in-plane direction");
        return null;
    }

    return m_util.quat_project(quat, quat_ident_dir,
            plane, plane_ident_dir, dest);
}

exports.hash_code = m_util.hash_code;

/**
 * Perform exponential smoothing.
 * @method module:util.smooth
 * @param {Number} curr Current value.
 * @param {Number} last Last smoothed value.
 * @param {Number} delta Time delta.
 * @param {Number} pariod Mean lifetime for avaraging.
 * @returns {Number} Smoothed value
 */
exports.smooth = m_util.smooth;

/**
 * Perform exponential smoothing (vector form).
 * @method module:util.smooth_v
 * @param {Float32Array} curr Current value.
 * @param {Float32Array} last Last smoothed value.
 * @param {Float32Array} delta Time delta.
 * @param {Float32Array} pariod Mean lifetime for avaraging.
 * @param {Float32Array} [dest] Smoothed value
 * @returns {Float32Array} Smoothed value
 */
exports.smooth_v = m_util.smooth_v;

/**
 * Check if object is a vector.
 * @method module:util.is_vector
 * @param {Object} o Object
 * @param {Number} [dimension=0] Dimension, allow any if not specified
 * @returns {Boolean} Check result
 */
exports.is_vector = m_util.is_vector;

/**
 * Correct the camera quaternion rotation.
 * @method module:util.correct_cam_quat_up
 * @param {Quat} quat Quaternion to correct
 * @param {Boolean} up_only Disable upside-down camera view
 */
exports.correct_cam_quat_up = m_util.correct_cam_quat_up;

exports.quat_to_angle_axis = m_util.quat_to_angle_axis;

exports.random_from_array = m_util.random_from_array;

exports.horizontal_direction = m_util.horizontal_direction;

/**
 * Calculate intersection point of a line and a plane.
 * @method module:util.line_plane_intersect
 * @see Lengyel E. - Mathematics for 3D Game Programming and Computer Graphics,
 * Third Edition. Chapter 5.2.1 Intersection of a Line and a Plane
 * @param {Vec3} pn Plane normal.
 * @param {Number} p_dist Plane signed distance from the origin.
 * @param {Vec3} lp Point belonging to the line.
 * @param {Vec3} l_dir Line direction.
 * @param {Vec3} dest Destination vector.
 * @returns {?Vec3} Intersection point or null if the line is parallel to the plane.
 * @deprecated use {@link module:math.line_plane_intersect|math.line_plane_intersect} instead.
 */
exports.line_plane_intersect = function(pn, p_dist, lp, l_dir, dest) {
    m_print.error_deprecated("util.line_plane_intersect", "math.line_plane_intersect");
    _pline_tmp[0] = lp[0];
    _pline_tmp[1] = lp[1];
    _pline_tmp[2] = lp[2];

    _pline_tmp[3] = l_dir[0];
    _pline_tmp[4] = l_dir[1];
    _pline_tmp[5] = l_dir[2];
    return m_util.line_plane_intersect(pn, p_dist, _pline_tmp, dest);
}

/**
 * Check if object is of type MESH
 * @method module:util.is_mesh
 * @param {Object3D} obj Object 3D
 * @returns {Boolean} Check result
 * @deprecated use {@link module:objects.is_mesh|objects.is_mesh} instead.
 */
exports.is_mesh = function(obj) {
    m_print.error_deprecated("util.is_mesh", "objects.is_mesh");
    return m_obj_util.is_mesh(obj);
}

/**
 * Check if object is of type ARMATURE
 * @method module:util.is_armature
 * @param {Object3D} obj Object 3D
 * @returns {Boolean} Check result
 * @deprecated use {@link module:objects.is_armature|objects.is_armature} instead.
 */
exports.is_armature = function(obj) {
    m_print.error_deprecated("util.is_armature", "objects.is_armature");
    return m_obj_util.is_armature(obj);
}

/**
 * Convert radian angle into range [0, 2PI)
 * @method module:util.angle_wrap_0_2pi
 * @param {Number} angle Angle in radians
 * @returns {Number} Converted angle
 */
exports.angle_wrap_0_2pi = m_util.angle_wrap_0_2pi;

/**
 * Convert radian angle into custom range [from, to)
 * @method module:util.angle_wrap_periodic
 * @param {Number} angle Angle in radians
 * @param {Number} from Value from in radians
 * @param {Number} to Value to in radians
 * @returns {Number} Converted angle
 */
exports.angle_wrap_periodic = m_util.angle_wrap_periodic;

/**
 * Smooth step function.
 * @method module:util.smooth_step
 * @param {Number} t Input value.
 * @param {Number} min Min clamping value.
 * @param {Number} max Max clamping value.
 * @returns {Number} Result value.
 */
exports.smooth_step = m_util.smooth_step;

/**
 * Linear interpolation function.
 * @method module:util.lerp
 * @param {Number} t Input value.
 * @param {Number} from Start interpolation value.
 * @param {Number} to End interpolation value.
 * @returns {Number} Result value.
 */
exports.lerp = m_util.lerp;

/**
 * Convert degrees to radians.
 * @method module:util.deg_to_rad
 * @param {Number} degrees Angle in degrees.
 * @returns {Number} Angle in radians.
 */
exports.deg_to_rad = m_util.deg_to_rad;

/**
 * Convert radians to degrees.
 * @method module:util.rad_to_deg
 * @param {Number} radians Angle in radians.
 * @returns {Number} Angle in degrees.
 */
exports.rad_to_deg = m_util.rad_to_deg;
/**
 * Convert directional vector to quaternion.
 * @method module:util.dir_to_quat
 * @param {Vec3} dir Directional vector.
 * @param {Vec3} ident Identity vector
 * @param {Quat} [dest] Destination quaternion
 * @returns {Quat} Destination quaternion
 */
exports.dir_to_quat = m_util.dir_to_quat;

/**
 * Check if Internet Explorer 11 is using.
 * @returns {Boolean} Check result.
 */
exports.is_ie11 = m_compat.is_ie11;

/**
 * Generate flat array of TBN quaternions
 * @param {Float32Array} normals Flat array of normals.
 * @param {Float32Array} [tangents] Flat array of tangents.
 * @returns {Float32Array} Flat array of quaternions.
 */
exports.gen_tbn_quats = m_util.gen_tbn_quats;

}
