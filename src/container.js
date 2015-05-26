"use strict";

/**
 * @name container
 * @namespace
 * @exports exports as container
 */
b4w.module["__container"] = function(exports, require) {

var m_anchors    = require("__anchors");
var m_print      = require("__print");
var m_util       = require("__util");

var _canvas      = null;
var _canvas_cont = null;


exports.get_canvas = function() {
    return _canvas;
}

exports.get_container = function() {
    return _canvas_cont;
}

exports.init = function(canvas) {
    if (canvas && canvas.parentNode) {
        _canvas      = canvas;
        _canvas_cont = canvas.parentNode;
    } else
        m_util.panic("canvas container is not available");
}

exports.insert_to_container = function(elem, behavior) {

    behavior = behavior || "LAST";

    switch (behavior) {
    case "FIRST":
        var cont_first_child = _canvas_cont.firstElementChild;

        _canvas_cont.insertBefore(elem, cont_first_child);

        break;
    case "JUST_BEFORE_CANVAS":
        _canvas_cont.insertBefore(elem, _canvas);

        break;
    case "JUST_AFTER_CANVAS":
        if (_canvas.nextElementSibling)
            _canvas_cont.insertBefore(elem, _canvas.nextElementSibling);
        else
            _canvas_cont.appendChild(elem, _canvas);

        break;
    case "LAST":
        _canvas_cont.appendChild(elem, _canvas);

        break;
    default:
        m_print.error(behavior + " behavior unknown");

        break;
    }
}

}
