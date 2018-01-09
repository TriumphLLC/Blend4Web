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

export default b4w;