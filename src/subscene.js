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
 * Rendering graph routines.
 *
 * Rendering graph consists of rendering subscenes, which in turn may have
 * zero or more inputs and one or more outputs. All subscenes must be closed
 * to last SINK element. SINK element is a fictional subscene without any outputs.
 *
 * @name scenegraph
 * @namespace
 * @exports exports as scenegraph
 */
b4w.module["__subscene"] = function(exports, require) {

var m_cam      = require("__camera");
var m_cfg      = require("__config");
var m_util     = require("__util");
var m_bounds   = require("__boundings");

var cfg_out = m_cfg.outlining;

var MAIN_OPAQUE                         = 0;
var MAIN_BLEND                          = 1;
var MAIN_XRAY                           = 2;
var MAIN_PLANE_REFLECT                  = 3;
var MAIN_CUBE_REFLECT                   = 4;
var MAIN_PLANE_REFLECT_BLEND            = 5;
var MAIN_CUBE_REFLECT_BLEND             = 6;
var MAIN_GLOW                           = 7;
var SHADOW_CAST                         = 8;
var SHADOW_RECEIVE                      = 9;
var GRASS_MAP                           = 10;
var POSTPROCESSING                      = 11;
var GLOW_COMBINE                        = 13;
var RESOLVE                             = 14;
var COLOR_PICKING                       = 15;
var COLOR_PICKING_XRAY                  = 16;
var DEBUG_VIEW                          = 17;
var ANCHOR_VISIBILITY                   = 18;
var DEPTH_PACK                          = 19;
var SSAO                                = 20;
var SSAO_BLUR                           = 21;
var ANTIALIASING                        = 22;
var SMAA_BLENDING_WEIGHT_CALCULATION    = 23; 
var SMAA_EDGE_DETECTION                 = 24;
var SMAA_RESOLVE                        = 25;
var SMAA_NEIGHBORHOOD_BLENDING          = 26;
var COMPOSITING                         = 27;
var MOTION_BLUR                         = 28;
var COC                                 = 29;
var DOF                                 = 30;
var OUTLINE_MASK                        = 31;
var OUTLINE                             = 32;
var GOD_RAYS                            = 33;
var GOD_RAYS_COMBINE                    = 34;
var SKY                                 = 35;
var COPY                                = 36;
var STEREO                              = 37;
var LUMINANCE                           = 38;
var AVERAGE_LUMINANCE                   = 39;
var LUMINANCE_TRUNCED                   = 40;
var BLOOM                               = 41;
var VELOCITY                            = 42;
var SINK                                = 43;
var PERFORMANCE                         = 44;
var RESIZE                              = 45;

exports.MAIN_OPAQUE = MAIN_OPAQUE;
exports.MAIN_BLEND = MAIN_BLEND;
exports.MAIN_XRAY = MAIN_XRAY;
exports.MAIN_PLANE_REFLECT = MAIN_PLANE_REFLECT;
exports.MAIN_CUBE_REFLECT = MAIN_CUBE_REFLECT;
exports.MAIN_PLANE_REFLECT_BLEND = MAIN_PLANE_REFLECT_BLEND;
exports.MAIN_CUBE_REFLECT_BLEND = MAIN_CUBE_REFLECT_BLEND;
exports.MAIN_GLOW = MAIN_GLOW;
exports.SHADOW_CAST = SHADOW_CAST;
exports.SHADOW_RECEIVE = SHADOW_RECEIVE;
exports.GRASS_MAP = GRASS_MAP;
exports.POSTPROCESSING = POSTPROCESSING;
exports.GLOW_COMBINE = GLOW_COMBINE;
exports.RESOLVE = RESOLVE;
exports.COLOR_PICKING = COLOR_PICKING;
exports.COLOR_PICKING_XRAY = COLOR_PICKING_XRAY;
exports.DEBUG_VIEW = DEBUG_VIEW;
exports.ANCHOR_VISIBILITY = ANCHOR_VISIBILITY;
exports.DEPTH_PACK = DEPTH_PACK;
exports.SSAO = SSAO;
exports.SSAO_BLUR = SSAO_BLUR;
exports.ANTIALIASING = ANTIALIASING;
exports.SMAA_BLENDING_WEIGHT_CALCULATION = SMAA_BLENDING_WEIGHT_CALCULATION;
exports.SMAA_EDGE_DETECTION = SMAA_EDGE_DETECTION;
exports.SMAA_RESOLVE = SMAA_RESOLVE;
exports.SMAA_NEIGHBORHOOD_BLENDING = SMAA_NEIGHBORHOOD_BLENDING;
exports.COMPOSITING = COMPOSITING;
exports.MOTION_BLUR = MOTION_BLUR;
exports.COC = COC;
exports.DOF = DOF;
exports.OUTLINE_MASK = OUTLINE_MASK;
exports.OUTLINE = OUTLINE;
exports.GOD_RAYS = GOD_RAYS;
exports.GOD_RAYS_COMBINE = GOD_RAYS_COMBINE;
exports.SKY = SKY;
exports.COPY = COPY;
exports.STEREO = STEREO;
exports.LUMINANCE = LUMINANCE;
exports.AVERAGE_LUMINANCE = AVERAGE_LUMINANCE;
exports.LUMINANCE_TRUNCED = LUMINANCE_TRUNCED;
exports.BLOOM = BLOOM;
exports.VELOCITY = VELOCITY;
exports.SINK = SINK;
exports.PERFORMANCE = PERFORMANCE;
exports.RESIZE = RESIZE;


exports.create_subs_shadow_cast = function(csm_index, lamp_index, shadow_params, num_lights) {
    var subs = init_subs(SHADOW_CAST);
    subs.csm_index = csm_index;
    subs.self_shadow_polygon_offset = shadow_params.self_shadow_polygon_offset;
    subs.shadow_lamp_index = lamp_index;
    switch (shadow_params.lamp_types[lamp_index]) {
    case "SPOT":
    case "POINT":
        subs.camera = m_cam.create_camera(m_cam.TYPE_PERSP);
        var fov  = shadow_params.spot_sizes[lamp_index];
        var near = shadow_params.clip_start[lamp_index];
        var far  = shadow_params.clip_end[lamp_index];
        m_cam.set_frustum(subs.camera, fov, near, far);
        break;
    default:
        subs.camera = m_cam.create_camera(m_cam.TYPE_ORTHO_ASYMMETRIC);
    }

    add_light_attributes(subs, num_lights);

    return subs;
}

function add_light_attributes(subs, num_lights) {
    subs.num_lights = num_lights;
    subs.light_directions        = new Float32Array(num_lights * 3); // vec3's
    subs.light_positions         = new Float32Array(num_lights * 4); // vec4's
    subs.light_color_intensities = new Float32Array(num_lights * 4); // vec4's
}

/**
 * Create abstract subscene.
 * @param type Subscene type
 */
function init_subs(type) {
    var subs = {
        type: type,
        subtype: "",

        // rendering flags
        force_do_not_render: false,
        do_render: false,
        enqueue: false,
        clear_color: false,
        clear_depth: false,
        depth_test: false,
        blend: false,
        pack: false,
        // assign webgl texture before rendering
        assign_texture: false,
        need_fog_update: false,
        need_perm_uniforms_update: false,

        // common properties
        debug_render_calls: 0,
        debug_render_time: 0,
        debug_render_time_queries: [],
        
        // properties for DEBUG_VIEW subs
        debug_view_mode: 0,
        debug_colors_seed: 0,
        debug_render_time_threshold: 1,
        
        do_not_debug: false,
        time: 0,
        camera: null,
        cube_view_matrices: null,
        cube_cam_frustums:[],
        draw_data: [],
        slinks_internal: [],
        textures_internal: [],
        wind: new Float32Array(3),
        grass_map_dim: new Float32Array(3),
        fog_color_density: new Float32Array(4),
        fog_params: new Float32Array(4),
        cube_fog: new Float32Array(16),

        // environment and world properties
        sky_tex_default_value: 0,
        environment_energy: 0,
        num_lights: 0,
        light_directions: null,
        light_positions: null,
        light_color_intensities: null,
        light_factors: null,
        horizon_color: new Float32Array(3),
        zenith_color: new Float32Array(3),
        sky_tex_fac: new Float32Array(4),
        sun_intensity: new Float32Array(3), // affects fog color
        sun_direction: new Float32Array([0,0,1]),
        sun_quaternion: new Float32Array(4),
        sky_tex_color: new Float32Array(3),
        sky_ngraph_proxy_id: "",
        bsdf_cube_sky_dim: 0,

        // outline properties
        outline_factor: 0,
        draw_outline_flag: 0,
        is_for_outline: false,
        outline_color: new Float32Array(3),

        // water properties
        water: false,
        cam_water_depth: 0,
        water_fog_color_density: new Float32Array(4),
        water_level: 0,
        caustics: false,
        caust_scale: 0,
        caust_speed: new Float32Array(2),
        caust_brightness: 0,

        // sky properties
        procedural_skydome: false,
        use_as_environment_lighting: false,
        mie_brightness: 0,
        rayleigh_brightness: 0,
        spot_brightness: 0,
        mie_strength: 0,
        rayleigh_strength: 0,
        scatter_strength: 0,
        mie_collection_power: 0,
        rayleigh_collection_power: 0,
        mie_distribution: 0,
        sky_color: new Float32Array(3),

        // ssao properties
        ssao_hemisphere: false,
        ssao_blur_depth: false,
        ssao_blur_discard_value: 0,
        ssao_radius_increase: 0,
        ssao_influence: 0,
        ssao_dist_factor: 0,
        ssao_samples: 0,
        ssao_only: false,
        ssao_white: false,

        // color correction properties
        brightness: 0,
        contrast: 0,
        exposure: 0,
        saturation: 0,

        // god rays properties
        god_rays_intensity: 0,
        max_ray_length: 0,
        radial_blur_step: 0,
        steps_per_pass: 0,

        // shadow map properties
        csm_index: 0,
        self_shadow_polygon_offset: 0,
        self_shadow_normal_offset: 0,
        v_light_ts: null,
        v_light_r: null,
        v_light_tsr: null,
        p_light_matrix: null,

        // other postprocessing properties
        is_pp: false,
        fxaa_quality: "",
        bloom_key: 0,
        bloom_blur: 0,
        bloom_edge_lum: 0,
        adaptive_bloom: true,
        average_luminance: 0,
        blur_texel_size_mult: 0,
        ext_texel_size_mult: 0,
        mb_decay_threshold: 0,
        mb_factor: 0,
        motion_blur_exp: 0,
        pp_effect: "",
        coc_type: "",
        jitter_projection_space: new Float32Array(2),
        last_mip_map_ind: 0.0,
        bloom_blur_num: 2,
        bloom_blur_scale: 0.5,

        small_glow_mask_width: 0,
        large_glow_mask_width: 0,
        small_glow_mask_coeff: 0,
        large_glow_mask_coeff: 0,

        texel_size_multiplier: 0,
        texel_size: new Float32Array(2),
        texel_mask: new Float32Array(2),

        // head-mounted display params
        distortion_params: new Float32Array(4),
        chromatic_aberration_coefs: new Float32Array(4),
        enable_hmd_stereo: false,

        shadow_lamp_index: 0,

        need_draw_data_sort: true,

        // sky props
        sky_invert: false,
        sky_use_rgb_to_intensity: false,
        sky_use_map_blend: false,
        sky_use_map_horizon: false,
        sky_use_map_zenith_up: false,
        sky_use_map_zenith_down: false,
        sky_blend_type: "",
        use_sky_blend: false,
        use_sky_paper: false,
        use_sky_real: false
    }

    // setting default values
    subs.do_render = true;
    subs.enqueue = true;
    subs.clear_color = true;
    subs.clear_depth = true;
    subs.depth_test = true;
    subs.need_perm_uniforms_update = true;
    subs.texel_size_multiplier = 1;
    subs.texel_mask[0] = 1;
    subs.texel_mask[1] = 1;

    subs.distortion_params[2] = 0.5;
    subs.distortion_params[3] = 0.5;

    subs.ssao_samples = 8;

    return subs;
}

exports.clone_subs = function(subs) {
    var subs_new = init_subs(subs.type);

    subs_new.subtype = subs.subtype;

    // rendering flags
    subs_new.force_do_not_render = subs.force_do_not_render;
    subs_new.do_render = subs.do_render;
    subs_new.enqueue = subs.enqueue;
    subs_new.clear_color = subs.clear_color;
    subs_new.clear_depth = subs.clear_depth;
    subs_new.depth_test = subs.depth_test;
    subs_new.blend = subs.blend;
    subs_new.pack = subs.pack;

    // assign webgl texture before rendering
    subs_new.assign_texture = subs.assign_texture;
    subs_new.need_fog_update = subs.need_fog_update;
    subs_new.need_perm_uniforms_update = subs.need_perm_uniforms_update;

    // common properties
    // no need to copy that
    subs_new.debug_render_calls = 0;
    subs_new.debug_render_time = 0;
    subs_new.debug_render_time_queries = [];
    
    // properties for DEBUG_VIEW subs
    subs_new.debug_view_mode = subs.debug_view_mode;
    subs_new.debug_colors_seed = subs.debug_colors_seed;
    subs_new.debug_render_time_threshold = subs.debug_render_time_threshold;
    
    subs_new.do_not_debug = subs.do_not_debug;
    subs_new.time = subs.time;

    subs_new.camera = m_cam.clone_camera(subs.camera, true);

    subs_new.cube_view_matrices = m_util.clone_object_r(subs.cube_view_matrices);
    subs_new.cube_cam_frustums = m_util.clone_object_r(subs.cube_cam_frustums);
    subs_new.draw_data = m_util.clone_object_r(subs.draw_data);
    subs_new.slinks_internal = m_util.clone_object_r(subs.slinks_internal);
    subs_new.textures_internal = m_util.clone_object_r(subs.textures_internal);

    subs_new.wind.set(subs.wind);
    subs_new.grass_map_dim.set(subs.grass_map_dim);
    subs_new.fog_color_density.set(subs.fog_color_density);
    subs_new.fog_params.set(subs.fog_params);
    subs_new.cube_fog.set(subs.cube_fog);

    // environment and world properties
    subs_new.sky_tex_default_value = subs.sky_tex_default_value;
    subs_new.environment_energy = subs.environment_energy;
    subs_new.num_lights = subs.num_lights;
    subs_new.light_directions = m_util.clone_object_r(subs.light_directions);
    subs_new.light_positions = m_util.clone_object_r(subs.light_positions);
    subs_new.light_color_intensities = m_util.clone_object_r(subs.light_color_intensities);
    subs_new.light_factors = m_util.clone_object_r(subs.light_factors);
    subs_new.horizon_color.set(subs.horizon_color);
    subs_new.zenith_color.set(subs.zenith_color);
    subs_new.sky_tex_fac.set(subs.sky_tex_fac);
    subs_new.sun_intensity.set(subs.sun_intensity);
    subs_new.sun_direction.set(subs.sun_direction);
    subs_new.sun_quaternion.set(subs.sun_quaternion);
    subs_new.sky_tex_color.set(subs.sky_tex_color);
    subs_new.sky_ngraph_proxy_id = subs.sky_ngraph_proxy_id;
    subs_new.bsdf_cube_sky_dim = subs.bsdf_cube_sky_dim;

    // outline properties
    subs_new.outline_factor = subs.outline_factor;
    subs_new.draw_outline_flag = subs.draw_outline_flag;
    subs_new.is_for_outline = subs.is_for_outline;
    subs_new.outline_color.set(subs.outline_color);

    // water properties
    subs_new.water = subs.water;
    subs_new.cam_water_depth = subs.cam_water_depth;

    subs_new.water_fog_color_density.set(subs.water_fog_color_density);
    subs_new.water_level = subs.water_level;
    subs_new.caustics = subs.caustics;
    subs_new.caust_scale = subs.caust_scale;
    subs_new.caust_speed.set(subs.caust_speed);
    subs_new.caust_brightness = subs.caust_brightness;

    // sky properties
    subs_new.procedural_skydome = subs.procedural_skydome;
    subs_new.use_as_environment_lighting = subs.use_as_environment_lighting;
    subs_new.mie_brightness = subs.mie_brightness;
    subs_new.rayleigh_brightness = subs.rayleigh_brightness;
    subs_new.spot_brightness = subs.spot_brightness;
    subs_new.mie_strength = subs.mie_strength;
    subs_new.rayleigh_strength = subs.rayleigh_strength;
    subs_new.scatter_strength = subs.scatter_strength;
    subs_new.mie_collection_power = subs.mie_collection_power;
    subs_new.rayleigh_collection_power = subs.rayleigh_collection_power;
    subs_new.mie_distribution = subs.mie_distribution;
    subs_new.sky_color.set(subs.sky_color);

    // ssao properties
    subs_new.ssao_hemisphere = subs.ssao_hemisphere;
    subs_new.ssao_blur_depth = subs.ssao_blur_depth;
    subs_new.ssao_blur_discard_value = subs.ssao_blur_discard_value;
    subs_new.ssao_radius_increase = subs.ssao_radius_increase;
    subs_new.ssao_influence = subs.ssao_influence;
    subs_new.ssao_dist_factor = subs.ssao_dist_factor;
    subs_new.ssao_samples = subs.ssao_samples;
    subs_new.ssao_only = subs.ssao_only;
    subs_new.ssao_white = subs.ssao_white;

    // color correction properties
    subs_new.brightness = subs.brightness;
    subs_new.contrast = subs.contrast;
    subs_new.exposure = subs.exposure;
    subs_new.saturation = subs.saturation;

    // god rays properties
    subs_new.god_rays_intensity = subs.god_rays_intensity;
    subs_new.max_ray_length = subs.max_ray_length;
    subs_new.radial_blur_step = subs.radial_blur_step;
    subs_new.steps_per_pass = subs.steps_per_pass;

    // shadow map properties
    subs_new.csm_index = subs.csm_index;
    subs_new.self_shadow_polygon_offset = subs.self_shadow_polygon_offset;
    subs_new.self_shadow_normal_offset = subs.self_shadow_normal_offset;

    subs_new.v_light_ts = m_util.clone_object_r(subs.v_light_ts);
    subs_new.v_light_r = m_util.clone_object_r(subs.v_light_r);
    subs_new.v_light_tsr = m_util.clone_object_r(subs.v_light_tsr);
    subs_new.p_light_matrix = m_util.clone_object_r(subs.p_light_matrix);

    // other postprocessing properties
    subs_new.is_pp = subs.is_pp;
    subs_new.fxaa_quality = subs.fxaa_quality;
    subs_new.bloom_key = subs.bloom_key;
    subs_new.bloom_blur = subs.bloom_blur;
    subs_new.bloom_edge_lum = subs.bloom_edge_lum;
    subs_new.adaptive_bloom = subs.adaptive_bloom;
    subs_new.average_luminance = subs.average_luminance;
    subs_new.blur_texel_size_mult = subs.blur_texel_size_mult;
    subs_new.ext_texel_size_mult = subs.ext_texel_size_mult;
    subs_new.mb_decay_threshold = subs.mb_decay_threshold;
    subs_new.mb_factor = subs.mb_factor;
    subs_new.motion_blur_exp = subs.motion_blur_exp;
    subs_new.pp_effect = subs.pp_effect;
    subs_new.coc_type = subs.coc_type;

    subs_new.jitter_projection_space.set(subs.jitter_projection_space);
    subs_new.last_mip_map_ind = subs.last_mip_map_ind;
    subs_new.bloom_blur_num = subs.bloom_blur_num;
    subs_new.bloom_blur_scale = subs.bloom_blur_scale;

    subs_new.small_glow_mask_width = subs.small_glow_mask_width;
    subs_new.large_glow_mask_width = subs.large_glow_mask_width;
    subs_new.small_glow_mask_coeff = subs.small_glow_mask_coeff;
    subs_new.large_glow_mask_coeff = subs.large_glow_mask_coeff;

    subs_new.texel_size_multiplier = subs.texel_size_multiplier;
    subs_new.texel_size.set(subs.texel_size);
    subs_new.texel_mask.set(subs.texel_mask);

    // head-mounted display params
    subs_new.distortion_params.set(subs.distortion_params);
    subs_new.chromatic_aberration_coefs.set(subs.chromatic_aberration_coefs);
    subs_new.enable_hmd_stereo = subs.enable_hmd_stereo;

    subs_new.shadow_lamp_index = subs.shadow_lamp_index;

    subs_new.need_draw_data_sort = subs.need_draw_data_sort;

    // sky props
    subs_new.sky_invert = subs.sky_invert;
    subs_new.sky_use_rgb_to_intensity = subs.sky_use_rgb_to_intensity;
    subs_new.sky_use_map_blend = subs.sky_use_map_blend;
    subs_new.sky_use_map_horizon = subs.sky_use_map_horizon;
    subs_new.sky_use_map_zenith_up = subs.sky_use_map_zenith_up;
    subs_new.sky_use_map_zenith_down = subs.sky_use_map_zenith_down;
    subs_new.sky_blend_type = subs.sky_blend_type;
    subs_new.use_sky_blend = subs.use_sky_blend;
    subs_new.use_sky_paper = subs.use_sky_paper;
    subs_new.use_sky_real = subs.use_sky_real;

    return subs_new;
}

exports.create_subs_grass_map = function() {

    var subs = init_subs(GRASS_MAP);
    subs.camera = m_cam.create_camera(m_cam.TYPE_ORTHO_ASPECT);

    return subs;
}

exports.create_subs_postprocessing = function(pp_effect) {

    var pp_subs = init_subs(POSTPROCESSING);
    pp_subs.clear_color = false;
    pp_subs.clear_depth = false;
    pp_subs.depth_test = false;
    pp_subs.is_pp = true;

    pp_subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);
    pp_subs.pp_effect = pp_effect;

    switch (pp_effect) {
    case "NONE":
        pp_subs.texel_mask[0] = 1;
        pp_subs.texel_mask[1] = 1;
        break;
    case "GRAYSCALE":
        pp_subs.texel_mask[0] = 1;
        pp_subs.texel_mask[1] = 1;
        break;
    case "X_BLUR":
        pp_subs.texel_mask[0] = 1;
        pp_subs.texel_mask[1] = 0;
        break;
    case "Y_BLUR":
        pp_subs.texel_mask[0] = 0;
        pp_subs.texel_mask[1] = 1;
        break;
    case "X_GLOW_BLUR":
        pp_subs.texel_mask[0] = 1;
        pp_subs.texel_mask[1] = 0;
        break;
    case "Y_GLOW_BLUR":
        pp_subs.texel_mask[0] = 0;
        pp_subs.texel_mask[1] = 1;
        break;
    case "X_BLOOM_BLUR":
        pp_subs.texel_mask[0] = 1;
        pp_subs.texel_mask[1] = 0;
        break;
    case "Y_BLOOM_BLUR":
        pp_subs.texel_mask[0] = 0;
        pp_subs.texel_mask[1] = 1;
        break;
    case "X_DOF_BLUR":
        pp_subs.texel_mask[0] = 1;
        pp_subs.texel_mask[1] = 1;
        break;
    case "Y_DOF_BLUR":
        pp_subs.texel_mask[0] = 1;
        pp_subs.texel_mask[1] = 1;
        break;
    case "X_ALPHA_BLUR":
        pp_subs.texel_mask[0] = 1;
        pp_subs.texel_mask[1] = 0;
        // fixed multiplier for DOF
        pp_subs.texel_size_multiplier = 3.0;
        break;
    case "Y_ALPHA_BLUR":
        pp_subs.texel_mask[0] = 0;
        pp_subs.texel_mask[1] = 1;
        // fixed multiplier for DOF
        pp_subs.texel_size_multiplier = 3.0;
        break;
    case "X_EXTEND":
        pp_subs.texel_mask[0] = 1;
        pp_subs.texel_mask[1] = 0;
        break;
    case "Y_EXTEND":
        pp_subs.texel_mask[0] = 0;
        pp_subs.texel_mask[1] = 1;
        break;
    default:
        m_util.panic("Wrong postprocessing effect: " + pp_effect);
        break;
    }

    return pp_subs;
}

