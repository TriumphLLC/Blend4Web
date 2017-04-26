"use strict"

if (b4w.module_check("quest"))
    throw "Failed to register module: quest";

b4w.register("quest", function(exports, require) {

var m_main      = require("main");
var m_app       = require("app");
var m_data      = require("data");
var m_cfg       = require("config");
var m_ver       = require("version");
var m_lnodes    = require("logic_nodes");
var m_pet_state = require("petigor_states");
var m_scenes    = require("scenes");
var m_ctl       = require("controls");
var m_cam       = require("camera");
var m_math      = require("math");
var m_vec3      = require("vec3");
var m_trans     = require("transform");
var m_geom      = require("geometry");
var m_mat       = require("material");
var m_print     = require("print");

var _gs = {
    character: undefined,
    character_armature: undefined,
    navmesh: undefined,
    navmesh_obj: undefined,
    source: new Float32Array(3),
    click: false,
    speed: 1,
    dist_err: 0.2,
    accurate_translation: false
};

var is_debug = m_ver.type() == "DEBUG";

var ASSETS_PATH = m_cfg.get_std_assets_path() + "petigors_tale/";

function init_cb(canvas_elem, success) {
    if (!success) {
        m_print.log("b4w init failure");
        return;
    }

    var preloader_cont = document.getElementById("preloader_cont");
    preloader_cont.style.visibility = "visible"

    //HACK: override initialization properties
    if (!m_main.detect_mobile())
        m_cfg.set("srgb_type", "SRGB_PROPER");

    m_data.load(ASSETS_PATH + "quest/main_scene_quest.json", load_cb, preloader_cb,
                true);
}

function preloader_cb(percentage) {
    var prelod_dynamic_path = document.getElementById("prelod_dynamic_path");
    var percantage_num      = prelod_dynamic_path.nextElementSibling;

    prelod_dynamic_path.style.width = percentage + "%";
    percantage_num.innerHTML = percentage + "%";

    if (percentage == 100) {
        remove_preloader();
        return;
    }
}

function remove_preloader() {
    var preloader_cont = document.getElementById("preloader_cont");

    setTimeout(function(){
            preloader_cont.style.visibility = "hidden"
        }, 1000);
}

var move_to_target_called = false;
function lnodes_move_to_target(in_params, out_params) {
    if (!move_to_target_called) {
        _gs.destination = new Float32Array(3);
        _gs.source = new Float32Array(3);
        m_trans.get_translation(_gs.character, _gs.source);
        m_trans.get_translation(in_params[0], _gs.destination);
        _gs.dest_rotation = new Float32Array(4)
        m_trans.get_rotation(in_params[0], _gs.dest_rotation);
        m_pet_state.switch_state(m_pet_state.MOVING_TO_TARGET);
        move_to_target_called = true;
    }
    if (m_pet_state.get_state() != m_pet_state.MOVING_TO_TARGET) {
        move_to_target_called = false;
        _gs.dest_rotation = null;
        m_pet_state.switch_state(m_pet_state.STANDING);
        return false;
    }
    return true
}

function lnodes_switch_state(in_params, out_params) {
    var state = m_pet_state.state_id_by_name(in_params[0]);
    if (state >= 0) {
        m_pet_state.switch_state(state);
    } else {
        console.log("Bad state, please check the name");
    }
}

function lnodes_set_variables(in_params, out_params) {
    _gs.speed = in_params[0];
}

function main_ray_callback(obj, id, pulse) {
    var payload = m_ctl.get_sensor_payload(obj, id, 0);
    _gs.destination = new Float32Array(3);
    _gs.source = new Float32Array(3);
    m_vec3.copy(payload.hit_pos, _gs.destination);
    m_trans.get_translation(_gs.character, _gs.source);
    // only moving for js side
    m_pet_state.switch_state(m_pet_state.MOVING)
    if (m_ctl.check_sensor_manifold(null, "ray_test"))
        m_ctl.remove_sensor_manifold(null, "ray_test")
}

var click_sensor_cb = function(obj, id, pulse) {
    var xy = m_ctl.get_sensor_payload(obj, id, 0).coords;
    if (!(xy[0] && xy[1])) {
        xy = m_ctl.get_sensor_payload(obj, id, 1).coords;
    }
    var pline = m_math.create_pline();
    if (!_gs.to) {
        _gs.to = new Float32Array(3);
        _gs.from = new Float32Array(3);
    }
    var camera = m_scenes.get_active_camera()
    m_cam.calc_ray(camera, xy[0], xy[1], pline);
    m_math.get_pline_directional_vec(pline, _gs.to);
    m_vec3.scale(_gs.to, 1000, _gs.to);
    m_vec3.copy([0,0,0], _gs.from)

    var man_name = "ray_test";
    if (m_ctl.check_sensor_manifold(null, man_name))
        m_ctl.remove_sensor_manifold(null, "ray_test")

    var sensors = [];
    var names = ["raytest_floor", "ray_protect"]
    for (var i = 0; i < names.length; i++) {
        sensors.push(m_ctl.create_ray_sensor(camera, _gs.from,
            _gs.to, names[i], false, true, true))
    }
    m_ctl.create_sensor_manifold(null, man_name, m_ctl.CT_SHOT, sensors,
        function (s) {
            var r = false
            for (var j = 1; j < s.length; j++) {
                r = r || s[j];
            }
            return s[0] && !r
        }, main_ray_callback);
};

function create_sensors() {
    // click sensor
    var mc_s = m_ctl.create_mouse_click_sensor();
    var tc_s = m_ctl.create_touch_click_sensor();
    m_ctl.create_sensor_manifold(null, "click", m_ctl.CT_SHOT,
        [mc_s, tc_s], m_ctl.default_OR_logic_fun, click_sensor_cb);
}

function load_cb(id, success) {
    m_app.enable_camera_controls();
    _gs.character = m_scenes.get_object_by_name("petigor_quest");
    _gs.character_armature = m_scenes.get_object_by_dupli_name("petigor_quest", "petigor_armature_quest");
    _gs.navmesh_obj = m_scenes.get_object_by_name("navmesh");
    m_lnodes.append_custom_callback("switch_state", lnodes_switch_state);
    m_lnodes.append_custom_callback("move_to_target", lnodes_move_to_target);
    m_lnodes.append_custom_callback("set_variables", lnodes_set_variables);
    m_pet_state.init(_gs);
    //if (is_debug)
    //    m_main.set_render_callback(render_callback)
    create_sensors()
}

function render_callback(delta, timeline) {
    var line = m_scenes.get_object_by_name("path_renderer");
    if (_gs.positions) {
        m_geom.draw_line(line, _gs.positions);
        m_mat.set_line_params(line, {
            color: new Float32Array([1.0, 0.0, 0.0, 1.0]),
            width: 10
        });
    }
}

exports.init = function() {
    var is_mobile = m_main.detect_mobile();
    if (is_mobile)
        var quality = m_cfg.P_LOW;
    else
        var quality = m_cfg.P_HIGH;

    m_app.init({
        canvas_container_id: "canvas3d",
        callback: init_cb,
        quality: quality,
        physics_enabled: true,
        console_verbose: true,
        alpha: false,
        physics_use_workers: !is_mobile,
        assets_dds_available: !is_debug,
        assets_pvr_available: !is_debug,
        assets_min50_available: !is_debug,
        show_fps: is_debug,
        autoresize: true
    });
}
});

b4w.require("quest").init("en");
