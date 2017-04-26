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
 * Low-level resource loader. In order to load exported scenes, use the {@link module:data|data} module instead.
 * @module assets
 * @local AssetRequest
 * @local AssetType
 * @local AssetCallback
 * @local ProgressCallback
 * @local PackCallback
 */
b4w.module["assets"] = function(exports, require) {

var m_assets = require("__assets");

/**
 * An object that defines how the asset resource should be loaded.
 * @typedef {Object} AssetRequest
 * @property {*} id Asset identifier. Passed to the 
 * {@link AssetCallback|AssetCallback} as a parameter. Can be unique to  
 * distinguish asset requests if needed.
 * @property {AssetType} type Asset type.
 * @property {string} url URL of a resource.
 * @property {string} [request_method="GET"] Request method. Supported are "GET" and "POST".
 * @property {Object} [overwrite_header] An object containing fields for 
 * overwriting request headers. For example: { "Content-Type": "image/png" }.
 * @property {*} [post_data] The request body that will be sent in a "POST" request. 
 * @property {*} [param] An optional parameter that will be passed to the 
 * {@link AssetCallback|AssetCallback}.
 * @cc_externs id type url request_method overwrite_header post_data param
 */

/**
 * Asset type. Defines which type of data will be loaded, e.g: json, plain text,
 * binary buffer, ...
 * @typedef {number} AssetType
 * @see {@link module:assets.AT_ARRAYBUFFER|AT_ARRAYBUFFER},
 * {@link module:assets.AT_ARRAYBUFFER_ZIP|AT_ARRAYBUFFER_ZIP},
 * {@link module:assets.AT_JSON|AT_JSON},
 * {@link module:assets.AT_JSON_ZIP|AT_JSON_ZIP},
 * {@link module:assets.AT_TEXT|AT_TEXT},
 * {@link module:assets.AT_AUDIOBUFFER|AT_AUDIOBUFFER},
 * {@link module:assets.AT_IMAGE_ELEMENT|AT_IMAGE_ELEMENT},
 * {@link module:assets.AT_AUDIO_ELEMENT|AT_AUDIO_ELEMENT},
 * {@link module:assets.AT_VIDEO_ELEMENT|AT_VIDEO_ELEMENT},
 * {@link module:assets.AT_SEQ_VIDEO_ELEMENT|AT_SEQ_VIDEO_ELEMENT},
 */

/**
 * Callback executed after a single asset is loaded.
 * @callback AssetCallback
 * @param {Data} data Loaded data.
 * @param {*} id Data asset ID.
 * @param {AssetType} type Data type.
 * @param {string} url URL of a resource.
 * @param {*} [opt_param] Optional parameter
 */

/**
 * Callback executed after the whole pack of assets is loaded.
 * @callback PackCallback
 */

/**
 * Callback for the progress of loading.
 * @callback ProgressCallback
 * @param {number} rate Amount of loaded data: 0 to 1.
 */

/**
 * Asset type intended for loading various binary data. The loaded data will be 
 * available as an ArrayBuffer object. Supported request methods: "GET".
 * @const {AssetType} module:assets.AT_ARRAYBUFFER
 */
exports.AT_ARRAYBUFFER = m_assets.AT_ARRAYBUFFER;

/**
 * Asset type intended for loading compressed binary data of a GZIP format. The 
 * loaded data will be available as an ArrayBuffer object. Supported request 
 * methods: "GET".
 * @const {AssetType} module:assets.AT_ARRAYBUFFER_ZIP
 */
exports.AT_ARRAYBUFFER_ZIP = m_assets.AT_ARRAYBUFFER_ZIP;

/**
 * Asset type intended for loading JSON files. The loaded data will be available 
 * as a JSON object. Supported request methods: "GET", "POST".
 * @const {AssetType} module:assets.AT_JSON
 */
exports.AT_JSON = m_assets.AT_JSON;

/**
 * Asset type intended for loading JSON files compressed in a GZIP format. The 
 * loaded data will be available as a JSON object. Supported request methods: 
 * "GET".
 * @const {AssetType} module:assets.AT_JSON_ZIP
 */
exports.AT_JSON_ZIP = m_assets.AT_JSON_ZIP;

/**
 * Asset type intended for loading files with a plain text. The loaded data will
 * be available as a String object. Supported request methods: "GET", "POST".
 * @const {AssetType} module:assets.AT_TEXT
 */
exports.AT_TEXT = m_assets.AT_TEXT;

/**
 * Asset type intended for loading audio files (preferably short audio assets). 
 * The loaded data will be available as an AudioBuffer object. Supported request 
 * methods: "GET".
 * @const {AssetType} module:assets.AT_AUDIOBUFFER
 */
exports.AT_AUDIOBUFFER = m_assets.AT_AUDIOBUFFER;

/**
 * Asset type intended for loading common image files (JPEG, PNG, GIF). The 
 * loaded data will be available as an HTMLImageElement object. Supported 
 * request methods: "GET".
 * @const {AssetType} module:assets.AT_IMAGE_ELEMENT
 */
exports.AT_IMAGE_ELEMENT = m_assets.AT_IMAGE_ELEMENT;

/**
 * Asset type intended for loading common audio files. The loaded data will be 
 * available as an HTMLAudioElement object. Supported request methods: "GET".
 * @const {AssetType} module:assets.AT_AUDIO_ELEMENT
 */
exports.AT_AUDIO_ELEMENT = m_assets.AT_AUDIO_ELEMENT;

/**
 * Asset type intended for loading common video files. The loaded data will be 
 * available as an HTMLVideoElement object. Supported request methods: "GET".
 * @const {AssetType} module:assets.AT_VIDEO_ELEMENT
 */
exports.AT_VIDEO_ELEMENT = m_assets.AT_VIDEO_ELEMENT;

/**
 * Asset type intended for loading video files of a special ".seq" format. The 
 * loaded data will be available as an object of the following structure:
 * { images: [HTMLImageElement, ...], fps: number }. Supported request methods: 
 * "GET".
 * @see https://www.blend4web.com/doc/en/developers.html#seq-video-format
 * @const {AssetType} module:assets.AT_SEQ_VIDEO_ELEMENT
 */
exports.AT_SEQ_VIDEO_ELEMENT = m_assets.AT_SEQ_VIDEO_ELEMENT;


/**
 * Add the assets to the loading queue.
 * @method module:assets.enqueue
 * @param {AssetRequest[]} assets_pack Array of the asset requests.
 * @param {AssetCallback} [asset_cb] Callback executed after a single asset is loaded
 * @param {PackCallback} [pack_cb] Callback executed after the whole pack of assets is loaded
 * @param {ProgressCallback} [progress_cb] Callback for the progress of loading.
 * @example var m_assets = require("assets");
 *
 * var asset_cb = function(data, id, type, url) {
 *      console.log("LOADED:", url);
 * }
 * 
 * var pack_cb() {
 *      console.log("ALL DATA LOADED!");
 * }
 *
 * var progress_cb = function(rate) {
 *      console.log(rate * 100 + "% LOADED");
 * }
 *
 * m_assets.enqueue([
 *      {id: "my_json001", type: m_assets.AT_JSON, url: "./my_json.json"}, 
 *      {id: "my_img001", type: m_assets.AT_IMAGE_ELEMENT, url: "./my_image.jpg"}
 *      ], asset_cb, pack_cb, progress_cb);
 */
exports.enqueue = function(assets_pack, asset_cb, pack_cb, progress_cb) {
    if (assets_pack.length)
        m_assets.enqueue(assets_pack, asset_cb, pack_cb, progress_cb);
}

}

