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
 * Objects utility functions
 * @name obj_util
 * @namespace
 * @exports exports as obj_util
 */
b4w.module["__obj_util"] = function(exports, require) {

var m_bounds = require("__boundings");
var m_cfg    = require("__config");
var m_tsr    = require("__tsr");
var m_util   = require("__util");
var m_vec3   = require("__vec3");
var m_vec4   = require("__vec4");

var cfg_def = m_cfg.defaults;

var _vec4_tmp   = new Float32Array(4);
var _quat4_tmp  = new Float32Array(4);
var _quat4_tmp2 = new Float32Array(4);
var _tsr_tmp    = m_tsr.create();
var _tsr_tmp2   = m_tsr.create();

var DEBUG_DISABLE_STATIC_OBJS = false;

var LOD_DIST_MAX_INFINITY = -1;
exports.LOD_DIST_MAX_INFINITY = LOD_DIST_MAX_INFINITY;

/**
 * Create abstract render
 * @param {String} type "DYNAMIC", "STATIC", "CAMERA", "EMPTY", "NONE"
 */
exports.create_render = create_render;
function create_render(type) {

    var render = {
        // common properties
        type: type,
        id: 0,
        data_id: 0,
        world_tsr: m_tsr.create_ext(),
        world_tsr_inv: m_tsr.create_ext(),
        pivot: new Float32Array(3),
        hover_pivot: new Float32Array(3),
        init_dist: 0,
        init_top: 0,
        is_copied: false,
        is_copied_deep: false,

        color_id: null,
        outline_intensity: 0,
        // used only for TARGET camera
        target_cam_upside_down: false,
        vertical_axis: m_vec3.create(),

        use_panning: false,

        move_style: 0,
        velocity_trans: 1,
        velocity_rot: 1,
        velocity_zoom: 1,

        dof_distance: 0,
        dof_front_start: 0,
        dof_front_end: 0,
        dof_rear_start: 0,
        dof_rear_end: 0,
        dof_power: 0,
        dof_bokeh_intensity: 0,
        dof_bokeh: false,
        dof_foreground_blur : false,
        dof_object: null,

        underwater: false,

        horizontal_limits: null,
        vertical_limits: null,
        distance_limits: null,
        hover_vert_trans_limits: null,
        hover_horiz_trans_limits: null,

        // currently only for TARGET camera
        pivot_limits: null,

        enable_hover_hor_rotation: true,
        
        outline_anim_settings_default: {
            outline_duration: 1,
            outline_period: 1,
            outline_relapses: 0
        },
        
        cube_reflection_id: -1,
        plane_reflection_id: -1,
        reflection_plane: new Float32Array(4),

        // game/physics/lod properties
        friction: 0,
        elasticity: 0,
        lod_dist_max: LOD_DIST_MAX_INFINITY,
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

        // bounding volumes properties
        bb_original: null,
        bb_local: m_bounds.create_bb(),
        bb_world: m_bounds.create_bb(),
        bs_local: m_bounds.create_bs(),
        bs_world: m_bounds.create_bs(),
        be_local: m_bounds.create_be(),
        be_world: m_bounds.create_be(),
        bbr_local: m_bounds.create_rot_bb(),
        bbr_world: m_bounds.create_rot_bb(),
        bcyl_local: null,
        bcap_local: null,
        bcon_local: null,

        use_batches_boundings: true,
        use_be: false
    }

    // setting default values
    m_vec3.copy(m_util.AXIS_Z, render.vertical_axis);

    return render;
}

exports.clone_render = function(render) {
    var out = create_render(render.type);

    // common properties
    out.id = render.id;
    out.data_id = render.data_id;
    m_tsr.copy(render.world_tsr, out.world_tsr);
    m_tsr.copy(render.world_tsr_inv, out.world_tsr_inv);
    m_vec3.copy(render.pivot, out.pivot);
    m_vec3.copy(render.hover_pivot, out.hover_pivot);
    out.init_dist = render.init_dist;
    out.init_top = render.init_top;
    out.is_copied = render.is_copied;
    out.is_copied_deep = render.is_copied_deep;

    if (render.color_id) // ?
        out.color_id = m_vec3.clone(render.color_id);
    out.outline_intensity = render.outline_intensity;
    out.target_cam_upside_down = render.target_cam_upside_down;
    m_vec3.copy(render.vertical_axis, out.vertical_axis);

    out.use_panning = render.use_panning;

    out.move_style = render.move_style;
    out.velocity_trans = render.velocity_trans;
    out.velocity_rot = render.velocity_rot;
    out.velocity_zoom = render.velocity_zoom;

    out.dof_distance = render.dof_distance;
    out.dof_front_start = render.dof_front_start;
    out.dof_front_end = render.dof_front_end;
    out.dof_rear_start = render.dof_rear_start;
    out.dof_rear_end = render.dof_rear_end;
    out.dof_power = render.dof_power;
    out.dof_bokeh_intensity = render.dof_bokeh_intensity;
    out.dof_bokeh = render.dof_bokeh;
    out.dof_foreground_blur = render.dof_foreground_blur;
    out.dof_object = render.dof_object;

    out.horizontal_limits = m_util.clone_object_r(render.horizontal_limits);
    out.vertical_limits = m_util.clone_object_r(render.vertical_limits);
    out.distance_limits = m_util.clone_object_r(render.distance_limits);
    out.hover_vert_trans_limits = m_util.clone_object_r(render.hover_vert_trans_limits);
    out.hover_horiz_trans_limits = m_util.clone_object_r(render.hover_horiz_trans_limits);

    out.pivot_limits = render.pivot_limits;

    out.enable_hover_hor_rotation = render.enable_hover_hor_rotation;
    out.outline_anim_settings_default.outline_duration =
            render.outline_anim_settings_default.outline_duration;
    out.outline_anim_settings_default.outline_period =
            render.outline_anim_settings_default.outline_period;
    out.outline_anim_settings_default.outline_relapses =
            render.outline_anim_settings_default.outline_relapses;
    out.cube_reflection_id = render.cube_reflection_id;
    out.plane_reflection_id = render.plane_reflection_id;
    out.reflection_plane = render.reflection_plane;

    out.friction = render.friction;
    out.elasticity = render.elasticity;
    out.lod_dist_max = render.lod_dist_max;
    out.lod_dist_min = render.lod_dist_min;
    out.lod_transition_ratio = render.lod_transition_ratio;

    out.do_not_render = render.do_not_render;
    out.shadow_cast = render.shadow_cast;
    out.shadow_receive = render.shadow_receive;
    out.shadow_cast_only = render.shadow_cast_only;
    out.reflexible = render.reflexible;
    out.reflexible_only = render.reflexible_only;
    out.reflective = render.reflective;
    out.reflection_type = render.reflection_type;
    out.caustics = render.caustics;
    out.wind_bending = render.wind_bending;
    out.disable_fogging = render.disable_fogging;
    out.dynamic_geometry = render.dynamic_geometry;
    out.dynamic_grass = render.dynamic_grass;
    out.do_not_cull = render.do_not_cull;
    out.hide = render.hide;
    out.last_lod = render.last_lod;
    out.selectable = render.selectable;
    out.origin_selectable = render.origin_selectable;
    out.outlining = render.outlining;
    out.origin_outlining = render.origin_outlining;
    out.outline_on_select = render.outline_on_select;
    out.is_hair_particles = render.is_hair_particles;
    out.is_visible = render.is_visible;
    out.force_zsort = render.force_zsort;

    out.wind_bending_angle = render.wind_bending_angle;
    out.wind_bending_amp = render.wind_bending_amp;
    out.wind_bending_freq = render.wind_bending_freq;
    out.detail_bending_freq = render.detail_bending_freq;
    out.detail_bending_amp = render.detail_bending_amp;
    out.branch_bending_amp = render.branch_bending_amp;
    out.main_bend_col = render.main_bend_col;
    out.detail_bend_col = render.detail_bend_col;
    out.bend_center_only = render.bend_center_only;

    out.billboard = render.billboard;
    out.billboard_pres_glob_orientation = render.billboard_pres_glob_orientation;
    out.billboard_type = render.billboard_type;
    out.billboard_spherical = render.billboard_spherical;

    out.frame_factor = render.frame_factor;
    out.time = render.time;
    out.va_frame = render.va_frame;
    out.va_frame_factor = render.va_frame_factor;
    out.max_bones = render.max_bones;
    out.frames_blending = render.frames_blending;
    out.vertex_anim = render.vertex_anim;
    out.use_shape_keys = render.use_shape_keys;
    out.shape_keys_values = m_util.clone_object_r(render.shape_keys_values); //?
    out.is_skinning = render.is_skinning;
    out.anim_mixing = render.anim_mixing;
    out.anim_mix_factor = render.anim_mix_factor;
    out.anim_mix_factor_change_speed = render.anim_mix_factor_change_speed;
    out.anim_destination_mix_factor = render.anim_destination_mix_factor;
    out.two_last_skeletal_slots.set(render.two_last_skeletal_slots);
    out.skinned_renders = m_util.clone_object_r(render.skinned_renders); //?
    out.mesh_to_arm_bone_maps = m_util.clone_object_r(render.mesh_to_arm_bone_maps); //?
    out.skinning_data_cache = m_util.clone_object_r(render.skinning_data_cache); // ?
    out.quats_before = m_util.clone_object_r(render.quats_before); //?
    out.quats_after = m_util.clone_object_r(render.quats_after); //?
    out.trans_before = m_util.clone_object_r(render.trans_before); //?
    out.trans_after = m_util.clone_object_r(render.trans_after); //?
    out.bone_pointers = m_util.clone_object_r(render.bone_pointers); //?
    out.bone_skinning_info = m_util.clone_object_r(render.bone_skinning_info); //?
    out.pose_data = m_util.clone_object_r(render.pose_data); //?
    out.arm_rel_trans = m_util.clone_object_r(render.arm_rel_trans); //?
    out.arm_rel_quat = m_util.clone_object_r(render.arm_rel_quat); //?

    out.bb_original = m_util.clone_object_r(render.bb_original);
    m_bounds.copy_bb(render.bb_local, out.bb_local);
    m_bounds.copy_bb(render.bb_world, out.bb_world);
    m_bounds.copy_bs(render.bs_local, out.bs_local);
    m_bounds.copy_bs(render.bs_world, out.bs_world);
    m_bounds.copy_be(render.be_local, out.be_local);
    m_bounds.copy_be(render.be_world, out.be_world);
    out.bcyl_local = m_util.clone_object_r(render.bcyl_local);
    out.bcap_local = m_util.clone_object_r(render.bcap_local);
    out.bcon_local = m_util.clone_object_r(render.bcon_local);

    out.use_batches_boundings = render.use_batches_boundings;

    return out;
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
        cons_descends: m_util.create_non_smi_array(),
        cons_armat_bone_descends: m_util.create_non_smi_array(),
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
        pinverse_tsr: null,

        use_obj_physics: false,
        collision_id: "",
        correct_bounding_offset: "AUTO",
        is_vehicle: false,
        is_character: false,
        is_floating: false,

        bob_synchronize_pos: false,

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
        def_action_slots: [], // slot: {String dest(e.g. material+group), action}

        need_update_transform: false, // used for armature bones constraints
        need_inv_zup_tsr: false, // for MESH only, used in some node materials
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

exports.copy_batches_props_by_link_nr = function(batches) {
    // TODO: remove bounding data from batches
    var new_batches = [];
    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];
        var new_batch = {};
        for (var prop in batch) {
            if (batch[prop] == batch.bb_world)
                new_batch.bb_world = copy_object_props_by_value(batch.bb_world);
            else if (batch[prop] == batch.be_world)
                new_batch.be_world = copy_object_props_by_value(batch.be_world);
            else
                new_batch[prop] = batch[prop];
        }
        new_batches.push(new_batch);
    }
    return new_batches;
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
    var shader = null;
    var vaos = null;

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
    if (obj.shader) {
        shader = obj.shader;
        obj.shader = null;
    }
    if (obj.vaos) {
        vaos = obj.vaos;
        obj.vaos = null;
    }

    var obj_clone;
    var Constructor = obj.constructor;

    switch (Constructor) {
    case Int8Array:
    case Uint8Array:
    case Int16Array:
    case Uint16Array:
    case Int32Array:
    case Uint32Array:
    case Float32Array:
    case Float64Array:
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
    if (shader) {
        obj_clone.shader = shader;
        obj.shader = shader;
    }

    if (vaos) {
        obj_clone.vaos = m_util.create_non_smi_array();
        obj.vaos = vaos;
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
        obj_has_nla_on_scene: false,
        cameras: [],
        shadow_cameras: []
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

exports.check_inv_zup_tsr_is_needed = function(obj) {
    var scenes_data = obj.scenes_data;
    for (var i = 0; i < scenes_data.length; i++) {
        var batches = scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++) {
            var dirs = batches[j].shaders_info.directives;
            for (var k = 0; k < dirs.length; k++) {
                var dir = dirs[k];
                if (dir[0] == "USE_MODEL_MATRIX_INVERSE" && dir[1] == "1")
                    return true;
            }
       }
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

exports.get_object_data_id = function(obj) {
    return obj.render.data_id;
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

exports.is_world = function(obj) {
    return obj.type === "WORLD";
}

}
