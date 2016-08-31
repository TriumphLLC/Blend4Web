"use strict";

b4w.register("canvas_texture", function(exports, require) {

var m_tex     = require("textures");
var m_data    = require("data");
var m_app     = require("app");
var m_main    = require("main");
var m_sfx     = require("sfx");
var m_scenes  = require("scenes");
var m_cfg     = require("config");
var m_version = require("version");

var DEBUG = (m_version.type() === "DEBUG");

var GIF_FRAMES_NUMBER = 24;
var GIF_DELAY_TIME = 100;
var VIDEO_DELAY_TIME = 1000/30;
var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/canvas_texture/";

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas_cont",
        callback: init_cb,
        show_fps: true,
        physics_enabled: false,
        background_color: [1, 1, 1, 1],
        alpha: true,
        autoresize: true,
        assets_dds_available: !DEBUG,
        assets_min50_available: !DEBUG,
        console_verbose: true
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
    m_data.load(APP_ASSETS_PATH + "example.json", load_cb);
}

function load_cb(data_id) {
    m_app.enable_camera_controls();
    load_data();
}

function load_data() {
    var cube = m_scenes.get_object_by_name("Cube");
    var ctx_image = m_tex.get_canvas_ctx(cube, "Image");
    var ctx_video = m_tex.get_canvas_ctx(cube, "Video");
    var ctx_picture = m_tex.get_canvas_ctx(cube, "Picture");

    if (ctx_image) {
        var img = new Image();
        img.src = APP_ASSETS_PATH + "earth.jpg";
        img.onload = function() {
            ctx_image.drawImage(img, 0, 0, ctx_image.canvas.width, 
                    ctx_image.canvas.height);
            ctx_image.fillStyle = "rgba(255,0,0,255)";
            ctx_image.font = "250px Arial";
            ctx_image.fillText("Hello, World!", 300, 300);
            m_tex.update_canvas_ctx(cube, "Image");
        }
    }

    if (ctx_video) {

        var format = m_sfx.detect_video_container("");
        
        if (format) {
            var video_file = document.createElement('video');  
            video_file.autoplay = true;
            video_file.loop = true;
            video_file.addEventListener("loadeddata", function() {
                draw_video_iter(cube, video_file, ctx_video);
            }, false);

            if (format == "m4v")
                video_file.src= APP_ASSETS_PATH + "blender." + "altconv." + format;
            else
                video_file.src= APP_ASSETS_PATH + "blender." + format;
        } else
            console.log("Can not load the video.");
    }

    if (ctx_picture) {
        var image = new Image();
        image.src = APP_ASSETS_PATH + "pyramid.jpg"
        image.onload = function() {
            var width = Math.round(image.width / GIF_FRAMES_NUMBER);
            var height = image.height;
            draw_picture_iter(cube, image, ctx_picture, width, height, 0);
        }

    }
}

function draw_video_iter(cube, video, context) {
    var canvas = context.canvas;
    var scale = canvas.width / video.videoWidth;
    var scale_height = Math.round( scale * video.videoHeight );
    var shift_position = Math.round((canvas.height - scale_height) / 2);
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 
            0, shift_position, canvas.width, scale_height);
    m_tex.update_canvas_ctx(cube, "Video");
    setTimeout(function() { draw_video_iter(cube, video, context) }, VIDEO_DELAY_TIME);
}

function draw_picture_iter(cube, image, context, width, height, current_frame) {
    current_frame = current_frame % GIF_FRAMES_NUMBER;
    context.drawImage(image, width * current_frame, 0, width, height, 0, 0,
            context.canvas.width, context.canvas.height);
    m_tex.update_canvas_ctx(cube, "Picture");
    setTimeout(function() { draw_picture_iter(cube, image, context, width, height, 
            current_frame + 1) }, GIF_DELAY_TIME);
}

});

