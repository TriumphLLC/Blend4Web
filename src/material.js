/**
 * Copyright (C) 2014-2017 Triumph LLC
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
 * Material internal API.
 * @name material
 * @namespace
 * @exports exports as material
 */
b4w.module["__material"] = function(exports, require) {

var m_util = require("__util");

exports.init_material = init_material;
function init_material() {
    var mat = {

        name: "",
        type: "",
        uuid: "",

        use_nodes: false,
        node_tree: null,

        texture_slots: [],

        blend_mode: "",

        use_shadeless: false,
        use_transparency: false,
        use_backface_culling: false,
        use_tangent_shading: false,
        use_orco_tex_coord: false,
        use_vertex_color_paint: false,
        use_double_sided_lighting: false,

        do_not_render: false,
        render_above_all: false,

        is_lens_flares: false,
        is_wettable: false,
        is_refractive: false,
        refr_bump: 0,
        
        pass_index: 0,
        offset_z: 0,


        diffuse_shader: "",
        diffuse_color: new Float32Array(3),
        diffuse_intensity: 0,
        diffuse_toon_size: 0,
        diffuse_toon_smooth: 0,
        roughness: 0,
        diffuse_fresnel: 0,
        diffuse_fresnel_factor: 0,
        darkness: 0,
        alpha: 0,

        specular_shader: "",
        specular_color: new Float32Array(3),
        specular_intensity: 0,
        specular_toon_size: 0,
        specular_toon_smooth: 0,
        specular_hardness: 0,
        specular_ior: 0,
        specular_slope: 0,
        specular_alpha: 0,

        emit: 0,
        ambient: 0,

        water_settings: {
            is_water: false,

            shore_smoothing: false,
            absorb_factor: 0,
            foam_factor: 0,

            shallow_col: new Float32Array(3),
            shore_col: new Float32Array(3),
            shallow_col_fac: 0,
            shore_col_fac: 0,

            fog_color: new Float32Array(3),
            fog_density: 0,

            sss_strength: 0,
            sss_width: 0,
            norm_uv_velocity: 0,

            // dynamic water surface settings
            is_dynamic: false,
            waves_height: 0,
            waves_length: 0,
            dst_noise_scale0: 0,
            dst_noise_scale1: 0,
            dst_noise_freq0: 0,
            dst_noise_freq1: 0,
            dir_min_shore_fac: 0,
            dir_freq: 0,
            dir_noise_scale: 0,
            dir_noise_freq: 0,
            dir_min_noise_fac: 0,
            dst_min_fac: 0,
            waves_hor_fac: 0,

            // generated mesh settings
            is_generated_mesh: false,
            num_cascads: 0,
            num_subdivs: 0,
            detailed_dist: 0,

            // caustics settings
            enable_caust: false,
            caust_scale: 0,
            caust_brightness: 0
        },

        terrain_settings: {
            is_terrain: false,
            dynamic_grass_size: "",
            dynamic_grass_color: ""
        },

        raytrace_mirror: {
            reflect_factor: 0,
            fresnel: 0,
            fresnel_factor: 0
        },

        halo_settings: {
            size: 0,
            hardness: 0,
                        
            rings_color: new Float32Array(3),
            lines_color: new Float32Array(3),
            ring_count: 0,
            line_count: 0,
            star_tip_count: 0,

            is_sky_stars: false,
            stars_blend_height: 0,
            stars_min_height: 0
        },

        physics_settings: {
            use_coll_physics: false,
            use_ghost: false,

            friction: 0,
            elasticity: 0,
            collision_id: "",
            collision_margin: 0,
            collision_group: 0,
            collision_mask: 0
        }
    }

    return mat;
}

exports.create_default = function() {
    var mat = init_material();

    mat.name = "DEFAULT";
    mat.type = "SURFACE";
    mat.uuid = m_util.gen_uuid();

    mat.use_nodes = false;
    mat.node_tree = null;

    mat.texture_slots = [];

    mat.blend_mode = "OPAQUE";
    mat.use_shadeless = false;
    mat.use_transparency = false;
    mat.use_backface_culling = true;
    mat.use_vertex_color_paint = false;
    mat.use_double_sided_lighting = false;

    mat.render_above_all = false;

    mat.is_refractive = false;
    mat.refr_bump = 0;

    mat.pass_index = 0;
    mat.offset_z = 0;

    mat.diffuse_shader = "LAMBERT";
    mat.diffuse_color.set([0.8, 0.8, 0.8]);
    mat.diffuse_intensity = 0.8;
    mat.alpha = 1.0;

    mat.specular_shader = "COOKTORR";
    mat.specular_color.set([1, 1, 1]);
    mat.specular_intensity = 0.5;
    mat.specular_hardness = 50;
    mat.specular_alpha = 1;

    mat.emit = 0;
    mat.ambient = 1.0;

    mat.water_settings.is_water = false;

    mat.terrain_settings.is_terrain = false;

    mat.raytrace_mirror.reflect_factor = 0;
    mat.raytrace_mirror.fresnel = 0;
    mat.raytrace_mirror.fresnel_factor = 1.25;

    mat.physics_settings.use_coll_physics = false;

    return mat;
}

exports.update_material = function(bpy_mat, mat) {

    mat.name = bpy_mat["name"];
    mat.type = bpy_mat["type"];
    mat.uuid = bpy_mat["uuid"];

    mat.use_nodes = bpy_mat["use_nodes"];
    mat.node_tree = bpy_mat["node_tree"];

    mat.texture_slots = bpy_mat["texture_slots"];

    mat.blend_mode = bpy_mat["game_settings"]["alpha_blend"];
    mat.use_shadeless = bpy_mat["use_shadeless"];
    mat.use_transparency = bpy_mat["use_transparency"];
    mat.use_backface_culling = bpy_mat["game_settings"]["use_backface_culling"];
    mat.use_tangent_shading = bpy_mat["use_tangent_shading"];
    mat.use_orco_tex_coord = bpy_mat["use_orco_tex_coord"];
    mat.use_vertex_color_paint = bpy_mat["use_vertex_color_paint"];
    mat.use_double_sided_lighting = bpy_mat["b4w_double_sided_lighting"];

    mat.do_not_render = bpy_mat["b4w_do_not_render"];
    mat.render_above_all = bpy_mat["b4w_render_above_all"];

    mat.is_lens_flares = bpy_mat["b4w_lens_flares"];
    mat.is_wettable = bpy_mat["b4w_wettable"];
    mat.is_refractive = bpy_mat["b4w_refractive"];
    mat.refr_bump = bpy_mat["b4w_refr_bump"];
        
    mat.pass_index = bpy_mat["pass_index"];
    mat.offset_z = bpy_mat["offset_z"];

    mat.diffuse_shader = bpy_mat["diffuse_shader"];
    mat.diffuse_color.set(bpy_mat["diffuse_color"]);
    mat.diffuse_intensity = bpy_mat["diffuse_intensity"];
    mat.diffuse_toon_size = bpy_mat["diffuse_toon_size"];
    mat.diffuse_toon_smooth = bpy_mat["diffuse_toon_smooth"];
    mat.roughness = bpy_mat["roughness"];
    mat.diffuse_fresnel = bpy_mat["diffuse_fresnel"];
    mat.diffuse_fresnel_factor = bpy_mat["diffuse_fresnel_factor"];
    mat.darkness = bpy_mat["darkness"];
    mat.alpha = bpy_mat["alpha"];

    mat.specular_shader = bpy_mat["specular_shader"];
    mat.specular_color.set(bpy_mat["specular_color"]);
    mat.specular_intensity = bpy_mat["specular_intensity"];
    mat.specular_toon_size = bpy_mat["specular_toon_size"];
    mat.specular_toon_smooth = bpy_mat["specular_toon_smooth"];
    mat.specular_hardness = bpy_mat["specular_hardness"];
    mat.specular_ior = bpy_mat["specular_ior"];
    mat.specular_slope = bpy_mat["specular_slope"];
    mat.specular_alpha = bpy_mat["specular_alpha"];

    mat.emit = bpy_mat["emit"];
    mat.ambient = bpy_mat["ambient"];

    var ws = mat.water_settings;
    ws.is_water = bpy_mat["b4w_water"];

    ws.shore_smoothing = bpy_mat["b4w_water_shore_smoothing"];
    ws.absorb_factor = bpy_mat["b4w_water_absorb_factor"];
    ws.foam_factor = bpy_mat["b4w_foam_factor"];

    ws.shallow_col.set(bpy_mat["b4w_shallow_water_col"]);
    ws.shore_col.set(bpy_mat["b4w_shore_water_col"]);
    ws.shallow_col_fac = bpy_mat["b4w_shallow_water_col_fac"];
    ws.shore_col_fac = bpy_mat["b4w_shore_water_col_fac"];

    ws.fog_color.set(bpy_mat["b4w_water_fog_color"]);
    ws.fog_density = bpy_mat["b4w_water_fog_density"];

    ws.sss_strength = bpy_mat["b4w_water_sss_strength"];
    ws.sss_width = bpy_mat["b4w_water_sss_width"];
    ws.norm_uv_velocity = bpy_mat["b4w_water_norm_uv_velocity"];

    // dynamic water surface settings
    ws.is_dynamic = bpy_mat["b4w_water_dynamic"];
    ws.waves_height = bpy_mat["b4w_waves_height"];
    ws.waves_length = bpy_mat["b4w_waves_length"];
    ws.dst_noise_scale0 = bpy_mat["b4w_water_dst_noise_scale0"];
    ws.dst_noise_scale1 = bpy_mat["b4w_water_dst_noise_scale1"];
    ws.dst_noise_freq0 = bpy_mat["b4w_water_dst_noise_freq0"];
    ws.dst_noise_freq1 = bpy_mat["b4w_water_dst_noise_freq1"];
    ws.dir_min_shore_fac = bpy_mat["b4w_water_dir_min_shore_fac"];
    ws.dir_freq = bpy_mat["b4w_water_dir_freq"];
    ws.dir_noise_scale = bpy_mat["b4w_water_dir_noise_scale"];
    ws.dir_noise_freq = bpy_mat["b4w_water_dir_noise_freq"];
    ws.dir_min_noise_fac = bpy_mat["b4w_water_dir_min_noise_fac"];
    ws.dst_min_fac = bpy_mat["b4w_water_dst_min_fac"];
    ws.waves_hor_fac = bpy_mat["b4w_water_waves_hor_fac"];

    // generated mesh settings
    ws.is_generated_mesh = bpy_mat["b4w_generated_mesh"];
    ws.num_cascads = bpy_mat["b4w_water_num_cascads"];
    ws.num_subdivs = bpy_mat["b4w_water_subdivs"];
    ws.detailed_dist = bpy_mat["b4w_water_detailed_dist"];

    // caustics settings
    ws.enable_caust = bpy_mat["b4w_water_enable_caust"];
    ws.caust_scale = bpy_mat["b4w_water_caust_scale"];
    ws.caust_brightness = bpy_mat["b4w_water_caust_brightness"];

    var ts = mat.terrain_settings;
    ts.is_terrain = bpy_mat["b4w_terrain"];
    ts.dynamic_grass_size = bpy_mat["b4w_dynamic_grass_size"];
    ts.dynamic_grass_color = bpy_mat["b4w_dynamic_grass_color"];

    var rm = mat.raytrace_mirror;
    rm.reflect_factor = bpy_mat["raytrace_mirror"]["reflect_factor"];
    rm.fresnel = bpy_mat["raytrace_mirror"]["fresnel"];
    rm.fresnel_factor = bpy_mat["raytrace_mirror"]["fresnel_factor"];

    var hs = mat.halo_settings;
    hs.size = bpy_mat["halo"]["size"];
    hs.hardness = bpy_mat["halo"]["hardness"];
                        
    hs.rings_color.set(bpy_mat["halo"]["b4w_halo_rings_color"]);
    hs.lines_color.set(bpy_mat["halo"]["b4w_halo_lines_color"]);
    hs.ring_count = bpy_mat["halo"]["ring_count"];
    hs.line_count = bpy_mat["halo"]["line_count"];
    hs.star_tip_count = bpy_mat["halo"]["star_tip_count"];

    hs.is_sky_stars = bpy_mat["b4w_halo_sky_stars"];
    hs.stars_blend_height = bpy_mat["b4w_halo_stars_blend_height"];
    hs.stars_min_height = bpy_mat["b4w_halo_stars_min_height"];

    var ps = mat.physics_settings;
    ps.use_coll_physics = bpy_mat["b4w_collision"];
    ps.use_ghost = bpy_mat["b4w_use_ghost"];

    ps.friction = bpy_mat["physics"]["friction"];
    ps.elasticity = bpy_mat["physics"]["elasticity"];
    ps.collision_id = bpy_mat["b4w_collision_id"];
    ps.collision_margin = bpy_mat["b4w_collision_margin"];
    ps.collision_group = bpy_mat["b4w_collision_group"];
    ps.collision_mask = bpy_mat["b4w_collision_mask"];
}

exports.clone_material = function(mat) {

    var new_mat = mat;

    new_mat.name = mat.name;
    new_mat.type = mat.type;
    new_mat.uuid = mat.uuid; // need unique?

    new_mat.use_nodes = mat.use_nodes;

    // by link for now, raw bpy data anyway
    new_mat.node_tree = mat.node_tree;
    // by link for now, raw bpy data anyway
    new_mat.texture_slots = mat.texture_slots.slice();

    new_mat.blend_mode = mat.blend_mode;

    new_mat.use_shadeless = mat.use_shadeless;
    new_mat.use_transparency = mat.use_transparency;
    new_mat.use_backface_culling = mat.use_backface_culling;
    new_mat.use_tangent_shading = mat.use_tangent_shading;
    new_mat.use_orco_tex_coord = mat.use_orco_tex_coord;
    new_mat.use_vertex_color_paint = mat.use_vertex_color_paint;
    new_mat.use_double_sided_lighting = mat.use_double_sided_lighting;

    new_mat.do_not_render = mat.do_not_render;
    new_mat.render_above_all = mat.render_above_all;

    new_mat.is_lens_flares = mat.is_lens_flares;
    new_mat.is_wettable = mat.is_wettable;
    new_mat.is_refractive = mat.is_refractive;
    new_mat.refr_bump = mat.refr_bump;
        
    new_mat.pass_index = mat.pass_index;
    new_mat.offset_z = mat.offset_z;

    new_mat.diffuse_shader = mat.diffuse_shader;
    new_mat.diffuse_color.set(mat.diffuse_color);
    new_mat.diffuse_intensity = mat.diffuse_intensity;
    new_mat.diffuse_toon_size = mat.diffuse_toon_size;
    new_mat.diffuse_toon_smooth = mat.diffuse_toon_smooth;
    new_mat.roughness = mat.roughness;
    new_mat.diffuse_fresnel = mat.diffuse_fresnel;
    new_mat.diffuse_fresnel_factor = mat.diffuse_fresnel_factor;
    new_mat.darkness = mat.darkness;
    new_mat.alpha = mat.alpha;

    new_mat.specular_shader = mat.specular_shader;
    new_mat.specular_color.set(mat.specular_color);
    new_mat.specular_intensity = mat.specular_intensity;
    new_mat.specular_toon_size = mat.specular_toon_size;
    new_mat.specular_toon_smooth = mat.specular_toon_smooth;
    new_mat.specular_hardness = mat.specular_hardness;
    new_mat.specular_ior = mat.specular_ior;
    new_mat.specular_slope = mat.specular_slope;
    new_mat.specular_alpha = mat.specular_alpha;

    new_mat.emit = mat.emit;
    new_mat.ambient = mat.ambient;

    var wp = mat.water_settings;
    var new_wp = new_mat.water_settings;

    new_wp.is_water = wp.is_water;

    new_wp.shore_smoothing = wp.shore_smoothing;
    new_wp.absorb_factor = wp.absorb_factor;
    new_wp.foam_factor = wp.foam_factor;

    new_wp.shallow_col.set(wp.shallow_col);
    new_wp.shore_col.set(wp.shore_col);
    new_wp.shallow_col_fac = wp.shallow_col_fac;
    new_wp.shore_col_fac = wp.shore_col_fac;

    new_wp.fog_color = wp.fog_color;
    new_wp.fog_density = wp.fog_density;

    new_wp.sss_strength = wp.sss_strength;
    new_wp.sss_width = wp.sss_width;
    new_wp.norm_uv_velocity = wp.norm_uv_velocity;

    // dynamic water surface settings
    new_wp.is_dynamic = wp.is_dynamic;
    new_wp.waves_height = wp.waves_height;
    new_wp.waves_length = wp.waves_length;
    new_wp.dst_noise_scale0 = wp.dst_noise_scale0;
    new_wp.dst_noise_scale1 = wp.dst_noise_scale1;
    new_wp.dst_noise_freq0 = wp.dst_noise_freq0;
    new_wp.dst_noise_freq1 = wp.dst_noise_freq1;
    new_wp.dir_min_shore_fac = wp.dir_min_shore_fac;
    new_wp.dir_freq = wp.dir_freq;
    new_wp.dir_noise_scale = wp.dir_noise_scale;
    new_wp.dir_noise_freq = wp.dir_noise_freq;
    new_wp.dir_min_noise_fac = wp.dir_min_noise_fac;
    new_wp.dst_min_fac = wp.dst_min_fac;
    new_wp.waves_hor_fac = wp.waves_hor_fac;

    // generated mesh settings
    new_wp.is_generated_mesh = wp.is_generated_mesh;
    new_wp.num_cascads = wp.num_cascads;
    new_wp.num_subdivs = wp.num_subdivs;
    new_wp.detailed_dist = wp.detailed_dist;

    // caustics settings
    new_wp.enable_caust = wp.enable_caust;
    new_wp.caust_scale = wp.caust_scale;
    new_wp.caust_brightness = wp.caust_brightness;

    var ts = mat.terrain_settings;
    var new_ts = new_mat.terrain_settings;
    new_ts.is_terrain = ts.is_terrain;
    new_ts.dynamic_grass_size = ts.dynamic_grass_size;
    new_ts.dynamic_grass_color = ts.dynamic_grass_color;

    var rt = mat.raytrace_mirror;
    var new_rt = new_mat.raytrace_mirror;
    new_rt.reflect_factor = rt.reflect_factor;
    new_rt.fresnel = rt.fresnel;
    new_rt.fresnel_factor = rt.fresnel_factor;

    var hs = mat.halo_settings;
    var new_hs = new_mat.halo_settings;
    new_hs.size = hs.size;
    new_hs.hardness = hs.hardness;
                
    new_hs.rings_color.set(hs.rings_color);
    new_hs.lines_color.set(hs.lines_color);
    new_hs.ring_count = hs.ring_count;
    new_hs.line_count = hs.line_count;
    new_hs.star_tip_count = hs.star_tip_count;

    new_hs.is_sky_stars = hs.is_sky_stars;
    new_hs.stars_blend_height = hs.stars_blend_height;
    new_hs.stars_min_height = hs.stars_min_height;
        
    var ps = mat.physics_settings;
    var new_ps = new_mat.physics_settings;
    new_ps.use_coll_physics = ps.use_coll_physics;
    new_ps.use_ghost = ps.use_ghost;

    new_ps.friction = ps.friction;
    new_ps.elasticity = ps.elasticity;
    new_ps.collision_id = ps.collision_id;
    new_ps.collision_margin = ps.collision_margin;
    new_ps.collision_group = ps.collision_group;
    new_ps.collision_mask = ps.collision_mask;
    
    return new_mat;
}

}