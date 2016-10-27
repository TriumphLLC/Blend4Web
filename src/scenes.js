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
 * Scene internal API.
 * @name scenes
 * @namespace
 * @exports exports as scenes
 */
b4w.module["__scenes"] = function(exports, require) {

var m_batch      = require("__batch");
var m_bounds     = require("__boundings");
var m_cam        = require("__camera");
var m_cfg        = require("__config");
var m_cont       = require("__container");
var m_debug      = require("__debug");
var m_graph      = require("__graph");
var m_hud        = require("__hud");
var m_input      = require("__input");
var m_mat4       = require("__mat4");
var m_nodemat    = require("__nodemat");
var m_obj        = require("__objects");
var m_obj_util   = require("__obj_util");
var m_phy        = require("__physics");
var m_prerender  = require("__prerender");
var m_primitives = require("__primitives");
var m_print      = require("__print");
var m_quat       = require("__quat");
var m_render     = require("__renderer");
var m_scgraph    = require("__scenegraph");
var m_sfx        = require("__sfx");
var m_shaders    = require("__shaders");
var m_subs       = require("__subscene");
var m_tex        = require("__textures");
var m_tsr        = require("__tsr");
var m_util       = require("__util");
var m_vec3       = require("__vec3");
var m_vec4       = require("__vec4");
var m_version    = require("__version");

var cfg_ani = m_cfg.animation;
var cfg_ctx = m_cfg.context;
var cfg_def = m_cfg.defaults;
var cfg_lim = m_cfg.context_limits;
var cfg_out = m_cfg.outlining;
var cfg_scs = m_cfg.scenes;

var FRAME_EPS = 5;

/* subscene types for different aspects of processing */

var VALID_OBJ_TYPES = ["ARMATURE", "CAMERA", "EMPTY", "LAMP", "MESH", "SPEAKER"];
var VALID_OBJ_TYPES_SECONDARY = ["ARMATURE", "EMPTY", "MESH", "SPEAKER"];

// add objects
var OBJECT_SUBSCENE_TYPES = [m_subs.GRASS_MAP, m_subs.SHADOW_CAST, m_subs.MAIN_OPAQUE,
    m_subs.MAIN_BLEND, m_subs.MAIN_XRAY, m_subs.MAIN_GLOW, 
    m_subs.MAIN_PLANE_REFLECT, m_subs.MAIN_CUBE_REFLECT,
    m_subs.MAIN_PLANE_REFLECT_BLEND, m_subs.MAIN_CUBE_REFLECT_BLEND,
    m_subs.COLOR_PICKING, m_subs.COLOR_PICKING_XRAY, m_subs.SHADOW_RECEIVE, 
    m_subs.OUTLINE_MASK, m_subs.DEBUG_VIEW];
exports.OBJECT_SUBSCENE_TYPES = OBJECT_SUBSCENE_TYPES;
// need light update
var LIGHT_SUBSCENE_TYPES = [m_subs.MAIN_OPAQUE, m_subs.MAIN_BLEND, m_subs.MAIN_XRAY,
    m_subs.MAIN_GLOW, m_subs.MAIN_PLANE_REFLECT, m_subs.MAIN_CUBE_REFLECT,
    m_subs.GOD_RAYS, m_subs.GOD_RAYS_COMBINE, m_subs.SKY,
    m_subs.MAIN_PLANE_REFLECT_BLEND, m_subs.MAIN_CUBE_REFLECT_BLEND,
    m_subs.LUMINANCE_TRUNCED, m_subs.SHADOW_RECEIVE, m_subs.SHADOW_CAST,
    m_subs.COLOR_PICKING, m_subs.COLOR_PICKING_XRAY, m_subs.OUTLINE_MASK];

var FOG_SUBSCENE_TYPES = [m_subs.MAIN_OPAQUE, m_subs.SSAO, m_subs.MAIN_BLEND,
    m_subs.MAIN_XRAY, m_subs.MAIN_GLOW, m_subs.MAIN_PLANE_REFLECT,
    m_subs.MAIN_CUBE_REFLECT, m_subs.MAIN_PLANE_REFLECT_BLEND, m_subs.MAIN_CUBE_REFLECT_BLEND];

// need time update
var TIME_SUBSCENE_TYPES = [m_subs.SHADOW_CAST, m_subs.MAIN_OPAQUE,
    m_subs.MAIN_BLEND, m_subs.MAIN_XRAY, m_subs.MAIN_GLOW,
    m_subs.MAIN_PLANE_REFLECT, m_subs.MAIN_CUBE_REFLECT,
    m_subs.MAIN_PLANE_REFLECT_BLEND, m_subs.MAIN_CUBE_REFLECT_BLEND,
    m_subs.COLOR_PICKING, m_subs.COLOR_PICKING_XRAY, m_subs.SHADOW_RECEIVE,
    m_subs.GOD_RAYS, m_subs.OUTLINE_MASK, m_subs.DEBUG_VIEW];

// need camera water distance update
var MAIN_SUBSCENE_TYPES = [m_subs.MAIN_OPAQUE, m_subs.MAIN_BLEND, m_subs.MAIN_XRAY,
    m_subs.MAIN_GLOW, m_subs.MAIN_PLANE_REFLECT, m_subs.MAIN_CUBE_REFLECT,
    m_subs.MAIN_PLANE_REFLECT_BLEND, m_subs.MAIN_CUBE_REFLECT_BLEND];

var SHORE_DIST_COMPAT = 100;

var MAX_BATCH_TEXTURES = 8;

var _main_scene = null;
var _active_scene = null;
var _scenes = [];
// not to be confused with scenegraph
var _scenes_graph = null;

var GRASS_MAP_MARGIN = 1E-4;

var MAX_SHADOW_CAST_BB_PROPORTION = 2;
var MAX_OPTIMAL_BB_ANGLE = Math.PI / 2;
var OPTIMAL_BB_COUNT = 10;

// prevent shadows stretching near edges
var SHADOW_MAP_EPSILON_XY = 0.005;
// fix depth rendering near clipping planes
var SHADOW_MAP_EPSILON_Z = 0.005;

var _vec2_tmp = new Float32Array(2);
var _vec3_tmp = new Float32Array(3);
var _vec3_tmp2 = new Float32Array(3);
var _quat4_tmp = new Float32Array(4);
var _vec4_tmp = new Float32Array(4);
var _mat4_tmp = new Float32Array(16);
var _corners_cache = new Float32Array(24);
var _corners_cache2 = new Float32Array(24);

var _bb_tmp = m_bounds.create_bb();
var _bb_tmp2 = m_bounds.create_bb();

var _shadow_cast_min_z = 0;
var _shadow_cast_max_z = -Infinity;


exports.create_scene_render = function() {
    var render = {

    };

    return render;
}

/**
 * Set given scene as active
 */
exports.set_active = function(scene) {
    _active_scene = scene;
    m_sfx.set_active_scene(scene);
}

/**
 * Prepare given scene for rendering.
 * Executed after all objects added to scene.
 */
exports.prepare_rendering = function(scene, scene_main) {

    var render = scene._render;
    var queue = m_scgraph.create_rendering_queue(render.graph);

    if (scene == scene_main) {
        setup_scene_dim(scene, m_cont.get_viewport_width(), m_cont.get_viewport_height());

        // attach to existing (may already containt RTT queue)
        for (var i = 0; i < queue.length; i++)
            scene._render.queue.push(queue[i]);

    } else {
        var tex0 = scene._render_to_textures[0];

        var width = tex0._render.source_size;
        var height = tex0._render.source_size;

        setup_scene_dim(scene, width, height);

        for (var i = 0; i < queue.length; i++)
            scene_main._render.queue.push(queue[i]);
    }

    var subs_arr = subs_array(scene, TIME_SUBSCENE_TYPES);
    for (var j = 0; j < subs_arr.length; j++)
        subs_arr[j].wind.set(render.wind);

    // NOTE: draw all SHADOW_CAST subscenes to fill them with correct DEPTH data
    // before rendering
    for (var i = 0; i < render.queue.length; i++)
        if (render.queue[i].type == m_subs.SHADOW_CAST)
            m_render.draw(render.queue[i]);
}

exports.get_main = get_main;
function get_main() {
    if (!_main_scene)
        _main_scene = find_main_scene(_scenes);

    return _main_scene;
}

/**
 * Main scene - first non-RTT scene
 * should be executed after RTT assignment in create_texture_bpy()
 */
exports.find_main_scene = find_main_scene;
function find_main_scene(scenes) {
    for (var i = 0; i < scenes.length; i++) {
        var scene = scenes[i];

        if (!scene._render_to_textures || !scene._render_to_textures.length)
            return scene;
    }

    return null;
}

exports.get_active = get_active;
/**
 * @methodOf scenes
 */
function get_active() {
    if (!_active_scene)
        m_util.panic("No active scene available");
    return _active_scene;
}



exports.check_active = check_active;
function check_active() {
    if (_active_scene)
        return true;
    else
        return false;
}

exports.get_camera = function(scene) {
    return scene._camera;
}

exports.get_all_scenes = get_all_scenes;
function get_all_scenes() {
    return _scenes;
}

exports.get_rendered_scenes = function() {
    if (_scenes.length == 1)
        return _scenes;

    for (var i = 0; i < _scenes.length; i++) {
        var graph = _scenes[i]._render.graph;
        m_graph.traverse(graph, function(node, attr) {
            var subs = attr;
            var draw_data = subs.draw_data;
            for (var j = 0; j < draw_data.length; j++) {
                var bundles = draw_data[j].bundles;
                for (var k = 0; k < bundles.length; k++) {
                    var bundle = bundles[k];
                    var textures = bundle.batch.textures;
                    var batch = null;
                    for (var m = 0; m < textures.length; m++)
                        if (textures[m].source == "SCENE" && textures[m].source_id == _scenes[i]["name"]
                                && subs.type != m_subs.COPY) {
                            m_print.error("Texture-scene loop detected. A scene is " +
                                "rendered to texture \"" + textures[m].name +
                                "\" yet this texture belongs " +
                                "to the same scene.");
                            var scene_node = m_graph.node_by_attr(_scenes_graph, _scenes[i]);
                            batch = bundle.batch;
                            break;
                        }

                    if (batch) {
                        batch.textures = [];
                        batch.texture_names = [];
                        m_batch.update_batch_material_error(batch, null);
                        m_batch.update_shader(batch);
                        m_subs.append_draw_data(subs, bundle);
                    }
                }
            }
        });
    }

    var scenes = [];

    for (var i = 0; i < _scenes.length; i++) {
        var scene = _scenes[i];

        // begin from the first non-RTT scene
        if (scene._render_to_textures.length)
            continue;

        var node = m_graph.node_by_attr(_scenes_graph, scene);
        m_graph.enforce_acyclic(_scenes_graph, node);
        var graph = m_graph.subgraph_node_conn(_scenes_graph, node, m_graph.BACKWARD_DIR);
        graph = m_graph.topsort(graph);

        m_graph.traverse(graph, function(node, attr) {
            scenes.push(attr);
        });

        break;
    }

    return scenes;
}

exports.append_scene = append_scene;
/**
 * Update scene._render
 * prepare camera before execution
 * @methodOf scenes
 */
function append_scene(bpy_scene, scene_objects, lamps, bpy_mesh_objs, bpy_empty_objs) {
    bpy_scene._render_to_textures = bpy_scene._render_to_textures || [];
    bpy_scene._nla = null;

    var render = bpy_scene._render;
    var cam_scene_data = m_obj_util.get_scene_data(bpy_scene._camera, bpy_scene);
    var cam_render = bpy_scene._camera.render;

    render.video_textures = [];

    var world = bpy_scene["world"];

    render.lamps_number      = lamps.length;
    render.sun_exist         = check_scenes_sun(lamps);
    render.sky_params        = extract_sky_params(world, render.sun_exist);
    render.world_light_set   = get_world_light_set(world, render.sky_params);
    render.world_fog_set     = get_world_fog_set(world);
    render.hmd_stereo_use    = !bpy_scene._render_to_textures.length &&
                               check_hmd_stereo_use(cam_scene_data);
    render.anaglyph_use      = !bpy_scene._render_to_textures.length &&
                               check_anaglyph_use(cam_scene_data);
    render.anchor_visibility = !render.hmd_stereo_use && !render.anaglyph_use &&
                               check_anchor_visibility_objects(bpy_scene, bpy_empty_objs);
    render.reflection_params = extract_reflections_params(bpy_scene, scene_objects, bpy_mesh_objs);
    render.bloom_params      = extract_bloom_params(bpy_scene);
    render.mb_params         = extract_mb_params(bpy_scene);
    render.cc_params         = extract_cc_params(bpy_scene);
    render.god_rays_params   = extract_god_rays_params(bpy_scene);
    render.outline_params    = extract_outline_params(bpy_scene);
    render.glow_params       = extract_glow_params(bpy_scene);

    render.dof               = cfg_def.dof && (cam_render.dof_distance > 0 || cam_render.dof_object);
    render.motion_blur       = cfg_def.motion_blur && bpy_scene["b4w_enable_motion_blur"];
    render.compositing       = cfg_def.compositing && bpy_scene["b4w_enable_color_correction"];
    render.antialiasing      = cfg_def.antialiasing &&
                              cfg_def.msaa_samples == 1 &&
                              (bpy_scene["b4w_antialiasing_quality"] != "NONE");
    render.ssao              = cfg_def.ssao && bpy_scene["b4w_enable_ssao"];
    render.god_rays          = cfg_def.god_rays && bpy_scene["b4w_enable_god_rays"] && render.sun_exist;
    render.depth_tex         = cfg_def.depth_tex_available;
    render.glow_over_blend   = bpy_scene["b4w_glow_settings"]["render_glow_over_blend"];
    render.ssao_params       = extract_ssao_params(bpy_scene);

    var materials_params     = get_material_params(bpy_mesh_objs)
    render.materials_params  = materials_params;
    render.refractions       = check_refraction(bpy_scene, materials_params);
    render.shadow_params     = extract_shadow_params(bpy_scene, lamps, bpy_mesh_objs);
    render.water_params      = get_water_params(bpy_mesh_objs);
    render.xray              = check_xray_materials(bpy_mesh_objs);
    render.soft_particles    = check_soft_particles(bpy_mesh_objs);
    render.shore_smoothing   = check_shore_smoothing(bpy_mesh_objs);
    render.dynamic_grass     = check_dynamic_grass(bpy_scene, bpy_mesh_objs);
    render.color_picking     = !render.hmd_stereo_use && !render.anaglyph_use &&
                                check_selectable_objects(bpy_scene, bpy_mesh_objs);
    render.outline           = check_outlining_objects(bpy_scene, bpy_mesh_objs);
    render.glow_materials    = check_glow_materials(bpy_scene, bpy_mesh_objs);

    switch (bpy_scene["b4w_reflection_quality"]) {
    case "LOW":
        render.cubemap_refl_size = cfg_scs.cube_reflect_low;
        render.plane_refl_size = cfg_scs.plane_reflect_low;
        break;
    case "MEDIUM":
        render.cubemap_refl_size = cfg_scs.cube_reflect_medium;
        render.plane_refl_size = cfg_scs.plane_reflect_medium;
        break;
    case "HIGH":
        render.cubemap_refl_size = cfg_scs.cube_reflect_high;
        render.plane_refl_size = cfg_scs.plane_reflect_high;
        break;
    default:
        render.cubemap_refl_size = cfg_scs.cube_reflect_low;
        render.plane_refl_size = cfg_scs.plane_reflect_low;
        break;
    }

    if (m_cont.is_hidpi()) {
        m_print.log("%cENABLE HIDPI MODE", "color: #00a");
        render.aa_quality = "AA_QUALITY_LOW";
        render.resolution_factor = 1.0;
        cfg_def.msaa_samples = 1;
    } else if (cfg_def.msaa_samples > 1) {
        m_print.log("%cENABLE MSAA RENDERING: " + cfg_def.msaa_samples + "x",
                "color: #00a");
        render.resolution_factor = 1.0;
    } else {
        render.aa_quality = "AA_QUALITY_" + bpy_scene["b4w_antialiasing_quality"];

        switch (bpy_scene["b4w_antialiasing_quality"]) {
        case "LOW":
            if (render.antialiasing)
                render.resolution_factor = 1.0;
            break;
        case "MEDIUM":
            if (cfg_def.quality == m_cfg.P_LOW || cfg_def.quality == m_cfg.P_HIGH)
                render.resolution_factor = 1.0;
            else if (cfg_def.quality == m_cfg.P_ULTRA)
                render.resolution_factor = 1.33;
            break;
        case "HIGH":
            if (cfg_def.quality == m_cfg.P_LOW)
                render.resolution_factor = 1.0;
            else if (cfg_def.quality == m_cfg.P_HIGH)
                render.resolution_factor = 1.33;
            else if (cfg_def.quality == m_cfg.P_ULTRA)
                render.resolution_factor = 2.0;
            break;
        case "NONE":
            if (cfg_def.quality == m_cfg.P_LOW || cfg_def.quality == m_cfg.P_HIGH)
                render.resolution_factor = 1.0;
            else if (cfg_def.quality == m_cfg.P_ULTRA)
                render.resolution_factor = 2.0;
            break;
        }
        if (cfg_def.quality == m_cfg.P_CUSTOM)
            render.resolution_factor = 1.0;

    }
    var rtt_sort_fun = function(bpy_tex1, bpy_tex2) {
        return bpy_tex2._render.source_size - bpy_tex1._render.source_size;
    }

    var rtt_sorted = bpy_scene._render_to_textures.sort(rtt_sort_fun);
    render.graph = m_scgraph.create_rendering_graph(render, cam_scene_data,
                cam_render, rtt_sorted);

    render.queue = [];

    render.need_shadow_update = false;
    render.need_grass_map_update = false;
    render.need_outline = false;
    render.wind = new Float32Array(3);

    _scenes.push(bpy_scene);

    if (!_scenes_graph)
        _scenes_graph = m_graph.create();

    m_graph.append_node_attr(_scenes_graph, bpy_scene);

    // scene_data is ready after scene appending
    for (var i = 0; i < scene_objects.length; i++)
        m_obj_util.scene_data_set_active(scene_objects[i], true, bpy_scene);

    var canvas_container_elem = m_cont.get_container();
    m_cont.resize(canvas_container_elem.clientWidth,
            canvas_container_elem.clientHeight, true);
}

exports.append_scene_vtex = function(scene, textures, data_id) {
    for (var i = 0; i < textures.length; i++)
        if (textures[i]._render && textures[i]._render.is_movie) {
            textures[i]._render.vtex_data_id = data_id;
            scene._render.video_textures.push(textures[i]);
        }
}

function extract_shadow_params(bpy_scene, lamps, bpy_mesh_objs) {

    if (!(cfg_def.depth_tex_available &&
          check_render_shadows(bpy_scene, lamps, bpy_mesh_objs)))
        return null;

    var shs = bpy_scene["b4w_shadow_settings"];
    var rshs = {};
    if (shs["csm_resolution"] > cfg_lim.max_texture_size) {
        rshs.csm_resolution = cfg_lim.max_texture_size;
        m_print.error("Shadow map texture has unsupported size. Changed to "
                + cfg_lim.max_texture_size + ".");
    } else
        rshs.csm_resolution         = shs["csm_resolution"];

    cfg_def.blur_samples = shs["blur_samples"];
    rshs.soft_shadows = shs["soft_shadows"];

    var use_ssao = cfg_def.ssao && bpy_scene["b4w_enable_ssao"];
    var shadow_lamps = m_obj_util.get_shadow_lamps(lamps, use_ssao);

    rshs.self_shadow_polygon_offset = shs["self_shadow_polygon_offset"];
    rshs.self_shadow_normal_offset  = shs["self_shadow_normal_offset"];
    rshs.enable_csm                 = shs["b4w_enable_csm"] && shadow_lamps.length == 1;

    rshs.lamp_types = [];
    rshs.spot_sizes = [];
    rshs.clip_start = [];
    rshs.clip_end = [];

    for (var i = 0; i < shadow_lamps.length; i++) {
        rshs.lamp_types.push(shadow_lamps[i].light.type);
        rshs.spot_sizes.push(shadow_lamps[i].light.spot_size);
        rshs.clip_start.push(shadow_lamps[i].light.clip_start);
        rshs.clip_end.push(shadow_lamps[i].light.clip_end);
        if ((rshs.lamp_types[i] == "SPOT" || rshs.lamp_types[i] == "POINT") &&
                rshs.enable_csm) {
            m_print.warn("Generating shadows for SPOT " +
                        "or POINT light. Disabling Cascaded Shadow Maps");
            rshs.enable_csm = false;
        }
    }

    if (rshs.enable_csm) {
        rshs.csm_num                    = shs["csm_num"];
        rshs.csm_first_cascade_border   = shs["csm_first_cascade_border"];
        rshs.first_cascade_blur_radius  = shs["first_cascade_blur_radius"];
        rshs.csm_last_cascade_border    = shs["csm_last_cascade_border"];
        rshs.last_cascade_blur_radius   = shs["last_cascade_blur_radius"];

        rshs.fade_last_cascade          = shs["fade_last_cascade"];
        rshs.blend_between_cascades     = shs["blend_between_cascades"];
    } else {
        rshs.csm_num                    = 1;
        rshs.csm_first_cascade_border   = shs["csm_first_cascade_border"];
        rshs.first_cascade_blur_radius  = shs["first_cascade_blur_radius"];
        rshs.csm_last_cascade_border    = shs["csm_last_cascade_border"];
        rshs.last_cascade_blur_radius   = shs["last_cascade_blur_radius"];

        rshs.fade_last_cascade          = false;
        rshs.blend_between_cascades     = false;
    }
    return rshs;
}

function check_render_shadows(bpy_scene, lamps, bpy_mesh_objs) {

    if (lamps.length == 0)
        return false;

    if (cfg_def.shadows) {
        switch (bpy_scene["b4w_render_shadows"]) {
        case "OFF":
            return false;
        case "ON":
            return true;
        case "AUTO":
        }
    } else
        return false

    var has_casters = false;
    var has_receivers = false;
    var use_ssao = cfg_def.ssao && bpy_scene["b4w_enable_ssao"];
    if (lamps.length == 0 && !use_ssao)
        return false;

    for (var i = 0; i < bpy_mesh_objs.length; i++) {
        var bpy_obj = bpy_mesh_objs[i];

        if (bpy_obj["b4w_shadow_cast"])
            has_casters = true;

        if (bpy_obj["b4w_shadow_receive"])
            has_receivers = true;

        if ((use_ssao || has_casters) && has_receivers)
            return true;
    }
    // no casters, no receivers
    return false;
}


function check_scenes_sun(lamps) {
    for (var i = 0; i < lamps.length; i++)
        if (lamps[i].light.type == "SUN")
            return true;
    return false;

}
/**
 * Check if shore smoothing required for given bpy objects which represent the scene.
 * Shore smoothing required if we have shore smoothing flag
 * enabled for water materials
 */
function check_shore_smoothing(bpy_objects) {

    if (!cfg_def.shore_smoothing)
        return false;

    var mats = get_objs_materials(bpy_objects);

    for (var i = 0; i < mats.length; i++) {
        var mat = mats[i];

        if (mat["b4w_water"] && mat["b4w_water_shore_smoothing"])
            return true;
    }

    return false;
}

function check_soft_particles(bpy_objects) {
    for (var i = 0; i < bpy_objects.length; i++) {
        var bpy_obj = bpy_objects[i];
        var psystems = bpy_obj["particle_systems"];
        for (var j = 0; j < psystems.length; j++) {
            var pset = psystems[j]["settings"];
            if (m_obj_util.check_obj_soft_particles_accessibility(bpy_objects[i], pset))
                return true;
        }
    }
    return false;

}
/**
 * Check water parameters based on the given bpy objects.
 */
function get_water_params(bpy_objects) {

    // TODO: Now returns only parameters from a water obj which is considered
    // to be the most important one. Need to collect info from other water
    // objects.
    var mats = get_objs_materials(bpy_objects);
    var water_params = [];

    for (var i = 0; i < mats.length; i++) {
        var mat = mats[i];

        if (mat["b4w_water"]) {

            var wp = {};
            // set water level to obect's origin y coord
            for (var j = 0; j < bpy_objects.length; j++) {
                var bpy_obj = bpy_objects[j];
                var mesh = bpy_obj["data"];
                var mesh_mats = mesh["materials"];
                for (var k = 0; k < mesh_mats.length; k++) {
                    var mesh_mat = mesh_mats[k];
                    if (mesh_mat == mat)
                        wp.water_level = bpy_obj["location"][2];
                }
            }

            // fog stuff
            wp.fog_color_density = mat["b4w_water_fog_color"].slice(0);
            wp.fog_color_density.push( mat["b4w_water_fog_density"] );

            // dynamics stuff
            if (mat["b4w_water_dynamic"]) {
                wp.dynamic           = true;
                wp.waves_height      = mat["b4w_waves_height"];
                wp.waves_length      = mat["b4w_waves_length"];
                wp.dst_noise_scale0  = mat["b4w_water_dst_noise_scale0"];
                wp.dst_noise_scale1  = mat["b4w_water_dst_noise_scale1"];
                wp.dst_noise_freq0   = mat["b4w_water_dst_noise_freq0"];
                wp.dst_noise_freq1   = mat["b4w_water_dst_noise_freq1"];
                wp.dir_min_shore_fac = mat["b4w_water_dir_min_shore_fac"];
                wp.dir_freq          = mat["b4w_water_dir_freq"];
                wp.dir_noise_scale   = mat["b4w_water_dir_noise_scale"];
                wp.dir_noise_freq    = mat["b4w_water_dir_noise_freq"];
                wp.dir_min_noise_fac = mat["b4w_water_dir_min_noise_fac"];
                wp.dst_min_fac       = mat["b4w_water_dst_min_fac"];
                wp.waves_hor_fac     = mat["b4w_water_waves_hor_fac"];
            } else {
                wp.dynamic      = false;
                wp.waves_height = 0.0;
                wp.waves_length = 0.0;
            }

            // caustics stuff
            wp.caustics           = mat["b4w_water_enable_caust"];
            wp.caustic_scale      = mat["b4w_water_caust_scale"];
            wp.caustic_brightness = mat["b4w_water_caust_brightness"];
            wp.caustic_speed      = new Float32Array([0.3, 0.7]);

            wp.shoremap_image  = null;

            var texture_slots = mat["texture_slots"];

            for (var j = 0; j < texture_slots.length; j++) {
                var texture = texture_slots[j]["texture"];
                if (texture["b4w_shore_dist_map"] === true &&
                        texture["image"]["source"] == "FILE") {
                    wp.shoremap_image    = texture["image"];
                    wp.shoremap_tex_size = texture["image"]["size"][0];
                    wp.max_shore_dist    = texture["b4w_max_shore_dist"];

                    var shore_boundings = texture["b4w_shore_boundings"];
                    wp.shoremap_center = [(shore_boundings[0] + shore_boundings[1]) / 2,
                                          (shore_boundings[2] + shore_boundings[3]) / 2];

                    wp.shoremap_size = [shore_boundings[0] - shore_boundings[1],
                                        shore_boundings[2] - shore_boundings[3]];

                }
            }
            water_params.push(wp);
        }
    }

    if (water_params.length > 0) {
        var wp = water_params[0];
        if (!wp.dynamic)
            // set water params from water with "dynamic" property
            for (var i = 0; i < water_params.length; i++)
                if (water_params[i].dynamic)
                    wp = water_params[i];

        return wp;
    } else
        return null;
}

function get_material_params(bpy_objects) {

    var materials_properties_existance = {
        refractions: false
    };

    var materials = get_objs_materials(bpy_objects);

    var get_nodes_properties = function(node_tree) {
        if (!node_tree)
            return;
        var nodes = node_tree["nodes"];
        for (var j = 0; j < nodes.length; j++) {
            var node = nodes[j];

            if (node["type"] == "GROUP" && node["node_group"])
                get_nodes_properties(node["node_group"]["node_tree"]);

            if (node["type"] == "GROUP" && node["node_tree_name"] == "B4W_REFRACTION")
                materials_properties_existance.refractions = true;
        }
    }

    for (var i = 0; i < materials.length; i++) {
        var material = materials[i];

        if (material["b4w_refractive"])
            materials_properties_existance.refractions = true;

        if (material["node_tree"])
            get_nodes_properties(material["node_tree"]);
    }

    return materials_properties_existance;
}

function check_anaglyph_use(cam_scene_data) {
    // NOTE: disable anaglyph stereo for the non-PERSP camera
    if (cam_scene_data.cameras[0].type != m_cam.TYPE_PERSP && cfg_def.stereo == "ANAGLYPH") {
        m_print.warn("Anaglyph stereo is disabled for the non-perspective camera");
        cfg_def.stereo = "NONE";
        return false;
    } else
        return cfg_def.stereo == "ANAGLYPH";
}

function check_hmd_stereo_use(cam_scene_data) {
    // NOTE: disable head-mounted display stereo for the non-PERSP camera
    if (cfg_def.stereo == "HMD") {
        if (cam_scene_data.cameras[0].type != m_cam.TYPE_PERSP) {
            m_print.warn("Head-mounted display stereo is disabled for the non-perspective camera");
            cfg_def.stereo = "NONE";
            return false;
        }
        if (!m_input.can_use_device(m_input.DEVICE_HMD)) {
            m_print.warn("Head-mounted display stereo is disabled for the non-WebVR and non-mobile devices");
            cfg_def.stereo = "NONE";
            return false;
        }
    }
    return cfg_def.stereo == "HMD";
}

/**
 * Check if reflections are required for the given scene.
 * Returns an array of reflection planes and cube reflectibe objs on the scene.
 */
function extract_reflections_params(bpy_scene, scene_objects, bpy_mesh_objs) {

    if (cfg_def.reflections) {
        switch (bpy_scene["b4w_render_reflections"]) {
        case "OFF":
            return false;
        case "ON":
        }
    } else
        return false;

    var refl_plane_objs = [];
    var num_cube_refl = 0;
    var has_blend_reflexible = false;

    for (var i = 0; i < scene_objects.length; i++) {
        var obj = scene_objects[i];

        if (obj.render.reflective && obj.render.reflection_type == "CUBE")
            num_cube_refl++;

        if (obj.reflective_objs.length) {
            var refl_plane_id = null;
            for (var j = 0; j < refl_plane_objs.length; j++) {
                var rp = refl_plane_objs[j];
                if (rp == obj) {
                     refl_plane_id = j;
                     break;
                }
            }

            // we need only unique reflection planes
            if (refl_plane_id == null)
                refl_plane_objs.push(obj);
        }

    }

    for (var i = 0; i < bpy_mesh_objs.length; i++)
        if (check_blend_reflexible(bpy_mesh_objs[i]))
            has_blend_reflexible = true;

    return {refl_plane_objs: refl_plane_objs,
            num_cube_refl:   num_cube_refl,
            cube_refl_subs:  [],
            cube_refl_subs_blend:  [],
            plane_refl_subs: [],
            plane_refl_subs_blend: [],
            has_blend_reflexible: has_blend_reflexible
           };
}

function check_blend_reflexible(obj) {

    if (!obj["b4w_reflexible"])
        return;

    var mesh = obj["data"]
    var materials = mesh["materials"];

    for (var i = 0; i < materials.length; i++) {
        var mat = materials[i];
        var gs = mat["game_settings"];
        var alpha_blend = gs["alpha_blend"];
        if (alpha_blend != "OPAQUE"
                && alpha_blend != "CLIP")
            return true;
    }

    return false;
}

/**
 * Check dynamic sky parameters
 */
function extract_sky_params(world, sun_exist) {

    var sky_settings = world["b4w_sky_settings"];
    var sky_params = {};

    sky_params.render_sky                  = sky_settings["render_sky"] || sky_settings["procedural_skydome"];
    sky_params.procedural_skydome          = sky_settings["procedural_skydome"] && sun_exist;
    sky_params.use_as_environment_lighting = sky_settings["use_as_environment_lighting"];
    sky_params.sky_color                   = sky_settings["color"];
    sky_params.rayleigh_brightness         = sky_settings["rayleigh_brightness"];
    sky_params.mie_brightness              = sky_settings["mie_brightness"];
    sky_params.spot_brightness             = sky_settings["spot_brightness"];
    sky_params.scatter_strength            = sky_settings["scatter_strength"];
    sky_params.rayleigh_strength           = sky_settings["rayleigh_strength"];
    sky_params.mie_strength                = sky_settings["mie_strength"];
    sky_params.rayleigh_collection_power   = sky_settings["rayleigh_collection_power"];
    sky_params.mie_collection_power        = sky_settings["mie_collection_power"];
    sky_params.mie_distribution            = sky_settings["mie_distribution"];
    sky_params.reflexible                  = sky_settings["reflexible"];
    sky_params.reflexible_only             = sky_settings["reflexible_only"];

    if (!sun_exist && sky_settings["procedural_skydome"])
        m_print.warn("There is no sun on the scene. " +
                          "Procedural sky won't be rendered");

    return sky_params;
}

/**
 * Extract ssao parameters
 */
function extract_ssao_params(bpy_scene) {
    var ssao_params   = {};
    var ssao_settings = bpy_scene["b4w_ssao_settings"];

    ssao_params.radius_increase         = ssao_settings["radius_increase"];
    ssao_params.hemisphere              = ssao_settings["hemisphere"];
    ssao_params.blur_depth              = ssao_settings["blur_depth"];
    ssao_params.blur_discard_value      = ssao_settings["blur_discard_value"];
    ssao_params.influence               = ssao_settings["influence"];
    ssao_params.dist_factor             = ssao_settings["dist_factor"];
    ssao_params.samples                 = ssao_settings["samples"];

    return ssao_params;
}

/**
 * Extract bloom parameters
 */
function extract_bloom_params(bpy_scene) {

    if (!(cfg_def.bloom && bpy_scene["b4w_enable_bloom"]
            && bpy_scene._render.sun_exist))
        return null;

    var bloom_params   = {};
    var bloom_settings = bpy_scene["b4w_bloom_settings"];

    bloom_params.blur     = bloom_settings["blur"];
    bloom_params.edge_lum = bloom_settings["edge_lum"];
    bloom_params.key      = bloom_settings["key"];

    return bloom_params;
}

/**
 * Extract motion blur parameters
 */
function extract_mb_params(bpy_scene) {

    var mb_params   = {};
    var mb_settings = bpy_scene["b4w_motion_blur_settings"];

    mb_params.mb_decay_threshold = mb_settings["motion_blur_decay_threshold"];
    mb_params.mb_factor          = mb_settings["motion_blur_factor"];

    return mb_params;
}

/**
 * Extract color correction parameters
 */
function extract_cc_params(bpy_scene) {

    var cc_params   = {};
    var cc_settings = bpy_scene["b4w_color_correction_settings"];

    cc_params.brightness = cc_settings["brightness"];
    cc_params.contrast   = cc_settings["contrast"];
    cc_params.exposure   = cc_settings["exposure"];
    cc_params.saturation = cc_settings["saturation"];

    return cc_params;
}

/**
 * Extract god rays parameters
 */
function extract_god_rays_params(bpy_scene) {

    var god_rays_params   = {};
    var god_rays_settings = bpy_scene["b4w_god_rays_settings"];

    god_rays_params.intensity      = god_rays_settings["intensity"];
    god_rays_params.max_ray_length = god_rays_settings["max_ray_length"];
    god_rays_params.steps_per_pass = god_rays_settings["steps_per_pass"];

    return god_rays_params;
}

/**
 * Extract outline parameters
 */
function extract_outline_params(bpy_scene) {

    var outline_params   = {};

    outline_params.outline_color  = bpy_scene["b4w_outline_color"];
    outline_params.outline_factor = bpy_scene["b4w_outline_factor"];

    return outline_params;
}

/**
 * Extract glow parameters
 */
function extract_glow_params(bpy_scene) {

    var glow_params   = {};
    var glow_settings = bpy_scene["b4w_glow_settings"];

    glow_params.small_glow_mask_coeff = glow_settings["small_glow_mask_coeff"];
    glow_params.large_glow_mask_coeff = glow_settings["large_glow_mask_coeff"];
    glow_params.small_glow_mask_width = glow_settings["small_glow_mask_width"];
    glow_params.large_glow_mask_width = glow_settings["large_glow_mask_width"];

    return glow_params;
}

/**
 * Get world lights setting
 */
function get_world_light_set(world, sky_params) {

    var wls = world["light_settings"];

    var wls_params = {};
    wls_params.environment_energy       = wls["environment_energy"];
    wls_params.use_environment_light    = wls["use_environment_light"];
    wls_params.environment_color        = wls["environment_color"];
    wls_params.horizon_color            = world["horizon_color"].slice(0);
    wls_params.zenith_color             = world["zenith_color"].slice(0);
    wls_params.use_sky_paper            = world["use_sky_paper"];
    wls_params.use_sky_blend            = world["use_sky_blend"];
    wls_params.use_sky_real             = world["use_sky_real"];
    wls_params.sky_texture_slot         = null;
    wls_params.sky_texture_param        = null;
    wls_params.environment_texture_slot = null;

    var use_environment_light = true;
    if (wls_params.use_environment_light && wls_params.environment_color == "SKY_TEXTURE" &&
        !(sky_params.procedural_skydome && sky_params.use_as_environment_lighting)) {
        var tex_slot = null;
        for (var i = 0; i < world["texture_slots"].length; i++)
            if (world["texture_slots"][i]["texture"]["b4w_use_as_environment_lighting"] &&
                    !world["texture_slots"][i]["texture"]["b4w_use_as_skydome"]) {
                tex_slot = world["texture_slots"][i];
                break;
            }
        if (!tex_slot) {
            // m_print.warn("environment lighting is set to 'Sky Texture'" +
            //         ", but there is no world texture with 'Sky Texture Usage' property set to 'ENVIRONMENT_LIGHTING'");
            use_environment_light = false;
        } else
            wls_params.environment_texture_slot = tex_slot;
    }

    for (var i = 0; i < world["texture_slots"].length; i++)
        if (world["texture_slots"][i]["texture"]["b4w_use_as_skydome"]) {
            use_environment_light = true;
            var sts = world["texture_slots"][i];
            wls_params.sky_texture_slot = sts;
            var tex_size = Math.min(cfg_lim.max_cube_map_texture_size, 
                    m_tex.calc_pot_size(sts["texture"]["image"]["size"][0] / 3));
            wls_params.sky_texture_param = {
                tex_size: tex_size,
                blend_factor: sts["blend_factor"],
                horizon_factor: sts["horizon_factor"],
                zenith_up_factor: sts["zenith_up_factor"],
                zenith_down_factor: sts["zenith_down_factor"],
                color: sts["color"],
                default_value: sts["default_value"],
                invert: sts["invert"],
                use_rgb_to_intensity: sts["use_rgb_to_intensity"],
                blend_type: sts["blend_type"],
                // stencil: sts["stencil"],
                use_map_blend: sts["use_map_blend"],
                use_map_horizon: sts["use_map_horizon"],
                use_map_zenith_up: sts["use_map_zenith_up"],
                use_map_zenith_down: sts["use_map_zenith_down"],
            }
            break;
    }

    wls_params.use_environment_light = wls_params.use_environment_light ?
            use_environment_light : false;

    return wls_params;
}

function get_world_fog_set(world) {
    var wfs = world["fog_settings"];

    var wfs_params = {};
    wfs_params.use_fog = wfs["use_fog"];
    wfs_params.intensity = wfs["intensity"];
    wfs_params.depth = wfs["depth"];
    wfs_params.start = wfs["start"];
    wfs_params.height = wfs["height"];
    wfs_params.falloff = wfs["falloff"];
    if (wfs["use_custom_color"])
        wfs_params.color = wfs["color"].slice(0);
    else
        wfs_params.color = world["horizon_color"].slice(0);

    var fog_color = wfs_params.color;
    var fog_dens = 1.0 / wfs_params.depth;
    wfs_params.fog_color_density = new Float32Array([fog_color[0],
                                                 fog_color[1],
                                                 fog_color[2],
                                                 fog_dens]);
    wfs_params.fog_params = new Float32Array([wfs_params.intensity,
                                                 wfs_params.depth,
                                                 wfs_params.start,
                                                 wfs_params.height]);
    return wfs_params;
}

/**
 * To render dynamic grass following conditions must be met:
 * enabled global setting
 * at least one terrain material
 * at least one HAIR particle system (settings) with dynamic grass enabled
 */
function check_dynamic_grass(bpy_scene, bpy_objects) {

    if (!cfg_def.dynamic_grass)
        return false;

    switch (bpy_scene["b4w_render_dynamic_grass"]) {
    case "OFF":
        return false;
    case "ON":
        return true;
    case "AUTO":
        // process objects
    }

    var has_terrain = false;
    var has_dyn_grass = false;

    for (var i = 0; i < bpy_objects.length; i++) {
        var bpy_obj = bpy_objects[i];
        var materials = bpy_obj["data"]["materials"];
        for (var j = 0; j < materials.length; j++) {
            var mat = materials[j];
            if (mat["b4w_terrain"])
                has_terrain = true;
        }

        var psystems = bpy_obj["particle_systems"];
        for (var j = 0; j < psystems.length; j++) {
            var pset = psystems[j]["settings"];
            if (pset["type"] == "HAIR" && pset["b4w_dynamic_grass"])
                has_dyn_grass = true;
        }

        if (has_terrain && has_dyn_grass)
            return true;
    }

    return false;
}

function check_selectable_objects(bpy_scene, bpy_objects) {
    if (cfg_out.outlining_overview_mode)
        return true;

    if (cfg_def.enable_selectable) {
        switch (bpy_scene["b4w_enable_object_selection"]) {
        case "OFF":
            return false;
        case "ON":
            return true;
        case "AUTO":
            for (var i = 0; i < bpy_objects.length; i++)
                if (bpy_objects[i]._object.render.selectable)
                    return true;
            return false;
        }
    } else
        return false;
}

function check_outlining_objects(bpy_scene, bpy_objects) {
    if (cfg_out.outlining_overview_mode)
        return true;

    if (cfg_def.enable_outlining)
        switch (bpy_scene["b4w_enable_outlining"]) {
        case "OFF":
            return false;
        case "ON":
            return true;
        case "AUTO":
            for (var i = 0; i < bpy_objects.length; i++)
                if (bpy_objects[i]._object.render.outlining)
                    return true;
            return false;
        }
    else
        return false;
}

function check_glow_materials(bpy_scene, bpy_objects) {
    if (cfg_def.glow_materials) {
        switch (bpy_scene["b4w_enable_glow_materials"]) {
        case "OFF":
            return false;
        case "ON":
            return true;
        case "AUTO":
            for (var i = 0; i < bpy_objects.length; i++) {
                var materials = bpy_objects[i]["data"]["materials"];
                for (var j = 0; j < materials.length; j++) {
                    if (m_nodemat.check_material_glow_output(materials[j]))
                        return true;
                }
            }
            return false;
        }
    } else
        return false;
}

function check_refraction(bpy_scene, mat_params) {
    if (cfg_def.refractions) {
        switch (bpy_scene["b4w_render_refractions"]) {
        case "OFF":
            return false;
        case "ON":
            return true;
        case "AUTO":
            return mat_params.refractions
        }
    } else
        return false;
}

function check_xray_materials(bpy_objects) {
    for (var i = 0; i < bpy_objects.length; i++) {
        var materials = bpy_objects[i]["data"]["materials"];
        for (var j = 0; j < materials.length; j++) {
            var mat = materials[j];
            var gs = mat["game_settings"];
            var alpha_blend = gs["alpha_blend"];
            if (mat["b4w_render_above_all"]
                    && alpha_blend != "OPAQUE"
                    && alpha_blend != "CLIP")
                return true;
        }
    }
    return false;
}

function check_anchor_visibility_objects(bpy_scene, bpy_empty_objs) {

    switch (bpy_scene["b4w_enable_anchors_visibility"]) {
    case "OFF":
        return false;
    case "ON":
        return true;
    case "AUTO":
        for (var i = 0; i < bpy_empty_objs.length; i++) {
            var obj = bpy_empty_objs[i]._object;
            if (obj.anchor && obj.anchor.detect_visibility)
                return true;
        }
        return false;
    }
}

exports.get_graph = function(scene) {
    return scene._render.graph;
}

/**
 * Generate non-object batches for graph subscenes
 */
exports.generate_auxiliary_batches = function(scene, graph) {
    m_graph.traverse(graph, function(node, attr) {
        var subs = attr;

        var batch = null;

        switch (subs.type) {
        case m_subs.POSTPROCESSING:
            batch = m_batch.create_postprocessing_batch(subs.pp_effect);
            break;
        case m_subs.SSAO:
            batch = m_batch.create_ssao_batch(subs);
            break;
        case m_subs.SSAO_BLUR:
            batch = m_batch.create_ssao_blur_batch(subs);
            break;
        case m_subs.DEPTH_PACK:
            batch = m_batch.create_depth_pack_batch();
            break;
        case m_subs.GOD_RAYS:
            var subs_input = m_scgraph.find_input(graph, subs, m_subs.RESOLVE) ||
                             m_scgraph.find_input(graph, subs, m_subs.DEBUG_VIEW) ||
                             m_scgraph.find_input(graph, subs, m_subs.MAIN_BLEND) ||
                             m_scgraph.find_input(graph, subs, m_subs.GOD_RAYS);

            var tex_input = subs_input.camera.color_attachment;

            // needed for special underwater god rays
            var water = subs.water;
            var steps = subs.steps_per_pass;

            batch = m_batch.create_god_rays_batch(tex_input, subs.pack,
                                                  water, steps);

            break;

        case m_subs.GOD_RAYS_COMBINE:

            var subs_input = m_scgraph.find_input(graph, subs, m_subs.RESOLVE) ||
                             m_scgraph.find_input(graph, subs, m_subs.DEBUG_VIEW) ||
                             m_scgraph.find_input(graph, subs, m_subs.MAIN_BLEND);

            var subs_god_rays = m_scgraph.find_input(graph, subs, m_subs.GOD_RAYS);

            var tex_main = subs_input.camera.color_attachment;
            var tex_god_rays = subs_god_rays.camera.color_attachment;

            batch = m_batch.create_god_rays_combine_batch(tex_main, tex_god_rays);

            break;

        case m_subs.MOTION_BLUR:
            batch = m_batch.create_motion_blur_batch(subs.mb_decay_threshold);
            break;

        case m_subs.COC:
            batch = m_batch.create_coc_batch(subs.coc_type);
            break;

        case m_subs.DOF:
            batch = m_batch.create_dof_batch(subs);

            var dof_power = subs.camera.dof_power;

            if (subs.camera.dof_bokeh) {
                // half power because of downsized subs
                dof_power /= 2.0;
                var subs_pp_array = m_scgraph.get_inputs_by_type(graph, subs, m_subs.POSTPROCESSING);

                // Y_DOF_BLUR
                m_scgraph.set_texel_size_mult(subs_pp_array[0], dof_power);
                m_scgraph.set_texel_size_mult(subs_pp_array[1], dof_power);

                // X_DOF_BLUR
                subs_pp_array[0] = m_scgraph.find_input(graph, subs_pp_array[0],
                        m_subs.POSTPROCESSING);
                m_scgraph.set_texel_size_mult(subs_pp_array[0], dof_power);

            } else {
                // Y_BLUR
                var subs_pp1 = m_scgraph.find_input(graph, subs, m_subs.POSTPROCESSING);
                // X_BLUR
                var subs_pp2 = m_scgraph.find_input(graph, subs_pp1, m_subs.POSTPROCESSING);
                m_scgraph.set_texel_size_mult(subs_pp1, dof_power);
                m_scgraph.set_texel_size_mult(subs_pp2, dof_power);
            }

            break;

        case m_subs.OUTLINE:
            batch = m_batch.create_outline_batch();
            var subs_outline_blur_y = m_scgraph.find_input(graph, subs,
                    m_subs.POSTPROCESSING);
            var subs_outline_blur_x = m_scgraph.find_input(graph, subs_outline_blur_y,
                    m_subs.POSTPROCESSING);
            var subs_outline_extend_y = m_scgraph.find_input(graph, subs_outline_blur_x,
                    m_subs.POSTPROCESSING);
            var subs_outline_extend_x = m_scgraph.find_input(graph, subs_outline_extend_y,
                    m_subs.POSTPROCESSING);

            // set blur strength for 2 subscenes
            m_scgraph.set_texel_size_mult(subs_outline_blur_x, subs.blur_texel_size_mult);
            m_scgraph.set_texel_size_mult(subs_outline_blur_y, subs.blur_texel_size_mult);

            // set extend strength for 2 subscenes
            m_scgraph.set_texel_size_mult(subs_outline_extend_x,
                    subs.ext_texel_size_mult * subs.outline_factor);
            m_scgraph.set_texel_size_mult(subs_outline_extend_y,
                    subs.ext_texel_size_mult * subs.outline_factor);

            break;

        case m_subs.GLOW_COMBINE:
            batch = m_batch.create_glow_combine_batch();
            break;

        case m_subs.COMPOSITING:
            batch = m_batch.create_compositing_batch();
            break;

        case m_subs.ANTIALIASING:
            batch = m_batch.create_antialiasing_batch(subs);
            break;

        case m_subs.SMAA_RESOLVE:
        case m_subs.SMAA_EDGE_DETECTION:
        case m_subs.SMAA_BLENDING_WEIGHT_CALCULATION:
        case m_subs.SMAA_NEIGHBORHOOD_BLENDING:
            batch = m_batch.create_smaa_batch(subs.type);
            break;

        case m_subs.STEREO:
            batch = m_batch.create_stereo_batch(subs.subtype);
            break;

        case m_subs.SKY:
            batch = m_batch.create_cube_sky_batch(scene, subs,
                    subs.procedural_skydome);
            break;
        case m_subs.LUMINANCE:
            batch = m_batch.create_luminance_batch();

            break;
        case m_subs.AVERAGE_LUMINANCE:

            batch = m_batch.create_average_luminance_batch();

            break;
        case m_subs.LUMINANCE_TRUNCED:
            batch = m_batch.create_luminance_trunced_batch();

            break;
        case m_subs.BLOOM_BLUR:
            batch = m_batch.create_bloom_blur_batch();

            break;
        case m_subs.BLOOM:

            var subs_blur_y = m_scgraph.find_input(graph, subs, m_subs.BLOOM_BLUR);
            var subs_blur_x = m_scgraph.find_input(graph, subs_blur_y, m_subs.BLOOM_BLUR);

            // set blur strength for 2 subscenes
            m_scgraph.set_texel_size_mult(subs_blur_y, subs.bloom_blur);
            m_scgraph.set_texel_size_mult(subs_blur_x, subs.bloom_blur);

            batch = m_batch.create_bloom_combine_batch();

            break;

        case m_subs.VELOCITY:
            batch = m_batch.create_velocity_batch();
            break;
        case m_subs.ANCHOR_VISIBILITY:
            batch = m_batch.create_anchor_visibility_batch();
            break;
        case m_subs.PERFORMANCE:
            batch = m_batch.create_performance_batch();
            break;
        }

        if (batch) {
            var rb = m_subs.init_bundle(batch, m_obj_util.create_render("NONE"));
            m_subs.append_draw_data(subs, rb);
            connect_textures(graph, subs, batch);
            check_batch_textures_number(batch);
        }
    });
}

function connect_textures(graph, subs, batch) {
    var id = m_graph.node_by_attr(graph, subs);

    // release unused textures from previous subscenes
    m_graph.traverse_inputs(graph, id, function(id_in, attr_in,
            attr_edge) {

        var slink = attr_edge;
        var subs_in = attr_in;

        if (!slink.active)
            return;

        switch (slink.from) {
        case "COLOR":
        case "CUBEMAP":
            var tex = subs_in.camera.color_attachment;
            break;
        case "DEPTH":
            var tex = subs_in.camera.depth_attachment;
            break;
        case "SCREEN":
            var tex = null;
            break;
        case m_subs.MAIN_CUBE_REFLECT:
            return;
        default:
            m_util.panic("Wrong slink");
        }

        switch (slink.to) {
        case "COLOR":
        case "CUBEMAP":
        case "DEPTH":
        case "NONE":
        case "SCREEN":
        case "OFFSCREEN":
        case "RESOLVE":
        case "COPY":
        case "u_cube_reflection": // NOTE: set in update_batch_subs()
        case "u_plane_reflection": // NOTE: set in update_batch_subs()
            // nothing
            break;
        default:

            if (!tex)
                m_util.panic("Connection of SCREEN is forbidden");

            if (tex.w_renderbuffer)
                m_util.panic("Batch texture can't use renderbuffer");

            if (m_shaders.check_uniform(batch.shader, slink.to))
                m_batch.append_texture(batch, tex, slink.to);

            break;
        }
    });

    for (var i = 0; i < subs.slinks_internal.length; i++) {
        var slink = subs.slinks_internal[i];
        var tex = subs.textures_internal[i];

        switch (slink.to) {
        case "COLOR":
        case "CUBEMAP":
        case "DEPTH":
        case "NONE":
        case "SCREEN":
        case "OFFSCREEN":
        case "RESOLVE":
        case "COPY":
            // nothing
            break;
        default:

            if (tex.w_renderbuffer)
                m_util.panic("Batch texture can't use renderbuffer");

            if (m_shaders.check_uniform(batch.shader, slink.to))
                m_batch.append_texture(batch, tex, slink.to);

            break;
        }
    }
}


/**
 * Extract batches from the object and add to subscenes
 * @methodOf scenes
 */
exports.append_object = function(scene, obj, copy) {
    var type = obj.type;

    switch (type) {
    case "MESH":
    case "LINE":
    case "WORLD":
        var graph = scene._render.graph;
        var obj_render = obj.render;

        if (!m_scgraph.find_subs(graph, m_subs.SHADOW_CAST) && obj_render.shadow_receive)
            obj_render.shadow_receive = false;

        var subs_arr = subs_array(scene, OBJECT_SUBSCENE_TYPES);

        if (copy && obj.use_obj_physics)
            m_phy.append_object(obj, scene);

        for (var i = 0; i < subs_arr.length; i++) {
            var subs = subs_arr[i];
            add_object_sub(subs, obj, graph, scene, copy);
        }
        break;
    case "LAMP":
        update_lamp_scene(obj, scene);
        m_obj.sort_lamps(scene);
        break;
    default:
        break;
    }

    m_obj_util.scene_data_set_active(obj, true, scene);
}

exports.update_world_texture = update_world_texture;
function update_world_texture(scene) {
    if (scene && scene._render && scene._render.graph) {
        var subs_sky = m_scgraph.find_subs(scene._render.graph, m_subs.SKY);
        if (subs_sky)
            update_sky(scene, subs_sky);
    }
}

/**
 * Filter batch to pass given subscene
 */
function add_object_sub(subs, obj, graph, bpy_scene, copy) {
    switch(subs.type) {
    case m_subs.MAIN_OPAQUE:
        add_object_subs_main(subs, obj, graph, "OPAQUE", bpy_scene, copy);
        break;
    case m_subs.MAIN_BLEND:
        add_object_subs_main(subs, obj, graph, "BLEND", bpy_scene, copy);
        break;
    case m_subs.MAIN_XRAY:
        add_object_subs_main(subs, obj, graph, "XRAY", bpy_scene, copy);
        break;
    case m_subs.MAIN_GLOW:
        add_object_subs_main(subs, obj, graph, "GLOW", bpy_scene, copy);
        break;
    case m_subs.MAIN_PLANE_REFLECT:
    case m_subs.MAIN_CUBE_REFLECT:
        add_object_subs_reflect(subs, obj, graph, false, bpy_scene, copy);
        break;
    case m_subs.MAIN_PLANE_REFLECT_BLEND:
    case m_subs.MAIN_CUBE_REFLECT_BLEND:
        add_object_subs_reflect(subs, obj, graph, true, bpy_scene, copy);
        break;
    case m_subs.SHADOW_RECEIVE:
        add_object_subs_shadow_receive(subs, obj, graph, bpy_scene, copy);
        break;
    case m_subs.SHADOW_CAST:
        add_object_subs_shadow(subs, obj, graph, bpy_scene, copy);
        break;
    case m_subs.COLOR_PICKING:
        add_object_subs_color_picking(subs, obj, graph, bpy_scene, copy);
        break;
    case m_subs.COLOR_PICKING_XRAY:
        add_object_subs_color_picking(subs, obj, graph, bpy_scene, copy);
        break;
    case m_subs.OUTLINE_MASK:
        add_object_subs_outline_mask(subs, obj, graph, bpy_scene, copy);
        break;
    case m_subs.GRASS_MAP:
        add_object_subs_grass_map(subs, obj, bpy_scene, copy);
        break;
    case m_subs.DEBUG_VIEW:
        add_object_subs_debug_view(subs, obj, graph, bpy_scene, copy);
        break;
    default:
        break;
    }
}

/**
 * Add object to main scene
 */
function add_object_subs_main(subs, obj, graph, main_type, scene, copy) {

    var obj_render = obj.render;
    var sc_data = m_obj_util.get_scene_data(obj, scene);

    // divide obj by batches
    var batches = sc_data.batches;
    for (var i = 0; i < batches.length; i++) {

        var batch = batches[i];

        if (batch.shadow_cast_only || batch.reflexible_only)
            continue;

        if (batch.type != "MAIN" && batch.type != "NODES_GLOW"
                && batch.type != "PARTICLES" && batch.type != "LINE")
            continue;

        if (!(batch.subtype == "OPAQUE" && main_type == "OPAQUE" ||
                batch.subtype == "BLEND" && main_type == "BLEND" ||
                batch.subtype == "XRAY" && main_type == "XRAY" ||
                batch.type == "NODES_GLOW" && main_type == "GLOW"))
            continue;

        if (!copy) {
            update_batch_subs(batch, subs, obj, graph, main_type, scene);
            if (!m_batch.update_shader(batch)) {
                if (m_version.type() === "DEBUG") {
                    m_batch.apply_shader(batch, "error.glslv", "error.glslf")
                    m_batch.update_shader(batch);
                } else
                    continue;
            }
        }
        var rb = m_subs.init_bundle(batch, obj_render);
        m_subs.append_draw_data(subs, rb);

        connect_textures(graph, subs, batch);
        check_batch_textures_number(batch);
    }
}

function update_batch_subs(batch, subs, obj, graph, main_type, bpy_scene) {
    var obj_render = obj.render;
    var sc_render = bpy_scene._render;
    var scene_data = m_obj_util.get_scene_data(obj, bpy_scene);

    var shadow_usage = "NO_SHADOWS";
    var subs_cast_arr = subs_array(bpy_scene, [m_subs.SHADOW_CAST]);
    if (subs_cast_arr.length && batch.shadow_receive) {
        switch (main_type) {
        case "OPAQUE":
            shadow_usage = "SHADOW_MAPPING_OPAQUE";
            break;
        case "BLEND":
        case "XRAY":
            shadow_usage = "SHADOW_MAPPING_BLEND";
            break;
        case "COLOR_ID":
        case "REFLECT":
        case "GLOW":
            shadow_usage = "NO_SHADOWS";
            break;
        case "SHADOW":
            shadow_usage = "SHADOW_MASK_GENERATION";
            break;
        default:
            m_util.panic("Wrong subscene type");
        }

        for (var i = 0; i < subs_cast_arr.length; i++)
            m_batch.assign_shadow_receive_dirs(batch, bpy_scene._render.shadow_params, subs_cast_arr[i]);
    }
    var blur_samples = "NO_SOFT_SHADOWS";
    if (sc_render.shadow_params && sc_render.shadow_params.soft_shadows)
        switch(cfg_def.blur_samples) {
        case "16x":
            blur_samples = "POISSON_X_16";
            break;
        case "8x":
            blur_samples = "POISSON_X_8";
            break;
        case "4x":
            blur_samples = "POISSON_X_4";
            break;
        }
    var shaders_info = batch.shaders_info;
    m_shaders.set_directive(shaders_info, "SHADOW_USAGE", shadow_usage);
    m_shaders.set_directive(shaders_info, "POISSON_DISK_NUM", blur_samples);

    if (batch.dynamic_grass) {
        var subs_grass_map = m_scgraph.find_subs(graph, m_subs.GRASS_MAP);
        if (subs_grass_map)
            prepare_dynamic_grass_batch(batch, subs_grass_map, obj_render);
    }

    if ((batch.type == "SHADOW" || main_type == "COLOR_ID") && !batch.has_nodes)
        return;

    var num_lights = subs.num_lights;
    m_shaders.set_directive(shaders_info, "NUM_LIGHTS", num_lights);
    var num_lfac = num_lights % 2 == 0 ? num_lights / 2:
                                         Math.floor(num_lights / 2) + 1;
    m_shaders.set_directive(shaders_info, "NUM_LFACTORS", num_lfac);

    m_shaders.set_directive(shaders_info, "REFLECTION_PASS", "REFL_PASS_NONE");

    m_shaders.set_directive(shaders_info, "SSAO_ONLY", 0);
    m_shaders.set_directive(shaders_info, "INVERT_FRONTFACING", 0);

    var wp = sc_render.water_params;
    if (wp) {
        m_shaders.set_directive(shaders_info, "WATER_EFFECTS", 1);
        m_shaders.set_directive(shaders_info, "WAVES_HEIGHT", m_shaders.glsl_value(wp.waves_height));
        m_shaders.set_directive(shaders_info, "WAVES_LENGTH", m_shaders.glsl_value(wp.waves_length));
        m_shaders.set_directive(shaders_info, "WATER_LEVEL", m_shaders.glsl_value(wp.water_level));
    }

    if (subs.caustics && obj_render.caustics) {
        m_shaders.set_directive(shaders_info, "CAUSTICS", 1);

        var sh_params = sc_render.shadow_params;
        if (sh_params) {
            var ltypes = sh_params.lamp_types;
            var sun_num = 0;
            for (var i = 0; i < ltypes.length; i++)
                if (ltypes[i] == "SUN")
                    sun_num = i;

            m_shaders.set_directive(shaders_info, "SUN_NUM", sun_num);
        }

        m_shaders.set_directive(shaders_info, "CAUST_SCALE", m_shaders.glsl_value(subs.caust_scale));
        m_shaders.set_directive(shaders_info, "CAUST_SPEED", m_shaders.glsl_value(subs.caust_speed, 2));
        m_shaders.set_directive(shaders_info, "CAUST_BRIGHT", m_shaders.glsl_value(subs.caust_brightness));
    }

    var subs_cube_refl = scene_data.cube_refl_subs;
    var subs_plane_refl = scene_data.plane_refl_subs;

    if (batch.texture_names.indexOf("u_mirrormap") !== -1) {
        m_shaders.set_directive(shaders_info, "REFLECTION_TYPE", "REFL_MIRRORMAP");
    } else if (batch.reflective && subs_cube_refl) {
        var tex = subs_cube_refl.camera.color_attachment;
        m_batch.append_texture(batch, tex, "u_cube_reflection");
        m_shaders.set_directive(shaders_info, "REFLECTION_TYPE", "REFL_CUBE");
    } else if (batch.reflective && subs_plane_refl) {
        for (var i = 0; i < subs_plane_refl.length; i++) {
            var tex = subs_plane_refl[i].camera.color_attachment;
            m_batch.append_texture(batch, tex, "u_plane_reflection");
            m_shaders.set_directive(shaders_info, "REFLECTION_TYPE", "REFL_PLANE");
        }
    } else {
        m_shaders.set_directive(shaders_info, "REFLECTION_TYPE", "REFL_NONE");
    }

    var subs_sky = m_scgraph.find_subs(graph, m_subs.SKY);

    if (subs_sky) {
        if (batch.draw_proc_sky) {
            var tex = subs_sky.camera.color_attachment;
            m_batch.append_texture(batch, tex, "u_sky");
        } else if (subs_sky.procedural_skydome) {
            // by link
            batch.cube_fog = subs_sky.cube_fog;
            m_shaders.set_directive(shaders_info, "PROCEDURAL_FOG", 1);
        }
    } else {
        m_shaders.set_directive(shaders_info, "PROCEDURAL_FOG", 0);
    }

    var wls = sc_render.world_light_set;
    if (wls.use_environment_light) {
        m_shaders.set_directive(shaders_info, "USE_ENVIRONMENT_LIGHT", 1);
        if (wls.environment_color == "SKY_TEXTURE") {
            // it's safe, honestly - it's being checked in the get_world_light_set()
            var tex = null;
            if (wls.environment_texture_slot)
                tex = m_tex.get_batch_texture(wls.environment_texture_slot, false);
            else if (subs_sky)
                tex = subs_sky.camera.color_attachment;

            m_shaders.set_directive(shaders_info, "SKY_TEXTURE", 1);
            m_batch.append_texture(batch, tex, "u_sky_texture");
        } else if (wls.environment_color == "SKY_COLOR")
            m_shaders.set_directive(shaders_info, "SKY_COLOR", 1);
    }

    var wfs = sc_render.world_fog_set;
    if (wfs.use_fog) {
        m_shaders.set_directive(shaders_info, "USE_FOG", 1);
        m_shaders.set_directive(shaders_info, "FOG_TYPE", wfs.falloff);
    }

    if (batch.refractive && batch.blend) {
        // TODO: Too many directives. Refactoring needed
        if (cfg_def.depth_tex_available)
            m_shaders.set_directive(shaders_info, "USE_REFRACTION_CORRECTION", 1);
        if (batch.type == "MAIN" && batch.has_nodes
                || batch.type == "NODES_GLOW") {
            m_shaders.set_directive(shaders_info, "REFRACTIVE", 1);
            if (sc_render.refractions)
                m_shaders.set_directive(shaders_info, "USE_REFRACTION", 1);
            else
                m_shaders.set_directive(shaders_info, "USE_REFRACTION", 0);
        } else {
            if (sc_render.refractions)
                m_shaders.set_directive(shaders_info, "REFRACTIVE", 1);
            else
                m_shaders.set_directive(shaders_info, "REFRACTIVE", 0);
        }
        if (sc_render.materials_params.refractions || sc_render.refractions)
            m_shaders.set_directive(shaders_info, "HAS_REFRACT_TEXTURE", 1);
    } else {
        m_shaders.set_directive(shaders_info, "REFRACTIVE", 0);
        m_shaders.set_directive(shaders_info, "USE_REFRACTION", 0);
        m_shaders.set_directive(shaders_info, "USE_REFRACTION_CORRECTION", 0);
    }

    if (batch.water) {
        if (cfg_def.shore_smoothing && batch.water_shore_smoothing
                && m_scgraph.find_subs(graph, m_subs.DEPTH_PACK)) {
            m_shaders.set_directive(shaders_info, "SHORE_SMOOTHING", 1);
        } else
            m_shaders.set_directive(shaders_info, "SHORE_SMOOTHING", 0);

        if (batch.water_dynamic && wp && wp.waves_height)
            m_shaders.set_directive(shaders_info, "DYNAMIC", 1);
        else
            m_shaders.set_directive(shaders_info, "DYNAMIC", 0);
    }

    if (batch.type == "PARTICLES") {
        m_shaders.set_directive(shaders_info, "SIZE_RAMP_LENGTH",
                batch.particles_data.size_ramp_length);
        m_shaders.set_directive(shaders_info, "COLOR_RAMP_LENGTH",
                batch.particles_data.color_ramp_length);
    }

    // NOTE: temoporary disabled T2X mode due to artifacts with blend objects
    //if (cfg_def.smaa && !m_cfg.context.alpha)
    //    m_shaders.set_directive(shaders_info, "SMAA_JITTER", 1);

    // update scenes graph according to RTT arrangement
    if (!batch.forked_batch) {
        var textures = batch.textures;
        for (var j = 0; j < textures.length; j++) {
            var tex = textures[j];

            if (tex.source == "SCENE")
                for (var k = 0; k < _scenes.length; k++) {
                    var scene_k = _scenes[k];
                    var rtt = _scenes[k]._render_to_textures;
                    for (var l = 0; l < rtt.length; l++)
                        if (rtt[l]._render == tex)
                            m_graph.append_edge_attr(_scenes_graph, scene_k, bpy_scene, null);
                }
        }
    }
}

function check_batch_textures_number(batch) {
    if (batch.textures.length > MAX_BATCH_TEXTURES)
        m_print.warn(batch.type, "too many textures used - " +
            batch.textures.length + " (max " + MAX_BATCH_TEXTURES +
            "), materials \"" + batch.material_names.join(", ") + "\"");
}

function prepare_dynamic_grass_batch(batch, subs_grass_map, obj_render) {
    // by link
    batch.grass_map_dim = subs_grass_map.grass_map_dim;

    var low = subs_grass_map.grass_map_dim[0];
    var high = subs_grass_map.grass_map_dim[1];
    var size = subs_grass_map.grass_map_dim[2];

    var bb = obj_render.bb_local;
    var bb_max_size = Math.max(bb.max_x - bb.min_x, bb.max_y - bb.min_y);

    if (size == 0)
        size = bb_max_size;
    else
        size = Math.max(size, bb_max_size);

    // store back, affects batch and subs grass map
    subs_grass_map.grass_map_dim[2] = size;

    // update grass map camera
    var cam = subs_grass_map.camera;
    m_cam.set_frustum(cam, size/2, -high, -low, size/2);
    m_cam.set_projection(cam);

    var bsize = batch.grass_size || 0;
    if (bsize == 0)
        bsize = bb_max_size;
    else
        bsize = Math.max(bsize, bb_max_size);
    batch.grass_size = bsize;
}

/**
 * Add object to main scene
 */
function add_object_subs_shadow_receive(subs, obj, graph, scene, copy) {
    // divide obj by batches
    var sc_data = m_obj_util.get_scene_data(obj, scene);
    var batches = sc_data.batches;

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];

        if (batch.type != "SHADOW" || batch.subtype != "RECEIVE" ||
                !batch.shadow_receive)
            continue;

        if (!copy) {
            update_batch_subs(batch, subs, obj, graph, "SHADOW", scene);
            if (!m_batch.update_shader(batch))
                continue;
        }

        var rb = m_subs.init_bundle(batch, obj.render);
        m_subs.append_draw_data(subs, rb)

        connect_textures(graph, subs, batch);
        check_batch_textures_number(batch);
    }
}

