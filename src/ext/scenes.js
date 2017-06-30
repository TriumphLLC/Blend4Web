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
 * Scene API.
 * Most of the routines presented here require an active scene to be set,
 * use get_active() set_active() to do that.
 * @module scenes
 * @local ColorCorrectionParams
 * @local SceneMetaTags
 * @local HMDParams
 * @local BloomParams
 * @local DOFParams
 * @local SSAOParams
 * @local SkyParams
 * @local WindParams
 */
b4w.module["scenes"] = function(exports, require) {

var m_batch    = require("__batch");
var m_cam      = require("__camera");
var m_cont     = require("__container");
var m_data     = require("__data");
var m_graph    = require("__graph");
var m_obj      = require("__objects");
var m_obj_util = require("__obj_util");
var m_print    = require("__print");
var m_scenes   = require("__scenes");
var m_scgraph  = require("__scenegraph");
var m_subs     = require("__subscene");
var m_util     = require("__util");

/**
 * Color correction params.
 * @typedef {Object} ColorCorrectionParams
 * @property {number} [brightness] Brightness
 * @property {number} [contrast] Contrast
 * @property {number} [exposure] Exposure
 * @property {number} [saturation] Saturation
 * @cc_externs brightness contrast exposure saturation
 */

/**
 * Scene meta tags.
 * @typedef {Object} SceneMetaTags
 * @property {string} title The title meta tag.
 * @property {string} description The description meta tag.
 * @cc_externs title description
 */

/**
 * Head-mounted display params.
 * @typedef {Object} HMDParams
 * @property {boolean} enable_hmd_stereo Enable hmd stereo
 * @property {Array} distortion_coefs Distortion coefficient list
 * @property {Array} chromatic_aberration_coefs Chromatic aberration coefficient list
 * @property {number} base_line_factor Tray to lens-center distance divided by screen height
 * @property {number} inter_lens_factor Inter-lens distance divided by screen width
 */

/**
 * Bloom params.
 * @typedef {Object} BloomParams
 * @property {number} key Strength of bloom effect
 * @property {number} edge_lum Luminance threshold above which bloom is visible.
 * @property {number} blur The amount of blur applied to bloom effect.
 * @property {number} average_luminance The average luminance of the frame. Has influence only when
 * the adaptive bloom is disabled.
 * @cc_externs key edge_lum blur adaptive average_luminance
 */

/**
 * Depth of Field parameters. Readonly properties like the "dof_bokeh" and the 
 * "dof_object" can be only set beforehand in Blender.
 * @typedef {Object} DOFParams
 * @property {boolean} dof_on Use DOF.
 * @property {number} dof_distance The distance to the focal point. Readonly if 
 * the "dof_object" property is set, which has a higher priority.
 * @property {number} dof_front_start The distance in front of the focal point 
 * where the DOF effect starts. Disabled (has zero value and readonly status) if 
 * the "dof_bokeh" property is False.
 * @property {number} dof_front_end The distance in front of the focal point 
 * where the DOF effect reaches its maximum power.
 * @property {number} dof_rear_start The distance beyond the focal point where 
 * the DOF effect starts. Disabled (has zero value and readonly status) if the 
 * "dof_bokeh" property is False.
 * @property {number} dof_rear_end The distance beyond the focal point where 
 * the DOF effect reaches its maximum power.
 * @property {number} dof_power The DOF intensity.
 * @property {boolean} dof_bokeh Use bokeh DOF (readonly).
 * @property {number} dof_bokeh_intensity The brightness of the bokeh DOF effect.
 * @property {Object3D} dof_object The object which center defines the focal 
 * point. Controls the "dof_distance" property if set (readonly).
 * @cc_externs dof_on dof_distance dof_front_start dof_front_end dof_rear_start
 * @cc_externs dof_rear_end dof_power dof_bokeh dof_bokeh_intensity dof_object
 */

/**
 * SSAO Parameters
 * @typedef {Object} SSAOParams
 * @property {number} [quality] The number of samples used for calculating SSAO. 
 * Must be 8, 16, 24 or 32.
 * @property {number} [radius_increase] The spherical sampling radius multiply factor
 * when transferring from the internal sampling ring to the external one.
 * @property {boolean} [use_hemisphere] Use hemisphere to calculate SSAO.
 * @property {boolean} [use_blur_depth] Apply edge-preserving blur to SSAO.
 * @property {number} [blur_discard_value] Influence of depth difference between samples on blur weight.
 * @property {number} [influence] How much AO affects the final rendering.
 * @property {number} [dist_factor] How much AO decreases with distance.
 * @property {boolean} [ssao_white] Turn SSAO white, basically disabling it.
 * @property {boolean} [ssao_only] Only SSAO and not the regular render will be visible.
 * @cc_externs quality radius_increase use_hemisphere
 * @cc_externs use_blur_depth blur_discard_value
 * @cc_externs influence dist_factor ssao_white ssao_only
 */

/**
 * Procedural Sky Parameters
 * @typedef {Object} SkyParams
 * @property {boolean} [procedural_skydome] Procedural sky is used (readonly).
 * @property {boolean} [use_as_environment_lighting] Procedural sky is used for 
 * calculating environment lighting (readonly).
 * @property {number} [rayleigh_brightness] Brightness of Rayleigh scattering. 
 * Available only if "procedural_skydome" is True.
 * @property {number} [mie_brightness] Brightness of Mie scattering. Available 
 * only if "procedural_skydome" is True.
 * @property {number} [spot_brightness] Brightness of the sun spot. Available 
 * only if "procedural_skydome" is True.
 * @property {number} [scatter_strength] The strength of the light scattering. 
 * Available only if "procedural_skydome" is True.
 * @property {number} [rayleigh_strength] The strength of the Rayleigh 
 * scattering. Available only if "procedural_skydome" is True.
 * @property {number} [mie_strength] The strength of the Mie scattering. 
 * Available only if "procedural_skydome" is True.
 * @property {number} [rayleigh_collection_power] Rayleigh collection power. 
 * Available only if "procedural_skydome" is True.
 * @property {number} [mie_collection_power] Mie collection power. Available 
 * only if "procedural_skydome" is True.
 * @property {number} [mie_distribution] Mie distribution. Available only if 
 * "procedural_skydome" is True.
 * @property {RGB} [color] The base color of the procedural sky. Available only 
 * if "procedural_skydome" is True.
 * @cc_externs procedural_skydome use_as_environment_lighting
 * @cc_externs rayleigh_brightness mie_brightness spot_brightness
 * @cc_externs scatter_strength rayleigh_strength mie_strength
 * @cc_externs rayleigh_collection_power mie_collection_power
 * @cc_externs mie_distribution color
 */

/**
 * Wind Parameters
 * @typedef {Object} WindParams
 * @property {number} [wind_dir] The direction of the wind.
 * @property {number} [wind_strength] The strength of the wind.
 * @cc_externs wind_dir wind_strength
 */

/**
 * All possible data IDs.
 * @const module:scenes.DATA_ID_ALL
 */
exports.DATA_ID_ALL   = m_obj.DATA_ID_ALL;

/**
 * Set the active scene
 * @method module:scenes.set_active
 * @param {string} scene_name Name of the scene
 * @example var m_scenes = require("scenes");
 *
 * m_scenes.set_active("Scene");
 */
exports.set_active = function(scene_name) {
    // NOTE: keysearch is dangerous
    var scenes = m_scenes.get_all_scenes();
    m_scenes.set_active(m_util.keysearch("name", scene_name, scenes));
}

/**
 * Get the current active scene
 * @method module:scenes.get_active
 * @returns {string} Active scene name
 * @example var m_scenes = require("scenes");
 *
 * var current_scene = m_scenes.get_active();
 */
exports.get_active = function() {
    if (!m_scenes.check_active())
        return "";
    else
        return m_scenes.get_active()["name"];
}
/**
 * Get all scene names.
 * @method module:scenes.get_scenes
 * @returns {string[]} Array of scene names.
 * @example var m_scenes = require("scenes");
 *
 * var scene_list = m_scenes.get_scenes();
 */
exports.get_scenes = function() {
    var scenes = m_scenes.get_all_scenes();
    var scene_names = [];
    for (var i = 0; i < scenes.length; i++)
        scene_names.push(scenes[i]["name"]);

    return scene_names;
}
/**
 * Return the active camera object from the active scene.
 * @method module:scenes.get_active_camera
 * @returns {Object3D} Camera object.
 * @example var m_scenes = require("scenes");
 *
 * var camera = m_scenes.get_active_camera();
 */
exports.get_active_camera = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    } else
        return m_scenes.get_camera(m_scenes.get_active());
}

