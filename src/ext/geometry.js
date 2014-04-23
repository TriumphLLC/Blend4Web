"use strict";

/** 
 * Geometry external API. 
 * Assign "Dynamic geometry" option on objects to allow geometry modification.
 * @module geometry
 */
b4w.module["geometry"] = function(exports, require) {

var m_batch = require("__batch");
var m_geom  = require("__geometry");
var m_print = require("__print");

/**
 * Extract vertex array from object.
 * @method module:geometry.extract_vertex_array
 * @param obj Object ID 
 * @param {String} mat_name Material name
 * @param {String} attrib_name Attribute name (a_position, a_normal, a_tangent)
 */
exports["extract_vertex_array"] = function(obj, mat_name, attrib_name) {

    if (!has_dyn_geom(obj)) {
        m_print.error("Wrong object:", obj["name"]);
        return null;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN") ||
            m_batch.find_batch_material(obj, mat_name, "NODES") ||
            m_batch.find_batch_material(obj, mat_name, "SHADELESS");
    if (batch) {
        var bufs_data = batch.bufs_data;
        if (bufs_data && bufs_data.pointers && bufs_data.pointers[attrib_name]) {
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

function has_dyn_geom(obj) {
    if (obj && obj._render && obj._render.dynamic_geometry)
        return true;
    else
        return false;
}

/**
 * Extract array of triangulated face indices from given object.
 * @method module:geometry.extract_index_array
 * @param obj Object ID 
 * @param {String} mat_name Material name
 */
exports["extract_index_array"] = function(obj, mat_name) {

    if (!has_dyn_geom(obj)) {
        m_print.error("Wrong object:", obj["name"]);
        return null;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN") ||
            m_batch.find_batch_material(obj, mat_name, "NODES") ||
            m_batch.find_batch_material(obj, mat_name, "SHADELESS");

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
 * Update vertex array for given object.
 * @method module:geometry.update_vertex_array
 * @param obj Object ID 
 * @param {String} mat_name Material name
 * @param {String} attrib_name Attribute name (a_position, a_normal, a_tangent)
 * @param {Float32Array} array Modified array
 */
exports["update_vertex_array"] = function(obj, mat_name, attrib_name, array) {
    var types = ["MAIN", "NODES", "SHADELESS", "DEPTH", "COLOR_ID"];

    if (!has_dyn_geom(obj)) {
        m_print.error("Wrong object:", obj["name"]);
        return;
    }

    for (var i = 0; i < types.length; i++) {
        var type = types[i];

        var batch = m_batch.find_batch_material(obj, mat_name, type);
        if (batch) {
            var bufs_data = batch.bufs_data;

            if (bufs_data && bufs_data.pointers && bufs_data.pointers[attrib_name]) {
                m_geom.update_bufs_data_array(bufs_data, attrib_name, 0, array);

                // inherit textures for forked batches (currently for depth, 
                // glow_mask and reflect subscenes)
                if (batch.childs)
                    for (var j = 0; j < batch.childs.length; j++) {
                        var child_batch = batch.childs[j];
                        var child_bufs_data = child_batch.bufs_data;
                        if (child_bufs_data && child_bufs_data.pointers &&
                                child_bufs_data.pointers[attrib_name])
                            m_geom.update_bufs_data_array(child_bufs_data, attrib_name, 0, array);
                    }
            }
        }
    }
}

}
