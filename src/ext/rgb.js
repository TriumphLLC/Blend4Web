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
"use strict"

/**
 * RGB colors API.
 * To match standard Blender behavior colors in Blend4Web are always stored in linear space, for more info check the {@link https://www.blend4web.com/doc/en/colors.html documentation}.
 * @module rgb
 */
b4w.module["rgb"] = function(exports, require) {

var m_util  = require("__util");

var _rgb_tmp = new Float32Array(3);

/**
 * Creates a new empty RGB vector representing black color.
 * @returns {RGB} A new RGB vector.
 * @alias module:rgb.create
 * @example var m_rgb = require("rgb");
 *
 * var new_color = m_rgb.create();
 */
exports.create = function() {
    var dest = new Float32Array(3);
    return dest;
};

/**
 * Creates a new RGB vector initialized with the given values.
 *
 * @param {number} r Red component.
 * @param {number} g Green component.
 * @param {number} b Blue component.
 * @returns {RGB} A new RGB vector.
 * @alias module:rgb.from_values
 * @example var m_rgb = require("rgb");
 *
 * var new_color = m_rgb.from_values(0.5, 0.5, 0.5);
 */
exports.from_values = function(r, g, b) {
    var dest = new Float32Array(3);
    dest[0] = r;
    dest[1] = g;
    dest[2] = b;
    return dest;
};

/**
 * Set the components of RGB vector to the given values.
 *
 * @param {number} r Red component.
 * @param {number} g Green component.
 * @param {number} b Blue component.
 * @param {RGB} dest Destination RGB vector.
 * @returns {RGB} Destination RGB vector.
 * @alias module:rgb.set
 * @example var m_rgb = require("rgb");
 *
 * var new_color = new Float32Array(3);
 * 
 * m_rgb.set(0.7, 0.5, 0.1, new_color);
 */
exports.set = function(r, g, b, dest) {
    dest[0] = r;
    dest[1] = g;
    dest[2] = b;
    return dest;
};

/**
 * Convert CSS color components to RGB.
 * @param {number} css_red CSS color red component (0-255).
 * @param {number} css_green CSS color green component (0-255).
 * @param {number} css_blue CSS color blue component (0-255).
 * @param {RGB} [dest=rgb.create()] Destination RGB vector.
 * @returns {RGB} Destination RGB vector.
 * @alias module:rgb.css_to_rgb
 * @example var m_rgb = require("rgb");
 *
 * // #808080 or rgb(128, 128, 128) converted to [0.219, 0.219, 0.219]
 * var rgb_color = m_rgb.css_to_rgb(128, 128, 128);
 */
exports.css_to_rgb = function(css_red, css_green, css_blue, dest) {

    dest = dest || new Float32Array(3);

    dest[0] = css_red / 255;
    dest[1] = css_green / 255;
    dest[2] = css_blue / 255;
    m_util.srgb_to_lin(dest, dest);

    return dest;
}

/**
 * Convert RGB color components to CSS color.
 * @param {RGB} rgb RGB color vector.
 * @returns {number[]} Array with CSS colors.
 * @alias module:rgb.rgb_to_css
 * @example
 * var m_rgb = require("rgb");
 *
 * var rgb_color = m_rgb.from_values(0.219, 0.219, 0.219);
 * // [0.219, 0.219, 0.219] converted to [128, 128, 128]
 * var color = m_rgb.rgb_to_css(rgb_color);
 */
exports.rgb_to_css = function(rgb) {

    var srgb = m_util.lin_to_srgb(rgb, _rgb_tmp);

    return [Math.round(255*srgb[0]), Math.round(255*srgb[1]), Math.round(255*srgb[2])];
}

/**
 * Convert RGB color components to CSS color hex string.
 * @param {RGB} rgb RGB color vector.
 * @returns {string} CSS color hex string.
 * @alias module:rgb.rgb_to_css_hex
 * @example
 * var m_rgb = require("rgb");
 *
 * var rgb_color = m_rgb.from_values(0.219, 0.219, 0.219);
 * // [0.219, 0.219, 0.219] converted to "#808080"
 * var hex_color = m_rgb.rgb_to_css_hex(rgb_color);
 */
exports.rgb_to_css_hex = function(rgb) {

    var col_to_hex = function(num) {
        var s = Math.round(255*num).toString(16);
        return s.length == 1 ? "0" + s : s;
    }

    var srgb = m_util.lin_to_srgb(rgb, _rgb_tmp);

    return "#" + col_to_hex(srgb[0]) + col_to_hex(srgb[1]) + col_to_hex(srgb[2]);
}

}


