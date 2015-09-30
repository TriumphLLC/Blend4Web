/**
 * Copyright (C) 2014-2015 Triumph LLC
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

/**
 * Textures API.
 * @module textures
 */
b4w.module["textures"] = function(exports, require) {

var m_print    = require("__print");
var m_textures = require("__textures");

/**
 * Returns canvas texture context.
 * @method module:textures.get_canvas_texture_context
 * @param {String} id Canvas texture name
 * @param {Number} [data_id=0] ID of loaded data
 * @returns {CanvasRenderingContext2D} Canvas texture context
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
 * @param {String} id Canvas texture name
 * @param {Number} [data_id=0] ID of loaded data
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
 * Reset video (considering frame_offset value from Blender).
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