function add_object_subs_shadow(subs, obj, graph, scene, copy) {
    var update_needed = false;
    var obj_render = obj.render;
    var sc_data = m_obj_util.get_scene_data(obj, scene);
    var batches = sc_data.batches;

    var subs_grass_map = m_scgraph.find_subs(graph, m_subs.GRASS_MAP);

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];

        if (batch.type != "SHADOW")
            continue;

        if (batch.subtype != "CAST")
            continue;

        update_needed = true;

        if (!copy) {
            var num_lights = subs.num_lights;
            m_batch.set_batch_directive(batch, "NUM_LIGHTS", num_lights);
            var num_lfac = num_lights % 2 == 0 ? num_lights / 2:
                                                 Math.floor(num_lights / 2) + 1;
            m_batch.set_batch_directive(batch, "NUM_LFACTORS", num_lfac);

            m_shaders.set_directive(batch.shaders_info, "SHADOW_USAGE", "SHADOW_CASTING");

            if (batch.dynamic_grass && subs_grass_map)
                prepare_dynamic_grass_batch(batch, subs_grass_map, obj_render);

            m_batch.set_batch_directive(batch, "SHADOW_TEX_RES",
                    m_shaders.glsl_value(
                    scene._render.shadow_params.csm_resolution));

            if (!m_batch.update_shader(batch))
                continue;
        }

        var rb = m_subs.init_bundle(batch, obj_render);
        m_subs.append_draw_data(subs, rb)
    }

    if (update_needed) {
        var sh_params = scene._render.shadow_params;
        var subs_main = m_scgraph.find_subs(graph, m_subs.MAIN_OPAQUE);
        update_subs_shadow(subs, scene, subs_main.camera, sh_params,
                           true);
    }
}

