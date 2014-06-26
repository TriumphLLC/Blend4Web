"use strict";

/** 
 * Head-up display functions
 * @module hud
 */
b4w.module["hud"] = function(exports, require) {

var m_print = require("__print");
var hud     = require("__hud");

/**
 * Plot the array.
 * @method module:hud.plot_array
 */
exports["plot_array"] = hud.plot_array;

/**
 * Draw the mixer strip.
 * @method module:hud.draw_mixer_strip
 */
exports["draw_mixer_strip"] = hud.draw_mixer_strip;

}
