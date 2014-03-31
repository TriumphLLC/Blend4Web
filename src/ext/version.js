"use strict";

if (typeof module == "object" && module.exports) GLOBAL.b4w = {module : {}};

/**
 * Version API. Allows to query information about current release.
 * @module version
 */
b4w.module["version"] = function(exports, require) {

var version = require("__version");

/**
 * Get version.
 * @method module:version.version
 */
exports["version"] = version.version;

/**
 * Get release type.
 * @method module:version.type
 */
exports["type"] = version.type;

/**
 * Return build date or current date for DEBUG version
 * @method module:version.date
 */
exports["date"] = version.date;

}

if (typeof module == "object" && module.exports) b4w.module["version"](exports);
