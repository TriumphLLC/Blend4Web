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
 * API for the engine's global configuration.
 *
 * <p>Use the {@link module:config.set|set()}/{@link module:config.get|get()} 
 * method to change/get the value of a property. Use the 
 * {@link module:config.reset|reset()} method to reset all properties to their 
 * default state. Any change in configuration must occur before engine 
 * initialization. Keep in mind that some of the properties are affected by the 
 * quality profile and the user's hardware/browser. In the former case use the 
 * {@link module:config.P_CUSTOM|P_CUSTOM} profile in order to change such 
 * properties.</p>
 *
 * <p>Normally, the users should not alter these parameters.</p>
 *
 * <h3>Configuration Parameters Available</h3>
 * <dl>
 * <dt>allow_cors
 * <dd>Boolean, allow cross-origin resource sharing.
 * <dt>allow_hidpi
 * <dd>Boolean, allow HIDPI mode on supported devices (use the 
 * {@link module:config.P_CUSTOM|P_CUSTOM} profile in order to change this parameter).
 * <dt>alpha
 * <dd>Boolean, enable WebGL canvas transparency.
 * <dt>alpha_sort
 * <dd>Boolean, enable z-sorting for transparent materials.
 * <dt>alpha_sort_threshold
 * <dd>Number, camera distance threshold for transparency z-sorting.
 * <dt>anaglyph_use
 * <dd><span style="color: red;"> Deprecated, use "stereo" instead.</span> 
 * Boolean, enable anaglyph stereo rendering.
 * <dt>animation_framerate
 * <dd>Number, animation framerate.
 * <dt>anisotropic_filtering
 * <dd>Boolean, enable anisotropic filtering.
 * <dt>antialiasing
 * <dd>Boolean, enable postprocess-based anti-aliasing (use the 
 * {@link module:config.P_CUSTOM|P_CUSTOM} profile in order to change this parameter).
 * <dt>assets_dds_available
 * <dd>Boolean, allow the engine to use compressed DDS textures.
 * <dt>assets_gzip_available
 * <dd>Boolean, enable loading gzipped versions of json/bin/dds/pvr files. It's worth 
 * doing it if gzip compression is not set up on a server. A gzipped file must be 
 * placed near the original one and its name must be the same as the name of the 
 * original file + the ".gz" extension. For example: 
 * <pre>
 *  my_folder/
 *      my_project.json
 *      my_project.json.gz
 *      my_project.bin
 *      my_project.bin.gz
 * </pre>
 * <dt>assets_min50_available
 * <dd>Boolean, allow the engine to use halved textures. The halved
 * textures should be present near the source textures in order to be picked up.
 * <dt>assets_path
 * <dd>String, path to the assets directory (for 
 * {@link module:config.get_assets_path|get_assets_path()} and 
 * {@link module:config.get_std_assets_path|get_std_assets_path()}).
 * <dt>assets_pvr_available
 * <dd>Boolean, allow the engine to use compressed PVRTC textures.
 * These textures should be present near the source textures in order to be picked up.
 * <dt>audio
 * <dd>Boolean, enable Web Audio.
 * <dt>background_color
 * <dd>Array, RGBA values to use as a background color for the WebGL
 * canvas.
 * <dt>bloom
 * <dd>Boolean, enable bloom.
 * <dt>built_in_module_name
 * <dd>String, name of the module which stores exported data (HTML export only).
 * <dt>canvas_resolution_factor
 * <dd>Number, set the resolution factor for the canvas. Requires the following call
 * to apply changes:
 * {@link module:container.resize_to_container|container.resize_to_container(true)}.
 * <dt>compositing
 * <dd>Boolean, enable compositing.
 * <dt>console_verbose
 * <dd>Boolean, print more debug info in the browser console.
 * <dt>debug_view
 * <dd>Boolean, enable debug view mode.
 * <dt>dof
 * <dd>Boolean, enable the Depth of Field effect.
 * <dt>do_not_load_resources
 * <dd>Boolean, disable loading of assets (textures and sounds).
 * <dt>glow_materials
 * <dd>Boolean, enable glow materials.
 * <dt>god_rays
 * <dd>Boolean, enable god rays.
 * <dt>enable_outlining
 * <dd>Boolean, enable object outlining.
 * <dt>enable_selectable
 * <dd>Boolean, enable object selection.
 * <dt>gl_debug
 * <dd>Boolean, enable gl errors check. Very slow.
 * <dt>is_mobile_device
 * <dd>Boolean, check mobile device. Read-only.
 * <dt>lod_leap_smooth_threshold
 * <dd>Number, the maximum amount of the camera movement (in meters) that 
 * still can trigger a smooth transition during the LOD switching. Low values can
 * be useful to prevent noticeable smooth transitions while teleporting. High 
 * values can be useful to keep smooth transitions for fast moving cameras 
 * (e.g. flight simulators).
 * <dt>lod_smooth_transitions
 * <dd>Boolean, enable smooth transitions between LOD levels.
 * <dt>max_fps
 * <dd>Number, maximum FPS limit.
 * <dt>max_fps_physics
 * <dd>Number, maximum physics FPS limit.
 * <dt>media_auto_activation
 * <dd>Boolean, activate media data context on mobile devices using a popup dialog.
 * <dt>motion_blur
 * <dd>Boolean, enable motion_blur.
 * <dt>outlining_overview_mode
 * <dd>Boolean, make all objects selectable, enable object outlining and
 * outlining on selection.
 * <dt>physics_calc_fps
 * <dd>Boolean, return physics FPS in the {@link module:main~FPSCallback|FPSCallback}.
 * <dt>physics_enabled
 * <dd>Boolean, use the uranium.js physics engine.
 * <dt>physics_uranium_path
 * <dd>String, path to the directory of uranium.js file. If not specified, search in the
 * directory with the engine's sources.
 * <dt>physics_use_workers
 * <dd>Boolean, simulate physics in workers (default) or not.
 * <dt>physics_use_wasm
 * <dd>Boolean, use WebAssembly for physics or not(default).
 * <dt>precision
 * <dd>String, preferred GLSL floating point precision (use the 
 * {@link module:config.P_CUSTOM|P_CUSTOM} profile in order to change this parameter).
 * <dt>prevent_caching
 * <dd>Boolean, prevent assets caching by appending timestamp suffix to their
 * URLs (default) or not.
 * <dt>quality
 * <dd>Number, preferred rendering quality profile (one of 
 * {@link module:config.P_LOW|P_LOW}, {@link module:config.P_HIGH|P_HIGH},
 * {@link module:config.P_ULTRA|P_ULTRA}, {@link module:config.P_CUSTOM|P_CUSTOM} enums).
 * <dt>reflections
 * <dd>Boolean, enable reflections.
 * <dt>reflection_quality
 * <dd>String, quality of reflections. It can be "LOW", "MEDIUM" or "HIGH".
 * <dt>refractions
 * <dd>Boolean, enable refractions.
 * <dt>sfx_mix_mode
 * <dd>Boolean, enable the mixer mode in the SFX subsystem.
 * <dt>shaders_path
 * <dd>String, path to the shaders directory (developer version only).
 * <dt>shadows
 * <dd>Boolean, enable shadows.
 * <dt>shadow_blur_samples
 * <dd>String, number of shadow border blur samples. It can be "16x", "8x" or "4x".
 * <dt>show_hud_debug_info
 * <dd>Boolean, show HUD with debug information.
 * <dt>smaa
 * <dd><span style="color: red;">Deprecated.</span> Boolean, enable SMAA 
 * anti-aliasing (use the {@link module:config.P_CUSTOM|P_CUSTOM} 
 * profile in order to change this parameter).
 * <dt>smaa_area_texture_path
 * <dd><span style="color: red;">Deprecated.</span> String, path to the SMAA 
 * "area" texture. If not specified, search in the directory with the engine's 
 * sources.
 * <dt>smaa_search_texture_path
 * <dd><span style="color: red;">Deprecated.</span> String, path to the SMAA 
 * "search" texture. If not specified, search in the directory with the engine's 
 * sources.
 * <dt>srgb_type
 * <dd>String, the quality of the "Linear <-> sRGB" color conversions. Can be 
 * one of the following: "SRGB_SIMPLE" - a bit faster, but less accurate, which 
 * is especially noticeable for the dark tones; "SRGB_PROPER" - a bit slower, 
 * but more precise.
 * <dt>ssao
 * <dd>Boolean, enable SSAO.
 * <dt>stereo
 * <dd>String, stereoscopic mode: "ANAGLYPH", "HMD" or "NONE".
 * <dt>use_min50
 * <dd>Boolean, enable min50 textures.
 * </dl>
 * @module config
 * @local QualityProfile
 * @cc_externs allow_cors allow_hidpi alpha alpha_sort
 * @cc_externs alpha_sort_threshold anaglyph_use animation_framerate
 * @cc_externs antialiasing assets_path assets_dds_available assets_min50_available 
 * @cc_externs background_color built_in_module_name canvas_resolution_factor
 * @cc_externs console_verbose compositing do_not_load_resources enable_selectable
 * @cc_externs enable_outlining media_auto_activation outlining_overview_mode
 * @cc_externs physics_enabled physics_uranium_path physics_calc_fps physics_use_workers
 * @cc_externs precision prevent_caching quality physics_uranium_bin
 * @cc_externs sfx_mix_mode shaders_path show_hud_debug_info
 * @cc_externs smaa smaa_search_texture_path smaa_area_texture_path
 * @cc_externs debug_view url_params stereo gl_debug max_fps max_fps_physics
 * @cc_externs use_min50 anisotropic_filtering shadows reflections refractions
 * @cc_externs ssao dof god_rays bloom motion_blur is_mobile_device shadow_blur_samples
 * @cc_externs reflection_quality assets_pvr_available audio lod_leap_smooth_threshold
 * @cc_externs lod_smooth_transitions glow_materials srgb_type physics_use_wasm assets_gzip_available
 */
