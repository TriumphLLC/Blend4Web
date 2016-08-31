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
 * API for the engine's global configuration.
 *
 * <p>Use the set()/get() method to change/get the value of a property.
 * Use the reset() method to reset all properties to their default state.
 * Any change in configuration must occur before engine initialization. Keep in
 * mind that some of the properties are affected by the quality profile and
 * the user's hardware/browser. In the former case use the CUSTOM profile
 * in order to change such properties.</p>
 *
 * <p>Normally, the users should not alter these parameters.</p>
 *
 * <h3>Configuration Parameters Available</h3>
 * <dl>
 * <dt>allow_cors
 * <dd>Boolean, allow cross-origin resource sharing.
 * <dt>allow_hidpi
 * <dd>Boolean, allow HIDPI mode on supported devices (use the CUSTOM profile
 * in order to change this parameter).
 * <dt>alpha
 * <dd>Boolean, enable WebGL canvas transparency.
 * <dt>alpha_sort
 * <dd>Boolean, enable z-sorting for transparent materials.
 * <dt>alpha_sort_threshold
 * <dd>Number, camera distance threshold for transparency z-sorting.
 * <dt>anaglyph_use
 * <dd>Boolean, enable anaglyph stereo rendering. Deprecated, use stereo
 * instead.
 * <dt>animation_framerate
 * <dd>Number, animation framerate.
 * <dt> anisotropic_filtering
 * <dd>Boolean, enable anisotropic filtering
 * <dt>antialiasing
 * <dd>Boolean, enable postprocess-based anti-aliasing (use the CUSTOM profile
 * in order to change this parameter).
 * <dt>assets_dds_available
 * <dd>Boolean, allow the engine to use compressed DDS textures. The compressed
 * textures should be present near the source textures in order to be picked up.
 * <dt>assets_min50_available
 * <dd>Boolean, allow the engine to use halved textures. The halved
 * textures should be present near the source textures in order to be picked up.
 * <dt>audio
 * <dd>Boolean, enable Web Audio.
 * <dt>background_color
 * <dd>Array, RGBA values to use as a background color for the WebGL
 * canvas.
 * <dt>built_in_module_name
 * <dd>String, name of the module which stores exported data (HTML export only).
 * <dt>canvas_resolution_factor
 * <dd>Boolean, set the resolution factor for the canvas.
 * <dt>console_verbose
 * <dd>Boolean, print more debug info in the browser console.
 * <dt>dof
 * <dd>Boolean, enable DOF
 * <dt>god_rays
 * <dd>Boolean, enable god rays
 * <dt>bloom
 * <dd>Boolean, enable bloom
 * <dt>motion_blur
 * <dd>Boolean, enable motion_blur
 * <dt>do_not_load_resources
 * <dd>Boolean, disable loading of assets (textures and sounds).
 * <dt>enable_selectable
 * <dd>Boolean, enable selecting of objects.
 * <dt>enable_outlining
 * <dd>Boolean, enable outlining of object.
 * <dt>is_mobile_device
 * <dd>Boolean, check mobile device.
 * <dt>max_fps
 * <dd>Number, maximum FPS limit
 * <dt>max_fps_physics
 * <dd>Number, maximum physics FPS limit
 * <dt>media_auto_activation
 * <dd>Boolean, activate media data context on mobile devices using popup dialog.
 * <dt>outlining_overview_mode
 * <dd>Boolean, make all objects selectable, enable outlining and
 * outlining on select.
 * <dt>physics_enabled
 * <dd>Boolean, use the uranium.js physics engine.
 * <dt>physics_uranium_path
 * <dd>String, path to the uranium.js file. If not specified, search in the
 * directory with the engine's sources.
 * <dt>physics_calc_fps
 * <dd>Boolean, return physics FPS in {@link module:main~FPSCallback|FPS
 * callback}.
 * <dt>physics_use_workers
 * <dd>Boolean, simulate physics in workers (default) or not.
 * <dt>precision
 * <dd>String, preferred GLSL floating point precision (use the CUSTOM profile
 * in order to change this parameter).
 * <dt>prevent_caching
 * <dd>Boolean, prevent assets caching by appending timestamp suffix to their
 * URLs (default) or not.
 * <dt>quality
 * <dd>Number, preferred rendering quality profile (one of P_LOW, P_HIGH,
 * P_ULTRA, P_CUSTOM enums).
 * <dt>reflections
 * <dd>Boolean, enable reflections
 * <dt>refractions
 * <dd>Boolean, enable refractions
 * <dt>sfx_mix_mode
 * <dd>Boolean, enable the mixer mode in the SFX subsystem.
 * <dt>shaders_dir
 * <dd>String, path to the shaders directory (developer version only).
 * <dt>shadows
 * <dd>Boolean, enable shadows
 * <dt>show_hud_debug_info
 * <dd>Boolean, show HUD with debug information.
 * <dt>smaa
 * <dd>Boolean, enable SMAA anti-aliasing (use the CUSTOM profile
 * in order to change this parameter).
 * <dt>smaa_search_texture_path
 * <dd>String, path to the SMAA "search" texture. If not specified, search in
 * the directory with the engine's sources.
 * <dt>smaa_area_texture_path
 * <dd>String, path to the SMAA "area" texture. If not specified, search in the
 * directory with the engine's sources.
 * <dt>ssao
 * <dd>Boolean, enable SSAO
 * <dt>stereo
 * <dd>String, stereoscopic mode: "ANAGLYPH", "HMD" or "NONE".
 * <dt>debug_view
 * <dd>Boolean, enable debug view mode.
 * <dt>use_min50
 * <dd>Boolean, enable min50 textures.
 * <dt>gl_debug
 * <dd>Boolean, enable gl errors check. Very slow.
 * </dl>
 * @module config
 * @local QualityProfile
 * @cc_externs allow_cors allow_hidpi alpha alpha_sort
 * @cc_externs alpha_sort_threshold anaglyph_use animation_framerate
 * @cc_externs antialiasing assets_dds_available assets_min50_available audio
 * @cc_externs background_color built_in_module_name canvas_resolution_factor
 * @cc_externs console_verbose do_not_load_resources enable_selectable
 * @cc_externs enable_outlining media_auto_activation outlining_overview_mode
 * @cc_externs physics_enabled physics_uranium_path physics_calc_fps physics_use_workers
 * @cc_externs precision prevent_caching quality
 * @cc_externs sfx_mix_mode shaders_dir show_hud_debug_info
 * @cc_externs smaa smaa_search_texture_path smaa_area_texture_path
 * @cc_externs debug_view url_params stereo gl_debug max_fps max_fps_physics
 * @cc_externs use_min50 anisotropic_filtering shadows reflections refractions
 * @cc_externs ssao dof god_rays bloom motion_blur is_mobile_device
 */
b4w.module["config"] = function(exports, require) {

var m_cfg = require("__config");


/**
 * Quality profile enum. One of P_*.
 * @typedef QualityProfile
 * @type {Number}
 */

/**
 * Low quality profile: maximize engine performance.
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
 * Set the value of the config property of the engine.
 * @method module:config.set
 * @param {String} prop Property name
 * @param {*} value New property value
 */
exports.set = m_cfg.set;

/**
 * Get the value of the config property of the engine.
 * @method module:config.get
 * @param {String} prop Property name
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
 * Get the path to the assets directory. Can be used when an application
 * is developed inside the SDK.
 * @method module:config.get_std_assets_path
 * @returns {String} Path to assets
 */
exports.get_std_assets_path = m_cfg.get_std_assets_path;

}
