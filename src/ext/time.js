"use strict";

/**
 * Time API.
 * @module time
 */
b4w.module["time"] = function(exports, require) {

var m_time = require("__time");

/**
 * Set a new timeout.
 * this method has the same behavior as window.setTimeout(), except it uses
 * engine's timeline.
 * @method module:time.set_timeout
 * @param {timeout_callback} callback Timeout callback
 * @param {Number} time Timeout
 * @returns {Number} Timeout ID
 */
exports.set_timeout = m_time.set_timeout;

/**
 * Clear the timeout.
 * @method module:time.clear_timeout
 * @param {Number} id Timeout ID
 */
exports.clear_timeout = m_time.clear_timeout;

/**
 * Get the engine's timeline (number of seconds after engine's initialization).
 * @method module:time.get_timeline
 * @returns {Number} Timeline
 */
exports.get_timeline = m_time.get_timeline;

/**
 * Animate value.
 * @method module:time.animate
 * @param {Number} from Value to animate from 
 * @param {Number} to Value to animate to
 * @param {Number} timeout Period of time to animate the value
 * @param {anim_callback} anim_cb Animation callback
 */
exports.animate = m_time.animate;

/**
 * Clear the animation.
 * @method module:time.clear_animation
 * @param {Number} id Animator ID
 */
exports.clear_animation = m_time.clear_animation;


}
