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
var m_cstr       = require("__constraints");
var m_data       = require("__data");
var m_debug      = require("__debug");
var m_geom       = require("__geometry");
var m_graph      = require("__graph");
var m_hud        = require("__hud");
var m_nodemat    = require("__nodemat");
var m_obj        = require("__objects");
var m_particles  = require("__particles");
var m_phy        = require("__physics");
var m_prerender  = require("__prerender");
var m_primitives = require("__primitives");
var m_print      = require("__print");
var m_render     = require("__renderer");
var m_scgraph    = require("__scenegraph");
var m_sfx        = require("__sfx");
var m_shaders    = require("__shaders");
var m_tex        = require("__textures");
var m_util       = require("__util");

var m_vec3 = require("vec3");
var m_mat4 = require("mat4");

var cfg_def = m_cfg.defaults;
var cfg_out = m_cfg.outlining;
var cfg_scs = m_cfg.scenes;
var cfg_ani = m_cfg.animation;

var FRAME_EPS = 5;
var COLOR_ID_THRESHOLD = 3.0;

/* subscene types for different aspects of processing */

var VALID_OBJ_TYPES = ["ARMATURE", "CAMERA", "EMPTY", "LAMP", "MESH", "SPEAKER"];
var VALID_OBJ_TYPES_SECONDARY = ["ARMATURE", "EMPTY", "MESH", "SPEAKER"];

// add objects
var OBJECT_SUBSCENE_TYPES = ["GRASS_MAP", "SHADOW_CAST", "MAIN_OPAQUE",
    "MAIN_BLEND", "MAIN_XRAY", "MAIN_GLOW", "MAIN_PLANE_REFLECT", "MAIN_CUBE_REFLECT",
    "COLOR_PICKING", "COLOR_PICKING_XRAY", "DEPTH", "OUTLINE_MASK", "WIREFRAME"];
exports.OBJECT_SUBSCENE_TYPES = OBJECT_SUBSCENE_TYPES;
// need light update
var LIGHT_SUBSCENE_TYPES = ["MAIN_OPAQUE", "MAIN_BLEND", "MAIN_XRAY", "MAIN_GLOW",
    "MAIN_PLANE_REFLECT", "MAIN_CUBE_REFLECT", "GOD_RAYS", "GOD_RAYS_COMBINE", "SKY",
    "LUMINANCE_TRUNCED"];

var FOG_SUBSCENE_TYPES = ["MAIN_OPAQUE", "SSAO", "MAIN_BLEND", "MAIN_XRAY",
    "MAIN_GLOW", "MAIN_PLANE_REFLECT", "MAIN_CUBE_REFLECT"];

// need time update
var TIME_SUBSCENE_TYPES = ["SHADOW_CAST", "MAIN_OPAQUE", "MAIN_BLEND",
    "MAIN_XRAY", "MAIN_GLOW", "MAIN_PLANE_REFLECT", "MAIN_CUBE_REFLECT",
    "COLOR_PICKING", "COLOR_PICKING_XRAY", "DEPTH", "GOD_RAYS", "OUTLINE_MASK",
    "WIREFRAME"];

// need camera water distance update
var MAIN_SUBSCENE_TYPES = ["MAIN_OPAQUE", "MAIN_BLEND", "MAIN_XRAY",
                           "MAIN_GLOW", "MAIN_PLANE_REFLECT", "MAIN_CUBE_REFLECT"];

var SHORE_DIST_COMPAT = 100;

var MAX_BATCH_TEXTURES = 8;

var _seq_video_time = 0;

var _main_scene = null;
var _active_scene = null;
var _scenes = [];
// not to be confused with scenegraph
var _scenes_graph = null;
var _outline_anim_objs = [];

var MAX_SHADER_VARYING_COUNT = 10;

var GRASS_MAP_MARGIN = 1E-4;

var MAX_SHADOW_CAST_BB_PROPORTION = 2;
var MAX_OPTIMAL_BB_ANGLE = Math.PI / 2;
var OPTIMAL_BB_COUNT = 10;

// prevent shadows stretching near edges
var SHADOW_MAP_EPSILON_XY = 0.005;
// fix depth rendering near clipping planes
var SHADOW_MAP_EPSILON_Z = 0.005;

exports.GET_OBJECT_BY_NAME = 0;
exports.GET_OBJECT_BY_DUPLI_NAME = 1;
exports.GET_OBJECT_BY_DUPLI_NAME_LIST = 2;

exports.DATA_ID_ALL = -1;

var _vec2_tmp = new Float32Array(2);
var _vec3_tmp = new Float32Array(3);
var _vec4_tmp = new Float32Array(4);
var _vec4_tmp2 = new Float32Array(4);
var _quat4_tmp = new Float32Array(4);
var _mat4_tmp = new Float32Array(16);
var _corners_cache = new Float32Array(24);
var _corners_cache2 = new Float32Array(24);

var _bb_tmp = m_bounds.zero_bounding_box();
var _bb_tmp2 = m_bounds.zero_bounding_box();

var _wind = new Float32Array(3);

var _shadow_cast_min_z = 0;
var _shadow_cast_max_z = -Infinity;

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
        subs_arr[j].wind.set(_wind);

    // NOTE: draw all SHADOW_CAST subscenes to fill them with correct DEPTH data
    // before rendering
    for (var i = 0; i < render.queue.length; i++)
        if (render.queue[i].type == "SHADOW_CAST")
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
        throw "No active scene available";
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
    return scene["camera"];
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
            for (var j = 0; j < subs.bundles.length; j++) {
                var textures = subs.bundles[j].batch.textures;
                var batch = null;
                for (var k = 0; k < textures.length; k++)
                    if (textures[k].source == "SCENE" && textures[k].source_id == _scenes[i]["name"]
                            && subs.type != "COPY") {
                        m_print.error("Texture-scene loop detected. A scene is " +
                            "rendered to texture \"" + textures[k].name +
                            "\" yet this texture belongs " +
                            "to the same scene.");
                        var scene_node = m_graph.node_by_attr(_scenes_graph, _scenes[i]);
                        batch = subs.bundles[j].batch;
                        break;
                    }

                if (batch) {
                    batch.textures = [];
                    batch.texture_names = [];
                    m_batch.update_batch_material_debug(batch, null);
                    m_batch.update_shader(batch);
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

exports.get_object = function() {
    var scenes = get_all_scenes();
    var obj_found = null;
    var obj_name = "";

    for (var i = 0; i < scenes.length; i++) {
        var objs = get_scene_objs(scenes[i], "ALL", exports.DATA_ID_ALL);

        switch (arguments[0]) {
        case exports.GET_OBJECT_BY_NAME:
            obj_name = arguments[1];
            obj_found = get_object_by_name(arguments[1], objs, false,
                    arguments[2]);
            break;
        case exports.GET_OBJECT_BY_DUPLI_NAME:
            obj_name = arguments[2];
            obj_found = get_object_by_dupli_name(arguments[1],
                    arguments[2], objs, arguments[3]);
            break;
        case exports.GET_OBJECT_BY_DUPLI_NAME_LIST:
            obj_name = arguments[1][arguments[1].length - 1];
            obj_found = get_object_by_dupli_name_list(arguments[1],
                    objs, arguments[2]);
            break;
        default:
            break;
        }

        if (obj_found)
            break;
    }

    return obj_found;
}

function get_object_by_name(name, objects, origin_name, data_id) {
    var obj_found = null;

    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        var obj_name = (origin_name) ? obj["origin_name"] : obj["name"];

        if (obj_name == name && obj._render.data_id == data_id) {
            obj_found = obj;
            break;
        }
    }

    return obj_found;
}

function get_object_by_dupli_name(empty_name, dupli_name, objects, data_id) {
    var obj_found = null;

    var empty_obj = get_object_by_name(empty_name, objects, false, data_id);
    if (empty_obj && empty_obj["dupli_group"])
        obj_found = get_object_by_name(dupli_name,
                empty_obj["dupli_group"]["objects"], true, data_id);

    return obj_found;
}

function get_object_by_dupli_name_list(name_list, objects, data_id) {
    var obj_found = null;

    for (var i = 0; i < name_list.length; i++) {
        obj_found = get_object_by_name(name_list[i], objects, i != 0, data_id);

        if (obj_found && obj_found["dupli_group"])
            objects = obj_found["dupli_group"]["objects"];
        else
            break;
    }

    return obj_found;
}

/**
 * Append objects from dinamically loaded scene to existed scene
 * @methodOf scenes
 */
exports.append_to_existed_scene = function(bpy_scene, bpy_scene_existed, textures) {
    for (var i in VALID_OBJ_TYPES_SECONDARY) {
        var type = VALID_OBJ_TYPES_SECONDARY[i];
        var objs = combine_scene_objects(bpy_scene, type);
        var video_texs = bpy_scene_existed._render.video_textures;
        var tex_not_exist = false;
        for(var i = 0; i < textures.length; i++) {
            tex_not_exist = true;
            if (textures[i]._render && textures[i]._render.is_movie) {
                for (var j = 0; j < video_texs.length; j++)
                    if (video_texs[j] == textures[i])
                        tex_not_exist = false;
                if (tex_not_exist)
                    video_texs.push(textures[i]);
            }
        }

        if (!(type in bpy_scene_existed._objects))
            bpy_scene_existed._objects[type] = [];
        for (var j = 0; j < objs.length; j++)
            // NOTE: ignore ARMATURE proxy
            if (!(m_util.is_armature(objs[j]) && objs[j]["proxy"])) {
                bpy_scene_existed._objects["ALL"].push(objs[j]);
                bpy_scene_existed._objects[type].push(objs[j]);
            }
    }
}

exports.append_scene = append_scene;
/**
 * Update scene._render
 * prepare camera before execution
 * @methodOf scenes
 */
function append_scene(bpy_scene, textures) {

    bpy_scene._objects = {"ALL" : []};

    for (var i in VALID_OBJ_TYPES) {
        var type = VALID_OBJ_TYPES[i];
        var objs = combine_scene_objects(bpy_scene, type);

        bpy_scene._objects[type] = [];
        for (var j = 0; j < objs.length; j++)
            if (!(m_util.is_armature(objs[j]) && objs[j]["proxy"])) {
                bpy_scene._objects["ALL"].push(objs[j]);
                bpy_scene._objects[type].push(objs[j]);
            }
    }
    bpy_scene._render_to_textures = bpy_scene._render_to_textures || [];
    bpy_scene._render = bpy_scene._render || {};
    bpy_scene._nla = null;

    var render = bpy_scene._render;
    var cam_render = bpy_scene["camera"]._render;

    var shs  = bpy_scene["b4w_shadow_settings"];
    var rshs = render.shadow_params = {};

    if (shs["csm_resolution"] > cfg_def.max_texture_size) {
        rshs.csm_resolution = cfg_def.max_texture_size;
        m_print.error("Shadow map texture has unsupported size. Changed to "
                + cfg_def.max_texture_size + ".");
    } else
        rshs.csm_resolution         = shs["csm_resolution"];

    rshs.self_shadow_polygon_offset = shs["self_shadow_polygon_offset"];
    rshs.self_shadow_normal_offset  = shs["self_shadow_normal_offset"];
    rshs.enable_csm                 = shs["b4w_enable_csm"];

    var lamps = get_scene_objs(bpy_scene, "LAMP", exports.DATA_ID_ALL);
    var shadow_lamp = find_first_lamp_with_shadows(lamps) || lamps[0];
    if (shadow_lamp) {
        rshs.lamp_type = shadow_lamp._light.type;
        rshs.spot_size = shadow_lamp._light.spot_size;
        rshs.distance  = shadow_lamp._light.distance;
        if ((rshs.lamp_type == "SPOT" || rshs.lamp_type == "POINT") &&
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

    render.video_textures  =   [];

    for (var i = 0; i < textures.length; i++)
        if (textures[i]._render && textures[i]._render.is_movie)
            render.video_textures.push(textures[i]);

    var fog_color = bpy_scene["world"]["b4w_fog_color"];
    var fog_dens  = bpy_scene["world"]["b4w_fog_density"];
    var materials_params = get_material_params(bpy_scene)

    render.fog_color_density = new Float32Array([fog_color[0],
                                                 fog_color[1],
                                                 fog_color[2],
                                                 fog_dens]);

    render.sun_exist         = check_scenes_sun(bpy_scene);
    render.sky_params        = extract_sky_params(bpy_scene, render.sun_exist);
    render.world_light_set   = get_world_light_set(bpy_scene, render.sky_params);
    render.lamps_number      = get_scene_objs(bpy_scene, "LAMP", exports.DATA_ID_ALL).length;
    render.water_params      = get_water_params(bpy_scene);
    render.materials_params  = materials_params;
    render.xray              = check_xray_materials(bpy_scene);
    render.anchor_visibility = check_anchor_visibility_objects(bpy_scene);
    render.num_lamps_added   = 0;
    render.anaglyph_use      = check_anaglyph_use(cam_render);
    render.render_shadows    = (cfg_def.depth_tex_available && check_render_shadows(bpy_scene));
    render.fog_color         = bpy_scene["world"]["b4w_fog_color"];
    render.shore_smoothing   = check_shore_smoothing(bpy_scene);
    render.soft_particles    = check_soft_particles(bpy_scene);
    render.reflection_params = extract_reflections_params(bpy_scene);
    render.bloom_params      = extract_bloom_params(bpy_scene);
    render.mb_params         = extract_mb_params(bpy_scene);
    render.cc_params         = extract_cc_params(bpy_scene);
    render.god_rays_params   = extract_god_rays_params(bpy_scene);
    render.outline_params    = extract_outline_params(bpy_scene);
    render.glow_params       = extract_glow_params(bpy_scene);
    render.dof               = cfg_def.dof && (cam_render.dof_distance > 0
                                        || cam_render.dof_object);
    render.dynamic_grass     = check_dynamic_grass(bpy_scene);
    render.motion_blur       = (cfg_def.motion_blur && bpy_scene["b4w_enable_motion_blur"]);
    render.compositing       = (cfg_def.compositing && bpy_scene["b4w_enable_color_correction"]);
    render.antialiasing      = (cfg_def.antialiasing && bpy_scene["b4w_enable_antialiasing"]);
    render.bloom             = (cfg_def.bloom && bpy_scene["b4w_enable_bloom"] && render.sun_exist);
    render.ssao              = (cfg_def.ssao && bpy_scene["b4w_enable_ssao"]);
    render.ssao_params       = extract_ssao_params(bpy_scene);
    render.god_rays          = (cfg_def.god_rays && bpy_scene["b4w_enable_god_rays"] && render.sun_exist);
    render.refractions       = check_refraction(bpy_scene, materials_params);
    render.depth_tex         = cfg_def.depth_tex_available;
    render.color_picking     = check_selectable_objects(bpy_scene);
    render.outline           = check_outlining_objects(bpy_scene);
    render.glow_materials    = check_glow_materials(bpy_scene);
    render.glow_over_blend   = bpy_scene["world"]["b4w_render_glow_over_blend"];

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

    var rtt_sort_fun = function(bpy_tex1, bpy_tex2) {
        return bpy_tex2._render.source_size - bpy_tex1._render.source_size;
    }

    var rtt_sorted = bpy_scene._render_to_textures.sort(rtt_sort_fun);
    render.graph = m_scgraph.create_rendering_graph(render, cam_render, rtt_sorted);

    render.queue = [];

    render.need_shadow_update = false;
    render.need_grass_map_update = false;

    _scenes.push(bpy_scene);

    if (!_scenes_graph)
        _scenes_graph = m_graph.create();

    m_graph.append_node_attr(_scenes_graph, bpy_scene);
}

exports.combine_scene_objects = combine_scene_objects;
/**
 * Combine all bpy objects from the scene.
 */
function combine_scene_objects(scene, type) {
    if (!type)
        type = "ALL";

    var scene_objs_arr = [];
    combine_scene_objects_iter(scene["objects"], type, scene_objs_arr);
    return scene_objs_arr;
}

function combine_scene_objects_iter(objects, type, dest) {
    // search in dupli groups
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];

        if (type == "ALL" || type == obj["type"])
            dest.push(obj);

        var dupli_group = obj["dupli_group"];
        if (dupli_group) {
            var dg_objects = dupli_group["objects"];
            combine_scene_objects_iter(dg_objects, type, dest);
        }
    }
}

function check_render_shadows(bpy_scene) {

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
    var lamp_objects = get_scene_objs(bpy_scene, "LAMP", exports.DATA_ID_ALL);
    var use_ssao = cfg_def.ssao && bpy_scene["b4w_enable_ssao"];
    if (lamp_objects.length == 0 && !use_ssao)
        return false;

    var objects = get_scene_objs(bpy_scene, "MESH", exports.DATA_ID_ALL);
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];

        if (obj["b4w_shadow_cast"])
            has_casters = true;

        if (obj["b4w_shadow_receive"])
            has_receivers = true;

        if ((use_ssao || has_casters) && has_receivers)
            return true;
    }
    // no casters, no receivers
    return false;
}

