"use strict";

b4w.register("viewer_main", function(exports, require) {

var m_anim     = require("animation");
var m_app      = require("app");
var m_assets   = require("assets");
var m_cam      = require("camera");
var m_cam_anim = require("camera_anim");
var m_cfg      = require("config");
var m_cons     = require("constraints");
var m_cont     = require("container");
var m_ctl      = require("controls");
var m_data     = require("data");
var m_debug    = require("debug");
var m_gp_conf  = require("gp_conf");
var m_hmd_conf = require("hmd_conf");
var m_geom     = require("geometry");
var m_gyro     = require("gyroscope");
var m_input    = require("input");
var m_lights   = require("lights");
var m_main     = require("main");
var m_hmd      = require("hmd");
var m_mixer    = require("mixer");
var m_mat      = require("material");
var m_nla      = require("nla");
var m_obj      = require("objects");
var m_rgb      = require("rgb");
var m_sshot    = require("screenshooter");
var m_scenes   = require("scenes");
var m_storage  = require("storage");
var m_trans    = require("transform");
var m_util     = require("util");
var m_version  = require("version");

var m_vec3 = require("vec3");

var DEBUG = (m_version.type() === "DEBUG");
var AUTO_VIEW_INTERVAL = 1000;
var AUTO_ROTATE_RATIO  = 0.3;
var DEFAULT_SCENE     = "misc/logo.json";
var DEFAULT_NAME      = "Logo";

var TO_RAD = Math.PI/180;
var TO_DEG = 180/Math.PI;

var DEC_SLIDER = 188;
var INC_SLIDER = 190;

var ANIM_OBJ_DEFAULT_INDEX = 0;
var ANIM_NAME_DEFAULT_INDEX = 0;

var _vec2_tmp  = new Float32Array(2);
var _vec3_tmp  = new Float32Array(3);
var _vec3_tmp2 = new Float32Array(3);

// TODO switch off images not-cache

var _anim_obj = null;
var _shape_key_obj = null;
var _shape_key_name = "";

var _object_info_elem = null;
var _lights_elem = null;

var _selected_object = null;
var _object_selected_callback = function() {};
var _controlled_object = null;
var _dist_to_camera = null;

exports.init = function() {
    m_storage.init("b4w_viewer");
    set_quality_config();
    set_stereo_view_config();
    set_outlining_overview_mode_config();

    m_app.init({
        canvas_container_id: "main_canvas_container",
        callback: init_cb,
        autoresize: false,
        gl_debug: get_enable_gl_debug_config(),
        show_hud_debug_info: get_show_hud_debug_info_config(),
        sfx_mix_mode: get_mix_mode_config(),
        min_capabilities: get_min_capabilities_config(),
        show_fps: true,
        fps_elem_id: "fps_logger",
        fps_wrapper_id: "fps_container",

        // engine config
        alpha : true,
        assets_dds_available: !DEBUG,
        assets_min50_available: !DEBUG,
        console_verbose: true,
        physics_enabled: true,
        debug_view: true
    });
}

function init_cb(canvas_elem, success) {
    if (!success) {
        console.log("b4w init failure");
        return null;
    }

    // disable context menu
    window.oncontextmenu = function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };

    // disable drag
    window.ondragstart = function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };

    window.addEventListener("resize", on_resize, false);

    var tmp_event = document.createEvent("CustomEvent");
    tmp_event.initEvent("resize", false, false);
    window.dispatchEvent(tmp_event);

    if (!m_main.detect_mobile())
        forbid_elem(["gyro_use_tmp"], "disable");

    if (!m_hmd_conf.check())
        forbid_elem(["hmd_conf_tmp"], "disable");

    var url_params = m_app.get_url_params();

    init_ui();
    var url = url_params && url_params["load"] ? url_params["load"] : "";
    process_scene(url, false);
}

function assign_sliders_controls() {
    $(document).ready(function() {
        $(".ui-slider-handle").off("keydown");
        $(".ui-slider-handle").on("keydown",function(e) {
            var slider_id = this.parentElement.parentElement.children[0].getAttribute("id");
            if (!slider_id)
                return;
            var slider_value = parseFloat(document.getElementById(slider_id).value);
            var slider_step = parseFloat(document.getElementById(slider_id).getAttribute("step"));
            if (e.keyCode == DEC_SLIDER)
                set_slider(slider_id, slider_value - slider_step);
            if (e.keyCode == INC_SLIDER)
                set_slider(slider_id, slider_value + slider_step);
        });
    });
}

function get_selected_object() {
    return _selected_object;
}

function main_canvas_clicked(x, y) {
    if (!_object_info_elem || !m_scenes.can_select_objects())
        return;

    hide_element("material_warning");

    var prev_obj = get_selected_object();

    if (prev_obj && m_scenes.outlining_is_enabled(prev_obj))
        m_scenes.clear_outline_anim(prev_obj);

    var obj = m_scenes.pick_object(x, y);

    if (obj && m_obj.is_empty(obj))
        return;

    _selected_object = obj;

    if (obj) {
        _object_selected_callback(obj);
    } else
        forbid_material_params();

    set_object_info();

    if (_controlled_object)
        return;

    if (obj) {
        _controlled_object = obj;
        set_object_info();
        m_app.enable_object_controls(obj);
        m_ctl.create_kb_sensor_manifold(obj, "QUIT", m_ctl.CT_SHOT, m_ctl.KEY_Q,
                function(obj, id, value, pulse) {
                    _controlled_object = null;
                    set_object_info();
                    m_app.disable_object_controls(obj);
                });
    } else
        enable_camera_controls();
}

function enable_camera_controls() {
    var obj = m_scenes.get_active_camera();

    _controlled_object = obj;
    set_object_info();

    m_app.enable_camera_controls(false, false, false, m_cont.get_container(), true);
    m_ctl.create_kb_sensor_manifold(obj, "QUIT", m_ctl.CT_SHOT, m_ctl.KEY_Q,
            function(obj, id, value, pulse) {
                _controlled_object = null;
                set_object_info();
                m_app.disable_camera_controls(obj);
                m_ctl.remove_sensor_manifold(obj, "ZOOM_TO");
            });

    // create additional zoom control
    var key_z = m_ctl.create_keyboard_sensor(m_ctl.KEY_Z);
    var key_dec_point = m_ctl.create_keyboard_sensor(m_ctl.KEY_DEC_POINT);

    var zoom_to_array = [key_z, key_dec_point];
    var zoom_to_logic = function(s) {
        return s[0] || s[1];
    }
    var zoom_to_cb = function(obj, id, pulse) {
        var selobj = get_selected_object();
        if (selobj)
            m_cam.target_zoom_object(obj, selobj);
    }

    m_ctl.create_sensor_manifold(obj, "ZOOM_TO", m_ctl.CT_SHOT, zoom_to_array,
            zoom_to_logic, zoom_to_cb);
}

function set_object_info() {
    if (!_object_info_elem)
        return;

    var controlled_str = _controlled_object ?
            object_to_interface_name(_controlled_object) : "NONE";
    var selected_str = _selected_object ?
            object_to_interface_name(_selected_object) : "NONE";

    var info = "CONTROLLED: " + controlled_str + " | SELECTED: " + selected_str;

    var obj = get_selected_object();

    if(obj) {
        var mesh_type = m_scenes.get_type_mesh_object(obj);
        if (mesh_type)
            info += " | TYPE: " + mesh_type;
    }

    var controlled_obj = get_controlled_object();

    if (_selected_object && controlled_obj &&
            controlled_obj.type === "CAMERA")
        info += " | DISTANCE: " + _dist_to_camera;

    _object_info_elem.innerHTML = info;
}

function get_controlled_object() {
    return _controlled_object;
}

