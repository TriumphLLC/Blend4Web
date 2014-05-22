"use strict";

/**
 * Physics internal API.
 * @name physics
 * @namespace
 * @exports exports as physics
 */
b4w.module["__physics"] = function(exports, require) {

var m_cfg     = require("__config");
var m_print   = require("__print");
var m_dbg     = require("__debug");
var m_ipc     = require("__ipc");
var m_render  = require("__renderer");
var m_scs     = require("__scenes");
var m_trans   = require("__transform");
var m_tsr     = require("__tsr");
var m_util    = require("__util");
var m_version = require("__version");

var m_vec3 = require("vec3");
var m_quat = require("quat");
var m_mat4 = require("mat4");

var cfg_phy = m_cfg.physics;

var RAY_CMP_PRECISION = 0.0000001;

var _phy_fps = 0;

var _active_scene_phy = null;
var _bounding_objects = [];

var _unique_counter = {
    world: 0,
    body: 0,
    constraint: 0,
    shape: 0
}

var _vec3_tmp  = new Float32Array(3);
var _vec4_tmp  = new Float32Array(4);
var _quat4_tmp = new Float32Array(4);
var _mat4_tmp  = new Float32Array(16);
var _tsr8_tmp  = new Float32Array(8);
var _tsr8_tmp2 = new Float32Array(8);

// vehicle types for internal usage
var VT_CHASSIS     = 10;
var VT_HULL        = 20;

/**
 * Initialize physics engine
 */
exports.init_engine = function() {
    if (cfg_phy.enabled) {
        var path = cfg_phy.uranium_path + m_version.timestamp();
        m_print.log("%cLOAD PHYSICS", "color: #0a0", path);
        var worker = new Worker(path);
        m_ipc.init(worker, process_message);
        //setInterval(function() {m_ipc.post_msg(m_ipc.OUT_PING, performance.now())}, 1000);
    }
}

/**
 * Init physics on given scene
 */
exports.attach_scene_physics = function(scene) {
    var world_id = get_unique_world_id();
    m_ipc.post_msg(m_ipc.OUT_APPEND_WORLD, world_id);

    scene._physics = {};
    scene._physics.world_id = world_id;
    scene._physics.bundles = [];
}

function get_unique_world_id() {
    _unique_counter.world++;
    return _unique_counter.world;
}

exports.cleanup = function() {
    if (!cfg_phy.enabled)
        return;

    m_ipc.post_msg(m_ipc.OUT_CLEANUP);

    _active_scene_phy = null;
    _bounding_objects.length = 0;

    for (var cnt in _unique_counter)
        _unique_counter[cnt] = 0;
}

function add_compound_children(parent, container) {
    var children = parent._descends;

    for (var i = 0; i < children.length; i++) {
        if (children[i]._render.use_collision_compound)
            container.push(children[i]);

        add_compound_children(children[i], container);
    }

    return null;
}

exports.append_object = function(obj, bpy_scene) {
    // NOTE: temporary, multiple worlds not working!!!
    set_active_scene(bpy_scene);

    var render = obj._render;
    if (!render)
        throw "No object render: " + obj["name"];

    if (obj["parent"] && render.use_collision_compound)
        return null;

    var compound_children = [];

    if (render.use_collision_compound)
        add_compound_children(obj, compound_children);

    var batches = obj._batches || [];

    for (var i = 0; i < batches.length; i++) {

        var batch = batches[i];

        if (batch.type != "PHYSICS" || has_batch(bpy_scene, batch))
            continue;

        if (!batch.submesh.base_length) {
            m_print.error("Object " + obj["name"] +
                    " has collision material with no assigned vertices");
            continue;
        }

        if (batch.water && bpy_scene._render.water_params) {
            init_water_physics(obj, batch);
            continue;
        }

        if (batch.use_ghost)
            var phy = init_ghost_mesh_physics(obj, batch);
        else
            var phy = init_static_mesh_physics(obj, batch);

        phy.id = batch.collision_id;

        // physics bundle
        var pb = {
            batch: batch,
            physics: phy
        };

        bpy_scene._physics.bundles.push(pb);
    }

    // NOTE_1: object physics has higher priority
    // NOTE_2: object physics is always bounding physics due to high performance
    // constraints

    if (is_vehicle_chassis(obj) || is_vehicle_hull(obj) ||
            is_character(obj) || is_floater_main(obj) || obj["b4w_collision"]) {

        var phy = init_bounding_physics(obj, render.physics_type, 
                compound_children);
        obj._physics = phy;

        var pb = {
            batch: null,
            physics: phy
        };

        bpy_scene._physics.bundles.push(pb);
    }

    if (is_vehicle_chassis(obj) || is_vehicle_hull(obj)) {
        init_vehicle(obj);
        update_vehicle_controls(obj, obj._vehicle);
    } else if (is_character(obj))
        init_character(obj);
    else if (is_floater_main(obj))
        init_floater(obj);
    else if (obj["b4w_collision"])
        phy.id = obj["b4w_collision_id"];

    for (var i = 0; i < _bounding_objects.length; i++) {
        var obj = _bounding_objects[i];
        if (obj._physics)
            process_rigid_body_joints(obj);
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
function process_message(msg_id, msg) {

    // NOTE: silently ignore if something arrives after worker cleanup
    if (!_active_scene_phy)
        return;

    switch(msg_id) {
    case m_ipc.IN_FRAME_END:
        m_render.unlock();
        break;
    case m_ipc.IN_LOG:
        m_print.log(msg);
        break;
    case m_ipc.IN_ERROR:
        m_print.error(msg);
        break;
    case m_ipc.IN_FBMSG:
        m_dbg.fbmsg.apply(this, msg.slice(1));
        break;
    case m_ipc.IN_TRANSFORM:
        var obj  = find_obj_by_body_id(msg["body_id"]);

        if(obj)
            update_interpolation_data(obj, msg["time"], msg["trans"],
                                msg["quat"], msg["linvel"], msg["angvel"]);
        break;
    case m_ipc.IN_PROP_OFFSET:
        var obj_chassis_hull = find_obj_by_body_id(msg["chassis_hull_body_id"]);

        if (obj_chassis_hull)
            update_prop_offset(obj_chassis_hull, msg["prop_ind"], msg["trans"],
                               msg["quat"]);
        break;
    case m_ipc.IN_FLOATER_BOB_TRANSFORM:
        var obj_floater = find_obj_by_body_id(msg[1]);
        if (obj_floater)
            update_floater_bob_coords(obj_floater, msg[2], msg[3], msg[4]);
        break;
    case m_ipc.IN_VEHICLE_SPEED:
        var obj = find_obj_by_body_id(msg[1]);
        obj._vehicle.speed = msg[2];
        break;
    case m_ipc.IN_COLLISION:
        traverse_collision_tests(_active_scene_phy, msg["body_id_a"],
                                 msg["body_id_b"], msg["result"],
                                 msg["coll_point"]);
        break;
    case m_ipc.IN_COLLISION_IMPULSE:
        var obj = find_obj_by_body_id(msg[1]);
        var phy = obj._physics;

        if (phy.col_imp_test_cb)
            phy.col_imp_test_cb(msg[2]);
        break;
    case m_ipc.IN_RAY_HIT:
        var body_id_a = msg["body_id"];
        var obj       = find_obj_by_body_id(body_id_a);

        if (obj) {
            var phy = obj._physics;

            var from      = msg["from"];
            var to        = msg["to"];
            var local     = msg["local"];
            var body_id_b = msg["body_id_b_hit"];
            var result    = msg["cur_result"];

            for (var i = 0; i < phy.ray_tests.length; i++) {
                var test = phy.ray_tests[i];

                if (m_util.cmp_arr_float(test.from, from, RAY_CMP_PRECISION) && 
                        m_util.cmp_arr_float(test.to, to, RAY_CMP_PRECISION) && 
                        test.local == local) {

                    for (var id in test.results)
                        test.results[id] = 1.0;

                    if (body_id_b != -1)
                        test.results[body_id_b] = result;

                    // traverse only if something changed
                    traverse_ray_test(test, _active_scene_phy);
                }
            }
            
        }
        break;
    case m_ipc.IN_PING:
        console.log("Physics message ping: ", performance.now() - msg[1]);
        break;
    default:
        m_print.error("Wrong message: " + msg_id);
        break;
    }
}

exports.find_obj_by_body_id = find_obj_by_body_id;
/**
 * Find dynamic objects by given body ID
 */
function find_obj_by_body_id(body_id) {

    var body_id = parseInt(body_id);

    for (var i = 0; i < _bounding_objects.length; i++) {
        var dobj = _bounding_objects[i];

        if (dobj._physics.body_id === body_id)
            return dobj;
    }

    return null;
}

function update_interpolation_data(obj, time, trans, quat, linvel, angvel) {

    var phy = obj._physics;

    phy.curr_time = time;
    m_tsr.set_sep(trans, 1.0, quat, phy.curr_tsr);

    m_vec3.copy(linvel, phy.linvel);
    m_vec3.copy(angvel, phy.angvel);
}

function update_prop_offset(obj_chassis_hull, prop_num, trans, quat) {
    var prop_offset = obj_chassis_hull._vehicle.prop_offsets[prop_num];

    m_tsr.set_sep(trans, 1.0, quat, prop_offset);
}

function update_floater_bob_coords(obj_floater, bob_num, trans, quat) {
    
    var obj_bob = obj_floater._floater.bobs[bob_num];
    m_trans.set_translation(obj_bob, trans);
    m_trans.set_rotation(obj_bob, quat);
    m_trans.update_transform(obj_bob);
}

function traverse_collision_tests(scene, body_id_a, body_id_b, pair_result,
        collision_point) {

    var body_id_a = parseInt(body_id_a);

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

            if (results_changed || test.need_collision_pt) {
                var pair_results = test.pair_results;
                var result = 0;

                // OR
                for (var k = 0; k < pair_results.length; k++)
                    result = result || pair_results[k];

                test.callback(result, collision_point);
            }
        }
    }
}

function traverse_ray_test(ray_test, bpy_scene) {

    var collision_id = ray_test.collision_id;
    var callback = ray_test.callback;
    var results = ray_test.results;

    var is_collision = false;
    var hit_frac = 1.0;

    for (var i = 0; i < bpy_scene._physics.bundles.length; i++) {
        var bundle = bpy_scene._physics.bundles[i];
        var bphy = bundle.physics;
        if ((collision_id == "ANY" || bphy.id == collision_id) &&
                bphy.body_id in results && results[bphy.body_id] !== 1.0) {
            is_collision = true;
            hit_frac = results[bphy.body_id];
            break;
        }
    }

    callback(is_collision, hit_frac);
}

exports.update = function(timeline, delta) {

    if (_active_scene_phy) {
        m_ipc.post_msg(m_ipc.OUT_FRAME_START, timeline, delta);
        m_render.lock();
    }

    // interpolate uranium transforms in point of previous frame
    for (var i = 0; i < _bounding_objects.length; i++) {
        var obj = _bounding_objects[i];
        var phy = obj._physics;

        // current time = 0 - do nothing
        if (phy.simulated && phy.curr_time) {
            var d = timeline - phy.curr_time;
            // NOTE: clamp to maximum 10 frames
            d = Math.min(d, 10 * 1/60);
            var tsr = _tsr8_tmp;
            m_tsr.integrate(phy.curr_tsr, d, phy.linvel, phy.angvel,
                    _tsr8_tmp);

            m_trans.set_translation(obj, m_tsr.get_trans_view(tsr));

            if (obj["type"] != "CAMERA")
                m_trans.set_rotation(obj, m_tsr.get_quat_view(tsr));

            m_trans.update_transform(obj);
            sync_transform(obj);

            if (obj._vehicle)
                update_prop_transforms(obj);

            if (obj._vehicle && obj._vehicle.steering_wheel)
                update_steering_wheel_coords(obj);

            if (obj._vehicle && obj._vehicle.speedometer)
                update_speedometer(obj);

            if (obj._vehicle && obj._vehicle.tachometer)
                update_tachometer(obj);
        }
    }

    // update physics water time
    var scene = get_active_scene();
    if (scene) {
        var subs = m_scs.get_subs(scene, "MAIN_OPAQUE");
        if (subs.water_params && subs.water_params.waves_height > 0.0) {

            var wind = m_vec3.length(subs.wind);
            m_ipc.post_msg(m_ipc.OUT_SET_WATER_TIME, subs.time * wind);
        }
    }
}

function update_prop_transforms(obj_chassis_hull) {

    var obj_props = obj_chassis_hull._vehicle.props;

    var chass_hull_tsr = obj_chassis_hull._render.tsr;
    var prop_tsr = _tsr8_tmp;

    for (var i = 0; i < obj_props.length; i++) {
        var obj_prop = obj_props[i];
        var prop_offset = obj_chassis_hull._vehicle.prop_offsets[i];

        m_tsr.multiply(chass_hull_tsr, prop_offset, prop_tsr);

        m_trans.set_tsr(obj_prop, prop_tsr);
        m_trans.update_transform(obj_prop);
    }
}


/**
 * NOTE: temporary
 */
function set_active_scene(scene) {
    _active_scene_phy = scene;
    m_ipc.post_msg(m_ipc.OUT_SET_ACTIVE_WORLD, scene._physics.world_id);
}

exports.get_active_scene = get_active_scene;
/**
 * NOTE: temporary
 */
function get_active_scene() {
    return _active_scene_phy;
}

exports.pause = function() {
    if (cfg_phy.enabled)
        m_ipc.post_msg(m_ipc.OUT_PAUSE);
}

exports.resume = function() {
    if (cfg_phy.enabled)
        m_ipc.post_msg(m_ipc.OUT_RESUME);
}

function get_unique_body_id() {
    _unique_counter.body++;
    return _unique_counter.body;
}

function init_water_physics(obj, batch) {

    m_ipc.post_msg(m_ipc.OUT_APPEND_WATER);

    // NOTE: taking some params from subscene to match water rendering
    var scene = get_active_scene();
    var subs = m_scs.get_subs(scene, "MAIN_OPAQUE");

    // TODO: get subscene water_params for proper water (not common one)
    if (subs.water_params && batch.water_dynamics) {

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

        var waves_height   = subs.water_waves_height;
        var waves_length   = subs.water_waves_length;
        var water_level    = subs.water_level;
        if (subs.shoremap_size) {
            var size_x         = subs.shoremap_size[0];
            var size_y         = subs.shoremap_size[1];
            var center_x       = subs.shoremap_center[0];
            var center_y       = subs.shoremap_center[1];
            var max_shore_dist = subs.max_shore_dist;
            var array_width    = subs.shoremap_tex_size;
            m_ipc.post_msg(m_ipc.OUT_ADD_WATER_WRAPPER, water_dyn_info, size_x,
                           size_y, center_x, center_y, max_shore_dist,
                           waves_height, waves_length, water_level, array_width,
                           scene._render.shore_distances);
        } else {
            m_ipc.post_msg(m_ipc.OUT_ADD_WATER_WRAPPER, water_dyn_info, 0, 0, 0, 0,
                           0, waves_height, waves_length, water_level, 0, null);
        }
    }
}

function init_static_mesh_physics(obj, batch) {

    var body_id = get_unique_body_id();
    
    var submesh = batch.submesh;
    var positions = submesh.va_frames[0]["a_position"];
    var indices = submesh.indices || null;

    var render = obj._render;
    var trans = obj._render.trans;

    var friction = batch.friction;
    var restitution = batch.elasticity;
    var collision_group = batch.collision_group;
    var collision_mask = batch.collision_mask;

    m_ipc.post_msg(m_ipc.OUT_APPEND_STATIC_MESH_BODY, body_id, positions, indices,
            trans, friction, restitution, collision_group, collision_mask);

    var phy = init_physics(body_id);
    return phy;
}

function init_physics(body_id) {
    var phy = {
        body_id: body_id,
        mass: 0,
        is_ghost: false,
        simulated: true,
        is_vehicle: false,
        is_character: false,
        is_floater: false,
        cons_id: null,
        id: "",
        collision_callbacks: {},
        collision_tests: [],
        col_imp_test_cb: null,
        ray_tests: [],

        curr_time: 0,
        curr_tsr: new Float32Array([0,0,0,1,0,0,0,1]),

        linvel: new Float32Array(3),
        angvel: new Float32Array(3),

        cached_trans: new Float32Array(3)
    };

    return phy;
}

/**
 * E.g for water ray casting
 */
function init_ghost_mesh_physics(obj, batch) {

    var body_id = get_unique_body_id();

    var submesh = batch.submesh;
    var positions = submesh.va_frames[0]["a_position"];
    var indices = submesh.indices || null;
    var collision_group = batch.collision_group;
    var collision_mask = batch.collision_mask;

    var render = obj._render;
    var trans = obj._render.trans;

    m_ipc.post_msg(m_ipc.OUT_APPEND_GHOST_MESH_BODY, body_id, positions, indices, trans,
             collision_group, collision_mask);

    var phy = init_physics(body_id);
    phy.is_ghost = true;
    return phy;
}


function init_bounding_physics(obj, physics_type, compound_children) {

    var render = obj._render;
    var game = obj["game"];

    var bb = render.bb_local;

    var body_id = get_unique_body_id();

    if (obj["type"] == "CAMERA") {

        var bounding_type = "CAPSULE";

        // NOTE: camera has no rotation, so simply define standard Y-bounding 
        // capsule in world space (real camera capsule would be Z-aligned)

        var bcap = render.bcap_local;

        var bcap_new = {
            center: [bcap.center[0], -bcap.center[2], bcap.center[1]],
            radius: bcap.radius,
            height: bcap.height
        }
        var bounding_object = bcap_new;
        var quat = null;

        var friction = 0.5;
        var restitution = 0.0;
    } else if (obj["type"] == "EMPTY") {
        var bounding_type = "EMPTY";
        var bounding_object = null;

        var quat = render.quat;

        var friction = 0;
        var restitution = 0;
    } else {
        var bounding_type = game["use_collision_bounds"] ?
                game["collision_bounds_type"] : "BOX";

        var quat = render.quat;
        var bounding_object = find_bounding_type(bounding_type, render);

        var friction = render.friction;
        var restitution = render.elasticity;
    }

    var trans = render.trans;
    var is_ghost = game["use_ghost"];
    // use_sleep=true - no sleeping 
    var disable_sleeping = game["use_sleep"];
    var mass = game["mass"];
    var velocity_min = game["velocity_min"];
    var velocity_max = game["velocity_max"];
    var damping = game["damping"];
    var rotation_damping = game["rotation_damping"];
    var collision_group = game["collision_group"];
    var collision_mask = game["collision_mask"];
    var size = render.bs_local.radius;
    var worker_bounding = create_worker_bounding(bounding_object);
    var correct_bound_offset = obj["b4w_correct_bounding_offset"];

    var comp_children_params = get_children_params(render,
                    compound_children, bounding_type, worker_bounding);

    m_ipc.post_msg(m_ipc.OUT_APPEND_BOUNDING_BODY, body_id, trans, quat,
            physics_type, is_ghost, disable_sleeping, mass,
            velocity_min, velocity_max, damping, rotation_damping,
            collision_group, collision_mask,
            bounding_type, worker_bounding, size, friction,
            restitution, comp_children_params, correct_bound_offset);

    _bounding_objects.push(obj);

    var phy = init_physics(body_id);
    phy.type = physics_type;
    phy.mass = mass;
    phy.is_ghost = is_ghost;
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

    var wm_inv   = _mat4_tmp;
    var quat_inv = _quat4_tmp;

    m_mat4.invert(render.world_matrix, wm_inv);
    m_quat.invert(render.quat, quat_inv);

    for (var i = 0; i < children.length; i++) {
        var child_params = {};
        var child        = children[i];
        var child_bt     = child["game"]["collision_bounds_type"];
        var loc_quat     = new Float32Array(4);
        var loc_trans    = new Float32Array(3);

        m_vec3.transformMat4(child._render.trans, wm_inv, loc_trans);
        m_quat.multiply(quat_inv, child._render.quat, loc_quat);

        child_params["trans"] = loc_trans;
        child_params["quat"] = loc_quat;
        child_params["bounding_type"] = child_bt;
        child_params["worker_bounding"] = create_worker_bounding(
                           find_bounding_type(child_bt, child._render));

        comp_children_params.push(child_params);
    }

    return comp_children_params;
}

function find_bounding_type(bounding_type, render) {

        switch(bounding_type) {
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

function init_vehicle(obj) {

    var body_id = obj._physics.body_id;

    if (is_vehicle_chassis(obj)) {
        obj._vehicle.type = VT_CHASSIS;
        var susp_compress = obj._vehicle.suspension_compression;
        var susp_stiffness = obj._vehicle.suspension_stiffness;
        var susp_damping = obj._vehicle.suspension_damping;
        var wheel_friction = obj._vehicle.wheel_friction;
        var max_suspension_travel_cm = obj._vehicle.max_suspension_travel_cm;

        m_ipc.post_msg(m_ipc.OUT_APPEND_CAR, body_id,
                               susp_compress,
                               susp_stiffness,
                               susp_damping,
                               wheel_friction,
                               max_suspension_travel_cm);
    } else if (is_vehicle_hull(obj)) {
        obj._vehicle.type = VT_HULL;
        var floating_factor = obj._vehicle.floating_factor;
        var water_lin_damp = obj._vehicle.water_lin_damp;
        var water_rot_damp = obj._vehicle.water_rot_damp;
        m_ipc.post_msg(m_ipc.OUT_APPEND_BOAT, body_id, floating_factor,
                                water_lin_damp, water_rot_damp);
    }

    if (obj._vehicle.props) {
        var props = obj._vehicle.props;
        switch (obj._vehicle.type) {

        case VT_CHASSIS:
            // NOTE: swap left and right wheels in vehicle
            add_vehicle_prop(props[1], obj, body_id, true);
            add_vehicle_prop(props[0], obj, body_id, true);
            add_vehicle_prop(props[3], obj, body_id, false);
            add_vehicle_prop(props[2], obj, body_id, false);
            break;
        case VT_HULL:
            for (var i = 0; i < props.length; i++)
                add_vehicle_prop(props[i], obj, body_id, false);
            break;
        }
    }

    obj._physics.id = obj["b4w_vehicle_settings"]["name"];
}

function add_vehicle_prop(obj_prop, obj_chassis_hull, chassis_body_id, is_front) {

    // calculate connection point
    // NOTE: initial wheel (bob) and vehicle coords may change

    var prop_trans = obj_prop._render.trans;
    var chassis_hull_matrix = obj_chassis_hull._render.world_matrix;

    var chassis_hull_matrix_inv = new Float32Array(16);
    m_mat4.invert(chassis_hull_matrix, chassis_hull_matrix_inv);

    var conn_point = new Float32Array(3);
    m_vec3.transformMat4(prop_trans, chassis_hull_matrix_inv, conn_point);

    switch (obj_chassis_hull._vehicle.type) {
    case VT_CHASSIS:
        var v_set = obj_chassis_hull["b4w_vehicle_settings"];
        var suspension_rest_length = v_set["suspension_rest_length"];
        var roll_influence = v_set["roll_influence"];

        // NOTE: using bounding box, not cylinder
        var bb = obj_prop._render.bb_local;
        var radius = (bb.max_y - bb.min_y) / 2;

        m_ipc.post_msg(m_ipc.OUT_ADD_CAR_WHEEL, chassis_body_id, conn_point, 
                suspension_rest_length, roll_influence, radius, is_front);
        break;
    case VT_HULL:
        m_ipc.post_msg(m_ipc.OUT_ADD_BOAT_BOB, chassis_body_id, conn_point, obj_prop.synchronize_pos);
        break;
    }
}

function init_character(obj) {

    var render = obj._render;
    var phy    = obj._physics;

    var height       = render.bb_local.max_y - render.bb_local.min_y;
    var character_id = phy.body_id;

    var char_settings = obj["b4w_character_settings"];
    var walk_speed    = char_settings["walk_speed"];
    var run_speed     = char_settings["run_speed"];
    var step_height   = char_settings["step_height"];
    var jump_strength = char_settings["jump_strength"];
    var waterline     = char_settings["waterline"];

    var rot_angle     = m_util.dir_ground_proj_angle(obj);

    m_ipc.post_msg(m_ipc.OUT_APPEND_CHARACTER, character_id, rot_angle, height,
              walk_speed, run_speed, step_height, jump_strength, waterline);

    phy.is_character = true;
}

function init_floater(obj) {
    var floating_factor = obj._floater.floating_factor;
    var water_lin_damp = obj._floater.water_lin_damp;
    var water_rot_damp = obj._floater.water_rot_damp;
    var body_id = obj._physics.body_id;

    m_ipc.post_msg(m_ipc.OUT_APPEND_FLOATER, body_id, floating_factor,
              water_lin_damp, water_rot_damp);

    if (obj._floater.bobs) {
        var bob_objs = obj._floater.bobs;
        for (var i = 0; i < bob_objs.length; i++) {

            // calculate connection point
            var obj_bob = bob_objs[i];
            var bob_trans = obj_bob._render.trans;

            var wm = obj._render.world_matrix;
            var wm_inv = new Float32Array(16);
            m_mat4.invert(wm, wm_inv);

            var conn_point = new Float32Array(3);
            m_vec3.transformMat4(bob_trans, wm_inv, conn_point);

            m_ipc.post_msg(m_ipc.OUT_ADD_FLOATER_BOB, body_id, conn_point, obj_bob.bob_synchronize_pos);
        }
    }
    obj._physics.is_floater = true;
}

exports.enable_simulation = function(obj) {
    var phy = obj._physics;
    if (!phy)
        throw "No object physics";

    // prevent issues with recurrent exec
    if (phy.simulated)
        return;

    var body_id = phy.body_id;
    phy.simulated = true;
    m_ipc.post_msg(m_ipc.OUT_ENABLE_SIMULATION, body_id);
}

exports.disable_simulation = function(obj) {
    var phy = obj._physics;
    if (!phy)
        throw "No object physics";

    // prevent issues with recurrent exec
    if (!phy.simulated)
        return;

    var body_id = phy.body_id;
    phy.simulated = false;
    m_ipc.post_msg(m_ipc.OUT_DISABLE_SIMULATION, body_id);
}

exports.has_physics = has_physics;
/**
 * Check if object has physics
 * @methodOf physics
 */
function has_physics(obj) {
    if (obj._physics)
        return true;
    else
        return false
}
/**
 * Check if object has dynamic and simulated physics
 */
exports.has_dynamic_physics = function(obj) {
    var phy = obj._physics;
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
    var phy = obj._physics;
    if (phy && phy.simulated)
        return true;
    else
        return false;
}
exports.set_gravity = set_gravity;
/**
 * Set object gravity
 * @methodOf physics
 */
function set_gravity(obj, gravity) {
    var body_id = obj._physics.body_id;
    m_ipc.post_msg(m_ipc.OUT_SET_GRAVITY, body_id, gravity);
}
/**
 * Process rigid body joints constraints
 */
function process_rigid_body_joints(obj) {

    // already processed
    if (has_constraint(obj))
        return;

    for (var i = 0; i < obj["constraints"].length; i++) {
        var cons = obj["constraints"][i];
        var targ = cons["target"];
        var pivot_type = cons["pivot_type"];

        if (!(cons["type"] == "RIGID_BODY_JOINT" && targ._physics))
            continue;

        var trans = get_rbj_trans(cons);
        var quat = get_rbj_quat(cons);

        var local = m_mat4.fromRotationTranslation(quat, trans,
                new Float32Array(16));
        var world_a = m_mat4.multiply(obj._render.world_matrix, local, new Float32Array(16));

        var world_b_inv = m_mat4.invert(targ._render.world_matrix,
                new Float32Array(16));

        var local_b = m_mat4.multiply(world_b_inv, world_a, world_b_inv);

        var local_b_tra = m_util.matrix_to_trans(local_b);
        var local_b_qua = m_util.matrix_to_quat(local_b);

        var limits = prepare_limits(cons);

        apply_constraint(pivot_type, obj, trans, quat, targ, local_b_tra,
                local_b_qua, limits, null, null);
    }
}

exports.has_constraint = has_constraint;
function has_constraint(obj) {
    if (obj._physics && obj._physics.cons_id)
        return true;
    else
        return false;
}

function get_rbj_trans(cons) {
    var trans = new Float32Array([cons["pivot_x"], cons["pivot_y"], cons["pivot_z"]]);
    return trans;
}

function get_rbj_quat(cons) {
    var euler = new Float32Array([cons["axis_x"], cons["axis_y"], cons["axis_z"]]);
    var quat = m_util.euler_to_quat(euler, new Float32Array(4));
    return quat;
}

function prepare_limits(cons) {
    var limits = {};
        
    limits["use_limit_x"] = cons["use_limit_x"];
    limits["use_limit_y"] = cons["use_limit_y"];
    limits["use_limit_z"] = cons["use_limit_z"];

    limits["use_angular_limit_x"] = cons["use_angular_limit_x"];
    limits["use_angular_limit_y"] = cons["use_angular_limit_y"];
    limits["use_angular_limit_z"] = cons["use_angular_limit_z"];

    limits["limit_max_x"] = cons["limit_max_x"];
    limits["limit_min_x"] = cons["limit_min_x"];
    limits["limit_max_y"] = cons["limit_max_y"];
    limits["limit_min_y"] = cons["limit_min_y"];
    limits["limit_max_z"] = cons["limit_max_z"];
    limits["limit_min_z"] = cons["limit_min_z"];

    limits["limit_angle_max_x"] = cons["limit_angle_max_x"];
    limits["limit_angle_min_x"] = cons["limit_angle_min_x"];
    limits["limit_angle_max_y"] = cons["limit_angle_max_y"];
    limits["limit_angle_min_y"] = cons["limit_angle_min_y"];
    limits["limit_angle_max_z"] = cons["limit_angle_max_z"];
    limits["limit_angle_min_z"] = cons["limit_angle_min_z"];

    return limits;
}

exports.apply_constraint = apply_constraint;
function apply_constraint(pivot_type, obj_a, trans_a, quat_a,
        obj_b, trans_b, quat_b, limits, stiffness, damping) {
    var cons_id = get_unique_constraint_id();

    var body_a = obj_a._physics.body_id;
    var body_b = obj_b._physics.body_id;

    m_ipc.post_msg(m_ipc.OUT_APPEND_CONSTRAINT, cons_id, pivot_type, limits,
            body_a, trans_a, quat_a, body_b, trans_b, quat_b, stiffness, damping);

    // applied constraint always attached to object A
    var phy = obj_a._physics;
    phy.cons_id = cons_id;
}

function get_unique_constraint_id() {
    _unique_counter.constraint++;
    return _unique_counter.constraint.toString(16);
}

exports.clear_constraint = function(obj_a) {
    var phy = obj_a._physics;
    var cons_id = phy.cons_id;

    m_ipc.post_msg(m_ipc.OUT_REMOVE_CONSTRAINT, cons_id);
    phy.cons_id = null;
}

exports.pull_to_constraint_pivot = function(obj_a, trans_a, quat_a,
        obj_b, trans_b, quat_b) {

    var tsr_a = m_tsr.create_sep(trans_a, 1, quat_a, _tsr8_tmp);
    var tsr_b = m_tsr.create_sep(trans_b, 1, quat_b, _tsr8_tmp2);

    // A -> PIVOT
    m_tsr.invert(tsr_a, tsr_a);

    // (A -> PIVOT) -> B
    m_tsr.multiply(tsr_b, tsr_a, tsr_a);

    m_trans.get_tsr(obj_b, tsr_b);

    // A -> WORLD
    m_tsr.multiply(tsr_b, tsr_a, tsr_a);

    m_trans.set_tsr(obj_a, tsr_a);
    m_trans.update_transform(obj_a);
    exports.set_transform(obj_a, obj_a._render.trans, obj_a._render.quat);
}

exports.set_transform = function(obj, trans, quat) {

    var phy = obj._physics;
    m_tsr.set_sep(obj._render.trans, 1, obj._render.quat, phy.curr_tsr);

    var msg_cache = m_ipc.get_msg_cache(m_ipc.OUT_SET_TRANSFORM);
    msg_cache["msg_id"] = m_ipc.OUT_SET_TRANSFORM;
    msg_cache["body_id"] = obj._physics.body_id;
    msg_cache["trans"] = trans;
    msg_cache["quat"] = quat;

    m_ipc.post_msg(m_ipc.OUT_SET_TRANSFORM, msg_cache);
}

exports.sync_transform = sync_transform;
/**
 * Recursively sync object transform with engine, if possible.
 * @methodOf physics
 */
function sync_transform(obj) {
    if (allows_transform(obj) && transform_changed(obj)) {
        m_vec3.copy(obj._render.trans, obj._physics.cached_trans);
        var phy = obj._physics;

        var msg_cache = m_ipc.get_msg_cache(m_ipc.OUT_SET_TRANSFORM);
        msg_cache["msg_id"] = m_ipc.OUT_SET_TRANSFORM;
        msg_cache["body_id"] = obj._physics.body_id;
        msg_cache["trans"] = obj._render.trans;
        if (phy.type === "DYNAMIC") {        
            msg_cache["quat"] = _vec4_tmp;
            m_quat.identity(_vec4_tmp);
        } else
            msg_cache["quat"] = obj._render.quat;

        m_ipc.post_msg(m_ipc.OUT_SET_TRANSFORM, msg_cache);
    }

    var descends = obj._descends;

    for (var i = 0; i < descends.length; i++)
        sync_transform(descends[i]);
}

/**
 * Check if object has physics that allows transform
 */
function allows_transform(obj) {
    var phy = obj._physics;
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

function transform_changed(obj) {
    return obj._render.trans[0] != obj._physics.cached_trans[0] ||
           obj._render.trans[1] != obj._physics.cached_trans[1] ||
           obj._render.trans[2] != obj._physics.cached_trans[2];
}


/**
 * Move object by applying velocity in world space.
 * @param vx_local Vx local space velocity
 * @param vy_local Vy local space velocity
 * @param vz_local Vz local space velocity 
 * @param allow_vertical Perform velocity transform to allow vertical velocity 
 * in world space (air, water)
 * @param disable_up Disable up speed (swimming on surface)
 */
exports.apply_velocity = function(obj, vx_local, vy_local, vz_local, 
        allow_vertical, disable_up) {

    var v_world = _vec3_tmp;
    vector_to_world(obj, vx_local, vy_local, vz_local, allow_vertical, 
            disable_up, v_world);

    var body_id = obj._physics.body_id;
    m_ipc.post_msg(m_ipc.OUT_ACTIVATE, body_id);

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

    m_ipc.post_msg(m_ipc.OUT_SET_LINEAR_VELOCITY, body_id, v_world[0], v_world[1], v_world[2]);
}

/**
 * Move object by applying velocity in world space.
 * @param disable_up Disable up speed (swimming on surface)
 * TODO: apply_velocity -> apply_velocity_local 
 */
exports.apply_velocity_world = function(obj, vx, vy, vz) {

    var body_id = obj._physics.body_id;

    m_ipc.post_msg(m_ipc.OUT_ACTIVATE, body_id);
    m_ipc.post_msg(m_ipc.OUT_SET_LINEAR_VELOCITY, body_id, vx, vy, vz);
}

function vector_to_world(obj, vx_local, vy_local, vz_local, allow_vertical, 
        disable_up, dest) {

    var v = dest || new Float32Array(3);

    var quat = obj._render.quat;

    if (allow_vertical) {
        v[0] = vx_local;
        v[1] = vy_local;
        v[2] = vz_local;
        var v_world = m_vec3.transformQuat(v, quat, v);
    } else if (obj["type"] == "CAMERA") {
        // allow X,Y components affect world velocity
        v[0] = vx_local;
        v[1] = vy_local;
        v[2] = 0;
        var v_world = m_vec3.transformQuat(v, quat, v);
        v_world[1] = -vz_local;
    } else if (obj["type"] == "MESH") {
        // allow X,Z components affect world velocity
        v[0] = vx_local;
        v[1] = 0;
        v[2] = vz_local;
        var v_world = m_vec3.transformQuat(v, quat, v);
        v_world[1] = vy_local;
    } else
        throw "Wrong object type";

    if (disable_up && v_world[1] > 0)
        v_world[1] = 0;

    return v_world;
}

/**
 * Move object by applying force in world space.
 * @param vx_local Vx local space velocity
 * @param vy_local Vy local space velocity
 * @param vz_local Vz local space velocity 
 * @param allow_vertical Perform velocity transform to allow vertical velocity 
 * in world space (air, water)
 * @param disable_up Disable up speed (swimming on surface)
 */
exports.apply_force = apply_force;
function apply_force(obj, fx_local, fy_local, fz_local, 
        allow_vertical, disable_up) {

    var f_world = _vec3_tmp;
    vector_to_world(obj, fx_local, fy_local, fz_local, allow_vertical, 
            disable_up, f_world);

    var body_id = obj._physics.body_id;

    m_ipc.post_msg(m_ipc.OUT_ACTIVATE, body_id);
    m_ipc.post_msg(m_ipc.OUT_APPLY_CENTRAL_FORCE, body_id, f_world[0], f_world[1], f_world[2]);
}

/**
 * Rotate object by applying torque in world space.
 * @param tx_local Tx local space torque
 * @param ty_local Ty local space torque
 * @param tz_local Tz local space torque 
 */
exports.apply_torque = apply_torque;
function apply_torque(obj, tx_local, ty_local, tz_local) {

    var t_world = _vec3_tmp;
    vector_to_world(obj, tx_local, ty_local, tz_local, true, false, t_world);

    var body_id = obj._physics.body_id;
    m_ipc.post_msg(m_ipc.OUT_ACTIVATE, body_id);
    m_ipc.post_msg(m_ipc.OUT_APPLY_TORQUE, body_id, t_world[0], t_world[1], t_world[2]);
}

/**
 * Set character moving direction (may be zero vector).
 * @param forw Apply forward move (may be negative)
 * @param back Apply side move (may be negative)
 */
exports.set_character_move_dir = function(obj, forw, side) {
    var body_id = obj._physics.body_id;
    m_ipc.post_msg(m_ipc.OUT_ACTIVATE, body_id);
    m_ipc.post_msg(m_ipc.OUT_SET_CHARACTER_MOVE_DIR, body_id, forw, side);
}

/**
 * Set character moving type.
 * @param type Character moving type
 */
exports.set_character_move_type = function(obj, type) {
    var body_id = obj._physics.body_id;
    m_ipc.post_msg(m_ipc.OUT_SET_CHARACTER_MOVE_TYPE, body_id, type);
}

/**
 * Set character walk speed.
 * @param velocity Walking velocity
 */
exports.set_character_walk_velocity = function(obj, velocity) {
    var body_id = obj._physics.body_id;
    m_ipc.post_msg(m_ipc.OUT_SET_CHARACTER_WALK_VELOCITY, body_id, velocity);
}

/**
 * Set character run speed.
 * @param velocity Running velocity
 */
exports.set_character_run_velocity = function(obj, velocity) {
    var body_id = obj._physics.body_id;
    m_ipc.post_msg(m_ipc.OUT_SET_CHARACTER_RUN_VELOCITY, body_id, velocity);
}

/**
 * Set character fly speed.
 * @param velocity Flying velocity
 */
exports.set_character_fly_velocity = function(obj, velocity) {
    var body_id = obj._physics.body_id;
    m_ipc.post_msg(m_ipc.OUT_SET_CHARACTER_FLY_VELOCITY, body_id, velocity);
}

/**
 * Perform character's jump
 */
exports.character_jump = function(obj) {
    var body_id = obj._physics.body_id;
    m_ipc.post_msg(m_ipc.OUT_CHARACTER_JUMP, body_id);
}

/**
 * Increment character's rotation
 */
exports.character_rotation_inc = function(obj, h_angle, v_angle) {
    var body_id = obj._physics.body_id;
    m_ipc.post_msg(m_ipc.OUT_CHARACTER_ROTATION_INCREMENT, body_id, h_angle, v_angle);
}

/**
 * Set character's rotation in both planes
 */
exports.set_character_rotation = function(obj, angle_h, angle_v) {
    var body_id = obj._physics.body_id;
    m_ipc.post_msg(m_ipc.OUT_SET_CHARACTER_ROTATION, body_id, angle_h, angle_v);
}

/**
 * Set character's horizontal rotation
 */
exports.set_character_rotation_h = function(obj, angle) {
    var body_id = obj._physics.body_id;
    m_ipc.post_msg(m_ipc.OUT_SET_CHARACTER_HOR_ROTATION, body_id, angle);
}

/**
 * Set character's vertical rotation
 */
exports.set_character_rotation_v = function(obj, angle) {
    var body_id = obj._physics.body_id;
    m_ipc.post_msg(m_ipc.OUT_SET_CHARACTER_VERT_ROTATION, body_id, angle);
}

/**
 * @deprecated Should be implemented in app
 */
exports.check_underwater = function() {
    //var UP_OFFSET = 100;
    return false;
}
/**
 * @deprecated Should be implemented in app
 */
exports.check_on_surface = function() {
    //TO (+) var UP_OFFSET = 100;
    //FROM (+) var SURFACE_DELTA = 1.0;
    return false;
}
/**
 * @deprecated Implemented in worker
 */
exports.check_collision = function() {
    m_print.error("check_collision() deprecated");
    return false;
}
/**
 * @deprecated Implemented in worker
 */
exports.check_collision_any = function() {
    m_print.error("check_collision_any() deprecated");
    return false;
}
/**
 * @deprecated Implemented in worker
 */
exports.check_ray_hit = function() {
    m_print.error("check_ray_hit() deprecated");
    return false;
}
/**
 * @deprecated Need to be async
 */
exports.update_object_coords = function() {
    m_print.error("update_object_coords() deprecated");
    return;
}


/**
 * Check collision of object with something that have given collision_id.
 */
exports.append_collision_test = function(obj, collision_id, callback,
                                         need_collision_pt) {
    var phy = obj._physics;
    var body_id = phy.body_id;

    var collision_id = collision_id || "ANY";

    // not needed to add enother collision test
    for (var i = 0; i < phy.collision_tests.length; i++) {
        var test = phy.collision_tests[i];
        if (test.collision_id == collision_id && test.callback == callback)
            return;
    }

    var pairs = extract_collision_pairs(obj, collision_id);

    var test = {
        collision_id: collision_id,
        callback: callback,
        pairs: pairs,
        pair_results: new Uint8Array(pairs.length),
        need_collision_pt: need_collision_pt || false
    }
    phy.collision_tests.push(test);

    // NOTE: unknown issues with freezed objects
    m_ipc.post_msg(m_ipc.OUT_ACTIVATE, body_id);
    m_ipc.post_msg(m_ipc.OUT_APPEND_COLLISION_TEST, pairs, need_collision_pt);
}

function extract_collision_pairs(obj, collision_id) {
    var pairs = [];

    var body_id_a = obj._physics.body_id;
    var body_id_b_arr = [];
    
    collision_id_to_body_ids(collision_id, get_active_scene(),
            body_id_b_arr, null);

    for (var i = 0; i < body_id_b_arr.length; i++) {
        var body_id_b = body_id_b_arr[i];

        // sorted pairs, but comparison does not have any special meaning
        if (body_id_a < body_id_b)
            pairs.push([body_id_a, body_id_b]);
        else if (body_id_a > body_id_b)
            pairs.push([body_id_b, body_id_a]);
        // == ignored
    }

    return pairs;
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
            if (bundle.physics.id == collision_id) {
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
    var phy = obj._physics;
    var body_id = phy.body_id;

    var collision_id = collision_id || "ANY";

    for (var i = 0; i < phy.collision_tests.length; i++) {
        var test = phy.collision_tests[i];
        if (test.collision_id == collision_id && test.callback == callback) {

            phy.collision_tests.splice(i, 1);
            i--;

            remove_unused_collision_pairs(get_active_scene(), test.pairs);
        }
    }
}

/**
 * Find from pairs unused and remove
 */
function remove_unused_collision_pairs(scene, pairs) {

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

                    if (pair[0] === unused_pair[0] && pair[1] === unused_pair[1]) {
                        unused_pairs.splice(l, 1);
                        l--;
                    }
                }
            }
        }
    }

    if (unused_pairs.length)
        m_ipc.post_msg(m_ipc.OUT_REMOVE_COLLISION_TEST, unused_pairs);
}

exports.apply_collision_impulse_test = function(obj, callback) {
    var phy = obj._physics;
    if (!phy) {
        m_print.error("Object " + obj["name"] + " has no physics");
        return;
    }

    m_ipc.post_msg(m_ipc.OUT_APPLY_COLLISION_IMPULSE_TEST, phy.body_id);
    phy.col_imp_test_cb = callback;
}

exports.clear_collision_impulse_test = function(obj) {
    var phy = obj._physics;
    if (!phy) {
        m_print.error("Object " + obj["name"] + " has no physics");
        return;
    }

    m_ipc.post_msg(m_ipc.OUT_CLEAR_COLLISION_IMPULSE_TEST, phy.body_id);
    phy.col_imp_test_cb = null;
}

/**
 * Append new ray test with given params and callback
 * @param obj Object ID
 */
exports.append_ray_test = function(obj, collision_id, from, to, local_coords, 
        callback) {
    // TODO: appending same tests with different callbacks

    var phy = obj._physics;
    if (!phy) {
        m_print.error("Object " + obj["name"] + " has no physics");
        return;
    }

    var body_id = phy.body_id;

    var collision_id = collision_id || "ANY";

    var test = {
        from: new Float32Array(from),
        to: new Float32Array(to),
        local: local_coords,
        callback: callback,
        collision_id: collision_id,
        // result for each target body_id
        results: {}
    }
    collision_id_to_body_ids(collision_id, _active_scene_phy, null, test.results);
    // not needed to ray test body_id itself
    delete test.results[body_id];

    // initialize results with 1.0 - no collision
    for (var res in test.results)
        test.results[res] = 1.0;

    phy.ray_tests.push(test);

    order_ray_tests(body_id, phy.ray_tests);
}

/**
 * Find and store body id matching given collision id
 * @param [dest_arr] Destination array
 * @param [dest_obj] Destination object with body_id keys and zero values
 */
function collision_id_to_body_ids(collision_id, bpy_scene, dest_arr, dest_obj) {

    if (!dest_arr && !dest_obj)
        throw "At least one destination required";

    for (var i = 0; i < bpy_scene._physics.bundles.length; i++) {
        var bundle = bpy_scene._physics.bundles[i];
        if (collision_id == "ANY" || bundle.physics.id == collision_id) {
            var body_id = bundle.physics.body_id;

            // unique
            if (dest_arr && dest_arr.indexOf(body_id) == -1)
                dest_arr.push(body_id);

            if (dest_obj)
                dest_obj[body_id] = 0;
        }
    }
}

/**
 * Compress tests and request ray testing from worker
 */
function order_ray_tests(body_id_a, ray_tests) {

    // NOTE: unknown issues with freezed objects
    m_ipc.post_msg(m_ipc.OUT_ACTIVATE, body_id_a);

    if (!ray_tests.length) {
        m_ipc.post_msg(m_ipc.OUT_RAY_TEST, body_id_a, null, null, false, null);
        return;
    }

    // NOTE: body id compressing is really a bad idea now

    var body_id_baskets = {};
    for (var i = 0; i < ray_tests.length; i++) {
        var test = ray_tests[i];

        // from, to, local flag must be unique
        var id = m_util.array_stringify(test.from) + 
                m_util.array_stringify(test.to) + String(test.local);

        body_id_baskets[id] = body_id_baskets[id] || 
                {from: test.from, to: test.to, local: test.local, body_ids: []};

        var body_ids = body_id_baskets[id].body_ids;

        for (var body_id in test.results)
            if (body_ids.indexOf(body_id) == -1)
                body_ids.push(body_id);
    }

    for (var id in body_id_baskets) {
        var from = body_id_baskets[id].from;
        var to = body_id_baskets[id].to;
        var local = body_id_baskets[id].local;
        var body_ids = body_id_baskets[id].body_ids;

        m_ipc.post_msg(m_ipc.OUT_RAY_TEST, body_id_a, from, to, local, body_ids);
    }
}

exports.remove_ray_test = function(obj, collision_id, from, to, local_coords) {
    var phy = obj._physics;
    if (!phy) {
        m_print.error("Object " + obj["name"] + " has no physics");
        return;
    }

    var body_id = phy.body_id;

    var collision_id = collision_id || "ANY";

    for (var i = 0; i < phy.ray_tests.length; i++) {
        var test = phy.ray_tests[i];

        if (m_util.cmp_arr_float(test.from, from, RAY_CMP_PRECISION) && 
                m_util.cmp_arr_float(test.to, to, RAY_CMP_PRECISION) && 
                test.local == local_coords) {
            phy.ray_tests.splice(i, 1);
            i--;
        }
    }

    order_ray_tests(body_id, phy.ray_tests);
}

exports.vehicle_throttle = function(obj, engine_force) {
    var vehicle = obj._vehicle;

    vehicle.engine_force = engine_force;

    update_vehicle_controls(obj, vehicle);
}

function update_vehicle_controls(obj, vehicle) {
    if (!vehicle.steering_wheel)
        return;

    var body_id = obj._physics.body_id;
    var engine_force = vehicle.engine_force * vehicle.force_max;
    var brake_force = vehicle.brake_force * vehicle.brake_max;
    var steering = -vehicle.steering * vehicle.steering_max * 2 * Math.PI / 
        vehicle.steering_ratio;
    if (vehicle.inverse_control)
        steering *= -1;

    switch (vehicle.type) {
    case VT_CHASSIS:
        // convert to radians using steering ratio and inverse

        m_ipc.post_msg(m_ipc.OUT_ACTIVATE, body_id);

        m_ipc.post_msg(m_ipc.OUT_UPDATE_CAR_CONTROLS, body_id, engine_force, 
                brake_force, steering);
        break;
    case VT_HULL:
        m_ipc.post_msg(m_ipc.OUT_ACTIVATE, body_id);

        m_ipc.post_msg(m_ipc.OUT_UPDATE_BOAT_CONTROLS, body_id, engine_force, 
                brake_force, steering);
        break;
    }
}

exports.vehicle_steer = function(obj, steering_value) {
    var vehicle = obj._vehicle;

    vehicle.steering = steering_value;

    update_vehicle_controls(obj, vehicle);
}

exports.vehicle_brake = function(obj, brake_force) {
    var vehicle = obj._vehicle;

    vehicle.brake_force = brake_force;

    update_vehicle_controls(obj, vehicle);
}

function update_steering_wheel_coords(obj_chassis) {

    var vehicle = obj_chassis._vehicle;
    var stw_obj = vehicle.steering_wheel;
    if (!stw_obj)
        return;

    var stw_matrix = obj_chassis._vehicle.steering_wheel_matrix;
    var stw_axis = obj_chassis._vehicle.steering_wheel_axis;

    var stw_matrix_world = _mat4_tmp;

    var chassis_trans = obj_chassis._render.trans;
    var chassis_quat = obj_chassis._render.quat;
    m_util.transform_mat4(stw_matrix, 1, chassis_quat, chassis_trans, stw_matrix_world);

    m_util.matrix_to_trans(stw_matrix_world, stw_obj._render.trans);
    m_util.matrix_to_quat(stw_matrix_world, stw_obj._render.quat);

    var stw_axis_world = _vec4_tmp;
    m_util.transform_vec4(stw_axis, 1, chassis_quat, chassis_trans, stw_axis_world);

    var rotation = _quat4_tmp;

    m_quat.setAxisAngle(stw_axis_world, -vehicle.steering *
            vehicle.steering_max * 2 * Math.PI, rotation);
    m_quat.multiply(rotation, stw_obj._render.quat, stw_obj._render.quat);

    m_trans.update_transform(stw_obj);
}

function update_speedometer(obj_chassis) {

    var vehicle = obj_chassis._vehicle;
    var sp_obj = vehicle.speedometer;

    if (!sp_obj)
        return;

    var sp_matrix = obj_chassis._vehicle.speedometer_matrix;
    var sp_axis = obj_chassis._vehicle.speedometer_axis;

    var sp_matrix_world = _mat4_tmp;

    var chassis_trans = obj_chassis._render.trans;
    var chassis_quat = obj_chassis._render.quat;
    m_util.transform_mat4(sp_matrix, 1, chassis_quat, chassis_trans, sp_matrix_world);

    m_util.matrix_to_trans(sp_matrix_world, sp_obj._render.trans);
    m_util.matrix_to_quat(sp_matrix_world, sp_obj._render.quat);

    var sp_axis_world = _vec4_tmp;
    m_util.transform_vec4(sp_axis, 1, chassis_quat, chassis_trans, sp_axis_world);

    var rotation = _quat4_tmp;
    var angle = Math.abs(vehicle.speed) * vehicle.speed_ratio;

    if (angle > vehicle.max_speed_angle)
        angle = vehicle.max_speed_angle;

    m_quat.setAxisAngle(sp_axis_world, -angle, rotation);

    m_quat.multiply(rotation, sp_obj._render.quat, sp_obj._render.quat);

    m_trans.update_transform(sp_obj);
}

function update_tachometer(obj_chassis) {

    var vehicle = obj_chassis._vehicle;
    var tach_obj = vehicle.tachometer;

    if (!tach_obj)
        return;

    var tach_matrix = obj_chassis._vehicle.tachometer_matrix;
    var tach_axis = obj_chassis._vehicle.tachometer_axis;

    var tach_matrix_world = _mat4_tmp;

    var chassis_trans = obj_chassis._render.trans;
    var chassis_quat = obj_chassis._render.quat;
    m_util.transform_mat4(tach_matrix, 1, chassis_quat, chassis_trans, tach_matrix_world);

    m_util.matrix_to_trans(tach_matrix_world, tach_obj._render.trans);
    m_util.matrix_to_quat(tach_matrix_world, tach_obj._render.quat);

    var tach_axis_world = _vec4_tmp;
    m_util.transform_vec4(tach_axis, 1, chassis_quat, chassis_trans, tach_axis_world);

    var rotation = _quat4_tmp;

    m_quat.setAxisAngle(tach_axis_world, -Math.abs(vehicle.engine_force) *
            vehicle.delta_tach_angle, rotation);
    m_quat.multiply(rotation, tach_obj._render.quat, tach_obj._render.quat);

    m_trans.update_transform(tach_obj);
}

exports.is_vehicle_chassis = is_vehicle_chassis;
function is_vehicle_chassis(obj) {
    if (obj["b4w_vehicle"] && obj["b4w_vehicle_settings"]["part"] == "CHASSIS")
        return true;
    else
        return false;
}

exports.is_vehicle_hull = is_vehicle_hull;
function is_vehicle_hull(obj) {
    if (obj["b4w_vehicle"] && obj["b4w_vehicle_settings"]["part"] == "HULL")
        return true;
    else
        return false;
}

exports.is_car_wheel = function(obj) {
    if (!obj["b4w_vehicle"])
        return false;

    var part = obj["b4w_vehicle_settings"]["part"];

    if (part == "WHEEL_FRONT_LEFT" || part == "WHEEL_FRONT_RIGHT" || 
            part == "WHEEL_BACK_LEFT" || part == "WHEEL_BACK_RIGHT")
        return true;
    else
        return false;
}

exports.is_boat_bob = function(obj) {
    if (!obj["b4w_vehicle"])
        return false;

    var part = obj["b4w_vehicle_settings"]["part"];

    if (part == "BOB")
        return true;
    else
        return false;
}

exports.is_floater_bob = function(obj) {
    if (!obj["b4w_floating"])
        return false;

    var part = obj["b4w_floating_settings"]["part"];

    if (part == "BOB")
        return true;
    else
        return false;
}

exports.is_vehicle_steering_wheel = function(obj) {
    if (obj["b4w_vehicle"] && obj["b4w_vehicle_settings"]["part"] == "STEERING_WHEEL")
        return true;
    else
        return false;
}

exports.is_vehicle_speedometer = function(obj) {
    if (obj["b4w_vehicle"] && obj["b4w_vehicle_settings"]["part"] == "SPEEDOMETER")
        return true;
    else
        return false;
}

exports.is_vehicle_tachometer = function(obj) {
    if (obj["b4w_vehicle"] && obj["b4w_vehicle_settings"]["part"] == "TACHOMETER")
        return true;
    else
        return false;
}

exports.get_vehicle_speed = function(obj) {
    var vehicle = obj._vehicle;
    return vehicle.speed;
}

exports.wheel_index = function(vehicle_part) {
    switch (vehicle_part) {
    case "WHEEL_FRONT_LEFT":
        return 0;
    case "WHEEL_FRONT_RIGHT":
        return 1;
    case "WHEEL_BACK_LEFT":
        return 2;
    case "WHEEL_BACK_RIGHT":
        return 3;
    }
}

exports.is_character = is_character;
function is_character(obj) {
    if (obj["b4w_character"])
        return true;
    else
        return false;
}

exports.is_floater_main = is_floater_main;
function is_floater_main(obj) {
    if (obj["b4w_floating"] && obj["b4w_floating_settings"]["part"] == "MAIN_BODY")
        return true;
    else
        return false;
}

exports.get_fps = function() {
    return _phy_fps;
}

exports.debug_worker = function() {
    m_ipc.post_msg(m_ipc.OUT_DEBUG);
}

}
