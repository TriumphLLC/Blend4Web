"use strict";

/**
 * Implements various utility functions.
 * @module util
 */
b4w.module["util"] = function(exports, require) {

var m_print = require("__print");
var util    = require("__util");

var m_vec3 = require("vec3");
var m_mat4 = require("mat4");

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
 * Create a new Float32Array.
 * @param {Number | Array | TypedArray} param Constructor param
 */
exports.f32 = function(param) {
    param = param || 0;
    return new Float32Array(param);
}

/**
 * Abort the program if assertion is false.
 * @method module:util.assert
 * @param {Boolean} Boolean expression result
 */
exports.assert = util.assert;

/**
 * Search for object in array.
 * @method module:util.keyfind
 * @param {String} key Key
 * @param {*} value Value
 * @param {Object[]} array Array of objects.
 * @returns {Object[]} Array of found objects.
 */
exports.keyfind = util.keyfind;

/**
 * Search for object in array.
 * @method module:util.keysearch
 * @param {String} key Key.
 * @param {*} value Value.
 * @param {Array} array Array of objects.
 * @returns {?Object} First found object or null.
 */
exports.keysearch = util.keysearch;

/**
 * Extract rotation from the 4x4 matrix to quaternion vector.
 * @method module:util.matrix_to_quat
 * @param {Mat4} matrix 4x4 matrix
 * @returns {Quat} Quaternion
 */
exports.matrix_to_quat = function(matrix) {
    return util.matrix_to_quat(matrix);
}

/**
 * Convert euler rotation to quaternion rotation.
 * @method module:util.euler_to_quat
 * @param {Euler} euler Euler vector
 * @param {Quat} quat Destination quaternion vector
 * @returns {Quat} Quaternion vector
 */
exports.euler_to_quat = function(euler, quat) {
    if (!quat)
        quat = new Float32Array(4);

    return util.euler_to_quat(euler, quat);
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

    return util.quat_to_euler(quat, euler);
}

/**
 * Get sign of the number.
 * @method module:util.sign
 * @param {Number} value Input value
 * @returns {Number} -1,0,1 for negative, zero or positive number accordingly
 */
exports.sign = util.sign;

/**
 * Clamp the number.
 * @method module:util.clamp
 * @param {Number} value Input value
 * @param {Number} min Lower bound
 * @param {Number} max Upper bound
 * @returns {Number} Clamped value
 */
exports.clamp = util.clamp;

/**
 * Convert quaternion rotation to a directional vector.
 * @method module:util.quat_to_dir
 * @param {Quat} quat Rotation quaternion
 * @param {Vec3} ident Identity vector
 * @param {Vec3} [dest] Destination vector
 * @returns {Vec3} Destination vector.
 */
exports.quat_to_dir = util.quat_to_dir;

/**
 * Project camera quaternion rotation on a horizontal plane.
 * @method module:util.ground_project_quat
 * @param {Quat} quat Source quaternion.
 * @returns {Quat} Destination quaternion.
 */
exports.ground_project_quat = function(quat, dest) {
    return util.quat_project(quat, util.AXIS_MY, util.AXIS_Y, util.AXIS_MZ, dest);
}

/**
 * Transform a camera quaternion to a mesh quaternion.
 * @method module:util.cam_quat_to_mesh_quat
 * @param {Quat} quat Camera quaternion.
 * @param {Quat} [dest] Destination quaternion.
 * @returns {Quat} Destination quaternion.
 */
exports.cam_quat_to_mesh_quat = function(cam_quat, dest) {
    return util.cam_quat_to_mesh_quat(cam_quat, dest);
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

    return util.quat_project(quat, quat_ident_dir,
            plane, plane_ident_dir, dest);
}

exports.hash_code = util.hash_code;

/**
 * Perform exponential smoothing.
 * @method module:util.smooth
 * @param {Number} curr Current value.
 * @param {Number} last Last smoothed value.
 * @param {Number} delta Time delta.
 * @param {Number} pariod Mean lifetime for avaraging.
 * @returns {Number} Smoothed value
 */
exports.smooth = util.smooth;

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
exports.smooth_v = util.smooth_v;

/**
 * Check if object is a vector.
 * @method module:util.is_vector
 * @param {Object} o Object
 * @param {Number} [dimension=0] Dimension, allow any if not specified
 * @returns {Boolean} Check result
 */
exports.is_vector = util.is_vector;

/**
 * Correct the camera quaternion rotation.
 * @method module:util.correct_cam_quat_up
 * @param {Quat} quat Quaternion to correct
 * @param {Boolean} up_only Disable upside-down camera view
 */
exports.correct_cam_quat_up = util.correct_cam_quat_up;

exports.quat_to_angle_axis = util.quat_to_angle_axis;

exports.random_from_array = util.random_from_array;

exports.xz_direction = util.xz_direction;

exports.line_plane_intersect = util.line_plane_intersect;

/**
 * Check if object is of type MESH
 * @method module:util.is_mesh
 * @param {Object3D} obj Object 3D
 * @returns {Boolean} Check result
 */
exports.is_mesh = util.is_mesh;

/**
 * Check if object is of type ARMATURE
 * @method module:util.is_armature
 * @param {Object3D} obj Object 3D
 * @returns {Boolean} Check result
 */
exports.is_armature = util.is_armature;

/**
 * Convert radian angle into range [0, 2PI]
 * @method module:util.angle_wrap_0_2pi
 * @param {Number} angle Angle in radians
 * @returns {Number} Converted angle
 */
exports.angle_wrap_0_2pi = util.angle_wrap_0_2pi;

/**
 * Convert radian angle into custom range [from, to]
 * @method module:util.angle_wrap_periodic
 * @param {Number} angle Angle in radians
 * @param {Number} from Value from in radians
 * @param {Number} to Value to in radians
 * @returns {Number} Converted angle
 */
exports.angle_wrap_periodic = util.angle_wrap_periodic;

/**
 * Smooth step function.
 * @method module:util.smooth_step
 * @param {Number} t Input value.
 * @param {Number} min Min clamping value.
 * @param {Number} max Max clamping value.
 * @returns {Number} Result value.
 */
exports.smooth_step = util.smooth_step;

/**
 * Linear interpolation function.
 * @method module:util.lerp
 * @param {Number} t Input value.
 * @param {Number} from Start interpolation value.
 * @param {Number} to End interpolation value.
 * @returns {Number} Result value.
 */
exports.lerp = util.lerp;

}
