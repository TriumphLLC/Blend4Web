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
 * Physics internal API.
 * @name physics
 * @namespace
 * @exports exports as physics
 */
b4w.module["__physics"] = function(exports, require) {

var m_cfg      = require("__config");
var m_debug    = require("__debug");
var m_ipc      = require("__ipc");
var m_obj_util = require("__obj_util");
var m_print    = require("__print");
var m_quat     = require("__quat");
var m_scs      = require("__scenes");
var m_subs     = require("__subscene");
var m_trans    = require("__transform");
var m_tsr      = require("__tsr");
var m_util     = require("__util");
var m_vec3     = require("__vec3");
var m_version  = require("__version");
var m_navmesh = require("__navmesh");

var cfg_phy = m_cfg.physics;
var cfg_def = m_cfg.defaults;
var cfg_ldr = m_cfg.assets;

var RAY_CMP_PRECISION = 0.0000001;

var _phy_fps = 0;
var _workers = [];
var _scenes = [];

var _bounding_objects = {};
var _bounding_objects_arr = [];

var _collision_ids = ["ANY"];

// IDs always begin with 1
var _unique_counter = {
    body: 0,
    constraint: 0,
    ray_test: 0
}

var _vec3_tmp = new Float32Array(3);
var _vec4_tmp = new Float32Array(4);
var _quat_tmp = new Float32Array(4);
var _mat4_tmp = new Float32Array(16);
var _tsr_tmp  = m_tsr.create();
var _tsr_tmp2 = m_tsr.create();

// vehicle types for internal usage
var VT_CHASSIS     = 10;
var VT_HULL        = 20;

/**
 * Initialize physics engine
 */
exports.init_scene_physics = function(scene) {

    scene._physics = {
        worker_loaded: false,
        bundles: [],
        ray_tests: {},
        ray_tests_arr: []
    };

    var path = cfg_phy.uranium_path;

    if (cfg_ldr.prevent_caching)
        path += m_version.timestamp();

    m_print.log("%cLOAD PHYSICS", "color: #0a0", cfg_phy.use_workers ?
            "Using Separate Worker Thread," : "Using Same Thread,",
            "Max FPS: " + cfg_phy.max_fps);
    m_print.log("%cPHYSICS PATH", "color: #0a0", path);
    var worker = m_ipc.create_worker(path, !cfg_phy.use_workers);
    m_ipc.attach_handler(worker, process_message);

    _workers.push(worker);
    _scenes.push(scene);

    if (cfg_phy.ping)
        setInterval(function() {m_ipc.post_msg(worker, m_ipc.OUT_PING,
                    performance.now())}, 1000);
}

exports.check_worker_loaded = function(scene) {
    if (scene._physics)
        return scene._physics.worker_loaded;
    else
        return true;
}

exports.cleanup = function() {
    for (var i = 0; i < _workers.length; i++)
        m_ipc.terminate(_workers[i]);

    _workers.length = 0;
    _scenes.length = 0;

    _bounding_objects = {};
    _bounding_objects_arr.length = 0;
    _collision_ids.length = 0;

    for (var cnt in _unique_counter)
        _unique_counter[cnt] = 0;
}

function add_compound_children(parent, container) {
    var children = parent.cons_descends;

    for (var i = 0; i < children.length; i++) {
        if (children[i].physics_settings.use_collision_compound)
            container.push(children[i]);

        add_compound_children(children[i], container);
    }

    return null;
}

exports.append_object = function(obj, scene) {

    var render = obj.render;
    if (!render)
        m_util.panic("No object render: " + obj.name);

    var phy_set = obj.physics_settings;

    var worker = find_worker_by_scene(scene);

    var compound_children = [];

    if (phy_set.use_collision_compound)
        add_compound_children(obj, compound_children);

    var bundles = scene._physics.bundles;

    // NOTE_1: object physics has higher priority
    // NOTE_2: object physics is always bounding physics due to high performance
    // constraints

    if (is_vehicle_chassis(obj) || is_vehicle_hull(obj) ||
            is_character(obj) || is_floater_main(obj) || obj.use_obj_physics) {
        var is_navmesh = is_navigation_mesh(obj);
        if (is_navmesh)
            var phy = init_navigation_mesh_physics(obj, scene);
        else
            var phy = init_bounding_physics(obj, compound_children, worker);

        obj.physics = phy;

        var pb = {
            batch: null,
            physics: phy
        };


        if (!is_navmesh) {
            bundles.push(pb);
            recalc_collision_tests(scene, worker, phy.collision_id);
        }
    } else {
        var sc_data = m_obj_util.get_scene_data(obj, scene);
        var batches = sc_data.batches;

        for (var i = 0; i < batches.length; i++) {

            var batch = batches[i];

            if (batch.type != "PHYSICS" || has_batch(scene, batch))
                continue;

            if (!batch.submesh.base_length) {
                m_print.error("Object " + obj.name +
                        " has collision material with no assigned vertices");
                continue;
            }

            if (batch.water && scene._render.water_params) {
                init_water_physics(batch, scene, worker);
                continue;
            }

            if (batch.use_ghost)
                var phy = init_ghost_mesh_physics(obj, batch, worker);
            else
                var phy = init_static_mesh_physics(obj, batch, worker);

            obj.physics = phy;
            // physics bundle
            var pb = {
                batch: batch,
                physics: phy
            };

            bundles.push(pb);
            recalc_collision_tests(scene, worker, phy.collision_id);
        }
    }

    if (is_vehicle_chassis(obj) || is_vehicle_hull(obj)) {
        init_vehicle(obj, worker);
        update_vehicle_controls(obj, obj.vehicle, worker);
    } else if (is_character(obj))
        init_character(obj, worker);
    else if (is_floater_main(obj))
        init_floater(obj, worker);

    for (var i = 0; i < _bounding_objects_arr.length; i++) {
        var obj = _bounding_objects_arr[i];
        if (obj.physics)
            process_rigid_body_joints(obj);
    }
}

function recalc_collision_tests(scene, worker, collision_id) {
    var bundles = scene._physics.bundles;

    for (var i = 0; i < bundles.length; i++) {
        var phy = bundles[i].physics;

        for (var j = 0; j < phy.collision_tests.length; j++) {
            var test = phy.collision_tests[j];

            if (test.collision_id == "ANY" || collision_id == test.collision_id)
                append_collision_pairs(test, scene, worker);
        }
    }
}

function has_batch(scene, batch) {

    var pbundles = scene._physics.bundles;

    for (var i = 0; i < pbundles.length; i++) {
        var pbatch = pbundles[i].batch;

        if (pbatch && pbatch.id == batch.id)
            return true;
    }

    return false;
}

/**
 * Process message incoming from worker
 */
function process_message(worker, msg_id, msg) {

    // NOTE: silently ignore if something arrives after the worker's termination
    // NOTE: is it possible?
    if (!m_ipc.is_active(worker))
        return;

    switch (msg_id) {
    case m_ipc.IN_LOADED:
        var scene = find_scene_by_worker(worker);
        scene._physics.worker_loaded = true;

        // initialize world
        var fallback_init_time = Date.now() - performance.now();
        m_ipc.post_msg(worker, m_ipc.OUT_INIT, fallback_init_time, cfg_phy.max_fps,
                cfg_phy.calc_fps ? cfg_def.fps_measurement_interval : 0);
        break;
    case m_ipc.IN_LOG:
        m_print.log_raw("URANIUM:", msg.slice(1));
        break;
    case m_ipc.IN_ERROR:
        m_print.error(msg);
        break;
    case m_ipc.IN_FBMSG:
        m_debug.fbmsg.apply(this, msg.slice(1));
        break;
    case m_ipc.IN_TRANSFORM:
        var obj = find_obj_by_body_id(msg.body_id);
        if (obj)
            update_interpolation_data(obj, msg.time, msg.trans,
                                msg.quat, msg.linvel, msg.angvel);
        break;
    case m_ipc.IN_PROP_OFFSET:
        var obj_chassis_hull = find_obj_by_body_id(msg.chassis_hull_body_id);
        if (obj_chassis_hull)
            update_prop_offset(obj_chassis_hull, msg.prop_ind, msg.trans,
                               msg.quat);
        break;
    case m_ipc.IN_FLOATER_BOB_TRANSFORM:
        var obj_floater = find_obj_by_body_id(msg[1]);
        if (obj_floater)
            update_floater_bob_coords(obj_floater, msg[2], msg[3], msg[4]);
        break;
    case m_ipc.IN_VEHICLE_SPEED:
        var obj = find_obj_by_body_id(msg[1]);
        if (obj)
            obj.vehicle.speed = msg[2];
        break;
    case m_ipc.IN_COLLISION:
        var scene = find_scene_by_worker(worker);
        traverse_collision_tests(scene, msg.body_id_a,
                                 msg.body_id_b, msg.result,
                                 null, null, 0);
        break;
    case m_ipc.IN_COLLISION_POS_NORM:
        var scene = find_scene_by_worker(worker);
        traverse_collision_tests(scene, msg.body_id_a,
                                 msg.body_id_b, msg.result,
                                 msg.coll_point, msg.coll_norm, 
                                 msg.coll_dist);
        break;
    case m_ipc.IN_COLLISION_IMPULSE:
        var obj = find_obj_by_body_id(msg[1]);
        if (obj) {
            var phy = obj.physics;

            if (phy.col_imp_test_cb)
                phy.col_imp_test_cb(msg[2]);
        }
        break;
    case m_ipc.IN_RAY_HIT:
    case m_ipc.IN_RAY_HIT_POS_NORM:
        var scene = find_scene_by_worker(worker);
        var sphy = scene._physics;
        var test = sphy.ray_tests[msg.id]

        // NOTE: ignoring the case when there is no test (may be removed in cb)
        if (test) {
            var body_id_hit = msg.body_id_hit;
            var obj_hit = find_obj_by_body_id(body_id_hit);

            if (msg_id == m_ipc.IN_RAY_HIT)
                exec_ray_test_cb(test, msg.hit_fract, obj_hit, msg.hit_time, null, null);
            else
                exec_ray_test_cb(test, msg.hit_fract, obj_hit, msg.hit_time, msg.hit_pos,
                        msg.hit_norm);
        }
        break;
    case m_ipc.IN_REMOVE_RAY_TEST:
        remove_ray_test(id);
        break;
    case m_ipc.IN_PING:
        var idx = _workers.indexOf(worker);
        var out_time = (msg[2] - msg[1]).toFixed(3);
        var in_time = (performance.now() - msg[2]).toFixed(3);
        var all_time = (performance.now() - msg[1]).toFixed(3);
        console.log("Physics #" + idx + " Ping: OUT " + out_time +
                " ms, IN " + in_time + " ms, ALL " + all_time + " ms");
        break;
    case m_ipc.IN_FPS:
        _phy_fps = msg[1];
        break;
    case m_ipc.IN_DEBUG_STATS:
        var idx = _workers.indexOf(worker);
        // TODO: add scene name
        console.log("Worker: #" + String(idx));
        console.log(msg[1]);
        break;
    default:
        m_print.error("Wrong message: " + msg_id);
        break;
    }
}

function find_scene_by_worker(worker) {
    for (var i = 0; i < _workers.length; i++)
        if (_workers[i] == worker)
            return _scenes[i];
}

function find_worker_by_scene(scene) {
    for (var i = 0; i < _scenes.length; i++)
        if (_scenes[i] == scene)
            return _workers[i];
}

exports.find_obj_by_body_id = find_obj_by_body_id;
/**
 * Find dynamic objects by given body ID
 */
function find_obj_by_body_id(body_id) {
    return _bounding_objects[body_id] || null;
}

function update_interpolation_data(obj, time, trans, quat, linvel, angvel) {
    var phy = obj.physics;

    phy.curr_time = time;
    m_tsr.set_sep(trans, 1.0, quat, phy.curr_tsr);

    m_vec3.copy(linvel, phy.linvel);
    m_vec3.copy(angvel, phy.angvel);
}

function update_prop_offset(obj_chassis_hull, prop_num, trans, quat) {
    var prop_offset = obj_chassis_hull.vehicle.prop_offsets[prop_num];

    m_tsr.set_sep(trans, 1.0, quat, prop_offset);
}

function update_floater_bob_coords(obj_floater, bob_num, trans, quat) {

    var obj_bob = obj_floater.floater.bobs[bob_num];
    m_trans.set_translation(obj_bob, trans);
    m_trans.set_rotation(obj_bob, quat);
    m_trans.update_transform(obj_bob);
}

function traverse_collision_tests(scene, body_id_a, body_id_b, pair_result,
        coll_pos, coll_norm, coll_dist) {

    var bundles = scene._physics.bundles;

    for (var i = 0; i < bundles.length; i++) {
        var phy = bundles[i].physics;

        for (var j = 0; j < phy.collision_tests.length; j++) {
            var test = phy.collision_tests[j];
            var pairs = test.pairs;

            var results_changed = false;

            for (var k = 0; k < pairs.length; k++) {
                var pair = pairs[k];

                if (pair[0] === body_id_a && pair[1] === body_id_b) {
                    test.pair_results[k] = pair_result;
                    results_changed = true;
                    break;
                }
            }

            if (results_changed) {
                var pair_results = test.pair_results;
                var result = calc_coll_result(test);

                if (coll_pos && test.body_id_src != body_id_a)
                    correct_coll_pos_norm(coll_pos, coll_norm, coll_dist);

                if (!result)
                    var coll_obj = null;
                else if (test.body_id_src == body_id_a)
                    var coll_obj = find_obj_by_body_id(body_id_b);
                else
                    var coll_obj = find_obj_by_body_id(body_id_a);

                test.callback(result, coll_obj, coll_pos, coll_norm, coll_dist);
            }
        }
    }
}

function calc_coll_result(test) {
    
    var pair_results = test.pair_results;

    var result = false;

    // OR
    for (var i = 0; i < pair_results.length; i++)
        result = result || pair_results[i];

    return result;
}


/**
 * NOTE: same is in bindings.js
 */
function correct_coll_pos_norm(pos, norm, dist) {
    pos[0] = pos[0] + norm[0] * dist;
    pos[1] = pos[1] + norm[1] * dist;
    pos[2] = pos[2] + norm[2] * dist;

    norm[0] *= -1;
    norm[1] *= -1;
    norm[2] *= -1;
}

function exec_ray_test_cb(test, hit_fract, obj_hit, hit_time, hit_pos, hit_norm) {

    var collision_id = test.collision_id;
    var callback = test.callback;

    if (hit_pos)
        callback(test.id, hit_fract, obj_hit, hit_time, hit_pos, hit_norm);
    else
        callback(test.id, hit_fract, obj_hit, hit_time);
}

exports.update = function(timeline, delta) {

    for (var i = 0; i < _workers.length; i++) {
        update_worker(_workers[i], timeline, delta);

        // update physics water time
        var scene = _scenes[i];
        var wp = scene._render.water_params;
        if (wp && wp.waves_height > 0.0) {
            var subs = m_scs.get_subs(scene, m_subs.MAIN_OPAQUE);
            var wind = m_vec3.length(subs.wind);
            m_ipc.post_msg(_workers[i], m_ipc.OUT_SET_WATER_TIME, subs.time * wind);
        }
    }
}

function update_worker(worker, timeline, delta) {
    if (worker && m_ipc.is_fallback(worker))
        m_ipc.post_msg(worker, m_ipc.OUT_UPDATE_WORLD, timeline, delta);

    // interpolate uranium transforms in point of previous frame
    for (var i = 0; i < _bounding_objects_arr.length; i++) {
        var obj = _bounding_objects_arr[i];
        var phy = obj.physics;

        // current time = 0 - do nothing
        if (phy.simulated && phy.curr_time) {
            if (m_ipc.is_fallback(worker))
                var d = timeline - phy.curr_time;
            else
                var d = performance.now() / 1000 - phy.curr_time;

            // clamp to maximum 10 frames to prevent jitter of sleeping objects
            d = Math.min(d, 10 * 1/cfg_phy.max_fps);

            // interpolate to previous frame to fix collision issues
            // NOTE: needs more testing
            d -= 1/cfg_phy.max_fps;

            if (cfg_def.no_phy_interp_hack)
                d = 0;

            var tsr = _tsr_tmp;
            m_tsr.integrate(phy.curr_tsr, d, phy.linvel, phy.angvel,
                    _tsr_tmp);

            m_trans.set_tsr(obj, tsr);
            m_trans.update_transform(obj);
            sync_transform(obj);

            if (obj.vehicle)
                update_prop_transforms(obj);

            if (obj.vehicle && obj.vehicle.steering_wheel)
                update_steering_wheel_coords(obj);

            if (obj.vehicle && obj.vehicle.speedometer)
                update_speedometer(obj);

            if (obj.vehicle && obj.vehicle.tachometer)
                update_tachometer(obj);
        }
    }

    m_ipc.post_msg_arr(worker);

}

function update_prop_transforms(obj_chassis_hull) {

    var obj_props = obj_chassis_hull.vehicle.props;

    var chass_hull_tsr = obj_chassis_hull.render.world_tsr;
    var prop_tsr = _tsr_tmp;

    for (var i = 0; i < obj_props.length; i++) {
        var obj_prop = obj_props[i];
        var prop_offset = obj_chassis_hull.vehicle.prop_offsets[i];

        m_tsr.multiply(chass_hull_tsr, prop_offset, prop_tsr);

        m_trans.set_tsr(obj_prop, prop_tsr);
        m_trans.update_transform(obj_prop);
    }
}


exports.get_active_scene = function() {
    // TODO: fix it
    return _scenes[0];
}

exports.pause = function() {
    for (var i = 0; i < _workers.length; i++)
        m_ipc.post_msg(_workers[i], m_ipc.OUT_PAUSE);
}

exports.resume = function() {
    for (var i = 0; i < _workers.length; i++)
        m_ipc.post_msg(_workers[i], m_ipc.OUT_RESUME);
}

function get_unique_body_id() {
    _unique_counter.body++;
    return _unique_counter.body;
}


function init_water_physics(batch, scene, worker) {

    var wp = scene._render.water_params;
    m_ipc.post_msg(worker, m_ipc.OUT_APPEND_WATER, wp.water_level);

    // TODO: get water_params for proper water object (not the common one)
    if (batch.water_dynamics) {
        var water_dyn_info = {};
        water_dyn_info["dst_noise_scale0"]  = batch.dst_noise_scale0;
        water_dyn_info["dst_noise_scale1"]  = batch.dst_noise_scale1;
        water_dyn_info["dst_noise_freq0"]   = batch.dst_noise_freq0;
        water_dyn_info["dst_noise_freq1"]   = batch.dst_noise_freq1;
        water_dyn_info["dir_min_shore_fac"] = batch.dir_min_shore_fac;
        water_dyn_info["dir_freq"]          = batch.dir_freq;
        water_dyn_info["dir_noise_scale"]   = batch.dir_noise_scale;
        water_dyn_info["dir_noise_freq"]    = batch.dir_noise_freq;
        water_dyn_info["dir_min_noise_fac"] = batch.dir_min_noise_fac;
        water_dyn_info["dst_min_fac"]       = batch.dst_min_fac;
        water_dyn_info["waves_hor_fac"]     = batch.waves_hor_fac;

        var waves_height   = wp.waves_height;
        var waves_length   = wp.waves_length;
        if (wp.shoremap_image) {
            var size_x         = wp.shoremap_size[0];
            var size_y         = wp.shoremap_size[1];
            var center_x       = wp.shoremap_center[0];
            var center_y       = wp.shoremap_center[1];
            var max_shore_dist = wp.max_shore_dist;
            var array_width    = wp.shoremap_tex_size;
            m_ipc.post_msg(worker, m_ipc.OUT_ADD_WATER_WRAPPER, water_dyn_info, size_x,
                           size_y, center_x, center_y, max_shore_dist,
                           waves_height, waves_length, array_width,
                           scene._render.shore_distances);
        } else {
            m_ipc.post_msg(worker, m_ipc.OUT_ADD_WATER_WRAPPER, water_dyn_info, 0, 0, 0, 0,
                           0, waves_height, waves_length, 0, null);
        }
    }
}

function init_static_mesh_physics(obj, batch, worker) {

    var body_id = get_unique_body_id();

    var submesh = batch.submesh;

    var positions = submesh.va_frames[0]["a_position"];
    var indices = submesh.indices || null;

    var trans = m_tsr.get_trans_view(obj.render.world_tsr);

    var friction = batch.friction;
    var restitution = batch.elasticity;
    var collision_id = batch.collision_id;
    var collision_id_num = col_id_num(collision_id);
    var collision_margin = batch.collision_margin;
    var collision_group = batch.collision_group;
    var collision_mask = batch.collision_mask;

    m_ipc.post_msg(worker, m_ipc.OUT_APPEND_STATIC_MESH_BODY, body_id, positions,
            indices, trans, friction, restitution, collision_id_num,
            collision_margin, collision_group, collision_mask);

    var phy = init_physics(body_id, "STATIC_MESH");
    phy.collision_id = collision_id;
    phy.collision_id_num = collision_id_num;
    return phy;
}

function col_id_num(id) {

    var num = _collision_ids.indexOf(id);
    if (num == -1) {
        _collision_ids.push(id);
        return (_collision_ids.length - 1);
    } else
        return num;
}

function init_physics(body_id, type) {
    var phy = {
        body_id: body_id,
        type: type,
        mass: 0,
        is_ghost: false,
        simulated: true,
        is_vehicle: false,
        is_character: false,
        is_floater: false,
        cons_id: null,
        collision_id: "",
        collision_id_num: 0,
        collision_callbacks: {},
        collision_tests: [],
        col_imp_test_cb: null,

        curr_time: 0,
        curr_tsr: new Float32Array([0,0,0,1,0,0,0,1]),

        linvel: new Float32Array(3),
        angvel: new Float32Array(3),

        cached_trans: new Float32Array(3),
        cached_quat: new Float32Array(4),
        navmesh: null
    };

    return phy;
}

/**
 * E.g for water ray casting
 */
function init_ghost_mesh_physics(obj, batch, worker) {

    var body_id = get_unique_body_id();

    var submesh = batch.submesh;
    var positions = submesh.va_frames[0]["a_position"];
    var indices = submesh.indices || null;
    var collision_id = batch.collision_id;
    var collision_id_num = col_id_num(collision_id);
    var collision_margin = batch.collision_margin;
    var collision_group = batch.collision_group;
    var collision_mask = batch.collision_mask;

    var trans = m_tsr.get_trans_view(obj.render.world_tsr);

    m_ipc.post_msg(worker, m_ipc.OUT_APPEND_GHOST_MESH_BODY, body_id, positions,
            indices, trans, collision_id_num, collision_margin, collision_group,
            collision_mask);

    var phy = init_physics(body_id, "STATIC_MESH");
    phy.is_ghost = true;
    phy.collision_id = collision_id;
    phy.collision_id_num = collision_id_num;

    return phy;
}


function init_bounding_physics(obj, compound_children, worker) {
    var render = obj.render;
    var phy_set = obj.physics_settings;

    var physics_type = phy_set.physics_type;

    var bb = render.bb_local;

    var body_id = get_unique_body_id();

    if (obj.type == "CAMERA") {
        var bounding_type = phy_set.use_collision_bounds ?
                phy_set.collision_bounds_type : "BOX";
        var bounding_object = find_bounding_type(bounding_type, render);

        var friction = render.friction;
        var restitution = render.elasticity;

        var friction = 0.5;
        var restitution = 0.0;
    } else if (obj.type == "EMPTY") {
        var bounding_type = "EMPTY";
        var bounding_object = null;

        var friction = 0;
        var restitution = 0;
    } else {
        var bounding_type = phy_set.use_collision_bounds ?
                phy_set.collision_bounds_type : "BOX";
        var bounding_object = find_bounding_type(bounding_type, render);
        var scale = m_tsr.get_scale(render.world_tsr);
        if (scale != 1)
            scale_bounding(bounding_object, bounding_type, scale);
        var friction = render.friction;
        var restitution = render.elasticity;
    }

    var trans = m_tsr.get_trans_view(render.world_tsr);
    var quat = m_tsr.get_quat_view(render.world_tsr);
    var is_ghost = phy_set.use_ghost;
    // use_sleep=true - no sleeping
    var disable_sleeping = phy_set.use_sleep;
    var mass = phy_set.mass;
    var velocity_min = phy_set.velocity_min;
    var velocity_max = phy_set.velocity_max;
    var damping = phy_set.damping;
    var rotation_damping = phy_set.rotation_damping;
    var collision_id = obj.collision_id;
    var collision_id_num = col_id_num(collision_id);
    var collision_margin = phy_set.collision_margin;
    var collision_group = phy_set.collision_group;
    var collision_mask = phy_set.collision_mask;
    var size = render.bs_local.radius;
    var worker_bounding = create_worker_bounding(bounding_object);
    var correct_bound_offset = obj.correct_bounding_offset;

    var comp_children_params = get_children_params(render,
                    compound_children, bounding_type, worker_bounding);

    m_ipc.post_msg(worker, m_ipc.OUT_APPEND_BOUNDING_BODY, body_id, trans, quat,
            physics_type, is_ghost, disable_sleeping, mass,
            velocity_min, velocity_max, damping, rotation_damping,
            collision_id_num, collision_margin, collision_group, collision_mask,
            bounding_type, worker_bounding, size, friction,
            restitution, comp_children_params, correct_bound_offset);

    _bounding_objects[body_id] = obj;
    _bounding_objects_arr.push(obj);

    var phy = init_physics(body_id, "BOUNDING");
    phy.type = physics_type;
    phy.mass = mass;
    phy.is_ghost = is_ghost;
    phy.collision_id = collision_id;
    phy.collision_id_num = collision_id_num;
    return phy;
}

function init_navigation_mesh_physics(obj, scene) {
    var body_id = get_unique_body_id();
    var phy = init_physics(body_id, "NAVMESH");
    var sc_data = m_obj_util.get_scene_data(obj, scene);
    var batches = sc_data.batches;
    phy.navmesh = null;
    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];
        if (batch.type == "PHYSICS") {
            // here we have single PHYSICS batch so quit after batch was being found
            phy.navmesh = m_navmesh.navmesh_build_from_bufs_data(batch.bufs_data);
            break;
        }
    }
    return phy;
}


