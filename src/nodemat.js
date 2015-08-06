"use strict";

/**
 * Node material internal routines.
 * @name nodemat
 * @namespace
 * @exports exports as nodemat
 */
b4w.module["__nodemat"] = function(exports, require) {

var m_print   = require("__print");
var m_graph   = require("__graph");
var m_shaders = require("__shaders");
var m_util    = require("__util");
var m_config  = require("__config");

var m_vec3 = require("vec3");
var m_vec4 = require("vec4");
var m_mat3 = require("mat3");
var m_mat4 = require("mat4");

var _shader_ident_counters = {};
var _composed_node_graphs = {};
var _lamp_indexes = {};
var _lamp_index = 0;
var _vec4_tmp = new Float32Array(4);

var cfg_def = m_config.defaults;

exports.compose_nmat_graph = compose_nmat_graph;
function compose_nmat_graph(node_tree, source_id, is_node_group, mat_name,
                            shader_type) {
    var ntree_graph_id = generate_graph_id(source_id, shader_type);
    if (ntree_graph_id in _composed_node_graphs)
        return _composed_node_graphs[ntree_graph_id];

    if (shader_type != "DEPTH" && shader_type != "COLOR_ID") {
        var graph = m_graph.create();

        var bpy_nodes = node_tree["nodes"];
        var links = node_tree["links"];
        var anim_data = node_tree["animation_data"];

        for (var i = 0; i < bpy_nodes.length; i++) {
            var bpy_node = bpy_nodes[i];
            if (!append_nmat_node(graph, bpy_node, 0, anim_data, mat_name,
                                  shader_type)) {
                _composed_node_graphs[ntree_graph_id] = null;
                return null;
            }
        }

        if (is_node_group)
            if (find_node_id(node_tree, graph, "GROUP_OUTPUT", "group") == -1)
                return null;

        var node_groups = trace_group_nodes(graph);
        if (!append_node_groups_graphs(graph, links, node_groups))
            return null;

        if (is_node_group)
            return graph;

        for (var i = 0; i < links.length; i++) {
            var link = links[i];

            // multiple node IDs for single bpy_node will in case of node splitting
            // e.g GEOMETRY node splitting
            var node_ids1 = nmat_node_ids(link["from_node"], graph);
            var node_ids2 = nmat_node_ids(link["to_node"], graph);

            for (var j = 0; j < node_ids1.length; j++) {
                for (var k = 0; k < node_ids2.length; k++) {
                    var node_id1 = node_ids1[j];
                    var node_id2 = node_ids2[k];

                    var node_attr1 = m_graph.get_node_attr(graph, node_id1);
                    var node_attr2 = m_graph.get_node_attr(graph, node_id2);

                    if (!append_nmat_edge(graph, node_id1, node_id2,
                            node_attr1, node_attr2, link)) {
                        _composed_node_graphs[ntree_graph_id] = null;
                        return null;
                    }
                }
            }
        }

        complete_edges(graph);

        if (shader_type == "GLOW") {
            var output_id = find_node_id(node_tree, graph, "B4W_GLOW_OUTPUT",
                                         "material", true);
        } else {
            var output_id = find_node_id(node_tree, graph, "OUTPUT",
                                         "material", false, true);
        }
        if (output_id == -1) {
            graph = create_default_graph();
            output_id = 0;
        }
        nmat_cleanup_graph(graph);
        var graph_out = m_graph.subgraph_node_conn(graph, output_id,
                                                   m_graph.BACKWARD_DIR);
        clean_sockets_linked_property(graph_out);

        merge_nodes(graph_out);

        optimize_geometry_vcol(graph_out);

        fix_socket_types(graph_out, anim_data, mat_name, shader_type);
    } else {
        var main_graph = compose_nmat_graph(node_tree, source_id, is_node_group,
                                            mat_name, "MAIN")

        var nodes_cb = function(node) {
            var new_node = m_util.clone_object_nr(node);
            new_node.inputs = m_util.clone_object_r(node.inputs);
            new_node.outputs = m_util.clone_object_r(node.outputs);
            return new_node;
        }

        var ntree_graph = m_graph.clone(main_graph, nodes_cb);
        var output_id = find_node_id(node_tree, ntree_graph, "OUTPUT",
                                     "material", false, true);
        remove_color_output(ntree_graph, output_id);

        var graph_out = m_graph.subgraph_node_conn(ntree_graph, output_id,
                                                   m_graph.BACKWARD_DIR);
        clean_sockets_linked_property(graph_out);

    }
    _composed_node_graphs[ntree_graph_id] = graph_out;

    return graph_out;
}

function generate_graph_id(graph_id, shader_type) {
    switch (shader_type) {
    case "GLOW":
        // use color output, it is glow
        return graph_id + "11";
    case "COLOR_ID":
    case "DEPTH":
        // don't use color output, it isn't glow
        return graph_id + "00";
    default:
        // use color output, it isn't glow
        return graph_id + "10";
    }
}

function remove_color_output(graph, output_id) {

    m_graph.traverse_edges(graph, function(id1, id2, attr) {
        var out_node = m_graph.get_node_attr(graph, id2);
        if (id2 == output_id && out_node.inputs[attr[1]].identifier == "Color")
            m_graph.remove_edge_by_attr(graph, id1, id2, attr);
    });

}

function create_default_graph() {
    var graph = m_graph.create();
    var input_color = {
        default_value: new Float32Array([0, 0, 0]),
        identifier: "Color",
        is_linked: false,
        name: "Color"
    };
    var input_alpha = {
        default_value: 1,
        identifier: "Alpha",
        is_linked: false,
        name: "Alpha"
    }
    var node = {
        data: null,
        dirs: [],
        params: [],
        inputs: [input_color, input_alpha],
        outputs: [],
        type: "OUTPUT",
        vparams: []
    };
    m_graph.append_node(graph, 0, node);
    return graph;
}

function clean_sockets_linked_property(graph) {

    m_graph.traverse(graph, function(id, node) {

        var inputs  = node.inputs;
        var outputs = node.outputs;

        for (var i = 0; i < inputs.length; i++)
            fix_socket_property(graph, inputs[i], id, i, 1);

        for (var i = 0; i < outputs.length; i++)
            fix_socket_property(graph, outputs[i], id, i, 0);
    });
}

function fix_socket_property(graph, connection, id, num, check_in_edge) {

    if (connection.is_linked) {
        var clear_linked = true;

        m_graph.traverse_edges(graph, function(in_edge, out_edge, sockets) {
            if ((!check_in_edge && in_edge == id && sockets[0] == num) ||
                (check_in_edge && out_edge == id && sockets[1] == num))
                clear_linked = false;
        });

        if (clear_linked)
            connection.is_linked = false;
    }
}

function fix_socket_types(graph, anim_data, mat_name, shader_type) {
    var edge_data = [];
    m_graph.traverse_edges(graph, function(in_edge, out_edge, sockets) {
        var in_node = m_graph.get_node_attr(graph, in_edge);
        var out_node = m_graph.get_node_attr(graph, out_edge);

        var is_output_vec = m_util.is_vector(in_node.outputs[sockets[0]].default_value);
        var is_input_vec = m_util.is_vector(out_node.inputs[sockets[1]].default_value);
        if (is_output_vec != is_input_vec) {
            var trans_node;

            var vector = {
                "default_value": [0, 0, 0],
                "identifier": "Vector",
                "is_linked": true,
                "name": "Vector"
            };

            var value = {
                "default_value": 0,
                "identifier": "Value",
                "is_linked": true,
                "name": "Value"
            }

            if (is_output_vec && !is_input_vec)
                trans_node = init_bpy_node("vector_to_scalar", "B4W_VECTOSCAL",
                        [vector], [value]);
            else if (!is_output_vec && is_input_vec)
                trans_node = init_bpy_node("scalar_to_vector", "B4W_SCALTOVEC",
                        [value], [vector]);

            append_nmat_node(graph, trans_node, 0, anim_data, mat_name, shader_type);
            edge_data.push([in_edge, out_edge, graph.nodes[graph.nodes.length - 2], sockets])
        }
    });

    for (var i = 0; i < edge_data.length; ++i) {
        m_graph.remove_edge_by_attr(graph, edge_data[i][0], edge_data[i][1], edge_data[i][3]);
        m_graph.append_edge(graph, edge_data[i][0], edge_data[i][2], [edge_data[i][3][0], 0]);
        m_graph.append_edge(graph, edge_data[i][2], edge_data[i][1], [0, edge_data[i][3][1]]);
    }
}

/**
 * Adding special edges to graph
 */
function complete_edges(graph) {
    var appended_edges = [];

    m_graph.traverse(graph, function(id, attr) {
        switch (attr.type) {
        case "B4W_TRANSLUCENCY":
            m_graph.traverse_edges(graph, function(edge_from, edge_to, edge_attr) {
                if (edge_from == id) {
                    var from_socket_index = edge_attr[0];
                    if (attr.outputs[from_socket_index].name == "Translucency")
                        appended_edges.push(edge_from, edge_to, [edge_attr[0] + 1,
                                edge_attr[1] + 1]);
                }
            });
            break;
        }
    });
    for (var i = 0; i < appended_edges.length; i += 3)
        m_graph.append_edge(graph, appended_edges[i], appended_edges[i + 1],
                appended_edges[i + 2]);
}

function nmat_node_ids(bpy_node, graph) {

    var node_ids = [];

    m_graph.traverse(graph, function(id, attr) {
        if (attr.name == bpy_node["name"])
            node_ids.push(id);
    });

    if (node_ids.length)
        return node_ids;
    else
        throw "Node not found";
}

function nmat_cleanup_graph(graph) {
    var id_attr = [];
    // collect
    m_graph.traverse(graph, function(id, attr) {
        if (attr.type == "B4W_PARALLAX" || attr.type == "REROUTE")
            id_attr.push(id, attr);
    });

    for (var i = 0; i < id_attr.length; i+=2) {
        var id = id_attr[i];
        var attr = id_attr[i+1];

        if (attr.type == "B4W_PARALLAX") {

            var input_id1 = get_in_edge_by_input_num(graph, id, 1);

            if (input_id1 != -1) {

                // replace edges
                var input_input_id = m_graph.get_in_edge(graph, input_id1, 0);

                m_graph.remove_edge(graph, input_id1, id, -1);
                if (input_input_id != -1)
                    m_graph.remove_edge(graph, input_input_id, input_id1, -1);

                // store texture in node parameters
                var input1_attr = m_graph.get_node_attr(graph, input_id1);
                attr.data = input1_attr.data;
                attr.params[0] = input1_attr.params[0];

                m_graph.remove_node(graph, input_id1);
            }

            // remove color input
            attr.inputs.splice(1, 1);

        } else if(attr.type == "REROUTE") {
            var input_id = m_graph.get_in_edge(graph, id, 0);
            var out_edge_count = m_graph.out_edge_count(graph, id);

            var removed_edges  = [];
            var output_ids     = [];
            var edges_quantity = [];

            for (var j = 0; j < out_edge_count; j++) {
                var output_id = m_graph.get_out_edge(graph, id, j);
                var id_place  = output_ids.indexOf(output_id);

                if (id_place != -1)
                    edges_quantity[id_place] += 1;
                else {
                    output_ids.push(output_id);
                    edges_quantity.push(1);
                    removed_edges.push(id, output_id);
                }
            }

            if (input_id != -1) {

                var from_index = m_graph.get_edge_attr(graph, input_id, id, 0)[0];

                for (var j = 0; j < output_ids.length; j ++) {
                    for (var k = 0; k < edges_quantity[j]; k++) {
                        var to_index = m_graph.get_edge_attr(graph, id, output_ids[j], k)[1];

                        m_graph.append_edge(graph, input_id, output_ids[j], [from_index, to_index]);
                    }
                }
            }

            for (var j = 0; j < removed_edges.length; j +=2)
                m_graph.remove_edge(graph, removed_edges[j], removed_edges[j+1], -1);
        }
    }
}

function get_in_edge_by_input_num(graph, node, input_num) {
    var edges = graph.edges;

    for (var i = 0; i < edges.length; i+=3) {
        if (edges[i+1] == node) {
            var num = edges[i+2][1];
            if (num == input_num)
                return edges[i];
        }
    }
    return -1;
}

function merge_nodes(graph) {
    merge_geometry(graph);
    merge_textures(graph);
    merge_uvs(graph);
}

function merge_uvs(graph, shader_type) {
    var id_attr = [];
    var uv_0 = "";
    var uv_1 = "";
    var uv_counter = {};
    m_graph.traverse(graph, function(id, attr) {
        if (attr.type == "GEOMETRY_UV" || attr.type == "UVMAP"
                || attr.type == "TEX_COORD_UV") {
            id_attr.push(id, attr);
            var curr_uv_layer = attr.data.value;
            if (!uv_0) {
                uv_0 = curr_uv_layer;
                uv_counter[uv_0] = 0;
            } else if (uv_0 != curr_uv_layer && !uv_1) {
                uv_1 = curr_uv_layer;
                uv_counter[uv_1] = 0;
            }
            uv_counter[curr_uv_layer]++;
        }
    });
    //NOTE: we do not need to merge single UV
    for (var curr_uv_layer in uv_counter)
        if (uv_counter[curr_uv_layer] < 2) {
            for (var i = 0; i < id_attr.length; i = i + 2)
                if (id_attr[i + 1].data.value == curr_uv_layer)
                    id_attr.splice(i, 2);
            delete uv_counter[curr_uv_layer];
            if (uv_0 == curr_uv_layer) {
                uv_0 = uv_1;
                uv_1 = "";
            }
            if (uv_1 == curr_uv_layer)
                uv_1 = "";
        }

    if (id_attr.length < 3)
        return;

    var node_name = "";
    var UV_geom = {
        "default_value": [0, 0, 0],
        "identifier": "UV_geom",
        "is_linked": false,
        "name": "UV_geom"
    };
    var UV_cycles = {
        "default_value": [0, 0, 0],
        "identifier": "UV_cycles",
        "is_linked": false,
        "name": "UV_cycles"
    };

    var uv_0_node = init_bpy_node("merged_uv", "UV_MERGED",
                        [], [UV_geom, UV_cycles]);
    uv_0_node["uv_layer"] = uv_0;
    append_nmat_node(graph, uv_0_node, 0, null, "", shader_type);
    var uv_0_node_id = graph.nodes[graph.nodes.length - 2];
    uv_0_node = graph.nodes[graph.nodes.length - 1];

    if (uv_1) {
        var uv_1_node = init_bpy_node("merged_uv", "UV_MERGED",
                            [], [UV_geom, UV_cycles]);
        uv_1_node["uv_layer"] = uv_1;
        append_nmat_node(graph, uv_1_node, 0, null, "", shader_type);
        var uv_1_node_id = graph.nodes[graph.nodes.length - 2];
        uv_1_node = graph.nodes[graph.nodes.length - 1];
    } else
        var uv_1_node = null;

    var unode_id = -1;
    var unode = null;

    for (var i = 0; i < id_attr.length; i+=2) {
        var id_current = id_attr[i];
        var attr_current = id_attr[i+1];

        if (can_merge_nodes_uv(attr_current, id_attr[1])) {
            unode_id = uv_0_node_id;
            unode = uv_0_node;
        } else if (uv_1_node) {
            unode_id = uv_1_node_id;
            unode = uv_1_node;
        }

        var removed_edges = [];
        var out_num = m_graph.out_edge_count(graph, id_current);

        var edges_out_counter = {};
        for (k = 0; k < out_num; k++) {

            var out_id = m_graph.get_out_edge(graph, id_current, k);

            if (!(out_id in edges_out_counter))
                edges_out_counter[out_id] = 0;

            var edge_attr = m_graph.get_edge_attr(graph, id_current, out_id,
                    edges_out_counter[out_id]++);



            removed_edges.push(id_current, out_id, edge_attr);

            var new_edge_attr = edge_attr.splice(0, edge_attr.length);

            switch (attr_current.type) {
                case "GEOMETRY_UV":
                    new_edge_attr[0] = 0;
                    unode.outputs[0].is_linked = true;
                    break;
                case "UVMAP":
                case "TEX_COORD_UV":
                    new_edge_attr[0] = 1;
                    unode.outputs[1].is_linked = true;
                    break;
            }
            m_graph.append_edge(graph, unode_id, out_id, new_edge_attr);
        }

        for (var k = 0; k < removed_edges.length; k += 3)
            m_graph.remove_edge(graph, removed_edges[k],
                    removed_edges[k + 1], 0);

        m_graph.remove_node(graph, id_current);
    }
}

function merge_geometry(graph) {

    var id_attr = [];
    m_graph.traverse(graph, function(id, attr) {
        if (attr.type == "GEOMETRY_VC" || attr.type == "GEOMETRY_NO"
                || attr.type == "GEOMETRY_FB" || attr.type == "GEOMETRY_VW"
                || attr.type == "GEOMETRY_GL" || attr.type == "GEOMETRY_LO"
                || attr.type == "GEOMETRY_OR")
            id_attr.push(id, attr);
    });

    var unique_nodes = [];

    for (var i = 0; i < id_attr.length; i+=2) {
        var id_current = id_attr[i];
        var attr_current = id_attr[i+1];

        var is_unique = true;

        for (var j = 0; j < unique_nodes.length; j++) {
            var unode = unique_nodes[j];

            // check nodes coincidence
            if (can_merge_nodes(attr_current, unode.attr)) {

                var removed_edges = [];
                var out_num = m_graph.out_edge_count(graph, id_current);

                // process every outgoing edge
                for (k = 0; k < out_num; k++) {
                    var out_id = m_graph.get_out_edge(graph, id_current, k);
                    var edge_attr = m_graph.get_edge_attr(graph, id_current, out_id, 0);

                    // removing edges affects graph traversal
                    removed_edges.push(id_current, out_id, edge_attr);

                    m_graph.append_edge(graph, unode.id, out_id, edge_attr);
                }

                for (var k = 0; k < removed_edges.length; k += 3)
                    m_graph.remove_edge(graph, removed_edges[k],
                            removed_edges[k + 1], 0);

                m_graph.remove_node(graph, id_current);

                is_unique = false;
                break;
            }
        }

        if (is_unique) {
            var unode = {
                id: id_current,
                attr: attr_current
            }
            unique_nodes.push(unode);
        }
    }
}

// NOTE: non unique ascendants
function get_attrs_ascendants(graph) {
    var attrs_ascendants = {};

    for (var i = 0; i < graph.nodes.length; i += 2) {
        var id = graph.nodes[i];
        attrs_ascendants[id] = [];
    }

    for (var i = 0; i < graph.edges.length; i += 3) {
        var id_from = graph.edges[i];
        var id_to = graph.edges[i + 1];

        attrs_ascendants[id_to].push(id_from);
        attrs_ascendants[id_to].push.apply(attrs_ascendants[id_to], attrs_ascendants[id_from]);
    }

    return attrs_ascendants;
}

function merge_textures(graph) {

    var id_attr = [];
    m_graph.traverse(graph, function(id, attr) {
        if (attr.type == "TEXTURE_COLOR" || attr.type == "TEXTURE_NORMAL")
            id_attr.push(id, attr);
    });

    if (!id_attr.length)
        return;

    var ascs = get_attrs_ascendants(graph);

    var unique_nodes = [];

    for (var i = 0; i < id_attr.length; i+=2) {
        var id_current = id_attr[i];
        var attr_current = id_attr[i+1];

        var is_unique = true;

        for (var j = 0; j < unique_nodes.length; j++) {
            var unode = unique_nodes[j];

            // NOTE: every 4 texture nodes merged: first found (main) and others
            if (unode.merged_nodes.length >= 3)
                continue;

            // check nodes coincidence
            if (!can_merge_nodes(attr_current, unode.attr))
                continue;

            // merged nodes can't be reachable from the each other in a directed graph
            if (ascs[id_current].indexOf(unode.id) > -1 ||
                    ascs[unode.id].indexOf(id_current) > -1)
                continue;
            var is_reachable = false;
            for (var k = 0; k < unode.merged_nodes.length; k++) {
                var merged_id = unode.merged_nodes[k].id;
                if (ascs[id_current].indexOf(merged_id) > -1 ||
                    ascs[merged_id].indexOf(id_current) > -1) {
                    is_reachable = true;
                    break;
                }
            }
            if (is_reachable)
                continue;

            var removed_edges_in = [];
            var in_num = m_graph.in_edge_count(graph, id_current);

            // process every ingoing edge
            var edges_in_counter = {}
            for (k = 0; k < in_num; k++) {
                var in_id = m_graph.get_in_edge(graph, id_current, k);

                if (!(in_id in edges_in_counter))
                    edges_in_counter[in_id] = 0;
                var edge_attr = m_graph.get_edge_attr(graph, in_id,
                        id_current, edges_in_counter[in_id]++);

                // removing edges affects graph traversal; save edge_attr
                // for further merging
                removed_edges_in.push(in_id, id_current, edge_attr);
            }

            var removed_edges_out = [];
            var out_num = m_graph.out_edge_count(graph, id_current);

            // process every outgoing edge
            var edges_out_counter = {}
            for (k = 0; k < out_num; k++) {
                var out_id = m_graph.get_out_edge(graph, id_current, k);

                if (!(out_id in edges_out_counter))
                    edges_out_counter[out_id] = 0;
                var edge_attr = m_graph.get_edge_attr(graph, id_current,
                        out_id, edges_out_counter[out_id]++);

                // removing edges affects graph traversal; save edge_attr
                // for further merging
                removed_edges_out.push(id_current, out_id, edge_attr);
            }

            var removed_edges = removed_edges_in.concat(removed_edges_out);
            for (var k = 0; k < removed_edges.length; k += 3)
                m_graph.remove_edge(graph, removed_edges[k],
                        removed_edges[k + 1], 0);
            m_graph.remove_node(graph, id_current);

            var mnode = {
                id: id_current,
                attr: attr_current,
                edges_in: removed_edges_in,
                edges_out: removed_edges_out
            }
            unode.merged_nodes.push(mnode);

            is_unique = false;
            break;
        }

        if (is_unique) {
            var unode = {
                id: id_current,
                attr: attr_current,
                merged_nodes: []
            }
            unique_nodes.push(unode);
        }
    }

    // NOTE: merge texture nodes data
    for (var i = 0; i < unique_nodes.length; i++) {
        var unode = unique_nodes[i];

        var mnodes_count = unode.merged_nodes.length;

        // NOTE: merge similar nodes and unique node
        for (var j = 0; j < mnodes_count; j++) {
            var merged_data = unode.merged_nodes[j];
            var mnode = merged_data.attr;
            var edges_in = merged_data.edges_in;
            var edges_out = merged_data.edges_out;

            unode.attr.inputs[j + 1].is_linked = mnode.inputs[0].is_linked;
            unode.attr.inputs[j + 1].default_value = mnode.inputs[0].default_value;
            unode.attr.outputs[2 * (j + 1)].is_linked = mnode.outputs[0].is_linked;
            unode.attr.outputs[2 * (j + 1)].default_value = mnode.outputs[0].default_value;
            unode.attr.outputs[2 * (j + 1) + 1].is_linked = mnode.outputs[1].is_linked;
            unode.attr.outputs[2 * (j + 1) + 1].default_value = mnode.outputs[1].default_value;

            // NOTE: change edge attributes indices for similar links
            for (var k = 0; k < edges_in.length; k += 3) {
                var in_id = edges_in[k];
                var edge_attr = edges_in[k + 2];
                edge_attr[1] += (j + 1);
                m_graph.append_edge(graph, in_id, unode.id, edge_attr);
            }

            for (var k = 0; k < edges_out.length; k += 3) {
                var out_id = edges_out[k + 1];
                var edge_attr = edges_out[k + 2];
                edge_attr[0] += (j + 1) * 2;
                m_graph.append_edge(graph, unode.id, out_id, edge_attr);
            }

            unode.attr.dirs.push(["USE_uv" + (j + 2), 1]);
        }

        m_graph.remove_node(graph, unode.id);
        m_graph.append_node(graph, unode.id, unode.attr);
    }
}

function can_merge_nodes(attr1, attr2) {
    if (attr1.type !== attr2.type)
        return false;

    switch (attr1.type) {
    case "GEOMETRY_VC":
        return attr1.data.value == attr2.data.value;
    case "GEOMETRY_NO":
    case "GEOMETRY_FB":
    case "GEOMETRY_VW":
    case "GEOMETRY_GL":
    case "GEOMETRY_LO":
    case "GEOMETRY_OR":
        return true;
    case "TEXTURE_COLOR":
    case "TEXTURE_NORMAL":
        return attr1.data.value == attr2.data.value;
    default:
        return false;
    }
}

function can_merge_nodes_uv(attr1, attr2) {

    var permissible_types = ["GEOMETRY_UV", "TEX_COORD_UV", "UVMAP"];
    if (permissible_types.indexOf(attr1.type) != -1
            && permissible_types.indexOf(attr2.type) != -1)
        return attr1.data.value == attr2.data.value;
    return false;
}

function optimize_geometry_vcol(graph) {
    var id_attr = [];
    m_graph.traverse(graph, function(id, attr) {
        if (attr.type == "GEOMETRY_VC")
            id_attr.push(id, attr);
    });

    for (var i = 0; i < id_attr.length; i+=2) {
        var geom_id = id_attr[i];
        var geom_attr = id_attr[i+1];

        var need_optimize = false;
        var removed_edges = [];
        var removed_seprgb_nodes = [];
        var channels_usage = [[], [], []];

        var geometry_out_num = m_graph.out_edge_count(graph, geom_id);
        for (var j = 0; j < geometry_out_num; j++) {
            var out_id = m_graph.get_out_edge(graph, geom_id, j);
            var out_node = m_graph.get_node_attr(graph, out_id);

            // optimize if it has only SEPRGB nodes as outputs
            if (out_node.type != "SEPRGB") {
                need_optimize = false;
                break;
            }

            removed_edges.push(geom_id, out_id);

            var edges_out_num = {}
            var seprgb_out_num = m_graph.out_edge_count(graph, out_id);
            for (var k = 0; k < seprgb_out_num; k++) {

                var seprgb_out_id = m_graph.get_out_edge(graph, out_id, k);
                if (!(seprgb_out_id in edges_out_num))
                    edges_out_num[seprgb_out_id] = 0;

                var edge_attr = m_graph.get_edge_attr(graph, out_id,
                        seprgb_out_id, edges_out_num[seprgb_out_id]++);

                removed_edges.push(out_id, seprgb_out_id);
                channels_usage[edge_attr[0]].push(geom_id, seprgb_out_id, edge_attr);

            }

            removed_seprgb_nodes.push(out_id);
            need_optimize = true;
        }

        if (need_optimize) {
            var channels_count = 0;
            var mask = 0;
            for (var j = 0; j < channels_usage.length; j++)
                if (channels_usage[j].length) {
                    channels_count++;
                    mask |= 1 << (2 - j);
                }

            if (channels_count) {
                // change GEOMETRY_VC outputs and type
                geom_attr.type += channels_count;

                geom_attr.outputs = [];
                for (var j = 0; j < channels_usage.length; j++) {
                    if (channels_usage[j].length) {
                        geom_attr.outputs.push({
                            default_value: 0,
                            identifier: "RGB"[j],
                            is_linked: true,
                            name: "RGB"[j]
                        });
                        for (var k = 0; k < channels_usage[j].length; k += 3)
                            channels_usage[j][k + 2][0]
                                    = m_util.rgb_mask_get_channel_presence_index(
                                    mask, j);
                    }
                }

                // remove unused edges
                for (var j = 0; j < removed_edges.length; j += 2)
                    m_graph.remove_edge(graph, removed_edges[j],
                            removed_edges[j + 1], 0);

                // remove SEPRGB nodes
                for (var j = 0; j < removed_seprgb_nodes.length; j++)
                    m_graph.remove_node(graph, removed_seprgb_nodes[j]);

                // add new edges
                for (var j = 0; j < channels_usage.length; j++)
                    for (var k = 0; k < channels_usage[j].length; k += 3)
                        m_graph.append_edge(graph, channels_usage[j][k],
                                channels_usage[j][k + 1], channels_usage[j][k + 2]);
            }
        }

    }
}

function find_node_id(node_tree, graph, type, source_type, is_group_node,
        suppress_errors) {
    var bpy_nodes = node_tree["nodes"];

    // find last OUTPUT
    var last_output_node = null;

    // search in original bpy_nodes
    for (var i = 0; i < bpy_nodes.length; i++) {
        var bpy_node = bpy_nodes[i];

        if (is_group_node) {
            if (bpy_node["type"] == "GROUP" && bpy_node["node_tree_name"] == type)
                last_output_node = bpy_node;
        } else {
            if (bpy_node["type"] == type)
                last_output_node = bpy_node;
        }
    }

    if (!last_output_node) {
        if (!suppress_errors)
            m_print.error("No \"" + type + "\" node in node " + source_type);
        return -1;
    }

    // seems always unique
    return nmat_node_ids(last_output_node, graph)[0];
}

function init_bpy_node(name, type, inputs, outputs) {
    var node = {
        "name": name,
        "type": type,
        "inputs": inputs,
        "outputs": outputs
    }
    return node;
}

function init_bpy_link(from_node, from_socket, to_node, to_socket) {
    var link = {
        "from_node": from_node,
        "from_socket": from_socket,
        "to_node": to_node,
        "to_socket": to_socket
    }
    return link;
}

function append_nmat_node(graph, bpy_node, output_num, anim_data,
                          mat_name, shader_type) {
    var name = bpy_node["name"];
    var type = bpy_node["type"];

    var vparams = [];
    var inputs = [];
    var outputs = [];
    var params = [];

    var data = null;

    var dirs = [];

    switch(type) {
    case "BSDF_ANISOTROPIC":
    case "BSDF_DIFFUSE":
    case "BSDF_GLOSSY":
    case "BSDF_GLASS":
    case "BSDF_HAIR":
    case "BSDF_TRANSPARENT":
    case "BSDF_TRANSLUCENT":
    case "BSDF_REFRACTION":
    case "BSDF_TOON":
    case "BSDF_VELVET":
    case "SUBSURFACE_SCATTERING":
    case "EMISSION":
    case "AMBIENT_OCCLUSION":
    case "VOLUME_ABSORPTION":
    case "VOLUME_SCATTER":
    case "BUMP":
    case "NORMAL_MAP":
    case "VECT_TRANSFORM":
    case "BLACKBODY":
    case "WAVELENGTH":
    case "SEPXYZ":
    case "COMBXYZ":
    case "LIGHT_FALLOFF":
    case "TEX_IMAGE":
    case "TEX_ENVIRONMENT":
    case "TEX_SKY":
    case "TEX_NOISE":
    case "TEX_WAVE":
    case "TEX_MUSGRAVE":
    case "TEX_GRADIENT":
    case "TEX_MAGIC":
    case "TEX_CHECKER":
    case "TEX_BRICK":
    case "WIREFRAME":
    case "LAYER_WEIGHT":
    case "TANGENT":
    case "LIGHT_PATH":
    case "ATTRIBUTE":
    case "HOLDOUT":
    case "PARTICLE_INFO":
    case "HAIR_INFO":
    case "OBJECT_INFO":
    case "SCRIPT":
    case "NEW_GEOMETRY":
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = node_outputs_bpy_to_b4w(bpy_node);
        m_print.warn(type + " node is not fully supported.");
        break;
    case "BRIGHTCONTRAST":
    case "ADD_SHADER":
    case "MIX_SHADER":
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = node_outputs_bpy_to_b4w(bpy_node);
        break;
    case "UVMAP":
        var uv_name = shader_ident("param_" + type + "_a");
        var uv_tra_name = shader_ident("param_" + type + "_v");

        vparams.push(node_param(uv_name));
        vparams.push(node_param(uv_tra_name));

        outputs = node_outputs_bpy_to_b4w(bpy_node);
        params.push(node_param(uv_tra_name));

        data = {
            name: uv_name,
            value: bpy_node["uv_layer"]
        }
        break;
    case "UV_MERGED":
        var uv_name = shader_ident("param_UV_MERGED_a");
        var uv_tra_name = shader_ident("param_UV_MERGED_v");

        vparams.push(node_param(uv_name));
        vparams.push(node_param(uv_tra_name));

        outputs.push(node_output_by_ident(bpy_node, "UV_geom"));
        outputs.push(node_output_by_ident(bpy_node, "UV_cycles"));
        params.push(node_param(uv_tra_name));

        data = {
            name: uv_name,
            value: bpy_node["uv_layer"]
        }
        break;
    case "CAMERA":
        inputs = [];
        outputs = node_outputs_bpy_to_b4w(bpy_node);
        break;
    case "COMBRGB":
    case "COMBHSV":
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = node_outputs_bpy_to_b4w(bpy_node);
        break;
    case "CURVE_RGB":
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = node_outputs_bpy_to_b4w(bpy_node);
        m_print.warn("CURVE_RGB node is not fully supported.");
        break;
    case "CURVE_VEC":
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = node_outputs_bpy_to_b4w(bpy_node);
        m_print.warn("CURVE_VEC node is not fully supported.");
        break;
    case "GEOMETRY":

        if (!check_input_node_outputs(bpy_node))
            return true;

        type = geometry_node_type(bpy_node, output_num);
        if (!type) {
            m_print.error("Geometry output is not supported");
            return false;
        }

        switch (type) {
        case "GEOMETRY_UV":
            // NOTE: check UV layers for compatibility
            if (!bpy_node["uv_layer"]) {
                m_print.error("Missing uv layer in node \"", bpy_node["name"],"\"");
                return false;
            }

            var uv_name = shader_ident("param_GEOMETRY_UV_a");
            var uv_tra_name = shader_ident("param_GEOMETRY_UV_v");

            vparams.push(node_param(uv_name));
            vparams.push(node_param(uv_tra_name));

            outputs.push(node_output_by_ident(bpy_node, "UV"));

            params.push(node_param(uv_tra_name));

            data = {
                name: uv_name,
                value: bpy_node["uv_layer"]
            }
            break;
        case "GEOMETRY_VC":
            // NOTE: check VC for compatibility
            if (!bpy_node["color_layer"]) {
                m_print.error("Missing vertex color layer in node ", bpy_node["name"]);
                return false;
            }

            var vc_name = shader_ident("param_GEOMETRY_VC_a");
            var vc_tra_name = shader_ident("param_GEOMETRY_VC_v");

            vparams.push(node_param(vc_name));
            vparams.push(node_param(vc_tra_name));

            outputs.push(node_output_by_ident(bpy_node, "Vertex Color"));

            params.push(node_param(vc_tra_name));

            data = {
                name: vc_name,
                value: bpy_node["color_layer"]
            }
            break
        case "GEOMETRY_NO":
            outputs.push(node_output_by_ident(bpy_node, "Normal"));
            break;
        case "GEOMETRY_FB":
            outputs.push(node_output_by_ident(bpy_node, "Front/Back"));
            break;
        case "GEOMETRY_VW":
            outputs.push(node_output_by_ident(bpy_node, "View"));
            break;
        case "GEOMETRY_GL":
            outputs.push(node_output_by_ident(bpy_node, "Global"));
            break;
        case "GEOMETRY_LO":
            outputs.push(node_output_by_ident(bpy_node, "Local"));
            break;
        case "GEOMETRY_OR":
            var or_tra_name = shader_ident("param_GEOMETRY_OR_v");
            vparams.push(node_param(or_tra_name));

            outputs.push(node_output_by_ident(bpy_node, "Orco"));
            params.push(node_param(or_tra_name));
            break;
        }
        break;
    case "TEX_COORD":

        if (!check_input_node_outputs(bpy_node))
            return true;

        type = tex_coord_node_type(bpy_node, output_num);
        if (!type) {
            m_print.error("Texture coordinate output is not supported");
            return false;
        }

        switch (type) {
        case "TEX_COORD_UV":

            var uv_name = shader_ident("param_TEX_COORD_UV_a");
            var uv_tra_name = shader_ident("param_TEX_COORD_UV_v");

            vparams.push(node_param(uv_name));
            vparams.push(node_param(uv_tra_name));

            outputs.push(node_output_by_ident(bpy_node, "UV"));

            params.push(node_param(uv_tra_name));

            data = {
                name: uv_name,
                value: bpy_node["uv_layer"]
            }
            break;
        case "TEX_COORD_NO":
            outputs.push(node_output_by_ident(bpy_node, "Normal"));
            break;
        case "TEX_COORD_GE":
            var ge_tra_name = shader_ident("param_TEX_COORD_GE_v");
            vparams.push(node_param(ge_tra_name));

            outputs.push(node_output_by_ident(bpy_node, "Generated"));
            params.push(node_param(ge_tra_name));
            break;
        case "TEX_COORD_OB":
            outputs.push(node_output_by_ident(bpy_node, "Object"));
            m_print.warn("Output \"Object\" of node \"Texture Coordinate\" doesn't supported fully.")
            break;
        case "TEX_COORD_CA":
            outputs.push(node_output_by_ident(bpy_node, "Camera"));
            break;
        case "TEX_COORD_WI":
            outputs.push(node_output_by_ident(bpy_node, "Window"));
            m_print.warn("Output \"Window\" of node \"Texture Coordinate\" doesn't supported fully.")
            break;
        case "TEX_COORD_RE":
            outputs.push(node_output_by_ident(bpy_node, "Reflection"));
            m_print.warn("Output \"Reflection\" of node \"Texture Coordinate\" doesn't supported fully.")
            break;
        }
        break;
    case "GROUP":
        var node_name = bpy_node["node_tree_name"];
        switch (node_name) {
        case "B4W_LINEAR_TO_SRGB":
            if (!validate_custom_node_group(bpy_node, [1], [1])) {
                data = process_node_group(bpy_node, mat_name, shader_type);
                break;
            }
            type = "B4W_LINEAR_TO_SRGB";
            break;
        case "B4W_NORMAL_VIEW":
        case "B4W_VECTOR_VIEW":
            if (!validate_custom_node_group(bpy_node, [1], [1])) {
                data = process_node_group(bpy_node, mat_name, shader_type);
                break;
            }
            type = "B4W_VECTOR_VIEW";
            break;
        case "B4W_SRGB_TO_LINEAR":
            if (!validate_custom_node_group(bpy_node, [1], [1])) {
                data = process_node_group(bpy_node, mat_name, shader_type);
                break;
            }
            type = "B4W_SRGB_TO_LINEAR";
            break;
        case "B4W_REFLECT":
            if (!validate_custom_node_group(bpy_node, [1,1], [1])) {
                data = process_node_group(bpy_node, mat_name, shader_type);
                break;
            }
            type = "B4W_REFLECT";
            break;
        case "B4W_REFRACTION":
            if (!validate_custom_node_group(bpy_node, [1,0], [1])) {
                data = process_node_group(bpy_node, mat_name, shader_type);
                break;
            }
            type = "B4W_REFRACTION";
            break;
        case "B4W_PARALLAX":
            if (!validate_custom_node_group(bpy_node, [1,1,0,0,0], [1])) {
                data = process_node_group(bpy_node, mat_name, shader_type);
                break;
            }
            type = "B4W_PARALLAX";
            var tex_name = shader_ident("temp_texture");
            params.push(node_param(tex_name));
            break;
        case "B4W_CLAMP":
            if (!validate_custom_node_group(bpy_node, [1], [1])) {
                data = process_node_group(bpy_node, mat_name, shader_type);
                break;
            }
            type = "B4W_CLAMP";
            break;
        case "B4W_TRANSLUCENCY":
            if (!validate_custom_node_group(bpy_node, [0,0,0,0,0], [0])) {
                data = process_node_group(bpy_node, mat_name, shader_type);
                break;
            }
            type = "B4W_TRANSLUCENCY";
            break;
        case "B4W_TIME":
            if (!validate_custom_node_group(bpy_node, [], [0])) {
                data = process_node_group(bpy_node, mat_name, shader_type);
                break;
            }
            type = "B4W_TIME";
            break;
        case "B4W_SMOOTHSTEP":
            if (!validate_custom_node_group(bpy_node, [0,0,0], [0])) {
                data = process_node_group(bpy_node, mat_name, shader_type);
                break;
            }
            type = "B4W_SMOOTHSTEP";
            break;
        case "B4W_GLOW_OUTPUT":
            type = "B4W_GLOW_OUTPUT";
            break;
        default:
            data = process_node_group(bpy_node, mat_name, shader_type);
        }
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = node_outputs_bpy_to_b4w(bpy_node);
        // NOTE: additional translucency output
        if (node_name == "B4W_TRANSLUCENCY") {
            var out = default_node_inout("TranslucencyParams", "TranslucencyParams", [0,0,0,0]);
            out.is_linked = outputs[0].is_linked;
            outputs.push(out);
        }
        break;
    case "LAMP":
        var lamp = bpy_node["lamp"];
        if (!lamp) {
            m_print.error("There is no lamp in node: " + bpy_node["name"]);
            return false;
        }
        outputs.push(node_output_by_ident(bpy_node, "Color"));
        outputs.push(node_output_by_ident(bpy_node, "Light Vector"));
        outputs.push(node_output_by_ident(bpy_node, "Distance"));
        outputs.push(node_output_by_ident(bpy_node, "Visibility Factor"));
        if (!(lamp["uuid"] in _lamp_indexes)) {
            _lamp_indexes[lamp["uuid"]] = _lamp_index;
            dirs.push(["LAMP_INDEX", String(_lamp_index++)]);
        } else
            dirs.push(["LAMP_INDEX", String(_lamp_indexes[lamp["uuid"]])]);
        data = _lamp_indexes;
        break;
    case "NORMAL":
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = node_outputs_bpy_to_b4w(bpy_node);

        var output_norm = node_output_by_ident(bpy_node, "Normal");
        params.push(node_param(shader_ident("param_NORMAL_Normal"),
                output_norm.default_value, 3));
        break;
    case "MAPPING":
        var vector_type = bpy_node["vector_type"];

        type = "MAPPING";

        inputs.push(node_input_by_ident(bpy_node, "Vector"));
        outputs.push(node_output_by_ident(bpy_node, "Vector"));

        var rot = bpy_node["rotation"];
        var scale = bpy_node["scale"];
        var trans = bpy_node["translation"];
        var trs_matrix = m_mat3.create();

        // rotation
        var rot_matrix = m_util.euler_to_rotation_matrix(rot);

        // HACK: set non-zero scale to allow matrix inverse
        if (vector_type == "TEXTURE") {
            scale[0] = scale[0] || 1.0;
            scale[1] = scale[1] || 1.0;
            scale[2] = scale[2] || 1.0;
        }

        // scale
        var scale_matrix = new Float32Array([scale[0],0,0,0,scale[1],0,0,0,scale[2]]);

        m_mat3.multiply(rot_matrix, scale_matrix, trs_matrix);
        trs_matrix = m_util.mat3_to_mat4(trs_matrix, m_mat4.create());
        switch (vector_type) {
        case "POINT":
            // order of transforms: translation -> rotation -> scale
            // translation
            trs_matrix[12] = trans[0];
            trs_matrix[13] = trans[1];
            trs_matrix[14] = trans[2];
            break;
        case "TEXTURE":
            // order of transforms: translation -> rotation -> scale -> invert
            // translation
            trs_matrix[12] = trans[0];
            trs_matrix[13] = trans[1];
            trs_matrix[14] = trans[2];
            trs_matrix = m_mat4.invert(trs_matrix, trs_matrix);
            break;
        case "NORMAL":
            // order of transforms: rotation -> scale -> invert ->transpose
            m_mat4.invert(trs_matrix, trs_matrix);
            m_mat4.transpose(trs_matrix, trs_matrix);
            break;
        }

        switch (vector_type) {
        case "NORMAL":
            dirs.push(["MAPPING_IS_NORMAL", 1]);
        case "TEXTURE":
            dirs.push(["MAPPING_TRS_MATRIX", m_shaders.glsl_value(trs_matrix, 16)]);
            break;
        case "POINT":
            if (m_vec3.length(rot) !== 0)
                dirs.push(["MAPPING_TRS_MATRIX", m_shaders.glsl_value(trs_matrix, 16)]);
            else {
                if (m_vec3.length(scale) !== 0)
                    dirs.push(["MAPPING_SCALE", m_shaders.glsl_value(scale, 3)]);
                if (m_vec3.length(trans) !== 0)
                    dirs.push(["MAPPING_TRANSLATION", m_shaders.glsl_value(trans, 3)]);
            }
            break;
        case "VECTOR":
            if (m_vec3.length(rot) !== 0)
                dirs.push(["MAPPING_TRS_MATRIX", m_shaders.glsl_value(trs_matrix, 16)]);
            else if (m_vec3.length(scale) !== 0)
                dirs.push(["MAPPING_SCALE", m_shaders.glsl_value(scale, 3)]);
            break;
        }

        // clipping
        if (bpy_node["use_min"])
            dirs.push(["MAPPING_MIN_CLIP", m_shaders.glsl_value(bpy_node["min"], 3)]);

        if (bpy_node["use_max"])
            dirs.push(["MAPPING_MAX_CLIP", m_shaders.glsl_value(bpy_node["max"], 3)]);
        break;
    case "MATERIAL":
    case "MATERIAL_EXT":
        // INPUT 0
        var input = node_input_by_ident(bpy_node, "Color");
        input.default_value.splice(3); // vec4 -> vec3
        inputs.push(input);

        // INPUT 1
        var input = node_input_by_ident(bpy_node, "Spec");
        input.default_value.splice(3); // vec4 -> vec3
        inputs.push(input);

        // INPUT 2
        // NOTE: Blender doesn't update identifier and default value of this node
        // var input = node_input_by_ident(bpy_node, "DiffuseIntensity");
        // if (input)
        //     inputs.push(input);
        // else
        inputs.push(default_node_inout("DiffuseIntensity", "DiffuseIntensity",
                bpy_node["diffuse_intensity"]));

        // INPUT 3
        var input_norm = node_input_by_ident(bpy_node, "Normal");
        input_norm.default_value.splice(3); // vec4 -> vec3
        inputs.push(input_norm);

        outputs.push(node_output_by_ident(bpy_node, "Color"));
        outputs.push(node_output_by_ident(bpy_node, "Alpha"));
        outputs.push(node_output_by_ident(bpy_node, "Normal"));



        if (type == "MATERIAL_EXT") {
            // additional inputs/outputs for extended materials

            // INPUT 4
            var input = node_input_by_ident(bpy_node, "Emit");
            if (input)
                inputs.push(input);
            else
                inputs.push(default_node_inout("Emit", "Emit", 0));

            // NOTE: additional inputs from translucency node
            // INPUT 5
            var input = node_input_by_ident(bpy_node, "Translucency");
            input.default_value = 0;
            input.name = "Translucency";
            input.identifier = "Translucency";
            if (input)
                inputs.push(input);
            else
                inputs.push(default_node_inout(input.name, input.identifier, input.default_value));

            // INPUT 6
            var input = node_input_by_ident(bpy_node, "Translucency");
            input.default_value = [0, 0, 0, 0];
            input.name = "TranslucencyParams";
            input.identifier = "TranslucencyParams";
            if (input)
                inputs.push(input);
            else
                inputs.push(default_node_inout(input.name, input.identifier, input.default_value));

            // INPUT 7

            // NOTE: Blender version >= 2.74: Reflectivity
            // Blender version < 2.74: Ray Mirror
            var input_new = node_input_by_ident(bpy_node, "Reflectivity");
            var input_old = node_input_by_ident(bpy_node, "Ray Mirror");

            if (input_new) {
                input = input_new;
                var input_name = "Reflectivity";
            } else if (input_old) {
                input = input_old;
                var input_name = "Ray Mirror";
            } else {
                input = input_new;
                var input_name = "Reflectivity";
            }

            if (input)
                inputs.push(input);
            else
                inputs.push(default_node_inout(input_name, input_name, 0));

            // INPUT 8
            var input = node_input_by_ident(bpy_node, "SpecTra");
            if (input)
                inputs.push(input);
            else
                inputs.push(default_node_inout("SpecTra", "SpecTra", 0));

             // INPUT 9
            var input = node_input_by_ident(bpy_node, "Alpha");
            if (input)
                inputs.push(input);
            else
                inputs.push(default_node_inout("Alpha", "Alpha", bpy_node["alpha"]));

            outputs.push(node_output_by_ident(bpy_node, "Diffuse"));
            outputs.push(node_output_by_ident(bpy_node, "Spec"));
        } else {
            params.push(node_param(shader_ident("param_MATERIAL_alpha"),
                               bpy_node["alpha"]));
            params.push(node_param(shader_ident("param_MATERIAL_spec_alpha"),
                               bpy_node["specular_alpha"]));
        }

        var spec_param_0;
        var spec_param_1 = 0;
        switch(bpy_node["specular_shader"]) {
        case "COOKTORR":
        case "PHONG":
            spec_param_0 = bpy_node["specular_hardness"];
            break;
        case "WARDISO":
            spec_param_0 = bpy_node["specular_slope"];
            break;
        case "TOON":
            spec_param_0 = bpy_node["specular_toon_size"];
            spec_param_1 = bpy_node["specular_toon_smooth"];
            break;
        case "BLINN":
            spec_param_0 = bpy_node["specular_ior"];
            spec_param_1 = bpy_node["specular_hardness"];
            break;
        default:
            m_print.error("unsupported specular shader: " +
                bpy_node["specular_shader"] + " (material \"" +
                bpy_node["material_name"] + "\")");
            spec_param_0 = bpy_node["specular_hardness"];
            break;
        }

        var diffuse_param;
        var diffuse_param2;
        switch(bpy_node["diffuse_shader"]) {
        case "LAMBERT":
            diffuse_param = 0.0;
            diffuse_param2 = 0.0;
            break;
        case "OREN_NAYAR":
            diffuse_param = bpy_node["roughness"];
            diffuse_param2 = 0.0;
            break;
        case "FRESNEL":
            diffuse_param = bpy_node["diffuse_fresnel"];
            diffuse_param2 = bpy_node["diffuse_fresnel_factor"];
            break;
        case "MINNAERT":
            diffuse_param = bpy_node["darkness"];
            diffuse_param2 = 0.0;
            break;
        case "TOON":
            diffuse_param = bpy_node["diffuse_toon_size"];
            diffuse_param2 = bpy_node["diffuse_toon_smooth"];
            break;
        default:
            m_print.error("unsupported diffuse shader: " +
                bpy_node["diffuse_shader"] + " (material \"" +
                bpy_node["material_name"] + "\")");
            diffuse_param = 0.0;
            diffuse_param2 = 0.0;
            break;
        }

        params.push(node_param(shader_ident("param_MATERIAL_diffuse"),
                                [diffuse_param, diffuse_param2], 2));

        params.push(node_param(shader_ident("param_MATERIAL_spec"),
                               [bpy_node["specular_intensity"],
                                spec_param_0, spec_param_1], 3));

        data = {
            name: bpy_node["name"],
            value: {
                specular_shader: bpy_node["specular_shader"],
                diffuse_shader: bpy_node["diffuse_shader"],
                use_shadeless: bpy_node["use_shadeless"]
            }
        }

        if (input_norm.is_linked)
            dirs.push(["USE_MATERIAL_NORMAL", 1]);

        if (bpy_node["use_diffuse"])
            dirs.push(["USE_MATERIAL_DIFFUSE", 1]);

        if (bpy_node["use_specular"])
            dirs.push(["USE_MATERIAL_SPECULAR", 1]);

        break;
    case "MATH":
        switch (bpy_node["operation"]) {
        case "ADD":
            type = "MATH_ADD";
            break;
        case "SUBTRACT":
            type = "MATH_SUBTRACT";
            break;
        case "MULTIPLY":
            type = "MATH_MULTIPLY";
            break;
        case "DIVIDE":
            type = "MATH_DIVIDE";
            break;
        case "SINE":
            type = "MATH_SINE";
            break;
        case "COSINE":
            type = "MATH_COSINE";
            break;
        case "TANGENT":
            type = "MATH_TANGENT";
            break;
        case "ARCSINE":
            type = "MATH_ARCSINE";
            break;
        case "ARCCOSINE":
            type = "MATH_ARCCOSINE";
            break;
        case "ARCTANGENT":
            type = "MATH_ARCTANGENT";
            break;
        case "POWER":
            type = "MATH_POWER";
            break;
        case "LOGARITHM":
            type = "MATH_LOGARITHM";
            break;
        case "MINIMUM":
            type = "MATH_MINIMUM";
            break;
        case "MAXIMUM":
            type = "MATH_MAXIMUM";
            break;
        case "ROUND":
            type = "MATH_ROUND";
            break;
        case "LESS_THAN":
            type = "MATH_LESS_THAN";
            break;
        case "GREATER_THAN":
            type = "MATH_GREATER_THAN";
            break;
        case "MODULO":
            type = "MATH_MODULO";
            break;
        case "ABSOLUTE":
            type = "MATH_ABSOLUTE";
            break;
        default:
            m_print.error("Unsupported MATH operation: " +
                    bpy_node["operation"]);
            return false;
        }
        dirs.push(["MATH_USE_CLAMP", Number(bpy_node["use_clamp"])]);
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = node_outputs_bpy_to_b4w(bpy_node);
        break;
    case "MIX_RGB":
        switch (bpy_node["blend_type"]) {
        case "MIX":
            type = "MIX_RGB_MIX";
            break;
        case "ADD":
            type = "MIX_RGB_ADD";
            break;
        case "MULTIPLY":
            type = "MIX_RGB_MULTIPLY";
            break;
        case "SUBTRACT":
            type = "MIX_RGB_SUBTRACT";
            break;
        case "SCREEN":
            type = "MIX_RGB_SCREEN";
            break;
        case "DIVIDE":
            type = "MIX_RGB_DIVIDE";
            break;
        case "DIFFERENCE":
            type = "MIX_RGB_DIFFERENCE";
            break;
        case "DARKEN":
            type = "MIX_RGB_DARKEN";
            break;
        case "LIGHTEN":
            type = "MIX_RGB_LIGHTEN";
            break;
        case "OVERLAY":
            type = "MIX_RGB_OVERLAY";
            break;
        case "DODGE":
            type = "MIX_RGB_DODGE";
            break;
        case "BURN":
            type = "MIX_RGB_BURN";
            break;
        case "HUE":
            type = "MIX_RGB_HUE";
            break;
        case "SATURATION":
            type = "MIX_RGB_SATURATION";
            break;
        case "VALUE":
            type = "MIX_RGB_VALUE";
            break;
        case "COLOR":
            type = "MIX_RGB_COLOR";
            break;
        case "SOFT_LIGHT":
            type = "MIX_RGB_SOFT_LIGHT";
            break;
        case "LINEAR_LIGHT":
            type = "MIX_RGB_LINEAR_LIGHT";
            break;
        default:
            m_print.error("Unsupported MIX_RGB blend type: " +
                    bpy_node["blend_type"]);
            return false;
        }
        dirs.push(["MIX_RGB_USE_CLAMP", Number(bpy_node["use_clamp"])]);
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = node_outputs_bpy_to_b4w(bpy_node);

        break;
    case "OUTPUT":
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = [];
        break;
    case "RGB":
        var param_name = mat_name + "%join%" + bpy_node["name"];
        var param = {
            name: "-1",
            value: param_name
        }
        params.push(param);

        outputs.push(node_output_by_ident(bpy_node, "Color"));

        break;
    case "SEPRGB":
    case "SEPHSV":
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = node_outputs_bpy_to_b4w(bpy_node);
        break;
    case "TEXTURE":

        type = texture_node_type(bpy_node);

        if (type == "TEXTURE_EMPTY") {
            outputs.push(node_output_by_ident(bpy_node, "Color"));
            outputs.push(node_output_by_ident(bpy_node, "Normal"));
            outputs.push(node_output_by_ident(bpy_node, "Value"));
        } else if (type == "TEXTURE_ENVIRONMENT") {
            inputs.push(node_input_by_ident(bpy_node, "Vector"));
            outputs.push(node_output_by_ident(bpy_node, "Color"));
            outputs.push(node_output_by_ident(bpy_node, "Value"));
        } else {
            if (type == "TEXTURE_NORMAL") {
                if (bpy_node["texture"]["type"] == "ENVIRONMENT_MAP") {
                    m_print.error("Wrong output for ENVIRONMENT_MAP texture: " + bpy_node["name"]);
                    return false;
                }
            }

            for (var i = 0; i < 4; ++i) {
                var input, output1, output2;

                if (i) {
                    input = default_node_inout("Vector" + i, "Vector" + i, [0,0,0]);
                    if (type == "TEXTURE_COLOR") {
                        output1 = default_node_inout("Color" + i, "Color" + i, [0,0,0]);
                        output2 = default_node_inout("Value" + i, "Value" + i, 0);
                    }
                    if (type == "TEXTURE_NORMAL") {
                        output1 = default_node_inout("Normal" + i, "Normal" + i, [0,0,0]);
                        output2 = default_node_inout("Value" + i, "Value" + i, 0);
                    }
                } else {
                    input = node_input_by_ident(bpy_node, "Vector");
                    if (type == "TEXTURE_COLOR") {
                        output1 = node_output_by_ident(bpy_node, "Color");
                        output2 = node_output_by_ident(bpy_node, "Value");
                    }
                    if (type == "TEXTURE_NORMAL") {
                        output1 = node_output_by_ident(bpy_node, "Normal");
                        output2 = node_output_by_ident(bpy_node, "Value");
                    }
                }
                inputs.push(input);
                outputs.push(output1);
                outputs.push(output2);
            }
        }

        var tex_name = shader_ident("param_TEXTURE_texture");
        params.push(node_param(tex_name));

        data = {
            name: tex_name,
            value: bpy_node["texture"]
        }

        break;
    case "VALTORGB":
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = node_outputs_bpy_to_b4w(bpy_node);
        m_print.warn("VALTORGB node is not fully supported.");
        break;
    case "VALUE":

        type = "VALUE";

        var param_name = mat_name + "%join%" + bpy_node["name"];
        var param = {
            name: "-1",
            value: param_name
        }
        params.push(param);

        outputs.push(node_output_by_ident(bpy_node, "Value"));

        break;
    case "VECT_MATH":
        switch (bpy_node["operation"]) {
        case "ADD":
            type = "VECT_MATH_ADD";
            break;
        case "SUBTRACT":
            type = "VECT_MATH_SUBTRACT";
            break;
        case "AVERAGE":
            type = "VECT_MATH_AVERAGE";
            break;
        case "DOT_PRODUCT":
            type = "VECT_MATH_DOT_PRODUCT";
            break;
        case "CROSS_PRODUCT":
            type = "VECT_MATH_CROSS_PRODUCT";
            break;
        case "NORMALIZE":
            type = "VECT_MATH_NORMALIZE";
            break;
        default:
            m_print.error("Unsupported VECT_MATH operation: " +
                    bpy_node["operation"]);
            return false;
        }
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = node_outputs_bpy_to_b4w(bpy_node);

        break;
    default:
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = node_outputs_bpy_to_b4w(bpy_node);

        break;
    }

    var attr = {
        name: name,
        type: type,

        vparams: vparams,

        inputs: inputs,
        outputs: outputs,
        params: params,

        data: data,

        dirs: dirs
    }

    m_graph.append_node(graph, m_graph.gen_node_id(graph), attr);

    // recursively split GEOMETRY or TEX_COORD node
    if ((bpy_node["type"] == "GEOMETRY" || bpy_node["type"] == "TEX_COORD") &&
            node_output_check_next(bpy_node, output_num))
        if (!append_nmat_node(graph, bpy_node, ++output_num, anim_data,
                              mat_name, shader_type))
            return false;

    return true;
}

function validate_custom_node_group(bpy_node, inputs_map, outputs_map) {

    var bpy_inputs = bpy_node["inputs"];
    var bpy_outputs = bpy_node["outputs"];
    var node_name = bpy_node["node_tree_name"];

    for (var i = 0; i < inputs_map.length; i++) {
        var input = bpy_inputs[i];
        var need_vec_in = inputs_map[i];
        if (!input || input["default_value"] instanceof Array != need_vec_in) {
            m_print.warn("Wrong inputs for custom node group \"" +
                bpy_node["name"] + "\" of type: \"", node_name, "\"." +
                "Processing as general node group.");
            return false;
        }
    }
    for (var i = 0; i < outputs_map.length; i++) {
        var output = bpy_outputs[i];
        var need_vec_out = outputs_map[i];
        if (!output || output["default_value"] instanceof Array != need_vec_out) {
            m_print.warn("Wrong outputs for custom node group \"" +
                bpy_node["name"] + "\" of type: \"", node_name, "\"." +
                "Processing as general node group.");
            return false;
        }
    }

    return true;
}

function process_node_group(bpy_node, mat_name, shader_type) {
    var node_tree = clone_node_tree(bpy_node["node_group"]["node_tree"]);

    var node_name = bpy_node["node_tree_name"];

    if (node_name == "B4W_REPLACE" || node_name == "B4W_LEVELS_OF_QUALITY") {
        var gi = init_bpy_node("Group input", "GROUP_INPUT", [], bpy_node["inputs"]);
        var go = init_bpy_node("Group output", "GROUP_OUTPUT", bpy_node["outputs"], []);

        var link = null;
        if (node_name == "B4W_REPLACE" ||
            node_name == "B4W_LEVELS_OF_QUALITY" &&
            (cfg_def.quality == m_config.P_LOW || cfg_def.force_low_quality_nodes)) {
            link = init_bpy_link(gi, gi["outputs"][1], go, go["inputs"][0]);
        } else
            link = init_bpy_link(gi, gi["outputs"][0], go, go["inputs"][0]);

        node_tree["nodes"] = [gi, go];
        node_tree["links"] = [link];
    }

    rename_node_group_nodes(bpy_node["name"], node_tree);
    var node_group_graph = compose_nmat_graph(node_tree,
                                              bpy_node["node_group"]["uuid"],
                                              true, mat_name, shader_type);
    var data = {
        node_group_graph: node_group_graph,
        node_group_links: node_tree["links"]
    };
    return data;
}

function reset_shader_ident_counters() {
    _shader_ident_counters = {};
}

function copy_obj(obj) {
    var type = typeof(obj);
    if (type == "string" || type == "number" || type == "boolean" || !obj)
        return obj;
    return m_util.clone_object_nr(obj);
}

function clone_node_tree(tree) {
    var new_tree = {};

    for (var i in tree) {
        if (i == "links" || i == "nodes") {
            new_tree[i] = [];
            for (var j = 0; j < tree[i].length; j++) {
                new_tree[i][j] = {};
                for (var k in tree[i][j]) {
                    if (i == "links") {
                        new_tree[i][j][k] = {};
                        for (var l in tree[i][j][k])
                            new_tree[i][j][k][l] = copy_obj(tree[i][j][k][l]);
                    } else
                        new_tree[i][j][k] = copy_obj(tree[i][j][k]);
                }
            }
        } else
            new_tree[i] = copy_obj(tree[i]);
    }

    return new_tree;
}

/**
 * Compose unique shader identifier based on given name.
 */
function shader_ident(name_base) {
    if (!_shader_ident_counters[name_base])
        _shader_ident_counters[name_base] = 0;

    var name = name_base + _shader_ident_counters[name_base];
    // remove slash and space symbols
    name = name.replace(/ /g, "_").replace(/\//g, "_");

    _shader_ident_counters[name_base]++;

    return name;
}

function check_input_node_outputs(bpy_node) {
    var outputs = bpy_node["outputs"];
    for (var i = 0; i < outputs.length; i++) {
        var output = outputs[i];
        if (output["is_linked"])
            return true;
    }
    return false;
}

function geometry_node_type(bpy_node, output_num) {
    var outputs = bpy_node["outputs"];
    var out_counter = 0;
    for (var i = 0; i < outputs.length; i++) {
        var output = outputs[i];

        if (!output["is_linked"])
            continue;

        if ((out_counter++) < output_num)
            continue;

        switch (output["identifier"]) {
        case "UV":
            return "GEOMETRY_UV";
        case "Vertex Color":
            return "GEOMETRY_VC";
        case "Normal":
            return "GEOMETRY_NO";
        case "Front/Back":
            return "GEOMETRY_FB";
        case "View":
            return "GEOMETRY_VW";
        case "Global":
            return "GEOMETRY_GL";
        case "Local":
            return "GEOMETRY_LO";
        case "Orco":
            return "GEOMETRY_OR";
        default:
            return null;
        }
    }
}

function tex_coord_node_type(bpy_node, output_num) {
    var outputs = bpy_node["outputs"];
    var out_counter = 0;
    for (var i = 0; i < outputs.length; i++) {
        var output = outputs[i];

        if (!output["is_linked"])
            continue;

        if ((out_counter++) < output_num)
            continue;

        switch (output["identifier"]) {
        case "Camera":
            return "TEX_COORD_CA";
        case "Generated":
            return "TEX_COORD_GE";
        case "Normal":
            return "TEX_COORD_NO";
        case "Object":
            return "TEX_COORD_OB";
        case "Reflection":
            return "TEX_COORD_RE";
        case "UV":
            return "TEX_COORD_UV";
        case "Window":
            return "TEX_COORD_WI";
        default:
            return null;
        }
    }
}

function node_output_check_next(bpy_node, output_num) {
    var outputs = bpy_node["outputs"];
    var out_counter = 0;
    for (var i = 0; i < outputs.length; i++) {
        var output = outputs[i];

        if (!output["is_linked"])
            continue;

        // next linked available
        if ((out_counter++) > output_num)
            return true;
    }

    return false;
}


function texture_node_type(bpy_node) {
    if (!bpy_node["texture"])
        return "TEXTURE_EMPTY";

    var outputs = bpy_node["outputs"];
    var node_color  = false;
    var node_normal = false;
    var node_value  = false;
    for (var i = 0; i < outputs.length; i++) {
        var output = outputs[i];

        if (!output["is_linked"])
            continue;

        var ident = output["identifier"];

        switch (ident) {
        case "Color":
            node_color = true;
            break;
        case "Normal":
            node_normal = true;
            break;
        case "Value":
            node_value = true;
            break;
        default:
            throw "Unknown texture output";
        }
    }

    if (node_color) {
        if (node_normal)
            m_print.warn("Node \"" + bpy_node["name"] + "\" has both Color " +
                         "and Normal outputs. Normal will be omitted");

        if (bpy_node["texture"]["type"] == "ENVIRONMENT_MAP")
            return "TEXTURE_ENVIRONMENT";
        else
            return "TEXTURE_COLOR";

    } else if (node_normal) {
        return "TEXTURE_NORMAL"

    } else if (node_value) {
        if (bpy_node["texture"]["type"] == "ENVIRONMENT_MAP")
            return "TEXTURE_ENVIRONMENT";
        else
            return "TEXTURE_COLOR";
    }
}

function node_input_by_ident(bpy_node, ident) {
    var inputs = bpy_node["inputs"];
    for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i];

        if (input["identifier"] == ident)
            return node_inout_bpy_to_b4w(input);
    }
    return null;
}

