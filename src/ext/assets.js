"use strict";

/** 
 * Low-level resource loader.
 * @module assets
 */
b4w.module["assets"] = function(exports, require) {

var m_assets = require("__assets");

/**
 * Asset type.
 * @const module:assets.AT_ARRAYBUFFER
 */
exports["AT_ARRAYBUFFER"]   = m_assets.AT_ARRAYBUFFER;
/**
 * Asset type.
 * @const module:assets.AT_JSON
 */
exports["AT_JSON"]          = m_assets.AT_JSON;
/**
 * Asset type.
 * @const module:assets.AT_TEXT
 */
exports["AT_TEXT"]          = m_assets.AT_TEXT;
/**
 * Asset type.
 * @const module:assets.AT_AUDIOBUFFER
 */
exports["AT_AUDIOBUFFER"]   = m_assets.AT_AUDIOBUFFER;
/**
 * Asset type.
 * @const module:assets.AT_IMAGE_ELEMENT
 */
exports["AT_IMAGE_ELEMENT"] = m_assets.AT_IMAGE_ELEMENT;
/**
 * Asset type.
 * @const module:assets.AT_AUDIO_ELEMENT
 */
exports["AT_AUDIO_ELEMENT"] = m_assets.AT_AUDIO_ELEMENT;

/**
 * Enqueue assets pack.
 * @method module:assets.enqueue
 * @param assets_pack Assets pack: [[uri, type, filepath], ...]
 * @param [asset_cb] A single asset loaded callback
 * @param [pack_cb] Assets pack loaded callback
 */
exports["enqueue"] = function(asset_pack, asset_cb, pack_cb) {
    m_assets.enqueue(asset_pack, asset_cb, pack_cb);
}

}

