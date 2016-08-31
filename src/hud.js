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
 * Head-up display control module.
 * @name hud
 * @namespace
 * @exports exports as hud
 */
b4w.module["__hud"] = function(exports, require) {

var m_graph = require("__graph");
var m_print = require("__print");
var m_subs  = require("__subscene");

var START_POINT_X = 30;
var START_POINT_Y = 80;
var LINE_WIDTH = 20;
var OFFSETS = [5, 30, 4, 10, 5, 3, 5];

var _canvas_context = null;

// row,column
var _carriage = [0, 0];

exports.init = function(canvas_elem) {
    var ctx = canvas_elem.getContext("2d");

    set_style(ctx);

    _canvas_context = ctx;
    return ctx;
}

function set_style(ctx) {
    ctx.font = 'bold 15px Courier New';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.shadowColor = null;
}

exports.update_dim = function() {
    if (_canvas_context)
        set_style(_canvas_context);
}

exports.reset = function() {
    var ctx = _canvas_context;
    if (!ctx)
        return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    reset_carriage();
}

exports.show_debug_info = function(scenes, elapsed) {

    var ctx = _canvas_context;
    if (!ctx)
        return;

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,255,0,255)';

    print(" FPS", (1/elapsed).toFixed(2));
    new_line();

    var sum_bundles = 0;
    var sum_rcalls = 0;
    var sum_rtimes = 0;

    for (var i = 0; i < scenes.length; i++) {
        var sum = show_debug_info_scene(scenes[i]);
        sum_bundles += sum[0];
        sum_rcalls += sum[1];
        sum_rtimes += sum[2];
        new_line();
    }

    print(" ----------------------------------------------------------------");
    print("    ", "TOTAL ACTIVE", "", "", sum_rcalls, "of", sum_bundles, "  ",
            sum_rtimes.toFixed(3));
}

function show_debug_info_scene(scene) {

    print(" SCENE \"" + scene["name"] + "\"");
    print(" Active                 Subscene   Lamps   Size   RenderCalls   Time");

    if (!scene._render) {
        print("No INFO")
        return;
    }


    //print("subscenes", graph.length, "(act/pass/fict type size batches calls lights):"); 

    var sum_bundles = 0;
    var sum_rcalls = 0;
    var sum_rtimes = 0;

    var next_slot = 2;

    var graph = scene._render.graph;
    m_graph.traverse(graph, function(node, attr) {
        var subs = attr;

        // fictional type
        if (subs.type == m_subs.SINK)
            return;

        var type = subs.type;
        var size = Math.round(subs.camera.width) + "x" + Math.round(subs.camera.height);

        var bundles = 0;
        for (var i = 0; i < subs.draw_data.length; i++)
            bundles += subs.draw_data[i].bundles.length;

        var rcalls = subs.debug_render_calls;

        if (subs.type == m_subs.MAIN_CUBE_REFLECT ||
                subs.type == m_subs.MAIN_CUBE_REFLECT_BLEND)
            bundles *= 6;

        // active/passive
        var is_active = subs.do_render;

        var render_time = is_active ? subs.debug_render_time : 0;

        // NOTE: clear render time for non-enqueued subscenes, BTW they 
        // shouldn't be active if they're not rendered
        if (!subs.enqueue)
            subs.debug_render_time = 0;

        var activity_prefix = is_active ? " (\u2713)" : " (\u2715)";
        var label = m_subs.subs_label(subs);
        print(activity_prefix, label, subs.num_lights, size, rcalls, "of",
                bundles, "  ", render_time.toFixed(3));

        subs.debug_render_calls = 0;

        if (is_active) {
            sum_bundles += bundles;
            sum_rcalls += rcalls;
            sum_rtimes += render_time;
        }
    });

    return [sum_bundles, sum_rcalls, sum_rtimes];
}

function reset_carriage() {
    _carriage[0] = 0;
    _carriage[1] = 0;
}

function new_line() {
    _carriage[0]++;
}

exports.print = function() {
    var ctx = _canvas_context;
    if (!ctx)
        return;

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,255,0,255)';

    print.apply(Math, arguments);
}

/**
 * Print a line.
 * Uses global context and carriage.
 */
function print() {

    var x = START_POINT_X;
    var y = START_POINT_Y + _carriage[0] * LINE_WIDTH;

    var text = arguments[0];
    for (var i = 1; i < arguments.length; i++) {
        var arg = arguments[i];
        var num_spaces = OFFSETS[i] - String(arg).length;
        text += spaces(num_spaces) + arguments[i];
    }

    new_line();

    _canvas_context.fillText(text, x, y);
}

function spaces(n) {

    var s = "";
    for (var i = 0; i < n; i++) {
        s += " ";    
    }
    return s;
}

/**
 * @see http://www.html5canvastutorials.com/tutorials/html5-canvas-wrap-text-tutorial/
 */
