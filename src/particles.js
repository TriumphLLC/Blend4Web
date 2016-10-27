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
 * Particles internal API.
 * External API implemented in animation.js module.
 * @name particles
 * @namespace
 * @exports exports as particles
 */
b4w.module["__particles"] = function(exports, require) {

var m_cfg    = require("__config");
var m_batch  = require("__batch");
var m_geom   = require("__geometry");
var m_tex    = require("__textures");
var m_time   = require("__time");
var m_tsr    = require("__tsr");
var m_util   = require("__util");
var m_vec3   = require("__vec3");

var STDGRAVITY = 9.81;
var DELAYRANDFACTOR = 10;

var cfg_def = m_cfg.defaults;

var _quat_tmp = new Float32Array(4);
var _tsr_tmp = new Float32Array(8);
var _vec3_tmp = new Float32Array(3);

var _particles_objs_cache = [];

function create_particles_data(name, type) {
    var pdata = {
        name: name,
        p_type: type,

        time: 0,
        prev_time: -1,
        use_world_space: false,

        frame_start: 0,
        frame_end: 0,
        time_length: 0,
        lifetime_frames: 0,
        lifetime: 0,
        // bool
        cyclic: 0,

        mass: 0,
        nfactor: 0,
        gravity: 0,
        fade_in: 0,
        fade_out: 0,
        wind_factor: 0,

        size: 0,
        alpha_start: 0,
        alpha_end: 0,
        color_ramp_length: 0,
        color_ramp: new Float32Array(16),

        need_buffers_update: false,

        positions: null,
        positions_cache: null,
        tbn_quats: null,
        tbn_quats_cache: null,
        delay_attrs: null,
        delay_attrs_masked: null,
        emitter_tsr_snapshots: null,
        p_data: null,

        tilt: 0,
        tilt_rand: 0
    }

    return pdata;
}

var _rand = function() {
    m_util.panic("_rand() undefined");
}

exports.update = function() {
    for (var i = 0; i < _particles_objs_cache.length; i++) {
        var obj = _particles_objs_cache[i];
        var scenes_data = obj.scenes_data;
        for (var j = 0; j < scenes_data.length; j++) {
            var sc_data = scenes_data[j];
            var batches = sc_data.batches;
            //TODO: need to track every particle independently
            update_emitter_transform(obj, batches);
        }
    }
}

exports.obj_has_particles = function(obj) {
    var scenes_data = obj.scenes_data;
    for (var i = 0; i < scenes_data.length; i++) {
        var batches = scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++)
            if (batches[j].particles_data)
                return true;
    }

    return false;
}

/**
 * Check if object has animated particle system (of type EMITTER)
 */
exports.obj_has_anim_particles = function(obj) {
    var scenes_data = obj.scenes_data;
    for (var i = 0; i < scenes_data.length; i++) {
        var batches = scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++) {
            var pdata = batches[j].particles_data;
            if (pdata && pdata.p_type == "EMITTER")
                return true;
        }
    }

    return false;
}

exports.bpy_obj_has_particles = function(bpy_obj) {
    return bpy_obj["particle_systems"].length > 0;
}

/**
 * Check if object has animated particle system (of type EMITTER)
 */
exports.bpy_obj_has_anim_particles = function(bpy_obj) {
    for (var i = 0; i < bpy_obj["particle_systems"].length; i++) {
        var psettings = bpy_obj["particle_systems"][i]["settings"];
        if (psettings["type"] == "EMITTER")
            return true;
    }

    return false;
}

exports.has_dynamic_grass_particles = function(bpy_obj) {
    for (var i = 0; i < bpy_obj["particle_systems"].length; i++) {
        var psettings = bpy_obj["particle_systems"][i]["settings"];
        if (psettings["type"] == "HAIR" && psettings["b4w_dynamic_grass"]) {
            return true;
        }
    }

    return false;
}

