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
 * Debug routines for internal usage.
 * Don't forget to register GL context by setup_context() function.
 * @name debug
 * @namespace
 * @exports exports as debug
 */
b4w.module["__debug"] = function(exports, require) {

var m_cfg   = require("__config");
var m_ext   = require("__extensions");
var m_print = require("__print");
var m_tex   = require("__textures");
var m_time  = require("__time");
var m_util  = require("__util");
var m_graph = require("__graph");

var cfg_def = m_cfg.defaults;

var ERRORS = {};

var RENDER_TIME_SMOOTH_INTERVALS = 10;

var FAKE_LOAD_INTERVAL         = 5000;
var FAKE_LOAD_START_PERCENTAGE = 0;
var FAKE_LOAD_END_PERCENTAGE   = 100;

var _gl = null;

// NOTE: possible cleanup needed
var _check_errors = false;
var _exec_counters = {};
var _telemetry_messages = [];
var _depth_only_issue = -1;

var _assert_struct_last_obj = null;
var _assert_struct_init = false;

exports.WM_NONE = 0;
exports.WM_OPAQUE_WIREFRAME = 1;
exports.WM_TRANSPARENT_WIREFRAME = 2;
exports.WM_FRONT_BACK_VIEW = 3;
exports.WM_DEBUG_SPHERES = 4;

/**
 * Setup WebGL context
 * @param ctx webgl context
 */
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

    for (var i in errors) {
        var error = errors[i];
        if (error in gl)
            ERRORS[gl[error]] = error;
    }

    _gl = gl;
}

/**
 * Get GL error, throw exception if any.
 */
exports.check_gl = function(msg) {
    if (!_check_errors)
        return;

    var error = _gl.getError();
    if (error == _gl.NO_ERROR)
        return;
    if (error in ERRORS) 
        m_util.panic("GL Error: " + error + ", gl." + ERRORS[error] + " (" + msg + ")");
    else
        m_util.panic("Unknown GL error: " + error + " (" + msg + ")");
}

/**
 * Check status of currently bounded framebuffer object,
 * Print error if framebuffer is incomplete.
 * @returns {Boolean} true if framebuffer complete
 */
exports.check_bound_fb = function() {

    if (!_check_errors) 
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
    default:
        m_print.error("FRAMEBUFFER CHECK FAILED");
        return false;
    }
}

/**
 * Check for issue with incomplete depth-only framebuffer.
 * found on some old GPUs. (Found on Intel, AMD and NVIDIA)
 */
exports.check_depth_only_issue = function() {
    // use cache result
    if (_depth_only_issue != -1)
        return _depth_only_issue;

    var framebuffer = _gl.createFramebuffer();
    _gl.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer);

    var texture = m_tex.create_texture("DEBUG", m_tex.TT_DEPTH);
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

    if (!_gl.getShaderParameter(shader, _gl.COMPILE_STATUS)) {

        var ext_ds = cfg_def.allow_shaders_debug_ext && m_ext.get_debug_shaders();
        if (ext_ds)
            var shader_text = ext_ds.getTranslatedShaderSource(shader);

        shader_text = supply_line_numbers(shader_text);
       
        m_print.error("shader compilation failed:\n" + shader_text + "\n" + 
            _gl.getShaderInfoLog(shader) + " (" + shader_id + ")");

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

    if (!_gl.getProgramParameter(program, _gl.LINK_STATUS)) {
    
        var ext_ds = cfg_def.allow_shaders_debug_ext && m_ext.get_debug_shaders();
        if (ext_ds) {
            var vshader_text = ext_ds.getTranslatedShaderSource(vshader);
            var fshader_text = ext_ds.getTranslatedShaderSource(fshader);
        }

        vshader_text = supply_line_numbers(vshader_text);
        fshader_text = supply_line_numbers(fshader_text);

        m_print.error("shader linking failed:\n" + vshader_text + "\n\n\n" + 
            fshader_text + "\n" + 
            _gl.getProgramInfoLog(program) + " (" + shader_id + ")");

        throw "Engine failed: see above for error messages";
    }
}

exports.set_check_gl_errors = function(val) {
    _check_errors = val;
}

/**
 * Start calculation of rendering time.
 * use HUD to display subscene rendering time
 */
exports.render_time_start = function(subs) {
    if (!(cfg_def.show_hud_debug_info || subs.type == "PERFORMANCE"))
        return;

    var ext = m_ext.get_disjoint_timer_query();

    if (ext) {
        var query = ext.createQueryEXT();
        subs.debug_render_time_queries.push(query);
        ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query);
    } else
        subs.debug_render_time_queries.push(performance.now());
}