function init_ui() {
    _object_info_elem = document.getElementById("info_left_down");
    _lights_elem = document.getElementById("lights_cont");

    // build date
    document.getElementById("build_date").innerHTML = m_version.date_str();

    // general buttons
    bind_control(save_quality_and_reload, "quality", "string");
    refresh_quality_ui();

    m_app.set_onclick("reset", reset_clicked);
    m_app.set_onclick("auto_rotate_cam", auto_rotate_cam);
    m_app.set_onclick("pause", pause_clicked);
    m_app.set_onclick("resume", resume_clicked);
    m_app.set_onclick("home", home_clicked);

    // animation
    bind_control(set_animation_params, "anim_active_object", "string");
    bind_control(set_animation_params, "animation", "string");
    bind_control(set_animation_params, "anim_mix_factor", "number");
    bind_control(set_animation_params, "anim_slot", "number");
    bind_control(set_animation_params, "anim_cyclic", "bool");
    bind_control(set_animation_params, "anim_frame_current", "number");
    m_app.set_onclick("anim_play", anim_play_clicked);
    m_app.set_onclick("anim_stop", anim_stop_clicked);
    m_app.set_onclick("anim_play_all", anim_play_all_clicked);
    m_app.set_onclick("anim_stop_all", anim_stop_all_clicked);

    // nla
    bind_control(set_nla_params, "nla_frame_current", "number");
    m_app.set_onclick("nla_play", nla_play_clicked);
    m_app.set_onclick("nla_stop", nla_stop_clicked);

    //shape keys
    bind_control(set_shape_keys_params, "shape_key_obj", "string");
    bind_control(set_shape_keys_params, "shape_key_name", "string");
    bind_control(set_shape_keys_params, "shape_key_value", "number");

    // materials
    bind_control(set_material_params, "material_name", "string");
    bind_colpick(set_material_params, "material_diffuse_color");
    bind_control(set_material_params, "material_reflectivity", "number");
    bind_control(set_material_params, "material_fresnel", "number");
    bind_control(set_material_params, "material_fresnel_factor", "number");
    bind_control(set_material_params, "material_parallax_scale", "number");
    bind_control(set_material_params, "material_parallax_steps", "number");

    // water_materials
    bind_control(set_water_material_params, "material_name", "string");
    bind_control(set_water_material_params, "shore_smoothing", "bool");
    bind_control(set_water_material_params, "absorb_factor", "number");
    bind_control(set_water_material_params, "sss_strength", "number");
    bind_control(set_water_material_params, "sss_width", "number");
    bind_colpick(set_water_material_params, "water_fog_color");
    bind_control(set_water_material_params, "water_fog_density", "number");
    bind_colpick(set_water_material_params, "shallow_water_col");
    bind_control(set_water_material_params, "shallow_water_col_fac", "number");
    bind_colpick(set_water_material_params, "shore_water_col");
    bind_control(set_water_material_params, "shore_water_col_fac", "number");
    bind_control(set_water_material_params, "foam_factor", "number");
    bind_control(set_water_material_params, "norm_uv_velocity", "number");
    bind_control(set_water_material_params, "water_dynamic", "bool");
    bind_control(set_water_material_params, "waves_height", "number");
    bind_control(set_water_material_params, "waves_length", "number");
    bind_control(set_water_material_params, "dst_noise_scale0", "number");
    bind_control(set_water_material_params, "dst_noise_scale1", "number");
    bind_control(set_water_material_params, "dst_noise_freq0", "number");
    bind_control(set_water_material_params, "dst_noise_freq1", "number");
    bind_control(set_water_material_params, "dir_min_shore_fac", "number");
    bind_control(set_water_material_params, "dir_freq", "number");
    bind_control(set_water_material_params, "dir_noise_scale", "number");
    bind_control(set_water_material_params, "dir_noise_freq", "number");
    bind_control(set_water_material_params, "dir_min_noise_fac", "number");
    bind_control(set_water_material_params, "dst_min_fac", "number");
    bind_control(set_water_material_params, "waves_hor_fac", "number");

    // ambient
    bind_control(set_ambient_params, "environment_energy", "string");
    bind_colpick(set_ambient_params, "horizon_color");
    bind_colpick(set_ambient_params, "zenith_color");

    // lighting
    bind_control(set_lighting_params, "light_name", "string");
    bind_colpick(set_lighting_params, "light_color");
    bind_control(set_lighting_params, "pre_light_energy", "number");
    bind_control(set_lighting_params, "rude_light_energy", "number");
    bind_control(set_lighting_params, "light_spot_size", "number");
    bind_control(set_lighting_params, "light_spot_blend", "number");
    bind_control(set_lighting_params, "light_distance", "number");
    bind_colpick(set_sky_params, "sky_color");
    bind_control(set_sky_params, "rayleigh_brightness", "number");
    bind_control(set_sky_params, "mie_brightness", "number");
    bind_control(set_sky_params, "spot_brightness", "number");
    bind_control(set_sky_params, "scatter_strength", "number");
    bind_control(set_sky_params, "rayleigh_strength", "number");
    bind_control(set_sky_params, "mie_strength", "number");
    bind_control(set_sky_params, "rayleigh_collection_power", "number");
    bind_control(set_sky_params, "mie_collection_power", "number");
    bind_control(set_sky_params, "mie_distribution", "number");

    bind_control(set_time_date, "date", "string");
    bind_control(set_time_date, "day_time", "number");
    bind_control(set_sun_params, "sun_horizontal_position", "number");
    bind_control(set_sun_params, "sun_vertical_position", "number");
    bind_control(set_max_sun_angle, "max_sun_angle", "number");
    m_app.set_onclick("run_sun", run_sun_clicked);
    m_app.set_onclick("stop_sun", stop_sun_clicked);

    // shadows
    bind_control(set_shadow_params, "csm_first_cascade_border", "number");
    bind_control(set_shadow_params, "csm_last_cascade_border", "number");
    bind_control(set_shadow_params, "self_shadow_polygon_offset", "number");
    bind_control(set_shadow_params, "self_shadow_normal_offset", "number");
    bind_control(set_shadow_params, "first_cascade_blur_radius", "number");
    bind_control(set_shadow_params, "last_cascade_blur_radius", "number");

    // ssao
    bind_control(set_ssao_params, "ssao_quality", "string");
    bind_control(set_ssao_params, "ssao_hemisphere", "bool");
    bind_control(set_ssao_params, "ssao_blur_depth", "bool");
    bind_control(set_ssao_params, "ssao_blur_discard_value", "number");
    bind_control(set_ssao_params, "ssao_radius_increase", "number");
    bind_control(set_ssao_params, "ssao_influence", "number");
    bind_control(set_ssao_params, "ssao_dist_factor", "number");
    bind_control(set_ssao_params, "ssao_only", "bool");
    bind_control(set_ssao_params, "ssao_white", "bool");

    // fog
    bind_control(set_fog_params, "fog_intensity", "number");
    bind_control(set_fog_params, "fog_depth", "number");
    bind_control(set_fog_params, "fog_start", "number");
    bind_control(set_fog_params, "fog_height", "number");

    // dof
    bind_control(set_dof_params, "dof_distance", "number");
    bind_control(set_dof_params, "dof_front_start", "number");
    bind_control(set_dof_params, "dof_front_end", "number");
    bind_control(set_dof_params, "dof_rear_start", "number");
    bind_control(set_dof_params, "dof_rear_end", "number");
    bind_control(set_dof_params, "dof_power", "number");
    bind_control(set_dof_params, "dof_bokeh_intensity", "number");
    bind_control(set_dof_params, "dof_on", "bool");

    // god_rays
    bind_control(set_god_rays_params, "god_rays_intensity", "number");
    bind_control(set_god_rays_params, "god_rays_max_ray_length", "number");
    bind_control(set_god_rays_params, "god_rays_steps", "number");

    // color correction
    bind_control(set_color_correction_params, "brightness", "number");
    bind_control(set_color_correction_params, "contrast", "number");
    bind_control(set_color_correction_params, "exposure", "number");
    bind_control(set_color_correction_params, "saturation", "number");

    // audio mixer
    bind_control(set_mix_mode_and_reload, "sfx_mix_mode", "bool");
    refresh_mix_mode_ui();

    // stereo view
    bind_control(set_stereo_view_and_reload, "stereo", "string");
    refresh_stereo_view_ui();

    // HMD settings
    m_app.set_onclick("hmd_settings", show_hmd_config);

    // gyroscope use
    bind_control(set_gyro_cam_rotate_reload, "gyro_use", "bool");
    refresh_gyro_use_ui();

    //gamepads
    bind_control(hide_show_gmpd_config, "gmpd_settings", "bool");

    // wind
    bind_control(set_wind_params, "wind_dir", "number");
    bind_control(set_wind_params, "wind_strength", "number");

    //motion blur
    bind_control(set_mb_params, "mb_factor", "number");
    bind_control(set_mb_params, "mb_decay_threshold", "number");

    // bloom
    bind_control(set_bloom_params, "bloom_key", "number");
    bind_control(set_bloom_params, "bloom_blur", "number");
    bind_control(set_bloom_params, "bloom_edge_lum", "number");

    // glow material
    bind_control(set_glow_material_params, "small_glow_mask_coeff", "number");
    bind_control(set_glow_material_params, "large_glow_mask_coeff", "number");
    bind_control(set_glow_material_params, "small_glow_mask_width", "number");
    bind_control(set_glow_material_params, "large_glow_mask_width", "number");

    // debug
    bind_control(set_canvas_resolution_factor, "canvas_rf", "number");
    bind_control(set_debug_params, "debug_view_mode", "string");
    m_app.set_onclick("debug_change_colors", debug_change_colors_clicked);
    bind_control(set_render_time_threshold, "render_time_threshold", "number");
    bind_colpick(set_debug_params, "wireframe_edge_color", "object");
    bind_control(set_hud_debug_info_and_reload, "show_hud_debug_info", "bool"); //TODO
    bind_control(set_enable_gl_debug_and_reload, "enable_gl_debug", "bool");
    bind_control(set_outlining_overview_mode, "outlining_overview_mode", "bool");
    refresh_outlining_overview_mode_ui();
    m_app.set_onclick("make_screenshot", make_screenshot_clicked);
    refresh_debug_info_ui();
    bind_control(set_min_capabilities_and_reload, "min_capabilities", "bool");
    refresh_min_capabilities_ui();

    assign_sliders_controls();
}

function fill_select_options(elem_id, values) {

    var elem = document.getElementById(elem_id);
    elem.innerHTML = "";

    for (var i = 0; i < values.length; i++) {
        var opt = document.createElement("option");
        opt.text = opt.value = values[i];
        if (i === 0)
            opt.selected = true;
        elem.appendChild(opt);
    }

    $("#" + elem_id).selectmenu();
    $("#" + elem_id).selectmenu("refresh");
}

function reset_settings_to_default() {

    if (_lights_elem)
        for (var i = 0; i <_lights_elem.children.length; i++)
            _lights_elem.children[i].style.visibility = "hidden";

    _anim_obj = null;
    _shape_key_obj = null;
}

function process_scene(url, call_reset_b4w) {
    reset_settings_to_default();

    if (url) {
        var url_elems = url.split("/");
        var name = url_elems[url_elems.length - 1].split(".")[0]
    } else {
        var url = m_cfg.get_std_assets_path() + DEFAULT_SCENE;
        var name = "Logo";
    }

    if (call_reset_b4w)
        reset_b4w();

    switch_canvas_click(false);
    m_debug.clear_errors_warnings();

    // update ui
    var cf_elem = document.getElementById("current_file");
    cf_elem.innerHTML = name;
    cf_elem.setAttribute("title", name + " (" + url + ")");

    // load
    m_data.load(url, loaded_callback, preloader_callback, false);
}

function mouse_cb() {
    var canvas_elem = m_cont.get_canvas();
    var mdevice = m_input.get_device_by_type_element(m_input.DEVICE_MOUSE, canvas_elem);
    var loc = m_input.get_vector_param(mdevice, m_input.MOUSE_LOCATION, _vec2_tmp);
    main_canvas_clicked(loc[0], loc[1]);
}

function touch_cb(touches) {
    for (var i = 0; i < touches.length; i++)
        main_canvas_clicked(touches[i].clientX, touches[i].clientY);
}

function switch_canvas_click(is_enable) {
    var canvas_elem = m_cont.get_canvas();

    var mdevice = m_input.get_device_by_type_element(m_input.DEVICE_MOUSE, canvas_elem);
    if (mdevice)
        if (is_enable)
            m_input.attach_param_cb(mdevice, m_input.MOUSE_DOWN_WHICH, mouse_cb);
        else
            m_input.detach_param_cb(mdevice, m_input.MOUSE_DOWN_WHICH, mouse_cb);

    var tdevice = m_input.get_device_by_type_element(m_input.DEVICE_TOUCH, canvas_elem);
    if (tdevice)
        if (is_enable)
            m_input.attach_param_cb(tdevice, m_input.TOUCH_START, touch_cb);
        else
            m_input.detach_param_cb(tdevice, m_input.TOUCH_START, touch_cb);
}

function loaded_callback(data_id) {
    switch_canvas_click(true);

    _selected_object = null;
    prepare_scenes();

    enable_camera_controls();
    m_app.enable_debug_controls();

    if (get_mix_mode_config())
        m_mixer.enable_mixer_controls();

    if (m_storage.get("gyro_use") === "true")
        m_gyro.enable_camera_rotation();

    if (m_cfg.get("stereo") == "HMD") {
        m_hmd_conf.update();
        m_hmd.enable_hmd(m_hmd.HMD_ALL_AXES_MOUSE_NONE);
    }

    m_main.set_render_callback(render_callback);

    var elapsed = m_ctl.create_elapsed_sensor();
    var cam_dist_cb = function(obj, id, pulse) {
        if (pulse == 1 && _selected_object) {
            var sel_obj = get_selected_object();

            if (sel_obj) {
                var sel_obj_pos = _vec3_tmp;
                var calc_bs_center = true;
                m_trans.get_object_center(sel_obj, calc_bs_center, sel_obj_pos);
                var cam_eye = m_cam.get_translation(obj, _vec3_tmp2);
                var dist = m_vec3.dist(sel_obj_pos, cam_eye);
                _dist_to_camera = dist.toFixed(3);
            }

            set_object_info();
        }
    }
    m_ctl.create_sensor_manifold(m_scenes.get_active_camera(), "TO_OBJ",
            m_ctl.CT_CONTINUOUS, [elapsed], null, cam_dist_cb);
}