exports.init_particles_data = function(batch, psystem, pmaterial) {
    var pdata = batch.particles_data = create_particles_data(psystem["name"],
            psystem["settings"]["type"]);
    pdata.frame_start = psystem["settings"]["frame_start"];
    pdata.frame_end = psystem["settings"]["frame_end"];
    pdata.time_length = (pdata.frame_end - pdata.frame_start) / m_time.get_framerate();
    pdata.lifetime_frames = psystem["settings"]["lifetime"];
    pdata.lifetime = pdata.lifetime_frames / m_time.get_framerate();
    pdata.cyclic = psystem["settings"]["b4w_cyclic"] ? 1 : 0;

    pdata.mass = psystem["settings"]["mass"];
    pdata.nfactor = psystem["settings"]["normal_factor"];
    pdata.gravity = psystem["settings"]["effector_weights"]["gravity"] * STDGRAVITY;
    pdata.fade_in = psystem["settings"]["b4w_fade_in"] /m_time.get_framerate();
    pdata.fade_out = psystem["settings"]["b4w_fade_out"] /m_time.get_framerate();
    pdata.wind_factor = psystem["settings"]["effector_weights"]["wind"];

    pdata.use_world_space =
            psystem["settings"]["b4w_coordinate_system"] == "WORLD"? true: false;

    var size;
    var alpha_start;
    var alpha_end;
    if (batch.halo_particles) {
        size = pmaterial["halo"]["size"];

        var hardness = pmaterial["halo"]["hardness"];

        // default 50
        if (hardness < 30) {
            var alpha_start = 0.5;
            var alpha_end = 0.9;
        } else if (hardness < 40) {
            var alpha_start = 0.1;
            var alpha_end = 1.0;
        } else if (hardness < 50) {
            var alpha_start = 0.0;
            var alpha_end = 0.8;
        } else {
            var alpha_start = 0.0;
            var alpha_end = 0.5;
        }
    } else {
        size = psystem["settings"]["particle_size"];
        alpha_start = 1.0;
        alpha_end = 1.0;
    }
    pdata.size = size;
    pdata.alpha_start = alpha_start;
    pdata.alpha_end = alpha_end;

    if (pmaterial["use_nodes"] && psystem["settings"]["render_type"] == "BILLBOARD") {
        m_batch.set_batch_directive(batch, "NODES", 1);
        m_batch.set_batch_directive(batch, "PARTICLE_BATCH", 1);
        batch.use_nodes = true;
        batch.has_nodes = true;
    }

    /** size ramp */
    var tex_slot = psystem["settings"]["texture_slots"];

    if (tex_slot[0] && tex_slot[0]["use_map_size"] && tex_slot[0]["texture"] &&
            tex_slot[0]["texture"]["type"] == "BLEND" &&
            tex_slot[0]["texture"]["use_color_ramp"] &&
            cfg_def.allow_vertex_textures) {
        var image_data = [];
        m_tex.calc_color_ramp_data(tex_slot[0]["texture"]["color_ramp"],
                m_tex.PART_COLORRAMP_TEXT_SIZE, image_data);
        image_data = new Uint8Array(image_data.map(function(val) {return m_util.clamp(val * 255,
            0, 255)}));
        m_batch.append_texture_to_batch(batch, image_data, "u_color_ramp_tex",
                m_tex.PART_COLORRAMP_TEXT_SIZE);
        m_batch.set_batch_directive(batch, "USE_COLOR_RAMP", 1);
    }

    /** color ramp */
    var m_tex_slot = pmaterial["texture_slots"];
    var cramp_varr = [-1,0,0,0,
                     -1,0,0,0,
                     -1,0,0,0,
                     -1,0,0,0]

    if (m_tex_slot[0] && m_tex_slot[0]["texture_coords"] == "STRAND" &&
            m_tex_slot[0]["texture"] &&
            m_tex_slot[0]["texture"]["type"] == "BLEND" &&
            m_tex_slot[0]["texture"]["use_color_ramp"]) {

        var color_ramp_elems = m_tex_slot[0]["texture"]["color_ramp"]["elements"];
        var rlen = Math.min(color_ramp_elems.length*4, cramp_varr.length);
        for (var i = 0; i < rlen; i+=4) {
            var rel = color_ramp_elems[i/4];

            cramp_varr[i] = rel["position"];
            cramp_varr[i+1] = rel["color"][0];
            cramp_varr[i+2] = rel["color"][1];
            cramp_varr[i+3] = rel["color"][2];
        }

        pdata.color_ramp_length = color_ramp_elems.length;
    }
    pdata.color_ramp.set(cramp_varr);
}

