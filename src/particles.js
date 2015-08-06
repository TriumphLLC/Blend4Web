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
var m_geom   = require("__geometry");
var m_scenes = require("__scenes");
var m_util   = require("__util");
var m_tsr    = require("__tsr");

var m_vec3 = require("vec3");

var cfg_ani = m_cfg.animation;

var STDGRAVITY = 9.81;
var DELAYRANDFACTOR = 10;

var tsr_tmp = new Float32Array(8);
var vec3_tmp = new Float32Array(3);

var _rand = function() {
    throw "_rand() undefined";
}

exports.has_particles = function(obj) {
    if (obj["particle_systems"].length > 0)
        return true;
    else
        return false;
}

/**
 * Check if object has animated particle system (of type EMITTER)
 */
exports.has_anim_particles = function(obj) {
    for (var i = 0; i < obj["particle_systems"].length; i++) {
        var psettings = obj["particle_systems"][i]["settings"];
        if (psettings["type"] == "EMITTER")
            return true;
    }

    return false;
}

exports.has_hair_particles = function(obj) {
    for (var i = 0; i < obj["particle_systems"].length; i++) {
        var psettings = obj["particle_systems"][i]["settings"];
        if (psettings["type"] == "HAIR")
            return true;
    }

    return false;
}

exports.has_dynamic_grass_particles = function(obj) {
    for (var i = 0; i < obj["particle_systems"].length; i++) {
        var psettings = obj["particle_systems"][i]["settings"];
        if (psettings["type"] == "HAIR" && psettings["b4w_dynamic_grass"]) {
            return true;
        }
    }

    return false;
}

/**
 * Generate buffers for batch, emitter mesh, particle system and material
 * process particle from each emitter vertex
 */
exports.generate_emitter_particles_submesh = function(batch, emitter_mesh, 
        psystem, pmaterial, tsr) {

    psystem._internal = psystem._internal || {};

    var emitter_submesh = m_geom.extract_submesh_all_mats(emitter_mesh,
            ["a_position", "a_normal"], null);

    var pcount = psystem["settings"]["count"]; 
    var time_start = psystem["settings"]["frame_start"] / cfg_ani.framerate;
    var time_end = psystem["settings"]["frame_end"] / cfg_ani.framerate;
    var lifetime = psystem["settings"]["lifetime"] / cfg_ani.framerate;
    var lifetime_random = psystem["settings"]["lifetime_random"];

    var emit_from = psystem["settings"]["emit_from"];

    var vel_factor_rand = psystem["settings"]["factor_random"];
    var ang_vel_mode = psystem["settings"]["angular_velocity_mode"];
    var ang_vel_factor = psystem["settings"]["angular_velocity_factor"];

    var is_rand_delay = psystem["settings"]["b4w_randomize_emission"];
    var cyclic = psystem["settings"]["b4w_cyclic"];

    init_particle_rand(psystem["seed"]);

    var world_space = psystem._internal.use_world_space =
            psystem["settings"]["b4w_coordinate_system"] == "WORLD"? true: false;

    psystem._internal.frame = 0;

    var is_billboard = !batch.halo_particles;

    if (is_billboard) {
        var bb_vertices = gen_bb_vertices(pcount);
        var bb_indices = gen_bb_indices(pcount);
    }

    var pos_norm = distribute_positions_normals(pcount, emit_from, 
            emitter_submesh, is_billboard);
    var positions = pos_norm[0];
    var normals = pos_norm[1];

    psystem._internal.positions = new Float32Array(positions);
    psystem._internal.normals = new Float32Array(normals);

    psystem._internal.positions_cache = new Float32Array(positions.length);
    psystem._internal.normals_cache = new Float32Array(normals.length);

    psystem._internal.time = 0;
    psystem._internal.prev_time = -1;

    var delay_attrs = gen_delay_attrs(pcount, time_start, time_end,
                                      is_rand_delay, is_billboard, cyclic);
    psystem._internal.delay_attrs = new Float32Array(delay_attrs);

    // needed to restore original delays when using particles number factor
    psystem._internal.delay_attrs_masked = new Float32Array(delay_attrs);

    psystem._internal.emitter_tsr_snapshots = new Float32Array(delay_attrs.length * 8);
    for (var i = 0; i < delay_attrs.length * 8; i++)
        for (var j = 0; j < 8; j++)
            psystem._internal.emitter_tsr_snapshots[8 * i + j] = tsr[j];

    if (world_space)
        pose_emitter_world(psystem, is_billboard, positions, normals, tsr, positions, normals);

    var lifetimes = gen_lifetimes(pcount, lifetime, lifetime_random, is_billboard);

    var vels = gen_velocities(pcount, vel_factor_rand, ang_vel_mode, ang_vel_factor, is_billboard);

    var submesh = m_util.create_empty_submesh("EMITTER_PARTICLES");

    var va_frame = m_util.create_empty_va_frame();
    va_frame["a_position"] = positions;
    va_frame["a_normal"] = normals;
    submesh.va_frames[0] = va_frame;

    if (is_billboard) {
        batch.draw_mode = m_geom.DM_DYNAMIC_TRIANGLES;
        submesh.indices = bb_indices;
    } else {
        batch.draw_mode = m_geom.DM_DYNAMIC_POINTS;
        submesh.indices = new Uint16Array(0);
    }

    submesh.base_length = positions.length/3;
    submesh.va_common["a_p_delay"] = delay_attrs;
    submesh.va_common["a_p_lifetime"] = lifetimes;
    submesh.va_common["a_p_vels"] = vels;

    if (is_billboard)
        submesh.va_common["a_p_bb_vertex"] = bb_vertices;

    return submesh;
}

