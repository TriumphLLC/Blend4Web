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
 * Material API.
 * Contains methods to control parameters of materials.
 * @module material
 * @local LineParams
 * @local MaterialExtParams
 * @local WaterMaterialParams
 */
b4w.module["material"] = function(exports, require) {

var m_batch    = require("__batch");
var m_cfg      = require("__config");
var m_geom     = require("__geometry");
var m_obj      = require("__objects");
var m_obj_util = require("__obj_util");
var m_print    = require("__print");
var m_shaders  = require("__shaders");
var m_util     = require("__util");
var m_scenes   = require("__scenes");

var cfg_def = m_cfg.defaults;

/**
 * Line params.
 * @typedef {Object} LineParams
 * @property {RGBA} [color] Line diffuse color
 * @property {number} [width] Line width in pixels
 * @cc_externs color width
 */

/**
 * Additional group of parameters for a non-node material.
 * @typedef {Object} MaterialExtParams
 * @property {number} [fresnel] Power of Fresnel for mirror reflection.
 * @property {number} [fresnel_factor] Blending factor for Fresnel.
 * @property {number} [parallax_scale] Scale parameter for texture wrapping. 
 * Available if the parallax effect is enabled on the material's normal map texture.
 * @property {number} [parallax_steps] Number of steps taken to build a parallax surface.
 * Available if the parallax effect is enabled on the material's normal map texture.
 * @property {number} [reflect_factor] Amount of mirror reflection.
 * @cc_externs fresnel fresnel_factor parallax_scale parallax_steps reflect_factor
 */

/**
 * Parameters for a water material.
 * @typedef {Object} WaterMaterialParams
 * @property {boolean} [shore_smoothing] Perform the smoothing between the water 
 * and the shore objects. Can be used only for Add, Alpha Blend and Alpha Sort 
 * materials.
 * @property {number} [absorb_factor] Water absorb factor. Used only if the 
 * "shore_smoothing" parameter is true for this material.
 * @property {number} [foam_factor] Water foam intensity factor. Can be used if 
 * there is a foam texture in this material.
 * @property {RGB} [shallow_water_col] Color of the shallow water.
 * @property {RGB} [shore_water_col] Color of the shore water.
 * @property {number} [shallow_water_col_fac] Shallow water color factor.
 * @property {number} [shore_water_col_fac] Shore water color factor.
 * @property {number} [norm_uv_velocity] Water normalmap UV velocity. Can be used 
 * if there is a normalmap texture in this material.
 * @property {boolean} [water_dynamic] Dynamic water surface. If disabled in the 
 * blend-file, then this option cannot be enabled via API.
 * @property {number} [sss_strength] Strength of subsurface scattering. Used if 
 * the "water_dynamic" parameter is true.
 * @property {number} [sss_width] Width of subsurface scattering. Used if the 
 * "water_dynamic" parameter is true.
 * @property {number} [waves_height] Waves height. Used if the "water_dynamic" 
 * parameter is true.
 * @property {number} [waves_length] Waves length. Used if the "water_dynamic" 
 * parameter is true.
 * @property {number} [dst_noise_scale0] Distant waves noise scale (first 
 * component). Used if the "water_dynamic" parameter is true.
 * @property {number} [dst_noise_scale1] Distant waves noise scale (second 
 * component). Used if the "water_dynamic" parameter is true.
 * @property {number} [dst_noise_freq0] Distant waves noise frequency (first 
 * component). Used if the "water_dynamic" parameter is true.
 * @property {number} [dst_noise_freq1] Distant waves noise frequency (second 
 * component). Used if the "water_dynamic" parameter is true.
 * @property {number} [dir_min_shore_fac] Minimum shore factor for directional 
 * waves. Used if the "water_dynamic" parameter is true.
 * @property {number} [dir_freq] Directional waves frequency. Used if the 
 * "water_dynamic" parameter is true.
 * @property {number} [dir_noise_scale] Directional waves noise scale. Used if the 
 * "water_dynamic" parameter is true.
 * @property {number} [dir_noise_freq] Directional waves noise frequency. Used if 
 * the"water_dynamic" parameter is true.
 * @property {number} [dir_min_noise_fac] Directional waves minimum noise factor. 
 * Used if the "water_dynamic" parameter is true.
 * @property {number} [dst_min_fac] Distant waves min factor. Used if the
 * "water_dynamic" parameter is true.
 * @property {number} [waves_hor_fac] Strength of horizontal waves inclination. 
 * Used if the "water_dynamic" parameter is true.
 * @cc_externs shore_smoothing absorb_factor foam_factor shallow_water_col 
 * @cc_externs shore_water_col shallow_water_col_fac shore_water_col_fac 
 * @cc_externs sss_strength sss_width norm_uv_velocity water_dynamic 
 * @cc_externs waves_height waves_length dst_noise_scale0 dst_noise_scale1 
 * @cc_externs dst_noise_freq0 dst_noise_freq1 dir_min_shore_fac dir_freq 
 * @cc_externs dir_noise_scale dir_noise_freq dir_min_noise_fac dst_min_fac 
 * @cc_externs waves_hor_fac 
 */

/**
 * Inherit the batch material from another object.
 * @method module:material.inherit_material
 * @param {Object3D} obj_from Source Object 3D
 * @param {string} mat_from_name Source material name
 * @param {Object3D} obj_to Destination Object 3D
 * @param {string} mat_to_name Destination material name
 * @example 
 * var m_mat = require("material");
 * var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var cube_001 = m_scenes.get_object_by_name("Cube.001");
 * m_mat.inherit_material(cube, "MyMaterial_1", cube_001, "MyMaterial_2");
 */
exports.inherit_material = function(obj_from, mat_from_name, obj_to, mat_to_name) {
    if (!m_geom.has_dyn_geom(obj_to) || !m_geom.has_dyn_geom(obj_from)) {
        m_print.error("inherit_material(): both objects \"" 
                + obj_from.origin_name + "\" and \"" + obj_to.origin_name 
                + "\" must have the \"Dynamic Geometry & Materials\" flag enabled.");
        return;
    }

    var bpy_mat_from_index = obj_from.mat_inheritance_data.original_mat_names.indexOf(mat_from_name);
    if (bpy_mat_from_index == -1) {
        m_print.error("inherit_material(): material \"" + mat_from_name 
                + "\" not found on the object \"" + obj_from.origin_name + "\".");
        return;   
    }

    var bpy_mat_to_index = obj_to.mat_inheritance_data.original_mat_names.indexOf(mat_to_name);
    if (bpy_mat_to_index == -1) {
        m_print.error("inherit_material(): material \"" + mat_to_name 
                + "\" not found on the object \"" + obj_to.origin_name + "\".");
        return;   
    }

    if (obj_to._bpy_obj["data"]["submeshes"][bpy_mat_to_index]["shade_tangs"].length == 0 
            && obj_from.mat_inheritance_data.bpy_materials[bpy_mat_from_index]["use_tangent_shading"]) {
        m_print.warn("The target material \"" + mat_to_name + "\" was exported " 
                + "without tangent shading data. However, the \"" + mat_from_name 
                + "\" material requires it. It's needed to enable the \"Tangent Shading\" " 
                + "option on the target material for correct rendering.");
    }

    m_obj.inherit_material(obj_from, mat_from_name, obj_to, mat_to_name);
}

/**
 * Get materials' names for the given object.
 * @method module:material.get_materials_names
 * @param {Object3D} obj Object 3D
 * @returns {string[]} Array of materials' names
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var material_list = m_mat.get_materials_names(cube);
 */
exports.get_materials_names = function(obj) {

    var mat_names = [];

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("get_materials_names(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return mat_names;
    }

    var scenes_data = obj.scenes_data;
    for (var i = 0; i < scenes_data.length; i++) {
        var batches = scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++)
            for (var k = 0; k < batches[j].material_names.length; k++)
                if (mat_names.indexOf(batches[j].material_names[k]) == -1)
                    mat_names.push(batches[j].material_names[k]);
    }

    return mat_names;
}

