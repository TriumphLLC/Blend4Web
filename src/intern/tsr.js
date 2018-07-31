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
import * as m_mat4 from "../libs/gl_matrix/mat4.js";
import * as m_quat from "../libs/gl_matrix/quat.js";
import * as m_util from "./util.js";
import * as m_vec3 from "../libs/gl_matrix/vec3.js";

/**
 * TSR-8 utility functions
 * @name tsr
 * @namespace
 * @exports exports as tsr
 */

var ZUP_SIN = Math.sin(-Math.PI / 4);
var ZUP_COS = -ZUP_SIN;

var _vec3_tmp = new Float32Array(3);
var _quat_tmp = new Float32Array(4);
var _mat4_tmp = new Float32Array(16);

export function create() {
    var tsr = new Float32Array(9);
    tsr[3] = 1;
    tsr[4] = 1;
    tsr[5] = 1;
    return tsr;
}

export function clone(tsr) {
    var out = create();
    copy(tsr, out);
    return out;
}

export function from_values(x, y, z, s, qx, qy, qz, qw) {
    var tsr = create();
    tsr[0] = x;
    tsr[1] = y;
    tsr[2] = z;
    tsr[3] = s;
    tsr[4] = s;
    tsr[5] = s;

    var sign = qw < 0 ? -1: 1;
    tsr[6] = sign * qx;
    tsr[7] = sign * qy;
    tsr[8] = sign * qz;

    return tsr;
}

export function create_ext() {
    var tsr = new Float32Array(9);
    tsr[3] = 1;
    tsr[4] = 1;
    tsr[5] = 1;
    return tsr;
}

export function clone_ext(tsr) {
    var out = create_ext();
    copy(tsr, out);
    return out;
}

export function from_values_ext(x, y, z, s, qx, qy, qz, qw) {
    var tsr = create_ext();
    tsr[0] = x;
    tsr[1] = y;
    tsr[2] = z;
    tsr[3] = s;
    tsr[4] = s;
    tsr[5] = s;

    var sign = qw < 0 ? -1 : 1;
    tsr[6] = sign * qx;
    tsr[7] = sign * qy;
    tsr[8] = sign * qz;

    return tsr;
}

export function copy(tsr, dest) {
    // faster than .set()
    if (tsr[8] != tsr[8])
        throw new Error(tsr);
    dest[0] = tsr[0];
    dest[1] = tsr[1];
    dest[2] = tsr[2];
    dest[3] = tsr[3];
    dest[4] = tsr[4];
    dest[5] = tsr[5];
    dest[6] = tsr[6];
    dest[7] = tsr[7];
    dest[8] = tsr[8];
    return dest;
}

export function identity(tsr) {
    tsr[0] = 0;
    tsr[1] = 0;
    tsr[2] = 0;
    tsr[3] = 1;
    tsr[4] = 1;
    tsr[5] = 1;
    tsr[6] = 0;
    tsr[7] = 0;
    tsr[8] = 0;

    return tsr;
}

/**
 * Set from separate trans, scale and quat.
 */
export function set_sep(trans, scale, quat, dest) {
    dest[0] = trans[0];
    dest[1] = trans[1];
    dest[2] = trans[2];
    if (m_util.is_array(scale)) {
        dest[3] = scale[0];
        dest[4] = scale[1];
        dest[5] = scale[2];
    } else {
        dest[3] = scale;
        dest[4] = scale;
        dest[5] = scale;
    }
    var sign = quat[3] < 0 ? -1 : 1;
    dest[6] = sign * quat[0];
    dest[7] = sign * quat[1];
    dest[8] = sign * quat[2];

    return dest;
}

export function set_trans(trans, dest) {

    if (trans[0] != trans[0])
        throw new Error(trans);

    dest[0] = trans[0];
    dest[1] = trans[1];
    dest[2] = trans[2];

    return dest;
}
export function set_scale(scale, dest) {
    if (m_util.is_array(scale)) {
        dest[3] = scale[0];
        dest[4] = scale[1];
        dest[5] = scale[2];
    } else {
        dest[3] = scale;
        dest[4] = scale;
        dest[5] = scale;
    }

    return dest;
}
export function set_transcale(transcale, dest) {
    // NOTE: it is better don't use this function
    // console.error("B4W ERROR: tsr.set_transcale is dangerous function. Don't use it anymore!!!");
    dest[0] = transcale[0];
    dest[1] = transcale[1];
    dest[2] = transcale[2];
    dest[3] = transcale[3];

    return dest;
}

