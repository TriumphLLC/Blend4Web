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
 * Auto-generated set of math modules.
 * based on glMatrix 2.1.0
 * pay attention to parameters order, quat.rotationTo() and quat.setAxes()
 */

/**
 * @module 3 Dimensional Vector
 * @name vec3
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
 * Creates a new, empty vec3
 *
 * @returns {Vec3} a new 3D vector
 * @method module:vec3.create
 */
export function create() {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
};

/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {Vec3} a vector to clone
 * @returns {Vec3} a new 3D vector
 * @method module:vec3.clone
 */
export function clone(a) {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
};

/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {number} x X component
 * @param {number} y Y component
 * @param {number} z Z component
 * @returns {Vec3} a new 3D vector
 * @method module:vec3.fromValues
 */
export function fromValues(x, y, z) {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
};

/**
 * Copy the values from one vec3 to another
 *
 * @param {Vec3} a the source vector
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.copy
 */
export function copy(a, out) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
};

/**
 * Set the components of a vec3 to the given values
 *
 * @param {number} x X component
 * @param {number} y Y component
 * @param {number} z Z component
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.set
 */
export function set(x, y, z, out) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
};

/**
 * Adds two vec3's
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.add
 */
export function add(a, b, out) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.subtract
 */
export function subtract(a, b, out) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
};

/**
 * Alias for {@link vec3.subtract}
 * @function
 * @method module:vec3.sub
 */
export {subtract as sub};

/**
 * Multiplies two vec3's
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.multiply
 */
export function multiply(a, b, out) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
};

/**
 * Alias for {@link vec3.multiply}
 * @function
 * @method module:vec3.mul
 */
export {multiply as mul};

/**
 * Divides two vec3's
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.divide
 */
export function divide(a, b, out) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    return out;
};

/**
 * Alias for {@link vec3.divide}
 * @function
 * @method module:vec3.div
 */
export {divide as div};

/**
 * Returns the minimum of two vec3's
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.min
 */
export function min(a, b, out) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    return out;
};

/**
 * Returns the maximum of two vec3's
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.max
 */
export function max(a, b, out) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    return out;
};

/**
 * Scales a vec3 by a scalar number
 *
 * @param {Vec3} a the vector to scale
 * @param {number} b amount to scale the vector by
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.scale
 */
export function scale(a, b, out) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    return out;
};

/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @param {number} scale the amount to scale b by before adding
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.scaleAndAdd
 */
export function scaleAndAdd(a, b, scale, out) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @returns {number} distance between a and b
 * @method module:vec3.distance
 */
export function distance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2];
    return Math.sqrt(x*x + y*y + z*z);
};

/**
 * Alias for {@link vec3.distance}
 * @function
 * @method module:vec3.dist
 */
export {distance as dist};

/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @returns {number} squared distance between a and b
 * @method module:vec3.squaredDistance
 */
export function squaredDistance(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2];
    return x*x + y*y + z*z;
};

/**
 * Alias for {@link vec3.squaredDistance}
 * @function
 * @method module:vec3.sqrDist
 */
export {squaredDistance as sqrDist};

/**
 * Calculates the length of a vec3
 *
 * @param {Vec3} a vector to calculate length of
 * @returns {number} length of a
 * @method module:vec3.length
 */
export function length(a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    return Math.sqrt(x*x + y*y + z*z);
};

/**
 * Alias for {@link vec3.length}
 * @function
 * @method module:vec3.len
 */
export {length as len};

/**
 * Calculates the squared length of a vec3
 *
 * @param {Vec3} a vector to calculate squared length of
 * @returns {number} squared length of a
 * @method module:vec3.squaredLength
 */
export function squaredLength(a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    return x*x + y*y + z*z;
};

/**
 * Alias for {@link vec3.squaredLength}
 * @function
 * @method module:vec3.sqrLen
 */
export {squaredLength as sqrLen};

/**
 * Negates the components of a vec3
 *
 * @param {Vec3} a vector to negate
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.negate
 */