/**
 * Set the diffuse color and alpha for the object non-node material.
 * @method module:material.set_diffuse_color
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @param {RGBA} color Color+alpha vector
 * @example 
 * var m_mat = require("material");
 * var m_scenes = require("scenes");
 * var m_rgba = require("rgba");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * m_mat.set_diffuse_color(cube, "MyMaterial", m_rgba.from_values(1.0, 0.0, 0.0, 1.0));
 */
exports.set_diffuse_color = function(obj, mat_name, color) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("set_diffuse_color(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("set_diffuse_color(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return;
    }

    if (batch.has_nodes) {
        m_print.error("set_diffuse_color(): Not allowed for node materials! " 
                + "Use set_nodemat_value/set_nodemat_rgb methods instead.");
        return;
    }

    batch.diffuse_color.set(color);
    var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
    if (reflect_batch)
        reflect_batch.diffuse_color.set(color);
}

/**
 * Get the diffuse color and alpha for the object non-node material.
 * @method module:material.get_diffuse_color
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @returns {RGBA} Material diffuse color+alpha
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var diffuse_color = m_mat.get_diffuse_color(cube, "MyMaterial");
 */
exports.get_diffuse_color = function(obj, mat_name) {

    var color = new Float32Array(4);

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("get_diffuse_color(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return color;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("get_diffuse_color(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return color;
    }

    if (batch.has_nodes) {
        m_print.error("get_diffuse_color(): Not allowed for node materials! " 
                + "Use get_nodemat_value/get_nodemat_rgb methods instead.");
        return color;
    }

    color.set(batch.diffuse_color);
    return color;
}

/**
 * Set the diffuse color intensity for the object non-node material.
 * @method module:material.set_diffuse_intensity
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @param {number} intensity Diffuse intensity value
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * m_mat.set_diffuse_intensity(cube, "MyMaterial", 0.5);
 */
exports.set_diffuse_intensity = function(obj, mat_name, intensity) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("set_diffuse_intensity(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("set_diffuse_intensity(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return;
    }

    if (batch.has_nodes) {
        m_print.error("set_diffuse_intensity(): Not allowed for node materials! " 
                + "Use set_nodemat_value/set_nodemat_rgb methods instead.");
        return;
    }

    batch.diffuse_intensity = intensity;
    var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
    if (reflect_batch)
        reflect_batch.diffuse_intensity = intensity;
}

/**
 * Get the diffuse color intensity for the object non-node material.
 * @method module:material.get_diffuse_intensity
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @returns {number} Diffuse intensity value
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var diffuse_intensity = m_mat.get_diffuse_intensity(cube, "MyMaterial");
 */
exports.get_diffuse_intensity = function(obj, mat_name) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("get_diffuse_intensity(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return 0;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("get_diffuse_intensity(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return 0;
    }

    if (batch.has_nodes) {
        m_print.error("get_diffuse_intensity(): Not allowed for node materials! " 
                + "Use get_nodemat_value/get_nodemat_rgb methods instead.");
        return 0;
    }

    return batch.diffuse_intensity;
}

/**
 * Set the specular color for the object non-node material.
 * @method module:material.set_specular_color
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @param {RGB} color Color vector
 * @example 
 * var m_mat = require("material");
 * var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * m_mat.set_specular_color(cube, "MyMaterial", [0, 0.8, 0]);
 */
exports.set_specular_color = function(obj, mat_name, color) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("set_specular_color(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("set_specular_color(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return;
    }

    if (batch.has_nodes) {
        m_print.error("set_specular_color(): Not allowed for node materials! " 
                + "Use set_nodemat_value/set_nodemat_rgb methods instead.");
        return;
    }

    batch.specular_color.set(color);
    var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
    if (reflect_batch)
        reflect_batch.specular_color.set(color);
}

/**
 * Get the specular color for the object non-node material.
 * @method module:material.get_specular_color
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @returns {RGB} Specular color
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var specular_color = m_mat.get_specular_color(cube, "MyMaterial");
 */
exports.get_specular_color = function(obj, mat_name) {

    var color = new Float32Array(3);

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("get_specular_color(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return color;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("get_specular_color(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return color;
    }

    if (batch.has_nodes) {
        m_print.error("get_specular_color(): Not allowed for node materials! " 
                + "Use get_nodemat_value/get_nodemat_rgb methods instead.");
        return color;
    }

    color.set(batch.specular_color);
    return color;
}

/**
 * Set the specular color factor for the object non-node material.
 * @method module:material.set_specular_color_factor
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @param {number} factor Specular color factor
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * m_mat.set_specular_color_factor(cube, "MyMaterial", 0.8);
 */
exports.set_specular_color_factor = function(obj, mat_name, factor) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("set_specular_color_factor(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("set_specular_color_factor(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return;
    }

    if (batch.has_nodes) {
        m_print.error("set_specular_color_factor(): Not allowed for node materials! " 
                + "Use set_nodemat_value/set_nodemat_rgb methods instead.");
        return;
    }

    batch.specular_color_factor = factor;
    var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
    if (reflect_batch)
        reflect_batch.specular_color_factor = factor;
}

/**
 * Get the specular color factor for the object non-node material.
 * @method module:material.get_specular_color_factor
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @returns {number} Specular color factor
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var specular_color_factor = m_mat.get_specular_color_factor(cube, "MyMaterial");
 */
exports.get_specular_color_factor = function(obj, mat_name) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("get_specular_color_factor(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return 0;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("get_specular_color_factor(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return 0;
    }

    if (batch.has_nodes) {
        m_print.error("get_specular_color_factor(): Not allowed for node materials! " 
                + "Use get_nodemat_value/get_nodemat_rgb methods instead.");
        return 0;
    }

    return batch.specular_color_factor;
}

/**
 * Set the specular color intensity for the object non-node material.
 * @method module:material.set_specular_intensity
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @param {number} intensity Specular intensity value
 * @example 
 * var m_mat = require("material");
 * var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * m_mat.set_specular_intensity(cube, "MyMaterial", 0.7);
 */
exports.set_specular_intensity = function(obj, mat_name, intensity) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("set_specular_intensity(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("set_specular_intensity(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return;
    }

    if (batch.has_nodes) {
        m_print.error("set_specular_intensity(): Not allowed for node materials! " 
                + "Use set_nodemat_value/set_nodemat_rgb methods instead.");
        return;
    }

    batch.specular_params[0] = intensity;
    var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
    if (reflect_batch)
        reflect_batch.specular_params[0] = intensity;
}

/**
 * Get the specular color intensity for the object non-node material.
 * @method module:material.get_specular_intensity
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @returns {number} Specular color intensity
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var specular_intensity = m_mat.get_specular_intensity(cube, "MyMaterial");
 */
exports.get_specular_intensity = function(obj, mat_name) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("get_specular_intensity(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return 0;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("get_specular_intensity(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return 0;
    }

    if (batch.has_nodes) {
        m_print.error("get_specular_intensity(): Not allowed for node materials! " 
                + "Use get_nodemat_value/get_nodemat_rgb methods instead.");
        return 0;
    }

    return batch.specular_params[0];
}

/**
 * Check the specular intensity for the object material.
 * @method module:material.check_specular_intensity
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @returns {boolean} Specular intensity presence
 * @deprecated [17.06] not needed anymore.
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var has_specular_intensity = m_mat.check_specular_intensity(cube, "MyMaterial");
 */
exports.check_specular_intensity = function(obj, mat_name) {
    m_print.error_once("check_specular_intensity() is deprecated, not needed anymore");

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    return Boolean(batch && batch.specular_params[0]);
}

/**
 * Set the specular color hardness for the object non-node material.
 * @method module:material.set_specular_hardness
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @param {number} hardness Specular hardness value
 * @example 
 * var m_mat = require("material");
 * var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * m_mat.set_specular_hardness(cube, "MyMaterial", 0.8);
 */
exports.set_specular_hardness = function(obj, mat_name, hardness) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("set_specular_hardness(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("set_specular_hardness(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return;
    }

    if (batch.has_nodes) {
        m_print.error("set_specular_hardness(): Not allowed for node materials! " 
                + "Use set_nodemat_value/set_nodemat_rgb methods instead.");
        return;
    }

    batch.specular_params[1] = hardness;
    var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
    if (reflect_batch)
        reflect_batch.specular_params[1] = hardness;
}

/**
 * Get the specular color hardness for the object non-node material.
 * @method module:material.get_specular_hardness
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @returns {number} Specular color hardness
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var specular_hardness = m_mat.get_specular_hardness(cube, "MyMaterial");
 */
exports.get_specular_hardness = function(obj, mat_name) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("get_specular_hardness(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return 0;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("get_specular_hardness(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return 0;
    }

    if (batch.has_nodes) {
        m_print.error("get_specular_hardness(): Not allowed for node materials! " 
                + "Use get_nodemat_value/get_nodemat_rgb methods instead.");
        return 0;
    }

    return batch.specular_params[1];
}

/**
 * Check the specular hardness for the object material.
 * @method module:material.check_specular_hardness
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @returns {boolean} Specular hardness presence
 * @deprecated [17.06] not needed anymore.
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var has_specular_hardness = m_mat.check_specular_hardness(cube, "MyMaterial");
 */
exports.check_specular_hardness = function(obj, mat_name) {
    m_print.error_once("check_specular_hardness() is deprecated, not needed anymore");
    
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    return Boolean(batch && batch.specular_params[1]);
}

/**
 * Set the emit factor for the object non-node material.
 * @method module:material.set_emit_factor
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @param {number} emit_factor Emit factor value
 * @example 
 * var m_mat = require("material");
 * var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * m_mat.set_emit_factor(cube, "MyMaterial", 1);
 */
exports.set_emit_factor = function(obj, mat_name, emit_factor) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("set_emit_factor(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("set_emit_factor(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return;
    }

    if (batch.has_nodes) {
        m_print.error("set_emit_factor(): Not allowed for node materials! " 
                + "Use set_nodemat_value/set_nodemat_rgb methods instead.");
        return;
    }

    batch.emit = emit_factor;
    var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
    if (reflect_batch)
        reflect_batch.emit = emit_factor;
}

/**
 * Get the emit factor for the object non-node material.
 * @method module:material.get_emit_factor
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @returns {number} Emit factor value
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var emit_factor = m_mat.get_emit_factor(cube, "MyMaterial");
 */
exports.get_emit_factor = function(obj, mat_name) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("get_emit_factor(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return 0;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("get_emit_factor(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return 0;
    }

    if (batch.has_nodes) {
        m_print.error("get_emit_factor(): Not allowed for node materials! " 
                + "Use get_nodemat_value/get_nodemat_rgb methods instead.");
        return 0;
    }

    return batch.emit;
}

/**
 * Set the ambient factor for the object non-node material.
 * @method module:material.set_ambient_factor
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @param {number} ambient_factor Ambient factor value
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * m_mat.set_ambient_factor(cube, "MyMaterial", 0.6);
 */
exports.set_ambient_factor = function(obj, mat_name, ambient_factor) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("set_ambient_factor(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("set_ambient_factor(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return;
    }

    if (batch.has_nodes) {
        m_print.error("set_ambient_factor(): Not allowed for node materials! " 
                + "Use set_nodemat_value/set_nodemat_rgb methods instead.");
        return;
    }

    batch.ambient = ambient_factor;
    var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
    if (reflect_batch)
        reflect_batch.ambient = ambient_factor;
}

/**
 * Get the ambient factor for the object non-node material.
 * @method module:material.get_ambient_factor
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @returns {number} Ambient factor value
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var ambient_factor = m_mat.get_ambient_factor(cube, "MyMaterial");
 */
exports.get_ambient_factor = function(obj, mat_name) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("get_ambient_factor(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return 0;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("get_ambient_factor(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return 0;
    }

    if (batch.has_nodes) {
        m_print.error("get_ambient_factor(): Not allowed for node materials! " 
                + "Use get_nodemat_value/get_nodemat_rgb methods instead.");
        return 0;
    }

    return batch.ambient;
}

/**
 * Set the diffuse color factor for the object non-node material.
 * @method module:material.set_diffuse_color_factor
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @param {number} diffuse_color_factor Diffuse color factor value
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * m_mat.set_diffuse_color_factor(cube, "MyMaterial", 0.05);
 */
exports.set_diffuse_color_factor = function(obj, mat_name, diffuse_color_factor) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("set_diffuse_color_factor(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("set_diffuse_color_factor(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return;
    }

    if (batch.has_nodes) {
        m_print.error("set_diffuse_color_factor(): Not allowed for node materials! " 
                + "Use set_nodemat_value/set_nodemat_rgb methods instead.");
        return;
    }

    batch.diffuse_color_factor = diffuse_color_factor;
    var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
    if (reflect_batch)
        reflect_batch.diffuse_color_factor = diffuse_color_factor;
}

/**
 * Get the diffuse color factor for the object non-node material.
 * @method module:material.get_diffuse_color_factor
 * @param {Object3D} obj Object 3D 
 * @param {string} mat_name Material name
 * @returns {number} Diffuse color factor value
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var diffuse_color_factor = m_mat.get_diffuse_color_factor(cube, "MyMaterial");
 */
exports.get_diffuse_color_factor = function(obj, mat_name) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("get_diffuse_color_factor(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return 0;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("get_diffuse_color_factor(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return 0;
    }

    if (batch.has_nodes) {
        m_print.error("get_diffuse_color_factor(): Not allowed for node materials! " 
                + "Use get_nodemat_value/get_nodemat_rgb methods instead.");
        return 0;
    }

    return batch.diffuse_color_factor;
}

/**
 * Set the alpha factor for the object non-node material.
 * @method module:material.set_alpha_factor
 * @param {Object3D} obj Object 3D
 * @param {string} mat_name Material name
 * @param {number} alpha_factor Alpha factor value
 * @example 
 * var m_mat = require("material");
 * var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * m_mat.set_alpha_factor(cube, "MyMaterial", 0.2);
 */
exports.set_alpha_factor = function(obj, mat_name, alpha_factor) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("set_alpha_factor(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("set_alpha_factor(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return;
    }

    if (batch.has_nodes) {
        m_print.error("set_alpha_factor(): Not allowed for node materials! " 
                + "Use set_nodemat_value/set_nodemat_rgb methods instead.");
        return;
    }

    batch.alpha_factor = alpha_factor;
    var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
    if (reflect_batch)
        reflect_batch.alpha_factor = alpha_factor;
}

/**
 * Get the diffuse alpha factor for the object non-node material.
 * @method module:material.get_alpha_factor
 * @param {Object3D} obj Object 3D
 * @param {string} mat_name Material name
 * @returns {number} Diffuse alpha factor value
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var alpha_factor = m_mat.get_alpha_factor(cube, "MyMaterial");
 */
exports.get_alpha_factor = function(obj, mat_name) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("get_alpha_factor(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return 0;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("get_alpha_factor(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return 0;
    }

    if (batch.has_nodes) {
        m_print.error("get_alpha_factor(): Not allowed for node materials! " 
                + "Use get_nodemat_value/get_nodemat_rgb methods instead.");
        return 0;
    }

    return batch.alpha_factor;
}

/**
 * Get the material extended params for the object non-node material.
 * @method module:material.get_material_extended_params
 * @param {Object3D} obj Object 3D
 * @param {string} mat_name Material name
 * @returns {?MaterialExtParams} Material extended params or null
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var extended_parameters = m_mat.get_material_extended_params(cube, "MyMaterial");
 */
exports.get_material_extended_params = function(obj, mat_name) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("get_material_extended_params(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return null;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("get_material_extended_params(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return null;
    }

    if (batch.has_nodes) {
        m_print.error("get_material_extended_params(): Not allowed for node materials! " 
                + "Use get_nodemat_value/get_nodemat_rgb methods instead.");
        return null;
    }

    var mat_params = {};

    mat_params.reflect_factor = batch.reflect_factor;
    mat_params.fresnel        = batch.fresnel_params[2];
    mat_params.fresnel_factor = 5 * (1 - batch.fresnel_params[3]);
    mat_params.parallax_scale = batch.parallax_scale;
    mat_params.parallax_steps = parseFloat(m_batch.get_batch_directive(batch,
            "PARALLAX_STEPS")[1]);

    return mat_params;
}

/**
 * Set the material extended params for the object non-node material.
 * @method module:material.set_material_extended_params
 * @param {Object3D} obj Object 3D
 * @param {string} mat_name Material name
 * @param {MaterialExtParams} mat_params Material params
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * m_mat.set_material_extended_params(cube, "MyMaterial", {
 *     fresnel: 0,
 *     fresnel_factor: 1.25,
 *     parallax_scale: 0,
 *     parallax_steps: 5,
 *     reflect_factor: 0
 * });
 */
exports.set_material_extended_params = function(obj, mat_name, mat_params) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("set_material_extended_params(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("set_material_extended_params(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return;
    }

    if (batch.has_nodes) {
        m_print.error("set_material_extended_params(): Not allowed for node materials! " 
                + "Use set_nodemat_value/set_nodemat_rgb methods instead.");
        return;
    }

    var batches = [batch];
    var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
    if (reflect_batch)
        batches.push(reflect_batch);

    for (var i = 0; i < batches.length; i++) {
        batch = batches[i];
        if (typeof mat_params.reflect_factor == "number")
            batch.reflect_factor = mat_params.reflect_factor;

        if (typeof mat_params.fresnel == "number")
            batch.fresnel_params[2] = mat_params.fresnel;

        if (typeof mat_params.fresnel_factor == "number")
            batch.fresnel_params[3] = 1 - mat_params.fresnel_factor / 5;

        if (typeof mat_params.parallax_scale == "number")
            batch.parallax_scale = mat_params.parallax_scale;

        if (typeof mat_params.parallax_steps == "number") {
            m_batch.set_batch_directive(batch, "PARALLAX_STEPS", 
                    m_shaders.glsl_value(mat_params.parallax_steps));
            m_batch.update_shader(batch);
            m_scenes.recalculate_draw_data(batch);
        }
    }
}

/**
 * Get the parameters of a water non-node material.
 * @method module:material.get_water_material_params
 * @param {Object3D} obj Object 3D
 * @param {string} mat_name Water material name
 * @returns {?WaterMaterialParams} Water material params or null.
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var water = m_scenes.get_object_by_name("MyWater");
 * var water_params = m_mat.get_water_material_params(water, "MyMaterial");
 */
exports.get_water_material_params = function(obj, mat_name) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("get_water_material_params(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return null;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch || !batch.water) {
        m_print.error("get_water_material_params(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name 
                + "\" or it's not a water material.");
        return null;
    }

    if (batch.has_nodes) {
        m_print.error("get_water_material_params(): Not allowed for node materials! " 
                + "Use get_nodemat_value/get_nodemat_rgb methods instead.");
        return null;
    }


    var water_mat_params = {};

    water_mat_params.shore_smoothing = cfg_def.shore_smoothing 
            && batch.water_shore_smoothing && Boolean(parseFloat(
            m_batch.get_batch_directive(batch, "SHORE_SMOOTHING")[1]));

    water_mat_params.absorb_factor = parseFloat(m_batch.get_batch_directive(
            batch, "ABSORB")[1]);
    water_mat_params.foam_factor = batch.foam_factor;

    water_mat_params.shallow_water_col = new Float32Array(3);
    water_mat_params.shore_water_col = new Float32Array(3);
    water_mat_params.shallow_water_col_fac = 0;
    water_mat_params.shore_water_col_fac = 0;

    if (cfg_def.shore_distance) {
        water_mat_params.shallow_water_col.set(batch.shallow_water_col);
        water_mat_params.shore_water_col.set(batch.shore_water_col);
        water_mat_params.shallow_water_col_fac = batch.shallow_water_col_fac;
        water_mat_params.shore_water_col_fac = batch.shore_water_col_fac;
    }

    water_mat_params.norm_uv_velocity = batch.water_norm_uv_velocity;

    water_mat_params.water_dynamic = cfg_def.water_dynamic 
            && batch.water_dynamic && Boolean(parseFloat(
            m_batch.get_batch_directive(batch, "DYNAMIC")[1]));
    water_mat_params.sss_strength = parseFloat(m_batch.get_batch_directive(
            batch, "SSS_STRENGTH")[1]);
    water_mat_params.sss_width = parseFloat(m_batch.get_batch_directive(
            batch, "SSS_WIDTH")[1]);
    water_mat_params.waves_height = parseFloat(m_batch.get_batch_directive(
            batch, "WAVES_HEIGHT")[1]);
    water_mat_params.waves_length = parseFloat(m_batch.get_batch_directive(
            batch, "WAVES_LENGTH")[1]);

    water_mat_params.dst_noise_scale0 = parseFloat(m_batch.get_batch_directive(
            batch, "DST_NOISE_SCALE_0")[1]);
    water_mat_params.dst_noise_scale1 = parseFloat(m_batch.get_batch_directive(
            batch, "DST_NOISE_SCALE_1")[1]);
    water_mat_params.dst_noise_freq0 = parseFloat(m_batch.get_batch_directive(
            batch, "DST_NOISE_FREQ_0")[1]);
    water_mat_params.dst_noise_freq1 = parseFloat(m_batch.get_batch_directive(
            batch, "DST_NOISE_FREQ_1")[1]);
    water_mat_params.dir_min_shore_fac = parseFloat(m_batch.get_batch_directive(
            batch, "DIR_MIN_SHR_FAC")[1]);
    water_mat_params.dir_freq = parseFloat(m_batch.get_batch_directive(batch,
            "DIR_FREQ")[1]);
    water_mat_params.dir_noise_scale = parseFloat(m_batch.get_batch_directive(
            batch, "DIR_NOISE_SCALE")[1]);
    water_mat_params.dir_noise_freq = parseFloat(m_batch.get_batch_directive(
            batch, "DIR_NOISE_FREQ")[1]);

    water_mat_params.dir_min_noise_fac = parseFloat(m_batch.get_batch_directive(
            batch, "DIR_MIN_NOISE_FAC")[1]);
    water_mat_params.dst_min_fac = parseFloat(m_batch.get_batch_directive(batch,
            "DST_MIN_FAC")[1]);
    water_mat_params.waves_hor_fac = parseFloat(m_batch.get_batch_directive(
            batch, "WAVES_HOR_FAC")[1]);

    return water_mat_params;
}

/**
 * Set parameters for a water non-node material.
 * @method module:material.set_water_material_params
 * @param {Object3D} obj Object 3D
 * @param {string} mat_name Water material name
 * @param {WaterMaterialParams} water_mat_params Water material parameters.
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var water = m_scenes.get_object_by_name("MyWater");
 * var water_params = m_mat.set_water_material_params(water, "MyMaterial", {
 *     waves_height: 2, 
 *     waves_length: 20, 
 *     shallow_water_col: [0, 0.3, 0.8]
 * });
 */
exports.set_water_material_params = function(obj, mat_name, water_mat_params) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("set_water_material_params(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch || !batch.water) {
        m_print.error("set_water_material_params(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name 
                + "\" or it's not a water material.");
        return;
    }

    if (batch.has_nodes) {
        m_print.error("set_water_material_params(): Not allowed for node materials! " 
                + "Use set_nodemat_value/set_nodemat_rgb methods instead.");
        return;
    }

    var batches = [batch];
    var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
    if (reflect_batch)
        batches.push(reflect_batch);

    for (var i = 0; i < batches.length; i++) {
        batch = batches[i];


        if (typeof water_mat_params.shore_smoothing == "boolean")
            if (cfg_def.shore_smoothing && batch.water_shore_smoothing 
                    && water_mat_params.shore_smoothing)
                m_batch.set_batch_directive(batch, "SHORE_SMOOTHING", 1);
            else
                m_batch.set_batch_directive(batch, "SHORE_SMOOTHING", 0);

        if (typeof water_mat_params.absorb_factor == "number") {
            var absorb_factor = m_shaders.glsl_value(parseFloat(
                    water_mat_params.absorb_factor));
            m_batch.set_batch_directive(batch, "ABSORB", absorb_factor);
        }

        if (typeof water_mat_params.foam_factor == "number" && cfg_def.foam)
            batch.foam_factor = water_mat_params.foam_factor;

        if (cfg_def.shore_distance) {
            if (typeof water_mat_params.shallow_water_col == "object")
                batch.shallow_water_col.set(water_mat_params.shallow_water_col);
            if (typeof water_mat_params.shallow_water_col_fac == "number")
                batch.shallow_water_col_fac = water_mat_params.shallow_water_col_fac;
            if (typeof water_mat_params.shore_water_col == "object")
                batch.shore_water_col.set(water_mat_params.shore_water_col);
            if (typeof water_mat_params.shore_water_col_fac == "number")
                batch.shore_water_col_fac = water_mat_params.shore_water_col_fac;
        }

        if (typeof water_mat_params.norm_uv_velocity == "number")
            batch.water_norm_uv_velocity = water_mat_params.norm_uv_velocity;

        if (cfg_def.water_dynamic && batch.water_dynamic) {
            if (typeof water_mat_params.water_dynamic == "boolean") {
                if (water_mat_params.water_dynamic)
                    m_batch.set_batch_directive(batch, "DYNAMIC", 1);
                else
                    m_batch.set_batch_directive(batch, "DYNAMIC", 0);
            }
            if (typeof water_mat_params.sss_strength == "number") {
                var waves_length = m_shaders.glsl_value(parseFloat(
                        water_mat_params.sss_strength));
                m_batch.set_batch_directive(batch, "SSS_STRENGTH", waves_length);
            }
            if (typeof water_mat_params.sss_width == "number") {
                var waves_length = m_shaders.glsl_value(parseFloat(
                        water_mat_params.sss_width));
                m_batch.set_batch_directive(batch, "SSS_WIDTH", waves_length);
            }
            if (typeof water_mat_params.waves_height == "number") {
                var waves_height = m_shaders.glsl_value(parseFloat(
                        water_mat_params.waves_height));
                m_batch.set_batch_directive(batch, "WAVES_HEIGHT", waves_height);
            }
            if (typeof water_mat_params.waves_length  == "number") {
                var waves_length = m_shaders.glsl_value(parseFloat(
                        water_mat_params.waves_length));
                m_batch.set_batch_directive(batch, "WAVES_LENGTH", waves_length);
            }
            if (typeof water_mat_params.dst_noise_scale0 == "number") {
                var dst_noise_scale0 = m_shaders.glsl_value(parseFloat(
                        water_mat_params.dst_noise_scale0));
                m_batch.set_batch_directive(batch, "DST_NOISE_SCALE_0", dst_noise_scale0);
            }
            if (typeof water_mat_params.dst_noise_scale1 == "number") {
                var dst_noise_scale1 = m_shaders.glsl_value(parseFloat(
                        water_mat_params.dst_noise_scale1));
                m_batch.set_batch_directive(batch, "DST_NOISE_SCALE_1", dst_noise_scale1);
            }
            if (typeof water_mat_params.dst_noise_freq0 == "number") {
                var dst_noise_freq0 = m_shaders.glsl_value(parseFloat(
                        water_mat_params.dst_noise_freq0));
                m_batch.set_batch_directive(batch, "DST_NOISE_FREQ_0", dst_noise_freq0);
            }
            if (typeof water_mat_params.dst_noise_freq1 == "number") {
                var dst_noise_freq1 = m_shaders.glsl_value(parseFloat(
                        water_mat_params.dst_noise_freq1));
                m_batch.set_batch_directive(batch, "DST_NOISE_FREQ_1", dst_noise_freq1);
            }
            if (typeof water_mat_params.dir_min_shore_fac == "number") {
                var dir_min_shore_fac = m_shaders.glsl_value(parseFloat(
                        water_mat_params.dir_min_shore_fac));
                m_batch.set_batch_directive(batch, "DIR_MIN_SHR_FAC", dir_min_shore_fac);
            }
            if (typeof water_mat_params.dir_freq == "number") {
                var dir_freq = m_shaders.glsl_value(parseFloat(
                        water_mat_params.dir_freq));
                m_batch.set_batch_directive(batch, "DIR_FREQ", dir_freq);
            }
            if (typeof water_mat_params.dir_noise_scale == "number") {
                var dir_noise_scale = m_shaders.glsl_value(parseFloat(
                        water_mat_params.dir_noise_scale));
                m_batch.set_batch_directive(batch, "DIR_NOISE_SCALE", dir_noise_scale);
            }
            if (typeof water_mat_params.dir_noise_freq == "number") {
                var dir_noise_freq = m_shaders.glsl_value(parseFloat(
                        water_mat_params.dir_noise_freq));
                m_batch.set_batch_directive(batch, "DIR_NOISE_FREQ", dir_noise_freq);
            }
            if (typeof water_mat_params.dir_min_noise_fac == "number") {
                var dir_min_noise_fac = m_shaders.glsl_value(parseFloat(
                        water_mat_params.dir_min_noise_fac));
                m_batch.set_batch_directive(batch, "DIR_MIN_NOISE_FAC", dir_min_noise_fac);
            }
            if (typeof water_mat_params.dst_min_fac == "number") {
                var dst_min_fac = m_shaders.glsl_value(parseFloat(
                        water_mat_params.dst_min_fac));
                m_batch.set_batch_directive(batch, "DST_MIN_FAC", dst_min_fac);
            }
            if (typeof water_mat_params.waves_hor_fac == "number") {
                var waves_hor_fac = m_shaders.glsl_value(parseFloat(
                        water_mat_params.waves_hor_fac));
                m_batch.set_batch_directive(batch, "WAVES_HOR_FAC", waves_hor_fac);
            }
        }
        m_batch.update_shader(batch);
        m_scenes.recalculate_draw_data(batch);
    }
}

