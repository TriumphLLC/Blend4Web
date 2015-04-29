"use strict";

if (typeof module == "object" && module.exports) GLOBAL.b4w = {module : {}};

b4w.module["time"] = function(exports, require) {

var time = require("__time");

exports.set_timeout = time.set_timeout;
exports.animate = time.animate;

}

if (typeof module == "object" && module.exports) b4w.module["time"](exports);
