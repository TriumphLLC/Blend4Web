"use strict"

b4w.register("dynamic_geometry", function(exports, require) {

var m_app     = require("app");
var m_data    = require("data");
var m_geom    = require("geometry");
var m_scs     = require("scenes");
var m_obj     = require("objects");
var m_trans   = require("transform");
var m_cfg     = require("config");
var m_version = require("version");

var DEBUG = (m_version.type() === "DEBUG");

var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/dynamic_geometry";

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas_cont",
        callback: init_cb,
        physics_enabled: false,
        show_fps: true,
        alpha: false,
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
    m_data.load(APP_ASSETS_PATH + "/example.json", load_cb);
}

function load_cb(data_id) {
    m_app.enable_camera_controls();
    make_some_copies();
    remove_some_copies();
    geometry_change();
}

function make_some_copies() {
    var src_obj = m_scs.get_object_by_name("Plane");

    var deep_copy = m_obj.copy(src_obj, "deep_copy", true);
    var deep_copy2 = m_obj.copy(src_obj, "deep_copy2", true);
    var shallow_copy = m_obj.copy(src_obj, "shallow_copy", false);
    var shallow_copy2 = m_obj.copy(src_obj, "shallow_copy2", false);

    m_scs.append_object(deep_copy);
    m_scs.append_object(deep_copy2);
    m_scs.append_object(shallow_copy);
    m_scs.append_object(shallow_copy2);

    m_trans.set_translation(deep_copy, -2, -2, 0);
    m_trans.set_translation(deep_copy2, 2, -2, 0);
    m_trans.set_translation(shallow_copy, 2, 2, 0);
    m_trans.set_translation(shallow_copy2, -2, 2, 0);
}

function remove_some_copies() {
    var deep_copy = m_scs.get_object_by_name("deep_copy2");
    var shallow_copy = m_scs.get_object_by_name("shallow_copy2");

    m_scs.remove_object(deep_copy);
    m_scs.remove_object(shallow_copy);
}

function geometry_change(indices, positions) {
    var plane_blue = m_scs.get_object_by_name("Plane");
    var plane_red = m_scs.get_object_by_name("Plane.002");
    var indices = new Uint16Array([0,1,2,3,4,5]);
    var positions_blue = new Float32Array([0,0,1, -1,-1,0, 1,1,0, 1,1,0, -1,-1,0, 1,-1,0]);
    var positions_red = new Float32Array([-9,9,1, -10,8,0, -8,10,0, -8,10,0, -10,8,0, -8,8,0]);

    m_geom.override_geometry(plane_blue, "Material", indices, positions_blue, false);
    m_geom.override_geometry(plane_red, "Material.002", indices, positions_red, false);
    // update object's boundings after mesh geometry changing 
    m_obj.update_boundings(plane_blue);
    m_obj.update_boundings(plane_red);
}


});

