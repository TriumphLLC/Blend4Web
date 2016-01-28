/**
 * Copyright (C) 2014-2015 Triumph LLC
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

exports.context = {
    alpha              : true,
    antialias          : false,
    premultipliedAlpha : true
}
exports.context_save = m_util.clone_object_r(exports.context);

exports.defaults = {
    alpha_sort                 : true,

    alpha_sort_threshold       : 0.1,

    alpha_clip_filtering_hack  : false,

    min_format_version         : [5, 7],

    max_fps                    : 10000, // not accurate

    console_verbose            : false,

    do_not_load_resources      : false,

    use_min50                  : false,

    fps_measurement_interval   : 1.5,

    fps_callback_interval      : 10,

    background_color           : [0.0, 0.0, 0.0, 0.0],

    lod_transition_ratio       : 0.01,

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

    use_browser_distortion_cor : true,

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

    wireframe_debug            : false,

    water_wireframe_debug      : false,

    // properties updated from hardware capability
    foam                       : true,

    parallax                   : true,

    dynamic_grass              : true,

    procedural_fog             : true,

    water_dynamic              : true,

    shore_smoothing            : true,

    shore_distance             : true,

    max_texture_size           : 1024,

    max_cube_map_size          : 512,

    use_dds                    : true,

    precision                  : "highp",

    // quality profile
    quality                    : exports.P_HIGH,

    allow_vertex_textures      : true,

    no_phy_interp_hack         : false,

    shader_constants_hack      : false,

    disable_blend_shadows_hack : false,

    vert_anim_mix_normals_hack : false,

    is_mobile_device           : false,

    disable_doppler_hack       : false,

    cors_chrome_hack           : false,

    init_wa_context_hack       : false,

    clear_procedural_sky_hack  : false,

    sky_update_hack            : false,

    seq_video_fallback         : false,

    allow_hidpi                : false,

    gyro_use                   : false,

    firefox_shadows_slink_hack : false,

    mobile_firefox_media_hack  : false,

    enable_selectable          : true,

    enable_outlining           : true,

    glow_materials             : true,

    max_vertex_uniform_vectors : 128,

    ie11_edge_touchscreen_hack : false,

    ios_depth_hack             : false,

    macos_tex_reuse_hack       : false,

    loaded_data_version        : [0, 0],

    edge_min_tex_size_hack     : false,

    quality_aa_method          : true,

    amd_skinning_hack          : false,

    url_params                 : null,

    webgl2                     : true,

    msaa_samples               : 4,

    safari_canvas_alpha_hack   : false,

    resize_cubemap_canvas_hack : false,

    clear_depth_hack           : false,

    media_auto_activation      : true,

    max_cast_lamps             : 4,

    mac_os_shadow_hack         : false,

    allow_shaders_debug_ext    : false
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
    dir: "ASSETS=../../deploy/assets/",
    max_requests: 15,
    prevent_caching: true,
    min50_available: false,
    dds_available: false
}
exports.assets_save = m_util.clone_object_r(exports.assets);

exports.paths = {
    shaders_dir         : "",
    shaders_include_dir : "include/",
    shaders_postp_dir : "postprocessing/",

    built_in_data_module : "built_in_data",

    js_src_search_paths: [
        "b4w.min.js",
        "b4w.full.min.js",
        "b4w.simple.min.js",
        "b4w.whitespace.min.js",
        "src/b4w.js",
        "USER_DEFINED_MODULE"   // replaced when something compiled with the engine
    ],

    // relative to engine sources (default value for developer version)
    resources_dir: "../deploy/apps/common/",

    smaa_search_texture_path: "",
    smaa_area_texture_path: ""
}

// physics config
exports.physics = {
    enabled: true,
    max_fps: 60,
    uranium_path: "",
    calc_fps: false,
    ping: false,
    use_workers: true
}
exports.physics_save = m_util.clone_object_r(exports.physics);

exports.scenes = {
    grass_tex_size: 2*512,
    // default adjusted size
    cubemap_tex_size: 384,
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
    subs_type   : "DEPTH",
    subs_number : 0,
    slink_type  : "COLOR"
}
exports.debug_subs_save = m_util.clone_object_r(exports.debug_subs);

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

        cfg_def.procedural_fog = true;

        cfg_scs.grass_tex_size = 4.0*512;

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

        cfg_def.procedural_fog = true;

        cfg_scs.grass_tex_size = 2*512;

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

        cfg_def.procedural_fog = false;

        cfg_scs.grass_tex_size = 1*512;

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

        cfg_def.msaa_samples = 1;

        cfg_phy.max_fps = 60;

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
    case "antialiasing":
        exports.defaults.antialiasing = value;
        break;
    case "assets_dds_available":
        exports.assets.dds_available = value;
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
    case "built_in_module_name":
        exports.paths.built_in_data_module = value;
        break;
    case "canvas_resolution_factor":
        exports.defaults.canvas_resolution_factor = value;
        break;
    case "console_verbose":
        exports.defaults.console_verbose = value;
        break;
    case "do_not_load_resources":
        exports.defaults.do_not_load_resources = value;
        break;
    case "gyro_use":
        exports.defaults.gyro_use = value;
        break;
    case "stereo":
        exports.defaults.stereo = value;
        break;
    case "use_browser_distortion_cor":
        exports.defaults.use_browser_distortion_cor = value;
    case "media_auto_activation":
        exports.defaults.media_auto_activation = value;
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
    case "quality":
        exports.defaults.quality = value;
        break;
    case "sfx_mix_mode":
        exports.sfx.mix_mode = value;
        break;
    case "shaders_dir":
        exports.paths.shaders_dir = value;
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
    case "wireframe_debug":
        exports.defaults.wireframe_debug = value;
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
    case "antialiasing":
        return exports.defaults.antialiasing;
    case "assets_dds_available":
        return exports.assets.dds_available;
    case "assets_min50_available":
        return exports.assets.min50_available;
    case "audio":
        return exports.sfx.webaudio;
    case "background_color":
        return exports.defaults.background_color;
    case "built_in_module_name":
        return exports.paths.built_in_data_module;
    case "canvas_resolution_factor":
        return exports.defaults.canvas_resolution_factor;
    case "console_verbose":
        return exports.defaults.console_verbose;
    case "do_not_load_resources":
        return exports.defaults.do_not_load_resources;
    case "gyro_use":
        return exports.defaults.gyro_use;
    case "stereo":
        return exports.defaults.stereo;
    case "use_browser_distortion_cor":
        return exports.defaults.use_browser_distortion_cor;
    case "media_auto_activation":
        return exports.defaults.media_auto_activation;
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
    case "quality":
        return exports.defaults.quality;
    case "sfx_mix_mode":
        return exports.sfx.mix_mode;
    case "shaders_dir":
        return exports.paths.shaders_dir;
    case "show_hud_debug_info":
        return exports.defaults.show_hud_debug_info;
    case "smaa":
        return exports.defaults.smaa;
    case "smaa_search_texture_path":
        return exports.paths.smaa_search_texture_path;
    case "smaa_area_texture_path":
        return exports.paths.smaa_area_texture_path;
    case "wireframe_debug":
        return exports.defaults.wireframe_debug;
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
    default:
        m_print.error("Unknown config property: " + prop);
        break;
    }
}

exports.reset = function() {
    exports.context = m_util.clone_object_r(exports.context_save);
    exports.defaults = m_util.clone_object_r(exports.defaults_save);
    exports.assets = m_util.clone_object_r(exports.assets_save);
    exports.physics = m_util.clone_object_r(exports.physics_save);
    exports.scenes = m_util.clone_object_r(exports.scenes_save);
    exports.sfx = m_util.clone_object_r(exports.sfx_save);
    exports.debug_subs = m_util.clone_object_r(exports.debug_subs_save);
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

    if (!is_built_in_data() && cfg_pth.shaders_dir == "")
        cfg_pth.shaders_dir = js_src_dir() + "../shaders/";

    if (is_built_in_data()) {
        cfg_pth.smaa_search_texture_path = "smaa_search_texture.png";
        cfg_pth.smaa_area_texture_path = "smaa_area_texture.png";
    } else if (cfg_pth.smaa_search_texture_path == ""
            || cfg_pth.smaa_area_texture_path == "") {
        var resources_dir = js_src_dir() + cfg_pth.resources_dir;

        cfg_pth.smaa_search_texture_path = cfg_pth.smaa_search_texture_path ||
                resources_dir + "smaa_search_texture.png";
        cfg_pth.smaa_area_texture_path = cfg_pth.smaa_area_texture_path ||
                resources_dir + "smaa_area_texture.png";
    }

    if (cfg_phy.enabled && cfg_phy.uranium_path == "") {
        var resources_dir = js_src_dir() + cfg_pth.resources_dir;
        cfg_phy.uranium_path = resources_dir + "uranium.js";
    }
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
    return exports.assets.dir.replace("ASSETS=", "");
}

}