function add_object_subs_reflect(subs, obj, graph, is_blend_subs, scene, copy) {
    var obj_render = obj.render;
    var sc_data = m_obj_util.get_scene_data(obj, scene);
    var batches = sc_data.batches;

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];

        if (batch.type != "MAIN" && batch.type != "PARTICLES" && batch.type != "LINE")
            continue;

        if (batch.subtype != "REFLECT")
            continue;

        if (batch.blend != is_blend_subs)
            continue;

        // do not render reflected object on itself
        if (subs.type == m_subs.MAIN_PLANE_REFLECT ||
                subs.type == m_subs.MAIN_PLANE_REFLECT_BLEND) {
            var refl_id = get_plane_refl_id_by_subs(scene, subs);
            if (refl_id == obj_render.plane_reflection_id)
                continue;
        } else {
            var refl_id = get_cube_refl_id_by_subs(scene, subs);
            if (refl_id == obj_render.cube_reflection_id)
                continue;
        }

        if (!copy) {
            update_batch_subs(batch, subs, obj, graph, "REFLECT", scene);
            var shaders_info = batch.shaders_info;

            m_shaders.set_directive(shaders_info, "WATER_EFFECTS", 0);

            if (subs.type == m_subs.MAIN_PLANE_REFLECT ||
                    subs.type == m_subs.MAIN_PLANE_REFLECT_BLEND)
                m_shaders.set_directive(shaders_info, "REFLECTION_PASS", "REFL_PASS_PLANE");
            else
                m_shaders.set_directive(shaders_info, "REFLECTION_PASS", "REFL_PASS_CUBE");

            // disable normalmapping in shader for optimization purposes
            m_shaders.set_directive(shaders_info, "TEXTURE_NORM", 0);

            // invert gl_FrontFacing vector for plane reflections
            if (subs.type == m_subs.MAIN_PLANE_REFLECT)
                m_shaders.set_directive(shaders_info, "INVERT_FRONTFACING", 1);

            if (!m_batch.update_shader(batch)) {
                if (m_version.type() === "DEBUG") {
                    m_batch.apply_shader(batch, "error.glslv", "error.glslf")
                    m_batch.update_shader(batch);
                } else
                    continue;
            }
        }

        var rb = m_subs.init_bundle(batch, obj_render);
        m_subs.append_draw_data(subs, rb)

        // NOTE: temoporary disabled T2X mode due to artifacts with blend objects
        //if (cfg_def.smaa && !m_cfg.context.alpha)
        //    m_shaders.set_directive(shaders_info, "SMAA_JITTER", 1);
    }
}