function get_children_params(render, children, bt, wb) {

    if (!children.length)
        return [];

    var comp_children_params = [];

    // parent object is the first child compound
    var parent_params = {};
    parent_params["quat"] = new Float32Array([0, 0, 0, 1]);
    parent_params["trans"] = new Float32Array(3);
    parent_params["worker_bounding"] = wb;
    parent_params["bounding_type"] = bt;

    comp_children_params.push(parent_params);

    var wtsr_inv = m_tsr.invert(render.world_tsr, _tsr_tmp);
    var quat_inv = _quat_tmp;
    var quat = m_tsr.get_quat_view(render.world_tsr);
    m_quat.invert(quat, quat_inv);

    for (var i = 0; i < children.length; i++) {
        var child_params = {};
        var child        = children[i];
        var child_bt     = child.physics_settings.collision_bounds_type;
        var loc_quat     = new Float32Array(4);
        var loc_trans    = new Float32Array(3);

        var ch_trans = m_tsr.get_trans_view(child.render.world_tsr);
        var ch_quat = m_tsr.get_quat_view(child.render.world_tsr);
        m_tsr.transform_vec3(ch_trans, wtsr_inv, loc_trans);
        m_quat.multiply(quat_inv, ch_quat, loc_quat);

        child_params["trans"] = loc_trans;
        child_params["quat"] = loc_quat;
        child_params["bounding_type"] = child_bt;
        child_params["worker_bounding"] = create_worker_bounding(
                           find_bounding_type(child_bt, child.render));

        comp_children_params.push(child_params);
    }

    return comp_children_params;
}

