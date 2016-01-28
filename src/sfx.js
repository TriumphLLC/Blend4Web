/**
 * Copyright (C) 2014-2015 Triumph LLC
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
 * Sound effects internal API.
 * @name sfx
 * @namespace
 * @exports exports as sfx
 */
b4w.module["__sfx"] = function(exports, require) {

var m_cfg   = require("__config");
var m_print = require("__print");
var m_time  = require("__time");
var m_tsr   = require("__tsr");
var m_util  = require("__util");
var m_vec3  = require("__vec3");

var cfg_ani = m_cfg.animation;
var cfg_def = m_cfg.defaults;
var cfg_sfx = m_cfg.sfx;

var SPEED_SMOOTH_PERIOD = 0.3;

var SPKSTATE_UNDEFINED  = 10;
var SPKSTATE_PLAY       = 20
var SPKSTATE_STOP       = 30;
var SPKSTATE_PAUSE      = 40;
var SPKSTATE_FINISH     = 50;

var SCHED_PARAM_LOOPS = 5;
var SCHED_PARAM_ANTICIPATE_TIME = 3.0;

// audio source types
exports.AST_NONE         = 10;
exports.AST_ARRAY_BUFFER = 20;
exports.AST_HTML_ELEMENT = 30;

var _vec3_tmp = new Float32Array(3);
var _vec3_tmp2 = new Float32Array(3);
var _vec3_tmp3 = new Float32Array(3);

// permanent vars
var _supported_audio = [];
var _supported_video = [];
var _wa = null;

// per-loaded-scene vars
var _active_scene = null;
var _speaker_objects = [];

var _seed_tmp = [1];

var _playlist = null;

exports.create_sfx = function() {
    var sfx = {
        uuid: -1,
        filepath: "",

        behavior: "NONE",
        disable_doppler: false,
        muted: false,

        volume: 1,
        pitch: 1,
        attenuation: 1,
        dist_ref: 1,
        dist_max: 10000,

        cone_angle_inner: 360,
        cone_angle_outer: 360,
        cone_volume_outer: 1,

        cyclic: false,
        loop: false,

        delay: 0,
        delay_random: 0,

        volume_random: 0,
        pitch_random: 0,
        fade_in: 0,
        fade_out: 0,

        start_time: 0,
        pause_time: 0,
        buf_offset: 0,
        duration: 0,
        vp_rand_end_time: 0,

        base_seed: 1,

        src: null,

        // initial state
        state: SPKSTATE_UNDEFINED,

        last_position: new Float32Array(3),
        direction: new Float32Array(3),
        speed_avg: new Float32Array(3),

        // for BACKGROUND_MUSIC
        bgm_start_timeout: -1,
        bgm_stop_timeout: -1,

        duck_time: 0
    }

    return sfx;
}


/**
 * Initialize sound effects module
 */
exports.init = function() {
    // NOTE: DOM Exception 5 if not found
    var audio = document.createElement("audio");
    var video = document.createElement("video");
    // do not detect codecs here, simply follow the rules:
    // ogg - vorbis
    // mp3 - mp3
    // mp4 - aac
    if (audio.canPlayType) {
        if (audio.canPlayType("audio/ogg") != "") {
            _supported_audio.push("ogg");
            _supported_audio.push("ogv");
        }
        if (audio.canPlayType("audio/mpeg") != "")
            _supported_audio.push("mp3");
        if (audio.canPlayType("audio/mp4") != "") {
            _supported_audio.push("mp4");
            _supported_audio.push("m4v");
        }
        if (audio.canPlayType("audio/webm") != "")
            _supported_audio.push("webm");
    }

    if (video.canPlayType) {
        if (video.canPlayType("video/ogg") != "")
            _supported_video.push("ogv");
        if (video.canPlayType("video/mp4") != "")
            _supported_video.push("m4v");
        if (video.canPlayType("video/webm") != "")
            _supported_video.push("webm");
    }

    // NOTE: register context once and reuse for all loaded scenes to prevent
    // out-of-resources error due to Chromium context leaks
    _wa = cfg_sfx.webaudio ? create_wa_context() : null;

    if (_wa)
        m_print.log("%cINIT WEBAUDIO: " + _wa.sampleRate + "Hz", "color: #00a");
}

exports.attach_scene_sfx = function(scene) {

    var scene_sfx = {
        listener_last_eye : new Float32Array(3),
        listener_direction : new Float32Array(3),
        listener_speed_avg : new Float32Array(3)
    };

    scene._sfx = scene_sfx;

    if (_wa) {
        var gnode = _wa.createGain();
        var fade_gnode = _wa.createGain();

        scene_sfx.gain_node = gnode;
        scene_sfx.fade_gain_node = fade_gnode;

        gnode.connect(fade_gnode);
        fade_gnode.connect(_wa.destination);

        if (scene["b4w_enable_dynamic_compressor"]) {
            var compressor = _wa.createDynamicsCompressor();

            var dcs = scene["b4w_dynamic_compressor_settings"];

            compressor.threshold.value = dcs["threshold"];
            compressor.knee.value = dcs["knee"];
            compressor.ratio.value = dcs["ratio"];
            compressor.attack.value = dcs["attack"];
            compressor.release.value = dcs["release"];

            compressor.connect(gnode);
            scene_sfx.compressor_node = compressor;
            scene_sfx.proc_chain_in = compressor;
        } else {
            scene_sfx.compressor_node = null;
            scene_sfx.proc_chain_in = gnode;
        }

        var listener = _wa.listener;
        scene_sfx.disable_doppler = cfg_def.disable_doppler_hack;
        if (!scene_sfx.disable_doppler) {
            listener.dopplerFactor = scene["audio_doppler_factor"];
            listener.speedOfSound = scene["audio_doppler_speed"];
        }

        scene_sfx.muted = false;
        scene_sfx.volume = 1;
        scene_sfx.duck_time = 0;

    }
}

function create_wa_context() {

    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
        var ctx = new AudioContext();
        // simple WebAudio version check
        if (ctx.createGain) {
            return ctx;
        } else {
            m_print.warn("deprecated WebAudio implementation");
            return null;
        }
    } else {
        m_print.warn("WebAudio is not supported");
        return null;
    }
}


