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
var m_mat4       = require("__mat4");
var m_nla        = require("__nla");
var m_obj_util   = require("__obj_util");
var m_particles  = require("__particles");
var m_phy        = require("__physics");
var m_print      = require("__print");
var m_primitives = require("__primitives");
var m_quat       = require("__quat");
var m_scenes     = require("__scenes");
var m_sfx        = require("__sfx");
var m_trans      = require("__transform");
var m_tsr        = require("__tsr");
var m_util       = require("__util");
var m_vec3       = require("__vec3");

var cfg_def = m_cfg.defaults;
var cfg_out = m_cfg.outlining;

var DEBUG_DISABLE_STATIC_OBJS = false;

var _all_objects = {"ALL": []};

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
    var objects = _all_objects["ALL"];

    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        var scenes_data = obj.scenes_data;

        for (var j = 0; j < scenes_data.length; j++) {
            var scene = scenes_data[j].scene;
            var render = scene._render;

            // render outline animation
            if (render.outline) {
                // update outline animation
                if (_outline_anim_objs.indexOf(obj) != -1)
                    update_obj_outline_intensity(obj, timeline);

                if (obj.render.outline_intensity)
                    m_scenes.request_outline(scene);
            }
        }
    }
}

exports.apply_outline_anim = function(obj, tau, T, N) {
    obj._outline_anim = {
        time_start: 0,
        outline_time: tau,
        period: T,
        relapses: N
    }

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

    if(!_all_objects[obj.type])
        _all_objects[obj.type] = [];

    _all_objects["ALL"].push(obj);
    _all_objects[obj.type].push(obj);

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

    if (bpy_obj["b4w_object_tags"])
        obj.metatags = {
            title: bpy_obj["b4w_object_tags"]["title"],
            description: bpy_obj["b4w_object_tags"]["description"],
            category: bpy_obj["b4w_object_tags"]["category"]
        }

    switch (bpy_obj["type"]) {
    case "ARMATURE":
        var pose_bones = bpy_obj["pose"]["bones"];
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

        render.pose_data = pose_data;
        render.frame_factor = 0;
        render.anim_mixing = bpy_obj["b4w_animation_mixing"];
        break;

    case "MESH":
        render.bb_original = m_batch.bb_bpy_to_b4w(bpy_obj["data"]["b4w_bounding_box"]);
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

        render.outline_anim_settings = {
            outline_duration: bpy_obj["b4w_outline_settings"]["outline_duration"],
            outline_period: bpy_obj["b4w_outline_settings"]["outline_period"],
            outline_relapses: bpy_obj["b4w_outline_settings"]["outline_relapses"]
        };

        if (render.selectable) {
            // assign color id
            render.color_id = m_util.gen_color_id(_color_id_counter);
            _color_id_counter++;
        }

        prepare_vertex_anim(bpy_obj, obj);
        prepare_shape_keys(bpy_obj, obj);

        // apply pose if any
        var bpy_armobj = m_anim.get_bpy_armobj(bpy_obj);
        if (bpy_armobj) {
            var armobj = bpy_armobj._object;
            prepare_skinning_info(bpy_obj, obj, armobj);
            var bone_pointers = render.bone_pointers;
            var pose_data = m_anim.calc_pose_data(armobj, bone_pointers);

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

        prepare_nodemats_containers(bpy_obj, obj);

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
        render.wind_bending_angle = bpy_obj["b4w_wind_bending_angle"];
        var amp = m_batch.wb_angle_to_amp(bpy_obj["b4w_wind_bending_angle"],
                render.bb_original, bpy_obj["scale"][0]);
        render.wind_bending_amp = amp;
        render.wind_bending_freq   = bpy_obj["b4w_wind_bending_freq"];
        render.detail_bending_freq = bpy_obj["b4w_detail_bending_freq"];
        render.detail_bending_amp  = bpy_obj["b4w_detail_bending_amp"];
        render.branch_bending_amp  = bpy_obj["b4w_branch_bending_amp"];
        render.hide = false;

        render.main_bend_col = bpy_obj["b4w_main_bend_stiffness_col"];
        var bnd_st = bpy_obj["b4w_detail_bend_colors"];
        render.detail_bend_col = {};
        render.detail_bend_col.leaves_stiffness = bnd_st["leaves_stiffness_col"];
        render.detail_bend_col.leaves_phase = bnd_st["leaves_phase_col"];
        render.detail_bend_col.overall_stiffness = bnd_st["overall_stiffness_col"];

        render.do_not_cull = bpy_obj["b4w_do_not_cull"];
        render.disable_fogging = bpy_obj["b4w_disable_fogging"];
        render.dynamic_geometry = bpy_obj["b4w_dynamic_geometry"];

        // assign params for object (bounding) physics simulation
        // it seams BGE uses first material to get physics param
        var first_mat = first_mesh_material(bpy_obj);
        render.friction = first_mat["physics"]["friction"];
        render.elasticity = first_mat["physics"]["elasticity"];

        render.lod_dist_min = 0;
        render.lod_dist_max = 10000;
        render.lod_transition_ratio = bpy_obj["b4w_lod_transition"];
        render.last_lod = true;
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
            if (obj.scenes_data[i].scene["b4w_enable_audio"]) {
                var is_enabled = true;
                break;
            }

        if (is_enabled)
            m_sfx.update_object(bpy_obj, obj);

        break;

    case "EMPTY":
        // NOTE: center = 1/2 height
        var bb = m_bounds.zero_bounding_box();
        render.bb_local = bb;

        var bs = m_bounds.zero_bounding_sphere();
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

    if (bpy_obj["field"])
        render.force_strength = bpy_obj["field"]["strength"];
}

exports.update_object_relations = function(obj) {
    var render = obj.render;

    if (obj.parent) {

        var trans = render.trans;
        var quat = render.quat;
        var scale = render.scale;

        // disable object physics on collision compound children 
        // they are just additional shapes for top level parent
        if (!obj.parent_is_dupli &&
                obj.physics_settings.use_collision_compound &&
                obj.parent.physics_settings.use_collision_compound)
            obj.use_obj_physics = false;

        if (has_dynamic_physics(obj)) {
            if (obj.parent_is_dupli)
                var offset = m_tsr.create_sep(trans, scale, quat);
            else
                var offset = render.tsr;
            m_tsr.multiply(obj.parent.render.tsr, offset, render.tsr);
            m_trans.set_translation(obj, m_tsr.get_trans_view(render.tsr));
            m_trans.set_scale(obj, m_tsr.get_scale(render.tsr));
            m_trans.set_rotation(obj, m_tsr.get_quat_view(render.tsr));
        } else if (obj.parent_is_dupli || !obj.parent_bone) {
            // get offset from render before child-of constraint being applied
            var offset = m_tsr.create_sep(trans, scale, quat);
            m_cons.append_child_of(obj, obj.parent, offset);
        } else {
            var offset = m_tsr.create_sep(trans, scale, quat);
            m_cons.append_child_of_bone(obj, obj.parent, obj.parent_bone,
                    offset);
        }
    }

    if (obj.type == "MESH" && render.reflective)
        attach_reflection_data(obj);
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

function attach_reflection_data(obj) {
    var render = obj.render;

    if (render.reflection_type == "CUBE")
        render.cube_reflection_id = _cube_refl_counter++;
    else if (render.reflection_type == "PLANE") {

        var refl_plane_obj = get_reflection_plane_obj(obj);

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

    if (!_all_objects["EMPTY"])
        _all_objects["EMPTY"] = [];
    _all_objects["EMPTY"].push(reflection_plane);
    _all_objects["ALL"].push(reflection_plane);

    return reflection_plane;
}

function get_reflection_plane_obj(obj) {
    var bpy_obj = obj.temp_bpy_obj;
    var constraints = bpy_obj["constraints"];
    for (var i = 0; i < constraints.length; i++) {
        var cons = constraints[i];
        if (cons["type"] == "LOCKED_TRACK" && cons.name == "REFLECTION PLANE")
                return cons["target"]._object;
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
    var is_animated = m_anim.bpy_obj_is_animatable(bpy_obj);
    var has_nla = m_nla.has_nla(obj);
    var has_do_not_batch = bpy_obj["b4w_do_not_batch"];

    return is_animated || has_nla || has_do_not_batch;
}

function calc_mesh_is_dynamic(bpy_obj, obj) {
    var is_animated = m_anim.bpy_obj_is_animatable(bpy_obj);
    var has_do_not_batch = bpy_obj["b4w_do_not_batch"];
    var is_collision = bpy_obj["b4w_collision"];
    var is_vehicle_part = bpy_obj["b4w_vehicle"];
    var is_floater_part = bpy_obj["b4w_floating"];
    var is_character = bpy_obj["b4w_character"];
    var dyn_grass_emitter = m_particles.has_dynamic_grass_particles(bpy_obj);
    var has_nla = m_nla.has_nla(obj);
    var has_shape_keys = bpy_obj["data"]["b4w_shape_keys"].length > 0;
    var has_dynamic_geometry = bpy_obj["b4w_dynamic_geometry"];

    // lens flares are not strictly required to be dynamic
    // make them so to prevent possible bugs in the future

    return DEBUG_DISABLE_STATIC_OBJS || is_animated || has_do_not_batch
            || is_collision || is_vehicle_part || has_shape_keys
            || is_floater_part || has_lens_flares_mat(bpy_obj)
            || dyn_grass_emitter || is_character || has_nla
            || has_dynamic_geometry;
}

function has_lens_flares_mat(bpy_obj) {
    var mesh = bpy_obj["data"];

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
function prepare_skinning_info(bpy_obj, obj, armobj) {

    var bpy_armobj = armobj.temp_bpy_obj;

    var render = obj.render;
    var mesh = bpy_obj["data"];

    obj.armobj = armobj;

    var vertex_groups = mesh["vertex_groups"];
    if (!vertex_groups.length)
        return;

    // collect deformation bones

    var bones = bpy_armobj["data"]["bones"];
    var pose_bones = bpy_armobj["pose"]["bones"];

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

    render.bone_pointers = bone_pointers;
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
        throw("Wrong object type: " + bpy_obj["name"]);

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
        throw "Wrong object";

    return bpy_obj["data"]["materials"][0];
}

function prepare_nodemats_containers(bpy_obj, obj) {

    var render = obj.render;
    var materials = bpy_obj["data"]["materials"];

    var mats_values = [];
    var mats_value_inds = [];
    var mats_anim_inds = [];
    var mats_rgbs = [];
    var mats_rgb_inds = [];
    var mats_rgb_anim_inds = [];

    for (var i = 0; i < materials.length; i++) {
        var mat = materials[i];
        var node_tree = mat["node_tree"];

        if (!node_tree)
            continue;

        var anim_data = node_tree["animation_data"];

        process_ntree_r(node_tree, mat["name"], anim_data,
                           mats_values, mats_value_inds, mats_anim_inds,
                           mats_rgbs, mats_rgb_inds, mats_rgb_anim_inds);
    }
    render.mats_values = mats_values;
    render.mats_value_inds = mats_value_inds;
    render.mats_anim_inds = mats_anim_inds;
    render.mats_rgbs = mats_rgbs;
    render.mats_rgb_inds = mats_rgb_inds;
    render.mats_rgb_anim_inds = mats_rgb_anim_inds;
}

function process_ntree_r(node_tree, names_str, anim_data,
                         mats_values, value_inds, val_anim_inds,
                         mats_rgbs, rgb_inds, rgb_anim_inds) {

    // collect all VALUE and RGB nodes
    for (var i = 0; i < node_tree["nodes"].length; i++) {
        var node = node_tree["nodes"][i];
        if (node["type"] == "VALUE") {
            var param_name = join_name(names_str, node["name"]);
            mats_values.push(node["outputs"][0]["default_value"]);
            value_inds.push(param_name, value_inds.length / 2);

        } else if (node["type"] == "RGB") {
            var param_name = join_name(names_str, node["name"]);
            var def_value = node["outputs"][0]["default_value"].slice(0,3);
            mats_rgbs.push(def_value[0], def_value[1], def_value[2]);
            rgb_inds.push(param_name, rgb_inds.length / 2);

        } else if (node["type"] == "GROUP") {
            var gr_node_tree = node["node_group"]["node_tree"];
            var ntree_anim_data = gr_node_tree["animation_data"];
            var new_names_str = join_name(names_str, node["name"]);
            process_ntree_r(gr_node_tree, new_names_str, ntree_anim_data,
                            mats_values, value_inds, val_anim_inds,
                            mats_rgbs, rgb_inds, rgb_anim_inds);
        }
    }

    // process their animation data
    if (anim_data)
        process_ntree_anim_data(anim_data, names_str,
                                val_anim_inds, value_inds,
                                rgb_inds, rgb_anim_inds);
}

function process_ntree_anim_data(anim_data, names_str,
                                 val_anim_inds, value_inds,
                                 rgb_inds, rgb_anim_inds) {

    var action = anim_data["action"];
    if (action)
        extract_nodemat_action_params(action, names_str,
                                      val_anim_inds, value_inds,
                                      rgb_anim_inds, rgb_inds);

    var nla_tracks = anim_data["nla_tracks"];

    for (var j = 0; j < nla_tracks.length; j++) {
        var nla_strips = nla_tracks[j]["strips"];
        for (var k = 0; k < nla_tracks[j]["strips"].length; k++) {
            var strip = nla_strips[k];
            var action = strip["action"];
            if (action)
                extract_nodemat_action_params(action, names_str,
                                              val_anim_inds, value_inds,
                                              rgb_anim_inds, rgb_inds);
        }
    }
}

function extract_nodemat_action_params(action, names_str,
                                       val_anim_inds, value_inds,
                                       rgb_anim_inds, rgb_inds) {

    var params = action._render.params;

    for (var param in params) {
        var full_node_path = join_name(names_str, node_name_from_param_name(param));
        var ind = node_ind_by_full_path(value_inds, full_node_path);
        if (ind != null) {
            var param_name = join_name(action["name"], param);
            val_anim_inds.push(param_name, ind);
        } else {
            var ind = node_ind_by_full_path(rgb_inds, full_node_path);
            if (ind != null) {
                var param_name = join_name(action["name"], param);
                rgb_anim_inds.push(param_name, ind);
            }
        }
    }
}

function join_name(name1, name2) {
    return name1 + "%join%" + name2;
}

function node_name_from_param_name(param_name) {
    // extract text between first "[" and "]" which is exactly a node name
    return param_name.match(/"(.*?)"/ )[1];
}

function node_ind_by_full_path(inds, path) {
    for (var i = 0; i < inds.length; i+=2) {
        var name = inds[i];
        if (name == path)
            return inds[i+1];
    }
    return null;
}

exports.get_meta_tags = function(obj) {
    return m_util.clone_object_r(obj.metatags);
}

exports.cleanup = function() {
    _color_id_counter = 0;
    _cube_refl_counter = 0;
    _refl_plane_objs = [];
    _outline_anim_objs.length = 0;
    _all_objects = {"ALL":[]};
}

exports.copy = function(obj, name, deep_copy) {
    var new_obj = copy_object(obj, name, deep_copy);
    new_obj["uuid"] = m_util.gen_uuid();
    new_obj.render.is_copied = true;
    new_obj.render.color_id = m_util.gen_color_id(_color_id_counter);
    _color_id_counter++;

    return new_obj;
}

function copy_object(obj, new_name, deep_copy) {
    var new_obj = m_obj_util.create_object(new_name, obj.type);

    new_obj.render = m_obj_util.copy_object_props_by_value(obj.render);
    new_obj.is_dynamic = obj.is_dynamic;
    new_obj.parent = obj.parent;
    new_obj.parent_is_dupli = obj.parent_is_dupli;
    new_obj.parent_bone = obj.parent_bone;

    if (obj._action_anim_cache)
        new_obj._action_anim_cache = copy_bpy_object_props_by_link(obj._action_anim_cache);

    new_obj.physics_settings =
            m_obj_util.copy_object_props_by_value(obj.physics_settings);

    if (obj.physics && !(obj.is_vehicle || obj.is_character 
            || obj.is_floating))
        new_obj.physics = m_obj_util.copy_object_props_by_value(obj.physics);

    new_obj.use_obj_physics = obj.use_obj_physics;

    new_obj["b4w_collision_id"] = obj["b4w_collision_id"];
    new_obj["b4w_correct_bounding_offset"] = obj["b4w_correct_bounding_offset"];

    new_obj["data"] = obj["data"];

    copy_scene_data(obj, new_obj);

    var bpy_bufs_data = [];
    for (var i = 0; i < obj.scenes_data.length; i++) {

        var sc_data = obj.scenes_data[i];
        var new_sc_data = new_obj.scenes_data[i];

        var batches = sc_data.batches;

        if (deep_copy) {
            var new_batches = new_sc_data.batches;
            for (var j = 0; j < batches.length; j++)
                if (!batches[j].forked_batch) {
                    new_batches.push(m_obj_util.copy_object_props_by_value(batches[j]));
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

                //create unique batch ID
                new_batches[j].odd_id_prop = new_obj["uuid"];
                m_batch.update_batch_id(new_batches[j], m_util.calc_variable_id(new_obj.render, 0));
            }

        } else
            new_sc_data.batches = copy_bpy_object_props_by_link(batches);
    }

    // disable scene data for the new obj until appending it to the scene
    m_obj_util.scene_data_set_active(new_obj, false);

    if (get_object_by_name(obj.name, _all_objects["ALL"], false,
                           DATA_ID_ALL)) {
        var i = 1;
        while (true) {
            if (String(i).length < 3)
                var num = "." + ("000" + String(i)).slice(-3);
            else
                var num = "." + String(i);
            new_name = obj.name + num;
            if(!get_object_by_name(obj.name, _all_objects["ALL"], false,
                                   DATA_ID_ALL)) {
                obj.name = new_name;
                m_print.error("object \"" + obj.name + "\" already exists. "
                        + "Name was replaced by \"" + new_name + "\".");
                break;
            }
            i++;
        }
    }
    add_object(new_obj);

    return new_obj;
}

function copy_bpy_object_props_by_link(obj) {
    if (obj instanceof Array)
        return obj.slice();
    else
        return obj;
}
exports.get_value_node_ind_by_id = function(obj, id) {
    var value_inds = obj.render.mats_value_inds;
    for (var i = 0; i < value_inds.length; i+=2) {
        if (value_inds[i] == id)
            return value_inds[i+1]
    }
    return null;
}

exports.get_rgb_node_ind_by_id = function(obj, id) {
    var rgb_inds = obj.render.mats_rgb_inds;
    for (var i = 0; i < rgb_inds.length; i+=2) {
        if (rgb_inds[i] == id)
            return rgb_inds[i+1]
    }
    return null;
}

function prepare_physics_settings(bpy_obj, obj) {

    obj.is_vehicle = bpy_obj["b4w_vehicle"];
    obj.is_character = bpy_obj["b4w_character"];
    obj.is_floating = bpy_obj["b4w_floating"];
    obj.use_obj_physics = bpy_obj["b4w_collision"];

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

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];

        if (batch.type != "MAIN")
            continue;

        var vbo_array = batch.bufs_data.vbo_array;

        var pointers = batches[i].bufs_data.pointers;

        var pos_offset = pointers["a_position"].offset;
        var pos_length = pointers["a_position"].length + pos_offset;

        max_x = min_x = vbo_array[pos_offset];
        max_y = min_y = vbo_array[pos_offset + 1];
        max_z = min_z = vbo_array[pos_offset + 2];

        for (var j = pos_offset; j < pos_length; j = j + 3) {
            var x = vbo_array[j];
            var y = vbo_array[j + 1];
            var z = vbo_array[j + 2];

            max_x = Math.max(x, max_x);
            max_y = Math.max(y, max_y);
            max_z = Math.max(z, max_z);

            min_x = Math.min(x, min_x);
            min_y = Math.min(y, min_y);
            min_z = Math.min(z, min_z);

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

            var vbo_array = batch.bufs_data.vbo_array;
            var pointers = batches[i].bufs_data.pointers;

            var pos_offset = pointers["a_position"].offset;
            var pos_length = pointers["a_position"].length + pos_offset;

            for (var j = pos_offset; j < pos_length; j = j + 3) {
                var x = vbo_array[j];
                var y = vbo_array[j + 1];
                var z = vbo_array[j + 2];

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
    var bs_local = m_bounds.create_bounding_sphere(s_rad, bs_center);
    render.bs_local = bs_local;

    // bounding ellipsoid
    var be_local = m_bounds.create_bounding_ellipsoid(
            [be_axes[0], 0, 0], [0, be_axes[1], 0], [0, 0, be_axes[2]], be_center);
    render.be_local = be_local;

    m_trans.update_transform(obj);

    if (cfg_def.wireframe_debug)
        for (var i = 0; i < batches.length; i++) {

            if (batches[i].type === "WIREFRAME" && batches[i].debug_sphere) {
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

exports.add_object = add_object;
function add_object(obj) {
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
 * Get all objects derived from the source bpy objects on a certain scene 
 */
exports.get_scene_objs_derived = function(scene, type, data_id) {
    var objs_by_type = _all_objects[type] || [];
    var objs = [];
    for (var i = 0; i < objs_by_type.length; i++) {

        var obj = objs_by_type[i];
        if (obj.render.data_id != data_id && data_id != DATA_ID_ALL || !obj.temp_bpy_obj)
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

exports.update_all_mesh_shaders = function(scene) {
    var lamps = get_scene_objs(scene, "LAMP", DATA_ID_ALL);
    var objs = get_scene_objs(scene, "MESH", DATA_ID_ALL);
    for (var i = 0; i < objs.length; i++) {
        var sc_data = m_obj_util.get_scene_data(objs[i], scene);
        var batches = sc_data.batches;
        for (var j = 0; j < batches.length; j++) {
            var batch = batches[j];
            if (batch.type != "MAIN")
                continue;
            m_batch.update_batch_lights(batch, lamps, scene);
            m_batch.update_shader(batch);
        }
    }
}

exports.get_selectable_objects = function(scene) {
    var sel_objects = [];
    var objects = _all_objects["MESH"];
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        if (obj.render.selectable)
            sel_objects.push(obj);
    }
    return sel_objects;
}

exports.get_object = function() {
    var obj_found = null;
    var obj_name = "";
    var objs = _all_objects["ALL"];

    switch (arguments[0]) {
    case exports.GET_OBJECT_BY_NAME:
        obj_name = arguments[1];
        obj_found = get_object_by_name(arguments[1], objs, false, arguments[2]);
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

        if (obj_name == name && obj.render.data_id == data_id) {
            obj_found = obj;
            break;
        }
    }

    return obj_found;
}

function get_object_by_dupli_name(empty_name, dupli_name, objects, data_id) {
    var obj_found = null;

    var empty_obj = get_object_by_name(empty_name, objects, false, data_id);
    if (empty_obj && empty_obj.temp_bpy_obj["dupli_group"]) {
        var bpy_dg_objs = empty_obj.temp_bpy_obj["dupli_group"]["objects"];
        var dg_objs = [];
        for (var i = 0; i < bpy_dg_objs.length; i++)
            dg_objs.push(bpy_dg_objs[i]._object);

        obj_found = get_object_by_name(dupli_name, dg_objs, true, data_id);
    }

    return obj_found;
}

function get_object_by_dupli_name_list(name_list, objects, data_id) {
    var obj_found = null;

    for (var i = 0; i < name_list.length; i++) {
        obj_found = get_object_by_name(name_list[i], objects, i != 0, data_id);

        if (obj_found && obj_found.temp_bpy_obj["dupli_group"]) {
            var bpy_dg_objs = obj_found.temp_bpy_obj["dupli_group"]["objects"];
            var dg_objs = [];
            for (var j = 0; j < bpy_dg_objs.length; j++)
                dg_objs.push(bpy_dg_objs[j]._object);

            objects = dg_objs;
        } else
            break;
    }

    return obj_found;
}

function update_obj_outline_intensity(obj, timeline) {
    var outline_intensity = 0;
    var ga_settings = obj._outline_anim;
    if (ga_settings.time_start == 0)
        ga_settings.time_start = timeline;

    var dt = timeline - ga_settings.time_start;
    if (ga_settings.relapses && dt / ga_settings.period >= ga_settings.relapses) {
        clear_outline_anim(obj);
        return;
    }

    var periodic_time = dt % ga_settings.period;
    if (periodic_time < ga_settings.outline_time) {
        var outline_time = periodic_time / (ga_settings.outline_time / 5);
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

exports.check_object = function(obj, scene) {
    if (_all_objects[obj["type"]] &&
            _all_objects[obj["type"]].indexOf(obj) > -1)
        return true;
    else
        return false;
}

exports.pick_object = function(canvas_x, canvas_y) {

    var main_scene = m_scenes.get_main();
    if (!main_scene) {
        m_print.error("No active scene");
        return null;
    }

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
                    if (cfg_out.outlining_overview_mode) {
                        m_scenes.set_outline_color(cfg_out.outline_color);
                        render.outline_intensity = cfg_out.outline_intensity;

                        exports.apply_outline_anim(sobjs[i], cfg_out.outline_duration,
                                cfg_out.outline_period, cfg_out.outline_relapses);
                    } else {
                        m_scenes.set_outline_color(main_scene["b4w_outline_color"]);
                        render.outline_intensity = main_scene["b4w_outline_factor"];

                        var ga = render.outline_anim_settings;
                        exports.apply_outline_anim(sobjs[i], ga.outline_duration,
                                ga.outline_period, ga.outline_relapses);
                    }
                }
                return sobjs[i];
            }
        }
    }

    return null;
}

exports.set_wind_params = function(scene, wind_params) {

    // get wind object
    var objs = get_scene_objs(scene, "EMPTY", DATA_ID_ALL);
    for (var i = 0; i < objs.length; i++) {
        var obj = objs[i];
        if (obj.field && obj.field.type === "WIND")
            var wind_obj = obj;
    }

    if (!wind_obj) {
        m_print.error("There is no wind on the scene");
        return 0;
    }

    if (typeof wind_params.wind_dir == "number") {
        var angle =  (wind_params.wind_dir) / 180 * Math.PI;

        // New rotation
        m_vec3.set(-Math.PI / 2, angle, 0, _vec3_tmp);
        m_util.euler_to_quat(_vec3_tmp, _quat4_tmp);

        m_trans.set_rotation(wind_obj, _quat4_tmp);
        update_force(wind_obj);
    }

    if (typeof wind_params.wind_strength == "number") {
        wind_obj.field.strength = wind_params.wind_strength;
        update_force(wind_obj);
    }
    m_scenes.update_scene_permanent_uniforms(scene);
}

exports.get_parent = function(obj) {
    return !obj.parent_is_dupli ? obj.parent : null;
}

exports.get_dg_parent = get_dg_parent;
function get_dg_parent(obj) {
    if (obj.parent_is_dupli)
        return obj.parent;
    else if (obj.parent)
        return get_dg_parent(obj.parent);
    else
        return null;
}

exports.remove_object = function(obj) {
    if (m_cons.check_constraint(obj))
        m_cons.remove(obj);

    if (obj.parent_is_dupli && obj.parent && obj.parent.temp_bpy_obj["dupli_group"]["objects"]) {
        var ind = obj.parent.temp_bpy_obj["dupli_group"]["objects"].indexOf(obj);
        if (ind != -1)
            obj.parent.temp_bpy_obj["dupli_group"]["objects"].splice(ind, 1);
    }

    var all_objs = _all_objects["ALL"];
    var typed_objs = _all_objects[obj.type];
    var ind_all = all_objs.indexOf(obj);
    var ind_typed = typed_objs.indexOf(obj);

    if (ind_all != -1)
        all_objs.splice(ind_all, 1);
    if (ind_typed != -1)
        typed_objs.splice(ind_typed, 1);
}

}
