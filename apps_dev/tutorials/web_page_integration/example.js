"use strict";

b4w.register("example_main", function(exports, require) {

var m_anim     = require("animation");
var m_app      = require("app");
var m_cfg      = require("config");
var m_cont     = require("container");
var m_data     = require("data");
var m_scs      = require("scenes");
var m_sfx      = require("sfx");
var m_version  = require("version");

var DEBUG = (m_version.type() === "DEBUG");

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas_cont",
        callback: init_cb,
        physics_enabled: false,
        alpha: true,
        assets_dds_available: !DEBUG,
        assets_min50_available: !DEBUG,
        report_init_failure: false,
        media_auto_activation: false
    });
}

function init_cb(canvas_elem, success) {
    if (!success) {
        console.log("b4w init failure");
        return;
    }

    // TODO: need refactoring
    if (window["web_page_integration_dry_run"])
        var load_path = m_cfg.get_std_assets_path() +
                "tutorials/web_page_integration/flying_letters.json";
    else
        var load_path = "/assets/tutorials/web_page_integration/flying_letters.json";

    m_data.load(load_path, load_cb);

    resize();

    window.addEventListener("resize", resize);
}

function resize() {
    m_cont.resize_to_container();
}

function load_cb(root) {
    var letters_arm = m_scs.get_object_by_name('beads_armature');
    var run_button = document.getElementById("run_button");

    m_anim.stop(letters_arm);

    run_button.addEventListener("mousedown", demo_link_click, false);
}

function demo_link_click(e) {
    m_data.activate_media();
    var letters_arm = m_scs.get_object_by_name('beads_armature');
    var spk = m_scs.get_object_by_name("Speaker");

    m_sfx.play_def(spk);
    m_anim.apply(letters_arm, "flying_letters");
    m_anim.play(letters_arm, letters_obj_cb);
}

function letters_obj_cb(obj) {
    m_anim.apply(obj, "flying_letters_idle");
    m_anim.set_behavior(obj, m_anim.AB_CYCLIC);
    m_anim.play(obj);
}

});

b4w.require("example_main").init();
