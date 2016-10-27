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
 * TSR-8 utility functions
 * @name tsr
 * @namespace
 * @exports exports as tsr
 */
b4w.module["__tsr"] = function(exports, require) {

var m_mat4 = require("__mat4");
var m_quat = require("__quat");
var m_util = require("__util");
var m_vec3 = require("__vec3");

var ZUP_SIN = Math.sin(-Math.PI/4);
var ZUP_COS = -ZUP_SIN;

var _vec3_tmp = new Float32Array(3);
var _quat_tmp = new Float32Array(4);
var _quat_tmp2 = new Float32Array(4);
var _mat4_tmp = new Float32Array(16);

exports.create = create;
function create() {
    var tsr = new Float32Array(8);
    tsr[3] = 1;
    tsr[7] = 1;
    return tsr;
}

exports.clone = function(tsr) {
    var out = create();
    copy(tsr, out);
    return out;
}

exports.from_values = function(x, y, z, s, qx, qy, qz, qw) {
    var tsr = create();
    tsr[0] = x;
    tsr[1] = y;
    tsr[2] = z;
    tsr[3] = s;
    tsr[4] = qx;
    tsr[5] = qy;
    tsr[6] = qz;
    tsr[7] = qw;
    return tsr;
}

exports.create_ext = create_ext;
function create_ext() {
    var tsr = new Float32Array(9);
    tsr[3] = 1;
    tsr[7] = 1;
    return tsr;
}

exports.clone_ext = function(tsr) {
    var out = create_ext();
    copy(tsr, out);
    return out;
}

exports.from_values_ext = function(x, y, z, s, qx, qy, qz, qw) {
    var tsr = create_ext();
    tsr[0] = x;
    tsr[1] = y;
    tsr[2] = z;
    tsr[3] = s;
    tsr[4] = qx;
    tsr[5] = qy;
    tsr[6] = qz;
    tsr[7] = qw;
    return tsr;
}

exports.copy = copy;
function copy(tsr, dest) {
    // faster than .set()

    dest[0] = tsr[0];
    dest[1] = tsr[1];
    dest[2] = tsr[2];
    dest[3] = tsr[3];
    dest[4] = tsr[4];
    dest[5] = tsr[5];
    dest[6] = tsr[6];
    dest[7] = tsr[7];
    return dest;
}

exports.identity = function(tsr) {
    tsr[0] = 0;
    tsr[1] = 0;
    tsr[2] = 0;
    tsr[3] = 1;
    tsr[4] = 0;
    tsr[5] = 0;
    tsr[6] = 0;
    tsr[7] = 1;

    return tsr;
}

exports.set_sep = set_sep; 
/**
 * Set from separate trans, scale and quat.
 */
function set_sep(trans, scale, quat, dest) {
    dest[0] = trans[0];
    dest[1] = trans[1];
    dest[2] = trans[2];
    dest[3] = scale;
    dest[4] = quat[0];
    dest[5] = quat[1];
    dest[6] = quat[2];
    dest[7] = quat[3];

    return dest;
}

exports.set_trans = function(trans, dest) {
    dest[0] = trans[0];
    dest[1] = trans[1];
    dest[2] = trans[2];

    return dest;
}
exports.set_scale = function(scale, dest) {
    dest[3] = scale;

    return dest;
}
exports.set_transcale = function(transcale, dest) {
    dest[0] = transcale[0];
    dest[1] = transcale[1];
    dest[2] = transcale[2];
    dest[3] = transcale[3];

    return dest;
}
exports.set_quat = function(quat, dest) {
    dest[4] = quat[0];
    dest[5] = quat[1];
    dest[6] = quat[2];
    dest[7] = quat[3];

    return dest;
}

/**
 * NOTE: bad for CPU and GC
 */
exports.get_trans_view = function(tsr) {
    return tsr.subarray(0, 3);
}
exports.get_trans = function(tsr, dest) {
    dest[0] = tsr[0];
    dest[1] = tsr[1];
    dest[2] = tsr[2];

    return dest;
}
exports.get_scale = function(tsr) {
    return tsr[3];
}
exports.get_transcale = function(tsr, dest) {
    dest[0] = tsr[0];
    dest[1] = tsr[1];
    dest[2] = tsr[2];
    dest[3] = tsr[3];

    return dest;
}
/**
 * NOTE: bad for CPU and GC
 */
exports.get_quat_view = function(tsr) {
    return tsr.subarray(4, 8);
}
exports.get_quat = get_quat;
function get_quat(tsr, dest) {
    dest[0] = tsr[4];
    dest[1] = tsr[5];
    dest[2] = tsr[6];
    dest[3] = tsr[7];

    return dest;
}

exports.invert = function(tsr, dest) {
    var sc_inv = 1/tsr[3];
    if (!sc_inv)
        return null;

    var tx = tsr[0];
    var ty = tsr[1];
    var tz = tsr[2];

    _quat_tmp[0] = tsr[4];
    _quat_tmp[1] = tsr[5];
    _quat_tmp[2] = tsr[6];
    _quat_tmp[3] = tsr[7];

    m_quat.invert(_quat_tmp, _quat_tmp);

    var qx_inv = _quat_tmp[0];
    var qy_inv = _quat_tmp[1];
    var qz_inv = _quat_tmp[2];
    var qw_inv = _quat_tmp[3];

    // scale and rotate
    var x = tx * sc_inv;
    var y = ty * sc_inv;
    var z = tz * sc_inv;

    // quat * vec
    var ix = qw_inv * x + qy_inv * z - qz_inv * y;
    var iy = qw_inv * y + qz_inv * x - qx_inv * z;
    var iz = qw_inv * z + qx_inv * y - qy_inv * x;
    var iw = -qx_inv * x - qy_inv * y - qz_inv * z;

    // result * inverse quat
    dest[0] = -(ix * qw_inv + iw * -qx_inv + iy * -qz_inv - iz * -qy_inv);
    dest[1] = -(iy * qw_inv + iw * -qy_inv + iz * -qx_inv - ix * -qz_inv);
    dest[2] = -(iz * qw_inv + iw * -qz_inv + ix * -qy_inv - iy * -qx_inv);

    dest[3] = sc_inv;
    dest[4] = qx_inv;
    dest[5] = qy_inv;
    dest[6] = qz_inv;
    dest[7] = qw_inv;

    return dest;
}

exports.to_mat4 = function(tsr, dest) {
    var trans = tsr.subarray(0, 3);
    var scale = tsr[3];
    var quat = tsr.subarray(4, 8);

    var mat = m_mat4.fromRotationTranslation(quat, trans, dest);

    for (var i = 0; i < 12; i++)
        dest[i] *= scale;

    return dest;
}

/**
 * NOTE: not optimized
 */
exports.from_mat4 = function(mat, dest) {
    var trans = m_util.matrix_to_trans(mat, _vec3_tmp);
    var scale = m_util.matrix_to_scale(mat);
    var quat = m_util.matrix_to_quat(mat, _quat_tmp);
    set_sep(trans, scale, quat, dest);
    return dest;
}

/**
 * Multiply two TSRs.
 */
exports.multiply = function(tsr, tsr2, dest) {

    // trans
    transform_vec3(tsr2, tsr, dest);

    // scale
    dest[3] = tsr[3] * tsr2[3];

    // quat
    var ax = tsr[4], ay = tsr[5], az = tsr[6], aw = tsr[7],
            bx = tsr2[4], by = tsr2[5], bz = tsr2[6], bw = tsr2[7];

    dest[4] = ax * bw + aw * bx + ay * bz - az * by;
    dest[5] = ay * bw + aw * by + az * bx - ax * bz;
    dest[6] = az * bw + aw * bz + ax * by - ay * bx;
    dest[7] = aw * bw - ax * bx - ay * by - az * bz;

    return dest;
}

/**
 * NOTE: unused, non-optimized
 */
exports.transform_mat4 = transform_mat4;
function transform_mat4(matrix, tsr, dest) {
    var trans = tsr.subarray(0, 3);
    var scale = tsr[3];
    var quat = tsr.subarray(4, 8);

    var m = m_mat4.fromRotationTranslation(quat, trans, _mat4_tmp);

    for (var i = 0; i < 12; i++)
        m[i] *= scale;

    m_mat4.multiply(m, matrix, dest);

    return dest;
}

exports.transform_vec3 = transform_vec3;
/**
 * Transform vec3 by TSR
 */
function transform_vec3(vec, tsr, dest) {

    var tx = tsr[0];
    var ty = tsr[1];
    var tz = tsr[2];
    var scale = tsr[3];
    var qx = tsr[4];
    var qy = tsr[5];
    var qz = tsr[6];
    var qw = tsr[7];

    // scale and rotate
    var x = vec[0] * scale;
    var y = vec[1] * scale;
    var z = vec[2] * scale;

    // quat * vec
    var ix = qw * x + qy * z - qz * y;
    var iy = qw * y + qz * x - qx * z;
    var iz = qw * z + qx * y - qy * x;
    var iw = -qx * x - qy * y - qz * z;

    // result * inverse quat
    dest[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    dest[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    dest[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;

    // translate
    dest[0] += tx;
    dest[1] += ty;
    dest[2] += tz;

    return dest;
}

/**
 * Transform vec3 by inverse TSR
 */
exports.transform_vec3_inv = function(vec, tsr, dest) {
    var tx = tsr[0];
    var ty = tsr[1];
    var tz = tsr[2];
    var scale = tsr[3];

    // inverse translate
    var x = vec[0] - tx;
    var y = vec[1] - ty;
    var z = vec[2] - tz;

    var qx = tsr[4];
    var qy = tsr[5];
    var qz = tsr[6];
    var qw = tsr[7];

    var dot = qx*qx + qy*qy + qz*qz + qw*qw;
    var inv_dot = dot ? 1.0/dot : 0;

    qx =-qx * inv_dot;
    qy =-qy * inv_dot;
    qz =-qz * inv_dot;
    qw = qw * inv_dot;

    // quat * vec
    var ix = qw * x + qy * z - qz * y;
    var iy = qw * y + qz * x - qx * z;
    var iz = qw * z + qx * y - qy * x;
    var iw =-qx * x - qy * y - qz * z;

    // result * inverse quat
    dest[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    dest[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    dest[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;

    dest[0] /= scale;
    dest[1] /= scale;
    dest[2] /= scale;

    return dest;
}

/**
 * Tranform vec3 vectors by TSR
 * optional destination offset in values (not vectors, not bytes)
 */
exports.transform_vectors = function(vectors, tsr, new_vectors,
        dest_offset) {

    if (!dest_offset)
        var dest_offset = 0;

    var len = vectors.length;

    var tx = tsr[0];
    var ty = tsr[1];
    var tz = tsr[2];
    var scale = tsr[3];
    var qx = tsr[4];
    var qy = tsr[5];
    var qz = tsr[6];
    var qw = tsr[7];

    for (var i = 0; i < len; i+=3) {
        // scale and rotate
        var x = vectors[i] * scale;
        var y = vectors[i+1] * scale;
        var z = vectors[i+2] * scale;

        // quat * vec
        var ix = qw * x + qy * z - qz * y;
        var iy = qw * y + qz * x - qx * z;
        var iz = qw * z + qx * y - qy * x;
        var iw = -qx * x - qy * y - qz * z;

        // result * inverse quat
        new_vectors[dest_offset + i] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
        new_vectors[dest_offset + i + 1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
        new_vectors[dest_offset + i + 2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;

        // translate
        new_vectors[dest_offset + i] += tx;
        new_vectors[dest_offset + i + 1] += ty;
        new_vectors[dest_offset + i + 2] += tz;
    }

    return new_vectors;
}

/**
 * Transform directional vec3 vectors by TSR.
 * optional destination offset in values (not vectors, not bytes)
 */
exports.transform_dir_vectors = function(vectors, tsr, new_vectors,
        dest_offset) {

    if (!dest_offset)
        var dest_offset = 0;

    var len = vectors.length;

    var scale = tsr[3];
    var qx = tsr[4];
    var qy = tsr[5];
    var qz = tsr[6];
    var qw = tsr[7];

    for (var i = 0; i < len; i+=3) {
        // scale and rotate
        var x = vectors[i] * scale;
        var y = vectors[i+1] * scale;
        var z = vectors[i+2] * scale;

        // quat * vec
        var ix = qw * x + qy * z - qz * y;
        var iy = qw * y + qz * x - qx * z;
        var iz = qw * z + qx * y - qy * x;
        var iw = -qx * x - qy * y - qz * z;

        // result * inverse quat
        new_vectors[dest_offset + i] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
        new_vectors[dest_offset + i + 1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
        new_vectors[dest_offset + i + 2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    }

    return new_vectors;
}

/**
 * Transform directional vec3 by TSR.
 */
exports.transform_dir_vec3 = function(vec, tsr, new_vec) {

    var scale = tsr[3];
    var qx = tsr[4];
    var qy = tsr[5];
    var qz = tsr[6];
    var qw = tsr[7];

    // scale and rotate
    var x = vec[0] * scale;
    var y = vec[1] * scale;
    var z = vec[2] * scale;

    // quat * vec
    var ix = qw * x + qy * z - qz * y;
    var iy = qw * y + qz * x - qx * z;
    var iz = qw * z + qx * y - qy * x;
    var iw = -qx * x - qy * y - qz * z;

    // result * inverse quat
    new_vec[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    new_vec[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    new_vec[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;

    return new_vec;
}

/**
 * Tranform 4 comp tangent vectors by matrix.
 * optional destination offset in values (not vectors, not bytes)
 */
exports.transform_tangents = function(vectors, tsr, new_vectors, 
        dest_offset) {

    if (!dest_offset)
        var dest_offset = 0;

    var len = vectors.length;

    var scale = tsr[3];
    var qx = tsr[4];
    var qy = tsr[5];
    var qz = tsr[6];
    var qw = tsr[7];

    for (var i = 0; i < len; i+=4) {
        // scale and rotate
        var x = vectors[i] * scale;
        var y = vectors[i+1] * scale;
        var z = vectors[i+2] * scale;

        // quat * vec
        var ix = qw * x + qy * z - qz * y;
        var iy = qw * y + qz * x - qx * z;
        var iz = qw * z + qx * y - qy * x;
        var iw = -qx * x - qy * y - qz * z;

        // result * inverse quat
        new_vectors[dest_offset + i] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
        new_vectors[dest_offset + i + 1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
        new_vectors[dest_offset + i + 2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
        // just save exact sign
        new_vectors[dest_offset + i + 3] = vectors[i + 3];
    }

    return new_vectors;
}

exports.transform_quat = function(quat, tsr, new_quat) {
    var rot_quat = get_quat(tsr, _quat_tmp);

    m_quat.multiply(rot_quat, quat, new_quat);

    return new_quat;
}

/**
 * Tranform quaternions vectors by tsr.
 * optional destination offset in values (not vectors, not bytes)
 */
exports.transform_quats = function(vectors, tsr, new_vectors,
        dest_offset) {

    var dest_offset = dest_offset || 0;

    var len = vectors.length;

    var rot_quat = get_quat(tsr, _quat_tmp);

    m_util.quats_multiply_quat(vectors, rot_quat, new_vectors, dest_offset);

    return new_vectors;
}

/**
 * Perform TSR translation by given vec3
 */
exports.translate = function(tsr, vec, dest) {
    var scale = tsr[3];
    var qx = tsr[4];
    var qy = tsr[5];
    var qz = tsr[6];
    var qw = tsr[7];

    // scale and rotate
    var x = vec[0] * scale;
    var y = vec[1] * scale;
    var z = vec[2] * scale;

    // quat * vec
    var ix = qw * x + qy * z - qz * y;
    var iy = qw * y + qz * x - qx * z;
    var iz = qw * z + qx * y - qy * x;
    var iw = -qx * x - qy * y - qz * z;

    // tsr + quat * vec * inverse quat
    dest[0] = tsr[0] + ix * qw + iw * -qx + iy * -qz - iz * -qy;
    dest[1] = tsr[1] + iy * qw + iw * -qy + iz * -qx - ix * -qz;
    dest[2] = tsr[2] + iz * qw + iw * -qz + ix * -qy - iy * -qx;
    dest[3] = tsr[3];
    dest[4] = tsr[4];
    dest[5] = tsr[5];
    dest[6] = tsr[6];
    dest[7] = tsr[7];

    return dest;
}

exports.interpolate = function(tsr, tsr2, factor, dest) {
    // linear
    var trans = tsr.subarray(0, 3);
    var trans2 = tsr2.subarray(0, 3);
    var trans_dst = dest.subarray(0, 3);
    m_vec3.lerp(trans, trans2, factor, trans_dst);

    // linear
    var scale = tsr[3];
    var scale2 = tsr2[3];
    dest[3] = scale + factor * (scale2 - scale);

    // spherical
    var quat = tsr.subarray(4, 8);
    var quat2 = tsr2.subarray(4, 8);
    var quat_dst = dest.subarray(4, 8);
    m_quat.slerp(quat, quat2, factor, quat_dst);

    return dest;
}

/**
 * Lineary extrapolate two TSR vectors by given factor.
 * Yextr = Y1 + (Y1 - Y0) * factor = Y1 * (factor + 1) - Y0 * factor
 * NOTE: unused, untested, incomplete
 */
exports.extrapolate = function(tsr, tsr2, factor, dest) {
    // linear
    var trans = tsr.subarray(0, 3);
    var trans2 = tsr2.subarray(0, 3);
    var trans_dst = dest.subarray(0, 3);

    trans_dst[0] = trans2[0]*(factor + 1) - trans[0] * factor;
    trans_dst[1] = trans2[1]*(factor + 1) - trans[1] * factor;
    trans_dst[2] = trans2[2]*(factor + 1) - trans[2] * factor;

    // linear
    var scale = tsr[3];
    var scale2 = tsr2[3];
    dest[3] = scale2*(factor + 1) - scale * factor;

    // NOTE: currently use linear interpolation and normalization
    var quat = tsr.subarray(4, 8);
    var quat2 = tsr2.subarray(4, 8);
    var quat_dst = dest.subarray(4, 8);

    // NOTE: expect issues with opposed quats
    quat_dst[0] = quat2[0]*(factor + 1) - quat[0] * factor;
    quat_dst[1] = quat2[1]*(factor + 1) - quat[1] * factor;
    quat_dst[2] = quat2[2]*(factor + 1) - quat[2] * factor;
    quat_dst[3] = quat2[3]*(factor + 1) - quat[3] * factor;
    m_quat.normalize(quat_dst, quat_dst);

    return dest;
}

exports.integrate = function(tsr, time, linvel, angvel, dest) {
    dest[0] = tsr[0] + time * linvel[0];
    dest[1] = tsr[1] + time * linvel[1];
    dest[2] = tsr[2] + time * linvel[2];

    dest[3] = tsr[3];

    tsr_quat_deriv_angvel(tsr, angvel, dest);

    dest[4] = tsr[4] + dest[4] * time;
    dest[5] = tsr[5] + dest[5] * time;
    dest[6] = tsr[6] + dest[6] * time;
    dest[7] = tsr[7] + dest[7] * time;
    tsr_quat_normalize(dest, dest);
}

/**
 * Calculate quaternion derivation dQ/dt = 0.5*W*Q
 */
function tsr_quat_deriv_angvel(tsr, angvel, dest) {
    var wx = angvel[0];
    var wy = angvel[1];
    var wz = angvel[2];

    var qx = tsr[4];
    var qy = tsr[5];
    var qz = tsr[6];
    var qw = tsr[7];

    // basic multiplication, than scale
    dest[4] = 0.5*( wx*qw + wy*qz - wz*qy);
    dest[5] = 0.5*( wy*qw + wz*qx - wx*qz);
    dest[6] = 0.5*( wz*qw + wx*qy - wy*qx);
    dest[7] = 0.5*(-wx*qx - wy*qy - wz*qz);
}

function tsr_quat_normalize(tsr, dest) {
    var x = tsr[4];
    var y = tsr[5];
    var z = tsr[6];
    var w = tsr[7];

    var len = x*x + y*y + z*z + w*w;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
        dest[4] = tsr[4] * len;
        dest[5] = tsr[5] * len;
        dest[6] = tsr[6] * len;
        dest[7] = tsr[7] * len;
    }
}

exports.to_zup_view = function(tsr, dest) {
    dest[0] = tsr[0];
    dest[1] = tsr[1];
    dest[2] = tsr[2];

    dest[3] = tsr[3];

    // rotation around global X-axis
    // sin/cos -PI/4 for -PI/2 rotation
    var ax = tsr[4], ay = tsr[5], az = tsr[6], aw = tsr[7];
    var bx = ZUP_SIN, bw = ZUP_COS;

    dest[4] = ax * bw + aw * bx;
    dest[5] = ay * bw + az * bx;
    dest[6] = az * bw - ay * bx;
    dest[7] = aw * bw - ax * bx;
}

exports.to_zup_model = function(tsr, dest) {
    //location
    dest[0] = tsr[0];
    dest[1] = -tsr[2];
    dest[2] = tsr[1];
    //scale
    dest[3] = tsr[3];
    //rot quaternion
    dest[4] = tsr[4];
    dest[5] = -tsr[6];
    dest[6] = tsr[5];
    dest[7] = tsr[7];
}

}