exports.schedule_shadow_update = schedule_shadow_update;
/**
 * Schedule update of shadow subscenes on given bpy scene.
 * @methodOf scenes
 */
function schedule_shadow_update(bpy_scene) {
    bpy_scene._render.need_shadow_update = true;
}

/**
 * Update all shadow subscenes on active scene
 */
function update_shadow_subscenes(bpy_scene) {

    reset_shadow_cam_vm(bpy_scene);
    // also update shadow subscene camera
    var subs_main = get_subs(bpy_scene, m_subs.MAIN_OPAQUE);

    var graph = bpy_scene._render.graph;
    var recalc_z_bounds = true;
    var sh_params = bpy_scene._render.shadow_params

    m_graph.traverse(graph, function(node, attr) {
        var subs = attr;
        if (subs.type === m_subs.SHADOW_CAST) {
            update_subs_shadow(subs, bpy_scene, subs_main.camera, sh_params,
                               recalc_z_bounds);
            recalc_z_bounds = false;
        }
    });
}

function enable_outline_draw(scene) {
    var graph = scene._render.graph;
    m_graph.traverse(graph, function(node, subs) {
        if (subs.type === m_subs.OUTLINE)
            subs.draw_outline_flag = 1;
    });
}

/**
 * uses _vec3_tmp
 */
exports.update_shadow_billboard_view = function(cam_main, graph) {
    m_graph.traverse(graph, function(node, attr) {
        var subs = attr;
        if (subs.type === m_subs.SHADOW_CAST) {
            // NOTE: inherit light camera eye from main camera (used in LOD calculations)
            // and cylindrical billboarding shadows
            var eye = m_tsr.get_trans(cam_main.world_tsr, _vec3_tmp);
            m_tsr.set_trans(eye, subs.camera.world_tsr);
            // NOTE: inherit view_tsr from main camera
            m_tsr.copy(cam_main.view_tsr,
                    subs.camera.shadow_cast_billboard_view_tsr);
        }
    });
}

/**
 * Update shadow subscene camera based on main subscene light.
 * uses _vec3_tmp, _mat4_tmp, _corners_cache
 */
function update_subs_shadow(subs, scene, cam_main, sh_params,
                            recalc_z_bounds) {

    if (subs.draw_data.length == 0)
        return;

    var cam = subs.camera;
    // NOTE: inherit light camera eye from main camera (used in LOD calculations)
    // and cylindrical billboarding shadows
    var eye = m_tsr.get_trans(cam_main.world_tsr, _vec3_tmp);
    m_tsr.set_trans(eye, cam.world_tsr);
    // NOTE: inherit view_tsr from main camera
    m_tsr.copy(cam_main.view_tsr, cam.shadow_cast_billboard_view_tsr);
    if (sh_params.lamp_types[subs.shadow_lamp_index] === "SUN"
            || sh_params.lamp_types[subs.shadow_lamp_index] === "HEMI") {
        // determine camera frustum for shadow casting
        var bb_world = get_shadow_casters_bb(subs, _bb_tmp);
        var bb_corners = m_bounds.extract_bb_corners(bb_world, _corners_cache);
        // transform bb corners to light view space
        m_util.positions_multiply_matrix(bb_corners, cam.view_matrix, bb_corners);

        if (sh_params.enable_csm) {
            // calculate world center and radius
            var center = m_vec3.copy(cam_main.csm_centers[subs.csm_index], _vec3_tmp);
            var main_view_inv = m_mat4.invert(cam_main.view_matrix, _mat4_tmp);

            m_util.positions_multiply_matrix(center, main_view_inv, center);

            // transform sphere center to light view space
            m_util.positions_multiply_matrix(center, cam.view_matrix, center);

            var radius = cam_main.csm_radii[subs.csm_index];

            // get minimum z value for bounding box from light camera for all casters
            if (recalc_z_bounds) {
                _shadow_cast_min_z = 0;
                _shadow_cast_max_z = -Infinity;
                for (var i = 2; i < bb_corners.length; i+=3) {
                    _shadow_cast_min_z = Math.min(_shadow_cast_min_z, bb_corners[i]);
                    _shadow_cast_max_z = Math.max(_shadow_cast_max_z, bb_corners[i]);
                }
            }

            var bb_view = _bb_tmp;
            bb_view.max_x = center[0] + radius;
            bb_view.max_y = center[1] + radius;
            bb_view.max_z = _shadow_cast_max_z;

            bb_view.min_x = center[0] - radius;
            bb_view.min_y = center[1] - radius; 
            bb_view.min_z = _shadow_cast_min_z;
        } else {
            var bb_view = _bb_tmp;
            var optimal_angle = get_optimal_bb_and_angle(bb_corners, bb_view);
            if (optimal_angle > 0) {
                var rot_mat = m_mat4.identity(_mat4_tmp);
                m_mat4.rotate(rot_mat, optimal_angle, m_util.AXIS_MZ, rot_mat);
                m_mat4.multiply(rot_mat, cam.view_matrix, cam.view_matrix);
                m_tsr.from_mat4(cam.view_matrix, cam.view_tsr);
            }
            bb_view = correct_bb_proportions(bb_view);

            // NOTE: it's not optimal method to update shadow cam quat
            // on shadow receive subs
            update_shadow_receive_subs(subs, scene._render.graph);
        }
        m_cam.set_frustum_asymmetric(cam, bb_view.min_x, bb_view.max_x,
                bb_view.min_y, bb_view.max_y, -bb_view.max_z, -bb_view.min_z);
        m_cam.set_projection(cam);
        m_util.extract_frustum_planes(cam.view_proj_matrix, cam.frustum_planes);
    } else if (sh_params.lamp_types[subs.shadow_lamp_index] === "SPOT"
            || sh_params.lamp_types[subs.shadow_lamp_index] === "POINT") {
        m_cam.set_projection(cam, cam.aspect);
    }
}

exports.update_shadow_receive_subs = update_shadow_receive_subs;
function update_shadow_receive_subs(subs, graph) {
    var cam_cast = subs.camera;
    var outputs = m_scgraph.get_outputs(graph, subs);
    for (var i = 0; i < outputs.length; i++) {
        var output = outputs[i];

        // NOTE: it's for debug_subs
        if (output.type != m_subs.MAIN_OPAQUE && output.type != m_subs.SHADOW_RECEIVE
                && output.type != m_subs.MAIN_BLEND && output.type != m_subs.MAIN_XRAY)
            continue;

        if (cfg_def.mac_os_shadow_hack)
            output.v_light_tsr.set(cam_cast.view_tsr, subs.shadow_lamp_index * 9);
        else {
            var view_trans = m_tsr.get_trans_view(cam_cast.view_tsr);
            var scale = m_tsr.get_scale(cam_cast.view_tsr);
            var quat = m_tsr.get_quat_view(cam_cast.view_tsr);

            m_vec4.set(view_trans[0], view_trans[1], view_trans[2], scale, _vec4_tmp);
            output.v_light_ts.set(_vec4_tmp, subs.shadow_lamp_index * 4);
            output.v_light_r.set(quat, subs.shadow_lamp_index * 4);
        }
    }
}
/**
 * Get optimal bounding box in light space (smallest cross
 * sectional area seen from the light source) and angle for light rotation
 * uses _mat4_tmp, _corners_cache2, _bb_tmp2
 * @methodOf scenes
 */
