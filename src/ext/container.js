"use strict";

/**
 * Provides access to the 3D canvas element and its container.
 * @module container
 */
b4w.module["container"] = function(exports, require) {

var m_cont   = require("__container");
var m_print  = require("__print");

/**
 * Returns the 3D canvas element.
 * @method module:container.get_canvas
 * @returns {HTMLElement} Canvas element
 */
exports.get_canvas = m_cont.get_canvas;

/**
 * Returns the HTML element which contains the 3D canvas.
 * @method module:container.get_container
 * @returns {HTMLElement} Canvas container element
 */
exports.get_container = m_cont.get_container;

/**
 * Inserts the DOM element to the container.
 * @method module:container.insert_to_container
 * @param {HTMLElement} obj Inserted DOM element.
 * @param {String} stack_order Inserted DOM element stack order (one of "FIRST",
 * "JUST_BEFORE_CANVAS", "JUST_AFTER_CANVAS", "LAST").
 */
exports.insert_to_container = function(elem, stack_order) {

    if (arguments.length != 2) {
        m_print.error("insert_to_container(): two arguments required");
        return;
    }

    if (!elem || !stack_order)
        return;

    m_cont.insert_to_container(elem, stack_order);
}

/**
 * Set left/top offsets (relative to browser window) for the canvas.
 * Can be useful in case of scrolling/DOM-manipulations, when the canvas 
 * position has been changed.
 * @method module:container.set_canvas_offsets
 * @param {Number} left Left offset for the container
 * @param {Number} top Top offset for the container
 */
exports.set_canvas_offsets = m_cont.set_canvas_offsets;

/**
 * Update canvas left/top offsets (relative to browser window).
 * Can be useful in case of scrolling/DOM-manipulations, when the canvas 
 * position has been changed.
 * @method module:container.update_canvas_offsets
 */
exports.update_canvas_offsets = m_cont.update_canvas_offsets;

/**
 * Convert client(e.clientX/e.clientY) CSS coordinates to CSS coordinates 
 * relative to the Canvas.
 * @method module:container.client_to_canvas_coords
 * @param {Number} x X client coordinate.
 * @param {Number} y Y client coordinate.
 * @param {Vec2} [dest=Float32Array(2)] CSS coordinates relative to the Canvas.
 * @returns {Vec2} CSS coordinates relative to the Canvas.
 */
exports.client_to_canvas_coords = m_cont.client_to_canvas_coords;

/**
 * Update canvas offsets on the next request.
 * @method module:container.force_offsets_updating
 */
exports.force_offsets_updating = m_cont.force_offsets_updating;

}
