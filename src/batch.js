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
 * Batch internal API.
 * @name batch
 * @namespace
 * @exports exports as batch
 */
b4w.module["__batch"] = function(exports, require) {

var m_bounds     = require("__boundings");
var m_cfg        = require("__config");
var m_print      = require("__print");
var m_extensions = require("__extensions");
var m_graph      = require("__graph");
var m_mat3       = require("__mat3");
var m_nodemat    = require("__nodemat");
var m_obj_util   = require("__obj_util");
var m_particles  = require("__particles");
var m_primitives = require("__primitives");
var m_quat       = require("__quat");
var m_reformer   = require("__reformer");
var m_render     = require("__renderer");
var m_scenegraph = require("__scenegraph");
var m_shaders    = require("__shaders");
var m_subs       = require("__subscene");
var m_textures   = require("__textures");
var m_tsr        = require("__tsr");
var m_geom       = require("__geometry");
var m_util       = require("__util");
var m_vec3       = require("__vec3");
var m_vec4       = require("__vec4");

var cfg_def = m_cfg.defaults;
var cfg_lim = m_cfg.context_limits;

var DEBUG_SAVE_SUBMESHES = false;
var DEBUG_KEEP_BUFS_DATA_ARRAYS = false;

var BATCH_TYPES_DEBUG_SPHERE = ["MAIN"];
var STREE_CELL_COUNT = 20;

// rotation quat around Z axis for particles system
var DEFAULT_PART_SYS_QUAT = new Float32Array([0, 0, -Math.sqrt(0.5), Math.sqrt(0.5)]);

var MAX_PARTICLES_COEF = 2 * 100 * 1000;
var SINGLE_INST_ARR = 1;
var WH_GR_INST_ARR = 2;

var _vec3_tmp = new Float32Array(3);
var _vec3_tmp2 = new Float32Array(3);
var _vec3_tmp3 = new Float32Array(3);
var _vec4_tmp = new Float32Array(4);

var _tsr_tmp = m_tsr.create();
var _mat3_tmp = m_mat3.create();

exports.BATCH_INHERITED_TEXTURES = BATCH_INHERITED_TEXTURES
var BATCH_INHERITED_TEXTURES = ["u_colormap0", "u_colormap1", "u_stencil0",
    "u_specmap0", "u_normalmap0", "u_mirrormap"];

var _batch_debug_storage = {};

exports.batch_get_debug_storage = batch_get_debug_storage;
function batch_get_debug_storage(batch_id) {
    return _batch_debug_storage[batch_id] || null;
}

exports.batch_set_debug_storage = batch_set_debug_storage;
function batch_set_debug_storage(batch_id, value) {
    _batch_debug_storage[batch_id] = value;
}

/**
 * Create abstract batch
 * @param type Batch type: MAIN, SHADOW,...
 */
function init_batch(type) {

    // initialize properties (do not consider values as default!)
    var batch = {
        type: type,
        subtype: "",

        id: 0,
        render_id: 0,
        cluster_id: -1,
        odd_id_prop: "",

        // properties for DEBUG_VIEW batch
        debug_id_color: -1,
        debug_main_batch_id: -1, // link to the MAIN batch with the same material
        debug_main_batch_render_time: 0,
        debug_render_time: 0,
        debug_render_time_queries: [],

        textures: [],
        texture_names: [],
        material_names: [],

        common_attributes: [],
        uv_maps_usage: null,
        vertex_colors_usage: {},

        shader: null,
        shaders_info: {
                       vert: null,
                       frag: null,
                       directives: [],
                       node_elements: [],
                       status: m_shaders.VALID,
                       frag_uniform_count: 0,
                       vert_uniform_count: 0,
                       attribute_count: 0,
                       texture_count: 0
                      },
        ngraph_proxy_id: "",
        attribute_setters: [],
        bufs_data: null,
        vaos: m_util.create_non_smi_array(),

        use_shape_keys: false,

        debug_sphere: false,
        debug_sphere_dynamic: false,
        num_vertices: 0,
        num_triangles: 0,
        jitter_amp: 0,
        jitter_freq: 0,
        grass_scale_threshold: 0,
        grass_size: 0,
        grass_map_dim: new Float32Array(3),
        cube_fog: new Float32Array(16),

        // rendering properties
        alpha_clip: false,
        blend: false,
        depth_mask: false,
        xray: false,
        use_backface_culling: false,
        use_shadeless: false,
        dynamic_geometry: false,
        shadow_cast: false,
        shadow_cast_only: false,
        shadow_receive: false,
        reflexible: false,
        reflexible_only: false,
        reflective: false,
        dynamic_grass: false,
        draw_proc_sky: false,
        draw_mode: m_geom.DM_DEFAULT,
        z_sort: false,
        forked_batch : false,

        // halo material properties
        halo: false,
        halo_size: 0,
        halo_hardness: 0,
        halo_stars_blend: 0,
        halo_stars_height: 0,
        halo_rings_color: new Float32Array(3),
        halo_lines_color: new Float32Array(3),

        halo_particles: false,

        // common material/texture properties
        ambient: 0,
        emit: 0,
        diffuse_intensity: 1,
        reflect_factor: 0,
        specular_color_factor: 0,
        specular_alpha: 1,
        parallax_scale: 0,
        diffuse_color_factor: 0,
        alpha_factor: 1,
        normal_factor: 0,
        mirror_factor: 0,
        offset_z: 0,
        refr_bump: 0,
        diffuse_params: new Array(2),
        specular_params: new Float32Array(3),
        texture_scale: new Float32Array(3),
        specular_color: new Float32Array(3),
        diffuse_color: new Float32Array(4),
        fresnel_params: new Float32Array(4),
        lamp_uuid_indexes: null,
        lamp_light_positions: null,
        lamp_light_directions: null,
        lamp_light_color_intensities: null,
        has_nodes: false,

        wireframe_edge_color: m_vec3.create(),

        // water material properties
        water: false,
        water_dynamic: false,
        water_shore_smoothing: false,
        water_generated_mesh: false,
        water_num_cascads: 0,
        water_subdivs: 0,
        water_detailed_dist: 0,
        water_norm_uv_velocity: 0.1,
        shallow_water_col_fac: 0,
        shore_water_col_fac: 0,
        foam_factor: 0,
        foam_uv_freq: new Float32Array(2),
        foam_mag: new Float32Array(2),
        foam_scale: new Float32Array(2),
        shallow_water_col: new Float32Array(3),
        shore_water_col: new Float32Array(3),
        normalmap_scales: null,
        refractive: false,

        // emitter particles data
        particles_data: null,

        // line params
        line_width: 0,

        // anchor params
        anchor_positions: null,

        part_use_tangent: false,
        part_node_data : null,

        node_values: [],
        node_value_inds: [],
        node_rgbs: [],
        node_rgb_inds: [],

        bb_local: null,
        bb_world: null,

        bs_local: null,
        bs_world: null,

        be_world: null,
        be_local: null,

        use_be: false,

        cleanup_gl_data_on_unload: true,
        shader_updated: false,

        inst_array_state: 0,
        navmesh: null
    }

    // setting default values
    batch.diffuse_color[3] = 1;
    batch.depth_mask = true;
    batch.line_width = 1.0;

    return batch;
}

function clone_batch(batch) {

    var batch_new = init_batch(batch.type);

    batch_new.subtype = batch.subtype;

    batch_new.id = batch.id;
    batch_new.render_id = batch.render_id;
    batch_new.cluster_id = batch.cluster_id;
    batch_new.odd_id_prop = batch.odd_id_prop;

    // properties for DEBUG_VIEW batch
    batch_new.debug_id_color = batch.debug_id_color;
    batch_new.debug_main_batch_id = batch.debug_main_batch_id;
    batch_new.debug_main_batch_render_time = batch.debug_main_batch_render_time;
    batch_new.debug_render_time = batch.debug_render_time;
    batch_new.debug_render_time_queries = [];

    batch_new.textures = batch.textures.slice();
    batch_new.texture_names = batch.texture_names.slice();
    batch_new.material_names = batch.material_names.slice();

    batch_new.common_attributes = batch.common_attributes.slice();
    batch_new.uv_maps_usage = m_util.clone_object_r(batch.uv_maps_usage);
    batch_new.vertex_colors_usage = m_util.clone_object_r(batch.vertex_colors_usage);

    // NOTE: by link
    batch_new.shader = batch.shader;
    batch_new.shaders_info = m_util.clone_object_r(batch.shaders_info);

    batch_new.ngraph_proxy_id = batch.ngraph_proxy_id;
    batch_new.attribute_setters =
            m_render.clone_attribute_setters(batch.attribute_setters);
    // NOTE: by link
    batch_new.bufs_data = batch.bufs_data;

    batch_new.use_shape_keys = batch.use_shape_keys;

    batch_new.debug_sphere = batch.debug_sphere;
    batch_new.debug_sphere_dynamic = batch.debug_sphere_dynamic;
    batch_new.num_vertices = batch.num_vertices;
    batch_new.num_triangles = batch.num_triangles;
    batch_new.jitter_amp = batch.jitter_amp;
    batch_new.jitter_freq = batch.jitter_freq;
    batch_new.grass_scale_threshold = batch.grass_scale_threshold;
    batch_new.grass_size = batch.grass_size;
    // NOTE: a link from subscene
    batch_new.grass_map_dim = batch.grass_map_dim;
    // NOTE: a link from subscene
    batch_new.cube_fog = batch.cube_fog;

    // rendering properties
    batch_new.alpha_clip = batch.alpha_clip;
    batch_new.blend = batch.blend;
    batch_new.depth_mask = batch.depth_mask;
    batch_new.xray = batch.xray;
    batch_new.use_backface_culling = batch.use_backface_culling;
    batch_new.use_shadeless = batch.use_shadeless;
    batch_new.dynamic_geometry = batch.dynamic_geometry;
    batch_new.shadow_cast = batch.shadow_cast;
    batch_new.shadow_cast_only = batch.shadow_cast_only;
    batch_new.shadow_receive = batch.shadow_receive;
    batch_new.reflexible = batch.reflexible;
    batch_new.reflexible_only = batch.reflexible_only;
    batch_new.reflective = batch.reflective;
    batch_new.dynamic_grass = batch.dynamic_grass;
    batch_new.draw_proc_sky = batch.draw_proc_sky;
    batch_new.draw_mode = batch.draw_mode;
    batch_new.z_sort = batch.z_sort;
    batch_new.forked_batch = batch.forked_batch;

    // halo material properties
    batch_new.halo = batch.halo;
    batch_new.halo_size = batch.halo_size;
    batch_new.halo_hardness = batch.halo_hardness;
    batch_new.halo_stars_blend = batch.halo_stars_blend;
    batch_new.halo_stars_height = batch.halo_stars_height;
    m_vec3.copy(batch.halo_rings_color, batch_new.halo_rings_color);
    m_vec3.copy(batch.halo_lines_color, batch_new.halo_lines_color);

    batch_new.halo_particles = batch.halo_particles;

    // common material/texture properties
    batch_new.ambient = batch.ambient;
    batch_new.emit = batch.emit;
    batch_new.diffuse_intensity = batch.diffuse_intensity;
    batch_new.reflect_factor = batch.reflect_factor;
    batch_new.specular_color_factor = batch.specular_color_factor;
    batch_new.specular_alpha = batch.specular_alpha;
    batch_new.parallax_scale = batch.parallax_scale;
    batch_new.diffuse_color_factor = batch.diffuse_color_factor;
    batch_new.alpha_factor = batch.alpha_factor;
    batch_new.normal_factor = batch.normal_factor;
    batch_new.mirror_factor = batch.mirror_factor;
    batch_new.offset_z = batch.offset_z;
    batch_new.refr_bump = batch.refr_bump;
    batch_new.diffuse_params = batch.diffuse_params.slice();
    m_vec3.copy(batch.specular_params, batch_new.specular_params);
    m_vec3.copy(batch.texture_scale, batch_new.texture_scale);
    m_vec3.copy(batch.specular_color, batch_new.specular_color);
    m_vec4.copy(batch.diffuse_color, batch_new.diffuse_color);
    m_vec4.copy(batch.fresnel_params, batch_new.fresnel_params);

    batch_new.lamp_uuid_indexes = m_util.clone_object_r(batch.lamp_uuid_indexes);
    if (batch.lamp_light_positions) {
        batch_new.lamp_light_positions = new Float32Array(batch.lamp_light_positions);
        batch_new.lamp_light_directions = new Float32Array(batch.lamp_light_directions);
        batch_new.lamp_light_color_intensities =
                new Float32Array(batch.lamp_light_color_intensities);
    }

    batch_new.has_nodes = batch.has_nodes;

    m_vec3.copy(batch.wireframe_edge_color, batch_new.wireframe_edge_color);

    // water material properties
    batch_new.water = batch.water;
    batch_new.water_dynamic = batch.water_dynamic;
    batch_new.water_shore_smoothing = batch.water_shore_smoothing;
    batch_new.water_generated_mesh = batch.water_generated_mesh;
    batch_new.water_num_cascads = batch.water_num_cascads;
    batch_new.water_subdivs = batch.water_subdivs;
    batch_new.water_detailed_dist = batch.water_detailed_dist;
    batch_new.water_norm_uv_velocity = batch.water_norm_uv_velocity;
    batch_new.shallow_water_col_fac = batch.shallow_water_col_fac;
    batch_new.shore_water_col_fac = batch.shore_water_col_fac;
    batch_new.foam_factor = batch.foam_factor;
    batch_new.foam_uv_freq.set(batch.foam_uv_freq);
    batch_new.foam_mag.set(batch.foam_mag);
    batch_new.foam_scale.set(batch.foam_scale);
    m_vec3.copy(batch.shallow_water_col, batch_new.shallow_water_col);
    m_vec3.copy(batch.shore_water_col, batch_new.shore_water_col);
    batch_new.normalmap_scales = m_util.clone_object_r(batch.normalmap_scales);
    batch_new.refractive = batch.refractive;

    // emitter particles data
    batch_new.particles_data = m_util.clone_object_r(batch.particles_data);

    // line params
    batch_new.line_width = batch.line_width;

    // anchor params
    if (batch.anchor_positions)
        batch_new.anchor_positions = new Float32Array(batch.anchor_positions);

    batch_new.part_use_tangent = batch.part_use_tangent;
    batch_new.part_node_data = m_util.clone_object_r(batch.part_node_data);

    batch_new.node_values = m_util.clone_object_r(batch.node_values);
    batch_new.node_value_inds = m_util.clone_object_r(batch.node_value_inds);
    batch_new.node_rgbs = m_util.clone_object_r(batch.node_rgbs);
    batch_new.node_rgb_inds = m_util.clone_object_r(batch.node_rgb_inds);

    batch_new.bb_local = m_bounds.clone_bb(batch.bb_local);
    batch_new.bb_world = m_bounds.clone_bb(batch.bb_world);
    batch_new.be_local = m_bounds.clone_be(batch.be_local);
    batch_new.be_world = m_bounds.clone_be(batch.be_world);
    batch_new.bs_local = m_bounds.clone_bs(batch.bs_local);
    batch_new.bs_world = m_bounds.clone_bs(batch.bs_world);

    batch_new.use_be = batch.use_be;

    batch_new.cleanup_gl_data_on_unload = batch.cleanup_gl_data_on_unload;
    batch_new.shader_updated = batch.shader_updated;

    return batch_new;
}

/**
 * Generate object batches for graph subscenes.
 * NOTE: bpy objects are expressly preferred than the new ones for the 
 * batching as parameters (as proxy objects) because of specific 
 * linking: bpy_obj._object->obj; nevertheless many "low-level" operations, 
 * some utility functions and the final batching actions rely on the new objects
 */
exports.generate_main_batches = function(scene, bpy_mesh_objects, lamps,
        meta_objects) {

    var bpy_dynamic_objs = [];
    var bpy_static_objs = [];
    separate_dynamic_objs(bpy_mesh_objects, bpy_dynamic_objs, bpy_static_objs);

    // create merged metabatches
    var all_mbatches = [];
    all_mbatches.push.apply(all_mbatches,
            make_dynamic_metabatches(bpy_dynamic_objs, scene._render.graph));

    all_mbatches.push.apply(all_mbatches,
            make_static_metabatches(bpy_static_objs, scene._render.graph));

    var metabatches = merge_metabatches(all_mbatches);

    for (var i = 0; i < metabatches.length; i++) {
        var batch = metabatches[i].batch;

        batch.material_names = metabatches[i].mat_names;
        update_batch_geometry(batch, metabatches[i].submesh);

        update_batch_lights(batch, lamps, scene);
        if (metabatches[i].render.type == "STATIC" && batch.type != "COLOR_ID") {
            // create meta-objects and attach static batches
            var unique_name = m_util.unique_name("%meta%" + batch.type + "%" +
                                        batch.material_names.join("%") + "%");
            var meta_obj = m_obj_util.create_object(unique_name, "MESH");

            meta_obj.render = m_obj_util.clone_render(metabatches[i].render);

            m_obj_util.append_scene_data(meta_obj, scene);
            m_obj_util.append_batch(meta_obj, scene, batch);
            meta_objects.push(meta_obj);

            var bounding_verts = [];
            for (var j = 0; j < metabatches[i].rel_bpy_objects.length; j++) {
                var bpy_obj = metabatches[i].rel_bpy_objects[j];
                var obj = bpy_obj._object;

                m_bounds.extract_rot_bb_corners(obj.render.bbr_world,
                        bounding_verts);

                if (batch.type == "MAIN")
                    obj.meta_objects.push(meta_obj);
            }
            meta_obj.render.be_world = m_bounds.create_be_by_bb(
                    m_util.f32(bounding_verts), true);
            meta_obj.render.be_local = m_bounds.calc_be_local_by_tsr(
                    meta_obj.render.be_world, meta_obj.render.world_tsr);
            meta_obj.render.bs_local = m_bounds.create_bs_by_be(
                    meta_obj.render.be_local);
            meta_obj.render.bs_world = m_bounds.create_bs_by_be(
                    meta_obj.render.be_world);

            meta_obj.render.use_be = m_bounds.is_be_optimized(
                    meta_obj.render.be_local, meta_obj.render.bs_local);

        } else {
            // attach dynamic batches and static COLOR_ID batches to objects
            var unique_obj_names = [];
            for (var j = 0; j < metabatches[i].rel_bpy_objects.length; j++) {
                var bpy_obj = metabatches[i].rel_bpy_objects[j];
                var obj = bpy_obj._object;
                if (unique_obj_names.indexOf(obj.name) == -1) {
                    m_obj_util.append_batch(obj, scene, batch);
                    unique_obj_names.push(obj.name);
                    obj.render.use_be = m_bounds.is_be_optimized(
                            obj.render.be_local, obj.render.bs_local);
                }
            }
        }
    }

    if (cfg_def.debug_view) {
        // create debug sphere batches around dynamic objects
        for (var i = 0; i < metabatches.length; i++) {
            // same as obj.render for dynamic objects
            var render = metabatches[i].render;
            if (render.type == "DYNAMIC") {
                // single object for dynamic batch
                var obj = metabatches[i].rel_bpy_objects[0]._object;
                var batch = metabatches[i].batch;
                if (batch.type == "MAIN") {

                    // every object can have only one debug sphere
                    var sc_data = m_obj_util.get_scene_data(obj, scene);
                    var batches = sc_data.batches;
                    var has_debug_sphere = false;
                    for (var j = 0; j < batches.length; j++)
                        if (batches[j].debug_sphere) {
                            has_debug_sphere = true;
                            continue;
                        }
                    if (has_debug_sphere)
                        continue;

                    var ds_batch = create_bounding_ellipsoid_batch(
                            render, obj.name, true, batch);
                    m_obj_util.append_batch(obj, scene, ds_batch);
                }
            }
        }

        // create debug sphere batches around meta-objects
        for (var i = 0; i < meta_objects.length; i++) {
            var obj = meta_objects[i];
            var render = obj.render;
            var sc_data = m_obj_util.get_scene_data(obj, scene);
            // every meta object has one batch
            var batch = sc_data.batches[0];
            if (batch.type == "MAIN") {
                var ds_batch = create_bounding_ellipsoid_batch(
                        render, obj.name, false, batch);
                m_obj_util.append_batch(obj, scene, ds_batch);
            }
        }

        // assign simple short id for coloring
        for (var i = 0; i < metabatches.length; i++) {
            var batch = metabatches[i].batch;
            if (batch.type == "DEBUG_VIEW")
                batch.debug_id_color = i;
        }
    }

    for (var i = 0; i < bpy_mesh_objects.length; i++) {
        var sc_data = m_obj_util.get_scene_data(bpy_mesh_objects[i]._object, scene);
        var batches = sc_data.batches;
        for (var j = 0; j < batches.length; j++)
            update_batch_subtype(batches[j]);
    }
    for (var i = 0; i < meta_objects.length; i++) {
        var sc_data = m_obj_util.get_scene_data(meta_objects[i], scene);
        var batches = sc_data.batches;
        for (var j = 0; j < batches.length; j++)
            update_batch_subtype(batches[j]);
    }
}

function separate_dynamic_objs(bpy_mesh_objects, dynamic_objs, static_objs) {
    for (var i = 0; i < bpy_mesh_objects.length; i++) {
        var bpy_obj = bpy_mesh_objects[i];
        var obj = bpy_obj._object;

        if (obj.is_hair_dupli)
            continue;

        if (m_obj_util.is_dynamic(obj))
            dynamic_objs.push(bpy_obj);
        else
            static_objs.push(bpy_obj);
    }
}

exports.append_sky_batch_to_world = function(scene, sky, world) {
    var wls = scene._render.world_light_set;
    var batch = init_batch("MAIN");
    apply_shader(batch, "sky.glslv", "sky.glslf");

    if (sky.procedural_skydome) {
        set_batch_directive(batch, "PROCEDURAL_SKYDOME", 1);
        batch.draw_proc_sky = true;
    } else {
        // sky texture has priority
        var sts = wls.sky_texture_param;
        var subs_sky = m_scenegraph.find_subs(scene._render.graph, m_subs.SKY);
        var tex = subs_sky.camera.color_attachment;
        append_texture(batch, tex, "u_sky");
        if (sts) {
            set_batch_directive(batch, "WO_SKYTEX", 1);
            if (sts.invert)
                set_batch_directive(batch, "MTEX_NEGATIVE", 1);
            if (sts.use_rgb_to_intensity)
                set_batch_directive(batch, "MTEX_RGBTOINT", 1);
            set_batch_directive(batch, "BLENDTYPE", sts.blend_type);
            // if (sts.stencil)
            //     set_batch_directive(batch, "MTEX_STENCIL", 1);
            if (sts.use_map_blend)
                set_batch_directive(batch, "WOMAP_BLEND", 1);
            if (sts.use_map_horizon)
                set_batch_directive(batch, "WOMAP_HORIZ", 1);
            if (sts.use_map_zenith_up)
                set_batch_directive(batch, "WOMAP_ZENUP", 1);
            if (sts.use_map_zenith_down)
                set_batch_directive(batch, "WOMAP_ZENDOWN", 1);
        }
        if (wls.use_sky_blend)
            set_batch_directive(batch, "WO_SKYBLEND", 1);
        if (wls.use_sky_paper)
            set_batch_directive(batch, "WO_SKYPAPER", 1);
        if (wls.use_sky_real)
            set_batch_directive(batch, "WO_SKYREAL", 1);
    }
    if (sky.reflexible) {
        batch.reflexible = true;
        if (sky.reflexible_only)
            batch.reflexible_only = true;
    }
    // render last
    batch.offset_z = 99999;
    set_batch_c_attr(batch, "a_position");

    var submesh = m_primitives.generate_fullscreen_quad();
    update_batch_geometry(batch, submesh);
    update_batch_subtype(batch);

    var sc_data = m_obj_util.get_scene_data(world, scene);
    world.render.do_not_cull = true;

    batch.be_local = m_bounds.create_be();
    batch.be_world = m_bounds.create_be();
    batch.bb_local = m_bounds.create_bb();
    batch.bb_world = m_bounds.create_bb();
    batch.bs_local = m_bounds.create_bs();
    batch.bs_world = m_bounds.create_bs();

    var render_id = calculate_render_id(world.render);
    update_batch_id(batch, render_id);

    sc_data.batches.push(batch);

    // create DEBUG_VIEW batch for the sky
    var debug_view_subs = m_scenegraph.find_subs(scene._render.graph, m_subs.DEBUG_VIEW);
    if (debug_view_subs) {
        var dv_batch = clone_batch(batch);
        dv_batch.type = "DEBUG_VIEW";
        dv_batch.subtype = "";

        update_batch_material_debug_view(dv_batch);
        set_batch_directive(dv_batch, "DEBUG_VIEW_SPECIAL_SKYDOME", 1);

        submesh.va_common["a_polyindex"] = m_geom.extract_polyindices(submesh);
        update_batch_geometry(dv_batch, submesh);

        dv_batch.debug_main_batch_id = batch.id;
        update_batch_id(dv_batch, render_id);

        sc_data.batches.push(dv_batch);
    }
}

/**
 * Batch type->subtype relation:
 * MAIN/PARTICLES -> OPAQUE/BLEND/XRAY/REFLECT
 * SHADOW         -> RECEIVE/CAST
 * COLOR_ID       -> COLOR_ID/COLOR_ID_XRAY/OUTLINE
 * others         -> "" (default)
 */
function update_batch_subtype(batch) {
    switch (batch.type) {
    case "MAIN":
    case "PARTICLES":
    case "LINE":
        if (batch.blend) {
            if (batch.xray)
                batch.subtype = "XRAY";
            else
                batch.subtype = "BLEND";
        } else
            batch.subtype = "OPAQUE";
        break;
    case "SHADOW":
        // NOTE: Cast only > Receive Shadows
        // other cast batches will be created by forking the RECEIVE batches
        if (batch.shadow_cast_only)
            batch.subtype = "CAST";
        else
            batch.subtype = "RECEIVE";
        break;
    case "COLOR_ID":
        if (batch.xray)
            batch.subtype = "COLOR_ID_XRAY";
        else
            batch.subtype = "COLOR_ID";
        break;
    }
}

exports.create_forked_batches = function(obj, graph, scene) {
    var scene_data = m_obj_util.get_scene_data(obj, scene);
    var batches = scene_data.batches;
    var forked_batches = [];
    var shadow_cast_subs = m_scenegraph.find_subs(graph, m_subs.SHADOW_CAST);
    var main_reflect_subs = m_scenegraph.find_subs(graph, m_subs.MAIN_PLANE_REFLECT);
    var cube_reflect_subs = m_scenegraph.find_subs(graph, m_subs.MAIN_CUBE_REFLECT);
    var outline_mask_subs = m_scenegraph.find_subs(graph, m_subs.OUTLINE_MASK);
    var picking_mask_subs = m_scenegraph.find_subs(graph, m_subs.COLOR_PICKING);
    for (var j = 0; j < batches.length; j++) {
        var batch_src = batches[j];
        var batch = null;

        if (batch_src.type == "SHADOW" && batch_src.subtype == "RECEIVE" 
                && batch_src.shadow_cast) {
            batch = clone_batch(batch_src);
            batch.subtype = "CAST";
        }

        if ((batch_src.type == "MAIN" || batch_src.type == "PARTICLES")
                && (main_reflect_subs || cube_reflect_subs)
                && batch_src.reflexible) {
            batch = clone_batch(batch_src);
            batch.subtype = "REFLECT";

            batch.refractive = false;
            if (batch.z_sort) {
                batch.z_sort = false;
                batch.depth_mask = false;
            }
            // NOTE: required to be by link?
            batch.particles_data = batch_src.particles_data;
        }

        if (batch_src.type == "COLOR_ID")
            if (outline_mask_subs && obj.render.outlining)
                if (picking_mask_subs && 
                        obj.render.selectable) {
                    batch = clone_batch(batch_src);
                    batch.subtype = "OUTLINE";    
                } else
                    batch_src.subtype = "OUTLINE";

        if (batch) {
            batch.forked_batch = true;
            update_batch_id(batch, obj.render.id);
            forked_batches.push(batch);
        }
    }
    batches.push.apply(batches, forked_batches);
}

function make_dynamic_metabatches(bpy_dynamic_objs, graph) {
    var metabatches = [];
    for (var i = 0; i < bpy_dynamic_objs.length; i++) {
        var bpy_obj = bpy_dynamic_objs[i];
        var render = bpy_obj._object.render;

        var bb_local = m_bounds.create_bb();
        m_bounds.copy_bb(render.bb_original, bb_local);
        var b_data = bpy_obj["data"]["b4w_boundings"];
        var cyl_radius = b_data["bc_rad"];
        var bs_radius = b_data["bs_rad"];
        var bs_center = b_data["bs_cen"];
        var be_axes = b_data["be_ax"];
        var cov_axis_x = b_data["caxis_x"];
        var cov_axis_y = b_data["caxis_y"];
        var cov_axis_z = b_data["caxis_z"];
        var be_center = b_data["be_cen"];

        // NOTE: expand boundings for billboards
        if (render.billboard) {
            var x = Math.max(Math.abs(bb_local.max_x), Math.abs(bb_local.min_x));
            var y = Math.max(Math.abs(bb_local.max_y), Math.abs(bb_local.min_y));
            var z = Math.max(Math.abs(bb_local.max_z), Math.abs(bb_local.min_z));
            var sphere_radius = Math.sqrt(x * x + y * y + z * z);
            var cylinder_radius = Math.sqrt(x * x + y * y);

            bb_local.max_x = bb_local.max_y = bb_local.max_z = sphere_radius;
            bb_local.min_x = bb_local.min_y = bb_local.min_z = -sphere_radius;

            cyl_radius = cylinder_radius;

            bs_radius = sphere_radius;
            bs_center[0] = bs_center[1] = bs_center[2] = 0;

            cov_axis_x = [sphere_radius, 0.0, 0.0];
            cov_axis_y = [0.0, sphere_radius, 0.0];
            cov_axis_z = [0.0, 0.0, sphere_radius];
            be_axes[0] = be_axes[1] = be_axes[2] = 1.0;
            be_center[0] = be_center[1] = be_center[2] = 0;
        }

        // bounding box
        m_bounds.bounding_box_transform(bb_local, render.world_tsr,
                                        render.bb_world);

        set_local_cylinder_capsule(render, cyl_radius, cyl_radius, bb_local);

        // bounding sphere
        var bs_local = m_bounds.bs_from_values(bs_radius, m_util.f32(bs_center));
        m_bounds.bounding_sphere_transform(bs_local, render.world_tsr,
                                           render.bs_world);

        // bounding ellipsoid
        var be_local = m_bounds.be_from_values(
                cov_axis_x, cov_axis_y, cov_axis_z, be_center);
        m_vec3.scale(be_local.axis_x, be_axes[0], be_local.axis_x);
        m_vec3.scale(be_local.axis_y, be_axes[1], be_local.axis_y);
        m_vec3.scale(be_local.axis_z, be_axes[2], be_local.axis_z);
        m_bounds.bounding_ellipsoid_transform(be_local, render.world_tsr,
                                              render.be_world);

        render.bb_local = bb_local;
        render.bs_local = bs_local;
        render.be_local = be_local;

        metabatches.push.apply(metabatches,
                         make_object_metabatches(bpy_obj, render, graph));
    }
    return metabatches;
}

function make_static_metabatches(bpy_static_objs, graph) {
    var metabatches = [];

    var clusters = create_object_clusters(bpy_static_objs);

    for (var i = 0; i < clusters.length; i++) {
        var render = clusters[i].render;
        var bpy_objs = clusters[i].bpy_objects;

        for (var j = 0; j < bpy_objs.length; j++) {
            var bpy_obj = bpy_objs[j];
            var obj_render = bpy_obj._object.render;
            var obj_metabatches = make_object_metabatches(bpy_obj, render, graph);

            var tsr = m_tsr.create();
            if (obj_render.billboard && !obj_render.billboard_pres_glob_orientation) {
                var obj_trans = m_tsr.get_trans_view(obj_render.world_tsr);
                m_tsr.set_trans(obj_trans, tsr);
            } else
                m_tsr.copy(obj_render.world_tsr, tsr);

            var params = {};

            if (render.wind_bending || render.billboard)
                params["au_center_pos"] = [tsr[0], tsr[1], tsr[2]];

            if (render.wind_bending) {
                params["au_wind_bending_amp"] = [obj_render.wind_bending_amp];

                params["au_wind_bending_freq"]
                        = [bpy_obj["b4w_wind_bending_freq"]];
                params["au_detail_bending_amp"]
                        = [bpy_obj["b4w_detail_bending_amp"]];
                params["au_detail_bending_freq"]
                        = [bpy_obj["b4w_detail_bending_freq"]];
                params["au_branch_bending_amp"]
                        = [bpy_obj["b4w_branch_bending_amp"]];
            }

            for (var k = 0; k < obj_metabatches.length; k++) {
                var metabatch_render = obj_metabatches[k].render;
                var submesh = obj_metabatches[k].submesh;
                var batch = obj_metabatches[k].batch;

                if (!metabatch_render.is_hair_particles) {
                    // make dynamic metabatch for COLOR_ID batch type
                    // use object render instead of cluster render
                    if (batch.type == "COLOR_ID") {
                        obj_metabatches[k].render = obj_render;
                        batch.odd_id_prop = bpy_obj["uuid"];
                        update_batch_render(batch, obj_render);
                        var render_id = calculate_render_id(obj_render);
                        update_batch_id(batch, render_id);
                    }
                    submesh = m_geom.submesh_apply_transform(submesh, tsr);
                    submesh = m_geom.submesh_apply_params(submesh, params);
                } else if (!submesh.instanced_array_data) {
                    // NOTE: submesh params for particles applied in
                    // make_hair_particles_metabatches() function
                    if (metabatch_render.billboard)
                        submesh = m_geom.submesh_apply_particle_transform(submesh, tsr);
                    else
                        submesh = m_geom.submesh_apply_transform(submesh, tsr);

                }
            }

            metabatches.push.apply(metabatches, obj_metabatches);
        }
    }

    return metabatches;
}

/**
 * Create batches and metadata for single object
 */
function make_object_metabatches(bpy_obj, render, graph) {
    var metabatches = [];

    // NOTE: generate all batches
    var batch_types = get_batch_types(graph, render, !render.do_not_render, false);
    var render_id = calculate_render_id(render);
    var mesh = bpy_obj["data"];
    var materials = mesh["materials"];
    var batches_main = new Array(materials.length);
    var batches_debug_view = new Array(materials.length);
    var physics_navmesh_submeshes = [];
    var subs_main = m_scenegraph.find_subs(graph, m_subs.MAIN_OPAQUE);
    var has_lamp = false;

    if (subs_main)
        has_lamp = subs_main.light_positions.length ? true : false;

    for (var i = 0; i < batch_types.length; i++) {
        var type = batch_types[i];
        
        // j == submesh index == material index
        for (var j = 0; j < materials.length; j++) {
            var material = materials[j];

            if (m_geom.has_empty_submesh(mesh, j))
                continue;

            if (type == "PHYSICS" && bpy_obj["b4w_collision"] 
                    && bpy_obj["game"]["physics_type"] == "NAVMESH") {
                physics_navmesh_submeshes.push(m_geom.extract_submesh(mesh, j, 
                        [], render.bone_skinning_info, {}, null));
                continue;
            }

            if (material["b4w_lens_flares"] && !has_lamp)
                continue;

            var batch = init_batch(type);

            if (type == "MAIN")
                batches_main[j] = batch;
            else if (type == "DEBUG_VIEW")
                batches_debug_view[j] = batch;

            batch.cluster_id = bpy_obj["b4w_cluster_data"]["cluster_id"];

            if (!batch_material_is_valid(batch, material))
                continue;

            if (type == "SHADOW" && batches_main[j]) {
                // Override
                batch.use_shadeless = batches_main[j].use_shadeless;
            }

            batch.draw_mode = (render.use_shape_keys || render.dynamic_geometry) ?
                    m_geom.DM_DYNAMIC_TRIANGLES : m_geom.DM_DEFAULT;

            update_batch_render(batch, render);
            update_batch_particle_systems(batch, bpy_obj["particle_systems"]);

            if (render.type == "DYNAMIC")
                batch.odd_id_prop = bpy_obj["uuid"];

            update_batch_id(batch, render_id);

            var submesh = m_geom.extract_submesh(mesh, j,
                    batch.common_attributes, render.bone_skinning_info,
                    batch.vertex_colors_usage, batch.uv_maps_usage);

            if (material["use_tangent_shading"]
                    && !("a_shade_tangs" in submesh.va_frames[0])) {
                set_batch_directive(batch, "CALC_TBN", 1);
                set_batch_c_attr(batch, "a_tbn_quat");
            }

            if (material["b4w_lens_flares"])
                submesh = m_particles.prepare_lens_flares(submesh);

            metabatches.push({
                batch: batch,
                submesh: submesh,
                mat_names: [material["name"]],
                render: render,
                rel_bpy_objects: [bpy_obj]
            });
        }
    }

    // in case of navigation mesh just join all submeshes
    if (physics_navmesh_submeshes.length) {
        var batch = init_batch("PHYSICS");
        batch.subtype = "NAVMESH";
        batch.odd_id_prop = bpy_obj["uuid"];
        update_batch_id(batch, render_id);

        var submesh = m_geom.submesh_list_join(physics_navmesh_submeshes);

        var mat_names = [];
        for (var i = 0; i < materials.length; i++)
            mat_names.push(materials[i]["name"]);

        metabatches.push({
            batch: batch,
            submesh: submesh,
            mat_names: mat_names,
            render: render,
            rel_bpy_objects: [bpy_obj]
        });
    }

    // NOTE: using a special property to make batching for DEBUG_VIEW batches the 
    // same as for MAIN batches
    for (var i = 0; i < batches_debug_view.length; i++)
        if (batches_debug_view[i]) {
            batches_debug_view[i].debug_main_batch_id = batches_main[i].id;
            update_batch_id(batches_debug_view[i], batches_debug_view[i].render_id);
        }

    // process particle system batches
    var psystems = bpy_obj["particle_systems"];
    if (psystems.length > 0 && metabatches.length) {

        // NOTE: check if emitter rendering is needed,
        // also check if we need emitter submesh
        var render_emitter = false;
        var need_emitter_submesh = false;
        for (var i = 0; i < psystems.length; i++) {
            var psys = psystems[i];
            var pset = psys["settings"];

            if (pset["use_render_emitter"])
                render_emitter = true;
            if (pset["type"] == "HAIR" && (pset["render_type"] == "OBJECT"
                    || pset["render_type"] == "GROUP"
                    || !psys["transforms"].length))
                need_emitter_submesh = true;

            if (render_emitter && need_emitter_submesh)
                break;
        }

        // NOTE: need only inherited vcols and bending vcols which are the same
        // on every batch
        var emitter_vc = metabatches[0].batch.vertex_colors_usage;

        if (need_emitter_submesh)
            if (materials.length > 1)
                // NOTE: build common submesh with combined vertex colors
                // for inheritance
                var em_submesh = build_emitter_submesh(mesh, psystems, emitter_vc,
                        bpy_obj._object.render);
            else
                var em_submesh = metabatches[0].submesh;
        else
            var em_submesh = null;

        var particles_metabatches = make_particles_metabatches(bpy_obj, render,
                graph, render_id, emitter_vc, em_submesh);

        if (render_emitter)
            metabatches.push.apply(metabatches, particles_metabatches);
        else
            metabatches = particles_metabatches;
    }
    return metabatches;
}

function build_emitter_submesh(mesh, psystems, emitter_vc, render) {
    var emitter_inherit_vc_usage = {}

    for (var i = 0; i < psystems.length; i++) {
        var pset = psystems[i]["settings"];
        if (pset["type"] == "HAIR" && (pset["render_type"] == "OBJECT"
                || pset["render_type"] == "GROUP")) {

            var vcol_from = pset["b4w_vcol_from_name"];
            var vcol_to = pset["b4w_vcol_to_name"];

            if (vcol_from !== "" && vcol_to !== "")
                // NOTE: every emitter batch has all inherited vertex colors
                // and they are fully exported
                emitter_inherit_vc_usage[vcol_from] =
                        m_util.clone_object_r(emitter_vc[vcol_from]);
        }
    }

    if ("a_bending_col_main" in emitter_vc)
        emitter_inherit_vc_usage["a_bending_col_main"] =
                        m_util.clone_object_r(emitter_vc["a_bending_col_main"]);
    if ("a_bending_col_detail" in emitter_vc)
        emitter_inherit_vc_usage["a_bending_col_detail"] =
                        m_util.clone_object_r(emitter_vc["a_bending_col_detail"]);

    return m_geom.extract_submesh_all_mats(mesh, [], emitter_inherit_vc_usage);
}

/**
 * Create batches and metadata for object particle systems
 */
function make_particles_metabatches(bpy_obj, render, graph, render_id, emitter_vc,
                                    em_submesh) {
    var obj = bpy_obj._object;
    var metabatches = [];

    var psystems = bpy_obj["particle_systems"];
    var mesh = bpy_obj["data"];
    var materials = mesh["materials"];

    for (var i = 0; i < psystems.length; i++) {
        var psys = psystems[i];
        var pset = psys["settings"];

        // ignore empty particle systems
        if (!pset["count"])
            continue;

        if (pset["type"] == "EMITTER") {
            if (render.type == "DYNAMIC") {

                var batch = init_batch("PARTICLES");
                //by link
                batch.bs_local = render.bs_local;
                batch.bb_local = render.bb_local;
                batch.be_local = render.be_local;

                batch.bs_world = render.bs_world;
                batch.bb_world = render.bb_world;
                batch.be_world = render.be_world;

                var pmaterial = select_psys_material(psys, mesh["materials"]);
                
                if (psys["settings"]["render_type"] === "HALO"
                        && pmaterial["type"] === "HALO")
                    batch.halo_particles = true;

                update_batch_material(batch, pmaterial);
                update_batch_particles_emitter(batch, psys, bpy_obj);

                // NOTE: dynamic_geometry for dynamic particles on EMITTER psys
                batch.dynamic_geometry = true;

                batch.odd_id_prop = obj.name + "_" + pset["uuid"];
                update_batch_id(batch, render_id);

                m_particles.init_particles_data(batch, psys, pmaterial);
                var submesh = m_particles.generate_emitter_particles_submesh(
                        batch, mesh, psys, obj.render);
                m_particles.update_particles_submesh(submesh, batch, pset["count"],
                        pmaterial);

                m_particles.update_particles_objs_cache(obj);
                update_batch_render(batch, obj.render);

                metabatches.push({
                    batch: batch,
                    submesh: submesh,
                    mat_names: [pmaterial["name"]],
                    render: render,
                    rel_bpy_objects: [bpy_obj]
                });
            }

        } else if (pset["type"] == "HAIR") {
            var seed = m_util.init_rand_r_seed(psys["seed"]);

            // disable frustum culling for dynamic grass (only)
            if (pset["b4w_dynamic_grass"])
                render.do_not_cull = true;

            var use_particles_rotation = m_reformer.check_particles_bin_format(cfg_def.loaded_data_version)
                    && !pset["b4w_initial_rand_rotation"] && !pset["b4w_hair_billboard"];

            var data_len = 4;
            if (use_particles_rotation)
                data_len = 8;

            if (psys["transforms"].length) {
                var ptrans = psys["transforms"];
            } else {
                var points = m_geom.geometry_random_points(em_submesh,
                        pset["count"], false, seed);

                var ptrans = new Float32Array(points.length * data_len);
                for (var j = 0; j < points.length; j++) {
                    // NOTE: +/- 25%
                    var scale = 0.75 + 0.5 * m_util.rand_r(seed);
                    ptrans[j * data_len] = points[j][0];
                    ptrans[j * data_len + 1] = points[j][1];
                    ptrans[j * data_len + 2] = points[j][2];
                    ptrans[j * data_len + 3] = scale;
                    if (use_particles_rotation) {
                        ptrans[j * data_len + 4] = 1;
                        ptrans[j * data_len + 5] = 0;
                        ptrans[j * data_len + 6] = 0;
                        ptrans[j * data_len + 7] = 0;
                    }
                }
            }

            var use_grass_map = m_scenegraph.find_subs(graph, m_subs.GRASS_MAP) ?
                    true : false;

            if (pset["render_type"] == "OBJECT") {
                var particles_batch_types = [get_batch_types(graph,
                        pset["dupli_object"]._object.render, 
                        !render.do_not_render, true)];

                var hair_metabatches = make_hair_particles_metabatches(
                        bpy_obj, render, emitter_vc, em_submesh,
                        [pset["dupli_object"]], particles_batch_types,
                        [ptrans], pset, psys, use_grass_map, seed, false);

                metabatches.push.apply(metabatches, hair_metabatches);

            } else if (pset["render_type"] == "GROUP") {
                var bpy_part_objs = pset["dupli_group"]["objects"];
                var particles_batch_types = [];
                for (var j = 0; j < bpy_part_objs.length; j++) {
                    var btypes = get_batch_types(graph,
                            bpy_part_objs[j]._object.render, 
                            !render.do_not_render, true);
                    particles_batch_types.push(btypes);
                }

                var reset_seed = false;
                var part_objs = [];
                for (var j = 0; j < bpy_part_objs.length; j++)
                    part_objs.push(bpy_part_objs[j]._object);

                if (pset["use_whole_group"]) {
                    var ptrans_dist = distribute_ptrans_group(ptrans,
                            part_objs, use_particles_rotation, data_len);
                    reset_seed = true;
                } else if (pset["use_group_count"]) {
                    var ptrans_dist = distribute_ptrans_by_dupli_weights(
                            ptrans, part_objs, pset["dupli_weights"], seed,
                            use_particles_rotation, data_len);
                } else {
                    var ptrans_dist = distribute_ptrans_equally(ptrans,
                        part_objs, seed, use_particles_rotation, data_len);
                }

                var hair_metabatches = make_hair_particles_metabatches(
                        bpy_obj, render, emitter_vc, em_submesh, bpy_part_objs,
                        particles_batch_types, ptrans_dist, pset, psys,
                        use_grass_map, seed, reset_seed);

                metabatches.push.apply(metabatches, hair_metabatches);
            }

            if (pset["b4w_wind_bend_inheritance"] == "INSTANCE" && obj.render.wind_bending)
                m_print.warn("Emitter object \"" + obj.name + "\" has a particle"
                        + " system with wind bending inheritance from the "
                        + "particle instance. Wind bending on the emitter isn't "
                        + "disabled. Expect unforeseen behavior.");
        } else
            m_util.panic("Unknown particle settings type");
    }

    return metabatches;
}

function select_psys_material(psys, materials) {
    var mat_index = psys["settings"]["material"] - 1;
    if (mat_index >= materials.length) {
        m_print.warn("Wrong material used for rendering particle " +
                "system \"" + psys["name"] + "\"");
        mat_index = 0;
    }

    return materials[mat_index];
}

function merge_metabatches(metabatches) {
    var merged_metabatches = [];

    var unique_data = [];
    var batches_ids = {};

    // collect unique batches and data
    for (var i = 0; i < metabatches.length; i++) {
        var batch = metabatches[i].batch;
        var render = metabatches[i].render;

        var batch_data = null;
        if (batch.id in batches_ids) {
            var index = batches_ids[batch.id];
            var collision_batch = unique_data[index].batch;
            var collision_render = unique_data[index].render;

            // NOTE: remove some properties to avoid circular structure
            var canvas_context = null;
            var video_elements = null;
            // NOTE: remove unique batch properties
            var bb_local = batch.bb_local;
            var be_local = batch.be_local;
            var bs_local = batch.bs_local;
            var bb_world = batch.bb_world;
            var be_world = batch.be_world;
            var bs_world = batch.bs_world;
            batch.bb_local = null;
            batch.be_local = null;
            batch.bs_local = null;
            batch.bb_world = null;
            batch.be_world = null;
            batch.bs_world = null;

            var bb_local_col = collision_batch.bb_local;
            var be_local_col = collision_batch.be_local;
            var bs_local_col = collision_batch.bs_local;
            var be_world_col = collision_batch.be_world;
            var bb_world_col = collision_batch.bb_world;
            var bs_world_col = collision_batch.bs_world;
            collision_batch.bb_local = null;
            collision_batch.be_local = null;
            collision_batch.bs_local = null;
            collision_batch.bb_world = null;
            collision_batch.be_world = null;
            collision_batch.bs_world = null;

            for (var j = 0; j < batch.textures.length; j++) {
                var ctx = batch.textures[j].canvas_context;
                if (ctx) {
                    if (!canvas_context)
                        canvas_context = {};
                    canvas_context[j] = ctx;
                    batch.textures[j].canvas_context = null;
                }
                var video = batch.textures[j].video_file;
                if (video) {
                    if(!video_elements)
                        video_elements = {};
                    video_elements[j] = video;
                    batch.textures[j].video_file = null;
                }
            }

            if (m_util.strict_objs_is_equal(batch, collision_batch, true)
                    && m_util.strict_objs_is_equal(render, collision_render, true) &&
                    batch.inst_array_state != SINGLE_INST_ARR)
                var batch_data = unique_data[index];

            // return removed properties
            batch.bb_local = bb_local;
            batch.be_local = be_local;
            batch.bs_local = bs_local;
            batch.bb_world = bb_world;
            batch.be_world = be_world;
            batch.bs_world = bs_world;

            collision_batch.bb_local = bb_local_col;
            collision_batch.be_local = be_local_col;
            collision_batch.bs_local = bs_local_col;
            collision_batch.bb_world = bb_world_col;
            collision_batch.be_world = be_world_col;
            collision_batch.bs_world = bs_world_col;

            if (canvas_context)
                for (var j in canvas_context)
                    batch.textures[j].canvas_context = canvas_context[j];
            if (video_elements)
                for (var j in video_elements)
                    batch.textures[j].video_file = video_elements[j];
            // collision case, set new unique batch id
            if (!batch_data)
                do {
                    batch.id++;
                } while (batches_ids[batch.id]);
        }

        // new unique or collided batch
        if (!batch_data) {
            var batch_data = {
                batch: batch,
                render: metabatches[i].render,
                rel_bpy_objects: [],
                submeshes: [],
                submeshes_world_tsr: [],
                mat_names: []
            };
            batches_ids[batch.id] = unique_data.length;
            unique_data.push(batch_data);
        }
        batch_data.rel_bpy_objects.push.apply(batch_data.rel_bpy_objects,
                         metabatches[i].rel_bpy_objects);
        // ignore empty submeshes ???
        if (metabatches[i].submesh && metabatches[i].submesh.base_length) {
            batch_data.submeshes.push(metabatches[i].submesh);
            batch_data.submeshes_world_tsr.push(
                    metabatches[i].rel_bpy_objects[0]._object.render.world_tsr);
        }

        if (batch_data.mat_names.length)
            for (var j = 0; j < metabatches[i].mat_names.length; j++) {
                var mat_name = metabatches[i].mat_names[j];
                if (batch_data.mat_names.indexOf(mat_name) == -1)
                    batch_data.mat_names.push(mat_name);
            }
        else
            batch_data.mat_names = metabatches[i].mat_names;

        m_geom.sort_two_arrays(batch_data.mat_names, batch_data.submeshes,
                m_geom.SORT_STRING, false);
    }

    // calculate submeshes for unique batches
    for (var i = 0; i < unique_data.length; i++) {
        var submeshes = unique_data[i].submeshes;
        var world_tsrs = unique_data[i].submeshes_world_tsr;
        var batch = unique_data[i].batch;
        var render = unique_data[i].render;

        if (submeshes.length == 0)
            var submesh = m_geom.init_submesh(m_util.unique_name("%empty"));
        else if (submeshes.length == 1) {
            var submesh = submeshes[0];
        } else {
            var short_submeshes = [];
            for (var j = 0; j < submeshes.length; j++)
                if (!m_geom.is_long_submesh(submeshes[j]))
                    short_submeshes.push(j);
            if (short_submeshes.length < submeshes.length)
                for (var j = 0; j < short_submeshes.length; j++)
                    m_geom.submesh_drop_indices(
                            submeshes[short_submeshes[j]]);
            var submesh = m_geom.submesh_list_join(submeshes);
        }

        if (batch.type != "PARTICLES") {
            var submesh_bd = submesh.submesh_bd;

            batch.bb_local = m_bounds.clone_bb(submesh_bd.bb_local);
            batch.be_local = m_bounds.clone_be(submesh_bd.be_local);

            // NOTE: take a sphere from the object if it has smaller volume
            if (render.bs_local.radius < submesh_bd.bs_local.radius) {
                if (render.type == "STATIC")
                    batch.bs_local = m_bounds.clone_bs(render.bs_world);
                else
                    batch.bs_local = m_bounds.clone_bs(render.bs_local);
            } else
                batch.bs_local = m_bounds.clone_bs(submesh_bd.bs_local);

            if (render.type == "STATIC") {
                batch.be_world = batch.be_local;
                batch.bb_world = batch.bb_local;
                batch.bs_world = batch.bs_local;
            } else {
                var world_tsr = world_tsrs[0];


                batch.be_world = m_bounds.bounding_ellipsoid_transform(batch.be_local,
                                                                       world_tsr);
                batch.bs_world = m_bounds.bounding_sphere_transform(batch.bs_local,
                                                                    world_tsr);
                batch.bb_world = m_bounds.bounding_box_transform(batch.bb_local,
                                                                 world_tsr);
            }

            batch.use_be = m_bounds.is_be_optimized(batch.be_local,
                                                    batch.bs_local);
        }
        var metabatch = {
            batch: batch,
            render: unique_data[i].render,
            submesh: submesh,
            mat_names: unique_data[i].mat_names,
            rel_bpy_objects: unique_data[i].rel_bpy_objects
        }
        merged_metabatches.push(metabatch);
    }

    return merged_metabatches;
}

/**
 * Update local cylinder and capsule boundings
 */
exports.set_local_cylinder_capsule = set_local_cylinder_capsule;
function set_local_cylinder_capsule(render, cyl_radius, cap_radius, bb_local) {
    render.bcyl_local = m_bounds.bcyl_from_values(cyl_radius, bb_local);
    render.bcap_local = m_bounds.bcap_from_values(cap_radius, bb_local);
    render.bcon_local = m_bounds.bcon_from_values(cyl_radius, bb_local);
}

exports.wb_angle_to_amp = wb_angle_to_amp;
function wb_angle_to_amp(angle, bbox, scale) {
    if (bbox) {
        var height = scale * (bbox.max_z - bbox.min_z);
    } else {
        var height = 1;
        m_util.panic("No bounding box for mesh");
    }

    if (height == 0)
        return 0;

    var delta = height * Math.tan(m_util.deg_to_rad(angle));

    // root for equation: delta = (amp+1)^4 - (amp+1)^2
    var amp = Math.sqrt(2*Math.sqrt(4*delta+1)+2) / 2 - 1;

    return 0.5 * amp / height; // moved 0.5 from shader
}


exports.bb_bpy_to_b4w = bb_bpy_to_b4w;
function bb_bpy_to_b4w(bpy_bb) {

    var max_x = bpy_bb["max_x"];
    var max_y = bpy_bb["max_y"];
    var max_z = bpy_bb["max_z"];
    var min_x = bpy_bb["min_x"];
    var min_y = bpy_bb["min_y"];
    var min_z = bpy_bb["min_z"];

    var bb = {
        max_x: max_x,
        min_x: min_x,
        max_y: max_y,
        min_y: min_y,
        max_z: max_z,
        min_z: min_z
    };

    return bb;
}

function exclude_batch_types(batch_types, unwanted_types) {

    for (var i = 0; i < unwanted_types.length; i++) {
        var index = batch_types.indexOf(unwanted_types[i]);
        if (index !== -1)
            batch_types.splice(index, 1);
    }

    return batch_types;
}

function get_batch_types(graph, render, is_rendered, is_hair_particles) {
    var batch_types = [];

    if (!is_hair_particles)
        if (render.selectable && m_scenegraph.find_subs(graph, m_subs.COLOR_PICKING) ||
                render.outlining && m_scenegraph.find_subs(graph, m_subs.OUTLINE_MASK))
            batch_types.push("COLOR_ID");

    // NOTE: "is_rendered" doesn't always match with !do_not_render object flag,
    // it depends on the emitter render for particle system batches
    if (is_rendered) {
        batch_types.push("MAIN");
        batch_types.push("NODES_GLOW");

        if (m_scenegraph.find_subs(graph, m_subs.DEBUG_VIEW))
            batch_types.push("DEBUG_VIEW");

        if (m_scenegraph.find_subs(graph, m_subs.SHADOW_RECEIVE))
            batch_types.push("SHADOW");

        if (m_scenegraph.find_subs(graph, m_subs.GRASS_MAP))
            batch_types.push("GRASS_MAP");
    }

    // NOTE: need condition
    batch_types.push("PHYSICS");

    if (render.shadow_cast_only || render.reflexible_only) {
        var unwanted_types = null;

        if (render.shadow_cast_only)
            unwanted_types = ["MAIN", "NODES_GLOW", "COLOR_ID",
                              "PHYSICS", "DEBUG_VIEW"];
        if (render.reflexible_only) {
            var types = ["COLOR_ID", "PHYSICS", "SHADOW", "DEBUG_VIEW"];
            if (unwanted_types !== null)
                unwanted_types = m_util.array_intersect(unwanted_types, types);
            else
                unwanted_types = types;
        }

        batch_types = exclude_batch_types(batch_types, unwanted_types);
    }

    return batch_types;
}

/**
 * Init batch according to blender material
 * @param batch Batch object
 * @param material Blender material object
 * @param update_tex_color Keep texture images (do not update by colors)
 */
function update_batch_material(batch, material, update_tex_color) {
    var ret;
    switch (batch.type) {
    case "MAIN":
        ret = update_batch_material_main(batch, material, update_tex_color);
        break;
    case "NODES_GLOW":
        ret = update_batch_material_nodes(batch, material, "GLOW");
        break;
    case "SHADOW":
        ret = update_batch_material_shadow_receive(batch, material);
        break;
    case "PHYSICS":
        ret = update_batch_material_physics(batch, material);
        break;
    case "COLOR_ID":
        ret = update_batch_material_color_id(batch, material);
        break;
    case "GRASS_MAP":
        ret = update_batch_material_grass_map(batch, material);
        break;
    case "DEBUG_VIEW":
        ret = update_batch_material_debug_view(batch, material);
        break;
    case "PARTICLES":
        ret = update_batch_material_particles(batch, material);
        break;
    default:
        m_util.panic("Wrong batch type: " + batch.type);
    }

    return ret;
}

function update_batch_material_main(batch, material, update_tex_color) {
    if (material["b4w_do_not_render"])
        return false;

    if (material["use_nodes"] && material["type"] != "HALO") {
        update_batch_material_nodes(batch, material, "MAIN");
        return true;
    }
    update_batch_game_settings(batch, material);

    var gs = material["game_settings"];
    var alpha_blend = gs["alpha_blend"];
    batch.xray = material["b4w_render_above_all"] && alpha_blend != "OPAQUE"
                    && alpha_blend != "CLIP";

    batch.offset_z = material["offset_z"];

    // NOTE: for multitexturing storage of 5 vec3's is used instead
    batch.texture_scale.set([1, 1, 1]);

    var texture_slots = material["texture_slots"];

    m_vec4.set(material["diffuse_color"][0], material["diffuse_color"][1],
            material["diffuse_color"][2], material["alpha"],
            batch.diffuse_color);

    if (material["b4w_lens_flares"]) {
        apply_shader(batch, "lens_flares.glslv", "lens_flares.glslf");
        set_batch_c_attr(batch, "a_position");
        set_batch_c_attr(batch, "a_texcoord");
        var tex_col = update_tex_color ? [1, 1, 1, 0] : null;
        var tex = m_textures.get_batch_texture(texture_slots[0], tex_col);
        append_texture(batch, tex);
    } else {
        apply_shader(batch, "main.glslv", "main_stack.glslf");
        if (!material["use_shadeless"]) {
            var data = {
                use_shadeless: material["use_shadeless"],
                diffuse_shader: material["diffuse_shader"],
                specular_shader: material["specular_shader"],
                use_tangent_shading: material["use_tangent_shading"]
            }
            var nmat_graph = m_nodemat.create_lighting_graph(material["uuid"], 
                    material["name"], data);
            batch.shaders_info.node_elements =
                    m_nodemat.compose_node_elements(nmat_graph);
        }

        // find which one is color map, spec map etc
        var colormaps = find_valid_textures("use_map_color_diffuse", true, texture_slots);
        var specmaps   = find_valid_textures("use_map_color_spec", true, texture_slots);
        var normalmaps = find_valid_textures("use_map_normal", true, texture_slots);
        var mirrormaps = find_valid_textures("use_map_mirror", true, texture_slots);
        var stencilmaps = find_valid_textures("use_stencil", true, texture_slots);

        var colormap0  = colormaps[0];
        var specmap0   = specmaps[0];
        var normalmap0 = normalmaps[0];
        var mirrormap0 = mirrormaps[0];

        var colormap1 = colormaps[1];
        var stencil0  = stencilmaps[0] &&
                        find_valid_textures("use_rgb_to_intensity", true, texture_slots)[0];

        if (colormap0) {
            switch (colormap0["blend_type"]) {
            case "MIX":
                set_batch_directive(batch, "TEXTURE_BLEND_TYPE", "TEXTURE_BLEND_TYPE_MIX");
                break;
            case "MULTIPLY":
                set_batch_directive(batch, "TEXTURE_BLEND_TYPE", "TEXTURE_BLEND_TYPE_MULTIPLY");
                break;
            }

            if (colormap0["texture"]._render.source == "IMAGE" && update_tex_color)
                var tex_col = [batch.diffuse_color[0], batch.diffuse_color[1],
                    batch.diffuse_color[2], 1];
            else if (colormap0["texture"]._render.source == "ENVIRONMENT_MAP" && update_tex_color)
                var tex_col = [0.8, 0.8, 0.8, 1];
            else
                var tex_col = null;
            var tex = m_textures.get_batch_texture(colormap0, tex_col);
            append_texture(batch, tex, "u_colormap0");

            // assumed there is only one color texture per material
            batch.diffuse_color_factor = colormap0["diffuse_color_factor"];
            if (colormap0["use_map_alpha"])
                batch.alpha_factor = colormap0["alpha_factor"];
            else
                batch.alpha_factor = 0.0;

            batch.texture_scale.set(colormap0["scale"]);
        }

        // specular color can be packed into the alpha channel of a color map
        var alpha_as_spec = colormap0 && (colormap0 == specmap0);

        if (specmap0) {
            if (!alpha_as_spec) {
                var tex_col = update_tex_color ? [0.5, 0.5, 0.5, 1] : null;
                var tex = m_textures.get_batch_texture(specmap0, tex_col);
                append_texture(batch, tex, "u_specmap0");
            }
            batch.specular_color_factor = specmap0["specular_color_factor"];
        }

        if (normalmap0) {
            set_batch_c_attr(batch, "a_tbn_quat");
            batch.part_use_tangent = true;
            var tex_col = update_tex_color ? [0.5, 0.5, 1, 1] : null;
            var tex = m_textures.get_batch_texture(normalmap0, tex_col);
            append_texture(batch, tex, "u_normalmap0");
            batch.normal_factor = normalmap0["normal_factor"];

            var nm0tex = normalmap0["texture"];

            if (nm0tex["b4w_use_map_parallax"] && cfg_def.parallax) {

                var steps = m_shaders.glsl_value(nm0tex["b4w_parallax_steps"]);
                var lod_dist =
                        m_shaders.glsl_value(nm0tex["b4w_parallax_lod_dist"]);

                set_batch_directive(batch, "PARALLAX", 1);
                set_batch_directive(batch, "PARALLAX_STEPS", steps);
                set_batch_directive(batch, "PARALLAX_LOD_DIST", lod_dist);
                batch.parallax_scale = nm0tex["b4w_parallax_scale"];
            }
        }

        if (mirrormap0) {
            var tex_col = update_tex_color ? [0, 0, 0.5, 1] : null;
            var tex = m_textures.get_batch_texture(mirrormap0, tex_col);
            append_texture(batch, tex, "u_mirrormap");
            batch.mirror_factor = mirrormap0["mirror_factor"];
        }

        var TEXTURE_STENCIL_ALPHA_MASK = colormap0 && colormap1 && stencil0 ? 1 : 0;

        if (TEXTURE_STENCIL_ALPHA_MASK) {
            var tex_col = update_tex_color ? [0.8, 0.8, 0.8, 1] : null;
            var tex = m_textures.get_batch_texture(colormap1, tex_col);
            append_texture(batch, tex, "u_colormap1");
            var tex_col = update_tex_color ? [0.5, 0.5, 0.5, 1] : null;
            var tex = m_textures.get_batch_texture(stencil0, tex_col);
            append_texture(batch, tex, "u_stencil0");
        }

        // setup texture scale using one of available textures
        var some_tex = colormap0 || specmap0 || normalmap0;
        if (some_tex)
            batch.texture_scale.set(some_tex["scale"]);

        // assign directives
        set_batch_directive(batch, "TEXTURE_SPEC", specmap0 == undefined ? 0 : 1);
        set_batch_directive(batch, "ALPHA_AS_SPEC", alpha_as_spec ? 1 : 0);
        set_batch_directive(batch, "TEXTURE_STENCIL_ALPHA_MASK", TEXTURE_STENCIL_ALPHA_MASK);

        set_batch_c_attr(batch, "a_position");
        set_batch_c_attr(batch, "a_tbn_quat");

        if (colormap0 || specmap0 || normalmap0)
            set_batch_c_attr(batch, "a_texcoord");

        if (material["b4w_water"])
            init_water_material(material, batch);

        if (material["type"] === "HALO") {
            apply_shader(batch, "halo.glslv", "halo.glslf");

            set_batch_halo_data(batch, material);

            batch.common_attributes = ["a_position"];
        }

        if (material["use_tangent_shading"]) {
            set_batch_directive(batch, "USE_TBN_SHADING", 1);
            set_batch_c_attr(batch, "a_shade_tangs");
        }

        set_batch_directive(batch, "TEXCOORD", 0);
        set_batch_directive(batch, "NORMAL_TEXCOORD", 0);
        if (colormap0)
            set_batch_texcoord_directive(batch, colormap0, "TEXTURE_COLOR0_CO");
        if (colormap1)
            set_batch_texcoord_directive(batch, colormap1, "TEXTURE_COLOR1_CO");
        if (stencil0)
            set_batch_texcoord_directive(batch, stencil0,
                                         "TEXTURE_STENCIL_ALPHA_MASK_CO");
        if (specmap0)
            set_batch_texcoord_directive(batch, specmap0, "TEXTURE_SPEC_CO");
        if (normalmap0)
            set_batch_texcoord_directive(batch, normalmap0, "TEXTURE_NORM_CO");

        set_batch_directive(batch, "SHADELESS", material["use_shadeless"] ? 1 : 0);

        batch.use_shadeless = material["use_shadeless"];
    }

    var alpha_blend = material["game_settings"]["alpha_blend"];
    set_batch_directive(batch, "ALPHA", (alpha_blend === "OPAQUE") ? 0 : 1);
    set_batch_directive(batch, "ALPHA_CLIP", (alpha_blend === "CLIP") ? 1 : 0);

    set_batch_directive(batch, "DOUBLE_SIDED_LIGHTING",
            (material["b4w_double_sided_lighting"]) ? 1 : 0);

    if (material["use_vertex_color_paint"]) {
        set_batch_directive(batch, "VERTEX_COLOR", 1);
        set_batch_c_attr(batch, "a_color");
    } else
        set_batch_directive(batch, "VERTEX_COLOR", 0);

    batch.ambient = material["ambient"];
    batch.diffuse_intensity = material["diffuse_intensity"];
    batch.emit = material["emit"];
    batch.specular_color.set(material["specular_color"]);
    batch.specular_alpha = material["specular_alpha"];

    update_batch_specular_params(batch, material);
    update_batch_diffuse_params(batch, material);

    if (material["b4w_wettable"]) {
        set_batch_directive(batch, "WETTABLE", 1);
    } else
        set_batch_directive(batch, "WETTABLE", 0);

    update_batch_fresnel_params(batch, material);

    if (material["b4w_refractive"] && !batch.blend) {
        m_print.warn("Material \"" + material["name"] + "\" is not blend. " +
                     "Disabling refractions.")
        batch.refractive = false;
    } else
        batch.refractive = material["b4w_refractive"];

    batch.refr_bump = material["b4w_refr_bump"];

    return true;
}

function set_batch_halo_data(batch, material) {
    var mat_halo = material["halo"];
    set_batch_directive(batch, "NUM_RINGS", mat_halo["ring_count"]);
    set_batch_directive(batch, "NUM_LINES", mat_halo["line_count"]);
    set_batch_directive(batch, "NUM_STARS", mat_halo["star_tip_count"]);
    set_batch_directive(batch, "SKY_STARS", material["b4w_halo_sky_stars"] ? 1 : 0);

    batch.halo_size = mat_halo["size"];
    // NOTE: hardness works not similiar to blender's one
    batch.halo_hardness = mat_halo["hardness"] / 20;
    batch.halo_rings_color.set(mat_halo["b4w_halo_rings_color"]);
    batch.halo_lines_color.set(mat_halo["b4w_halo_lines_color"]);
    batch.halo_stars_blend = 1.0 / material["b4w_halo_stars_blend_height"];
    batch.halo_stars_height = material["b4w_halo_stars_min_height"];
    batch.halo = true;
}

function set_batch_texcoord_directive(batch, texture, directive_name) {
    switch (texture["texture_coords"]) {
    case "UV":
    case "ORCO":
        set_batch_directive(batch, directive_name, "TEXTURE_COORDS_UV_ORCO");
        set_batch_directive(batch, "TEXCOORD", 1);
        break;
    case "NORMAL":
        set_batch_directive(batch, directive_name, "TEXTURE_COORDS_NORMAL");
        set_batch_directive(batch, "NORMAL_TEXCOORD", 1);
        break;
    default:
        set_batch_directive(batch, directive_name, "TEXTURE_COORDS_NONE");
    }
}

/**
 * Common for all batch types
 */
function update_batch_game_settings(batch, material) {
    var gs = material["game_settings"];
    var alpha_blend = gs["alpha_blend"];

    switch (alpha_blend) {
    case "ALPHA_SORT":  // Alpha Sort       sort            blend
        batch.blend = true;
        batch.z_sort = true;
        batch.depth_mask = true;
        batch.alpha_clip = false;
        break;
    case "ALPHA":       // Alpha Blend      don't sort      blend
        batch.blend = true;
        batch.z_sort = false;
        batch.depth_mask = true;
        batch.alpha_clip = false;
        break;
    case "CLIP":        // Alpha Clip       don't sort      discard
        batch.blend = false;
        batch.z_sort = false;
        batch.depth_mask = true;
        batch.alpha_clip = true;
        break;
    case "ADD":         // Add              don't sort      blend, depthMask(false)
        batch.blend = true;
        batch.z_sort = false;
        batch.depth_mask = false;
        batch.alpha_clip = false;
        break;
    case "OPAQUE":      // Opaque           don't sort      don't blend
        batch.blend = false;
        batch.z_sort = false;
        batch.depth_mask = true;
        batch.alpha_clip = false;
        break;
    default:
        m_util.panic("Unknown alpha blend mode: " + alpha_blend);
    }

    batch.use_backface_culling = gs["use_backface_culling"];
}

/**
 * Return array of valid textures
 */
function find_valid_textures(key, value, slots) {
    var results = [];

    var len = slots.length;
    for (var i = 0; i < len; i++) {
        var slot = slots[i];
        if (slot[key] == value && slot["texture"] && slot["texture"]._render)
            results.push(slot);
    }
    return results;
}

function init_water_material(material, batch) {

    batch.water = true;
    batch.water_dynamic         = material["b4w_water_dynamic"];

    if (material["b4w_water_shore_smoothing"] && !batch.blend) {
        m_print.warn("Material: \"" + material["name"] + "\" is opaque.",
                     "Disabling shore smoothing.");
        batch.water_shore_smoothing = false;
    } else
        batch.water_shore_smoothing =
                batch.subtype != "REFLECT" ? material["b4w_water_shore_smoothing"]: false;

    apply_shader(batch, "water.glslv", "water.glslf");

    var data = {
        use_shadeless: false,
        diffuse_shader: material["diffuse_shader"],
        specular_shader: material["specular_shader"],
        use_tangent_shading: material["use_tangent_shading"]
    }
    var nmat_graph = m_nodemat.create_lighting_graph(material["uuid"], 
            material["name"], data);
    batch.shaders_info.node_elements =
            m_nodemat.compose_node_elements(nmat_graph);

    set_batch_c_attr(batch, "a_position");

    // debug wireframe mode
    if (cfg_def.water_wireframe_debug) {
        set_batch_c_attr(batch, "a_polyindex");
        batch.depth_mask = true;
        m_vec3.set(0, 0, 0, batch.wireframe_edge_color);

        if (m_extensions.get_standard_derivatives())
            set_batch_directive(batch, "DEBUG_WIREFRAME", 1);
        else
            set_batch_directive(batch, "DEBUG_WIREFRAME", 2);
    } else
        set_batch_directive(batch, "DEBUG_WIREFRAME", 0);

    var texture_slots = material["texture_slots"];
    var normalmaps = find_valid_textures("use_map_normal", true, texture_slots);
    var mirrormap0 = find_valid_textures("use_map_mirror", true, texture_slots)[0];

    if (normalmaps.length) {
        var tex_nm = m_textures.get_batch_texture(normalmaps[0]);
        append_texture(batch, tex_nm, "u_normalmap0");
        batch.water_norm_uv_velocity = material["b4w_water_norm_uv_velocity"];
    }

    set_batch_directive(batch, "NUM_NORMALMAPS", normalmaps.length);

    batch.normalmap_scales = new Array(normalmaps.length);
    for (var i = 0; i < normalmaps.length; i++) {
        batch.normalmap_scales[i] = new Float32Array(2);
        batch.normalmap_scales[i].set([normalmaps[i]["scale"][0], normalmaps[i]["scale"][1]]);
    }

    if (mirrormap0) {
        var tex_mm = m_textures.get_batch_texture(mirrormap0);
        append_texture(batch, tex_mm, "u_mirrormap");
        batch.mirror_factor = mirrormap0["mirror_factor"];
    }

    var foam = null;

    if (cfg_def.foam)
        for (var i = 0; i < texture_slots.length; i++) {
            // find first foam texture
            var texture = texture_slots[i];
            if (texture["texture"]["b4w_water_foam"] === true) {
               foam = texture;
               break;
            }
        }

    if (foam) {
        set_batch_directive(batch, "FOAM", 1);

        var tex_foam = m_textures.get_batch_texture(foam);
        append_texture(batch, tex_foam, "u_foam");

        batch.foam_factor = material["b4w_foam_factor"];
        batch.foam_uv_freq.set(foam["texture"]["b4w_foam_uv_freq"]);
        batch.foam_mag.set(foam["texture"]["b4w_foam_uv_magnitude"]);
        // vec3 -> vec2
        batch.foam_scale[0] = foam["scale"][0];
        batch.foam_scale[1] = foam["scale"][1];
    }

    for (var i = 0; i < texture_slots.length; i++) {
        // find first shore distance texture
        var texture = texture_slots[i];
        if (texture["texture"]["b4w_shore_dist_map"] === true) {
            var shore_dist_map = texture;
            break;
        }
    }

    if (shore_dist_map && cfg_def.allow_vertex_textures) {
        var tex_shr0 = m_textures.get_batch_texture(shore_dist_map);
        append_texture(batch, tex_shr0, "u_shore_dist_map");
        set_batch_directive(batch, "SHORE_PARAMS", 1);

        var sh_bounds = texture["texture"]["b4w_shore_boundings"];

        set_batch_directive(batch, "MAX_SHORE_DIST", m_shaders.glsl_value(
                                    texture["texture"]["b4w_max_shore_dist"]));

        set_batch_directive(batch, "SHORE_MAP_SIZE_X", m_shaders.glsl_value(
                                    sh_bounds[0] - sh_bounds[1]));

        set_batch_directive(batch, "SHORE_MAP_SIZE_Y", m_shaders.glsl_value(
                                    sh_bounds[2] - sh_bounds[3]));

        set_batch_directive(batch, "SHORE_MAP_CENTER_X",m_shaders.glsl_value(
                                    (sh_bounds[0] + sh_bounds[1]) / 2));

        set_batch_directive(batch, "SHORE_MAP_CENTER_Y", m_shaders.glsl_value(
                                    (sh_bounds[2] + sh_bounds[3]) / 2));
    }

    if (material["b4w_generated_mesh"]) {
        set_batch_directive(batch, "GENERATED_MESH", 1);
        batch.water_generated_mesh = true;
        batch.water_num_cascads    = material["b4w_water_num_cascads"];
        batch.water_subdivs        = material["b4w_water_subdivs"];
        batch.water_detailed_dist  = material["b4w_water_detailed_dist"];
    } else {
        set_batch_c_attr(batch, "a_tbn_quat");
        if (foam || normalmaps.length) {
            set_batch_c_attr(batch, "a_texcoord");
            batch.part_use_tangent = true;
        }
        set_batch_directive(batch, "GENERATED_MESH", 0);
    }

    if (material["b4w_water_dynamic"]) {

        // setup dynamic water params
        var dst_noise_scale0  = m_shaders.glsl_value(material["b4w_water_dst_noise_scale0"]);
        var dst_noise_scale1  = m_shaders.glsl_value(material["b4w_water_dst_noise_scale1"]);
        var dst_noise_freq0   = m_shaders.glsl_value(material["b4w_water_dst_noise_freq0"]);
        var dst_noise_freq1   = m_shaders.glsl_value(material["b4w_water_dst_noise_freq1"]);
        var dir_min_shore_fac = m_shaders.glsl_value(material["b4w_water_dir_min_shore_fac"]);
        var dir_freq          = m_shaders.glsl_value(material["b4w_water_dir_freq"]);
        var dir_noise_scale   = m_shaders.glsl_value(material["b4w_water_dir_noise_scale"]);
        var dir_noise_freq    = m_shaders.glsl_value(material["b4w_water_dir_noise_freq"]);
        var dir_min_noise_fac = m_shaders.glsl_value(material["b4w_water_dir_min_noise_fac"]);
        var dst_min_fac       = m_shaders.glsl_value(material["b4w_water_dst_min_fac"]);
        var waves_hor_fac     = m_shaders.glsl_value(material["b4w_water_waves_hor_fac"]);

        set_batch_directive(batch, "DST_NOISE_SCALE_0", dst_noise_scale0);
        set_batch_directive(batch, "DST_NOISE_SCALE_1", dst_noise_scale1);
        set_batch_directive(batch, "DST_NOISE_FREQ_0",  dst_noise_freq0);
        set_batch_directive(batch, "DST_NOISE_FREQ_1",  dst_noise_freq1);
        set_batch_directive(batch, "DIR_MIN_SHR_FAC",   dir_min_shore_fac);
        set_batch_directive(batch, "DIR_FREQ",          dir_freq);
        set_batch_directive(batch, "DIR_NOISE_SCALE",   dir_noise_scale);
        set_batch_directive(batch, "DIR_NOISE_FREQ",    dir_noise_freq);
        set_batch_directive(batch, "DIR_MIN_NOISE_FAC", dir_min_noise_fac);
        set_batch_directive(batch, "DST_MIN_FAC",       dst_min_fac);
        set_batch_directive(batch, "WAVES_HOR_FAC",     waves_hor_fac);
    }

    update_batch_specular_params(batch, material);
    update_batch_diffuse_params(batch, material);

    batch.shallow_water_col.set(material["b4w_shallow_water_col"]);
    batch.shore_water_col.set(material["b4w_shore_water_col"]);
    batch.shallow_water_col_fac = material["b4w_shallow_water_col_fac"];
    batch.shore_water_col_fac   = material["b4w_shore_water_col_fac"];

    set_batch_directive(batch, "ABSORB",
                       m_shaders.glsl_value(material["b4w_water_absorb_factor"]));
    set_batch_directive(batch, "SSS_STRENGTH",
                       m_shaders.glsl_value(material["b4w_water_sss_strength"]));
    set_batch_directive(batch, "SSS_WIDTH",
                       m_shaders.glsl_value(material["b4w_water_sss_width"]));
}

function update_batch_fresnel_params(batch, material) {
    var rt = material["raytrace_transparency"];
    // used for transparent reflective objects (e.g. water)
    batch.fresnel_params[0] = rt["fresnel"];
    // map [1.0 - 5.0] to [0.0 - 0.8]
    batch.fresnel_params[1] = 1 - rt["fresnel_factor"] / 5;

    var rm = material["raytrace_mirror"];
    // used for non-transparent reflective objects
    batch.reflect_factor = rm["reflect_factor"];
    batch.fresnel_params[2] = rm["fresnel"];
    // map [0.0 - 5.0] to [0.0 - 1.0]
    batch.fresnel_params[3] = 1 - rm["fresnel_factor"] / 5;
}

function update_batch_specular_params(batch, material) {
    var spec_param_0;
    var spec_param_1 = 0;
    switch (material["specular_shader"]) {
    case "PHONG":
    case "COOKTORR":
        spec_param_0 = material["specular_hardness"];
        break;
    case "WARDISO":
        spec_param_0 = material["specular_slope"];
        break;
    case "TOON":
        spec_param_0 = material["specular_toon_size"];
        spec_param_1 = material["specular_toon_smooth"];
        break;
    case "BLINN":
        spec_param_0 = material["specular_ior"];
        spec_param_1 = material["specular_hardness"];
        break;
    default:
        m_print.error("unsupported specular shader: " +
            material["specular_shader"] + " (material \"" +
            material["name"] + "\")");
        spec_param_0 = material["specular_hardness"];
        break;
    }
    batch.specular_params[0] = material["specular_intensity"];
    batch.specular_params[1] = spec_param_0;
    batch.specular_params[2] = spec_param_1;
}

function update_batch_diffuse_params(batch, material) {
    switch (material["diffuse_shader"]) {
    case "LAMBERT":
        batch.diffuse_params[0] = 0.0;
        batch.diffuse_params[1] = 0.0;
        break;
    case "OREN_NAYAR":
        batch.diffuse_params[0] = material["roughness"];
        batch.diffuse_params[1] = 0.0;
        break;
    case "FRESNEL":
        batch.diffuse_params[0] = material["diffuse_fresnel"];
        batch.diffuse_params[1] = material["diffuse_fresnel_factor"];
        break;
    case "MINNAERT":
        batch.diffuse_params[0] = material["darkness"];
        batch.diffuse_params[1] = 0.0;
        break;
    case "TOON":
        batch.diffuse_params[0] = material["diffuse_toon_size"];
        batch.diffuse_params[1] = material["diffuse_toon_smooth"];
        break;
    default:
        m_print.error("unsupported diffuse shader: " +
            material["diffuse_shader"] + " (material \"" +
            material["name"] + "\")");
        batch.diffuse_params[0] = 0.0;
        batch.diffuse_params[1] = 0.0;
        break;
    }
}

function update_batch_material_nodes(batch, material, shader_type) {
    if (!material["use_nodes"] || material["b4w_do_not_render"])
        return false;

    var is_glow_output;
    switch (shader_type) {
    case "MAIN":
        apply_shader(batch, "main.glslv", "main.glslf");
        is_glow_output = false;
        break;
    case "GLOW":
        apply_shader(batch, "main.glslv", "main.glslf");
        is_glow_output = true;
        break;
    case "SHADOW":
        apply_shader(batch, "shadow.glslv", "shadow.glslf");
        is_glow_output = false;
        break;
    case "COLOR_ID":
        apply_shader(batch, "color_id.glslv", "color_id.glslf");
        is_glow_output = false;
        break;
    }

    var node_tree = material["node_tree"];
    var uuid = material["uuid"];
    
    var ngraph_proxy = m_nodemat.compose_ngraph_proxy(node_tree, uuid,
            false, material["name"], shader_type);
    if (!ngraph_proxy.graph) {
        m_print.error("Failed to create node graph for material \"" +
                material["name"] + "\", disable nodes");
        update_batch_material_error(batch, material);
        return true;
    }
    batch.ngraph_proxy_id = ngraph_proxy.id;

    batch.has_nodes = true;
    set_batch_directive(batch, "NODES", 1);

    // some common stuff
    set_batch_directive(batch, "DOUBLE_SIDED_LIGHTING",
            (material["b4w_double_sided_lighting"]) ? 1 : 0);

    set_batch_c_attr(batch, "a_position");

    if (material["use_orco_tex_coord"])
        set_batch_c_attr(batch, "a_orco_tex_coord");

    update_batch_game_settings(batch, material);
    batch.offset_z = material["offset_z"];

    var gs = material["game_settings"];
    var alpha_blend = gs["alpha_blend"];

    if (is_glow_output) {
        set_batch_directive(batch, "ALPHA", 1);
        set_batch_directive(batch, "ALPHA_CLIP", 0);
    } else {
        set_batch_directive(batch, "ALPHA", (alpha_blend === "OPAQUE") ? 0 : 1);
        set_batch_directive(batch, "ALPHA_CLIP", (alpha_blend === "CLIP") ? 1 : 0);
    }

    batch.xray = material["b4w_render_above_all"] && alpha_blend != "OPAQUE"
                    && alpha_blend != "CLIP";

    batch.emit = material["emit"];
    batch.ambient = material["ambient"];
    update_batch_fresnel_params(batch, material);

    if (material["b4w_wettable"]) {
        set_batch_directive(batch, "WETTABLE", 1);
    } else
        set_batch_directive(batch, "WETTABLE", 0);

    var node_texture = null;
    var has_material_nodes = false;
    m_graph.traverse(ngraph_proxy.graph, function(node, attr) {
        switch (attr.type) {
        case "UVMAP":
        case "TEX_COORD_UV":
        case "GEOMETRY_UV":
        case "UV_MERGED":
            var name = attr.data.name;
            var uv_layer = attr.data.value;
            // NOTE: will fail in case of multiple names for single uv layer
            if (!batch.uv_maps_usage)
                batch.uv_maps_usage = {};
            batch.uv_maps_usage[uv_layer] = name;
            break;
        case "GEOMETRY_VC":
        case "GEOMETRY_VC1":
        case "GEOMETRY_VC2":
        case "GEOMETRY_VC3":
            var name = attr.data.name;
            var vc_layer = attr.data.value;

            // NOTE: will fail in case of multiple names for single vc layer
            batch.vertex_colors_usage[name] = {
                generate_buffer: true,
                src: [{ name: vc_layer}]
            };

            var mask = 0;
            if (attr.type == "GEOMETRY_VC")
                mask = 7;
            else {
                for (var i = 0; i < attr.outputs.length; i++) {
                    var index = "RGB".indexOf(attr.outputs[i].identifier);
                    if (index > -1)
                        mask |= 1 << (2 - index);
                }
            }
            batch.vertex_colors_usage[name].src[0].mask = mask;
            break;
        case "TEX_COORD_NO":
        case "GEOMETRY_NO":
            set_batch_c_attr(batch, "a_tbn_quat");
            break;

        case "MATERIAL_BEGIN":
            var mat_data = attr.data.value;
            if (mat_data.use_tangent_shading) {
                set_batch_directive(batch, "USE_TBN_SHADING", 1);
                if (batch.type != "PARTICLES")
                    set_batch_c_attr(batch, "a_shade_tangs");
                else
                    batch.part_use_tangent = true;
            }
            set_batch_c_attr(batch, "a_tbn_quat");
            has_material_nodes = true;
            break;
        case "TEXTURE_COLOR":
        case "TEXTURE_ENVIRONMENT":
            var name = attr.data.name;
            var tex = attr.data.value;

            // unsupported texture type, render wasn't created
            if (!tex._render) {
                m_print.warn("Wrong texture \"" + attr.data.value["name"] +
                        "\" in material \"" + material["name"] + "\".")
                update_batch_material_error(batch, material);
                return;
            }

            if (tex._render.allow_node_dds !== false)
                if (attr.type != "TEXTURE_ENVIRONMENT")
                    tex._render.allow_node_dds = true;
                else
                    tex._render.allow_node_dds = false;

            append_texture(batch, tex._render, name);
            break;
        case "TEXTURE_NORMAL":
        case "B4W_PARALLAX":
            set_batch_directive(batch, "CALC_TBN_SPACE", 1);
            set_batch_c_attr(batch, "a_tbn_quat");
            batch.part_use_tangent = true;
            var name = attr.data.name;
            var tex = attr.data.value;

            tex._render.allow_node_dds = false;
            append_texture(batch, tex._render, name);

            break;
        case "NORMAL_MAP":
            set_batch_c_attr(batch, "a_tbn_quat");

            var space = Number(attr.dirs[0][1]);
            // NOTE: keep synchronized with nodemat.js:append_nmat_node
            switch (space) {
            case m_nodemat.NM_TANGENT:
                set_batch_directive(batch, "CALC_TBN_SPACE", 1);
                batch.part_use_tangent = true;
                break;
            case m_nodemat.NM_OBJECT:
            case m_nodemat.NM_BLENDER_OBJECT:
                set_batch_directive(batch, "USE_MODEL_MATRIX", 1);
                break;
            }
            break;
        case "LAMP":
            if (attr.data)
                batch.lamp_uuid_indexes = attr.data;
            break;
        case "B4W_REFRACTION":
            if (batch.blend)
                batch.refractive = true;
            else {
                batch.refractive = false;
                m_print.warn("Material \"" + material["name"] + "\" is not blend. " +
                             "Disabling refractions.")
            }
            break;
        case "VALTORGB":
        case "CURVE_VEC":
        case "CURVE_RGB":
            if (!node_texture)
                node_texture = attr.data.texture;
            break;
        case "PARTICLE_INFO":
            if (batch.type == "PARTICLES" && attr.data)
                batch.part_node_data = attr.data;
            break;
        case "VECT_TRANSFORM":
            var conv_type = Number(attr.dirs[1][1]);
            // NOTE: keep synchronized with nodemat.js:append_nmat_node
            switch (conv_type) {
            case m_nodemat.VT_WORLD_TO_OBJECT:
                 set_batch_directive(batch, "USE_MODEL_MATRIX_INVERSE", 1);
                 break;
            case m_nodemat.VT_WORLD_TO_CAMERA:
                 set_batch_directive(batch, "USE_VIEW_MATRIX", 1);
                 break;
            case m_nodemat.VT_OBJECT_TO_WORLD:
                 set_batch_directive(batch, "USE_MODEL_MATRIX", 1);
                 break;
            case m_nodemat.VT_OBJECT_TO_CAMERA:
                 set_batch_directive(batch, "USE_MODEL_MATRIX", 1);
                 set_batch_directive(batch, "USE_VIEW_MATRIX", 1);
                 break;
            case m_nodemat.VT_CAMERA_TO_WORLD:
                 set_batch_directive(batch, "USE_VIEW_MATRIX_INVERSE", 1);
                 break;
            case m_nodemat.VT_CAMERA_TO_OBJECT:
                 set_batch_directive(batch, "USE_MODEL_MATRIX_INVERSE", 1);
                 set_batch_directive(batch, "USE_VIEW_MATRIX_INVERSE", 1);
                 break;
            }
            break;
        case "B4W_VECTOR_VIEW":
            set_batch_directive(batch, "USE_VIEW_MATRIX", 1);
            break;
        case "B4W_REFLECT":
            set_batch_directive(batch, "USE_VIEW_MATRIX_INVERSE", 1);
            break;
        }
    });

    if (node_texture)
        append_texture(batch, node_texture, "u_nodes_texture");

    if (!has_material_nodes)
        batch.use_shadeless = true;

    var node_elems = batch.shaders_info.node_elements =
          m_nodemat.compose_node_elements(ngraph_proxy.graph);

    prepare_nodemats_containers(node_tree, batch, material["name"]);

    var node_value_inds = batch.node_value_inds;
    var node_rgb_inds = batch.node_rgb_inds;

    for (var i = 0; i < node_elems.length; i++) {
        var node = node_elems[i];
        switch (node.id) {
        case "VALUE":
            var ind = node.param_values[0];
            if (ind) {
                for (var j = 0; j < node_value_inds.length; j+=2) {
                    if (node_value_inds[j] == ind) {
                        node.dirs.push(["VALUE_IND", node_value_inds[j+1]]);
                        break;
                    }
                }
            }
            break;
        case "RGB":
            var ind = node.param_values[0];
            if (ind) {
                for (var j = 0; j < node_rgb_inds.length; j+=2) {
                    if (node_rgb_inds[j] == ind) {
                        node.dirs.push(["RGB_IND", node_rgb_inds[j+1]]);
                        break;
                    }
                }
            }
            break;
        default:
        }
    }

    set_batch_directive(batch, "NUM_VALUES", batch.node_values.length);
    set_batch_directive(batch, "NUM_RGBS", batch.node_rgbs.length);

    return true;
}

function prepare_nodemats_containers(node_tree, batch, mat_name) {

    var node_values = [];
    var node_value_inds = [];
    var node_rgbs = [];
    var node_rgb_inds = [];

    gather_node_values_r(node_tree, "",
                         node_values, node_value_inds,
                         node_rgbs, node_rgb_inds);

    batch.node_values = node_values;
    batch.node_value_inds = node_value_inds;
    batch.node_rgbs = node_rgbs;
    batch.node_rgb_inds = node_rgb_inds;
}

function gather_node_values_r(node_tree, names_str,
                              node_values, value_inds,
                              node_rgbs, rgb_inds) {

    // collect all VALUE and RGB nodes
    for (var i = 0; i < node_tree["nodes"].length; i++) {
        var node = node_tree["nodes"][i];
        if (node["type"] == "VALUE") {
            var param_name = join_name(names_str, node["name"]);
            node_values.push(node["outputs"][0]["default_value"]);
            value_inds.push(param_name, value_inds.length / 2);

        } else if (node["type"] == "RGB") {
            var param_name = join_name(names_str, node["name"]);
            var def_value = node["outputs"][0]["default_value"].slice(0,3);
            node_rgbs.push(def_value[0], def_value[1], def_value[2]);
            rgb_inds.push(param_name, rgb_inds.length / 2);

        } else if (node["type"] == "GROUP") {
            var gr_node_tree = node["node_group"]["node_tree"];
            var new_names_str = join_name(names_str, node["name"]);
            gather_node_values_r(gr_node_tree, new_names_str, node_values,
                                 value_inds, node_rgbs, rgb_inds);
        }
    }
}

function join_name(name1, name2) {
    var new_name = name1 ? name1 + "%join%": "";
    new_name += name2;
    return new_name;
}

exports.append_texture_to_batch = function (batch, image_data, tex_name, size) {
    var tex = m_textures.generate_batch_texure(image_data, size);
    append_texture(batch, tex, tex_name);
}

exports.update_batch_material_error = update_batch_material_error;
function update_batch_material_error(batch, material) {

    switch (batch.type) {
    case "SHADOW":
        apply_shader(batch, "shadow.glslv", "shadow.glslf");
        break;
    case "COLOR_ID":
        apply_shader(batch, "color_id.glslv", "color_id.glslf");
        break;
    default:
        apply_shader(batch, "main.glslv", "main_stack.glslf");
        break;
    }

    set_batch_directive(batch, "SHADELESS", 1);
    set_batch_c_attr(batch, "a_position");
    set_batch_c_attr(batch, "a_tbn_quat");
    m_vec4.set(1, 0, 1, 1, batch.diffuse_color);

    if (material) {

        var alpha_blend = material["game_settings"]["alpha_blend"];
        set_batch_directive(batch, "ALPHA", (alpha_blend === "OPAQUE") ? 0 : 1);
        set_batch_directive(batch, "ALPHA_CLIP", (alpha_blend === "CLIP") ? 1 : 0);

        set_batch_directive(batch, "VERTEX_COLOR", 0);

        batch.offset_z = material["offset_z"];

        update_batch_game_settings(batch, material);
    }

    return true;
}

function update_batch_material_shadow_receive(batch, material) {

    if (material["b4w_lens_flares"] ||
            material["b4w_water"] ||
            material["b4w_do_not_render"] ||
            material["type"] === "HALO")
        return false;

    update_batch_game_settings(batch, material);

    if (batch.blend)
        return false;

    var alpha_blend = material["game_settings"]["alpha_blend"];

    if (material["use_nodes"] && alpha_blend == "CLIP")
        update_batch_material_nodes(batch, material, "SHADOW");
    else
        apply_shader(batch, "shadow.glslv", "shadow.glslf");

    m_vec4.set(0, 0, 0, material["alpha"], batch.diffuse_color);

    set_batch_c_attr(batch, "a_position");
    set_batch_c_attr(batch, "a_tbn_quat");

    var alpha = (alpha_blend === "OPAQUE") ? 0 : 1;
    set_batch_directive(batch, "ALPHA", alpha);

    //set_batch_directive(batch, "ALPHA_CLIP", alpha_clip);

    batch.texture_scale.set([1, 1, 1]);

    var texture_slots = material["texture_slots"];
    var colormap0 = find_valid_textures("use_map_color_diffuse", true, texture_slots)[0];
    var alpha_clip = (alpha_blend === "CLIP") ? 1 : 0;

    if (colormap0 && alpha_clip) {

        switch (colormap0["blend_type"]) {
        case "MIX":
            set_batch_directive(batch, "TEXTURE_BLEND_TYPE", "TEXTURE_BLEND_TYPE_MIX");
            break;
        case "MULTIPLY":
            set_batch_directive(batch, "TEXTURE_BLEND_TYPE", "TEXTURE_BLEND_TYPE_MULTIPLY");
            break;
        }

        batch.texture_scale.set(colormap0["scale"]);
        set_batch_directive(batch, "TEXTURE_COLOR", 1);
        set_batch_c_attr(batch, "a_texcoord");

        if (colormap0["texture"]._render.source == "IMAGE" ||
                colormap0["texture"]._render.source == "ENVIRONMENT_MAP" ||
                colormap0["texture"]._render.source == "CANVAS") {
            var tex = m_textures.get_batch_texture(colormap0);
            append_texture(batch, tex, "u_colormap0");
        }

        // for texture rendering
        if (colormap0["texture"]._render.source == "NONE") {
            var tex = m_textures.get_batch_texture(colormap0);
            append_texture(batch, tex, "u_colormap0");
        }
    } else
        set_batch_directive(batch, "TEXTURE_COLOR", 0);

    return true;
}

function update_batch_material_physics(batch, material) {
    if (material["b4w_collision"]) {
        batch.use_ghost = material["b4w_use_ghost"];
        batch.collision_id = material["b4w_collision_id"];
        batch.collision_margin = material["b4w_collision_margin"];
        batch.collision_group = material["b4w_collision_group"];
        batch.collision_mask = material["b4w_collision_mask"];
        batch.friction = material["physics"]["friction"];
        batch.elasticity = material["physics"]["elasticity"];
        return true;

    } else if (material["b4w_water"]) {
        // setup dynamic water params
        batch.water = true;
        batch.water_dynamics    = material["b4w_water_dynamic"];
        batch.dst_noise_scale0  = material["b4w_water_dst_noise_scale0"];
        batch.dst_noise_scale1  = material["b4w_water_dst_noise_scale1"];
        batch.dst_noise_freq0   = material["b4w_water_dst_noise_freq0"];
        batch.dst_noise_freq1   = material["b4w_water_dst_noise_freq1"];
        batch.dir_min_shore_fac = material["b4w_water_dir_min_shore_fac"];
        batch.dir_freq          = material["b4w_water_dir_freq"];
        batch.dir_noise_scale   = material["b4w_water_dir_noise_scale"];
        batch.dir_noise_freq    = material["b4w_water_dir_noise_freq"];
        batch.dir_min_noise_fac = material["b4w_water_dir_min_noise_fac"];
        batch.dst_min_fac       = material["b4w_water_dst_min_fac"];
        batch.waves_hor_fac     = material["b4w_water_waves_hor_fac"];
        return true;

    } else
        return false;
}

function update_batch_material_color_id(batch, material) {
    if (material["b4w_lens_flares"] || material["type"] === "HALO")
        return false;

    update_batch_game_settings(batch, material);

    batch.z_sort = false;
    batch.depth_mask = true;

    // blend allowed but rendered as non-blend
    batch.blend = false;

    var gs = material["game_settings"];
    var alpha_blend = gs["alpha_blend"];
    batch.xray = material["b4w_render_above_all"] && alpha_blend != "OPAQUE"
                    && alpha_blend != "CLIP";

    if (material["use_nodes"] && alpha_blend == "CLIP")
        update_batch_material_nodes(batch, material, "COLOR_ID");
    else
        apply_shader(batch, "color_id.glslv", "color_id.glslf");

    m_vec4.set(0, 0, 0, material["alpha"], batch.diffuse_color);

    set_batch_c_attr(batch, "a_position");

    var alpha = (alpha_blend === "OPAQUE") ? 0 : 1;
    set_batch_directive(batch, "ALPHA", alpha);

    batch.texture_scale.set([1, 1, 1]);

    var texture_slots = material["texture_slots"];
    var colormap0 = find_valid_textures("use_map_color_diffuse", true, texture_slots)[0];

    var alpha_clip = (alpha_blend === "CLIP") ? 1 : 0;
    set_batch_directive(batch, "ALPHA_CLIP", alpha_clip);

    if (colormap0 && alpha_clip) {

        switch (colormap0["blend_type"]) {
        case "MIX":
            set_batch_directive(batch, "TEXTURE_BLEND_TYPE", "TEXTURE_BLEND_TYPE_MIX");
            break;
        case "MULTIPLY":
            set_batch_directive(batch, "TEXTURE_BLEND_TYPE", "TEXTURE_BLEND_TYPE_MULTIPLY");
            break;
        }
        batch.texture_scale.set(colormap0["scale"]);
        set_batch_directive(batch, "TEXTURE_COLOR", 1);
        set_batch_c_attr(batch, "a_texcoord");

        if (colormap0["texture"]._render.source == "IMAGE" ||
                colormap0["texture"]._render.source == "ENVIRONMENT_MAP") {
            var tex = m_textures.get_batch_texture(colormap0);
            append_texture(batch, tex, "u_colormap0");
        }

        // for texture rendering
        if (colormap0["texture"]._render.source == "NONE") {
            var tex = m_textures.get_batch_texture(colormap0);
            append_texture(batch, tex, "u_colormap0");
        }
    } else
        set_batch_directive(batch, "TEXTURE_COLOR", 0);

    return true;
}

function update_batch_material_debug_view(batch, material) {
    if (material && (material["b4w_lens_flares"] ||
            material["b4w_do_not_render"]))
        return false;

    apply_shader(batch, "debug_view.glslv", "debug_view.glslf");
    set_batch_c_attr(batch, "a_position");
    set_batch_c_attr(batch, "a_tbn_quat");
    set_batch_c_attr(batch, "a_polyindex");

    batch.depth_mask = true;

    m_vec3.set(0, 0, 0, batch.wireframe_edge_color);

    return true;
}

function update_batch_material_grass_map(batch, material) {
    if (!material["b4w_terrain"] || material["b4w_do_not_render"])
        return false;

    update_batch_game_settings(batch, material);
    // override some gs
    batch.blend = false;
    batch.z_sort = false;
    batch.depth_mask = true;

    apply_shader(batch, "grass_map.glslv", "grass_map.glslf");
    set_batch_c_attr(batch, "a_position");

    if (material["b4w_dynamic_grass_size"])
        var vc_usage_gr_size = material["b4w_dynamic_grass_size"];
    else
        var vc_usage_gr_size = null;
    if (material["b4w_dynamic_grass_color"])
        var vc_usage_gr_color = material["b4w_dynamic_grass_color"];
    else
        var vc_usage_gr_color = null;

    batch.vertex_colors_usage["a_grass_size"] = {
        generate_buffer: true,
        src: []
    }
    if (vc_usage_gr_size) {
        batch.vertex_colors_usage["a_grass_size"].src.push({
                name: vc_usage_gr_size, mask: 4 });
        set_batch_directive(batch, "DYNAMIC_GRASS_SIZE", 1);
    } else
        set_batch_directive(batch, "DYNAMIC_GRASS_SIZE", 0);

    batch.vertex_colors_usage["a_grass_color"] = {
        generate_buffer: true,
        src: []
    }
    if (vc_usage_gr_color) {
        batch.vertex_colors_usage["a_grass_color"].src.push({
                name: vc_usage_gr_color, mask: 7 });
        set_batch_directive(batch, "DYNAMIC_GRASS_COLOR", 1);
    } else
        set_batch_directive(batch, "DYNAMIC_GRASS_COLOR", 0);

    return true;
}

function update_batch_material_particles(batch, material) {
    if (material["b4w_do_not_render"])
        return false;

    var texture_slots = material["texture_slots"];

    if (batch.halo_particles) {
        apply_shader(batch, "particle_system.glslv", "particle_system_stack.glslf");
        set_batch_directive(batch, "HALO_PARTICLES", 1);
        set_batch_halo_data(batch, material);
    } else {
        
        var data = {
            use_shadeless: false,
            diffuse_shader: material["diffuse_shader"],
            specular_shader: material["specular_shader"],
            use_tangent_shading: material["use_tangent_shading"]
        }
        if (material["use_nodes"]) {
            apply_shader(batch, "particle_system.glslv", "particle_system.glslf");
            update_batch_material_nodes(batch, material, "PARTICLES");
            return true;
        } else {
            apply_shader(batch, "particle_system.glslv", "particle_system_stack.glslf");
            var nmat_graph = m_nodemat.create_lighting_graph(material["uuid"], 
                    material["name"], data);
            batch.shaders_info.node_elements =
                    m_nodemat.compose_node_elements(nmat_graph);
        }

        var colormap = find_valid_textures("use_map_color_diffuse", true, texture_slots)[0];

        if (colormap) {
            set_batch_directive(batch, "TEXTURE_COLOR", 1);

            switch (colormap["blend_type"]) {
            case "MIX":
                set_batch_directive(batch, "TEXTURE_BLEND_TYPE", "TEXTURE_BLEND_TYPE_MIX");
                break;
            case "MULTIPLY":
                set_batch_directive(batch, "TEXTURE_BLEND_TYPE", "TEXTURE_BLEND_TYPE_MULTIPLY");
                break;
            }

            batch.diffuse_color_factor = colormap["diffuse_color_factor"];
            if (colormap["use_map_alpha"])
                batch.alpha_factor = colormap["alpha_factor"];
            else
                batch.alpha_factor = 0.0;

            var tex = m_textures.get_batch_texture(colormap);
            append_texture(batch, tex);
        }
    }

    m_vec4.set(material["diffuse_color"][0], material["diffuse_color"][1],
            material["diffuse_color"][2], material["alpha"],
            batch.diffuse_color);

    batch.ambient = material["ambient"];
    batch.diffuse_intensity = material["diffuse_intensity"];
    batch.emit = material["emit"];
    batch.specular_color.set(material["specular_color"]);
    batch.specular_alpha = material["specular_alpha"];

    set_batch_c_attr(batch, "a_position");
    set_batch_c_attr(batch, "a_tbn_quat");

    var alpha_blend = material["game_settings"]["alpha_blend"];
    set_batch_directive(batch, "ALPHA", (alpha_blend === "OPAQUE") ? 0 : 1);
    set_batch_directive(batch, "ALPHA_CLIP", (alpha_blend === "CLIP") ? 1 : 0);

    set_batch_directive(batch, "PARTICLES_SHADELESS",
                        material["use_shadeless"] ? 1 : 0);

    update_batch_specular_params(batch, material);
    update_batch_diffuse_params(batch, material);

    update_batch_game_settings(batch, material);

    var gs = material["game_settings"];
    var alpha_blend = gs["alpha_blend"];
    batch.xray = material["b4w_render_above_all"] && alpha_blend != "OPAQUE"
                    && alpha_blend != "CLIP";

    batch.offset_z = material["offset_z"];

    return true;
}

/**
 * Update batch from object render
 */
function update_batch_render(batch, render) {

    if (batch.type === "PHYSICS")
        return;

    if (render.type == "DYNAMIC") {
        if (render.is_hair_particles)
            set_batch_directive(batch, "AU_QUALIFIER", "GLSL_IN");
        else
            set_batch_directive(batch, "AU_QUALIFIER", "uniform");
        set_batch_directive(batch, "STATIC_BATCH", 0);
    } else {
        set_batch_directive(batch, "AU_QUALIFIER", "GLSL_IN");
        set_batch_directive(batch, "STATIC_BATCH", 1);
    }

    if (batch.type == "DEBUG_VIEW") {
        if (m_extensions.get_standard_derivatives())
            set_batch_directive(batch, "WIREFRAME_QUALITY", 1);
        else
            set_batch_directive(batch, "WIREFRAME_QUALITY", 0);

        if (batch.debug_sphere) {
            set_batch_directive(batch, "DEBUG_SPHERE", 1);
            if (batch.debug_sphere_dynamic)
                set_batch_directive(batch, "DEBUG_SPHERE_DYNAMIC", 1);
            else
                set_batch_directive(batch, "DEBUG_SPHERE_DYNAMIC", 0);
        } else
            set_batch_directive(batch, "DEBUG_SPHERE", 0);

        set_batch_directive(batch, "ALPHA", 1);
    }

    if (render.use_shape_keys)
        batch.use_shape_keys = render.use_shape_keys;

    if (render.wind_bending) {
        if (render.main_bend_col !== "") {

            batch.vertex_colors_usage["a_bending_col_main"] = {
                generate_buffer: true,
                src: [{ name: render.main_bend_col, mask: 4 }]
            }

            set_batch_c_attr(batch, "a_bending_col_main");

            if (render.detail_bend_col.leaves_stiffness      !== "" &&
                    render.detail_bend_col.leaves_phase      !== "" &&
                    render.detail_bend_col.overall_stiffness !== "") {

                batch.vertex_colors_usage["a_bending_col_detail"] = {
                    generate_buffer: true,
                    src: [
                        { name: render.detail_bend_col.leaves_stiffness, mask: 4 },
                        { name: render.detail_bend_col.leaves_phase, mask: 2 },
                        { name: render.detail_bend_col.overall_stiffness, mask: 1 }
                    ]
                }
                set_batch_c_attr(batch, "a_bending_col_detail");
                set_batch_c_attr(batch, "a_tbn_quat");

                set_batch_directive(batch, "DETAIL_BEND", 1);
            } else
                set_batch_directive(batch, "DETAIL_BEND", 0);

            set_batch_directive(batch, "MAIN_BEND_COL", 1);
        } else
            set_batch_directive(batch, "MAIN_BEND_COL", 0);

        set_batch_directive(batch, "WIND_BEND", 1);
    } else
        set_batch_directive(batch, "WIND_BEND", 0);

    if (render.bend_center_only)
        set_batch_directive(batch, "BEND_CENTER_ONLY", 1);
    else
        set_batch_directive(batch, "BEND_CENTER_ONLY", 0);

    set_batch_directive(batch, "BILLBOARD_PRES_GLOB_ORIENTATION",
            render.billboard_pres_glob_orientation | 0);

    if (render.billboard)
        set_batch_directive(batch, "BILLBOARD", 1);
    else
        set_batch_directive(batch, "BILLBOARD", 0);

    if (render.billboard && render.is_hair_particles)
        set_batch_directive(batch, "HAIR_BILLBOARD", 1);
    else
        set_batch_directive(batch, "HAIR_BILLBOARD", 0);

    if (render.billboard_spherical)
        set_batch_directive(batch, "BILLBOARD_SPHERICAL", 1);
    else
        set_batch_directive(batch, "BILLBOARD_SPHERICAL", 0);

    switch (render.billboard_type) {
    case "RANDOM":
        set_batch_directive(batch, "BILLBOARD_RANDOM", 1);
        set_batch_directive(batch, "BILLBOARD_JITTERED", 0);
        break;
    case "JITTERED":
        set_batch_directive(batch, "BILLBOARD_RANDOM", 0);
        set_batch_directive(batch, "BILLBOARD_JITTERED", 1);
        break;
    default:
        set_batch_directive(batch, "BILLBOARD_RANDOM", 0);
        set_batch_directive(batch, "BILLBOARD_JITTERED", 0);
        break;
    }

    if (render.dynamic_grass && cfg_def.allow_vertex_textures)
        set_batch_directive(batch, "DYNAMIC_GRASS", 1);
    else
        set_batch_directive(batch, "DYNAMIC_GRASS", 0);
    // set flag to recognize it during subs addition
    // maybe should analize directive instead
    batch.dynamic_grass = render.dynamic_grass;

    if (batch.type != "PARTICLES")
        batch.dynamic_geometry = render.dynamic_geometry;

    batch.shadow_cast = render.shadow_cast;
    batch.shadow_cast_only = render.shadow_cast_only;
    // NOTE: Will be overriden for DEPTH and COLOR_ID node batches
    batch.shadow_receive = render.shadow_receive && !batch.use_shadeless &&
        !(batch.blend && cfg_def.disable_blend_shadows_hack);

    batch.reflexible = render.reflexible;
    batch.reflexible_only = render.reflexible_only;
    batch.reflective = render.reflective;

    if (render.is_skinning) {
        set_batch_c_attr(batch, "a_influence");
        set_batch_directive(batch, "SKINNED", 1);
        if (cfg_def.skinning_hack) {
            set_batch_directive(batch, "DISABLE_TANGENT_SKINNING", 1);
            set_batch_directive(batch, "FRAMES_BLENDING", 0);
        } else {
            set_batch_directive(batch, "DISABLE_TANGENT_SKINNING", 0);
            if (render.frames_blending)
                set_batch_directive(batch, "FRAMES_BLENDING", 1);
            else
                set_batch_directive(batch, "FRAMES_BLENDING", 0);
        }
        set_batch_directive(batch, "MAX_BONES", render.max_bones);
    } else {
        set_batch_directive(batch, "SKINNED", 0);
        set_batch_directive(batch, "FRAMES_BLENDING", 0);
        set_batch_directive(batch, "DISABLE_TANGENT_SKINNING", 0);
    }

    if (render.vertex_anim) {
        set_batch_directive(batch, "VERTEX_ANIM", 1);
        if (cfg_def.vert_anim_mix_normals_hack)
            set_batch_directive(batch, "VERTEX_ANIM_MIX_NORMALS_FACTOR", 0.5);
        else
            set_batch_directive(batch, "VERTEX_ANIM_MIX_NORMALS_FACTOR",
                    "u_va_frame_factor");
    } else
        set_batch_directive(batch, "VERTEX_ANIM", 0);

    if (render.is_skinning && render.vertex_anim)
        m_util.panic("Skinning and vertex animation are mutually exlusive");

    if (render.disable_fogging)
        set_batch_directive(batch, "DISABLE_FOG", 1);
    else
        set_batch_directive(batch, "DISABLE_FOG", 0);

}

exports.update_batch_lights = update_batch_lights;
function update_batch_lights(batch, lamps, scene) {
    if (!lamps.length)
        return;

    var use_ssao = cfg_def.ssao && scene["b4w_enable_ssao"];
    var shadow_lamps = m_obj_util.get_shadow_lamps(lamps, use_ssao);
    var shaders_info = batch.shaders_info;
    var lamp_uuid_inds = batch.lamp_uuid_indexes;

    var lamp_index = 0;
    for (var i = 0; i < batch.shaders_info.node_elements.length; i++) {
        var node = batch.shaders_info.node_elements[i];
        if (node.id == "LIGHTING_LAMP") {
            var lamp = lamps[lamp_index++ % lamps.length];
            var light = lamp.light;

            if (light.type == "AREA") {
                lamp = lamps[lamp_index++ % lamps.length];
                light = lamp.light;
            }

            var lamp_sc_data = m_obj_util.get_scene_data(lamp, scene);

            if (light.type == "SPOT" || light.type == "POINT")
                var sp_size = Math.cos(light.spot_size / 2.0);

            if (light.type == "SPOT")
                var blend = light.spot_blend * (1.0 - sp_size);

            var index = lamp_sc_data.light_index;

            var shadow_map_ind = shadow_lamps.indexOf(lamp);

            node.dirs = [["LAMP_TYPE", light.type],
                         ["LAMP_IND", index],
                         ["LAMP_SPOT_SIZE", m_shaders.glsl_value(sp_size || 0.01)],
                         ["LAMP_SPOT_BLEND", m_shaders.glsl_value(blend || 0.01)],
                         ["LAMP_LIGHT_DIST", m_shaders.glsl_value(light.distance)],
                         ["LAMP_USE_SPHERE", light.use_sphere? 1: 0],
                         ["LAMP_SHADOW_MAP_IND", shadow_map_ind]];

        } else if (node.id == "LAMP" && lamp_uuid_inds) {
            // NOTE: LAMP_INDEX is already inside node.dirs
            var lamp_ind = node.dirs[0][1];

            for (var j = 0; j < lamps.length; j++) {
                var lamp = lamps[j];
                if (lamp_uuid_inds[lamp.uuid] == lamp_ind) {
                    var light = lamp.light;

                    if (light.type == "SPOT" || light.type == "POINT")
                        var sp_size = Math.cos(light.spot_size / 2.0);
                    if (light.type == "SPOT")
                        var blend = light.spot_blend * (1.0 - sp_size);

                    node.dirs.push(
                     ["LAMP_TYPE", light.type],
                     ["LAMP_SPOT_SIZE",  m_shaders.glsl_value(sp_size || 0.01)],
                     ["LAMP_SPOT_BLEND", m_shaders.glsl_value(blend || 0.01)],
                     ["LAMP_LIGHT_DIST", m_shaders.glsl_value(light.distance)],
                     ["LAMP_USE_SPHERE", light.use_sphere? 1: 0]
                    );
                }
            }
        }
    }

    if (lamp_uuid_inds) {
        var lamp_size = 0;
        for (var key in lamp_uuid_inds)
            lamp_size++;

        batch.lamp_light_positions = new Float32Array(lamp_size * 3);
        batch.lamp_light_directions = new Float32Array(lamp_size * 3);
        batch.lamp_light_color_intensities = new Float32Array(lamp_size * 3);
        m_shaders.set_directive(shaders_info, "NUM_LAMP_LIGHTS", lamp_size);

        for (var i = 0; i < lamps.length; i++)
            set_lamp_data(batch, lamps[i]);
    }
}

exports.set_lamp_data = set_lamp_data;
function set_lamp_data(batch, lamp) {
    if (lamp.uuid in batch.lamp_uuid_indexes) {
        var data_lamp_index = batch.lamp_uuid_indexes[lamp.uuid];
        var lamp_trans = m_tsr.get_trans_view(lamp.render.world_tsr);
        batch.lamp_light_positions.set(lamp_trans, data_lamp_index * 3);
        batch.lamp_light_directions.set(lamp.light.direction, data_lamp_index * 3);
        batch.lamp_light_color_intensities.set(lamp.light.color_intensity, data_lamp_index * 3);
    }
}

function update_batch_particle_systems(batch, psystems) {
    for (var i = 0; i < psystems.length; i++) {
        var emitter_col_name = psystems[i]["settings"]["b4w_vcol_from_name"];
        var particle_col_name = psystems[i]["settings"]["b4w_vcol_to_name"];

        if (emitter_col_name !== "" && particle_col_name !== "")
            batch.vertex_colors_usage[emitter_col_name] = {
                generate_buffer: false,
                src: [{ name: emitter_col_name, mask: 7 }]
            }
    }
}

exports.assign_shadow_receive_dirs = function(batch, shadow_params, subs_cast) {
    set_batch_directive(batch, "CSM_SECTION1", 0);
    set_batch_directive(batch, "CSM_SECTION2", 0);
    set_batch_directive(batch, "CSM_SECTION3", 0);
    set_batch_directive(batch, "NUM_CAST_LAMPS", 0);

    if (shadow_params) {
        var num_cast_lamps = shadow_params.lamp_types.length;
        set_batch_directive(batch, "NUM_CAST_LAMPS", num_cast_lamps);
        if (cfg_def.mac_os_shadow_hack)
            set_batch_directive(batch, "MAC_OS_SHADOW_HACK", 1);

        for (var i = 1; i < shadow_params.csm_num; i++)
            set_batch_directive(batch, "CSM_SECTION" + String(i), 1);

        set_batch_directive(batch, "SHADOW_TEX_RES", m_shaders.glsl_value(
                shadow_params.csm_resolution));
        set_batch_directive(batch, "CSM_FADE_LAST_CASCADE",
                shadow_params.fade_last_cascade ? 1 : 0);
        set_batch_directive(batch, "CSM_BLEND_BETWEEN_CASCADES",
                shadow_params.blend_between_cascades ? 1 : 0);
    } else {
        set_batch_directive(batch, "SHADOW_TEX_RES", 0);
        set_batch_directive(batch, "CSM_FADE_LAST_CASCADE", 0);
        set_batch_directive(batch, "CSM_BLEND_BETWEEN_CASCADES", 0);
    }
}

/**
 * For convenience
 */
function set_batch_c_attr(batch, name) {
    var cattrs = batch.common_attributes;

    if (cattrs.indexOf(name) == -1)
        cattrs.push(name);
}

exports.set_batch_directive = set_batch_directive;
/**
 * Set batch directive. Needs shader applied to batch
 * @methodOf batch
 */
function set_batch_directive(batch, name, value) {
    m_shaders.set_directive(batch.shaders_info, name, value);
}

exports.get_batch_directive = get_batch_directive;
/**
 * Get batch directive.
 * @methodOf batch
 */
function get_batch_directive(batch, name) {
    return m_shaders.get_directive(batch.shaders_info, name);
}

/**
 * Update batch geometry from submesh
 */
exports.update_batch_geometry = update_batch_geometry;
function update_batch_geometry(batch, submesh) {
    if (batch.type == "PHYSICS") {
        if (batch.subtype == "NAVMESH") {
            batch.bufs_data = m_geom.submesh_to_bufs_data(submesh,
            m_geom.DM_DEFAULT, [], batch);
        } else {
            if (submesh.shape_keys.length > 0)
                m_geom.submesh_init_shape_keys(submesh, submesh.va_frames[0]);
            batch.submesh = submesh;
        }
        return;
    }

    var draw_mode = batch.draw_mode;

    if (batch.halo && batch.type != "PARTICLES")
        var submesh = m_geom.extract_halo_submesh(submesh);

    if (batch.water_generated_mesh) {
        var num_cascads   = batch.water_num_cascads;
        var subdivs       = batch.water_subdivs;
        var detailed_dist = batch.water_detailed_dist;
        var submesh = m_primitives.generate_cascaded_grid(num_cascads,
                subdivs, detailed_dist);
    }

    var bufs_data = m_geom.submesh_to_bufs_data(submesh,
            draw_mode, batch.vertex_colors_usage, batch);

    batch.bufs_data = bufs_data;

    if (!(DEBUG_KEEP_BUFS_DATA_ARRAYS || batch.dynamic_geometry ||
            batch.z_sort || batch.use_shape_keys)) {
        bufs_data.ibo_array = null;
        bufs_data.vbo_source_data.length = 0;
    }

    var frames = submesh.va_frames.length;

    batch.num_vertices = submesh.base_length * frames;

    // NOTE: only triangle batches counted
    if (is_triangle_batch(batch)) {
        if (m_geom.is_indexed(submesh))
            batch.num_triangles = submesh.indices.length / 3 * frames;
        else
            batch.num_triangles = submesh.base_length / 3 * frames;
    } else
        batch.num_triangles = 0;
    if (DEBUG_SAVE_SUBMESHES)
        batch.submesh = submesh;
}

function is_triangle_batch(batch) {
    switch(batch.draw_mode) {
    case m_geom.DM_DEFAULT:
    case m_geom.DM_TRIANGLES:
    case m_geom.DM_DYNAMIC_TRIANGLES:
        return true;
    default:
        return false;
    }
}

/**
 * Update batch from EMITTER particle system/settings
 */
function update_batch_particles_emitter(batch, psystem, bpy_obj) {
    var pset = psystem["settings"];
    switch(pset["b4w_billboard_align"]) {
    case "VIEW":
        set_batch_directive(batch, "BILLBOARD_ALIGN", "BILLBOARD_ALIGN_VIEW");
        break;
    case "XY":
        set_batch_directive(batch, "BILLBOARD_ALIGN", "BILLBOARD_ALIGN_XY");
        break;
    case "YZ":
        set_batch_directive(batch, "BILLBOARD_ALIGN", "BILLBOARD_ALIGN_YZ");
        break;
    case "ZX":
        set_batch_directive(batch, "BILLBOARD_ALIGN", "BILLBOARD_ALIGN_ZX");
        break;
    default:
        m_util.panic("Wrong billboard align value");
        break;
    }
    // NOTE: disable standard billboarding
    set_batch_directive(batch, "BILLBOARD", 0);

    var obj_soft_particles = pset["b4w_enable_soft_particles"] &&
            m_obj_util.check_obj_soft_particles_accessibility(bpy_obj, pset);

    var enable_softness = pset["b4w_particles_softness"] > 0 &&
                          obj_soft_particles &&
                          cfg_def.depth_tex_available;
    set_batch_directive(batch, "SOFT_PARTICLES", enable_softness? 1: 0);
    set_batch_directive(batch, "SOFT_STRENGTH",
                        m_shaders.glsl_value(pset["b4w_particles_softness"]));

    var world_space = pset["b4w_coordinate_system"] == "WORLD"? 1: 0;
    m_shaders.set_directive(batch.shaders_info, "WORLD_SPACE", world_space);
}

/**
 * Create all possible batch slots for object and clone it by ptrans array
 */
function make_hair_particles_metabatches(bpy_em_obj, render, emitter_vc, 
        em_submesh, bpy_part_objs, batch_types_arr, objs_ptrans, pset, psys, 
        use_grass_map, seed, reset_seed) {

    var em_obj = bpy_em_obj._object;
    var metabatches = [];

    // do not render dynamic grass if grass map was not requested
    var dyn_grass = pset["b4w_dynamic_grass"];
    if (!use_grass_map && dyn_grass)
        return metabatches;

    var inst_inherit_bend = pset["b4w_wind_bend_inheritance"] == "INSTANCE";
    var inst_inherit_shadow = pset["b4w_shadow_inheritance"] == "INSTANCE";
    var inst_inherit_reflection = pset["b4w_reflection_inheritance"]
            == "INSTANCE";

    // prepare hair_render arrays and tsr_arrays
    // for objects which particle system composed from
    var objs_hair_render = [];
    var objs_tsr_array = [];

    for (var i = 0; i < bpy_part_objs.length; i++) {
        var part_render = bpy_part_objs[i]._object.render;

        // NOTE: partially override emitter's render
        var hair_render = m_obj_util.clone_render(render);

        // NOTE: override object billboard properties, use properties from
        // particle system
        hair_render.billboard = pset["b4w_hair_billboard"];
        hair_render.billboard_type = pset["b4w_hair_billboard_type"];
        hair_render.billboard_spherical =
                pset["b4w_hair_billboard_geometry"] == "SPHERICAL";

        hair_render.dynamic_grass = dyn_grass;
        hair_render.is_hair_particles = true;

        if (inst_inherit_bend) {
            hair_render.wind_bending = part_render.wind_bending;
            hair_render.wind_bending_angle = part_render.wind_bending_angle;
            hair_render.wind_bending_freq = part_render.wind_bending_freq;
            hair_render.detail_bending_freq = part_render.detail_bending_freq;
            hair_render.main_bend_col = part_render.main_bend_col;
            hair_render.detail_bending_amp = part_render.detail_bending_amp;
            hair_render.branch_bending_amp = part_render.branch_bending_amp;
            hair_render.wind_bending_amp = part_render.wind_bending_amp;
            // by link, doesn't matter
            hair_render.detail_bend_col = part_render.detail_bend_col;
            hair_render.bend_center_only = false;
        } else {
            hair_render.wind_bending = em_obj.render.wind_bending;
            hair_render.wind_bending_angle = em_obj.render.wind_bending_angle;
            hair_render.wind_bending_freq = em_obj.render.wind_bending_freq;
            hair_render.detail_bending_freq = em_obj.render.detail_bending_freq;
            hair_render.main_bend_col = em_obj.render.main_bend_col;
            hair_render.detail_bending_amp = em_obj.render.detail_bending_amp;
            hair_render.branch_bending_amp = em_obj.render.branch_bending_amp;
            hair_render.wind_bending_amp = em_obj.render.wind_bending_amp;
            // by link, doesn't matter
            hair_render.detail_bend_col = em_obj.render.detail_bend_col;
            hair_render.bend_center_only = true;
        }

        if (inst_inherit_shadow) {
            hair_render.shadow_cast = part_render.shadow_cast;
            hair_render.shadow_cast_only = part_render.shadow_cast_only;
            hair_render.shadow_receive = part_render.shadow_receive;
        } else {
            hair_render.shadow_cast = em_obj.render.shadow_cast;
            hair_render.shadow_cast_only = em_obj.render.shadow_cast_only;
            hair_render.shadow_receive = em_obj.render.shadow_receive;
        }

        if (inst_inherit_reflection) {
            hair_render.reflexible = part_render.reflexible;
            hair_render.reflexible_only = part_render.reflexible_only;
            hair_render.reflective = part_render.reflective;
            hair_render.cube_reflection_id = part_render.cube_reflection_id;
            hair_render.plane_reflection_id = part_render.plane_reflection_id;
            hair_render.reflection_type = part_render.reflection_type;
        } else {
            hair_render.reflexible = em_obj.render.reflexible;
            hair_render.reflexible_only = em_obj.render.reflexible_only;
            hair_render.reflective = em_obj.render.reflective;
            hair_render.cube_reflection_id = em_obj.render.cube_reflection_id;
            hair_render.plane_reflection_id = em_obj.render.plane_reflection_id;
            hair_render.reflection_type = em_obj.render.reflection_type;
        }
        objs_hair_render.push(hair_render);

        var ptrans = objs_ptrans[i];
        if (!ptrans)
            ptrans = new Float32Array();

        if (reset_seed)
            m_util.init_rand_r_seed(psys["seed"], seed);

        var trans = new Float32Array(3);
        var quat = new Float32Array([0, 0, 0, 1]);
        var tsr_array = [];

        var use_particles_rotation = m_reformer.check_particles_bin_format(cfg_def.loaded_data_version)
                && !pset["b4w_initial_rand_rotation"] && !pset["b4w_hair_billboard"];
        var data_len = 4;
        if (use_particles_rotation)
            data_len = 8;

        for (var j = 0; j < ptrans.length; j+=data_len) {
            trans[0] = ptrans[j];
            trans[1] = ptrans[j+1];
            trans[2] = ptrans[j+2];

            // NOTE: apply particle scale
            var scale = ptrans[j+3] * m_tsr.get_scale(part_render.world_tsr);

            if (pset["b4w_initial_rand_rotation"]) {
                switch (pset["b4w_rotation_type"]) {
                case "XYZ":
                    var axis = new Float32Array([m_util.rand_r(seed),
                            m_util.rand_r(seed), m_util.rand_r(seed)]);
                    m_vec3.normalize(axis, axis);
                    break;
                case "Z":
                    var axis = new Float32Array([0, 0, 1]);
                    break;
                default:
                    m_util.panic("Unsupported random rotation type: "
                             + pset["b4w_rotation_type"]);
                    break;
                }
                var strength = pset["b4w_rand_rotation_strength"];
                m_quat.setAxisAngle(axis, strength * (2 * Math.PI
                        * m_util.rand_r(seed) - Math.PI), quat);
            } else if (use_particles_rotation) {
                quat.set(ptrans.subarray(j+4, j+8));
                m_util.quat_bpy_b4w(quat, quat);

                if (!pset["use_whole_group"])
                    if (pset["use_rotation_dupli"]) {
                        var part_quat = m_tsr.get_quat_view(part_render.world_tsr);
                        m_quat.multiply(quat, part_quat, quat);
                    } else
                        m_quat.multiply(quat, DEFAULT_PART_SYS_QUAT, quat);
            }
            var tsr = m_tsr.set_sep(trans, scale, quat, m_tsr.create());

            // in object space
            tsr_array.push(tsr);
        }
        objs_tsr_array.push(tsr_array);
    }
    // get info for instancing
    var part_mat_data = {};
    var mat_number = 0;
    for (var i = 0; i < bpy_part_objs.length; i++) {
        var materials = bpy_part_objs[i]["data"]["materials"];
        for (var j = 0; j < materials.length; j++)
            if (materials[j]["name"] in part_mat_data)
                part_mat_data[materials[j]["name"]]++;
            else {
                part_mat_data[materials[j]["name"]] = 1;
                mat_number++;
            }
    }
    mat_number = mat_number ? mat_number : 1;

    // spatial tree object for searching nearest emitter vertices
    // will be calculated only once
    var spatial_tree = {};
    for (var i = 0; i < bpy_part_objs.length; i++) {
        var bpy_obj = bpy_part_objs[i];

        var btypes = batch_types_arr[i];
        var hair_render = objs_hair_render[i];

        var submesh_params = {};
        if (hair_render.wind_bending) {
            submesh_params["au_wind_bending_amp"] = [hair_render.wind_bending_amp];
            submesh_params["au_wind_bending_freq"] = [hair_render.wind_bending_freq];
            submesh_params["au_detail_bending_freq"] = [hair_render.detail_bending_freq];
            submesh_params["au_detail_bending_amp"] = [hair_render.detail_bending_amp];
            submesh_params["au_branch_bending_amp"] = [hair_render.branch_bending_amp];

            // clear render properties to improve batching
            // (they would be converted to attributes later)
            hair_render.wind_bending_amp = 0;
            hair_render.wind_bending_freq = 0;
            hair_render.detail_bending_freq = 0;
            hair_render.detail_bending_amp = 0;
            hair_render.branch_bending_amp = 0;
        }

        var hair_render_id = calculate_render_id(hair_render);
        var tsr_array = objs_tsr_array[i];

        if (!tsr_array.length)
            continue

        var mesh = bpy_obj["data"];
        var materials = mesh["materials"];

        var batches_main = new Array(materials.length);
        var batches_debug_view = new Array(materials.length);

        for (var j = 0; j < materials.length; j++) {
            if (m_geom.has_empty_submesh(mesh, j))
                continue;

            for (var k = 0; k < btypes.length; k++) {
                var type = btypes[k];
                var batch = init_batch(type);
                var material = materials[j];

                if (type == "MAIN")
                    batches_main[j] = batch;
                else if (type == "DEBUG_VIEW")
                    batches_debug_view[j] = batch;

                batch.cluster_id = bpy_em_obj["b4w_cluster_data"]["cluster_id"];

                if (!batch_material_is_valid(batch, material))
                    continue;

                if (type == "SHADOW" && batches_main[j])
                    // Override
                    batch.use_shadeless = batches_main[j].use_shadeless;

                batch.draw_mode = m_geom.DM_DEFAULT;
                update_batch_render(batch, hair_render);

                batch.odd_id_prop = pset["uuid"];

                // write batch jitter parameters
                if (pset["b4w_hair_billboard_type"] == "JITTERED") {
                    batch.jitter_amp = pset["b4w_hair_billboard_jitter_amp"];
                    batch.jitter_freq = pset["b4w_hair_billboard_jitter_freq"];
                }
                if (dyn_grass)
                    batch.grass_scale_threshold
                            = pset["b4w_dynamic_grass_scale_threshold"];

                if (!inst_inherit_bend) {
                    delete batch.vertex_colors_usage["a_bending_col_main"];
                    delete batch.vertex_colors_usage["a_bending_col_detail"];
                }

                update_batch_id(batch, hair_render_id);

                var src_submesh = m_geom.extract_submesh(mesh, j,
                        batch.common_attributes, render.bone_skinning_info,
                        batch.vertex_colors_usage, batch.uv_maps_usage);

                var stat_part_em_tsr = em_obj.render.world_tsr;

                var realy_need_use_inst = true;
                if (part_mat_data[material["name"]] > 1) {
                    var atr_num = 0;
                    for (var name in src_submesh.va_frames)
                        atr_num++;
                    realy_need_use_inst = src_submesh.indices.length
                            * tsr_array.length * atr_num
                            * part_mat_data[material["name"]] > MAX_PARTICLES_COEF * mat_number;
                }
                var can_use_inst = cfg_def.allow_instanced_arrays_ext &&
                                realy_need_use_inst && batch.type != "PHYSICS";
                if (can_use_inst) {
                    batch.inst_array_state = pset["use_whole_group"] ?
                        WH_GR_INST_ARR : SINGLE_INST_ARR;
                    var submesh = m_util.clone_object_r(src_submesh);
                    m_geom.calc_unit_boundings(src_submesh, submesh,
                                                   tsr_array);
                    submesh.instanced_array_data = {
                        tsr_array : tsr_array,
                        stat_part_em_tsr : stat_part_em_tsr,
                        static_hair : render.type == "STATIC",
                        submesh_params : submesh_params,
                        part_inh_attrs : {},
                        dyn_grass : dyn_grass
                    };
                    if (hair_render.wind_bending && hair_render.bend_center_only) {
                        var origin = m_vec3.fromValues(0, 0, 0);
                        m_tsr.transform_vec3(origin, em_obj.render.world_tsr, origin);
                        var center_data = [];
                        for (var l = 0; l < tsr_array.length; l++)
                            center_data.push(origin[0], origin[1], origin[2])
                        submesh.instanced_array_data.part_inh_attrs["a_emitter_center"] = {
                            num_comp: 3,
                            data: center_data
                        };
                    }
                    m_geom.calc_unit_boundings(src_submesh, src_submesh,
                                                   tsr_array);

                    if (render.type == "STATIC")
                        m_geom.bounding_data_apply_transform(submesh.submesh_bd,
                                                               stat_part_em_tsr);
                } else {
                    var submesh = m_geom.make_clone_submesh(src_submesh,
                        submesh_params, tsr_array);
                    submesh = fill_submesh_center_pos(submesh, tsr_array);
                    if (hair_render.wind_bending && hair_render.bend_center_only)
                        submesh = fill_submesh_emitter_center(submesh,
                                em_obj.render.world_tsr);
                }

                var particle_inherited_attrs = get_particle_inherited_attrs(
                            pset["b4w_vcol_from_name"], pset["b4w_vcol_to_name"],
                            batch, emitter_vc, !inst_inherit_bend, mesh);
                submesh = make_particle_inherited_vcols(submesh, tsr_array,
                        em_obj.render.bb_local, em_submesh, particle_inherited_attrs,
                        batch.vertex_colors_usage, spatial_tree, can_use_inst);

                set_batch_directive(batch, "USE_INSTANCED_PARTCLS",
                        submesh.instanced_array_data ? 1 : 0);

                metabatches.push({
                    batch: batch,
                    submesh: submesh,
                    mat_names: [material["name"]],
                    render: hair_render,
                    rel_bpy_objects: [bpy_em_obj]
                })
            }
        }

        // NOTE: using a special property to make batching for DEBUG_VIEW batches 
        // the same as for MAIN batches
        for (var j = 0; j < batches_debug_view.length; j++)
            if (batches_debug_view[j]) {
                batches_debug_view[j].debug_main_batch_id = batches_main[j].id;
                update_batch_id(batches_debug_view[j], batches_debug_view[j].render_id);
            }
    }

    return metabatches;
}

function batch_material_is_valid(batch, material) {
    var is_valid = true;

    if (batch.type == "NODES_GLOW")
        is_valid = m_nodemat.check_material_glow_output(material)
    is_valid = is_valid && update_batch_material(batch, material);

    return is_valid;
}

function make_spatial_tree(spatial_tree, obj_bb_local, positions) {
    spatial_tree.cell_size = new Float32Array(3);
    spatial_tree.base_point = new Float32Array(3);
    spatial_tree.verts_indices = new Uint32Array(positions.length / 3);
    spatial_tree.octs_indices = new Uint32Array(positions.length / 3);

    spatial_tree.cell_size[0] = (obj_bb_local.max_x - obj_bb_local.min_x) / STREE_CELL_COUNT;
    spatial_tree.cell_size[1] = (obj_bb_local.max_y - obj_bb_local.min_y) / STREE_CELL_COUNT;
    spatial_tree.cell_size[2] = (obj_bb_local.max_z - obj_bb_local.min_z) / STREE_CELL_COUNT;

    spatial_tree.base_point[0] = obj_bb_local.min_x;
    spatial_tree.base_point[1] = obj_bb_local.min_y;
    spatial_tree.base_point[2] = obj_bb_local.min_z;

    for (var i = 0; i < positions.length / 3; i++) {
        var x = positions[i * 3];
        var y = positions[i * 3 + 1];
        var z = positions[i * 3 + 2];

        var num_x = m_util.trunc((x - spatial_tree.base_point[0]) / spatial_tree.cell_size[0]);
        var num_y = m_util.trunc((y - spatial_tree.base_point[1]) / spatial_tree.cell_size[1]);
        var num_z = m_util.trunc((z - spatial_tree.base_point[2]) / spatial_tree.cell_size[2]);

        num_x = m_util.clamp(num_x, 0, STREE_CELL_COUNT - 1)
        num_y = m_util.clamp(num_y, 0, STREE_CELL_COUNT - 1)
        num_z = m_util.clamp(num_z, 0, STREE_CELL_COUNT - 1)

        spatial_tree.verts_indices[i] = i;
        spatial_tree.octs_indices[i] = num_z * Math.pow(STREE_CELL_COUNT, 2)
                + num_y * STREE_CELL_COUNT + num_x;
    }

    m_geom.sort_two_arrays(spatial_tree.octs_indices,
            spatial_tree.verts_indices, m_geom.SORT_NUMERIC, true);

    spatial_tree.verts_offsets = new Uint32Array(Math.pow(STREE_CELL_COUNT, 3));
    for (var i = 0; i < spatial_tree.octs_indices.length; i++) {
        var index = spatial_tree.octs_indices[i];
        spatial_tree.verts_offsets[index]++;
    }
    delete spatial_tree.octs_indices;

    for (var i = 1; i < spatial_tree.verts_offsets.length; i++)
        spatial_tree.verts_offsets[i] += spatial_tree.verts_offsets[i - 1];

    return spatial_tree;
}


function get_particle_inherited_attrs(vc_name_from, vc_name_to, batch, emitter_vc,
        bend_inheritance, particle_mesh) {
    var inherited_attrs = [];

    // vertex color inheritance
    if (vc_name_from !== "" && vc_name_to !== "") {

        var col_usage_data = get_vcol_usage_data_by_name(vc_name_to,
                batch.vertex_colors_usage);

        if (col_usage_data.length > 0)
            for (var i = 0; i < col_usage_data.length; i += 3)
                inherited_attrs.push({
                    emitter_attr: vc_name_from,
                    emitter_mask: 7,
                    particle_attr: col_usage_data[i],
                    particle_mask: col_usage_data[i + 1],
                    dst_channel_offset: col_usage_data[i + 2]
                });
        else
            if (m_geom.has_attr(batch.common_attributes, "a_color"))
                if (vc_name_to == particle_mesh["active_vcol_name"])
                    inherited_attrs.push({
                        emitter_attr: vc_name_from,
                        emitter_mask: 7,
                        particle_attr: "a_color",
                        particle_mask: 7,
                        dst_channel_offset: 0
                    })
    }

    // bending inheritance
    if (bend_inheritance) {
        if ("a_bending_col_main" in emitter_vc)
            inherited_attrs.push({
                emitter_attr: "a_bending_col_main",
                emitter_mask: 4,
                particle_attr: "a_bending_col_main",
                particle_mask: 4,
                dst_channel_offset: 0
            });
        if ("a_bending_col_detail" in emitter_vc)
            inherited_attrs.push({
                emitter_attr: "a_bending_col_detail",
                emitter_mask: 7,
                particle_attr: "a_bending_col_detail",
                particle_mask: 7,
                dst_channel_offset: 0
            });
    }

    return inherited_attrs;
}

function get_vcol_usage_data_by_name(color_name, vc_usage) {
    var data = [];

    for (var attr_name in vc_usage) {
        var src_colors = vc_usage[attr_name].src;
        var dst_channel_offset = 0;
        for (var i = 0; i < src_colors.length; i++) {
            var mask = src_colors[i].mask;
            if (color_name == src_colors[i].name)
                data.push(attr_name, mask, dst_channel_offset);
            dst_channel_offset += m_util.rgb_mask_get_channels_count(mask);
        }
    }

    return data;
}

function fill_submesh_center_pos(submesh, transforms) {
    submesh.va_common["au_center_pos"] = new Float32Array(submesh.base_length * 3);

    var t_count = transforms.length;
    var base_length = submesh.base_length / t_count;
    for (var i = 0; i < t_count; i++) {
        var transform = transforms[i];
        var v_offset = base_length * 3 * i;

        for (var j = 0; j < base_length; j++) {
            submesh.va_common["au_center_pos"][v_offset + j*3] = transform[0];
            submesh.va_common["au_center_pos"][v_offset + j*3 + 1] = transform[1];
            submesh.va_common["au_center_pos"][v_offset + j*3 + 2] = transform[2];
        }
    }

    return submesh;
}

function fill_submesh_emitter_center(submesh, em_world_tsr) {
    submesh.va_common["a_emitter_center"] = new Float32Array(submesh.base_length * 3);
    var origin = m_vec3.fromValues(0, 0, 0);
    m_tsr.transform_vec3(origin, em_world_tsr, origin);

    for (var i = 0; i < submesh.base_length; i++) {
        submesh.va_common["a_emitter_center"][i * 3] = origin[0];
        submesh.va_common["a_emitter_center"][i * 3 + 1] = origin[1];
        submesh.va_common["a_emitter_center"][i * 3 + 2] = origin[2];
    }

    return submesh;
}

function make_particle_inherited_vcols(submesh, transforms, em_bb_local,
        em_submesh, inherited_attrs, vc_usage, spatial_tree, inst_array) {

    var calc_nearest = false;
    for (var i = 0; i < inherited_attrs.length; i++) {
        var em_attr = inherited_attrs[i].emitter_attr;
        var cols = em_submesh.va_common[em_attr];
        if (cols && cols.length > 0) {
            calc_nearest = true;
            break;
        }
    }
    if (inst_array)
        var part_inh_attrs = submesh.instanced_array_data.part_inh_attrs;
    if (calc_nearest) {
        var nearest_points = calc_emitter_nearest_points(em_bb_local,
                em_submesh.va_frames[0]["a_position"], transforms, spatial_tree);
        var particle_verts_count = submesh.base_length / transforms.length;

        for (var i = 0; i < inherited_attrs.length; i++) {
            var p_attr = inherited_attrs[i].particle_attr;
            var p_mask = inherited_attrs[i].particle_mask;
            var em_attr = inherited_attrs[i].emitter_attr;
            var em_mask = inherited_attrs[i].emitter_mask;

            var cols = em_submesh.va_common[em_attr];
            switch (p_attr) {
            // NOTE: bending colors may be missed on particles
            case "a_bending_col_main":
                var p_attr_channels_total = 1;
                break;
            case "a_bending_col_detail":
                var p_attr_channels_total = 3;
                break;
            // a_color may be missed in vc_usage
            case "a_color":
                var p_attr_channels_total = 3;
                break;
            default:
                var p_attr_channels_total = 0;
                for (var j = 0; j < vc_usage[p_attr].src.length; j++)
                    p_attr_channels_total += m_util.rgb_mask_get_channels_count(
                            vc_usage[p_attr].src[j].mask);
                break;
            }

            if (cols && cols.length > 0) {
                var emitter_comp_count = m_util.rgb_mask_get_channels_count(em_mask);
                var particle_comp_count = m_util.rgb_mask_get_channels_count(p_mask);

                var mask_from = em_mask & p_mask;
                var channel_presence_from = m_util.rgb_mask_get_channels_presence(mask_from);
                if (mask_from != p_mask)
                    m_print.error("Wrong color extraction from "
                        + em_attr + " to " + p_attr + ".");

                if (!inst_array) {
                    // NOTE: bending buffers can be uninitialized, overwrite them anyway
                    // if there is an inherited color, it's already have initialized buffer
                    if (p_attr == "a_bending_col_main" || p_attr == "a_bending_col_detail")
                        submesh.va_common[p_attr] = new Float32Array(
                                submesh.base_length * particle_comp_count);

                    for (var j = 0; j < transforms.length; j++) {
                        var nearest_index = nearest_points[j];
                        var em_vert_offset = nearest_index * emitter_comp_count;
                        var p_offset = j * particle_verts_count * p_attr_channels_total;
                        if (nearest_index != -1)
                            for (var k = 0; k < particle_verts_count; k++) {
                                var p_vert_offset = k * p_attr_channels_total;
                                for (var l = 0; l < channel_presence_from.length; l++)
                                    if (channel_presence_from[l]) {
                                        var em_channel_offset = m_util.rgb_mask_get_channel_presence_index(em_mask, l);
                                        var p_channel_offset = inherited_attrs[i].dst_channel_offset
                                                + m_util.rgb_mask_get_channel_presence_index(p_mask, l);
                                        submesh.va_common[p_attr][p_offset
                                                + p_vert_offset + p_channel_offset]
                                                = cols[em_vert_offset + em_channel_offset];
                                    }
                            }
                    }
                } else {
                    part_inh_attrs[p_attr] = {
                        num_comp: p_attr_channels_total,
                        data: []
                    };
                    for (var j = 0; j < transforms.length; j++) {
                        var nearest_index = nearest_points[j];
                        var em_vert_offset = nearest_index * emitter_comp_count;
                        for (var l = 0; l < channel_presence_from.length; l++)
                            if (channel_presence_from[l]) {
                                var em_channel_offset = 
                                        m_util.rgb_mask_get_channel_presence_index(em_mask, l);
                                part_inh_attrs[p_attr].data.push(cols[em_vert_offset
                                        + em_channel_offset]);
                            }
                    }
                }
            } else
                submesh.va_common[p_attr] = new Float32Array(0);
        }

    }

    return submesh;
}

function calc_emitter_nearest_points(em_bb_local, em_positions, transforms,
        spatial_tree) {

    var particle_cen = new Float32Array(3);
    var em_vert = new Float32Array(3);
    var nearest_points = new Uint32Array(transforms.length);

    if (!("verts_indices" in spatial_tree))
        make_spatial_tree(spatial_tree, em_bb_local, em_positions);

    for (var i = 0; i < transforms.length; i++) {
        particle_cen[0] = transforms[i][0];
        particle_cen[1] = transforms[i][1];
        particle_cen[2] = transforms[i][2];

        var min_dist = 1e+10;
        var min_index = -1;

        // use spatial tree for faster search nearest vertex
        var num_x = m_util.trunc((particle_cen[0]
                - spatial_tree.base_point[0]) / spatial_tree.cell_size[0]);
        var num_y = m_util.trunc((particle_cen[1]
                - spatial_tree.base_point[1]) / spatial_tree.cell_size[1]);
        var num_z = m_util.trunc((particle_cen[2]
                - spatial_tree.base_point[2]) / spatial_tree.cell_size[2]);

        num_x = m_util.clamp(num_x, 0, STREE_CELL_COUNT - 1)
        num_y = m_util.clamp(num_y, 0, STREE_CELL_COUNT - 1)
        num_z = m_util.clamp(num_z, 0, STREE_CELL_COUNT - 1)

        var oct_index = num_z * Math.pow(STREE_CELL_COUNT, 2)
                + num_y * STREE_CELL_COUNT + num_x;

        var from_index = (oct_index == 0) ? 0 : spatial_tree.verts_offsets[oct_index - 1];
        var to_index = spatial_tree.verts_offsets[oct_index];

        for (var j = from_index; j < to_index; j++) {
            var index = spatial_tree.verts_indices[j];

            em_vert[0] = em_positions[index * 3];
            em_vert[1] = em_positions[index * 3 + 1];
            em_vert[2] = em_positions[index * 3 + 2];

            m_vec3.sub(em_vert, particle_cen, em_vert);
            var sq_len = m_vec3.sqrLen(em_vert);
            if (sq_len <= min_dist) {
                min_dist = sq_len;
                min_index = index;
            }
        }

        // standard search for nearest vertex
        if (min_index == -1) {
            for (var j = 0; j < em_positions.length / 3; j++) {
                em_vert[0] = em_positions[j * 3];
                em_vert[1] = em_positions[j * 3 + 1];
                em_vert[2] = em_positions[j * 3 + 2];

                m_vec3.sub(em_vert, particle_cen, em_vert);
                var sq_len = m_vec3.sqrLen(em_vert);
                if (sq_len <= min_dist) {
                    min_dist = sq_len;
                    min_index = j;
                }
            }
        }

        nearest_points[i] = min_index;
    }

    return nearest_points;
}

/**
 * Fair distribution among dupli_objects
 */
function distribute_ptrans_equally(ptrans, dupli_objects, seed, use_particles_rotation, data_len) {

    var objs_count = dupli_objects.length;
    var ptrans_dist = {};

    for (var i = 0; i < ptrans.length; i+=data_len) {
        var index = Math.floor(objs_count * m_util.rand_r(seed));
        var robj_name = dupli_objects[index].name;

        ptrans_dist[index] = ptrans_dist[index] || [];
        ptrans_dist[index].push(ptrans[i], ptrans[i+1], ptrans[i+2], ptrans[i+3]);
        if (use_particles_rotation)
            ptrans_dist[index].push(ptrans[i+4], ptrans[i+5], ptrans[i+6], ptrans[i+7]);
    }

    for (var index in ptrans_dist)
        ptrans_dist[index] = new Float32Array(ptrans_dist[index]);
    return ptrans_dist;
}

function distribute_ptrans_group(ptrans, dupli_objects, use_particles_rotation, data_len) {
    var ptrans_dist = {};
    var quat = new Float32Array([0, 0, 0, 1]);

    for (var i = 0; i < ptrans.length; i+=data_len) {
        for (var j = 0; j < dupli_objects.length; j++) {
            var obj_name = dupli_objects[j].name;

            var obj_trans = m_vec3.create();
            var dupli_scale = m_tsr.get_scale(dupli_objects[j].render.world_tsr);
            var dupli_trans = m_tsr.get_trans_view(dupli_objects[j].render.world_tsr);
            m_vec3.scale(dupli_trans, dupli_scale, obj_trans);
            var res_trans = m_vec3.clone([ptrans[i], ptrans[i+1], ptrans[i+2]]);

            if (!ptrans_dist[j])
                ptrans_dist[j] = new Float32Array(ptrans.length);

            if (use_particles_rotation) {
                ptrans_dist[j][i + 4] = quat[0] = ptrans[i + 4];
                ptrans_dist[j][i + 5] = quat[1] = ptrans[i + 5];
                ptrans_dist[j][i + 6] = quat[2] = ptrans[i + 6];
                ptrans_dist[j][i + 7] = quat[3] = ptrans[i + 7];
                m_util.quat_bpy_b4w(quat, quat);
                m_util.transformQuatFast(obj_trans, quat, obj_trans);
            }

            m_vec3.add(res_trans, obj_trans, res_trans);

            ptrans_dist[j][i] = res_trans[0];
            ptrans_dist[j][i + 1] = res_trans[1];
            ptrans_dist[j][i + 2] = res_trans[2];
            ptrans_dist[j][i + 3] = ptrans[i + 3];

        }
    }
    return ptrans_dist;
}

function distribute_ptrans_by_dupli_weights(ptrans, dupli_objects,
        dupli_weights, seed, use_particles_rotation, data_len) {

    var ptrans_dist = {};

    function rand_obj_index_by_weights(dupli_weights) {

        var weight_sum_array = [0];
        for (var i = 0; i < dupli_weights.length; i++) {
            var weight = dupli_weights[i];
            weight_sum_array[i+1] = weight_sum_array[i] + weight["count"];
        }

        var last = weight_sum_array[weight_sum_array.length-1];
        var weight_sum_rand = last * m_util.rand_r(seed);
        var weight_index = 0;

        for (var i = 0; i < weight_sum_array.length; i++) {
            if (weight_sum_rand >= weight_sum_array[i] &&
                    weight_sum_rand < weight_sum_array[i+1]) {
                weight_index = i;
                break;
            }
        }

        //var weight_name = dupli_weights[weight_index]["name"];
        return weight_index;
        //return weight_name;
    }

    var dupli_weights_sorted = [];

    for (var i = 0; i < dupli_objects.length; i++) {
        var dg_obj = dupli_objects[i];
        var name = dg_obj.origin_name || dg_obj.name;

        for (var j = 0; j < dupli_weights.length; j++) {
            var weight = dupli_weights[j];
            if (name == weight["name"])
                dupli_weights_sorted.push(weight);
        }
    }

    if (dupli_weights.length != dupli_weights_sorted.length)
        m_print.error("dupli weights match failed");

    for (var i = 0; i < ptrans.length; i+=data_len) {
        var index = rand_obj_index_by_weights(dupli_weights_sorted);
        ptrans_dist[index] = ptrans_dist[index] || [];
        ptrans_dist[index].push(ptrans[i], ptrans[i+1], ptrans[i+2], ptrans[i+3]);
        if (use_particles_rotation)
            ptrans_dist[index].push(ptrans[i+4], ptrans[i+5], ptrans[i+6], ptrans[i+7]);

    }

    for (var index in ptrans_dist)
        ptrans_dist[index] = new Float32Array(ptrans_dist[index]);

    return ptrans_dist;
}

/**
 * Create clusters for static objects, calc boundings
 * cluster: {render: render, objects: objects}
 * some params will separate batches
 * some params go to vertex attributes
 */
function create_object_clusters(bpy_static_objs) {

    var clusters = [];

    var cluster_ids = {};

    for (var i = 0; i < bpy_static_objs.length; i++) {
        var bpy_obj = bpy_static_objs[i];
        var obj_render = bpy_obj._object.render;

        // bounding box
        var bb_local = m_bounds.create_bb();
        m_bounds.copy_bb(obj_render.bb_original, bb_local);
        var bb_world = m_bounds.bounding_box_transform(bb_local,
                obj_render.world_tsr);

        var b_data = bpy_obj["data"]["b4w_boundings"];
        // bounding sphere
        var bs_local = m_bounds.bs_from_values(
                b_data["bs_rad"],
                m_util.f32(b_data["bs_cen"]));
        var bs_world = m_bounds.bounding_sphere_transform(bs_local,
                obj_render.world_tsr);

        // bounding ellipsoid
        var be_axes = b_data["be_ax"];
        var be_local = m_bounds.be_from_values(
                [be_axes[0], 0, 0], [0, be_axes[1], 0], [0, 0, be_axes[2]],
                b_data["be_cen"]);
        var be_world = m_bounds.bounding_ellipsoid_transform(be_local,
                obj_render.world_tsr);

        var bbr_data = b_data["rbb"];
        var bbr_local = m_bounds.rot_bb_from_values(bbr_data["rbb_c"],
                b_data["caxis_x"], b_data["caxis_y"],
                b_data["caxis_z"], bbr_data["rbb_s"]);
        var bbr_world = m_bounds.bounding_rot_box_transform(bbr_local,
                obj_render.world_tsr);

        obj_render.bb_local = bb_local;
        obj_render.bb_world = bb_world;
        obj_render.bs_local = bs_local;
        obj_render.bs_world = bs_world;
        obj_render.be_local = be_local;
        obj_render.be_world = be_world;
        obj_render.bbr_local = bbr_local;
        obj_render.bbr_world = bbr_world;

        // this params will divide batches
        var render_props = {};
        render_props.shadow_cast = obj_render.shadow_cast;
        render_props.shadow_cast_only = obj_render.shadow_cast_only;
        render_props.shadow_receive = obj_render.shadow_receive;

        render_props.selectable = obj_render.selectable;
        render_props.origin_selectable = obj_render.origin_selectable;

        render_props.outlining = obj_render.outlining;
        render_props.origin_outlining = obj_render.origin_outlining;

        render_props.outline_anim_settings_default = obj_render.outline_anim_settings_default;

        render_props.reflexible = obj_render.reflexible;
        render_props.reflexible_only = obj_render.reflexible_only;
        render_props.reflective = obj_render.reflective;
        render_props.cube_reflection_id = obj_render.cube_reflection_id;
        render_props.plane_reflection_id = obj_render.plane_reflection_id;
        render_props.reflection_type = obj_render.reflection_type;
        render_props.caustics = obj_render.caustics;

        render_props.wind_bending = obj_render.wind_bending;
        render_props.main_bend_col = obj_render.main_bend_col;
        // by link, doesn't matter
        render_props.detail_bend_col = obj_render.detail_bend_col;

        render_props.billboard = obj_render.billboard;
        render_props.billboard_type = obj_render.billboard_type;
        render_props.billboard_spherical = obj_render.billboard_spherical;
        // NOTE: billboard_pres_glob_orientation doesn't have influence on batching,
        // because it directly modifies batch submesh

        render_props.dynamic_grass = obj_render.dynamic_grass;
        render_props.do_not_cull = obj_render.do_not_cull;
        render_props.disable_fogging = obj_render.disable_fogging;

        // always false for static batches
        render_props.dynamic_geometry = obj_render.dynamic_geometry;

        render_props.cluster_id = bpy_obj["b4w_cluster_data"]["cluster_id"];

        render_props.lod_dist_max = obj_render.lod_dist_max;
        render_props.lod_dist_min = obj_render.lod_dist_min;
        render_props.lod_transition_ratio = obj_render.lod_transition_ratio;

        render_props.do_not_render = obj_render.do_not_render;

        var id = JSON.stringify(render_props);
        cluster_ids[id] = cluster_ids[id] || [];
        cluster_ids[id].push(bpy_obj);
    }
    for (var key in cluster_ids) {

        var render_props = JSON.parse(key);
        // NOTE: don't want this property on a render
        delete render_props.cluster_id;

        var bpy_objects = cluster_ids[key];

        var render = m_obj_util.create_render("STATIC");
        for (var prop in render_props)
            render[prop] = render_props[prop];

        // NOTE: assign data_id property to differ batches while adding same
        // objects to subscenes (secondary loading case)
        render.data_id = bpy_static_objs[0]._object.render.data_id;

        render.wind_bending_amp = 0;
        render.wind_bending_freq = 0;
        render.detail_bending_freq = 0;
        render.detail_bending_amp = 0;
        render.branch_bending_amp = 0;
        render.hide = false;

        // calculate bounding box/sphere
        for (var i = 0; i < bpy_objects.length; i++) {
            var obj = bpy_objects[i]._object;
            // do not expand for first object
            if (i == 0) {
                m_bounds.copy_bb(obj.render.bb_world, render.bb_world);
                m_bounds.copy_bs(obj.render.bs_world, render.bs_world);
            } else {
                m_bounds.expand_bounding_box(render.bb_world, obj.render.bb_world);
                m_bounds.expand_bounding_sphere(render.bs_world, obj.render.bs_world);
            }
        }
        render.be_world = m_bounds.create_be();
        render.be_local = m_bounds.create_be();

        // same as world because initial batch has identity transform
        m_bounds.copy_bb(render.bb_world, render.bb_local);
        m_bounds.copy_bs(render.bs_world, render.bs_local);

        var cluster = {render: render, bpy_objects: bpy_objects};
        clusters.push(cluster);
    }

    return clusters;
}

exports.update_batch_id = update_batch_id;
function update_batch_id(batch, render_id) {
    // NOTE: remove some properties
    var canvas_context = null;
    var video_elements = null;
    var bb_local = batch.bb_local;
    var be_local = batch.be_local;
    var bb_world = batch.bb_world;
    var be_world = batch.be_world;
    var vaos = batch.vaos;
    batch.bb_local = null;
    batch.be_local = null;
    batch.bb_world = null;
    batch.be_world = null;
    batch.vaos = null;

    for (var i = 0; i < batch.textures.length; i++) {
        var ctx = batch.textures[i].canvas_context;
        if (ctx) {
            if (!canvas_context)
                canvas_context = {};
            canvas_context[i] = ctx;
            batch.textures[i].canvas_context = null;
        }
        var video = batch.textures[i].video_file;
        if (video) {
            if(!video_elements)
                video_elements = {};
            video_elements[i] = video;
            batch.textures[i].video_file = null;
        }
    }
    // reset batch.id for proper id calculation
    batch.id = 0;
    batch.render_id = render_id;
    batch.id = m_util.calc_variable_id(batch, render_id);

    // return removed properties
    batch.bb_local = bb_local;
    batch.be_local = be_local;
    batch.bb_world = bb_world;
    batch.be_world = be_world;
    batch.vaos = vaos;

    if (canvas_context)
        for (var j in canvas_context)
            batch.textures[j].canvas_context = canvas_context[j];
    if (video_elements)
        for (var j in video_elements)
            batch.textures[j].video_file = video_elements[j];
}

exports.calculate_render_id = calculate_render_id;
function calculate_render_id(render) {
    // NOTE: remove some properties
    var bone_pointers = render.bone_pointers;
    render.bone_pointers = null;

    var id = m_util.calc_variable_id(render, 0);

    // return removed properties
    render.bone_pointers = bone_pointers;

    return id;
}

/**
 * Create special batch for bounding ellipsoid/sphere debug rendering
 */
function create_bounding_ellipsoid_batch(render, obj_name, is_dynamic,
                                         source_obj) {

    var batch = init_batch("DEBUG_VIEW");

    apply_shader(batch, "debug_view.glslv", "debug_view.glslf");

    batch.debug_sphere = true;

    batch.depth_mask = true;
    batch.odd_id_prop = obj_name;

    batch.debug_sphere_dynamic = is_dynamic;

    update_batch_render(batch, render);
    var render_id = calculate_render_id(render);

    update_batch_id(batch, render_id);
    if (source_obj.use_be) {
        if (is_dynamic) {
            var be = source_obj.be_local;
            m_tsr.set_trans(source_obj.be_local.center, _tsr_tmp);
        } else {
            var be = source_obj.be_world;
            m_tsr.set_trans(be.center, _tsr_tmp);
        }
        var center = m_vec3.create();
        var submesh = m_primitives.generate_uv_sphere(16, 8, 1, center,
                                                    false, false);
        var scale = m_vec3.fromValues(m_vec3.length(be.axis_x),
                m_vec3.length(be.axis_y), m_vec3.length(be.axis_z));

        m_geom.scale_submesh_xyz(submesh, scale, center);
        
        var axis_x = m_vec3.normalize(be.axis_x, _vec3_tmp);
        var axis_y = m_vec3.normalize(be.axis_y, _vec3_tmp2);
        var axis_z = m_vec3.normalize(be.axis_z, _vec3_tmp3);

        // if an object has zero dimension on some axis - recalculate it
        if (!scale[0] && scale[1] && scale[2])
            m_vec3.cross(axis_y, axis_z, axis_x);
        else if (!scale[1] && scale[0] && scale[2])
            m_vec3.cross(axis_z, axis_x, axis_y);
        else if (!scale[2] && scale[0] && scale[1])
            m_vec3.cross(axis_x, axis_y, axis_z);

        var ellipsoid_mat = m_util.ellipsoid_axes_to_mat3(axis_x, axis_y,
                axis_z, _mat3_tmp);
        m_mat3.invert(ellipsoid_mat, ellipsoid_mat);
        var quat = m_quat.fromMat3(ellipsoid_mat, _vec4_tmp);
        m_tsr.set_quat(quat, _tsr_tmp);
        m_tsr.set_scale(1, _tsr_tmp);
        m_geom.submesh_apply_transform(submesh, _tsr_tmp);
    } else {
        if (is_dynamic) {
            var bs = source_obj.bs_local;
            var submesh = m_primitives.generate_uv_sphere(16, 8, bs.radius,
                    bs.center, false, false);
        } else {
            var bs = source_obj.bs_world;
            var submesh = m_primitives.generate_uv_sphere(16, 8, bs.radius,
                    m_vec3.create(), false, false);
            m_tsr.identity(_tsr_tmp);
            m_tsr.set_trans(bs.center, _tsr_tmp);
            m_geom.submesh_apply_transform(submesh, _tsr_tmp);
        }
    }

    batch.bb_local = m_bounds.clone_bb(source_obj.bb_local);
    batch.be_local = m_bounds.clone_be(source_obj.be_local);
    batch.bs_local = m_bounds.clone_bs(source_obj.bs_local);

    batch.bb_world = m_bounds.clone_bb(source_obj.bb_world);
    batch.be_world = m_bounds.clone_be(source_obj.be_world);
    batch.bs_world = m_bounds.clone_bs(source_obj.bs_world);

    m_geom.submesh_drop_indices(submesh, 1, true);
    submesh.va_common["a_polyindex"] = m_geom.extract_polyindices(submesh);
    update_batch_geometry(batch, submesh);

    return batch;
}

exports.apply_shader = apply_shader;
function apply_shader(batch, vert, frag) {
    batch.shaders_info.vert = vert;
    batch.shaders_info.frag = frag;

    m_shaders.set_default_directives(batch.shaders_info);
}

exports.append_texture = append_texture;
/**
 * Append texture to batch.
 * @methodOf batch
 * @param texture Texture ID
 * @param [name] Uniform name for appended texture
 */
function append_texture(batch, texture, name) {
    // NOTE: special one-texture case
    if (batch.textures.length == 1 && batch.texture_names.length == 0)
        batch.texture_names.push("default0");

    name = name || "default" + String(batch.textures.length)
    // unique only
    if (batch.texture_names.indexOf(name) == -1) {
        batch.textures.push(texture);
        batch.texture_names.push(name);
    }

    // if something is appended after shader compilation
    if (batch.shader)
        m_render.assign_texture_uniforms(batch);
}

exports.replace_texture = function(batch, texture, name) {
    var index = batch.texture_names.indexOf(name);
    if (index > -1)
        batch.textures[index] = texture;
}

/**
 * Create special shadeless batch for submesh debugging purposes
 */
exports.create_shadeless_batch = function(submesh, color, alpha) {

    var batch = init_batch("MAIN");

    if (alpha < 1)
        batch.blend = true;
    m_vec4.set(color[0], color[1], color[2], alpha, batch.diffuse_color);

    batch.draw_mode = m_geom.DM_TRIANGLES;

    update_batch_geometry(batch, submesh);

    apply_shader(batch, "main.glslv", "main_stack.glslf");
    set_batch_directive(batch, "SHADELESS", 1);
    update_shader(batch);

    return batch;
}

exports.update_shader = update_shader;
/**
 * Update shader id for batch
 * @methodOf batch
 */
function update_shader(batch) {
    if (!batch.shaders_info)
        m_util.panic("No shaders info for batch " + batch.name);

    if (batch.shader)
        var old_shader_id = batch.shader.shader_id;
    else
        var old_shader_id = null;

    batch.shader = m_shaders.get_compiled_shader(batch.shaders_info);

    validate_batch(batch);

    if (batch.shaders_info.status === m_shaders.VALID) {
        m_render.assign_uniform_setters(batch.shader);

        m_render.assign_attribute_setters(batch);

        // also do that in append_texture()
        m_render.assign_texture_uniforms(batch);

        if (batch.shader.shader_id != old_shader_id)
            batch.shader_updated = true;

        return true;
    }

    return false;
}

function validate_batch(batch) {
    var shaders_info = batch.shaders_info;

    if (shaders_info.status === m_shaders.VALID) {
        var shader = batch.shader;
        var attributes = shader.attributes;
        var pointers = batch.bufs_data.pointers;

        for (var attr in attributes) {
            var p = pointers[attr];
            if (!p)
                m_util.panic("missing data for \"" + attr + "\" attribute");
        }
    }

    if (shaders_info.status & m_shaders.INVALID_TEX_IMAGE_UNITS)
        m_print.error("Texture limit exceeded for shader - "
                + shaders_info.frag
                + ", materials: \"" + batch.material_names.join(", ")
                + "\". "
                + "Maximum texture count: "
                + cfg_lim.max_texture_image_units
                + ", actual texture count: "
                + shaders_info.texture_count);

    if (shaders_info.status & m_shaders.INVALID_F_UNIFORM_VECTORS)
        m_print.error("Fragment uniform limit exceeded for shader - "
                + shaders_info.frag
                + ", materials: \"" + batch.material_names.join(", ")
                + "\". "
                + "Maximum fragment uniform count: "
                + cfg_lim.max_fragment_uniform_vectors
                + ", actual fragment uniform count: "
                + shaders_info.frag_uniform_count);

    if (shaders_info.status & m_shaders.INVALID_V_UNIFORM_VECTORS)
        m_print.error("Vertex uniform limit exceeded for shader - "
                + shaders_info.vert
                + ", materials: \"" + batch.material_names.join(", ")
                + "\". "
                + "Maximum vertex uniform count: "
                + cfg_lim.max_vertex_uniform_vectors
                + ", actual vertex uniform count: "
                + shaders_info.vert_uniform_count);

    if (shaders_info.status & m_shaders.INVALID_VERTEX_ATTRIBS)
        m_print.error("Vertex attribute limit exceeded for shader - "
                + shaders_info.vert
                + ", materials: \"" + batch.material_names.join(", ")
                + "\". "
                + "Maximum attribute count: "
                + cfg_lim.max_vertex_attribs
                + ", actual attribute count: "
                + shaders_info.attribute_count);

    if (shaders_info.status & m_shaders.INVALID_VARYING_VECTORS)
        warn_batch_varyings(batch);

    if (shaders_info.status & m_shaders.COMPILATION_ERROR)
        m_print.error("Shader compilation/linking error: "
                + shaders_info.vert
                + ", " + shaders_info.frag
                + ", materials: \"" + batch.material_names.join(", ")
                + "\"");
}

function warn_batch_varyings(batch) {
    if (batch.type == "MAIN" && !batch.has_nodes)
        m_print.error("Varying limit exceeded for shader - "
                + batch.shaders_info.frag + ", materials: \"" + batch.material_names.join(", ")
                + "\"");

    if (batch.type == "MAIN" && batch.has_nodes
            || batch.type == "NODES_GLOW") {
        var used_uv = 0;
        var used_vc = 0;
        if (batch.uv_maps_usage)
            used_uv = m_util.get_dict_length(batch.uv_maps_usage);
        if (batch.vertex_colors_usage)
            used_vc = m_util.get_dict_length(batch.vertex_colors_usage);

        m_print.error("Varying limit exceeded for node shader - "
                + batch.shaders_info.frag + ", uv: " + used_uv + ", vc: " + used_vc
                + ", materials: \"" + batch.material_names.join(", ") + "\"");
    }
}

exports.generate_line_batches = function(scene, bpy_line_objects) {
    for (var i = 0; i < bpy_line_objects.length; i++) {
        var line_obj = bpy_line_objects[i]._object;

        var batch = init_batch("LINE");
        apply_shader(batch, "line.glslv", "line.glslf");
        // slightly decreases performance but allows alpha diffuse component
        batch.blend = true;

        var submesh = m_primitives.generate_line();
        update_batch_geometry(batch, submesh);
        update_batch_subtype(batch);

        batch.bb_local = m_bounds.create_bb();
        batch.bb_world = m_bounds.create_bb();
        batch.be_local = m_bounds.create_be();
        batch.be_world = m_bounds.create_be();
        batch.bs_world = m_bounds.create_bs();
        batch.bs_local = m_bounds.create_bs();

        m_obj_util.append_scene_data(line_obj, scene);
        var sc_data = m_obj_util.get_scene_data(line_obj, scene);

        sc_data.batches.push(batch);

        update_shader(batch);
    }
}

/**
 * Check if batch's shader has permanent uniform setter with given name
 */
exports.check_batch_perm_uniform = function(batch, uniform_name) {

    if (!batch.shader.permanent_uniform_setters.length)
        return false;

    if (batch.shader.permanent_uniform_setters_table[uniform_name])
        return true;

    return false;
}

exports.create_depth_pack_batch = function(tex) {

    var batch = init_batch("DEPTH_PACK");

    batch.use_backface_culling = true;
    batch.depth_mask = false;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/depth_pack.glslf");
    update_shader(batch);

    return batch;
}

exports.create_postprocessing_batch = function(post_effect) {

    var batch = init_batch("POSTPROCESSING");

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/postprocessing.glslf");

    switch (post_effect) {
    case "NONE":
        set_batch_directive(batch, "POST_EFFECT", "POST_EFFECT_NONE");
        break;
    case "GRAYSCALE":
        set_batch_directive(batch, "POST_EFFECT", "POST_EFFECT_GRAYSCALE");
        break;
    case "X_BLUR":
    case "Y_BLUR":
        set_batch_directive(batch, "POST_EFFECT", "POST_EFFECT_BLUR");
        break;
    case "X_GLOW_BLUR":
    case "Y_GLOW_BLUR":
        set_batch_directive(batch, "POST_EFFECT", "POST_EFFECT_GLOW_BLUR");
        break;
    case "X_DOF_BLUR":
    case "Y_DOF_BLUR":
        set_batch_directive(batch, "POST_EFFECT", "POST_EFFECT_DOF_BLUR");
        break;
    case "X_ALPHA_BLUR":
    case "Y_ALPHA_BLUR":
        set_batch_directive(batch, "POST_EFFECT", "POST_EFFECT_ALPHA_BLUR");
        break;
    case "X_EXTEND":
    case "Y_EXTEND":
        set_batch_directive(batch, "POST_EFFECT", "POST_EFFECT_EXTEND");
        break;
    case "FLIP_CUBEMAP_COORDS":
        set_batch_directive(batch, "POST_EFFECT", "FLIP_CUBEMAP_COORDS");
        break;
    default:
        m_util.panic("Wrong postprocessing effect: " + post_effect);
        break;
    }


    batch.use_backface_culling = true;
    batch.depth_mask = false;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    update_shader(batch);

    return batch;
}

exports.create_ssao_batch = function(subs) {

    var batch = init_batch("SSAO");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/ssao.glslf");

    set_batch_directive(batch, "SSAO_QUALITY", "SSAO_QUALITY_" + subs.ssao_samples);
    set_batch_directive(batch, "SSAO_HEMISPHERE", subs.ssao_hemisphere ? 1 : 0);

    var texture = m_textures.generate_texture("SSAO_TEXTURE", subs);
    var texture_slot = { "texture": texture };
    var random_vector_table = {
        width: 4,
        height: 4,
        data: new Uint8Array([ 150, 123, 254, 0,
                               127,   3,  97, 0,
                               164, 246,  99, 0,
                               155, 177,  14, 0,

                                54,  83, 221, 0,
                                 2, 142, 143, 0,
                                32,  57,  79, 0,
                                49, 160,  32, 0,

                                57, 232, 115, 0,
                               178, 216, 203, 0,
                                70, 196, 218, 0,
                               241, 164,  82, 0,

                               225,  58,  85, 0,
                               233,  88, 189, 0,
                               144,  25, 203, 0,
                               117,  73,  12, 0 ]) };

    var tex = m_textures.get_batch_texture(texture_slot, random_vector_table);
    append_texture(batch, tex, "u_ssao_special_tex");
    update_shader(batch);

    return batch;
}

exports.create_ssao_blur_batch = function(subs) {

    var batch = init_batch("SSAO_BLUR");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/ssao_blur.glslf");

    set_batch_directive(batch, "SSAO_BLUR_DEPTH", subs.ssao_blur_depth ? 1 : 0);

    update_shader(batch);

    return batch;
}

exports.create_coc_batch = function(coc_type) {

    var batch = init_batch("COC");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/coc.glslf");
    set_batch_directive(batch, "DEPTH_RGBA", 1);

    switch (coc_type) {
    case "COC_ALL":
        set_batch_directive(batch, "COC_TYPE", "COC_ALL");
        break;
    case "COC_FOREGROUND":
        set_batch_directive(batch, "COC_TYPE", "COC_FOREGROUND");
        break;
    case "COC_COMBINE":
        set_batch_directive(batch, "COC_TYPE", "COC_COMBINE");
        break;
    }
    update_shader(batch);

    return batch;
}


exports.create_dof_batch = function(subs) {

    var batch = init_batch("DOF");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/dof.glslf");
    if (subs.camera.dof_bokeh)
        set_batch_directive(batch, "DOF_TYPE", "DOF_BOKEH");
    else {
        set_batch_directive(batch, "DOF_TYPE", "DOF_SIMPLE");
        set_batch_directive(batch, "DEPTH_RGBA", 1);
    }
    update_shader(batch);

    return batch;
}

exports.create_outline_batch = function() {

    var batch = init_batch("OUTLINE");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/outline.glslf");

    update_shader(batch);

    return batch;
}

exports.create_glow_combine_batch = function() {

    var batch = init_batch("GLOW_COMBINE");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/glow.glslf");
    update_shader(batch);
    return batch;
}

exports.create_god_rays_batch = function(tex_input, pack, water, steps) {

    var batch = init_batch("GOD_RAYS");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    var submesh = m_primitives.generate_billboard();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/god_rays.glslv",
            "postprocessing/god_rays.glslf");
    set_batch_directive(batch, "DEPTH_RGBA", pack ? 1: 0);
    set_batch_directive(batch, "WATER_EFFECTS", water ? 1: 0);
    set_batch_directive(batch, "STEPS_PER_PASS", m_shaders.glsl_value(steps, 1));
    update_shader(batch);

    return batch;
}