function node_output_by_ident(bpy_node, ident) {
    var outputs = bpy_node["outputs"];
    for (var i = 0; i < outputs.length; i++) {
        var output = outputs[i];

        if (output["identifier"] == ident)
            return node_inout_bpy_to_b4w(output);
    }
    return null;
}

function node_inout_bpy_to_b4w(bpy_node_inout) {
    return {
        name: bpy_node_inout["name"],
        identifier: bpy_node_inout["identifier"],
        is_linked: bpy_node_inout["is_linked"],
        default_value: bpy_to_b4w_value(bpy_node_inout["default_value"])
    }
}

function default_node_inout(name, identifier, default_value) {
    return {
        name: name,
        identifier: identifier,
        is_linked: false,
        default_value: default_value
    }
}

function bpy_to_b4w_value(value) {

    if (m_util.is_vector(value))
        return value.slice(0);

    return value;
}

function node_inputs_bpy_to_b4w(bpy_node) {
    var inputs = [];

    for (var i = 0; i < bpy_node["inputs"].length; i++) {
        var input = node_inout_bpy_to_b4w(bpy_node["inputs"][i]);
        // NOTE: trim all vec4 to vec3
        if (input.default_value.length)
            input.default_value.splice(3);
        inputs.push(input);
    }

    return inputs;
}