function find_bounding_type(bounding_type, render) {

    switch (bounding_type) {
    case "BOX":
        var bounding_object = render.bb_local;
        break;
    case "CYLINDER":
        var bounding_object = render.bcyl_local;
        break;
    case "CONE":
        var bounding_object = render.bcon_local;
        break;
    case "SPHERE":
        var bounding_object = render.bs_local;
        break;
    case "CAPSULE":
        var bounding_object = render.bcap_local;
        break;
    }

    return bounding_object;
}

function scale_bounding(bound, bounding_type, scale) {
    switch (bounding_type) {
    case "BOX":
        bound.min_x *= scale;
        bound.max_x *= scale;
        bound.min_y *= scale;
        bound.max_y *= scale;
        bound.min_z *= scale;
        bound.max_z *= scale;
        break;
    case "CYLINDER":
    case "CONE":
    case "CAPSULE":
        bound.height *= scale;
        bound.radius *= scale;
        break;
    case "SPHERE":
        bound.radius *= scale;
        break;
    }
}

function create_worker_bounding(bounding_object) {
    // handle null EMPTY bounding
    if (!bounding_object)
        return null;

    var in_obj = bounding_object;
    var out_obj = {};

    if (typeof in_obj.min_x === "number") out_obj["min_x"] = in_obj.min_x;
    if (typeof in_obj.min_y === "number") out_obj["min_y"] = in_obj.min_y;
    if (typeof in_obj.min_z === "number") out_obj["min_z"] = in_obj.min_z;
    if (typeof in_obj.max_x === "number") out_obj["max_x"] = in_obj.max_x;
    if (typeof in_obj.max_y === "number") out_obj["max_y"] = in_obj.max_y;
    if (typeof in_obj.max_z === "number") out_obj["max_z"] = in_obj.max_z;

    if (typeof in_obj.center === "object") out_obj["center"] = in_obj.center;
    if (typeof in_obj.radius === "number") out_obj["radius"] = in_obj.radius;
    if (typeof in_obj.height === "number") out_obj["height"] = in_obj.height;

    return out_obj;
}