function preloader_callback(percentage, load_time) {
    var lp_elem = document.getElementById("loading_progress");
    lp_elem.innerHTML = percentage + "% (" +
        Math.round(10 * load_time / 1000)/10 + "s)";

    var errors = m_debug.get_error_quantity();
    var warnings = m_debug.get_warning_quantity();

    // bpy data loaded
    if (m_data.is_primary_loaded()) {
        on_resize();
        add_error_tooltip();

        if (!warnings && !errors) {
            _lights_elem.children[0].style.visibility = 'hidden';
            _lights_elem.children[1].style.visibility = 'hidden';
            _lights_elem.children[2].style.visibility = 'visible';
        }
    }

    if (warnings && !errors) {
        _lights_elem.children[0].style.visibility = 'hidden';
        _lights_elem.children[1].style.visibility = 'visible';
        _lights_elem.children[2].style.visibility = 'hidden';
    }

    if (errors) {
        _lights_elem.children[0].style.visibility = 'visible';
        _lights_elem.children[1].style.visibility = 'hidden';
        _lights_elem.children[2].style.visibility = 'hidden';
    }

    // data and resources loaded
    //if (percentage >= 100)
}

function add_error_tooltip() {
    var errors = m_debug.get_error_quantity();
    var warnings = m_debug.get_warning_quantity();

    if (warnings || errors)
        _lights_elem.setAttribute("title",
                                  "Errors: " + errors + ", " +
                                  "Warnings: " + warnings + "\n" +
                                  "See browser console for more info");
    else
        _lights_elem.setAttribute("title", "Loaded OK");
}

function display_scene_stats() {
    var verts = m_debug.num_vertices();
    var tris = m_debug.num_triangles();
    var calls = m_debug.num_draw_calls();
    var shaders = m_debug.num_shaders();

    document.getElementById("info_right_up").innerHTML =
        verts + " verts" + ", " + tris + " tris" + ", " +
        calls + " draw calls" + ", " + shaders + " shaders";

    var gstats = m_debug.geometry_stats();
    var texinfo = m_debug.num_textures();
    var rtinfo = m_debug.num_render_targets();

    var mem_geom = Math.round(10 * (gstats.ibo_memory + gstats.vbo_memory)) / 10;
    var trash_geom = (m_debug.calc_vbo_garbage_byte_size() / Math.pow(1024, 2)).toFixed(1);
    var mem_tex = Math.round(10 * texinfo.memory) / 10;
    var mem_rts = Math.round(10 * rtinfo.memory) / 10;
    var mem_total = Math.round(10 * (mem_geom + mem_tex + mem_rts)) / 10;

    document.getElementById("info_right_down").innerHTML =
        "Geometry: " + mem_geom + " MiB (" + trash_geom + " junk)<br>" +
        "Textures: " + mem_tex + " MiB (" + texinfo.number + ")<br>" +
        "RTs: " + mem_rts + " MiB (" + rtinfo.number + ")<br><br>" +
        "Total: " + mem_total + " MiB";
}

function prepare_scenes() {
    var main_scene_name = m_scenes.get_active();

    // ALL SCENES EXCEPT MAIN

    var scene_names = m_scenes.get_scenes();

    for (var i = 0; i < scene_names.length; i++) {
        var name = scene_names[i];
        if (name == main_scene_name)
            continue;

        change_apply_scene_settings(name);
    }

    // MAIN SCENE

    change_apply_scene_settings(main_scene_name);

    // ui for changing material color
    _object_selected_callback = function(obj) {
        var mat_names = m_mat.get_materials_names(obj);
        fill_select_options("material_name", mat_names);
        get_material_params(obj, mat_names[0]);
        get_water_material_params(obj, mat_names[0]);
    };

    get_ambient_params();

    // init lights list
    var lights = m_scenes.get_all_objects("LAMP");
    var lnames = [];
    for (var i = 0; i < lights.length; i ++)
        lnames.push(object_to_interface_name(lights[i]));

    fill_select_options("light_name", lnames);
    if (lights.length > 0)
        get_lighting_params(lights[0]);

    get_shadow_params();
    get_ssao_params();
    get_fog_params();
    get_dof_params();
    get_god_rays_params();
    get_color_correction_params();
    get_wind_params();
    get_sun_params();
    get_sky_params();
    get_mb_params();
    get_bloom_params();
    get_glow_material_params();
    check_lighting_params();
    forbid_material_params();
    prepare_debug_params();

    var date = new Date(document.getElementById("date").value);
    set_time_date({"date": date});
}

function change_apply_scene_settings(scene_name) {
    m_scenes.set_active(scene_name);
    var camera = m_scenes.get_active_camera();

    // init anim active objects list
    var anim_obj_names = [];
    var scene_objs = m_scenes.get_all_objects();
    for (var i = 0; i < scene_objs.length; i++) {
        var sobj = scene_objs[i];
        if (m_anim.is_animated(sobj)) {
            if (!_anim_obj)
                _anim_obj = sobj;
            anim_obj_names.push(object_to_interface_name(sobj));
        }
    }

    var anim_param_names = ["anim_active_object",
                            "anim_slot",
                            "animation",
                            "anim_cyclic",
                            "anim_frame_range",
                            "anim_mix_factor",
                            "anim_frame_current",
                            "anim_play",
                            "anim_stop"];

    if (_anim_obj) {
        forbid_params(anim_param_names, "enable");
        fill_select_options("anim_active_object", anim_obj_names);
        set_animation_params({anim_active_object : object_to_interface_name(_anim_obj)});
    } else
        forbid_params(anim_param_names, "disable");

    var nla_params = ["nla_play",
                     "nla_stop",
                     "nla_status",
                     "nla_frame_current",
                     "nla_playing"];
    var nla_all_params = ["nla_frame_range"];
    if (m_nla.check_nla()) {
        if (!m_nla.check_logic_nodes())
            forbid_params(nla_params, "enable");
        else {
            forbid_params(nla_params, "disable");
            var elem_status = document.getElementById("nla_status");
            elem_status.innerHTML = "CONTROLLED BY LOGIC NODES";
        }
        forbid_params(nla_all_params, "enable");
        update_nla_info();
    } else {
        forbid_params(nla_params, "disable");
        forbid_params(nla_all_params, "disable");
    }

    // init shape keys

    var shape_keys_objs_names = [];
    for (var i = 0; i < scene_objs.length; i++) {
        var sobj = scene_objs[i];
        if (m_geom.check_shape_keys(sobj)) {
            if (!_shape_key_obj)
                _shape_key_obj = sobj;
            shape_keys_objs_names.push(object_to_interface_name(sobj));
        }
    }

    var shape_keys_params = ["shape_key_obj",
                            "shape_key_name",
                            "shape_key_value",];
    if (_shape_key_obj) {
        forbid_params(shape_keys_params, "enable");
        fill_select_options("shape_key_obj", shape_keys_objs_names);
        set_shape_keys_params({shape_key_obj : object_to_interface_name(_shape_key_obj)});
    } else
        forbid_params(shape_keys_params, "disable");
}

function render_callback(elapsed, current_time) {
    var camera = m_scenes.get_active_camera();

    if (_anim_obj) {
        var elem_status = document.getElementById("anim_status");
        var slot_num = parseInt(document.getElementById("anim_slot").value);

        if (m_anim.is_play(_anim_obj, slot_num)) {
            var frame = Math.round(m_anim.get_frame(_anim_obj, slot_num));
            if (parseInt($("#anim_frame_current").val()) !== frame)
                set_slider("anim_frame_current", frame);
            elem_status.innerHTML = "PLAYING";
        } else
            elem_status.innerHTML = "STOPPED";
    }
    if (m_nla.check_nla()) {

        if (!m_nla.check_logic_nodes()) {
            var elem_status = document.getElementById("nla_status");
            if (m_nla.is_play())
                elem_status.innerHTML = "PLAYING";
            else
                elem_status.innerHTML = "STOPPED";
        }
        var frame = parseInt(m_nla.get_frame().toFixed(0));
        if (m_nla.is_play() && parseInt($("#nla_frame_current").val()) !== frame)
            set_slider("nla_frame_current", frame);
    }
}

function reset_b4w() {
    // scene only, context still persists
    m_main.clear_render_callback();
    m_data.cleanup();
}

/*
 * UI button callbacks
 */

// quality
function set_quality_config() {
    var quality = m_storage.get("quality");

    if (!quality)
        return;

    switch (quality) {
    case "ULTRA":
        var qual = m_cfg.P_ULTRA;
        break;
    case "HIGH":
        var qual = m_cfg.P_HIGH;
        break;
    case "LOW":
        var qual = m_cfg.P_LOW;
        break;
    case "CUSTOM":
        var qual = m_cfg.P_CUSTOM;
        break;
    }

    m_cfg.set("quality", qual);
}

function refresh_quality_ui() {
    var qual = m_cfg.get("quality");

    switch (qual) {
    case m_cfg.P_ULTRA:
        var quality = "ULTRA";
        var opt_index = 0;
        break;
    case m_cfg.P_HIGH:
        var quality = "HIGH";
        var opt_index = 1;
        break;
    case m_cfg.P_LOW:
        var quality = "LOW";
        var opt_index = 2;
        break;
    case m_cfg.P_CUSTOM:
        var quality = "CUSTOM";
        var opt_index = 3;
        break;
    }

    document.getElementById("quality").options[opt_index].selected = true;
    $("#quality").selectmenu("refresh");
}

function save_quality_and_reload(value) {
    m_storage.set("quality", value.quality);

    setTimeout(function() {
        window.location.reload();
    }, 100);
}

function reset_clicked() {
    m_storage.cleanup();
    // NOTE: remove load=... as only the one param used by Viewer
    var new_href = window.location.href.replace(/load=.*?(&|$)/, "").
            replace(/(&|\?)$/, "");
    window.location.href = new_href;
}

function home_clicked() {
    process_scene(null, true);
}

function pause_clicked() {
    m_main.pause();
}

function resume_clicked() {
    m_main.resume();
}

function get_mix_mode_config() {
    if (m_storage.get("sfx_mix_mode") === "true")
        return true;
    else
        return false;
}

function get_show_hud_debug_info_config() {
    if (m_storage.get("show_hud_debug_info") === "true")
        return true;
    else
        return false;
}

function get_enable_gl_debug_config() {
    if (m_storage.get("enable_gl_debug") == "")
        return false;
    else
        return m_storage.get("enable_gl_debug") === "true";
}

function set_stereo_view_config() {
    m_cfg.set("stereo", m_storage.get("stereo") || "NONE");
}

function set_outlining_overview_mode_config() {
    if (m_storage.get("outlining_overview_mode") == "")
        m_cfg.set("outlining_overview_mode", true)
    else
        m_cfg.set("outlining_overview_mode", m_storage.get("outlining_overview_mode") === "true");
}

