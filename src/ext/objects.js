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
"use strict";

/**
 * Objects API.
 * <p>Additional topics in the User Manual: {@link
 * https://www.blend4web.com/doc/en/objects.html#object-transform-api|Object Transform API}, 
 * {@link https://www.blend4web.com/doc/en/objects.html#get-object-api|Get
 * Object API}, {@link
 * https://www.blend4web.com/doc/en/objects.html#object-selection|Object
 * Selection}, {@link
 * https://www.blend4web.com/doc/en/objects.html#copying-objects-instancing|Copying
 * Objects (Instancing)}
 * @module objects
 * @local ObjectMetaTags
 */
b4w.module["objects"] = function(exports, require) {

var m_geom     = require("__geometry");
var m_obj      = require("__objects");
var m_batch    = require("__batch");
var m_obj_util = require("__obj_util");
var m_print    = require("__print");
var m_scenes   = require("__scenes");
var m_util     = require("__util");

/**
 * @typedef {Object} ObjectMetaTags
 * @property {string} title The title meta tag.
 * @property {string} description The description meta tag.
 * @property {string} category The category meta tag.
 */

/**
 * Wind bending params.
 * @typedef {Object} WindBendingParams
 * @property {number} angle Angle of main wind bending in degrees
 * @property {number} main_frequency Frequency of main wind bending
 * @property {number} detail_frequency Frequency of detail wind bending
 * @property {number} detail_amplitude Amplitude of detail wind bending
 * @property {number} branch_amplitude Amplitude of branches wind bending
 * @cc_externs angle main_frequency detail_frequency
 * @cc_externs detail_amplitude branch_amplitude
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
 * Get the Blender-assigned custom property field from the object.
 * @method module:objects.get_custom_prop
 * @param {Object3D} obj Object 3D
 * @returns {*} Object custom property field
 */
exports.get_custom_prop = function(obj) {
    if (obj)
        return m_obj.get_custom_prop(obj);
}
/**
 * Copy MESH object.
 * @method module:objects.copy
 * @param {Object3D} obj Object 3D
 * @param {string} name New unique object name
 * @param {boolean} [deep_copy=false] Copy WebGL buffers
 * @returns {Object3D} New object.
 */
exports.copy = function(obj, name, deep_copy) {

    if (!m_obj_util.is_mesh(obj)) {
        m_print.error("object \"" + obj.name + "\" is not of type \"MESH\".");
        return false;
    }

    if (!m_obj_util.is_dynamic(obj)) {
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
 * @param {string[]} name_list List consisting of the material name, the names of
 * nested node groups (if any) and the name of the Value node itself. Should
 * have at least 2 elements ["Mat","Node"]
 * @param {number} value The value to set the Value node to
 * @deprecated Use {@link module:material.set_nodemat_value|material.set_nodemat_value} instead
 */
exports.set_nodemat_value = function(obj, name_list, value) {
    m_print.error_deprecated("set_nodemat_value", "material.set_nodemat_value");
    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("The type of the object \"" + obj.name +
            "\" is not \"MESH\" or it is not dynamic.");
        return;
    }

    var mat_name = name_list[0];
    var batch_main = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch_main === null) {
        m_print.error("Material \"" + mat_name +
                      "\" was not found in the object \"" + obj.name + "\".");
        return null;
    }

    var ind = m_obj.get_node_ind_by_name_list(batch_main.node_value_inds,
                                                name_list, 1);
    if (ind === null) {
        m_print.error("Value node \"" + name_list[name_list.length - 1] +
        "\" was not found in the object \"" + obj.name + "\".");
        return null;
    }

    m_obj.set_nodemat_value(obj, mat_name, ind, value)
}

/**
 * Get value of the Value node in the object's material.
 * @method module:objects.get_nodemat_value
 * @param {Object3D} obj Object 3D
 * @param {string[]} name_list List consisting of the material name, the names of
 * nested node groups (if any) and the name of the Value node itself. Should
 * have at least 2 elements ["Mat","Node"]
 * @returns {number} Value.
 * @deprecated Use {@link module:material.get_nodemat_value|material.get_nodemat_value} instead
 */
exports.get_nodemat_value = function(obj, name_list) {
    m_print.error_deprecated("get_nodemat_value", "material.get_nodemat_value");
    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("The type of the object \"" + obj.name +
            "\" is not \"MESH\" or it is not dynamic.");
        return 0;
    }

    var mat_name = name_list[0];
    var batch_main = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch_main === null) {
        m_print.error("Material \"" + mat_name +
                      "\" was not found in the object \"" + obj.name + "\".");
        return 0;
    }

    var ind = m_obj.get_node_ind_by_name_list(batch_main.node_value_inds,
                                                name_list, 1);
    if (ind === null) {
        m_print.error("Value node \"" + name_list[name_list.length - 1] +
        "\" was not found in the object \"" + obj.name + "\".");
        return 0;
    }

    return m_obj.get_nodemat_value(batch_main, ind);
}

