"use strict";

/**
 * Batch internal API.
 * @name batch
 * @namespace
 * @exports exports as batch
 */
b4w.module["__batch"] = function(exports, require) {

var boundings  = require("__boundings");
var m_cfg      = require("__config");
var m_print    = require("__print");
var extensions = require("__extensions");
var geometry   = require("__geometry");
var m_graph    = require("__graph");
var nodemat    = require("__nodemat");
var m_obj      = require("__objects");
var m_particles  = require("__particles");
var primitives = require("__primitives");
var m_reformer = require("__reformer");
var m_render   = require("__renderer");
var scenegraph = require("__scenegraph");
var m_scenes   = require("__scenes");
var m_shaders  = require("__shaders");
var m_textures = require("__textures");
var m_tsr      = require("__tsr");
var util       = require("__util");

var m_vec3 = require("vec3");
var m_vec4 = require("vec4");
var m_quat = require("quat");

var cfg_def = m_cfg.defaults;
var cfg_scs = m_cfg.scenes;

var DEBUG_SAVE_SUBMESHES = false;
var DEBUG_KEEP_BUFS_DATA_ARRAYS = false;

var BATCH_TYPES_DEBUG_SPHERE = ["MAIN", "NODES"];
var STREE_CELL_COUNT = 20;

/**
 * Create abstract batch
 * @param type Batch type: MAIN, SHADOW,...
 */
exports.init_batch = init_batch;
function init_batch(type) {

    // initialize properties (do not consider values as default!)
    var batch = {
        type: type,

        id: 0,
        render_id: 0,
        odd_id_prop: "",

        textures: [],
        texture_names: [],
        material_names: [],

        node_elements: [],
        common_attributes: [],
        uv_maps_usage: null,
        vertex_colors_usage: {},

        shader: null,
        shaders_info: null,
        attribute_setters: [],
        particle_system: null,
        bufs_data: null,
        bone_pointers: null,
        childs: null,

        debug_sphere_dynamic: false,
        num_vertices: 0,
        num_triangles: 0,
        jitter_amp: 0,
        jitter_freq: 0,
        glow_intensity: 0,
        grass_scale_threshold: 0,
        grass_size: 0,
        grass_map_dim: new Float32Array(3),
        color_id: new Float32Array(3),
        cube_fog: new Float32Array(16),

        // rendering properties
        blend: false,
        color_mask: false,
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
        procedural_sky: false,
        draw_mode: geometry.DM_DEFAULT,
        zsort_type: geometry.ZSORT_DISABLED,
        texel_size_multiplier: 0,
        texel_size: new Float32Array(2),
        texel_mask: new Float32Array(2),

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
        lamp_light_factors: null,

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

        // emitter particles properties
        p_length: 0,
        p_cyclic: 0,
        p_nfactor: 0,
        p_gravity: 0,
        p_max_lifetime: 0,
        p_mass: 0,
        p_fade_in: 0,
        p_fade_out: 0,
        p_size: 0,
        p_alpha_start: 0,
        p_alpha_end: 0,
        p_size_ramp_length: 0,
        p_color_ramp_length: 0,
        p_wind: new Float32Array(3),
        p_size_ramp: new Float32Array(8),
        p_color_ramp: new Float32Array(16)
    }

    // setting default values
    batch.diffuse_color[3] = 1;
    batch.color_mask = true;
    batch.depth_mask = true;
    batch.texel_size_multiplier = 1;

    return batch;
}

/**
 * Generate object batches for graph subscenes.
 */
exports.generate_main_batches = function(graph, grid_size, scene_objects, world, lamps_number) {

    var dynamic_objects = [];
    var static_objects = [];
    for (var i = 0; i < scene_objects.length; i++) {
        var obj = scene_objects[i];
        switch (obj._render.type) {
        case "DYNAMIC":
            dynamic_objects.push(obj);
            break;
        case "STATIC":
            static_objects.push(obj);
            break;
        }
    }

    // create merged metabatches
    var metabatches = [];
    metabatches = metabatches.concat(make_dynamic_metabatches(dynamic_objects,
            graph, lamps_number));
    metabatches = metabatches.concat(make_static_metabatches(static_objects,
            graph, grid_size, lamps_number));
    metabatches = merge_metabatches(metabatches);

    for (var i = 0; i < metabatches.length; i++) {
        update_batch_geometry(metabatches[i].batch, metabatches[i].submesh);
        metabatches[i].batch.material_names = metabatches[i].mat_names;
    }

    var meta_objects = [];
    for (var i = 0; i < metabatches.length; i++) {
        var batch = metabatches[i].batch;

        if (metabatches[i].render.type == "STATIC") {
            // create meta-objects and attach static batches
            var meta_obj = util.init_object(util.unique_name("%meta"), "MESH");
            meta_obj._render = metabatches[i].render;
            meta_obj._batches = [batch];
            meta_objects.push(meta_obj);
        } else {
            // attach dynamic batches to objects
            var unique_obj_names = [];
            for (var j = 0; j < metabatches[i].rel_objects.length; j++) {
                var obj = metabatches[i].rel_objects[j];

                if (unique_obj_names.indexOf(obj.name) == -1) {
                    append_batch(obj, batch);
                    unique_obj_names.push(obj.name);
                }
            }
        }
    }

    // create debug spheres
    if (cfg_def.wireframe_debug) {
        // create debug sphere batches around dynamic objects
        for (var i = 0; i < metabatches.length; i++) {
            // same as obj._render for dynamic objects
            var render = metabatches[i].render;
            if (render.type == "DYNAMIC") {
                // single object for dynamic batch
                var obj = metabatches[i].rel_objects[0];
                if (BATCH_TYPES_DEBUG_SPHERE.indexOf(
                        metabatches[i].batch.type) > -1) {
                    var ds_batch = create_bounding_ellipsoid_batch(
                            render.be_local, render, obj.name, true, true);
                    obj._batches.push(ds_batch);
                }
            }
        }

        // create debug sphere batches around meta-objects
        for (var i = 0; i < meta_objects.length; i++) {
            var obj = meta_objects[i];
            var render = obj._render;

            // every meta object has one batch
            if (BATCH_TYPES_DEBUG_SPHERE.indexOf(obj._batches[0].type) > -1) {
                var ds_batch = create_bounding_ellipsoid_batch(render.bs_local,
                        render, obj.name, false);
                obj._batches.push(ds_batch);
            }
        }
    }
    // generate sky metabatche
    var sky_texture = null;
    if (world["texture_slots"])
        for (var i = 0; i < world["texture_slots"].length; i++)
            if (world["texture_slots"][i]["texture"]["b4w_use_as_skydome"]) {
                sky_texture = get_batch_texture(world["texture_slots"][i], null);
                break;
            }

    if (world["b4w_sky_settings"]["procedural_skydome"] || sky_texture) {
        var batch = init_batch("MAIN");
        apply_shader(batch, "special_skydome.glslv", "special_skydome.glslf");
        if (world["b4w_sky_settings"]["procedural_skydome"])
            batch.procedural_sky = true;
        else
            append_texture(batch, sky_texture, "u_sky");
        if (world["b4w_sky_settings"]["reflexible"]) {
            batch.reflexible = true;
            if (world["b4w_sky_settings"]["reflexible_only"])
                batch.reflexible_only = true;
        }
        set_batch_c_attr(batch, "a_position");
        // render last
        batch.offset_z = 99999;

        var submesh = primitives.generate_fullscreen_quad();
        update_batch_geometry(batch, submesh);

        var meta_obj = util.init_object(util.unique_name("%meta"), "MESH");
        meta_obj._render = m_obj.create_render("DYNAMIC");
        meta_obj._render.do_not_cull = true;
        meta_obj._render.bb_local = boundings.zero_bounding_box();
        meta_obj._render.bs_local = boundings.zero_bounding_sphere();
        meta_obj._render.bb_world = boundings.zero_bounding_box();
        meta_obj._render.bs_world = boundings.zero_bounding_sphere();
        meta_obj._batches = [batch];
        meta_objects.push(meta_obj);
    }

    return meta_objects;
}

function make_dynamic_metabatches(dyn_objects, graph, lamps_number) {
    var metabatches = [];
    for (var i = 0; i < dyn_objects.length; i++) {
        var obj = dyn_objects[i];
        var render = obj._render;

        var bb_local = bb_bpy_to_b4w(obj["data"]["b4w_bounding_box"]);
        var cyl_radius = obj["data"]["b4w_bounding_cylinder_radius"];
        var bs_radius = obj["data"]["b4w_bounding_sphere_radius"];
        var bs_center = obj["data"]["b4w_bounding_sphere_center"];
        var be_axes = obj["data"]["b4w_bounding_ellipsoid_axes"];
        var be_center = obj["data"]["b4w_bounding_ellipsoid_center"];

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

            be_axes[0] = be_axes[1] = be_axes[2] = sphere_radius;
            be_center[0] = be_center[1] = be_center[2] = 0;
        }

        render.bb_local = bb_local;
        var bb_world = boundings.bounding_box_transform(bb_local,
                render.world_matrix);
        render.bb_world = bb_world;

        set_local_cylinder_capsule(render, cyl_radius, cyl_radius, bb_local);

        // bounding sphere
        var bs_local = boundings.create_bounding_sphere(bs_radius, bs_center);
        render.bs_local = bs_local;
        var bs_world = boundings.bounding_sphere_transform(bs_local,
                render.world_matrix);
        render.bs_world = bs_world;

        // bounding ellipsoid
        var be_local = boundings.create_bounding_ellipsoid(
                [be_axes[0], 0, 0], [0, be_axes[1], 0], [0, 0, be_axes[2]],
                be_center);
        render.be_local = be_local;
        var be_world = boundings.bounding_ellipsoid_transform(be_local,
                render.tsr);
        render.be_world = be_world;

        metabatches = metabatches.concat(make_object_metabatches(obj, render,
                graph, lamps_number));
    }
    return metabatches;
}

function make_static_metabatches(static_objects, graph, grid_size, lamps_number) {
    var metabatches = [];

    var clusters = create_object_clusters(static_objects, grid_size);

    for (var i = 0; i < clusters.length; i++) {
        var render = clusters[i].render;
        var objs = clusters[i].objects;

        for (var j = 0; j < objs.length; j++) {
            var obj = objs[j];
            var obj_metabatches = make_object_metabatches(obj, render, graph, lamps_number);

            var tsr = tsr_from_render(obj._render) || tsr_from_render(render);
            var params = {};
            if (render.wind_bending) {
                params["au_center_pos"] = [tsr[0], tsr[1], tsr[2]];
                params["au_wind_bending_amp"] = [obj._render.wind_bending_amp];

                params["au_wind_bending_freq"]
                        = [obj["b4w_wind_bending_freq"]];
                params["au_detail_bending_amp"]
                        = [obj["b4w_detail_bending_amp"]];
                params["au_detail_bending_freq"]
                        = [obj["b4w_detail_bending_freq"]];
                params["au_branch_bending_amp"]
                        = [obj["b4w_branch_bending_amp"]];
            }

            for (var k = 0; k < obj_metabatches.length; k++) {
                var metabatch_render = obj_metabatches[k].render;
                var submesh = obj_metabatches[k].submesh;
                var batch = obj_metabatches[k].batch;

                if (!metabatch_render.is_hair_particles) {
                    // make dynamic metabatch for COLOR_ID batch type
                    // use object render instead of cluster render
                    if (batch.type == "COLOR_ID") {
                        var obj_render = obj_metabatches[k].render = obj._render;
                        obj_render.type = "DYNAMIC";
                        batch.odd_id_prop = obj["uuid"];
                        update_batch_render(batch, obj_render);
                        update_batch_id(batch, util.calc_variable_id(obj_render, 0));
                    } else
                        submesh = geometry.submesh_apply_transform(submesh, tsr);
                    submesh = geometry.submesh_apply_params(submesh, params);
                } else {
                    // NOTE: submesh params for particles applied in
                    // make_hair_particles_metabatches() function
                    if (metabatch_render.billboard)
                        submesh = geometry.submesh_apply_particle_transform(submesh, tsr);
                    else
                        submesh = geometry.submesh_apply_transform(submesh, tsr);
                }
            }

            metabatches = metabatches.concat(obj_metabatches);
        }
    }

    return metabatches;
}

