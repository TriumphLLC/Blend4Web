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
"use strict";

/**
 * Objects common functionality
 * @name objects
 * @namespace
 * @exports exports as objects
 */
b4w.module["__objects"] = function(exports, require) {

var m_anim       = require("__animation");
var m_batch      = require("__batch");
var m_bounds     = require("__boundings");
var m_cam        = require("__camera");
var m_cfg        = require("__config");
var m_cons       = require("__constraints");
var m_cont       = require("__container");
var m_geom       = require("__geometry");
var m_lights     = require("__lights");
var m_nla        = require("__nla");
var m_nodemat    = require("__nodemat");
var m_obj_util   = require("__obj_util");
var m_particles  = require("__particles");
var m_phy        = require("__physics");
var m_print      = require("__print");
var m_primitives = require("__primitives");
var m_quat       = require("__quat");
var m_scenes     = require("__scenes");
var m_subs       = require("__subscene");
var m_sfx        = require("__sfx");
var m_tex        = require("__textures");
var m_time       = require("__time");
var m_trans      = require("__transform");
var m_tsr        = require("__tsr");
var m_util       = require("__util");
var m_vec3       = require("__vec3");
var m_armat      = require("__armature");
var m_anchors    = require("__anchors");
var m_render     = require("__renderer");

var cfg_def = m_cfg.defaults;
var cfg_out = m_cfg.outlining;

var DEBUG_DISABLE_STATIC_OBJS = false;

var _all_objects = {"ALL": []};

var _color_id_counter = 0;
var _cube_refl_counter = 0;
var _refl_plane_objs = [];
var _outline_anim_objs = [];

var _vec3_tmp = new Float32Array(3);
var _quat_tmp = new Float32Array(4);

var COLOR_ID_THRESHOLD = 3.0;
var DATA_ID_ALL = -1;

var LOD_TRANSITION_TIME = 0.4; //sec
var LOD_HYST_INTERVAL_LIMIT_COEFF = 0.3;

exports.GET_OBJECT_BY_NAME = 0;
exports.GET_OBJECT_BY_DUPLI_NAME = 1;
exports.GET_OBJECT_BY_DUPLI_NAME_LIST = 2;

exports.DATA_ID_ALL = DATA_ID_ALL;

exports.update = function(timeline, elapsed) {
    // update outline objects first (no need for processing among other objs)
    for (var i = 0; i < _outline_anim_objs.length; i++) {
        var obj = _outline_anim_objs[i];
        update_obj_outline_intensity(obj, timeline);
        if (obj.render.outline_intensity)
            request_scenes_outline(obj);
    }

    var armatures = _all_objects["ARMATURE"];
    if (armatures)
        // update bone constraints
        for (var i = 0; i < armatures.length; i++) {
            var armobj = armatures[i];
            if (armobj.need_update_transform) {
                m_trans.update_transform(armobj);
                armobj.need_update_transform = false;
            }
        }
}

exports.set_outline_intensity = set_outline_intensity;
function set_outline_intensity(obj, value) {
    obj.render.outline_intensity = value;
    request_scenes_outline(obj);
}

function request_scenes_outline(obj) {
    var scenes_data = obj.scenes_data;
    var obj_render = obj.render;
    for (var i = 0; i < scenes_data.length; i++) {
        var sc_data = scenes_data[i];
        var scene = sc_data.scene;
        var render = scene._render;
        if (render.outline && obj_render.outline_intensity)
            m_scenes.request_outline(scene);
    }
}

exports.apply_outline_anim = function(obj, tau, T, N) {
    var oa = obj.outline_animation;
    oa.time_start = 0;
    oa.outline_time = tau;
    oa.period = T;
    oa.relapses = N;

    var ind = _outline_anim_objs.indexOf(obj);
    if (ind == -1)
        _outline_anim_objs.push(obj);
}

exports.clear_outline_anim = clear_outline_anim;
function clear_outline_anim(obj) {
    obj.render.outline_intensity = 0;

    var ind = _outline_anim_objs.indexOf(obj);
    if (ind != -1)
        _outline_anim_objs.splice(ind, 1);
}

/**
 * Update object: updates b4w object from bpy object.
 */
exports.update_object = function(bpy_obj, obj) {

    obj.uuid = bpy_obj["uuid"];
    obj.is_meta = false;

    obj.def_action_slots = bpy_obj._def_action_slots;
    obj.is_dynamic = bpy_obj._is_dynamic;
    obj.is_hair_dupli = bpy_obj._is_hair_dupli || false;

    prepare_physics_settings(bpy_obj, obj);

    if (obj.type === "MESH")
        var render_type = obj.is_dynamic ? "DYNAMIC" : "STATIC";
    else
        var render_type = obj.type;

    var render = obj.render = m_obj_util.create_render(render_type);

    prepare_parenting_props(bpy_obj, obj);

    var pos = bpy_obj["location"];
    var scale = bpy_obj["scale"][0];
    var rot = _quat_tmp;
    m_util.quat_bpy_b4w(bpy_obj["rotation_quaternion"], rot);

    m_trans.set_translation(obj, pos);
    m_trans.set_rotation(obj, rot);
    m_trans.set_scale(obj, scale);

    obj.use_default_animation = bpy_obj["b4w_use_default_animation"];
    obj.anim_behavior_def = m_anim.anim_behavior_bpy_b4w(bpy_obj["b4w_anim_behavior"]);

    if (bpy_obj["b4w_object_tags"])
        obj.metatags = {
            title: bpy_obj["b4w_object_tags"]["title"],
            description: bpy_obj["b4w_object_tags"]["description"],
            category: bpy_obj["b4w_object_tags"]["category"]
        }

    obj.custom_prop = bpy_obj["b4w_custom_prop"]

    if (bpy_obj["b4w_viewport_alignment"])
        obj.viewport_alignment = {
            alignment: bpy_obj["b4w_viewport_alignment"]["alignment"],
            distance: bpy_obj["b4w_viewport_alignment"]["distance"]
        }

    render.hide = bpy_obj["b4w_hidden_on_load"];
    render.hide_children = bpy_obj["b4w_hide_chldr_on_load"];

    switch (bpy_obj["type"]) {
    case "ARMATURE":
        m_armat.update_object(bpy_obj, obj);
        var bone_pointers = render.bone_pointers;
        var pose_data = m_anim.calc_pose_data(bone_pointers);

        if (bpy_obj["b4w_animation_mixing"]) {
            render.quats_before = new Float32Array(pose_data.quats);
            render.quats_after  = new Float32Array(pose_data.quats);
            render.trans_before = new Float32Array(pose_data.trans);
            render.trans_after  = new Float32Array(pose_data.trans);
        } else {
            render.quats_before = pose_data.quats;
            render.quats_after  = pose_data.quats;
            render.trans_before = pose_data.trans;
            render.trans_after  = pose_data.trans;
        }

        // we need to recalculate bpointers' tsrs after pose is applied
        // NOTE: need to find better realization
        for (var bone_name in bone_pointers) {
            var bpointer = bone_pointers[bone_name];
            // do this only for root bones. They will update others
            if (bpointer.chain.length == 1)
                m_armat.update_bone_tsr_r(bpointer, true, pose_data.trans,
                                                          pose_data.quats);
        }

        render.pose_data = pose_data;
        render.frame_factor = 0;
        render.anim_mixing = bpy_obj["b4w_animation_mixing"];
        break;

    case "MESH":
        render.bb_original = m_batch.bb_bpy_to_b4w(bpy_obj["data"]["b4w_boundings"]["bb"]);
        obj.is_boundings_overridden = bpy_obj["data"]["is_boundings_overridden"];
        render.do_not_render = bpy_obj["b4w_do_not_render"];
        render.selectable = cfg_out.outlining_overview_mode || bpy_obj["b4w_selectable"];
        render.origin_selectable = bpy_obj["b4w_selectable"];

        render.outlining = cfg_out.outlining_overview_mode || bpy_obj["b4w_outlining"];
        render.origin_outlining = bpy_obj["b4w_outlining"];

        render.outline_on_select = cfg_out.outlining_overview_mode || bpy_obj["b4w_outline_on_select"];

        render.billboard = bpy_obj["b4w_billboard"];
        render.billboard_pres_glob_orientation = bpy_obj["b4w_pres_glob_orientation"];
        // set default object billboard type
        render.billboard_type = "BASIC";
        render.billboard_spherical = bpy_obj["b4w_billboard_geometry"] == "SPHERICAL";

        var oa_set = render.outline_anim_settings_default;
        oa_set.outline_duration = bpy_obj["b4w_outline_settings"]["outline_duration"],
        oa_set.outline_period = bpy_obj["b4w_outline_settings"]["outline_period"],
        oa_set.outline_relapses = bpy_obj["b4w_outline_settings"]["outline_relapses"]

        if (render.selectable) {
            // assign color id
            render.color_id = m_util.gen_color_id(_color_id_counter);
            _color_id_counter++;
        }

        prepare_vertex_anim(bpy_obj, obj);
        prepare_shape_keys(bpy_obj, obj);

        render.shadow_cast = bpy_obj["b4w_shadow_cast"];
        render.shadow_receive = bpy_obj["b4w_shadow_receive"];
        render.shadow_cast_only = bpy_obj["b4w_shadow_cast_only"]
                && render.shadow_cast;

        render.reflexible = bpy_obj["b4w_reflexible"];
        render.reflexible_only = bpy_obj["b4w_reflexible_only"]
                                 && render.reflexible;
        render.reflective = bpy_obj["b4w_reflective"];
        render.reflection_type = bpy_obj["b4w_reflection_type"];

        // HACK: forcing cube reflections for cycles mats with bsdf_glossy
        if (!render.reflective)
            update_bsdf_glossy_reflections(bpy_obj, render);

        render.caustics = bpy_obj["b4w_caustics"];

        render.wind_bending = bpy_obj["b4w_wind_bending"];
        // improves batching
        if (bpy_obj["b4w_wind_bending"]) {
            render.wind_bending_angle = bpy_obj["b4w_wind_bending_angle"];
            var amp = m_batch.wb_angle_to_amp(m_util.deg_to_rad(
                    bpy_obj["b4w_wind_bending_angle"]),
                    render.bb_original, bpy_obj["scale"][0]);
            render.wind_bending_amp = amp;
            render.wind_bending_freq   = bpy_obj["b4w_wind_bending_freq"];
            render.detail_bending_freq = bpy_obj["b4w_detail_bending_freq"];
            render.detail_bending_amp  = bpy_obj["b4w_detail_bending_amp"];
            render.branch_bending_amp  = bpy_obj["b4w_branch_bending_amp"]; 

            render.main_bend_col = bpy_obj["b4w_main_bend_stiffness_col"];
            var bnd_st = bpy_obj["b4w_detail_bend_colors"];
            render.detail_bend_col.leaves_stiffness = bnd_st["leaves_stiffness_col"];
            render.detail_bend_col.leaves_phase = bnd_st["leaves_phase_col"];
            render.detail_bend_col.overall_stiffness = bnd_st["overall_stiffness_col"];
        }
       
        render.dynamic_geometry = bpy_obj["b4w_dynamic_geometry"];

        // for material inheritance
        if (render.dynamic_geometry) {
            obj._bpy_obj = bpy_obj;

            for (var i = 0; i < bpy_obj["data"]["materials"].length; i++) {
                var bpy_mat = bpy_obj["data"]["materials"][i];
                obj.mat_inheritance_data.original_mat_names.push(bpy_mat["name"]);
                obj.mat_inheritance_data.bpy_materials.push(bpy_mat);
                obj.mat_inheritance_data.is_disabled.push(false);
            }
        }

        // assign params for object (bounding) physics simulation
        // it seems BGE uses first material to get physics param
        var first_mat = first_mesh_material(bpy_obj);
        render.friction = first_mat["physics"]["friction"];
        render.elasticity = first_mat["physics"]["elasticity"];

        render.lod_dist_min = 0;
        render.lod_dist_max = m_obj_util.LOD_DIST_MAX_INFINITY;

        render.pass_index = bpy_obj["pass_index"];
        break;

    case "LINE":
        render.bb_local = m_bounds.create_bb();
        render.be_local = m_bounds.create_be();
        render.bb_world = m_bounds.create_bb();
        render.be_world = m_bounds.create_be();
        break;

    case "CAMERA":
        m_cam.camera_object_to_camera(bpy_obj, obj);
        m_cam.assign_boundings(obj);
        break;

    case "LAMP":
        m_lights.lamp_to_light(bpy_obj, obj);
        break;

    case "SPEAKER":
        // SPEAKER object is attached only to the one(main) scene anyway
        obj.sfx = m_sfx.create_sfx();
        var is_enabled = false;
        for (var i = 0; i < obj.scenes_data.length; i++)
            if (obj.scenes_data[i].scene._sfx) {
                is_enabled = true;
                break;
            }

        if (is_enabled)
            m_sfx.update_object(bpy_obj, obj);

        break;

    case "EMPTY":
        // NOTE: center = 1/2 height
        var bb = m_bounds.create_bb();
        render.bb_local = bb;

        var bs = m_bounds.create_bs();
        render.bs_local = bs;

        if (bpy_obj["field"])
            obj.field = {
                type: bpy_obj["field"]["type"],
                strength: bpy_obj["field"]["strength"]
            }

        if (bpy_obj["b4w_anchor"])
            obj.anchor = {
                type: bpy_obj["b4w_anchor"]["type"],
                detect_visibility: bpy_obj["b4w_anchor"]["detect_visibility"],
                element_id: bpy_obj["b4w_anchor"]["element_id"],
                max_width: bpy_obj["b4w_anchor"]["max_width"]
            }
        break;

    default:
        break;
    }

    objects_storage_add(obj);
}

function update_bsdf_glossy_reflections(bpy_obj, render) {
    var materials = bpy_obj["data"]["materials"];

    for (var i = 0; i < materials.length; i++) {
        var mat = materials[i];
        if (mat["use_nodes"] && (check_bsdf_type(mat["node_tree"], "BSDF_GLOSSY") || check_bsdf_type(mat["node_tree"], "BSDF_DIFFUSE"))) {
            render.reflective = true;
            render.reflection_type = "CUBE";
        }
    }
}

function check_bsdf_type(node_tree, bsdf_type) {
    if (node_tree._bsdf_types.indexOf(bsdf_type) != -1)
        return true;
    else
        return false;
}

/**
 * Update world: updates b4w world object from bpy world.
 */
exports.update_world = function(bpy_world, world) {
    world.uuid = bpy_world["uuid"];
    world.is_meta = false;

    world.def_action_slots = bpy_world._def_action_slots;
    world.is_dynamic = bpy_world._is_dynamic;

    var render_type = world.type;
    world.render = m_obj_util.create_render(render_type);

    world.use_default_animation = bpy_world["b4w_use_default_animation"];
    world.anim_behavior_def = m_anim.anim_behavior_bpy_b4w(bpy_world["b4w_anim_behavior"]);

    objects_storage_add(world);
}

exports.update_object_relations = function(bpy_obj, obj) {
    var render = obj.render;

    if (obj.type == "MESH") {

        // apply pose if any
        var bpy_armobj = m_anim.get_bpy_armobj(bpy_obj);
        if (bpy_armobj) {

            var armobj = bpy_armobj._object;
            var amr_pose_data = armobj.render.pose_data;

            prepare_skinning_info(bpy_obj, obj, armobj);
            var pose_data = m_anim.extract_skinned_pose_data(
                                        amr_pose_data.trans,
                                        amr_pose_data.quats,
                                        render.bone_skinning_info);

            if (bpy_armobj["b4w_animation_mixing"]) {
                render.quats_before = new Float32Array(pose_data.quats);
                render.quats_after  = new Float32Array(pose_data.quats);
                render.trans_before = new Float32Array(pose_data.trans);
                render.trans_after  = new Float32Array(pose_data.trans);
            } else {
                render.quats_before = pose_data.quats;
                render.quats_after  = pose_data.quats;
                render.trans_before = pose_data.trans;
                render.trans_after  = pose_data.trans;
            }

            render.arm_rel_trans = new Float32Array(4);
            render.arm_rel_quat = m_quat.create();
            render.pose_data = pose_data;
            render.frame_factor = 0;
        }
        if (render.reflective)
            attach_reflection_data(bpy_obj, obj);
    }
}

exports.update_force = update_force;
function update_force(obj) {
    if (obj.field) {
        var scenes_data = obj.scenes_data;
        for (var i = 0; i < scenes_data.length; i++) {
            var scene = scenes_data[i].scene;
            m_scenes.update_force_scene(scene, obj);
        }
    }
}

function attach_reflection_data(bpy_obj, obj) {
    var render = obj.render;

    if (render.reflection_type == "CUBE")
        render.cube_reflection_id = _cube_refl_counter++;
    else if (render.reflection_type == "PLANE") {

        var refl_plane_obj = get_reflection_plane_obj(bpy_obj, obj);

        if (!refl_plane_obj)
            refl_plane_obj = create_default_refl_plane(obj);
        
        var refl_plane_id = null;
        for (var i = 0; i < _refl_plane_objs.length; i++) {
            var rp = _refl_plane_objs[i];
            if (rp == refl_plane_obj) {
                 refl_plane_id = i;
                 break;
            }
        }

        if (refl_plane_id == null) {
            // we need only unique reflection planes
            refl_plane_id = _refl_plane_objs.length;
            _refl_plane_objs.push(refl_plane_obj);
        }

        refl_plane_obj.render.plane_reflection_id = refl_plane_id;
        render.plane_reflection_id = refl_plane_id;
        refl_plane_obj.reflective_objs.push(obj);
    }
}

function create_default_refl_plane(obj) {
    var unique_name = m_util.unique_name("%reflection%");
    var reflection_plane = m_obj_util.create_object(unique_name, "EMPTY");

    var render = m_obj_util.create_render("EMPTY");
    reflection_plane.render = render;
    copy_scene_data(obj, reflection_plane);
    m_cons.append_stiff_obj(reflection_plane, obj, [0, 0, 0], null, 1);

    objects_storage_add(reflection_plane);
    return reflection_plane;
}

function get_reflection_plane_obj(bpy_obj, obj) {
    var constraints = bpy_obj["constraints"];
    for (var i = 0; i < constraints.length; i++) {
        var cons = constraints[i];
        if (cons["type"] == "LOCKED_TRACK" && cons.name == "REFLECTION PLANE") {
            if (cons["target"] && cons["target"]._object)
                return cons["target"]._object;
            else
                m_print.warn("Reflection plane target for object: \"" + obj.name +
                    "\" is not present on the scene. Using object's Z-axis.");
        }
    }
    return null;
}

exports.copy_scene_data = copy_scene_data;
function copy_scene_data(from_obj, to_obj) {
    var from_data = from_obj.scenes_data;
    var to_data = to_obj.scenes_data;

    for (var i = 0; i < from_data.length; i++) {
        var is_already_attached = false;
        for (var j = 0; j < to_data.length; j++) {
            if (from_data[i].scene == to_data[j].scene) {
                is_already_attached = true;
                break;
            }
        }

        if (!is_already_attached)
            // filter unwanted objects
            if (check_bpy_obj_scene_compatibility(to_obj, from_data[i].scene))
                m_obj_util.append_scene_data(to_obj, from_data[i].scene);
    }
}

exports.check_bpy_obj_scene_compatibility = check_bpy_obj_scene_compatibility;
function check_bpy_obj_scene_compatibility(bpy_obj, bpy_scene) {
    // SPEAKERs on secondary(rtt) scenes aren't allowed
    if (!bpy_scene._is_main && bpy_obj["type"] == "SPEAKER")
        return false;

    // LAMPs aren't allowed if they are from secondary(dynamically loaded) data
    if (!bpy_scene._is_primary_thread && bpy_obj["type"] == "LAMP")
        return false;

    return true;
}

exports.update_objects_dynamics = function(objects) {
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];

        if (obj.render && (obj.render.type == "DYNAMIC" ||
                obj.render.type == "CAMERA"))
            m_trans.update_transform(obj);

        // try to use default animation
        // TODO: remove default animation during nla setup
        if (obj.use_default_animation && m_anim.obj_is_animatable(obj)) {
            m_anim.apply_def(obj);
            if (obj.anim_slots.length)
                m_anim.play(obj, null, m_anim.SLOT_ALL);
        }
    }
}