/**
 * Set parameters for a LINE object.
 * @method module:material.set_line_params
 * @param {Object3D} obj Line object 3D
 * @param {LineParams} line_params Line parameters
 * @example 
 * var m_mat = require("material");
 * var m_scenes = require("scenes");
 *
 * var empty = m_scenes.get_object_by_name("Empty");
 * m_mat.set_line_params(empty, {
 *     color: [1.0, 0.0, 0.0, 1.0],
 *     width: 5
 * });
 */
exports.set_line_params = function(obj, line_params) {

    if (!m_obj_util.is_line(obj)) {
        m_print.error("set_line_params(): Object \"" + obj.name 
                + "\" is not a LINE object.");
        return;
    }

    var batch = m_batch.get_first_batch(obj);
    if (!batch) {
        m_print.error("set_line_params(): Couldn't set line parameters!");
        return;
    }

    if (m_util.isdef(line_params.color))
        batch.diffuse_color.set(line_params.color);
    if (m_util.isdef(line_params.width))
        batch.line_width = line_params.width;
}

/**
 * Get the parameters of a LINE object.
 * @method module:material.get_line_params
 * @param {Object3D} obj Line object 3D
 * @returns {?LineParams} Line parameters
 * @example var m_scenes = require("scenes");
 * var m_mat  = require("material");
 *
 * var line_object = m_scenes.get_object_by_name("MyLine");
 * var line_params = m_mat.get_line_params(line_object);
 */