/**
 * Recalculate particles position/normals in world space.
 */
function pose_emitter_world(psys, is_billboard, positions, normals, tsr,
                            positions_new, normals_new) {

    var delay_attrs = psys._internal.delay_attrs;
    var em_snapshots = psys._internal.emitter_tsr_snapshots;
    var time = psys._internal.time;
    var prev_time = psys._internal.prev_time;

    var step = is_billboard? 4: 1;

    for (var j = 0; j < delay_attrs.length; j+=step) {
        var delay = delay_attrs[j];

        // looped timing 
        var need_emitter_pos = (time > prev_time && time >= delay && delay > prev_time)
                || (time < prev_time && (delay > prev_time || time >= delay));

        if (need_emitter_pos)
            for (var k = 0; k < 8; k++)
                em_snapshots[8 * j + k]  = tsr[k];

        for (var k = 0; k < 8; k++)
            tsr_tmp[k] = em_snapshots[8 * j + k];

        // positions
        var pos = vec3_tmp;
        pos[0] = positions[3 * j];
        pos[1] = positions[3 * j + 1];
        pos[2] = positions[3 * j + 2];

        m_tsr.transform_vec3(pos, tsr_tmp, pos);

        positions_new[3 * j]     = pos[0];
        positions_new[3 * j + 1] = pos[1];
        positions_new[3 * j + 2] = pos[2];

        // normals
        var norm = vec3_tmp;
        norm[0] = normals[3 * j];
        norm[1] = normals[3 * j + 1];
        norm[2] = normals[3 * j + 2];

        m_tsr.transform_dir_vec3(norm, tsr_tmp, norm);

        normals_new[3 * j]     = norm[0];
        normals_new[3 * j + 1] = norm[1];
        normals_new[3 * j + 2] = norm[2];

        if (is_billboard) {
            for (var k = 1; k < 4; k++) {
                positions_new[3 * (j + k)]     = positions_new[3 * j];
                positions_new[3 * (j + k) + 1] = positions_new[3 * j + 1];
                positions_new[3 * (j + k) + 2] = positions_new[3 * j + 2];
                normals_new[3 * (j + k)]       = norm[0];
                normals_new[3 * (j + k) + 1]   = norm[1];
                normals_new[3 * (j + k) + 2]   = norm[2];
            }
        }
    }
}

exports.update_emitter_transform = function(obj) {

    var batches = obj._batches;
    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];
        var psys = batches[i].particle_system;

        if (!psys)
            continue;

        var pbuf = batch.bufs_data;

        var world_space = psys._internal.use_world_space;

        if (!world_space)
            return;

        var pcache = psys._internal.positions_cache;
        var ncache = psys._internal.normals_cache;

        var positions = psys._internal.positions;
        var normals = psys._internal.normals;

        var is_billboard = !batch.halo_particles;
        pose_emitter_world(psys, is_billboard, positions, normals, obj._render.tsr,
                     pcache, ncache);

        m_geom.make_dynamic(pbuf);
        m_geom.update_bufs_data_array(pbuf, "a_position", 3, pcache);
        m_geom.update_bufs_data_array(pbuf, "a_normal", 3, ncache);
    }
}

