"use strict";

/**
 * Provides access to the 3D canvas and its HTML container.
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
 * Inserts the DOM element to the container. Specifies the behavior for
 * that element.
 * @method module:container.insert_to_container
 * @param {HTMLElement} obj DOM element
 * @param {String} behavior DOM element behavior
 */
exports.insert_to_container = function(elem, behavior) {

    if (arguments.length != 2) {
        m_print.error("insert_to_container(): two arguments required");
        return;
    }

    if (!elem || !behavior)
        return;

    m_cont.insert_to_container(elem, behavior);
}

}