exports.set_active_scene = function(scene) {
    _active_scene = scene;
}

exports.detect_audio_container = function(hint) {
    if (!hint)
        var hint = "ogg";

    // only one fallback required in most cases

    // requested hint is supported
    if (_supported_audio.indexOf(hint) > -1)
        return hint;
    // ogg -> mp4
    else if (hint == "ogg" && _supported_audio.indexOf("mp4") > -1)
        return "mp4";
    // mp3 -> ogg
    else if (hint == "mp3" && _supported_audio.indexOf("ogg") > -1)
        return "ogg";
    // mp4 -> ogg
    else if (hint == "mp4" && _supported_audio.indexOf("ogg") > -1)
        return "ogg";
    // ogv -> m4v
    else if (hint == "ogv" && _supported_audio.indexOf("m4v") > -1)
        return "m4v";
    // webm -> m4v
    else if (hint == "webm" && _supported_audio.indexOf("m4v") > -1)
        return "m4v";
    // m4v -> webm
    else if (hint == "m4v" && _supported_audio.indexOf("webm") > -1)
        return "webm";
    // unsupported and no fallback
    else
        return "";
}

exports.detect_video_container = function(hint) {
    if (!hint)
        var hint = "webm";

    // only one fallback required in most cases

    // requested hint is supported
    if (_supported_video.indexOf(hint) > -1)
        return hint;
    // ogv -> m4v
    else if (hint == "ogv" && _supported_video.indexOf("m4v") > -1)
        return "m4v";
    // webm -> m4v
    else if (hint == "webm" && _supported_video.indexOf("m4v") > -1)
        return "m4v";
    // m4v -> webm
    else if (hint == "m4v" && _supported_video.indexOf("webm") > -1)
        return "webm";
    // unsupported and no fallback
    else
        return "";
}

/**
 * Update speaker object from bpy_object, adding some properties
 */
exports.update_object = function(bpy_obj, obj) {

    var speaker = bpy_obj["data"];
    var sfx = obj.sfx;

    sfx.uuid = bpy_obj["data"]["sound"]["uuid"];
    sfx.filepath = bpy_obj["data"]["sound"]["filepath"];

    switch(speaker["b4w_behavior"]) {
    case "POSITIONAL":
    case "BACKGROUND_SOUND":
        sfx.behavior = _wa ? speaker["b4w_behavior"] : "NONE";
        break;
    case "BACKGROUND_MUSIC":
        sfx.behavior = _wa ? (check_media_element_node() ?
                "BACKGROUND_MUSIC" : "BACKGROUND_SOUND") : "NONE";
        break;
    default:
        throw "Wrong speaker behavior";
        break;
    }

    // NOTE: temporary compatibility actions: allow speakers without sound
    if (!speaker["sound"])
        sfx.behavior = "NONE";

    sfx.disable_doppler = speaker["b4w_disable_doppler"] ||
            cfg_def.disable_doppler_hack;

    sfx.muted = speaker["muted"];
    sfx.volume = speaker["volume"];
    sfx.pitch = speaker["pitch"];

    sfx.attenuation = speaker["attenuation"];
    sfx.dist_ref = speaker["distance_reference"];
    sfx.dist_max = speaker["distance_max"] || 10000; // spec def
    sfx.cone_angle_inner = speaker["cone_angle_inner"];
    sfx.cone_angle_outer = speaker["cone_angle_outer"];
    sfx.cone_volume_outer = speaker["cone_volume_outer"];
    sfx.cyclic = speaker["b4w_cyclic_play"];
    sfx.loop = speaker["b4w_loop"];

    sfx.delay = speaker["b4w_delay"];
    sfx.delay_random = speaker["b4w_delay_random"];

    sfx.volume_random = speaker["b4w_volume_random"];
    sfx.pitch_random = speaker["b4w_pitch_random"];
    sfx.fade_in = speaker["b4w_fade_in"];
    sfx.fade_out = speaker["b4w_fade_out"];

    _speaker_objects.push(obj);
}

function check_media_element_node() {
    if (window.MediaElementAudioSourceNode) {
        return true;
    } else {
        m_print.warn("MediaElementAudioSourceNode not found");
        return false;
    }
}

/**
 * Returns audio source type for given object (AST_*)
 * @param {Object3D} obj Object 3D
 */
exports.source_type = function(obj) {
    if (obj.type != "SPEAKER")
        throw "Wrong object type";

    switch(obj.sfx.behavior) {
    case "POSITIONAL":
        return exports.AST_ARRAY_BUFFER;
    case "BACKGROUND_SOUND":
        return exports.AST_ARRAY_BUFFER;
    case "BACKGROUND_MUSIC":
        return exports.AST_HTML_ELEMENT;
    case "NONE":
        return exports.AST_NONE;
    default:
        throw "Wrong speaker behavior";
    }
}

/**
 * Updates speaker object with loaded sound data
 * @param {Object3D} obj Object 3D
 * @param {ArrayBuffer|<audio>} sound_data Sound Data
 */
