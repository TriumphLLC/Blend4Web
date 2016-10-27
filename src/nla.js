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
 * NLA scheduler module.
 * @name nla
 * @namespace
 * @exports exports as nla
 */
b4w.module["__nla"] = function(exports, require) {

var m_anim      = require("__animation");
var m_cfg       = require("__config");
var m_obj       = require("__objects");
var m_obj_util  = require("__obj_util");
var m_print     = require("__print");
var m_scs       = require("__scenes");
var m_sfx       = require("__sfx");
var m_tex       = require("__textures");
var m_time      = require("__time");
var m_util      = require("__util");

var cfg_def = m_cfg.defaults;

var _nla_arr = [];
var _start_time = -1;

// to fix precision issues with freezing current frame
var CF_FREEZE_EPSILON = 0.000001;

exports.update_object = function(bpy_source, obj) {

    var sd = find_scene_data_for_nla(obj);
    if (sd) {
        sd.obj_has_nla_on_scene = true;

        var slot_num = 0;

        var adata = bpy_source["animation_data"];
        if (adata && adata["nla_tracks"].length) {
            var nla_tracks = adata["nla_tracks"];

            if (m_obj_util.is_armature(obj) ||
                    m_obj_util.is_camera(obj) ||
                    m_obj_util.is_mesh(obj) ||
                    m_obj_util.is_empty(obj) ||
                    m_obj_util.is_lamp(obj) ||
                    // no need for separate slot in case of sound
                    m_obj_util.is_speaker(obj) ||
                    m_obj_util.is_world(obj)) {

                var nla_events = get_nla_events(nla_tracks, slot_num);
                if (nla_events.length) {
                    obj.nla_events = obj.nla_events.concat(nla_events);
                    slot_num++;
                }
            }
        }

        if (bpy_obj_has_data_param_nla(bpy_source)) {
            var nla_tracks = bpy_source["data"]["animation_data"]["nla_tracks"];
            var nla_events = get_nla_events(nla_tracks, slot_num);

            if (nla_events.length) {
                obj.nla_events = obj.nla_events.concat(nla_events);
                slot_num++;
            }
        }

        if (m_obj_util.is_mesh(obj)) {
            var materials = bpy_source["data"]["materials"];
            for (var j = 0; j < materials.length; j++) {
                var mat = materials[j];
                if (mat["use_nodes"] && mat["node_tree"]) {
                    var nla_tracks = [];
                    get_nodetree_nla_tracks_r(mat["node_tree"], nla_tracks, [mat["name"]]);
                    var nla_events = get_nla_events(nla_tracks, slot_num);
                    if (nla_events.length) {
                        slot_num += assign_anim_slots(nla_events, slot_num);
                        obj.nla_events = obj.nla_events.concat(nla_events);
                    }
                }
            }
        }

        if (!m_obj_util.is_world(obj)) {
            for (var j = 0; j < bpy_source["particle_systems"].length; j++) {
                var psys = bpy_source["particle_systems"][j];
                var pset = psys["settings"];

                if (pset["type"] == "EMITTER" && pset["b4w_allow_nla"]) {
                    var ev = init_event();

                    ev.type = "CLIP";
                    ev.frame_start = sd.scene["frame_start"];
                    ev.frame_end = sd.scene["frame_end"] + 1;
                    ev.anim_name = psys["name"];
                    ev.anim_slot = slot_num;
                    ev.action_frame_start = ev.frame_start;
                    ev.action_frame_end = ev.frame_end;
                    obj.nla_events.push(ev);
                    slot_num++;
                }
            }

            var slot_num_va = slot_num+1;

            for (var j = 0; j < obj.vertex_anim.length; j++) {
                var va = obj.vertex_anim[j];

                if (va.allow_nla) {
                    slot_num = slot_num_va;

                    var ev = init_event();

                    ev.type = "CLIP";
                    ev.frame_start = va.frame_start;
                    ev.frame_end = va.frame_end;
                    ev.anim_name = va.name;
                    ev.anim_slot = slot_num;
                    ev.action_frame_start = ev.frame_start;
                    ev.action_frame_end = ev.frame_end;
                    obj.nla_events.push(ev);
                }
            }
        }
    }
}

function find_scene_data_for_nla(obj) {
    var scene_data = null;
    for (var i = obj.scenes_data.length - 1; i >= 0; i--) {
        var sd = obj.scenes_data[i];
        if (sd.scene["b4w_use_nla"]) {
            scene_data = sd;
            // prefer main scene
            if (sd.scene._is_main)
                break;
        }
    }

    return scene_data;
}

exports.update_scene = function(scene, is_cyclic, data_id) {

    if (!scene._nla) {
        scene._nla = {
            frame_start: scene["frame_start"],
            frame_end: scene["frame_end"],
            frame_offset: 0,
            last_frame: -1,
            range_end: scene["frame_end"],
            range_start: scene["frame_start"],

            user_callback: null,
            cyclic: is_cyclic,
            objects: [],
            textures: [],
            scene_name: scene["name"],

            is_stopped: false,
            force_update: false,
            rewinded_to_start: true
        }
        _nla_arr.push(scene._nla);
    }
    
    var nla = scene._nla;

    var objs = m_obj.get_scene_objs_derived(scene, "ALL", data_id);
    for (var i = 0; i < objs.length; i++) {
        var obj = objs[i];
        if (obj.nla_events.length) {
            for (var j = 0; j < obj.scenes_data.length; j++) {
                var sd = obj.scenes_data[j];
                if (sd.scene == scene && sd.obj_has_nla_on_scene)
                    nla.objects.push(obj);
            }
            
            remove_inconsistent_nla(obj.nla_events, nla, obj.name);
            calc_nla_extents(obj.nla_events, nla);
        }
    }

    var textures = scene._render.video_textures;
    for (var i = 0; i < textures.length; i++) {
        var texture = textures[i]._render;
        if (texture.use_nla && (texture.video_file || texture.seq_video) 
                && texture.vtex_data_id == data_id) {

            var ev = init_event();
            ev.type = "VIDEO";

            if (texture.use_cyclic) {
                // tolerant range for VIDEO event
                ev.frame_start = 0;
                ev.frame_end = nla.frame_end;
            } else {
                ev.frame_start = m_util.clamp(texture.frame_start, 0, 
                        nla.frame_end);
                ev.frame_end = m_util.clamp(texture.frame_start 
                        + texture.frame_duration, 0, nla.frame_end);
            }

            ev.anim_name = textures[i].name;
            nla.textures.push(texture);
        }
    }
}

function remove_inconsistent_nla(nla_events, nla, name) {
    for (var i = 0; i < nla_events.length; i++) {
        var ev = nla_events[i];

        // out of scene range
        if (nla.frame_start > ev.frame_end || nla.frame_end < ev.frame_start) {
            var strip_str = name + " [" + ev.frame_start + ":" +
                    ev.frame_end + "]";
            m_print.warn("NLA: Strip is out of scene range: " + strip_str);
            nla_events.splice(i, 1);
            i--;
            continue;
        }

        if (!ev.anim_name && ev.type == "CLIP") {
            // CLIP event is for objects only, not for video textures
            m_print.warn("NLA: no action in strip for object \"" 
                    + name + "\".");
            nla_events.splice(i, 1);
            i--;
        }
    }
}

/**
 * For CLIP events only.
 */
function calc_nla_extents(nla_events, nla) {
    for (var i = 0; i < nla_events.length; i++) {
        var ev = nla_events[i];

        var ext_frame_start = nla.frame_start;
        var ext_frame_end = nla.frame_end + 1;

        for (var k = 0; k < nla_events.length; k++) {
            var ev_k = nla_events[k];

            // slots are like NLA tracks in Blender
            if (ev.anim_slot != ev_k.anim_slot)
                continue;

            if (ev_k.frame_end <= ev.frame_start)
                ext_frame_start = ev.frame_start;

            if (ev_k.frame_start >= ev.frame_end)
                ext_frame_end = Math.min(ext_frame_end, ev_k.frame_start);
        }

        ev.ext_frame_start = ext_frame_start;
        ev.ext_frame_end = ext_frame_end;

        calc_clip_event_action_frame_final(ev);
    }
}

function calc_clip_event_action_frame_final(ev) {
    if (ev.repeat % 1 === 0)
        ev.action_frame_final = ev.action_frame_end;
    else
        ev.action_frame_final = ev.action_frame_start + (ev.action_frame_end - ev.action_frame_start) * (ev.repeat % 1);
}

function assign_anim_slots(nla_events, start_slot) {
    // TODO: apply this method for any supported animation types
    // Currently it supports only nodemat animations
    var actions = m_anim.get_all_actions();
    var fc_usage = [];
    var num_assigned_slots = 0;

    for (var i = 0; i < nla_events.length; i++) {
        var ev = nla_events[i];
        if (ev.anim_uuid != "") {
            var action = m_util.keysearch("uuid", ev.anim_uuid, actions);
        } else {
            var name = ev.anim_name;
            var action = m_util.keysearch("name", name, actions) ||
                         m_util.keysearch("name", name + "_B4W_BAKED", actions);
        }

        if (!action)
            continue;

        var fcurves = action["fcurves"];
        var cur_fcurves_names = [];
        for (var fcurve in fcurves)
            cur_fcurves_names.push(fcurve);
        fc_usage.push(cur_fcurves_names);
    }

    for (var i = 0; i < fc_usage.length; i++) {
        var have_common_fc = false;
        for (var k = 0; k < i; k++) {
            if (m_util.arrays_have_common(fc_usage[i], fc_usage[k])) {
                nla_events[i].anim_slot = nla_events[k].anim_slot;
                have_common_fc = true;
                break;
            }
        }
        if (!have_common_fc)
            nla_events[i].anim_slot = start_slot + num_assigned_slots++;
    }
    return num_assigned_slots;
}

function init_event() {
    var ev = {
        type: "CLIP",
        frame_start: 0,
        frame_end: 0,
        scheduled: false,
        paused: false,
        anim_name: "",
        anim_uuid: "",
        anim_slot: 0,
        name_list: null,
        action_frame_start: 0,
        action_frame_end: 0,
        ext_frame_start: 0,
        ext_frame_end: 0,
        use_reverse: false,
        scale: 1,
        repeat: 1,
        action_frame_final: 0 //last action frame in the strip
    }
    return ev;
}

function get_nodetree_nla_tracks_r(node_tree, container, name_list) {
    if (node_tree["animation_data"]) {
        var anim_data = node_tree["animation_data"];
        var nla_tracks = anim_data["nla_tracks"];
        if (nla_tracks)
            for (var i = 0; i < nla_tracks.length; i++) {
                // TODO: need to check this. Writing to bpy object directly
                nla_tracks[i].name_list = name_list;
                container.push(nla_tracks[i]);
            }
    }
    var nodes = node_tree["nodes"];
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (node["node_group"]) {
            var g_node_tree = node["node_group"]["node_tree"];
            if (g_node_tree) {
                var new_name_list = name_list.slice();
                new_name_list.push(node["name"]);
                get_nodetree_nla_tracks_r(g_node_tree, container,
                                          new_name_list);
            }
        }
    }
}