/**
 * Get object by name.
 * @method module:scenes.get_object_by_name
 * @param {string} name Object name
 * @param {number} [data_id=0] ID of loaded data
 * @returns {Object3D} Object 3D
 * @example var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 */
exports.get_object_by_name = function(name, data_id) {
    var obj = m_obj.get_object(m_obj.GET_OBJECT_BY_NAME, name, data_id | 0, true);
    if (obj)
        return obj;
    else
        m_print.error("get object " + name + ": not found");
}

/**
 * Get the duplicated object by empty name and dupli name.
 * @method module:scenes.get_object_by_dupli_name
 * @param {string} empty_name Name of the EMPTY object used to duplicate the object
 * @param {string} dupli_name Name of the duplicated object
 * @param {number} [data_id=0] ID of loaded data
 * @returns {Object3D} Object 3D
 */
exports.get_object_by_dupli_name = function(empty_name, dupli_name,
        data_id) {
    var obj = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME, empty_name,
            dupli_name, data_id | 0);

    if (obj)
        return obj;
    else
        m_print.error("get object " + dupli_name + ": not found");
}

/**
 * Get the duplicated object by empty name and dupli name list.
 * @method module:scenes.get_object_by_dupli_name_list
 * @param {string[]} name_list List of the EMPTY and DUPLI object names:
 * [empty_name,empty_name,...,dupli_name]. Can be retrieved with the get_object_name_hierarchy() method.
 * @param {number} [data_id=0] ID of loaded data.
 * @returns {Object3D} Object 3D.
 */
exports.get_object_by_dupli_name_list = function(name_list, data_id) {
    var obj = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST,
            name_list, data_id | 0);
    if (obj)
        return obj;
    else
        m_print.error("get object " + name_list + ": not found");
}

/**
 * Get world by name.
 * @method module:scenes.get_world_by_name
 * @param {string} name World name
 * @param {number} [data_id=0] ID of loaded data
 * @returns {Object3D} Object 3D
 * @example m_scenes = require("scenes");
 *
 * var world_obj = m_scenes.get_world_by_name("World");
 */
exports.get_world_by_name = function(name, data_id) {
    var wrd = m_obj.get_world_by_name(name, data_id | 0);
    if (wrd)
        return wrd;
    else
        m_print.error("get object " + name + ": not found");
}

/**
 * Returns object data_id property.
 * @method module:scenes.get_object_data_id
 * @param {Object3D} obj Object 3D
 * @returns {number} data_id Data ID property
 * @example var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 *
 * var data_id = m_scenes.get_object_data_id(cube);
 */
exports.get_object_data_id = function(obj) {
    return m_obj_util.get_object_data_id(obj);
}

/**
 * For given mouse coords, render the color scene and return an object.
 * @method module:scenes.pick_object
 * @param {number} x X Canvas coordinate.
 * @param {number} y Y Canvas coordinate.
 * @returns {Object3D?} The object under the given coordinates or null.
 * @example 
 * var m_cont = require("container");
 * var m_scenes = require("scenes");
 *
 * var canvas_cont = m_cont.get_container();
 * canvas_cont.addEventListener("mousedown", down_cb);
 * var down_cb = function(event) {
 *     var obj = m_scenes.pick_object(event.offsetX, event.offsetY);
 * }
 */
exports.pick_object = function(x, y) {
    var main_scene = m_scenes.get_main();
    if (!main_scene) {
        m_print.error("No active scene");
        return null;
    }

    var subs_stereo = m_scenes.get_subs(main_scene, m_subs.STEREO);
    if (subs_stereo)
        if (subs_stereo.enable_hmd_stereo) {
            m_print.error_once("pick_object() is not available in the stereo rendering mode." +
                    " Use scenes.pick_center instead.");
            return pick_center();
        }

    return m_obj.pick_object(x, y);
}

/**
 * Render the color scene and return an object in the viewport center.
 * @method module:scenes.pick_center
 * @returns {Object3D?} The object in the viewport center.
 */
exports.pick_center = pick_center;
function pick_center() {
    var canvas = m_cont.get_canvas();
    var h = canvas.clientHeight;
    var w = canvas.clientWidth;
    return m_obj.pick_object(w / 2, h / 2);
}

/**
 * Check if the outlining is enabled or not for the object.
 * @method module:scenes.outlining_is_enabled
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 * @example var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 *
 * var outlining_is_enabled = m_scenes.outlining_is_enabled(cube);
 */
exports.outlining_is_enabled = function(obj) {
    return obj && obj.render && obj.render.outlining;
}

/**
 * Set outline intensity for the object.
 * @method module:scenes.set_outline_intensity
 * @param {Object3D} obj Object 3D
 * @param {number} value Intensity value
 * @example var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 *
 * m_scenes.set_outline_intensity(cube, 0.4);
 */
exports.set_outline_intensity = function(obj, value) {
    if (obj && obj.render && obj.render.outlining)
        m_obj.set_outline_intensity(obj, value);
    else
        m_print.error("set_outline_intensity(): wrong object");
}

/**
 * Get outline intensity for the object.
 * @method module:scenes.get_outline_intensity
 * @param {Object3D} obj Object 3D
 * @returns {number} Intensity value
 * @example var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 *
 * var outline_intensity = m_scenes.get_outline_intensity(cube);
 */
exports.get_outline_intensity = function(obj) {
    if (obj && obj.render && obj.render.outlining)
        return obj.render.outline_intensity;
    else
        m_print.error("get_outline_intensity(): wrong object");

    return 0;
}

/**
 * Apply outlining animation to the object
 * @method module:scenes.apply_outline_anim
 * @param {Object3D} obj Object 3D
 * @param {number} tau Outlining duration
 * @param {number} T Period of outlining
 * @param {number} N Number of relapses (0 - infinity)
 * @example var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 *
 * m_scenes.apply_outline_anim(cube, 10, 5, 0);
 */
exports.apply_outline_anim = function(obj, tau, T, N) {
    if (obj && obj.render && obj.render.outlining)
        m_obj.apply_outline_anim(obj, tau, T, N);
    else
        m_print.error("apply_outline_anim(): wrong object");
}

