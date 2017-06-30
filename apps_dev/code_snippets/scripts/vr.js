"use strict"

b4w.register("vr", function(exports, require) {

var m_app       = require("app");
var m_cfg       = require("config");
var m_cons      = require("constraints");
var m_cont      = require("container");
var m_ctl       = require("controls");
var m_data      = require("data");
var m_geom      = require("geometry");
var m_hmd       = require("hmd");
var m_hmd_conf  = require("hmd_conf");
var m_input     = require("input");
var m_math      = require("math");
var m_mat       = require("material");
var m_obj       = require("objects");
var m_phys      = require("physics");
var m_preloader = require("preloader");
var m_scenes    = require("scenes");
var m_quat      = require("quat");
var m_scs       = require("scenes");
var m_screen    = require("screen");
var m_trans     = require("transform");
var m_tsr       = require("tsr");
var m_util      = require("util");
var m_ver       = require("version");
var m_vec3      = require("vec3");

var _switch_vr_button;
var _is_in_vr = false;

var _quat_tmp = m_quat.create();
var _vec3_tmp = m_vec3.create();
var _vec3_tmp2 = m_vec3.create();
var _tsr_tmp = m_tsr.create();
var _tsr_tmp2 = m_tsr.create();
var _tsr_tmp3 = m_tsr.create();

var _pline_tmp = m_math.create_pline();

var _style = "";

var RAY_ORIGIN = new Float32Array([0, 0, 0]);
var RAY_DEST = new Float32Array([0, 0, -50]);
var PLAY_AREA_SIZE = 8;
var ACTIVATE_SCROLL = 0.3;
var SCROLL_POW = 0.15;
var MIN_DISTANCE = 0.3;

var DEBUG = (m_ver.type() == "DEBUG");

var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/vr/";

exports.init = function() {
    m_app.init({
        canvas_container_id: "main_canvas_container",
        callback: init_cb,
        show_fps: DEBUG,
        console_verbose: DEBUG,
        autoresize: true,
        stereo: "HMD"
    });
}

function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }

    m_preloader.create_preloader();

    canvas_elem.oncontextmenu = function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };

    var controls_container = document.createElement("div");
    controls_container.id = "controls_container";

    _switch_vr_button = create_button(m_input.can_use_device(m_input.DEVICE_HMD) ?
            "Open VR": "VR is not avaliable");

    // Apply splitscreen and some default behavior
    m_input.add_click_listener(_switch_vr_button, switch_vr_default_cb);

    // Apply only splitscreen.
    // It requires writing some camera behavior in init_cb or load_cb
    // m_input.add_click_listener(_switch_vr_button, switch_vr_custom_cb);

    controls_container.appendChild(_switch_vr_button);

    // uncomment next lines to configure Cardboard-like devices
    // if (m_hmd_conf.check())
    //     enable_hmd_configurator(controls_container);

    var container = m_cont.get_container();
    container.appendChild(controls_container);

    load();
}

function switch_vr_default_cb() {
    if (!_is_in_vr) {
        m_hmd.enable_hmd(m_hmd.HMD_ALL_AXES_MOUSE_YAW);
        m_screen.request_fullscreen_hmd(document.body, enable_fullscreen_cb, disable_fullscreen_cb);
        _is_in_vr = true;
    } else {
        m_hmd.disable_hmd();
        m_screen.exit_fullscreen_hmd();
        _is_in_vr = false;
    }
}

function switch_vr_custom_cb() {
    if (!_is_in_vr) {
        m_screen.request_split_screen();
        m_screen.request_fullscreen_hmd(document.body, enable_fullscreen_cb, disable_fullscreen_cb);
        _is_in_vr = true;
    } else {
        m_screen.disable_split_screen();
        m_screen.exit_fullscreen_hmd();
        _is_in_vr = false;
    }
}

function enable_fullscreen_cb() {
    console.log("We are in VR-mode.");
    _switch_vr_button.innerText = "Stop presentation";
    enable_gamepad_control();

    var canvas = m_cont.get_canvas();
    _style = canvas.style;
    canvas.style = "";
}

function disable_fullscreen_cb() {
    var canvas = m_cont.get_canvas();
    canvas.style = _style;

    console.log("We are in one-eye-mode.");
    _switch_vr_button.innerText = m_input.can_use_device(m_input.DEVICE_HMD) ?
            "Open VR": "VR is not avaliable";
}

function enable_hmd_configurator(controls_container) {
    var hmd_device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
    var hmd_type = m_input.get_value_param(hmd_device, m_input.HMD_WEBVR_TYPE);
    if (hmd_type & (m_input.HMD_NON_WEBVR | m_input.HMD_WEBVR_MOBILE |
            m_input.HMD_WEBVR_DESKTOP)) {

        m_hmd_conf.update();

        var is_in_conf = false;
        var hmd_conf_button = create_button("Open HMD conf.");

        m_input.add_click_listener(hmd_conf_button, function() {
            if (is_in_conf) {
                m_hmd_conf.hide();
                is_in_conf = false;
            } else {
                m_hmd_conf.show("hmd_conf_dialog");
                is_in_conf = true;
            }
        });

        controls_container.appendChild(hmd_conf_button);
    }
}


