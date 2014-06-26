"use strict";

/**
 * Objects utility functions
 * @name objects
 * @namespace
 * @exports exports as objects
 */
b4w.module["__objects"] = function(exports, require) {

var m_anim      = require("__animation");
var m_batch     = require("__batch");
var m_bounds    = require("__boundings");
var m_cam       = require("__camera");
var m_cfg       = require("__config");
var m_cons      = require("__constraints");
var m_curve     = require("__curve");
var m_lights    = require("__lights");
var m_particles = require("__particles");
var m_print     = require("__print");
var m_trans     = require("__transform");
var m_tsr       = require("__tsr");
var m_util      = require("__util");

var m_quat = require("quat");
var m_vec3 = require("vec3");
var m_mat4 = require("mat4");

var cfg_anim = m_cfg.animation;
var cfg_def = m_cfg.defaults;

var DEBUG_DISABLE_STATIC_OBJS = false;

var _color_id_counter = 0;

var _quat4_tmp = new Float32Array(4);

/**
 * Create abstract render
 * @param {String} type "DYNAMIC", "STATIC", "CAMERA", "EMPTY", "NONE" 
 */
exports.create_render = create_render;
function create_render(type) {

    var render = {
        // common properties
        type: type,
        scale: 0,
        grid_id: new Array(2),
        trans: new Float32Array(3),
        quat: new Float32Array(4),
        tsr: new Float32Array(8),
        world_matrix: new Float32Array(16),
        inv_world_matrix: new Float32Array(16),
        pivot: new Float32Array(3),
        
        move_style: 0,
        trans_speed: 0,
        dof_distance: 0,
        dof_front: 0,
        dof_rear: 0,
        dof_power: 0,
        dof_object: null,
        underwater: false,
        
        distance_min: 0,
        distance_max: 0,
        use_distance_limits: false,
        horizontal_limits: null,
        vertical_limits: null,
        cameras: null,
        glow_anim_settings: null,

        // game/physics/lod properties
        friction: 0,
        elasticity: 0,
        force_strength: 0,
        lod_dist_max: 0,
        lod_dist_min: 0,
        physics_type: "",
        use_collision_compound: false,

        // rendering flags
        shadow_cast: false,
        shadow_receive: false,
        shadow_cast_only: false,
        reflexible: false,
        reflexible_only: false,
        reflective: false,
        caustics: false,
        wind_bending: false,
        disable_fogging: false,
        dynamic_geometry: false,
        dynamic_grass: false,
        do_not_cull: false,
        hide: false,
        last_lod: false,
        selectable: false,
        origin_selectable: false,
        is_hair_particles: false,
        is_visible: false,

        // wind bending properties
        wind_bending_angle: 0,
        wind_bending_amp: 0,
        wind_bending_freq: 0,
        detail_bending_freq: 0,
        detail_bending_amp: 0,
        branch_bending_amp: 0,
        main_bend_col: "",
        detail_bend_col: null,
        bend_center_only: false,

        // billboarding properties
        hair_billboard_type: "",
        hair_billboard: false,
        hair_billboard_spherical: false,

        // animation properties
        frame_factor: 0,
        time: 0,
        va_frame: 0,
        va_frame_factor: 0,
        max_bones: 0,
        frames_blending: false,
        vertex_anim: false,
        is_skinning: false,
        quats_before: null,
        quats_after: null,
        trans_before: null,
        trans_after: null,
        bone_pointers: null,
        
        // bounding volumes properties
        bb_local: null,
        bcyl_local: null,
        bcap_local: null,
        bcon_local: null,
        bb_world: null,
        bs_local: null,
        bs_world: null,
        be_local: null,
        be_world: null
    }

    // setting default values
    render.scale = 1;
    render.lod_dist_max = 10000;
    m_quat.identity(render.quat);
    m_tsr.identity(render.tsr);
    m_mat4.identity(render.world_matrix);
    m_mat4.identity(render.inv_world_matrix);

    return render;
}

/**
 * Update object: convert bpy object to b4w format,
 * by attaching such properties as _render, _constraint, _descends etc
 */
exports.update_object = update_object;
function update_object(obj) {
    var is_dynamic = obj_is_dynamic(obj);
    obj._is_dynamic = is_dynamic;

    if (obj["type"] === "MESH")
        var render_type = is_dynamic ? "DYNAMIC" : "STATIC";
    else
        var render_type = obj["type"];
    obj._render = create_render(render_type);

    obj._constraint = null;
    obj._descends = [];
    if (!obj._dg_parent)
        obj._dg_parent = null;

    var render = obj._render;

    var pos = obj["location"];
    var scale = obj["scale"][0];
    var rot = _quat4_tmp;
    m_util.quat_bpy_b4w(obj["rotation_quaternion"], rot);

    m_trans.set_translation(obj, pos);
    m_trans.set_rotation(obj, rot);
    m_trans.set_scale(obj, scale);

    switch (obj["type"]) {
    case "ARMATURE":

        var pose_bones = obj["pose"]["bones"];
        for (var i = 0; i < pose_bones.length; i++) {
            var pose_bone = pose_bones[i];
            var arm_bone = pose_bone["bone"];

            var mat_loc = new Float32Array(arm_bone["matrix_local"]);
            var mat_loc_inv = new Float32Array(16);
            m_mat4.invert(mat_loc, mat_loc_inv);

            var mat_bas = new Float32Array(pose_bone["matrix_basis"]);

            var tail = new Float32Array(3);
            m_vec3.subtract(arm_bone["tail_local"], arm_bone["head_local"], tail);
            // translate tail offset from armature to bone space
            m_util.vecdir_multiply_matrix(tail, mat_loc_inv, tail);

            pose_bone._tail = tail;

            // include current bone to chain with its parents 
            pose_bone._chain = [pose_bone].concat(pose_bone["parent_recursive"]);

            pose_bone._tsr_local = m_tsr.from_mat4(mat_loc, m_tsr.create());
            pose_bone._tsr_basis = m_tsr.from_mat4(mat_bas, m_tsr.create());
            pose_bone._tsr_channel_cache = m_tsr.create();
            pose_bone._tsr_channel_cache_valid = false;
        }

        var bone_pointers = m_anim.calc_armature_bone_pointers(obj);
        render.bone_pointers = bone_pointers;

        var pose_data = m_anim.calc_pose_data(obj, bone_pointers);

        render.quats_before = pose_data.quats;
        render.quats_after  = pose_data.quats;
        render.trans_before = pose_data.trans;
        render.trans_after  = pose_data.trans;
        render.frame_factor = 0;

        break;
    case "MESH":
        render.selectable = cfg_def.all_objs_selectable || obj["b4w_selectable"];
        render.origin_selectable = obj["b4w_selectable"];
        render.glow_anim_settings = {
            glow_duration: obj["b4w_glow_settings"]["glow_duration"],
            glow_period: obj["b4w_glow_settings"]["glow_period"],
            glow_relapses: obj["b4w_glow_settings"]["glow_relapses"]
        };

        if (render.selectable) {
            // assign color id
            obj._color_id = m_util.gen_color_id(_color_id_counter);
            _color_id_counter++;
        }
        
        prepare_skinning_info(obj);
        prepare_vertex_anim(obj);

        // apply pose if any
        var armobj = m_anim.get_first_armature_object(obj);
        if (armobj) {
            var bone_pointers = obj._render.bone_pointers;
            var pose_data = m_anim.calc_pose_data(armobj, bone_pointers);

            render.quats_before = pose_data.quats;
            render.quats_after  = pose_data.quats;
            render.trans_before = pose_data.trans;
            render.trans_after  = pose_data.trans;
            render.frame_factor = 0;
        }

        obj._batches = [];

        render.shadow_cast = obj["b4w_shadow_cast"];
        render.shadow_receive = obj["b4w_shadow_receive"];
        render.shadow_cast_only = obj["b4w_shadow_cast_only"] 
                && render.shadow_cast;

        render.reflexible = obj["b4w_reflexible"];
        render.reflexible_only = obj["b4w_reflexible_only"] 
                && render.reflexible;
        render.reflective = obj["b4w_reflective"];
        render.caustics   = obj["b4w_caustics"];

        render.wind_bending = obj["b4w_wind_bending"];
        render.wind_bending_angle = obj["b4w_wind_bending_angle"];
        var amp = m_batch.wb_angle_to_amp(obj["b4w_wind_bending_angle"], 
                m_batch.bb_bpy_to_b4w(obj["data"]["b4w_bounding_box"]), obj["scale"][0]);
        render.wind_bending_amp = amp;
        render.wind_bending_freq   = obj["b4w_wind_bending_freq"];
        render.detail_bending_freq = obj["b4w_detail_bending_freq"];
        render.detail_bending_amp  = obj["b4w_detail_bending_amp"];
        render.branch_bending_amp  = obj["b4w_branch_bending_amp"];
        render.hide = false;

        render.main_bend_col = obj["b4w_main_bend_stiffness_col"];
        var bnd_st = obj["b4w_detail_bend_colors"];
        render.detail_bend_col = {};
        render.detail_bend_col.leaves_stiffness = bnd_st["leaves_stiffness_col"];
        render.detail_bend_col.leaves_phase = bnd_st["leaves_phase_col"];
        render.detail_bend_col.overall_stiffness = bnd_st["overall_stiffness_col"];

        // overrided by hair render if needed
        render.dynamic_grass = false;

        render.do_not_cull = obj["b4w_do_not_cull"];
        render.disable_fogging = obj["b4w_disable_fogging"];
        render.dynamic_geometry = obj["b4w_dynamic_geometry"];

        // assign params for object (bounding) physics simulation
        // it seams BGE uses first material to get physics param
        var first_mat = first_mesh_material(obj);
        render.friction = first_mat["physics"]["friction"];
        render.elasticity = first_mat["physics"]["elasticity"];

        render.lod_dist_min = 0;
        render.lod_dist_max = 10000;

        render.last_lod = true;
        break;
    case "CAMERA":
        m_cam.camera_object_to_camera(obj);
        m_cam.assign_boundings(obj);
        break;

    case "LAMP":
        m_lights.lamp_to_light(obj);
        break;

    case "CURVE":
        var spline = m_curve.create_spline(obj);
        if (spline)
            obj._spline = spline;
        break;
    case "SPEAKER":
        break;
    case "EMPTY":
        // NOTE: center = 1/2 height
        var bb = m_bounds.zero_bounding_box();
        render.bb_local = bb;

        var bs = m_bounds.zero_bounding_sphere();
        render.bs_local = bs;
        break;
    default:
        break;
    }

    // NOTE: temporary disable armature parenting
    if (obj["parent"] && obj["parent_type"] == "OBJECT" && obj["parent"]["type"] != "ARMATURE") {
        var trans = render.trans;
        var quat = render.quat;
        var scale = render.scale;
        m_cons.append_stiff_obj(obj, obj["parent"], trans, quat, scale);
    } else if (obj["parent"] && obj["parent_type"] == "BONE" &&
            obj["parent"]["type"] == "ARMATURE") {
        var trans = render.trans;
        var quat = render.quat;
        m_cons.append_stiff_bone(obj, obj["parent"], obj["parent_bone"], trans, quat);
    } else if (obj._dg_parent && obj._dg_parent["b4w_group_relative"]) {
        // get offset from render before child-of constraint being applied
        var offset = m_tsr.create_sep(render.trans, render.scale, render.quat);
        m_cons.append_child_of(obj, obj._dg_parent, offset);
    } else if (obj._dg_parent && !obj._dg_parent["b4w_group_relative"]) {
        m_trans.update_transform(obj);    // to get world matrix
        var wm = render.world_matrix;
        m_mat4.multiply(obj._dg_parent._render.world_matrix, wm, wm);

        var trans = m_util.matrix_to_trans(wm);
        var scale = m_util.matrix_to_scale(wm);
        var quat = m_util.matrix_to_quat(wm);

        m_trans.set_translation(obj, trans);
        m_trans.set_rotation(obj, quat);
        m_trans.set_scale(obj, scale);
    }

    // store force field
    if (obj["field"]) {
        render.force_strength = obj["field"]["strength"];
        m_particles.update_force(obj);
    }

    // make links from group objects to their parent
    var dupli_group = obj["dupli_group"];
    if (dupli_group) {
        var dg_objects = dupli_group["objects"];
        for (var i = 0; i < dg_objects.length; i++) {
            var dg_obj = dg_objects[i];
            dg_obj._dg_parent = obj;
        }
    }

    render.use_collision_compound = obj["game"]["use_collision_compound"];
    render.physics_type = obj["game"]["physics_type"];

    m_trans.update_transform(obj);
}

exports.update_objects_dynamics = update_objects_dynamics;
function update_objects_dynamics(objects) {

    var anim_arms = [];

    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];

        if (obj._render && (obj._render.type == "DYNAMIC" ||
                obj._render.type == "CAMERA"))
            m_trans.update_transform(obj);

        // try to use default animation
        if (obj["b4w_use_default_animation"] && m_anim.is_animatable(obj)) {
            m_anim.apply_def(obj);

            if (obj["b4w_cyclic_animation"])
                m_anim.cyclic(obj, true);

            if (m_util.is_armature(obj))
                anim_arms.push(obj);

            m_anim.play(obj);
        }
    }

    // optimization
    if (!anim_arms.length)
        return;

    // auto apply armature default animation to meshes
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];

        if (m_util.is_mesh(obj) && !obj["b4w_use_default_animation"] &&
                m_anim.is_animatable(obj)) {

            for (var j = 0; j < anim_arms.length; j++) {
                var armobj = anim_arms[j];

                if (m_anim.get_first_armature_object(obj) == armobj) {
                    m_anim.apply_def(obj)
                    m_anim.cyclic(obj, m_anim.is_cyclic(armobj));
                    m_anim.play(obj);
                }
            }
        }
    }
}