/**
 * Apply outlining animation to the object and use the object's default settings
 * @method module:scenes.apply_outline_anim_def
 * @param {Object3D} obj Object 3D
 * @example var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 *
 * m_scenes.apply_outline_anim_def(cube);
 */
exports.apply_outline_anim_def = function(obj) {
    if (obj && obj.render && obj.render.outlining) {
        var oa_set = obj.render.outline_anim_settings_default;
        m_obj.apply_outline_anim(obj, oa_set.outline_duration,
                oa_set.outline_period, oa_set.outline_relapses);
    } else
        m_print.error("apply_outline_anim_def(): wrong object");
}

/**
 * Stop outlining animation for the object.
 * @method module:scenes.clear_outline_anim
 * @param {Object3D} obj Object 3D
 * @example var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 *
 * m_scenes.clear_outline_anim(cube);
 */
exports.clear_outline_anim = function(obj) {
    if (obj && obj.render && obj.render.outlining)
        m_obj.clear_outline_anim(obj);
    else
        m_print.error("clear_outline_anim(): wrong object");
}

/**
 * Set the color of outline outline effect for active scene.
 * @method module:scenes.set_outline_color
 * @param {RGB} color RGB color vector
 * @example var m_scenes = require("scenes");
 *
 * m_scenes.set_outline_color([0.8, 0.2, 0.8]);
 */
exports.set_outline_color = m_scenes.set_outline_color;

/**
 * Get the color of outline outline effect for active scene.
 * @method module:scenes.get_outline_color
 * @param {?RGB} dest Destination RGB color vector
 * @returns {RGB} Destination RGB color vector
 * @example var m_scenes = require("scenes");
 *
 * var outline_color = new Float32Array(3);
 *
 * m_scenes.get_outline_color(outline_color);
 */
exports.get_outline_color = function(dest) {
    var scene = m_scenes.get_active();
    var subs = m_scenes.get_subs(scene, m_subs.OUTLINE);
    if (subs) {
        dest = dest || new Float32Array(3);
        dest.set(subs.outline_color);
        return dest;
    }
}

/**
 * Set head-mounted display params.
 * @method module:scenes.set_hmd_params
 * @param {HMDParams} hmd_params Head-mounted display params.
 * @cc_externs enable_hmd_stereo distortion_coefs chromatic_aberration_coefs
 * @cc_externs base_line_factor inter_lens_factor
 */
exports.set_hmd_params = function(hmd_params) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }

    if (!hmd_params)
        return;

    if (hmd_params.distortion_coefs && !(hmd_params.distortion_coefs instanceof Array))
        hmd_params.distortion_coefs = null;

    if (hmd_params.chromatic_aberration_coefs && !(hmd_params.chromatic_aberration_coefs instanceof Array))
        hmd_params.chromatic_aberration_coefs = null;

    if (typeof hmd_params.base_line_factor != "number")
        hmd_params.base_line_factor = null;

    if (typeof hmd_params.inter_lens_factor != "number")
        hmd_params.inter_lens_factor = null;

    if (typeof hmd_params.enable_hmd_stereo != "boolean")
        hmd_params.enable_hmd_stereo = null;

    m_scenes.set_hmd_params(hmd_params);
}

/**
 * Get shadow params.
 * @method module:scenes.get_shadow_params
 * @returns {ShadowParams} Shadow params
 * @cc_externs enable_csm csm_num csm_first_cascade_border first_cascade_blur_radius
 * @cc_externs csm_last_cascade_border last_cascade_blur_radius csm_resolution
 * @cc_externs self_shadow_normal_offset self_shadow_polygon_offset
 * @cc_externs pcf_blur_radius fade_last_cascade blend_between_cascades
 * @cc_externs csm_borders blur_radii
 * @example var m_scenes = require("scenes");
 *
 * var shadow_params = m_scenes.get_shadow_params();
 */
exports.get_shadow_params = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }

    var active_scene = m_scenes.get_active();
    var shadow_cast  = m_scenes.get_subs(active_scene, m_subs.SHADOW_CAST);

    if (!shadow_cast)
        return null;

    var shs = active_scene._render.shadow_params;
    var subs_main = m_scenes.get_subs(active_scene, m_subs.MAIN_OPAQUE);
    var subs_shadow_receive = m_scenes.get_subs(active_scene, m_subs.SHADOW_RECEIVE);

    var shadow_params = {};
    shadow_params.csm_resolution = shs.csm_resolution;

    shadow_params.self_shadow_polygon_offset = shadow_cast.self_shadow_polygon_offset;
    if (subs_shadow_receive)
        shadow_params.self_shadow_normal_offset = subs_shadow_receive.self_shadow_normal_offset;

    shadow_params.enable_csm = shs.enable_csm;
    shadow_params.csm_num = shs.csm_num;
    shadow_params.csm_first_cascade_border = shs.csm_first_cascade_border;
    shadow_params.first_cascade_blur_radius = shs.first_cascade_blur_radius;
    shadow_params.csm_last_cascade_border = shs.csm_last_cascade_border;
    shadow_params.last_cascade_blur_radius = shs.last_cascade_blur_radius;

    shadow_params.fade_last_cascade = shs.fade_last_cascade;
    shadow_params.blend_between_cascades = shs.blend_between_cascades;

    if (shs.enable_csm) {
        shadow_params.csm_borders = m_scenes.get_csm_borders(active_scene,
                subs_main.camera);
        shadow_params.blur_radii = new Float32Array(shs.csm_num);
        shadow_params.blur_radii.set(subs_main.camera.pcf_blur_radii.subarray(0,
                shs.csm_num));
    } else {
        shadow_params.csm_borders = null;
        shadow_params.blur_radii = null;
    }


    return shadow_params;
}

/**
 * Set shadow params
 * @method module:scenes.set_shadow_params
 * @param {ShadowParams} shadow_params Shadow params
 * @example var m_scenes = require("scenes");
 *
 * m_scenes.set_shadow_params({ blend_between_cascades: true,
 *                              blur_radii: null,
 *                              csm_borders: null,
 *                              csm_first_cascade_border: 10,
 *                              csm_last_cascade_border: 100,
 *                              csm_num: 1,
 *                              csm_resolution: 2048,
 *                              enable_csm: true,
 *                              fade_last_cascade: true,
 *                              first_cascade_blur_radius: 3,
 *                              last_cascade_blur_radius: 1.5,
 *                              self_shadow_normal_offset: 0.01,
 *                              self_shadow_polygon_offset: 1 });
 */