export  function set_quat(quat, dest) {
    if (quat[0] != quat[0])
        throw new Error(quat);

    var sign = quat[3] < 0 ? -1 : 1;
    dest[6] = sign * quat[0];
    dest[7] = sign * quat[1];
    dest[8] = sign * quat[2];

    return dest;
}

/**
 * NOTE: bad for CPU and GC
 * The get_trans_view method is dangerous to use.
 * Don't do this. It will be romoved later.
 */
export function get_trans_view(tsr) {
    // console.error("B4W ERROR: tsr.get_trans_view is dangerous function. Don't use it anymore!!!");
    return get_trans(tsr, m_quat.create());
}
export function get_trans(tsr, dest) {
    dest[0] = tsr[0];
    dest[1] = tsr[1];
    dest[2] = tsr[2];

    return dest;
}
export function get_scale(tsr, dest) {
    if (dest) {
        dest[0] = tsr[3];
        dest[1] = tsr[4];
        dest[2] = tsr[5];
        return dest;
    }
    return tsr[3];
}
export function get_transcale(tsr, dest) {
    // NOTE: it is better don't use this function
    // console.error("B4W ERROR: tsr.get_transcale is dangerous function. Don't use it anymore!!!");
    dest[0] = tsr[0];
    dest[1] = tsr[1];
    dest[2] = tsr[2];
    dest[3] = tsr[3];

    return dest;
}
/**
 * NOTE: bad for CPU and GC
 * The get_quat_view method is dangerous to use.
 * Don't do this. It will be romoved later.
 */
export function get_quat_view(tsr) {
    // console.error("B4W ERROR: tsr.get_quat_view is dangerous function. Don't use it anymore!!!");
    return get_quat(tsr, m_quat.create());
}

export function get_quat(tsr, dest) {
    dest[0] = tsr[6];
    dest[1] = tsr[7];
    dest[2] = tsr[8];
    dest[3] = Math.sqrt(Math.abs(1 - tsr[6] * tsr[6] - tsr[7] * tsr[7] - tsr[8] * tsr[8]));

    return dest;
}

export var invert = (function () {
    var _vec3_tmp = m_vec3.create();
    var _vec3_tmp2 = m_vec3.create();
    var _quat_tmp = m_quat.create();

    return function invert(tsr, dest) {
        var s = get_scale(tsr, _vec3_tmp);
        m_vec3.inverse(s, s);

        // CHECK: is it necessary?
        if (!s[0])
            return null;

        var t = get_trans(tsr, _vec3_tmp2);
        var q = get_quat(tsr, _quat_tmp);

        m_quat.invert(q, q);

        // scale
        m_vec3.multiply(t, s, t);
        // rotate
        m_vec3.transformQuat(t, q, t);
        // negate
        m_vec3.negate(t, t);

        set_trans(t, dest);
        set_scale(s, dest);
        set_quat(q, dest);

        return dest;
    };
})();

export var to_mat4 = (function () {
    var _vec3_tmp = m_vec3.create();
    var _vec3_tmp2 = m_vec3.create();
    var _quat_tmp = m_quat.create();

    return function to_mat4(tsr, dest) {
        var trans = get_trans(tsr, _vec3_tmp);
        var scale = get_scale(tsr, _vec3_tmp2);
        var quat = get_quat(tsr, _quat_tmp);

        m_mat4.fromRotationTranslation(quat, trans, dest);

        m_mat4.scale(dest, scale, dest);

        return dest;
    };
})();

/**
 * NOTE: not optimized
 */
export var from_mat4 = (function() {
    var _vec3_tmp = m_vec3.create();
    var _vec3_tmp2 = m_vec3.create();
    var _quat_tmp = m_quat.create();

    return function from_mat4(mat, dest) {
        var trans = m_util.matrix_to_trans(mat, _vec3_tmp);
        var scale = m_util.matrix_to_scale(mat, _vec3_tmp2);
        var quat = m_util.matrix_to_quat(mat, _quat_tmp);
        set_trans(trans, dest);
        set_scale(scale, dest);
        set_quat(quat, dest);
        return dest;
    };
})();