exports.update_spkobj = function(obj, sound_data) {

    var sfx = obj.sfx;

    switch (sfx.behavior) {
    case "POSITIONAL":
    case "BACKGROUND_SOUND":
    case "BACKGROUND_MUSIC":
        sfx.src = sound_data;
        // TODO: prepare audio graph here
        break;
    case "NONE":
        break;
    default:
        throw "Wrong speaker behavior";
    }
}

/**
 * HACK: Initialize WebAudio context for iOS mobile devices
 */
exports.play_empty_sound = function() {
    var source = _wa.createBufferSource();
    source.buffer = _wa.createBuffer(1, 22050, 22050);
    source.connect(_wa.destination);
    source.start(0);
}

exports.decode_audio_data = function(arr_buf, decode_cb, fail_cb) {
    if (_wa)
        _wa.decodeAudioData(arr_buf, decode_cb, fail_cb);
    else
        fail_cb();
}

/**
 * NOTE: may be buggy
 */
exports.speaker_remove = function(obj) {
    stop(obj);

    obj.sfx = null;
    _speaker_objects.splice(_speaker_objects.indexOf(obj), 1);
}

/**
 * Perform module cleanup
 */
exports.cleanup = function() {

    for (var i = 0; i < _speaker_objects.length; i++) {
        var obj = _speaker_objects[i];
        var sfx = obj.sfx;
        if (sfx.behavior == "BACKGROUND_MUSIC") {
            var audio_el = sfx.src;
            if (audio_el)
                audio_el.pause();
        } else {
            if (sfx.source_node)
                sfx.source_node.disconnect();
        }
    }

    if (_active_scene && _active_scene._sfx) {
        var scene_sfx = _active_scene._sfx;
        scene_sfx.listener_last_eye[0] = 0;
        scene_sfx.listener_last_eye[1] = 0;
        scene_sfx.listener_last_eye[2] = 0;
        scene_sfx.listener_speed_avg[0] = 0;
        scene_sfx.listener_speed_avg[1] = 0;
        scene_sfx.listener_speed_avg[2] = 0;
    }

    _active_scene = null;
    _speaker_objects.splice(0);
    _playlist = null;
}


/**
 * Update speaker objects used by module
 * executed every frame
 * @param {Number} elapsed Number of float seconds since previous execution
 */
exports.update = function(timeline, elapsed) {

    if (!_wa || _speaker_objects.length == 0)
        return;

    for (var i = 0; i < _speaker_objects.length; i++) {
        var obj = _speaker_objects[i];
        var sfx = obj.sfx;
        var source = sfx.source_node;

        var curr_time = _wa.currentTime;

        // finish state may be already set by onended handler
        if (!sfx.loop && sfx.state == SPKSTATE_PLAY && sfx.duration &&
                (sfx.start_time + sfx.duration < curr_time) &&
                (sfx.behavior == "BACKGROUND_MUSIC" ||
                 // if onended is not supported
                 (source && !m_util.isdef(source.onended))))
            sfx.state = SPKSTATE_FINISH;

        // handle restarts
        if (sfx.cyclic && sfx.state == SPKSTATE_FINISH)
            play_def(obj);

        // handle volume pitch randomization
        if (sfx.state == SPKSTATE_PLAY && (sfx.vp_rand_end_time - curr_time) <
                SCHED_PARAM_ANTICIPATE_TIME)
            schedule_volume_pitch_random(sfx);
    }

    // handle playlist
    if (_playlist && _playlist.speakers.length && (_playlist.active == -1 
            || timeline > _playlist.active_start_time 
            + _playlist.durations[_playlist.active]))
        playlist_switch_next(_playlist, timeline);
}

function playlist_switch_next(playlist, timeline) {
    if (playlist.active > -1)
        stop(playlist.speakers[playlist.active]);

    if (playlist.active == -1 && playlist.random) {
        var next = Math.round(Math.random() * (playlist.speakers.length - 1));
    } else if (playlist.random) {
        var advance = 1 + Math.round(Math.random() * (playlist.speakers.length - 2));
        var next = (playlist.active + advance) % playlist.speakers.length;
    } else
        var next = (playlist.active + 1) % playlist.speakers.length;

    play_def(playlist.speakers[next]);

    playlist.active = next;
    playlist.active_start_time = timeline;
}

exports.play = play;
function play(obj, when, duration) {

    var sfx = obj.sfx;

    if (sfx.behavior == "NONE")
        return;

    var loop = sfx.loop;
    var playrate = sfx.pitch;

    // not ready or too late
    if (!(sfx.src && (loop || duration >= 0)))
        return;

    // initialize random sequence
    sfx.base_seed = Math.floor(50000 * Math.random());

    var start_time = _wa.currentTime + when;
    start_time = Math.max(0.0, start_time);

    sfx.start_time = start_time;

    sfx.state = SPKSTATE_PLAY;

    update_proc_chain(obj);

    if (sfx.behavior == "POSITIONAL" ||
            sfx.behavior == "BACKGROUND_SOUND") {

        var source = _wa.createBufferSource();

        source.buffer = sfx.src;
        source.playbackRate.value = playrate;

        // NOTE: may affect pause/resume behavior if not supported
        if (m_util.isdef(source.onended))
            source.onended = function() {
                sfx.state = SPKSTATE_FINISH;
            };

        if (loop) {
            // switch off previous node graph
            if (sfx.source_node)
                sfx.source_node.disconnect();

            source.loop = true;
            source.start(start_time);

            // NOTE: loop count
            sfx.duration = 0;
        } else {
            var buf_dur = source.buffer ? source.buffer.duration : 0;

            if (duration > buf_dur) {
                var to = start_time + duration + sfx.fade_out;

                source.loop = true;

                source.start(start_time);
                source.stop(to);

                sfx.duration = duration;
            } else {
                source.loop = false;
                source.start(start_time);

                sfx.duration = buf_dur;
            }
        }

        source.connect(sfx.proc_chain_in);
        sfx.source_node = source;

        reset_volume_pitch_random(sfx);
        schedule_volume_pitch_random(sfx);

    } else if (sfx.behavior == "BACKGROUND_MUSIC") {

        m_time.clear_timeout(sfx.bgm_start_timeout);
        m_time.clear_timeout(sfx.bgm_stop_timeout);

        var start_cb = function() {
            fire_audio_element(obj);
        }

        if (when == 0)
            start_cb();
        else
            sfx.bgm_start_timeout = m_time.set_timeout(start_cb, when * 1000);

        if (loop) {
            sfx.duration = 0;
        } else {
            var el_dur = get_duration(obj);
            sfx.duration = el_dur;
        }
    }

    schedule_fades(sfx, start_time);
}

