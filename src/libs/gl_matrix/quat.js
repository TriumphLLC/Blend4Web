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
import * as vec3 from "./vec3.js";
import * as vec4 from "./vec4.js";
import * as mat3 from "./mat3.js";

/**
 * @module Quaternion
 * @name quat
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
 * Creates a new identity quat
 *
 * @returns {Quat} a new quaternion
 * @method module:quat.create
 */
export function create() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {Vec3} a the initial vector
 * @param {Vec3} b the destination vector
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion.
 * @method module:quat.rotationTo
 */
export var rotationTo = (function() {
    var tmpvec3 = vec3.create();
    var xUnitVec3 = vec3.fromValues(1,0,0);
    var yUnitVec3 = vec3.fromValues(0,1,0);

    return function(a, b, out) {
        var dot = vec3.dot(a, b);
        if (dot < -0.9999999) {
            vec3.cross(xUnitVec3, a, tmpvec3); /* NOTE: CUSTOM REORDER: (tmpvec3, xUnitVec3, a)->(xUnitVec3, a ,tmpvec3) */
            if (vec3.length(tmpvec3) < 0.000001)
                vec3.cross(yUnitVec3, a, tmpvec3); /* NOTE: CUSTOM REORDER: (tmpvec3, yUnitVec3, a)->(yUnitVec3, a ,tmpvec3) */
            vec3.normalize(tmpvec3, tmpvec3);
            setAxisAngle(tmpvec3, Math.PI, out); /* NOTE: CUSTOM REORDER: (out, tmpvec3, Math.PI)->(tmpvec3, Math.PI ,out)*/
            return out;
        } else if (dot > 0.9999999) {
            out[0] = 0;
            out[1] = 0;
            out[2] = 0;
            out[3] = 1;
            return out;
        } else {
            vec3.cross(a, b, tmpvec3); /* NOTE: CUSTOM REORDER: (tmpvec3, a, b)->(a, b ,tmpvec3) */
            out[0] = tmpvec3[0];
            out[1] = tmpvec3[1];
            out[2] = tmpvec3[2];
            out[3] = 1 + dot;
            return vec4.normalize(out, out);
        }
    };
})();

/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {Vec3} view  the vector representing the viewing direction
 * @param {Vec3} right the vector representing the local "right" direction
 * @param {Vec3} up    the vector representing the local "up" direction
 * @returns {Quat} out
 * @method module:quat.setAxes
 */
export var setAxes = (function() {
    var matr = mat3.create();

    return function(view, right, up, out) {
        matr[0] = right[0];
        matr[3] = right[1];
        matr[6] = right[2];

        matr[1] = up[0];
        matr[4] = up[1];
        matr[7] = up[2];

        matr[2] = -view[0];
        matr[5] = -view[1];
        matr[8] = -view[2];

        return vec4.normalize(fromMat3(matr, out), out); /* NOTE: DOUBLE CUSTOM REORDER */
    };
})();

/**
 * Creates a new quat initialized with values from an existing quaternion
 *
 * @param {Quat} a quaternion to clone
 * @returns {Quat} a new quaternion
 * @function
 * @method module:quat.clone
 */
export {clone} from "./vec4.js";

/**
 * Creates a new quat initialized with the given values
 *
 * @param {number} x X component
 * @param {number} y Y component
 * @param {number} z Z component
 * @param {number} w W component
 * @returns {Quat} a new quaternion
 * @function
 * @method module:quat.fromValues
 */
export {fromValues} from "./vec4.js";

/**
 * Copy the values from one quat to another
 *
 * @param {Quat} a the source quaternion
 * @returns {Quat} out
 * @function
 * @param {Quat} out the receiving quaternion
 * @method module:quat.copy
 */
export {copy} from "./vec4.js";

/**
 * Set the components of a quat to the given values
 *
 * @param {number} x X component
 * @param {number} y Y component
 * @param {number} z Z component
 * @param {number} w W component
 * @returns {Quat} out
 * @function
 * @param {Quat} out the receiving quaternion
 * @method module:quat.set
 */
export {set} from "./vec4.js";

/**
 * Set a quat to the identity quaternion
 *
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.identity
 */
