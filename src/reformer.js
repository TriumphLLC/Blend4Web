"use strict";

/**
 * Data reformer internal API.
 * Functions for blender (bpy) data reforming, such as compatibility hacks,
 * modifiers, custom materials etc.
 * @name reformer
 * @namespace
 * @exports exports as reformer
 */
b4w.module["__reformer"] = function(exports, require) {

var m_bounds = require("__boundings");
var m_curve  = require("__curve");
var m_print  = require("__print");
var m_util   = require("__util");

var m_vec3 = require("vec3");
var m_vec4 = require("vec4");
var m_quat = require("quat");
var m_mat4 = require("mat4");

var REPORT_COMPATIBILITY_ISSUES = true;

var _unreported_compat_issues = false;

var _params_reported = {};

function reform_node (node) {

    switch(node["type"]) {
    case "MAPPING":
        if(!node["vector_type"]) {
            node["vector_type"] = "POINT";
            report("node Mapping", node, "vector_type");
        }
        break;
    case "MATERIAL":
    case "MATERIAL_EXT":
        if (!("specular_shader" in node)) {
            node["specular_shader"] = "COOKTORR";
            report("node material", node, "specular_shader");
        }

        if (!("specular_hardness" in node)) {
            node["specular_hardness"] = 50;
            report("node material", node, "specular_hardness");
        }

        if (!("specular_slope" in node)) {
            node["specular_slope"] = 0.1;
            report("node material", node, "specular_slope");
        }

        if (!("specular_toon_size" in node)) {
            node["specular_toon_size"] = 0.5;
            report("node material", node, "specular_toon_size");
        }

        if (!("specular_toon_smooth" in node)) {
            node["specular_toon_smooth"] = 0.1;
            report("node material", node, "specular_toon_smooth");
        }

        if (!("specular_intensity" in node)) {
            node["specular_intensity"] = 0.5;
            report("node material", node, "specular_intensity");
        }

        if (!("diffuse_shader" in node)) {
            node["diffuse_shader"] = "LAMBERT";
            report("node material", node, "diffuse_shader");
        }

        if (!("roughness" in node)) {
            node["roughness"] = 0.5;
            report("node material", node, "roughness");
        }

        if (!("diffuse_fresnel" in node)) {
            node["diffuse_fresnel"] = 0.1;
            report("node material", node, "diffuse_fresnel");
        }

        if (!("diffuse_fresnel_factor" in node)) {
            node["diffuse_fresnel_factor"] = 0.5;
            report("node material", node, "diffuse_fresnel_factor");
        }
        break;
    case "MATH":
    case "MIX_RGB":
        if (!("use_clamp" in node)) {
            node["use_clamp"] = false;
            report("node " + node["type"], node, "use_clamp");
        }
        break;
    case "GROUP":
        // NOTE: allow auto-generated names for custom nodes
        // (e.g consider TIME.001 as TIME)
        node["node_tree_name"] = node["node_tree_name"].replace(/\.[0-9]{3,}$/g, "");

        // HACK: prepend B4W_ prefix for special nodes; temporary backward compatibility
        switch(node["node_tree_name"]) {
        case "CLAMP":
        case "LEVELS_OF_QUALITY":
        case "LINEAR_TO_SRGB":
        case "NORMAL_VIEW":
        case "PARALLAX":
        case "REFLECT":
        case "REFRACTION":
        case "REPLACE":
        case "SMOOTHSTEP":
        case "SRGB_TO_LINEAR":
        case "TIME":
        case "TRANSLUCENCY":
        case "VECTOR_VIEW":
            node["node_tree_name"] = "B4W_" + node["node_tree_name"];
            break;
        default:
            break;
        }
        break;
    }
}

/**
 * Check bpy_data, perform necessary compatibility hacks.
 */
exports.check_bpy_data = function(bpy_data) {

    _params_reported = {};

    var check_modifier = function(mod, obj) {
        switch (mod["type"]) {
        case "ARRAY":
            if (!("fit_type" in mod)) {
                report_modifier(mod["type"], obj);
                return false;
            }
            break;
        default:
            break;
        }

        return true;
    }

    /* worlds */
    var worlds = bpy_data["worlds"];

    if (worlds.length == 0) {
        report_missing_datablock("world");
        var world = {
            "name": "DEFAULT",
            "horizon_color": [0,0,0],
            "zenith_color": [0,0,0],
            "light_settings": {
                "use_environment_light": false,
                "environment_energy": 1,
                "environment_color": "PLAIN"
            },
            "b4w_fog_color": [0.5, 0.5, 0.5],
            "b4w_fog_density": 0.0
        }
        worlds.push(world);
    }

    var worlds = bpy_data["worlds"];
    for (var i = 0; i < worlds.length; i++) {
        var world = worlds[i];

        var shadows = world["b4w_shadow_settings"];
        if(!("csm_resolution" in shadows)) {
            report("world", world, "b4w_shadow_settings.csm_resolution");
            shadows["csm_resolution"] = 2048;
        }
        if(!("self_shadow_polygon_offset" in shadows)) {
            report("world", world, "b4w_shadow_settings.self_shadow_polygon_offset");
            shadows["self_shadow_polygon_offset"] = 1;
        }
        if(!("self_shadow_normal_offset" in shadows)) {
            report("world", world, "b4w_shadow_settings.self_shadow_normal_offset");
            shadows["self_shadow_normal_offset"] = 0.01;
        }
        if(!("b4w_enable_csm" in shadows)) {
            report("world", world, "b4w_shadow_settings.b4w_enable_csm");
            shadows["b4w_enable_csm"] = false;
        }
        if(!("csm_num" in shadows)) {
            report("world", world, "b4w_shadow_settings.csm_num");
            shadows["csm_num"] = 1;
        }
        if(!("csm_first_cascade_border" in shadows)) {
            report("world", world, "b4w_shadow_settings.csm_first_cascade_border");
            shadows["csm_first_cascade_border"] = 10;
        }
        if(!("first_cascade_blur_radius" in shadows)) {
            report("world", world, "b4w_shadow_settings.first_cascade_blur_radius");
            shadows["first_cascade_blur_radius"] = 3;
        }
        if(!("csm_last_cascade_border" in shadows)) {
            report("world", world, "b4w_shadow_settings.csm_last_cascade_border");
            shadows["csm_last_cascade_border"] = 100;
        }
        if(!("last_cascade_blur_radius" in shadows)) {
            report("world", world, "b4w_shadow_settings.last_cascade_blur_radius");
            shadows["last_cascade_blur_radius"] = 1.5;
        }
        if(!("fade_last_cascade" in shadows)) {
            report("world", world, "b4w_shadow_settings.fade_last_cascade");
            shadows["fade_last_cascade"] = true;
        }
        if(!("blend_between_cascades" in shadows)) {
            report("world", world, "b4w_shadow_settings.blend_between_cascades");
            shadows["blend_between_cascades"] = true;
        }

        var ssao = world["b4w_ssao_settings"];
        if(!("dist_factor" in ssao)) {
            report("world", world, "b4w_ssao_settings.dist_factor");
            ssao["dist_factor"] = 0.0;
            ssao["samples"] = 16;
        }

        if(!("hemisphere" in ssao)) {
            report("world", world, "b4w_ssao_settings.hemisphere");
            ssao["hemisphere"] = false;
        }

        if(!("blur_depth" in ssao)) {
            report("world", world, "b4w_ssao_settings.blur_depth");
            ssao["blur_depth"] = false;
        }

        if(!("blur_discard_value" in ssao)) {
            report("world", world, "b4w_ssao_settings.blur_discard_value");
            ssao["blur_discard_value"] = 1.0;
        }

        if (!("b4w_glow_color" in world)) {
            world["b4w_glow_color"] = [1.0,1.0,1.0];
            report("object", world, "b4w_glow_color");
        }

        if (!("b4w_glow_factor" in world)) {
            world["b4w_glow_factor"] = 1.0;
            report("object", world, "b4w_glow_factor");
        }

        if(!("b4w_fog_density" in world)) {
            report("world", world, "b4w_fog_density");
            world["b4w_fog_density"] = 0.0;
        }

        if(!("b4w_sky_settings" in world) || !("rayleigh_brightness" in world["b4w_sky_settings"])) {
            report("world", world, "rayleigh_brightness");
            world["b4w_sky_settings"] = {
                "procedural_skydome": false,
                "use_as_enviroment_map": false,
                "color": [0.24, 0.43, 0.75],
                "rayleigh_brightness": 3.3,
                "mie_brightness": 0.1,
                "spot_brightness": 10.0,
                "scatter_strength": 0.2,
                "rayleigh_strength": 0.2,
                "mie_strength": 0.006,
                "rayleigh_collection_power": 0.5,
                "mie_collection_power": 0.5,
                "mie_distribution": 0.4
            };
        }

        if(!("b4w_bloom_settings" in world)) {
            report("world", world, "b4w_bloom_settings");
            world["b4w_bloom_settings"] = {
                "key": 0.2,
                "blur": 4.0
            }
        } else {

            if(!("blur" in world["b4w_bloom_settings"])) {
                report("world", world, "b4w_bloom_settings.blur");
                world["b4w_bloom_settings"]["blur"] = 4.0;
            }

            if(!("edge_lum" in world["b4w_bloom_settings"])) {
                report("world", world, "b4w_bloom_settings.edge_lum");
                world["b4w_bloom_settings"]["edge_lum"] = 1.0;
            }
        }

        if(!("b4w_motion_blur_settings" in world)) {
            report("world", world, "b4w_motion_blur_settings");
            world["b4w_motion_blur_settings"] = {
                "motion_blur_factor": 0.01,
                "motion_blur_decay_threshold": 0.01
            }
        } else {

            if(!("motion_blur_factor" in world["b4w_motion_blur_settings"])) {
                report("world", world, "b4w_motion_blur_settings.motion_blur_factor");
                world["b4w_motion_blur_settings"]["motion_blur_factor"] = 0.01;
            }

            if(!("motion_blur_decay_threshold" in world["b4w_motion_blur_settings"])) {
                report("world", world, "b4w_motion_blur_settings.motion_blur_decay_threshold");
                world["b4w_motion_blur_settings"]["motion_blur_decay_threshold"] = 0.01;
            }
        }

        if(!("b4w_color_correction_settings" in world)) {
            report("world", world, "b4w_color_correction_settings");
            world["b4w_color_correction_settings"] = {
                "brightness" : 0.0,
                "contrast" : 0.0,
                "exposure": 1.0,
                "saturation": 1.0
            };
        }

        if(!("steps_per_pass" in world["b4w_god_rays_settings"])) {
            report("world", world, "b4w_god_rays_settings.steps_per_pass");
            world["b4w_god_rays_settings"]["steps_per_pass"] = 10.0;
        }
    }

    /* scenes */
    var scenes = bpy_data["scenes"];
    for (var i = 0; i < scenes.length; i++) {
        var scene = scenes[i];

        if (!("b4w_use_nla" in scene)) {
            scene["b4w_use_nla"] = false;
            report("scene", scene, "b4w_use_nla");
        }

        if (!("fps" in scene)) {
            scene["fps"] = 24;
            report("scene", scene, "fps");
        }

        if (!("b4w_nla_cyclic" in scene)) {
            scene["b4w_nla_cyclic"] = false;
            report("scene", scene, "b4w_nla_cyclic");
        }

        if (!("b4w_nla_script" in scene)) {
            scene["b4w_nla_script"] = [];
            report("scene", scene, "b4w_nla_script");
        }

        if ("b4w_detect_collisions" in scene) {
            report_deprecated("scene", scene, "b4w_detect_collisions");
            delete scene["b4w_detect_collisions"];
        }

        if (!("audio_doppler_speed" in scene)) {
            scene["audio_doppler_speed"] = 343.3;
            //report("scene", scene, "audio_doppler_speed");
        }
        if (!("audio_doppler_factor" in scene)) {
            scene["audio_doppler_factor"] = 1.0;
            //report("scene", scene, "audio_doppler_factor");
        }

        if (!("b4w_dynamic_compressor_settings" in scene)) {
            scene["b4w_dynamic_compressor_settings"] = {
                "threshold": -24,
                "knee": 30,
                "ratio": 12,
                "attack": 0.003,
                "release": 0.250
            };
            report("scene", scene, "b4w_dynamic_compressor_settings");
        }
        if (!("b4w_enable_convolution_engine" in scene)) {
            scene["b4w_enable_convolution_engine"] = false;
            //report("scene", scene, "b4w_enable_convolution_engine");
        }

        if (!("b4w_enable_bloom" in scene)) {
            scene["b4w_enable_bloom"] = false;
            report("scene", scene, "b4w_enable_bloom");
        }

        if (!("b4w_enable_motion_blur" in scene)) {
            scene["b4w_enable_motion_blur"] = false;
            report("scene", scene, "b4w_enable_motion_blur");
        }

        if (!("b4w_enable_color_correction" in scene)) {
            scene["b4w_enable_color_correction"] = false;
            report("scene", scene, "b4w_enable_color_correction");
        }

        if (!("b4w_enable_antialiasing" in scene)) {
            scene["b4w_enable_antialiasing"] = true;
            report("scene", scene, "b4w_enable_antialiasing");
        }

        if (!("b4w_tags" in scene)) {
            scene["b4w_tags"] = {
                "title": "",
                "description": ""
            };
            report("scene", scene, "b4w_tags");
        }
    }

    /* object data - meshes */
    var meshes = bpy_data["meshes"];

    for (var i = 0; i < meshes.length; i++) {
        var mesh = meshes[i];

        if (!mesh["b4w_bounding_box"]) {
            report("mesh", mesh, "b4w_bounding_box");
            mesh["b4w_bounding_box"] = {"max_x" : 0, "max_y" : 0, "max_z" : 0,
                "min_x" : 0, "min_y" : 0, "min_z" : 0};
        }

        if (!mesh["uv_textures"]) {
            report("mesh", mesh, "uv_textures");
            mesh["uv_textures"] = [];
        }

        if (!mesh["b4w_bounding_sphere_center"]) {
            //report("mesh", mesh, "b4w_bounding_sphere_center");
            mesh["b4w_bounding_sphere_center"] = [0, 0, 0];
        }

        if (!mesh["b4w_bounding_cylinder_center"]) {
            //report("mesh", mesh, "b4w_bounding_cylinder_center");
            mesh["b4w_bounding_cylinder_center"] = [0, 0, 0];
        }

        if (!mesh["b4w_bounding_ellipsoid_center"]) {
            //report("mesh", mesh, "b4w_bounding_cylinder_center");
            mesh["b4w_bounding_ellipsoid_center"] = [0, 0, 0];
        }

        if (!mesh["b4w_bounding_ellipsoid_axes"]) {
            //report("mesh", mesh, "b4w_bounding_ellipsoid_axes");
            var bb = mesh["b4w_bounding_box"];
            mesh["b4w_bounding_ellipsoid_axes"] = [(bb["max_x"] - bb["min_x"])/2,
                                                   (bb["max_y"] - bb["min_y"])/2,
                                                   (bb["max_z"] - bb["min_z"])/2];
        }

        for (var j = 0; j < mesh["b4w_vertex_anim"].length; j++) {
            var va = mesh["b4w_vertex_anim"][j];
            if (!("allow_nla" in va)) {
                report("mesh[\"b4w_vertex_anim\"]", mesh, "allow_nla");
                va["allow_nla"] = true;
            }
        }
    }

    /* object data - cameras */
    var cameras = bpy_data["cameras"];

    for (var i = 0; i < cameras.length; i++) {
        var camera = cameras[i];
        if (!camera["type"]) {
            camera["type"] = "PERSP";
            report("camera", camera, "type");
        }

        if ("b4w_eye_target_dist" in camera) {
            delete camera["b4w_eye_target_dist"];
            report_deprecated("camera", camera, "b4w_eye_target_dist");
        }

        if (!("b4w_trans_velocity" in camera)) {
            camera["b4w_trans_velocity"] = 1;
            report("camera", camera, "b4w_trans_velocity");
        }
        
        if (!("b4w_rot_velocity" in camera)) {
            camera["b4w_rot_velocity"] = 1;
            report("camera", camera, "b4w_rot_velocity");
        }

        if (!("b4w_zoom_velocity" in camera)) {
            camera["b4w_zoom_velocity"] = 0.1;
            report("camera", camera, "b4w_zoom_velocity");
        }

        if (!("b4w_use_distance_limits" in camera)) {
            camera["b4w_use_distance_limits"] = false;
            report("camera", camera, "b4w_use_distance_limits");
        }

        if (!("b4w_distance_min" in camera)) {
            camera["b4w_distance_min"] = 1;
            report("camera", camera, "b4w_distance_min");
        }
        if (!("b4w_distance_max" in camera)) {
            camera["b4w_distance_max"] = 100;
            report("camera", camera, "b4w_distance_max");
        }

        if (!("b4w_horizontal_translation_min" in camera)) {
            camera["b4w_horizontal_translation_min"] = -100;
            report("camera", camera, "b4w_horizontal_translation_min");
        }
        if (!("b4w_horizontal_translation_max" in camera)) {
            camera["b4w_horizontal_translation_max"] = 100;
            report("camera", camera, "b4w_horizontal_translation_max");
        }

        if (!("b4w_vertical_translation_min" in camera)) {
            camera["b4w_vertical_translation_min"] = -100;
            report("camera", camera, "b4w_vertical_translation_min");
        }

        if (!("b4w_vertical_translation_max" in camera)) {
            camera["b4w_vertical_translation_max"] = 100;
            report("camera", camera, "b4w_vertical_translation_max");
        }

        if (!("b4w_use_horizontal_clamping" in camera)) {
            camera["b4w_use_horizontal_clamping"] = false;
            report("camera", camera, "b4w_use_horizontal_clamping");
        }

        if (!("b4w_rotation_left_limit" in camera)) {
            camera["b4w_rotation_left_limit"] = -Math.PI;
            report("camera", camera, "b4w_rotation_left_limit");
        }
        if (!("b4w_rotation_right_limit" in camera)) {
            camera["b4w_rotation_right_limit"] = Math.PI;
            report("camera", camera, "b4w_rotation_right_limit");
        }

        if (!("b4w_horizontal_clamping_type" in camera)) {
            camera["b4w_horizontal_clamping_type"] = "LOCAL";
            report("camera", camera, "b4w_horizontal_clamping_type");
        }

        if (!("b4w_use_vertical_clamping" in camera)) {
            camera["b4w_use_vertical_clamping"] = false;
            report("camera", camera, "b4w_use_vertical_clamping");
        }

        if (!("b4w_rotation_down_limit" in camera)) {
            camera["b4w_rotation_down_limit"] = -Math.PI / 2;
            report("camera", camera, "b4w_rotation_down_limit");
        }
        if (!("b4w_rotation_up_limit" in camera)) {
            camera["b4w_rotation_up_limit"] = Math.PI / 2;
            report("camera", camera, "b4w_rotation_up_limit");
        }

        if (!("b4w_vertical_clamping_type" in camera)) {
            camera["b4w_vertical_clamping_type"] = "LOCAL";
            report("camera", camera, "b4w_vertical_clamping_type");
        }

        if (!("b4w_hover_angle_min" in camera)) {
            camera["b4w_hover_angle_min"] = Math.PI / 6;
            report("camera", camera, "b4w_hover_angle_min");
        }
        if (!("b4w_hover_angle_max" in camera)) {
            camera["b4w_hover_angle_max"] = Math.PI / 6;
            report("camera", camera, "b4w_hover_angle_max");
        }

        if (!("b4w_enable_hover_hor_rotation" in camera)) {
            camera["b4w_enable_hover_hor_rotation"] = true;
            report("camera", camera, "b4w_enable_hover_hor_rotation");
        }

        if (!("b4w_use_panning" in camera)) {
            camera["b4w_use_panning"] = true;
            report("camera", camera, "b4w_use_panning");
        }
    }

    /* object data - lamps */
    var lamps = bpy_data["lamps"];

    for (var i = 0; i < lamps.length; i++) {
        var lamp = lamps[i];

        if (!("b4w_generate_shadows" in lamp)) {
            lamp["b4w_generate_shadows"] = false;
            report("lamp", lamp, "b4w_generate_shadows");
        }

        if (!("b4w_dynamic_intensity" in lamp)) {
            lamp["b4w_dynamic_intensity"] = false;
            report("lamp", lamp, "b4w_dynamic_intensity");
        }

        if (!("use_diffuse" in lamp)) {
            lamp["use_diffuse"] = true;
            report("lamp", lamp, "use_diffuse");
        }

        if (!("use_specular" in lamp)) {
            lamp["use_specular"] = true;
            report("lamp", lamp, "use_specular");
        }
    }

    /* object data - speakers */
    var speakers = bpy_data["speakers"];

    for (var i = 0; i < speakers.length; i++) {
        var speaker = speakers[i];
        if (!("b4w_behavior" in speaker)) {
            if (speaker["b4w_background_music"])
                speaker["b4w_behavior"] = "BACKGROUND_SOUND";
            else
                speaker["b4w_behavior"] = "POSITIONAL";

            //report("speaker", speaker, "b4w_behavior");
        }
        if (!("b4w_disable_doppler" in speaker)) {
            speaker["b4w_disable_doppler"] = false;
            //report("speaker", speaker, "b4w_disable_doppler");
        }

        if (!("b4w_delay" in speaker)) {
            speaker["b4w_delay"] = 0;
            //report("speaker", speaker, "b4w_delay");
        }
        if (!("b4w_delay_random" in speaker)) {
            speaker["b4w_delay_random"] = 0;
            //report("speaker", speaker, "b4w_delay_random");
        }

        if (!("b4w_volume_random" in speaker)) {
            speaker["b4w_volume_random"] = 0;
            //report("speaker", speaker, "b4w_volume_random");
        }
        if (!("b4w_pitch_random" in speaker)) {
            speaker["b4w_pitch_random"] = 0;
            //report("speaker", speaker, "b4w_pitch_random");
        }

        if (!("b4w_fade_in" in speaker)) {
            speaker["b4w_fade_in"] = 0;
            //report("speaker", speaker, "b4w_fade_in");
        }
        if (!("b4w_fade_out" in speaker)) {
            speaker["b4w_fade_out"] = 0;
            //report("speaker", speaker, "b4w_fade_out");
        }
        if (!("b4w_loop" in speaker)) {
            speaker["b4w_loop"] = false;
            //report("speaker", speaker, "b4w_loop");
        }
        if (!("b4w_loop_count" in speaker)) {
            speaker["b4w_loop_count"] = 0;
            //report("speaker", speaker, "b4w_loop_count");
        }
        if (!("b4w_loop_count_random" in speaker)) {
            speaker["b4w_loop_count_random"] = 0;
            //report("speaker", speaker, "b4w_loop_count_random");
        }

        if (!("b4w_playlist_id" in speaker)) {
            speaker["b4w_playlist_id"] = "";
            //report("speaker", speaker, "b4w_playlist_id");
        }
    }

    /* textures */
    var textures = bpy_data["textures"];

    for (var i = 0; i < textures.length; i++) {
        var texture = textures[i];
        if (!("b4w_anisotropic_filtering" in texture)) {
            texture["b4w_anisotropic_filtering"] = "OFF";
            report("texture", texture, "b4w_anisotropic_filtering");
        }

        if (!("b4w_water_foam" in texture)) {
            texture["b4w_water_foam"] = false;
            report("texture", texture, "b4w_water_foam");
        }

        if (!("b4w_foam_uv_freq" in texture)) {
            texture["b4w_foam_uv_freq"] = [1, 1];
            report("texture", texture, "b4w_foam_uv_freq");
        }

        if (!("b4w_foam_uv_magnitude" in texture)) {
            texture["b4w_foam_uv_magnitude"] = [1, 1];
            report("texture", texture, "b4w_foam_uv_magnitude");
        }

        if (!("b4w_parallax_steps" in texture)) {
            texture["b4w_parallax_steps"] = 5;
            report("material", texture, "b4w_parallax_steps");
        }

        if (!("b4w_parallax_lod_dist" in texture)) {
            texture["b4w_parallax_lod_dist"] = 10;
            report("material", texture, "b4w_parallax_lod_dist");
        }

        if (!("b4w_shore_dist_map" in texture)) {
            texture["b4w_shore_dist_map"] = false;
            report("texture", texture, "b4w_shore_dist_map");
        }

        if (!("b4w_shore_boundings" in texture)) {
            texture["b4w_shore_boundings"] = new Float32Array(4);
            texture["b4w_shore_boundings"] = [1000, -1000, 1000, -1000];
            report("texture", texture, "b4w_shore_boundings");
        }

        if (!("b4w_max_shore_dist" in texture)) {
            texture["b4w_max_shore_dist"] = 100;
            report("texture", texture, "b4w_max_shore_dist");
        }

        if (!("b4w_disable_compression" in texture)) {
            texture["b4w_disable_compression"] = false;
            report("texture", texture, "b4w_disable_compression");
        }

        if (!("b4w_source_type" in texture)) {
            texture["b4w_source_type"] = "";
            report("texture", texture, "b4w_source_type");
        }

        if (!("b4w_source_id" in texture)) {
            texture["b4w_source_id"] = "";
            report("texture", texture, "b4w_source_id");
        }

        if (!("b4w_source_size" in texture)) {
            texture["b4w_source_size"] = 1024;
            report("texture", texture, "b4w_source_size");
        }

        if (!("b4w_enable_canvas_mipmapping" in texture)) {
            texture["b4w_enable_canvas_mipmapping"] = true;
            report("texture", texture, "b4w_enable_canvas_mipmapping");
        }
    }

    /* materials */
    var materials = bpy_data["materials"];

    for (var i = 0; i < materials.length; i++) {
        var mat = materials[i];

        if ("b4w_node_mat_type" in mat) {
            report_deprecated("material", mat, "b4w_node_mat_type");
        }

        if ("b4w_skydome" in mat) {
            report_deprecated("material", mat, "b4w_skydome");
        }

        if ("b4w_procedural_skydome" in mat) {
            report_deprecated("material", mat, "b4w_procedural_skydome");
        }

        if (mat["b4w_water"]) {
            if (!("b4w_water_shore_smoothing" in mat)) {
                mat["b4w_water_shore_smoothing"] = false;
                report("material", mat, "b4w_water_shore_smoothing");
            }

            if (!("b4w_water_dynamic" in mat)) {
                mat["b4w_water_dynamic"] = false;
                report("material", mat, "b4w_water_dynamic");
            }

            if (!("b4w_waves_height" in mat)) {
                mat["b4w_waves_height"] = 1.0;
                report("material", mat, "b4w_waves_height");
            }

            if (!("b4w_waves_length" in mat)) {
                mat["b4w_waves_length"] = 1.0;
                report("material", mat, "b4w_waves_length");
            }

            if (!("b4w_water_dst_noise_scale0" in mat)) {
                mat["b4w_water_dst_noise_scale0"] = 0.05;
                report("material", mat, "b4w_water_dst_noise_scale0");
            }

            if (!("b4w_water_dst_noise_scale1" in mat)) {
                mat["b4w_water_dst_noise_scale1"] = 0.03;
                report("material", mat, "b4w_water_dst_noise_scale1");
            }

            if (!("b4w_water_dst_noise_freq0" in mat)) {
                mat["b4w_water_dst_noise_freq0"] = 1.3;
                report("material", mat, "b4w_water_dst_noise_freq0");
            }

            if (!("b4w_water_dst_noise_freq1" in mat)) {
                mat["b4w_water_dst_noise_freq1"] = 1.0;
                report("material", mat, "b4w_water_dst_noise_freq1");
            }

            if (!("b4w_water_dir_min_shore_fac" in mat)) {
                mat["b4w_water_dir_min_shore_fac"] = 0.4;
                report("material", mat, "b4w_water_dir_min_shore_fac");
            }

            if (!("b4w_water_dir_freq" in mat)) {
                mat["b4w_water_dir_freq"] = 0.5;
                report("material", mat, "b4w_water_dir_freq");
            }

            if (!("b4w_water_dir_noise_scale" in mat)) {
                mat["b4w_water_dir_noise_scale"] = 0.05;
                report("material", mat, "b4w_water_dir_noise_scale");
            }

            if (!("b4w_water_dir_noise_freq" in mat)) {
                mat["b4w_water_dir_noise_freq"] = 0.07;
                report("material", mat, "b4w_water_dir_noise_freq");
            }

            if (!("b4w_water_dir_min_noise_fac" in mat)) {
                mat["b4w_water_dir_min_noise_fac"] = 0.5;
                report("material", mat, "b4w_water_dir_min_noise_fac");
            }

            if (!("b4w_water_dst_min_fac" in mat)) {
                mat["b4w_water_dst_min_fac"] = 0.2;
                report("material", mat, "b4w_water_dst_min_fac");
            }

            if (!("b4w_water_waves_hor_fac" in mat)) {
                mat["b4w_water_waves_hor_fac"] = 5.0;
                report("material", mat, "b4w_water_waves_hor_fac");
            }

            if (!("b4w_water_absorb_factor" in mat)) {
                mat["b4w_water_absorb_factor"] = 6.0;
                report("material", mat, "b4w_water_absorb_factor");
            }

            if (!("b4w_water_fog_color" in mat)) {
                mat["b4w_water_fog_color"] = new Float32Array(3);
                mat["b4w_water_fog_color"] = [0.5,0.7,0.7];
                report("material", mat, "b4w_water_fog_color");
            }

            if (!("b4w_foam_factor" in mat)) {
                mat["b4w_foam_factor"] = 5.0;
                report("material", mat, "b4w_foam_factor");
            }

            if (!("b4w_generated_mesh" in mat)) {
                mat["b4w_generated_mesh"] = false;
                report("material", mat, "b4w_generated_mesh");
            }

            if (!("b4w_water_num_cascads" in mat)) {
                mat["b4w_water_num_cascads"] = 5;
                report("material", mat, "b4w_water_num_cascads");
            }

            if (!("b4w_water_subdivs" in mat)) {
                mat["b4w_water_subdivs"] = 64;
                report("material", mat, "b4w_water_subdivs");
            }

            if (!("b4w_water_detailed_dist" in mat)) {
                mat["b4w_water_detailed_dist"] = 1000;
                report("material", mat, "b4w_water_detailed_dist");
            }
        }

        if (!("b4w_dynamic_grass_size" in mat)) {
            mat["b4w_dynamic_grass_size"] = "";
            //report("material", mat, "b4w_dynamic_grass_size");
        }

        if (!("b4w_dynamic_grass_color" in mat)) {
            mat["b4w_dynamic_grass_color"] = "";
            //report("material", mat, "b4w_dynamic_grass_color");
        }

        if (!("diffuse_intensity" in mat)) {
            mat["diffuse_intensity"] = 1.0;
            report("material", mat, "diffuse_intensity");
        }

        if (!("b4w_use_ghost" in mat)) {
            mat["b4w_use_ghost"] = false;
            //report("material", mat, "b4w_use_ghost");
        }

        if (!("b4w_collision_group" in mat)) {
            mat["b4w_collision_group"] = 128;
            report("material", mat, "b4w_collision_group");
        }

        if (!("b4w_collision_mask" in mat)) {
            mat["b4w_collision_mask"] = 127;
            report("material", mat, "b4w_collision_mask");
        }

        if (!("b4w_do_not_render" in mat)) {
            mat["b4w_do_not_render"] = false;
            report("material", mat, "b4w_do_not_render");
        }

        if (mat.type == "HALO" && !("b4w_halo_sky_stars" in mat)) {
            mat["b4w_halo_sky_stars"] = false;
            report("material", mat, "b4w_halo_sky_stars");
        }

        if (mat.type == "HALO" && !("b4w_halo_stars_blend_height" in mat)) {
            mat["b4w_halo_stars_blend_height"] = 10;
            report("material", mat, "b4w_halo_stars_blend_height");
        }

        if (mat.type == "HALO" && !("b4w_halo_stars_min_height" in mat)) {
            mat["b4w_halo_stars_min_height"] = 0;
            report("material", mat, "b4w_halo_stars_min_height");
        }

        if (!("specular_shader" in mat)) {
            mat["specular_shader"] = "COOKTORR";
            report("material", mat, "specular_shader");
        }

        if (!("diffuse_shader" in mat)) {
            mat["diffuse_shader"] = "LAMBERT";
            report("material", mat, "diffuse_shader");
        }

        if (!("roughness" in mat)) {
            mat["roughness"] = 0.5;
            report("material", mat, "roughness");
        }

        if (!("diffuse_fresnel" in mat)) {
            mat["diffuse_fresnel"] = 0.1;
            report("material", mat, "diffuse_fresnel");
        }

        if (!("diffuse_fresnel_factor" in mat)) {
            mat["diffuse_fresnel_factor"] = 0.5;
            report("material", mat, "diffuse_fresnel_factor");
        }

        if (!("specular_slope" in mat)) {
            mat["specular_slope"] = 0.2;
            report("material", mat, "specular_slope");
        }

        if (!("specular_toon_size" in mat)) {
            mat["specular_toon_size"] = 0.5;
            report("material", mat, "specular_toon_size");
        }

        if (!("specular_toon_smooth" in mat)) {
            mat["specular_toon_smooth"] = 0.1;
            report("material", mat, "specular_toon_smooth");
        }

        if (!("specular_alpha" in mat)) {
            mat["specular_alpha"] = 1.0;
            report("material", mat, "specular_alpha");
        }

        if (!("b4w_wettable" in mat)) {
            mat["b4w_wettable"] = false;
            report("material", mat, "b4w_wettable");
        }

        if (!("b4w_refractive" in mat)) {
            mat["b4w_refractive"] = false;
            report("material", mat, "b4w_refractive");
        }

        if (!("b4w_refr_bump" in mat)) {
            mat["b4w_refr_bump"] = 0;
            report("material", mat, "b4w_refr_bump");
        }

        if (!("b4w_shallow_water_col" in mat)) {
            mat["b4w_shallow_water_col"] = [0.0, 0.8, 0.3];
            report("material", mat, "b4w_shallow_water_col");
        }

        if (!("b4w_shore_water_col" in mat)) {
            mat["b4w_shore_water_col"] = [0.0, 0.9, 0.2];
            report("material", mat, "b4w_shore_water_col");
        }

        if (!("b4w_shallow_water_col_fac" in mat)) {
            mat["b4w_shallow_water_col_fac"] = 1.0;
            report("material", mat, "b4w_shallow_water_col_fac");
        }

        if (!("b4w_shore_water_col_fac" in mat)) {
            mat["b4w_shore_water_col_fac"] = 0.5;
            report("material", mat, "b4w_shore_water_col_fac");
        }

        if (!("b4w_water_sss_strength" in mat)) {
            mat["b4w_water_sss_strength"] = 5.9;
            report("material", mat, "b4w_water_sss_strength");
        }

        if (!("b4w_water_sss_width" in mat)) {
            mat["b4w_water_sss_width"] = 0.45;
            report("material", mat, "b4w_water_sss_width");
        }

        if (!("b4w_render_above_all" in mat)) {
            mat["b4w_render_above_all"] = false;
            report("material", mat, "b4w_render_above_all");
        }
        if (!("b4w_water_norm_uv_velocity" in mat)) {
            mat["b4w_water_norm_uv_velocity"] = 0.05;
            report("material", mat, "b4w_water_norm_uv_velocity");
        }

        var texture_slots = mat["texture_slots"];
        for (var j = 0; j < texture_slots.length; j++) {
            var slot = texture_slots[j];
            if (!("blend_type" in slot)) {
                slot["blend_type"] = "MIX";
                report("texture_slot", slot, "blend_type");
            }
        }

        if (mat["node_tree"]) {
            var nodes = mat["node_tree"]["nodes"];
            for (var j = 0; j < nodes.length; j++)
                reform_node(nodes[j]);
        }
    }

    /*node_groups*/
    var node_groups = bpy_data["node_groups"];
    for (var i = 0; i < node_groups.length; i++) {
        var nodes = node_groups[i]["node_tree"]["nodes"];

        for (var j = 0; j < nodes.length; j++)
            reform_node(nodes[j]);
    }
    var objects = bpy_data["objects"];

    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];

        switch(obj["type"]) {
        case "MESH":
            if (!("b4w_dynamic_geometry" in obj)) {
                obj["b4w_dynamic_geometry"] = false;
                //report("object", obj, "b4w_dynamic_geometry");
            }

            if (!("b4w_reflexible" in obj)) {
                obj["b4w_reflexible"] = false;
                //report("object", obj, "b4w_reflexible");
            }

            if (!("b4w_reflexible_only" in obj)) {
                obj["b4w_reflexible_only"] = false;
                //report("object", obj, "b4w_reflexible_only");
            }

            if (!("b4w_reflective" in obj)) {
                obj["b4w_reflective"] = false;
                //report("object", obj, "b4w_reflective");
            }

            if (!("b4w_wind_bending" in obj)) {
                obj["b4w_wind_bending"] = false;
                report("object", obj, "b4w_wind_bending");
            }

            if (!("b4w_wind_bending_angle" in obj)) {
                obj["b4w_wind_bending_angle"] = 10.0;
                obj["b4w_wind_bending_freq"] = 0.25;
                report("object", obj, "wind bending params");
            }

            if (!("b4w_detail_bending_amp" in obj)) {
                obj["b4w_detail_bending_amp"] = 0.1;
                obj["b4w_branch_bending_amp"] = 0.3;
                report("object", obj, "detail bending params");
            }

            if (!("b4w_detail_bending_freq" in obj)) {
                obj["b4w_detail_bending_freq"] = 1.0;
                report("object", obj, "b4w_detail_bending_freq");
            }

            if (!("b4w_main_bend_stiffness_col" in obj)) {
                obj["b4w_main_bend_stiffness_col"] = "";
                    report("object", obj, "b4w_main_bend_stiffness_col");
            }

            if (!("b4w_detail_bend_colors" in obj)) {
                obj["b4w_detail_bend_colors"] = {
                    "leaves_stiffness_col": "",
                    "leaves_phase_col": "",
                    "overall_stiffness_col": ""
                };
                report("object", obj, "b4w_detail_bend_colors");
            }

            if (!("b4w_caustics" in obj)) {
                obj["b4w_caustics"] = false;
                //report("object", obj, "b4w_caustics");
            }

            // NOTE: all vertex things go to mesh
            // 1 obj == 1 mesh (enforced by exporter)
            if ("vertex_groups" in obj && obj["vertex_groups"].length &&
                    obj["data"] && obj["data"]["vertex_groups"].length == 0) {
                obj["data"]["vertex_groups"] = obj["vertex_groups"];
                delete obj["vertex_groups"];
                report("object", obj, "vertex_groups");
            }
            if ("b4w_vertex_anim" in obj && obj["b4w_vertex_anim"].length &&
                    obj["data"] && obj["data"]["b4w_vertex_anim"].length == 0) {
                obj["data"]["b4w_vertex_anim"] = obj["b4w_vertex_anim"];
                delete obj["b4w_vertex_anim"];
                report("object", obj, "b4w_vertex_anim");
            }

            if (!("b4w_do_not_render" in obj)) {
                obj["b4w_do_not_render"] = false;
                //report("object", obj, "b4w_do_not_render");
            }

            if (!("use_ghost" in obj["game"])) {
                obj["game"]["use_ghost"] = false;
                //report("object", obj, "use_ghost");
            }
            if (!("use_sleep" in obj["game"])) {
                obj["game"]["use_sleep"] = false;
                //report("object", obj, "use_sleep");
            }
            if (!("velocity_min" in obj["game"])) {
                obj["game"]["velocity_min"] = 0;
                //report("object", obj, "velocity_min");
            }
            if (!("velocity_max" in obj["game"])) {
                obj["game"]["velocity_max"] = 0;
                //report("object", obj, "velocity_max");
            }
            if (!("collision_group" in obj["game"])) {
                obj["game"]["collision_group"] = 1;
                //report("object", obj, "collision_group");
            }
            if (!("collision_mask" in obj["game"])) {
                obj["game"]["collision_mask"] = 255;
                //report("object", obj, "collision_mask");
            }

            if ("b4w_vehicle_settings" in obj) {
                if (obj["b4w_vehicle_settings"]) {
                    if (!("steering_ratio" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["steering_ratio"] = 10;
                        //report("object", obj, "steering_ratio");
                    }
                    if (!("steering_max" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["steering_max"] = 1;
                        //report("object", obj, "steering_max");
                    }
                    if (!("inverse_control" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["inverse_control"] = false;
                        //report("object", obj, "inverse_control");
                    }
                    if (!("force_max" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["force_max"] = 1500;
                        //report("object", obj, "force_max");
                    }
                    if (!("brake_max" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["brake_max"] = 100;
                        //report("object", obj, "brake_max");
                    }
                    if (!("speed_ratio" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["speed_ratio"] = 0.027;
                        //report("object", obj, "speed_ratio");
                    }
                    if (!("max_speed_angle" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["max_speed_angle"] = Math.PI;
                        //report("object", obj, "max_speed_angle");
                    }
                    if (!("delta_tach_angle" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["delta_tach_angle"] = 4.43;
                        //report("object", obj, "delta_tach_angle");
                    }
                    if (!("suspension_compression" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["suspension_compression"] = 4.4;
                        //report("object", obj, "suspension_compression");
                    }
                    if (!("suspension_stiffness" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["suspension_stiffness"] = 20.0;
                        //report("object", obj, "suspension_stiffness");
                    }
                    if (!("suspension_damping" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["suspension_damping"] = 2.3;
                        //report("object", obj, "suspension_damping");
                    }
                    if (!("wheel_friction" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["wheel_friction"] = 1000.0;
                        //report("object", obj, "wheel_friction");
                    }
                    if (!("roll_influence" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["roll_influence"] = 0.1;
                        //report("object", obj, "roll_influence");
                    }
                    if (!("max_suspension_travel_cm" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["max_suspension_travel_cm"] = 30;
                        //report("object", obj, "max_suspension_travel_cm");
                    }
                    if (!("floating_factor" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["floating_factor"] = 3.0;
                        //report("object", obj, "floating_factor");
                    }
                    if (!("floating_factor" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["floating_factor"] = 3.0;
                        //report("object", obj, "floating_factor");
                    }
                    if (!("water_lin_damp" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["water_lin_damp"] = 0.9;
                        //report("object", obj, "water_lin_damp");
                    }
                    if (!("water_rot_damp" in obj["b4w_vehicle_settings"])) {
                        obj["b4w_vehicle_settings"]["water_rot_damp"] = 0.9;
                        //report("object", obj, "water_rot_damp");
                    }
                }
            } else {
                obj["b4w_vehicle_settings"] = null;
                report("object", obj, "b4w_vehicle_settings");
            }

            if ("b4w_floating_settings" in obj) {
                if (obj["b4w_floating_settings"]) {
                    if (!("floating_factor" in obj["b4w_floating_settings"])) {
                        obj["b4w_floating_settings"]["floating_factor"] = 3.0;
                        //report("object", obj, "floating_factor");
                    }
                    if (!("water_lin_damp" in obj["b4w_floating_settings"])) {
                        obj["b4w_floating_settings"]["water_lin_damp"] = 0.8;
                        //report("object", obj, "water_lin_damp");
                    }
                    if (!("water_rot_damp" in obj["b4w_floating_settings"])) {
                        obj["b4w_floating_settings"]["water_rot_damp"] = 0.8;
                        //report("object", obj, "water_rot_damp");
                    }
                }
            } else {
                obj["b4w_floating_settings"] = null;
                report("object", obj, "b4w_floating_settings");
            }

            if ("b4w_character_settings" in obj) {
                if (obj["b4w_character_settings"]) {
                    if (!("walk_speed" in obj["b4w_character_settings"])) {
                        obj["b4w_character_settings"]["walk_speed"] = 4;
                        //report("object", obj, "walk_speed");
                    }
                    if (!("run_speed" in obj["b4w_character_settings"])) {
                        obj["b4w_character_settings"]["run_speed"] = 8;
                        //report("object", obj, "run_speed");
                    }
                    if (!("step_height" in obj["b4w_character_settings"])) {
                        obj["b4w_character_settings"]["step_height"] = 0.25;
                        //report("object", obj, "step_height");
                    }
                    if (!("jump_strength" in obj["b4w_character_settings"])) {
                        obj["b4w_character_settings"]["jump_strength"] = 5;
                        //report("object", obj, "jump_strength");
                    }
                    if (!("waterline" in obj["b4w_character_settings"])) {
                        obj["b4w_character_settings"]["waterline"] = 0.0;
                        //report("object", obj, "waterline");
                    }
                }
            } else {
                obj["b4w_character_settings"] = null;
                report("object", obj, "b4w_character_settings");
            }

            if (!("b4w_selectable" in obj)) {
                obj["b4w_selectable"] = false;
                report("object", obj, "b4w_selectable");
            }
            if (!("b4w_billboard" in obj)) {
                obj["b4w_billboard"] = false;
                report("object", obj, "b4w_billboard");
            }
            if (!("b4w_billboard_geometry" in obj)) {
                obj["b4w_billboard_geometry"] = "SPHERICAL";
                report("object", obj, "b4w_billboard_geometry");
            }
            if (!("b4w_pres_glob_orientation" in obj)) {
                obj["b4w_pres_glob_orientation"] = false;
                report("object", obj, "b4w_pres_glob_orientation");
            }
            if (!("b4w_glow_settings" in obj)) {
                obj["b4w_glow_settings"] = {};
                obj["b4w_glow_settings"]["glow_duration"] = 1.0;
                obj["b4w_glow_settings"]["glow_period"] = 1.0;
                obj["b4w_glow_settings"]["glow_relapses"] = 0;
                report("object", obj, "b4w_glow_settings");
            }
            if (!("b4w_lod_transition" in obj)) {
                obj["b4w_lod_transition"] = 0.01;
                report("object", obj, "b4w_lod_transition");
            }
            if (!("lod_levels" in obj)) {
                obj["lod_levels"] = [];
                report("object", obj, "lod_levels");
            }
            if (!("b4w_animation_mixing" in obj)) {
                obj["b4w_animation_mixing"] = false;
                report("object", obj, "b4w_animation_mixing");
            }
            break;
        case "EMPTY":
            if (!("b4w_group_relative" in obj)) {
                obj["b4w_group_relative"] = false;
                report("object", obj, "b4w_group_relative");
            }
            if (!("b4w_anchor" in obj)) {
                obj["b4w_anchor"] = null;
                report("object", obj, "b4w_anchor");
            }
            break;
        default:
            break;
        }

        if (!("b4w_anim_behavior" in obj)) {
            obj["b4w_anim_behavior"] = obj["b4w_cyclic_animation"] ?
                    "CYCLIC" : "FINISH_STOP";
            report("object", obj, "b4w_anim_behavior");
        }

        if (!("rotation_quaternion" in obj)) {
            var quat = [0,0,0,1];
            m_util.euler_to_quat(obj["rotation_euler"], quat);
            quat_b4w_bpy(quat, quat);
            obj["rotation_quaternion"] = quat;
            report("object", obj, "rotation_quaternion");
        }

        if ("webgl_do_not_batch" in obj) {
            obj["b4w_do_not_batch"] = obj["webgl_do_not_batch"];

            if (obj["webgl_do_not_batch"])
                report_deprecated("object", obj, "webgl_do_not_batch");
        }

        if (!("b4w_shadow_cast_only" in obj)) {
            obj["b4w_shadow_cast_only"] = false;
            report("object", obj, "b4w_shadow_cast_only");
        }

        if (!("b4w_correct_bounding_offset" in obj)) {
            obj["b4w_correct_bounding_offset"] = "AUTO";
            report("object", obj, "b4w_correct_bounding_offset");
        }

        var psystems = obj["particle_systems"];
        for (var j = 0; j < psystems.length; j++) {
            var psys = psystems[j];
            var pset = psys["settings"];

            if (!("use_whole_group" in pset)) {
                pset["use_whole_group"] = false;
                report("object", pset, "use_whole_group");
            }

            if (!psys["transforms"]) {
                psys["transforms"] = new Float32Array();
                report("particle_system", psys, "transforms");
            }

            if (!("b4w_billboard_align" in pset)) {
                pset["b4w_billboard_align"] = "VIEW";
                report("particle_settings", pset, "b4w_billboard_align");
            }

            if (!("b4w_dynamic_grass" in pset)) {
                pset["b4w_dynamic_grass"] = false;
                report("object", pset, "b4w_dynamic_grass");
            }

            if (!("b4w_dynamic_grass_scale_threshold" in pset)) {
                pset["b4w_dynamic_grass_scale_threshold"] = 0.01;
                report("object", pset, "b4w_dynamic_grass_scale_threshold");
            }

            if (!("b4w_initial_rand_rotation" in pset)) {
                pset["b4w_initial_rand_rotation"] = false;
                report("particle_settings", pset, "b4w_initial_rand_rotation");
            }

            if (!("b4w_rotation_type" in pset)) {
                pset["b4w_rotation_type"] = "Z";
                report("particle_settings", pset, "b4w_rotation_type");
            }

            if (!("b4w_rand_rotation_strength" in pset)) {
                pset["b4w_rand_rotation_strength"] = 1;
                report("particle_settings", pset, "b4w_rand_rotation_strength");
            }

            if (!("b4w_hair_billboard" in pset)) {
                pset["b4w_hair_billboard"] = false;
                report("particle_settings", pset, "b4w_hair_billboard");
            }

            if (!("b4w_hair_billboard_type" in pset)) {
                pset["b4w_hair_billboard_type"] = "BASIC";
                report("particle_settings", pset, "b4w_hair_billboard_type");
            }

            if (!("b4w_hair_billboard_jitter_amp" in pset)) {
                pset["b4w_hair_billboard_jitter_amp"] = 0;
                report("particle_settings", pset, "b4w_hair_billboard_jitter_amp");
            }

            if (!("b4w_hair_billboard_jitter_freq" in pset)) {
                pset["b4w_hair_billboard_jitter_freq"] = 0;
                report("particle_settings", pset, "b4w_hair_billboard_jitter_freq");
            }

            if (!("b4w_hair_billboard_geometry" in pset)) {
                pset["b4w_hair_billboard_geometry"] = "SPHERICAL";
                report("particle_settings", pset, "b4w_hair_billboard_geometry");
            }

            if (!("b4w_wind_bend_inheritance" in pset)) {
                pset["b4w_wind_bend_inheritance"] = "PARENT";
                report("particle_settings", pset, "b4w_wind_bend_inheritance");
            }

            if (!("b4w_shadow_inheritance" in pset)) {
                pset["b4w_shadow_inheritance"] = "PARENT";
                report("particle_settings", pset, "b4w_shadow_inheritance");
            }

            if (!("b4w_reflection_inheritance" in pset)) {
                pset["b4w_reflection_inheritance"] = "PARENT";
                report("particle_settings", pset, "b4w_reflection_inheritance");
            }

            if (!("b4w_vcol_from_name" in pset)) {
                pset["b4w_vcol_from_name"] = "";
                report("particle_settings", pset, "b4w_vcol_from_name");
            }

            if (!("b4w_vcol_to_name" in pset)) {
                pset["b4w_vcol_to_name"] = "";
                report("particle_settings", pset, "b4w_vcol_to_name");
            }

            if (!("b4w_coordinate_system" in pset)) {
                pset["b4w_coordinate_system"] = "LOCAL";
                report("particle_settings", pset, "b4w_coordinate_system");
            }

            if (!("b4w_allow_nla" in pset)) {
                pset["b4w_allow_nla"] = true;
                report("particle_settings", pset, "b4w_allow_nla");
            }
        }

        if (!("constraints" in obj)) {
            obj["constraints"] = [];
            report("object", obj, "constraints");
        }

        var mods = obj["modifiers"];
        for (var j = 0; j < mods.length; j++) {
            if (!check_modifier(mods[j], obj)) {
                // remove from array
                mods.splice(j, 1);
                j--;
            }
        }

        if (!("animation_data" in obj)) {
            obj["animation_data"] = {
                "action": null,
                "nla_tracks": []
            }
            report("object", obj, "animation_data");
        }

        if (obj["animation_data"]) {
            if (!("action" in obj["animation_data"])) {
                obj["animation_data"]["action"] = null;
                report_raw("no action in animation data " + obj["name"]);
            }

            if (!("nla_tracks" in obj["animation_data"])) {
                obj["animation_data"]["nla_tracks"] = [];
                report_raw("no NLA in animation data " + obj["name"]);
            }

            var nla_tracks = obj["animation_data"]["nla_tracks"];
            for (var j = 0; j < nla_tracks.length; j++) {
                var track = nla_tracks[j];

                for (var k = 0; k < track["strips"].length; k++) {
                    var strip = track["strips"][k];
                    if (!("action" in strip)) {
                        strip["action"] = null;
                        report_raw("no action in NLA strip " + obj["name"]);
                    }
                    if (!("action_frame_start" in strip)) {
                        strip["action_frame_start"] = 0;
                        report_raw("no action_frame_start in NLA strip " +
                                obj["name"]);
                    }
                    if (!("action_frame_end" in strip)) {
                        strip["action_frame_end"] = strip["frame_end"] - strip["frame_start"];
                        report_raw("no action_frame_start in NLA strip " +
                                obj["name"]);
                    }
                }
            }
        }

        if (!("b4w_collision_id" in obj)) {
            obj["b4w_collision_id"] = "";
            report("material", obj, "b4w_collision_id");
        }

        if (!check_uniform_scale(obj))
            report_raw("non-uniform scale for object " + obj["name"]);
    }

    if (_unreported_compat_issues)
        m_print.error("Compatibility issues detected");

    for (var param in _params_reported) {
        var param_data = _params_reported[param];
        var param_name = param.match(/.*?(?=>>|$)/i)[0]
        m_print.warn("WARNING " + String(param_name) +
            " is " + param_data.report_type + " for " + param_data.type +
             ", reexport " + bpy_data["b4w_filepath_blend"]);
    }
}

function quat_b4w_bpy(quat, dest) {
    var x = quat[0];
    var y = quat[1];
    var z = quat[2];
    var w = quat[3];

    dest[0] = w;
    dest[1] = x;
    dest[2] = y;
    dest[3] = z;

    return dest;
}

/**
 * Report compatibility issue.
 */
function report(type, obj, missing_param) {

    if (!REPORT_COMPATIBILITY_ISSUES) {
        _unreported_compat_issues = true;
        return;
    }

    var param_id = missing_param+">>"+type;

    if (!(param_id in _params_reported)) {
        _params_reported[param_id] = {
            storage: [],
            report_type: "undefined",
            type: type
        }
    }

    _params_reported[param_id].storage.push(obj.name);
}
/**
 * Report about missing datablock.
 */
function report_missing_datablock(type) {
    if (!REPORT_COMPATIBILITY_ISSUES) {
        _unreported_compat_issues = true;
        return;
    }

    m_print.warn("WARNING " + "Datablock " + type + " is missing, reexport scene");
}
/**
 * Report about deprecated datablock
 */
function report_deprecated(type, obj, deprecated_param) {
    if (!REPORT_COMPATIBILITY_ISSUES) {
        _unreported_compat_issues = true;
        return;
    }

    if (!(param_id in _params_reported)) {
        _params_reported[param_id] = {
            storage: [],
            report_type: "deprecated",
            type: type
        }
    }

    _params_reported[param_id].storage.push(obj.name);
}
function report_modifier(type, obj) {
    if (!REPORT_COMPATIBILITY_ISSUES) {
        _unreported_compat_issues = true;
        return;
    }

    m_print.error("WARNING " + "Incomplete modifier " + String(type) + " for " +
            "\"" + obj["name"] + "\"" + ", reexport " +
            (obj["library"] ? "library" + libname(obj) : "main scene"));
}
/**
 * Report raw message
 */
function report_raw(msg) {
    if (!REPORT_COMPATIBILITY_ISSUES) {
        _unreported_compat_issues = true;
        return;
    }
    m_print.warn(msg);
}

/**
 * Get object library name.
 */
function libname(obj) {
    var path = obj["library"];
    return path.split("/").slice(-1)[0];
}


function check_uniform_scale(obj) {
    var scale = obj["scale"];

    if (scale[0] == 0 && scale[1] == 0 && scale[2] == 0)
        return true;

    var delta1 = Math.abs((scale[0] - scale[1]) / scale[0]);
    var delta2 = Math.abs((scale[1] - scale[2]) / scale[1]);

    return (delta1 < 0.001 && delta2 < 0.001);
}

exports.check_anim_fcurve_completeness = function(fcurve, action) {
    if (!("num_channels" in fcurve)) {
        fcurve["num_channels"] = 1;
        report_raw("B4W Warning: no channels number in animation fcurve for \"" +
                   action["name"] + "\" action, reexport " +
                   (action["library"] ? "library" + libname(action) : "main scene"));
    }
}

/**
 * Apply modifiers for mesh object and return new mesh.
 * @param {Object} obj Object ID
 * @returns Mesh object or null
 */
exports.apply_mesh_modifiers = function(obj) {
    if (!has_modifiers(obj))
        return null;

    var mesh = mesh_copy(obj["data"], obj["data"]["name"] + "_MOD");

    var modifiers = obj["modifiers"];
    for (var i = 0; i < modifiers.length; i++) {
        var mod = modifiers[i];

        switch(mod["type"]) {
        case "ARRAY":
            apply_array_modifier(mesh, mod);
            break;
        case "CURVE":
            apply_curve_modifier(mesh, mod);
            break;
        default:
            // just ignore
            break;
        }
        m_bounds.recalculate_mesh_boundings(mesh);
    }

    return mesh;
}

/**
 * Check if given object has interesting modifiers
 */
function has_modifiers(obj) {
    var modifiers = obj["modifiers"];
    for (var i = 0; i < modifiers.length; i++) {
        var mod = modifiers[i];
        var type = mod["type"];
        if (type == "ARRAY" || type == "CURVE")
            return true;
    }

    return false;
}

function apply_array_modifier(mesh, mod) {

    var dx = 0;
    var dy = 0;
    var dz = 0;

    var trans_matrix = new Float32Array(16);

    var new_meshes = [];

    for (var i = 1; i < mod["count"]; i++) {

        if (mod["use_constant_offset"]) {
            dx += mod["constant_offset_displace"][0];
            dy += mod["constant_offset_displace"][1];
            dz += mod["constant_offset_displace"][2];
        }

        if (mod["use_relative_offset"]) {
            var bb = mesh["b4w_bounding_box"];
            dx += (bb["max_x"] - bb["min_x"]) * mod["relative_offset_displace"][0];
            dy += (bb["max_y"] - bb["min_y"]) * mod["relative_offset_displace"][1];
            dz += (bb["max_z"] - bb["min_z"]) * mod["relative_offset_displace"][2];
        }

        m_util.trans_matrix(dx, dy, dz, trans_matrix);

        var mc = mesh_copy(mesh);
        mesh_transform_locations(mc, trans_matrix);
        new_meshes.push(mc);
    }

    for (var i = 0; i < new_meshes.length; i++)
        mesh_join(mesh, new_meshes[i]);
}

function apply_curve_modifier(mesh, mod) {
    var cobj = mod["object"];
    var spline = cobj._spline;

    var matrix = new Float32Array(16);

    var ncoords = spline.is_3d ? 4 : 3;

    var point = new Float32Array(ncoords);
    var deriv = new Float32Array(ncoords);

    var trans = new Float32Array(3);
    var quat = new Float32Array(4);
    var qtilt = new Float32Array(4);

    var tangent_a = new Float32Array(3);
    var tangent_b = new Float32Array(3);

    var loc = new Float32Array(3);
    var nor = new Float32Array(4);
    var tan = new Float32Array(4);

    for (var i = 0; i < mesh["submeshes"].length; i++) {
        var submesh = mesh["submeshes"][i];

        var position = submesh["position"];
        var normal = submesh["normal"];
        var tangent = submesh["tangent"];

        // NOTE: expected that mesh lies on positive side of deform axis
        var deform_index = deform_axis_index(mod["deform_axis"]);
        tangent_a[0] = 0;
        tangent_a[1] = 0;
        tangent_a[2] = 0;
        tangent_a[deform_index] = 1;

        var slen = m_curve.spline_length(spline);

        for (var j = 0; j < position.length / 3; j++) {

            loc[0] = position[3*j];
            loc[1] = position[3*j+1];
            loc[2] = position[3*j+2];

            var loc_spline_len = loc[deform_index];
            var t = m_curve.spline_len_to_t(spline, loc_spline_len);

            m_curve.spline_point(spline, t, point);

            trans[0] = point[0];
            trans[1] = point[1];
            trans[2] = point[2];

            m_curve.spline_derivative(spline, t, deriv);

            tangent_b[0] = deriv[0];
            // NOTE: workaround for bug with wrong twist of curves along y-axis
            // maybe it's somehow connected with Z-UP curve property
            tangent_b[1] = 0;
            tangent_b[2] = deriv[2];
            m_vec3.normalize(tangent_b, tangent_b);

            m_quat.rotationTo(tangent_a, tangent_b, quat);

            // calculate possible curve exceeding
            if (loc_spline_len < 0) {
                point[0] = tangent_b[0];
                point[1] = tangent_b[1];
                point[2] = tangent_b[2];
                m_vec3.scale(point, loc_spline_len, point);
                m_vec3.add(trans, point, trans);
            } else if (loc_spline_len > slen) {
                point[0] = tangent_b[0];
                point[1] = tangent_b[1];
                point[2] = tangent_b[2];
                m_vec3.scale(point, (loc_spline_len - slen), point);
                m_vec3.add(trans, point, trans);
            }

            m_mat4.fromRotationTranslation(quat, trans, matrix);

            if (spline.is_3d) {
                var tilt = point[3];
                m_quat.setAxisAngle(tangent_a, tilt, qtilt);
                m_vec3.transformQuat(loc, qtilt, loc);
            }

            // simple translation to curve point space
            loc[deform_index] = 0;

            m_vec3.transformMat4(loc, matrix, loc);

            // save
            position[3*j] = loc[0];
            position[3*j+1] = loc[1];
            position[3*j+2] = loc[2];

            if (normal.length) {
                nor[0] = normal[3*j];
                nor[1] = normal[3*j+1];
                nor[2] = normal[3*j+2];
                nor[3] = 0;

                m_vec4.transformMat4(nor, matrix, nor);

                normal[3*j] = nor[0];
                normal[3*j+1] = nor[1];
                normal[3*j+2] = nor[2];
            }

            if (tangent.length) {
                tan[0] = tangent[3*j];
                tan[1] = tangent[3*j+1];
                tan[2] = tangent[3*j+2];
                tan[3] = 0;

                m_vec4.transformMat4(tan, matrix, tan);

                tangent[3*j] = tan[0];
                tangent[3*j+1] = tan[1];
                tangent[3*j+2] = tan[2];
            }
        }
    }
}

/*
 * Calculate mesh range along deform axis
 */
function mesh_range_deform_axis(mesh, deform_axis) {
    var bpy_bb = mesh["b4w_bounding_box"];

    switch (deform_axis) {
    case "POS_X":
    case "NEG_X":
        return [bpy_bb["min_x"], bpy_bb["max_x"]];
    case "POS_Y":
    case "NEG_Y":
        return [bpy_bb["min_y"], bpy_bb["max_y"]];
    case "POS_Z":
    case "NEG_Z":
        return [bpy_bb["min_z"], bpy_bb["max_z"]];
    default:
        throw "Wrong deform axis value " + deform_axis;
    }
}

function deform_axis_index(deform_axis) {
    switch (deform_axis) {
    case "POS_X":
    case "NEG_X":
        return 0;
    case "POS_Y":
    case "NEG_Y":
        return 1;
    case "POS_Z":
    case "NEG_Z":
        return 2;
    default:
        throw "Wrong deform axis value " + deform_axis;
    }
}

/*
 * Modify locations with coords located inside given box.
 * Null interval values means all points along such axis
 */
function modify_mesh_points_interval(mesh, x_min, x_max, y_min, y_max,
        z_min, z_max, matrix) {

    var locations = mesh["vertices"]["locations"];

    var loc = new Float32Array(3);

    for (var i = 0; i < locations.length / 3; i++) {

        // retrieve
        var x = locations[3*i];
        var y = locations[3*i+1];
        var z = locations[3*i+2];

        if (((x_max - x_min) == 0 || (x >= x_min && x < x_max)) &&
            ((y_max - y_min) == 0 || (y >= y_min && y < y_max)) &&
            ((z_max - z_min) == 0 || (z >= z_min && z < z_max))) {

            // transform
            loc[0] = x;
            loc[1] = y;
            loc[2] = z;

            m_vec3.transformMat4(loc, matrix, loc);

            // save
            locations[3*i] = loc[0];
            locations[3*i+1] = loc[1];
            locations[3*i+2] = loc[2];
        }
    }
}

exports.create_material = function(name) {
    var mat = {
        "name": name,
        "use_nodes": false,
        "diffuse_shader": "LAMBERT",
        "diffuse_color": [0.8, 0.8, 0.8],
        "diffuse_intensity": 1.0,
        "alpha": 1.0,

        "raytrace_transparency": {
            "fresnel": 0,
            "fresnel_factor": 1.25
        },
        "raytrace_mirror": {
            "reflect_factor": 0,
            "fresnel": 0,
            "fresnel_factor": 1.25
        },
        "specular_color": [1,1,1],
        "specular_intensity": 0.5,
        "specular_shader": "COOKTORR",
        "specular_hardness": 50,
        "specular_slope": 0.2,
        "emit": 0,
        "ambient": 1.0,
        "use_vertex_color_paint": false,
        "b4w_water": false,
        "b4w_water_shore_smoothing": false,
        "b4w_water_dynamic": false,
        "b4w_generated_mesh": false,
        "b4w_waves_height": 1.0,
        "b4w_water_fog_color": [0.5,0.5,0.5],
        "b4w_water_fog_density": 0.06,
        "b4w_water_num_cascads": 5,
        "b4w_water_subdivs": 64,
        "b4w_water_detailed_dist": 1000,
        "b4w_terrain": false,
        "b4w_collision": false,
        "b4w_collision_id": "",
        "b4w_double_sided_lighting": false,
        "physics": {
            "friction": 0.5,
            "elasticity": 0
        },
        "type": "SURFACE",
        "use_transparency": false,
        "use_shadeless": false,
        "offset_z": 0,
        "b4w_render_above_all": false,
        "game_settings": {
            "alpha_blend": "OPAQUE",
            "use_backface_culling": true
        },
        "halo": {
            "size": 0.5,
            "hardness": 50,
            "b4w_halo_rings_color": [1.0, 1.0, 1.0],
            "b4w_halo_lines_color": [1.0, 1.0, 1.0],
            "b4w_halo_stars_blend_height": 10,
            "b4w_halo_stars_min_height": 0
        },
        "node_tree": null,
        "texture_slots": []
    }

    return mat;
}

/**
 * Extract submesh with given material index
 */
function mesh_copy(mesh, new_name) {

    if (!new_name)
        var new_name = mesh["name"] + "_COPY";

    var materials = mesh["materials"];
    var submeshes = mesh["submeshes"];

    mesh["materials"] = null;
    mesh["submeshes"] = null;

    var mesh_new = m_util.clone_object_json(mesh);

    mesh["materials"] = materials;
    mesh["submeshes"] = submeshes;

    mesh_new["name"] = new_name;
    // materials by link
    mesh_new["materials"] = mesh["materials"].slice(0);

    mesh_new["submeshes"] = [];
    for (var i = 0; i < submeshes.length; i++) {
        var submesh = submeshes[i];
        var submesh_new = m_util.clone_object_nr(submesh);
        mesh_new["submeshes"].push(submesh_new);
    }

    return mesh_new;
}

/**
 * Join two meshes (must have same materials)
 * append mesh2 to mesh and return mesh
 */
function mesh_join(mesh, mesh2) {

    for (var i = 0; i < mesh["submeshes"].length; i++) {
        var submesh = mesh["submeshes"][i];
        var submesh2 = mesh2["submeshes"][i];

        var base_length = submesh["base_length"];
        var index_length = submesh["indices"].length;

        submesh["base_length"] += submesh2["base_length"];

        for (var prop in submesh) {
            if (prop == "base_length")
                continue;

            if (prop == "indices") {
                submesh[prop] = m_util.uint32_concat(submesh[prop], submesh2[prop]);
                for (var j = index_length; j < submesh["indices"].length; j++)
                    submesh["indices"][j] += base_length;
            } else if (prop == "vertex_colors") {
                // leave vertex colors from the first mesh
            } else
                submesh[prop] = m_util.float32_concat(submesh[prop], submesh2[prop]);
        }
    }

    // NOTE: need something else?

    return mesh;
}

/**
 * Transform mesh locations by given matrix
 */
function mesh_transform_locations(mesh, matrix) {

    for (var i = 0; i < mesh["submeshes"].length; i++) {
        var submesh = mesh["submeshes"][i];

        m_util.positions_multiply_matrix(submesh["position"], matrix,
                submesh["position"], 0);
        m_util.vectors_multiply_matrix(submesh["normal"], matrix,
                submesh["normal"], 0);
        m_util.tangents_multiply_matrix(submesh["tangent"], matrix,
                submesh["tangent"], 0);
    }
}

/**
 * Rewrite object params according to NLA script.
 * Not the best place to do such things, but other methods are much harder to
 * implement (see update_object())
 */
exports.assign_nla_object_params = function(objects, scenes) {
    for (var i = 0; i < scenes.length; i++) {
        var scene = scenes[i];

        if (!scene["b4w_use_nla"])
            continue;

        var nla_script = scene["b4w_nla_script"];

        for (var j = 0; j < nla_script.length; j++) {
            var sslot = nla_script[j];

            switch (sslot["type"]) {
            case "SELECT":
            case "SELECT_PLAY":
                for (var k = 0; k < objects.length; k++) {
                    var obj = objects[k];
                    if (obj["name"] == sslot["object"])
                        obj["b4w_selectable"] = true;
                }

                break;
            case "SHOW":
            case "HIDE":
                for (var k = 0; k < objects.length; k++) {
                    var obj = objects[k];
                    if (obj["name"] == sslot["object"])
                        obj["b4w_do_not_batch"] = true;
                }
                break;
            }
        }
    }
}

}
