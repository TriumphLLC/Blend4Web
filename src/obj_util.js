"use strict";

/**
 * Objects utility functions
 * @name obj_util
 * @namespace
 * @exports exports as obj_util
 */
b4w.module["__obj_util"] = function(exports, require) {

var m_cam   = require("__camera");
var m_mat4  = require("__mat4");
var m_print = require("__print");
var m_quat  = require("__quat");
var m_tsr   = require("__tsr");
var m_vec4  = require("__vec4");


var DEBUG_DISABLE_STATIC_OBJS = false;

/**
 * Create abstract render
 * @param {String} type "DYNAMIC", "STATIC", "CAMERA", "EMPTY", "NONE"
 */
exports.create_render = create_render;
function create_render(type) {

    var render = {
        // common properties
        type: type,
        data_id: 0,
        scale: 0,
        grid_id: [0, 0],
        trans: new Float32Array(3),
        quat: new Float32Array(4),
        tsr: new Float32Array(8),
        world_matrix: new Float32Array(16),
        inv_world_matrix: new Float32Array(16),
        pivot: new Float32Array(3),
        hover_pivot: new Float32Array(3),
        init_dist: 0,
        init_top: 0,
        is_copied: false,

        color_id: null,
        outline_intensity: 0,
        // correct only for TARGET camera
        target_cam_upside_down: false,

        use_panning: false,

        move_style: m_cam.MS_STATIC,
        velocity_trans: 1,
        velocity_rot: 1,
        velocity_zoom: 1,
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
        hover_angle_limits: null,
        enable_hover_hor_rotation: true,
        cameras: null,
        outline_anim_settings: null,
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
    render.scale = 1;
    render.lod_dist_max = 10000;
    m_quat.identity(render.quat);
    m_tsr.identity(render.tsr);
    m_mat4.identity(render.world_matrix);
    m_mat4.identity(render.inv_world_matrix);

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

        // hacks for update_object
        "data": null,

        _sensor_manifolds_arr : [],
        _action_anim_cache: [],
        _sensor_manifolds : null,

        // new object props ("_...")
        name: name,
        origin_name: origin_name,
        type: type,

        is_meta: false,
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
        anim_slots: [],
        reflective_objs: [],
        nla_events: [],
        
        parent: null,
        parent_is_dupli: false,
        parent_bone: "",

        use_obj_physics: false,
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

        temp_bpy_obj: null
    };
    return obj;
}

exports.create_meta_object = function(name, type) {
    var obj = create_object(name, type);
    obj.is_meta = true;

    // HACK: tmp
    obj["particle_systems"] = [];
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
        plane_refl_subs: null,
        cube_refl_subs: null,
        shadow_subscenes: [],
        light_index: 0
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

exports.get_first_lamp_with_shadows = function(lamps) {
    for (var i = 0; i < lamps.length; i++) {
        var lamp = lamps[i];
        if (lamp.light.generate_shadows)
            return lamp;
    }
    return null;
}

}