function refresh_debug_info_ui() {
    var opt_index = Number(m_storage.get("show_hud_debug_info") === "true");
    document.getElementById("show_hud_debug_info").options[opt_index].selected = true;
    $("#show_hud_debug_info").slider("refresh");

    if (m_storage.get("enable_gl_debug") == "")
        var opt_index = 0;
    else
        var opt_index = Number(m_storage.get("enable_gl_debug") === "true");
    document.getElementById("enable_gl_debug").options[opt_index].selected = true;
    $("#enable_gl_debug").slider("refresh");
}

function set_hud_debug_info_and_reload(value) {
    m_storage.set("show_hud_debug_info", value.show_hud_debug_info);
    window.location.reload();
}

function set_enable_gl_debug_and_reload(value) {
    m_storage.set("enable_gl_debug", value.enable_gl_debug);
    window.location.reload();
}

function refresh_mix_mode_ui() {
    var opt_index = Number(m_storage.get("sfx_mix_mode") === "true");
    document.getElementById("sfx_mix_mode").options[opt_index].selected = true;
    $("#sfx_mix_mode").slider("refresh");
}

function set_mix_mode_and_reload(value) {
    m_storage.set("sfx_mix_mode", value.sfx_mix_mode);
    window.location.reload();
}

function refresh_stereo_view_ui() {
    var st_type = m_storage.get("stereo") || "NONE";

    if (!m_input.can_use_device(m_input.DEVICE_HMD)) {
        document.getElementById("stereo").options[2].setAttribute('disabled', 'disabled');

        $("#stereo").selectmenu("refresh");

        if (st_type == "HMD") {
            m_storage.set("stereo", "NONE");
            st_type = "NONE";
        }
    }

    $("#stereo").val(st_type).selectmenu("refresh");
    $( "#stereo" ).selectmenu( "refresh", true );
}

function refresh_outlining_overview_mode_ui() {
    if (m_storage.get("outlining_overview_mode") == "")
        var opt_index = 1;
    else
        var opt_index = Number(m_storage.get("outlining_overview_mode") === "true");

    document.getElementById("outlining_overview_mode").options[opt_index].selected = true;

    $("#outlining_overview_mode").slider("refresh");
}

function refresh_gyro_use_ui() {
    var opt_index = Number(m_storage.get("gyro_use") === "true");
    document.getElementById("gyro_use").options[opt_index].selected = true;
    $("#gyro_use").slider("refresh");
}

function set_min_capabilities_and_reload(value) {
    m_storage.set("min_capabilities", value.min_capabilities);
    window.location.reload();
}

function get_min_capabilities_config() {
    if (m_storage.get("min_capabilities") == "")
        return false;
    else
        return m_storage.get("min_capabilities") === "true";
}

function refresh_min_capabilities_ui() {
    var opt_index = Number(get_min_capabilities_config());
    document.getElementById("min_capabilities").options[opt_index].selected = true;
    $("#min_capabilities").slider("refresh");
}


function set_stereo_view_and_reload(value) {
    m_storage.set("stereo", value.stereo);
    window.location.reload();
}

function show_hmd_config(value) {
    m_hmd_conf.show("hmd_container");
}

function set_gyro_cam_rotate_reload(value) {
    m_storage.set("gyro_use", value.gyro_use);
    window.location.reload();
}

function hide_show_gmpd_config(value) {
    if (value.gmpd_settings)
        m_gp_conf.show();
    else
        m_gp_conf.hide();
}

function set_outlining_overview_mode(value) {
    m_storage.set("outlining_overview_mode", value.outlining_overview_mode);
    window.location.reload();
}

function on_resize(e) {

    m_cont.resize_to_container(true);

    var canvas = m_cont.get_canvas();

    document.getElementById("info_left_up").innerHTML = canvas.width + "x" +
            canvas.height + " (" + (canvas.width / canvas.clientWidth).toFixed(2) + ":1.00)";

    if (m_data.is_primary_loaded())
        display_scene_stats();
}

function cleanup() {
    _anim_obj = null;
    _shape_key_obj = null;
}

/*
 * Animation controls
 */
function anim_play_clicked() {

    var anim_name = document.getElementById("animation").value;
    var slot_num = parseInt(document.getElementById("anim_slot").value);
    if (anim_name !== "None")
        m_anim.play(_anim_obj, null, slot_num);

}

function anim_stop_clicked() {

    var anim_name = document.getElementById("animation").value;
    var slot_num = parseInt(document.getElementById("anim_slot").value);
    m_anim.stop(_anim_obj, slot_num);
}

function anim_play_all_clicked() {
    var children = document.getElementById("anim_active_object").children;
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        var obj = interface_name_to_object(child.value);
        m_anim.play(obj, null, m_anim.SLOT_ALL);
    }
}

function anim_stop_all_clicked() {
    var children = document.getElementById("anim_active_object").children;
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        var obj = interface_name_to_object(child.value);
        m_anim.stop(obj, m_anim.SLOT_ALL);
    }
}

function nla_play_clicked() {
    m_nla.play();
}

function nla_stop_clicked() {
    m_nla.stop();
}

function set_shape_keys_params(value) {
    if ("shape_key_obj" in value) {
        _shape_key_obj = interface_name_to_object(value["shape_key_obj"]);

        var shape_keys_names = m_geom.get_shape_keys_names(_shape_key_obj);

        if (shape_keys_names.length) {
            fill_select_options("shape_key_name" ,shape_keys_names);
            _shape_key_name = shape_keys_names[0];
            var key_value = m_geom.get_shape_key_value(_shape_key_obj,_shape_key_name);
            set_slider("shape_key_value", key_value);
        } else
            fill_select_options("shape_key_name", ["N/K"]);
    }

    if ("shape_key_name" in value) {
        _shape_key_name = value["shape_key_name"];
        var key_value = m_geom.get_shape_key_value(_shape_key_obj,_shape_key_name);
        set_slider("shape_key_value", key_value);
    }

    if ("shape_key_value" in value)
        m_geom.set_shape_key_value(_shape_key_obj, _shape_key_name, value["shape_key_value"]);

}

function set_nla_params(value) {

    if ("nla_frame_current" in value)
        if (!m_nla.is_play()) {
            var current = parseInt(value.nla_frame_current);
            m_nla.set_frame(current);
        }
}

function set_animation_params(value) {

    if ("anim_active_object" in value) {
        _anim_obj = interface_name_to_object(value["anim_active_object"]);

        var anim_names = m_anim.get_anim_names(_anim_obj);

        if (anim_names.length) {
            var anim_slots = [];

            for (var j = 0; j < anim_names.length && j < 8; j++)
                anim_slots.push(j);

            anim_names.push("None");

            fill_select_options("animation", anim_names);
            fill_select_options("anim_slot", anim_slots);

            var slot_num = parseInt(document.getElementById("anim_slot").value);
            update_anim_ui_name(_anim_obj, slot_num);
            update_anim_info(_anim_obj, slot_num);
        } else
            fill_select_options("animation", ["N/A"]);

        update_anim_ui_slots(_anim_obj);
    }

    if ("anim_slot" in value) {
        if (!_anim_obj)
            return;

        var slot_num = value.anim_slot;
        update_anim_ui_name(_anim_obj, slot_num);
        update_anim_info(_anim_obj, slot_num);
        update_anim_ui_slots(_anim_obj);
    }

    if ("animation" in value) {
        var slot_num = parseInt(document.getElementById("anim_slot").value);
        var old_anim_name = m_anim.get_current_anim_name(_anim_obj, slot_num);

        if (value.animation == "None")
            m_anim.remove_slot_animation(_anim_obj, slot_num);
        else {
            m_anim.apply(_anim_obj, value.animation, slot_num);
            m_anim.play(_anim_obj, null, slot_num);
        }

        update_anim_info(_anim_obj, slot_num);
        update_anim_ui_slots(_anim_obj);
    }

    if ("anim_cyclic" in value) {
        var anim_name = document.getElementById("animation").value;
        var slot_num = m_anim.get_slot_num_by_anim(_anim_obj, anim_name);
        m_anim.set_behavior(_anim_obj, value.anim_cyclic ? m_anim.AB_CYCLIC : m_anim.AB_FINISH_RESET, slot_num);
    }

    if ("anim_frame_current" in value) {
        // prevent double update
        // (set_slider called every frame)
        var slot_num = parseInt(document.getElementById("anim_slot").value);
        if (!m_anim.is_play(_anim_obj, slot_num)) {
            var current = parseInt(value.anim_frame_current);
            m_anim.set_frame(_anim_obj, current, slot_num);
        }
    }

    if ("anim_mix_factor" in value) {
        m_anim.set_skel_mix_factor(_anim_obj, value.anim_mix_factor);
    }
}

function get_anim_type_string(anim_type) {
    switch(anim_type) {
    case m_anim.OBJ_ANIM_TYPE_ARMATURE:
        anim_type = "ARMATURE"
        break;
    case m_anim.OBJ_ANIM_TYPE_OBJECT:
        anim_type = "OBJECT"
        break;
    case m_anim.OBJ_ANIM_TYPE_PARTICLES:
        anim_type = "PARTICLES"
        break;
    case m_anim.OBJ_ANIM_TYPE_VERTEX:
        anim_type = "VERTEX"
        break;
    case m_anim.OBJ_ANIM_TYPE_MATERIAL:
        anim_type = "MATERIAL"
        break;
    case m_anim.OBJ_ANIM_TYPE_STATIC:
        anim_type = "STATIC"
        break;
    default:
        anim_type = "NONE";
    }
    return anim_type;
}

function get_anim_type_color(anim_type) {
    var color = "white";

    switch(anim_type) {
    case m_anim.OBJ_ANIM_TYPE_ARMATURE:
        color = "cyan";
        break;
    case m_anim.OBJ_ANIM_TYPE_MATERIAL:
        color = "red";
        break;
    case m_anim.OBJ_ANIM_TYPE_OBJECT:
        color = "blue";
        break;
    case m_anim.OBJ_ANIM_TYPE_PARTICLES:
        color = "yellow";
        break;
    case m_anim.OBJ_ANIM_TYPE_VERTEX:
        color = "green";
        break;
    }
    return color;
}

function update_anim_ui_name(obj, slot_num) {
    var anim_name = m_anim.get_current_anim_name(obj, slot_num);
    anim_name = anim_name || "None";

    var anim_elem = $("#" + "animation");
    var anim_options = anim_elem.children();

    for (var i = 0; i < anim_options.length; i++) {
        var option = anim_options[i];
        if (option.value == anim_name) {
            option.selected = true;
            anim_elem.selectmenu();
            anim_elem.selectmenu("refresh");
            return;
        }
    }
}

function update_nla_info() {
    var slider = document.getElementById("nla_frame_current");
    var fr_elem = document.getElementById("nla_frame_range");
    var start_fr = m_nla.get_frame_start();
    var end_fr = m_nla.get_frame_end();

    if (start_fr != -1 && end_fr != -1) {
        fr_elem.innerHTML = start_fr + " - " + end_fr;
        slider.min = "" + start_fr;
        slider.max = "" + end_fr;
    } else
        fr_elem.innerHTML = "N/A";
}

