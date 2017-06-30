"use strict"

// register the application module
b4w.register("space_disaster", function(exports, require) {

// import modules used by the app
var m_app       = require("app");
var m_anim      = require("animation");
var m_armat     = require("armature");
var m_cam       = require("camera");
var m_cfg       = require("config");
var m_cont      = require("container");
var m_ctl       = require("controls");
var m_data      = require("data");
var m_gp_conf   = require("gp_conf");
var m_hmd       = require("hmd");
var m_hmd_conf  = require("hmd_conf");
var m_input     = require("input");
var m_mouse     = require("mouse");
var m_quat      = require("quat");
var m_obj       = require("objects");
var m_preloader = require("preloader");;
var m_print     = require("print");
var m_phy       = require("physics");
var m_scs       = require("scenes");
var m_screen    = require("screen");
var m_sfx       = require("sfx");
var m_tex       = require("textures");
var m_trans     = require("transform");
var m_tsr       = require("tsr");
var m_vec3      = require("vec3");
var m_ver       = require("version");
var m_util      = require("util");
var m_mat       = require("material");

var _quat_tmp = m_quat.create();
var _quat_tmp2 = m_quat.create();
var _vec3_tmp = m_vec3.create();
var _vec3_tmp2 = m_vec3.create();
var _tsr_tmp = m_tsr.create();

var QUAT4_IDENT = new Float32Array([0,0,0,1]);

var ASTEROID_DEFAULT_SPEED = 20;
var ASTEROID_DEFAULT_TARGET_OFFSET = 3;
var ASTEROID_DEFAULT_SPAWN_OFFSET = 20;
var ASTEROID_DEFAULT_SPAWN_DELAY = 2;
var ASTEROID_MIN_SPAWN_DELAY = 0.2;
var ASTEROID_SPAWN_DELAY_SUB = 0.03;
var ASTEROID_COUNT = 11;
var ASTEROID_MAX_SPEED = 40;
var ASTEROID_DAMAGE = 12.4;
var ASTEROID_STRENGTH = 100;

var CROSSHAIR_DELAY = 5;
var MAX_LASER_LENGTH = 100;

var COCKPIT_ROT_FACTOR = 1 / 16;
var COCKPIT_TRANS_FACTOR = 5.0;
var COCKPIT_MAX_HP = 100;
var COCKPIT_SHAKE_TIME = 1.0;

var GAMEPAD_AXIS_ROTATION = 0.2;

var USERMEDIA_TIME_DELAY = 1000 / 24;

var SHOOT_LISER_DELAY = 1.2;
var BURST_LISER_TIME = 5 / 6;
var LASER_DAMAGE = 700;
var ENV_SPHERE_ROT_FACTOR = 1 / 512;

var EPSILON_DISTANCE = 0.0001;

var _spawn_delay = ASTEROID_DEFAULT_SPAWN_DELAY;
var _last_spawn_time = 0;
var _asteroid_speed = ASTEROID_DEFAULT_SPEED;

// objects
var _cockpit = null;
var _asteroid_list = [];

var _velocity_tmp = {};

var _dest_x_trans = 0;
var _dest_z_trans = 0;

var _start_shake_time = 0;
var _last_shoot_time = 0;
var _burst_time = 0;
// var _env_speed = 0;

var _burst_fire_sensor = m_ctl.create_custom_sensor(0);
var _shake_sensor = m_ctl.create_custom_sensor(0);

// detect application mode
var DEBUG = (m_ver.type() === "DEBUG");

// automatically detect assets path
var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "space_disaster/";

/**
 * export the method to initialize the app (called at the bottom of this file)
 */
exports.init = function() {
    var show_fps = DEBUG;

    var url_params = m_app.get_url_params();

    if (url_params && "show_fps" in url_params)
        show_fps = true;

    m_app.init({
        canvas_container_id: "main_canvas_container",
        callback: init_cb,
        console_verbose: true,
        show_fps: show_fps,
        assets_dds_available: !DEBUG,
        assets_pvr_available: !DEBUG,
        assets_min50_available: !DEBUG,
        // NOTE: autoresize doesn't work with VR-mode in GearVR, bcz there is
        // a GearVR problem!!!
        autoresize: true,

        // change scene graph
        stereo: "HMD"
    });
}

/**
 * callback executed when the app is initialized
 */
function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }

    m_preloader.create_preloader();

    load();
}

function preloader_cb(percentage) {
    m_preloader.update_preloader(percentage);
}

/**
 * load the scene data
 */
function load() {
    m_data.load(APP_ASSETS_PATH + "space_disaster.json", load_cb, preloader_cb);
}

function int_to_str_length(num, length) {
    var r = "" + num;
    while (r.length < length)
        r = "0" + r;
    return r;
}

/**
 * callback executed when the scene is loaded
 */
function load_cb(data_id) {
    // m_app.enable_camera_controls();
    //==========================================================================
    // First way to split screen: m_scenes.set_hmd_params
    // For example
    // m_scs.set_hmd_params(
    //         {enable_hmd_stereo: true,
    //         distortion_coefs : [0.22, 0.28],
    //         chromatic_aberration_coefs : [-0.015, 0.02, 0.025, 0.02]})
    // var canvas_container_elem = m_cont.get_container();
    // var ccw = canvas_container_elem.clientWidth;
    // var cch = canvas_container_elem.clientHeight;
    // m_cont.resize(ccw, cch, true);

    //==========================================================================
    // Second way to split screen: use devices
    // var camobj = m_scs.get_active_camera();
    // if (m_input.can_use_device(m_input.DEVICE_HMD))
    //     m_screen.request_split_screen();
    // else
    //     console.log("HMD device does not avaliable.");

    //==========================================================================
    register_cockpit();

    // Third way to split screen: m_hmd.enable_hmd
    if (m_hmd.check_browser_support())
        register_hmd();

    register_mouse(m_hmd.check_browser_support());

    register_keyboard();
    register_gamepad(m_hmd.check_browser_support());

    //==========================================================================
    // Gameplay stuff

    register_asteroids();

    // cockpit actions
    register_burst();
    register_shake();

    start_game();

    play_sound();
}

