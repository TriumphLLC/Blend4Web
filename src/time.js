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

exports.set_timeline = function(timeline) {
    _timeline = timeline;
}

exports.get_timeline = function() {
    return _timeline;
}


}