b4w.module["config"] = function(exports, require) {

var m_cfg    = require("__config");
var m_compat = require("__compat");
var m_debug  = require("__debug");
var m_data   = require("__data");
var m_print  = require("__print");


/**
 * Quality profile enum. One of {@link module:config.P_LOW|P_LOW}, {@link module:config.P_HIGH|P_HIGH}, {@link module:config.P_ULTRA|P_ULTRA}, {@link module:config.P_CUSTOM|P_CUSTOM}.
 * @typedef {number} QualityProfile
 */

/**
 * Low quality profile: maximize engine performance, minimize memory consumption.
 * @const {QualityProfile} module:config.P_LOW
 */
exports.P_LOW = m_cfg.P_LOW;

/**
 * High quality profile: use all requested features.
 * @const {QualityProfile} module:config.P_HIGH
 */
exports.P_HIGH = m_cfg.P_HIGH;

/**
 * Ultra quality profile: use all requested features and maximize quality.
 * @const {QualityProfile} module:config.P_ULTRA
 */
exports.P_ULTRA = m_cfg.P_ULTRA;

/**
 * Custom quality profile: use engine defaults, allow customization.
 * @const {QualityProfile} module:config.P_CUSTOM
 */
exports.P_CUSTOM = m_cfg.P_CUSTOM;

/**
 * Auto quality profile: cannot be used directly, only for quality
 * auto configurators.
 * @const {QualityProfile} module:config.P_AUTO
 */
exports.P_AUTO = m_cfg.P_AUTO;

/**
 * Set the value of the config property of the engine.
 * @method module:config.set
 * @param {string} prop Property name
 * @param {*} value New property value
 */
exports.set = m_cfg.set;

/**
 * Get the value of the config property of the engine.
 * @method module:config.get
 * @param {string} prop Property name
 * @returns {*} Value of property
 */
exports.get = m_cfg.get;

/**
 * Reset all the engine's config properties to defaults.
 * @method module:config.reset
 */
exports.reset = m_cfg.reset;

/**
 * Reset context limit properties to minimum.
 * @method module:config.reset_limits
 */
exports.reset_limits = m_cfg.reset_limits;
/**
 * Get the path to the standard assets directory inside the SDK.
 * @method module:config.get_std_assets_path
 * @returns {string} Path to assets
 */
exports.get_std_assets_path = m_cfg.get_assets_path;
/**
 * Get the path to the project's assets directory.
 * @see https://www.blend4web.com/doc/en/developers.html#loading-application-assets
 * @method module:config.get_assets_path
 * @param {string} name Name of the project
 * @returns {string} Path to assets
 */
exports.get_assets_path = m_cfg.get_assets_path;

/**
 * Set the engine's quality profile.
 * @method module:config.apply_quality
 * @param {QualityProfile} quality Quality profile
 */
exports.apply_quality = function(quality) {
    if (m_data.is_primary_loaded()) {
        m_print.error("Cannot change quality profile after a scene is loaded.");
        return;
    }

    m_cfg.set("quality", quality);
    var gl = m_debug.get_gl();
    // initialized
    if (gl) {
        m_cfg.apply_quality();
        m_compat.set_hardware_defaults(m_debug.get_gl(), false);
    }
}

}
