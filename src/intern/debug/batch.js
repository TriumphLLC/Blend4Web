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

import m_batch_fact from "../batch.js";
import m_print_fact from "../print.js";
import m_obj_fact from "../objects.js";
import m_scenes_fact from "../scenes.js";
import * as m_util from "../util.js";

function DebugBatch(ns, exports) {

var m_batch  = m_batch_fact(ns);
var m_print  = m_print_fact(ns);
var m_obj    = m_obj_fact(ns);
var m_scenes = m_scenes_fact(ns);

exports.print_batches_stat = function() {
    var batches_props = {};
    
    // properties that don't affect batching
    var excluded_props = [
        "bounds_local", "bufs_data", "id", "attribute_setters", "num_vertices", 
        "num_triangles", "material_names", "shader", "bpy_tex_names"
    ];

    var static_count = 0;
    var dynamic_count = 0;

    var objs = m_obj.get_scene_objs(m_scenes.get_main(), "MESH", m_obj.DATA_ID_ALL);
    for (var i = 0; i < objs.length; i++) {
        for (var j = 0; j < objs[i].scenes_data.length; j++)
            for (var k = 0; k < objs[i].scenes_data[j].batches.length; k++) {

                var batch = m_batch.clone_batch(objs[i].scenes_data[j].batches[k]);
                
                var shader_pair = batch.shaders_info.vert + "/" + batch.shaders_info.frag;
                batch["shaders_info.directives"] = batch.shaders_info.directives;
                batch["shaders_info.node_elements"] = batch.shaders_info.node_elements;
                delete batch.shaders_info;
                for (var l = 0; l < excluded_props.length; l++)
                    delete batch[excluded_props[l]];

                if (objs[i].is_dynamic) {
                    dynamic_count++;
                    continue;
                } else
                    static_count++;

                if (!(batch.type in batches_props))
                    batches_props[batch.type] = {}

                if (!(shader_pair in batches_props[batch.type]))
                    batches_props[batch.type][shader_pair] = {}

                for (var prop in batch) {
                    if (!(prop in batches_props[batch.type][shader_pair]))
                        batches_props[batch.type][shader_pair][prop] = {};

                    var str_val = JSON.stringify(batch[prop]);

                    if (!(str_val in batches_props[batch.type][shader_pair][prop]))
                        batches_props[batch.type][shader_pair][prop][str_val] = 0;

                    batches_props[batch.type][shader_pair][prop][str_val]++;
                }
            }
    }

    m_print.group("Batches statistics:");
    m_print.log_raw("STATIC/DYNAMIC count:", static_count + "/" + dynamic_count);
    m_print.group("STATIC batches diversity:");

    for (var type in batches_props)
        for (var shader_pair in batches_props[type])
            print_batches_stat_props(batches_props[type][shader_pair], type, shader_pair);

    m_print.groupEnd();
    m_print.groupEnd();
}

function print_batches_stat_props(props_dict, type, shader_pair) {
    var props_array = [];
    for (var prop in props_dict)
        if (m_util.get_dict_length(props_dict[prop]) > 1)
            props_array.push([prop, props_dict[prop]])

    props_array.sort(function(a, b) {
        var a_len = m_util.get_dict_length(a[1]);
        var b_len = m_util.get_dict_length(b[1]);
        if (b_len != a_len)
            return b_len - a_len;
        return a < b ? -1 : b < a ? 1 : 0;
    });

    if (props_array.length) {
        m_print.groupCollapsed(type + " " + shader_pair);
        m_print.log_raw("Property different variants (>1) | Property name");
        for (var i = 0; i < props_array.length; i++) {
            m_print.groupCollapsed(m_util.get_dict_length(props_array[i][1]), props_array[i][0]);
            print_batches_stat_props_values(props_array[i][1]);
        }
        m_print.groupEnd();
    }
}

function print_batches_stat_props_values(values_dict) {
    m_print.log_raw("Batches count for this property value | Property value");

    var values_array = [];
    for (var value in values_dict)
        values_array.push([value, values_dict[value]]);

    values_array.sort(function(a, b) {
        if (b[1] != a[1])
            return b[1] - a[1];
        return a[0] < b[0] ? -1 : b[0] < a[0] ? 1 : 0;
    });

    for (var j = 0; j < values_array.length; j++)
        m_print.log_raw(values_array[j][1], values_array[j][0]);
    m_print.groupEnd();
}

}

var debug_batch_fact = register("__debug_batch", DebugBatch);

export default debug_batch_fact;