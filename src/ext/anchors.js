"use strict";

/**
 * Anchors API.
 * @module anchors
 * @local anchor_move_callback
 */
b4w.module["anchors"] = function(exports, require) {

var m_anchors = require("__anchors");
var m_print   = require("__print");
var m_util    = require("__util");

/**
 * Anchor move callback.
 * @callback anchor_move_callback
 * @param {Number} x X (left) position
 * @param {Number} y Y (top) position
 * @param {String} appearance Anchor appearance, one of "visible", "out",
 * "covered"
 * @param {Object} obj Anchor object ID
 * @param {?HtmlElement} anchor Anchor HTML element
 */

/**
 * Attach movement callback to anchor object.
 * @method module:anchors.attach_move_cb
 * @param {Object} obj Anchor object ID
 * @param {anchor_move_callback} anchor_move_cb Anchor movement callback
 */
exports.attach_move_cb = m_anchors.attach_move_cb;

/**
 * Detach movement callback from anchor object.
 * @method module:anchors.detach_move_cb
 * @param {Object} obj Anchor object ID
 */
exports.detach_move_cb = m_anchors.detach_move_cb;

}