function play_sound() {
    var sundtrack_entrance = m_scs.get_object_by_name("sundtrack_entrance");
    var sundtrack_loop_A = m_scs.get_object_by_name("sundtrack_loop_A");
    m_sfx.play(sundtrack_entrance, 0, 0);
    m_sfx.play(sundtrack_loop_A, 69, 0);
}

function register_gamepad(is_hmd) {
    m_gp_conf.update();
    // PS4 controller
    var controller_cb = function(obj, id, pulse) {
        var w = m_ctl.get_sensor_value(obj, id, 0);
        var d = m_ctl.get_sensor_value(obj, id, 1);
        var s = m_ctl.get_sensor_value(obj, id, 2);
        var a = m_ctl.get_sensor_value(obj, id, 3);
        var r1 = m_ctl.get_sensor_value(obj, id, 4);
        var r2 = m_ctl.get_sensor_value(obj, id, 5);
        var l1 = m_ctl.get_sensor_value(obj, id, 6);
        var l2 = m_ctl.get_sensor_value(obj, id, 7);
        var left_vaxis = m_ctl.get_sensor_value(obj, id, 8);
        var left_haxis = m_ctl.get_sensor_value(obj, id, 9);
        var right_vaxis = m_ctl.get_sensor_value(obj, id, 10);
        var right_haxis = m_ctl.get_sensor_value(obj, id, 11);
        var elapsed = m_ctl.get_sensor_value(obj, id, 12);
        var time = m_ctl.get_sensor_value(obj, id, 13);

        var rot_value = elapsed * GAMEPAD_AXIS_ROTATION;

        var velocity = m_cam.get_velocities(obj, _velocity_tmp);
        if (w)
            _dest_z_trans += velocity.trans * COCKPIT_TRANS_FACTOR * elapsed;
        if (s)
            _dest_z_trans -= velocity.trans * COCKPIT_TRANS_FACTOR * elapsed;
        if (a)
            _dest_x_trans -= velocity.trans * COCKPIT_TRANS_FACTOR * elapsed;
        if (d)
            _dest_x_trans += velocity.trans * COCKPIT_TRANS_FACTOR * elapsed;

        if (r1 || r2 || l1 || l2)
            shoot(time);

        if (!is_hmd) {
            _dest_x_trans -= velocity.trans * COCKPIT_TRANS_FACTOR * elapsed * left_vaxis;
            _dest_z_trans += velocity.trans * COCKPIT_TRANS_FACTOR * elapsed * left_haxis;
            var vert_ang = - right_haxis * rot_value;
            var hor_ang = - right_vaxis * rot_value;

            m_cam.rotate_camera(obj, hor_ang, vert_ang);
        }
    }

    var init_sensors = function(index) {
        var gs_w = m_ctl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_12, index);
        var gs_d = m_ctl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_15, index);
        var gs_s = m_ctl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_13, index);
        var gs_a = m_ctl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_14, index);

        var gs_r1 = m_ctl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_4, index);
        var gs_r2 = m_ctl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_5, index);
        var gs_l1 = m_ctl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_6, index);
        var gs_l2 = m_ctl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_7, index);

        var left_vert_axis = m_ctl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_0, index);
        var left_hor_axis = m_ctl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_1, index);
        var right_vert_axis = m_ctl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_2, index);
        var right_hor_axis = m_ctl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_3, index);
        var e_s = m_ctl.create_elapsed_sensor();
        var time = m_ctl.create_timeline_sensor();

        var cam_obj = m_scs.get_active_camera();
        m_ctl.create_sensor_manifold(cam_obj, "CONTROLLER_CAMERA_MOVE" + index,
                m_ctl.CT_CONTINUOUS, [gs_w, gs_d, gs_s, gs_a, gs_r1, gs_r2,
                gs_l1, gs_l2, left_vert_axis, left_hor_axis, right_vert_axis,
                right_hor_axis, e_s, time],
                function() {return true}, controller_cb);
    };

    for (var i = 0; i < 4; i++)
        init_sensors(i);
}

function register_mouse(is_hmd) {
    if (!is_hmd) {
        // use pointerlock
        var canvas_elem = m_cont.get_canvas();
        canvas_elem.addEventListener("mouseup", function(e) {
            m_mouse.request_pointerlock(canvas_elem);
        }, false);
    }

    // TODO: add menu and use mouse sensors
    var is_clicked = false;

    var container = m_cont.get_container();
    container.addEventListener("click", function(e) {
        // go to VR-mode in case of using HMD (WebVR API 1.0)
        m_screen.request_fullscreen_hmd(document.body);
        // shoot
        is_clicked = true;
    })

    var shoot_cb = function(obj, id, pulse) {
        if (is_clicked) {
            var time = m_ctl.get_sensor_value(obj, id, 0);
            shoot(time);
            is_clicked = false;
        }
    }

    var time = m_ctl.create_timeline_sensor();
    // TODO: rewrite using MOUSE_CLICK sensors
    // right now there is GearVR touch sensor problems
    // var mclick = m_ctl.create_mouse_click_sensor();
    m_ctl.create_sensor_manifold(null, "MOUSE_SHOOT",
            m_ctl.CT_POSITIVE, [time], null, shoot_cb);
}