exports.get_line_params = function(obj) {

    if (!m_obj_util.is_line(obj)) {
        m_print.error("get_line_params(): Object \"" + obj.name 
                + "\" is not a LINE object.");
        return null;
    }

    var batch = m_batch.get_first_batch(obj);
    if (!batch) {
        m_print.error("get_line_params(): Couldn't get line parameters!");
        return null;
    }

    var line_params = {
        color : new Float32Array(batch.diffuse_color),
        width: batch.line_width
    }

    return line_params;
}

/**
 * Set value of the Value node in the object's material.
 * @method module:material.set_nodemat_value
 * @param {Object3D} obj Object 3D
 * @param {string[]} name_list List consisting of the material name, the names of
 * nested node groups (if any) and the name of the Value node itself. Should
 * have at least 2 elements ["Mat","Node"]. For a world node material the 
 * material name should be omitted.
 * @param {number} value The value to set the Value node to
 * @example 
 * var m_mat = require("material");
 * var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * m_mat.set_nodemat_value(cube, ["MyMaterial", "Value.001"], 20);
 */
exports.set_nodemat_value = function(obj, name_list, value) {

    var is_dyn_mesh = m_obj_util.is_dynamic_mesh(obj);
    var is_world = m_obj_util.is_world(obj);

    var obj_name = is_world ? m_obj.get_world_name(obj) : obj.name;

    if (!is_dyn_mesh && !is_world) {
        m_print.error("set_nodemat_value(): Object \"" + obj_name 
                + "\" is not a dynamic MESH or WORLD.");
        return;
    }

    if (is_dyn_mesh) {
        var mat_name = name_list[0];
        var node_name_prefix_offset = 1;

        var mat_batch = m_batch.find_batch_material_any(obj, mat_name, "MAIN");
        if (!mat_batch) {
            m_print.error("set_nodemat_value(): Material \"" + mat_name 
                    + "\" wasn't found on the object \"" + obj_name + "\".");
            return;
        }
    } else if (is_world) {
        var active_scene = m_scenes.get_active();
        var mat_name = "";
        var node_name_prefix_offset = 0;

        var mat_batch = m_batch.get_batch_by_type(obj, "SKY", active_scene);
        if (!mat_batch) {
            m_print.error("set_nodemat_value(): Sky node material wasn't found on the world object \"" 
                    + obj_name + "\".");
            return;
        }
    }

    var ind = m_obj.get_node_ind_by_name_list(mat_batch.node_value_inds,
            name_list, node_name_prefix_offset);
    if (ind === null) {
        m_print.error("set_nodemat_value(): Value node \"" 
                + name_list[name_list.length - 1] 
                + "\" was not found in the object \"" + obj_name + "\".");
        return;
    }

    m_obj.set_nodemat_value(obj, mat_name, ind, value)
}

