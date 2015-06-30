"use strict";

/**
 * Anchors are Empty objects placed in Blender. They are used to project 3D points to the 2D screen.
 * @module anchors
 * @local AnchorMoveCallback
 */
b4w.module["anchors"] = function(exports, require) {

var m_anchors = require("__anchors");
var m_print   = require("__print");

/**
 * The callback for the movement of the anchor.
 * @callback AnchorMoveCallback
 * @param {Number} x X (left) canvas coordinate.
 * @param {Number} y Y (top) canvas coordinate.
 * @param {String} appearance Anchor appearance, one of "visible", "out",
 * "covered"
 * @param {Object3D} obj Anchor object.
 * @param {?HtmlElement} anchor Anchor HTML element
 */

/**
 * Attach the movement callback to the anchor object.
 * @method module:anchors.attach_move_cb
 * @param {Object3D} obj Anchor object.
 * @param {AnchorMoveCallback} anchor_move_cb Anchor movement callback
 */
exports.attach_move_cb = m_anchors.attach_move_cb;

/**
 * Detach the movement callback from the anchor object.
 * @method module:anchors.detach_move_cb
 * @param {Object3D} obj Anchor object.
 */
exports.detach_move_cb = m_anchors.detach_move_cb;

/**
 * Check if the given object is an anchor.
 * @method module:anchors.is_anchor
 * @param {Object3D} obj Anchor object.
 * @returns {Boolean} Check result.
 */
exports.is_anchor = m_anchors.is_anchor;

/**
 * Get anchor element ID.
 * @method module:anchors.get_element_id
 * @param {Object3D} obj Anchor object.
 * @returns {String} Element ID.
 */
exports.get_element_id = m_anchors.get_element_id;

}