exports.start = function() {
    _start_time = 0;
}

exports.get_start_time = function() {
    return _start_time
}

exports.get_frame_offset = function(scene) {
    if (scene._nla)
        return scene._nla.frame_offset;
    return null;
}

exports.set_frame_offset = function(scene, frame_offset) {
    if (scene._nla) {
        scene._nla.frame_offset = frame_offset;
        return true
    }
    return false;
}

/**
 * Called every frame
 */
exports.update = function(timeline, elapsed) {

    if (_start_time < 0)
        return;
    else if (_start_time == 0)
        _start_time = timeline; // initialize timer at first iteration

    for (var i = 0; i < _nla_arr.length; i++) {
        var nla = _nla_arr[i];

        // recalculate frame offset for this frame
        if (nla.is_stopped)
            nla.frame_offset -= m_time.get_framerate() * elapsed;
        var cf = calc_curr_frame_scene(nla, timeline);
        // range end handling
        if ((!nla.is_stopped || nla.force_update) && cf >= nla.range_end)
            if (nla.cyclic)
                cf = nla_range_end_rewind(nla, timeline);
            else
                nla_range_end_stop(nla, cf);

        // NOTE: can be stopped previously from nla_range_end_stop
        if (!nla.is_stopped || nla.force_update) {
            process_nla_objects(nla, cf, elapsed);
            process_nla_video_textures(timeline, nla, cf);
            nla.last_frame = cf;
        }

        nla.force_update = false;
        nla.rewinded_to_start = false;
    }
}

