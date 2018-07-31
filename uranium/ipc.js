/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 10);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export create */
/* unused harmony export clone */
/* unused harmony export fromValues */
/* harmony export (immutable) */ __webpack_exports__["a"] = copy;
/* unused harmony export set */
/* unused harmony export add */
/* unused harmony export subtract */
/* unused harmony export sub */
/* unused harmony export multiply */
/* unused harmony export mul */
/* unused harmony export divide */
/* unused harmony export div */
/* unused harmony export min */
/* unused harmony export max */
/* harmony export (immutable) */ __webpack_exports__["e"] = scale;
/* unused harmony export scaleAndAdd */
/* unused harmony export distance */
/* unused harmony export dist */
/* unused harmony export squaredDistance */
/* unused harmony export sqrDist */
/* harmony export (immutable) */ __webpack_exports__["c"] = length;
/* unused harmony export len */
/* unused harmony export squaredLength */
/* unused harmony export sqrLen */
/* unused harmony export negate */
/* unused harmony export inverse */
/* harmony export (immutable) */ __webpack_exports__["d"] = normalize;
/* harmony export (immutable) */ __webpack_exports__["b"] = dot;
/* unused harmony export lerp */
/* unused harmony export random */
/* harmony export (immutable) */ __webpack_exports__["f"] = transformMat4;
/* unused harmony export transformQuat */
/* unused harmony export forEach */
/* unused harmony export str */
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
function create() {
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
function clone(a) {
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
function fromValues(x, y, z, w) {
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
function copy(a, out) {
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
function set(x, y, z, w, out) {
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
function add(a, b, out) {
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
function subtract(a, b, out) {
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


/**
 * Multiplies two vec4's
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.multiply
 */
function multiply(a, b, out) {
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


/**
 * Divides two vec4's
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.divide
 */
function divide(a, b, out) {
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


/**
 * Returns the minimum of two vec4's
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.min
 */
function min(a, b, out) {
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
function max(a, b, out) {
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
function scale(a, b, out) {
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
function scaleAndAdd(a, b, scale, out) {
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
function distance(a, b) {
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


/**
 * Calculates the squared euclidian distance between two vec4's
 *
 * @param {Vec4} a the first operand
 * @param {Vec4} b the second operand
 * @returns {number} squared distance between a and b
 * @method module:vec4.squaredDistance
 */
function squaredDistance(a, b) {
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


/**
 * Calculates the length of a vec4
 *
 * @param {Vec4} a vector to calculate length of
 * @returns {number} length of a
 * @method module:vec4.length
 */
function length(a) {
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


/**
 * Calculates the squared length of a vec4
 *
 * @param {Vec4} a vector to calculate squared length of
 * @returns {number} squared length of a
 * @method module:vec4.squaredLength
 */
function squaredLength(a) {
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


/**
 * Negates the components of a vec4
 *
 * @param {Vec4} a vector to negate
 * @returns {Vec4} out
 * @param {Vec4} out the receiving vector
 * @method module:vec4.negate
 */
function negate(a, out) {
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
function inverse(a, out) {
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
function normalize(a, out) {
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
function dot(a, b) {
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
function lerp(a, b, t, out) {
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
function random(scale, out) {
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
function transformMat4(a, m, out) {
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
function transformQuat(a, q, out) {
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
var forEach = (function() {
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
function str(a) {
    return 'vec4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};


/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__b4w_js__ = __webpack_require__(3);


var _factories = {};

// TODO: assign export_functions into module_context to allow old module system to work.
/* harmony default export */ __webpack_exports__["a"] = (function(module_name, module_context, export_functions) {
  var _ns = {};
  var is_internal = module_name.split("").slice(0, 2).join("") == "__";
  function internal_factory() {
    return function (ns) {
      ns = ns || "__b4w_default";

      if (_ns[ns] !== undefined) {
        return _ns[ns];
      }

      _ns[ns] = is_internal ? {} : internal_factory();
      module_context(ns, _ns[ns]);

      return _ns[ns];
    };
  };

  if (_factories[module_name] !== undefined) {
    return _factories[module_name];
  } else {
    // FIXME: the next code is bad. PLZ understand and forgive me
    var factory = is_internal ? internal_factory() : internal_factory()();

    __WEBPACK_IMPORTED_MODULE_0__b4w_js__["a" /* default */]._n_module[module_name] = _factories[module_name] = factory;

    return factory;
  }
});


/***/ }),
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["c"] = create;
/* unused harmony export clone */
/* harmony export (immutable) */ __webpack_exports__["f"] = fromValues;
/* harmony export (immutable) */ __webpack_exports__["b"] = copy;
/* harmony export (immutable) */ __webpack_exports__["n"] = set;
/* harmony export (immutable) */ __webpack_exports__["a"] = add;
/* harmony export (immutable) */ __webpack_exports__["o"] = subtract;
/* unused harmony export sub */
/* harmony export (immutable) */ __webpack_exports__["j"] = multiply;
/* unused harmony export mul */
/* unused harmony export divide */
/* unused harmony export div */
/* unused harmony export min */
/* unused harmony export max */
/* harmony export (immutable) */ __webpack_exports__["m"] = scale;
/* unused harmony export scaleAndAdd */
/* unused harmony export distance */
/* unused harmony export dist */
/* unused harmony export squaredDistance */
/* unused harmony export sqrDist */
/* harmony export (immutable) */ __webpack_exports__["h"] = length;
/* unused harmony export len */
/* unused harmony export squaredLength */
/* unused harmony export sqrLen */
/* harmony export (immutable) */ __webpack_exports__["k"] = negate;
/* harmony export (immutable) */ __webpack_exports__["g"] = inverse;
/* harmony export (immutable) */ __webpack_exports__["l"] = normalize;
/* harmony export (immutable) */ __webpack_exports__["e"] = dot;
/* harmony export (immutable) */ __webpack_exports__["d"] = cross;
/* harmony export (immutable) */ __webpack_exports__["i"] = lerp;
/* unused harmony export hermite */
/* unused harmony export bezier */
/* unused harmony export random */
/* harmony export (immutable) */ __webpack_exports__["q"] = transformMat4;
/* harmony export (immutable) */ __webpack_exports__["p"] = transformMat3;
/* harmony export (immutable) */ __webpack_exports__["r"] = transformQuat;
/* unused harmony export rotateX */
/* unused harmony export rotateY */
/* unused harmony export rotateZ */
/* unused harmony export forEach */
/* unused harmony export angle */
/* unused harmony export str */
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
function create() {
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
function clone(a) {
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
function fromValues(x, y, z) {
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
function copy(a, out) {
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
function set(x, y, z, out) {
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
function add(a, b, out) {
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
function subtract(a, b, out) {
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


/**
 * Multiplies two vec3's
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.multiply
 */
function multiply(a, b, out) {
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


/**
 * Divides two vec3's
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.divide
 */
function divide(a, b, out) {
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


/**
 * Returns the minimum of two vec3's
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.min
 */
function min(a, b, out) {
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
function max(a, b, out) {
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
function scale(a, b, out) {
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
function scaleAndAdd(a, b, scale, out) {
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
function distance(a, b) {
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


/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {Vec3} a the first operand
 * @param {Vec3} b the second operand
 * @returns {number} squared distance between a and b
 * @method module:vec3.squaredDistance
 */
function squaredDistance(a, b) {
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


/**
 * Calculates the length of a vec3
 *
 * @param {Vec3} a vector to calculate length of
 * @returns {number} length of a
 * @method module:vec3.length
 */
function length(a) {
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


/**
 * Calculates the squared length of a vec3
 *
 * @param {Vec3} a vector to calculate squared length of
 * @returns {number} squared length of a
 * @method module:vec3.squaredLength
 */
function squaredLength(a) {
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


/**
 * Negates the components of a vec3
 *
 * @param {Vec3} a vector to negate
 * @returns {Vec3} out
 * @param {Vec3} out the receiving vector
 * @method module:vec3.negate
 */
function negate(a, out) {
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
function inverse(a, out) {
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
function normalize(a, out) {
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
function dot(a, b) {
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
function cross(a, b, out) {
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
function lerp(a, b, t, out) {
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
function hermite(a, b, c, d, t, out) {
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
function bezier(a, b, c, d, t, out) {
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
function random(scale, out) {
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
function transformMat4(a, m, out) {
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
function transformMat3(a, m, out) {
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
function transformQuat(a, q, out) {
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
function rotateX(a, b, c, out){
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
function rotateY(a, b, c, out){
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
function rotateZ(a, b, c, out){
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
var forEach = (function() {
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
function angle(a, b) {
   
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
function str(a) {
    return 'vec3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';
};


/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/**
 * Object in 3D space.
 * You should always use the engine's API in order to manipulate your 3D object.
 * Never access it directly by it's properties.
 * @typedef {Object} Object3D
 */

/**
 * Sensor object.
 * @typedef {Object} Sensor
 * @see {@link module:controls}
 */

/**
 * Typed two-dimensional vector.
 * @typedef {Float32Array} Vec2
 */

/**
 * Typed three-dimensional vector. Can be created with {@link module:vec3.create}.
 * @typedef {Float32Array} Vec3
 */

/**
 * Constant value matching character state (flying, walking etc).
 * @typedef {number} CharacterState
 */

/**
 * Line set in parametric form
 * @typedef {Float32Array(6)} ParametricLine
 */

/**
 * Typed four-dimensional vector. Can be created with {@link module:vec4.create}.
 * @typedef {Float32Array} Vec4
 */

/**
 * Quaternion vector representing rotation.
 * Quaternion is a four-dimensional vector which has the following format:
 * [X, Y, Z, W]. Can be created with {@link module:quat.create}.
 * @typedef {Float32Array} Quat
 */

/**
 * Euler vector representing rotation (in radians).
 * <!--
 * <p>The euler angles specified in intrinsic form (rotating space) and have the following meaning:
 * <ul>
 * TODO: check it!!!
 * <li>euler[0]: heading, around Y
 * <li>euler[1]: attitude, around new Z
 * <li>euler[2]: bank, around new X
 * </ul>
 * -->
 * <p>Using euler angles is discouraged, use quaternions instead.
 * @typedef {Float32Array} Euler
 */

/**
 * TSR vector representing 3D object's transformations (Translation, Scale, Rotation).
 * TSR is an eight-dimensional vector which has the following format:
 * [X, Y, Z, SCALE, QUAT_X, QUAT_Y, QUAT_Z, QUAT_W].
 * Can be created with {@link module:tsr.create}.
 * @typedef {Float32Array} TSR
 */

/**
 * 3x3 matrix.
 * The elements of matrix are placed in typed array in column-major order.
 * Can be created with {@link module:mat3.create}.
 * @typedef {Float32Array} Mat3
 */

/**
 * 4x4 matrix.
 * The elements of matrix are placed in typed array in column-major order.
 * Can be created with {@link module:mat4.create}.
 * @typedef {Float32Array} Mat4
 */

/**
 * Typed three-dimensional vector representing color.
 * Each component must be in range 0-1.
 * Can be created with {@link module:rgb.create}.
 * @typedef {Float32Array} RGB
 */

/**
 * Typed four-dimensional vector representing color and alpha.
 * Each component must be in range 0-1.
 * Can be created with {@link module:rgba.create}.
 * @typedef {Float32Array} RGBA
 */

/**
 * The JavaScript Date object.
 * @typedef {Object} Date
 */

/**
 * Camera movement style enum. One of MS_*.
 * @typedef {number} CameraMoveStyle
 * @see {@link module:camera}
 */

/**
 * Generic callback function with no parameters.
 * @callback GenericCallback
 */

/**
 * Blend4Web global object.
 * @namespace
 * @suppress {duplicate}
 */

// HACK: get b4w from global object
var b4w;
var is_worker = false;
try {
    b4w = window.b4w;
} catch (e) {
    b4w = self.b4w;
    is_worker = true
}

if (!b4w) {

    var b4w = {};
    // TODO elaborate b4w access from the console
    var DEBUG = true;
    if (DEBUG) {
        if (is_worker) {
            self.b4w = b4w;
        } else {
            window.b4w = b4w;
        }
    }

    var _module = {};
    var _n_module = {};

    b4w.module = _module;
    b4w._n_module = _n_module;

    // require functions per namespace
    var _ns_requires = {};

    b4w.cleanup = function (module_id, ns) {
        ns = ns || "__b4w_default";
        var mod = _module[module_id];
        if (mod)
            mod._compiled = null;
        _ns_requires[ns] = null;
    }
    /**
     * Local (module internal) require function.
     * This function is passed to the module implementation function and can be used
     * to import additional modules from the same namespace. If you need to import
     * a module from the different namespace use {@link b4w.require}.
     * @typedef {Function} b4w~RequireFunction
     * @param {string} module_id Module ID
     */

    /**
     * Module implementation function.
     * @callback b4w~ModuleFunction
     * @param {Object} exports Object with exported symbols
     * @param {b4w~RequireFunction} require Local (module internal) require function
     */

    /**
     * Register the module.
     * @method b4w.register
     * @param {string} module_id Module ID
     * @param {b4w~ModuleFunction} fun Function implementing the module
     */
    b4w.register = function (module_id, fun) {
        if (_module[module_id])
            return;
        //throw new Error("Module \"" + module_id + "\" already registered");

        _module[module_id] = fun;
    }

    /**
     * Prepare and return the registered module.
     * @method b4w.require
     * @param {string} module_id Module ID
     * @param {string} [ns="__b4w_default"] Namespace for processed modules
     * @returns {Object3D} Module object
     */
    b4w.require = function (module_id, ns) {
        if (!_module[module_id] && !_n_module[module_id])
            throw new Error("Module \"" + module_id + "\" not found");

        ns = ns || "__b4w_default";
        if (_n_module[module_id] !== undefined) {
            return _n_module[module_id](ns);
        } else if (!_ns_requires[ns]) {
            _ns_requires[ns] = (function (ns) {
                return function (module_id) {
                    if (!_module[module_id] && !_n_module[module_id]) {
                        throw new Error("Module \"" + module_id + "\" not found");
                    }

                    if (_n_module[module_id] !== undefined) {
                        return _n_module[module_id](ns);
                    }

                    var mod = _module[module_id];

                    if (!mod._compiled)
                        mod._compiled = {};

                    if (!mod._compiled[ns]) {
                        mod._compiled[ns] = {};
                        mod(mod._compiled[ns], _ns_requires[ns]);
                    }
                    return mod._compiled[ns];
                }
            })(ns);
        }

        return _ns_requires[ns](module_id);
    }

    /**
     * Check if the module was registered.
     * @method b4w.module_check
     * @param {string} module_id Module ID
     * @returns {boolean} Check result
     */
    b4w.module_check = function (module_id) {
        return _module[module_id] !== undefined ||
            _n_module[module_id] !== undefined;
    }

    /**
     * Get a namespace of the current module by it's require function.
     * @method b4w.get_namespace
     * @param {b4w~RequireFunction} mod_ns_require Local require function
     * @returns {string} Namespace.
     */
    b4w.get_namespace = function (mod_ns_require) {
        // TODO: fix for ES6 modules
        for (var ns in _ns_requires)
            if (_ns_requires[ns] == mod_ns_require)
                return ns;
        return "";
    }

    /**
     * Global vars for proper worker fallback operations.
     * @ignore
     */
    b4w.worker_listeners = [];
    b4w.worker_namespaces = [];
}

/* harmony default export */ __webpack_exports__["a"] = (b4w);

/***/ }),
/* 4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["b"] = create;
/* harmony export (immutable) */ __webpack_exports__["c"] = fromMat4;
/* unused harmony export clone */
/* harmony export (immutable) */ __webpack_exports__["a"] = copy;
/* harmony export (immutable) */ __webpack_exports__["e"] = identity;
/* harmony export (immutable) */ __webpack_exports__["g"] = transpose;
/* unused harmony export invert */
/* unused harmony export adjoint */
/* unused harmony export determinant */
/* harmony export (immutable) */ __webpack_exports__["f"] = multiply;
/* unused harmony export mul */
/* unused harmony export translate */
/* unused harmony export rotate */
/* unused harmony export scale */
/* unused harmony export fromTranslation */
/* unused harmony export fromRotation */
/* unused harmony export fromScaling */
/* unused harmony export fromMat2d */
/* harmony export (immutable) */ __webpack_exports__["d"] = fromQuat;
/* unused harmony export normalFromMat4 */
/* unused harmony export str */
/* unused harmony export frob */
/**
 * @module 3x3 Matrix
 * @name mat3
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
 * Creates a new identity mat3
 *
 * @returns {Mat3} a new 3x3 matrix
 * @method module:mat3.create
 */
function create() {
    var out = new GLMAT_ARRAY_TYPE(9);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
};

/**
 * Copies the upper-left 3x3 values into the given mat3.
 *
 * @param {Mat4} a   the source 4x4 matrix
 * @returns {Mat3} out
 * @param {Mat3} out the receiving 3x3 matrix
 * @method module:mat3.fromMat4
 */
function fromMat4(a, out) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[4];
    out[4] = a[5];
    out[5] = a[6];
    out[6] = a[8];
    out[7] = a[9];
    out[8] = a[10];
    return out;
};

/**
 * Creates a new mat3 initialized with values from an existing matrix
 *
 * @param {Mat3} a matrix to clone
 * @returns {Mat3} a new 3x3 matrix
 * @method module:mat3.clone
 */
function clone(a) {
    var out = new GLMAT_ARRAY_TYPE(9);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Copy the values from one mat3 to another
 *
 * @param {Mat3} a the source matrix
 * @returns {Mat3} out
 * @param {Mat3} out the receiving matrix
 * @method module:mat3.copy
 */
function copy(a, out) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Set a mat3 to the identity matrix
 *
 * @returns {Mat3} out
 * @param {Mat3} out the receiving matrix
 * @method module:mat3.identity
 */
function identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
};

/**
 * Transpose the values of a mat3
 *
 * @param {Mat3} a the source matrix
 * @returns {Mat3} out
 * @param {Mat3} out the receiving matrix
 * @method module:mat3.transpose
 */
function transpose(a, out) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a12 = a[5];
        out[1] = a[3];
        out[2] = a[6];
        out[3] = a01;
        out[5] = a[7];
        out[6] = a02;
        out[7] = a12;
    } else {
        out[0] = a[0];
        out[1] = a[3];
        out[2] = a[6];
        out[3] = a[1];
        out[4] = a[4];
        out[5] = a[7];
        out[6] = a[2];
        out[7] = a[5];
        out[8] = a[8];
    }
    
    return out;
};

/**
 * Inverts a mat3
 *
 * @param {Mat3} a the source matrix
 * @returns {Mat3} out
 * @param {Mat3} out the receiving matrix
 * @method module:mat3.invert
 */
function invert(a, out) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b01 = a22 * a11 - a12 * a21,
        b11 = -a22 * a10 + a12 * a20,
        b21 = a21 * a10 - a11 * a20,

        // Calculate the determinant
        det = a00 * b01 + a01 * b11 + a02 * b21;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
    return out;
};

/**
 * Calculates the adjugate of a mat3
 *
 * @param {Mat3} a the source matrix
 * @returns {Mat3} out
 * @param {Mat3} out the receiving matrix
 * @method module:mat3.adjoint
 */
function adjoint(a, out) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    out[0] = (a11 * a22 - a12 * a21);
    out[1] = (a02 * a21 - a01 * a22);
    out[2] = (a01 * a12 - a02 * a11);
    out[3] = (a12 * a20 - a10 * a22);
    out[4] = (a00 * a22 - a02 * a20);
    out[5] = (a02 * a10 - a00 * a12);
    out[6] = (a10 * a21 - a11 * a20);
    out[7] = (a01 * a20 - a00 * a21);
    out[8] = (a00 * a11 - a01 * a10);
    return out;
};

/**
 * Calculates the determinant of a mat3
 *
 * @param {Mat3} a the source matrix
 * @returns {number} determinant of a
 * @method module:mat3.determinant
 */
function determinant(a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
};

/**
 * Multiplies two mat3's
 *
 * @param {Mat3} a the first operand
 * @param {Mat3} b the second operand
 * @returns {Mat3} out
 * @param {Mat3} out the receiving matrix
 * @method module:mat3.multiply
 */
function multiply(a, b, out) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b00 = b[0], b01 = b[1], b02 = b[2],
        b10 = b[3], b11 = b[4], b12 = b[5],
        b20 = b[6], b21 = b[7], b22 = b[8];

    out[0] = b00 * a00 + b01 * a10 + b02 * a20;
    out[1] = b00 * a01 + b01 * a11 + b02 * a21;
    out[2] = b00 * a02 + b01 * a12 + b02 * a22;

    out[3] = b10 * a00 + b11 * a10 + b12 * a20;
    out[4] = b10 * a01 + b11 * a11 + b12 * a21;
    out[5] = b10 * a02 + b11 * a12 + b12 * a22;

    out[6] = b20 * a00 + b21 * a10 + b22 * a20;
    out[7] = b20 * a01 + b21 * a11 + b22 * a21;
    out[8] = b20 * a02 + b21 * a12 + b22 * a22;
    return out;
};

/**
 * Alias for {@link mat3.multiply}
 * @function
 * @method module:mat3.mul
 */


/**
 * Translate a mat3 by the given vector
 *
 * @param {Mat3} a the matrix to translate
 * @param {vec2} v vector to translate by
 * @returns {Mat3} out
 * @param {Mat3} out the receiving matrix
 * @method module:mat3.translate
 */
function translate(a, v, out) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],
        x = v[0], y = v[1];

    out[0] = a00;
    out[1] = a01;
    out[2] = a02;

    out[3] = a10;
    out[4] = a11;
    out[5] = a12;

    out[6] = x * a00 + y * a10 + a20;
    out[7] = x * a01 + y * a11 + a21;
    out[8] = x * a02 + y * a12 + a22;
    return out;
};

/**
 * Rotates a mat3 by the given angle
 *
 * @param {Mat3} a the matrix to rotate
 * @param {number} rad the angle to rotate the matrix by
 * @returns {Mat3} out
 * @param {Mat3} out the receiving matrix
 * @method module:mat3.rotate
 */
function rotate(a, rad, out) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        s = Math.sin(rad),
        c = Math.cos(rad);

    out[0] = c * a00 + s * a10;
    out[1] = c * a01 + s * a11;
    out[2] = c * a02 + s * a12;

    out[3] = c * a10 - s * a00;
    out[4] = c * a11 - s * a01;
    out[5] = c * a12 - s * a02;

    out[6] = a20;
    out[7] = a21;
    out[8] = a22;
    return out;
};

/**
 * Scales the mat3 by the dimensions in the given vec2
 *
 * @param {Mat3} a the matrix to rotate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {Mat3} out
 * @param {Mat3} out the receiving matrix
 * @method module:mat3.scale
 */
function scale(a, v, out) {
    var x = v[0], y = v[1];

    out[0] = x * a[0];
    out[1] = x * a[1];
    out[2] = x * a[2];

    out[3] = y * a[3];
    out[4] = y * a[4];
    out[5] = y * a[5];

    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat3.identity(dest);
 *     mat3.translate(dest, dest, vec);
 *
 * @param {vec2} v Translation vector
 * @returns {Mat3} out
 * @param {Mat3} out mat3 receiving operation result
 * @method module:mat3.fromTranslation
 */
function fromTranslation(v, out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = v[0];
    out[7] = v[1];
    out[8] = 1;
    return out;
}

/**
 * Creates a matrix from a given angle
 * This is equivalent to (but much faster than):
 *
 *     mat3.identity(dest);
 *     mat3.rotate(dest, dest, rad);
 *
 * @param {number} rad the angle to rotate the matrix by
 * @returns {Mat3} out
 * @param {Mat3} out mat3 receiving operation result
 * @method module:mat3.fromRotation
 */
function fromRotation(rad, out) {
    var s = Math.sin(rad), c = Math.cos(rad);

    out[0] = c;
    out[1] = s;
    out[2] = 0;

    out[3] = -s;
    out[4] = c;
    out[5] = 0;

    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
}

/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat3.identity(dest);
 *     mat3.scale(dest, dest, vec);
 *
 * @param {vec2} v Scaling vector
 * @returns {Mat3} out
 * @param {Mat3} out mat3 receiving operation result
 * @method module:mat3.fromScaling
 */
function fromScaling(v, out) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;

    out[3] = 0;
    out[4] = v[1];
    out[5] = 0;

    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
}

/**
 * Copies the values from a mat2d into a mat3
 *
 * @param {mat2d} a the matrix to copy
 * @returns {Mat3} out
 * @param {Mat3} out the receiving matrix
 * @method module:mat3.fromMat2d
 */
function fromMat2d(a, out) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = 0;

    out[3] = a[2];
    out[4] = a[3];
    out[5] = 0;

    out[6] = a[4];
    out[7] = a[5];
    out[8] = 1;
    return out;
};

/**
* Calculates a 3x3 matrix from the given quaternion
*
* @param {Quat} q Quaternion to create matrix from
*
* @returns {Mat3} out
* @param {Mat3} out mat3 receiving operation result
  * @method module:mat3.fromQuat
  */
function fromQuat(q, out) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        yx = y * x2,
        yy = y * y2,
        zx = z * x2,
        zy = z * y2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - yy - zz;
    out[3] = yx - wz;
    out[6] = zx + wy;

    out[1] = yx + wz;
    out[4] = 1 - xx - zz;
    out[7] = zy - wx;

    out[2] = zx - wy;
    out[5] = zy + wx;
    out[8] = 1 - xx - yy;

    return out;
};

/**
* Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
*
* @param {Mat4} a Mat4 to derive the normal matrix from
*
* @returns {Mat3} out
* @param {Mat3} out mat3 receiving operation result
  * @method module:mat3.normalFromMat4
  */
function normalFromMat4(a, out) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;

    out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;

    out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;

    return out;
};

/**
 * Returns a string representation of a mat3
 *
 * @param {Mat3} a matrix to represent as a string
 * @returns {string} string representation of the matrix
 * @method module:mat3.str
 */
function str(a) {
    return 'mat3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + 
                    a[3] + ', ' + a[4] + ', ' + a[5] + ', ' + 
                    a[6] + ', ' + a[7] + ', ' + a[8] + ')';
};

/**
 * Returns Frobenius norm of a mat3
 *
 * @param {Mat3} a the matrix to calculate Frobenius norm of
 * @returns {number} Frobenius norm
 * @method module:mat3.frob
 */
function frob(a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2)))
};


/***/ }),
/* 5 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__register_js__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__intern_util_js__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__intern_print_js__ = __webpack_require__(9);

// TODO: add context-dependent m_print





function Assert(ns, exports) {
var m_print = Object(__WEBPACK_IMPORTED_MODULE_2__intern_print_js__["a" /* default */])(ns);

var _equal_last_obj = null;
var _equal_init = false;

exports.panic = panic;
function panic(s) {
    if (s)
        m_print.error.apply(m_print, arguments);
    throw "engine panic:\n" +
            "The engine tried to perform an invalid operation and halted.\n" +
            "Please copy the console contents above and submit it to the Blend4Web forum at\n" +
            "https://www.blend4web.com/en/forums/forum/17/";
}

exports.assert = function(cond) {
    if (!cond)
        panic("Assertion failed");
}

exports.is_constructor = function(value, constructor) {
    if (value.constructor != constructor)
        panic("Type assertion failed: value <" + value + "> has type <"
                + value.constructor + ">, required <" + constructor + ">");
}

/**
 * Check whether the two objects have the same structure with proper values.
 * Renamed: assert_struct => equal
 */
exports.equal = equal;
function equal(obj1, obj2) {

    if (!is_valid(obj1))
        panic("Structure assertion failed: invalid first object value");

    if (!is_valid(obj2))
        panic("Structure assertion failed: invalid second object value");

    if (!cmp_type(obj1, obj2))
        panic("Structure assertion failed: incompatible types");

    // continue with objects
    if (!(obj1 != null && obj2 != null && typeof obj1 == "object" &&
                !__WEBPACK_IMPORTED_MODULE_1__intern_util_js__["b" /* is_arr_buf_view */](obj1) && !(obj1 instanceof Array)))
        return;

    for (var i in obj1) {
        if (!is_valid(obj1[i]))
            panic("Structure assertion failed: invalid value for key " +
                    "in the first object: " + i);
        if (!(i in obj2))
            panic("Structure assertion failed: missing key in the first object: " + i);
    }

    for (var i in obj2) {
        if (!is_valid(obj2[i]))
            panic("Structure assertion failed: invalid value for key " +
                    "in the second object: " + i);
        if (!(i in obj1))
            panic("Structure assertion failed: missing key in the second object: " + i);
        if (!cmp_type(obj1[i], obj2[i]))
            panic("Structure assertion failed: incompatible types for key " + i);
    }
}

function is_valid(obj) {
    if (typeof obj == "undefined")
        return false;
    else if (typeof obj == "number" && isNaN(obj))
        return false;
    else
        return true;
}

function cmp_type(obj1, obj2) {
    var type1 = typeof obj1;
    var type2 = typeof obj2;

    if (type1 != type2)
        return false;

    // additional checks for js arrays or array buffers
    if (obj1 != null && obj2 != null && typeof obj1 == "object") {
        var is_arr1 = obj1 instanceof Array;
        var is_arr2 = obj2 instanceof Array;

        if ((is_arr1 && !is_arr2) || (!is_arr1 && is_arr2))
            return false;

        var is_abv1 = __WEBPACK_IMPORTED_MODULE_1__intern_util_js__["b" /* is_arr_buf_view */](obj1);
        var is_abv2 = __WEBPACK_IMPORTED_MODULE_1__intern_util_js__["b" /* is_arr_buf_view */](obj2);

        if ((is_abv1 && !is_abv2) || (!is_abv1 && is_abv2))
            return false;
    }

    return true;
}

/**
 * Assert object stucture - sequential form.
 * There is no cleanup, so always reload the page.
 */
exports.equal_seq = function(obj) {
    if (!_equal_init)
        _equal_init = true;
    else
        equal(obj, _equal_last_obj);

    if (obj != null && typeof obj == "object")
        _equal_last_obj = __WEBPACK_IMPORTED_MODULE_1__intern_util_js__["a" /* clone_object_nr */](obj);
    else
        _equal_last_obj = obj;
}

}

var assert_fact = Object(__WEBPACK_IMPORTED_MODULE_0__register_js__["a" /* default */])("assert", Assert);
/* harmony default export */ __webpack_exports__["a"] = (assert_fact);


/***/ }),
/* 6 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export VEC3_IDENT */
/* unused harmony export QUAT4_IDENT */
/* unused harmony export TSR8_IDENT */
/* unused harmony export TSR_IDENT */
/* unused harmony export VEC3_UNIT */
/* unused harmony export AXIS_X */
/* unused harmony export AXIS_Y */
/* unused harmony export AXIS_Z */
/* unused harmony export AXIS_MX */
/* unused harmony export AXIS_MY */
/* unused harmony export AXIS_MZ */
/* unused harmony export XYX */
/* unused harmony export YZY */
/* unused harmony export ZXZ */
/* unused harmony export XZX */
/* unused harmony export YXY */
/* unused harmony export ZYZ */
/* unused harmony export XYZ */
/* unused harmony export YZX */
/* unused harmony export ZXY */
/* unused harmony export XZY */
/* unused harmony export YXZ */
/* unused harmony export ZYX */
/* harmony export (immutable) */ __webpack_exports__["c"] = is_array;
/* unused harmony export INV_CUBE_VIEW_MATRS */
/* unused harmony export BYTE_SIZE */
/* unused harmony export SHORT_SIZE */
/* unused harmony export FLOAT_SIZE */
/* unused harmony export INT_SIZE */
/* unused harmony export isdef */
/* unused harmony export keyfind */
/* unused harmony export f32 */
/* unused harmony export float32_concat */
/* unused harmony export uint32_concat */
/* unused harmony export check_endians */
/* unused harmony export array_intersect */
/* unused harmony export sign */
/* unused harmony export keycheck */
/* unused harmony export keysearch */
/* unused harmony export key2search */
/* unused harmony export get_index_for_key_value */
/* unused harmony export append_unique */
/* unused harmony export check_uniqueness */
/* unused harmony export trans_matrix */
/* unused harmony export rand_r */
/* unused harmony export init_rand_r_seed */
/* unused harmony export euler_to_quat */
/* unused harmony export ordered_angles_to_quat */
/* unused harmony export quat_to_ordered_angles */
/* unused harmony export euler_to_rotation_matrix */
/* unused harmony export quat_to_euler */
/* unused harmony export quat_to_dir */
/* unused harmony export dir_to_quat */
/* unused harmony export trans_quat_to_plane */
/* unused harmony export blend_arrays */
/* unused harmony export clone_object_r */
/* harmony export (immutable) */ __webpack_exports__["a"] = clone_object_nr;
/* harmony export (immutable) */ __webpack_exports__["d"] = matrix_to_quat;
/* harmony export (immutable) */ __webpack_exports__["f"] = matrix_to_trans;
/* harmony export (immutable) */ __webpack_exports__["e"] = matrix_to_scale;
/* unused harmony export extract_frustum_planes */
/* unused harmony export sphere_is_out_of_frustum */
/* unused harmony export ellipsoid_is_out_of_frustum */
/* unused harmony export positions_multiply_matrix */
/* unused harmony export vectors_multiply_matrix */
/* harmony export (immutable) */ __webpack_exports__["g"] = quats_multiply_quat;
/* unused harmony export vecdir_multiply_matrix */
/* unused harmony export flatten */
/* unused harmony export vectorize */
/* unused harmony export binary_search_max */
/* unused harmony export cmp_arr */
/* unused harmony export cmp_arr_float */
/* unused harmony export scale_mat4 */
/* unused harmony export transform_mat4 */
/* unused harmony export transform_vec3 */
/* unused harmony export transform_vec4 */
/* unused harmony export inverse_transform_vec3 */
/* unused harmony export transcale_quat_to_matrix */
/* unused harmony export matrix_to_transcale_quat */
/* unused harmony export array_stringify */
/* unused harmony export rotate_point_pivot */
/* unused harmony export generate_cubemap_matrices */
/* unused harmony export generate_inv_cubemap_matrices */
/* unused harmony export hash_code_string */
/* unused harmony export mat3_to_mat4 */
/* unused harmony export quat_to_angle_axis */
/* unused harmony export trunc */
/* unused harmony export deg_to_rad */
/* unused harmony export rad_to_deg */
/* unused harmony export snoise */
/* unused harmony export cellular2x2 */
/* unused harmony export quat_project */
/* unused harmony export cam_quat_to_mesh_quat */
/* unused harmony export clamp */
/* unused harmony export smooth */
/* unused harmony export smooth_v */
/* unused harmony export smooth_q */
/* harmony export (immutable) */ __webpack_exports__["b"] = is_arr_buf_view;
/* unused harmony export is_vector */
/* unused harmony export correct_cam_quat_up */
/* unused harmony export get_array_smooth_value */
/* unused harmony export rgb_mask_get_channels_count */
/* unused harmony export rgb_mask_get_channels_presence */
/* unused harmony export rgb_mask_get_channel_presence_index */
/* unused harmony export gen_uuid */
/* unused harmony export get_dict_length */
/* unused harmony export random_from_array */
/* unused harmony export horizontal_direction */
/* unused harmony export transformQuatFast */
/* unused harmony export angle_wrap_periodic */
/* unused harmony export angle_wrap_0_2pi */
/* unused harmony export strict_objs_is_equal */
/* unused harmony export quat_bpy_b4w */
/* unused harmony export line_plane_intersect */
/* unused harmony export get_plane_normal */
/* unused harmony export copy_array */
/* unused harmony export rotation_to_stable */
/* unused harmony export calc_returning_angle */
/* unused harmony export smooth_step */
/* unused harmony export lerp */
/* unused harmony export arrays_have_common */
/* unused harmony export create_zero_array */
/* unused harmony export version_cmp */
/* unused harmony export version_to_str */
/* unused harmony export str_to_version */
/* unused harmony export srgb_to_lin */
/* unused harmony export lin_to_srgb */
/* unused harmony export check_npot */
/* unused harmony export ellipsoid_axes_to_mat3 */
/* unused harmony export create_non_smi_array */
/* unused harmony export float_to_short */
/* unused harmony export short_to_float */
/* unused harmony export ufloat_to_ubyte */
/* unused harmony export ubyte_to_ufloat */
/* unused harmony export dist_to_triange */
/* unused harmony export rotate_quat */
/* unused harmony export quat_rotate_to_target */
/* unused harmony export quat_set_vertical_axis */
/* unused harmony export compatible_euler */
/* unused harmony export rotate_eul */
/* unused harmony export quat_to_eul_opt */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat3_js__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__math_js__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__tsr_js__ = __webpack_require__(13);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__libs_gl_matrix_vec4_js__ = __webpack_require__(0);








/**
 * Utility functions.
 * @name util
 * @namespace
 * @exports exports as util
 */

// for internal usage
var _vec3_tmp = new Float32Array(3);
var _vec3_tmp2 = new Float32Array(3);
var _vec3_tmp3 = new Float32Array(3);
var _vec3_tmp4 = new Float32Array(3);
var _vec3_tmp5 = new Float32Array(3);
var _vec3_tmp6 = new Float32Array(3);
var _vec3_tmp7 = new Float32Array(3);
var _vec3_tmp8 = new Float32Array(3);
var _vec4_tmp = new Float32Array(4);
var _vec4_tmp2 = new Float32Array(4);
var _mat3_tmp = new Float32Array(9);
var _mat3_tmp2 = new Float32Array(9);
var _mat3_tmp3 = new Float32Array(9);
var _mat4_tmp = new Float32Array(16);
var _mat4_tmp2 = new Float32Array(16);
var _quat_tmp = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["b" /* create */]();
var _quat_tmp2 = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["b" /* create */]();

var  VEC3_IDENT = new Float32Array([0,0,0]);
var QUAT4_IDENT = new Float32Array([0,0,0,1]);
// TSR8_IDENT deprecated. It is better to use TSR_IDENT
var TSR8_IDENT = __WEBPACK_IMPORTED_MODULE_4__tsr_js__["a" /* create */]();
var TSR_IDENT = __WEBPACK_IMPORTED_MODULE_4__tsr_js__["a" /* create */]();
var VEC3_UNIT = new Float32Array([1,1,1]);

var AXIS_X = new Float32Array([1, 0, 0]);
var AXIS_Y = new Float32Array([0, 1, 0]);
var AXIS_Z = new Float32Array([0, 0, 1]);
var AXIS_MX = new Float32Array([-1, 0, 0]);
var AXIS_MY = new Float32Array([ 0,-1, 0]);
var AXIS_MZ = new Float32Array([ 0, 0,-1]);

var XYX = 0;
var YZY = 1;
var ZXZ = 2;
var XZX = 3;
var YXY = 4;
var ZYZ = 5;
var XYZ = 6;
var YZX = 7;
var ZXY = 8;
var XZY = 9;
var YXZ = 10;
var ZYX = 11;

var ARRAY_EXPR = new RegExp("object .*Array");
function is_array(arg) {
    return ARRAY_EXPR.test(Object.prototype.toString.call(arg));
}

var PROPER_EULER_ANGLES_LIST = [XYX, YZY, ZXZ, YXY, ZYZ];

var DEFAULT_SEED = 50000;
var RAND_A = 48271;
var RAND_M = 2147483647;
var RAND_R = RAND_M % RAND_A;
var RAND_Q = Math.floor(RAND_M / RAND_A);

// view matrixes representing 6 cube sides
var INV_CUBE_VIEW_MATRS =
    [new Float32Array([ 0, 0, -1, 0, 0, -1,  0, 0, -1,  0,  0, 0, 0, 0, 0, 1]),
     new Float32Array([ 0, 0,  1, 0, 0, -1,  0, 0,  1,  0,  0, 0, 0, 0, 0, 1]),
     new Float32Array([ 1, 0,  0, 0, 0,  0, -1, 0,  0,  1,  0, 0, 0, 0, 0, 1]),
     new Float32Array([ 1, 0,  0, 0, 0,  0,  1, 0,  0, -1,  0, 0, 0, 0, 0, 1]),
     new Float32Array([ 1, 0,  0, 0, 0, -1,  0, 0,  0,  0, -1, 0, 0, 0, 0, 1]),
     new Float32Array([-1, 0,  0, 0, 0, -1,  0, 0,  0,  0,  1, 0, 0, 0, 0, 1])];

var GAMMA = 2.2;

var BYTE_SIZE = 1;
var SHORT_SIZE = 2;
var FLOAT_SIZE = 4;
var INT_SIZE = 4;

function isdef(v) {
    return (typeof v != "undefined");
}

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

function f32(arr) {
    return new Float32Array(arr);
}

/**
 * Arrays concatenation.
 */
function float32_concat(first, second) {
    var firstLength = first.length;
    var result = new Float32Array(firstLength + second.length);

    result.set(first);
    result.set(second, firstLength);

    return result;
}

function uint32_concat(first, second) {
    var firstLength = first.length;
    var result = new Uint32Array(firstLength + second.length);

    result.set(first);
    result.set(second, firstLength);

    return result;
}

/**
 * @returns {boolean} True if we have a little-endian architecture.
 */
function check_endians() {

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
function array_intersect(arr1, arr2) {
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
 * @returns {number} Signum function from argument
 */
function sign(value) {
    return (value > 0) ? 1 : (value < 0 ? -1 : 0);
}

/**
 * Check if an object with a given key:value is present in the array.
 */
function keycheck(key, value, array) {
    var len = array.length;

    for (var i = 0; i < len; i++) {
        var obj = array[i];
        if (obj[key] == value)
            return true;
    }
    return false;
}

function keysearch(key, value, array) {
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
function key2search(key1, value1, key2, value2, array) {
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
function get_index_for_key_value(array, key, value) {
    for (var i = 0; i < array.length; i++)
        if (array[i][key] == value)
            return i;
    return -1;
}

/**
 * Append to array unique values
 */
function append_unique(array, value) {

    for (var i = 0; i < array.length; i++)
        if (array[i] == value)
            return;

    array.push(value);
}

/**
 * Check if all elements in array is unique.
 */
function check_uniqueness(array) {

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
function trans_matrix(x, y, z, dest) {

    if (!dest)
        dest = new Float32Array(16);

    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["c" /* identity */](dest);

    dest[12] = x;
    dest[13] = y;
    dest[14] = z;

    return dest;
}

/**
 * Pseudo random number generator.
 * (Lehmer Generator)
 */
function rand_r(seedp) {
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
function init_rand_r_seed(seed_number, dest) {
    if (!dest)
        dest = [];

    dest[0] = DEFAULT_SEED + Math.floor(seed_number);
    return dest;
}

/**
 * <p>Translate BLENDER euler to BLENDER quat
 */
function euler_to_quat(euler, quat) {
    // reorder angles from XYZ to ZYX
    var angles = _vec3_tmp;
    angles[0] = euler[2];
    angles[1] = euler[1];
    angles[2] = euler[0];

    ordered_angles_to_quat(angles, ZYX, quat);

    return quat;
}


/**
 * Translate Euler angles in the intrinsic rotation sequence to quaternion
 * Source: Appendix A of http://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/19770024290.pdf
 */
function ordered_angles_to_quat(angles, order, quat) {
    var alpha   = angles[0];
    var beta    = angles[1];
    var gamma   = angles[2];

    var c1 = Math.cos(alpha / 2);
    var c2 = Math.cos(beta  / 2);
    var c3 = Math.cos(gamma / 2);
    var s1 = Math.sin(alpha / 2);
    var s2 = Math.sin(beta  / 2);
    var s3 = Math.sin(gamma / 2);

    if (PROPER_EULER_ANGLES_LIST.indexOf(order) > -1) {
        var c13  = Math.cos((alpha + gamma) / 2);
        var s13  = Math.sin((alpha + gamma) / 2);
        var c1_3 = Math.cos((alpha - gamma) / 2);
        var s1_3 = Math.sin((alpha - gamma) / 2);
        var c3_1 = Math.cos((gamma - alpha) / 2);
        var s3_1 = Math.sin((gamma - alpha) / 2);
    }

    switch(order) {
    case XYX:
        quat[0] = c2 * s13;
        quat[1] = s2 * c1_3;
        quat[2] = s2 * s1_3;
        quat[3] = c2 * c13;
        break;
    case YZY:
        quat[0] = s2 * s1_3;
        quat[1] = c2 * s13;
        quat[2] = s2 * c1_3;
        quat[3] = c2 * c13;
        break;
    case ZXZ:
        quat[0] = s2 * c1_3;
        quat[1] = s2 * s1_3;
        quat[2] = c2 * s13;
        quat[3] = c2 * c13;
        break;
    case XZX:
        quat[0] = c2 * s13;
        quat[1] = s2 * s3_1;
        quat[2] = s2 * c3_1;
        quat[3] = c2 * c13;
        break;
    case YXY:
        quat[0] = s2 * c3_1;
        quat[1] = c2 * s13;
        quat[2] = s2 * s3_1;
        quat[3] = c2 * c13;
        break;
    case ZYZ:
        quat[0] = s2 * s3_1;
        quat[1] = s2 * c3_1;
        quat[2] = c2 * s13;
        quat[3] = c2 * c13;
        break;
    case XYZ:
        quat[0] = s1 * c2 * c3 + c1 * s2 * s3;
        quat[1] = c1 * s2 * c3 - s1 * c2 * s3;
        quat[2] = c1 * c2 * s3 + s1 * s2 * c3;
        quat[3] = c1 * c2 * c3 - s1 * s2 * s3;
        break;
    case YZX:
        quat[0] = c1 * c2 * s3 + s1 * s2 * c3;
        quat[1] = s1 * c2 * c3 + c1 * s2 * s3;
        quat[2] = c1 * s2 * c3 - s1 * c2 * s3;
        quat[3] = c1 * c2 * c3 - s1 * s2 * s3;
        break;
    case ZXY:
        quat[0] = c1 * s2 * c3 - s1 * c2 * s3;
        quat[1] = c1 * c2 * s3 + s1 * s2 * c3;
        quat[2] = s1 * c2 * c3 + c1 * s2 * s3;
        quat[3] = c1 * c2 * c3 - s1 * s2 * s3;
        break;
    case XZY:
        quat[0] = s1 * c2 * c3 - c1 * s2 * s3;
        quat[1] = c1 * c2 * s3 - s1 * s2 * c3;
        quat[2] = c1 * s2 * c3 + s1 * c2 * s3;
        quat[3] = c1 * c2 * c3 + s1 * s2 * s3;
        break;
    case YXZ:
        quat[0] = c1 * s2 * c3 + s1 * c2 * s3;
        quat[1] = s1 * c2 * c3 - c1 * s2 * s3;
        quat[2] = c1 * c2 * s3 - s1 * s2 * c3;
        quat[3] = c1 * c2 * c3 + s1 * s2 * s3;
        break;
    case ZYX:
        quat[0] = c1 * c2 * s3 - s1 * s2 * c3;
        quat[1] = c1 * s2 * c3 + s1 * c2 * s3;
        quat[2] = s1 * c2 * c3 - c1 * s2 * s3;
        quat[3] = c1 * c2 * c3 + s1 * s2 * s3;
        break;
    }

    return quat;
}

/**
 * Translate quaternion to Euler angles in the intrinsic rotation sequence
 * Source: Appendix A of http://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/19770024290.pdf
 * quat must be normalized
 */
function quat_to_ordered_angles(q, order, angles) {
    var x = q[0], y = q[1], z = q[2], w = q[3];

    switch(order) {
    case XYX:
        angles[0] = Math.atan2(x * y + z * w, y * w - x * z);
        angles[1] = Math.acos(1 - 2 * (y * y + z * z));
        angles[2] = Math.atan2(x * y - z * w, x * z + y * w);
        break;
    case YZY:
        angles[0] = Math.atan2(x * w + y * z, z * w - x * y);
        angles[1] = Math.acos(1 - 2 * (x * x + z * z));
        angles[2] = Math.atan2(y * z - x * w, x * y + z * w);
        break;
    case ZXZ:
        angles[0] = Math.atan2(x * z + y * w, x * w - y * z);
        angles[1] = Math.acos(1 - 2 * (x * x + y * y));
        angles[2] = Math.atan2(x * z - y * w, x * w + y * z);
        break;
    case XZX:
        angles[0] = Math.atan2(x * z - y * w, x * y + z * w);
        angles[1] = Math.acos(1 - 2 * (y * y + z * z));
        angles[2] = Math.atan2(x * z + y * w, z * w - x * y);
        break;
    case YXY:
        angles[0] = Math.atan2(x * y - z * w, x * w + y * z);
        angles[1] = Math.acos(1 - 2 * (x * x + z * z));
        angles[2] = Math.atan2(x * y + z * w, x * w - y * z);
        break;
    case ZYZ:
        angles[0] = Math.atan2(y * z - x * w, x * z + y * w);
        angles[1] = Math.acos(1 - 2 * (x * x + y * y));
        angles[2] = Math.atan2(x * w + y * z, y * w - x * z);
        break;
    case XYZ:
        angles[0] = Math.atan2(2 * (x * w - y * z), 1 - 2 * (x * x + y * y));
        angles[1] = Math.asin(2 * (x * z + y * w));
        angles[2] = Math.atan2(2 * (z * w - x * y), 1 - 2 * (y * y + z * z));
        break;
    case YZX:
        var test = x * y + z * w;
        if (test > 0.499999) {
            angles[0] = 0;
            angles[1] = Math.PI / 2;
            angles[2] = 2 * Math.atan2(x, w);
        } else if (test < -0.499999) {
            angles[0] = 0;
            angles[1] = -Math.PI / 2;
            angles[2] = -2 * Math.atan2(x, w);
        } else {
            angles[0] = Math.atan2(2 * (y * w - x * z), 1 - 2 * (y * y + z * z));
            angles[1] = Math.asin(2 * (x * y + z * w));
            angles[2] = Math.atan2(2 * (x * w - y * z), 1 - 2 * (x * x + z * z));
        }
        break;
    case ZXY:
        angles[0] = Math.atan2(2 * (z * w - x * y), 1 - 2 * (x * x + z * z));
        angles[1] = Math.asin(2 * (x * w + y * z));
        angles[2] = Math.atan2(2 * (y * w - x * z), 1 - 2 * (x * x + y * y));
        break;
    case XZY:
        angles[0] = Math.atan2(2 * (x * w + y * z), 1 - 2 * (x * x + z * z));
        angles[1] = Math.asin(2 * (z * w - x * y));
        angles[2] = Math.atan2(2 * (x * z + y * w), 1 - 2 * (y * y + z * z));
        break;
    case YXZ:
        angles[0] = Math.atan2(2 * (x * z + y * w), 1 - 2 * (x * x + y * y));
        angles[1] = Math.asin(2 * (x * w - y * z));
        angles[2] = Math.atan2(2 * (x * y + z * w), 1 - 2 * (x * x + z * z));
        break;
    case ZYX:
        var test = y * w - x * z;
        if (test > 0.499999) {
            angles[0] = 0;
            angles[1] = Math.PI / 2;
            angles[2] = -2 * Math.atan2(z, w);
        } else if (test < -0.499999) {
            angles[0] = 0;
            angles[1] = -Math.PI / 2;
            angles[2] = 2 * Math.atan2(z, w);
        } else {
            angles[0] = Math.atan2(2 * (x * y + z * w), 1 - 2 * (y * y + z * z));
            angles[1] = Math.asin(2 * (y * w - x * z));
            angles[2] = Math.atan2(2 * (x * w + y * z), 1 - 2 * (x * x + y * y));
        }
        break;
    }
    // TODO: add check the orientation is far a singularity.
    // In case of order in {XYZ, YZX, ZXY, XZY, YXZ, ZYX} singularity is angles[1] resides in {-PI/2, PI/2}.
    // In case of order in {XYX, YZY, ZXZ, XZX, YXY, ZYZ} singularity is angles[1] resides in {0, PI}.
    return angles;
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
function euler_to_rotation_matrix(euler, matrix) {

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

// Engine uses ZYX intrinsic rotation sequence
function quat_to_euler(quat, euler) {
    var angles = quat_to_ordered_angles(quat, ZYX, _vec3_tmp);

    // reorder angles from XYZ to ZYX
    euler[0] = angles[2];
    euler[1] = angles[1];
    euler[2] = angles[0];

    return euler;
}

/**
 * Convert quaternion to directional vector.
 */
function quat_to_dir(quat, ident, dest) {
    if (!dest)
        dest = new Float32Array(3);

    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["r" /* transformQuat */](ident, quat, dest);
    return dest;
}
/**
 * Convert directional vector to quaternion.
 * execution discouraged, use quaternion directly
 */
function dir_to_quat(dir, ident, dest) {
    if (!dest)
        dest = new Float32Array(4);

    dir = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["l" /* normalize */](dir, _vec3_tmp);

    var dot = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](ident, dir);
    var A = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["d" /* cross */](ident, dir, _vec3_tmp2);

    var teta = Math.acos(dot);

    dest[0] = A[0] * Math.sin(teta/2);
    dest[1] = A[1] * Math.sin(teta/2);
    dest[2] = A[2] * Math.sin(teta/2);
    dest[3] = Math.cos(teta/2);

    return dest;
}

function trans_quat_to_plane(trans, quat, ident, dest) {
    if (!dest)
        dest = new Float32Array(4);

    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["r" /* transformQuat */](ident, quat, dest);
    dest[3] = -__WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](trans, dest);

    return dest;
}

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
 * Clone object recursively
 * NOTE: operation is dangerous because of possible cyclic links
 * NOTE: leads to code deoptimizations
 */
function clone_object_r(obj) {
    if (!(obj instanceof Object)) {
        return obj;
    }

    var obj_clone;

    var Constructor = obj.constructor;

    switch (Constructor) {
    case Int8Array:
    case Uint8Array:
    case Uint8ClampedArray:
    case Int16Array:
    case Uint16Array:
    case Int32Array:
    case Uint32Array:
    case Float32Array:
    case Float64Array:
        obj_clone = new Constructor(obj);
        break;
    case Array:
        obj_clone = new Constructor(obj.length);

        for (var i = 0; i < obj.length; i++)
            obj_clone[i] = clone_object_r(obj[i]);

        break;
    default:
        obj_clone = new Constructor();

        for (var prop in obj)
            if (obj.hasOwnProperty(prop))
                obj_clone[prop] = clone_object_r(obj[prop]);

        break;
    }

    return obj_clone;
}

/**
 * Clone object non-recursively.
 * NOTE: leads to code deoptimizations
 */
function clone_object_nr(obj) {

    var new_obj = (obj instanceof Array) ? [] : {};

    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            if (obj[prop] instanceof Object) {

                var Constructor = obj[prop].constructor;

                switch (Constructor) {
                case Int8Array:
                case Uint8Array:
                case Uint8ClampedArray:
                case Int16Array:
                case Uint16Array:
                case Int32Array:
                case Uint32Array:
                case Float32Array:
                case Float64Array:
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
    }

    return new_obj;
}

/**
 * Extract rotation quaternion from 4x4 matrix.
 * Only uniform scale supported.
 * @methodOf util
 */
function matrix_to_quat(matrix, dest) {
    if (!dest)
        dest = new Float32Array(4);

    __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat3_js__["c" /* fromMat4 */](matrix, _mat3_tmp);

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

    __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["c" /* fromMat3 */](_mat3_tmp, dest);
    __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["g" /* normalize */](dest, dest)

    return dest;
}

/**
 * Extract transform vector from given matrix
 */
function matrix_to_trans(matrix, dest) {
    if (!dest)
        dest = new Float32Array(3);

    dest[0] = matrix[12];
    dest[1] = matrix[13];
    dest[2] = matrix[14];

    return dest;
}

/**
 * Return mat4 average scale factor.
 */
function matrix_to_scale(matrix, dest) {
    _vec4_tmp[0] = 0.577350269189626;
    _vec4_tmp[1] = 0.577350269189626;
    _vec4_tmp[2] = 0.577350269189626;
    _vec4_tmp[3] = 0;

    __WEBPACK_IMPORTED_MODULE_6__libs_gl_matrix_vec4_js__["f" /* transformMat4 */](_vec4_tmp, matrix, _vec4_tmp);
    // FIXME: nonuniform scale
    var scale = __WEBPACK_IMPORTED_MODULE_6__libs_gl_matrix_vec4_js__["c" /* length */](_vec4_tmp);
    if (dest)
        return __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["n" /* set */](scale, scale, scale, dest);
    else
        return scale;
}

/**
 * Perform some frustum culling stuff
 * plane [a, b, c, d]
 * @methodOf util
 */
function extract_frustum_planes(m, planes) {

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
function sphere_is_out_of_frustum(pt, planes, radius) {

    if (radius < -__WEBPACK_IMPORTED_MODULE_2__math_js__["a" /* point_plane_dist */](pt, planes.near) ||
        radius < -__WEBPACK_IMPORTED_MODULE_2__math_js__["a" /* point_plane_dist */](pt, planes.left) ||
        radius < -__WEBPACK_IMPORTED_MODULE_2__math_js__["a" /* point_plane_dist */](pt, planes.right) ||
        radius < -__WEBPACK_IMPORTED_MODULE_2__math_js__["a" /* point_plane_dist */](pt, planes.top) ||
        radius < -__WEBPACK_IMPORTED_MODULE_2__math_js__["a" /* point_plane_dist */](pt, planes.bottom) ||
        radius < -__WEBPACK_IMPORTED_MODULE_2__math_js__["a" /* point_plane_dist */](pt, planes.far))
        return true;
    else
        return false;
}

/**
 * Detect if given ellipsoid is out of frustum.
 */
function ellipsoid_is_out_of_frustum(pt, planes,
                                               axis_x, axis_y, axis_z) {

    // effective radius - far/near plane
    var dot_nx = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](axis_x, planes.far);
    var dot_ny = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](axis_y, planes.far);
    var dot_nz = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](axis_z, planes.far);
    var r_far = Math.sqrt(dot_nx * dot_nx + dot_ny * dot_ny + dot_nz * dot_nz);

    // near and far effective radiuses coincide (far is parallel to near)
    if (r_far   < -__WEBPACK_IMPORTED_MODULE_2__math_js__["a" /* point_plane_dist */](pt, planes.near) ||
        r_far   < -__WEBPACK_IMPORTED_MODULE_2__math_js__["a" /* point_plane_dist */](pt, planes.far)) {
        return true;
    }

    // effective radius - left plane
    dot_nx = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](axis_x, planes.left);
    dot_ny = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](axis_y, planes.left);
    dot_nz = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](axis_z, planes.left);
    var r_left = Math.sqrt(dot_nx * dot_nx + dot_ny * dot_ny + dot_nz * dot_nz);
    if (r_left  < -__WEBPACK_IMPORTED_MODULE_2__math_js__["a" /* point_plane_dist */](pt, planes.left)) {
        return true;
    }

    // effective radius - right plane
    dot_nx = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](axis_x, planes.right);
    dot_ny = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](axis_y, planes.right);
    dot_nz = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](axis_z, planes.right);
    var r_right = Math.sqrt(dot_nx * dot_nx + dot_ny * dot_ny + dot_nz * dot_nz);
    if (r_right < -__WEBPACK_IMPORTED_MODULE_2__math_js__["a" /* point_plane_dist */](pt, planes.right)) {
        return true;
    }

    // effective radius - top plane
    dot_nx = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](axis_x, planes.top);
    dot_ny = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](axis_y, planes.top);
    dot_nz = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](axis_z, planes.top);
    var r_top = Math.sqrt(dot_nx * dot_nx + dot_ny * dot_ny + dot_nz * dot_nz);
    if (r_top < -__WEBPACK_IMPORTED_MODULE_2__math_js__["a" /* point_plane_dist */](pt, planes.top)) {
        return true;
    }

    // effective radius - bottom plane
    dot_nx = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](axis_x, planes.bottom);
    dot_ny = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](axis_y, planes.bottom);
    dot_nz = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](axis_z, planes.bottom);
    var r_bott = Math.sqrt(dot_nx * dot_nx + dot_ny * dot_ny + dot_nz * dot_nz);
    if (r_bott < -__WEBPACK_IMPORTED_MODULE_2__math_js__["a" /* point_plane_dist */](pt, planes.bottom)) {
        return true;
    }

    return false;
}

/**
 * Translate positions by matrix
 * optimized function, uses preallocated arrays (Array or Float32Array)
 * optional destination offset in values (not vectors, not bytes)
 */
function positions_multiply_matrix(positions, matrix, new_positions,
        dest_offset) {

    if (!dest_offset)
        dest_offset = 0;

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
function vectors_multiply_matrix(vectors, matrix, new_vectors,
        dest_offset) {

    if (!dest_offset)
        dest_offset = 0;

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

function quats_multiply_quat(vectors, quat, new_vectors,
        dest_offset) {
    dest_offset = dest_offset || 0;

    var len = vectors.length;
    var new_quat = _quat_tmp;
    for (var i = 0; i < len; i+=4) {

        new_quat[0] = vectors[i];
        new_quat[1] = vectors[i+1];
        new_quat[2] = vectors[i+2];
        new_quat[3] = vectors[i+3];

        var is_righthand = new_quat[3] > 0;
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["f" /* multiply */](quat, new_quat, new_quat);
        if (is_righthand && new_quat[3] < 0 || !is_righthand && new_quat[3] > 0)
            __WEBPACK_IMPORTED_MODULE_6__libs_gl_matrix_vec4_js__["e" /* scale */](new_quat, -1, new_quat);

        new_vectors[dest_offset + i] = new_quat[0];
        new_vectors[dest_offset + i + 1] = new_quat[1];
        new_vectors[dest_offset + i + 2] = new_quat[2];
        new_vectors[dest_offset + i + 3] = new_quat[3];
    }

    return new_vectors;
}

/**
 * Translate vector representing direction (e.g. normal)
 */
function vecdir_multiply_matrix(vec, matrix, dest) {
    if (!dest)
        dest = new Float32Array(3);

    var v4 = _vec4_tmp;

    v4[0] = vec[0];
    v4[1] = vec[1];
    v4[2] = vec[2];
    v4[3] = 0;

    __WEBPACK_IMPORTED_MODULE_6__libs_gl_matrix_vec4_js__["f" /* transformMat4 */](v4, matrix, v4);
    dest[0] = v4[0];
    dest[1] = v4[1];
    dest[2] = v4[2];
}

/**
 * Make flat (Float32Array) version of given array.
 * Only single level supported
 */
function flatten(array, dest) {

    var len = array.length;
    var len0 = array[0].length;

    if (!dest)
        dest = new Float32Array(len * len0);

    for (var i = 0; i < len; i++)
        for (var j = 0; j < len0; j++)
            dest[i * len0 + j] = array[i][j];

    return dest;
}
/**
 * Make vectorized version of given flat array (opposite to flatten())
 */
function vectorize(array, dest) {

    if (!dest)
        dest = [];

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
function binary_search_max(arr, max, start, end) {

    // return closest larger index if exact number is not found
    if (end < start)
        return start;

    var mid = start + Math.floor((end - start) / 2);

    if (arr[mid] > max)
        return binary_search_max(arr, max, start, mid - 1);
    else if (arr[mid] < max)
        return binary_search_max(arr, max, mid + 1, end);
    else
        return mid;
}

/**
 * Compare two flat arrays
 * @returns true if equal
 */
function cmp_arr(arr_1, arr_2) {
    for (var i = 0; i < arr_1.length; i++)
        if (arr_1[i] != arr_2[i])
            return false;

    return true;
}

/**
 * Compare two float flat arrays using minimal precision value
 * @returns true if equal
 */
function cmp_arr_float(arr_1, arr_2, precision) {

    for (var i = 0; i < arr_1.length; i++)
        if (Math.abs(arr_1[i] - arr_2[i]) > precision)
            return false;

    return true;
}

/**
 * Apply uniform scale to matrix.
 */
function scale_mat4(matrix, scale, dest) {
    if (!dest)
        dest = new Float32Array(16);

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
function transform_mat4(matrix, scale, quat, trans, dest) {
    if (!dest)
        dest = new Float32Array(16);
    var m = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["b" /* fromRotationTranslation */](quat, trans, _mat4_tmp);

    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["f" /* multiply */](m, matrix, dest);

    return dest;
}
/**
 * Unoptimized (uses matrix)
 */
function transform_vec3(vec, scale, quat, trans, dest) {
    if (!dest)
        dest = new Float32Array(3);

    var m1 = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["b" /* fromRotationTranslation */](quat, trans, _mat4_tmp);
    if (scale !== 1) {
        var m2 = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["c" /* identity */](_mat4_tmp2);
        var s = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["n" /* set */](scale, scale, scale, _vec3_tmp);
        __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["g" /* scale */](m2, s, m2);
        __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["f" /* multiply */](m1, m2, m1);
    }

    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["q" /* transformMat4 */](vec, m1, dest);

    return dest;
}
/**
 * Unoptimized (uses matrix)
 */
function transform_vec4(vec, scale, quat, trans, dest) {
    if (!dest)
        dest = new Float32Array(4);
    var m = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["b" /* fromRotationTranslation */](quat, trans, _mat4_tmp);

    __WEBPACK_IMPORTED_MODULE_6__libs_gl_matrix_vec4_js__["f" /* transformMat4 */](vec, m, dest);

    return dest;
}

/**
 * Unoptimized (uses matrix)
 */
function inverse_transform_vec3(vec, scale, quat, trans, dest) {
    if (!dest)
        dest = new Float32Array(3);
    var m = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["b" /* fromRotationTranslation */](quat, trans, _mat4_tmp);
    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["d" /* invert */](m, m);
    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["q" /* transformMat4 */](vec, m, dest);

    return dest;
}

function transcale_quat_to_matrix(trans, quat, dest) {
    if (!dest)
        dest = new Float32Array(16);

    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["b" /* fromRotationTranslation */](quat, trans, dest);

    var scale = trans[3];
    for (var i = 0; i < 12; i++)
        dest[i] *= scale;

    return dest;
}

function matrix_to_transcale_quat(matrix, dest_transcale, dest_quat) {
    console.error("B4W ERROR: tsr.matrix_to_transcale_quat is dangerous function. Don't use it anymore!!!");
    matrix_to_trans(matrix, dest_transcale);
    dest_transcale[3] = matrix_to_scale(matrix);
    matrix_to_quat(matrix, dest_quat);
}

/**
 * Works for typed array also
 */
function array_stringify(array) {

    var out = []
    for (var i = 0; i < array.length; i++)
        out.push(array[i]);

    return JSON.stringify(out);
}

function rotate_point_pivot(point, pivot, quat, dest) {
    if (!dest)
        dest = new Float32Array(3);

    var point_rel = _vec3_tmp;

    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["o" /* subtract */](pivot, point, point_rel);
    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["r" /* transformQuat */](point_rel, quat, point_rel);

    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["o" /* subtract */](pivot, point_rel, dest);
}

/**
 * Construct 6 view matrices for 6 cubemap sides
 */
function generate_cubemap_matrices() {

    var eye_pos = _vec3_tmp;
    eye_pos[0] = 0; eye_pos[1] = 0; eye_pos[2] = 0;
    var x_pos   = new Float32Array(16);
    var x_neg   = new Float32Array(16);
    var y_pos   = new Float32Array(16);
    var y_neg   = new Float32Array(16);
    var z_pos   = new Float32Array(16);
    var z_neg   = new Float32Array(16);

    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["e" /* lookAt */](eye_pos, [-1, 0, 0], [0, -1, 0], x_pos);
    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["g" /* scale */](x_pos, [-1, 1, 1], x_pos);
    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["g" /* scale */](x_pos, [-1, 1,-1], x_neg);

    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["e" /* lookAt */](eye_pos, [0, -1, 0], [0, 0, -1], y_pos);
    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["g" /* scale */](y_pos, [1, 1,-1], y_pos);
    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["g" /* scale */](y_pos, [1,-1,-1], y_neg);

    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["e" /* lookAt */](eye_pos, [0, 0, -1], [0, -1, 0], z_pos);
    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["g" /* scale */](z_pos, [-1, 1, 1], z_pos);
    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["g" /* scale */](z_pos, [-1, 1,-1], z_neg);

    return [x_pos, x_neg, y_pos, y_neg, z_pos, z_neg];
}
/**
 * Construct 6 view matrices for 6 cubemap sides
 */
function generate_inv_cubemap_matrices() {

    var eye_pos = _vec3_tmp;
    eye_pos[0] = 0; eye_pos[1] = 0; eye_pos[2] = 0;

    var x_pos   = new Float32Array(16);
    var x_neg   = new Float32Array(16);
    var y_pos   = new Float32Array(16);
    var y_neg   = new Float32Array(16);
    var z_pos   = new Float32Array(16);
    var z_neg   = new Float32Array(16);

    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["e" /* lookAt */](eye_pos, [1, 0, 0], [0, -1, 0], x_pos);
    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["g" /* scale */](x_pos, [-1, 1,-1], x_neg);

    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["e" /* lookAt */](eye_pos, [0, 1, 0], [0, 0, 1], y_pos);
    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["g" /* scale */](y_pos, [1,-1, -1], y_neg);

    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["e" /* lookAt */](eye_pos, [0, 0, 1], [0, -1, 0], z_pos);
    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_mat4_js__["g" /* scale */](z_pos, [-1, 1,-1], z_neg);

    return [x_pos, x_neg, y_pos, y_neg, z_pos, z_neg];
}

/**
 * Implementation of Java's String.hashCode().
 */
function hash_code_string(str, init_val) {
    var hash = init_val;

    for (var i = 0; i < str.length; i++) {
        var symbol = str.charCodeAt(i);
        hash = ((hash<<5) - hash) + symbol;
        hash = hash & hash; // convert to 32 bit integer
    }
    return hash;
}

function mat3_to_mat4(mat, dest) {
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
function quat_to_angle_axis(src, dest) {
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
function trunc(x) {
    return isNaN(x) || typeof x == "undefined" ? NaN : x | 0;
}

function deg_to_rad(x) {
    return x * Math.PI / 180;
}

function rad_to_deg(x) {
    return x * 180 / Math.PI;
}

function snoise(p) {

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

function cellular2x2(P) {

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

function quat_project(quat, quat_ident_dir,
        plane, plane_ident_dir, dest) {
    if (!dest)
        dest = new Float32Array(4);

    var to = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["r" /* transformQuat */](quat_ident_dir, quat, _vec3_tmp);

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

    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["p" /* transformMat3 */](to, proj, to);
    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["l" /* normalize */](to, to);
    __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["h" /* rotationTo */](plane_ident_dir, to, dest);

    return dest;
}

function cam_quat_to_mesh_quat(cam_quat, dest) {

    if (!dest)
        dest = new Float32Array(4);

    var quat_offset = _vec4_tmp;
    var quat_offset_x = _vec4_tmp2;
    quat_offset = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["i" /* setAxisAngle */]([0,0,1], Math.PI, __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["b" /* create */]());
    quat_offset_x = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["i" /* setAxisAngle */]([1,0,0], Math.PI/2, __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["b" /* create */]());

    __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["f" /* multiply */](quat_offset, quat_offset_x, quat_offset);
    __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["f" /* multiply */](cam_quat, quat_offset, dest);

    return dest;
}

function clamp(value, min, max) {
    // NOTE: optimized for intensive usage, much faster than Math.min/Math.max
    if (value < min)
        value = min;
    if (value > max)
        value = max;
    return value;
}

function smooth(curr, last, delta, period) {

    if (period) {
        var e = Math.exp(-delta/period);
        return (1 - e) * curr + e * last;
    } else
        return curr;
}

/**
 * Perform exponential smoothing (vector form).
 */
function smooth_v(curr, last, delta, period, dest) {
    if (!dest)
        dest = new Float32Array(curr.length);

    if (period) {
        var e = Math.exp(-delta/period);

        for (var i = 0; i < dest.length; i++)
            dest[i] = (1 - e) * curr[i] + e * last[i];
    } else
        __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["b" /* copy */](curr, dest);

    return dest;
}

/**
 * Perform exponential smoothing (quaternion form).
 */
function smooth_q(curr, last, delta, period, dest) {
    if (!dest)
        dest = new Float32Array(curr.length);

    if (period) {
        var e = Math.exp(-delta/period);
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["j" /* slerp */](curr, last, e, dest);
    } else 
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["a" /* copy */](curr, dest);

    return dest;
}

/**
 * Check if object is instance of ArrayBufferView.
 * switch to ArrayBuffer.isView() when available.
 */
function is_arr_buf_view(o) {
    if (typeof o === "object" && o.buffer && o.buffer instanceof ArrayBuffer)
        return true;
    else
        return false;
}

function is_vector(o, dimension) {
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

function correct_cam_quat_up(quat, up_only) {

    // convenient to get 3x3 matrix
    var rmat = __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat3_js__["d" /* fromQuat */](quat, _mat3_tmp);

    // local camera Z in world space
    var z_cam_world = _vec3_tmp;
    z_cam_world[0] = rmat[6];
    z_cam_world[1] = rmat[7];
    z_cam_world[2] = rmat[8];

    var x_cam_world_new = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["d" /* cross */](AXIS_Z, z_cam_world, z_cam_world);
    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["l" /* normalize */](x_cam_world_new, x_cam_world_new);

    // Z coord of local camera MY axis in world space
    var my_cam_world_z = rmat[4];
    if (!up_only && my_cam_world_z > 0) {
        x_cam_world_new[0] *= -1;
        x_cam_world_new[1] *= -1;
        x_cam_world_new[2] *= -1;
    }

    var x_cam_world = _vec3_tmp2;
    x_cam_world[0] = rmat[0];
    x_cam_world[1] = rmat[1];
    x_cam_world[2] = rmat[2];
    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["l" /* normalize */](x_cam_world, x_cam_world);

    var correct_quat = _vec4_tmp2;
    __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["h" /* rotationTo */](x_cam_world, x_cam_world_new, correct_quat);
    __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["f" /* multiply */](correct_quat, quat, quat);
}

function get_array_smooth_value(array, row_width, x, y) {
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
function rgb_mask_get_channels_count(mask) {
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
function rgb_mask_get_channel_presence_index(mask, channel) {
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
function gen_uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

function get_dict_length(dict) {
    var count = 0;
    for (var prop in dict)
        if (dict.hasOwnProperty(prop))
            count++;
    return count;
}

function random_from_array(array) {

    if (!array.length)
        return null;

    var pos = Math.floor(Math.random() * array.length);
    return array[pos];
}

function horizontal_direction(a, b, dest) {

    if (!dest)
        dest = new Float32Array(3);

    dest[0] = a[0] - b[0];
    dest[1] = a[1] - b[1];
    dest[2] = 0;
    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["l" /* normalize */](dest, dest);
}

/**
 * Transforms the vec3 with a quat (alternative implementation)
 *
 * @param {Vec3} out the receiving vector
 * @param {Vec3} a the vector to transform
 * @param {Quat} q quaternion to transform with
 * @returns {Vec3} out
 */
function transformQuatFast(a, q, out) {
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

/**
 * Convert radian angle into range [from, to)
 */
function angle_wrap_periodic(angle, from, to) {
    var rel_angle = angle - from; // 2Pi
    var period = to - from; // 2Pi
    return from + (rel_angle - Math.floor(rel_angle / period) * period); //-Pi + (2Pi - 2Pi)
}

function angle_wrap_0_2pi(angle) {
    return angle_wrap_periodic(angle, 0, 2 * Math.PI);
}

/**
 * Check strictly typed objects equality: batch, render.
 * NOTE: do not check the difference between Array and TypedArray
 */
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
        var b_is_arr = b instanceof Array;
        if (a_is_arr != b_is_arr)
            return false;

        var a_is_typed_arr = a.buffer instanceof ArrayBuffer
                && a.byteLength !== "undefined";
        var b_is_typed_arr = b.buffer instanceof ArrayBuffer
                && b.byteLength !== "undefined";
        if (a_is_typed_arr != b_is_typed_arr)
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
            // NOTE: some additional props could be added to GL-type objs
            // so don't iterate over their props
            switch (a.constructor) {
            case WebGLUniformLocation:
            case WebGLProgram:
            case WebGLShader:
            case WebGLFramebuffer:
            case WebGLRenderbuffer:
            case WebGLTexture:
            case WebGLBuffer:
                return a == b;
            }

            for (var prop in a) {
                if (!vars_is_equal(a[prop], b[prop]))
                    return false;
            }
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

function quat_bpy_b4w(quat, dest) {
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

// see Lengyel E. - Mathematics for 3D Game Programming and Computer Graphics,
// Third Edition. Chapter 5.2.1 Intersection of a Line and a Plane
function line_plane_intersect(pn, p_dist, pline, dest) {
    // four-dimensional representation of a plane
    var plane = _vec4_tmp;
    plane.set(pn);
    plane[3] = p_dist;

    // four-dimensional representation of line direction vector
    var line_dir = _vec4_tmp2;
    _vec3_tmp[0] = pline[3];
    _vec3_tmp[1] = pline[4];
    _vec3_tmp[2] = pline[5];
    line_dir.set(_vec3_tmp);
    line_dir[3] = 0;

    var denominator = __WEBPACK_IMPORTED_MODULE_6__libs_gl_matrix_vec4_js__["b" /* dot */](plane, line_dir);

    // parallel case
    if (denominator == 0.0)
        return null;

    // four-dimensional representation of line point
    var line_point = _vec4_tmp2;
    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["b" /* copy */](pline, _vec3_tmp);
    line_point.set(_vec3_tmp);
    line_point[3] = 1;

    var numerator = __WEBPACK_IMPORTED_MODULE_6__libs_gl_matrix_vec4_js__["b" /* dot */](plane, line_point);

    var t = - numerator / denominator;

    // point of intersection
    dest[0] = pline[0] + t * pline[3];
    dest[1] = pline[1] + t * pline[4];
    dest[2] = pline[2] + t * pline[5];

    return dest;
}

/**
 * Calculate plane normal by 3 points through the point-normal form of the
 * plane equation
 */
function get_plane_normal(a, b, c, dest) {
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
function copy_array(a, out) {
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
 * @param {vec3} a the initial vector
 * @param {vec3} b the destination vector
 * @param {quat} out the receiving quaternion.
 * @returns {quat} out
 */
function rotation_to_stable(a, b, out) {
    var tmp = _vec3_tmp;
    var dot = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](a, b);

    if (dot < -0.9999999) {
        __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["d" /* cross */](AXIS_X, a, tmp);
        if (__WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["h" /* length */](tmp) < 0.000001)
            __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["d" /* cross */](AXIS_Y, a, tmp);
        __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["l" /* normalize */](tmp, tmp);
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["i" /* setAxisAngle */](tmp, Math.PI, out);
    } else {
        __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["d" /* cross */](a, b, tmp);
        out.set(tmp);
        out[3] = 1 + dot;
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["g" /* normalize */](out, out);
    }

    return out;
};

/**
 * Get the angle which returns current angle into range [min_angle, max_angle]
 */
function calc_returning_angle(angle, min_angle, max_angle) {
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

function smooth_step(t, min, max) {
    if (isFinite(min) && isFinite(max))
        t = clamp(t, min, max);

    return t * t * (3.0 - 2.0 * t);
}

function lerp(t, from, to) {
    return from + t * (to - from);
}

function arrays_have_common(arr_1, arr_2) {
    for (var i = 0; i < arr_1.length; i++) {
        for (var k = 0; k < arr_2.length; k++) {
            if (arr_2[k] == arr_1[i]) {
                return true;
            }
        }
    }
    return false;
}

function create_zero_array(length) {
    var array = new Array(length);

    for (var i = 0; i < length; i++)
        array[i] = 0;

    return array;
}

function version_cmp(ver1, ver2) {
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
function version_to_str(ver) {
    return ver.join(".");
}

function str_to_version(str) {
    return str.split(".").map(function(val){ return val | 0 });
}

function srgb_to_lin(color, dest) {
    dest[0] = Math.pow(color[0], GAMMA);
    dest[1] = Math.pow(color[1], GAMMA);
    dest[2] = Math.pow(color[2], GAMMA);
    return dest;
}

function lin_to_srgb(color, dest) {
    dest[0] = Math.pow(color[0], 1/GAMMA);
    dest[1] = Math.pow(color[1], 1/GAMMA);
    dest[2] = Math.pow(color[2], 1/GAMMA);
    return dest;
}

function check_npot(num) {
    return parseInt(num.toString(2).substr(1), 2) != 0;
}

function ellipsoid_axes_to_mat3(axis_x, axis_y, axis_z, dest) {
    dest[0] = axis_x[0];
    dest[1] = axis_y[0];
    dest[2] = axis_z[0];
    dest[3] = axis_x[1];
    dest[4] = axis_y[1];
    dest[5] = axis_z[1];
    dest[6] = axis_x[2];
    dest[7] = axis_y[2];
    dest[8] = axis_z[2];

    return dest;
}

/**
 * Create an empty non-smi Array to store generic objects.
 * Due to V8 optimizations all emtpy arrays created to store small (31 bit)
 * integer values. This method prevents such optimization.
 * @returns {Array} New empty Array
 */
function create_non_smi_array() {
    var arr = [{}];
    arr.length = 0;
    return arr;
}

/**
 * Converts a float value of range [-1, 1] to a short.
 */
function float_to_short(float_val) {
    var x = Math.round((float_val + 1) * 32767.5 - 32768);
    // remove possible negative zero before clamping
    return clamp(x ? x : 0, -32768, 32767);
}

/**
 * Converts a short value of range [-32768, 32767] to a float.
 */
function short_to_float(short_val) {
    return clamp((short_val + 32768) / 32767.5 - 1, -1, 1);
}

/**
 * Converts an unsigned float value of range [0, 1] to an unsigned byte.
 */
function ufloat_to_ubyte(ufloat_val) {
    return clamp(Math.round(ufloat_val * 255), 0, 255);
}

/**
 * Converts an unsigned byte value of range [0, 255] to an unsigned float.
 */
function ubyte_to_ufloat(ubyte_val) {
    return clamp(ubyte_val / 255, 0, 1);
}

function dist_to_triange(point, ver1, ver2, ver3) {
    var dir_21 = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["o" /* subtract */](ver2, ver1, _vec3_tmp);
    var dir_32 = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["o" /* subtract */](ver3, ver2, _vec3_tmp2);
    var dir_13 = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["o" /* subtract */](ver1, ver3, _vec3_tmp3);
    var dir_p1 = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["o" /* subtract */](point, ver1, _vec3_tmp4);
    var dir_p2 = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["o" /* subtract */](point, ver2, _vec3_tmp5);
    var dir_p3 = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["o" /* subtract */](point, ver3, _vec3_tmp6);

    var normal = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["d" /* cross */](dir_21, dir_32, _vec3_tmp7);

    if (__WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](__WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["d" /* cross */](normal, dir_21, _vec3_tmp8), dir_p1) >= 0 &&
            __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](__WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["d" /* cross */](normal, dir_32, _vec3_tmp8), dir_p2) >= 0 &&
            __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](__WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["d" /* cross */](normal, dir_13, _vec3_tmp8), dir_p3) >= 0) {
        // inside of the triange prism
        // find distance to plane of the triange
        var normal_length = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["h" /* length */](normal);
        var ndist = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](normal, dir_p1);
        return Math.abs(ndist / normal_length);
    } else {
        // outside of the triange prism
        // find min distance of distances to the 3 edges of the triange
        var proj_p1_on_21 = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["m" /* scale */](dir_21,
                clamp(__WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](dir_21, dir_p1) / __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["h" /* length */](dir_21), 0, 1), _vec3_tmp8);
        var dist_to_21 = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["h" /* length */](__WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["o" /* subtract */](dir_p1, proj_p1_on_21, _vec3_tmp8));

        var proj_p2_on_32 = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["m" /* scale */](dir_32,
                clamp(__WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](dir_32, dir_p2) / __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["h" /* length */](dir_32), 0, 1), _vec3_tmp8);
        var dist_to_32 = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["h" /* length */](__WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["o" /* subtract */](dir_p2, proj_p2_on_32, _vec3_tmp8));

        var proj_p3_on_13 = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["m" /* scale */](dir_13,
                clamp(__WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](dir_13, dir_p3) / __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["h" /* length */](dir_13), 0, 1), _vec3_tmp8);
        var dist_to_13 = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["h" /* length */](__WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["o" /* subtract */](dir_p3, proj_p3_on_13, _vec3_tmp8));

        return Math.min(Math.min(dist_to_21, dist_to_32), dist_to_13);
    }
}

function rotate_quat(quat, vertical_axis, d_phi, d_theta, dest) {
    if (d_phi || d_theta) {
        var rot_quat = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["d" /* identity */](_quat_tmp);

        if (d_phi) {
            var quat_phi = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["i" /* setAxisAngle */](vertical_axis, d_phi, _quat_tmp2);
            __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["f" /* multiply */](rot_quat, quat_phi, rot_quat);
        }

        var obj_quat = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["a" /* copy */](quat, dest);
        if (d_theta) {
            var x_world_cam = quat_to_dir(obj_quat, AXIS_X, _vec3_tmp);
            var quat_theta = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["i" /* setAxisAngle */](x_world_cam, d_theta, _quat_tmp2);
            // NOTE: obj_quat->x_world_cam->quat_theta->obj_quat leads to
            // error accumulation if quat_theta is not normalized
            __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["g" /* normalize */](quat_theta, quat_theta);
            __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["f" /* multiply */](rot_quat, quat_theta, rot_quat);
        }
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["f" /* multiply */](rot_quat, obj_quat, obj_quat);
        // NOTE: It fixes the issue, when objects dance, when camera change
        // vertical angle sign (+-)
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["g" /* normalize */](obj_quat, obj_quat);
    }
}

/**
 * Apply rotation to quat
 */
// TODO: fix signature of the function
function quat_rotate_to_target(trans, quat, target, dir_axis) {
    var dir_from = _vec3_tmp2;
    // NOTE: dir_axis is in local space, it will be directed to the target
    quat_to_dir(quat, dir_axis, dir_from);
    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["l" /* normalize */](dir_from, dir_from);
    var dir_to = _vec3_tmp3;
    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["o" /* subtract */](target, trans, dir_to);
    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["l" /* normalize */](dir_to, dir_to);
    // NOTE: we don't check Math.abs(m_vec3.dot(dir_from, dir_to)) < 0.999999
    var rotation = rotation_to_stable(dir_from, dir_to, _vec4_tmp);
    __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["f" /* multiply */](rotation, quat, quat);
    __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["g" /* normalize */](quat, quat);
}

function quat_set_vertical_axis(quat, axis, target_axis, dir) {
    // NOTE: axis is obj's vertical axis in local space (from Blender),
    // target_axis - target's Z one in the world space
    var curr_axis_w = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["r" /* transformQuat */](axis, quat, _vec3_tmp2);
    var proj = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](dir, target_axis);
    var delta = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["m" /* scale */](dir, proj, _vec3_tmp3);
    var complanar_targer = __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["o" /* subtract */](target_axis, delta, _vec3_tmp3);
    var rot_quat = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["d" /* identity */](_quat_tmp);
    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["l" /* normalize */](complanar_targer, complanar_targer);
    if (Math.abs(__WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["e" /* dot */](curr_axis_w, complanar_targer)) < 0.999999)
        rotation_to_stable(curr_axis_w, complanar_targer, rot_quat);
    __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["g" /* normalize */](rot_quat, rot_quat);
    __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_quat_js__["f" /* multiply */](rot_quat, quat, quat);
}

/**
* it's Blender's void compatible_eul(float eul[3], const float oldrot[3])
**/
function compatible_euler(eul, oldrot) {
    var pi_thresh = 5.1;
    var pi_x2 = 2 * Math.PI;

    var deul = [];

    for (var i = 0; i < 3; i++) {
        deul[i] = eul[i] - oldrot[i];
        if (deul[i] > pi_thresh) {
            eul[i] -= ( deul[i] / pi_x2) * pi_x2;
            deul[i] = eul[i] - oldrot[i];
        }
        else if (deul[i] < -pi_thresh) {
            eul[i] += (-deul[i] / pi_x2) * pi_x2;
            deul[i] = eul[i] - oldrot[i];
        }
    }

    if (Math.abs(deul[0]) > 3.2 && Math.abs(deul[1]) < 1.6 && Math.abs(deul[2]) < 1.6) {
        if (deul[0] > 0.0)
            eul[0] -= pi_x2;
        else
            eul[0] += pi_x2;
    }
    if (Math.abs(deul[1]) > 3.2 && Math.abs(deul[2]) < 1.6 && Math.abs(deul[0]) < 1.6) {
        if (deul[1] > 0.0)
            eul[1] -= pi_x2;
        else
            eul[1] += pi_x2;
    }
    if (Math.abs(deul[2]) > 3.2 && Math.abs(deul[0]) < 1.6 && Math.abs(deul[1]) < 1.6) {
        if (deul[2] > 0.0)
            eul[2] -= pi_x2;
        else
            eul[2] += pi_x2;
    }
}

function rotate_eul(beul, eul, dest) {
    var mat1 = euler_to_rotation_matrix(eul, _mat3_tmp);
    var mat2 = euler_to_rotation_matrix(beul, _mat3_tmp2);
    var totmat = __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat3_js__["f" /* multiply */](mat2, mat1, _mat3_tmp3);
    return mat3_to_euler(totmat, dest); 
}

function mat3_to_eul_opt(mat, eul1, eul2) {
    var cy = Math.sqrt(mat[0 * 3 + 0] * mat[0 * 3 + 0] + mat[0 * 3 + 1] * mat[0 * 3 + 1]);
    // we use the next order: i = 0; j = 1; k = 2;
    if (cy > 0.000001) {
        eul1[0] = Math.atan2(mat[1 * 3 + 2], mat[2 * 3 + 2]);
        eul1[1] = Math.atan2(-mat[0 * 3 + 2], cy);
        eul1[2] = Math.atan2(mat[0 * 3 + 1], mat[0 * 3 + 0]);

        eul2[0] = Math.atan2(-mat[1 * 3 + 2], -mat[2 * 3 + 2]);
        eul2[1] = Math.atan2(-mat[0 * 3 + 2], -cy);
        eul2[2] = Math.atan2(-mat[0 * 3 + 1], -mat[0 * 3 + 0]);
    } else {
        eul1[0] = Math.atan2(-mat[2 * 3 + 1], mat[1 * 3 + 1]);
        eul1[1] = Math.atan2(-mat[0 * 3 + 2], cy);
        eul1[2] = 0;

        __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["b" /* copy */](eul1, eul2);
    }
}

function quat_to_eul_opt(quat, oldrot, dest) {
    var mat = __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat3_js__["d" /* fromQuat */](quat, _mat3_tmp);
    var eul1 = _vec3_tmp;
    var eul2 = _vec3_tmp2;
    mat3_to_eul_opt(mat, eul1, eul2);
    var d1 = Math.abs(eul1[0] - oldrot[0]) + Math.abs(eul1[1] - oldrot[1]) + Math.abs(eul1[2] - oldrot[2]);
    var d2 = Math.abs(eul2[0] - oldrot[0]) + Math.abs(eul2[1] - oldrot[1]) + Math.abs(eul2[2] - oldrot[2]);

    var euler = d1 > d2 ? eul2 : eul1;
    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["b" /* copy */](euler, dest);

    return dest;
}

function mat3_to_euler(mat, dest) {
    var eul1 = _vec3_tmp;
    var eul2 = _vec3_tmp2;
    mat3_to_eul_opt(mat, eul1, eul2);

    var d1 = Math.abs(eul1[0]) + Math.abs(eul1[1]) + Math.abs(eul1[2]);
    var d2 = Math.abs(eul2[0]) + Math.abs(eul2[1]) + Math.abs(eul2[2]);

    var euler = d1 > d2 ? eul2 : eul1;
    __WEBPACK_IMPORTED_MODULE_5__libs_gl_matrix_vec3_js__["b" /* copy */](euler, dest);

    return dest;
}


/***/ }),
/* 7 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = create;
/* unused harmony export clone */
/* unused harmony export copy */
/* harmony export (immutable) */ __webpack_exports__["c"] = identity;
/* unused harmony export transpose */
/* harmony export (immutable) */ __webpack_exports__["d"] = invert;
/* unused harmony export adjoint */
/* unused harmony export determinant */
/* harmony export (immutable) */ __webpack_exports__["f"] = multiply;
/* unused harmony export mul */
/* unused harmony export translate */
/* harmony export (immutable) */ __webpack_exports__["g"] = scale;
/* unused harmony export rotate */
/* unused harmony export rotateX */
/* unused harmony export rotateY */
/* unused harmony export rotateZ */
/* unused harmony export fromTranslation */
/* unused harmony export fromScaling */
/* unused harmony export fromRotation */
/* unused harmony export fromXRotation */
/* unused harmony export fromYRotation */
/* unused harmony export fromZRotation */
/* harmony export (immutable) */ __webpack_exports__["b"] = fromRotationTranslation;
/* unused harmony export fromRotationTranslationScale */
/* unused harmony export fromRotationTranslationScaleOrigin */
/* unused harmony export fromQuat */
/* unused harmony export frustum */
/* unused harmony export perspective */
/* unused harmony export perspectiveFromFieldOfView */
/* unused harmony export ortho */
/* harmony export (immutable) */ __webpack_exports__["e"] = lookAt;
/* unused harmony export str */
/* unused harmony export frob */
/**
 * @module 4x4 Matrix
 * @name mat4
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
 * Creates a new identity mat4
 *
 * @returns {Mat4} a new 4x4 matrix
 * @method module:mat4.create
 */
function create() {
    var out = new GLMAT_ARRAY_TYPE(16);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {Mat4} a matrix to clone
 * @returns {Mat4} a new 4x4 matrix
 * @method module:mat4.clone
 */
function clone(a) {
    var out = new GLMAT_ARRAY_TYPE(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Copy the values from one mat4 to another
 *
 * @param {Mat4} a the source matrix
 * @returns {Mat4} out
 * @param {Mat4} out the receiving matrix
 * @method module:mat4.copy
 */
function copy(a, out) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Set a mat4 to the identity matrix
 *
 * @returns {Mat4} out
 * @param {Mat4} out the receiving matrix
 * @method module:mat4.identity
 */
function identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

/**
 * Transpose the values of a mat4
 *
 * @param {Mat4} a the source matrix
 * @returns {Mat4} out
 * @param {Mat4} out the receiving matrix
 * @method module:mat4.transpose
 */
function transpose(a, out) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a03 = a[3],
            a12 = a[6], a13 = a[7],
            a23 = a[11];

        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a01;
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = a[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
    } else {
        out[0] = a[0];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a[1];
        out[5] = a[5];
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a[2];
        out[9] = a[6];
        out[10] = a[10];
        out[11] = a[14];
        out[12] = a[3];
        out[13] = a[7];
        out[14] = a[11];
        out[15] = a[15];
    }
    
    return out;
};

/**
 * Inverts a mat4
 *
 * @param {Mat4} a the source matrix
 * @returns {Mat4} out
 * @param {Mat4} out the receiving matrix
 * @method module:mat4.invert
 */
function invert(a, out) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
};

/**
 * Calculates the adjugate of a mat4
 *
 * @param {Mat4} a the source matrix
 * @returns {Mat4} out
 * @param {Mat4} out the receiving matrix
 * @method module:mat4.adjoint
 */
function adjoint(a, out) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    out[0]  =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
    out[1]  = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    out[2]  =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
    out[3]  = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    out[4]  = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    out[5]  =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
    out[6]  = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    out[7]  =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
    out[8]  =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
    out[9]  = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    out[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    out[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    out[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
    return out;
};

/**
 * Calculates the determinant of a mat4
 *
 * @param {Mat4} a the source matrix
 * @returns {number} determinant of a
 * @method module:mat4.determinant
 */
function determinant(a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};

/**
 * Multiplies two mat4's
 *
 * @param {Mat4} a the first operand
 * @param {Mat4} b the second operand
 * @returns {Mat4} out
 * @param {Mat4} out the receiving matrix
 * @method module:mat4.multiply
 */
function multiply(a, b, out) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return out;
};

/**
 * Alias for {@link mat4.multiply}
 * @function
 * @method module:mat4.mul
 */


/**
 * Translate a mat4 by the given vector
 *
 * @param {Mat4} a the matrix to translate
 * @param {Vec3} v vector to translate by
 * @returns {Mat4} out
 * @param {Mat4} out the receiving matrix
 * @method module:mat4.translate
 */
function translate(a, v, out) {
    var x = v[0], y = v[1], z = v[2],
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23;

    if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
        a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
        a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
        a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

        out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
        out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
        out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }

    return out;
};

/**
 * Scales the mat4 by the dimensions in the given vec3
 *
 * @param {Mat4} a the matrix to scale
 * @param {Vec3} v the vec3 to scale the matrix by
 * @returns {Mat4} out
 * @param {Mat4} out the receiving matrix
 * @method module:mat4.scale
 */
function scale(a, v, out) {
    var x = v[0], y = v[1], z = v[2];

    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Rotates a mat4 by the given angle around the given axis
 *
 * @param {Mat4} a the matrix to rotate
 * @param {number} rad the angle to rotate the matrix by
 * @param {Vec3} axis the axis to rotate around
 * @returns {Mat4} out
 * @param {Mat4} out the receiving matrix
 * @method module:mat4.rotate
 */
function rotate(a, rad, axis, out) {
    var x = axis[0], y = axis[1], z = axis[2],
        len = Math.sqrt(x * x + y * y + z * z),
        s, c, t,
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23,
        b00, b01, b02,
        b10, b11, b12,
        b20, b21, b22;

    if (Math.abs(len) < GLMAT_EPSILON) { return null; }
    
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

    // Construct the elements of the rotation matrix
    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

    // Perform rotation-specific matrix multiplication
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    return out;
};

/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {Mat4} a the matrix to rotate
 * @param {number} rad the angle to rotate the matrix by
 * @returns {Mat4} out
 * @param {Mat4} out the receiving matrix
 * @method module:mat4.rotateX
 */
function rotateX(a, rad, out) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[0]  = a[0];
        out[1]  = a[1];
        out[2]  = a[2];
        out[3]  = a[3];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
};

/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {Mat4} a the matrix to rotate
 * @param {number} rad the angle to rotate the matrix by
 * @returns {Mat4} out
 * @param {Mat4} out the receiving matrix
 * @method module:mat4.rotateY
 */
function rotateY(a, rad, out) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[4]  = a[4];
        out[5]  = a[5];
        out[6]  = a[6];
        out[7]  = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
};

/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {Mat4} a the matrix to rotate
 * @param {number} rad the angle to rotate the matrix by
 * @returns {Mat4} out
 * @param {Mat4} out the receiving matrix
 * @method module:mat4.rotateZ
 */
function rotateZ(a, rad, out) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[8]  = a[8];
        out[9]  = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
};

/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, dest, vec);
 *
 * @param {Vec3} v Translation vector
 * @returns {Mat4} out
 * @param {Mat4} out mat4 receiving operation result
 * @method module:mat4.fromTranslation
 */
function fromTranslation(v, out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
}

/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.scale(dest, dest, vec);
 *
 * @param {Vec3} v Scaling vector
 * @returns {Mat4} out
 * @param {Mat4} out mat4 receiving operation result
 * @method module:mat4.fromScaling
 */
function fromScaling(v, out) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = v[1];
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = v[2];
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
}

/**
 * Creates a matrix from a given angle around a given axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotate(dest, dest, rad, axis);
 *
 * @param {number} rad the angle to rotate the matrix by
 * @param {Vec3} axis the axis to rotate around
 * @returns {Mat4} out
 * @param {Mat4} out mat4 receiving operation result
 * @method module:mat4.fromRotation
 */
function fromRotation(rad, axis, out) {
    var x = axis[0], y = axis[1], z = axis[2],
        len = Math.sqrt(x * x + y * y + z * z),
        s, c, t;
    
    if (Math.abs(len) < GLMAT_EPSILON) { return null; }
    
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;
    
    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;
    
    // Perform rotation-specific matrix multiplication
    out[0] = x * x * t + c;
    out[1] = y * x * t + z * s;
    out[2] = z * x * t - y * s;
    out[3] = 0;
    out[4] = x * y * t - z * s;
    out[5] = y * y * t + c;
    out[6] = z * y * t + x * s;
    out[7] = 0;
    out[8] = x * z * t + y * s;
    out[9] = y * z * t - x * s;
    out[10] = z * z * t + c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
}

/**
 * Creates a matrix from the given angle around the X axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateX(dest, dest, rad);
 *
 * @param {number} rad the angle to rotate the matrix by
 * @returns {Mat4} out
 * @param {Mat4} out mat4 receiving operation result
 * @method module:mat4.fromXRotation
 */
function fromXRotation(rad, out) {
    var s = Math.sin(rad),
        c = Math.cos(rad);
    
    // Perform axis-specific matrix multiplication
    out[0]  = 1;
    out[1]  = 0;
    out[2]  = 0;
    out[3]  = 0;
    out[4] = 0;
    out[5] = c;
    out[6] = s;
    out[7] = 0;
    out[8] = 0;
    out[9] = -s;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
}

/**
 * Creates a matrix from the given angle around the Y axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateY(dest, dest, rad);
 *
 * @param {number} rad the angle to rotate the matrix by
 * @returns {Mat4} out
 * @param {Mat4} out mat4 receiving operation result
 * @method module:mat4.fromYRotation
 */
function fromYRotation(rad, out) {
    var s = Math.sin(rad),
        c = Math.cos(rad);
    
    // Perform axis-specific matrix multiplication
    out[0]  = c;
    out[1]  = 0;
    out[2]  = -s;
    out[3]  = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = s;
    out[9] = 0;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
}

/**
 * Creates a matrix from the given angle around the Z axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateZ(dest, dest, rad);
 *
 * @param {number} rad the angle to rotate the matrix by
 * @returns {Mat4} out
 * @param {Mat4} out mat4 receiving operation result
 * @method module:mat4.fromZRotation
 */
function fromZRotation(rad, out) {
    var s = Math.sin(rad),
        c = Math.cos(rad);
    
    // Perform axis-specific matrix multiplication
    out[0]  = c;
    out[1]  = s;
    out[2]  = 0;
    out[3]  = 0;
    out[4] = -s;
    out[5] = c;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
}

/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     var quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {quat4} q Rotation quaternion
 * @param {Vec3} v Translation vector
 * @returns {Mat4} out
 * @param {Mat4} out mat4 receiving operation result
 * @method module:mat4.fromRotationTranslation
 */
function fromRotationTranslation(q, v, out) {
    // Quaternion math
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    
    return out;
};

/**
 * Creates a matrix from a quaternion rotation, vector translation and vector scale
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     var quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *     mat4.scale(dest, scale)
 *
 * @param {quat4} q Rotation quaternion
 * @param {Vec3} v Translation vector
 * @param {Vec3} s Scaling vector
 * @returns {Mat4} out
 * @param {Mat4} out mat4 receiving operation result
 * @method module:mat4.fromRotationTranslationScale
 */
function fromRotationTranslationScale(q, v, s, out) {
    // Quaternion math
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2,
        sx = s[0],
        sy = s[1],
        sz = s[2];

    out[0] = (1 - (yy + zz)) * sx;
    out[1] = (xy + wz) * sx;
    out[2] = (xz - wy) * sx;
    out[3] = 0;
    out[4] = (xy - wz) * sy;
    out[5] = (1 - (xx + zz)) * sy;
    out[6] = (yz + wx) * sy;
    out[7] = 0;
    out[8] = (xz + wy) * sz;
    out[9] = (yz - wx) * sz;
    out[10] = (1 - (xx + yy)) * sz;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    
    return out;
};

/**
 * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     mat4.translate(dest, origin);
 *     var quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *     mat4.scale(dest, scale)
 *     mat4.translate(dest, negativeOrigin);
 *
 * @param {quat4} q Rotation quaternion
 * @param {Vec3} v Translation vector
 * @param {Vec3} s Scaling vector
 * @param {Vec3} o The origin vector around which to scale and rotate
 * @returns {Mat4} out
 * @param {Mat4} out mat4 receiving operation result
 * @method module:mat4.fromRotationTranslationScaleOrigin
 */
function fromRotationTranslationScaleOrigin(q, v, s, o, out) {
  // Quaternion math
  var x = q[0], y = q[1], z = q[2], w = q[3],
      x2 = x + x,
      y2 = y + y,
      z2 = z + z,

      xx = x * x2,
      xy = x * y2,
      xz = x * z2,
      yy = y * y2,
      yz = y * z2,
      zz = z * z2,
      wx = w * x2,
      wy = w * y2,
      wz = w * z2,
      
      sx = s[0],
      sy = s[1],
      sz = s[2],

      ox = o[0],
      oy = o[1],
      oz = o[2];
      
  out[0] = (1 - (yy + zz)) * sx;
  out[1] = (xy + wz) * sx;
  out[2] = (xz - wy) * sx;
  out[3] = 0;
  out[4] = (xy - wz) * sy;
  out[5] = (1 - (xx + zz)) * sy;
  out[6] = (yz + wx) * sy;
  out[7] = 0;
  out[8] = (xz + wy) * sz;
  out[9] = (yz - wx) * sz;
  out[10] = (1 - (xx + yy)) * sz;
  out[11] = 0;
  out[12] = v[0] + ox - (out[0] * ox + out[4] * oy + out[8] * oz);
  out[13] = v[1] + oy - (out[1] * ox + out[5] * oy + out[9] * oz);
  out[14] = v[2] + oz - (out[2] * ox + out[6] * oy + out[10] * oz);
  out[15] = 1;
        
  return out;
};

function fromQuat(q, out) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        yx = y * x2,
        yy = y * y2,
        zx = z * x2,
        zy = z * y2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;

    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;

    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
};

/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {Mat4} out
 * @param {Mat4} out mat4 frustum matrix will be written into
 * @method module:mat4.frustum
 */
function frustum(left, right, bottom, top, near, far, out) {
    var rl = 1 / (right - left),
        tb = 1 / (top - bottom),
        nf = 1 / (near - far);
    out[0] = (near * 2) * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = (near * 2) * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (far * near * 2) * nf;
    out[15] = 0;
    return out;
};

/**
 * Generates a perspective projection matrix with the given bounds
 *
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {Mat4} out
 * @param {Mat4} out mat4 frustum matrix will be written into
 * @method module:mat4.perspective
 */
function perspective(fovy, aspect, near, far, out) {
    var f = 1.0 / Math.tan(fovy / 2),
        nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return out;
};

/**
 * Generates a perspective projection matrix with the given field of view.
 * This is primarily useful for generating projection matrices to be used
 * with the still experiemental WebVR API.
 *
 * @param {number} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {Mat4} out
 * @param {Mat4} out mat4 frustum matrix will be written into
 * @method module:mat4.perspectiveFromFieldOfView
 */
function perspectiveFromFieldOfView(fov, near, far, out) {
    var upTan = Math.tan(fov.upDegrees * Math.PI/180.0),
        downTan = Math.tan(fov.downDegrees * Math.PI/180.0),
        leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0),
        rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0),
        xScale = 2.0 / (leftTan + rightTan),
        yScale = 2.0 / (upTan + downTan);

    out[0] = xScale;
    out[1] = 0.0;
    out[2] = 0.0;
    out[3] = 0.0;
    out[4] = 0.0;
    out[5] = yScale;
    out[6] = 0.0;
    out[7] = 0.0;
    out[8] = -((leftTan - rightTan) * xScale * 0.5);
    out[9] = ((upTan - downTan) * yScale * 0.5);
    out[10] = far / (near - far);
    out[11] = -1.0;
    out[12] = 0.0;
    out[13] = 0.0;
    out[14] = (far * near) / (near - far);
    out[15] = 0.0;
    return out;
}

/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {Mat4} out
 * @param {Mat4} out mat4 frustum matrix will be written into
 * @method module:mat4.ortho
 */
function ortho(left, right, bottom, top, near, far, out) {
    var lr = 1 / (left - right),
        bt = 1 / (bottom - top),
        nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
};

/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {Vec3} eye Position of the viewer
 * @param {Vec3} center Point the viewer is looking at
 * @param {Vec3} up vec3 pointing up
 * @returns {Mat4} out
 * @param {Mat4} out mat4 frustum matrix will be written into
 * @method module:mat4.lookAt
 */
function lookAt(eye, center, up, out) {
    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
        eyex = eye[0],
        eyey = eye[1],
        eyez = eye[2],
        upx = up[0],
        upy = up[1],
        upz = up[2],
        centerx = center[0],
        centery = center[1],
        centerz = center[2];

    if (Math.abs(eyex - centerx) < GLMAT_EPSILON &&
        Math.abs(eyey - centery) < GLMAT_EPSILON &&
        Math.abs(eyez - centerz) < GLMAT_EPSILON) {
        return identity(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
};

/**
 * Returns a string representation of a mat4
 *
 * @param {Mat4} a matrix to represent as a string
 * @returns {string} string representation of the matrix
 * @method module:mat4.str
 */
function str(a) {
    return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
                    a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
                    a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' + 
                    a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
};

/**
 * Returns Frobenius norm of a mat4
 *
 * @param {Mat4} a the matrix to calculate Frobenius norm of
 * @returns {number} Frobenius norm
 * @method module:mat4.frob
 */
function frob(a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2) + Math.pow(a[9], 2) + Math.pow(a[10], 2) + Math.pow(a[11], 2) + Math.pow(a[12], 2) + Math.pow(a[13], 2) + Math.pow(a[14], 2) + Math.pow(a[15], 2) ))
};


/***/ }),
/* 8 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["b"] = create;
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "h", function() { return rotationTo; });
/* unused harmony export setAxes */
/* harmony export (immutable) */ __webpack_exports__["d"] = identity;
/* harmony export (immutable) */ __webpack_exports__["i"] = setAxisAngle;
/* harmony export (immutable) */ __webpack_exports__["f"] = multiply;
/* unused harmony export mul */
/* unused harmony export rotateX */
/* unused harmony export rotateY */
/* unused harmony export rotateZ */
/* unused harmony export calculateW */
/* harmony export (immutable) */ __webpack_exports__["j"] = slerp;
/* unused harmony export sqlerp */
/* harmony export (immutable) */ __webpack_exports__["e"] = invert;
/* unused harmony export conjugate */
/* harmony export (immutable) */ __webpack_exports__["c"] = fromMat3;
/* unused harmony export str */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__vec3_js__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__vec4_js__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__mat3_js__ = __webpack_require__(4);
/* unused harmony reexport clone */
/* unused harmony reexport fromValues */
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return __WEBPACK_IMPORTED_MODULE_1__vec4_js__["a"]; });
/* unused harmony reexport set */
/* unused harmony reexport add */
/* unused harmony reexport scale */
/* unused harmony reexport dot */
/* unused harmony reexport lerp */
/* unused harmony reexport length */
/* unused harmony reexport len */
/* unused harmony reexport squaredLength */
/* unused harmony reexport sqrLen */
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "g", function() { return __WEBPACK_IMPORTED_MODULE_1__vec4_js__["d"]; });




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
function create() {
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
var rotationTo = (function() {
    var tmpvec3 = __WEBPACK_IMPORTED_MODULE_0__vec3_js__["c" /* create */]();
    var xUnitVec3 = __WEBPACK_IMPORTED_MODULE_0__vec3_js__["f" /* fromValues */](1,0,0);
    var yUnitVec3 = __WEBPACK_IMPORTED_MODULE_0__vec3_js__["f" /* fromValues */](0,1,0);

    return function(a, b, out) {
        var dot = __WEBPACK_IMPORTED_MODULE_0__vec3_js__["e" /* dot */](a, b);
        if (dot < -0.9999999) {
            __WEBPACK_IMPORTED_MODULE_0__vec3_js__["d" /* cross */](xUnitVec3, a, tmpvec3); /* NOTE: CUSTOM REORDER: (tmpvec3, xUnitVec3, a)->(xUnitVec3, a ,tmpvec3) */
            if (__WEBPACK_IMPORTED_MODULE_0__vec3_js__["h" /* length */](tmpvec3) < 0.000001)
                __WEBPACK_IMPORTED_MODULE_0__vec3_js__["d" /* cross */](yUnitVec3, a, tmpvec3); /* NOTE: CUSTOM REORDER: (tmpvec3, yUnitVec3, a)->(yUnitVec3, a ,tmpvec3) */
            __WEBPACK_IMPORTED_MODULE_0__vec3_js__["l" /* normalize */](tmpvec3, tmpvec3);
            setAxisAngle(tmpvec3, Math.PI, out); /* NOTE: CUSTOM REORDER: (out, tmpvec3, Math.PI)->(tmpvec3, Math.PI ,out)*/
            return out;
        } else if (dot > 0.9999999) {
            out[0] = 0;
            out[1] = 0;
            out[2] = 0;
            out[3] = 1;
            return out;
        } else {
            __WEBPACK_IMPORTED_MODULE_0__vec3_js__["d" /* cross */](a, b, tmpvec3); /* NOTE: CUSTOM REORDER: (tmpvec3, a, b)->(a, b ,tmpvec3) */
            out[0] = tmpvec3[0];
            out[1] = tmpvec3[1];
            out[2] = tmpvec3[2];
            out[3] = 1 + dot;
            return __WEBPACK_IMPORTED_MODULE_1__vec4_js__["d" /* normalize */](out, out);
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
var setAxes = (function() {
    var matr = __WEBPACK_IMPORTED_MODULE_2__mat3_js__["b" /* create */]();

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

        return __WEBPACK_IMPORTED_MODULE_1__vec4_js__["d" /* normalize */](fromMat3(matr, out), out); /* NOTE: DOUBLE CUSTOM REORDER */
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


/**
 * Copy the values from one quat to another
 *
 * @param {Quat} a the source quaternion
 * @returns {Quat} out
 * @function
 * @param {Quat} out the receiving quaternion
 * @method module:quat.copy
 */


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


/**
 * Set a quat to the identity quaternion
 *
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.identity
 */
function identity(out) {
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
function setAxisAngle(axis, rad, out) {
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


/**
 * Multiplies two quat's
 *
 * @param {Quat} a the first operand
 * @param {Quat} b the second operand
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.multiply
 */
function multiply(a, b, out) {
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


/**
 * Rotates a quaternion by the given angle about the X axis
 *
 * @param {Quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {Quat} out
 * @param {Quat} out quat receiving operation result
 * @method module:quat.rotateX
 */
function rotateX(a, rad, out) {
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
function rotateY(a, rad, out) {
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
function rotateZ(a, rad, out) {
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
function calculateW(a, out) {
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
function slerp(a, b, t, out) {
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
var sqlerp = (function () {
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
function invert(a, out) {
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
function conjugate(a, out) {
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


/**
 * Alias for {@link quat.length}
 * @function
 * @method module:quat.len
 */


/**
 * Calculates the squared length of a quat
 *
 * @param {Quat} a vector to calculate squared length of
 * @returns {number} squared length of a
 * @function
 * @method module:quat.squaredLength
 */


/**
 * Alias for {@link quat.squaredLength}
 * @function
 * @method module:quat.sqrLen
 */


/**
 * Normalize a quat
 *
 * @param {Quat} a quaternion to normalize
 * @returns {Quat} out
 * @function
 * @param {Quat} out the receiving quaternion
 * @method module:quat.normalize
 */


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
function fromMat3(m, out) {
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
function str(a) {
    return 'quat(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};


/***/ }),
/* 9 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__util_register_js__ = __webpack_require__(1);


/**
 * Print API. Overrides some standart js console functions
 * @name print
 * @namespace
 * @exports exports as print
 */
function Print(ns, exports) {

// no module requires

var _verbose = false;
var _error_count = 0;
var _warning_count = 0;

var _deprecated_methods = {};
/**
 * Set verbose flag for console output.
 */
exports.set_verbose = function(v) {
    _verbose = v;
}

exports.log_raw = function() {
    console.log.apply(console, arguments);
}

exports.log = function() {
    if (_verbose) {
        var args = compose_args_prefix(arguments, "B4W LOG");
        console.log.apply(console, args);
    }
}

exports.compose_args_prefix = compose_args_prefix;
function compose_args_prefix(args_in, prefix) {
    var args_out = [];

    if (args_in[0].indexOf("%c") > -1)
        args_out.push(args_in[0].replace("%c", "%c" + prefix + ": "));
    else
        args_out.push(prefix + ": " + args_in[0]);

    for (var i = 1; i < args_in.length; i++)
        args_out.push(args_in[i]);

    return args_out;
}

exports.error = error;
function error() {
    // always reporting errors
    _error_count++;

    var args = compose_args_prefix(arguments, "B4W ERROR");
    console.error.apply(console, args);
}
exports.error_once = error_once;
function error_once(message) {
    if (!(message in _deprecated_methods)) {
        _deprecated_methods[message] = message;
        error([message]);
    }
}

exports.error_deprecated = error_deprecated;
function error_deprecated(depr_func, new_func) {
    error_once(depr_func + "() is deprecated, use " + new_func + "() instead.");
}

exports.error_deprecated_arr = function(depr_func, new_func_arr) {
    switch (new_func_arr.length > 1) {
    case true:
        error_once(depr_func + "() is deprecated, use " 
                + new_func_arr.slice(0, -1).join("(), ")
                + "() or " + new_func_arr[new_func_arr.length - 1] + "() instead.");
        break;
    case false:
        error_deprecated(depr_func, new_func_arr[0]);
        break;
    }
}

exports.error_deprecated_cfg = function(depr_cfg, new_cfg) {
    if (new_cfg === undefined)
        error_once("Config option \"" + depr_cfg + "\" is deprecated.");
    else
        error_once("Config option \"" + depr_cfg + "\" is deprecated, use \"" +
                new_cfg + "\" instead.");
}

exports.warn = function() {
    // always reporting warnings
    _warning_count++;

    var args = compose_args_prefix(arguments, "B4W WARN");
    console.warn.apply(console, args);
}

exports.info = function() {
    var args = compose_args_prefix(arguments, "B4W INFO");
    console.info.apply(console, args);
}

exports.export_error = function() {
    // always reporting errors
    _error_count++;

    var args = compose_args_prefix(arguments, "B4W EXPORT ERROR");
    console.error.apply(console, args);
}

exports.export_warn = function() {
    // always reporting warnings
    _warning_count++;

    var args = compose_args_prefix(arguments, "B4W EXPORT WARNING");
    console.warn.apply(console, args);
}

exports.time = function() {
    if (_verbose)
        console.time.apply(console, arguments);
}

exports.timeEnd = function() {
    if (_verbose)
        console.timeEnd.apply(console, arguments);
}

exports.group = function() {
    console.group.apply(console, arguments);
}

exports.groupCollapsed = function() {
    console.groupCollapsed.apply(console, arguments);
}

exports.groupEnd = function() {
    console.groupEnd.apply(console, arguments);
}

exports.clear = function() {
    if (typeof console.clear == "function")
        console.clear.apply(console, arguments);
}

exports.get_warning_count = function() {
    return _warning_count;
}

exports.get_error_count = function() {
    return _error_count;
}

exports.clear_errors_warnings = function() {
    _warning_count = 0;
    _error_count = 0;
}

}

var print_factory = Object(__WEBPACK_IMPORTED_MODULE_0__util_register_js__["a" /* default */])("print", Print);
Object(__WEBPACK_IMPORTED_MODULE_0__util_register_js__["a" /* default */])("__print", Print);

/* harmony default export */ __webpack_exports__["a"] = (print_factory);


/***/ }),
/* 10 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__src_util_b4w_js__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__src_intern_ipc_js__ = __webpack_require__(11);




/* harmony default export */ __webpack_exports__["default"] = (__WEBPACK_IMPORTED_MODULE_0__src_util_b4w_js__["a" /* default */]);

/***/ }),
/* 11 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__util_register_js__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__util_b4w_js__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__util_assert_js__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__util_generator_js__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__util_path_js__ = __webpack_require__(15);







/**
 * Physics worker Inter Process Communication API.
 * @name ipc
 * @namespace
 * @exports exports as ipc
 */
function Int_IPC(ns, exports) {

var m_assert = Object(__WEBPACK_IMPORTED_MODULE_2__util_assert_js__["a" /* default */])(ns);
var m_generator = Object(__WEBPACK_IMPORTED_MODULE_3__util_generator_js__["a" /* default */])(ns);

/*
 * Use Visual Incrementing script to simplify assignment of such numbers in VIM
 * http://www.drchip.org/astronaut/vim/index.html#VISINCR
 */
var _wait_for_loading = true;
// MAIN <- PHYSICS
exports.IN_LOADED                = 0 ;
exports.IN_COLLISION             = 1 ;
exports.IN_COLLISION_POS_NORM    = 2 ;
exports.IN_COLLISION_IMPULSE     = 3 ;
exports.IN_ERROR                 = 4 ;
exports.IN_FBMSG                 = 5 ;
exports.IN_FLOATER_BOB_TRANSFORM = 6 ;
exports.IN_LOG                   = 7 ;
exports.IN_PROP_OFFSET           = 8 ;
exports.IN_RAY_HIT               = 9 ;
exports.IN_RAY_HIT_POS_NORM      = 10;
exports.IN_REMOVE_RAY_TEST       = 11;
exports.IN_TRANSFORM             = 12;
exports.IN_VEHICLE_SPEED         = 13;
exports.IN_PING                  = 14;
exports.IN_FPS                   = 15;
exports.IN_DEBUG_STATS           = 16;

var IN_COLLISION          = exports.IN_COLLISION;
var IN_COLLISION_POS_NORM = exports.IN_COLLISION_POS_NORM;
var IN_PROP_OFFSET        = exports.IN_PROP_OFFSET;
var IN_RAY_HIT            = exports.IN_RAY_HIT;
var IN_RAY_HIT_POS_NORM   = exports.IN_RAY_HIT_POS_NORM;
var IN_TRANSFORM          = exports.IN_TRANSFORM;

// MAIN -> PHYSICS
exports.OUT_INIT                              = 100;
exports.OUT_ACTIVATE                          = 101;
exports.OUT_ADD_BOAT_BOB                      = 102;
exports.OUT_ADD_CAR_WHEEL                     = 103;
exports.OUT_ADD_FLOATER_BOB                   = 104;
exports.OUT_APPEND_BOUNDING_BODY              = 105;
exports.OUT_APPEND_BOAT                       = 106;
exports.OUT_APPEND_CAR                        = 107;
exports.OUT_APPEND_CHARACTER                  = 108;
exports.OUT_APPEND_COLLISION_TEST             = 109;
exports.OUT_APPEND_CONSTRAINT                 = 110;
exports.OUT_APPEND_FLOATER                    = 111;
exports.OUT_APPEND_GHOST_MESH_BODY            = 112;
exports.OUT_APPEND_STATIC_MESH_BODY           = 113;
exports.OUT_APPEND_WATER                      = 114;
exports.OUT_REMOVE_BODY                       = 115;
exports.OUT_APPLY_CENTRAL_FORCE               = 116;
exports.OUT_APPLY_COLLISION_IMPULSE_TEST      = 117;
exports.OUT_APPLY_TORQUE                      = 118;
exports.OUT_CHARACTER_JUMP                    = 119;
exports.OUT_CHARACTER_ROTATION_INCREMENT      = 120;
exports.OUT_CLEAR_COLLISION_IMPULSE_TEST      = 121;
exports.OUT_DISABLE_SIMULATION                = 122;
exports.OUT_ENABLE_SIMULATION                 = 123;
exports.OUT_PAUSE                             = 124;
exports.OUT_APPEND_RAY_TEST                   = 125;
exports.OUT_REMOVE_RAY_TEST                   = 126;
exports.OUT_CHANGE_RAY_TEST_FROM_TO           = 127;
exports.OUT_REMOVE_COLLISION_TEST             = 128;
exports.OUT_REMOVE_CONSTRAINT                 = 129;
exports.OUT_RESUME                            = 130;
exports.OUT_SET_CHARACTER_FLY_VELOCITY        = 131;
exports.OUT_SET_CHARACTER_HOR_ROTATION        = 132;
exports.OUT_SET_CHARACTER_MOVE_DIR            = 133;
exports.OUT_SET_CHARACTER_MOVE_TYPE           = 134;
exports.OUT_SET_CHARACTER_ROTATION            = 135;
exports.OUT_SET_CHARACTER_RUN_VELOCITY        = 136;
exports.OUT_SET_CHARACTER_VERT_ROTATION       = 137;
exports.OUT_SET_CHARACTER_WALK_VELOCITY       = 138;
exports.OUT_SET_GRAVITY                       = 139;
exports.OUT_SET_LINEAR_VELOCITY               = 140;
exports.OUT_SET_TRANSFORM                     = 141;
exports.OUT_SET_WATER_TIME                    = 142;
exports.OUT_ADD_WATER_WRAPPER                 = 143;
exports.OUT_UPDATE_BOAT_CONTROLS              = 144;
exports.OUT_UPDATE_CAR_CONTROLS               = 145;
exports.OUT_PING                              = 146;
exports.OUT_DEBUG                             = 147;
exports.OUT_UPDATE_WORLD                      = 148;
exports.OUT_SET_ANGULAR_VELOCITY              = 149;
exports.OUT_SET_CHARACTER_VERT_MOVE_DIR_ANGLE = 150;
exports.OUT_UPDATE_BOUNDING_BODY              = 151;
exports.OUT_UPDATE_STATIC_MESH_BODY           = 152;

var OUT_SET_TRANSFORM = exports.OUT_SET_TRANSFORM;

var _worker_listeners = __WEBPACK_IMPORTED_MODULE_1__util_b4w_js__["a" /* default */].worker_listeners;
var _worker_namespaces = __WEBPACK_IMPORTED_MODULE_1__util_b4w_js__["a" /* default */].worker_namespaces;

var _msg_cache_IN_TRANSFORM = {
    msg_id:   IN_TRANSFORM,

    body_id:  0,
    time:     0,
    trans:    new Float32Array(3),
    quat:     new Float32Array(4),
    linvel:   new Float32Array(3),
    angvel:   new Float32Array(3),

    len:      0
};

var _msg_cache_IN_PROP_OFFSET = {
    msg_id:               IN_PROP_OFFSET,

    chassis_hull_body_id: 0,
    prop_ind:             0,
    trans:                new Float32Array(3),
    quat:                 new Float32Array(4),

    len:                  0
};

var _msg_cache_IN_RAY_HIT = {
    msg_id:      IN_RAY_HIT,

    id:          0,
    body_id_hit: 0,
    hit_fract:   0,
    hit_time:    0,

    len:         0
};

var _msg_cache_IN_RAY_HIT_POS_NORM = {
    msg_id:      IN_RAY_HIT_POS_NORM,

    id:          0,
    body_id_hit: 0,
    hit_fract:   0,
    hit_time:    0,
    hit_pos:     new Float32Array(3),
    hit_norm:    new Float32Array(3),

    len:         0
};

var _msg_cache_IN_COLLISION = {
    msg_id:     IN_COLLISION,

    body_id_a:  0,
    body_id_b:  0,
    result:     0,

    len:        0
};

var _msg_cache_IN_COLLISION_POS_NORM = {
    msg_id:     IN_COLLISION_POS_NORM,

    body_id_a:  0,
    body_id_b:  0,
    result:     0,
    coll_point: new Float32Array(3),
    coll_norm:  new Float32Array(3),
    coll_dist:  0,

    len:        0
};

var _msg_cache_OUT_SET_TRANSFORM = {
    msg_id:  OUT_SET_TRANSFORM,

    body_id: 0,
    trans:   new Float32Array(3),
    quat:    new Float32Array(4),

    len:     0
};

var _msg_cache_list = [
    _msg_cache_IN_TRANSFORM,
    _msg_cache_IN_PROP_OFFSET,
    _msg_cache_IN_RAY_HIT,
    _msg_cache_IN_RAY_HIT_POS_NORM,
    _msg_cache_IN_COLLISION,
    _msg_cache_IN_COLLISION_POS_NORM,
    _msg_cache_OUT_SET_TRANSFORM
];

function find_script(src) {
    var scripts = document.getElementsByTagName("script");
    var norm_src = Object(__WEBPACK_IMPORTED_MODULE_4__util_path_js__["a" /* normpath_preserve_protocol */])(src);

    for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].src == norm_src)
            return scripts[i];
    }

    return null;
}

exports.create_worker = function(path, fallback) {
    var worker = {
        is_main: path ? true : false,
        web_worker: null,
        buf_arr: [],
        fb_worker_ns: ""
    }

    if (fallback) {
        var web_worker_fallback = {
            addEventListener: function(type, listener, useCapture) {
                if (type != "message")
                    m_assert.panic("Wrong web worker event");

                set_fallback_listener(worker.fb_worker_ns, worker.is_main,
                        listener);
            },

            removeEventListener: function(type, listener, useCapture) {
                if (type != "message")
                    m_assert.panic("Wrong web worker event");

                set_fallback_listener(worker.fb_worker_ns, worker.is_main, null);
            },

            postMessage: function(msg, msg2) {
                var listener = find_fallback_listener(worker.fb_worker_ns,
                        !worker.is_main);
                listener({"data": msg});
            },

            terminate: function() {
                for (var i = 0; i < _worker_namespaces.length; i+=2)
                    if (_worker_namespaces[i+1] == worker.fb_worker_ns) {
                        _worker_listeners.splice(i, 2);
                        _worker_namespaces.splice(i, 2);
                        return;
                    }
            }
        }

        worker.web_worker = web_worker_fallback;

        if (worker.is_main) {
            var main_ns = ns;
            var worker_ns = m_generator.unique_name(main_ns + "_worker");

            _worker_namespaces.push(main_ns);
            _worker_namespaces.push(worker_ns);

            _worker_listeners.push(null);
            _worker_listeners.push(null);

            worker.fb_worker_ns = worker_ns;

            var uranium_js = find_script(path);
            if (uranium_js) {
                // just register in the new namespace
                if (_wait_for_loading)
                    uranium_js.addEventListener("load", function() {
                        __WEBPACK_IMPORTED_MODULE_1__util_b4w_js__["a" /* default */].require("__bindings", worker.fb_worker_ns);
                    }, false);
                else {
                    __WEBPACK_IMPORTED_MODULE_1__util_b4w_js__["a" /* default */].cleanup("__bindings", worker.fb_worker_ns);
                    __WEBPACK_IMPORTED_MODULE_1__util_b4w_js__["a" /* default */].cleanup("__ipc", worker.fb_worker_ns);
                    __WEBPACK_IMPORTED_MODULE_1__util_b4w_js__["a" /* default */].require("__bindings", worker.fb_worker_ns);
                }
            } else {
                // load and register
                uranium_js = document.createElement("script");

                uranium_js.src = path;
                uranium_js.defer = "defer";
                uranium_js.async = "async";
                uranium_js.addEventListener("load", function() {
                    _wait_for_loading = false;
                    __WEBPACK_IMPORTED_MODULE_1__util_b4w_js__["a" /* default */].require("__bindings", worker.fb_worker_ns);
                }, false);

                document.head.appendChild(uranium_js);
            }
        } else {
            // !!!WARNING: es6 module!!!
            // worker.fb_worker_ns = b4w.get_namespace(b4w.require);
            worker.fb_worker_ns = ns;
        }
    } else {
        if (path)
            worker.web_worker = new Worker(path);
        else
            worker.web_worker = self;
    }

    return worker;
}

function set_fallback_listener(worker_ns, is_main, listener) {
    for (var i = 0; i < _worker_namespaces.length; i+=2)
        if (_worker_namespaces[i+1] == worker_ns)
            _worker_listeners[i + Number(!is_main)] = listener;
}

function find_fallback_listener(worker_ns, is_main) {
    for (var i = 0; i < _worker_namespaces.length; i+=2)
        if (_worker_namespaces[i+1] == worker_ns)
            return _worker_listeners[i + Number(!is_main)];

    return null;
}

exports.attach_handler = function(worker, process_message_cb) {

    assign_msg_cache_length(_msg_cache_list);

    var preprocess_message_cb = function(event_data) {

        if (event_data.constructor == ArrayBuffer) {
            event_data = new Float32Array(event_data);
        } else if (event_data[0].constructor == ArrayBuffer) {
            for (var i = 0; i < event_data.length; i++)
                preprocess_message_cb(event_data[i]);
            return;
        }

        var msg_id = event_data[0] | 0;

        switch (msg_id) {
        case IN_TRANSFORM:
            var data = _msg_cache_IN_TRANSFORM;

            data.body_id   = event_data[1 ] | 0;
            data.time      = event_data[2 ];
            data.trans[0]  = event_data[3 ];
            data.trans[1]  = event_data[4 ];
            data.trans[2]  = event_data[5 ];
            data.quat[0]   = event_data[6 ];
            data.quat[1]   = event_data[7 ];
            data.quat[2]   = event_data[8 ];
            data.quat[3]   = event_data[9 ];
            data.linvel[0] = event_data[10];
            data.linvel[1] = event_data[11];
            data.linvel[2] = event_data[12];
            data.angvel[0] = event_data[13];
            data.angvel[1] = event_data[14];
            data.angvel[2] = event_data[15];
            break;
        case IN_PROP_OFFSET:
            var data = _msg_cache_IN_PROP_OFFSET;

            data.chassis_hull_body_id = event_data[1] | 0;
            data.prop_ind             = event_data[2] | 0;
            data.trans[0]             = event_data[3];
            data.trans[1]             = event_data[4];
            data.trans[2]             = event_data[5];
            data.quat[0]              = event_data[6];
            data.quat[1]              = event_data[7];
            data.quat[2]              = event_data[8];
            data.quat[3]              = event_data[9];
            break;
        case IN_RAY_HIT:
            var data = _msg_cache_IN_RAY_HIT;

            data.id          = event_data[1] | 0;
            data.body_id_hit = event_data[2] | 0;
            data.hit_fract   = event_data[3];
            data.hit_time    = event_data[4];

            break;
        case IN_RAY_HIT_POS_NORM:
            var data = _msg_cache_IN_RAY_HIT_POS_NORM;

            data.id          = event_data[ 1] | 0;
            data.body_id_hit = event_data[ 2] | 0;
            data.hit_fract   = event_data[ 3];
            data.hit_time    = event_data[ 4];
            data.hit_pos[0]  = event_data[ 5];
            data.hit_pos[1]  = event_data[ 6];
            data.hit_pos[2]  = event_data[ 7];
            data.hit_norm[0] = event_data[ 8];
            data.hit_norm[1] = event_data[ 9];
            data.hit_norm[2] = event_data[10];

            break;
        case IN_COLLISION:
            var data = _msg_cache_IN_COLLISION;

            data.body_id_a     =   event_data[1] | 0;
            data.body_id_b     =   event_data[2] | 0;
            data.result        = !!event_data[3];
            break;
        case IN_COLLISION_POS_NORM:
            var data = _msg_cache_IN_COLLISION_POS_NORM;

            data.body_id_a     =   event_data[ 1] | 0;
            data.body_id_b     =   event_data[ 2] | 0;
            data.result        = !!event_data[ 3];
            data.coll_point[0] =   event_data[ 4];
            data.coll_point[1] =   event_data[ 5];
            data.coll_point[2] =   event_data[ 6];
            data.coll_norm[0]  =   event_data[ 7];
            data.coll_norm[1]  =   event_data[ 8];
            data.coll_norm[2]  =   event_data[ 9];
            data.coll_dist     =   event_data[10];
            break;
        case OUT_SET_TRANSFORM:
            var data = _msg_cache_OUT_SET_TRANSFORM;

            data.body_id  = event_data[1] | 0;
            data.trans[0] = event_data[2];
            data.trans[1] = event_data[3];
            data.trans[2] = event_data[4];
            data.quat[0]  = event_data[5];
            data.quat[1]  = event_data[6];
            data.quat[2]  = event_data[7];
            data.quat[3]  = event_data[8];
            break;
        default:
            var data = event_data;
            break;
        }

        process_message_cb(worker, msg_id, data);
    }

    worker.web_worker.addEventListener("message", function(event) {
        preprocess_message_cb(event.data);
    }, false);
}

function assign_msg_cache_length(msg_cache_list) {

    for (var i = 0; i < msg_cache_list.length; i++) {
        var cache = msg_cache_list[i];
        var len = 0;

        for (var j in cache) {
            var prop = cache[j];

            switch (prop.constructor) {
            case Float32Array:
                len += prop.length;
                break;
            case Number:
                len += 1;
                break;
            default:
                break;
            }
        }

        // exclude "len" itself
        len -= 1;

        cache.len = len;
    }
}

exports.cleanup = function() {
}

/**
 * Cached message post.
 * messages with same id must have same length
 * @methodOf physics
 */
exports.post_msg = function(worker, msg_id) {

    // not initialized for worker warm-up
    if (!worker)
        return;

    switch (msg_id) {
    case IN_TRANSFORM:
        var data = _msg_cache_IN_TRANSFORM;
        var msg = new Float32Array(data.len);

        msg[0 ] = data.msg_id;
        msg[1 ] = data.body_id;
        msg[2 ] = data.time;
        msg[3 ] = data.trans[0];
        msg[4 ] = data.trans[1];
        msg[5 ] = data.trans[2];
        msg[6 ] = data.quat[0];
        msg[7 ] = data.quat[1];
        msg[8 ] = data.quat[2];
        msg[9 ] = data.quat[3];
        msg[10] = data.linvel[0];
        msg[11] = data.linvel[1];
        msg[12] = data.linvel[2];
        msg[13] = data.angvel[0];
        msg[14] = data.angvel[1];
        msg[15] = data.angvel[2];

        worker.buf_arr.push(msg.buffer);
        break;
    case IN_PROP_OFFSET:
        var data = _msg_cache_IN_PROP_OFFSET;
        var msg = new Float32Array(data.len);

        msg[0] = data.msg_id;
        msg[1] = data.chassis_hull_body_id;
        msg[2] = data.prop_ind;
        msg[3] = data.trans[0];
        msg[4] = data.trans[1];
        msg[5] = data.trans[2];
        msg[6] = data.quat[0];
        msg[7] = data.quat[1];
        msg[8] = data.quat[2];
        msg[9] = data.quat[3];

        worker.buf_arr.push(msg.buffer);
        break;
    case IN_RAY_HIT:
        var data = _msg_cache_IN_RAY_HIT;
        var msg = new Float32Array(data.len);

        msg[0] = data.msg_id;
        msg[1] = data.id;
        msg[2] = data.body_id_hit;
        msg[3] = data.hit_fract;
        msg[4] = data.hit_time;

        worker.buf_arr.push(msg.buffer);
        break;
    case IN_RAY_HIT_POS_NORM:
        var data = _msg_cache_IN_RAY_HIT_POS_NORM;
        var msg = new Float32Array(data.len);

        msg[ 0] = data.msg_id;
        msg[ 1] = data.id;
        msg[ 2] = data.body_id_hit;
        msg[ 3] = data.hit_fract;
        msg[ 4] = data.hit_time;
        msg[ 5] = data.hit_pos[0];
        msg[ 6] = data.hit_pos[1];
        msg[ 7] = data.hit_pos[2];
        msg[ 8] = data.hit_norm[0];
        msg[ 9] = data.hit_norm[1];
        msg[10] = data.hit_norm[2];

        worker.buf_arr.push(msg.buffer);
        break;
    case IN_COLLISION:
        var data = _msg_cache_IN_COLLISION;
        var msg = new Float32Array(data.len);

        msg[0] = data.msg_id;
        msg[1] = data.body_id_a;
        msg[2] = data.body_id_b;
        msg[3] = data.result;

        worker.buf_arr.push(msg.buffer);
        break;
    case IN_COLLISION_POS_NORM:
        var data = _msg_cache_IN_COLLISION_POS_NORM;
        var msg = new Float32Array(data.len);

        msg[ 0] = data.msg_id;
        msg[ 1] = data.body_id_a;
        msg[ 2] = data.body_id_b;
        msg[ 3] = data.result;
        msg[ 4] = data.coll_point[0];
        msg[ 5] = data.coll_point[1];
        msg[ 6] = data.coll_point[2];
        msg[ 7] = data.coll_norm[0];
        msg[ 8] = data.coll_norm[1];
        msg[ 9] = data.coll_norm[2];
        msg[10] = data.coll_dist;

        worker.buf_arr.push(msg.buffer);
        break;
    case OUT_SET_TRANSFORM:
        var data = _msg_cache_OUT_SET_TRANSFORM;
        var msg = new Float32Array(data.len);

        msg[0] = data.msg_id;
        msg[1] = data.body_id;
        msg[2] = data.trans[0];
        msg[3] = data.trans[1];
        msg[4] = data.trans[2];
        msg[5] = data.quat[0];
        msg[6] = data.quat[1];
        msg[7] = data.quat[2];
        msg[8] = data.quat[3];

        worker.buf_arr.push(msg.buffer);
        break;
    default:
        var msg = [];
        for (var i = 1; i < arguments.length; i++)
            msg.push(arguments[i]);
        worker.web_worker.postMessage(msg);
        break;
    }
}

exports.post_msg_arr = function(worker) {
    if (!worker || !worker.buf_arr.length)
        return;

    worker.web_worker.postMessage(worker.buf_arr);

    worker.buf_arr.length = 0;
}

exports.get_msg_cache = function(msg_id) {
    switch (msg_id) {
    case IN_TRANSFORM:
        return _msg_cache_IN_TRANSFORM;
    case IN_PROP_OFFSET:
        return _msg_cache_IN_PROP_OFFSET;
    case IN_RAY_HIT:
        return _msg_cache_IN_RAY_HIT;
    case IN_RAY_HIT_POS_NORM:
        return _msg_cache_IN_RAY_HIT_POS_NORM;
    case IN_COLLISION:
        return _msg_cache_IN_COLLISION;
    case IN_COLLISION_POS_NORM:
        return _msg_cache_IN_COLLISION_POS_NORM;
    case OUT_SET_TRANSFORM:
        return _msg_cache_OUT_SET_TRANSFORM;
    default:
        return null;
    }
}

exports.terminate = function(worker) {
    worker.web_worker.terminate();
    worker.web_worker = null;
}

exports.is_active = function(worker) {
    return !!worker.web_worker;
}

exports.is_fallback = function(worker) {
    return !!worker.fb_worker_ns;
}

}

var int_ipc_factory = Object(__WEBPACK_IMPORTED_MODULE_0__util_register_js__["a" /* default */])("__ipc", Int_IPC);

/* unused harmony default export */ var _unused_webpack_default_export = (int_ipc_factory);


/***/ }),
/* 12 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export get_pline_directional_vec */
/* unused harmony export get_pline_initial_point */
/* unused harmony export set_pline_initial_point */
/* unused harmony export set_pline_directional_vec */
/* unused harmony export calc_pline_point */
/* unused harmony export calk_average_position */
/* unused harmony export calc_covariance_matrix */
/* unused harmony export find_eigenvectors */
/* harmony export (immutable) */ __webpack_exports__["a"] = point_plane_dist;
/* unused harmony export binary_heap_new */
/* unused harmony export binary_heap_push */
/* unused harmony export binary_heap_pop */
/* unused harmony export binary_heap_remove */
/* unused harmony export binary_heap_rescore_element */
/* unused harmony export linear_tween */
/* unused harmony export ease_in_quad */
/* unused harmony export ease_out_quad */
/* unused harmony export ease_in_out_quad */
/* unused harmony export ease_in_cubic */
/* unused harmony export ease_out_cubic */
/* unused harmony export ease_in_out_cubic */
/* unused harmony export ease_in_quart */
/* unused harmony export ease_out_quart */
/* unused harmony export ease_in_out_quart */
/* unused harmony export ease_in_quint */
/* unused harmony export ease_out_quint */
/* unused harmony export ease_in_out_quint */
/* unused harmony export ease_in_sine */
/* unused harmony export ease_out_sine */
/* unused harmony export ease_in_out_sine */
/* unused harmony export ease_in_expo */
/* unused harmony export ease_out_expo */
/* unused harmony export ease_in_out_expo */
/* unused harmony export ease_in_circ */
/* unused harmony export ease_out_circ */
/* unused harmony export ease_in_out_circ */
/* unused harmony export ease_in_elastic */
/* unused harmony export ease_out_elastic */
/* unused harmony export ease_in_out_elastic */
/* unused harmony export ease_in_back */
/* unused harmony export ease_out_back */
/* unused harmony export ease_in_out_back */
/* unused harmony export ease_in_bounce */
/* unused harmony export ease_out_bounce */
/* unused harmony export ease_in_out_bounce */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat3_js__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_vec3_js__ = __webpack_require__(2);



/* ============================================================
 * jQuery Easing v1.3 - http://gsgd.co.uk/sandbox/jquery/easing/
 *
 * Open source under the BSD License.
 *
 * Copyright © 2008 George McGinley Smith
 * All rights reserved.
 * https://raw.github.com/danro/jquery-easing/master/LICENSE
 * ======================================================== */

/**
 * Math internal functions.
 * @name math
 * @namespace
 * @exports exports as math
 */

var _vec3_tmp = new Float32Array(3);
var _mat3_tmp = new Float32Array(9);
var _mat3_tmp2 = new Float32Array(9);
var _mat3_tmp3 = new Float32Array(9);
var _mat3_tmp4 = new Float32Array(9);

var MAX_ITER_NUM = 100;

function get_pline_directional_vec(pline, dest) {
    dest = dest || new Float32Array(3);
    dest[0] = pline[3];
    dest[1] = pline[4];
    dest[2] = pline[5];
    return dest;
}

function get_pline_initial_point(pline, dest) {
    dest = dest || new Float32Array(3);
    return __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_vec3_js__["b" /* copy */](pline, dest);
}

function set_pline_initial_point(pline, point) {
    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_vec3_js__["b" /* copy */](point, pline);
}

function set_pline_directional_vec(pline, vec) {
    __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_vec3_js__["l" /* normalize */](vec, _vec3_tmp);
    pline[3] = _vec3_tmp[0];
    pline[4] = _vec3_tmp[1];
    pline[5] = _vec3_tmp[2];
}

function calc_pline_point(pline, t, dest) {
    dest = dest || new Float32Array(3);
    dest[0] = pline[0] + pline[3] * t;
    dest[1] = pline[1] + pline[4] * t;
    dest[2] = pline[2] + pline[5] * t;
    return dest;
}

function calk_average_position(points, dest) {
    dest[0] = 0; dest[1] = 0; dest[2] = 0;
    for (var i = 0; i < points.length; i = i + 3) {
        dest[0] += points[i];
        dest[1] += points[i + 1];
        dest[2] += points[i + 2];
    }
    return __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_vec3_js__["m" /* scale */](dest, 3 / points.length, dest);
}

function calc_covariance_matrix(points, average_pos, dest) {

    for (var i = 0; i < dest.length; i++)
        dest[i] = 0;

    for (var i = 0; i < points.length; i = i + 3) {
        var xm = points[i] - average_pos[0];
        var ym = points[i + 1] - average_pos[1];
        var zm = points[i + 2] - average_pos[2];
        dest[0] += xm * xm;
        dest[1] += xm * ym;
        dest[2] += xm * zm;
        dest[4] += ym * ym;
        dest[5] += ym * zm;
        dest[8] += zm * zm;
    }
    dest[3] = dest[1];
    dest[6] = dest[2];
    dest[7] = dest[5];
    for (var i = 0; i < dest.length; i++)
        dest[i] *= 3 / points.length;
    return dest;
}

function find_eigenvectors(m, err, dest) {

    var matrix = __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat3_js__["a" /* copy */](m, _mat3_tmp);

    if (calc_canonical_mat_error(matrix) < err) {
        return __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat3_js__["e" /* identity */](dest);
    }

    var rot_matrix = find_elem_rotation_matrix(matrix, _mat3_tmp2);
    var rot_matrix_t = __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat3_js__["g" /* transpose */](rot_matrix, _mat3_tmp3);
    __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat3_js__["f" /* multiply */](matrix, rot_matrix_t, _mat3_tmp4);
    __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat3_js__["f" /* multiply */](rot_matrix, _mat3_tmp4, matrix);
    var eigenvectors = __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat3_js__["a" /* copy */](rot_matrix, dest);

    var count = 1;
    while (err <= calc_canonical_mat_error(matrix) && count < MAX_ITER_NUM) {
        rot_matrix = find_elem_rotation_matrix(matrix, _mat3_tmp2);
        rot_matrix_t = __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat3_js__["g" /* transpose */](rot_matrix, _mat3_tmp3);
        __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat3_js__["f" /* multiply */](matrix, rot_matrix_t, _mat3_tmp4);
        __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat3_js__["f" /* multiply */](rot_matrix, _mat3_tmp4, matrix);
        __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat3_js__["f" /* multiply */](rot_matrix, eigenvectors, eigenvectors);
        count++;
    }
    return eigenvectors;
}

function find_elem_rotation_matrix(m, dest) {

    var max = m[1];
    var ind = 1;
    for (var i = 2; i < m.length; i++)
        if (i != 4 && i!= 8 && Math.abs(m[i]) > Math.abs(max)) {
            max = m[i];
            ind = i;
        }
    var ii = Math.floor(ind / 3);
    var jj = ind % 3;
    var fi = 0.5 * Math.atan(2 * max / (m[ii * 3 + ii] - m[jj * 3 + jj]));

    for (var i = 0; i < dest.length; i++)
        if (i == 0 || i == 4 || i == 8)
            dest[i] = 1;
        else
            dest[i] = 0;
    dest[jj + ii * 3] = - Math.sin(fi);
    dest[ii + jj * 3] = Math.sin(fi);
    dest[ii + ii * 3] = Math.cos(fi);
    dest[jj + jj * 3] = Math.cos(fi);

    return dest;
}

function calc_canonical_mat_error(m) {
    return Math.sqrt(m[1] * m[1] + m[2] * m[2] + m[5] * m[5]);
}
/**
 * Calculate distance from point to plane.
 */
function point_plane_dist(pt, plane) {
    return plane[0] * pt[0] + plane[1] * pt[1] + plane[2] * pt[2] + plane[3];
}

/**
 *  Binary heap http://eloquentjavascript.net/1st_edition/appendix2.html
 */
function binary_heap_new(score_function) {
    return {
        content: [],
        score_function: score_function
    }
}

function binary_heap_push(heap, element) {
    heap.content.push(element);
    binary_heap_sink_down(heap, heap.content.length - 1);
}

function binary_heap_sink_down(heap, n) {
    // Fetch the element that has to be sunk.
    var element = heap.content[n];

    // When at 0, an element can not sink any further.
    while (n > 0) {
        // Compute the parent element's index, and fetch it.
        var parent_n = ((n + 1) >> 1) - 1,
            parent = heap.content[parent_n];
        // Swap the elements if the parent is greater.
        if (heap.score_function(element) < heap.score_function(parent)) {
            heap.content[parent_n] = element;
            heap.content[n] = parent;
            // Update 'n' to continue at the new position.
            n = parent_n;
        }
        // Found a parent that is less, no need to sink any further.
        else {
            break;
        }
    }
}

function binary_heap_pop(heap) {
    // Store the first element so we can return it later.
    var result = heap.content[0];
    // Get the element at the end of the array.
    var end = heap.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it bubble up.
    if (heap.content.length > 0) {
        heap.content[0] = end;
        binary_heap_bubble_up(heap, 0);
    }
    return result;
}

function binary_heap_remove(heap, node) {
    var i = heap.content.indexOf(node);

    // When it is found, the process seen in 'pop' is repeated
    // to fill up the hole.
    var end = heap.content.pop();

    if (i !== heap.content.length - 1) {
        heap.content[i] = end;

        if (heap.score_function(end) < heap.score_function(node)) {
            binary_heap_sink_down(i);
        } else {
            binary_heap_bubble_up(i);
        }
    }
}

function binary_heap_rescore_element(heap, node) {
    binary_heap_sink_down(heap, heap.content.indexOf(node));
}

function binary_heap_bubble_up(heap, n) {
    // Look up the target element and its score.
    var length = heap.content.length,
        element = heap.content[n],
        elem_score = heap.score_function(element);
    while (true) {
        // Compute the indices of the child elements.
        var child2_n = (n + 1) << 1,
            child1_n = child2_n - 1;
        // This is used to store the new position of the element,
        // if any.
        var swap = null;
        // If the first child exists (is inside the array)...
        if (child1_n < length) {
            // Look it up and compute its score.
            var child1 = heap.content[child1_n],
                child1_score = heap.score_function(child1);

            // If the score is less than our element's, we need to swap.
            if (child1_score < elem_score)
                swap = child1_n;
        }
        // Do the same checks for the other child.
        if (child2_n < length) {
            var child2 = heap.content[child2_n],
                child2_score = heap.score_function(child2);
            if (child2_score < (swap === null ? elem_score : child1_score)) {
                swap = child2_n;
            }
        }
        // If the element needs to be moved, swap it, and continue.
        if (swap !== null) {
            heap.content[n] = heap.content[swap];
            heap.content[swap] = element;
            n = swap;
        }
        // Otherwise, we are done.
        else {
            break;
        }
    }
}


// t: current time, b: begInnIng value, c: change In value, d: duration

function linear_tween(t, b, c, d) {
    return c*t/d + b;
};

function ease_in_quad(t, b, c, d) {
    return c*(t/=d)*t + b;
}

function ease_out_quad(t, b, c, d) {
    return -c *(t/=d)*(t-2) + b;
}

function ease_in_out_quad(t, b, c, d) {
    if ((t/=d/2) < 1) return c/2*t*t + b;
    return -c/2 * ((--t)*(t-2) - 1) + b;
}

function ease_in_cubic(t, b, c, d) {
    return c*(t/=d)*t*t + b;
}

function ease_out_cubic(t, b, c, d) {
    return c*((t=t/d-1)*t*t + 1) + b;
}

function ease_in_out_cubic(t, b, c, d) {
    if ((t/=d/2) < 1) return c/2*t*t*t + b;
    return c/2*((t-=2)*t*t + 2) + b;
}

function ease_in_quart(t, b, c, d) {
    return c*(t/=d)*t*t*t + b;
}

function ease_out_quart(t, b, c, d) {
    return -c * ((t=t/d-1)*t*t*t - 1) + b;
}

function ease_in_out_quart(t, b, c, d) {
    if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
    return -c/2 * ((t-=2)*t*t*t - 2) + b;
}

function ease_in_quint(t, b, c, d) {
    return c*(t/=d)*t*t*t*t + b;
}

function ease_out_quint(t, b, c, d) {
    return c*((t=t/d-1)*t*t*t*t + 1) + b;
}

function ease_in_out_quint(t, b, c, d) {
    if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
    return c/2*((t-=2)*t*t*t*t + 2) + b;
}

function ease_in_sine(t, b, c, d) {
    return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
}

function ease_out_sine(t, b, c, d) {
    return c * Math.sin(t/d * (Math.PI/2)) + b;
}

function ease_in_out_sine(t, b, c, d) {
    return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
}

function ease_in_expo(t, b, c, d) {
    return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
}

function ease_out_expo(t, b, c, d) {
    return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
}

function ease_in_out_expo(t, b, c, d) {
    if (t==0) return b;
    if (t==d) return b+c;
    if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
    return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
}

function ease_in_circ(t, b, c, d) {
    return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
}

function ease_out_circ(t, b, c, d) {
    return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
}

function ease_in_out_circ(t, b, c, d) {
    if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
    return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
}

function ease_in_elastic(t, b, c, d) {
    var s=1.70158;var p=0;var a=c;
    if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
    if (a < Math.abs(c)) { a=c; s=p/4; }
    else s = p/(2*Math.PI) * Math.asin (c/a);
    return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
}

function ease_out_elastic(t, b, c, d) {
    var s=1.70158;var p=0;var a=c;
    if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
    if (a < Math.abs(c)) { a=c; s=p/4; }
    else s = p/(2*Math.PI) * Math.asin (c/a);
    return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
}

function ease_in_out_elastic(t, b, c, d) {
    var s=1.70158;var p=0;var a=c;
    if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
    if (a < Math.abs(c)) { a=c; s=p/4; }
    else s = p/(2*Math.PI) * Math.asin (c/a);
    if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
    return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
}

function ease_in_back(t, b, c, d, s) {
    if (s == undefined) s = 1.70158;
    return c*(t/=d)*t*((s+1)*t - s) + b;
}

function ease_out_back(t, b, c, d, s) {
    if (s == undefined) s = 1.70158;
    return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
}

function ease_in_out_back(t, b, c, d, s) {
    if (s == undefined) s = 1.70158; 
    if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
    return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
}

function ease_in_bounce(t, b, c, d) {
    return c - ease_out_bounce (d-t, 0, c, d) + b;
}

function ease_out_bounce(t, b, c, d) {
    if ((t/=d) < (1/2.75)) {
        return c*(7.5625*t*t) + b;
    } else if (t < (2/2.75)) {
        return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
    } else if (t < (2.5/2.75)) {
        return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
    } else {
        return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
    }
}

function ease_in_out_bounce(t, b, c, d) {
    if (t < d/2) return ease_in_bounce (t*2, 0, c, d) * .5 + b;
    return ease_out_bounce (t*2-d, 0, c, d) * .5 + c*.5 + b;
}


/***/ }),
/* 13 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = create;
/* unused harmony export clone */
/* unused harmony export from_values */
/* unused harmony export create_ext */
/* unused harmony export clone_ext */
/* unused harmony export from_values_ext */
/* unused harmony export copy */
/* unused harmony export identity */
/* unused harmony export set_sep */
/* unused harmony export set_trans */
/* unused harmony export set_scale */
/* unused harmony export set_transcale */
/* unused harmony export set_quat */
/* unused harmony export get_trans_view */
/* unused harmony export get_trans */
/* unused harmony export get_scale */
/* unused harmony export get_transcale */
/* unused harmony export get_quat_view */
/* unused harmony export get_quat */
/* unused harmony export invert */
/* unused harmony export to_mat4 */
/* unused harmony export from_mat4 */
/* unused harmony export multiply */
/* unused harmony export transform_mat4 */
/* unused harmony export transform_vec3 */
/* unused harmony export transform_vec3_inv */
/* unused harmony export transform_vectors */
/* unused harmony export transform_dir_vectors */
/* unused harmony export transform_dir_vec3 */
/* unused harmony export transform_tangents */
/* unused harmony export transform_quat */
/* unused harmony export transform_quats */
/* unused harmony export translate */
/* unused harmony export interpolate */
/* unused harmony export extrapolate */
/* unused harmony export integrate */
/* unused harmony export to_zup_view */
/* unused harmony export to_zup_model */
/* unused harmony export get_from_flat_array */
/* unused harmony export set_to_flat_array */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat4_js__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__util_js__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__ = __webpack_require__(2);





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

function create() {
    var tsr = new Float32Array(9);
    tsr[3] = 1;
    tsr[4] = 1;
    tsr[5] = 1;
    return tsr;
}

function clone(tsr) {
    var out = create();
    copy(tsr, out);
    return out;
}

function from_values(x, y, z, s, qx, qy, qz, qw) {
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

function create_ext() {
    var tsr = new Float32Array(9);
    tsr[3] = 1;
    tsr[4] = 1;
    tsr[5] = 1;
    return tsr;
}

function clone_ext(tsr) {
    var out = create_ext();
    copy(tsr, out);
    return out;
}

function from_values_ext(x, y, z, s, qx, qy, qz, qw) {
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

function copy(tsr, dest) {
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

function identity(tsr) {
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
function set_sep(trans, scale, quat, dest) {
    dest[0] = trans[0];
    dest[1] = trans[1];
    dest[2] = trans[2];
    if (__WEBPACK_IMPORTED_MODULE_2__util_js__["c" /* is_array */](scale)) {
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

function set_trans(trans, dest) {

    if (trans[0] != trans[0])
        throw new Error(trans);

    dest[0] = trans[0];
    dest[1] = trans[1];
    dest[2] = trans[2];

    return dest;
}
function set_scale(scale, dest) {
    if (__WEBPACK_IMPORTED_MODULE_2__util_js__["c" /* is_array */](scale)) {
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
function set_transcale(transcale, dest) {
    // NOTE: it is better don't use this function
    // console.error("B4W ERROR: tsr.set_transcale is dangerous function. Don't use it anymore!!!");
    dest[0] = transcale[0];
    dest[1] = transcale[1];
    dest[2] = transcale[2];
    dest[3] = transcale[3];

    return dest;
}

function set_quat(quat, dest) {
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
function get_trans_view(tsr) {
    // console.error("B4W ERROR: tsr.get_trans_view is dangerous function. Don't use it anymore!!!");
    return get_trans(tsr, __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]());
}
function get_trans(tsr, dest) {
    dest[0] = tsr[0];
    dest[1] = tsr[1];
    dest[2] = tsr[2];

    return dest;
}
function get_scale(tsr, dest) {
    if (dest) {
        dest[0] = tsr[3];
        dest[1] = tsr[4];
        dest[2] = tsr[5];
        return dest;
    }
    return tsr[3];
}
function get_transcale(tsr, dest) {
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
function get_quat_view(tsr) {
    // console.error("B4W ERROR: tsr.get_quat_view is dangerous function. Don't use it anymore!!!");
    return get_quat(tsr, __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]());
}

function get_quat(tsr, dest) {
    dest[0] = tsr[6];
    dest[1] = tsr[7];
    dest[2] = tsr[8];
    dest[3] = Math.sqrt(Math.abs(1 - tsr[6] * tsr[6] - tsr[7] * tsr[7] - tsr[8] * tsr[8]));

    return dest;
}

var invert = (function () {
    var _vec3_tmp = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _vec3_tmp2 = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _quat_tmp = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();

    return function invert(tsr, dest) {
        var s = get_scale(tsr, _vec3_tmp);
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["g" /* inverse */](s, s);

        // CHECK: is it necessary?
        if (!s[0])
            return null;

        var t = get_trans(tsr, _vec3_tmp2);
        var q = get_quat(tsr, _quat_tmp);

        __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["e" /* invert */](q, q);

        // scale
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["j" /* multiply */](t, s, t);
        // rotate
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["r" /* transformQuat */](t, q, t);
        // negate
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["k" /* negate */](t, t);

        set_trans(t, dest);
        set_scale(s, dest);
        set_quat(q, dest);

        return dest;
    };
})();

var to_mat4 = (function () {
    var _vec3_tmp = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _vec3_tmp2 = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _quat_tmp = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();

    return function to_mat4(tsr, dest) {
        var trans = get_trans(tsr, _vec3_tmp);
        var scale = get_scale(tsr, _vec3_tmp2);
        var quat = get_quat(tsr, _quat_tmp);

        __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat4_js__["b" /* fromRotationTranslation */](quat, trans, dest);

        __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat4_js__["g" /* scale */](dest, scale, dest);

        return dest;
    };
})();

/**
 * NOTE: not optimized
 */
var from_mat4 = (function() {
    var _vec3_tmp = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _vec3_tmp2 = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _quat_tmp = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();

    return function from_mat4(mat, dest) {
        var trans = __WEBPACK_IMPORTED_MODULE_2__util_js__["f" /* matrix_to_trans */](mat, _vec3_tmp);
        var scale = __WEBPACK_IMPORTED_MODULE_2__util_js__["e" /* matrix_to_scale */](mat, _vec3_tmp2);
        var quat = __WEBPACK_IMPORTED_MODULE_2__util_js__["d" /* matrix_to_quat */](mat, _quat_tmp);
        set_trans(trans, dest);
        set_scale(scale, dest);
        set_quat(quat, dest);
        return dest;
    };
})();

/**
 * Multiply two TSRs.
 */
var multiply = (function () {
    var _vec3_tmp = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _vec3_tmp2 = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _quat_tmp = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();
    var _quat_tmp2 = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();

    return function multiply(tsr, tsr2, dest) {
        // trans
        var t = get_trans(tsr2, _vec3_tmp);
        transform_vec3(t, tsr, t);
        set_trans(t, dest);

        // scale
        var s = get_scale(tsr, _vec3_tmp);
        var s2 = get_scale(tsr2, _vec3_tmp2);
        var res_s = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["j" /* multiply */](s, s2, _vec3_tmp);
        set_scale(res_s, dest);

        // quat
        var q = get_quat(tsr, _quat_tmp);
        var q2 = get_quat(tsr2, _quat_tmp2);
        var res_q = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["f" /* multiply */](q, q2, _quat_tmp);
        set_quat(res_q, dest);

        return dest;
    };
})();

/**
 * NOTE: unused, non-optimized
 */
var transform_mat4 = (function () {
    var _mat4_tmp = __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat4_js__["a" /* create */]();

    // CHECK: parameters order!
    return function transform_mat4(matrix, tsr, dest) {
        var m = to_mat4(tsr, _mat4_tmp);

        __WEBPACK_IMPORTED_MODULE_0__libs_gl_matrix_mat4_js__["f" /* multiply */](m, matrix, dest);

        return dest;
    };
})();

/**
 * Transform vec3 by TSR
 */
var transform_vec3 = (function () {
    var _vec3_tmp = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _vec3_tmp2 = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _quat_tmp = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();

    return function transform_vec3(vec, tsr, dest) {

        var trans = get_trans(tsr, _vec3_tmp);
        var scale = get_scale(tsr, _vec3_tmp2);
        var quat = get_quat(tsr, _quat_tmp);

        // scale
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["j" /* multiply */](vec, scale, dest);

        // rotate
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["r" /* transformQuat */](dest, quat, dest);

        // translate
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["a" /* add */](dest, trans, dest);

        return dest;
    };
})();

/**
 * Transform vec3 by inverse TSR
 */
var transform_vec3_inv = (function () {
    var _vec3_tmp = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _vec3_tmp2 = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _quat_tmp = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();

    return function transform_vec3_inv(vec, tsr, dest) {
        var trans = get_trans(tsr, _vec3_tmp);
        var scale = get_scale(tsr, _vec3_tmp2);
        var quat = get_quat(tsr, _quat_tmp);

        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["o" /* subtract */](vec, trans, dest);

        __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["e" /* invert */](quat, quat);
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["r" /* transformQuat */](dest, quat, dest);

        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["g" /* inverse */](scale, scale);
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["j" /* multiply */](dest, scale, dest);

        return dest;
    };
})();

/**
 * Tranform vec3 vectors by TSR
 * optional destination offset in values (not vectors, not bytes)
 */
var transform_vectors = (function () {
    var _vec3_tmp = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _vec3_tmp2 = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _vec3_tmp3 = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _quat_tmp = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();

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
            __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["j" /* multiply */](vec, scale, vec);
            __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["r" /* transformQuat */](vec, quat, vec);
            __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["a" /* add */](vec, trans, vec);

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
var transform_dir_vectors = (function () {
    var _vec3_tmp = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _vec3_tmp2 = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _quat_tmp = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();

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
            __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["j" /* multiply */](vec, scale, vec);
            __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["r" /* transformQuat */](vec, quat, vec);

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
var transform_dir_vec3 = (function () {
    var _vec3_tmp = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _quat_tmp = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();
    return function transform_dir_vec3(vec, tsr, new_vec) {

        var scale = get_scale(tsr, _vec3_tmp);
        var quat = get_quat(tsr, _quat_tmp);

        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["j" /* multiply */](vec, scale, new_vec);
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["r" /* transformQuat */](new_vec, quat, new_vec);

        return new_vec;
    };
})();

/**
 * Tranform 4 comp tangent vectors by matrix.
 * optional destination offset in values (not vectors, not bytes)
 */
var transform_tangents = (function () {
    var _vec3_tmp = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _vec3_tmp2 = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _quat_tmp = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();

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

            __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["m" /* scale */](vec, scale, vec);
            __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["r" /* transformQuat */](vec, quat, vec);

            new_vectors[dest_offset + i] = vec[0];
            new_vectors[dest_offset + i + 1] = vec[1];
            new_vectors[dest_offset + i + 2] = vec[2];
            // just save exact sign
            new_vectors[dest_offset + i + 3] = vectors[i + 3];
        }

        return new_vectors;
    };
})();

function transform_quat(quat, tsr, new_quat) {
    get_quat(tsr, new_quat);

    return __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["f" /* multiply */](new_quat, quat, new_quat);
}

/**
 * Tranform quaternions vectors by tsr.
 * optional destination offset in values (not vectors, not bytes)
 */
var transform_quats = (function () {
    var _quat_tmp = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();

    return function transform_quats(vectors, tsr, new_vectors, dest_offset) {

        dest_offset |= 0;

        var rot_quat = get_quat(tsr, _quat_tmp);

        __WEBPACK_IMPORTED_MODULE_2__util_js__["g" /* quats_multiply_quat */](vectors, rot_quat, new_vectors, dest_offset);

        return new_vectors;
    };
})();

/**
 * Perform TSR translation by given vec3
 */
var translate = (function () {
    var _vec3_tmp = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _vec3_tmp2 = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _quat_tmp = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();

    return function translate(tsr, vec, dest) {
        var trans = get_trans(tsr, _vec3_tmp);
        var scale = get_scale(tsr, _vec3_tmp2);
        var quat = get_quat(tsr, _quat_tmp);

        var offset = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["j" /* multiply */](vec, scale, _vec3_tmp2);
        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["r" /* transformQuat */](offset, quat, offset);

        __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["a" /* add */](trans, offset, trans);

        copy(tsr, dest);

        set_trans(trans, dest);

        return dest;
    };
})();

var interpolate = (function () {
    var _vec3_tmp = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _vec3_tmp2 = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _quat_tmp = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();
    var _quat_tmp2 = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();

    return function interpolate(tsr, tsr2, factor, dest) {
        // linear
        var trans = get_trans(tsr, _vec3_tmp);
        var trans2 = get_trans(tsr2, _vec3_tmp2);
        var trans_dst = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["i" /* lerp */](trans, trans2, factor, _vec3_tmp);
        set_trans(trans_dst, dest);

        // linear
        var scale = get_scale(tsr, _vec3_tmp);
        var scale2 = get_scale(tsr2, _vec3_tmp2);
        var scale_dst = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["i" /* lerp */](trans, trans2, factor, _vec3_tmp);
        set_scale(scale_dst, dest);

        // spherical
        var quat = get_quat(tsr, _quat_tmp);
        var quat2 = get_quat(tsr2, _quat_tmp2);
        var quat_dst = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["j" /* slerp */](quat, quat2, factor, _quat_tmp);
        set_quat(quat_dst, dest);

        return dest;
    };
})();

/**
 * Lineary extrapolate two TSR vectors by given factor.
 * Yextr = Y1 + (Y1 - Y0) * factor = Y1 * (factor + 1) - Y0 * factor
 * NOTE: unused, untested, incomplete
 */
var extrapolate = (function () {
    var _vec3_tmp = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _vec3_tmp2 = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _quat_tmp = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();
    var _quat_tmp2 = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();

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
        __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["g" /* normalize */](quat_dst, quat_dst);
        set_quat(quat_dst, dest);

        return dest;
    };
})();

var integrate = (function () {
    var _vec3_tmp = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _vec3_tmp2 = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _quat_tmp = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();
    var _quat_tmp2 = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();

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
        __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["g" /* normalize */](quat, quat);
        set_quat(quat, dest);

        return dest;
    };
})();

var to_zup_view = (function () {
    var _vec3_tmp = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _vec3_tmp2 = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _quat_tmp = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();
    var _quat_tmp2 = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();

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

var to_zup_model = (function () {
    var _vec3_tmp = __WEBPACK_IMPORTED_MODULE_3__libs_gl_matrix_vec3_js__["c" /* create */]();
    var _quat_tmp = __WEBPACK_IMPORTED_MODULE_1__libs_gl_matrix_quat_js__["b" /* create */]();

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

function get_from_flat_array(flat_tsr_array, index, dest) {
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

function set_to_flat_array(tsr, flat_tsr_array, index) {
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

/***/ }),
/* 14 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__register_js__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__assert_js__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__intern_print_js__ = __webpack_require__(9);





function Generator(ns, exports) {

var m_assert = Object(__WEBPACK_IMPORTED_MODULE_1__assert_js__["a" /* default */])(ns);
var m_print = Object(__WEBPACK_IMPORTED_MODULE_2__intern_print_js__["a" /* default */])(ns);

var _next = 1;
var _unique_counter = 0;
var _unique_name_counters = {};

var _hash_buffer_in = new Float64Array(1);
var _hash_buffer_out = new Uint32Array(_hash_buffer_in.buffer);

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

exports.cleanup = function() {
    _unique_counter = 0;
    _unique_name_counters = {};
}

/**
 * Compose unique string ID.
 */
exports.unique_id = function() {
    _unique_counter++;
    return _unique_counter.toString(10);
}

exports.gen_color_id = function(counter) {

    // black reserved for background
    counter++;

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
 * Calculate id for strongly typed variables (batch, render, slink, ...).
 * init_val parameter is a sort of seed.
 */
exports.calc_variable_id = function(a, init_val) {
    return hash_code(a, init_val);
}

exports.hash_code = hash_code;
function hash_code(a, init_val) {
    var hash = init_val;

    switch (typeof a) {
    case "object":
        if (a) {
            // NOTE: some additional props could be added to GL-type objs
            // so don't build hash code for them
            switch (a.constructor) {
            case Object:
                for (var prop in a)
                    hash = hash_code(a[prop], hash);
                break;
            case Int8Array:
            case Uint8Array:
            case Uint8ClampedArray:
            case Int16Array:
            case Uint16Array:
            case Int32Array:
            case Uint32Array:
            case Float32Array:
            case Float64Array:
                for (var i = 0; i < a.length; i++)
                    hash = hash_code_number(a[i], hash);
                break;
            case Array:
                for (var i = 0; i < a.length; i++)
                    hash = hash_code(a[i], hash);
                break;
            case WebGLUniformLocation:
            case WebGLProgram:
            case WebGLShader:
            case WebGLFramebuffer:
            case WebGLRenderbuffer:
            case WebGLTexture:
            case WebGLBuffer:
                hash = hash_code_number(0, hash);
                break;
            default:
                m_assert.panic("Wrong object constructor:", a.constructor);
                break;
            }
        } else
            hash = hash_code_number(0, hash);

        return hash;
    case "number":
        return hash_code_number(a, hash);
    case "boolean":
        return hash_code_number(a | 0, hash);
    case "string":
        return hash_code_string(a, hash);
    case "function":
    case "undefined":
        return hash_code_number(0, hash);
    }
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
function hash_code_string(str, init_val) {
    var hash = init_val;

    for (var i = 0; i < str.length; i++) {
        var symbol = str.charCodeAt(i);
        hash = ((hash<<5) - hash) + symbol;
        hash = hash & hash; // convert to 32 bit integer
    }
    return hash;
}

}

var generator_fact = Object(__WEBPACK_IMPORTED_MODULE_0__register_js__["a" /* default */])("generator", Generator);

/* harmony default export */ __webpack_exports__["a"] = (generator_fact);

/***/ }),
/* 15 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export normpath */
/* harmony export (immutable) */ __webpack_exports__["a"] = normpath_preserve_protocol;
/* unused harmony export get_file_extension */
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

function normpath_preserve_protocol(dir_path) {
    var separated_str = dir_path.split('://',2);
    if (separated_str.length > 1) {
        separated_str[1] = normpath(separated_str[1]);
        return separated_str.join('://');
    } else
        return normpath(dir_path);
}

function get_file_extension(file_path) {
    var re = /(?:\.([^.]+))?$/;
    return re.exec(file_path)[1];
}


/***/ })
/******/ ]);