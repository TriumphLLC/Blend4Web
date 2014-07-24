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
var WIN_POLY_OFFSET_MULT = 2.5;
var MIN_VERTEX_UNIFORMS_SUPPORTED = 128;

exports.set_hardware_defaults = function(gl) {
    var cfg_anim = m_cfg.animation;
    var cfg_def = m_cfg.defaults;

    var depth_tex_available = Boolean(m_ext.get_depth_texture());

    // HACK: fix depth issue in Firefox 28
    if (check_user_agent("Firefox/28.0") && 
            (check_user_agent("Linux") || check_user_agent("Macintosh"))) {
        m_print.warn("Firefox 28 detected, applying depth hack");
        depth_tex_available = false;
    }

    if (check_user_agent("iPad") || check_user_agent("iPhone")) {
        m_print.warn("iOS detected, applying depth hack");
        depth_tex_available = false;
        cfg_def.antialiasing = false;
    }

    if (detect_mobile()) {
        m_print.warn("Mobile detected, applying glsl loops unroll hack");
        cfg_def.glsl_unroll_hack = true;
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
            cfg_def.precision = "highp";
        }
        //if (gl.getParameter(rinfo.UNMASKED_VENDOR_WEBGL).indexOf("Qualcomm") > -1
        //        && gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL).indexOf("Adreno") > -1
        //        && gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL).indexOf("330") > -1) {
        //}
    }

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

    // NOTE: set polygonOffset to reduce shadow artifacts
    if (check_user_agent("Windows"))
        cfg_def.poly_offset_multiplier = WIN_POLY_OFFSET_MULT;
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

}