function nla_range_end_stop(nla, curr_frame) {
    nla.is_stopped = true;
    nla.frame_offset -= curr_frame - nla.range_end;
    if (nla.user_callback)
        nla.user_callback();
}

/**
 * Rewind to 0 frame.
 */
function nla_range_end_rewind(nla, timeline) {
    // NOTE: callback before rewinding
    if (nla.user_callback)
        nla.user_callback();

    set_frame(nla.range_start, timeline);
    nla.rewinded_to_start = true;
    return calc_curr_frame_scene(nla, timeline);
}

function process_nla_objects(nla, curr_frame, elapsed) {
    for (var i = 0; i < nla.objects.length; i++) {
        var obj = nla.objects[i];
        var nla_events = obj.nla_events;

        // NOTE: allow single-strip speakers to play again
        for (var j = 0; j < nla_events.length; j++) {
            var ev = nla_events[j];
            if (ev.type == "SOUND" 
                    && curr_frame < (nla.last_frame - CF_FREEZE_EPSILON))
                ev.scheduled = false;
        }

        for (var j = 0; j < nla_events.length; j++) {
            var ev = nla_events[j];

            switch (ev.type) {
            case "CLIP":
                if (ev.ext_frame_start <= curr_frame && curr_frame < ev.ext_frame_end)
                    if (!ev.scheduled) {
                        process_clip_event_start(obj, ev, curr_frame, elapsed);

                        for (var k = 0; k < nla_events.length; k++)
                            if (nla_events[k] != ev &&
                                    nla_events[k].anim_slot == ev.anim_slot)
                                nla_events[k].scheduled = false;

                        ev.scheduled = true;
                    }

                if (ev.scheduled)
                    process_clip_event(obj, ev, curr_frame, elapsed);

                break;
            case "SOUND":
                if ((curr_frame < (nla.last_frame - CF_FREEZE_EPSILON) || 
                        nla.last_frame < ev.frame_start) &&
                        ev.frame_start <= curr_frame && curr_frame < ev.frame_end)
                    if (!ev.scheduled) {
                        process_sound_event(obj, ev, curr_frame);
                        ev.scheduled = true;
                    }

                if (nla.last_frame < ev.frame_end && ev.frame_end <= curr_frame)
                    if (ev.scheduled)
                        ev.scheduled = false;
                break;
            default:
                break;
            }
        }
    }
}

