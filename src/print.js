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
 * Print API. Overrides some standart js console functions
 * @name print
 * @namespace
 * @exports exports as print
 */
b4w.module["__print"] = function(exports, require) {


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

b4w.module["print"] = b4w.module["__print"];
