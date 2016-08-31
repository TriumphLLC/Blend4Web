"use strict"

b4w.register("webcam", function(exports, require) {

var m_app     = require("app");
var m_cfg     = require("config");
var m_data    = require("data");
var m_ver     = require("version");
var m_tex     = require("textures");
var m_scn     = require("scenes");
var m_cont    = require("container");
var m_version = require("version");

var DEBUG = (m_version.type() === "DEBUG");

var TIME_DELAY = 1000 / 24;
var WAITING_DELAY = 1000;
var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/webcam/";

var _cam_waiting_handle = null;

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas_cont",
        callback: init_cb,
        autoresize: true,
        assets_dds_available: !DEBUG,
        assets_min50_available: !DEBUG,
        physics_enabled: false
    });
}

function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }

    load();
}

function load() {
    m_data.load(APP_ASSETS_PATH + "webcam.json", load_cb);
}

function load_cb(data_id, success) {

    if (!success) {
        console.log("b4w load failure");
        return;
    }
    var error_cap = m_scn.get_object_by_name("Text");
    m_app.enable_camera_controls();

    if (Boolean(get_user_media()))
        start_video();
}

function get_user_media() {
    if (Boolean(navigator.getUserMedia))
        return navigator.getUserMedia.bind(navigator);
    else if (Boolean(navigator.webkitGetUserMedia))
        return navigator.webkitGetUserMedia.bind(navigator);
    else if (Boolean(navigator.mozGetUserMedia))
        return navigator.mozGetUserMedia.bind(navigator);
    else if (Boolean(navigator.msGetUserMedia))
        return navigator.msGetUserMedia.bind(navigator);
    else
        return null;
}

function start_video() {

    if (_cam_waiting_handle)
        clearTimeout(_cam_waiting_handle);

    var user_media = get_user_media();
    var media_stream_constraint = {
        video: { width: 1280, height: 720 }
    };
    var success_cb = function(local_media_stream) {
        var video = document.createElement("video");
        video.setAttribute("autoplay", "true");
        video.src = window.URL.createObjectURL(local_media_stream);
        var error_cap = m_scn.get_object_by_name("Text");
        m_scn.hide_object(error_cap);

        var obj = m_scn.get_object_by_name("tv");
        var context = m_tex.get_canvas_ctx(obj, "Texture.001");
        var update_canvas = function() {
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight,
                    0, 0, context.canvas.width, context.canvas.height);
            m_tex.update_canvas_ctx(obj, "Texture.001");
            setTimeout(function() {update_canvas()}, TIME_DELAY);
        }

        video.onloadedmetadata = function(e) {
            update_canvas();
        };
    };

    var fail_cb = function() {
        var error_cap = m_scn.get_object_by_name("Text");
        _cam_waiting_handle = setTimeout(start_video, WAITING_DELAY);
    };

    user_media(media_stream_constraint, success_cb, fail_cb);
}

});