exports.bpy_obj_is_dynamic = function(bpy_obj) {

    // NOTE: need hierarhical objects structure here
    if (bpy_obj["b4w_hidden_on_load"])
        return true;
    if (bpy_obj["dg_parent"] && bpy_obj["dg_parent"]._is_dynamic)
        return true;
    if (bpy_obj["parent"] && bpy_obj["parent"]._is_dynamic)
        return true;

    switch (bpy_obj["type"]) {
    case "MESH":
        return bpy_mesh_is_dynamic(bpy_obj);
        break;
    case "EMPTY":
        return bpy_empty_is_dynamic(bpy_obj);
        break;
    default:
        return true;
        break;
    }
}

function bpy_mesh_is_dynamic(bpy_obj) {
    var is_animated = m_anim.bpy_mesh_empty_is_animatable(bpy_obj);
    var has_do_not_batch = bpy_obj["b4w_do_not_batch"];
    var is_collision = bpy_obj["b4w_collision"];
    var is_vehicle_part = bpy_obj["b4w_vehicle"];
    var is_floater_part = bpy_obj["b4w_floating"];
    var is_character = bpy_obj["b4w_character"];
    var dyn_grass_emitter = m_particles.has_dynamic_grass_particles(bpy_obj);
    var has_nla = m_nla.bpy_obj_has_nla(bpy_obj);
    var has_shape_keys = bpy_obj["data"]["b4w_shape_keys"].length > 0;
    var has_dynamic_geometry = bpy_obj["b4w_dynamic_geometry"];

    var has_dynamic_target = check_dynamic_target(bpy_obj);
    return DEBUG_DISABLE_STATIC_OBJS || is_animated || has_do_not_batch
            || is_collision || is_vehicle_part || has_shape_keys
            || is_floater_part || dyn_grass_emitter || is_character
            || has_nla || has_dynamic_geometry || has_dynamic_mat(bpy_obj)
            || has_dynamic_target;
}

