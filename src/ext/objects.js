"use strict";

/**
 * Objects API.
 * @module objects
 * @local ObjectMetaTags
 */
b4w.module["objects"] = function(exports, require) {

var m_geom    = require("__geometry");
var m_obj     = require("__objects");
var m_objutil = require("__obj_util");
var m_print   = require("__print");
var m_scenes  = require("__scenes");
var m_util    = require("__util");

/**
 * @typedef ObjectMetaTags
 * @type {Object3D}
 * @property {String} title The title meta tag.
 * @property {String} description The description meta tag.
 * @property {String} category The category meta tag.
 */

/**
 * Get the Blender-assigned meta tags from the object.
 * @method module:objects.get_meta_tags
 * @param {Object3D} obj Object 3D
 * @returns {ObjectMetaTags} Object meta tags
 * @cc_externs title description category
 */
exports.get_meta_tags = function(obj) {
    if (obj)
        return m_obj.get_meta_tags(obj);
}
/**
 * Copy MESH object.
 * @method module:objects.copy
 * @param {Object3D} obj Object 3D
 * @param {String} new_name New unique object name
 * @param {Boolean} [deep_copy=false] Copy WebGL buffers
 * @returns {Object3D} New object.
 */
exports.copy = function(obj, name, deep_copy) {

    if (!m_util.is_mesh(obj)) {
        m_print.error("object \"" + obj.name + "\" is not of type \"MESH\".");
        return false;
    }

    if (!m_objutil.is_dynamic(obj)) {
        m_print.error("object \"" + obj.name + "\" is not dynamic.");
        return false;
    }
    if (!(m_geom.has_dyn_geom(obj) || m_geom.check_shape_keys(obj)) && deep_copy) {
        m_print.error("object \"" + obj.name + "\" has not dynamic " 
                + "geometry for deep copying.");
        return false;
    }
    // HACK: a temporary (provisional) solution
    var objs = m_obj.get_scene_objs(m_scenes.get_active(), "MESH", m_obj.DATA_ID_ALL);
    if (objs.indexOf(obj) == - 1) {
        m_print.error("object \"" + obj.name + "\" does not belong to the " 
                + "active scene.");
        return false;
    }
    name = name || "";
    return m_obj.copy(obj, name, deep_copy);
}

/**
 * Set value of the Value node in the object's material.
 * @method module:objects.set_nodemat_value
 * @param {Object3D} obj Object 3D
 * @param {String[]} name_list List consisting of the material name, the names of
 * nested node groups (if any) and the name of the Value node itself
 * @param {Number} value The value to set the Value node to
 */
exports.set_nodemat_value = function(obj, name_list, value) {

    if (!m_util.is_mesh(obj)) {
        m_print.error("The type of the object \"" + obj.name +
            "\" is not \"MESH\".");
        return null;
    }

    var node_id = name_list.join("%join%");
    var ind = m_obj.get_value_node_ind_by_id(obj, node_id);
    if (ind != null)
        obj.render.mats_values[ind] = value;
    else
        m_print.error("The Value node \"" + node_id +
            "\" was not found in the object \"" + obj.name + "\".");
}

/**
 * Set color of the RGB node in the object's material.
 * @method module:objects.set_nodemat_rgb
 * @param {Object3D} obj Object 3D
 * @param {String[]} name_list List consisting of the material name, the names of
 * nested node groups (if any) and the name of the RGB node itself
 * @param {Number} r The value to set the red channel of the RGB node to
 * @param {Number} g The value to set the green channel of the RGB node to
 * @param {Number} b The value to set the blue channel of the RGB node to
 */
exports.set_nodemat_rgb = function(obj, name_list, r, g, b) {

    if (!m_util.is_mesh(obj)) {
        m_print.error("The type of the object \"" + obj.name +
            "\" is not \"MESH\".");
        return null;
    }

    var node_id = name_list.join("%join%");
    var ind = m_obj.get_rgb_node_ind_by_id(obj, node_id);
    if (ind != null) {
        obj.render.mats_rgbs[3 * ind]     = r;
        obj.render.mats_rgbs[3 * ind + 1] = g;
        obj.render.mats_rgbs[3 * ind + 2] = b;
    } else {
        m_print.error("The RGB node \"" + node_id +
            "\" was not found in the object \"" + obj.name + "\".");
    }
}
/**
 * Update object's boundings (box, cone, cylinder, ellipsoid, sphere, capsule).
 * @method module:objects.update_boundings
 * @param {Object3D} obj Object 3D
 */
exports.update_boundings = function(obj) {

    if (!m_util.is_mesh(obj)) {
        m_print.error("The type of the object \"" + obj.name +
            "\" is not \"MESH\".");
        return false;
    }

    if (!(m_geom.has_dyn_geom(obj) || m_geom.check_shape_keys(obj))) {
        m_print.error("object \"" + obj.name + "\" has not dynamic " 
                + "geometry.");
        return false;
    }
    m_obj.update_boundings(obj);
}

/**
 * Get parent object.
 * @method module:objects.get_parent
 * @param {Object3D} obj Child object
 * @returns {?Object3D} Parent object
 */
exports.get_parent = m_obj.get_parent;

/**
 * Get DupliGroup parent object.
 * @method module:objects.get_dg_parent
 * @param {Object3D} obj Child object
 * @returns {?Object3D} Parent object
 */
exports.get_dg_parent = m_obj.get_dg_parent;

}
