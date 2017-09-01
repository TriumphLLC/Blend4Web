"use strict"

b4w.register("leap", function(exports, require) {

var m_anim      = require("animation");
var m_app       = require("app");
var m_arm       = require("armature");
var m_camera    = require("camera");
var m_cfg       = require("config");
var m_cons      = require("constraints");
var m_cont      = require("container");
var m_ctl       = require("controls");
var m_data      = require("data");
var m_mat3      = require("mat3");
var m_mat4      = require("mat4");
var m_phys      = require("physics");
var m_preloader = require("preloader");
var m_quat      = require("quat");
var m_scenes    = require("scenes");
var m_trans     = require("transform");
var m_tsr       = require("tsr");
var m_util      = require("util");
var m_vec3      = require("vec3");
var m_ver       = require("version");

var _mat3_tmp = m_mat3.create();
var _mat4_tmp = m_mat4.create();
var _quat_tmp = m_quat.create();
var _quat_tmp2 = m_quat.create();
var _tsr_tmp = m_tsr.create();
var _tsr_tmp2 = m_tsr.create();
var _tsr_tmp3 = m_tsr.create();
var _vec3_tmp = m_vec3.create();
var _vec3_tmp2 = m_vec3.create();

var _vec3_tmp3 = m_vec3.create();
var _vec3_tmp4 = m_vec3.create();
var _vec3_tmp5 = m_vec3.create();

var _switch_hand_button = null;
var _is_rigged_hand = false;
var _rig_l = null;
var _rig_r = null;

var _finger_names = ["thumb", "index", "middle", "ring", "pinky"];
var _bone_names = ["metacarpal", "proximal", "middle", "distal"];

var _is_picking_left = false;
var _is_picking_right = false;

var _objects = {};

var MM_TO_M = 1 / 1000;

var _hands_dimension_scale_factor = 10;
var MIN_DIMENSION_SCALE_FACTOR = 7;
var MAX_DIMENSION_SCALE_FACTOR = 20;
var _init_cam_dist = 0;
var _HANDS_ZOOM_FACTOR = 2.0;
var _last_dist_between_hands = -1;

function calc_fact_from(fact_to) {
    return fact_to / (1 - fact_to);
}

var DEBUG = (m_ver.type() === "DEBUG");

var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/leap";

exports.init = function() {
    m_app.init({
        canvas_container_id: "main_canvas_container",
        callback: init_cb,
        physics_enabled: true,
        show_fps: true,
        alpha: false,
        gl_debug: true,
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

    var controls_container = document.createElement("div");
    controls_container.id = "controls_container";

    _switch_hand_button = create_button("Rigged hand");

    _switch_hand_button.addEventListener("click", function() {
        change_hand_cb(!_is_rigged_hand);
    });

    controls_container.appendChild(_switch_hand_button);

    var container = m_cont.get_container();
    container.appendChild(controls_container);

    load();
}

function change_hand_cb(is_rigged_hand) {
    _is_rigged_hand = is_rigged_hand;
    _switch_hand_button.innerText = _is_rigged_hand ? "Primitive hand": "Rigged hand";
}

function load() {
    m_data.load(APP_ASSETS_PATH + "/leap.json", load_cb);
}

function create_button(caption) {
    var button = document.createElement("a");

    button.className = "btn";
    button.innerText = caption;

    return button;
}

function get_mat_trans(y, z, dest) {
    if (m_vec3.length(y) == 0) {
        y[2] = 1;
    }

    m_vec3.normalize(y, y);

    var axis_x = m_vec3.cross(y, z, _vec3_tmp3);
    if (m_vec3.length(axis_x) == 0) {
        if (Math.abs(z[2]) == 1) {
            y[0] += 0.0001;
        } else {
            y[2] += 0.0001;
        }
        m_vec3.normalize(y, y);
        axis_x = m_vec3.cross(y, z, _vec3_tmp4);
    }

    m_vec3.normalize(axis_x, axis_x);
    var axis_z = m_vec3.cross(axis_x, y, _vec3_tmp5);
    dest[ 0 ] = axis_x[0];
    dest[ 1 ] = axis_x[1];
    dest[ 2 ] = axis_x[2];
    dest[ 4 ] = y[0];
    dest[ 5 ] = y[1];
    dest[ 6 ] = y[2];
    dest[ 8 ] = axis_z[0];
    dest[ 9 ] = axis_z[1];
    dest[ 10 ] = axis_z[2];
    return dest;
};

function to_b4w_coords(vec, dest) {
    var a = vec[2];
    dest[0] = vec[0];
    dest[2] = vec[1];
    dest[1] = -a;
    return dest;
}

function hide_not_detected_hands(hands) {
    var need_hide_l = true;
    var need_hide_r = true;

    for (var i = 0; i < hands.length; i++) {
        var hand = hands[i];
        var type = hand.type;

        if (type == "left")
            need_hide_l = false;

        if (type == "right")
            need_hide_r = false;
    }

    var hands = [".L",".R"];
    for (var i = 0; i < hands.length; i++) {
        var cyber_hand_parent = m_scenes.get_object_by_name("cyber_hand" + hands[i]);
        var human_hand_parent = m_scenes.get_object_by_name("human_hand" + hands[i]);

        var need_hide = hands[i] == ".L"  && need_hide_l ||
                hands[i] == ".R" && need_hide_r;

        if (need_hide) {
            var hum_index = m_scenes.get_object_by_name("human.index.distal" + hands[i]);
            m_phys.disable_simulation(hum_index);
            var cyb_index = m_scenes.get_object_by_name("index.distal" + hands[i]);
            m_phys.disable_simulation(cyb_index);

            m_scenes.hide_object(cyber_hand_parent);
            m_scenes.hide_object(human_hand_parent);
        } else {
            var hidden_hand = !_is_rigged_hand ?
                    human_hand_parent:
                    cyber_hand_parent;
            m_scenes.hide_object(hidden_hand);

            if (!_is_rigged_hand) {
                var cyb_index = m_scenes.get_object_by_name("index.distal" + hands[i]);
                m_phys.enable_simulation(cyb_index);
            } else {
                var hum_index = m_scenes.get_object_by_name("human.index.distal" + hands[i]);
                m_phys.enable_simulation(hum_index);
            }

            var showed_hand = _is_rigged_hand ?
                    human_hand_parent:
                    cyber_hand_parent;
            m_scenes.show_object(showed_hand);
        }
    }
}

/**
 * callback executed when the scene data is loaded
 */
function load_cb(data_id, success) {

    if (!success) {
        console.log("b4w load failure");
        return;
    }

    m_app.enable_camera_controls();

    _rig_l = m_scenes.get_object_by_name("metarig.l");
    _rig_r = m_scenes.get_object_by_name("metarig.r");
    var cam = m_scenes.get_active_camera();
    _init_cam_dist = m_camera.target_get_distance(cam);

    pickup_objs();
    interact_with_buttons();

    Leap.loop(function(frame){
        var hands = frame.hands;
        update_zoom_factor(hands);
        update_hands_position(hands);
        update_camera_position(hands);
        hide_not_detected_hands(hands);
    });
}

function interact_with_buttons() {
    function interact_cb(obj, id, pulse) {
        if (pulse > 0 && !m_anim.is_play(obj)) {
            m_anim.set_frame(obj, 0);
            m_anim.play(obj);

            var obj_name = m_scenes.get_object_name(obj);
            // red button --- primitive hand
            // green button --- rigged hand
            change_hand_cb(obj_name == "green_button");
        }
    }

    var buttons_names = [
        "red_button",
        "green_button"
    ];
    for (var i = 0; i < buttons_names.length; i++) {
        var button_name = buttons_names[i];

        var button = m_scenes.get_object_by_name(button_name);

        m_anim.apply_def(button);
        m_anim.set_behavior(button, m_anim.AB_FINISH_STOP);

        var col_s = m_ctl.create_collision_sensor(button, "FINGER");
        m_ctl.create_sensor_manifold(button, "INTERACT" + button_name, m_ctl.CT_POSITIVE,
            [col_s], null, interact_cb);
    }
}

function get_tsr_rel(obj, parent, dest) {
    var picked_tsr = m_trans.get_tsr(obj, _tsr_tmp2);
    var cont_tsr = m_trans.get_tsr(parent, _tsr_tmp3);
    var cont_tsr_inv = m_tsr.invert(cont_tsr, _tsr_tmp3);

    dest = m_tsr.multiply(cont_tsr_inv, picked_tsr, dest);
    return dest;
}

var _picking_data = [];
function get_pick_data_by_picker(picker) {
    for (var i = 0; i < _picking_data.length; i++) {
        if (_picking_data[i].picker === picker) {
            return _picking_data[i];
        }
    }
}

function pickup_objs() {
    function pickup_cb(obj, id, pulse) {
        var data = get_pick_data_by_picker(obj);
        if (_is_picking_left && data.type == "left" ||
                _is_picking_right && data.type == "right") {
            if (pulse > 0 && !data.picked_obj) {
                if (m_ctl.get_sensor_value(obj, id, 0)) {
                    var coll_obj = m_ctl.get_sensor_payload(obj, id, 0).coll_obj;
                    m_phys.disable_simulation(coll_obj);
                    console.log(coll_obj, obj, _tsr_tmp)
                    var local_tsr = get_tsr_rel(coll_obj, obj, _tsr_tmp);
                    m_cons.append_stiff(coll_obj, obj,
                            m_tsr.get_trans_view(local_tsr),
                            m_tsr.get_quat_view(local_tsr),
                            1 / _hands_dimension_scale_factor);

                    var data = get_pick_data_by_picker(obj);
                    data.picked_obj = coll_obj;
                }
            }
        } else {
            if (data.picked_obj) {
                m_phys.enable_simulation(data.picked_obj);
                m_cons.remove(data.picked_obj);

                // apply velosity to object after release
                var elapsed = m_ctl.get_sensor_value(obj, id, 1);
                var position = m_trans.get_translation(data.picked_obj, _vec3_tmp);
                var delta_trans = m_vec3.subtract(position, data.position, _vec3_tmp);
                var velocity = m_vec3.scale(delta_trans, 1 / elapsed, delta_trans);
                m_phys.apply_velocity_world(data.picked_obj,
                        velocity[0], velocity[1], velocity[2]);
                data.picked_obj = null;
            }
        }
    }

    // save position of picked object to apply velocity after release
    function update_position_cb(data, id, pulse) {
        if (data.picked_obj) {
            var position = m_trans.get_translation(data.picked_obj, _vec3_tmp);
            m_vec3.copy(position, data.position);
        }
    }

    // NOTE: register only 2 hands: right, left.
    var bone_name_suffs = [".L", ".R"];
    var type_name_prefs = ["index.distal", "human.index.distal"]
    for (var i = 0; i < bone_name_suffs.length; i++) {
        var bone_name_suff = bone_name_suffs[i];
        for (var j = 0; j < type_name_prefs.length; j++) {
            var type_name_pref = type_name_prefs[j];
            var pick_data = {
                type: bone_name_suff == ".L" ? "left": "right",
                hand: null,
                picker: m_scenes.get_object_by_name(type_name_pref + bone_name_suff),
                picked_obj: null,
                position: m_vec3.create()
            };
            _picking_data.push(pick_data);

            var elapsed_s = m_ctl.create_elapsed_sensor();
            var picker = pick_data.picker;
            var col_s = m_ctl.create_collision_sensor(picker, "PICKUP");
            m_ctl.create_sensor_manifold(picker,
                "COLLISION" + type_name_pref + bone_name_suff, m_ctl.CT_CONTINUOUS,
                [col_s, elapsed_s], m_ctl.default_OR_logic_fun, pickup_cb);

            m_ctl.create_sensor_manifold(pick_data,
                "UPDATE_PICKED_OBJECT_POSITION" + type_name_pref + bone_name_suff,
                m_ctl.CT_CONTINUOUS, [elapsed_s], null, update_position_cb);
        }
    }
}

function update_zoom_factor(hands) {
    var is_zooming = hands.length > 1;
    for (var i = 0; i < hands.length; i++) {
        var hand = hands[i];

        if (hand.type == "left")
            _is_picking_left = hand.pinchStrength > 0.5;
        else
            _is_picking_right = hand.pinchStrength > 0.5;
        is_zooming &= hand.pinchStrength > 0.5;
    }

    if (is_zooming) {
        if (_last_dist_between_hands < 0) {
            _last_dist_between_hands = m_vec3.dist(hands[0].palmPosition, hands[1].palmPosition) / 1000;
        } else {
            var cur_dist_between_hands = m_vec3.dist(hands[0].palmPosition, hands[1].palmPosition) / 1000;
            var delta = (cur_dist_between_hands - _last_dist_between_hands) * _HANDS_ZOOM_FACTOR;
            if (delta > 0)
                _hands_dimension_scale_factor *= 1 - delta;
            else
                _hands_dimension_scale_factor *= 1 - calc_fact_from(delta);
            _hands_dimension_scale_factor = m_util.clamp(
                    _hands_dimension_scale_factor,
                    MIN_DIMENSION_SCALE_FACTOR,
                    MAX_DIMENSION_SCALE_FACTOR);
            _last_dist_between_hands = cur_dist_between_hands;
        }
    } else {
        _last_dist_between_hands = -1;
    }
}

function update_camera_position(hands) {
    var cam = m_scenes.get_active_camera();
    m_camera.target_set_distance(cam, _init_cam_dist * _hands_dimension_scale_factor / 10);

    if (hands.length > 1) {
        var normal = hands[0].palmNormal;
        var is_focus = hands.every(function(hand) {
            return hand.pinchStrength < 0.1 && m_vec3.dot(normal, hand.palmNormal) > 0.9;
        });

        if (is_focus) {
            var hand_pos = hands.reduce(function(acc, hand) {
                return m_vec3.add(acc, hand.palmPosition, _vec3_tmp);
            }, _vec3_tmp);
            m_vec3.scale(hand_pos, 1 / hands.length, hand_pos);
            m_vec3.normalize(hand_pos, hand_pos);

            var cam_pos = to_b4w_coords(hand_pos, _vec3_tmp);
            m_vec3.scale(cam_pos,
                    _init_cam_dist * _hands_dimension_scale_factor / 10, cam_pos);
            m_trans.set_translation_v(cam, cam_pos);
        }
    }
}

function update_hands_position(hands) {
    for (var i = 0; i < hands.length; i++) {
        var hand = hands[i];
        var type = hand.type;
        if (type == "left") {
            var rig = _rig_l;
            var bone_name_suff = ".L";
        } else {
            var rig = _rig_r;
            var bone_name_suff = ".R";
        }

        if (_is_rigged_hand) {
            var arm_trans = _vec3_tmp;
            to_b4w_coords(hand.palmPosition, arm_trans);
            m_vec3.scale(arm_trans, MM_TO_M * _hands_dimension_scale_factor, arm_trans);

            var arm_mat = m_mat4.fromTranslation(arm_trans, _mat4_tmp);
            var hand_normal = m_vec3.scale(hand.palmNormal, -1, _vec3_tmp2);
            arm_mat = get_mat_trans(
                    to_b4w_coords(hand.direction, _vec3_tmp),
                    to_b4w_coords(hand_normal, _vec3_tmp2),
                    arm_mat);
            m_trans.set_matrix(rig, arm_mat);
            m_trans.set_scale(rig, _hands_dimension_scale_factor);

            var arm_quat = m_trans.get_rotation(rig, _quat_tmp);
            var arm_inv_quat = m_quat.invert(arm_quat, _quat_tmp);
        }

        var fingers = hand.fingers;
        for (var j = 0; j < fingers.length; j++) {
            var finger = fingers[j];
            var finger_name = _finger_names[finger.type];

            var bones = finger.bones;
            for (var k = 0; k < bones.length; k++) {
                var bone = bones[k];
                var bone_name = _bone_names[bone.type];

                if (bone_name === "metacarpal" && finger_name === "thumb")
                   continue;

                var full_name = finger_name + "." + bone_name;

                var bone_mat4 = bone.matrix();
                var mat3 = m_mat3.fromMat4(bone_mat4, _mat3_tmp);
                var bone_tsr = _tsr_tmp;
                var bone_trans = m_tsr.get_trans_view(bone_tsr);
                var bone_quat = m_tsr.get_quat_view(bone_tsr);

                var quat;
                if (_is_rigged_hand) {
                    if (bone_name === "metacarpal")
                       continue;

                    m_arm.get_bone_tsr(rig, full_name + bone_name_suff, bone_tsr);

                    m_quat.fromMat3(mat3, bone_quat);
                    quat = m_quat.setAxisAngle(m_util.AXIS_X, -Math.PI / 2, _quat_tmp2);
                    m_quat.multiply(bone_quat, quat, bone_quat);
                    quat = m_quat.setAxisAngle(m_util.AXIS_X, Math.PI / 2, _quat_tmp2);
                    m_quat.multiply(quat, bone_quat, bone_quat);

                    m_quat.multiply(arm_inv_quat, bone_quat, bone_quat);

                    m_arm.set_bone_tsr(rig, full_name + bone_name_suff, bone_tsr);
                } else {
                    m_quat.fromMat3(mat3, bone_quat);
                    quat = m_quat.setAxisAngle(m_util.AXIS_X, -Math.PI / 2, _quat_tmp2);
                    m_quat.multiply(bone_quat, quat, bone_quat);
                    quat = m_quat.setAxisAngle(m_util.AXIS_X, Math.PI / 2, _quat_tmp2);
                    m_quat.multiply(quat, bone_quat, bone_quat);

                    m_vec3.copy([bone_mat4[3],bone_mat4[7],bone_mat4[11]], bone_trans)
                    m_vec3.scale(bone_trans, MM_TO_M, bone_trans);
                    m_vec3.scale(bone_trans, _hands_dimension_scale_factor, bone_trans);
                    m_vec3.transformQuat(bone_trans, quat, bone_trans);

                    m_tsr.set_scale(_hands_dimension_scale_factor, bone_tsr);

                    var obj = m_scenes.get_object_by_name(full_name + bone_name_suff);
                    m_trans.set_tsr(obj, bone_tsr);
                }
            }
        }
    }

    // NOTE: it will be removed until engine supports physics bone parenting.
    if (_is_rigged_hand) {
        var h_index_r = m_scenes.get_object_by_name("human.index.distal.R");
        m_phys.sync_transform(h_index_r);
        var h_index_l = m_scenes.get_object_by_name("human.index.distal.L");
        m_phys.sync_transform(h_index_l);
    }
}

});