/**
 * Stop calculation of rendering time.
 * use HUD to display subscene rendering time
 */
exports.render_time_stop = function(subs) {
    if (!(cfg_def.show_hud_debug_info || subs.type == "PERFORMANCE"))
        return;

    var ext = m_ext.get_disjoint_timer_query();

    if (ext) {
        ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
        process_timer_queries(subs);
    } else {
        var queries = subs.debug_render_time_queries;
        var render_time = performance.now() - queries.pop();
        // init value
        if (!subs.debug_render_time)
            subs.debug_render_time = render_time;
        else
            subs.debug_render_time = m_util.smooth(render_time,
                    subs.debug_render_time, 1, RENDER_TIME_SMOOTH_INTERVALS);
    }
}

/**
 * External method is for debugging purposes
 */
exports.process_timer_queries = process_timer_queries;
function process_timer_queries(subs) {
    var ext = m_ext.get_disjoint_timer_query();
    var queries = subs.debug_render_time_queries;

    for (var i = 0; i < queries.length; i++) {
        var query = queries[i];

        var available = ext.getQueryObjectEXT(query,
                ext.QUERY_RESULT_AVAILABLE_EXT);
        var disjoint = _gl.getParameter(ext.GPU_DISJOINT_EXT);

        if (available && !disjoint) {
            var elapsed = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_EXT);
            var render_time = elapsed / 1000000;

            // init value
            if (!subs.debug_render_time)
                subs.debug_render_time = render_time;
            else
                subs.debug_render_time = m_util.smooth(render_time,
                        subs.debug_render_time, 1, RENDER_TIME_SMOOTH_INTERVALS);

            queries.splice(i, 1);
            i--;
        }
    }
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

        if (m_util.is_vector(arg)) {
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

        if (m_util.is_vector(arg)) {
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

exports.check_finite = function(o) {
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

exports.assert_cons = function(value, constructor) {
    if (value.constructor != constructor)
        m_util.panic("Type assertion failed: value <" + value + "> has type <"
                + value.constructor + ">, required <" + constructor + ">");
}

/**
 * Check whether the two objects have the same structure.
 */
exports.assert_structure = assert_structure;
function assert_structure(obj1, obj2) {

    if (typeof obj1 != typeof obj2)
        m_util.panic("Structure assertion failed: incompatible types");

    // ignore simple types or null's
    if (!(obj1 !== null && obj2 !== null && typeof obj1 == "object"))
        return;

    for (var i in obj1) {
        if (!(i in obj2))
            m_util.panic("Structure assertion failed: missing key in the first object: " + i);
    }

    for (var i in obj2) {
        if (!(i in obj1))
            m_util.panic("Structure assertion failed: missing key in the second object: " + i);
        if (typeof obj1[i] != typeof obj2[i])
            m_util.panic("Structure assertion failed: incompatible types for key " + i);
    }
}

/**
 * Assert stucture - sequential form.
 */
exports.assert_structure_seq = function(obj) {
    if (!_assert_struct_init)
        _assert_struct_init = true;
    else
        assert_structure(obj, _assert_struct_last_obj);

    _assert_struct_last_obj = obj;
}

exports.fake_load = function(stageload_cb, interval, start, end, loaded_cb) {
    stageload_cb = stageload_cb || null;

    if (!stageload_cb)
        m_util.panic("Stage load callback is undefined");

    interval = interval || FAKE_LOAD_INTERVAL;
    start    = start || FAKE_LOAD_START_PERCENTAGE;
    end      = end || FAKE_LOAD_END_PERCENTAGE;

    if (end > 100)
        m_util.panic("Max percentage must be less than 100");

    if (start < 0)
        m_util.panic("Min percentage must be greater than 0");

    if (start > end)
        m_util.panic("Max percentage must be greater than min percentage");

    var animator = m_time.animate(start, end, interval, function(e) {
        var rounded_percentage = e.toFixed();

        stageload_cb(rounded_percentage);

        if (rounded_percentage == 100) {
            m_time.clear_animation(animator);

            if (loaded_cb)
                loaded_cb();

            return;
        }
    })
}

exports.nodegraph_to_dot = function(graph) {
    var nodes_label_cb = function (id, attr) {
        return attr.type;
    }
    var edges_label_cb = function (id1, id2, attr) {
        var node1 = m_graph.get_node_attr(graph, id1);
        var node2 = m_graph.get_node_attr(graph, id2);
        var out1 = node1.outputs[attr[0]];
        var in2 = node2.inputs[attr[1]];
        return out1.identifier + "\n==>\n" + in2.identifier;
    }

    return m_graph.debug_dot(graph, nodes_label_cb, edges_label_cb);
}

}
