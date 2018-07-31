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
/**
 * Created by dal on 04.09.15.
 */
import register from "../util/register.js";

import m_anim_fact from "./animation.js";
import m_assert_fact from "../util/assert.js";
import m_assets_fact from "./assets.js";
import m_cam_fact from "./camera.js";
import m_nla_fact from "./nla.js";
import m_obj_fact from "./objects.js";
import m_print_fact from "./print.js";
import m_scs_fact from "./scenes.js";
import m_cfg_fact from "./config.js";
import m_ctl_fact from "./controls.js";
import m_batch_fact from "./batch.js";
import m_geom_fact from "./geometry.js";
import * as m_mat3 from "../libs/gl_matrix/mat3.js";
import * as m_mat4 from "../libs/gl_matrix/mat4.js";
import m_phy_fact from "./physics.js";
import * as m_quat from "../libs/gl_matrix/quat.js";
import m_sfx_fact from "./sfx.js";
import m_time_fact from "./time.js";
import m_trans_fact from "./transform.js";
import * as m_tsr from "./tsr.js";
import * as m_util from "./util.js";
import * as m_vec3 from "../libs/gl_matrix/vec3.js";
import m_obj_util_fact from "./obj_util.js";

/**
 * Logic Nodes scheduler module.
 * @name logic_nodes
 * @namespace
 * @exports exports as logic_nodes
 */
function Int_logic_nodes(ns, exports) {

var m_anim      = m_anim_fact(ns);
var m_assert    = m_assert_fact(ns);
var m_assets    = m_assets_fact(ns);
var m_cam       = m_cam_fact(ns);
var m_nla       = m_nla_fact(ns);
var m_obj       = m_obj_fact(ns);
var m_print     = m_print_fact(ns);
var m_scs       = m_scs_fact(ns);
var m_cfg       = m_cfg_fact(ns);
var m_ctl       = m_ctl_fact(ns);
var m_batch     = m_batch_fact(ns);
var m_geom      = m_geom_fact(ns);
var m_phy       = m_phy_fact(ns);
var m_sfx       = m_sfx_fact(ns);
var m_time      = m_time_fact(ns);
var m_trans     = m_trans_fact(ns);
var m_obj_util  = m_obj_util_fact(ns);

var _vec4_tmp  = new Float32Array(4);
var _vec3_tmp  = new Float32Array(3);
var _vec3_tmp1 = new Float32Array(3);
var _vec3_tmp2 = m_vec3.create();
var _vec3_tmp3 = m_vec3.create();
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

/**
 * Node State by type
 */
// Playing state(Animation, Transformation, Timeline, Sound etc)
var NPS_NOT_STARTED  = -1;
var NPS_PLAYING      = 0;
var NPS_FINISHED     = 1;
// Switch Select
var NSS_NOT_READY_QUITE = -3;
var NSS_NOT_READY       = -2;   // force minimum 1 frame between sensors creation for correct accumulator work
var NSS_READY           = -1;
var NSS_MISS            = 0;
var NSS_HIT             = 1;
// Send Request
var NSR_NOT_STARTED          = -1;
var NSR_SENDING_REQUEST      = 0;
var NSR_RESPONSE_RECEIVED    = 1;

/**
 * Formats for convert_variable
 */
var NT_NUMBER = 0;
var NT_STRING = 1;
var NT_OBJECT = 2;
exports.NT_NUMBER = NT_NUMBER;
exports.NT_STRING = NT_STRING;
exports.NT_OBJECT = NT_OBJECT;

/**
 * Keep node constants synchronized with:
 *   exporter.py : process_scene_nla
 *   reformer.js : assign_logic_nodes_object_params
 */

/**
 * Node math operations
 */
var NMO_DIV    = 0;
var NMO_SUB    = 1;
var NMO_MUL    = 2;
var NMO_ADD    = 3;
var NMO_RAND   = 4;
var NMO_SIN    = 5;
var NMO_COS    = 6;
var NMO_TAN    = 7;
var NMO_ARCSIN = 8;
var NMO_ARCCOS = 9;
var NMO_ARCTAN = 10;
var NMO_LOG    = 11;
var NMO_MIN    = 12;
var NMO_MAX    = 13;
var NMO_ROUND  = 14;
var NMO_MOD    = 15;
var NMO_ABS    = 16;
exports.NMO_DIV    = NMO_DIV;
exports.NMO_SUB    = NMO_SUB;
exports.NMO_MUL    = NMO_MUL;
exports.NMO_ADD    = NMO_ADD;
exports.NMO_RAND   = NMO_RAND;
exports.NMO_SIN    = NMO_SIN;
exports.NMO_COS    = NMO_COS;
exports.NMO_TAN    = NMO_TAN;
exports.NMO_ARCSIN = NMO_ARCSIN;
exports.NMO_ARCCOS = NMO_ARCCOS;
exports.NMO_ARCTAN = NMO_ARCTAN;
exports.NMO_LOG    = NMO_LOG;
exports.NMO_MIN    = NMO_MIN;
exports.NMO_MAX    = NMO_MAX;
exports.NMO_ROUND  = NMO_ROUND;
exports.NMO_MOD    = NMO_MOD;
exports.NMO_ABS    = NMO_ABS;

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
    "SET_CAMERA_LIMITS": set_camera_limits_handler,
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
    "EMPTY": do_nothing_handler,
    "DATE_TIME": date_time_handler,
    "ELAPSED": elapsed_handler,
    "CALL_FUNC": call_func_handler,
    "DEF_FUNC": do_nothing_handler,
    "SWITCH": switch_handler
};

var _logic_arr = [];

var _logic_custom_cb_arr = {};

var _node_ident_counters = {};

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
        param_name: snode["param_name"],
        op: snode["operation"],
        mute: snode["mute"],
        dupli_name_list: snode["object"],
        anim_name: snode["anim_name"],
        parse_json_vars: snode["parse_json_vars"],
        parse_json_paths: snode["parse_json_paths"],
        objects_paths: snode["objects_paths"],
        nodes_paths: snode["nodes_paths"],
        floats: snode["floats"],
        bools: snode["bools"],
        vars: snode["variables"],
        strings: snode["strings"],
        logic_functions: snode["logic_functions"],
        logic_node_trees: snode["logic_node_trees"],
        materials_names: snode["materials_names"],
        shader_nd_type: snode["shader_nd_type"],
        common_usage_names: snode["common_usage_names"],
        encode_json_vars: snode["encode_json_vars"],
        encode_json_paths: snode["encode_json_paths"],
        thread: logic_script,
        process_node: _nodes_handlers[snode["type"]] ? _nodes_handlers[snode["type"]] : unknown_node_handler,
        processed: false,
        links_dict: snode["links"],
        instances: [],
        func_id: -1,
        links_keys: null,
        select_object_idx: -1
    };

    return node;
}

function get_node_instance(node, thread_state, init_cb) {
    function new_inst() {
        return {
            objects: {},
            slot_idx_jump: -1,
            state: NPS_NOT_STARTED,
            sel_obj_idxs: [],
            timer: -1,
            camera_state: {},
            anim_slot: m_anim.SLOT_ALL,
            obj_state: null
        }
    }
    var extend_len = (thread_state.thread_index + 1) - node.instances.length;
    if (extend_len > 0) {
        for (var i = 0; i < extend_len; i++) {
            node.instances.push(0);
        }
    }
    if (!node.instances[thread_state.thread_index]) {
        node.instances[thread_state.thread_index] = new_inst();
        if (init_cb)
            init_cb(node, node.instances[thread_state.thread_index], thread_state);
    }
    return node.instances[thread_state.thread_index];

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
        logic_functions: [],
        sorted_markers_values: [],
        variables: {},
        variables_references: {} // used in CALL_FUNC to merge return-type values
                                 // at the end of call
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
                    // run entry point if it is not started yet or already completed
                    if (ep.bools["js"] && [0, -1].indexOf(logic.logic_threads[j].thread_state.curr_node) >= 0) {
                        ep.mute  = false;
                        logic.logic_threads[j].thread_state.curr_node = 0;
                    }
                    break;
                }
            }
            break;
        }
    }
}

