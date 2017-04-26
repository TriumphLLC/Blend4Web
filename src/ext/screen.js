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
"use strict";

/**
 * Screen API
 * The API is used to manage content on the screen: fullscreen, HMD, HUD.
 * @module screen
 */
b4w.module["screen"] = function(exports, require) {

var m_cam   = require("__camera");
var m_cont  = require("__container");
var m_cfg   = require("__config");
var m_hud   = require("__hud");
var m_input = require("__input");
var m_main  = require("__main");
var m_obj_util = require("__obj_util");
var m_print = require("__print");
var m_scs   = require("__scenes");
var m_vec4  = require("__vec4");

var _vec4_tmp = m_vec4.create();
var _vec4_tmp2 = m_vec4.create();

var _splited_screen = false;

var _exit_cb = function() {};
var _vr_present_change_cb = function() {};

var cfg_dbg = m_cfg.debug_subs;

// TODO: fix API doc of draw_mixer_strip function. Add information about id,
// is_active, slot, params, active_param, mute, solo params.

/**
 * Draw the mixer strip.
 * Used by mixer addon.
 * @method module:screen.draw_mixer_strip
 */
exports.draw_mixer_strip = m_hud.draw_mixer_strip;

/**
 * Plot the array.
 * @method module:screen.plot_array
 * @param {string} header Plot header
 * @param {number} slot Slot number
 * @param {Float32Array} arr Array
 * @param {number} arg_min Minimum plot argument value
 * @param {number} arg_max Maximum plot argument value
 * @param {number} val_min Minimum plot value
 * @param {number} val_max Maximum plot value
 */
exports.plot_array = m_hud.plot_array;

exports.request_fullscreen = request_fullscreen;
/**
 * Request fullscreen mode, i.e. presenting element entire to a screen.
 * It is better to use
 * {@link module:screen.request_fullscreen_hmd|request_fullscreen_hmd} for
 * presenting VR content on head-mounted display.
 * Security issues: execute by user event.
 * @method module:screen.request_fullscreen
 * @param {HTMLElement} [elem=Canvas container element] HTML element.
 * @param {FullscreenEnabledCallback} [enabled_cb] Enabled callback.
 * @param {FullscreenDisabledCallback} [disabled_cb] Disabled callback.
 */
function request_fullscreen(elem, enabled_cb, disabled_cb) {
    elem = elem || m_cont.get_container();
    enabled_cb = enabled_cb || function() {};
    disabled_cb = disabled_cb || function() {};

    function on_fullscreen_change() {
        if (document.fullscreenElement === elem ||
                document.webkitFullscreenElement === elem ||
                document.mozFullScreenElement === elem ||
                document.webkitIsFullScreen ||
                document.msFullscreenElement === elem) {
            //m_print.log("Fullscreen enabled");
            enabled_cb();
        } else {
            document.removeEventListener("fullscreenchange",
                    on_fullscreen_change, false);
            document.removeEventListener("webkitfullscreenchange",
                    on_fullscreen_change, false);
            document.removeEventListener("mozfullscreenchange",
                    on_fullscreen_change, false);
            document.removeEventListener("MSFullscreenChange",
                    on_fullscreen_change, false);
            //m_print.log("Fullscreen disabled");
            disabled_cb();
        }
    }

    document.addEventListener("fullscreenchange", on_fullscreen_change, false);
    document.addEventListener("webkitfullscreenchange", on_fullscreen_change, false);
    document.addEventListener("mozfullscreenchange", on_fullscreen_change, false);
    document.addEventListener("MSFullscreenChange", on_fullscreen_change, false);

    elem.requestFullScreen = elem.requestFullScreen ||
            elem.webkitRequestFullScreen || elem.mozRequestFullScreen
            || elem.msRequestFullscreen;
    if (elem.requestFullScreen)
        elem.requestFullScreen();
    else
        m_print.error("B4W App: request fullscreen method is not supported");
}

exports.exit_fullscreen = exit_fullscreen;
/**
 * Exit fullscreen mode.
 * @method module:screen.exit_fullscreen
 */
function exit_fullscreen() {

    var exit_fs = document.exitFullscreen || document.webkitExitFullscreen ||
            document.mozCancelFullScreen || document.msExitFullscreen;

    if (typeof exit_fs != "function")
        m_print.error("B4W App: exit fullscreen method is not supported");

    exit_fs.apply(document);
}

/**
 * Check whether fullscreen mode is available.
 * @method module:screen.check_fullscreen
 * @returns {boolean} Result of the check.
 */
exports.check_fullscreen = m_input.check_fullscreen;

/**
 * Request HMD fullscreen mode. Use the function for represent VR content
 * on a head-mounted display.
 * The function requires using of a browser supporting WebVR API
 * or a mobile browser supporting Fullscreen API.
 * Security issues: execute by user event.
 * @method module:screen.request_fullscreen_hmd
 * @param {HTMLElement} [element=Canvas container element] HTML element.
 * @param {GenericCallback} [enabled_cb] The callback will be called right
 * after switching HMD fullscreen mode on.
 * @param {GenericCallback} [disabled_cb] The callback will be called right
 * after switching HMD fullscreen mode off.
 * @example
 * var m_input = require("input");
 * var m_screen = require("screen");
 * m_input.add_click_listener(document.body, function() {
 *     m_screen.request_fullscreen_hmd();
 * });
 */
exports.request_fullscreen_hmd = function(element, enabled_cb, disabled_cb) {
    if (!m_cfg.get("stereo") == "HMD" &&
            !(m_cfg.get("stereo") == "NONE" && m_cfg.get("is_mobile_device")))
        return;

    var hmd_device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
    if (hmd_device &&
            m_input.get_value_param(hmd_device, m_input.HMD_WEBVR_TYPE) & m_input.HMD_WEBVR1) {
        var webvr_display = hmd_device.webvr_display;
        if (webvr_display && !webvr_display.isPresenting) {

            enabled_cb = enabled_cb || function() {};
            disabled_cb = disabled_cb || function() {};

            _vr_present_change_cb = function() {
                if (webvr_display.isPresenting)
                    enabled_cb();
                else {
                    window.removeEventListener('vrdisplaypresentchange', _vr_present_change_cb);
                    disabled_cb();
                }
            }
            window.addEventListener('vrdisplaypresentchange', _vr_present_change_cb, false);

            var capabilities = webvr_display.capabilities;
            if (!capabilities.canPresent)
                m_print.error("HMD fullscreen request failed.");
            else {
                var canvas = m_cont.get_canvas();
                webvr_display.requestPresent([{source: canvas}]).then(function () {
                    // TODO: add some logic
                }, function () {
                    m_print.error("HMD fullscreen request failed.");
                });
            }
        }
    } else
        request_fullscreen(element, enabled_cb, disabled_cb);

}

/**
 * Exit HMD fullscreen mode.
 * @method module:screen.exit_fullscreen_hmd
 */
exports.exit_fullscreen_hmd = function() {
    if (!m_cfg.get("stereo") == "HMD" &&
            !(m_cfg.get("stereo") == "NONE" && m_cfg.get("is_mobile_device")))
        return;

    var hmd_device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
    if (hmd_device &&
            m_input.get_value_param(hmd_device, m_input.HMD_WEBVR_TYPE) & m_input.HMD_WEBVR1) {
        var webvr_display = hmd_device.webvr_display;
        if (webvr_display && webvr_display.isPresenting) {
            webvr_display.exitPresent();
            m_cont.resize_to_container(true);
        }
    } else
        exit_fullscreen();
}

/**
 * Check whether HMD fullscreen mode is available.
 * @method module:screen.check_fullscreen_hmd
 * @returns {boolean} The result of the checking.
 */
exports.check_fullscreen_hmd = function() {
    var hmd_device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
    var is_webvr_1 = m_input.get_value_param(hmd_device, m_input.HMD_WEBVR_TYPE) & m_input.HMD_WEBVR1;
    if (hmd_device &&
            (is_webvr_1 && hmd_device.webvr_display || !is_webvr_1 && m_input.check_fullscreen()))
        return true;
    return false;
}

exports.request_split_screen = request_split_screen;
/**
 * Request "split screen" mode, which represent rendering two eyes suitable
 * for head-mounted displays.
 * The function requires setting the "stereo" config to "HMD"
 * {see @link module:config}, using a browser supporting WebVR API
 * or a mobile browser.
 * @method module:screen.request_split_screen
 * @param {GenericCallback} [enter_cb] The callback will be called right
 * after turning split screen mode on.
 * @param {GenericCallback} [exit_cb] The callback will be called right
 * after turning split screen mode off.
 * @example
 * var m_app = require("app");
 * var m_screen = require("screen");
 * exports.init = function() {
 *     m_app.init({
 *         // . . .
 *         stereo: "HMD"
 *    });
 * }
 *
 * m_screen.request_split_screen();
 */
function request_split_screen(enter_cb, exit_cb) {
    var hmd_device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
    if (!hmd_device)
        return false;

    if (_splited_screen)
        return true;

    // _exit_cb will be called in the exit_split_screen function.
    _exit_cb = exit_cb;

    if (m_scs.check_active()) {
         var camobj = m_scs.get_camera(m_scs.get_active());
         if (!camobj)
             return;
    } else
        return;

    if (hmd_device.registered) {
        enable_split_screen(camobj);

        if (enter_cb)
            enter_cb();
    } else {
        m_input.request_register_device(hmd_device);
        hmd_device.registered_cb = function() {
            enable_split_screen(camobj);

            if (enter_cb)
                enter_cb();
        }
    }
}

function enable_split_screen(camobj) {
    var hmd_device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
    if (!hmd_device)
        return false;

    if (_splited_screen)
        return true;

    var hmd_type = m_input.get_value_param(hmd_device, m_input.HMD_WEBVR_TYPE);
    if (hmd_type & m_input.HMD_WEBVR1_1) {
        var webvr_display = hmd_device.webvr_display;
        // TODO: check code below
        // There was strange behavior Samsung Internet on GearVR
        var left_eye = webvr_display.getEyeParameters("left");
        var right_eye = webvr_display.getEyeParameters("right");

        m_cont.resize(
                Math.max(left_eye.renderWidth, right_eye.renderWidth) * 2,
                Math.max(left_eye.renderHeight, right_eye.renderHeight), false);

        // TODO: uncomment until fieldOfView is not in WebVR 1.*
        // var hmd_left_proj_mat = m_input.get_vector_param(hmd_device,
        //         m_input.HMD_PROJ_LEFT, _mat4_tmp);
        // var hmd_right_proj_mat = m_input.get_vector_param(hmd_device,
        //         m_input.HMD_PROJ_RIGHT, _mat4_tmp2);
        // m_cam.set_hmd_proj_mat(camobj, hmd_left_proj_mat, hmd_right_proj_mat);
    } else {
        // non-WebVR, pre-WebVR 1.1
        // TODO: remove magic numbers
        var canvas = m_cont.get_canvas();
        var actual_width = Math.max(2 * canvas.height, canvas.width);
        var actual_height = actual_width / 2;
        m_cont.resize(actual_width, actual_height, false);
    }

    // TODO: remove HMD FOV
    // HMD FOV deprecated. Use projection matrixes instead.
    var hmd_left_fov = m_input.get_vector_param(hmd_device,
            m_input.HMD_FOV_LEFT, _vec4_tmp);
    var hmd_right_fov = m_input.get_vector_param(hmd_device,
            m_input.HMD_FOV_RIGHT, _vec4_tmp2);
    m_cam.set_hmd_fov(camobj, hmd_left_fov, hmd_right_fov,
            !Boolean(hmd_type & m_input.HMD_WEBVR1_1));

    var hmd_params = {};
    hmd_params.base_line_factor = 0.5;
    hmd_params.inter_lens_factor = 0.5;
    hmd_params.enable_hmd_stereo = true;
    if (hmd_type & (m_input.HMD_NON_WEBVR | m_input.HMD_WEBVR_MOBILE |
            m_input.HMD_WEBVR_DESKTOP)) {
        hmd_params.distortion_coefs = [
            hmd_device.distortion_coefs[0],
            hmd_device.distortion_coefs[1]
        ];
        hmd_params.chromatic_aberration_coefs = [
            hmd_device.chromatic_aberration_coefs[0],
            hmd_device.chromatic_aberration_coefs[1],
            hmd_device.chromatic_aberration_coefs[2],
            hmd_device.chromatic_aberration_coefs[3]
        ];
        if (!hmd_device.webvr_hmd_device)
            if (hmd_device.base_line_dist && hmd_device.height_dist && hmd_device.bevel_size)
                hmd_params.base_line_factor = (hmd_device.base_line_dist - hmd_device.bevel_size) /
                        hmd_device.height_dist;
            else if (!hmd_device.bevel_size)
                hmd_params.base_line_factor = hmd_device.base_line_dist / hmd_device.height_dist;
        if (hmd_device.inter_lens_dist && hmd_device.width_dist && !hmd_device.webvr_hmd_device)
            hmd_params.inter_lens_factor = hmd_device.inter_lens_dist /
                    hmd_device.width_dist;
    }

    // NOTE: prevent crash in case of difference of slink's dimensions.
    // For example: "debug" slink ~ 0.5 X 1.0,
    //              "origin" slink ~ distortion_scale * 0.5 X distortion_scale * 1.0
    if (!cfg_dbg.enabled)
        m_scs.multiply_size_mult(0.5, 1.0);
    m_scs.set_hmd_params(hmd_params);

    var eye_distance = m_input.get_value_param(hmd_device, m_input.HMD_EYE_DISTANCE);
    if (eye_distance) {
        var active_scene = m_scs.get_active();
        var cam_scene_data = m_obj_util.get_scene_data(camobj, active_scene);
        var cameras = cam_scene_data.cameras;
        m_cam.set_eye_distance(cameras, eye_distance);
    }

    m_scs.render_both_eyes();

    // m_input.reset_device(hmd_device);

    _splited_screen = true;
    return true;
}

/**
 * Exit "split screen" mode.
 * @method module:screen.exit_split_screen
 * @returns {boolean} "Split screen" mode is disabled.
 */
exports.exit_split_screen = function() {
    var hmd_device = m_input.get_device_by_type_element(m_input.DEVICE_HMD)
    if (!_splited_screen || !hmd_device || !hmd_device.registered)
        return false;

    // set up non-vr mode
    var hmd_params = {};
    hmd_params.enable_hmd_stereo = false;
    m_scs.set_hmd_params(hmd_params);

    _splited_screen = false;

    if (_exit_cb)
        _exit_cb();

    m_scs.render_one_eye();

    if (!cfg_dbg.enabled)
        m_scs.multiply_size_mult(2.0, 1.0);

    // resize screen to canvas resolution (non-vr mode)
    m_cont.resize_to_container(true);
    return true;
}

/**
 * Take a screenshot and download as screenshot.png image.
 * @method module:screen.shot
 * @param {string} [format="image/png"] The MIME image format ("image/png",
 * "image/jpeg", "image/webp" and so on)
 * @param {number} [quality=1.0] Number between 0 and 1 for types: "image/jpeg",
 * "image/webp"
 * @example
 * var m_screen = require("screen");
 * m_screen.shot();
 */
exports.shot = function(format, quality) {
    format = format || "image/png";
    quality = quality || 1.0;

    var cb = function(url) {
        var a = window.document.createElement("a");
        document.body.appendChild(a);
        a.style.display = "none";
        a.href = url;
        a.download = "screenshot." + format.split("/")[1];
        a.click();

        document.body.removeChild(a);
    }

    m_main.canvas_data_url(cb, format, quality, true);
}

}
