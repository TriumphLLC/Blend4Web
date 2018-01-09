/**
 * Copyright (C) 2014-2017 Triumph LLC
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import register from "../util/register.js";

import m_anchors_fact from "../intern/anchors.js";
import m_anim_fact from "../intern/animation.js";
import m_assets_fact from "../intern/assets.js";
import m_cfg_fact from "../intern/config.js";
import m_compat_fact from "../intern/compat.js";
import m_cont_fact from "../intern/container.js";
import m_context_fact from "../intern/context.js";
import m_ctl_fact from "../intern/controls.js";
import m_data_fact from "../intern/data.js";
import m_debug_check_fact from "../intern/debug/check.js";
import m_debug_telemetry_fact from "../intern/debug/telemetry.js";
import m_ext_fact from "../intern/extensions.js";
import m_geom_fact from "../intern/geometry.js";
import m_input_fact from "../intern/input.js";
import m_hud_fact from "../intern/hud.js";
import m_nla_fact from "../intern/nla.js";
import m_main_fact from "../intern/main.js";
import m_lnodes_fact from "../intern/logic_nodes.js";
import m_obj_fact from "../intern/objects.js";
import m_phy_fact from "../intern/physics.js";
import m_print_fact from "../intern/print.js";
import m_render_fact from "../intern/renderer.js";
import m_scenes_fact from "../intern/scenes.js";
import m_sfx_fact from "../intern/sfx.js";
import m_shaders_fact from "../intern/shaders.js";
import m_textures_fact from "../intern/textures.js";
import m_time_fact from "../intern/time.js";
import m_trans_fact from "../intern/transform.js";
import * as m_util from "../intern/util.js";
import {version_str, type, date_str} from "../intern/version.js";
import m_particles_fact from "../intern/particles.js";

/**
 * Main Blend4Web module.
 * Implements methods to initialize and change the global params of the engine.
 * @module main
 * @local LoopCallback
 * @local RenderCallback
 * @local FPSCallback
 */
function Main(ns, exports) {

/**
 * Loop callback.
 * @callback LoopCallback
 * @param {number} timeline Timeline
 * @param {number} delta Delta
 */

/**
 * Rendering callback.
 * @callback RenderCallback
 * @param {number} delta Delta
 * @param {number} timeline Timeline
 */

/**
 * FPS callback
 * @callback FPSCallback
 * @param {number} fps_avg Averaged rendering FPS.
 * @param {number} phy_fps_avg Averaged physics FPS.
 */

var m_anchors   = m_anchors_fact(ns);
var m_anim      = m_anim_fact(ns);
var m_assets    = m_assets_fact(ns);
var m_cfg       = m_cfg_fact(ns);
var m_compat    = m_compat_fact(ns);
var m_cont      = m_cont_fact(ns);
var m_context   = m_context_fact(ns);
var m_ctl       = m_ctl_fact(ns);
var m_data      = m_data_fact(ns);
var m_debug_check = m_debug_check_fact(ns);
var m_debug_telemetry = m_debug_telemetry_fact(ns);
var m_ext       = m_ext_fact(ns);
var m_geom      = m_geom_fact(ns);
var m_input     = m_input_fact(ns);
var m_hud       = m_hud_fact(ns);
var m_nla       = m_nla_fact(ns);
var m_main      = m_main_fact(ns);
var m_lnodes    = m_lnodes_fact(ns)
var m_obj       = m_obj_fact(ns);
var m_phy       = m_phy_fact(ns);
var m_print     = m_print_fact(ns);
var m_render    = m_render_fact(ns);
var m_scenes    = m_scenes_fact(ns);
var m_sfx       = m_sfx_fact(ns);
var m_shaders   = m_shaders_fact(ns);
var m_textures  = m_textures_fact(ns);
var m_time      = m_time_fact(ns);
var m_trans     = m_trans_fact(ns);
var m_particles = m_particles_fact(ns);

var cfg_ctx = m_cfg.context;
var cfg_def = m_cfg.defaults;

var _last_abs_time = 0;
var _pause_time = 0;
var _resume_time = 0;
var _loop_cb = [];

var _fps_callback = function() {};
var _fps_counter = function() {};

var _render_callback = function() {};

var WEBGL_CTX_IDS = ["webgl", "experimental-webgl"];
var WEBGL2_CTX_IDS = ["webgl2", "experimental-webgl2"];

var _gl = null;

/**
 * NOTE: According to the spec, this function takes only one param
 */
var _requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame ||
         window.oRequestAnimationFrame ||
         window.msRequestAnimationFrame ||
         function(callback) {return window.setTimeout(callback,
             1000/cfg_def.max_fps);};
})();

