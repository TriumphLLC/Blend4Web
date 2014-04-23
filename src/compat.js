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

exports.set_hardware_defaults = function(gl) {
    var cfg_def_save = m_cfg.defaults_save;
    var cfg_def = m_cfg.defaults;

    var depth_tex_available = Boolean(m_ext.get_depth_texture());

    // HACK: fix depth issue in Firefox 28
    if (check_user_agent("Firefox/28.0") && 
            (check_user_agent("Linux") || check_user_agent("Macintosh"))) {
        m_print.warn("Firefox 28 detected, applying depth hack");
        depth_tex_available = false;
    }

    // HACK: fix particles issue in Chrome 34
    if ((check_user_agent("Chrome/34.0") || check_user_agent("Chrome/35.0"))
            && check_user_agent("Windows")) {
        m_print.warn("Chrome 34-35 and Windows detected, disable tangent skining hack");
        cfg_def_save.disable_tangent_skining_hack = true;
        cfg_def.disable_tangent_skining_hack = true;
    }

    cfg_def.deferred_rendering = cfg_def_save.deferred_rendering = 
            (cfg_def_save.deferred_rendering && depth_tex_available);

    cfg_def.foam = cfg_def_save.foam =
            (cfg_def_save.foam && depth_tex_available);
    cfg_def.parallax = cfg_def_save.parallax =
            (cfg_def_save.parallax && depth_tex_available);
    cfg_def.dynamic_grass = cfg_def_save.dynamic_grass = 
            (cfg_def_save.dynamic_grass && depth_tex_available);
    cfg_def.procedural_fog = cfg_def_save.procedural_fog =
            (cfg_def_save.procedural_fog && depth_tex_available);
    cfg_def.water_dynamic = cfg_def_save.water_dynamic = 
            (cfg_def_save.water_dynamic && depth_tex_available);
    cfg_def.shore_smoothing = cfg_def_save.shore_smoothing =
            (cfg_def_save.shore_smoothing && depth_tex_available);
    cfg_def.shore_distance = cfg_def_save.shore_distance = 
            (cfg_def_save.shore_distance && depth_tex_available);

    cfg_def.use_dds = cfg_def_save.use_dds = Boolean(m_ext.get_s3tc());

    var max_vert_uniforms = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
    var num_supported = m_util.clamp(max_vert_uniforms, 251, Infinity);

    // NOTE: need proper uniform counting (lights, wind bending, etc)
    cfg_def.max_bones = cfg_def_save.max_bones 
            = m_util.trunc((num_supported - 50) / 4);
    cfg_def.max_bones_no_blending = cfg_def_save.max_bones_no_blending 
            = m_util.trunc((num_supported - 50) / 2);

    // webglreport.com
    var high = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    var medium = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, 
            gl.MEDIUM_FLOAT);
    if (high.precision === 0)
        cfg_def.precision = cfg_def_save.precision = "mediump";

    // NOTE: check compatibility for particular device
    // var rinfo = m_ext.get_renderer_info();
    // if (rinfo)
    //     if (gl.getParameter(rinfo.UNMASKED_VENDOR_WEBGL).indexOf("Qualcomm") > -1
    //             && gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL).indexOf("Adreno") > -1 
    //             && gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL).indexOf("330") > -1) {
    //     }
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

}
