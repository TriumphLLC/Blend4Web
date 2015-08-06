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
 * The version is an array of the format: [yy, mm] or [yy, mm, bugfix] for "RELEASE"
 * version or [yy, mm] for "DEBUG" version.
 * @method module:version.version
 * @returns {Array} Version: [yy, mm]
 */
exports.version = version.version;

/**
 * Get the version.
 * The version string has the format: "yy.mm" or "yy.mm.bugfix" for "RELEASE"
 * version or "yy.mm" for "DEBUG" version.
 * @method module:version.version_str
 * @returns {String} Version string
 */
exports.version_str = version.version_str;

/**
 * Get the release type: "DEBUG" or "RELEASE".
 * @method module:version.type
 * @returns {String} Release type
 */
exports.type = version.type;

/**
 * Return the build date or the current date for the "DEBUG" version.
 * @method module:version.date
 * @returns {Date} Date
 */
exports.date = version.date;

/**
 * Return the build date or the current date for the "DEBUG" version.
 * @method module:version.date_str
 * @returns {String} Date string in the format: "dd.mm.yyyy hh.mm.ss"
 */
exports.date_str = version.date_str;

}

if (typeof module == "object" && module.exports) b4w.module["version"](exports);