/**
 * Get value of the Value node in the object's material.
 * @method module:material.get_nodemat_value
 * @param {Object3D} obj Object 3D
 * @param {string[]} name_list List consisting of the material name, the names of
 * nested node groups (if any) and the name of the Value node itself. Should
 * have at least 2 elements ["Mat","Node"]. For a world node material the 
 * material name should be omitted.
 * @returns {number} Value.
 * @example var m_scenes = require("scenes");
 * var m_mat  = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var node_value = m_mat.get_nodemat_value(cube, ["MyMaterial", "MyValue"]);
 */
exports.get_nodemat_value = function(obj, name_list) {

    var is_dyn_mesh = m_obj_util.is_dynamic_mesh(obj);
    var is_world = m_obj_util.is_world(obj);

    var obj_name = is_world ? m_obj.get_world_name(obj) : obj.name;

    if (!is_dyn_mesh && !is_world) {
        m_print.error("get_nodemat_value(): Object \"" + obj_name 
                + "\" is not a dynamic MESH or WORLD.");
        return 0;
    }

    if (is_dyn_mesh) {
        var mat_name = name_list[0];
        var node_name_prefix_offset = 1;

        var mat_batch = m_batch.find_batch_material_any(obj, mat_name, "MAIN");
        if (!mat_batch) {
            m_print.error("get_nodemat_value(): Material \"" + mat_name 
                    + "\" wasn't found on the object \"" + obj_name + "\".");
            return 0;
        }
    } else if (is_world) {
        var active_scene = m_scenes.get_active();
        var mat_name = "";
        var node_name_prefix_offset = 0;

        var mat_batch = m_batch.get_batch_by_type(obj, "SKY", active_scene);
        if (!mat_batch) {
            m_print.error("get_nodemat_value(): Sky node material wasn't found on the world object \"" 
                    + obj_name + "\".");
            return 0;
        }
    }

    var ind = m_obj.get_node_ind_by_name_list(mat_batch.node_value_inds,
            name_list, node_name_prefix_offset);
    if (ind === null) {
        m_print.error("get_nodemat_value(): Value node \"" 
                + name_list[name_list.length - 1] 
                + "\" was not found in the object \"" + obj_name + "\".");
        return 0;
    }

    return m_obj.get_nodemat_value(mat_batch, ind);
}

