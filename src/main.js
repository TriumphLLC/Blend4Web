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
 * Inner main Blend4Web module.
 * @module main
 */
b4w.module["__main"] = function(exports, require) {

var m_cont = require("__container");

var _canvas_data_url_params = {
    callback: null,
    format: "image/png",
    quality: 1.0,
    blob_url: "",
    last_auto_revoke: false,
    curr_auto_revoke: false
};

function to_blob(callback, type, quality) {
    var canvas = m_cont.get_canvas();

    if (canvas.toBlob)
        canvas.toBlob(callback, type, quality);
    else {
        var binStr = atob(canvas.toDataURL(type, quality).split(',')[1]);
        var data = new Uint8Array(binStr.length);

        for (var i = 0; i < binStr.length; i++)
            data[i] = binStr.charCodeAt(i);

        callback(new Blob([data], {type: type || 'image/png'}));
    }
}

exports.canvas_data_url = function(callback, format, quality, auto_revoke) {
    _canvas_data_url_params.curr_auto_revoke = typeof auto_revoke === "undefined" ?
            auto_revoke: true;

    _canvas_data_url_params.last_auto_revoke = _canvas_data_url_params.curr_auto_revoke;
    _canvas_data_url_params.callback = callback;
    _canvas_data_url_params.format = format || _canvas_data_url_params.format;
    _canvas_data_url_params.quality = quality || _canvas_data_url_params.quality;
}

exports.frame = function(timeline, delta) {

    // make screenshot
    var cb = _canvas_data_url_params.callback;
    if (cb) {
        if (_canvas_data_url_params.last_auto_revoke)
            URL.revokeObjectURL(_canvas_data_url_params.blob_url);

        to_blob(function(blob) {
            _canvas_data_url_params.blob_url = URL.createObjectURL(blob);
            cb(_canvas_data_url_params.blob_url);
        }, _canvas_data_url_params.format, _canvas_data_url_params.quality);

        _canvas_data_url_params.callback = null;
        _canvas_data_url_params.format = "image/png";
        _canvas_data_url_params.quality = 1.0;
    }
}

}