/**
 * Generate buffers for batch, emitter mesh, particle system and material
 * process particle from each emitter vertex
 */
exports.generate_emitter_particles_submesh = function(batch, emitter_mesh,
        psystem, render) {

    var pdata = batch.particles_data;
    var tsr = render.world_tsr;

    var pcount = psystem["settings"]["count"];
    var time_start = psystem["settings"]["frame_start"] / m_time.get_framerate();
    var time_end = psystem["settings"]["frame_end"] / m_time.get_framerate();
    var lifetime = psystem["settings"]["lifetime"] / m_time.get_framerate();
    var lifetime_random = psystem["settings"]["lifetime_random"];
    var emit_from = psystem["settings"]["emit_from"];
    var vel_factor_rand = psystem["settings"]["factor_random"];

    if (psystem["settings"]["use_rotations"]) {
        var ang_vel_mode = psystem["settings"]["angular_velocity_mode"];
        var ang_vel_factor = psystem["settings"]["angular_velocity_factor"];
    } else {
        var ang_vel_mode = "NONE";
        var ang_vel_factor = 0;
    }

    var is_rand_delay = psystem["settings"]["b4w_randomize_emission"];
    var cyclic = psystem["settings"]["b4w_cyclic"];
    
    pdata.tilt = psystem["settings"]["billboard_tilt"];
    pdata.tilt_rand = psystem["settings"]["billboard_tilt_random"];

    init_particle_rand(psystem["seed"]);

    var emitter_submesh = m_geom.extract_submesh_all_mats(emitter_mesh,
            ["a_position", "a_tbn_quat"], null, render);

    var pos_tbn_quats = distribute_positions_tbn_quats(pcount, emit_from,
            emitter_submesh);
    var positions = pos_tbn_quats[0];
    var tbn_quats = pos_tbn_quats[1];

    pdata.positions = new Float32Array(positions);
    pdata.tbn_quats = new Float32Array(tbn_quats);
    pdata.positions_cache = new Float32Array(positions.length);
    pdata.tbn_quats_cache = new Float32Array(tbn_quats.length);

    var delay_attrs = gen_delay_attrs(pcount, time_start, time_end,
                                      is_rand_delay, cyclic);
    pdata.delay_attrs = new Float32Array(delay_attrs);
    // needed to restore original delays when using particles number factor
    pdata.delay_attrs_masked = new Float32Array(delay_attrs);

    if (pdata.use_world_space) {
        pdata.emitter_tsr_snapshots = new Float32Array(delay_attrs.length * 8);
        for (var i = 0; i < delay_attrs.length * 8; i++)
            for (var j = 0; j < 8; j++)
                pdata.emitter_tsr_snapshots[8 * i + j] = tsr[j];

        pose_emitter_world(pdata, positions, tbn_quats, tsr, positions,
                tbn_quats);
    }

    var submesh = m_geom.init_submesh("EMITTER_PARTICLES");
    var va_frame = m_util.create_empty_va_frame();
    va_frame["a_position"] = positions;
    va_frame["a_tbn_quat"] = tbn_quats;
    submesh.va_frames[0] = va_frame;

    batch.draw_mode = m_geom.DM_DYNAMIC_TRIANGLES;
    submesh.indices = gen_bb_indices(pcount);
    submesh.va_common["a_p_bb_vertex"] = m_geom.gen_bb_vertices(pcount);

    submesh.base_length = positions.length/3;
    var larr = gen_lifetimes(pcount, lifetime, lifetime_random);
    submesh.va_common["a_p_data"] = gen_part_data(pcount, larr, delay_attrs);
    submesh.va_common["a_p_vels"] =
            gen_velocities(pcount, vel_factor_rand, ang_vel_mode,
            ang_vel_factor);
    pdata.p_data = new Float32Array(submesh.va_common["a_p_data"]);

    return submesh;
}

/**
 * Recalculate particles position/tbn_quats in world space.
 */
