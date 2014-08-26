"use strict";

/**
 * Scheduler internal API.
 * @name nla
 * @namespace
 * @exports exports as nla
 */
b4w.module["__nla"] = function(exports, require) {

var m_anim      = require("__animation");
var m_cam       = require("__camera");
var m_cfg       = require("__config");
var m_loader    = require("__loader");
var m_particles = require("__particles");
var m_print     = require("__print");
var m_scenes    = require("__scenes");
var m_sfx       = require("__sfx");
var m_util      = require("__util");

var cfg_ani = m_cfg.animation;

var _nla_arr = [];
var _start_time = -1;

exports.update_scene_nla = function(scene, is_cyclic) {
    var nla = {
        frame_start: scene["frame_start"],
        frame_end: scene["frame_end"],
        last_frame: -1,
        cyclic: is_cyclic,
        objects: []
    }

    var sobjs = m_scenes.get_scene_objs(scene, "ALL", m_scenes.DATA_ID_ALL);

    for (var i = 0; i < sobjs.length; i++) {
        var sobj = sobjs[i];

        var adata = sobj["animation_data"];
        if (adata && adata["nla_tracks"].length) {
            var nla_tracks = adata["nla_tracks"];

            if (m_util.is_armature(sobj) || m_cam.is_camera(sobj) || m_util.is_mesh(sobj)) {
                var nla_events = get_nla_events(nla_tracks);
                sobj._nla_events = nla_events;
                nla.objects.push(sobj);
            }

            if (m_sfx.is_speaker(sobj)) {
                var nla_events = get_nla_events(nla_tracks);
                sobj._nla_events = nla_events;
                nla.objects.push(sobj);
            }
        }
    }

    for (var i = 0; i < sobjs.length; i++) {
        var sobj = sobjs[i];

        for (var j = 0; j < nla.objects.length; j++)
            if (m_anim.get_first_armature_object(sobj) == nla.objects[j]) {
                sobj._nla_events = m_util.clone_object_json(nla.objects[j]._nla_events);
                nla.objects.push(sobj);
            }

        if (m_particles.has_particles(sobj) &&
                m_particles.has_anim_particles(sobj)) {

            var ev = {
                frame_start: nla.frame_start,
                frame_end: nla.frame_end+1,
                frame_offset: 0,
                scheduled: false,
                action: null
            }
            sobj._nla_events = [ev];
            nla.objects.push(sobj);
        }
    }

    enforce_nla_consistency(nla);

    _nla_arr.push(nla);
}

function enforce_nla_consistency(nla) {

    var start = nla.frame_start;
    var end = nla.frame_end;

    for (var i = 0; i < nla.objects.length; i++) {
        var obj = nla.objects[i];

        var nla_events = obj._nla_events;

        for (var j = 0; j < nla_events.length; j++) {
            var ev = nla_events[j];

            // for possible warnings
            var strip_str = obj["name"] + " [" + ev.frame_start + ":" +
                    ev.frame_end + "]";

            ev.frame_offset = Math.max(0, start - ev.frame_start);
            ev.frame_start = Math.max(start, ev.frame_start);
            ev.frame_end = Math.min(end+1, ev.frame_end);

            // out of scene range
            if (ev.frame_start > ev.frame_end) {
                m_print.warn("NLA: out of scene range: " + strip_str);
                nla_events.splice(j, 1);
                j--;
            }
        }
    }
}

/**
 * Called every frame
 */
exports.update = function(timeline, elapsed) {

    // NOTE: need explicit start
    if (_start_time == -1)
        _start_time = timeline;

    for (var i = 0; i < _nla_arr.length; i++) {
        var nla = _nla_arr[i];

        var cf = (timeline - _start_time) * cfg_ani.framerate - nla.frame_start;
        if (nla.cyclic) {
            var stride = nla.frame_end - nla.frame_start + 1;
            cf %= stride;
        }
        cf += nla.frame_start;

        for (var j = 0; j < nla.objects.length; j++) {
            var obj = nla.objects[j];
            var nla_events = obj._nla_events;

            // handle missed stops from previous iteration
            for (var k = 0; k < nla_events.length; k++) {
                var ev = nla_events[k];

                if (cf < nla.last_frame && ev.scheduled) {
                    process_event_stop(obj, ev, cf, nla.last_frame);
                    ev.scheduled = false;
                }
            }

            for (var k = 0; k < nla_events.length; k++) {
                var ev = nla_events[k];

                if ((cf < nla.last_frame || nla.last_frame < ev.frame_start) &&
                        ev.frame_start <= cf) {
                    if (!ev.scheduled) {
                        process_event_start(obj, ev, cf, elapsed);
                        ev.scheduled = true;
                    }
                }

                if (nla.last_frame < ev.frame_end && ev.frame_end <= cf) {
                    if (ev.scheduled) {
                        process_event_stop(obj, ev, cf, nla.last_frame);
                        ev.scheduled = false;
                    }
                }
            }
        }

        nla.last_frame = cf;
    }
}

function process_event_start(obj, ev, frame, elapsed) {

    // subtract elapsed because play() occures before animation calcuations
    var init_anim_frame = ev.frame_offset - elapsed * cfg_ani.framerate;

    if (m_particles.has_particles(obj) && m_particles.has_anim_particles(obj)) {
        m_anim.apply_def(obj);
        m_anim.set_behavior(obj, m_anim.AB_FINISH_STOP, m_anim.SLOT_0);
        m_anim.set_current_frame_float(obj, init_anim_frame, m_anim.SLOT_0);
        m_anim.play(obj, null, m_anim.SLOT_0);
    } else if (m_util.is_armature(obj) || m_util.is_mesh(obj) || m_cam.is_camera(obj)) {
        m_anim.apply(obj, ev.action, m_anim.SLOT_0);
        // NOTE: should not be required
        m_anim.set_behavior(obj, m_anim.AB_FINISH_STOP, m_anim.SLOT_0);
        m_anim.set_current_frame_float(obj, init_anim_frame, m_anim.SLOT_0);
        m_anim.play(obj, null, m_anim.SLOT_0);
    } else if (m_sfx.is_speaker(obj)) {
        // TODO: speakers are special
        var when = 0;
        var duration = (ev.frame_end - frame) / cfg_ani.framerate;
        m_sfx.play(obj, when, duration);
    }
}

function process_event_stop(obj, ev, frame) {
    if (m_particles.has_particles(obj) && m_particles.has_anim_particles(obj))
        m_anim.stop(obj, m_anim.SLOT_0);
    else if (m_util.is_armature(obj) || m_util.is_mesh(obj) || m_cam.is_camera(obj))
        m_anim.stop(obj, m_anim.SLOT_0);
}

exports.cleanup = function() {
    _nla_arr.length = 0;
    _start_time = -1;
}

/**
 * Convert NLA tracks to events
 */
function get_nla_events(nla_tracks) {

    var nla_events = [];

    for (var i = 0; i < nla_tracks.length; i++) {
        var track = nla_tracks[i];

        var strips = track["strips"];
        if (!strips)
            continue;

        for (var j = 0; j < strips.length; j++) {
            var strip = strips[j];

            var ev = {
                frame_start: strip["frame_start"],
                frame_end: strip["frame_end"],
                frame_offset: 0,
                scheduled: false,
                action: strip["action"] ? strip["action"]["name"] : null
            };

            nla_events.push(ev);
        }
    }
    return nla_events;
}

}