// public enums

/**
 * Create the WebGL context and initialize the engine.
 * @method module:main.init
 * @param {HTMLCanvasElement} elem_canvas_webgl Canvas element for WebGL
 * @param {HTMLCanvasElement} [elem_canvas_hud] Canvas element for HUD
 * @returns {WebGLRenderingContext|Null} WebGL context or null
 */
exports.init = function(elem_canvas_webgl, elem_canvas_hud) {
    // NOTE: for debug purposes
    // works in chrome with --enable-memory-info --js-flags="--expose-gc"
    //window.setInterval(function() {window.gc();}, 1000);

    m_print.set_verbose(cfg_def.console_verbose);

    var ver_str = version_str() + " " + type() + " (" + date_str() + ")";
    m_print.log("%cINIT ENGINE", "color: #00a", ver_str);
    m_print.log("%cUSER AGENT:", "color: #00a", navigator.userAgent);

    // check gl context and performance.now()
    if (!window["WebGLRenderingContext"])
        return null;

    setup_clock();

    if (elem_canvas_hud) {
        m_hud.init(elem_canvas_hud);
    } else {
        // disable features which depend on HUD
        m_cfg.defaults.show_hud_debug_info = false;
        m_cfg.sfx.mix_mode = false;
    }

    m_compat.apply_context_alpha_hack();

    // allow WebGL 2 only in Chrome and Firefox
    if (!(m_compat.check_user_agent("Chrome") ||
                m_compat.check_user_agent("Firefox")))
        cfg_def.webgl2 = false;

    var gl = get_context(elem_canvas_webgl, cfg_def.webgl2);

    // fallback to WebGL 1
    if (!gl && cfg_def.webgl2) {
        cfg_def.webgl2 = false;
        gl = get_context(elem_canvas_webgl, false);
    }

    if (!gl)
        return null;

    m_print.log("%cINIT WEBGL " + (cfg_def.webgl2 ? "2" : "1"), "color: #00a");

    _gl = gl;

    init_context(elem_canvas_webgl, elem_canvas_hud, gl);
    m_cfg.apply_quality();
    m_compat.set_hardware_defaults(gl, true);

    m_cfg.set_paths();

    m_shaders.load_shaders();

    if (cfg_def.ie11_edge_touchscreen_hack)
        elem_canvas_webgl.style["touch-action"] = "none";

    m_print.log("%cSET PRECISION:", "color: #00a", cfg_def.precision);

    return gl;
}

function setup_clock() {
    if (!window.performance) {
        m_print.log("Apply performance workaround");
        window.performance = {};
    }

    var curr_time = Date.now();

    if (!window.performance.now) {
        m_print.log("Apply performance.now() workaround");

        //cfg_def.no_phy_interp_hack = true;

        window.performance.now = function() {
            return Date.now() - curr_time;
        }
    }

    m_time.set_timeline(0);
}

function get_context(canvas, init_webgl2) {

    var ctx = null;
    
    var ctx_ids = init_webgl2 ? WEBGL2_CTX_IDS : WEBGL_CTX_IDS;

    for (var i = 0; i < ctx_ids.length; i++) {
        var name = ctx_ids[i];

        try {
            ctx = canvas.getContext(name, cfg_ctx);
        } catch(e) {
            // nothing
        }

        if (ctx)
            break;
    }

    if (ctx)
        m_compat.detect_tegra_invalid_enum_issue(ctx);

    return ctx;
}

function init_context(canvas, canvas_hud, gl) {
    canvas.addEventListener("webglcontextlost",
            function(event) {
                event.preventDefault();

                m_print.error("WebGL context lost");

                // at least prevent freeze
                pause();

            }, false);

    m_ext.setup_context(gl);

    var rinfo = m_ext.get_renderer_info();
    if (rinfo)
        m_print.log("%cRENDERER INFO:", "color: #00a",
            gl.getParameter(rinfo.UNMASKED_VENDOR_WEBGL) + ", " +
            gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL));

    m_render.setup_context(gl);
    m_geom.setup_context(gl);
    m_textures.setup_context(gl);
    m_shaders.setup_context(gl);
    m_cont.setup_context(gl);
    m_context.setup(gl);
    m_debug_check.setup_context(gl);
    m_data.setup_canvas(canvas);
    m_cont.init(canvas, canvas_hud);

    m_scenes.setup_dim(canvas.width, canvas.height, 1);

    m_sfx.init();

    m_input.init();

    _fps_counter = init_fps_counter();

    loop();
}

