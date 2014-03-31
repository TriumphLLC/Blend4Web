"use strict";

/**
 * Debug routines for internal usage.
 * Don't forget to register GL context by setup_context() function.
 * @name debug
 * @namespace
 * @exports exports as debug
 */
b4w.module["__debug"] = function(exports, require) {

var m_print    = require("__print");
var extensions = require("__extensions");
var m_textures = require("__textures");
var util       = require("__util");

var gl;
var ERRORS = {};
var _check_errors = false;
var _exec_counters = {};
var _telemetry_messages = [];

var _depth_only_issue = -1;

exports.WIREFRAME_MODES = {
    "WM_OPAQUE_WIREFRAME": 0,
    "WM_TRANSPARENT_WIREFRAME": 1,
    "WM_FRONT_BACK_VIEW": 2,
    "WM_DEBUG_SPHERES": 3
}


/**
 * Setup WebGL context
 * @param ctx webgl context
 */
exports.setup_context = function(ctx) {
    gl = ctx;

    // WebGLRenderingContext.cpp
    var errors = [
        "INVALID_ENUM",                     // 1280
        "INVALID_VALUE",                    // 1281
        "INVALID_OPERATION",                // 1282
        "OUT_OF_MEMORY",                    // 1285
        "INVALID_FRAMEBUFFER_OPERATION",    // 1286
        "CONTEXT_LOST_WEBGL"                // 37442
    ];

    for (var i in errors) {
        var error = errors[i];
        if (error in gl)
            ERRORS[gl[error]] = error;
    }
}

/**
 * Get GL error, throw exception if any.
 */
exports.check_gl = function(msg) {
    if (!_check_errors)
        return;

    var error = gl.getError();
    if (error == gl.NO_ERROR)
        return;
    if (error in ERRORS) 
        throw "B4W Error: " + error + ", gl." + ERRORS[error] + " (" + msg + ")";
    else
        throw "Unknown GL error: " + error + " (" + msg + ")";
}

/**
 * Check status of currently bounded framebuffer object,
 * Print error if framebuffer is incomplete.
 * @returns {Boolean} true if framebuffer complete
 */
exports.check_bound_fb = function() {

    if (!_check_errors) 
        return true;

    switch (gl.checkFramebufferStatus(gl.FRAMEBUFFER)) {
    case gl.FRAMEBUFFER_COMPLETE:
        return true;
    case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
        m_print.error("B4W Error: Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
        return false;
    case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
        m_print.error("B4W Error: Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
        return false;
    case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
        m_print.error("B4W Error: Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
        return false;
    case gl.FRAMEBUFFER_UNSUPPORTED:
        m_print.error("B4W Error: Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED");
        return false;
    default:
        m_print.error("B4W Error: FRAMEBUFFER CHECK FAILED");
        return false;
    }
}

/**
 * Check for issue with incomplete depth-only framebuffer.
 * found on some Intel and AMD cards
 */
exports.check_depth_only_issue = function() {
    // use cache result
    if (_depth_only_issue != -1)
        return _depth_only_issue;

    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    var texture = m_textures.create_texture("DEBUG", m_textures.TT_DEPTH);
    m_textures.resize(texture, 1, 1);

    var w_tex = texture.w_texture;
    var w_target = texture.w_target;

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, w_target, 
            w_tex, 0);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
        _depth_only_issue = true;
        m_print.warn("B4W warning: depth-only issue was found");
    } else
        _depth_only_issue = false;

    // switch back to the window-system provided framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return _depth_only_issue;
}


/**
 * Get shader compile status, throw exception if compilation failed.
 * Prints shader text numbered lines and error.
 * @param {WebGLShader} shader Shader object
 * @param {String} shader_id Shader id
 * @param {String} shader_text Shader text
 */
exports.check_shader_compiling = function(shader, shader_id, shader_text) {

    if (!_check_errors) 
        return;

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {

        shader_text = supply_line_numbers(shader_text);
       
        m_print.error("B4W Error: shader compilation failed:\n" + shader_text + "\n" + 
            gl.getShaderInfoLog(shader) + " (" + shader_id + ")");

        throw "Engine failed: see above for error messages";
    }
}

function supply_line_numbers(text) {

    var lines = text.split("\n");
    for (var i = 0; i < lines.length; i++) 
        lines[i] = (i + 1) + " " + lines[i];
    text = lines.join("\n");

    return text;
}  

/**
 * Get shader program link status, throw exception if linking failed.
 * @param {WebGLProgram} program Shader program object
 * @param {String} shader_id Shader id
 */
exports.check_shader_linking = function(program, shader_id, vshader, fshader, 
    vshader_text, fshader_text) {

    if (!_check_errors) 
        return;

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    
        var ext_ds = extensions.get_debug_shaders();
        if (ext_ds) {
            var vshader_text = ext_ds.getTranslatedShaderSource(vshader);
            var fshader_text = ext_ds.getTranslatedShaderSource(fshader);
        }
    
        vshader_text = supply_line_numbers(vshader_text);
        fshader_text = supply_line_numbers(fshader_text);
    
        m_print.error("B4W Error: shader linking failed:\n" + vshader_text + "\n\n\n" + 
            fshader_text + "\n" + 
            gl.getProgramInfoLog(program) + " (" + shader_id + ")");

        throw "Engine failed: see above for error messages";
    }
}

exports.set_check_gl_errors = function(val) {
    _check_errors = val;
}

/**
 * Print number of executions per frame.
 * @param {String} Counter ID
 */
exports.exec_count = function(counter) {
    if (counter in _exec_counters)
        _exec_counters[counter] += 1;
    else
        _exec_counters[counter] = 1;
}

/**
 * Executed each frame.
 */
exports.update = function() {
    for (var i in _exec_counters) {
        m_print.log(i, _exec_counters[i]);
        _exec_counters[i] = 0;
    }
}

/**
 * Flashback telemetry message prepended by precise time
 */
exports.fbmsg = function() {
    var msg = [performance.now()];

    for (var i = 0; i < arguments.length; i++) {
        var arg = arguments[i];

        if (util.is_vector(arg)) {
            for (var j = 0; j < arg.length; j++)
                msg.push(arg[j]);
        } else
            msg.push(arguments[i]);
    }

    _telemetry_messages.push(msg);
}

/**
 * Simple telemetry message prepended by id counter
 */
exports.msg = function() {

    var id_count = 1;
    for (var i = 0; i < _telemetry_messages.length; i++) {
        var msg = _telemetry_messages[i];
        if (msg[1] == arguments[0])
            id_count++;
    }

    var msg = [id_count];

    for (var i = 0; i < arguments.length; i++) {
        var arg = arguments[i];

        if (util.is_vector(arg)) {
            for (var j = 0; j < arg.length; j++)
                msg.push(arg[j]);
        } else
            msg.push(arguments[i]);
    }

    _telemetry_messages.push(msg);
}


var COLORS = ["color: #3366FF", "color: #CC33FF", "color: #FF3366", "color: #33FF66", "color: #FFCC33"];

exports.print_telemetry = function(time) {
    if (!time)
        time = 1.0;

    var color_counter = 0;
    var color_by_id = {};

    var start_time_ms = Math.max(0.0, performance.now() - time * 1000.0);
    for (var i = 0; i < _telemetry_messages.length; i++) {
        var msg = _telemetry_messages[i];

        var time = msg[0];

        if (time < start_time_ms)
            continue;

        var id = String(msg[1]);

        if (!color_by_id[id])
            color_by_id[id] = COLORS[(color_counter++) % COLORS.length];

        var color = color_by_id[id];

        var console_args = ["%c" + (time / 1000).toFixed(6), color, id];
        for (var j = 2; j < msg.length; j++)
            console_args.push(msg[j]);

        m_print.log.apply(this, console_args);
    }

    // clear
    _telemetry_messages.splice(0);
}

exports.plot_telemetry = function(time) {
    if (!time)
        time = 1.0;

    var msg_by_id = {};

    var start_time_ms = Math.max(0.0, performance.now() - time * 1000.0);

    for (var i = 0; i < _telemetry_messages.length; i++) {
        var msg = _telemetry_messages[i];

        var time = msg[0];

        if (time < start_time_ms)
            continue;

        for (var j = 2; j < msg.length; j++) {
            var id = String(msg[1]);
            if (msg.length > 3)
                id += "_" + String(j-2);
            
            if (!msg_by_id[id])
                msg_by_id[id] = id + "\n";

            msg_by_id[id] += String(time) + " " + msg[j] + "\n";
        }
    }

    var plot_str = "";

    for (var id in msg_by_id)
        plot_str += msg_by_id[id] + "\n\n";

    m_print.log(plot_str);

    // clear
    _telemetry_messages.splice(0);
}

/**
 * Check browser by searching name in user agent.
 * unreliable method, use only for debug purposes
 */
exports.check_browser = function(name) {
    var user_agent = navigator.userAgent.toLowerCase();

    var check_ua = function(name) {
        if (user_agent.indexOf(name) > -1)
            return true;
        else
            return false;
    }

    switch(name.toLowerCase()) {
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

exports.check_finite = function(o) {
    if (util.is_vector(o)) {
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

}