function pose_emitter_world(pdata, positions, tbn_quats, tsr,
                            positions_new, tbn_quats_new) {

    var delay_attrs = pdata.delay_attrs;
    var em_snapshots = pdata.emitter_tsr_snapshots;
    var time = pdata.time;
    var prev_time = pdata.prev_time;

    var step = 4;

    for (var j = 0; j < delay_attrs.length; j+=step) {
        var delay = delay_attrs[j];

        // looped timing
        var need_emitter_pos = (time > prev_time && time >= delay && delay > prev_time)
                || (time < prev_time && (delay > prev_time || time >= delay));

        if (need_emitter_pos)
            for (var k = 0; k < 8; k++) {
                em_snapshots[8 * j + k]  = tsr[k];
                _tsr_tmp[k] = tsr[k];
            }
        else
            for (var k = 0; k < 8; k++)
                _tsr_tmp[k] = em_snapshots[8 * j + k];

        // positions
        var pos = _vec3_tmp;
        pos[0] = positions[3 * j];
        pos[1] = positions[3 * j + 1];
        pos[2] = positions[3 * j + 2];

        m_tsr.transform_vec3(pos, _tsr_tmp, pos);

        positions_new[3 * j]     = pos[0];
        positions_new[3 * j + 1] = pos[1];
        positions_new[3 * j + 2] = pos[2];

        var tbn_quat = _quat_tmp;
        tbn_quat[0] = tbn_quats[4 * j];
        tbn_quat[1] = tbn_quats[4 * j + 1];
        tbn_quat[2] = tbn_quats[4 * j + 2];
        tbn_quat[3] = tbn_quats[4 * j + 3];

        m_tsr.transform_quat(tbn_quat, _tsr_tmp, tbn_quat);

        tbn_quats_new[4 * j] = tbn_quat[0];
        tbn_quats_new[4 * j + 1] = tbn_quat[1];
        tbn_quats_new[4 * j + 2] = tbn_quat[2];
        tbn_quats_new[4 * j + 3] = tbn_quat[3];

        // same transform for the rest corners (billboard)
        for (var k = 1; k < 4; k++) {
            positions_new[3 * (j + k)]     = positions_new[3 * j];
            positions_new[3 * (j + k) + 1] = positions_new[3 * j + 1];
            positions_new[3 * (j + k) + 2] = positions_new[3 * j + 2];
            tbn_quats_new[4 * (j + k)] = tbn_quat[0];
            tbn_quats_new[4 * (j + k) + 1] = tbn_quat[1];
            tbn_quats_new[4 * (j + k) + 2] = tbn_quat[2];
            tbn_quats_new[4 * (j + k) + 3] = tbn_quat[3];
        }
    }
}

function update_emitter_transform(obj, batches) {
    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];
        var pdata = batch.particles_data;

        if (!pdata || !pdata.use_world_space || batch.forked_batch)
            continue;

        var pcache = pdata.positions_cache;
        var tbncache = pdata.tbn_quats_cache;

        var positions = pdata.positions;
        var tbn_quats = pdata.tbn_quats;

        pose_emitter_world(pdata, positions, tbn_quats,
                obj.render.world_tsr, pcache, tbncache);

        pdata.need_buffers_update = true;
    }
}

/**
 * Initialize random number generator
 *
 * seed > 0 - use our random function (seed-deterministic behaviour)
 * seed == 0 or undefined - use internal javascript random function
 */
function init_particle_rand(seed) {
    if (seed) {
        m_util.srand(seed);
        _rand = function() {
            return m_util.rand();
        }
    } else {
        _rand = function() {
            return Math.random();
        }
    }
}

function gen_bb_indices(pcount) {
    var bbi = [];

    for (var i = 0; i < pcount; i++) {
        // CCW ?
        bbi.push(4*i,4*i+2,4*i+1, 4*i,4*i+3,4*i+2);
    }

    var bb_indices = new Uint16Array(bbi);
    return bb_indices;
}

