/**
 * Copyright (C) 2014-2016 Triumph LLC
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
 * Extensions internal API.
 * @name extensions
 * @namespace
 * @exports exports as extensions
 */
b4w.module["__extensions"] = function(exports, require) {

var m_cfg   = require("__config");
var m_print = require("__print");

var cfg_def = m_cfg.defaults;

var _gl = null;

var _ext_cache = {};

/**
 * Setup WebGL context
 * @param gl WebGL context
 */
exports.setup_context = function(gl) {
    _gl = gl;
}

/**
 * Request WEBGL_compressed_texture_s3tc extension
 * @methodOf extensions
 */
exports.get_s3tc = function() {

    var ext_s3tc = get(       "WEBGL_compressed_texture_s3tc") ||
                   get("WEBKIT_WEBGL_compressed_texture_s3tc") ||
                   get(   "MOZ_WEBGL_compressed_texture_s3tc");
    return ext_s3tc;
}
exports.get_pvr = function() {
    var ext_pvr = get("WEBKIT_WEBGL_compressed_texture_pvrtc") ||
            get("WEBGL_compressed_texture_pvrtc");
    return ext_pvr;
}

/**
 * Request WEBGL_depth_texture extension
 * @methodOf extensions
 */
exports.get_depth_texture = function() {

    if (cfg_def.webgl2)
        return webgl2_get("WEBGL_depth_texture");

    var ext_dtex = get(       "WEBGL_depth_texture") ||
                   get("WEBKIT_WEBGL_depth_texture") || 
                   get(   "MOZ_WEBGL_depth_texture");
    return ext_dtex;
}

/**
 * Request EXT_texture_filter_anisotropic extension
 * @methodOf extensions
 */
exports.get_aniso = function() {

    var ext_aniso = get(       "EXT_texture_filter_anisotropic") ||
                    get("WEBKIT_EXT_texture_filter_anisotropic") ||
                    get(   "MOZ_EXT_texture_filter_anisotropic");
    return ext_aniso;
}

/**
 * Request WEBGL_debug_shaders extension
 * @methodOf extensions
 */
exports.get_debug_shaders = function() {

    var ext_ds = get("WEBGL_debug_shaders");
    return ext_ds; 
}

/**
 * Request WEBGL_debug_renderer_info extension
 * @methodOf extensions
 */
exports.get_renderer_info = function() {

    var ext_ri = get("WEBGL_debug_renderer_info");
    return ext_ri; 
}

/**
 * Request OES_element_index_uint extension
 * @methodOf extensions
 */
exports.get_elem_index_uint = function() {

    if (cfg_def.webgl2)
        return webgl2_get("OES_element_index_uint");

    var ext_elem_index_uint = get("OES_element_index_uint");
    return ext_elem_index_uint;
}

/**
 * Request OES_standard_derivatives extension
 * @methodOf extensions
 */
exports.get_standard_derivatives = function() {

    if (cfg_def.webgl2)
        return webgl2_get("OES_standard_derivatives");

    var ext_standard_derivatives = get("OES_standard_derivatives");
    return ext_standard_derivatives;
}

/**
 * Request OES_standard_derivatives extension
 * @methodOf extensions
 */
exports.get_disjoint_timer_query = function() {
    var ext = get("EXT_disjoint_timer_query");
    return ext;
}

exports.get_instanced_arrays = function() {

    if (cfg_def.webgl2)
        return webgl2_get("ANGLE_instanced_arrays");

    var ext = get("ANGLE_instanced_arrays");
    if (ext == null)
        return ext;

    var ext_complete = {
        drawElementsInstanced: function(mode, count, type, offset, primcount) {
            ext.drawElementsInstancedANGLE(mode, count, type, offset,
                    primcount);
        },
        vertexAttribDivisor: function(loc, div) {
            ext.vertexAttribDivisorANGLE(loc, div);
        },
        drawArraysInstanced: function(mode, first, count, primcount) {
            ext.drawArraysInstancedANGLE(mode, first, count, primcount);
        }
    }
    return ext_complete;
}

exports.get_vertex_array_object = function() {

    if (cfg_def.webgl2)
        return webgl2_get("OES_vertex_array_object");

    var ext = get("OES_vertex_array_object");
    if (ext == null)
        return ext;

    var ext_complete = {
        bindVertexArray: function(vao) {
            ext.bindVertexArrayOES(vao);
        },
        createVertexArray: function() {
            return ext.createVertexArrayOES();
        },
        deleteVertexArray: function(vao) {
            ext.deleteVertexArrayOES(vao);
        },
        isVertexArray: function(vao) {
            return ext.isVertexArrayOES(vao);
        }
    }
    return ext_complete;
}

function get(name) {

    if (name in _ext_cache)
        return _ext_cache[name];

    var ext = _gl.getExtension(name) || null;

    _ext_cache[name] = ext;

    if (ext)
        var color = "0a0";
    else
        var color = "a00";

    m_print.log("%cGET EXTENSION", "color: #" + color, name);

    return ext;
}

function webgl2_get(name) {

    if (name in _ext_cache)
        return _ext_cache[name];

    switch(name) {
    case "WEBGL_depth_texture":
    case "OES_element_index_uint":
    case "OES_standard_derivatives":
        var ext = {};
        break;
    case "ANGLE_instanced_arrays":
    case "OES_vertex_array_object":
        var ext = _gl;
        break;
    }

    _ext_cache[name] = ext;

    if (ext)
        var color = "0a0";
    else
        var color = "a00";

    m_print.log("%cGET EXTENSION (WebGL 2)", "color: #" + color, name);

    return ext;
}

/**
 * Perform module cleanup
 */
exports.cleanup = function() {
    _ext_cache = {};
}

exports.reset = function() {
    _gl = null;
}

}