function check_dynamic_target(bpy_obj) {
    // NOTE: currently we support only one constraint for object
    var is_dynamic = false;
    var len = bpy_obj["constraints"].length;
    if (len) {
        var last_constraint = null;
        for (var i = len - 1; i >= 0; i--) {
            var cons = bpy_obj["constraints"][i];
            if (!(cons["type"] == "LOCKED_TRACK" && cons["name"] == "REFLECTION PLANE")) {
                last_constraint = cons;
                break;
            }
        }
        if (!last_constraint)
            return false;
        // NOTE: temporary solution for old JSONs
        if (!last_constraint["target"])
            return false;
        var target = last_constraint["target"];
        var type = target["type"];
        if (target["parent"]) {
            var parent_type = target["parent"]["type"];
            if (parent_type == "MESH")
                is_dynamic = is_dynamic || bpy_mesh_is_dynamic(target["parent"]);
            else if (parent_type == "EMPTY")
                is_dynamic = is_dynamic || bpy_empty_is_dynamic(target["parent"]);
            else
                is_dynamic = true;
            return is_dynamic;
        }
        if (type == "MESH") {
            is_dynamic = is_dynamic || bpy_mesh_is_dynamic(target);
        } else if (type == "EMPTY")
            is_dynamic = is_dynamic || bpy_empty_is_dynamic(target);
        else
            is_dynamic = true;
    }

    return is_dynamic;
}

function bpy_empty_is_dynamic(bpy_obj) {
    var is_animated = m_anim.bpy_mesh_empty_is_animatable(bpy_obj);
    var has_nla = m_nla.bpy_obj_has_nla(bpy_obj);
    var has_do_not_batch = bpy_obj["b4w_do_not_batch"];
    var anchor = Boolean(bpy_obj["b4w_anchor"]);
    var has_dynamic_target = check_dynamic_target(bpy_obj);
    return is_animated || has_nla || has_do_not_batch || anchor
            || has_dynamic_target;
}

function has_dynamic_mat(bpy_obj) {
    var mesh = bpy_obj["data"];

    // lens flares are not strictly required to be dynamic
    // make them so to prevent possible bugs in the future

    // water should be dynamic for convenience
    // This allows dynamically adjusting water params

    for (var i = 0; i < mesh["materials"].length; i++) {
        var mat = mesh["materials"][i];

        if (mat["b4w_water"])
            return true;
        if (mat["b4w_lens_flares"])
            return true;
        if (has_dynamic_nodes(mat["node_tree"]))
            return true;
    }

    return false;
}

