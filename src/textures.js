"use strict";

/**
 * Textures internal API.
 * Don't forget to register GL context by setup_context() function.
 * @name textures
 * @namespace
 * @exports exports as textures
 */
b4w.module["__textures"] = function(exports, require) {

var config     = require("__config");
var m_print    = require("__print");
var m_dds      = require("__dds");
var extensions = require("__extensions");
var util       = require("__util");

var cfg_def = config.defaults;
var cfg_ani = config.animation;
var cfg_sfx = config.sfx;


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
exports.TT_RGBA_INT = 10;
exports.TT_RGB_INT = 20;
exports.TT_RGBA_FLOAT = 30;
exports.TT_RGB_FLOAT = 40;
exports.TT_DEPTH = 50;
exports.TT_RENDERBUFFER = 60;

var _canvas_textures_cache = {};
var _video_textures_cache = {};

var CHANNEL_SIZE_BYTES_INT = 4;
var CHANNEL_SIZE_BYTES_FLOAT = 16;
var CHANNEL_SIZE_BYTES_DEPTH = 3;
var CHANNEL_SIZE_BYTES_RENDERBUFFER = 2;

var PLAYBACK_RATE = 2;

var _gl = null;

// texture quality
var LEVELS;

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

exports.get_canvas_context = function(id) {
    if (id in _canvas_textures_cache)
        return _canvas_textures_cache[id].canvas_context;
    else
        return null;
}

exports.update_canvas_context = function(id) {
    if (id in _canvas_textures_cache) {
        update_texture_canvas(_canvas_textures_cache[id]);
        return true;
    } else
        return false;
}

function init_texture() {
    return {
        name: "",
        type: 0,
        source: "",
        width: 0,
        height: 0,
        compress_ratio: 1,
        allow_node_dds: true,

        source_size: 1024,
        enable_canvas_mipmapping: false,
        canvas_context: null,

        video_file: null,
        seq_video: null,
        seq_fps: 1,
        seq_cur_frame: 0,
        seq_video_played: false,
        video_was_stopped: false,
        is_movie: false,
        frame_start: 0,
        frame_offset: 0,
        frame_duration: 0,
        use_auto_refresh: false,
        use_cyclic : false,
        movie_length: 0,
        fps: 0,

        w_target: 0,
        w_texture: null,
        w_renderbuffer: null
    };
}

/**
 * Create empty b4w texture.
 * same format as bpy_texture._render
 * @param {String} name Texture name
 * @param type Texture type
 */
exports.create_texture = function(name, type) {

    var texture = init_texture();
    texture.name = name;
    texture.type = type;
    texture.source = "NONE";

    if (type == exports.TT_RENDERBUFFER) {
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

    if (texture.type == exports.TT_RENDERBUFFER)
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
    if (texture.type == exports.TT_RENDERBUFFER) {
        return {
            min: exports.TF_NEAREST,
            mag: exports.TF_NEAREST
        }
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
    var width = Math.max(width, 1);
    var height = Math.max(height, 1);

    if (texture.width == width && texture.height == height)
        return;

    if (texture.type == exports.TT_RENDERBUFFER) {
        _gl.bindRenderbuffer(_gl.RENDERBUFFER, texture.w_renderbuffer);
        _gl.renderbufferStorage(_gl.RENDERBUFFER, _gl.DEPTH_COMPONENT16,
                width, height);
        _gl.bindRenderbuffer(_gl.RENDERBUFFER, null);
    } else {
        var w_tex = texture.w_texture;
        var w_target = texture.w_target;

        _gl.bindTexture(w_target, w_tex);
        var format = get_image2d_format(texture);
        var type = get_image2d_type(texture);
        _gl.texImage2D(w_target, 0, format, width, height, 0, format, type, null);

        _gl.bindTexture(w_target, null);
    }

    if (check_texture_size(width, height)) {
        m_print.error("Slink texture \"" + texture.name + "\" has unsupported size");
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
function create_texture_bpy(bpy_texture, global_af, bpy_scenes) {
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

        if (bpy_texture["image"] && bpy_texture["image"]["source"] == "MOVIE") {
            texture.is_movie = true;
            texture.frame_start = bpy_texture["frame_start"];
            texture.frame_offset = bpy_texture["frame_offset"];
            texture.frame_duration = bpy_texture["frame_duration"];
            texture.use_auto_refresh = bpy_texture["use_auto_refresh"];
            texture.use_cyclic = bpy_texture["use_cyclic"];
            texture.movie_length = bpy_texture["movie_length"];

            if (texture.frame_offset != 0)
                m_print.warn("Frame offset for texture \"" + bpy_texture["name"] +
                        "\" has a nonzero value. Can lead to undefined behaviour" + 
                        " for mobile devices.");
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
            var scene = util.keysearch("name", name, bpy_scenes);

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
            if (cfg_def.intel_cubemap_hack)
                _gl.texImage2D(_gl["TEXTURE_CUBE_MAP_" + targets[i]], 0, _gl.RGB,
                    1, 1, 0, _gl.RGB, _gl.UNSIGNED_BYTE, image_data);
            else
                _gl.texImage2D(_gl["TEXTURE_CUBE_MAP_" + targets[i]], 0, _gl.RGBA,
                    1, 1, 0, _gl.RGBA, _gl.UNSIGNED_BYTE, image_data);
        break;

    case "VORONOI":
    case "BLEND":
        return null;

    default:
        m_print.error("texture \"" + bpy_texture["name"] +
            "\" has unsupported type \"" + tex_type + "\"");
        return null;
    }

    if (tex_type == "NONE" && !(bpy_texture["b4w_enable_canvas_mipmapping"] && 
            bpy_texture["b4w_source_type"] == "CANVAS") || tex_type == "DATA_TEX2D")
        _gl.texParameteri(w_target, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
    else {
        if (cfg_def.intel_cubemap_hack)
            _gl.texParameteri(w_target, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
        else
            _gl.texParameteri(w_target, _gl.TEXTURE_MIN_FILTER, LEVELS[cfg_def.texture_min_filter]);
    }

    _gl.texParameteri(w_target, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);

    setup_anisotropic_filtering(bpy_texture, global_af, w_target);

    var tex_extension = bpy_texture["extension"];
    if (tex_extension == "REPEAT" && !bpy_texture["b4w_shore_dist_map"]) {
        _gl.texParameteri(w_target, _gl.TEXTURE_WRAP_S, _gl.REPEAT);
        _gl.texParameteri(w_target, _gl.TEXTURE_WRAP_T, _gl.REPEAT);
    } else {
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
        texture.name = id;
        texture.source = "CANVAS";
        
        update_canvas_props(id, size, texture);
        _canvas_textures_cache[id] = texture;
        update_texture_canvas(texture);
    } else if (bpy_texture["b4w_source_type"] == "SCENE" && tex_type == "NONE") {
        texture.name = bpy_texture["b4w_source_id"];
        texture.source = "SCENE";
    } else {
        texture.name = bpy_texture["name"];
        texture.source = tex_type;
        _gl.generateMipmap(w_target);
        _gl.bindTexture(w_target, null);
    }

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
        var ext_aniso = extensions.get_aniso();
        if (ext_aniso) {
            af = parseFloat(af.split("x")[0]);
            _gl.texParameterf(w_target, ext_aniso.TEXTURE_MAX_ANISOTROPY_EXT, af);
        }
    }
}

function update_canvas_props(name, size, texture) {
    var canvas = document.createElement("canvas");
    canvas.setAttribute("id", name);
    canvas.width  = size;
    canvas.height = size;
    texture.canvas_context = canvas.getContext("2d");
}

function update_texture_canvas(texture) {

    if (texture.source != "CANVAS")
        throw "Wrong texture";

    var w_texture = texture.w_texture;
    var w_target = texture.w_target;

    _gl.bindTexture(w_target, w_texture);

    var w_format = get_image2d_format(texture);
    var w_type = get_image2d_type(texture);
    var canvas = texture.canvas_context.canvas;
    _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, true);
    _gl.texImage2D(w_target, 0, w_format, w_format, w_type, canvas);
    _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, false);
    if (texture.enable_canvas_mipmapping)
        _gl.generateMipmap(w_target);
    _gl.bindTexture(w_target, null);

    texture.width = canvas.width;
    texture.height = canvas.height;
}

exports.update_video_texture = function(texture) {
    var w_texture = texture.w_texture;
    var w_target = texture.w_target;

    _gl.bindTexture(w_target, w_texture);

    _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, true);
    if (texture.video_file.length != 4)
        _gl.texImage2D(w_target, 0, _gl.RGBA, _gl.RGBA,
                _gl.UNSIGNED_BYTE, texture.video_file);
    else
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

    _gl.texImage2D(w_target, 0, _gl.RGBA, _gl.RGBA,
            _gl.UNSIGNED_BYTE, texture.seq_video[texture.seq_cur_frame]);

    _gl.bindTexture(w_target, null);
}

/**
 * Load image data into texture object
 * @param texture texture object
 * @param {vec4|HTMLImageElement} image_data Color or image element to load into
 * texture object
 */
exports.update_texture = function(texture, image_data, is_dds, filepath) {
    var tex_type = texture.source;
    var w_texture = texture.w_texture;
    var w_target = texture.w_target;

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
        } else if (is_dds) {
            var dds_wh = m_dds.get_width_height(image_data);
            if(check_texture_size(dds_wh.width, dds_wh.height)) {
                m_print.error("texture has unsupported size", filepath);
                return;
            }
            m_dds.upload_dds_levels(_gl, extensions.get_s3tc(), image_data,
                    true);

            if (is_non_power_of_two(dds_wh.width, dds_wh.height)) {
                if (!texture.auxilary_texture)
                    m_print.warn("using NPOT texture", filepath);
                prepare_npot_texture(w_target);
            }

            texture.width = dds_wh.width;
            texture.height = dds_wh.height;
            texture.compress_ratio = m_dds.get_compress_ratio(image_data);
        } else {
            _gl.pixelStorei(_gl.UNPACK_FLIP_Y_WEBGL, true);
            //_gl.pixelStorei(_gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

            if(check_texture_size(image_data.width, image_data.height)) {
                m_print.error("texture has unsupported size", filepath);
                return;
            }
            if (texture.is_movie) {
                if (!cfg_def.seq_video_fallback) {
                    texture.video_file = image_data;

                    texture.video_file.loop = texture.use_cyclic;
                    if (image_data)
                        _video_textures_cache[texture.name] = texture;
                    texture.fps = cfg_ani.framerate;

                    if (image_data.duration)
                        texture.fps = texture.movie_length / image_data.duration;
                    
                    if (!cfg_sfx.disable_playback_rate_hack) {
                        image_data.playbackRate = cfg_ani.framerate / texture.fps;
                        if (cfg_sfx.clamp_playback_rate_hack && image_data.playbackRate > 
                                    PLAYBACK_RATE)
                            image_data.playbackRate = PLAYBACK_RATE;
                    }
                    _gl.texImage2D(w_target, 0, _gl.RGBA, _gl.RGBA,
                            _gl.UNSIGNED_BYTE, texture.video_file);
                } else {
                    if (image_data) {
                        _video_textures_cache[texture.name] = texture;
                        texture.seq_video = image_data;
                        texture.fps = texture.movie_length / image_data.length;
                        texture.frame_duration = Math.round(texture.frame_duration / texture.fps);
                        texture.frame_offset = Math.round(texture.frame_offset / texture.fps);
                        texture.frame_start = Math.round(texture.frame_start / texture.fps);
                        texture.seq_cur_frame = texture.frame_offset;
                        _gl.texImage2D(w_target, 0, _gl.RGBA, _gl.RGBA,
                                _gl.UNSIGNED_BYTE, texture.seq_video[0]);
                    }
                }
            } else
                _gl.texImage2D(w_target, 0, _gl.RGBA, _gl.RGBA, _gl.UNSIGNED_BYTE, image_data);
            if (cfg_def.seq_video_fallback && texture.is_movie) {
                texture.width = image_data[0].width;
                texture.height = image_data[0].height;
            } else {
                texture.width = image_data.width;
                texture.height = image_data.height;
            }

            if (is_non_power_of_two(image_data.width, image_data.height)) {
                if (!texture.auxilary_texture)
                    if (texture.is_movie)
                        m_print.warn("using NPOT video texture", filepath);
                    else
                        m_print.warn("using NPOT texture", filepath);
                prepare_npot_texture(w_target);
            } else
                if (!texture.is_movie)
                    _gl.generateMipmap(w_target);
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

            var dim = image_data.width / 3;

            if (check_cube_map_size(dim,dim)) {
                m_print.error("cubemap has unsupported size", filepath);
                return;
            }

            for (var i = 0; i < 6; i++) {
                var info = infos[i];

                var tmpcanvas = document.createElement("canvas");
                tmpcanvas.width = dim;
                tmpcanvas.height = dim;
                var ctx = tmpcanvas.getContext("2d");

                // OpenGL ES 2.0 Spec, 3.7.5 Cube Map Texture Selection
                // vertical flip for Y, horizontal flip for X and Z
                if (info[0] == "POSITIVE_Y" || info[0] == "NEGATIVE_Y") {
                    ctx.translate(0, dim);
                    ctx.scale(1, -1);
                } else {
                    ctx.translate(dim, 0);
                    ctx.scale(-1, 1);
                }

                ctx.drawImage(image_data, info[1] * dim, info[2] * dim, dim, dim,
                    0, 0, dim, dim);

                _gl.texImage2D(_gl["TEXTURE_CUBE_MAP_" + info[0]], 0, _gl.RGBA,
                    _gl.RGBA, _gl.UNSIGNED_BYTE, tmpcanvas);
            }

            texture.width = 3 * dim;
            texture.height = 2 * dim;

            if (is_non_power_of_two(image_data.width / 3, image_data.height / 2)) {
                m_print.warn("using NPOT cube map texture", filepath);
                prepare_npot_texture(w_target);
            } else {
                _gl.generateMipmap(w_target);
            }
        }
    } else if (tex_type == "DATA_TEX2D") {
        _gl.texImage2D(w_target, 0, _gl.RGBA, image_data.width, image_data.height, 0,
                       _gl.RGBA, _gl.UNSIGNED_BYTE, image_data.data);
        texture.width = image_data.width;
        texture.height = image_data.height;
    }

    _gl.bindTexture(w_target, null);
}

function prepare_npot_texture(tex_target) {
    _gl.texParameteri(tex_target, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
    _gl.texParameteri(tex_target, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);
    _gl.texParameteri(tex_target, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
    _gl.texParameteri(tex_target, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR);
}

function is_non_power_of_two(width, height) {
    var dims = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384];
    return dims.indexOf(width) == -1 || dims.indexOf(height) == -1;
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
        throw "Wrong texture type";
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
        throw "Wrong texture type";
        break;
    }

    return type;
}

exports.delete_texture = function(texture) {
    _gl.deleteTexture(texture);
}

/**
 * Check if object is a texture
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
exports.is_renderbuffer = function(tex) {
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
 * Get texture channel size
 */
exports.get_texture_channel_size = function(tex) {
    var size = 0;

    switch (tex.type) {
    case exports.TT_RGBA_INT:
    case exports.TT_RGB_INT:
        size = CHANNEL_SIZE_BYTES_INT;
        break;
    case exports.TT_RGBA_FLOAT:
    case exports.TT_RGB_FLOAT:
        size = CHANNEL_SIZE_BYTES_FLOAT;
        break;
    case exports.TT_DEPTH:
        size = CHANNEL_SIZE_BYTES_DEPTH;
        break;
    case exports.TT_RENDERBUFFER:
        size = CHANNEL_SIZE_BYTES_RENDERBUFFER;
        break;
    }

    return size;
}

function check_texture_size(width, height) {
    return (width > cfg_def.max_texture_size || height > cfg_def.max_texture_size);
}

function check_cube_map_size(width, height) {
    return (width > cfg_def.max_cube_map_size || height > cfg_def.max_cube_map_size);
}

exports.generate_texture = function(type, subs) {
    var texture = null;
    switch(type) {
        case "SSAO_TEXTURE":
            texture = {
                "name": "special_ssao_texture",
                "type": "DATA_TEX2D",
                "extension": "REPEAT",
                "b4w_anisotropic_filtering": "OFF"
            };
            create_texture_bpy(texture, null, subs);
            texture["image"] = { "filepath": null };
            break;
        default:
            break;
    }
    return texture;
}

exports.cleanup = function() {
    if (!cfg_def.seq_video_fallback)
        for (var tex in _video_textures_cache) {
            _video_textures_cache[tex].video_file.pause();
            _video_textures_cache[tex].video_file.src = "";
            _video_textures_cache[tex].video_file.load();
        }
    _canvas_textures_cache = {};
    _video_textures_cache = {};
}

exports.play_video = play_video;
function play_video(texture_name) {
    if (texture_name in _video_textures_cache) {
        if (cfg_def.seq_video_fallback)
            _video_textures_cache[texture_name].seq_video_played = true;
        else
            _video_textures_cache[texture_name].video_file.play();
        return true;
    } else
        return null;
}

exports.reset_video = reset_video;
function reset_video(texture_name) {
    if (texture_name in _video_textures_cache) {
        var tex = _video_textures_cache[texture_name]
        if (cfg_def.seq_video_fallback) {
            tex.seq_cur_frame = tex.frame_offset;
            update_seq_video_texture(tex);
            tex.seq_cur_frame++;
        }
        else
            tex.video_file.currentTime = tex.frame_offset / tex.fps;
        return true;
    } else
        return null;
}

exports.pause_video = pause_video;
function pause_video(texture_name) {
    if (texture_name in _video_textures_cache) {
        if (cfg_def.seq_video_fallback)
            _video_textures_cache[texture_name].seq_video_played = false;
        else
            _video_textures_cache[texture_name].video_file.pause();
        return true;
    } else
        return null;
}

exports.pause = function() {
    for (var texture_name in _video_textures_cache) {
        if (cfg_def.seq_video_fallback && !_video_textures_cache[texture_name].seq_video_played ||
                !cfg_def.seq_video_fallback && _video_textures_cache[texture_name].video_file.paused)
            continue;
        pause_video(texture_name);
        _video_textures_cache[texture_name].video_was_stopped = true;
    }
}

exports.reset = function() {
    for (var texture_name in _video_textures_cache) {
        reset_video(texture_name);
        _video_textures_cache[texture_name].video_was_stopped = false;
    } 
}

exports.play = function(resume_stopped_only) {
    for (var texture_name in _video_textures_cache) {
        if (resume_stopped_only && !_video_textures_cache[texture_name].video_was_stopped)
            continue;
        play_video(texture_name)
        _video_textures_cache[texture_name].video_was_stopped = false;
    }
}

}