function get_optimal_bb_and_angle(bb_corners, bb_dest) {
    var rot_corners = _corners_cache2;
    rot_corners.set(bb_corners);

    var angle_delta = MAX_OPTIMAL_BB_ANGLE / (OPTIMAL_BB_COUNT - 1);

    var rot_mat = m_mat4.identity(_mat4_tmp);
    m_mat4.rotate(rot_mat, angle_delta, m_util.AXIS_MZ, rot_mat);

    var min = -1;
    var min_index = -1;
    for (var i = 0; i < OPTIMAL_BB_COUNT; i++) {
        var bb_all = m_bounds.bb_from_coords(rot_corners, _bb_tmp2);
        var S = (bb_all.max_x - bb_all.min_x) * (bb_all.max_y - bb_all.min_y);

        if (min == -1 || S < min) {
            min = S;
            min_index = i;
            m_bounds.copy_bb(bb_all, bb_dest);
        }
        m_util.positions_multiply_matrix(rot_corners, rot_mat, rot_corners);
    }

    return min_index * angle_delta;
}

function correct_bb_proportions(bb) {
    var x = bb.max_x - bb.min_x;
    var y = bb.max_y - bb.min_y;

    if (x && y) {
        var diff = Math.abs(x - y) / 2;
        if (x/y > MAX_SHADOW_CAST_BB_PROPORTION) {
            bb.max_y += diff;
            bb.min_y -= diff;
        } else if (y/x > MAX_SHADOW_CAST_BB_PROPORTION) {
            bb.max_x += diff;
            bb.min_x -= diff;
        }
    }

    bb.max_x += SHADOW_MAP_EPSILON_XY;
    bb.max_y += SHADOW_MAP_EPSILON_XY;
    bb.max_z += SHADOW_MAP_EPSILON_Z;
    bb.min_x -= SHADOW_MAP_EPSILON_XY;
    bb.min_y -= SHADOW_MAP_EPSILON_XY;
    bb.min_z -= SHADOW_MAP_EPSILON_Z;

    return bb;
}

function get_shadow_casters_bb(subs, dest) {
    m_bounds.zero_bounding_box(dest);

    for (var i = 0; i < subs.draw_data.length; i++) {
        var bundles = subs.draw_data[i].bundles;
        for (var j = 0; j < bundles.length; j++) {
            // not all casters will be unique
            var render = bundles[j].obj_render;

            if (i == 0 && j == 0)
                m_bounds.copy_bb(render.bb_world, dest);
            else
                m_bounds.expand_bounding_box(dest, render.bb_world);
        }
    }

    return dest;
}

exports.get_csm_borders = get_csm_borders;
/**
 * @methodOf scenes
 */
function get_csm_borders(scene, cam) {
    var shs = scene._render.shadow_params;

    var rslt = new Float32Array(shs.csm_num);
    for (var i = 0; i < shs.csm_num; i++)
        rslt[i] = m_cam.csm_far_plane(shs, cam, i);

    return rslt;
}

function add_object_subs_color_picking(subs, obj, graph, scene, copy) {

    var obj_render = obj.render;
    var sc_data = m_obj_util.get_scene_data(obj, scene);
    var batches = sc_data.batches;

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];

        if (batch.type != "COLOR_ID")
            continue;

        if (!(subs.type == m_subs.COLOR_PICKING && batch.subtype == "COLOR_ID" ||
                subs.type == m_subs.COLOR_PICKING_XRAY && batch.subtype == "COLOR_ID_XRAY"))
            continue;

        if (!copy) {
            update_batch_subs(batch, subs, obj, graph, "COLOR_ID", scene);
            m_batch.set_batch_directive(batch, "USE_OUTLINE", 0);
            if (!m_batch.update_shader(batch))
                continue;
        }

        var rb = m_subs.init_bundle(batch, obj_render);
        m_subs.append_draw_data(subs, rb)
    }
}

function add_object_subs_debug_view(subs, obj, graph, scene, copy) {

    var obj_render = obj.render;
    var sc_data = m_obj_util.get_scene_data(obj, scene);
    var batches = sc_data.batches;

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];

        if (batch.type != "DEBUG_VIEW")
            continue;

        append_debug_view_batch(subs, obj_render, graph, copy, batch);
    }

}

exports.append_debug_view_batch = append_debug_view_batch;
function append_debug_view_batch(subs, obj_render, graph, copy, batch) {
    if (!copy) {
        if (batch.dynamic_grass) {
            var subs_grass_map = m_scgraph.find_subs(graph, m_subs.GRASS_MAP);
            if (subs_grass_map)
                prepare_dynamic_grass_batch(batch, subs_grass_map, obj_render);
        }

        if (!m_batch.update_shader(batch)) {
            if (m_version.type() === "DEBUG") {
                m_batch.apply_shader(batch, "error.glslv", "error.glslf")
                m_batch.update_shader(batch);
            } else
                return;
        }
    }

    var rb = m_subs.init_bundle(batch, obj_render);
    m_subs.append_draw_data(subs, rb)

    connect_textures(graph, subs, batch);
    check_batch_textures_number(batch);
}
/**
 * Add object to depth map scene
 */
function add_object_subs_grass_map(subs, obj, scene, copy) {

    var obj_render = obj.render;
    // divide obj by batches
    var sc_data = m_obj_util.get_scene_data(obj, scene);
    var batches = sc_data.batches;

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];

        if (batch.type != "GRASS_MAP")
            continue;

        if (!copy)
            if (!m_batch.update_shader(batch)) {
                if (m_version.type() === "DEBUG") {
                    m_batch.apply_shader(batch, "error.glslv", "error.glslf")
                    m_batch.update_shader(batch);
                } else
                    continue;
            }

        var rb = m_subs.init_bundle(batch, obj_render);
        m_subs.append_draw_data(subs, rb)

        // recalculate scene camera

        var cam = subs.camera;
        var bb = obj_render.bb_world;

        var low = subs.grass_map_dim[0];
        var high = subs.grass_map_dim[1];
        var size = subs.grass_map_dim[2];

        if (low == 0 && high == 0) {
            // initial exec
            low = bb.min_z;
            high = bb.max_z;
        } else {
            low = Math.min(low, bb.min_z);
            high = Math.max(high, bb.max_z);
        }

        // NOTE: issue for partially plain meshes near top or bottom
        var map_margin = (high - low) * GRASS_MAP_MARGIN;
        low = low - map_margin;
        high = high + map_margin;

        subs.grass_map_dim[0] = low;
        subs.grass_map_dim[1] = high;
        // subs.grass_map_dim[2] stays intact

        m_cam.set_frustum(cam, size/2, -high, -low, size/2);
        m_cam.set_projection(cam);
    }
}

/**
 * Add object to outline mask scene
 */
function add_object_subs_outline_mask(subs, obj, graph, scene, copy) {

    var obj_render = obj.render;
    var sc_data = m_obj_util.get_scene_data(obj, scene);
    var batches = sc_data.batches;

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];

        if (batch.type != "COLOR_ID")
            continue;

        if (batch.subtype != "OUTLINE")
            continue;

        if (!copy) {
            update_batch_subs(batch, subs, obj, graph, "COLOR_ID", scene);
            m_batch.set_batch_directive(batch, "USE_OUTLINE", 1);
            if (!m_batch.update_shader(batch))
                continue;
        }

        var rb = m_subs.init_bundle(batch, obj_render);
        m_subs.append_draw_data(subs, rb)
    }

}

exports.change_visibility_rec = change_visibility_rec;
function change_visibility_rec(obj, hide) {

    change_visibility(obj, hide);

    // TODO: cons_descends array must be replaced with another container for
    // child objects
    for (var i = 0; i < obj.cons_descends.length; i++)
        if (obj.cons_descends[i].parent == obj)
            change_visibility_rec(obj.cons_descends[i], hide);
}

exports.change_visibility = change_visibility;
function change_visibility(obj, hide) {
    obj.render.hide = hide;
    if (m_obj_util.is_lamp(obj))
        for (var i = 0; i < obj.scenes_data.length; i++) {
            var scene_data = obj.scenes_data[i];
            var scene = scene_data.scene;
            var subs_arr = subs_array(scene, LIGHT_SUBSCENE_TYPES);
            for (var j = 0; j < subs_arr.length; j++)
                update_subs_light_factors(obj, scene_data, subs_arr[j]);
        }
}

/**
 * Check if object is hidden
 * @methodOf scenes
 */
exports.is_hidden = function(obj) {
    return obj.render.hide;
}

/**
 * Remove object bundles.
 * @methodOf scenes
 */
exports.remove_object_bundles = function(obj) {

    for (var i = 0; i < obj.scenes_data.length; i++) {
        var scene = obj.scenes_data[i].scene;
        var subscenes = subs_array(scene, OBJECT_SUBSCENE_TYPES);
        
        for (var i = 0; i < subscenes.length; i++) {
            var draw_data = subscenes[i].draw_data;
            for (var j = 0; j < draw_data.length; j++) {
                var bundles = draw_data[j].bundles;
                for (var k = bundles.length - 1; k >= 0; k--) {
                    var bundle = bundles[k];
                    if (bundle.obj_render == obj.render) {
                        if (bundle.batch)
                            m_batch.clear_batch(bundle.batch);
                        bundles.splice(k, 1);
                    }
                }
            }
        }
    }
}

exports.update_lamp_scene_color_intensity = update_lamp_scene_color_intensity;
/**
 * Update light color intensities on subscenes
 */
function update_lamp_scene_color_intensity(lamp, scene) {
    var light = lamp.light;
    var sc_data = m_obj_util.get_scene_data(lamp, scene);
    var ind = sc_data.light_index;
    var subs_arr = subs_array(scene, LIGHT_SUBSCENE_TYPES);
    for (var i = 0; i < subs_arr.length; i++) {
        var subs = subs_arr[i];
        subs.light_color_intensities.set(light.color_intensity, ind * 4);
        subs.need_perm_uniforms_update = true;
    }
}

exports.update_lamp_scene = update_lamp_scene;
/**
 * Update light parameters on subscenes
 */
function update_lamp_scene(lamp, scene) {

    //TODO: better precache this array
    var subs_arr = subs_array(scene, LIGHT_SUBSCENE_TYPES);

    var light = lamp.light;
    var lamp_render = lamp.render;
    var sc_data = m_obj_util.get_scene_data(lamp, scene);
    var ind = sc_data.light_index;
    var trans = m_tsr.get_trans_view(lamp_render.world_tsr);
    var quat = m_tsr.get_quat_view(lamp_render.world_tsr);

    for (var i = 0; i < subs_arr.length; i++) {
        var subs = subs_arr[i];

        update_subs_light_params(lamp, sc_data, subs);

        switch (light.type) {
        case "SUN":
            subs.sun_quaternion.set(quat);
            // by link
            subs.sun_intensity = light.color_intensity;

            if (subs.type === m_subs.SKY) {
                subs.need_fog_update = light.need_sun_fog_update;
                m_vec3.copy(light.direction, subs.sun_direction);
                update_sky(scene, subs);
            } else
                m_vec3.copy(light.direction, subs.sun_direction);
            break
        case "HEMI":
        case "POINT":
        case "SPOT":
            break;
        default:
            // TODO: prevent export of such lamps
            m_print.error("Unknown light type: " + light.type + "\".");
            break;
        }

        var draw_data = subs.draw_data;
        for (var j = 0; j < draw_data.length; j++) {
            var bundles = draw_data[j].bundles;
            for (var k = 0; k < bundles.length; k++) {
                var batch = bundles[k].batch;
                if (batch.lamp_uuid_indexes)
                    m_batch.set_lamp_data(batch, lamp);
            }
        }
    }

    var subs_main = get_subs(scene, m_subs.MAIN_OPAQUE);
    var cam_main = subs_main.camera;
    var shadow_subscenes = sc_data.shadow_subscenes;
    var sh_params = scene._render.shadow_params;

    for (var i = 0; i < shadow_subscenes.length; i++) {
        var subs = shadow_subscenes[i];
        var cam = subs.camera;
        m_cam.set_view_trans_quat(cam, trans, quat);
        update_subs_shadow(subs, scene, cam_main, sh_params, true);
        update_shadow_receive_subs(subs, scene._render.graph);
    }
}

function update_subs_light_params(lamp, sc_data, subs) {
    var lamp_render = lamp.render
    var light = lamp.light;
    var ind = sc_data.light_index;
    var trans = m_tsr.get_trans_view(lamp.render.world_tsr);
    var dir = light.direction;
    var intens = light.color_intensity;

    subs.light_directions.set(light.direction, ind * 3)

    _vec4_tmp[0] = trans[0];
    _vec4_tmp[1] = trans[1];
    _vec4_tmp[2] = trans[2];
    // NOTE: encoding light_factor for diffuse
    _vec4_tmp[3] = light.use_diffuse && !lamp_render.hide ? 1.0 : 0.0;
    subs.light_positions.set(_vec4_tmp, ind * 4);

    _vec4_tmp[0] = intens[0];
    _vec4_tmp[1] = intens[1];
    _vec4_tmp[2] = intens[2];
    // NOTE: encoding light_factor for specular
    _vec4_tmp[3] = light.use_specular && !lamp_render.hide ? 1.0 : 0.0;;
    subs.light_color_intensities.set(_vec4_tmp, ind * 4);

    subs.need_perm_uniforms_update = true;
}

function update_subs_light_factors(lamp, sc_data, subs) {
    var lamp_render = lamp.render
    var light = lamp.light;
    var ind = sc_data.light_index;

    var light_factor = light.use_diffuse && !lamp_render.hide ? 1.0 : 0.0;
    subs.light_positions[ind * 4 + 3] = light_factor;

    light_factor = light.use_specular && !lamp_render.hide ? 1.0 : 0.0;
    subs.light_color_intensities[ind * 4 + 3] = light_factor;

    subs.need_perm_uniforms_update = true;
}

function reset_shadow_cam_vm(bpy_scene) {
    var lamps = m_obj.get_scene_objs(bpy_scene, "LAMP", m_obj.DATA_ID_ALL);

    var use_ssao = cfg_def.ssao && bpy_scene["b4w_enable_ssao"];
    var shadow_lamps = m_obj_util.get_shadow_lamps(lamps, use_ssao);

    if (!shadow_lamps.length)
        return;

    for (var k = 0; k < shadow_lamps.length; k++) {
        var shadow_lamp = shadow_lamps[k];
        var lamp_render = shadow_lamp.render;
        var trans = m_tsr.get_trans(lamp_render.world_tsr, _vec3_tmp);
        var quat = m_tsr.get_quat(lamp_render.world_tsr, _quat4_tmp);

        for (var j = 0; j < shadow_lamp.scenes_data.length; j++) {
            var sc_data = shadow_lamp.scenes_data[j];
            var shadow_subscenes = sc_data.shadow_subscenes;
            if (sc_data.scene == bpy_scene)
                for (var i = 0; i < shadow_subscenes.length; i++) {
                    var subs = shadow_subscenes[i];
                    var cam = subs.camera;
                    m_cam.set_view_trans_quat(cam, trans, quat);
                }
        }
    }
}
exports.update_sky_texture = function(world) {
    var scenes_data = world.scenes_data;
    for (var i = 0; i < scenes_data.length; i++)
        update_world_texture(scenes_data[i].scene);
}

function update_sky(scene, subs) {
    m_prerender.prerender_subs(subs);
    m_render.draw(subs);
    if (subs.need_fog_update) {
        var main_subs = subs_array(scene, FOG_SUBSCENE_TYPES);
        for (var i = 0; i < main_subs.length; i++) {
            var draw_data = main_subs[i].draw_data;
            for (var j = 0; j < draw_data.length; j++) {
                var bundles = draw_data[j].bundles;
                for (var k = 0; k < bundles.length; k++) {
                    var bundle = bundles[k];
                    if (bundle.do_render) {
                        var batch = bundle.batch;
                        if (m_batch.check_batch_perm_uniform(batch, "u_cube_fog"))
                            m_render.update_batch_permanent_uniform(batch,
                                                                    "u_cube_fog");
                    }
                }
            }
        }
    }
}

/**
 * Perform module cleanup
 */
exports.cleanup = function() {
    for (var i = 0; i < _scenes.length; i++) {
        var scene = _scenes[i];
        var graph = scene._render.graph;

        m_graph.traverse(graph, function(node, attr) {
            if (!(attr.type == m_subs.SINK))
                clear_subscene(attr);
        });

        scene._render.graph = [];
        scene._render.queue = [];
    }

    _main_scene = null;
    _active_scene = null;
    _scenes.length = 0;
    _scenes_graph = null;
}

/**
 * Clear subscene
 */
function clear_subscene(subs) {

    var cam = subs.camera;

    m_render.render_target_cleanup(cam.framebuffer, cam.color_attachment,
            cam.depth_attachment, cam.width, cam.height);

    var draw_data = subs.draw_data;
    for (var i = 0; i < draw_data.length; i++) {
        var bundles = draw_data[i].bundles;
        for (var j = 0; j < bundles.length; j++) {
            var batch = bundles[j].batch
            if (batch)
                m_batch.clear_batch(batch);
        }
    }
}


/**
 * Extract frustum from camera, make debug geometry and add to active scene
 * for debug purposes only
 */
exports.make_frustum_shot = function(cam, subscene, color) {
    var corners = m_cam.extract_frustum_corners(cam, cam.near, cam.far, null, true);
    var submesh = m_primitives.generate_frustum(corners);

    var render = m_obj_util.create_render("DYNAMIC");

    render.bb_world = render.bb_local = m_bounds.big_bounding_box();
    render.bs_world = render.bs_local = m_bounds.big_bounding_sphere();

    var radius = render.bs_world.radius;
    render.be_world = render.be_local = m_bounds.be_from_values(
            [radius, 0, 0], [0, radius, 0], [0, 0, radius],
            render.bs_world.center);

    var batch = m_batch.create_shadeless_batch(submesh, color, 0.5);

    var rb = m_subs.init_bundle(batch, render);
    m_subs.append_draw_data(subscene, rb);
}

/**
 * Get all unuque materials of mesh objects
 */
function get_objs_materials(bpy_objects) {

    var mats = [];

    for (var i = 0; i < bpy_objects.length; i++) {
        var mesh = bpy_objects[i]["data"];

        for (var j = 0; j < mesh["materials"].length; j++) {
            var mat = mesh["materials"][j];

            if (mats.indexOf(mat) == -1)
                mats.push(mat);
        }
    }

    return mats;
}

/**
 * Return blender scene timeline's start/end frames
 */
exports.get_scene_timeline = function(scene) {
    var start = scene["frame_start"];
    var end = scene["frame_end"];

    return [start, end];
}

exports.setup_dim = setup_dim;
function setup_dim(width, height, scale) {
    m_cont.setup_viewport_dim(width, height, scale);

    if (_active_scene)
        setup_scene_dim(_active_scene, width, height);
}

exports.setup_scene_dim = setup_scene_dim;
/**
 * Setup dimension for specific scene subscenes
 */
