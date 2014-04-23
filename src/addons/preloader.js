"use strict";

/**
 * Preloader add-on.
 * Provides API to create simple and advanced preloaders.
 * @module preloader
 */
b4w.module["preloader"] = function(exports, require) {


var _preloader = {};
var _canvas_container_elem = null;


/**
 * Create simple preloader.
 * @param {Object} options Initialization options.
 * @param {String} options.canvas_container_id Canvas container ID.
 * @param {String} [options.background_container_id] Background container ID.
 * @param {String} [options.bg_color] Background color.
 * @param {String} [options.bar_color] Load bar color.
 */
exports.create_simple_preloader = function(options) {

    var canvas_container_id = null;
    var background_container_id = null;
    var bar_color = "#bf9221";
    var bg_color = "#000";

    for (var opt in options) {
        switch (opt) {
        case "canvas_container_id":
            canvas_container_id = options["canvas_container_id"];
            break;
        case "background_container_id":
            background_container_id = options["background_container_id"];
            break;
        case "bg_color":
            bg_color = options["bg_color"];
            break;
        case "bar_color":
            bar_color = options["bar_color"];
            break;
        }
    }

    var container = document.createElement("div");
    var frame = document.createElement("div");
    var bar = document.createElement("div");
    var caption = document.createElement("div");
    var background_container = document.getElementById(background_container_id);

    _canvas_container_elem = document.getElementById(canvas_container_id);

    container.style.cssText = " \
        z-index: 4;\
        background-color: " + bg_color + ";\
        width: 100%;\
        height: 100%;\
        position: absolute;\
        margin: 0;\
        padding: 0;\
    ";

    frame.style.cssText = " \
        position: absolute;\
        left: 50%;\
        top: 82%;\
        width: 400px;\
        height: 20px;\
        margin-left: -200px;\
        margin-top: -10px;\
        border-style:solid;\
        border-width:2px;\
        border-color: " + bar_color + ";\
        border-radius: 6px;\
    ";

    bar.style.cssText = " \
        position: absolute;\
        left: 0px;\
        top: 1px;\
        width: 0px;\
        height: 18px;\
        background-color: " + bar_color + ";\
        border-radius: 4px;\
    ";

    caption.style.cssText = " \
        position: absolute;\
        left: 50%;\
        top: 50%;\
        width: 100%;\
        height: 100%;\
        margin-left: -200px;\
        margin-top: -10px;\
        text-align: center;\
        font-size: 17px;\
        color: #ffffff;\
        font-family: Verdana;\
    ";

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
 * Create advanced preloader.
 * @param {Object} options Initialization options.
 * @param {String} options.canvas_container_id Canvas container ID.
 * @param {String} options.background_container_id Background container ID.
 * @param {String} options.options.preloader_bar_id Preloader bar ID.
 * @param {String} options.options.fill_band_id_id Preloader band ID.
 * @param {String} options.options.preloader_caption_id Preloader caption ID.
 * @param {String} options.options.preloader_container_id Preloader container ID.
 * @param {Number} options.options.img_width Device image width.
 * @param {Number} options.options.preloader_width Preloader width.
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
 * Update preloader bar status.
 * @param {Number} percentage New bar percentage
 */
exports.update_preloader = function(percentage) {

    _preloader.caption.innerHTML = percentage + "%";

    if (_preloader.type == "SIMPLE")
        _preloader.bar.style.width = percentage + "%";

    if (_preloader.type == "ADVANCED") {
        _preloader.bar.style.width = percentage / _preloader.ratio + "%";
        _preloader.fill.style.width = (100 - percentage) + "%";
    }

    if (percentage == 100) {
        _preloader.container.style.zIndex = 0;
        _canvas_container_elem.style.zIndex = 1;

        if (_preloader.background)
            _preloader.background.style.zIndex = 0;
    }
}

}

if (window["b4w"])
    window["b4w"]["preloader"] = b4w.require("preloader");
else
    throw "Failed to register preloader, load b4w first";