function init_vehicle(obj, worker) {

    var body_id = obj.physics.body_id;

    if (is_vehicle_chassis(obj)) {
        obj.vehicle.type = VT_CHASSIS;
        var susp_compress = obj.vehicle.suspension_compression;
        var susp_stiffness = obj.vehicle.suspension_stiffness;
        var susp_damping = obj.vehicle.suspension_damping;
        var wheel_friction = obj.vehicle.wheel_friction;
        var max_suspension_travel_cm = obj.vehicle.max_suspension_travel_cm;

        m_ipc.post_msg(worker, m_ipc.OUT_APPEND_CAR, body_id,
                               susp_compress,
                               susp_stiffness,
                               susp_damping,
                               wheel_friction,
                               max_suspension_travel_cm);
    } else if (is_vehicle_hull(obj)) {
        obj.vehicle.type = VT_HULL;
        var floating_factor = obj.vehicle.floating_factor;
        var water_lin_damp = obj.vehicle.water_lin_damp;
        var water_rot_damp = obj.vehicle.water_rot_damp;
        m_ipc.post_msg(worker, m_ipc.OUT_APPEND_BOAT, body_id, floating_factor,
                                water_lin_damp, water_rot_damp);
    }

    if (obj.vehicle.props) {
        var props = obj.vehicle.props;
        switch (obj.vehicle.type) {

        case VT_CHASSIS:
            add_vehicle_prop(props[0], obj, body_id, true, worker);
            add_vehicle_prop(props[1], obj, body_id, true, worker);
            add_vehicle_prop(props[2], obj, body_id, false, worker);
            add_vehicle_prop(props[3], obj, body_id, false, worker);
            break;
        case VT_HULL:
            for (var i = 0; i < props.length; i++)
                add_vehicle_prop(props[i], obj, body_id, false, worker);
            break;
        }
    }
}

function add_vehicle_prop(obj_prop, obj_chassis_hull, chassis_body_id,
        is_front, worker) {

    // calculate connection point
    // NOTE: initial wheel (bob) and vehicle coords may change

    var prop_trans = m_tsr.get_trans_view(obj_prop.render.world_tsr);

    var chassis_hull_tsr_inv = m_tsr.invert(obj_chassis_hull.render.world_tsr, _tsr_tmp);

    var conn_point = new Float32Array(3);
    m_tsr.transform_vec3(prop_trans, chassis_hull_tsr_inv, conn_point);

    switch (obj_chassis_hull.vehicle.type) {
    case VT_CHASSIS:
        var v_set = obj_chassis_hull.vehicle_settings;
        var suspension_rest_length = v_set.suspension_rest_length;
        var roll_influence = v_set.roll_influence;

        // NOTE: using bounding box, not cylinder
        var bb = obj_prop.render.bb_local;
        var radius = (bb.max_z - bb.min_z) / 2;

        m_ipc.post_msg(worker, m_ipc.OUT_ADD_CAR_WHEEL, chassis_body_id, conn_point,
                suspension_rest_length, roll_influence, radius, is_front);
        break;
    case VT_HULL:
        m_ipc.post_msg(worker, m_ipc.OUT_ADD_BOAT_BOB, chassis_body_id, conn_point, obj_prop.synchronize_pos);
        break;
    }
}

function init_character(obj, worker) {

    var render = obj.render;
    var phy    = obj.physics;

    var height       = render.bb_local.max_z - render.bb_local.min_z;
    var character_id = phy.body_id;

    var char_settings = obj.character_settings;
    var walk_speed    = char_settings.walk_speed;
    var run_speed     = char_settings.run_speed;
    var step_height   = char_settings.step_height;
    var jump_strength = char_settings.jump_strength;
    var waterline     = char_settings.waterline;

    var rot_angle     = m_util.dir_ground_proj_angle(obj);

    m_ipc.post_msg(worker, m_ipc.OUT_APPEND_CHARACTER, character_id, rot_angle, height,
              walk_speed, run_speed, step_height, jump_strength, waterline);

    phy.is_character = true;
}

function init_floater(obj, worker) {
    var floating_factor = obj.floater.floating_factor;
    var water_lin_damp = obj.floater.water_lin_damp;
    var water_rot_damp = obj.floater.water_rot_damp;
    var body_id = obj.physics.body_id;

    m_ipc.post_msg(worker, m_ipc.OUT_APPEND_FLOATER, body_id, floating_factor,
              water_lin_damp, water_rot_damp);

    if (obj.floater.bobs) {
        var bob_objs = obj.floater.bobs;
        for (var i = 0; i < bob_objs.length; i++) {

            // calculate connection point
            var obj_bob = bob_objs[i];

            var bob_trans = m_tsr.get_trans_view(obj_bob.render.world_tsr);

            var wtsr_inv = m_tsr.invert(obj.render.world_tsr, _tsr_tmp);

            var conn_point = new Float32Array(3);
            m_tsr.transform_vec3(bob_trans, wtsr_inv, conn_point);

            m_ipc.post_msg(worker, m_ipc.OUT_ADD_FLOATER_BOB, body_id, conn_point, obj_bob.bob_synchronize_pos);
        }
    }
    obj.physics.is_floater = true;
}

exports.enable_simulation = function(obj) {
    var phy = obj.physics;
    if (!phy)
        m_util.panic("No object physics");

    // prevent issues with recurrent exec
    if (phy.simulated)
        return;

    var body_id = phy.body_id;
    var worker = find_worker_by_body_id(body_id);
    phy.simulated = true;
    m_ipc.post_msg(worker, m_ipc.OUT_ENABLE_SIMULATION, body_id);
}

exports.disable_simulation = function(obj) {
    var phy = obj.physics;
    if (!phy)
        m_util.panic("No object physics");

    // prevent issues with recurrent exec
    if (!phy.simulated)
        return;

    var body_id = phy.body_id;
    var worker = find_worker_by_body_id(body_id);
    phy.simulated = false;
    m_ipc.post_msg(worker, m_ipc.OUT_DISABLE_SIMULATION, body_id);
}

