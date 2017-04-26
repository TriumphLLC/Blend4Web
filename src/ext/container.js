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
 * Returns the HUD element.
 * @method module:container.get_canvas_hud
 * @returns {HTMLElement} Canvas hud element
 */
exports.get_canvas_hud = m_cont.get_canvas_hud;

/**
 * Returns the HTML element which contains the 3D canvas.
 * @method module:container.get_container
 * @returns {HTMLElement} Canvas container element
 */
exports.get_container = m_cont.get_container;

/**
 * Inserts the DOM element to the container.
 * @method module:container.insert_to_container
 * @param {HTMLElement} elem Inserted DOM element.
 * @param {string} stack_order Inserted DOM element stack order (one of "FIRST",
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
 * @param {number} left Left offset for the container
 * @param {number} top Top offset for the container
 * @deprecated Not needed anymore.
 */
exports.set_canvas_offsets = function(left, top) {
    m_print.error_once("container.set_canvas_offsets() deprecated. " +
            "Not needed anymore. Use the container.client_to_canvas_coords method.");
    return m_cont.set_canvas_offsets(left, top);
}

/**
 * Update canvas left/top offsets (relative to browser window).
 * Can be useful in case of scrolling/DOM-manipulations, when the canvas 
 * position has been changed.
 * @method module:container.update_canvas_offsets
 * @deprecated Not needed anymore.
 */
exports.update_canvas_offsets = function() {
    m_print.error_once("container.update_canvas_offsets() deprecated. " +
            "Not needed anymore. Use the container.client_to_canvas_coords method.");

    m_cont.update_canvas_offsets();
}

/**
 * Convert client(e.clientX/e.clientY) CSS coordinates to CSS coordinates 
 * relative to the Canvas.
 * @method module:container.client_to_canvas_coords
 * @param {number} x X client coordinate.
 * @param {number} y Y client coordinate.
 * @param {Vec2} [dest=Float32Array(2)] Destination vector.
 * @returns {Vec2} CSS coordinates relative to the Canvas.
 */
exports.client_to_canvas_coords = function(x, y, dest) {
    if (!dest)
        dest = new Float32Array(2);

    return m_cont.client_to_canvas_coords(x, y, dest);
}

/**
 * Convert client(e.clientX/e.clientY) CSS coordinates to CSS coordinates
 * relative to the HTML element.
 * @method module:container.client_to_element_coords
 * @param {number} x X client coordinate.
 * @param {number} y Y client coordinate.
 * @param {HTMLElement} element HTML element.
 * @param {Vec2} [dest=Float32Array(2)] Destination vector.
 * @returns {Vec2} CSS coordinates relative to the Canvas.
 */
exports.client_to_element_coords = function(x, y, element, dest) {
    if (!dest)
        dest = new Float32Array(2);

    return m_cont.client_to_element_coords(x, y, element, dest);
}

/**
 * Update canvas offsets on the next request.
 * @method module:container.force_offsets_updating
 * @deprecated Not needed anymore.
 */
exports.force_offsets_updating = function() {
    m_print.error_once("container.force_offsets_updating() deprecated. " +
            "Not needed anymore. Use the container.client_to_canvas_coords method.");

    m_cont.force_offsets_updating();
}

/**
 * Resize the rendering canvas.
 * @method module:container.resize
 * @param {number} width New canvas width
 * @param {number} height New canvas height
 * @param {boolean} [update_canvas_css=true] Change canvas CSS width/height
 */
exports.resize = function(width, height, update_canvas_css) {
    m_cont.resize(width, height, update_canvas_css);
}

/**
 * Fit canvas elements to match the size of container element.
 * @method module:container.resize_to_container
 * @param {boolean} [force=false] Resize canvas element even in case of
 * matching of canvas and container size.
 */
exports.resize_to_container = function(force) {
    force = force || false;
    m_cont.resize_to_container(force);
}

}
