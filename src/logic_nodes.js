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
var m_obj       = require("__objects")
var m_scs       = require("__scenes");
var m_print     = require("__print");
var m_nla       = require("__nla");
var m_cfg       = require("__config");
var m_ctl       = require("__controls");
var m_util      = require("__util");
var m_anim      = require("__animation");
var m_assets    = require("__assets");
var m_batch     = require("__batch");
var m_geom      = require("__geometry");
var m_time      = require("__time");

var _logic_arr = [];

/**
 * State
 */
var UNINITIALIZED  = 0;
var INITIALIZATION = 1;
var RUNNING        = 2;
var STOPPED        = 3;
var PAUSED         = 4;

/**
 * Add your node to _nodes_handlers
 * Use do_nothing_handler for stubs
 */
var _nodes_handlers = {
    "ENTRYPOINT": entrypoint_handler,
    "HIDE": hide_object_handler,
    "SHOW": show_object_handler,
    "PAGEPARAM": pageparam_handler,
    "SELECT": select_handler,
    "PLAY": play_handler,
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
    "OUTLINE": outline_handler
}

function do_nothing_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch(logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function unknown_node_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch(logic.state) {
    case INITIALIZATION:
        m_print.error("Unknown node type: " + node.type)
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
        nla_in_play: false,
        no_nla_control: true,
        nla_thread: null,
        scene: scene,
        curr_thread: null,
        logic_threads: []
    };
    scene._logic = logic;
    prepare_logic(scene, logic)
}

exports.update = function(timeline, elapsed) {
    var start_time = m_nla.get_start_time();
    if (start_time <= 0)
        return;

    // for each scene
    for (var i = 0; i < _logic_arr.length; i++) {
        process_logic(i, timeline, elapsed, start_time);
    }
}

function reset_play(thread) {
    var script = thread.nodes;
    for (var i = 0; i < script.length; i++) {
        var node = script[i];
        node.in_play = false;
    }
}

function process_logic(index, timeline, elapsed, start_time) {
    // for each thread
    var logic = _logic_arr[index];
    for (var k = 0; k < _logic_arr[index].logic_threads.length; k++) {
        logic.curr_thread = _logic_arr[index].logic_threads[k];
        process_logic_thread(_logic_arr[index].logic_threads[k], logic, timeline, elapsed, start_time);
    }
    // freeze
    if (!logic.nla_in_play && !logic.no_nla_control) {
        var frame_offset = m_nla.get_frame_offset(logic.scene) - m_time.get_framerate() * elapsed;
        m_nla.set_frame_offset(logic.scene, frame_offset)
    }
}

/**
 * Return numerical URL param
 */
function get_url_param(name) {
    var url = location.href.toString();
    if (url.indexOf("?") == -1)
        return 0;
    var params = url.split("?")[1].split("&");
    for (var i = 0; i < params.length; i++) {
        var param = params[i].split("=");
        if (param.length > 1 && param[0] == name)
            return Number(param[1]);
    }
    return 0;
}

function get_object(node) {
    return m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.dupli_name_list, 0);
}

function entrypoint_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch(logic.state) {
    case RUNNING:
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}
function hide_object_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch(logic.state) {
    case INITIALIZATION:
        node.obj = get_object(node);
        break;
    case RUNNING:
        m_scs.hide_object(node.obj);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}
function show_object_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch(logic.state) {
    case INITIALIZATION:
        node.obj = get_object(node);
        break;
    case RUNNING:
        m_scs.show_object(node.obj);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}
