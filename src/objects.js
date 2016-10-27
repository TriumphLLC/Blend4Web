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
var m_sfx        = require("__sfx");
var m_trans      = require("__transform");
var m_tex        = require("__textures");
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

var _bb_corners_tmp = new Float32Array(24);

var _color_id_counter = 0;
var _cube_refl_counter = 0;
var _refl_plane_objs = [];
var _outline_anim_objs = [];

var _vec3_tmp = new Float32Array(3);
var _quat4_tmp = new Float32Array(4);

var COLOR_ID_THRESHOLD = 3.0;
var DATA_ID_ALL = -1;

exports.GET_OBJECT_BY_NAME = 0;
exports.GET_OBJECT_BY_DUPLI_NAME = 1;
exports.GET_OBJECT_BY_DUPLI_NAME_LIST = 2;

exports.DATA_ID_ALL = DATA_ID_ALL;

exports.update = function(timeline, elapsed) {
    var armatures = _all_objects["ARMATURE"];

    // update outline objects first (no need for processing among other objs)
    for (var i = 0; i < _outline_anim_objs.length; i++) {
        var obj = _outline_anim_objs[i];
        update_obj_outline_intensity(obj, timeline);
        if (obj.render.outline_intensity)
            request_scenes_outline(obj);
    }

    if (!armatures)
        return;

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
    obj.bpy_origin = true;

    prepare_default_actions(bpy_obj, obj);
    bpy_obj._is_dynamic = obj.is_dynamic = calc_is_dynamic(bpy_obj, obj);
    bpy_obj._is_updated = true;

    prepare_physics_settings(bpy_obj, obj);

    if (obj.type === "MESH")
        var render_type = obj.is_dynamic ? "DYNAMIC" : "STATIC";
    else
        var render_type = obj.type;

    var render = obj.render = m_obj_util.create_render(render_type);
    prepare_parenting_props(bpy_obj, obj);

    var pos = bpy_obj["location"];
    var scale = bpy_obj["scale"][0];
    var rot = _quat4_tmp;
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

    if (bpy_obj["b4w_viewport_alignment"])
        obj.viewport_alignment = {
            alignment: bpy_obj["b4w_viewport_alignment"]["alignment"],
            distance: bpy_obj["b4w_viewport_alignment"]["distance"]
        }

    switch (bpy_obj["type"]) {
    case "ARMATURE":
        m_armat.update_object(bpy_obj, obj);
        var bone_pointers = render.bone_pointers;
        var pose_data = m_anim.calc_pose_data(bone_pointers);

        if (bpy_obj["b4w_animation_mixing"]) {
            var length = pose_data.quats.length;
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
        render.do_not_render = bpy_obj["b4w_do_not_render"];
        render.bb_original = m_batch.bb_bpy_to_b4w(bpy_obj["data"]["b4w_boundings"]["bb"]);
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

        render.caustics = bpy_obj["b4w_caustics"];

        render.wind_bending = bpy_obj["b4w_wind_bending"];
        // improves batching
        if (bpy_obj["b4w_wind_bending"]) {
            render.wind_bending_angle = bpy_obj["b4w_wind_bending_angle"];
            var amp = m_batch.wb_angle_to_amp(bpy_obj["b4w_wind_bending_angle"],
                    render.bb_original, bpy_obj["scale"][0]);
            render.wind_bending_amp = amp;
            render.wind_bending_freq   = bpy_obj["b4w_wind_bending_freq"];
            render.detail_bending_freq = bpy_obj["b4w_detail_bending_freq"];
            render.detail_bending_amp  = bpy_obj["b4w_detail_bending_amp"];
            render.branch_bending_amp  = bpy_obj["b4w_branch_bending_amp"]; 

            render.main_bend_col = bpy_obj["b4w_main_bend_stiffness_col"];
            var bnd_st = bpy_obj["b4w_detail_bend_colors"];
            render.detail_bend_col = {};
            render.detail_bend_col.leaves_stiffness = bnd_st["leaves_stiffness_col"];
            render.detail_bend_col.leaves_phase = bnd_st["leaves_phase_col"];
            render.detail_bend_col.overall_stiffness = bnd_st["overall_stiffness_col"];
        }
       
        render.hide = bpy_obj["b4w_hidden_on_load"];
        render.do_not_cull = bpy_obj["b4w_do_not_cull"];
        render.disable_fogging = bpy_obj["b4w_disable_fogging"];
        render.dynamic_geometry = bpy_obj["b4w_dynamic_geometry"];

        // assign params for object (bounding) physics simulation
        // it seams BGE uses first material to get physics param
        var first_mat = first_mesh_material(bpy_obj);
        render.friction = first_mat["physics"]["friction"];
        render.elasticity = first_mat["physics"]["elasticity"];

        render.lod_dist_min = 0;
        render.lod_dist_max = m_obj_util.LOD_DIST_MAX_INFINITY;
        render.lod_transition_ratio = bpy_obj["b4w_lod_transition"];
        render.last_lod = true;
        break;

    case "LINE":
        render.do_not_cull = true;
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
                var is_enabled = true;
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

/**
 * Update world: updates b4w world object from bpy world.
 */
exports.update_world = function(bpy_world, world) {
    world.uuid = bpy_world["uuid"];
    world.bpy_origin = true;

    prepare_default_actions(bpy_world, world);
    bpy_world._is_dynamic = world.is_dynamic = calc_is_dynamic(bpy_world, world);
    bpy_world._is_updated = true;

    var render_type = world.type;
    var render = world.render = m_obj_util.create_render(render_type);

    world.use_default_animation = bpy_world["b4w_use_default_animation"];
    world.anim_behavior_def = m_anim.anim_behavior_bpy_b4w(bpy_world["b4w_anim_behavior"]);

    objects_storage_add(world);
}

exports.update_object_relations = function(bpy_obj, obj) {
    var render = obj.render;

    if (obj.parent) {

        // disable object physics on collision compound children 
        // they are just additional shapes for top level parent
        if (!obj.parent_is_dupli &&
                obj.physics_settings.use_collision_compound &&
                obj.parent.physics_settings.use_collision_compound)
            obj.use_obj_physics = false;

        var scenes_have_phy = false;
        for (var i = 0; i < obj.scenes_data.length; i++)
            if (obj.scenes_data[i].scene._physics) {
                var scenes_have_phy = true;
                break;
            }

        if (scenes_have_phy && has_dynamic_physics(obj)) {
            if (obj.parent_is_dupli)
                var offset = m_tsr.copy(render.world_tsr, m_tsr.create());
            else
                var offset = render.world_tsr;
            m_tsr.multiply(obj.parent.render.world_tsr, offset, render.world_tsr);
            m_trans.set_translation(obj, m_tsr.get_trans_view(render.world_tsr));
            m_trans.set_scale(obj, m_tsr.get_scale(render.world_tsr));
            m_trans.set_rotation(obj, m_tsr.get_quat_view(render.world_tsr));
        } else if (obj.parent_is_dupli || !obj.parent_bone) {
            // get offset from render before child-of constraint being applied
            var offset = m_tsr.copy(render.world_tsr, m_tsr.create());

            // second condition is for cases when direct parenting is disabled
            // due to obj parent group mismatch
            if (obj.viewport_alignment && obj.parent.type == "CAMERA") {
                var positioning = {
                    distance: obj.viewport_alignment.distance,
                    rotation: m_tsr.get_quat_view(offset)
                }

                switch (obj.viewport_alignment.alignment) {
                case "TOP_LEFT":
                    positioning.top = 0;
                    positioning.left = 0;
                    break;
                case "TOP":
                    positioning.top = 0;
                    positioning.left = 0.5;
                    break;
                case "TOP_RIGHT":
                    positioning.top = 0;
                    positioning.right = 0;
                    break;
                case "LEFT":
                    positioning.top = 0.5;
                    positioning.left = 0;
                    break;
                case "CENTER":
                    positioning.top = 0.5;
                    positioning.left = 0.5;
                    break;
                case "RIGHT":
                    positioning.top = 0.5;
                    positioning.right = 0;
                    break;
                case "BOTTOM_LEFT":
                    positioning.bottom = 0;
                    positioning.left = 0;
                    break;
                case "BOTTOM":
                    positioning.bottom = 0;
                    positioning.left = 0.5;
                    break;
                case "BOTTOM_RIGHT":
                    positioning.bottom = 0;
                    positioning.right = 0;
                    break;
                }
                m_cons.append_stiff_viewport(obj, obj.parent, positioning);
            } else
                m_cons.append_child_of(obj, obj.parent, offset);
        } else {
            var offset = m_tsr.copy(render.world_tsr, m_tsr.create());
            m_cons.append_child_of_bone(obj, obj.parent, obj.parent_bone,
                    offset);
        }
    }
    if (obj.type == "ARMATURE") {
        var pose_bones = bpy_obj["pose"]["bones"];
        for (var i = 0; i < pose_bones.length; i++) {
            var pose_bone = pose_bones[i];
            var constraints = pose_bone["constraints"];
            if (constraints)
                for (var j = 0; j < constraints.length; j++) {
                    var cons = constraints[j];
                    if (cons["type"] != "COPY_TRANSFORMS" || cons["subtarget"] || cons["mute"])
                        continue;

                    var target_obj = cons["target"]._object;
                    m_cons.append_stiff_bone_to_obj(obj, target_obj, pose_bone["name"],
                                                    m_util.VEC3_IDENT,
                                                    m_util.QUAT4_IDENT, 1);
                }
        }
    }

    if (obj.type == "MESH")

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

function has_dynamic_physics(obj) {
    var render = obj.render;
    var phy_set = obj.physics_settings;

    return (obj.is_vehicle || obj.is_floating || m_phy.is_character(obj)) ||
           (obj.use_obj_physics && !phy_set.use_ghost && phy_set.mass > 0 &&
           (phy_set.physics_type == "DYNAMIC" || phy_set.physics_type == "RIGID_BODY"));
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
        if (cons["type"] == "LOCKED_TRACK" && cons.name == "REFLECTION PLANE")
            if (cons["target"]._object)
                return cons["target"]._object;
            else
                m_print.warn("Reflection plane target \"" +
                    cons["target"]["name"] + "\" for object: \"" + obj.name +
                    "\" is not present on the scene. Using object's Z-axis.");
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

    // LAMPs and CAMERAs aren't allowed if they are from secondary(dynamically loaded) data
    if (!bpy_scene._is_primary_thread && (bpy_obj["type"] == "LAMP" || 
            bpy_obj["type"] == "CAMERA"))
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

function calc_is_dynamic(bpy_obj, obj) {
    // NOTE: need hierarhical objects structure here
    if (bpy_obj["b4w_hidden_on_load"])
        return true;
    if (bpy_obj["dg_parent"] && bpy_obj["dg_parent"]._is_dynamic)
        return true;
    if (bpy_obj["parent"] && bpy_obj["parent"]._is_dynamic)
        return true;

    switch (bpy_obj["type"]) {
    case "MESH":
        return calc_mesh_is_dynamic(bpy_obj, obj);
        break;
    case "EMPTY":
        return calc_empty_is_dynamic(bpy_obj, obj);
        break;
    default:
        return true;
        break;
    }
}

function calc_empty_is_dynamic(bpy_obj, obj) {
    var is_animated = m_anim.bpy_obj_is_animatable(bpy_obj, obj);
    var has_nla = m_nla.bpy_obj_has_nla(bpy_obj);
    var has_do_not_batch = bpy_obj["b4w_do_not_batch"];
    var anchor = Boolean(bpy_obj["b4w_anchor"]);
    return is_animated || has_nla || has_do_not_batch || anchor;
}

function calc_mesh_is_dynamic(bpy_obj, obj) {
    var is_animated = m_anim.bpy_obj_is_animatable(bpy_obj, obj);
    var has_do_not_batch = bpy_obj["b4w_do_not_batch"];
    var is_collision = bpy_obj["b4w_collision"];
    var is_vehicle_part = bpy_obj["b4w_vehicle"];
    var is_floater_part = bpy_obj["b4w_floating"];
    var is_character = bpy_obj["b4w_character"];
    var dyn_grass_emitter = m_particles.has_dynamic_grass_particles(bpy_obj);
    var has_nla = m_nla.bpy_obj_has_nla(bpy_obj);
    var has_shape_keys = bpy_obj["data"]["b4w_shape_keys"].length > 0;
    var has_dynamic_geometry = bpy_obj["b4w_dynamic_geometry"];

    // lens flares are not strictly required to be dynamic
    // make them so to prevent possible bugs in the future

    return DEBUG_DISABLE_STATIC_OBJS || is_animated || has_do_not_batch
            || is_collision || is_vehicle_part || has_shape_keys
            || is_floater_part || dyn_grass_emitter || is_character
            || has_nla || has_dynamic_geometry || has_dynamic_mat(bpy_obj);
}

function has_dynamic_mat(bpy_obj) {
    var mesh = bpy_obj["data"];

    for (var i = 0; i < mesh["materials"].length; i++) {
        var mat = mesh["materials"][i];

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

function copy_object(obj, new_name, deep_copy) {

    var origin_name = new_name;
    var dg_parent = m_obj_util.get_dg_parent(obj);
    var name = dg_parent ? m_obj_util.gen_dupli_name(dg_parent.name, new_name) : new_name;

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
        origin_name += num;
        name += num;
    }

    var new_obj = m_obj_util.create_object(name, obj.type, origin_name);

    new_obj.bpy_origin = obj.bpy_origin;

    // NOTE: not all props are needed or supported for the copied object
    new_obj.is_dynamic = obj.is_dynamic;
    new_obj.is_hair_dupli = obj.is_hair_dupli;
    new_obj.use_default_animation = obj.use_default_animation;
    new_obj.def_action_slots = obj.def_action_slots;

    new_obj.render = m_obj_util.clone_render(obj.render);
    new_obj.metatags = m_obj_util.copy_object_props_by_value(obj.metatags);

    copy_scene_data(obj, new_obj);
    new_obj.action_anim_cache =m_obj_util.copy_bpy_object_props_by_link(obj.action_anim_cache);
    
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

    if (!deep_copy)
        new_obj.render.use_batches_boundings = false;

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
                    new_batches.push(new_batch);
                    bpy_bufs_data.push(batches[j].bufs_data);
                }

            for (var j = 0; j < batches.length; j++)
                if (batches[j].forked_batch) {
                    var new_forked_batch = m_obj_util.copy_object_props_by_value(batches[j]);
                    new_batches.push(new_forked_batch);
                    for (var k = 0; k < bpy_bufs_data.length; k++)
                        if (bpy_bufs_data[k] == batches[j].bufs_data)
                            new_forked_batch.bufs_data = new_batches[k].bufs_data;
                }

            for (var j = 0; j < new_batches.length; j++) {
                if (new_batches[j].bufs_data)
                    m_geom.update_gl_buffers(new_batches[j].bufs_data);

                if (cfg_def.allow_vao_ext)
                    m_render.assign_vao(new_batches[j]);

                // to create unique batch ID
                new_batches[j].odd_id_prop = new_obj.uuid;
                m_batch.update_batch_id(new_batches[j],
                                        m_batch.calculate_render_id(new_obj.render));
            }

            m_tex.share_batch_canvas_textures(new_batches);

        } else
            new_sc_data.batches = batches;
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

function prepare_default_actions(bpy_obj, obj) {
    var obj_anim_data = bpy_obj["animation_data"];
    var data_anim_data = bpy_obj["data"] ? bpy_obj["data"]["animation_data"] : null;

    if (obj_anim_data && obj_anim_data["action"]) {
        var action = obj_anim_data["action"];

        if (action._render.type == m_anim.OBJ_ANIM_TYPE_OBJECT ||
                action._render.type == m_anim.OBJ_ANIM_TYPE_ARMATURE && obj.type == "ARMATURE" ||
                action._render.type == m_anim.OBJ_ANIM_TYPE_LIGHT && obj.type == "LAMP" ||
                action._render.type == m_anim.OBJ_ANIM_TYPE_ENVIRONMENT && obj.type == "WORLD")
            obj.def_action_slots.push(m_anim.init_action_slot(null, action));
    }

    if (data_anim_data && data_anim_data["action"] && (obj.type == "SPEAKER"
                                                    || obj.type == "LAMP"))
        obj.def_action_slots.push(m_anim.init_action_slot(null,
                                    data_anim_data["action"]));

    // NOTE: nla material tracks are considered during the nla's object updating
    // and aren't present in the def_action_slots property
    if (obj.type == "MESH")
        obj.def_action_slots.push.apply(obj.def_action_slots,
                                    m_anim.get_bpy_material_actions(bpy_obj));
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

/**
 * This algorithm has been taken from bindinds.c
 */
exports.update_boundings = function(obj) {
    var render = obj.render;
    //TODO: process all scenes_data
    var batches = obj.scenes_data[0].batches;
    var max_x, max_y, max_z, min_x, min_y, min_z;
    var bmax_x, bmax_y, bmax_z, bmin_x, bmin_y, bmin_z;
    var bounding_verts = [];

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];
        if (batch.type == "MAIN") {
            var type = m_geom.get_vbo_type_by_attr_name("a_position");
            var vbo_source = m_geom.get_vbo_source_by_type(batch.bufs_data.vbo_source_data, type);
            var pos_offset = batch.bufs_data.pointers["a_position"].offset;
            max_x = min_x = vbo_source[pos_offset];
            max_y = min_y = vbo_source[pos_offset + 1];
            max_z = min_z = vbo_source[pos_offset + 2];
        }
    }

    for (var i = 0; i < batches.length; i++) {

        var batch = batches[i];

        if (!batch.bufs_data || !(batch.be_world && batch.bb_world))
            continue;

        var type = m_geom.get_vbo_type_by_attr_name("a_position");
        var vbo_source = m_geom.get_vbo_source_by_type(batch.bufs_data.vbo_source_data, type);
        var pos_offset = batch.bufs_data.pointers["a_position"].offset;
        var pos_length = batch.bufs_data.pointers["a_position"].length + pos_offset;

        bmax_x = bmin_x = vbo_source[pos_offset];
        bmax_y = bmin_y = vbo_source[pos_offset + 1];
        bmax_z = bmin_z = vbo_source[pos_offset + 2];

        for (var j = pos_offset; j < pos_length; j = j + 3) {
            var x = vbo_source[j];
            var y = vbo_source[j + 1];
            var z = vbo_source[j + 2];

            bmax_x = Math.max(x, bmax_x);
            bmax_y = Math.max(y, bmax_y);
            bmax_z = Math.max(z, bmax_z);

            bmin_x = Math.min(x, bmin_x);
            bmin_y = Math.min(y, bmin_y);
            bmin_z = Math.min(z, bmin_z);
        }

        batch.bb_local.max_x = bmax_x.toFixed(3);
        batch.bb_local.max_y = bmax_y.toFixed(3);
        batch.bb_local.max_z = bmax_z.toFixed(3);
        batch.bb_local.min_x = bmin_x.toFixed(3);
        batch.bb_local.min_y = bmin_y.toFixed(3);
        batch.bb_local.min_z = bmin_z.toFixed(3);

        m_bounds.bounding_box_transform(batch.bb_local, render.world_tsr,
                batch.bb_world);
        m_bounds.extract_bb_corners(batch.bb_world, _bb_corners_tmp);
        bounding_verts.length = 0;
        for (var k = 0; k < _bb_corners_tmp.length; k++)
            bounding_verts.push(_bb_corners_tmp[k])
        batch.be_world = m_bounds.create_be_by_bb(bounding_verts, true);
        batch.be_local = m_bounds.calc_be_local_by_tsr(batch.be_world,
                render.world_tsr);
        batch.bs_local = m_bounds.create_bs_by_be(batch.be_local);
        batch.bs_world = m_bounds.create_bs_by_be(batch.be_world);

        batch.use_be = m_bounds.is_be_optimized(batch.be_local,
                                                batch.bs_local);

        if (batch.type == "MAIN") {
            max_x = Math.max(bmax_x, max_x);
            max_y = Math.max(bmax_y, max_y);
            max_z = Math.max(bmax_z, max_z);

            min_x = Math.min(bmin_x, min_x);
            min_y = Math.min(bmin_y, min_y);
            min_z = Math.min(bmin_z, min_z);
        }
    }

    var bb_local = {
        max_x : parseFloat(max_x.toFixed(3)),
        max_y : parseFloat(max_y.toFixed(3)),
        max_z : parseFloat(max_z.toFixed(3)),
        min_x : parseFloat(min_x.toFixed(3)),
        min_y : parseFloat(min_y.toFixed(3)),
        min_z : parseFloat(min_z.toFixed(3))
    }

    var x_width = max_x - min_x;
    var y_width = max_y - min_y;
    var z_width = max_z - min_z;

    var s_cen_x = 0.5 * (max_x + min_x);
    var s_cen_y = 0.5 * (max_y + min_y);
    var s_cen_z = 0.5 * (max_z + min_z);

    var c_cen_x = s_cen_x;
    var c_cen_y = s_cen_y;
    var c_cen_z = s_cen_z;

    var s_rad = Math.max(x_width, Math.max(y_width, z_width)) / 2;
    var c_rad = Math.max(x_width, z_width) / 2;

    var tmp_s_cen = [s_cen_x / (x_width ? x_width : 1),
                    s_cen_y / (y_width ? y_width : 1),
                    s_cen_z / (z_width ? z_width : 1)];
    var tmp_rad = 0.5;

    if (render.billboard) {
        var x = Math.max(Math.abs(bb_local.max_x), Math.abs(bb_local.min_x));
        var y = Math.max(Math.abs(bb_local.max_y), Math.abs(bb_local.min_y));
        var z = Math.max(Math.abs(bb_local.max_z), Math.abs(bb_local.min_z));
        var sphere_radius = Math.sqrt(x * x + y * y + z * z);
        var cylinder_radius = Math.sqrt(x * x + y * y);

        bb_local.max_x = bb_local.max_y = bb_local.max_z = sphere_radius;
        bb_local.min_x = bb_local.min_y = bb_local.min_z = -sphere_radius;

        c_rad = cylinder_radius;

        s_rad = sphere_radius;
        var bs_center = new Float32Array([0, 0, 0]);
        var be_axes = new Float32Array([s_rad, s_rad, s_rad]);
        var be_center = new Float32Array([0, 0, 0]);
    } else {
        for (var i = 0; i < batches.length; i++) {
            var batch = batches[i];

            if (batch.type != "MAIN")
                continue;

            var type = m_geom.get_vbo_type_by_attr_name("a_position");
            var vbo_source = m_geom.get_vbo_source_by_type(batch.bufs_data.vbo_source_data, type);
            var pointers = batches[i].bufs_data.pointers;

            var pos_offset = pointers["a_position"].offset;
            var pos_length = pointers["a_position"].length + pos_offset;

            for (var j = pos_offset; j < pos_length; j = j + 3) {
                var x = vbo_source[j];
                var y = vbo_source[j + 1];
                var z = vbo_source[j + 2];

                var s_cen_dist = Math.sqrt((s_cen_x - x) * (s_cen_x - x) 
                        + (s_cen_y - y) * (s_cen_y - y) +
                        (s_cen_z - z) * (s_cen_z - z));

                if (s_cen_dist > s_rad) {
                    var g_x = s_cen_x - s_rad * (x - s_cen_x) / s_cen_dist;
                    var g_y = s_cen_y - s_rad * (y - s_cen_y) / s_cen_dist;
                    var g_z = s_cen_z - s_rad * (z - s_cen_z) / s_cen_dist;

                    s_cen_x = (g_x + x) / 2;
                    s_cen_y = (g_y + y) / 2;
                    s_cen_z = (g_z + z) / 2;

                    s_rad = Math.sqrt((s_cen_x - x) * (s_cen_x - x) 
                            + (s_cen_y - y) * (s_cen_y - y) +
                            (s_cen_z - z) * (s_cen_z - z));
                }

                var c_cen_dist = Math.sqrt((c_cen_x - x) * (c_cen_x - x) 
                        + (c_cen_z - z) * (c_cen_z - z));

                if (c_cen_dist > c_rad) {
                    var g_x = c_cen_x - c_rad * (x - c_cen_x) / c_cen_dist;
                    var g_z = c_cen_z - c_rad * (z - c_cen_z) / c_cen_dist;

                    c_cen_x = (g_x + x) / 2;
                    c_cen_z = (g_z + z) / 2;
                    c_rad = Math.sqrt((c_cen_x - x) * (c_cen_x - x) 
                            + (c_cen_z - z) * (c_cen_z - z));
                }

                x /= x_width ? x_width : 1;
                y /= y_width ? y_width : 1;
                z /= z_width ? z_width : 1;

                var s_cen_tmp = Math.sqrt((tmp_s_cen[0] - x) * (tmp_s_cen[0] - x) +
                        (tmp_s_cen[1] - y) * (tmp_s_cen[1] - y) 
                        + (tmp_s_cen[2] - z) * (tmp_s_cen[2] - z));

                if (s_cen_tmp > tmp_rad) {
                    var g_x = tmp_s_cen[0] - tmp_rad * (x - tmp_s_cen[0]) / s_cen_tmp;
                    var g_y = tmp_s_cen[1] - tmp_rad * (y - tmp_s_cen[1]) / s_cen_tmp;
                    var g_z = tmp_s_cen[2] - tmp_rad * (z - tmp_s_cen[2]) / s_cen_tmp;

                    tmp_s_cen[0] = (g_x + x) / 2;
                    tmp_s_cen[1] = (g_y + y) / 2;
                    tmp_s_cen[2] = (g_z + z) / 2;

                    tmp_rad = Math.sqrt((tmp_s_cen[0] - x) * (tmp_s_cen[0] - x) 
                            + (tmp_s_cen[1] - y) * (tmp_s_cen[1] - y)
                            + (tmp_s_cen[2] - z) * (tmp_s_cen[2] - z));
                }
            }
        }
        var e_cen_x = x_width ? x_width * tmp_s_cen[0] : max_x;
        var e_cen_y = y_width ? y_width * tmp_s_cen[1] : max_y;
        var e_cen_z = z_width ? z_width * tmp_s_cen[2] : max_z;

        var e_axis_x = tmp_rad * x_width;
        var e_axis_y = tmp_rad * y_width;
        var e_axis_z = tmp_rad * z_width;

        var bs_center = new Float32Array([s_cen_x, s_cen_y, s_cen_z]);
        var be_axes = new Float32Array([e_axis_x, e_axis_y, e_axis_z]);
        var be_center = new Float32Array([e_cen_x, e_cen_y, e_cen_z]);
        c_rad = parseFloat(c_rad.toFixed(3));
    }

    render.bb_local = bb_local;
    m_batch.set_local_cylinder_capsule(render, c_rad, c_rad, bb_local);

    // bounding sphere
    var bs_local = m_bounds.bs_from_values(s_rad, bs_center);
    render.bs_local = bs_local;

    // bounding ellipsoid
    var be_local = m_bounds.be_from_values([be_axes[0], 0, 0],
            [0, be_axes[1], 0], [0, 0, be_axes[2]], be_center);
    render.be_local = be_local;

    m_trans.update_transform(obj);

    if (cfg_def.debug_view)
        for (var i = 0; i < batches.length; i++) {
            if (batches[i].type === "DEBUG_VIEW" && batches[i].debug_sphere) {
                var submesh = m_primitives.generate_uv_sphere(16, 8, 1, be_local.center,
                        false, false);
                var scale = [be_local.axis_x[0], be_local.axis_y[1], be_local.axis_z[2]];
                m_geom.scale_submesh_xyz(submesh, scale, be_local.center)
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
        if (obj.render.data_id != data_id && data_id != DATA_ID_ALL || !obj.bpy_origin)
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

exports.get_all_objects = function(data_id) {
    var all_objs = _all_objects["ALL"];
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

    for (var i = 0; i < mesh_objs.length; i++) {
        var obj = mesh_objs[i];

        if (!m_phy.is_character(obj))
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

function sort_func(l1, l2) {
    if (l2.use_diffuse && l2.use_specular &&
        !(l1.use_diffuse && l1.use_specular))
        return true;
    if (!l1.use_diffuse)
        if(l2.use_diffuse || (!l1.use_specular && l2.use_specular))
            return true;
    return false;
}

// NOTE: sorting for iPAD (need to limit lamps number and preserve most valuable lamps)
exports.sort_lamps = function(scene) {
    var lamps = get_scene_objs(scene, "LAMP", DATA_ID_ALL);
    if (lamps.length != scene._render.num_lamps_added)
        return;

    var lamp_indexes = [];
    for (var i = 0; i < lamps.length; i++) {
        var lamp = lamps[i];
        var scene_data = m_obj_util.get_scene_data(lamp, scene);
        lamp_indexes[scene_data.light_index] = i;
    }

    for (var i = 0; i < lamp_indexes.length - 1; i++) {
        for (var j = i + 1; j < lamp_indexes.length; j++) {
            if (sort_func(lamps[lamp_indexes[i]].light,
                          lamps[lamp_indexes[j]].light)) {
                var tmp = lamp_indexes[i];
                lamp_indexes[i] = lamp_indexes[j];
                lamp_indexes[j] = tmp;
            }
        }
    }

    for (var i = 0; i < lamp_indexes.length; i++) {
        var lamp = lamps[lamp_indexes[i]];
        var lamp_sc_data = m_obj_util.get_scene_data(lamp, scene);
        lamp_sc_data.light_index = i;
        m_scenes.update_lamp_scene(lamps[lamp_indexes[i]], scene);
    }
}

exports.obj_switch_cleanup_flags = function(obj, cleanup_tex, cleanup_bufs, 
        cleanup_shader, cleanup_nodemat) {
    for (var i = 0; i < obj.scenes_data.length; i++) {
        var batches = obj.scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++) {
            var batch = batches[j];

            // tex
            for (var k = 0; k < batch.textures.length; k++)
                batch.textures[k].cleanup_gl_data_on_unload = cleanup_tex;

            // ibo/vbo buffs
            batch.bufs_data.cleanup_gl_data_on_unload = cleanup_bufs;

            // vao batch
            batch.cleanup_gl_data_on_unload = cleanup_bufs;

            // shader
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
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        if (obj.render.selectable && obj.bpy_origin)
            sel_objects.push(obj);
    }
    return sel_objects;
}

exports.get_outlining_objects = function() {
    var outlining_objects = [];
    var objects = _all_objects["MESH"];
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        if (obj.render.outlining && obj.bpy_origin)
            outlining_objects.push(obj);
    }
    return outlining_objects;
}

exports.get_object = function() {
    var obj_found = null;
    var obj_name = "";
    var objs = _all_objects["ALL"];

    switch (arguments[0]) {
    case exports.GET_OBJECT_BY_NAME:
        obj_name = arguments[1];
        obj_found = get_object_by_name(arguments[1], objs, true, arguments[2]);
        break;
    case exports.GET_OBJECT_BY_DUPLI_NAME:
        obj_name = arguments[2];
        obj_found = get_object_by_dupli_name(arguments[1], arguments[2], objs,
                                             arguments[3]);
        break;
    case exports.GET_OBJECT_BY_DUPLI_NAME_LIST:
        obj_name = arguments[1][arguments[1].length - 1];
        obj_found = get_object_by_dupli_name_list(arguments[1], objs,
                                                  arguments[2]);
        break;
    default:
        break;
    }

    return obj_found;
}

function get_object_by_name(name, objects, use_origin_name, data_id) {
    var obj_found = null;

    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        var obj_name = (use_origin_name) ? obj.origin_name : obj.name;
        if (obj_name == name && (obj.render.data_id == data_id 
                || data_id == DATA_ID_ALL)) {
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
        m_util.dir_to_quat(_vec3_tmp, m_util.AXIS_Z, _quat4_tmp);

        m_trans.set_rotation(wind_obj, _quat4_tmp);
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

}
