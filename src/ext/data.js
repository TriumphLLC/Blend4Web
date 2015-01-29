"use strict";

/**
 * Data API. Used to load/unload exported json data files.
 * @module data
 */
b4w.module["data"] = function(exports, require) {

var data    = require("__data");
var m_print = require("__print");
var m_util  = require("__util");

/**
 * Data loaded callback.
 * @callback loaded_callback
 * @param {Number} data_id Data ID
 * @param {Boolean} success Load success
 */

/**
 * Loading stage callback.
 * @callback stageload_callback
 * @param {Number} percentage Loading progress (0-100)
 */

/**
 * Load data from the json file exported from Blender.
 * @method module:data.load
 * @param {String} path Path to JSON file
 * @param {loaded_callback} [loaded_cb=null] Callback to be executed right after load
 * @param {stageload_callback} [stageload_cb=null] Callback to report about the loading progress
 * @param {Boolean} [wait_complete_loading=false] Wait until all resources are loaded
 * @param {Boolean} [load_hidden=false] Hide loaded and disable physics objects
 * @returns {Number} ID of loaded data.
 */
exports.load = data.load;

/**
 * Unload the previously loaded data.
 * @method module:data.unload
 * @param {Number} [data_id=0] ID of unloaded data. Unload all data if data_id is zero.
 */
exports.unload = function(data_id) {
    data_id = data_id | 0;
    data.unload(data_id);
}


/**
 * Set the root which contains the resources, for debug purposes. 
 * Enables the checking of loading paths, so if the resources are not loaded from 
 * the app root, there will be a warning in m_print.
 * @method module:data.set_debug_resources_root
 * @param {String} debug_resources_root App root directory.
 */
exports.set_debug_resources_root = data.set_debug_resources_root;

/**
 * Check if the engine primary data is loaded (detect the last loading stage).
 * @method module:data.is_primary_loaded
 * @returns {Boolean} Check result
 */
exports.is_primary_loaded = data.is_primary_loaded;


// DEPRECATED

exports.load_and_add_new = data.load;

exports.get_bpy_world = function(world_name) {
    m_util.panic("get_bpy_world() deprecated");
    return null;
}

exports.cleanup = exports.unload;

}