/**
 * Update WA processing chain (routing graph) for given speaker.
 */
function update_proc_chain(obj) {

    var sfx = obj.sfx;

    if (sfx.proc_chain_in)
        return;

    var pos = m_tsr.get_trans_view(obj.render.world_tsr);
    var quat = m_tsr.get_quat_view(obj.render.world_tsr);

    if (cfg_sfx.mix_mode) {
        var filter_node = _wa.createBiquadFilter();
        filter_node.type = "peaking";
    } else
        var filter_node = null;

    // mandatory fade-in/out gain node
    var fade_gnode = _wa.createGain();

    switch (sfx.behavior) {
    // panner->filter->gain->fade->rand
    case "POSITIONAL":
        var ap = _wa.createPanner();
        
        // default HRTF panning gives too much volume gain
        
        if (typeof ap.panningModel != "string") {
            // old spec
            ap.panningModel = ap.EQUALPOWER;
            ap.distanceModel = ap.INVERSE_DISTANCE;
        } else {
            // new spec
            ap.panningModel = "equalpower";
            ap.distanceModel = "inverse";
        }


        ap.setPosition(pos[0], pos[1], pos[2]);
        m_vec3.copy(pos, sfx.last_position);

        var orient = _vec3_tmp;
        m_util.quat_to_dir(quat, m_util.AXIS_MY, orient);
        ap.setOrientation(orient[0], orient[1], orient[2]);
        m_vec3.copy(orient, sfx.direction);

        ap.refDistance = sfx.dist_ref;
        ap.maxDistance = sfx.dist_max;
        ap.rolloffFactor = sfx.attenuation;

        ap.coneInnerAngle = sfx.cone_angle_inner;
        ap.coneOuterAngle = sfx.cone_angle_outer;
        ap.coneOuterGain = sfx.cone_volume_outer;

        var gnode = _wa.createGain();
        gnode.gain.value = calc_gain(sfx);

        if (filter_node) {
            ap.connect(filter_node);
            filter_node.connect(gnode);
        } else {
            ap.connect(gnode);
        }

        gnode.connect(fade_gnode);

        sfx.proc_chain_in = ap;

        // optional volume randomization gain node
        if (sfx.volume_random) {
            var rand_gnode = _wa.createGain();
            fade_gnode.connect(rand_gnode);
            rand_gnode.connect(get_scene_dst_node(_active_scene));
        } else {
            var rand_gnode = null;
            fade_gnode.connect(get_scene_dst_node(_active_scene));
        }

        break;
    // filter->gain->fade->rand
    case "BACKGROUND_SOUND":
        var ap = null;

        var gnode = _wa.createGain();
        gnode.gain.value = calc_gain(sfx);

        if (filter_node) {
            sfx.proc_chain_in = filter_node;
            filter_node.connect(gnode);
        } else {
            sfx.proc_chain_in = gnode;
        }

        gnode.connect(fade_gnode);

        // optional volume randomization gain node
        if (sfx.volume_random) {
            var rand_gnode = _wa.createGain();
            fade_gnode.connect(rand_gnode);
            rand_gnode.connect(get_scene_dst_node(_active_scene));
        } else {
            var rand_gnode = null;
            fade_gnode.connect(get_scene_dst_node(_active_scene));
        }

        break;
    // filter->gain->fade
    case "BACKGROUND_MUSIC":
        var ap = null;
        var rand_gnode = null;

        var gnode = _wa.createGain();
        gnode.gain.value = calc_gain(sfx);

        if (filter_node) {
            sfx.proc_chain_in = filter_node;
            filter_node.connect(gnode);
        } else {
            sfx.proc_chain_in = gnode;
        }

        gnode.connect(fade_gnode);

        fade_gnode.connect(get_scene_dst_node(_active_scene));

        break;
    }

    sfx.panner_node = ap;
    sfx.filter_node = filter_node;
    sfx.gain_node = gnode;
    sfx.fade_gain_node = fade_gnode;
    sfx.rand_gain_node = rand_gnode;
}

exports.play_def = play_def;
function play_def(obj) {
    var sfx = obj.sfx;

    var duration = sfx.duration;
    var delay = sfx.delay + sfx.delay_random * Math.random();
    play(obj, delay, duration);
}

function get_scene_dst_node(scene) {
    if (_wa)
        return scene._sfx.proc_chain_in;
    else
        return null;
}

function get_gain_node(scene) {
    if (_wa)
        return scene._sfx.gain_node;
    else
        return null;
}

function get_fade_node(scene) {
    if (_wa)
        return scene._sfx.fade_gain_node;
    else
        return null;
}