/**
 * Perform non-continuous actions.
 */
function process_nla_video_textures(timeline, nla, nla_frame) {
    for (var i = 0; i < nla.textures.length; i++) {
        var tex = nla.textures[i];

        if (!tex.video_file && !tex.seq_video)
            continue;

        var video_frame_native = m_tex.video_get_current_frame(tex);
        var video_frame_clamped = get_video_frame_clamped(nla_frame, tex);
        var frame_start = m_tex.video_get_start_frame(tex);

        var need_update = false;
        var need_set_frame = false;

        // force update via set_frame() or rewinding the whole nla 
        if (nla.force_update || nla.rewinded_to_start)
            need_set_frame = true;

        if (!nla.is_stopped) {
            var need_play = frame_need_play_video(nla_frame, tex);
            var is_played = m_tex.video_is_played(tex);

            // rewind cyclic video texture
            if (tex.use_cyclic && video_frame_clamped == frame_start)
                need_set_frame = true;

            // if video is stopped on a wrong frame (e.g. dynamically 
            // loaded textures) we need to set the correct one 
            if (!is_played && video_frame_native != video_frame_clamped)
                need_set_frame = true;

            // play/pause video
            if (need_play && !is_played)
                m_tex.play_video(tex.name, tex.vtex_data_id);
            else if (need_play && is_played)
                need_update = true;
            else if (!need_play && is_played) {
                // NOTE: allow to play non-sequential video until it'll 
                // reach calculated frame (may be caused by lags)
                if (tex.video_file && video_frame_native < video_frame_clamped)
                    need_update = true;
                else
                    m_tex.pause_video(tex.name, tex.vtex_data_id);
            }
        }

        if (need_set_frame) {
            m_tex.set_frame_video(tex.name, video_frame_clamped, tex.vtex_data_id);
            if (tex.seq_video)
                tex.seq_last_discrete_mark = m_tex.seq_video_get_discrete_timemark(tex, timeline);
        } else if (need_update && m_tex.video_update_is_available(tex)) {
            if (tex.video_file)
                m_tex.update_video_texture(tex);
            else {
                var mark = m_tex.seq_video_get_discrete_timemark(tex, timeline);
                if (mark != tex.seq_last_discrete_mark) {
                    tex.seq_cur_frame = video_frame_clamped;
                    m_tex.update_seq_video_texture(tex);
                }
                tex.seq_last_discrete_mark = mark;
            }
        }
    }
}