exports.set_shadow_params = function(shadow_params) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }

    var active_scene = m_scenes.get_active();

    if (typeof shadow_params.self_shadow_polygon_offset == "number")
        m_graph.traverse(active_scene._render.graph, function(node, attr) {
            if (attr.type == m_subs.SHADOW_CAST)
                attr.self_shadow_polygon_offset = shadow_params.self_shadow_polygon_offset;
        });

    var subs_shadow_receives = m_scenes.subs_array(active_scene, [m_subs.SHADOW_RECEIVE]);
    for (var i = 0; i < subs_shadow_receives.length; i++) {
        var subs_shadow_receive = subs_shadow_receives[i];
        if (typeof shadow_params.self_shadow_normal_offset == "number")
            subs_shadow_receive.self_shadow_normal_offset = shadow_params.self_shadow_normal_offset;
        if (typeof shadow_params.pcf_blur_radius == "number")
            subs_shadow_receive.pcf_blur_radius = shadow_params.pcf_blur_radius;
    }

    var subs_main_blends = m_scenes.subs_array(active_scene, [m_subs.MAIN_BLEND]);
    for (var i = 0; i < subs_main_blends.length; i++) {
        var subs_main_blend = subs_main_blends[i];
        if (typeof shadow_params.self_shadow_normal_offset == "number")
            subs_main_blend.self_shadow_normal_offset = shadow_params.self_shadow_normal_offset;
        if (typeof shadow_params.pcf_blur_radius == "number")
            subs_main_blend.pcf_blur_radius = shadow_params.pcf_blur_radius;

        subs_main_blend.need_perm_uniforms_update = true;
    }

    var shs = active_scene._render.shadow_params;
    if (typeof shadow_params.csm_first_cascade_border == "number")
        shs.csm_first_cascade_border = shadow_params.csm_first_cascade_border;
    if (typeof shadow_params.first_cascade_blur_radius == "number")
        shs.first_cascade_blur_radius = shadow_params.first_cascade_blur_radius;
    if (typeof shadow_params.csm_last_cascade_border == "number")
        shs.csm_last_cascade_border = shadow_params.csm_last_cascade_border;
    if (typeof shadow_params.last_cascade_blur_radius == "number")
        shs.last_cascade_blur_radius = shadow_params.last_cascade_blur_radius;

    // update directives; only depth subs supported
    if (subs_shadow_receive) {
        var draw_data = subs_shadow_receive.draw_data;
        for (var i = 0; i < draw_data.length; i++) {
            var bundles = draw_data[i].bundles;
            for (var j = 0; j < bundles.length; j++) {

                var bundle = bundles[j];

                if (!bundle.obj_render.shadow_receive)
                    continue;

                var batch = bundle.batch;
                m_batch.assign_shadow_receive_dirs(batch, shs);

                m_batch.update_shader(batch);
                m_subs.append_draw_data(subs_shadow_receive, bundle)
            }
        }
        subs_shadow_receive.need_perm_uniforms_update = true;
    }

    var cam_scene_data = m_obj_util.get_scene_data(active_scene._camera, active_scene);
    var upd_cameras = cam_scene_data.cameras;
    for (var i = 0; i < upd_cameras.length; i++)
        m_cam.update_camera_shadows(upd_cameras[i], shs);

    m_scenes.schedule_shadow_update(active_scene);
}

/**
 * Get horizon and zenith colors of the environment.
 * @method module:scenes.get_environment_colors
 * @returns {Array} Environment colors
 * @example var m_scenes = require("scenes");
 *
 * var environment_colors = m_scenes.get_environment_colors();
 */
exports.get_environment_colors = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return [];
    }
    var active_scene = m_scenes.get_active();
    return m_scenes.get_environment_colors(active_scene);
}

/**
 * Set horizon and/or zenith color(s) of the environment.
 * @method module:scenes.set_environment_colors
 * @param {number} [opt_environment_energy] Environment Energy
 * @param {RGB} [opt_horizon_color] Horizon color
 * @param {RGB} [opt_zenith_color] Zenith color
 * @example var m_rgb = require("rgb");
 * var m_scenes = require("scenes");
 *
 * var horizon_color = m_rgb.from_values(0.5, 0.1, 0.1);
 * var zenith_color = m_rgb.from_values(0.1, 0.1, 0.8);
 *
 * m_scenes.set_environment_colors(0.8, horizon_color, zenith_color);
 */
exports.set_environment_colors = function(opt_environment_energy,
        opt_horizon_color, opt_zenith_color) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }
    var active_scene = m_scenes.get_active();
    var subs = m_scenes.get_subs(active_scene, m_subs.MAIN_OPAQUE);

    var energy = opt_environment_energy || opt_environment_energy == 0 ?
                            parseFloat(opt_environment_energy):
                            subs.environment_energy;
    var horizon_color = opt_horizon_color || opt_horizon_color == 0 ?
                            opt_horizon_color:
                            subs.horizon_color;
    var zenith_color = opt_zenith_color || opt_zenith_color == 0 ?
                            opt_zenith_color:
                            subs.zenith_color;

    m_scenes.set_environment_colors(active_scene, energy,
                horizon_color, zenith_color);
}

/**
 * Get fog color and density.
 * @method module:scenes.get_fog_color_density
 * @param {Vec4} dest Destination vector [C,C,C,D]
 * @returns {Vec4} Destination vector
 * @example var m_scenes = require("scenes");
 *
 * var fog_density = new Float32Array(4);
 * m_scenes.get_fog_color_density(fog_density);
 */
exports.get_fog_color_density = function(dest) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }
    var active_scene = m_scenes.get_active();
    return m_scenes.get_fog_color_density(active_scene, dest);
}

/**
 * Set fog color and density
 * @method module:scenes.set_fog_color_density
 * @param {Vec4} val Color-density vector [C,C,C,D]
 * @example var m_scenes = require("scenes");
 *
 * m_scenes.set_fog_color_density([0.5, 0.5, 0.7, 0.05]);
 */
exports.set_fog_color_density = function(val) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }
    var active_scene = m_scenes.get_active();
    m_scenes.set_fog_color_density(active_scene, val);
}

/**
 * Get fog params
 * @method module:scenes.get_fog_params
 * @returns {FogParams} Fog params
 * @cc_externs fog_intensity fog_intensity fog intensity
 * @cc_externs fog_depth fog_depth fog_depth
 * @cc_externs fog_start fog_start fog start
 * @cc_externs fog_height fog_height fog height
 * @example var m_scenes = require("scenes");
 *
 * var fog_params = m_scenes.get_fog_params();
 */
exports.get_fog_params = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }
    var active_scene = m_scenes.get_active();

    var fog_params = {};
    fog_params.fog_intensity = m_scenes.get_fog_intensity(active_scene);
    fog_params.fog_depth     = m_scenes.get_fog_depth(active_scene);
    fog_params.fog_start     = m_scenes.get_fog_start(active_scene);
    fog_params.fog_height    = m_scenes.get_fog_height(active_scene);

    return fog_params;
}

/**
 * Set fog params
 * @method module:scenes.set_fog_params
 * @param {FogParams} fog_params Fog params
 * @example var m_scenes = require("scenes");
 *
 * m_scenes.set_fog_params({ fog_intensity: 1,
 *                           fog_depth: 25,
 *                           fog_start: 5,
 *                           fog_height: 0 });
 */
exports.set_fog_params = function(fog_params) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }
    var active_scene = m_scenes.get_active();

    if (typeof fog_params.fog_intensity == "number")
        m_scenes.set_fog_intensity(active_scene, fog_params.fog_intensity);
    if (typeof fog_params.fog_depth == "number")
        m_scenes.set_fog_depth(active_scene, fog_params.fog_depth);
    if (typeof fog_params.fog_start == "number")
        m_scenes.set_fog_start(active_scene, fog_params.fog_start);
    if (typeof fog_params.fog_height == "number")
        m_scenes.set_fog_height(active_scene, fog_params.fog_height);
}

/**
 * Get SSAO params
 * @method module:scenes.get_ssao_params
 * @returns {SSAOParams} SSAO params
 * @example var m_scenes = require("scenes");
 *
 * var ssao_params = m_scenes.get_ssao_params();
 */
exports.get_ssao_params = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }
    var active_scene = m_scenes.get_active();
    return m_scenes.get_ssao_params(active_scene);
}