/**
 * Set color of the RGB node in the object's material.
 * @method module:material.set_nodemat_rgb
 * @param {Object3D} obj Object 3D
 * @param {string[]} name_list List consisting of the material name, the names of
 * nested node groups (if any) and the name of the RGB node itself. For a world 
 * node material the material name should be omitted.
 * @param {number} r The value to set the red channel of the RGB node to [0..1]
 * @param {number} g The value to set the green channel of the RGB node to [0..1]
 * @param {number} b The value to set the blue channel of the RGB node to [0..1]
 * @example 
 * var m_mat = require("material");
 * var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * m_mat.set_nodemat_rgb(cube, ["MyMaterial", "RGB.001"], 1, 0, 1);
 */
exports.set_nodemat_rgb = function(obj, name_list, r, g, b) {

    var is_dyn_mesh = m_obj_util.is_dynamic_mesh(obj);
    var is_world = m_obj_util.is_world(obj);

    var obj_name = is_world ? m_obj.get_world_name(obj) : obj.name;

    if (!is_dyn_mesh && !is_world) {
        m_print.error("set_nodemat_rgb(): Object \"" + obj_name 
                + "\" is not a dynamic MESH or WORLD.");
        return;
    }

    if (is_dyn_mesh) {
        var mat_name = name_list[0];
        var node_name_prefix_offset = 1;

        var mat_batch = m_batch.find_batch_material_any(obj, mat_name, "MAIN");
        if (!mat_batch) {
            m_print.error("set_nodemat_rgb(): Material \"" + mat_name 
                    + "\" wasn't found on the object \"" + obj_name + "\".");
            return;
        }
    } else if (is_world) {
        var active_scene = m_scenes.get_active();
        var mat_name = "";
        var node_name_prefix_offset = 0;

        var mat_batch = m_batch.get_batch_by_type(obj, "SKY", active_scene);
        if (!mat_batch) {
            m_print.error("set_nodemat_rgb(): Sky node material wasn't found on the world object \"" 
                    + obj_name + "\".");
            return;
        }
    }

    var ind = m_obj.get_node_ind_by_name_list(mat_batch.node_rgb_inds,
            name_list, node_name_prefix_offset);
    if (ind === null) {
        m_print.error("set_nodemat_rgb(): RGB node \"" 
                + name_list[name_list.length - 1] 
                + "\" was not found in the object \"" + obj_name + "\".");
        return;
    }

    m_obj.set_nodemat_rgb(obj, mat_name, ind, r, g, b);
}