exports.create_god_rays_combine_batch = function(tex_main, tex_god_rays) {

    var batch = init_batch("GOD_RAYS_COM");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/god_rays_combine.glslf");
    set_batch_directive(batch, "SAFARI_CANVAS_ALPHA_HACK", cfg_def.safari_canvas_alpha_hack ? 1: 0);
    update_shader(batch);

    return batch;
}

exports.create_cube_sky_batch = function(scene, subs, procedural_skydome) {

    var batch = init_batch("SKY");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    var submesh = m_primitives.generate_cube();
    update_batch_geometry(batch, submesh);
    if (procedural_skydome) {
        apply_shader(batch, "skybox.glslv",
                "proc_skybox.glslf");
        set_batch_directive(batch, "WATER_EFFECTS", 1);
    } else {
        apply_shader(batch, "skybox.glslv",
                "tex_skybox.glslf");
        if (scene) {
            var wls = scene._render.world_light_set;
            if (wls.sky_texture_slot) {
                var sky_texture = m_textures.get_batch_texture(wls.sky_texture_slot, null);
                append_texture(batch, sky_texture, sky_texture.name);
            }
            if (wls.sky_texture_param)
                set_batch_directive(batch, "WO_SKYTEX", 1);
        }

        if (subs.sky_invert)
            set_batch_directive(batch, "MTEX_NEGATIVE", 1);
        if (subs.sky_use_rgb_to_intensity)
            set_batch_directive(batch, "MTEX_RGBTOINT", 1);
        set_batch_directive(batch, "BLENDTYPE", subs.sky_blend_type);
        // if (subs.sky_stencil)
        //     set_batch_directive(batch, "MTEX_STENCIL", 1);
        if (subs.sky_use_map_blend)
            set_batch_directive(batch, "WOMAP_BLEND", 1);
        if (subs.sky_use_map_horizon)
            set_batch_directive(batch, "WOMAP_HORIZ", 1);
        if (subs.sky_use_map_zenith_up)
            set_batch_directive(batch, "WOMAP_ZENUP", 1);
        if (subs.sky_use_map_zenith_down)
            set_batch_directive(batch, "WOMAP_ZENDOWN", 1);

        if (subs.use_sky_blend)
            set_batch_directive(batch, "WO_SKYBLEND", 1);
        if (subs.use_sky_paper)
            set_batch_directive(batch, "WO_SKYPAPER", 1);
        if (subs.use_sky_real)
            set_batch_directive(batch, "WO_SKYREAL", 1);
    }
    batch.be_local = m_bounds.create_be();
    batch.be_world = m_bounds.create_be();
    batch.bb_local = m_bounds.create_bb();
    batch.bb_world = m_bounds.create_bb();
    batch.bs_local = m_bounds.create_bs();
    batch.bs_world = m_bounds.create_bs();
    update_shader(batch);

    return batch;
}