/**
 * RGBA colors API.
 * To match standard Blender behavior colors in Blend4Web are always stored in linear space, for more info check the {@link https://www.blend4web.com/doc/en/colors.html documentation}.
 * @module rgba
 */
b4w.module["rgba"] = function(exports, require) {

var m_util  = require("__util");

var _rgb_tmp = new Float32Array(3);

/**
 * Creates a new empty RGB vector representing black opaque color.
 * @returns {RGBA} A new RGBA vector.
 * @alias module:rgba.create
 * @example var m_rgba = require("rgba");
 *
 * var new_rgba_color = m_rgba.create();
 */
exports.create = function() {
    var dest = new Float32Array(4);
    dest[3] = 1;
    return dest;
};

/**
 * Creates a new RGBA vector initialized with the given values.
 *
 * @param {number} r Red component.
 * @param {number} g Green component.
 * @param {number} b Blue component.
 * @param {number} a Alpha component.
 * @returns {RGBA} A new RGBA vector.
 * @alias module:rgba.from_values
 * @example var m_rgba = require("rgba");
 *
 * var new_rgba_color = m_rgba.from_values(0.5, 0.5, 0.5, 0.5);
 */
exports.from_values = function(r, g, b, a) {
    var dest = new Float32Array(4);
    dest[0] = r;
    dest[1] = g;
    dest[2] = b;
    dest[3] = a;
    return dest;
};

/**
 * Set the components of RGBA vector to the given values.
 *
 * @param {number} r Red component.
 * @param {number} g Green component.
 * @param {number} b Blue component.
 * @param {number} a Alpha component.
 * @param {RGBA} dest Destination RGBA vector.
 * @returns {RGBA} Destination RGBA vector.
 * @alias module:rgba.set
 * @example var m_rgba = require("rgba");
 *
 * var new_rgba_color = new Float32Array(4);
 *
 * m_rgba.set(0.1, 0.5, 0.3, 1.0, new_rgba_color);
 */
exports.set = function(r, g, b, a, dest) {
    dest[0] = r;
    dest[1] = g;
    dest[2] = b;
    dest[3] = a;
    return dest;
};

/**
 * Convert CSS color components to RGBA.
 * @param {number} css_red CSS color red component (0-255).
 * @param {number} css_green CSS color green component (0-255).
 * @param {number} css_blue CSS color blue component (0-255).
 * @param {number} css_alpha CSS alpha component (0-1).
 * @param {RGBA} [dest=rgba.create()] Destination RGB vector.
 * @returns {RGBA} Destination RGB vector.
 * @alias module:rgba.css_to_rgba
 * @example var m_rgba = require("rgba");
 *
 * // rgba(128, 128, 128, 0.5) converted to [0.219, 0.219, 0.219, 0.5]
 * var rgba_color = m_rgba.css_to_rgba(128, 128, 128, 0.5);
 */
exports.css_to_rgba = function(css_red, css_green, css_blue, css_alpha, dest) {

    dest = dest || new Float32Array(4);

    dest[0] = css_red / 255;
    dest[1] = css_green / 255;
    dest[2] = css_blue / 255;
    dest[3] = css_alpha;
    m_util.srgb_to_lin(dest, dest);

    return dest;
}

/**
 * Convert RGBA color components to CSS color.
 * @param {RGBA} rgba RGBA color vector.
 * @returns {number[]} Array with CSS colors.
 * @alias module:rgba.rgba_to_css
 * @example var m_rgba = require("rgba");
 *
 * var rgba_color = m_rgba.from_values(0.219, 0.219, 0.219, 0.5);
 * // [0.219, 0.219, 0.219, 0.5] converted to [128, 128, 128, 0.5]
 * var color = m_rgba.rgba_to_css(rgba_color);
 */
exports.rgba_to_css = function(rgba) {

    var srgb = m_util.lin_to_srgb(rgba, _rgb_tmp);

    return [Math.round(255*srgb[0]), Math.round(255*srgb[1]), 
            Math.round(255*srgb[2]), rgba[3]];
}

}

