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
 * Scene API.
 * Most of the routines presented here require an active scene to be set,
 * use get_active() set_active() to do that.
 * @module scenes
 * @local ColorCorrectionParams
 * @local SceneMetaTags
 * @local HMDParams
 */
b4w.module["scenes"] = function(exports, require) {

var m_batch    = require("__batch");
var m_cam      = require("__camera");
var m_data     = require("__data");
var m_graph    = require("__graph");
var m_obj      = require("__objects");
var m_obj_util = require("__obj_util");
var m_phy      = require("__physics");
var m_print    = require("__print");
var m_scenes   = require("__scenes");
var m_util     = require("__util");

/**
 * Color correction params.
 * @typedef {Object} ColorCorrectionParams
 * @property {Number} brightness Brightness
 * @property {Number} contrast Constrast
 * @property {Number} exposure Exposure
 * @property {Number} saturation Saturation
 */

/**
 * Scene meta tags.
 * @typedef SceneMetaTags
 * @type {Object}
 * @property {String} title The title meta tag.
 * @property {String} description The description meta tag.
 */

/**
 * Head-mounted display params.
 * @typedef {Object} HMDParams
 * @property {Boolean} enable_hmd_stereo Enable hmd stereo
 * @property {Array} distortion_coefs Distortion coefficient list
 * @property {Array} chromatic_aberration_coefs Chromatic aberration coefficient list
 * @property {Number} base_line_factor Tray to lens-center distance divided by screen height
 * @property {Number} inter_lens_factor Inter-lens distance divided by screen width
 */

/**
 * All possible data IDs.
 * @const module:scenes.DATA_ID_ALL
 */
exports.DATA_ID_ALL   = m_obj.DATA_ID_ALL;

/**
 * Set the active scene
 * @method module:scenes.set_active
 * @param {String} scene_name Name of the scene
 */
exports.set_active = function(scene_name) {
    // NOTE: keysearch is dangerous
    var scenes = m_scenes.get_all_scenes();
    m_scenes.set_active(m_util.keysearch("name", scene_name, scenes));
}

/**
 * Get the current active scene
 * @method module:scenes.get_active
 * @returns {String} Active scene name
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
 * @returns {String[]} Array of scene names.
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
 * @param {String} name Object name
 * @param {Number} [data_id=0] ID of loaded data
 * @returns {Object3D} Object 3D
 */
exports.get_object_by_name = function(name, data_id) {
    var obj = m_obj.get_object(m_obj.GET_OBJECT_BY_NAME, name, data_id | 0);
    if (obj)
        return obj;
    else
        m_print.error("get object " + name + ": not found");
}

/**
 * Get the duplicated object by empty name and dupli name.
 * @method module:scenes.get_object_by_dupli_name
 * @param {String} empty_name Name of the EMPTY object used to duplicate the object
 * @param {String} dupli_name Name of the duplicated object
 * @param {Number} [data_id=0] ID of loaded data
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
 * @param {String[]} name_list List of the EMPTY and DUPLI object names:
 * [empty_name,empty_name,...,dupli_name]. Can be retrieved with the get_object_name_hierarchy() method.
 * @param {Number} [data_id=0] ID of loaded data.
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
 * @param {String} name World name
 * @param {Number} [data_id=0] ID of loaded data
 * @returns {Object3D} Object 3D
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
 * @returns {Number} data_id Data ID property
 */
exports.get_object_data_id = function(obj) {
    return m_scenes.get_object_data_id(obj);
}

/**
 * For given mouse coords, render the color scene and return an object.
 * @method module:scenes.pick_object
 * @param {Number} x X Canvas coordinate.
 * @param {Number} y Y Canvas coordinate.
 */
exports.pick_object = m_obj.pick_object;

/**
 * Check if the outlining is enabled or not for the object.
 * @method module:scenes.outlining_is_enabled
 * @param {Object3D} obj Object 3D
 * @param {Boolean} value Is enabled?
 * @returns {Boolean} Checking result.
 */
exports.outlining_is_enabled = function(obj) {
    return obj && obj.render && obj.render.outlining;
}

/**
 * Set outline intensity for the object.
 * @method module:scenes.set_outline_intensity
 * @param {Object3D} obj Object 3D
 * @param {Number} value Intensity value
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
 * @returns {Number} Intensity value
 */
exports.get_outline_intensity = function(obj) {
    if (obj && obj.render && obj.render.outlining)
        return obj.render.outline_intensity;
    else
        m_print.error("get_outline_intensity(): wrong object");
}

/**
 * Apply outlining animation to the object
 * @method module:scenes.apply_outline_anim
 * @param {Object3D} obj Object 3D
 * @param {Number} tau Outlining duration
 * @param {Number} T Period of outlining
 * @param {Number} N Number of relapses (0 - infinity)
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
 */
exports.set_outline_color = m_scenes.set_outline_color;

/**
 * Get the color of outline outline effect for active scene.
 * @method module:scenes.get_outline_color
 * @param {?RGB} dest Destination RGB color vector
 * @returns {RGB} Destination RGB color vector
 */
exports.get_outline_color = function(dest) {
    var scene = m_scenes.get_active();
    var subs = m_scenes.get_subs(scene, "OUTLINE");
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
 */
exports.get_shadow_params = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }

    var active_scene = m_scenes.get_active();
    var shadow_cast  = m_scenes.get_subs(active_scene, "SHADOW_CAST");

    if (!shadow_cast)
        return null;

    var shs = active_scene._render.shadow_params;
    var subs_main = m_scenes.get_subs(active_scene, "MAIN_OPAQUE");
    var subs_shadow_receive = m_scenes.get_subs(active_scene, "SHADOW_RECEIVE");

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
 */
exports.set_shadow_params = function(shadow_params) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }

    var active_scene = m_scenes.get_active();

    if (typeof shadow_params.self_shadow_polygon_offset == "number")
        m_graph.traverse(active_scene._render.graph, function(node, attr) {
            if (attr.type === "SHADOW_CAST")
                attr.self_shadow_polygon_offset = shadow_params.self_shadow_polygon_offset;
        });

    var subs_shadow_receive = m_scenes.get_subs(active_scene, "SHADOW_RECEIVE");
    if (subs_shadow_receive) {
        if (typeof shadow_params.self_shadow_normal_offset == "number")
            subs_shadow_receive.self_shadow_normal_offset = shadow_params.self_shadow_normal_offset;
        if (typeof shadow_params.pcf_blur_radius == "number")
            subs_shadow_receive.pcf_blur_radius = shadow_params.pcf_blur_radius;
    }

    var subs_main_blend = m_scenes.get_subs(active_scene, "MAIN_BLEND");
    if (subs_main_blend) {
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
        var bundles = subs_shadow_receive.bundles;

        for (var i = 0; i < bundles.length; i++) {

            var bundle = bundles[i];

            if (!bundle.obj_render.shadow_receive)
                continue;

            var batch = bundle.batch;
            m_batch.assign_shadow_receive_dirs(batch, shs);

            m_batch.update_shader(batch);
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
 */
exports.get_environment_colors = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }
    var active_scene = m_scenes.get_active();
    return m_scenes.get_environment_colors(active_scene);
}