function register_keyboard() {
    var key_w = m_ctl.create_keyboard_sensor(m_ctl.KEY_W);
    var key_s = m_ctl.create_keyboard_sensor(m_ctl.KEY_S);
    var key_a = m_ctl.create_keyboard_sensor(m_ctl.KEY_A);
    var key_d = m_ctl.create_keyboard_sensor(m_ctl.KEY_D);

    var key_cb = function(obj, id, pulse, param) {
        if (pulse == 1) {
            var elapsed = m_ctl.get_sensor_value(obj, id, 0);

            var velocity = m_cam.get_velocities(obj, _velocity_tmp);
            switch (id) {
            case "LEFT":
                _dest_x_trans -= velocity.trans * COCKPIT_TRANS_FACTOR * elapsed;
                break;
            case "RIGHT":
                _dest_x_trans += velocity.trans * COCKPIT_TRANS_FACTOR * elapsed;
                break;
            case "UP":
                _dest_z_trans += velocity.trans * COCKPIT_TRANS_FACTOR * elapsed;
                break;
            case "DOWN":
                _dest_z_trans -= velocity.trans * COCKPIT_TRANS_FACTOR * elapsed;
                break;
            }
        }
    }

    var elapsed = m_ctl.create_elapsed_sensor();
    var cam_obj = m_scs.get_active_camera();
    m_ctl.create_sensor_manifold(cam_obj, "LEFT", m_ctl.CT_CONTINUOUS,
            [elapsed, key_a], null, key_cb);
    m_ctl.create_sensor_manifold(cam_obj, "RIGHT", m_ctl.CT_CONTINUOUS,
            [elapsed, key_d], null, key_cb);
    m_ctl.create_sensor_manifold(cam_obj, "UP", m_ctl.CT_CONTINUOUS,
            [elapsed, key_w], null, key_cb);
    m_ctl.create_sensor_manifold(cam_obj, "DOWN", m_ctl.CT_CONTINUOUS,
            [elapsed, key_s], null, key_cb);
}

//==============================================================================
// SETUP COCKPIT LOGIC
//==============================================================================

function init_cockpit() {
    var cockpit = {
        cockpit_empty: m_scs.get_object_by_name("cockpit"),
        cockpit_mesh_obj: m_scs.get_object_by_dupli_name("cockpit", "cockpit"),

        camera_asteroids_obj: m_scs.get_object_by_name("Camera_asteroids"),

        laser_obj: m_scs.get_object_by_dupli_name("cockpit", "laser"),
        laser_arm: m_scs.get_object_by_dupli_name("cockpit", "laser_arm"),

        lighting: m_scs.get_object_by_name("lighting"),
        cockpit_light: m_scs.get_object_by_name("cockpit_light"),

        speaker_strike: m_scs.get_object_by_dupli_name("cockpit", "speaker_laser_strike"),
        speaker_alarm: m_scs.get_object_by_dupli_name("cockpit", "speaker_alarm"),
        speaker_ast_hit: m_scs.get_object_by_dupli_name("cockpit", "asteroid_hit"),

        crosshair_obj: m_scs.get_object_by_name("crosshair"),
        crosshair_base_obj: m_scs.get_object_by_name("crosshair_base"),

        environment_empty: m_scs.get_object_by_name("environment"),
        environment_tunnel_obj: m_scs.get_object_by_dupli_name("environment", "Circle"),
        environment_sphere_obj: m_scs.get_object_by_dupli_name("environment", "Sphere"),
        environment_arm: m_scs.get_object_by_dupli_name("environment", "environment_arm"),

        hp: COCKPIT_MAX_HP
    };

    return cockpit;
}

function spawn_cockpit() {
    var cockpit_empty = _cockpit.cockpit_empty;
    var start_pos = _vec3_tmp;
    start_pos[0] = 0;
    start_pos[1] = 0;
    start_pos[2] = 0;
    m_trans.set_translation_v(cockpit_empty, start_pos);

    var cam_obj = m_scs.get_active_camera();
    m_trans.set_translation_v(cam_obj, start_pos);

    var camera_asteroids_obj = _cockpit.camera_asteroids_obj;
    if (camera_asteroids_obj)
        m_trans.set_translation_v(camera_asteroids_obj, start_pos);

    var environment_empty = _cockpit.environment_empty;
    if (environment_empty)
        m_trans.set_translation_v(environment_empty, start_pos);

    _dest_x_trans = 0;
    _dest_z_trans = 0;

    _cockpit.hp = COCKPIT_MAX_HP;

    var cockpit_mesh_obj = _cockpit.cockpit_mesh_obj;
    if (cockpit_mesh_obj)
        m_mat.set_nodemat_value(cockpit_mesh_obj, ["screen", "life"], 0.19);
}

