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

var m_vec3 = require("vec3");

var cfg_ani = m_cfg.animation;

var STDGRAVITY = 9.81;
var DELAYRANDFACTOR = 10;

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
        psystem, pmaterial, world_matrix) {

    psystem._internal = psystem._internal || {};

    var emitter_submesh = m_geom.extract_submesh_all_mats(emitter_mesh,
            ["a_position", "a_normal"], false);

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

    init_particle_rand(psystem["seed"]);

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

    pose_emitter(positions, normals, world_matrix, positions, normals);

    var maxdelay = time_end - time_start; 
    var delay_attrs = gen_delay_attrs(pcount, maxdelay, is_rand_delay, is_billboard);
    psystem._internal.delay_attrs = new Float32Array(delay_attrs);

    var lifetimes = gen_lifetimes(pcount, lifetime, lifetime_random, is_billboard);
    var vels = gen_velocities(pcount, vel_factor_rand, ang_vel_mode, ang_vel_factor, is_billboard);

    var submesh = m_util.create_empty_submesh("EMITTER_PARTICLES");

    var va_frame = m_util.create_empty_va_frame();
    va_frame["a_position"] = positions;
    va_frame["a_normal"] = normals;
    submesh.va_frames[0] = va_frame;

    if (is_billboard)
        submesh.indices = bb_indices;
    else {
        batch.draw_mode = m_geom.DM_POINTS;
        submesh.indices = new Uint16Array(0);
    }

    submesh.base_length = positions.length/3;
    submesh.va_common["a_p_delay"] = delay_attrs;
    submesh.va_common["a_p_lifetime"] = lifetimes;
    submesh.va_common["a_p_vels"] = vels;

    if (is_billboard)
        submesh.va_common["a_p_bb_vertex"] = bb_vertices;

    set_emitter_particles_uniforms(batch, psystem, pmaterial);

    return submesh;
}

/**
 * Recalculate position/normals according to world location.
 * dest positions/normals may be the same
 */
function pose_emitter(positions, normals, world_matrix, positions_new,
        normals_new) {

    m_util.positions_multiply_matrix(positions, world_matrix, positions_new, 0);
    m_util.vectors_multiply_matrix(normals, world_matrix, normals_new, 0);
}

/**
 * Only for non-animated emitters
 */
exports.update_emitter_transform = function(obj) {

    var batches = obj._batches;
    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];
        var psys = batches[i].particle_system;

        if (!psys)
            continue;

        var pbuf = batch.bufs_data;

        var pcache = psys._internal.positions_cache;
        var ncache = psys._internal.normals_cache;

        pose_emitter(psys._internal.positions, psys._internal.normals,
                obj._render.world_matrix, pcache, ncache);

        m_geom.make_dynamic(pbuf);
        m_geom.update_bufs_data_array(pbuf, "a_position", 3, pcache);
        m_geom.update_bufs_data_array(pbuf, "a_normal", 3, ncache);
    }
}

/**
 * Recalculate particle buffers (position/normals) according to emitter
 * animation (trans/quats)
 */
exports.update_emitter_animation = function(obj) {

    var batches = obj._batches;
    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];
        var psys = batches[i].particle_system;

        if (!psys)
            continue;

        var pbuf = batch.bufs_data;

        var positions = psys._internal.positions;
        var normals = psys._internal.normals;
        var delay_attrs = psys._internal.delay_attrs;
        var time_start = psys["settings"]["frame_start"] / cfg_ani.framerate;

        var trans = obj._anim.trans;
        var quats = obj._anim.quats;

        if (!(trans && quats))
            continue;

        animate_pos_norm(positions, normals, delay_attrs, time_start, trans,
                quats);

        m_geom.make_dynamic(pbuf);
        m_geom.update_bufs_data_array(pbuf, "a_position", 3, positions);
        m_geom.update_bufs_data_array(pbuf, "a_normal", 3, normals);
        m_geom.update_bufs_data_array(pbuf, "a_p_delay", 1, delay_attrs);
    }
}


/**
 * recalculate position/normals according to animation
 */
function animate_pos_norm(positions, normals, delay_attrs, time_start, trans, 
        quats) {

    for (var i = 0; i < positions.length; i+=3) {

        var pos = [positions[i], positions[i+1], positions[i+2]];
        var norm = [normals[i], normals[i+1], normals[i+2]];

        var time = delay_attrs[i/3] + time_start;
        var ff = time * cfg_ani.framerate;
        var frame = Math.floor(ff);
        var frame_next = frame + 1;
        var frame_factor = ff - frame;

        var tran, quat;

        if (trans.length > 0 && frame >= 0 && frame < trans.length-1) {
            tran = m_util.blend_arrays(trans[frame], trans[frame_next], frame_factor);
            quat = m_util.blend_arrays(quats[frame], quats[frame_next], frame_factor);
        } else {
            tran = [0, 0, 0];
            quat = [0, 0, 0, 1];
        }
        
        var pos_new = [];
        var norm_new = [];

        m_vec3.transformQuat(pos, quat, pos_new);
        m_vec3.transformQuat(norm, quat, norm_new);

        positions[i] = pos_new[0] + tran[0];
        positions[i+1] = pos_new[1] + tran[1];
        positions[i+2] = pos_new[2] + tran[2];

        normals[i] = norm_new[0];
        normals[i+1] = norm_new[1];
        normals[i+2] = norm_new[2];
    }
}

function set_emitter_particles_uniforms(batch, psystem, pmaterial) {
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

    batch.p_starttime = time_start;
    batch.p_endtime = time_end;
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


function gen_delay_attrs(pcount, maxdelay, random, is_billboard) {

    var darr = [];

    var delayint = maxdelay/pcount;

    for (var i = 0; i < pcount; i++) {
        
        var delay;
        if (random) {
            delay = delayint*i + DELAYRANDFACTOR * delayint * (0.5-_rand());
        } else
            delay = delayint*i;
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

}
