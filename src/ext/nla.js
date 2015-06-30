"use strict";

/**
 * NLA API.
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
 * Set NLA animation frame for the active scene
 * @method module:nla.set_nla_frame
 * @param {Number} frame NLA animation frame
 */
exports.set_frame = function(frame) {
    
    frame = m_util.clamp(frame, m_nla.get_frame_start(), 
            m_nla.get_frame_end());

    if (m_nla.check_nla_scripts()) {
        m_print.error("The active scene is using NLA script.");
        return;
    }
    m_nla.set_frame(frame, m_time.get_timeline());
}
/**
 * Get NLA animation frame from the active scene
 * @method module:nla.get_frame
 * @returns {Number} NLA animation current frame.
 */
exports.get_frame = function() {
    return m_nla.get_frame(m_time.get_timeline());
}

/**
 * Stop NLA animation for the active scene.
 * @method module:nla.stop
 */
exports.stop = function() {
    if (m_nla.check_nla_scripts()) {
        m_print.error("The active scene is using NLA script.");
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
    if (m_nla.check_nla_scripts()) {
        m_print.error("The active scene is using NLA script.");
        return;
    }

    m_nla.play_nla(callback);
}

/**
 * Check if NLA animation is being run for the active scene
 * @method module:nla.is_play
 * @returns {Boolean} Check result.
 */
exports.is_play = function() {
    return m_nla.is_play();
}
/**
 * Get NLA animation starting frame for the active scene
 * @method module:nla.get_frame_start
 * @returns {Number} Start frame.
 */
exports.get_frame_start = function() {
    return m_nla.get_frame_start();
}
/**
 * Get NLA animation ending frame for the active scene
 * @method module:nla.get_frame_end
 * @returns {Number} End frame.
 */
exports.get_frame_end = function() {
    return m_nla.get_frame_end();
}
/**
 * Check if the current scene is currently NLA animated.
 * @method module:nla.check_nla
 * @returns {Boolean} Check result.
 */
exports.check_nla = function() {
    return m_nla.check_nla();
}

/**
 * Check if the current scene has NLA-scripts
 * @method module:nla.check_nla_scripts
 * @returns {Boolean} Check result.
 */
exports.check_nla_scripts = function() {
    return m_nla.check_nla_scripts();
}

/**
 * Play NLA animation for the active scene from start frame to end frame.
 * @method module:nla.set_range
 * @param {Number} start_frame Start NLA animation frame
 * @param {Number} end_frame End NLA animation frame
 */
exports.set_range = function(start_frame, end_frame) {

    if (m_nla.check_nla_scripts()) {
        m_print.error("The active scene is using NLA script.");
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
    if (m_nla.check_nla_scripts()) {
        m_print.error("The active scene is using NLA script.");
        return;
    }
    m_nla.reset_range();
}
/**
 * Set cyclic behaviour for the active scene
 * @method module:nla.set_cyclic
 * @param {Boolean} is_cyclic Cyclic behavior.
 */
exports.set_cyclic = function(is_cyclic) {
    if (m_nla.check_nla_scripts()) {
        m_print.error("The active scene is using NLA script.");
        return;
    }
    m_nla.set_cyclic(is_cyclic);
}
/**
 * Clear callback executed after the NLA animation finished
 * @method module:nla.clear_callback
 */
exports.clear_callback = function() {
    if (m_nla.check_nla_scripts()) {
        m_print.error("The active scene is using NLA script.");
        return;
    }
    m_nla.clear_callback();
}
}
