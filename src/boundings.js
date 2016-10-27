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
 * Bounding internal API.
 * @name boundings
 * @namespace
 * @exports exports as boundings
 */
b4w.module["__boundings"] = function(exports, require) {

var m_tsr  = require("__tsr");
var m_util = require("__util");
var m_vec3 = require("__vec3");
var m_math = require("__math");
var m_mat3 = require("__mat3");

var _bb_corners_cache = new Float32Array(3 * 8);
var _vec3_tmp = new Float32Array(3);
var _vec3_tmp2 = new Float32Array(3);
var _vec3_tmp3 = new Float32Array(3);
var _vec3_tmp4 = new Float32Array(3);

var _mat3_tmp = new Float32Array(9);
var _mat3_tmp2 = new Float32Array(9);
var _mat3_tmp3 = new Float32Array(9);
var _mat3_tmp4 = new Float32Array(9);

var ELL_EPS = 0.000000001;
var MATRIX_PRES = 0.0005;
var MIN_SEMIAXIS_LEN = 0.00000001;

/**
 * Create a new bounding box with zero volume.
 * improper use may lead to ugly bugs.
 */
exports.create_bb = create_bb;
function create_bb(dest) {
    var bb = {
        max_x: 0,
        min_x: 0,
        max_y: 0,
        min_y: 0,
        max_z: 0,
        min_z: 0
    };

    return bb;
}

exports.create_rot_bb = create_rot_bb;
function create_rot_bb() {
    var rot_bb = {
        center : new Float32Array(3),
        axis_x : new Float32Array(3),
        axis_y : new Float32Array(3),
        axis_z : new Float32Array(3)
    };

    return rot_bb;
}

exports.copy_bb = copy_bb;
function copy_bb(bb_from, bb_to) {
    bb_to.min_x = bb_from.min_x;
    bb_to.max_x = bb_from.max_x;
    bb_to.min_y = bb_from.min_y;
    bb_to.max_y = bb_from.max_y;
    bb_to.min_z = bb_from.min_z;
    bb_to.max_z = bb_from.max_z;
    return bb_to;
}

/**
 * NOTE: definitely not the best style of programming
 */
exports.big_bounding_box = function() {
    return {
        max_x: 1e12,
        min_x:-1e12,
        max_y: 1e12,
        min_y:-1e12,
        max_z: 1e12,
        min_z:-1e12
    };
}

exports.zero_bounding_box = function(dest) {
    dest.max_x = 0;
    dest.min_x = 0;
    dest.max_y = 0;
    dest.min_y = 0;
    dest.max_z = 0;
    dest.min_z = 0;
    return dest;
}

exports.clone_bb = function(bb) {
    var bb_new = create_bb();
    copy_bb(bb, bb_new);
    return bb_new;
}

/**
 * Finds the smallest side of the bounding box
 */
exports.calc_min_bb_side = function(bb) {

    var min = bb.max_x - bb.min_x;

    var y_size = bb.max_y - bb.min_y;
    if (y_size < min)
        min = y_size;

    var z_size = bb.max_z - bb.min_z;
    if (z_size < min)
        min = z_size;

    return min;
}

/**
 * bb - bounding box to expand
 * bb_exp - expanding bounding box
 */
exports.expand_bounding_box = function(bb, bb_exp) {

    var max_x = bb.max_x;
    var max_y = bb.max_y;
    var max_z = bb.max_z;
    var min_x = bb.min_x;
    var min_y = bb.min_y;
    var min_z = bb.min_z;

    bb.max_x = Math.max(bb_exp.max_x, max_x);
    bb.max_y = Math.max(bb_exp.max_y, max_y);
    bb.max_z = Math.max(bb_exp.max_z, max_z);
    bb.min_x = Math.min(bb_exp.min_x, min_x);
    bb.min_y = Math.min(bb_exp.min_y, min_y);
    bb.min_z = Math.min(bb_exp.min_z, min_z);

    return bb;
}

exports.bb_from_coords = bb_from_coords;
/**
 * Create bounding box embracing given set of coords
 * @methodOf boundings
 * @param coords Flat array of coords
 * @param bb Destination bounding box
 */
function bb_from_coords(coords, bb) {

    var max_x = coords[0];
    var max_y = coords[1];
    var max_z = coords[2];
    var min_x = coords[0];
    var min_y = coords[1];
    var min_z = coords[2];

    for (var i = 3; i < coords.length; i+=3) {
        var x = coords[i];
        var y = coords[i+1];
        var z = coords[i+2];

        max_x = Math.max(max_x, x);
        max_y = Math.max(max_y, y);
        max_z = Math.max(max_z, z);

        min_x = Math.min(min_x, x);
        min_y = Math.min(min_y, y);
        min_z = Math.min(min_z, z);
    }

    bb.max_x = max_x;
    bb.max_y = max_y;
    bb.max_z = max_z;
    bb.min_x = min_x;
    bb.min_y = min_y;
    bb.min_z = min_z;

    return bb;
}

/**
 * Translate shadow object bounding box corners to shadow scene view space
 */
exports.bounding_box_transform = function(bb, tsr, bb_new) {

    if (!bb_new)
        var bb_new = create_bb();

    var bb_corners = extract_bb_corners(bb, _bb_corners_cache);

    m_tsr.transform_vectors(bb_corners, tsr, bb_corners);

    return bb_from_coords(bb_corners, bb_new);
}
/**
 * Extract 8 corner coords from bounding box
 */
exports.extract_bb_corners = extract_bb_corners;
function extract_bb_corners(bb, dest) {

    if (!dest)
        dest = new Float32Array(3 * 8);

    var max_x = bb.max_x;
    var max_y = bb.max_y;
    var max_z = bb.max_z;
    var min_x = bb.min_x;
    var min_y = bb.min_y;
    var min_z = bb.min_z;

    // ugly but fast
    dest[0] = min_x; dest[1] = min_y; dest[2] = min_z;
    dest[3] = max_x; dest[4] = min_y; dest[5] = min_z;
    dest[6] = max_x; dest[7] = max_y; dest[8] = min_z;
    dest[9] = min_x; dest[10]= max_y; dest[11]= min_z;
    dest[12]= min_x; dest[13]= min_y; dest[14]= max_z;
    dest[15]= max_x; dest[16]= min_y; dest[17]= max_z;
    dest[18]= max_x; dest[19]= max_y; dest[20]= max_z;
    dest[21]= min_x; dest[22]= max_y; dest[23]= max_z;

    return dest;
}


/**
 * NOTE: unused
 * Shrink given bounding box by another
 * return very small bounding box if shrink contstraints do not affect it
 */
exports.shrink_bounding_box = function(bb, bb_shrink, bb_new) {
    if (!bb_new)
        bb_new = create_bb();

    var s_min_x = bb_shrink.min_x;
    var s_max_x = bb_shrink.max_x;
    var s_min_y = bb_shrink.min_y;
    var s_max_y = bb_shrink.max_y;
    var s_min_z = bb_shrink.min_z;
    var s_max_z = bb_shrink.max_z;

    if (s_min_x >= bb.max_x || s_max_x <= bb.min_x ||
            s_min_y >= bb.max_y || s_max_y <= bb.min_y ||
            s_min_z >= bb.max_z || s_max_z <= bb.min_z) {

        // NOTE: do not shrink to zero for proper projection construction
        bb_new.min_x = -0.1;
        bb_new.max_x = 0.1;

        bb_new.min_y = -0.1;
        bb_new.max_y = 0.1;

        bb_new.min_z = -0.2;
        bb_new.max_z = -0.1;

        return bb_new;
    }

    bb_new.min_x = Math.max(bb.min_x, s_min_x);
    bb_new.max_x = Math.min(bb.max_x, s_max_x);

    bb_new.min_y = Math.max(bb.min_y, s_min_y);
    bb_new.max_y = Math.min(bb.max_y, s_max_y);

    bb_new.min_z = Math.max(bb.min_z, s_min_z);
    bb_new.max_z = Math.min(bb.max_z, s_max_z);

    return bb_new;
}

/**
 * Stretch bounding box by factor
 */
exports.stretch_bounding_box = function(bb, factor, bb_new) {
    if (!bb_new)
        bb_new = create_bb();

    var size_x = bb.max_x - bb.min_x;
    var size_y = bb.max_y - bb.min_y;
    var size_z = bb.max_z - bb.min_z;

    bb_new.min_x = bb.min_x - 0.5 * (factor - 1) * size_x;
    bb_new.max_x = bb.max_x + 0.5 * (factor - 1) * size_x;

    bb_new.min_y = bb.min_y - 0.5 * (factor - 1) * size_y;
    bb_new.max_y = bb.max_y + 0.5 * (factor - 1) * size_y;

    bb_new.min_z = bb.min_z - 0.5 * (factor - 1) * size_z;
    bb_new.max_z = bb.max_z + 0.5 * (factor - 1) * size_z;

    return bb_new;
}


exports.bounding_sphere_transform = function(bs, tsr, bs_new) {

    if (!bs_new)
        bs_new = create_bs();

    m_tsr.transform_vec3(bs.center, tsr, bs_new.center);
    bs_new.radius = bs.radius * m_tsr.get_scale(tsr);

    return bs_new;
}

exports.bounding_ellipsoid_transform = function(be, tsr, be_new) {

    if (!be_new)
        be_new = create_be();

    m_tsr.transform_vec3(be.center, tsr, be_new.center)

    m_vec3.copy(be.axis_x, be_new.axis_x);
    m_vec3.copy(be.axis_y, be_new.axis_y);
    m_vec3.copy(be.axis_z, be_new.axis_z);

    m_tsr.transform_dir_vec3(be_new.axis_x, tsr, be_new.axis_x);
    m_tsr.transform_dir_vec3(be_new.axis_y, tsr, be_new.axis_y);
    m_tsr.transform_dir_vec3(be_new.axis_z, tsr, be_new.axis_z);

    return be_new;
}

exports.bounding_rot_box_transform = function(bb, tsr, bb_new) {
    if (!bb_new)
        bb_new = create_rot_bb();

    m_tsr.transform_vec3(bb.center, tsr, bb_new.center);

    m_vec3.copy(bb.axis_x, bb_new.axis_x);
    m_vec3.copy(bb.axis_y, bb_new.axis_y);
    m_vec3.copy(bb.axis_z, bb_new.axis_z);

    m_tsr.transform_dir_vec3(bb_new.axis_x, tsr, bb_new.axis_x);
    m_tsr.transform_dir_vec3(bb_new.axis_y, tsr, bb_new.axis_y);
    m_tsr.transform_dir_vec3(bb_new.axis_z, tsr, bb_new.axis_z);

    return bb_new;
}

exports.bs_from_values = function(radius, center) {
    var bs = create_bs();
    m_vec3.copy(center, bs.center);
    bs.radius = radius;
    return bs;
}

exports.rot_bb_from_values = function(bbrcen, axis_x, axis_y, axis_z, bbrscale) {
    var bb = create_rot_bb();

    m_vec3.copy(bbrcen, bb.center);
    m_vec3.copy(axis_x, bb.axis_x);
    m_vec3.copy(axis_y, bb.axis_y);
    m_vec3.copy(axis_z, bb.axis_z);
    m_vec3.scale(bb.axis_x, bbrscale[0], bb.axis_x);
    m_vec3.scale(bb.axis_y, bbrscale[1], bb.axis_y);
    m_vec3.scale(bb.axis_z, bbrscale[2], bb.axis_z);

    return bb;
}

/**
 * Create bounding sphere with zero volume.
 * improper use may lead to ugly bugs
 */
exports.create_bs = create_bs;
function create_bs() {
    return {
        center: new Float32Array(3),
        radius: 0
    };
}

exports.copy_bs = copy_bs;
function copy_bs(bs_from, bs_to) {
    bs_to.center[0] = bs_from.center[0];
    bs_to.center[1] = bs_from.center[1];
    bs_to.center[2] = bs_from.center[2];
    bs_to.radius = bs_from.radius;
}

/**
 * Create bounding ellipsoid with zero volume.
 */
exports.create_be = create_be;
function create_be() {
    return {
        axis_x: new Float32Array(3),
        axis_y: new Float32Array(3),
        axis_z: new Float32Array(3),
        center: new Float32Array(3)
    };
}

exports.copy_be = copy_be;
function copy_be(be, be_new) {
    m_vec3.copy(be.axis_x, be_new.axis_x);
    m_vec3.copy(be.axis_y, be_new.axis_y);
    m_vec3.copy(be.axis_z, be_new.axis_z);
    m_vec3.copy(be.center, be_new.center);
    return be_new;
}

exports.clone_be = clone_be;
function clone_be(be) {
    var be_new = create_be();
    copy_be(be, be_new);
    return be_new;
}

exports.clone_bs = clone_bs;
function clone_bs(bs) {
    var bs_new = create_bs();
    copy_bs(bs, bs_new);
    return bs_new;
}

exports.be_from_values = be_from_values;
function be_from_values(axis_x, axis_y, axis_z, center) {
    return {
        axis_x: new Float32Array(axis_x),
        axis_y: new Float32Array(axis_y),
        axis_z: new Float32Array(axis_z),
        center: new Float32Array([center[0], center[1], center[2]])
    };
}

/**
 * NOTE: definitely not the best style of programming
 */
exports.big_bounding_sphere = function(dest) {
    if (!dest)
        dest = create_bs();
    m_vec3.set(0, 0, 0, dest.center);
    dest.radius = 1e12;
    return dest;
}

exports.expand_bounding_sphere = function(bs, bs_exp) {
    // GARBAGE

    // vector between 2 centers
    var v = m_vec3.subtract(bs_exp.center, bs.center, m_vec3.create());

    // set explicit direction for concentric spheres
    if (m_vec3.length(v) == 0)
        m_vec3.set(1, 0, 0, v);

    var vn = m_vec3.normalize(v, m_vec3.create());

    // positive/negative extends
    var e1p = m_vec3.scale(vn, bs.radius, m_vec3.create());
    m_vec3.add(e1p, bs.center, e1p);

    var e1n = m_vec3.scale(vn, -bs.radius, m_vec3.create());
    m_vec3.add(e1n, bs.center, e1n);

    var e2p = m_vec3.scale(vn, bs_exp.radius, m_vec3.create());
    m_vec3.add(e2p, bs_exp.center, e2p);

    var e2n = m_vec3.scale(vn, -bs_exp.radius, m_vec3.create());
    m_vec3.add(e2n, bs_exp.center, e2n);

    var min_max = find_min_max_extent([e1p, e1n, e2p, e2n], vn);

    var min = min_max[0];
    var max = min_max[1];

    bs.center = m_vec3.scale(m_vec3.add(min, max, m_vec3.create()), 0.5,
            m_vec3.create());
    bs.radius = m_vec3.length(m_vec3.subtract(max, min, m_vec3.create())) / 2;
}

exports.extract_rot_bb_corners = function(bbr, corners) {

    m_vec3.add(bbr.center, bbr.axis_y, _vec3_tmp);
    m_vec3.add(_vec3_tmp, bbr.axis_x, _vec3_tmp);
    m_vec3.add(_vec3_tmp, bbr.axis_z, _vec3_tmp);
    corners.push(_vec3_tmp[0], _vec3_tmp[1], _vec3_tmp[2]);

    m_vec3.add(bbr.center, bbr.axis_y, _vec3_tmp);
    m_vec3.add(_vec3_tmp, bbr.axis_x, _vec3_tmp);
    m_vec3.subtract(_vec3_tmp, bbr.axis_z, _vec3_tmp);
    corners.push(_vec3_tmp[0], _vec3_tmp[1], _vec3_tmp[2]);

    m_vec3.add(bbr.center, bbr.axis_y, _vec3_tmp);
    m_vec3.subtract(_vec3_tmp, bbr.axis_x, _vec3_tmp);
    m_vec3.add(_vec3_tmp, bbr.axis_z, _vec3_tmp);
    corners.push(_vec3_tmp[0], _vec3_tmp[1], _vec3_tmp[2]);

    m_vec3.add(bbr.center, bbr.axis_y, _vec3_tmp);
    m_vec3.subtract(_vec3_tmp, bbr.axis_x, _vec3_tmp);
    m_vec3.subtract(_vec3_tmp, bbr.axis_z, _vec3_tmp);
    corners.push(_vec3_tmp[0], _vec3_tmp[1], _vec3_tmp[2]);

    m_vec3.subtract(bbr.center, bbr.axis_y, _vec3_tmp);
    m_vec3.add(_vec3_tmp, bbr.axis_x, _vec3_tmp);
    m_vec3.add(_vec3_tmp, bbr.axis_z, _vec3_tmp);
    corners.push(_vec3_tmp[0], _vec3_tmp[1], _vec3_tmp[2]);

    m_vec3.subtract(bbr.center, bbr.axis_y, _vec3_tmp);
    m_vec3.add(_vec3_tmp, bbr.axis_x, _vec3_tmp);
    m_vec3.subtract(_vec3_tmp, bbr.axis_z, _vec3_tmp);
    corners.push(_vec3_tmp[0], _vec3_tmp[1], _vec3_tmp[2]);

    m_vec3.subtract(bbr.center, bbr.axis_y, _vec3_tmp);
    m_vec3.subtract(_vec3_tmp, bbr.axis_x, _vec3_tmp);
    m_vec3.add(_vec3_tmp, bbr.axis_z, _vec3_tmp);
    corners.push(_vec3_tmp[0], _vec3_tmp[1], _vec3_tmp[2]);

    m_vec3.subtract(bbr.center, bbr.axis_y, _vec3_tmp);
    m_vec3.subtract(_vec3_tmp, bbr.axis_x, _vec3_tmp);
    m_vec3.subtract(_vec3_tmp, bbr.axis_z, _vec3_tmp);
    corners.push(_vec3_tmp[0], _vec3_tmp[1], _vec3_tmp[2]);
}

/**
 * see Lengyel E. - Mathematics for 3D Game Programming and Computer Graphics,
 * Third Edition. Chapter 8.1.4 Bounding Ellipsoid Construction
 **/
exports.create_be_by_bb = create_be_by_bb;
function create_be_by_bb(points, use_rotation) {

    var center = m_math.calk_average_position(points, _vec3_tmp4);
    if (use_rotation)
        var cov_matrix = m_math.calc_covariance_matrix(points, center, _mat3_tmp2);
    else
        var cov_matrix = m_mat3.identity(_mat3_tmp2);

    var t_mat = m_math.find_eigenvectors(cov_matrix, MATRIX_PRES, _mat3_tmp);

    m_vec3.copy(points, _vec3_tmp);
    m_vec3.transformMat3(_vec3_tmp, t_mat, _vec3_tmp);

    var max_dot_x = _vec3_tmp[0];
    var min_dot_x = max_dot_x;
    var max_dot_y = _vec3_tmp[1];
    var min_dot_y = max_dot_y;
    var max_dot_z = _vec3_tmp[2];
    var min_dot_z = max_dot_z;

    var max_x = 0;
    var min_x = 0;
    var max_y = 0;
    var min_y = 0;
    var max_z = 0;
    var min_z = 0;

    for (var i = 3; i < points.length; i = i + 3) {

        _vec3_tmp[0] = points[i];
        _vec3_tmp[1] = points[i + 1];
        _vec3_tmp[2] = points[i + 2];

        m_vec3.transformMat3(_vec3_tmp, t_mat, _vec3_tmp);

        var dot_x = _vec3_tmp[0];
        var dot_y = _vec3_tmp[1];
        var dot_z = _vec3_tmp[2];

        if (dot_x > max_dot_x)
            max_dot_x = dot_x;
        if (dot_x < min_dot_x)
            min_dot_x = dot_x;
        if (dot_y > max_dot_y)
            max_dot_y = dot_y;
        if (dot_y < min_dot_y)
            min_dot_y = dot_y;
        if (dot_z > max_dot_z)
            max_dot_z = dot_z;
        if (dot_z < min_dot_z)
            min_dot_z = dot_z;
    }

    var a = max_dot_x - min_dot_x;
    var b = max_dot_y - min_dot_y;
    var c = max_dot_z - min_dot_z;

    a = Math.max(a, ELL_EPS);
    b = Math.max(b, ELL_EPS);
    c = Math.max(c, ELL_EPS);

    var scale_mat = m_mat3.identity(_mat3_tmp2);
    scale_mat[0] = a != 0.0 ? 1 / a : 1 / MIN_SEMIAXIS_LEN;
    scale_mat[4] = b != 0.0 ? 1 / b : 1 / MIN_SEMIAXIS_LEN;
    scale_mat[8] = c != 0.0 ? 1 / c : 1 / MIN_SEMIAXIS_LEN;
    m_mat3.transpose(t_mat, _mat3_tmp3);
    // transform vertex set into cube

    _vec3_tmp[0] = points[0];
    _vec3_tmp[1] = points[1];
    _vec3_tmp[2] = points[2];

    m_vec3.transformMat3(_vec3_tmp, t_mat, _vec3_tmp);
    m_vec3.transformMat3(_vec3_tmp, scale_mat, _vec3_tmp);
    m_vec3.transformMat3(_vec3_tmp, _mat3_tmp3, _vec3_tmp);

    var max_x = _vec3_tmp[0], min_x = _vec3_tmp[0];
    var max_y = _vec3_tmp[1], min_y = _vec3_tmp[1];
    var max_z = _vec3_tmp[2], min_z = _vec3_tmp[2];

    for (var i = 3; i < points.length; i = i + 3) {
        _vec3_tmp[0] = points[i];
        _vec3_tmp[1] = points[i + 1];
        _vec3_tmp[2] = points[i + 2];
        m_vec3.transformMat3(_vec3_tmp, t_mat, _vec3_tmp);
        m_vec3.transformMat3(_vec3_tmp, scale_mat, _vec3_tmp);
        m_vec3.transformMat3(_vec3_tmp, _mat3_tmp3, _vec3_tmp);

        max_x = Math.max(max_x, _vec3_tmp[0]);
        min_x = Math.min(min_x, _vec3_tmp[0]);

        max_y = Math.max(max_y, _vec3_tmp[1]);
        min_y = Math.min(min_y, _vec3_tmp[1]);

        max_z = Math.max(max_z, _vec3_tmp[2]);
        min_z = Math.min(min_z, _vec3_tmp[2]);
    }

    var r = Math.sqrt((max_x - min_x) * (max_x - min_x)
            + (max_y - min_y) * (max_y - min_y)
            + (max_z - min_z) * (max_z - min_z)) / 2;

    r = Math.min(r, 1.0);
    _vec3_tmp3[0] = (max_x + min_x) / 2;
    _vec3_tmp3[1] = (max_y + min_y) / 2;
    _vec3_tmp3[2] = (max_z + min_z) / 2;
    var s_center = _vec3_tmp3;

    var scale_mat = m_mat3.identity(_mat3_tmp2);
    scale_mat[0] = a;
    scale_mat[4] = b;
    scale_mat[8] = c;

    m_vec3.transformMat3(s_center, t_mat, s_center);
    m_vec3.transformMat3(s_center, scale_mat, s_center);
    m_vec3.transformMat3(s_center, _mat3_tmp3, s_center);

    var axis_x = [t_mat[0], t_mat[3], t_mat[6]];
    var axis_y = [t_mat[1], t_mat[4], t_mat[7]];
    var axis_z = [t_mat[2], t_mat[5], t_mat[8]];

    m_vec3.scale(axis_x, a * r, axis_x);
    m_vec3.scale(axis_y, b * r, axis_y);
    m_vec3.scale(axis_z, c * r, axis_z);

    return be_from_values(axis_x, axis_y, axis_z, s_center);
}

exports.create_bbr_by_be = function(be) {
    var bbr = create_rot_bb();

    m_vec3.copy(be.axis_x, bbr.axis_x);
    m_vec3.copy(be.axis_y, bbr.axis_y);
    m_vec3.copy(be.axis_z, bbr.axis_z);
    m_vec3.copy(be.center, bbr.center);

    return bbr;
}

exports.create_bs_by_be = function(be) {
    var bs = create_bs();

    var radius = 0;
    var a = m_vec3.length(be.axis_x);
    var b = m_vec3.length(be.axis_y);
    var c = m_vec3.length(be.axis_z);
    radius = a > b? a: b;
    radius = c > radius? c: radius;

    bs.center = be.center;
    bs.radius = radius;

    return bs;
}

exports.calc_be_local_by_tsr = function(be_world, world_tsr) {
    var be_local = clone_be(be_world);

    var trans = m_tsr.get_trans(world_tsr, _vec3_tmp4);
    m_vec3.subtract(be_local.center, trans, be_local.center);

    return be_local;
}

exports.is_be_optimized = function(be, bs) {
    var a = m_vec3.length(be.axis_x);
    var b = m_vec3.length(be.axis_y);
    var c = m_vec3.length(be.axis_z);
    var be_volume = a * b * c;
    var bs_volume = bs.radius * bs.radius * bs.radius;
    return 0.75 * bs_volume > be_volume;
}


/**
 * Find minimum/maximum extent in direction dir
 */
function find_min_max_extent(exts, dir) {
    var dir_n = m_vec3.normalize(dir, m_vec3.create());

    var min = exts[0];
    var max = exts[0];
    for (var i = 1; i < exts.length; i++) {
        var proj = m_vec3.dot(exts[i], dir_n);

        if (proj < m_vec3.dot(min, dir_n))
            min = exts[i];

        if (proj > m_vec3.dot(max, dir_n))
            max = exts[i];
    }

    return [min, max];
}


/**
 * Create a bounding capsule based on the given parameters.
 */
exports.bcap_from_values = function(radius, bounding_box) {

    var max_z = bounding_box.max_z;
    var min_z = bounding_box.min_z;

    var height = Math.max(0, (max_z - min_z) - 2*radius);

    var bcap_local = {
        radius: radius,
        height: height,
        center: new Float32Array([0, 0, (max_z + min_z)/2])
    };

    return bcap_local;
}

/**
 * Create a bounding cylinder based on the given parameters.
 */
exports.bcyl_from_values = function(radius, bounding_box) {

    var max_z = bounding_box.max_z;
    var min_z = bounding_box.min_z;

    var height = Math.max(0, max_z - min_z);

    var bcyl_local = {
        radius: radius,
        height: height,
        center: new Float32Array([0, 0, (max_z + min_z)/2])
    };

    return bcyl_local;
}

/**
 * Create a bounding cone based on the given parameters.
 */
exports.bcon_from_values = function(radius, bounding_box) {

    var max_z = bounding_box.max_z;
    var min_z = bounding_box.min_z;

    var height = Math.max(0, max_z - min_z);

    var bcon_local = {
        radius: radius,
        height: height,
        center: new Float32Array([0, 0, (max_z + min_z)/2])
    };

    return bcon_local;
}

/**
 * @deprecated unused
 */
exports.check_bb_intersection = function(bb1, bb2) {
    if (bb1.min_x > bb2.max_x || bb1.max_x < bb2.min_x)
        return false;
    else if (bb1.min_y > bb2.max_y || bb1.max_y < bb2.min_y)
        return false;
    else if (bb1.min_z > bb2.max_z || bb1.max_z < bb2.min_z)
        return false;
    else
        return true;
}

/**
 * Recalculate bpy mesh boundings
 */
exports.recalculate_mesh_boundings = function(mesh) {

    var max_x = 0, max_y = 0, max_z = 0, min_x = 0, min_y = 0, min_z = 0;
    var sub_max_x = 0, sub_max_y = 0, sub_max_z = 0;
    var sub_min_x = 0, sub_min_y = 0, sub_min_z = 0;
    var srad = 0;
    var crad = 0;

    // init values
    for (var i = 0; i < mesh["submeshes"].length; i++) {
        var submesh = mesh["submeshes"][i];
        if (submesh["position"].length) {
            max_x = min_x = submesh["position"][0];
            max_y = min_y = submesh["position"][1];
            max_z = min_z = submesh["position"][2];
            break;
        }
    }

    for (var i = 0; i < mesh["submeshes"].length; i++) {
        var submesh = mesh["submeshes"][i];

        var positions = submesh["position"];

        sub_max_x = sub_min_x = submesh["position"][0];
        sub_max_y = sub_min_y = submesh["position"][1];
        sub_max_z = sub_min_z = submesh["position"][2];

        for (var j = 0; j < positions.length / 3; j++) {
            var x = positions[3*j];
            var y = positions[3*j + 1];
            var z = positions[3*j + 2];

            max_x = Math.max(x, max_x);
            max_y = Math.max(y, max_y);
            max_z = Math.max(z, max_z);

            min_x = Math.min(x, min_x);
            min_y = Math.min(y, min_y);
            min_z = Math.min(z, min_z);

            sub_max_x = Math.max(x, sub_max_x);
            sub_max_y = Math.max(y, sub_max_y);
            sub_max_z = Math.max(z, sub_max_z);

            sub_min_x = Math.min(x, sub_min_x);
            sub_min_y = Math.min(y, sub_min_y);
            sub_min_z = Math.min(z, sub_min_z);

            srad = Math.max(Math.sqrt(x * x + y * y + z * z), srad);
            crad = Math.max(Math.sqrt(x * x + y * y), crad);
        }
        var sub_bb = submesh["boundings"]["bb"];
        sub_bb["max_x"] = sub_max_x;
        sub_bb["min_x"] = sub_min_x;
        sub_bb["max_y"] = sub_max_y;
        sub_bb["min_y"] = sub_min_y;
        sub_bb["max_z"] = sub_max_z;
        sub_bb["min_z"] = sub_min_z;

        var bb_points = _bb_corners_cache;

        bb_points[0] = sub_min_x; bb_points[1] = sub_min_y; bb_points[2] = sub_min_z;
        bb_points[3] = sub_max_x; bb_points[4] = sub_min_y; bb_points[5] = sub_min_z;
        bb_points[6] = sub_max_x; bb_points[7] = sub_max_y; bb_points[8] = sub_min_z;
        bb_points[9] = sub_min_x; bb_points[10]= sub_max_y; bb_points[11]= sub_min_z;
        bb_points[12]= sub_min_x; bb_points[13]= sub_min_y; bb_points[14]= sub_max_z;
        bb_points[15]= sub_max_x; bb_points[16]= sub_min_y; bb_points[17]= sub_max_z;
        bb_points[18]= sub_max_x; bb_points[19]= sub_max_y; bb_points[20]= sub_max_z;
        bb_points[21]= sub_min_x; bb_points[22]= sub_max_y; bb_points[23]= sub_max_z;

        var be_local = create_be_by_bb(bb_points, false);
        submesh["boundings"]["be_cen"] = be_local.center;
        submesh["boundings"]["be_ax"] = [be_local.axis_x[0],
                be_local.axis_y[1], be_local.axis_z[2]];
    }
    var mesh_bbox = mesh["b4w_boundings"]["bb"];
    mesh_bbox["max_x"] = max_x;
    mesh_bbox["min_x"] = min_x;
    mesh_bbox["max_y"] = max_y;
    mesh_bbox["min_y"] = min_y;
    mesh_bbox["max_z"] = max_z;
    mesh_bbox["min_z"] = min_z;

    // NOTE: original bounding box is recalculated because of modifiers is applied
    var mesh_bbox_s = mesh["b4w_boundings"]["bb_src"];
    mesh_bbox_s["max_x"] = max_x;
    mesh_bbox_s["min_x"] = min_x;
    mesh_bbox_s["max_y"] = max_y;
    mesh_bbox_s["min_y"] = min_y;
    mesh_bbox_s["max_z"] = max_z;
    mesh_bbox_s["min_z"] = min_z;

    mesh["b4w_boundings"]["bs_rad"]  = srad;
    mesh["b4w_boundings"]["bc_rad"] = crad;

    var bb_points = _bb_corners_cache;
    bb_points[0] = min_x; bb_points[1] = min_y; bb_points[2] = min_z;
    bb_points[3] = max_x; bb_points[4] = min_y; bb_points[5] = min_z;
    bb_points[6] = max_x; bb_points[7] = max_y; bb_points[8] = min_z;
    bb_points[9] = min_x; bb_points[10]= max_y; bb_points[11]= min_z;
    bb_points[12]= min_x; bb_points[13]= min_y; bb_points[14]= max_z;
    bb_points[15]= max_x; bb_points[16]= min_y; bb_points[17]= max_z;
    bb_points[18]= max_x; bb_points[19]= max_y; bb_points[20]= max_z;
    bb_points[21]= min_x; bb_points[22]= max_y; bb_points[23]= max_z;

    var be_local = create_be_by_bb(bb_points, false);
    mesh["b4w_boundings"]["be_cen"] = be_local.center;
    mesh["b4w_boundings"]["be_ax"] = [be_local.axis_x[0],
            be_local.axis_y[1], be_local.axis_z[2]];

}

/**
 * Get minimal enclosing circle (MEC) for frustum diagonal plane in 3d space
 */
exports.get_frustum_mec = function(corners) {
    // left bottom near
    var p0 = corners.subarray(0, 3);
    // right top near
    var p1 = corners.subarray(6, 9);
    // left bottom far
    var p2 = corners.subarray(12, 15);
    // right top far
    var p3 = corners.subarray(18, 21);

    // basis vector: l
    var l = m_vec3.subtract(p1, p0, _vec3_tmp);
    m_vec3.normalize(l, l);

    // basis vector: m
    var normal = m_util.get_plane_normal(p0, p1, p2, _vec3_tmp2);
    var m = m_vec3.cross(normal, l, normal);
    m_vec3.normalize(m, m);

    // transform points coordinates for new 2D Cartesian coordinate system
    // q0 - center of the new system (former p0);
    // NOTE: using gl_matrix vec3 for simplicity
    var q0 = m_vec3.create();

    var q1 = m_vec3.create();
    m_vec3.subtract(p1, p0, _vec3_tmp3);
    q1[0] = m_vec3.dot(_vec3_tmp3, l);
    q1[1] = m_vec3.dot(_vec3_tmp3, m);

    var q2 = m_vec3.create();
    m_vec3.subtract(p2, p0, _vec3_tmp3);
    q2[0] = m_vec3.dot(_vec3_tmp3, l);
    q2[1] = m_vec3.dot(_vec3_tmp3, m);

    var q3 = m_vec3.create();
    m_vec3.subtract(p3, p0, _vec3_tmp3);
    q3[0] = m_vec3.dot(_vec3_tmp3, l);
    q3[1] = m_vec3.dot(_vec3_tmp3, m);

    var bs = create_bs();
    bs = get_mec_2d([q0, q1, q2, q3], bs);

    var center_origin = m_vec3.scale(l, bs.center[0], _vec3_tmp3);
    m_vec3.scaleAndAdd(center_origin, m, bs.center[1], center_origin);
    m_vec3.add(center_origin, p0, bs.center);

    return bs;
}

/**
 * Calculate minimum enclosing circle MEC
 * E.Welzl algorithm, O(n) complexity
 * @see http://www.cs.arizona.edu/classes/cs437/fall11/Lecture4.pdf
 * @see http://www.sunshine2k.de/coding/java/Welzl/Welzl.html
 */
function get_mec_2d(points, bs) {

    bs = mec_by_2_points(bs, points[0], points[1]);

    for (var i = 2; i < points.length; i++)
        if (m_vec3.distance(bs.center, points[i]) > bs.radius)
            bs = mec_step1(bs, points, points[i], i - 1);

    return bs;
}

function mec_step1(bs, points, q, points_range) {
    bs = mec_by_2_points(bs, q, points[0]);

    for (var i = 1; i <= points_range; i++)
        if (m_vec3.distance(bs.center, points[i]) > bs.radius)
            bs = mec_step2(bs, points, q, points[i], i - 1);

    return bs;
}

function mec_step2(bs, points, q0, q1, points_range) {
    bs = mec_by_2_points(bs, q0, q1);

    for (var i = 0; i <= points_range; i++)
        if (m_vec3.distance(bs.center, points[i]) > bs.radius)
            bs = mec_by_3_points(bs, q0, q1, points[i]);

    return bs;
}

function mec_by_2_points(bs, A, B) {
    m_vec3.add(A, B, bs.center)
    m_vec3.scale(bs.center, 0.5, bs.center);

    bs.radius = m_vec3.distance(bs.center, A);
    return bs;
}

/**
 * Use circumcenter barycentric coordinates
 * @see http://mathworld.wolfram.com/BarycentricCoordinates.html
 */
function mec_by_3_points(bs, A, B, C) {
    var BC = m_vec3.subtract(B, C, _vec3_tmp3);
    var a_sq = m_vec3.squaredLength(BC);

    var AC = m_vec3.subtract(A, C, _vec3_tmp3);
    var b_sq = m_vec3.squaredLength(AC);

    var AB = m_vec3.subtract(A, B, _vec3_tmp3);
    var c_sq = m_vec3.squaredLength(AB);

    var a_coeff = a_sq * (b_sq + c_sq - a_sq);
    var b_coeff = b_sq * (c_sq + a_sq - b_sq);
    var c_coeff = c_sq * (a_sq + b_sq - c_sq);
    var sum = a_coeff + b_coeff + c_coeff;

    m_vec3.copy(A, bs.center);
    m_vec3.scale(bs.center, a_coeff / sum, bs.center);
    m_vec3.scaleAndAdd(bs.center, B, b_coeff / sum, bs.center);
    m_vec3.scaleAndAdd(bs.center, C, c_coeff / sum, bs.center);

    bs.radius = m_vec3.distance(bs.center, A);

    return bs;
}

}
