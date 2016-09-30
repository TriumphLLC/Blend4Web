"use strict"

b4w.register("bone_api", function(exports, require) {

var m_app     = require("app");
var m_data    = require("data");
var m_scs     = require("scenes");
var m_cfg     = require("config");
var m_quat    = require("quat");
var m_armat   = require("armature");
var m_tsr     = require("tsr");
var m_phy     = require("physics");
var m_trans   = require("transform");
var m_vec3    = require("vec3");
var m_util    = require("util");
var m_cam     = require("camera");
var m_version = require("version");

var DEBUG = (m_version.type() === "DEBUG");

var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/bone_api/";
var BONE_SPEED_MULT = 0.005;
var MAX_BONE_SPEED = 15;

var z_dir = new Float32Array([0, 0, 1]);

var _vec3_tmp   = new Float32Array(3);
var _vec3_tmp_2 = new Float32Array(3);
var _quat4_tmp  = new Float32Array(4);
var _tsr8_tmp   = new Float32Array(8);
var _controlled_bone = null;

var _prev_mouse_x = 0;
var _prev_mouse_y = 0;

var _bones_info = {
    "upper_arm.L": null,
    "upper_arm.R": null,
    "spine": null,
}

exports.init = function() {
    m_app.init({
        canvas_container_id: "canvas_cont",
        callback: init_cb,
        show_fps: true,
        autoresize: true,
        assets_dds_available: !DEBUG,
        assets_min50_available: !DEBUG,
        console_verbose: true
    });
}

function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }
    load();

    canvas_elem.addEventListener("mousedown", click_cb, false);
    canvas_elem.addEventListener("mousemove", mousemove_cb, false);

    canvas_elem.addEventListener("mouseup", mouseup_cb, false);
    canvas_elem.addEventListener("mouseout", mouseup_cb, false);
}

function load() {
    m_data.load(APP_ASSETS_PATH + "bone_api.json", load_cb);
}

function load_cb(data_id) {
    m_app.enable_camera_controls();
    init_bones_info();
    apply_physical_constraint();
}

function init_bones_info() {
    var rig = m_scs.get_object_by_name("character_rig");
    var shield = m_scs.get_object_by_name("shield_phy");
    var sword = m_scs.get_object_by_name("sword_phy");
    for (var bone_name in _bones_info) {
        var bone_info = {};
        switch (bone_name) {
        case "upper_arm.R":
            bone_info.min_tsr = m_tsr.from_values(0, 0, 0, 1, -0.451, -0.024, 0.459, 0.765);
            bone_info.max_tsr = m_tsr.from_values(0, 0, 0, 1, 0.715, 0.013, -0.093, 0.693);
            bone_info.phy_objs = [sword];
            bone_info.slider_obj = m_scs.get_object_by_name("control_right_arm");
            break;
        case "upper_arm.L":
            bone_info.min_tsr = m_tsr.from_values(0, 0, 0, 1, -0.316, -0.153, -0.570, 0.743);
            bone_info.max_tsr = m_tsr.from_values(0, 0, 0, 1, 0.509, -0.072, -0.213, 0.831);
            bone_info.phy_objs = [shield];
            bone_info.slider_obj = m_scs.get_object_by_name("control_left_arm");
            break;
        case "spine":
            bone_info.max_tsr = m_tsr.from_values(0, 0, 0, 1, -0.026, 0.402, 0.031, 0.915);
            bone_info.min_tsr = m_tsr.from_values(0, 0, 0, 1, -0.026, -0.441, -0.034, 0.897);
            bone_info.phy_objs = [sword, shield];
            bone_info.slider_obj = m_scs.get_object_by_name("control_body");
            break;
        default:
            break;
        }
        bone_info.base_tsr = m_armat.get_bone_tsr_rel(rig, bone_name);
        m_tsr.set_transcale(bone_info.base_tsr, bone_info.max_tsr);
        m_tsr.set_transcale(bone_info.base_tsr, bone_info.min_tsr);

        bone_info.slider_value = 0;
        _bones_info[bone_name] = bone_info;
    }
}

