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
 * Compatibility internal API.
 * @name compat
 * @namespace
 * @exports exports as compat
 */
b4w.module["__compat"] = function(exports, require) {

var m_cfg   = require("__config");
var m_debug = require("__debug");
var m_ext   = require("__extensions");
var m_print = require("__print");
var m_render= require("__renderer");

var MIN_VARYINGS_REQUIRED = 10;
var AMD_MESA_RENDER_NAMES = ["R600", "RV610", "RV630", "RV620", "RV635", "RV670",
        "RS780", "RS880", "RV770", "RV730", "RV710", "RV740", "CEDAR", "REDWOOD",
        "JUNIPER", "CYPRESS", "PALM (Wrestler/Ontario)", "SUMO (Llano)",
        "SUMO2 (Llano)", "ARUBA (Trinity/Richland)", "BARTS", "TURKS", "CAICOS",
        "CAYMAN"];

exports.NVIDIA_OLD_GPU_CUBEMAP_MAX_SIZE = 256;

var cfg_anim = m_cfg.animation;
var cfg_def = m_cfg.defaults;
var cfg_ctx = m_cfg.context;
var cfg_lim = m_cfg.context_limits;
var cfg_scs = m_cfg.scenes;
var cfg_sfx = m_cfg.sfx;
var cfg_phy = m_cfg.physics;
var cfg_ldr = m_cfg.assets;

exports.detect_tegra_invalid_enum_issue = function(gl) {
    // this hardware don't like context.antialias = true
    // get and ignore such error
    if (gl.getError() == gl.INVALID_ENUM)
        m_print.warn("Possible Tegra invalid enum issue detected, ignoring");
}

exports.set_hardware_defaults = function(gl, print_warnings) {
    var warn = function(msg) {
        if (print_warnings)
            m_print.warn(msg);
    }
    cfg_lim.max_combined_texture_image_units =
            gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
    cfg_lim.max_fragment_uniform_vectors =
            gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);
    cfg_lim.max_texture_image_units =
            gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    cfg_lim.max_varying_vectors =
            gl.getParameter(gl.MAX_VARYING_VECTORS);
    cfg_lim.max_vertex_attribs =
            gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    cfg_lim.max_vertex_texture_image_units =
            gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
    cfg_lim.max_vertex_uniform_vectors =
            gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);

    cfg_lim.max_cube_map_texture_size =
            gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);
    cfg_lim.max_renderbuffer_size =
            gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    cfg_lim.max_texture_size = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    cfg_lim.max_viewport_dims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);

    if (!cfg_def.webgl2)
        cfg_def.msaa_samples = 1;
    else {
        cfg_def.msaa_samples = Math.min(cfg_def.msaa_samples,
                gl.getParameter(gl.MAX_SAMPLES));
        if (check_user_agent("Firefox")) {
            warn("Firefox and WebGL 2 detected, applying framebuffer hack, disabling anchor visibility");
            cfg_def.check_framebuffer_hack = true;
            cfg_def.ff_disable_anchor_vis_hack = true;
        }
    }

    if (check_user_agent("Firefox") && cfg_def.stereo !== "NONE") {
        warn("Firefox and Stereo rendering detected, disable texture reusage");
        cfg_def.firefox_tex_reuse_hack = true;
    }

    // TODO: need to check Firefox MSAA --> "Coin Flip" demo shadows.
    if (cfg_def.webgl2 && m_debug.check_multisample_issue() ||
            check_user_agent("Firefox")) {
        warn("Firefox detected, disabling multisample");
        cfg_def.msaa_samples = 1;
    }

    m_render.set_draw_methods();

    var depth_tex_available = Boolean(m_ext.get_depth_texture());
    // HACK: fix depth issue in Firefox 28
    if (check_user_agent("Firefox/28.0") &&
            (check_user_agent("Linux") || check_user_agent("Macintosh"))) {
        warn("Firefox 28 detected, applying depth hack");
        depth_tex_available = false;
    }

    if (!check_user_agent("Windows Phone"))
        if (check_user_agent("iPad") || check_user_agent("iPhone")) {
            warn("iOS detected, applying alpha hack, applying vertex "
                    + "animation mix normals hack, disable smaa. Disable ssao " 
                    + "for performance. Initialize WebAudio context with empty sound. "
                    + "Applying glow hack.");
            if (!cfg_ctx.alpha)
                cfg_def.background_color[3] = 1.0;
            cfg_def.safari_glow_hack = true;
            cfg_def.vert_anim_mix_normals_hack = true;
            cfg_def.smaa = false;
            cfg_def.ssao = false;
            cfg_def.precision = "highp";
            cfg_def.init_wa_context_hack = true;
            if (Boolean(m_ext.get_pvr()) && cfg_ldr.pvr_available)
                cfg_def.compress_format = "pvr";

        } else if (check_user_agent("Mac OS X") && check_user_agent("Safari")
                && !check_user_agent("Chrome")) {
            warn("OS X / Safari detected, force to wait complete loading. " +
                    "Applying playback rate hack for video textures. " +
                    "Applying canvas alpha hack.");
            cfg_def.safari_canvas_alpha_hack = true;
            cfg_sfx.audio_loading_hack = true;
            cfg_sfx.clamp_playback_rate_hack = true;
        }
    if ((check_user_agent("Windows"))
             &&(check_user_agent("Chrome/40") ||
                check_user_agent("Firefox/33") ||
                check_user_agent("Firefox/34") ||
                check_user_agent("Firefox/35") ||
                check_user_agent("Firefox/36"))) {
        warn("Windows/Chrome40 or Firefox33-36 detected. Applying clear procedural skydome hack.");
        cfg_def.clear_procedural_sky_hack = true;
    }

    if (check_user_agent("Chrome") && !detect_mobile() && m_cfg.is_built_in_data()) {
        warn("Chrome (non-mobile) was detected for a single HTML-exported " 
                + "file. \"Background Music\" speakers were changed to \"Background Sound\".");
        cfg_def.chrome_html_bkg_music_hack = true;
    }

    if (check_user_agent("Mac OS X")) {
        cfg_def.mac_os_shadow_hack = true;
        warn("OS X detected, applying shadows hack.");
    }

    if (detect_mobile()) {
        warn("Mobile detected, applying various hacks for video textures.");
        cfg_def.is_mobile_device = true;
        if (!(check_user_agent("iPad") || check_user_agent("iPhone"))
                    && !check_user_agent("Windows Phone")) {
            warn("Mobile (not iOS) detected, disable playback rate for video textures.");
            cfg_sfx.disable_playback_rate_hack = true;
        }
    }

    if ((check_user_agent("Firefox/35.0") || check_user_agent("Firefox/36.0")) &&
            check_user_agent("Windows")) {
        warn("Windows/Firefox 35/36 detected, applying shadows slink hack");
        cfg_def.shadows_color_slink_hack = true;
    }

    if (check_user_agent("iPhone") || is_ie11() || check_user_agent("Edge")) {
        warn("iPhone, IE11 or Edge detected. Enable sequential video fallback for video textures.");
        cfg_def.seq_video_fallback = true;
    }

    if (cfg_lim.max_varying_vectors < MIN_VARYINGS_REQUIRED) {
        warn("Not enough varyings, disable shadows on blend objects");
        cfg_def.disable_blend_shadows_hack = true;
    }

    if (check_user_agent("Windows Phone")) {
        warn("Windows Phone detected. Disable debug view mode, "
                    + "glow materials, ssao, smaa, shadows, reflections, refractions.");
        cfg_def.debug_view = false;
        cfg_def.precision = "highp";
        cfg_def.glow_materials = false;
        cfg_def.ssao = false;
        cfg_def.smaa = false;
        cfg_def.shadows = false;
        cfg_def.reflections = false;
        cfg_def.refractions = false;
        cfg_def.quality_aa_method = false;
    }

    if (check_user_agent("UCBrowser") ||
            (check_user_agent("Chrome") || check_user_agent("Firefox")) && cfg_def.is_mobile_device) {
        warn("Mobile Firefox, mobile Chrome or UCBrowser detected, disable workers.");
        cfg_phy.use_workers = false;
    }

    // NOTE: check compatibility for particular device
    var rinfo = m_ext.get_renderer_info();
    if (rinfo) {
        var vendor = gl.getParameter(rinfo.UNMASKED_VENDOR_WEBGL);
        var renderer = gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL);
        var mali_4x_re = /\b4\d{2}\b/;

        if (vendor.indexOf("ARM") > -1 && mali_4x_re.test(renderer)) {
            warn("ARM Mali-400 series detected, applying depth and frames blending hacks");
            depth_tex_available = false;
            cfg_anim.frames_blending_hack = true;
        }
        if (vendor.indexOf("ARM") > -1 && renderer.indexOf("Mali-T604") > -1) {
            warn("ARM Mali-T604 detected, set \"highp\" precision and disable shadows.");
            cfg_def.precision = "highp";
            cfg_def.shadows = false;
        }
        if (vendor.indexOf("ARM") > -1 && renderer.indexOf("Mali-T760") > -1) {
            warn("ARM Mali-T760 detected, set \"highp\" precision and disable SSAO.");
            cfg_def.precision = "highp";
            cfg_def.ssao = false;
            cfg_def.skinning_hack = true;
            if (cfg_def.webgl2) {
                cfg_def.msaa_samples = 1;
                warn("ARM Mali-T760 and WebGL 2 detected, switch MSAA samples to 1.");
            }
        }

        if (vendor.indexOf("Qualcomm") > -1 && renderer.indexOf("Adreno") > -1) {
            warn("Qualcomm Adreno detected, applying shader constants hack.");
            cfg_def.shader_constants_hack = true;
            if (renderer.indexOf("305") > -1) {
                warn("Qualcomm Adreno305 detected, set \"highp\" precision.");
                cfg_def.precision = "highp";
            }
            if (renderer.indexOf("330") > -1) {
                warn("Qualcomm Adreno330 detected, set \"highp\" precision.");
                cfg_def.precision = "highp";
            }
            if (renderer.indexOf("420") > -1) {
                warn("Qualcomm Adreno420 detected, setting max cubemap size to 4096, "
                        + "setting max texture size to 4096.");
                cfg_lim.max_texture_size = 4096;
                cfg_lim.max_cube_map_texture_size = 4096;
            }
        }
        if (vendor.indexOf("NVIDIA") > -1 && renderer.indexOf("Tegra 3") > -1) {
            warn("NVIDIA Tegra 3 detected, force low quality for "
                                              + "B4W_LEVELS_OF_QUALITY nodes.");
            cfg_def.force_low_quality_nodes = true;
        }
        if (check_user_agent("Windows") && check_user_agent("Chrome") && !check_user_agent("Edge") &&
                (renderer.match(/NVIDIA GeForce 8..0/) || renderer.match(/NVIDIA GeForce 9..0/)
                || renderer.match(/NVIDIA GeForce( (G|GT|GTS|GTX))? 2../))) {
            warn("Chrome / Windows / NVIDIA GeForce 8/9/200 series detected, " +
                         "setting max cubemap size to 256, use canvas for resizing.");
            cfg_lim.max_cube_map_texture_size = exports.NVIDIA_OLD_GPU_CUBEMAP_MAX_SIZE;
            cfg_def.resize_cubemap_canvas_hack = true;
        }

        if (renderer.indexOf("PowerVR") > -1) {
            warn("PowerVR series detected, use canvas for resizing. " +
                    "Disable shadows. " +
                    "Apply skinning hack, disable skin blending between frames.");
            cfg_def.resize_cubemap_canvas_hack = true;
            cfg_def.skinning_hack = true;
            cfg_def.shadows = false;
            // NOTE: uncomment code below in case of cfg_def.shadows == true;
            // cfg_def.shadows_color_slink_hack = true;
        }

        var architecture = "";
        for (var i = 0; i < AMD_MESA_RENDER_NAMES.length; i++)
            if (renderer.indexOf(AMD_MESA_RENDER_NAMES[i]) > -1) {
                architecture = AMD_MESA_RENDER_NAMES[i];
                break;
            }

        if (architecture) {
            warn("Architecture " + architecture + " detected. Blending between frames" +
                    " and shadows on blend objects will be disabled.");
            cfg_def.skinning_hack = true;
            cfg_def.disable_blend_shadows_hack = true;
        }
    }

    if (cfg_lim.max_vertex_texture_image_units == 0) {
        warn("Vertex textures are not allowed. Disabling vertex textures");
        cfg_def.allow_vertex_textures = false;
    }

    if (!depth_tex_available) {
        cfg_def.foam =            false;
        cfg_def.dynamic_grass =   false;
        cfg_def.water_dynamic =   false;
        cfg_def.shore_smoothing = false;
        cfg_def.shore_distance =  false;
        cfg_def.smaa =            false;
    }

    cfg_def.use_compression = Boolean(m_ext.get_s3tc()) || cfg_def.compress_format == "pvr";
    cfg_def.depth_tex_available = depth_tex_available;

    // webglreport.com
    if (gl.getShaderPrecisionFormat)
        var high = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    if (!gl.getShaderPrecisionFormat || high.precision === 0)
        cfg_def.precision = "mediump";

    // TODO: remove "medium", bcz it's unused.
    // var medium = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,
    //         gl.MEDIUM_FLOAT);

    if (is_ie11() && check_user_agent("Touch") || check_user_agent("Edge")) {
        warn("IE11 and touchscreen or Edge detected. Behaviour of the mouse move sensor will be changed.");
        cfg_def.ie11_edge_touchscreen_hack = true;
    }

    if (is_ie11() || check_user_agent("Edge"))
        cfg_def.ie_edge_anchors_floor_hack = true;

    if (detect_mobile() && check_user_agent("Firefox")) {
        m_print.log("Mobile firefox detected. Applying autoplay media hack."
                + "Setting max cubemap size to 4096, "
                + "setting max texture size to 4096.");
        cfg_def.mobile_firefox_media_hack = true;
        cfg_lim.max_texture_size = 4096;
        cfg_lim.max_cube_map_texture_size = 4096;
    }

    if (check_user_agent("Edge")) {
        warn("Microsoft Edge detected, set up new minimal texture size.");
        cfg_def.edge_min_tex_size_hack = true;
    }
}

exports.check_user_agent = check_user_agent;
/**
 * for user agent hacks
 */
function check_user_agent(str) {
    var user_agent = navigator.userAgent;
    if (user_agent.indexOf(str) > -1)
        return true;
    else
        return false;
}
exports.detect_mobile = detect_mobile;
function detect_mobile() {
    return navigator.userAgent.match(/Android/i)
        || navigator.userAgent.match(/webOS/i)
        || navigator.userAgent.match(/iPhone/i)
        || navigator.userAgent.match(/iPad/i)
        || navigator.userAgent.match(/iPod/i)
        || navigator.userAgent.match(/BlackBerry/i)
        || navigator.userAgent.match(/Windows Phone/i);
}

exports.apply_context_alpha_hack = function() {
    if (check_user_agent("Firefox/35.0") && check_user_agent("Windows")) {
        m_print.warn("Windows/Firefox 35 detected, forcing context's alpha");
        m_cfg.context.alpha = true;
    }
}
/**
 * Detect Internet Explorer 11
 * @see http://stackoverflow.com/questions/21825157/internet-explorer-11-detection
 */
exports.is_ie11 = is_ie11;
function is_ie11() {
    return !(window.ActiveXObject) && "ActiveXObject" in window;
}

}