/**
 * Set color of the RGB node in the object's material.
 * @method module:objects.set_nodemat_rgb
 * @param {Object3D} obj Object 3D
 * @param {string[]} name_list List consisting of the material name, the names of
 * nested node groups (if any) and the name of the RGB node itself
 * @param {number} r The value to set the red channel of the RGB node to [0..1]
 * @param {number} g The value to set the green channel of the RGB node to [0..1]
 * @param {number} b The value to set the blue channel of the RGB node to [0..1]
 * @deprecated Use {@link module:material.set_nodemat_rgb|material.set_nodemat_rgb} instead
 */
exports.set_nodemat_rgb = function(obj, name_list, r, g, b) {
    m_print.error_deprecated("set_nodemat_rgb", "material.set_nodemat_rgb");
    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("The type of the object \"" + obj.name +
            "\" is not \"MESH\" or it is not dynamic.");
        return;
    }

    var mat_name = name_list[0];
    var batch_main = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch_main === null) {
        m_print.error("Material \"" + mat_name +
                      "\" was not found in the object \"" + obj.name + "\".");
        return;
    }

    // node index is assumed to be similar for all batches with the same material
    var ind = m_obj.get_node_ind_by_name_list(batch_main.node_rgb_inds,
                                                name_list, 1);
    if (ind === null) {
        m_print.error("RGB node \"" + name_list[name_list.length - 1] +
                      "\" was not found in the object \"" + obj.name + "\".");
        return;
    }

    m_obj.set_nodemat_rgb(obj, mat_name, ind, r, g, b);
}

/**
 * Get color of the RGB node in the object's material.
 * @method module:objects.get_nodemat_rgb
 * @param {Object3D} obj Object 3D
 * @param {string[]} name_list List consisting of the material name, the names of
 * nested node groups (if any) and the name of the RGB node itself
 * @param {Vec3} [dest] Destination color
 * @returns {RGB} Destination color
 * @deprecated Use {@link module:material.get_nodemat_rgb|material.get_nodemat_rgb} instead
 */
exports.get_nodemat_rgb = function(obj, name_list, dest) {
    m_print.error_deprecated("get_nodemat_rgb", "material.get_nodemat_rgb");
    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("The type of the object \"" + obj.name +
            "\" is not \"MESH\" or it is not dynamic.");
        return null;
    }

    var mat_name = name_list[0];
    var batch_main = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch_main === null) {
        m_print.error("Material \"" + mat_name +
                      "\" was not found in the object \"" + obj.name + "\".");
        return null;
    }

    var ind = m_obj.get_node_ind_by_name_list(batch_main.node_rgb_inds,
                                                name_list);
    if (ind === null) {
        m_print.error("RGB node \"" + name_list[name_list.length - 1] +
                      "\" was not found in the object \"" + obj.name + "\".");
        return null;
    }

    if (!dest)
        dest = new Float32Array(3);

    return m_obj.get_nodemat_rgb(batch_main, ind, dest);
}

/**
 * Update object's boundings (box, cone, cylinder, ellipsoid, sphere, capsule).
 * @method module:objects.update_boundings
 * @param {Object3D} obj Object 3D
 */
exports.update_boundings = function(obj) {

    if (!m_obj_util.is_mesh(obj)) {
        m_print.error("The type of the object \"" + obj.name +
            "\" is not \"MESH\".");
        return;
    }

    if (!(m_geom.has_dyn_geom(obj) || m_geom.check_shape_keys(obj))) {
        m_print.error("object \"" + obj.name + "\" has not dynamic " 
                + "geometry.");
        return;
    }
    m_obj.update_boundings(obj);
}

/**
 * Get parent object.
 * @method module:objects.get_parent
 * @param {Object3D} obj Child object
 * @returns {?Object3D} Parent object
 */
exports.get_parent = m_obj_util.get_parent;

/**
 * Get DupliGroup parent object.
 * @method module:objects.get_dg_parent
 * @param {Object3D} obj Child object
 * @returns {?Object3D} Parent object
 */