exports.append_cube_sky_batch_to_world = function(scene, world) {
    // we have to do this because we can change world textures via API
    var subs_sky = m_scenegraph.find_subs(scene._render.graph, m_subs.SKY);
    if (subs_sky) {
        var batch = subs_sky.draw_data[0].bundles[0].batch;
        var scene_data = m_obj_util.get_scene_data(world, scene);
        scene_data.batches.push(batch);
    }
}

exports.create_antialiasing_batch = function(subs) {
    var batch = init_batch("ANTIALIASING");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/antialiasing.glslf");

    if (cfg_def.quality_aa_method) {
        set_batch_directive(batch, "AA_METHOD", "AA_METHOD_FXAA_QUALITY");
        set_batch_directive(batch, "AA_QUALITY", subs.fxaa_quality);
    } else
        set_batch_directive(batch, "AA_METHOD", "AA_METHOD_FXAA_LIGHT");

    update_shader(batch);

    return batch;
}

exports.create_smaa_batch = function(type) {
    var batch = init_batch("SMAA");

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/smaa.glslv",
            "postprocessing/smaa.glslf");

    set_batch_directive(batch, "AA_METHOD", "AA_METHOD_SMAA_HIGH");
    set_batch_directive(batch, "SMAA_PASS", type);
    set_batch_directive(batch, "SMAA_PREDICATION", 0);

    // NOTE: temporary disabled T2X mode due to artifacts with blend objects
    set_batch_directive(batch, "SMAA_REPROJECTION", 0);
    //if (m_cfg.context.alpha)
    //    set_batch_directive(batch, "SMAA_REPROJECTION", 0);
    //else
    //    set_batch_directive(batch, "SMAA_REPROJECTION", 1);

    update_shader(batch);

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    return batch;
}

