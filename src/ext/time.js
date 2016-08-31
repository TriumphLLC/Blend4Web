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
 * @returns {Number} Animator ID
 */
exports.animate = m_time.animate;

/**
 * Clear the animation.
 * @method module:time.clear_animation
 * @param {Number} id Animator ID
 */
exports.clear_animation = m_time.clear_animation;


}
