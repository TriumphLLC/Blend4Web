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

        a.style = "display: none";
        a.href = data;
        a.download = "screenshot.png";
        a.click();

        document.body.removeChild(a);
    }

    m_main.canvas_data_url(cb);
}

};