/**
 * Set SSAO params
 * @method module:scenes.set_ssao_params
 * @param {SSAOParams} ssao_params SSAO params
 * @example var m_scenes = require("scenes");
 *
 * m_scenes.set_ssao_params({ quality: 16,
 *                            radius_increase: 3,
 *                            use_hemisphere: true,
 *                            use_blur_depth: false,
 *                            blur_discard_value: 1,
 *                            influence: 0.7,
 *                            dist_factor: 0,
 *                            ssao_white: false,
 *                            ssao_only: false });
 */
exports.set_ssao_params = function(ssao_params) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }
    var scene = m_scenes.get_active();

    var subscenes = m_scenes.subs_array(scene, [m_subs.SSAO]);
    var subscenes_blur = m_scenes.subs_array(scene, [m_subs.SSAO_BLUR]);

    if (!subscenes.length) {
        m_print.error("SSAO is not enabled on the scene");
        return 0;
    }

    for (var i = 0; i < subscenes.length; i++)
        set_params_ssao_subs(subscenes[i], subscenes_blur[i], ssao_params);
}

function set_params_ssao_subs(subs, subs_blur, ssao_params) {
    var scene = m_scenes.get_active();
    
    var bundle = subs.draw_data[0].bundles[0];
    var batch = bundle.batch;

    var bundle_blur = subs_blur.draw_data[0].bundles[0];
    var batch_blur = bundle_blur.batch;

    if ("quality" in ssao_params) {
        var quality = ssao_params.quality
        if (quality === 8 || quality === 16 || quality === 24 || quality === 32) {
            subs.ssao_samples = quality;
            m_batch.set_batch_directive(batch, "SSAO_QUALITY", "SSAO_QUALITY_" 
                    + quality);
            m_batch.update_shader(batch);
            m_subs.append_draw_data(subs, bundle);
        } else
            m_print.error("set_ssao_params(): Wrong \"quality\" value.");
    }

    if ("use_hemisphere" in ssao_params) {
        subs.ssao_hemisphere = ssao_params.use_hemisphere;
        m_batch.set_batch_directive(batch, "SSAO_HEMISPHERE", 
                ssao_params.use_hemisphere | 0);
        m_batch.update_shader(batch);
        m_subs.append_draw_data(subs, bundle);
    }

    if ("use_blur_depth" in ssao_params) {
        subs_blur.ssao_blur_depth = ssao_params.use_blur_depth;
        m_batch.set_batch_directive(batch_blur, "SSAO_BLUR_DEPTH", 
                ssao_params.use_blur_depth | 0);
        m_batch.update_shader(batch_blur);
        m_subs.append_draw_data(subs_blur, bundle_blur);
        m_scgraph.connect_render_targets_batch(scene._render.graph, subs_blur, batch_blur, false);
    }

    if ("ssao_white" in ssao_params) {
        subs.ssao_white = ssao_params.ssao_white;
        m_batch.set_batch_directive(batch, "SSAO_WHITE", 
                ssao_params.ssao_white | 0);
        m_batch.update_shader(batch);
        m_subs.append_draw_data(subs, bundle);
    }

    if ("blur_discard_value" in ssao_params)
        subs_blur.ssao_blur_discard_value = ssao_params.blur_discard_value;

    if ("radius_increase" in ssao_params)
        subs.ssao_radius_increase = ssao_params.radius_increase;

    if ("influence" in ssao_params)
        subs.ssao_influence = ssao_params.influence;

    if ("dist_factor" in ssao_params)
        subs.ssao_dist_factor = ssao_params.dist_factor;

    if (typeof ssao_params.ssao_only == "boolean") {
        // FIX: in case of stereo mode there are 2 MAIN_OPAQUE
        var subs_main = m_scenes.get_subs(scene, m_subs.MAIN_OPAQUE);
        subs_main.ssao_only = ssao_params.ssao_only;
        var draw_data = subs_main.draw_data;
        var append_bundles = [];
        for (var i = 0; i < draw_data.length; i++) {
            var bundles = draw_data[i].bundles;
            for (var j = 0; j < bundles.length; j++) {
                var batch_main = bundles[j].batch;
                m_batch.set_batch_directive(batch_main, "SSAO_ONLY",
                        ssao_params.ssao_only | 0);
                m_batch.update_shader(batch_main);
                append_bundles.push(bundles[j]);
            }
        }
        for (var i = 0; i < append_bundles.length; i++)
            m_subs.append_draw_data(subs_main, append_bundles[i]);
    }

    subs.need_perm_uniforms_update = true;
    subs_blur.need_perm_uniforms_update = true;
}

/**
 * Get color correction params
 * @method module:scenes.get_color_correction_params
 * @returns {ColorCorrectionParams} Color correction params
 * @example var m_scenes = require("scenes");
 *
 * var color_parameters = m_scenes.get_color_correction_params();
 */
exports.get_color_correction_params = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return null;
    }

    var active_scene = m_scenes.get_active();
    var subs = m_scenes.get_subs(active_scene, m_subs.COMPOSITING);
    if (!subs)
        return null;

    var compos_params = {};

    compos_params.brightness = subs.brightness;
    compos_params.contrast = subs.contrast;
    compos_params.exposure = subs.exposure;
    compos_params.saturation = subs.saturation;

    return compos_params;
}

/**
 * Set color correction params.
 * @method module:scenes.set_color_correction_params
 * @param {ColorCorrectionParams} color_corr_params Color correction params.
 * @example var m_scenes = require("scenes");
 * 
 * m_scenes.set_color_correction_params({ brightness: 0.2,
 *                                        contrast: 0.4,
 *                                        exposure: 0.9,
 *                                        saturation: 0.5 });
 */
exports.set_color_correction_params = function(color_corr_params) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }

    var active_scene = m_scenes.get_active();
    var subs = m_scenes.get_subs(active_scene, m_subs.COMPOSITING);
    if (!subs)
        return;

    if ("brightness" in color_corr_params)
        subs.brightness = color_corr_params.brightness;

    if ("contrast" in color_corr_params)
        subs.contrast = color_corr_params.contrast;

    if ("exposure" in color_corr_params)
        subs.exposure = color_corr_params.exposure;

    if ("saturation" in color_corr_params)
        subs.saturation = color_corr_params.saturation;

    subs.need_perm_uniforms_update = true;
}

/**
 * Get sky params
 * @method module:scenes.get_sky_params
 * @returns {SkyParams} Sky params
 * @example var m_scenes = require("scenes");
 *
 * var sky_params = m_scenes.get_sky_params();
 */
exports.get_sky_params = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }
    var active_scene = m_scenes.get_active();
    return m_scenes.get_sky_params(active_scene);
}

/**
 * Set sky params
 * @method module:scenes.set_sky_params
 * @param {SkyParams} sky_params Sky params
 * @example var m_scenes = require("scenes");
 *
 * m_scenes.set_sky_params({ rayleigh_brightness: 3.3,
 *                           mie_brightness: 0.1,
 *                           spot_brightness: 20,
 *                           scatter_strength: 0.2,
 *                           rayleigh_strength: 0.2,
 *                           mie_strength: 0.006,
 *                           rayleigh_collection_power: 0.35,
 *                           mie_collection_power: 0.5,
 *                           mie_distribution: 0.4,
 *                           color: [0.3, 0.9, 0.3] });
 */
