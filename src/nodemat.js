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
var m_mat3 = require("mat3");
var m_mat4 = require("mat4");

var _shader_ident_counters = {};
var _composed_node_graphs = {};
var _lamp_indexes = {};
var _lamp_index = 0;

var cfg_def = m_config.defaults;

exports.compose_nmat_graph = compose_nmat_graph;
function compose_nmat_graph(node_tree, graph_id, is_node_group) {

    if (graph_id in _composed_node_graphs)
        return _composed_node_graphs[graph_id];

    var graph = m_graph.create();

    var bpy_nodes = node_tree["nodes"];
    var links = node_tree["links"];
    var anim_data = node_tree["animation_data"];

    for (var i = 0; i < bpy_nodes.length; i++) {
        var bpy_node = bpy_nodes[i];
        if (!append_nmat_node(graph, bpy_node, 0, anim_data)) {
            _composed_node_graphs[graph_id] = null;
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
                    _composed_node_graphs[graph_id] = null;
                    return null;
                }
            }
        }
    }

    complete_edges(graph);

    var output_id = find_node_id(node_tree, graph, "OUTPUT", "material");
    if (output_id == -1) {
        _composed_node_graphs[graph_id] = null;
        return null;
    }

    nmat_cleanup_graph(graph);
    var graph_out = m_graph.subgraph_node_conn(graph, output_id, m_graph.BACKWARD_DIR);

    clean_sockets_linked_property(graph_out);

    merge_nodes(graph_out);
    optimize_geometry_vcol(graph_out);

    if (!check_normalmaps_usage(graph_out)) {
        m_print.error("Material has normalmap node but no material node");
        _composed_node_graphs[graph_id] = null;
        return null;
    }

    _composed_node_graphs[graph_id] = graph_out;
    return graph_out;
}

