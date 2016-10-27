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
var m_mat4   = require("__mat4");
var m_print  = require("__print");
var m_quat   = require("__quat");
var m_util   = require("__util");
var m_vec3   = require("__vec3");
var m_mat3   = require("__mat3");
var m_logn   = require("__logic_nodes");
var m_anim   = require("__animation");

var REPORT_COMPATIBILITY_ISSUES = true;

var REQUIRED_FOR_PART_SYS_BIN_FORMAT = [5, 4];

var _unreported_compat_issues = false;

var _params_reported = {};

var _mat3_tmp = m_mat3.create();
var _quat_tmp = m_quat.create();

function reform_node(node) {

    switch(node["type"]) {
    case "VALTORGB":
        if(!node["color_ramp"]) {
            node["color_ramp"] = {"elements" : [{"position": 0.5, "color": [1, 1, 1, 1]}]};
            report("node Color Ramp", node, "color_ramp");
        }
        break;
    case "CURVE_RGB":
        if(!node["curve_mapping"]) {
            node["curve_mapping"] = {"curves_data": [[[0, 0], [1, 1]],
                [[0, 0], [1, 1]], [[0, 0], [1, 1]], [[0, 0], [1, 1]]],
                "curves_handle_types" : ["EXTRAPOLATED", "EXTRAPOLATED",
                "EXTRAPOLATED", "EXTRAPOLATED"], "curve_extend" : 
                [["AUTO", "AUTO"], ["AUTO", "AUTO"], ["AUTO", "AUTO"], ["AUTO", "AUTO"]]};
            report("node RGB Curves", node, "curve_mapping");
        }
        break;
    case "CURVE_VEC":
        if(!node["curve_mapping"]) {
            node["curve_mapping"] = {"curves_data": [[[0, 0], [1, 1]],
                [[0, 0], [1, 1]], [[0, 0], [1, 1]]],
                "curves_handle_types" : ["EXTRAPOLATED", "EXTRAPOLATED",
                "EXTRAPOLATED"], "curve_extend" : 
                [["AUTO", "AUTO"], ["AUTO", "AUTO"], ["AUTO", "AUTO"]]};
            report("node Vector Curves", node, "curve_mapping");
        }
        break;
    case "MAPPING":
        if(!node["vector_type"]) {
            node["vector_type"] = "POINT";
            report("node Mapping", node, "vector_type");
        }
        break;
    case "MATERIAL":
    case "MATERIAL_EXT":
        if (!("alpha" in node)) {
            node["alpha"] = 1;
            report("node material", node, "alpha");
        }

        if (!("darkness" in node)) {
            node["darkness"] = 1;
            report("node material", node, "darkness");
        }

        if (!("diffuse_toon_size" in node)) {
            node["diffuse_toon_size"] = 0.5;
            report("node material", node, "diffuse_toon_size");
        }

        if (!("diffuse_toon_smooth" in node)) {
            node["diffuse_toon_smooth"] = 0.1;
            report("node material", node, "diffuse_toon_smooth");
        }

        if (!("diffuse_intensity" in node)) {
            node["diffuse_intensity"] = 1;
            report("node material", node, "diffuse_intensity");
        }

        if (!("use_tangent_shading" in node)) {
            node["use_tangent_shading"] = false;
            report("node material", node, "use_tangent_shading");
        }

        if (!("specular_shader" in node)) {
            node["specular_shader"] = "COOKTORR";
            report("node material", node, "specular_shader");
        }

        if (!("specular_ior" in node)) {
            node["specular_ior"] = 4;
            report("node material", node, "specular_ior");
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
    case "VECT_TRANSFORM":
        if (!("convert_from" in node)) {
            node["convert_from"] = "WORLD";
            report("node " + node["type"], node, "convert_from");
        }

        if (!("convert_to" in node)) {
            node["convert_to"] = "WORLD";
            report("node " + node["type"], node, "convert_to");
        }

        if (!("vector_type" in node)) {
            node["vector_type"] = "POINT";
            report("node " + node["type"], node, "vector_type");
        }
        break;
    }
}

exports.check_particles_bin_format = function(loaded_data_version) {
    return m_util.version_cmp(loaded_data_version, REQUIRED_FOR_PART_SYS_BIN_FORMAT) != -1;
}

/**
 * Check bpy_data, perform necessary compatibility hacks.
 */
exports.check_bpy_data = function(bpy_data) {

    _params_reported = {};

    var check_modifier = function(mod, bpy_obj) {
        switch (mod["type"]) {
        case "ARRAY":
            if (!("fit_type" in mod)) {
                report_modifier(mod["type"], bpy_obj,
                                bpy_data["b4w_filepath_blend"]);
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
        report_missing_datablock("world", bpy_data["b4w_filepath_blend"]);
        var world = {
            "name": "DEFAULT",
            "horizon_color": new Float32Array([0,0,0]),
            "zenith_color": new Float32Array([0,0,0]),
            "light_settings": {
                "use_environment_light": false,
                "environment_energy": 1,
                "environment_color": "PLAIN"
            },
            "fog_settings": {
                "use_fog": false,
                "intensity": 0.0,
                "depth": 25.0,
                "start": 5.0,
                "height": 0.0,
                "falloff": "INVERSE_QUADRATIC",
                "use_custom_color": true,
                "color": [0.5, 0.5, 0.5],
            },
            "use_sky_paper": false,
            "use_sky_blend": false,
            "use_sky_real": false,
            "texture_slots": []
        }
        worlds.push(world);
    }

    var worlds = bpy_data["worlds"];
    for (var i = 0; i < worlds.length; i++) {
        var world = worlds[i];

        if (!("use_sky_blend" in world)) {
            report("world", world, "use_sky_blend");
            world["use_sky_blend"] = false;
        }

        if (!("use_sky_paper" in world)) {
            report("world", world, "use_sky_paper");
            world["use_sky_paper"] = false;
        }

        if (!("use_sky_real" in world)) {
            report("world", world, "use_sky_real");
            world["use_sky_real"] = false;
        }

        if(!("b4w_sky_settings" in world) || !("rayleigh_brightness" in world["b4w_sky_settings"])) {
            report("world", world, "rayleigh_brightness");
            world["b4w_sky_settings"] = {
                "render_sky": false,
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

        if(!("fog_settings" in world)) {
            report("world", world, "fog_settings");
            world["fog_settings"] = {
                "use_fog": false,
                "intensity": 0.0,
                "depth": 25.0,
                "start": 0.0,
                "height": 0.0,
                "falloff": "QUADRATIC",
                "use_custom_color": true,
                "color": [0.5, 0.5, 0.5],
            };
            if ("b4w_fog_color" in world) {
                world["fog_settings"]["use_custom_color"] = true;
                world["fog_settings"]["color"] = world["b4w_fog_color"];
            }
            if ("b4w_fog_density" in world) {
                if (world["b4w_fog_density"] > 0.0)
                    world["fog_settings"]["depth"] = 1.0 / world["b4w_fog_density"];
            }
        }

        if (!("render_sky" in world["b4w_sky_settings"])) {
            report("world", world, "render_sky");
            world["b4w_sky_settings"]["render_sky"] = false;
        }

        var texture_slots = world["texture_slots"];
        for (var j = 0; j < texture_slots.length; j++) {
            var slot = texture_slots[j];
            if (!("blend_type" in slot)) {
                slot["blend_type"] = "MIX";
                report("world_texture_slot", slot, "blend_type");
            }
            if (!("use_map_blend" in slot)) {
                slot["use_map_blend"] = false;
                report("world_texture_slot", slot, "use_map_blend");
            }
            if (!("use_map_horizon" in slot)) {
                slot["use_map_horizon"] = true;
                report("world_texture_slot", slot, "use_map_horizon");
            }
            if (!("use_map_zenith_up" in slot)) {
                slot["use_map_zenith_up"] = false;
                report("world_texture_slot", slot, "use_map_zenith_up");
            }
            if (!("use_rgb_to_intensity" in slot)) {
                slot["use_rgb_to_intensity"] = false;
                report("world_texture_slot", slot, "use_rgb_to_intensity");
            }
            if (!("invert" in slot)) {
                slot["invert"] = false;
                report("world_texture_slot", slot, "invert");
            }
            if (!("color" in slot)) {
                slot["color"] = [1.0, 0.0, 1.0];
                report("world_texture_slot", slot, "color");
            }
            if (!("blend_factor" in slot)) {
                slot["blend_factor"] = 0.0;
                report("world_texture_slot", slot, "blend_factor");
            }
            if (!("horizon_factor" in slot)) {
                slot["horizon_factor"] = 1.0;
                report("world_texture_slot", slot, "horizon_factor");
            }
            if (!("zenith_up_factor" in slot)) {
                slot["zenith_up_factor"] = 0.0;
                report("world_texture_slot", slot, "zenith_up_factor");
            }
            if (!("zenith_down_factor" in slot)) {
                slot["zenith_down_factor"] = 0.0;
                report("world_texture_slot", slot, "zenith_down_factor");
            }
            if (!("default_value" in slot)) {
                slot["default_value"] = 1.0;
                report("world_texture_slot", slot, "default_value");
            }
        }

        if (!("b4w_use_default_animation" in world)) {
            report("world", world, "b4w_use_default_animation");
            world["b4w_use_default_animation"] = false;
        }

        if (!("b4w_anim_behavior" in world)) {
            report("world", world, "b4w_anim_behavior");
            world["b4w_anim_behavior"] = "CYCLIC";
        }
    }

    /* scenes */
    var scenes = bpy_data["scenes"];
    for (var i = 0; i < scenes.length; i++) {
        var scene = scenes[i];
        var sc_world = scene["world"]

        if (!("timeline_markers" in scene)) {
            scene["timeline_markers"] = null;
            report("scene", scene, "timeline_markers");
        }

        if (!("b4w_reflection_quality" in scene)) {
            scene["b4w_reflection_quality"] = "MEDIUM";
            report("scene", scene, "b4w_reflection_quality");
        }

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

        if (!("b4w_logic_nodes" in scene)) {
            scene["b4w_logic_nodes"] = [];
            report("scene", scene, "b4w_logic_nodes");
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

        if (!("b4w_antialiasing_quality" in scene)) {
            scene["b4w_antialiasing_quality"] = "MEDIUM";
            report("scene", scene, "b4w_antialiasing_quality");
        }

        if (!("b4w_tags" in scene)) {
            scene["b4w_tags"] = {
                "title": "",
                "description": ""
            };
            report("scene", scene, "b4w_tags");
        }
        if (!("b4w_enable_object_selection" in scene)) {
            scene["b4w_enable_object_selection"] = "AUTO";
            report("scene", scene, "b4w_enable_object_selection");
        }
        if (!("b4w_enable_outlining" in scene)) {
            scene["b4w_enable_outlining"] = "AUTO";
            report("scene", scene, "b4w_enable_outlining");
        }
        if (!("b4w_enable_glow_materials" in scene)) {
            scene["b4w_enable_glow_materials"] = "AUTO";
            report("scene", scene, "b4w_enable_glow_materials");
        }
        if (!("b4w_enable_anchors_visibility" in scene)) {
            scene["b4w_enable_anchors_visibility"] = "AUTO";
            report("scene", scene, "b4w_enable_anchors_visibility");
        }

        if (!("b4w_outline_color" in scene)) {
            scene["b4w_outline_color"] = [1.0,1.0,1.0];
            report("scene", scene, "b4w_outline_color");
        }

        if (!("b4w_outline_factor" in scene)) {
            if ("b4w_glow_factor" in scene)
                scene["b4w_outline_factor"] = scene["b4w_glow_factor"];
            else
                scene["b4w_outline_factor"] = 1.0;
            report("scene", scene, "b4w_outline_factor");
        }

        if (!("b4w_shadow_settings" in scene)) {
            report("scene", scene, "b4w_shadow_settings");
            var w_shadows = sc_world["b4w_shadow_settings"];
            if (w_shadows)
                scene["b4w_shadow_settings"] = w_shadows;
            else
                scene["b4w_shadow_settings"] = {
                        "csm_resolution": 2048,
                        "blur_samples": "16x",
                        "self_shadow_polygon_offset": 1,
                        "b4w_enable_csm": false,
                        "csm_num": 1,
                        "csm_first_cascade_border": 10,
                        "first_cascade_blur_radius": 3,
                        "csm_last_cascade_border": 100,
                        "last_cascade_blur_radius": 1.5,
                        "fade_last_cascade": true,
                        "blend_between_cascades": true
                    };
        }
        var shadows = scene["b4w_shadow_settings"];
        if(!("csm_resolution" in shadows)) {
            report("scene", scene, "b4w_shadow_settings.csm_resolution");
            shadows["csm_resolution"] = 2048;
        }
        if(!("blur_samples" in shadows)) {
            report("scene", scene, "b4w_shadow_settings.blur_samples");
            shadows["blur_samples"] = "16x";
        }
        if(!("soft_shadows" in shadows)) {
            report("scene", scene, "b4w_shadow_settings.soft_shadows");
            shadows["soft_shadows"] = true;
        }
        if(!("self_shadow_polygon_offset" in shadows)) {
            report("scene", scene, "b4w_shadow_settings.self_shadow_polygon_offset");
            shadows["self_shadow_polygon_offset"] = 1;
        }
        if(!("self_shadow_normal_offset" in shadows)) {
            report("scene", scene, "b4w_shadow_settings.self_shadow_normal_offset");
            shadows["self_shadow_normal_offset"] = 0.01;
        }
        if(!("b4w_enable_csm" in shadows)) {
            report("scene", scene, "b4w_shadow_settings.b4w_enable_csm");
            shadows["b4w_enable_csm"] = false;
        }
        if(!("csm_num" in shadows)) {
            report("scene", scene, "b4w_shadow_settings.csm_num");
            shadows["csm_num"] = 1;
        }
        if(!("csm_first_cascade_border" in shadows)) {
            report("scene", scene, "b4w_shadow_settings.csm_first_cascade_border");
            shadows["csm_first_cascade_border"] = 10;
        }
        if(!("first_cascade_blur_radius" in shadows)) {
            report("scene", scene, "b4w_shadow_settings.first_cascade_blur_radius");
            shadows["first_cascade_blur_radius"] = 3;
        }
        if(!("csm_last_cascade_border" in shadows)) {
            report("scene", scene, "b4w_shadow_settings.csm_last_cascade_border");
            shadows["csm_last_cascade_border"] = 100;
        }
        if(!("last_cascade_blur_radius" in shadows)) {
            report("scene", scene, "b4w_shadow_settings.last_cascade_blur_radius");
            shadows["last_cascade_blur_radius"] = 1.5;
        }
        if(!("fade_last_cascade" in shadows)) {
            report("scene", scene, "b4w_shadow_settings.fade_last_cascade");
            shadows["fade_last_cascade"] = true;
        }
        if(!("blend_between_cascades" in shadows)) {
            report("scene", scene, "b4w_shadow_settings.blend_between_cascades");
            shadows["blend_between_cascades"] = true;
        }

        if (!("b4w_ssao_settings" in scene)) {
            report("scene", scene, "b4w_ssao_settings");
            var w_ssao = sc_world["b4w_ssao_settings"];
            if (w_ssao)
                scene["b4w_ssao_settings"] = w_ssao;
            else
                scene["b4w_ssao_settings"] = {
                    "dist_factor": 0.0,
                    "samples": 16,
                    "hemisphere": false,
                    "blur_depth": false,
                    "blur_discard_value": 1.0
                };
        }
        var ssao = scene["b4w_ssao_settings"];
        if(!("dist_factor" in ssao)) {
            report("scene", scene, "b4w_ssao_settings.dist_factor");
            ssao["dist_factor"] = 0.0;
        }
        if(!("samples" in ssao)) {
            report("scene", scene, "b4w_ssao_settings.samples");
            ssao["samples"] = 16;
        }
        if(!("hemisphere" in ssao)) {
            report("scene", scene, "b4w_ssao_settings.hemisphere");
            ssao["hemisphere"] = false;
        }
        if(!("blur_depth" in ssao)) {
            report("scene", scene, "b4w_ssao_settings.blur_depth");
            ssao["blur_depth"] = false;
        }
        if(!("blur_discard_value" in ssao)) {
            report("scene", scene, "b4w_ssao_settings.blur_discard_value");
            ssao["blur_discard_value"] = 1.0;
        }

        if (!("b4w_bloom_settings" in scene)) {
            report("scene", scene, "b4w_bloom_settings");
            var w_bloom = sc_world["b4w_bloom_settings"];
            if (w_bloom)
                scene["b4w_bloom_settings"] = w_bloom;
            else
                scene["b4w_bloom_settings"] = {
                    "key": 0.2,
                    "blur": 4.0,
                    "edge_lum": 1.0
                };
        }
        if(!("key" in scene["b4w_bloom_settings"])) {
            report("scene", scene, "b4w_bloom_settings.key");
            scene["b4w_bloom_settings"]["key"] = 0.2;
        }
        if(!("blur" in scene["b4w_bloom_settings"])) {
            report("scene", scene, "b4w_bloom_settings.blur");
            scene["b4w_bloom_settings"]["blur"] = 4.0;
        }
        if(!("edge_lum" in scene["b4w_bloom_settings"])) {
            report("scene", scene, "b4w_bloom_settings.edge_lum");
            scene["b4w_bloom_settings"]["edge_lum"] = 1.0;
        }

        if (!("b4w_motion_blur_settings" in scene)) {
            report("scene", scene, "b4w_motion_blur_settings");
            var w_motion_blur = sc_world["b4w_motion_blur_settings"];
            if (w_motion_blur)
                scene["b4w_motion_blur_settings"] = w_motion_blur;
            else
                scene["b4w_motion_blur_settings"] = {
                    "motion_blur_factor": 0.01,
                    "motion_blur_decay_threshold": 0.01
                }
        }
        if(!("motion_blur_factor" in scene["b4w_motion_blur_settings"])) {
            report("scene", scene, "b4w_motion_blur_settings.motion_blur_factor");
            scene["b4w_motion_blur_settings"]["motion_blur_factor"] = 0.01;
        }
        if(!("motion_blur_decay_threshold" in scene["b4w_motion_blur_settings"])) {
            report("scene", scene, "b4w_motion_blur_settings.motion_blur_decay_threshold");
            scene["b4w_motion_blur_settings"]["motion_blur_decay_threshold"] = 0.01;
        }

        if (!("b4w_color_correction_settings" in scene)) {
            report("scene", scene, "b4w_color_correction_settings");
            var w_color_correction = sc_world["b4w_color_correction_settings"];
            if (w_color_correction)
                scene["b4w_color_correction_settings"] = w_color_correction;
            else
                scene["b4w_color_correction_settings"] = {
                    "brightness" : 0.0,
                    "contrast" : 0.0,
                    "exposure": 1.0,
                    "saturation": 1.0
                }
        }

        if (!("b4w_god_rays_settings" in scene)) {
            report("scene", scene, "b4w_god_rays_settings");
            var w_god_rays = sc_world["b4w_god_rays_settings"];
            if (w_god_rays)
                scene["b4w_god_rays_settings"] = w_god_rays;
            else
                scene["b4w_god_rays_settings"] = {
                    "intensity" : 0.7,
                    "max_ray_length" : 1.0,
                    "steps_per_pass": 10
                }
        }
        if(!("steps_per_pass" in scene["b4w_god_rays_settings"])) {
            report("scene", scene, "b4w_god_rays_settings.steps_per_pass");
            scene["b4w_god_rays_settings"]["steps_per_pass"] = 10.0;
        }

        if (!("b4w_glow_settings" in scene)) {
            report("scene", scene, "b4w_glow_settings");
            scene["b4w_glow_settings"] = {
                "render_glow_over_blend": false,
                "small_glow_mask_coeff": 2.0,
                "large_glow_mask_coeff": 2.0,
                "small_glow_mask_width": 2.0,
                "large_glow_mask_width": 6.0
            }
            var glow_set = scene["b4w_glow_settings"];
            if ("b4w_render_glow_over_blend" in sc_world)
                glow_set["render_glow_over_blend"] = sc_world["b4w_render_glow_over_blend"];
            if ("b4w_small_glow_mask_coeff" in sc_world)
                glow_set["small_glow_mask_coeff"] = sc_world["b4w_small_glow_mask_coeff"];
            if ("b4w_large_glow_mask_coeff" in sc_world)
                glow_set["large_glow_mask_coeff"] = sc_world["b4w_large_glow_mask_coeff"];
            if ("b4w_small_glow_mask_width" in sc_world)
                glow_set["small_glow_mask_width"] = sc_world["b4w_small_glow_mask_width"];
            if ("b4w_large_glow_mask_width" in sc_world)
                glow_set["large_glow_mask_width"] = sc_world["b4w_large_glow_mask_width"];
        }

        var r_shadows = scene["b4w_render_shadows"];
        if (r_shadows != "AUTO" && r_shadows != "OFF" && r_shadows != "ON")
            if (r_shadows)
                scene["b4w_render_shadows"] = "ON";
            else
                scene["b4w_render_shadows"] = "OFF";

        var r_refl = scene["b4w_render_reflections"];
        if (r_refl != "OFF" && r_refl != "ON")
            if (r_refl)
                scene["b4w_render_reflections"] = "ON";
            else
                scene["b4w_render_reflections"] = "OFF";

        var r_refr = scene["b4w_render_refractions"];
        if (r_refr != "AUTO" && r_refr != "OFF" && r_refr != "ON")
            if (r_refr)
                scene["b4w_render_refractions"] = "ON";
            else
                scene["b4w_render_refractions"] = "OFF";

        if (!("b4w_render_dynamic_grass" in scene)) {
            report("scene", scene, "b4w_render_dynamic_grass");
            scene["b4w_render_dynamic_grass"] = "AUTO";
        }

        if (scene["b4w_nla_script"]) {
            report_deprecated("scene", scene, "b4w_nla_script");
        }

        if (!("audio_distance_model" in scene)) {
            report("scene", scene, "audio_distance_model");
            scene["audio_distance_model"] = "INVERSE_CLAMPED";
        }

    }

    /* object data - meshes */
    var meshes = bpy_data["meshes"];

    for (var i = 0; i < meshes.length; i++) {
        var mesh = meshes[i];

        if (!mesh["b4w_boundings"]) {
            report("mesh", mesh, "b4w_boundings");
            mesh["b4w_boundings"] = {};
            var b_data = mesh["b4w_boundings"];
            if (mesh["b4w_bounding_box"])
                b_data["bb"] = mesh["b4w_bounding_box"];
            else
                b_data["bb"] = {"max_x" : 0, "max_y" : 0, "max_z" : 0,
                    "min_x" : 0, "min_y" : 0, "min_z" : 0};

            if (mesh["b4w_bounding_box_source"])
                b_data["bb_src"] = mesh["b4w_bounding_box_source"];
            else
                b_data["bb_src"] = mesh["b4w_bounding_box"];

            if (mesh["b4w_bounding_sphere_center"])
                b_data["bs_cen"] = mesh["b4w_bounding_sphere_center"];
            else
                b_data["bs_cen"] = [0, 0, 0];

            if (mesh["b4w_bounding_cylinder_center"])
                b_data["bc_cen"] = mesh["b4w_bounding_cylinder_center"];
            else
                b_data["bc_cen"] = [0, 0, 0];

            if (mesh["b4w_bounding_ellipsoid_center"])
                b_data["be_cen"] = mesh["b4w_bounding_ellipsoid_center"];
            else
                b_data["be_cen"] = [0, 0, 0];

            if (mesh["b4w_bounding_ellipsoid_axes"])
                b_data["be_ax"] = mesh["b4w_bounding_ellipsoid_axes"];
            else {
                var bb = b_data["bb"];
                b_data["be_ax"] = [(bb["max_x"] - bb["min_x"])/2,
                                                   (bb["max_y"] - bb["min_y"])/2,
                                                   (bb["max_z"] - bb["min_z"])/2];
            }

            if (mesh["b4w_rotated_bounding_box"])
                b_data["rbb"] = mesh["b4w_rotated_bounding_box"];
            else {
                var bb = b_data["bb"];
                b_data["rbb"] = {
                    "rbb_c" : [(bb["max_x"] + bb["min_x"])/2,
                                (bb["max_y"] + bb["min_y"])/2,
                                (bb["max_z"] + bb["min_z"])/2],
                    "rbb_s" : [1, 1, 1]
                };
            }

            if(mesh["b4w_cov_axis_x"])
                b_data["caxis_x"] = mesh["b4w_cov_axis_x"];
            else
                b_data["caxis_x"] = [1,0,0];

            if(mesh["b4w_cov_axis_y"])
                b_data["caxis_y"] = mesh["b4w_cov_axis_y"];
            else
                b_data["caxis_y"] = [0,1,0];

            if(mesh["b4w_cov_axis_z"])
                b_data["caxis_z"] = mesh["b4w_cov_axis_z"];
            else
                b_data["caxis_z"] = [0,0,1];
        }

        if (!mesh["uv_textures"]) {
            report("mesh", mesh, "uv_textures");
            mesh["uv_textures"] = [];
        }

        if (!("b4w_shape_keys" in mesh)) {
            mesh["b4w_shape_keys"] = [];
            report("mesh", mesh, "b4w_shape_keys");
        }

        var submesh_is_ok = true;
        for (var k = 0; k < mesh["submeshes"].length; k++) {
            var submesh = mesh["submeshes"][k];
            if (!("boundings" in submesh)) {
                submesh_is_ok = false;
                submesh["boundings"] = {
                    "be_ax" : mesh["b4w_bounding_ellipsoid_axes"],
                    "be_cen" : mesh["b4w_bounding_ellipsoid_center"],
                    "bb" : {
                        "max_x" : mesh["b4w_bounding_box"]["max_x"],
                        "max_y" : mesh["b4w_bounding_box"]["max_y"],
                        "max_z" : mesh["b4w_bounding_box"]["max_z"],
                        "min_x" : mesh["b4w_bounding_box"]["min_x"],
                        "min_y" : mesh["b4w_bounding_box"]["min_y"],
                        "min_z" : mesh["b4w_bounding_box"]["min_z"]
                    }
                };
            }

            if (!("be_ax" in submesh["boundings"]))
                submesh["boundings"]["be_ax"] = mesh["b4w_bounding_ellipsoid_axes"];

            if (!("be_cen" in submesh["boundings"]))
                submesh["boundings"]["be_cen"] = mesh["b4w_bounding_ellipsoid_center"];

            if (!("bb" in submesh["boundings"]))
                submesh["boundings"]["bb"] = mesh["b4w_bounding_box"];

            if (!("rbb" in submesh["boundings"])) {
                var bb = mesh["b4w_bounding_box"];
                submesh["boundings"]["rbb"] = {
                    "rbb_c" : [(bb["max_x"] + bb["min_x"])/2,
                                (bb["max_y"] + bb["min_y"])/2,
                                (bb["max_z"] + bb["min_z"])/2],
                    "rbb_s" : [1, 1, 1]
                };
            }
            if (!("caxis_x" in submesh["boundings"]))
                submesh["boundings"]["caxis_x"] = [1,0,0];
            if (!("caxis_y" in submesh["boundings"]))
                submesh["boundings"]["caxis_y"] = [0,1,0];
            if (!("caxis_z" in submesh["boundings"]))
                submesh["boundings"]["caxis_z"] = [0,0,1];
        }
        if (!submesh_is_ok)
            report("mesh", mesh, "submesh_bd");

        check_export_props(mesh);

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

        if (!("b4w_hover_zero_level" in camera)) {
            camera["b4w_hover_zero_level"] = 0;
            report("camera", camera, "b4w_hover_zero_level");
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

        if (!("b4w_use_target_distance_limits" in camera)) {
            camera["b4w_use_target_distance_limits"] 
                    = camera["b4w_use_distance_limits"] || false;
            report("camera", camera, "b4w_use_target_distance_limits");
        }

        if (!("b4w_use_zooming" in camera)) {
            camera["b4w_use_zooming"] = camera["b4w_use_distance_limits"] || false;
            report("camera", camera, "b4w_use_zooming");
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

        if (!("b4w_use_pivot_limits" in camera)) {
            camera["b4w_use_pivot_limits"] = false;
            camera["b4w_pivot_z_min"] = 0;
            camera["b4w_pivot_z_max"] = 10;
            report("camera", camera, "b4w_use_pivot_limits");
        }

        if (!("b4w_dof_bokeh" in camera)) {
            camera["b4w_dof_bokeh"] = false;
            report("camera", camera, "b4w_dof_bokeh");
        }

        if (!("b4w_dof_bokeh_intensity" in camera)) {
            camera["b4w_dof_bokeh_intensity"] = 0.3;
            report("camera", camera, "b4w_dof_bokeh_intensity");
        }

        if (!("b4w_dof_foreground_blur" in camera)) {
            camera["b4w_dof_foreground_blur"] = false;
            report("camera", camera, "b4w_dof_foreground_blur");
        }

        if (!("b4w_dof_front_start" in camera)) {
            camera["b4w_dof_front_start"] = 0;
            report("camera", camera, "b4w_dof_front_start");
        }

        if (!("b4w_dof_front_end" in camera)) {
            camera["b4w_dof_front_end"] = camera["b4w_dof_front"];
            report("camera", camera, "b4w_dof_front_end");
        }

        if (!("b4w_dof_rear_start" in camera)) {
            camera["b4w_dof_rear_start"] = 0;
            report("camera", camera, "b4w_dof_rear_start");
        }

        if (!("b4w_dof_rear_end" in camera)) {
            camera["b4w_dof_rear_end"] = camera["b4w_dof_rear"];
            report("camera", camera, "b4w_dof_rear_end");
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

        if (!("clip_start" in lamp)) {
            lamp["clip_start"] = 0.1;
            report("lamp", lamp, "clip_start");
        }

        if (!("clip_end" in lamp)) {
            lamp["clip_end"] = 30.0;
            report("lamp", lamp, "clip_end");
        }

        if (lamp["type"] == "POINT" || lamp["type"] == "SPOT")
            if (!("use_sphere" in lamp)) {
                lamp["use_sphere"] = false;
                report("lamp", lamp, "use_sphere");
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
        if (!("b4w_auto_play" in speaker)) {
            speaker["b4w_auto_play"] = false;
            report("speaker", speaker, "b4w_auto_play");
        }

        if (!("b4w_enable_doppler" in speaker)) {
            speaker["b4w_enable_doppler"] = false;
            report("speaker", speaker, "b4w_enable_doppler");
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
        if (!("b4w_loop_start" in speaker)) {
            speaker["b4w_loop_start"] = 0;
            report("speaker", speaker, "b4w_loop_start");
        }
        if (!("b4w_loop_end" in speaker)) {
            speaker["b4w_loop_end"] = 0;
            report("speaker", speaker, "b4w_loop_end");
        }

        if (speaker["animation_data"])
            check_strip_props(speaker["animation_data"]);
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

        if (!("b4w_nla_video" in texture)) {
            texture["b4w_nla_video"] = false;
            report("texture", texture, "b4w_nla_video");
        }
    }

    /* images */
    var images = bpy_data["images"];

    for (var i = 0; i < images.length; i++) {
        var image = images[i];

        if (!("colorspace_settings_name" in image)) {
            image["colorspace_settings_name"] = "sRGB";
            report("image", image, "colorspace_settings_name");
        }
    }

    /* materials */
    var materials = bpy_data["materials"];

    for (var i = 0; i < materials.length; i++) {
        var mat = materials[i];

        if (mat["game_settings"]["alpha_blend"] == "ALPHA_ANTIALIASING")
            mat["game_settings"]["alpha_blend"] = "CLIP";

        if (!("use_tangent_shading" in mat)) {
            mat["use_tangent_shading"] = false;
            report("material", mat, "use_tangent_shading");
        }

        if ("b4w_node_mat_type" in mat) {
            report_deprecated("material", mat, "b4w_node_mat_type");
        }

        if ("b4w_skydome" in mat) {
            report_deprecated("material", mat, "b4w_skydome");
        }

        if ("b4w_procedural_skydome" in mat) {
            report_deprecated("material", mat, "b4w_procedural_skydome");
        }

        if (!("b4w_lens_flares" in mat)) {
            mat["b4w_lens_flares"] = false;
            report("material", mat, "b4w_lens_flares");
        }

        if (mat["name"] === "LENS_FLARES") {
            if (!mat["b4w_lens_flares"])
                m_print.warn("\"LENS_FLARES\" material name has been found. Enable " +
                        "the \"Lens Flare\" property for this material.");
            mat["b4w_lens_flares"] = true;
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

            if (!("b4w_water_enable_caust" in mat)) {
                mat["b4w_water_enable_caust"] = false;
                report("material", mat, "b4w_water_enable_caust");
            }

            if (!("b4w_water_caust_scale" in mat)) {
                mat["b4w_water_caust_scale"] = 0.25;
                report("material", mat, "b4w_water_caust_scale");
            }

            if (!("b4w_water_caust_brightness" in mat)) {
                mat["b4w_water_caust_brightness"] = 0.5;
                report("material", mat, "b4w_water_caust_brightness");
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

        if (!("b4w_collision_margin" in mat)) {
            mat["b4w_collision_margin"] = 0.040;
            report("material", mat, "b4w_collision_margin");
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
        if (!("specular_ior" in mat)) {
            mat["specular_ior"] = 1.0;
            report("material", mat, "specular_ior");
        }
        if (!("darkness" in mat)) {
            mat["darkness"] = 0.0;
            report("material", mat, "darkness");
        }
        if (!("diffuse_toon_size" in mat)) {
            mat["diffuse_toon_size"] = 0.0;
            report("material", mat, "diffuse_toon_size");
        }
        if (!("diffuse_toon_smooth" in mat)) {
            mat["diffuse_toon_smooth"] = 0.0;
            report("material", mat, "diffuse_toon_smooth");
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
            if (mat["node_tree"]["animation_data"])
                check_strip_props(mat["node_tree"]["animation_data"]);
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
        var bpy_obj = objects[i];

        switch(bpy_obj["type"]) {
        case "MESH":
            if (!("b4w_dynamic_geometry" in bpy_obj)) {
                bpy_obj["b4w_dynamic_geometry"] = false;
                //report("object", bpy_obj, "b4w_dynamic_geometry");
            }

            if (!("b4w_reflexible" in bpy_obj)) {
                bpy_obj["b4w_reflexible"] = false;
                //report("object", bpy_obj, "b4w_reflexible");
            }

            if (!("b4w_reflexible_only" in bpy_obj)) {
                bpy_obj["b4w_reflexible_only"] = false;
                //report("object", bpy_obj, "b4w_reflexible_only");
            }

            if (!("b4w_reflective" in bpy_obj)) {
                bpy_obj["b4w_reflective"] = false;
                //report("object", bpy_obj, "b4w_reflective");
            }
            if (!("b4w_reflection_type" in bpy_obj)) {
                bpy_obj["b4w_reflection_type"] = "PLANE";
                report("object", bpy_obj, "b4w_reflection_type");
            }

            if (!("b4w_wind_bending" in bpy_obj)) {
                bpy_obj["b4w_wind_bending"] = false;
                report("object", bpy_obj, "b4w_wind_bending");
            }

            if (!("b4w_wind_bending_angle" in bpy_obj)) {
                bpy_obj["b4w_wind_bending_angle"] = 10.0;
                bpy_obj["b4w_wind_bending_freq"] = 0.25;
                report("object", bpy_obj, "wind bending params");
            }

            if (!("b4w_detail_bending_amp" in bpy_obj)) {
                bpy_obj["b4w_detail_bending_amp"] = 0.1;
                bpy_obj["b4w_branch_bending_amp"] = 0.3;
                report("object", bpy_obj, "detail bending params");
            }

            if (!("b4w_detail_bending_freq" in bpy_obj)) {
                bpy_obj["b4w_detail_bending_freq"] = 1.0;
                report("object", bpy_obj, "b4w_detail_bending_freq");
            }

            if (!("b4w_main_bend_stiffness_col" in bpy_obj)) {
                bpy_obj["b4w_main_bend_stiffness_col"] = "";
                report("object", bpy_obj, "b4w_main_bend_stiffness_col");
            }

            if (!("b4w_detail_bend_colors" in bpy_obj)) {
                bpy_obj["b4w_detail_bend_colors"] = {
                    "leaves_stiffness_col": "",
                    "leaves_phase_col": "",
                    "overall_stiffness_col": ""
                };
                report("object", bpy_obj, "b4w_detail_bend_colors");
            }

            if (!("b4w_caustics" in bpy_obj)) {
                bpy_obj["b4w_caustics"] = false;
                //report("object", bpy_obj, "b4w_caustics");
            }

            // NOTE: all vertex things go to mesh
            // 1 bpy_obj == 1 mesh (enforced by exporter)
            if ("vertex_groups" in bpy_obj && bpy_obj["vertex_groups"].length &&
                    bpy_obj["data"] && bpy_obj["data"]["vertex_groups"].length == 0) {
                bpy_obj["data"]["vertex_groups"] = bpy_obj["vertex_groups"];
                delete bpy_obj["vertex_groups"];
                report("object", bpy_obj, "vertex_groups");
            }
            if ("b4w_vertex_anim" in bpy_obj && bpy_obj["b4w_vertex_anim"].length &&
                    bpy_obj["data"] && bpy_obj["data"]["b4w_vertex_anim"].length == 0) {
                bpy_obj["data"]["b4w_vertex_anim"] = bpy_obj["b4w_vertex_anim"];
                delete bpy_obj["b4w_vertex_anim"];
                report("object", bpy_obj, "b4w_vertex_anim");
            }

            if (!("b4w_do_not_render" in bpy_obj)) {
                bpy_obj["b4w_do_not_render"] = false;
                //report("object", bpy_obj, "b4w_do_not_render");
            }

            if (!("b4w_hidden_on_load" in bpy_obj)) {
                bpy_obj["b4w_hidden_on_load"] = false;
                //report("object", bpy_obj, "b4w_hidden_on_load");
            }

            if (!("use_ghost" in bpy_obj["game"])) {
                bpy_obj["game"]["use_ghost"] = false;
                //report("object", bpy_obj, "use_ghost");
            }
            if (!("use_sleep" in bpy_obj["game"])) {
                bpy_obj["game"]["use_sleep"] = false;
                //report("object", bpy_obj, "use_sleep");
            }
            if (!("velocity_min" in bpy_obj["game"])) {
                bpy_obj["game"]["velocity_min"] = 0;
                //report("object", bpy_obj, "velocity_min");
            }
            if (!("velocity_max" in bpy_obj["game"])) {
                bpy_obj["game"]["velocity_max"] = 0;
                //report("object", bpy_obj, "velocity_max");
            }
            if (!("collision_group" in bpy_obj["game"])) {
                bpy_obj["game"]["collision_group"] = 1;
                //report("object", bpy_obj, "collision_group");
            }
            if (!("collision_mask" in bpy_obj["game"])) {
                bpy_obj["game"]["collision_mask"] = 255;
                //report("object", bpy_obj, "collision_mask");
            }

            check_collision_bounds_type(bpy_obj);

            if ("b4w_vehicle_settings" in bpy_obj) {
                if (bpy_obj["b4w_vehicle_settings"]) {
                    if (!("steering_ratio" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["steering_ratio"] = 10;
                        //report("object", bpy_obj, "steering_ratio");
                    }
                    if (!("steering_max" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["steering_max"] = 1;
                        //report("object", bpy_obj, "steering_max");
                    }
                    if (!("inverse_control" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["inverse_control"] = false;
                        //report("object", bpy_obj, "inverse_control");
                    }
                    if (!("force_max" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["force_max"] = 1500;
                        //report("object", bpy_obj, "force_max");
                    }
                    if (!("brake_max" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["brake_max"] = 100;
                        //report("object", bpy_obj, "brake_max");
                    }
                    if (!("speed_ratio" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["speed_ratio"] = 0.027;
                        //report("object", bpy_obj, "speed_ratio");
                    }
                    if (!("max_speed_angle" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["max_speed_angle"] = Math.PI;
                        //report("object", bpy_obj, "max_speed_angle");
                    }
                    if (!("delta_tach_angle" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["delta_tach_angle"] = 4.43;
                        //report("object", bpy_obj, "delta_tach_angle");
                    }
                    if (!("suspension_compression" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["suspension_compression"] = 4.4;
                        //report("object", bpy_obj, "suspension_compression");
                    }
                    if (!("suspension_stiffness" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["suspension_stiffness"] = 20.0;
                        //report("object", bpy_obj, "suspension_stiffness");
                    }
                    if (!("suspension_damping" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["suspension_damping"] = 2.3;
                        //report("object", bpy_obj, "suspension_damping");
                    }
                    if (!("wheel_friction" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["wheel_friction"] = 1000.0;
                        //report("object", bpy_obj, "wheel_friction");
                    }
                    if (!("roll_influence" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["roll_influence"] = 0.1;
                        //report("object", bpy_obj, "roll_influence");
                    }
                    if (!("max_suspension_travel_cm" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["max_suspension_travel_cm"] = 30;
                        //report("object", bpy_obj, "max_suspension_travel_cm");
                    }
                    if (!("floating_factor" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["floating_factor"] = 3.0;
                        //report("object", bpy_obj, "floating_factor");
                    }
                    if (!("floating_factor" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["floating_factor"] = 3.0;
                        //report("object", bpy_obj, "floating_factor");
                    }
                    if (!("water_lin_damp" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["water_lin_damp"] = 0.9;
                        //report("object", bpy_obj, "water_lin_damp");
                    }
                    if (!("water_rot_damp" in bpy_obj["b4w_vehicle_settings"])) {
                        bpy_obj["b4w_vehicle_settings"]["water_rot_damp"] = 0.9;
                        //report("object", bpy_obj, "water_rot_damp");
                    }
                }
            } else {
                bpy_obj["b4w_vehicle_settings"] = null;
                report("object", bpy_obj, "b4w_vehicle_settings");
            }

            if ("b4w_floating_settings" in bpy_obj) {
                if (bpy_obj["b4w_floating_settings"]) {
                    if (!("floating_factor" in bpy_obj["b4w_floating_settings"])) {
                        bpy_obj["b4w_floating_settings"]["floating_factor"] = 3.0;
                        //report("object", bpy_obj, "floating_factor");
                    }
                    if (!("water_lin_damp" in bpy_obj["b4w_floating_settings"])) {
                        bpy_obj["b4w_floating_settings"]["water_lin_damp"] = 0.8;
                        //report("object", bpy_obj, "water_lin_damp");
                    }
                    if (!("water_rot_damp" in bpy_obj["b4w_floating_settings"])) {
                        bpy_obj["b4w_floating_settings"]["water_rot_damp"] = 0.8;
                        //report("object", bpy_obj, "water_rot_damp");
                    }
                }
            } else {
                bpy_obj["b4w_floating_settings"] = null;
                report("object", bpy_obj, "b4w_floating_settings");
            }

            if ("b4w_character_settings" in bpy_obj) {
                if (bpy_obj["b4w_character_settings"]) {
                    if (!("walk_speed" in bpy_obj["b4w_character_settings"])) {
                        bpy_obj["b4w_character_settings"]["walk_speed"] = 4;
                        //report("object", bpy_obj, "walk_speed");
                    }
                    if (!("run_speed" in bpy_obj["b4w_character_settings"])) {
                        bpy_obj["b4w_character_settings"]["run_speed"] = 8;
                        //report("object", bpy_obj, "run_speed");
                    }
                    if (!("step_height" in bpy_obj["b4w_character_settings"])) {
                        bpy_obj["b4w_character_settings"]["step_height"] = 0.25;
                        //report("object", bpy_obj, "step_height");
                    }
                    if (!("jump_strength" in bpy_obj["b4w_character_settings"])) {
                        bpy_obj["b4w_character_settings"]["jump_strength"] = 5;
                        //report("object", bpy_obj, "jump_strength");
                    }
                    if (!("waterline" in bpy_obj["b4w_character_settings"])) {
                        bpy_obj["b4w_character_settings"]["waterline"] = 0.0;
                        //report("object", bpy_obj, "waterline");
                    }
                }
            } else {
                bpy_obj["b4w_character_settings"] = null;
                report("object", bpy_obj, "b4w_character_settings");
            }

            if (!("b4w_selectable" in bpy_obj)) {
                bpy_obj["b4w_selectable"] = false;
                report("object", bpy_obj, "b4w_selectable");
            }
            if (!("b4w_outlining" in bpy_obj)) {
                bpy_obj["b4w_outlining"] = false;
                report("object", bpy_obj, "b4w_outlining");
            }
            if (!("b4w_outline_on_select" in bpy_obj)) {
                bpy_obj["b4w_outline_on_select"] = false;
                report("object", bpy_obj, "b4w_outline_on_select");
            }
            if (!("b4w_billboard" in bpy_obj)) {
                bpy_obj["b4w_billboard"] = false;
                report("object", bpy_obj, "b4w_billboard");
            }
            if (!("b4w_billboard_geometry" in bpy_obj)) {
                bpy_obj["b4w_billboard_geometry"] = "SPHERICAL";
                report("object", bpy_obj, "b4w_billboard_geometry");
            }
            if (!("b4w_pres_glob_orientation" in bpy_obj)) {
                bpy_obj["b4w_pres_glob_orientation"] = false;
                report("object", bpy_obj, "b4w_pres_glob_orientation");
            }
            if (!("b4w_outline_settings" in bpy_obj)) {
                if ("b4w_glow_settings" in bpy_obj)
                    bpy_obj["b4w_outline_settings"] = bpy_obj["b4w_glow_settings"];
                else {
                    bpy_obj["b4w_outline_settings"] = {};
                    bpy_obj["b4w_outline_settings"]["outline_duration"] = 1.0;
                    bpy_obj["b4w_outline_settings"]["outline_period"] = 1.0;
                    bpy_obj["b4w_outline_settings"]["outline_relapses"] = 0;
                }
                report("object", bpy_obj, "b4w_outline_settings");
            }
            if (!("b4w_lod_transition" in bpy_obj)) {
                bpy_obj["b4w_lod_transition"] = 0.01;
                report("object", bpy_obj, "b4w_lod_transition");
            }
            if (!("lod_levels" in bpy_obj)) {
                bpy_obj["lod_levels"] = [];
                report("object", bpy_obj, "lod_levels");
            }
            if (!("b4w_animation_mixing" in bpy_obj)) {
                bpy_obj["b4w_animation_mixing"] = false;
                report("object", bpy_obj, "b4w_animation_mixing");
            }
            break;
        case "EMPTY":
            if (!("b4w_anchor" in bpy_obj)) {
                bpy_obj["b4w_anchor"] = null;
                report("object", bpy_obj, "b4w_anchor");
            }
            if (bpy_obj["b4w_anchor"] && !("max_width" in bpy_obj["b4w_anchor"])) {
                bpy_obj["b4w_anchor"]["max_width"] = 250;
            }

            break;
        default:
            break;
        }

        if (!("collision_margin" in bpy_obj["game"])) {
            bpy_obj["game"]["collision_margin"] = 0.040;
            report("object", bpy_obj, "collision_margin");
        }

        if (!("b4w_anim_behavior" in bpy_obj)) {
            bpy_obj["b4w_anim_behavior"] = bpy_obj["b4w_cyclic_animation"] ?
                    "CYCLIC" : "FINISH_STOP";
            report("object", bpy_obj, "b4w_anim_behavior");
        }

        if (!("rotation_quaternion" in bpy_obj)) {
            var quat = [0,0,0,1];
            m_util.euler_to_quat(bpy_obj["rotation_euler"], quat);
            quat_b4w_bpy(quat, quat);
            bpy_obj["rotation_quaternion"] = quat;
            report("object", bpy_obj, "rotation_quaternion");
        }

        if ("webgl_do_not_batch" in bpy_obj) {
            bpy_obj["b4w_do_not_batch"] = bpy_obj["webgl_do_not_batch"];

            if (bpy_obj["webgl_do_not_batch"])
                report_deprecated("object", bpy_obj, "webgl_do_not_batch");
        }

        if (!("b4w_shadow_cast_only" in bpy_obj)) {
            bpy_obj["b4w_shadow_cast_only"] = false;
            report("object", bpy_obj, "b4w_shadow_cast_only");
        }

        if (!("b4w_correct_bounding_offset" in bpy_obj)) {
            bpy_obj["b4w_correct_bounding_offset"] = "AUTO";
            report("object", bpy_obj, "b4w_correct_bounding_offset");
        }

        var psystems = bpy_obj["particle_systems"];
        for (var j = 0; j < psystems.length; j++) {
            var psys = psystems[j];
            var pset = psys["settings"];

            if (!("use_rotation_dupli" in pset)) {
                pset["use_rotation_dupli"] = false;
                report("particle_settings", pset, "use_rotation_dupli");
            }

            if (!("use_whole_group" in pset)) {
                pset["use_whole_group"] = false;
                report("particle_settings", pset, "use_whole_group");
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

            if (!("b4w_enable_soft_particles" in pset)) {
                pset["b4w_enable_soft_particles"] = false;
                report("particle_settings", pset, "b4w_enable_soft_particles");
            }

            if (!("b4w_particles_softness" in pset)) {
                pset["b4w_particles_softness"] = 1.0;
                report("particle_settings", pset, "b4w_particles_softness");
            }

            if (!("billboard_tilt" in pset)) {
                pset["billboard_tilt"] = 0.0;
                report("particle_settings", pset, "billboard_tilt");
            }

            if (!("billboard_tilt_random" in pset)) {
                pset["billboard_tilt_random"] = 0.0;
                report("particle_settings", pset, "billboard_tilt_random");
            }

            if (!("use_rotations" in pset)) {
                pset["use_rotations"] = false;
                report("particle_settings", pset, "use_rotations");
            }
        }

        if (!("constraints" in bpy_obj)) {
            bpy_obj["constraints"] = [];
            report("object", bpy_obj, "constraints");
        }

        var mods = bpy_obj["modifiers"];
        for (var j = 0; j < mods.length; j++) {
            if (!check_modifier(mods[j], bpy_obj)) {
                // remove from array
                mods.splice(j, 1);
                j--;
            }
        }

        if (!("animation_data" in bpy_obj)) {
            bpy_obj["animation_data"] = {
                "action": null,
                "nla_tracks": []
            }
            report("object", bpy_obj, "animation_data");
        }

        if (bpy_obj["animation_data"]) {
            if (!("action" in bpy_obj["animation_data"])) {
                bpy_obj["animation_data"]["action"] = null;
                report_raw("no action in animation data " + bpy_obj["name"]);
            }

            if (!("nla_tracks" in bpy_obj["animation_data"])) {
                bpy_obj["animation_data"]["nla_tracks"] = [];
                report_raw("no NLA in animation data " + bpy_obj["name"]);
            }

            check_strip_props(bpy_obj["animation_data"]);
        }

        if (!("b4w_collision_id" in bpy_obj)) {
            bpy_obj["b4w_collision_id"] = "";
            report("object", bpy_obj, "b4w_collision_id");
        }

        if (!("b4w_viewport_alignment" in bpy_obj)) {
            bpy_obj["b4w_viewport_alignment"] = null;
            report("object", bpy_obj, "b4w_viewport_alignment");
        }

        if (!("pinverse_tsr" in bpy_obj)) {
            bpy_obj["pinverse_tsr"] = null;
            report("object", bpy_obj, "pinverse_tsr");
        }

        if (!("b4w_cluster_data" in bpy_obj)) {
            bpy_obj["b4w_cluster_data"] = { "cluster_id": -1 };
            report("object", bpy_obj, "b4w_cluster_data");
        }

        if (check_negative_scale(bpy_obj))
            report_raw("negative scale for object \"" + bpy_obj["name"] + "\", can lead to some errors");

        if (!check_uniform_scale(bpy_obj))
            report_raw("non-uniform scale for object " + bpy_obj["name"]);
    }

    if (_unreported_compat_issues)
        m_print.error("Compatibility issues detected");

    for (var param in _params_reported) {
        var param_data = _params_reported[param];
        var param_name = param.match(/.*?(?=>>|$)/i)[0]
        m_print.warn("Property \"" + String(param_name) +
            "\" is " + param_data.report_type + " for \"" + param_data.type +
             "\". To fix this, reexport " + bpy_data["b4w_filepath_blend"]);
    }
}

function check_strip_props(animation_data) {

    var nla_tracks = animation_data["nla_tracks"];
    if (nla_tracks)
        for (var j = 0; j < nla_tracks.length; j++) {
            var track = nla_tracks[j];
            for (var k = 0; k < track["strips"].length; k++) {
                var strip = track["strips"][k];
                if (!("action" in strip)) {
                    strip["action"] = null;
                    report("strip", strip, "action");
                }
                if (!("action_frame_start" in strip)) {
                    strip["action_frame_start"] = 0;
                    report("strip", strip, "action_frame_start");
                }
                if (!("action_frame_end" in strip)) {
                    strip["action_frame_end"] = strip["frame_end"] - strip["frame_start"];
                    report("strip", strip, "action_frame_end");
                }

                if (!("repeat" in strip)) {
                    strip["repeat"] = 1;
                    report("strip", strip, "repeat");
                }
                if (!("use_reverse" in strip)) {
                    strip["use_reverse"] = false;
                    report("strip", strip, "use_reverse");
                }
                if (!("scale" in strip)) {
                    strip["scale"] = 1;
                    report("strip", strip, "scale");
                }
            }
        }
}

function check_export_props(bpy_obj) {
    var export_props = ["b4w_apply_scale", "b4w_apply_modifiers", 
            "b4w_export_edited_normals", "b4w_loc_export_vertex_anim", 
            "b4w_shape_keys"];
    var prop_found = null;
    for (var i = 0; i < export_props.length; i++) {
        if (bpy_obj[export_props[i]])
            if(!prop_found)
                prop_found = export_props[i];
            else {
                bpy_obj[export_props[i]] = false;
                m_print.warn("WARNING property \"" + export_props[i] + "\" of object \"" 
                    + bpy_obj["name"] + "\" has been set to \"false\". Foreground property \""
                    + prop_found + "\" already exists.");
            }
    }
}

function check_collision_bounds_type(bpy_obj) {
    var game = bpy_obj["game"];
    var bounds_type = game["collision_bounds_type"];
    if (game["use_collision_bounds"] && bounds_type != "BOX"
            && bounds_type != "CYLINDER" && bounds_type != "CONE"
            && bounds_type != "SPHERE" && bounds_type != "CAPSULE"
            && bounds_type != "EMPTY") {
        m_print.error("Wrong collision bounds type " + bounds_type +
                ". Disable physics for object " + bpy_obj["name"]);
        bpy_obj["b4w_collision"] = false;
        bpy_obj["b4w_floating"] = false;
        bpy_obj["b4w_vehicle"] = false;
        bpy_obj["b4w_character"] = false;
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
function report(type, bpy_datablock, missing_param) {

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

    _params_reported[param_id].storage.push(bpy_datablock["name"]);
}
/**
 * Report about missing datablock.
 */
function report_missing_datablock(type, file_path_blend) {
    if (!REPORT_COMPATIBILITY_ISSUES) {
        _unreported_compat_issues = true;
        return;
    }

    m_print.warn("WARNING " + "Datablock " + type + " is missing, reexport \"" +
                file_path_blend + "\" scene");
}
/**
 * Report about deprecated datablock
 */
function report_deprecated(type, bpy_datablock, deprecated_param) {
    if (!REPORT_COMPATIBILITY_ISSUES) {
        _unreported_compat_issues = true;
        return;
    }

    var param_id = deprecated_param+">>"+type;

    if (!(param_id in _params_reported)) {
        _params_reported[param_id] = {
            storage: [],
            report_type: "deprecated",
            type: type
        }
    }
    _params_reported[param_id].storage.push(bpy_datablock["name"]);
}
function report_modifier(type, bpy_obj, file_path_blend) {
    if (!REPORT_COMPATIBILITY_ISSUES) {
        _unreported_compat_issues = true;
        return;
    }

    m_print.error("WARNING " + "Incomplete modifier " + String(type) + " for " +
            "\"" + bpy_obj["name"] + "\"" + ", reexport \"" +
            file_path_blend + "\" scene");

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

function check_uniform_scale(bpy_obj) {
    var scale = bpy_obj["scale"];
    var eps = 0.005

    if (scale[0] == 0 && scale[1] == 0 && scale[2] == 0)
        return true;

    var delta1 = Math.abs((scale[0] - scale[1]) / scale[0]);
    var delta2 = Math.abs((scale[1] - scale[2]) / scale[1]);

    return (delta1 < eps && delta2 < eps);
}

function check_negative_scale(bpy_obj) {
    return bpy_obj["scale"][0] < 0 || bpy_obj["scale"][1] < 0 || bpy_obj["scale"][2] < 0;
}

exports.check_anim_fcurve_completeness = function(fcurve, action) {
    if (!("num_channels" in fcurve)) {
        fcurve["num_channels"] = 1;
        report_raw("B4W Warning: no channels number in animation fcurve for \"" +
                   action["name"] + "\" action, reexport scene");
    }
}

/**
 * Apply modifiers for mesh object and return new mesh.
 */
exports.apply_mesh_modifiers = function(bpy_obj) {
    if (!has_modifiers(bpy_obj))
        return null;

    var mesh = mesh_copy(bpy_obj["data"], bpy_obj["data"]["name"] + "_MOD");
    var modifiers = bpy_obj["modifiers"];
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
function has_modifiers(bpy_obj) {
    var modifiers = bpy_obj["modifiers"];
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
    var bpy_obj = mod["object"];
    var spline = m_curve.create_spline(bpy_obj);

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
        var tbn_quat = submesh["tbn_quat"];

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

            if (tbn_quat.length) {
                _quat_tmp[0] = tbn_quat[4*j];
                _quat_tmp[1] = tbn_quat[4*j+1];
                _quat_tmp[2] = tbn_quat[4*j+2];
                _quat_tmp[3] = tbn_quat[4*j+3];

                m_quat.multiply(_quat_tmp, quat, _quat_tmp);

                tbn_quat[4*j] = _quat_tmp[0];
                tbn_quat[4*j+1] = _quat_tmp[1];
                tbn_quat[4*j+2] = _quat_tmp[2];
                tbn_quat[4*j+3] = _quat_tmp[3];
            }
        }
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
        m_util.panic("Wrong deform axis value " + deform_axis);
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
        "uuid": m_util.gen_uuid(),

        "use_nodes": false,
        "diffuse_shader": "LAMBERT",
        "diffuse_color": [0.8, 0.8, 0.8],
        "diffuse_intensity": 0.8,
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
        "specular_alpha": 1,
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
        "b4w_refr_bump": 0,
        "b4w_refractive": false,
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
        "b4w_water_enable_caust": false,
        "b4w_water_caust_scale": 0.25,
        "b4w_water_caust_brightness": 0.5,
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
            if (prop == "base_length" || prop == "boundings")
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
    var mat3 = m_mat3.fromMat4(matrix, _mat3_tmp);
    var quat = m_quat.fromMat3(mat3, _quat_tmp);

    for (var i = 0; i < mesh["submeshes"].length; i++) {
        var submesh = mesh["submeshes"][i];

        m_util.positions_multiply_matrix(submesh["position"], matrix,
                submesh["position"], 0);
        m_util.quats_multiply_quat(submesh["tbn_quat"], quat,
                submesh["tbn_quat"], 0);
    }
}

/**
 * Rewrite object params according to Logic script.
 * Not the best place to do such things, but other methods are much harder to
 * implement (see update_object())
 */
exports.assign_logic_nodes_object_params = function(bpy_objects, bpy_world, scene) {

    function set_bpy_objs_props(objects_paths, props) {
        for (var id in objects_paths) {
            var path = objects_paths[id];
            var name = path[0];
            if (path.length > 1)
                for (var k = 1; k < path.length; k++)
                    name += "*" + path[k];
            for (var k = 0; k < bpy_objects.length; k++) {
                var bpy_obj = bpy_objects[k];
                if (bpy_obj["name"] == name) {
                    for (var key in props) {
                        bpy_obj[key] = props[key];
                    }
                }
            }
        }
    }

    var script = scene["b4w_logic_nodes"];
    for (var i = 0; i < script.length; i++) {
        var subtree = script[i];
        for (var j = 0; j < subtree.length; j++) {
            var snode = subtree[j];
            var rename = {
                "register1":"variable1",
                "register2":"variable2",
                "registerd":"variabled"
            }
            for (var key in rename) {
                if (key in snode)
                    snode[rename[key]] = snode[key]
            }
            // add scope for variables
            for (var v in snode["variables"]) {
                if (typeof(snode["variables"][v][0]) != "boolean")
                    snode["variables"][v] = [false, snode["variables"][v]]
            }
            if (["MATH", "CONDJUMP", "PAGEPARAM", "REGSTORE"].indexOf(snode["type"]) >= 0) {
                if ("variable1" in snode)
                    snode["variables"]["v1"] = [false, snode["variable1"]];
                if ("variable2" in snode)
                    snode["variables"]["v2"] = [false, snode["variable2"]];
                if ("variabled" in snode)
                    snode["variables"]["vd"] = [false, snode["variabled"]];
            }
            switch (snode["type"]) {
            case "SELECT":
                for (var k = 0; k < bpy_objects.length; k++) {
                    var bpy_obj = bpy_objects[k];
                    if (bpy_obj["name"] == snode["object"])
                        bpy_obj["b4w_selectable"] = true;
                }
                if (!snode["bools"])
                    snode["bools"] = {}
                if (!snode["bools"]["not_wait"])
                    snode["bools"]["not_wait"] = false
                report_raw("Logic nodes type \"SELECT\" is deprecated");
                break;
            case "SWITCH_SELECT":
                set_bpy_objs_props(snode["objects_paths"], {"b4w_selectable": true});
                if (snode["links"] instanceof Array) {
                    report_raw("Format of a \"SWITCH_SELECT\" node is outdated. " +
                    "It is recommended to reexport the scene \"" + scene.name+"\"");
                    var links = {};
                    var kk = 0;
                    for (k in snode["objects_paths"]) {
                        links[k] = snode["links"][kk];
                        kk++;
                    }
                    snode["links"] = links;
                }
                break;
            case "SELECT_PLAY":
                report_raw("Logic nodes type \"SELECT_PLAY\" is deprecated, " +
                "node will be muted. To fix this, reexport the scene \"" + scene.name+"\"");
                snode["mute"] = true;
                break;
            case "SELECT_PLAY_ANIM":
                report_raw("Logic nodes type \"SELECT_PLAY_ANIM\" is deprecated");
                break;    
            case "SHOW":
            case "HIDE":
            case "SET_SHADER_NODE_PARAM":
            case "INHERIT_MAT":
                set_bpy_objs_props(snode["objects_paths"], {"b4w_do_not_batch": true});
                break;
            case "PLAY":
                scene["b4w_use_nla"] = true;
                break;
            case "MOVE_TO":
                set_bpy_objs_props(snode["objects_paths"], {"b4w_do_not_batch": true});
                break;
            case "TRANSFORM_OBJECT":
                set_bpy_objs_props(snode["objects_paths"], {"b4w_do_not_batch": true});

                switch(snode["common_usage_names"]["space_type"]){
                case "WORLD":
                    snode["common_usage_names"]["space_type"] = m_logn.NST_WORLD;
                    break;
                case "PARENT":
                    snode["common_usage_names"]["space_type"] = m_logn.NST_PARENT;
                    break;
                case "LOCAL":
                    snode["common_usage_names"]["space_type"] = m_logn.NST_LOCAL;
                    break;
                }
                break;
            case "OUTLINE":
                set_bpy_objs_props(snode["objects_paths"], {"b4w_outlining": true});
                break;
            case "CONDJUMP":
                if (snode["condition"])
                    snode["common_usage_names"]["condition"] = snode["condition"];

                if ("cnd" in snode["floats"])
                    snode["common_usage_names"]["condition"] = snode["floats"]["cnd"];
                else {
                    switch(snode["common_usage_names"]["condition"]){
                    case "GEQUAL":
                        snode["common_usage_names"]["condition"] = m_logn.NC_GEQUAL;
                        break;
                    case "LEQUAL":
                        snode["common_usage_names"]["condition"] = m_logn.NC_LEQUAL;
                        break;
                    case "GREATER":
                        snode["common_usage_names"]["condition"] = m_logn.NC_GREATER;
                        break;
                    case "LESS":
                        snode["common_usage_names"]["condition"] = m_logn.NC_LESS;
                        break;
                    case "NOTEQUAL":
                        snode["common_usage_names"]["condition"] = m_logn.NC_NOTEQUAL;
                        break;
                    case "EQUAL":
                        snode["common_usage_names"]["condition"] = m_logn.NC_EQUAL;
                        break;
                    }
                }
                if (snode["number1"] != undefined)
                    snode["input1"] = snode["number1"];
                if (snode["number2"] != undefined)
                    snode["input2"] = snode["number2"];
                if (!snode["bools"])
                        snode["bools"] = {};
                if (snode["bools"]["str"] === undefined) {
                    snode["bools"]["str"] = false;
                    snode["floats"]["inp1"] = snode["input1"];
                    snode["floats"]["inp2"] = snode["input2"];
                }
                break;
            case "SEND_REQ":
                if (!snode["bools"])
                    snode["bools"] = {};
                if (!snode["strings"])
                    snode["strings"] = {};

                if (snode["bools"]["ct"] === undefined)
                    snode["bools"]["ct"] = false;
                if (snode["url"] != undefined) {
                    snode["bools"]["url"] = false;
                    snode["strings"]["url"] = snode["url"];
                }

                break;
            case "MATH":
                if (snode["number1"] != undefined)
                    snode["input1"] = snode["number1"];
                if (snode["number2"] != undefined)
                    snode["input2"] = snode["number2"];
                if (snode["input1"] != undefined)
                    snode["floats"]["inp1"] = snode["input1"];
                if (snode["input2"] != undefined)
                    snode["floats"]["inp2"] = snode["input2"];
                break;
            case "REGSTORE":
                if (!snode["floats"])
                        snode["floats"] = {};
                if (!snode["strings"])
                        snode["strings"] = {};

                if (snode["number1"] != undefined)
                    snode["input1"] = snode["number1"];
                if (snode["input1"] != undefined)
                    switch (typeof(snode["input1"])) {
                    case "number":
                        snode["floats"]["inp1"] = snode["input1"];
                        snode["common_usage_names"]["variable_type"] = "NUMBER";
                        break;
                    default:
                        snode["strings"]["inp1"] = snode["input1"];
                        snode["common_usage_names"]["variable_type"] = "STRING";
                    }

                switch(snode["common_usage_names"]["variable_type"]) {
                case "NUMBER":
                    snode["common_usage_names"]["variable_type"] = m_logn.NT_NUMBER;
                    break;
                case "STRING":
                    snode["common_usage_names"]["variable_type"] = m_logn.NT_STRING;
                    break;
                }

                break;
            case "PAGEPARAM":
                if (!snode["bools"])
                    snode["bools"] = {};
                if (snode["bools"]["hsh"] === undefined)
                    snode["bools"]["hsh"] = false;

                if (!snode["floats"])
                    snode["floats"] = {};
                if (snode["floats"]["ptp"] === undefined)
                    snode["floats"]["ptp"] = 0;
                break;
            case "PLAY_ANIM":
                set_bpy_objs_props(snode["objects_paths"], {"b4w_do_not_batch": true});
                if (!snode["bools"])
                    snode["bools"] = {};
                if (snode["bools"]["env"] === undefined)
                    snode["bools"]["env"] = false;

                var behavior = snode["common_usage_names"]["param_anim_behavior"];
                if(!behavior)
                     behavior = "FINISH_STOP";
                snode["common_usage_names"]["param_anim_behavior"] = m_anim.anim_behavior_bpy_b4w(behavior);
                break;
            case "STOP_ANIM":
                if (!snode["bools"])
                    snode["bools"] = {};
                if (snode["bools"]["env"] === undefined)
                    snode["bools"]["env"] = false;
                break;
            case "STRING":
                switch(snode["common_usage_names"]["string_operation"]){
                case "JOIN":
                    snode["common_usage_names"]["string_operation"] = m_logn.NSO_JOIN;
                    break;
                case "FIND":
                    snode["common_usage_names"]["string_operation"] = m_logn.NSO_FIND;
                    break;
                case "REPLACE":
                    snode["common_usage_names"]["string_operation"] = m_logn.NSO_REPLACE;
                    break;
                case "SPLIT":
                    snode["common_usage_names"]["string_operation"] = m_logn.NSO_SPLIT;
                    break;
                case "COMPARE":
                    snode["common_usage_names"]["string_operation"] = m_logn.NSO_COMPARE;
                    break;
                }

                if ("cnd" in snode["floats"])
                    snode["common_usage_names"]["condition"] = snode["floats"]["cnd"];
                else {
                    switch(snode["common_usage_names"]["condition"]){
                    case "GEQUAL":
                        snode["common_usage_names"]["condition"] = m_logn.NC_GEQUAL;
                        break;
                    case "LEQUAL":
                        snode["common_usage_names"]["condition"] = m_logn.NC_LEQUAL;
                        break;
                    case "GREATER":
                        snode["common_usage_names"]["condition"] = m_logn.NC_GREATER;
                        break;
                    case "LESS":
                        snode["common_usage_names"]["condition"] = m_logn.NC_LESS;
                        break;
                    case "NOTEQUAL":
                        snode["common_usage_names"]["condition"] = m_logn.NC_NOTEQUAL;
                        break;
                    case "EQUAL":
                        snode["common_usage_names"]["condition"] = m_logn.NC_EQUAL;
                        break;
                    }
                }

                break;
            case "REDIRECT":
                if (snode["url"] != undefined) {
                    snode["bools"]["url"] = false;
                    snode["strings"]["url"] = snode["url"];
                }
                break;
            case "SET_CAMERA_MOVE_STYLE":
                switch(snode["common_usage_names"]["camera_move_style"]){
                case "STATIC":
                    snode["common_usage_names"]["camera_move_style"] = m_logn.NCMS_STATIC;
                    break;
                case "TARGET":
                    snode["common_usage_names"]["camera_move_style"] = m_logn.NCMS_TARGET;
                    break;
                case "EYE":
                    snode["common_usage_names"]["camera_move_style"] = m_logn.NCMS_EYE;
                    break;
                case "HOVER":
                    snode["common_usage_names"]["camera_move_style"] = m_logn.NCMS_HOVER;
                    break;
                }
                break;
            case "ENTRYPOINT":
                if (!snode["bools"])
                    snode["bools"] = {};
                if (snode["bools"]["js"] === undefined)
                    snode["bools"]["js"] = false;

                if (snode["bools"]["js"])
                    snode["mute"] = true;
                break;
            case "JS_CALLBACK":
                var cb_params_dict = snode["common_usage_names"]["js_cb_params"];
                for (var key in cb_params_dict)
                    switch(cb_params_dict[key]) {
                        case "OBJECT":
                            cb_params_dict[key] = m_logn.NCPT_OBJECT;
                            break;
                        case "VARIABLE":
                            cb_params_dict[key] = m_logn.NCPT_VARIABLE;
                            break;
                    }
                break;
            }
        }
    }
}

}