function register_cockpit() {
    _cockpit = init_cockpit();

    var cockpit_empty = _cockpit.cockpit_empty;
    var cockpit_mesh_obj = _cockpit.cockpit_mesh_obj;
    var camera_asteroids_obj = _cockpit.camera_asteroids_obj;
    var laser_arm = _cockpit.laser_arm;
    var crosshair_obj = _cockpit.crosshair_obj;
    var environment_empty = _cockpit.environment_empty;
    var environment_arm = _cockpit.environment_arm;

    // cockpit and environment logic
    if (cockpit_empty && environment_empty) {
        var init_bending_tsr = m_armat.get_bone_tsr(environment_arm, "move", m_tsr.create());

        // cockpit logic
        var elapsed = m_ctl.create_elapsed_sensor();
        // translation smoothing
        var trans_interp_cb = function(obj, id, pulse) {
            if (Math.abs(_dest_x_trans) > EPSILON_DISTANCE ||
                Math.abs(_dest_z_trans) > EPSILON_DISTANCE) {

                var value = m_ctl.get_sensor_value(obj, id, 0);

                var delta_x = m_util.smooth(_dest_x_trans, 0, value, 1);
                var delta_z = m_util.smooth(_dest_z_trans, 0, value, 1);

                _dest_x_trans -= delta_x;
                _dest_z_trans -= delta_z;
                var trans = m_trans.get_translation(obj, _vec3_tmp);
                trans[0] += delta_x;
                trans[2] += delta_z;
                m_trans.set_translation_v(obj, trans);
                var cam_obj = m_scs.get_active_camera();
                m_trans.set_translation_v(cam_obj, trans);
                m_trans.set_translation_v(camera_asteroids_obj, trans);

                trans[0] -= _dest_x_trans / 2;
                trans[2] -= _dest_z_trans / 2;
                m_trans.set_translation_v(environment_empty, trans);

                var roll_angle = m_util.clamp(_dest_x_trans * COCKPIT_ROT_FACTOR,
                        -Math.PI * COCKPIT_ROT_FACTOR, Math.PI * COCKPIT_ROT_FACTOR);
                var roll_quat = m_quat.setAxisAngle(m_util.AXIS_Y, roll_angle, _quat_tmp);
                var pitch_angle = - m_util.clamp(_dest_z_trans * COCKPIT_ROT_FACTOR,
                        -Math.PI * COCKPIT_ROT_FACTOR,
                        Math.PI * COCKPIT_ROT_FACTOR) / 4;
                var pitch_quat = m_quat.setAxisAngle(m_util.AXIS_MX, pitch_angle, _quat_tmp2);

                var cockpit_quat = m_quat.multiply(roll_quat, pitch_quat, _quat_tmp);
                m_trans.set_rotation_v(obj, cockpit_quat);

                var environment_sphere_obj = _cockpit.environment_sphere_obj;
                if (environment_sphere_obj) {
                    var cur_sphere_quat = m_trans.get_rotation(environment_sphere_obj, _quat_tmp);
                    pitch_angle = m_util.clamp(_dest_z_trans * COCKPIT_ROT_FACTOR,
                            -Math.PI * COCKPIT_ROT_FACTOR,
                            Math.PI * COCKPIT_ROT_FACTOR) * ENV_SPHERE_ROT_FACTOR;
                    pitch_quat = m_quat.setAxisAngle(m_util.AXIS_MX, pitch_angle, _quat_tmp2);
                    var new_sphere_quat = m_quat.multiply(cur_sphere_quat,
                            pitch_quat, _quat_tmp);

                    var yaw_angle = - roll_angle * ENV_SPHERE_ROT_FACTOR;
                    var yaw_quat = m_quat.setAxisAngle(m_util.AXIS_MZ,
                            yaw_angle, _quat_tmp2);
                    new_sphere_quat = m_quat.multiply(cur_sphere_quat,
                            yaw_quat, _quat_tmp);
                    m_trans.set_rotation_v(environment_sphere_obj, new_sphere_quat);
                }

                // bend environment
                var init_bending_pos = m_tsr.get_trans_view(init_bending_tsr);
                var new_bending_pos = m_vec3.copy(init_bending_pos, _vec3_tmp);
                new_bending_pos[0] += _dest_x_trans;
                new_bending_pos[2] += _dest_z_trans;
                var new_bending_tsr = m_tsr.copy(init_bending_tsr, _tsr_tmp);
                new_bending_tsr = m_tsr.set_trans(new_bending_pos, new_bending_tsr);
                m_armat.set_bone_tsr(environment_arm, "move", new_bending_tsr);
            }
        }
        m_ctl.create_sensor_manifold(cockpit_empty, "COCKPIT_TRANSLATION",
                m_ctl.CT_POSITIVE, [elapsed], null, trans_interp_cb);
    }

    // environment speed
    // var env_tunnel = _cockpit.environment_tunnel_obj;
    // if (env_tunnel) {
    //     var elapsed = m_ctl.create_elapsed_sensor();
    //     var env_speed_cb = function(obj, id, pulse) {
    //         var elapsed = m_ctl.get_sensor_value(obj, id, 0);
    //         _env_speed = m_util.smooth(_asteroid_speed / 50, _env_speed, elapsed, _spawn_delay);
    //         m_mat.set_nodemat_value(env_tunnel, ["space_dust", "speed"], _env_speed);
    //     }
    //     m_ctl.create_sensor_manifold(null, "ENVIRONMENT_SPEED",
    //             m_ctl.CT_CONTINUOUS, [elapsed], null, env_speed_cb);
    // }

    // laser stuff
    if (laser_arm && crosshair_obj) {
        var elapsed = m_ctl.create_elapsed_sensor();
        var laser_arm_cb = function(obj, id, pulse) {
            var cross_view = m_trans.get_rotation(crosshair_obj, _quat_tmp);
            var laser_dir = m_vec3.transformQuat(m_util.AXIS_MZ, cross_view,
                    _vec3_tmp);
            laser_dir = m_vec3.scale(laser_dir, MAX_LASER_LENGTH, _vec3_tmp);

            var arm_quat = m_trans.get_rotation(laser_arm, _quat_tmp);
            var inv_arm_quat = m_quat.invert(arm_quat, _quat_tmp);
            laser_dir = m_vec3.transformQuat(laser_dir, inv_arm_quat, _vec3_tmp);

            var laser_tsr = m_tsr.identity(_tsr_tmp);
            if (laser_dir[0] < 0.45 * MAX_LASER_LENGTH) {
                laser_tsr = m_tsr.set_trans(laser_dir, _tsr_tmp);
                m_armat.set_bone_tsr(laser_arm, "left_laser", laser_tsr);
            } else
                m_armat.set_bone_tsr(laser_arm, "left_laser", laser_tsr);

            laser_tsr = m_tsr.identity(_tsr_tmp);
            if (laser_dir[0] > -0.45 * MAX_LASER_LENGTH) {
                laser_tsr = m_tsr.set_trans(laser_dir, _tsr_tmp);
                m_armat.set_bone_tsr(laser_arm, "right_laser", laser_tsr);
            } else
                m_armat.set_bone_tsr(laser_arm, "right_laser", laser_tsr);
        }
        m_ctl.create_sensor_manifold(laser_arm, "LASER_ARM",
                m_ctl.CT_CONTINUOUS, [elapsed], null, laser_arm_cb);
    }

    // crosshair stuff
    if (crosshair_obj) {
        var cam_obj = m_scs.get_active_camera();

        var elapsed = m_ctl.create_elapsed_sensor();
        var crosshair_cb = function(obj, id, pulse) {
            var cam_pos = m_trans.get_translation(cam_obj, _vec3_tmp);
            m_trans.set_translation_v(obj, cam_pos);

            var view = m_trans.get_rotation(cam_obj, _quat_tmp);
            var cross_view = m_trans.get_rotation(obj, _quat_tmp2);

            var elapsed = m_ctl.get_sensor_value(obj, id, 0);
            var new_cross_view = m_quat.lerp(cross_view, view,
                    CROSSHAIR_DELAY * elapsed, _quat_tmp);
            m_trans.set_rotation_v(obj, new_cross_view);
        }

        m_ctl.create_sensor_manifold(crosshair_obj, "CROSSHAIR",
                m_ctl.CT_CONTINUOUS, [elapsed], null, crosshair_cb);
    }

    // video stream
    function get_user_media() {
        if ("getUserMedia" in navigator)
            return navigator.getUserMedia.bind(navigator);
        else if ("webkitGetUserMedia" in navigator)
            return navigator.webkitGetUserMedia.bind(navigator);
        else if ("mozGetUserMedia" in navigator)
            return navigator.mozGetUserMedia.bind(navigator);
        else if ("msGetUserMedia" in navigator)
            return navigator.msGetUserMedia.bind(navigator);
        else
            return null;
    }

    var user_media = get_user_media();
    if (cockpit_mesh_obj && Boolean(user_media)) {
        var success_cb = function(local_media_stream) {
            var video = document.createElement("video");
            video.setAttribute("autoplay", "true");
            video.src = window.URL.createObjectURL(local_media_stream);

            var context = m_tex.get_canvas_ctx(cockpit_mesh_obj, "camera_01");
            if (context) {
                var update_canvas = function() {
                    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight,
                            0, 0, context.canvas.width, context.canvas.height);
                    m_tex.update_canvas_ctx(cockpit_mesh_obj, "camera_01");
                    setTimeout(function() {update_canvas()}, USERMEDIA_TIME_DELAY);
                }

                video.onloadedmetadata = function(e) {
                    update_canvas();
                };
            }
        };

        var fail_cb = function() {
            m_print.warn("Web-camera is not avaliable. Please " +
                    "check web-camera connection and allow access to " +
                    "the web-camera.")
        };

        try {
            var constraints = {
                video: {width: 1280, height: 720}
            };
            user_media(constraints, success_cb, fail_cb);
        } catch(err) {
            // Chromium decision
            var constraints = {
                video: {
                    mandatory: {
                        maxWidth: 1024,
                        maxHeight: 768,
                        minWidth: 1024,
                        minHeight: 768
                        }
                }
            };
            user_media(constraints, success_cb, fail_cb);
        }
    }
}