function node_outputs_bpy_to_b4w(bpy_node) {
    var outputs = [];

    for (var i = 0; i < bpy_node["outputs"].length; i++) {
        var output = node_inout_bpy_to_b4w(bpy_node["outputs"][i]);
        outputs.push(output);
    }

    return outputs;
}

/**
 * value = null - do not assign param value
 */
function node_param(name, value, dim) {

    if (value === null || value === undefined)
        var pval = null;
    else
        var pval = m_shaders.glsl_value(value, dim);

    var param = {
        name: name,
        value: pval
    }

    return param;
}

function replace_zero_unity_vals(str_val) {
    // HACK: for better global replacing
    str_val = str_val.replace(/(,)/g, "$1 ");

    str_val = str_val.replace(/(^|[^0-9]|\s)(0\.0)($|[^0-9]|\s)/g, "$1ZERO_VALUE_NODES$3");
    str_val = str_val.replace(/(^|[^0-9]|\s)(1\.0)($|[^0-9]|\s)/g, "$1UNITY_VALUE_NODES$3");
    str_val = str_val.replace(/\s+/g, "");

    return str_val;
}

function append_nmat_edge(graph, id1, id2, attr1, attr2, bpy_link) {
    // pair [node1_output_index, node2_input_index]
    var attr = [];

    var ident1 = bpy_link["from_socket"]["identifier"];
    var ident2 = bpy_link["to_socket"]["identifier"];

    var outputs1 = attr1.outputs;
    for (var i = 0; i < outputs1.length; i++) {
        var out1 = outputs1[i];
        if (out1.identifier == ident1) {
            attr.push(i);
            break;
        }
    }

    var inputs2 = attr2.inputs;
    for (var i = 0; i < inputs2.length; i++) {
        var in2 = inputs2[i];
        if (in2.identifier == ident2) {
            attr.push(i);
            break;
        }
    }

    if (attr.length == 2)
        m_graph.append_edge(graph, id1, id2, attr);

    return true;
}


