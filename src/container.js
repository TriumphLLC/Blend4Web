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
 * @name container
 * @namespace
 * @exports exports as container
 */
b4w.module["__container"] = function(exports, require) {

var m_anchors = require("__anchors");
var m_cfg     = require("__config");
var m_data    = require("__data");
var m_hud     = require("__hud");
var m_input   = require("__input");
var m_print   = require("__print");
var m_scenes  = require("__scenes");
var m_time    = require("__time");
var m_trans   = require("__transform");
var m_util    = require("__util");

var cfg_def = m_cfg.defaults;
var cfg_lim = m_cfg.context_limits;

var _gl          = null;
var _canvas      = null;
var _canvas_hud  = null;
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

// default canvas dimensions
exports.DEFAULT_CANVAS_W = 320;
exports.DEFAULT_CANVAS_H = 240;

/**
 * Setup WebGL context
 * @param gl WebGL context
 */
exports.setup_context = function(gl) {
    _gl = gl;
}

exports.get_canvas = get_canvas;
function get_canvas() {
    return _canvas;
}

exports.get_canvas_hud = get_canvas_hud;
function get_canvas_hud() {
    return _canvas_hud;
}

exports.get_container = get_container;
function get_container() {
    return _canvas_cont;
}

exports.init = function(canvas, canvas_hud) {
    if (canvas && canvas.parentNode) {
        _canvas      = canvas;
        _canvas_hud  = canvas_hud;
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

exports.setup_viewport_dim = setup_viewport_dim;
function setup_viewport_dim(width, height, scale) {
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

exports.is_hidpi = is_hidpi;
function is_hidpi() {
    if (cfg_def.allow_hidpi && window.devicePixelRatio >= 2)
        return true;
    return false;
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

exports.resize = resize;
function resize(width, height, update_canvas_css) {
    if (!width || !height) {
        width = exports.DEFAULT_CANVAS_W;
        height = exports.DEFAULT_CANVAS_H;

        var canvas_cont = get_container();
        canvas_cont.style.width = exports.DEFAULT_CANVAS_W + "px";
        canvas_cont.style.height = exports.DEFAULT_CANVAS_H + "px";
    }

    var canvas_webgl = get_canvas();
    var canvas_hud   = get_canvas_hud();

    if (update_canvas_css !== false) {
        canvas_webgl.style.width = width + "px";
        canvas_webgl.style.height = height + "px";

        if (canvas_hud) {
            canvas_hud.style.width = width + "px";
            canvas_hud.style.height = height + "px";
        }
    }

    if (canvas_hud) {
        // no HIDPI/resolution factor for HUD canvas
        canvas_hud.width  = width;
        canvas_hud.height = height;
        m_hud.update_dim();
    }

    var cw = Math.floor(width * cfg_def.canvas_resolution_factor);
    var ch = Math.floor(height * cfg_def.canvas_resolution_factor);

    if (is_hidpi()) {
        cw *= window.devicePixelRatio;
        ch *= window.devicePixelRatio;
    }

    // use only main scene for the canvas resizing
    var main_scene = m_scenes.get_main();
    if (main_scene) {
        var sc_render = main_scene._render;
        cw = Math.floor(cw * sc_render.resolution_factor);
        ch = Math.floor(ch * sc_render.resolution_factor);
    }

    canvas_webgl.width  = cw;
    canvas_webgl.height = ch;

    var width_limit = Math.min(_gl.drawingBufferWidth,
            cfg_lim.max_renderbuffer_size, cfg_lim.max_viewport_dims[0]);
    var height_limit = Math.min(_gl.drawingBufferHeight,
            cfg_lim.max_renderbuffer_size, cfg_lim.max_viewport_dims[1]);
    if (cw > width_limit || ch > height_limit) {
        m_print.warn("Canvas size exceeds platform limits, downscaling");

        var downscale = Math.min(width_limit / cw, height_limit / ch);

        cw *= downscale;
        ch *= downscale;

        canvas_webgl.width  = cw;
        canvas_webgl.height = ch;
    }

    m_scenes.setup_dim(cw, ch, cw/width);

    // needed for frustum culling/constraints
    if (m_scenes.check_active())
        m_trans.update_transform(m_scenes.get_active()._camera);

    m_data.update_media_controls(canvas_webgl.width, canvas_webgl.height);

    // possible unload in controls callbacks
    if (!m_data.is_primary_loaded())
        return;

    // anchors
    m_anchors.update();

    // rendering
    m_scenes.update(m_time.get_timeline(), 0);

    // anchors
    m_anchors.update_visibility();
}

exports.resize_to_container = function(force) {
    var container = get_container();
    var canvas = get_canvas();

    var w = container.clientWidth;
    var h = container.clientHeight;

    if (force || w != canvas.clientWidth || h != canvas.clientHeight) {
        var vr_display = cfg_def.stereo === "HMD" && m_input.get_webvr_display();
        // NOTE: don't resize in case of HMD fullscreen (WebVR API 1.0)
        if (!vr_display || !vr_display.isPresenting)
            resize(w, h, true);
    }
}

exports.reset = function() {
    _gl          = null;
    _canvas      = null;
    _canvas_hud  = null;
    _canvas_cont = null;
}

}