export function identity(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {Vec3} axis the axis around which to rotate
 * @param {number} rad the angle in radians
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.setAxisAngle
 */
export function setAxisAngle(axis, rad, out) {
    rad = rad * 0.5;
    var s = Math.sin(rad);
    out[0] = s * axis[0];
    out[1] = s * axis[1];
    out[2] = s * axis[2];
    out[3] = Math.cos(rad);
    return out;
};

/**
 * Adds two quat's
 *
 * @param {Quat} a the first operand
 * @param {Quat} b the second operand
 * @returns {Quat} out
 * @function
 * @param {Quat} out the receiving quaternion
 * @method module:quat.add
 */
export {add} from "./vec4.js";

/**
 * Multiplies two quat's
 *
 * @param {Quat} a the first operand
 * @param {Quat} b the second operand
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.multiply
 */
export function multiply(a, b, out) {
    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = b[0], by = b[1], bz = b[2], bw = b[3];

    out[0] = ax * bw + aw * bx + ay * bz - az * by;
    out[1] = ay * bw + aw * by + az * bx - ax * bz;
    out[2] = az * bw + aw * bz + ax * by - ay * bx;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
};

/**
 * Alias for {@link quat.multiply}
 * @function
 * @method module:quat.mul
 */
export {multiply as mul};

/**
 * Scales a quat by a scalar number
 *
 * @param {Quat} a the vector to scale
 * @param {number} b amount to scale the vector by
 * @returns {Quat} out
 * @function
 * @param {Quat} out the receiving vector
 * @method module:quat.scale
 */
export {scale} from "./vec4.js";

/**
 * Rotates a quaternion by the given angle about the X axis
 *
 * @param {Quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {Quat} out
 * @param {Quat} out quat receiving operation result
 * @method module:quat.rotateX
 */
export function rotateX(a, rad, out) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw + aw * bx;
    out[1] = ay * bw + az * bx;
    out[2] = az * bw - ay * bx;
    out[3] = aw * bw - ax * bx;
    return out;
};

/**
 * Rotates a quaternion by the given angle about the Y axis
 *
 * @param {Quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {Quat} out
 * @param {Quat} out quat receiving operation result
 * @method module:quat.rotateY
 */
export function rotateY(a, rad, out) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        by = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw - az * by;
    out[1] = ay * bw + aw * by;
    out[2] = az * bw + ax * by;
    out[3] = aw * bw - ay * by;
    return out;
};

/**
 * Rotates a quaternion by the given angle about the Z axis
 *
 * @param {Quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {Quat} out
 * @param {Quat} out quat receiving operation result
 * @method module:quat.rotateZ
 */
export function rotateZ(a, rad, out) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bz = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw + ay * bz;
    out[1] = ay * bw - ax * bz;
    out[2] = az * bw + aw * bz;
    out[3] = aw * bw - az * bz;
    return out;
};

/**
 * Calculates the W component of a quat from the X, Y, and Z components.
 * Assumes that quaternion is 1 unit in length.
 * Any existing W component will be ignored.
 *
 * @param {Quat} a quat to calculate W component of
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.calculateW
 */
export function calculateW(a, out) {
    var x = a[0], y = a[1], z = a[2];

    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
    return out;
};

/**
 * Calculates the dot product of two quat's
 *
 * @param {Quat} a the first operand
 * @param {Quat} b the second operand
 * @returns {number} dot product of a and b
 * @function
 * @method module:quat.dot
 */
export {dot} from "./vec4.js";

/**
 * Performs a linear interpolation between two quat's
 *
 * @param {Quat} a the first operand
 * @param {Quat} b the second operand
 * @param {number} t interpolation amount between the two inputs
 * @returns {Quat} out
 * @function
 * @param {Quat} out the receiving quaternion
 * @method module:quat.lerp
 */
export {lerp} from "./vec4.js";

/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {Quat} a the first operand
 * @param {Quat} b the second operand
 * @param {number} t interpolation amount between the two inputs
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.slerp
 */
