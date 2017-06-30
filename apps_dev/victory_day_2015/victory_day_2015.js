"use strict";

b4w.register("victory_day_2015_main", function(exports, require) {


var m_anim     = require("animation");
var m_app      = require("app");
var m_cam      = require("camera");
var m_cfg      = require("config");
var m_cons     = require("constraints");
var m_cont     = require("container");
var m_data     = require("data");
var m_lights   = require("lights");
var m_main     = require("main");
var m_mat      = require("material");
var m_math     = require("math");
var m_mouse    = require("mouse");
var m_obj      = require("objects");
var m_scs      = require("scenes");
var m_sfx      = require("sfx");
var m_time     = require("time");
var m_trans    = require("transform");
var m_tsr      = require("tsr");
var m_util     = require("util");
var m_version  = require("version");

var m_quat     = require("quat");
var m_vec3     = require("vec3");


var DEBUG = (m_version.type() === "DEBUG");

var objects_array = [];

var random_colors = [[255, 255, 0],
                     [255, 0, 148],
                     [0, 255, 0],
                     [0, 0, 255],
                     [161, 0, 255],
                     [255, 255, 255],
                     [94, 255, 255]];


var _cam_tsr           = new Float32Array(8);
var _camera_point_tsr  = new Float32Array(8);
var _firework_1_tsr    = new Float32Array(8);
var _firework_2_1_tsr  = new Float32Array(8);
var _light_point_tsr   = new Float32Array(8);
var _tsr_tmp           = new Float32Array(8);
var _tsr_tmp2          = new Float32Array(8);

var _firework_offset   = new Float32Array(3);
var _rocket_offset     = new Float32Array(3);
var _rocket_direction  = new Float32Array(3);
var _vec3_tmp          = new Float32Array(3);
var _vec3_tmp2         = new Float32Array(3);
var _vec3_tmp3         = new Float32Array(3);
var _vec3_tmp4         = new Float32Array(3);

var ZERO_VECTOR        = new Float32Array([0, 0, 0]);
var SMOKE_OFFSET       = new Float32Array([0, -1, 0]);

var _vec4_tmp          = new Float32Array(4);

var _quat_tmp          = new Float32Array(4);
var _quat_tmp2         = new Float32Array(4);
var _quat_tmp3         = new Float32Array(4);

var _pline_tmp = m_math.create_pline();

var FIREWORKS_INTERVAL        = 500;
var FIREWORKS_QUANTITY        = 16;
var FIREWORKS_Y_OFFSET        = -0.03;
var ROCKETS_INTERVAL          = 250;

var MAX_X_OFFSET              = 0.2;
var MIN_X_OFFSET              = -0.2;

var MAX_Z_OFFSET              = 1;
var MIN_Z_OFFSET              = -1;

var MAX_ANGLE_OFFSET          = 0.3;
var MIN_ANGLE_OFFSET          = 0;

var ROCKET_BEHIND_TIME        = 500;
var ROCKET_BOTTOM_CLAMPING    = 0.5;
var ROCKET_DIST_FROM_CAMERA   = 3;
var ROCKET_FLYING_DIST        = 85;
var ROCKET_FLYING_TIME        = 2000;
var ROCKET_IN_RAIL_TIME       = 500;
var ROCKET_OFFSET_DIST        = 1.1;
var ROCKET_ROTATE_DIST        = 400;
var ROCKET_SMOKE_DISCENT      = 0.5;
var ROCKET_SMOKE_DISCENT_TIME = 1000;
var ROCKET_TOP_CLAMPING       = 3;

var LOGO_FADE_IN              = 300;
var REPLAY_FADE_IN            = 1000;
var SOCIAL_FADE_IN            = 500;

var BG_FADE_OUT               = 300;
var IMAGE_FADE_IN             = 300;
var REMOVE_PRELOAD_TIME       = 300;
var PRELOAD_CONT_FADE_IN      = 300;
var PRELOAD_FADE_IN           = 300;
var SUN_FADE_IN               = 300;

var RESIDUAL_DELAY            = 500;
var ROCKET_BEFORE_SMOKE       = 0;
var SETTLING_DELAY            = 100;

var LIGHT_Z_OFFSET            = 8;

var FIRE_LIGHT_ENERGY         = 20;


var _9_may_logo          = null;
var _bm_13               = null;
var _bm_13_Armature      = null;
var _button_spk          = null;
var _canvas_elem         = null;
var _cam                 = null;
var _camera_point        = null;
var _control_box         = null;
var _control_box_button  = null;
var _current_rocket      = null;
var _current_rail        = null;
var _firework_1          = null;
var _firework_2_1        = null;
var _firework_2_2        = null;
var _fireworks_spk       = null;
var _light_point         = null;
var _load_spk            = null;
var _load_spk_2          = null;
var _noise_spk           = null;
var _origin_rocket       = null;
var _residual_armature   = null;
var _residual_smoke      = null;
var _rocket_flash        = null;
var _rocket_plume        = null;
var _rocket_smoke        = null;
var _rocket_start_smoke  = null;
var _rockets_box         = null;
var _settling_smoke      = null;
var _shot_spk            = null;

var _blend4web_logo      = null;
var _info_container      = null;
var _replay              = null;
var _replay_circle       = null;
var _social_buttons      = null;

var _start_info_height   = 0;

var _preload_cont = null


var _in_area       = false;
var _is_grub       = false;
var _is_smoke      = false;

var _camera_action = "";
var _camera_state  = 0;
var _interval      = 0;
var _rocket_num    = 0;


var _light_params = null;

exports.init = function() {
    var show_fps = DEBUG;

    var url_params = m_app.get_url_params();

    if (url_params && "show_fps" in url_params)
        show_fps = true;

    m_app.init({
        canvas_container_id: "main_canvas_container",
        callback: init_cb,
        alpha: false,
        report_init_failure: true,
        console_verbose: true,
        assets_dds_available: !DEBUG,
        assets_min50_available: !DEBUG,
        show_fps: show_fps
    });
}

function init_cb(canvas_elem, success) {
    if (!success) {
        console.log("b4w init failure");
        return;
    }

    _canvas_elem = canvas_elem;

    m_main.pause();

    create_preloader();

    load_stuff();
}

function move_rocket(e) {
    if (!_current_rocket)
        return;

    var x = m_mouse.get_coords_x(e);
    var y = m_mouse.get_coords_y(e);

    set_rocket_translation(x, y);
    set_rocket_rotation(x, y);
}

function action_rocket() {
    if (!_is_grub)
        return;

    _is_grub = false;

    if (_in_area) {
        _current_rocket = null;
        move_rocket_behind_rail();
    } else {
        objects_array.pop();
        objects_array.pop();

        m_scs.remove_object(_current_rocket);
        _current_rocket = null;

        _rocket_num -= 1;
    }
}

function move_rocket_behind_rail() {
    var copied_rocket   = objects_array[objects_array.length - 2];
    var current_rail    = objects_array[objects_array.length - 1];
    var rocket_tsr      = m_trans.get_tsr(copied_rocket, m_tsr.create());
    var rail_tsr        = m_trans.get_tsr(current_rail, m_tsr.create());
    var rail_offset_tsr = m_tsr.transform_vec3(_rocket_offset,
                                               rail_tsr, rail_tsr);

    m_time.animate(0, 1, ROCKET_BEHIND_TIME, function(e) {
        var new_tsr = m_tsr.interpolate(rocket_tsr, rail_offset_tsr,
                                        m_util.smooth_step(e), m_tsr.create());

        m_trans.set_tsr(copied_rocket, new_tsr);

        if (e == 1)
            move_rocket_into_rail(copied_rocket, current_rail);
    });
}

function move_rocket_into_rail(copied_rocket, current_rail) {
    var rocket_tsr = m_trans.get_tsr(copied_rocket, m_tsr.create());
    var rail_tsr   = m_trans.get_tsr(current_rail, m_tsr.create());

    if (Math.round(Math.random()))
        m_sfx.play_def(_load_spk);
    else
        m_sfx.play_def(_load_spk_2);

    m_time.animate(0, 1, ROCKET_IN_RAIL_TIME, function(e) {
        var new_tsr = m_tsr.interpolate(rocket_tsr, rail_tsr,
                                        m_util.smooth_step(e), m_tsr.create());

        m_trans.set_tsr(copied_rocket, new_tsr);

        if (e == 1) {
            _canvas_elem.addEventListener("mousedown", get_clicked_object);
            _canvas_elem.addEventListener("touchstart", get_clicked_object);

            m_cons.append_stiff(copied_rocket, current_rail,
                                m_vec3.set(0, 0, 0, _vec3_tmp));

            m_mat.set_nodemat_value(_control_box, ["control_box", "Value"], 1);
        }
    });
}

function get_clicked_object(e) {
    if (e.preventDefault)
        e.preventDefault();

    var x = m_mouse.get_coords_x(e);
    var y = m_mouse.get_coords_y(e);

    var obj = m_scs.pick_object(x, y);

    if (obj)
        switch (m_scs.get_object_name(obj)) {
        case "rockets_box":
            create_new_rocket(x, y);
            break;
        case "control_box_button":
            _camera_state = 2;
            action_rails();
            break;
        }
}

function action_rails() {
    if (!_rocket_num)
        return;

    _canvas_elem.removeEventListener("mousedown", get_clicked_object);
    _canvas_elem.removeEventListener("touchstart", get_clicked_object);

    m_sfx.stop(_button_spk);
    m_sfx.play_def(_button_spk);

    m_anim.apply(_control_box_button, "press_button_Action");
    m_anim.set_behavior(_control_box_button, m_anim.AB_FINISH_STOP);
    m_anim.play(_control_box_button);

    m_anim.set_speed(_rockets_box, -1);

    m_anim.play(_rockets_box, function() {
        m_anim.apply(_bm_13_Armature, "bm_13_Armature_rotate_-37_Action");
        m_anim.set_first_frame(_bm_13_Armature);
        m_anim.set_behavior(_bm_13_Armature, m_anim.AB_FINISH_STOP);
        m_anim.play(_bm_13_Armature, action_camera);
    });
}

function action_camera() {
    var apply_anim = m_anim.apply;
    var play_anim  = m_anim.play;
    var set_beh    = m_anim.set_behavior;

    apply_anim(_cam, _camera_action);
    m_anim.set_frame(_cam, m_anim.get_anim_start_frame(_bm_13_Armature));
    set_beh(_cam, m_anim.AB_FINISH_STOP);
    play_anim(_cam, action_fire);

    apply_anim(_control_box, "hide_control_box_Action");
    apply_anim(_control_box_button, "hide_control_box_Action");
    set_beh(_control_box, m_anim.AB_FINISH_STOP);
    set_beh(_control_box_button, m_anim.AB_FINISH_STOP);
    play_anim(_control_box);
    play_anim(_control_box_button);

    m_sfx.stop(_noise_spk);
}

function action_fire() {
    for (var i = 1; i <= _rocket_num; i++)
        fire(i);
}

function fire(rocket_num) {
    var append_obj      = m_scs.append_object;
    var append_stiff    = m_cons.append_stiff;
    var apply_anim      = m_anim.apply;
    var copy_obj        = m_obj.copy;
    var play_anim       = m_anim.play;
    var remove_cons     = m_cons.remove;
    var remove_obj      = m_scs.remove_object;
    var set_beh         = m_anim.set_behavior;
    var show_obj        = m_scs.show_object;

    var number_prefix = "";

    if (rocket_num < 10)
        number_prefix = "0";

    var rocket = m_scs.get_object_by_name("rocket_" + rocket_num);
    var rail   = m_scs.get_object_by_dupli_name("bm_13", "rail_" +
                                                number_prefix + rocket_num);

    remove_cons(rocket);

    var rocket_flash_copy       = copy_obj(_rocket_flash,
                                           "rocket_flash_" + rocket_num);
    var rocket_plume_copy       = copy_obj(_rocket_plume,
                                           "rocket_plume_" + rocket_num);
    var rocket_start_smoke_copy = copy_obj(_rocket_start_smoke,
                                           "rocket_start_smoke_" + rocket_num, true);
    var settling_smoke_copy     = copy_obj(_settling_smoke,
                                           "settling_smoke_" + rocket_num);

    m_time.set_timeout(function() {
        append_obj(rocket_flash_copy);
        append_obj(rocket_plume_copy);
        append_obj(rocket_start_smoke_copy);
        append_obj(settling_smoke_copy);

        show_obj(rocket_start_smoke_copy);
        show_obj(settling_smoke_copy);

        apply_anim(rocket_flash_copy, "rocket_flash_Shader_NodetreeAction");
        apply_anim(rocket_plume_copy,
                   "rocket_plume_start_Shader_NodetreeAction");
        apply_anim(rocket_start_smoke_copy,
                   "rocket_start_smoke_Shader_NodetreeAction");
        apply_anim(rocket_start_smoke_copy, "rocket_start_smoke_finalscale",
                   m_anim.SLOT_1);
        apply_anim(settling_smoke_copy,
                   "settling smoke_Shader_NodetreeAction");

        set_beh(rocket_plume_copy, m_anim.AB_FINISH_STOP);
        set_beh(rocket_flash_copy, m_anim.AB_FINISH_STOP);
        set_beh(rocket_start_smoke_copy, m_anim.AB_FINISH_STOP);
        set_beh(rocket_start_smoke_copy, m_anim.AB_FINISH_STOP, m_anim.SLOT_1);
        set_beh(settling_smoke_copy, m_anim.AB_FINISH_STOP);
        set_beh(_residual_armature, m_anim.AB_FINISH_STOP);
        set_beh(_residual_smoke, m_anim.AB_FINISH_STOP);

        append_stiff(rocket_flash_copy, rocket, ZERO_VECTOR);
        append_stiff(rocket_plume_copy, rocket, ZERO_VECTOR);
        append_stiff(rocket_start_smoke_copy, rail, SMOKE_OFFSET);
        remove_cons(rocket_start_smoke_copy);
        append_stiff(settling_smoke_copy, rocket, ZERO_VECTOR);

        play_anim(rocket_flash_copy);

        play_anim(rocket_start_smoke_copy, function() {
            remove_obj(rocket_start_smoke_copy);
        });

        var start_tsr = m_tsr.identity(m_tsr.create());
        var cur_tsr = m_tsr.identity(m_tsr.create());

        m_trans.get_tsr(rocket_start_smoke_copy, start_tsr);
        m_trans.get_tsr(rocket_start_smoke_copy, cur_tsr);

        m_time.animate(0, ROCKET_SMOKE_DISCENT, ROCKET_SMOKE_DISCENT_TIME,
                       function(e) {
                           cur_tsr[2] = start_tsr[2] - e;
                           m_trans.set_tsr(rocket_start_smoke_copy, cur_tsr)}
        );

        m_time.set_timeout(function() {
            play_anim(rocket_start_smoke_copy, null, m_anim.SLOT_1);
        }, m_anim.frame_to_sec(9));

        play_anim(settling_smoke_copy, function() {
            remove_cons(settling_smoke_copy);
            remove_obj(settling_smoke_copy);
        });

        play_anim(rocket_plume_copy, function() {
            apply_anim(rocket_plume_copy,
                       "rocket_plume_loop__Shader_NodetreeAction");
            set_beh(rocket_plume_copy, m_anim.AB_CYCLIC);
            play_anim(rocket_plume_copy);
        });

        m_time.set_timeout(function() {
            remove_cons(settling_smoke_copy);
        }, SETTLING_DELAY);

        m_sfx.play_def(_shot_spk);

        var rocket_tsr      = m_trans.get_tsr(rocket,
                                         m_tsr.identity(m_tsr.create()));
        var copy_rocket_tsr = m_tsr.create();

        m_tsr.copy(rocket_tsr, copy_rocket_tsr);

        var new_rocket_tsr = m_tsr.transform_vec3(_rocket_direction,
                                                  rocket_tsr, copy_rocket_tsr);

        if (is_allowed_smoke(rocket_num)) {
            _is_smoke = true;

            apply_anim(_residual_armature, "residual_smoke_Armature_Action");
            apply_anim(_residual_smoke,
                       "residual_smoke_Shader_NodetreeAction");
            apply_anim(_rocket_smoke, "rocket_smoke_Shader_NodetreeAction");
            apply_anim(_rocket_smoke, "rocket_smoke_finalscale",
                       m_anim.SLOT_1);

            m_anim.set_first_frame(_residual_armature);
            m_anim.set_first_frame(_residual_smoke);
            m_anim.set_first_frame(_rocket_smoke);
            m_anim.set_first_frame(_rocket_smoke, m_anim.SLOT_1);

            set_beh(_residual_armature, m_anim.AB_FINISH_STOP);
            set_beh(_residual_smoke, m_anim.AB_FINISH_STOP);
            set_beh(_rocket_smoke, m_anim.AB_FINISH_STOP);
            set_beh(_rocket_smoke, m_anim.AB_FINISH_STOP, m_anim.SLOT_1);

            play_anim(_rocket_smoke);
            play_anim(_rocket_smoke, null, m_anim.SLOT_1);

            m_time.set_timeout(function() {
                show_obj(_residual_smoke);

                play_anim(_residual_armature);

                m_anim.play(_residual_smoke, function(){
                    _is_smoke = false;

                    m_trans.set_tsr(_cam, _camera_point_tsr);

                    var cam_quat     = m_trans.get_rotation(_cam, _quat_tmp);
                    var new_cam_quat = m_quat.rotateX(cam_quat, Math.PI,
                                                      _quat_tmp2);

                    m_trans.set_rotation_v(_cam, new_cam_quat);
                    run_firework();
                });
            }, RESIDUAL_DELAY);
        }

        if (rocket_num == 1)
            m_lights.set_light_params(_light_point,
                                      {"light_energy": FIRE_LIGHT_ENERGY});

        m_time.animate(0, 1, ROCKET_FLYING_TIME, function(e) {
            var cur_tsr = m_tsr.interpolate(rocket_tsr, new_rocket_tsr,
                                            m_util.smooth_step(e),
                                            m_tsr.identity(m_tsr.create()));

            m_trans.set_tsr(rocket, cur_tsr);
            m_trans.set_translation(_light_point, cur_tsr[0],  cur_tsr[1],
                    cur_tsr[2] + LIGHT_Z_OFFSET);

            if (e == 1) {
                remove_cons(rocket_flash_copy);
                remove_cons(rocket_plume_copy);

                remove_obj(rocket);
                remove_obj(rocket_flash_copy);
                remove_obj(rocket_plume_copy);

                if (rocket_num == _rocket_num) {
                    objects_array = [];

                    m_sfx.stop(_shot_spk);

                    _canvas_elem.addEventListener("mousedown",
                                                  get_clicked_object);
                    _canvas_elem.addEventListener("touchstart",
                                                  get_clicked_object);
                }
            }
        });

    }, ROCKETS_INTERVAL * rocket_num);
}

function is_allowed_smoke(rocket_num) {
    if (_is_smoke)
        return false;

    if (ROCKET_BEFORE_SMOKE >= _rocket_num) {
        if (_rocket_num == 1)
            var begin_rocket = 1;
        else
            var begin_rocket = _rocket_num - 1;
    } else
        var begin_rocket = _rocket_num - ROCKET_BEFORE_SMOKE;

    if (rocket_num == begin_rocket)
        return true;

    return false;
}

function create_new_rocket(x, y) {
    if (FIREWORKS_QUANTITY == _rocket_num)
        return;

    _rocket_num += 1;

    var copied_rocket = m_obj.copy(_origin_rocket, "rocket_" + _rocket_num);

    _current_rocket = copied_rocket;

    objects_array.push(copied_rocket);

    var number_prefix = "";

    if (_rocket_num < 10)
        number_prefix = "0";

    var current_rail = m_scs.get_object_by_dupli_name("bm_13", "rail_" +
                                                      number_prefix +
                                                      _rocket_num);

    _current_rail = current_rail;

    objects_array.push(current_rail);

    m_scs.append_object(copied_rocket);

    set_rocket_translation(x, y);
    set_rocket_rotation(x, y);

    _is_grub = true;
}

function set_rocket_translation(x, y) {
    var pline = m_cam.calc_ray(_cam, x, y, _pline_tmp);
    var camera_ray = m_math.get_pline_directional_vec(pline, _vec3_tmp)
    var camera_trans = m_trans.get_translation(_cam, _vec3_tmp2);

    var dist  = m_vec3.scale(camera_ray, ROCKET_DIST_FROM_CAMERA, _vec3_tmp3);
    var point = m_vec3.add(camera_trans, dist, _vec3_tmp4);

    point[2] = m_util.clamp(point[2], ROCKET_BOTTOM_CLAMPING,
                                      ROCKET_TOP_CLAMPING);

    m_trans.set_translation_v(_current_rocket, point);
}

function set_rocket_rotation(x, y) {
    var rocket_trans      = m_trans.get_translation(_current_rocket,
                                                    _vec3_tmp);
    var rocket_quat       = m_trans.get_rotation(_current_rocket, _quat_tmp);
    var rocket_rail_trans = m_trans.get_translation(_current_rail,
                                                    _vec3_tmp2);
    var rocket_rail_quat  = m_trans.get_rotation(_current_rail, _quat_tmp2);
    var project_point     = m_cam.project_point(_cam, rocket_rail_trans,
                                                _vec3_tmp3);

    var delta_x = x - project_point[0];
    var delta_y = y - project_point[1];
    var delta   = Math.sqrt(delta_x * delta_x + delta_y * delta_y);

    if (delta < ROCKET_ROTATE_DIST)
        _in_area = true;
    else {
        _in_area = false;
        delta = ROCKET_ROTATE_DIST;
    }

    var new_rocket_quat   = rotate_to(rocket_rail_trans, rocket_trans,
                                      rocket_quat);
    var delta_rocket_quat = m_quat.slerp(rocket_rail_quat, new_rocket_quat,
                                         delta/ROCKET_ROTATE_DIST, _quat_tmp3);

    m_trans.set_rotation_v(_current_rocket, delta_rocket_quat);
}

function rotate_to(trans, target, quat) {
    var dir_from = m_util.quat_to_dir(quat, m_util.AXIS_MZ, _vec3_tmp3);
    var dir_to   = m_vec3.subtract(target, trans, _vec3_tmp4);

    m_vec3.normalize(dir_to, dir_to);

    var rotation = m_quat.rotationTo(dir_from, dir_to, _vec4_tmp);

    m_quat.multiply(rotation, quat, quat);
    m_quat.normalize(quat, quat);

    return quat;
}

function load_stuff() {
    var assets_dir = m_cfg.get_std_assets_path();

    m_data.load(assets_dir + "victory_day_2015/main_scene.json",
                load_cb, preloader_cb);

    resize();

    window.addEventListener("resize", resize);
}

function resize_info() {
    var content        = document.querySelector("#content");
    var info_container = document.querySelector("#info_container");
    var footer         = document.querySelector("#footer");

    if (_start_info_height > window.innerHeight + 10) {
        if ((_start_info_height - 50) >= window.innerHeight) {
            footer.style.backgroundImage  = "url(icons/scroll_img.png)";
            content.style.backgroundImage = "url(icons/scroll_fade_img.png)";
        }

        if (window.innerHeight < 440) {
            content.style.display         = "none";
            footer.style.backgroundImage  = "";
            content.style.backgroundImage = "";
        } else {
            if ((_start_info_height - 50) >= window.innerHeight) {
                footer.style.backgroundImage  = "url(icons/scroll_img.png)";
                content.style.backgroundImage = "url(icons/scroll_fade_img.png)";
            }

            content.style.display = "";
            content.style.height  = info_container.offsetHeight - 200 -175 + "px";
        }

        if (window.innerWidth < 380)
            content.style.height = parseInt(content.style.height) + 70 + "px";
    } else {
        content.style.height          = "";
        footer.style.backgroundImage  = "";
        content.style.backgroundImage = "";
    }
}

function init_global_objects() {
    init_dom_elems();
    init_scene_objects();
    init_vectors();
    init_constraints();
}

function init_dom_elems() {
    _replay         = document.querySelector("#replay");
    _replay_circle  = _replay.querySelector("#replay_circle");
    _info_container = document.querySelector("#info_container");
    _blend4web_logo = document.querySelector("#blend4web_logo");
    _social_buttons = document.querySelector("#social_buttons");
}

function init_scene_objects() {
    var get_obj_by_dupli = m_scs.get_object_by_dupli_name;
    var get_obj_by_name  = m_scs.get_object_by_name;

    _cam                = m_scs.get_active_camera();
    _9_may_logo         = get_obj_by_dupli("9_may_logo", "planes");
    _firework_1         = get_obj_by_dupli("firework", "firework_1");
    _firework_2_1       = get_obj_by_dupli("firework", "firework_2_1");
    _firework_2_2       = get_obj_by_dupli("firework", "firework_2_2");
    _origin_rocket      = get_obj_by_dupli("rocket", "rocket");
    _camera_point       = get_obj_by_name("Empty_camera_position_2");
    _noise_spk          = get_obj_by_dupli("red_square", "noise_spk");
    _button_spk         = get_obj_by_dupli("control_box", "button_spk");
    _load_spk           = get_obj_by_dupli("bm_13", "load_spk");
    _load_spk_2         = get_obj_by_dupli("bm_13", "load_spk_2");
    _bm_13_Armature     = get_obj_by_dupli("bm_13", "bm_13_Armature");
    _fireworks_spk      = get_obj_by_dupli("bg", "fireworks_spk")
    _control_box        = get_obj_by_dupli("control_box", "control_box");
    _control_box_button = get_obj_by_dupli("control_box",
                                           "control_box_button");
    _shot_spk           = get_obj_by_dupli("bm_13", "shot_spk");
    _rocket_flash       = get_obj_by_dupli("rocket_plume_flash",
                                           "rocket_flash");
    _rocket_plume       = get_obj_by_dupli("rocket_plume_flash",
                                           "rocket_plume");
    _rocket_start_smoke = get_obj_by_dupli("rocket_start_smoke",
                                           "rocket_start_smoke");
    _residual_armature  = get_obj_by_dupli("residual_smoke",
                                           "residual_smoke_Armature");
    _residual_smoke     = m_scs.get_object_children(_residual_armature)[0];
    _settling_smoke     = get_obj_by_dupli("settling smoke", "settling smoke");
    _rocket_smoke       = get_obj_by_dupli("rocket_smoke", "rocket_smoke");
    _light_point        = get_obj_by_name("rocket_Point_1");
    _bm_13              = get_obj_by_name("bm_13");
    _rockets_box        = get_obj_by_dupli("rockets_box",
                                           "rockets_box_Armature");

    _light_params = m_lights.get_light_params(_light_point);
}

function init_vectors() {
    var get_tsr = m_trans.get_tsr;
    var set     = m_vec3.set;

    get_tsr(_cam, _cam_tsr);
    get_tsr(_firework_1, _firework_1_tsr);
    get_tsr(_firework_2_1, _firework_2_1_tsr);
    _firework_2_1_tsr[3] = 1;

    m_vec3.subtract(_firework_2_1_tsr, _firework_1_tsr, _firework_offset);
    get_tsr(_camera_point, _camera_point_tsr);
    set(0, 0, -ROCKET_OFFSET_DIST, _rocket_offset);
    set(0, 0, ROCKET_FLYING_DIST, _rocket_direction);

    get_tsr(_light_point, _light_point_tsr);
}

function init_constraints() {
    // position control box

    var cbox = m_scs.get_object_by_name("control_box");

    var tsr_cbox_in_cam_space = m_tsr.multiply(m_tsr.invert(_cam_tsr,
                                                            m_tsr.create()),
                                               m_trans.get_tsr(cbox),
                                               m_tsr.create());

    var distance = Math.abs(tsr_cbox_in_cam_space[2]);
    var rotation = m_tsr.get_quat_view(tsr_cbox_in_cam_space);

    m_cons.append_stiff_viewport(cbox, _cam, {
        right: 0.0,
        bottom: 0.0,
        distance: distance,
        rotation: rotation
    });

    m_cons.append_track(_light_point, _bm_13, "-Z", "X");
}

function load_cb(root) {
    init_url_params();
    init_global_objects();
    set_camera_action();
    replace_camera();

    window.addEventListener("resize", resize_info);
}

function set_camera_action() {
    if (window.innerWidth > window.innerHeight)
        _camera_action = "Camera_wide screen_Action";
    else
        _camera_action = "Camera_narrow_screen_Action";

    if (_cam && _camera_state == 1 && !m_anim.is_play(_cam))
        m_anim.apply(_cam, _camera_action);
}

function replace_camera() {
    m_anim.apply(_cam, _camera_action);
    m_anim.set_last_frame(_cam);
}

function init_url_params() {
    var url_params = m_app.get_url_params();

    if (url_params && "lang" in url_params)
        remove_dom_elemnts(url_params["lang"]);
}

function remove_dom_elemnts(lang) {
    var css_class = "ru";

    if (lang == "ru")
        css_class = "en";

    var removing_soc_but = document.querySelector("#social_buttons." +
                                                  css_class);
    var removing_info    = document.querySelector("#info." +
                                                  css_class);
    var removing_run_but = document.querySelector("#run_button." +
                                                  css_class);

    removing_soc_but.parentNode.removeChild(removing_soc_but);
    removing_info.parentNode.removeChild(removing_info);
    removing_run_but.parentNode.removeChild(removing_run_but);
}

function run_firework() {
    var hide_obj = m_scs.hide_object;

    hide_obj(_firework_1);
    hide_obj(_firework_2_1);
    hide_obj(_firework_2_2);

    m_anim.apply(_9_may_logo, "9may_atlas_Shader_NodetreeAction");

    m_anim.set_first_frame(_9_may_logo);
    m_anim.set_behavior(_9_may_logo, m_anim.AB_FINISH_STOP);

    m_sfx.stop(_fireworks_spk);
    m_sfx.play_def(_fireworks_spk);

    _interval = 0;

    for (var i = 2; i <= _rocket_num + 1; i++)
        action_firework_item(i);
}

function action_firework_item(firework_num) {
    var copy_obj   = m_obj.copy;
    var show_obj   = m_scs.show_object;
    var append_obj = m_scs.append_object;
    var remove_obj = m_scs.remove_object;
    var apply_anim = m_anim.apply;
    var play_anim  = m_anim.play;
    var slot_1     = m_anim.SLOT_1;
    var set_tsr    = m_trans.set_tsr;

    var firework_1_copy   = copy_obj(_firework_1, "firework_" +
                                     firework_num, true);
    var firework_2_1_copy = copy_obj(_firework_2_1, "firework_" +
                                     firework_num + _rocket_num + 1, true);
    var firework_2_2_copy = copy_obj(_firework_2_2, "firework_" +
                                     firework_num + _rocket_num + 2, true);

    show_obj(firework_1_copy);
    show_obj(firework_2_1_copy);
    show_obj(firework_2_2_copy);

    var random_index = Math.floor((Math.random() * random_colors.length))
    var random_color = random_colors[random_index];

    var delta_x = -Math.random() * (MAX_X_OFFSET - MIN_X_OFFSET) + MIN_X_OFFSET;
    var delta_z = Math.random() * (MAX_Z_OFFSET - MIN_Z_OFFSET) + MIN_Z_OFFSET;

    var angle = -Math.random() * (MAX_ANGLE_OFFSET - MIN_ANGLE_OFFSET) +
                MIN_ANGLE_OFFSET;

    m_mat.set_nodemat_rgb(firework_2_1_copy, ["firework_2", "RGB"],
                          random_color[0] / 255, random_color[1] / 255,
                          random_color[2] / 255);

    m_mat.set_nodemat_rgb(firework_2_2_copy, ["firework_2", "RGB"],
                          random_color[0] / 255, random_color[1] / 255,
                          random_color[2] / 255);

    var rand_firework_1_cp_tsr = get_tsr_offset(_firework_1_tsr, delta_x,
                                                0, delta_z, angle, _tsr_tmp);

    var rand_firework_2_cp_tsr = get_tsr_offset(rand_firework_1_cp_tsr,
                                                _firework_offset[0],
                                                firework_num *
                                                FIREWORKS_Y_OFFSET,
                                                _firework_offset[2],
                                                0, _tsr_tmp2);

    set_tsr(firework_1_copy, rand_firework_1_cp_tsr);
    set_tsr(firework_2_1_copy, rand_firework_2_cp_tsr);
    set_tsr(firework_2_2_copy, rand_firework_2_cp_tsr);

    var cb = null;

    if (_rocket_num == firework_num - 1)
        cb = fly_flag;

    m_time.set_timeout(function() {
        append_obj(firework_1_copy);
        append_obj(firework_2_1_copy);
        append_obj(firework_2_2_copy);

        apply_anim(firework_1_copy, "firework_1_Shader_NodetreeAction");
        apply_anim(firework_2_1_copy, "firework_2_Action");
        apply_anim(firework_2_1_copy, "firework_2_Shader_NodetreeAction",
                   slot_1);
        apply_anim(firework_2_2_copy, "firework_2_Action");
        apply_anim(firework_2_2_copy, "firework_2_Shader_NodetreeAction",
                   slot_1);

        play_anim(firework_1_copy, function() {
            remove_obj(firework_1_copy);
        });

        play_anim(firework_2_2_copy);

        play_anim(firework_2_1_copy, function() {
            remove_obj(firework_2_1_copy);
        });

        play_anim(firework_2_2_copy, function() {
            remove_obj(firework_2_2_copy);

            if (cb)
                cb();

        }, slot_1);
    }, _interval);

    // randomize: 0.5-1.5
    _interval += FIREWORKS_INTERVAL * (0.5 + Math.random());
}

function fly_flag() {
    m_sfx.stop(_fireworks_spk);

    m_anim.play(_9_may_logo, show_replay);
}

function show_replay() {
    _replay_circle.addEventListener("click", return_to_begin);

    var replay_style = _replay.style;

    replay_style.opacity = 0;
    replay_style.display = "block";

    var b4w_logo_style = _blend4web_logo.style;

    b4w_logo_style.opacity = 0;
    b4w_logo_style.display = "block";

    var soc_but_style = _social_buttons.style;

    soc_but_style.opacity = 0;
    soc_but_style.display = "block";

    m_app.css_animate(_replay, "opacity", 0, 1, REPLAY_FADE_IN, "", "", function() {
        m_app.css_animate(_blend4web_logo, "opacity", 0, 1, LOGO_FADE_IN);
        m_app.css_animate(_social_buttons, "opacity", 0, 1, SOCIAL_FADE_IN);
    });

    m_anim.apply(_bm_13_Armature, "bm_13_Armature_rotate_-20_Action");
    m_anim.set_behavior(_bm_13_Armature, m_anim.AB_FINISH_STOP);
    m_anim.set_first_frame(_bm_13_Armature);
}

function return_to_begin() {

    _blend4web_logo.style.display = "";
    _social_buttons.style.display = "";
    _replay.style.display         = "";

    m_mat.set_nodemat_value(_control_box, ["control_box", "Value"], 0);

    m_anim.set_first_frame(_cam);

    _replay_circle.removeEventListener("click", return_to_begin);

    _rocket_num = 0;

    m_trans.set_tsr(_cam, _cam_tsr);

    m_trans.set_tsr(_light_point, _light_point_tsr);

    m_lights.set_light_params(_light_point, _light_params);

    m_anim.apply(_cam, _camera_action);

    m_anim.set_first_frame(_control_box);
    m_anim.set_first_frame(_control_box_button);

    m_sfx.play_def(_noise_spk);

    _camera_state = 1;

    open_rocket_box();
}

function get_tsr_offset(origin_tsr, delta_x, delta_y, delta_z, angle, dest) {
    m_tsr.identity(dest);

    var quat         = m_quat.setAxisAngle(m_util.AXIS_MY, angle, _quat_tmp);
    var trans_offset = m_vec3.set(delta_x, delta_y, delta_z, _vec3_tmp);

    m_tsr.set_trans(trans_offset, dest);
    m_tsr.set_quat(quat, dest);

    m_tsr.multiply(origin_tsr, dest, dest);

    return dest;
}

function resize() {
    m_cont.resize_to_container();
    set_camera_action();
}

function preloader_cb(percentage) {
    var preloader_line_left  = _preload_cont.querySelector("#preloader_line_left");
    var preloader_line_right = _preload_cont.querySelector("#preloader_line_right");
    var percentage_display   = _preload_cont.querySelector("#percentage");

    if (percentage == 100) {
        remove_preloader();

        return;
    }

    if (percentage <= 40)
        preloader_line_left.style.width = percentage * 2 + "%";
    else if (percentage > 40 && percentage < 60)
        preloader_line_left.style.width = "100%";
    else if (percentage > 60) {
        preloader_line_left.style.width = "100%";
        preloader_line_right.style.width = (percentage - 50) * 2 + "%";
    }

    percentage_display.innerHTML = percentage;
}

function create_preloader() {
    _preload_cont = document.querySelector("#preloader_container");
    var main_canvas_container = m_cont.get_container();

    var bg_image_container = _preload_cont.querySelector("#bg_image_container");
    var bg_fade_container  = _preload_cont.querySelector("#bg_fade_container");
    var sun_container      = _preload_cont.querySelector("#sun_container");
    var preloader          = _preload_cont.querySelector("#preloader");

    var css_animate = m_app.css_animate;

    css_animate(bg_fade_container, "opacity", 0, 0.6, BG_FADE_OUT);

    css_animate(_preload_cont, "opacity", 0, 1,PRELOAD_CONT_FADE_IN, "", "", function() {
        css_animate(bg_image_container, "opacity", 0, 1, IMAGE_FADE_IN, "", "", function() {
            css_animate(sun_container, "opacity", 0, 1, SUN_FADE_IN, "", "", function() {
                css_animate(preloader, "opacity", 0, 1, PRELOAD_FADE_IN, "", "", function() {
                    m_main.resume();
                    main_canvas_container.style.visibility = "visible";
                })
            })
        })
    });
}

function remove_preloader() {
    show_info();

    m_app.css_animate(_preload_cont, "opacity", 1, 0,
                      REMOVE_PRELOAD_TIME, "", "", function() {
        _preload_cont.parentNode.removeChild(_preload_cont);
    });
}

function show_info() {
    var close_info = _info_container.querySelector("#close_info_but");
    var run_button = _info_container.querySelector("#run_button");
    var info       = _info_container.querySelector("#info");
    var sound_cont  = _info_container.querySelector("#sound_cont");

    m_scs.hide_object(_rocket_start_smoke);
    m_scs.hide_object(_settling_smoke);

    close_info.addEventListener("click", remove_info);
    run_button.addEventListener("click", remove_info);
    sound_cont.addEventListener("click", on_off_sound);

    _info_container.style.display = "block";
    info.style.display            = "block";
    run_button.style.display      = "block";

    init_container_params();
    resize_info();
}

function on_off_sound() {
    var sound_cont = _info_container.querySelector("#sound_cont");

    if (sound_cont.className == "active") {
        sound_cont.className = "";
        m_sfx.mute(null, true);
    } else {
        sound_cont.className = "active";
        m_sfx.mute(null, false);
    }
}

function init_container_params() {
    _start_info_height = _info_container.scrollHeight;
}

function remove_info() {
    var bg_color = document.querySelector("#background_color");

    window.removeEventListener("resize", resize_info);

    m_scs.hide_object(_rocket_start_smoke);
    m_scs.hide_object(_settling_smoke);

    _info_container.parentNode.removeChild(_info_container);
    bg_color.parentNode.removeChild(bg_color);

    run_initial_sounds();
    rotate_camera();
}

function rotate_camera() {
    m_anim.set_speed(_cam, -1);
    m_anim.set_behavior(_cam, m_anim.AB_FINISH_STOP);
    m_anim.play(_cam, open_rocket_box);
}

function run_initial_sounds() {
    var clock_spk = m_scs.get_object_by_dupli_name("red_square", "clock_spk");

    m_sfx.stop(clock_spk);
    m_sfx.stop(_noise_spk);

    m_sfx.play_def(clock_spk);
    m_sfx.play_def(_noise_spk);
}

function open_rocket_box() {
    m_anim.apply(_rockets_box, "opening_rockets_box_Action");
    m_anim.set_first_frame(_rockets_box);
    m_anim.set_behavior(_rockets_box, m_anim.AB_FINISH_STOP);
    m_anim.play(_rockets_box, up_20_degrees);
}

function up_20_degrees() {
    m_anim.apply(_bm_13_Armature, "bm_13_Armature_rotate_-20_Action");
    m_anim.set_first_frame(_bm_13_Armature);
    m_anim.set_behavior(_bm_13_Armature, m_anim.AB_FINISH_STOP);
    m_anim.play(_bm_13_Armature, add_listeners);
}

function add_listeners() {
    _canvas_elem.removeEventListener("mousedown", get_clicked_object);
    _canvas_elem.removeEventListener("touchstart", get_clicked_object);
    _canvas_elem.removeEventListener("mousemove", move_rocket);
    _canvas_elem.removeEventListener("touchmove", move_rocket);
    _canvas_elem.removeEventListener("mouseup", action_rocket);
    _canvas_elem.removeEventListener("touchend", action_rocket);
    document.removeEventListener("mouseout", action_rocket);

    _canvas_elem.addEventListener("mousedown", get_clicked_object);
    _canvas_elem.addEventListener("touchstart", get_clicked_object);
    _canvas_elem.addEventListener("mousemove", move_rocket);
    _canvas_elem.addEventListener("touchmove", move_rocket);
    _canvas_elem.addEventListener("mouseup", action_rocket);
    _canvas_elem.addEventListener("touchend", action_rocket);
    document.addEventListener("mouseout", action_rocket);

    _camera_state = 1;
}

});

b4w.require("victory_day_2015_main").init();
