"use strict";

/**
 * @name container
 * @namespace
 * @exports exports as container
 */
b4w.module["__container"] = function(exports, require) {

var m_print = require("__print");
var m_util  = require("__util");

var _canvas      = null;
var _canvas_cont = null;

// NOTE: for optimization, to request canvas bounds only once a frame
var _offsets_updating_needed = false;

var _viewport_layout = {
    width: 0,   // device pixels
    height: 0,  // device pixels
    scale: 1,   // divece pixels/css pixels
    offset_top: 0,  // css pixels
    offset_left: 0  // css pixels
}

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

exports.insert_to_container = function(elem, stack_order) {

    stack_order = stack_order || "LAST";

    switch (stack_order) {
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
        m_print.error(stack_order + " invalid stack order");

        break;
    }
}

exports.get_viewport_width = function() {
    return _viewport_layout.width;
}

exports.get_viewport_height = function() {
    return _viewport_layout.height;
}

exports.set_canvas_offsets = set_canvas_offsets;
function set_canvas_offsets(left, top) {
    _viewport_layout.offset_left = left;
    _viewport_layout.offset_top = top;
}

exports.update_canvas_offsets = update_canvas_offsets;
function update_canvas_offsets() {
    var boundaries = _canvas.getBoundingClientRect();
    set_canvas_offsets(boundaries.left, boundaries.top);
}

exports.setup_viewport_dim = function(width, height, scale) {
    _viewport_layout.width = width;
    _viewport_layout.height = height;
    _viewport_layout.scale = scale;
    update_canvas_offsets();
}

exports.force_offsets_updating = function() {
    _offsets_updating_needed = true;
}

function get_offset_top() {
    if (_offsets_updating_needed) {
        update_canvas_offsets();
        _offsets_updating_needed = false;
    }

    return _viewport_layout.offset_top;
}

function get_offset_left() {
    if (_offsets_updating_needed) {
        update_canvas_offsets();
        _offsets_updating_needed = false;
    }
    
    return _viewport_layout.offset_left;
}

exports.client_to_canvas_coords = function(client_x, client_y, dest) {
    if (!dest)
        dest = new Float32Array(2);

    dest[0] = client_x - get_offset_left();
    dest[1] = client_y - get_offset_top();
    return dest;
}

exports.canvas_to_viewport_coords = function(canvas_x, canvas_y, dest, camera) {
    if (!dest)
        dest = new Float32Array(2);

    dest[0] = canvas_x * _viewport_layout.scale;
    dest[1] = canvas_y * _viewport_layout.scale;

    if (camera) {
        var camera_resolution_scale = camera.width / _viewport_layout.width;
        dest[0] *= camera_resolution_scale;
        dest[1] *= camera_resolution_scale;
    }

    return dest;
}

exports.viewport_to_canvas_coords = function(viewport_x, viewport_y, dest, camera) {
    if (!dest)
        dest = new Float32Array(2);
    
    dest[0] = viewport_x / _viewport_layout.scale;
    dest[1] = viewport_y / _viewport_layout.scale;

    if (camera) {
        var camera_resolution_scale = camera.width / _viewport_layout.width;
        dest[0] /= camera_resolution_scale;
        dest[1] /= camera_resolution_scale;
    }

    return dest;
}

exports.is_child = function(elem) {

    if (!elem || !elem.parentNode)
        return false;
    else if (elem.parentNode == _canvas_cont)
        return true;
    else
        return exports.is_child(elem.parentNode);
}

exports.find_script = function(src) {
    var scripts = document.getElementsByTagName("script");
    var norm_src = m_util.normpath_preserve_protocol(src);

    for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].src == norm_src)
            return scripts[i];
    }

    return null;
}

}