function has_dynamic_nodes(node_tree) {
    if (!node_tree)
        return false;

    var nodes = node_tree["nodes"];
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (node["type"] == "VECT_TRANSFORM") {
            var convert_from =  node["convert_from"];
            var convert_to   =  node["convert_to"];
            var output = node["outputs"][0];
            if (output["is_linked"]
                    && !(convert_from == "WORLD" && convert_to == "CAMERA")
                    && !(convert_from == "CAMERA" && convert_to == "WORLD")
                    && !(convert_from == "OBJECT" && convert_to == "OBJECT"))
                return true;
        }
        if (node["type"] == "NORMAL_MAP") {
            var space = node["space"];
            var output = node["outputs"][0];
            if (output["is_linked"] && (space == "OBJECT" || space == "BLENDER_OBJECT"))
                return true;
        }
        if (node["type"] == "TEX_COORD") {
            var obj_output = node["outputs"][3];
            if (obj_output["is_linked"])
                return true;
        }
        if (node["type"] == "OBJECT_INFO") {
            // TODO: change this implementation to the attributes-based model
            var loc_output = node["outputs"][0];
            var obj_ind_output = node["outputs"][1];
            var rand_output = node["outputs"][3];
            if (loc_output["is_linked"] || obj_ind_output["is_linked"] ||
                    rand_output["is_linked"]) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Prepare skinning
 *
 * get info about relations between vertex groups and bones
 * and save to mesh internals for using in buffers generation.
 * Finally mark render to use skinning shaders
 */
function prepare_skinning_info(bpy_obj, obj, armobj) {

    var render = obj.render;
    var mesh = bpy_obj["data"];

    obj.armobj = armobj;

    var vertex_groups = mesh["vertex_groups"];
    if (!vertex_groups.length)
        return;

    var arm_bone_pointers = armobj.render.bone_pointers;
    var deform_bone_index = 0;
    var bone_skinning_info = {};

    // collect deformation bones
    for (var bone_name in arm_bone_pointers) {
        // bone is deform if it has corresponding vertex group
        var vgroup = m_util.keysearch("name", bone_name, vertex_groups);
        if (!vgroup)
            continue;
        var arm_bpointer = arm_bone_pointers[bone_name];

        bone_skinning_info[bone_name] = {vgroup_index: vgroup["index"],
                                         bone_index: arm_bpointer.bone_index,
                                         deform_bone_index: deform_bone_index++};
    }
    render.bone_skinning_info = bone_skinning_info;

    var num_bones = deform_bone_index;

    // will be extended beyond this limit later
    var max_bones = m_anim.get_max_bones();
    render.max_bones = num_bones;

    if (num_bones > 2 * max_bones) {
        render.is_skinning = false;
        m_print.error("too many bones for \"" + bpy_obj["name"] + "\" / " +
                render.max_bones + " bones (max " + max_bones +
                " with blending, " + 2 * max_bones + " without blending)." 
                + " Skinning will be disabled.");
    } else
        render.is_skinning = true;
}

function prepare_shape_keys(bpy_obj, obj) {
    if (bpy_obj["type"] != "MESH")
        m_util.panic("Wrong object type: " + bpy_obj["name"]);

    var render = obj.render;
    if (bpy_obj["data"]["b4w_shape_keys"].length) {
        render.use_shape_keys = true;
        for (var i = 0; i < bpy_obj["data"]["b4w_shape_keys"].length; i++) {
            var key = {};
            key["value"] = bpy_obj["data"]["b4w_shape_keys"][i]["value"];
            key["name"] = bpy_obj["data"]["b4w_shape_keys"][i]["name"];
            render.shape_keys_values.push(key);
        }

    } else
        render.use_shape_keys = false;
}

function first_mesh_material(bpy_obj) {
    if (bpy_obj["type"] !== "MESH")
        m_util.panic("Wrong object");

    return bpy_obj["data"]["materials"][0];
}

exports.get_meta_tags = function(obj) {
    return m_util.clone_object_r(obj.metatags);
}

exports.get_custom_prop = function(obj) {
    return obj.custom_prop;
}

exports.cleanup = function() {
    _color_id_counter = 0;
    _cube_refl_counter = 0;
    _refl_plane_objs.length = 0;
    _outline_anim_objs.length = 0;
    _all_objects = {"ALL":[]};
}

exports.copy = function(obj, name, deep_copy) {
    var new_obj = copy_object(obj, name, deep_copy);
    new_obj.render.is_copied = true;
    new_obj.render.is_copied_deep = deep_copy;
    new_obj.render.color_id = m_util.gen_color_id(_color_id_counter);
    _color_id_counter++;

    return new_obj;
}

function get_name_suff_unique(name) {
    if (get_object_by_name(name, _all_objects["ALL"], false, DATA_ID_ALL)) {
        var i = 1;
        var num;
        while (true) {
            num = "." + (String(i).length < 3 ? ("000" + String(i)).slice(-3) : String(i));
            if(!get_object_by_name(name + num, _all_objects["ALL"], false,
                    DATA_ID_ALL))
                break;
            i++;
        }

        m_print.error("Object \"" + name + "\" already exists. "
                + "Name was replaced by \"" + name + num + "\".");
        return num;
    }

    return "";
}

function copy_object(obj, new_name, deep_copy) {

    var origin_name = new_name;
    var dg_parent = m_obj_util.get_dg_parent(obj);
    var name = dg_parent ? m_obj_util.gen_dupli_name(dg_parent.name, new_name) : new_name;

    var suff = get_name_suff_unique(name);
    name += suff;
    origin_name += suff;

    var new_obj = m_obj_util.create_object(name, obj.type, origin_name);

    new_obj.is_meta = obj.is_meta;

    // by link
    new_obj._bpy_obj = obj._bpy_obj;

    new_obj.mat_inheritance_data.original_mat_names 
            = m_obj_util.copy_bpy_object_props_by_link(obj.mat_inheritance_data.original_mat_names);
    new_obj.mat_inheritance_data.bpy_materials 
            = m_obj_util.copy_bpy_object_props_by_link(obj.mat_inheritance_data.bpy_materials);
    new_obj.mat_inheritance_data.is_disabled 
            = m_obj_util.copy_bpy_object_props_by_link(obj.mat_inheritance_data.is_disabled); 
    
    // NOTE: not all props are needed or supported for the copied object
    new_obj.is_dynamic = obj.is_dynamic;
    new_obj.is_hair_dupli = obj.is_hair_dupli;
    new_obj.use_default_animation = obj.use_default_animation;
    new_obj.def_action_slots = obj.def_action_slots;

    new_obj.render = m_obj_util.clone_render(obj.render);

    // do not preserve LOD functionality for copied objects
    new_obj.render.is_lod = false;

    new_obj.metatags = m_obj_util.copy_object_props_by_value(obj.metatags);
    new_obj.custom_prop = m_obj_util.copy_object_props_by_value(obj.custom_prop);

    copy_scene_data(obj, new_obj);
    new_obj.action_anim_cache = m_obj_util.copy_bpy_object_props_by_link(obj.action_anim_cache);
    
    new_obj.parent = m_obj_util.copy_bpy_object_props_by_link(obj.parent);
    new_obj.parent_is_dupli = obj.parent_is_dupli;
    new_obj.parent_bone = obj.parent_bone;

    new_obj.vertex_anim = m_obj_util.copy_bpy_object_props_by_link(obj.vertex_anim);
    new_obj.anim_behavior_def = obj.anim_behavior_def;

    // copied object can't be a vehicle, floater or character
    if (obj.physics && !(obj.is_vehicle || obj.is_character 
            || obj.is_floating)) {
        new_obj.use_obj_physics = obj.use_obj_physics;
        // NOTE: physics will be added later
        new_obj.physics = null;
    }

    new_obj.collision_id = obj.collision_id;
    new_obj.correct_bounding_offset = obj.correct_bounding_offset;

    new_obj.physics_settings =
            m_obj_util.copy_object_props_by_value(obj.physics_settings);

    copy_batches(obj, new_obj, deep_copy);

    // disable scene data for the new obj until appending it to the scene
    m_obj_util.scene_data_set_active(new_obj, false);

    objects_storage_add(new_obj);

    return new_obj;
}

function copy_batches(obj, new_obj, deep_copy) {
    var bpy_bufs_data = [];
    for (var i = 0; i < obj.scenes_data.length; i++) {

        var sc_data = obj.scenes_data[i];
        var new_sc_data = new_obj.scenes_data[i];

        var batches = sc_data.batches;

        if (deep_copy) {
            var new_batches = new_sc_data.batches;
            for (var j = 0; j < batches.length; j++)
                if (!batches[j].forked_batch) {
                    var new_batch = m_obj_util.copy_object_props_by_value(batches[j]);
                    new_batch.bufs_data = m_geom.clone_bufs_data(batches[j].bufs_data);
                    m_obj_util.append_batch(new_obj, new_sc_data.scene, new_batch);
                    bpy_bufs_data.push(batches[j].bufs_data);
                }

            for (var j = 0; j < batches.length; j++)
                if (batches[j].forked_batch) {
                    var new_forked_batch = m_obj_util.copy_object_props_by_value(batches[j]);
                    m_obj_util.append_batch(new_obj, new_sc_data.scene, new_forked_batch);
                    for (var k = 0; k < bpy_bufs_data.length; k++)
                        if (bpy_bufs_data[k] == batches[j].bufs_data)
                            new_forked_batch.bufs_data = new_batches[k].bufs_data;
                }

            for (var j = 0; j < new_batches.length; j++) {
                if (new_batches[j].bufs_data)
                    m_geom.update_gl_buffers(new_batches[j].bufs_data);

                if (cfg_def.allow_vao_ext && new_batches[j].bufs_data)
                    m_render.assign_vao(new_batches[j]);

                // to create unique batch ID
                new_batches[j].odd_id_prop = m_batch.generate_odd_id(
                        new_batches[j], new_obj.render, new_obj.uuid);
                m_batch.update_batch_id(new_batches[j]);
            }

            m_tex.share_batch_canvas_textures(new_batches);
        } else
            for (var j = 0; j < batches.length; j++)
                m_obj_util.append_batch(new_obj, new_sc_data.scene, batches[j]);
    }
}

function prepare_physics_settings(bpy_obj, obj) {

    obj.is_vehicle = bpy_obj["b4w_vehicle"];
    obj.is_character = bpy_obj["b4w_character"];
    obj.is_floating = bpy_obj["b4w_floating"];
    obj.use_obj_physics = bpy_obj["b4w_collision"];
    obj.collision_id = bpy_obj["b4w_collision_id"];
    obj.correct_bounding_offset = bpy_obj["b4w_correct_bounding_offset"];

    var game = bpy_obj["game"];

    obj.physics_settings = {
        physics_type:           game["physics_type"],
        use_ghost:              game["use_ghost"],
        use_sleep:              game["use_sleep"],
        mass:                   game["mass"],
        velocity_min:           game["velocity_min"],
        velocity_max:           game["velocity_max"],
        damping:                game["damping"],
        rotation_damping:       game["rotation_damping"],
        lock_location_x:        game["lock_location_x"],
        lock_location_y:        game["lock_location_y"],
        lock_location_z:        game["lock_location_z"],
        lock_rotation_x:        game["lock_rotation_x"],
        lock_rotation_y:        game["lock_rotation_y"],
        lock_rotation_z:        game["lock_rotation_z"],
        collision_margin:       game["collision_margin"],
        collision_group:        game["collision_group"],
        collision_mask:         game["collision_mask"],
        use_collision_bounds:   game["use_collision_bounds"],
        collision_bounds_type:  game["collision_bounds_type"],
        use_collision_compound: game["use_collision_compound"]
    }

    var vs = bpy_obj["b4w_vehicle_settings"];
    if (vs)
        obj.vehicle_settings = {
            name: vs["name"],
            part: vs["part"],
            suspension_rest_length: vs["suspension_rest_length"],
            suspension_compression: vs["suspension_compression"],
            suspension_stiffness: vs["suspension_stiffness"],
            suspension_damping: vs["suspension_damping"],
            wheel_friction: vs["wheel_friction"],
            roll_influence: vs["roll_influence"],
            max_suspension_travel_cm: vs["max_suspension_travel_cm"],
            force_max: vs["force_max"],
            brake_max: vs["brake_max"],
            steering_max: vs["steering_max"],
            max_speed_angle: vs["max_speed_angle"],
            delta_tach_angle: vs["delta_tach_angle"],
            speed_ratio: vs["speed_ratio"],
            steering_ratio: vs["steering_ratio"],
            inverse_control: vs["inverse_control"],
            floating_factor: vs["floating_factor"],
            water_lin_damp: vs["water_lin_damp"],
            water_rot_damp: vs["water_rot_damp"],
            synchronize_position: vs["synchronize_position"]
        }

    var fs = bpy_obj["b4w_floating_settings"];
    if (fs) 
        obj.floating_settings = {
            name: fs["name"],
            part: fs["part"],
            floating_factor: fs["floating_factor"],
            water_lin_damp: fs["water_lin_damp"],
            water_rot_damp: fs["water_rot_damp"],
            synchronize_position: fs["synchronize_position"]
        }

    var cs = bpy_obj["b4w_character_settings"];
    if (cs)
        obj.character_settings = {
            walk_speed: cs["walk_speed"],
            run_speed: cs["run_speed"],
            step_height: cs["step_height"],
            jump_strength: cs["jump_strength"],
            waterline: cs["waterline"]
        }

    for (var i = 0; i < bpy_obj["constraints"].length; i++) {
        var cons = bpy_obj["constraints"][i];

        if (cons["type"] != "RIGID_BODY_JOINT")
            continue;

        obj.physics_constraints.push({
            target:              cons["target"]._object,
            pivot_type:          cons["pivot_type"],
            pivot_x:             cons["pivot_x"],
            pivot_y:             cons["pivot_y"],
            pivot_z:             cons["pivot_z"],
            axis_x:              cons["axis_x"],
            axis_y:              cons["axis_y"],
            axis_z:              cons["axis_z"],
            use_limit_x:         cons["use_limit_x"],
            use_limit_y:         cons["use_limit_y"],
            use_limit_z:         cons["use_limit_z"],
            use_angular_limit_x: cons["use_angular_limit_x"],
            use_angular_limit_y: cons["use_angular_limit_y"],
            use_angular_limit_z: cons["use_angular_limit_z"],
            limit_max_x:         cons["limit_max_x"],
            limit_max_y:         cons["limit_max_y"],
            limit_max_z:         cons["limit_max_z"],
            limit_min_x:         cons["limit_min_x"],
            limit_min_y:         cons["limit_min_y"],
            limit_min_z:         cons["limit_min_z"],
            limit_angle_max_x:   cons["limit_angle_max_x"],
            limit_angle_max_y:   cons["limit_angle_max_y"],
            limit_angle_max_z:   cons["limit_angle_max_z"],
            limit_angle_min_x:   cons["limit_angle_min_x"],
            limit_angle_min_y:   cons["limit_angle_min_y"],
            limit_angle_min_z:   cons["limit_angle_min_z"]
        });
    }
}

exports.get_bpy_def_action_slots = function(bpy_obj, is_world) {
    var def_action_slots = [];

    var obj_anim_data = bpy_obj["animation_data"];
    var data_anim_data = bpy_obj["data"] ? bpy_obj["data"]["animation_data"] : null;

    if (obj_anim_data && obj_anim_data["action"]) {
        var action = obj_anim_data["action"];

        if (action._render.type == m_anim.OBJ_ANIM_TYPE_OBJECT ||
                action._render.type == m_anim.OBJ_ANIM_TYPE_ARMATURE && bpy_obj["type"] == "ARMATURE" ||
                action._render.type == m_anim.OBJ_ANIM_TYPE_LIGHT && bpy_obj["type"] == "LAMP" ||
                action._render.type == m_anim.OBJ_ANIM_TYPE_ENVIRONMENT && is_world)
            def_action_slots.push(m_anim.init_action_slot(null, action));
    }

    if (data_anim_data && data_anim_data["action"] && (bpy_obj["type"] == "SPEAKER"
            || bpy_obj["type"] == "LAMP"))
        def_action_slots.push(m_anim.init_action_slot(null,
                                    data_anim_data["action"]));

    // NOTE: nla material tracks are considered during the nla's object updating
    // and aren't present in the def_action_slots property
    if (bpy_obj["type"] == "MESH")
        def_action_slots.push.apply(def_action_slots,
                m_anim.get_bpy_material_actions(bpy_obj));
    if (is_world)
        def_action_slots.push.apply(def_action_slots,
                m_anim.get_bpy_world_material_actions(bpy_obj));

    return def_action_slots;
}

function prepare_vertex_anim(bpy_obj, obj) {
    for (var i = 0; i < bpy_obj["data"]["b4w_vertex_anim"].length; i++) {
        var va = bpy_obj["data"]["b4w_vertex_anim"][i];
        obj.vertex_anim.push({
            name: va["name"],
            frame_start: va["frame_start"],
            frame_end: va["frame_end"],
            averaging: va["averaging"],
            averaging_interval: va["averaging_interval"],
            allow_nla: va["allow_nla"]
        });
    }

    obj.render.vertex_anim = obj.vertex_anim.length ? true : false;
}

function prepare_parenting_props(bpy_obj, obj) {
    if (bpy_obj["parent"]) {
        obj.parent = bpy_obj["parent"]._object;

        if (bpy_obj["parent_type"] == "BONE" &&
                   bpy_obj["parent"]["type"] == "ARMATURE")
            obj.parent_bone = bpy_obj["parent_bone"];

        if (bpy_obj["pinverse_tsr"]) {
            obj.pinverse_tsr = m_tsr.create();
            m_tsr.copy(bpy_obj["pinverse_tsr"], obj.pinverse_tsr);
        }
    } else if (bpy_obj["dg_parent"]) {
        obj.parent = bpy_obj["dg_parent"]._object;
        obj.parent_is_dupli = true;
    }
}

exports.update_boundings = function(obj) {
    
    var render = obj.render;
    var obj_bb = null;

    //TODO: process all scenes_data
    var batches = obj.scenes_data[0].batches;
    for (var i = 0; i < batches.length; i++) {

        var batch = batches[i];
        var batch_world_bounds = obj.scenes_data[0].batch_world_bounds[i];

        if (!batch.bufs_data || !(batch_world_bounds.be && batch_world_bounds.bb))
            continue;

        var type = m_geom.get_vbo_type_by_attr_name("a_position");
        var vbo_source = m_geom.get_vbo_source_by_type(batch.bufs_data.vbo_source_data, type);
        if (!vbo_source)
            continue;

        var from = batch.bufs_data.pointers["a_position"].offset;
        var to = batch.bufs_data.pointers["a_position"].length + from;
        m_batch.update_local_bounds_from_pos(batch, vbo_source.subarray(from, to));
        m_obj_util.update_world_bounds_from_batch_tsr(batch, render.world_tsr, 
                batch_world_bounds);

        if (batch.type == "MAIN") {
            if (!obj_bb)
                obj_bb = m_bounds.clone_bb(batch.bounds_local.bb);
            else
                m_bounds.expand_bounding_box(obj_bb, batch.bounds_local.bb);
        }
    }

    obj_bb = obj_bb || m_bounds.create_bb();

    if (render.billboard)
        m_obj_util.update_render_bounds_billboard(obj, obj_bb);
    else {
        var pos_buffers = [];
        for (var i = 0; i < batches.length; i++) {
            var batch = batches[i];

            if (batch.type != "MAIN")
                continue;

            var type = m_geom.get_vbo_type_by_attr_name("a_position");
            var vbo_source = m_geom.get_vbo_source_by_type(batch.bufs_data.vbo_source_data, type);
            if (!vbo_source)
                continue;

            var pointers = batches[i].bufs_data.pointers;
            var from = pointers["a_position"].offset;
            var to = pointers["a_position"].length + from;
            pos_buffers.push(vbo_source.subarray(from, to));
        }

        m_obj_util.update_render_bounds_from_pos_arrays(obj, obj_bb, pos_buffers);
    }

    if (cfg_def.debug_view)
        for (var i = 0; i < batches.length; i++) {
            if (batches[i].type === "DEBUG_VIEW" && batches[i].debug_sphere) {
                var be = render.be_local;
                var submesh = m_primitives.generate_uv_sphere(16, 8, 1, be.center,
                        false, false);
                var scale = [be.axis_x[0], be.axis_y[1], be.axis_z[2]];
                m_geom.scale_submesh_xyz(submesh, scale, be.center)
                m_geom.submesh_drop_indices(submesh, 1, true);
                submesh.va_common["a_polyindex"] = m_geom.extract_polyindices(submesh);
                m_batch.update_batch_geometry(batches[i], submesh);
                break;
            }
        }
}

exports.get_scene_objs = get_scene_objs;
function get_scene_objs(scene, type, data_id) {
    var objs_by_type = _all_objects[type] || [];
    var objs = [];
    for (var i = 0; i < objs_by_type.length; i++) {

        var obj = objs_by_type[i];
        if (obj.render.data_id != data_id && data_id != DATA_ID_ALL)
            continue;

        var scenes_data = obj.scenes_data;
        for (var j = 0; j < scenes_data.length; j++) {
            var sc_data = scenes_data[j];
            if (sc_data.scene == scene)
                objs.push(obj);
        }
    }
    return objs;
}

/**
 * Get all objects derived from the source bpy objects on a certain scene.
 */
exports.get_scene_objs_derived = function(scene, type, data_id) {
    var objs_by_type = _all_objects[type] || [];
    var objs = [];
    for (var i = 0; i < objs_by_type.length; i++) {
        var obj = objs_by_type[i];
        if (obj.render.data_id != data_id && data_id != DATA_ID_ALL || obj.is_meta)
            continue;

        var scenes_data = obj.scenes_data;
        for (var j = 0; j < scenes_data.length; j++) {
            var sc_data = scenes_data[j];
            if (sc_data.scene == scene)
                objs.push(obj);
        }
    }
    return objs;
}

exports.get_all_objects = get_all_objects;
function get_all_objects(type, data_id) {
    var all_objs = _all_objects[type] || [];
    if (data_id == DATA_ID_ALL)
        return all_objs;

    var objs = [];
    for (var i = 0; i < all_objs.length; i++) {
        var obj = all_objs[i];
        if (obj.render.data_id == data_id)
            objs.push(obj);
    }
    return objs;
}

exports.get_first_character = function(scene) {

    var mesh_objs = _all_objects["MESH"];
    if (mesh_objs)
        for (var i = 0; i < mesh_objs.length; i++) {
            var obj = mesh_objs[i];

            if (!m_phy.has_character_physics(obj))
                continue;

            var scenes_data = obj.scenes_data;

            for (var j = 0; j < scenes_data.length; j++) {
                var sc_data = scenes_data[j];
                if (sc_data.scene == scene)
                    return obj;
            }
        }

    return null;
}

exports.obj_switch_cleanup_flags = obj_switch_cleanup_flags;
function obj_switch_cleanup_flags(obj, cleanup_bufs, cleanup_shader, cleanup_nodemat) {
    for (var i = 0; i < obj.scenes_data.length; i++) {
        var batches = obj.scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++) {
            var batch = batches[j];

            // ibo/vbo buffs
            if (batch.bufs_data)
                batch.bufs_data.cleanup_gl_data_on_unload = cleanup_bufs;

            // vao batch
            batch.cleanup_gl_data_on_unload = cleanup_bufs;

            // shader
            if (batch.shader)
                batch.shader.cleanup_gl_data_on_unload = cleanup_shader;

            // nodemat graph
            if (batch.ngraph_proxy_id !== "") {
                var ngraph_proxy = m_nodemat.get_ngraph_proxy_cached(batch.ngraph_proxy_id);
                if (ngraph_proxy)
                    ngraph_proxy.cleanup_on_unload = cleanup_nodemat
            }
        }
    }
}

exports.get_selectable_objects = function() {
    var sel_objects = [];
    var objects = _all_objects["MESH"];
    if (objects)
        for (var i = 0; i < objects.length; i++) {
            var obj = objects[i];
            if (obj.render.selectable && !obj.is_meta)
                sel_objects.push(obj);
        }
    return sel_objects;
}

exports.get_outlining_objects = function() {
    var outlining_objects = [];
    var objects = _all_objects["MESH"];
    if (objects)
        for (var i = 0; i < objects.length; i++) {
            var obj = objects[i];
            if (obj.render.outlining && !obj.is_meta)
                outlining_objects.push(obj);
        }
    return outlining_objects;
}

exports.get_object = function() {
    var obj_found = null;
    var objs = _all_objects["ALL"];

    // NOTE: filter meta is needed only for get_object_by_name, the others with 
    // the parenting relations already don't work for meta objects
    switch (arguments[0]) {
    case exports.GET_OBJECT_BY_NAME:
        obj_found = get_object_by_name(arguments[1], objs, true, arguments[2], 
                arguments[3]);
        break;
    case exports.GET_OBJECT_BY_DUPLI_NAME:
        obj_found = get_object_by_dupli_name(arguments[1], arguments[2], objs,
                arguments[3]);
        break;
    case exports.GET_OBJECT_BY_DUPLI_NAME_LIST:
        obj_found = get_object_by_dupli_name_list(arguments[1], objs, 
                arguments[2]);
        break;
    default:
        break;
    }

    return obj_found;
}

function get_object_by_name(name, objects, use_origin_name, data_id, filter_meta) {
    var obj_found = null;

    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        var obj_name = (use_origin_name) ? obj.origin_name : obj.name;
        if (obj_name == name && (obj.render.data_id == data_id 
                || data_id == DATA_ID_ALL) && (!filter_meta || !obj.is_meta)) {
            obj_found = obj;

            // NOTE: prefer non-duplicated object
            if (!m_obj_util.get_dg_parent(obj_found))
                break;
        }
    }

    return obj_found;
}