/**
 * Compose node elements for use in shader
 */
exports.compose_node_elements = function(graph) {

    var node_elements = [];

    var node_elem_map = {};

    reset_shader_ident_counters();

    var sgraph = m_graph.topsort(graph);
    m_graph.traverse(sgraph, function(id, attr) {
        var elem = init_node_elem(attr)
        node_elements.push(elem);
        node_elem_map[id] = elem;
    });

    m_graph.traverse_edges(sgraph, function(id1, id2, attr) {
        var node1 = m_graph.get_node_attr(sgraph, id1);
        var node2 = m_graph.get_node_attr(sgraph, id2);

        var out1 = node1.outputs[attr[0]];
        var in2 = node2.inputs[attr[1]];

        var elem1_outputs = node_elem_map[id1].outputs;
        var elem2_inputs = node_elem_map[id2].inputs;

        // name after (unique) node output
        var name = elem1_outputs[attr[0]] ||
                shader_ident("out_" + node1.type + "_" + out1.identifier);

        elem1_outputs[attr[0]] = name;
        elem2_inputs[attr[1]] = name;
    });

    return node_elements;
}

function init_node_elem(mat_node) {

    var finputs = [];
    var finput_values = [];

    var foutputs = [];

    var fparams = [];
    var fparam_values = [];

    var vparams = [];

    for (var i = 0; i < mat_node.inputs.length; i++) {
        var input = mat_node.inputs[i];

        if (input.is_linked) {
            finputs.push(null);
            finput_values.push(null);
        } else {
            finputs.push(shader_ident("in_" + mat_node.type + "_" + input.identifier));

            var input_val = m_shaders.glsl_value(input.default_value, 0);
            // HACK: too many vertex shader constants issue
            if (cfg_def.shader_constants_hack)
                if (mat_node.type.indexOf("MIX_RGB_") >= 0
                        && (input.identifier == "Color1"
                        || input.identifier == "Color2"
                        || input.identifier == "Fac") ||
                        mat_node.type.indexOf("MATH_") >= 0
                        && (input.identifier == "Value"
                        || input.identifier == "Value_001") ||
                        mat_node.type.indexOf("VECT_MATH_") >= 0
                        && (input.identifier == "Vector_001"))
                    input_val = replace_zero_unity_vals(input_val);

            finput_values.push(input_val);
        }
    }

    for (var i = 0; i < mat_node.outputs.length; i++) {
        var output = mat_node.outputs[i];

        if (output.is_linked)
            foutputs.push(null);
        else
            foutputs.push(shader_ident("out_" + mat_node.type + "_" + output.identifier));
    }

    for (var i = 0; i < mat_node.params.length; i++) {
        var param = mat_node.params[i];
        fparams.push(param.name);
        fparam_values.push(param.value);
    }

    for (var i = 0; i < mat_node.vparams.length; i++) {
        var vparam = mat_node.vparams[i];
        vparams.push(vparam.name);
    }

    var elem = {
        id: mat_node.type,
        inputs: finputs,
        input_values: finput_values,
        outputs: foutputs,
        params: fparams,
        param_values: fparam_values,
        vparams: vparams,
        dirs: JSON.parse(JSON.stringify(mat_node.dirs)) // deep copy
    }

    return elem;
}