exports.create_compositing_batch = function() {
    var batch = init_batch("COMPOSITING");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/compositing.glslf");

    update_shader(batch);

    return batch;
}

exports.create_motion_blur_batch = function(decay_threshold) {

    var batch = init_batch("MOTION_BLUR");

    batch.use_backface_culling = true;
    batch.depth_mask = false;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/motion_blur.glslf");
    update_shader(batch);

    return batch;
}

exports.create_stereo_batch = function(stereo_type) {

    var batch = init_batch("STEREO");

    batch.use_backface_culling = true;
    batch.depth_mask = false;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/stereo.glslf");

    set_batch_directive(batch, "ANAGLYPH", stereo_type === "ANAGLYPH" ? 1 : 0);

    update_shader(batch);

    return batch;
}

exports.create_luminance_batch = function() {

    var batch = init_batch("LUMINANCE");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/luminance.glslf");
    update_shader(batch);

    return batch;
}

exports.create_average_luminance_batch = function() {

    var batch = init_batch("LUMINANCE");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/luminance_av.glslf");
    update_shader(batch);

    return batch;
}

exports.create_luminance_trunced_batch = function() {

    var batch = init_batch("LUMINANCE_X_BLUR");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/luminance_trunced.glslv",
            "postprocessing/luminance_trunced.glslf");
    update_shader(batch);

    return batch;
}