function reset_volume_pitch_random(sfx) {
    if (sfx.volume_random)
        sfx.rand_gain_node.gain.cancelScheduledValues(sfx.start_time);

    if (sfx.pitch_random)
        sfx.source_node.playbackRate.cancelScheduledValues(sfx.start_time);

    sfx.vp_rand_end_time = sfx.start_time;
}

function schedule_volume_pitch_random(sfx) {

    // optimization
    if (!(sfx.volume_random || sfx.pitch_random))
        return;

    var rand_gnode = sfx.rand_gain_node;
    var source = sfx.source_node;

    var buf_dur = source.buffer ? source.buffer.duration : 0;
    if (!buf_dur)
        return;

    var time = sfx.start_time;

    // deterministic randomization for pitch only
    _seed_tmp[0] = sfx.base_seed;

    for (var cnt = 0; cnt < SCHED_PARAM_LOOPS; ) {
        var playrate = sfx.pitch + sfx.pitch_random * m_util.rand_r(_seed_tmp);

        if (time >= sfx.vp_rand_end_time) {
            if (sfx.volume_random) {
                var gain = 1 - m_util.clamp(sfx.volume_random, 0, 1) * Math.random();
                rand_gnode.gain.setValueAtTime(gain, time);
            }

            if (sfx.pitch_random)
                source.playbackRate.setValueAtTime(playrate, time);

            cnt++;
        }

        time += buf_dur / playrate;
    }

    sfx.vp_rand_end_time = (time - 0.001);
}

function schedule_fades(sfx, from_time) {

    // optimization
    if (!(sfx.fade_in || sfx.fade_out))
        return;

    var fade_gnode = sfx.fade_gain_node;

    // also clears scheduled ducks
    fade_gnode.gain.cancelScheduledValues(from_time);

    if (sfx.fade_in) {
        fade_gnode.gain.setValueAtTime(0, from_time);
        fade_gnode.gain.linearRampToValueAtTime(1, from_time + sfx.fade_in);
    } else {
        // clear possible duck or fade-out from previous iteraion
        fade_gnode.gain.setValueAtTime(1, from_time);
    }

    if (sfx.fade_out && !sfx.loop) {
        var source = sfx.source_node;

        // NOTE: requires longer sound, e.g. not working in case of non-loop single shot sound
        fade_gnode.gain.setValueAtTime(1, from_time + sfx.duration);
        fade_gnode.gain.linearRampToValueAtTime(0, from_time + sfx.duration +
                sfx.fade_out);
    }
}

function fire_audio_element(obj) {
    var sfx = obj.sfx;
    var audio = sfx.src;
    if (audio) {
        // volume will be controlled by gain node
        audio.volume = 1.0;
        audio.loop = sfx.loop;

        // NOTE: audio element will be invalidated after construction execution,
        // so use previous MediaElementSourceNode
        sfx.source_node = sfx.source_node ||
                _wa.createMediaElementSource(audio);

        sfx.source_node.connect(sfx.proc_chain_in);

        if (sfx.state == SPKSTATE_PLAY) {
            if (audio.currentTime)
                audio.currentTime = 0;
            audio.play();
        }
    }
}

function stop_audio_element(obj) {
    var sfx = obj.sfx;
    var audio = sfx.src;
    if (audio) {
        // exact sequence
        if (audio.currentTime)
            audio.currentTime = 0;
        audio.pause();
    }
}

exports.stop = stop;
/**
 * Stop to play from given speaker
 * @param sobj Object 3D
 * @methodOf sfx
 */
function stop(sobj) {
    if (sobj.type != "SPEAKER")
        throw "Wrong object type";

    var sfx = sobj.sfx;

    if (sfx.state == SPKSTATE_FINISH) {
        sfx.state = SPKSTATE_STOP;
        return;
    } else if (sfx.state != SPKSTATE_PLAY && sfx.state != SPKSTATE_PAUSE)
        return;

    var fade_gnode = sfx.fade_gain_node;
    var current_time = _wa.currentTime;

    if (sfx.fade_out) {
        fade_gnode.gain.setValueAtTime(fade_gnode.gain.value, current_time);
        fade_gnode.gain.linearRampToValueAtTime(0, current_time + sfx.fade_out);
    }

    if (sfx.behavior == "BACKGROUND_MUSIC") {
        var audio_el = sfx.src;
        if (audio_el) {
            var stop_cb = function() {
                stop_audio_element(sobj);
            }

            m_time.clear_timeout(sfx.bgm_start_timeout);
            m_time.clear_timeout(sfx.bgm_stop_timeout);

            sfx.bgm_stop_timeout = m_time.set_timeout(stop_cb,
                    sfx.fade_out * 1000);
        }
    } else {
        var source = sfx.source_node;

        // NOTE: condition to fix issue with double stop() for loop-range speakers
        if (sfx.duration < source.buffer.duration) {
            if (sfx.fade_out && sfx.state == SPKSTATE_PLAY) {
                source.stop(current_time + sfx.fade_out);
            } else if (sfx.state == SPKSTATE_PLAY) {
                source.stop(0);
                source.disconnect();
            }
        } else {
            // just disconnect, no fade-out
            source.disconnect();
        }

        sfx.start_time = 0;
        sfx.pause_time = 0;
        sfx.buf_offset = 0;
    }

    sfx.state = SPKSTATE_STOP;
}

exports.is_playing = is_playing;
function is_playing(obj) {
    return (obj.sfx.state == SPKSTATE_PLAY);
}

exports.speaker_pause = speaker_pause;
/**
 * Pause speaker.
 * @param obj Speaker object ID
 */
