"use strict";

/** 
 * TSR-8 utility functions.
 * TSR is a Float32Array vector which has the following format:
 * [X, Y, Z, SCALE, QUAT_X, QUAT_Y, QUAT_Z, QUAT_W]
 * @module tsr
 */
b4w.module["tsr"] = function(exports, require) {

var m_print = require("__print");
var m_tsr   = require("__tsr");

/**
 * Create a new identity TSR vector.
 * @method module:tsr.create
 * @returns {tsr8} New TSR vector
 */
exports.create = m_tsr.create;

/**
 * Copy one TSR vector to another.
 * @method module:tsr.copy
 * @param {tsr8} tsr Source TSR vector
 * @param {tsr8} tsr2 Destination TSR vector
 */
exports.copy = m_tsr.copy;

/**
 * Set TSR to identity.
 * @method module:tsr.identity
 * @param {tsr8} tsr TSR vector
 */
exports.identity = m_tsr.identity;

/**
 * Create a new TSR from separate trans, scale and quat.
 * @method module:tsr.create_sep
 * @param {vec3} trans Translation vector
 * @param {Number} scale Scale
 * @param {quat} quat Rotation quaternion
 * @param {tsr8} [dest] Destination TSR vector
 * @returns {tsr8} dest Destination TSR vector
 */
exports.create_sep = m_tsr.create_sep;

/**
 * Set TSR from separate trans, scale and quat.
 * @method module:tsr.set_sep
 * @param {vec3} trans Translation vector
 * @param {Number} scale Scale
 * @param {quat} quat Rotation quaternion
 * @param {tsr8} dest Destination TSR vector
 */
exports.set_sep = m_tsr.set_sep;

/**
 * Set TSR translation.
 * @method module:tsr.set_trans
 * @param {vec3} trans Translation vector
 * @param {tsr8} dest Destination TSR vector
 */
exports.set_trans = m_tsr.set_trans;
/**
 * Set TSR scale.
 * @method module:tsr.set_scale
 * @param {Number} scale Scale
 * @param {tsr8} dest Destination TSR vector
 */
exports.set_scale = m_tsr.set_scale;
/**
 * Set TSR translation and scale from vec4.
 * @method module:tsr.set_transcale
 * @param {vec4} transcale Translation+Scale vector
 * @param {tsr8} dest Destination TSR vector
 */
exports.set_transcale = m_tsr.set_transcale ;
/**
 * Set TSR quaternion.
 * @method module:tsr.set_quat
 * @param {quat} quat Rotation quaternion
 * @param {tsr8} dest Destination TSR vector
 */
exports.set_quat = m_tsr.set_quat;

/**
 * Get ArrayBufferView from translation part of TSR.
 * @method module:tsr.get_trans_view
 * @param {tsr8} tsr TSR vector
 * @returns {vec3} Translation part of TSR
 */
exports.get_trans_view = m_tsr.get_trans_view;
/**
 * Get TSR scale.
 * @method module:tsr.get_scale
 * @returns {Number} Scale
 */
exports.get_scale = m_tsr.get_scale;
/**
 * Get ArrayBufferView from quaternion part of TSR.
 * @method module:tsr.get_quat_view
 * @returns {quat} Quaternion part of TSR
 */
exports.get_quat_view = m_tsr.get_quat_view;

/**
 * Calculates the inverse of TSR.
 * @method module:tsr.invert
 * @param {tsr8} tsr TSR vector
 * @param {tsr8} dest Destination TSR vector
 * @returns {tsr8} Destination TSR vector
 */
exports.invert = m_tsr.invert;

/**
 * Set TSR from mat4.
 * NOTE: not optimized
 * @method module:tsr.from_mat4
 * @param {mat4} mat Matrix
 * @returns {tsr8} Destination TSR vector
 */
exports.from_mat4 = m_tsr.from_mat4;

/**
 * Multiply two TSRs.
 * @method module:tsr.multiply
 * @param {tsr8} tsr First TSR vector
 * @param {tsr8} tsr2 Second TSR vector
 * @param {tsr8} dest Destination TSR vector
 * @returns {tsr8} Destination TSR vector
 */
exports.multiply = m_tsr.multiply;

/**
 * Transform vec3 by TSR.
 * @method module:tsr.transform_vec3
 * @param {vec3} trans Vector to transform
 * @param {tsr8} tsr TSR vector
 * @param {vec3} dest Destination vector
 */
exports.transform_vec3 = m_tsr.transform_vec3;

/**
 * Transform vec3 by inverse TSR.
 * @method module:tsr.transform_vec3_inv
 * @param {vec3} trans Vector to transform
 * @param {tsr8} tsr TSR vector
 * @param {vec3} dest Destination vector
 */
exports.transform_vec3_inv = m_tsr.transform_vec3_inv;

/**
 * Tranform vec3 vectors by TSR.
 * optional destination offset in values (not vectors, not bytes)
 * @method module:tsr.transform_vectors
 * @param {Float32Array} vectors Array of vectors to transform
 * @param {tsr8} tsr TSR vector
 * @param {Float32Array} new_vectors Destination array of vectors
 * @param {Number} [dest_offset=0] Offset in new_vectors array
 * @returns {Float32Array} Destination array of vectors
 */
exports.transform_vectors = m_tsr.transform_vectors;
/**
 * Transform directional vec3 vectors by TSR.
 * optional destination offset in values (not vectors, not bytes)
 * @method module:tsr.transform_dir_vectors
 * @param {Float32Array} vectors Array of vectors to transform
 * @param {tsr8} tsr TSR vector
 * @param {Float32Array} new_vectors Destination array of vectors
 * @param {Number} [dest_offset=0] Offset in new_vectors array
 * @returns {Float32Array} Destination array of vectors
 */
exports.transform_dir_vectors = m_tsr.transform_dir_vectors;
/**
 * Transform directional vec3 by TSR.
 * @method module:tsr.transform_dir_vec3
 * @param {vec3} trans Vector to transform
 * @param {tsr8} tsr TSR vector
 * @param {vec3} dest Destination vector
 */
exports.transform_dir_vec3 = m_tsr.transform_dir_vec3;

/**
 * Tranform 4 comp tangent vectors by matrix.
 * optional destination offset in values (not vectors, not bytes)
 * @method module:tsr.transform_tangents
 * @param {Float32Array} vectors Array of vectors to transform
 * @param {tsr8} tsr TSR vector
 * @param {Float32Array} new_vectors Destination array of vectors
 * @param {Number} [dest_offset=0] Offset in new_vectors array
 * @returns {Float32Array} Destination array of vectors
 */
exports.transform_tangents = m_tsr.transform_tangents;

/**
 * Perform TSR translation by given vec3.
 * @method module:tsr.translate
 * @param {tsr8} tsr TSR vector
 * @param {vec3} trans Translation vector
 * @param {tsr8} dest Destination TSR vector
 * @returns {tsr8} Destination TSR vector
 */
exports.translate = m_tsr.translate;

/**
 * Perform interpolation between two TSR vectors.
 * @method module:tsr.interpolate
 * @param {tsr8} tsr First TSR vector
 * @param {tsr8} tsr2 Second TSR vector
 * @param {Number} factor Interpolation factor
 * @param {tsr8} dest Destination TSR vector
 * @returns {tsr8} Destination TSR vector
 */
exports.interpolate = m_tsr.interpolate;

}
