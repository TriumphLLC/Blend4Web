"use strict";

if (typeof module == "object" && module.exports) GLOBAL.b4w = {module : {}};

/**
 * Version API. Allows to query various information about the current release.
 * @module version
 */
b4w.module["version"] = function(exports, require) {

var version = require("__version");

/**
 * Get the version.
 * The version string has the format: "yy.mm" or "yy.mm.bugfix" for "RELEASE"
 * version or just "" for "DEBUG" version.
 * @method module:version.version
 * @returns {String} version string
 */
exports.version = version.version;

/**
 * Get the release type: "DEBUG" or "RELEASE".
 * @method module:version.type
 * @returns {String} release type
 */
exports.type = version.type;

/**
 * Return the build date or the current date for the "DEBUG" version.
 * @method module:version.date
 * @returns {String} date string in the format: "dd.mm.yyyy hh.mm.ss"
 */
exports.date = version.date;

}

if (typeof module == "object" && module.exports) b4w.module["version"](exports);