function register_shake() {
    var cam_obj = m_scs.get_active_camera();
    if (cam_obj) {
        var shake_cb = function(obj, id, pulse) {
            var time = m_ctl.get_sensor_value(obj, id, 0);
            if (time - _start_shake_time < COCKPIT_SHAKE_TIME) {
                _dest_x_trans += (Math.random() - 0.5) * (1 - (time - _start_shake_time) / COCKPIT_SHAKE_TIME);
                _dest_z_trans += (Math.random() - 0.5) * (1 - (time - _start_shake_time) / COCKPIT_SHAKE_TIME);
            } else
                m_ctl.set_custom_sensor(_shake_sensor, 0);
        }

        var time = m_ctl.create_timeline_sensor();
        m_ctl.create_sensor_manifold(cam_obj, "SHAKE_COCKPIT",
                m_ctl.CT_CONTINUOUS, [time, _shake_sensor], null, shake_cb);
    }
}

//==============================================================================
// SETUP HMD LOGIC
//==============================================================================
function register_hmd() {
    m_hmd_conf.update();
    // camera rotation is enabled with HMD
    m_hmd.enable_hmd(m_hmd.HMD_ALL_AXES_MOUSE_NONE);

    var elapsed = m_ctl.create_elapsed_sensor();
    var psensor = m_ctl.create_hmd_position_sensor();
    var updated_eye_data = false;

    var last_hmd_pos = m_vec3.create();
    var hmd_cb = function(obj, id, pulse) {
        if (pulse > 0) {
            var hmd_pos = m_ctl.get_sensor_payload(obj, id, 1);

            if (!updated_eye_data) {
                m_vec3.copy(hmd_pos, last_hmd_pos);
                updated_eye_data = true;
            } else {
                var diff_hmd_pos = m_vec3.subtract(hmd_pos, last_hmd_pos, _vec3_tmp2);
                m_vec3.scale(diff_hmd_pos, 15, diff_hmd_pos);
                _dest_x_trans += diff_hmd_pos[0];
                _dest_z_trans += diff_hmd_pos[2];
                m_vec3.copy(hmd_pos, last_hmd_pos);
            }
        }
    }

    var cam_obj = m_scs.get_active_camera();
    m_ctl.create_sensor_manifold(cam_obj, "HMD_TRANSLATE_CAMERA",
            m_ctl.CT_CONTINUOUS, [elapsed, psensor], null, hmd_cb);
}

