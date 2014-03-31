"use strict";

/**
 * Data API.
 * @module data
 */
b4w.module["data"] = function(exports, require) {

var m_print = require("__print");
var data    = require("__data");

/**
 * Load data from blender json file and apply engine global settings
 * @method module:data.load
 * @param {String} path Path to JSON file
 * @param [opt_loaded_callback] Callback to execute right after load
 * @param [opt_preloader_callback] Callback to report about loading progress
 * @param [wait_resources=false] Wait until all resources loaded
 */
exports["load"] = data.load;
/**
 * @method module:data.load_and_add_new
 * @deprecated Use load() instead
 */
exports["load_and_add_new"] = data.load;

/**
 * Unload previously loaded data.
 * @method module:data.unload
 */
exports["unload"] = function() {
    data.unload();
}
/**
 * @method module:data.cleanup
 * @deprecated Use unload() method
 */
exports["cleanup"] = exports["unload"];

/**
 * @method module:data.get_bpy_world
 * @deprecated Execution forbidden
 */
exports["get_bpy_world"] = function(world_name) {
    m_print.error("get_bpy_world() deprecated");
    return null;
}

/**
 * Set resources root for debug purposes. 
 * Enables check of loading paths, so if resources are not loaded from 
 * the app root there will be warning in m_print.
 * @method module:data.set_debug_resources_root
 * @param {String} debug_resources_root App root directory.
 */
exports["set_debug_resources_root"] = data.set_debug_resources_root;

}