function get_object_by_dupli_name(empty_name, dupli_name, objects, data_id) {
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        if (obj.origin_name == dupli_name && (obj.render.data_id == data_id 
                || data_id == DATA_ID_ALL)) {
            var dg_parent = m_obj_util.get_dg_parent(obj);
            if (dg_parent && dg_parent.origin_name == empty_name)
                return obj;
        }
    }

    return null;
}

function get_object_by_dupli_name_list(name_list, objects, data_id) {
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        
        var j = name_list.length - 1;
        var curr_obj = obj;
        var is_valid = true;
        while (j >= 0 && is_valid) {
            is_valid = curr_obj && (curr_obj.origin_name == name_list[j] 
                    && (curr_obj.render.data_id == data_id || data_id == DATA_ID_ALL));
            if (curr_obj)
                curr_obj = m_obj_util.get_dg_parent(curr_obj);
            j--;
        }

        // successfully iterated over the whole list && the object doesn't have further hierarchy
        if (is_valid && !curr_obj)
            return obj;
    }
    return null;
}

exports.get_world_by_name = function (name, data_id) {
    var full_name = "%meta_world%" + name;
    var wrds = _all_objects["WORLD"];
    return get_object_by_name(full_name, wrds, true, data_id);
}

exports.get_world_name = function(world_obj) {
    return world_obj.origin_name.replace("%meta_world%", "");
}

