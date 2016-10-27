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
 * Anchors internal API.
 * @name anchors
 * @namespace
 * @exports exports as scenes
 */
b4w.module["__anchors"] = function(exports, require) {

var m_batch  = require("__batch");
var m_cam    = require("__camera");
var m_cfg    = require("__config");
var m_cont   = require("__container");
var m_obj    = require("__objects");
var m_print  = require("__print");
var m_render = require("__renderer");
var m_scenes = require("__scenes");
var m_subs   = require("__subscene");
var m_time   = require("__time");
var m_tsr    = require("__tsr");

var cfg_def = m_cfg.defaults;

var _anchors      = [];
var _is_paused    = false;
var _clicked_elem = null;
var _in_use       = false;
var _is_anim      = false;

var _anchor_batch_pos = new Float32Array(0);
var _pixels           = new Uint8Array(16);

var _vec2_tmp = new Float32Array(2);
var _vec3_tmp = new Float32Array(3);

exports.append = function(obj) {
    if (has_anchor_obj(obj))
        return;

    // NOTE: depends on subscene here because not supported for dynamically loaded data
    var det_vis = obj.anchor.detect_visibility &&
            Boolean(m_scenes.get_subs(m_scenes.get_main(), m_subs.ANCHOR_VISIBILITY));

    var anchor = {
        type: obj.anchor.type,
        obj: obj,
        x: 0,
        y: 0,
        depth: 0,
        appearance: "out",
        detect_visibility: det_vis,
        element: null,
        move_cb: null,
        annotation_max_width: obj.anchor.max_width,
        element_id: obj.anchor.element_id
    }

    switch (anchor.type) {
    case "ANNOTATION":
        anchor.element = create_annotation(anchor);

        break;
    case "ELEMENT":
        anchor.element = document.getElementById(obj.anchor.element_id);

        if (!anchor.element) {
            m_print.warn("Anchor HTML element with the id '" 
                    + obj.anchor.element_id + "' was not found, making it generic.");
            anchor.type = "GENERIC";
        } else {
            for (var i = 0; i < _anchors.length; i++)
                if (_anchors[i].type == "ELEMENT" 
                        && _anchors[i].element_id == obj.anchor.element_id) {
                    m_print.warn("Anchor with the id '" + obj.anchor.element_id 
                            + "' already exists, making the new anchor generic.");
                    anchor.type = "GENERIC";
                }
        }

        break;
    case "GENERIC":
        break;
    }

    _anchors.push(anchor);
    resize_anchor_batch_pos();

    if (!_in_use)
        add_click_listener();
}

function add_click_listener() {
    _in_use = true;

    var canvas_cont = m_cont.get_container();

    canvas_cont.addEventListener("mouseup", function(e) {
        if (_is_anim)
            return;

        if (_is_paused)
            return;

        var anchor_cont = _clicked_elem;

        if (!anchor_cont)
            return;

        if (anchor_cont.lastElementChild.style.visibility == "visible") {
            close_descr();

            _clicked_elem = null;

            return;
        }

        if (anchor_cont.style.opacity != 1.0)
            return;

        var anchor_descr = anchor_cont.lastElementChild;
        var anchor_title = anchor_cont.firstElementChild;
        var descr_body   = anchor_descr.firstElementChild;
        var body_text    = descr_body.innerHTML;

        anchor_descr.style.visibility = "visible";

        var descr_width  = Math.min(parseInt(anchor_descr.style.width) || 200, str_width(body_text) - 24);
        var descr_height = str_height(body_text, descr_width);

        var width_anim  = true;
        var height_anim = true;

        var parent_width  = anchor_cont.firstElementChild.offsetWidth - 24;
        var parent_height = anchor_cont.firstElementChild.offsetHeight - 16;

        anchor_title.style.display = "none";

        _is_anim = true

        m_time.animate(0, descr_width, 200, function(e) {
            if (e == descr_width) {
                width_anim = false;

                if (!height_anim)
                    _is_anim = false;

                if (is_anim)
                    descr_body.style.visibility = "visible";
            }

            anchor_descr.style.width = e + "px";
        });

        m_time.animate(0, descr_height, 200, function(e) {
            if (e == descr_height) {
                height_anim = false;

                if (!width_anim)
                    _is_anim = false;

                if (is_anim)
                    descr_body.style.visibility = "visible";
            }

            anchor_descr.style.height = e + "px";
        });

        function is_anim() {
            return anchor_descr.style.visibility == "visible" &&
                   !width_anim &&
                   !height_anim;
        }
    })
}

function has_anchor_obj(obj) {
    for (var i = 0; i < _anchors.length; i++)
        if (_anchors[i].obj == obj)
            return true;

    return false;
}

function close_descr() {
    var last_child = _clicked_elem.lastElementChild;
    _clicked_elem.firstElementChild.style.display = "";

    last_child.style.visibility = "hidden";
    last_child.firstElementChild.style.visibility = "hidden";
}

function create_annotation(anchor) {
    var obj = anchor.obj;

    var canvas_cont = m_cont.get_container();
    var meta_tags   = m_obj.get_meta_tags(obj);
    var title_text  = obj.name;

    var anchor_cont_elem = document.createElement("div");
    var title_wrap_elem  = anchor_cont_elem.cloneNode();
    var title_elem       = document.createElement("span");
    var descr_text       = "";

    add_cont_style(anchor_cont_elem);
    add_title_wrap_style(title_wrap_elem);

    anchor_cont_elem.style.visibility = "hidden";

    if (meta_tags) {
        descr_text = meta_tags.description || descr_text;
        title_text = meta_tags.title || title_text;
    }

    title_elem.innerHTML = title_text;

    add_noselect_style(title_elem);
    add_inner_style(title_elem);
    title_elem.style.whiteSpace = "nowrap";

    title_wrap_elem.appendChild(title_elem);
    anchor_cont_elem.appendChild(title_wrap_elem);

    if (descr_text)
        create_anchor_descr_elem(descr_text, anchor_cont_elem, anchor.annotation_max_width);

    canvas_cont.appendChild(anchor_cont_elem);

    return anchor_cont_elem;
}

function add_title_wrap_style(elem) {
    elem.style.cssText +=
        "background-color:   #000;" +
        "border-radius:      20px 20px 20px 0px;" +
        "box-shadow:         0px 0px 10px rgb(180, 180, 200);" +
        "-webkit-box-shadow: 0px 0px 10px rgb(180, 180, 200);" +
        "font-size:          12px;" +
        "line-height:        15px;"+
        "opacity:            1.0;" +
        "bottom:             0;" +
        "left:               0;" +
        "padding:            8px 12px;" +
        "position:           absolute;";
}

function add_cont_style(elem) {
    // NOTE: transform-style property needed to prevent shaking of the child
    // elements in FF under Linux
    elem.style.cssText +=
        "position:           absolute;" +
        "transform-style:    preserve-3d;";
}

function add_inner_style(elem) {
    elem.style.cssText +=
        "color:       #fff;" +
        "font-family: Arial;"+
        "font-size:   12px;" +
        "font-weight: bold;" +
        "line-height: 15px;";
}

function add_descr_style(elem) {
    elem.style.cssText +=
        "background-color:   #000;" +
        "border-radius:      20px 20px 20px 0px;" +
        "bottom:             0;" +
        "box-shadow:         0px 0px 10px rgb(180, 180, 200);" +
        "-webkit-box-shadow: 0px 0px 10px rgb(180, 180, 200);" +
        "font-size:          12px;" +
        "left:               0;"+
        "line-height:        15px;"+
        "opacity:            1.0;" +
        "overflow:           hidden;" +
        "padding:            8px 12px;" +
        "position:           absolute;" +
        "z-index:            2;";
}

function add_noselect_style(elem) {
    elem.style.cssText +=
        "-webkit-touch-callout: none;" +
        "-webkit-user-select:   none;" +
        "-khtml-user-select:    none;" +
        "-moz-user-select:      none;" +
        "-ms-user-select:       none;" +
        "user-select:           none;" +
        "cursor:                default;";
}

function create_anchor_descr_elem(descr_text, anchor_cont_elem, annotation_max_width) {
    var descr_wrap_elem = document.createElement("div");
    var descr_elem      = document.createElement("span");

    if (annotation_max_width)
        descr_wrap_elem.style.width = annotation_max_width + "px";

    add_descr_style(descr_wrap_elem);
    add_inner_style(descr_elem);

    descr_elem.innerHTML = descr_text;

    descr_wrap_elem.style.visibility = "hidden";
    descr_elem.style.visibility      = "hidden";

    descr_wrap_elem.appendChild(descr_elem);
    anchor_cont_elem.appendChild(descr_wrap_elem);

    anchor_cont_elem.addEventListener("mousedown", function(e) {
        if (_is_anim)
            return;

        if (anchor_cont_elem == _clicked_elem)
            return;

        if (anchor_cont_elem.style.opacity != 1.0)
            return;

        if (_is_paused)
            return;

        if (_clicked_elem && _clicked_elem.lastElementChild.style.visibility == "visible")
            close_descr();

        _clicked_elem = anchor_cont_elem;
    })
}

function str_width(str) {
    var descr      = document.createElement("div");
    var descr_body = document.createElement("span");

    descr_body.innerHTML = str;

    add_inner_style(descr_body);
    add_descr_style(descr);

    descr.appendChild(descr_body);

    document.body.appendChild(descr);
    var width = descr.offsetWidth + 1;
    document.body.removeChild(descr);

    return width;
}

function str_height(str, width) {
    var descr      = document.createElement("div");
    var descr_body = document.createElement("span");

    descr_body.innerHTML = str;

    add_inner_style(descr_body);
    add_descr_style(descr);

    descr.style.width = width + "px";
    descr.style.display = "inline-block";

    descr.appendChild(descr_body);

    document.body.appendChild(descr);
    var height = descr.offsetHeight - 16;
    document.body.removeChild(descr);

    return height;
}

function resize_anchor_batch_pos() {
    var num = 0;

    for (var i = 0; i < _anchors.length; i++)
        if (_anchors[i].detect_visibility)
            num++;

    _anchor_batch_pos = new Float32Array(3 * num);
}

exports.remove = function(obj) {
    for (var i = 0; i < _anchors.length; i++) {
        var anchor = _anchors[i];

        if (anchor.obj == obj) {
            if (anchor.type == "ANNOTATION")
                remove_annotation(anchor);
            _anchors.splice(i, 1);
            resize_anchor_batch_pos();
            i--;
            break;
        }
    }
}

function sort_anchors_zindex(a, b) {
    return b.depth - a.depth;
}

exports.update = function(force_update) {
    var det_vis_cnt = 0;

    for (var i = _anchors.length; i--;) {
        var anchor = _anchors[i];

        // update always because the anchor may change it's depth
        if (anchor.detect_visibility) {
            var trans = m_tsr.get_trans_view(anchor.obj.render.world_tsr);
            _anchor_batch_pos.set(trans, 3 * det_vis_cnt++);
        }

        var pp = anchor_project(anchor, _vec3_tmp);
        var x = pp[0];
        var y = pp[1];
        var depth = pp[2];

        // optimization
        if (!force_update && x == anchor.x && y == anchor.y && depth == anchor.depth)
            continue;

        switch (anchor.type) {
        case "ANNOTATION":
            // position by left down angle
            var left = x;
            var top = y;
            transform_anchor_el(anchor, left, top);
            break;
        case "ELEMENT":
            // position by center, no width/height optimization here, may change
            var bounding_box = anchor.element.getBoundingClientRect();
            var left = x - bounding_box.width / 2;
            var top = y - bounding_box.height / 2;
            transform_anchor_el(anchor, left, top);
            break;
        case "GENERIC":
            break;
        }

        anchor.x = x;
        anchor.y = y;
        anchor.depth = depth;

        if (anchor.move_cb)
            anchor.move_cb(x, y, anchor.appearance, anchor.obj, anchor.element);
    }

    _anchors.sort(sort_anchors_zindex);

    // NOTE: setting z-index can be very slow on iPad in case of many 
    // overlapping elements
    for (var i = 0; i < _anchors.length; i++) {
        var anchor = _anchors[i];

        if (anchor.type != "GENERIC") {
            if (_clicked_elem == anchor.element)
                anchor.element.style.zIndex = _anchors.length;
            else
                anchor.element.style.zIndex = i;
        }
    }

    if (det_vis_cnt > 0) {
        var subs_anchor = m_scenes.get_subs(m_scenes.get_main(), m_subs.ANCHOR_VISIBILITY);
        var bundle = subs_anchor.draw_data[0].bundles[0];
        var batch_anchor = bundle.batch;
        m_batch.update_anchor_visibility_batch(batch_anchor, _anchor_batch_pos);
        m_subs.append_draw_data(subs_anchor, bundle);
    }
}

// subpixel smoothing works in chrome, safari and QQ by now
function transform_anchor_el(anchor, left, top, depth) {
    var el = anchor.element;

    if (cfg_def.ie_edge_anchors_floor_hack) {
        left = Math.floor(left);
        top = Math.floor(top);
    }

    if ("transform" in el.style)
        el.style.transform = "translate3d(" + left + "px, " + top + "px, 0px)";
    else if ("webkitTransform" in el.style)
        el.style.webkitTransform = "translate3d(" + left + "px, " + top + "px, 0px)";
    else {
        el.style.left = left + "px";
        el.style.top = top + "px";
    }
}

function anchor_project(anchor, dest) {
    var camobj = m_scenes.get_camera(m_scenes.get_main());
    var trans = m_tsr.get_trans_view(anchor.obj.render.world_tsr);
    var dest = m_cam.project_point(camobj, trans, dest);

    return dest;
}

exports.update_visibility = function() {
    var canvas_cont = m_cont.get_container();

    for (var i = _anchors.length; i--;) {
        var anchor = _anchors[i];
        var obj = anchor.obj;

        var x = anchor.x;
        var y = anchor.y;
        var depth = anchor.depth;

        // optimized order
        if (x < 0 || y < 0 || depth < 0 || depth > 1 || m_scenes.is_hidden(obj) ||
                x >= canvas_cont.clientWidth || y >= canvas_cont.clientHeight)
            var appearance = "out";
        else
            var appearance = "visible";

        if (anchor.detect_visibility && appearance != "out") {
            appearance = pick_anchor_visibility(anchor);
        }

        // optimization

        if (appearance == anchor.appearance)
            continue;

        switch (anchor.type) {
        case "ANNOTATION":
        case "ELEMENT":
            var element = anchor.element;

            if (!element)
                break;

            if (appearance == "out") {
                element.style.visibility = "hidden";

                if (element.children.length)
                    element.children[0].style.visibility = "hidden";
            } else if (appearance == "visible") {
                element.style.visibility = "visible";

                if (element.children.length)
                    element.children[0].style.visibility = "visible";

                element.style.opacity = 1.0;
            } else {
                element.style.visibility = "visible";
                element.style.opacity = 0.1;

                if (element.children.length)
                    element.children[0].style.visibility = "visible";

                // hide description div
                if (anchor.type == "ANNOTATION" && element.children.length > 1)
                    if (element.lastElementChild.style.visibility == "visible") {
                        close_descr();

                        if (element == _clicked_elem)
                            _clicked_elem = null;
                    }
            }

            break;
        case "GENERIC":
            break;
        }

        anchor.appearance = appearance;

        if (anchor.move_cb)
            anchor.move_cb(x, y, anchor.appearance, obj, element);
    }
}

function pick_anchor_visibility(anchor) {
    // NOTE: slow
    var subs_anchor = m_scenes.get_subs(m_scenes.get_main(), m_subs.ANCHOR_VISIBILITY);
    var anchor_cam = subs_anchor.camera;

    var viewport_xy = m_cont.canvas_to_viewport_coords(anchor.x, anchor.y, 
            _vec2_tmp, anchor_cam);

    // NOTE: very slow
    m_render.read_pixels(anchor_cam.framebuffer, viewport_xy[0], 
            anchor_cam.height - viewport_xy[1], 2, 2, _pixels); 

    if (_pixels[0] + _pixels[4] + _pixels[8] + _pixels[12] == 4 * 255)
        return "visible";
    else if (anchor.appearance == "out" || 
            _pixels[0] + _pixels[4] + _pixels[8] + _pixels[12] == 0)
        return "covered";
    else
        return anchor.appearance;
}

exports.attach_move_cb = function(obj, callback) {
    for (var i = 0; i < _anchors.length; i++)
        if (_anchors[i].obj == obj)
            _anchors[i].move_cb = callback;
}

exports.detach_move_cb = function(obj) {
    for (var i = 0; i < _anchors.length; i++)
        if (_anchors[i].obj == obj)
            _anchors[i].move_cb = null;
}

function remove_annotation(anchor) {
    var canvas_cont = m_cont.get_container();

    canvas_cont.removeChild(anchor.element);
}

exports.cleanup = function() {
    for (var i = 0; i < _anchors.length; i++) {
        var anchor = _anchors[i];
        if (anchor.type == "ANNOTATION")
            remove_annotation(anchor);
    }

    _anchors.length = 0;
}

exports.is_anchor = function(obj) {
    for (var i = 0; i < _anchors.length; i++)
        if (_anchors[i].obj == obj)
            return true;

    return false;
}

exports.get_element_id = function(obj) {
    for (var i = 0; i < _anchors.length; i++)
        if (_anchors[i].obj == obj)
            return _anchors[i].element_id;

    return false;
}

exports.pause = function() {
    _is_paused = true;
}

exports.resume = function() {
    _is_paused = false;
}

exports.pick_anchor = function(x, y) {
    var index = -1;
    for (var i = 0; i < _anchors.length; i++)
        if (_anchors[i].appearance == "visible" && check_anchor_coords(_anchors[i], x, y)) {
            if (index < 0) {
                var min_dist = _anchors[i].depth;
                index = i;
            } else
                if (_anchors[i].depth < min_dist) {
                    index = i;
                    min_dist = _anchors[i].depth;
                }
        }

    if (index < 0)
        return null;
    else
        return _anchors[index].obj;
}

function check_anchor_coords(anchor, x, y) {
    if (anchor.element) {
        var width = Math.round(anchor.element.offsetWidth) || 0;
        var height = Math.round(anchor.element.offsetHeight) || 0;
    } else {
        var width = 0;
        var height = 0;
    }

    var a_x = anchor.x;
    var a_y = anchor.y;

    if (x >= a_x && x <= (a_x + width) && y < a_y && y >= (a_y - height))
        return true;
    else
        return false;
}

}