function reset_play(thread) {
    var callstack = thread.thread_state.callstack;
    var len = callstack.length;
    var scripts = []
    if (len <= 1) {
        scripts.push(thread.nodes);
    }
    for (var k = 1; k < len; k++) {
        scripts.push(callstack[k].logic_func.func.nodes);
    }

    for (var k = 0; k < scripts.length; k++) {
        for (var i = 0; i < scripts[k].length; i++) {
            var node = scripts[k][i];
            if (node.type == "PLAY") {
                var inst = get_node_instance(node, thread.thread_state);
                inst.state = NPS_NOT_STARTED;
            }
        }
    }
}

function reset_selections(thread, exclude_node) {
    var script = thread.nodes;
    for (var i = 0; i < script.length; i++) {
        var node = script[i];
        if (node.type == "SWITCH_SELECT" && node != exclude_node) {
            var inst = get_node_instance(node, thread.thread_state);
            inst.state = NSS_NOT_READY_QUITE;
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

function get_world(node) {
    return m_obj.get_world_by_name(node.dupli_name_list[0], 0);
}

function entrypoint_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case RUNNING:
        // init callstack
        if (thread_state.callstack.length == 0) {
            thread_state.callstack.push({
                caller_node: null,
                variables: thread_state.variables,
                logic_func: null});
        }
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function hide_object_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    var is_var = node.bools["id0"];
    function init(node, inst, thread_state) {
        if (!is_var) {
            inst.obj = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
            if(!inst.obj) {
                m_print.error("Logic script error: object not found. Node: ", node.name);
                node.mute = true;
            }
        }
    }
    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        var inst = get_node_instance(node, thread_state, init);
        var obj = is_var ? get_var(node.vars["id0"], logic.variables, thread_state.variables) : inst.obj;
        var process_child = node.bools["ch"];
        if (process_child)
            m_scs.change_visibility_rec(obj, true);
        else
            m_scs.change_visibility(obj, true);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}
function show_object_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    var is_var = node.bools["id0"];
    function init(node, inst, thread_state) {
        if (!is_var) {
            inst.obj = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
            if(!inst.obj) {
                m_print.error("Logic script error: object not found. Node: ", node.name);
                node.mute = true;
            }
        }
    }
    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        var inst = get_node_instance(node, thread_state, init);
        var obj = is_var ? get_var(node.vars["id0"], logic.variables, thread_state.variables) : inst.obj;
        var process_child = node.bools["ch"];
        if (process_child)
            m_scs.change_visibility_rec(obj, false);
        else
            m_scs.change_visibility(obj, false);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}
function pageparam_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case RUNNING:
        set_var(node.vars["id0"], logic.variables, thread_state.variables,
            get_url_param(node.param_name, node.floats["ptp"], node.bools["hsh"]));
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function select_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        m_print.error("Logic script error: node is deprecated. Node: ", node.name);
        node.mute = true;
        break;
    }
}

var gen_switch_select_cb = function() {
    return function (obj, id, pulse, param) {
        var node = param[0];
        var logic = param[1];
        var thread = param[2];
        var inst = get_node_instance(node, thread.thread_state);
        if (inst.state != NSS_READY)
            return;
        for (var i = 0; i < inst.sel_objs_len; i++) {
            var val = m_ctl.get_sensor_value(obj, id, i);
            if (val) {
                for (var j = 0; j < inst.sel_obj_idxs.length; j++) {
                    if (inst.sel_obj_idxs[j] == i) {
                        if (logic.nla_thread == inst.thread) {
                            if (m_nla.is_play(logic._nla))
                                inst.state = NSS_NOT_READY_QUITE;
                            if (!(thread.thread_state.in_progress)) {
                                inst.state = NSS_HIT;
                                inst.slot_idx_jump = inst.links_idxs[j];
                            }
                        } else {
                            inst.state = NSS_HIT;
                            inst.slot_idx_jump = inst.links_idxs[j];
                        }
                        inst.select_object_idx = i;
                        return;
                    }
                }
                inst.select_object_idx = i;
            }
        }
        inst.state = NSS_MISS;
    }
};

function create_switch_select_sensor(node, logic, thread) {
    var sel_objs = m_obj.get_selectable_objects();
    var inst = get_node_instance(node, thread.thread_state);
    inst.sel_obj_idxs = [];
    inst.links_idxs = [];
    for (var key in node.objects_paths) {
        var obj = node.bools[key] ?
        get_var(node.vars[key], logic.variables, thread.thread_state.variables) :
        m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths[key], 0);
        var obj_idx = sel_objs.indexOf(obj);
        if (obj_idx == -1) {
            m_print.error("logic script error: non-selectable object:",
                node.objects_paths[key][node.objects_paths[key].length -1]);
            return -1;
        }
        inst.sel_obj_idxs.push(obj_idx);
        inst.links_idxs.push(node.links_dict[key]);
    }
    inst.sel_objs_len = sel_objs.length;

    var sel_sensors = [];
    for (var j = 0; j < sel_objs.length; j++) {
        sel_sensors.push(m_ctl.create_selection_sensor(sel_objs[j], false));
    }
    var select_cb = gen_switch_select_cb();
    m_ctl.create_sensor_manifold(null, "LOGIC_NODES_SWITCH_SELECT_" + node_ident(node.label), m_ctl.CT_SHOT,
        sel_sensors, m_ctl.default_OR_logic_fun, select_cb, [node, logic, thread]);
}

function switch_select_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    function init(node, inst, thread_state) {
        inst.state = NSS_NOT_READY_QUITE;
    }
    // state:
    //        -2: not ready, needs sensor reset
    //        -1: ready
    //         0: Miss
    //         1: Hit
    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        var inst = get_node_instance(node, thread_state, init);
        if (inst.state == NSS_NOT_READY_QUITE) {
            inst.state = NSS_NOT_READY;
            reset_selections(logic.logic_threads[thread_state.thread_index], node);
            create_switch_select_sensor(node, logic, logic.logic_threads[thread_state.thread_index]);
        } else if (inst.state == NSS_NOT_READY) {
            inst.state = NSS_READY;
        } else if (inst.state == NSS_MISS || inst.state == NSS_HIT) {
            if (node.vars["vd"] && node.vars["vd"][1]) {
                var sel_objs = m_obj.get_selectable_objects();
                set_var(node.vars["vd"], logic.variables, thread_state.variables, sel_objs[inst.select_object_idx]);
            }
            thread_state.curr_node = inst.state ? inst.slot_idx_jump : node.slot_idx_order;
            inst.state = NSS_NOT_READY_QUITE;
            m_ctl.remove_sensor_manifold(null, "LOGIC_NODES_SWITCH_SELECT_" + node_ident(node.label));
            break;
        }
        break;
    }
}