/**
 * Multiply two TSRs.
 */
export var multiply = (function () {
    var _vec3_tmp = m_vec3.create();
    var _vec3_tmp2 = m_vec3.create();
    var _quat_tmp = m_quat.create();
    var _quat_tmp2 = m_quat.create();

    return function multiply(tsr, tsr2, dest) {
        // trans
        var t = get_trans(tsr2, _vec3_tmp);
        transform_vec3(t, tsr, t);
        set_trans(t, dest);

        // scale
        var s = get_scale(tsr, _vec3_tmp);
        var s2 = get_scale(tsr2, _vec3_tmp2);
        var res_s = m_vec3.multiply(s, s2, _vec3_tmp);
        set_scale(res_s, dest);

        // quat
        var q = get_quat(tsr, _quat_tmp);
        var q2 = get_quat(tsr2, _quat_tmp2);
        var res_q = m_quat.multiply(q, q2, _quat_tmp);
        set_quat(res_q, dest);

        return dest;
    };
})();

/**
 * NOTE: unused, non-optimized
 */
export var transform_mat4 = (function () {
    var _mat4_tmp = m_mat4.create();

    // CHECK: parameters order!
    return function transform_mat4(matrix, tsr, dest) {
        var m = to_mat4(tsr, _mat4_tmp);

        m_mat4.multiply(m, matrix, dest);

        return dest;
    };
})();

/**
 * Transform vec3 by TSR
 */
export var transform_vec3 = (function () {
    var _vec3_tmp = m_vec3.create();
    var _vec3_tmp2 = m_vec3.create();
    var _quat_tmp = m_quat.create();

    return function transform_vec3(vec, tsr, dest) {

        var trans = get_trans(tsr, _vec3_tmp);
        var scale = get_scale(tsr, _vec3_tmp2);
        var quat = get_quat(tsr, _quat_tmp);

        // scale
        m_vec3.multiply(vec, scale, dest);

        // rotate
        m_vec3.transformQuat(dest, quat, dest);

        // translate
        m_vec3.add(dest, trans, dest);

        return dest;
    };
})();

/**
 * Transform vec3 by inverse TSR
 */
export var transform_vec3_inv = (function () {
    var _vec3_tmp = m_vec3.create();
    var _vec3_tmp2 = m_vec3.create();
    var _quat_tmp = m_quat.create();

    return function transform_vec3_inv(vec, tsr, dest) {
        var trans = get_trans(tsr, _vec3_tmp);
        var scale = get_scale(tsr, _vec3_tmp2);
        var quat = get_quat(tsr, _quat_tmp);

        m_vec3.subtract(vec, trans, dest);

        m_quat.invert(quat, quat);
        m_vec3.transformQuat(dest, quat, dest);

        m_vec3.inverse(scale, scale);
        m_vec3.multiply(dest, scale, dest);

        return dest;
    };
})();

/**
 * Tranform vec3 vectors by TSR
 * optional destination offset in values (not vectors, not bytes)
 */
export var transform_vectors = (function () {
    var _vec3_tmp = m_vec3.create();
    var _vec3_tmp2 = m_vec3.create();
    var _vec3_tmp3 = m_vec3.create();
    var _quat_tmp = m_quat.create();

    return function transform_vectors(vectors, tsr, new_vectors, dest_offset) {
        dest_offset |= 0;

        var len = vectors.length;

        var trans = get_trans(tsr, _vec3_tmp);
        var scale = get_scale(tsr, _vec3_tmp2);
        var quat = get_quat(tsr, _quat_tmp);

        var vec = _vec3_tmp3;

        for (var i = 0; i < len; i += 3) {
            vec[0] = vectors[i];
            vec[1] = vectors[i + 1];
            vec[2] = vectors[i + 2];

            // CHECK: may be it is better to replace next lines by transform_vec3
            m_vec3.multiply(vec, scale, vec);
            m_vec3.transformQuat(vec, quat, vec);
            m_vec3.add(vec, trans, vec);

            new_vectors[dest_offset + i] = vec[0];
            new_vectors[dest_offset + i + 1] = vec[1];
            new_vectors[dest_offset + i + 2] = vec[2];
        }

        return new_vectors;
    };
})();