exports.create_subs_glow_combine = function(cam, sc_render) {

    var subs = init_subs(GLOW_COMBINE);
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;
    subs.small_glow_mask_coeff = sc_render.glow_params.small_glow_mask_coeff;
    subs.large_glow_mask_coeff = sc_render.glow_params.large_glow_mask_coeff;
    subs.small_glow_mask_width = sc_render.glow_params.small_glow_mask_width;
    subs.large_glow_mask_width = sc_render.glow_params.large_glow_mask_width;

    subs.camera = cam;

    subs.is_pp = true;

    return subs;
}

/**
 * Create MAIN_* subscene
 * @param main_type "OPAQUE", "BLEND", "REFLECT"
 * @param cam Camera to attach
 */
exports.create_subs_main = function(main_type, cam, opaque_do_clear_depth,
        water_params, num_lights, wfs_params, wls_params, shadow_params, sun_exist) {
    var subs = init_subs(main_type);

    if (main_type == MAIN_OPAQUE) {
        subs.clear_color = true;
        subs.clear_depth = opaque_do_clear_depth;
        subs.blend = false;
    } else if (main_type == MAIN_BLEND) {
        subs.clear_color = false;
        subs.clear_depth = false;
        subs.blend = true;
    } else if (main_type == MAIN_XRAY) {
        subs.clear_color = false;
        subs.clear_depth = true;
        subs.blend = true;
    } else if (main_type == MAIN_PLANE_REFLECT || main_type == MAIN_CUBE_REFLECT) {
        subs.clear_color = true;
        subs.clear_depth = true;
        subs.blend = false;
    } else if (main_type == MAIN_PLANE_REFLECT_BLEND ||
               main_type == MAIN_CUBE_REFLECT_BLEND) {
        subs.clear_color = false;
        subs.clear_depth = false;
        subs.blend = true;
    } else if (main_type == MAIN_GLOW) {
        subs.clear_color = true;
        subs.clear_depth = false;
        subs.blend = true;
    } else
        m_util.panic("wrong main subscene type");

    if (subs.blend && shadow_params)
        subs.self_shadow_normal_offset = shadow_params.self_shadow_normal_offset;

    subs.camera = cam;

    var sts = wls_params.sky_texture_param;
    if (sts) {
        subs.sky_tex_fac.set([sts.blend_factor, sts.horizon_factor, sts.zenith_up_factor, sts.zenith_down_factor]);
        subs.sky_tex_color.set(sts.color);
        subs.sky_tex_default_value = sts.default_value;
    }
    subs.horizon_color.set(wls_params.horizon_color);
    subs.zenith_color.set(wls_params.zenith_color);
    subs.environment_energy = wls_params.environment_energy;

    // by link
    subs.fog_color_density = wfs_params.fog_color_density;
    subs.fog_params = wfs_params.fog_params;

    if (water_params)
        assign_water_params(subs, water_params, sun_exist)

    add_light_attributes(subs, num_lights);

    return subs;
}