exports.create_bloom_blur_batch = function() {

    var batch = init_batch("POSTPROCESSING");

    batch.use_backface_culling = true;
    batch.depth_mask = false;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/bloom_blur.glslf");
    update_shader(batch);

    return batch;
}

exports.create_bloom_combine_batch = function() {

    var batch = init_batch("BLOOM");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/bloom_combine.glslf");
    update_shader(batch);

    return batch;
}

exports.create_velocity_batch = function() {
    var batch = init_batch("VELOCITY");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/velocity.glslf");

    update_shader(batch);

    return batch;
}

exports.create_anchor_visibility_batch = function() {
    var batch = init_batch("ANCHOR_VISIBILITY");

    batch.depth_mask = true;
    batch.use_backface_culling = true;

    batch.draw_mode = m_geom.DM_POINTS;

    apply_shader(batch, "anchors.glslv", "anchors.glslf");

    var submesh = m_primitives.generate_index(1);
    update_batch_geometry(batch, submesh);

    set_batch_directive(batch, "ANCHOR_NUM", 1);
    update_shader(batch);

    // NOTE: Prevent crash when there are no anchors but visibility is enabled
    batch.anchor_positions = new Float32Array(3);

    return batch;
}

exports.create_performance_batch = function() {
    var batch = init_batch("PERFORMANCE");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    var submesh = m_primitives.generate_fullscreen_tri();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/performance.glslf");

    update_shader(batch);

    return batch;
}

