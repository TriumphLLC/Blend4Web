"use strict";

/**
 * API for the engine's global configuration.
 * <p>Use the set()/get() function to change/get the value of a property.
 * Use the reset() function to reset all properties to their default state.
 * Any change in configuration must occur before engine initialization. Keep in
 * mind that some of the properties are affected by a quality profile and client's
 * hardware/browser. In the former case set CUSTOM profile to allow changing of
 * such properties.
 * <h3>Allowed configuration properties</h3>
 * <dl>
 * <dt>all_objs_selectable
 * <dd>Boolean, make all objects selectable and "glowable".
 * <dt>allow_cors
 * <dd>Boolean, allow cross-origin resource sharing.
 * <dt>allow_hidpi
 * <dd>Boolean, allow HIDPI mode on supported devices (set CUSTOM profile to
 * change).
 * <dt>alpha
 * <dd>Boolean, enable WebGL canvas transparency.
 * <dt>alpha_sort
 * <dd>Boolean, enable transparency sorting for "blend" materials.
 * <dt>alpha_sort_threshold
 * <dd>Number, camera distance threshold for transparency sorting.
 * <dt>anaglyph_use
 * <dd>Boolean, enable anaglyph stereo rendering.
 * <dt>animation_framerate
 * <dd>Number, animation framerate
 * <dt>antialiasing
 * <dd>Boolean, enable postprocessing-based antialiasing (set CUSTOM profile to
 * change).
 * <dt>assets_dds_available
 * <dd>Boolean, allow engine to use compressed DDS textures, you must provide
 * them along non-compressed ones.
 * <dt>assets_min50_available
 * <dd>Boolean, allow engine to use low quality textures, you must provide
 * <dt>audio
 * <dd>Boolean, enable webaudio.
 * them along high quality ones.
 * <dt>background_color
 * <dd>Float32Array, RGBA vector with WebGL canvas background color.
 * <dt>built_in_module_name
 * <dd>String, name of build-in module (for HTML export only).
 * <dt>canvas_resolution_factor
 * <dd>Boolean, set canvas resolution factor.
 * <dt>console_verbose
 * <dd>Boolean, print more debug info.
 * <dt>context_antialias
 * <dd>Boolean, enable hardware antialiasing (for forward rendering only).
 * <dt>do_not_load_resources
 * <dd>Boolean, disable resource loading (textures and sounds).
 * <dt>force_selectable
 * <dd>Boolean, initialize color picking and glow even there is no selectable
 * objects on the main (zero) scene (used for dynamic scene loading).
 * <dt>glow
 * <dd>Boolean, enable glow effect (set CUSTOM profile to change).
 * <dt>gyro_use
 * <dd>Boolean, enable gyroscope.
 * <dt>physics_enabled
 * <dd>Boolean, enable uranium.js physics engine.
 * <dt>physics_uranium_path
 * <dd>String, path to uranium.js module, if not specified search in the
 * directory with the engine's source.
 * <dt>precision
 * <dd>String, preferred GLSL floating point precision (set CUSTOM profile to
 * change).
 * <dt>quality
 * <dd>Number, preferred rendering quality profile (one of P_LOW, P_HIGH,
 * P_ULTRA, P_CUSTOM constants).
 * <dt>resolution_factor
 * <dd>Number, internal rendering resolution factor (set CUSTOM profile to
 * change).
 * <dt>sfx_mix_mode
 * <dd>Boolean, enable mixer mode in SFX subsystem
 * <dt>shaders_dir
 * <dd>String, path to shaders directory (developer version only).
 * <dt>show_hud_debug_info
 * <dd>Boolean, show HUD with debug information.
 * <dt>smaa
 * <dd>Boolean, enable SMAA antialiasing (set CUSTOM profile to change).
 * <dt>smaa_search_texture_path
 * <dd>String, path to SMAA search texture, if not specified search in the
 * directory with the engine's source.
 * <dt>smaa_area_texture_path
 * <dd>String, path to SMAA area texture, if not specified search in the
 * directory with the engine's source.
 * <dt>wireframe_debug
 * <dd>Boolean, enable wireframe debug mode.
 * </dl>
 * @module config
 * @cc_externs all_objs_selectable allow_cors allow_hidpi alpha alpha_sort
 * @cc_externs alpha_sort_threshold anaglyph_use animation_framerate antialiasing
 * @cc_externs assets_dds_available assets_min50_available audio background_color
 * @cc_externs built_in_module_name canvas_resolution_factor console_verbose
 * @cc_externs context_antialias do_not_load_resources
 * @cc_externs force_selectable glow physics_enabled physics_uranium_path precision
 * @cc_externs quality resolution_factor sfx_mix_mode shaders_dir show_hud_debug_info
 * @cc_externs smaa smaa_search_texture_path smaa_area_texture_path wireframe_debug
 */
b4w.module["config"] = function(exports, require) {

var m_cfg = require("__config");

/**
 * Low quality profile: maximize engine performance.
 * @const {Number} module:config.P_LOW
 */
exports.P_LOW = m_cfg.P_LOW;
/**
 * High quality profile: use all requested features.
 * @const {Number} module:config.P_HIGH
 */
exports.P_HIGH = m_cfg.P_HIGH;
/**
 * Ultra quality profile: use all requested features and maximize quality.
 * @const {Number} module:config.P_ULTRA
 */
exports.P_ULTRA = m_cfg.P_ULTRA;
/**
 * Custom quality profile: use engine defaults value, allow customizaiton.
 * @const {Number} module:config.P_CUSTOM
 */
exports.P_CUSTOM = m_cfg.P_CUSTOM;

/**
 * Set the engine's global property.
 * @method module:config.set
 * @param {String} prop Property name
 * @param {*} value New property value
 */
exports.set = m_cfg.set;
/**
 * Get the engine's global property.
 * @method module:config.get
 * @param {String} prop Property name
 * @returns {*} Value of property
 */
exports.get = m_cfg.get;
/**
 * Reset all the engine's global properties.
 * @method module:config.reset
 */
exports.reset = m_cfg.reset;
/**
 * Get path to assets directory. Used when application development happens
 * inside SDK.
 * @method module:config.get_std_assets_path
 * @returns {String} Path to assets
 */
exports.get_std_assets_path = m_cfg.get_std_assets_path;

}