function assign_water_params(subs, water_params, sun_exist) {
    var wp = water_params;

    // water fog
    if (wp.fog_color_density)
        subs.water_fog_color_density.set(wp.fog_color_density);

    // dynamics
    subs.water_level        = wp.water_level;

    // caustics
    if (wp.caustics && sun_exist) {
        subs.caustics         = true;
        subs.caust_scale      = wp.caustic_scale;
        subs.caust_brightness = wp.caustic_brightness;
        subs.caust_speed.set(wp.caustic_speed);
    }
}

exports.create_subs_resolve = function() {
    var subs = init_subs(RESOLVE);
    subs.is_pp = true;
    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);
    return subs;
}

exports.create_subs_color_picking = function(cam, xray, num_lights) {

    var subs = init_subs(COLOR_PICKING);
    if (xray) {
        subs.type = COLOR_PICKING_XRAY;
        subs.clear_color = false;
        subs.clear_depth = true;
    }

    subs.enqueue = false;

    subs.camera = cam;

    add_light_attributes(subs, num_lights);

    return subs;
}

exports.create_subs_debug_view = function(cam) {

    var subs = init_subs(DEBUG_VIEW);
    subs.do_render = false;
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.camera = cam;

    return subs;
}

exports.create_subs_anchor_visibility = function(cam) {

    var subs = init_subs(ANCHOR_VISIBILITY);
    subs.clear_color = true;
    subs.clear_depth = false;

    subs.camera = cam;

    return subs;
}