function wrap_text(context, text, x, y, maxWidth, lineHeight) {
    var words = text.split(" ");
    var line = "";

    for (var n = 0; n < words.length; n++) {
        var testLine = line + words[n] + " ";
        var metrics = context.measureText(testLine);
        var testWidth = metrics.width;
        if (testWidth > maxWidth) {
            context.fillText(line, x, y);
            line = words[n] + " ";
            y += lineHeight;
        }
        else {
            line = testLine;
        }
    }
    context.fillText(line, x, y);
}

exports.plot_array = function(header, slot, arr, arg_min, arg_max,
        val_min, val_max) {

    var ctx = _canvas_context;
    if (!ctx)
        return;

    var box = create_strip_box(slot);
    box_split_v(box, 4, 5, box);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#00FF00';
    _canvas_context.fillText(header, box_mid_h(box), box.y - 10);

    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 0.5;

    ctx.beginPath();

    ctx.moveTo(box.x, box.y);
    ctx.lineTo(box.x + box.w, box.y);
    ctx.lineTo(box.x + box.w, box.y + box.h);
    ctx.lineTo(box.x, box.y + box.h);
    ctx.closePath();

    ctx.stroke();


    if (!val_min && !val_max) {
        // TODO: proper calc
        val_min = 1000000;
        val_max =-1000000;

        for (var i = 0; i < arr.length; i++) {
            val_min = Math.min(val_min, arr[i]);
            val_max = Math.max(val_max, arr[i]);
        }
    }

    ctx.textAlign = "right";
    _canvas_context.fillText(String(val_min), box.x - 10, box.y + box.h);
    _canvas_context.fillText(String(val_max), box.x - 10, box.y);

    ctx.textAlign = "center";
    _canvas_context.fillText(String(arg_min), box.x, box.y + box.h + 15);
    _canvas_context.fillText(String(arg_max), box.x + box.w, box.y + box.h + 15);


    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 1.5;

    ctx.beginPath();

    var dx = box.w / (arr.length - 1);
    var dy = box.h / (val_max - val_min);

    for (var i = 0; i < arr.length; i++) {
        var x = box.x + dx * i;
        var y = (box.y + box.h) - (arr[i] - val_min) * dy;

        if (i == 0)
            ctx.moveTo(x, y);
        else
            ctx.lineTo(x, y);
    }
    ctx.stroke();
}

function box_create() {
    return {
        x : 0,
        y : 0,
        w : 0,
        h : 0
    }
}

function box_set(x, y, w, h, dest) {
    dest.x = x;
    dest.y = y;
    dest.w = w;
    dest.h = h;

    return dest;
}

function box_split_h(box, part, parts, dest) {
    var dw = box.w / parts;

    dest.x = box.x + dw * part;
    dest.y = box.y;
    dest.w = dw;
    dest.h = box.h;

    return dest;
}

function box_split_v(box, part, parts, dest) {
    var dh = box.h / parts;

    dest.x = box.x
    dest.y = box.y + dh * part;
    dest.w = box.w;
    dest.h = dh;

    return dest;
}

function box_trim_h(box, ratio, dest) {
    var dw = box.w * ratio;
    dest.x = box.x + dw;
    dest.y = box.y;
    dest.w = box.w - 2 * dw;
    dest.h = box.h;

    return dest;
}

function box_trim_v(box, ratio, dest) {
    var dh = box.h * ratio;

    dest.x = box.x;
    dest.y = box.y + dh;
    dest.w = box.w;
    dest.h = box.h - 2 * dh;

    return dest;
}

function box_mid_h(box) {
    return box.x + box.w / 2;
}

function box_mid_v(box) {
    return box.y + box.h / 2;
}

function box_debug_draw(box) {

    var ctx = _canvas_context;

    var ss = ctx.strokeStyle;
    var lw = ctx.lineWidth;

    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 0.5;

    ctx.beginPath();

    ctx.moveTo(box.x, box.y);
    ctx.lineTo(box.x + box.w, box.y);
    ctx.lineTo(box.x + box.w, box.y + box.h);
    ctx.lineTo(box.x, box.y + box.h);
    ctx.closePath();

    ctx.stroke();

    ctx.strokeStyle = ss;
    ctx.lineWidth = lw;
}

function create_strip_box(slot) {

    var ctx = _canvas_context;

    var box = box_create();

    box_set(0, 0, ctx.canvas.width, ctx.canvas.height, box);
    box_trim_h(box, 0.01, box);
    box_trim_v(box, 0.02, box);
    box_split_h(box, slot, 8, box);
    box_trim_h(box, 0.02, box);

    return box;
}