function distribute_positions_tbn_quats(pcount, emit_from, emitter_submesh) {
    switch (emit_from) {
    case "VERT":

        var ecoords = emitter_submesh.va_frames[0]["a_position"];
        var etbncoords = emitter_submesh.va_frames[0]["a_tbn_quat"];

        var pindices = gen_pindices(pcount, ecoords);
        var positions = gen_positions(pindices, ecoords);
        var tbn_quats = gen_tbn_quats(pindices, etbncoords);
        break;
    case "FACE":
        var positions = [];
        var tbn_quats = [];

        // TODO: get seed from particle system
        var seed = [];
        m_util.init_rand_r_seed(0, seed);
        var rand_pos = m_geom.geometry_random_points(emitter_submesh, pcount, false, seed);
        m_util.init_rand_r_seed(0, seed);
        var rand_tbn_quat = m_geom.geometry_random_points(emitter_submesh, pcount, true, seed);

        for (var i = 0; i < rand_pos.length; i++) {

            positions.push(rand_pos[i][0], rand_pos[i][1], rand_pos[i][2]);
            positions.push(rand_pos[i][0], rand_pos[i][1], rand_pos[i][2]);
            positions.push(rand_pos[i][0], rand_pos[i][1], rand_pos[i][2]);
            positions.push(rand_pos[i][0], rand_pos[i][1], rand_pos[i][2]);

            tbn_quats.push(rand_tbn_quat[i][0], rand_tbn_quat[i][1],
                    rand_tbn_quat[i][2], rand_tbn_quat[i][3]);
            tbn_quats.push(rand_tbn_quat[i][0], rand_tbn_quat[i][1],
                    rand_tbn_quat[i][2], rand_tbn_quat[i][3]);
            tbn_quats.push(rand_tbn_quat[i][0], rand_tbn_quat[i][1],
                    rand_tbn_quat[i][2], rand_tbn_quat[i][3]);
            tbn_quats.push(rand_tbn_quat[i][0], rand_tbn_quat[i][1],
                    rand_tbn_quat[i][2], rand_tbn_quat[i][3]);
        }

        var positions = new Float32Array(positions);
        var tbn_quats = new Float32Array(tbn_quats);

        break;
    case "VOLUME":
        m_util.panic("Particle emission from volume is not supported");
        break;
    default:
        m_util.panic("Wrong emit from option");
        break;
    }

    return [positions, tbn_quats];
}

/**
 * Generate particle indices for emitter vertex coordinates and normals
 * pcount - total number of particles
 * ecoords - possible locations (coordinates of emitter mesh vertices)
 */
function gen_pindices(pcount, ecoords) {
    var vcount = ecoords.length/3;
    var indices = [];

    for (var i = 0; i < pcount; i++) {

        /* get random vertex of emitter */
        var vrand = Math.round((vcount - 1) * _rand());
        indices.push(vrand);
        indices.push(vrand);
        indices.push(vrand);
        indices.push(vrand);
    }
    return indices;
}

function gen_positions(indices, ecoords) {

    var parr = [];

    for (var i = 0; i < indices.length; i++) {

        parr.push(ecoords[3*indices[i]]);
        parr.push(ecoords[3*indices[i] + 1]);
        parr.push(ecoords[3*indices[i] + 2]);
    }

    var positions = new Float32Array(parr);
    return positions;
}

function gen_tbn_quats(indices, etbncoords) {
    var tbnarr = [];

    for (var i = 0; i < indices.length; i++) {
        tbnarr.push(etbncoords[4*indices[i]]);
        tbnarr.push(etbncoords[4*indices[i] + 1]);
        tbnarr.push(etbncoords[4*indices[i] + 2]);
        tbnarr.push(etbncoords[4*indices[i] + 3]);
    }

    var tbn_quats = new Float32Array(tbnarr);
    return tbn_quats;
}

function gen_delay_attrs(pcount, mindelay, maxdelay, random, cyclic) {
    var darr = [];
    var delayint = (maxdelay - mindelay)/pcount;

    for (var i = 0; i < pcount; i++) {

        var delay;
        if (random) {
            delay = delayint*i + DELAYRANDFACTOR * delayint * (0.5-_rand());
        } else
            delay = delayint*i;

        if (!cyclic)
            delay += mindelay;

        darr.push(delay);
        darr.push(delay);
        darr.push(delay);
        darr.push(delay);
    }

    var delay_attrs = new Float32Array(darr);

    return delay_attrs;
}

