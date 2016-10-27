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
/**
 * Created by dal on 04.09.15.
 */
"use strict";

/**
 * Logic Nodes scheduler module.
 * @name logic_nodes
 * @namespace
 * @exports exports as logic_nodes
 */
b4w.module["__logic_nodes"] = function(exports, require) {

var m_anim   = require("__animation");
var m_assets = require("__assets");
var m_cam    = require("__camera");
var m_nla    = require("__nla");
var m_obj    = require("__objects");
var m_print  = require("__print");
var m_scs    = require("__scenes");
var m_cfg    = require("__config");
var m_ctl    = require("__controls");
var m_batch  = require("__batch");
var m_geom   = require("__geometry");
var m_mat3   = require("__mat3");
var m_mat4   = require("__mat4");
var m_phy    = require("__physics");
var m_quat   = require("__quat");
var m_sfx    = require("__sfx");
var m_time   = require("__time");
var m_trans  = require("__transform");
var m_tsr    = require("__tsr");
var m_util   = require("__util");
var m_vec3   = require("__vec3");

var _vec4_tmp  = new Float32Array(4);
var _vec4_tmp1 = new Float32Array(4);
var _vec3_tmp  = new Float32Array(3);
var _vec3_tmp1 = new Float32Array(3);
var _vec2_tmp  = new Float32Array(2);
var _mat3_tmp  = new Float32Array(9);
var _mat4_tmp  = new Float32Array(16);


/**
 * Logic State
 */
var UNINITIALIZED  = 0;
var INITIALIZATION = 1;
var RUNNING        = 2;
var STOPPED        = 3;
var PAUSED         = 4;

/**
 * Node State by type
 */
// Playing state(Animation, Transformation, Timeline, Sound etc)
var NPS_NOT_STARTED  = -1;
var NPS_PLAYING      = 0;
var NPS_FINISHED     = 1;
// Switch Select
var NSS_READY     = -2;
var NSS_NOT_READY = -1;
var NSS_MISS      = 0;
var NSS_HIT       = 1;
// Send Request
var NSR_NOT_STARTED          = -1;
var NSR_SENDING_REQUEST      = 0;
var NSR_RESPONSE_RECEIVED    = 1;

/**
 * Formats for convert_variable
 */
var NT_NUMBER = 0;
var NT_STRING = 1;
exports.NT_NUMBER = NT_NUMBER;
exports.NT_STRING = NT_STRING;

/**
 * Keep node constants synchronized with:
 *   exporter.py : process_scene_nla
 *   reformer.js : assign_logic_nodes_object_params
 */

/**
 * Node string operations
 */
var NSO_JOIN    = 0;
var NSO_FIND    = 1;
var NSO_REPLACE = 2;
var NSO_SPLIT   = 3;
var NSO_COMPARE = 4;
exports.NSO_JOIN    = NSO_JOIN;
exports.NSO_FIND    = NSO_FIND;
exports.NSO_REPLACE = NSO_REPLACE;
exports.NSO_SPLIT   = NSO_SPLIT;
exports.NSO_COMPARE = NSO_COMPARE;

/**
 * Node json operations
 */
var NJO_PARSE  = 0;
var NJO_ENCODE = 1;

/**
 * Node conditions
 */
var NC_GEQUAL   = 0;
var NC_LEQUAL   = 1;
var NC_GREATER  = 2;
var NC_LESS     = 3;
var NC_NOTEQUAL = 4;
var NC_EQUAL    = 5;
exports.NC_GEQUAL   = NC_GEQUAL;
exports.NC_LEQUAL   = NC_LEQUAL;
exports.NC_GREATER  = NC_GREATER;
exports.NC_LESS     = NC_LESS;
exports.NC_NOTEQUAL = NC_NOTEQUAL;
exports.NC_EQUAL    = NC_EQUAL;

/**
 * Node space type
 */
var NST_WORLD  = 0;
var NST_PARENT = 1;
var NST_LOCAL  = 2;
exports.NST_WORLD  = NST_WORLD;
exports.NST_PARENT = NST_PARENT;
exports.NST_LOCAL  = NST_LOCAL;

/**
 * Node camera move style
 */
var NCMS_STATIC  = 0;
var NCMS_TARGET  = 1;
var NCMS_EYE     = 2;
var NCMS_HOVER   = 3;
exports.NCMS_STATIC = NCMS_STATIC;
exports.NCMS_TARGET = NCMS_TARGET;
exports.NCMS_EYE    = NCMS_EYE;
exports.NCMS_HOVER  = NCMS_HOVER;

/**
 * Node cb param type
 */
var NCPT_OBJECT  = 0;
var NCPT_VARIABLE = 1;
exports.NCPT_OBJECT = NCPT_OBJECT;
exports.NCPT_VARIABLE = NCPT_VARIABLE;

/**
 * Add your node to _nodes_handlers
 * Use do_nothing_handler for stubs
 */
var _nodes_handlers = {
    "ENTRYPOINT": entrypoint_handler,
    "HIDE": hide_object_handler,
    "SHOW": show_object_handler,
    "PAGEPARAM": pageparam_handler,
    "SWITCH_SELECT": switch_select_handler,
    "SELECT": select_handler,
    "PLAY": play_timeline_handler,
    "REDIRECT": redirect_handler,
    "MATH": math_handler,
    "CONDJUMP": conditional_jump_handler,
    "REGSTORE": regstore_handler,
    "PLAY_ANIM": play_anim_handler,
    "SELECT_PLAY": do_nothing_handler,
    "SEND_REQ": send_req_handler,
    "INHERIT_MAT": inherit_mat_handler,
    "SET_SHADER_NODE_PARAM": set_shader_node_param_handler,
    "DELAY": delay_handler,
    "APPLY_SHAPE_KEY": apply_shape_key_handler,
    "OUTLINE": outline_handler,
    "MOVE_CAMERA": move_camera_handler,
    "SET_CAMERA_MOVE_STYLE": set_camera_move_style_handler,
    "MOVE_TO": move_to_handler,
    "TRANSFORM_OBJECT": transform_object_handler,    
    "SPEAKER_PLAY": speaker_play_handler,
    "SPEAKER_STOP": speaker_stop_handler,
    "STOP_ANIM": stop_anim_handler,
    "STOP_TIMELINE": stop_timeline_handler,
    "CONSOLE_PRINT": console_print_handler,
    "STRING": string_handler,
    "GET_TIMELINE": get_timeline_handler,
    "JSON": json_handler,
    "JS_CALLBACK": js_callback_handler,
    "EMPTY": do_nothing_handler
};

var _logic_arr = [];

var _logic_custom_cb_arr = {};

function init_node(snode, logic_script) {

    var node = {
        name: snode["name"],
        type: snode["type"],
        label: snode["label"],
        slot_idx_order: snode["slot_idx_order"],
        slot_idx_jump: snode["slot_idx_jump"],
        frame_start: snode["frame_range"][0],
        frame_end: snode["frame_range"][1],
        frame_start_mask: snode["frame_range_mask"] ? snode["frame_range_mask"][0] : true,
        frame_end_mask: snode["frame_range_mask"] ? snode["frame_range_mask"][1] : true,
        state: -1,
        sel_objs_len: -1,
        sel_obj_idx: -1,
        param_name: snode["param_name"],
        op: snode["operation"],
        mute: snode["mute"],
        dupli_name_list: snode["object"],
        obj: null,
        obj_state: null,
        camera_state: null,
        objects: {},
        anim_name: snode["anim_name"],
        anim_slot: m_anim.SLOT_0,
        parse_json_vars: snode["parse_json_vars"],
        parse_json_paths: snode["parse_json_paths"],
        objects_paths: snode["objects_paths"],
        nodes_paths: snode["nodes_paths"],
        floats: snode["floats"],
        bools: snode["bools"],
        vars: snode["variables"],
        strings: snode["strings"],
        materials_names: snode["materials_names"],
        shader_nd_type: snode["shader_nd_type"],
        common_usage_names: snode["common_usage_names"],
        encode_json_vars: snode["encode_json_vars"],
        encode_json_paths: snode["encode_json_paths"],
        thread: logic_script,
        process_node: _nodes_handlers[snode["type"]] ? _nodes_handlers[snode["type"]] : unknown_node_handler,
        processed: false,
        timer: 0,
        sel_obj_idxs: null,
        links_dict: snode["links"],
        links_idxs: []
    };

    return node;
}

function get_var(var_desc, global_vars, local_vars) {
    return var_desc[0]?global_vars[var_desc[1]]:local_vars[var_desc[1]];
}

function set_var(var_desc, global_vars, local_vars, value) {
    if (var_desc[0])
        global_vars[var_desc[1]] = value;
    else
        local_vars[var_desc[1]] = value;
}

function do_nothing_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function unknown_node_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        m_print.error("Unknown node type: " + node.type);
        break;
    case RUNNING:
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

exports.init_logic = function(scene, data_id) {
    var logic = {
        data_id: data_id,
        scene_name: scene["name"],
        state: UNINITIALIZED,
        nla_thread: null,
        scene: scene,
        curr_thread: null,
        logic_threads: [],
        sorted_markers_values: [],
        variables: {}
    };
    scene._logic = logic;
    prepare_logic(scene, logic)
};

exports.update = function(timeline, elapsed) {
    var start_time = m_nla.get_start_time();
    if (start_time <= 0)
        return;

    // for each scene
    for (var i = 0; i < _logic_arr.length; i++) {
        process_logic(i, timeline, elapsed, start_time);
    }
};

exports.append_custom_cb = function(cb_id, cb) {
    _logic_custom_cb_arr[cb_id] = cb;
}

exports.remove_custom_cb = function(cb_id) {
    delete _logic_custom_cb_arr[cb_id];
}

exports.run_ep = function(scene_name, ep_name) {
    for (var i = 0; i < _logic_arr.length; i++) {
        if (_logic_arr[i].scene_name == scene_name) {
            var logic = _logic_arr[i];
            for (var j = 0; j < logic.logic_threads.length; j++) {
                var ep = logic.logic_threads[j].nodes[0];
                if (ep.name == ep_name) {
                    if(ep.bools["js"])
                        ep.mute  = false;
                        logic.logic_threads[j].thread_state.curr_node = 0;
                    break;
                }
            }
            break;
        }
    }
}

function reset_play(thread) {
    var script = thread.nodes;
    for (var i = 0; i < script.length; i++) {
        var node = script[i];
        if (node.type == "PLAY")
            node.state = NPS_NOT_STARTED;
    }
}

function reset_selections(thread) {
    var script = thread.nodes;
    for (var i = 0; i < script.length; i++) {
        var node = script[i];
        if (node.type == "SWITCH_SELECT") {
            node.state = NSS_NOT_READY;
        }
    }
}

function process_logic(index, timeline, elapsed, start_time) {
    // for each thread
    var logic = _logic_arr[index];
    for (var k = 0; k < _logic_arr[index].logic_threads.length; k++) {
        logic.curr_thread = _logic_arr[index].logic_threads[k];
        process_logic_thread(_logic_arr[index].logic_threads[k], logic, timeline, elapsed, start_time);
    }
}

/**
 * Return URL param
 */
function get_url_param(name, param_type, is_hash_param) {
    var cfg_url_params = m_cfg.get("url_params");

    if (cfg_url_params && name in cfg_url_params)
        return Number(cfg_url_params[name]);

    var url_params = is_hash_param ? location.hash : location.search;

    if (!url_params)
        return 0;

    var params = url_params.slice(1).split("&");

    for (var i = 0; i < params.length; i++) {
        var param = params[i].split("=");

        if (param.length > 1 && param[0] == name)
            return convert_variable(param[1], param_type);
    }

    return 0;
}

function get_object(node) {
    return m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.dupli_name_list || [], 0);
}