function update_anim_info(obj, slot_num) {
    // cyclic
    set_slider("anim_cyclic", Number(m_anim.get_behavior(obj, slot_num)
            == m_anim.AB_CYCLIC));

    // frame range
    var fr_elem = document.getElementById("anim_frame_range");

    var start_fr = m_anim.get_anim_start_frame(obj, slot_num);
    var len = m_anim.get_anim_length(obj, slot_num);

    if (start_fr != -1 && len != -1) {
        var finish_fr = start_fr + len;
        fr_elem.innerHTML = start_fr + " - " + finish_fr;
        var slider = document.getElementById("anim_frame_current");
        slider.min = "" + start_fr;
        slider.max = "" + finish_fr;
    } else
        fr_elem.innerHTML = "N/A";
}

function update_anim_ui_slots(obj) {
    var anim_slots_elems = $("#anim_slot-listbox").find("a");

    var active_slot = parseInt(document.getElementById("anim_slot").value);
    var anim_type = m_anim.get_anim_type(obj, active_slot);

    for (var i = 0; i < anim_slots_elems.length; i++) {

        var anim_type = m_anim.get_anim_type(obj, i);
        var type_str = get_anim_type_string(anim_type);

        var elem = anim_slots_elems.eq(i);
        var str = i + " (" + type_str + ")";
        $('#anim_slot').children().eq(i).text(str);
    }

    $('#anim_slot').selectmenu();
    $('#anim_slot').selectmenu("refresh");
}

function get_ssao_params() {
    var ssao = m_scenes.get_ssao_params();
    var ssao_param_names = ["ssao_quality",
                            "ssao_hemisphere",
                            "ssao_blur_depth",
                            "ssao_blur_discard_value",
                            "ssao_radius_increase",
                            "ssao_influence",
                            "ssao_dist_factor",
                            "ssao_only",
                            "ssao_white"];

    if (!ssao) {
        forbid_params(ssao_param_names, "disable");
        return;
    }

    forbid_params(ssao_param_names, "enable");
    sel_by_val(document.getElementById("ssao_quality"), ssao["ssao_quality"]);
    $("#ssao_quality").selectmenu("refresh");

    var opt_index = Number(ssao["ssao_hemisphere"]);
    document.getElementById("ssao_hemisphere").options[opt_index].selected = true;
    $("#ssao_hemisphere").slider("refresh");

    var opt_index = Number(ssao["ssao_blur_depth"]);
    document.getElementById("ssao_blur_depth").options[opt_index].selected = true;
    $("#ssao_blur_depth").slider("refresh");

    set_slider("ssao_blur_discard_value", ssao["blur_discard_value"]);
    set_slider("ssao_radius_increase", ssao["radius_increase"]);
    set_slider("ssao_influence", ssao["influence"]);
    set_slider("ssao_dist_factor", ssao["dist_factor"]);

    var opt_index = Number(ssao["ssao_only"]);
    document.getElementById("ssao_only").options[opt_index].selected = true;
    $("#ssao_only").slider("refresh");

    var opt_index = Number(ssao["ssao_white"]);
    document.getElementById("ssao_white").options[opt_index].selected = true;
    $("#ssao_white").slider("refresh");
}

function set_ssao_params(value) {
    var ssao = m_scenes.get_ssao_params();

    var ssao_params = {};

    if ("ssao_quality" in value)
        ssao_params["ssao_quality"] = get_sel_val(document.getElementById("ssao_quality"));

    if ("ssao_hemisphere" in value)
        ssao_params["ssao_hemisphere"] = Number(value.ssao_hemisphere);

    if ("ssao_blur_depth" in value)
        ssao_params["ssao_blur_depth"] = Number(value.ssao_blur_depth);

    if ("ssao_blur_discard_value" in value)
        ssao_params["ssao_blur_discard_value"] = value.ssao_blur_discard_value;

    if ("ssao_radius_increase" in value)
        ssao_params["ssao_radius_increase"] = value.ssao_radius_increase;

    if ("ssao_influence" in value)
        ssao_params["ssao_influence"] = value.ssao_influence;

    if ("ssao_dist_factor" in value)
        ssao_params["ssao_dist_factor"] = value.ssao_dist_factor;

    if ("ssao_only" in value)
        ssao_params["ssao_only"] = Number(value.ssao_only);

    if ("ssao_white" in value)
        ssao_params["ssao_white"] = Number(value.ssao_white);

    m_scenes.set_ssao_params(ssao_params);
}

function get_color_correction_params() {

    var compos_params = m_scenes.get_color_correction_params();
    var compos_param_names = ["brightness",
                              "contrast",
                              "exposure",
                              "saturation"];

    if (!compos_params) {
        forbid_params(compos_param_names, "disable");
        return;
    }

    forbid_params(compos_param_names, "enable");

    set_slider("brightness", compos_params["brightness"]);
    set_slider("contrast", compos_params["contrast"]);
    set_slider("exposure", compos_params["exposure"]);
    set_slider("saturation", compos_params["saturation"]);
}

function set_color_correction_params(value) {
    var compos_params = m_scenes.get_color_correction_params();

    if (!compos_params)
        return;

    var compos_params = {};

    if ("brightness" in value)
        compos_params["brightness"] = parseFloat(value.brightness);

    if ("contrast" in value)
        compos_params["contrast"] = parseFloat(value.contrast);

    if ("exposure" in value)
        compos_params["exposure"] = parseFloat(value.exposure);

    if ("saturation" in value)
        compos_params["saturation"] = parseFloat(value.saturation);

    m_scenes.set_color_correction_params(compos_params);
}

function sel_by_val(select_elem, option_value) {
    var options = select_elem.options;

    for (var i = 0; i < options.length; i++) {
        var opt = options[i];

        if (opt.value == option_value)
            opt.selected = true;
        else
            opt.selected = false;
    }
}

function get_sel_val(select_elem) {
    var options = select_elem.options;

    for (var i = 0; i < options.length; i++) {
        var opt = options[i];

        if (opt.selected)
            return opt.value;
    }
}

function get_fog_params() {
    var fog_params  = m_scenes.get_fog_params();

    set_slider("fog_intensity", fog_params["fog_intensity"]);
    set_slider("fog_depth", fog_params["fog_depth"]);
    set_slider("fog_start", fog_params["fog_start"]);
    set_slider("fog_height", fog_params["fog_height"]);
}

function set_fog_params(value) {
    var fog_params = {};

    if ("fog_intensity" in value)
        fog_params["fog_intensity"] = value["fog_intensity"];
    if ("fog_depth" in value)
        fog_params["fog_depth"] = value["fog_depth"];
    if ("fog_start" in value)
        fog_params["fog_start"] = value["fog_start"];
    if ("fog_height" in value)
        fog_params["fog_height"] = value["fog_height"];

    m_scenes.set_fog_params(fog_params);
}

function get_shadow_params() {

    var shadow_params = m_scenes.get_shadow_params();

    var shadow_param_names = [
        "csm_first_cascade_border",
        "csm_last_cascade_border",
        "self_shadow_polygon_offset",
        "self_shadow_normal_offset",
        "first_cascade_blur_radius",
        "last_cascade_blur_radius",
        "res_ui-block-b",
        "num_ui-block-b",
        "blur_ui-block-b"
    ];

    if (!shadow_params) {
        forbid_params(shadow_param_names, "disable");
        document.getElementById("csm_resolution").innerHTML = "";
        document.getElementById("csm_num").innerHTML = "";
        document.getElementById("csm_borders").innerHTML = "";
        document.getElementById("blur_radii").innerHTML = "";
        return null;
    }

    forbid_params(shadow_param_names, "enable");

    display_shadows_info(shadow_params);

    set_slider("self_shadow_polygon_offset", shadow_params["self_shadow_polygon_offset"]);
    set_slider("self_shadow_normal_offset", shadow_params["self_shadow_normal_offset"]);

    set_slider("first_cascade_blur_radius", shadow_params["first_cascade_blur_radius"]);

    if (shadow_params["enable_csm"]) {
        set_slider("csm_first_cascade_border", shadow_params["csm_first_cascade_border"]);

        if (shadow_params["csm_num"] > 1) {
            set_slider("csm_last_cascade_border", shadow_params["csm_last_cascade_border"]);
            set_slider("last_cascade_blur_radius", shadow_params["last_cascade_blur_radius"]);
        } else
            forbid_params(["csm_last_cascade_border", "last_cascade_blur_radius"], "disable");
    } else
        forbid_params(["csm_first_cascade_border", "csm_last_cascade_border",
                "last_cascade_blur_radius"], "disable");
}

function set_shadow_params(value) {
    var shadow_params = {};

    if ("csm_first_cascade_border" in value)
        shadow_params["csm_first_cascade_border"] = value["csm_first_cascade_border"];
    if ("csm_last_cascade_border" in value)
        shadow_params["csm_last_cascade_border"] = value["csm_last_cascade_border"];
    if ("self_shadow_polygon_offset" in value)
        shadow_params["self_shadow_polygon_offset"] = value["self_shadow_polygon_offset"];
    if ("self_shadow_normal_offset" in value)
        shadow_params["self_shadow_normal_offset"] = value["self_shadow_normal_offset"];
    if ("first_cascade_blur_radius" in value)
        shadow_params["first_cascade_blur_radius"] = value["first_cascade_blur_radius"];
    if ("last_cascade_blur_radius" in value)
        shadow_params["last_cascade_blur_radius"] = value["last_cascade_blur_radius"];

    m_scenes.set_shadow_params(shadow_params);

    display_shadows_info(m_scenes.get_shadow_params());
}

function display_shadows_info(shadow_params) {
    document.getElementById("csm_resolution").innerHTML = "&nbsp;&nbsp;"
            + shadow_params["csm_resolution"];

    if (shadow_params["enable_csm"]) {
        document.getElementById("csm_num").innerHTML = " " + shadow_params["csm_num"];

        var data_blocks = ["csm_borders", "blur_radii"];
        for (var i = 0; i < data_blocks.length; i++) {
            var name = data_blocks[i];

            var values = shadow_params[name];
            var elem = document.getElementById(name);

            elem.innerHTML = "(";
            for (var j = 0; j < values.length; j++) {
                if (j > 0)
                    elem.innerHTML += " __ ";
                elem.innerHTML += Math.round(10 * values[j]) / 10;
            }
            elem.innerHTML += ")";
        }
    } else {
        document.getElementById("cascades-info-block").style.display = "none";
        document.getElementById("csm_first_cascade_border-info-block").style.display = "none";
        document.getElementById("csm_last_cascade_border-info-block").style.display = "none";
        document.getElementById("blur_radii-info-block").style.display = "none";
        document.getElementById("first_cascade_blur_radius-label").innerHTML = "Blur radius";
        document.getElementById("last_cascade_blur_radius-info-block").style.display = "none";
    }
}

function get_ambient_params() {
    var env_colors = m_scenes.get_environment_colors();

    set_slider("environment_energy", env_colors[0]);
    set_color_picker("horizon_color", env_colors[1]);
    set_color_picker("zenith_color" , env_colors[2]);
}

