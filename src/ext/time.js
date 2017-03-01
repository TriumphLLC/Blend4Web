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
 * @param {number} time Timeout
 * @returns {number} Timeout ID
 */
exports.set_timeout = m_time.set_timeout;

/**
 * Clear the timeout.
 * @method module:time.clear_timeout
 * @param {number} id Timeout ID
 */
exports.clear_timeout = m_time.clear_timeout;

/**
 * Get the engine's timeline (number of seconds after engine's initialization).
 * @method module:time.get_timeline
 * @returns {number} Timeline
 */
exports.get_timeline = m_time.get_timeline;

/**
 * Animate value.
 * @method module:time.animate
 * @param {number} from Value to animate from 
 * @param {number} to Value to animate to
 * @param {number} timeout Period of time to animate the value
 * @param {anim_callback} anim_cb Animation callback
 * @returns {number} Animator ID
 */
exports.animate = m_time.animate;

/**
 * Clear the animation.
 * @method module:time.clear_animation
 * @param {number} id Animator ID
 */
exports.clear_animation = m_time.clear_animation;


}