exports.scene_has_physics = scene_has_physics;
/**
 * Check if scene has physics
 * @methodOf physics
 */
function scene_has_physics(scene) {
    return Boolean(scene._physics);
}

exports.obj_has_physics = obj_has_physics;
/**
 * Check if object has physics
 * @methodOf physics
 */
function obj_has_physics(obj) {
    return Boolean(obj.physics);
}

/**
 * Check if object has dynamic and simulated physics
 */
exports.has_dynamic_physics = function(obj) {
    var phy = obj.physics;
    if (phy && phy.simulated &&
            (phy.type == "RIGID_BODY" || phy.type == "DYNAMIC") &&
            phy.mass > 0 && phy.is_ghost == false)
        return true;
    else
        return false;
}
/**
 * Check if object has simulated physics of any type
 */
exports.has_simulated_physics = function(obj) {
    var phy = obj.physics;
    if (phy && phy.simulated)
        return true;
    else
        return false;
}

exports.set_gravity = function(obj, gravity) {
    var body_id = obj.physics.body_id;
    var worker = find_worker_by_body_id(body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_SET_GRAVITY, body_id, gravity);
}

/**
 * Process rigid body joints constraints
 */
function process_rigid_body_joints(obj) {

    // already processed
    if (has_constraint(obj))
        return;

    for (var i = 0; i < obj.physics_constraints.length; i++) {
        var cons = obj.physics_constraints[i];
        var targ = cons.target;
        var pivot_type = cons.pivot_type;

        if (!targ.physics)
            continue;

        var trans = get_rbj_trans(cons);
        var quat = get_rbj_quat(cons);

        var local = m_tsr.identity(_tsr_tmp);

        local = m_tsr.set_trans(trans, local);
        local = m_tsr.set_quat(quat, local);

        var world_a = m_tsr.multiply(obj.render.world_tsr, local, _tsr_tmp);

        var world_b_inv = m_tsr.invert(targ.render.world_tsr, _tsr_tmp2);

        var local_b = m_tsr.multiply(world_b_inv, world_a, world_b_inv);

        var local_b_tra = m_tsr.get_trans_view(local_b);
        var local_b_qua = m_tsr.get_quat_view(local_b);

        var limits = prepare_limits(cons);

        apply_constraint(pivot_type, obj, trans, quat, targ, local_b_tra,
                local_b_qua, limits, null, null);
    }
}

exports.has_constraint = has_constraint;
function has_constraint(obj) {
    return obj.physics && obj.physics.cons_id;
}

function get_rbj_trans(cons) {
    var trans = new Float32Array([cons.pivot_x, cons.pivot_y, cons.pivot_z]);
    return trans;
}

function get_rbj_quat(cons) {
    var euler = new Float32Array([cons.axis_x, cons.axis_y, cons.axis_z]);
    var quat = m_util.euler_to_quat(euler, new Float32Array(4));
    return quat;
}

function prepare_limits(cons) {
    var limits = {};

    limits["use_limit_x"] = cons.use_limit_x;
    limits["use_limit_y"] = cons.use_limit_y;
    limits["use_limit_z"] = cons.use_limit_z;

    limits["use_angular_limit_x"] = cons.use_angular_limit_x;
    limits["use_angular_limit_y"] = cons.use_angular_limit_y;
    limits["use_angular_limit_z"] = cons.use_angular_limit_z;

    limits["limit_max_x"] = cons.limit_max_x;
    limits["limit_min_x"] = cons.limit_min_x;
    limits["limit_max_y"] = cons.limit_max_y;
    limits["limit_min_y"] = cons.limit_min_y;
    limits["limit_max_z"] = cons.limit_max_z;
    limits["limit_min_z"] = cons.limit_min_z;

    limits["limit_angle_max_x"] = cons.limit_angle_max_x;
    limits["limit_angle_min_x"] = cons.limit_angle_min_x;
    limits["limit_angle_max_y"] = cons.limit_angle_max_y;
    limits["limit_angle_min_y"] = cons.limit_angle_min_y;
    limits["limit_angle_max_z"] = cons.limit_angle_max_z;
    limits["limit_angle_min_z"] = cons.limit_angle_min_z;

    return limits;
}

exports.apply_constraint = apply_constraint;
function apply_constraint(pivot_type, obj_a, trans_a, quat_a,
        obj_b, trans_b, quat_b, limits, stiffness, damping) {
    var cons_id = get_unique_constraint_id();

    var body_a = obj_a.physics.body_id;
    var body_b = obj_b.physics.body_id;

    var worker = find_worker_by_body_id(body_a);

    m_ipc.post_msg(worker, m_ipc.OUT_APPEND_CONSTRAINT, cons_id, pivot_type, limits,
            body_a, trans_a, quat_a, body_b, trans_b, quat_b, stiffness, damping);

    // applied constraint always attached to object A
    var phy = obj_a.physics;
    phy.cons_id = cons_id;
}

function find_worker_by_body_id(body_id) {
    for (var i = 0; i < _scenes.length; i++) {
        var scene = _scenes[i];

        var bundles = scene._physics.bundles;

        for (var j = 0; j < bundles.length; j++) {
            var phy = bundles[j].physics;

            if (phy.body_id == body_id)
                return _workers[i];
        }
    }

    return null;
}

function get_unique_constraint_id() {
    _unique_counter.constraint++;
    return _unique_counter.constraint.toString(16);
}

exports.clear_constraint = function(obj_a) {
    var phy = obj_a.physics;
    var cons_id = phy.cons_id;

    var worker = find_worker_by_body_id(body_a);

    m_ipc.post_msg(worker, m_ipc.OUT_REMOVE_CONSTRAINT, cons_id);
    phy.cons_id = null;
}

exports.pull_to_constraint_pivot = function(obj_a, trans_a, quat_a,
        obj_b, trans_b, quat_b) {

    var tsr_a = m_tsr.set_sep(trans_a, 1, quat_a, _tsr_tmp);
    var tsr_b = m_tsr.set_sep(trans_b, 1, quat_b, _tsr_tmp2);

    // A -> PIVOT
    m_tsr.invert(tsr_a, tsr_a);

    // (A -> PIVOT) -> B
    m_tsr.multiply(tsr_b, tsr_a, tsr_a);

    m_trans.get_tsr(obj_b, tsr_b);

    // A -> WORLD
    m_tsr.multiply(tsr_b, tsr_a, tsr_a);

    m_trans.set_tsr(obj_a, tsr_a);
    m_trans.update_transform(obj_a);

    var trans = m_tsr.get_trans_view(obj_a.render.world_tsr);
    var quat = m_tsr.get_quat_view(obj_a.render.world_tsr);
    exports.set_transform(obj_a, trans, quat);
}

exports.set_transform = function(obj, trans, quat) {

    var phy = obj.physics;
    var msg_cache = m_ipc.get_msg_cache(m_ipc.OUT_SET_TRANSFORM);

    // use msg_cache as a temporary storage
    var obj_trans = m_tsr.get_trans(obj.render.world_tsr, msg_cache.trans);
    var obj_quat = m_tsr.get_quat(obj.render.world_tsr, msg_cache.quat);
    m_tsr.set_sep(obj_trans, 1, obj_quat, phy.curr_tsr);

    msg_cache.body_id = phy.body_id;
    m_vec3.copy(trans, msg_cache.trans);
    m_quat.copy(quat, msg_cache.quat);
    // NOTE: slow
    var worker = find_worker_by_body_id(phy.body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_SET_TRANSFORM);
}

exports.sync_transform = sync_transform;
/**
 * Recursively sync object transform with engine, if possible.
 * @methodOf physics
 */
function sync_transform(obj) {

    if (allows_transform(obj) && transform_changed(obj)) {
        var phy = obj.physics;
        var render = obj.render;

        var msg_cache = m_ipc.get_msg_cache(m_ipc.OUT_SET_TRANSFORM);
        msg_cache.body_id = phy.body_id;

        var trans = m_tsr.get_trans(render.world_tsr, msg_cache.trans);
        var quat = m_tsr.get_quat(render.world_tsr, msg_cache.quat);

        m_vec3.copy(trans, phy.cached_trans);
        m_quat.copy(quat, phy.cached_quat);

        if (phy.type == "DYNAMIC")
            m_quat.identity(msg_cache.quat);

        // NOTE: slow
        var worker = find_worker_by_body_id(phy.body_id);

        m_ipc.post_msg(worker, m_ipc.OUT_SET_TRANSFORM);
    }

    var cons_descends = obj.cons_descends;

    for (var i = 0; i < cons_descends.length; i++)
        sync_transform(cons_descends[i]);
}

/**
 * Check if object has physics that allows transform
 */
function allows_transform(obj) {
    var phy = obj.physics;
    if (!phy)
        return false;
    else if (phy.mass === 0)
        return true;
    else if (phy.is_ghost === true)
        return true;
    else if (phy.simulated === false)
        return true;
    else if (phy.type !== "RIGID_BODY" && phy.type !== "DYNAMIC")
        return true;
    else
        return false;
}

