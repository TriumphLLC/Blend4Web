"use strict";

b4w.register("embed_main", function(exports, require) {

var m_cfg       = require("config");

var DEBUG_DEMO_PATH = "../../external/deploy/assets/dev/apple_one.json";
var BUILT_IN_SCRIPTS_ID = "built_in_scripts";


exports.init = function() {
    m_cfg.set("quality", m_cfg.P_HIGH);
    m_cfg.set("background_color", [0.224, 0.224, 0.224, 1.0]);

    var is_debug = (b4w.version.type() == "DEBUG");
    b4w.app.init({
        canvas_container_id: "main_canvas_container", 
        callback: init_cb,
        gl_debug: is_debug,
        physics_enabled: false,
        show_fps: false,
        console_verbose: is_debug,
        alpha: false
    });
}

function init_cb(canvas_element, success) {

    if (window.parent != window)
        handle_iframe_scrolling(window, window.parent);

    if (!success) {
        console.log("b4w init failure");
        return;
    }

    // search source file
    var file = DEBUG_DEMO_PATH;
    if (b4w.version.type() !== "DEBUG") {
        var module_name = m_cfg.get("built_in_module_name");
        if (b4w.module_check(module_name)) {
            var bd = require(module_name);
            var file = bd["data"]["main_file"];
            remove_built_in_scripts();
        }
    }

    // load
    b4w.data.load(file, loaded_callback, preloader_callback, false);
    b4w.app.enable_controls(canvas_element);

    window.onresize = on_resize;
    on_resize();
}

/**
 * Disable parent window scrolling if cursor is inside <iframe>
 */
function handle_iframe_scrolling(win, win_par) {

    try {
        var scroll_x = win_par.scrollX;
        var scroll_y = win_par.scrollY;

        var inside = false;

        win.onmouseover = function() {
            inside = true;
            scroll_x = win_par.scrollX;
            scroll_y = win_par.scrollY;
        };

        win.onmouseout = function() {
            inside = false;
        };

        win_par.onscroll = function(e) {
            if (inside)
                win_par.scroll(scroll_x, scroll_y);
        }
    } catch(e) {
        console.warn("Cross-origin iframe detected, disabling scroll-lock feature");
    }
}

function on_resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    b4w.main.resize(w, h);
}

function loaded_callback(root) {
    b4w.app.enable_camera_controls();
    b4w.set_render_callback(render_callback);
}

function preloader_callback(percentage, load_time) {
    //var lp_elem = document.getElementById("loading_progress");
    //lp_elem.innerHTML = percentage + "% (" + 
    //    Math.round(10 * load_time / 1000)/10 + "s)";
}

function render_callback(elapsed, current_time) {}

function remove_built_in_scripts() {
    var scripts = document.getElementById(BUILT_IN_SCRIPTS_ID);
    scripts.parentElement.removeChild(scripts);
}

function pause_clicked() {
    b4w.pause();
}

function resume_clicked() {
    b4w.resume();
}

});

b4w.require("embed_main").init();
