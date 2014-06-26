"use strict";

b4w.register("viewer_main", function(exports, require) {

var m_anim     = require("animation");
var m_app      = require("app");
var m_assets   = require("assets");
var m_cam      = require("camera");
var m_cam_anim = require("camera_anim");
var m_cfg      = require("config");
var m_cons     = require("constraints");
var m_ctl      = require("controls");
var m_data     = require("data");
var m_debug    = require("debug");
var m_lights   = require("lights");
var m_main     = require("main");
var m_mixer    = require("mixer");
var m_mat      = require("material");
var m_scenes   = require("scenes");
var m_shaders  = require("shaders");
var m_storage  = require("storage");
var m_trans    = require("transform");
var m_version  = require("version");

var m_vec3 = require("vec3");

var DEBUG = (m_version.type() === "DEBUG");
var AUTO_VIEW_INTERVAL = 1000;
var AUTO_ROTATE_RATIO  = 0.3;
var DEFAULT_SCENE      = "dev/logo.json";

var INIT_PARAMS = {
    canvas_container_id: "main_canvas_container", 
    callback: init_cb,
    gl_debug: true,
    show_hud_debug_info: get_show_hud_debug_info_config(),
    sfx_mix_mode: get_mix_mode_config(),
    show_fps: true,

    // engine config
    alpha : true,
    assets_dds_available: !DEBUG,
    assets_min50_available: !DEBUG,
    console_verbose: true,
    all_objs_selectable: true,
    physics_enabled: true,
    wireframe_debug: true
};

var ANIM_OBJ_DEFAULT_INDEX = 0;
var ANIM_NAME_DEFAULT_INDEX = 0;

var _vec3_tmp = new Float32Array(3);

var _auto_view = false;
var _auto_view_timeout_handle;

// TODO switch off images not-cache

var _manifest = null;

var _anim_objs = [];
var _anim_index = 0;
var _anim_armature_mesh_pairs = [];

var _settings = null;
var _scene_settings = null;

var _object_info_elem = null;
var _lights_elem = null;

var _selected_object_name = null;
var _object_selected_callback = function() {};
var _controlled_object_name = null;
var _dist_to_camera = null;

exports.init = function() {
    set_quality_config();
    set_stereo_view_config();

    m_app.init(INIT_PARAMS);

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

    m_app.enable_controls(canvas_elem);

    window.addEventListener("resize", on_resize, false);

    var tmp_event = document.createEvent("CustomEvent");
    tmp_event.initEvent("resize", false, false);
    window.dispatchEvent(tmp_event);

    var asset_cb = function(data, uri, type, path) {
        _manifest = data;
        init_ui();
        var item_id = retrieve_last_item_id();
        process_scene(item_id, false, false);
    }

    m_assets.enqueue([["manifest", m_assets.AT_JSON,
            get_asset_path("assets.json")]], asset_cb, null);


}

function get_asset_path(filename) {
    // path to assets directory
    if (DEBUG)
        var assets_dir =  "../../external/deploy/assets/";
    else
        var assets_dir = "../../assets/";

    return assets_dir + filename;
}

function get_selected_object() {
    if (_selected_object_name) {
        var obj = m_scenes.get_object_by_name(_selected_object_name);
        if (obj)
            return obj;
    }

    return null;
}

function main_canvas_clicked(event) {
    if (!_object_info_elem)
        return;

    if (event.preventDefault)
        event.preventDefault();

    var x = event.clientX;
    var y = event.clientY;

    var prev_obj = get_selected_object();
    if (prev_obj)
        m_scenes.clear_glow_anim(prev_obj);

    var name_selected = m_scenes.pick_object(x, y);
    _selected_object_name = name_selected;

    if (name_selected.length) {
        _object_selected_callback(name_selected);
        var obj = get_selected_object();
        if (obj)
            m_scenes.apply_glow_anim(obj, 0.2, 3.8, 1);
    } else
        forbid_material_params();

    set_object_info();

    if (_controlled_object_name)
        return;

    if (name_selected.length) {
        if (obj) {
            _controlled_object_name = obj["name"];
            set_object_info();
            m_app.enable_object_controls(obj);
            m_ctl.create_kb_sensor_manifold(obj, "QUIT", m_ctl.CT_SHOT, m_ctl.KEY_Q, 
                    function(obj, id, value, pulse) { 
                        _controlled_object_name = null;
                        set_object_info();
                        m_app.disable_object_controls(obj);
                    });
        }
    } else
        enable_camera_controls();
}

function enable_camera_controls() {
    var obj = m_scenes.get_active_camera();

    _controlled_object_name = obj["name"];
    set_object_info();

    var cam_rot_speed = _scene_settings.camera_rot_speed;
    m_app.enable_camera_controls(1, cam_rot_speed);
    m_ctl.create_kb_sensor_manifold(obj, "QUIT", m_ctl.CT_SHOT, m_ctl.KEY_Q, 
            function(obj, id, value, pulse) { 
                _controlled_object_name = null;
                set_object_info();
                m_app.disable_object_controls(obj);
            });

    var key_z = m_ctl.create_keyboard_sensor(m_ctl.KEY_Z);
    var key_dec_point = m_ctl.create_keyboard_sensor(m_ctl.KEY_DEC_POINT);

    var zoom_to_array = [key_z, key_dec_point];
    var zoom_to_logic = function(s) {
        return s[0] || s[1];
    }
    var zoom_to_cb = function(obj, id, pulse) {
        var selobj = get_selected_object();
        if (selobj)
            m_cam.zoom_object(obj, selobj);
    }

    m_ctl.create_sensor_manifold(obj, "ZOOM_TO", m_ctl.CT_SHOT, zoom_to_array, 
            zoom_to_logic, zoom_to_cb);

}

function set_object_info() {
    if (!_object_info_elem)
        return;

    var controlled_str = _controlled_object_name ? 
            String(_controlled_object_name) : "NONE";
    var selected_str = _selected_object_name ? 
            String(_selected_object_name) : "NONE";

    var info = "CONTROLLED: " + controlled_str + " | SELECTED: " + selected_str;
    var controlled_obj = get_controlled_object();

    if (_selected_object_name && controlled_obj &&
                                 controlled_obj.type === "CAMERA")
        info += " | DISTANCE: " + _dist_to_camera;

    _object_info_elem.innerHTML = info;
}

function get_controlled_object() {
    if (_controlled_object_name) {
        var obj = m_scenes.get_object_by_name(_controlled_object_name);
        if (obj)
            return obj;
    }

    return false;
}

function retrieve_last_item_id() {

    var item_name = m_storage.get("last_item_name");
    if (!item_name) // undefined or ""
        return null;

    for (var i = 0; i < _manifest.length; i++) {
        var category = _manifest[i];
        var item = keyfind("name", item_name, category.items)[0];
        if (item) 
            return {category: category.name, item: item_name};
    }
    return null;
}

function init_ui() {
    _object_info_elem = document.getElementById("info_left_down");
    _lights_elem = document.getElementById("lights_cont");

    // build date
    document.getElementById("build_date").innerHTML = m_version.date();

    // general buttons
    bind_control(save_quality_and_reload, "quality");
    refresh_quality_ui();

    m_app.set_onclick("reset_memory", reset_memory);
    m_app.set_onclick("auto_rotate_cam", auto_rotate_cam);
    m_app.set_onclick("pause", pause_clicked);
    m_app.set_onclick("resume", resume_clicked);
    m_app.set_onclick("auto_view", start_auto_view);

    // list of scenes
    init_scenes_list();

    // animation
    bind_control(set_animation_params, "anim_active_object");
    bind_control(set_animation_params, "anim_action");
    bind_control(set_animation_params, "anim_cyclic");
    bind_control(set_animation_params, "anim_frame_current");
    m_app.set_onclick("anim_play", anim_play_clicked);
    m_app.set_onclick("anim_stop", anim_stop_clicked);
    m_app.set_onclick("get_max_bones", get_max_bones);

    // materials
    bind_control(set_material_params, "material_name");
    bind_colpick(set_material_params, "material_diffuse_color");
    bind_control(set_material_params, "material_reflectivity");
    bind_control(set_material_params, "material_fresnel");
    bind_control(set_material_params, "material_fresnel_factor");
    bind_control(set_material_params, "material_parallax_scale");
    bind_control(set_material_params, "material_parallax_steps");

    // water_materials
    bind_control(set_water_material_params, "material_name");
    bind_control(set_water_material_params, "shore_smoothing");
    bind_control(set_water_material_params, "absorb_factor");
    bind_control(set_water_material_params, "sss_strength");
    bind_control(set_water_material_params, "sss_width");
    bind_colpick(set_water_material_params, "water_fog_color");
    bind_control(set_water_material_params, "water_fog_density");
    bind_colpick(set_water_material_params, "shallow_water_col");
    bind_control(set_water_material_params, "shallow_water_col_fac");
    bind_colpick(set_water_material_params, "shore_water_col");
    bind_control(set_water_material_params, "shore_water_col_fac");
    bind_control(set_water_material_params, "foam_factor");
    bind_control(set_water_material_params, "water_dynamic");
    bind_control(set_water_material_params, "waves_height");
    bind_control(set_water_material_params, "waves_length");
    bind_control(set_water_material_params, "dst_noise_scale0");
    bind_control(set_water_material_params, "dst_noise_scale1");
    bind_control(set_water_material_params, "dst_noise_freq0");
    bind_control(set_water_material_params, "dst_noise_freq1");
    bind_control(set_water_material_params, "dir_min_shore_fac");
    bind_control(set_water_material_params, "dir_freq");
    bind_control(set_water_material_params, "dir_noise_scale");
    bind_control(set_water_material_params, "dir_noise_freq");
    bind_control(set_water_material_params, "dir_min_noise_fac");
    bind_control(set_water_material_params, "dst_min_fac");
    bind_control(set_water_material_params, "waves_hor_fac");

    // ambient
    bind_control(set_ambient_params, "environment_energy");
    bind_colpick(set_ambient_params, "horizon_color");
    bind_colpick(set_ambient_params, "zenith_color");

    // lighting
    bind_control(set_lighting_params, "light_name");
    bind_colpick(set_lighting_params, "light_color");
    bind_control(set_lighting_params, "light_energy");
    bind_colpick(set_sky_params, "sky_color");
    bind_control(set_sky_params, "rayleigh_brightness");
    bind_control(set_sky_params, "mie_brightness");
    bind_control(set_sky_params, "spot_brightness");
    bind_control(set_sky_params, "scatter_strength");
    bind_control(set_sky_params, "rayleigh_strength");
    bind_control(set_sky_params, "mie_strength");
    bind_control(set_sky_params, "rayleigh_collection_power");
    bind_control(set_sky_params, "mie_collection_power");
    bind_control(set_sky_params, "mie_distribution");

    bind_control(set_time_date, "date");
    bind_control(set_time_date, "day_time");
    bind_control(set_sun_params, "sun_horizontal_position");
    bind_control(set_sun_params, "sun_vertical_position");
    bind_control(set_max_sun_angle, "max_sun_angle");
    m_app.set_onclick("run_sun", run_sun_clicked);
    m_app.set_onclick("stop_sun", stop_sun_clicked);

    // shadows
    bind_control(set_shadow_params, "optimize_shadow_volume");
    bind_control(set_shadow_params, "csm_near");
    bind_control(set_shadow_params, "csm_far");
    bind_control(set_shadow_params, "csm_lambda");
    bind_control(set_shadow_params, "shadow_visibility_falloff");
    bind_control(set_shadow_params, "blur_depth_size_mult");
    bind_control(set_shadow_params, "blur_depth_edge_size");
    bind_control(set_shadow_params, "blur_depth_diff_threshold");
    
    // ssao
    bind_control(set_ssao_params, "ssao_quality");
    bind_control(set_ssao_params, "ssao_radius_increase");
    bind_control(set_ssao_params, "ssao_dithering_amount");
    bind_control(set_ssao_params, "ssao_gauss_center");
    bind_control(set_ssao_params, "ssao_gauss_width_square");
    bind_control(set_ssao_params, "ssao_gauss_width_left_square");
    bind_control(set_ssao_params, "ssao_influence");
    bind_control(set_ssao_params, "ssao_dist_factor");
    bind_control(set_ssao_params, "ssao_only");
    bind_control(set_ssao_params, "ssao_white");

    // fog
    bind_control(set_fog_params, "fog_density");
    bind_control(set_fog_params, "fog_density1000");
    bind_colpick(set_fog_params, "fog_color");

    // dof 
    bind_control(set_dof_params, "dof_distance");
    bind_control(set_dof_params, "dof_front");
    bind_control(set_dof_params, "dof_rear");
    bind_control(set_dof_params, "dof_power");
    bind_control(set_dof_params, "dof_on");

    // god_rays 
    bind_control(set_god_rays_params, "god_rays_intensity");
    bind_control(set_god_rays_params, "god_rays_max_ray_length");
    bind_control(set_god_rays_params, "god_rays_steps");

    // color correction
    bind_control(set_color_correction_params, "brightness");
    bind_control(set_color_correction_params, "contrast");
    bind_control(set_color_correction_params, "exposure");
    bind_control(set_color_correction_params, "saturation");

    // audio mixer
    bind_control(set_mix_mode_and_reload, "sfx_mix_mode");
    refresh_mix_mode_ui();

    // stereo view
    bind_control(set_stereo_view_and_reload, "anaglyph_use");
    refresh_stereo_view_ui();

    // wind
    bind_control(set_wind_params, "wind_dir");
    bind_control(set_wind_params, "wind_strength");

    bind_control(set_bloom_params, "bloom_key");
    bind_control(set_bloom_params, "bloom_blur");
    bind_control(set_bloom_params, "bloom_edge_lum");

    // debug
    bind_control(set_debug_params, "wireframe_mode");
    bind_colpick(set_debug_params, "wireframe_edge_color");
    bind_control(set_hud_debug_info_and_reload, "show_hud_debug_info");
    refresh_hud_debug_info_ui();

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

function init_scenes_list() {

    var manifest_elem = document.getElementById("manifest");

    if (!_manifest) {
        manifest_elem.innerHTML = 
            "<p style='color: red;'>Failed loading scenes list.</p><p>Maybe a syntax error?</p>";
        return;
    }

    var s = "";
    for (var i = 0; i < _manifest.length; i++) 
        s += init_scenes_list_category(_manifest[i]);

    $("#" + manifest_elem.id).append(s);
    $("#" + manifest_elem.id).trigger("create");
    
    manifest_elem.addEventListener("mouseup", manifest_item_clicked, false);
}

function init_scenes_list_category(category) {

    var name = category.name;
    var items = category.items;
 
    var s = "";

    s += "<div data-role='collapsible' data-mini='true' >";
    s += "<h6>" + name + "</h6>";

    s += "<ul data-role='listview' data-mini='true' data-inset='true' style='margin: -10px 0;'>";

    for (var i = 0; i < items.length; i++) {
        var item_name = items[i].name;
        var item_id = "MANIFEST_ITEM_" + item_name + "__SEPARATOR__" + name;
        s += "<li data-mini='true'><a href='#' class='min_font' id='" + item_id + "'>" + item_name + "</a></li>"
    }
    s += "</ul>"
    s += "</div>"
    
    return s;
}

function reset_settings_to_default() {

    for (var i = 0; i <_lights_elem.children.length; i++)
        _lights_elem.children[i].style.visibility = "hidden";

    _settings = {
        load_file         : DEFAULT_SCENE,
        animated_objects  : []
    };

    _scene_settings = null;
    _anim_objs = [];
    _anim_index = 0;
    _anim_armature_mesh_pairs = [];
}

function load_scene(wait_textures) {
    var name = _settings.name || "Logo";
    var file = _settings.load_file;

    // update ui
    var cf_elem = document.getElementById("current_file");
    cf_elem.innerHTML = name;
    cf_elem.setAttribute("title", name + " (" + file + ")");

    // load
    m_data.load(get_asset_path(file), loaded_callback, preloader_callback,
            wait_textures);
}

function manifest_item_clicked(e) {

    var elem_id = e.target.id;
    if (elem_id.indexOf("MANIFEST_ITEM_") == -1)
        return;

    var id_split = elem_id.split("__SEPARATOR__");
    var category_name = id_split[1];
    var item_name = id_split[0].split("MANIFEST_ITEM_")[1];

    // cancel auto view
    _auto_view = false;
    clearTimeout(_auto_view_timeout_handle);

    process_scene({category: category_name, item: item_name}, true, false);
}

function process_scene(names, call_reset_b4w, wait_textures) {
    
    reset_settings_to_default();

    if (names) {
        var category = keyfind("name", names.category, _manifest)[0];
        var item = keyfind("name", names.item, category.items)[0];

        for (var prop in item)
            _settings[prop] = item[prop];
        m_storage.set("last_item_name", names.item);
    } else {
        m_storage.set("last_item_name", "");  
    }

    if (call_reset_b4w)
        reset_b4w();

    var canvas_elem = m_main.get_canvas_elem();
    canvas_elem.removeEventListener('mousedown', main_canvas_clicked);
    m_debug.clear_errors_warnings();

    load_scene(wait_textures);
}

function loaded_callback(root) {

    var canvas_elem = m_main.get_canvas_elem();
    canvas_elem.addEventListener("mousedown", main_canvas_clicked, false);

    m_scenes.set_glow_color([1, 0.4, 0.05]);
    
    _selected_object_name = null;
    prepare_scenes(_settings);

    enable_camera_controls();
    m_app.enable_debug_controls();

    if (get_mix_mode_config())
        m_mixer.enable_mixer_controls(m_scenes.get_active_camera());

    m_main.set_render_callback(render_callback);

    if (_auto_view) 
        _auto_view_timeout_handle = 
            setTimeout(auto_view_load_next, AUTO_VIEW_INTERVAL);

    var elapsed = m_ctl.create_elapsed_sensor();
    var cam_dist_cb = function(obj, id, pulse) {
        if (pulse == 1 && _selected_object_name) {
            var sel_obj = get_selected_object();
            if (sel_obj) {
                var sel_obj_pos = _vec3_tmp;
                var calc_bs_center = true;
                m_trans.get_object_center(sel_obj, calc_bs_center, sel_obj_pos);
                var cam_eye = m_cam.get_eye(obj);
                var dist = m_vec3.dist(sel_obj_pos, cam_eye);
                _dist_to_camera = dist.toFixed(3);
            }

            set_object_info();
        }
    }
    m_ctl.create_sensor_manifold(m_scenes.get_active_camera(), "TO_OBJ",
            m_ctl.CT_CONTINUOUS, [elapsed], null, cam_dist_cb);
}

function auto_view_load_next() {

    var item_id = retrieve_last_item_id();

    if (item_id) {
        var category_name = item_id.category;
        var item_name = item_id.item;
        var category = keyfind("name", category_name, _manifest)[0];
        var item = keyfind("name", item_name, category.items)[0];
        var item_index = category.items.indexOf(item);

        var new_item = category.items[item_index + 1];
        if (new_item) { // grab next item
            item_id = {category: category.name, item: new_item.name};
        } else { // grab next category
            var category_index = _manifest.indexOf(category);
            var new_category = _manifest[category_index + 1];
            
            if (new_category) {
                item_id = {category: new_category.name, item: new_category.items[0].name};
            } else {
                // finished
                _auto_view = false;
                return;
            }
        }
    } else {
        var category = _manifest[0];
        var item = category.items[0];
        item_id = {category: category.name, item: item.name};
    }

    process_scene(item_id, true, true);
}

function preloader_callback(percentage, load_time) {
    var lp_elem = document.getElementById("loading_progress");
    lp_elem.innerHTML = percentage + "% (" + 
        Math.round(10 * load_time / 1000)/10 + "s)";

    var errors = m_debug.get_error_quantity();
    var warnings = m_debug.get_warning_quantity();

    // bpy data loaded
    if (m_data.is_loaded()) {
        display_scene_stats();
        add_error_tooltip();
        if (!warnings && !errors) {
            _lights_elem.children[2].style.visibility = 'visible';
        }
    }

    if (warnings && !errors)
        _lights_elem.children[1].style.visibility = 'visible';

    if (errors) {
        _lights_elem.children[1].style.visibility = 'hidden';
        _lights_elem.children[0].style.visibility = 'visible';
    }

    // data and resources loaded
    //if (percentage >= 100)
}

function add_error_tooltip() {

    var errors = m_debug.get_error_quantity();
    var warnings = m_debug.get_warning_quantity();

    if (warnings || errors)
        _lights_elem.setAttribute("title",
                                  "warnings:" + warnings +
                                  '\n' + "errors:" + errors);
    else
        _lights_elem.setAttribute("title", "Loaded OK");
}

function display_scene_stats() {

    var verts = m_debug.num_vertices();
    var tris = m_debug.num_triangles();
    var calls = m_debug.num_draw_calls();

    document.getElementById("info_right_up").innerHTML = 
        verts + " verts" + ", " + tris + " tris" + ", " + calls + " draw calls";

    var gstats = m_debug.geometry_stats();
    var texinfo = m_debug.num_textures();
    var rtinfo = m_debug.num_render_targets();

    var mem_geom = Math.round(10 * (gstats.ibo_memory + gstats.vbo_memory)) / 10;
    var mem_tex = Math.round(10 * texinfo.memory) / 10;
    var mem_rts = Math.round(10 * rtinfo.memory) / 10;
    var mem_total = Math.round(10 * (mem_geom + mem_tex + mem_rts)) / 10; 

    document.getElementById("info_right_down").innerHTML = 
        "Geometry: " + mem_geom + " MiB (" + gstats.ibo_number + "+" + gstats.vbo_number + ")<br>" +
        "Textures: " + mem_tex + " MiB (" + texinfo.number + ")<br>" + 
        "RTs: " + mem_rts + " MiB (" + rtinfo.number + ")<br><br>" + 
        "Total: " + mem_total + " MiB";
}

function prepare_scenes(global_settings) {

    var main_scene_name = m_scenes.get_active();

    // ALL SCENES EXCEPT MAIN
    
    var scene_names = m_scenes.get_scenes();
    for (var i = 0; i < scene_names.length; i++) { 
        var name = scene_names[i];
        if (name === main_scene_name)
            continue;

        var settings = get_scene_settings(name, global_settings);
        change_apply_scene_settings(name, settings);
    }

    // MAIN SCENE
   
    var settings = get_scene_settings(main_scene_name, global_settings);
    change_apply_scene_settings(main_scene_name, settings);

    // ui for changing material color
    _object_selected_callback = function(name_selected) {
        var obj = m_scenes.get_object_by_name(name_selected);
        var mat_names = m_mat.get_materials_names(obj);
        fill_select_options("material_name", mat_names);
        get_material_params(obj, mat_names[0]);
        get_water_material_params(obj, mat_names[0]);
    };

    get_ambient_params();

    // init lights list
    var lnames = m_lights.get_lights_names();
    fill_select_options("light_name", lnames);
    get_lighting_params(lnames[0]);

    get_shadow_params();
    get_ssao_params();
    get_fog_params();
    get_dof_params();
    get_god_rays_params();
    get_color_correction_params();
    get_wind_params();
    get_sun_params();
    get_sky_params();
    get_bloom_params();
    check_lighting_params();
    forbid_material_params();
    forbid_debug_params();

    var date = new Date(document.getElementById("date").value);
    set_time_date({"date": date});

    _scene_settings = settings;
}

/*
 * Create a new settings object by merging global settings and scene settings
 */
function get_scene_settings(scene_name, glob_settings) {

    function copy_obj(from, to) {
        for (var prop in from)
            to[prop] = from[prop];
        return to;
    }

    var scene_settings = glob_settings.scene_settings;

    if (scene_settings && scene_settings[scene_name]) {
        var settings = {}; 
        copy_obj(glob_settings, settings);
        copy_obj(scene_settings[scene_name], settings);
        delete settings.scene_settings;
        return settings;
    } else
        return glob_settings;
}

function change_apply_scene_settings(scene_name, settings) {

    m_scenes.set_active(scene_name);
    var camera = m_scenes.get_active_camera();

    // camera settings
    if (settings.camera_target) {
        var targ = settings.camera_target;
        m_cons.append_follow(camera, targ);
    }

    var hang = settings.h_angle;
    var vang = settings.v_angle;

    if ((hang === 0 || hang) && (vang === 0 || vang))
        m_cam.set_eye_params(camera, hang, vang);

    // init anim active objects list
    
    _anim_index = ANIM_OBJ_DEFAULT_INDEX;

    for (var i = 0; i < settings.animated_objects.length; i++) {
        var name = settings.animated_objects[i];
        var anim_obj = (name instanceof Array) ? 
                m_scenes.get_object_by_empty_name(name[0], name[1]) : 
                m_scenes.get_object_by_name(name);
        if (!anim_obj) {
            console.error("Animated object not found: ", name);
            continue;
        }

        // NOTE: temporary, need apply_def()
        var anim_names = m_anim.get_anim_names(anim_obj);
        var default_anim_name = anim_names[ANIM_NAME_DEFAULT_INDEX];
        if (default_anim_name) {
            m_anim.apply(anim_obj, default_anim_name);
            m_anim.play(anim_obj);
            m_anim.cyclic(anim_obj, true);
        }
    }

    var anim_obj_names = [];
    var scene_objs = m_scenes.get_appended_objs("ALL");
    for (var i = 0; i < scene_objs.length; i++) {
        var sobj = scene_objs[i];
        if (m_anim.is_animated(sobj)) {
            // NOTE: do not add skinned meshes to list of animated objects,
            // handle them separately
            var armobj = m_anim.get_first_armature_object(sobj);
            if (armobj && m_anim.is_animated(armobj)) {
                _anim_armature_mesh_pairs.push(armobj, sobj);
            } else {
                _anim_objs.push(sobj);
                anim_obj_names.push(m_scenes.get_object_name(sobj));
            }
        }
    }

    var anim_param_names = ["anim_active_object",
                            "anim_action",
                            "anim_cyclic",
                            "anim_frame_range",
                            "anim_frame_current",
                            "anim_play",
                            "anim_stop",
                            "get_max_bones"];

    if (_anim_objs.length) {
        forbid_params(anim_param_names, "enable");
    } else {
        forbid_params(anim_param_names, "disable");
        return;
    }
    
    fill_select_options("anim_active_object", anim_obj_names);
    set_animation_params({anim_active_object :
            m_scenes.get_object_name(_anim_objs[ANIM_OBJ_DEFAULT_INDEX])});
}

function render_callback(elapsed, current_time) {
    var camera = m_scenes.get_active_camera();
    var anim_objects = get_anim_objects(_anim_objs, _anim_index);
    var anim_object0 = anim_objects[0];
    if (anim_object0) {
        // update anim status
        var elem_status = document.getElementById("anim_status");
        if (m_anim.is_play(anim_object0)) {
            elem_status.innerHTML = "PLAYING";
        } else {
            elem_status.innerHTML = "STOPPED";
        }

        // update frame range
        var fr_elem = document.getElementById("anim_frame_range");
        var fr = m_anim.get_frame_range(anim_object0);
        if (fr) {
            fr_elem.innerHTML = fr[0] + " - " + fr[1];
            var slider = document.getElementById("anim_frame_current");
            slider.min = "" + fr[0];
            slider.max = "" + fr[1];
        }

        // update current frame 
        var frame = Math.round(m_anim.get_frame(anim_object0));
        if (parseInt($("#anim_frame_current").val()) !== frame) // optimization
            set_slider("anim_frame_current", frame);
    }
}

function get_anim_objects(objs, index) {
    var anim_objs = [];
    
    if (objs[index]) {
        anim_objs.push(objs[index]);

        for (var i = 0; i < _anim_armature_mesh_pairs.length; i+=2) {
            var armobj = _anim_armature_mesh_pairs[i];
            var meshobj = _anim_armature_mesh_pairs[i+1];

            if (armobj == objs[index])
                anim_objs.push(meshobj);
        }
    }

    return anim_objs;
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

function reset_memory() {
    m_storage.cleanup();
    window.location.reload();
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

function set_stereo_view_config() {
    m_cfg.set("anaglyph_use", m_storage.get("anaglyph_use") === "true");
}

function refresh_hud_debug_info_ui() {
    var opt_index = (m_storage.get("show_hud_debug_info") === "true") ? 0 : 1;
    document.getElementById("show_hud_debug_info").options[opt_index].selected = true;
    $("#show_hud_debug_info").slider("refresh");
}

function set_hud_debug_info_and_reload(value) {
    m_storage.set("show_hud_debug_info", value.show_hud_debug_info === "on");
    window.location.reload();
}

function refresh_mix_mode_ui() {
    var opt_index = (m_storage.get("sfx_mix_mode") === "true") ? 0 : 1;
    document.getElementById("sfx_mix_mode").options[opt_index].selected = true;
    $("#sfx_mix_mode").slider("refresh");
}

function set_mix_mode_and_reload(value) {
    m_storage.set("sfx_mix_mode", value.sfx_mix_mode === "on");
    window.location.reload();
}

function refresh_stereo_view_ui() {
    var opt_index = (m_storage.get("anaglyph_use") === "true") ? 0 : 1;
    document.getElementById("anaglyph_use").options[opt_index].selected = true;
    $("#anaglyph_use").slider("refresh");
}

function set_stereo_view_and_reload(value) {
    m_storage.set("anaglyph_use", value.anaglyph_use === "on");
    window.location.reload();
}

function start_auto_view() {
    _auto_view = true;
    auto_view_load_next();
}

function on_resize(e) {
    var w = e.target.innerWidth;
    var h = e.target.innerHeight;

    var controls_width = document.getElementById("controls_container").offsetWidth;
    w -= controls_width;
    
    m_main.resize(w, h);
    
    document.getElementById("info_left_up").innerHTML = w + "x" + h;
}

function cleanup() {
    _anim_objs = [];
    _anim_index = 0;
    _settings = null;
    _scene_settings = null;
}

/*
 * Animation controls
 */

function anim_play_clicked() {
    var anim_objects = get_anim_objects(_anim_objs, _anim_index);

    for (var i = 0; i < anim_objects.length; i++) {
        m_anim.play(anim_objects[i]);
    }
}
function anim_stop_clicked() {
    var anim_objects = get_anim_objects(_anim_objs, _anim_index);
    for (var i = 0; i < anim_objects.length; i++) {
        m_anim.stop(anim_objects[i]);
    }
}

function get_max_bones() {

    m_main.pause();

    var rslt = m_shaders.determine_max_bones();

    document.getElementById("max_bones").innerHTML = rslt.max_bones;
    document.getElementById("max_bones_no_blending").innerHTML = rslt.max_bones_no_blending;

    m_main.resume();
}

function set_animation_params(value) {
    if ("anim_active_object" in value) {
        for (var i = 0; i < _anim_objs.length; i++) {
            if (m_scenes.get_object_name(_anim_objs[i]) ==
                    value.anim_active_object) {
                _anim_index = i;

                var anim_names = m_anim.get_anim_names(_anim_objs[_anim_index]);
                if (anim_names.length)
                    fill_select_options("anim_action", anim_names);
                else
                    fill_select_options("anim_action", ["N/A"]);

                return;
            }
        }
    }

    if ("anim_action" in value) {
        var anim_objects = get_anim_objects(_anim_objs, _anim_index);
        
        for (var i = 0; i < anim_objects.length; i++) {
            m_anim.apply(anim_objects[i], value.anim_action);
            m_anim.play(anim_objects[i]);
            m_anim.cyclic(anim_objects[i], true);
        }
    }

    if ("anim_cyclic" in value) {
        var anim_objects = get_anim_objects(_anim_objs, _anim_index);

        for (var i = 0; i < anim_objects.length; i++) {
            var obj = anim_objects[i];
            m_anim.cyclic(obj, value.anim_cyclic === "on");
        }
    }

    if ("anim_frame_current" in value) {
        var current = parseInt(value.anim_frame_current);
        var anim_objects = get_anim_objects(_anim_objs, _anim_index);

        for (var i = 0; i < anim_objects.length; i++) {
            var obj = anim_objects[i];
            
            // prevent double update 
            // (set_slider called every frame)
            if (!m_anim.is_play(obj))
                m_anim.set_frame(obj, current);
        }
    }
}

function get_ssao_params() {
    var ssao = m_scenes.get_ssao_params();
    var ssao_param_names = ["ssao_quality",
                            "ssao_radius_increase",
                            "ssao_dithering_amount",
                            "ssao_gauss_center",
                            "ssao_gauss_width_square",
                            "ssao_gauss_width_left_square",
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

    set_slider("ssao_radius_increase", ssao["radius_increase"]);
    set_slider("ssao_dithering_amount", 1000 * ssao["dithering_amount"]);
    set_slider("ssao_gauss_center", ssao["gauss_center"]);
    set_slider("ssao_gauss_width_square", Math.sqrt(ssao["gauss_width_square"]));
    set_slider("ssao_gauss_width_left_square", Math.sqrt(ssao["gauss_width_left_square"]));
    set_slider("ssao_influence", ssao["influence"]);
    set_slider("ssao_dist_factor", ssao["dist_factor"]);

    var opt_index = (ssao["ssao_only"] === 0) ? 1 : 0;
    document.getElementById("ssao_only").options[opt_index].selected = true;
    $("#ssao_only").slider("refresh");

    var opt_index = (ssao["ssao_white"] === 0) ? 1 : 0;
    document.getElementById("ssao_white").options[opt_index].selected = true;
    $("#ssao_white").slider("refresh");
}

function set_ssao_params(value) {
    var ssao = m_scenes.get_ssao_params();


    var ssao_params = {};

    if ("ssao_quality" in value)
        ssao_params["ssao_quality"] = get_sel_val(document.getElementById("ssao_quality"));
    
    if ("ssao_radius_increase" in value)
        ssao_params["ssao_radius_increase"] = value.ssao_radius_increase;

    if ("ssao_dithering_amount" in value)
        ssao_params["ssao_dithering_amount"] = value.ssao_dithering_amount / 1000;

    if ("ssao_gauss_center" in value)
        ssao_params["ssao_gauss_center"] = value.ssao_gauss_center;

    if ("ssao_gauss_width_square" in value)
        ssao_params["ssao_gauss_width_square"] = value.ssao_gauss_width_square * 
                                                 value.ssao_gauss_width_square;
    if ("ssao_gauss_width_left_square" in value)
        ssao_params["ssao_gauss_width_left_square"] = value.ssao_gauss_width_left_square * 
                                                      value.ssao_gauss_width_left_square;
    if ("ssao_influence" in value)
        ssao_params["ssao_influence"] = value.ssao_influence;

    if ("ssao_dist_factor" in value)
        ssao_params["ssao_dist_factor"] = value.ssao_dist_factor;

    if ("ssao_only" in value)
        ssao_params["ssao_only"] = (value.ssao_only === "on") ? 1 : 0;

    if ("ssao_white" in value)
        ssao_params["ssao_white"] = (value.ssao_white === "on") ? 1 : 0;

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

    var fcd = m_scenes.get_fog_color_density();

    var dens = fcd[3];

    if (dens > 0.2)
        set_slider("fog_density", fcd[3]);
    else
        set_slider("fog_density1000", 1000 * fcd[3]);

    set_color_picker("fog_color", fcd);
}

function set_fog_params(value) {

    var fcd = m_scenes.get_fog_color_density();

    if ("fog_density" in value)
        fcd[3] = value.fog_density;

    if ("fog_density1000" in value)
        fcd[3] = value.fog_density1000 / 1000;

    if ("fog_color" in value) {
        fcd[0] = value.fog_color[0];
        fcd[1] = value.fog_color[1];
        fcd[2] = value.fog_color[2];
    }

    m_scenes.set_fog_color_density(fcd);
}

function get_shadow_params() {

    var shadow_params = m_scenes.get_shadow_params();
    var shadow_param_names = ["optimize_shadow_volume",
                              "csm_near",
                              "csm_far",
                              "shadow_visibility_falloff",
                              "blur_depth_size_mult",
                              "blur_depth_edge_size",
                              "blur_depth_diff_threshold",
                              "csm_lambda"];

    if (!shadow_params) {
        forbid_params(shadow_param_names, "disable");
        return null;
    }

    forbid_params(shadow_param_names, "enable");

    var opt_index = (shadow_params["optimize_shadow_volume"]) ? 0 : 1;
    document.getElementById("optimize_shadow_volume").options[opt_index].selected = true;
    $("#optimize_shadow_volume").slider("refresh");

    set_slider("shadow_visibility_falloff", shadow_params["shadow_visibility_falloff"]);
    set_slider("blur_depth_size_mult", shadow_params["blur_depth_size_mult"]);
    set_slider("blur_depth_edge_size", shadow_params["blur_depth_edge_size"]);
    set_slider("blur_depth_diff_threshold", shadow_params["blur_depth_diff_threshold"]);

    display_csm_info(shadow_params);
    set_slider("csm_near", shadow_params["csm_near"]);
    set_slider("csm_far", shadow_params["csm_far"]);
    set_slider("csm_lambda", shadow_params["csm_lambda"]);
}

function set_shadow_params(value) {

    var shadow_params = {};
    
    if ("optimize_shadow_volume" in value)
        shadow_params["optimize_shadow_volume"] = (value["optimize_shadow_volume"] === "on") ? true : false;
    if ("csm_near" in value)
        shadow_params["csm_near"] = parseFloat(value["csm_near"]);
    if ("csm_far" in value)
        shadow_params["csm_far"] = parseFloat(value["csm_far"]);
    if ("csm_lambda" in value)
        shadow_params["csm_lambda"] = parseFloat(value["csm_lambda"]);
    if ("shadow_visibility_falloff" in value)
        shadow_params["shadow_visibility_falloff"] = parseFloat(value["shadow_visibility_falloff"]);
    if ("blur_depth_size_mult" in value)
        shadow_params["blur_depth_size_mult"] = parseFloat(value["blur_depth_size_mult"]);
    if ("blur_depth_edge_size" in value)
        shadow_params["blur_depth_edge_size"] = parseFloat(value["blur_depth_edge_size"]);
    if ("blur_depth_diff_threshold" in value)
        shadow_params["blur_depth_diff_threshold"] = parseFloat(value["blur_depth_diff_threshold"]);

    m_scenes.set_shadow_params(shadow_params);

    display_csm_info(m_scenes.get_shadow_params());
}

function display_csm_info(shadow_params) {

    document.getElementById("csm_num").innerHTML = " " + shadow_params["csm_num"];
    var csm_borders = shadow_params["csm_borders"];
    var elem = document.getElementById("csm_borders");
    elem.innerHTML = "(";
    for (var i = 0; i < csm_borders.length; i++) {
        if (i > 0)
            elem.innerHTML += " __ ";
        elem.innerHTML += Math.round(10 * csm_borders[i]) / 10;
    }
    elem.innerHTML += ")";
}

function get_ambient_params() {

    var env_colors = m_scenes.get_environment_colors();

    set_slider("environment_energy", env_colors[0]);
    set_color_picker("horizon_color", env_colors[1]);
    set_color_picker("zenith_color" , env_colors[2]);
}

function set_ambient_params(value) {

    if ("environment_energy" in value)
        m_scenes.set_environment_colors(value.environment_energy, null, null);

    if ("horizon_color" in value)
        m_scenes.set_environment_colors(null, value.horizon_color, null);

    if ("zenith_color" in value)
        m_scenes.set_environment_colors(null, null, value.zenith_color);
}

function set_debug_params(value) {

    var debug_params = {};

    if ("wireframe_mode" in value)
        debug_params["wireframe_mode"] = get_sel_val(document.getElementById("wireframe_mode"));
    if ("wireframe_edge_color" in value)
        debug_params["wireframe_edge_color"] = value["wireframe_edge_color"];

    m_debug.set_debug_params(debug_params);
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
        return null;
    }

    var diffuse_color = m_mat.get_diffuse_color(obj, mat_name);
    diffuse_color.pop();
    mparams["diffuse_color"] = diffuse_color;

    forbid_params(mat_param_names, "enable");

    set_color_picker("material_diffuse_color", mparams["diffuse_color"]);
    set_slider("material_reflectivity",   mparams["reflect_factor"]);
    set_slider("material_fresnel",        mparams["fresnel"]);
    set_slider("material_fresnel_factor", mparams["fresnel_factor"]);
    set_slider("material_parallax_scale", mparams["parallax_scale"]);
    set_slider("material_parallax_steps", mparams["parallax_steps"]);
}

function set_material_params(value) {

    var name_selected = _selected_object_name;
    var obj = m_scenes.get_object_by_name(name_selected);

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

    var name_selected = _selected_object_name;
    var obj = m_scenes.get_object_by_name(name_selected);
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

    if (water_dynamic == "1") {
        water_dynamic = true;
        forbid_params(water_param_names, "enable");
    } else {
        water_dynamic = false;
        forbid_params(water_param_names, "disable");
    }

    if (shore_smoothing == "1") {
        shore_smoothing = true;
        forbid_params(["absorb_factor"], "enable");
    }
    else {
        shore_smoothing = false;
        forbid_params(["absorb_factor"], "disable");
    }

    // shore smoothing
    if ("shore_smoothing" in value)
        water_material_params["shore_smoothing"] = shore_smoothing;
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

    // water dynamic
    if ("sss_strength" in value)
        water_material_params["sss_strength"]  = value["sss_strength"];
    if ("sss_width" in value)
        water_material_params["sss_width"]  = value["sss_width"];
    if ("water_dynamic" in value)
        water_material_params["water_dynamic"]  = water_dynamic;
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

function get_lighting_params(light_name) {

    var lparams = m_lights.get_light_params(light_name);

    set_color_picker("light_color", lparams["light_color"]);
    set_slider("light_energy", lparams["light_energy"]);
}

function set_lighting_params(value) {

    if ("light_name" in value)
        get_lighting_params(value["light_name"]);

    var light_params = {};

    if ("light_color" in value)
        light_params["light_color"] = value["light_color"];

    if ("light_energy" in value)
        light_params["light_energy"] = parseFloat(value["light_energy"]);

    m_lights.set_light_params($("#light_name").val(), light_params);
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

    var light_param_names = ["run_sun",
                             "stop_sun",
                             "date",
                             "sun_time_multiplier",
                             "day_time",
                             "max_sun_angle"];

    if (!sun) {
        forbid_params(light_param_names, "disable");
        return null;
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

function forbid_debug_params() {

    $("#wireframe_mode").val("WM_NONE");
    $("#wireframe_mode").selectmenu("refresh", true);

    $("#wireframe_edge_color div").css('backgroundColor', '#333');
}

function stop_sun_clicked() {
    var sun = m_lights.get_lamps("SUN")[0];
    if (m_ctl.check_sensor_manifolds(sun))
        m_ctl.remove_sensor_manifold(sun, "ELAPSED");
}

function get_dof_params() {

    var dof_params  = m_scenes.get_dof_params();

    var dof_param_names = ["dof_distance",
                       "dof_front",
                       "dof_rear",
                       "dof_power",
                       "dof_on"];

    if (dof_params) {
        set_slider("dof_distance", dof_params["dof_distance"]);
        set_slider("dof_front", dof_params["dof_front"]);
        set_slider("dof_rear", dof_params["dof_rear"]);
        set_slider("dof_power", dof_params["dof_power"]);

        forbid_params(dof_param_names, "enable");

        var opt_index = (dof_params["dof_distance"] > 0) ? 0 : 1;
        document.getElementById("dof_on").options[opt_index].selected = true;

        $("#dof_on").slider("refresh");
    } else
        forbid_params(dof_param_names, "disable");
}

function set_dof_params(value) {
    var dof_params = {};

    if ("dof_distance" in value && $("#dof_on").val() == 1) {
        dof_params["dof_distance"] = value.dof_distance;
    }

    if ("dof_front" in value) {
        dof_params["dof_front"] = value.dof_front;
    }

    if ("dof_rear" in value) {
        dof_params["dof_rear"] = value.dof_rear;
    }

    if ("dof_power" in value) {
        dof_params["dof_power"] = value.dof_power;
    }

    if ("dof_on" in value) {

        dof_params["dof_on"] = $("#dof_on").val();

        if (value.dof_on == 1)
            dof_params["dof_distance"] = $("#dof_distance").val();
        else {
            dof_params["dof_distance"] = 0;
        }
    }

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
        set_slider("bloom_key", bloom_params["bloom_key"]);
        set_slider("bloom_blur", bloom_params["bloom_blur"]);
        set_slider("bloom_edge_lum", bloom_params["bloom_edge_lum"]);
    }
}

function set_bloom_params(value) {
    var bloom_params = {};

    if ("bloom_key" in value) {
        bloom_params["bloom_key"] = value.bloom_key;
    }
    if ("bloom_blur" in value) {
        bloom_params["bloom_blur"] = value.bloom_blur;
    }
    if ("bloom_edge_lum" in value) {
        bloom_params["bloom_edge_lum"] = value.bloom_edge_lum;
    }

    m_scenes.set_bloom_params(bloom_params);
}

function set_color_picker(id, color) {
    // copied from colorpicker
    function RGBToHex(rgb) {
        var hex = [rgb.r.toString(16), rgb.g.toString(16), rgb.b.toString(16)];
        $.each(hex, function(nr, val) {
            if (val.length == 1) {
                hex[nr] = '0' + val;
            }
        });
        return hex.join('');
    };

    color = lin_to_srgb(color);
    
    var rgb = {
        r: Math.round(color[0] * 255), 
        g: Math.round(color[1] * 255), 
        b: Math.round(color[2] * 255)
    };
    $("#" + id).ColorPickerSetColor(rgb);
    $("#" + id + " div").css('backgroundColor', '#' + RGBToHex(rgb));
}

function srgb_to_lin(color) {
    return [
        Math.pow(color[0], 2.2),
        Math.pow(color[1], 2.2),
        Math.pow(color[2], 2.2)
    ];
}

function lin_to_srgb(color) {
    return [
        Math.pow(color[0], 1/2.2),
        Math.pow(color[1], 1/2.2),
        Math.pow(color[2], 1/2.2)
    ];
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
    $("#" + id).val(val);
    $("#" + id).slider("refresh");
}

function bind_control(fun, id) {
    $("#" + id).bind("change", function(e) {
        var arg = {};
        arg[id] = e.target.value;
        fun(arg);
    });
}

function bind_colpick(fun, id) {
    $("#" + id).ColorPicker({onChange: function (hsb, hex, rgb) {
	    $("#" + id + " div").css('backgroundColor', '#' + hex);
        var arg = {};
        arg[id] = srgb_to_lin(rgb_to_float(rgb));
        fun(arg);
	}});
}

function rgb_to_float(rgb, opt_dest) {

    opt_dest = opt_dest || [];
    
    opt_dest[0] = rgb.r / 255;
    opt_dest[1] = rgb.g / 255;
    opt_dest[2] = rgb.b / 255;

    return opt_dest;
}

function init_jQM_select(id) {
    $("#" + id).selectmenu();
    $("#" + id).selectmenu("refresh");
}

/*
 * return empty array if not found
 */
function keyfind(key, value, array) {
    var results = [];
    for (var i = 0; i < array.length; i++) {
        var obj = array[i];
        if (obj[key] == value)
            results.push(obj);
    }
    return results;
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

});

b4w.require("viewer_main").init();