function gen_lifetimes(pcount, lifetime, lifetime_random) {
    var larr = [];
    var delta = lifetime * lifetime_random;

    for (var i = 0; i < pcount; i++) {

        var delta_rand = delta*_rand();
        larr.push(lifetime - delta_rand);
        larr.push(lifetime - delta_rand);
        larr.push(lifetime - delta_rand);
        larr.push(lifetime - delta_rand);
    }

    return larr;
}

function gen_part_data(pcount, lifetimes, delay_attrs) {
    var data = [];

    for (var i = 0; i < pcount; i++) {
        var random = Math.random();
        data.push(lifetimes[i * 4], delay_attrs[i * 4], random);
        data.push(lifetimes[i * 4 + 1], delay_attrs[i * 4 + 1], random);
        data.push(lifetimes[i * 4 + 2], delay_attrs[i * 4 + 2], random);
        data.push(lifetimes[i * 4 + 3], delay_attrs[i * 4 + 3], random);
    }

    return new Float32Array(data);
}

/**
 * Generate array of particles'es linear and angular speed
 * vec4(linear_x, linear_y, linear_z, angular)
 */
function gen_velocities(pcount, vel_factor_rand, ang_vel_mode, ang_vel_factor) {
    var varr = [];
    for (var i = 0; i < pcount; i++) {

        var vvec = [_rand() - 0.5, _rand() - 0.5, _rand() - 0.5];
        m_vec3.normalize(vvec, vvec);

        varr.push(vel_factor_rand * vvec[0]);
        varr.push(vel_factor_rand * vvec[1]);
        varr.push(vel_factor_rand * vvec[2]);

        switch(ang_vel_mode) {
        case "NONE":
            varr.push(0.0);
            break;
        // NOTE: "SPIN" renamed to "VELOCITY" in blender 2.63
        case "SPIN":
        case "VELOCITY":
            varr.push(ang_vel_factor);
            break;
        case "RAND":
            varr.push(ang_vel_factor*2*(_rand() - 0.5));
            break;
        default:
            m_util.panic("Undefined velocity factor");
        }

        var last = varr.slice(-4);
        for (var j = 0; j < 12; j++) {
            varr.push(last[j % 4]);
        }
    }

    var vels = new Float32Array(varr);
    return vels;

}

exports.set_time = function(obj, psys_name, time) {
    var scenes_data = obj.scenes_data;
    for (var i = 0; i < scenes_data.length; i++) {
        var batches = scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++) {
            var pdata = batches[j].particles_data;

            if (!pdata || pdata.name != psys_name || batches[j].forked_batch)
                continue;

            pdata.prev_time = pdata.time;
            pdata.time = time;
        }
    }
}

/**
 * Prepare buffer for lens flare
 */
exports.prepare_lens_flares = function(submesh) {

    var base_length = submesh.base_length;
    var sub_pos = submesh.va_frames[0]["a_position"];

    var bb_dist_arr = [];
    var bb_vert_arr = [];

    for (var i = 0; i < base_length; i++) {

        bb_vert_arr.push(sub_pos[3*i]);
        bb_dist_arr.push(sub_pos[3*i + 1]);
        bb_vert_arr.push(sub_pos[3*i + 2]);
    }

    var bb_dist_arr = new Float32Array(bb_dist_arr);
    var bb_vert_arr = new Float32Array(bb_vert_arr);

    submesh.va_common["a_lf_dist"] = bb_dist_arr;
    submesh.va_common["a_lf_bb_vertex"] = bb_vert_arr;

    return submesh;
}

exports.set_size = function(obj, psys_name, size) {
    var scenes_data = obj.scenes_data;
    for (var i = 0; i < scenes_data.length; i++) {
        var batches = scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++) {
            var pdata = batches[j].particles_data;

            if (!pdata || pdata.name != psys_name)
                continue;

            pdata.size = size;
        }
    }
}

exports.set_normal_factor = function(obj, psys_name, nfactor) {
    var scenes_data = obj.scenes_data;
    for (var i = 0; i < scenes_data.length; i++) {
        var batches = scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++) {
            var pdata = batches[j].particles_data;

            if (!pdata || pdata.name != psys_name)
                continue;

            pdata.nfactor = nfactor;
        }
    }
}