function create_button(caption) {
    var button = document.createElement("a");

    button.className = "btn";
    button.innerText = caption;

    return button;
}

function load() {
    m_data.load(APP_ASSETS_PATH + "vr.json", load_cb, preloader_cb);
}

function preloader_cb(percentage) {
    m_preloader.update_preloader(percentage);
}

function load_cb(data_id, success) {

    if (!success) {
        console.log("b4w load failure");
        return;
    }

    m_app.enable_camera_controls(false, false, false, null, false, true);
}

function render_cursor_line(gamepad, line_name, line_color) {
    var line = m_obj.create_line(line_name);

    var positions = new Float32Array([0,0,0,0,0,-50]);
    m_geom.draw_line(line, positions);
    m_mat.set_line_params(line, {
        color: line_color,
        width: 3
    });
    m_cons.append_stiff(line, gamepad, [0,0,0]);
}

function setup_movement(ray_caster, destination_name, gamepad_id) {
    var pointer = m_scs.get_object_by_name(destination_name);
    if (!ray_caster || !pointer)
        // something goes wrong
        return;
    var elapsed_s = m_ctl.create_elapsed_sensor();
    m_ctl.create_sensor_manifold(pointer, "POINTER_CONTROLLER" + gamepad_id,
            m_ctl.CT_CONTINUOUS, [elapsed_s],
            m_ctl.default_OR_logic_fun, pointer_cb);

    function pointer_cb(obj, id, pulse) {
        var pline = _pline_tmp;

        var caster_pos = m_trans.get_translation(ray_caster, _vec3_tmp);
        m_math.set_pline_initial_point(pline, caster_pos);

        var caster_rot = m_trans.get_rotation(ray_caster, _quat_tmp);
        var cast_dir = m_vec3.transformQuat(m_util.AXIS_MZ, caster_rot, _vec3_tmp);
        m_math.set_pline_directional_vec(pline, cast_dir);

        var intersection_pos = m_math.line_plane_intersect(m_util.AXIS_MZ, 0,
                pline, _vec3_tmp);
        if (intersection_pos) {
            intersection_pos[0] = m_util.clamp(intersection_pos[0],
                    -PLAY_AREA_SIZE, PLAY_AREA_SIZE);
            intersection_pos[1] = m_util.clamp(intersection_pos[1],
                    -PLAY_AREA_SIZE, PLAY_AREA_SIZE);
            intersection_pos[2] = 0.1;
            m_trans.set_translation_v(obj, intersection_pos);
        }
    }

    var menu_s = m_ctl.create_gamepad_btn_sensor(m_input.GMPD_MENU_BUTTON,
            gamepad_id, true);
    m_ctl.create_sensor_manifold(pointer, "MOVE_" + gamepad_id,
            m_ctl.CT_TRIGGER, [menu_s], null, move_cb);

    function move_cb(obj, id, pulse) {
        if (pulse > 0) {
            var pointer_pos = m_trans.get_translation(obj, _vec3_tmp);
            m_hmd.set_position(pointer_pos);
        }
    }
}

function get_tsr_rel(obj, parent, dest) {
    var picked_tsr = m_trans.get_tsr(obj, _tsr_tmp2);
    var cont_tsr = m_trans.get_tsr(parent, _tsr_tmp3);
    var cont_tsr_inv = m_tsr.invert(cont_tsr, _tsr_tmp3);

    dest = m_tsr.multiply(cont_tsr_inv, picked_tsr, dest);

    return dest;
}