function create_new_name(type, group_name, name) {
    if (type == "GROUP_INPUT")
        return group_name + "*GI*" + name;      // for search
    else if (type == "GROUP_OUTPUT")
        return group_name + "*GO*" + name;
    return group_name + "%join%" + name;
}

function rename_node_group_nodes(node_group_name, node_tree) {
    var nodes = node_tree["nodes"];
    var links = node_tree["links"];
    for (var i = 0; i < nodes.length; i++)
        nodes[i]["name"] = create_new_name(nodes[i].type, node_group_name, nodes[i].name);
    for (var i = 0; i < links.length; i++) {
        links[i]["from_node"]["name"] = create_new_name(links[i]["from_node"]["type"],
                                                node_group_name, links[i]["from_node"]["name"]);
        links[i]["to_node"]["name"] = create_new_name(links[i]["to_node"]["type"],
                                                node_group_name, links[i]["to_node"]["name"]);
    }
}

function trace_group_nodes(graph){
    var node_groups = [];
    m_graph.traverse(graph, function(id, node) {
        if (node["type"] == "GROUP")
            node_groups.push(node);
    });
    return node_groups;
}

function append_node_groups_graphs(graph, links, node_groups) {
    for (var i = 0; i < node_groups.length; i++) {
        var node_group_graph = node_groups[i].data.node_group_graph;
        var node_group_links = node_groups[i].data.node_group_links;
        if (!node_group_graph)
            return false;

        m_graph.traverse(node_group_graph, function(id, node) {
            m_graph.append_node(graph, m_graph.gen_node_id(graph), node);
        });

        for (var j = 0; j < node_group_links.length; j++)
            links.push(node_group_links[j]);

        change_node_groups_links(node_groups[i], links, graph);
    }
    return true;
}