export function negate(a, out) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    return out;
};

/**
 * Returns the inverse of the components of a vec3
 *
 * @param {Vec3} a vector to invert
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.inverse
 */
export function inverse(a, out) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  return out;
};

/**
 * Normalize a vec3
 *
 * @param {Vec3} a vector to normalize
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.normalize
 */
export function normalize(a, out) {
    var x = a[0],
        y = a[1],
        z = a[2];
    var len = x*x + y*y + z*z;
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
        out[2] = a[2] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec3's
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @returns {number} dot product of a and b
 * @method module:vec3.dot
 */
export function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

/**
 * Computes the cross product of two vec3's
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.cross
 */
export function cross(a, b, out) {
    var ax = a[0], ay = a[1], az = a[2],
        bx = b[0], by = b[1], bz = b[2];

    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
};

/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @param {number} t interpolation amount between the two inputs
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.lerp
 */
export function lerp(a, b, t, out) {
    var ax = a[0],
        ay = a[1],
        az = a[2];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    return out;
};

/**
 * Performs a hermite interpolation with two control points
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @param {Vec3} c the third operand
 * @param {Vec3} d the fourth operand
 * @param {number} t interpolation amount between the two inputs
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.hermite
 */
export function hermite(a, b, c, d, t, out) {
  var factorTimes2 = t * t,
      factor1 = factorTimes2 * (2 * t - 3) + 1,
      factor2 = factorTimes2 * (t - 2) + t,
      factor3 = factorTimes2 * (t - 1),
      factor4 = factorTimes2 * (3 - 2 * t);
  
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  
  return out;
};

/**
 * Performs a bezier interpolation with two control points
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @param {Vec3} c the third operand
 * @param {Vec3} d the fourth operand
 * @param {number} t interpolation amount between the two inputs
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.bezier
 */
export function bezier(a, b, c, d, t, out) {
  var inverseFactor = 1 - t,
      inverseFactorTimesTwo = inverseFactor * inverseFactor,
      factorTimes2 = t * t,
      factor1 = inverseFactorTimesTwo * inverseFactor,
      factor2 = 3 * t * inverseFactorTimesTwo,
      factor3 = 3 * factorTimes2 * inverseFactor,
      factor4 = factorTimes2 * t;
  
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  
  return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {number} scale Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.random
 */
export function random(scale, out) {
    var r = GLMAT_RANDOM() * 2.0 * Math.PI;
    var z = (GLMAT_RANDOM() * 2.0) - 1.0;
    var zScale = Math.sqrt(1.0-z*z) * scale;

    out[0] = Math.cos(r) * zScale;
    out[1] = Math.sin(r) * zScale;
    out[2] = z * scale;
    return out;
};

/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {Vec3} a the vector to transform
 * @param {Mat4} m matrix to transform with
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.transformMat4
 */
export function transformMat4(a, m, out) {
    var x = a[0], y = a[1], z = a[2],
        w = m[3] * x + m[7] * y + m[11] * z + m[15];
    w = w || 1.0;
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    return out;
};

/**
 * Transforms the vec3 with a mat3.
 *
 * @param {Vec3} a the vector to transform
 * @param {Mat4} m the 3x3 matrix to transform with
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.transformMat3
 */
export function transformMat3(a, m, out) {
    var x = a[0], y = a[1], z = a[2];
    out[0] = x * m[0] + y * m[3] + z * m[6];
    out[1] = x * m[1] + y * m[4] + z * m[7];
    out[2] = x * m[2] + y * m[5] + z * m[8];
    return out;
};

/**
 * Transforms the vec3 with a quat
 *
 * @param {Vec3} a the vector to transform
 * @param {Quat} q quaternion to transform with
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.transformQuat
 */
export function transformQuat(a, q, out) {
    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations

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
    return out;
};

/**
 * Rotate a 3D vector around the x-axis
 * @param {Vec3} a The vec3 point to rotate
 * @param {Vec3} b The origin of the rotation
 * @param {number} c The angle of rotation
 * @returns {Vec3} out
 * @param {Vec3} out The receiving vec3
 * @method module:vec3.rotateX
 */
export function rotateX(a, b, c, out){
   var p = [], r=[];
	  //Translate point to the origin
	  p[0] = a[0] - b[0];
	  p[1] = a[1] - b[1];
  	p[2] = a[2] - b[2];

	  //perform rotation
	  r[0] = p[0];
	  r[1] = p[1]*Math.cos(c) - p[2]*Math.sin(c);
	  r[2] = p[1]*Math.sin(c) + p[2]*Math.cos(c);

	  //translate to correct position
	  out[0] = r[0] + b[0];
	  out[1] = r[1] + b[1];
	  out[2] = r[2] + b[2];

  	return out;
};

/**
 * Rotate a 3D vector around the y-axis
 * @param {Vec3} a The vec3 point to rotate
 * @param {Vec3} b The origin of the rotation
 * @param {number} c The angle of rotation
 * @returns {Vec3} out
 * @param {Vec3} out The receiving vec3
 * @method module:vec3.rotateY
 */
export function rotateY(a, b, c, out){
  	var p = [], r=[];
  	//Translate point to the origin
  	p[0] = a[0] - b[0];
  	p[1] = a[1] - b[1];
  	p[2] = a[2] - b[2];
  
  	//perform rotation
  	r[0] = p[2]*Math.sin(c) + p[0]*Math.cos(c);
  	r[1] = p[1];
  	r[2] = p[2]*Math.cos(c) - p[0]*Math.sin(c);
  
  	//translate to correct position
  	out[0] = r[0] + b[0];
  	out[1] = r[1] + b[1];
  	out[2] = r[2] + b[2];
  
  	return out;
};

/**
 * Rotate a 3D vector around the z-axis
 * @param {Vec3} a The vec3 point to rotate
 * @param {Vec3} b The origin of the rotation
 * @param {number} c The angle of rotation
 * @returns {Vec3} out
 * @param {Vec3} out The receiving vec3
 * @method module:vec3.rotateZ
 */
export function rotateZ(a, b, c, out){
  	var p = [], r=[];
  	//Translate point to the origin
  	p[0] = a[0] - b[0];
  	p[1] = a[1] - b[1];
  	p[2] = a[2] - b[2];
  
  	//perform rotation
  	r[0] = p[0]*Math.cos(c) - p[1]*Math.sin(c);
  	r[1] = p[0]*Math.sin(c) + p[1]*Math.cos(c);
  	r[2] = p[2];
  
  	//translate to correct position
  	out[0] = r[0] + b[0];
  	out[1] = r[1] + b[1];
  	out[2] = r[2] + b[2];
  
  	return out;
};

/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {number} offset Number of elements to skip at the beginning of the array
 * @param {number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 * @method module:vec3.forEach
 */
export var forEach = (function() {
    var vec = create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 3;
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
            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2];
            fn(vec, arg, vec);
            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2];
        }
        
        return a;
    };
})();

/**
 * Get the angle between two 3D vectors
 * @param {Vec3} a The first operand
 * @param {Vec3} b The second operand
 * @returns {number} The angle in radians
 * @method module:vec3.angle
 */
export function angle(a, b) {
   
    var tempA = fromValues(a[0], a[1], a[2]);
    var tempB = fromValues(b[0], b[1], b[2]);
 
    normalize(tempA, tempA);
    normalize(tempB, tempB);
 
    var cosine = dot(tempA, tempB);

    if(cosine > 1.0){
        return 0;
    } else {
        return Math.acos(cosine);
    }     
};

/**
 * Returns a string representation of a vector
 *
 * @param {Vec3} a vector to represent as a string
 * @returns {string} string representation of the vector
 * @method module:vec3.str
 */
export function str(a) {
    return 'vec3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';
};