function speaker_pause(obj) {

    var sfx = obj.sfx;

    if (sfx.state != SPKSTATE_PLAY)
        return;

    var current_time = _wa.currentTime;
    sfx.pause_time = current_time;

    if (sfx.behavior == "BACKGROUND_MUSIC") {
        var audio_el = sfx.src;
        if (audio_el)
            audio_el.pause();
    } else {
        var source = sfx.source_node;
        var playrate = source.playbackRate.value;

        var buf_dur = source.buffer.duration;

        if (current_time > sfx.start_time)
            sfx.buf_offset = calc_buf_offset(sfx, current_time);
        else
            sfx.buf_offset = 0;

        sfx.source_node.stop(0);
        sfx.source_node.disconnect();

        reset_volume_pitch_random(sfx);
    }

    sfx.state = SPKSTATE_PAUSE;
}

function calc_buf_offset(sfx, current_time) {

    _seed_tmp[0] = sfx.base_seed;
    var buf_dur = sfx.source_node.buffer.duration;
    var time = sfx.start_time;
    var playrate;

    while (time < current_time) {
        playrate = sfx.pitch + sfx.pitch_random * m_util.rand_r(_seed_tmp);
        time += buf_dur / playrate;
    }

    return (buf_dur / playrate - (time - current_time)) * playrate;
}

exports.speaker_resume = speaker_resume;
/**
 * Resume speaker.
 * @param obj Speaker object ID
 */
function speaker_resume(obj) {

    var sfx = obj.sfx;

    if (sfx.state != SPKSTATE_PAUSE)
        return;

    var current_time = _wa.currentTime;
    sfx.start_time += (current_time - sfx.pause_time);

    if (sfx.behavior == "BACKGROUND_MUSIC") {
        var audio_el = sfx.src;
        audio_el.play();
    } else {
        update_source_node(obj);
        sfx.vp_rand_end_time = current_time;

        var source = sfx.source_node;
        var playrate = source.playbackRate.value;
        var buf_dur = source.buffer.duration;

        // NOTE: may affect pause/resume behavior if not supported
        if (m_util.isdef(source.onended))
            source.onended = function() {
                sfx.state = SPKSTATE_FINISH;
            };
        source.start(sfx.start_time, sfx.buf_offset);

        schedule_volume_pitch_random(sfx);
    }
    
    schedule_fades(sfx, sfx.start_time);
    sfx.state = SPKSTATE_PLAY;
}

function update_source_node(obj) {
    var sfx = obj.sfx;

    var source = _wa.createBufferSource();

    source.loop = sfx.source_node.loop;
    source.buffer = sfx.source_node.buffer;
    source.playbackRate.value = sfx.source_node.playbackRate.value;

    if (sfx.panner_node)
        source.connect(sfx.panner_node);
    else
        source.connect(sfx.gain_node);

    sfx.source_node = source;
}


exports.playrate = function(obj, playrate) {
    var sfx = obj.sfx;

    sfx.pitch = playrate;

    if (spk_is_active(obj) && (sfx.behavior == "POSITIONAL" ||
                sfx.behavior == "BACKGROUND_SOUND")) {
        sfx.source_node.playbackRate.value = playrate;
        reset_volume_pitch_random(sfx);
        schedule_volume_pitch_random(sfx);
    }

    // TODO: Consider BACKGROUND_MUSIC implementation
}

exports.get_playrate = function(obj) {
    return obj.sfx.pitch;
}


exports.cyclic = function(obj, cyclic) {
    obj.sfx.cyclic = Boolean(cyclic);
}

exports.is_cyclic = is_cyclic;
function is_cyclic(obj) {
    return obj.sfx.cyclic;
}

/**
 * Update position, speed and orientation of the listener (camera)
 */
exports.listener_update_transform = function(scene, trans, quat, elapsed) {

    // NOTE: hack
    if (!_wa)
        return;

    if (!scene._sfx)
        return;

    var front = _vec3_tmp;
    front[0] = 0;
    front[1] =-1;
    front[2] = 0;
    m_vec3.transformQuat(front, quat, front);

    var up = _vec3_tmp2;
    up[0] = 0;
    up[1] = 0;
    up[2] =-1;
    m_vec3.transformQuat(up, quat, up);

    var listener = _wa.listener;
    listener.setPosition(trans[0], trans[1], trans[2]);
    listener.setOrientation(front[0], front[1], front[2], up[0], up[1], up[2]);
    m_vec3.copy(front, scene._sfx.listener_direction);

    if (!scene._sfx.disable_doppler && elapsed) {
        var speed = _vec3_tmp3;

        speed[0] = (trans[0] - scene._sfx.listener_last_eye[0])/elapsed;
        speed[1] = (trans[1] - scene._sfx.listener_last_eye[1])/elapsed;
        speed[2] = (trans[2] - scene._sfx.listener_last_eye[2])/elapsed;

        m_util.smooth_v(speed, scene._sfx.listener_speed_avg, elapsed,
                SPEED_SMOOTH_PERIOD, speed);

        listener.setVelocity(speed[0], speed[1], speed[2]);
        m_vec3.copy(speed, scene._sfx.listener_speed_avg);
    }

    m_vec3.copy(trans, scene._sfx.listener_last_eye);
}

exports.listener_reset_speed = function(speed, dir) {
    // NOTE: hack
    if (!_wa)
        return;

    if (!_active_scene._sfx || _active_scene._sfx.disable_doppler)
        return;

    var velocity = _vec3_tmp;

    if (dir)
        m_vec3.copy(dir, velocity);
    else
        m_vec3.copy(_active_scene._sfx.listener_direction, velocity);

    m_vec3.scale(velocity, speed, velocity);

    var listener = _wa.listener;
    listener.setVelocity(velocity[0], velocity[1], velocity[2]);
    m_vec3.copy(velocity, _active_scene._sfx.listener_speed_avg);
}

