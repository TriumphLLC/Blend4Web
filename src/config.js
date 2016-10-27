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
 * Config internal API.
 * @name config
 * @namespace
 * @exports exports as config
 */
b4w.module["__config"] = function(exports, require) {

var m_print = require("__print");
var m_util  = require("__util");

// profiles
exports.P_LOW    = 1;  // maximize performance
exports.P_HIGH   = 2;  // use all requested features
exports.P_ULTRA  = 3;  // use all requested features and maximize quality
exports.P_CUSTOM = 4;  // use exports.defaults
exports.P_AUTO   = 5;  // meta quality for auto configurators

exports.context = {
    alpha              : true,
    antialias          : false,
    premultipliedAlpha : true
}
exports.context_save = m_util.clone_object_r(exports.context);

exports.defaults = {
    alpha_sort                 : true,

    alpha_sort_threshold       : 0.1,

    min_format_version         : [6, 1],

    max_fps                    : 10000, // not accurate

    console_verbose            : false,

    do_not_load_resources      : false,

    use_min50                  : false,

    fps_measurement_interval   : 1.0,

    fps_callback_interval      : 5,

    background_color           : [0.0, 0.0, 0.0, 0.0],

    canvas_resolution_factor   : 1.0,

    texture_min_filter         : 3,

    allow_cors                 : false,

    force_low_quality_nodes    : false,

    anisotropic_filtering      : true,

    // init and show HUD on canvas provided by app
    show_hud_debug_info        : false,

    // required for shadows
    depth_textures             : true,

    shadows                    : true,

    stereo                     : "NONE",

    reflections                : true,

    refractions                : true,

    ssao                       : true,

    dof                        : true,

    god_rays                   : true,

    bloom                      : true,

    motion_blur                : true,

    compositing                : true,

    antialiasing               : true,

    smaa                       : false,

    debug_view                 : false,

    water_wireframe_debug      : false,

    // properties updated from hardware capability
    foam                       : true,

    parallax                   : true,

    dynamic_grass              : true,

    water_dynamic              : true,

    shore_smoothing            : true,

    shore_distance             : true,

    use_compression            : true,

    precision                  : "highp",

    // quality profile
    quality                    : exports.P_HIGH,

    allow_vertex_textures      : true,

    no_phy_interp_hack         : false,

    shader_constants_hack      : false,

    disable_blend_shadows_hack : false,

    vert_anim_mix_normals_hack : false,

    is_mobile_device           : false,

    init_wa_context_hack       : false,

    clear_procedural_sky_hack  : false,

    sky_update_hack            : false,

    seq_video_fallback         : false,

    allow_hidpi                : false,

    shadows_color_slink_hack   : false,

    mobile_firefox_media_hack  : false,

    enable_selectable          : true,

    enable_outlining           : true,

    glow_materials             : true,

    ie11_edge_touchscreen_hack : false,

    firefox_tex_reuse_hack     : false,

    loaded_data_version        : [0, 0],

    edge_min_tex_size_hack     : false,

    quality_aa_method          : true,

    skinning_hack              : false,

    url_params                 : null,

    webgl2                     : true,

    msaa_samples               : 4,

    safari_canvas_alpha_hack   : false,

    safari_glow_hack           : false,

    resize_cubemap_canvas_hack : false,

    chrome_html_bkg_music_hack : false,

    ie_edge_anchors_floor_hack : false,

    ff_disable_anchor_vis_hack : false,

    media_auto_activation      : true,

    max_cast_lamps             : 4,

    mac_os_shadow_hack         : false,

    gl_debug                   : false,

    check_framebuffer_hack     : false,

    allow_instanced_arrays_ext : false,

    allow_vao_ext : false,

    compress_format            : "dds",

    shadow_quality             : "16x",

    srgb_type                  : "SRGB_SIMPLE"
}

exports.defaults_save = m_util.clone_object_r(exports.defaults);

exports.animation = {
    framerate: -1,
    frames_blending_hack: false,
    frame_steps: 1
}

exports.controls = {
    mouse_wheel_notch_multiplier: 1/120
}

exports.assets = {
    path: "",
    // relative to engine sources (default value for developer version)
    path_default: "B4W_ASSETS_PATH=../deploy/assets/",
    max_requests: 15,
    prevent_caching: true,
    min50_available: false,
    dds_available: false,
    pvr_available: false
}
exports.assets_save = m_util.clone_object_r(exports.assets);

exports.paths = {
    shaders_path         : "",
    // relative to engine sources (default value for developer version)
    shaders_path_default : "../shaders/",
    shaders_include_dir : "include/",
    shaders_postp_dir : "postprocessing/",

    built_in_data_module : "built_in_data",

    js_src_search_paths: [
        "b4w.min.js",
        "b4w.full.min.js",
        "b4w.simple.min.js",
        "b4w.whitespace.min.js",
        "src/b4w.js",
        "B4W_MAIN_MODULE"   // replaced when something compiled with the engine
    ],

    smaa_search_texture_path: "smaa_search_texture.png",
    smaa_area_texture_path: "smaa_area_texture.png"
}

exports.hmd_params = {
    "webvr": {
        distortion_coefs : [0.22, 0.28],
        chromatic_aberration_coefs : [-0.015, 0.02, 0.025, 0.02]
    },
    "nonwebvr": {
        inter_lens_dist: 0.064,
        base_line_dist: 0.035,
        screen_to_lens_dist: 0.039,
        distortion_coefs : [0.34, 0.55],
        chromatic_aberration_coefs : [0.0, 0.0, 0.0, 0.0],
        width_dist: 0.110,
        height_dist: 0.062,
        bevel_size: 0.004
    }
}

// physics config
exports.physics = {
    enabled: true,
    max_fps: 60,
    uranium_path: "",
    // relative to engine sources (default value for developer version)
    uranium_path_default: "B4W_URANIUM_PATH=../deploy/apps/common/uranium.js",
    calc_fps: false,
    ping: false,
    use_workers: true
}
exports.physics_save = m_util.clone_object_r(exports.physics);

exports.scenes = {
    grass_tex_size: 2*512,
    // default adjusted size
    cubemap_tex_size: 256,
    cube_reflect_low: 32,
    cube_reflect_medium: 128,
    cube_reflect_high: 256,
    plane_reflect_low: 0.25,
    plane_reflect_medium: 0.5,
    plane_reflect_high: 1.0
}
exports.scenes_save = m_util.clone_object_r(exports.scenes);

exports.sfx = {
    webaudio               : true,
    mix_mode               : false,
    audio_loading_hack     : false,
    clamp_playback_rate_hack: false,
    disable_playback_rate_hack: false

}
exports.sfx_save = m_util.clone_object_r(exports.sfx);

exports.outlining = {
    outlining_overview_mode : false,
    outline_color           : [1, 0.4, 0.05],
    outline_duration        : 0.2,
    outline_period          : 3.8,
    outline_relapses        : 1.0
}


exports.debug_subs = {
    enabled     : false,
    subs_type   : 0,    // look subscene module for the right type number
    subs_number : 0,
    slink_type  : "COLOR"
}
exports.debug_subs_save = m_util.clone_object_r(exports.debug_subs);

exports.context_limits = {
    max_combined_texture_image_units : 8,
    max_fragment_uniform_vectors     : 64,
    max_texture_image_units          : 8,
    max_varying_vectors              : 8,
    max_vertex_attribs               : 15,
    max_vertex_texture_image_units   : 0,
    max_vertex_uniform_vectors       : 128,

    max_cube_map_texture_size        : 1024,
    max_renderbuffer_size            : 4096,
    max_texture_size                 : 4096,
    max_viewport_dims                : [4096, 4096]
}
exports.context_limits_save = m_util.clone_object_r(exports.context_limits);

/**
 * Override default values of engine settings according to quality param
 */
exports.apply_quality = function() {

    var cfg_def = exports.defaults;
    var cfg_phy = exports.physics;
    var cfg_scs = exports.scenes;

    switch (cfg_def.quality) {

    case exports.P_ULTRA:

        cfg_def.shadows = true,

        cfg_def.shore_smoothing = true,

        cfg_def.ssao = true;

        cfg_def.dof = true;

        cfg_def.god_rays = true;

        cfg_def.bloom = true;

        cfg_def.reflections = true;

        cfg_def.refractions = true;

        cfg_def.foam = true;

        cfg_def.parallax = true;

        cfg_def.dynamic_grass = true;

        cfg_scs.grass_tex_size = 4.0*512;

        cfg_scs.cubemap_tex_size = 512;

        cfg_def.texture_min_filter = 3;

        cfg_def.anisotropic_filtering = true;

        cfg_def.use_min50 = false;

        cfg_def.precision = "highp";

        cfg_def.water_dynamic = true;

        cfg_def.shore_distance = true;

        cfg_def.antialiasing = true;

        cfg_def.smaa = false;

        cfg_def.compositing = true;

        cfg_def.motion_blur = true;

        cfg_def.allow_hidpi = true;

        cfg_def.enable_outlining = true;

        cfg_def.glow_materials = true;

        cfg_def.msaa_samples = 16;

        cfg_def.srgb_type = "SRGB_PROPER";

        cfg_phy.max_fps = 120;

        break;

    case exports.P_HIGH:

        cfg_def.shadows = true;

        cfg_def.shore_smoothing = true;

        cfg_def.ssao = true;

        cfg_def.dof = true;

        cfg_def.god_rays = true;

        cfg_def.bloom = true;

        cfg_def.reflections = true;

        cfg_def.refractions = true;

        cfg_def.foam = true;

        cfg_def.parallax = true;

        cfg_def.dynamic_grass = true;

        cfg_scs.grass_tex_size = 2*512;

        cfg_scs.cubemap_tex_size = 256;

        cfg_def.texture_min_filter = 3;

        cfg_def.anisotropic_filtering = true;

        cfg_def.use_min50 = false;

        cfg_def.precision = "highp";

        cfg_def.water_dynamic = true;

        cfg_def.shore_distance = true;

        cfg_def.antialiasing = true;

        cfg_def.smaa = false;

        cfg_def.compositing = true;

        cfg_def.motion_blur = true;

        cfg_def.allow_hidpi = false;

        cfg_def.enable_outlining = true;

        cfg_def.glow_materials = true;

        cfg_def.srgb_type = "SRGB_SIMPLE";

        cfg_def.msaa_samples = 4;

        cfg_phy.max_fps = 60;

        break;

    case exports.P_LOW:

        cfg_def.shadows = false;

        cfg_def.shore_smoothing = false;

        cfg_def.ssao = false;

        cfg_def.dof = false;

        cfg_def.god_rays = false;

        cfg_def.bloom = false;

        cfg_def.reflections = false;

        cfg_def.refractions = false;

        cfg_def.foam = false;

        cfg_def.parallax = false;

        cfg_def.dynamic_grass = false;

        cfg_scs.grass_tex_size = 1*512;

        cfg_scs.cubemap_tex_size = 256;

        cfg_def.texture_min_filter = 2;

        cfg_def.anisotropic_filtering = false;

        cfg_def.use_min50 = true;

        cfg_def.precision = "mediump";

        cfg_def.water_dynamic = false;

        cfg_def.shore_distance = false;

        cfg_def.antialiasing = false;

        cfg_def.smaa = false;

        cfg_def.compositing = false;

        cfg_def.motion_blur = false;

        cfg_def.allow_hidpi = false;

        cfg_def.enable_outlining = false;

        cfg_def.glow_materials = false;

        cfg_def.srgb_type = "SRGB_SIMPLE";

        cfg_def.msaa_samples = 1;

        cfg_phy.max_fps = 60

        break;
    case exports.P_CUSTOM:
        // do nothing
        break;
    case exports.P_AUTO:
        m_util.panic("Direct AUTO quality profile setting is forbidden");
        break;
    }
}

exports.set = set;
/**
 * @methodOf config
 */
function set(prop, value) {
    switch (prop) {
    case "allow_cors":
        exports.defaults.allow_cors = value;
        break;
    case "allow_hidpi":
        exports.defaults.allow_hidpi = value;
        break;
    case "alpha":
        exports.context.alpha = value;
        break;
    case "alpha_sort":
        exports.defaults.alpha_sort = value;
        break;
    case "alpha_sort_threshold":
        exports.defaults.alpha_sort_threshold = value;
        break;
    case "anaglyph_use":
        m_print.error_deprecated_cfg("anaglyph_use", "stereo");
        exports.defaults.stereo = value? "ANAGLYPH": exports.defaults.stereo;
        break;
    case "animation_framerate":
        exports.animation.framerate = value;
        break;
    case "anisotropic_filtering":
        exports.defaults.anisotropic_filtering = value;
        break;
    case "antialiasing":
        exports.defaults.antialiasing = value;
        break;
    // @deprecated
    case "assets_dir":
    case "assets_path":
        exports.assets.path = value;
        break;
    case "assets_dds_available":
        exports.assets.dds_available = value;
        break;
    case "assets_pvr_available":
        exports.assets.pvr_available = value;
        break;
    case "assets_min50_available":
        exports.assets.min50_available = value;
        break;
    case "audio":
        exports.sfx.webaudio = value;
        break;
    case "background_color":
        exports.defaults.background_color = value;
        break;
    case "bloom":
        exports.defaults.bloom = value;
        break;
    case "built_in_module_name":
        exports.paths.built_in_data_module = value;
        break;
    case "canvas_resolution_factor":
        exports.defaults.canvas_resolution_factor = value;
        break;
    case "console_verbose":
        exports.defaults.console_verbose = value;
        break;
    case "dof":
        exports.defaults.dof = value;
        break;
    case "do_not_load_resources":
        exports.defaults.do_not_load_resources = value;
        break;
    case "god_rays":
        exports.defaults.god_rays = value;
        break;
    case "stereo":
        exports.defaults.stereo = value;
        break;
    case "max_fps":
        exports.defaults.max_fps = value;
        break;
    case "max_fps_physics":
        exports.physics.max_fps = value;
        break;
    case "media_auto_activation":
        exports.defaults.media_auto_activation = value;
        break;
    case "motion_blur":
        exports.defaults.motion_blur = value;
        break;
    case "physics_enabled":
        exports.physics.enabled = value;
        break;
    case "physics_uranium_path":
        exports.physics.uranium_path = value;
        break;
    case "physics_calc_fps":
        exports.physics.calc_fps = value;
        break;
    case "physics_use_workers":
        exports.physics.use_workers = value;
        break;
    case "precision":
        exports.defaults.precision = value;
        break;
    case "prevent_caching":
        exports.assets.prevent_caching = value;
        break;
    case "quality":
        exports.defaults.quality = value;
        break;
    case "reflections":
        exports.defaults.reflections = value;
        break;
    case "refractions":
        exports.defaults.refractions = value;
        break;
    case "sfx_mix_mode":
        exports.sfx.mix_mode = value;
        break;
    // @deprecated
    case "shaders_dir":
    case "shaders_path":
        exports.paths.shaders_path = value;
        break;
    case "shadows":
        exports.defaults.shadows = value;
        break;
    case "show_hud_debug_info":
        exports.defaults.show_hud_debug_info = value;
        break;
    case "smaa":
        exports.defaults.smaa = value;
        break;
    case "smaa_search_texture_path":
        exports.paths.smaa_search_texture_path = value;
        break;
    case "smaa_area_texture_path":
        exports.paths.smaa_area_texture_path = value;
        break;
    case "ssao":
        exports.defaults.ssao = value;
        break;
    case "debug_view":
        exports.defaults.debug_view = value;
        break;
    case "enable_selectable":
        exports.defaults.enable_selectable = value;
        break;
    case "enable_outlining":
        exports.defaults.enable_outlining = value;
        break;
    case "outlining_overview_mode":
        exports.outlining.outlining_overview_mode = value;
        break;
    case "glow_materials":
        exports.defaults.glow_materials = value;
        break;
    case "url_params":
        exports.defaults.url_params = value;
        break;
    case "use_min50":
        exports.defaults.use_min50 = value;
        break;
    case "gl_debug":
        exports.defaults.gl_debug = value;
        break;
    case "srgb_type":
        exports.defaults.srgb_type = value;
        break;
    default:
        m_print.error("Unknown config property: " + prop);
        break;
    }
}

exports.get = function(prop) {
    switch (prop) {
    case "allow_cors":
        return exports.defaults.allow_cors;
    case "allow_hidpi":
        return exports.defaults.allow_hidpi;
    case "alpha":
        return exports.context.alpha;
    case "alpha_sort":
        return exports.defaults.alpha_sort;
    case "alpha_sort_threshold":
        return exports.defaults.alpha_sort_threshold;
    case "anaglyph_use":
        return exports.defaults.stereo == "ANAGLYPH";
    case "animation_framerate":
        return exports.animation.framerate;
    case "anisotropic_filtering":
        return exports.defaults.anisotropic_filtering;
    case "antialiasing":
        return exports.defaults.antialiasing;
    // @deprecated
    case "assets_dir":
    case "assets_path":
        return exports.assets.path;
    case "assets_dds_available":
        return exports.assets.dds_available;
    case "assets_pvr_available":
        return exports.assets.pvr_available;
    case "assets_min50_available":
        return exports.assets.min50_available;
    case "audio":
        return exports.sfx.webaudio;
    case "background_color":
        return exports.defaults.background_color;
    case "bloom":
        return exports.defaults.bloom;
    case "built_in_module_name":
        return exports.paths.built_in_data_module;
    case "canvas_resolution_factor":
        return exports.defaults.canvas_resolution_factor;
    case "console_verbose":
        return exports.defaults.console_verbose;
    case "dof":
        return exports.defaults.dof;
    case "do_not_load_resources":
        return exports.defaults.do_not_load_resources;
    case "is_mobile_device":
        return exports.defaults.is_mobile_device;
    case "god_rays":
        return exports.defaults.god_rays;
    case "stereo":
        return exports.defaults.stereo;
    case "max_fps":
        return exports.defaults.max_fps;
    case "max_fps_physics":
        return exports.physics.max_fps;
    case "media_auto_activation":
        return exports.defaults.media_auto_activation;
    case "motion_blur":
        return exports.defaults.motion_blur;
    case "physics_enabled":
        return exports.physics.enabled;
    case "physics_uranium_path":
        return exports.physics.uranium_path;
    case "physics_calc_fps":
        return exports.physics.calc_fps;
    case "physics_use_workers":
        return exports.physics.use_workers;
    case "precision":
        return exports.defaults.precision;
    case "prevent_caching":
        return exports.assets.prevent_caching;
    case "quality":
        return exports.defaults.quality;
    case "reflections":
        return exports.defaults.reflections;
    case "refractions":
        return exports.defaults.refractions;
    case "sfx_mix_mode":
        return exports.sfx.mix_mode;
    // @deprecated
    case "shaders_dir":
    case "shaders_path":
        return exports.paths.shaders_path;
    case "shadows":
        return exports.defaults.shadows;
    case "show_hud_debug_info":
        return exports.defaults.show_hud_debug_info;
    case "smaa":
        return exports.defaults.smaa;
    case "smaa_search_texture_path":
        return exports.paths.smaa_search_texture_path;
    case "smaa_area_texture_path":
        return exports.paths.smaa_area_texture_path;
    case "ssao":
        return exports.defaults.ssao;
    case "debug_view":
        return exports.defaults.debug_view;
    case "enable_selectable":
        return exports.defaults.enable_selectable;
    case "enable_outlining":
        return exports.defaults.enable_outlining;
    case "outlining_overview_mode":
        return exports.outlining.outlining_overview_mode;
    case "glow_materials":
        return exports.defaults.glow_materials;
    case "url_params":
        return exports.defaults.url_params;
    case "use_min50":
        return exports.defaults.use_min50;
    case "gl_debug":
        return exports.defaults.gl_debug;
    case "srgb_type":
        return exports.defaults.srgb_type;
    default:
        m_print.error("Unknown config property: " + prop);
        break;
    }
}

exports.reset = function() {
    for (var i in exports.context_save)
        exports.context[i] = exports.context_save[i];
    for (var i in exports.defaults_save)
        exports.defaults[i] = exports.defaults_save[i];
    for (var i in exports.assets_save)
        exports.assets[i] = exports.assets_save[i];
    for (var i in exports.physics_save)
        exports.physics[i] = exports.physics_save[i];
    for (var i in exports.scenes_save)
        exports.scenes[i] = exports.scenes_save[i];
    for (var i in exports.sfx_save)
        exports.sfx[i] = exports.sfx_save[i];
    for (var i in exports.debug_subs_save)
        exports.debug_subs[i] = exports.debug_subs_save[i];
}

exports.reset_limits = function() {
    for (var i in exports.context_limits_save)
        exports.context_limits[i] = exports.context_limits_save[i];
}

exports.is_built_in_data = is_built_in_data;
function is_built_in_data() {
    return b4w.module_check(exports.paths.built_in_data_module);
}

/**
 * Set configuration paths for shaders, uranium engine and smaa textures.
 */
exports.set_paths = function() {
    var cfg_pth = exports.paths;
    var cfg_phy = exports.physics;

    if (!is_built_in_data() && cfg_pth.shaders_path == "")
        cfg_pth.shaders_path = js_src_dir() + cfg_pth.shaders_path_default;

    if (cfg_phy.enabled && cfg_phy.uranium_path == "")
        cfg_phy.uranium_path = js_src_dir() +
                cfg_phy.uranium_path_default.replace("B4W_URANIUM_PATH=", "")
}

/**
 * Get path to the engine's source
 */
function js_src_dir() {
    var cfg_pth = exports.paths;

    var src_path = null;

    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src;

        for (var j = 0; j < cfg_pth.js_src_search_paths.length; j++) {
            var script_path = cfg_pth.js_src_search_paths[j];
            if (src.indexOf(script_path) >= 0) {
                src_path = src;
                break;
            }
        }

        if (src_path !== null)
            break;
    }

    if (!src_path) {
        m_print.warn("Couldn't determine path to ancillary resources, " +
                "fallback to the current page directory");
        src_path = document.location.href;
    }

    var index = src_path.indexOf("?");
    if (index >= 0)
        src_path = src_path.substring(0, index);

    return src_path.substring(0, src_path.lastIndexOf("/") + 1);
}

exports.get_std_assets_path = function() {
    var cfg_ass = exports.assets;

    if (cfg_ass.path)
        return cfg_ass.path;
    else {
        var cfg_ass_def = cfg_ass.path_default.replace("B4W_ASSETS_PATH=", "");

        if (is_app_url(cfg_ass_def))
            return cfg_ass_def;
        else
            return js_src_dir() + cfg_ass_def;
    }
}

function is_app_url(path) {
    if (!path)
        return false;

    var reg = /^(((.*?)\/\/)|(\/))/;

    return reg.test(path);
}

}
