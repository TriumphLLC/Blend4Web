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

var VECTORS_RESERVED = 50;
var MIN_VERTEX_UNIFORMS_SUPPORTED = 128;
var MIN_VARYINGS_REQUIRED = 10;

exports.set_hardware_defaults = function(gl) {
    var cfg_anim = m_cfg.animation;
    var cfg_def = m_cfg.defaults;
    var cfg_ctx = m_cfg.context;
    var cfg_scs = m_cfg.scenes;

    cfg_def.max_texture_size = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    var depth_tex_available = Boolean(m_ext.get_depth_texture());

    // HACK: fix depth issue in Firefox 28
    if (check_user_agent("Firefox/28.0") &&
            (check_user_agent("Linux") || check_user_agent("Macintosh"))) {
        m_print.warn("Firefox 28 detected, applying depth hack");
        depth_tex_available = false;
    }

    if (check_user_agent("iPad") || check_user_agent("iPhone")) {
        m_print.warn("iOS detected, applying alpha hack, applying vertex "
                + "animation mix normals hack and disable smaa. Disable ssao " +
                "for performance.");
        if (!cfg_ctx.alpha)
            cfg_def.background_color[3] = 1.0;
        cfg_def.vert_anim_mix_normals_hack = true;
        cfg_def.smaa = false;
        cfg_def.ssao = false;
    }

    if (detect_mobile()) {
        m_print.warn("Mobile detected, applying glsl loops unroll hack");
        cfg_def.glsl_unroll_hack = true;
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
            m_print.warn("OS X / Intel HD 3000 detected, applying depth and glsl loops unroll hacks");
            depth_tex_available = false;
            cfg_def.glsl_unroll_hack = true;
        }
        if (gl.getParameter(rinfo.UNMASKED_VENDOR_WEBGL).indexOf("ARM") > -1
                && gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL).indexOf("Mali-400") > -1) {
            depth_tex_available = false;
            cfg_anim.frames_blending_hack = true;
        }
        if (gl.getParameter(rinfo.UNMASKED_VENDOR_WEBGL).indexOf("ARM") > -1
                && gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL).indexOf("Mali-T604") > -1) {
            m_print.warn("ARM Mali-T604 detected, set \"highp\" precision and disable shadows.");
            cfg_def.precision = "highp";
            cfg_def.shadows = "NONE";
        }
        if (gl.getParameter(rinfo.UNMASKED_VENDOR_WEBGL).indexOf("Qualcomm") > -1
               && gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL).indexOf("Adreno") > -1)
            cfg_def.shader_constants_hack = true;
    }

    if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) == 0)
        cfg_def.allow_vertex_textures = false;

    if (!depth_tex_available) {
        cfg_def.deferred_rendering = false;

        cfg_def.foam =            false;
        cfg_def.parallax =        false;
        cfg_def.dynamic_grass =   false;
        cfg_def.procedural_fog =  false;
        cfg_def.water_dynamic =   false;
        cfg_def.shore_smoothing = false;
        cfg_def.shore_distance =  false;

        cfg_def.smaa =            false;
    }

    cfg_def.use_dds = Boolean(m_ext.get_s3tc());

    var max_vert_uniforms = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
    var num_supported = m_util.clamp(max_vert_uniforms,
            MIN_VERTEX_UNIFORMS_SUPPORTED, Infinity);

    // NOTE: need proper uniform counting (lights, wind bending, etc)
    cfg_def.max_bones =
            m_util.trunc((num_supported - VECTORS_RESERVED) / 4);
    cfg_def.max_bones_no_blending =
            m_util.trunc((num_supported - VECTORS_RESERVED) / 2);

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

function detect_mobile() {
    return navigator.userAgent.match(/Android/i)
        || navigator.userAgent.match(/webOS/i)
        || navigator.userAgent.match(/iPhone/i)
        || navigator.userAgent.match(/iPad/i)
        || navigator.userAgent.match(/iPod/i)
        || navigator.userAgent.match(/BlackBerry/i)
        || navigator.userAgent.match(/Windows Phone/i);
}

/**
 * Detect Internet Explorer 11
 * @see http://stackoverflow.com/questions/21825157/internet-explorer-11-detection
 */
function is_ie11() {
    return !(window.ActiveXObject) && "ActiveXObject" in window;
}

}