/**
 * Set horizon and/or zenith color(s) of the environment.
 * @method module:scenes.set_environment_colors
 * @param {Number} [opt_environment_energy] Environment Energy
 * @param {RGB} [opt_horizon_color] Horizon color
 * @param {RGB} [opt_zenith_color] Zenith color
 */
exports.set_environment_colors = function(opt_environment_energy,
        opt_horizon_color, opt_zenith_color) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }
    var active_scene = m_scenes.get_active();
    var subs = m_scenes.get_subs(active_scene, "MAIN_OPAQUE");

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
 * @param {Vec4} dest Destnation vector [C,C,C,D]
 * @returns {Vec4} Destnation vector
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
 * Get SSAO params
 * @method module:scenes.get_ssao_params
 * @returns {SSAOParams} SSAO params
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
 * @cc_externs ssao_quality radius_increase ssao_hemisphere
 * @cc_externs ssao_blur_depth ssao_blur_discard_value
 * @cc_externs influence dist_factor ssao_white ssao_only
 */
exports.set_ssao_params = function(ssao_params) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }
    var active_scene = m_scenes.get_active();
    m_scenes.set_ssao_params(active_scene, ssao_params);
}

/**
 * Get color correction params
 * @method module:scenes.get_color_correction_params
 * @returns {ColorCorrectionParams} Color correction params
 * @cc_externs brightness contrast exposure saturation
 */
