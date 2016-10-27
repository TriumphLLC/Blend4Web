"use strict";

b4w.register("material_api", function(exports, require) {

var m_data    = require("data");
var m_app     = require("app");
var m_cfg     = require("config");
var m_mat     = require("material");
var m_scenes  = require("scenes");
var m_version = require("version");

var DEBUG = (m_version.type() === "DEBUG");

var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/material_api/";

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas_cont",
        callback: init_cb,
        physics_enabled: false,
        alpha: true,
        background_color: [1, 1, 1, 1],
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
    m_data.load(APP_ASSETS_PATH + "material_api.json", load_cb);
}

function load_cb(data_id) {
    m_app.enable_camera_controls();
    set_stack_material_params();
    set_node_material_params();
}

function set_stack_material_params() {
    var cube_diffuse_color = m_scenes.get_object_by_name("Cube_diffuse_color");
    var cube_specular_intensity = m_scenes.get_object_by_name("Cube_specular_intensity");
    var cube_specular_hardness = m_scenes.get_object_by_name("Cube_specular_hardness");
    var cube_emit_factor = m_scenes.get_object_by_name("Cube_emit_factor");
    var cube_ambient_factor = m_scenes.get_object_by_name("Cube_ambient_factor");
    var cube_specular_color = m_scenes.get_object_by_name("Cube_specular_color");
    var cube_alpha_factor = m_scenes.get_object_by_name("Cube_alpha_factor");
    var sphere_1 = m_scenes.get_object_by_name("Sphere_1");
    var sphere_2 = m_scenes.get_object_by_name("Sphere_2");

    m_mat.set_diffuse_color(cube_diffuse_color, "mat_diffuse_color", [0.5,0,0]);
    m_mat.set_specular_intensity(cube_specular_intensity, "mat_specular_intensity", 1);
    m_mat.set_specular_hardness(cube_specular_hardness, "mat_specular_hardness", 0.8);
    m_mat.set_emit_factor(cube_emit_factor, "mat_emit_factor", 1);
    m_mat.set_ambient_factor(cube_ambient_factor, "mat_ambient_factor", 0.1);
    m_mat.set_specular_color(cube_specular_color, "mat_specular_color", [0, 0.8, 0]);
    m_mat.set_alpha_factor(cube_alpha_factor, "mat_alpha_factor", 0);
    m_mat.inherit_material(sphere_1, "Sphere_mat_1", sphere_2, "Sphere_mat_2");
}

function set_node_material_params() {
    var cube_node_value = m_scenes.get_object_by_name("Cube_node_value");
    m_mat.set_nodemat_value(cube_node_value, ["mat_node_value", "Value"], 20);
    var cube_node_rgb = m_scenes.get_object_by_name("Cube_node_rgb");
    m_mat.set_nodemat_rgb(cube_node_rgb, ["mat_node_rgb", "RGB"], 0, 1, 0);
}

});