/**
 * Used for depth and (optionally) shadow receive rendering
 */
exports.create_subs_shadow_receive = function(graph, cam, num_lights) {
    var subs = init_subs(SHADOW_RECEIVE);
    subs.camera = cam;

    add_light_attributes(subs, num_lights);

    return subs;
}

/**
 * Store red channel from subs depth attachment as RGBA texture
 */
exports.create_subs_depth_pack = function(cam) {

    var subs = init_subs(DEPTH_PACK);
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.camera = cam;
    subs.is_pp = true;

    return subs;
}

exports.create_subs_ssao = function(cam, wfs_params, ssao_params) {

    var subs = init_subs(SSAO);
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    subs.camera = cam;

    // by link
    subs.fog_color_density = wfs_params.fog_color_density;
    subs.water_fog_color_density.set(wfs_params.fog_color_density);

    subs.ssao_radius_increase = ssao_params.radius_increase;
    subs.ssao_hemisphere = ssao_params.hemisphere;
    subs.ssao_influence = ssao_params.influence; // how much AO affects final rendering
    subs.ssao_dist_factor = ssao_params.dist_factor; // how much ao decreases with distance
    subs.ssao_samples = ssao_params.samples; // number of samples aka quality

    subs.is_pp = true;

    return subs;
}

exports.create_subs_ssao_blur = function(cam, ssao_params) {
    var subs = init_subs(SSAO_BLUR);
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    subs.camera = cam;

    subs.ssao_blur_depth = ssao_params.blur_depth;
    subs.ssao_blur_discard_value = ssao_params.blur_discard_value;

    subs.is_pp = true;

    return subs;
}

