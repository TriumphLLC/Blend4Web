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
 * Textures internal API.
 * Don't forget to register GL context by setup_context() function.
 * @name textures
 * @namespace
 * @exports exports as textures
 */
b4w.module["__textures"] = function(exports, require) {

var m_compat    = require("__compat");
var m_cfg       = require("__config");
var m_texcomp   = require("__texcomp");
var m_debug     = require("__debug");
var m_ext       = require("__extensions");
var m_print     = require("__print");
var m_time      = require("__time");
var m_util      = require("__util");
var m_ren       = require("__renderer");
var m_obj_util  = require("__obj_util");
var m_curve     = require("__curve");
var m_vec3      = require("__vec3");
var m_scs       = require("__scenes");

var cfg_def = m_cfg.defaults;
var cfg_lim = m_cfg.context_limits;
var cfg_sfx = m_cfg.sfx;

var _tmpcanvas = null;

var _w_texture_tmp = null;
var _w_framebuffer_tmp = null;

// texture filters, proper values assigned by setup_context()

// mag & min
exports.TF_NEAREST = 0;
exports.TF_LINEAR = 0;
// min only
exports.TF_NEAREST_MIPMAP_NEAREST = 0;
exports.TF_LINEAR_MIPMAP_NEAREST = 0;
exports.TF_NEAREST_MIPMAP_LINEAR = 0;
exports.TF_LINEAR_MIPMAP_LINEAR = 0;

// texture types
exports.TT_RGBA_INT    = 10;
exports.TT_RGB_INT     = 20;
exports.TT_RGBA_FLOAT  = 30;
exports.TT_RGB_FLOAT   = 40;
exports.TT_DEPTH       = 50;
exports.TT_RB_RGBA     = 60;
exports.TT_RB_DEPTH    = 70;
exports.TT_RB_RGBA_MS  = 80;
exports.TT_RB_DEPTH_MS = 90;

exports.CURVE_NODES_TEXT_SIZE = 128;
exports.COLORRAMP_TEXT_SIZE = 128;
exports.PART_COLORRAMP_TEXT_SIZE = 128;

var INTERNAL_TEX_TYPES = ["NONE", "NODE_TEX", "SSAO_TEXTURE"];

var _canvas_textures_cache = {};
var _video_textures_cache = {};

var PLAYBACK_RATE = 2;

var _gl = null;

// texture quality
var LEVELS;
var BEZIER_ROOT_PRECISION = 0.001;
var FLT_EPSILON = 0.00000001;
/**
 * Setup WebGL context
 * @param gl WebGL context
 */
exports.setup_context = function(gl) {
    LEVELS = [
        gl.NEAREST_MIPMAP_NEAREST,
        gl.NEAREST_MIPMAP_LINEAR,
        gl.LINEAR_MIPMAP_NEAREST, // faster than gl.NEAREST_MIPMAP_LINEAR
        gl.LINEAR_MIPMAP_LINEAR
    ];

    exports.TF_NEAREST = gl.NEAREST;
    exports.TF_LINEAR = gl.LINEAR;
    // min only
    exports.TF_NEAREST_MIPMAP_NEAREST = gl.NEAREST_MIPMAP_NEAREST;
    exports.TF_LINEAR_MIPMAP_NEAREST = gl.LINEAR_MIPMAP_NEAREST;
    exports.TF_NEAREST_MIPMAP_LINEAR = gl.NEAREST_MIPMAP_LINEAR;
    exports.TF_LINEAR_MIPMAP_LINEAR = gl.LINEAR_MIPMAP_LINEAR;

    _gl = gl;
}

exports.get_canvas_context = function(id, data_id) {
    if (data_id in _canvas_textures_cache && id in _canvas_textures_cache[data_id])
        return _canvas_textures_cache[data_id][id].canvas_context;
    else
        return null;
}

exports.update_canvas_context = function(id, data_id) {
    if (data_id in _canvas_textures_cache && id in _canvas_textures_cache[data_id]) {
        update_texture_canvas(_canvas_textures_cache[data_id][id]);
        return true;
    } else
        return false;
}

function init_texture() {
    return {
        name: "",
        type: 0,

        source: "",
        source_id: "",
        width: 0,
        height: 0,
        compress_ratio: 1,
        source_non_color: false,
        allow_node_dds: true,

        source_size: 1024,
        enable_canvas_mipmapping: false,
        canvas_context: null,

        w_target: 0,
        w_texture: null,
        w_renderbuffer: null,

        // movie properties
        is_movie: false,

        vtex_data_id: -1,

        video_file: null,
        movie_length: 0,
        fps: 0,
        frame_start: 0,
        frame_offset: 0,
        frame_duration: 0,
        need_resize: false,
        scale_fac: 1.0,

        seq_video: null,
        seq_movie_length: 0,
        seq_fps: 0,
        seq_cur_frame: -1,
        seq_video_played: false,
        seq_last_discrete_mark: -1,

        video_was_stopped: false,

        use_auto_refresh: false,
        use_cyclic : false,
        use_nla: false,

        repeat: true,

        cleanup_gl_data_on_unload: true
    };
}

function clone_texture(texture) {
    var texture_new = init_texture();

    texture_new.name = texture.name;
    texture_new.type = texture.type;

    texture_new.source = texture.source;
    texture_new.source_id = texture.source_id;
    texture_new.width = texture.width;
    texture_new.height = texture.height;
    texture_new.compress_ratio = texture.compress_ratio;
    texture_new.source_non_color = texture.source_non_color;
    texture_new.allow_node_dds = texture.allow_node_dds;

    texture_new.source_size = texture.source_size;
    texture_new.enable_canvas_mipmapping = texture.enable_canvas_mipmapping;
    texture_new.canvas_context = texture.canvas_context;

    texture_new.w_target = texture.w_target;
    texture_new.w_texture = texture.w_texture;
    texture_new.w_renderbuffer = texture.w_renderbuffer;

    // movie properties
    texture_new.is_movie = texture.is_movie;

    texture_new.vtex_data_id = texture.vtex_data_id;

    texture_new.video_file = texture.video_file;
    texture_new.movie_length = texture.movie_length;
    texture_new.fps = texture.fps;
    texture_new.frame_start = texture.frame_start;
    texture_new.frame_offset = texture.frame_offset;
    texture_new.frame_duration = texture.frame_duration;
    texture_new.need_resize = texture.need_resize;
    texture_new.scale_fac = texture.scale_fac;

    texture_new.seq_video = texture.seq_video;
    texture_new.seq_movie_length = texture.seq_movie_length;
    texture_new.seq_fps = texture.seq_fps;
    texture_new.seq_cur_frame = texture.seq_cur_frame;
    texture_new.seq_video_played = texture.seq_video_played;
    texture_new.seq_last_discrete_mark = texture.seq_last_discrete_mark;

    texture_new.video_was_stopped = texture.video_was_stopped;

    texture_new.use_auto_refresh = texture.use_auto_refresh;
    texture_new.use_cyclic = texture.use_cyclic;
    texture_new.use_nla = texture.use_nla;

    texture_new.repeat = texture.repeat;

    texture_new.cleanup_gl_data_on_unload = texture.cleanup_gl_data_on_unload;

    return texture_new;
}

function clone_w_texture(texture, texture_new) {
    // NOTE: transfer parameters only
    _gl.bindTexture(texture.w_target, texture.w_texture);
    var texture_mag_filter = _gl.getTexParameter(texture.w_target, _gl.TEXTURE_MAG_FILTER);
    var texture_min_filter = _gl.getTexParameter(texture.w_target, _gl.TEXTURE_MIN_FILTER);
    var texture_wrap_s = _gl.getTexParameter(texture.w_target, _gl.TEXTURE_WRAP_S);
    var texture_wrap_t = _gl.getTexParameter(texture.w_target, _gl.TEXTURE_WRAP_T);

    texture_new.w_texture = _gl.createTexture();
    _gl.bindTexture(texture_new.w_target, texture_new.w_texture);
    _gl.texParameteri(texture_new.w_target, _gl.TEXTURE_MAG_FILTER, texture_mag_filter);
    _gl.texParameteri(texture_new.w_target, _gl.TEXTURE_MIN_FILTER, texture_min_filter);
    _gl.texParameteri(texture_new.w_target, _gl.TEXTURE_WRAP_S, texture_wrap_s);
    _gl.texParameteri(texture_new.w_target, _gl.TEXTURE_WRAP_T, texture_wrap_t);

    _gl.bindTexture(texture_new.w_target, null);
}

/**
 * Create empty b4w texture.
 * same format as bpy_texture._render
 * @param {String} name Texture name
 * @param type Texture type
 */
exports.create_texture = function(name, type, use_comparison) {

    var texture = init_texture();
    texture.name = name;
    texture.type = type;
    texture.source = "NONE";

    if (    type == exports.TT_RB_RGBA ||
            type == exports.TT_RB_DEPTH ||
            type == exports.TT_RB_RGBA_MS ||
            type == exports.TT_RB_DEPTH_MS) {
        texture.w_renderbuffer = _gl.createRenderbuffer();
    } else {
        var w_target = _gl.TEXTURE_2D;
        var w_texture = _gl.createTexture();

        _gl.bindTexture(w_target, w_texture);

        // NOTE: standard params suitable for POT and NPOT textures
        _gl.texParameteri(w_target, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
        _gl.texParameteri(w_target, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
        _gl.texParameteri(w_target, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
        _gl.texParameteri(w_target, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);

        if (cfg_def.webgl2 && use_comparison)
            _gl.texParameterf(w_target, _gl.TEXTURE_COMPARE_MODE,
                    _gl.COMPARE_REF_TO_TEXTURE);

        _gl.bindTexture(w_target, null);

        texture.w_target = w_target;
        texture.w_texture = w_texture;
    }

    return texture;
}

/**
 * Create cubemap b4w texture.
 * @param {String} name Texture name
 * @param {Number} size Size of texture
 */
exports.create_cubemap_texture = function(name, size) {

    var w_texture = _gl.createTexture();

    var w_target = _gl.TEXTURE_CUBE_MAP;

    _gl.bindTexture(w_target, w_texture);

    // NOTE: standard params suitable for POT and NPOT textures
    _gl.texParameteri(w_target, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
    _gl.texParameteri(w_target, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
    _gl.texParameteri(w_target, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
    _gl.texParameteri(w_target, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);

    var infos = [
        "TEXTURE_CUBE_MAP_POSITIVE_X",
        "TEXTURE_CUBE_MAP_NEGATIVE_X",
        "TEXTURE_CUBE_MAP_POSITIVE_Y",
        "TEXTURE_CUBE_MAP_NEGATIVE_Y",
        "TEXTURE_CUBE_MAP_POSITIVE_Z",
        "TEXTURE_CUBE_MAP_NEGATIVE_Z"
    ];

    for (var i = 0; i < 6; i++) {
        var info = infos[i];
        _gl.texImage2D(_gl[info], 0, _gl.RGBA,
            size, size, 0, _gl.RGBA, _gl.UNSIGNED_BYTE, null);
    }

    _gl.bindTexture(w_target, null);

    var texture = init_texture();

    texture.name = name;
    texture.type = exports.TT_RGBA_INT;
    texture.source = "NONE";
    texture.width = 3*size;
    texture.height = 2*size;
    texture.compress_ratio = 1;

    texture.w_texture = w_texture;
    texture.w_target = _gl.TEXTURE_CUBE_MAP;

    return texture;
}
/**
 * Set texture MIN/MAG filters (TF_*)
 */
exports.set_filters = function(texture, min_filter, mag_filter) {

    if (is_renderbuffer(texture))
        return;

    var w_target = texture.w_target;
    var w_texture = texture.w_texture;

    _gl.bindTexture(w_target, w_texture);

    if (min_filter)
        _gl.texParameteri(w_target, _gl.TEXTURE_MIN_FILTER, min_filter);

    if (mag_filter)
        _gl.texParameteri(w_target, _gl.TEXTURE_MAG_FILTER, mag_filter);

    _gl.bindTexture(w_target, null);
}

/**
 * Get texture MIN/MAG filters (TF_*)
 */
exports.get_filters = function(texture) {

    // consider that renderbuffer has NEAREST filtering
    if (is_renderbuffer(texture))
        return {
            min: exports.TF_NEAREST,
            mag: exports.TF_NEAREST
        }

    var w_target = texture.w_target;
    var w_texture = texture.w_texture;

    _gl.bindTexture(w_target, w_texture);

    var min = _gl.getTexParameter(w_target, _gl.TEXTURE_MIN_FILTER);
    var mag = _gl.getTexParameter(w_target, _gl.TEXTURE_MAG_FILTER);

    _gl.bindTexture(w_target, null);

    return {
        min: min,
        mag: mag
    }
}

exports.resize = function(texture, width, height) {
    var width = Math.max(width, cfg_def.edge_min_tex_size_hack? 2: 1);
    var height = Math.max(height, cfg_def.edge_min_tex_size_hack? 2: 1);

    if (texture.width == width && texture.height == height)
        return;

    switch (texture.type) {
    case exports.TT_RB_RGBA:
        _gl.bindRenderbuffer(_gl.RENDERBUFFER, texture.w_renderbuffer);
        // NOTE: maximum internal format in WebGL 1
        _gl.renderbufferStorage(_gl.RENDERBUFFER, _gl.RGB565,
                width, height);
        _gl.bindRenderbuffer(_gl.RENDERBUFFER, null);
        break;
    case exports.TT_RB_DEPTH:
        _gl.bindRenderbuffer(_gl.RENDERBUFFER, texture.w_renderbuffer);
        // NOTE: maximum internal format in WebGL 1
        _gl.renderbufferStorage(_gl.RENDERBUFFER, _gl.DEPTH_COMPONENT16,
                width, height);
        _gl.bindRenderbuffer(_gl.RENDERBUFFER, null);
        break;
    case exports.TT_RB_RGBA_MS:
        _gl.bindRenderbuffer(_gl.RENDERBUFFER, texture.w_renderbuffer);
        _gl.renderbufferStorageMultisample(_gl.RENDERBUFFER,
                cfg_def.msaa_samples, _gl.RGBA8,
                width, height);

        _gl.bindRenderbuffer(_gl.RENDERBUFFER, null);
        break;
    case exports.TT_RB_DEPTH_MS:
        _gl.bindRenderbuffer(_gl.RENDERBUFFER, texture.w_renderbuffer);
        _gl.renderbufferStorageMultisample(_gl.RENDERBUFFER,
                cfg_def.msaa_samples, _gl.DEPTH_COMPONENT24,
                width, height);
        _gl.bindRenderbuffer(_gl.RENDERBUFFER, null);
        break;
    default:
        var w_tex = texture.w_texture;
        var w_target = texture.w_target;

        _gl.bindTexture(w_target, w_tex);
        var format = get_image2d_format(texture);
        var iformat = get_image2d_iformat(texture);
        var type = get_image2d_type(texture);
        _gl.texImage2D(w_target, 0, iformat, width, height, 0, format, type, null);

        _gl.bindTexture(w_target, null);
        break;
    }

    if (check_texture_size(width, height)) {
        m_util.panic("Slink texture \"" + texture.name
                + "\" has unsupported size: " + width + "x" + height
                + ". Max available: " + cfg_lim.max_texture_size + "x"
                + cfg_lim.max_texture_size + ".");
        return;
    }

    texture.width = width;
    texture.height = height;
}

/**
 * Create b4w texture object with 1-pixel image as placeholder
 * @param bpy_texture b4w texture object
 */
exports.create_texture_bpy = create_texture_bpy;
function create_texture_bpy(bpy_texture, global_af, bpy_scenes, thread_id) {
    var tex_type = bpy_texture["type"];
    var image_data = new Uint8Array([0.8*255, 0.8*255, 0.8*255, 1*255]);
    var texture = init_texture();

    switch (tex_type) {
    case "DATA_TEX2D":
    case "IMAGE":
        var w_texture = _gl.createTexture();
        var w_target = _gl.TEXTURE_2D;
        _gl.bindTexture(w_target, w_texture);
        _gl.texImage2D(w_target, 0, _gl.RGBA, 1, 1, 0, _gl.RGBA, _gl.UNSIGNED_BYTE, image_data);

        if (bpy_texture["image"]) {
            if (bpy_texture["image"]["colorspace_settings_name"] == "Non-Color")
                texture.source_non_color = true;

            if (bpy_texture["image"]["source"] == "MOVIE") {
                texture.is_movie = true;
                texture.frame_start = bpy_texture["frame_start"];
                texture.frame_offset = bpy_texture["frame_offset"];
                texture.frame_duration = bpy_texture["frame_duration"];
                texture.use_auto_refresh = bpy_texture["use_auto_refresh"];
                texture.use_cyclic = bpy_texture["use_cyclic"];
                texture.movie_length = bpy_texture["movie_length"];
                texture.use_nla = bpy_texture["b4w_nla_video"]

                if (texture.frame_offset != 0)
                    m_print.warn("Frame offset for texture \"" + bpy_texture["name"] +
                            "\" has a nonzero value. Can lead to undefined behaviour" +
                            " for mobile devices.");
            }
        }
        break;
    case "NONE":
        // check if texture can be used for offscreen rendering
        var w_texture = _gl.createTexture();
        var w_target = _gl.TEXTURE_2D;
        _gl.bindTexture(w_target, w_texture);

        if (bpy_texture["b4w_source_type"] == "NONE")
            return null;

        else if (bpy_texture["b4w_source_type"] == "SCENE") {

            if (!bpy_texture["b4w_source_id"])
                return null;

            var name = bpy_texture["b4w_source_id"];
            var scene = m_util.keysearch("name", name, bpy_scenes);

            if (scene) {
                texture.source_size = bpy_texture["b4w_source_size"];
                scene._render_to_textures = scene._render_to_textures || [];
                scene._render_to_textures.push(bpy_texture);
                _gl.texImage2D(w_target, 0, _gl.RGBA, 1, 1, 0, _gl.RGBA, _gl.UNSIGNED_BYTE, image_data);
            } else
                return null;
        }
        break;
    case "ENVIRONMENT_MAP":
        var w_texture = _gl.createTexture();
        var w_target = _gl.TEXTURE_CUBE_MAP;
        _gl.bindTexture(w_target, w_texture);
        var targets = [
            "POSITIVE_X", "NEGATIVE_X",
            "POSITIVE_Y", "NEGATIVE_Y",
            "POSITIVE_Z", "NEGATIVE_Z"
        ];
        for (var i = 0; i < 6; i++)
            _gl.texImage2D(_gl["TEXTURE_CUBE_MAP_" + targets[i]], 0, _gl.RGBA,
                    1, 1, 0, _gl.RGBA, _gl.UNSIGNED_BYTE, image_data);
        break;

    case "BLEND":
        return null;
    case "NODE_TEX":
        var w_texture = _gl.createTexture();
        var w_target = _gl.TEXTURE_2D;
        _gl.bindTexture(w_target, w_texture);
        _gl.texImage2D(w_target, 0, _gl.RGBA, 1, 1, 0, _gl.RGBA, _gl.UNSIGNED_BYTE, image_data);
        break;

    default:
        m_print.error("texture \"" + bpy_texture["name"] +
            "\" has unsupported type \"" + tex_type + "\"");
        return null;
    }

    if (tex_type == "NONE" && !(bpy_texture["b4w_enable_canvas_mipmapping"] &&
            bpy_texture["b4w_source_type"] == "CANVAS") || tex_type == "DATA_TEX2D"
            || tex_type == "IMAGE" && bpy_texture["image"]["source"] == "MOVIE"
            || tex_type == "NODE_TEX")
        _gl.texParameteri(w_target, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
    else
        _gl.texParameteri(w_target, _gl.TEXTURE_MIN_FILTER, LEVELS[cfg_def.texture_min_filter]);

    _gl.texParameteri(w_target, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);

    setup_anisotropic_filtering(bpy_texture, global_af, w_target);

    var tex_extension = bpy_texture["extension"];
    if (tex_extension == "REPEAT" && !bpy_texture["b4w_shore_dist_map"]) {
        _gl.texParameteri(w_target, _gl.TEXTURE_WRAP_S, _gl.REPEAT);
        _gl.texParameteri(w_target, _gl.TEXTURE_WRAP_T, _gl.REPEAT);
    } else {
        texture.repeat = false;
        _gl.texParameteri(w_target, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
        _gl.texParameteri(w_target, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
    }

    texture.type = exports.TT_RGBA_INT;
    texture.width = 1;
    texture.height = 1;

    texture.w_texture = w_texture;
    texture.w_target = w_target;

    if (bpy_texture["b4w_source_type"] == "CANVAS" && tex_type == "NONE") {
        var id = bpy_texture["b4w_source_id"];
        var size = bpy_texture["b4w_source_size"];

        texture.enable_canvas_mipmapping = bpy_texture["b4w_enable_canvas_mipmapping"];
        texture.source_id = id;
        texture.source = "CANVAS";

        update_canvas_props(id, size, texture);

        if (!(thread_id in _canvas_textures_cache))
            _canvas_textures_cache[thread_id] = {};
        _canvas_textures_cache[thread_id][id] = texture;
        update_texture_canvas(texture);
    } else if (bpy_texture["b4w_source_type"] == "SCENE" && tex_type == "NONE") {
        texture.source_id = bpy_texture["b4w_source_id"];
        texture.source = "SCENE";
    } else {
        texture.source = tex_type;
        _gl.generateMipmap(w_target);
        _gl.bindTexture(w_target, null);
    }
    texture.name = bpy_texture["name"];
    bpy_texture._render = texture;
    return texture;
}

function setup_anisotropic_filtering(bpy_texture, global_af, w_target) {

    // anisotropic filtering is one of these string params: DEFAULT, OFF, 2x, 4x, 8x, 16x
    var af = bpy_texture["b4w_anisotropic_filtering"];

    // individual textures override global AF value when b4w_anisotropic_filtering is not DEFAULT
    if (af === "DEFAULT")
        af = global_af;

    if (af !== "OFF" && cfg_def.anisotropic_filtering) {
        var ext_aniso = m_ext.get_aniso();
        if (ext_aniso) {
            af = parseFloat(af.split("x")[0]);
            _gl.texParameterf(w_target, ext_aniso.TEXTURE_MAX_ANISOTROPY_EXT, af);
        }
    }
}

function update_canvas_props(name, size, texture) {
    var canvas = document.createElement("canvas");
    canvas.width  = size;
    canvas.height = size;
    texture.canvas_context = canvas.getContext("2d");
}

function update_texture_canvas(texture) {

    if (texture.source != "CANVAS")
        m_util.panic("Wrong texture");

    var w_texture = texture.w_texture;
    var w_target = texture.w_target;

    _gl.bindTexture(w_target, w_texture);

    var w_format = get_image2d_format(texture);
    var w_iformat = get_image2d_iformat(texture);
    var w_type = get_image2d_type(texture);
    var canvas = texture.canvas_context.canvas;
    _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, true);
    _gl.texImage2D(w_target, 0, w_iformat, w_format, w_type, canvas);
    _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, false);
    if (texture.enable_canvas_mipmapping)
        _gl.generateMipmap(w_target);
    _gl.bindTexture(w_target, null);

    texture.width = canvas.width;
    texture.height = canvas.height;
}

exports.update_video_texture = update_video_texture;
function update_video_texture(texture) {
    var w_texture = texture.w_texture;
    var w_target = texture.w_target;

    _gl.bindTexture(w_target, w_texture);

    _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, true);
    if (texture.video_file.length != 4) {
        if (texture.need_resize)
            draw_resized_image(texture, texture.video_file,
                    texture.width * texture.scale_fac,
                    texture.height * texture.scale_fac, false);
        else
            _gl.texImage2D(w_target, 0, _gl.RGBA, _gl.RGBA,
                    _gl.UNSIGNED_BYTE, texture.video_file);
    } else
        _gl.texImage2D(w_target, 0, _gl.RGBA, 1, 1, 0, _gl.RGBA, _gl.UNSIGNED_BYTE,
                texture.video_file);

  _gl.bindTexture(w_target, null);

}

exports.update_seq_video_texture = update_seq_video_texture;
function update_seq_video_texture(texture) {
    var w_texture = texture.w_texture;
    var w_target = texture.w_target;

    _gl.bindTexture(w_target, w_texture);

    _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, true);
    if (texture.need_resize)
        draw_resized_image(texture, texture.seq_video[texture.seq_cur_frame],
                texture.width * texture.scale_fac,
                texture.height * texture.scale_fac, false);
    else
        _gl.texImage2D(w_target, 0, _gl.RGBA, _gl.RGBA,
                _gl.UNSIGNED_BYTE, texture.seq_video[texture.seq_cur_frame]);

    _gl.bindTexture(w_target, null);
}

function get_tmp_canvas() {
    if (!_tmpcanvas)
        _tmpcanvas = document.createElement("canvas");
    return _tmpcanvas;
}

function draw_resized_image(texture, image_data, width, height, is_dds) {
    if (!is_dds) {
        setup_resized_tex_data(_gl.TEXTURE_2D);
        _gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, _gl.RGBA, _gl.UNSIGNED_BYTE, image_data);
    }
    _gl.bindTexture(_gl.TEXTURE_2D, null);
    m_ren.draw_resized_texture(texture, width, height, _w_framebuffer_tmp,
            _w_texture_tmp, "NONE");
}

function resize_cube_map(texture, image_data, pot_dim, img_dim) {
    setup_resized_tex_data(_gl.TEXTURE_2D);
    _gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, _gl.RGBA, _gl.UNSIGNED_BYTE, image_data);
    _gl.bindTexture(_gl.TEXTURE_2D, null);

    // NOTE: Cube map texture must be initiated before using
    for (var i = 0; i < 6; i++)
        _gl.texImage2D(_gl["TEXTURE_CUBE_MAP_POSITIVE_X"] + i, 0, _gl.RGBA, pot_dim, pot_dim, 0,
                _gl.RGBA, _gl.UNSIGNED_BYTE, null);

    _gl.bindTexture(texture.w_target, null);

    _gl.bindFramebuffer(_gl.FRAMEBUFFER, _w_framebuffer_tmp);

    for (var i = 0; i < 6; i++) {
        m_ren.draw_resized_cubemap_texture(texture, _gl["TEXTURE_CUBE_MAP_POSITIVE_X"] + i, pot_dim,
                img_dim, _w_texture_tmp, i);
    }
    _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);

    _gl.bindTexture(texture.w_target, texture.w_texture);

    _gl.texParameteri(texture.w_target, _gl.TEXTURE_MIN_FILTER, LEVELS[cfg_def.texture_min_filter]);
    _gl.texParameteri(texture.w_target, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
}

function resize_cube_map_canvas(texture, image_data, img_dim, pot_dim, infos) {
    for (var i = 0; i < 6; i++) {
        var info = infos[i];
        var tmpcanvas = get_tmp_canvas();
        tmpcanvas.width = pot_dim;
        tmpcanvas.height = pot_dim;
        var ctx = tmpcanvas.getContext("2d");

        // OpenGL ES 2.0 Spec, 3.7.5 Cube Map Texture Selection
        // vertical flip for Y, horizontal flip for X and Z
        if (info[0] == "POSITIVE_Y" || info[0] == "NEGATIVE_Y") {
            ctx.translate(0, pot_dim);
            ctx.scale(1, -1);
        } else {
            ctx.translate(pot_dim, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(image_data, info[1] * img_dim, info[2] * img_dim,
                      img_dim, img_dim, 0, 0, pot_dim, pot_dim);

        _gl.texImage2D(_gl["TEXTURE_CUBE_MAP_" + info[0]], 0, _gl.RGBA,
            _gl.RGBA, _gl.UNSIGNED_BYTE, tmpcanvas);

    }
}

function setup_resized_tex_data(w_target) {
    if (!_w_framebuffer_tmp)
        _w_framebuffer_tmp = _gl.createFramebuffer();

    _gl.bindTexture(w_target, null);

    if (!_w_texture_tmp)
        _w_texture_tmp = _gl.createTexture();
    _gl.bindTexture(w_target, _w_texture_tmp);
    prepare_npot_texture(w_target);
}

/**
 * Load image data into texture object
 * @param texture texture object
 * @param {vec4|HTMLImageElement} image_data Color or image element to load into
 * texture object
 */
exports.update_texture = update_texture;
function update_texture(texture, image_data, comp_method, filepath, thread_id) {
    var tex_type = texture.source;
    var w_texture = texture.w_texture;
    var w_target = texture.w_target;

    var width = 1;
    var height = 1;

    _gl.bindTexture(w_target, w_texture);

    if (image_data.length == 4) {
        var update_color = true;
        var image_data = new Uint8Array([
            image_data[0] * 255,
            image_data[1] * 255,
            image_data[2] * 255,
            image_data[3] * 255
        ]);
    }

    if (tex_type == "IMAGE") {
        if (update_color) {
            _gl.texImage2D(w_target, 0, _gl.RGBA, 1, 1, 0, _gl.RGBA, _gl.UNSIGNED_BYTE,
                    image_data);
            texture.width = 1;
            texture.height = 1;
        } else if (comp_method) {
            var comp_img_wh = m_texcomp.get_width_height(image_data, comp_method);
            var is_npot = m_util.check_npot(comp_img_wh.width)
                    || m_util.check_npot(comp_img_wh.height);

            if(check_texture_size(comp_img_wh.width, comp_img_wh.height)) {
                m_print.error("Texture \"" + filepath
                        + "\" has unsupported size: " + comp_img_wh.width + "x"
                        + comp_img_wh.height + ". Max available: "
                        + cfg_lim.max_texture_size + "x"
                        + cfg_lim.max_texture_size + ".")
                return;
            }

            var width = comp_img_wh.width;
            var height = comp_img_wh.height;

            if (is_npot || comp_method == "pvr") {
                texture.need_resize = true;
                setup_resized_tex_data(w_target);
                width = calc_pot_size(width * texture.scale_fac);
                height = calc_pot_size(height * texture.scale_fac);
            }

            if (comp_method == "dds")
                m_texcomp.upload_dds_levels(_gl, m_ext.get_s3tc(), image_data, true);
            else if (comp_method == "pvr")
                m_texcomp.upload_pvr_levels(_gl, m_ext.get_pvr(), image_data, true);

            if (texture.need_resize) {
                draw_resized_image(texture, null, width, height, true);
                _gl.bindTexture(w_target, w_texture);
                _gl.generateMipmap(w_target);
            }

            texture.width = width;
            texture.height = height;
            texture.compress_ratio = m_texcomp.get_compress_ratio(image_data, comp_method);
        } else {
            _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, true);
            //_gl.pixelStorei(_gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
            if (texture.is_movie) {
                if (cfg_def.seq_video_fallback) {
                    width = image_data[0].width;
                    height = image_data[0].height;
                } else {
                    width = image_data.videoWidth;
                    height = image_data.videoHeight;
                }
            } else {
                width = image_data.width;
                height = image_data.height;
            }

            texture.width = width;
            texture.height = height;

            if (check_texture_size(width, width)) {
                m_print.warn("Texture \"" + filepath
                        + "\" has unsupported size: " + width + "x"
                        + height + ". Max available: "
                        + cfg_lim.max_texture_size + "x"
                        + cfg_lim.max_texture_size +
                        ". Reduced image size will be used.");
                texture.scale_fac = Math.min(cfg_lim.max_texture_size / width,
                        cfg_lim.max_texture_size / height);
                texture.need_resize = true;
            }

            if (texture.is_movie) {
                if (!cfg_def.seq_video_fallback) {
                    if (!(thread_id in _video_textures_cache))
                        _video_textures_cache[thread_id] = {};
                    _video_textures_cache[thread_id][texture.name] = texture;

                    texture.video_file = image_data;
                    // NOTE: looping needed to prevent a cycle video from
                    // stopping accidentally due to frame/timeline errors
                    texture.video_file.loop = texture.use_cyclic;
                    // NOTE: image_data.duration can't be available?
                    texture.fps = image_data.duration ?
                            texture.movie_length / image_data.duration :
                            m_time.get_framerate();

                    if (!cfg_sfx.disable_playback_rate_hack) {
                        image_data.playbackRate = m_time.get_framerate() / texture.fps;
                        if (cfg_sfx.clamp_playback_rate_hack && image_data.playbackRate >
                                    PLAYBACK_RATE)
                            image_data.playbackRate = PLAYBACK_RATE;
                    }
                    var draw_data = image_data;
                    create_oncanplay_handler(texture);
                } else {
                    if (!(thread_id in _video_textures_cache))
                        _video_textures_cache[thread_id] = {};
                    _video_textures_cache[thread_id][texture.name] = texture;

                    texture.seq_video = image_data;
                    texture.seq_movie_length = image_data.length;
                    texture.fps = texture.seq_fps * texture.movie_length / image_data.length;

                    var draw_data = image_data[0];
                }
            } else
                var draw_data = image_data;

            var width = calc_pot_size(texture.width * texture.scale_fac);
            var height = calc_pot_size(texture.height * texture.scale_fac);
            if (!texture.need_resize)
                if (!cfg_def.webgl2 && (m_util.check_npot(texture.width) ||
                        m_util.check_npot(texture.height))) {
                    draw_resized_image(texture, draw_data, width, height, false);
                    texture.need_resize = true;
                } else
                    _gl.texImage2D(w_target, 0, _gl.RGBA, _gl.RGBA, _gl.UNSIGNED_BYTE, draw_data);
            else {
                var canvas = get_tmp_canvas();
                var ctx = canvas.getContext("2d");
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(draw_data, 0, 0, texture.width, texture.height,
                        0, 0, width, height);
                _gl.texImage2D(w_target, 0, _gl.RGBA, _gl.RGBA, _gl.UNSIGNED_BYTE, canvas);
            }

            var w_texture = texture.w_texture;
            _gl.bindTexture(w_target, w_texture);
            if (!texture.is_movie) {
                _gl.generateMipmap(w_target);
            }
            _gl.bindTexture(w_target, null);

            texture.width = width;
            texture.height = height;
        }

    } else if (tex_type == "ENVIRONMENT_MAP") {

        // get six images from Blender-packed environment map
        var infos = [
            ["POSITIVE_X", 2, 0],
            ["NEGATIVE_X", 0, 0],
            ["POSITIVE_Y", 1, 1],
            ["NEGATIVE_Y", 0, 1],
            ["POSITIVE_Z", 1, 0],
            ["NEGATIVE_Z", 2, 1]
        ];

        if (update_color) {
            for (var i = 0; i < 6; i++) {
                var info = infos[i];
                _gl.texImage2D(_gl["TEXTURE_CUBE_MAP_" + info[0]], 0, _gl.RGBA,
                    1, 1, 0, _gl.RGBA, _gl.UNSIGNED_BYTE, image_data);
            }

            texture.width = 3;
            texture.height = 2;
        } else {
            // Restore default OpenGL state in case it was changed earlier
            _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, false);

            if (image_data.width % 3 || image_data.height % 2) {
                m_print.error("Cubemap texture \"" + filepath
                        + "\" has unsupported size: " + image_data.width + "x"
                        + image_data.height + ". The width must be multiple" +
                        " of three and the height - multiple of two.");
                return;
            }

            var img_dim = image_data.width / 3;

            if (check_cube_map_size(img_dim)) {
                m_print.warn("Cubemap texture \"" + filepath
                        + "\" has unsupported size: " + image_data.width + "x"
                        + image_data.height + ". Max available: "
                        + cfg_lim.max_cube_map_texture_size * 3 + "x"
                        + cfg_lim.max_cube_map_texture_size * 2 + ". "
                        + "Reduced image size will be used.");
                var scale_fac = cfg_lim.max_cube_map_texture_size / img_dim;
                var tex_dim = calc_pot_size(img_dim * scale_fac);
                texture.need_resize = true;
            } else {
                var tex_dim = calc_pot_size(img_dim);
                if (!cfg_def.webgl2 && check_texture_size(3 * tex_dim, 2 * tex_dim))
                    texture.need_resize = true;
            }
            if (texture.need_resize || cfg_def.resize_cubemap_canvas_hack)
                resize_cube_map_canvas(texture, image_data, img_dim, tex_dim, infos);
            else
                resize_cube_map(texture, image_data, tex_dim, img_dim);

            if (m_debug.check_ff_cubemap_out_of_memory()) {
                // NOTE: the state of the context and/or objects is undefined 
                // after the GL_OUT_OF_MEMORY error;
                // see: https://www.opengl.org/wiki/OpenGL_Error#Side_effects
                m_print.warn("Firefox detected, setting max cubemap size to 256, use canvas for resizing.");
                resize_cube_map_canvas(texture, image_data, img_dim, 
                        m_compat.NVIDIA_OLD_GPU_CUBEMAP_MAX_SIZE, infos);
            }

            texture.width = 3 * tex_dim;
            texture.height = 2 * tex_dim;
            _gl.generateMipmap(w_target);
        }
    } else if (tex_type == "DATA_TEX2D" || tex_type == "NODE_TEX") {
        _gl.texImage2D(w_target, 0, _gl.RGBA, image_data.width, image_data.height, 0,
                       _gl.RGBA, _gl.UNSIGNED_BYTE, image_data.data);
        texture.width = image_data.width;
        texture.height = image_data.height;
    }

    _gl.bindTexture(w_target, null);
}

function create_oncanplay_handler(tex) {
    tex.video_file.oncanplay = function() {
        // NOTE: setting new frame for an HTML5 video texture forces it
        // to seek at this point which requires some time, so it can be
        // updated only on the next frame after this operation.
        update_video_texture(tex);
    }
}

function prepare_npot_texture(tex_target) {
    _gl.texParameteri(tex_target, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
    _gl.texParameteri(tex_target, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
    _gl.texParameteri(tex_target, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
    _gl.texParameteri(tex_target, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
}

exports.calc_pot_size = calc_pot_size;
function calc_pot_size(num) {
    if (m_util.check_npot(num)) {
        var size =  Math.pow(2, parseInt(num).toString(2).length);
        return m_util.clamp(size, 2, cfg_lim.max_texture_size);
    }
    return num;
}

/**
 * Get format for texImage2D()
 */
function get_image2d_format(texture) {

    var format;

    switch (texture.type) {
    case exports.TT_RGBA_INT:
        format = _gl.RGBA;
        break;
    case exports.TT_RGB_INT:
        format = _gl.RGB;
        break;
    case exports.TT_RGBA_FLOAT:
        format = _gl.RGBA;
        break;
    case exports.TT_RGB_FLOAT:
        format = _gl.RGB;
        break;
    case exports.TT_DEPTH:
        format = _gl.DEPTH_COMPONENT;
        break;
    default:
        m_util.panic("Wrong texture type");
        break;
    }

    return format;
}

/**
 * Get internalformat for texImage2D()
 */
function get_image2d_iformat(texture) {

    var format;

    switch (texture.type) {
    case exports.TT_RGBA_INT:
        format = cfg_def.webgl2 ? _gl.RGBA8 : _gl.RGBA;
        break;
    case exports.TT_RGB_INT:
        format = cfg_def.webgl2 ? _gl.RGB8 : _gl.RGB;
        break;
    case exports.TT_RGBA_FLOAT:
        format = cfg_def.webgl2 ? _gl.RGBA8 : _gl.RGBA;
        break;
    case exports.TT_RGB_FLOAT:
        format = cfg_def.webgl2 ? _gl.RGB8 : _gl.RGB;
        break;
    case exports.TT_DEPTH:
        format = cfg_def.webgl2 ? _gl.DEPTH_COMPONENT24 : _gl.DEPTH_COMPONENT;
        break;
    default:
        m_util.panic("Wrong texture type");
        break;
    }

    return format;
}

/**
 * Get type for texImage2D()
 */
function get_image2d_type(texture) {

    var type;

    switch (texture.type) {
    case exports.TT_RGBA_INT:
        type = _gl.UNSIGNED_BYTE;
        break;
    case exports.TT_RGB_INT:
        type = _gl.UNSIGNED_BYTE;
        break;
    case exports.TT_RGBA_FLOAT:
        type = _gl.FLOAT;
        break;
    case exports.TT_RGB_FLOAT:
        type = _gl.FLOAT;
        break;
    case exports.TT_DEPTH:
        //type = _gl.UNSIGNED_SHORT;
        type = _gl.UNSIGNED_INT;
        break;
    default:
        m_util.panic("Wrong texture type");
        break;
    }

    return type;
}

exports.delete_texture = function(texture) {
    _gl.deleteTexture(texture);
}

/**
 * Check if object is a texture, renderbuffer is also a texture.
 */
exports.is_texture = function(tex) {
    if (tex && tex.name && (tex.w_texture || tex.w_renderbuffer))
        return true;
    else
        return false;
}

/**
 * Check if object is a renderbuffer
 */
exports.is_renderbuffer = is_renderbuffer;
function is_renderbuffer(tex) {
    if (tex && tex.name && tex.w_renderbuffer)
        return true;
    else
        return false;
}

exports.is_float = function(tex) {
    if (tex.type == exports.TT_RGBA_FLOAT || tex.type == exports.TT_RGB_FLOAT)
        return true;
    else
        return false;
}

/**
 * Get an amount of bytes occupied by one texel.
 */
exports.get_texture_texel_size = function(tex) {
    var size = 0;

    switch (tex.type) {
    case exports.TT_RGBA_INT:
    case exports.TT_RGB_INT:
        size = 4;
        break;
    case exports.TT_RGBA_FLOAT:
    case exports.TT_RGB_FLOAT:
        size = 16;
        break;
    case exports.TT_DEPTH:
        size = 3;
        break;
    case exports.TT_RB_RGBA:
    case exports.TT_RB_DEPTH:
        size = 2;
        break;
    case exports.TT_RB_RGBA_MS:
        size = 4 * cfg_def.msaa_samples;
        break;
    case exports.TT_RB_DEPTH_MS:
        size = 3 * cfg_def.msaa_samples;
        break;
    }

    return size;
}

function check_texture_size(width, height) {
    return (width > cfg_lim.max_texture_size || height > cfg_lim.max_texture_size);
}

function check_cube_map_size(size) {
    return size > cfg_lim.max_cube_map_texture_size;
}

exports.generate_texture = generate_texture;
function generate_texture(type, subs) {
    var texture = null;
    switch (type) {
    case "SSAO_TEXTURE":
        texture = {
            "name": "special_ssao_texture",
            "type": "DATA_TEX2D",
            "extension": "REPEAT",
            "b4w_anisotropic_filtering": "OFF"
        };
        create_texture_bpy(texture, null, subs, 0);
        texture["image"] = { "filepath": null };
        break;
    case "NODE_TEX":
        texture = {
            "name": "",
            "type": "NODE_TEX",
            "extension": "CLIP",
            "b4w_anisotropic_filtering": "OFF"
        };
        create_texture_bpy(texture, null, subs, 0);
        texture["image"] = { "filepath": null };
        break;
    default:
        break;
    }
    return texture;
}

exports.cleanup = function() {
    if (!cfg_def.seq_video_fallback)
        for (var data_id in _video_textures_cache)
            for (var tex in _video_textures_cache[data_id]) {
                _video_textures_cache[data_id][tex].video_file.pause();
                _video_textures_cache[data_id][tex].video_file.src = "";
                _video_textures_cache[data_id][tex].video_file.load();
            }

    _canvas_textures_cache = {};
    _video_textures_cache = {};
}

exports.pause = function() {
    for (var data_id in _video_textures_cache)
        for (var vtex_name in _video_textures_cache[data_id]) {
            var vtex = _video_textures_cache[data_id][vtex_name];
            if (!video_is_played(vtex))
                continue;

            pause_video(vtex_name, data_id);
            vtex.video_was_stopped = true;
        }
}

exports.reset = function() {
    for (var data_id in _video_textures_cache)
        for (var vtex_name in _video_textures_cache[data_id]) {
            reset_video(vtex_name, data_id);
            _video_textures_cache[data_id][vtex_name].video_was_stopped = false;
        }
}

exports.play = function(resume_stopped_only) {
    for (var data_id in _video_textures_cache)
        for (var vtex_name in _video_textures_cache[data_id]) {
            var vtex = _video_textures_cache[data_id][vtex_name];
            if (resume_stopped_only && !vtex.video_was_stopped)
                continue;
            play_video(vtex_name, data_id)
            vtex.video_was_stopped = false;
        }
}

exports.video_allow_nla = video_allow_nla;
function video_allow_nla(vtex_name, data_id) {
    if (data_id in _video_textures_cache && vtex_name in _video_textures_cache[data_id])
        return _video_textures_cache[data_id][vtex_name].use_nla;

    return false;
}

exports.play_video = play_video;
function play_video(vtex_name, data_id) {
    if (data_id in _video_textures_cache && vtex_name in _video_textures_cache[data_id]) {
        var vtex = _video_textures_cache[data_id][vtex_name];
        if (vtex.video_file)
            vtex.video_file.play();
        else if (vtex.seq_video)
            vtex.seq_video_played = true;
        return true;
    } else
        return false;
}

exports.pause_video = pause_video;
function pause_video(vtex_name, data_id) {
    if (data_id in _video_textures_cache && vtex_name in _video_textures_cache[data_id]) {
        var vtex = _video_textures_cache[data_id][vtex_name];
        if (vtex.video_file)
            vtex.video_file.pause();
        else if (vtex.seq_video)
            vtex.seq_video_played = false;
        return true;
    } else
        return false;
}

/**
 * Reset video texture considering its frame offset.
 */
exports.reset_video = reset_video;
function reset_video(vtex_name, data_id) {
    if (data_id in _video_textures_cache && vtex_name in _video_textures_cache[data_id]) {
        var vtex = _video_textures_cache[data_id][vtex_name];
        if (vtex.video_file) {
            vtex.video_file.currentTime = vtex.frame_offset / vtex.fps;
            // normal video will be updated through the oncanplay handler
        } else if (vtex.seq_video) {
            vtex.seq_cur_frame = video_frame_to_seq_frame(vtex, vtex.frame_offset);
            update_seq_video_texture(vtex);
        }
        return true;
    } else
        return false;
}

/**
 * Need to pass sequential frame for a sequential video
 */
exports.set_frame_video = function(vtex_name, frame, data_id) {
    if (data_id in _video_textures_cache && vtex_name in _video_textures_cache[data_id]) {
        var vtex = _video_textures_cache[data_id][vtex_name];
        if (vtex.video_file) {
            vtex.video_file.currentTime = frame / vtex.fps;
            // normal video will be updated through the oncanplay handler
        } else if (vtex.seq_video) {
            vtex.seq_cur_frame = frame;
            update_seq_video_texture(vtex);
        }
        return true;
    } else
        return false;
}

exports.video_is_played = video_is_played;
function video_is_played(vtex) {
    if (vtex.video_file)
        return !vtex.video_file.paused;
    else if (vtex.seq_video)
        return vtex.seq_video_played;
    else
        return false;
}

exports.video_update_is_available = function(vtex) {
    if (!vtex.video_file && !vtex.seq_video)
        return 0;

    if (vtex.video_file)
        return vtex.video_file.readyState >= 2;
    else
        return true;
}

exports.video_get_current_frame = function(vtex) {
    if (!vtex.video_file && !vtex.seq_video)
        return 0;

    if (vtex.video_file)
        return Math.round(vtex.video_file.currentTime * vtex.fps);
    else
        return vtex.seq_cur_frame;
}

exports.video_get_start_frame = function(vtex) {
    if (!vtex.video_file && !vtex.seq_video)
        return 0;

    if (vtex.video_file)
        return vtex.frame_offset;
    else
        return video_frame_to_seq_frame(vtex, vtex.frame_offset);
}

exports.video_get_end_frame = function(vtex) {
    if (!vtex.video_file && !vtex.seq_video)
        return 0;

    var duration = Math.min(vtex.frame_duration, vtex.movie_length
            - vtex.frame_offset);
    if (vtex.video_file)
        return vtex.frame_offset + duration;
    else
        return video_frame_to_seq_frame(vtex, vtex.frame_offset + duration);
}

/**
 * Convert continuous time to a discrete mark. Suitable for a frame changing detection.
 */
exports.seq_video_get_discrete_timemark = function(vtex, time) {
    return Math.round((time * vtex.seq_fps) * (m_time.get_framerate() / vtex.fps));
}

/**
 * Not for sequential video, result is needed to convert.
 */
exports.video_get_duration = function(vtex) {
    return Math.min(vtex.frame_duration, vtex.movie_length - vtex.frame_offset);
}

exports.video_frame_to_seq_frame = video_frame_to_seq_frame;
function video_frame_to_seq_frame(vtex, frame) {
    return Math.round(frame * vtex.seq_movie_length / vtex.movie_length);
}

exports.get_canvas_context_by_object = function(object, texture_name) {

    var texture = get_texture_by_name(object, texture_name);
    if (texture && texture.source == "CANVAS")
        return texture.canvas_context;
    else
        return null;
}

exports.update_canvas_context_by_object = function(object, texture_name) {

    var texture = get_texture_by_name(object, texture_name);
    if (texture && texture.source == "CANVAS") {
        update_texture_canvas(texture);
        return true;
    } else
        return false;
}

function get_texture_by_name(object, texture_name) {

    if (m_obj_util.is_dynamic(object))
        return get_texture_by_name_obj(object, texture_name);
    else {
        var objects = object.meta_objects;
        for (var i = 0; i < objects.length; i++) {
            var texture = get_texture_by_name_obj(objects[i], texture_name);
            if (texture)
                return texture;
        }
    }
    return null;
}

function set_texture_by_name(object, texture_name, new_texture) {

    if (m_obj_util.is_dynamic(object))
        set_texture_by_name_obj(object, texture_name, new_texture);
    else {
        var objects = object.meta_objects;
        for (var i = 0; i < objects.length; i++)
            set_texture_by_name_obj(objects[i], texture_name, new_texture);
    }
}

exports.get_texture_names = function(object) {

    var tex_names = [];
    if (m_obj_util.is_dynamic(object))
        find_texture_names(object, tex_names);
    else {
        var objects = object.meta_objects;
        for (var i = 0; i < objects.length; i++)
            find_texture_names(objects[i], tex_names);
    }
    return tex_names;
}

function get_texture_by_name_obj(obj, texture_name) {
    var scenes_data = obj.scenes_data;
    if (scenes_data.length) {
        var scene_data = scenes_data[0];
        var batches = scene_data.batches;
        for (var k = 0; k < batches.length; k++) {
            var batch = batches[k];
            if (batch.type == "MAIN" || batch.type == "SKY")
                for (var p = 0; p < batch.textures.length; p++) {
                    var tex = batch.textures[p];
                    if (batch.textures[p].name == texture_name)
                        return batch.textures[p];
                }
        }
    }
    return null;
}

function set_texture_by_name_obj(obj, texture_name, new_texture) {
    var scenes_data = obj.scenes_data;
    if (scenes_data.length) {
        var scene_data = scenes_data[0];
        var batches = scene_data.batches;
        for (var k = 0; k < batches.length; k++) {
            var batch = batches[k];
            if (batch.type == "MAIN")
                for (var p = 0; p < batch.textures.length; p++) {
                    var tex = batch.textures[p];
                    if (batch.textures[p].name == texture_name)
                        batch.textures[p] = new_texture;
                }
        }
    }
}

function find_texture_names(obj, names) {
    var scenes_data = obj.scenes_data;
    if (scenes_data.length) {
        var scene_data = scenes_data[0];
        var batches = scene_data.batches;
        for (var k = 0; k < batches.length; k++) {
            var batch = batches[k];
            if (batch.type == "MAIN")
                for (var p = 0; p < batch.textures.length; p++) {
                    var tex = batch.textures[p];
                    if (INTERNAL_TEX_TYPES.indexOf(tex.source) == -1 
                            && names.indexOf(tex.name) == -1)
                        names.push(tex.name);
                }
        }
    }
}

function copy_canvas_texture(texture) {

    var new_texture = init_texture();
    new_texture.name = texture.name;
    new_texture.source = "CANVAS";
    new_texture.width = texture.width;
    new_texture.height = texture.height;
    new_texture.enable_canvas_mipmapping = texture.enable_canvas_mipmapping;
    new_texture.type = texture.type;

    var canvas = document.createElement("canvas");
    canvas.width  = new_texture.width;
    canvas.height = new_texture.height;

    new_texture.canvas_context = canvas.getContext("2d");

    new_texture.w_target = _gl.TEXTURE_2D;
    new_texture.w_texture = _gl.createTexture();

    _gl.bindTexture(_gl.TEXTURE_2D, new_texture.w_texture);

    if (new_texture.enable_canvas_mipmapping)
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, LEVELS[cfg_def.texture_min_filter]);
    else
        _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
    _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);

    _gl.bindTexture(_gl.TEXTURE_2D, null);

    // update_texture_canvas will be called later

    return new_texture;
}

exports.share_batch_canvas_textures = function(batches) {

    var canvas_textures = {};

    for (var i = 0; i < batches.length; i++) {
        var textures = batches[i].textures;
        var batch_textures = [];
        for (var j = 0; j < textures.length; j++) {
            var texture = textures[j];
            if (texture.source == "CANVAS") {
                if (texture.name in canvas_textures) {
                    texture = canvas_textures[texture.name];
                }  else {
                    texture = copy_canvas_texture(textures[j]);
                    draw_canvas_to_canvas(texture, textures[j]);
                    canvas_textures[texture.name] = texture;
                }
            }
            batch_textures.push(texture);
        }
        batches[i].textures = batch_textures;
    }
}

function draw_canvas_to_canvas(new_tex, old_tex) {

    var old_ctx = old_tex.canvas_context;
    var new_ctx = new_tex.canvas_context;
    new_ctx.drawImage(old_ctx.canvas, 0, 0);
    update_texture_canvas(new_tex);

}

exports.create_color_ramp_texture = function(nodes, points_num) {

    var texture = [];

    for (var j = 0; j < nodes.length; j++) {
        var bpy_node = nodes[j].data.value;
        calc_color_ramp_data(bpy_node["color_ramp"], points_num, texture);
    }

        return new Uint8Array(texture.map(function(val) {return m_util.clamp(val * 255,
            0, 255)}));
}

exports.calc_color_ramp_data = calc_color_ramp_data;
function calc_color_ramp_data(color_ramp, points_num, texture) {
    var elements = color_ramp["elements"];
    var type = color_ramp["interpolation"];
    for (var i = 0; i < points_num; i++) {

        var curr_position = i / (points_num - 1);

        var left_elem = find_left_elem(elements, curr_position, true);
        var right_elem = find_right_elem(elements, curr_position, true);

        if (left_elem && right_elem)
            if (type == "CONSTANT")
                texture.push.apply(texture, left_elem.color);
            else
                create_linear_middle(texture, left_elem, right_elem, curr_position);

        if (right_elem && !left_elem)
            texture.push.apply(texture, right_elem.color);

        if (left_elem && !right_elem)
            texture.push.apply(texture, left_elem.color);
    }
}

function create_linear_middle(texture, left_elem, right_elem, curr_position) {
    if (left_elem == right_elem)
        texture.push.apply(texture, left_elem["color"]);
    else {
        var r = m_curve.linear_interpolation(right_elem["color"][0], right_elem["position"],
                left_elem["color"][0], left_elem["position"], curr_position);
        texture.push(r);
        var g = m_curve.linear_interpolation(right_elem["color"][1], right_elem["position"],
                left_elem["color"][1], left_elem["position"], curr_position);
        texture.push(g);
        var b = m_curve.linear_interpolation(right_elem["color"][2], right_elem["position"],
                left_elem["color"][2], left_elem["position"], curr_position);
        texture.push(b);
        var a = m_curve.linear_interpolation(right_elem["color"][3], right_elem["position"],
                left_elem["color"][3], left_elem["position"], curr_position);
        texture.push(a);
    }
}

function find_left_elem(elements, curr_pos, is_color_ramp) {
    var left_elem = null;
    for (var i = 0; i < elements.length; i++) {
        if (is_color_ramp)
            var dist = curr_pos - elements[i]["position"];
        else
            var dist = curr_pos - elements[i][1][0];
        if (dist >= 0)
            if (left_elem) {
                if (is_color_ramp)
                    var cur_dist = curr_pos - left_elem["position"];
                else
                    var cur_dist = curr_pos - elements[i][1][0];
                if (dist <= cur_dist)
                    left_elem = elements[i];
            } else
                left_elem = elements[i];
    }
    return left_elem;
}

function find_right_elem(elements, curr_pos, is_color_ramp) {
    var right_elem = null;
    for (var i = 0; i < elements.length; i++) {
        if (is_color_ramp)
            var dist = elements[i]["position"] - curr_pos;
        else
            var dist = elements[i][1][0] - curr_pos;
        if (dist >= 0)
            if (right_elem) {
                if (is_color_ramp)
                    var cur_dist = right_elem["position"] - curr_pos;
                else
                    var cur_dist = right_elem[1][0] - curr_pos;
                if (dist <= cur_dist)
                    right_elem = elements[i];
            } else
                right_elem = elements[i];
    }
    return right_elem;
}

exports.create_vec_curve_texture = function(nodes, points_num) {

    var _vec3_tmp = new Float32Array(3);
    var vec = new Float32Array(3);

    var textures = [];

    for (var q = 0; q < nodes.length; q++) {

        var bpy_node = nodes[q].data.value;
        var channels = [];
        var curves = bpy_node["curve_mapping"]["curves_data"];
        var points_ext_types = bpy_node["curve_mapping"]["curve_extend"];
        var curves_handle_types = bpy_node["curve_mapping"]["curves_handle_types"];

        for (var i = 0; i < curves.length; i++) {
            var type = points_ext_types[i];
            var curve = curves[i];
            var bezts = [];
            var curve_handle_types = curves_handle_types[i];
            for (var j = 0; j < curve.length; j++)
                bezts.push([
                    new Float32Array(3),
                    new Float32Array(curve[j].concat(0)),
                    new Float32Array(3)
                    ]);

            m_curve.calchandle_curvemap(bezts[0], null, bezts[1], curve_handle_types[0],
                    curve_handle_types[0]);
            for (var j = 1; j < bezts.length - 1; j++)
                m_curve.calchandle_curvemap(bezts[j], bezts[j - 1], bezts[j + 1], curve_handle_types[j],
                        curve_handle_types[j]);
            m_curve.calchandle_curvemap(bezts[bezts.length - 1], bezts[bezts.length - 2], null,
                    curve_handle_types[bezts.length - 1], curve_handle_types[bezts.length - 1]);

            if (bezts.length > 2) {
                if (curve_handle_types[0] == "AUTO") {
                    m_vec3.subtract(bezts[0][2], bezts[0][1], _vec3_tmp);
                    var hlen = m_vec3.length(_vec3_tmp);

                    m_vec3.copy(bezts[1][0], vec);
                    if (vec[0] < bezts[0][1][0])
                        vec[0] = bezts[0][1][0];
                    m_vec3.subtract(vec, bezts[0][1], vec);
                    var nlen = m_vec3.length(vec);
                    if (nlen > FLT_EPSILON) {
                        m_vec3.scale(vec, hlen / nlen, vec);
                        m_vec3.add(bezts[0][1], vec, bezts[0][2]);
                        m_vec3.subtract(bezts[0][1], vec, bezts[0][0]);
                    }
                }

                var a = bezts.length - 1;
                if (curve_handle_types[0] == "AUTO") {
                    m_vec3.subtract(bezts[a][0], bezts[a][1], _vec3_tmp);
                    var hlen = m_vec3.length(_vec3_tmp);

                    m_vec3.copy(bezts[a - 1][2], vec);
                    if (vec[0] > bezts[a][1][0])
                        vec[0] = bezts[a][1][0];

                    m_vec3.subtract(vec, bezts[a][1], vec);
                    var nlen = m_vec3.length(vec);

                    if (nlen > FLT_EPSILON) {
                        m_vec3.scale(vec, hlen / nlen, vec);
                        m_vec3.add(bezts[a][1], vec, bezts[a][0]);
                        m_vec3.subtract(bezts[a][1], vec, bezts[a][2]);
                    }
                }
            }

            for (var a = 0; a < bezts.length - 1; a++)
                m_curve.correct_bezpart(bezts[a][1], bezts[a][2], bezts[a + 1][0], bezts[a + 1][1]);

            var texture = [];
            if (curves.length <= 3) {
                var start = Math.round(- points_num/ 2);
                var end = Math.round(points_num / 2);
            } else {
                var start = 0;
                var end = points_num;
            }
            for (var j = start; j < end; j++) {

                var curr_position = j / (end - 1);

                var left_elem = find_left_elem(bezts, curr_position, false);
                var right_elem = find_right_elem(bezts, curr_position, false);

                if (left_elem && right_elem)
                    texture.push(m_curve.bezier(curr_position, left_elem[1], left_elem[2],
                            right_elem[0], right_elem[1], BEZIER_ROOT_PRECISION));
                else if (right_elem && !left_elem)
                        if (type == "EXTRAPOLATED") {
                            var val = right_elem[1][0] == right_elem[2][0] ? right_elem[1][1]
                                    : m_curve.linear(curr_position, right_elem[1], right_elem[2]);
                            texture.push(val);
                        } else
                            texture.push(right_elem[1][1]);
                    else if (left_elem && !right_elem)
                        if (type == "EXTRAPOLATED") {
                            var val = left_elem[0][0] == left_elem[1][0] ? left_elem[1][1]
                                    : m_curve.linear(curr_position, left_elem[0], left_elem[1]);
                            texture.push(val);
                        } else
                            texture.push(left_elem[1][1]);
            }
            channels.push(texture);
        }
        textures.push(channels);
    }

    var tex = [];
    for (var j = 0; j < textures.length; j++) {
        var channels = textures[j];
        for (var i = 0; i < channels[0].length; i++) {
            if (channels.length <= 3) {
                var r = m_util.clamp((channels[0][i] + 1) * 127.5, 0, 255);
                var g = m_util.clamp((channels[1][i] + 1) * 127.5, 0, 255);
                var b = m_util.clamp((channels[2][i] + 1) * 127.5, 0, 255);
                var a = 255;
            } else {
                var r = m_util.clamp(channels[0][i] * 255, 0, 255);
                var g = m_util.clamp(channels[1][i] * 255, 0, 255);
                var b = m_util.clamp(channels[2][i] * 255, 0, 255);
                var a = m_util.clamp(channels[3][i] * 255, 0, 255);
            }
            tex.push(r, g, b, a);
        }
    }
    return new Uint8Array(tex);
}

exports.change_image = function(object, texture_name, image) {
    var texture = get_texture_by_name(object, texture_name);

    if (texture) {
        if (object.type != "WORLD") {
            var texture_new = clone_texture(texture);
            clone_w_texture(texture, texture_new);
            set_texture_by_name(object, texture_name, texture_new);
            update_texture(texture_new, image, false, image.src, 0);
        } else {
            var texture_new = texture;
            update_texture(texture_new, image, false, image.src, 0);
            m_scs.update_sky_texture(object);
        }
        return true;
    } else
        return false;
}

exports.get_batch_texture = get_batch_texture;
/**
 * Extract b4w texture from slot and apply color
 * @param texture_slot Texture slot
 * @param {vec4} [color=null] Default texture color
 */
function get_batch_texture(texture_slot, color) {

    var bpy_texture = texture_slot["texture"];

    var render = bpy_texture._render;
    var image = bpy_texture["image"];

    if (render && color && image)
        update_texture(render, color, image._is_compressed,
            image["filepath"]);

    return render;
}

exports.generate_batch_texure =function (image_data, size) {
    var texture = generate_texture("NODE_TEX", null);
    var texture_slot = { "texture": texture };
    var tex_data = {
        width: size,
        height: image_data.length / (size * 4),
        data: image_data
    };

    return get_batch_texture(texture_slot, tex_data);
}

exports.reset_mod = function() {
    _gl = null;
}

}