/**
 * Create batches and metadata for single object
 */
function make_object_metabatches(obj, render, graph, lamps_number) {
    var metabatches = [];

    // NOTE: generate all batches
    var batch_types = get_batch_types(graph, render);
    var render_id = util.calc_variable_id(render, 0);
    var mesh = obj["data"];
    var materials = mesh["materials"];
    
    for (var i = 0; i < batch_types.length; i++) {
        var type = batch_types[i];

        if (obj["b4w_do_not_render"] && type != "PHYSICS")
            continue;

        // j == submesh index == material index
        for (var j = 0; j < materials.length; j++) {
            var material = materials[j];
            if (material["name"] == "LENS_FLARES" && lamps_number == 0)
                continue;

            if (geometry.has_empty_submesh(mesh, j))
                continue;
            var batch = init_batch(type);
            if (!update_batch_material(batch, material, true))
                continue;
            batch.draw_mode = mesh.draw_mode || geometry.DM_DEFAULT;
            if (type === "COLOR_ID")
                batch.color_id.set(obj._color_id);

            update_batch_render(batch, render);
            update_batch_particle_systems(batch, obj["particle_systems"]);

            if (render.type == "DYNAMIC")
                batch.odd_id_prop = obj["uuid"];

            update_batch_id(batch, render_id);

            var submesh = geometry.extract_submesh(mesh, j,
                    batch.common_attributes, batch.bone_pointers,
                    batch.vertex_colors_usage, batch.uv_maps_usage);

            if (material["name"] == "LENS_FLARES")
                submesh = m_particles.prepare_lens_flares(submesh);

            metabatches.push({
                batch: batch,
                submesh: submesh,
                mat_names: [material["name"]],
                render: render,
                rel_objects: [obj]
            });
        }
    }

    // process particle system batches
    var psystems = obj["particle_systems"];
    if (psystems.length > 0 && metabatches.length) {
        // check if emitter rendering needed
        var not_render_emitter = true;
        for (var i = 0; i < psystems.length; i++) {
            var psys = psystems[i];
            if (psys["settings"]["use_render_emitter"]) {
                not_render_emitter = false;
                break;
            }
        }

        // NOTE: assume single-material emitter
        var em_batch = metabatches[0].batch;
        var em_submesh = metabatches[0].submesh;
        var particles_metabatches = make_particles_metabatches(obj, render,
                graph, render_id, em_batch, em_submesh);

        if (not_render_emitter)
            metabatches = particles_metabatches;
        else
            metabatches = metabatches.concat(particles_metabatches);
    }
    return metabatches;
}

/**
 * Create batches and metadata for object particle systems
 */
function make_particles_metabatches(obj, render, graph, render_id, em_batch,
        em_submesh) {
    var metabatches = [];

    var psystems = obj["particle_systems"];
    var mesh = obj["data"];
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
                var pmaterial = select_psys_material(psys, mesh["materials"]);

                if (psys["settings"]["render_type"] === "HALO")
                    batch.halo_particles = true;

                update_batch_material(batch, pmaterial);
                update_batch_render(batch, render);
                update_batch_particles_emitter(batch, psys);

                // NOTE: dynamic_geometry for dynamic particles on EMITTER psys
                batch.dynamic_geometry = true;

                batch.odd_id_prop = obj["name"] + "_" + pset["uuid"];
                update_batch_id(batch, render_id);

                batch.particle_system = psys;

                var submesh = m_particles.generate_emitter_particles_submesh(
                        batch, mesh, psys, pmaterial,
                        obj._render.tsr);

                m_particles.set_emitter_particles_uniforms(batch, psys, pmaterial);

                metabatches.push({
                    batch: batch,
                    submesh: submesh,
                    mat_names: [pmaterial["name"]],
                    render: render,
                    rel_objects: [obj]
                });
            }

        } else if (pset["type"] == "HAIR") {
            var seed = util.init_rand_r_seed(psys["seed"]);

            // disable frustum culling for dynamic grass (only)
            if (pset["b4w_dynamic_grass"])
                render.do_not_cull = true;

            if (psys["transforms"].length) {
                var ptrans = psys["transforms"];
            } else {
                var points = geometry.geometry_random_points(em_submesh,
                        pset["count"], false, seed);

                var ptrans = new Float32Array(points.length * 4);
                for (var j = 0; j < points.length; j++) {
                    // NOTE: +/- 25%
                    var scale = 0.75 + 0.5 * util.rand_r(seed);
                    ptrans[j * 4] = points[j][0];
                    ptrans[j * 4 + 1] = points[j][1];
                    ptrans[j * 4 + 2] = points[j][2];
                    ptrans[j * 4 + 3] = scale;
                }
            }

            var use_grass_map = scenegraph.find_subs(graph, "GRASS_MAP") ?
                    true : false;

            if (pset["render_type"] == "OBJECT") {
                var particles_batch_types = [get_batch_types(graph,
                        pset["dupli_object"]._render)];

                var hair_metabatches = make_hair_particles_metabatches(
                        obj, render, em_batch, em_submesh,
                        [pset["dupli_object"]], particles_batch_types,
                        [ptrans], pset, psys, use_grass_map, seed, false);

                metabatches = metabatches.concat(hair_metabatches);

            } else if (pset["render_type"] == "GROUP") {
                var dg_objs = pset["dupli_group"]["objects"];
                var reset_seed = false;

                var particles_batch_types = [];
                for (var j = 0; j < dg_objs.length; j++) {
                    var btypes = get_batch_types(graph,
                            pset["dupli_group"]["objects"][j]._render);
                    particles_batch_types.push(btypes);
                }

                if (pset["use_whole_group"]) {
                    var ptrans_dist = distribute_ptrans_group(ptrans,
                            dg_objs);
                    reset_seed = true;
                } else if (pset["use_group_count"]) {
                    var ptrans_dist = distribute_ptrans_by_dupli_weights(
                            ptrans, dg_objs, pset["dupli_weights"], seed);
                } else {
                    var ptrans_dist = distribute_ptrans_equally(ptrans,
                        dg_objs, seed);
                }

                var hair_metabatches = make_hair_particles_metabatches(
                        obj, render, em_batch, em_submesh, dg_objs,
                        particles_batch_types, ptrans_dist, pset, psys,
                        use_grass_map, seed, reset_seed);

                metabatches = metabatches.concat(hair_metabatches);
            }

            // NOTE: prevent wind bending for emitter by checking option
            if (pset["b4w_wind_bend_inheritance"] == "INSTANCE")
                obj._render.wind_bending_amp = 0;
        } else
            throw "Unknown particle settings type";
    }

    return metabatches;
}

function select_psys_material(psys, materials) {
    var mat_index = psys["settings"]["material"] - 1;

    if (mat_index >= materials.length) {
        m_print.warn("B4W Warning: Wrong material used for rendering particle " +
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
            if (util.strict_objs_is_equal(batch, collision_batch)
                    && util.strict_objs_is_equal(render, collision_render))
                var batch_data = unique_data[index];

            // return removed properties
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
                rel_objects: [],
                submeshes: [],
                mat_names: []
            };
            batches_ids[batch.id] = unique_data.length;
            unique_data.push(batch_data);
        }

        batch_data.rel_objects = batch_data.rel_objects.concat(
                metabatches[i].rel_objects);
        // ignore empty submeshes ???
        if (metabatches[i].submesh && metabatches[i].submesh.base_length)
            batch_data.submeshes.push(metabatches[i].submesh);

        if (batch_data.mat_names.length)
            for (var j = 0; j < metabatches[i].mat_names.length; j++) {
                var mat_name = metabatches[i].mat_names[j];
                if (batch_data.mat_names.indexOf(mat_name) == -1)
                    batch_data.mat_names.push(mat_name);
            }
        else
            batch_data.mat_names = metabatches[i].mat_names;
    }

    // calculate submeshes for unique batches
    for (var i = 0; i < unique_data.length; i++) {
        var submeshes = unique_data[i].submeshes;

        if (submeshes.length == 0)
            var submesh = util.create_empty_submesh(util.unique_name("%empty"));
        else if (submeshes.length == 1)
            var submesh = submeshes[0];
        else {
            var short_submeshes = [];
            for (var j = 0; j < submeshes.length; j++)
                if (!geometry.is_long_submesh(submeshes[j]))
                    short_submeshes.push(j);
            if (short_submeshes.length < submeshes.length)
                for (var j = 0; j < short_submeshes.length; j++)
                    geometry.submesh_drop_indices(
                            submeshes[short_submeshes[j]]);

            var submesh = geometry.submesh_list_join(submeshes);

        }

        var metabatch = {
            batch: unique_data[i].batch,
            render: unique_data[i].render,
            submesh: submesh,
            mat_names: unique_data[i].mat_names,
            rel_objects: unique_data[i].rel_objects
        }
        merged_metabatches.push(metabatch);
    }

    return merged_metabatches;
}

/**
 * Append batch to object
 * NOTE: unique batch needed (?)
 */
function append_batch(obj, new_batch) {

    for (var i = 0; i < obj._batches.length; i++) {
        var batch = obj._batches[i];

        if (batch == new_batch)
            throw "Batch already exist in object"
    }

    obj._batches.push(new_batch);
}

/**
 * Update local cylinder and capsule boundings
 */
function set_local_cylinder_capsule(render, cyl_radius, cap_radius, bb_local) {
    render.bcyl_local = boundings.create_bounding_cylinder(cyl_radius, bb_local);
    render.bcap_local = boundings.create_bounding_capsule(cap_radius, bb_local);
    render.bcon_local = boundings.create_bounding_cone(cyl_radius, bb_local);
}

