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
 * API methods to control {@link https://www.blend4web.com/doc/en/animation.html#non-linear-animation|non linear animation}.
 * @module nla
 * @local NlaFinishCallback
 */
b4w.module["nla"] = function(exports, require) {

var m_nla    = require("__nla");
var m_time   = require("__time");
var m_print  = require("__print");
var m_util   = require("__util");

/**
 * Callback executed after the NLA animation has finished.
 * @callback NlaFinishCallback
 */

/**
 * Set NLA animation frame for the active scene.
 * @method module:nla.set_frame
 * @param {number} frame NLA animation frame
 */
exports.set_frame = function(frame) {
    
    frame = m_util.clamp(frame, m_nla.get_frame_start(), 
            m_nla.get_frame_end());

    if (m_nla.check_logic_nodes()) {
        m_print.error("The active scene is using the Logic Editor.");
        return;
    }
    m_nla.set_frame(frame, m_time.get_timeline());
}
/**
 * Get NLA animation frame from the active scene
 * @method module:nla.get_frame
 * @returns {number} NLA animation current frame.
 */
exports.get_frame = function() {
    return m_nla.get_frame(m_time.get_timeline());
}

/**
 * Stop NLA animation for the active scene.
 * @method module:nla.stop
 */
exports.stop = function() {
    if (m_nla.check_logic_nodes()) {
        m_print.error("The active scene is using the Logic Editor.");
        return;
    }
    m_nla.stop_nla();
}

/**
 * Play NLA animation for the active scene
 * @method module:nla.play
 * @param {?NlaFinishCallback} [callback=null] Nla finish callback.
 */
exports.play = function(callback) {
    if (m_nla.check_logic_nodes()) {
        m_print.error("The active scene is using the Logic Editor.");
        return;
    }

    m_nla.play_nla(callback);
}

/**
 * Check if NLA animation is being run for the active scene
 * @method module:nla.is_play
 * @returns {boolean} Check result.
 */
exports.is_play = function() {
    return m_nla.is_play();
}
/**
 * Get NLA animation starting frame for the active scene
 * @method module:nla.get_frame_start
 * @returns {number} Start frame.
 */
exports.get_frame_start = function() {
    return m_nla.get_frame_start();
}
/**
 * Get NLA animation ending frame for the active scene
 * @method module:nla.get_frame_end
 * @returns {number} End frame.
 */
exports.get_frame_end = function() {
    return m_nla.get_frame_end();
}
/**
 * Check if the current scene is currently NLA animated.
 * @method module:nla.check_nla
 * @returns {boolean} Check result.
 */
exports.check_nla = function() {
    return m_nla.check_nla();
}

/**
 * Check if the current scene has logic nodes
 * @method module:nla.check_logic_nodes
 * @returns {boolean} Check result.
 */
exports.check_logic_nodes = function() {
    return m_nla.check_logic_nodes();
}

/**
 * Play NLA animation for the active scene from start frame to end frame.
 * @method module:nla.set_range
 * @param {number} start_frame Start NLA animation frame
 * @param {number} end_frame End NLA animation frame
 */
exports.set_range = function(start_frame, end_frame) {

    if (m_nla.check_logic_nodes()) {
        m_print.error("The active scene is using the Logic Editor.");
        return;
    }

    end_frame = parseFloat(end_frame) || m_nla.get_frame_end();
    start_frame = parseFloat(start_frame) || m_nla.get_frame_end();

    end_frame = m_util.clamp(end_frame, m_nla.get_frame_start(), 
            m_nla.get_frame_end());

    start_frame = m_util.clamp(start_frame, m_nla.get_frame_start(), 
            end_frame);

    m_nla.set_range(start_frame, end_frame);
}
/**
 * Reset NLA animation playing range
 * @method module:nla.reset_range
 */
exports.reset_range = function() {
    if (m_nla.check_logic_nodes()) {
        m_print.error("The active scene is using the Logic Editor.");
        return;
    }
    m_nla.reset_range();
}
/**
 * Set cyclic behaviour for the active scene
 * @method module:nla.set_cyclic
 * @param {boolean} is_cyclic Cyclic behavior.
 */
exports.set_cyclic = function(is_cyclic) {
    if (m_nla.check_logic_nodes()) {
        m_print.error("The active scene is using the Logic Editor.");
        return;
    }
    m_nla.set_cyclic(is_cyclic);
}
/**
 * Clear callback executed after the NLA animation finished
 * @method module:nla.clear_callback
 */
exports.clear_callback = function() {
    if (m_nla.check_logic_nodes()) {
        m_print.error("The active scene is using the Logic Editor.");
        return;
    }
    m_nla.clear_callback();
}
}