function switch_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        var keys = Object.keys(node.vars);
        for (var k in keys) {
            if (!keys[k].startsWith("id")) {
                keys.splice(k, 1);
            }
        }
        node.links_keys = keys;
        break;
    case RUNNING:
        var v1 = get_var(node.vars["v"], logic.variables, thread_state.variables);
        for (var k in node.links_keys) {
            var param = node.vars[node.links_keys[k]];
            var v2 = get_var(param, logic.variables, thread_state.variables);
            if (v1 == v2) {
                thread_state.curr_node = node.links_dict[node.links_keys[k]];
                return;
            }
        }
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function play_timeline_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        m_nla.stop_nla();
        if (!node.bools["not_wait"])
            node.bools["not_wait"] = false;
        break;
    case RUNNING:
        var inst = get_node_instance(node, thread_state);
        switch (inst.state) {
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
                        var nla_nodes = get_thread_nodes(thread);
                        var nla_nd = nla_nodes[thread.thread_state.curr_node];
                        thread.thread_state.curr_node = nla_nd.slot_idx_order;
                        reset_play(logic.nla_thread);
                    }
                }
            }
            thread_state.in_progress = !node.bools["not_wait"];

            logic.nla_thread = logic.curr_thread;
            inst.state = NPS_PLAYING;
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
                inst.state = NPS_NOT_STARTED;
                thread_state.in_progress = false;
            }
            //
            break;
        case NPS_PLAYING:
            // playing
            if (!m_nla.is_play()) {
                thread_state.curr_node = node.slot_idx_order;
                inst.state = NPS_NOT_STARTED;
                thread_state.in_progress = false;
            }
            break;
        case NPS_FINISHED:
            thread_state.curr_node = node.slot_idx_order;
            inst.state = NPS_NOT_STARTED;
            logic.nla_thread = null;
            thread_state.in_progress = false;
            break;
        default:
            m_assert.panic("Unknown state of " + node.name);
            inst.state = NPS_NOT_STARTED;
            break;
        }
        break;
    }
}

function console_print_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case RUNNING:
        var j = 0;
        var result = "{"
        for (var i in node.vars) {
            if (j > 0)
                result += ", ";
            var key = node.vars[i][1];
            var val = get_var(node.vars[i], logic.variables, thread_state.variables);

            result += "\"" + key + "\": ";
            try {
                result += JSON.stringify(val)
            } catch(e) {
                if (val)
                    result += "{\"name\": \""+ val.name + "\", \"type\": \"" + val.type + "\"}";
                else
                    result += "Object";
            }
            ++j;
        }
        result += "}";
        m_print.log(node.common_usage_names["msg"], result)
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
    var inst = get_node_instance(node, thread_state);
    function asset_cb(loaded_data, id, type, url, param) {
        var resp_string = JSON.stringify(loaded_data);
        var node = param[0];
        var thread_state = param[1];
        var inst = get_node_instance(node, thread_state);
        set_var(param[0].vars["dst"], logic.variables, thread_state.variables, resp_string);
        inst.state = 1;
    }

    switch (logic.state) {
    case RUNNING:
        switch (inst.state) {
        case NSR_NOT_STARTED:
            inst.state = NSR_SENDING_REQUEST;
            var url = node.bools["url"] ? convert_variable(
                    get_var(node.vars['url'], logic.variables, thread_state.variables), NT_STRING) : node.strings["url"];

            var header = {};
            if (node.bools["ct"])
                header["Content-Type"] = node.strings["ct"];
            if (node.common_usage_names["request_type"] == "GET") {
                m_assets.enqueue([{id:url, type:m_assets.AT_JSON, url:url, overwrite_header: header,
                    param:[node, thread_state]}], asset_cb, null, null, null);
            }
            else if (node.common_usage_names["request_type"] == "POST") {
                    var req = convert_variable(
                        get_var(node.vars["dst1"], logic.variables, thread_state.variables), NT_STRING);

                    m_assets.enqueue([{id:url, type:m_assets.AT_JSON, url:url, 
                            overwrite_header: header, request_method:"POST", 
                            post_data:req, param:[node, thread_state]}],
                            asset_cb, null, null, null);
            }
            break;
        case NSR_SENDING_REQUEST:
            break;
        case NSR_RESPONSE_RECEIVED:
            inst.state = NSR_NOT_STARTED;
            thread_state.curr_node = node.slot_idx_order;
            break;
        }
        break;
    }
}

function inherit_mat_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    function init(node, inst, thread_state) {
        for (var i = 0; i < 2; i++) {
            inst.objects["id"+i] = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id"+i], 0);
            if(!inst.objects["id"+i]) {
                m_print.error("Logic script error: object not found. Node: ", node.name);
                node.mute = true;
            }
        }
    }
    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        var inst = get_node_instance(node, thread_state, init);
        m_obj.inherit_material(inst.objects['id0'], node.materials_names['id0'],
            inst.objects['id1'], node.materials_names['id1']);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function delay_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    var inst = get_node_instance(node, thread_state);
    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        if (inst.state == NPS_NOT_STARTED) {
            // start delay
            inst.state = NPS_PLAYING;
            inst.timer = 0;
            thread_state.in_progress = true;
            return;
        } else if (inst.state == NPS_PLAYING) {
            // count the time
            inst.timer += elapsed;
            var dl = node.bools["dl"] ? convert_variable(
                get_var(node.vars['dl'], logic.variables,thread_state.variables), NT_NUMBER) : node.floats["dl"];
            if (dl < inst.timer) {
                inst.state = NPS_NOT_STARTED;
                thread_state.curr_node = node.slot_idx_order;
                thread_state.in_progress = false;
            }
        }
        break;
    }
}

