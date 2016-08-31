"use strict";

b4w.register("multitouch", function(exports, require) {

var m_anim    = require("animation");
var m_app     = require("app");
var m_cfg     = require("config");
var m_ctl     = require("controls");
var m_data    = require("data");
var m_mat     = require("material");
var m_scenes  = require("scenes");
var m_version = require("version");

var DEBUG = (m_version.type() === "DEBUG");

var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/multitouch/";

var SELECTION_COUNT = 5;

var RED = [1, 0, 0];
var BLUE = [0, 0, 1];
var DEF_COLOR = [0.311, 0.311, 0.311];

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas_cont",
        callback: init_cb,
        physics_enabled: false,
        alpha: true,
        background_color: [1,1,1,0],
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
    m_data.load(APP_ASSETS_PATH + "multitouch.json", load_cb);
}

function load_cb(data_id) {
    m_app.enable_camera_controls();

    var paws = [];
    var seletions = [];

    function select_anim_cb(obj, id, pulse) {
        if (pulse > 0)
            m_anim.play(obj);
        else {
            m_anim.stop(obj);
            m_anim.set_first_frame(obj);
        }
    }

    for (var i = 0; i < SELECTION_COUNT; i++) {
        var paw = m_scenes.get_object_by_name("paw_" + i);
        m_anim.apply_def(paw);
        paws.push(paw);

        var select_s = m_ctl.create_selection_sensor(paw);
        seletions.push(select_s);

        m_ctl.create_sensor_manifold(paw, "SELECT_PAW_" + i, m_ctl.CT_TRIGGER,
                [select_s], null, select_anim_cb);
    }

    function multiselection_cb(obj, id, pulse) {
        var selected_count = 0;
        for (var i = 0; i < SELECTION_COUNT; i++)
            selected_count += m_ctl.get_sensor_value(obj, id, i);

        for (var i = 0; i < SELECTION_COUNT; i++) {
            if (selected_count > 4)
                m_mat.set_diffuse_color(paws[i], "Material", BLUE);
            else
                if (m_ctl.get_sensor_value(obj, id, i))
                    m_mat.set_diffuse_color(paws[i], "Material", RED);
                else
                    m_mat.set_diffuse_color(paws[i], "Material", DEF_COLOR);
        }
    }

    m_ctl.create_sensor_manifold(null, "SELECT_PAWS", m_ctl.CT_CHANGE,
            seletions, null, multiselection_cb);
}

});