/**
 * Copyright (C) 2014-2015 Triumph LLC
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
 * Utility functions.
 * @name util
 * @namespace
 * @exports exports as util
 */
b4w.module["__util"] = function(exports, require) {

var m_mat3  = require("__mat3");
var m_mat4  = require("__mat4");
var m_print = require("__print");
var m_tsr   = require("__tsr");
var m_quat  = require("__quat");
var m_vec3  = require("__vec3");
var m_vec4  = require("__vec4");

var _unique_counter = 0;
var _unique_name_counters = {};

// for internal usage
var _vec3_tmp = new Float32Array(3);
var _vec3_tmp2 = new Float32Array(3);
var _vec4_tmp = new Float32Array(4);
var _vec4_tmp2 = new Float32Array(4);
var _mat3_tmp = new Float32Array(9);
var _mat4_tmp = new Float32Array(16);
var _mat4_tmp2 = new Float32Array(16);

var _hash_buffer_in = new Float64Array(1);
var _hash_buffer_out = new Uint32Array(_hash_buffer_in.buffer);

var VEC3_IDENT = new Float32Array([0,0,0]);
var QUAT4_IDENT = new Float32Array([0,0,0,1]);
var TSR8_IDENT = new Float32Array([0,0,0,1,0,0,0,1]);
var VEC3_UNIT = new Float32Array([1,1,1]);

var AXIS_X = new Float32Array([1, 0, 0]);
var AXIS_Y = new Float32Array([0, 1, 0]);
var AXIS_Z = new Float32Array([0, 0, 1]);
var AXIS_MX = new Float32Array([-1, 0, 0]);
var AXIS_MY = new Float32Array([ 0,-1, 0]);
var AXIS_MZ = new Float32Array([ 0, 0,-1]);

var DEFAULT_SEED = 50000;
var RAND_A = 48271;
var RAND_M = 2147483647;
var RAND_R = RAND_M % RAND_A;
var RAND_Q = Math.floor(RAND_M / RAND_A);

var MIN_CLAMPING_INTERVAL = 0.001;

// view matrixes representing 6 cube sides
var INV_CUBE_VIEW_MATRS =
    [new Float32Array([ 0, 0, -1, 0, 0, -1,  0, 0, -1,  0,  0, 0, 0, 0, 0, 1]),
     new Float32Array([ 0, 0,  1, 0, 0, -1,  0, 0,  1,  0,  0, 0, 0, 0, 0, 1]),
     new Float32Array([ 1, 0,  0, 0, 0,  0, -1, 0,  0,  1,  0, 0, 0, 0, 0, 1]),
     new Float32Array([ 1, 0,  0, 0, 0,  0,  1, 0,  0, -1,  0, 0, 0, 0, 0, 1]),
     new Float32Array([ 1, 0,  0, 0, 0, -1,  0, 0,  0,  0, -1, 0, 0, 0, 0, 1]),
     new Float32Array([-1, 0,  0, 0, 0, -1,  0, 0,  0,  0,  1, 0, 0, 0, 0, 1])];

var GAMMA = 2.2;

exports.VEC3_IDENT = VEC3_IDENT;
exports.QUAT4_IDENT = QUAT4_IDENT;
exports.TSR8_IDENT = TSR8_IDENT;
exports.VEC3_UNIT = VEC3_UNIT;

exports.AXIS_X = AXIS_X;
exports.AXIS_Y = AXIS_Y;
exports.AXIS_Z = AXIS_Z;
exports.AXIS_MX = AXIS_MX;
exports.AXIS_MY = AXIS_MY;
exports.AXIS_MZ = AXIS_MZ;

exports.INV_CUBE_VIEW_MATRS = INV_CUBE_VIEW_MATRS;

exports.isdef = function(v) {
    return (typeof v != "undefined");
}

exports.keyfind = keyfind;
function keyfind(key, value, array) {
    var results = [];

    var len = array.length;
    for (var i = 0; i < len; i++) {
        var obj = array[i];
        if (obj[key] == value)
            results.push(obj);
    }
    return results;
}

/**
 * Arrays concatenation.
 */
exports.float32_concat = function(first, second) {
    var firstLength = first.length;
    var result = new Float32Array(firstLength + second.length);

    result.set(first);
    result.set(second, firstLength);

    return result;
}

exports.uint32_concat = function(first, second) {
    var firstLength = first.length;
    var result = new Uint32Array(firstLength + second.length);

    result.set(first);
    result.set(second, firstLength);

    return result;
}

/**
 * @returns {Boolean} True if we have a little-endian architecture.
 */
exports.check_endians = function() {

    var value = 0xFF;
    var x = new Uint16Array([value]);
    var dataview = new DataView(x.buffer);

    return (dataview.getUint16(0, true) == value);
}

/**
 * Taken from http://www.falsepositives.com/index.php/2009/12/01/javascript-
 * function-to-get-the-intersect-of-2-arrays/
 * @returns {Array} Intersection between arrays
 */
exports.array_intersect = function(arr1, arr2) {
    var r = [], o = {}, l = arr2.length, i, v;
    for (i = 0; i < l; i++) {
        o[arr2[i]] = true;
    }
    l = arr1.length;
    for (i = 0; i < l; i++) {
        v = arr1[i];
        if (v in o) {
            r.push(v);
        }
    }
    return r;
}

/**
 * Taken from http://stackoverflow.com/questions/7624920/number-sign-in-javascript
 * @returns {Number} Signum function from argument
 */
exports.sign = sign;
function sign(value) {
    return (value > 0) ? 1 : (value < 0 ? -1 : 0);
}

/**
 * Check if an object with a given key:value is present in the array.
 */
exports.keycheck = function(key, value, array) {
    var len = array.length;

    for (var i = 0; i < len; i++) {
        var obj = array[i];
        if (obj[key] == value)
            return true;
    }
    return false;
}

exports.keysearch = function(key, value, array) {
    for (var i = 0; i < array.length; i++) {
        var obj = array[i];
        if (obj[key] === value)
            return obj;
    }

    return null;
}

/**
 * Helper search function.
 * Returns single element or throws error if not found
 */
exports.key2search = function(key1, value1, key2, value2, array) {
    for (var i = 0; i < array.length; i++) {
        var obj = array[i];
        if (obj[key1] == value1 && obj[key2] == value2)
            return obj;
    }
    return null;
}

/**
 * Helper search function
 */
exports.get_index_for_key_value = function(array, key, value) {
    for (var i = 0; i < array.length; i++)
        if (array[i][key] == value)
            return i;
    return -1;
}

/**
 * Append to array unique values
 */
exports.append_unique = function(array, value) {

    for (var i = 0; i < array.length; i++)
        if (array[i] == value)
            return;

    array.push(value);
}

/**
 * Check if all elements in array is unique.
 */
exports.check_uniqueness = function(array) {

    for (var i = 0; i < array.length-1; i++) {

        var elem_i = array[i];

        for (var j = i+1; j < array.length; j++) {
            var elem_j = array[j];

            if (elem_i == elem_j)
                return false;
        }
    }

    return true;
}

/**
 * Create translation matrix
 */
exports.trans_matrix = function(x, y, z, dest) {

    if (!dest)
        var dest = new Float32Array(16);

    m_mat4.identity(dest);

    dest[12] = x;
    dest[13] = y;
    dest[14] = z;

    return dest;
}

var _next = 1;

/** get random number */
exports.rand = function() {
    _next = (_next * 69069 + 5) % Math.pow(2, 32);
    return (Math.round(_next/65536) % 32768)/32767;
}

/** store seed */
exports.srand = function(seed) {
    _next = seed;
}

/**
 * Pseudo random number generator.
 * (Lehmer Generator)
 */
exports.rand_r = function(seedp) {
    var high = Math.floor(seedp[0] / RAND_Q);
    var low = seedp[0] % RAND_Q;

    var test = RAND_A * low - RAND_R * high;

    if (test > 0)
        seedp[0] = test;
    else
        seedp[0] = test + RAND_M;

    return (seedp[0] - 1) / (RAND_M - 1);
}

/**
 * Initialize reasonable seed for rand_r() function, based on integer seed
 * number.
 */
exports.init_rand_r_seed = function(seed_number, dest) {
    if (!dest)
        dest = [];

    dest[0] = DEFAULT_SEED + Math.floor(seed_number);
    return dest;
}

/**
 * <p>Translate GL euler to GL quat
 */
exports.euler_to_quat = function(euler, quat) {

    if (!quat)
        quat = new Float32Array(4);

    var c1 = Math.cos(euler[1]/2);
    var c2 = Math.cos(euler[2]/2);
    var c3 = Math.cos(euler[0]/2);

    var s1 = Math.sin(euler[1]/2);
    var s2 = Math.sin(euler[2]/2);
    var s3 = Math.sin(euler[0]/2);

    // xyz
    quat[0] = s1 * s2 * c3 + c1 * c2 * s3;
    quat[1] = s1 * c2 * c3 + c1 * s2 * s3;
    quat[2] = c1 * s2 * c3 - s1 * c2 * s3;
    // w
    quat[3] = c1 * c2 * c3 - s1 * s2 * s3;

    return quat;
}

 /**
 * <p>Return rotation matrix from euler angles
 *
 * <p>Euler angles have following meaning:
 * <ol>
 * <li>heading, x
 * <li>attitude, y
 * <li>bank, z
 * </ol>
 * <p>Usage discouraged
 *
 * @methodOf util
 * @param {vec3} euler Euler
 */
exports.euler_to_rotation_matrix = function(euler) {

    var matrix = m_mat3.create();

    var cosX = Math.cos(euler[0]);
    var cosY = Math.cos(euler[1]);
    var cosZ = Math.cos(euler[2]);
    var sinX = Math.sin(euler[0]);
    var sinY = Math.sin(euler[1]);
    var sinZ = Math.sin(euler[2]);

    var cosXcosZ = cosX * cosZ;
    var cosXsinZ = cosX * sinZ;
    var sinXcosZ = sinX * cosZ;
    var sinXsinZ = sinX * sinZ;

    matrix[0] = cosY * cosZ;
    matrix[1] = cosY * sinZ;
    matrix[2] = - sinY;

    matrix[3] = sinY * sinXcosZ - cosXsinZ;
    matrix[4] = sinY * sinXsinZ + cosXcosZ;
    matrix[5] = cosY * sinX;

    matrix[6] = sinY * cosXcosZ + sinXsinZ;
    matrix[7] = sinY * cosXsinZ - sinXcosZ;
    matrix[8] = cosY * cosX;

    return matrix;
}
/**
 * @see http://www.euclideanspace.com/maths/geometry/rotations/conversions/quaternionToEuler/index.htm
 */
exports.quat_to_euler = function(quat, euler) {
    //var quat = new Float32Array([quat[0], quat[2], quat[1], quat[3]])
    //var quat_rot = [-0.7071, 0, 0, 0.7071];
    //var quat = m_quat.multiply(quat_rot, quat, []);

    var qx = quat[0];
    var qy = quat[1];
    var qz = quat[2];
    var qw = quat[3]; // last for glsl

    var qw2 = qw * qw;
    var qx2 = qx * qx;
    var qy2 = qy * qy;
    var qz2 = qz * qz;
    var test = qx * qy + qz * qw;

    if (test > 0.499999) {
        euler[0] = 0;
        euler[1] = 2 * Math.atan2(qx, qw);
        euler[2] = Math.PI / 2;
    } else if (test < -0.499999) {
        euler[0] = 0;
        euler[1] = -2 * Math.atan2(qx, qw);
        euler[2] = -Math.PI / 2;
    } else {
        euler[0] = Math.atan2(2 * qx * qw - 2 * qy * qz, 1 - 2 * qx2 - 2 * qz2);
        euler[1] = Math.atan2(2 * qy * qw - 2 * qx * qz, 1 - 2 * qy2 - 2 * qz2);
        euler[2] = Math.asin (2 * qx * qy + 2 * qz * qw);
    }

    return euler;
}

/**
 * Convert quaternion to directional vector.
 */
exports.quat_to_dir = function(quat, ident, dest) {
    if (!dest)
        var dest = new Float32Array(3);

    m_vec3.transformQuat(ident, quat, dest);
    return dest;
}
/**
 * Convert directional vector to quaternion.
 * execution discouraged, use quaternion directly
 */
exports.dir_to_quat = function(dir, ident, dest) {
    if (!dest)
        var dest = new Float32Array(4);

    var dir = m_vec3.normalize(dir, _vec3_tmp);

    var dot = m_vec3.dot(ident, dir);
    var A = m_vec3.cross(ident, dir, _vec3_tmp2);

    var teta = Math.acos(dot);

    dest[0] = A[0] * Math.sin(teta/2);
    dest[1] = A[1] * Math.sin(teta/2);
    dest[2] = A[2] * Math.sin(teta/2);
    dest[3] = Math.cos(teta/2);

    return dest;
}

exports.trans_quat_to_plane = function(trans, quat, ident, dest) {
    if (!dest)
        var dest = new Float32Array(4);

    m_vec3.transformQuat(ident, quat, dest);
    dest[3] = -m_vec3.dot(trans, dest);

    return dest;
}

/**
 * @methodOf util
 * Returns angle (in radians) between obj direction ground projection
 * and default obj direction (depends on object type)
 */
exports.dir_ground_proj_angle = function(obj) {

    var render = obj.render;
    var quat = m_tsr.get_quat_view(render.world_tsr);

    var proj   = _vec3_tmp;
    var defdir = _vec3_tmp2;

    switch (obj.type) {
    case "CAMERA":
        proj[0] =  0;
        proj[1] = -1;
        proj[2] =  0;
        m_vec3.transformQuat(proj, quat, proj);
        // -Z axis is positive direction
        defdir[0] =  0;
        defdir[1] =  0;
        defdir[2] = -1;
        break;
    case "MESH":
        proj[0] = 0;
        proj[1] = 0;
        proj[2] = 1;
        m_vec3.transformQuat(proj, quat, proj);
        // Y axis is positive direction
        defdir[0] = 0;
        defdir[1] = 0;
        defdir[2] = 1;
        break;
    case "EMPTY":
        proj[0] = 0;
        proj[1] = 1;
        proj[2] = 0;
        m_vec3.transformQuat(proj, quat, proj);
        // Z axis is positive direction
        defdir[0] = 0;
        defdir[1] = 1;
        defdir[2] = 0;
        break;
    }

    // project to XZ plane
    proj[1] = 0;
    m_vec3.normalize(proj, proj);

    var cos = m_vec3.dot(proj, defdir);

    // angle sign is a vertical part of cross cross(proj, defdir)
    var sign = (-proj[0] * defdir[2]) > 0? -1: 1;

    var angle  = Math.acos(cos) * sign;
    return angle;
}

exports.blend_arrays = blend_arrays;
/**
 * Blend two arrays like GLSL mix()
 */
function blend_arrays(a1, a2, f, dest) {

    // simple optimization (see bflags)
    if (f == 0)
        return a1;

    dest = dest || [];
    for (var i = 0; i < a1.length; i++)
        dest[i] = (1 - f) * a1[i] + f * a2[i];
    return dest;
}

/**
 * Compose unique string ID.
 */
exports.unique_id = function() {
    _unique_counter++;
    return _unique_counter.toString(16);
}


/**
 * Compose unique name based on given name.
 */
exports.unique_name = function(name_base) {
    if (!_unique_name_counters[name_base])
        _unique_name_counters[name_base] = 0;

    var name = name_base + _unique_name_counters[name_base];
    _unique_name_counters[name_base]++;
    return name;
}


exports.create_empty_va_frame = function() {
    var va_frame = {
        "a_position": new Float32Array(0),
        "a_tangent": new Float32Array(0),
        "a_normal": new Float32Array(0)
    }

    return va_frame;
}

exports.create_empty_submesh = function(name) {

    var va_common = {
        "a_influence": new Float32Array(0),
        "a_color": new Float32Array(0),
        "a_texcoord": new Float32Array(0)
    };

    return {
        name: name,
        // number of vertices per frame
        base_length: 0,
        indices: null,
        va_frames: [],
        va_common: va_common,
        shape_keys: []
    };
}

/**
 * Clone object using JSON.stringify() than JSON.parse().
 * Safest, but not working for objects with links/buffers.
 */
exports.clone_object_json = function(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Clone object recursively
 * operation is dangerous because of possible cyclic links
 */
exports.clone_object_r = function(obj) {
    if (!(obj instanceof Object)) {
        return obj;
    }

    var obj_clone;

    var Constructor = obj.constructor;

    switch (Constructor) {
    case Float32Array:
    case Uint32Array:
    case Uint16Array:
        obj_clone = new Constructor(obj);
        break;
    case Array:
        obj_clone = new Constructor(obj.length);

        for (var i = 0; i < obj.length; i++)
            obj_clone[i] = exports.clone_object_r(obj[i]);

        break;
    default:
        obj_clone = new Constructor();

        for (var prop in obj)
            obj_clone[prop] = exports.clone_object_r(obj[prop]);

        break;
    }

    return obj_clone;
}

/**
 * Clone object non-recursively
 */
exports.clone_object_nr = function(obj) {

    var new_obj = (obj instanceof Array) ? [] : {};

    for (var prop in obj) {
        if (obj[prop] instanceof Object) {

            var Constructor = obj[prop].constructor;

            switch (Constructor) {
            case Float32Array:
            case Uint32Array:
            case Uint16Array:
                new_obj[prop] = new Constructor(obj[prop]);
                break;
            case Array:
                new_obj[prop] = obj[prop].slice(0);
                break;
            default:
                new_obj[prop] = obj[prop];
                break;
            }
        } else
            new_obj[prop] = obj[prop];
    }

    return new_obj;
}

exports.matrix_to_quat = matrix_to_quat;
/**
 * Extract rotation quaternion from 4x4 matrix.
 * Only uniform scale supported.
 * @methodOf util
 */
function matrix_to_quat(matrix, dest) {
    if (!dest)
        var dest = new Float32Array(4);

    m_mat3.fromMat4(matrix, _mat3_tmp);

    // drop scale if any by normalizing line vectors

    var m0 = _mat3_tmp[0];
    var m3 = _mat3_tmp[3];
    var m6 = _mat3_tmp[6];

    var m1 = _mat3_tmp[1];
    var m4 = _mat3_tmp[4];
    var m7 = _mat3_tmp[7];

    var m2 = _mat3_tmp[2];
    var m5 = _mat3_tmp[5];
    var m8 = _mat3_tmp[8];

    // prevent NaN results for zero vectors
    var l0 = Math.sqrt(m0 * m0 + m3 * m3 + m6 * m6) || 1;
    var l1 = Math.sqrt(m1 * m1 + m4 * m4 + m7 * m7) || 1;
    var l2 = Math.sqrt(m2 * m2 + m5 * m5 + m8 * m8) || 1;

    _mat3_tmp[0] /= l0;
    _mat3_tmp[3] /= l0;
    _mat3_tmp[6] /= l0;

    _mat3_tmp[1] /= l1;
    _mat3_tmp[4] /= l1;
    _mat3_tmp[7] /= l1;

    _mat3_tmp[2] /= l2;
    _mat3_tmp[5] /= l2;
    _mat3_tmp[8] /= l2;

    m_quat.fromMat3(_mat3_tmp, dest);
    m_quat.normalize(dest, dest)

    return dest;
}

/**
 * Extract transform vector from given matrix
 */
exports.matrix_to_trans = function(matrix, dest) {
    if (!dest)
        var dest = new Float32Array(3);

    dest[0] = matrix[12];
    dest[1] = matrix[13];
    dest[2] = matrix[14];

    return dest;
}

/**
 * Return mat4 average scale factor.
 */
exports.matrix_to_scale = function(matrix) {

    _vec4_tmp[0] = 0.577350269189626;
    _vec4_tmp[1] = 0.577350269189626;
    _vec4_tmp[2] = 0.577350269189626;
    _vec4_tmp[3] = 0;

    m_vec4.transformMat4(_vec4_tmp, matrix, _vec4_tmp);
    return m_vec4.length(_vec4_tmp);
}

/**
 * Perform some frustum culling stuff
 * plane [a, b, c, d]
 * @methodOf util
 */
exports.extract_frustum_planes = function(m, planes) {

    var left   = planes.left;
    var right  = planes.right;
    var top    = planes.top;
    var bottom = planes.bottom;
    var near   = planes.near;
    var far    = planes.far;

    left[0] = m[3] + m[0];
    left[1] = m[7] + m[4];
    left[2] = m[11] + m[8];
    left[3] = m[15] + m[12];

    right[0] = m[3] - m[0];
    right[1] = m[7] - m[4];
    right[2] = m[11] - m[8];
    right[3] = m[15] - m[12];

    top[0] = m[3] - m[1];
    top[1] = m[7] - m[5];
    top[2] = m[11] - m[9];
    top[3] = m[15] - m[13];

    bottom[0] = m[3] + m[1];
    bottom[1] = m[7] + m[5];
    bottom[2] = m[11] + m[9];
    bottom[3] = m[15] + m[13];

    near[0] = m[3] + m[2];
    near[1] = m[7] + m[6];
    near[2] = m[11] + m[10];
    near[3] = m[15] + m[14];

    far[0] = m[3] - m[2];
    far[1] = m[7] - m[6];
    far[2] = m[11] - m[10];
    far[3] = m[15] - m[14];

    normalize_plane(left);
    normalize_plane(right);
    normalize_plane(top);
    normalize_plane(bottom);
    normalize_plane(near);
    normalize_plane(far);

    return planes;
}

function normalize_plane(plane) {
    var a = plane[0], b = plane[1], c = plane[2], d = plane[3];

    var len = Math.sqrt(a * a + b * b + c * c);
    len = 1 / len;

    plane[0] = a * len;
    plane[1] = b * len;
    plane[2] = c * len;
    plane[3] = d * len;
}

/**
 * Detect if given sphere is out of frustum.
 */
exports.sphere_is_out_of_frustum = function(pt, planes, radius) {

    if (radius < -point_plane_dist(pt, planes.left) ||
        radius < -point_plane_dist(pt, planes.right) ||
        radius < -point_plane_dist(pt, planes.top) ||
        radius < -point_plane_dist(pt, planes.bottom) ||
        radius < -point_plane_dist(pt, planes.near) ||
        radius < -point_plane_dist(pt, planes.far))
        return true;
    else
        return false;
}

/**
 * Detect if given ellipsoid is out of frustum.
 */
exports.ellipsoid_is_out_of_frustum = function(pt, planes,
                                               axis_x, axis_y, axis_z) {

    // effective radius - far/near plane
    dot_nx = m_vec3.dot(axis_x, planes.far);
    dot_ny = m_vec3.dot(axis_y, planes.far);
    dot_nz = m_vec3.dot(axis_z, planes.far);
    var r_far = Math.sqrt(dot_nx * dot_nx + dot_ny * dot_ny + dot_nz * dot_nz);

    // near and far effective radiuses coincide (far is parallel to near)
    if (r_far   < -point_plane_dist(pt, planes.near) ||
        r_far   < -point_plane_dist(pt, planes.far)) {
        return true;
    }

    // effective radius - left plane
    var dot_nx = m_vec3.dot(axis_x, planes.left);
    var dot_ny = m_vec3.dot(axis_y, planes.left);
    var dot_nz = m_vec3.dot(axis_z, planes.left);
    var r_left = Math.sqrt(dot_nx * dot_nx + dot_ny * dot_ny + dot_nz * dot_nz);
    if (r_left  < -point_plane_dist(pt, planes.left)) {
        return true;
    }

    // effective radius - right plane
    dot_nx = m_vec3.dot(axis_x, planes.right);
    dot_ny = m_vec3.dot(axis_y, planes.right);
    dot_nz = m_vec3.dot(axis_z, planes.right);
    var r_right = Math.sqrt(dot_nx * dot_nx + dot_ny * dot_ny + dot_nz * dot_nz);
    if (r_right < -point_plane_dist(pt, planes.right)) {
        return true;
    }

    // effective radius - top plane
    dot_nx = m_vec3.dot(axis_x, planes.top);
    dot_ny = m_vec3.dot(axis_y, planes.top);
    dot_nz = m_vec3.dot(axis_z, planes.top);
    var r_top = Math.sqrt(dot_nx * dot_nx + dot_ny * dot_ny + dot_nz * dot_nz);
    if (r_top < -point_plane_dist(pt, planes.top)) {
        return true;
    }

    // effective radius - bottom plane
    dot_nx = m_vec3.dot(axis_x, planes.bottom);
    dot_ny = m_vec3.dot(axis_y, planes.bottom);
    dot_nz = m_vec3.dot(axis_z, planes.bottom);
    var r_bott = Math.sqrt(dot_nx * dot_nx + dot_ny * dot_ny + dot_nz * dot_nz);
    if (r_bott < -point_plane_dist(pt, planes.bottom)) {
        return true;
    }

    return false;
}

/**
 * Calculate distance from point to plane.
 */
function point_plane_dist(pt, plane) {
    return plane[0] * pt[0] + plane[1] * pt[1] + plane[2] * pt[2] + plane[3];
}


/**
 * Translate positions by matrix
 * optimized function, uses preallocated arrays (Array or Float32Array)
 * optional destination offset in values (not vectors, not bytes)
 */
exports.positions_multiply_matrix = function(positions, matrix, new_positions,
        dest_offset) {

    if (!dest_offset)
        var dest_offset = 0;

    var len = positions.length;

    for (var i = 0; i < len; i+=3) {
        var x = positions[i];
        var y = positions[i+1];
        var z = positions[i+2];

        new_positions[dest_offset + i] = matrix[0] * x + matrix[4] * y +
                matrix[8] * z + matrix[12];
        new_positions[dest_offset + i + 1] = matrix[1] * x + matrix[5] * y +
                matrix[9] * z + matrix[13];
        new_positions[dest_offset + i + 2] = matrix[2] * x + matrix[6] * y +
                matrix[10] * z + matrix[14];
    }

    return new_positions;
}

/**
 * Translate directional (TBN) vectors by matrix.
 * Optimized function, uses preallocated arrays (Array or Float32Array).
 * Works only for uniform-scaled matrices.
 * optional destination offset in values (not vectors, not bytes)
 */
exports.vectors_multiply_matrix = function(vectors, matrix, new_vectors,
        dest_offset) {

    if (!dest_offset)
        var dest_offset = 0;

    var len = vectors.length;

    for (var i = 0; i < len; i+=3) {
        var x = vectors[i];
        var y = vectors[i+1];
        var z = vectors[i+2];

        // ignore matrix translation part
        new_vectors[dest_offset + i] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
        new_vectors[dest_offset + i + 1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
        new_vectors[dest_offset + i + 2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
    }

    return new_vectors;
}

/**
 * Translate 4 comp tangent vectors by matrix.
 * Optimized function, uses preallocated arrays (Array or Float32Array).
 * Works only for uniform-scaled matrices.
 * optional destination offset in values (not vectors, not bytes)
 */
exports.tangents_multiply_matrix = function(vectors, matrix, new_vectors,
        dest_offset) {

    if (!dest_offset)
        var dest_offset = 0;

    var len = vectors.length;

    for (var i = 0; i < len; i+=4) {
        var x = vectors[i];
        var y = vectors[i+1];
        var z = vectors[i+2];

        // ignore matrix translation part
        new_vectors[dest_offset + i] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
        new_vectors[dest_offset + i + 1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
        new_vectors[dest_offset + i + 2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;

        // just save exact sign
        new_vectors[dest_offset + i + 3] = vectors[i + 3];
    }

    return new_vectors;
}

/**
 * Translate vector representing direction (e.g. normal)
 */
exports.vecdir_multiply_matrix = function(vec, matrix, dest) {
    if (!dest)
        var dest = new Float32Array(3);

    var v4 = _vec4_tmp;

    v4[0] = vec[0];
    v4[1] = vec[1];
    v4[2] = vec[2];
    v4[3] = 0;

    m_vec4.transformMat4(v4, matrix, v4);
    dest[0] = v4[0];
    dest[1] = v4[1];
    dest[2] = v4[2];
}

/**
 * Make flat (Float32Array) version of given array.
 * Only single level supported
 */
exports.flatten = function(array, dest) {

    var len = array.length;
    if (!len)
        throw "flatten(): Wrong or empty array";

    var len0 = array[0].length;
    // already required array
    if (!len0)
        throw "flatten(): Wrong or empty subarray";

    if (!dest)
        var dest = new Float32Array(len * len0);

    for (var i = 0; i < len; i++)
        for (var j = 0; j < len0; j++)
            dest[i * len0 + j] = array[i][j];

    return dest;
}
/**
 * Make vectorized version of given flat array (opposite to flatten())
 */
exports.vectorize = function(array, dest) {

    if (!dest)
        var dest = [];

    for (var i = 0; i < array.length; i+=3) {
        var v3 = new Float32Array([array[i], array[i+1], array[i+2]]);
        dest[i/3] = v3;
    }

    return dest;
}

/**
 * Find index of last element in elements which less than max.
 * @param arr Array with cumulative (increased) values
 * @param max Range value
 * @param start Start index to search
 * @param end End index to search
 */
exports.binary_search_max = function(arr, max, start, end) {

    // return closest larger index if exact number is not found
    if (end < start)
        return start;

    var mid = start + Math.floor((end - start) / 2);

    if (arr[mid] > max)
        return exports.binary_search_max(arr, max, start, mid - 1);
    else if (arr[mid] < max)
        return exports.binary_search_max(arr, max, mid + 1, end);
    else
        return mid;
}

/**
 * Compare two flat arrays
 * @returns true if equal
 */
exports.cmp_arr = function(arr_1, arr_2) {
    for (var i = 0; i < arr_1.length; i++)
        if (arr_1[i] != arr_2[i])
            return false;

    return true;
}

/**
 * Compare two float flat arrays using minimal precision value
 * @returns true if equal
 */
exports.cmp_arr_float = function(arr_1, arr_2, precision) {

    for (var i = 0; i < arr_1.length; i++)
        if (Math.abs(arr_1[i] - arr_2[i]) > precision)
            return false;

    return true;
}

/**
 * Apply uniform scale to matrix.
 */
exports.scale_mat4 = function(matrix, scale, dest) {
    if (!dest)
        var dest = new Float32Array(16);

    for (var i = 0; i < 12; i++)
        dest[i] = matrix[i] * scale;

    dest[12] = matrix[12];
    dest[13] = matrix[13];
    dest[14] = matrix[14];
    dest[15] = matrix[15];

    return dest;
}

/**
 * Unused. Unoptimized (uses matrix)
 */
exports.transform_mat4 = function(matrix, scale, quat, trans, dest) {
    if (!dest)
        var dest = new Float32Array(16);
    var m = m_mat4.fromRotationTranslation(quat, trans, _mat4_tmp);

    m_mat4.multiply(m, matrix, dest);

    return dest;
}
/**
 * Unoptimized (uses matrix)
 */
exports.transform_vec3 = function(vec, scale, quat, trans, dest) {
    if (!dest)
        var dest = new Float32Array(3);
    
    var m1 = m_mat4.fromRotationTranslation(quat, trans, _mat4_tmp);
    if (scale !== 1) {
        var m2 = m_mat4.identity(_mat4_tmp2);
        var s = m_vec3.set(scale, scale, scale, _vec3_tmp);
        m_mat4.scale(m2, s, m2);
        m_mat4.multiply(m1, m2, m1);
    }

    m_vec3.transformMat4(vec, m1, dest);

    return dest;
}
/**
 * Unoptimized (uses matrix)
 */
exports.transform_vec4 = function(vec, scale, quat, trans, dest) {
    if (!dest)
        var dest = new Float32Array(4);
    var m = m_mat4.fromRotationTranslation(quat, trans, _mat4_tmp);

    m_vec4.transformMat4(vec, m, dest);

    return dest;
}

/**
 * Unoptimized (uses matrix)
 */
exports.inverse_transform_vec3 = function(vec, scale, quat, trans, dest) {
    if (!dest)
        var dest = new Float32Array(3);
    var m = m_mat4.fromRotationTranslation(quat, trans, _mat4_tmp);
    m_mat4.invert(m, m);
    m_vec3.transformMat4(vec, m, dest);

    return dest;
}

exports.transcale_quat_to_matrix = function(trans, quat, dest) {
    if (!dest)
        var dest = new Float32Array(16);

    m_mat4.fromRotationTranslation(quat, trans, dest);

    var scale = trans[3];
    for (var i = 0; i < 12; i++)
        dest[i] *= scale;

    return dest;
}

exports.matrix_to_transcale_quat = function(matrix, dest_transcale, dest_quat) {
    exports.matrix_to_trans(matrix, dest_transcale);
    dest_transcale[3] = exports.matrix_to_scale(matrix);
    exports.matrix_to_quat(matrix, dest_quat);
}

/**
 * Works for typed array also
 */
exports.array_stringify = function(array) {

    var out = []
    for (var i = 0; i < array.length; i++)
        out.push(array[i]);

    return JSON.stringify(out);
}

exports.rotate_point_pivot = function(point, pivot, quat, dest) {
    if (!dest)
        var dest = new Float32Array(3);

    var point_rel = _vec3_tmp;

    m_vec3.subtract(pivot, point, point_rel);
    m_vec3.transformQuat(point_rel, quat, point_rel);

    m_vec3.subtract(pivot, point_rel, dest);
}

/**
 * Construct 6 view matrices for 6 cubemap sides
 */
exports.generate_cubemap_matrices = function() {

    var eye_pos = _vec3_tmp;
    eye_pos[0] = 0; eye_pos[1] = 0; eye_pos[2] = 0;
    var x_pos   = new Float32Array(16);
    var x_neg   = new Float32Array(16);
    var y_pos   = new Float32Array(16);
    var y_neg   = new Float32Array(16);
    var z_pos   = new Float32Array(16);
    var z_neg   = new Float32Array(16);

    m_mat4.lookAt(eye_pos, [-1, 0, 0], [0, -1, 0], x_pos);
    m_mat4.scale(x_pos, [-1, 1, 1], x_pos);
    m_mat4.scale(x_pos, [-1, 1,-1], x_neg);

    m_mat4.lookAt(eye_pos, [0, -1, 0], [0, 0, -1], y_pos);
    m_mat4.scale(y_pos, [1, 1,-1], y_pos);
    m_mat4.scale(y_pos, [1,-1,-1], y_neg);

    m_mat4.lookAt(eye_pos, [0, 0, -1], [0, -1, 0], z_pos);
    m_mat4.scale(z_pos, [-1, 1, 1], z_pos);
    m_mat4.scale(z_pos, [-1, 1,-1], z_neg);

    return [x_pos, x_neg, y_pos, y_neg, z_pos, z_neg];
}
/**
 * Construct 6 view matrices for 6 cubemap sides
 */
exports.generate_inv_cubemap_matrices = function() {

    var eye_pos = _vec3_tmp;
    eye_pos[0] = 0; eye_pos[1] = 0; eye_pos[2] = 0;

    var x_pos   = new Float32Array(16);
    var x_neg   = new Float32Array(16);
    var y_pos   = new Float32Array(16);
    var y_neg   = new Float32Array(16);
    var z_pos   = new Float32Array(16);
    var z_neg   = new Float32Array(16);

    m_mat4.lookAt(eye_pos, [1, 0, 0], [0, -1, 0], x_pos);
    m_mat4.scale(x_pos, [-1, 1,-1], x_neg);

    m_mat4.lookAt(eye_pos, [0, 1, 0], [0, 0, 1], y_pos);
    m_mat4.scale(y_pos, [1,-1, -1], y_neg);

    m_mat4.lookAt(eye_pos, [0, 0, 1], [0, -1, 0], z_pos);
    m_mat4.scale(z_pos, [-1, 1,-1], z_neg);

    return [x_pos, x_neg, y_pos, y_neg, z_pos, z_neg];
}

/**
 * Calculate id for strongly typed variables (batch, render, ...)
 */
exports.calc_variable_id = function(a, init_val) {
    return hash_code(a, init_val);
}

exports.hash_code = hash_code;
function hash_code(a, init_val) {
    var hash = init_val;

    switch (typeof a) {
    case "number":
        return hash_code_number(a, hash);
    case "string":
        return hash_code_string(a, hash);
    case "boolean":
        return hash_code_number(a | 0, hash);
    case "function":
    case "undefined":
        return hash_code_number(0, hash);
    case "object":
        if (a) {
            var is_arr = a instanceof Array;
            var is_typed_arr = a.buffer instanceof ArrayBuffer
                    && a.byteLength !== "undefined";
            if (is_typed_arr)
                for (var i = 0; i < a.length; i++)
                    hash = hash_code_number(a[i], hash);
            else if (is_arr)
                for (var i = 0; i < a.length; i++)
                    hash = hash_code(a[i], hash);
            else
                for (var prop in a)
                    hash = hash_code(a[prop], hash);
        } else
            hash = hash_code_number(0, hash);
        return hash;
    }

    return hash;
}

function hash_code_number(num, init_val) {
    var hash = init_val;
    _hash_buffer_in[0] = num;

    hash = (hash<<5) - hash + _hash_buffer_out[0];
    hash = hash & hash;
    hash = (hash<<5) - hash + _hash_buffer_out[1];
    hash = hash & hash;

    return hash;
}

/**
 * Implementation of Java's String.hashCode().
 */
exports.hash_code_string = hash_code_string;
function hash_code_string(str, init_val) {
    var hash = init_val;

    for (var i = 0; i < str.length; i++) {
        var symbol = str.charCodeAt(i);
        hash = ((hash<<5) - hash) + symbol;
        hash = hash & hash; // convert to 32 bit integer
    }
    return hash;
}

exports.mat3_to_mat4 = function(mat, dest) {
    dest[15] = 1;
    dest[14] = 0;
    dest[13] = 0;
    dest[12] = 0;

    dest[11] = 0;
    dest[10] = mat[8];
    dest[9] = mat[7];
    dest[8] = mat[6];

    dest[7] = 0;
    dest[6] = mat[5];
    dest[5] = mat[4];
    dest[4] = mat[3];

    dest[3] = 0;
    dest[2] = mat[2];
    dest[1] = mat[1];
    dest[0] = mat[0];

    return dest;
};

/**
 * From glMatrix 1
 */
exports.quat_to_angle_axis = function(src, dest) {
    if (!dest) dest = src;
    // The quaternion representing the rotation is
    //   q = cos(A/2)+sin(A/2)*(x*i+y*j+z*k)

    var sqrlen = src[0]*src[0]+src[1]*src[1]+src[2]*src[2];
    if (sqrlen > 0)
    {
        dest[3] = 2 * Math.acos(src[3]);
        var invlen = 1 / Math.sqrt(sqrlen);
        dest[0] = src[0]*invlen;
        dest[1] = src[1]*invlen;
        dest[2] = src[2]*invlen;
    } else {
        // angle is 0 (mod 2*pi), so any axis will do
        dest[3] = 0;
        dest[0] = 1;
        dest[1] = 0;
        dest[2] = 0;
    }

    return dest;
};

function permute3(x) {
    x = ( ((34 * x) + 1) * x);
    return x % 289;
}

function fract(x) {
    return x - Math.floor(x);
}

/**
 * Returns truncate value
 * Expected in "ECMAScript Language Specification 6th Edition (ECMA-262)"
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc
 */
exports.trunc = function(x) {
    return isNaN(x) || typeof x == "undefined" ? NaN : x | 0;
}

exports.rad = function(x) {
    return x * Math.PI / 180;
}

exports.deg = function(x) {
    return x * 180 / Math.PI;
}

exports.snoise = function(p) {

    var C_x =  0.211324865405187; // (3.0-sqrt(3.0))/6.0
    var C_y =  0.366025403784439; // 0.5*(sqrt(3.0)-1.0)
    var C_z = -0.577350269189626; // -1.0 + 2.0 * C.x
    var C_w =  0.024390243902439; // 1.0 / 41.0

    // First corner
    var v_dot_Cyy = p[0] * C_y + p[1] * C_y;
    var i_x = Math.floor(p[0] + v_dot_Cyy);
    var i_y = Math.floor(p[1] + v_dot_Cyy);

    var i_dot_Cxx = i_x * C_x + i_y * C_x;
    var x0_x = p[0] - i_x + i_dot_Cxx;
    var x0_y = p[1] - i_y + i_dot_Cxx;

    // Other corners
    var i1_x = x0_x > x0_y ? 1 : 0;
    var i1_y = 1 - i1_x;

    var x12_x = x0_x + C_x - i1_x;
    var x12_y = x0_y + C_x - i1_y;
    var x12_z = x0_x + C_z;
    var x12_w = x0_y + C_z;

    // Permutations
    i_x %= 289; // Avoid truncation effects in permutation
    i_y %= 289;

    var p_x = permute3( permute3(i_y)        + i_x);
    var p_y = permute3( permute3(i_y + i1_y) + i_x + i1_x);
    var p_z = permute3( permute3(i_y + 1)    + i_x + 1);

    var m_x = Math.max(0.5 - (x0_x  * x0_x  + x0_y  * x0_y ), 0);
    var m_y = Math.max(0.5 - (x12_x * x12_x + x12_y * x12_y), 0);
    var m_z = Math.max(0.5 - (x12_z * x12_z + x12_w * x12_w), 0);

    m_x *= m_x * m_x * m_x;
    m_y *= m_y * m_y * m_y;
    m_z *= m_z * m_z * m_z;

    // Gradients: 41 points uniformly over a line, mapped onto a diamond.
    // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

    var x_x = 2.0 * fract(p_x * C_w) - 1.0;
    var x_y = 2.0 * fract(p_y * C_w) - 1.0;
    var x_z = 2.0 * fract(p_z * C_w) - 1.0;

    var h_x = Math.abs(x_x) - 0.5;
    var h_y = Math.abs(x_y) - 0.5;
    var h_z = Math.abs(x_z) - 0.5;

    var ox_x = Math.floor(x_x + 0.5);
    var ox_y = Math.floor(x_y + 0.5);
    var ox_z = Math.floor(x_z + 0.5);

    var a0_x = x_x - ox_x;
    var a0_y = x_y - ox_y;
    var a0_z = x_z - ox_z;

    // Normalise gradients implicitly by scaling m
    // Approximation of: m *= inversesqrt( a0*a0 + h*h );
    m_x *= 1.79284291400159 - 0.85373472095314 * (a0_x * a0_x + h_x * h_x);
    m_y *= 1.79284291400159 - 0.85373472095314 * (a0_y * a0_y + h_y * h_y);
    m_z *= 1.79284291400159 - 0.85373472095314 * (a0_z * a0_z + h_z * h_z);

    // Compute final noise value at P
    var g_x = a0_x * x0_x + h_x * x0_y;

    var g_y = a0_y * x12_x + h_y * x12_y;
    var g_z = a0_z * x12_z + h_z * x12_w;

    var m_dot_g = m_x * g_x + m_y * g_y + m_z * g_z;
    return 130 * m_dot_g;
}

function permute(x) {
    return mod289((34.0 * x + 5.0) * x);
}

function mod289(x) {
    return x - Math.floor(x / 289) * 289;
}

function mod7(x) {
    return x - Math.floor(x / 7) * 7;
}

exports.cellular2x2 = function(P) {

    var K = 1/7; // 1/7
    var K2 = K/2; // K/2
    var JITTER = 0.7; // JITTER 1.0 makes F1 wrong more often

    var Pi_x = mod289(Math.floor(P[0]));
    var Pi_y = mod289(Math.floor(P[1]));
    var Pf_x = fract(P[0]);
    var Pf_y = fract(P[1]);
    var Pfx_x = Pf_x - 0.5;
    var Pfx_y = Pf_x - 1.5;
    var Pfx_z = Pfx_x;
    var Pfx_w = Pfx_y;

    var Pfy_x = Pf_y - 0.5;
    var Pfy_y = Pfy_x;
    var Pfy_z = Pf_y - 1.5;
    var Pfy_w = Pfy_z;

    var p_x = permute(Pi_x);
    var p_y = permute(Pi_x + 1.0);
    var p_z = p_x;
    var p_w = p_y;
    p_x = permute(p_x + Pi_y);
    p_y = permute(p_y + Pi_y);
    p_z = permute(p_z + Pi_y + 1.0);
    p_w = permute(p_w + Pi_y + 1.0);

    var ox_x = mod7(p_x) * K + K2;
    var ox_y = mod7(p_y) * K + K2;
    var ox_z = mod7(p_z) * K + K2;
    var ox_w = mod7(p_w) * K + K2;

    var oy_x = mod7(Math.floor(p_x * K)) * K + K2;
    var oy_y = mod7(Math.floor(p_y * K)) * K + K2;
    var oy_z = mod7(Math.floor(p_z * K)) * K + K2;
    var oy_w = mod7(Math.floor(p_w * K)) * K + K2;

    var dx_x = Pfx_x + JITTER * ox_x;
    var dx_y = Pfx_y + JITTER * ox_y;
    var dx_z = Pfx_z + JITTER * ox_z;
    var dx_w = Pfx_w + JITTER * ox_w;

    var dy_x = Pfy_x + JITTER * oy_x;
    var dy_y = Pfy_y + JITTER * oy_y;
    var dy_z = Pfy_z + JITTER * oy_z;
    var dy_w = Pfy_w + JITTER * oy_w;

    // d11, d12, d21 and d22, squared
    var d_x = dx_x * dx_x + dy_x * dy_x;
    var d_y = dx_y * dx_y + dy_y * dy_y;
    var d_z = dx_z * dx_z + dy_z * dy_z;
    var d_w = dx_w * dx_w + dy_w * dy_w;

    // sort out the two smallest distances
    // cheat and pick only F1
    var d = Math.min(d_x, d_y, d_z, d_w);
    return d;
}

exports.quat_project = function(quat, quat_ident_dir,
        plane, plane_ident_dir, dest) {
    if (!dest)
        var dest = new Float32Array(4);

    var to = m_vec3.transformQuat(quat_ident_dir, quat, _vec3_tmp);

    var a = plane[0];
    var b = plane[1];
    var c = plane[2];

    // plane project matrix
    var proj = _mat3_tmp;

    proj[0] = b*b + c*c;
    proj[1] =-b*a;
    proj[2] =-c*a;
    proj[3] =-a*b;
    proj[4] = a*a + c*c;
    proj[5] =-c*b;
    proj[6] =-a*c;
    proj[7] =-b*c;
    proj[8] = a*a + b*b;

    m_vec3.transformMat3(to, proj, to);
    m_vec3.normalize(to, to);
    m_quat.rotationTo(plane_ident_dir, to, dest);

    return dest;
}

exports.cam_quat_to_mesh_quat = function(cam_quat, dest) {

    if (!dest)
        var dest = new Float32Array(4);

    var quat_offset = _vec4_tmp;
    var quat_offset_x = _vec4_tmp2;
    quat_offset = m_quat.setAxisAngle([0,1,0], Math.PI, m_quat.create());
    quat_offset_x = m_quat.setAxisAngle([1,0,0], Math.PI/2, m_quat.create());

    m_quat.multiply(quat_offset, quat_offset_x, quat_offset);
    m_quat.multiply(cam_quat, quat_offset, dest);

    return dest;
}

exports.cleanup = function() {
    _unique_counter = 0;
    _unique_name_counters = {};
}

exports.clamp = function(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Perform exponential smoothing.
 * @param curr Current value.
 * @param last Last smoothed value.
 * @param delta Time delta.
 * @param pariod Mean lifetime for avaraging.
 */
exports.smooth = function(curr, last, delta, period) {
    var e = Math.exp(-delta/period);

    return (1 - e) * curr + e * last;
}

/**
 * Perform exponential smoothing (vector form).
 */
exports.smooth_v = function(curr, last, delta, period, dest) {
    if (!dest)
        dest = new Float32Array(curr.length);

    var e = Math.exp(-delta/period);

    for (var i = 0; i < dest.length; i++)
        dest[i] = (1 - e) * curr[i] + e * last[i];

    return dest;
}

/**
 * Perform exponential smoothing (quaternion form).
 */
exports.smooth_q = function(curr, last, delta, period, dest) {
    if (!dest)
        dest = new Float32Array(curr.length);

    var e = Math.exp(-delta/period);

    m_quat.slerp(curr, last, e, dest);

    return dest;
}

/**
 * Check if object is instance of ArrayBufferView.
 * switch to ArrayBuffer.isView() when available.
 */
exports.is_arr_buf_view = function(o) {
    if (typeof o === "object" && o.buffer && o.buffer instanceof ArrayBuffer)
        return true;
    else
        return false;
}

exports.is_vector = function(o, dimension) {
    if (o instanceof Array || (o.buffer && o.buffer instanceof ArrayBuffer)) {
        if (dimension && dimension == o.length)
            return true;
        else if (dimension)
            return false;
        else
            return true;
    }

    return false;
}

exports.correct_cam_quat_up = function(quat, up_only) {

    // convenient to get 3x3 matrix
    var rmat = m_mat3.fromQuat(quat, _mat3_tmp);

    var y_world = _vec3_tmp2;
    y_world[0] = 0;
    y_world[1] = 1;
    y_world[2] = 0;

    // local camera Y in world space
    var y_cam_world = _vec3_tmp;
    y_cam_world[0] = rmat[3];
    y_cam_world[1] = rmat[4];
    y_cam_world[2] = rmat[5];

    var x_cam_world_new = m_vec3.cross(y_world, y_cam_world, y_cam_world);
    m_vec3.normalize(x_cam_world_new, x_cam_world_new);

    // Y coord of local camera Z axis in world space
    var z_cam_world_y = rmat[7];
    if (!up_only && z_cam_world_y > 0) {
        x_cam_world_new[0] *= -1;
        x_cam_world_new[1] *= -1;
        x_cam_world_new[2] *= -1;
    }

    var x_cam_world = _vec3_tmp2;
    x_cam_world[0] = rmat[0];
    x_cam_world[1] = rmat[1];
    x_cam_world[2] = rmat[2];
    m_vec3.normalize(x_cam_world, x_cam_world);

    var correct_quat = _vec4_tmp2;
    m_quat.rotationTo(x_cam_world, x_cam_world_new, correct_quat);
    m_quat.multiply(correct_quat, quat, quat);
}

exports.get_array_smooth_value = function(array, row_width, x, y) {
    // get coordinates
    var px = x * row_width - 0.5;
    var py = y * row_width - 0.5;

    var fract_px = px - Math.floor(px);
    var fract_py = py - Math.floor(py);

    px = Math.floor(px);
    py = Math.floor(py);

    var up_lim = row_width - 1;

    var val_00 = array[py * row_width + px];
    var val_10 = array[py * row_width + Math.min(px+1, up_lim)];
    var val_01 = array[Math.min(py+1, up_lim) * row_width + px];
    var val_11 = array[Math.min(py+1, up_lim) * row_width
                                 + Math.min(px+1, up_lim)];

    // distance on bottom, top edge
    var val_0010 = val_00 * (1 - fract_px) + val_10 * fract_px;
    var val_0111 = val_01 * (1 - fract_px) + val_11 * fract_px;

    var smooth_value = val_0010 * (1 - fract_py) + val_0111 * fract_py;

    return smooth_value;
}

/**
 * Returns count of used RGB channels by binary mask
 */
exports.rgb_mask_get_channels_count = function(mask) {
    var count = 0;
    for (var i = 0; i < 3; i++)
        if ((mask & 1<<i) > 0) {
            count++;
        }
    return count;
}

/**
 * Returns usage list of RGB channels by binary mask
 */
exports.rgb_mask_get_channels_presence = rgb_mask_get_channels_presence;
function rgb_mask_get_channels_presence(mask) {
    var presence = [0,0,0];
    for (var i = 0; i < 3; i++)
        if ((mask & 1<<i) > 0) {
            presence[2 - i] = 1;
        }
    return presence;
}

/**
 * Returns index of RGB channel considering channels presence
 * Channels order: R = 0, G = 1, B = 2
 */
exports.rgb_mask_get_channel_presence_index = function(mask, channel) {
    var index = 0;
    if ((channel == 1) || (channel == 2))
        if ((mask & 1<<2) > 0)
            index++;
    if (channel == 2)
        if ((mask & 1<<1) > 0)
            index++;

    return index;
}

/**
 * Generate uuid compliant with RFC 4122 version 4 (http://tools.ietf.org/html/rfc4122)
 * Taken from http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
 */
exports.gen_uuid = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

exports.get_dict_length = function(dict) {
    var count = 0;
    for (var prop in dict)
        if (dict.hasOwnProperty(prop))
            count++;
    return count;
}

exports.random_from_array = function(array) {

    if (!array.length)
        return null;

    var pos = Math.floor(Math.random() * array.length);
    return array[pos];
}

exports.xz_direction = function(a, b, dest) {

    if (!dest)
        dest = new Float32Array(3);

    dest[0] = a[0] - b[0];
    dest[1] = 0;
    dest[2] = a[2] - b[2];
    m_vec3.normalize(dest, dest);
}

/**
 * Transforms the vec3 with a quat (alternative implementation)
 *
 * @param {Vec3} out the receiving vector
 * @param {Vec3} a the vector to transform
 * @param {Quat} q quaternion to transform with
 * @returns {Vec3} out
 */
exports.transformQuatFast = function(a, q, out) {
    // nVidia SDK implementation
    var ax = a[0], ay = a[1], az = a[2];
    var qx = q[0], qy = q[1], qz = q[2], qw = q[3];

    // var qvec = [qx, qy, qz];
    // var uv = vec3.cross([], qvec, a);
    var uvx = qy * az - qz * ay,
        uvy = qz * ax - qx * az,
        uvz = qx * ay - qy * ax;

    // var uuv = vec3.cross([], qvec, uv);
    var uuvx = qy * uvz - qz * uvy,
        uuvy = qz * uvx - qx * uvz,
        uuvz = qx * uvy - qy * uvx;

    // vec3.scale(uv, uv, 2 * w);
    uvx *= qw * 2;
    uvy *= qw * 2;
    uvz *= qw * 2;

    // vec3.scale(uuv, uuv, 2);
    uuvx *= 2;
    uuvy *= 2;
    uuvz *= 2;

    // return vec3.add(out, a, vec3.add(out, uv, uuv));
    out[0] = ax + uvx + uuvx;
    out[1] = ay + uvy + uuvy;
    out[2] = az + uvz + uuvz;
    return out;
};

exports.assert = function(cond) {
    if (!cond)
        throw new Error("Assertion failed");
}

exports.panic = function(s) {
    if (s)
        m_print.error.apply(m_print, arguments);
    throw "engine panic:\n" +
          "The engine tried to perform an invalid operation and halted.\n" +
          "Please copy the console contents above and submit it to the Blend4Web forum at\n" +
          "https://www.blend4web.com/en/forums/forum/17/";
}

/**
 * Convert radian angle into range [from, to]
 */
exports.angle_wrap_periodic = angle_wrap_periodic;
function angle_wrap_periodic(angle, from, to) {
    var rel_angle = angle - from;
    var period = to - from;
    return from + (rel_angle - Math.floor(rel_angle / period) * period);
}

exports.angle_wrap_0_2pi = angle_wrap_0_2pi;
function angle_wrap_0_2pi(angle) {
    return angle_wrap_periodic(angle, 0, 2 * Math.PI);
}

exports.get_file_extension = function(file_path) {
    var re = /(?:\.([^.]+))?$/;
    return re.exec(file_path)[1];
}

/**
 * Check strictly typed objects equality: batch, render.
 * NOTE: do not check the difference between Array and TypedArray
 */
exports.strict_objs_is_equal = strict_objs_is_equal;
function strict_objs_is_equal(a, b) {
    for (var prop in a) {
        var props_is_equal = true;

        var val1 = a[prop];
        var val2 = b[prop];

        // typeof val1 == typeof val2 for strictly typed objects
        switch (typeof val1) {
        case "number":
        case "string":
        case "boolean":
            props_is_equal = val1 == val2;
            break;
        case "object":
            props_is_equal = objs_is_equal(val1, val2);
            break;
        // true for other cases ("function", "undefined")
        default:
            break;
        }

        if (!props_is_equal)
            return false;
    }

    return true;
}

/**
 * Check objects equality
 */
function objs_is_equal(a, b) {
    // checking not-null objects
    if (a && b) {
        // array checking
        var a_is_arr = a instanceof Array;
        var a_is_typed_arr = a.buffer instanceof ArrayBuffer
                && a.byteLength !== "undefined";
        var b_is_arr = b instanceof Array;
        var b_is_typed_arr = b.buffer instanceof ArrayBuffer
                && b.byteLength !== "undefined";
        if (a_is_arr != b_is_arr || a_is_typed_arr != b_is_typed_arr)
            return false;

        if (a_is_arr) {
            if (a.length != b.length)
                return false;
            for (var i = 0; i < a.length; i++)
                if (!vars_is_equal(a[i], b[i]))
                    return false;
        } else if (a_is_typed_arr) {
            if (a.length != b.length)
                return false;
            for (var i = 0; i < a.length; i++)
                if (a[i] != b[i])
                    return false;
        } else {
            for (var prop in a)
                if (!vars_is_equal(a[prop], b[prop]))
                    return false;
            for (var prop in b)
                if (!(prop in a))
                    return false;
        }
        return true;
    } else
        return !(a || b);
}

/**
 * Check variables equality
 */
function vars_is_equal(a, b) {
    if (typeof a != typeof b)
        return false;

    switch (typeof a) {
    case "number":
    case "string":
    case "boolean":
        return a == b;
    case "object":
        return objs_is_equal(a, b);
    // true for other cases ("function", "undefined")
    default:
        return true;
    }
}

exports.quat_bpy_b4w = function(quat, dest) {
    var w = quat[0];
    var x = quat[1];
    var y = quat[2];
    var z = quat[3];

    dest[0] = x;
    dest[1] = y;
    dest[2] = z;
    dest[3] = w;

    return dest;
}

exports.gen_color_id = function(counter) {

    // black reserved for background
    var counter = counter + 1;

    if (counter > 51 * 51 * 51)
        m_print.error("Color ID pool depleted");

    // 255 / 5 = 51
    var r = Math.floor(counter / (51 * 51));
    counter %= (51 * 51);
    var g = Math.floor(counter / 51);
    counter %= 51;
    var b = counter;

    var color_id = new Float32Array([r/51, g/51, b/51]);

    return color_id;
}

exports.line_plane_intersect = function(pn, p_dist, lp, l_dir, dest) {
    // four-dimensional representation of a plane
    var plane = _vec4_tmp;
    plane.set(pn);
    plane[3] = p_dist;

    // four-dimensional representation of line direction vector
    var line_dir = _vec4_tmp2;
    line_dir.set(l_dir);
    line_dir[3] = 0;

    var denominator = m_vec4.dot(plane, line_dir);

    // parallel case
    if (denominator == 0.0)
        return null;

    // four-dimensional representation of line point
    var line_point = _vec4_tmp2;
    line_point.set(lp);
    line_point[3] = 1;

    var numerator = m_vec4.dot(plane, line_point);

    var t = - numerator / denominator;

    // point of intersection
    dest[0] = lp[0] + t * l_dir[0];
    dest[1] = lp[1] + t * l_dir[1];
    dest[2] = lp[2] + t * l_dir[2];

    return dest;
}

/**
 * Calculate plane normal by 3 points through the point-normal form of the
 * plane equation
 */
exports.get_plane_normal = function(a, b, c, dest) {
    var a12 = b[0] - a[0];
    var a13 = c[0] - a[0];

    var a22 = b[1] - a[1];
    var a23 = c[1] - a[1];

    var a32 = b[2] - a[2];
    var a33 = c[2] - a[2];

    dest[0] = a22 * a33 - a32 * a23;
    dest[1] = a13 * a32 - a12 * a33;
    dest[2] = a12 * a23 - a22 * a13;

    return dest;
}

/**
 * Copy the values from one array to another
 */
exports.copy_array = function(a, out) {
    for (var i = 0; i < a.length; i++) {
        out[i] = a[i];
    }
    return out;
};

/**
 * Copied form gl-matrix.js quat.rotationTo() method.
 * Stable for input vectors which are near-parallel.
 *
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {vec3} a the initial vector
 * @param {vec3} b the destination vector
 * @returns {quat} out
 */
exports.rotation_to_stable = function(a, b, out) {
    var tmp = _vec3_tmp;
    var dot = m_vec3.dot(a, b);

    if (dot < -0.9999999) {
        m_vec3.cross(AXIS_X, a, tmp);
        if (m_vec3.length(tmp) < 0.000001)
            m_vec3.cross(AXIS_Y, a, tmp);
        m_vec3.normalize(tmp, tmp);
        m_quat.setAxisAngle(tmp, Math.PI, out);
    } else {
        m_vec3.cross(a, b, tmp);
        out.set(tmp);
        out[3] = 1 + dot;
        m_quat.normalize(out, out);
    }

    return out;
};

/**
 * Get the angle which returns current angle into range [min_angle, max_angle]
 */
exports.calc_returning_angle = function(angle, min_angle, max_angle) {
    // simple optimization
    if (min_angle == max_angle)
        return max_angle - angle;

    // convert all type of angles (phi, theta) regardless of their domain of definition
    // for simplicity
    angle = angle_wrap_0_2pi(angle);
    min_angle = angle_wrap_0_2pi(min_angle);
    max_angle = angle_wrap_0_2pi(max_angle);

    // rotate unit circle to ease calculation
    var rotation = 2 * Math.PI - min_angle;
    min_angle = 0;
    max_angle += rotation;
    max_angle = angle_wrap_0_2pi(max_angle);
    angle += rotation;
    angle = angle_wrap_0_2pi(angle);

    if (angle > max_angle) {
        // clamp to the proximal edge
        var delta_to_max = max_angle - angle;
        var delta_to_min = 2 * Math.PI - angle;
        return (- delta_to_max > delta_to_min) ? delta_to_min : delta_to_max;
    }

    // clamping not needed
    return 0;
}

exports.smooth_step = function(t, min, max) {
    if (isFinite(min) && isFinite(max))
        t = clamp(t, min, max);

    return t * t * (3.0 - 2.0 * t);
}

exports.lerp = function(t, from, to) {
    return from + t * (to - from);
}

exports.arrays_have_common = function(arr_1, arr_2) {
    for (var i = 0; i < arr_1.length; i++) {
        for (var k = 0; k < arr_2.length; k++) {
            if (arr_2[k] == arr_1[i]) {
                return true;
            }
        }
    }
    return false;
}

exports.create_zero_array = function(length) {
    var array = new Array(length);

    for (var i = 0; i < length; i++)
        array[i] = 0;

    return array;
}

exports.version_cmp = function(ver1, ver2) {
    var max_len = Math.max(ver1.length, ver2.length);

    for (var i = 0; i < max_len; i++) {
        var n1 = (i >= ver1.length) ? 0 : ver1[i];
        var n2 = (i >= ver2.length) ? 0 : ver2[i];

        var s = sign(n1 - n2);
        if (s)
            return s;
    }

    return 0;
}

/**
 * It doesn't worry about leading zeros; unappropriate for date 
 * (month, hour, minute, ...) values.
 */
exports.version_to_str = function(ver) {
    return ver.join(".");
}

exports.str_to_version = function(str) {
    return str.split(".").map(function(val){ return val | 0 });
}

exports.srgb_to_lin = function(color, dest) {
    dest[0] = Math.pow(color[0], GAMMA);
    dest[1] = Math.pow(color[1], GAMMA);
    dest[2] = Math.pow(color[2], GAMMA);
    return dest;
}

exports.lin_to_srgb = function(color, dest) {
    dest[0] = Math.pow(color[0], 1/GAMMA);
    dest[1] = Math.pow(color[1], 1/GAMMA);
    dest[2] = Math.pow(color[2], 1/GAMMA);
    return dest;
}

exports.normpath_preserve_protocol = function(dir_path) {
    var separated_str = dir_path.split('://',2);
    if (separated_str.length > 1) {
        separated_str[1] = normpath(separated_str[1]);
        return separated_str.join('://');
    } else
        return normpath(dir_path);
}

/**
 * Normalize path, based on python os.path.normpath() function
 */
function normpath(path) {
    var sep = '/';
    var empty = '';
    var dot = '.';
    var dotdot = '..';

    if (path == empty)
        return dot;

    var initial_slashes = (path.indexOf(sep) == 0) | 0;

    // allow one or two initial slashes, more than two treats as single
    if (initial_slashes && (path.indexOf(sep + sep) == 0)
            && (path.indexOf(sep + sep + sep) != 0))
        initial_slashes = 2;

    var comps = path.split(sep);
    var new_comps = [];
    for (var i = 0; i < comps.length; i++) {
        var comp = comps[i];
        if (comp == empty || comp == dot)
            continue;
        if (comp != dotdot || (!initial_slashes && !new_comps.length)
                || (new_comps.length && (new_comps[new_comps.length - 1] == dotdot)))
            new_comps.push(comp);
        else if (new_comps.length)
            new_comps.pop();
    }

    comps = new_comps;
    path = comps.join(sep);
    for (var i = 0; i < initial_slashes; i++)
        path = sep + path;

    return path || dot;
}

exports.check_npot = function(num) {
    return parseInt(num.toString(2).substr(1), 2) != 0;
}

}