exports.set_emitter_particles_uniforms = function(batch, psystem, pmaterial) {
    var lifetime = psystem["settings"]["lifetime"] / cfg_ani.framerate;
    var time_start = psystem["settings"]["frame_start"] / cfg_ani.framerate;
    var time_end = psystem["settings"]["frame_end"] / cfg_ani.framerate;
    var nfactor = psystem["settings"]["normal_factor"];
    var bfactor = psystem["settings"]["brownian_factor"];
    var gravity = psystem["settings"]["effector_weights"]["gravity"] * STDGRAVITY;
    var wind = psystem["settings"]["effector_weights"]["wind"];
    var mass = psystem["settings"]["mass"];
    var fade_in = psystem["settings"]["b4w_fade_in"] /cfg_ani.framerate;
    var fade_out = psystem["settings"]["b4w_fade_out"] /cfg_ani.framerate;
    var cyclic = psystem["settings"]["b4w_cyclic"];

    batch.p_length = time_end - time_start;
    batch.p_cyclic = cyclic ? 1 : 0;
    batch.p_nfactor = nfactor; 
    batch.p_gravity = gravity; 

    var glob_wind = m_scenes.get_wind();
    batch.p_wind[0] = glob_wind[0] * wind;
    batch.p_wind[1] = glob_wind[1] * wind;
    batch.p_wind[2] = glob_wind[2] * wind;

    batch.p_max_lifetime = lifetime; 
    batch.p_mass = mass; 

    batch.p_fade_in = fade_in; 
    batch.p_fade_out = fade_out; 

    var psize;
    var alpha_start;
    var alpha_end;

    if (batch.halo_particles) {
        psize = pmaterial["halo"]["size"];

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
        psize = psystem["settings"]["particle_size"];
        alpha_start = 1.0;
        alpha_end = 1.0;
    }
    batch.p_size = psize; 
    batch.p_alpha_start = alpha_start;
    batch.p_alpha_end = alpha_end;

    /** size ramp */
    var tex_slot = psystem["settings"]["texture_slots"];
    var sramp_varr = [-1,0,-1,0,-1,0,-1,0];

    if (tex_slot[0] && tex_slot[0]["use_map_size"] && tex_slot[0]["texture"] &&
            tex_slot[0]["texture"]["type"] == "BLEND" && 
            tex_slot[0]["texture"]["use_color_ramp"]) {
        
        var color_ramp_elems = tex_slot[0]["texture"]["color_ramp"]["elements"];
        var rlen = Math.min(color_ramp_elems.length*2, sramp_varr.length);
        for (var i = 0; i < rlen; i+=2) {
            var rel = color_ramp_elems[i/2];

            sramp_varr[i] = rel["position"];

            var intensity = (rel["color"][0] + rel["color"][1] + rel["color"][2])/3;
            sramp_varr[i+1] = intensity;
        }
        batch.p_size_ramp_length = color_ramp_elems.length;
    }
        
    batch.p_size_ramp.set(sramp_varr);

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

        batch.p_color_ramp_length = color_ramp_elems.length;
    }
    batch.p_color_ramp.set(cramp_varr);

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

/**
 * Generate billboard vertices
 */
