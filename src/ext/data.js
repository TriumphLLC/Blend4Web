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
 * Data API. Used to load/unload exported json data files.
 * @module data
 * @local StageloadCallback
 * @local LoadedCallback
 */
b4w.module["data"] = function(exports, require) {

/**
 * Data loaded callback.
 * Executed when the data loading process has been completed.
 * @callback LoadedCallback
 * @param {Number} data_id Data ID
 * @param {Boolean} success Load success
 */

/**
 * Loading stage callback.
 * Used to implement loading progress indicators (preloaders).
 * @callback StageloadCallback
 * @param {Number} percentage Loading progress (0-100).
 * @param {Number} load_time Loading time in ms.
 */

var m_data   = require("__data");
var m_loader = require("__loader");
var m_print  = require("__print");

/**
 * Load data from the json file exported from Blender.
 * @method module:data.load
 * @param {String} path Path to JSON file
 * @param {LoadedCallback} [loaded_cb=null] Callback to be executed right after load
 * @param {StageloadCallback} [stageload_cb=null] Callback to report about the loading progress
 * @param {Boolean} [wait_complete_loading=false] Wait until all resources are loaded
 * @param {Boolean} [load_hidden=false] Hide loaded and disable physics objects
 * @returns {Number} ID of loaded data.
 */
exports.load = m_data.load;

/**
 * Unload the previously loaded data.
 * @method module:data.unload
 * @param {Number} [data_id=0] ID of unloaded data. Unload all data if data_id is zero.
 */
exports.unload = function(data_id) {
    data_id = data_id | 0;
    m_data.unload(data_id);
}


/**
 * Set the root which contains the resources, for debug purposes. 
 * Enables the checking of loading paths, so if the resources are not loaded from 
 * the app root, there will be a warning in m_print.
 * @method module:data.set_debug_resources_root
 * @param {String} debug_resources_root App root directory.
 */
exports.set_debug_resources_root = m_data.set_debug_resources_root;

/**
 * Check if the engine primary data (main scene) is loaded (detect the last loading stage).
 * @method module:data.is_primary_loaded
 * @returns {Boolean} Check result
 */
exports.is_primary_loaded = m_data.is_primary_loaded;

/**
 * Check if the engine has finished all of the scheduled loading actions.
 * @method module:data.is_idle
 * @returns {Boolean} Check result
 */
exports.is_idle = m_loader.is_finished;

exports.load_and_add_new = m_data.load;

exports.cleanup = exports.unload;
/**
 * Activate media data context.
 * Activation of audio/video contexts is required for mobile platforms which
 * disable media playback without explicit user interaction. This method
 * should be executed inside some input event listener.
 * @method module:data.activate_media
 */
exports.activate_media = m_data.activate_media;

}
