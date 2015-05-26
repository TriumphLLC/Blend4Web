"use strict";

/**
 * Anchors are Empty objects placed in Blender. They are used to project 3D points to the 2D screen.
 * @module anchors
 * @local anchor_move_callback
 */
b4w.module["anchors"] = function(exports, require) {

var m_anchors = require("__anchors");
var m_print   = require("__print");

/**
 * The callback for the movement of the anchor.
 * @callback anchor_move_callback
 * @param {Number} x X (left) position
 * @param {Number} y Y (top) position
 * @param {String} appearance Anchor appearance, one of "visible", "out",
 * "covered"
 * @param {Object} obj Anchor object ID
 * @param {?HtmlElement} anchor Anchor HTML element
 */

/**
 * Attach the movement callback to the anchor object.
 * @method module:anchors.attach_move_cb
 * @param {Object} obj Anchor object ID
 * @param {anchor_move_callback} anchor_move_cb Anchor movement callback
 */
exports.attach_move_cb = m_anchors.attach_move_cb;

/**
 * Detach the movement callback from the anchor object.
 * @method module:anchors.detach_move_cb
 * @param {Object} obj Anchor object ID
 */
exports.detach_move_cb = m_anchors.detach_move_cb;

}