/**
 * Update speaker position, orientation and velocity.
 */
exports.speaker_update_transform = function(obj, elapsed) {

    var sfx = obj.sfx;

    if (!(spk_is_active(obj) && sfx.behavior == "POSITIONAL"))
        return;

    var pos = m_tsr.get_trans_view(obj.render.world_tsr);
    var quat = m_tsr.get_quat_view(obj.render.world_tsr);
    var panner = sfx.panner_node;
    panner.setPosition(pos[0], pos[1], pos[2]);

    var orient = _vec3_tmp;
    m_util.quat_to_dir(quat, m_util.AXIS_MY, orient);
    panner.setOrientation(orient[0], orient[1], orient[2]);

    var lpos = sfx.last_position;

    if (!sfx.disable_doppler && elapsed) {
        var speed = _vec3_tmp2;
        speed[0] = (pos[0] - lpos[0]) / elapsed;
        speed[1] = (pos[1] - lpos[1]) / elapsed;
        speed[2] = (pos[2] - lpos[2]) / elapsed;

        m_util.smooth_v(speed, sfx.speed_avg, elapsed,
                SPEED_SMOOTH_PERIOD, speed);

        panner.setVelocity(speed[0], speed[1], speed[2]);

        m_vec3.copy(speed, sfx.speed_avg);
    }

    m_vec3.copy(pos, lpos);
}

exports.speaker_reset_speed = function(obj, speed, dir) {
    var sfx = obj.sfx;

    if (!(spk_is_active(obj) && sfx.behavior == "POSITIONAL") || sfx.disable_doppler)
        return;

    var velocity = _vec3_tmp;

    if (dir)
        m_vec3.copy(dir, velocity);
    else
        m_vec3.copy(sfx.direction, velocity);

    m_vec3.scale(velocity, speed, velocity);

    var panner = sfx.panner_node;
    panner.setVelocity(velocity[0], velocity[1], velocity[2]);
    m_vec3.copy(velocity, sfx.speed_avg);

    var pos = m_tsr.get_trans_view(obj.render.world_tsr);
    m_vec3.copy(pos, sfx.last_position);
}

exports.get_spk_behavior = function(obj) {
    return obj.sfx.behavior;
}

exports.check_active_speakers = function() {
    for (var i = 0; i < _speaker_objects.length; i++)
        if (spk_is_active(_speaker_objects[i]))
            return true;

    return false;
}

function spk_is_active(obj) {

    var sfx = obj.sfx;

    if (sfx && (sfx.state == SPKSTATE_PLAY ||
                sfx.state == SPKSTATE_PAUSE ||
                sfx.state == SPKSTATE_STOP ||
                sfx.state == SPKSTATE_FINISH))
        return true;
    else
        return false;
}


/**
 * Calculate fallback gain according to position of the source and listener
 * @deprecated By pos_obj_fallback() deprecation
 */
function calc_distance_gain(pos, pos_lis, dist_ref, dist_max, atten) {
    var x = pos[0];
    var y = pos[1];
    var z = pos[2];
    var x0 = pos_lis[0];
    var y0 = pos_lis[1];
    var z0 = pos_lis[2];

    var gain;

    var dist = Math.sqrt(Math.pow((x-x0), 2) +
                         Math.pow((y-y0), 2) +
                         Math.pow((z-z0), 2));

    if (dist < dist_ref)
        gain = 1;
    else if (dist > dist_max)
        gain = 0.0;
    else
        // inverse distance model (see OpenAl spec)
        var gain =  dist_ref / (dist_ref + atten * (dist - dist_ref));

    return gain;
}

/**
 * Calculate source node gain value.
 */
function calc_gain(sfx) {
    var volume = sfx.muted ? 0 : sfx.volume;
    return volume;
}

exports.set_master_volume = function(volume) {
    var scene_sfx = _active_scene._sfx;
    if (scene_sfx) {
        scene_sfx.volume = volume;
        if (_wa)
            scene_sfx.gain_node.gain.value = calc_gain(scene_sfx);
    }
}

exports.get_master_volume = function() {
    var scene_sfx = _active_scene._sfx;
    if (scene_sfx)
        return scene_sfx.volume;
    else
        return 0;
}

exports.set_volume = function(obj, volume) {
    var sfx = obj.sfx;

    sfx.volume = volume;

    if (spk_is_active(obj))
        sfx.gain_node.gain.value = calc_gain(sfx);
}

exports.get_volume = function(obj) {
    return obj.sfx.volume;
}

exports.mute = function(obj, muted) {
    obj.sfx.muted = Boolean(muted);

    if (spk_is_active(obj))
        obj.sfx.gain_node.gain.value = calc_gain(obj.sfx);
}

exports.is_muted = function(obj) {
    return obj.sfx.muted;
}

exports.mute_master = function(muted) {
    var scene_sfx = _active_scene._sfx;
    if (scene_sfx) {
        scene_sfx.muted = Boolean(muted);
        if (_wa)
            scene_sfx.gain_node.gain.value = calc_gain(scene_sfx);
    }
}

exports.is_master_muted = function() {
    var scene_sfx = _active_scene._sfx;
    if (scene_sfx)
        return scene_sfx.muted;
    else
        return false;
}

exports.get_speaker_objects = function() {
    return _speaker_objects;
}

exports.pause = function() {
    for (var i = 0; i < _speaker_objects.length; i++)
        speaker_pause(_speaker_objects[i]);
}

exports.resume = function() {
    for (var i = 0; i < _speaker_objects.length; i++)
        speaker_resume(_speaker_objects[i]);
}

