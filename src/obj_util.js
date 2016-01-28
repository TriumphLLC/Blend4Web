/**
 * Copyright (C) 2014-2015 Triumph LLC
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
 * Objects utility functions
 * @name obj_util
 * @namespace
 * @exports exports as obj_util
 */
b4w.module["__obj_util"] = function(exports, require) {

var m_tsr    = require("__tsr");
var m_util   = require("__util");
var m_vec3   = require("__vec3");
var m_vec4   = require("__vec4");
var m_cfg    = require("__config");

var cfg_def = m_cfg.defaults;

var _vec4_tmp   = new Float32Array(4);
var _quat4_tmp  = new Float32Array(4);
var _quat4_tmp2 = new Float32Array(4);
var _tsr_tmp    = m_tsr.create();
var _tsr_tmp2   = m_tsr.create();

var DEBUG_DISABLE_STATIC_OBJS = false;

/**
 * Create abstract render
 * @param {String} type "DYNAMIC", "STATIC", "CAMERA", "EMPTY", "NONE"
 */
exports.create_render = create_render;
function create_render(type) {

    var render = {
        // common properties
        id: 0,
        type: type,
        data_id: 0,
        grid_id: [0, 0],
        world_tsr: m_tsr.create_ext(),
        pivot: new Float32Array(3),
        hover_pivot: new Float32Array(3),
        init_dist: 0,
        init_top: 0,
        is_copied: false,

        color_id: null,
        outline_intensity: 0,
        // correct only for TARGET camera
        target_cam_upside_down: false,
        vertical_axis: m_vec3.create(),

        use_panning: false,

        move_style: 0,
        velocity_trans: 1,
        velocity_rot: 1,
        velocity_zoom: 1,
        dof_distance: 0,
        dof_front: 0,
        dof_rear: 0,
        dof_power: 0,
        dof_object: null,
        underwater: false,

        horizontal_limits: null,
        vertical_limits: null,
        distance_limits: null,
        hover_vert_trans_limits: null,
        hover_horiz_trans_limits: null,

        enable_hover_hor_rotation: true,
        hover_zero_level: 0,
        cameras: null,
        shadow_cameras: null,
        
        outline_anim_settings_default: {
            outline_duration: 1,
            outline_period: 1,
            outline_relapses: 0
        },
        
        cube_reflection_id: null,
        plane_reflection_id: null,
        reflection_plane: new Float32Array(4),

        // game/physics/lod properties
        friction: 0,
        elasticity: 0,
        lod_dist_max: 0,
        lod_dist_min: 0,
        lod_transition_ratio: 0,

        // rendering flags
        do_not_render: false,
        shadow_cast: false,
        shadow_receive: false,
        shadow_cast_only: false,
        reflexible: false,
        reflexible_only: false,
        reflective: false,
        reflection_type: "",
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
        outlining: false,
        origin_outlining: false,
        outline_on_select: false,
        is_hair_particles: false,
        is_visible: false,
        force_zsort: false,

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
        billboard: false,
        billboard_pres_glob_orientation: false,
        billboard_type: "",
        billboard_spherical: false,

        // animation properties
        frame_factor: 0,
        time: 0,
        va_frame: 0,
        va_frame_factor: 0,
        max_bones: 0,
        frames_blending: false,
        vertex_anim: false,
        use_shape_keys: false,
        shape_keys_values: [],
        is_skinning: false,
        anim_mixing: false,
        anim_mix_factor: 1.0,
        anim_mix_factor_change_speed: 0,
        anim_destination_mix_factor: 1.0,
        two_last_skeletal_slots: new Int8Array([-1, -1]),
        skinned_renders: [],
        mesh_to_arm_bone_maps: [],
        skinning_data_cache: [],
        quats_before: null,
        quats_after: null,
        trans_before: null,
        trans_after: null,
        bone_pointers: null,
        bone_skinning_info: null,
        pose_data: null,
        arm_rel_trans: null,
        arm_rel_quat: null,

        mats_values: null,
        mats_value_inds: null,
        mats_anim_inds: null,
        mats_rgbs: null,
        mats_rgb_inds: null,
        mats_rgb_anim_inds: null,

        // bounding volumes properties
        bb_original: null,
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
    render.lod_dist_max = 10000;
    m_vec3.copy(m_util.AXIS_Y, render.vertical_axis);

    return render;
}

/**
 * Create empty object
 */
exports.create_object = create_object;
function create_object(name, type, origin_name) {
    if (!origin_name)
        origin_name = name;

    var obj = {

        name: name,
        uuid: m_util.gen_uuid(),
        origin_name: origin_name,
        type: type,

        bpy_origin: false,

        is_dynamic: false,
        is_hair_dupli: false,
        use_default_animation: false,
        
        render: null,
        constraint: null,
        sfx: null,
        light: null,
        armobj: null,
        anchor: null,
        field: null,
        metatags: null,

        scenes_data: [],
        vertex_anim: [],
        cons_descends: [],
        cons_armat_bone_descends: [],
        anim_slots: [],
        reflective_objs: [],
        nla_events: [],
        action_anim_cache: [],

        sensor_manifolds : null,
        sensor_manifolds_arr : [],
        
        parent: null,
        parent_is_dupli: false,
        parent_bone: "",
        viewport_alignment: null,

        use_obj_physics: false,
        collision_id: "",
        correct_bounding_offset: "AUTO",
        is_vehicle: false,
        is_character: false,
        is_floating: false,

        physics: null,
        vehicle: null,
        floater: null,

        vehicle_settings: null,
        floating_settings: null,
        character_settings: null,

        physics_constraints: [],
        physics_settings: {
            physics_type:           "NO_COLLISION",
            use_ghost:              false,
            use_sleep:              false,
            mass:                   0,
            velocity_min:           0,
            velocity_max:           0,
            damping:                0,
            rotation_damping:       0,
            lock_location_x:        false,
            lock_location_y:        false,
            lock_location_z:        false,
            lock_rotation_x:        false,
            lock_rotation_y:        false,
            lock_rotation_z:        false,
            collision_margin:       0,
            collision_group:        0,
            collision_mask:         0,
            use_collision_bounds:   false,
            collision_bounds_type:  "BOX",
            use_collision_compound: false
        },

        outline_animation: {
            time_start: 0,
            outline_time: 0,
            period: 0,
            relapses: 0
        },

        anim_behavior_def: 0,
        actions: [],

        need_update_transform: false, // used for armature bones constraints
        meta_objects : []
    };
    return obj;
}

exports.copy_bpy_object_props_by_link = function(obj) {
    if (obj instanceof Array)
        return obj.slice();
    else
        return obj;
}

exports.copy_object_props_by_value = copy_object_props_by_value;
function copy_object_props_by_value(obj) {

    // better than typeof - no need to check for null
    if (!(obj instanceof Object)) {
        return obj;
    }

    var textures = null;
    var texture_names = null;
    var shape_keys = null;

    if (obj.textures) {
        textures = obj.textures;
        obj.textures = null;
    }
    if (obj.texture_names) {
        texture_names = obj.texture_names;
        obj.texture_names = null;
    }
    if (obj.shape_keys) {
        shape_keys = obj.shape_keys;
        obj.shape_keys = null;
    }

    var obj_clone;
    var Constructor = obj.constructor;

    switch (Constructor) {
    case Float32Array:
    case Uint32Array:
    case Uint16Array:
        obj_clone = new Constructor(obj);
        break;
    case Array:
        obj_clone = new Constructor(obj.length);

        for (var i = 0; i < obj.length; i++)
            obj_clone[i] = copy_object_props_by_value(obj[i]);
        break;
    case WebGLUniformLocation:
    case WebGLProgram:
    case WebGLShader:
        obj_clone = obj;
        break;
    case WebGLFramebuffer:
    case WebGLTexture:
    case WebGLBuffer:
        // NOTE: update geometry will be later
        obj_clone = null;
        break;
    case Function:
        obj_clone = obj;
        break;
    default:
        obj_clone = new Constructor();

        for (var prop in obj)
            obj_clone[prop] = copy_object_props_by_value(obj[prop]);
        break;
    }

    if (textures) {
        obj_clone.textures = textures;
        obj.textures = textures;
    }

    if (texture_names) {
        obj_clone.texture_names = texture_names;
        obj.texture_names = texture_names;
    }
    if (shape_keys) {
        obj_clone.shape_keys = shape_keys;
        obj.shape_keys = shape_keys;
    }

    return obj_clone;
}

exports.is_dynamic = function(obj) {
    return obj.is_dynamic;
}

exports.is_dynamic_mesh = function(obj) {
    return obj.type == "MESH" && obj.is_dynamic;
}

exports.append_scene_data = function(obj, scene) {
    var sc_data = init_scene_data(scene);
    obj.scenes_data.push(sc_data);
}

exports.append_batch = function(obj, scene, batch) {
    var sc_data = get_scene_data(obj, scene);
    sc_data.batches.push(batch);
}

exports.remove_scene_data = function(obj, scene) {
    var scenes_data = obj.scenes_data;
    for (var i = 0; i < scenes_data.length; i++) {
        var sc_data = scenes_data[i];
        if (sc_data.scene == scene) {
            scenes_data.splice(i,1);
            break;
        }
    }
}

exports.get_scene_data = get_scene_data;
function get_scene_data(obj, scene) {
    var scenes_data = obj.scenes_data;
    for (var i = 0; i < scenes_data.length; i++) {
        var sc_data = scenes_data[i];
        if (sc_data.scene == scene)
            return sc_data;
    }
    return null;
}

exports.update_refl_objects = function (objects, reflection_plane) {
    for (var i = 0; i < objects.length; i++) {
        m_vec4.copy(reflection_plane,
                    objects[i].render.reflection_plane);
    }
}

function init_scene_data(scene) {
    var sc_data = {
        scene: scene,
        is_active: false,
        batches: [],
        plane_refl_subs: [],
        cube_refl_subs: null,
        shadow_subscenes: [],
        light_index: 0,
        obj_has_nla_on_scene: false
    }
    return sc_data;
}

exports.scene_data_set_active = function(obj, flag, scene) {
    for (var i = 0; i < obj.scenes_data.length; i++) {
        var sc_data = obj.scenes_data[i];
        // undefined scene means that all scenes will be processed
        if (!scene || sc_data.scene == scene)
            sc_data.is_active = flag;
    }
}

exports.get_shadow_lamps = function(lamps, use_ssao) {
    var shadow_lamps = [];
    var max_shadow_lamps_num = use_ssao ? cfg_def.max_cast_lamps - 1 :
            cfg_def.max_cast_lamps;
    for (var i = 0; i < lamps.length; i++) {
        var lamp = lamps[i];
        if (lamp.light.generate_shadows && shadow_lamps.length < max_shadow_lamps_num)
            shadow_lamps.push(lamp);
    }

    if (shadow_lamps.length)
        return shadow_lamps;
    else if (lamps[0])
        return [lamps[0]];
    else
        return [];
}


exports.check_obj_soft_particles_accessibility = function(bpy_obj, pset) {

    if (pset["b4w_enable_soft_particles"] &&
            pset["b4w_particles_softness"] > 0.0) {
        var index = pset["material"] - 1;
        var materials = bpy_obj["data"]["materials"];
        if (index >= 0 && index < materials.length &&
            (materials[index]["game_settings"]["alpha_blend"] == "ADD" ||
            materials[index]["game_settings"]["alpha_blend"] == "ALPHA" ||
            materials[index]["game_settings"]["alpha_blend"] == "ALPHA_SORT"))
            return true;
    }

    return false;
}

exports.gen_dupli_name = function(dg_parent_name, name) {
    return dg_parent_name + "*" + name;
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

exports.get_dg_objects = function(dg_parent, objects) {
    var dg_objs = [];
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        if (get_dg_parent(obj) == dg_parent)
            dg_objs.push(obj);
    }
    return dg_objs;
}

exports.is_mesh = function(obj) {
    return obj.type === "MESH";
}

exports.is_armature = function(obj) {
    return obj.type === "ARMATURE";
}

exports.is_speaker = function(obj) {
    return obj.type === "SPEAKER";
}

exports.is_camera = function(obj) {
    return obj.type === "CAMERA";
}

exports.is_lamp = function(obj) {
    return obj.type === "LAMP";
}

exports.is_empty = function(obj) {
    return obj.type === "EMPTY";
}

exports.is_line = function(obj) {
    return obj.type === "LINE";
}

}