function update_obj_outline_intensity(obj, timeline) {
    var outline_intensity = 0;
    var oa = obj.outline_animation;
    if (oa.time_start == 0)
        oa.time_start = timeline;

    var dt = timeline - oa.time_start;
    if (oa.relapses && dt / oa.period >= oa.relapses) {
        clear_outline_anim(obj);
        return;
    }

    var periodic_time = dt % oa.period;
    if (periodic_time < oa.outline_time) {
        var outline_time = periodic_time / (oa.outline_time / 5);
        var stage = Math.floor(outline_time);

        switch (stage) {
        case 0:
            outline_intensity = (outline_time - stage) / 2;
            break;
        case 1:
            outline_intensity = (outline_time - stage) / 2 + 0.5;
            break;
        case 2:
            outline_intensity = 1;
            break;
        case 3:
            outline_intensity = 1 - (outline_time - stage) / 2;
            break;
        case 4:
            outline_intensity = 0.5 - (outline_time - stage) / 2;
            break;
        }
    }
    obj.render.outline_intensity = outline_intensity;
}

exports.pick_object = function(canvas_x, canvas_y) {

    var main_scene = m_scenes.get_main();
    if (!main_scene) {
        m_print.error("No active scene");
        return null;
    }

    var subs_stereo = m_scenes.get_subs(main_scene, m_subs.STEREO);
    if (subs_stereo)
        if (subs_stereo.enable_hmd_stereo) {
            var canvas = m_cont.get_canvas();
            canvas_x = canvas.clientHeight / 2;
            canvas_y = canvas.clientWidth / 2;
        }

    var anchor = m_anchors.pick_anchor(canvas_x, canvas_y);

    if (anchor)
        return anchor;

    var color = m_scenes.pick_color(main_scene, canvas_x, canvas_y);

    if (!color)
        return null;

    // find objects having the same color
    var sobjs = get_scene_objs(main_scene, "MESH", DATA_ID_ALL);
    for (var i = 0; i < sobjs.length; i++) {
        var render = sobjs[i].render;
        var color_id = render.color_id;
        if (color_id) {
            if (Math.abs(255 * color_id[0] - color[0]) < COLOR_ID_THRESHOLD &&
                    Math.abs(255 * color_id[1] - color[1]) < COLOR_ID_THRESHOLD &&
                    Math.abs(255 * color_id[2] - color[2]) < COLOR_ID_THRESHOLD) {

                if (render.outlining && render.outline_on_select) {
                    if (cfg_out.outlining_overview_mode)
                        exports.apply_outline_anim(sobjs[i], cfg_out.outline_duration,
                                cfg_out.outline_period, cfg_out.outline_relapses);
                    else {
                        var oa_set = render.outline_anim_settings_default;
                        exports.apply_outline_anim(sobjs[i], oa_set.outline_duration,
                                oa_set.outline_period, oa_set.outline_relapses);
                    }
                }
                return sobjs[i];
            }
        }
    }

    return null;
}

exports.set_wind_params = function(scene, wind_params) {

    // TODO: Consider rewriting this method. All 3 axes needed.
    // Wind should be controlled by wind objects transformation.

    // get wind object
    var objs = get_scene_objs(scene, "EMPTY", DATA_ID_ALL);
    for (var i = 0; i < objs.length; i++) {
        var obj = objs[i];
        if (obj.field && obj.field.type === "WIND") {
            var wind_obj = obj;
            break;
        }
    }

    if (!wind_obj) {
        m_print.error("There is no wind on the scene");
        return 0;
    }

    if (typeof wind_params.wind_dir == "number") {
        var angle =  m_util.deg_to_rad(wind_params.wind_dir);
        m_vec3.set(Math.sin(angle), -Math.cos(angle), 0, _vec3_tmp);
        m_util.dir_to_quat(_vec3_tmp, m_util.AXIS_Z, _quat_tmp);

        m_trans.set_rotation(wind_obj, _quat_tmp);
    }

    if (typeof wind_params.wind_strength == "number") {
        wind_obj.field.strength = wind_params.wind_strength;
    }
    update_force(wind_obj);
}

exports.remove_object = function(obj) {
    if (m_cons.check_constraint(obj))
        m_cons.remove(obj);
    objects_storage_remove(obj);
}

exports.objects_storage_add = objects_storage_add;
function objects_storage_add(obj) {
    _all_objects["ALL"].push(obj);

    if(!_all_objects[obj.type])
        _all_objects[obj.type] = [];

    _all_objects[obj.type].push(obj);

    var plane_refl_id = obj.render.plane_reflection_id;

    if (plane_refl_id != null)
        for (var i = 0; i < _refl_plane_objs.length; i++) {
            var refl_plane = _refl_plane_objs[i];
            if (refl_plane.render.plane_reflection_id == plane_refl_id) {
                refl_plane.reflective_objs.push(obj);
            }
        }
}

function objects_storage_remove(obj) {
    var all_objs = _all_objects["ALL"];
    var typed_objs = _all_objects[obj.type];
    var ind_all = all_objs.indexOf(obj);
    var ind_typed = typed_objs.indexOf(obj);

    if (ind_all != -1)
        all_objs.splice(ind_all, 1);
    if (ind_typed != -1)
        typed_objs.splice(ind_typed, 1);
}

exports.objects_storage_check = function(obj) {
    return _all_objects[obj.type] && _all_objects[obj.type].indexOf(obj) > -1;
}

exports.update_lod_scene = function(lod_obj, scene) {
    var render = lod_obj.render;
    if (render.is_lod)
        init_obj_lod_settings(lod_obj, scene);
}

/**
 * uses _vec3_tmp
 * @returns {boolean} Is LOD visible or not.
 */
