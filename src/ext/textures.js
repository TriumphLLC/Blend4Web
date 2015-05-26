"use strict";

/**
 * Textures API.
 * @module textures
 */
b4w.module["textures"] = function(exports, require) {

var m_textures   = require("__textures");
var m_print   = require("__print");

/**
 * Returns canvas texture context.
 * @method module:textures.get_canvas_texture_context
 * @param {String} id Canvas texture name
 * @param {Number} [data_id=0] ID of loaded data
 * @returns {Object} Canvas texture context
 */
exports.get_canvas_texture_context = function(id, data_id) {
    if (!data_id)
        data_id = 0;
    var canvas_context = m_textures.get_canvas_context(id, data_id);
    if (canvas_context)
        return canvas_context;
    else
        m_print.error("Canvas texture with ID \"" + id + "\" not found!");
}

/**
 * Update canvas texture context.
 * @method module:textures.update_canvas_texture_context
 * @param {Number} [data_id=0] ID of loaded data
 * @param {String} id Canvas texture name
 */
exports.update_canvas_texture_context = function(id, data_id) {
    if (!data_id)
        data_id = 0;
    if (!m_textures.update_canvas_context(id, data_id))
        m_print.error("Canvas texture with ID \"" + id + "\" not found!");
}

/**
 * Play video.
 * @method module:textures.play_video
 * @param {String} texture_name Texture name
 * @param {Number} [data_id=0] ID of loaded data
 */
exports.play_video = function(texture_name, data_id) {
    if (!data_id)
        data_id = 0;
    if (!m_textures.play_video(texture_name, data_id))
        m_print.error("Texture with name \"" + texture_name + "\" not found!");
}

/**
 * Pause video.
 * @method module:textures.pause_video
 * @param {String} texture_name Texture name
 * @param {Number} [data_id=0] ID of loaded data
 */
exports.pause_video = function(texture_name, data_id) {
    if (!data_id)
        data_id = 0;
    if (!m_textures.pause_video(texture_name, data_id))
        m_print.error("Texture with name \"" + texture_name + "\" not found!");
}

/**
 * Reset video.
 * @method module:textures.reset_video
 * @param {String} texture_name Texture name
 * @param {Number} [data_id=0] ID of loaded data
 */
exports.reset_video = function(texture_name, data_id) {
    if (!data_id)
        data_id = 0;
    if (!m_textures.reset_video(texture_name, data_id))
        m_print.error("Texture with name \"" + texture_name + "\" not found!");
}

}