exports.create_subs_aa = function(sc_render) {
    var subs = init_subs(ANTIALIASING);
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;


    subs.texel_size_multiplier = 1 / sc_render.resolution_factor;
    subs.fxaa_quality = sc_render.aa_quality;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);

    subs.is_pp = true;

    return subs;
}

exports.create_subs_smaa = function(pass, sc_render) {
    var subs = init_subs(pass);

    if (pass == SMAA_BLENDING_WEIGHT_CALCULATION ||
        pass == SMAA_EDGE_DETECTION)
        subs.clear_color = true;
    else
        subs.clear_color = false;

    subs.clear_depth = false;
    subs.depth_test = false;
    subs.texel_size_multiplier = 1 / sc_render.resolution_factor;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);

    if (pass == SMAA_BLENDING_WEIGHT_CALCULATION)
        subs.jitter_subsample_ind = new Float32Array(4);

    subs.is_pp = true;

    return subs;
}

exports.create_subs_compositing = function(brightness, contrast, exposure, saturation) {

    var subs = init_subs(COMPOSITING);
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);
    subs.brightness = brightness;
    subs.contrast   = contrast;
    subs.exposure   = exposure;
    subs.saturation = saturation;

    subs.is_pp = true;

    return subs;
}

exports.create_subs_motion_blur = function(mb_decay_threshold, mb_factor) {
    var mb_subs = init_subs(MOTION_BLUR);
    mb_subs.clear_color = false;
    mb_subs.clear_depth = false;
    mb_subs.depth_test = false;

    mb_subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);

    mb_subs.assign_texture = true;

    mb_subs.mb_decay_threshold = mb_decay_threshold;
    mb_subs.mb_factor = mb_factor;

    mb_subs.is_pp = true;

    return mb_subs;
}