exports.set_sky_params = function(sky_params) {
    
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }
    var scene = m_scenes.get_active();

    var subs = m_scenes.get_subs(scene, m_subs.SKY);
    if (subs) {
        // procedural_skydome and use_as_environment_lighting are readonly

        if ("color" in sky_params)
            subs.sky_color.set(sky_params.color);

        if ("rayleigh_brightness" in sky_params)
            subs.rayleigh_brightness = sky_params.rayleigh_brightness;

        if ("mie_brightness" in sky_params)
            subs.mie_brightness = sky_params.mie_brightness;

        if ("spot_brightness" in sky_params)
            subs.spot_brightness = sky_params.spot_brightness;

        if ("scatter_strength" in sky_params)
            subs.scatter_strength = sky_params.scatter_strength;

        if ("rayleigh_strength" in sky_params)
            subs.rayleigh_strength = sky_params.rayleigh_strength;

        if ("mie_strength" in sky_params)
            subs.mie_strength = sky_params.mie_strength;

        if ("rayleigh_collection_power" in sky_params)
            subs.rayleigh_collection_power = sky_params.rayleigh_collection_power;

        if ("mie_collection_power" in sky_params)
            subs.mie_collection_power = sky_params.mie_collection_power;

        if ("mie_distribution" in sky_params)
            subs.mie_distribution = sky_params.mie_distribution;

        subs.need_perm_uniforms_update = true;
        subs.need_fog_update = true;
        m_scenes.update_sky(scene, subs);
    }
}

/**
 * Get depth-of-field (DOF) params.
 * @method module:scenes.get_dof_params
 * @returns {DOFParams} The object containing DOF parameters.
 * @example var m_scenes = require("scenes");
 *
 * var dof_params = m_scenes.get_dof_params();
 */
exports.get_dof_params = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }
    var active_scene = m_scenes.get_active();
    var subs = m_scenes.get_subs(active_scene, m_subs.DOF);
    if (subs)
        return m_scenes.get_dof_params(active_scene);
    else
        return null;
}

/**
 * Set depth-of-field (DOF) params
 * @method module:scenes.set_dof_params
 * @param {DOFParams} dof_params The object containing DOF parameters.
 * @example
 * var m_scenes = require("scenes");
 *
 * // adjusting the front/rear distances
 * m_scenes.set_dof_params({ dof_front_start: 0, 
 *         dof_front_end: 2, 
 *         dof_rear_start: 0, 
 *         dof_rear_end: 5 });
 *
 * // disabling the DOF effect
 * m_scenes.set_dof_params({ dof_on: false });
 */
exports.set_dof_params = function(dof_params) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }
    var active_scene = m_scenes.get_active();
    m_scenes.set_dof_params(active_scene, dof_params);
}

/**
 * Get god rays parameters
 * @method module:scenes.get_god_rays_params
 * @returns {GodRaysParams} god rays parameters
 * @example var m_scenes = require("scenes");
 *
 * var god_ray_params = m_scenes.get_god_rays_params();
 */
exports.get_god_rays_params = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }
    var active_scene = m_scenes.get_active();
    var subs = m_scenes.get_subs(active_scene, m_subs.GOD_RAYS);
    if (subs)
        return m_scenes.get_god_rays_params(active_scene);
    else
        return null;
}

/**
 * Set god rays parameters
 * @method module:scenes.set_god_rays_params
 * @param {GodRaysParams} god_rays_params God rays parameters
 * @cc_externs god_rays_max_ray_length god_rays_intensity god_rays_steps
 * @example var m_scenes = require("scenes");
 *
 * m_scenes.set_god_rays_params({ god_rays_max_ray_length: 1,
 *                                god_rays_intensity: 0.7,
 *                                god_rays_steps: 10 });
 */
exports.set_god_rays_params = function(god_rays_params) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }
    var active_scene = m_scenes.get_active();
    m_scenes.set_god_rays_params(active_scene, god_rays_params);
}

/**
 * Get bloom parameters
 * @method module:scenes.get_bloom_params
 * @returns {BloomParams} bloom parameters
 * @example var m_scenes = require("scenes");
 *
 * var bloom_parameters = m_scenes.get_bloom_params();
 */
exports.get_bloom_params = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }
    var active_scene = m_scenes.get_active();
    var subs = m_scenes.get_subs(active_scene, m_subs.BLOOM);
    if (subs)
        return m_scenes.get_bloom_params(active_scene);
    else
        return null;
}

/**
 * Set bloom parameters
 * @method module:scenes.set_bloom_params
 * @param {BloomParams} bloom_params Bloom parameters
 * @example var m_scenes = require("scenes");
 *
 * m_scenes.set_bloom_params({ key: 1, edge_lum: 0.5, blur: 4 });
 */
exports.set_bloom_params = function(bloom_params) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }
    var active_scene = m_scenes.get_active();
    m_scenes.set_bloom_params(active_scene, bloom_params);
}

/**
 * Get glow material parameters
 * @method module:scenes.get_glow_material_params
 * @returns {GlowMaterialParams} glow material parameters
 * @example var m_scenes = require("scenes");
 *
 * var glow_params = m_scenes.get_glow_material_params();
 */
exports.get_glow_material_params = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }

    var active_scene = m_scenes.get_active();
    var subs = m_scenes.get_subs(active_scene, m_subs.GLOW_COMBINE);
    if (subs)
        return m_scenes.get_glow_material_params(active_scene);
    else
        return null;
}

/**
 * Set glow material parameters
 * @method module:scenes.set_glow_material_params
 * @param {GlowMaterialParams} glow_material_params Glow material parameters
 * @cc_externs small_glow_mask_coeff large_glow_mask_coeff small_glow_mask_width large_glow_mask_width
 */
exports.set_glow_material_params = function(glow_material_params) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }

    var active_scene = m_scenes.get_active();
    m_scenes.set_glow_material_params(active_scene, glow_material_params);
}

/**
 * Get wind parameters
 * @method module:scenes.get_wind_params
 * @returns {WindParams} Wind params
 * @example var m_scenes = require("scenes");
 *
 * var wind_parameters = m_scenes.get_wind_params();
 */
exports.get_wind_params = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }
    var active_scene = m_scenes.get_active();
    return m_scenes.get_wind_params(active_scene);
}

/**
 * Set wind parameters
 * @method module:scenes.set_wind_params
 * @param {WindParams} wind_params Wind parameters
 * @example var m_scenes = require("scenes");
 *
 * m_scenes.set_wind_params({ wind_dir: 90,
 *                            wind_strength: 3 });
 */
exports.set_wind_params = function(wind_params) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }
    var active_scene = m_scenes.get_active();
    m_obj.set_wind_params(active_scene, wind_params);
}

/**
 * Get water surface level.
 * @method module:scenes.get_water_surface_level
 * @param {number} pos_x World x position
 * @param {number} pos_y World y position
 * @returns {number} Surface level
 * @example var m_scenes = require("scenes");
 *
 * var water_level = m_scenes.get_water_surface_level(10.3, 15.6);
 */
exports.get_water_surface_level = function(pos_x, pos_y) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return 0;
    }
    var active_scene = m_scenes.get_active();
    if (!active_scene._render.water_params) {
        m_print.error("No water parameters on the active scene");
        return 0;
    }
    return m_scenes.get_water_surface_level(active_scene, pos_x, pos_y);
}