exports.set_compressor_params = function(scene, params) {
    // silently ignore
    if (!(scene._sfx && scene._sfx.compressor_node))
        return;

    var compressor = scene._sfx.compressor_node;

    compressor.threshold.value = params["threshold"];
    compressor.knee.value = params["knee"];
    compressor.ratio.value = params["ratio"];
    compressor.attack.value = params["attack"];
    compressor.release.value = params["release"];
}

exports.get_compressor_params = function(scene) {
    if (!(scene._sfx && scene._sfx.compressor_node))
        return null;

    var compressor = scene._sfx.compressor_node;

    var params = {
        "threshold" : compressor.threshold.value,
        "knee" : compressor.knee.value,
        "ratio" : compressor.ratio.value,
        "attack" : compressor.attack.value,
        "release" : compressor.release.value
    }

    return params;
}

exports.duck = function(obj, value, time) {
    if (!spk_is_active(obj))
        return;

    var sfx = obj.sfx;

    var fade_gnode = sfx.fade_gain_node;

    var current_time = _wa.currentTime;

    fade_gnode.gain.setValueAtTime(fade_gnode.gain.value, current_time);
    fade_gnode.gain.linearRampToValueAtTime(value, current_time + time);

    sfx.duck_time = time;
}

exports.unduck = function(obj) {
    if (!spk_is_active(obj))
        return;

    var sfx = obj.sfx;

    var fade_gnode = sfx.fade_gain_node;

    var current_time = _wa.currentTime;

    fade_gnode.gain.setValueAtTime(fade_gnode.gain.value, current_time);
    fade_gnode.gain.linearRampToValueAtTime(1, current_time + sfx.duck_time);

    sfx.duck_time = 0;
}

exports.duck_master = function(value, time) {
    if (!_wa)
        return;

    var scene_sfx = _active_scene._sfx;
    var fade_gnode = scene_sfx.fade_gain_node;

    var current_time = _wa.currentTime;

    fade_gnode.gain.setValueAtTime(fade_gnode.gain.value, current_time);
    fade_gnode.gain.linearRampToValueAtTime(value, current_time + time);

    scene_sfx.duck_time = time;
}

exports.unduck_master = function() {
    if (!_wa)
        return;

    var scene_sfx = _active_scene._sfx;
    var fade_gnode = scene_sfx.fade_gain_node;

    var current_time = _wa.currentTime;

    fade_gnode.gain.setValueAtTime(fade_gnode.gain.value, current_time);
    fade_gnode.gain.linearRampToValueAtTime(1, current_time + scene_sfx.duck_time);

    scene_sfx.duck_time = 0;
}

exports.apply_playlist = function(objs, delay, random) {

    _playlist = {
        active : -1,
        active_start_time : 0,
        random: random,
        speakers : [],
        durations: []
    }

    for (var i = 0; i < objs.length; i++) {
        var obj = objs[i];

        var duration = get_duration(obj);

        if (duration == 0) {
            m_print.warn("Ignoring speaker with zero duration: " + obj.name);
            continue;
        }

        stop(obj);

        var sfx = obj.sfx;
        sfx.cyclic = false;

        _playlist.speakers.push(obj);
        _playlist.durations.push(duration + delay);
    }
}

exports.get_duration = get_duration;
function get_duration(obj) {

    var sfx = obj.sfx;

    if (sfx.behavior == "POSITIONAL" || sfx.behavior == "BACKGROUND_SOUND") {
        var buffer = sfx.src;

        if (buffer)
            return buffer.duration;
        else
            return 0;
    } else {
        var audio = sfx.src;
        if (audio)
            return audio.duration;
        else
            return 0;
    }
}

exports.clear_playlist = function() {
    if (_playlist) {
        var spks = _playlist.speakers;
        for (var i = 0; i < spks.length; i++)
            stop(spks[i]);
    }
    _playlist = null;
}

exports.get_positional_params = function(obj) {
    var sfx = obj.sfx;
    if (!sfx || sfx.behavior != "POSITIONAL")
        return null;

    var pos_params = {
        "dist_ref": sfx.dist_ref,
        "dist_max": sfx.dist_max,
        "attenuation": sfx.attenuation
    }

    return pos_params;

}

exports.set_positional_params = function(obj, params) {
    var sfx = obj.sfx;
    if (!sfx || sfx.behavior != "POSITIONAL")
        return;

    sfx.dist_ref = params["dist_ref"];
    sfx.dist_max = params["dist_max"];
    sfx.attenuation = params["attenuation"];

    var ap = sfx.panner_node;
    if (ap) {
        ap.refDistance = sfx.dist_ref;
        ap.maxDistance = sfx.dist_max;
        ap.rolloffFactor = sfx.attenuation;
    }
}

exports.set_filter_params = function(obj, params) {
    var sfx = obj.sfx;
    if (!sfx || !sfx.filter_node)
        return;

    sfx.filter_node.frequency.value = params["freq"];
    sfx.filter_node.Q.value = params["Q"];
    sfx.filter_node.gain.value = params["gain"];
}

exports.get_filter_params = function(obj) {
    var sfx = obj.sfx;
    if (!sfx || !sfx.filter_node)
        return null;

    var params = {
        "freq": sfx.filter_node.frequency.value,
        "Q": sfx.filter_node.Q.value,
        "gain": sfx.filter_node.gain.value
    }

    return params;
}

exports.get_filter_freq_response = function(obj, freq_arr, mag_arr, phase_arr) {
    var sfx = obj.sfx;
    if (!sfx || !sfx.filter_node)
        return null;

    sfx.filter_node.getFrequencyResponse(freq_arr, mag_arr, phase_arr);
}

}