exports.get_color_correction_params = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return null;
    }

    var active_scene = m_scenes.get_active();
    var subs = m_scenes.get_subs(active_scene, "COMPOSITING");
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
 */
exports.set_color_correction_params = function(color_corr_params) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }

    var active_scene = m_scenes.get_active();
    var subs = m_scenes.get_subs(active_scene, "COMPOSITING");
    if (!subs)
        return;

    if (typeof color_corr_params.brightness == "number")
        subs.brightness = color_corr_params.brightness;

    if (typeof color_corr_params.contrast == "number")
        subs.contrast = color_corr_params.contrast;

    if (typeof color_corr_params.exposure == "number")
        subs.exposure = color_corr_params.exposure;

    if (typeof color_corr_params.saturation == "number")
        subs.saturation = color_corr_params.saturation;

    subs.need_perm_uniforms_update = true;
}

/**
 * Get sky params
 * @method module:scenes.get_sky_params
 * @returns {SkyParams} Sky params
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
 * @cc_externs procedural_skydome use_as_environment_lighting
 * @cc_externs rayleigh_brightness mie_brightness spot_brightness
 * @cc_externs scatter_strength rayleigh_strength mie_strength
 * @cc_externs rayleigh_collection_power mie_collection_power
 * @cc_externs mie_distribution color
 */
exports.set_sky_params = function(sky_params) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return;
    }
    var active_scene = m_scenes.get_active();
    m_scenes.set_sky_params(active_scene, sky_params);
}

/**
 * Get depth-of-field (DOF) params.
 * @method module:scenes.get_dof_params
 * @returns {DOFParams} DOF params
 */
exports.get_dof_params = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }
    var active_scene = m_scenes.get_active();
    var subs = m_scenes.get_subs(active_scene,"DOF");
    if (subs)
        return m_scenes.get_dof_params(active_scene);
    else
        return null;
}

/**
 * Set depth-of-field (DOF) params
 * @method module:scenes.set_dof_params
 * @param {DOFParams} dof_params DOF parameters
 * @cc_externs dof_on dof_distance dof_front dof_rear dof_power
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
 */
exports.get_god_rays_params = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }
    var active_scene = m_scenes.get_active();
    var subs = m_scenes.get_subs(active_scene,"GOD_RAYS");
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
 */
exports.get_bloom_params = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }
    var active_scene = m_scenes.get_active();
    var subs = m_scenes.get_subs(active_scene,"BLOOM");
    if (subs)
        return m_scenes.get_bloom_params(active_scene);
    else
        return null;
}

/**
 * Set bloom parameters
 * @method module:scenes.set_bloom_params
 * @param {BloomParams} bloom_params Bloom parameters
 * @cc_externs bloom_key bloom_edge_lum bloom_blur
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
 */
exports.get_glow_material_params = function() {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }

    var active_scene = m_scenes.get_active();
    var subs = m_scenes.get_subs(active_scene,"GLOW_COMBINE");
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
 * @cc_externs wind_dir wind_strength
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
 * @param {Number} pos_x World x position
 * @param {Number} pos_z World z position
 * @returns {Number} Surface level
 */
exports.get_water_surface_level = function(pos_x, pos_z) {
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return 0;
    }
    var active_scene = m_scenes.get_active();
    if (!active_scene._render.water_params) {
        m_print.error("No water parameters on the active scene");
        return 0;
    }
    return m_scenes.get_water_surface_level(active_scene, pos_x, pos_z);
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
 * @param {Boolean} [ignore_children=false] Ignore children parameter
 */
