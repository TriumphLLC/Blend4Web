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
import register from "../../util/register.js";

import m_graph_fact from "../graph.js";

function DebugNodegraph(ns, exports) {

var m_graph = m_graph_fact(ns);

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
                        + attr.data.value.img_filepath + ")";
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

}

var debug_nodegraph_fact = register("__debug_nodegraph", DebugNodegraph);

export default debug_nodegraph_fact;