exports.get_dg_parent = m_obj_util.get_dg_parent;

/**
 * Check if the object is a MESH.
 * @method module:objects.is_mesh
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 */
exports.is_mesh = m_obj_util.is_mesh;

/**
 * Check if the object is an ARMATURE.
 * @method module:objects.is_armature
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 */
exports.is_armature = m_obj_util.is_armature;

/**
 * Check if the object is a SPEAKER.
 * @method module:objects.is_speaker
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 */
exports.is_speaker = m_obj_util.is_speaker;

/**
 * Check if the object is a CAMERA.
 * @method module:objects.is_camera
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 */
exports.is_camera = m_obj_util.is_camera;

/**
 * Check if the object is a LAMP.
 * @method module:objects.is_lamp
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 */
exports.is_lamp = m_obj_util.is_lamp;

/**
 * Check if the object is an EMPTY.
 * @method module:objects.is_empty
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 */
exports.is_empty = m_obj_util.is_empty;

/**
 * Check if the object is a LINE.
 * @method module:objects.is_line
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 */
exports.is_line = m_obj_util.is_line;

/**
 * Check if the object is a WORLD.
 * @method module:objects.is_world
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 */
exports.is_world = m_obj_util.is_world;

/**
 * Get all scene selectable objects.
 * @method module:objects.get_selectable_objects
 * @returns {Object3D[]} Array with selectable objects.
 */
exports.get_selectable_objects = function() {

    return m_obj.get_selectable_objects();
}
/**
 * Get all scene outlining objects.
 * @method module:objects.get_outlining_objects
 * @returns {Object3D[]} Array with outlining objects.
 */
exports.get_outlining_objects = function() {

    return m_obj.get_outlining_objects();
}
/**
 * Check if object is dynamic.
 * @method module:objects.is_dynamic
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 */
exports.is_dynamic = m_obj_util.is_dynamic;

/**
 * Set object's wind bending parameters. Object must be dynamic.
 * @param {Object3D} obj Object 3D
 * @param {WindBendingParams} wb_params Wind Bending parameters
 * @example
 * var m_obj = require("objects");
 * var wb_params =
 * {
 *     angle: 45,
 *     main_frequency: 0.25,
 *     detail_frequency: 1,
 *     detail_amplitude: 0.1,
 *     branch_amplitude: 0.3
 * };
 * m_obj.set_wind_bending_params(obj, wb_params);
 */
exports.set_wind_bending_params = function(obj, wb_params) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("The type of the object \"" + obj.name +
            "\" is not \"MESH\" or it is not dynamic.");
        return;
    }

    var render = obj.render;
    if (!render.wind_bending) {
        m_print.error("The \"" + obj.name + "\" object " +
            "doesn't have wind bending parameters.");
        return;
    }

    if (typeof wb_params.angle == "number") {
        var amp = m_batch.wb_angle_to_amp(m_util.deg_to_rad(wb_params.angle), 
                render.bb_original, render.world_tsr[3]);
        render.wind_bending_amp = amp;
    }

    if (typeof wb_params.main_frequency == "number")
        render.wind_bending_freq = wb_params.main_frequency;

    if (typeof wb_params.detail_frequency == "number")
        render.detail_bending_freq = wb_params.detail_frequency;

    if (typeof wb_params.detail_amplitude == "number")
        render.detail_bending_amp = wb_params.detail_amplitude;

    if (typeof wb_params.branch_amplitude == "number")
        render.branch_bending_amp = wb_params.branch_amplitude;

    m_obj.set_hair_particles_wind_bend_params(obj);
}

/**
 * Get object's wind bending parameters. Object must be dynamic.
 * @param {Object3D} obj Object 3D
 * @returns {WindBendingParams} Wind Bending parameters
 */
exports.get_wind_bending_params = function(obj) {

    var render = obj.render;

    if (!render.wind_bending)
        return null;

    var wb_params = {};

    var angle = m_util.rad_to_deg(m_batch.wb_amp_to_angle(render.wind_bending_amp,
            render.bb_original, render.world_tsr[3]));

    wb_params.angle = angle;
    wb_params.main_frequency = render.wind_bending_freq;
    wb_params.detail_frequency = render.detail_bending_freq;
    wb_params.detail_amplitude = render.detail_bending_amp;
    wb_params.branch_amplitude = render.branch_bending_amp;

    return wb_params;
}

/**
 * Create line object
 * @param {string} name Line object name
 */
exports.create_line = function(name) {
    return m_obj.create_line(name);
}

}