function pageparam_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch(logic.state) {
    case RUNNING:
        thread_state.variables[node.vard] = get_url_param(node.param_name);
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}
var gen_cb = function() {
    return function (obj, id, pulse, param) {
        var node = param[0];
        var logic = param[1];
        var thread = param[2];
        for (var i = 0; i < node.sel_objs_len; i++) {
            if (m_ctl.get_sensor_value(obj, id, i) &&
                i == node.sel_obj_idx) {
                if (logic.nla_in_play && logic.nla_thread == node.thread)
                    node.state = -1;
                else {
                    if (!(thread.thread_state.block_sel && !node.bools["no_wait"]))
                        node.state = 1;
                }
                return;
            }
        }
        node.state = 0;
    }
};
function create_select_sensor(node, logic, thread) {
    var obj = get_object(node);

    var sel_objs = m_obj.get_selectable_objects(logic.scene);
    var obj_idx = sel_objs.indexOf(obj);

    if (obj_idx == -1) {
        m_print.error("logic script error: non-selectable object:",
            node["dupli_name_list"][node["dupli_name_list"].length -1]);
        return -1;
    }
    node.state = -1;
    node.sel_objs_len = sel_objs.length;
    node.sel_obj_idx = obj_idx;

    var sel_sensors = [];
    for (var j = 0; j < sel_objs.length; j++) {
        sel_sensors.push(m_ctl.create_selection_sensor(sel_objs[j], true));
    }

    var select_cb = gen_cb();
    m_ctl.create_sensor_manifold(obj, "LOGIC_NODES_SELECT_" + node.label, m_ctl.CT_SHOT,
        sel_sensors, m_ctl.default_OR_logic_fun, select_cb, [node, logic, thread]);
}
function select_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch(logic.state) {
    case INITIALIZATION:
        create_select_sensor(node, logic, logic.logic_threads[thread_state.thread_index]);
        break;
    case RUNNING:
        if (node.state > -1) {
            thread_state.curr_node = node.state ? node.slot_idx_jump : node.slot_idx_order;
            node.state = -1;
            break;
        }
        if (node.bools["not_wait"]) {
            thread_state.curr_node = node.slot_idx_order;
            break;
        }
        break;
    }
}

function play_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch(logic.state) {
    case INITIALIZATION:
        logic.no_nla_control = false;
        break;
    case RUNNING:
        // when another thread want to play
        if (logic.nla_in_play && !node.in_play) {
            if (logic.curr_thread == logic.nla_thread)
                break;
            logic.nla_in_play = false;

            // set next node
            for (var i = 0; i < logic.logic_threads.length; i++) {
                var thread = logic.logic_threads[i];
                if (thread == logic.nla_thread) {
                    thread.thread_state.curr_node = thread.nodes[thread.thread_state.curr_node].slot_idx_order
                }
            }
            reset_play(logic.nla_thread)
        }
        var cf = m_nla.calc_curr_frame_scene(logic.scene._nla, timeline, false, start_time);
        if (!node.in_play) {
            var frame_offset = m_nla.get_frame_offset(logic.scene) + (node.frame_start - cf);
            m_nla.set_frame_offset(logic.scene, frame_offset)
            node.in_play = true;
            logic.nla_thread = logic.curr_thread;
            logic.nla_in_play = true;
        } else {
            if (cf >= node.frame_end) {
                node.in_play = false;
                logic.nla_in_play = false;
                logic.nla_thread = null;
                thread_state.curr_node = node.slot_idx_order;
            }
        }
        break;
    }
}

function redirect_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch(logic.state) {
    case RUNNING:
        window.location.href = node.url;
        logic.state = STOPPED
        break;
    }
}


function send_req_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    function asset_cb(loaded_data, uri, type, path, param) {
        for (var prop in loaded_data) {
            for (var ind in param[0].parse_resp_list) {
                if (prop == param[0].parse_resp_list[ind]) {
                    param[1][prop] = loaded_data[prop];
                }
            }
        }
        param[0].state = 1;
    }
    switch(logic.state) {
    case RUNNING:
        switch(node.state) {
        case -1:
            node.state = 0;
            m_assets.enqueue([[node.url, m_assets.AT_JSON, node.url, [node, thread_state.variables]]], asset_cb, null, null);
            break;
        case 0:
            break;
        case 1:
            node.state = -1;
            thread_state.curr_node = node.slot_idx_order;
            break;
        }
        break;
    }
}

