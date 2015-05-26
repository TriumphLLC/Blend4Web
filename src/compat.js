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

exports.set_hardware_defaults = function(gl) {
    var cfg_anim = m_cfg.animation;
    var cfg_def = m_cfg.defaults;
    var cfg_ctx = m_cfg.context;
    var cfg_scs = m_cfg.scenes;
    var cfg_sfx = m_cfg.sfx;

    cfg_def.max_vertex_uniform_vectors = gl.MAX_VERTEX_UNIFORM_VECTORS;

    cfg_def.max_texture_size = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    cfg_def.max_cube_map_size = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);

    var depth_tex_available = Boolean(m_ext.get_depth_texture());

    if (check_user_agent("Firefox") && m_cfg.is_built_in_data()) {
        m_print.warn("Firefox detected for single HTML version, disable video textures.");
        cfg_def.firefox_disable_html_video_tex_hack = true;
    }

    // HACK: fix depth issue in Firefox 28
    if (check_user_agent("Firefox/28.0") &&
            (check_user_agent("Linux") || check_user_agent("Macintosh"))) {
        m_print.warn("Firefox 28 detected, applying depth hack");
        depth_tex_available = false;
    }
    if (check_user_agent("iPad") || check_user_agent("iPhone")) {
        m_print.warn("iOS detected, applying alpha hack, applying vertex "
                + "animation mix normals hack and disable smaa. Disable ssao " +
                "for performance. Disable video textures. Initialize WebAudio context " +
                "with empty sound.");
        if (!cfg_ctx.alpha)
            cfg_def.background_color[3] = 1.0;
        cfg_def.vert_anim_mix_normals_hack = true;
        cfg_def.smaa = false;
        cfg_def.ssao = false;
        cfg_def.precision = "highp";
        cfg_def.init_wa_context_hack = true;

    } else if (check_user_agent("Mac OS X") && check_user_agent("Safari")
            && !check_user_agent("Chrome")) {
        m_print.warn("OS X / Safari detected, force to wait complete loading. " +
                "Applying playback rate hack for video textures.");
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

    if (detect_mobile()) {
        m_print.warn("Mobile detected, applying various hacks for video textures.");
        cfg_def.is_mobile_device = true;
        if (!(check_user_agent("iPad") || check_user_agent("iPhone"))) {
            m_print.warn("Mobile (not iOS) detected, disable playback rate for video textures.");
            cfg_sfx.disable_playback_rate_hack = true;
        }
    }

    if ((check_user_agent("Firefox/35.0") || check_user_agent("Firefox/36.0")) &&
            check_user_agent("Windows")) {
        m_print.warn("Windows/Firefox 35/36 detected, applying shadows slink hack");
        cfg_def.firefox_shadows_slink_hack = true;
    }

    if (check_user_agent("iPhone") || is_ie11()) {
        m_print.warn("iPhone or IE11 detected. Enable sequential video fallback for video textures.");
        cfg_def.seq_video_fallback = true;
    }

    if (gl.getParameter(gl.MAX_VARYING_VECTORS) < MIN_VARYINGS_REQUIRED) {
        m_print.warn("Not enough varyings, disable shadows on blend objects");
        cfg_def.disable_blend_shadows_hack = true;
    }

    // NOTE: check compatibility for particular device
    var rinfo = m_ext.get_renderer_info();
    if (rinfo) {
        if (check_user_agent("Macintosh")
                && gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL).indexOf("Intel HD Graphics 3000") > -1) {
            m_print.warn("OS X / Intel HD 3000 detected, applying depth hack");
            depth_tex_available = false;
        }
        if (check_user_agent("Windows") && check_user_agent("Chrome")
                && gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL).indexOf("Intel") > -1) {
            m_print.warn("Chrome / Windows / Intel GPU detected, applying cubemap mipmap/rgb hack");
            cfg_def.intel_cubemap_hack = true;
        }
        if (gl.getParameter(rinfo.UNMASKED_VENDOR_WEBGL).indexOf("ARM") > -1
                && gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL).indexOf("Mali-400") > -1) {
            m_print.warn("ARM Mali-400 detected, applying depth and frames blending hacks");
            depth_tex_available = false;
            cfg_anim.frames_blending_hack = true;
        }
        if (gl.getParameter(rinfo.UNMASKED_VENDOR_WEBGL).indexOf("ARM") > -1
                && gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL).indexOf("Mali-T604") > -1) {
            m_print.warn("ARM Mali-T604 detected, set \"highp\" precision and disable shadows.");
            cfg_def.precision = "highp";
            cfg_def.shadows = "NONE";
        }
        if (gl.getParameter(rinfo.UNMASKED_VENDOR_WEBGL).indexOf("ARM") > -1
                && gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL).indexOf("Mali-T760") > -1) {
            m_print.warn("ARM Mali-T760 detected, set \"highp\" precision and disable SSAO.");
            cfg_def.precision = "highp";
            cfg_def.ssao = false;
        }
        if (gl.getParameter(rinfo.UNMASKED_VENDOR_WEBGL).indexOf("Qualcomm") > -1
               && gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL).indexOf("Adreno") > -1) {
            m_print.warn("Qualcomm Adreno detected, applying shader constants hack.");
            cfg_def.shader_constants_hack = true;
            if (gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL).indexOf("305") > -1) {
                m_print.warn("Qualcomm Adreno305 detected, set \"highp\" precision.");
                cfg_def.precision = "highp";
            }
            if (gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL).indexOf("330") > -1) {
                m_print.warn("Qualcomm Adreno330 detected, set \"highp\" precision.");
                cfg_def.precision = "highp";
            }
        }
        if (gl.getParameter(rinfo.UNMASKED_VENDOR_WEBGL).indexOf("NVIDIA") > -1
               && gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL).indexOf("Tegra 3") > -1) {
            m_print.warn("NVIDIA Tegra 3 detected, force low quality for "
                                              + "B4W_LEVELS_OF_QUALITY nodes.");
            cfg_def.force_low_quality_nodes = true;
        }
    }

    if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) == 0) {
        m_print.warn("Vertex textures are not allowed. Disabling vertex textures");
        cfg_def.allow_vertex_textures = false;
    }

    // no need on HIDPI displays
    if (cfg_def.allow_hidpi && window.devicePixelRatio > 1) {
        m_print.log("%cENABLE HIDPI MODE", "color: #00a");
        cfg_def.resolution_factor = 1;
        cfg_def.smaa = false;
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

    if (is_ie11() && check_user_agent("Touch")) {
        m_print.warn("IE11 and touchscreen detected. Behaviour of the mouse move sensor will be changed.");
        cfg_def.ie11_touchscreen_hack = true;
    }

    if (gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) <= MIN_FRAGMENT_UNIFORMS_SUPPORTED) {
        m_print.warn("Not enough fragment uniforms, force low quality for " 
                    + "B4W_LEVELS_OF_QUALITY nodes.");
        cfg_def.force_low_quality_nodes = true;
    }

    if (check_user_agent("Chrome")) {
        m_print.warn("Chrome detected. Some of deprecated functions related to the Doppler effect won't be called.");
        cfg_def.chrome_disable_doppler_effect_hack = true;
    }
}

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