exports.update_lod_visibility = update_lod_visibility;
function update_lod_visibility(batch, obj_render, eye) {
    // NOTE: accessing elements from a TypedArray in this function can lead to a 
    // serious performance drop in Chrome - may be a bug or an unclear 
    // deoptimization in V8

    if (!obj_render.is_lod)
        return true;

    var lod_set = batch.lod_settings;

    if (lod_set.dest_coverage != lod_set.coverage) {
        if (lod_set.use_smoothing) {
            var sign = m_util.sign(lod_set.dest_coverage - lod_set.coverage);
            lod_set.coverage += sign * m_time.get_delta() / LOD_TRANSITION_TIME;
            lod_set.coverage = m_util.clamp(lod_set.coverage, 0, 1);
        } else 
            lod_set.coverage = lod_set.dest_coverage;
    }

    if (obj_render.type == "STATIC")
        var center = obj_render.lod_center;
    else {
        // DYNAMIC objects should use bs_world, because it is constantly 
        // updated unlike the lod_center property
        var center = m_vec3.add(obj_render.bs_world.center, 
                obj_render.main_lod_offset, _vec3_tmp);
    }

    var dist = m_vec3.dist(center, eye);
    if (lod_set.hyst_prev_state == 0) {
        var d_min = Math.max(obj_render.lod_dist_min - lod_set.hyst_interval_min / 2, 0);
        var d_max = obj_render.lod_dist_max + lod_set.hyst_interval_max / 2;
    } else if (lod_set.hyst_prev_state == -1) {
        var d_min = obj_render.lod_dist_min + lod_set.hyst_interval_min / 2;
        var d_max = obj_render.lod_dist_max + lod_set.hyst_interval_max / 2;
    } else {
        var d_min = Math.max(obj_render.lod_dist_min - lod_set.hyst_interval_min / 2, 0);
        var d_max = Math.max(obj_render.lod_dist_max - lod_set.hyst_interval_max / 2, 0);
    }

    if (dist < d_min)
        lod_set.hyst_prev_state = -1;
    else if (dist < d_max)
        lod_set.hyst_prev_state = 0;
    else
        lod_set.hyst_prev_state = 1;

    lod_set.dest_coverage = (dist < d_min || dist > d_max) ? 0: 1;
    lod_set.cmp_logic = lod_set.dest_coverage == 0 ? -1: 1;

    if (Math.abs(dist - lod_set.prev_dist) > cfg_def.lod_leap_smooth_threshold 
            && (lod_set.coverage == 0 || lod_set.coverage == 1))
        lod_set.coverage = lod_set.dest_coverage;

    lod_set.prev_dist = dist;

    return lod_set.dest_coverage != 0 || lod_set.coverage != 0;
}

/**
 * uses _vec3_tmp
 */
function init_obj_lod_settings(obj, scene) {
    var obj_render = obj.render;
    var sc_render = scene._render;

    if (obj_render.is_lod) {
        var cam_eye = m_trans.get_translation(scene._camera, _vec3_tmp);
        for (var i = 0; i < obj.scenes_data.length; i++)
            if (obj.scenes_data[i].scene == scene)
                for (var j = 0; j < obj.scenes_data[i].batches.length; j++) {
                    var batch = obj.scenes_data[i].batches[j]
                    var lod_set = batch.lod_settings;

                    if (cfg_def.lod_smooth_transitions) {
                        var sm_type = sc_render.lod_smooth_type;
                        if (sm_type == "ALL" || sm_type == "NON-OPAQUE" 
                                && (batch.blend || batch.alpha_clip))
                            lod_set.use_smoothing = true;
                    }
                    
                    update_lod_visibility(batch, obj_render, cam_eye);
                    lod_set.coverage = lod_set.dest_coverage;

                    // hysteresis interval limit depends on the lengths of the lod levels
                    lod_set.hyst_interval_min = Math.min(sc_render.lod_hyst_interval, 
                            2 * LOD_HYST_INTERVAL_LIMIT_COEFF * obj_render.lod_lower_border_range);
                    lod_set.hyst_interval_max = Math.min(sc_render.lod_hyst_interval, 
                            2 * LOD_HYST_INTERVAL_LIMIT_COEFF * obj_render.lod_upper_border_range);
                }
    }
}

exports.set_hair_particles_wind_bend_params = function(obj) {
    var render = obj.render;
    var amp         = render.wind_bending_amp;
    var main_freq   = render.wind_bending_freq;
    var detail_freq = render.detail_bending_freq;
    var detail_amp  = render.detail_bending_amp;
    var branch_amp  = render.branch_bending_amp;

    var scenes_data = obj.scenes_data;
    for (var i = 0; i < scenes_data.length; i++) {
        var batches = scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++) {
            var batch = batches[j];
            var bufs_data = batch.bufs_data;
            var pointers = bufs_data.pointers;
            var ma_pointer = pointers["au_wind_bending_amp"];
            var mf_pointer = pointers["au_wind_bending_freq"];
            var da_pointer = pointers["au_detail_bending_amp"];
            var df_pointer = pointers["au_detail_bending_freq"];
            var ba_pointer = pointers["au_branch_bending_amp"];

            if (mf_pointer) {
                var data = Array.apply(null, Array(mf_pointer.length)).map(function(){return main_freq});
                m_geom.update_gl_buffer_sub_data(bufs_data, m_geom.VBO_FLOAT, new Float32Array(data), mf_pointer.offset);
            }
            if (ma_pointer) {
                var data = Array.apply(null, Array(ma_pointer.length)).map(function(){return amp});
                m_geom.update_gl_buffer_sub_data(bufs_data, m_geom.VBO_FLOAT, new Float32Array(data), ma_pointer.offset);
            }
            if (da_pointer) {
                var data = Array.apply(null, Array(da_pointer.length)).map(function(){return detail_amp});
                m_geom.update_gl_buffer_sub_data(bufs_data, m_geom.VBO_FLOAT, new Float32Array(data), da_pointer.offset);
            }
            if (df_pointer) {
                var data = Array.apply(null, Array(df_pointer.length)).map(function(){return detail_freq});
                m_geom.update_gl_buffer_sub_data(bufs_data, m_geom.VBO_FLOAT, new Float32Array(data), df_pointer.offset);
            }
            if (ba_pointer) {
                var data = Array.apply(null, Array(ba_pointer.length)).map(function(){return branch_amp});
                m_geom.update_gl_buffer_sub_data(bufs_data, m_geom.VBO_FLOAT, new Float32Array(data), ba_pointer.offset);
            }
        }
    }
}

exports.inherit_material = function(obj_from, mat_from_name, obj_to, mat_to_name) {

    // NOTE: temporary backward compatibility for old unreexported INHERIT_MAT nodes
    if (!obj_from.render.dynamic_geometry || !obj_to.render.dynamic_geometry)
        return;

    // gather some information before inheritance
    var main_batch_from = m_batch.find_batch_material(obj_from, mat_from_name, "MAIN");
    var psys_dict = null;
    var psys_cb = function(batch) {
        if (!psys_dict)
            psys_dict = {}
        if (batch.particles_data)
            psys_dict[batch.particles_data.name] = batch.particles_data;
    }
    m_batch.iterate_batches_by_mat(obj_to, mat_to_name, psys_cb, "PARTICLES");

    // prepare "to" object
    var old_link_to_obj = process_inherit_obj_before(obj_to, mat_to_name);

    // prepare materials 
    var old_bpy_mat_name = process_inherit_bpy_mat_before(obj_from, 
            mat_from_name, obj_to, mat_to_name);

    var curr_active_scene = m_scenes.get_active();
    for (var i = 0; i < obj_to.scenes_data.length; i++) {
        var scene = obj_to.scenes_data[i].scene;
        m_scenes.set_active(scene);

        var lamps = get_scene_objs(scene, "LAMP", 0);
        var existed_batches = obj_to.scenes_data[i].batches;
        obj_to.scenes_data[i].batches = [];
        obj_to.scenes_data[i].batch_world_bounds = [];

        m_batch.generate_main_batches(scene, [obj_to._bpy_obj], lamps, []);
        m_batch.create_forked_batches(obj_to, m_scenes.get_graph(scene), scene);

        m_scenes.assign_scene_data_subs(scene, [obj_to]);
        m_scenes.append_object(scene, obj_to, false, true);

        for (var j = 0; j < existed_batches.length; j++)
            m_obj_util.append_batch(obj_to, scene, existed_batches[j]);
    }

    // revert materials
    process_inherit_bpy_mat_after(obj_from, mat_from_name, obj_to, old_bpy_mat_name);

    // revert "to" object
    process_inherit_obj_after(obj_to, old_link_to_obj);

    recover_batch_state(obj_to, mat_to_name, obj_from, psys_dict, main_batch_from);

    m_scenes.set_active(curr_active_scene);
}

function process_inherit_obj_before(obj_to, mat_to_name) {
    // delete old batches
    obj_switch_cleanup_flags(obj_to, true, false, true);
    var objs = get_all_objects("ALL", DATA_ID_ALL);
    for (var i = 0; i < objs.length; i++) {
        var obj = objs[i];
        if (obj != obj_to)
            obj_switch_cleanup_flags(obj, false, false, false);
    }

    m_scenes.remove_object_bundles(obj_to, mat_to_name);
    for (var i = 0; i < obj_to.scenes_data.length; i++)
        for (var j = obj_to.scenes_data[i].batches.length - 1; j >= 0; j--) {
            var batch = obj_to.scenes_data[i].batches[j];
            if (batch.material_names.length == 0 
                    || batch.material_names.indexOf(mat_to_name) != -1)
                m_obj_util.scene_data_remove_batch(obj_to.scenes_data[i], j);
        }
    if (m_phy.obj_has_physics(obj_to))
        m_phy.remove_object(obj_to);

    for (var i = 0; i < objs.length; i++)
        if (objs[i] != obj_to)
            obj_switch_cleanup_flags(objs[i], true, true, true);

    m_anim.delete_cached_anim_data_by_mat(obj_to, mat_to_name);

    //NOTE: copied objects don't have their bpy objects referenced to them;
    // important for batching
    var old_link_to_obj = obj_to._bpy_obj._object;
    obj_to._bpy_obj._object = obj_to;
    return old_link_to_obj;
}

function process_inherit_obj_after(obj_to, old_link_to_obj) {
    obj_to._bpy_obj._object = old_link_to_obj;
    obj_switch_cleanup_flags(obj_to, true, true, true);
}