exports.draw_mixer_strip = function(id, is_active, slot, params, active_param,
        mute, solo) {
    var ctx = _canvas_context;
    if (!ctx)
        return;

    ctx.textAlign = "center";
    ctx.fillStyle = "#00FF00";
    ctx.font = 'bold 12px Courier';

    var box_strip = create_strip_box(slot);

    var strip_title = is_active ? "[" + id + "]" : id;
    _canvas_context.fillText(strip_title, box_mid_h(box_strip), box_strip.y);

    if (mute >= 0)
        _canvas_context.fillText(mute ? "[M]" : "[ ]", box_mid_h(box_strip) - 15, box_strip.y + 30);

    if (solo >= 0)
        _canvas_context.fillText(solo ? "[S]" : "[ ]", box_mid_h(box_strip) + 15, box_strip.y + 30);

    var box_param = box_create();

    for (var i = 0; i < params.length; i++) {
        var param = params[i];
        
        var is_volume = (param[0] == "VOLUME");

        if (is_volume)
            box_set(box_strip.x, box_strip.y + 350,
                    box_strip.w, 250, box_param);
        else
            box_set(box_strip.x, box_strip.y + 50 + 50 * i,
                    box_strip.w, box_strip.h, box_param);

        draw_param_bar(ctx, is_volume, box_param, param, i == active_param);
    }
}

function draw_param_bar(ctx, vertical, box, param, is_active) {

    var name = param[0];
    var value = param[1];
    var min = param[2];
    var max = param[3];
    var steps = param[4];
    var is_log = param[5];

    var step = (max - min) / steps;

    if (step < 1)
        var digits = Math.floor(1 / step - 0.00001).toFixed(0).length;
    else
        var digits = 0;

    if (is_log)
        var val_pos_factor = Math.log(value / min) / Math.log(max/min);
    else
        var val_pos_factor = (value - min) / (max - min);

    ctx.textAlign = "center";

    if (is_active)
        ctx.fillText("["+name+"]", box_mid_h(box), box.y);
    else
        ctx.fillText(name, box_mid_h(box), box.y);

    ctx.strokeStyle = "#00FF00";

    if (vertical)
        ctx.lineWidth = 3;
    else
        ctx.lineWidth = 1;

    if (vertical) {
        ctx.textAlign = "right";
        ctx.fillText(max.toFixed(digits), box_mid_h(box)-10, box.y + 15);

        ctx.textAlign = "right";
        ctx.fillText(min.toFixed(digits), box_mid_h(box)-10, box.y + box.h - 15);
    } else {
        ctx.textAlign = "right";
        ctx.fillText(min.toFixed(digits), box.x+28, box.y + 15);

        ctx.textAlign = "left";
        ctx.fillText(max.toFixed(digits), box.x+box.w-28, box.y + 15);
    }

    ctx.beginPath();

    if (vertical) {
        var val_pos_y = box.y + 15 + (box.h - 30) * (1 - val_pos_factor);

        ctx.moveTo(box_mid_h(box), box.y + 15);
        ctx.lineTo(box_mid_h(box), box.y + box.h - 15);

        ctx.moveTo(box_mid_h(box) - 5, box.y + 15);
        ctx.lineTo(box_mid_h(box) + 5, box.y + 15);

        ctx.moveTo(box_mid_h(box) - 5, box.y + box.h - 15);
        ctx.lineTo(box_mid_h(box) + 5, box.y + box.h - 15);

        ctx.moveTo(box_mid_h(box) - 5, val_pos_y);
        ctx.lineTo(box_mid_h(box) + 5, val_pos_y);
    } else {
        var val_pos_x = box.x + 30 + (box.w - 60) * val_pos_factor;

        ctx.moveTo(box.x + 30, box.y + 15);
        ctx.lineTo(box.x + box.w - 30, box.y + 15);

        ctx.moveTo(box.x + 30, box.y + 15 - 5);
        ctx.lineTo(box.x + 30, box.y + 15 + 5);

        ctx.moveTo(box.x + box.w - 30, box.y + 15 - 5);
        ctx.lineTo(box.x + box.w - 30, box.y + 15 + 5);

        ctx.moveTo(val_pos_x, box.y + 15 - 5);
        ctx.lineTo(val_pos_x, box.y + 15 + 5);
    }

    ctx.stroke();

    // NOTE: temporary hack to append bandwidth in octaves
    if (name == "EQ_Q") {
        // see http://www.sengpielaudio.com/calculator-bandwidth.htm
        var Q = value;
        var Y = 1 + 1 / (2*Q*Q) + Math.sqrt((2 + 1/(Q*Q)) * (2 + 1/(Q*Q)) / 4 - 1);
        var N = Math.log(Y) / Math.log(2);

        if (vertical) {
            ctx.textAlign = "left";
            ctx.fillText(value.toFixed(digits), box_mid_h(box) + 10, val_pos_y);

            ctx.textAlign = "left";
            ctx.fillText("("+N.toFixed(digits+1)+")", box_mid_h(box) + 10, val_pos_y + 10);
        } else {
            ctx.textAlign = "right";
            ctx.fillText(value.toFixed(digits), val_pos_x, box.y + 30);

            ctx.textAlign = "left";
            ctx.fillText("("+N.toFixed(digits+1)+")", val_pos_x, box.y + 30);
        }
    } else {
        if (vertical) {
            ctx.textAlign = "left";
            ctx.fillText(value.toFixed(digits), box_mid_h(box) + 10, val_pos_y);
        } else {
            ctx.textAlign = "center";
            ctx.fillText(value.toFixed(digits), val_pos_x, box.y + 30);
        }
    }

}

}
