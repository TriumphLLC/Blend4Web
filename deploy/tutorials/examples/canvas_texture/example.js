"use strict";

b4w.register("example_main", function(exports, require) {

var m_tex    = require("textures");
var m_data   = require("data");
var m_app    = require("app");
var m_main   = require("main");
var m_sfx    = require("sfx");

var GIF_FRAMES_NUMBER = 24;
var GIF_DELAY_TIME = 100;
var VIDEO_DELAY_TIME = 1000/30;

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas3d",
        callback: init_cb,
        physics_enabled: false,
        alpha: true
    });
}

function init_cb(canvas_elem, success) {

    if(!success) {
        console.log("b4w init failure");
        return;
    }
    m_app.enable_controls(canvas_elem);
    window.onresize = on_resize;
    on_resize();
    load();
}

function load() {
    m_data.load("example.json", load_cb);
}

function load_cb(data_id) {
    m_app.enable_camera_controls();
    load_data();
}

function load_data() {
    var ctx_image = m_tex.get_canvas_texture_context("my_image");
    var ctx_video = m_tex.get_canvas_texture_context("my_video");
    var ctx_picture = m_tex.get_canvas_texture_context("my_picture");

    if (ctx_image) {
        var img = new Image();
        img.src = "earth.jpg";
        img.onload = function() {
            ctx_image.drawImage(img, 0, 0, ctx_image.canvas.width, 
                    ctx_image.canvas.height);
            ctx_image.fillStyle = "rgba(255,0,0,255)";
            ctx_image.font = "250px Arial";
            ctx_image.fillText("Hello, World!", 300, 300);
            m_tex.update_canvas_texture_context("my_image");
        }
    }

    if (ctx_video) {

        var format = m_sfx.detect_video_container("");
        
        if (format) {
            var video_file = document.createElement('video');  
            video_file.autoplay = true;
            video_file.loop = true;
            video_file.addEventListener("loadeddata", function() {
                draw_video_iter(video_file, ctx_video);
            }, false);

            if (format == "m4v")
                video_file.src="blender." + "altconv." + format;
            else
                video_file.src="blender." + format;
        } else
            console.log("Can not load the video.");
    }

    if (ctx_picture) {
        var image = new Image();
        image.src = "pyramid.jpg"
        image.onload = function() {
            var width = Math.round(image.width / GIF_FRAMES_NUMBER);
            var height = image.height;
            draw_picture_iter(image, ctx_picture, width, height, 0);
        }

    }
}

function draw_video_iter(video, context) {
    var canvas = context.canvas;
    var scale = canvas.width / video.videoWidth;
    var scale_height = Math.round( scale * video.videoHeight );
    var shift_position = Math.round((canvas.height - scale_height) / 2);
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 
            0, shift_position, canvas.width, scale_height);
    m_tex.update_canvas_texture_context("my_video");
    setTimeout(function() { draw_video_iter(video, context) }, VIDEO_DELAY_TIME);
}

function draw_picture_iter(image, context, width, height, current_frame) {
    current_frame = current_frame % GIF_FRAMES_NUMBER;
    context.drawImage(image, width * current_frame, 0, width, height, 0, 0,
            context.canvas.width, context.canvas.height);
    m_tex.update_canvas_texture_context("my_picture");
    setTimeout(function() { draw_picture_iter(image, context, width, height, 
            current_frame + 1) }, GIF_DELAY_TIME);
}

function on_resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    m_main.resize(w, h);
}

});

b4w.require("example_main").init();
