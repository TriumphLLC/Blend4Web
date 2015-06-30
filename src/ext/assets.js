"use strict";

/** 
 * Low-level resource loader. In order to load exported scenes, use the {@link module:data|data} module instead.
 * @module assets
 * @local AssetCallback
 * @local ProgressCallback
 * @local PackCallback
 */
b4w.module["assets"] = function(exports, require) {

var m_assets = require("__assets");

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
 * @param {Array} assets_pack Array of the assets in the following format: [[uri, type, filepath, optional_param], ...]
 * @param {AssetCallback} [asset_cb] Callback executed after a single asset is loaded
 * @param {PackCallback} [pack_cb] Callback executed after the whole pack of assets is loaded
 * @param {ProgressCallback} [progress_cb] Callback for the progress of loading
 */
/**
 * Callback executed after a single asset is loaded.
 * @callback AssetCallback
 * @param {Data} data Loaded data
 * @param {String} uri Data URI
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
exports.enqueue = function(asset_pack, asset_cb, pack_cb) {
    m_assets.enqueue(asset_pack, asset_cb, pack_cb);
}

}

