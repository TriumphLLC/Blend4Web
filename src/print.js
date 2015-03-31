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

exports.error = function() {
    // always reporting errors
    _error_count++;

    var args = compose_args_prefix(arguments, "B4W ERROR");
    console.error.apply(console, args);
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
