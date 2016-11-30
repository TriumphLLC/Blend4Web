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
 * Screen shooter add-on.
 * @module screenshooter
 */
b4w.module["screenshooter"] = function(exports, require) {

var m_main = require("main");

/**
 * Take a screenshot and download as screenshot.png image.
 * @method module:screenshooter.shot
 * @param {String} [format="image/png"] The MIME image format ("image/png",
 * "image/jpeg", "image/webp" and so on)
 * @param {Number} [quality=1.0] Number between 0 and 1 for types: "image/jpeg",
 * "image/webp"
 * @example
 * var m_scrn = require("screenshooter");
 * m_scrn.shot();
 */
exports.shot = function(format, quality) {
    format = format || "image/png";
    quality = quality || 1.0;

    var cb = function(url) {
        var a = window.document.createElement("a");
        document.body.appendChild(a);
        a.style.display = "none";
        a.href = url;
        a.download = "screenshot." + format.split("/")[1];
        a.click();

        document.body.removeChild(a);
    }

    m_main.canvas_data_url(cb, format, quality, true);
}

};
