//"use strict";

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
 * Euler vector representing rotation.
 * <p>The euler angles specified in intrinsic form (rotating space) and have the following meaning:
 * <ul>
 * <li>euler[0]: heading, around Y
 * <li>euler[1]: attitude, around new Z
 * <li>euler[2]: bank, around new X
 * <p>Using euler angles is discouraged, use quaternions instead.
 * </ul>
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
 * @typedef CameraMoveStyle
 * @type {Number}
 * @see {@link module:camera}
 */

/**
 * Coordinate space enum. Designates in which space perform coordinate transformations.
 * @typedef Space
 * @type {Number}
 * @see {@link module:transform.SPACE_LOCAL},
 * {@link module:transform.SPACE_WORLD}
 */

/**
 * Generic callback function with no parameters.
 * @callback GenericCallback
 */

/**
 * Blend4Web namespace.
 * @namespace
 */
var b4w = (function(exports) {

var _module = {};
exports.module = _module;

// require functions per namespace
var _ns_requires = {};

/**
 * @callback ModuleFunction Module implementation
 * @memberof b4w
 * @param {Object} exports Object with exported symbols
 * @param {RequireFunction} require Local require function
 */

/**
 * Register the module.
 * @method b4w.register
 * @param {String} module_id Module ID
 * @param {ModuleFunction} fun Function implementing the module
 */
exports.register = function(module_id, fun) {
    if (_module[module_id])
        throw new Error("Module \"" + module_id + "\" already registered");

    _module[module_id] = fun;
}

/**
 * Prepare and return the registered module.
 * @method b4w.require
 * @param {String} module_id Module ID
 * @param {String} [ns="__B4W_DEF_NS"] Namespace for processed modules
 * @returns {Object3D} Module object
 */
exports.require = require;

function require(module_id, ns) {
    var mod = _module[module_id];
    if (!mod)
        throw new Error("Module \"" + module_id + "\" not found");

    ns = ns || "__B4W_DEF_NS";
    
    if (!_ns_requires[ns])
        _ns_requires[ns] = (function(ns) {
            return function(module_id) {
                var mod = _module[module_id];
                if (!mod)
                    throw new Error("Module \"" + module_id + "\" not found");

                if (!mod._compiled)
                    mod._compiled = {};

                if (!mod._compiled[ns]) {
                    mod._compiled[ns] = {};
                    mod(mod._compiled[ns], _ns_requires[ns]);
                }
                return mod._compiled[ns];
            }
        })(ns);

    return _ns_requires[ns](module_id);
}

/**
 * Check if the module was registered.
 * @method b4w.module_check
 * @param {String} module_id Module ID
 * @returns {Boolean} Check result
 */
exports.module_check = function(module_id) {
    if (_module[module_id])
        return true;
    else
        return false;
}

return exports;})({});

