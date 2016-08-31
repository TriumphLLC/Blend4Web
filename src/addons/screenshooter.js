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
 */
exports.shot = function() {

    var cb = function(data) {
        var a = window.document.createElement("a");
        document.body.appendChild(a);

        a.style.display = "none";
        a.href = data;
        a.download = "screenshot.png";
        a.click();

        document.body.removeChild(a);
    }

    m_main.canvas_data_url(cb);
}

};
