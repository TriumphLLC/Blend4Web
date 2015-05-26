"use strict";

/**
 * NLA API.
 * @module nla
 */
b4w.module["nla"] = function(exports, require) {

var m_nla    = require("__nla");
var m_time   = require("__time");
var m_print  = require("__print");
/**
 * Set NLA animation frame for the active scene
 * @method module:nla.set_nla_frame
 * @param {Number} frame NLA animation frame
 */
exports.set_frame = function(frame) {
    if (frame < 0) {
        m_print.error("Value must be non-negative.");
        return;
    }
    if (m_nla.check_nla_scripts()) {
        m_print.error("The active scene is using NLA script.");
        return;
    }
    m_nla.set_frame(frame, m_time.get_timeline())
}
/**
 * Get NLA animation frame from the active scene
 * @method module:nla.get_nla_frame
 * @returns {Number} NLA animation current frame
 */
exports.get_frame = function() {
    return m_nla.get_frame(m_time.get_timeline());
}
/**
 * Stop NLA animation for the active scene
 * @method module:nla.stop_nla
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
 * @method module:nla.play_nla
 */
exports.play = function() {
    if (m_nla.check_nla_scripts()) {
        m_print.error("The active scene is using NLA script.");
        return;
    }
    m_nla.play_nla();
}
/**
 * Check if NLA animation is being run for the active scene
 * @method module:nla.play_nla
 */
exports.is_play = function() {
    return m_nla.is_play();
}
/**
 * Get NLA animation starting frame for the active scene
 * @method module:nla.get_frame_end
 */
exports.get_frame_start = function() {
    return m_nla.get_frame_start();
}
/**
 * Get NLA animation ending frame for the active scene
 * @method module:nla.get_frame_end
 */
exports.get_frame_end = function() {
    return m_nla.get_frame_end();
}
/**
 * Check if the current scene is currently NLA animated
 * @method module:nla.check_nla
 */
exports.check_nla = function() {
    return m_nla.check_nla();
}
/**
 * Check if the current scene has NLA-scripts
 * @method module:nla.check_nla
 */
exports.check_nla_scripts = function() {
    return m_nla.check_nla_scripts();
}

}
