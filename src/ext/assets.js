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
 * Low-level resource loader. In order to load exported scenes, use the {@link module:data|data} module instead.
 * @module assets
 * @local Asset
 * @local AssetCallback
 * @local ProgressCallback
 * @local PackCallback
 */
b4w.module["assets"] = function(exports, require) {

var m_assets = require("__assets");

/**
 * Loading asset.
 * Asset has the following structure: [uri, type, filepath, optional_param],
 * where uri - asset identifier, type - asset type, filepath - 
 * path to resource (URL), optional_param - any param passed to {@link module:assets~AssetCallback|AssetCallback}
 * @typedef {Array} Asset
 * @alias module:assets.Asset
 */

/**
 * Callback executed after a single asset is loaded.
 * @callback AssetCallback
 * @param {Data} data Loaded data
 * @param {String} uri Data asset ID
 * @param {Number} type Data type
 * @param {String} filepath Data filepath
 * @param {*} [optional_param] Optional parameter
 */

/**
 * Callback executed after the whole pack of assets is loaded.
 * @callback PackCallback
 */

/**
 * Callback for the progress of loading.
 * @callback ProgressCallback
 * @param {Number} value Loading percentage
 */

/**
 * Asset type: ArrayBuffer
 * @const module:assets.AT_ARRAYBUFFER
 */
exports.AT_ARRAYBUFFER   = m_assets.AT_ARRAYBUFFER;

/**
 * Asset type: JSON
 * @const module:assets.AT_JSON
 */
exports.AT_JSON          = m_assets.AT_JSON;

/**
 * Asset type: Text
 * @const module:assets.AT_TEXT
 */
exports.AT_TEXT          = m_assets.AT_TEXT;

/**
 * Asset type: AudioBuffer
 * @const module:assets.AT_AUDIOBUFFER
 */
exports.AT_AUDIOBUFFER   = m_assets.AT_AUDIOBUFFER;

/**
 * Asset type: HTMLImageElement
 * @const module:assets.AT_IMAGE_ELEMENT
 */
exports.AT_IMAGE_ELEMENT = m_assets.AT_IMAGE_ELEMENT;

/**
 * Asset type: HTMLAudioElement
 * @const module:assets.AT_AUDIO_ELEMENT
 */
exports.AT_AUDIO_ELEMENT = m_assets.AT_AUDIO_ELEMENT;

/**
 * Add the assets to the loading queue.
 * @method module:assets.enqueue
 * @param {Asset[]} assets_pack Array of the loading assets
 * @param {AssetCallback} [asset_cb] Callback executed after a single asset is loaded
 * @param {PackCallback} [pack_cb] Callback executed after the whole pack of assets is loaded
 * @param {ProgressCallback} [progress_cb] Callback for the progress of loading
 */
exports.enqueue = function(assets_pack, asset_cb, pack_cb, progress_cb) {
    if (assets_pack.length)
        if (assets_pack["id"])
            m_assets.enqueue(assets_pack, asset_cb, pack_cb, progress_cb);
        else {
            var new_asset_pack = [];
            for (var i = 0; i < assets_pack.length; i++) {
                var pack_elem = assets_pack[i];
                new_asset_pack.push({
                    id: pack_elem[0],
                    type: pack_elem[1],
                    url: pack_elem[2],
                    request: pack_elem.request ? pack_elem.request : "GET",
                    post_type: null,
                    post_data: null,
                    param: pack_elem[3]
                });
            }
            m_assets.enqueue(new_asset_pack, asset_cb, pack_cb, progress_cb);
        }
}

}