/**
 * Transform directional vec3 vectors by TSR.
 * optional destination offset in values (not vectors, not bytes)
 */
export var transform_dir_vectors = (function () {
    var _vec3_tmp = m_vec3.create();
    var _vec3_tmp2 = m_vec3.create();
    var _quat_tmp = m_quat.create();

    return function transform_dir_vectors(vectors, tsr, new_vectors,
        dest_offset) {

        dest_offset |= 0;

        var len = vectors.length;

        var scale = get_scale(tsr, _vec3_tmp);
        var quat = get_quat(tsr, _quat_tmp);

        var vec = _vec3_tmp2;

        for (var i = 0; i < len; i += 3) {
            vec[0] = vectors[i];
            vec[1] = vectors[i + 1];
            vec[2] = vectors[i + 2];

            // CHECK: may be it is better to replace next lines by transform_dir_vec3
            m_vec3.multiply(vec, scale, vec);
            m_vec3.transformQuat(vec, quat, vec);

            new_vectors[dest_offset + i] = vec[0];
            new_vectors[dest_offset + i + 1] = vec[1];
            new_vectors[dest_offset + i + 2] = vec[2];
        }

        return new_vectors;
    };
})();

/**
 * Transform directional vec3 by TSR.
 */
export var transform_dir_vec3 = (function () {
    var _vec3_tmp = m_vec3.create();
    var _quat_tmp = m_quat.create();
    return function transform_dir_vec3(vec, tsr, new_vec) {

        var scale = get_scale(tsr, _vec3_tmp);
        var quat = get_quat(tsr, _quat_tmp);

        m_vec3.multiply(vec, scale, new_vec);
        m_vec3.transformQuat(new_vec, quat, new_vec);

        return new_vec;
    };
})();

/**
 * Tranform 4 comp tangent vectors by matrix.
 * optional destination offset in values (not vectors, not bytes)
 */
export var transform_tangents = (function () {
    var _vec3_tmp = m_vec3.create();
    var _vec3_tmp2 = m_vec3.create();
    var _quat_tmp = m_quat.create();

    return function transform_tangents(vectors, tsr, new_vectors, dest_offset) {
        dest_offset |= 0;

        var len = vectors.length;

        var scale = get_scale(tsr, _vec3_tmp);
        var quat = get_quat(tsr, _quat_tmp);

        var vec = _vec3_tmp2;

        for (var i = 0; i < len; i += 4) {
            vec = vectors[i];
            vec = vectors[i + 1];
            vec = vectors[i + 2];

            m_vec3.scale(vec, scale, vec);
            m_vec3.transformQuat(vec, quat, vec);

            new_vectors[dest_offset + i] = vec[0];
            new_vectors[dest_offset + i + 1] = vec[1];
            new_vectors[dest_offset + i + 2] = vec[2];
            // just save exact sign
            new_vectors[dest_offset + i + 3] = vectors[i + 3];
        }

        return new_vectors;
    };
})();

export function transform_quat(quat, tsr, new_quat) {
    get_quat(tsr, new_quat);

    return m_quat.multiply(new_quat, quat, new_quat);
}

/**
 * Tranform quaternions vectors by tsr.
 * optional destination offset in values (not vectors, not bytes)
 */
export var transform_quats = (function () {
    var _quat_tmp = m_quat.create();

    return function transform_quats(vectors, tsr, new_vectors, dest_offset) {

        dest_offset |= 0;

        var rot_quat = get_quat(tsr, _quat_tmp);

        m_util.quats_multiply_quat(vectors, rot_quat, new_vectors, dest_offset);

        return new_vectors;
    };
})();

/**
 * Perform TSR translation by given vec3
 */
export var translate = (function () {
    var _vec3_tmp = m_vec3.create();
    var _vec3_tmp2 = m_vec3.create();
    var _quat_tmp = m_quat.create();

    return function translate(tsr, vec, dest) {
        var trans = get_trans(tsr, _vec3_tmp);
        var scale = get_scale(tsr, _vec3_tmp2);
        var quat = get_quat(tsr, _quat_tmp);

        var offset = m_vec3.multiply(vec, scale, _vec3_tmp2);
        m_vec3.transformQuat(offset, quat, offset);

        m_vec3.add(trans, offset, trans);

        copy(tsr, dest);

        set_trans(trans, dest);

        return dest;
    };
})();