function obj_is_dynamic(bpy_obj) {
    var parent = bpy_obj["parent"];

    if (parent && parent._is_dynamic)
        return true;

    if (bpy_obj["type"] === "ARMATURE" || bpy_obj["type"] === "CAMERA" 
            || bpy_obj["type"] === "MESH" && mesh_obj_is_dynamic(bpy_obj))
        return true;

    return false;
}

function mesh_obj_is_dynamic(bpy_obj) {
    var is_animated = m_anim.is_animatable(bpy_obj);
    var has_do_not_batch = bpy_obj["b4w_do_not_batch"];
    var dynamic_geom = bpy_obj["b4w_dynamic_geometry"];
    var has_anim_particles = m_particles.has_anim_particles(bpy_obj);
    var is_collision = bpy_obj["b4w_collision"];
    var is_vehicle_part = bpy_obj["b4w_vehicle"];
    var is_floater_part = bpy_obj["b4w_floating"];
    var is_character = bpy_obj["b4w_character"];
    var dyn_grass_emitter = m_particles.has_dynamic_grass_particles(bpy_obj);
    
    // skydome and lens flares not strictly required to be dynamic
    // make it so just to prevent some possible bugs in the future

    return DEBUG_DISABLE_STATIC_OBJS || is_animated || has_do_not_batch 
            || dynamic_geom || has_anim_particles || is_collision 
            || is_vehicle_part || is_floater_part || has_skydome_mat(bpy_obj) 
            || has_lens_flares_mat(bpy_obj) || dyn_grass_emitter || is_character;
}