function get_world(node) {
    return m_obj.get_world_by_name(node.dupli_name_list[0], 0);
}

function entrypoint_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case RUNNING:
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}
function hide_object_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        node.obj = get_object(node);
        if(!node.obj) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
        break;
    case RUNNING:
        m_scs.change_visibility(node.obj, true);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}
function show_object_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        node.obj = get_object(node);
        if(!node.obj) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
        break;
    case RUNNING:
        m_scs.change_visibility(node.obj, false);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}
function pageparam_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case RUNNING:
        set_var(node.vars["vd"], logic.variables, thread_state.variables,
            get_url_param(node.param_name, node.floats["ptp"], node.bools["hsh"]));
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}
var gen_sel_cb = function() {
    return function (obj, id, pulse, param) {
        var node = param[0];
        var logic = param[1];
        var thread = param[2];
        for (var i = 0; i < node.sel_objs_len; i++) {
            if (m_ctl.get_sensor_value(obj, id, i) &&
                i == node.sel_obj_idx) {
                if (m_nla.is_play(logic._nla) && logic.nla_thread == node.thread)
                    node.state = NSS_NOT_READY;
                else {
                    if (!(thread.thread_state.in_progress && !node.bools["no_wait"]))
                        node.state = NSS_HIT;
                }
                return;
            }
        }
        node.state = NSS_MISS;
    }
};
function create_select_sensor(node, logic, thread) {
    var obj = get_object(node);

    var sel_objs = m_obj.get_selectable_objects();
    var obj_idx = sel_objs.indexOf(obj);

    if (obj_idx == -1) {
        m_print.error("logic script error: non-selectable object:",
            node.dupli_name_list[node.dupli_name_list.length -1]);
        return -1;
    }
    node.state = NSS_NOT_READY;
    node.sel_objs_len = sel_objs.length;
    node.sel_obj_idx = obj_idx;

    var sel_sensors = [];
    for (var j = 0; j < sel_objs.length; j++) {
        sel_sensors.push(m_ctl.create_selection_sensor(sel_objs[j], false));
    }

    var select_cb = gen_sel_cb();
    m_ctl.create_sensor_manifold(obj, "LOGIC_NODES_SELECT_" + node.label, m_ctl.CT_SHOT,
        sel_sensors, m_ctl.default_OR_logic_fun, select_cb, [node, logic, thread]);
}
function select_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        create_select_sensor(node, logic, logic.logic_threads[thread_state.thread_index]);
        break;
    case RUNNING:
        if (node.state == NSS_MISS || node.state == NSS_HIT) {
            thread_state.curr_node = node.state ? node.slot_idx_jump : node.slot_idx_order;
            node.state = NSS_NOT_READY;
            break;
        }
        if (node.bools["not_wait"]) {
            thread_state.curr_node = node.slot_idx_order;
            break;
        }
        break;
    }
}

