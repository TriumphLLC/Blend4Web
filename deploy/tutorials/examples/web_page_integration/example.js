"use strict";

b4w.register("example_main", function(exports, require) {

var m_anim   = require("animation");
var m_app    = require("app");
var m_data   = require("data");
var m_main   = require("main");
var m_scs    = require("scenes");
var m_sfx    = require("sfx");

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas_cont",
        callback: init_cb,
        physics_enabled: false,
        alpha: true,
        report_init_failure: false
    });
}

function init_cb(canvas_elem, success) {
    if (!success) {
        console.log("b4w init failure");
        return;
    }

    if (window.web_page_integration_dry_run)
        m_data.load("flying_letters.json", load_cb);
    else
        m_data.load("/tutorials/examples/web_page_integration/flying_letters.json", load_cb);

    resize();

    window.addEventListener("resize", resize);
}

function resize() {
    m_app.resize_to_container();
}

function load_cb(root) {
    var letters_arm = m_scs.get_object_by_name('beads_armature');

    m_anim.stop(letters_arm);

    run_button.addEventListener("mousedown", demo_link_click, false);
}

function demo_link_click(e) {
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