function has_skydome_mat(obj) {
    var mesh = obj["data"];

    for (var i = 0; i < mesh["materials"].length; i++)
        if (mesh["materials"][i]["b4w_skydome"])
            return true;

    return false;
}

function has_lens_flares_mat(obj) {
    var mesh = obj["data"];

    for (var i = 0; i < mesh["materials"].length; i++)
        if (mesh["materials"][i]["name"] === "LENS_FLARES")
            return true;

    return false;
}

/**
 * Prepare skinning
 *
 * get info about relations between vertex groups and bones
 * and save to mesh internals for using in buffers generation.
 * Finally mark render to use skinning shaders
 */
function prepare_skinning_info(obj) {

    if (obj["type"] != "MESH")
        throw("Wrong object type: " + obj["name"]);

    // search for armature modifiers

    var render = obj._render;

    var armobj = m_anim.get_first_armature_object(obj);
    if (!armobj) {
        render.is_skinning = false; 
        return;
    }

    var mesh = obj["data"];

    if (mesh["vertex_groups"].length) {
        render.is_skinning = true; 
        var vertex_groups = mesh["vertex_groups"];
    } else {
        render.is_skinning = false; 
        return; 
    }

    // collect deformation bones

    var bones = armobj["data"]["bones"];
    var pose_bones = armobj["pose"]["bones"];

    var deform_bone_index = 0;
    var bone_pointers = {};

    for (var i = 0; i < bones.length; i++) {
        var bone = bones[i];
        var bone_name = bone["name"];

        // bone is deform if it has corresponding vertex group
        var vgroup = m_util.keysearch("name", bone_name, vertex_groups);
        if (!vgroup)
            continue;

        var pose_bone_index = m_util.get_index_for_key_value(pose_bones, "name", 
                bone_name);

        bone_pointers[bone_name] = {
            bone_index: i,
            deform_bone_index: deform_bone_index++,
            // pose bone index may differ from bone_index
            pose_bone_index: pose_bone_index,
            vgroup_index: vgroup["index"]
        };
    }

    var num_bones = deform_bone_index;
    var max_bones = cfg_def.max_bones;

    if (num_bones > 2 * max_bones)
        m_util.panic("B4W Error: too many bones for \"" + obj["name"]);
    else if (num_bones > max_bones) {
        m_print.warn("B4W Warning: too many bones for \"" + obj["name"] + " / " + 
            armobj["name"] + "\": " + num_bones + " bones (max " + max_bones + 
            "). Blending between frames will be disabled");

        // causes optimizing out the half of the uniform arrays,
        // effectively doubles the limit of bones
        render.frames_blending = false;
    } else
        render.frames_blending = true;

    render.frames_blending = render.frames_blending 
            && !cfg_anim.frames_blending_hack;

    render.bone_pointers = bone_pointers;
    // will be extended beyond this limit later
    render.max_bones = num_bones;
}

function prepare_vertex_anim(obj) {

    if (obj["type"] != "MESH")
        throw("Wrong object type: " + obj["name"]);

    var render = obj._render;

    if (obj["data"]["b4w_vertex_anim"].length)
        render.vertex_anim = true;
    else
        render.vertex_anim = false;
}

function first_mesh_material(obj) {
    if (obj["type"] !== "MESH")
        throw "Wrong object";

    return obj["data"]["materials"][0];
}

exports.cleanup = function() {
    _color_id_counter = 0;
}

}