/**
 * Convert nla frame to a raw video frame. Video frame can be out of a playable range.
 */
function nla_frame_to_video_frame(nla_frame, vtex) {
    var frame_delta = Math.round(nla_frame) - vtex.frame_start;
    if (vtex.use_cyclic) {
        frame_delta = frame_delta % vtex.frame_duration;
        if (frame_delta < 0)
            frame_delta += vtex.frame_duration;
    }
    return vtex.frame_offset + frame_delta;
}

/**
 * Get a valid video frame which is needed to play on a certain nla frame.
 */
function get_video_frame_clamped(nla_frame, vtex) {
    var video_frame = nla_frame_to_video_frame(nla_frame, vtex);

    var frame_clamped = m_util.clamp(video_frame, vtex.frame_offset, 
            vtex.frame_offset + m_tex.video_get_duration(vtex) - 1);

    if (vtex.seq_video) {
        frame_clamped = m_tex.video_frame_to_seq_frame(vtex, frame_clamped);
        // NOTE: insufficient video_frame clamping
        if (frame_clamped == vtex.seq_movie_length)
            frame_clamped--;
    }
    return frame_clamped;
}

function frame_need_play_video(cf, vtex) {
    var frame = nla_frame_to_video_frame(cf, vtex);
    return vtex.frame_offset <= frame && frame <= vtex.frame_offset 
            + m_tex.video_get_duration(vtex);
}

/**
 * NOTE: unused
 */
function pause_scheduled_objects(objects) {
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        var nla_events = obj.nla_events;
        for (var j = 0; j < nla_events.length; j++) {
            var ev = nla_events[j];
            if (ev.scheduled && !ev.paused) {
                process_event_pause(obj);
                ev.paused = true;
            }
        }
    }
}

function resume_scheduled_objects(objects) {
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        var nla_events = obj.nla_events;
        for (var j = 0; j < nla_events.length; j++) {
            var ev = nla_events[j];
            if (ev.paused) {
                process_event_resume(obj);
                ev.paused = false;
            }
        }
    }
}

function calc_curr_frame_scene(nla, timeline) {

    var cf = (timeline - _start_time) * m_time.get_framerate() + nla.frame_offset;

    if (cf > nla.frame_start) {
        cf -= nla.frame_start;
        if (nla.cyclic) {
            var stride = nla.frame_end - nla.frame_start + 1;
            cf %= stride;
        }
        cf += nla.frame_start;
    } else {
        cf = nla.frame_start;
    }

    return cf;
}

function process_clip_event_start(obj, ev, frame, elapsed) {
    var name_list = ev.name_list;
    if (ev.anim_uuid != "")
        m_anim.apply_by_uuid(obj, name_list, ev.anim_uuid, ev.anim_slot);
    else
        m_anim.apply(obj, name_list, ev.anim_name, ev.anim_slot);
    // NOTE: should not be required
    m_anim.set_behavior(obj, m_anim.AB_FINISH_STOP, ev.anim_slot);
    var action_frame = get_curr_action_frame(ev.frame_start, ev);
    m_anim.set_frame(obj, action_frame, ev.anim_slot);
}

