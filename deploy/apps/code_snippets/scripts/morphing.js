"use strict"

b4w.register("morphing", function(exports, require) {

var m_app       = require("app");
var m_data      = require("data");
var m_scenes    = require("scenes");
var m_geom      = require("geometry");
var m_cfg       = require("config");
var m_obj       = require("objects");
var m_version   = require("version");

var DEBUG = (m_version.type() === "DEBUG");

var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/morphing/";

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas_cont",
        callback: init_cb,
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
    m_data.load(APP_ASSETS_PATH + "morphing.json", load_cb);
}

function load_cb(data_id) {
    var main_interface_container = document.createElement("div");
    main_interface_container.className = "main_sliders_container";
    main_interface_container.setAttribute("id", "main_sliders_container");
    document.body.appendChild(main_interface_container);
    m_app.enable_camera_controls();
    var obj = m_scenes.get_object_by_name("body");
    if (obj)
        create_interface(obj);
}

function create_interface(obj) {
    if (!m_geom.check_shape_keys(obj))
        return;
    create_dual_slider(obj, "fatten", "shrink", "Weight");
    var shape_keys_names = m_geom.get_shape_keys_names(obj);
    for (var i  = 0; i < shape_keys_names.length; i++) {
        if (shape_keys_names[i] == "fatten" || shape_keys_names[i] == "shrink")
            continue;
        create_slider(obj, shape_keys_names[i], shape_keys_names[i]);
    }
}

function create_slider(obj, key_name, slider_name) {
    
    var slider = init_slider(slider_name);
    var value_label = document.getElementById(slider_name);
    var value = m_geom.get_shape_key_value(obj, key_name);

    slider.min = 0;
    slider.max = 1;
    slider.step = 0.02;
    slider.value = value;
    value_label.textContent = slider.value;

    function slider_changed(e) {
        m_geom.set_shape_key_value(obj, key_name, slider.value);
        m_obj.update_boundings(obj);
        value_label.textContent = slider.value;
    }

    if (is_ie11())
        slider.onchange = slider_changed;
    else
        slider.oninput = slider_changed;
}

function create_dual_slider(obj, key_name_1, key_name_2, slider_name) {
 
    var slider = init_slider(slider_name);
    var value_label = document.getElementById(slider_name);
    var value = m_geom.get_shape_key_value(obj, key_name_1) 
            - m_geom.get_shape_key_value(obj, key_name_2)

    slider.min = -1;
    slider.max = 1;
    slider.step = 0.02;
    slider.value = value;
    value_label.textContent = Math.floor(slider.value*100)/100;

    function slider_changed(e) {
        if (slider.value < 0) {
            var key_name = key_name_2;
            var reset_name = key_name_1;
            var value = -slider.value;
        } else {
            var key_name = key_name_1;
            var reset_name = key_name_2;
            var value = slider.value;
        }
        m_geom.set_shape_key_value(obj, key_name, value);
        if (m_geom.get_shape_key_value(obj, reset_name))
            m_geom.set_shape_key_value(obj, reset_name, 0);
        value_label.textContent = slider.value;
    }

    if (is_ie11())
        slider.onchange = slider_changed;
    else
        slider.oninput = slider_changed;
}

function init_slider(name) {
    var container = document.createElement("div");
    container.className = "slider_container";

    var name_label = document.createElement("label");
    name_label.className = "text_label";
    name_label.textContent = name;

    var slider = document.createElement("input");
    slider.className = "input_slider";
    slider.setAttribute("type", "range");

    var value_label = document.createElement("label");
    value_label.className = "value_label";
    value_label.setAttribute("id", name);

    container.appendChild(name_label);
    container.appendChild(slider);
    container.appendChild(value_label);

    var border = document.createElement("div");
    border.className = "border";
    border.appendChild(container);

    var main_slider_container = document.getElementById("main_sliders_container");
    main_slider_container.appendChild(border);

    return slider;
}

function is_ie11() {
    return !(window.ActiveXObject) && "ActiveXObject" in window;
}

});

