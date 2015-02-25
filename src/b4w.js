//"use strict";

/**
 * Global Blend4Web namespace.
 * @namespace
 */
var b4w = (function(exports) {

var _module = {};
exports.module = _module;

// require functions per namespace
var _ns_requires = {};

/**
 * @callback ModuleFunction Module function
 * @memberof b4w
 * @param {Object} exports Object with exported symbols
 * @param {Function} require Local require method
 */

/**
 * Register the module.
 * @method b4w.register
 * @param {String} module_id Module ID
 * @param {ModuleFunction} fun Module function
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
 * @returns {Object} Module object
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

