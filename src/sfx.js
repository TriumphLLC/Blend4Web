"use strict";

/**
 * Sound effects internal API.
 * @name sfx
 * @namespace
 * @exports exports as sfx
 */
b4w.module["__sfx"] = function(exports, require) {

var m_cfg   = require("__config");
var m_dbg   = require("__debug");
var m_print = require("__print");
var m_util  = require("__util");

var m_vec3 = require("vec3");

var cfg_ani = m_cfg.animation;
var cfg_sfx = m_cfg.sfx;

var SPEED_WARM_STEPS = 10;
var SPEED_SMOOTH_PERIOD = 0.3;

// permanent vars
var _supported_media = [];
var _wa_context = null;

var _active_scene = null;
var _listener_last_eye = new Float32Array(3);
var _listener_speed_avg = new Float32Array(3);

// NOTE: listener warm-up steps
var _listener_speed_warm = SPEED_WARM_STEPS;

var _speaker_objects = [];

var _vec3_tmp = new Float32Array(3);
var _vec3_tmp2 = new Float32Array(3);
var _vec3_tmp3 = new Float32Array(3);

var _seed_tmp = [1];

var _playlist = null;

var SPKSTATE_UNDEFINED  = 10;
var SPKSTATE_PLAY       = 20
var SPKSTATE_STOP       = 30;
var SPKSTATE_PAUSE      = 40;

// NOTE: 60 min for 3s loops
var SCHED_PARAMS = 1200;

// audio source types
exports.AST_NONE         = 10;
exports.AST_ARRAY_BUFFER = 20;
exports.AST_HTML_ELEMENT = 30;

/**
 * Initialize sound effects module
 */
exports.init = function() {
    // NOTE: DOM Exception 5 if not found
    var audio = document.createElement("audio");

    // do not detect codecs here, simply follow the rules:
    // ogg - vorbis
    // mp3 - mp3
    // mp4 - aac
    if (audio.canPlayType) {
        if (audio.canPlayType("audio/ogg") != "")
            _supported_media.push("ogg");
        if (audio.canPlayType("audio/mpeg") != "")
            _supported_media.push("mp3");
        if (audio.canPlayType("audio/mp4") != "")
            _supported_media.push("mp4");
    }

    // NOTE: register context once and reuse for all loaded scenes to prevent
    // out-of-resources error during Chromium context leaks
    _wa_context = cfg_sfx.webaudio ? create_wa_context() : null;

    if (_wa_context)
        m_print.log("%cINIT WEBAUDIO: " + _wa_context.sampleRate + "Hz", "color: #00a");
}

exports.attach_scene_sfx = function(scene) {

    var scene_sfx = {};
    scene._sfx = scene_sfx;

    if (_wa_context) {
        var gnode = _wa_context.createGain();
        var fade_gnode = _wa_context.createGain();

        scene_sfx.gain_node = gnode;
        scene_sfx.fade_gain_node = fade_gnode;

        gnode.connect(fade_gnode);
        fade_gnode.connect(_wa_context.destination);

        if (scene["b4w_enable_dynamic_compressor"]) {
            var compressor = _wa_context.createDynamicsCompressor();

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

        var listener = _wa_context.listener;
        listener.dopplerFactor = scene["audio_doppler_factor"];
        listener.speedOfSound = scene["audio_doppler_speed"];

        scene_sfx.muted = false;
        scene_sfx.volume = 1;
        scene_sfx.duck_time = 0;
    }
}

function create_wa_context() {

    var AudioContext = window["AudioContext"] || window["webkitAudioContext"];
    if (AudioContext) {
        var ctx = new AudioContext();
        // simple WebAudio version check
        if (ctx.createGain) {
            return ctx;
        } else {
            m_print.warn("B4W warning: deprecated WebAudio implementation");
            return null;
        }
    } else {
        m_print.warn("B4W warning: WebAudio is not supported");
        return null;
    }
}


exports.set_active_scene = function(scene) {
    _active_scene = scene;
}

/**
 * Detect supported audio containter.
 * Containers have same meaning as file extension here, for each one possible
 * fallback exists:
 * <ul>
 * <li>ogg -> mp4
 * <li>mp3 -> ogg
 * <li>mp4 -> ogg
 * </ul>
 * @param {String} [hint="ogg"] Required container
 * @returns {String} Supported containter or ""
 */
exports.detect_media_container = function(hint) {
    if (!hint)
        var hint = "ogg";

    var audio = new Audio();

    // only one fallback required in most cases

    // requested hint is supported
    if (_supported_media.indexOf(hint) > -1)
        return hint;
    // ogg -> mp4
    else if (hint == "ogg" && _supported_media.indexOf("mp4") > -1)
        return "mp4";
    // mp3 -> ogg
    else if (hint == "mp3" && _supported_media.indexOf("ogg") > -1)
        return "ogg";
    // mp4 -> ogg
    else if (hint == "mp4" && _supported_media.indexOf("ogg") > -1)
        return "ogg";
    // unsupported and no fallback
    else
        return "";
}

/**
 * Init and add speaker object to sfx
 * @param obj Object ID, must be of type "SPEAKER"
 */
exports.append_object = function(obj, scene) {
    if (obj["type"] != "SPEAKER")
        throw "Wrong speaker object";

    var speaker = obj["data"];

    obj._sfx = {};

    switch(speaker["b4w_behavior"]) {
    case "POSITIONAL":
    case "BACKGROUND_SOUND":
        obj._sfx.behavior = _wa_context ? speaker["b4w_behavior"] : "NONE";
        break;
    case "BACKGROUND_MUSIC":
        obj._sfx.behavior = _wa_context ? (check_media_element_node() ?
                "BACKGROUND_MUSIC" : "BACKGROUND_SOUND") : "NONE";
        break;
    default:
        throw "Wrong speaker behavior";
        break;
    }

    // allow speakers without sound
    if (!speaker["sound"])
        obj._sfx.behavior = "NONE";

    obj._sfx.disable_doppler = speaker["b4w_disable_doppler"];

    obj._sfx.muted = speaker["muted"];
    obj._sfx.volume = speaker["volume"];
    obj._sfx.pitch = speaker["pitch"];

    obj._sfx.attenuation = speaker["attenuation"];
    obj._sfx.dist_ref = speaker["distance_reference"];
    obj._sfx.dist_max = speaker["distance_max"] || 10000; // spec def
    obj._sfx.cone_angle_inner = speaker["cone_angle_inner"];
    obj._sfx.cone_angle_outer = speaker["cone_angle_outer"];
    obj._sfx.cone_volume_outer = speaker["cone_volume_outer"];
    obj._sfx.cyclic = speaker["b4w_cyclic_play"];
    obj._sfx.loop = speaker["b4w_loop"];

    obj._sfx.delay = speaker["b4w_delay"];
    obj._sfx.delay_random = speaker["b4w_delay_random"];

    obj._sfx.volume_random = speaker["b4w_volume_random"];
    obj._sfx.pitch_random = speaker["b4w_pitch_random"];

    obj._sfx.fade_in = speaker["b4w_fade_in"];
    obj._sfx.fade_out = speaker["b4w_fade_out"];

    obj._sfx.start_time = 0;
    obj._sfx.pause_time = 0;
    obj._sfx.buf_offset = 0;
    obj._sfx.duration = 0;

    obj._sfx.base_seed = 1;

    obj._sfx.src = null;

    // initial state
    obj._sfx.state = SPKSTATE_UNDEFINED;

    obj._sfx.last_position = new Float32Array(obj._render.trans);
    obj._sfx.speed_avg = new Float32Array(obj._render.trans);

    // for BACKGROUND_MUSIC
    obj._sfx.bgm_stop_timeout = null;

    obj._sfx.duck_time = 0;

    _speaker_objects.push(obj);
}

function check_media_element_node() {
    // NOTE: bad implementation in safari 6.0/6.1
    if (window["MediaElementAudioSourceNode"] &&
            !m_dbg.check_browser("safari")) {
        return true;
    } else {
        m_print.warn("B4W warning: MediaElementAudioSourceNode not found");
        return false;
    }
}

/**
 * Returns audio source type for given object (AST_*)
 * @param obj Object ID
 */
exports.source_type = function(obj) {
    if (obj["type"] != "SPEAKER")
        throw "Wrong object type";

    switch(obj._sfx.behavior) {
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
 * @param obj Object ID
 * @param {ArrayBuffer|<audio>} sound_data Sound Data
 */
exports.update_spkobj = function(obj, sound_data) {
    if (obj["type"] != "SPEAKER")
        throw "Wrong object type";

    var sfx = obj._sfx;

    switch(sfx.behavior) {
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

exports.decode_audio_data = function(arr_buf, decode_cb, fail_cb) {
    if (_wa_context)
        _wa_context.decodeAudioData(arr_buf, decode_cb, fail_cb);
    else
        fail_cb();
}

/**
 * NOTE: currently not used (may be buggy)
 */
exports.speaker_remove = function(obj) {
    stop(obj);

    delete obj._sfx;
    _speaker_objects.splice(_speaker_objects.indexOf(obj), 1);
}

/**
 * Perform module cleanup
 */
exports.cleanup = function() {

    for (var i = 0; i < _speaker_objects.length; i++) {
        var obj = _speaker_objects[i];
        var sfx = obj._sfx;
        if (sfx.behavior == "BACKGROUND_MUSIC") {
            var audio_el = sfx.src;
            if (audio_el)
                audio_el.pause();
        } else {
            if (sfx.source_node)
                sfx.source_node.disconnect();
        }
    }

    _active_scene = null;
    _speaker_objects.splice(0);

    _listener_last_eye[0] = 0;
    _listener_last_eye[0] = 0;
    _listener_last_eye[0] = 0;

    _listener_speed_avg[0] = 0;
    _listener_speed_avg[1] = 0;
    _listener_speed_avg[2] = 0;

    _listener_speed_warm = SPEED_WARM_STEPS;

    _playlist = null;
}

/**
 * Use blender's NLA for given speaker
 * @param obj Object ID
 */
exports.speaker_use_nla = function(obj) {
    if (obj["type"] != "SPEAKER")
        throw "Wrong object type";

    var play_events;

    var adata = obj["animation_data"];
    if (adata && adata["nla_tracks"]) {
        var nla_tracks = adata["nla_tracks"];

        obj._sfx.play_events = nla_to_play_events(nla_tracks);
    }
}

/**
 * Restart NLA for given speaker
 * @param obj Object ID
 */
exports.speaker_restart_nla = function(obj) {
    if (obj["type"] != "SPEAKER")
        throw "Wrong object type";

    if (obj._sfx.play_events) {
        stop(obj);
        exports.speaker_use_nla(obj);
    }
}

/** 
 * Convert NLA tracks to play events
 * play event - array [start, end]
 */
function nla_to_play_events(nla_tracks) {

    var play_events = [];

    for (var i = 0; i < nla_tracks.length; i++) {
        var track = nla_tracks[i];

        var strips = track["strips"];
        if (!strips)
            continue;

        for (var j = 0; j < strips.length; j++) {
            var strip = strips[j];

            var play_event = [];
            play_event.push(strip["frame_start"]);
            play_event.push(strip["frame_end"]);

            play_events.push(play_event);
        }
    }
    return play_events;
}


function frame_to_sec(frame) {
    return frame/cfg_ani.framerate;
}


/**
 * Update speaker objects used by module
 * executed every frame
 * @param {Number} elapsed Number of float seconds since previous execution
 */
exports.update = function(timeline, elapsed) {

    if (_speaker_objects.length == 0)
        return;

    // time to prepare sound play 
    var DELAY = 1;

    for (var i = 0; i < _speaker_objects.length; i++) {
        var obj = _speaker_objects[i];
        var sfx = obj._sfx;

        // handle restarts
        if (!sfx.loop && sfx.cyclic && sfx.state == SPKSTATE_PLAY &&
                sfx.duration && _wa_context && (sfx.start_time + sfx.duration < _wa_context.currentTime)) {
            play_def(obj);
        }

        // handle NLA play events
        if (!obj._anim)
            continue;

        var cf = obj._anim.current_frame_float;

        var play_events = obj._sfx.play_events;
        if (!play_events)
            continue;

        var play_events_new = [];

        for (var j = 0; j < play_events.length; j++) {
            var pev = play_events[j];

            var frame_start = pev[0];
            var frame_end = pev[1];

            if (cf >= (frame_start - DELAY)) {
                var duration = frame_to_sec(frame_end - cf)
                play(obj, 0, duration);
            } else {
                // save for the next time
                play_events_new.push(pev)
            }
        }

        obj._sfx.play_events = play_events_new;
    }

    // handle playlist

    if (_playlist && (_playlist.active == -1 || timeline >
            _playlist.active_start_time + _playlist.durations[_playlist.active]))
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
/**
 * @methodOf sfx
 */
function play(obj, when, duration) {

    var sfx = obj._sfx;

    if (sfx.behavior == "NONE")
        return;

    if (!duration)
        var duration = 0.0;

    var sound = obj["data"]["sound"];


    var loop = sfx.loop;
    var playrate = sfx.pitch;

    // not ready or too late
    if (!(sfx.src && (loop || duration >= 0)))
        return;

    // initialize random sequence
    sfx.base_seed = Math.floor(50000 * Math.random());

    var start_time = _wa_context.currentTime + when;
    sfx.start_time = start_time;

    sfx.state = SPKSTATE_PLAY;

    update_proc_chain(obj);

    if (sfx.behavior == "POSITIONAL" ||
            sfx.behavior == "BACKGROUND_SOUND") {

        var source = _wa_context.createBufferSource();

        source.buffer = sfx.src;
        source.playbackRate.value = playrate;

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

        schedule_volume_pitch_random(obj, start_time);

    } else if (sfx.behavior == "BACKGROUND_MUSIC") {

        window.clearTimeout(sfx.bgm_stop_timeout);

        fire_audio_element(obj);

        // NOTE: <audio> duration currently not supported
        sfx.duration = 1000000;
    }

    schedule_fades(sfx, start_time);
}

/**
 * Update WA processing chain (routing graph) for given speaker.
 */
function update_proc_chain(obj) {

    var sfx = obj._sfx;

    if (sfx.proc_chain_in)
        return;

    var pos = obj._render.trans;
    var quat = obj._render.quat;

    if (cfg_sfx.mix_mode) {
        var filter_node = _wa_context.createBiquadFilter();
        filter_node.type = "peaking";
    } else
        var filter_node = null;

    // mandatory fade-in/out gain node
    var fade_gnode = _wa_context.createGain();

    switch (sfx.behavior) {
    // panner->filter->gain->fade->rand
    case "POSITIONAL":
        var ap = _wa_context.createPanner();
        // NOTE: HRTF panning gives too much volume gain
        // NOTE: string enums specified in the new spec
        ap.panningModel = ap.EQUALPOWER;
        //ap.panningModel = "equalpower";

        ap.distanceModel = ap.INVERSE_DISTANCE;
        //ap.distanceModel = "linear";
        //ap.distanceModel = "exponential";
        //ap.distanceModel = "inverse";

        ap.setPosition(pos[0], pos[1], pos[2]);
        
        var orient = _vec3_tmp;
        m_util.quat_to_dir(quat, m_util.AXIS_MY, orient);
        ap.setOrientation(orient[0], orient[1], orient[2]);

        ap.refDistance = sfx.dist_ref;
        ap.maxDistance = sfx.dist_max;
        ap.rolloffFactor = sfx.attenuation;

        ap.coneInnerAngle = sfx.cone_angle_inner;
        ap.coneOuterAngle = sfx.cone_angle_outer;
        ap.coneOuterGain = sfx.cone_volume_outer;

        var gnode = _wa_context.createGain();
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
            var rand_gnode = _wa_context.createGain();
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

        var gnode = _wa_context.createGain();
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
            var rand_gnode = _wa_context.createGain();
            fade_gnode.connect(rand_gnode);
            rand_gnode.connect(get_scene_dst_node(_active_scene));
        } else {
            var rand_gnode = null;
            fade_gnode.connect(get_scene_dst_node(_active_scene));
        }

        break;
    // filter->fade
    case "BACKGROUND_MUSIC":
        var ap = null;
        var gnode = null;
        var rand_gnode = null;

        if (filter_node) {
            filter_node.connect(fade_gnode);
            sfx.proc_chain_in = filter_node;
        } else {
            sfx.proc_chain_in = fade_gnode;
        }

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
    var sfx = obj._sfx;

    var duration = sfx.duration;
    var delay = sfx.delay + sfx.delay_random * Math.random();
    play(obj, delay, duration);
}

function get_scene_dst_node(scene) {
    if (_wa_context)
        return scene._sfx.proc_chain_in;
    else
        return null;
}

function get_gain_node(scene) {
    if (_wa_context)
        return scene._sfx.gain_node;
    else
        return null;
}

function get_fade_node(scene) {
    if (_wa_context)
        return scene._sfx.fade_gain_node;
    else
        return null;
}

function schedule_volume_pitch_random(obj, from_time) {
    var sfx = obj._sfx;

    // optimization
    if (!(sfx.volume_random || sfx.pitch_random))
        return;

    var rand_gnode = sfx.rand_gain_node;
    var source = sfx.source_node;

    var buf_dur = source.buffer ? source.buffer.duration : 0;
    if (!buf_dur)
        return;

    if (sfx.volume_random)
        rand_gnode.gain.cancelScheduledValues(from_time);

    if (sfx.pitch_random)
        source.playbackRate.cancelScheduledValues(from_time);

    var time = from_time;

    // deterministic randomization for pitch only
    _seed_tmp[0] = sfx.base_seed;

    // NOTE: performance issues for large SCHED_PARAMS values
    for (var i = 0; i < SCHED_PARAMS; i++) {
        if (sfx.volume_random) {
            var gain = 1 - m_util.clamp(sfx.volume_random, 0, 1) * Math.random();
            rand_gnode.gain.setValueAtTime(gain, time);
        }

        var playrate = sfx.pitch + sfx.pitch_random * m_util.rand_r(_seed_tmp);

        if (sfx.pitch_random)
            source.playbackRate.setValueAtTime(playrate, time);

        time += buf_dur / playrate;
    }
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
    var sfx = obj._sfx;
    var audio = sfx.src;
    if (audio) {
        audio.volume = calc_audio_el_volume(obj);
        audio.loop = sfx.cyclic;

        // NOTE: audio element will be invalidated after construction execution,
        // so use previous MediaElementSourceNode
        sfx.source_node = sfx.source_node || 
                _wa_context.createMediaElementSource(audio);

        sfx.source_node.connect(sfx.proc_chain_in);

        if (sfx.state == SPKSTATE_PLAY)
            audio.play();
    }
}

exports.stop = stop;
/**
 * Stop to play from given speaker
 * @param sobj Object ID
 * @methodOf sfx
 */
function stop(sobj) {
    if (sobj["type"] != "SPEAKER")
        throw "Wrong object type";

    var sfx = sobj._sfx;

    if (sfx.state != SPKSTATE_PLAY && sfx.state != SPKSTATE_PAUSE)
        return;

    var fade_gnode = sfx.fade_gain_node;
    var current_time = _wa_context.currentTime;

    if (sfx.fade_out) {
        fade_gnode.gain.setValueAtTime(fade_gnode.gain.value, current_time);
        fade_gnode.gain.linearRampToValueAtTime(0, current_time + sfx.fade_out);
    }

    if (sfx.behavior == "BACKGROUND_MUSIC") {
        var audio_el = sfx.src;
        if (audio_el) {
            var stop_cb = function() {
                // exact sequence
                // can't change this value for empty tag
                if (audio_el.currentTime)
                    audio_el.currentTime = 0;
                audio_el.pause();
            }
            sfx.bgm_stop_timeout = window.setTimeout(stop_cb,
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

exports.is_play = is_play;
function is_play(obj) {
    return (obj._sfx.state == SPKSTATE_PLAY);
}

/** 
 * Pause speaker.
 * @param obj Speaker object ID
 */
function speaker_pause(obj) {

    var sfx = obj._sfx;

    if (sfx.state != SPKSTATE_PLAY)
        return;

    if (sfx.behavior == "BACKGROUND_MUSIC") {
        var audio_el = sfx.src;
        if (audio_el)
            audio_el.pause();
    } else {
        var source = sfx.source_node;
        var playrate = source.playbackRate.value;

        var current_time = _wa_context.currentTime;
        sfx.pause_time = current_time;

        var buf_dur = source.buffer.duration;

        if (current_time > sfx.start_time)
            sfx.buf_offset = calc_buf_offset(sfx, current_time);
        else
            sfx.buf_offset = 0;

        sfx.source_node.stop(0);
        sfx.source_node.disconnect();
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

/** 
 * Resume speaker.
 * @param obj Speaker object ID
 */
function speaker_resume(obj) {

    var sfx = obj._sfx;

    if (sfx.state != SPKSTATE_PAUSE)
        return;
    
    if (sfx.behavior == "BACKGROUND_MUSIC") {
        var audio_el = sfx.src;
        audio_el.play();
    } else {
        update_source_node(obj);
        var current_time = _wa_context.currentTime;
        sfx.start_time += (current_time - sfx.pause_time);

        var source = sfx.source_node;
        var playrate = source.playbackRate.value;

        var buf_dur = source.buffer.duration;

        source.start(sfx.start_time, sfx.buf_offset);

        schedule_volume_pitch_random(obj, sfx.start_time);
        schedule_fades(sfx, sfx.start_time);
    }

    sfx.state = SPKSTATE_PLAY;
}

function update_source_node(obj) {
    var sfx = obj._sfx;

    var source = _wa_context.createBufferSource();

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
    var sfx = obj._sfx;

    sfx.pitch = playrate;

    if (spk_is_active(obj) && (sfx.behavior == "POSITIONAL" ||
                sfx.behavior == "BACKGROUND_SOUND")) {
        sfx.source_node.playbackRate.value = playrate;
        schedule_volume_pitch_random(obj, sfx.start_time);
    }

    // NOTE: Consider BACKGROUND_MUSIC implementation
}

exports.get_playrate = function(obj) {
    return obj._sfx.pitch;
}


exports.cyclic = function(obj, cyclic) {
    obj._sfx.cyclic = Boolean(cyclic);
}

exports.is_cyclic = is_cyclic;
function is_cyclic(obj) {
    return obj._sfx.cyclic;
}

/**
 * Update position, speed and orientation of the listener (camera)
 */
exports.listener_update_transform = function(scene, trans, quat, elapsed) {

    // NOTE: hack
    if (!_wa_context)
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

    var listener = _wa_context.listener;
    listener.setPosition(trans[0], trans[1], trans[2]);
    listener.setOrientation(front[0], front[1], front[2], up[0], up[1], up[2]);

    if (elapsed) {
        var speed = _vec3_tmp3;

        speed[0] = (trans[0] - _listener_last_eye[0])/elapsed;
        speed[1] = (trans[1] - _listener_last_eye[1])/elapsed;
        speed[2] = (trans[2] - _listener_last_eye[2])/elapsed;

        m_util.smooth_v(speed, _listener_speed_avg, elapsed,
                SPEED_SMOOTH_PERIOD, speed);

        if (!_listener_speed_warm)
            listener.setVelocity(speed[0], speed[1], speed[2]);
        else
            _listener_speed_warm--;

        _listener_speed_avg[0] = speed[0];
        _listener_speed_avg[1] = speed[1];
        _listener_speed_avg[2] = speed[2];

        _listener_last_eye[0] = trans[0];
        _listener_last_eye[1] = trans[1];
        _listener_last_eye[2] = trans[2];
    }
}

exports.listener_reset_speed = function() {
    // NOTE: hack
    if (!_wa_context)
        return;

    var listener = _wa_context.listener;
    listener.setVelocity(0, 0, 0);

    _listener_speed_avg[0] = 0;
    _listener_speed_avg[1] = 0;
    _listener_speed_avg[2] = 0;
}

/**
 * Update speaker position, orientation and velocity.
 */
exports.speaker_update_transform = function(obj, elapsed) {

    var sfx = obj._sfx;

    if (!(spk_is_active(obj) && sfx.behavior == "POSITIONAL"))
        return;

    var pos = obj._render.trans;
    var panner = sfx.panner_node;
    panner.setPosition(pos[0], pos[1], pos[2]);

    var orient = _vec3_tmp;
    m_util.quat_to_dir(obj._render.quat, m_util.AXIS_MY, orient);
    panner.setOrientation(orient[0], orient[1], orient[2]);

    if (!sfx.disable_doppler && elapsed) {
        var lpos = sfx.last_position;

        var speed = _vec3_tmp2;
        speed[0] = (pos[0] - lpos[0]) / elapsed;
        speed[1] = (pos[1] - lpos[1]) / elapsed;
        speed[2] = (pos[2] - lpos[2]) / elapsed;

        m_util.smooth_v(speed, sfx.speed_avg, elapsed,
                SPEED_SMOOTH_PERIOD, speed);

        panner.setVelocity(speed[0], speed[1], speed[2]);

        sfx.speed_avg[0] = speed[0];
        sfx.speed_avg[1] = speed[1];
        sfx.speed_avg[2] = speed[2];

        lpos[0] = pos[0];
        lpos[1] = pos[1];
        lpos[2] = pos[2];
    }
}

exports.speaker_reset_speed = function(obj) {
    var sfx = obj._sfx;

    if (!(spk_is_active(obj) && sfx.behavior == "POSITIONAL"))
        return;

    var panner = sfx.panner_node;
    panner.setVelocity(0, 0, 0);

    sfx.speed_avg[0] = 0;
    sfx.speed_avg[1] = 0;
    sfx.speed_avg[2] = 0;

    var pos = obj._render.trans;
    var lpos = sfx.last_position;

    lpos[0] = pos[0];
    lpos[1] = pos[1];
    lpos[2] = pos[2];
}

exports.is_speaker = is_speaker;
/**
 * Check if object is a valid speaker
 */
function is_speaker(obj) {
    if (obj._sfx)
        return true;
    else
        return false;
}

exports.get_spk_behavior = function(obj) {
    return obj._sfx.behavior;
}

function spk_is_active(obj) {
    if (obj._sfx && (obj._sfx.state == SPKSTATE_PLAY ||
                obj._sfx.state == SPKSTATE_PAUSE || 
                obj._sfx.state == SPKSTATE_STOP))
        return true;
    else 
        return false;
}


/**
 * Change volume of object according to it's position and _master_volume
 * @deprecated ugly implementation
 */
function pos_obj_fallback(obj, master_volume) {

    var pos = obj._render.trans;
    var pos_lis;

    if (_listener_last_eye)
        pos_lis = _listener_last_eye;
    else
        pos_lis = [0,0,0];

    if (obj._sfx.use_panning) {
        var dist_ref = obj._sfx.dist_ref;
        var dist_max = obj._sfx.dist_max;
        var atten = obj._sfx.attenuation;

        var gain = calc_distance_gain(pos, pos_lis, dist_ref, dist_max, atten);
    } else
        var gain = 1;

    var audio_el = obj._sfx.src;
    audio_el.volume = gain * calc_audio_el_volume(obj);
};

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
 * Calculate audio element value.
 */
function calc_audio_el_volume(obj) {
    var volume = obj._sfx.muted ? 0 : obj._sfx.volume;
    return Math.min(volume, 1.0);
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
        if (_wa_context)
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
    var sfx = obj._sfx;

    sfx.volume = volume;

    if (spk_is_active(obj)) {
        if (sfx.behavior == "BACKGROUND_MUSIC")
            sfx.src.volume = calc_audio_el_volume(obj);
        else
            sfx.gain_node.gain.value = calc_gain(sfx);
    }
}

exports.get_volume = function(obj) {
    return obj._sfx.volume;
}

exports.mute = function(obj, muted) {
    obj._sfx.muted = Boolean(muted);

    if (spk_is_active(obj)) {
        if (obj._sfx.behavior == "BACKGROUND_MUSIC") {
            var audio_elem = obj._sfx.src;
            if (audio_elem)
                audio_elem.volume = calc_audio_el_volume(obj);
            else
                m_print.warn("B4W Warning: could not mute sound (no audio element)");
        } else {
            obj._sfx.gain_node.gain.value = calc_gain(obj._sfx);
        }
    }
}

exports.is_muted = function(obj) {
    return obj._sfx.muted;
}

exports.mute_master = function(muted) {
    var scene_sfx = _active_scene._sfx;
    if (scene_sfx) {
        scene_sfx.muted = Boolean(muted);
        if (_wa_context)
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

    var sfx = obj._sfx;

    var fade_gnode = sfx.fade_gain_node;

    var current_time = _wa_context.currentTime;

    fade_gnode.gain.setValueAtTime(fade_gnode.gain.value, current_time);
    fade_gnode.gain.linearRampToValueAtTime(value, current_time + time);

    sfx.duck_time = time;
}

exports.unduck = function(obj) {
    if (!spk_is_active(obj))
        return;

    var sfx = obj._sfx;

    var fade_gnode = sfx.fade_gain_node;

    var current_time = _wa_context.currentTime;

    fade_gnode.gain.setValueAtTime(fade_gnode.gain.value, current_time);
    fade_gnode.gain.linearRampToValueAtTime(1, current_time + sfx.duck_time);

    sfx.duck_time = 0;
}

exports.duck_master = function(value, time) {
    if (!_wa_context)
        return;

    var scene_sfx = _active_scene._sfx;
    var fade_gnode = scene_sfx.fade_gain_node;

    var current_time = _wa_context.currentTime;

    fade_gnode.gain.setValueAtTime(fade_gnode.gain.value, current_time);
    fade_gnode.gain.linearRampToValueAtTime(value, current_time + time);

    scene_sfx.duck_time = time;
}

exports.unduck_master = function() {
    if (!_wa_context)
        return;

    var scene_sfx = _active_scene._sfx;
    var fade_gnode = scene_sfx.fade_gain_node;

    var current_time = _wa_context.currentTime;

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
        var sfx = obj._sfx;

        stop(obj);

        _playlist.speakers.push(obj);

        var duration = spk_duration(obj);
        _playlist.durations.push(duration + delay);
    }
}

function spk_duration(obj) {

    var sfx = obj._sfx;

    if (sfx.behavior == "POSITIONAL" || sfx.behavior == "BACKGROUND_SOUND") {
        var source = sfx.source_node;

        if (source && source.buffer)
            return source.buffer.duration;
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
    var sfx = obj._sfx;
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
    var sfx = obj._sfx;
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
    var sfx = obj._sfx;
    if (!sfx || !sfx.filter_node)
        return;

    sfx.filter_node.frequency.value = params["freq"];
    sfx.filter_node.Q.value = params["Q"];
    sfx.filter_node.gain.value = params["gain"];
}

exports.get_filter_params = function(obj) {
    var sfx = obj._sfx;
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
    var sfx = obj._sfx;
    if (!sfx || !sfx.filter_node)
        return null;

    sfx.filter_node.getFrequencyResponse(freq_arr, mag_arr, phase_arr);
}

}

