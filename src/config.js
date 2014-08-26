"use strict";

/**
 * Config internal API.
 * @name config
 * @namespace
 * @exports exports as config
 */
b4w.module["__config"] = function(exports, require) {

var m_print = require("__print");
var m_util = require("__util");

// profiles
exports.P_LOW    = 1;  // maximize performance
exports.P_HIGH   = 2;  // use all requested features
exports.P_ULTRA  = 3;  // use all requested features and maximize quality
exports.P_CUSTOM = 4;  // use exports.defaults

exports.context = {
    alpha: true,
    antialias: false,
    premultipliedAlpha : true
}
exports.context_save = m_util.clone_object_r(exports.context);

exports.defaults = {
    alpha_sort               : true,

    alpha_sort_threshold     : 0.1,

    min_format_version       : 5.0,

    max_fps                  : 10000,

    console_verbose          : false,

    do_not_load_resources    : false,

    use_min50                : false,

    fps_measurement_interval : 1.5,

    fps_callback_interval    : 10,

    background_color         : [0.0, 0.0, 0.0, 0.0],

    force_selectable         : false,

    all_objs_selectable      : false,

    lod_transition_ratio     : 0.01,

    resolution_factor        : 1.0,

    texture_min_filter       : 3,

    anisotropic_filtering    : true,

    // init and show HUD on canvas provided by app
    show_hud_debug_info      : false,

    // required for DEPTH shadows
    depth_textures           : true,

    // "NONE", "RGBA", "RGBA_PCF", "DEPTH", "VSM"
    shadows                  : "DEPTH",

    anaglyph_use             : false,

    reflections              : true,

    reflect_multiplier       : 0.5,

    refractions              : true,

    glow                     : true,

    ssao                     : true,

    dof                      : true,

    god_rays                 : true,

    bloom                    : true,

    motion_blur              : true,

    compositing              : true,

    antialiasing             : true,

    smaa                     : false,

    wireframe_debug          : false,

    poly_offset_multiplier   : 1.0, 

    // properties updated from hardware capability
    foam                     : true,

    parallax                 : true,

    dynamic_grass            : true,

    procedural_fog           : true,

    water_dynamic            : true,

    shore_smoothing          : true,

    shore_distance           : true,

    // Windows ANGLE limits, returned by determine_max_bones()
    max_bones                : 53, 
    
    use_dds                  : true,

    precision                : "highp",

    deferred_rendering       : true,

    // quality profile
    quality                  : exports.P_HIGH,

    allow_vertex_textures    : true,

    glsl_unroll_hack         : false,

    no_phy_interp_hack       : false
}

exports.defaults_save = m_util.clone_object_r(exports.defaults);

exports.animation = {
    framerate: 24,
    frames_blending_hack: false,
    frame_steps: 1
}

exports.controls = {
    // x-right, y-forward, z-up, w-jump
    cam_trans_base_speed: [5, 5, 5, 5],
    // zoom is not forward
    // 10% speed multiplier for single notch
    cam_zoom_base_speed: 0.1,

    mouse_wheel_notch_multiplier: 1/120
}

exports.assets = {
    max_requests: 15,
    prevent_caching: true,
    min50_available: false,
    dds_available: false
}
exports.assets_save = m_util.clone_object_r(exports.assets);

exports.paths = {
    shaders_dir         : "../../shaders/",
    shaders_include_dir : "include/",
    shader_texts_module : "shader_texts",
    built_in_data_module : "built_in_data",
    smaa_search_texture_path: "../../external/deploy/apps/common/smaa_search_texture.png",
    smaa_area_texture_path: "../../external/deploy/apps/common/smaa_area_texture.png"
}

// physics config
exports.physics = {
    enabled: true,
    max_fps: 60,
    uranium_path: "../../external/deploy/apps/common/uranium.js"
}
exports.physics_save = m_util.clone_object_r(exports.physics);

exports.scenes = {
    // offscreen rendering texture_dimensions (x = y)

    // texture rendering
    offscreen_tex_size: 1.0*1024,

    // shadow rendering 
    shadow_tex_size: 2.0*1024,

    grass_tex_size: 2*512
}
exports.scenes_save = m_util.clone_object_r(exports.scenes);

exports.sfx = {
    webaudio  : true,
    mix_mode  : false
}
exports.sfx_save = m_util.clone_object_r(exports.sfx);

/**
 * Override default values of engine settings according to quality param
 */
exports.apply_quality = function() {

    var cfg_def = exports.defaults;
    var cfg_phy = exports.physics;
    var cfg_scs = exports.scenes;

    switch (cfg_def.quality) {

    case exports.P_ULTRA:

        cfg_def.shadows = "DEPTH",

        cfg_def.shore_smoothing = true,

        cfg_def.glow = true;

        cfg_def.ssao = true;

        cfg_def.dof = true;

        cfg_def.god_rays = true;

        cfg_def.bloom = true;

        cfg_def.reflections = true;

        cfg_def.reflect_multiplier = 1.0;

        cfg_def.refractions = true;

        cfg_def.foam = true;

        cfg_def.parallax = true;

        cfg_def.dynamic_grass = true;

        cfg_def.procedural_fog = true;

        cfg_def.resolution_factor = 1.75;

        cfg_scs.offscreen_tex_size = 2.0*1024;

        cfg_scs.shadow_tex_size = 4.0*1024;

        cfg_scs.grass_tex_size = 4.0*512;

        cfg_def.texture_min_filter = 3;

        cfg_def.anisotropic_filtering = true;

        cfg_def.use_min50 = false;

        cfg_def.max_bones = 53;

        cfg_def.precision = "highp";

        cfg_def.water_dynamic = true;

        cfg_def.shore_distance = true;

        cfg_def.antialiasing = true;

        cfg_def.smaa = true;

        cfg_def.compositing = true;

        cfg_def.motion_blur = true;

        cfg_phy.max_fps = 120;

        break;

    case exports.P_HIGH:
    
        cfg_def.shadows = "DEPTH";

        cfg_def.shore_smoothing = true;

        cfg_def.glow = true;

        cfg_def.ssao = true;

        cfg_def.dof = true;

        cfg_def.god_rays = true;

        cfg_def.bloom = true;

        cfg_def.reflections = true;

        cfg_def.reflect_multiplier = 0.5;

        cfg_def.refractions = true;

        cfg_def.foam = true;

        cfg_def.parallax = true;

        cfg_def.dynamic_grass = true;

        cfg_def.procedural_fog = true;

        cfg_def.resolution_factor = 1;

        cfg_scs.offscreen_tex_size = 1.0*1024;

        cfg_scs.shadow_tex_size = 2.0*1024;

        cfg_scs.grass_tex_size = 2*512;

        cfg_def.texture_min_filter = 3;

        cfg_def.anisotropic_filtering = true;

        cfg_def.use_min50 = false;

        cfg_def.max_bones = 53;

        cfg_def.precision = "highp";

        cfg_def.water_dynamic = true;

        cfg_def.shore_distance = true;

        cfg_def.antialiasing = true;

        cfg_def.smaa = false;

        cfg_def.compositing = true;

        cfg_def.motion_blur = true;

        cfg_phy.max_fps = 60;

        break;

    case exports.P_LOW:

        cfg_def.shadows = "NONE";

        cfg_def.shore_smoothing = false;

        cfg_def.glow = false;

        cfg_def.ssao = false;

        cfg_def.dof = false;

        cfg_def.god_rays = false;

        cfg_def.bloom = false;

        cfg_def.reflections = false;

        cfg_def.reflect_multiplier = 0.5;

        cfg_def.refractions = false;

        cfg_def.foam = false;

        cfg_def.parallax = false;

        cfg_def.dynamic_grass = false;

        cfg_def.procedural_fog = false;

        cfg_def.resolution_factor = 1; // can be 0.5

        cfg_scs.offscreen_tex_size = 0.5*1024;

        cfg_scs.shadow_tex_size = 1*1024;

        cfg_scs.grass_tex_size = 1*512;

        cfg_def.texture_min_filter = 2;

        cfg_def.anisotropic_filtering = false;

        cfg_def.use_min50 = true;

        cfg_def.max_bones = 53;

        cfg_def.precision = "mediump";

        cfg_def.water_dynamic = false;

        cfg_def.shore_distance = false;

        cfg_def.antialiasing = false;

        cfg_def.smaa = false;

        cfg_def.compositing = false;

        cfg_def.motion_blur = false;

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
    case "all_objs_selectable":
        exports.defaults.all_objs_selectable = value;
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
        exports.defaults.anaglyph_use = value;
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
    case "background_color":
        exports.defaults.background_color = value;
        break;
    case "built_in_module_name":
        exports.paths.built_in_data_module = value;
        break;
    case "console_verbose":
        exports.defaults.console_verbose = value;
        break;
    case "context_antialias":
        exports.context.antialias = value;
        break;
    case "deferred_rendering":
        exports.defaults.deferred_rendering = value;
        break;
    case "do_not_load_resources":
        exports.defaults.do_not_load_resources = value;
        break;
    case "force_selectable":
        exports.defaults.force_selectable = value;
        break;
    case "glow":
        exports.defaults.glow = value;
        break;
    case "physics_enabled":
        exports.physics.enabled = value;
        break;
    case "physics_uranium_path":
        exports.physics.uranium_path = value;
        break;
    case "precision":
        exports.defaults.precision = value;
        break;
    case "quality":
        exports.defaults.quality = value;
        break;
    case "resolution_factor":
        exports.defaults.resolution_factor = value;
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
    default:
        m_print.error("B4W config set - property unknown: " + prop);
        break;
    }
}

exports.get = function(prop) {
    switch (prop) {
    case "all_objs_selectable":
        return exports.defaults.all_objs_selectable;
    case "alpha":
        return exports.context.alpha;
    case "alpha_sort":
        return exports.defaults.alpha_sort;
    case "alpha_sort_threshold":
        return exports.defaults.alpha_sort_threshold;
    case "anaglyph_use":
        return exports.defaults.anaglyph_use;
    case "animation_framerate":
        return exports.animation.framerate;
    case "antialiasing":
        return exports.defaults.antialiasing;
    case "assets_dds_available":
        return exports.assets.dds_available;
    case "assets_min50_available":
        return exports.assets.min50_available;
    case "background_color":
        return exports.defaults.background_color;
    case "built_in_module_name":
        return exports.paths.built_in_data_module;    
    case "console_verbose":
        return exports.defaults.console_verbose;
    case "context_antialias":
        return exports.context.antialias;
    case "deferred_rendering":
        return exports.defaults.deferred_rendering;
    case "do_not_load_resources":
        return exports.defaults.do_not_load_resources;
    case "force_selectable":
        return exports.defaults.force_selectable;
    case "glow":
        return exports.defaults.glow;
    case "physics_enabled":
        return exports.physics.enabled;
    case "physics_uranium_path":
        return exports.physics.uranium_path;
    case "precision":
        return exports.defaults.precision;
    case "quality":
        return exports.defaults.quality;
    case "resolution_factor":
        return exports.defaults.resolution_factor;
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
    default:
        m_print.error("B4W config get - property unknown: " + prop);
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
}

}

