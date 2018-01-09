/**
 * Copyright (C) 2014-2017 Triumph LLC
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
import register from "../../util/register.js";

import m_assert_fact from "../../util/assert.js";
import m_cfg_fact from "../config.js";
import m_print_fact from "../print.js";
import m_tex_fact from "../textures.js";
import * as m_util from "../util.js";

function DebugCheck(ns, exports) {

var m_assert = m_assert_fact(ns);
var m_cfg    = m_cfg_fact(ns);
var m_print = m_print_fact(ns);
var m_tex = m_tex_fact(ns);

var cfg_def = m_cfg.defaults;

var _multisample_issue = -1;
var _depth_only_issue = -1;
var _gl = null;
var ERRORS = [];

exports.setup_context = function(gl) {
    // WebGLRenderingContext.cpp
    var errors = [
        "INVALID_ENUM",                     // 1280
        "INVALID_VALUE",                    // 1281
        "INVALID_OPERATION",                // 1282
        "OUT_OF_MEMORY",                    // 1285
        "INVALID_FRAMEBUFFER_OPERATION",    // 1286
        "CONTEXT_LOST_WEBGL"                // 37442
    ];

    for (var i = 0; i < errors.length; i++) {
        var error = errors[i];
        if (error in gl)
            ERRORS[gl[error]] = error;
    }

    _gl = gl;
}

/**
 * Check browser by searching name in user agent.
 * unreliable method, use only for debug purposes
 */
exports.browser = function(name) {
    switch (name.toLowerCase()) {
    case "chrome":
        return (check_ua("mozilla") && check_ua("applewebkit") && check_ua("chrome"));
    case "firefox":
        return (check_ua("mozilla") && check_ua("gecko") && check_ua("firefox"));
    case "msie":
        return (check_ua("mozilla") && check_ua("trident") && check_ua("msie"));
    case "opera":
        return (check_ua("opera") && check_ua("presto"));
    case "safari":
        return (check_ua("mozilla") && check_ua("applewebkit") &&
                check_ua("safari") && !check_ua("chrome"));
    default:
        return false;
    }
}

var check_ua = function(name) {
    var user_agent = navigator.userAgent.toLowerCase();
    if (user_agent.indexOf(name) > -1)
        return true;
    else
        return false;
}

exports.finite = function(o) {
    if (m_util.is_vector(o)) {
        for (var i = 0; i < o.length; i++)
            if (!isFinite(o[i]))
                return false;
        // empty vector is not finite
        return Boolean(o.length);
    } else if (!isFinite(o)) {
            return false;
    } else {
        return true;
    }
}

/**
 * Get GL error, throw exception if any.
 */
exports.gl = function(msg) {
    if (!cfg_def.gl_debug)
        return;

    var error = _gl.getError();
    if (error == _gl.NO_ERROR)
        return;
    if (error in ERRORS) 
        m_assert.panic("GL Error: " + error + ", gl." + ERRORS[error] + " (" + msg + ")");
    else
        m_assert.panic("Unknown GL error: " + error + " (" + msg + ")");
}

/**
 * Check status of currently bounded framebuffer object,
 * Print error if framebuffer is incomplete.
 * @returns {boolean} true if framebuffer complete
 */
exports.bound_fb = function() {

    if (!cfg_def.gl_debug && !cfg_def.check_framebuffer_hack)
        return true;

    switch (_gl.checkFramebufferStatus(_gl.FRAMEBUFFER)) {
    case _gl.FRAMEBUFFER_COMPLETE:
        return true;
    case _gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
        m_print.error("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
        return false;
    case _gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
        m_print.error("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
        return false;
    case _gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
        m_print.error("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
        return false;
    case _gl.FRAMEBUFFER_UNSUPPORTED:
        m_print.error("Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED");
        return false;
    case _gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE:
        m_print.error("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MULTISAMPLE");
        return false;
    default:
        m_print.error("FRAMEBUFFER CHECK FAILED");
        return false;
    }
}

/**
 * Check for issue with incomplete depth-only framebuffer.
 * found on some old GPUs. (Found on Intel, AMD and NVIDIA)
 */
exports.depth_only_issue = function() {
    // use cached result
    if (_depth_only_issue != -1)
        return _depth_only_issue;

    var framebuffer = _gl.createFramebuffer();
    _gl.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer);

    var texture = m_tex.create_texture(m_tex.TT_DEPTH, false);
    m_tex.resize(texture, 1, 1);

    var w_tex = texture.w_texture;
    var w_target = texture.w_target;

    _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.DEPTH_ATTACHMENT, w_target, 
            w_tex, 0);

    if (_gl.checkFramebufferStatus(_gl.FRAMEBUFFER) != _gl.FRAMEBUFFER_COMPLETE) {
        _depth_only_issue = true;
        m_print.warn("depth-only issue was found");
    } else
        _depth_only_issue = false;

    // switch back to the window-system provided framebuffer
    _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);

    _gl.deleteFramebuffer(framebuffer);

    return _depth_only_issue;
}

/**
 * Check for issue with failing multisample renderbuffers.
 * Found on Firefox 46.
 */
exports.multisample_issue = function() {
    // msaa is disabled
    if (cfg_def.msaa_samples == 1)
        return false;

    // use cached result
    if (_multisample_issue != -1)
        return _multisample_issue;

    var rb = _gl.createRenderbuffer();
    _gl.bindRenderbuffer(_gl.RENDERBUFFER, rb);
    _gl.renderbufferStorageMultisample(_gl.RENDERBUFFER, cfg_def.msaa_samples,
            _gl.RGBA8, 1, 1);

    var num_samples = _gl.getRenderbufferParameter(_gl.RENDERBUFFER,
            _gl.RENDERBUFFER_SAMPLES);

    if (num_samples != cfg_def.msaa_samples) {
        _multisample_issue = true;
        m_print.warn("multisample issue was found: requested " +
                cfg_def.msaa_samples + ", got " + num_samples);
        if (_gl.getError() == _gl.INVALID_OPERATION)
            m_print.warn("the error from multisample issue detected, ignoring");
    } else
        _multisample_issue = false;

    _gl.bindRenderbuffer(_gl.RENDERBUFFER, null);

    return _multisample_issue;
}

/**
 * Check for Firefox cubemap issue found on some old GPUs.
 * (Found on NVIDIA 8000/9000/200 series).
 */
exports.ff_cubemap_out_of_memory = function() {
    if (check_ua("firefox") && _gl.getError() == _gl.OUT_OF_MEMORY) {
        m_print.warn("Firefox/old GPUs cubemap issue was found.");
        return true;
    }

    return false;

}

exports.reset = function() {
    _gl = null;
}

}

var debug_check_fact = register("__debug_check", DebugCheck);

export default debug_check_fact;