function distribute_link(property, group_name, link, node_group_links,
                    node_group_input_links, node_group_output_links) {
    switch (property.type) {
        case "GROUP":
            if (property["name"] == group_name)
                node_group_links.push(link);
            break;
        case "GROUP_INPUT":
            if (!property["name"].indexOf(group_name + "*GI*"))
                node_group_input_links.push(link);
            break;
        case "GROUP_OUTPUT":
            if (!property["name"].indexOf(group_name + "*GO*"))
                node_group_output_links.push(link);
            break;
    }
}

// change links, return links for cut
function relink(links, input_links, output_links) {
    var unused_links = [];
    for (var i = 0; i < output_links.length; i++) {
        var output = output_links[i];
        var input = null;
        for (var j = 0; j < input_links.length; j++)
            if (output["from_socket"]["identifier"] ==
                input_links[j]["to_socket"]["identifier"]) {
                input = input_links[j]
                break;
            }
        if (input) {
            output["from_node"] = input["from_node"];
            output["from_socket"] = input["from_socket"];
        } else
            unused_links.push(output);
    }
    // remove links to node group or to group_output
    for (var i = 0; i < input_links.length; i++)
        links.splice(links.indexOf(input_links[i]), 1);
    return unused_links;
}

function add_unused_input_links(links, unused_links) {
    if (!unused_links.length)
        return;
    var gi_name = unused_links[0]["from_node"]["name"];
    for (var i = 0; i < links.length; i++)
        if (links[i]["from_node"]["name"] == gi_name)
            unused_links.push(links[i]);
}