function apply_physical_constraint() {
    var dummy_body = m_scs.get_object_by_name("training_dummy");
    var ground = m_scs.get_object_by_name("Empty");

    var limits = {};
    limits["use_limit_x"] = true;
    limits["use_limit_y"] = true;
    limits["use_limit_z"] = true;

    limits["use_angular_limit_x"] = true;
    limits["use_angular_limit_y"] = true;
    limits["use_angular_limit_z"] = false;

    limits["limit_max_x"] = 0;
    limits["limit_min_x"] = 0;
    limits["limit_max_y"] = 0;
    limits["limit_min_y"] = 0;
    limits["limit_max_z"] = 0;
    limits["limit_min_z"] = 0;

    limits["limit_angle_max_x"] = 0.5;
    limits["limit_angle_min_x"] = -0.5;
    limits["limit_angle_max_y"] = 0.5;
    limits["limit_angle_min_y"] = -0.5;
    limits["limit_angle_max_z"] = 0.5;
    limits["limit_angle_min_z"] = -0.5;

    var trans_a = [0, 0, -1.1];
    var quat_a = m_quat.create();

    var trans_b = [0, 0, 0];
    var quat_b = m_quat.create();

    m_phy.apply_constraint("GENERIC_6_DOF_SPRING", dummy_body, trans_a, quat_a,
            ground, trans_b, quat_b, limits, [0, 0, 0, 100, 100, 100],
                                             [1, 1, 1, 0.01, 0.01, 0.01]);
}

function click_cb(e) {
    if (e.preventDefault)
        e.preventDefault();

    var x = e.clientX;
    var y = e.clientY;

    var obj = m_scs.pick_object(x, y);

    if (!obj)
        return;

    m_app.disable_camera_controls();

    switch(obj.name) {
    case "control_left_arm":
        _controlled_bone = "upper_arm.L";
        break;

    case "control_right_arm":
        _controlled_bone = "upper_arm.R";
        break;

    case "control_body":
        _controlled_bone = "spine";
        break;

    default:
        break;
    }
}

function mousemove_cb(e) {

    if (!_controlled_bone)
        return;

    var m_x = e.clientX - _prev_mouse_x;
    var m_y = e.clientY - _prev_mouse_y;

    var cam = m_scs.get_active_camera();

    var quat = _quat4_tmp;
    var slider_dir = _vec3_tmp;
    var cam_dir = _vec3_tmp_2;

    var bone_info = _bones_info[_controlled_bone];

    switch(_controlled_bone) {
    case "upper_arm.L":
        var axis = m_util.AXIS_MZ;
        break;
    case "upper_arm.R":
        var axis = m_util.AXIS_Z;
        break;
    case "spine":
        var axis = m_util.AXIS_X;
        break;
    default:
        break;
    }

    m_trans.get_rotation(bone_info.slider_obj, quat);
    m_vec3.transformQuat(axis, quat, slider_dir);
    m_trans.get_rotation(cam, quat);
    m_vec3.transformQuat(m_util.AXIS_MZ, quat, cam_dir);

    var cos_cam_slider = m_vec3.dot(slider_dir, cam_dir);
    m_x *= -cos_cam_slider;

    if (m_x > MAX_BONE_SPEED)
        m_x = MAX_BONE_SPEED;
    else if (m_x < -MAX_BONE_SPEED)
        m_x = -MAX_BONE_SPEED

    move_bone(BONE_SPEED_MULT * m_x);
    _prev_mouse_x = e.clientX;
    _prev_mouse_y = e.clientY;
}

function mouseup_cb() {
    if (_controlled_bone)
        m_app.enable_camera_controls();
    _controlled_bone = null;
}

function move_bone(delta_trans) {

    var bone_info = _bones_info[_controlled_bone];
    var base_tsr = bone_info.base_tsr;
    var max_tsr = bone_info.max_tsr;
    var min_tsr = bone_info.min_tsr;
    var phy_objs = bone_info.phy_objs;
    var slider_val = bone_info.slider_value;

    var rig = m_scs.get_object_by_name("character_rig");

    slider_val += delta_trans;
    slider_val = Math.min(slider_val, 1.0);
    slider_val = Math.max(slider_val, -1.0);

    bone_info.slider_value = slider_val;

    if (slider_val > 0.0)
        var tsr = max_tsr;
    else {
        var tsr = min_tsr;
        slider_val *= -1;
    }

    m_tsr.interpolate(base_tsr, tsr, slider_val, _tsr8_tmp);
    m_armat.set_bone_tsr_rel(rig, _controlled_bone, _tsr8_tmp);

    for (var i = 0; i < phy_objs.length; i++)
        m_phy.sync_transform(phy_objs[i]);
}

});