function set_ambient_params(value) {
    if ("environment_energy" in value || "horizon_color" in value || "zenith_color" in value)
        m_scenes.set_environment_colors(
            value.environment_energy,
            value.horizon_color,
            value.zenith_color);
}

function set_debug_params(value) {
    var debug_params = {};

    if (typeof value.debug_view_mode == "string") {
        var mode_str = get_sel_val(document.getElementById("debug_view_mode"));
        switch (mode_str) {
        case "DV_NONE":
            debug_params["debug_view_mode"] = m_debug.DV_NONE;
            forbid_params(["wireframe_edge_color"], "disable");
            break;
        case "DV_OPAQUE_WIREFRAME":
            debug_params["debug_view_mode"] = m_debug.DV_OPAQUE_WIREFRAME;
            forbid_params(["wireframe_edge_color"], "enable");
            break;
        case "DV_TRANSPARENT_WIREFRAME":
            debug_params["debug_view_mode"] = m_debug.DV_TRANSPARENT_WIREFRAME;
            forbid_params(["wireframe_edge_color"], "enable");
            break;
        case "DV_FRONT_BACK_VIEW":
            debug_params["debug_view_mode"] = m_debug.DV_FRONT_BACK_VIEW;
            forbid_params(["wireframe_edge_color"], "enable");
            break;
        case "DV_BOUNDINGS":
            debug_params["debug_view_mode"] = m_debug.DV_BOUNDINGS;
            forbid_params(["wireframe_edge_color"], "disable");
            break;
        case "DV_CLUSTERS_VIEW":
            debug_params["debug_view_mode"] = m_debug.DV_CLUSTERS_VIEW;
            forbid_params(["wireframe_edge_color"], "disable");
            break;
        case "DV_BATCHES_VIEW":
            debug_params["debug_view_mode"] = m_debug.DV_BATCHES_VIEW;
            forbid_params(["wireframe_edge_color"], "disable");
            break;
        case "DV_RENDER_TIME":
            debug_params["debug_view_mode"] = m_debug.DV_RENDER_TIME;
            forbid_params(["wireframe_edge_color"], "disable");
            break;
        }

        if (mode_str == "DV_CLUSTERS_VIEW" || mode_str == "DV_BATCHES_VIEW")
            forbid_params(["debug_change_colors"], "enable");
        else
            forbid_params(["debug_change_colors"], "disable");

        if (mode_str == "DV_RENDER_TIME")
            forbid_params(["render_time_threshold"], "enable");
        else
            forbid_params(["render_time_threshold"], "disable");
    }
    if (typeof value.wireframe_edge_color == "object")
        debug_params["wireframe_edge_color"] = value["wireframe_edge_color"];

    m_debug.set_debug_params(debug_params);
}

function debug_change_colors_clicked() {
    m_debug.set_debug_params({ "debug_colors_seed": Math.random() });
}

function set_render_time_threshold(value) {
    if ("render_time_threshold" in value)
        m_debug.set_debug_params({ "render_time_threshold": value.render_time_threshold });       
}

function make_screenshot_clicked() {
    m_sshot.shot();
}

function get_sky_params() {
    var sky_params = m_scenes.get_sky_params();

    var sky_params_names = ["sky_color",
                            "rayleigh_brightness",
                            "mie_brightness",
                            "spot_brightness",
                            "scatter_strength",
                            "rayleigh_strength",
                            "mie_strength",
                            "rayleigh_collection_power",
                            "mie_collection_power",
                            "mie_distribution"];

    if (!sky_params) {
        forbid_params(sky_params_names, "disable");
        return null;
    }

    forbid_params(sky_params_names, "enable");

    set_color_picker("sky_color", sky_params["color"]);
    set_slider("rayleigh_brightness", sky_params["rayleigh_brightness"]);
    set_slider("mie_brightness", sky_params["mie_brightness"]);
    set_slider("spot_brightness", sky_params["spot_brightness"]);
    set_slider("scatter_strength", sky_params["scatter_strength"]);
    set_slider("rayleigh_strength", sky_params["rayleigh_strength"]);
    set_slider("mie_strength", sky_params["mie_strength"]);
    set_slider("rayleigh_collection_power", sky_params["rayleigh_collection_power"]);
    set_slider("mie_collection_power", sky_params["mie_collection_power"]);
    set_slider("mie_distribution", sky_params["mie_distribution"]);
}

function set_sky_params(value) {
    var sky_params = {};

    if ("sky_color" in value)
        sky_params["color"] = value.sky_color;

    if ("rayleigh_brightness" in value)
        sky_params["rayleigh_brightness"] = value.rayleigh_brightness;

    if ("mie_brightness" in value)
        sky_params["mie_brightness"] = value.mie_brightness;

    if ("spot_brightness" in value)
        sky_params["spot_brightness"] = value.spot_brightness;

    if ("scatter_strength" in value)
        sky_params["scatter_strength"] = value.scatter_strength;

    if ("rayleigh_strength" in value)
        sky_params["rayleigh_strength"] = value.rayleigh_strength;

    if ("mie_strength" in value)
        sky_params["mie_strength"] = value.mie_strength;

    if ("rayleigh_collection_power" in value)
        sky_params["rayleigh_collection_power"] = value.rayleigh_collection_power;

    if ("mie_collection_power" in value)
        sky_params["mie_collection_power"] = value.mie_collection_power;

    if ("mie_distribution" in value)
        sky_params["mie_distribution"] = value.mie_distribution;

    m_scenes.set_sky_params(sky_params);
}

function show_element(obj) {
    $('#' + obj)[0].style.display = 'block';
}

function hide_element(obj) {
    $('#' + obj)[0].style.display = 'none';
}

function get_material_params(obj, mat_name) {
    var mparams = m_mat.get_material_extended_params(obj, mat_name);

    var mat_param_names = ["material_diffuse_color",
                           "material_name",
                           "material_reflectivity",
                           "material_fresnel",
                           "material_fresnel_factor",
                           "material_parallax_scale",
                           "material_parallax_steps"];

    if (!mparams) {
        forbid_params(mat_param_names, "disable");
        show_element("material_warning");
        return null;
    }

    var diffuse_color = m_mat.get_diffuse_color(obj, mat_name);
    mparams["diffuse_color"] = diffuse_color.subarray(0, 3);

    forbid_params(mat_param_names, "enable");

    set_color_picker("material_diffuse_color", mparams["diffuse_color"]);
    set_slider("material_reflectivity",   mparams["reflect_factor"]);
    set_slider("material_fresnel",        mparams["fresnel"]);
    set_slider("material_fresnel_factor", mparams["fresnel_factor"]);
    set_slider("material_parallax_scale", mparams["parallax_scale"]);
    set_slider("material_parallax_steps", mparams["parallax_steps"]);
}

function set_material_params(value) {
    var obj = get_selected_object();

    if ("material_name" in value)
        get_material_params(obj, value["material_name"]);

    if ("material_diffuse_color" in value) {
        var dc = value["material_diffuse_color"].slice();
        dc.push(1);
        m_mat.set_diffuse_color(obj, $("#material_name").val(), dc);
    }

    var material_ext_params = {};

    if ("material_reflectivity" in value)
        material_ext_params["material_reflectivity"]
                = value["material_reflectivity"];
    if ("material_fresnel" in value)
        material_ext_params["material_fresnel"] = value["material_fresnel"];
    if ("material_fresnel_factor" in value)
        material_ext_params["material_fresnel_factor"]
                = value["material_fresnel_factor"];
    if ("material_parallax_scale" in value)
        material_ext_params["material_parallax_scale"]
                = value["material_parallax_scale"];
    if ("material_parallax_steps" in value)
        material_ext_params["material_parallax_steps"]
                = value["material_parallax_steps"];
    m_mat.set_material_extended_params(obj, $("#material_name").val(),
            material_ext_params);

    m_scenes.update_scene_materials_params();
}

function get_water_material_params(obj, mat_name) {
    var mparams = m_mat.get_water_material_params(obj, mat_name);
    var water_param_names = ["shallow_water_col",
                             "shallow_water_col_fac",
                             "shore_water_col",
                             "shore_water_col_fac",
                             "water_fog_color",
                             "water_fog_density",
                             "absorb_factor",
                             "sss_strength",
                             "sss_width",
                             "foam_factor",
                             "norm_uv_velocity",
                             "waves_height",
                             "waves_length",
                             "dst_noise_scale0",
                             "dst_noise_scale1",
                             "dst_noise_freq0",
                             "dst_noise_freq1",
                             "dir_min_shore_fac",
                             "dir_freq",
                             "dir_noise_scale",
                             "dir_noise_freq",
                             "dir_min_noise_fac",
                             "dst_min_fac",
                             "waves_hor_fac",
                             "water_dynamic",
                             "shore_smoothing"];


    if (!mparams) {
        forbid_params(water_param_names, "disable");
        return null;
    }

    forbid_params(water_param_names, "enable");

    m_scenes.get_water_mat_params(mparams);

    if (mparams["shallow_water_col"])
        set_color_picker("shallow_water_col", mparams["shallow_water_col"]);

    if (mparams["shallow_water_col_fac"])
        set_slider("shallow_water_col_fac", mparams["shallow_water_col_fac"]);

    if (mparams["shore_water_col"])
        set_color_picker("shore_water_col", mparams["shore_water_col"]);

    if (mparams["shore_water_col_fac"])
        set_slider("shore_water_col_fac", mparams["shore_water_col_fac"]);

    if (mparams["water_fog_color"]) {
        set_color_picker("water_fog_color", mparams["water_fog_color"]);
        set_slider("water_fog_density", mparams["water_fog_density"]);
    }

    set_slider("absorb_factor",     mparams["absorb_factor"]);
    set_slider("sss_strength",      mparams["sss_strength"]);
    set_slider("sss_width",         mparams["sss_width"]);
    set_slider("foam_factor",       mparams["foam_factor"]);
    set_slider("norm_uv_velocity",  mparams["norm_uv_velocity"]);
    set_slider("waves_height",      mparams["waves_height"]);
    set_slider("waves_length",      mparams["waves_length"]);
    set_slider("dst_noise_scale0",  mparams["dst_noise_scale0"]);
    set_slider("dst_noise_scale1",  mparams["dst_noise_scale1"]);
    set_slider("dst_noise_freq0",   mparams["dst_noise_freq0"]);
    set_slider("dst_noise_freq1",   mparams["dst_noise_freq1"]);
    set_slider("dir_min_shore_fac", mparams["dir_min_shore_fac"]);
    set_slider("dir_freq",          mparams["dir_freq"]);
    set_slider("dir_noise_scale",   mparams["dir_noise_scale"]);
    set_slider("dir_noise_freq",    mparams["dir_noise_freq"]);
    set_slider("dir_min_noise_fac", mparams["dir_min_noise_fac"]);
    set_slider("dst_min_fac",       mparams["dst_min_fac"]);
    set_slider("waves_hor_fac",     mparams["waves_hor_fac"]);
}