/**
 * Set the callback for the FPS counter
 * @method module:main.set_fps_callback
 * @param {FPSCallback} fps_cb FPS callback
 */
exports.set_fps_callback = function(fps_cb) {
    _fps_callback = fps_cb;
}
/**
 * Remove the callback for the FPS counter
 * @method module:main.clear_fps_callback
 */
exports.clear_fps_callback = function() {
    _fps_callback = function() {};
}


/**
 * Set the rendering callback which is executed for every frame just before the
 * rendering. Only one callback is allowed.
 * @method module:main.set_render_callback
 * @param {RenderCallback} callback Render callback
 */
exports.set_render_callback = function(callback) {
    set_render_callback(callback);
}
function set_render_callback(callback) {
    _render_callback = callback;
}

/**
 * Remove the rendering callback.
 * @method module:main.clear_render_callback
 */
exports.clear_render_callback = function() {
    clear_render_callback();
}
function clear_render_callback() {
    _render_callback = function() {};
}

exports.pause = pause;
/**
 * Pause the engine
 * @method module:main.pause
 */
function pause() {
    if (is_paused())
        return;

    _pause_time = performance.now() / 1000;
    m_sfx.pause();
    m_phy.pause();
    m_textures.pause();
    m_anchors.pause();
}

/**
 * Resume the engine (after pausing)
 * @method module:main.resume
 */
exports.resume = function() {
    if (!is_paused())
        return;

    _resume_time = performance.now() / 1000;
    m_sfx.resume();
    m_phy.resume();
    m_textures.play(true);
    m_anchors.resume();
}

/**
 * Check if the engine is paused
 * @method module:main.is_paused
 * @returns {boolean} Paused flag
 */
exports.is_paused = is_paused;
function is_paused() {
    return (_resume_time < _pause_time);
}

function loop() {
    var vr_display = cfg_def.stereo === "HMD" && m_input.get_webvr_display();
    if (vr_display)
        vr_display.requestAnimationFrame(loop);
    else
        _requestAnimFrame(loop);

    // float sec
    var abstime = performance.now() / 1000;

    if (!_last_abs_time)
        _last_abs_time = abstime;

    var delta = abstime - _last_abs_time;

    // do not render short frames
    if (delta < 1/cfg_def.max_fps)
        return;

    var timeline = m_time.get_timeline();

    for (var i = 0; i < _loop_cb.length; i++)
        _loop_cb[i](timeline, delta);

    if (!is_paused()) {
        // correct delta if resume occured since last frame
        if (_resume_time > _last_abs_time)
            delta -= (_resume_time - Math.max(_pause_time, _last_abs_time));

        m_time.set_delta(delta);

        timeline += delta;
        m_time.set_timeline(timeline);

        m_debug_telemetry.update();

        m_assets.update();
        m_data.update();
        frame(timeline, delta);

        _fps_counter(delta);
    }

    _last_abs_time = abstime;

    if (vr_display && vr_display.isPresenting)
        vr_display.submitFrame();
}

function frame(timeline, delta) {
    // possible unload between frames
    if (!m_data.is_primary_loaded())
        return;

    m_hud.reset();

    m_trans.update(delta);

    m_lnodes.update(timeline, delta)

    m_nla.update(timeline, delta);

    // sound
    m_sfx.update(timeline, delta);

    // animation
    if (delta)
        m_anim.update(delta);

    // possible unload in animation callbacks
    if (!m_data.is_primary_loaded())
        return;

    m_phy.update(timeline, delta);

    // possible unload in physics callbacks
    if (!m_data.is_primary_loaded())
        return;

    //inputs should be updated before controls
    m_input.update(timeline);
    // controls
    m_ctl.update(timeline, delta);

    // possible unload in controls callbacks
    if (!m_data.is_primary_loaded())
        return;

    // anchors
    m_anchors.update(false);

    // objects
    m_obj.update(timeline, delta);

    // particles
    m_particles.update();

    // user callback
    _render_callback(delta, timeline);

    // possible unload in render callback
    if (!m_data.is_primary_loaded())
        return;

    // rendering
    m_scenes.update(timeline, delta);

    // anchors
    m_anchors.update_visibility();

    m_main.frame();
}