/**
 * Set water params
 * @method module:scenes.set_water_params
 * @param {WaterParams} water_params Water parameters
 * @cc_externs waves_height waves_length water_fog_density water_fog_color
 * @cc_externs dst_noise_scale0 dst_noise_scale1 dst_noise_freq0 dst_noise_freq1
 * @cc_externs dir_min_shore_fac dir_freq dir_noise_scale dir_noise_freq
 * @cc_externs dir_min_noise_fac dst_min_fac waves_hor_fac water_dynamic
 */
exports.set_water_params = function(water_params) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }
    var active_scene = m_scenes.get_active();
    m_scenes.set_water_params(active_scene, water_params);
}

/**
 * Get water material parameters.
 * @method module:scenes.get_water_mat_params
 * @param {WaterParams} water_params Water parameters
 */
exports.get_water_mat_params = function(water_params) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }
    var active_scene = m_scenes.get_active();
    m_scenes.get_water_mat_params(active_scene, water_params);
}

/**
 * Update scene materials parameters.
 * @method module:scenes.update_scene_materials_params
 * @example var m_scenes = require("scenes");
 *
 * m_scenes.update_scene_materials_params();
 */
exports.update_scene_materials_params = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }
    var active_scene = m_scenes.get_active();
    m_scenes.update_scene_permanent_uniforms(active_scene);
}
/**
 * Hide object and his children if it's necessary.
 * Supported only for dynamic meshes/empties and lamps.
 * @method module:scenes.hide_object
 * @param {Object3D} obj Object 3D
 * @param {boolean} [ignore_children=false] Don't hide child objects.
 * @example var m_scenes = require("scenes");
 * var cube = m_scenes.get_object_by_name("Cube");
 *
 * m_scenes.hide_object(cube); 
 */
exports.hide_object = function(obj, ignore_children) {
    ignore_children = ignore_children || false;
    if (!is_hideable(obj))
        m_print.error("show/hide is only supported for dynamic objects.");
    else
        if (ignore_children)
            m_scenes.change_visibility(obj, true);
        else
            m_scenes.change_visibility_rec(obj, true);
}
/**
 * Show object and his children if it's necessary.
 * Supported only for dynamic meshes/empties and lamps.
 * @method module:scenes.show_object
 * @param {Object3D} obj Object 3D
 * @param {boolean} [ignore_children=false] Don't show child objects.
 * @example var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 *
 * m_scenes.show_object(cube);
 */
exports.show_object = function(obj, ignore_children) {
    ignore_children = ignore_children || false;
    if (!is_hideable(obj))
        m_print.error("show/hide is only supported for dynamic objects.");
    else
        if (ignore_children)
            m_scenes.change_visibility(obj, false);
        else
            m_scenes.change_visibility_rec(obj, false);
}
/**
 * Check if object is hidden.
 * Supported only for dynamic meshes/empties and lamps.
 * @method module:scenes.is_hidden
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Check result
 * @example var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 *
 * var object_is_hidden = m_scenes.is_hidden(cube);
 */
exports.is_hidden = function(obj) {
    if (is_hideable(obj)) {
        return m_scenes.is_hidden(obj);
    } else {
        m_print.error("show/hide is only supported for dynamic meshes/empties and lamps");
        return false;
    }
}

function is_hideable(obj) {
    return m_obj_util.is_dynamic_mesh(obj) || m_obj_util.is_empty(obj)
            || m_obj_util.is_line(obj) || m_obj_util.is_lamp(obj)
}

/**
 * Check if object is visible.
 * @method module:scenes.is_visible
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Check result
 * @example var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 *
 * var object_is_visible = m_scenes.is_visible(cube);
 */
exports.is_visible = function(obj) {
    return obj.render.is_visible;
}

/**
 * Check if object with given name is present on scene.
 * @method module:scenes.check_object_by_name
 * @param {string} name Object name
 * @param {number} [data_id=0] ID of loaded data
 * @returns {boolean} Check result
 */
exports.check_object_by_name = function(name, data_id) {
    var obj = m_obj.get_object(m_obj.GET_OBJECT_BY_NAME, name,
            data_id | 0, true);
    if (obj)
        return true;
    else
        return false;
}

/**
 * Check if duplicated object is present on scene by empty name and dupli name.
 * @method module:scenes.check_object_by_dupli_name
 * @param {string} empty_name Name of the EMPTY object used to duplicate the object
 * @param {string} dupli_name Name of the duplicated object
 * @param {number} [data_id=0] ID of loaded data
 * @returns {boolean} Check result
 */
exports.check_object_by_dupli_name = function(empty_name, dupli_name,
        data_id) {
    var obj = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME, empty_name,
            dupli_name, data_id | 0);
    if (obj)
        return true;
    else
        return false;
}

/**
 * Check if duplicated object is present on scene by empty name and dupli name list.
 * @method module:scenes.check_object_by_dupli_name_list
 * @param {string[]} name_list List of the EMPTY and DUPLI object names: [empty_name,empty_name,...,dupli_name]
 * @param {number} [data_id=0] ID of loaded data
 * @returns {boolean} Check result
 */
exports.check_object_by_dupli_name_list = function(name_list, data_id) {
    var obj = m_obj.get_object(m_obj.GET_OBJECT_BY_DUPLI_NAME_LIST,
            name_list, data_id | 0);
    if (obj)
        return true;
    else
        return false;
}

/**
 * Get all objects from the active scene.
 * @method module:scenes.get_all_objects
 * @param {string} [type="ALL"] Object type.
 * @param {number} [data_id=DATA_ID_ALL] Objects data id
 * @returns {Object3D[]} Array with objects.
 * @example var m_scenes = require("scenes");
 *
 * // get objects of all types
 * var scene_object_list = m_scenes.get_all_objects();
 *
 * // get all MESH objects
 * var scene_object_list = m_scenes.get_all_objects("MESH");
 *
 * // get all SPEAKER objects from the first dynamically loaded scene
 * var scene_object_list = m_scenes.get_all_objects("SPEAKER", 1);
 */
exports.get_all_objects = function(type, data_id) {
    var scene = m_scenes.get_active();

    if (!type)
        type = "ALL";

    if (!data_id && data_id !== 0)
        data_id = m_obj.DATA_ID_ALL;

    return m_obj.get_scene_objs_derived(scene, type, data_id);
}

/**
 * Get the object's name.
 * @method module:scenes.get_object_name
 * @param {Object3D} obj Object 3D
 * @returns {string} Object name
 * @example var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * 
 * var object_name = m_scenes.get_object_name(cube);
 */
exports.get_object_name = function(obj) {
    if (!obj) {
        m_print.error("Wrong object name");
        return "";
    }
    return obj.origin_name;
}

/**
 * Get the object names hierarchy (considering dupli group parenting).
 * @method module:scenes.get_object_name_hierarchy
 * @param {Object3D} obj Object 3D
 * @returns {?Array} Object names hierarchy array (from the highest parent to the object itself).
 * @example var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 *
 * var name_hierarchy = m_scenes.get_object_name_hierarchy(cube);
 */
exports.get_object_name_hierarchy = function(obj) {
    if (!obj) {
        m_print.error("Wrong object name");
        return null;
    }

    var names = [];
    var curr_obj = obj;
    while (curr_obj) {
        names.push(curr_obj.origin_name);
        curr_obj = m_obj_util.get_dg_parent(curr_obj);
    }
    return names.reverse();
}