export var interpolate = (function () {
    var _vec3_tmp = m_vec3.create();
    var _vec3_tmp2 = m_vec3.create();
    var _quat_tmp = m_quat.create();
    var _quat_tmp2 = m_quat.create();

    return function interpolate(tsr, tsr2, factor, dest) {
        // linear
        var trans = get_trans(tsr, _vec3_tmp);
        var trans2 = get_trans(tsr2, _vec3_tmp2);
        var trans_dst = m_vec3.lerp(trans, trans2, factor, _vec3_tmp);
        set_trans(trans_dst, dest);

        // linear
        var scale = get_scale(tsr, _vec3_tmp);
        var scale2 = get_scale(tsr2, _vec3_tmp2);
        var scale_dst = m_vec3.lerp(trans, trans2, factor, _vec3_tmp);
        set_scale(scale_dst, dest);

        // spherical
        var quat = get_quat(tsr, _quat_tmp);
        var quat2 = get_quat(tsr2, _quat_tmp2);
        var quat_dst = m_quat.slerp(quat, quat2, factor, _quat_tmp);
        set_quat(quat_dst, dest);

        return dest;
    };
})();

/**
 * Lineary extrapolate two TSR vectors by given factor.
 * Yextr = Y1 + (Y1 - Y0) * factor = Y1 * (factor + 1) - Y0 * factor
 * NOTE: unused, untested, incomplete
 */
export var extrapolate = (function () {
    var _vec3_tmp = m_vec3.create();
    var _vec3_tmp2 = m_vec3.create();
    var _quat_tmp = m_quat.create();
    var _quat_tmp2 = m_quat.create();

    return function extrapolate(tsr, tsr2, factor, dest) {
        // linear
        var trans = get_trans(tsr, _vec3_tmp);
        var trans2 = get_trans(tsr2, _vec3_tmp2);
        var trans_dst = _vec3_tmp;
        trans_dst[0] = trans2[0] * (factor + 1) - trans[0] * factor;
        trans_dst[1] = trans2[1] * (factor + 1) - trans[1] * factor;
        trans_dst[2] = trans2[2] * (factor + 1) - trans[2] * factor;
        set_trans(trans_dst, dest);

        // linear
        var scale = get_scale(tsr, _vec3_tmp);
        var scale2 = get_scale(tsr2, _vec3_tmp2);
        var scale_dst = _vec3_tmp;
        scale_dst[0] = scale2[0] * (factor + 1) - scale[0] * factor;
        scale_dst[1] = scale2[1] * (factor + 1) - scale[1] * factor;
        scale_dst[2] = scale2[2] * (factor + 1) - scale[2] * factor;
        set_scale(scale_dst, dest);

        // NOTE: currently use linear interpolation and normalization
        var quat = get_quat(tsr, _quat_tmp);
        var quat2 = get_quat(tsr2, _quat_tmp2);
        var quat_dst = _quat_tmp;

        // NOTE: expect issues with opposed quats
        quat_dst[0] = quat2[0] * (factor + 1) - quat[0] * factor;
        quat_dst[1] = quat2[1] * (factor + 1) - quat[1] * factor;
        quat_dst[2] = quat2[2] * (factor + 1) - quat[2] * factor;
        quat_dst[3] = quat2[3] * (factor + 1) - quat[3] * factor;
        m_quat.normalize(quat_dst, quat_dst);
        set_quat(quat_dst, dest);

        return dest;
    };
})();