function init_fps_counter() {
    var fps_avg = 60;       // decent default value

    var fps_frame_counter = 0;
    var interval = cfg_def.fps_measurement_interval;
    var interval_cb = cfg_def.fps_callback_interval;

    var fps_counter = function(delta) {
        // NOTE: fixes issues when delta=0
        if (delta < 1/cfg_def.max_fps)
            return;

        fps_avg = m_util.smooth(1/delta, fps_avg, delta, interval);

        // stays zero for disabled physics/FPS calculation
        var phy_fps_avg = m_phy.get_fps();

        fps_frame_counter = (fps_frame_counter + 1) % interval_cb;
        if (fps_frame_counter == 0) {
            _fps_callback(Math.round(fps_avg), phy_fps_avg);
        }
    }

    return fps_counter;
}

/**
 * Reset the engine.
 * Unloads the scene and releases the engine's resources.
 * @method module:main.reset
 */
exports.reset = function() {
    m_data.unload(0);

    m_context.reset();
    m_data.reset();
    m_ext.reset();
    m_render.reset();
    m_geom.reset();
    m_textures.reset_mod();
    m_shaders.reset();
    m_debug_check.reset();
    m_cont.reset();
    m_data.reset();
    m_cont.reset();
    m_time.reset();
    m_sfx.reset();

    _last_abs_time = 0;

    _pause_time = 0;
    _resume_time = 0;

    _fps_callback = function() {};
    _fps_counter = function() {};

    _render_callback = function() {};

    _loop_cb.length = 0;

    _gl = null;
}

/**
 * Register one-time callback to return DataURL of rendered canvas element.
 * @param {BlobURLCallback} callback BlobURL callback.
 * @param {string} [format="image/png"] The image format ("image/png", "image/jpeg",
 * "image/webp" and so on).
 * @param {number} [quality=1.0] Number between 0 and 1 for types: "image/jpeg",
 * "image/webp".
 * @param {boolean} [auto_revoke=true] Automatically revoke blob object.
 * If auto_revoke is false then application must revoke blob URL via the following call {@link https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL| URL.revokeObjectURL(blobURL)}.
 */
exports.canvas_data_url = function(callback, format, quality, auto_revoke) {
    m_main.canvas_data_url(callback, format, quality, auto_revoke);
}

/**
 * Check using device.
 * @method module:main.detect_mobile
 * @returns {boolean} Checking result.
 */
exports.detect_mobile = function() {
    return m_compat.detect_mobile();
}
/**
 * Append a callback to be executed every frame
 * (even if the rendering is paused). Its purpose is to perform actions 
 * non-related to the actual rendering, e.g html/css manipulation.
 * This method allows registration of multiple callbacks.
 * @method module:main.append_loop_cb
 * @param {LoopCallback} callback Callback
 */
exports.append_loop_cb = function(callback) {
    for (var i = 0; i < _loop_cb.length; i++)
        if (_loop_cb[i] == callback)
            return;
    _loop_cb.push(callback);
}
/**
 * Remove loop callback.
 * @method module:main.remove_loop_cb
 * @param {LoopCallback} callback Callback
 */
exports.remove_loop_cb = function(callback) {
    for (var i = 0; i < _loop_cb.length; i++)
        if (_loop_cb[i] == callback) {
            _loop_cb.splice(i, 1);
            break;
        }
}

/**
 * Return renderer info.
 * @method module:main.get_renderer_info
 * @returns {RendererInfo|Null} Renderer info.
 */
exports.get_renderer_info = function() {
    var rinfo = m_ext.get_renderer_info();

    if (!rinfo)
        return null;

    var vendor = _gl.getParameter(rinfo.UNMASKED_VENDOR_WEBGL);
    var renderer = _gl.getParameter(rinfo.UNMASKED_RENDERER_WEBGL);

    return {"vendor": vendor, "renderer": renderer};
}

}

var main_factory = register("main", Main);

export default main_factory;