function gen_bb_vertices(pcount) {
    var bbv = [];

    for (var i = 0; i < pcount; i++) {
        bbv.push(-0.5,-0.5, -0.5,0.5, 0.5,0.5, 0.5,-0.5);
    }
    
    var bb_vertices = new Float32Array(bbv); 
    return bb_vertices;
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

function distribute_positions_normals(pcount, emit_from, emitter_submesh, 
        is_billboard) {

    switch (emit_from) {
    case "VERT":

        var ecoords = emitter_submesh.va_frames[0]["a_position"];
        var encoords = emitter_submesh.va_frames[0]["a_normal"];

        var pindices = gen_pindices(pcount, ecoords, is_billboard);
        var positions = gen_positions(pindices, ecoords);
        var normals = gen_normals(pindices, encoords);
        break;
    case "FACE":
        var positions = [];
        var normals = [];

        // TODO: get seed from particle system
        var seed = [];
        m_util.init_rand_r_seed(0, seed);
        var rand_pos = m_geom.geometry_random_points(emitter_submesh, pcount, false, seed);
        m_util.init_rand_r_seed(0, seed);
        var rand_norm = m_geom.geometry_random_points(emitter_submesh, pcount, true, seed);

        for (var i = 0; i < rand_pos.length; i++) {

            positions.push(rand_pos[i][0], rand_pos[i][1], rand_pos[i][2]);
            if (is_billboard) {
                positions.push(rand_pos[i][0], rand_pos[i][1], rand_pos[i][2]);
                positions.push(rand_pos[i][0], rand_pos[i][1], rand_pos[i][2]);
                positions.push(rand_pos[i][0], rand_pos[i][1], rand_pos[i][2]);
            }

            normals.push(rand_norm[i][0], rand_norm[i][1], rand_norm[i][2]);
            if (is_billboard) {
                normals.push(rand_norm[i][0], rand_norm[i][1], rand_norm[i][2]);
                normals.push(rand_norm[i][0], rand_norm[i][1], rand_norm[i][2]);
                normals.push(rand_norm[i][0], rand_norm[i][1], rand_norm[i][2]);
            }
        }

        var positions = new Float32Array(positions);
        var normals = new Float32Array(normals);

        break;
    case "VOLUME":
        throw "Particle emission from volume is not supported";
        break;
    default:
        throw "Wrong emit from option";
        break;
    }

    return [positions, normals];
}

/** 
 * Generate particle indices for emitter vertex coordinates and normals
 * pcount - total number of particles
 * ecoords - possible locations (coordinates of emitter mesh vertices)
 */ 
function gen_pindices(pcount, ecoords, is_billboard) {

    var vcount = ecoords.length/3;
    var indices = [];

    for (var i = 0; i < pcount; i++) {

        /* get random vertex of emitter */
        var vrand = Math.round((vcount - 1) * _rand());
        indices.push(vrand);
        if (is_billboard) {
            indices.push(vrand);
            indices.push(vrand);
            indices.push(vrand);
        }
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

function gen_normals(indices, encoords) {
    var narr = [];

    for (var i = 0; i < indices.length; i++) {
        
        narr.push(encoords[3*indices[i]]);
        narr.push(encoords[3*indices[i] + 1]);
        narr.push(encoords[3*indices[i] + 2]);
    }

    var normals = new Float32Array(narr);
    return normals;
}


function gen_delay_attrs(pcount, mindelay, maxdelay, random, is_billboard,
                         cyclic) {
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
        if (is_billboard) {
            darr.push(delay);
            darr.push(delay);
            darr.push(delay);
        }
    }

    var delay_attrs = new Float32Array(darr);

    return delay_attrs;
}

function gen_lifetimes(pcount, lifetime, lifetime_random, is_billboard) {
    var larr = [];

    var delta = lifetime * lifetime_random;

    for (var i = 0; i < pcount; i++) {

        var delta_rand = delta*_rand();
        larr.push(lifetime - delta_rand);
        if (is_billboard) {
            larr.push(lifetime - delta_rand);
            larr.push(lifetime - delta_rand);
            larr.push(lifetime - delta_rand);
        }
    }
    
    var lifetimes = new Float32Array(larr);
    return lifetimes;
}

/** 
 * Generate array of particles'es linear and angular speed
 * vec4(linear_x, linear_y, linear_z, angular)
 */
function gen_velocities(pcount, vel_factor_rand, ang_vel_mode, ang_vel_factor, is_billboard)
{
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
            throw("Undefined velocity factor");
        }
        
        if (is_billboard) {
            var last = varr.slice(-4);
            for (var j = 0; j < 12; j++) {
                varr.push(last[j % 4]);
            }
        }
    }
    
    var vels = new Float32Array(varr);
    return vels;

}

exports.set_time = function(psys, time) {
    psys._internal.prev_time = psys._internal.time;
    psys._internal.time = time;
}


/** 
 * Prepare buffer for lens flare
 */