function process_clip_event(obj, ev, frame, elapsed) {
    var new_anim_frame = get_curr_action_frame(frame, ev);
    var curr_anim_frame = m_anim.get_current_frame_float(obj, ev.anim_slot);
    // do not update animation if the frame is not changed
    // to allow object movement in between
    if (Math.abs(new_anim_frame - curr_anim_frame) > CF_FREEZE_EPSILON)
        m_anim.set_frame(obj, new_anim_frame, ev.anim_slot);

}

function get_curr_action_frame(frame, ev) {
    frame = m_util.clamp(frame, ev.frame_start, ev.frame_end);
    if (frame == ev.frame_end) {
        var action_frame = ev.action_frame_final;
    } else {
        var track_frame = (frame - ev.frame_start) / ev.scale;
        var track_len = ev.action_frame_end - ev.action_frame_start;
        var action_frame_offset = track_frame % track_len;

        var action_frame = ev.action_frame_start + action_frame_offset;
    }

    if (ev.use_reverse)
        action_frame = ev.action_frame_end - action_frame + ev.action_frame_start;

    return action_frame;
}

function process_sound_event(obj, ev, frame) {
    var when = (ev.frame_start - frame) / m_time.get_framerate();
    var duration = (ev.frame_end - ev.frame_start) / m_time.get_framerate();
    m_sfx.play(obj, when, duration);
}

exports.cleanup = function() {
    _nla_arr.length = 0;
    _start_time = -1;
}

/**
 * Convert NLA tracks to events
 */
function get_nla_events(nla_tracks, anim_slot_num) {

    var nla_events = [];

    for (var i = 0; i < nla_tracks.length; i++) {
        var track = nla_tracks[i];

        var strips = track["strips"];
        if (!strips)
            continue;

        for (var j = 0; j < strips.length; j++) {

            var strip = strips[j];

            var ev = init_event();

            ev.type = strip["type"];
            ev.frame_start = strip["frame_start"];
            ev.frame_end = strip["frame_end"];
            ev.anim_slot = anim_slot_num;
            ev.action_frame_start = strip["action_frame_start"];
            ev.action_frame_end = strip["action_frame_end"];
            ev.use_reverse = strip["use_reverse"];
            ev.scale = strip["scale"];
            ev.repeat = strip["repeat"];

            if (strip["action"]){
                ev.anim_name = strip["action"]["name"];
                ev.anim_uuid = strip["action"]["uuid"];
                ev.name_list = track.name_list;
            }

            nla_events.push(ev);
        }
    }

    return nla_events;
}

exports.bpy_obj_has_nla = function(bpy_obj) {
    // TODO: particles/vertex animation
    var adata = bpy_obj["animation_data"];

    if ((adata && adata["nla_tracks"].length) || bpy_obj_has_data_param_nla(bpy_obj) ||
            bpy_obj_has_nodemats_nla(bpy_obj))
        return true;
    else
        return false;
}

function bpy_obj_has_data_param_nla(bpy_obj) {
    if ((bpy_obj["type"] == "SPEAKER" || bpy_obj["type"] == "LAMP")
         && bpy_obj["data"]["animation_data"] &&
            bpy_obj["data"]["animation_data"]["nla_tracks"].length)
        return true;
    else
        return false;
}

function bpy_obj_has_nodemats_nla(bpy_obj) {
    if (bpy_obj["type"] != "MESH" || !bpy_obj["data"])
        return false;

    var materials = bpy_obj["data"]["materials"];
    if (!materials)
        return false;

    for (var j = 0; j < materials.length; j++) {
        var mat = materials[j];
        var node_tree = mat["node_tree"];
        if (mat["use_nodes"] && node_tree) {
            if (check_nodetree_nla_tracks_r(node_tree))
                return true;
        }
    }
    return false;
}

function check_nodetree_nla_tracks_r(node_tree, container) {
    if (node_tree["animation_data"]) {
        var anim_data = node_tree["animation_data"];
        var nla_tracks = anim_data["nla_tracks"];
        if (nla_tracks && nla_tracks.length)
            return true;
    }
    var nodes = node_tree["nodes"];
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (node["node_group"]) {
            var g_node_tree = node["node_group"]["node_tree"];
            if (g_node_tree)
                check_nodetree_nla_tracks_r(g_node_tree, container);
        }
    }
    return false;
}