var gen_switch_select_cb = function() {
    return function (obj, id, pulse, param) {
        var node = param[0];
        var logic = param[1];
        var thread = param[2];
        if (node.state != NSS_READY)
            return;
        for (var i = 0; i < node.sel_objs_len; i++) {
            var val = m_ctl.get_sensor_value(obj, id, i);
            if (val) {
                for (var j = 0; j < node.sel_obj_idxs.length; j++) {
                    if (node.sel_obj_idxs[j] == i) {
                        if (logic.nla_thread == node.thread) {
                            if (m_nla.is_play(logic._nla))
                                node.state = NSS_NOT_READY;
                            if (!(thread.thread_state.in_progress)) {
                                node.state = NSS_HIT;
                                node.slot_idx_jump = node.links_idxs[j];
                            }
                        } else {
                            node.state = NSS_HIT;
                            node.slot_idx_jump = node.links_idxs[j];
                        }
                        return;
                    }
                }
            }
        }
        node.state = NSS_MISS;
    }
};
function create_switch_select_sensor(node, logic, thread) {
    var sel_objs = m_obj.get_selectable_objects();
    node.sel_obj_idxs = [];
    node.links_idxs = [];
    for (var key in node.objects_paths) {
        var obj = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths[key], 0);
        var obj_idx = sel_objs.indexOf(obj);
        if (obj_idx == -1) {
            m_print.error("logic script error: non-selectable object:",
                node.objects_paths[key][node.objects_paths[key].length -1]);
            return -1;
        }
        node.sel_obj_idxs.push(obj_idx);
        node.links_idxs.push(node.links_dict[key]);
    }
    node.state = NSS_NOT_READY;
    node.sel_objs_len = sel_objs.length;

    var sel_sensors = [];
    for (var j = 0; j < sel_objs.length; j++) {
        sel_sensors.push(m_ctl.create_selection_sensor(sel_objs[j], false));
    }
    var select_cb = gen_switch_select_cb();
    m_ctl.create_sensor_manifold(obj, "LOGIC_NODES_SWITCH_SELECT_" + node.label, m_ctl.CT_SHOT,
        sel_sensors, m_ctl.default_OR_logic_fun, select_cb, [node, logic, thread]);
}

function switch_select_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    // state:
    //        -1: not ready, needs sensor reset
    //        -2: sensors are reset
    //         0: Miss
    //         1: Hit
    switch (logic.state) {
    case INITIALIZATION:
        create_switch_select_sensor(node, logic, logic.logic_threads[thread_state.thread_index]);
        break;
    case RUNNING:
        if (node.state == NSS_NOT_READY) {
            reset_selections(logic.logic_threads[thread_state.thread_index]);
            node.state = NSS_READY;
        }
        if (node.state == NSS_MISS || node.state == NSS_HIT) {
            thread_state.curr_node = node.state ? node.slot_idx_jump : node.slot_idx_order;
            node.state = NSS_NOT_READY;
            break;
        }
        break;
    }
}

function play_timeline_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        m_nla.stop_nla();
        node.state = NPS_NOT_STARTED;
        if (!node.bools["not_wait"])
            node.bools["not_wait"] = false;
        break;
    case RUNNING:

        switch (node.state) {
        case NPS_NOT_STARTED:
            if (m_nla.is_play(logic._nla)) {
                // if current thread is in progress
                if (logic.curr_thread == logic.nla_thread && thread_state.in_progress) {
                    break;
                }
                else {
                    // reset nla thread
                    var thread = logic.nla_thread;
                    if (thread) {
                        var nla_nd = thread.nodes[thread.thread_state.curr_node];
                        thread.thread_state.curr_node = nla_nd.slot_idx_order;
                        thread.nodes[thread.thread_state.curr_node].state = -1;
                        reset_play(logic.nla_thread);
                    }
                }
            }
            thread_state.in_progress = !node.bools["not_wait"];

            logic.nla_thread = logic.curr_thread;
            node.state = NPS_PLAYING;
            if (node.frame_start_mask) {
                m_nla.set_range_start(node.frame_start);
                m_nla.set_offset_from_range_start(timeline);
            }
            if (node.frame_end_mask) {
                m_nla.set_range_end(node.frame_end);
            } else {
                var cur_frame = m_nla.get_frame(timeline);
                var end = -1;
                for (var v in logic.sorted_markers_values) {
                    if (cur_frame < logic.sorted_markers_values[v]) {
                        end = v;
                        break;
                    }
                }
                if (end >= 0)
                    m_nla.set_range_end(logic.sorted_markers_values[end]);
                else
                    m_nla.set_range_end(m_nla.get_frame_end());
            }
            m_nla.play_nla(null);

            // if we can we must switch to the next node immediately
            // else there could be a conflict between nodes of such type
            if (node.bools["not_wait"]) {
                thread_state.curr_node = node.slot_idx_order;
                node.state = NPS_NOT_STARTED;
                thread_state.in_progress = false;
            }
            //
            break;
        case NPS_PLAYING:
            // playing
            if (!m_nla.is_play()) {
                thread_state.curr_node = node.slot_idx_order;
                node.state = NPS_NOT_STARTED;
                thread_state.in_progress = false;
            }
            break;
        case NPS_FINISHED:
            thread_state.curr_node = node.slot_idx_order;
            node.state = NPS_NOT_STARTED;
            logic.nla_thread = null;
            thread_state.in_progress = false;
            break;
        default:
            m_util.panic("Unknown state of " + node.name);
            node.state = NPS_NOT_STARTED;
            break;
        }
        break;
    }
}

function console_print_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case RUNNING:
        var vars = {};
        for (var i in node.vars) {
            var key = node.vars[i][1];
            vars[key] = get_var(node.vars[i], logic.variables, thread_state.variables);
        }
        m_print.log(node.common_usage_names["msg"], JSON.stringify(vars))
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function stop_timeline_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case RUNNING:
        if (node.bools["rst"]) {
            m_nla.set_offset_from_range_start(timeline);
        }
        m_nla.stop_nla();
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function redirect_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case RUNNING:
        var url = node.bools["url"] ? convert_variable(
                get_var(node.vars['url'], logic.variables, thread_state.variables), NT_STRING) : node.strings["url"];
        window.location.href = url;
        logic.state = STOPPED;
        break;
    }
}


function send_req_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    function asset_cb(loaded_data, uri, type, path, param) {
        var resp_string = JSON.stringify(loaded_data);
        set_var(param[0].vars["dst"], logic.variables, thread_state.variables, resp_string);
        param[0].state = 1;
    }

    switch (logic.state) {
    case RUNNING:
        switch (node.state) {
        case NSR_NOT_STARTED:
            node.state = NSR_SENDING_REQUEST;
            var url = node.bools["url"] ? convert_variable(
                    get_var(node.vars['url'], logic.variables, thread_state.variables), NT_STRING) : node.strings["url"];

            var header = {};
            if (node.bools["ct"])
                header["Content-Type"] = node.strings["ct"];
            if (node.common_usage_names["request_type"] == "GET") {
                m_assets.enqueue([{id:url, type:m_assets.AT_JSON, url:url, overwrite_header: header,
                    param:[node, thread_state.variables]}], asset_cb, null, null, null);
            }
            else if (node.common_usage_names["request_type"] == "POST") {
                    var req = convert_variable(
                        get_var(node.vars["dst1"], logic.variables, thread_state.variables), NT_STRING);

                    m_assets.enqueue([{id:url, type:m_assets.AT_JSON, url:url, overwrite_header: header,
                        request:"POST", post_type:m_assets.AT_JSON, post_data:req,
                        param:[node, thread_state.variables]}], asset_cb, null, null, null);
            }
            break;
        case NSR_SENDING_REQUEST:
            break;
        case NSR_RESPONSE_RECEIVED:
            node.state = NSR_NOT_STARTED;
            thread_state.curr_node = node.slot_idx_order;
            break;
        }
        break;
    }
}

