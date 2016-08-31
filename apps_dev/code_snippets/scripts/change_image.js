"use strict";

b4w.register("change_image", function(exports, require) {

var m_data    = require("data");
var m_app     = require("app");
var m_cfg     = require("config");
var m_cont    = require("container");
var m_mouse   = require("mouse");
var m_tex     = require("textures");
var m_scenes  = require("scenes");
var m_version = require("version");

var DEBUG = (m_version.type() === "DEBUG");

var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/change_image/";

var PATH_TO_IMG_CUBE_1b = APP_ASSETS_PATH + "1_b.png";
var PATH_TO_IMG_CUBE_2b = APP_ASSETS_PATH + "2_b.png";

var PATH_TO_IMG_PLANE_1 = APP_ASSETS_PATH + "table_napkin_1.png";
var PATH_TO_IMG_PLANE_2 = APP_ASSETS_PATH + "table_napkin_2.png";

var PATH_TO_NORMAL_PLANE_1 = APP_ASSETS_PATH + "table_napkin_1_normal.png";
var PATH_TO_NORMAL_PLANE_2 = APP_ASSETS_PATH + "table_napkin_2_normal.png";

var _world = null;
var _wait_for_image_loading = false;
var _napkin_flag = false;
var _stand_1 = null;
var _stand_2 = null;

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas_cont",
        callback: init_cb,
        physics_enabled: false,
        alpha: true,
        show_fps: true,
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
    m_data.load(APP_ASSETS_PATH + "change_image.json", load_cb);
}

function load_cb(data_id) {
    m_app.enable_camera_controls();
    var container = m_cont.get_canvas();
    _world = m_scenes.get_world_by_name("World");
    _stand_1 = m_scenes.get_object_by_name("stand");
    _stand_2 = m_scenes.get_object_by_name("stand_2");
    container.addEventListener("mousedown", main_canvas_clicked_cb, false);
}

function change_img_cb() {
    _wait_for_image_loading = false;
}

function main_canvas_clicked_cb(e) {

    var x = m_mouse.get_coords_x(e);
    var y = m_mouse.get_coords_y(e);

    var obj = m_scenes.pick_object(x, y);
    if (obj && !_wait_for_image_loading) {
        switch(m_scenes.get_object_name(obj)) {
        case "Sphere_button_2":
            m_tex.change_image(_world, "lightmap", PATH_TO_IMG_CUBE_2b, change_img_cb);
            m_tex.change_image(_stand_1, "cubemap_slot", PATH_TO_IMG_CUBE_2b, change_img_cb);
            break;
        case "Sphere_button_1":
            m_tex.change_image(_world, "lightmap", PATH_TO_IMG_CUBE_1b, change_img_cb);
            m_tex.change_image(_stand_2, "cubemap_slot", PATH_TO_IMG_CUBE_1b, change_img_cb);
            break;
        case "table_napkin":
            if (_napkin_flag) {
                m_tex.change_image(obj, "table_napkin", PATH_TO_IMG_PLANE_1, change_img_cb);
                m_tex.change_image(obj, "table_napkin_normal", PATH_TO_NORMAL_PLANE_1, change_img_cb);
            } else {
                m_tex.change_image(obj, "table_napkin", PATH_TO_IMG_PLANE_2, change_img_cb);
                m_tex.change_image(obj, "table_napkin_normal", PATH_TO_NORMAL_PLANE_2, change_img_cb);
            }
            _napkin_flag = !_napkin_flag;
            break;
        default:
            return;
        }
        _wait_for_image_loading = true;
    }
}

});