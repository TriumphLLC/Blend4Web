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
 * API methods to control logic editor.
 * @module logic_nodes
 */
b4w.module["logic_nodes"] = function(exports, require) {

var m_logn = require("__logic_nodes");

/**
 * Register custom callback, used in logic editor.
 * @method module:logic_nodes.append_custom_callback
 * @param {String} cb_id Callback ID.
 * @param {Function} cb Callback function.
 */
exports.append_custom_callback = function(cb_id, cb) {
    m_logn.append_custom_cb(cb_id, cb);
}

/**
 * Remove registered custom callback by its ID.
 * @method module:logic_nodes.remove_custom_callback
 * @param {String} cb_id Callback ID.
 */
exports.remove_custom_callback = function(cb_id) {
    m_logn.remove_custom_cb(cb_id);
}

/**
 * Activate Entry Point node, used in logic editor.
 * @method module:logic_nodes.run_entrypoint
 * @param {String} scene_name Scene name.
 * @param {String} ep_name Entry Point node name.
 */
exports.run_entrypoint = function(scene_name, ep_name) {
    m_logn.run_ep(scene_name, ep_name);
}

}