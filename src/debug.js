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
 * Debug routines for internal usage.
 * Don't forget to register GL context by setup_context() function.
 * @name debug
 * @namespace
 * @exports exports as debug
 */
b4w.module["__debug"] = function(exports, require) {

var m_compat = require("__compat");
var m_cfg    = require("__config");
var m_ext    = require("__extensions");
var m_graph  = require("__graph");
var m_print  = require("__print");
var m_subs   = require("__subscene");
var m_tex    = require("__textures");
var m_time   = require("__time");
var m_util   = require("__util");

var cfg_def = m_cfg.defaults;

var ERRORS = {};

var RENDER_TIME_SMOOTH_INTERVALS = 10;

var FAKE_LOAD_INTERVAL         = 5000;
var FAKE_LOAD_START_PERCENTAGE = 0;
var FAKE_LOAD_END_PERCENTAGE   = 100;

var _gl = null;

// NOTE: possible cleanup needed
var _exec_counters = {};
var _telemetry_messages = [];
var _depth_only_issue = -1;
var _multisample_issue = -1;

var _debug_view_subs = null;

var _assert_struct_last_obj = null;
var _assert_struct_init = false;

var _vbo_garbage_info = {};

exports.DV_NONE = 0;
exports.DV_OPAQUE_WIREFRAME = 1;
exports.DV_TRANSPARENT_WIREFRAME = 2;
exports.DV_FRONT_BACK_VIEW = 3;
exports.DV_BOUNDINGS = 4;
exports.DV_CLUSTERS_VIEW = 5;
exports.DV_BATCHES_VIEW = 6;
exports.DV_RENDER_TIME = 7;

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

exports.set_debug_view_subs = set_debug_view_subs;
function set_debug_view_subs(subs) {
    _debug_view_subs = subs;
}

exports.get_debug_view_subs = get_debug_view_subs;
function get_debug_view_subs() {
    return _debug_view_subs;
}

exports.fill_vbo_garbage_info = function(vbo_id, sh_pair_str, attr_name, 
        byte_size, is_in_usage) {
    if (!_vbo_garbage_info[vbo_id])
        _vbo_garbage_info[vbo_id] = { shaders: sh_pair_str, attrs: {} };

    if (!(attr_name in _vbo_garbage_info[vbo_id].attrs))
        _vbo_garbage_info[vbo_id].attrs[attr_name] = byte_size;

    if (is_in_usage)
        _vbo_garbage_info[vbo_id].attrs[attr_name] = 0;
}

exports.calc_vbo_garbage_byte_size = function() {
    var size = 0;
    for (var vbo_id in _vbo_garbage_info)
        for (var name in _vbo_garbage_info[vbo_id].attrs)
            size += _vbo_garbage_info[vbo_id].attrs[name];
    return size;
}

exports.show_vbo_garbage_info = function() {
    var info_obj = {}
    for (var vbo_id in _vbo_garbage_info)
        for (var name in _vbo_garbage_info[vbo_id].attrs) {
            var byte_size = _vbo_garbage_info[vbo_id].attrs[name];
            if (byte_size) {
                var sh_str = _vbo_garbage_info[vbo_id].shaders;
                if (!(sh_str in info_obj))
                    info_obj[sh_str] = { total_size: 0, attrs: {} };

                if (!(name in info_obj[sh_str].attrs))
                    info_obj[sh_str].attrs[name] = 0;
                info_obj[sh_str].attrs[name] += byte_size;
                info_obj[sh_str].total_size += byte_size;
            }
        }

    for (var sh_str in info_obj) {
        m_print.groupCollapsed(sh_str, info_obj[sh_str].total_size);
        for (var name in info_obj[sh_str].attrs)
            m_print.log_raw(name, info_obj[sh_str].attrs[name]);

        m_print.groupEnd();
    }
}

/**
 * Get GL error, throw exception if any.
 */
exports.check_gl = function(msg) {
    if (!cfg_def.gl_debug)
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
exports.check_depth_only_issue = function() {
    // use cached result
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
 * Check for issue with failing multisample renderbuffers.
 * Found on Firefox 46.
 */
exports.check_multisample_issue = function() {
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
exports.check_ff_cubemap_out_of_memory = function() {
    if (m_compat.check_user_agent("Firefox") 
            && _gl.getError() == _gl.OUT_OF_MEMORY) {
        m_print.warn("Firefox/old GPUs cubemap issue was found.");
        return true;
    }

    return false;

}

/**
 * Prints shader text numbered lines and error.
 * @param {WebGLShader} shader Shader object
 * @param {String} shader_id Shader id
 * @param {String} shader_text Shader text
 */
exports.report_shader_compiling_error = function(shader, shader_id, shader_text) {

    if (!cfg_def.gl_debug)
        return;

    shader_text = supply_line_numbers(shader_text);

    m_print.error("shader compilation failed:\n" + shader_text + "\n" +
        _gl.getShaderInfoLog(shader) + " (" + shader_id + ")");
}

function supply_line_numbers(text) {

    var lines = text.split("\n");
    for (var i = 0; i < lines.length; i++) 
        lines[i] = (i + 1) + " " + lines[i];
    text = lines.join("\n");

    return text;
}  

/**
 * Prints shader text numbered lines and error.
 * @param {WebGLProgram} program Shader program object
 * @param {String} shader_id Shader id
 * @param {String} vshader_text Vertex shader text
 * @param {String} fshader_text Fragment shader text
 */
exports.report_shader_linking_error = function(program, shader_id,
        vshader_text, fshader_text) {

    if (!cfg_def.gl_debug)
        return;

    vshader_text = supply_line_numbers(vshader_text);
    fshader_text = supply_line_numbers(fshader_text);

    m_print.error("shader linking failed:\n" + vshader_text + "\n\n\n" +
        fshader_text + "\n" +
        _gl.getProgramInfoLog(program) + " (" + shader_id + ")");
}

exports.render_time_start_subs = function(subs) {
    if (!(cfg_def.show_hud_debug_info || subs.type == m_subs.PERFORMANCE))
        return;

    if (subs.do_not_debug)
        return;

    subs.debug_render_time_queries.push(create_render_time_query());
}

exports.render_time_start_batch = function(batch) {
    if (!(batch.type == "MAIN" && is_debug_view_render_time_mode()))
        return;

    batch.debug_render_time_queries.push(create_render_time_query());   
}

function create_render_time_query() {
    var ext = m_ext.get_disjoint_timer_query();

    if (ext) {
        var query = ext.createQueryEXT();
        ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query);
    } else
        var query = performance.now();

    return query;
}

exports.render_time_stop_subs = function(subs) {
    if (!(cfg_def.show_hud_debug_info || subs.type == m_subs.PERFORMANCE))
        return;

    if (subs.do_not_debug)
        return;

    var render_time = calc_render_time(subs.debug_render_time_queries, 
            subs.debug_render_time, true);
    if (render_time)
        subs.debug_render_time = render_time;
}

exports.render_time_stop_batch = function(batch) {
    if (!(batch.type == "MAIN" && is_debug_view_render_time_mode()))
        return;

    var render_time = calc_render_time(batch.debug_render_time_queries, 
            batch.debug_render_time, true);
    if (render_time)
        batch.debug_render_time = render_time;
}

exports.is_debug_view_render_time_mode = is_debug_view_render_time_mode;
function is_debug_view_render_time_mode() {
    var subs_debug_view = get_debug_view_subs();
    return subs_debug_view && subs_debug_view.debug_view_mode == exports.DV_RENDER_TIME;
}

/**
 * External method for debugging purposes
 */
exports.process_timer_queries = function(subs) {
    var render_time = calc_render_time(subs.debug_render_time_queries, 
            subs.debug_render_time, false);
    if (render_time)
        subs.debug_render_time = render_time;
}

function calc_render_time(queries, prev_render_time, end_query) {
    var ext = m_ext.get_disjoint_timer_query();
    var render_time = 0;

    if (ext) {
        if (end_query)
            ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
        for (var i = 0; i < queries.length; i++) {
            var query = queries[i];

            var available = ext.getQueryObjectEXT(query,
                    ext.QUERY_RESULT_AVAILABLE_EXT);
            var disjoint = _gl.getParameter(ext.GPU_DISJOINT_EXT);

            if (available && !disjoint) {
                var elapsed = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_EXT);
                render_time = elapsed / 1000000;
                if (prev_render_time)
                    render_time = m_util.smooth(render_time,
                            prev_render_time, 1, RENDER_TIME_SMOOTH_INTERVALS);

                queries.splice(i, 1);
                i--;
            }
        }
    } else {
        render_time = performance.now() - queries.pop();
        if (prev_render_time)
            render_time = m_util.smooth(render_time,
                    prev_render_time, 1, RENDER_TIME_SMOOTH_INTERVALS);
    }

    return render_time;
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
 * Check whether the two objects have the same structure with proper values.
 */
exports.assert_structure = assert_structure;
function assert_structure(obj1, obj2) {

    if (!is_valid(obj1))
        m_util.panic("Structure assertion failed: invalid first object value");

    if (!is_valid(obj2))
        m_util.panic("Structure assertion failed: invalid second object value");

    if (!cmp_type(obj1, obj2))
        m_util.panic("Structure assertion failed: incompatible types");

    // continue with objects
    if (!(obj1 != null && obj2 != null && typeof obj1 == "object" &&
                !m_util.is_arr_buf_view(obj1) && !(obj1 instanceof Array)))
        return;

    for (var i in obj1) {
        if (!is_valid(obj1[i]))
            m_util.panic("Structure assertion failed: invalid value for key " +
                    "in the first object: " + i);
        if (!(i in obj2))
            m_util.panic("Structure assertion failed: missing key in the first object: " + i);
    }

    for (var i in obj2) {
        if (!is_valid(obj2[i]))
            m_util.panic("Structure assertion failed: invalid value for key " +
                    "in the second object: " + i);
        if (!(i in obj1))
            m_util.panic("Structure assertion failed: missing key in the second object: " + i);
        if (!cmp_type(obj1[i], obj2[i]))
            m_util.panic("Structure assertion failed: incompatible types for key " + i);
    }
}

function is_valid(obj) {
    if (typeof obj == "undefined")
        return false;
    else if (typeof obj == "number" && isNaN(obj))
        return false;
    else
        return true;
}

function cmp_type(obj1, obj2) {
    var type1 = typeof obj1;
    var type2 = typeof obj2;

    if (type1 != type2)
        return false;

    // additional checks for js arrays or array buffers
    if (obj1 != null && obj2 != null && typeof obj1 == "object") {
        var is_arr1 = obj1 instanceof Array;
        var is_arr2 = obj2 instanceof Array;

        if ((is_arr1 && !is_arr2) || (!is_arr1 && is_arr2))
            return false;

        var is_abv1 = m_util.is_arr_buf_view(obj1);
        var is_abv2 = m_util.is_arr_buf_view(obj2);

        if ((is_abv1 && !is_abv2) || (!is_abv1 && is_abv2))
            return false;
    }

    return true;
}

/**
 * Assert stucture - sequential form.
 */
exports.assert_structure_seq = function(obj) {
    if (!_assert_struct_init)
        _assert_struct_init = true;
    else
        assert_structure(obj, _assert_struct_last_obj);

    _assert_struct_last_obj = m_util.clone_object_nr(obj);
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

exports.nodegraph_to_dot = function(graph, detailed_print) {

    if (detailed_print) {
        var get_data_info = function(attr) {
            var data_info = "";
            switch (attr.type) {
            case "GEOMETRY_UV":
                data_info = "\nuv_layer: " + attr.data.value;
                break;
            case "TEXTURE_COLOR":
            case "TEXTURE_NORMAL":
                data_info = "\ntexture: " + attr.data.value.name + "\n(" 
                        + attr.data.value.image.filepath + ")";
                break;
            }

            if (data_info == "")
                data_info = "\n---";

            return data_info;
        }

        var nodes_label_cb = function (id, attr) {
            var node_text = attr.type + "(" + attr.name + ")";

            var inputs = attr.inputs;
            node_text += "\n\nINPUTS:";
            if (inputs.length)
                for (var i = 0; i < inputs.length; i++) {
                    node_text += "\n" + inputs[i].identifier + ": ";
                    if (inputs[i].is_linked) {
                        node_text += "linked";
                    } else
                        node_text += inputs[i].default_value;
                }
            else
                node_text += "\n---";

            var outputs = attr.outputs;
            node_text += "\n\nOUTPUTS:";
            if (outputs.length)
                for (var i = 0; i < outputs.length; i++) {
                    node_text += "\n" + outputs[i].identifier + ": ";
                    if (outputs[i].is_linked) {
                        node_text += "linked(default " + outputs[i].default_value + ")";
                    } else
                        node_text += "not used";
                }
            else
                node_text += "\n---";

            node_text += "\n\nDATA:";
            node_text += get_data_info(attr);

            return node_text;
        }

        var edges_label_cb = function (id1, id2, attr) {
            var node1 = m_graph.get_node_attr(graph, id1);
            var node2 = m_graph.get_node_attr(graph, id2);
            var out1 = node1.outputs[attr[0]];
            var in2 = node2.inputs[attr[1]];
            return out1.identifier + "\n==>\n" + in2.identifier;
        }
    } else {
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
    }

    return m_graph.debug_dot(graph, nodes_label_cb, edges_label_cb);
}

/**
 * NOTE: need to find better place for this internal method
 */
exports.get_gl = function() {
    return _gl;
}

exports.cleanup = function() {
    _debug_view_subs = null;
    _vbo_garbage_info = {};
}

exports.reset = function() {
    _gl = null;
}

}