function apply_shape_key_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    function init(node, inst, thread_state) {
        var obj = inst.objects["id0"] =
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
    }
    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        var inst = get_node_instance(node, thread_state, init);
        m_geom.apply_shape_key(inst.objects["id0"], node.common_usage_names['sk'],
            node.bools["skv"] ? convert_variable(
                get_var(node.vars['skv'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats['skv']);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function outline_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    var is_var = node.bools["id0"];
    function init(node, inst, thread_state) {
        if(!is_var) {
            inst.obj = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
            if(!inst.obj) {
                m_print.error("Logic script error: object not found. Node: ", node.name);
                node.mute = true;
            }
            if (!(inst.obj && inst.obj.render && inst.obj.render.outlining)) {
                m_print.error("Can't evaluate 'Outline' logic node: wrong object");
                node.mute = true;
            }
        }
    }
    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        var inst = get_node_instance(node, thread_state, init);
        var obj = is_var ? get_var(node.vars["id0"], logic.variables, thread_state.variables) : inst.obj;
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
            m_obj.set_outline_intensity(obj, node.bools["in"] ? convert_variable(
                        get_var(node.vars['in'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats['in']);
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
            m_cam.set_rotation_hover_angles(cam, phi + Math.PI, -theta);
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

    var ca_is_var = node.bools["id0"];
    var tr_is_var = node.bools["id1"];
    var ta_is_var = node.bools["id2"];

    function init(node, inst, thread_state) {
        var o = null;
        o = inst.objects["ca"] = get_object(node, "id0", ca_is_var, logic.variables, thread_state.variables)
        if(!o && !ca_is_var) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
        inst.objects["tr"] = get_object(node, "id1", tr_is_var, logic.variables, thread_state.variables)
        if(!inst.objects["tr"] && ! tr_is_var) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
        inst.objects["ta"] = get_object(node, "id2", ta_is_var, logic.variables, thread_state.variables)
        if(!inst.objects["ta"] && !ta_is_var) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
        inst.state = NPS_NOT_STARTED;

        inst.camera_state = {
            trans_start: new Float32Array(3),
            trans_end: new Float32Array(3),
            interp_trans: new Float32Array(3),
            target_start: new Float32Array(3),
            target_end: new Float32Array(3),
            interp_target: new Float32Array(3),
            tsr_start: m_tsr.create(),
            tsr_end: m_tsr.create(),
            interp_tsr: m_tsr.create()
        };

    }
    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        var inst = get_node_instance(node, thread_state, init);
        var cam = ca_is_var ? get_var(node.vars["id0"], logic.variables, thread_state.variables) : inst.objects["ca"];

        var tr = tr_is_var ? get_var(node.vars["id1"], logic.variables, thread_state.variables) : inst.objects["tr"];

        var ta = ta_is_var ? get_var(node.vars["id2"], logic.variables, thread_state.variables) : inst.objects["ta"];

        var trans = m_tsr.get_trans(tr.render.world_tsr, _vec3_tmp);
        var target = m_tsr.get_trans(ta.render.world_tsr, _vec3_tmp2);

        switch (inst.state) {
        case NPS_NOT_STARTED:
            var dur = node.bools["dur"] ? convert_variable(
                get_var(node.vars['dur'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["dur"];
            if (dur == 0.0) {
                set_tsr(cam, trans, target, inst.camera_state.tsr_end);
                move_cam(cam, trans, target, inst.camera_state.tsr_end);
                thread_state.curr_node = node.slot_idx_order;
                return;
            }
            // start interpolation
            var cam_trans = m_tsr.get_trans(cam.render.world_tsr, _vec3_tmp3);
            m_vec3.copy(cam_trans, inst.camera_state.trans_start);
            var move_style = m_cam.get_move_style(cam);
            if (move_style == m_cam.MS_HOVER_CONTROLS) {
                m_vec3.copy(cam.render.hover_pivot, inst.camera_state.target_start);
            } else if (move_style == m_cam.MS_STATIC || move_style == m_cam.MS_EYE_CONTROLS) {
                // calc tsr
                m_tsr.copy(cam.render.world_tsr, inst.camera_state.tsr_start);
                set_tsr(cam, trans, target, inst.camera_state.tsr_end);
            } else {
                m_vec3.copy(cam.render.pivot, inst.camera_state.target_start);
            }
            m_vec3.copy(trans, inst.camera_state.trans_end);
            m_vec3.copy(target, inst.camera_state.target_end);

            inst.state = NPS_PLAYING;
            var trans_animator = m_time.animate(0, 1, dur * 1000, function(e) {
                if (m_scs.check_active()) {
                    if (move_style == m_cam.MS_STATIC || move_style == m_cam.MS_EYE_CONTROLS) {
                        m_tsr.interpolate(inst.camera_state.tsr_start, inst.camera_state.tsr_end,
                            m_util.smooth_step(e), inst.camera_state.interp_tsr);
                    }
                    else {
                        inst.camera_state.interp_target = m_vec3.lerp(inst.camera_state.target_start,
                            inst.camera_state.target_end, m_util.smooth_step(e), inst.camera_state.interp_target);
                        inst.camera_state.interp_trans = m_vec3.lerp(inst.camera_state.trans_start,
                            inst.camera_state.trans_end, m_util.smooth_step(e), inst.camera_state.interp_trans);
                    }
                    move_cam(cam, inst.camera_state.interp_trans, inst.camera_state.interp_target,
                        inst.camera_state.interp_tsr);
                    if (e == 1)
                       inst.state = NPS_FINISHED;
                }
            });
            break;
        case NPS_PLAYING:
            // interpolation is in progress
            break;
        case NPS_FINISHED:
            // end
            m_time.clear_animation(trans_animator);
            inst.state = NPS_NOT_STARTED;
            thread_state.curr_node = node.slot_idx_order;
            break;
        }
        break;
    }
}

function set_camera_move_style_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    var bools = node.bools;
    function init(node, inst, thread_state) {
        if (!bools["id0"]) {
            var cam = inst.objects["id0"] =
                m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
            if(!cam) {
                m_print.error("Logic script error: object not found. Node: ", node.name);
                node.mute = true;
            }
        }
        if (bools["pvo"] && !bools["id1"]) {
            inst.objects["id1"] = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id1"], 0);
        }
    }
    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        var inst = get_node_instance(node, thread_state, init);
        var cam = bools["id0"] ? get_var(node.vars['id0'], logic.variables, thread_state.variables) : inst.objects["id0"];
        var render = cam.render;
        inst.cam_state = {
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
        if (m_obj_util.is_camera(cam)) {
            var cam_render = cam.render;
            var cam_state = inst.cam_state;
            m_cam.wipe_move_style(cam);

            switch (node.common_usage_names["camera_move_style"]) {
            case NCMS_STATIC:
                cam_render.move_style = m_cam.MS_STATIC;
                break;
            case NCMS_EYE:
                cam_render.move_style = m_cam.MS_EYE_CONTROLS;

                var pos = m_tsr.get_trans(cam_render.world_tsr, _vec3_tmp);

                m_cam.setup_eye_model(cam, pos, null, cam_state.horizontal_limits, cam_state.vertical_limits);
                break;
            case NCMS_HOVER:
                cam_render.move_style = m_cam.MS_HOVER_CONTROLS;

                var pos = m_tsr.get_trans(cam_render.world_tsr, _vec3_tmp);
                var pivot = _vec3_tmp2;
                if (node.bools["pvo"]) {
                    var pvo = bools["id1"] ? get_var(node.vars['id1'], logic.variables, thread_state.variables) : inst.objects["id1"];
                    pivot = m_tsr.get_trans(pvo.render.world_tsr, _vec3_tmp2);
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

                var pos = m_tsr.get_trans(cam_render.world_tsr, _vec3_tmp);
                var pivot = _vec3_tmp2;
                if (node.bools["pvo"]) {
                    var pvo = bools["id1"] ? get_var(node.vars['id1'], logic.variables, thread_state.variables) : inst.objects["id1"];
                    pivot = m_tsr.get_trans(pvo.render.world_tsr, _vec3_tmp2);
                } else {
                    pivot[0] = node.bools["pvx"] ?
                        convert_variable(get_var(node.vars["pvx"], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["pvx"];
                    pivot[1] = node.bools["pvy"] ?
                        convert_variable(get_var(node.vars["pvy"], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["pvy"];
                    pivot[2] = node.bools["pvz"] ?
                        convert_variable(get_var(node.vars['pvz'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["pvz"];
                }

                m_cam.setup_target_model(cam, pos, pivot, cam_state.horizontal_limits,
                        cam_state.vertical_limits, cam_state.distance_limits, cam_state.pivot_limits, cam_state.use_panning);
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
        } else {
            m_print.error("Logic script error: object is not a Camera. Node: ", node.name);
        }

        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function set_camera_limits_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    var bools = node.bools;
    function init(node, inst, thread_state) {
        var cam = null;
        if (!bools["id0"]) {
            cam = inst.objects["id0"] =
                m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
            if(!cam) {
                m_print.error("Logic script error: object not found. Node: ", node.name);
                node.mute = true;
            }
        }
    }
    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        var inst = get_node_instance(node, thread_state, init);
        var cam = bools["id0"] ? get_var(node.vars['id0'], logic.variables, thread_state.variables) : inst.objects["id0"];
        if (m_obj_util.is_camera(cam)) {
            var cam_render = cam.render;

            switch(cam_render.move_style) {
            case m_cam.MS_TARGET_CONTROLS:
                if (node.bools["dsl"]) {
                    var dslmin = node.bools["dslmin"] ? convert_variable(
                        get_var(node.vars['dslmin'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["dslmin"];
                    var dslmax = node.bools["dslmax"] ? convert_variable(
                        get_var(node.vars['dslmax'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["dslmax"];

                    var limits = {};
                    limits.min = Math.max(dslmin, 0);
                    limits.max = Math.max(dslmax, 0);
                    m_cam.set_distance_limits(cam, limits);
                }

                if (node.bools["vrl"]) {
                    var vrldown = node.bools["vrldown"] ? convert_variable(
                        get_var(node.vars['vrldown'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["vrldown"];
                    var vrlup = node.bools["vrlup"] ? convert_variable(
                        get_var(node.vars['vrlup'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["vrlup"];

                    var limits = {};
                    limits.down = vrldown;
                    limits.up = vrlup;
                    limits.camera_space = node.common_usage_names["cam_lim_vert_rot_space_type"] == "CAMERA";
                    m_cam.set_vertical_rot_limits(cam, limits);
                }

                if (node.bools["hrl"]) {
                    var hrlleft = node.bools["hrlleft"] ? convert_variable(
                        get_var(node.vars['hrlleft'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["hrlleft"];
                    var hrlright = node.bools["hrlright"] ? convert_variable(
                        get_var(node.vars['hrlright'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["hrlright"];

                    var limits = {};
                    limits.left = hrlleft;
                    limits.right = hrlright;
                    limits.camera_space = node.common_usage_names["cam_lim_hor_rot_space_type"] == "CAMERA";
                    m_cam.set_horizontal_rot_limits(cam, limits);
                }

                if (node.bools["pvl"]) {
                    var pvlmin = node.bools["pvlmin"] ? convert_variable(
                        get_var(node.vars['pvlmin'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["pvlmin"];
                    var pvlmax = node.bools["pvlmax"] ? convert_variable(
                        get_var(node.vars['pvlmax'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["pvlmax"];

                    var limits = {};
                    limits.min_z = pvlmin;
                    limits.max_z = pvlmax;
                    m_cam.set_pivot_limits(cam, limits);
                }

                break;
            case m_cam.MS_HOVER_CONTROLS:
                if (node.bools["htl"]) {
                    var htlmin = node.bools["htlmin"] ? convert_variable(
                        get_var(node.vars['htlmin'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["htlmin"];
                    var htlmax = node.bools["htlmax"] ? convert_variable(
                        get_var(node.vars['htlmax'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["htlmax"];

                    var limits = {};
                    limits.min = htlmin;
                    limits.max = htlmax;
                    m_cam.set_hor_trans_limits(cam, limits);
                }

                if (node.bools["vtl"]) {
                    var vtlmin = node.bools["vtlmin"] ? convert_variable(
                        get_var(node.vars['vtlmin'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["vtlmin"];
                    var vtlmax = node.bools["vtlmax"] ? convert_variable(
                        get_var(node.vars['vtlmax'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["vtlmax"];

                    var limits = {};
                    limits.min = vtlmin;
                    limits.max = vtlmax;
                    m_cam.set_vert_trans_limits(cam, limits);
                }

                if (node.bools["vrl"]) {
                    var vrldown = node.bools["vrldown"] ? convert_variable(
                        get_var(node.vars['vrldown'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["vrldown"];
                    var vrlup = node.bools["vrlup"] ? convert_variable(
                        get_var(node.vars['vrlup'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["vrlup"];

                    var limits = {};
                    limits.down = vrldown;
                    limits.up = vrlup;
                    limits.camera_space = node.common_usage_names["cam_lim_vert_rot_space_type"] == "CAMERA";
                    m_cam.hover_set_vertical_limits(cam, limits);
                }

                if (node.bools["dsl"]) {
                    var dslmin = node.bools["dslmin"] ? convert_variable(
                        get_var(node.vars['dslmin'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["dslmin"];
                    var dslmax = node.bools["dslmax"] ? convert_variable(
                        get_var(node.vars['dslmax'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["dslmax"];

                    var limits = {};
                    limits.min = Math.max(dslmin, 0);
                    limits.max = Math.max(dslmax, 0);
                    m_cam.hover_set_distance_limits(cam, limits);
                }
                break;
            case m_cam.MS_EYE_CONTROLS:
                if (node.bools["vrl"]) {
                    var vrldown = node.bools["vrldown"] ? convert_variable(
                        get_var(node.vars['vrldown'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["vrldown"];
                    var vrlup = node.bools["vrlup"] ? convert_variable(
                        get_var(node.vars['vrlup'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["vrlup"];

                    var limits = {};
                    limits.down = vrldown;
                    limits.up = vrlup;
                    limits.camera_space = node.common_usage_names["cam_lim_vert_rot_space_type"] == "CAMERA";
                    m_cam.set_vertical_rot_limits(cam, limits);
                }

                if (node.bools["hrl"]) {
                    var hrlleft = node.bools["hrlleft"] ? convert_variable(
                        get_var(node.vars['hrlleft'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["hrlleft"];
                    var hrlright = node.bools["hrlright"] ? convert_variable(
                        get_var(node.vars['hrlright'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["hrlright"];

                    var limits = {};
                    limits.left = hrlleft;
                    limits.right = hrlright;
                    limits.camera_space = node.common_usage_names["cam_lim_hor_rot_space_type"] == "CAMERA";
                    m_cam.set_horizontal_rot_limits(cam, limits);
                }

                break;
            case m_cam.MS_STATIC:
                break;
            }

            m_trans.update_transform(cam);
            m_phy.sync_transform(cam);
        } else {
            m_print.error("Logic script error: object is not a Camera. Node: ", node.name);
        }
        // init ortho after the camera was updated
        // m_cam.init_ortho_props(cam);
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
    var bools = node.bools;
    var is_var0 = bools["id0"];
    var is_var1 = bools["id1"]
    function init(node, inst, thread_state) {
        inst.objects["id0"] = get_object(node, "id0", is_var0, logic.variables, thread_state.variables);
        if (!inst.objects["id0"] && !is_var0) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }

        inst.objects["id1"] = get_object(node, "id1", is_var1, logic.variables, thread_state.variables);
        if (!inst.objects["id1"] && !is_var1) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }

        inst.state = NPS_NOT_STARTED;

        inst.obj_state = {
            dest_tsr_start: m_tsr.create(),
            dest_tsr_end: m_tsr.create(),
            interp_tsr_dest: m_tsr.create()
        };
    }
    switch (logic.state) {
    case INITIALIZATION:
        break;    
    case RUNNING:
        var inst = get_node_instance(node, thread_state, init);
        var obj = bools["id0"] ? get_var(node.vars['id0'], logic.variables, thread_state.variables) : inst.objects["id0"];
        if (obj.is_dynamic) {
            m_tsr.copy(obj.render.world_tsr, inst.obj_state.dest_tsr_start)
            //destination
            var de = bools["id1"] ? get_var(node.vars['id1'], logic.variables, thread_state.variables) : inst.objects["id1"];
            m_tsr.copy(de.render.world_tsr, inst.obj_state.dest_tsr_end);

            switch (inst.state) {
            case NPS_NOT_STARTED:
                var dur = node.bools["dur"] ? convert_variable(
                    get_var(node.vars['dur'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["dur"];
                if (dur == 0.0) {
                    move_to(obj, inst.obj_state.dest_tsr_end);
                    thread_state.curr_node = node.slot_idx_order;
                    return;
                }

                inst.state = NPS_PLAYING;
                var trans_animator = m_time.animate(0, 1, dur * 1000, function(e) {
                    if (m_scs.check_active()) {
                        inst.obj_state.interp_dest = m_tsr.interpolate(inst.obj_state.dest_tsr_start,
                            inst.obj_state.dest_tsr_end, m_util.smooth_step(e), inst.obj_state.interp_tsr_dest);
                        move_to(obj, inst.obj_state.interp_tsr_dest);
                        if (e == 1)
                        inst.state = NPS_FINISHED;
                }
                });
                break;
            case NPS_PLAYING:
                // interpolation is in progress
                break;
            case NPS_FINISHED:
                // end
                m_time.clear_animation(trans_animator);
                inst.state = NPS_NOT_STARTED;
                thread_state.curr_node = node.slot_idx_order;
                break;
            }
            break;
        } else {
            m_print.error("Logic script error: object '" + obj.name + "' must be dynamic. Node: ", node.name);
            thread_state.curr_node = node.slot_idx_order;
        }
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

    var is_var = node.bools["id0"];
    function init(node, inst, thread_state) {
        inst.obj = get_object(node, "id0", is_var, logic.variables, thread_state.variables);
        if(!inst.obj && !is_var) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }

        inst.state = NPS_NOT_STARTED;

        inst.obj_state = {
            space: NST_WORLD,
            tsr_start: m_tsr.create(),
            tsr_end: m_tsr.create(),
            interp_tsr: m_tsr.create()
        };
    }
    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        var inst = get_node_instance(node, thread_state, init);
        var obj = is_var ? get_var(node.vars["id0"], logic.variables, thread_state.variables) : inst.obj;

        switch (inst.state) {
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
                inst.obj_state.tsr_end
            );

            inst.obj_state.space = node.common_usage_names["space_type"];
            switch (inst.obj_state.space) {
                case NST_WORLD:
                    m_trans.get_tsr(obj, inst.obj_state.tsr_start);
                    break;
                case NST_PARENT:
                    m_trans.get_tsr_rel(obj, inst.obj_state.tsr_start);
                    break;
                case NST_LOCAL:
                    m_trans.get_tsr_rel(obj, inst.obj_state.tsr_start);
                    m_tsr.multiply(inst.obj_state.tsr_start, inst.obj_state.tsr_end, inst.obj_state.tsr_end)
                    break;
            }

            var dur = node.bools["dur"] ?
                convert_variable(get_var(node.vars['dur'], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["dur"];
            if (dur == 0.0) {
                transform_obj(obj, inst.obj_state.tsr_end, inst.obj_state.space);
                thread_state.curr_node = node.slot_idx_order;
                return;
            }

            inst.state = NPS_PLAYING;
            var trans_animator = m_time.animate(0, 1, dur * 1000, function(e) {
                if (m_scs.check_active()) {
                    m_tsr.interpolate(inst.obj_state.tsr_start, inst.obj_state.tsr_end,
                            m_util.smooth_step(e), inst.obj_state.interp_tsr);

                    transform_obj(obj, inst.obj_state.interp_tsr, inst.obj_state.space);

                    if (e == 1)
                        inst.state = NPS_FINISHED;
               }
            });
            break;
        case NPS_PLAYING:
            // interpolation is in progress
            break;
        case NPS_FINISHED:
            // end
            m_time.clear_animation(trans_animator);
            inst.state = NPS_NOT_STARTED;
            thread_state.curr_node = node.slot_idx_order;
            break;
        }
        break;
    }
}

function speaker_play_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    var is_var = node.bools["id0"];
    function init(node, inst, thread_state) {
        inst.obj = get_object(node, "id0", is_var, logic.variables, thread_state.variables);
        if(!inst.obj && !is_var) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
    }
    switch (logic.state) {
    case INITIALIZATION:
        if (node.bools["not_wait"] == undefined)
            node.bools["not_wait"] = true;
        break;
    case RUNNING:
        var inst = get_node_instance(node, thread_state, init);
        inst.obj = is_var ? get_var(node.vars["id0"], logic.variables, thread_state.variables) : inst.obj;
        if (!m_sfx.is_playing(inst.obj)) {
            if (inst.state == NPS_PLAYING)
                inst.state = NPS_FINISHED;
        }
        switch (inst.state) {
        case NPS_NOT_STARTED:
            // this node is not playing
            // check other threads
            for (var k in logic.logic_threads) {
                var curr_node = logic.logic_threads[k].thread_state.curr_node;
                if (curr_node != -1) { // case when the thread is already stopped
                    var node2 = logic.logic_threads[k].nodes[curr_node];
                    if (node2.type == "SPEAKER_PLAY" && node2!= node && inst.state == NPS_PLAYING && node2.obj == node.obj) {
                        node2.state = NPS_FINISHED;
                    }
                }
            }

            // blocking selection
            if (!node.bools["not_wait"])
                thread_state.in_progress = true;

            m_sfx.play_def(inst.obj);
            inst.state = NPS_PLAYING;
            break;
        case NPS_PLAYING:
            // playing
            if (node.bools["not_wait"]) {
                thread_state.curr_node = node.slot_idx_order;
                inst.state = NPS_NOT_STARTED;
            }
            break;
        case NPS_FINISHED:
            // end playing
            if (!node.bools["not_wait"])
                thread_state.in_progress = false;
            thread_state.curr_node = node.slot_idx_order;
            inst.state = NPS_NOT_STARTED;
            break;
        default:
            m_assert.panic("Unknown state of " + node.name);
            inst.state = NPS_NOT_STARTED;
            break;
        }
    }
}

function speaker_stop_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    var is_var = node.bools["id0"];
    function init(node, inst, thread_state) {
        inst.obj = get_object(node, "id0", is_var, logic.variables, thread_state.variables);
        if(!inst.obj && !is_var) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
    }
    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        var inst = get_node_instance(node, thread_state, init);
        var obj = is_var ? get_var(node.vars["id0"], logic.variables, thread_state.variables) : inst.obj;
        m_sfx.stop(obj);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function set_shader_node_param_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    function init(node, inst, thread_state) {
        if (node.objects_paths["id0"]) {
            inst.objects["id0"] = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
            if(!node.objects_paths["id0"]) {
                m_print.error("Logic script error: object not found. Node: ", node.name);
                node.mute = true;
            }
            node.nodes_paths["id0"].unshift(node.materials_names["id0"])
        }
    }
    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        var inst = get_node_instance(node, thread_state, init);
        var obj = inst.objects["id0"];
        var name_list = node.nodes_paths["id0"]

        var mat_name = name_list[0];
        var node_name = m_batch.name_list_to_node_name(name_list, 1);
        var batch_main = m_batch.find_batch_material(obj, mat_name, "MAIN");

        thread_state.curr_node = node.slot_idx_order;

        if (batch_main === null) {
            m_print.error("Material \"" + mat_name +
                          "\" was not found in the object \"" + obj.name + "\".");
            return;
        }

        if (node.shader_nd_type == "ShaderNodeRGB") {
            m_obj.set_nodemat_rgb(obj, mat_name, node_name,
                node.bools["id0"] ?
                    convert_variable(get_var(node.vars["id0"], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["id0"],
                node.bools["id1"] ?
                    convert_variable(get_var(node.vars["id1"], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["id1"],
                node.bools["id2"] ?
                    convert_variable(get_var(node.vars["id2"], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["id2"]);
        }

        if (node.shader_nd_type == "ShaderNodeValue") {
            m_obj.set_nodemat_value(obj, mat_name, node_name,
                node.bools["id0"] ?
                    convert_variable(get_var(node.vars["id0"], logic.variables, thread_state.variables), NT_NUMBER) : node.floats["id0"]);
        }
        break;
    }
}

function math_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case RUNNING:
        var val1 = (node.vars["id0"][1] == -1) ? node.floats["inp1"] : convert_variable(
            get_var(node.vars["id0"], logic.variables, thread_state.variables), NT_NUMBER);
        var val2 = (node.vars["id1"][1] == -1) ? node.floats["inp2"] : convert_variable(
            get_var(node.vars["id1"], logic.variables, thread_state.variables), NT_NUMBER);
        var result = 0;
        switch (node.op) {
        case NMO_ADD:
            result = val1 + val2;
            break;
        case NMO_MUL:
            result = val1 * val2;
            break;
        case NMO_SUB:
            result = val1 - val2;
            break;
        case NMO_DIV:
            if (val2 == 0)
                m_assert.panic("Division by zero in Logic script");

            result = val1 / val2;
            break;
        case NMO_RAND:
            result = Math.random() * (val2 - val1) + val1;
            break;
        case NMO_SIN:
            result = Math.sin(val1);
            break;
        case NMO_COS:
            result = Math.cos(val1);
            break;
        case NMO_TAN:
            result = Math.tan(val1);
            break;
        case NMO_ARCSIN:
            result = Math.asin(val1);
            break;
        case NMO_ARCCOS:
            result = Math.acos(val1);
            break;
        case NMO_ARCTAN:
            result = Math.atan(val1);
            break;
        case NMO_LOG:
            result = Math.log(val1);
            break;
        case NMO_MIN:
            result = Math.min(val1, val2);
            break;
        case NMO_MAX:
            result = Math.max(val1, val2);
            break;
        case NMO_ROUND:
            result = Math.round(val1);
            break;
        case NMO_MOD:
            result = val1 % val2;
            break;
        case NMO_ABS:
            result = Math.abs(val1);
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
        var arg_type = node.common_usage_names["variable_type"];
        var arg_arr = get_const_value_storage(node, arg_type);

        var cond_result = false;

        if (arg_type == NT_OBJECT) {
            var val1 = node.bools["id0"] ?
            get_var(node.vars["id0"], logic.variables, thread_state.variables) :
            m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
            var val2 = node.bools["id1"] ?
            get_var(node.vars["id1"], logic.variables, thread_state.variables) :
            m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id1"], 0);

            switch (node.common_usage_names["condition"]) {
            case NC_EQUAL:
                if (val1 == val2)
                    cond_result = true;
                break;
            case NC_NOTEQUAL:
                if (val1 != val2)
                    cond_result = true;
                break;
            }
        } else {
            var val1 = (node.vars["id0"][1] == -1) ? arg_arr["inp1"] : convert_variable(
                get_var(node.vars["id0"], logic.variables, thread_state.variables), arg_type);
            var val2 = (node.vars["id1"][1] == -1) ? arg_arr["inp2"] : convert_variable(
                get_var(node.vars["id1"], logic.variables, thread_state.variables), arg_type);

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
        if (node.bools["vs"]) {
            var value = get_var(node.vars["vs"], logic.variables, thread_state.variables);
        } else {
            var var_type = node.common_usage_names["variable_type"];
            var arg_arr = get_const_value_storage(node, var_type)
            if (var_type == NT_OBJECT) {
                var value = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, arg_arr["id0"], 0);
            } else {
                var value = arg_arr["inp1"];
            }
        }
        set_var([(node.bools["new"] && node.bools["gl"]) || node.vars["vd"][0], node.vars["vd"][1]], logic.variables, thread_state.variables, value);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function get_object(node, id, is_var, global_vars, local_vars) {
    return is_var ? get_var(node.vars[id], global_vars, local_vars) : m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths[id], 0);
}

function get_thread_nodes(thread) {
    var callstack = thread.thread_state.callstack;
    if (callstack.length <= 1) {
        var nodes = thread.nodes;
    } else {
        var nodes = callstack[callstack.length - 1].logic_func.func.nodes;
    }
    return nodes;
}

function play_anim_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    // return anim slot number for already applied, -1 otherwise
    function get_slot_by_anim_name(obj, anim_name) {
        var anim_slot = -1;
        for (var i = 0; i < 8; i++) {
            var anim_slot_obj = obj.anim_slots[i];
            if (anim_slot_obj && anim_slot_obj.animation_name) {
                if (m_anim.strip_baked_suffix(anim_slot_obj.animation_name) == m_anim.strip_baked_suffix(anim_name))
                    if (anim_slot != -1)
                        anim_slot = i;
                    else
                        return -1;
            }
        }

        return anim_slot;
    }

    var is_var = node.bools["id0"];
    var is_env = node.bools["env"];

    function init(node, inst, thread_state) {
        inst.obj = is_env ? get_world(node) : get_object(node, "id0", is_var, logic.variables, thread_state.variables);
        if(!inst.obj && !is_var) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
    }

    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        var inst = get_node_instance(node, thread_state, init);
        if (!is_env)
            inst.obj = is_var ? get_var(node.vars["id0"], logic.variables, thread_state.variables) : inst.obj;
        if (inst.state == NPS_PLAYING && !m_anim.is_play(inst.obj, inst.anim_slot))
            inst.state = NPS_FINISHED;

        switch (inst.state) {
        case NPS_NOT_STARTED:
            // this node is not playing
            // check other threads
            for (var k in logic.logic_threads) {
                var thread = logic.logic_threads[k];
                var script = get_thread_nodes(thread)

                var curr_node = thread.thread_state.curr_node;
                if (curr_node != -1) { // case when the thread is already stopped
                    var node2 = script[curr_node];
                    var inst2 = get_node_instance(node2, thread.thread_state);
                    if (node2.type == "PLAY_ANIM" && node2 != node && inst2.state == NPS_PLAYING && inst2.obj == inst.obj)
                        inst2.state = NPS_FINISHED;
                }
            }

            var behavior = node.common_usage_names["param_anim_behavior"];
            if (node.anim_name == "") {
                // TODO make check_anim for default animation
                m_anim.apply_def(inst.obj);
                m_anim.set_behavior(inst.obj, behavior, m_anim.SLOT_ALL);
            } else {
                var anim_slot = get_slot_by_anim_name(inst.obj, node.anim_name);

                if (anim_slot == -1) {
                    inst.anim_slot = m_anim.slot_by_anim_type(inst.obj, node.anim_name);
                    m_anim.apply(inst.obj, null, node.anim_name, inst.anim_slot);
                } else
                    inst.anim_slot = anim_slot;

                m_anim.set_behavior(inst.obj, behavior,  inst.anim_slot);
            }

            // blocking selection
            if (!node.bools["not_wait"])
                thread_state.in_progress = true;

            m_anim.play(inst.obj, null, inst.anim_slot);
            inst.state = NPS_PLAYING;

            // if we can we must switch to the next node immediately
            // else there could be a conflict between nodes of such type
            if (node.bools["not_wait"]) {
                thread_state.curr_node = node.slot_idx_order;
                inst.state = NPS_NOT_STARTED;
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
            inst.state = NPS_NOT_STARTED;
            break;
        default:
            m_assert.panic("Unknown state of " + node.name);
            inst.state = NPS_NOT_STARTED;
            break;
        }
        break;
    }
}

function stop_anim_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    var is_var = node.bools["id0"];
    var is_env = node.bools["env"];
    function init(node, inst, thread_state) {
        inst.obj = is_env ? get_world(node) : get_object(node, "id0", is_var, logic.variables, thread_state.variables);
        if(!inst.obj && !is_var) {
            m_print.error("Logic script error: object not found. Node: ", node.name);
            node.mute = true;
        }
    }
    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        var inst = get_node_instance(node, thread_state, init);
        inst.obj = is_var ? get_var(node.vars["id0"], logic.variables, thread_state.variables) : inst.obj;
        m_anim.stop(inst.obj, m_anim.SLOT_ALL);
        if (node.bools["rst"])
            m_anim.set_first_frame(inst.obj, m_anim.SLOT_ALL);
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

            if (!(src_name in src_vars))
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

function date_time_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case RUNNING:
        var type = node.common_usage_names["time_type"];
        var D = new Date();
        var y, M, d, h, m, s;
        if (type == "L") {
            y = D.getFullYear();
            M = D.getMonth();
            d = D.getDate();
            h = D.getHours();
            m = D.getMinutes();
            s = D.getSeconds();
        }
        else {
            y = D.getUTCFullYear();
            M = D.getUTCMonth();
            d = D.getUTCDate();
            h = D.getUTCHours();
            m = D.getUTCMinutes();
            s = D.getUTCSeconds();
        }
        if (node.bools["y"])
                set_var(node.vars["y"], logic.variables, thread_state.variables, y);
        if (node.bools["M"])
            set_var(node.vars["M"], logic.variables, thread_state.variables, M);
        if (node.bools["d"])
            set_var(node.vars["d"], logic.variables, thread_state.variables, d);
        if (node.bools["h"])
            set_var(node.vars["h"], logic.variables, thread_state.variables, h);
        if (node.bools["m"])
            set_var(node.vars["m"], logic.variables, thread_state.variables, m);
        if (node.bools["s"])
            set_var(node.vars["s"], logic.variables, thread_state.variables, s);

        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function elapsed_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case RUNNING:
        set_var(node.vars["s"], logic.variables, thread_state.variables, elapsed);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function call_func_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        var node_tree = node.logic_node_trees["id0"];
        var func = node.logic_functions["id0"];
        for (var i = 0; i < logic.logic_functions.length; i++) {
            var desc = logic.logic_functions[i];
            if (desc.id[0][0] == node_tree[0] &&
                desc.id[0][1] == node_tree[1] &&
                desc.id[1] == func) {
                    node.func_id = i;
                    break;
                }
        }
        break;
    case RUNNING:
        // init local vars
        var local_variables = {};
        thread_state.variables_references = {};
        for (var v in node.vars) {
            var varval = node.vars[v][1];
            var varname = node.strings[v];
            local_variables[varname] = node.vars[v][0] ? logic.variables[varval] : thread_state.variables[varval];
            if (v.startsWith("out")) {
                thread_state.variables_references[varval] = varname;
            }
        }
        // increase callstack
        thread_state.callstack.push({
            caller_node: node,
            variables: local_variables,
            logic_func: logic.logic_functions[node.func_id]});
        // replace local vars in thread_state
        thread_state.variables = local_variables;
        //
        thread_state.update_script_cycle = true;
        thread_state.curr_node = logic.logic_functions[node.func_id].func.nodes[0].slot_idx_order;
        break;
    }
}

function process_logic_thread(thread, logic, timeline, elapsed, start_time, do_not_reset_processed) {
    thread.thread_state.update_script_cycle = false;
    var callstack = thread.thread_state.callstack;
    if (callstack.length <= 1) {
        var script = thread.nodes;
    } else {
        var script = callstack[callstack.length - 1].logic_func.func.nodes;
    }

    if (!script.length)
        return;

    /* Reset "processed" */
    if (!do_not_reset_processed) {
        for (var i = 0; i < script.length; i++) {
            script[i].processed = false
        }
    }
    for (var i = 0; i < script.length; i++) {
        if (thread.thread_state.curr_node >= 0) {
            var node = script[thread.thread_state.curr_node];
        } else if (thread.thread_state.callstack.length > 1) {
            var stack_frame = thread.thread_state.callstack.pop();
            var caller_node = stack_frame.caller_node;
            var upper_stack_frame = callstack[callstack.length-1];
            if (upper_stack_frame.logic_func)
                var upper_script = upper_stack_frame.logic_func.func.nodes;
            else
                var upper_script = thread.nodes
            thread.thread_state.curr_node = caller_node.slot_idx_order
            var node = upper_script[caller_node.slot_idx_order];
            // restore vars
            var vars = thread.thread_state.variables;
            thread.thread_state.variables = upper_stack_frame.variables;
            for (var v in thread.thread_state.variables_references) {
                var vname = thread.thread_state.variables_references[v];
                if (thread.thread_state.variables[v] === undefined)
                    logic.variables[v] = vars[vname];
                else
                    thread.thread_state.variables[v] = vars[vname];
            }
            // use recursion for updating script variable to process the max number of nodes
            // else flickering can occur if use HIDE/SHOW nodes in different callstack frames
            process_logic_thread(thread, logic, timeline, elapsed, start_time, true);
            return;
        } else {
            return;
        }
        if (node.processed)
            return;
        if (!node.mute) {
            node.process_node(node, logic, thread.thread_state, timeline, elapsed, start_time);
            node.processed = true;
            if (thread.thread_state.update_script_cycle)
                return;
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
    // the end of the script
    // clear callstack
    callstack.splice(0, callstack.length);
}

function prepare_logic(scene, logic) {
    var bpy_logic_threads = scene["b4w_logic_nodes"];
    var logic_threads = logic.logic_threads;
    var logic_functions = logic.logic_functions;
    logic.state = INITIALIZATION;
    var threads_count = -1;
    for (var k = 0; k < bpy_logic_threads.length; k++) {
        var thread = {
            nodes: [],
            thread_state: {
                scene: scene,
                curr_node: 0,
                in_progress: false, // used for selection blocking during Play Anim
                                    // in cases when "Do Not Wait" is not checked
                                    // or during Delay
                update_script_cycle: false, // used for current nodes list reseting (switch frame in callstack)
                thread_index: k,
                callstack: [],
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
        //logic_threads.push(thread);

        var subtree = bpy_logic_threads[k];
        for (var i = 0; i < subtree.length; i++) {
            var snode = subtree[i];
            var node = init_node(snode, thread);
            // just copy all
            thread.nodes.push(node);
        }
        switch (thread.nodes[0].type) {
        case "ENTRYPOINT":
            threads_count++;
            thread.thread_state.thread_index = threads_count;
            logic_threads.push(thread);
            break;
        case "DEF_FUNC":
            var def_func_node = thread.nodes[0];
            thread.thread_state = null;
            var func_desc = {
                id: [def_func_node.logic_node_trees["id0"], def_func_node.logic_functions["id0"]],
                func: thread
            }
            logic_functions.push(func_desc);
            break
        }
    }

    // Nodes initialization
    for (var k = 0; k < logic_threads.length; k++) {
        var thread = logic_threads[k];
        for (var l = 0; l < thread.nodes.length; l++) {
            node = thread.nodes[l];
            // NOTE: additional checks for objects inside node handlers
            // are for objects from non-exported scenes and other difficult to prevent stuff
            if (!node.mute)
                node.process_node(node, logic, thread.thread_state, 0, 0);
        }
    }

    for (var k = 0; k < logic_functions.length; k++) {
        var func = logic_functions[k].func;
        for (var l = 0; l < func.nodes.length; l++) {
            node = func.nodes[l];
            if (!node.mute)
                node.process_node(node, logic, 0, 0, 0);
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
        return Number(variable) ? Number(variable) : 0;
    case NT_STRING:
        return String(variable);
    case NT_OBJECT:
        return variable;
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

/**
 * Compose unique node identifier based on given node_label.
 */
function node_ident(node_label) {
    if (!_node_ident_counters[node_label])
        _node_ident_counters[node_label] = 0;

    var name = node_label + "_" + _node_ident_counters[node_label];
    // remove slash and space symbols
    name = name.replace(/ /g, "_").replace(/\//g, "_");

    _node_ident_counters[node_label]++;

    return name;
}

function get_const_value_storage(node, var_type) {
    switch(var_type) {
    case NT_NUMBER:
        return node.floats;
    case NT_STRING:
        return node.strings;
    case NT_OBJECT:
        return node.objects_paths;
    }
}

exports.cleanup = function() {
    _logic_arr.length = 0;
    _logic_custom_cb_arr = {};
    _node_ident_counters = {};
}
}

var int_logic_nodes_factory = register("__logic_nodes", Int_logic_nodes);

export default int_logic_nodes_factory;
