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

exports["AXIS_X"]  = new Float32Array([1, 0, 0]);
exports["AXIS_Y"]  = new Float32Array([0, 1, 0]);
exports["AXIS_Z"]  = new Float32Array([0, 0, 1]);
exports["AXIS_MX"] = new Float32Array([-1, 0, 0]);
exports["AXIS_MY"] = new Float32Array([ 0,-1, 0]);
exports["AXIS_MZ"] = new Float32Array([ 0, 0,-1]);

/**
 * @method module:util.keyfind
 */
exports["keyfind"] = util.keyfind;

/**
 * @method module:util.keysearch
 */
exports["keysearch"] = util.keysearch;

/**
 * @method module:util.matrix_to_quat
 */
exports["matrix_to_quat"] = function(matrix) {
    return util.matrix_to_quat(matrix);
}

/**
 * @method module:util.euler_to_quat
 */
exports["euler_to_quat"] = function(euler) {
    return util.euler_to_quat(euler);
}

/**
 * @method module:util.quat_to_euler
 */
exports["quat_to_euler"] = function(quat) {
    return util.quat_to_euler(quat);
}

/**
 * Get sign of number
 * @method module:util.sign
 */
exports["sign"] = util.sign;

/**
 * Clamp number.
 * @method module:util.clamp
 */
exports["clamp"] = util.clamp;

/**
 * Convert quaternion to directional vector.
 * @method module:util.quat_to_dir
 * @param quat Rotation quaternion
 * @param ident Identity vector
 * @param [dest] Destination vector
 * @returns Destination vector.
 */
exports["quat_to_dir"] = util.quat_to_dir;

/**
 * Project camera quaternion rotation on horizontal plane.
 * @method module:util.ground_project_quat
 * @deprecated Bad implementation use quat_project instead
 */
exports["ground_project_quat"] = function(quat, dest) {
    return util.quat_project(quat, util.AXIS_MY, util.AXIS_Y, util.AXIS_MZ, dest);
}

/**
 * Transform camera quaternion to mesh quaternion.
 * @method module:util.cam_quat_to_mesh_quat
 * @param quat Camera quaternion.
 * @param [dest] Destination quaternion.
 */
exports["cam_quat_to_mesh_quat"] = function(cam_quat, dest) {
    return util.cam_quat_to_mesh_quat(cam_quat, dest);
}

/**
 * Perform quaternion projection.
 * @method module:util.quat_project
 * @param quat Quaternion to project.
 * @param quat_ident_dir Direction corresponding to identity quat.
 * @param plane Plane direction (normal).
 * @param plane_ident_dir Direction corresponding to identity quat in plane.
 * @param [dest] Destination quaternion.
 * @returns Destination quaternion.
 */
exports["quat_project"] = function(quat, quat_ident_dir,
        plane, plane_ident_dir, dest) {

    if (m_vec3.dot(plane, plane_ident_dir) != 0) {
        m_print.error("Wrong in-plane direction");
        return null;
    }

    return util.quat_project(quat, quat_ident_dir,
            plane, plane_ident_dir, dest);
}

exports["hash_code"] = util.hash_code;

/**
 * Perform exponential smoothing.
 * @param curr Current value.
 * @param last Last smoothed value.
 * @param delta Time delta.
 * @param pariod Mean lifetime for avaraging.
 */
exports["smooth"] = util.smooth;

/**
 * Perform exponential smoothing (vector form).
 */
exports["smooth_v"] = util.smooth_v;

/**
 * Check if object is vector.
 * @param o Object
 * @param [dimension=0] Dimension, allow any if not specified
 */
exports["is_vector"] = util.is_vector;

/**
 * Correct camera quaternion.
 */
exports["correct_cam_quat_up"] = util.correct_cam_quat_up;

exports["quat_to_angle_axis"] = util.quat_to_angle_axis;

exports["random_from_array"] = util.random_from_array;

exports["xz_direction"] = util.xz_direction;

}