function setup_scene_dim(scene, width, height) {
    var sc_render = scene._render;
    var cam_scene_data = m_obj_util.get_scene_data(scene._camera, scene);
    var upd_cameras = cam_scene_data.cameras;
    for (var i = 0; i < upd_cameras.length; i++) {
        var cam = upd_cameras[i];

        m_cam.set_projection(cam, width/height);

        // NOTE: update size of camera shadow cascades
        if (sc_render.shadow_params)
            m_cam.update_camera_shadows(cam, sc_render.shadow_params);
    }

    if (sc_render.shadow_params) {
        sc_render.need_shadow_update = true;
        get_subs(scene, m_subs.SHADOW_RECEIVE).need_perm_uniforms_update = true;
        get_subs(scene, m_subs.MAIN_BLEND).need_perm_uniforms_update = true;
    }

    var graph = sc_render.graph;

    m_scgraph.traverse_slinks(graph, function(slink, internal, subs1, subs2) {

        if (!slink.update_dim)
            return;

        var tex_width = slink.size_mult_x * width;
        var tex_height = slink.size_mult_y * height;
        if (internal) {
            for (var i = 0; i < subs1.slinks_internal.length; i++) {
                var slink_i = subs1.slinks_internal[i];
                if (slink_i == slink) {
                    var tex = subs1.textures_internal[i];
                    m_tex.resize(slink.texture, tex_width, tex_height);
                }
            }
        } else {
            if (m_tex.is_texture(slink.texture))
                m_tex.resize(slink.texture, tex_width, tex_height);

            // NOTE: needed in set_dof_params() and several other places
            var cam = subs1.camera;
            cam.width = tex_width;
            cam.height = tex_height;

            switch (subs1.type) {
            case m_subs.DOF:

                set_dof_params(scene, {"dof_power": subs1.camera.dof_power});
                break;
            case m_subs.GLOW_COMBINE:
                set_glow_material_params(scene,
                        {"small_glow_mask_width": subs1.small_glow_mask_width,
                        "large_glow_mask_width": subs1.large_glow_mask_width});
                break;
            case m_subs.BLOOM:
                set_bloom_params(scene,
                        {"bloom_blur": subs1.bloom_blur});
                break;
            case m_subs.OUTLINE:
                var subs_outline_blur_y = m_scgraph.find_input(graph, subs1,
                        m_subs.POSTPROCESSING);
                var subs_outline_blur_x = m_scgraph.find_input(graph, subs_outline_blur_y,
                        m_subs.POSTPROCESSING);
                var subs_outline_extend_y = m_scgraph.find_input(graph, subs_outline_blur_x,
                        m_subs.POSTPROCESSING);
                var subs_outline_extend_x = m_scgraph.find_input(graph, subs_outline_extend_y,
                        m_subs.POSTPROCESSING);

                m_scgraph.set_texel_size(subs_outline_blur_y, 1/width, 1/height);
                m_scgraph.set_texel_size(subs_outline_blur_x, 1/width, 1/height);
                m_scgraph.set_texel_size(subs_outline_extend_y, 1/width, 1/height);
                m_scgraph.set_texel_size(subs_outline_extend_x, 1/width, 1/height);
                break;
            default:
                m_scgraph.set_texel_size(subs1, 1/width, 1/height);
                break;
            }
        }
    });
}

exports.subs_array = subs_array;
/**
 * Return subscene array matching types array
 * return only existing subscenes
 * @methodOf scenes
 */
function subs_array(scene, types) {
    var subscenes = [];

    // in strict succession
    for (var i = 0; i < types.length; i++) {
        var type = types[i];

        m_graph.traverse(scene._render.graph, function(node, attr) {
            var subs = attr;

            if (subs.type == type)
                subscenes.push(subs);
        });
    }
    return subscenes;
}

exports.get_subs = get_subs;
/**
 * Return first subscene matching given type
 * @methodOf scenes
 */
function get_subs(scene, type) {
    var graph = scene._render.graph;
    return m_scgraph.find_subs(graph, type);
}

/**
 * Get horizon and zenith colors
 */
exports.get_environment_colors = function(scene) {

    var subs = get_subs(scene, m_subs.MAIN_OPAQUE);

    var hor = subs.horizon_color;
    var zen = subs.zenith_color;

    var hor_dest = [];
    var zen_dest = [];

    hor_dest[0] = hor[0];
    hor_dest[1] = hor[1];
    hor_dest[2] = hor[2];

    zen_dest[0] = zen[0];
    zen_dest[1] = zen[1];
    zen_dest[2] = zen[2];

    return [subs.environment_energy, hor_dest, zen_dest];
}

exports.set_environment_colors = set_environment_colors;
/**
 * Set environment energy, horizon and zenith colors
 */
function set_environment_colors(scene, environment_energy, horizon_color, zenith_color) {

    var subscenes = subs_array(scene, LIGHT_SUBSCENE_TYPES);

    for (var i = 0; i < subscenes.length; i++) {
        var subs = subscenes[i];

        subs.horizon_color.set(horizon_color);
        subs.zenith_color.set(zenith_color);
        subs.environment_energy = environment_energy;

        subs.need_perm_uniforms_update = true;
    }
}

/**
 * Get sky params
 */
exports.get_sky_params = function(scene) {

    var subs = get_subs(scene, m_subs.SKY);
    if (subs) {
        var sky_params = {};
        sky_params.color = new Array(3);
        m_vec3.copy(subs.sky_color, sky_params.color);
        sky_params.procedural_skydome = subs.procedural_skydome;
        sky_params.use_as_environment_lighting = subs.use_as_environment_lighting;
        sky_params.rayleigh_brightness = subs.rayleigh_brightness;
        sky_params.mie_brightness = subs.mie_brightness;
        sky_params.spot_brightness = subs.spot_brightness;
        sky_params.scatter_strength = subs.scatter_strength;
        sky_params.rayleigh_strength = subs.rayleigh_strength;
        sky_params.mie_strength = subs.mie_strength;
        sky_params.rayleigh_collection_power = subs.rayleigh_collection_power;
        sky_params.mie_collection_power = subs.mie_collection_power;
        sky_params.mie_distribution = subs.mie_distribution;
        return sky_params;
    } else {
        return null;
    }
}

/**
 * Set sky params
 */
exports.set_sky_params = function(scene, sky_params) {

    var subs = get_subs(scene, m_subs.SKY);

    if (subs) {
        if (typeof sky_params.procedural_skydome == "number")
            subs.procedural_skydome = sky_params.procedural_skydome;

        if (typeof sky_params.use_as_environment_lighting == "number")
            subs.use_as_environment_lighting = sky_params.use_as_environment_lighting;

        if (typeof sky_params.color == "object")
            subs.sky_color.set(sky_params.color);

        if (typeof sky_params.rayleigh_brightness == "number")
            subs.rayleigh_brightness = sky_params.rayleigh_brightness;

        if (typeof sky_params.mie_brightness == "number")
            subs.mie_brightness = sky_params.mie_brightness;

        if (typeof sky_params.spot_brightness == "number")
            subs.spot_brightness = sky_params.spot_brightness;

        if (typeof sky_params.scatter_strength == "number")
            subs.scatter_strength = sky_params.scatter_strength;

        if (typeof sky_params.rayleigh_strength == "number")
            subs.rayleigh_strength = sky_params.rayleigh_strength;

        if (typeof sky_params.mie_strength == "number")
            subs.mie_strength = sky_params.mie_strength;

        if (typeof sky_params.rayleigh_collection_power == "number")
            subs.rayleigh_collection_power = sky_params.rayleigh_collection_power;

        if (typeof sky_params.mie_collection_power == "number")
            subs.mie_collection_power = sky_params.mie_collection_power;

        if (typeof sky_params.mie_distribution == "number")
            subs.mie_distribution = sky_params.mie_distribution;

        subs.need_perm_uniforms_update = true;
        subs.need_fog_update = true;
        update_sky(scene, subs);
    }
}

/**
 * Get fog params methods
 */
exports.get_fog_intensity = function(scene) {

    var subs = subs_array(scene, FOG_SUBSCENE_TYPES)[0];

    return subs.fog_params[0];
}

exports.get_fog_depth = function(scene) {

    var subs = subs_array(scene, FOG_SUBSCENE_TYPES)[0];

    return subs.fog_params[1];
}

exports.get_fog_start = function(scene) {

    var subs = subs_array(scene, FOG_SUBSCENE_TYPES)[0];

    return subs.fog_params[2];
}

exports.get_fog_height = function(scene) {

    var subs = subs_array(scene, FOG_SUBSCENE_TYPES)[0];

    return subs.fog_params[3];
}

/**
 * Set fog params methods
 */
exports.set_fog_intensity = function(scene, fog_intensity) {

    var subscenes = subs_array(scene, FOG_SUBSCENE_TYPES);

    for (var i = 0; i < subscenes.length; i++) {
        var subs = subscenes[i];
        subs.fog_params[0] = fog_intensity;
        subs.need_perm_uniforms_update = true;
    }
}

exports.set_fog_depth = function(scene, fog_depth) {

    var subscenes = subs_array(scene, FOG_SUBSCENE_TYPES);

    for (var i = 0; i < subscenes.length; i++) {
        var subs = subscenes[i];
        subs.fog_params[1] = fog_depth;
        subs.need_perm_uniforms_update = true;
    }
}

exports.set_fog_start = function(scene, fog_start) {

    var subscenes = subs_array(scene, FOG_SUBSCENE_TYPES);

    for (var i = 0; i < subscenes.length; i++) {
        var subs = subscenes[i];
        subs.fog_params[2] = fog_start;
        subs.need_perm_uniforms_update = true;
    }
}

exports.set_fog_height = function(scene, fog_height) {

    var subscenes = subs_array(scene, FOG_SUBSCENE_TYPES);

    for (var i = 0; i < subscenes.length; i++) {
        var subs = subscenes[i];
        subs.fog_params[3] = fog_height;
        subs.need_perm_uniforms_update = true;
    }
}

/**
 * Get fog color and density
 */
exports.get_fog_color_density = function(scene, opt_dest) {

    var dest = opt_dest || [];

    var subs = subs_array(scene, FOG_SUBSCENE_TYPES)[0];

    var fcd = subs.fog_color_density;

    dest[0] = fcd[0];
    dest[1] = fcd[1];
    dest[2] = fcd[2];
    dest[3] = fcd[3];

    return dest;
}

/**
 * Set fog color and density
 */
exports.set_fog_color_density = function(scene, val) {

    var subscenes = subs_array(scene, FOG_SUBSCENE_TYPES);

    for (var i = 0; i < subscenes.length; i++) {
        var subs = subscenes[i];
        subs.fog_color_density.set(val);
        subs.need_perm_uniforms_update = true;
    }
}

/**
 * Get ssao params
 */
exports.get_ssao_params = function(scene) {

    var subs = get_subs(scene, m_subs.SSAO);
    var subs_blur = get_subs(scene, m_subs.SSAO_BLUR);
    if (!subs)
        return null;

    var batch = subs.draw_data[0].bundles[0].batch;

    var ssao_params = {};

    ssao_params.ssao_quality = m_batch.get_batch_directive(batch, "SSAO_QUALITY")[1];
    ssao_params.ssao_hemisphere = subs.ssao_hemisphere;
    ssao_params.ssao_blur_depth = subs_blur.ssao_blur_depth;
    ssao_params.blur_discard_value = subs_blur.ssao_blur_discard_value;
    ssao_params.radius_increase = subs.ssao_radius_increase;
    ssao_params.influence = subs.ssao_influence;
    ssao_params.dist_factor = subs.ssao_dist_factor;
    ssao_params.ssao_only = subs.ssao_only;
    ssao_params.ssao_white = m_batch.get_batch_directive(batch, "SSAO_WHITE")[1];

    return ssao_params;
}

/**
 * Set ssao params
 */
exports.set_ssao_params = function(scene, ssao_params) {

    var subs = get_subs(scene, m_subs.SSAO);
    var subs_blur = get_subs(scene, m_subs.SSAO_BLUR);

    if (!subs) {
        m_print.error("SSAO is not enabled on the scene");
        return 0;
    }

    var bundle = subs.draw_data[0].bundles[0];
    var batch = bundle.batch;

    if (typeof ssao_params.ssao_quality == "string") {
        m_batch.set_batch_directive(batch, "SSAO_QUALITY", ssao_params.ssao_quality);
        m_batch.update_shader(batch);
        m_subs.append_draw_data(subs, bundle);
    }

    if (typeof ssao_params.ssao_hemisphere == "number") {
        m_batch.set_batch_directive(batch, "SSAO_HEMISPHERE", ssao_params.ssao_hemisphere);
        m_batch.update_shader(batch);
        m_subs.append_draw_data(subs, bundle);
    }

    if (typeof ssao_params.ssao_blur_depth == "number") {
        m_batch.set_batch_directive(batch, "SSAO_BLUR_DEPTH", ssao_params.ssao_blur_depth);
        m_batch.update_shader(batch);
        m_subs.append_draw_data(subs, bundle);
    }

    if (typeof ssao_params.ssao_white == "number") {
        m_batch.set_batch_directive(batch, "SSAO_WHITE", ssao_params.ssao_white);
        m_batch.update_shader(batch);
        m_subs.append_draw_data(subs, bundle);
    }

    if (typeof ssao_params.ssao_blur_discard_value == "number")
        subs_blur.ssao_blur_discard_value = ssao_params.ssao_blur_discard_value;

    if (typeof ssao_params.ssao_radius_increase == "number")
        subs.ssao_radius_increase = ssao_params.ssao_radius_increase;

    if (typeof ssao_params.ssao_influence == "number")
        subs.ssao_influence = ssao_params.ssao_influence;

    if (typeof ssao_params.ssao_dist_factor == "number")
        subs.ssao_dist_factor = ssao_params.ssao_dist_factor;

    if (typeof ssao_params.ssao_only == "number") {
        var subs = get_subs(scene, m_subs.MAIN_OPAQUE);
        subs.ssao_only = ssao_params.ssao_only;
        var draw_data = subs.draw_data;
        for (var i = 0; i < draw_data.length; i++) {
            var bundles = draw_data[i].bundles;
            for (var j = 0; j < bundles.length; j++) {
                var batch = bundles[j].batch;
                m_batch.set_batch_directive(batch, "SSAO_ONLY", ssao_params.ssao_only);
                m_batch.update_shader(batch);
                m_subs.append_draw_data(subs, bundles[j]);
            }
        }
    }

    subs.need_perm_uniforms_update = true;
    subs_blur.need_perm_uniforms_update = true;
}

exports.get_dof_params = function(scene) {

    var subs = get_subs(scene, m_subs.DOF);
    if (!subs)
        return null;

    var dof_params = {};

    dof_params.dof_distance = subs.camera.dof_distance;
    dof_params.dof_front_start = subs.camera.dof_front_start;
    dof_params.dof_front_end = subs.camera.dof_front_end;
    dof_params.dof_rear_start = subs.camera.dof_rear_start;
    dof_params.dof_rear_end = subs.camera.dof_rear_end;
    dof_params.dof_power = subs.camera.dof_power;
    dof_params.dof_bokeh = subs.camera.dof_bokeh;
    dof_params.dof_bokeh_intensity = subs.camera.dof_bokeh_intensity;
    dof_params.dof_object = subs.camera.dof_object;

    return dof_params;
}

exports.set_dof_params = set_dof_params;
function set_dof_params(scene, dof_params) {

    var subs_dof = get_subs(scene, m_subs.DOF);
    if (!subs_dof) {
        m_print.error("DOF is not enabled on the scene. Check camera settings");
        return 0;
    }

    var bokeh_enabled = subs_dof.camera.dof_bokeh;

    var subs_coc_arr = bokeh_enabled ? subs_array(scene, [m_subs.COC]) : [];

    var graph = scene._render.graph;

    if (typeof dof_params.dof_on == "boolean") {
        subs_dof.camera.dof_on = dof_params.dof_on;
        if (bokeh_enabled)
            for (var i = 0; i < subs_coc_arr.length; i++)
                subs_coc_arr[i].camera.dof_on = dof_params.dof_on;
    }
    if (typeof dof_params.dof_distance == "number") {
        subs_dof.camera.dof_distance = dof_params.dof_distance;
        if (bokeh_enabled)
            for (var i = 0; i < subs_coc_arr.length; i++)
                subs_coc_arr[i].camera.dof_distance = dof_params.dof_distance;
    }
    if (typeof dof_params.dof_front_start == "number") {
        subs_dof.camera.dof_front_start = dof_params.dof_front_start;
        if (bokeh_enabled)
            for (var i = 0; i < subs_coc_arr.length; i++)
                subs_coc_arr[i].camera.dof_front_start = dof_params.dof_front_start;
    }
    if (typeof dof_params.dof_front_end == "number") {
        subs_dof.camera.dof_front_end = dof_params.dof_front_end;
        if (bokeh_enabled)
            for (var i = 0; i < subs_coc_arr.length; i++)
                subs_coc_arr[i].camera.dof_front_end = dof_params.dof_front_end;
    }
    if (typeof dof_params.dof_rear_start == "number") {
        subs_dof.camera.dof_rear_start = dof_params.dof_rear_start;
        if (bokeh_enabled)
            for (var i = 0; i < subs_coc_arr.length; i++)
                subs_coc_arr[i].camera.dof_rear_start = dof_params.dof_rear_start;
    }
    if (typeof dof_params.dof_rear_end == "number") {
        subs_dof.camera.dof_rear_end = dof_params.dof_rear_end;
        if (bokeh_enabled)
            for (var i = 0; i < subs_coc_arr.length; i++)
                subs_coc_arr[i].camera.dof_rear_end = dof_params.dof_rear_end;
    }
    if (typeof dof_params.dof_bokeh_intensity == "number") {
        subs_dof.camera.dof_bokeh_intensity = dof_params.dof_bokeh_intensity;
        if (bokeh_enabled) {
            var subs_pp_array = m_scgraph.get_inputs_by_type(graph, subs_dof,m_subs.POSTPROCESSING);
            // Y_DOF_BLUR
            subs_pp_array[0].camera.dof_bokeh_intensity = dof_params.dof_bokeh_intensity;
            subs_pp_array[1].camera.dof_bokeh_intensity = dof_params.dof_bokeh_intensity;
            // X_DOF_BLUR
            subs_pp_array[0] = m_scgraph.find_input(graph, subs_pp_array[0], m_subs.POSTPROCESSING);
            subs_pp_array[0].camera.dof_bokeh_intensity = dof_params.dof_bokeh_intensity;
        }
    }
    if (typeof dof_params.dof_power == "number") {
        if (bokeh_enabled) {
            var dof_power = dof_params.dof_power;
            subs_dof.camera.dof_power = dof_power;

            // half power because of downsized subs
            dof_power /= 2.0;

            var width  = subs_dof.camera.width;
            var height = subs_dof.camera.height;

            var texel_right = [1/width, 0.0];
            var texel_up_right = [1/width * 0.5, 1/height * 0.866];
            var texel_up_left  = [-1/width * 0.5, 1/height * 0.866];

            var subs_pp_array = m_scgraph.get_inputs_by_type(graph, subs_dof, m_subs.POSTPROCESSING);

            // Y_DOF_BLUR
            m_scgraph.set_texel_size_mult(subs_pp_array[0], dof_power);
            m_scgraph.set_texel_size(subs_pp_array[0], texel_up_left[0], texel_up_left[1]);
            m_scgraph.set_texel_size_mult(subs_pp_array[1], dof_power);
            m_scgraph.set_texel_size(subs_pp_array[1], texel_up_right[0], texel_up_right[1]);

            // X_DOF_BLUR
            subs_pp_array[0] = m_scgraph.find_input(graph, subs_pp_array[0],
                    m_subs.POSTPROCESSING);
            m_scgraph.set_texel_size_mult(subs_pp_array[0], dof_power);
            m_scgraph.set_texel_size(subs_pp_array[0], texel_right[0], texel_right[1]);

            if (subs_dof.camera.dof_foreground_blur) {
                // Y_ALPHA_BLUR
                subs_pp_array[0] = m_scgraph.find_input(graph, subs_pp_array[0],
                        m_subs.COC);
                subs_pp_array[0] = m_scgraph.find_input(graph, subs_pp_array[0],
                        m_subs.POSTPROCESSING);
                m_scgraph.set_texel_size(subs_pp_array[0], 1/width, 1/height);

                // X_ALPHA_BLUR
                subs_pp_array[0] = m_scgraph.find_input(graph, subs_pp_array[0],
                        m_subs.POSTPROCESSING);
                m_scgraph.set_texel_size(subs_pp_array[0], 1/width, 1/height);
            }

        } else {
            subs_dof.camera.dof_power = dof_params.dof_power;
            var subs_pp1 = m_scgraph.find_input(graph, subs_dof, m_subs.POSTPROCESSING);
            var subs_pp2 = m_scgraph.find_input(graph, subs_pp1, m_subs.POSTPROCESSING);

            m_scgraph.set_texel_size_mult(subs_pp1, subs_dof.camera.dof_power);
            m_scgraph.set_texel_size(subs_pp1, 1/subs_dof.camera.width,
                                               1/subs_dof.camera.height);
            m_scgraph.set_texel_size_mult(subs_pp2, subs_dof.camera.dof_power);
            m_scgraph.set_texel_size(subs_pp2, 1/subs_dof.camera.width,
                                               1/subs_dof.camera.height);
        }
    }
}

