/**
 * Copyright (C) 2014-2015 Triumph LLC
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
var m_cont   = require("__container");
var m_obj    = require("__objects");
var m_print  = require("__print");
var m_render = require("__renderer");
var m_scenes = require("__scenes");
var m_time   = require("__time");
var m_tsr    = require("__tsr");
var m_util   = require("__util");

var cfg_def = require("__config").defaults;

var _is_paused = false;
var _anchors = [];
var _anchor_batch_pos = new Float32Array(0);
var _pixels = new Uint8Array(16);

var _vec2_tmp = new Float32Array(2);
var _vec3_tmp = new Float32Array(3);


exports.append = function(obj) {
    if (has_anchor_obj(obj))
        return;

    // NOTE: depends on subscene here because not supported for dynamically loaded data
    var det_vis = obj.anchor.detect_visibility &&
            Boolean(m_scenes.get_subs(m_scenes.get_main(), "ANCHOR_VISIBILITY"));

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
        // DOM-access optimization (height won't change)
        annotation_height: 0,
        annotation_width: 0,
        element_id: obj.anchor.element_id
    }

    switch (anchor.type) {
    case "ANNOTATION":
        anchor.element = create_annotation(obj, anchor.annotation_max_width);
        anchor.annotation_height = anchor.element.offsetHeight;
        anchor.annotation_width = anchor.element.offsetWidth;
        break;
    case "ELEMENT":
        anchor.element = document.getElementById(obj.anchor.element_id)

        if (anchor.element) {
            // NOTE: the dimensions are always zero
            anchor.annotation_height = anchor.element.offsetHeight;
            anchor.annotation_width = anchor.element.offsetWidth;
        } else {
            m_print.warn("Anchor HTML element was not found, making it generic");
            anchor.type = "GENERIC";
        }

        break;
    case "GENERIC":
        break;
    }

    _anchors.push(anchor);
    resize_anchor_batch_pos();
}

function has_anchor_obj(obj) {
    for (var i = 0; i < _anchors.length; i++)
        if (_anchors[i].obj == obj)
            return true;

    return false;
}

function create_annotation(obj, max_width) {
    var div = document.createElement("div");
    var div_style = div.style;

    div_style.position = "absolute";
    div_style.backgroundColor = "black";
    div_style.borderRadius = "20px 20px 20px 0px";
    div_style.boxShadow = "0px 0px 10px rgb(180, 180, 200)";
    div_style.opacity = 1.0;
    div_style.padding = "8px 12px";
    div_style.lineHeight = "15px";
    div_style.visibility = "hidden";
    div_style.fontSize = "12px";

    var canvas_cont = m_cont.get_container();

    canvas_cont.appendChild(div);

    var meta_tags = m_obj.get_meta_tags(obj);

    if (meta_tags) {
        var title = meta_tags.title || obj.name;
        var desc = meta_tags.description;
    } else {
        var title = obj.name;
        var desc = "";
    }

    var title_span = document.createElement("span");
    var title_span_style = title_span.style;

    title_span.innerHTML = title;
    title_span_style.fontWeight = "bold";
    title_span_style.fontSize = "12px";
    title_span_style.lineHeight = "15px";
    title_span_style.color = "#fff";
    title_span_style.fontFamily = "Arial";

    add_noselect_style(title_span);
    div.appendChild(title_span);

    if (desc) {
        var desc_div = document.createElement("div");
        var desc_div_style = desc_div.style;

        desc_div_style.position = "absolute";
        desc_div_style.bottom = "0px";
        desc_div_style.left = "0px";
        desc_div_style.backgroundColor = "#000";
        desc_div_style.borderRadius = "20px 20px 20px 0px";
        desc_div_style.boxShadow = "0px 0px 10px rgb(180, 180, 200)";
        desc_div_style.visibility = "hidden";
        desc_div_style.padding = "8px 12px";
        desc_div_style.overflow = "hidden";
        desc_div_style.lineHeight = "15px";
        desc_div_style.fontSize = "12px";

        // NOTE:
        desc_div_style.zIndex = "2";
        div.appendChild(desc_div);

        var desc_span = document.createElement("span");
        var desc_span_style = desc_span.style;

        desc_span.innerHTML = desc;
        desc_span_style.fontSize = "12px";
        desc_span_style.fontFamily = "Arial";
        desc_span_style.fontWeight = "bold";
        desc_span_style.lineHeight = "15px";
        desc_span_style.color = "#fff";
        desc_span_style.visibility = "hidden";

        desc_div.appendChild(desc_span);

        var width_anim = false;
        var height_anim = false;

        canvas_cont.addEventListener("mousedown", function(e) {
            if (width_anim || height_anim || _is_paused)
                return;

            if ((e.target == title_span || e.target == div) &&
                    desc_div_style.visibility == "hidden" &&
                    div_style.opacity == 1.0) {
                div_style.visibility = "hidden";
                title_span_style.visibility = "hidden";

                desc_div_style.visibility = "visible";

                width_anim = height_anim = true;

                var parent_width = div.offsetWidth - 24;
                var parent_height = div.offsetHeight - 16;

                var descr_width  = Math.min(max_width, str_width(desc, "12px"))
                var descr_height = str_height(desc, "12px", descr_width);

                if (descr_height == parent_height)
                    desc_div_style.height = descr_height + "px";

                if (descr_width != parent_width)
                    m_time.animate(parent_width, descr_width, 200, function(e) {
                        if (e == descr_width) {
                            // NOTE: do not make visible then anchor is suddenly out
                            if (desc_div_style.visibility == "visible")
                                desc_span_style.visibility = "visible";
                            width_anim = false;
                        }

                        desc_div_style.width = e + "px";
                    });
                else
                    width_anim = false;

                if (descr_height != parent_height)
                    m_time.animate(parent_height, descr_height, 200, function(e) {
                        if (e == descr_height) {
                            // NOTE: do not make visible then anchor is suddenly out
                            if (desc_div_style.visibility == "visible")
                                desc_span_style.visibility = "visible";
                            height_anim = false;
                        }

                        desc_div_style.height = e + "px";
                    });
                else
                    height_anim = false;

                if (!height_anim && !width_anim)
                    desc_span_style.visibility = "visible";

            } else if (desc_div_style.visibility == "visible") {
                div_style.visibility = "visible";
                title_span_style.visibility = "visible";

                desc_div_style.visibility = "hidden";
                desc_span_style.visibility = "hidden";
            }
        }, false);
    }

    return div;
}

function str_width(str, font_size, max_width) {
    var div = document.createElement("div");
    var span = document.createElement("span");

    var div_style = div.style;

    span.innerHTML = str;

    span.style.fontSize   = font_size;
    span.style.fontFamily = "Arial";
    span.style.fontWeight = "bold";
    span.style.color      = "#fff";
    span.style.visibility = "hidden";
    div_style.lineHeight  = "15px";

    div.appendChild(span);

    div_style.position   = "absolute";
    div_style.visibility = "hidden";
    div_style.fontSize   = font_size;
    div_style.display    = "inline-block";
    div_style.lineHeight = "15px";

    document.body.appendChild(div);
    var w = div.offsetWidth + 1;
    document.body.removeChild(div);

    return w;
}

function str_height(str, font_size, max_width) {
    var div = document.createElement("div");
    var span = document.createElement("span");

    var div_style = div.style;

    span.innerHTML = str;

    span.style.fontSize = font_size;
    span.style.fontFamily = "Arial";
    span.style.fontWeight = "bold";
    span.style.color = "#fff";
    span.style.visibility = "hidden";
    div_style.lineHeight  = "15px";

    div.appendChild(span);

    div_style.position = "absolute";
    div_style.visibility = "hidden";
    div_style.fontSize = font_size;
    div_style.display = "inline-block";
    div_style.width = max_width + "px";
    div_style.lineHeight = "15px";

    document.body.appendChild(div);
    var h = div.offsetHeight;
    document.body.removeChild(div);

    return h;
}

function add_noselect_style(elem) {
    elem.style["-webkit-touch-callout"] = "none";
    elem.style["-webkit-user-select"] = "none";
    elem.style["-khtml-user-select"] = "none";
    elem.style["-moz-user-select"] = "none";
    elem.style["-ms-user-select"] = "none";
    elem.style["user-select"] = "none";
    elem.style["cursor"] = "default";
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

exports.update = function() {
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
        if (x == anchor.x && y == anchor.y && depth == anchor.depth)
            continue;

        switch (anchor.type) {
        case "ANNOTATION":
            // position by left down angle
            var element = anchor.element;

            element.style.left = Math.floor(x) + "px";
            element.style.top = Math.floor(y - anchor.annotation_height) + "px";
            break;
        case "ELEMENT":
            // position by center, no width/height optimization here, may change
            var element = anchor.element;
            var bounding_box = element.getBoundingClientRect();

            element.style.cssText +=
                "left:" + Math.floor(x - bounding_box.width / 2) + "px;" +
                "top:" + Math.floor(y - bounding_box.height / 2) + "px;";
            break;
        case "GENERIC":
            break;
        }

        anchor.x = x;
        anchor.y = y;
        anchor.depth = depth;

        if (anchor.move_cb)
            anchor.move_cb(x, y, anchor.appearance, anchor.obj, element);
    }

    _anchors.sort(sort_anchors_zindex);

    for (var i = 0; i < _anchors.length; i++) {
        var anchor = _anchors[i];

        if (anchor.type != "GENERIC")
            anchor.element.style.zIndex = i;
    }

    if (det_vis_cnt > 0) {
        var subs_anchor = m_scenes.get_subs(m_scenes.get_main(), "ANCHOR_VISIBILITY");
        var batch_anchor = subs_anchor.bundles[0].batch;
        m_batch.update_anchor_visibility_batch(batch_anchor, _anchor_batch_pos);
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

        if (anchor.detect_visibility && appearance != "out")
            appearance = pick_anchor_visibility(anchor);

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

                // hide description div
                if (anchor.type == "ANNOTATION" && element.children.length > 1) {
                    var child = element.children[1];

                    child.style.visibility = "hidden";

                    if (child.children.length)
                        child.children[0].style.visibility = "hidden";
                }

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
                if (anchor.type == "ANNOTATION" && element.children.length > 1) {
                    var child = element.children[1];

                    child.style.visibility = "hidden";

                    if (child.children.length)
                        child.children[0].style.visibility = "hidden";
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
    var subs_anchor = m_scenes.get_subs(m_scenes.get_main(), "ANCHOR_VISIBILITY");
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
        if (_anchors[i].appearance = "visible" && check_anchor_coords(_anchors[i], x, y)) {
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
    var width = Math.round(anchor.annotation_width);
    var height = Math.round(anchor.annotation_height);
    var a_x = anchor.x;
    var a_y = anchor.y;
    if (x >= a_x && x <= (a_x + width) && y < a_y && y >= (a_y - height))
        return true;
    else
        return false;
}

}