//==============================================================================
// SETUP ASTEROID LOGIC
//==============================================================================
function init_asteroid(name, asteroid_obj, asteroid_arm, asteroid_copy_obj,
        asteroid_emitter_obj, asteroid_copy_mesh_obj, asteroid_speaker) {
    var asteroid = {
        name: name,
        ast_obj: asteroid_obj,
        ast_arm: asteroid_arm,
        ast_copy_obj: asteroid_copy_obj,
        ast_copy_mesh_obj: asteroid_copy_mesh_obj,
        ast_emitter_obj: asteroid_emitter_obj,
        ast_speaker: asteroid_speaker,
        active: false,
        angular_velosity: m_quat.create(),
        velosity: m_vec3.create(),

        strength: ASTEROID_STRENGTH,
        is_destroyed: false
    }

    return asteroid;
}

function get_asteroid_by_name(name) {
    for (var i = 0; i < _asteroid_list.length; i++)
        if (_asteroid_list[i].name == name)
            return _asteroid_list[i];
}

function register_asteroids() {
    for (var i = 0; i < ASTEROID_COUNT; i++) {
        var name = "asteroid." + int_to_str_length(i, 3);
        var asteroid_obj = m_scs.get_object_by_name(name);
        if (asteroid_obj) {
            var asteroid_children = m_scs.get_object_children(asteroid_obj);

            var asteroid_arm = null;
            var asteroid_emitter_obj = null;
            var asteroid_speaker = null;
            for (var j = 0; j < asteroid_children.length; j++) {
                if (m_obj.is_armature(asteroid_children[j])) {
                    asteroid_arm = asteroid_children[j];
                } if (m_scs.get_object_name(asteroid_children[j]) == "explosion_emitter") {
                    asteroid_emitter_obj = asteroid_children[j];
                } if (m_obj.is_speaker(asteroid_children[j])) {
                    asteroid_speaker = asteroid_children[j];
                }
            }

            var asteroid_copy_obj = m_scs.get_object_by_name(name + "_copy");
            var asteroid_copy_mesh_obj = null;
            var asteroid_copy_children = m_scs.get_object_children(asteroid_copy_obj);
            for (var j = 0; j < asteroid_copy_children.length; j++)
                if (m_obj.is_mesh(asteroid_copy_children[j]))
                    asteroid_copy_mesh_obj = asteroid_copy_children[j];

            var asteroid = init_asteroid(name, asteroid_obj, asteroid_arm,
                    asteroid_copy_obj, asteroid_emitter_obj,
                    asteroid_copy_mesh_obj, asteroid_speaker);
            _asteroid_list.push(asteroid);

            init_asteroid_transform(asteroid);

            var elapsed = m_ctl.create_elapsed_sensor();
            var update_asteroid_cb = function(obj, id, pulse) {
                var asteroid = obj;
                if (asteroid.active) {
                    // set new tranlation
                    var ast_obj = asteroid.ast_obj;
                    var asteroid_pos = m_trans.get_translation(ast_obj, _vec3_tmp);
                    var elapsed = m_ctl.get_sensor_value(obj, id, 0);
                    var diff_pos = m_vec3.scale(asteroid.velosity, elapsed, _vec3_tmp2);
                    m_vec3.add(asteroid_pos, diff_pos, asteroid_pos);
                    m_trans.set_translation_v(ast_obj, asteroid_pos);

                    // set new rotation
                    var angle = m_quat.slerp(QUAT4_IDENT,
                            asteroid.angular_velosity, elapsed, _quat_tmp);

                    var aster_quat = m_trans.get_rotation(ast_obj, _quat_tmp2);
                    var new_aster_quat = m_quat.multiply(aster_quat, angle, _quat_tmp);
                    m_quat.normalize(new_aster_quat, new_aster_quat);
                    m_trans.set_rotation_v(ast_obj, new_aster_quat);

                    var ast_copy_obj = asteroid.ast_copy_obj;
                    if (ast_copy_obj) {
                        m_trans.set_translation_v(ast_copy_obj, asteroid_pos);
                        m_trans.set_rotation_v(ast_copy_obj, new_aster_quat);
                    }

                    if (asteroid_pos[1] < -20)
                        init_asteroid_transform(asteroid);
                }
            }
            m_ctl.create_sensor_manifold(asteroid, "UPDATE_ASTEROID" + name,
                    m_ctl.CT_CONTINUOUS, [elapsed], null, update_asteroid_cb);
        }
    }
}