exports.wb_angle_to_amp = wb_angle_to_amp;
function wb_angle_to_amp(angle, bbox, scale) {
    if (bbox) {
        var height = scale * (bbox.max_y - bbox.min_y);
    } else {
        var height = 1;
        throw "No bounding box for mesh";
    }

    if (height == 0)
        return 0;

    var delta = height * Math.tan(angle/180 * Math.PI);

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

function get_batch_types(graph, render) {
    var batch_types = ["MAIN", "NODES"];

    if (render.selectable && (scenegraph.find_subs(graph, "COLOR_PICKING") ||
            scenegraph.find_subs(graph, "GLOW_MASK")))
        batch_types.push("COLOR_ID");

    if (scenegraph.find_subs(graph, "WIREFRAME"))
        batch_types.push("WIREFRAME");

    // NOTE: need condition
    batch_types.push("PHYSICS");

    if (scenegraph.find_subs(graph, "DEPTH") ||
            scenegraph.find_subs(graph, "SHADOW_CAST"))
        batch_types.push("DEPTH");

    if (scenegraph.find_subs(graph, "GRASS_MAP"))
        batch_types.push("GRASS_MAP");


    if (render.shadow_cast_only || render.reflexible_only) {
        var unwanted_types = null;

        if (render.shadow_cast_only)
            unwanted_types = ["MAIN", "NODES", "COLOR_ID", "PHYSICS",
                              "WIREFRAME"];
        if (render.reflexible_only) {
            var types = ["COLOR_ID", "PHYSICS", "DEPTH", "WIREFRAME"];
            if (unwanted_types !== null)
                unwanted_types = util.array_intersect(unwanted_types, types);
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
    case "NODES":
        ret = update_batch_material_nodes(batch, material);
        break;
    case "DEPTH":
        ret = update_batch_material_depth(batch, material);
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
    case "WIREFRAME":
        ret = update_batch_material_wireframe(batch, material);
        break;
    case "PARTICLES":
        ret = update_batch_material_particles(batch, material);
        break;
    default:
        throw "Wrong batch type: " + batch.type;
    }

    return ret;
}

function update_batch_material_main(batch, material, update_tex_color) {
    if (material["b4w_do_not_render"])
        return false;

    if (material["use_nodes"])
        return false;

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

    switch (material["name"]) {
    case "LENS_FLARES":
        apply_shader(batch, "special_lens_flares.glslv", "special_lens_flares.glslf");
        set_batch_c_attr(batch, "a_position");
        set_batch_c_attr(batch, "a_texcoord");
        var tex_col = update_tex_color ? [1, 1, 1, 0] : null;
        var tex = get_batch_texture(texture_slots[0], tex_col);
        append_texture(batch, tex);
        break;
    default:
        apply_shader(batch, "main.glslv", "main.glslf");

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
            var tex = get_batch_texture(colormap0, tex_col);
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
                var tex = get_batch_texture(specmap0, tex_col);
                append_texture(batch, tex, "u_specmap0");
            }
            batch.specular_color_factor = specmap0["specular_color_factor"];
        }

        if (normalmap0) {
            set_batch_c_attr(batch, "a_normal");
            set_batch_c_attr(batch, "a_tangent");

            var tex_col = update_tex_color ? [0.5, 0.5, 1, 1] : null;
            var tex = get_batch_texture(normalmap0, tex_col);
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
            var tex = get_batch_texture(mirrormap0, tex_col);
            append_texture(batch, tex, "u_mirrormap");
            batch.mirror_factor = mirrormap0["mirror_factor"];
        }

        var TEXTURE_STENCIL_ALPHA_MASK = colormap0 && colormap1 && stencil0 ? 1 : 0;

        if (TEXTURE_STENCIL_ALPHA_MASK) {
            var tex_col = update_tex_color ? [0.8, 0.8, 0.8, 1] : null;
            var tex = get_batch_texture(colormap1, tex_col);
            append_texture(batch, tex, "u_colormap1");
            var tex_col = update_tex_color ? [0.5, 0.5, 0.5, 1] : null;
            var tex = get_batch_texture(stencil0, tex_col);
            append_texture(batch, tex, "u_stencil0");
        }

        // setup texture scale using one of available textures
        var some_tex = colormap0 || specmap0 || normalmap0;
        if (some_tex)
            batch.texture_scale.set(some_tex["scale"]);

        // assign directives
        set_batch_directive(batch, "TEXTURE_SPEC", specmap0 == undefined ? 0 : 1);
        set_batch_directive(batch, "TEXTURE_MIRROR", mirrormap0 == undefined ? 0 : 1);
        set_batch_directive(batch, "ALPHA_AS_SPEC", alpha_as_spec ? 1 : 0);
        set_batch_directive(batch, "TEXTURE_STENCIL_ALPHA_MASK", TEXTURE_STENCIL_ALPHA_MASK);

        set_batch_c_attr(batch, "a_position");
        set_batch_c_attr(batch, "a_normal");

        if (colormap0 || specmap0 || normalmap0)
            set_batch_c_attr(batch, "a_texcoord");

        if (material["b4w_water"]) {
            var rslt = init_water_material(material, batch)
            // NOTE: override
            batch.shaders_info = rslt.shaders_info;
            batch.common_attributes = rslt.common_attributes;
        }

        if (material["type"] === "HALO") {
            var mat_halo = material["halo"];
            apply_shader(batch, "halo.glslv", "halo.glslf");

            set_batch_directive(batch, "NUM_RINGS", mat_halo["ring_count"]);
            set_batch_directive(batch, "NUM_LINES", mat_halo["line_count"]);
            set_batch_directive(batch, "NUM_STARS", mat_halo["star_tip_count"]);
            set_batch_directive(batch, "SKY_STARS", material["b4w_halo_sky_stars"] ? 1 : 0);

            batch.common_attributes = ["a_position"];

            batch.halo_size = mat_halo["size"];
            // NOTE: hardness works not similiar to blender's one
            batch.halo_hardness = mat_halo["hardness"] / 20;
            batch.halo_rings_color.set(mat_halo["b4w_halo_rings_color"]);
            batch.halo_lines_color.set(mat_halo["b4w_halo_lines_color"]);
            batch.halo_stars_blend = 1.0 / material["b4w_halo_stars_blend_height"];
            batch.halo_stars_height = material["b4w_halo_stars_min_height"];
            batch.halo = true;
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

        break;  // end of default
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

    if (cfg_def.glsl_unroll_hack)
        set_batch_directive(batch, "UNROLL_LOOPS", 1);
    else
        set_batch_directive(batch, "UNROLL_LOOPS", 0);

    batch.refractive = material["b4w_refractive"];
    batch.refr_bump = material["b4w_refr_bump"];

    return true;
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
        set_batch_directive(batch, directive_name, 0);
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
        batch.zsort_type = geometry.ZSORT_BACK_TO_FRONT;
        batch.depth_mask = true;
        break;
    case "ALPHA":       // Alpha Blend      don't sort      blend
        batch.blend = true;
        batch.zsort_type = geometry.ZSORT_DISABLED;
        batch.depth_mask = true;
        break;
    case "CLIP":        // Alpha Clip       don't sort      discard
        batch.blend = false;
        batch.zsort_type = geometry.ZSORT_DISABLED;
        batch.depth_mask = true;
        break;
    case "ADD":         // Add              don't sort      blend, depthMask(false)
        batch.blend = true;
        batch.zsort_type = geometry.ZSORT_DISABLED;
        batch.depth_mask = false;
        break;
    case "OPAQUE":      // Opaque           don't sort      don't blend
        batch.blend = false;
        batch.zsort_type = geometry.ZSORT_DISABLED;
        //batch.zsort_type = geometry.ZSORT_FRONT_TO_BACK;
        batch.depth_mask = true;
        break;
    default:
        throw new Error("Unknown alpha blend mode: " + alpha_blend);
    }

    batch.use_backface_culling = gs["use_backface_culling"];
}

exports.get_batch_texture = get_batch_texture;
/**
 * Extract b4w texture from slot and apply color
 * @param texture_slot Texture slot
 * @param {vec4} [color=null] Default texture color
 */
function get_batch_texture(texture_slot, color) {

    var bpy_texture = texture_slot["texture"];

    var render = bpy_texture._render;
    var image = bpy_texture["image"];

    if (render && color && image)
        m_textures.update_texture(render, color, image._is_dds,
            image["filepath"]);

    return render;
}

/**
 * Return array of valid textures
 */
function find_valid_textures(key, value, array) {
    var results = [];

    var len = array.length;
    for (var i = 0; i < len; i++) {
        var obj = array[i];
        if (obj[key] == value && obj["texture"] && obj["texture"]._render)
            results.push(obj);
    }
    return results;
}

function init_water_material(material, batch) {

    batch.water = true;
    batch.water_shore_smoothing = material["b4w_water_shore_smoothing"];
    batch.water_dynamic         = material["b4w_water_dynamic"];
    var texture_slots = material["texture_slots"];

    apply_shader(batch, "special_water.glslv", "special_water.glslf");
    set_batch_c_attr(batch, "a_position");
    set_batch_c_attr(batch, "a_texcoord");
    set_batch_c_attr(batch, "a_normal");
    set_batch_c_attr(batch, "a_tangent");

    // debug wireframe mode
    if (cfg_def.water_wireframe_debug) {
        set_batch_c_attr(batch, "a_polyindex");

        batch.depth_mask = true;
        batch.wireframe_edge_color = [0, 0, 0];
        set_batch_directive(batch, "DEBUG_WIREFRAME", 1);
    } else
        set_batch_directive(batch, "DEBUG_WIREFRAME", 0);

    var normalmaps = find_valid_textures("use_map_normal", true, texture_slots);
    var mirrormap0 = find_valid_textures("use_map_mirror", true, texture_slots)[0];

    if (normalmaps.length) {
        var tex_nm = get_batch_texture(normalmaps[0]);
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
        set_batch_directive(batch, "TEXTURE_MIRROR", 1);
        var tex_mm0 = get_batch_texture(mirrormap0);
        append_texture(batch, tex_mm0, "u_mirrormap");
        batch.mirror_factor = mirrormap0["mirror_factor"];
    } else
        set_batch_directive(batch, "TEXTURE_MIRROR", 0);

    var foam = null;
    for (var i = 0; i < texture_slots.length; i++) {
        // find first foam texture
        var texture = texture_slots[i];
        if (texture["texture"]["b4w_water_foam"] === true) {
           foam = texture;
           break;
        }
    }

    if (foam && cfg_def.foam) {
        set_batch_directive(batch, "FOAM", 1);

        var tex_foam = get_batch_texture(foam);
        append_texture(batch, tex_foam, "u_foam");

        batch.foam_factor = material["b4w_foam_factor"];
        batch.foam_uv_freq.set(foam["texture"]["b4w_foam_uv_freq"]);
        batch.foam_mag.set(foam["texture"]["b4w_foam_uv_magnitude"]);
        // vec3 -> vec2
        batch.foam_scale[0] = foam["scale"][0];
        batch.foam_scale[1] = foam["scale"][1];
    } else {
        set_batch_directive(batch, "FOAM", 0);
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
        var tex_shr0 = get_batch_texture(shore_dist_map);
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
    } else {
        set_batch_directive(batch, "SHORE_PARAMS", 0);
    }
    if (material["b4w_generated_mesh"] && cfg_def.deferred_rendering) {
        set_batch_directive(batch, "GENERATED_MESH", 1);
        batch.water_generated_mesh = true;
        batch.water_num_cascads    = material["b4w_water_num_cascads"];
        batch.water_subdivs        = material["b4w_water_subdivs"];
        batch.water_detailed_dist  = material["b4w_water_detailed_dist"];
    } else
        set_batch_directive(batch, "GENERATED_MESH", 0);

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

    return {shaders_info: batch.shaders_info, common_attributes: batch.common_attributes};
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
        set_batch_directive(batch, "SPECULAR_SHADER", "SPECULAR_PHONG");
        spec_param_0 = material["specular_hardness"];
        break;
    case "WARDISO":
        set_batch_directive(batch, "SPECULAR_SHADER", "SPECULAR_WARDISO");
        spec_param_0 = material["specular_slope"];
        break;
    case "TOON":
        set_batch_directive(batch, "SPECULAR_SHADER", "SPECULAR_TOON");
        spec_param_0 = material["specular_toon_size"];
        spec_param_1 = material["specular_toon_smooth"];
        break;
    default:
        m_print.error("B4W Error: unsupported specular shader: " +
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
        set_batch_directive(batch, "DIFFUSE_SHADER", "DIFFUSE_LAMBERT");
        batch.diffuse_params[0] = 0.0;
        batch.diffuse_params[1] = 0.0;
        break;
    case "OREN_NAYAR":
        set_batch_directive(batch, "DIFFUSE_SHADER", "DIFFUSE_OREN_NAYAR");
        batch.diffuse_params[0] = material["roughness"];
        batch.diffuse_params[1] = 0.0;
        break;
    case "FRESNEL":
        set_batch_directive(batch, "DIFFUSE_SHADER", "DIFFUSE_FRESNEL");
        batch.diffuse_params[0] = material["diffuse_fresnel"];
        batch.diffuse_params[1] = material["diffuse_fresnel_factor"];
        break;
    default:
        m_print.error("B4W Error: unsupported diffuse shader: " +
            material["diffuse_shader"] + " (material \"" +
            material["name"] + "\")");
        batch.diffuse_params[0] = 0.0;
        batch.diffuse_params[1] = 0.0;
        break;
    }
}

function update_batch_material_nodes(batch, material) {
    if (!material["use_nodes"] || material["b4w_do_not_render"])
        return false;

    var node_tree = material["node_tree"];

    var nmat_graph = nodemat.compose_nmat_graph(node_tree, material["uuid"], false);
    if (!nmat_graph) {
        m_print.error("Failed to create node graph for material \"" +
                material["name"] + "\", disable nodes");
        update_batch_material_debug(batch, material);
        return true;
    }

    apply_shader(batch, "nodes.glslv", "nodes.glslf");

    // some common stuff
    var alpha_blend = material["game_settings"]["alpha_blend"];
    set_batch_directive(batch, "ALPHA", (alpha_blend === "OPAQUE") ? 0 : 1);
    set_batch_directive(batch, "ALPHA_CLIP", (alpha_blend === "CLIP") ? 1 : 0);
    set_batch_directive(batch, "DOUBLE_SIDED_LIGHTING",
            (material["b4w_double_sided_lighting"]) ? 1 : 0);

    set_batch_c_attr(batch, "a_position");

    update_batch_game_settings(batch, material);
    batch.offset_z = material["offset_z"];

    var gs = material["game_settings"];
    var alpha_blend = gs["alpha_blend"];
    batch.xray = material["b4w_render_above_all"] && alpha_blend != "OPAQUE"
                    && alpha_blend != "CLIP";

    m_vec4.set(material["diffuse_color"][0], material["diffuse_color"][1],
            material["diffuse_color"][2], material["alpha"],
            batch.diffuse_color);

    batch.emit = material["emit"];
    batch.ambient = material["ambient"];
    update_batch_fresnel_params(batch, material);

    if (material["b4w_wettable"]) {
        set_batch_directive(batch, "WETTABLE", 1);
    } else
        set_batch_directive(batch, "WETTABLE", 0);

    batch.node_elements = nodemat.compose_node_elements(nmat_graph);

    var has_material_nodes = false;
    m_graph.traverse(nmat_graph, function(node, attr) {
        switch (attr.type) {
        case "GEOMETRY_UV":
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
        case "GEOMETRY_NO":
            set_batch_c_attr(batch, "a_normal");
            break;
        case "MATERIAL":
        case "MATERIAL_EXT":
            var mat_data = attr.data.value;
            set_batch_c_attr(batch, "a_normal");
            set_batch_directive(batch, "DIFFUSE_SHADER", "DIFFUSE_" + mat_data.diffuse_shader);
            set_batch_directive(batch, "SPECULAR_SHADER", "SPECULAR_" + mat_data.specular_shader);
            set_batch_directive(batch, "SHADELESS_MAT", mat_data.use_shadeless? 1: 0);
            batch.use_shadeless = mat_data.use_shadeless;
            batch.specular_alpha = mat_data.specular_alpha;
            has_material_nodes = true;
            break;
        case "TEXTURE_COLOR":
        case "TEXTURE_COLOR2":
        case "TEXTURE_COLOR3":
        case "TEXTURE_COLOR4":
        case "TEXTURE_ENVIRONMENT":
            var name = attr.data.name;
            var tex = attr.data.value;

            if (tex._render.allow_node_dds !== false)
                if (attr.type != "TEXTURE_ENVIRONMENT")
                    tex._render.allow_node_dds = true;
                else
                    tex._render.allow_node_dds = false;

            append_texture(batch, tex._render, name);

            break;
        case "TEXTURE_NORMAL":
        case "TEXTURE_NORMAL2":
        case "TEXTURE_NORMAL3":
        case "TEXTURE_NORMAL4":
        case "PARALLAX":
            set_batch_directive(batch, "CALC_TBN_SPACE", 1);
            set_batch_c_attr(batch, "a_normal");
            set_batch_c_attr(batch, "a_tangent");

            var name = attr.data.name;
            var tex = attr.data.value;

            if (tex) {
                tex._render.allow_node_dds = false;
                append_texture(batch, tex._render, name);
            } else
                m_print.error("Missing texture in node ", attr.name, "for material ", material["name"]);

            break;
        case "LAMP":
            if (attr.data)
                batch.lamp_uuid_indexes = attr.data;
            break;
        case "REFRACTION":
            batch.refractive = true;
            break;
        }
    });

    if (!has_material_nodes)
        batch.use_shadeless = true;

    if (cfg_def.glsl_unroll_hack)
        set_batch_directive(batch, "UNROLL_LOOPS", 1);
    else
        set_batch_directive(batch, "UNROLL_LOOPS", 0);

    return true;
}

function update_batch_material_debug(batch, material) {

    apply_shader(batch, "main.glslv", "main.glslf");

    var alpha_blend = material["game_settings"]["alpha_blend"];
    set_batch_directive(batch, "ALPHA", (alpha_blend === "OPAQUE") ? 0 : 1);
    set_batch_directive(batch, "ALPHA_CLIP", (alpha_blend === "CLIP") ? 1 : 0);
    set_batch_directive(batch, "SHADELESS", 1);

    set_batch_c_attr(batch, "a_position");
    set_batch_c_attr(batch, "a_normal");

    m_vec4.set(1, 0, 1, 1, batch.diffuse_color);

    set_batch_directive(batch, "VERTEX_COLOR", 0);

    batch.offset_z = material["offset_z"];

    update_batch_game_settings(batch, material);

    return true;
}

function update_batch_material_depth(batch, material) {

    if (material["name"] === "LENS_FLARES" ||
            material["b4w_water"] ||
            material["b4w_do_not_render"] ||
            material["type"] === "HALO")
        return false;

    update_batch_game_settings(batch, material);

    if (batch.blend)
        return false;

    apply_shader(batch, "depth.glslv", "depth.glslf");
    set_batch_c_attr(batch, "a_position");
    set_batch_c_attr(batch, "a_normal");

    var alpha_blend = material["game_settings"]["alpha_blend"];

    var alpha = (alpha_blend === "OPAQUE") ? 0 : 1;
    set_batch_directive(batch, "ALPHA", alpha);

    //set_batch_directive(batch, "ALPHA_CLIP", alpha_clip);

    batch.texture_scale.set([1, 1, 1]);

    var texture_slots = material["texture_slots"];
    var colormap0 = find_valid_textures("use_map_color_diffuse", true, texture_slots)[0];
    var alpha_clip = (alpha_blend === "CLIP") ? 1 : 0;

    if (colormap0 && alpha_clip) {
        batch.texture_scale.set(colormap0["scale"]);
        set_batch_directive(batch, "TEXTURE_COLOR", 1);
        set_batch_c_attr(batch, "a_texcoord");

        if (colormap0["texture"]._render.source == "IMAGE" ||
                colormap0["texture"]._render.source == "ENVIRONMENT_MAP") {
            var tex = get_batch_texture(colormap0);
            append_texture(batch, tex, "u_colormap0");
        }

        // for texture rendering
        if (colormap0["texture"]._render.source == "NONE") {
            var tex = get_batch_texture(colormap0);
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
    if (material["name"] === "LENS_FLARES" ||
            material["b4w_do_not_render"] ||
            material["type"] === "HALO")
        return false;

    update_batch_game_settings(batch, material);

    batch.zsort_type = geometry.ZSORT_DISABLED;
    //batch.zsort_type = geometry.ZSORT_FRONT_TO_BACK;

    batch.depth_mask = true;

    // blend allowed but rendered as non-blend
    batch.blend = false;

    var gs = material["game_settings"];
    var alpha_blend = gs["alpha_blend"];
    batch.xray = material["b4w_render_above_all"] && alpha_blend != "OPAQUE"
                    && alpha_blend != "CLIP";

    apply_shader(batch, "color_id.glslv", "color_id.glslf");
    set_batch_c_attr(batch, "a_position");

    var alpha_blend = material["game_settings"]["alpha_blend"];

    var alpha = (alpha_blend === "OPAQUE") ? 0 : 1;
    set_batch_directive(batch, "ALPHA", alpha);

    batch.texture_scale.set([1, 1, 1]);

    var texture_slots = material["texture_slots"];
    var colormap0 = find_valid_textures("use_map_color_diffuse", true, texture_slots)[0];

    var alpha_clip = (alpha_blend === "CLIP") ? 1 : 0;

    if (colormap0 && alpha_clip) {
        batch.texture_scale.set(colormap0["scale"]);
        set_batch_directive(batch, "TEXTURE_COLOR", 1);
        set_batch_c_attr(batch, "a_texcoord");

        if (colormap0["texture"]._render.source == "IMAGE" ||
                colormap0["texture"]._render.source == "ENVIRONMENT_MAP") {
            var tex = get_batch_texture(colormap0);
            append_texture(batch, tex, "u_colormap0");
        }

        // for texture rendering
        if (colormap0["texture"]._render.source == "NONE") {
            var tex = get_batch_texture(colormap0);
            append_texture(batch, tex, "u_colormap0");
        }
    } else
        set_batch_directive(batch, "TEXTURE_COLOR", 0);

    return true;
}

function update_batch_material_wireframe(batch, material) {
    if (material["name"] === "LENS_FLARES" ||
            material["b4w_water"] ||
            material["b4w_do_not_render"] ||
            material["type"] === "HALO")
        return false;

    apply_shader(batch, "wireframe.glslv", "wireframe.glslf");
    set_batch_c_attr(batch, "a_position");
    set_batch_c_attr(batch, "a_normal");
    set_batch_c_attr(batch, "a_polyindex");

    batch.depth_mask = true;

    batch.wireframe_mode = 0;
    batch.wireframe_edge_color = [0, 0, 0];

    if (cfg_def.glsl_unroll_hack)
        set_batch_directive(batch, "UNROLL_LOOPS", 1);
    else
        set_batch_directive(batch, "UNROLL_LOOPS", 0);

    return true;
}

function update_batch_material_grass_map(batch, material) {
    if (!material["b4w_terrain"] || material["b4w_do_not_render"])
        return false;

    update_batch_game_settings(batch, material);
    // override some gs
    batch.blend = false;
    batch.zsort_type = geometry.ZSORT_DISABLED;
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

    if (cfg_def.glsl_unroll_hack)
        set_batch_directive(batch, "UNROLL_LOOPS", 1);
    else
        set_batch_directive(batch, "UNROLL_LOOPS", 0);

    return true;
}

function update_batch_material_particles(batch, material) {
    if (material["b4w_do_not_render"])
        return false;

    var texture_slots = material["texture_slots"];

    if (batch.halo_particles)
        apply_shader(batch, "particles_color.glslv", "particles_color.glslf");
    else {

        apply_shader(batch, "particles_texture.glslv", "particles_texture.glslf");
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

            var tex = get_batch_texture(colormap);
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
    set_batch_c_attr(batch, "a_normal");

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

    if (cfg_def.glsl_unroll_hack)
        set_batch_directive(batch, "UNROLL_LOOPS", 1);
    else
        set_batch_directive(batch, "UNROLL_LOOPS", 0);

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
            set_batch_directive(batch, "AU_QUALIFIER", "attribute");
        else
            set_batch_directive(batch, "AU_QUALIFIER", "uniform");
        set_batch_directive(batch, "STATIC_BATCH", 0);
    } else {
        set_batch_directive(batch, "AU_QUALIFIER", "attribute");
        set_batch_directive(batch, "STATIC_BATCH", 1);
    }

    if (batch.type == "WIREFRAME") {
        if (extensions.get_standard_derivatives())
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
                set_batch_c_attr(batch, "a_normal");

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

    batch.dynamic_geometry = render.dynamic_geometry;
    batch.shadow_cast = render.shadow_cast;
    batch.shadow_cast_only = render.shadow_cast_only;
    batch.shadow_receive = render.shadow_receive && !batch.use_shadeless &&
        !(batch.blend && cfg_def.disable_blend_shadows_hack);

    batch.reflexible = render.reflexible;
    batch.reflexible_only = render.reflexible_only;
    batch.reflective = render.reflective;

    if (render.is_skinning) {
        set_batch_c_attr(batch, "a_influence");
        set_batch_directive(batch, "SKINNED", 1);

        if (render.frames_blending)
            set_batch_directive(batch, "FRAMES_BLENDING", 1);
        else
            set_batch_directive(batch, "FRAMES_BLENDING", 0);

        set_batch_directive(batch, "MAX_BONES", render.max_bones);
    } else {
        set_batch_directive(batch, "SKINNED", 0);
        set_batch_directive(batch, "FRAMES_BLENDING", 0);
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
        throw "Skinning and vertex animation are mutually exlusive";

    if (render.disable_fogging)
        set_batch_directive(batch, "DISABLE_FOG", 1);
    else
        set_batch_directive(batch, "DISABLE_FOG", 0);

    if (render.bone_pointers)
        batch.bone_pointers = render.bone_pointers;

    if (render.mats_anim_values && batch.type == "NODES") {

        var nmat_graph = batch.node_elements;
        var mats_anim_inds = render.mats_anim_inds;

        for (var i = 0; i < nmat_graph.length; i++) {
            var node = nmat_graph[i];
            switch (node.id) {
            case "ANIM_VALUE":

                var ind = node.param_values[1];

                for (var j = 0; j < mats_anim_inds.length; j+=2) {
                    if (mats_anim_inds[j] == ind) {
                        node.param_values[0] = mats_anim_inds[j+1];
                        break;
                    }
                }
                break;
            default:
                break;
            }
        }
        set_batch_directive(batch, "NUM_ANIM_VALUES", render.mats_anim_values.length);
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

/**
 * Assign directives for shadow receive batch.
 * @param {Object} batch Target batch
 * @param {Object} shadow_params Shadow parameters for batch
 */
exports.assign_shadow_receive_dirs = function(batch, shadow_params) {
    set_batch_directive(batch, "CSM_SECTION0", 0);
    set_batch_directive(batch, "CSM_SECTION1", 0);
    set_batch_directive(batch, "CSM_SECTION2", 0);
    set_batch_directive(batch, "CSM_SECTION3", 0);

    for (var i = 0; i < shadow_params.csm_num; i++)
        set_batch_directive(batch, "CSM_SECTION" + String(i), 1);

    set_batch_directive(batch, "SHADOW_TEX_RES", m_shaders.glsl_value(
            shadow_params.csm_resolution));
    set_batch_directive(batch, "CSM_FADE_LAST_CASCADE",
            shadow_params.fade_last_cascade ? 1 : 0);
    set_batch_directive(batch, "CSM_BLEND_BETWEEN_CASCADES",
            shadow_params.blend_between_cascades ? 1 : 0);
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
 * Return vertex anim locations arrays or null
 * TODO: implement averaging for vertex anim
 */
function prepare_vertex_anim_locations(obj) {

    var render = obj._render;

    if (!render.vertex_anim)
        return null;

    // compose anim_locs frames from all animations

    if (obj["data"]["b4w_vertex_anim"].length)
        var va = obj["data"]["b4w_vertex_anim"];
    else
        var va = [];

    var anim_locs = [];

    for (var i = 0; i < va.length; i++) {

        var frames = va[i]["frames"];
        var flen = frames.length;

        var av_int_start = Math.max(0, flen - va[i]["averaging_interval"]);

        for (var j = 0; j < flen; j++) {

            var frame = frames[j];

            if (va[i]["averaging"] && va[i]["averaging_interval"] > 1
                    && j >= av_int_start) {

                // mix coefficient, quadratic averaging
                var a = (j - av_int_start) / (flen - 1 - av_int_start);
                a *= a;

                for (var k = 0; k < frame.length; k++)
                    frame[k] = (1 - a) * frame[k] +
                            a * frames[frames.length - j - 1][k];
            }

            anim_locs.push(frame);
        }
    }

    return anim_locs;
}

/**
 * Update batch geometry from submesh
 */
function update_batch_geometry(batch, submesh) {
    if (batch.type == "PHYSICS") {
        batch.submesh = submesh;
        return;
    }

    var zsort_type = batch.zsort_type;
    var draw_mode = batch.draw_mode;

    if (batch.halo)
        var submesh = geometry.extract_halo_submesh(submesh);

    if (batch.water_generated_mesh) {
        var num_cascads   = batch.water_num_cascads;
        var subdivs       = batch.water_subdivs;
        var detailed_dist = batch.water_detailed_dist;
        var submesh = primitives.generate_multigrid(num_cascads,
                                                    subdivs, detailed_dist);
    }

    var bufs_data = geometry.submesh_to_bufs_data(submesh, zsort_type,
            draw_mode, batch.vertex_colors_usage);
    // remove unneeded arrays to save memory, keep them only for z-sorted
    // geometry and dynamic particles
    if (!(DEBUG_KEEP_BUFS_DATA_ARRAYS || batch.dynamic_geometry ||
            bufs_data.info_for_z_sort_updates)) {
        bufs_data.ibo_array = null;
        bufs_data.vbo_array = null;
    }
    batch.bufs_data = bufs_data;

    var frames = submesh.va_frames.length;

    batch.num_vertices = submesh.base_length * frames;

    // NOTE: only triangle batches counted
    if (is_triangle_batch(batch)) {
        if (geometry.is_indexed(submesh))
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
    case geometry.DM_DEFAULT:
    case geometry.DM_TRIANGLES:
    case geometry.DM_DYNAMIC_TRIANGLES:
        return true;
    default:
        return false;
    }
}

/**
 * Update batch from EMITTER particle system/settings
 */
function update_batch_particles_emitter(batch, psystem) {
    switch(psystem["settings"]["b4w_billboard_align"]) {
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
        throw "Wrong billboard align value";
        break;
    }
    // NOTE: disable standard billboarding
    set_batch_directive(batch, "BILLBOARD", 0);
}

/**
 * Create all possible batch slots for object and clone it by ptrans array
 */
function make_hair_particles_metabatches(em_obj, render, em_batch, em_submesh, objs,
        batch_types_arr, objs_ptrans, pset, psys, use_grass_map, seed,
        reset_seed) {

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

    for (var i = 0; i < objs.length; i++) {
        var obj = objs[i];

        // NOTE: partially override emitter's render
        var hair_render = util.clone_object_nr(render);

        // NOTE: override object billboard properties, use properties from
        // particle system
        hair_render.billboard = pset["b4w_hair_billboard"];
        hair_render.billboard_type = pset["b4w_hair_billboard_type"];
        hair_render.billboard_spherical =
                pset["b4w_hair_billboard_geometry"] == "SPHERICAL";

        hair_render.dynamic_grass = dyn_grass;
        hair_render.is_hair_particles = true;
        hair_render.mats_anim_values = obj._render.mats_anim_values;
        hair_render.mats_anim_inds = obj._render.mats_anim_inds;

        if (inst_inherit_bend) {
            hair_render.wind_bending = obj._render.wind_bending;
            hair_render.wind_bending_angle = obj._render.wind_bending_angle;
            hair_render.wind_bending_freq = obj._render.wind_bending_freq;
            hair_render.detail_bending_freq = obj._render.detail_bending_freq;
            hair_render.main_bend_col = obj._render.main_bend_col;
            hair_render.detail_bending_amp = obj._render.detail_bending_amp;
            hair_render.branch_bending_amp = obj._render.branch_bending_amp;
            hair_render.wind_bending_amp = obj._render.wind_bending_amp;
            // by link, doesn't matter
            hair_render.detail_bend_col = obj._render.detail_bend_col;
            hair_render.bend_center_only = false;
        } else {
            hair_render.wind_bending = em_obj._render.wind_bending;
            hair_render.wind_bending_angle = em_obj._render.wind_bending_angle;
            hair_render.wind_bending_freq = em_obj._render.wind_bending_freq;
            hair_render.detail_bending_freq = em_obj._render.detail_bending_freq;
            hair_render.main_bend_col = em_obj._render.main_bend_col;
            hair_render.detail_bending_amp = em_obj._render.detail_bending_amp;
            hair_render.branch_bending_amp = em_obj._render.branch_bending_amp;
            hair_render.wind_bending_amp = em_obj._render.wind_bending_amp;
            // by link, doesn't matter
            hair_render.detail_bend_col = em_obj._render.detail_bend_col;
            hair_render.bend_center_only = true;
        }

        if (inst_inherit_shadow) {
            hair_render.shadow_cast = obj._render.shadow_cast;
            hair_render.shadow_cast_only = obj._render.shadow_cast_only;
            hair_render.shadow_receive = obj._render.shadow_receive;
        } else {
            hair_render.shadow_cast = em_obj._render.shadow_cast;
            hair_render.shadow_cast_only = em_obj._render.shadow_cast_only;
            hair_render.shadow_receive = em_obj._render.shadow_receive;
        }

        if (inst_inherit_reflection) {
            hair_render.reflexible = obj._render.reflexible;
            hair_render.reflexible_only = obj._render.reflexible_only;
            hair_render.reflective = obj._render.reflective;
        } else {
            hair_render.reflexible = em_obj._render.reflexible;
            hair_render.reflexible_only = em_obj._render.reflexible_only;
            hair_render.reflective = em_obj._render.reflective;
        }

        objs_hair_render.push(hair_render);

        var ptrans = objs_ptrans[i];
        if (!ptrans)
            ptrans = new Float32Array();

        if (reset_seed)
            util.init_rand_r_seed(psys["seed"], seed);

        var trans = new Float32Array(3);
        var quat = new Float32Array([0, 0, 0, 1]);
        var tsr_array = [];

        for (var j = 0; j < ptrans.length; j+=4) {
            trans[0] = ptrans[j];
            trans[1] = ptrans[j+1];
            trans[2] = ptrans[j+2];
            var scale = ptrans[j+3];

            if (pset["b4w_initial_rand_rotation"]) {
                switch (pset["b4w_rotation_type"]) {
                case "XYZ":
                    var axis = new Float32Array([util.rand_r(seed),
                            util.rand_r(seed), util.rand_r(seed)]);
                    m_vec3.normalize(axis, axis);
                    break;
                case "Z":
                    var axis = new Float32Array([0, 1, 0]);
                    break;
                default:
                    throw "Unsupported random rotation type: "
                             + pset["b4w_rotation_type"];
                    break;
                }
                var strength = pset["b4w_rand_rotation_strength"];
                m_quat.setAxisAngle(axis, strength * (2 * Math.PI
                        * util.rand_r(seed) - Math.PI), quat);
            }

            var tsr = m_tsr.create_sep(trans, scale, quat);

            // in object space
            tsr_array.push(tsr);
        }
        objs_tsr_array.push(tsr_array);
    }

    // spatial tree object for searching nearest emitter vertices
    // will be calculated only once
    var spatial_tree = {};
    for (var i = 0; i < objs.length; i++) {
        var btypes = batch_types_arr[i];
        var hair_render = objs_hair_render[i];
        var hair_render_id = util.calc_variable_id(hair_render, 0);
        var tsr_array = objs_tsr_array[i];
        var obj = objs[i];

        if (!tsr_array.length)
            continue

        var mesh = objs[i]["data"]
        var materials = mesh["materials"];

        for (var j = 0; j < materials.length; j++) {
            if (geometry.has_empty_submesh(mesh, j))
                continue;

            for (var k = 0; k < btypes.length; k++) {
                var type = btypes[k];
                if (type === "COLOR_ID")
                    continue;

                var batch = init_batch(type);
                var material = materials[j];
                if (!update_batch_material(batch, material, true))
                    continue;
                batch.draw_mode = mesh.draw_mode || geometry.DM_DEFAULT;
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

                var src_submesh = geometry.extract_submesh(mesh, j,
                        batch.common_attributes, batch.bone_pointers,
                        batch.vertex_colors_usage, batch.uv_maps_usage);

                var params = [];

                if (hair_render.wind_bending || hair_render.dynamic_grass
                        || hair_render.billboard) {
                    params["au_wind_bending_amp"] = [hair_render.wind_bending_amp];

                    params["au_wind_bending_freq"] = [hair_render.wind_bending_freq];
                    params["au_detail_bending_freq"] = [hair_render.detail_bending_freq];
                    params["au_detail_bending_amp"] = [hair_render.detail_bending_amp];
                    params["au_branch_bending_amp"] = [hair_render.branch_bending_amp];
                }

                var submesh = geometry.make_clone_submesh(src_submesh, params,
                        tsr_array);
                submesh = fill_submesh_center_pos(submesh, tsr_array);
                if (hair_render.bend_center_only)
                    submesh = fill_submesh_emitter_center(submesh,
                            em_obj._render.world_matrix);

                var particle_inherited_attrs = get_particle_inherited_attrs(
                        pset["b4w_vcol_from_name"], pset["b4w_vcol_to_name"],
                        batch, em_batch, !inst_inherit_bend, mesh);
                submesh = make_particle_inherited_vcols(submesh, tsr_array,
                        em_obj._render.bb_local, em_submesh, particle_inherited_attrs,
                        batch.vertex_colors_usage, spatial_tree);

                metabatches.push({
                    batch: batch,
                    submesh: submesh,
                    mat_names: [material["name"]],
                    render: hair_render,
                    rel_objects: [em_obj]
                })
            }
        }
    }

    return metabatches;
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

        var num_x = util.trunc((x - spatial_tree.base_point[0]) / spatial_tree.cell_size[0]);
        var num_y = util.trunc((y - spatial_tree.base_point[1]) / spatial_tree.cell_size[1]);
        var num_z = util.trunc((z - spatial_tree.base_point[2]) / spatial_tree.cell_size[2]);

        num_x = util.clamp(num_x, 0, STREE_CELL_COUNT - 1)
        num_y = util.clamp(num_y, 0, STREE_CELL_COUNT - 1)
        num_z = util.clamp(num_z, 0, STREE_CELL_COUNT - 1)

        spatial_tree.verts_indices[i] = i;
        spatial_tree.octs_indices[i] = num_z * Math.pow(STREE_CELL_COUNT, 2)
                + num_y * STREE_CELL_COUNT + num_x;
    }

    geometry.sort_two_arrays(spatial_tree.octs_indices,
            spatial_tree.verts_indices, true);

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


function get_particle_inherited_attrs(vc_name_from, vc_name_to, batch, em_batch,
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
            if (geometry.has_attr(batch.common_attributes, "a_color"))
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
        if ("a_bending_col_main" in em_batch.vertex_colors_usage)
            inherited_attrs.push({
                emitter_attr: "a_bending_col_main",
                emitter_mask: 4,
                particle_attr: "a_bending_col_main",
                particle_mask: 4,
                dst_channel_offset: 0
            });
        if ("a_bending_col_detail" in em_batch.vertex_colors_usage)
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
            dst_channel_offset += util.rgb_mask_get_channels_count(mask);
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

function fill_submesh_emitter_center(submesh, em_world_matrix) {
    submesh.va_common["a_emitter_center"] = new Float32Array(submesh.base_length * 3);
    var origin = m_vec4.fromValues(0, 0, 0, 1);
    m_vec4.transformMat4(origin, em_world_matrix, origin);

    for (var i = 0; i < submesh.base_length; i++) {
        submesh.va_common["a_emitter_center"][i * 3] = origin[0];
        submesh.va_common["a_emitter_center"][i * 3 + 1] = origin[1];
        submesh.va_common["a_emitter_center"][i * 3 + 2] = origin[2];
    }

    return submesh;
}

function make_particle_inherited_vcols(submesh, transforms, em_bb_local,
        em_submesh, inherited_attrs, vc_usage, spatial_tree) {

    var calc_nearest = false;
    for (var i = 0; i < inherited_attrs.length; i++) {
        var em_attr = inherited_attrs[i].emitter_attr;
        var cols = em_submesh.va_common[em_attr];
        if (cols && cols.length > 0) {
            calc_nearest = true;
            break;
        }
    }

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
                    p_attr_channels_total += util.rgb_mask_get_channels_count(
                            vc_usage[p_attr].src[j].mask);
                break;
            }

            if (cols && cols.length > 0) {
                var emitter_comp_count = util.rgb_mask_get_channels_count(em_mask);
                var particle_comp_count = util.rgb_mask_get_channels_count(p_mask);

                var mask_from = em_mask & p_mask;
                var channel_presence_from = util.rgb_mask_get_channels_presence(mask_from);
                if (mask_from != p_mask)
                    m_print.error("Wrong color extraction from "
                        + em_attr + " to " + p_attr + ".");

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
                                    var em_channel_offset = util.rgb_mask_get_channel_presence_index(em_mask, l);
                                    var p_channel_offset = inherited_attrs[i].dst_channel_offset
                                            + util.rgb_mask_get_channel_presence_index(p_mask, l);
                                    submesh.va_common[p_attr][p_offset
                                            + p_vert_offset + p_channel_offset]
                                            = cols[em_vert_offset + em_channel_offset];
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
        var num_x = util.trunc((particle_cen[0]
                - spatial_tree.base_point[0]) / spatial_tree.cell_size[0]);
        var num_y = util.trunc((particle_cen[1]
                - spatial_tree.base_point[1]) / spatial_tree.cell_size[1]);
        var num_z = util.trunc((particle_cen[2]
                - spatial_tree.base_point[2]) / spatial_tree.cell_size[2]);

        num_x = util.clamp(num_x, 0, STREE_CELL_COUNT - 1)
        num_y = util.clamp(num_y, 0, STREE_CELL_COUNT - 1)
        num_z = util.clamp(num_z, 0, STREE_CELL_COUNT - 1)

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
function distribute_ptrans_equally(ptrans, dupli_objects, seed) {

    var objs_count = dupli_objects.length;
    var ptrans_dist = {};

    for (var i = 0; i < ptrans.length; i+=4) {
        var index = Math.floor(objs_count * util.rand_r(seed));
        var robj_name = dupli_objects[index]["name"];

        ptrans_dist[index] = ptrans_dist[index] || [];
        ptrans_dist[index].push(ptrans[i], ptrans[i+1], ptrans[i+2], ptrans[i+3]);
    }

    for (var index in ptrans_dist)
        ptrans_dist[index] = new Float32Array(ptrans_dist[index]);

    return ptrans_dist;
}

function distribute_ptrans_group(ptrans, dupli_objects) {
    var ptrans_dist = {};

    for (var i = 0; i < ptrans.length; i+=4) {
        for (var j = 0; j < dupli_objects.length; j++) {
            var obj_name = dupli_objects[j]["name"];

            var obj_trans = m_vec3.create();
            m_vec3.scale(dupli_objects[j]._render.trans, dupli_objects[j]._render.scale, obj_trans);

            var res_trans = m_vec3.clone([ptrans[i], ptrans[i+1], ptrans[i+2]]);
            m_vec3.add(res_trans, obj_trans, res_trans);

            if (!ptrans_dist[j])
                ptrans_dist[j] = new Float32Array(ptrans.length);

            ptrans_dist[j][i] = res_trans[0];
            ptrans_dist[j][i + 1] = res_trans[1];
            ptrans_dist[j][i + 2] = res_trans[2];
            ptrans_dist[j][i + 3] = ptrans[i + 3];
        }
    }

    return ptrans_dist;
}

function distribute_ptrans_by_dupli_weights(ptrans, dupli_objects,
        dupli_weights, seed) {

    var ptrans_dist = {};

    function rand_obj_index_by_weights(dupli_weights) {

        var weight_sum_array = [0];
        for (var i = 0; i < dupli_weights.length; i++) {
            var weight = dupli_weights[i];
            weight_sum_array[i+1] = weight_sum_array[i] + weight["count"];
        }

        var last = weight_sum_array[weight_sum_array.length-1];
        var weight_sum_rand = last * util.rand_r(seed);
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
        //return weight_name.split(": ")[0];
    }

    var dupli_weights_sorted = [];

    for (var i = 0; i < dupli_objects.length; i++) {
        var dg_obj = dupli_objects[i];
        var name = dg_obj["origin_name"] || dg_obj["name"];

        for (var j = 0; j < dupli_weights.length; j++) {
            var weight = dupli_weights[j];
            if (name == weight["name"].split(": ")[0])
                dupli_weights_sorted.push(weight);
        }
    }

    if (dupli_weights.length != dupli_weights_sorted.length)
        m_print.error("B4W Error: dupli weights match failed");

    for (var i = 0; i < ptrans.length; i+=4) {
        var index = rand_obj_index_by_weights(dupli_weights_sorted);
        ptrans_dist[index] = ptrans_dist[index] || [];
        ptrans_dist[index].push(ptrans[i], ptrans[i+1], ptrans[i+2], ptrans[i+3]);
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
function create_object_clusters(batch_objects, grid_size) {

    var clusters = [];

    var cluster_ids = {};

    for (var i = 0; i < batch_objects.length; i++) {
        var bobj = batch_objects[i];
        var bobj_render = bobj._render;

        // bounding box
        var bb_local = bb_bpy_to_b4w(bobj["data"]["b4w_bounding_box"]);
        var bb_world = boundings.bounding_box_transform(bb_local,
                bobj_render.world_matrix);

        // bounding sphere
        var bs_local = boundings.create_bounding_sphere(
                bobj["data"]["b4w_bounding_sphere_radius"],
                bobj["data"]["b4w_bounding_sphere_center"]);
        var bs_world = boundings.bounding_sphere_transform(bs_local,
                bobj_render.world_matrix);

        // bounding ellipsoid
        var be_axes = bobj["data"]["b4w_bounding_ellipsoid_axes"];
        var be_local = boundings.create_bounding_ellipsoid(
                [be_axes[0], 0, 0], [0, be_axes[1], 0], [0, 0, be_axes[2]],
                bobj["data"]["b4w_bounding_ellipsoid_center"]);

        var be_world = boundings.bounding_ellipsoid_transform(be_local,
                bobj_render.tsr);

        bobj_render.bb_local = bb_local;
        bobj_render.bb_world = bb_world;
        bobj_render.bs_local = bs_local;
        bobj_render.bs_world = bs_world;
        bobj_render.be_local = be_local;
        bobj_render.be_world = be_world;

        // this params will divide batches
        var render_props = {};
        render_props.shadow_cast = bobj_render.shadow_cast;
        render_props.shadow_cast_only = bobj_render.shadow_cast_only;
        render_props.shadow_receive = bobj_render.shadow_receive;

        render_props.selectable = bobj_render.selectable;
        render_props.origin_selectable = bobj_render.origin_selectable;
        render_props.glow_anim_settings = bobj_render.glow_anim_settings;

        render_props.reflexible = bobj_render.reflexible;
        render_props.reflexible_only = bobj_render.reflexible_only;
        render_props.reflective = bobj_render.reflective;
        render_props.caustics = bobj_render.caustics;

        render_props.wind_bending = bobj_render.wind_bending;
        render_props.main_bend_col = bobj_render.main_bend_col;
        // by link, doesn't matter
        render_props.detail_bend_col = bobj_render.detail_bend_col;

        render_props.billboard = bobj_render.billboard;
        render_props.billboard_type = bobj_render.billboard_type;

        render_props.dynamic_grass = bobj_render.dynamic_grass;
        render_props.do_not_cull = bobj_render.do_not_cull;
        render_props.disable_fogging = bobj_render.disable_fogging;

        // always false for static batches
        render_props.dynamic_geometry = bobj_render.dynamic_geometry;

        render_props.grid_id = calc_grid_id(grid_size, bobj_render.bs_world.center);

        render_props.lod_dist_max = bobj_render.lod_dist_max;
        render_props.lod_dist_min = bobj_render.lod_dist_min;
        render_props.lod_transition_ratio = bobj_render.lod_transition_ratio;

        var id = JSON.stringify(render_props);
        cluster_ids[id] = cluster_ids[id] || [];
        cluster_ids[id].push(bobj);
    }

    for (var key in cluster_ids) {

        var render_props = JSON.parse(key);
        var objects = cluster_ids[key];

        var render = m_obj.create_render("STATIC");
        for (var prop in render_props)
            render[prop] = render_props[prop];

        // NOTE: assign data_id property to differ batches while adding same
        // objects to subscenes (secondary loading case)
        render.data_id = batch_objects[0]._render.data_id;

        render.wind_bending_amp = 0;
        render.wind_bending_freq = 0;
        render.detail_bending_freq = 0;
        render.detail_bending_amp = 0;
        render.branch_bending_amp = 0;
        render.hide = false;

        // calculate bounding box/sphere
        for (var i = 0; i < objects.length; i++) {
            var obj = objects[i];

            // do not expand for first object
            if (i == 0) {
                render.bb_world = util.clone_object_r(obj._render.bb_world);
                render.bs_world = util.clone_object_r(obj._render.bs_world);
                render.be_local = util.clone_object_r(obj._render.be_local);
                render.be_world = util.clone_object_r(obj._render.be_world);
            } else {
                boundings.expand_bounding_box(render.bb_world, obj._render.bb_world);
                boundings.expand_bounding_sphere(render.bs_world, obj._render.bs_world);
                // TODO: add bounding ellipsoid expand
            }
        }

        // same as world because initial batch has identity tranform
        render.bb_local = util.clone_object_r(render.bb_world);
        render.bs_local = util.clone_object_r(render.bs_world);

        var cluster = {render: render, objects: objects};
        clusters.push(cluster);
    }

    return clusters;
}
/**
 * grid id - [cell_num_x, cell_num_z]
 */
function calc_grid_id(grid_size, position) {
    if (grid_size == 0)
        return [0, 0];

    var id_x = Math.floor(position[0] / grid_size);
    var id_z = Math.floor(position[2] / grid_size);

    return [id_x, id_z];
}

function tsr_from_render(render) {
    return m_tsr.create_sep(render.trans, render.scale, render.quat);
}

function update_batch_id(batch, render_id) {
    // NOTE: remove some properties to avoid circular structure
    var offscreen_scenes = null;
    var canvas_context = null;
    var video_elements = null;
    for (var i = 0; i < batch.textures.length; i++) {
        var scene = batch.textures[i].offscreen_scene;
        if (scene) {
            if (!offscreen_scenes)
                offscreen_scenes = {};
            offscreen_scenes[i] = scene;
            batch.textures[i].offscreen_scene = null;
        }
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
    batch.id = util.calc_variable_id(batch, render_id);

    // return removed properties
    if (offscreen_scenes)
        for (var i in offscreen_scenes)
            batch.textures[i].offscreen_scene = offscreen_scenes[i];
    if (canvas_context)
        for (var j in canvas_context)
            batch.textures[j].canvas_context = canvas_context[j];
    if (video_elements)
        for (var j in video_elements)
            batch.textures[j].video_file = video_elements[j];
}

/**
 * Create special batch for bounding ellipsoid debug rendering
 */
function create_bounding_ellipsoid_batch(bv, render, obj_name, ellipsoid,
        is_dynamic) {

    var batch = init_batch("WIREFRAME");

    apply_shader(batch, "wireframe.glslv", "wireframe.glslf");

    batch.wireframe_mode = 0;
    batch.debug_sphere = true;

    batch.depth_mask = true;
    batch.odd_id_prop = obj_name;

    if (is_dynamic)
        batch.debug_sphere_dynamic = true;

    update_batch_render(batch, render);
    update_batch_id(batch, util.calc_variable_id(render, 0));

    if (ellipsoid) {
        var submesh = primitives.generate_uv_sphere(16, 8, 1, bv.center,
                                                    false, false);
        var scale = [bv.axis_x[0], bv.axis_y[1], bv.axis_z[2]];
        geometry.scale_submesh_xyz(submesh, scale, bv.center)
    } else
        var submesh = primitives.generate_uv_sphere(16, 8, bv.radius, bv.center,
                                                    false, false);
    geometry.submesh_drop_indices(submesh, 1, true);
    submesh.va_common["a_polyindex"] = geometry.extract_polyindices(submesh);
    update_batch_geometry(batch, submesh);

    return batch;
}

function apply_shader(batch, vert, frag) {
    batch.shaders_info = {
        vert: vert,
        frag: frag,
        directives: []
    }

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

    batch.draw_mode = geometry.DM_TRIANGLES;

    update_batch_geometry(batch, submesh);

    apply_shader(batch, "main.glslv", "main.glslf");
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
        throw "No shaders info for batch " + batch.name;

    batch.shader = m_shaders.get_compiled_shader(batch.shaders_info,
                                               batch.node_elements);
    m_render.assign_uniform_setters(batch.shader);
    m_render.assign_attribute_setters(batch);
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

/**
 * Create shadow batch based on depth batch
 */
exports.create_shadow_batch_form_depth = function(batch_src, shadow_src,
        shadow_dst) {

    var batch = init_batch("DEPTH");

    batch.use_backface_culling = batch_src.use_backface_culling;

    batch.texture_scale.set(batch_src.texture_scale);

    batch.dynamic_grass = batch_src.dynamic_grass;

    //batch.diffuse_color.set(batch_src.diffuse_color);

    // NOTE: buffers by link
    batch.bufs_data = batch_src.bufs_data;

    // NOTE: for proper batch culling (see is_have_batch())
    batch.id = batch_src.id;
    batch.render_id = batch_src.render_id;

    // NOTE: possible single sampler required
    if (batch_src.textures.length) {
        batch.textures[0] = batch_src.textures[0];
        batch.texture_names[0] = batch_src.texture_names[0];
    }

    batch.common_attributes = batch_src.common_attributes;
    batch.jitter_amp = batch_src.jitter_amp;
    batch.jitter_freq = batch_src.jitter_freq;
    batch.grass_scale_threshold = batch_src.grass_scale_threshold;

    // NOTE: properties for debugging
    batch.num_triangles = batch_src.num_triangles;
    batch.num_vertices = batch_src.num_vertices;
    batch.odd_id_prop = batch_src.odd_id_prop;

    // NOTE: property for searching material by batch
    for (var i = 0; i < batch_src.material_names.length; i++)
        batch.material_names.push(batch_src.material_names[i]);

    // NOTE: property for update particle systems by batch
    batch.particle_system = batch_src.particle_system;

    // NOTE: access to forked batches from source batch for material inheritance
    if (!batch_src.childs)
        batch_src.childs = [];
    batch_src.childs.push(batch);

    apply_shader(batch, "depth.glslv", "depth.glslf");

    var shaders_info = batch.shaders_info;
    m_shaders.inherit_directives(shaders_info, batch_src.shaders_info);
    batch = update_batch_shadow_src_dst(batch, shadow_src, shadow_dst);

    return batch;
}

exports.update_batch_shadow_src_dst = update_batch_shadow_src_dst;
function update_batch_shadow_src_dst(batch, shadow_src, shadow_dst) {
    var shaders_info = batch.shaders_info;
    m_shaders.set_directive(shaders_info, "SHADOW_SRC", shadow_src);
    m_shaders.set_directive(shaders_info, "SHADOW_DST", shadow_dst);

    // optimization: will be updated later
    //update_shader(batch);

    return batch;
}

exports.create_depth_pack_batch = function(tex) {

    var batch = init_batch("DEPTH_PACK");

    batch.use_backface_culling = true;
    batch.depth_mask = false;

    var submesh = primitives.generate_billboard();
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

    switch(post_effect) {
    case "NONE":
        set_batch_directive(batch, "POST_EFFECT", "POST_EFFECT_NONE");
        batch.texel_mask[0] = 1;
        batch.texel_mask[1] = 1;
        break;
    case "GRAYSCALE":
        set_batch_directive(batch, "POST_EFFECT", "POST_EFFECT_GRAYSCALE");
        batch.texel_mask[0] = 1;
        batch.texel_mask[1] = 1;
        break;
    case "X_BLUR":
        set_batch_directive(batch, "POST_EFFECT", "POST_EFFECT_X_BLUR");
        batch.texel_mask[0] = 1;
        batch.texel_mask[1] = 0;
        break;
    case "Y_BLUR":
        set_batch_directive(batch, "POST_EFFECT", "POST_EFFECT_Y_BLUR");
        batch.texel_mask[0] = 0;
        batch.texel_mask[1] = 1;
        break;
    case "X_EXTEND":
        set_batch_directive(batch, "POST_EFFECT", "POST_EFFECT_X_EXTEND");
        batch.texel_mask[0] = 1;
        batch.texel_mask[1] = 0;
        break;
    case "Y_EXTEND":
        set_batch_directive(batch, "POST_EFFECT", "POST_EFFECT_Y_EXTEND");
        batch.texel_mask[0] = 0;
        batch.texel_mask[1] = 1;
        break;
    default:
        throw "Wrong postprocessing effect: " + post_effect;
        break;
    }


    batch.use_backface_culling = true;
    batch.depth_mask = false;

    var submesh = primitives.generate_billboard();
    update_batch_geometry(batch, submesh);

    update_shader(batch);

    return batch;
}

/**
 * @deprecated Unused
 */
exports.create_edge_batch = function(texture) {
    var batch = init_batch("EDGE");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    batch.texel_mask[0] = 1;
    batch.texel_mask[1] = 1;

    var submesh = primitives.generate_billboard();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/edge.glslf");
    update_shader(batch);

    return batch;
}

exports.create_ssao_batch = function(subs) {

    var batch = init_batch("SSAO");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    batch.texel_mask[0] = 1;
    batch.texel_mask[1] = 1;

    var submesh = primitives.generate_billboard();
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

    var tex = get_batch_texture(texture_slot, random_vector_table);
    append_texture(batch, tex, "u_ssao_special_tex");
    update_shader(batch);

    return batch;
}

exports.create_ssao_blur_batch = function(subs) {

    var batch = init_batch("SSAO_BLUR");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    batch.texel_mask[0] = 1;
    batch.texel_mask[1] = 1;

    var submesh = primitives.generate_billboard();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/ssao_blur.glslf");

    set_batch_directive(batch, "SSAO_BLUR_DEPTH", subs.ssao_blur_depth ? 1 : 0);

    update_shader(batch);

    return batch;
}

exports.create_dof_batch = function(subs) {

    var batch = init_batch("DOF");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    batch.texel_mask[0] = 1;
    batch.texel_mask[1] = 1;

    var submesh = primitives.generate_billboard();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/dof.glslf");
    set_batch_directive(batch, "DEPTH_RGBA", 1);
    update_shader(batch);

    return batch;
}

exports.create_glow_batch = function() {

    var batch = init_batch("GLOW");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    batch.texel_mask[0] = 1;
    batch.texel_mask[1] = 1;

    var submesh = primitives.generate_billboard();
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

    batch.texel_mask[0] = 1;
    batch.texel_mask[1] = 1;

    var submesh = primitives.generate_billboard();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/god_rays.glslv",
            "postprocessing/god_rays.glslf");
    set_batch_directive(batch, "DEPTH_RGBA", pack);
    set_batch_directive(batch, "WATER_EFFECTS", water);
    set_batch_directive(batch, "STEPS_PER_PASS", m_shaders.glsl_value(steps, 1));
    update_shader(batch);

    return batch;
}

exports.create_god_rays_combine_batch = function(tex_main, tex_god_rays) {

    var batch = init_batch("GOD_RAYS_COM");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    batch.texel_mask[0] = 1;
    batch.texel_mask[1] = 1;

    var submesh = primitives.generate_billboard();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/god_rays_combine.glslf");
    update_shader(batch);

    return batch;
}

exports.create_sky_batch = function() {

    var batch = init_batch("SKY");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    batch.texel_mask[0] = 1;
    batch.texel_mask[1] = 1;

    var submesh = primitives.generate_cube();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "procedural_skydome.glslv",
            "procedural_skydome.glslf");
    set_batch_directive(batch, "NUM_LIGHTS", 1);
    set_batch_directive(batch, "WATER_EFFECTS", 1);
    update_shader(batch);

    return batch;
}

exports.create_antialiasing_batch = function() {
    var batch = init_batch("ANTIALIASING");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    batch.texel_mask[0] = 1;
    batch.texel_mask[1] = 1;
    batch.texel_size_multiplier = 1 / cfg_def.resolution_factor;

    var submesh = primitives.generate_billboard();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/antialiasing.glslf");

    set_batch_directive(batch, "AA_METHOD", "AA_METHOD_FXAA_QUALITY");

    update_shader(batch);

    return batch;
}

exports.create_smaa_batch = function(type) {
    var batch = init_batch("SMAA");

    var submesh = primitives.generate_billboard();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/smaa.glslv",
            "postprocessing/smaa.glslf");

    set_batch_directive(batch, "AA_METHOD", "AA_METHOD_SMAA_HIGH");
    set_batch_directive(batch, "SMAA_PASS", type);
    set_batch_directive(batch, "SMAA_PREDICATION", 0);

    // NOTE: temoporary disabled T2X mode due to artifacts with blend objects
    set_batch_directive(batch, "SMAA_REPROJECTION", 0);
    //if (m_cfg.context.alpha)
    //    set_batch_directive(batch, "SMAA_REPROJECTION", 0);
    //else
    //    set_batch_directive(batch, "SMAA_REPROJECTION", 1);

    update_shader(batch);

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    batch.texel_mask[0] = 1;
    batch.texel_mask[1] = 1;
    batch.texel_size_multiplier = 1 / cfg_def.resolution_factor;

    return batch;
}

exports.create_lanczos_batch = function(type) {
    var batch = init_batch("LANCZOS");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    batch.texel_size_multiplier = 1 / cfg_def.resolution_factor;

    if (type == "LANCZOS_X") {
        batch.texel_mask[0] = 1;
        batch.texel_mask[1] = 0;
    } else if (type == "LANCZOS_Y") {
        batch.texel_mask[0] = 0;
        batch.texel_mask[1] = 1;
    }

    var submesh = primitives.generate_billboard();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/lanczos.glslf");
    update_shader(batch);

    return batch;
}

exports.create_compositing_batch = function() {
    var batch = init_batch("COMPOSITING");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    batch.texel_mask[0] = 1;
    batch.texel_mask[1] = 1;

    var submesh = primitives.generate_billboard();
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

    var submesh = primitives.generate_billboard();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/motion_blur.glslf");
    set_batch_directive(batch, "BLUR_DECAY_THRESHOLD",
            m_shaders.glsl_value(decay_threshold));
    update_shader(batch);

    return batch;
}

exports.create_anaglyph_batch = function(post_effect) {

    var batch = init_batch("ANAGLYPH");

    batch.use_backface_culling = true;
    batch.depth_mask = false;

    var submesh = primitives.generate_billboard();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/anaglyph.glslf");
    update_shader(batch);

    return batch;
}

exports.create_luminance_batch = function() {

    var batch = init_batch("LUMINANCE");

    batch.depth_mask = false;
    batch.use_backface_culling = true;

    batch.texel_mask[0] = 1;
    batch.texel_mask[1] = 1;

    var submesh = primitives.generate_billboard();
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

    batch.texel_mask[0] = 1;
    batch.texel_mask[1] = 1;

    var submesh = primitives.generate_billboard();
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

    batch.texel_mask[0] = 1;
    batch.texel_mask[1] = 1;

    var submesh = primitives.generate_billboard();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/luminance_trunced.glslv",
            "postprocessing/luminance_trunced.glslf");
    update_shader(batch);

    return batch;
}

exports.create_bloom_blur_batch = function(post_effect) {

    var batch = init_batch("POSTPROCESSING");

    switch(post_effect) {
    case "X_BLUR":
        batch.texel_mask[0] = 1;
        batch.texel_mask[1] = 0;
        break;
    case "Y_BLUR":
        batch.texel_mask[0] = 0;
        batch.texel_mask[1] = 1;
        break;
    default:
        throw "Wrong postprocessing effect for bloom blur: " + post_effect;
        break;
    }

    batch.use_backface_culling = true;
    batch.depth_mask = false;

    var submesh = primitives.generate_billboard();
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

    batch.texel_mask[0] = 1;
    batch.texel_mask[1] = 1;

    var submesh = primitives.generate_billboard();
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

    batch.texel_mask[0] = 1;
    batch.texel_mask[1] = 1;

    var submesh = primitives.generate_billboard();
    update_batch_geometry(batch, submesh);

    apply_shader(batch, "postprocessing/postprocessing.glslv",
            "postprocessing/velocity.glslf");

    update_shader(batch);

    return batch;
}


/**
 * Set batch texel size
 */
exports.set_texel_size = function(batch, size_x, size_y) {

    var mult = batch.texel_size_multiplier;
    batch.texel_size[0] = size_x * batch.texel_mask[0] * mult;
    batch.texel_size[1] = size_y * batch.texel_mask[1] * mult;
}

/**
 * Set batch texel size multiplier.
 * Use set_texel_size() to update shader uniforms
 */
exports.set_texel_size_mult = function(batch, mult) {
    batch.texel_size_multiplier = mult;
}

/**
 * Find batch (with childs as far as possible) by object ID, material name and
 * batch type
 */
exports.find_batch_material = function(obj, mat_name, type) {

    var batches = obj._batches;
    var apt_batch = null;

    for (var j = 0; j < batches.length; j++) {
        var batch = batches[j];

        if (batch.material_names.indexOf(mat_name) > -1)
            if (type && batch.type == type || !type)
                if (batch.childs)
                    return batch;
                else
                    apt_batch = (apt_batch === null) ? batch : apt_batch;
    }

    return apt_batch;
}

/**
 * Delete all GL objects from the batch
 */
exports.clear_batch = function(batch) {

    var textures = batch.textures;

    // NOTE: textures should be deleted only within subscene removing
    for (var i = 0; i < textures.length; i++) {
        var tex = textures[i];
        m_textures.delete_texture(tex.w_texture);
    }

    geometry.cleanup_bufs_data(batch.bufs_data);
}

}
