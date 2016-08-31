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
"use strict"

/**
 * RGB colors API.
 * Colors in Blend4Web are always stored in linear space, for more info check
 * {@link https://www.blend4web.com/doc/en/colors.html documentation}.
 * @module rgb
 */
b4w.module["rgb"] = function(exports, require) {

var m_print = require("__print");
var m_util  = require("__util");

var _rgb_tmp = new Float32Array(3);

/**
 * Creates a new empty RGB vector representing black color.
 * @returns {RGB} A new RGB vector.
 * @alias module:rgb.create
 */
exports.create = function() {
    var dest = new Float32Array(3);
    return dest;
};

/**
 * Creates a new RGB vector initialized with the given values.
 *
 * @param {Number} r Red component.
 * @param {Number} g Green component.
 * @param {Number} b Blue component.
 * @returns {RGB} A new RGB vector.
 * @alias module:rgb.from_values
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
 * @param {Number} r Red component.
 * @param {Number} g Green component.
 * @param {Number} b Blue component.
 * @param {RGB} dest Destination RGB vector.
 * @returns {RGB} Destination RGB vector.
 * @alias module:rgb.set
 */
exports.set = function(r, g, b, dest) {
    dest[0] = r;
    dest[1] = g;
    dest[2] = b;
    return dest;
};

/**
 * Convert CSS color components to RGB.
 * @param {Number} css_red CSS color red component (0-255).
 * @param {Number} css_green CSS color green component (0-255).
 * @param {Number} css_blue CSS color blue component (0-255).
 * @param {RGB} [dest=rgb.create()] Destination RGB vector.
 * @returns {RGB} Destination RGB vector.
 * @alias module:rgb.css_to_rgb
 * @example
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
 * @returns {Number[]} Array with CSS colors.
 * @alias module:rgb.rgb_to_css
 * @example
 * // [0.219, 0.219, 0.219] converted to [128, 128, 128]
 * var color = m_rgb.rgb_to_css(m_rgb.from_values(0.219, 0.219, 0.219));
 */
exports.rgb_to_css = function(rgb) {

    var srgb = m_util.lin_to_srgb(rgb, _rgb_tmp);

    return [Math.round(255*srgb[0]), Math.round(255*srgb[1]), Math.round(255*srgb[2])];
}

/**
 * Convert RGB color components to CSS color hex string.
 * @param {RGB} rgb RGB color vector.
 * @returns {String} CSS color hex string.
 * @alias module:rgb.rgb_to_css_hex
 * @example
 * // [0.219, 0.219, 0.219] converted to "#808080"
 * var hex_color = m_rgb.rgb_to_css_hex(m_rgb.from_values(0.219, 0.219, 0.219));
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
 * Colors in Blend4Web are always stored in linear space, for more info check
 * {@link https://www.blend4web.com/doc/en/colors.html documentation}.
 * @module rgba
 */
b4w.module["rgba"] = function(exports, require) {

var m_print = require("__print");
var m_util  = require("__util");

var _rgb_tmp = new Float32Array(3);

/**
 * Creates a new empty RGB vector representing black opaque color.
 * @returns {RGBA} A new RGBA vector.
 * @alias module:rgba.create
 */
exports.create = function() {
    var dest = new Float32Array(4);
    dest[3] = 1;
    return dest;
};

/**
 * Creates a new RGBA vector initialized with the given values.
 *
 * @param {Number} r Red component.
 * @param {Number} g Green component.
 * @param {Number} b Blue component.
 * @param {Number} a Alpha component.
 * @returns {RGBA} A new RGBA vector.
 * @alias module:rgba.from_values
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
 * @param {Number} r Red component.
 * @param {Number} g Green component.
 * @param {Number} b Blue component.
 * @param {Number} a Alpha component.
 * @param {RGBA} dest Destination RGBA vector.
 * @returns {RGBA} Destination RGBA vector.
 * @alias module:rgba.set
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
 * @param {Number} css_red CSS color red component (0-255).
 * @param {Number} css_green CSS color green component (0-255).
 * @param {Number} css_blue CSS color blue component (0-255).
 * @param {Number} css_alpha CSS alpha component (0-1).
 * @param {RGBA} [dest=rgba.create()] Destination RGB vector.
 * @returns {RGBA} Destination RGB vector.
 * @alias module:rgba.css_to_rgba
 * @example
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
 * @returns {Number[]} Array with CSS colors.
 * @alias module:rgba.rgba_to_css
 * @example
 * // [0.219, 0.219, 0.219, 0.5] converted to [128, 128, 128, 0.5]
 * var color = m_rgba.rgba_to_css(m_rgba.from_values(0.219, 0.219, 0.219, 0.5));
 */
exports.rgba_to_css = function(rgba) {

    var srgb = m_util.lin_to_srgb(rgba, _rgb_tmp);

    return [Math.round(255*srgb[0]), Math.round(255*srgb[1]), 
            Math.round(255*srgb[2]), rgba[3]];
}

}

