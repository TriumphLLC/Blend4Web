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
/**
 * @module 4 Dimensional Vector
 * @name vec4
 */

var GLMAT_EPSILON = 0.0000001;
var GLMAT_ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
var GLMAT_RANDOM = Math.random;

/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */

/**
 * Creates a new, empty vec4
 *
 * @returns {Vec4} a new 4D vector
 * @method module:vec4.create
 */
export function create() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    return out;
};

/**
 * Creates a new vec4 initialized with values from an existing vector
 *
 * @param {Vec4} a vector to clone
 * @returns {Vec4} a new 4D vector
 * @method module:vec4.clone
 */
export function clone(a) {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Creates a new vec4 initialized with the given values
 *
 * @param {number} x X component
 * @param {number} y Y component
 * @param {number} z Z component
 * @param {number} w W component
 * @returns {Vec4} a new 4D vector
 * @method module:vec4.fromValues
 */
export function fromValues(x, y, z, w) {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
};

/**
 * Copy the values from one vec4 to another
 *
 * @param {Vec4} a the source vector
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.copy
 */
export function copy(a, out) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Set the components of a vec4 to the given values
 *
 * @param {number} x X component
 * @param {number} y Y component
 * @param {number} z Z component
 * @param {number} w W component
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.set
 */
export function set(x, y, z, w, out) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
};

/**
 * Adds two vec4's
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.add
 */
export function add(a, b, out) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.subtract
 */
export function subtract(a, b, out) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    return out;
};

/**
 * Alias for {@link vec4.subtract}
 * @function
 * @method module:vec4.sub
 */
export {subtract as sub};

/**
 * Multiplies two vec4's
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.multiply
 */
export function multiply(a, b, out) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    out[3] = a[3] * b[3];
    return out;
};

/**
 * Alias for {@link vec4.multiply}
 * @function
 * @method module:vec4.mul
 */
export {multiply as mul};

/**
 * Divides two vec4's
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.divide
 */
export function divide(a, b, out) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    out[3] = a[3] / b[3];
    return out;
};

/**
 * Alias for {@link vec4.divide}
 * @function
 * @method module:vec4.div
 */
export {divide as div};

/**
 * Returns the minimum of two vec4's
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.min
 */
export function min(a, b, out) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    out[3] = Math.min(a[3], b[3]);
    return out;
};

/**
 * Returns the maximum of two vec4's
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.max
 */
export function max(a, b, out) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    out[3] = Math.max(a[3], b[3]);
    return out;
};

/**
 * Scales a vec4 by a scalar number
 *
 * @param {Vec4} a the vector to scale
 * @param {number} b amount to scale the vector by
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.scale
 */
export function scale(a, b, out) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    return out;
};

/**
 * Adds two vec4's after scaling the second operand by a scalar value
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @param {number} scale the amount to scale b by before adding
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.scaleAndAdd
 */
export function scaleAndAdd(a, b, scale, out) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    out[3] = a[3] + (b[3] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec4's
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {number} distance between a and b
 * @method module:vec4.distance
 */
export function distance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2],
        w = b[3] - a[3];
    return Math.sqrt(x*x + y*y + z*z + w*w);
};

/**
 * Alias for {@link vec4.distance}
 * @function
 * @method module:vec4.dist
 */
export {distance as dist};

/**
 * Calculates the squared euclidian distance between two vec4's
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {number} squared distance between a and b
 * @method module:vec4.squaredDistance
 */
export function squaredDistance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2],
        w = b[3] - a[3];
    return x*x + y*y + z*z + w*w;
};

/**
 * Alias for {@link vec4.squaredDistance}
 * @function
 * @method module:vec4.sqrDist
 */
export {squaredDistance as sqrDist};

/**
 * Calculates the length of a vec4
 *
 * @param {Vec4} a vector to calculate length of
 * @returns {number} length of a
 * @method module:vec4.length
 */
export function length(a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    return Math.sqrt(x*x + y*y + z*z + w*w);
};

/**
 * Alias for {@link vec4.length}
 * @function
 * @method module:vec4.len
 */
export {length as len};

/**
 * Calculates the squared length of a vec4
 *
 * @param {Vec4} a vector to calculate squared length of
 * @returns {number} squared length of a
 * @method module:vec4.squaredLength
 */
export function squaredLength(a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    return x*x + y*y + z*z + w*w;
};

/**
 * Alias for {@link vec4.squaredLength}
 * @function
 * @method module:vec4.sqrLen
 */
export {squaredLength as sqrLen};

/**
 * Negates the components of a vec4
 *
 * @param {Vec4} a vector to negate
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.negate
 */
export function negate(a, out) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = -a[3];
    return out;
};

/**
 * Returns the inverse of the components of a vec4
 *
 * @param {Vec4} a vector to invert
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.inverse
 */
export function inverse(a, out) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  out[3] = 1.0 / a[3];
  return out;
};

/**
 * Normalize a vec4
 *
 * @param {Vec4} a vector to normalize
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.normalize
 */
export function normalize(a, out) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    var len = x*x + y*y + z*z + w*w;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
        out[0] = x * len;
        out[1] = y * len;
        out[2] = z * len;
        out[3] = w * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec4's
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {number} dot product of a and b
 * @method module:vec4.dot
 */
export function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
};

/**
 * Performs a linear interpolation between two vec4's
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @param {number} t interpolation amount between the two inputs
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.lerp
 */
export function lerp(a, b, t, out) {
    var ax = a[0],
        ay = a[1],
        az = a[2],
        aw = a[3];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    out[3] = aw + t * (b[3] - aw);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {number} scale Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.random
 */
export function random(scale, out) {
    //TODO: This is a pretty awful way of doing exports. Find something better.
    out[0] = GLMAT_RANDOM();
    out[1] = GLMAT_RANDOM();
    out[2] = GLMAT_RANDOM();
    out[3] = GLMAT_RANDOM();
    normalize(out, out);
    scale(out, scale, out);
    return out;
};

/**
 * Transforms the vec4 with a mat4.
 *
 * @param {Vec4} a the vector to transform
 * @param {Mat4} m matrix to transform with
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.transformMat4
 */
export function transformMat4(a, m, out) {
    var x = a[0], y = a[1], z = a[2], w = a[3];
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
    out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
    return out;
};

/**
 * Transforms the vec4 with a quat
 *
 * @param {Vec4} a the vector to transform
 * @param {Quat} q quaternion to transform with
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.transformQuat
 */
export function transformQuat(a, q, out) {
    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    out[3] = a[3];
    return out;
};

/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {number} offset Number of elements to skip at the beginning of the array
 * @param {number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 * @method module:vec4.forEach
 */
export var forEach = (function() {
    var vec = create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 4;
        }

        if(!offset) {
            offset = 0;
        }
        
        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2]; vec[3] = a[i+3];
            fn(vec, arg, vec);
            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2]; a[i+3] = vec[3];
        }
        
        return a;
    };
})();

/**
 * Returns a string representation of a vector
 *
 * @param {Vec4} a vector to represent as a string
 * @returns {string} string representation of the vector
 * @method module:vec4.str
 */
export function str(a) {
    return 'vec4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};