function damage_asteroid(asteroid_obj, damage) {
    var name = m_scs.get_object_name_hierarchy(asteroid_obj)[0];
    var dupli_name = m_scs.get_object_name_hierarchy(asteroid_obj)[1];

    var asteroid = get_asteroid_by_name(name);
    if (asteroid && !asteroid.is_destroyed) {
        asteroid.strength -= damage;
        if (asteroid.strength < 0) {
            m_vec3.set(0, 0, 0, asteroid.velosity);
            m_quat.identity(asteroid.angular_velosity);

            var ast_arm = asteroid.ast_arm;
            if (ast_arm) {
                m_anim.apply(ast_arm, dupli_name + "_disruption");
                m_anim.play(ast_arm, compile_asteroid);
            }

            var ast_copy_mesh_obj = asteroid.ast_copy_mesh_obj;
            if (ast_copy_mesh_obj) {
                m_anim.apply(ast_copy_mesh_obj, "asteroid_fading");
                m_anim.play(ast_copy_mesh_obj);
            }

            var lighting = _cockpit.lighting;
            if (lighting) {
                m_anim.apply(lighting, "asteroid_burst");
                m_anim.play(lighting);
            }

            var emitter = asteroid.ast_emitter_obj;
            if (emitter) {
                var trans = m_trans.get_translation(asteroid.ast_obj, _vec3_tmp);
                m_trans.set_translation_v(emitter, trans);
                m_anim.apply(emitter, "explosion")
                m_anim.play(emitter);
            }

            var speaker = asteroid.ast_speaker;
            if (speaker) {
                var trans = m_trans.get_translation(asteroid.ast_obj, _vec3_tmp);
                m_trans.set_translation_v(speaker, trans);
                m_sfx.play_def(speaker);
            }

            asteroid.is_destroyed = true;
        }
    }
}

function compile_asteroid(obj) {
    var name = m_scs.get_object_name_hierarchy(obj)[0];
    var asteroid = get_asteroid_by_name(name);

    asteroid.is_destroyed = false;

    init_asteroid_transform(asteroid);
}

function init_asteroid_transform(asteroid) {
    var ast_obj = asteroid.ast_obj;
    var spawn_coord = _vec3_tmp;
    spawn_coord[0] = 0;
    spawn_coord[1] = 1000;
    spawn_coord[2] = 0;
    m_trans.set_translation_v(ast_obj, spawn_coord);

    var ast_copy_obj = asteroid.ast_copy_obj;
    if (ast_copy_obj)
        m_trans.set_translation_v(ast_copy_obj, spawn_coord);

    m_vec3.set(0, 0, 0, asteroid.velosity);
    m_quat.identity(asteroid.angular_velosity);
    asteroid.active = false;
    asteroid.strength = ASTEROID_STRENGTH;
}

// using _quat_tmp, _vec3_tmp, _vec3_tmp2
function spawn_asteroid_random_pos(asteroid, cam_coord) {
    asteroid.active = true;
    // set target point
    var target_coord = m_vec3.copy(cam_coord, _vec3_tmp2);
    target_coord[0] += ASTEROID_DEFAULT_TARGET_OFFSET * (2 * Math.random() - 1);
    target_coord[1] = 0;
    target_coord[2] += ASTEROID_DEFAULT_TARGET_OFFSET * (2 * Math.random() - 1);

    // set spawn point
    var spawn_coord = m_vec3.copy(cam_coord, _vec3_tmp);
    spawn_coord[0] += ASTEROID_DEFAULT_SPAWN_OFFSET * (2 * Math.random() - 1);
    spawn_coord[1] = 100;
    spawn_coord[2] += ASTEROID_DEFAULT_SPAWN_OFFSET * Math.random() / 2;

    var ast_obj = asteroid.ast_obj;
    m_trans.set_translation_v(ast_obj, spawn_coord);

    var ast_copy_obj = asteroid.ast_copy_obj;
    if (ast_copy_obj)
        m_trans.set_translation_v(ast_copy_obj, spawn_coord);

    // set velosity
    var dir = m_vec3.subtract(target_coord, spawn_coord, _vec3_tmp2);
    m_vec3.normalize(dir, dir);
    var velocity = m_vec3.scale(dir, _asteroid_speed, dir);
    _asteroid_speed = _asteroid_speed < ASTEROID_MAX_SPEED?
            _asteroid_speed + 1: _asteroid_speed;

    var cockpit_mesh_obj = _cockpit.cockpit_mesh_obj;
    if (cockpit_mesh_obj)
        m_mat.set_nodemat_value(cockpit_mesh_obj, ["screen", "speed"],
                1 - 0.1 * ((_asteroid_speed - ASTEROID_DEFAULT_SPEED) /
                (ASTEROID_MAX_SPEED - ASTEROID_DEFAULT_SPEED) * 8 % 8));

    m_vec3.copy(velocity, asteroid.velosity);
    // apply torque
    var axis = m_vec3.set(2 * Math.random() - 1, 2 * Math.random() - 1, 2 * Math.random() - 1, _vec3_tmp);
    asteroid.angular_velosity = m_quat.setAxisAngle(axis,
            Math.PI * (2 * Math.random() - 1) * 10, asteroid.angular_velosity);

    // var element = document.getElementById("score");
    // element.innerHTML = _asteroid_speed - 20;
}

//==============================================================================
// SETUP SHOOTING LOGIC
//==============================================================================
function shoot(time) {
    if (time - _last_shoot_time > SHOOT_LISER_DELAY) {
        m_ctl.set_custom_sensor(_burst_fire_sensor, 1);
        var laser_obj = _cockpit.laser_obj;
        if (laser_obj) {
            m_anim.apply(laser_obj, "laser_strike");
            m_anim.play(laser_obj);
            m_anim.set_behavior(laser_obj, m_anim.AB_FINISH_STOP);
        }
        _last_shoot_time = time;
        _burst_time = time;

        var speaker_strike = _cockpit.speaker_strike;
        if (speaker_strike)
            m_sfx.play_def(speaker_strike);

        var lighting = _cockpit.lighting;
        if (lighting) {
            m_anim.apply(lighting, "laser_strike_lighting");
            m_anim.play(lighting);
        }
    }
}

