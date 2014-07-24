"use strict";

/** 
 * API for the engine's global configuration.
 * <p>Use the set()/get() function to change/get the value of a property.
 * Use the reset() function to reset all properties to their default state.
 * Any configuration change must occur before engine initialization, also some
 * of the properties are affected by quality profile and client's hardware/browser.
 * <h3>Allowed configuration properties</h3>
 * <dl>
 * <dt>all_objs_selectable
 * <dd>Boolean, make all objects selectable and "glowable".
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
 * <dd>Boolean, enable postprocessing-based antialiasing.
 * <dt>assets_dds_available
 * <dd>Boolean, allow engine to use compressed DDS textures, you must provide
 * them along non-compressed ones.
 * <dt>assets_min50_available
 * <dd>Boolean, allow engine to use low quality textures, you must provide
 * them along high quality ones.
 * <dt>background_color
 * <dd>Float32Array, WebGL canvas background color.
 * <dt>built_in_module_name
 * <dd>String, Name of build-in module (for HTML export only).
 * <dt>console_verbose
 * <dd>Boolean, print more debug info.
 * <dt>context_antialias
 * <dd>Boolean, enable hardware antialiasing (for forward rendering only).
 * <dt>deferred_rendering
 * <dd>Boolean, use deferred rendering pipeline.
 * <dt>do_not_load_resources
 * <dd>Boolean, disable resource loading (textures and sounds).
 * <dt>force_selectable
 * <dd>Boolean, initialize color picking and glow even there is no selectable
 * objects on the main (zero) scene (used for dynamic scene loading).
 * <dt>glow
 * <dd>Boolean, enable glow effect.
 * <dt>physics_enabled
 * <dd>Boolean, enable uranium.js physics engine.
 * <dt>physics_uranium_path
 * <dd>String, path to uranium.js module.
 * <dt>precision
 * <dd>String, preferred GLSL floating point precision.
 * <dt>quality
 * <dd>Number, preferred rendering quality profile (one of P_* constants).
 * <dt>resolution_factor
 * <dd>Number, canvas resolution factor.
 * <dt>shaders_dir
 * <dd>String, path to shaders directory.
 * <dt>show_hud_debug_info
 * <dd>Boolean, show HUD with debug information.
 * <dt>smaa
 * <dd>Boolean, enable SMAA antialiasing.
 * <dt>smaa_search_texture_path
 * <dd>String, path to SMAA search texture.
 * <dt>smaa_area_texture_path
 * <dd>String, path to SMAA area texture.
 * <dt>wireframe_debug
 * <dd>Boolean, enable wireframe debug mode.
 * </dl>
 * @module config
 */
b4w.module["config"] = function(exports, require) {

var m_cfg = require("__config");

/**
 * Low quality profile: maximize engine performance.
 * @const {Number} module:config.P_LOW
 */
exports["P_LOW"] = m_cfg.P_LOW;
/**
 * High quality profile: use all requested features.
 * @const {Number} module:config.P_HIGH
 */
exports["P_HIGH"] = m_cfg.P_HIGH;
/**
 * Ultra quality profile: use all requested features and maximize quality.
 * @const {Number} module:config.P_ULTRA
 */
exports["P_ULTRA"] = m_cfg.P_ULTRA;
/**
 * Custom quality profile: use engine defaults value, allow customizaiton.
 * @const {Number} module:config.P_CUSTOM
 */
exports["P_CUSTOM"] = m_cfg.P_CUSTOM;

/**
 * Set the engine's global property.
 * @method module:config.set
 * @param {String} prop Property name
 * @param {*} value New property value
 */
exports["set"] = m_cfg.set;
/**
 * Get the engine's global property.
 * @method module:config.get
 * @param {String} prop Property name
 * @returns {*} Value of property
 */
exports["get"] = m_cfg.get;
/**
 * Reset all the engine's global properties.
 * @method module:config.reset
 */
exports["reset"] = m_cfg.reset;

}