/**
 * Get the object's type.
 * @method module:scenes.get_object_type
 * @param {Object3D} obj Object 3D
 * @returns {string} Object type
 * @example var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 *
 * var object_type = m_scenes.get_object_type(cube);
 */
exports.get_object_type = function(obj) {
    if (!(obj && obj.type)) {
        m_print.error("Wrong object");
        return "UNDEFINED";
    }

    return obj.type;
}

/**
 * Return the object's children.
 * @method module:scenes.get_object_children
 * @param {Object3D} obj Object 3D
 * @returns {Object3D[]} Array of children objects.
 * @example var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 *
 * var object_children = m_scenes.get_object_children(cube);
 */
exports.get_object_children = function(obj) {
    return obj.cons_descends.slice(0);
}

/**
 * Find the first character on the active scene.
 * @method module:scenes.get_first_character
 * @returns {Object3D} Character object.
 * @example var m_scenes = require("scenes");
 *
 * var character = m_scenes.get_first_character();
 */
exports.get_first_character = function() {
    return m_obj.get_first_character(m_scenes.get_active());
}

/**
 * Return the distance to the shore line.
 * @method module:scenes.get_shore_dist
 * @param {Vec3} trans Current translation.
 * @param {number} [v_dist_mult=1] Vertical distance multiplier.
 * @returns {number} Distance.
 */
exports.get_shore_dist = function(trans, v_dist_mult) {
    if (!v_dist_mult && v_dist_mult !== 0)
        v_dist_mult = 1;

    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return 0;
    }

    var active_scene = m_scenes.get_active();

    return m_scenes.get_shore_dist(active_scene, trans, v_dist_mult);
}

/**
 * Return the camera water depth or null if there is no water.
 * @method module:scenes.get_cam_water_depth
 * @returns {number} Depth
 * @example var m_scenes = require("scenes");
 *
 * var water_depth = m_scenes.get_cam_water_depth();
 */
exports.get_cam_water_depth = function() {
    return m_scenes.get_cam_water_depth();
}

/**
 * Return render type of mesh object or null.
 * @method module:scenes.get_type_mesh_object
 * @param {Object3D} obj Object 3D.
 * @returns {string} Render type: "DYNAMIC" or "STATIC" or ""(for non meshes).
 * @example var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * var type = m_scenes.get_type_mesh_object(cube);
 */
exports.get_type_mesh_object = function(obj) {
    if (m_obj_util.is_mesh(obj))
        return obj.render.type;
    return "";
}

/**
 * Get the Blender-assigned meta tags from the active scene.
 * @method module:scenes.get_meta_tags
 * @returns {SceneMetaTags} Scene meta tags
 * @example var m_scenes = require("scenes");
 *
 * var meta_tags = m_scenes.get_meta_tags();
 */
exports.get_meta_tags = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }

    var active_scene = m_scenes.get_active();

    return m_scenes.get_meta_tags(active_scene);
}

/**
 * Get the Blender-assigned custom property from the active scene.
 * @method module:scenes.get_custom_prop
 * @returns {*} Scene custom property
 */
exports.get_custom_prop = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }

    var active_scene = m_scenes.get_active();

    return m_scenes.get_custom_prop(active_scene);
}
/**
 * Append copied object to the scene.
 * @method module:scenes.append_object
 * @param {Object3D} obj Object 3D
 * @param {string} [scene_name] Name of the scene
 * @example var m_scs = require("scenes");
 * var m_obj = require("objects");
 *
 * var src_obj = m_scs.get_object_by_name("Plane");
 * var deep_copy = m_obj.copy(src_obj, "deep_copy", true); 
 *
 * m_scs.append_object(deep_copy);
 */
exports.append_object = function(obj, scene_name) {

    if (scene_name) {
        var scenes = m_scenes.get_all_scenes();
        var scene = m_util.keysearch("name", scene_name, scenes);
    } else
        var scene = m_scenes.get_active();

    m_scenes.append_object(scene, obj, true);
}
/**
 * Remove dynamic object from all scenes.
 * Removing objects with static physics isn't supported.
 * @method module:scenes.remove_object
 * @param {Object3D} obj Object 3D
 * @example var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 *
 * m_scenes.remove_object(cube);
 */
exports.remove_object = function(obj) {
    if (!m_obj_util.is_dynamic_mesh(obj) && !m_obj_util.is_empty(obj) &&
            !m_obj_util.is_line(obj)) {
        m_print.error("Can't remove object \"" + obj.name + "\". It must be " +
                "dynamic and type of MESH or EMPTY.");
        return;
    }

    // cleanup only vbo/ibo/vao buffers for deep copied objects
    m_obj.obj_switch_cleanup_flags(obj, obj.render.is_copied_deep, false, false);
    m_data.prepare_object_unloading(obj);
    m_obj.obj_switch_cleanup_flags(obj, true, true, true);
    m_obj.remove_object(obj);
}
/**
 * Get timeline marker frame by name.
 * @method module:scenes.marker_frame
 * @param {string} name Timeline marker name
 * @returns {number} Timeline marker frame
 */
exports.marker_frame = function(name) {
    var active_scene = m_scenes.get_active();
    if (active_scene["timeline_markers"]
            && name in active_scene["timeline_markers"])
        return m_scenes.marker_frame(active_scene, name);
    else {
        m_print.error("\"" + name + "\" marker not found.");
        return 0;
    }
}
/**
 * Get motion blur params.
 * @method module:scenes.get_mb_params
 * @returns {MotionBlurParams} Motion blur params
 * @example var m_scenes = require("scenes");
 *
 * var motion_blur_params = m_scenes.get_mb_params();
 */
exports.get_mb_params = function() {
    var scene = m_scenes.get_active();
    var mb_subs = m_scenes.get_subs(scene, m_subs.MOTION_BLUR);
    if (mb_subs) {
        var mb_params = {mb_factor : mb_subs.mb_factor,
                mb_decay_threshold : mb_subs.mb_decay_threshold};
        return mb_params;
    } else
        return null;
}
/**
 * Set motion blur params.
 * @method module:scenes.set_mb_params
 * @param {MotionBlurParams} mb_params Motion blur params
 * @cc_externs mb_factor mb_decay_threshold
 * @example var m_scenes = require("scenes");
 *
 * m_scenes.set_mb_params({ mb_factor: 0.1,
 *                          mb_decay_threshold: 0.01 });
 */
exports.set_mb_params = function(mb_params) {
    var scene = m_scenes.get_active();
    var mb_subscenes = m_scenes.subs_array(scene, [m_subs.MOTION_BLUR]);

    if (!mb_subscenes.length) {
        m_print.error("The motion blur subscene doesn't exist.")
        return;
    }

    for (var i = 0; i < mb_subscenes.length; i++) {
        var mb_subs = mb_subscenes[i];
        if (typeof mb_params.mb_decay_threshold == "number")
            mb_subs.mb_decay_threshold = mb_params.mb_decay_threshold;
        if (typeof mb_params.mb_factor == "number")
            mb_subs.mb_factor = mb_params.mb_factor;
    }
}

/**
 * Check if objects can be selected.
 * @method module:scenes.can_select_objects
 * @returns {boolean} True if objects can be selected.
 * @example var m_scenes = require("scenes");
 *
 * var objects_selectable = m_scenes.can_select_objects();
 */
exports.can_select_objects = function() {
    var scene = m_scenes.get_active();
    return Boolean(m_scenes.get_subs(scene, m_subs.COLOR_PICKING));
}

}
