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
 * Low-level geometry API.
 * Enable the "Dynamic geometry" checkbox for the objects to allow geometry modification.
 * @module geometry
 */
b4w.module["geometry"] = function(exports, require) {

var m_batch  = require("__batch");
var m_geom   = require("__geometry");
var m_print  = require("__print");
var m_render = require("__renderer");
var m_util   = require("__util");

/**
 * Extract the vertex array from the object.
 * @method module:geometry.extract_vertex_array
 * @param {Object3D} obj Object 3D
 * @param {String} mat_name Material name
 * @param {String} attrib_name Attribute name (a_position, a_tbn_quat)
 * @returns {Float32Array|Int16Array|Uint8Array} Vertex array
 */
exports.extract_vertex_array = function(obj, mat_name, attrib_name) {

    if (!m_geom.has_dyn_geom(obj)) {
        m_print.error("Wrong object:", obj.name);
        return null;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch) {
        var bufs_data = batch.bufs_data;
        if (bufs_data && bufs_data.pointers
                && bufs_data.pointers[attrib_name]) {
            return m_geom.extract_array(bufs_data, attrib_name);
        } else {
            m_print.error("Attribute not found:" + attrib_name);
            return null;
        }
    } else {
        m_print.error("Wrong material:", mat_name);
        return null;
    }
}

/**
 * Extract the array of triangulated face indices from the given object.
 * @method module:geometry.extract_index_array
 * @param {Object3D} obj Object 3D
 * @param {String} mat_name Material name
 * @returns {Uint16Array|Uint32Array} Array of triangle indices
 */
exports.extract_index_array = function(obj, mat_name) {

    if (!m_geom.has_dyn_geom(obj)) {
        m_print.error("Wrong object:", obj.name);
        return null;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");

    if (batch) {
        var bufs_data = batch.bufs_data;
        if (bufs_data && bufs_data.pointers) {
            return bufs_data.ibo_array;
        } else {
            m_print.error("Buffer data not found");
            return null;
        }
    } else {
        m_print.error("Wrong material:", mat_name);
        return null;
    }
}

/**
 * Update the vertex array for the given object.
 * @method module:geometry.update_vertex_array
 * @param {Object3D} obj Object 3D
 * @param {String} mat_name Material name
 * @param {String} attrib_name Attribute name (a_position, a_tbn_quat)
 * @param {Float32Array|Int16Array|Uint8Array} array The new array
 */
exports.update_vertex_array = function(obj, mat_name, attrib_name, array) {
    if (!m_geom.has_dyn_geom(obj)) {
        m_print.error("Wrong object:", obj.name);
        return;
    }

    var vbo_type = m_geom.get_vbo_type_by_attr_name(attrib_name);
    var constructor = m_geom.get_constructor_by_type(vbo_type);

    if (constructor != array.constructor) {
        m_print.error("Wrong input array type '" + array.constructor.name 
                + "' for the given attribute. Should be '" + constructor.name + "'.");
        return;
    }

    var types = ["MAIN", "SHADOW", "COLOR_ID"];
    for (var i = 0; i < types.length; i++) {
        var type = types[i];

        var batch = m_batch.find_batch_material(obj, mat_name, type);

        if (batch) {
            var bufs_data = batch.bufs_data;

            if (bufs_data && bufs_data.pointers
                    && bufs_data.pointers[attrib_name])
                m_geom.update_bufs_data_array(bufs_data, attrib_name, 0, array);
        }
    }
}

/**
 * Override geometry for the given object.
 * @method module:geometry.override_geometry
 * @param {Object3D} obj Object 3D
 * @param {String} mat_name Material name
 * @param {Uint16Array|Uint32Array} ibo_array Array of triangle indices
 * @param {Float32Array} positions_array New vertex positions array
 * @param {Boolean} smooth_normals Enable normals smoothing
 */
exports.override_geometry = function(obj, mat_name, ibo_array,
                                        positions_array, smooth_normals) {
    if (!m_geom.has_dyn_geom(obj)) {
        m_print.error("Wrong object:", obj.name);
        return;
    }

    if (!(ibo_array instanceof Uint16Array) &&
        !(ibo_array instanceof Uint32Array)) {
            m_print.error("Wrong ibo_array type");
            return;
    }

    if (!(positions_array instanceof Float32Array)) {
        m_print.error("Wrong positions_array type");
        return;
    }

    var types = ["MAIN", "SHADOW", "COLOR_ID"];
    for (var i = 0; i < types.length; i++) {
        var type = types[i];
        var batch = m_batch.find_batch_material(obj, mat_name, type);

        if (batch) {
            var bufs_data = batch.bufs_data;

            if (bufs_data) {
                m_geom.update_bufs_data_index_array(bufs_data, batch.draw_mode,
                        ibo_array);

                var lengths = {};
                for (var attr in bufs_data.pointers) {
                    var pointer = bufs_data.pointers[attr];

                    var len = positions_array.length / 3 * pointer.num_comp;
                    var type = m_geom.get_vbo_type_by_attr_name(attr);

                    if (!lengths[type])
                        lengths[type] = 0;
                    lengths[type] += len;
                }

                var vbo_source_data = m_geom.init_vbo_source_data(lengths);
                bufs_data.vbo_source_data = vbo_source_data;

                var offsets = {}
                for (var attr in bufs_data.pointers) {
                    var pointer = bufs_data.pointers[attr];
                    var type = m_geom.get_vbo_type_by_attr_name(attr);

                    if (!offsets[type])
                        offsets[type] = 0;

                    switch (attr) {
                    case "a_position":
                        m_geom.vbo_source_data_set_attr(bufs_data.vbo_source_data, 
                                "a_position", positions_array, offsets[type]);
                        pointer.offset = offsets[type];
                        pointer.length = positions_array.length;
                        offsets[type] += pointer.length;
                        break;
                    case "a_tbn_quat":
                        var shared_indices;

                        if (smooth_normals)
                            shared_indices = m_geom.calc_shared_indices(
                                ibo_array, positions_array, positions_array);

                        var normals = m_geom.calc_normals(ibo_array,
                                      positions_array, shared_indices);

                        pointer.length = positions_array.length / 3 * pointer.num_comp;
                        var tangents = new Float32Array(pointer.length);

                        for (var j = 0; j < tangents.length; j +=4) {
                            tangents[j] = 1;
                            tangents[j + 3] = 1;
                        }

                        var tbn_quats = m_util.gen_tbn_quats(normals, tangents);
                        m_geom.vbo_source_data_set_attr(bufs_data.vbo_source_data, 
                                "a_tbn_quat", tbn_quats, offsets[type]);
                        pointer.offset = offsets[type];
                        offsets[type] += pointer.length;
                        break;
                    default:
                        pointer.offset = offsets[type];
                        pointer.length = positions_array.length / 3 * pointer.num_comp;

                        var constructor = m_geom.get_constructor_by_type(type);
                        var new_array = new constructor(pointer.length);
                        m_geom.vbo_source_data_set_attr(bufs_data.vbo_source_data, 
                                attr, new_array, offsets[type]);
                        offsets[type] += pointer.length;
                        break;
                    }
                }

                m_geom.update_gl_buffers(bufs_data);
                m_render.assign_attribute_setters(batch);

                // NOTE: process child batches if bufs_data was copied not by link
                var child_batch = m_batch.find_batch_material_forked(obj, batch);
                if (child_batch && child_batch.bufs_data)
                    child_batch.bufs_data = bufs_data;

            }
        }
    }
}
/**
 * Apply shape key to the object.
 * @method module:geometry.set_shape_key_value
 * @param {Object3D} obj Object 3D
 * @param {String} key_name Shape key name
 * @param {Number} value Shape key value
 */
exports.set_shape_key_value = function(obj, key_name, value) {
    if (!m_geom.check_shape_keys(obj)) {
        m_print.error("Wrong object:", obj.name);
        return;
    }

    if (!m_geom.has_shape_key(obj, key_name)) {
        m_print.error("Wrong key name:", key_name);
        return;
    }

    var float_value = parseFloat(value);

    m_geom.apply_shape_key(obj, key_name, float_value);
}
/**
 * Check if object has got shape keys.
 * @method module:geometry.check_shape_keys
 * @param {Object3D} obj Object 3D
 * @returns {Boolean} Checking result.
 */
exports.check_shape_keys = function(obj) {
    return m_geom.check_shape_keys(obj);
}
/**
 * Return all available shape keys names.
 * @method module:geometry.get_shape_keys_names
 * @param {Object3D} obj Object 3D
 * @returns {String[]} Array of animation names
 */
exports.get_shape_keys_names = function(obj) {

    if (!m_geom.check_shape_keys(obj)) {
        m_print.error("Wrong object:", obj.name);
        return null;
    }

    return m_geom.get_shape_keys_names(obj);
}
/**
 * Return shape key current value.
 * @method module:geometry.get_shape_key_value
 * @param {Object3D} obj Object 3D
 * @param {String} key_name Shape key name
 * @returns {Number} value Shape key value
 */
exports.get_shape_key_value = function(obj, key_name) {

    if (!m_geom.check_shape_keys(obj)) {
        m_print.error("Wrong object:", obj.name);
        return null;
    }

    if (!m_geom.has_shape_key(obj, key_name)) {
        m_print.error("Wrong key name:", key_name);
        return null;
    }

    return m_geom.get_shape_key_value(obj, key_name);
}

/**
 * Draw a line.
 * @method module:geometry.draw_line
 * @param {Object3D} obj Line object
 * @param {Float32Array} positions Line points [X0,Y0,Z0,X1,Y1,Z1...]
 * @param {Boolean} is_split True - draw a splitted line
 * (points specified in pairs), false - draw continuous line
 */
exports.draw_line = function(obj, positions, is_split) {
    is_split = is_split || false;

    if (!(positions instanceof Float32Array)) {
        m_print.error("Wrong positions type");
        return;
    }

    var batch = m_batch.get_first_batch(obj);

    if (batch) {
        m_geom.draw_line(batch, positions, is_split);
        m_render.assign_attribute_setters(batch);
    }
}

}
