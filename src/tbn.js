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
 * TBN internal API.
 * @name tbn
 * @namespace
 * @exports exports as tbn
 */
b4w.module["__tbn"] = function(exports, require) {

// offset > 2/65535 to prevent zeroes when converting to short
var ZERO_TBN_EPSILON = 0.000031;
var TBN_NUM_COMP = 4;
var INIT_ANGLE = 0.5;

exports.TBN_NUM_COMP = TBN_NUM_COMP;

var m_quat = require("__quat");
var m_tsr  = require("__tsr");
var m_vec3 = require("__vec3");
var m_vec4 = require("__vec4");
var m_util = require("__util");

var _quat_tmp = m_quat.create();
var _quat_tmp2 = m_quat.create();
var _vec3_tmp = m_vec3.create();
var _vec3_tmp2 = m_vec3.create();
var _vec3_tmp3 = m_vec3.create();
var _vec4_tmp = m_vec4.create();
var _vec4_tmp2 = m_vec4.create();

exports.from_norm_tan = function(normals, tangents, dest) {
    var use_tangent = !!(tangents && tangents.length);
    var count = normals.length / 3;
    dest = dest || create(count);

    for (var i = 0; i < count; ++i) {
        var norm = _vec3_tmp;
        norm[0] = normals[3 * i];
        norm[1] = normals[3 * i + 1];
        norm[2] = normals[3 * i + 2];
        m_vec3.normalize(norm, norm);

        if (use_tangent) {
            var tan = _vec4_tmp2;
            tan[0] = tangents[TBN_NUM_COMP * i];
            tan[1] = tangents[TBN_NUM_COMP * i + 1];
            tan[2] = tangents[TBN_NUM_COMP * i + 2];
            tan[3] = tangents[TBN_NUM_COMP * i + 3];
            m_vec3.normalize(tan, tan);

            var binorm = m_vec3.cross(tan, norm, _vec3_tmp2);
            m_vec3.normalize(binorm, binorm);

            var binorm_quat = m_quat.rotationTo(m_util.AXIS_Z, binorm, _quat_tmp);
            var new_y = m_vec3.transformQuat(m_util.AXIS_Y, binorm_quat, _vec3_tmp3);
            var norm_quat = m_quat.rotationTo(new_y, norm, _quat_tmp2);
            var quat = m_quat.multiply(norm_quat, binorm_quat, _quat_tmp);

            m_quat.normalize(quat, quat);

            var angle = INIT_ANGLE;
            var new_tan = m_vec3.cross(norm, binorm, _vec3_tmp3);
            if (Math.abs(new_tan[0] - tan[0]) > ZERO_TBN_EPSILON ||
                    Math.abs(new_tan[1] - tan[1]) > ZERO_TBN_EPSILON ||
                    Math.abs(new_tan[2] - tan[2]) > ZERO_TBN_EPSILON)
                // angle is in [0.0, 1.0], [0.0, 1.0] ~ [0, Pi]
                angle = Math.acos(m_vec3.dot(norm, tan)) / Math.PI;

            set_quat(dest, quat, i);
            set_handedness(dest, m_util.sign(tan[3]), i);
            set_angle(dest, angle, i);
        } else {
            var quat = m_quat.rotationTo(m_util.AXIS_Y, norm, _quat_tmp);
            set_quat(dest, quat, i);
        }
    }
    return dest;
}

exports.copy = function(src_tbn, src_offset, src_length, dest_tbn) {
    if (src_length === 0)
        return;

    src_offset = 4 * src_offset || 0;
    src_length = src_length || src_tbn.length;

    for (var i = 0, j = 0; i < 4 * src_length; i += 4, j += 4) {
        dest_tbn[j] = src_tbn[src_offset + i];
        dest_tbn[j + 1] = src_tbn[src_offset + i + 1];
        dest_tbn[j + 2] = src_tbn[src_offset + i + 2];
        dest_tbn[j + 3] = src_tbn[src_offset + i + 3];
    }
}

exports.get_quat = get_quat;
function get_quat(tbn, index, dest) {
    index = index || 0;

    var cur_tbn = get_item(tbn, index, dest);
    m_quat.normalize(cur_tbn, dest);

    return dest;
}

exports.set_quat = set_quat;
function set_quat(tbn, quat, index) {
    index = index || 0;

    var cur_tbn = get_item(tbn, index, _vec4_tmp);

    var angle = m_quat.length(cur_tbn);

    var is_changed_hand = m_util.sign(cur_tbn[3]) * m_util.sign(quat[3]) || 1.0;
    m_quat.scale(quat, is_changed_hand * angle, cur_tbn);

    // NOTE: fixes +/- issues with zeroes
    if (Math.abs(cur_tbn[3]) < ZERO_TBN_EPSILON)
        if (cur_tbn[3] > 0)
            cur_tbn[3] = ZERO_TBN_EPSILON;
        else
            cur_tbn[3] = -ZERO_TBN_EPSILON;

    set_item(tbn, cur_tbn, index);
    return tbn;
}

function get_handedness(tbn, index) {
    index = index || 0;

    return m_util.sign(tbn[index * 4 + 3]);
}

function set_handedness(tbn, handedness, index) {
    index = index || 0;

    var cur_tbn = get_item(tbn, index, _vec4_tmp);
    var is_changed_hand = m_util.sign(cur_tbn[3]) * handedness;
    if (is_changed_hand < 0)
        m_quat.scale(cur_tbn, -1, cur_tbn);

    set_item(tbn, cur_tbn, index);
    return tbn;
}

function set_angle(tbn, angle, index) {
    index = index || 0;

    var cur_tbn = get_item(tbn, index, _vec4_tmp);
    m_quat.normalize(cur_tbn, cur_tbn);
    m_quat.scale(cur_tbn, angle, cur_tbn);

    // NOTE: fixes +/- issues with zeroes
    if (Math.abs(cur_tbn[3]) < ZERO_TBN_EPSILON)
        if (cur_tbn[3] > 0)
            cur_tbn[3] += ZERO_TBN_EPSILON;
        else
            cur_tbn[3] -= ZERO_TBN_EPSILON;

    set_item(tbn, cur_tbn, index);
    return tbn;
}

function get_angle(tbn, index) {
    index = index || 0;

    var cur_tbn = get_item(tbn, index, _vec4_tmp);

    return m_quat.length(cur_tbn);
}

exports.get_norm = function(tbn, index, dest) {
    var quat = get_quat(tbn, index, _quat_tmp);
    return m_vec3.transformQuat(m_util.AXIS_Y, quat, dest);
}

exports.create = create;
function create(count) {
    count = count !== 0 ? count || 1: 0;

    var tbn = new Float32Array(4 * count);

    for (var i = 0; i < count; i++)
        tbn[4 * i + 3] = INIT_ANGLE;

    return tbn;
}

exports.identity = identity;
function identity(tbn) {
    for (var i = 0; i < tbn.length; i += 4) {
        tbn[i] = 0.0;
        tbn[i + 1] = 0.0;
        tbn[i + 2] = 0.0;
        tbn[i + 3] = INIT_ANGLE;
    }

    return tbn;
}

exports.get_item = get_item;
function get_item(tbn, index, dest) {
    dest[0] = tbn[4 * index];
    dest[1] = tbn[4 * index + 1];
    dest[2] = tbn[4 * index + 2];
    dest[3] = tbn[4 * index + 3];

    return dest;
}

exports.set_item = set_item;
function set_item(tbn, item, index) {
    tbn[4 * index] = item[0];
    tbn[4 * index + 1] = item[1];
    tbn[4 * index + 2] = item[2];
    tbn[4 * index + 3] = item[3];

    return tbn;
}

exports.get_items_count = get_items_count;
function get_items_count(tbn) {
    return tbn.length / 4;
}

exports.multiply_quat = multiply_quat;
function multiply_quat(tbn, quat, dest) {
    var length = get_items_count(tbn);

    for (var i = 0; i < length; i++) {
        var handedness = get_handedness(tbn, i);
        var angle = get_angle(tbn, i);
        var cur_quat = get_quat(tbn, i, _quat_tmp2);

        var res_quat = m_quat.multiply(quat, cur_quat, _quat_tmp2);

        set_quat(dest, res_quat, i);
        set_angle(dest, angle, i);
        set_handedness(dest, handedness, i);
    }
}

exports.multiply_tsr = function(tbn, tsr, dest) {
    var quat = m_tsr.get_quat(tsr, _quat_tmp);

    return multiply_quat(tbn, quat, dest);
}

exports.slerp = function(tbn1, tbn2, value, dest) {
    var handedness = get_handedness(tbn2, 0);

    var quat1 = get_quat(tbn1, 0, _quat_tmp);
    var quat2 = get_quat(tbn2, 0, _quat_tmp2);
    var angle1 = get_angle(tbn1);
    var angle2 = get_angle(tbn2);

    var r_quat = m_quat.slerp(quat1, quat2, value, _quat_tmp2);

    m_quat.normalize(r_quat, r_quat);

    set_quat(dest, r_quat, 0);
    set_angle(dest, value * (angle1 - angle2) + angle2);
    set_handedness(dest, handedness, 0);

    return dest;
}

exports.multiply_tbn = function(tbn1, tbn2, dest) {
    var handedness = get_handedness(tbn2, 0);
    var quat1 = get_quat(tbn1, 0, _quat_tmp);
    var quat2 = get_quat(tbn2, 0, _quat_tmp2);
    var angle1 = get_angle(tbn1, 0);
    var angle2 = get_angle(tbn2, 0);

    var r_quat = m_quat.multiply(quat1, quat2, _quat_tmp);

    set_quat(dest, r_quat, 0);
    set_angle(dest, angle1 + angle2 - INIT_ANGLE);
    set_handedness(dest, handedness, 0);
    return dest;
}

exports.multiply_tbn_inv = function(tbn1, tbn2, dest) {
    var handedness = get_handedness(tbn2, 0);
    var quat1 = get_quat(tbn1, 0, _quat_tmp);
    var quat2 = get_quat(tbn2, 0, _quat_tmp2);
    var angle1 = get_angle(tbn1);
    var angle2 = get_angle(tbn2);

    var inv_quat2 = m_quat.invert(quat2, _quat_tmp2);
    var r_quat = m_quat.multiply(quat1, inv_quat2, _quat_tmp);

    set_quat(dest, r_quat, 0);
    set_angle(dest, angle1 - angle2 + INIT_ANGLE);
    set_handedness(dest, handedness, 0);
    return dest;
}

}