/**
 * Circle of confusion (~blurriness) calculation
 * in the alpha channel
 */
exports.create_subs_coc = function(cam, coc_type) {

    var subs = init_subs(COC);
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    subs.camera = cam;
    subs.texel_size_multiplier = subs.camera.dof_power;
    subs.coc_type = coc_type;

    subs.is_pp = true;

    return subs;
}

exports.create_subs_dof = function(cam) {

    var subs = init_subs(DOF);
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    subs.camera = cam;
    subs.texel_size_multiplier = subs.camera.dof_power;

    subs.is_pp = true;

    return subs;
}


exports.create_subs_outline_mask = function(cam, num_lights) {
    var subs = init_subs(OUTLINE_MASK);
    subs.depth_test = false;
    subs.camera = cam;

    add_light_attributes(subs, num_lights);

    return subs;
}

exports.create_subs_outline = function(outline_params) {
    var subs = init_subs(OUTLINE);

    if (cfg_out.outlining_overview_mode)
        subs.outline_color.set(cfg_out.outline_color);
    else
        subs.outline_color.set(outline_params.outline_color);
    subs.outline_factor = outline_params.outline_factor;
    subs.ext_texel_size_mult = 5;
    subs.blur_texel_size_mult = 3;
    subs.depth_test = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);
    subs.is_pp = true;

    return subs;
}

exports.create_subs_god_rays = function(cam, water, ray_length, pack, step,
                              num_lights, steps_per_pass) {

    var subs = init_subs(GOD_RAYS);
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    subs.horizon_color = new Float32Array([1, 1, 1]);
    subs.zenith_color = new Float32Array([1, 1, 1]);

    subs.environment_energy = 1;

    subs.pack = pack;
    subs.water = water;
    subs.radial_blur_step = step;
    subs.max_ray_length = ray_length;
    subs.steps_per_pass = steps_per_pass;
    subs.camera = cam;

    add_light_attributes(subs, num_lights);

    return subs;
}

exports.create_subs_god_rays_comb = function(intensity, num_lights) {

    var subs = init_subs(GOD_RAYS_COMBINE);
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);

    subs.god_rays_intensity = intensity;

    add_light_attributes(subs, num_lights);

    subs.is_pp = true;

    return subs;
}