exports.prepare_lens_flares = function(submesh) {

    var base_length = submesh.base_length;
    var sub_pos = submesh.va_frames[0]["a_position"];
    var sub_tco = submesh.va_common["a_texcoord"];

    var bb_dist_arr = [];
    var bb_vert_arr = [];

    for (var i = 0; i < base_length; i++) {

        bb_vert_arr.push(sub_pos[3*i]);
        bb_vert_arr.push(sub_pos[3*i + 1]);

        bb_dist_arr.push(sub_pos[3*i + 2]);
    }

    var bb_dist_arr = new Float32Array(bb_dist_arr);
    var bb_vert_arr = new Float32Array(bb_vert_arr);

    submesh.va_common["a_lf_dist"] = bb_dist_arr;
    submesh.va_common["a_lf_bb_vertex"] = bb_vert_arr;
    submesh.va_common["a_texcoord"] = sub_tco;

    return submesh;
}

exports.set_size = function(obj, psys_name, size) {
    var batches = obj._batches;
    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];
        var psys = batch.particle_system;

        if (!psys || psys["name"] != psys_name)
            continue;

        batch.p_size = size;
    }
}

exports.set_normal_factor = function(obj, psys_name, nfactor) {
    var batches = obj._batches;
    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];
        var psys = batch.particle_system;

        if (!psys || psys["name"] != psys_name)
            continue;

        batch.p_nfactor = nfactor;
    }
}

exports.set_factor = function(obj, psys_name, factor) {
    var batches = obj._batches;
    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];
        var psys = batch.particle_system;

        if (!psys || psys["name"] != psys_name)
            continue;

        var delay_attrs = psys._internal.delay_attrs;

        if (factor == 1)
            var delay_attrs_masked = delay_attrs;

        else if (factor == 0) {
            var is_billboard = !batch.halo_particles;
            var inc = is_billboard? 4: 1;
            var delay_attrs_masked = psys._internal.delay_attrs_masked;

            for (var j = 0; j < delay_attrs_masked.length; j+=inc) {
                delay_attrs_masked[j] = 10000;
                if (is_billboard) {
                    delay_attrs_masked[j+1] = delay_attrs_masked[j];
                    delay_attrs_masked[j+2] = delay_attrs_masked[j];
                    delay_attrs_masked[j+3] = delay_attrs_masked[j];
                }
            }
        } else {
            var step = 1 / factor;
            var delay_attrs_masked = psys._internal.delay_attrs_masked;

            var is_billboard = !batch.halo_particles;
            var inc = is_billboard? 4: 1;

            var ind = 0;
            for (var j = 0; j < delay_attrs_masked.length; j+=inc) {
                if (j >= ind) {
                    delay_attrs_masked[j] = delay_attrs[j];
                    ind += step;
                } else
                    delay_attrs_masked[j] = 10000;

                if (is_billboard) {
                    delay_attrs_masked[j+1] = delay_attrs_masked[j];
                    delay_attrs_masked[j+2] = delay_attrs_masked[j];
                    delay_attrs_masked[j+3] = delay_attrs_masked[j];
                }
            }
        }
        var pbuf = batch.bufs_data;
        m_geom.update_bufs_data_array(pbuf, "a_p_delay", 1, delay_attrs_masked);
    }
}

exports.update_start_pos = function(obj, trans, quats) {

    var psystems = obj["particle_systems"];

    for (var i = 0; i < psystems.length; i++) {
        var psys = psystems[i];
        var psettings = psys["settings"];
        if (psettings["type"] == "EMITTER") {
            var delay_attrs = psys._internal.delay_attrs;
            for (var i = 0; i < delay_attrs.length * 8; i++) {
                psys._internal.emitter_tsr_snapshots[8 * i] = trans[0];
                psys._internal.emitter_tsr_snapshots[8 * i + 1] = trans[1];
                psys._internal.emitter_tsr_snapshots[8 * i + 2] = trans[2];
                psys._internal.emitter_tsr_snapshots[8 * i + 3] = trans[3];
                psys._internal.emitter_tsr_snapshots[8 * i + 4] = quats[0];
                psys._internal.emitter_tsr_snapshots[8 * i + 5] = quats[1];
                psys._internal.emitter_tsr_snapshots[8 * i + 6] = quats[2];
                psys._internal.emitter_tsr_snapshots[8 * i + 7] = quats[3];
            }
        }
    }
}

}
