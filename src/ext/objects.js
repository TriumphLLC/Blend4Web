"use strict";

/**
 * Objects API.
 * @module objects
 */
b4w.module["objects"] = function(exports, require) {

var m_obj    = require("__objects");
var m_print  = require("__print");
var m_util   = require("__util");
var m_scenes = require("__scenes");
/**
 * @typedef ObjectMetaTags
 * @type {Object}
 * @property {String} title The title meta tag.
 * @property {String} description The description meta tag.
 * @property {String} category The category meta tag.
 */

/**
 * Get the Blender-assigned meta tags from the object.
 * @method module:objects.get_meta_tags
 * @returns {ObjectMetaTags} Object meta tags
 * @cc_externs title description category
 */
exports.get_meta_tags = function(obj) {
    if (obj && obj["b4w_object_tags"])
        return m_obj.get_meta_tags(obj);
}
/**
 * Copy MESH object.
 * @method module:objects.copy
 * @param {Object} obj Object ID
 * @param {String} new_name New unique object name
 * @param {Boolean} [deep_copy=false] Copy WebGL buffers
 * @returns {Object} New object ID
 */
exports.copy = function(obj, name, deep_copy) {

    if (!m_util.is_mesh(obj)) {
        m_print.error("object \"" + obj["name"] + "\" is not of type \"MESH\".");
        return false;
    }
    if (obj._is_meta) {
        m_print.error("object \"" + obj["name"] + "\" is meta-object.");
        return false;
    }
    if (!m_obj.is_dynamic(obj)) {
        m_print.error("object \"" + obj["name"] + "\" is not dynamic.");
        return false;
    }
    if (!m_obj.obj_has_dynamic_geometry(obj) && deep_copy) {
        m_print.error("object \"" + obj["name"] + "\" has not dynamic " 
                + "geometry for deep copying.");
        return false;
    }
    // HACK: a temporary (provisional) solution
    var objs = m_scenes.get_scene_objs(m_scenes.get_active(), "MESH", m_scenes.DATA_ID_ALL);
    if (objs.indexOf(obj) == - 1) {
        m_print.error("object \"" + obj["name"] + "\" does not belong to the " 
                + "active scene.");
        return false;
    }
    name = name || "";
    return m_obj.copy(obj, name, deep_copy);
}
/**
 * Set object's material node value.
 * @method module:objects.set_nodemat_value
 * @param {Object} obj Object ID
 * @param {Array} name_list List of material, nested node groups, and value node
 */
exports.set_nodemat_value = function(obj, name_list, value) {
    if (!m_util.is_mesh(obj)) {
        m_print.error("object \"" + obj["name"] + "\" is not of type \"MESH\".");
        return null;
    }
    var node_id = name_list.join("%join%");
    var ind = m_obj.get_value_node_ind_by_id(obj, node_id);
    if (ind != null)
        obj._render.mats_values[ind] = value;
    else
        m_print.error("value \"" + node_id + "\" was not found in \"" + obj["name"] + "\" object.");
}
/**
 * Set object's material node rgb.
 * @method module:objects.set_nodemat_rgb
 * @param {Object} obj Object ID
 * @param {Array} name_list List of material, nested node groups, and rgb node
 * @param {Number} r R channel value
 * @param {Number} g G channel value
 * @param {Number} b B channel value
 */
exports.set_nodemat_rgb = function(obj, name_list, r, g, b) {
    if (!m_util.is_mesh(obj)) {
        m_print.error("object \"" + obj["name"] + "\" is not of type \"MESH\".");
        return null;
    }
    var node_id = name_list.join("%join%");
    var ind = m_obj.get_rgb_node_ind_by_id(obj, node_id);
    if (ind != null) {
        obj._render.mats_rgbs[ind] = r;
        obj._render.mats_rgbs[ind + 1] = g;
        obj._render.mats_rgbs[ind + 2] = b;
    } else
        m_print.error("rgb \"" + node_id + "\" was not found in \"" + obj["name"] + "\" object.");
}
}
