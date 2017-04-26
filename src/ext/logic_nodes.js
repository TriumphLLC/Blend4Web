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
 * API methods to control the {@link https://www.blend4web.com/doc/en/logic_editor.html|Logic Editor}.
 * @module logic_nodes
 */
b4w.module["logic_nodes"] = function(exports, require) {

var m_logn = require("__logic_nodes");

/**
 * Register custom callback, used in logic editor.
 * @method module:logic_nodes.append_custom_callback
 * @param {string} cb_id Callback ID.
 * @param {Function} cb Callback function.
 * @example var m_log_nodes = require("logic_nodes");
 * var cb = function() {
 *     console.log("Blend4Web rules!");
 * }
 *
 * m_log_nodes.append_custom_callback("cb_ID", cb);
 */
exports.append_custom_callback = function(cb_id, cb) {
    m_logn.append_custom_cb(cb_id, cb);
}

/**
 * Remove registered custom callback by its ID.
 * @method module:logic_nodes.remove_custom_callback
 * @param {string} cb_id Callback ID.
 * @example var m_log_nodes = require("logic_nodes");
 *
 * m_log_nodes.remove_custom_callback("cb_ID");
 */
exports.remove_custom_callback = function(cb_id) {
    m_logn.remove_custom_cb(cb_id);
}

/**
 * Activate Entry Point node, used in logic editor.
 * @method module:logic_nodes.run_entrypoint
 * @param {string} scene_name Scene name.
 * @param {string} ep_name Entry Point node name.
 * @example var m_log_nodes = require("logic_nodes");
 * m_log_nodes.run_entrypoint("Scene", "B4WLogicNode");
 */
exports.run_entrypoint = function(scene_name, ep_name) {
    m_logn.run_ep(scene_name, ep_name);
}

}