function setup_pickup(ray_caster, gamepad_id) {
    if (!ray_caster)
        // something goes wrong
        return;

    var elapsed_s = m_ctl.create_elapsed_sensor();
    var trigger_s = m_ctl.create_gamepad_btn_sensor(m_input.GMPD_TRIGGER_BUTTON,
            gamepad_id);
    var trackpad_s = m_ctl.create_gamepad_btn_sensor(m_input.GMPD_TRACKPAD_BUTTON,
            gamepad_id);

    var pickup_ray_sensor = m_ctl.create_ray_sensor(ray_caster,
            RAY_ORIGIN, RAY_DEST, "PICKUP", false, true, false);
    var picked_obj = {
        obj: null,
        position: m_vec3.create()
    };

    var buttons_sensor_logic = function(s) {
        return s[1] > 0 || s[2] > 0;
    }
    m_ctl.create_sensor_manifold(ray_caster, "PICKUP_" + gamepad_id,
            m_ctl.CT_LEVEL, [pickup_ray_sensor, trigger_s, trackpad_s,
            elapsed_s], buttons_sensor_logic, pickup_cb, picked_obj);

    function pickup_cb(obj, id, pulse, picked_obj) {
        if (m_ctl.get_sensor_value(obj, id, 1) ||
                m_ctl.get_sensor_value(obj, id, 2)) {
            if (m_ctl.get_sensor_value(obj, id, 0) > 0) {
                var ray_payload = m_ctl.get_sensor_payload(obj, id, 0);
                picked_obj.obj = ray_payload.obj_hit;
                m_phys.disable_simulation(picked_obj.obj);

                var local_tsr = get_tsr_rel(picked_obj.obj, obj, _tsr_tmp);

                m_cons.append_stiff(picked_obj.obj, obj,
                        m_tsr.get_trans_view(local_tsr),
                        m_tsr.get_quat_view(local_tsr));

                m_scenes.set_outline_intensity(picked_obj.obj, 1);
            }
        } else
            if (picked_obj.obj) {
                m_phys.enable_simulation(picked_obj.obj);
                m_cons.remove(picked_obj.obj);

                // apply velosity to object after release
                var elapsed = m_ctl.get_sensor_value(obj, id, 3);
                var position = m_trans.get_translation(picked_obj.obj, _vec3_tmp);
                var delta_trans = m_vec3.subtract(position, picked_obj.position, _vec3_tmp);
                var velocity = m_vec3.scale(delta_trans, 1 / elapsed, delta_trans);
                m_phys.apply_velocity_world(picked_obj.obj,
                        velocity[0], velocity[1], velocity[2]);
                m_scenes.set_outline_intensity(picked_obj.obj, 0);
                picked_obj.obj = null;
            }
    }

    var scroll_s = m_ctl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_1, gamepad_id);
    m_ctl.create_sensor_manifold(ray_caster,
            "BRING_CLOSER_PICKED_OBJECT" + gamepad_id,
            m_ctl.CT_CONTINUOUS, [elapsed_s, scroll_s], null, scroll_cb, picked_obj);

    function calc_fact_from(fact_to) {
        return fact_to / (1 - fact_to);
    }

    function get_trans_dist(dist, axis_v, elapsed) {
        var fact = Math.abs(axis_v) * elapsed;
        var move_dist;
        if (axis_v < 0)
            if (dist > MIN_DISTANCE)
                move_dist = -dist * fact;
            else
                move_dist = 0;
        else
            move_dist = dist * calc_fact_from(fact);

        return move_dist;
    }

    function scroll_cb(obj, id, pulse, picked_obj) {
        if (picked_obj.obj) {
            var elapsed = m_ctl.get_sensor_value(obj, id, 0);
            var axis_v = m_ctl.get_sensor_value(obj, id, 1);

            if (Math.abs(axis_v) > ACTIVATE_SCROLL) {
                var tsr_rel = get_tsr_rel(picked_obj.obj, obj, _tsr_tmp);
                var pos_rel = m_tsr.get_trans_view(tsr_rel, _vec3_tmp);
                var move_dist = get_trans_dist(m_vec3.length(pos_rel), axis_v, elapsed);
                var dir_rel = m_vec3.scale(m_util.AXIS_MZ, move_dist, _vec3_tmp2);
                var new_pos_rel = m_vec3.add(pos_rel, dir_rel, _vec3_tmp);

                m_cons.append_stiff(picked_obj.obj, obj,
                        new_pos_rel, m_tsr.get_quat_view(tsr_rel));
            }
        }
    }

    m_ctl.create_sensor_manifold(picked_obj,
            "UPDATE_PICKED_OBJECT_POSITION" + gamepad_id,
            m_ctl.CT_CONTINUOUS, [elapsed_s], null, update_position_cb);

    // save position of picked object to apply velocity after release
    function update_position_cb(obj, id, pulse) {
        if (obj.obj) {
            var position = m_trans.get_translation(obj.obj, _vec3_tmp);
            m_vec3.copy(position, obj.position);
        }
    }
}

function enable_gamepad_control() {

    var gamepad_1 = m_scs.get_object_by_name("gamepad_1");
    var gamepad_2 = m_scs.get_object_by_name("gamepad_2");

    m_hmd.enable_controllers(gamepad_1, gamepad_2);

    render_cursor_line(gamepad_1, "line_1", [1, 0, 0]);
    render_cursor_line(gamepad_2, "line_2", [0, 0, 1]);

    var gamepad_id_1 = m_input.get_vr_controller_id(0);
    setup_movement(gamepad_1, "pointer_1", gamepad_id_1);

    var gamepad_id_2 = m_input.get_vr_controller_id(1);
    setup_movement(gamepad_2, "pointer_2", gamepad_id_2);

    setup_pickup(gamepad_1, gamepad_id_1);
    setup_pickup(gamepad_2, gamepad_id_2);
}

});