/**
 * uses _vec3_tmp _quat_tmp
 */
function transform_changed(obj) {
    var trans = m_tsr.get_trans(obj.render.world_tsr, _vec3_tmp);
    var quat = m_tsr.get_quat(obj.render.world_tsr, _quat_tmp);
    return trans[0] != obj.physics.cached_trans[0] ||
           trans[1] != obj.physics.cached_trans[1] ||
           trans[2] != obj.physics.cached_trans[2] ||
           quat[0] != obj.physics.cached_quat[0] ||
           quat[1] != obj.physics.cached_quat[1] ||
           quat[2] != obj.physics.cached_quat[2] ||
           quat[3] != obj.physics.cached_quat[3];
}


/**
 * Move object by applying velocity in world space.
 */
exports.apply_velocity = function(obj, vx_local, vy_local, vz_local) {

    var v_world = _vec3_tmp;
    vector_to_world(obj, vx_local, vy_local, vz_local, v_world);

    var body_id = obj.physics.body_id;
    /*
    var bt_velocity = bt_body.getLinearVelocity();

    var vx0 = bt_velocity.x();
    var vy0 = bt_velocity.y();
    var vz0 = bt_velocity.z();
    */

    var vx0 = 0;
    var vy0 = 0;
    var vz0 = 0;

    var vx0a = Math.abs(vx0);
    var vy0a = Math.abs(vy0);
    var vz0a = Math.abs(vz0);

    var vxa = Math.abs(v_world[0]);
    var vya = Math.abs(v_world[1]);
    var vza = Math.abs(v_world[2]);

    // SIGN * ABS_VEL_CLAMPED
    v_world[0] = vxa ? (v_world[0] / vxa) * Math.max(vxa, vx0a) : vx0;
    v_world[1] = vya ? (v_world[1] / vya) * Math.max(vya, vy0a) : vy0;
    v_world[2] = vza ? (v_world[2] / vza) * Math.max(vza, vz0a) : vz0;

    var worker = find_worker_by_body_id(body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_SET_LINEAR_VELOCITY, body_id, v_world[0], v_world[1], v_world[2]);
}

/**
 * Move the object by applying velocity in the world space.
 * @param disable_up Disable up speed (swimming on surface)
 * TODO: apply_velocity -> apply_velocity_local
 */
exports.apply_velocity_world = function(obj, vx, vy, vz) {

    var body_id = obj.physics.body_id;

    var worker = find_worker_by_body_id(body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_SET_LINEAR_VELOCITY, body_id, vx, vy, vz);
}

function vector_to_world(obj, vx_local, vy_local, vz_local, dest) {

    var v = dest || new Float32Array(3);

    var quat = m_tsr.get_quat_view(obj.render.world_tsr);

    v[0] = vx_local;
    v[1] = vy_local;
    v[2] = vz_local;
    var v_world = m_vec3.transformQuat(v, quat, v);

    return v_world;
}

/**
 * Move the object by applying the force in the world space.
 */
exports.apply_force = apply_force;
function apply_force(obj, fx_local, fy_local, fz_local, use_world) {

    var f_world = _vec3_tmp;
    if (use_world) {
        f_world[0] = fx_local;
        f_world[1] = fy_local;
        f_world[2] = fz_local;
    } else
        vector_to_world(obj, fx_local, fy_local, fz_local, f_world);

    var body_id = obj.physics.body_id;

    var worker = find_worker_by_body_id(body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_APPLY_CENTRAL_FORCE, body_id,
            f_world[0], f_world[1], f_world[2]);
}

/**
 * Rotate the object by applying torque in the world space.
 * @param tx_local Tx local space torque
 * @param ty_local Ty local space torque
 * @param tz_local Tz local space torque
 */
exports.apply_torque = apply_torque;
function apply_torque(obj, tx_local, ty_local, tz_local) {

    var t_world = _vec3_tmp;
    vector_to_world(obj, tx_local, ty_local, tz_local, t_world);

    var body_id = obj.physics.body_id;
    var worker = find_worker_by_body_id(body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_APPLY_TORQUE, body_id, t_world[0], t_world[1], t_world[2]);
}

/**
 * Set character moving direction (may be zero vector).
 * @param forw Apply forward move (may be negative)
 * @param side Apply side move (may be negative)
 */
exports.set_character_move_dir = function(obj, forw, side) {
    var body_id = obj.physics.body_id;
    var worker = find_worker_by_body_id(body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_SET_CHARACTER_MOVE_DIR, body_id, forw, side);
}

/**
 * Set character moving type.
 * @param type Character moving type
 */
exports.set_character_move_type = function(obj, type) {
    var body_id = obj.physics.body_id;
    var worker = find_worker_by_body_id(body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_SET_CHARACTER_MOVE_TYPE, body_id, type);
}

/**
 * Set character walk speed.
 * @param velocity Walking velocity
 */
exports.set_character_walk_velocity = function(obj, velocity) {
    var body_id = obj.physics.body_id;
    var worker = find_worker_by_body_id(body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_SET_CHARACTER_WALK_VELOCITY, body_id, velocity);
}

/**
 * Set character run speed.
 * @param velocity Running velocity
 */
exports.set_character_run_velocity = function(obj, velocity) {
    var body_id = obj.physics.body_id;
    var worker = find_worker_by_body_id(body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_SET_CHARACTER_RUN_VELOCITY, body_id, velocity);
}

/**
 * Set character fly speed.
 * @param velocity Flying velocity
 */
exports.set_character_fly_velocity = function(obj, velocity) {
    var body_id = obj.physics.body_id;
    var worker = find_worker_by_body_id(body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_SET_CHARACTER_FLY_VELOCITY, body_id, velocity);
}

/**
 * Perform a character's jump
 */
exports.character_jump = function(obj) {
    var body_id = obj.physics.body_id;
    var worker = find_worker_by_body_id(body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_CHARACTER_JUMP, body_id);
}

/**
 * Increment character's rotation
 */
exports.character_rotation_inc = function(obj, h_angle, v_angle) {
    var body_id = obj.physics.body_id;
    var worker = find_worker_by_body_id(body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_CHARACTER_ROTATION_INCREMENT, body_id, h_angle, v_angle);
}

/**
 * Set character's rotation in both planes
 */
exports.set_character_rotation = function(obj, angle_h, angle_v) {
    var body_id = obj.physics.body_id;
    var worker = find_worker_by_body_id(body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_SET_CHARACTER_ROTATION, body_id, angle_h, angle_v);
}

/**
 * Set character's horizontal rotation
 */
exports.set_character_rotation_h = function(obj, angle) {
    var body_id = obj.physics.body_id;
    var worker = find_worker_by_body_id(body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_SET_CHARACTER_HOR_ROTATION, body_id, angle);
}

/**
 * Set character's vertical rotation
 */
exports.set_character_rotation_v = function(obj, angle) {
    var body_id = obj.physics.body_id;
    var worker = find_worker_by_body_id(body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_SET_CHARACTER_VERT_ROTATION, body_id, angle);
}

exports.append_collision_test = function(obj_src, collision_id, callback,
                                         calc_pos_norm) {
    var phy = obj_src.physics;
    if (phy.navmesh)
        return;

    var body_id_src = phy.body_id;

    var collision_id = collision_id || "ANY";

    // no need to add another collision test
    for (var i = 0; i < phy.collision_tests.length; i++) {
        var test = phy.collision_tests[i];
        if (test.collision_id == collision_id && test.callback == callback)
            return;
    }

    var test = {
        body_id_src: body_id_src,
        calc_pos_norm: calc_pos_norm || false,
        collision_id: collision_id,
        callback: callback,
        pairs: [],
        pair_results: []
    }
    phy.collision_tests.push(test);

    var worker = find_worker_by_body_id(body_id_src);
    var scene = find_scene_by_worker(worker);

    append_collision_pairs(test, scene, worker);
}

/**
 * NOTE: function doesn't count the pairs already appended by other tests
 */
function append_collision_pairs(test, scene, worker) {
    var pairs = test.pairs;
    var pair_results = test.pair_results;

    var body_id_a = test.body_id_src
    var body_id_b_arr = [];

    collision_id_to_body_ids(test.collision_id, scene,
            body_id_b_arr, null);

    for (var i = 0; i < body_id_b_arr.length; i++) {
        var body_id_b = body_id_b_arr[i];

        // sorted pairs, but comparison does not have any special meaning
        if (body_id_a < body_id_b && !has_pair(pairs, body_id_a, body_id_b)) {
            pairs.push([body_id_a, body_id_b]);
            pair_results.push(false);
        } else if (body_id_a > body_id_b && !has_pair(pairs, body_id_b, body_id_a)) {
            pairs.push([body_id_b, body_id_a]);
            pair_results.push(false);
        }
        // == ignored
    }

    // NOTE: unknown issues with freezed objects
    m_ipc.post_msg(worker, m_ipc.OUT_ACTIVATE, body_id_a);
    m_ipc.post_msg(worker, m_ipc.OUT_APPEND_COLLISION_TEST, pairs, test.calc_pos_norm);
}

