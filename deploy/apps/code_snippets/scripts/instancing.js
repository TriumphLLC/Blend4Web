"use strict"

b4w.register("instancing", function(exports, require) {

var m_app     = require("app");
var m_data    = require("data");
var m_scs     = require("scenes");
var m_obj     = require("objects");
var m_trans   = require("transform");
var m_cfg     = require("config");
var m_version = require("version");

var DEBUG = (m_version.type() === "DEBUG");

var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/instancing";
var NUM_OF_POINTS = 10;
var POS = 10;

var _monkeys_num = 0;

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
    m_data.load(APP_ASSETS_PATH + "/instancing.json", load_cb);
}

function load_cb(data_id) {
    m_app.enable_camera_controls();
    draw_line(-POS, -POS, -POS, POS, -POS, -POS);
    draw_line(-POS, -POS, -POS, -POS, POS, -POS);
    draw_line(POS, -POS, -POS, POS, POS, -POS);
    draw_line(-POS, POS, -POS, POS, POS, -POS);

    draw_line(-POS, -POS, POS, POS, -POS, POS);
    draw_line(-POS, -POS, POS, -POS, POS, POS);
    draw_line(POS, -POS, POS, POS, POS, POS);
    draw_line(-POS, POS, POS, POS, POS, POS);

    draw_line(-POS, -POS, -POS, -POS, -POS, POS);
    draw_line(-POS, POS, -POS, -POS, POS, POS);
    draw_line(POS, -POS, -POS, POS, -POS, POS);
    draw_line(POS, POS, -POS, POS, POS, POS);
}

function draw_line(start_x, start_y, start_z, end_x, end_y, end_z) {
    var src_obj = m_scs.get_object_by_name("Suzanne");
    var k_x = (end_x - start_x) / (NUM_OF_POINTS - 1);
    var k_y = (end_y - start_y) / (NUM_OF_POINTS - 1);
    var k_z = (end_z - start_z) / (NUM_OF_POINTS - 1);
    for (var i = 0; i < NUM_OF_POINTS; i++) {
        var monkey = m_obj.copy(src_obj, "Suzanne_" + _monkeys_num.toString(), false);
        _monkeys_num++;
        m_scs.append_object(monkey);
        var x = start_x + k_x * i;
        var y = start_y + k_y * i;
        var z = start_z + k_z * i;
        m_trans.set_translation(monkey, x, z, y);
    }
}



});