function set_input_default_value(link, graph, value) {
    var node_ids = nmat_node_ids(link["to_node"], graph);
    for (var i = 0; i < node_ids.length; i++) {
        var node_attr = m_graph.get_node_attr(graph, node_ids[i]);
        for (var j = 0; j < node_attr.inputs.length; j++)
            if (node_attr.inputs[j].identifier == link["to_socket"]["identifier"]) {
                node_attr.inputs[j].default_value = value;
                break;
            }
    }
}

function change_default_values(links, graph, node, unused_links) {
    for (var i = 0; i < unused_links.length; i++) {
        var link = unused_links[i];
        var value;
        for (var j = 0; j < node.inputs.length; j++)
            if (link["from_socket"]["identifier"] == node.inputs[j].identifier) {
                value = node.inputs[j].default_value;
                break;
            }
        set_input_default_value(link, graph, value);
        var index = links.indexOf(link);
        if (index != -1)
            links.splice(index, 1);
    }
}

function change_node_groups_links(node, links, graph) {

    var group_name = node.name;

    var node_group_links_from = [];     // node outputs
    var node_group_links_to = [];       // node inputs
    var node_group_input_links = [];
    var node_group_output_links = [];

    // find links to/from node_group, group_input, group_output
    for (var i = 0; i < links.length; i++) {
        var link = links[i];
        distribute_link(link["from_node"], group_name, link, node_group_links_from,
            node_group_input_links, node_group_output_links);
        distribute_link(link["to_node"], group_name, link, node_group_links_to,
            node_group_input_links, node_group_output_links);
    }
    // remove links to node_group; connect group_input links to nodes of removed links
    var unused_input_links = relink(links, node_group_links_to, node_group_input_links);
    // remove links to group_output; connect links from node_group to nodes of removed links
    var unused_output_links = relink(links, node_group_output_links, node_group_links_from);
    // if last relink makes new links with group input
    add_unused_input_links(links, unused_input_links);

    // change default value of group nodes connected to group_input
    change_default_values(links, graph, node, unused_input_links);
    // change default value of node with links from node_group
    if (unused_output_links.length) {
        var output_node;
        m_graph.traverse(graph, function(id, node) {
            if (node.type == "GROUP_OUTPUT" &&
                !node.name.indexOf(group_name + "*GO*"))
                output_node = node;
        });
        change_default_values(links, graph, output_node, unused_output_links);
    }
}

exports.check_material_glow_output = function(mat) {
    if (mat["node_tree"])
        for (var i = 0; i < mat["node_tree"]["nodes"].length; i++) {
            var node = mat["node_tree"]["nodes"][i]
            if (node.type == "GROUP" && node["node_tree_name"] == "B4W_GLOW_OUTPUT")
                return true;
        }
    return false;
}

exports.cleanup = cleanup;
function cleanup() {
    for (var graph_id in _composed_node_graphs) {
        delete _composed_node_graphs[graph_id];
    }

    for (var key in _lamp_indexes)
        delete _lamp_indexes[key];
    _lamp_index = 0;
}

}