function register_burst() {
    var burst_cb = function(obj, id, pulse) {
        var time = m_ctl.get_sensor_value(obj, id, 0);
        if (time - _burst_time > BURST_LISER_TIME) {
            m_ctl.set_custom_sensor(_burst_fire_sensor, 0);

            var speaker_strike = _cockpit.speaker_strike;
            if (speaker_strike && m_sfx.is_playing(speaker_strike))
                m_sfx.stop(speaker_strike);
        }

        var cross_pos = m_trans.get_translation(obj, _vec3_tmp);
        var cross_view = m_trans.get_rotation(obj, _quat_tmp);
        var forward = m_vec3.transformQuat(m_util.AXIS_MZ, cross_view,
                _vec3_tmp2);
        forward = m_vec3.scale(forward, MAX_LASER_LENGTH, _vec3_tmp2);
        forward = m_vec3.add(forward, cross_pos, forward);

        var elapsed = m_ctl.get_sensor_value(obj, id, 1);
        var ray_test_cb = function(id, hit_fract, obj_hit, hit_time) {
            damage_asteroid(obj_hit, elapsed * LASER_DAMAGE);
        }
        m_phy.append_ray_test(null, cross_pos, forward,
                "crash", ray_test_cb, true);
    }

    var crosshair_obj = _cockpit.crosshair_obj;
    if (crosshair_obj) {
        var time = m_ctl.create_timeline_sensor();
        var elapsed = m_ctl.create_elapsed_sensor();
        m_ctl.create_sensor_manifold(crosshair_obj, "BURST", m_ctl.CT_POSITIVE,
                [time, elapsed, _burst_fire_sensor], null, burst_cb);
    }
}

//==============================================================================
// SETUP GAME LOGIC
//==============================================================================

function start_game() {
    m_print.log("START GAME.");
    spawn_cockpit();

    var time = m_ctl.create_timeline_sensor();
    var spawn_asteroid_cb = function(obj, id, pulse) {
        var time = m_ctl.get_sensor_value(obj, id, 0);

        if (time - _last_spawn_time > _spawn_delay) {
            for (var i = 0; i < _asteroid_list.length; i++) {
                var asteroid = _asteroid_list[i];
                if (!asteroid.active) {
                    var cam_pos = m_trans.get_translation(obj, _vec3_tmp);
                    spawn_asteroid_random_pos(asteroid, cam_pos);
                    _last_spawn_time = time;
                    _spawn_delay = _spawn_delay > ASTEROID_MIN_SPAWN_DELAY?
                            _spawn_delay - ASTEROID_SPAWN_DELAY_SUB: _spawn_delay;

                    break;
                }
            }
        }
    }
    var cam_obj = m_scs.get_active_camera();
    m_ctl.create_sensor_manifold(cam_obj, "ASTEROID_SPAWN", m_ctl.CT_POSITIVE,
            [time], null, spawn_asteroid_cb);


    var collision = m_ctl.create_collision_sensor(cam_obj, "crash", false);
    var last_crash = 0;
    var crash_cb = function(obj, id, pulse) {
        var time = m_ctl.get_sensor_value(obj, id, 1);
        if (time - last_crash< 1)
            return;

        last_crash = time;
        _cockpit.hp -= ASTEROID_DAMAGE;

        var cockpit_mesh_obj = _cockpit.cockpit_mesh_obj;
        if (cockpit_mesh_obj)
            m_mat.set_nodemat_value(cockpit_mesh_obj, ["screen", "life"],
                    1 - 0.8 * _cockpit.hp / COCKPIT_MAX_HP);

        if (_cockpit.hp > 0) {
            var payload = m_ctl.get_sensor_payload(obj, id, 0);

            var coll_obj = payload.coll_obj;
            if (coll_obj) {
                if (cockpit_mesh_obj) {
                    m_anim.apply(cockpit_mesh_obj, "cockpit_shader_alarm", m_anim.SLOT_0);
                    m_anim.apply(cockpit_mesh_obj, "screen_shader_alarm", m_anim.SLOT_1);
                    m_anim.play(cockpit_mesh_obj, null, m_anim.SLOT_ALL);
                }

                var cockpit_light = _cockpit.cockpit_light;
                if (cockpit_light) {
                    m_anim.apply(cockpit_light, "cockpit_light_alarm");
                    m_anim.play(cockpit_light);
                }

                var speaker_alarm = _cockpit.speaker_alarm;
                if (speaker_alarm) {
                    if (m_sfx.is_playing(speaker_alarm))
                        m_sfx.stop(speaker_alarm);
                    m_sfx.play_def(speaker_alarm);
                }

                var speaker_ast_hit = _cockpit.speaker_ast_hit;
                if (speaker_ast_hit)
                    m_sfx.play_def(speaker_ast_hit);

                var name = m_scs.get_object_name_hierarchy(coll_obj)[0];
                var asteroid = get_asteroid_by_name(name);
                if (asteroid)
                    init_asteroid_transform(asteroid);

                m_ctl.set_custom_sensor(_shake_sensor, 1);
                _start_shake_time = time;
            }
        } else {
            m_print.log("PLAYERS HP IS LESS 0. RESTART GAME.");
            // restart game
            for (var i = 0; i < _asteroid_list.length; i++)
                init_asteroid_transform(_asteroid_list[i]);

            // _env_speed = 0;
            _asteroid_speed = ASTEROID_DEFAULT_SPEED;
            _spawn_delay = ASTEROID_DEFAULT_SPAWN_DELAY;
            m_ctl.remove_sensor_manifold(cam_obj, "CRASH");
            m_ctl.remove_sensor_manifold(cam_obj, "ASTEROID_SPAWN");
            start_game();
        }
    }
    m_ctl.create_sensor_manifold(cam_obj, "CRASH", m_ctl.CT_CONTINUOUS,
            [collision, time], null, crash_cb);

}

});

// import the app module and start the app by calling the init method
b4w.require("space_disaster").init();