function inherit_mat_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        for (var i = 0; i < 2; i++)
            node.objects["id"+i] = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id"+i], 0);
        break;
    case RUNNING:
        m_batch.inherit_material(node.objects['id0'], node.materials_names['id0'], node.objects['id1'], node.materials_names['id1'])
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function delay_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        break;
    case RUNNING:
        if (node.state == -1) {
            // start delay
            node.state = 0;
            node.timer = 0;
            return;
        } else if (node.state == 0) {
            // count the time
            node.timer += elapsed;
            if (node.floats["dl"] < node.timer) {
                node.state = -1;
                thread_state.curr_node = node.slot_idx_order;
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
        var key = node.common_usage_names['sk']
        if (!m_geom.check_shape_keys(obj)) {
            m_print.error("No shape keys in object:", obj.name);
            node.mute = true
        } else if (!m_geom.has_shape_key(obj, key)) {
            m_print.error("Wrong key name:", key);
            node.mute = true
        }
        break;
    case RUNNING:
        m_geom.apply_shape_key(node.objects["id0"], node.common_usage_names['sk'],
            node.bools["skv"] ? thread_state.variables[node.vars['skv']] : node.floats['skv'])
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function outline_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        var obj = node.objects["id0"] =
            m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
        if (!(obj && obj.render && obj.render.outlining)) {
            m_print.error("Can't evaluate 'Outline' logic node: wrong object");
            node.mute = true
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
                    node.bools["in"] ? thread_state.variables[node.vars['in']] : node.floats['in'];
            break;
        }
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function set_shader_node_param_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch (logic.state) {
    case INITIALIZATION:
        if (node.objects_paths["id0"]) {
            node.objects["id0"] = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST, node.objects_paths["id0"], 0);
            node.nodes_paths["id0"].unshift(node.materials_names["id0"])
        }
        break;
    case RUNNING:
        if (node.shader_nd_type == "ShaderNodeRGB") {
            m_obj.set_nodemat_rgb(node.objects["id0"], node.nodes_paths["id0"],
                node.bools["id0"] ? thread_state.variables[node.vars["id0"]] : node.floats["id0"],
                node.bools["id1"] ? thread_state.variables[node.vars["id1"]] : node.floats["id1"],
                node.bools["id2"] ? thread_state.variables[node.vars["id2"]] : node.floats["id2"]);
        }

        if (node.shader_nd_type == "ShaderNodeValue") {
            m_obj.set_nodemat_value(node.objects["id0"], node.nodes_paths["id0"],
                node.bools["id0"] ? thread_state.variables[node.vars["id0"]] : node.floats["id0"]);
        }
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function math_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch(logic.state) {
    case RUNNING:
        var val1 = (node.var1 == -1) ? node.num1 : thread_state.variables[node.var1];
        var val2 = (node.var2 == -1) ? node.num2 : thread_state.variables[node.var2];

        switch (node.op) {
        case "ADD":
            thread_state.variables[node.vard] = val1 + val2;
            break;
        case "MUL":
            thread_state.variables[node.vard] = val1 * val2;
            break;
        case "SUB":
            thread_state.variables[node.vard] = val1 - val2;
            break;
        case "DIV":
            if (val2 == 0)
                m_util.panic("Division by zero in Logic script");

            thread_state.variables[node.vard] = val1 / val2;
            break;
        }
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function conditional_jump_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    switch(logic.state) {
    case RUNNING:
        var val1 = (node.var1 == -1) ? node.num1 : thread_state.variables[node.var1];
        var val2 = (node.var2 == -1) ? node.num2 : thread_state.variables[node.var2];
        var cond_result = false;

        switch (node.cond) {
        case "EQUAL":
            if (val1 == val2)
                cond_result = true;
            break;
        case "NOTEQUAL":
            if (val1 != val2)
                cond_result = true;
            break;
        case "LESS":
            if (val1 < val2)
                cond_result = true;
            break;
        case "GREATER":
            if (val1 > val2)
                cond_result = true;
            break;
        case "LEQUAL":
            if (val1 <= val2)
                cond_result = true;
            break;
        case "GEQUAL":
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
    switch(logic.state) {
    case RUNNING:
        thread_state.variables[node.vard] = node.num1;
        thread_state.curr_node = node.slot_idx_order;
        break;
    }
}

function play_anim_handler(node, logic, thread_state, timeline, elapsed, start_time) {
    var slot = m_anim.SLOT_ALL
    if (!node.anim_name == "")
        slot = m_anim.SLOT_0
    switch(logic.state) {
    case INITIALIZATION:
        node.obj = get_object(node);
        break;
    case RUNNING:
        if (!m_anim.is_play(node.obj, slot)) {
            if (node.state == 0)
                node.state = 1;
        }
        switch (node.state) {
        case -1:
            // not playing
            if (node.anim_name == "") {
                m_anim.apply_def(node.obj);
            } else {
                m_anim.apply(node.obj, node.anim_name, slot);
            }
            // blocking selection
            if (!node.bools["not_wait"])
                thread_state.block_sel = true;
            m_anim.set_behavior(node.obj, m_anim.AB_FINISH_STOP, slot);
            m_anim.set_first_frame(node.obj, slot);
            m_anim.play(node.obj, null, slot);
            node.state = 0;
            break;
        case 0:
            // playing
            if (node.bools["not_wait"]) {
                thread_state.curr_node = node.slot_idx_order;
                node.state = -1;
            }
            break;
        case 1:
            // end playing
            // unblocking selection
            if (!node.bools["not_wait"])
                thread_state.block_sel = false;
            thread_state.curr_node = node.slot_idx_order;
            node.state = -1;
            break;
        default:
            node.state = -1;
            break;
        }
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
    logic.state = INITIALIZATION
    for (var k = 0; k < bpy_logic_threads.length; k++) {
        var thread = {
            nodes: [],
            thread_state: {
                scene: scene,
                curr_node: 0,
                block_sel: false,  // used for selection blocking during Play Anim
                                   // in cases when "Do Not Wait" is not checked
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
        }
        logic_threads.push(thread);
        var logic_script = logic_threads[logic_threads.length - 1];
        var subtree = bpy_logic_threads[k];
        for (var i = 0; i < subtree.length; i++) {
            var snode = subtree[i];
            var node = {
                type: snode["type"],
                label: snode["label"],
                slot_idx_order: snode["slot_idx_order"],
                slot_idx_jump: snode["slot_idx_jump"],
                frame_start: snode["frame_range"][0],
                frame_end: snode["frame_range"][1],
                in_play: false,
                state: -1,
                sel_objs_len: -1,
                sel_obj_idx: -1,
                cond: snode["condition"],
                var1: snode["variable1"],
                var2: snode["variable2"],
                num1: snode["number1"],
                num2: snode["number2"],
                vard: snode["variabled"],
                url: snode["url"],
                param_name: snode["param_name"],
                op: snode["operation"],
                mute: snode["mute"],
                dupli_name_list:snode["object"],
                obj: null,
                objects:{},
                anim_name: snode["anim_name"],
                parse_resp_list: snode["parse_resp_list"],
                objects_paths: snode["objects_paths"],
                nodes_paths: snode["nodes_paths"],
                floats: snode["floats"],
                bools: snode["bools"],
                vars: snode["variables"],
                materials_names: snode["materials_names"],
                shader_nd_type: snode["shader_nd_type"],
                common_usage_names: snode["common_usage_names"],
                thread: logic_script,
                process_node: _nodes_handlers[snode.type]?_nodes_handlers[snode.type]:unknown_node_handler,
                processed: false,
                timer: 0
            }

            // just copy all
            logic_script.nodes.push(node);
        }
        for (var l = 0; l < logic_script.nodes.length; l++) {
            node = logic_script.nodes[l]
            node.process_node(node, logic, thread.thread_state, 0, 0);
        }
    }
    logic.state = RUNNING
    _logic_arr.push(logic)
}

exports.cleanup = function() {
    _logic_arr = [];
}
}