exports.update_anchor_visibility_batch = function(batch, positions) {
    var num = positions.length / 3;

    // optimization
    if (num != batch.anchor_positions.length / 3) {
        var submesh = m_primitives.generate_index(num);
        update_batch_geometry(batch, submesh);

        set_batch_directive(batch, "ANCHOR_NUM", num);
        update_shader(batch);
    }

    batch.anchor_positions = positions;
}

exports.get_first_batch = function(obj) {
    if (!obj.scenes_data.length)
       return null; 
    
    var scene_data = obj.scenes_data[0];

    if (scene_data.batches.length)
        return scene_data.batches[0];
    else
        return null;
}

/**
 * Find batch by object ID, material name and
 * batch type
 */
exports.find_batch_material = find_batch_material
function find_batch_material(obj, mat_name, type) {
    //NOTE: Searches for batches only on the first scene
    var scene_data = obj.scenes_data[0];
    var batches = scene_data.batches;
    for (var i = 0; i < batches.length; i++)
        if (batches[i].type == type && !batches[i].forked_batch
                && batches[i].material_names.indexOf(mat_name) != -1)
            return batches[i];
    return null;
}

exports.find_batch_material_forked = find_batch_material_forked
function find_batch_material_forked(obj, mat_name, type) {
    //NOTE: Searches for batches only on the first scene
    var scene_data = obj.scenes_data[0];
    var batches = scene_data.batches;
    for (var i = 0; i < batches.length; i++)
        if (batches[i].type == type && batches[i].forked_batch
                && batches[i].material_names.indexOf(mat_name) != -1)
            return batches[i];
    return null;
}