function process_inherit_bpy_mat_before(obj_from, mat_from_name, obj_to, mat_to_name) {
    var bpy_mat_from_index = obj_from.mat_inheritance_data.original_mat_names.indexOf(mat_from_name);
    var bpy_mat_to_index = obj_to.mat_inheritance_data.original_mat_names.indexOf(mat_to_name);
    var bpy_mat_from = obj_from.mat_inheritance_data.bpy_materials[bpy_mat_from_index];

    // store a new material for the object
    obj_to.mat_inheritance_data.bpy_materials[bpy_mat_to_index] = bpy_mat_from;

    // NOTE: assign proper name to keep it in batch.material_names
    var old_bpy_mat_name = bpy_mat_from["name"];
    bpy_mat_from["name"] = mat_to_name;

    // NOTE: override materials on bpy object from the object (needed for copied 
    // objects, that reference the same bpy objects), prevent excessive batching 
    // through deleting the corresponding materials
    for (var i = 0; i < obj_to._bpy_obj["data"]["materials"].length; i++) {
        obj_to._bpy_obj["data"]["materials"][i] = obj_to.mat_inheritance_data.bpy_materials[i];
        obj_to.mat_inheritance_data.is_disabled[i] = !(i == bpy_mat_to_index);
    }

    return old_bpy_mat_name;
}

function process_inherit_bpy_mat_after(obj_from, mat_from_name, obj_to, old_bpy_mat_name) {
    // enable all bpy materials
    for (var i = 0; i < obj_to._bpy_obj["data"]["materials"].length; i++)
        obj_to.mat_inheritance_data.is_disabled[i] = false;

    // revert old name of the inherited bpy material
    var bpy_mat_from_index = obj_from.mat_inheritance_data.original_mat_names.indexOf(mat_from_name);
    var bpy_mat_from = obj_from.mat_inheritance_data.bpy_materials[bpy_mat_from_index];
    bpy_mat_from["name"] = old_bpy_mat_name;
}

function recover_batch_state(obj_to, mat_to_name, obj_from, psys_dict, main_batch_from) {

    // update shape keys
    for (var i = 1; i < obj_to.render.shape_keys_values.length; i++) {
        var name = obj_to.render.shape_keys_values[i]["name"];
        var val = obj_to.render.shape_keys_values[i]["value"];
        m_geom.apply_shape_key(obj_to, name, val);
    }

    // update animations
    if (m_anim.is_animated(obj_to))
        for (var i = 0; i < obj_to.anim_slots.length; i++) {
            var slot = obj_to.anim_slots[i];
            if (slot)
                switch (slot.type) {
                // update particle emission animations
                case m_anim.OBJ_ANIM_TYPE_PARTICLES:
                    var frame = m_anim.get_current_frame_float(obj_to, i);
                    m_anim.set_frame(obj_to, frame, i);
                    break;

                // remove old batches from material animations
                case m_anim.OBJ_ANIM_TYPE_MATERIAL:
                    if (slot.node_batches)
                        for (var j = slot.node_batches.length - 1; j >= 0; j--) {
                            var batch = slot.node_batches[j];
                            if (batch.material_names.indexOf(mat_to_name) != -1)
                                slot.node_batches.splice(j, 1);
                        }
                    break;
                }
        }

    // update particles data
    if (psys_dict) {
        var psys_cb = function(batch) {
            if (batch.particles_data) {
                var name = batch.particles_data.name;
                if (psys_dict[name]) {
                    var need_factor_update = batch.particles_data.count_factor 
                            != psys_dict[name].count_factor;

                    batch.particles_data = m_particles.clone_particles_data(psys_dict[name]);

                    if (need_factor_update)
                        m_particles.set_factor(obj_to, name, 
                                batch.particles_data.count_factor);
                }
            }
        }
        m_batch.iterate_batches_by_mat(obj_to, mat_to_name, psys_cb, "PARTICLES");
    }

    // update batch properties, that can be changed via API on the source batch
    if (main_batch_from) {
        var main_batch_to = m_batch.find_batch_material(obj_to, mat_to_name, "MAIN");
        if (main_batch_to) {
            // common stack params
            main_batch_to.diffuse_color.set(main_batch_from.diffuse_color);
            main_batch_to.diffuse_intensity = main_batch_from.diffuse_intensity;
            main_batch_to.diffuse_color_factor = main_batch_from.diffuse_color_factor;
            main_batch_to.diffuse_params.set(main_batch_from.diffuse_params);

            main_batch_to.specular_color.set(main_batch_from.specular_color);
            main_batch_to.specular_color_factor = main_batch_from.specular_color_factor;
            main_batch_to.specular_params.set(main_batch_from.specular_params);
            main_batch_to.specular_alpha = main_batch_from.specular_alpha;

            main_batch_to.emit = main_batch_from.emit;
            main_batch_to.ambient = main_batch_from.ambient;

            main_batch_to.alpha_factor = main_batch_from.alpha_factor;
            main_batch_to.mirror_factor = main_batch_from.mirror_factor;
            main_batch_to.normal_factor = main_batch_from.normal_factor;
            main_batch_to.reflect_factor = main_batch_from.reflect_factor;
            main_batch_to.refr_bump = main_batch_from.refr_bump;
            main_batch_to.fresnel_params.set(main_batch_from.fresnel_params);

            main_batch_to.parallax_scale = main_batch_from.parallax_scale;
            main_batch_to.texture_scale.set(main_batch_from.texture_scale);

            main_batch_to.shallow_water_col.set(main_batch_from.shallow_water_col);
            main_batch_to.shallow_water_col_fac = main_batch_from.shallow_water_col_fac;
            main_batch_to.shore_water_col.set(main_batch_from.shore_water_col);
            main_batch_to.shore_water_col_fac = main_batch_from.shore_water_col_fac;
            main_batch_to.foam_factor = main_batch_from.foam_factor;
            main_batch_to.water_norm_uv_velocity = main_batch_from.water_norm_uv_velocity;

            // Value/RGB nodes
            main_batch_to.node_values = main_batch_from.node_values.slice();
            main_batch_to.node_rgbs = main_batch_from.node_rgbs.slice();
        }
    }

    // transfer possibly changed textures
    var tex_cb = function(batch) {
        for (var i = 0; i < batch.bpy_tex_names.length; i++) {
            var tex_name = batch.bpy_tex_names[i];
            var tex_to = batch.textures[i];

            if (tex_to.source != "IMAGE" && tex_to.source != "ENVIRONMENT")
                continue;

            var tex_from = m_tex.get_texture_by_name(obj_from, tex_name);
            // tex_from can be null if the source object has "do_not_render" flag
            if (!tex_from || tex_to.img_full_filepath == tex_from.img_full_filepath)
                continue;

            m_tex.set_texture_by_name(obj_to, tex_name, tex_from);
        }
    }
    m_batch.iterate_batches_by_mat(obj_to, mat_to_name, tex_cb);
}

// CHECK
exports.create_line = function(name) {
    name = name || "";

    name += get_name_suff_unique(name);

    var line = m_obj_util.create_object(name, "LINE");

    line.render = m_obj_util.create_render("EMPTY");

    line.is_dynamic = true;

    m_batch.generate_line_batches(m_scenes.get_main(), [line]);

    m_scenes.append_object(m_scenes.get_main(), line);

    objects_storage_add(line);

    return line;
}

exports.generate_mesh_render_boundings = function(bpy_obj, obj) {
    var render = obj.render;
    var bb_local = m_bounds.clone_bb(render.bb_original);

    if (render.billboard)
        m_obj_util.update_render_bounds_billboard(obj, bb_local);
    else
        m_obj_util.update_render_bounds_from_bpy(obj, bb_local, 
                bpy_obj["data"]["b4w_boundings"]);
}

exports.set_nodemat_value = function(obj, mat_name, ind, value) {
    var is_world = m_obj_util.is_world(obj);

    for (var i = 0; i < obj.scenes_data.length; i++) {
        var batches = obj.scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++) {
            var batch = batches[j];
            if (!is_world && batch.material_names.indexOf(mat_name) == -1)
                continue;

            batch.node_values[ind] = value;
        }
    }

    if (is_world)
        m_scenes.update_sky_texture(obj);
}

exports.set_nodemat_rgb = function(obj, mat_name, ind, r, g, b) {
    var is_world = m_obj_util.is_world(obj);

    for (var i = 0; i < obj.scenes_data.length; i++) {
        var batches = obj.scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++) {
            var batch = batches[j];
            if (!is_world && batch.material_names.indexOf(mat_name) == -1)
                continue;

            batch.node_rgbs[3 * ind]     = r;
            batch.node_rgbs[3 * ind + 1] = g;
            batch.node_rgbs[3 * ind + 2] = b;
        }
    }

    if (is_world)
        m_scenes.update_sky_texture(obj);
}

exports.get_nodemat_value = function (batch, ind) {
    return batch.node_values[ind];
}

exports.get_nodemat_rgb = function (batch, ind, dest) {
    dest[0] = batch.node_rgbs[3 * ind];
    dest[1] = batch.node_rgbs[3 * ind + 1];
    dest[2] = batch.node_rgbs[3 * ind + 2];
    return dest;
}

exports.get_node_ind_by_name_list = get_node_ind_by_name_list;
function get_node_ind_by_name_list(inds, name_list, prefix_offset) {
    var id = node_id_from_name_list(name_list, prefix_offset);
    for (var i = 0; i < inds.length; i+=2) {
        if (inds[i] == id)
            return inds[i+1];
    }
    return null;
}

function node_id_from_name_list(name_list, prefix_offset) {
    var id = name_list[prefix_offset];
    for (var i = prefix_offset+1; i < name_list.length; i++)
        id += "%join%" + name_list[i];
    return id;
}

}
