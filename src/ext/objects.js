"use strict";

/**
 * Objects API.
 * @module objects
 */
b4w.module["objects"] = function(exports, require) {

var m_obj = require("__objects");

/**
 * @typedef ObjectMetaTags
 * @type {Object}
 * @property {String} title The title meta tag.
 * @property {String} description The description meta tag.
 * @property {String} category The category meta tag.
 */

/**
 * Get the Blender-assigned meta tags from the object.
 * @method module:objects.get_meta_tags
 * @returns {ObjectMetaTags} Object meta tags
 * @cc_externs title description category
 */
exports.get_meta_tags = function(obj) {
    if (obj && obj["b4w_object_tags"])
        return m_obj.get_meta_tags(obj);
}

}
