"use strict";

/** 
 * API for the engine's global configuration.
 * <p>Use the set()/get() function to change/get the value of a property.
 * Use the reset() function to reset all properties to their default state.
 * <dl>
 * <dt>anaglyph_use
 * <dd>Boolean, enable anaglyph stereo rendering.
 * <dt>all_objs_selectable
 * <dd>Boolean, enable object picking based on color rendering and glowing.
 * <dt>console_verbose
 * <dd>Boolean, print more debug info.
 * <dt>quality
 * <dd>One of P_* constants, the profile of rendering quality.
 * <dt>do_not_load_resources
 * <dd>Boolean, disable resource rendering.
 * <dt>dds_available
 * <dd>Boolean, use DDS compressed textures.
 * <dt>show_hud_debug_info
 * <dd>Boolean, show HUD with debug information.
 * <dt>physics_enabled
 * <dd>Boolean, enable uranium.js physics engine.
 * <dt>physics_uranium_path
 * <dd>String, path to uranium.js module.
 * </dl>
 * @module config
 */
b4w.module["config"] = function(exports, require) {

var config = require("__config");

/**
 * Maximum quality profile.
 * @const module:config.P_ULTRA
 */
exports["P_ULTRA"] = config.P_ULTRA;
/**
 * High quality profile.
 * @const module:config.P_HIGH
 */
exports["P_HIGH"] = config.P_HIGH;
/**
 * Low quality profile.
 * @const module:config.P_LOW
 */
exports["P_LOW"] = config.P_LOW;

/**
 * Set the engine's global property.
 * @method module:config.set
 * @param {String} prop Property name
 * @param value New property value
 */
exports["set"] = config.set;
/**
 * Get the engine's global property.
 * @method module:config.get
 * @param {String} prop Property name
 * @returns Value of property
 */
exports["get"] = config.get;
/**
 * Reset all the engine's global properties.
 * @method module:config.reset
 */
exports["reset"] = config.reset;

}