/**
 * Get color of the RGB node in the object's material.
 * @method module:material.get_nodemat_rgb
 * @param {Object3D} obj Object 3D
 * @param {string[]} name_list List consisting of the material name, the names of
 * nested node groups (if any) and the name of the RGB node itself.
 * For a world node material the material name should be omitted.
 * @param {Vec3} [dest] Destination color
 * @returns {?RGB} Destination color
 * @example var m_scenes = require("scenes");
 * var m_mat  = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var rgb_node_values = m_mat.get_nodemat_rgb(cube, ["MyMaterial", "MyRGB"]);
 */
exports.get_nodemat_rgb = function(obj, name_list, dest) {

    var is_dyn_mesh = m_obj_util.is_dynamic_mesh(obj);
    var is_world = m_obj_util.is_world(obj);

    var obj_name = is_world ? m_obj.get_world_name(obj) : obj.name;

    if (!is_dyn_mesh && !is_world) {
        m_print.error("get_nodemat_rgb(): Object \"" + obj_name 
                + "\" is not a dynamic MESH or WORLD.");
        return null;
    }

    if (is_dyn_mesh) {
        var mat_name = name_list[0];
        var node_name_prefix_offset = 1;

        var mat_batch = m_batch.find_batch_material_any(obj, mat_name, "MAIN");
        if (!mat_batch) {
            m_print.error("get_nodemat_rgb(): Material \"" + mat_name 
                    + "\" wasn't found on the object \"" + obj_name + "\".");
            return null;
        }
    } else if (is_world) {
        var active_scene = m_scenes.get_active();
        var mat_name = "";
        var node_name_prefix_offset = 0;

        var mat_batch = m_batch.get_batch_by_type(obj, "SKY", active_scene);
        if (!mat_batch) {
            m_print.error("get_nodemat_rgb(): Sky node material wasn't found on the world object \"" 
                    + obj_name + "\".");
            return null;
        }
    }

    var ind = m_obj.get_node_ind_by_name_list(mat_batch.node_rgb_inds,
            name_list, node_name_prefix_offset);
    if (ind === null) {
        m_print.error("get_nodemat_rgb(): RGB node \"" 
                + name_list[name_list.length - 1] 
                + "\" was not found in the object \"" + obj_name + "\".");
        return null;
    }

    if (!dest)
        dest = new Float32Array(3);

    return m_obj.get_nodemat_rgb(mat_batch, ind, dest);
}

/**
 * Check if the object's material is a node material.
 * @method module:material.is_node_material
 * @param {Object3D} obj Object 3D
 * @param {string} mat_name Material name
 * @returns {boolean} The result of the checking.
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var has_nodes = m_mat.is_node_material(cube, "MyMaterial");
 */
exports.is_node_material = function(obj, mat_name) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("is_node_material(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return false;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("is_node_material(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return false;
    }

    return batch.has_nodes;
}

/**
 * Check if the object's material is a water material.
 * @method module:material.is_water_material
 * @param {Object3D} obj Object 3D
 * @param {string} mat_name Material name
 * @returns {boolean} The result of the checking.
 * @example var m_scenes = require("scenes");
 * var m_mat = require("material");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var is_water = m_mat.is_water_material(cube, "MyMaterial");
 */
exports.is_water_material = function(obj, mat_name) {
    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("is_water_material(): Object \"" + obj.name 
                + "\" is not a dynamic MESH.");
        return false;
    }

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch) {
        m_print.error("is_water_material(): Material \"" + mat_name 
                + "\" wasn't found on the object \"" + obj.name + "\".");
        return false;
    }

    return batch.water && !batch.has_nodes;
}

}