exports.get_god_rays_params = function(scene) {

    var gr_subs = subs_array(scene, [m_subs.GOD_RAYS]);
    var combo_subs = get_subs(scene, m_subs.GOD_RAYS_COMBINE);

    if (!gr_subs || !combo_subs)
        return null;

    var god_rays_params = {};

    god_rays_params.god_rays_max_ray_length = gr_subs[0].max_ray_length;
    god_rays_params.god_rays_intensity = combo_subs.god_rays_intensity;

    var batch = gr_subs[0].draw_data[0].bundles[0].batch;
    god_rays_params.god_rays_steps = m_batch.get_batch_directive(batch, "STEPS_PER_PASS")[1];

    return god_rays_params;
}

exports.set_god_rays_params = function(scene, god_rays_params) {

    var gr_subs = subs_array(scene, [m_subs.GOD_RAYS]);
    var combo_subs = get_subs(scene, m_subs.GOD_RAYS_COMBINE);

    if (!gr_subs || !combo_subs) {
        m_print.error("God Rays are not enabled on the scene");
        return 0;
    }

    if (typeof god_rays_params.god_rays_intensity == "number")
        combo_subs.god_rays_intensity = god_rays_params.god_rays_intensity;
    if (typeof god_rays_params.god_rays_max_ray_length == "number") {
        var r_length = god_rays_params.god_rays_max_ray_length;
        for (var i = 0; i < gr_subs.length; i++) {
            gr_subs[i].max_ray_length = r_length;
            gr_subs[i].radial_blur_step = r_length / gr_subs[i].steps_per_pass / (i + 1);
            gr_subs[i].need_perm_uniforms_update = true;
        }
    }
    if (typeof god_rays_params.god_rays_steps == "number") {

        var steps = m_shaders.glsl_value(god_rays_params.god_rays_steps, 1);
        var r_length = gr_subs[0].max_ray_length

        for (var i = 0; i < gr_subs.length; i++) {
            gr_subs[i].steps_per_pass = steps;
            gr_subs[i].radial_blur_step = r_length / steps / (i + 1);
            gr_subs[i].need_perm_uniforms_update = true;

            var bundle = gr_subs[i].draw_data[0].bundles[0];
            var batch = bundle.batch;
            m_batch.set_batch_directive(batch, "STEPS_PER_PASS", steps);
            m_batch.update_shader(batch);
            m_subs.append_draw_data(gr_subs[i], bundle);
        }
    }
    combo_subs.need_perm_uniforms_update = true;
}

exports.get_bloom_params = function(scene) {

    var lum_subs = get_subs(scene, m_subs.LUMINANCE_TRUNCED);
    var bloom_subs = get_subs(scene, m_subs.BLOOM);

    if (!lum_subs || !bloom_subs) {
        return null;
    }

    var bloom_params = {};

    bloom_params.key = lum_subs.bloom_key;
    bloom_params.edge_lum = lum_subs.bloom_edge_lum;
    bloom_params.blur = bloom_subs.bloom_blur;

    return bloom_params;
}

exports.set_bloom_params = set_bloom_params
function set_bloom_params(scene, bloom_params) {

    var lum_subs = get_subs(scene, m_subs.LUMINANCE_TRUNCED);
    var bloom_subs = get_subs(scene, m_subs.BLOOM);

    if (!lum_subs || !bloom_subs) {
        m_print.error("Bloom is not enabled on the scene");
        return 0;
    }

    if (typeof bloom_params.key == "number") {
        lum_subs.bloom_key = bloom_params.key;
        lum_subs.need_perm_uniforms_update = true;
    }
    if (typeof bloom_params.edge_lum == "number") {
        lum_subs.bloom_edge_lum = bloom_params.edge_lum;
        lum_subs.need_perm_uniforms_update = true;
    }
    if (typeof bloom_params.blur == "number") {
        var graph = scene._render.graph;
        var subs_blur1 = m_scgraph.find_input(graph, bloom_subs, m_subs.BLOOM_BLUR);
        var subs_blur2 = m_scgraph.find_input(graph, subs_blur1, m_subs.BLOOM_BLUR);
        bloom_subs.bloom_blur = bloom_params.blur;
        m_scgraph.set_texel_size_mult(subs_blur1, bloom_params.blur);
        m_scgraph.set_texel_size(subs_blur1, 1/bloom_subs.camera.width,
                                             1/bloom_subs.camera.height);
        m_scgraph.set_texel_size_mult(subs_blur2, bloom_params.blur);
        m_scgraph.set_texel_size(subs_blur2, 1/bloom_subs.camera.width,
                                             1/bloom_subs.camera.height);
    }
}

exports.get_glow_material_params = function(scene) {
    var glow_combine_subs = get_subs(scene, m_subs.GLOW_COMBINE);

    if (!glow_combine_subs)
        return null;

    var glow_material_params = {};

    glow_material_params.small_glow_mask_coeff = glow_combine_subs.small_glow_mask_coeff;
    glow_material_params.large_glow_mask_coeff = glow_combine_subs.large_glow_mask_coeff;
    glow_material_params.small_glow_mask_width = glow_combine_subs.small_glow_mask_width;
    glow_material_params.large_glow_mask_width = glow_combine_subs.large_glow_mask_width;

    return glow_material_params;
}

exports.set_glow_material_params = set_glow_material_params;
function set_glow_material_params(scene, glow_material_params) {
    var glow_combine_subs = get_subs(scene, m_subs.GLOW_COMBINE);

    if (!glow_combine_subs) {
        m_print.error("Glow is not enabled on the scene");
        return null;
    }

    var graph = scene._render.graph;
    var subs = m_scgraph.get_inputs(graph, glow_combine_subs);

    for (var i = 0; i < subs.length; ++i) {
        var subscene = subs[i];

        if (subscene.type == m_subs.POSTPROCESSING && subscene.subtype == "GLOW_MASK_LARGE")
            var postproc_y_blur_large_subs = subscene;
        if (subscene.type == m_subs.POSTPROCESSING && subscene.subtype == "GLOW_MASK_SMALL")
            var postproc_y_blur_small_subs = subscene;
    }

    var postproc_x_blur_large_subs = m_scgraph.find_input(graph,
            postproc_y_blur_large_subs, m_subs.POSTPROCESSING);
    var postproc_x_blur_small_subs = m_scgraph.find_input(graph,
            postproc_y_blur_small_subs, m_subs.POSTPROCESSING);

    if (typeof glow_material_params.small_glow_mask_coeff == "number") {
        glow_combine_subs.small_glow_mask_coeff = glow_material_params.small_glow_mask_coeff;
        glow_combine_subs.need_perm_uniforms_update = true;
    }

    if (typeof glow_material_params.large_glow_mask_coeff == "number") {
        glow_combine_subs.large_glow_mask_coeff = glow_material_params.large_glow_mask_coeff;
        glow_combine_subs.need_perm_uniforms_update = true;
    }

    if (typeof glow_material_params.small_glow_mask_width == "number") {
        glow_combine_subs.small_glow_mask_width = glow_material_params.small_glow_mask_width;
        m_scgraph.set_texel_size_mult(postproc_y_blur_small_subs,
                glow_material_params.small_glow_mask_width);
        m_scgraph.set_texel_size(postproc_y_blur_small_subs,
                1/glow_combine_subs.camera.width,
                1/glow_combine_subs.camera.height);
        postproc_y_blur_small_subs.need_perm_uniforms_update = true;

        m_scgraph.set_texel_size_mult(postproc_x_blur_small_subs,
                glow_material_params.small_glow_mask_width);
        m_scgraph.set_texel_size(postproc_x_blur_small_subs,
                1/glow_combine_subs.camera.width,
                1/glow_combine_subs.camera.height);
        postproc_x_blur_small_subs.need_perm_uniforms_update = true;
    }

    if (typeof glow_material_params.large_glow_mask_width == "number") {
        glow_combine_subs.large_glow_mask_width = glow_material_params.large_glow_mask_width;
        m_scgraph.set_texel_size_mult(postproc_y_blur_large_subs,
                glow_material_params.large_glow_mask_width);
        m_scgraph.set_texel_size(postproc_y_blur_large_subs,
                1/glow_combine_subs.camera.width,
                1/glow_combine_subs.camera.height);
        postproc_y_blur_large_subs.need_perm_uniforms_update = true;

        m_scgraph.set_texel_size_mult(postproc_x_blur_large_subs,
                glow_material_params.large_glow_mask_width);
        m_scgraph.set_texel_size(postproc_x_blur_large_subs,
                1/glow_combine_subs.camera.width,
                1/glow_combine_subs.camera.height);
        postproc_x_blur_large_subs.need_perm_uniforms_update = true;

    }
}

exports.get_wind_params = function(scene) {
    var wind = get_wind(scene);
    var length = m_vec3.length(wind);

    if (length == 0)
        return null;

    var angle = m_util.rad_to_deg(Math.atan2(wind[0], -wind[1]));

    var wind_params = {};
    wind_params.wind_dir = angle;
    wind_params.wind_strength = length;

    return wind_params;
}

exports.schedule_grass_map_update = schedule_grass_map_update;
/**
 * Schedule update of grass subscenes on given bpy scene.
 * @methodOf scenes
 */
function schedule_grass_map_update(bpy_scene) {
    bpy_scene._render.need_grass_map_update = true;
}

exports.get_water_surface_level = get_water_surface_level;
/**
 * Get water surface level
 * @methodOf scenes
 */
function get_water_surface_level(scene, pos_x, pos_y) {

    var render = scene._render;
    var wp = render.water_params;

    if (!wp.dynamic)
        return wp.water_level;

    var waves_height = wp.waves_height;
    var waves_length = wp.waves_length;
    var water_level  = wp.water_level;

    var wind_str = m_vec3.length(render.wind);

    var subs = get_subs(scene, m_subs.MAIN_OPAQUE);
    var time = subs.time;
    if (wind_str)
        time *= wind_str;

    // small waves
    var cellular_coords = _vec2_tmp;
    cellular_coords[0] = 20.0 / waves_length * (pos_x - 0.25 * time);
    cellular_coords[1] = 20.0 / waves_length * (pos_y - 0.25 * time);
    var cellular1 = m_util.cellular2x2(cellular_coords);
    cellular_coords[0] = 17.0 / waves_length * (pos_y + 0.1  * time);
    cellular_coords[1] = 17.0 / waves_length * (pos_x + 0.1  * time);
    var cellular2 = m_util.cellular2x2(cellular_coords);
    var small_waves = cellular1 + cellular2 - 1;

    // distant waves (only noise)
    var dst_noise_scale0  = wp.dst_noise_scale0;
    var dst_noise_scale1  = wp.dst_noise_scale1;
    var dst_noise_freq0   = wp.dst_noise_freq0;
    var dst_noise_freq1   = wp.dst_noise_freq1;

    var noise_coords = _vec2_tmp;

    noise_coords[0] = dst_noise_scale0 * (pos_x + dst_noise_freq0 * time);
    noise_coords[1] = dst_noise_scale0 * (pos_y + dst_noise_freq0 * time);
    var noise1 = m_util.snoise(noise_coords);

    noise_coords[0] = dst_noise_scale1 * (pos_y - dst_noise_freq1 * time);
    noise_coords[1] = dst_noise_scale1 * (pos_x - dst_noise_freq1 * time);
    var noise2 = m_util.snoise(noise_coords);
    var dist_waves = waves_height * noise1 * noise2;

    // waves moving towards the shore
    if (wp.shoremap_image) {

        // center and size of shore distance field
        var size_x = wp.shoremap_size[0];
        var size_y = wp.shoremap_size[1];
        var center_x = wp.shoremap_center[0];
        var center_y = wp.shoremap_center[1];

        // get uv coords on shore distance map
        var x = (pos_x - center_x) / size_x;
        var y = (center_y + pos_y) / size_y;
        x += 0.5;
        y += 0.5;

        // if position is out of boundings, consider that shore dist = 1
        if (x > 1 || x < 0 || y > 1 || y < 0) {
            var wave_height = dist_waves;
        } else {
            var width = wp.shoremap_tex_size;
            var array = render.shore_distances;

            var shore_dist = m_util.get_array_smooth_value(array, width, x, y);
            var dir_min_shore_fac = wp.dir_min_shore_fac;
            var dir_freq          = wp.dir_freq;
            var dir_noise_scale   = wp.dir_noise_scale;
            var dir_noise_freq    = wp.dir_noise_freq;
            var dir_min_noise_fac = wp.dir_min_noise_fac;
            var dst_min_fac       = wp.dst_min_fac;
            var waves_hor_fac     = wp.waves_hor_fac;

            var max_shore_dist = wp.max_shore_dist;
            var shore_waves_length = waves_length / max_shore_dist / Math.PI;
            // waves moving towards the shore
            var waves_coords = [dir_noise_scale / waves_length * (pos_x + dir_noise_freq * time),
                                dir_noise_scale / waves_length * (pos_y + dir_noise_freq * time)];

            var dist_fact = Math.sqrt(shore_dist);
            var shore_dir_waves = waves_height * Math.max(shore_dist, dir_min_shore_fac)
                    * Math.sin((dist_fact / shore_waves_length + dir_freq * time))
                    * Math.max( m_util.snoise(waves_coords), dir_min_noise_fac );
            // mix two types of waves basing on distance to the shore
            var mix_rate = Math.max(dist_fact, dst_min_fac);
            var wave_height = shore_dir_waves * (1 - mix_rate) + dist_waves * mix_rate;
            small_waves *= shore_dist;
        }
    } else
        var wave_height = dist_waves;

    wave_height += 0.05 * small_waves;
    var cur_water_level = water_level + wave_height;
    return cur_water_level;
}

exports.get_water_mat_params = function(scene, water_params) {

    var wp = scene._render.water_params;
    var subs = get_subs(scene, m_subs.MAIN_OPAQUE);

    if (!subs || !wp)
        return;

    water_params.waves_height = wp.waves_height;
    water_params.waves_length = wp.waves_length;

    if (subs.water_fog_color_density){
        water_params.water_fog_density = subs.water_fog_color_density[3];
        var wfc = water_params.water_fog_color = [];
        wfc[0]  = subs.water_fog_color_density[0];
        wfc[1]  = subs.water_fog_color_density[1];
        wfc[2]  = subs.water_fog_color_density[2];
    }
}

exports.set_water_params = function(scene, water_params) {

    var wp = scene._render.water_params;

    if (!wp) {
        m_print.error("set_water_params() - no water parameters on the scene");
        return null;
    }

    if (typeof water_params.dst_noise_scale0 == "number")
        wp.dst_noise_scale0 = water_params.dst_noise_scale0;
    if (typeof water_params.dst_noise_scale1 == "number")
        wp.dst_noise_scale1 = water_params.dst_noise_scale1;
    if (typeof water_params.dst_noise_freq0 == "number")
        wp.dst_noise_freq0 = water_params.dst_noise_freq0;
    if (typeof water_params.dst_noise_freq1 == "number")
        wp.dst_noise_freq1 = water_params.dst_noise_freq1;
    if (typeof water_params.dir_min_shore_fac == "number")
        wp.dir_min_shore_fac = water_params.dir_min_shore_fac;
    if (typeof water_params.dir_freq == "number")
        wp.dir_freq = water_params.dir_freq;
    if (typeof water_params.dir_noise_scale == "number")
        wp.dir_noise_scale = water_params.dir_noise_scale;
    if (typeof water_params.dir_noise_freq == "number")
        wp.dir_noise_freq = water_params.dir_noise_freq;
    if (typeof water_params.dir_min_noise_fac == "number")
        wp.dir_min_noise_fac = water_params.dir_min_noise_fac;
    if (typeof water_params.dst_min_fac == "number")
        wp.dst_min_fac = water_params.dst_min_fac;
    if (typeof water_params.waves_hor_fac == "number")
        wp.waves_hor_fac = water_params.waves_hor_fac;
    if(typeof water_params.water_dynamic == "number")
        wp.dynamic = water_params.water_dynamic;

    var subscenes = subs_array(scene, MAIN_SUBSCENE_TYPES);

    for (var i = 0; i < subscenes.length; i++) {
        var sub = subscenes[i];

        if (typeof water_params.water_fog_density == "number" && wp.fog_color_density)
            sub.water_fog_color_density[3] = water_params.water_fog_density;

        if (typeof water_params.water_fog_color == "object" && wp.fog_color_density)
            sub.water_fog_color_density.set(water_params.water_fog_color)

        if (typeof water_params.waves_height == "number")
            sub.water_waves_height = water_params.waves_height;

        if (typeof water_params.waves_length == "number")
            sub.water_waves_length = water_params.waves_length;

        sub.need_perm_uniforms_update = true;
    }
}

exports.get_shore_dist = function(scene, trans, v_dist_mult) {

    var wp = scene._render.water_params;
    if (!wp.shoremap_image)
        return SHORE_DIST_COMPAT;

    // center and size of shore distance field
    var size_x = wp.shoremap_size[0];
    var size_y = wp.shoremap_size[1];
    var center_x = wp.shoremap_center[0];
    var center_y = wp.shoremap_center[1];
    var max_shore_dist = wp.max_shore_dist;

    var water_level = wp.water_level;

    // get uv coords on shore distance map
    var x = (trans[0] - center_x) / size_x;
    var y = (center_y + trans[1]) / size_y;
    x += 0.5;
    y += 0.5;

    // if position is out of boundings, consider that shore dist = 1
    if (x > 1 || x < 0 || y > 1 || y < 0) {
        var shore_dist = 1.0;
    } else {
        var width = wp.shoremap_tex_size;
        var array = _active_scene._render.shore_distances;
        var shore_dist_xy = max_shore_dist * m_util.get_array_smooth_value(array, width, x, y);
        var shore_dist_z  = (water_level - trans[2]) * v_dist_mult;

        var shore_dist = Math.sqrt(shore_dist_xy * shore_dist_xy +
                shore_dist_z * shore_dist_z);
        return shore_dist;
    }
}

/**
 * Executed every frame
 * update all scenes
 */
exports.update = function(timeline, elapsed) {

    var active_cam_render = get_active()._camera.render;

    // update subscene params (uniforms)
    for (var i = 0; i < _scenes.length; i++) {
        var scene = _scenes[i];
        var graph = scene._render.graph;
        var render = scene._render;

        if (render.water_params) {
            var trans = m_tsr.get_trans_view(active_cam_render.world_tsr);
            var cam_water_depth = trans[2] - get_water_surface_level(scene, trans[0], trans[1]);
        }

        for (var j = 0; j < render.video_textures.length; j++) {
            var vtex = render.video_textures[j]._render;
            var video = vtex.video_file;
            var seq_video = vtex.seq_video;

            if (scene["b4w_use_nla"] && vtex.use_nla)
                continue;

            if (!video && !seq_video)
                continue;

            if (!m_tex.video_is_played(vtex))
                continue;

            var current_frame = m_tex.video_get_current_frame(vtex);
            var start_frame = m_tex.video_get_start_frame(vtex);
            if (video && cfg_def.is_mobile_device)
                start_frame -= FRAME_EPS;
            var end_frame = m_tex.video_get_end_frame(vtex);

            // NOTE: if frame_duration + frame_offset is bigger than the actual
            // video length, cycled non-NLA video won't consider frames at
            // the end of the cycle

            // loop and initial reset
            if (current_frame >= end_frame && vtex.use_cyclic
                    || current_frame < start_frame) {
                m_tex.reset_video(vtex.name, vtex.vtex_data_id);
                if (seq_video)
                    vtex.seq_last_discrete_mark = m_tex.seq_video_get_discrete_timemark(
                            vtex, timeline);
                continue;
            }

            // pause
            if (current_frame >= end_frame && !vtex.use_cyclic) {
                m_tex.pause_video(vtex.name, vtex.vtex_data_id);
                continue;
            }

            // update
            if (m_tex.video_update_is_available(vtex)) {
                if (video)
                    m_tex.update_video_texture(vtex);
                else {
                    var mark = m_tex.seq_video_get_discrete_timemark(vtex,
                            timeline);
                    if (mark != vtex.seq_last_discrete_mark) {
                        m_tex.update_seq_video_texture(vtex);
                        vtex.seq_cur_frame++;
                    }
                    vtex.seq_last_discrete_mark = mark;
                }
            }
        }

        m_graph.traverse(graph, function(node, attr) {
            var subs = attr;
            if (TIME_SUBSCENE_TYPES.indexOf(subs.type) > -1) {
                subs.time = timeline;
            }
            if (render.water_params) {
                subs.cam_water_depth = cam_water_depth;
            }
        });
    }

    // rendering
    for (var i = 0; i < _scenes.length; i++) {
        var scene = _scenes[i];
        var render = scene._render;
        var graph = render.graph
        var queue = render.queue;

        // check if rendering needed
        if (!queue.length)
            continue;

        if (render.need_shadow_update) {
            update_shadow_subscenes(scene);
            render.need_shadow_update = false;
        }
        if (render.need_grass_map_update) {
            update_subs_grass_map(scene);
            render.need_grass_map_update = false;
        }
        if (render.need_outline) {
            enable_outline_draw(scene);
            render.need_outline = false;
        }
        if (render.motion_blur)
            update_motion_blur_subscenes(graph, elapsed);

        // NOTE: temoporary disabled T2X mode due to artifacts with blend objects
        //if (cfg_def.smaa && !m_cfg.context.alpha)
        //    update_smaa_resolve_subscene(graph);

        // find outline mask scene index
        var outline_mask_subs = m_scgraph.find_subs(graph, m_subs.OUTLINE_MASK);

        for (var j = 0; j < queue.length; j++) {
            var qsubs = queue[j];
            m_prerender.prerender_subs(qsubs);

            // optimize outline supporting subscenes
            if (outline_mask_subs)
                optimize_outline_postprocessing(graph, qsubs, outline_mask_subs);

            m_render.draw(qsubs);
        }
    }

    // NOTE: temoporary disabled T2X mode due to artifacts with blend objects
    //if (cfg_def.smaa && !m_cfg.context.alpha) {
    //    m_render.increment_subpixel_index();
    //    var cameras = active_cam_render.cameras;
    //    for (var i = 0; i < cameras.length; i++) {
    //        var cam = cameras[i];
    //        m_mat4.copy(cam.view_proj_matrix, cam.prev_view_proj_matrix);
    //    }
    //}

    if (cfg_def.show_hud_debug_info)
        m_hud.show_debug_info(_scenes, elapsed);
}