function check_scenes_sun(bpy_scene) {
    if (!bpy_scene._objects)
        return false;
    var lamps = bpy_scene._objects["LAMP"];
    for (var i = 0; i < lamps.length; i++)
        if (lamps[i]._light.type == "SUN")
            return true;
    return false;
}
/**
 * Check if shore smoothing required for given scene.
 * Shore smoothing required if we have shore smoothing flag
 * enabled for water materials
 */
function check_shore_smoothing(bpy_scene) {

    if (!cfg_def.shore_smoothing)
        return false;

    var mats = get_scene_materials(bpy_scene);

    for (var i = 0; i < mats.length; i++) {
        var mat = mats[i];

        if (mat["b4w_water"] && mat["b4w_water_shore_smoothing"])
            return true;
    }

    return false;
}

function check_soft_particles(bpy_scene) {
    var objects = get_scene_objs(bpy_scene, "MESH", exports.DATA_ID_ALL);
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        var psystems = obj["particle_systems"];
        for (var j = 0; j < psystems.length; j++) {
            var pset = psystems[j]["settings"];
            if (pset["b4w_enable_soft_particles"] &&
                    pset["b4w_particles_softness"] > 0.0)
                return true;
        }
    }

    return false;
}
/**
 * Check water parameters on a given scene
 */
