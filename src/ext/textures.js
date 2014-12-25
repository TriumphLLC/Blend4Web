"use strict";

/**
 * Textures Blend4Web module.
 * This module works with textures.
 * @module textures
 */
b4w.module["textures"] = function(exports, require) {

var m_textures   = require("__textures");
var m_print   = require("__print");

/**
 * Returns canvas texture context.
 * @method module:textures.get_canvas_texture_context
 * @param {String} id Canvas texture name
 * @returns {Object} Canvas texture context
 */
exports.get_canvas_texture_context = function(id) {
    var canvas_context = m_textures.get_canvas_context(id);
    if (canvas_context)
        return canvas_context;
    else
        m_print.error("Canvas texture with ID \"" + id + "\" not found!");
}

/**
 * Update canvas texture context.
 * @method module:textures.update_canvas_texture_context
 * @param {String} id Canvas texture name
 */
exports.update_canvas_texture_context = function(id) {
    if (!m_textures.update_canvas_context(id))
        m_print.error("Canvas texture with ID \"" + id + "\" not found!");
}

/**
 * Play video.
 * @method module:textures.play_video
 * @param {String} texture_name Texture name
 */
exports.play_video = function(texture_name) {
    if (!m_textures.play_video(texture_name))
        m_print.error("Texture with name \"" + texture_name + "\" not found!");
}

/**
 * Stop video.
 * @method module:textures.stop_video
 * @param {String} texture_name Texture name
 */
exports.stop_video = function(texture_name) {
    if (!m_textures.stop_video(texture_name))
        m_print.error("Texture with name \"" + texture_name + "\" not found!");
}

/**
 * Reset video.
 * @method module:textures.reset_video
 * @param {String} texture_name Texture name
 */
exports.reset_video = function(texture_name) {
    if (!m_textures.reset_video(texture_name))
        m_print.error("Texture with name \"" + texture_name + "\" not found!");
}

}
