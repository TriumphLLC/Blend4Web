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
 * Generic graph routines.
 *
 * @name graph
 * @namespace
 * @exports exports as graph
 */
b4w.module["__graph"] = function(exports, require) {

var m_print = require("__print");
var m_util  = require("__util");

var NULL_NODE    = -1;
var NULL         = 0;

var FORWARD_DIR  = 10;
var BACKWARD_DIR = 20;
var TWO_WAY      = 30;

var _next_pair_cache = [NULL_NODE, NULL_NODE];

exports.NULL_NODE    = NULL_NODE;
exports.FORWARD_DIR  = FORWARD_DIR;
exports.BACKWARD_DIR = BACKWARD_DIR;
exports.TWO_WAY      = TWO_WAY;

/**
 * Create graph using constructor pattern.
 * @param node_or_edge1 Node [ID, ATTR] or Edge [ID1, ID2, ATTR]
 * @param node_or_edge2 ...
 */
exports.create = function() {

    var node_edge_arr = arguments;

    var nodes = [];
    var edges = [];

    for (var i = 0; i < node_edge_arr.length; i++) {
        var node_edge = node_edge_arr[i];

        switch(node_edge.length) {
        case 2:
            // node index, edge attribute
            nodes.push(node_edge[0], node_edge[1]);
            break;
        case 3:
            // node index 1, node index 2, edge attrubute
            edges.push(node_edge[0], node_edge[1], node_edge[2]);
            break;
        default:
            m_util.panic("Wrong graph constructor params");
            break;
        }
    }

    var graph = {
        nodes: nodes,
        edges: edges
    };

    return graph;
}

exports.clone = function(graph, nodes_cb, edges_cb) {
    if (nodes_cb) {
        var nodes = new Array(graph.nodes.length);
        for (var i = 0; i < graph.nodes.length; i+=2) {
            nodes[i] = graph.nodes[i];
            nodes[i+1] = nodes_cb(graph.nodes[i+1]);
        }
    } else
        var nodes = m_util.clone_object_r(graph.nodes);

    if (edges_cb) {
        var edges = new Array(graph.edges.length);
        for (var i = 0; i < graph.edges.length; i+=3) {
            edges[i] = graph.edges[i];
            edges[i+1] = graph.edges[i+1];
            edges[i+2] = edges_cb(graph.edges[i+2]);
        }
    } else
        var edges = m_util.clone_object_r(graph.edges);

    var graph = {
        nodes: nodes,
        edges: edges
    };

    return graph;
}

/**
 * Create graph using separate node and edge arrays.
 */
exports.create_node_edge_arr = function(nodes_arr, edges_arr) {

    var nodes = [];
    var edges = [];

    for (var i = 0; i < nodes_arr.length; i++)
        nodes.push(nodes_arr[i][0], nodes_arr[i][1]);

    for (var i = 0; i < edges_arr.length; i++)
        edges.push(edges_arr[i][0], edges_arr[i][1], edges_arr[i][2]);

    var graph = {
        nodes: nodes,
        edges: edges
    };
    return graph;
}

exports.append_node = append_node;
function append_node(graph, id, attr) {
    if (!attr)
        attr = null;

    if (has_node(graph, id))
        m_util.panic("Graph already has node with given ID");
    else
        graph.nodes.push(id, attr);
}

exports.has_node = has_node;
function has_node(graph, id) {
    var nodes = graph.nodes;

    for (var i = 0; i < nodes.length; i+=2)
        if (nodes[i] == id)
            return true;

    return false;
}

exports.append_edge = append_edge;
/**
 * NOTE: check multiple edges case
 */
function append_edge(graph, id1, id2, attr) {
    if (!attr)
        attr = null;

    if (!has_node(graph, id1) || !has_node(graph, id2))
        m_util.panic("Wrong node IDs");
    else
        graph.edges.push(id1, id2, attr);
}

exports.remove_node = remove_node;
function remove_node(graph, id) {
    if (!has_node(graph, id))
        m_util.panic("Node not found");

    var nodes = graph.nodes;

    for (var i = 0; i < nodes.length; i+=2) {
        if (nodes[i] == id) {
            nodes.splice(i, 2);
            i-=2;
        }
    }
}
exports.remove_edge = remove_edge;
function remove_edge(graph, id1, id2, edge_num) {
    if (!has_edge(graph, id1, id2))
        m_util.panic("Edge not found");

    var edges = graph.edges;
    var count = 0;

    for (var i = 0; i < edges.length; i+=3) {
        if (edges[i] == id1 && edges[i+1] == id2) {
            if (edge_num == -1)
                edges.splice(i, 3);
            else {
                if (edge_num == count) {
                    edges.splice(i, 3);
                    break;
                }
                count++;
            }

            i-=3;
        }
    }
}
exports.remove_edge_by_attr = remove_edge_by_attr;
function remove_edge_by_attr(graph, id1, id2, attr) {
    if (!has_edge(graph, id1, id2))
        m_util.panic("Edge not found");
    var edges = graph.edges;

    for (var i = 0; i < edges.length; i+=3) {
        if (edges[i] == id1 && edges[i+1] == id2
                && edges[i+2][0] == attr[0] && edges[i+2][1] == attr[1]) {
            edges.splice(i, 3);
            break;
        }
    }
}

/**
 * Append node by attribute.
 * Perform attribute uniqueness test and append newly allocated node to graph
 * with that unique attribute.
 * @returns New node ID
 */
exports.append_node_attr = function(graph, attr) {
    if (node_by_attr(graph, attr) == NULL_NODE) {
        var node_id = gen_node_id(graph);
        append_node(graph, node_id, attr);
        return node_id;
    } else
        m_util.panic("Non-unique attribute");
}

/**
 * For edges connecting two node IDs with given attribute replace it by the new one.
 */
exports.replace_edge_attr = function(graph, id1, id2, attr_old, attr_new) {
    var edges = graph.edges;
    for (var i = 0; i < edges.length; i+=3)
        if (edges[i] == id1 && edges[i+1] == id2 && edges[i+2] == attr_old)
            edges[i+2] = attr_new;
}

/**
 * Append the subgraph to the given graph.
 * @param {Graph} subgraph Subgraph to append
 * @param {Graph} graph Graph to append to
 * @param {Edge[]} subgraph_graph_edges subgraph->graph inter-graph edges
 * @param {Edge[]} graph_subgraph_edges graph->subgraph inter-graph edges
 */
exports.append_subgraph = function(subgraph, graph,
        subgraph_graph_edges, graph_subgraph_edges) {

    subgraph_graph_edges = subgraph_graph_edges || [];
    graph_subgraph_edges = graph_subgraph_edges || [];

    var ids_new = {};

    for (var i = 0; i < subgraph.nodes.length; i+=2) {
        var id_sub = subgraph.nodes[i];
        var attr = subgraph.nodes[i+1];

        // subgraph new node id (inside graph)
        var id_sub_new = gen_node_id(graph);
        append_node(graph, id_sub_new, attr);
        ids_new[id_sub] = id_sub_new;
    }

    for (var i = 0; i < subgraph.edges.length; i+=3) {
        var id1_sub_new = ids_new[subgraph.edges[i]];
        var id2_sub_new = ids_new[subgraph.edges[i+1]];

        var attr_edge = subgraph.edges[i+2];

        append_edge(graph, id1_sub_new, id2_sub_new, attr_edge);
    }

    for (var i = 0; i < subgraph_graph_edges.length; i+=3) {
        var id1_sub_new = ids_new[subgraph_graph_edges[i]];
        var id2 = subgraph_graph_edges[i+1];
        var attr_edge = subgraph_graph_edges[i+2];

        append_edge(graph, id1_sub_new, id2, attr_edge);
    }

    for (var i = 0; i < graph_subgraph_edges.length; i+=3) {
        var id1 = graph_subgraph_edges[i];
        var id2_sub_new = ids_new[graph_subgraph_edges[i+1]];

        var attr_edge = graph_subgraph_edges[i+2];

        append_edge(graph, id1, id2_sub_new, attr_edge);
    }
}


exports.gen_node_id = gen_node_id;
function gen_node_id(graph) {

    var nodes = graph.nodes;
    var counter = -1;

    for (var i = 0; i < nodes.length; i+=2)
        counter = Math.max(counter, nodes[i]);

    return (++counter);
}

exports.node_by_attr = node_by_attr;
/**
 * Find first node by attribute.
 */
function node_by_attr(graph, attr) {
    var nodes = graph.nodes;

    for (var i = 0; i < nodes.length; i+=2)
        if (nodes[i+1] == attr)
            return nodes[i];

    // not found
    return NULL_NODE;
}

/**
 * Append new edge by two node attributes.
 * All node attributes must be unique, because the edge is appended only ones.
 */
exports.append_edge_attr = function(graph, attr_node1, attr_node2, attr_edge) {
    var id1 = node_by_attr(graph, attr_node1);
    var id2 = node_by_attr(graph, attr_node2);

    if (id1 != NULL_NODE && id2 != NULL_NODE)
        append_edge(graph, id1, id2, attr_edge);
    else
        m_util.panic("Attributes not found");
}

/**
 * Traverse graph and exec callback per node.
 * return any positive value from callback to interrupt traversal
 * do not try to modify graph structure in callback
 */
exports.traverse = function(graph, callback) {
    var nodes = graph.nodes;

    for (var i = 0; i < nodes.length; i+=2)
        if (callback(nodes[i], nodes[i+1]))
            break;
}

/**
 * Traverse graph and exec callback per edge.
 * return any positive value from callback to interrupt traversal
 * do not try to modify graph structure in callback
 */
exports.traverse_edges = function(graph, callback) {
    var edges = graph.edges;

    for (var i = 0; i < edges.length; i+=3)
        if (callback(edges[i], edges[i+1], edges[i+2]))
            break;
}

/**
 * Traverse node inputs and exec callback per input.
 * return any positive value from callback to interrupt traversal
 * do not try to modify graph structure in callback
 */
exports.traverse_inputs = function(graph, node, callback) {

    var edges = graph.edges;

    for (var i = 0; i < edges.length; i+=3)
        if (edges[i+1] == node) {
            var node_in = edges[i];
            if (callback(node_in, get_node_attr(graph, node_in), edges[i+2]))
                return;
        }
}

/**
 * Traverse node outputs and exec callback per output.
 * return any positive value from callback to interrupt traversal
 * do not try to modify graph structure in callback
 */
exports.traverse_outputs = function(graph, node, callback) {
    var edges = graph.edges;

    for (var i = 0; i < edges.length; i+=3)
        if (edges[i] == node) {
            var node_out = edges[i+1];
            if (callback(node_out, get_node_attr(graph, node_out), edges[i+2]))
                return;
        }
}

exports.topsort = topsort;
/**
 * Topological sorting based on depth-first search algorithm.
 * @param graph Graph
 * @returns New graph with sorted nodes
 */
function topsort(graph) {

    var new_nodes = [];
    var visit_state = {};
    set_unvisited(graph, visit_state);

    var nodes = graph.nodes;
    for (var i = 0; i < nodes.length; i+=2)
        if (in_edge_count(graph, nodes[i]) == 0)
            topsort_iter(graph, nodes[i], visit_state, new_nodes);

    var new_graph = {
        nodes: new_nodes,
        edges: graph.edges.slice(0)
    };

    return new_graph;
}

function set_unvisited(graph, visit_state) {
    var nodes = graph.nodes;

    for (var i = 0; i < nodes.length; i+=2)
        visit_state[nodes[i]] = false;
}

/**
 * topsort visit function
 */
function topsort_iter(graph, node_id, visit_state, new_nodes) {
    if (!visit_state[node_id]) {
        visit_state[node_id] = true;

        for (var i = 0; i < out_edge_count(graph, node_id); i++) {
            var other = get_out_edge(graph, node_id, i);
            topsort_iter(graph, other, visit_state, new_nodes);
        }

        new_nodes.unshift(node_id, get_node_attr(graph, node_id));
    }
}


/**
 * Topological sorting based on depth-first search algorithm.
 * @param graph Graph
 * @returns {Array} Array of node attributes
 */
exports.topsort_attr = function(graph) {
    var nodes = topsort(graph).nodes;
    var result = [];

    for (var i = 0; i < nodes.length; i+=2)
        result.push(nodes[i+1]);

    return result;
}


exports.is_connected = function(graph) {
    // TODO: implement when needed
}

/**
 * Compose a new subgraph with the nodes connected to a given node.
 */
exports.subgraph_node_conn = function(graph, node_id, dir) {
    if (!has_node(graph, node_id))
        m_util.panic("No such node");

    var visit_state = {};
    set_unvisited(graph, visit_state);

    subgraph_node_conn_iter(graph, node_id, visit_state, dir);

    var new_nodes = [];
    for (var id in visit_state) {
        if (visit_state[id]) {
            // String->Number conversion
            var id = Number(id);
            new_nodes.push(id, get_node_attr(graph, id));
        }
    }

    var new_graph = {
        nodes: new_nodes,
        edges: graph.edges.slice(0)
    };
    cleanup_loose_edges(new_graph);

    return new_graph;
}

function subgraph_node_conn_iter(graph, node_id, visit_state, dir) {
    if (!visit_state[node_id]) {
        visit_state[node_id] = true;

        if (dir == FORWARD_DIR || dir == TWO_WAY) {
            for (var i = 0; i < out_edge_count(graph, node_id); i++) {
                var other = get_out_edge(graph, node_id, i);
                subgraph_node_conn_iter(graph, other, visit_state, dir);
            }
        }

        if (dir == BACKWARD_DIR || dir == TWO_WAY) {
            for (var i = 0; i < in_edge_count(graph, node_id); i++) {
                var other = get_in_edge(graph, node_id, i);
                subgraph_node_conn_iter(graph, other, visit_state, dir);
            }
        }
    }
}

exports.cleanup_loose_edges = cleanup_loose_edges;
function cleanup_loose_edges(graph) {
    var nodes = graph.nodes;
    var edges = graph.edges;

    for (var i = 0; i < edges.length; i+=3) {
        var node1 = edges[i];
        var node2 = edges[i+1];

        // remove half-edges too
        if (!has_node(graph, node1) || !has_node(graph, node2)) {
            edges.splice(i, 3);
            i-=3;
        }
    }
}

/**
 * Find array of nodes with 0 in-degree.
 */
exports.get_source_nodes = function(graph) {
    var result = [];

    var nodes = graph.nodes;
    for (var i = 0; i < nodes.length; i+=2) {
        var node = nodes[i];
        if (!in_edge_count(graph, node))
            result.push(node);
    }

    return result;
}

/**
 * Find array of nodes with 0 out-degree.
 */
exports.get_sink_nodes = get_sink_nodes;
function get_sink_nodes(graph) {
    var result = [];

    var nodes = graph.nodes;
    for (var i = 0; i < nodes.length; i+=2) {
        var node = nodes[i];
        if (!out_edge_count(graph, node))
            result.push(node);
    }

    return result;
}

/**
 * Search for graph2 subgraph isomorphic to graph1 using VF2 algorithm.
 * graph1 <= graph2
 * @see VFLIB implementation
 * @param graph1 Graph 1 (small one)
 * @param graph2 Graph 2 (big one)
 * @param [node_comp] Node attribute comparator function
 * @param [edge_comp] Edge attribute comparator function
 * @returns Pair [nodes_in_1, nodes_in_2] or null
 */
exports.match = function(graph1, graph2, node_comp, edge_comp) {
    var state = {};

    // NOTE: current VFLIB implementation require strict node order:
    // ID1, ID2, ID3 -> 0, 1, 2
    state.g1 = gen_ordered_graph(graph1);
    state.g2 = gen_ordered_graph(graph2);

    state.node_comp = node_comp ||
        function(attr1, attr2) {
            return (attr1 == attr2);
        }

    state.edge_comp = edge_comp ||
        function(attr1, attr2) {
            return (attr1 == attr2);
        }

    var n1 = node_count(graph1);
    var n2 = node_count(graph2);
    state.n1 = n1;
    state.n2 = n2;

    // NOTE: for compatibility
    state.order = NULL;

    state.core_len = state.orig_core_len = 0;
    state.t1both_len = state.t1in_len = state.t1out_len = 0;
    state.t2both_len = state.t2in_len = state.t2out_len = 0;

	state.added_node1 = NULL_NODE;

    state.core_1 = Array(n1);
    state.core_2 = Array(n2);

    state.in_1 = new Array(n1);
    state.in_2 = new Array(n2);
    state.out_1 = new Array(n1);
    state.out_2 = new Array(n2);

    // NOTE: simulate *var = 1 pattern
    state.share_count = [1];

    for (var i = 0; i < n1; i++) {
        state.core_1[i] = NULL_NODE;

        state.in_1[i] = 0;
        state.out_1[i] = 0;
    }

    for (var i = 0; i < n2; i++) {
        state.core_2[i] = NULL_NODE;

        state.in_2[i] = 0;
        state.out_2[i] = 0;
    }

    var c1 = new Array(n1);
    var c2 = new Array(n1);

    var res = match_iter(c1, c2, state);
    if (res) {
        // calculate original node IDs
        for (var i = 0; i < c1.length; i++) {
            c1[i] = graph1.nodes[2*c1[i]];
            c2[i] = graph2.nodes[2*c2[i]];
        }
        return [c1, c2];
    } else
        return null;
}

function node_count(graph) {
    return graph.nodes.length / 2;
}

/**
 * Place node IDs in strict succession, so graph.nodes[2*i] == i
 */
function gen_ordered_graph(graph) {
    var nodes = graph.nodes;
    var edges = graph.edges;

    var new_nodes = [];
    var new_edges = [];

    // old graph node ID -> new graph node ID
    var map = [];

    for (var i = 0; i < nodes.length; i++) {
        map[nodes[2*i]] = i;
        new_nodes.push(i, nodes[2*i+1]);
    }

    for (var i = 0; i < edges.length; i+=3) {
        new_edges.push(map[edges[i]], map[edges[i+1]], edges[i+2]);
    }

    var new_graph = {
        nodes: new_nodes,
        edges: new_edges
    }

    return new_graph;
}


function match_iter(c1, c2, state) {
    if (state_is_goal(state)) {
        state_get_core_set(state, c1, c2);
        return true;
    }

    if (state_is_dead(state))
        return false;

    var n1 = NULL_NODE;
    var n2 = NULL_NODE;
    var found = false;

    while (!found && state_next_pair(state, _next_pair_cache, n1, n2)) {
        var n1 = _next_pair_cache[0];
        var n2 = _next_pair_cache[1];

        if (state_is_feasible_pair(state, n1, n2)) {
            var new_state = state_clone(state);
            state_add_pair(new_state, n1, n2);
            found = match_iter(c1, c2, new_state);
            state_back_track(new_state);
        }
    }
    return found;
}

function state_is_goal(state) {
    return (state.core_len == state.n1);
}

function state_core_len(state) {
    return state.core_len;
}

function state_get_core_set(state, c1, c2) {
    for (var i = 0, j = 0; i < state.n1; i++)
        if (state.core_1[i] != NULL_NODE) {
            c1[j] = i;
            c2[j] = state.core_1[i];
            j++;
        }
}

function state_is_dead(state) {
    return (state.n1 > state.n2 || state.t1both_len > state.t2both_len ||
            state.t1out_len > state.t2out_len || state.t1in_len > state.t2in_len);
}

function state_next_pair(state, next_pair, prev_n1, prev_n2) {
    if (prev_n1 == NULL_NODE)
        prev_n1 = 0;

    if (prev_n2 == NULL_NODE)
        prev_n2 = 0;
    else
        prev_n2++;

    var t1both_len = state.t1both_len;
    var t2both_len = state.t2both_len;
    var t1out_len = state.t1out_len;
    var t2out_len = state.t2out_len;
    var t1in_len = state.t1in_len;
    var t2in_len = state.t2in_len;
    var core_len = state.core_len;

    var n1 = state.n1;
    var n2 = state.n2;

    var core_1 = state.core_1;
    var core_2 = state.core_2;
    var in_1 = state.in_1;
    var in_2 = state.in_2;
    var out_1 = state.out_1;
    var out_2 = state.out_2;

	if (t1both_len > core_len && t2both_len > core_len) {
        while (prev_n1 < n1 && (core_1[prev_n1] != NULL_NODE ||
                out_1[prev_n1] == 0 || in_1[prev_n1] == 0)) {
            prev_n1++;
            prev_n2 = 0;
        }
	} else if (t1out_len > core_len && t2out_len > core_len) {
        while (prev_n1 < n1 && (core_1[prev_n1] != NULL_NODE || out_1[prev_n1] == 0)) {
            prev_n1++;
            prev_n2 = 0;
        }
	} else if (t1in_len > core_len && t2in_len > core_len) {
        while (prev_n1 < n1 && (core_1[prev_n1] != NULL_NODE || in_1[prev_n1] == 0)) {
            prev_n1++;
            prev_n2 = 0;
        }
    // NOTE: order is not supported
	} else if (prev_n1 == 0 && state.order != NULL) {
        var i = 0;
	    while (i < n1 && core_1[prev_n1 = state.order[i]] != NULL_NODE)
	        i++;
	    if (i == n1)
	        prev_n1 = n1;
	} else {
        while (prev_n1 < n1 && core_1[prev_n1] != NULL_NODE) {
            prev_n1++;
            prev_n2 = 0;
        }
	}

	if (t1both_len > core_len && t2both_len > core_len) {
        while (prev_n2 < n2 && (core_2[prev_n2] != NULL_NODE ||
                out_2[prev_n2] == 0 || in_2[prev_n2] == 0)) {
            prev_n2++;
        }
	} else if (t1out_len > core_len && t2out_len > core_len) {
        while (prev_n2 < n2 && (core_2[prev_n2] != NULL_NODE || out_2[prev_n2] == 0)) {
            prev_n2++;
        }
	} else if (t1in_len > core_len && t2in_len > core_len) {
        while (prev_n2 < n2 && (core_2[prev_n2] != NULL_NODE || in_2[prev_n2] == 0)) {
            prev_n2++;
        }
	} else {
        while (prev_n2 < n2 && core_2[prev_n2] != NULL_NODE) {
            prev_n2++;
        }
	}

    if (prev_n1 < n1 && prev_n2 < n2) {
        // *pn1, *pn2
        next_pair[0] = prev_n1;
        next_pair[1] = prev_n2;
        return true;
    }

    return false;
}

function state_is_feasible_pair(state, node1, node2) {

    var g1 = state.g1;
    var g2 = state.g2;

    var n1 = state.n1;
    var n2 = state.n2;

    var core_1 = state.core_1;
    var core_2 = state.core_2;
    var in_1 = state.in_1;
    var in_2 = state.in_2;
    var out_1 = state.out_1;
    var out_2 = state.out_2;

    assert(node1 < n1);
    assert(node2 < n2);
    assert(core_1[node1] == NULL_NODE);
    assert(core_2[node2] == NULL_NODE);

    if (!compatible_node(state.node_comp, g1, node1, g2, node2))
        return false;

    var termout1=0, termout2=0, termin1=0, termin2=0, new1=0, new2=0;

    // Check the 'out' edges of node1
    for (var i = 0; i < out_edge_count(g1, node1); i++) {
        var other1 = get_out_edge(g1, node1, i);

        if (core_1[other1] != NULL_NODE) {
            var other2 = core_1[other1];
            if (!has_edge(g2, node2, other2) ||
                    !compatible_edge(state.edge_comp, g1, node1, other1, g2,
                            node2, other2))
                return false;
        } else {
            if (in_1[other1])
                termin1++;
            if (out_1[other1])
                termout1++;
            if (!in_1[other1] && !out_1[other1])
                new1++;
        }
    }

    // Check the 'in' edges of node1
    for (var i = 0; i < in_edge_count(g1, node1); i++) {
        var other1 = get_in_edge(g1, node1, i);

        if (core_1[other1] != NULL_NODE) {
            var other2 = core_1[other1];
            if (!has_edge(g2, other2, node2) ||
                    !compatible_edge(state.edge_comp, g1, other1, node1, g2,
                            other2, node2))
                return false;
        } else {
            if (in_1[other1])
                termin1++;
            if (out_1[other1])
                termout1++;
            if (!in_1[other1] && !out_1[other1])
                new1++;
        }
    }

    // Check the 'out' edges of node2
    for (var i = 0; i < out_edge_count(g2, node2); i++) {
        var other2 = get_out_edge(g2, node2, i);
        if (core_2[other2] != NULL_NODE) {
            var other1 = core_2[other2];
            if (!has_edge(g1, node1, other1))
                return false;
        } else {
            if (in_2[other2])
                termin2++;
            if (out_2[other2])
                termout2++;
            if (!in_2[other2] && !out_2[other2])
                new2++;
        }
    }

    // Check the 'in' edges of node2
    for (var i = 0; i < in_edge_count(g2, node2); i++) {
        var other2 = get_in_edge(g2, node2, i);
        if (core_2[other2] != NULL_NODE) {
            var other1 = core_2[other2];
            if (!has_edge(g1, other1, node1))
                return false;
        } else {
            if (in_2[other2])
                termin2++;
            if (out_2[other2])
                termout2++;
            if (!in_2[other2] && !out_2[other2])
                new2++;
        }
    }

    return (termin1<=termin2 && termout1<=termout2 && new1<=new2);
}

// NOTE: temporary debug solution
function assert(expr) {
    if (!expr)
        m_util.panic("Assertion failed");
}

/**
 * Compare node attributes
 */
function compatible_node(node_comp, graph1, node1, graph2, node2) {
    if (node_comp(get_node_attr(graph1, node1), get_node_attr(graph2, node2)))
        return true;
    else
        return false;
}

exports.get_node_id = function(graph, attr) {
    var nodes = graph.nodes;

    for (var i = 1; i < nodes.length; i+=2) {
        if (nodes[i] == attr)
            return nodes[i-1];
    }

    return null;
}

exports.get_node_attr = get_node_attr;
function get_node_attr(graph, node) {
    var nodes = graph.nodes;

    for (var i = 0; i < nodes.length; i+=2) {
        if (nodes[i] == node)
            return nodes[i+1];
    }

    return null;
}

exports.out_edge_count = out_edge_count;
function out_edge_count(graph, node) {
    var edges = graph.edges;
    var count = 0;

    for (var i = 0; i < edges.length; i+=3)
        if (edges[i] == node)
            count++;

    return count;
}

exports.in_edge_count = in_edge_count;
function in_edge_count(graph, node) {
    var edges = graph.edges;
    var count = 0;

    for (var i = 0; i < edges.length; i+=3)
        if (edges[i+1] == node)
            count++;

    return count;
}

exports.get_out_edge = get_out_edge;
function get_out_edge(graph, node, num) {
    var edges = graph.edges;
    var count = 0;

    for (var i = 0; i < edges.length; i+=3) {
        if (edges[i] == node) {

            if (count == num)
                return edges[i+1];

            count++;
        }
    }

    return NULL_NODE;
}

exports.get_in_edge = get_in_edge;
function get_in_edge(graph, node, num) {
    var edges = graph.edges;
    var count = 0;

    for (var i = 0; i < edges.length; i+=3) {
        if (edges[i+1] == node) {

            if (count == num)
                return edges[i];

            count++;
        }
    }

    return NULL_NODE;
}

function has_edge(graph, node1, node2) {
    var edges = graph.edges;

    for (var i = 0; i < edges.length; i+=3)
        if (edges[i] == node1 && edges[i+1] == node2)
            return true;

    return false;
}

function compatible_edge(edge_comp, graph1, node11, node12, graph2, node21, node22) {

    var graph1_edge_count = get_edge_count(graph1, node11, node12);
    var graph2_edge_count = get_edge_count(graph2, node21, node22);

    // NOTE: for each edge in graph1 find compatible in graph2

    for (var i = 0; i < graph1_edge_count; i++) {
        var edge_match = false;

        for (var j = 0; j < graph2_edge_count; j++) {
            if (edge_comp(get_edge_attr(graph1, node11, node12, i),
                    get_edge_attr(graph2, node21, node22, j))) {
                edge_match = true;
                break;
            }
        }

        if (!edge_match)
            return false;
    }

    return true;
}

exports.get_edge_count = get_edge_count;
function get_edge_count(graph, node1, node2) {
    var count = 0;
    var edges = graph.edges;

    for (var i = 0; i < edges.length; i+=3) {
        if (edges[i] == node1 && edges[i+1] == node2)
            count++;
    }

    return count;
}

exports.get_edge_attr = get_edge_attr;
function get_edge_attr(graph, node1, node2, num) {
    var edges = graph.edges;
    var count = 0;

    for (var i = 0; i < edges.length; i+=3) {
        if (edges[i] == node1 && edges[i+1] == node2) {
            if (count == num)
                return edges[i+2];
            count++;
        }
    }

    return null;
}

function state_add_pair(state, node1, node2) {
    var g1 = state.g1;
    var g2 = state.g2;

    var n1 = state.n1;
    var n2 = state.n2;

    var core_1 = state.core_1;
    var core_2 = state.core_2;
    var in_1 = state.in_1;
    var in_2 = state.in_2;
    var out_1 = state.out_1;
    var out_2 = state.out_2;

    assert(node1<n1);
    assert(node2<n2);
    assert(state.core_len<n1);
    assert(state.core_len<n2);

    var core_len = (++state.core_len);

	state.added_node1 = node1;

	if (!in_1[node1]) {
        in_1[node1] = core_len;
	    state.t1in_len++;
		if (out_1[node1])
		    state.t1both_len++;
	}
	if (!out_1[node1]) {
        out_1[node1] = core_len;
	    state.t1out_len++;
		if (in_1[node1])
		    state.t1both_len++;
	}

	if (!in_2[node2]) {
        in_2[node2] = core_len;
	    state.t2in_len++;
		if (out_2[node2])
		    state.t2both_len++;
	}
	if (!out_2[node2]) {
        out_2[node2] = core_len;
	    state.t2out_len++;
		if (in_2[node2])
		    state.t2both_len++;
	}

    core_1[node1] = node2;
    core_2[node2] = node1;

    for (var i = 0; i < in_edge_count(g1, node1); i++) {
        var other = get_in_edge(g1, node1, i);
        if (!in_1[other]) {
            in_1[other] = core_len;
            state.t1in_len++;
		    if (out_1[other])
		        state.t1both_len++;
        }
    }

    for (var i = 0; i < out_edge_count(g1, node1); i++) {
        var other = get_out_edge(g1, node1, i);
        if (!out_1[other]) {
            out_1[other] = core_len;
            state.t1out_len++;
		    if (in_1[other])
		        state.t1both_len++;
        }
    }

    for (var i = 0; i < in_edge_count(g2, node2); i++) {
        var other = get_in_edge(g2, node2, i);
        if (!in_2[other]) {
            in_2[other] = core_len;
            state.t2in_len++;
		    if (out_2[other])
		        state.t2both_len++;
        }
    }

    for (var i = 0; i < out_edge_count(g2, node2); i++) {
        var other = get_out_edge(g2, node2, i);
        if (!out_2[other]) {
            out_2[other]=core_len;
            state.t2out_len++;
		    if (in_2[other])
		        state.t2both_len++;
        }
    }
}

function state_back_track(state) {

    assert(state.core_len - state.orig_core_len <= 1);
    assert(state.added_node1 != NULL_NODE);

    var g1 = state.g1;
    var g2 = state.g2;

    var core_len = state.core_len;
    var added_node1 = state.added_node1;

    var core_1 = state.core_1;
    var core_2 = state.core_2;
    var in_1 = state.in_1;
    var in_2 = state.in_2;
    var out_1 = state.out_1;
    var out_2 = state.out_2;

    if (state.orig_core_len < core_len) {
        if (in_1[added_node1] == core_len)
		    in_1[added_node1] = 0;
	    for (var i = 0; i < in_edge_count(g1, added_node1); i++) {
            var other = get_in_edge(g1, added_node1, i);
		    if (in_1[other] == core_len)
                in_1[other]=0;
		}

		if (out_1[added_node1] == core_len)
		    out_1[added_node1] = 0;
	    for (var i = 0; i < out_edge_count(g1, added_node1); i++) {
            var other = get_out_edge(g1, added_node1, i);
		    if (out_1[other] == core_len)
			    out_1[other] = 0;
		}

		var node2 = core_1[added_node1];

        if (in_2[node2] == core_len)
		    in_2[node2] = 0;
	    for (var i = 0; i < in_edge_count(g2, node2); i++) {
            var other = get_in_edge(g2, node2, i);
		    if (in_2[other] == core_len)
			    in_2[other] = 0;
		}

		if (out_2[node2] == core_len)
		    out_2[node2] = 0;

	    for (var i = 0; i < out_edge_count(g2, node2); i++) {
            var other = get_out_edge(g2, node2, i);
		    if (out_2[other] == core_len)
			    out_2[other] = 0;
		}

	    core_1[added_node1] = NULL_NODE;
		core_2[node2] = NULL_NODE;

	    state.core_len = state.orig_core_len;
		state.added_node1 = NULL_NODE;
	}
}

function state_clone(state) {

    // GARBAGE
    var new_state = {};
    new_state.g1 = state.g1;
    new_state.g2 = state.g2;
    new_state.node_comp = state.node_comp;
    new_state.edge_comp = state.edge_comp;

    new_state.n1 = state.n1;
    new_state.n2 = state.n2;

    new_state.order = state.order;

    new_state.core_len = new_state.orig_core_len = state.core_len;
    new_state.t1in_len = state.t1in_len;
    new_state.t1out_len = state.t1out_len;
    new_state.t1both_len = state.t1both_len;
    new_state.t2in_len = state.t2in_len;
    new_state.t2out_len = state.t2out_len;
    new_state.t2both_len = state.t2both_len;

	new_state.added_node1 = NULL_NODE;

    new_state.core_1 = state.core_1;
    new_state.core_2 = state.core_2;
    new_state.in_1 = state.in_1;
    new_state.in_2 = state.in_2;
    new_state.out_1 = state.out_1;
    new_state.out_2 = state.out_2;

    new_state.share_count = state.share_count;

	state.share_count[0] += 1;

    return new_state;
}


/**
 * Replace the nodes by the new one with the given attribute.
 * may create multigraph (multiple edges connecting same nodes)
 */
exports.replace = function(graph, rnode_ids, new_node_attr) {
    var nodes = graph.nodes;
    var edges = graph.edges;

    var new_node_id = gen_node_id(graph);

    for (var i = 0; i < rnode_ids.length; i++) {
        var rnode_id = rnode_ids[i];

        remove_node(graph, rnode_id);

        for (var j = 0; j < edges.length; j+=3) {
            if (edges[j] == rnode_id)
                edges[j] = new_node_id;

            if (edges[j+1] == rnode_id)
                edges[j+1] = new_node_id;

            // remove self-loops
            if (edges[j] == edges[j+1]) {
                edges.splice(j, 3);
                j-=3;
            }
        }
    }

    append_node(graph, new_node_id, new_node_attr);
}

/**
 * Reconnect all edges connecting two given node IDs.
 */
exports.reconnect_edges = function(graph, id1, id2, new_id1, new_id2) {
    if (!has_edge(graph, id1, id2))
        m_util.panic("Edge not found");

    var edges = graph.edges;

    for (var i = 0; i < edges.length; i+=3)
        if (edges[i] == id1 && edges[i+1] == id2) {
            edges[i] = new_id1;
            edges[i+1] = new_id2;
        }
}
/**
 * Remove redundant edges and create acyclic graph
 */
exports.enforce_acyclic = function(graph, main_node) {

    if (!main_node)
        var main_node = get_sink_nodes(graph)[0];
    var edges = graph.edges;
    if (!edges.length || edges.indexOf(main_node) == -1)
        return graph;
    var graph_data = {};
    var count = 0;
    for (var i = 0; i < edges.length; i=i+3) {
        if (edges[i + 1] in graph_data)
            graph_data[edges[i + 1]].push(edges[i]);
        else
            graph_data[edges[i + 1]] = [edges[i]];
        count++;
    }

    var tracking = [];
    var wrong_edges = [];
    function find_redundant_edges(node, top_edges) {
        var index = tracking.indexOf(node);
        if (index != -1) {
            var cycle = tracking.slice(tracking.indexOf(node));
            if (graph_data[cycle[cycle.length - 1]].indexOf(cycle[0]) != -1) {
                wrong_edges.push([node, cycle[cycle.length - 1]]);
                return;
            }
        }
        tracking.push(node);
        for (var i = 0; i < top_edges.length; i++) {
            if (top_edges[i] in graph_data)
                find_redundant_edges(top_edges[i], graph_data[top_edges[i]]);
        }
    }

    find_redundant_edges(main_node, graph_data[main_node]);

    for (var i = 0; i < wrong_edges.length; i++) {
            var count = 0;
            for (var k = 0; k < edges.length; k=k+3) {
                if (wrong_edges[i][1] == edges[k + 1] && wrong_edges[i][0] == edges[k])
                    remove_edge(graph, edges[k], edges[k+1], count);
                count++;
            }
    }
    return graph;
}

exports.debug_dot = function(graph, node_label_cb, edge_label_cb) {
    var nodes = graph.nodes;
    var edges = graph.edges;

    var dot_str = "digraph debug {\n";

    dot_str += "    ";
    dot_str += "node [shape=box];\n"

    for (var i = 0; i < nodes.length; i+=2) {
        var node = nodes[i];
        var attr = nodes[i+1];

        var label = node_label_cb ? node_label_cb(node, attr) : String(node);

        dot_str += "    ";
        dot_str += String(node) + " [label=\"" + label.replace(/\"/g, "\\\"") + "\"];\n";
    }

    for (var i = 0; i < edges.length; i+=3) {
        var node1 = edges[i];
        var node2 = edges[i+1];
        var attr = edges[i+2];

        dot_str += "    ";
        dot_str += String(node1) + " -> " + String(node2);
        if (edge_label_cb)
            dot_str += " [label=\"" + edge_label_cb(node1, node2, attr) + "\"]";
        dot_str += ";\n";
    }

    dot_str += "}";

    return dot_str;
}

}
