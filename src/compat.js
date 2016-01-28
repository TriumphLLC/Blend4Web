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
 * Compatibility internal API.
 * @name compat
 * @namespace
 * @exports exports as compat
 */
b4w.module["__compat"] = function(exports, require) {

var m_cfg   = require("__config");
var m_ext   = require("__extensions");
var m_print = require("__print");
var m_util  = require("__util");

var MIN_VARYINGS_REQUIRED = 10;
var MIN_FRAGMENT_UNIFORMS_SUPPORTED = 128;
var AMD_MESA_RENDER_NAMES = ["R600", "RV610", "RV630", "RV620", "RV635", "RV670",
        "RS780", "RS880", "RV770", "RV730", "RV710", "RV740", "CEDAR", "REDWOOD",
        "JUNIPER", "CYPRESS", "PALM (Wrestler/Ontario)", "SUMO (Llano)",
        "SUMO2 (Llano)", "ARUBA (Trinity/Richland)", "BARTS", "TURKS", "CAICOS",
        "CAYMAN"];

var cfg_anim = m_cfg.animation;
var cfg_def = m_cfg.defaults;
var cfg_ctx = m_cfg.context;
var cfg_scs = m_cfg.scenes;
var cfg_sfx = m_cfg.sfx;
var cfg_phy = m_cfg.physics;

exports.detect_tegra_invalid_enum_issue = function(gl) {
    // this hardware don't like context.antialias = true
    // get and ignore such error
    if (gl.getError() == gl.INVALID_ENUM)
        m_print.warn("Possible Tegra invalid enum issue detected, ignoring");
}

exports.set_hardware_defaults = function(gl) {
    cfg_def.max_vertex_uniform_vectors = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);

    cfg_def.max_texture_size = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    cfg_def.max_cube_map_size = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);

    if (!cfg_def.webgl2)
        cfg_def.msaa_samples = 1;
    else
        cfg_def.msaa_samples = Math.min(cfg_def.msaa_samples,
                gl.getParameter(gl.MAX_SAMPLES));

    var depth_tex_available = Boolean(m_ext.get_depth_texture());
    // HACK: fix depth issue in Firefox 28
    if (check_user_agent("Firefox/28.0") &&
            (check_user_agent("Linux") || check_user_agent("Macintosh"))) {
        m_print.warn("Firefox 28 detected, applying depth hack");
        depth_tex_available = false;
    }

    if (!check_user_agent("Windows Phone"))
        if (check_user_agent("iPad") || check_user_agent("iPhone")) {
            m_print.warn("iOS detected, applying alpha hack, applying vertex "
                    + "animation mix normals hack, applying ios depth hack and "
                    + "disable smaa. Disable ssao for performance. Disable video "
                    + "textures. Initialize WebAudio context with empty sound.");
            if (!cfg_ctx.alpha)
                cfg_def.background_color[3] = 1.0;
            cfg_def.vert_anim_mix_normals_hack = true;
            cfg_def.smaa = false;
            cfg_def.ssao = false;
            cfg_def.precision = "highp";
            cfg_def.init_wa_context_hack = true;
            cfg_def.ios_depth_hack = true;
            cfg_scs.cubemap_tex_size = 256;

        } else if (check_user_agent("Mac OS X") && check_user_agent("Safari")
                && !check_user_agent("Chrome")) {
            m_print.warn("OS X / Safari detected, force to wait complete loading. " +
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
        m_print.warn("Windows/Chrome40 or Firefox33-36 detected. Applying clear procedural skydome hack.");
        cfg_def.clear_procedural_sky_hack = true;
    }

    if (check_user_agent("Mac OS X")) {
        cfg_def.mac_os_shadow_hack = true;
        m_print.warn("OS X detected, applying shadows hack.");
    }

    if (detect_mobile()) {
        m_print.warn("Mobile detected, applying various hacks for video textures.");
        cfg_def.is_mobile_device = true;
        if (!(check_user_agent("iPad") || check_user_agent("iPhone"))
                    && !check_user_agent("Windows Phone")) {
            m_print.warn("Mobile (not iOS) detected, disable playback rate for video textures.");
            cfg_sfx.disable_playback_rate_hack = true;
        }
    }

    if ((check_user_agent("Firefox/35.0") || check_user_agent("Firefox/36.0")) &&
            check_user_agent("Windows")) {
        m_print.warn("Windows/Firefox 35/36 detected, applying shadows slink hack");
        cfg_def.firefox_shadows_slink_hack = true;
    }

    if (check_user_agent("iPhone") || is_ie11() || check_user_agent("Edge")) {
        m_print.warn("iPhone, IE11 or Edge detected. Enable sequential video fallback for video textures.");
        cfg_def.seq_video_fallback = true;
    }

    if (gl.getParameter(gl.MAX_VARYING_VECTORS) < MIN_VARYINGS_REQUIRED) {
        m_print.warn("Not enough varyings, disable shadows on blend objects");
        cfg_def.disable_blend_shadows_hack = true;
    }

    if (check_user_agent("Windows Phone")) {
        m_print.warn("Windows Phone detected. Disable wireframe mode, "
                    + "glow materials, ssao, smaa, shadows, reflections, refractions.");
        cfg_def.wireframe_debug = false;
        cfg_def.precision = "highp";
        cfg_def.glow_materials = false;
        cfg_def.ssao = false;
        cfg_def.smaa = false;
        cfg_def.shadows = false;
        cfg_def.reflections = false;
        cfg_def.refractions = false;
        cfg_def.quality_aa_method = false;
    }
    if (check_user_agent("Firefox") && cfg_def.is_mobile_device) {
        m_print.warn("Mobile Firefox detected, applying depth hack, disable workers.");
        cfg_phy.use_workers = false;
        depth_tex_available = false;
    }

    if (check_user_agent("Firefox") && cfg_def.stereo == "HMD") {
        m_print.warn("Firefox detected, using custom distortion correction.");
        cfg_def.use_browser_distortion_cor = false;
    }
    // NOTE: check compatibility for particular device
    var rinfo = m_ext.get_renderer_info();
    if (rinfo) {
        var vendor = gl.getParameter(rinfo.UNMASKED_VENDOR_WEBGL);
        var renderer = gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL);
        var mali_4x_re = /\b4\d{2}\b/;

        if (check_user_agent("Macintosh") && renderer.indexOf("Intel HD Graphics 3000") > -1) {
            m_print.warn("OS X / Intel HD 3000 detected, applying depth hack");
            depth_tex_available = false;
        }

        if (vendor.indexOf("ARM") > -1 && mali_4x_re.test(renderer)) {
            m_print.warn("ARM Mali-400 series detected, applying depth and frames blending hacks");
            depth_tex_available = false;
            cfg_anim.frames_blending_hack = true;
        }
        if (vendor.indexOf("ARM") > -1 && renderer.indexOf("Mali-T604") > -1) {
            m_print.warn("ARM Mali-T604 detected, set \"highp\" precision and disable shadows.");
            cfg_def.precision = "highp";
            cfg_def.shadows = false;
        }
        if (vendor.indexOf("ARM") > -1 && renderer.indexOf("Mali-T760") > -1) {
            m_print.warn("ARM Mali-T760 detected, set \"highp\" precision and disable SSAO. "
                    + "Applying clear depth hack.");
            cfg_def.clear_depth_hack = true;
            cfg_def.precision = "highp";
            cfg_def.ssao = false;
            cfg_def.amd_skinning_hack = true;
        }
        if (vendor.indexOf("Qualcomm") > -1 && renderer.indexOf("Adreno") > -1) {
            m_print.warn("Qualcomm Adreno detected, applying shader constants hack.");
            cfg_def.shader_constants_hack = true;
            if (renderer.indexOf("305") > -1) {
                m_print.warn("Qualcomm Adreno305 detected, set \"highp\" precision.");
                cfg_def.precision = "highp";
            }
            if (renderer.indexOf("330") > -1) {
                m_print.warn("Qualcomm Adreno330 detected, set \"highp\" precision.");
                cfg_def.precision = "highp";
            }
            if (renderer.indexOf("420") > -1) {
                m_print.warn("Qualcomm Adreno420 detected, setting max cubemap size to 4096, "
                        + "setting max texture size to 4096.");
                cfg_def.max_texture_size = 4096;
                cfg_def.max_cube_map_size = 4096;
            }
        }
        if (vendor.indexOf("NVIDIA") > -1 && renderer.indexOf("Tegra 3") > -1) {
            m_print.warn("NVIDIA Tegra 3 detected, force low quality for "
                                              + "B4W_LEVELS_OF_QUALITY nodes.");
            cfg_def.force_low_quality_nodes = true;
        }
        if (check_user_agent("Windows") && check_user_agent("Chrome") && !check_user_agent("Edge") &&
                (renderer.match(/NVIDIA GeForce 8..0/) || renderer.match(/NVIDIA GeForce 9..0/)
                || renderer.match(/NVIDIA GeForce( (G|GT|GTS|GTX))? 2../))) {
            m_print.warn("Chrome / Windows / NVIDIA GeForce 8/9/200 series detected, " +
                         "setting max cubemap size to 256, use canvas for resizing.");
            cfg_def.max_cube_map_size = 256;
            cfg_def.resize_cubemap_canvas_hack = true;
        }

        var architecture = "";
        for (var i = 0; i < AMD_MESA_RENDER_NAMES.length; i++)
            if (renderer.indexOf(AMD_MESA_RENDER_NAMES[i]) > -1) {
                architecture = AMD_MESA_RENDER_NAMES[i];
                break;
            }

        if (architecture) {
            m_print.warn("Architecture " + architecture + " detected. Blending between frames" +
                    " and shadows on blend objects will be disabled. Applying clear depth hack.");
            cfg_def.clear_depth_hack = true;
            cfg_def.amd_skinning_hack = true;
            cfg_def.disable_blend_shadows_hack = true;
        }

        if (check_user_agent("Linux") && vendor.indexOf("nouveau") > -1) {
            m_print.warn("Nouveau driver detected. Applying clear depth hack");
            cfg_def.clear_depth_hack = true;
        }

        if (check_user_agent("Windows") && check_user_agent("Chrome") 
                && (renderer.match(/GeForce (GT|GTX) 5.(0|5)/) 
                || renderer.match(/GeForce (GT|GTX) 6.(0|5)/))) {
            m_print.warn("Windows / Chrome / NVIDIA GeForce 500/600 series detected, " 
                    + "applying clear depth hack");
            cfg_def.clear_depth_hack = true;
        }
    }

    if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) == 0) {
        m_print.warn("Vertex textures are not allowed. Disabling vertex textures");
        cfg_def.allow_vertex_textures = false;
    }

    if (!depth_tex_available) {
        cfg_def.foam =            false;
        cfg_def.parallax =        false;
        cfg_def.dynamic_grass =   false;
        cfg_def.water_dynamic =   false;
        cfg_def.shore_smoothing = false;
        cfg_def.shore_distance =  false;
        cfg_def.smaa =            false;
    }

    cfg_def.use_dds = Boolean(m_ext.get_s3tc());
    cfg_def.depth_tex_available = depth_tex_available;

    // webglreport.com
    var high = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    var medium = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,
            gl.MEDIUM_FLOAT);
    if (high.precision === 0)
        cfg_def.precision = "mediump";

    // IE11 compatibility hack: power of two cubemap texture
    if (is_ie11()) {
        m_print.warn("IE11 detected. Set sky cubemap texture size to 512 (power of two).");
        cfg_scs.cubemap_tex_size = 512;
    }

    if (is_ie11() && check_user_agent("Touch") || check_user_agent("Edge")) {
        m_print.warn("IE11 and touchscreen or Edge detected. Behaviour of the mouse move sensor will be changed.");
        cfg_def.ie11_edge_touchscreen_hack = true;
    }

    if (gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) <= MIN_FRAGMENT_UNIFORMS_SUPPORTED) {
        m_print.warn("Not enough fragment uniforms, force low quality for "
                    + "B4W_LEVELS_OF_QUALITY nodes.");
        cfg_def.force_low_quality_nodes = true;
    }

    if (check_user_agent("Chrome") && !check_user_agent("Edge")) {
        m_print.log("Chrome detected. Some of deprecated functions related to the Doppler effect won't be called.");
        cfg_def.cors_chrome_hack = true;
    }

    if ((check_user_agent("Chrome") && !check_user_agent("Edge")) ||
            check_user_agent("Firefox")) {
        cfg_def.disable_doppler_hack = true;
    }

    if (is_ie11() || check_user_agent("iPad")) {
        m_print.warn("iPad or Internet Explorer detected. Applying alpha clip hack.");
        cfg_def.alpha_clip_filtering_hack = true;
    }

    if (detect_mobile() && check_user_agent("Firefox")) {
        m_print.log("Mobile firefox detected. Applying autoplay media hack.");
        cfg_def.mobile_firefox_media_hack = true;
    }

    if (check_user_agent("Edge")) {
        m_print.warn("Microsoft Edge detected, set up new minimal texture size.");
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