function inherit_mat_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        for (var i = 0; i < 2; i++) {
            node.objects["id"+i] = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id"+i], 0);
            if(!node.objects["id"+i]) {
                m_print.error("Logic script error: object not found. Node: ", node.name);
                node.mute = true;
            }
        }
        break;
    case RUNNING:
        m_batch.inherit_material(node.objects['id0'], node.materials_names['id0'],
            node.objects['id1'], node.materials_names['id1']);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function delay_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        if (node.state == NPS_NOT_STARTED) {
            // start delay
            node.state = NPS_PLAYING;
            node.timer = 0;
            thread_state.in_progress = true;
            return;
        } else if (node.state == NPS_PLAYING) {
            // count the time
            node.timer += elapsed;
            var dl = node.bools["dl"] ? convert_variable(
                get_var(node.vars['dl'], logic.variables,thread_state.variables), NT_NUMBER) : node.floats["dl"];
            if (dl < node.timer) {
                node.state = NPS_NOT_STARTED;
                thread_state.curr_node = node.slot_idx_order;
                thread_state.in_progress = false;
            }
        }
        break;
    }
}

function apply_shape_key_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        var obj = node.objects["id0"] =
            m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
        if(!obj) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
        var key = node.common_usage_names['sk'];
        if (!m_geom.check_shape_keys(obj)) {
            m_print.error("No shape keys in object:", obj.name);
            node.mute = true;
        } else if (!m_geom.has_shape_key(obj, key)) {
            m_print.error("Wrong key name:", key);
            node.mute = true;
        }
        break;
    case RUNNING:
        m_geom.apply_shape_key(node.objects["id0"], node.common_usage_names['sk'],
            node.bools["skv"] ? convert_variable(
                get_var(node.vars['skv'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats['skv']);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function outline_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        var obj = node.objects["id0"] =
            m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
        if(!obj) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
        if (!(obj && obj.render && obj.render.outlining)) {
            m_print.error("Can't evaluate 'Outline' logic node: wrong object");
            node.mute = true;
        }
        break;
    case RUNNING:
        var obj = node.objects["id0"];
        switch (node.common_usage_names["outline_operation"]) {
        case "PLAY":
            var oa_set = obj.render.outline_anim_settings_default;
            m_obj.apply_outline_anim(obj, oa_set.outline_duration,
                oa_set.outline_period, oa_set.outline_relapses);
            break;
        case "STOP":
                m_obj.clear_outline_anim(obj);
            break;
        case "INTENSITY":
                obj.render.outline_intensity =
                    node.bools["in"] ? convert_variable(
                        get_var(node.vars['in'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats['in'];
            break;
        }
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function move_camera_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    function move_cam(cam, trans, target, tsr) {
        switch (m_cam.get_move_style(cam)) {
        case m_cam.MS_TARGET_CONTROLS:
            m_cam.set_trans_pivot(cam, trans, target);
            break;
        case m_cam.MS_EYE_CONTROLS:
        case m_cam.MS_STATIC:
            m_trans.set_tsr(cam, tsr);
            break;
        case m_cam.MS_HOVER_CONTROLS:
            m_vec3.sub(target, trans, _vec3_tmp);
            m_vec3.normalize(_vec3_tmp, _vec3_tmp);
            m_cam.set_hover_pivot(cam, target);
            var phi = 0;
            var theta = 0;
            // ZOX projection
            _vec3_tmp1[0] = _vec3_tmp[0];
            _vec3_tmp1[1] = 0;
            _vec3_tmp1[2] = _vec3_tmp[2];
            var dot = m_vec3.dot(_vec3_tmp1, _vec3_tmp);
            theta = Math.acos(dot / (m_vec3.length(_vec3_tmp1) * m_vec3.length(_vec3_tmp)));
            if (_vec3_tmp[2])
                phi = Math.atan(_vec3_tmp[0] / _vec3_tmp[2]);
            else {
                if (_vec3_tmp[0] > 0)
                    phi = 0;
                else
                    phi = Math.PI;
            }
            if (_vec3_tmp[2] > 0 && _vec3_tmp[0] > 0) {
                _vec2_tmp[1] = -(Math.PI + _vec2_tmp[1])
            }
            else if (_vec3_tmp[2] > 0 && _vec3_tmp[0] < 0) {
                _vec2_tmp[1] = -(Math.PI + _vec2_tmp[1]);
            }
            else if (_vec3_tmp[2] < 0 && _vec3_tmp[0] < 0) {
                _vec2_tmp[0] += Math.PI;
                phi = -(Math.PI - phi)
            }
            else if (_vec3_tmp[2] < 0 && _vec3_tmp[0] > 0) {
                _vec2_tmp[0] += Math.PI;
                phi -= Math.PI;
            }
            m_cam.rotate_hover_camera(cam, phi + Math.PI, -theta, true, true);
            break;
        }

        m_trans.update_transform(cam);
        m_phy.sync_transform(cam);
    }

    function set_tsr(cam, trans, target, tsr_out) {
        m_mat4.lookAt(trans, target, m_util.AXIS_Z, _mat4_tmp);
        m_mat4.invert(_mat4_tmp, _mat4_tmp);
        // m_mat4.rotateX(_mat4_tmp, Math.PI / 2, _mat4_tmp);
        var rot_matrix = _mat3_tmp;
        m_mat3.fromMat4(_mat4_tmp, rot_matrix);
        m_quat.fromMat3(rot_matrix, _vec4_tmp);
        m_quat.normalize(_vec4_tmp, _vec4_tmp);
        var scale = m_tsr.get_scale(cam.render.world_tsr);
        m_tsr.set_sep(trans, scale, _vec4_tmp, tsr_out);
    }

    switch (logic.state) {
    case INITIALIZATION:
        var o = null;
        o = node.objects["ca"] =
            m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
        if(!o) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
        node.objects["tr"] =
            m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id1"], 0);
        if(!node.objects["tr"]) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
        node.objects["ta"] =
            m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id2"], 0);
        if(!node.objects["ta"]) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
        node.state = NPS_NOT_STARTED;

        node.camera_state = {
            trans_start: new Float32Array(3),
            trans_end: new Float32Array(3),
            interp_trans: new Float32Array(3),
            target_start: new Float32Array(3),
            target_end: new Float32Array(3),
            interp_target: new Float32Array(3),
            tsr_start: new Float32Array(8),
            tsr_end: new Float32Array(8),
            interp_tsr: new Float32Array(8)
        };

        break;
    case RUNNING:
        var cam = node.objects["ca"];

        var trans = m_tsr.get_trans_view(node.objects["tr"].render.world_tsr);
        var target = m_tsr.get_trans_view(node.objects["ta"].render.world_tsr);

        switch (node.state) {
        case NPS_NOT_STARTED:
            var dur = node.bools["dur"] ? convert_variable(
                get_var(node.vars['dur'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["dur"];
            if (dur == 0.0) {
                set_tsr(cam, trans, target, node.camera_state.tsr_end);
                move_cam(cam, trans, target, node.camera_state.tsr_end);
                thread_state.curr_node = node.slot_idx_order;
                return;
            }
            // start interpolation
            var cam_trans = m_tsr.get_trans_view(cam.render.world_tsr);
            m_vec3.copy(cam_trans, node.camera_state.trans_start);
            var move_style = m_cam.get_move_style(cam);
            if (move_style == m_cam.MS_HOVER_CONTROLS) {
                m_vec3.copy(cam.render.hover_pivot, node.camera_state.target_start);
            } else if (move_style == m_cam.MS_STATIC || move_style == m_cam.MS_EYE_CONTROLS) {
                // calc tsr
                m_tsr.copy(cam.render.world_tsr, node.camera_state.tsr_start);
                set_tsr(cam, trans, target, node.camera_state.tsr_end);
            } else {
                m_vec3.copy(cam.render.pivot, node.camera_state.target_start);
            }
            m_vec3.copy(trans, node.camera_state.trans_end);
            m_vec3.copy(target, node.camera_state.target_end);

            node.state = NPS_PLAYING;
            var trans_animator = m_time.animate(0, 1, dur * 1000, function(e) {
                if (m_scs.check_active()) {
                    if (move_style == m_cam.MS_STATIC || move_style == m_cam.MS_EYE_CONTROLS) {
                        m_tsr.interpolate(node.camera_state.tsr_start, node.camera_state.tsr_end,
                            m_util.smooth_step(e), node.camera_state.interp_tsr);
                    }
                    else {
                        node.camera_state.interp_target = m_vec3.lerp(node.camera_state.target_start,
                            node.camera_state.target_end, m_util.smooth_step(e), node.camera_state.interp_target);
                        node.camera_state.interp_trans = m_vec3.lerp(node.camera_state.trans_start,
                            node.camera_state.trans_end, m_util.smooth_step(e), node.camera_state.interp_trans);
                    }
                    move_cam(cam, node.camera_state.interp_trans, node.camera_state.interp_target,
                        node.camera_state.interp_tsr);
                    if (e == 1)
                       node.state = NPS_FINISHED;
                }
            });
            break;
        case NPS_PLAYING:
            // interpolation is in progress
            break;
        case NPS_FINISHED:
            // end
            m_time.clear_animation(trans_animator);
            node.state = NPS_NOT_STARTED;
            thread_state.curr_node = node.slot_idx_order;
            break;
        }
        break;
    }
}

function set_camera_move_style_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        var cam = null;
        cam = node.objects["ca"] =
            m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
        if(!cam) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }

        var render = cam.render;
        node.cam_state = {
            target_cam_upside_down      : render.target_cam_upside_down,
            use_panning                 : render.use_panning,
            horizontal_limits           : render.horizontal_limits,
            vertical_limits             : render.vertical_limits,
            distance_limits             : render.distance_limits,
            hover_horiz_trans_limits    : render.hover_horiz_trans_limits,
            hover_vert_trans_limits     : render.hover_vert_trans_limits,
            pivot_limits                : render.pivot_limits,
            enable_hover_hor_rotation   : render.enable_hover_hor_rotation
        };

        break;
    case RUNNING:
        var cam = node.objects["ca"];
        var cam_render = cam.render;
        var cam_state = node.cam_state;
        m_cam.wipe_move_style(cam);

        switch (node.common_usage_names["camera_move_style"]) {
        case NCMS_STATIC:
            cam_render.move_style = m_cam.MS_STATIC;
            break;
        case NCMS_EYE:
            cam_render.move_style = m_cam.MS_EYE_CONTROLS;

            var pos = m_tsr.get_trans_view(cam_render.world_tsr);

            m_cam.setup_eye_model(cam, pos, null, cam_state.horizontal_limits, cam_state.vertical_limits);
            break;
        case NCMS_HOVER:
            cam_render.move_style = m_cam.MS_HOVER_CONTROLS;

            var pos = m_tsr.get_trans_view(cam_render.world_tsr);
            var pivot = _vec3_tmp;
            if (node.bools["pvo"]) {
                var pvo = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id1"], 0);
                pivot = m_tsr.get_trans_view(pvo.render.world_tsr);
            }
            else {
                pivot[0] = node.bools["pvx"] ?
                    convert_variable(get_var(node.vars["pvx"], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["pvx"];
                pivot[1] = node.bools["pvy"] ?
                    convert_variable(get_var(node.vars["pvy"], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["pvy"];
                pivot[2] = node.bools["pvz"] ?
                    convert_variable(get_var(node.vars['pvz'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["pvz"];
            }

            m_cam.setup_hover_model(cam, pos, pivot, cam_state.distance_limits,
                    cam_state.vertical_limits, cam_state.hover_horiz_trans_limits, cam_state.hover_vert_trans_limits, cam_state.enable_hover_hor_rotation);
            break;
        case NCMS_TARGET:
            cam_render.move_style = m_cam.MS_TARGET_CONTROLS;

            var pos = m_tsr.get_trans_view(cam_render.world_tsr);
            var pivot = _vec3_tmp;
            if (node.bools["pvo"]) {
                var pvo = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id1"], 0);
                pivot = m_tsr.get_trans_view(pvo.render.world_tsr);
            } else {
                pivot[0] = node.bools["pvx"] ?
                    convert_variable(get_var(node.vars["pvx"], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["pvx"];
                pivot[1] = node.bools["pvy"] ?
                    convert_variable(get_var(node.vars["pvy"], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["pvy"];
                pivot[2] = node.bools["pvz"] ?
                    convert_variable(get_var(node.vars['pvz'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["pvz"];
            }

            m_cam.setup_target_model(cam, pos, pivot, cam_state.horizontal_limits,
                    cam_state.vertical_limits, cam_state.dist_limits, cam_state.pivot_limits, cam_state.use_panning);
            break;
        }

        // velocities
        var vel = _vec3_tmp1;
        vel[0] = node.bools["vtr"] ?
                    convert_variable(get_var(node.vars["vtr"], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["vtr"];
        vel[1] = node.bools["vro"] ?
                    convert_variable(get_var(node.vars["vro"], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["vro"];
        vel[2] = node.bools["vzo"] ?
                    convert_variable(get_var(node.vars['vzo'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["vzo"];
        vel[0] = m_util.clamp(vel[0], 0, Infinity);
        vel[1] = m_util.clamp(vel[1], 0, Infinity);
        vel[2] = m_util.clamp(vel[2], 0, 0.99);
        cam_render.velocity_trans = vel[0];
        cam_render.velocity_rot   = vel[1];
        cam_render.velocity_zoom  = vel[2];

        m_trans.update_transform(cam);
        m_phy.sync_transform(cam);
        // init ortho after the camera was updated
        m_cam.init_ortho_props(cam);

        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function move_to_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    function move_to(obj, dest) {
        m_trans.set_tsr(obj, dest);

        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    }

    switch (logic.state) {
    case INITIALIZATION:
        node.objects["ob"] =
            m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
        if(!node.objects["ob"]) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
        node.objects["de"] =
            m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id1"], 0);
        if(!node.objects["de"]) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }

        node.state = NPS_NOT_STARTED;

        node.obj_state = {
            dest_tsr_start: new Float32Array(8),
            dest_tsr_end: new Float32Array(8),
            interp_tsr_dest: new Float32Array(8)
        };

        break;    
    case RUNNING:
        var obj = node.objects["ob"];
        m_tsr.copy(node.objects["ob"].render.world_tsr, node.obj_state.dest_tsr_start)
        //destination
        m_tsr.copy(node.objects["de"].render.world_tsr, node.obj_state.dest_tsr_end);

        switch (node.state) {
        case NPS_NOT_STARTED:
            var dur = node.bools["dur"] ? convert_variable(
                get_var(node.vars['dur'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["dur"];
            if (dur == 0.0) {
                move_to(obj, node.obj_state.dest_tsr_end);
                thread_state.curr_node = node.slot_idx_order;
                return;
            }

            node.state = NPS_PLAYING;
            var trans_animator = m_time.animate(0, 1, dur * 1000, function(e) {
                if (m_scs.check_active()) {
                    node.obj_state.interp_dest = m_tsr.interpolate(node.obj_state.dest_tsr_start,
                            node.obj_state.dest_tsr_end, m_util.smooth_step(e), node.obj_state.interp_tsr_dest);

                    move_to(obj, node.obj_state.interp_tsr_dest);

                    if (e == 1)
                       node.state = NPS_FINISHED;
               }
            });
            break;
        case NPS_PLAYING:
            // interpolation is in progress
            break;
        case NPS_FINISHED:
            // end
            m_time.clear_animation(trans_animator);
            node.state = NPS_NOT_STARTED;
            thread_state.curr_node = node.slot_idx_order;
            break;
        }
        break;    
    }
}

function transform_object_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    function transform_obj(obj, tsr, space) {
        if(space == NST_WORLD){
            m_trans.set_tsr(obj, tsr);
        }
        else {
            m_trans.set_tsr_rel(obj, tsr);
        }

        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);       
    }


    switch (logic.state) {
    case INITIALIZATION:
        node.objects["ob"] =
            m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
        if(!node.objects["ob"]) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }

        node.state = NPS_NOT_STARTED;

        node.obj_state = {
            space: NST_WORLD,
            tsr_start: new Float32Array(8),
            tsr_end: new Float32Array(8),
            interp_tsr: new Float32Array(8)
        };

        break;
    case RUNNING:
        var obj = node.objects["ob"];

        switch (node.state) {
        case NPS_NOT_STARTED:
            var tr = _vec3_tmp1;
            tr[0] = node.bools["trx"] ?
                convert_variable(get_var(node.vars['trx'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["trx"];
            tr[1] = node.bools["try"] ?
                convert_variable(get_var(node.vars['try'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["try"];
            tr[2] = node.bools["trz"] ?
                convert_variable(get_var(node.vars['trz'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["trz"];
            //euler angles rotation
            var eul_rot =  _vec3_tmp
            eul_rot[0] = node.bools["rox"] ?
                convert_variable(get_var(node.vars['rox'], logic.variables, thread_state.variables), NT_NUMBER) * Math.PI / 180 : node.floats["rox"];
            eul_rot[1] = node.bools["roy"] ?
                convert_variable(get_var(node.vars['roy'], logic.variables, thread_state.variables), NT_NUMBER) * Math.PI / 180 : node.floats["roy"];
            eul_rot[2] = node.bools["roz"] ?
                convert_variable(get_var(node.vars['roz'], logic.variables, thread_state.variables), NT_NUMBER) * Math.PI / 180 : node.floats["roz"];
            var sc = node.bools["sc"] ? get_var(node.vars['sc'], logic.variables, thread_state.variables) : node.floats["sc"]
            
            m_util.euler_to_quat(eul_rot, _vec4_tmp);
            m_tsr.set_sep(
                tr,
                sc,
                _vec4_tmp,
                node.obj_state.tsr_end
            );

            node.obj_state.space = node.common_usage_names["space_type"];
            switch (node.obj_state.space) {
                case NST_WORLD:
                    m_trans.get_tsr(obj, node.obj_state.tsr_start);
                    break;
                case NST_PARENT:
                    m_trans.get_tsr_rel(obj, node.obj_state.tsr_start);
                    break;
                case NST_LOCAL:
                    m_trans.get_tsr_rel(obj, node.obj_state.tsr_start);
                    m_tsr.multiply(node.obj_state.tsr_start, node.obj_state.tsr_end, node.obj_state.tsr_end)
                    break;
            }

            var dur = node.bools["dur"] ?
                convert_variable(get_var(node.vars['dur'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["dur"];
            if (dur == 0.0) {
                transform_obj(obj, node.obj_state.tsr_end, node.obj_state.space);
                thread_state.curr_node = node.slot_idx_order;
                return;
            }

            node.state = NPS_PLAYING;
            var trans_animator = m_time.animate(0, 1, dur * 1000, function(e) {
                if (m_scs.check_active()) {
                    m_tsr.interpolate(node.obj_state.tsr_start, node.obj_state.tsr_end,
                            m_util.smooth_step(e), node.obj_state.interp_tsr);

                    transform_obj(obj, node.obj_state.interp_tsr, node.obj_state.space);

                    if (e == 1)
                       node.state = NPS_FINISHED;
               }
            });
            break;
        case NPS_PLAYING:
            // interpolation is in progress
            break;
        case NPS_FINISHED:
            // end
            m_time.clear_animation(trans_animator);
            node.state = NPS_NOT_STARTED;
            thread_state.curr_node = node.slot_idx_order;
            break;
        }
        break;
    }
}

function speaker_play_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        node.obj = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
        if(!node.obj) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
        if (node.bools["not_wait"] == undefined)
            node.bools["not_wait"] = true;
        break;
    case RUNNING:
        if (!m_sfx.is_playing(node.obj)) {
            if (node.state == NPS_PLAYING)
                node.state = NPS_FINISHED;
        }
        switch (node.state) {
        case NPS_NOT_STARTED:
            // this node is not playing
            // check other threads
            for (var k in logic.logic_threads) {
                var curr_node = logic.logic_threads[k].thread_state.curr_node;
                if (curr_node != -1) { // case when the thread is already stopped
                    var node2 = logic.logic_threads[k].nodes[curr_node];
                    if (node2.type == "SPEAKER_PLAY" && node2!= node && node2.state == NPS_PLAYING && node2.obj == node.obj)
                        node2.state = NPS_FINISHED;
                }
            }

            // blocking selection
            if (!node.bools["not_wait"])
                thread_state.in_progress = true;

            m_sfx.play_def(node.obj);
            node.state = NPS_PLAYING;
            break;
        case NPS_PLAYING:
            // playing
            if (node.bools["not_wait"]) {
                thread_state.curr_node = node.slot_idx_order;
                node.state = NPS_NOT_STARTED;
            }
            break;
        case NPS_FINISHED:
            // end playing
            if (!node.bools["not_wait"])
                thread_state.in_progress = false;
            thread_state.curr_node = node.slot_idx_order;
            node.state = NPS_NOT_STARTED;
            break;
        default:
            m_util.panic("Unknown state of " + node.name);
            node.state = NPS_NOT_STARTED;
            break;
        }
    }
}

function speaker_stop_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        node.obj = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
        if(!node.obj) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
        break;
    case RUNNING:
        m_sfx.stop(node.obj);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function set_shader_node_param_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        if (node.objects_paths["id0"]) {
            node.objects["id0"] = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
            if(!node.objects_paths["id0"]) {
                m_print.error("Logic script error: object not found. Node: ", node.name);
                node.mute = true;
            }
            node.nodes_paths["id0"].unshift(node.materials_names["id0"])
        }
        break;
    case RUNNING:

        var obj = node.objects["id0"];
        var name_list = node.nodes_paths["id0"]

        var mat_name = name_list[0];
        var batch_main = m_batch.find_batch_material(obj, mat_name, "MAIN");

        thread_state.curr_node = node.slot_idx_order;

        if (batch_main === null) {
            m_print.error("Material \"" + mat_name +
                          "\" was not found in the object \"" + obj.name + "\".");
            return;
        }

        if (node.shader_nd_type == "ShaderNodeRGB") {
            var ind = m_batch.get_node_ind_by_name_list(batch_main.node_rgb_inds,
                                                        name_list);
            m_batch.set_nodemat_rgb(obj, mat_name, ind,
                node.bools["id0"] ?
                    convert_variable(get_var(node.vars["id0"], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["id0"],
                node.bools["id1"] ?
                    convert_variable(get_var(node.vars["id1"], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["id1"],
                node.bools["id2"] ?
                    convert_variable(get_var(node.vars["id2"], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["id2"]);
        }

        if (node.shader_nd_type == "ShaderNodeValue") {
            var ind = m_batch.get_node_ind_by_name_list(batch_main.node_value_inds,
                                                        name_list);
            m_batch.set_nodemat_value(obj, mat_name, ind,
                node.bools["id0"] ?
                    convert_variable(get_var(node.vars["id0"], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["id0"]);
        }
        break;
    }
}

function math_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case RUNNING:
        var val1 = (node.vars["v1"][1] == -1) ? node.floats["inp1"] : convert_variable(
            get_var(node.vars["v1"], logic.variables, thread_state.variables), NT_NUMBER);
        var val2 = (node.vars["v2"][1] == -1) ? node.floats["inp2"] : convert_variable(
            get_var(node.vars["v2"], logic.variables, thread_state.variables), NT_NUMBER);
        var result = 0;
        switch (node.op) {
        case "ADD":
            result = val1 + val2;
            break;
        case "MUL":
            result = val1 * val2;
            break;
        case "SUB":
            result = val1 - val2;
            break;
        case "DIV":
            if (val2 == 0)
                m_util.panic("Division by zero in Logic script");

            result = val1 / val2;
            break;
        case "RAND":
            result = Math.random() * (val2 - val1) + val1;
            break;
        }

        set_var(node.vars["vd"], logic.variables, thread_state.variables, result);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function conditional_jump_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case RUNNING:
        var arg_type = node.bools["str"] ? NT_STRING : NT_NUMBER;
        var arg_arr = node.bools["str"] ? node.strings : node.floats;

        var val1 = (node.vars["v1"][1] == -1) ? arg_arr["inp1"] : convert_variable(
            get_var(node.vars["v1"], logic.variables, thread_state.variables), arg_type);
        var val2 = (node.vars["v2"][1] == -1) ? arg_arr["inp2"] : convert_variable(
            get_var(node.vars["v2"], logic.variables, thread_state.variables), arg_type);
        var cond_result = false;

        switch (node.common_usage_names["condition"]) {
        case NC_EQUAL:
            if (val1 == val2)
                cond_result = true;
            break;
        case NC_NOTEQUAL:
            if (val1 != val2)
                cond_result = true;
            break;
        case NC_LESS:
            if (val1 < val2)
                cond_result = true;
            break;
        case NC_GREATER:
            if (val1 > val2)
                cond_result = true;
            break;
        case NC_LEQUAL:
            if (val1 <= val2)
                cond_result = true;
            break;
        case NC_GEQUAL:
            if (val1 >= val2)
                cond_result = true;
            break;
        }

        if (cond_result)
            thread_state.curr_node = node.slot_idx_jump;
        else
            thread_state.curr_node = node.slot_idx_order;

        break;
    }
}

function regstore_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case RUNNING:
        var arg_arr = node.common_usage_names["variable_type"] == NT_STRING ? node.strings : node.floats;
        set_var([node.bools["gl"] || node.vars["vd"][0], node.vars["vd"][1]], logic.variables, thread_state.variables, arg_arr["inp1"]);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function play_anim_handler(node, logic, thread_state, timeline, elapsed, start_time) {

    function check_anim(obj, anim_name) {
        var status = 0;
        for (var i = 0; i < 8; i++) {
            var anim_slot = obj.anim_slots[i];
            if (anim_slot && anim_slot.animation_name) {
                if (m_anim.strip_baked_suffix(anim_slot.animation_name) == m_anim.strip_baked_suffix(anim_name))
                    if (status == 0)
                        status = 1;
                    else
                        return false;
            }
        }
        if (status == 1)
            return true;
        else
            return false;
    }

    switch (logic.state) {
    case INITIALIZATION:
        node.obj = node.bools["env"] ? get_world(node) : get_object(node);
        if(!node.obj) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
        break;
    case RUNNING:

        if (node.state == NPS_PLAYING && !m_anim.is_play(node.obj, node.anim_slot))
            node.state = NPS_FINISHED;

        switch (node.state) {
        case NPS_NOT_STARTED:
            // this node is not playing
            // check other threads
            for (var k in logic.logic_threads) {
                var curr_node = logic.logic_threads[k].thread_state.curr_node;
                if (curr_node != -1) { // case when the thread is already stopped
                    var node2 = logic.logic_threads[k].nodes[curr_node];
                    if (node2.type == "PLAY_ANIM" && node2 != node && node2.state == NPS_PLAYING && node2.obj == node.obj)
                        node2.state = NPS_FINISHED;
                }
            }

            var behavior = node.common_usage_names["param_anim_behavior"];
            if (node.anim_name == "") {
                // TODO make check_anim for default animation
                m_anim.apply_def(node.obj);
                m_anim.set_behavior(node.obj, behavior, node.anim_slot);
            } else if (!check_anim(node.obj, node.anim_name)) {
                node.anim_slot = m_anim.slot_by_anim_type(node.obj, node.anim_name);
                m_anim.apply(node.obj, null, node.anim_name, node.anim_slot);
                m_anim.set_behavior(node.obj, behavior, node.anim_slot);
            }

            // blocking selection
            if (!node.bools["not_wait"])
                thread_state.in_progress = true;

            m_anim.play(node.obj, null, node.anim_slot);
            node.state = NPS_PLAYING;

            // if we can we must switch to the next node immediately
            // else there could be a conflict between nodes of such type
            if (node.bools["not_wait"]) {
                thread_state.curr_node = node.slot_idx_order;
                node.state = NPS_NOT_STARTED;
            }
            break;
        case NPS_PLAYING:
            // playing
            // do nothing
            break;
        case NPS_FINISHED:
            // end playing
            if (!node.bools["not_wait"])
                thread_state.in_progress = false;
            thread_state.curr_node = node.slot_idx_order;
            node.state = NPS_NOT_STARTED;
            break;
        default:
            m_util.panic("Unknown state of " + node.name);
            node.state = NPS_NOT_STARTED;
            break;
        }
        break;
    }
}

function stop_anim_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        node.obj = node.bools["env"] ? get_world(node) : get_object(node);
        if(!node.obj) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
        break;
    case RUNNING:
        m_anim.stop(node.obj, m_anim.SLOT_ALL);
        if (node.bools["rst"])
            m_anim.set_first_frame(node.obj, m_anim.SLOT_ALL);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function string_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case RUNNING:
        var op1 = node.bools["id0"] ? convert_variable(
            get_var(node.vars['id0'], logic.variables, thread_state.variables), NT_STRING) : node.strings["id0"];
        var op2 = node.bools["id1"] ? convert_variable(
            get_var(node.vars['id1'], logic.variables, thread_state.variables), NT_STRING) : node.strings["id1"];
        var result = 0;
        switch (node.common_usage_names["string_operation"]) {
        case NSO_JOIN:
            result = op1 + op2;
            break;
        case NSO_FIND:
            result = op1.indexOf(op2);
            break;
        case NSO_REPLACE:
            var op3 = node.bools["id2"] ? convert_variable(
                get_var(node.vars['id2'], logic.variables, thread_state.variables), NT_STRING) : node.strings["id2"];
            result = op1.replace(op2, op3);
            break;
        case NSO_SPLIT:
            var vars = node.vars;
            result  = op1.substring(0, op1.indexOf(op2));
            set_var(vars['dst1'], logic.variables, thread_state.variables,
                op1.substring(op1.indexOf(op2)+1, op1.length))
            //if splitter not found keep result in main destination
            if(get_var(vars['dst'], logic.variables, thread_state.variables) == "") {
                result = get_var(vars['dst1'], logic.variables, thread_state.variables);
                set_var(vars['dst1'], logic.variables, thread_state.variables, "");
            }
            break;        
        case NSO_COMPARE:
            switch (node.common_usage_names["condition"]) {
            case NC_EQUAL:
                result = op1 == op2 ? 1 : 0;
                break;
            case NC_NOTEQUAL:
                result = op1 != op2 ? 1 : 0;
                break;
            case NC_LESS:
                result = op1 < op2 ? 1 : 0;
                break;
            case NC_GREATER:
                result = op1 > op2 ? 1 : 0;
                break;
            case NC_LEQUAL:
                result = op1 <= op2 ? 1 : 0;
                break;
            case NC_GEQUAL:
                result = op1 >= op2 ? 1 : 0;
                break;
            }
            break;
        }

        set_var(node.vars['dst'], logic.variables, thread_state.variables, result);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function get_timeline_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case RUNNING:
        var curr_frame = node.bools["nla"] ? convert_variable(m_nla.get_frame(timeline), NT_NUMBER)
                                             : convert_variable(m_time.get_frame(timeline), NT_NUMBER);

        set_var(node.vars["vd"], logic.variables, thread_state.variables, curr_frame);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function json_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    function get_json_deep_values(src_json, parse_paths, parse_vars, dest_vars) {
        for(var i = 0; i < parse_paths.length; i++) {
            var full_path = parse_paths[i];
            var path_steps = full_path.split('.');
            var deep_value = src_json;
            var dest_name = parse_vars[i];

            for(var j = 0; j < path_steps.length; j++) {
                deep_value = deep_value[path_steps[j]];

                if(deep_value === undefined || deep_value === null)
                    break; 
            }

            deep_value = convert_b4w_type(deep_value);
            dest_vars[dest_name] = deep_value;
        }

    }
    function encode_json_deep_values(src_vars, encode_paths, encode_vars, dest_json) {
        if(!dest_json)
            dest_json = {};

        for(var i = 0; i < encode_paths.length; i++) {
            var full_path = encode_paths[i];
            var path_steps = full_path.split('.');
            var deep_value = dest_json;
            var src_name = encode_vars[i];

            if (!src_name in src_vars)
                continue;

            for(var j = 0; j < path_steps.length - 1; j++) {
                if(deep_value[path_steps[j]] === undefined)
                    if (isNaN(path_steps[j+1]))
                        deep_value[path_steps[j]] = {};
                    else
                        deep_value[path_steps[j]] = [];

                deep_value = deep_value[path_steps[j]];
            }

            var last_path_step = path_steps[path_steps.length -1];
            deep_value[last_path_step] = convert_b4w_type(src_vars[src_name]);
        }
    }


    switch (logic.state) {
    case RUNNING:
        switch (node.common_usage_names["json_operation"]) {
        case"PARSE":
            //JSON parsing errors shield
            try {
                var src_json_string = convert_variable(get_var(node.vars["jsn"], logic.variables, thread_state.variables), NT_STRING);
                var src_json = JSON.parse(src_json_string);

                get_json_deep_values(src_json, node.parse_json_paths, node.parse_json_vars, thread_state.variables);

            } catch(e) {
                m_print.error("logic script error: non valid JSON string");
            }
            break;
        case "ENCODE":
            var dest_json = {};
            encode_json_deep_values(thread_state.variables, node.encode_json_paths, node.encode_json_vars, dest_json);

            var dest_json_string = convert_variable(JSON.stringify(dest_json), NT_STRING);
            set_var(node.vars["jsn"], logic.variables, thread_state.variables, dest_json_string);
            break;
        }
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function js_callback_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case RUNNING:
        var cb_id = node.bools["cb"] ? convert_variable(
            get_var(node.vars["cb"], logic.variables, thread_state.variables), NT_STRING) : node.strings["cb"];

        var in_params = [];
        var index = 0;
        var key = "id" + index;
        var param;
        var in_types_dict = node.common_usage_names["js_cb_params"];
        while (key in in_types_dict) {
            if (in_types_dict[key] == NCPT_OBJECT)
                param =  m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths[key], 0);
            else
                param = get_var(node.vars[key], logic.variables, thread_state.variables);

            in_params.push(param);
            index++;
            key = "id" + index;
        }

        var out_params = [];
        index = 0;
        key = "out" + index;
        while (key in node.vars) {
            param = get_var(node.vars[key], logic.variables, thread_state.variables);
            out_params.push(param);
            index++;
            key = "out" + index;
        }

        var ret = 1;
        if (cb_id in _logic_custom_cb_arr) {

            ret = !_logic_custom_cb_arr[cb_id](in_params, out_params);
            if (ret) {
                for (var i = 0; i < out_params.length; i++) {
                    key = "out" + i;
                    if (key in node.vars)
                    set_var(node.vars[key], logic.variables, thread_state.variables, convert_b4w_type(out_params[i]));
                }
            }
        } else
            m_print.error("logic script error: no custom callback with id " + cb_id);

        if (ret)
            thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function process_logic_thread(thread, logic, timeline, elapsed, start_time) {
    var script =  thread.nodes;
    if (!script.length)
        return;

    /* Reset "processed"*/
    for (var i = 0; i < script.length; i++) {
        script[i].processed = false
    }
    for (var i = 0; i < script.length; i++) {
        if (thread.thread_state.curr_node >= 0)
            var node = script[thread.thread_state.curr_node];
        else
            return;
        if (node.processed)
            return;
        if (!node.mute) {
            node.process_node(node, logic, thread.thread_state, timeline, elapsed, start_time);
            node.processed = true;
        } else {
            if (node.type == "ENTRYPOINT") {
                return;
            } else {
                thread.thread_state.curr_node = node.slot_idx_order;
                node.processed = true;
                continue;
            }
        }
    }
}

function prepare_logic(scene, logic) {
    var bpy_logic_threads = scene["b4w_logic_nodes"];
    var logic_threads = logic.logic_threads;
    logic.state = INITIALIZATION;
    for (var k = 0; k < bpy_logic_threads.length; k++) {
        var thread = {
            nodes: [],
            thread_state: {
                scene: scene,
                curr_node: 0,
                in_progress: false, // used for selection blocking during Play Anim
                                    // in cases when "Do Not Wait" is not checked
                                    // or during Delay
                thread_index: k,
                variables: {
                    "R1": 0,
                    "R2": 0,
                    "R3": 0,
                    "R4": 0,
                    "R5": 0,
                    "R6": 0,
                    "R7": 0,
                    "R8": 0
                }
            }
        };
        logic_threads.push(thread);
        var logic_script = logic_threads[logic_threads.length - 1];
        var subtree = bpy_logic_threads[k];
        for (var i = 0; i < subtree.length; i++) {
            var snode = subtree[i];
            var node = init_node(snode, logic_script);
            // just copy all
            logic_script.nodes.push(node);
        }
        for (var l = 0; l < logic_script.nodes.length; l++) {
            node = logic_script.nodes[l];
            // NOTE: additional checks for objects inside node handlers
            // are for objects from non-exported scenes and other difficult to prevent stuff
            if(!node.mute)
                node.process_node(node, logic, thread.thread_state, 0, 0);
        }
    }
    var markers = scene["timeline_markers"];
    for (var key in markers) {
        logic.sorted_markers_values.push(markers[key]);
    }
    function sortNumber(a,b)
    {
        return a - b;
    }
    logic.sorted_markers_values.sort(sortNumber);
    logic.state = RUNNING;
    _logic_arr.push(logic)
}

function convert_variable(variable, type) {
    switch (type) {
    case NT_NUMBER:
        return Boolean(Number(variable)) ? Number(variable) : 0;
    case NT_STRING:
        return String(variable);
    default: 
        return null;
    }
}

function convert_b4w_type(variable) {
    switch (typeof(variable)) {
    case "string":
        return convert_variable(variable, NT_STRING);
    case "number":
        return convert_variable(variable, NT_NUMBER);

    default:
        return convert_variable(variable, NT_STRING);
    }
}

exports.cleanup = function() {
    _logic_arr.length = 0;
    _logic_custom_cb_arr = {};
}
}