exports.request_outline = function(scene) {
    scene._render.need_outline = true;
}

function optimize_outline_postprocessing(graph, qsubs, outline_mask_subs) {
    // optimize outline POSTPROCESSING subscenes rendering
    if (qsubs.is_for_outline && qsubs.type == m_subs.POSTPROCESSING)
        if (outline_mask_subs.do_render != qsubs.do_render)
            qsubs.do_render = outline_mask_subs.do_render;

    // optimize OUTLINE rendering if OUTLINE_MASK is switched off
    if (!outline_mask_subs.do_render && qsubs.type == m_subs.OUTLINE)
        qsubs.draw_outline_flag = 0;
}

function slink_switch_active(graph, id1, id2, slink, active) {
    if (slink.active == active)
        return;

    if (slink.active) {
        replace_attachment(graph, id1, slink.from, null);
        replace_texture(graph, id2, slink.to, null);
    } else {
        replace_attachment(graph, id1, slink.from, slink.texture);
        replace_texture(graph, id2, slink.to, slink.texture);
    }

    slink.active = active;
}

function replace_attachment(graph, id, type, tex) {
    var subs = m_graph.get_node_attr(graph, id);
    m_cam.set_attachment(subs.camera, type, tex);

    // TODO: assign now, not every frame
    subs.assign_texture = true;

    // replace linked textures
    m_graph.traverse_outputs(graph, id, function(id_out, attr_out,
            attr_edge) {

        var slink = attr_edge;
        if (slink.active && slink.from == type &&
                m_scgraph.check_slink_tex_conn(slink))
            replace_texture(graph, id_out, slink.to, tex);
    });

    // NOTE: bottom-up only
    m_graph.traverse_inputs(graph, id, function(id_in, attr_in,
            attr_edge) {

        var slink = attr_edge;
        if (slink.active && slink.from == type && slink.from == slink.to)
            replace_attachment(graph, id_in, type, tex);
    });
}

function replace_texture(graph, id, name, tex) {
    var subs = m_graph.get_node_attr(graph, id);

    var draw_data = subs.draw_data;
    for (var i = 0; i < draw_data.length; i++) {
        var bundles = draw_data[i].bundles;
        for (var j = 0; j < bundles.length; j++) {
            var batch = bundles[j].batch;
            m_batch.replace_texture(batch, tex, name);
        }
    }
}


/**
 * Update position of grass map camera.
 * uses _vec3_tmp _vec3_tmp2 _quat4_tmp
 */
function update_subs_grass_map(bpy_scene) {

    var subs_grass_map = get_subs(bpy_scene, m_subs.GRASS_MAP);
    if (subs_grass_map) {
        var cam = subs_grass_map.camera;

        var camera_render = bpy_scene._camera.render;
        var camera_trans = m_tsr.get_trans(camera_render.world_tsr, _vec3_tmp);

        // calculate grass map center point position relative to camera position
        var trans = _vec3_tmp2;
        trans[0] = 0;
        trans[1] = 0;
        trans[2] = -subs_grass_map.grass_map_dim[2] / 2;
        var quat = m_tsr.get_quat(camera_render.world_tsr, _quat4_tmp);
        m_vec3.transformQuat(trans, quat, trans);

        // XY plane
        trans[0] += camera_trans[0];
        trans[1] += camera_trans[1];
        trans[2] = 0;

        // no rotation camera looks down
        m_quat.identity(quat);

        m_cam.set_view_trans_quat(cam, trans, quat);
    }
}


function update_motion_blur_subscenes(graph, elapsed) {
    // TODO: initialize motion blur accumulator texture from rendering input on
    // the first iteration

    m_graph.traverse(graph, function(id, attr) {
        var subs = attr;

        if (subs.type != m_subs.MOTION_BLUR)
            return;

        if (!subs.slinks_internal[0] || !subs.textures_internal[0])
            m_util.panic("Wrong MOTION_BLUR subscene");

        var slink = subs.slinks_internal[0];
        var tex = subs.textures_internal[0];

        subs.textures_internal[0] = subs.camera.color_attachment;

        // next subscene may use same texture as input
        m_graph.traverse_outputs(graph, id, function(id_out, attr_out, attr_edge) {
            var slink_out = attr_edge;

            if (slink_out.active)
                replace_texture(graph, id_out, slink_out.to, tex);
        });

        replace_attachment(graph, id, slink.from, tex);
        replace_texture(graph, id, slink.to, subs.textures_internal[0]);
        subs.motion_blur_exp = Math.exp(-elapsed/subs.mb_factor);
    });
}

function update_smaa_resolve_subscene(graph) {
    m_graph.traverse(graph, function(id, attr) {
        var subs = attr;

        if (subs.type != m_subs.SMAA_RESOLVE)
            return;

        if (!subs.slinks_internal[0] || !subs.textures_internal[0])
            m_util.panic("Wrong SMAA RESOLVE subscene");

        var tex = subs.textures_internal[0];

        m_graph.traverse_inputs(graph, id, function(id_in, subs_in,
                attr_edge) {
            if (subs_in.type != m_subs.VELOCITY) {
                subs.textures_internal[0] = subs_in.camera.color_attachment;
                replace_attachment(graph, id_in, attr_edge.from, tex);
            }
        });

        replace_texture(graph, id, "u_color", tex);
        replace_texture(graph, id, "u_color_prev", subs.textures_internal[0]);
    });
}

exports.get_all_subscenes = function(scene) {
    var graph = scene._render.graph;

    var subscenes = [];
    m_graph.traverse(graph, function(node, attr) {
        subscenes.push(attr);
    });

    return subscenes;
}

exports.get_cam_water_depth = function() {
    var subs = get_subs(_active_scene, m_subs.MAIN_BLEND);
    var scene = _active_scene;

    if (!subs && !scene._render.water_params)
        return null;

    return subs.cam_water_depth;
}

exports.update_scene_permanent_uniforms = update_scene_permanent_uniforms;
function update_scene_permanent_uniforms(scene) {
    var graph = scene._render.graph;

    m_graph.traverse(graph, function(node, subs){
        subs.need_perm_uniforms_update = true;
    });
}

exports.set_debug_view_mode = function(subs_debug_view, mode) {
    subs_debug_view.debug_view_mode = mode;
    subs_debug_view.do_render = mode != m_debug.DV_NONE;
    subs_debug_view.blend = (mode == m_debug.DV_TRANSPARENT_WIREFRAME);
    subs_debug_view.need_perm_uniforms_update = true;

    var active_scene = get_active();
    for (var i = 0; i < MAIN_SUBSCENE_TYPES.length; i++) {
        var subs = get_subs(active_scene, MAIN_SUBSCENE_TYPES[i]);
        if (subs)
            subs.do_not_debug = (mode == m_debug.DV_RENDER_TIME);
    }
}

exports.set_debug_colors_seed = function(subs_debug_view, seed) {
    subs_debug_view.debug_colors_seed = seed;
    subs_debug_view.need_perm_uniforms_update = true;
}

exports.set_render_time_threshold = function(subs_debug_view, threshold) {
    subs_debug_view.debug_render_time_threshold = threshold;
    subs_debug_view.need_perm_uniforms_update = true;
}

exports.set_wireframe_edge_color = function(subs_debug_view, color) {
    var draw_data = subs_debug_view.draw_data;
    for (var i = 0; i < draw_data.length; i++) {
        var bundles = draw_data[i].bundles;
        for (var j = 0; j < bundles.length; j++) {
            var batch = bundles[j].batch;
            m_vec3.copy(color, batch.wireframe_edge_color);
            batch.need_perm_uniforms_update = true;
        }
    }
}

exports.update_force_scene = function(scene, obj) {
    var field = obj.field;
    var sc_wind = scene._render.wind;
    if (field && field.type == "WIND" && sc_wind) {
        var render = obj.render;
        var quat = m_tsr.get_quat_view(render.world_tsr);
        m_vec3.transformQuat(m_util.AXIS_Z, quat, sc_wind);
        m_vec3.normalize(sc_wind, sc_wind);
        m_vec3.scale(sc_wind, field.strength, sc_wind);

        var subs_arr = subs_array(scene, TIME_SUBSCENE_TYPES);
        for (var j = 0; j < subs_arr.length; j++)
            subs_arr[j].wind.set(sc_wind);
        return true;
    }
    return false;
}

exports.pick_color = function(scene, canvas_x, canvas_y) {
    var subs_color_pick = get_subs(scene, m_subs.COLOR_PICKING);
    if (subs_color_pick) {
        // NOTE: rewrite camera.proj_matrix and camera.view_proj_matrix
        // restoring not needed
        var canvas = m_cont.get_canvas();
        var h = canvas.clientHeight;
        var w = canvas.clientWidth;
        m_cam.set_color_pick_proj(subs_color_pick.camera, canvas_x, canvas_y, w, h);

        // NOTE: may be some delay since exports.update() execution
        m_prerender.prerender_subs(subs_color_pick, subs_color_pick.camera);
        if (subs_color_pick.do_render)
            m_render.draw(subs_color_pick);

        var subs_color_pick_xray = get_subs(scene, m_subs.COLOR_PICKING_XRAY);
        if (subs_color_pick_xray) {
            m_mat4.copy(subs_color_pick.camera.proj_matrix,
                    subs_color_pick_xray.camera.proj_matrix);
            m_mat4.copy(subs_color_pick.camera.view_proj_matrix,
                    subs_color_pick_xray.camera.view_proj_matrix)
            m_util.extract_frustum_planes(
                    subs_color_pick_xray.camera.view_proj_matrix,
                    subs_color_pick_xray.camera.frustum_planes);
            m_prerender.prerender_subs(subs_color_pick_xray, subs_color_pick_xray.camera);
            if (subs_color_pick_xray.do_render)
                m_render.draw(subs_color_pick_xray);
        }

        if (subs_color_pick.do_render ||
                subs_color_pick_xray && subs_color_pick_xray.do_render)
            return m_render.read_pixels(subs_color_pick_xray?
                    subs_color_pick_xray.camera.framebuffer:
                    subs_color_pick.camera.framebuffer, 0, 0);
        else
            return null;
    } else
        m_print.error("Object Selection is not available on the scene");

    return null;
}

exports.set_outline_color = set_outline_color;
function set_outline_color(color) {
    var scene = get_active();
    var subs = get_subs(scene, m_subs.OUTLINE);
    if (subs) {
        subs.outline_color.set(color);
        subs.need_perm_uniforms_update = true;
    }
}

/**
 * return wind vector
 */
exports.get_wind = get_wind;
function get_wind(scene) {
    return scene._render.wind;
}

exports.get_meta_tags = function(scene) {
    var tags = {
        title: "",
        description: ""
    };

    if (scene["b4w_tags"]) {
        tags.title = scene["b4w_tags"]["title"];
        tags.description = scene["b4w_tags"]["description"];
    }

    return tags;
}

exports.update_cube_reflect_subs = function(subs, trans) {
    var vm_trans = _vec3_tmp;
    m_vec3.negate(trans, vm_trans);
    for (var i = 0; i < 6; i++) {
        var vm = subs.cube_view_matrices[i];
        var frustum = subs.cube_cam_frustums[i];
        var cam = subs.camera;
        m_mat4.translate(m_util.INV_CUBE_VIEW_MATRS[i], vm_trans, vm);
        m_mat4.multiply(cam.proj_matrix, vm, cam.view_proj_matrix);
        m_util.extract_frustum_planes(cam.view_proj_matrix, frustum);
    }
}

exports.update_plane_reflect_subs = function(subs, trans, quat) {
    var cam = subs.camera;
    m_util.trans_quat_to_plane(trans, quat, m_util.AXIS_Z,
                               cam.reflection_plane);
}

exports.assign_scene_data_subs = function(scene, scene_objs, lamps) {
    var shadow_params = scene._render.shadow_params;
    var reflection_params = scene._render.reflection_params;

    var use_ssao = cfg_def.ssao && scene["b4w_enable_ssao"];
    var shadow_lamps = m_obj_util.get_shadow_lamps(lamps, use_ssao);

    if (reflection_params)
        for (var i = 0; i < scene_objs.length; i++) {
            var obj = scene_objs[i];
            var sc_data = m_obj_util.get_scene_data(obj, scene);

            if (obj.render.plane_reflection_id != -1) {
                var plane_refl_subs = reflection_params.plane_refl_subs;
                var plane_refl_subs_blend = reflection_params.plane_refl_subs_blend;
                var refl_id = obj.render.plane_reflection_id;

                if (plane_refl_subs_blend.length)
                    sc_data.plane_refl_subs = plane_refl_subs_blend[refl_id];
                else if (plane_refl_subs.length)
                    sc_data.plane_refl_subs = plane_refl_subs[refl_id];

            } else if (obj.render.cube_reflection_id != -1) {
                var cube_refl_subs = reflection_params.cube_refl_subs;
                var cube_refl_subs_blend = reflection_params.cube_refl_subs_blend;
                var refl_id = obj.render.cube_reflection_id;

                if (cube_refl_subs_blend.length)
                    sc_data.cube_refl_subs = cube_refl_subs_blend[refl_id];
                else if (cube_refl_subs.length)
                    sc_data.cube_refl_subs = cube_refl_subs[refl_id];
            }
        }

    for (var i = 0; i < shadow_lamps.length; i++) {
        var sc_data = m_obj_util.get_scene_data(shadow_lamps[i], scene);
        if (shadow_params) {
            //TODO: assign proper subscenes for each lamp
            var shadow_subscenes = subs_array(scene, [m_subs.SHADOW_CAST]);
            for (var j = 0; j < shadow_subscenes.length; j++)
                if (i == shadow_subscenes[j].shadow_lamp_index)
                    sc_data.shadow_subscenes.push(shadow_subscenes[j]);
        }
    }
}

function get_plane_refl_id_by_subs(scene, subs) {
    var refl_subs = scene._render.reflection_params.plane_refl_subs;
    for (var i = 0; i < refl_subs.length; i++) {
        for (var j = 0; j < refl_subs[i].length; j++)
            if (refl_subs[i][j] == subs)
                return i;
    }
    var refl_subs_blend = scene._render.reflection_params.plane_refl_subs_blend;
    for (var i = 0; i < refl_subs_blend.length; i++) {
        for (var j = 0; j < refl_subs_blend[i].length; j++)
            if (refl_subs_blend[i][j] == subs)
                return i;
    }
    return null;
}

function get_cube_refl_id_by_subs(scene, subs) {

    if (!scene._render.reflection_params)
        return null;

    var refl_subs = scene._render.reflection_params.cube_refl_subs;
    for (var i = 0; i < refl_subs.length; i++) {
        if (refl_subs[i] == subs)
            return i;
    }
    var refl_subs_blend = scene._render.reflection_params.cube_refl_subs_blend;
    for (var i = 0; i < refl_subs_blend.length; i++) {
        if (refl_subs_blend[i] == subs)
            return i;
    }
    return null;
}

exports.marker_frame = function(scene, name) {
    return scene["timeline_markers"][name];
}

exports.set_hmd_params = function(hmd_params) {
    var active_scene = get_active();
    var subs_stereo = get_subs(active_scene, m_subs.STEREO);

    if (!subs_stereo)
        return;

    if (hmd_params.distortion_coefs) {
        subs_stereo.distortion_params[0] = hmd_params.distortion_coefs[0];
        subs_stereo.distortion_params[1] = hmd_params.distortion_coefs[1];
        subs_stereo.need_perm_uniforms_update = true;
    }

    if (hmd_params.chromatic_aberration_coefs) {
        subs_stereo.chromatic_aberration_coefs[0] = hmd_params.chromatic_aberration_coefs[0];
        subs_stereo.chromatic_aberration_coefs[1] = hmd_params.chromatic_aberration_coefs[1];
        subs_stereo.chromatic_aberration_coefs[2] = hmd_params.chromatic_aberration_coefs[2];
        subs_stereo.chromatic_aberration_coefs[3] = hmd_params.chromatic_aberration_coefs[3];
        subs_stereo.need_perm_uniforms_update = true;
    }

    if (hmd_params.base_line_factor) {
        subs_stereo.distortion_params[2] = hmd_params.base_line_factor;
        subs_stereo.need_perm_uniforms_update = true;
    }
    if (hmd_params.inter_lens_factor) {
        subs_stereo.distortion_params[3] = hmd_params.inter_lens_factor;
        subs_stereo.need_perm_uniforms_update = true;
    }

    if (hmd_params.enable_hmd_stereo) {
        subs_stereo.enable_hmd_stereo = hmd_params.enable_hmd_stereo;
        subs_stereo.need_perm_uniforms_update = true;
    }
}

exports.multiply_size_mult = function(multiplier_x, multiplier_y) {
    var scenes = get_all_scenes();

    for (var i = 0; i < scenes.length; i++) {
        var scene = scenes[i];
        var graph = exports.get_graph(scene);

        m_scgraph.multiply_size_mult_by_graph(graph, multiplier_x, multiplier_y);
    }
}

exports.update_all_mesh_shaders = function(scene) {
    var lamps = m_obj.get_scene_objs(scene, "LAMP", m_obj.DATA_ID_ALL);
    var subs_arr = subs_array(scene, OBJECT_SUBSCENE_TYPES);

    for (var i = 0; i < subs_arr.length; i++) {
        var subs = subs_arr[i];
        var draw_data = subs.draw_data;
        for (var j = 0; j < draw_data.length; j++) {
            var bundles = draw_data[j].bundles;
            for (var k = 0; k < bundles.length; k++) {
                var bundle = bundles[k];
                var batch = bundle.batch;
                if (batch.type != "MAIN")
                    continue;
                m_batch.update_batch_lights(batch, lamps, scene);
                m_batch.update_shader(batch);
                m_subs.append_draw_data(subs, bundle);
            }
        }
    }
}

exports.recalculate_draw_data = function(batch) {
    // called only after batch.shader was recompiled
    for (var i = 0; i < _scenes.length; i++) {
        var graph = _scenes[i]._render.graph;
        m_graph.traverse(graph, function(node, attr) {
            var subs = attr;
            var draw_data = subs.draw_data;
            for (var j = 0; j < draw_data.length; j++) {
                var bundles = draw_data[j].bundles;
                for (var k = 0; k < bundles.length; k++) {
                    var bundle = bundles[k];
                    if (bundle.batch == batch)
                        m_subs.append_draw_data(subs, bundle);
                }
            }
        });
    }
}

}
