"use strict";

/**
 * Preloader add-on.
 * Provides API to create various types of standard preloaders.
 * @module preloader
 */
b4w.module["preloader"] = function(exports, require) {

var m_app    = require("app");

var _preloader = {};
var _canvas_container_elem = null;


/**
 * Create a simple preloader.
 * @param {Object} options Initialization options.
 * @param {String} options.canvas_container_id Canvas container ID.
 * @param {String} [options.background_container_id] Background container ID.
 * @param {String} [options.bg_color] Background color.
 * @param {String} [options.bar_color] Load bar color.
 * @cc_externs bar_color bg_color background_container_id
 * @cc_externs canvas_container_id preloader_fadeout
 */
exports.create_simple_preloader = function(options) {

    var canvas_container_id = null;
    var background_container_id = null;
    var bar_color = "#bf9221";
    var bg_color = "#000";

    for (var opt in options) {
        switch (opt) {
        case "canvas_container_id":
            canvas_container_id = options.canvas_container_id;
            break;
        case "background_container_id":
            background_container_id = options.background_container_id;
            break;
        case "bg_color":
            bg_color = options.bg_color;
            break;
        case "bar_color":
            bar_color = options.bar_color;
            break;
        case "preloader_fadeout":
            _preloader.fadeout = options.preloader_fadeout;
            break;
        }
    }

    var container = document.createElement("div");
    var frame = document.createElement("div");
    container.id = "simple_preloader_container";
    var bar = document.createElement("div");
    var caption = document.createElement("div");
    var background_container = document.getElementById(background_container_id);

    _canvas_container_elem = document.getElementById(canvas_container_id);

    container.style.cssText =
        "z-index: 4;" +
        "background-color: " + bg_color + ";" +
        "width: 100%;" +
        "height: 100%;" +
        "position: absolute;" +
        "margin: 0;" +
        "padding: 0;" +
        "top: 0;" +
        "left: 0;";

    frame.style.cssText =
        "position: absolute;" +
        "left: 50%;" +
        "top: 82%;" +
        "width: 300px;" +
        "height: 20px;" +
        "margin-left: -150px;" +
        "margin-top: -10px;" +
        "border-style:solid;" +
        "border-width:4px;" +
        "border-color: " + "#000" + ";" +
        "border-radius: 0px;";

    bar.style.cssText =
        "position: absolute;" +
        "left: 0px;" +
        "top: 1px;" +
        "width: 0px;" +
        "height: 18px;" +
        "background-color: " + bar_color + ";" +
        "border-radius: 0px;";

    caption.style.cssText =
        "position: absolute;" +
        "left: 50%;" +
        "top: 50%;" +
        "width: 100%;" +
        "height: 100%;" +
        "margin-left: -150px;" +
        "margin-top: -10px;" +
        "text-align: center;" +
        "font-size: 17px;" +
        "font-weight: bold;" +
        "color: #000;" +
        "font-family: Verdana;" +

    frame.appendChild(bar);
    frame.appendChild(caption);
    container.appendChild(frame);

    document.body.appendChild(container);

    _preloader.type = "SIMPLE";
    _preloader.container = container;
    _preloader.bar = bar;
    _preloader.caption = caption;
    _preloader.background = background_container;
}

/**
 * Create a rotation preloader.
 * @param {Object} options Initialization options.
 * @param {String} options.canvas_container_id Canvas container ID.
 * @param {String} [options.background_container_id] Background container ID.
 * @param {String} [options.bg_color] Background color.
 * @param {String} [options.frame_bg_color] Frame background color.
 * @param {String} [options.frame_class] CSS frame class.
 * @param {String} [options.anim_elem_class] Animated element class.
 * @cc_externs frame_bg_color frame_class anim_elem_class
 */
exports.create_rotation_preloader = function(options) {
    var canvas_container_id = null;
    var background_container_id = null;
    var frame_bg_color = "rgba(0,0,0,0)";
    var frame_class = "";
    var anim_elem_class = "";
    var bg_color = "rgba(0,0,0,0)";

    for (var opt in options) {
        switch (opt) {
        case "canvas_container_id":
            canvas_container_id = options.canvas_container_id;
            break;
        case "background_container_id":
            background_container_id = options.background_container_id;
            break;
        case "frame_bg_color":
            frame_bg_color = options.frame_bg_color;
            break;
        case "bg_color":
            bg_color = options.bg_color;
            break;
        case "frame_class":
            frame_class = options.frame_class;
            break;
        case "anim_elem_class":
            anim_elem_class = options.anim_elem_class;
            break;
        }
    }

    var container = document.createElement("div");
    var frame = document.createElement("div");
    var anim_elem = document.createElement("div");
    var caption = document.createElement("div");
    var background_container = document.getElementById(background_container_id);

    _canvas_container_elem = document.getElementById(canvas_container_id);

    container.style.cssText =
        "z-index: 4;" +
        "background-color: " + bg_color + ";" +
        "width: 100%;" +
        "height: 100%;" +
        "position: absolute;" +
        "margin: 0;" +
        "padding: 0;" +
        "top: 0;" +
        "left: 0;";

    frame.style.cssText =
        "position: absolute;" +
        "left: 50%;" +
        "top: 50%;" +
        "width: 117px;" +
        "height: 117px;" +
        "margin-left: -58px;" +
        "margin-top: -58px;" +
        "background-color: " + frame_bg_color + ";";

    anim_elem.style.cssText =
        "position: absolute;" +
        "left: 0px;" +
        "top: 0px;" +
        "width: 100%;" +
        "height: 100%;" +
        "background-position: center;" +
        "background-repeat: no-repeat;";

    caption.style.cssText =
        "position: absolute;" +
        "width: 100%;" +
        "height: 100%;" +
        "text-align: center;" +
        "margin-top: 38px;" +
        "font-size: 36px;" +
        "color: #ffffff;" +
        "font-family: Arial;" +
        "font-weight: bold;";

    anim_elem.className = anim_elem_class;
    frame.appendChild(anim_elem);
    frame.className = frame_class;
    frame.appendChild(caption);
    container.appendChild(frame);

    _canvas_container_elem.appendChild(container);

    _preloader.type = "ROTATION";
    _preloader.container = container;
    _preloader.anim_elem = anim_elem;
    _preloader.caption = caption;
    _preloader.background = background_container;
}

/**
 * Create an advanced preloader.
 * @param {Object} options Initialization options.
 * @param {String} options.canvas_container_id Canvas container ID.
 * @param {String} options.background_container_id Background container ID.
 * @param {String} options.preloader_bar_id Preloader bar ID.
 * @param {String} options.fill_band_id Preloader band ID.
 * @param {String} options.preloader_caption_id Preloader caption ID.
 * @param {String} options.preloader_container_id Preloader container ID.
 * @param {Number} options.img_width Device image width.
 * @param {Number} options.preloader_width Preloader width.
 * @cc_externs fill_band_id preloader_bar_id preloader_caption_id
 * @cc_externs preloader_container_id img_width preloader_width
 */
exports.create_advanced_preloader = function(options) {
    var img_width = options.img_width;
    var preloader_width = options.preloader_width;
    var canvas_container_id = options.canvas_container_id;
    var preloader_container_id = options.preloader_container_id;

    var band_width = preloader_width - img_width;
    var ratio = preloader_width / band_width;

    var preloader_bar = document.getElementById(options.preloader_bar_id);
    var fill_band = document.getElementById(options.fill_band_id);
    var preloader_caption = document.getElementById(options.preloader_caption_id);
    var preloader_container = document.getElementById(options.preloader_container_id);
    var background_container = document.getElementById(options.background_container_id);

    _canvas_container_elem = document.getElementById(canvas_container_id);

    _preloader.type = "ADVANCED";
    _preloader.bar = preloader_bar;
    _preloader.fill = fill_band;
    _preloader.ratio = ratio;

    _preloader.caption = preloader_caption;
    _preloader.container = preloader_container;
    _preloader.background = background_container;
}

/**
 * Update the preloader bar status.
 * @param {Number} percentage The new preloader bar percentage
 */
exports.update_preloader = function(percentage) {

    _preloader.caption.innerHTML = percentage + "%";

    if (_preloader.type == "SIMPLE")
        _preloader.bar.style.width = percentage + "%";

    if (_preloader.type == "ADVANCED") {
        _preloader.bar.style.width = percentage / _preloader.ratio + "%";
        _preloader.fill.style.width = (100 - percentage) + "%";
    }

    if (_preloader.type == "ROTATION")
        _preloader.anim_elem.style.transform = "rotate(" + percentage + "deg)";

    if (percentage == 100)
        if (_preloader.fadeout) {
            m_app.css_animate(_preloader.background, "opacity", 1, 0, 1500, null, null, function(){
                _preloader.background.parentNode.removeChild(_preloader.background);
            });
            m_app.css_animate(_preloader.container, "opacity", 1, 0, 1000, null, null, function(){
                _preloader.container.parentNode.removeChild(_preloader.container);
            });
        } else {
            _preloader.container.parentNode.removeChild(_preloader.container);

            if (_preloader.background)
                _preloader.background.parentNode.removeChild(_preloader.background);
        }
}

}