function set_water_material_params(value) {
    var obj = get_selected_object();
    var water_param_names = ["waves_height",
                             "waves_length",
                             "sss_strength",
                             "sss_width",
                             "dst_noise_scale0",
                             "dst_noise_scale1",
                             "dst_noise_freq0",
                             "dst_noise_freq1",
                             "dir_min_shore_fac",
                             "dir_freq",
                             "dir_noise_scale",
                             "dir_noise_freq",
                             "dir_min_noise_fac",
                             "dst_min_fac",
                             "waves_hor_fac"];

    if (!obj)
        return null;

    var water_material_params = {};

    var water_dynamic   = $("#water_dynamic").val();
    var shore_smoothing = $("#shore_smoothing").val();

    if (Boolean(Number(water_dynamic)))
        forbid_params(water_param_names, "enable");
    else
        forbid_params(water_param_names, "disable");

    if (Boolean(Number(shore_smoothing)))
        forbid_params(["absorb_factor"], "enable");
    else
        forbid_params(["absorb_factor"], "disable");

    // shore smoothing
    if ("shore_smoothing" in value)
        water_material_params["shore_smoothing"] = value["shore_smoothing"];
    if ("absorb_factor" in value)
        water_material_params["absorb_factor"] = value["absorb_factor"];

    // always enabled prop
    if ("water_fog_color" in value)
        water_material_params["water_fog_color"] = value["water_fog_color"];
    if ("water_fog_density" in value)
        water_material_params["water_fog_density"] = value["water_fog_density"];
    if ("shallow_water_col" in value)
        water_material_params["shallow_water_col"] = value["shallow_water_col"];
    if ("shallow_water_col_fac" in value)
        water_material_params["shallow_water_col_fac"] = value["shallow_water_col_fac"];
    if ("shore_water_col" in value)
        water_material_params["shore_water_col"] = value["shore_water_col"];
    if ("shore_water_col_fac" in value)
        water_material_params["shore_water_col_fac"] = value["shore_water_col_fac"];
    if ("foam_factor" in value)
        water_material_params["foam_factor"] = value["foam_factor"];
    if ("norm_uv_velocity" in value)
        water_material_params["norm_uv_velocity"] = value["norm_uv_velocity"];

    // water dynamic
    if ("sss_strength" in value)
        water_material_params["sss_strength"]  = value["sss_strength"];
    if ("sss_width" in value)
        water_material_params["sss_width"]  = value["sss_width"];
    if ("water_dynamic" in value)
        water_material_params["water_dynamic"]  = value["water_dynamic"];
    if ("waves_height" in value)
        water_material_params["waves_height"] = value["waves_height"];
    if ("waves_length" in value)
        water_material_params["waves_length"] = value["waves_length"];
    if ("dst_noise_scale0" in value)
        water_material_params["dst_noise_scale0"] = value["dst_noise_scale0"];
    if ("dst_noise_scale1" in value)
        water_material_params["dst_noise_scale1"] = value["dst_noise_scale1"];
    if ("dst_noise_freq0" in value)
        water_material_params["dst_noise_freq0"] = value["dst_noise_freq0"];
    if ("dst_noise_freq1" in value)
        water_material_params["dst_noise_freq1"] = value["dst_noise_freq1"];
    if ("dir_min_shore_fac" in value)
        water_material_params["dir_min_shore_fac"] = value["dir_min_shore_fac"];
    if ("dir_freq" in value)
        water_material_params["dir_freq"] = value["dir_freq"];
    if ("dir_noise_scale" in value)
        water_material_params["dir_noise_scale"] = value["dir_noise_scale"];
    if ("dir_noise_freq" in value)
        water_material_params["dir_noise_freq"] = value["dir_noise_freq"];
    if ("dir_min_noise_fac" in value)
        water_material_params["dir_min_noise_fac"] = value["dir_min_noise_fac"];
    if ("dst_min_fac" in value)
        water_material_params["dst_min_fac"] = value["dst_min_fac"];
    if ("waves_hor_fac" in value)
        water_material_params["waves_hor_fac"] = value["waves_hor_fac"];

    var result = m_mat.set_water_material_params(obj, $("#material_name").val(), water_material_params);

    // check water material in material module to prevent errors in scenes module
    if (!result)
        return null;

    m_scenes.update_scene_materials_params();

    m_scenes.set_water_params(water_material_params);
}

function get_lighting_params(light_obj) {
    var lparams = m_lights.get_light_params(light_obj);
    if(lparams) {
        var pre_light_energy = lparams["light_energy"] - Math.floor(lparams["light_energy"]);
        var rude_light_energy = Math.floor(lparams["light_energy"]);
        set_color_picker("light_color", lparams["light_color"]);
        set_slider("rude_light_energy", rude_light_energy);
        set_slider("pre_light_energy", pre_light_energy);
        set_label("light_energy", rude_light_energy + pre_light_energy);
        set_label("light_type", lparams["light_type"]);
        if (lparams["light_type"] == "SPOT") {
            forbid_params(["light_spot_blend", "light_spot_size"], "enable");
            if ("light_spot_blend" in lparams)
                set_slider("light_spot_blend", lparams["light_spot_blend"]);
            if ("light_spot_size" in lparams)
                set_slider("light_spot_size", Math.round(lparams["light_spot_size"] * TO_DEG));
        } else
            forbid_params(["light_spot_blend", "light_spot_size"], "disable");
        if (lparams["light_type"] == "SPOT" || lparams["light_type"] == "POINT") {
            forbid_params(["light_distance"], "enable");
            if ("light_distance" in lparams)
                set_slider("light_distance", lparams["light_distance"]);
        } else
            forbid_params(["light_distance"], "disable");
    }
}

function set_lighting_params(value) {

    if ("light_name" in value)
        get_lighting_params(interface_name_to_object(value["light_name"]));

    var light_params = {};

    if ("light_color" in value)
        light_params["light_color"] = value["light_color"];

    if ("pre_light_energy" in value)
        light_params["light_energy"] = parseFloat(value["pre_light_energy"])
                + get_slider_value("rude_light_energy");

    if ("rude_light_energy" in value)
        light_params["light_energy"] = parseFloat(value["rude_light_energy"])
                + get_slider_value("pre_light_energy");

    if ("light_spot_size" in value)
        light_params["light_spot_size"] = parseFloat(value["light_spot_size"] * TO_RAD);

    if ("light_spot_blend" in value)
        light_params["light_spot_blend"] = parseFloat(value["light_spot_blend"]);

    if ("light_distance" in value)
        light_params["light_distance"] = parseFloat(value["light_distance"]);

    var lamp = interface_name_to_object($("#light_name").val());
    m_lights.set_light_params(lamp, light_params);
    set_label("light_energy", (m_lights.get_light_params(lamp)["light_energy"]).toFixed(2));
}

function get_sun_params() {
    var sun_params  = m_lights.get_sun_params();
    var sun_param_names = ["sun_horizontal_position",
                           "sun_vertical_position"];

    if (!sun_params) {
        forbid_params(sun_param_names, "disable");
        return null;
    }

    set_slider("sun_horizontal_position", sun_params["hor_position"]);
    set_slider("sun_vertical_position", sun_params["vert_position"]);
}

function set_sun_params(value) {
    var sun_params = {};

    if ("sun_horizontal_position" in value) {
        sun_params["hor_position"] = parseFloat(value.sun_horizontal_position);
        sun_params["vert_position"] = parseFloat(document.getElementById("sun_vertical_position").value);
    }

    if ("sun_vertical_position" in value) {
        sun_params["hor_position"] = parseFloat(document.getElementById("sun_horizontal_position").value);
        sun_params["vert_position"] = parseFloat(value.sun_vertical_position);
    }

    m_lights.set_sun_params(sun_params);
}

function set_max_sun_angle(value) {
    var angle = parseFloat(value.max_sun_angle);
    m_lights.set_max_sun_angle(angle);
}

function set_time_date(value) {
    if ("day_time" in value) {
        var time = value.day_time;
        m_lights.set_day_time(time);
    }
    if ("date" in value) {
        var date = new Date(value.date);
        m_lights.set_date(date);
    }

    // get_sun_params();
}

function run_sun_clicked() {
    var multiplier = 0;
    var sun_time = parseFloat(document.getElementById("day_time").value);

    function elapsed_cb(obj, id, pulse) {
        if (pulse == 1) {
            multiplier = document.getElementById("sun_time_multiplier").value;
            var value = m_ctl.get_sensor_value(obj, id, 0);
            sun_time += value * multiplier / 3600;
            if (sun_time > 24)
                sun_time = sun_time - Math.floor(sun_time);
            set_slider("day_time", sun_time);
        }
    }

    var elapsed = m_ctl.create_elapsed_sensor();
    var sun = m_lights.get_lamps("SUN")[0];

    m_ctl.create_sensor_manifold(sun, "ELAPSED", m_ctl.CT_CONTINUOUS,
                                [elapsed], function(s) {return s[0]},
                                elapsed_cb);
}

function check_lighting_params() {
    var sun = m_lights.get_lamps("SUN")[0];
    var lamps = m_lights.get_lamps();
    var light_param_turn_off = ["sn-ui-grid-b"];
    if (!lamps.length)
        forbid_params(light_param_turn_off,"disable");
    else if (!sun) {
        var light_param_names = ["run_sun",
                             "stop_sun",
                             "date",
                             "sun_time_multiplier",
                             "day_time",
                             "max_sun_angle"];
        forbid_params(light_param_names, "disable");
    }
}

function forbid_material_params() {
    // material
    var material_param_names = ["material_diffuse_color",
                                "material_name",
                                "material_reflectivity",
                                "material_fresnel",
                                "material_fresnel_factor",
                                "material_parallax_scale",
                                "material_parallax_steps"];

    forbid_params(material_param_names, "disable");

    // water
    var water_param_names = ["shallow_water_col",
                   "shallow_water_col_fac",
                   "shore_water_col",
                   "shore_water_col_fac",
                   "water_fog_color",
                   "water_fog_density",
                   "absorb_factor",
                   "sss_strength",
                   "sss_width",
                   "foam_factor",
                   "norm_uv_velocity",
                   "waves_height",
                   "waves_length",
                   "dst_noise_scale0",
                   "dst_noise_scale1",
                   "dst_noise_freq0",
                   "dst_noise_freq1",
                   "dir_min_shore_fac",
                   "dir_freq",
                   "dir_noise_scale",
                   "dir_noise_freq",
                   "dir_min_noise_fac",
                   "dst_min_fac",
                   "waves_hor_fac",
                   "water_dynamic",
                   "shore_smoothing"];

    forbid_params(water_param_names, "disable");
}

function prepare_debug_params() {
    $("#debug_view_mode").val("DV_NONE");
    $("#debug_view_mode").selectmenu("refresh", true);

    forbid_params(["debug_change_colors"], "disable");
    forbid_params(["render_time_threshold"], "disable");

    $("#wireframe_edge_color div").css('backgroundColor', '#333');
    $("#render_time_threshold").trigger("change");
}