exports.set_frame = set_frame;
function set_frame(frame, timeline) {
    var active_scene = m_scs.get_active();
    if (active_scene._nla) {
        var cf = calc_curr_frame_scene(active_scene._nla, timeline);
        active_scene._nla.frame_offset -= cf - frame;
        active_scene._nla.force_update = true;
    }
}

exports.get_frame = get_frame;
function get_frame(timeline) {
    var active_scene = m_scs.get_active();
    if (active_scene._nla)
        return calc_curr_frame_scene(active_scene._nla, timeline);
    else
        return -1;
}

exports.stop_nla = stop_nla;
function stop_nla() {
    var active_scene = m_scs.get_active();

    if (active_scene._nla) {
        active_scene._nla.is_stopped = true;

        var vtexs = active_scene._nla.textures;

        for (var i = 0; i < vtexs.length; i++) {
            var vtex = vtexs[i];
            m_tex.pause_video(vtex.name, vtex.vtex_data_id);
        }
    }
}

exports.play_nla = play_nla;
function play_nla(callback) {
    var active_scene = m_scs.get_active();
    if (active_scene._nla) {
        active_scene._nla.is_stopped = false;
        if (callback)
            active_scene._nla.user_callback = callback;
        else
            active_scene._nla.user_callback = null;
    }

    // NOTE: video textures will be unpaused on the next update
}

exports.get_frame_start = function() {
    var active_scene = m_scs.get_active();
    if (active_scene._nla)
        return active_scene._nla.frame_start;
    else
        return -1;
}

exports.get_frame_end = function() {
    var active_scene = m_scs.get_active();
    if (active_scene._nla)
        return active_scene._nla.frame_end;
    else
        return -1;
}

exports.is_play = function() {
    var active_scene = m_scs.get_active();
    if (active_scene._nla)
        return !active_scene._nla.is_stopped;
    else
        return false;
}

exports.check_nla = function() {
    var active_scene = m_scs.get_active();
    if (active_scene._nla)
        return active_scene["b4w_use_nla"];
    else
        return false;
}

exports.check_logic_nodes = function() {
    var active_scene = m_scs.get_active();
    if (active_scene._nla)
        return active_scene["b4w_logic_nodes"].length > 0;
    else
        return false;
}

exports.set_range = function(start_frame, end_frame) {
    var active_scene = m_scs.get_active();
    if (active_scene._nla) {
        active_scene._nla.range_start = start_frame;
        active_scene._nla.range_end = end_frame;
    } else
        return false;
}

exports.set_range_end = function(end_frame) {
    var active_scene = m_scs.get_active();
    if (active_scene._nla) {
        active_scene._nla.range_end = end_frame;
    } else
        return false;
}

exports.set_range_start = function(start_frame) {
    var active_scene = m_scs.get_active();
    if (active_scene._nla) {
        active_scene._nla.range_start = start_frame;
    } else
        return false;
}

exports.reset_range = reset_range;
function reset_range() {
    var active_scene = m_scs.get_active();
    if (active_scene._nla) {
        var nla = active_scene._nla;
        nla.range_start = nla.frame_start;
        nla.range_end = nla.frame_end;
    } else
        return false;
}

exports.set_cyclic = function(is_cyclic) {
    var active_scene = m_scs.get_active();
    if (active_scene._nla)
        active_scene._nla.cyclic = is_cyclic;
    else
        return false;
}

exports.clear_callback = function() {
    var active_scene = m_scs.get_active();
    if (active_scene._nla)
        active_scene._nla.user_callback = null;
}

exports.set_offset_from_range_start = function(timeline) {
    var active_scene = m_scs.get_active();
    var nla = active_scene._nla;
    if (nla) {
        nla.frame_offset = -(timeline - _start_time) * m_time.get_framerate() + nla.range_start;
        nla.force_update = true;
    }
}

exports.get_frame_end = function() {
    var active_scene = m_scs.get_active();
    var nla = active_scene._nla;
    if (nla)
        return nla.frame_end;
    else
        return null;
}

}
