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

import m_assert_fact from "../util/assert.js";
import m_cfg_fact from "./config.js";
import m_batch_fact from "./batch.js";
import m_generator_fact from "../util/generator.js";
import m_geom_fact from "./geometry.js";
import * as m_tbn from "./tbn.js";
import m_tex_fact from "./textures.js";
import m_time_fact from "./time.js";
import * as m_tsr from "./tsr.js";
import * as m_util from "./util.js";
import * as m_vec3 from "../libs/gl_matrix/vec3.js";

/**
 * Particles internal API.
 * External API implemented in animation.js module.
 * @name particles
 * @namespace
 * @exports exports as particles
 */
function Int_particles(ns, exports) {

var m_assert = m_assert_fact(ns);
var m_cfg    = m_cfg_fact(ns);
var m_batch  = m_batch_fact(ns);
var m_generator = m_generator_fact(ns);
var m_geom   = m_geom_fact(ns);
var m_tex    = m_tex_fact(ns);
var m_time   = m_time_fact(ns);

var STDGRAVITY = 9.81;
var DELAYRANDFACTOR = 10;

var cfg_def = m_cfg.defaults;

var _tbn_tmp = m_tbn.create();
var _tsr_tmp = m_tsr.create();
var _vec3_tmp = new Float32Array(3);

var _particles_objs_cache = [];

function init_particles_data(name, type) {
    var pdata = {
        name: name,
        p_type: type,

        time: 0,
        prev_time: -1,
        use_world_space: false,
        count_factor: 1,

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
        tbn: null,
        tbn_cache: null,
        delay_attrs: null,
        delay_attrs_masked: null,
        emitter_tsr_snapshots: null,
        p_data: null,

        tilt: 0,
        tilt_rand: 0
    }

    return pdata;
}

exports.clone_particles_data = clone_particles_data;
function clone_particles_data(particles_data) {

    var particles_data_new = init_particles_data(particles_data.name, 
            particles_data.type);

    particles_data_new.time = particles_data.time;
    particles_data_new.prev_time = particles_data.prev_time;
    particles_data_new.use_world_space = particles_data.use_world_space;
    particles_data_new.count_factor = particles_data.count_factor;

    particles_data_new.frame_start = particles_data.frame_start;
    particles_data_new.frame_end = particles_data.frame_end;
    particles_data_new.time_length = particles_data.time_length;
    particles_data_new.lifetime_frames = particles_data.lifetime_frames;
    particles_data_new.lifetime = particles_data.lifetime;
    particles_data_new.cyclic = particles_data.cyclic;

    particles_data_new.mass = particles_data.mass;
    particles_data_new.nfactor = particles_data.nfactor;
    particles_data_new.gravity = particles_data.gravity;
    particles_data_new.fade_in = particles_data.fade_in;
    particles_data_new.fade_out = particles_data.fade_out;
    particles_data_new.wind_factor = particles_data.wind_factor;

    particles_data_new.size = particles_data.size;
    particles_data_new.alpha_start = particles_data.alpha_start;
    particles_data_new.alpha_end = particles_data.alpha_end;
    particles_data_new.color_ramp_length = particles_data.color_ramp_length;
    particles_data_new.color_ramp.set(particles_data.color_ramp);

    particles_data_new.need_buffers_update = particles_data.need_buffers_update;

    particles_data_new.positions = m_util.clone_object_r(particles_data.positions);
    particles_data_new.positions_cache = m_util.clone_object_r(
            particles_data.positions_cache);
    particles_data_new.tbn = m_util.clone_object_r(particles_data.tbn);
    particles_data_new.tbn_cache = m_util.clone_object_r(particles_data.tbn_cache);
    particles_data_new.delay_attrs = m_util.clone_object_r(particles_data.delay_attrs);
    particles_data_new.delay_attrs_masked = m_util.clone_object_r(
            particles_data.delay_attrs_masked);
    particles_data_new.emitter_tsr_snapshots = m_util.clone_object_r(
            particles_data.emitter_tsr_snapshots);
    particles_data_new.p_data = m_util.clone_object_r(particles_data.p_data);

    particles_data_new.tilt = particles_data.tilt;
    particles_data_new.tilt_rand = particles_data.tilt_rand;

    return particles_data_new;
}

var _rand = function() {
    m_assert.panic("_rand() undefined");
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

exports.obj_has_psys = function(obj, psys_name) {
    var scenes_data = obj.scenes_data;
    for (var i = 0; i < scenes_data.length; i++) {
        var batches = scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++) {
            var pdata = batches[j].particles_data;
            if (pdata && pdata.name == psys_name)
                return true;
        }
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

exports.create_particles_data = function(batch, psystem, pmaterial) {
    var pdata = batch.particles_data = init_particles_data(psystem["name"],
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
        size = pmaterial.halo_settings.size;

        var hardness = pmaterial.halo_settings.hardness;

        // default 50
        if (hardness < 30) {
            alpha_start = 0.5;
            alpha_end = 0.9;
        } else if (hardness < 40) {
            alpha_start = 0.1;
            alpha_end = 1.0;
        } else if (hardness < 50) {
            alpha_start = 0.0;
            alpha_end = 0.8;
        } else {
            alpha_start = 0.0;
            alpha_end = 0.5;
        }
    } else {
        size = psystem["settings"]["particle_size"];
        alpha_start = 1.0;
        alpha_end = 1.0;
    }
    pdata.size = size;
    pdata.alpha_start = alpha_start;
    pdata.alpha_end = alpha_end;

    if (pmaterial.use_nodes && psystem["settings"]["render_type"] == "BILLBOARD") {
        m_batch.set_batch_directive(batch, "NODES", 1);
        m_batch.set_batch_directive(batch, "PARTICLE_BATCH", 1);
        batch.has_nodes = true;
    }

    /** size ramp */
    var tex_slot = psystem["settings"]["texture_slots"];

    if (tex_slot[0] && tex_slot[0]["use_map_size"] && tex_slot[0]["texture"] &&
            tex_slot[0]["texture"]["type"] == "BLEND" &&
            tex_slot[0]["texture"]["use_color_ramp"] &&
            cfg_def.allow_vertex_textures) {
        var bpy_tex = tex_slot[0]["texture"];
        var image_data = [];
        m_tex.calc_color_ramp_data(bpy_tex["color_ramp"],
                m_tex.PART_COLORRAMP_TEXT_SIZE, image_data);
        image_data = new Uint8Array(image_data.map(function(val) {return m_util.clamp(val * 255,
            0, 255)}));

        var tex = m_tex.create_color_ramp_texture(image_data, m_tex.PART_COLORRAMP_TEXT_SIZE);

        m_batch.append_texture(batch, tex, "u_color_ramp_tex", bpy_tex["name"]);
        m_batch.set_batch_directive(batch, "USE_COLOR_RAMP", 1);
    }

    /** color ramp */
    var m_tex_slot = pmaterial.texture_slots;
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
            ["a_position", "a_tbn"], null, render);

    var pos_tbn = distribute_positions_tbn(pcount, emit_from,
            emitter_submesh);
    var positions = pos_tbn[0];
    var tbn = pos_tbn[1];

    pdata.positions = new Float32Array(positions);
    pdata.tbn = new Float32Array(tbn);
    pdata.positions_cache = new Float32Array(positions.length);
    pdata.tbn_cache = new Float32Array(tbn.length);

    var delay_attrs = gen_delay_attrs(pcount, time_start, time_end,
                                      is_rand_delay, cyclic);
    pdata.delay_attrs = new Float32Array(delay_attrs);
    // needed to restore original delays when using particles number factor
    pdata.delay_attrs_masked = new Float32Array(delay_attrs);

    if (pdata.use_world_space) {
        pdata.emitter_tsr_snapshots = new Float32Array(delay_attrs.length * _tsr_tmp.length);
        for (var i = 0; i < delay_attrs.length * 8; i++) {
            m_tsr.set_to_flat_array(tsr, pdata.emitter_tsr_snapshots, i);
        }

        pose_emitter_world(pdata, positions, tbn, tsr, positions, tbn);
    }

    var submesh = m_geom.init_submesh("EMITTER_PARTICLES");
    var va_frame = m_geom.create_empty_va_frame();
    va_frame["a_position"] = positions;
    va_frame["a_tbn"] = tbn;
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
 * Recalculate particles position/tbn in world space.
 */
function pose_emitter_world(pdata, positions, tbn, tsr,
                            positions_new, tbn_new) {

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

        if (need_emitter_pos) {
            m_tsr.set_to_flat_array(tsr, em_snapshots, j);
            m_tsr.copy(tsr, _tsr_tmp);
        } else {
            m_tsr.get_from_flat_array(em_snapshots, j, _tsr_tmp);
        }

        // positions
        var pos = _vec3_tmp;
        pos[0] = positions[3 * j];
        pos[1] = positions[3 * j + 1];
        pos[2] = positions[3 * j + 2];

        m_tsr.transform_vec3(pos, _tsr_tmp, pos);

        positions_new[3 * j]     = pos[0];
        positions_new[3 * j + 1] = pos[1];
        positions_new[3 * j + 2] = pos[2];

        var cur_tbn = m_tbn.get_item(tbn, j, _tbn_tmp);

        m_tbn.multiply_tsr(cur_tbn, _tsr_tmp, cur_tbn);

        m_tbn.set_item(tbn_new, cur_tbn, j);

        // same transform for the rest corners (billboard)
        for (var k = 1; k < 4; k++) {
            positions_new[3 * (j + k)]     = positions_new[3 * j];
            positions_new[3 * (j + k) + 1] = positions_new[3 * j + 1];
            positions_new[3 * (j + k) + 2] = positions_new[3 * j + 2];

            m_tbn.set_item(tbn_new, cur_tbn, j + k);
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
        var tbncache = pdata.tbn_cache;

        var positions = pdata.positions;
        var tbn = pdata.tbn;

        pose_emitter_world(pdata, positions, tbn,
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
        m_generator.srand(seed);
        _rand = function() {
            return m_generator.rand();
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

function distribute_positions_tbn(pcount, emit_from, emitter_submesh) {
    switch (emit_from) {
    case "VERT":

        var ecoords = emitter_submesh.va_frames[0]["a_position"];
        var etbncoords = emitter_submesh.va_frames[0]["a_tbn"];

        var pindices = gen_pindices(pcount, ecoords);
        var positions = gen_positions(pindices, ecoords);
        var tbn = gen_tbn(pindices, etbncoords);
        break;
    case "FACE":
        var positions = [];
        var tbn = [];

        // TODO: get seed from particle system
        var seed = [];
        m_util.init_rand_r_seed(0, seed);
        var rand_pos = m_geom.geometry_random_points(emitter_submesh, pcount, false, seed);
        m_util.init_rand_r_seed(0, seed);
        var rand_tbn = m_geom.geometry_random_points(emitter_submesh, pcount, true, seed);

        tbn = m_tbn.create(rand_pos.length * 4);

        for (var i = 0; i < rand_pos.length; i++) {

            positions.push(rand_pos[i][0], rand_pos[i][1], rand_pos[i][2]);
            positions.push(rand_pos[i][0], rand_pos[i][1], rand_pos[i][2]);
            positions.push(rand_pos[i][0], rand_pos[i][1], rand_pos[i][2]);
            positions.push(rand_pos[i][0], rand_pos[i][1], rand_pos[i][2]);

            m_tbn.set_item(tbn, rand_tbn[i], 4 * i);
            m_tbn.set_item(tbn, rand_tbn[i], 4 * i + 1);
            m_tbn.set_item(tbn, rand_tbn[i], 4 * i + 2);
            m_tbn.set_item(tbn, rand_tbn[i], 4 * i + 3);
        }

        positions = new Float32Array(positions);

        break;
    case "VOLUME":
        m_assert.panic("Particle emission from volume is not supported");
        break;
    default:
        m_assert.panic("Wrong emit from option");
        break;
    }

    return [positions, tbn];
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

function gen_tbn(indices, etbncoords) {
    var tbn = m_tbn.create(indices.length);

    for (var i = 0; i < indices.length; i++) {
        var cur_tbn = m_tbn.get_item(etbncoords, indices[i], _tbn_tmp);
        m_tbn.set_item(tbn, cur_tbn, i);
    }

    return tbn;
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
            m_assert.panic("Undefined velocity factor");
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

exports.get_normal_factor = function(obj, psys_name) {
    var scenes_data = obj.scenes_data;
    for (var i = 0; i < scenes_data.length; i++) {
        var batches = scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++) {
            var pdata = batches[j].particles_data;

            if (!pdata || pdata.name != psys_name)
                continue;

            return pdata.nfactor;
        }
    }

    return 0;
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

            pdata.count_factor = factor;

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
                var p_data = pdata.p_data;
                for (var k = 0; k < p_data.length; k=k+3)
                    p_data[k + 1] = delay_attrs_masked[Math.round(k / 3)];
                m_geom.update_bufs_data_array(pbuf, "a_p_data", 3, p_data);
            }
        }
    }
}

exports.update_start_pos = (function() {
    var _tsr_tmp = m_tsr.create();

    return function update_start_pos(obj, trans, scale, quats) {
        var scenes_data = obj.scenes_data;

        var tsr = m_tsr.set_trans(trans, _tsr_tmp);
        tsr = m_tsr.set_scale(scale, _tsr_tmp);
        tsr = m_tsr.set_quat(quats, _tsr_tmp);

        for (var i = 0; i < scenes_data.length; i++) {
            var batches = scenes_data[i].batches;
            for (var j = 0; j < batches.length; j++) {
                var pdata = batches[j].particles_data;
                if (!pdata || !pdata.use_world_space)
                    continue;

                for (var k = 0; k < pdata.delay_attrs.length * 8; k++) {
                    m_tsr.set_to_flat_array(tsr, pdata.emitter_tsr_snapshots, k);
                }
            }
        }
    };
})();

exports.update_particles_submesh = function(submesh, batch, pcount) {

    submesh.va_common["a_tbn"] = m_tbn.create(4 * pcount);
    m_tbn.identity(submesh.va_common["a_tbn"]);

    if (batch.part_node_data) {
        var node_data = [];
        for (var i = 0; i < pcount; i++)
            node_data.push(i, i, i, i);
        submesh.va_common[batch.part_node_data.name] = new Float32Array(node_data);
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

var int_particles_factory = register("__particles", Int_particles);

export default int_particles_factory;