function has_pair(pairs, body_id_a, body_id_b) {
    for (var i = 0; i < pairs.length; i++)
        if (pairs[i][0] == body_id_a && pairs[i][1] == body_id_b)
            return true;

    return false;
}

/**
 * Find unique body ids
 */
function gen_collision_body_ids(callbacks, bpy_scene, dest_arr, dest_obj) {

    if ("ANY" in callbacks) {
        for (var i = 0; i < bpy_scene._physics.bundles.length; i++) {
            var bundle = bpy_scene._physics.bundles[i];
            var body_id = bundle.physics.body_id;
            dest_arr.push(body_id);
            dest_obj[body_id] = 0;
        }
        return;
    }

    // object keys
    for (var collision_id in callbacks) {
        for (var i = 0; i < bpy_scene._physics.bundles.length; i++) {
            var bundle = bpy_scene._physics.bundles[i];
            if (bundle.physics.collision_id == collision_id) {
                var body_id = bundle.physics.body_id;
                // unique
                if (dest_arr.indexOf(body_id) == -1)
                    dest_arr.push(body_id);
                dest_obj[body_id] = 0;
            }
        }
    }
}

exports.remove_collision_test = function(obj, collision_id, callback) {
    var phy = obj.physics;
    var body_id = phy.body_id;

    var worker = find_worker_by_body_id(body_id);
    var scene = find_scene_by_worker(worker);

    for (var i = 0; i < phy.collision_tests.length; i++) {
        var test = phy.collision_tests[i];
        if (test.collision_id == collision_id && test.callback == callback) {

            // report negative collision result as there is no collision anymore
            if (calc_coll_result(test)) {
                var zero = m_vec3.set(0, 0, 0, _vec3_tmp);
                test.callback(false, null, zero, zero, 0);
            }

            phy.collision_tests.splice(i, 1);

            i--;

            remove_unused_collision_pairs(scene, worker, test.pairs);
        }
    }
}



/**
 * Find from pairs unused and remove
 */
function remove_unused_collision_pairs(scene, worker, pairs) {

    var bundles = scene._physics.bundles;

    var unused_pairs = pairs;   // by link

    for (var i = 0; i < bundles.length; i++) {
        var phy = bundles[i].physics;

        for (var j = 0; j < phy.collision_tests.length; j++) {
            var test = phy.collision_tests[j];

            for (var k = 0; k < test.pairs.length; k++) {
                var pair = test.pairs[k];

                for (var l = 0; l < unused_pairs.length; l++) {
                    var unused_pair = unused_pairs[l];

                    if (pair[0] == unused_pair[0] && pair[1] == unused_pair[1]) {
                        // have found used one
                        unused_pairs.splice(l, 1);
                        l--;
                    }
                }
            }
        }
    }

    if (unused_pairs.length)
        m_ipc.post_msg(worker, m_ipc.OUT_REMOVE_COLLISION_TEST, unused_pairs);
}

function remove_collision_pairs_by_id(scene, worker, body_id) {
    var bundles = scene._physics.bundles;

    var removed_pairs = [];

    for (var i = 0; i < bundles.length; i++) {
        var phy = bundles[i].physics;

        for (var j = 0; j < phy.collision_tests.length; j++) {
            var test = phy.collision_tests[j];

            for (var k = 0; k < test.pairs.length; k++) {
                var pair = test.pairs[k];
                var pair_result = test.pair_results[k];

                if (pair[0] == body_id || pair[1] == body_id) {

                    test.pairs.splice(k, 1);
                    test.pair_results.splice(k, 1);
                    k--;

                    // last positive pair removed
                    if (pair_result && !calc_coll_result(test)) {
                        var zero = m_vec3.set(0, 0, 0, _vec3_tmp);
                        test.callback(false, null, zero, zero, 0);
                    }

                    // do not check for uniqueness, uranium allows that
                    removed_pairs.push(pair);
                }
            }
        }
    }

    if (removed_pairs.length)
        m_ipc.post_msg(worker, m_ipc.OUT_REMOVE_COLLISION_TEST, removed_pairs);
}

exports.apply_collision_impulse_test = function(obj, callback) {
    if (has_collision_impulse_test(obj))
        clear_collision_impulse_test(obj);

    var phy = obj.physics;
    var worker = find_worker_by_body_id(phy.body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_APPLY_COLLISION_IMPULSE_TEST, phy.body_id);
    phy.col_imp_test_cb = callback;
}

exports.clear_collision_impulse_test = clear_collision_impulse_test;
function clear_collision_impulse_test(obj) {
    if (!has_collision_impulse_test(obj))
        return;

    var phy = obj.physics;
    var worker = find_worker_by_body_id(phy.body_id);
    m_ipc.post_msg(worker, m_ipc.OUT_CLEAR_COLLISION_IMPULSE_TEST, phy.body_id);
    phy.col_imp_test_cb = null;
}

function has_collision_impulse_test(obj) {
    if (obj.physics && obj.physics.col_imp_test_cb)
        return true;
    else
        return false;
}

exports.append_ray_test = function(obj, from, to, collision_id, callback,
        autoremove, calc_all_hits, calc_pos_norm, ign_src_rot) {

    var id = get_unique_ray_test_id();

    var collision_id = collision_id || "ANY";

    var test = {
        id: id,
        body_id: obj ? obj.physics.body_id : 0,
        from: new Float32Array(from),
        to: new Float32Array(to),
        collision_id: collision_id,
        collision_id_num: col_id_num(collision_id),
        autoremove: autoremove,
        calc_all_hits: calc_all_hits,
        calc_pos_norm: calc_pos_norm,
        ign_src_rot: ign_src_rot,
        callback: callback
    }

    // NOTE: it's not possible to determine the worker in no obj specified
    var worker = find_worker_by_body_id(test.body_id) || _workers[0];
    var scene = find_scene_by_worker(worker);

    var sphy = scene._physics;

    var id = test.id;

    sphy.ray_tests[id] = test;
    sphy.ray_tests_arr.push(test);

    m_ipc.post_msg(worker, m_ipc.OUT_APPEND_RAY_TEST, test.id, test.body_id, test.from,
            test.to, test.collision_id_num, test.autoremove,
            test.calc_all_hits, test.calc_pos_norm, test.ign_src_rot);

    return id;
}

function get_unique_ray_test_id() {
    _unique_counter.ray_test++;
    return _unique_counter.ray_test;
}

/**
 * Find and store body id matching given collision id
 * @param [dest_arr] Destination array
 * @param [dest_obj] Destination object with body_id keys and zero values
 */
function collision_id_to_body_ids(collision_id, bpy_scene, dest_arr, dest_obj) {

    if (!dest_arr && !dest_obj)
        m_util.panic("At least one destination required");

    for (var i = 0; i < bpy_scene._physics.bundles.length; i++) {
        var bundle = bpy_scene._physics.bundles[i];
        if (collision_id == "ANY" || bundle.physics.collision_id == collision_id
            && bundle.physics.type != "NAVMESH") {
            var body_id = bundle.physics.body_id;

            // unique
            if (dest_arr && dest_arr.indexOf(body_id) == -1)
                dest_arr.push(body_id);

            if (dest_obj)
                dest_obj[body_id] = 0;
        }
    }
}

exports.remove_ray_test = remove_ray_test;
function remove_ray_test(id) {

    var scene = find_scene_by_ray_test_id(id);
    var worker = find_worker_by_ray_test_id(id);

    var sphy = scene._physics;

    if (sphy.ray_tests[id]) {

        delete sphy.ray_tests[id];
        sphy.ray_tests_arr.splice(sphy.ray_tests_arr.indexOf, 1);
        m_ipc.post_msg(worker, m_ipc.OUT_REMOVE_RAY_TEST, id);
    }
}

exports.change_ray_test_from_to = function(id, from, to) {
    var scene = find_scene_by_ray_test_id(id);
    var worker = find_worker_by_ray_test_id(id);

    var sphy = scene._physics;

    var test = sphy.ray_tests[id];

    if (test && !test.autoremove) {
        test.from.set(from);
        test.to.set(to);
        m_ipc.post_msg(worker, m_ipc.OUT_CHANGE_RAY_TEST_FROM_TO, id, from, to);
    }
}

exports.is_ray_test = function(id) {
    var scene = find_scene_by_ray_test_id(id);

    var sphy = scene._physics;

    if (sphy.ray_tests[id])
        return true;
    else
        return false;
}

function find_scene_by_ray_test_id(id) {
    for (var i = 0; i < _scenes.length; i++) {
        var scene = _scenes[i];
        var sphy = scene._physics;

        if (sphy.ray_tests[id])
            return scene;
    }

    return null;
}

function find_worker_by_ray_test_id(id) {
    for (var i = 0; i < _scenes.length; i++) {
        var scene = _scenes[i];
        var sphy = scene._physics;

        if (sphy.ray_tests[id])
            return _workers[i];
    }

    return null;
}