function get_water_params(bpy_scene) {

    var mats = get_scene_materials(bpy_scene);
    var water_params = [];
    var objects = get_scene_objs(bpy_scene, "MESH", exports.DATA_ID_ALL);

    for (var i = 0; i < mats.length; i++) {
        var mat = mats[i];

        if (mat["b4w_water"]) {

            var wp = {};
            // set water level to obect's origin y coord
            for (var j = 0; j < objects.length; j++) {
                var obj = objects[j];
                var mesh = obj["data"];
                var mesh_mats = mesh["materials"];
                for (var k = 0; k < mesh_mats.length; k++) {
                    var mesh_mat = mesh_mats[k];
                    if (mesh_mat == mat)
                        wp.water_level = obj["location"][1];
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
                if (texture["b4w_shore_dist_map"] === true) {
                    // shoremap
                    wp.shoremap_image    = texture["image"];
                    wp.shoremap_tex_size = texture["image"]["size"][0];
                    wp.shore_boundings   = texture["b4w_shore_boundings"];
                    wp.max_shore_dist    = texture["b4w_max_shore_dist"];
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

function get_material_params(bpy_scene) {

    var materials_properties_existance = {
        refractions: false
    };

    var materials = get_scene_materials(bpy_scene);

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
            // check other properties here

        }
    }

    for (var i = 0; i < materials.length; i++) {
        var material = materials[i];

        if (material["b4w_refractive"])
            materials_properties_existance.refractions = true;
        // check other properties here

        if (!material["node_tree"])
            continue;

        get_nodes_properties(material["node_tree"]);
    }

    return materials_properties_existance;
}

function check_anaglyph_use(cam_render) {
    // NOTE: disable anaglyph stereo for the non-PERSP camera
    if (cam_render.cameras[0].type != m_cam.TYPE_PERSP && cfg_def.anaglyph_use) {
        m_print.warn("Anaglyph stereo is disabled for the non-perspective camera");
        return false;
    } else
        return cfg_def.anaglyph_use;
}

/**
 * Check if reflections are required for the given scene.
 * Returns an array of reflection planes and cube reflectibe objs on the scene.
 */
function extract_reflections_params(bpy_scene) {

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

    var objects = get_scene_objs(bpy_scene, "MESH", exports.DATA_ID_ALL);
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];

        if (obj._render.reflective) {
            if (obj._render.reflection_type == "CUBE")
                num_cube_refl++;
            else {
                var refl_plane_obj = obj._reflection_plane_obj;
                obj._reflection_plane_obj = null;

                if (!refl_plane_obj)
                    continue;

                // NOTE: some of reflection planes have been created in objects.update_object
                if (bpy_scene._objects["EMPTY"].indexOf(refl_plane_obj) == -1) {
                    bpy_scene._objects["ALL"].push(refl_plane_obj);
                    bpy_scene._objects["EMPTY"].push(refl_plane_obj);
                }

                if (!refl_plane_obj._render)
                    // reflection plane is not present on the scene
                    m_obj.update_object(refl_plane_obj, false)

                var refl_plane_id = null;
                for (var j = 0; j < refl_plane_objs.length; j++) {
                    var rp = refl_plane_objs[j];
                    if (rp == refl_plane_obj) {
                         refl_plane_id = j;
                         break;
                    }
                }

                // we need only unique reflection planes
                if (refl_plane_id == null)
                    refl_plane_objs.push(refl_plane_obj);
            }
        }
    }

    return {refl_plane_objs: refl_plane_objs,
            num_cube_refl:   num_cube_refl,
            cube_refl_subs:  [],
            plane_refl_subs: []
           };
}

/**
 * Check dynamic sky parameters
 */
function extract_sky_params(bpy_scene, sun_exist) {
    var sky_params = {};
    var sky_settings = bpy_scene["world"]["b4w_sky_settings"];

    sky_params.render_sky                  = sky_settings["render_sky"];
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
function get_world_light_set(bpy_scene, sky_params) {

    // get some world settings
    var world = bpy_scene["world"];

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

    if (wls_params.use_environment_light && wls_params.environment_color == "SKY_TEXTURE" &&
        !(sky_params.procedural_skydome && sky_params.use_as_environment_lighting)) {
        var tex_slot = null;
        for (var i = 0; i < world["texture_slots"].length; i++)
            if (world["texture_slots"][i]["texture"]["b4w_use_as_environment_lighting"]) {
                tex_slot = world["texture_slots"][i];
                break;
            }
        if (!tex_slot) {
            m_print.warn("environment lighting is set to 'Sky Texture'" +
                    ", but there is no world texture with 'Sky Texture Usage' property set to 'ENVIRONMENT_LIGHTING'");
            wls_params.use_environment_light = false;
        } else
            wls_params.environment_texture_slot = tex_slot;
    }

    for (var i = 0; i < world["texture_slots"].length; i++)
        if (world["texture_slots"][i]["texture"]["b4w_use_as_skydome"]) {
            var sts = world["texture_slots"][i]
            wls_params.sky_texture_slot = sts;
            wls_params.sky_texture_param = {
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

    return wls_params;
}

/**
 * To render dynamic grass following conditions must be met:
 * enabled global setting
 * at least one terrain material
 * at least one HAIR particle system (settings) with dynamic grass enabled
 */
function check_dynamic_grass(bpy_scene) {
    if (!cfg_def.dynamic_grass)
        return false;

    var has_terrain = false;
    var has_dyn_grass = false;

    var objects = get_scene_objs(bpy_scene, "MESH", exports.DATA_ID_ALL);
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        var materials = obj["data"]["materials"];
        for (var j = 0; j < materials.length; j++) {
            var mat = materials[j];
            if (mat["b4w_terrain"])
                has_terrain = true;
        }

        var psystems = obj["particle_systems"];
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

function check_selectable_objects(bpy_scene) {
    if (cfg_out.outlining_overview_mode)
        return true;

    if (cfg_def.enable_selectable) {
        switch (bpy_scene["b4w_enable_object_selection"]) {
        case "OFF":
            return false;
        case "ON":
            return true;
        case "AUTO":
            var objects = get_scene_objs(bpy_scene, "MESH", exports.DATA_ID_ALL);
            for (var i = 0; i < objects.length; i++) {
                var obj = objects[i];
                if (obj._render.selectable)
                    return true;
            }
            return false;
        }
    } else
        return false;
}

function check_outlining_objects(bpy_scene) {
    if (cfg_out.outlining_overview_mode)
        return true;

    if (cfg_def.enable_outlining)
        switch (bpy_scene["b4w_enable_outlining"]) {
        case "OFF":
            return false;
        case "ON":
            return true;
        case "AUTO":
            var objects = get_scene_objs(bpy_scene, "MESH", exports.DATA_ID_ALL);
            for (var i = 0; i < objects.length; i++) {
                var obj = objects[i];
                if (obj._render.outlining)
                    return true;
            }
            return false;
        }
    else
        return false;
}

function check_glow_materials(bpy_scene) {
    if (cfg_def.glow_materials) {
        switch (bpy_scene["b4w_enable_glow_materials"]) {
        case "OFF":
            return false;
        case "ON":
            return true;
        case "AUTO":
            var objects = get_scene_objs(bpy_scene, "MESH", exports.DATA_ID_ALL);
            for (var i = 0; i < objects.length; i++) {
                var obj = objects[i];
                var mesh = obj["data"];
                var materials = mesh["materials"];

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

function check_xray_materials(bpy_scene) {
    var objects = get_scene_objs(bpy_scene, "MESH", exports.DATA_ID_ALL);
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        var materials = obj["data"]["materials"];
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

function check_anchor_visibility_objects(bpy_scene) {

    switch (bpy_scene["b4w_enable_anchors_visibility"]) {
    case "OFF":
        return false;
    case "ON":
        return true;
    case "AUTO":
        // perform objects check
    }

    var objects = get_scene_objs(bpy_scene, "EMPTY", exports.DATA_ID_ALL);

    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        if (obj["b4w_anchor"] && obj["b4w_anchor"]["detect_visibility"])
            return true;
    }

    return false;
}

exports.get_graph = function(scene) {
    return scene._render.graph;
}

/**
 * Generate non-object batches for graph subscenes
 */
exports.generate_auxiliary_batches = function(graph) {

    m_graph.traverse(graph, function(node, attr) {
        var subs = attr;

        var batch = null;

        switch(subs.type) {
        case "POSTPROCESSING":
            batch = m_batch.create_postprocessing_batch(subs.pp_effect);
            break;
        case "SSAO":
            batch = m_batch.create_ssao_batch(subs);
            break;
        case "SSAO_BLUR":
            batch = m_batch.create_ssao_blur_batch(subs);
            break;
        case "DEPTH_PACK":
            batch = m_batch.create_depth_pack_batch();
            break;

        case "REFRACT":
        case "COPY":
            batch = m_batch.create_postprocessing_batch("NONE");
            break;

        case "GOD_RAYS":
            var subs_input = m_scgraph.find_input(graph, subs, "WIREFRAME") ||
                             m_scgraph.find_input(graph, subs, "MAIN_BLEND") ||
                             m_scgraph.find_input(graph, subs, "GOD_RAYS");

            var tex_input = subs_input.camera.color_attachment;

            // needed for special underwater god rays
            var water = subs.water;

            var steps = subs.steps_per_pass;

            batch = m_batch.create_god_rays_batch(tex_input, subs.pack,
                                                  water, steps);

            break;

        case "GOD_RAYS_COMBINE":

            var subs_input = m_scgraph.find_input(graph, subs, "WIREFRAME") ||
                            m_scgraph.find_input(graph, subs, "MAIN_BLEND");

            var subs_god_rays = m_scgraph.find_input(graph, subs, "GOD_RAYS");

            var tex_main = subs_input.camera.color_attachment;
            var tex_god_rays = subs_god_rays.camera.color_attachment;

            batch = m_batch.create_god_rays_combine_batch(tex_main, tex_god_rays);

            break;

        case "MOTION_BLUR":
            batch = m_batch.create_motion_blur_batch(subs.mb_decay_threshold);
            break;

        case "DOF":
            batch = m_batch.create_dof_batch();

            var subs_pp1 = m_scgraph.find_input(graph, subs, "POSTPROCESSING");
            var subs_pp2 = m_scgraph.find_input(graph, subs_pp1, "POSTPROCESSING");
            m_scgraph.set_texel_size_mult(subs_pp1, subs.camera.dof_power);
            m_scgraph.set_texel_size_mult(subs_pp2, subs.camera.dof_power);

            break;

        case "OUTLINE":
            batch = m_batch.create_outline_batch();
            var subs_outline_blur_y = m_scgraph.find_input(graph, subs,
                    "POSTPROCESSING");
            var subs_outline_blur_x = m_scgraph.find_input(graph, subs_outline_blur_y,
                    "POSTPROCESSING");
            var subs_outline_extend_y = m_scgraph.find_input(graph, subs_outline_blur_x,
                    "POSTPROCESSING");
            var subs_outline_extend_x = m_scgraph.find_input(graph, subs_outline_extend_y,
                    "POSTPROCESSING");

            // set blur strength for 2 subscenes
            m_scgraph.set_texel_size_mult(subs_outline_blur_x, subs.blur_texel_size_mult);
            m_scgraph.set_texel_size_mult(subs_outline_blur_y, subs.blur_texel_size_mult);

            // set extend strength for 2 subscenes
            m_scgraph.set_texel_size_mult(subs_outline_extend_x,
                    subs.ext_texel_size_mult * subs.outline_factor);
            m_scgraph.set_texel_size_mult(subs_outline_extend_y,
                    subs.ext_texel_size_mult * subs.outline_factor);

            break;

        case "GLOW_COMBINE":
            batch = m_batch.create_glow_combine_batch();
            break;

        case "COMPOSITING":
            batch = m_batch.create_compositing_batch();
            break;

        case "ANTIALIASING":
            batch = m_batch.create_antialiasing_batch();
            break;

        case "SMAA_RESOLVE":
        case "SMAA_EDGE_DETECTION":
        case "SMAA_BLENDING_WEIGHT_CALCULATION":
        case "SMAA_NEIGHBORHOOD_BLENDING":
            batch = m_batch.create_smaa_batch(subs.type);
            break;

        case "ANAGLYPH":
            batch = m_batch.create_anaglyph_batch();
            break;

        case "SKY":
            batch = m_batch.create_procedural_sky_batch();

            break;
        case "LUMINANCE":
            batch = m_batch.create_luminance_batch();

            break;
        case "AVERAGE_LUMINANCE":

            batch = m_batch.create_average_luminance_batch();

            break;
        case "LUMINANCE_TRUNCED":
            batch = m_batch.create_luminance_trunced_batch();

            break;
        case "BLOOM_BLUR":
            batch = m_batch.create_bloom_blur_batch();

            break;
        case "BLOOM":

            var subs_blur_y = m_scgraph.find_input(graph, subs, "BLOOM_BLUR");
            var subs_blur_x = m_scgraph.find_input(graph, subs_blur_y, "BLOOM_BLUR");

            // set blur strength for 2 subscenes
            m_scgraph.set_texel_size_mult(subs_blur_y, subs.bloom_blur);
            m_scgraph.set_texel_size_mult(subs_blur_x, subs.bloom_blur);

            batch = m_batch.create_bloom_combine_batch();

            break;

        case "VELOCITY":
            batch = m_batch.create_velocity_batch();
            break;
        case "ANCHOR_VISIBILITY":
            batch = m_batch.create_anchor_visibility_batch();
            break;
        }

        if (batch) {
            var rb = init_bundle(m_obj.create_render("NONE"), batch);
            validate_batch(batch);
            subs.bundles.push(rb);
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
        case "MAIN_CUBE_REFLECT":
            return;
        default:
            throw "Wrong slink";
        }

        switch (slink.to) {
        case "COLOR":
        case "CUBEMAP":
        case "DEPTH":
        case "NONE":
        case "SCREEN":
        case "OFFSCREEN":
        case "u_cube_reflection": // NOTE: set in update_batch_subs()
        case "u_plane_reflection": // NOTE: set in update_batch_subs()
            // nothing
            break;
        default:

            if (!tex)
                throw "Connection of SCREEN is forbidden";

            if (tex.w_renderbuffer)
                throw "Batch texture can't use renderbuffer";

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
            // nothing
            break;
        default:

            if (tex.w_renderbuffer)
                throw "Batch texture can't use renderbuffer";

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
    var type = obj["type"];

    switch (type) {
    case "MESH":
        var graph = scene._render.graph;
        var obj_render = obj._render;

        if (!m_scgraph.find_subs(graph, "SHADOW_CAST") && obj_render.shadow_receive)
            obj_render.shadow_receive = false;

        var subs_arr = subs_array(scene, OBJECT_SUBSCENE_TYPES);

        if (copy) {

            if(m_phy.has_physics(obj))
                m_phy.append_object(obj, scene);

            scene._objects["ALL"].push(obj);
            scene._objects[obj.type].push(obj);

            if (obj._dg_parent && obj._dg_parent["dupli_group"]["objects"]) {
                obj["origin_name"] = obj["name"];
                obj._dg_parent["dupli_group"]["objects"].push(obj);
            }
        }

        for (var i = 0; i < subs_arr.length; i++) {
            var subs = subs_arr[i];
            add_object_sub(subs, obj, graph, scene, copy);
        }
        break;
    case "LAMP":
        increase_scene_num_lights(obj, scene);
        update_lamp_scene(obj, scene);
        break;
    default:
        break;
    }
}

exports.remove_object = function(obj) {
    if (!obj._render.is_copied)
        return false;
    var scene = get_active();
    m_data.prepare_object_unloading(scene, obj, false);

    var ind = scene._objects["ALL"].indexOf(obj);
    if (ind != -1)
        scene._objects["ALL"].splice(ind, 1);

    ind = scene._objects[obj.type].indexOf(obj);
    if (ind != -1)
        scene._objects[obj.type].splice(ind, 1);

    if (obj._dg_parent && obj._dg_parent["dupli_group"]["objects"]) {
        ind = obj._dg_parent["dupli_group"]["objects"].indexOf(obj);
        if (ind != -1)
            obj._dg_parent["dupli_group"]["objects"].splice(ind, 1);
    }

    if (m_cstr.check_constraint(obj))
        m_cstr.remove(obj);

    return true;
}

/**
 * Increase lights number on all light subscenes
 */
function increase_scene_num_lights(obj, scene) {

    obj._light.index = scene._render.num_lamps_added++;

    var subs_arr = subs_array(scene, LIGHT_SUBSCENE_TYPES);
    for (var i = 0; i < subs_arr.length; i++) {
        var subs = subs_arr[i];
        subs.num_lights++;
    }
}

function init_bundle(render, batch) {
    return {
        do_render: true,
        do_render_cube: [true, true, true, true, true, true],
        obj_render: render,
        batch: batch
    };
}

exports.add_object_sub = add_object_sub;
/**
 * Filter batch to pass given subscene
 */
function add_object_sub(subs, obj, graph, bpy_scene, copy) {
    switch(subs.type) {
    case "MAIN_OPAQUE":
        add_object_subs_main(subs, obj, graph, "OPAQUE", bpy_scene, copy);
        break;
    case "MAIN_BLEND":
        add_object_subs_main(subs, obj, graph, "BLEND", bpy_scene, copy);
        break;
    case "MAIN_XRAY":
        add_object_subs_main(subs, obj, graph, "XRAY", bpy_scene, copy);
        break;
    case "MAIN_GLOW":
        add_object_subs_main(subs, obj, graph, "GLOW", bpy_scene, copy);
        break;
    case "MAIN_PLANE_REFLECT":
    case "MAIN_CUBE_REFLECT":
        add_object_subs_reflect(subs, obj, graph, bpy_scene, copy);
        break;
    case "DEPTH":
        add_object_subs_depth(subs, obj, graph, bpy_scene, copy);
        break;
    case "SHADOW_CAST":
        add_object_subs_shadow(subs, obj, graph, bpy_scene, copy);
        break;
    case "COLOR_PICKING":
        add_object_subs_color_picking(subs, obj, graph, bpy_scene, copy);
        break;
    case "COLOR_PICKING_XRAY":
        add_object_subs_color_picking(subs, obj, graph, bpy_scene, copy);
        break;
    case "OUTLINE_MASK":
        add_object_subs_outline_mask(subs, obj, graph, bpy_scene, copy);
        break;
    case "GRASS_MAP":
        add_object_subs_grass_map(subs, obj, copy);
        break;
    case "WIREFRAME":
        add_object_subs_wireframe(subs, obj, graph, copy);
        break;
    default:
        break;
    }
}

/**
 * Add object to main scene
 */
function add_object_subs_main(subs, obj, graph, main_type, bpy_scene, copy) {

    var obj_render = obj._render;

    // divide obj by batches
    var batches = obj._batches;
    for (var i = 0; i < batches.length; i++) {

        var batch = batches[i];

        if (batch.shadow_cast_only || batch.reflexible_only)
            continue;

        if (batch.type != "MAIN" && batch.type != "NODES_GLOW"
                && batch.type != "PARTICLES")
            continue;

        if (!(batch.subtype == "OPAQUE" && main_type == "OPAQUE" ||
                batch.subtype == "BLEND" && main_type == "BLEND" ||
                batch.subtype == "XRAY" && main_type == "XRAY" ||
                batch.type == "NODES_GLOW" && main_type == "GLOW"))
            continue;

        if (!copy) {
            update_batch_subs(batch, subs, obj, graph, main_type, bpy_scene);
            update_batch_lights(bpy_scene, batch);
            m_batch.update_shader(batch);
            validate_batch(batch);
        }
        var rb = init_bundle(obj_render, batch);
        subs.bundles.push(rb);

        connect_textures(graph, subs, batch);
        check_batch_textures_number(batch);
    }

    // first sort by blend then by offset_z
    var sort_fun = function(a, b) {
        if (a == b) return 0;
        return a > b ? 1 : -1;
    }
    var sort_fun_double = function(a, b) {
        if (a.batch && b.batch)
            return sort_fun(a.batch.blend, b.batch.blend) ||
                   sort_fun(a.batch.offset_z, b.batch.offset_z);
        else
            return 0;
    }
    subs.bundles.sort(sort_fun_double);

    //m_print.log("Added: " + obj.name + ". Total " + subs.bundles.length);
    //debug_report_order(subs.bundles);
}

function update_batch_subs(batch, subs, obj, graph, main_type, bpy_scene) {
    var obj_render = obj._render;

    var shadow_usage = "NO_SHADOWS";
    var subs_cast = m_scgraph.find_subs(graph, "SHADOW_CAST");
    if (subs_cast && batch.shadow_receive) {
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
        case "DEPTH":
            shadow_usage = "SHADOW_MASK_GENERATION";
            break;
        default:
            throw "Wrong subscene type";
        }
        m_batch.assign_shadow_receive_dirs(batch, bpy_scene._render.shadow_params, subs_cast);
    }

    var shaders_info = batch.shaders_info;
    m_shaders.set_directive(shaders_info, "SHADOW_USAGE", shadow_usage);

    if (batch.dynamic_grass) {
        var subs_grass_map = m_scgraph.find_subs(graph, "GRASS_MAP");
        if (subs_grass_map)
            prepare_dynamic_grass_batch(batch, subs_grass_map, obj_render);
    }

    if ((batch.type == "DEPTH" || main_type == "COLOR_ID") && !batch.has_nodes)
        return;

    var num_lights = subs.num_lights;
    m_shaders.set_directive(shaders_info, "NUM_LIGHTS", num_lights);
    var num_lfac = num_lights % 2 == 0 ? num_lights / 2:
                                         Math.floor(num_lights / 2) + 1;
    m_shaders.set_directive(shaders_info, "NUM_LFACTORS", num_lfac);

    if (m_shaders.get_fname(shaders_info) == "special_skydome.glslf")
        m_shaders.set_directive(shaders_info, "REFLECTION_PASS", 0);
    m_shaders.set_directive(shaders_info, "SSAO_ONLY", 0);

    if (subs.water_params && subs.water_fog_color_density) {
        m_shaders.set_directive(shaders_info, "WATER_EFFECTS", 1);
    } else {
        m_shaders.set_directive(shaders_info, "WATER_EFFECTS", 0);
    }

    if (subs.water_params && subs.caustics && obj_render.caustics) {
        m_shaders.set_directive(shaders_info, "CAUSTICS", 1);
        m_shaders.set_directive(shaders_info, "CAUST_SCALE", m_shaders.glsl_value(subs.caust_scale));
        m_shaders.set_directive(shaders_info, "CAUST_SPEED", m_shaders.glsl_value(subs.caust_speed, 2));
        m_shaders.set_directive(shaders_info, "CAUST_BRIGHT", m_shaders.glsl_value(subs.caust_brightness));
    } else
        m_shaders.set_directive(shaders_info, "CAUSTICS", 0);

    if (subs.water_params) {
        m_shaders.set_directive(shaders_info, "WAVES_HEIGHT", m_shaders.glsl_value(subs.water_waves_height));
        m_shaders.set_directive(shaders_info, "WAVES_LENGTH", m_shaders.glsl_value(subs.water_waves_length));
        m_shaders.set_directive(shaders_info, "WATER_LEVEL", m_shaders.glsl_value(subs.water_level));
    }

    if (batch.texture_names.indexOf("u_mirrormap") !== -1) {
        m_shaders.set_directive(shaders_info, "REFLECTION_TYPE", "REFL_MIRRORMAP");
    } else if (batch.reflective) {
        // set corresponding reflection texture for object
        if (obj_render.cube_reflection_id != null &&
                m_scgraph.find_subs(graph, "MAIN_CUBE_REFLECT")) {
            var subs_refl = get_cube_refl_subs_by_obj(bpy_scene, obj);
            if (subs_refl) {
                var tex = subs_refl.camera.color_attachment;
                m_batch.append_texture(batch, tex, "u_cube_reflection");
                m_shaders.set_directive(shaders_info, "REFLECTION_TYPE", "REFL_CUBE");
            } else
                m_shaders.set_directive(shaders_info, "REFLECTION_TYPE", "REFL_NONE");
        } else if (obj_render.plane_reflection_id != null &&
                       m_scgraph.find_subs(graph, "MAIN_PLANE_REFLECT")) {
            var subs_refl = get_plane_refl_subs_by_obj(bpy_scene, obj);
            if (subs_refl) {
                var tex = subs_refl.camera.color_attachment;
                m_batch.append_texture(batch, tex, "u_plane_reflection");
                m_shaders.set_directive(shaders_info, "REFLECTION_TYPE", "REFL_PLANE");
            } else
                m_shaders.set_directive(shaders_info, "REFLECTION_TYPE", "REFL_NONE");
        } else
            m_shaders.set_directive(shaders_info, "REFLECTION_TYPE", "REFL_NONE");
    } else {
        m_shaders.set_directive(shaders_info, "REFLECTION_TYPE", "REFL_NONE");
    }

    var subs_sky = m_scgraph.find_subs(graph, "SKY");

    if (subs_sky) {
        if (batch.procedural_sky) {
            var tex = subs_sky.camera.color_attachment;
            m_batch.append_texture(batch, tex, "u_sky");
        } else if (cfg_def.procedural_fog) {
            // by link
            batch.cube_fog = subs_sky.cube_fog;
            m_shaders.set_directive(shaders_info, "PROCEDURAL_FOG", 1);
        } else {
            m_shaders.set_directive(shaders_info, "PROCEDURAL_FOG", 0);
        }
    } else {
        m_shaders.set_directive(shaders_info, "PROCEDURAL_FOG", 0);
    }

    var wls = bpy_scene._render.world_light_set;
    if (wls.use_environment_light) {
        m_shaders.set_directive(shaders_info, "USE_ENVIRONMENT_LIGHT", 1);
        if (wls.environment_color == "SKY_TEXTURE") {
            // it's safe, honestly - it's being checked in the get_world_light_set()
            var tex = null;
            if (wls.environment_texture_slot)
                tex = m_batch.get_batch_texture(wls.environment_texture_slot, false);
            else
                tex = subs_sky.camera.color_attachment;
            m_shaders.set_directive(shaders_info, "SKY_TEXTURE", 1);
            m_batch.append_texture(batch, tex, "u_sky_texture");
        } else if (wls.environment_color == "SKY_COLOR")
            m_shaders.set_directive(shaders_info, "SKY_COLOR", 1);
    }

    if (batch.refractive) {
        if (cfg_def.depth_tex_available)
            m_shaders.set_directive(shaders_info, "USE_REFRACTION_CORRECTION", 1);
        if (batch.type == "MAIN" && batch.has_nodes
                || batch.type == "NODES_GLOW") {
            m_shaders.set_directive(shaders_info, "REFRACTIVE", 1);
            if (bpy_scene._render.refractions)
                m_shaders.set_directive(shaders_info, "USE_REFRACTION", 1);
            else
                m_shaders.set_directive(shaders_info, "USE_REFRACTION", 0);
        } else {
            if (bpy_scene._render.refractions)
                m_shaders.set_directive(shaders_info, "REFRACTIVE", 1);
            else
                m_shaders.set_directive(shaders_info, "REFRACTIVE", 0);
        }
    } else {
        m_shaders.set_directive(shaders_info, "REFRACTIVE", 0);
        m_shaders.set_directive(shaders_info, "USE_REFRACTION", 0);
        m_shaders.set_directive(shaders_info, "USE_REFRACTION_CORRECTION", 0);
    }

    if (batch.water) {
        if (cfg_def.shore_smoothing && batch.water_shore_smoothing
                && m_scgraph.find_subs(graph, "DEPTH")) {
            m_shaders.set_directive(shaders_info, "SHORE_SMOOTHING", 1);
        } else
            m_shaders.set_directive(shaders_info, "SHORE_SMOOTHING", 0);

        if (batch.water_dynamic && subs.water_params && subs.water_waves_height)
            m_shaders.set_directive(shaders_info, "DYNAMIC", 1);
        else
            m_shaders.set_directive(shaders_info, "DYNAMIC", 0);
    }

    if (batch.type == "PARTICLES") {
        m_shaders.set_directive(shaders_info, "SIZE_RAMP_LENGTH", batch.p_size_ramp_length);
        m_shaders.set_directive(shaders_info, "COLOR_RAMP_LENGTH", batch.p_color_ramp_length);
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

    if (batch.lamp_uuid_indexes) {
        var lamp_size = 0;
        for (var key in batch.lamp_uuid_indexes)
            lamp_size++;
        batch.lamp_light_positions = new Float32Array(lamp_size * 3);
        batch.lamp_light_directions = new Float32Array(lamp_size * 3);
        batch.lamp_light_color_intensities = new Float32Array(lamp_size * 3);
        batch.lamp_light_factors = new Float32Array(lamp_size * 4);
        m_shaders.set_directive(shaders_info, "NUM_LAMP_LIGHTS", lamp_size);
        for (var j = 0; j < bpy_scene._objects["LAMP"].length; j++) {
            var lamp = bpy_scene._objects["LAMP"][j];
            set_lamp_data(batch, lamp);
        }
    }
}

function set_lamp_data(batch, lamp) {
    var lamp_uuid = lamp["uuid"];
    if (lamp_uuid in batch.lamp_uuid_indexes) {
        var data_lamp_index = batch.lamp_uuid_indexes[lamp_uuid];
        batch.lamp_light_positions.set(lamp._render.trans, data_lamp_index * 3);
        batch.lamp_light_directions.set(lamp._light.direction, data_lamp_index * 3);
        batch.lamp_light_color_intensities.set(lamp._light.color_intensity, data_lamp_index * 3);
        var light_factor = _vec4_tmp2;
        prepare_lamp_light_factor(lamp._light, light_factor);
        batch.lamp_light_factors.set(light_factor, data_lamp_index * 4);
    }
}

function prepare_lamp_light_factor(light, light_factor) {
    light_factor[0] =-1.0;
    light_factor[1] =-1.0;
    light_factor[2] =-1.0;
    light_factor[3] = light.use_specular ? 1.0 : 0.0;

    switch (light.type) {
        case "POINT":
            light_factor[2] = light.distance;
            break;
        case "SPOT":
            light_factor[2] = light.distance;
            var sp_size = light_factor[0] = Math.cos(light.spot_size / 2.0);
            light_factor[1] = light.spot_blend * (1.0 - sp_size);
            break;
    }
}

function update_batch_lights(scene, batch) {
    var lamps = get_scene_objs(scene, "LAMP", exports.DATA_ID_ALL);
    batch.shaders_info.lights_info = [];
    var shadow_lamp = find_first_lamp_with_shadows(lamps) || lamps[0];
    for (var i = 0; i < lamps.length; i++) {
        var light = lamps[i]._light;

        if (light.type == "AREA")
            continue;

        if (light.type == "SPOT" || light.type == "POINT")
            var sp_size = Math.cos(light.spot_size / 2.0);

        if (light.type == "SPOT")
            var blend = light.spot_blend * (1.0 - sp_size);

        var index = light.index;
        var lfac_index = Math.floor(index / 2);
        var lfac_channels = index % 2 == 0 ? "rg": "ba";
        var is_on = light.use_diffuse || light.use_specular;

        // TODO: support multiple shadow maps for different lamps
        var gen_shadow = index == shadow_lamp._light.index;

        batch.shaders_info.lights_info.push({type:          light.type,
                                             index:         index,
                                             lfac_index:    lfac_index,
                                             lfac_channels: lfac_channels,
                                             spot_size:     sp_size,
                                             spot_blend:    blend,
                                             distance:      light.distance,
                                             is_on:         is_on,
                                             gen_shadow:    gen_shadow});
    }
}

function validate_batch(batch) {
    var shader = batch.shader;
    var attributes = shader.attributes;
    var pointers = batch.bufs_data.pointers;

    for (var attr in attributes) {
        var p = pointers[attr];
        if (!p)
            m_util.panic("missing data for \"" + attr + "\" attribute");
    }

    validate_batch_varyings(batch);
}

function validate_batch_varyings(batch) {
    if (batch.type == "MAIN" || batch.type == "NODES_GLOW") {
        var vcount = m_shaders.get_varyings_count(batch.shader.vshader);
        if (vcount > MAX_SHADER_VARYING_COUNT) {

            if (batch.type == "MAIN")
                m_print.warn("Varying limit exceeded for main shader - "
                        + vcount + ", materials: \"" + batch.material_names.join(", ")
                        + "\"");

            if (batch.type == "MAIN" && batch.has_nodes
                    || batch.type == "NODES_GLOW") {
                var used_uv = 0;
                var used_vc = 0;
                if (batch.uv_maps_usage)
                    used_uv = m_util.get_dict_length(batch.uv_maps_usage);
                if (batch.vertex_colors_usage)
                    used_vc = m_util.get_dict_length(batch.vertex_colors_usage);

                m_print.warn("Varying limit exceeded for node shader - "
                        + vcount + ", uv: " + used_uv + ", vc: " + used_vc
                        + ", materials: \"" + batch.material_names.join(", ") + "\"");
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
    var bb_max_size = Math.max(bb.max_x - bb.min_x, bb.max_z - bb.min_z);

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
 * All batches among bundles must be unique
 * we use id value to determine uniqueness
 * unused
 */
function has_batch(subscene, batch) {
    var sbundles = subscene.bundles;
    for (var i = 0; i < sbundles.length; i++) {
        var sbundle = sbundles[i];
        var sbatch = sbundle.batch;

        if (sbatch && sbatch.id == batch.id)
            return true;
    }

    return false;
}

function debug_report_order(bundles) {
    var names = [];
    for (var i = 0; i < bundles.length; i++) {

        var batch = bundles[i].batch;

        if (batch)
            names.push(batch.name.split("*")[2]);
        else
            names.push("NULL");
    }

    m_print.log(names);
}

/**
 * Add object to main scene
 */
function add_object_subs_depth(subs, obj, graph, bpy_scene, copy) {
    // divide obj by batches
    var batches = obj._batches;

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];

        if (batch.type != "DEPTH" || batch.shadow_cast_only)
            continue;

        if (batch.subtype != "DEPTH" && batch.subtype != "NODES")
            continue;

        if (!copy) {
            update_batch_subs(batch, subs, obj, graph, "DEPTH", bpy_scene);
            m_batch.update_shader(batch);
            validate_batch(batch);
        }

        var rb = init_bundle(obj._render, batch);
        subs.bundles.push(rb);

        connect_textures(graph, subs, batch);
        check_batch_textures_number(batch);
    }
}

function add_object_subs_shadow(subs, obj, graph, bpy_scene, copy) {
    var update_needed = false;
    var obj_render = obj._render;
    var batches = obj._batches;

    var subs_grass_map = m_scgraph.find_subs(graph, "GRASS_MAP");

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];

        if (batch.type != "DEPTH")
            continue;

        if (batch.subtype != "SHADOW_CAST")
            continue;

        update_needed = true;

        if (!copy) {
            m_shaders.set_directive(batch.shaders_info, "SHADOW_USAGE", "SHADOW_CASTING");

            if (batch.dynamic_grass && subs_grass_map)
                prepare_dynamic_grass_batch(batch, subs_grass_map, obj_render);

            m_batch.set_batch_directive(batch, "SHADOW_TEX_RES",
                    m_shaders.glsl_value(
                    bpy_scene._render.shadow_params.csm_resolution));

            m_batch.update_shader(batch);
            validate_batch(batch);
        }

        var rb = init_bundle(obj_render, batch);
        subs.bundles.push(rb);
    }

    if (update_needed)
        update_subs_shadow(subs, m_scgraph.find_subs(graph, "MAIN_OPAQUE"),
                subs.bundles, bpy_scene, true);
}

function add_object_subs_reflect(subs, obj, graph, bpy_scene, copy) {
    var obj_render = obj._render;
    var batches = obj._batches;

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];

        if (batch.type != "MAIN" && batch.type != "PARTICLES")
            continue;

        if (batch.subtype != "REFLECT")
            continue;

        // do not render reflected object on itself
        if (subs.type == "MAIN_PLANE_REFLECT") {
            var refl_id = get_plane_refl_id_by_subs(bpy_scene, subs);
            if (refl_id == obj_render.plane_reflection_id)
                continue;
        } else {
            var refl_id = get_cube_refl_id_by_subs(bpy_scene, subs);
            if (refl_id == obj_render.cube_reflection_id)
                continue;
        }

        if (!copy) {
            update_batch_subs(batch, subs, obj, graph, "REFLECT", bpy_scene);
            var shaders_info = batch.shaders_info;

            m_shaders.set_directive(shaders_info, "DISABLE_FOG", 0);

            m_shaders.set_directive(shaders_info, "WATER_EFFECTS", 0);

            if (m_shaders.get_fname(shaders_info) == "special_skydome.glslf")
                m_shaders.set_directive(shaders_info, "REFLECTION_PASS", 1);

            // disable normalmapping in shader for optimization purposes
            m_shaders.set_directive(shaders_info, "TEXTURE_NORM", 0);

            update_batch_lights(bpy_scene, batch);
            m_batch.update_shader(batch);
            validate_batch(batch);
        }

        var rb = init_bundle(obj_render, batch);
        subs.bundles.push(rb);

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

    // also update shadow subscene camera
    var subs_main = get_subs(bpy_scene, "MAIN_OPAQUE");

    var graph = bpy_scene._render.graph;
    var recalc_z_bounds = true;

    m_graph.traverse(graph, function(node, attr) {
        var subs = attr;
        if (subs.type === "SHADOW_CAST") {
            update_subs_shadow(subs, subs_main, subs.bundles, bpy_scene,
                    recalc_z_bounds);
            recalc_z_bounds = false;
        }
    });
}

/**
 * Update shadow subscene camera based on main subscene light
 * uses _vec3_tmp, _mat4_tmp, _corners_cache
 * @methodOf scenes
 */
function update_subs_shadow(subs, subs_main, cast_bundles, bpy_scene,
        recalc_z_bounds) {
    if (cast_bundles.length == 0)
        return;

    var cam = subs.camera;

    var cam_main = subs_main.camera;
    var lamps = get_scene_objs(bpy_scene, "LAMP", exports.DATA_ID_ALL);
    // light view matrix
    var lamp = find_first_lamp_with_shadows(lamps) || lamps[0];

    if (!lamp)
        return;

    var lamp_render = lamp._render;
    m_cam.set_view_trans_quat(cam, lamp_render.trans, lamp_render.quat);

    // NOTE: inherit light camera eye from main camera (used in LOD calculations)
    m_vec3.copy(cam_main.eye, cam.eye);
    // NOTE: inherit view_matrix from main camera
    m_mat4.copy(cam_main.view_matrix, cam.shadow_cast_billboard_view_matrix);

    if (lamp._light.type == "SPOT" || lamp._light.type == "POINT")
        m_cam.set_projection(cam, cam.aspect);
    else {
        // determine camera frustum for shadow casting

        var bb_world = get_shadow_casters_bb(cast_bundles, _bb_tmp);
        var bb_corners = m_bounds.extract_bb_corners(bb_world, _corners_cache);
        // transform bb corners to light view space
        m_util.positions_multiply_matrix(bb_corners, cam.view_matrix, bb_corners);

        if (bpy_scene._render.shadow_params.enable_csm) {
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
            }
            bb_view = correct_bb_proportions(bb_view);
        }

        m_cam.set_frustum_asymmetric(cam, bb_view.min_x, bb_view.max_x,
                bb_view.min_y, bb_view.max_y, -bb_view.max_z, -bb_view.min_z);
        m_cam.set_projection(cam);
    }
    m_util.extract_frustum_planes(cam.view_proj_matrix, cam.frustum_planes);
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

function get_shadow_casters_bb(cast_bundles, dest) {
    m_bounds.zero_bounding_box(dest);

    for (var i = 0; i < cast_bundles.length; i++) {
        // not all casters will be unique
        var render = cast_bundles[i].obj_render;

        if (i == 0)
            m_bounds.copy_bb(render.bb_world, dest);
        else
            m_bounds.expand_bounding_box(dest, render.bb_world);
    }

    return dest;
}

function find_first_lamp_with_shadows(lamps) {
    for (var i = 0; i < lamps.length; i++) {
        var lamp = lamps[i];
        if (lamp["data"]["b4w_generate_shadows"])
            return lamp;
    }
    return false;
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

function add_object_subs_color_picking(subs, obj, graph, bpy_scene, copy) {

    var obj_render = obj._render;
    var batches = obj._batches;

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];

        if (batch.type != "COLOR_ID")
            continue;

        if (!copy) {
            update_batch_subs(batch, subs, obj, graph, "COLOR_ID", bpy_scene);
            m_batch.update_shader(batch);
            validate_batch(batch);
        }

        if (!(subs.type == "COLOR_PICKING" && batch.subtype == "COLOR_ID" ||
                subs.type == "COLOR_PICKING_XRAY" && batch.subtype == "COLOR_ID_XRAY"))
            continue;

        if (!copy) {
            m_batch.set_batch_directive(batch, "USE_OUTLINE", 0);
            m_batch.update_shader(batch);
            validate_batch(batch);
        }

        var rb = init_bundle(obj_render, batch);
        subs.bundles.push(rb);
    }
}

function add_object_subs_wireframe(subs, obj, graph, copy) {

    var obj_render = obj._render;
    var batches = obj._batches;
    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];

        if (batch.type != "WIREFRAME")
            continue;
        if (!copy) {
            if (batch.dynamic_grass) {
                var subs_grass_map = m_scgraph.find_subs(graph, "GRASS_MAP");
                if (subs_grass_map)
                    prepare_dynamic_grass_batch(batch, subs_grass_map, obj_render);
            }

            m_batch.update_shader(batch);
            validate_batch(batch);
        }

        var rb = init_bundle(obj_render, batch);
        subs.bundles.push(rb);

        connect_textures(graph, subs, batch);
        check_batch_textures_number(batch);
    }

}

/**
 * Add object to depth map scene
 */
function add_object_subs_grass_map(subs, obj, copy) {

    var obj_render = obj._render;
    // divide obj by batches
    var batches = obj._batches;

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];

        if (batch.type != "GRASS_MAP")
            continue;

        if (!copy) {
            m_batch.update_shader(batch);
            validate_batch(batch);
        }

        var rb = init_bundle(obj_render, batch);
        subs.bundles.push(rb);

        // recalculate scene camera

        var cam = subs.camera;
        var bb = obj_render.bb_world;

        var low = subs.grass_map_dim[0];
        var high = subs.grass_map_dim[1];
        var size = subs.grass_map_dim[2];

        if (low == 0 && high == 0) {
            // initial exec
            low = bb.min_y;
            high = bb.max_y;
        } else {
            low = Math.min(low, bb.min_y);
            high = Math.max(high, bb.max_y);
        }

        // NOTE: issue for partially plain meshes near top or bottom
        var map_margin = (high - low) * GRASS_MAP_MARGIN;

        subs.grass_map_dim[0] = low - map_margin;
        subs.grass_map_dim[1] = high + map_margin;
        // subs.grass_map_dim[2] stays intact

        m_cam.set_frustum(cam, size/2, -high, -low, size/2);
        m_cam.set_projection(cam);
    }
}

/**
 * Add object to outline mask scene
 */
function add_object_subs_outline_mask(subs, obj, graph, bpy_scene, copy) {

    var obj_render = obj._render;
    var batches = obj._batches;

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];

        if (batch.type != "COLOR_ID")
            continue;

        if (batch.subtype != "OUTLINE")
            continue;

        if (!copy) {
            m_batch.set_batch_directive(batch, "USE_OUTLINE", 1);
            m_batch.update_shader(batch);
            validate_batch(batch);
        }

        var rb = init_bundle(obj_render, batch);
        subs.bundles.push(rb);
    }

}

/**
 * Hide object.
 * @methodOf scenes
 */
exports.hide_object = function(obj) {
    obj._render.hide = true;
}

/**
 * Show object.
 * @methodOf scenes
 */
exports.show_object = function(obj) {
    obj._render.hide = false;
}

/**
 * Check if object is hidden
 * @methodOf scenes
 */
exports.is_hidden = function(obj) {
    return obj._render.hide;
}

/**
 * Remove object bundles.
 * @methodOf scenes
 */
exports.remove_object_bundles = function(scene, obj, clean_buffs) {
    var render = obj._render;

    var subscenes = subs_array(scene, OBJECT_SUBSCENE_TYPES);
    for (var i = 0; i < subscenes.length; i++) {
        var bundles = subscenes[i].bundles;

        for (var j = bundles.length - 1; j >= 0; j--) {
            var bundle = bundles[j];
            if (bundle.obj_render == render) {
                if (bundle.batch && clean_buffs)
                    m_geom.cleanup_bufs_data(bundle.batch.bufs_data);
                bundles.splice(j, 1);
            }
        }
    }
}

exports.check_object = function(obj, scene) {
    if (scene._objects[obj["type"]] &&
            scene._objects[obj["type"]].indexOf(obj) > -1)
        return true;
    else
        return false;
}


/**
 * NOTE: only main scene supported
 */
function add_bundle(subscene, render, batch) {
    var rb = init_bundle(render, batch);
    subscene.bundles.push(rb);
}

/**
 * NOTE: only main scene supported
 */
function remove_bundle(subscene, render) {

    var bundles = subscene.bundles;

    for (var i = 0; i < bundles.length; i++) {
        var bundle = bundles[i];
        if (bundle.obj_render == render) {
            bundles.splice(i, 1);
            i--;
        }
    }
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

exports.sort_lamps = function(scene) {
    var lamps = scene._objects["LAMP"];
    if (lamps.length != scene._render.num_lamps_added)
        return;

    var lamp_indexes = [];
    for (var i = 0; i < lamps.length; i++)
        lamp_indexes[lamps[i]._light.index] = i;

    for (var i = 0; i < lamp_indexes.length - 1; i++) {
        for (var j = i + 1; j < lamp_indexes.length; j++) {
            if (sort_func(lamps[lamp_indexes[i]]._light,
                          lamps[lamp_indexes[j]]._light)) {
                var tmp = lamp_indexes[i];
                lamp_indexes[i] = lamp_indexes[j];
                lamp_indexes[j] = tmp;
            }
        }
    }

    for (var i = 0; i < lamp_indexes.length; i++) {
        lamps[lamp_indexes[i]]._light.index = i;
        update_lamp_scene(lamps[lamp_indexes[i]], scene, true);
    }
}

exports.update_lamp_scene = update_lamp_scene;
/**
 * Update light parameters on subscenes
 */
function update_lamp_scene(lamp, scene) {
    var subs_arr = subs_array(scene, LIGHT_SUBSCENE_TYPES);

    var light = lamp._light;
    var lamp_render = lamp._render;
    var ind = light.index;

    for (var i = 0; i < subs_arr.length; i++) {
        var subs = subs_arr[i];

        subs.light_positions.set(lamp_render.trans, ind * 3);
        subs.light_directions.set(light.direction, ind * 3);
        subs.light_color_intensities.set(light.color_intensity, ind * 3);

        switch (light.type) {
        case "SUN":
            subs.sun_quaternion.set(lamp_render.quat);
            // by link
            subs.sun_intensity = light.color_intensity;

            if (subs.type === "SKY") {
                var auxilary_vec = _vec3_tmp;
                auxilary_vec[0] = auxilary_vec[1] = auxilary_vec[2] = 1;
                var prev_angle = Math.acos(m_vec3.dot(subs.sun_direction, auxilary_vec));
                var new_angle  = Math.acos(m_vec3.dot(light.direction, auxilary_vec));
                var floor_prev = Math.floor(prev_angle / 0.025);
                var floor_new  = Math.floor(new_angle / 0.025);

                if (floor_prev != floor_new)
                    subs.need_fog_update = true;
                else
                    subs.need_fog_update = false;

                m_vec3.copy(light.direction, subs.sun_direction);

                update_sky(scene, subs);
            } else
                m_vec3.copy(light.direction, subs.sun_direction);
        case "HEMI":
        case "POINT":
        case "SPOT":
            break;
        default:
            // TODO: prevent export of such lamps
            m_print.error("Unknown light type: " + light.type + "\".");
            break;
        }

        var light_factor = _vec2_tmp;
        light_factor[0] = light.use_diffuse ? 1.0 : 0.0;
        light_factor[1] = light.use_specular ? 1.0 : 0.0;

        subs.light_factors.set(light_factor, ind * 2);
        subs.need_perm_uniforms_update = true;

        for (var j = 0; j < subs.bundles.length; j++) {
            var batch = subs.bundles[j].batch;
            if (batch.lamp_uuid_indexes)
                set_lamp_data(batch, lamp);
        }
    }
}

function update_sky(scene, subs) {
    m_render.draw(subs);
    if (subs.need_fog_update) {
        var main_subs = subs_array(scene, ["MAIN_OPAQUE",
                                           "MAIN_BLEND",
                                           "MAIN_XRAY",
                                           "MAIN_GLOW"]);
        for (var i = 0; i < main_subs.length; i++) {
            var m_subs = main_subs[i];
            var bundles = m_subs.bundles;
            for (var j = 0; j < bundles.length; j++) {
                var bundle = bundles[j];

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

/**
 * Perform module cleanup
 */
exports.cleanup = function() {
    for (var i = 0; i < _scenes.length; i++) {
        var scene = _scenes[i];
        var graph = scene._render.graph;

        m_graph.traverse(graph, function(node, attr) {
            if (!(attr.type == "SINK"))
                clear_subscene(attr);
        });

        scene._render.graph = [];
        scene._render.queue = [];
    }

    _main_scene = null;
    _active_scene = null;
    _scenes.length = 0;
    _scenes_graph = null;
    _outline_anim_objs.length = 0;

    _wind[0] = 0;
    _wind[1] = 0;
    _wind[2] = 0;
}

/**
 * Clear subscene
 */
function clear_subscene(subs) {

    var cam = subs.camera;

    m_render.render_target_cleanup(cam.framebuffer, cam.color_attachment,
            cam.depth_attachment, cam.width, cam.height);

    var bundles = subs.bundles;
    for (var i = 0; i < bundles.length; i++) {
        var batch = bundles[i].batch
        if (batch)
            m_batch.clear_batch(batch);
    }
}


/**
 * Extract frustum from camera, make debug geometry and add to active scene
 * for debug purposes only
 */
exports.make_frustum_shot = function(cam, subscene, color) {
    var corners = m_cam.extract_frustum_corners(cam, cam.near, cam.far, null, true);
    var submesh = m_primitives.generate_frustum(corners);
    //var submesh = m_primitives.generate_plane(5,5);

    var render = m_obj.create_render("DYNAMIC");

    render.bb_world = render.bb_local = m_bounds.big_bounding_box();
    render.bs_world = render.bs_local = m_bounds.big_bounding_sphere();

    var radius = render.bs_world.radius;
    render.be_world = render.be_local = m_bounds.create_bounding_ellipsoid(
            [radius, 0, 0], [0, radius, 0], [0, 0, radius],
            render.bs_world.center)

    var batch = m_batch.create_shadeless_batch(submesh, color, 0.5);

    add_bundle(subscene, render, batch);
}

exports.get_scene_objs = get_scene_objs;
/**
 * Get all objects from the scene.
 * @methodOf scenes
 */
function get_scene_objs(scene, type, data_id) {
    if (!scene._objects)
        throw "Access to uninitialized scene";

    var objs_by_type = scene._objects[type] || [];

    if (data_id == exports.DATA_ID_ALL)
        return objs_by_type;
    else {
        var objs = [];
        for (var i = 0; i < objs_by_type.length; i++) {
            var obj = objs_by_type[i];
            if (obj._render.data_id == data_id)
                objs.push(obj);
        }
        return objs;
    }
}

/**
 * Get all unuque materials of mesh objects from given scene
 */
function get_scene_materials(scene) {

    var mats = [];

    var objs = get_scene_objs(scene, "MESH", exports.DATA_ID_ALL);

    for (var i = 0; i < objs.length; i++) {
        var obj = objs[i];
        var mesh = obj["data"];

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


exports.setup_dim = function(width, height, scale) {
    m_cont.setup_viewport_dim(width, height, scale);

    if (_active_scene)
        setup_scene_dim(_active_scene, width, height);
}

/**
 * Setup dimension for specific scene subscenes
 */
function setup_scene_dim(scene, width, height) {
    var sc_render = scene._render;

    var upd_cameras = scene["camera"]._render.cameras;
    for (var i = 0; i < upd_cameras.length; i++) {
        var cam = upd_cameras[i];
        m_cam.set_projection(cam, width/height);

        // NOTE: update size of camera shadow cascades
        if (sc_render.render_shadows)
            m_cam.update_camera_shadows(cam, sc_render.shadow_params);
    }

    if (sc_render.render_shadows) {
        sc_render.need_shadow_update = true;
        get_subs(scene, "DEPTH").need_perm_uniforms_update = true;
        get_subs(scene, "MAIN_BLEND").need_perm_uniforms_update = true;
    }

    var graph = sc_render.graph;

    m_scgraph.traverse_slinks(graph, function(slink, internal, subs1, subs2) {

        if (!slink.update_dim)
            return;

        var tex_width = slink.size_mult * width;
        var tex_height = slink.size_mult * height;
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
            case "DOF":
                set_dof_params(scene, {"dof_power": subs1.camera.dof_power,
                                       "dof_on": subs1.camera.dof_on});
                break;
            case "GLOW_COMBINE":
                set_glow_material_params(scene,
                        {"small_glow_mask_width": subs1.small_glow_mask_width,
                        "large_glow_mask_width": subs1.large_glow_mask_width});
                break;
            case "BLOOM":
                set_bloom_params(scene,
                        {"bloom_blur": subs1.bloom_blur});
                break;
            case "OUTLINE":
                var subs_outline_blur_y = m_scgraph.find_input(graph, subs1,
                        "POSTPROCESSING");
                var subs_outline_blur_x = m_scgraph.find_input(graph, subs_outline_blur_y,
                        "POSTPROCESSING");
                var subs_outline_extend_y = m_scgraph.find_input(graph, subs_outline_blur_x,
                        "POSTPROCESSING");
                var subs_outline_extend_x = m_scgraph.find_input(graph, subs_outline_extend_y,
                        "POSTPROCESSING");

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
    var scene_subscenes = scene._render.graph;

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

    var subs = subs_array(scene, LIGHT_SUBSCENE_TYPES)[0];

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
 * Set horizon and/or zenith color(s)
 */
function set_environment_colors(scene, opt_environment_energy,
        opt_horizon_color, opt_zenith_color) {

    var subscenes = subs_array(scene, LIGHT_SUBSCENE_TYPES);

    for (var i = 0; i < subscenes.length; i++) {
        var subs = subscenes[i];

        if (!isNaN(opt_environment_energy)) {
            subs.environment_energy = opt_environment_energy;
        }

        if (opt_horizon_color)
            subs.horizon_color.set(opt_horizon_color);
        if (opt_zenith_color)
            subs.zenith_color.set(opt_zenith_color);

        subs.need_perm_uniforms_update = true;
    }
}

/**
 * Get sky params
 */
exports.get_sky_params = function(scene) {

    var subs = get_subs(scene, "SKY");
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

    var subs = get_subs(scene, "SKY");

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

    var subs = get_subs(scene, "SSAO");
    var subs_blur = get_subs(scene, "SSAO_BLUR");
    if (!subs)
        return null;

    var batch = subs.bundles[0].batch;

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

    var subs = get_subs(scene, "SSAO");
    var subs_blur = get_subs(scene, "SSAO_BLUR");

    if (!subs) {
        m_print.error("SSAO is not enabled on the scene");
        return 0;
    }

    if (typeof ssao_params.ssao_quality == "string") {
        var batch = subs.bundles[0].batch;
        m_batch.set_batch_directive(batch, "SSAO_QUALITY", ssao_params.ssao_quality);
        m_batch.update_shader(batch, true);
    }

    if (typeof ssao_params.ssao_hemisphere == "number") {
        var batch = subs.bundles[0].batch;
        m_batch.set_batch_directive(batch, "SSAO_HEMISPHERE", ssao_params.ssao_hemisphere);
        m_batch.update_shader(batch, true);
    }

    if (typeof ssao_params.ssao_blur_depth == "number") {
        var batch = subs_blur.bundles[0].batch;
        m_batch.set_batch_directive(batch, "SSAO_BLUR_DEPTH", ssao_params.ssao_blur_depth);
        m_batch.update_shader(batch, true);
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
        var subs = get_subs(scene, "MAIN_OPAQUE");
        subs.ssao_only = ssao_params.ssao_only;
        for (var i = 0; i < subs.bundles.length; i++) {
            var batch = subs.bundles[i].batch;
            m_batch.set_batch_directive(batch, "SSAO_ONLY", ssao_params.ssao_only);
            m_batch.update_shader(batch, true);
        }
    }

    if (typeof ssao_params.ssao_white == "number") {
        var batch = subs.bundles[0].batch;
        m_batch.set_batch_directive(batch, "SSAO_WHITE", ssao_params.ssao_white);
        m_batch.update_shader(batch, true);
    }

    subs.need_perm_uniforms_update = true;
    subs_blur.need_perm_uniforms_update = true;
}

exports.get_dof_params = function(scene) {

    var subs = get_subs(scene, "DOF");
    if (!subs)
        return null;

    var dof_params = {};

    dof_params.dof_distance = subs.camera.dof_distance;
    dof_params.dof_front = subs.camera.dof_front;
    dof_params.dof_rear = subs.camera.dof_rear;
    dof_params.dof_power = subs.camera.dof_power;
    dof_params.dof_object = subs.camera.dof_object;

    return dof_params;
}

exports.set_dof_params = set_dof_params;
function set_dof_params(scene, dof_params) {

    var subs = get_subs(scene, "DOF");
    if (!subs) {
        m_print.error("DOF is not enabled on the scene. Check camera settings");
        return 0;
    }

    var graph = scene._render.graph;

    if (typeof dof_params.dof_on == "boolean")
        subs.camera.dof_on = parseFloat(dof_params.dof_on);
    if (typeof dof_params.dof_distance == "number")
        subs.camera.dof_distance = dof_params.dof_distance;
    if (typeof dof_params.dof_front == "number")
        subs.camera.dof_front = dof_params.dof_front;
    if (typeof dof_params.dof_rear == "number")
        subs.camera.dof_rear = dof_params.dof_rear;
    if (typeof dof_params.dof_power == "number") {
        subs.camera.dof_power = dof_params.dof_power;
        var subs_pp1 = m_scgraph.find_input(graph, subs, "POSTPROCESSING");
        var subs_pp2 = m_scgraph.find_input(graph, subs_pp1, "POSTPROCESSING");

        m_scgraph.set_texel_size_mult(subs_pp1, subs.camera.dof_power);
        m_scgraph.set_texel_size(subs_pp1, 1/subs.camera.width,
                                           1/subs.camera.height);
        m_scgraph.set_texel_size_mult(subs_pp2, subs.camera.dof_power);
        m_scgraph.set_texel_size(subs_pp2, 1/subs.camera.width,
                                           1/subs.camera.height);
    }
    subs.need_perm_uniforms_update = true;
}

exports.get_god_rays_params = function(scene) {

    var gr_subs = subs_array(scene, ["GOD_RAYS"]);
    var combo_subs = get_subs(scene, "GOD_RAYS_COMBINE");

    if (!gr_subs || !combo_subs)
        return null;

    var god_rays_params = {};

    god_rays_params.god_rays_max_ray_length = gr_subs[0].max_ray_length;
    god_rays_params.god_rays_intensity = combo_subs.god_rays_intensity;

    var batch = gr_subs[0].bundles[0].batch;
    god_rays_params.god_rays_steps = m_batch.get_batch_directive(batch, "STEPS_PER_PASS")[1];

    return god_rays_params;
}

exports.set_god_rays_params = function(scene, god_rays_params) {

    var gr_subs = subs_array(scene, ["GOD_RAYS"]);
    var combo_subs = get_subs(scene, "GOD_RAYS_COMBINE");

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

            var batch = gr_subs[i].bundles[0].batch;
            m_batch.set_batch_directive(batch, "STEPS_PER_PASS", steps);
            m_batch.update_shader(batch, true);
        }
    }
    combo_subs.need_perm_uniforms_update = true;
}

exports.get_bloom_params = function(scene) {

    var lum_subs = get_subs(scene, "LUMINANCE_TRUNCED");
    var bloom_subs = get_subs(scene, "BLOOM");

    if (!lum_subs || !bloom_subs) {
        return null;
    }

    var bloom_params = {};

    bloom_params.bloom_key = lum_subs.bloom_key;
    bloom_params.bloom_edge_lum = lum_subs.bloom_edge_lum;
    bloom_params.bloom_blur = bloom_subs.bloom_blur;

    return bloom_params;
}

exports.set_bloom_params = set_bloom_params
function set_bloom_params(scene, bloom_params) {

    var lum_subs = get_subs(scene, "LUMINANCE_TRUNCED");
    var bloom_subs = get_subs(scene, "BLOOM");

    if (!lum_subs || !bloom_subs) {
        m_print.error("Bloom is not enabled on the scene");
        return 0;
    }

    if (typeof bloom_params.bloom_key == "number") {
        lum_subs.bloom_key = bloom_params.bloom_key;
        lum_subs.need_perm_uniforms_update = true;
    }
    if (typeof bloom_params.bloom_edge_lum == "number") {
        lum_subs.bloom_edge_lum = bloom_params.bloom_edge_lum;
        lum_subs.need_perm_uniforms_update = true;
    }
    if (typeof bloom_params.bloom_blur == "number") {
        var graph = scene._render.graph;
        var subs_blur1 = m_scgraph.find_input(graph, bloom_subs, "BLOOM_BLUR");
        var subs_blur2 = m_scgraph.find_input(graph, subs_blur1, "BLOOM_BLUR");
        bloom_subs.bloom_blur = bloom_params.bloom_blur;
        m_scgraph.set_texel_size_mult(subs_blur1, bloom_params.bloom_blur);
        m_scgraph.set_texel_size(subs_blur1, 1/bloom_subs.camera.width,
                                             1/bloom_subs.camera.height);
        m_scgraph.set_texel_size_mult(subs_blur2, bloom_params.bloom_blur);
        m_scgraph.set_texel_size(subs_blur2, 1/bloom_subs.camera.width,
                                             1/bloom_subs.camera.height);
    }
}

exports.get_glow_material_params = function(scene) {
    var glow_combine_subs = get_subs(scene, "GLOW_COMBINE");

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
    var glow_combine_subs = get_subs(scene, "GLOW_COMBINE");

    if (!glow_combine_subs) {
        m_print.error("Glow is not enabled on the scene");
        return null;
    }

    var graph = scene._render.graph;
    var subs = m_scgraph.get_inputs(graph, glow_combine_subs);

    for (var i = 0; i < subs.length; ++i) {
        var subscene = subs[i];

        if (subscene.type === "POSTPROCESSING" && subscene.subtype === "GLOW_MASK_LARGE")
            var postproc_y_blur_large_subs = subscene;
        if (subscene.type === "POSTPROCESSING" && subscene.subtype === "GLOW_MASK_SMALL")
            var postproc_y_blur_small_subs = subscene;
    }

    var postproc_x_blur_large_subs = m_scgraph.find_input(graph,
            postproc_y_blur_large_subs, "POSTPROCESSING");
    var postproc_x_blur_small_subs = m_scgraph.find_input(graph,
            postproc_y_blur_small_subs, "POSTPROCESSING");

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

exports.get_wind_params = function() {
    var wind = get_wind();
    var length = m_vec3.length(wind);

    if (length == 0)
        return null;

    var angle = Math.atan(wind[0]/wind[2]) * 180 / Math.PI;

    var wind_params = {};
    wind_params.wind_dir = angle;
    wind_params.wind_strength = length;

    return wind_params;
}

exports.set_wind_params = function(scene, wind_params) {

    // get wind object
    var objs = get_scene_objs(scene, "ALL", exports.DATA_ID_ALL);
    for (var i = 0; i < objs.length; i++) {
        var obj = objs[i];
        if (obj["type"] === "EMPTY" && obj["field"]
                                 && obj["field"]["type"] === "WIND") {
            var wind_obj = obj;
        }
    }

    if (!wind_obj) {
        m_print.error("There is no wind on the scene");
        return 0;
    }

    var wind_render = wind_obj._render;
    if (typeof wind_params.wind_dir == "number") {
        var angle =  (wind_params.wind_dir) / 180 * Math.PI;

        // New rotation
        _vec3_tmp = [0, angle, -Math.PI / 2];
        m_util.euler_to_quat(_vec3_tmp, _quat4_tmp);

        wind_render.quat.set(_quat4_tmp);
        update_force(wind_obj);
    }

    if (typeof wind_params.wind_strength == "number") {
        wind_render.force_strength = wind_params.wind_strength;
        update_force(wind_obj);
    }
    update_scene_permanent_uniforms(scene);
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
function get_water_surface_level(pos_x, pos_z) {

    var subs = get_subs(_active_scene, "MAIN_OPAQUE");

    if (!subs || !subs.water_params) {
        m_print.error("get_water_surface_level() - no water parameters on the scene");
        return 0;
    }

    var waves_height = subs.water_waves_height;
    var waves_length = subs.water_waves_length;
    var water_level  = subs.water_level;

    var wp = subs.water_params;

    if (!waves_height || !wp.dynamic)
        return wp.water_level;

    var wind_str = m_vec3.length(subs.wind);
    var time = subs.time;
    if (wind_str)
        time *= wind_str;

    // small waves
    var cellular_coords = _vec2_tmp;
    cellular_coords[0] = 20.0 / waves_length * (pos_x - 0.25 * time);
    cellular_coords[1] = 20.0 / waves_length * (pos_z - 0.25 * time);
    var cellular1 = m_util.cellular2x2(cellular_coords);
    cellular_coords[0] = 17.0 / waves_length * (pos_z + 0.1  * time);
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
    noise_coords[1] = dst_noise_scale0 * (pos_z + dst_noise_freq0 * time);
    var noise1 = m_util.snoise(noise_coords);

    noise_coords[0] = dst_noise_scale1 * (pos_z - dst_noise_freq1 * time);
    noise_coords[1] = dst_noise_scale1 * (pos_x - dst_noise_freq1 * time);
    var noise2 = m_util.snoise(noise_coords);
    var dist_waves = waves_height * noise1 * noise2;

    if (subs.use_shoremap) {
        // waves moving towards the shore

        // center and size of shore distance field
        var size_x = subs.shoremap_size[0];
        var size_z = subs.shoremap_size[1];
        var center_x = subs.shoremap_center[0];
        var center_z = subs.shoremap_center[1];

        // get uv coords on shore distance map
        var x = (pos_x - center_x) / size_x;
        var z = (center_z + pos_z) / size_z;
        x += 0.5;
        z += 0.5;

        // if position is out of boundings, consider that shore dist = 1
        if (x > 1 || x < 0 || z > 1 || z < 0) {
            var wave_height = dist_waves;
        } else {
            var width = subs.shoremap_tex_size;
            var array = _active_scene._render.shore_distances;
            var shore_dist = m_util.get_array_smooth_value(array, width, x, z);
            var dir_min_shore_fac = wp.dir_min_shore_fac;
            var dir_freq          = wp.dir_freq;
            var dir_noise_scale   = wp.dir_noise_scale;
            var dir_noise_freq    = wp.dir_noise_freq;
            var dir_min_noise_fac = wp.dir_min_noise_fac;
            var dst_min_fac       = wp.dst_min_fac;
            var waves_hor_fac     = wp.waves_hor_fac;

            var max_shore_dist = subs.max_shore_dist;
            var shore_waves_length = waves_length / max_shore_dist / Math.PI;
            // waves moving towards the shore
            var waves_coords = [dir_noise_scale / waves_length * (pos_x + dir_noise_freq * time),
                                dir_noise_scale / waves_length * (pos_z + dir_noise_freq * time)];

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

    var subs = get_subs(scene, "MAIN_OPAQUE");

    if (!subs)
        return;

    water_params.waves_height = subs.water_waves_height;
    water_params.waves_length = subs.water_waves_length;

    if (subs.water_fog_color_density){
        water_params.water_fog_density = subs.water_fog_color_density[3];
        var wfc = water_params.water_fog_color = [];
        wfc[0]  = subs.water_fog_color_density[0];
        wfc[1]  = subs.water_fog_color_density[1];
        wfc[2]  = subs.water_fog_color_density[2];
    }
}

exports.set_water_params = function(scene, water_params) {

    var subs = get_subs(scene, "MAIN_OPAQUE");

    if (!subs || !subs.water_params) {
        m_print.error("set_water_params() - no water parameters on the scene");
        return null;
    }

    var wp = subs.water_params;

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

exports.get_shore_dist = function(trans, v_dist_mult) {
    var subs = get_subs(_active_scene, "MAIN_OPAQUE");

    if (!subs.use_shoremap)
        return SHORE_DIST_COMPAT;

    // center and size of shore distance field
    var size_x = subs.shoremap_size[0];
    var size_z = subs.shoremap_size[1];
    var center_x = subs.shoremap_center[0];
    var center_z = subs.shoremap_center[1];
    var max_shore_dist = subs.max_shore_dist;

    var water_level = subs.water_level;

    // get uv coords on shore distance map
    var x = (trans[0] - center_x) / size_x;
    var z = (center_z + trans[2]) / size_z;
    x += 0.5;
    z += 0.5;

    // if position is out of boundings, consider that shore dist = 1
    if (x > 1 || x < 0 || z > 1 || z < 0) {
        var shore_dist = 1.0;
    } else {
        var width = subs.shoremap_tex_size;
        var array = _active_scene._render.shore_distances;
        var shore_dist_xz = max_shore_dist * m_util.get_array_smooth_value(array, width, x, z);
        var shore_dist_y  = (water_level - trans[1]) * v_dist_mult;

        var shore_dist = Math.sqrt(shore_dist_xz * shore_dist_xz +
                shore_dist_y * shore_dist_y);
        return shore_dist;
    }
}

/**
 * Executed every frame
 * update all scenes
 */
exports.update = function(timeline, elapsed) {

    var active_cam_render = get_active()["camera"]._render;

    // update subscene params (uniforms)
    for (var i = 0; i < _scenes.length; i++) {
        var scene = _scenes[i];
        var graph = scene._render.graph;

        if (scene._render.water_params) {
            var cam_water_depth = active_cam_render.trans[1]
                 - get_water_surface_level(active_cam_render.trans[0],
                                           active_cam_render.trans[2]);
        }

        var textures = scene._render.video_textures;

        for (var j = 0; j < textures.length; j++) {
            var texture = textures[j]._render;
            var video = texture.video_file;
            var end_frame = texture.frame_duration +
                    texture.frame_offset;
            if (video) {
                var curren_frame = Math.round(video.currentTime * texture.fps);
                var start_time = texture.frame_offset / texture.fps;

                var frame_eps = (cfg_def.is_mobile_device) ? FRAME_EPS : 0;

                if ((curren_frame < texture.frame_offset - frame_eps) ||
                        textures[j]._render.use_cyclic && curren_frame > end_frame)
                    video.currentTime = start_time;

                if (!texture.use_cyclic && curren_frame > end_frame)
                    video.pause();

                if (video.readyState >= 2 && !video.paused)
                    m_tex.update_video_texture(texture);
            } else
                if (texture.seq_video) {
                    var length = Math.min(texture.seq_video.length, texture.frame_duration + texture.frame_offset);
                    if ((texture.seq_cur_frame < texture.frame_offset) ||
                            texture.use_cyclic && texture.seq_cur_frame >= length)
                        texture.seq_cur_frame = texture.frame_offset;
                    if (!texture.use_cyclic && texture.seq_cur_frame >= length)
                        texture.seq_video_played = false;
                    var time = Math.round(timeline * cfg_ani.framerate / texture.fps) * texture.seq_fps;
                    if (time != _seq_video_time && texture.seq_video_played) {
                        m_tex.update_seq_video_texture(texture);
                        texture.seq_cur_frame++;
                    }

                    _seq_video_time = time;
            }
        }
        m_graph.traverse(graph, function(node, attr) {
            var subs = attr;
            if (TIME_SUBSCENE_TYPES.indexOf(subs.type) > -1) {
                subs.time = timeline;
            }
            if (scene._render.water_params) {
                subs.cam_water_depth = cam_water_depth;
            }
        });

    }

    // rendering
    for (var i = 0; i < _scenes.length; i++) {
        var scene = _scenes[i];
        var render = scene._render;
        var queue = render.queue;

        // just before rendering
        if (render.need_shadow_update) {
            update_shadow_subscenes(scene);
            render.need_shadow_update = false;
        }

        if (render.need_grass_map_update) {
            update_subs_grass_map(scene);
            render.need_grass_map_update = false;
        }

        // check if rendering needed
        if (!queue.length)
            continue;

        if (scene["b4w_enable_motion_blur"]) {
            update_motion_blur_subscenes(render.graph, elapsed);
        }

        // NOTE: temoporary disabled T2X mode due to artifacts with blend objects
        //if (cfg_def.smaa && !m_cfg.context.alpha)
        //    update_smaa_resolve_subscene(render.graph);

        // render outline animation
        if (render.outline) {
            // update outline animation
            var summ_intensity = 0;
            for (var i = 0; i < scene._objects["MESH"].length; i++) {
                var obj = scene._objects["MESH"][i];
                summ_intensity += obj._render.outline_intensity;
                if (_outline_anim_objs.indexOf(obj) != -1)
                    update_obj_outline_intensity(obj, timeline);
            }
            m_graph.traverse(scene._render.graph, function(node, attr) {
                if (attr.type === "OUTLINE")
                    attr.draw_outline_flag = summ_intensity;
            });

        }

        // find outline mask scene index
        var outline_mask_subs_index = null;
        for (var j = 0; j < queue.length; j++)
            if (queue[j].type == "OUTLINE_MASK")
                outline_mask_subs_index = j;

        for (var j = 0; j < queue.length; j++) {
            var qsubs = queue[j];
            m_prerender.prerender_subs(qsubs);

            // optimize outline supporting subscenes
            if (outline_mask_subs_index !== null)
                optimize_outline_postprocessing(render.graph, qsubs,
                        queue[outline_mask_subs_index])

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

function optimize_outline_postprocessing(graph, qsubs, outline_mask_subs) {
    // optimize outline POSTPROCESSING subscenes rendering
    if (qsubs.is_for_outline && qsubs.type == "POSTPROCESSING")
        if (outline_mask_subs.do_render != qsubs.do_render)
            qsubs.do_render = outline_mask_subs.do_render;

    // optimize OUTLINE rendering if OUTLINE_MASK is switched off
    if (!outline_mask_subs.do_render && qsubs.type == "OUTLINE")
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

    var bundles = subs.bundles;
    for (var i = 0; i < bundles.length; i++) {
        var batch = bundles[i].batch;
        m_batch.replace_texture(batch, tex, name);
    }
}


/**
 * Update position of grass map camera.
 */
function update_subs_grass_map(bpy_scene) {

    var subs_grass_map = get_subs(bpy_scene, "GRASS_MAP");
    if (subs_grass_map) {
        var cam = subs_grass_map.camera;

        var camera_render = bpy_scene["camera"]._render;
        var camera_trans = camera_render.trans;

        // calculate grass map center point position relative to camera position
        var trans = _vec3_tmp;
        trans[0] = 0;
        trans[1] = -subs_grass_map.grass_map_dim[2] / 2;
        trans[2] = 0;
        m_vec3.transformQuat(trans, camera_render.quat, trans);

        // XZ plane
        trans[0] += camera_trans[0];
        trans[1] = 0;
        trans[2] += camera_trans[2];

        // no rotation camera looks down
        var quat = _quat4_tmp;
        quat[0] = 0;
        quat[1] = 0;
        quat[2] = 0;
        quat[3] = 1;

        m_cam.set_view_trans_quat(cam, trans, quat);
    }
}


function update_motion_blur_subscenes(graph, elapsed) {
    // TODO: initialize motion blur accumulator texture from rendering input on
    // the first iteration

    m_graph.traverse(graph, function(id, attr) {
        var subs = attr;

        if (subs.type != "MOTION_BLUR")
            return;

        if (!subs.slinks_internal[0] || !subs.textures_internal[0])
            throw "Wrong MOTION_BLUR subscene";

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

        if (subs.type != "SMAA_RESOLVE")
            return;

        if (!subs.slinks_internal[0] || !subs.textures_internal[0])
            throw "Wrong SMAA RESOLVE subscene";

        var tex = subs.textures_internal[0];

        m_graph.traverse_inputs(graph, id, function(id_in, subs_in,
                attr_edge) {
            if (subs_in.type != "VELOCITY") {
                subs.textures_internal[0] = subs_in.camera.color_attachment;
                replace_attachment(graph, id_in, attr_edge.from, tex);
            }
        });

        replace_texture(graph, id, "u_color", tex);
        replace_texture(graph, id, "u_color_prev", subs.textures_internal[0]);
    });
}

function update_obj_outline_intensity(obj, timeline) {
    var outline_intensity = 0;
    var ga_settings = obj._outline_anim;
    if (ga_settings.time_start == 0)
        ga_settings.time_start = timeline;

    var dt = timeline - ga_settings.time_start;
    if (ga_settings.relapses && dt / ga_settings.period >= ga_settings.relapses) {
        exports.clear_outline_anim(obj);
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

    obj._render.outline_intensity = outline_intensity;
}

exports.get_all_subscenes = function(scene) {
    var graph = scene._render.graph;

    var subscenes = [];
    m_graph.traverse(graph, function(node, attr) {
        subscenes.push(attr);
    });

    return subscenes;
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

exports.clear_outline_anim = function(obj) {
    obj._render.outline_intensity = 0;

    var ind = _outline_anim_objs.indexOf(obj);
    if (ind != -1)
        _outline_anim_objs.splice(ind, 1);
}

exports.cleanup_outline_anim = function() {
    _outline_anim_objs = [];
}

exports.get_cam_water_depth = function() {
    var subs = get_subs(_active_scene, "MAIN_BLEND");
    var scene = _active_scene;

    if (!subs && !scene._render.water_params)
        return null;

    return subs.cam_water_depth;
}

exports.get_object_data_id = function(obj) {
    return obj._render.data_id;
}

exports.update_scene_permanent_uniforms = update_scene_permanent_uniforms;
function update_scene_permanent_uniforms(scene) {
    var graph = scene._render.graph;

    m_graph.traverse(graph, function(node, subs){
        subs.need_perm_uniforms_update = true;
    });
}

exports.set_wireframe_mode = function(subs_wireframe, mode) {
    switch (mode) {
    case "WM_NONE":
        subs_wireframe.do_render = false;
        break;
    case "WM_OPAQUE_WIREFRAME":
    case "WM_TRANSPARENT_WIREFRAME":
    case "WM_FRONT_BACK_VIEW":
    case "WM_DEBUG_SPHERES":
        for (var i = 0; i < subs_wireframe.bundles.length; i++) {
            var batch = subs_wireframe.bundles[i].batch;
            batch.wireframe_mode = m_debug.WIREFRAME_MODES[mode];
        }
        subs_wireframe.do_render = true;
        break;
    }
    subs_wireframe.blend = (mode == "WM_TRANSPARENT_WIREFRAME");
    subs_wireframe.need_perm_uniforms_update = true;
}

exports.set_wireframe_edge_color = function(subs_wireframe, color) {
    for (var i = 0; i < subs_wireframe.bundles.length; i++) {
        var batch = subs_wireframe.bundles[i].batch;
        batch.wireframe_edge_color = color;
        subs_wireframe.need_perm_uniforms_update = true;
    }
}

exports.add_meta_objects = function(scene, meta_objects) {
    for (var i = 0; i < meta_objects.length; i++) {
        scene._objects["ALL"].push(meta_objects[i]);
        scene._objects["MESH"].push(meta_objects[i]);
    }
}

exports.update_force = update_force;
function update_force(obj) {
    var field = obj["field"];

    if (field["type"] == "WIND") {
        var render = obj._render;
        m_util.quat_to_dir(render.quat, m_util.AXIS_Y, _wind);
        m_vec3.normalize(_wind, _wind);
        m_vec3.scale(_wind, render.force_strength, _wind);

        // update all scenes
        var scenes = get_all_scenes();
        for (var i = 0; i < scenes.length; i++) {
            var subs_arr = subs_array(scenes[i], TIME_SUBSCENE_TYPES);
            for (var j = 0; j < subs_arr.length; j++)
                subs_arr[j].wind.set(_wind);
        }
    }
}

exports.pick_object = function(canvas_x, canvas_y) {

    var main_scene = get_main();
    if (!main_scene) {
        m_print.error("No active scene");
        return null;
    }

    var subs_color_pick = get_subs(main_scene, "COLOR_PICKING");
    if (subs_color_pick) {

        var viewport_xy = m_cont.canvas_to_viewport_coords(canvas_x, canvas_y,
                _vec2_tmp, subs_color_pick.camera);

        // NOTE: may be some delay since exports.update() execution
        m_prerender.prerender_subs(subs_color_pick);
        m_render.draw(subs_color_pick, subs_color_pick.bundles);

        var subs_color_pick_xray = get_subs(main_scene, "COLOR_PICKING_XRAY");
        if (subs_color_pick_xray) {
            m_prerender.prerender_subs(subs_color_pick_xray);
            m_render.draw(subs_color_pick_xray, subs_color_pick_xray.bundles);
            var cam = subs_color_pick_xray.camera;
        } else
            var cam = subs_color_pick.camera;

        viewport_xy[1] = cam.height - viewport_xy[1];
        var color = m_render.read_pixels(cam.framebuffer, viewport_xy[0],
                viewport_xy[1]);

        // find objects having the same color
        var sobjs = get_scene_objs(main_scene, "MESH", exports.DATA_ID_ALL);
        for (var i = 0; i < sobjs.length; i++) {
            var render = sobjs[i]._render;
            var color_id = render.color_id;
            if (color_id) {
                if (Math.abs(255 * color_id[0] - color[0]) < COLOR_ID_THRESHOLD &&
                        Math.abs(255 * color_id[1] - color[1]) < COLOR_ID_THRESHOLD &&
                        Math.abs(255 * color_id[2] - color[2]) < COLOR_ID_THRESHOLD) {

                    if (render.outlining && render.outline_on_select) {

                        if (cfg_out.outlining_overview_mode) {
                            set_outline_color(cfg_out.outline_color);
                            render.outline_intensity = cfg_out.outline_intensity;

                            exports.apply_outline_anim(sobjs[i], cfg_out.outline_duration,
                                    cfg_out.outline_period, cfg_out.outline_relapses);
                        } else {
                            set_outline_color(main_scene["b4w_outline_color"]);
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
    } else
        m_print.error("Object Selection is not available on the scene");

    return null;
}

exports.set_outline_color = set_outline_color;
function set_outline_color(color) {
    var scene = get_active();
    var subs = get_subs(scene, "OUTLINE");
    if (subs) {
        subs.outline_color.set(color);
        subs.need_perm_uniforms_update = true;
    }
}

/**
 * return wind vector
 */
exports.get_wind = get_wind;
function get_wind() {
    return _wind;
}

exports.get_selectable_objects = function(scene) {
    var sel_objects = [];
    var objects = get_scene_objs(scene, "MESH", exports.DATA_ID_ALL);
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        if (obj._render.selectable)
            sel_objects.push(obj);
    }
    return sel_objects;
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

exports.update_all_mesh_shaders = function() {
    var scene = _active_scene;
    var objs = get_scene_objs(scene, "MESH", exports.DATA_ID_ALL);
    for (var i = 0; i < objs.length; i++) {
        var batches = objs[i]._batches;
        for (var j = 0; j < batches.length; j++) {
            var batch = batches[j];
            if (batch.type != "MAIN")
                continue;
            update_batch_lights(scene, batch);
            m_batch.update_shader(batch);
        }
    }
}

exports.update_cube_reflect_subs = function(scene, obj) {
    var trans = obj._render.bs_world.center;

    var subs_refl = get_cube_refl_subs_by_obj(scene, obj);

    if (subs_refl) {
        var vm_trans = _vec3_tmp;
        m_vec3.negate(trans, vm_trans);
        for (var i = 0; i < 6; i++) {
            var vm = subs_refl.cube_view_matrices[i];
            var frustum = subs_refl.cube_cam_frustums[i];
            var cam = subs_refl.camera;
            m_mat4.translate(m_util.INV_CUBE_VIEW_MATRS[i], vm_trans, vm);
            m_mat4.multiply(cam.proj_matrix, vm, cam.view_proj_matrix);
            m_util.extract_frustum_planes(cam.view_proj_matrix, frustum);
        }
    }
}

function get_cube_refl_subs_by_obj(scene, obj) {

    if (!scene._render.reflection_params)
        return null;

    var reflection_id = obj._render.cube_reflection_id;
    var refl_subs = scene._render.reflection_params.cube_refl_subs;
    return refl_subs[reflection_id];
}

function get_cube_refl_id_by_subs(scene, subs) {

    if (!scene._render.reflection_params)
        return null;

    var refl_subs = scene._render.reflection_params.cube_refl_subs;
    for (var i = 0; i < refl_subs.length; i++) {
        if (refl_subs[i] == subs)
            return i;
    }
    return null;
}

exports.assign_reflection_plane = function(obj, scene) {
    if (!scene._render.reflection_params)
        return false;
    var refl_id = obj._render.plane_reflection_id;
    var refl_subs = scene._render.reflection_params.plane_refl_subs[refl_id];
    obj._render.reflection_plane = refl_subs.camera.reflection_plane;
}

exports.update_plane_reflection_by_id = function(id, scene) {
    var refl_plane_obj = scene._render.reflection_params.refl_plane_objs[id];
    var refl_subs = scene._render.reflection_params.plane_refl_subs[id];
    var cam = refl_subs.camera;

    var trans = refl_plane_obj._render.trans;
    var quat  = refl_plane_obj._render.quat;

    m_util.trans_quat_to_plane(trans, quat, m_util.AXIS_Y,
                               cam.reflection_plane);

    m_cam.set_view(cam, scene["camera"])
    // NOTE: reflective objects take reflection plane by reference,
    // so they don't need updates here
}

function get_plane_refl_subs_by_obj(scene, obj) {

    if (!scene._render.reflection_params)
        return null;

    var reflection_id = obj._render.plane_reflection_id;
    var refl_subs = scene._render.reflection_params.plane_refl_subs;
    return refl_subs[reflection_id];
}

function get_plane_refl_id_by_subs(scene, subs) {

    if (!scene._render.reflection_params)
        return null;

    var refl_subs = scene._render.reflection_params.plane_refl_subs;
    for (var i = 0; i < refl_subs.length; i++) {
        if (refl_subs[i] == subs)
            return i;
    }
    return null;
}

exports.marker_frame = function(scene, name) {
    return scene["timeline_markers"][name];
}

}