export function slerp(a, b, t, out) {
    // benchmarks:
    //    http://jsperf.com/quaternion-slerp-implementations

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = b[0], by = b[1], bz = b[2], bw = b[3];

    var        omega, cosom, sinom, scale0, scale1;

    // calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    // adjust signs (if necessary)
    if ( cosom < 0.0 ) {
        cosom = -cosom;
        bx = - bx;
        by = - by;
        bz = - bz;
        bw = - bw;
    }
    // calculate coefficients
    if ( (1.0 - cosom) > 0.000001 ) {
        // standard case (slerp)
        omega  = Math.acos(cosom);
        sinom  = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {        
        // "from" and "to" quaternions are very close 
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
    }
    // calculate final values
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;
    
    return out;
};

/**
 * Performs a spherical linear interpolation with two control points
 *
 * @param {Quat} a the first operand
 * @param {Quat} b the second operand
 * @param {Quat} c the third operand
 * @param {Quat} d the fourth operand
 * @param {number} t interpolation amount
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.sqlerp
 */
export var sqlerp = (function () {
  var temp1 = create();
  var temp2 = create();
  
  return function (a, b, c, d, t, out) {
    slerp(a, d, t, temp1); /* NOTE: CUSTOM REORDER: */
    slerp(b, c, t, temp2); /* NOTE: CUSTOM REORDER: */
    slerp(temp1, temp2, 2 * t * (1 - t), out); /* NOTE: CUSTOM REORDER:*/
    
    return out;
  };
}());

/**
 * Calculates the inverse of a quat
 *
 * @param {Quat} a quat to calculate inverse of
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.invert
 */
export function invert(a, out) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        dot = a0*a0 + a1*a1 + a2*a2 + a3*a3,
        invDot = dot ? 1.0/dot : 0;
    
    // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

    out[0] = -a0*invDot;
    out[1] = -a1*invDot;
    out[2] = -a2*invDot;
    out[3] = a3*invDot;
    return out;
};

/**
 * Calculates the conjugate of a quat
 * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
 *
 * @param {Quat} a quat to calculate conjugate of
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.conjugate
 */
export function conjugate(a, out) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a[3];
    return out;
};

/**
 * Calculates the length of a quat
 *
 * @param {Quat} a vector to calculate length of
 * @returns {number} length of a
 * @function
 * @method module:quat.length
 */
export {length} from "./vec4.js";

/**
 * Alias for {@link quat.length}
 * @function
 * @method module:quat.len
 */
export {length as len} from "./vec4.js";

/**
 * Calculates the squared length of a quat
 *
 * @param {Quat} a vector to calculate squared length of
 * @returns {number} squared length of a
 * @function
 * @method module:quat.squaredLength
 */
export {squaredLength} from "./vec4.js";

/**
 * Alias for {@link quat.squaredLength}
 * @function
 * @method module:quat.sqrLen
 */
export {squaredLength as sqrLen} from "./vec4.js";

/**
 * Normalize a quat
 *
 * @param {Quat} a quaternion to normalize
 * @returns {Quat} out
 * @function
 * @param {Quat} out the receiving quaternion
 * @method module:quat.normalize
 */
export {normalize} from "./vec4.js";

/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {Mat3} m rotation matrix
 * @param {Quat} out the receiving quaternion
 * @returns {Quat} out
 * @function
 * @method module:quat.fromMat3
 */
export function fromMat3(m, out) {
    // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
    // article "Quaternion Calculus and Fast Animation".
    var fTrace = m[0] + m[4] + m[8];
    var fRoot;

    if ( fTrace > 0.0 ) {
        // |w| > 1/2, may as well choose w > 1/2
        fRoot = Math.sqrt(fTrace + 1.0);  // 2w
        out[3] = 0.5 * fRoot;
        fRoot = 0.5/fRoot;  // 1/(4w)
        out[0] = (m[5]-m[7])*fRoot;
        out[1] = (m[6]-m[2])*fRoot;
        out[2] = (m[1]-m[3])*fRoot;
    } else {
        // |w| <= 1/2
        var i = 0;
        if ( m[4] > m[0] )
          i = 1;
        if ( m[8] > m[i*3+i] )
          i = 2;
        var j = (i+1)%3;
        var k = (i+2)%3;
        
        fRoot = Math.sqrt(m[i*3+i]-m[j*3+j]-m[k*3+k] + 1.0);
        out[i] = 0.5 * fRoot;
        fRoot = 0.5 / fRoot;
        out[3] = (m[j*3+k] - m[k*3+j]) * fRoot;
        out[j] = (m[j*3+i] + m[i*3+j]) * fRoot;
        out[k] = (m[k*3+i] + m[i*3+k]) * fRoot;
    }
    
    return out;
};

/**
 * Returns a string representation of a quatenion
 *
 * @param {Quat} a vector to represent as a string
 * @returns {string} string representation of the vector
 * @method module:quat.str
 */
export function str(a) {
    return 'quat(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};