export var integrate = (function () {
    var _vec3_tmp = m_vec3.create();
    var _vec3_tmp2 = m_vec3.create();
    var _quat_tmp = m_quat.create();
    var _quat_tmp2 = m_quat.create();

    return function integrate(tsr, time, linvel, angvel, dest) {
        var trans = get_trans(tsr, _vec3_tmp);
        trans[0] = trans[0] + time * linvel[0];
        trans[1] = trans[1] + time * linvel[1];
        trans[2] = trans[2] + time * linvel[2];
        set_trans(trans, dest);

        // CHECK: why don't we change scale?
        var scale = get_scale(tsr, _vec3_tmp);
        set_scale(scale, dest);

        var quat = get_quat(tsr, _quat_tmp);
        // Calculate quaternion derivation dQ/dt = 0.5*W*Q
        var wx = angvel[0];
        var wy = angvel[1];
        var wz = angvel[2];
        // basic multiplication, than scale
        var quat2 = _quat_tmp2;
        quat2[0] = 0.5 * (wx * quat[3] + wy * quat[2] - wz * quat[1]);
        quat2[1] = 0.5 * (wy * quat[3] + wz * quat[0] - wx * quat[2]);
        quat2[2] = 0.5 * (wz * quat[3] + wx * quat[1] - wy * quat[0]);
        quat2[3] = 0.5 * (-wx * quat[0] - wy * quat[1] - wz * quat[2]);

        quat[0] = quat[0] + quat2[0] * time;
        quat[1] = quat[1] + quat2[1] * time;
        quat[2] = quat[2] + quat2[2] * time;
        quat[3] = quat[3] + quat2[3] * time;
        m_quat.normalize(quat, quat);
        set_quat(quat, dest);

        return dest;
    };
})();

export var to_zup_view = (function () {
    var _vec3_tmp = m_vec3.create();
    var _vec3_tmp2 = m_vec3.create();
    var _quat_tmp = m_quat.create();
    var _quat_tmp2 = m_quat.create();

    return function to_zup_view(tsr, dest) {
        var trans = get_trans(tsr, _vec3_tmp);
        set_trans(trans, dest);
        var scale = get_scale(tsr, _vec3_tmp2);
        set_scale(scale, dest);

        // rotation around global X-axis
        // sin/cos -PI/4 for -PI/2 rotation
        var quat = get_quat(tsr, _quat_tmp);
        var bx = ZUP_SIN, bw = ZUP_COS;

        var new_quat = _quat_tmp2;
        new_quat[0] = quat[0] * bw + quat[3] * bx;
        new_quat[1] = quat[1] * bw + quat[2] * bx;
        new_quat[2] = quat[2] * bw - quat[1] * bx;
        new_quat[3] = quat[3] * bw - quat[0] * bx;
        set_quat(new_quat, dest);

        return dest;
    };
})();

export var to_zup_model = (function () {
    var _vec3_tmp = m_vec3.create();
    var _quat_tmp = m_quat.create();

    return function to_zup_model(tsr, dest) {
        //location
        var trans = get_trans(tsr, _vec3_tmp);
        trans[0] = trans[0];
        trans[1] = -trans[2];
        trans[2] = trans[1];
        set_trans(trans, dest);

        //scale
        var scale = get_scale(tsr, _vec3_tmp);
        set_scale(scale, dest);

        //rot quaternion
        var quat = get_quat(tsr, _quat_tmp);
        quat[0] = quat[0];
        quat[1] = -quat[1];
        quat[2] = quat[2];
        quat[3] = quat[3];
        set_quat(quat, dest);

        return dest;
    };
})();

export function get_from_flat_array(flat_tsr_array, index, dest) {
    dest[0] = flat_tsr_array[9 * index];
    dest[1] = flat_tsr_array[9 * index + 1];
    dest[2] = flat_tsr_array[9 * index + 2];
    dest[3] = flat_tsr_array[9 * index + 3];
    dest[4] = flat_tsr_array[9 * index + 4];
    dest[5] = flat_tsr_array[9 * index + 5];
    dest[6] = flat_tsr_array[9 * index + 6];
    dest[7] = flat_tsr_array[9 * index + 7];
    dest[8] = flat_tsr_array[9 * index + 8];

    return dest;
}

export function set_to_flat_array(tsr, flat_tsr_array, index) {
    flat_tsr_array[9 * index] = tsr[0];
    flat_tsr_array[9 * index + 1] = tsr[1];
    flat_tsr_array[9 * index + 2] = tsr[2];
    flat_tsr_array[9 * index + 3] = tsr[3];
    flat_tsr_array[9 * index + 4] = tsr[4];
    flat_tsr_array[9 * index + 5] = tsr[5];
    flat_tsr_array[9 * index + 6] = tsr[6];
    flat_tsr_array[9 * index + 7] = tsr[7];
    flat_tsr_array[9 * index + 8] = tsr[8];

    return flat_tsr_array;
}