exports.set_factor = function(obj, psys_name, factor) {
    var scenes_data = obj.scenes_data;
    for (var i = 0; i < scenes_data.length; i++) {
        var batches = scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++) {
            var batch = batches[j];
            var pdata = batch.particles_data;

            if (!pdata || pdata.name != psys_name)
                continue;

            var delay_attrs = pdata.delay_attrs;

            if (factor == 1)
                var delay_attrs_masked = delay_attrs;

            else if (factor == 0) {
                var inc = 4;
                var delay_attrs_masked = pdata.delay_attrs_masked;

                for (var k = 0; k < delay_attrs_masked.length; k+=inc) {
                    delay_attrs_masked[k] = 10000;
                    delay_attrs_masked[k+1] = delay_attrs_masked[k];
                    delay_attrs_masked[k+2] = delay_attrs_masked[k];
                    delay_attrs_masked[k+3] = delay_attrs_masked[k];
                }
            } else {
                var step = 4 / factor;
                var delay_attrs_masked = pdata.delay_attrs_masked;

                 var ind = 0;
                for (var k = 0; k < delay_attrs_masked.length; k+=4) {
                    if (k >= ind) {
                        delay_attrs_masked[k] = delay_attrs[k];
                        ind += step;
                    } else
                        delay_attrs_masked[k] = 10000;

                    delay_attrs_masked[k+1] = delay_attrs_masked[k];
                    delay_attrs_masked[k+2] = delay_attrs_masked[k];
                    delay_attrs_masked[k+3] = delay_attrs_masked[k];
                }
            }
            var pbuf = batch.bufs_data;
            var pointers = pbuf.pointers;
            var pointer = pointers["a_p_data"];
            if (pointer) {
                var end = 3 * delay_attrs_masked.length;
                var p_data = pdata.p_data;
                for (var k = 0; k < p_data.length; k=k+3)
                    p_data[k + 1] = delay_attrs_masked[Math.round(k / 3)];
                m_geom.update_bufs_data_array(pbuf, "a_p_data", 3, p_data);
            }
        }
    }
}

exports.update_start_pos = function(obj, trans, quats) {
    var scenes_data = obj.scenes_data;
    for (var i = 0; i < scenes_data.length; i++) {
        var batches = scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++) {
            var pdata = batches[j].particles_data;
            if (!pdata || !pdata.use_world_space)
                continue;

            for (var k = 0; k < pdata.delay_attrs.length * 8; k++) {
                pdata.emitter_tsr_snapshots[8 * k] = trans[0];
                pdata.emitter_tsr_snapshots[8 * k + 1] = trans[1];
                pdata.emitter_tsr_snapshots[8 * k + 2] = trans[2];
                pdata.emitter_tsr_snapshots[8 * k + 3] = trans[3];
                pdata.emitter_tsr_snapshots[8 * k + 4] = quats[0];
                pdata.emitter_tsr_snapshots[8 * k + 5] = quats[1];
                pdata.emitter_tsr_snapshots[8 * k + 6] = quats[2];
                pdata.emitter_tsr_snapshots[8 * k + 7] = quats[3];
            }
        }
    }
}

exports.update_particles_submesh = function(submesh, batch, pcount, material) {

    var data = [];
    for (var i = 0; i < pcount; i++)
        data.push(0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1);
    submesh.va_common["a_tbn_quat"] = new Float32Array(data);

    if (batch.part_node_data) {
        var data = [];
        for (var i = 0; i < pcount; i++)
            data.push(i, i, i, i);
        submesh.va_common[batch.part_node_data.name] = new Float32Array(data);
    }
}

exports.update_particles_objs_cache = function(obj) {
    if (_particles_objs_cache.indexOf(obj) == -1)
        _particles_objs_cache.push(obj);
}

exports.remove_obj_from_cache = function(obj) {
    var ind = _particles_objs_cache.indexOf(obj);
    if (ind != -1)
        _particles_objs_cache.splice(ind, 1);
}

exports.cleanup = function() {
    _particles_objs_cache.length = 0;
}

}