/**
 * Create subscene for screen rendering
 */
exports.create_subs_sky = function(wls, num_lights, sky_params, size) {

    var subs = init_subs(SKY);

    subs.enqueue = false;
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    var cam = m_cam.create_camera(m_cam.TYPE_NONE);

    // NOTE: check it
    cam.width = size;
    cam.height = size;

    subs.camera = cam;

    subs.cube_view_matrices = m_util.generate_cubemap_matrices();

    add_light_attributes(subs, num_lights);

    subs.horizon_color = new Float32Array([1, 1, 1]);
    subs.zenith_color = new Float32Array([1, 1, 1]);

    subs.environment_energy = 1;

    subs.sky_color.set(sky_params.sky_color);

    subs.procedural_skydome          = sky_params.procedural_skydome;
    subs.use_as_environment_lighting = sky_params.use_as_environment_lighting;
    subs.rayleigh_brightness         = sky_params.rayleigh_brightness;
    subs.mie_brightness              = sky_params.mie_brightness;
    subs.spot_brightness             = sky_params.spot_brightness;
    subs.scatter_strength            = sky_params.scatter_strength;
    subs.rayleigh_strength           = sky_params.rayleigh_strength;
    subs.mie_strength                = sky_params.mie_strength;
    subs.rayleigh_collection_power   = sky_params.rayleigh_collection_power;
    subs.mie_collection_power        = sky_params.mie_collection_power;
    subs.mie_distribution            = sky_params.mie_distribution;

    if (wls) {
        subs.horizon_color.set(wls.horizon_color);
        subs.zenith_color.set(wls.zenith_color);
        subs.environment_energy = wls.environment_energy;
        var sts = wls.sky_texture_param;
        if (sts) {
            subs.sky_tex_fac.set([sts.blend_factor, sts.horizon_factor,
                sts.zenith_up_factor, sts.zenith_down_factor]);
            subs.sky_tex_color.set(sts.color);
            subs.sky_tex_default_value = sts.default_value;
            subs.sky_invert = sts.invert;
            subs.sky_use_rgb_to_intensity = sts.use_rgb_to_intensity;
            subs.sky_use_map_blend = sts.use_map_blend;
            subs.sky_use_map_horizon = sts.use_map_horizon;
            subs.sky_use_map_zenith_up = sts.use_map_zenith_up;
            subs.sky_use_map_zenith_down = sts.use_map_zenith_down;
            subs.sky_blend_type = sts.blend_type;
        }
        subs.use_sky_blend = wls.use_sky_blend;
        subs.use_sky_paper = wls.use_sky_paper;
        subs.use_sky_real = wls.use_sky_real;
        subs.sky_ngraph_proxy_id = wls.ngraph_proxy_id;
    }


    return subs;
}

exports.create_subs_copy = function() {

    var subs = init_subs(COPY);
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);
    subs.is_pp = true;

    return subs;
}

exports.create_subs_stereo = function(is_hmd_stereo) {

    var subs = init_subs(STEREO);
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.subtype = is_hmd_stereo? "HMD" : "ANAGLYPH";

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);
    subs.is_pp = true;

    return subs;
}

exports.create_subs_luminance = function() {

    var subs = init_subs(LUMINANCE);
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);
    subs.is_pp = true;

    return subs;
}

exports.create_subs_av_luminance = function() {

    var subs = init_subs(AVERAGE_LUMINANCE);
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);
    subs.is_pp = true;

    return subs;
}

exports.create_resize_subs = function() {

    var subs = init_subs(RESIZE);
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);
    subs.is_pp = true;

    return subs;
}

exports.create_subs_luminance_truncated = function(bloom_key, edge_lum, num_lights, cam) {

    var subs = init_subs(LUMINANCE_TRUNCED);
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.bloom_key = bloom_key;
    subs.bloom_edge_lum = edge_lum;

    //var cam = m_cam.create_camera(m_cam.TYPE_NONE);
    subs.camera = cam;

    add_light_attributes(subs, num_lights);
    subs.is_pp = true;

    return subs;
}

exports.create_subs_bloom_combine = function(blur, pass_num) {

    var subs = init_subs(BLOOM);
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);
    subs.bloom_blur = blur;
    subs.bloom_blur_num = pass_num;
    subs.is_pp = true;

    return subs;
}

exports.create_subs_veloctity = function(cam) {

    var subs = init_subs(VELOCITY);
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.camera = cam;
    subs.is_pp = true;

    return subs;
}

/**
 * Fictional subscene to close graph
 */
exports.create_subs_sink = function() {

    var subs_sink = init_subs(SINK);
    subs_sink.enqueue = false;

    return subs_sink;
}

exports.create_subs_perf = function() {
    var subs = init_subs(PERFORMANCE);
    subs.is_pp = true;
    return subs;
}

