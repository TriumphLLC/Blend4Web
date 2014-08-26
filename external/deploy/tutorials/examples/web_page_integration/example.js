"use strict";

b4w.register("example_main", function(exports, require) {

var m_anim   = require("animation");
var m_app    = require("app");
var m_data   = require("data");
var m_main   = require("main");
var m_scs    = require("scenes");

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas_cont",
        callback: init_cb,
        physics_enabled: false,
        alpha: true,
        deferred_rendering: false,
        context_antialias: true,
        report_init_failure: false
    });
}

function init_cb(canvas_elem, success) {
    if (!success) {
        console.log("b4w init failure");
        return;
    }

    var window_width = window.innerWidth / window.devicePixelRatio;

    if (window_width < 480) {
        m_main.resize(window.innerWidth, window.innerWidth * 0.8);
        canvas_cont.style.height = window.innerWidth * 0.8 + 'px';
        canvas_cont.style.marginTop = -window.innerWidth * 0.8 + 'px';
        canvas_cont.style.marginLeft = '-10px';
    } else if (window_width < 1200)
        m_main.resize(1000, 1000);
    else
        m_main.resize(1200, 1200);

    m_data.load("/tutorials/examples/web_page_integration/flying_letters.json", load_cb);
}

function load_cb(root) {
    var letters_obj = m_scs.get_object_by_name('beads');
    m_anim.stop(letters_obj);

    run_button.addEventListener("mousedown", demo_link_click, false);
}

function demo_link_click(e) {
    var letters_obj = m_scs.get_object_by_name('beads');

    m_anim.apply(letters_obj, "flying_letters");
    m_anim.play(letters_obj, letters_obj_cb);
}

function letters_obj_cb(obj) {
    m_anim.apply(obj, "flying_letters_idle");
    m_anim.set_behavior(obj, m_anim.AB_CYCLIC);
    m_anim.play(obj);
}

});

b4w.require("example_main").init();