exports.set_material_props = set_material_props
function set_material_props (batch_to, batch_from) {
    batch_to.diffuse_color.set(batch_from.diffuse_color);

    batch_to.diffuse_intensity = batch_from.diffuse_intensity;
    batch_to.specular_color.set(batch_from.specular_color);
    batch_to.specular_color_factor = batch_from.specular_color_factor;
    batch_to.specular_params.set(batch_from.specular_params);

    batch_to.emit = batch_from.emit;
    batch_to.ambient = batch_from.ambient;

    batch_to.diffuse_color_factor = batch_from.diffuse_color_factor;
    batch_to.alpha_factor = batch_from.alpha_factor;

    batch_to.reflect_factor = batch_from.reflect_factor;
    batch_to.fresnel_params.set(batch_from.fresnel_params);
    batch_to.parallax_scale = batch_from.parallax_scale;
    batch_to.shallow_water_col.set(batch_from.shallow_water_col);
    batch_to.shallow_water_col_fac = batch_from.shallow_water_col_fac;
    batch_to.shore_water_col.set(batch_from.shore_water_col);
    batch_to.shore_water_col_fac = batch_from.shore_water_col_fac;
    batch_to.foam_factor = batch_from.foam_factor;
    batch_to.water_norm_uv_velocity = batch_from.water_norm_uv_velocity;

}
exports.check_batch_type = function(obj, type) {
    //NOTE: Searches for batches only on the first scene
    var scene_data = obj.scenes_data[0];
    var batches = scene_data.batches;
    for (var i = 0; i < batches.length; i++)
        if (batches[i].type == type)
            return true;
    return false;
}

