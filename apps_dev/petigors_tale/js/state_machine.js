"use strict"

b4w.register("state_machine", function(exports, require) {

var m_ver       = require("version");
var DEBUG = (m_ver.type() === "DEBUG");

exports.state_machine_create = state_machine_create;
function state_machine_create() {
    return {
        nodes: [],
        instances:[],
        lock: false
    }
}

exports.state_machine_add_state = state_machine_add_state;
function state_machine_add_state(state_machine, id, allowed_ids, call_before_switch, call_after_switch,
                                 call_switch_from, call_switch_to, init_state, payload) {
        state_machine.nodes.push({id: id, allowed_ids: allowed_ids, call_before_switch: call_before_switch,
        call_after_switch: call_after_switch, call_switch_from: call_switch_from, call_switch_to: call_switch_to,
        init_state: init_state, payload:payload, instances: []})
}

exports.state_machine_validate = state_machine_validate;
function state_machine_validate(state_machine) {
    var names = [];
    for (var i = 0; i < state_machine.nodes; i++) {
        var id = state_machine.nodes[i].id;
        if (names.indexOf(id) >= 0) {
            if (DEBUG)
                console.log("Found states with the same id " + id);
            return false;
        } else
            names.push(id);
    }
    for (var i = 0; i < state_machine.nodes; i++) {
        var node = state_machine.nodes[i];
        for (var j = 0; j < node.allowed_ids.length; j++) {
            if (names.indexOf(node.allowed_ids[j]) < 0) {
                if (DEBUG)
                    console.log("Found bad id" + node.allowed_ids[j]);
                return false;
            }
        }
    }
    return true;
}

exports.state_machine_create_instance = state_machine_create_instance;
function state_machine_create_instance(state_machine) {
    state_machine.instances.push({current_node:null});
    var id = state_machine.instances.length - 1;
    for (var i = 0; i < state_machine.nodes.length; i++) {
        state_machine.nodes[i].instances.push({});
        if (state_machine.nodes[i].init_state)
            state_machine.nodes[i].init_state(state_machine.nodes[i], state_machine.nodes[i].instances.length - 1);
    }
    return id;
}

exports.state_machine_set_start_node = state_machine_set_start_node;
function state_machine_set_start_node(state_machine, node_id, instance_id) {
    var node = null;
    for (var i = 0; i < state_machine.nodes.length; i++) {
        if (state_machine.nodes[i].id == node_id) {
            node = state_machine.nodes[i];
            break;
        }
    }
    state_machine.instances[instance_id].current_node = node;
    return node;
}

exports.state_machine_get_state = state_machine_get_state;
function state_machine_get_state(state_machine, instance_id) {
    return state_machine.instances[instance_id].current_node;
}

exports.state_machine_get_state_id = state_machine_get_state_id;
function state_machine_get_state_id(state_machine, instance_id) {
    var curnode = state_machine.instances[instance_id].current_node;
    if (curnode)
        return curnode.id;
    else
        return null;
}

exports.machine_state_get_allowed_transition = machine_state_get_allowed_transition;
function machine_state_get_allowed_transition(state_machine, instance_id) {
    var state = state_machine_get_state(state_machine, instance_id);
    if (state)
        return state.allowed_ids;
    else
        return null
}

exports.state_machine_switch_state = state_machine_switch_state;
function state_machine_switch_state(state_machine, state, instance_id) {
    if (state_machine.lock) {
        if (DEBUG)
            console.log("state machine is locked");
        return false;
    }
    var cur_state = state_machine_get_state(state_machine, instance_id);
    var old_state = cur_state.id;
    if (cur_state.allowed_ids.indexOf(state) >= 0) {
        var before = true;
        if (cur_state.call_before_switch) {
            before = cur_state.call_before_switch(old_state, state, cur_state, null, instance_id)
        }
        if (before) {
            var eq = old_state == state;
            state_machine_set_start_node(state_machine, state, instance_id);
            var new_state = state_machine_get_state(state_machine, instance_id);
            if (cur_state.call_after_switch)
                cur_state.call_after_switch(old_state, state, cur_state, new_state, instance_id);
            if (cur_state.call_switch_from)
                cur_state.call_switch_from(eq, true, old_state, state, cur_state, new_state, instance_id);
            if (new_state.call_switch_to)
                new_state.call_switch_to(eq, false, old_state, state, cur_state, new_state, instance_id);
            return true
        } else {
            if (DEBUG)
                console.log("blocked by callback");
        }
    } else {
        if (DEBUG)
            console.log("transition is not allowed: " + old_state + "->" + state);
    }
    return false
}
})