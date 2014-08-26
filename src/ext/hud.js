"use strict";

/** 
 * Head-up display functions.
 * To work properly requres initialization of the separate canvas element.
 * @see module:main.init
 * @module hud
 */
b4w.module["hud"] = function(exports, require) {

var m_hud   = require("__hud");
var m_print = require("__print");

/**
 * Draw the mixer strip.
 * Used by mixer addon.
 * @method module:hud.draw_mixer_strip
 */
exports.draw_mixer_strip = m_hud.draw_mixer_strip;

/**
 * Plot the array.
 * @method module:hud.plot_array
 * @param {String} header Plot header
 * @param {Number} slot Slot number
 * @param {Float32Array} arr Array
 * @param {Number} arg_min Minimum plot argument value
 * @param {Number} arg_max Maximum plot argument value
 * @param {Number} val_min Minimum plot value
 * @param {Number} val_max Maximum plot value
 */
exports.plot_array = m_hud.plot_array;

}