exports.vehicle_throttle = function(obj, engine_force) {
    var vehicle = obj.vehicle;

    vehicle.engine_force = engine_force;

    var worker = find_worker_by_body_id(obj.physics.body_id);
    update_vehicle_controls(obj, vehicle, worker);
}

function update_vehicle_controls(obj, vehicle, worker) {
    if (!vehicle.steering_wheel)
        return;

    var body_id = obj.physics.body_id;
    var engine_force = vehicle.engine_force * vehicle.force_max;
    var brake_force = vehicle.brake_force * vehicle.brake_max;
    var steering = -vehicle.steering * vehicle.steering_max * 2 * Math.PI /
        vehicle.steering_ratio;
    if (vehicle.inverse_control)
        steering *= -1;

    switch (vehicle.type) {
    case VT_CHASSIS:
        // convert to radians using steering ratio and inverse
        m_ipc.post_msg(worker, m_ipc.OUT_UPDATE_CAR_CONTROLS, body_id, engine_force,
                brake_force, steering);
        break;
    case VT_HULL:
        m_ipc.post_msg(worker, m_ipc.OUT_UPDATE_BOAT_CONTROLS, body_id, engine_force,
                brake_force, steering);
        break;
    }
}

exports.vehicle_steer = function(obj, steering_value) {
    var vehicle = obj.vehicle;

    vehicle.steering = steering_value;

    var worker = find_worker_by_body_id(obj.physics.body_id);
    update_vehicle_controls(obj, vehicle, worker);
}

exports.vehicle_brake = function(obj, brake_force) {
    var vehicle = obj.vehicle;

    vehicle.brake_force = brake_force;

    var worker = find_worker_by_body_id(obj.physics.body_id);
    update_vehicle_controls(obj, vehicle, worker);
}

function update_steering_wheel_coords(obj_chassis) {

    var vehicle = obj_chassis.vehicle;
    var stw_obj = vehicle.steering_wheel;
    if (!stw_obj)
        return;

    var stw_tsr = obj_chassis.vehicle.steering_wheel_tsr;
    var stw_axis = obj_chassis.vehicle.steering_wheel_axis;

    m_tsr.multiply(obj_chassis.render.world_tsr, stw_tsr, stw_obj.render.world_tsr);

    var stw_axis_world = _vec3_tmp;
    m_tsr.transform_dir_vec3(stw_axis, obj_chassis.render.world_tsr, stw_axis_world);

    var rotation = _quat_tmp;
    m_quat.setAxisAngle(stw_axis_world, -vehicle.steering *
            vehicle.steering_max * 2 * Math.PI, rotation);

    var stw_obj_quat = m_tsr.get_quat_view(stw_obj.render.world_tsr);
    m_quat.multiply(rotation, stw_obj_quat, stw_obj_quat);

    m_trans.update_transform(stw_obj);
}


function update_speedometer(obj_chassis) {

    var vehicle = obj_chassis.vehicle;
    var sp_obj = vehicle.speedometer;

    if (!sp_obj)
        return;

    var sp_tsr = obj_chassis.vehicle.speedometer_tsr;
    var sp_axis = obj_chassis.vehicle.speedometer_axis;

    m_tsr.multiply(obj_chassis.render.world_tsr, sp_tsr, sp_obj.render.world_tsr);

    var sp_axis_world = _vec3_tmp;
    m_tsr.transform_dir_vec3(sp_axis, obj_chassis.render.world_tsr, sp_axis_world);

    var rotation = _quat_tmp;
    var angle = Math.abs(vehicle.speed) * vehicle.speed_ratio;

    if (angle > vehicle.max_speed_angle)
        angle = vehicle.max_speed_angle;

    m_quat.setAxisAngle(sp_axis_world, -angle, rotation);

    var sp_obj_quat = m_tsr.get_quat_view(sp_obj.render.world_tsr);
    m_quat.multiply(rotation, sp_obj_quat, sp_obj_quat);
    m_quat.normalize(sp_obj_quat, sp_obj_quat);

    m_trans.update_transform(sp_obj);
}

function update_tachometer(obj_chassis) {

    var vehicle = obj_chassis.vehicle;
    var tach_obj = vehicle.tachometer;

    if (!tach_obj)
        return;

    var tach_tsr = obj_chassis.vehicle.tachometer_tsr;
    var tach_axis = obj_chassis.vehicle.tachometer_axis;

    m_tsr.multiply(obj_chassis.render.world_tsr, tach_tsr, tach_obj.render.world_tsr);

    var tach_axis_world = _vec3_tmp;
    m_tsr.transform_dir_vec3(tach_axis, obj_chassis.render.world_tsr, tach_axis_world);

    var rotation = _quat_tmp;

    m_quat.setAxisAngle(tach_axis_world, -Math.abs(vehicle.engine_force) *
            vehicle.delta_tach_angle, rotation);

    var tach_obj_quat = m_tsr.get_quat_view(tach_obj.render.world_tsr);
    m_quat.multiply(rotation, tach_obj_quat, tach_obj_quat);
    m_quat.normalize(tach_obj_quat, tach_obj_quat);

    m_trans.update_transform(tach_obj);
}

exports.is_vehicle_chassis = is_vehicle_chassis;
function is_vehicle_chassis(obj) {
    return obj.is_vehicle && obj.vehicle_settings.part == "CHASSIS";
}

exports.is_vehicle_hull = is_vehicle_hull;
function is_vehicle_hull(obj) {
    return obj.is_vehicle && obj.vehicle_settings.part == "HULL";
}

exports.is_navigation_mesh = is_navigation_mesh;
function is_navigation_mesh(obj) {
    return obj.physics_settings.physics_type == "NAVMESH";
}

exports.is_car_wheel = function(obj) {
    if (!obj.is_vehicle)
        return false;

    var part = obj.vehicle_settings.part;

    if (part == "WHEEL_FRONT_LEFT" || part == "WHEEL_FRONT_RIGHT" ||
            part == "WHEEL_BACK_LEFT" || part == "WHEEL_BACK_RIGHT")
        return true;
    else
        return false;
}

exports.is_boat_bob = function(obj) {
    if (!obj.is_vehicle)
        return false;

    var part = obj.vehicle_settings.part;

    if (part == "BOB")
        return true;
    else
        return false;
}

exports.is_floater_bob = function(obj) {
    if (!obj.is_floating)
        return false;

    var part = obj.floating_settings.part;

    if (part == "BOB")
        return true;
    else
        return false;
}

exports.is_vehicle_steering_wheel = function(obj) {
    if (obj.is_vehicle && obj.vehicle_settings.part == "STEERING_WHEEL")
        return true;
    else
        return false;
}

exports.is_vehicle_speedometer = function(obj) {
    if (obj.is_vehicle && obj.vehicle_settings.part == "SPEEDOMETER")
        return true;
    else
        return false;
}

exports.is_vehicle_tachometer = function(obj) {
    if (obj.is_vehicle && obj.vehicle_settings.part == "TACHOMETER")
        return true;
    else
        return false;
}

exports.get_vehicle_speed = function(obj) {
    var vehicle = obj.vehicle;
    return vehicle.speed;
}

exports.wheel_index = function(vehicle_part) {
    /* 1 --- 0
     * 2 --- 3 */
    switch (vehicle_part) {
    case "WHEEL_FRONT_RIGHT":
        return 0;
    case "WHEEL_FRONT_LEFT":
        return 1;
    case "WHEEL_BACK_LEFT":
        return 2;
    case "WHEEL_BACK_RIGHT":
        return 3;
    }
}

exports.is_character = is_character;
function is_character(obj) {
    return obj.is_character;
}

exports.is_floater_main = is_floater_main;
function is_floater_main(obj) {
    return obj.is_floating && obj.floating_settings.part == "MAIN_BODY";
}

exports.get_fps = function() {
    return _phy_fps;
}

exports.debug_workers = function() {
    for (var i = 0; i < _workers.length; i++) {
        var worker = _workers[i];
        m_ipc.post_msg(worker, m_ipc.OUT_DEBUG);
    }
}

exports.remove_object = function(obj) {

    if (obj.physics.type == "BOUNDING") {
        var ind = _bounding_objects_arr.indexOf(obj);
        if (ind == -1)
            m_print.error("Object " + obj.name + " doesn't have bounding physics");
        delete _bounding_objects[body_id];
        _bounding_objects_arr.splice(ind, 1);
    }

    var body_id = obj.physics.body_id

    var worker = find_worker_by_body_id(body_id);
    var scene = find_scene_by_worker(worker);

    remove_collision_pairs_by_id(scene, worker, body_id);

    if (has_collision_impulse_test(obj))
        clear_collision_impulse_test(obj);

    var bundles = scene._physics.bundles;

    for (var i = 0; i < bundles.length; i++) {
        var phy = bundles[i].physics;

        if (phy.body_id == body_id) {
            bundles.splice(i, 1);
            i--;
        }
    }

    m_ipc.post_msg(worker, m_ipc.OUT_REMOVE_BODY, body_id);
}
}