function check_normalmaps_usage(graph) {
    var has_normalmap_node = false;
    var has_material_node = false;
    m_graph.traverse(graph, function(id, node) {
        if (node.type == "MATERIAL" || node.type == "MATERIAL_EXT")
            has_material_node = true;
        if (node.type == "TEXTURE_NORMAL")
            has_normalmap_node = true;
    });

    if (has_normalmap_node && !has_material_node)
        return false;

    return true;
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

/**
 * Adding special edges to graph
 */
function complete_edges(graph) {
    var appended_edges = [];

    m_graph.traverse(graph, function(id, attr) {
        switch (attr.type) {
        case "TRANSLUCENCY":
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
        if (attr.type == "PARALLAX" || attr.type == "REROUTE")
            id_attr.push(id, attr);
    });

    for (var i = 0; i < id_attr.length; i+=2) {
        var id = id_attr[i];
        var attr = id_attr[i+1];

        if (attr.type == "PARALLAX") {

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
}

function merge_geometry(graph) {

    var id_attr = [];
    m_graph.traverse(graph, function(id, attr) {
        if (attr.type == "GEOMETRY_VC" || attr.type == "GEOMETRY_UV"
                || attr.type == "GEOMETRY_NO" || attr.type == "GEOMETRY_FB"
                || attr.type == "GEOMETRY_VW" || attr.type == "GEOMETRY_GL")
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

function merge_textures(graph) {

    var id_attr = [];
    m_graph.traverse(graph, function(id, attr) {
        if (attr.type == "TEXTURE_COLOR" || attr.type == "TEXTURE_NORMAL")
            id_attr.push(id, attr);
    });

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
            if (can_merge_nodes(attr_current, unode.attr)) {
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
                    attr: attr_current,
                    edges_in: removed_edges_in,
                    edges_out: removed_edges_out
                }
                unode.merged_nodes.push(mnode);

                is_unique = false;
                break;
            }
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
        var in_num = unode.attr.inputs.length;
        var out_num = unode.attr.outputs.length;

        // NOTE: merge similar nodes and unique node
        for (var j = 0; j < mnodes_count; j++) {
            var merged_data = unode.merged_nodes[j];
            var mnode = merged_data.attr;
            var edges_in = merged_data.edges_in;
            var edges_out = merged_data.edges_out;

            unode.attr.inputs = unode.attr.inputs.concat(mnode.inputs);
            unode.attr.outputs = unode.attr.outputs.concat(mnode.outputs);

            for (var k = 0; k < unode.attr.inputs.length; k++)
                unode.attr.inputs[k].identifier += m_util.trunc(k / in_num) + 1;
            for (var k = 0; k < unode.attr.outputs.length; k++)
                unode.attr.outputs[k].identifier += m_util.trunc(k / out_num) + 1;

            // NOTE: change edge attributes indices for similar links
            for (var k = 0; k < edges_in.length; k += 3) {
                var in_id = edges_in[k];
                var edge_attr = edges_in[k + 2];
                edge_attr[1] += (j + 1) * in_num;
                m_graph.append_edge(graph, in_id, unode.id, edge_attr);
            }

            for (var k = 0; k < edges_out.length; k += 3) {
                var out_id = edges_out[k + 1];
                var edge_attr = edges_out[k + 2];
                edge_attr[0] += (j + 1) * out_num;
                m_graph.append_edge(graph, unode.id, out_id, edge_attr);
            }
        }

        // NOTE: change node type by additional merged nodes
        switch (mnodes_count) {
        case 1:
            unode.attr.type += "2";
            break;
        case 2:
            unode.attr.type += "3";
            break;
        case 3:
            unode.attr.type += "4";
            break;
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
    case "GEOMETRY_UV":
        return attr1.data.value == attr2.data.value;
    case "GEOMETRY_NO":
    case "GEOMETRY_FB":
    case "GEOMETRY_VW":
    case "GEOMETRY_GL":
        return true;
    case "TEXTURE_COLOR":
    case "TEXTURE_NORMAL":
        return attr1.data.value == attr2.data.value;
    default:
        return false;
    }
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

function find_node_id(node_tree, graph, type, source_type) {
    var bpy_nodes = node_tree["nodes"];

    // find last OUTPUT
    var last_output_node = null;

    // search in original bpy_nodes
    for (var i = 0; i < bpy_nodes.length; i++) {
        var bpy_node = bpy_nodes[i];

        if (bpy_node["type"] == type)
            last_output_node = bpy_node;
    }

    if (!last_output_node) {
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

function append_nmat_node(graph, bpy_node, geometry_output_num, anim_data) {
    var name = bpy_node["name"];
    var type = bpy_node["type"];
    var vparams = [];
    var inputs = [];
    var outputs = [];
    var params = [];

    var data = null;

    switch(type) {
    case "CAMERA":
        inputs = [];
        outputs = node_outputs_bpy_to_b4w(bpy_node);
        break;
    case "COMBRGB":
    case "COMBHSV":
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = node_outputs_bpy_to_b4w(bpy_node);
        break;
    case "GEOMETRY":

        if (!check_geometry_node_outputs(bpy_node))
            return true;

        type = geometry_node_type(bpy_node, geometry_output_num);
        if (!type) {
            m_print.error("Geometry output is not supported");
            return false;
        }

        switch (type) {
        case "GEOMETRY_UV":

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
        }
        break;
    case "GROUP":
        // NOTE: allow auto-generated names for custom nodes
        // (e.g consider TIME.001 as TIME)
        var node_name = bpy_node["node_tree_name"].replace(/\.[0-9]{3,}$/g, "");
        switch (node_name) {
        case "LINEAR_TO_SRGB":
            type = "LINEAR_TO_SRGB";
            break;
        case "NORMAL_VIEW":
        case "VECTOR_VIEW":
            type = "VECTOR_VIEW";
            break;
        case "SRGB_TO_LINEAR":
            type = "SRGB_TO_LINEAR";
            break;
        case "REFLECT":
            type = "REFLECT";
            break;
        case "REFRACTION":
            type = "REFRACTION";
            break;
        case "PARALLAX":
            type = "PARALLAX";
            // NOTE: empty texture container (overwritten in nmat_cleanup_graph)
            if (!bpy_node["inputs"][1]["is_linked"]) {
                m_print.error("Missing texture in node \"", bpy_node["name"],"\"");
                return false;
            }
            var tex_name = shader_ident("temp_texture");
            params.push(node_param(tex_name));
            break;
        case "CLAMP":
            type = "CLAMP";
            break;
        case "TRANSLUCENCY":
            type = "TRANSLUCENCY";
            break;
        case "TIME":
            type = "TIME";
            break;
        case "SMOOTHSTEP":
            type = "SMOOTHSTEP";
            break;
        default:
            var node_tree = clone_node_tree(bpy_node["node_group"]["node_tree"]);

            if (node_name == "REPLACE" || node_name == "LEVELS_OF_QUALITY") {
                var gi = init_bpy_node("Group input", "GROUP_INPUT", [], bpy_node["inputs"]);
                var go = init_bpy_node("Group output", "GROUP_OUTPUT", bpy_node["outputs"], []);

                var link = null;

                if (node_name == "REPLACE" ||
                    node_name == "LEVELS_OF_QUALITY" && 
                    (cfg_def.quality == m_config.P_LOW || cfg_def.force_low_quality_nodes)) {
                    link = init_bpy_link(gi, gi["outputs"][1], go, go["inputs"][0]);
                } else
                    link = init_bpy_link(gi, gi["outputs"][0], go, go["inputs"][0]);

                node_tree["nodes"] = [gi, go];
                node_tree["links"] = [link];
            }

            rename_node_group_nodes(bpy_node["name"], node_tree);
            var node_group_graph = compose_nmat_graph(node_tree, bpy_node["node_group"]["uuid"], true);
            data = {
                node_group_graph: node_group_graph,
                node_group_links: node_tree["links"]
            };
        }
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = node_outputs_bpy_to_b4w(bpy_node);
        // NOTE: additional translucency output
        if (node_name == "TRANSLUCENCY") {
            var out = default_node_inout("TranslucencyParams", "TranslucencyParams", [0,0,0,0]);
            out.is_linked = outputs[0].is_linked;
            outputs.push(out);
        }
        break;
    case "LAMP":
        outputs.push(node_output_by_ident(bpy_node, "Color"));
        outputs.push(node_output_by_ident(bpy_node, "Light Vector"));
        outputs.push(node_output_by_ident(bpy_node, "Distance"));
        outputs.push(node_output_by_ident(bpy_node, "Visibility Factor"));
        var lamp = bpy_node["lamp"];
        if (!lamp) {
            m_print.error("There is no lamp in node: " + bpy_node["name"]);
            return false;
        }
        if (!(lamp["uuid"] in _lamp_indexes)) {
            _lamp_indexes[lamp["uuid"]] = _lamp_index;
            params.push(node_param(shader_ident("param_LAMP_lamp_index"), _lamp_index++, 1));
        } else
            params.push(node_param(shader_ident("param_LAMP_lamp_index"), _lamp_indexes[lamp["uuid"]], 1));
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

        inputs.push(node_input_by_ident(bpy_node, "Vector"));
        outputs.push(node_output_by_ident(bpy_node, "Vector"));

        if (m_vec3.length(bpy_node["translation"]) == 0 &&
                m_vec3.length(bpy_node["rotation"]) == 0 &&
                !bpy_node["use_max"] && !bpy_node["use_min"]) {
            type = "MAPPING_LIGHT";
            params.push(node_param(shader_ident("param_MAPPING_LIGHT_scale"),
                    bpy_node["scale"], 3));
        }
        else {
            type = "MAPPING_HEAVY";

            // rotation
            var rot = bpy_node["rotation"];
            var rot_matrix = m_mat3.create();

            var cosX = Math.cos(rot[0]);
            var cosY = Math.cos(rot[1]);
            var cosZ = Math.cos(rot[2]);
            var sinX = Math.sin(rot[0]);
            var sinY = Math.sin(rot[1]);
            var sinZ = Math.sin(rot[2]);

            var cosXcosZ = cosX * cosZ;
            var cosXsinZ = cosX * sinZ;
            var sinXcosZ = sinX * cosZ;
            var sinXsinZ = sinX * sinZ;

            rot_matrix[0] = cosY * cosZ;
            rot_matrix[1] = cosY * sinZ;
            rot_matrix[2] = -sinY;

            rot_matrix[3] = sinY * sinXcosZ - cosXsinZ;
            rot_matrix[4] = sinY * sinXsinZ + cosXcosZ;
            rot_matrix[5] = cosY * sinX;

            rot_matrix[6] = sinY * cosXcosZ + sinXsinZ;
            rot_matrix[7] = sinY * cosXsinZ - sinXcosZ;
            rot_matrix[8] = cosY * cosX;

            // scale
            var scale = bpy_node["scale"];
            var scale_matrix = new Float32Array([scale[0],0,0,0,scale[1],0,0,0,scale[2]]);
            var trs_matrix = m_mat3.create();
            // order of transforms: translation -> rotation -> scale
            m_mat3.multiply(rot_matrix, scale_matrix, trs_matrix);

            // translation
            var trans = bpy_node["translation"];
            trs_matrix = m_util.mat3_to_mat4(trs_matrix, m_mat4.create());
            trs_matrix[12] = trans[0];
            trs_matrix[13] = trans[1];
            trs_matrix[14] = trans[2];

            params.push(node_param(shader_ident("param_MAPPING_HEAVY_trs_matrix"),
                    trs_matrix, 16));

            // clipping
            // ~~: bool to int
            params.push(node_param(shader_ident("param_MAPPING_HEAVY_use_min"),
                    ~~bpy_node["use_min"], 1));
            params.push(node_param(shader_ident("param_MAPPING_HEAVY_use_max"),
                    ~~bpy_node["use_max"], 1));

            params.push(node_param(shader_ident("param_MAPPING_LIGHT_min_clip"),
                    bpy_node["min"], 3));
            params.push(node_param(shader_ident("param_MAPPING_LIGHT_max_clip"),
                    bpy_node["max"], 3));

        }

        break;
    case "MATERIAL":
    case "MATERIAL_EXT":
        var mat = bpy_node["material"];
        if (!mat) {
            m_print.error("Emtpy material slot in node: " + bpy_node["name"]);
            return false;
        }

        // INPUT 0
        var input = node_input_by_ident(bpy_node, "Color");
        input.default_value.splice(3); // vec4 -> vec3
        inputs.push(input);

        // INPUT 1
        var input = node_input_by_ident(bpy_node, "Alpha");
        if (input)
            inputs.push(input);
        else
            inputs.push(default_node_inout("Alpha", "Alpha", 1));

        // INPUT 2
        var input = node_input_by_ident(bpy_node, "Spec");
        input.default_value.splice(3); // vec4 -> vec3
        inputs.push(input);

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
            var input = node_input_by_ident(bpy_node, "Ray Mirror");
            if (input)
                inputs.push(input);
            else
                inputs.push(default_node_inout("Ray Mirror", "Ray Mirror", 0));

            // INPUT 7
            var input = node_input_by_ident(bpy_node, "SpecTra");
            if (input)
                inputs.push(input);
            else
                inputs.push(default_node_inout("SpecTra", "SpecTra", 0));

            outputs.push(node_output_by_ident(bpy_node, "Diffuse"));
            outputs.push(node_output_by_ident(bpy_node, "Spec"));
        }

        var spec_param_0;
        var spec_param_1 = 0;
        switch(mat["specular_shader"]) {
        case "COOKTORR":
        case "PHONG":
            spec_param_0 = mat["specular_hardness"];
            break;
        case "WARDISO":
            spec_param_0 = mat["specular_slope"];
            break;
        case "TOON":
            spec_param_0 = mat["specular_toon_size"];
            spec_param_1 = mat["specular_toon_smooth"];
            break;
        default:
            m_print.error("B4W Error: unsupported specular shader: " +
                mat["specular_shader"] + " (material \"" +
                mat["name"] + "\")");
            spec_param_0 = mat["specular_hardness"];
            break;
        }

        var diffuse_param;
        var diffuse_param2;
        switch(mat["diffuse_shader"]) {
        case "LAMBERT":
            diffuse_param = 0.0;
            diffuse_param2 = 0.0;
            break;
        case "OREN_NAYAR":
            diffuse_param = mat["roughness"];
            diffuse_param2 = 0.0;
            break;
        case "FRESNEL":
            diffuse_param = mat["diffuse_fresnel"];
            diffuse_param2 = mat["diffuse_fresnel_factor"];
            break;
        default:
            m_print.error("B4W Error: unsupported diffuse shader: " +
                mat["diffuse_shader"] + " (material \"" +
                mat["name"] + "\")");
            diffuse_param = 0.0;
            diffuse_param2 = 0.0;
            break;
        }

        params.push(node_param(shader_ident("param_MATERIAL_diffuse"),
                                [bpy_node["use_diffuse"]? 1: 0,
                                diffuse_param, diffuse_param2 ], 3));

        params.push(node_param(shader_ident("param_MATERIAL_spec"),
                               [bpy_node["use_specular"]? 1: 0,
                                mat["specular_intensity"],
                                spec_param_0, spec_param_1], 4));

        params.push(node_param(shader_ident("param_MATERIAL_norm"),
                                input_norm.is_linked ? 1: 0, 1));
        data = {
            name: bpy_node["name"],
            value: mat
        }
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
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = node_outputs_bpy_to_b4w(bpy_node);

        break;
    case "OUTPUT":
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = [];
        break;
    case "RGB":
        var output = node_output_by_ident(bpy_node, "Color");
        outputs.push(output);

        params.push(node_param(shader_ident("param_RGB_Color"), output.default_value, 3));
        break;
    case "SEPRGB":
    case "SEPHSV":
        inputs = node_inputs_bpy_to_b4w(bpy_node);
        outputs = node_outputs_bpy_to_b4w(bpy_node);
        break;
    case "TEXTURE":

        if (!bpy_node["texture"]) {
            m_print.error("No texture attached to node: " + bpy_node["name"]);
            return false;
        }
        type = texture_node_type(bpy_node);

        inputs.push(node_input_by_ident(bpy_node, "Vector"));

        if (type == "TEXTURE_COLOR" || type == "TEXTURE_ENVIRONMENT" ) {
            outputs.push(node_output_by_ident(bpy_node, "Color"));
            outputs.push(node_output_by_ident(bpy_node, "Value"));
        }

        if (type == "TEXTURE_NORMAL") {
            outputs.push(node_output_by_ident(bpy_node, "Normal"));
            outputs.push(node_output_by_ident(bpy_node, "Value"));
        }

        var tex_name = shader_ident("param_TEXTURE_texture");
        params.push(node_param(tex_name));

        data = {
            name: tex_name,
            value: bpy_node["texture"]
        }
        break;
    case "VALUE":

        var anim_param_name = get_value_node_anim_param(anim_data, bpy_node);

        var output = node_output_by_ident(bpy_node, "Value");

        if (anim_param_name) {
            type = "ANIM_VALUE";
            var val_name = shader_ident("param_ANIM_VALUE_Value");
            var param = {
                name: val_name,
                value: String(0)
            }
            params.push(param);

            var param = {
                name: "-1",
                value: anim_param_name
            }
            params.push(param);

        } else {
            // consider node as simple VALUE node if there is no animation
            type = "VALUE";
            params.push(node_param(shader_ident("param_value_value"),
                        output.default_value, 1))
        }
        outputs.push(output);

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

        data: data
    }

    m_graph.append_node(graph, m_graph.gen_node_id(graph), attr);

    // recursively split GEOMETRY node
    if (bpy_node["type"] == "GEOMETRY" &&
            geometry_check_next(bpy_node, geometry_output_num))
        if (!append_nmat_node(graph, bpy_node, ++geometry_output_num, anim_data))
            return false;

    return true;
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

function check_geometry_node_outputs(bpy_node) {
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
        default:
            return null;
        }
    }
}

function geometry_check_next(bpy_node, output_num) {
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
    var outputs = bpy_node["outputs"];
    var node_value = false;
    for (var i = 0; i < outputs.length; i++) {
        var output = outputs[i];

        if (!output["is_linked"])
            continue;

        var ident = output["identifier"];

        switch (ident) {
        case "Color":
            if (bpy_node["texture"]["type"] == "ENVIRONMENT_MAP")
                return "TEXTURE_ENVIRONMENT";
            else
                return "TEXTURE_COLOR";
        case "Normal":
            return "TEXTURE_NORMAL";
        case "Value":
            node_value = true;
            break;
        default:
            throw "Unknown texture output";
        }
    }
    if (node_value)
        if (bpy_node["texture"]["type"] == "ENVIRONMENT_MAP")
            return "TEXTURE_ENVIRONMENT";
        else
            return "TEXTURE_COLOR";
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

    // HACK: too many vertex shader constants issue
    if (cfg_def.shader_constants_hack && pval) {
        var param_names = [
            "param_MAPPING_HEAVY_trs_matrix",
            "param_MAPPING_LIGHT_min_clip",
            "param_MAPPING_LIGHT_max_clip",
            "param_MAPPING_HEAVY_use_min",
            "param_MAPPING_HEAVY_use_max"
        ]

        var replace_allowed = false;
        for (var i = 0; i < param_names.length; i++)
            if (name.indexOf(param_names[i]) >= 0) {
                replace_allowed = true;
                break;
            }
        if (replace_allowed)
            pval = replace_zero_unity_vals(pval);
    }

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
                        || input.identifier == "Value_001"))
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
        vparams: vparams
    }

    return elem;
}

function create_new_name(type, group_name, name) {
    if (type == "GROUP_INPUT")
        return group_name + "*GI*" + name;      // for search
    else if (type == "GROUP_OUTPUT")
        return group_name + "*GO*" + name;
    return group_name + "*" + name;
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

function get_value_node_anim_param(anim_data, bpy_node) {

    if (!anim_data)
        return null

    var action = anim_data["action"];
    if (action) {
        var act_params = action._render.params;
        for (var act_param in act_params) {
            // extract text between "[" and "]" which is exactly a node name
            var node_inside_anim = act_param.match(/"(.*?)"/ )[1];
            if (node_inside_anim == bpy_node["name"]) {
                return(action["name"] + "_" + act_param);
            }
        }
    }

    var nla_tracks = anim_data["nla_tracks"]
    for (var j = 0; j < nla_tracks.length; j++) {
        var nla_strips = nla_tracks[j]["strips"];
        for (var k = 0; k <nla_tracks[j]["strips"].length; k++) {
            var strip = nla_strips[k];
            var action = strip["action"];
            var act_params = action._render.params;
            for (var act_param in act_params) {
                // extract text between "[" and "]" which is exactly a node name
                var node_inside_anim = act_param.match(/"(.*?)"/ )[1];
                if (node_inside_anim == bpy_node["name"]) {
                    return(action["name"] + "_" + act_param);
                }
            }
        }
    }
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
