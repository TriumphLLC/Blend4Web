"use strict";

/**
 * Screen shooter add-on.
 * @module screenshooter
 */
b4w.module["screenshooter"] = function(exports, require) {

var m_main = require("main");

var SHOT_URL = "/screenshot";

exports.shot = function() {

    var cb = function(data) {
        console.log("Sending screenshot to server");

        var req = new XMLHttpRequest();
        req.open("POST", SHOT_URL, false);
        req.send(data);

        if (req.status == 200 || req.status == 0) {
            var resp_text = req.responseText;
            if (resp_text.length) {
                console.log("Screenshot sent");
            } else
                throw "Error XHR: responce is empty, POST " + SHOT_URL;
        } else {
            throw "Error XHR: " + req.status + ", POST " + SHOT_URL;
        }
    }

    m_main.canvas_data_url(cb);
}

};