function stop_sun_clicked() {
    var sun = m_lights.get_lamps("SUN")[0];

    if (m_ctl.check_sensor_manifolds(sun))
        m_ctl.remove_sensor_manifold(sun, "ELAPSED");
}

function get_dof_params() {
    var dof_params  = m_scenes.get_dof_params();

    var dof_param_names = ["dof_distance",
                           "dof_object",
                           "dof_front_start",
                           "dof_front_end",
                           "dof_rear_start",
                           "dof_rear_end",
                           "dof_power",
                           "dof_bokeh_intensity",
                           "dof_on"];

    if (dof_params) {
        set_slider("dof_front_start", dof_params["dof_front_start"]);
        set_slider("dof_front_end", dof_params["dof_front_end"]);
        set_slider("dof_rear_start", dof_params["dof_rear_start"]);
        set_slider("dof_rear_end", dof_params["dof_rear_end"]);
        set_slider("dof_power", dof_params["dof_power"]);
        set_slider("dof_bokeh_intensity", dof_params["dof_bokeh_intensity"]);

        $("#" + "dof_distance").parent().parent().parent().removeClass('ui-disabled');
        if (dof_params["dof_object"]) {
            set_label("dof_object", object_to_interface_name(dof_params["dof_object"]));
            dof_param_names.splice(0, 1);
            $("#" + "dof_distance").parent().addClass('ui-disabled');
            $("#" + "dof_object").parent().removeClass('ui-disabled');
        } else {
            set_slider("dof_distance", dof_params["dof_distance"]);
            dof_param_names.splice(1, 1);
            $("#" + "dof_distance").parent().removeClass('ui-disabled');
            $("#" + "dof_object").parent().addClass('ui-disabled');
        }
        forbid_params(dof_param_names, "enable");

        var opt_index = (dof_params["dof_distance"] > 0) ? 1 : 0;
        document.getElementById("dof_on").options[opt_index].selected = true;

        $("#dof_on").slider("refresh");
    } else
        forbid_params(dof_param_names, "disable");
}

function set_dof_params(value) {
    var dof_params = {};

    if ("dof_distance" in value && Number($("#dof_on").val()))
        dof_params["dof_distance"] = value.dof_distance;

    if ("dof_front_start" in value)
        dof_params["dof_front_start"] = value.dof_front_start;

    if ("dof_front_end" in value)
        dof_params["dof_front_end"] = value.dof_front_end;

    if ("dof_rear_start" in value)
        dof_params["dof_rear_start"] = value.dof_rear_start;

    if ("dof_rear_end" in value)
        dof_params["dof_rear_end"] = value.dof_rear_end;

    if ("dof_power" in value)
        dof_params["dof_power"] = value.dof_power;

    if ("dof_bokeh_intensity" in value)
        dof_params["dof_bokeh_intensity"] = value.dof_bokeh_intensity;

    if ("dof_on" in value)
        dof_params["dof_on"] = Boolean(value.dof_on);

    m_scenes.set_dof_params(dof_params);
}

function get_god_rays_params() {
    var god_rays_params = m_scenes.get_god_rays_params();
    var god_rays_param_names = ["god_rays_intensity",
                                "god_rays_max_ray_length",
                                "god_rays_steps"];

    if (!god_rays_params) {
        forbid_params(god_rays_param_names, "disable");
        return;
    }

    forbid_params(god_rays_param_names, "enable");

    if (god_rays_params) {
        set_slider("god_rays_intensity", god_rays_params["god_rays_intensity"]);
        set_slider("god_rays_max_ray_length", god_rays_params["god_rays_max_ray_length"]);
        set_slider("god_rays_steps", god_rays_params["god_rays_steps"]);
    }
}

function set_god_rays_params(value) {
    var god_rays_params = {};

    if ("god_rays_intensity" in value) {
        god_rays_params["god_rays_intensity"] = value.god_rays_intensity;
    }

    if ("god_rays_max_ray_length" in value) {
        god_rays_params["god_rays_max_ray_length"] = value.god_rays_max_ray_length;
    }

    if ("god_rays_steps" in value) {
        god_rays_params["god_rays_steps"] = value.god_rays_steps;
    }

    m_scenes.set_god_rays_params(god_rays_params);
}

function set_canvas_resolution_factor(value) {

    if ("canvas_rf" in value) {
        m_cfg.set("canvas_resolution_factor", value.canvas_rf);
        on_resize();
    }
}

function get_mb_params() {
    var mb_params = m_scenes.get_mb_params();
    var mb_param_names = ["mb_factor",
                            "mb_decay_threshold"];

    if (!mb_params) {
        forbid_params(mb_param_names, "disable");
        return;
    }

    forbid_params(mb_param_names, "enable");

    if (mb_params) {
        set_slider("mb_factor", mb_params["mb_factor"]);
        set_slider("mb_decay_threshold", mb_params["mb_decay_threshold"]);
    }
}

function set_mb_params(value) {
    var mb_params = {};

    if ("mb_factor" in value) {
        mb_params["mb_factor"] = value.mb_factor;
    }
    if ("mb_decay_threshold" in value) {
        mb_params["mb_decay_threshold"] = value.mb_decay_threshold;
    }

    m_scenes.set_mb_params(mb_params);
}

function get_bloom_params() {
    var bloom_params = m_scenes.get_bloom_params();
    var bloom_param_names = ["bloom_key",
                             "bloom_blur",
                             "bloom_edge_lum"];

    if (!bloom_params) {
        forbid_params(bloom_param_names, "disable");
        return;
    }

    forbid_params(bloom_param_names, "enable");

    if (bloom_params) {
        set_slider("bloom_key", bloom_params["key"]);
        set_slider("bloom_blur", bloom_params["blur"]);
        set_slider("bloom_edge_lum", bloom_params["edge_lum"]);
    }
}

function set_bloom_params(value) {
    var bloom_params = {};

    if ("bloom_key" in value) {
        bloom_params["key"] = value.bloom_key;
    }
    if ("bloom_blur" in value) {
        bloom_params["blur"] = value.bloom_blur;
    }
    if ("bloom_edge_lum" in value) {
        bloom_params["edge_lum"] = value.bloom_edge_lum;
    }

    m_scenes.set_bloom_params(bloom_params);
}

function get_glow_material_params() {
    var glow_material_params = m_scenes.get_glow_material_params();
    var glow_material_param_names = ["small_glow_mask_coeff",
                                     "large_glow_mask_coeff",
                                     "small_glow_mask_width",
                                     "large_glow_mask_width"];

    if (!glow_material_params) {
        forbid_params(glow_material_param_names, "disable");
        return;
    }

    forbid_params(glow_material_param_names, "enable");

    set_slider("small_glow_mask_coeff", glow_material_params["small_glow_mask_coeff"]);
    set_slider("large_glow_mask_coeff", glow_material_params["large_glow_mask_coeff"]);
    set_slider("small_glow_mask_width", glow_material_params["small_glow_mask_width"]);
    set_slider("large_glow_mask_width", glow_material_params["large_glow_mask_width"]);
}

function set_glow_material_params(value) {
    var glow_material_params = {};

    if ("small_glow_mask_coeff" in value) {
        glow_material_params["small_glow_mask_coeff"] = value.small_glow_mask_coeff;
    }
    if ("large_glow_mask_coeff" in value) {
        glow_material_params["large_glow_mask_coeff"] = value.large_glow_mask_coeff;
    }
    if ("small_glow_mask_width" in value) {
        glow_material_params["small_glow_mask_width"] = value.small_glow_mask_width;
    }
    if ("large_glow_mask_width" in value) {
        glow_material_params["large_glow_mask_width"] = value.large_glow_mask_width;
    }

    m_scenes.set_glow_material_params(glow_material_params);
}

function set_color_picker(id, color) {
    var css_rgb = m_rgb.rgb_to_css(color);
    var css_hex = m_rgb.rgb_to_css_hex(color);

    var rgb = {
        r: css_rgb[0],
        g: css_rgb[1],
        b: css_rgb[2]
    };
    $("#" + id).ColorPickerSetColor(rgb);
    $("#" + id + " div").css('backgroundColor', css_hex);
}

function get_wind_params() {
    var wind_params = m_scenes.get_wind_params();
    var wind_param_names = ["wind_dir",
                            "wind_strength"];

    if (wind_params) {
        set_slider("wind_dir", wind_params["wind_dir"]);
        set_slider("wind_strength", wind_params["wind_strength"]);
    } else
        forbid_params(wind_param_names, "disable");
}

function set_wind_params(value) {
    var wind_params = {};

    if ("wind_dir" in value) {
        wind_params["wind_dir"] = value.wind_dir;
    }
    if ("wind_strength" in value) {
        wind_params["wind_strength"] = value.wind_strength;
    }
    m_scenes.set_wind_params(wind_params);
}

function set_slider(id, val) {
    var slider = $("#" + id);
    slider.val(val);
    slider.slider("refresh");
}

function get_slider_value(id) {
    return parseFloat(document.getElementById(id).value);
}

function set_label(id, val) {
    $("#" + id).text(val);
}

function bind_control(fun, id, type) {
    $("#" + id).bind("change", function(e) {
        var arg = {};

        switch(type) {
        case "string":
            arg[id] = e.target.value;
            break;
        case "number":
            arg[id] = parseFloat(e.target.value);
            break;
        case "bool":
            arg[id] = Boolean(Number(e.target.value));
            break;
        default:
            console.log("wrong value type");
            return null;
        }

        fun(arg);
    });
}

function bind_colpick(fun, id) {
    $("#" + id).ColorPicker({onChange: function (hsb, css_hex, css_rgb) {
        $("#" + id + " div").css('backgroundColor', '#' + css_hex);
        var arg = {};
        var color = m_rgb.css_to_rgb(css_rgb.r, css_rgb.g, css_rgb.b);
        // need untyped array here
        arg[id] = [color[0], color[1], color[2]];
        fun(arg);
    }});
}

function init_jQM_select(id) {
    $("#" + id).selectmenu();
    $("#" + id).selectmenu("refresh");
}

function auto_rotate_cam() {
    m_cam_anim.auto_rotate(AUTO_ROTATE_RATIO);
}

function forbid_params(params, state) {
    if (!params)
        return null;

    for (var i = 0; i < params.length; i++) {
        var elem = $("#" + params[i]).parent().parent();

        if (state == "enable")
            elem.removeClass('ui-disabled');
        else if (state == "disable")
            elem.addClass('ui-disabled');
    }
}

function forbid_elem(params, state) {
    if (!params)
        return null;

    for (var i = 0; i < params.length; i++) {
        var elem = $("#" + params[i]);

        if (state == "enable")
            elem.removeClass('ui-disabled');
        else if (state == "disable")
            elem.addClass('ui-disabled');
    }
}

function object_to_interface_name(obj) {
    return m_scenes.get_object_name_hierarchy(obj).join("->");
}

function interface_name_to_object(name) {
    return m_scenes.get_object_by_dupli_name_list(name.split("->"));
}

});

b4w.require("viewer_main").init();