exports.subs_label = function(subs) {
    switch (subs.type) {
    case MAIN_OPAQUE:
        return "MAIN OPAQUE";
    case MAIN_BLEND:
        return "MAIN BLEND";
    case MAIN_XRAY:
        return "MAIN XRAY";
    case MAIN_PLANE_REFLECT:
        return "MAIN PLANE REFLECT";
    case MAIN_CUBE_REFLECT:
        return "MAIN CUBE REFLECT";
    case MAIN_PLANE_REFLECT_BLEND:
        return "MAIN PLANE REFLECT BLEND";
    case MAIN_CUBE_REFLECT_BLEND:
        return "MAIN CUBE REFLECT BLEND";
    case MAIN_GLOW:
        return "MAIN GLOW";
    case SHADOW_CAST:
        return "SHADOW CAST";
    case SHADOW_RECEIVE:
        return "SHADOW RECEIVE";
    case GRASS_MAP:
        return "GRASS MAP";
    // one special case
    case POSTPROCESSING:
        return "POSTPROCESSING (" + subs.pp_effect.replace(/_/g, " ") + ")";
    case GLOW_COMBINE:
        return "GLOW COMBINE";
    case RESOLVE:
        return "RESOLVE";
    case COLOR_PICKING:
        return "COLOR PICKING";
    case COLOR_PICKING_XRAY:
        return "COLOR PICKING XRAY";
    case DEBUG_VIEW:
        return "DEBUG VIEW";
    case ANCHOR_VISIBILITY:
        return "ANCHOR VISIBILITY";
    case DEPTH_PACK:
        return "DEPTH PACK";
    case SSAO:
        return "SSAO";
    case SSAO_BLUR:
        return "SSAO BLUR";
    case ANTIALIASING:
        return "ANTIALIASING";
    case SMAA_BLENDING_WEIGHT_CALCULATION:
        return "SMAA BLENDING WEIGHT CALCULATION";
    case SMAA_EDGE_DETECTION:
        return "SMAA EDGE DETECTION";
    case SMAA_RESOLVE:
        return "SMAA RESOLVE";
    case SMAA_NEIGHBORHOOD_BLENDING:
        return "SMAA NEIGHBORHOOD BLENDING";
    case COMPOSITING:
        return "COMPOSITING";
    case MOTION_BLUR:
        return "MOTION BLUR";
    case COC:
        return "COC";
    case DOF:
        return "DOF";
    case OUTLINE_MASK:
        return "OUTLINE MASK";
    case OUTLINE:
        return "OUTLINE";
    case GOD_RAYS:
        return "GOD RAYS";
    case GOD_RAYS_COMBINE:
        return "GOD RAYS COMBINE";
    case SKY:
        return "SKY";
    case COPY:
        return "COPY";
    case STEREO:
        return "STEREO";
    case LUMINANCE:
        return "LUMINANCE";
    case AVERAGE_LUMINANCE:
        return "AVERAGE LUMINANCE";
    case LUMINANCE_TRUNCED:
        return "LUMINANCE TRUNCED";
    case BLOOM:
        return "BLOOM";
    case VELOCITY:
        return "VELOCITY";
    case PERFORMANCE:
        return "PERFORMANCE";
    case SINK:
        return "SINK";
    case RESIZE:
        return "RESIZE";
    default:
        return "UNKNOWN";
    }
}

exports.append_draw_data = function(subs, rb) {

    var batch = rb.batch;
    var shader = batch.shader;
    var alpha_aa = batch.alpha_antialiasing;

    // remove existing draw data if any
    for (var i = 0; i < subs.draw_data.length; i++) {
        var ddata = subs.draw_data[i];
        var bundles = ddata.bundles;
        var bundle_ind = bundles.indexOf(rb);
        if (bundle_ind != -1) {
            bundles.splice(bundle_ind, 1);
            if (!bundles.length) {
                subs.draw_data.splice(i, 1);
                break;
            }
        }
    }

    if (subs.blend)
        var offset_z = batch.offset_z;
    else
        var offset_z = 0;

    var exist_ddata = get_draw_data(subs.draw_data, shader, alpha_aa, offset_z, batch.is_sky);

    if (exist_ddata)
        exist_ddata.bundles.push(rb);
    else {
        var d_data = init_draw_data(shader, rb, alpha_aa, offset_z, batch.is_sky);
        subs.draw_data.push(d_data);
        subs.need_draw_data_sort = true;
    }
}

function init_draw_data(shader, rb, alpha_antialiasing, offset_z, is_sky) {
    return {
        shader: shader,
        bundles: [rb],
        alpha_antialiasing: alpha_antialiasing,
        offset_z: offset_z,
        is_sky: is_sky,
        do_render: true
    };
}

exports.init_bundle = function(batch, render, world_bounds) {
    var bundle = {
        do_render: true,
        do_render_cube: [true, true, true, true, true, true],
        obj_render: render,
        batch: batch,
        world_bounds: world_bounds || null,
        info_for_z_sort_updates: null
    };

    // NOTE: Z-sorting is possible only for indexed buffers
    if (batch.z_sort && batch.bufs_data.ibo_array) {
        var indices = batch.bufs_data.ibo_array;
        bundle.info_for_z_sort_updates = {
            // caching is possible because count does not change
            median_cache: new Float32Array(indices.length),
            median_world_cache: new Float32Array(indices.length),
            dist_cache: new Float32Array(indices.length/3),
            zsort_eye_last: new Float32Array(3),
            bb_min_side: m_bounds.calc_min_bb_side(batch.bounds_local.bb)
        };
    }

    return bundle;
}

function get_draw_data(draw_data, shader, alpha_antialiasing, offset_z, is_sky) {
    for (var i = 0; i < draw_data.length; i++) {
        var ddata = draw_data[i];
        if (ddata.shader == shader && ddata.alpha_antialiasing == alpha_antialiasing 
                && ddata.offset_z == offset_z && ddata.is_sky == is_sky)
            return ddata;
    }
    return null;
}

exports.sort_draw_data = function(subs) {
    subs.draw_data.sort(sort_fun_draw_data);
    subs.need_draw_data_sort = false;
}

function sort_fun(a, b) {
    if (a == b) return 0;
    return a > b ? 1 : -1;
}

function sort_fun_draw_data(a, b) {
    return sort_fun(a.alpha_antialiasing, b.alpha_antialiasing) ||
           sort_fun(a.is_sky, b.is_sky) ||
           sort_fun(a.offset_z, b.offset_z) ||
           sort_fun(a.shader.has_discard, b.shader.has_discard) ||
           sort_fun(a.shader.shader_id, b.shader.shader_id);
}

}
