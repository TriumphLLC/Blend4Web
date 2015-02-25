"use strict";

/**
 * Time internal API.
 * @name time
 * @namespace
 * @exports exports as time
 */
b4w.module["__time"] = function(exports, require) {

var m_util = require("__util");

// engine's global timeline (time since initialization)
var _timeline = 0;

var _timeline_epoch = 0;

var _timeouts = [];
var _timeout_counter = 0;

exports.set_timeline = function(timeline) {
    _timeline = timeline;                   // s
    _timeline_epoch = performance.now();    // ms

    for (var i = 0; i < _timeouts.length; i++) {
        var timeout = _timeouts[i];

        if (_timeline > timeout.expire_time) {
            // removing first to prevent race conditions in callback
            _timeouts.splice(i, 1);
            i--;
            timeout.callback();
        }
    }
}

exports.get_timeline = function() {
    return _timeline;
}

function get_timeout_id() {
    _timeout_counter++;
    return _timeout_counter;
}

/**
 * Same behavior as window.setTimeout()
 */
exports.set_timeout = function(callback, time) {
    var id = get_timeout_id();

    var timeout = {
        id: id,
        callback: callback,
        expire_time: _timeline + ((performance.now() - _timeline_epoch) + time) / 1000
    }

    _timeouts.push(timeout);

    return id;
}

/**
 * Same behavior as window.clearTimeout()
 */
exports.clear_timeout = function(id) {
    for (var i = 0; i < _timeouts.length; i++) {
        var timeout = _timeouts[i];

        if (timeout.id == id) {
            _timeouts.splice(i, 1);
            break;
        }
    }
}

exports.reset = function(id) {
    _timeline = 0;
    _timeline_epoch = 0;

    _timeouts.length = 0;
    _timeout_counter = 0;
}

}
