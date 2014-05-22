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

/**
 * Set verbose flag for console output.
 */
exports.set_verbose = function(v) {
    _verbose = v;
}

exports.log = function() {
    if (_verbose)
        console.log.apply(console, arguments);
}

exports.error = function() {
    _error_count++;
    console.error.apply(console, arguments);
}

exports.warn = function() {
    if (_verbose) {
        _warning_count++;
        console.warn.apply(console, arguments);
    }
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
    if (_verbose)
        console.group.apply(console, arguments);
}

exports.groupCollapsed = function() {
    if (_verbose)
        console.groupCollapsed.apply(console, arguments);
}

exports.groupEnd = function() {
    if (_verbose)
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