/**
 * Delete all GL objects from the batch
 */
exports.clear_batch = function(batch) {
    var textures = batch.textures;
    for (var i = 0; i < textures.length; i++) {
        var tex = textures[i];
        if (tex.cleanup_gl_data_on_unload)
            m_textures.delete_texture(tex.w_texture);
    }

    if (batch.bufs_data.cleanup_gl_data_on_unload)
        m_geom.cleanup_bufs_data(batch.bufs_data);

    if (batch.cleanup_gl_data_on_unload && batch.vaos.length)
        m_render.cleanup_vao(batch);

    if (batch.shader.cleanup_gl_data_on_unload)
        m_shaders.cleanup_shader(batch.shader);

    if (batch.ngraph_proxy_id) {
        var ngraph_proxy = m_nodemat.get_ngraph_proxy_cached(batch.ngraph_proxy_id);
        if (ngraph_proxy && ngraph_proxy.cleanup_on_unload)
            m_nodemat.cleanup_ngraph_proxy(batch.ngraph_proxy_id);
    }
}

exports.inherit_material = function(obj_from, mat_from_name, obj_to,
                                    mat_to_name) {

    var types = ["MAIN", "SHADOW", "COLOR_ID"];
    var batches_found = false;
    for (var i = 0; i < types.length; i++) {
        var type = types[i];

        var batch_from = find_batch_material(obj_from,
            mat_from_name, type);
        var batch_to = find_batch_material(obj_to, mat_to_name,
            type);

        if (batch_from && batch_to) {
            batches_found = true;
            var child_batch = find_batch_material_forked(obj_to, mat_to_name,
                type);
            if (type == "MAIN") {
                set_material_props(batch_to, batch_from);
                if (child_batch)
                    set_material_props(child_batch, batch_from);
            }

            // inherit textures
            for (var j = 0; j < batch_to.texture_names.length; j++) {
                var to_name = batch_to.texture_names[j];
                if (BATCH_INHERITED_TEXTURES.indexOf(to_name) !== -1) {
                    var from_index = batch_from.texture_names.indexOf(to_name);
                    if (from_index !== -1) {
                        batch_to.textures[j] = batch_from.textures[from_index];

                        //inherit textures for child batches
                        if (child_batch) {
                            var child_index
                                = child_batch.texture_names.indexOf(to_name);
                            if (child_index !== -1)
                                child_batch.textures[child_index]
                                    = batch_from.textures[from_index];
                        }
                    }
                }
            }
        }
    }

    if (!batches_found)
        m_print.error("Wrong objects for inheriting material!")
}

exports.set_nodemat_value = function(obj, mat_name, ind, value) {
    for (var i = 0; i < obj.scenes_data.length; i++) {
        var batches = obj.scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++) {
            var batch = batches[j];
            if (batch.material_names.indexOf(mat_name) == -1
                    || !batch.node_values)
                continue;

            batch.node_values[ind] = value;
        }
    }
}

exports.set_nodemat_rgb = function(obj, mat_name, ind, r, g, b) {
    for (var i = 0; i < obj.scenes_data.length; i++) {
        var batches = obj.scenes_data[i].batches;
        for (var j = 0; j < batches.length; j++) {
            var batch = batches[j];
            if (batch.material_names.indexOf(mat_name) == -1
                    || !batch.node_rgbs)
                continue;
            batch.node_rgbs[3 * ind]     = r;
            batch.node_rgbs[3 * ind + 1] = g;
            batch.node_rgbs[3 * ind + 2] = b;
        }
    }
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
function get_node_ind_by_name_list(inds, name_list) {
    var id = node_id_from_name_list(name_list);
    for (var i = 0; i < inds.length; i+=2) {
        if (inds[i] == id)
            return inds[i+1]
    }
    return null;
}

function node_id_from_name_list(name_list) {
    var id = name_list[1]
    for (var i = 2; i < name_list.length; i++)
        id += "%join%" + name_list[i];
    return id;
}

exports.cleanup = function() {
    _batch_debug_storage = {}
}

}