exports.hide_object = function(obj, ignore_children) {
    ignore_children = ignore_children || false;
    if ((m_obj_util.is_mesh(obj) || m_obj_util.is_empty(obj))
            && !m_obj_util.is_dynamic(obj))
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
 * @param {Boolean} [ignore_children=false] Ignore children parameter
 */
exports.show_object = function(obj, ignore_children) {
    ignore_children = ignore_children || false;
    if ((m_obj_util.is_mesh(obj) || m_obj_util.is_empty(obj))
            && !m_obj_util.is_dynamic(obj))
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
 * @returns {Boolean} Check result
 */
exports.is_hidden = function(obj) {
    if (m_obj_util.is_dynamic_mesh(obj) || m_obj_util.is_empty(obj)
            || m_obj_util.is_lamp(obj)) {
        return m_scenes.is_hidden(obj);
    } else {
        m_print.error("show/hide is only supported for dynamic meshes/empties and lamps");
        return false;
    }
}

/**
 * Check if object is visible.
 * @method module:scenes.is_visible
 * @param {Object3D} obj Object 3D
 * @returns {Boolean} Check result
 */
exports.is_visible = function(obj) {
    return obj.render.is_visible;
}

/**
 * Check the object's availability in the active scene.
 * @method module:scenes.check_object
 * @param {Object3D} obj Object 3D
 * @returns {Boolean} Check result
 * @deprecated use {@link module:scenes.check_object_by_name|scenes.check_object_by_name} instead
 */
exports.check_object = function(obj) {
    m_print.error_deprecated("scenes.check_object", "scenes.check_object_by_name");
    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }

    return m_obj.objects_storage_check(obj, m_scenes.get_active());
}

/**
 * Check if object with given name is present on scene.
 * @method module:scenes.check_object_by_name
 * @param {String} name Object name
 * @param {Number} [data_id=0] ID of loaded data
 * @returns {Boolean} Check result
 */
exports.check_object_by_name = function(name, data_id) {
    var obj = m_obj.get_object(m_obj.GET_OBJECT_BY_NAME, name,
                                  data_id | 0);
    if (obj)
        return true;
    else
        return false;
}

/**
 * Check if duplicated object is present on scene by empty name and dupli name.
 * @method module:scenes.check_object_by_dupli_name
 * @param {String} empty_name Name of the EMPTY object used to duplicate the object
 * @param {String} dupli_name Name of the duplicated object
 * @param {Number} [data_id=0] ID of loaded data
 * @returns {Boolean} Check result
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
 * @param {String[]} name_list List of the EMPTY and DUPLI object names: [empty_name,empty_name,...,dupli_name]
 * @param {Number} [data_id=0] ID of loaded data
 * @returns {Boolean} Check result
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
 * @param {String} [type="ALL"] Type
 * @param {Number} [data_id=DATA_ID_ALL] Objects data id
 * @returns {Object3D[]} Array with objects.
 */
exports.get_all_objects = function(type, data_id) {
    var scene = m_scenes.get_active();

    if (!type)
        type = "ALL";

    if (!data_id && data_id !== 0)
        data_id = m_obj.DATA_ID_ALL;

    return m_obj.get_scene_objs(scene, type, data_id);
}

/**
 * Get the object's name.
 * @method module:scenes.get_object_name
 * @param {Object3D} obj Object 3D
 * @returns {String} Object name
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
 * @returns {String} Object type
 */
exports.get_object_type = function(obj) {
    if (!(obj && obj.type)) {
        m_print.error("Wrong object");
        return "UNDEFINED";
    }

    return obj.type;
}

/**
 * Return the object's parent.
 * @method module:scenes.get_object_dg_parent
 * @param {Object3D} obj Object 3D
 * @returns {?Object3D} Parent object
 * @deprecated use {@link module:objects.get_dg_parent|objects.get_dg_parent} instead
 */
exports.get_object_dg_parent = function(obj) {
    m_print.error_deprecated("scenes.get_object_dg_parent", "objects.get_dg_parent");
    return m_obj_util.get_dg_parent(obj);
}

/**
 * Return the object's children.
 * @method module:scenes.get_object_children
 * @param {Object3D} obj Object 3D
 * @returns {Object3D[]} Array of children objects.
 */
exports.get_object_children = function(obj) {
    return obj.cons_descends.slice(0);
}

/**
 * Find the first character on the active scene.
 * @method module:scenes.get_first_character
 * @returns {Object3D} Character object.
 */
exports.get_first_character = function() {
    var sobjs = m_obj.get_scene_objs(m_scenes.get_active(), "MESH",
                                     m_obj.DATA_ID_ALL);
    for (var i = 0; i < sobjs.length; i++) {
        var obj = sobjs[i];
        if (m_phy.is_character(obj)) {
            return obj;
        }
    }
    return null;
}

/**
 * Return the distance to the shore line.
 * @method module:scenes.get_shore_dist
 * @param {Vec3} trans Current translation.
 * @param {Number} [v_dist_mult=1] Vertical distance multiplier.
 * @returns {Number} Distance.
 */
exports.get_shore_dist = function(trans, v_dist_mult) {
    if (!v_dist_mult && v_dist_mult !== 0)
        v_dist_mult = 1;

    if (!m_scenes.check_active()) {
        m_print.error("No active scene");
        return false;
    }

    var active_scene = m_scenes.get_active();

    return m_scenes.get_shore_dist(active_scene, trans, v_dist_mult);
}

/**
 * Return the camera water depth or null if there is no water.
 * @method module:scenes.get_cam_water_depth
 * @returns {Number} Depth
 */
exports.get_cam_water_depth = function() {
    return m_scenes.get_cam_water_depth();
}

/**
 * Return type of mesh object or null.
 * @method module:scenes.get_type_mesh_object
 * @param {Object3D} obj Object 3D.
 * @returns {String} Render type: "DYNAMIC" or "STATIC".
 */
exports.get_type_mesh_object = function(obj) {
    if (m_obj_util.is_mesh(obj))
        return obj.render.type;
    return null;
}

/**
 * Get the Blender-assigned meta tags from the active scene.
 * @method module:scenes.get_meta_tags
 * @returns {SceneMetaTags} Scene meta tags
 * @cc_externs title description
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
 * Append copied object to the scene.
 * @method module:scenes.append_object
 * @param {Object3D} obj Object 3D
 * @param {String} [scene_name] Name of the scene
 */
exports.append_object = function(obj, scene_name) {

    if (!obj.render.is_copied) {
        m_print.error("object \"" + obj.name + "\" has been created not by coping.");
        return;
    }

    if (scene_name) {
        var scenes = m_scenes.get_all_scenes();
        var scene = m_util.keysearch("name", scene_name, scenes);
    } else
        var scene = m_scenes.get_active();

    m_scenes.append_object(scene, obj, true);
}
/**
 * Remove dynamic object from all scenes.
 * Removing static physics object doesn't support.
 * @method module:scenes.remove_object
 * @param {Object3D} obj Object 3D
 */
exports.remove_object = function(obj) {
    if (!m_obj_util.is_mesh(obj) && !m_obj_util.is_empty(obj)
            || !m_obj_util.is_dynamic(obj)) {
        m_print.error("Can't remove object \"" + obj.name + "\". It must be " +
                "dynamic and type of MESH or EMPTY.");
        return;
    }
    var scenes_data = obj.scenes_data;
    for (var j = 0; j < scenes_data.length; j++) {
        var scene = scenes_data[j].scene;
        m_data.prepare_object_unloading(scene, obj, false);
    }
    m_obj.remove_object(obj);
}
/**
 * Get timeline marker frame by name.
 * @method module:scenes.marker_frame
 * @param {String} name Timeline marker name
 * @returns {Number} Timeline marker frame
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
 */
exports.get_mb_params = function() {
    var scene = m_scenes.get_active();
    var mb_subs = m_scenes.get_subs(scene, "MOTION_BLUR");
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
 */
exports.set_mb_params = function(mb_params) {
    var scene = m_scenes.get_active();
    var mb_subs = m_scenes.get_subs(scene, "MOTION_BLUR");
    if (mb_subs) {
        if (typeof mb_params.mb_decay_threshold == "number")
            mb_subs.mb_decay_threshold = mb_params.mb_decay_threshold;
        if (typeof mb_params.mb_factor == "number")
            mb_subs.mb_factor = mb_params.mb_factor;
    } else
        m_print.error("The motion blur subscene doesn't exist.")
}

/**
 * Check if objects can be selected
 * @method module:scenes.can_select_objects
 * @returns {Boolean} True if objects can be selected.
 */
exports.can_select_objects = function() {
    var scene = m_scenes.get_active();
    return Boolean(m_scenes.get_subs(scene, "COLOR_PICKING"));
}

}
