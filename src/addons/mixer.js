/**
 * Copyright (C) 2014-2016 Triumph LLC
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
 * Audio mixer add-on.
 * Implements volume faders, positional params, parametric equalizers per
 * channel and volume fader and compressor to the master section.
 * @module mixer
 */
b4w.module["mixer"] = function(exports, require) {

var m_ctl    = require("controls");
var m_hud    = require("hud");
var m_scenes = require("scenes");
var m_sfx    = require("sfx");
var m_util   = require("util");

var TIMER_SLOW_PERIOD = 0.15;
var TIMER_FAST_PERIOD = 0.05;

var MIXER_CONTROLS_MANIFOLD = ["SWITCH_STRIP", "SWITCH_STRIP_HOLD",
        "SWITCH_PARAM", "INC_DEC", "INC_DEC_HOLD", "MUTE_SOLO"];

var _mixer_strips = [];
var _active_strip = 0;

var _filter_freq_arr = null;
var _filter_mag_arr = null;
var _filter_phase_arr = null;

/**
 * Enable mixer controls.
 */
exports.enable_mixer_controls = function() {
    init();

    // switch mixer strip
    var key_num_left = m_ctl.create_keyboard_sensor(m_ctl.KEY_NUM4);
    var key_num_right = m_ctl.create_keyboard_sensor(m_ctl.KEY_NUM6);

    // switch mixer param
    var key_num_up = m_ctl.create_keyboard_sensor(m_ctl.KEY_NUM8);
    var key_num_down = m_ctl.create_keyboard_sensor(m_ctl.KEY_NUM2);

    // change mixer param value
    var key_num_add = m_ctl.create_keyboard_sensor(m_ctl.KEY_ADD);
    var key_num_sub = m_ctl.create_keyboard_sensor(m_ctl.KEY_SUB);

    // mute-solo
    var key_num_home = m_ctl.create_keyboard_sensor(m_ctl.KEY_NUM7);
    var key_num_pgup = m_ctl.create_keyboard_sensor(m_ctl.KEY_NUM9);

    var timer_slow = m_ctl.create_timer_sensor(TIMER_SLOW_PERIOD, true);
    var timer_fast = m_ctl.create_timer_sensor(TIMER_FAST_PERIOD, true);

    var switch_strip_keys = [key_num_left, key_num_right, timer_slow];

    var switch_strip_logic = function(s) {
        return (s[0] || s[1]);
    }
    var switch_strip_logic_hold = function(s) {
        return ((s[0] || s[1]) && s[2]);
    }

    var switch_spk_cb = function(obj, id, pulse) {
        if (pulse == 1) {
            var dir = Boolean(m_ctl.get_sensor_value(obj, id, 0)) ? -1 : 1;
            switch_strip(dir);
            if (id == "SWITCH_STRIP")
                m_ctl.reset_timer_sensor(obj, id, 2, TIMER_SLOW_PERIOD + 0.3);
            else
                m_ctl.reset_timer_sensor(obj, id, 2, TIMER_SLOW_PERIOD);
        } else {
            // hold on some time
            m_ctl.reset_timer_sensor(obj, id, 2, 10);
        }
    }
    m_ctl.create_sensor_manifold(null, "SWITCH_STRIP", m_ctl.CT_TRIGGER, 
            switch_strip_keys, switch_strip_logic, switch_spk_cb);
    m_ctl.create_sensor_manifold(null, "SWITCH_STRIP_HOLD", m_ctl.CT_SHOT, 
            switch_strip_keys, switch_strip_logic_hold, switch_spk_cb);

    var switch_param_keys = [key_num_up, key_num_down];
    var switch_param_logic = function(s) {
        return (s[0] || s[1]);
    }
    var switch_param_cb = function(obj, id, pulse) {
        var dir = Boolean(m_ctl.get_sensor_value(obj, id, 0)) ? -1 : 1;
        switch_param(dir);
    }
    m_ctl.create_sensor_manifold(null, "SWITCH_PARAM", m_ctl.CT_SHOT, 
            switch_param_keys, switch_param_logic, switch_param_cb);

    var inc_dec_keys = [key_num_sub, key_num_add, timer_fast];

    var inc_dec_cb = function(obj, id, pulse) {

        if (pulse == 1) {
            var dir = Boolean(m_ctl.get_sensor_value(obj, id, 0)) ? -1 : 1;
            param_inc_dec(dir);

            if (id == "INC_DEC")
                m_ctl.reset_timer_sensor(obj, id, 2, TIMER_FAST_PERIOD + 0.3);
            else
                m_ctl.reset_timer_sensor(obj, id, 2, TIMER_FAST_PERIOD);
        } else {
            // hold on some time
            m_ctl.reset_timer_sensor(obj, id, 2, 10);
        }
    }
    var inc_dec_logic = function(s) {
        return (s[0] || s[1]);
    }
    var inc_dec_logic_hold = function(s) {
        return ((s[0] || s[1]) && s[2]);
    }
    m_ctl.create_sensor_manifold(null, "INC_DEC", m_ctl.CT_TRIGGER, 
            inc_dec_keys, inc_dec_logic, inc_dec_cb);
    m_ctl.create_sensor_manifold(null, "INC_DEC_HOLD", m_ctl.CT_SHOT, 
            inc_dec_keys, inc_dec_logic_hold, inc_dec_cb);

    var mute_solo_keys = [key_num_home, key_num_pgup];  

    var mute_solo_cb = function(obj, id, pulse) {
        var mute_solo = Boolean(m_ctl.get_sensor_value(obj, id, 0));
        if (mute_solo)
            switch_mute();
        else
            switch_solo();
    }
    var mute_solo_logic = function(s) {
        return (s[0] || s[1]);
    }
    m_ctl.create_sensor_manifold(null, "MUTE_SOLO", m_ctl.CT_SHOT,
            mute_solo_keys, mute_solo_logic, mute_solo_cb);

    var elapsed = m_ctl.create_elapsed_sensor();

    m_ctl.create_sensor_manifold(null, "MIXER_DRAW", m_ctl.CT_CONTINUOUS,
        [elapsed], null, function() {draw()});

    var timer = m_ctl.create_timer_sensor(1, true);
    m_ctl.create_sensor_manifold(null, "MIXER_UPDATE", m_ctl.CT_TRIGGER,
            [timer], null, function() {
        var strip_range = active_strip_range();
        for (var i = strip_range[0]; i <= strip_range[1]; i++)
            update_strip_params(_mixer_strips[i]);
    });
}

/**
 * Disable mixer controls.
 */
exports.disable_mixer_controls = function() {
    for (var i = 0; MIXER_CONTROLS_MANIFOLD.length; i++)
        m_ctl.remove_sensor_manifold(null, MIXER_CONTROLS_MANIFOLD[i]);
}

/**
 * Initialize mixer
 */
function init() {
    _mixer_strips.length = 0;
    _active_strip = 0;

    _filter_freq_arr = gen_freq_arr(100);
    _filter_mag_arr = new Float32Array(_filter_freq_arr.length);
    _filter_phase_arr = new Float32Array(_filter_freq_arr.length);

    var speakers = m_sfx.get_speaker_objects();
    if (!speakers.length)
        return;

    _mixer_strips.push(create_master_strip());

    for (var i = 0; i < speakers.length; i++) {
        var spk = speakers[i];
        _mixer_strips.push(create_speaker_strip(spk));
    }

    // special strips first, then by name
    _mixer_strips.sort(function(a,b) {
        if (a.id == "MASTER")
            return -1;
        else if (b.id == "MASTER")
            return 1;
        else if (a.id == "COMPRESSOR")
            return -1;
        else if (b.id == "COMPRESSOR")
            return 1;
        else if (a.id.toUpperCase() < b.id.toUpperCase())
            return -1;
        else if (a.id.toUpperCase() > b.id.toUpperCase())
            return 1;
        else
            return 0;
    });
}

function gen_freq_arr(steps) {
    var FMIN = 20;
    var FMAX = 20000;

    var freq_arr = new Float32Array(steps);

    var freq_base = FMAX/FMIN;
    var freq_pow = 0;

    for (var i = 0; i < steps; i++) {
        freq_arr[i] = FMIN * Math.pow(freq_base, freq_pow);
        freq_pow += 1 / (steps - 1);
    }

    return freq_arr;
}

function create_master_strip() {
    var strip = init_strip("MASTER");

    var cparams = m_sfx.get_compressor_params();
    if (cparams) {
        strip.params.push(["THRESHOLD", cparams["threshold"], -100, 0, 100, false]);
        strip.params.push(["KNEE", cparams["knee"], 0, 40, 40, false]);
        strip.params.push(["RATIO", cparams["ratio"], 1, 20, 20, false]);
        strip.params.push(["ATTACK", cparams["attack"], 0, 1, 1000, false]);
        strip.params.push(["RELEASE", cparams["release"], 0, 1, 1000, false]);
    }

    strip.params.push(["VOLUME", m_sfx.get_volume(null), 0, 1, 50, false]);

    strip.mute = m_sfx.is_muted(null) ? 1 : 0;
    strip.solo = -1;

    return strip;
}

function init_strip(id) {
    return {
        id : id,
        params : [],
        active_param : 0,
        mute: -1,
        solo: -1,
        speaker: null
    }
}

function create_speaker_strip(spk) {
    var strip = init_strip(m_scenes.get_object_name(spk));
    strip.mute = m_sfx.is_muted(spk) ? 1 : 0;
    strip.solo = 0;
    strip.speaker = spk;
    return strip;
}

function switch_strip(dir) {
    if (!_mixer_strips.length)
        return;

    if (dir == 1 && _active_strip < (_mixer_strips.length - 1)) {
        _active_strip++;
    } else if (dir == -1 && _active_strip > 0) {
        _active_strip--;
    }

    var strip_range = active_strip_range();
    for (var i = strip_range[0]; i <= strip_range[1]; i++)
        update_strip_params(_mixer_strips[i]);
}

function update_strip_params(strip) {

    if (!strip.speaker)
        return;

    // cleanup
    strip.params.length = 0;

    var pparams = m_sfx.get_positional_params(strip.speaker);
    if (pparams) {
        strip.params.push(["DIST_REF", pparams["dist_ref"], 0, 1000, 10000, false]);
        strip.params.push(["ATTENUATION", pparams["attenuation"], 0, 50, 1000, false]);
        strip.params.push(["DIST_MAX", pparams["dist_max"], 0, 10000, 10000, false]);
    }

    var fparams = m_sfx.get_filter_params(strip.speaker);
    if (fparams) {
        strip.params.push(["EQ_FREQ", fparams["freq"], 20, 20000, 100, true]);
        strip.params.push(["EQ_Q", fparams["Q"], 0, 10, 100, false]);
        strip.params.push(["EQ_GAIN", fparams["gain"], -70, 30, 100, false]);
    }

    strip.params.push(["VOLUME", m_sfx.get_volume(strip.speaker), 0, 1, 50, false]);

    // handle params decrease
    m_util.clamp(strip.active_param, 0, strip.params.length - 1);
}

function switch_param(dir) {
    var strip = _mixer_strips[_active_strip];
    if (!strip)
        return;

    if (dir == 1 && strip.active_param < (strip.params.length - 1)) {
        strip.active_param++;
    } else if (dir == -1 && strip.active_param > 0) {
        strip.active_param--;
    }
}

function param_inc_dec(dir) {
    var strip = _mixer_strips[_active_strip];
    if (!strip)
        return;

    var param = strip.params[strip.active_param];

    if (param[5])
        param[1] *= Math.pow(param[3] / param[2], dir / param[4]);
    else
        param[1] += dir * ((param[3] - param[2]) / param[4]);

    param[1] = m_util.clamp(param[1], param[2], param[3]);

    switch (param[0]) {
    case "VOLUME":
        if (strip.id != "MASTER")
            m_sfx.set_volume(strip.speaker, param[1]);
        else
            m_sfx.set_volume(null, param[1]);
        break;
    case "DIST_REF":
        var pparams = m_sfx.get_positional_params(strip.speaker);
        pparams["dist_ref"] = param[1];
        m_sfx.set_positional_params(strip.speaker, pparams);
        break;
    case "ATTENUATION":
        var pparams = m_sfx.get_positional_params(strip.speaker);
        pparams["attenuation"] = param[1];
        m_sfx.set_positional_params(strip.speaker, pparams);
        break;
    case "DIST_MAX":
        var pparams = m_sfx.get_positional_params(strip.speaker);
        pparams["dist_max"] = param[1];
        m_sfx.set_positional_params(strip.speaker, pparams);
        break;

    case "EQ_FREQ":
        var fparams = m_sfx.get_filter_params(strip.speaker);
        fparams["freq"] = param[1];
        m_sfx.set_filter_params(strip.speaker, fparams);
        break;
    case "EQ_Q":
        var fparams = m_sfx.get_filter_params(strip.speaker);
        fparams["Q"] = param[1];
        m_sfx.set_filter_params(strip.speaker, fparams);
        break;
    case "EQ_GAIN":
        var fparams = m_sfx.get_filter_params(strip.speaker);
        fparams["gain"] = param[1];
        m_sfx.set_filter_params(strip.speaker, fparams);
        break;

    case "THRESHOLD":
        var cparams = m_sfx.get_compressor_params();
        cparams["threshold"] = param[1];
        m_sfx.set_compressor_params(cparams);
        break;
    case "KNEE":
        var cparams = m_sfx.get_compressor_params();
        cparams["knee"] = param[1];
        m_sfx.set_compressor_params(cparams);
        break;
    case "RATIO":
        var cparams = m_sfx.get_compressor_params();
        cparams["ratio"] = param[1];
        m_sfx.set_compressor_params(cparams);
        break;
    case "ATTACK":
        var cparams = m_sfx.get_compressor_params();
        cparams["attack"] = param[1];
        m_sfx.set_compressor_params(cparams);
        break;
    case "RELEASE":
        var cparams = m_sfx.get_compressor_params();
        cparams["release"] = param[1];
        m_sfx.set_compressor_params(cparams);
        break;
    default:
        m_util.panic("Unknown strip param");
        break;
    }
}

function switch_mute() {
    var strip = _mixer_strips[_active_strip];
    if (!strip)
        return;

    if (strip.mute >= 0) {
        flip_strip_mute(strip);
    }
}

function flip_strip_mute(strip) {
    var id = strip.id;

    if (id != "MASTER") {
        if (strip.mute == 0) {
            strip.mute = 1;

            m_sfx.mute(strip.speaker, true);

            if (strip.solo == 1) {
                strip.solo = 0;

                if (!is_other_solo(strip))
                    unmute_other(strip);
            }
        } else {
            strip.mute = 0;

            if (!is_other_solo(strip))
                m_sfx.mute(strip.speaker, false);
        }
    } else {
        if (strip.mute == 0) {
            strip.mute = 1;
            m_sfx.mute(null, true);
        } else {
            strip.mute = 0;
            m_sfx.mute(null, false);
        }
    }
}

function is_other_solo(strip) {
    for (var i = 0; i < _mixer_strips.length; i++) {
        var strip_i = _mixer_strips[i];

        if (strip_i != strip && strip_i.solo == 1)
            return true;
    }
    return false;
}

function mute_other(strip) {
    for (var i = 0; i < _mixer_strips.length; i++) {
        var strip_i = _mixer_strips[i];

        if (strip_i != strip && strip_i.mute == 0 && strip_i.solo == 0)
            m_sfx.mute(strip_i.speaker, true);
    }
}

function unmute_other(strip) {
    for (var i = 0; i < _mixer_strips.length; i++) {
        var strip_i = _mixer_strips[i];

        if (strip_i != strip && strip_i.mute == 0 && strip_i.solo == 0)
            m_sfx.mute(strip_i.speaker, false);
    }
}

function switch_solo() {
    var strip = _mixer_strips[_active_strip];
    if (!strip)
        return;

    if (strip.solo >= 0) {
        flip_strip_solo(strip);
    }
}

function flip_strip_solo(strip) {

    if (strip.solo == 0) {
        strip.solo = 1;

        m_sfx.mute(strip.speaker, false);

        // flip muted current
        if (strip.mute == 1)
            strip.mute = 0;

        mute_other(strip);

    } else {
        strip.solo = 0;

        if (is_other_solo(strip))
            m_sfx.mute(strip.speaker, true);
        else
            unmute_other(strip);
    }
}

function draw() {
    if (!_mixer_strips[_active_strip])
        return;

    var strip_range = active_strip_range();

    for (var i = strip_range[0]; i <= strip_range[1]; i++) {

        var strip = _mixer_strips[i];

        m_hud.draw_mixer_strip(strip.id, i == _active_strip, i % 8,
                strip.params, strip.active_param, strip.mute, strip.solo);

        if (strip.speaker && m_sfx.get_filter_params(strip.speaker)) {
            m_sfx.get_filter_freq_response(strip.speaker, _filter_freq_arr,
                    _filter_mag_arr, _filter_phase_arr);

            for (var j = 0; j < _filter_mag_arr.length; j++) {
                var mag = _filter_mag_arr[j];
                // log10()
                _filter_mag_arr[j] = 20 * Math.log(mag) / Math.LN10;
            }

            m_hud.plot_array("EQ", i % 8, _filter_mag_arr, 20, 20000, -10, 10);
        }
    }
}

function active_strip_range() {

    if (_mixer_strips.length == 0)
        return [0, -1];

    var strip_low = Math.floor(_active_strip / 8) * 8;
    var strip_high = strip_low + 7;

    strip_low = m_util.clamp(strip_low, 0, _mixer_strips.length-1);
    strip_high = m_util.clamp(strip_high, 0, _mixer_strips.length-1);

    return [strip_low, strip_high];
}


}
