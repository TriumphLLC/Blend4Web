/**
 * Copyright (C) 2014-2017 Triumph LLC
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
 * Constraints internal API.
 * @name constraints
 * @namespace
 * @exports exports as constraints
 */
b4w.module["__constraints"] = function(exports, require) {

// (4) Main Engine Entitles
var m_phy   = require("__physics");

var m_armat = require("__armature");
var m_cam   = require("__camera");

// (6) Config-independent utilitary modules
var m_tsr   = require("__tsr");

var m_util  = require("__util");

// (7) Independent libs
var m_quat  = require("__quat");
var m_vec3  = require("__vec3");


var CONS_TYPE_STIFF_OBJ           = 1;
var CONS_TYPE_STIFF_BONE          = 2;
var CONS_TYPE_TRACK_OBJ           = 3;
var CONS_TYPE_FOLLOW_OBJ          = 5;
var CONS_TYPE_STIFF_TRANS_OBJ     = 7;
var CONS_TYPE_COPY_LOC_OBJ        = 8;
var CONS_TYPE_COPY_ROT_OBJ        = 9;
// var CONS_TYPE_COPY_SCALE_OBJ      = 10;
var CONS_TYPE_COPY_TRANS_OBJ      = 11;
var CONS_TYPE_SEMI_STIFF_OBJ      = 12;
var CONS_TYPE_CHILD_OF            = 13;
var CONS_TYPE_CHILD_OF_BONE       = 14;
var CONS_TYPE_SEMI_SOFT_OBJ       = 15;
var CONS_TYPE_STIFF_TRANS_ROT_OBJ = 16;
var CONS_TYPE_STIFF_VIEWPORT      = 17;
var BONE_CONS_TYPE_STIFF_OBJ      = 18;

exports.CONS_TYPE_STIFF_OBJ = CONS_TYPE_STIFF_OBJ;
exports.CONS_TYPE_STIFF_BONE = CONS_TYPE_STIFF_BONE;
exports.CONS_TYPE_TRACK_OBJ = CONS_TYPE_TRACK_OBJ;
exports.CONS_TYPE_FOLLOW_OBJ = CONS_TYPE_FOLLOW_OBJ;
exports.CONS_TYPE_STIFF_TRANS_OBJ = CONS_TYPE_STIFF_TRANS_OBJ;
exports.CONS_TYPE_COPY_LOC_OBJ = CONS_TYPE_COPY_LOC_OBJ;
exports.CONS_TYPE_SEMI_STIFF_OBJ = CONS_TYPE_SEMI_STIFF_OBJ;
exports.CONS_TYPE_CHILD_OF = CONS_TYPE_CHILD_OF;
exports.CONS_TYPE_CHILD_OF_BONE = CONS_TYPE_CHILD_OF_BONE;
exports.CONS_TYPE_SEMI_SOFT_OBJ = CONS_TYPE_SEMI_SOFT_OBJ;
exports.CONS_TYPE_STIFF_TRANS_ROT_OBJ = CONS_TYPE_STIFF_TRANS_ROT_OBJ;
exports.CONS_TYPE_STIFF_VIEWPORT = CONS_TYPE_STIFF_VIEWPORT;

exports.BONE_CONS_TYPE_STIFF_OBJ = BONE_CONS_TYPE_STIFF_OBJ;

var _vec2_tmp   = new Float32Array(2);
var _vec2_tmp_2 = new Float32Array(2);
var _vec3_tmp   = new Float32Array(3);
var _vec3_tmp_2 = new Float32Array(3);
var _vec3_tmp_3 = new Float32Array(3);
var _quat4_tmp  = new Float32Array(4);
var _quat4_tmp2  = new Float32Array(4);
var _tsr_tmp    = m_tsr.create();

var _parent_y_axis = new Float32Array(3);

/**
 * Apply stiff-to-object constraint.
 */
exports.append_stiff_obj = function(obj, obj_parent, offset, rotation_offset, 
        scale_offset) {
    var cons = init_cons(CONS_TYPE_STIFF_OBJ);

    // link to parent object
    cons.obj_parent = obj_parent;
    cons.tsr_offset = m_tsr.create();

    rotation_offset = rotation_offset ? rotation_offset : m_quat.create();

    m_tsr.set_trans(offset, cons.tsr_offset);
    m_tsr.set_scale(scale_offset, cons.tsr_offset);
    m_tsr.set_quat(rotation_offset, cons.tsr_offset);

    cons.tsr_restore = new Float32Array(obj.render.world_tsr);

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

/**
 * Apply stiff-to-bone constraint.
 */
exports.append_stiff_bone = function(obj, armobj, bone_name, offset,
        rotation_offset, scale_offset) {

    var cons = init_cons(CONS_TYPE_STIFF_BONE);

    // link to parent object
    cons.obj_parent = armobj;
    cons.bone_name = bone_name;
    cons.tsr_restore = new Float32Array(obj.render.world_tsr);
    cons.tsr_offset = m_tsr.create();
    m_tsr.set_trans(new Float32Array(offset), cons.tsr_offset);
    m_tsr.set_quat(new Float32Array(rotation_offset), cons.tsr_offset);
    m_tsr.set_scale(scale_offset, cons.tsr_offset);

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

/**
 * Apply semi-stiff-to-object constraint.
 */
exports.append_semi_stiff_obj = function(obj, obj_parent, offset, rotation_offset,
                                        clamp_left, clamp_right, clamp_up, clamp_down) {

    var cons = init_cons(CONS_TYPE_SEMI_STIFF_OBJ);
    var quat = m_tsr.get_quat_view(obj.render.world_tsr);
    var p_quat = m_tsr.get_quat_view(obj_parent.render.world_tsr);

    // override initial rotation for object
    if (rotation_offset) {
        m_quat.copy(rotation_offset, quat);
        m_quat.multiply(p_quat, quat, quat);
    } else
        rotation_offset = m_quat.create();

    // link to parent object
    cons.obj_parent = obj_parent;
    cons.tsr_offset = m_tsr.create();

    m_tsr.set_trans(offset, cons.tsr_offset);
    m_tsr.set_quat(rotation_offset, cons.tsr_offset);
    cons.parent_prev_rotation = new Float32Array(p_quat);

    cons.clamp_left = m_util.angle_wrap_0_2pi(clamp_left);
    cons.clamp_right = m_util.angle_wrap_0_2pi(clamp_right);
    cons.clamp_up = m_util.angle_wrap_periodic(clamp_up, -Math.PI, Math.PI);
    cons.clamp_down = m_util.angle_wrap_periodic(clamp_down, -Math.PI, Math.PI);

    cons.tsr_restore = new Float32Array(obj.render.world_tsr);

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

exports.append_semi_soft_obj = function(obj, obj_parent, offset, softness) {

    var cons = init_cons(CONS_TYPE_SEMI_SOFT_OBJ);

    // link to parent object
    cons.obj_parent = obj_parent;
    cons.softness = softness;
    cons.tsr_restore = new Float32Array(obj.render.world_tsr);
    cons.tsr_offset = m_tsr.create();
    m_tsr.set_trans(new Float32Array(offset), cons.tsr_offset);

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

exports.append_stiff_trans_rot_obj = function(obj, obj_parent, offset, rotation_offset, scale_offset) {

    var cons = init_cons(CONS_TYPE_STIFF_TRANS_ROT_OBJ);

    // link to parent object
    cons.obj_parent = obj_parent;
    cons.tsr_restore = new Float32Array(obj.render.world_tsr);
    cons.tsr_offset = m_tsr.create();
    m_tsr.set_trans(new Float32Array(offset), cons.tsr_offset);
    m_tsr.set_quat(new Float32Array(rotation_offset), cons.tsr_offset);
    m_tsr.set_scale(scale_offset, cons.tsr_offset);

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

function init_cons(type) {

    var cons = {
        // general info
        type : type,
        obj_parent : null,
        target : null,
        // location, scale, rotation
        use_offset : false,
        tsr_restore : null,
        tsr_offset : null,
        euler_offset : null,
        // coordinate axes
        axes : null,
        track_axis : null,
        vertical_axis : null,
        use_target_z : false,
        // another stuff
        influence : 0,
        bone_name : "",
        softness : 0,

        clamp_left: 0,
        clamp_right : 0,
        clamp_up : 0,
        clamp_down : 0,

        dist_min : 0,
        dist_max : 0,

        left_edge: false,
        left_right_dist: 0,
        top_edge: false,
        top_bottom_dist: 0,
        distance: 0,
        hor_units: "",
        vert_units: "",
    };

    return cons;
}

function apply_cons(obj, cons) {

    if (obj.constraint && obj.constraint.obj_parent)
        remove_parent_descendant(obj.constraint.obj_parent, obj);

    if (cons.obj_parent)
        assign_parent_descendant(cons.obj_parent, obj);

    // may override previous
    obj.constraint = cons;
}

function assign_parent_descendant(obj_parent, obj) {
    if (obj_parent.cons_descends.indexOf(obj) == -1)
        obj_parent.cons_descends.push(obj);
    else
        m_util.panic("Descendant object override is forbidden");
}

exports.remove_parent_descendant = remove_parent_descendant;
function remove_parent_descendant(obj_parent, obj) {
    var ind = obj_parent.cons_descends.indexOf(obj);
    if (ind != -1)
        obj_parent.cons_descends.splice(ind, 1);
    else
        m_util.panic("No descendant object");
}

/**
 * Append track-to-object constraint.
 */
exports.append_track_obj = append_track_obj;
function append_track_obj(obj, obj_parent, track_axis, vertical_axis, use_target_z, influence) {
    var cons = init_cons(CONS_TYPE_TRACK_OBJ);
    // link to parent object
    cons.obj_parent = obj_parent;
    cons.track_axis = new Float32Array(track_axis);
    cons.vertical_axis = new Float32Array(vertical_axis);
    cons.use_target_z = use_target_z;
    cons.tsr_restore = new Float32Array(obj.render.world_tsr);
    cons.influence = influence;
    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

/**
 * Append follow object constraint.
 */
exports.append_follow_obj = function(obj, obj_parent, dist_min, dist_max) {
    var cons = init_cons(CONS_TYPE_FOLLOW_OBJ);

    // link to parent object
    cons.obj_parent = obj_parent;
    cons.dist_min = dist_min;
    cons.dist_max = dist_max;
    cons.tsr_restore = new Float32Array(obj.render.world_tsr);

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

/**
 * Apply stiff translation constraint.
 */
exports.append_stiff_trans_obj = function(obj, obj_parent, offset) {
    var cons = init_cons(CONS_TYPE_STIFF_TRANS_OBJ);

    cons.obj_parent = obj_parent;
    cons.tsr_offset = m_tsr.create();
    cons.tsr_restore = new Float32Array(obj.render.world_tsr);
    m_tsr.set_trans(new Float32Array(offset), cons.tsr_offset);

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

/**
 * Apply copy translation constraint.
 */
exports.append_copy_loc_obj = append_copy_loc_obj;
function append_copy_loc_obj(obj, obj_parent, offset, axes, use_offset, influence) {
    var cons = init_cons(CONS_TYPE_COPY_LOC_OBJ);

    cons.obj_parent = obj_parent;
    cons.tsr_offset = m_tsr.create();
    m_tsr.set_trans(offset, cons.tsr_offset);
    cons.axes = new Float32Array(axes);
    cons.influence = influence;
    cons.use_offset = use_offset;
    cons.tsr_restore = new Float32Array(obj.render.world_tsr);

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

exports.append_copy_rot_obj = append_copy_rot_obj;
function append_copy_rot_obj(obj, obj_parent, axes, use_offset, influence) {
    var cons = init_cons(CONS_TYPE_COPY_ROT_OBJ);
    cons.obj_parent = obj_parent;

    var obj_quat = m_tsr.get_quat(obj.render.world_tsr, _quat4_tmp2);
    cons.euler_offset = new Float32Array(3);
    cons.euler_offset[0] = m_util.get_x_rot_from_quat(obj_quat);
    cons.euler_offset[1] = m_util.get_y_rot_from_quat(obj_quat);
    cons.euler_offset[2] = m_util.get_z_rot_from_quat(obj_quat);

    cons.axes = new Float32Array(axes);
    cons.influence = influence;
    cons.use_offset = use_offset;
    cons.tsr_restore = new Float32Array(obj.render.world_tsr);
    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

exports.append_copy_trans_obj = append_copy_trans_obj;
function append_copy_trans_obj(obj, obj_parent, influence) {
    var cons = init_cons(CONS_TYPE_COPY_TRANS_OBJ);

    cons.obj_parent = obj_parent;
    cons.tsr_offset = m_tsr.create();
    m_tsr.copy(obj.render.world_tsr, cons.tsr_offset);
    cons.tsr_restore = new Float32Array(obj.render.world_tsr);

    cons.influence = influence;

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}


/**
 * Append child of constraint.
 */
exports.append_child_of = append_child_of;
function append_child_of(obj, obj_parent, tsr_offset) {
    var cons = init_cons(CONS_TYPE_CHILD_OF);

    cons.obj_parent = obj_parent;
    cons.tsr_offset = new Float32Array(tsr_offset);

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

/**
 * Append child of constraint.
 */
exports.append_child_of_bone = append_child_of_bone;
function append_child_of_bone(obj, armobj, bone_name, tsr_offset) {
    var cons = init_cons(CONS_TYPE_CHILD_OF_BONE);

    cons.obj_parent = armobj;
    cons.bone_name = bone_name;
    cons.tsr_offset = new Float32Array(tsr_offset);

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

exports.append_stiff_viewport = append_stiff_viewport;
function append_stiff_viewport(obj, camobj, positioning) {
    var cons = init_cons(CONS_TYPE_STIFF_VIEWPORT);

    cons.obj_parent = camobj;
    cons.tsr_restore = new Float32Array(obj.render.world_tsr);
    cons.tsr_offset = m_tsr.create();

    if (m_util.isdef(positioning.right)) {
        cons.left_edge = false;
        cons.left_right_dist = positioning.right;
    } else if (m_util.isdef(positioning.left)) {
        cons.left_edge = true;
        cons.left_right_dist = positioning.left;
    } else {
        cons.left_edge = true;
        cons.left_right_dist = 0;
    }

    if (m_util.isdef(positioning.bottom)) {
        cons.top_edge = false;
        cons.top_bottom_dist = positioning.bottom;
    } else if (m_util.isdef(positioning.top)) {
        cons.top_edge = true;
        cons.top_bottom_dist = positioning.top;
    } else {
        cons.top_edge = true;
        cons.top_bottom_dist = 0;
    }

    if (m_util.isdef(positioning.distance)) {
        cons.distance = positioning.distance;
    } else {
        cons.distance = 0;
    }

    if (m_util.isdef(positioning.rotation))
        var rotation_offset = new Float32Array(positioning.rotation);
    else
        var rotation_offset = m_quat.create();
    m_tsr.set_quat(rotation_offset, cons.tsr_offset);

    if (m_util.isdef(positioning.hor_units))
        cons.hor_units = positioning.hor_units;
    else
        cons.hor_units = "widths";

    if (m_util.isdef(positioning.vert_units))
        cons.vert_units = positioning.vert_units;
    else
        cons.vert_units = "heights";

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

/**
 * Executed frequently.
 */
exports.update_constraint = function(obj, elapsed) {
    if (obj.constraint)
        update_cons(obj, obj.constraint, elapsed);
}

/**
 * Only trans/quat affected by constraint here
 */
function update_cons(obj, cons, elapsed) {
    switch (cons.type) {
    case CONS_TYPE_STIFF_OBJ:
        m_tsr.multiply(cons.obj_parent.render.world_tsr, cons.tsr_offset, obj.render.world_tsr);
        break;
    case CONS_TYPE_SEMI_STIFF_OBJ:

        var trans = m_tsr.get_trans_view(obj.render.world_tsr);
        var quat = m_tsr.get_quat_view(obj.render.world_tsr);

        var offset = m_tsr.get_trans(cons.tsr_offset, _vec3_tmp);

        var p_world_tsr = cons.obj_parent.render.world_tsr;
        var p_quat = m_tsr.get_quat_view(cons.obj_parent.render.world_tsr);

        // Qp * Qp_prev_inv * Q
        m_quat.multiply(
                m_quat.invert(cons.parent_prev_rotation, cons.parent_prev_rotation),
                quat, quat);
        m_quat.multiply(p_quat, quat, quat);

        m_tsr.transform_vec3(offset, p_world_tsr, trans);
        m_quat.copy(p_quat, cons.parent_prev_rotation);
        clamp_orientation(obj, cons);
        break;
    case CONS_TYPE_SEMI_SOFT_OBJ:

        var trans          = m_tsr.get_trans_view(obj.render.world_tsr);
        var quat           = m_tsr.get_quat_view(obj.render.world_tsr);
        var p_world_tsr    = cons.obj_parent.render.world_tsr;
        var p_trans        = m_tsr.get_trans_view(p_world_tsr);
        var softness       = cons.softness;
        var trans_pivot    = _vec3_tmp;
        var quat_pivot     = m_quat.copy(quat, _quat4_tmp);
        var softness_ratio = 0.16;
        var offset         = m_tsr.get_trans(cons.tsr_offset, _vec3_tmp_2);

        m_tsr.transform_vec3(offset, p_world_tsr, trans_pivot);
        m_util.smooth_v(trans_pivot, trans, elapsed, softness, trans);

        m_util.quat_rotate_to_target(trans, quat_pivot, p_trans, m_util.AXIS_MZ);
        m_util.smooth_q(quat_pivot, quat, elapsed, softness * softness_ratio, quat);

        break;
    case CONS_TYPE_STIFF_BONE:
        var quat = m_tsr.get_quat_view(obj.render.world_tsr);
        var p_tsr = _tsr_tmp;

        var offset = m_tsr.get_trans(cons.tsr_offset, _vec3_tmp_2);
        var scale_offset = m_tsr.get_scale(cons.tsr_offset);
        var rotation_offset = m_tsr.get_quat(cons.tsr_offset, _quat4_tmp);

        m_armat.get_bone_tsr(cons.obj_parent, cons.bone_name, true, false,
                             p_tsr);
        // from armature to world space
        m_tsr.multiply(cons.obj_parent.render.world_tsr, p_tsr, p_tsr);

        quat[0] = p_tsr[4];
        quat[1] = p_tsr[5];
        quat[2] = p_tsr[6];
        quat[3] = p_tsr[7];

        m_quat.multiply(quat, rotation_offset, quat);
        m_tsr.set_scale(scale_offset * p_tsr[3], obj.render.world_tsr);

        var trans = m_tsr.get_trans_view(obj.render.world_tsr);
        m_tsr.transform_vec3(offset, p_tsr, trans);

        break;
    case CONS_TYPE_TRACK_OBJ:
        var trans = m_tsr.get_trans_view(obj.render.world_tsr);
        var quat = m_tsr.get_quat_view(obj.render.world_tsr);
        var t_trans = m_tsr.get_trans_view(cons.obj_parent.render.world_tsr);
        var f = cons.influence;

        if (cons.use_target_z) {
            var t_quat = m_tsr.get_quat(cons.obj_parent.render.world_tsr, _quat4_tmp);
            var target_axis = m_vec3.transformQuat(m_util.AXIS_Z, t_quat, _vec3_tmp);
        } else
            var target_axis = m_util.AXIS_Z;
        m_util.quat_rotate_to_target(trans, quat, t_trans, cons.track_axis);
        var dir = m_vec3.subtract(t_trans, trans, _vec3_tmp_2);
        m_vec3.normalize(dir, dir);
        m_util.quat_set_vertical_axis(quat, cons.vertical_axis, target_axis, dir);
        var o_quat = m_tsr.get_quat(cons.tsr_restore, _quat4_tmp);
        m_quat.slerp(o_quat, quat, f, quat);

        m_tsr.set_trans(trans, cons.tsr_restore);
        break;

    case CONS_TYPE_FOLLOW_OBJ:
        var trans = m_tsr.get_trans_view(obj.render.world_tsr);
        var quat = m_tsr.get_quat_view(obj.render.world_tsr);
        var t_trans = m_tsr.get_trans_view(cons.obj_parent.render.world_tsr);

        m_util.quat_rotate_to_target(trans, quat, t_trans, m_util.AXIS_MZ);

        // shrink distance
        var dist = m_vec3.dist(trans, t_trans);

        // passing target location
        if (dist > cons.dist_max)
            var delta = dist - cons.dist_max;
        else if (dist < cons.dist_min)
            var delta = dist - cons.dist_min;
        else
            var delta = 0.0;

        if (delta) {
            // NOTE: from trans to t_trans
            m_vec3.sub(t_trans, trans, _vec3_tmp);
            m_vec3.normalize(_vec3_tmp, _vec3_tmp);
            m_vec3.scale(_vec3_tmp, delta, _vec3_tmp);
            m_vec3.add(trans, _vec3_tmp, trans);
        }

        break;
    case CONS_TYPE_STIFF_TRANS_OBJ:
        var p_world_tsr = cons.obj_parent.render.world_tsr;
        var trans = m_tsr.get_trans_view(obj.render.world_tsr);
        var offset = m_tsr.get_trans(cons.tsr_offset, _vec3_tmp);
        m_tsr.transform_vec3(offset, p_world_tsr, trans);

        m_tsr.set_quat(m_tsr.get_quat_view(obj.render.world_tsr), cons.tsr_restore);
        break;
    case CONS_TYPE_COPY_LOC_OBJ:
        var p_trans = m_tsr.get_trans_view(cons.obj_parent.render.world_tsr);
        var trans = m_tsr.get_trans_view(obj.render.world_tsr);
        var axes = cons.axes;

        var def_offset = m_tsr.get_trans(cons.tsr_offset, _vec3_tmp);
        var offset = m_vec3.set(0, 0, 0, _vec3_tmp_2);
        if (cons.use_offset)
            m_vec3.add(offset, def_offset, offset);
        var f = cons.influence;
        if (axes[0])
            trans[0] = (1 - f) * def_offset[0] + f * (m_util.sign(axes[0]) * p_trans[0] + offset[0]);
        if (axes[1])
            trans[1] = (1 - f) * def_offset[1] + f * (m_util.sign(axes[1]) * p_trans[1] + offset[1]);
        if (axes[2])
            trans[2] = (1 - f) * def_offset[2] + f * (m_util.sign(axes[2]) * p_trans[2] + offset[2]);

        m_tsr.set_quat(m_tsr.get_quat_view(obj.render.world_tsr), cons.tsr_restore);
        break;
    case CONS_TYPE_COPY_ROT_OBJ:
        var axes = cons.axes;
        var offset = m_vec3.set(0, 0, 0, _vec3_tmp);
        var angles = m_vec3.copy(cons.euler_offset, _vec3_tmp_3);
        // NOTE: cons.euler_offset is default object's world euler angles
        if (cons.use_offset)
            m_vec3.add(offset, cons.euler_offset, offset);

        var p_quat = m_tsr.get_quat_view(cons.obj_parent.render.world_tsr);
        var p_euler = _vec3_tmp_2;
        p_euler[0] = m_util.get_x_rot_from_quat(p_quat);
        p_euler[1] = m_util.get_y_rot_from_quat(p_quat);
        p_euler[2] = m_util.get_z_rot_from_quat(p_quat);

        if (axes[0])
            angles[0] = m_util.sign(axes[0]) * (p_euler[0] + offset[0]);
        else
            angles[0] = cons.euler_offset[0];
        if (axes[1])
            angles[1] = m_util.sign(axes[1]) * (p_euler[1] + offset[1]);
        else
            angles[1] = cons.euler_offset[1];
        if (axes[2])
            angles[2] = m_util.sign(axes[2]) * (p_euler[2] + offset[2]);
        else
            angles[2] = cons.euler_offset[2];

        m_util.compatible_euler(angles, cons.euler_offset);
        var f = cons.influence;
        var target_quat = m_util.euler_to_quat(angles, _quat4_tmp);
        var obj_quat = m_tsr.get_quat(cons.tsr_restore, _quat4_tmp2);
        m_quat.slerp(obj_quat, target_quat, f, m_tsr.get_quat_view(obj.render.world_tsr));

        m_tsr.set_trans(m_tsr.get_trans_view(obj.render.world_tsr), cons.tsr_restore);
        break;
    case CONS_TYPE_COPY_TRANS_OBJ:
        var f = cons.influence;
        var p_trans = m_tsr.get_trans(cons.obj_parent.render.world_tsr, _vec3_tmp);
        var p_quat = m_tsr.get_quat(cons.obj_parent.render.world_tsr, _quat4_tmp);
        var o_trans = m_tsr.get_trans(cons.tsr_offset, _vec3_tmp_2);
        var o_quat = m_tsr.get_quat(cons.tsr_offset, _quat4_tmp2);
        m_util.blend_arrays(o_trans, p_trans, f, m_tsr.get_trans_view(obj.render.world_tsr));
        m_quat.slerp(o_quat, p_quat, f, m_tsr.get_quat_view(obj.render.world_tsr));

        m_tsr.set_trans(m_tsr.get_trans_view(obj.render.world_tsr), cons.tsr_restore);
        break;
    case CONS_TYPE_STIFF_TRANS_ROT_OBJ:

        var quat = m_tsr.get_quat_view(obj.render.world_tsr);

        var p_world_tsr = cons.obj_parent.render.world_tsr;
        var p_quat = m_tsr.get_quat_view(cons.obj_parent.render.world_tsr);

        var offset = m_tsr.get_trans(cons.tsr_offset, _vec3_tmp_2);
        // var scale_offset = m_tsr.get_scale(cons.tsr_offset);
        var rotation_offset = m_tsr.get_quat(cons.tsr_offset, _quat4_tmp);

        m_quat.multiply(p_quat, rotation_offset, quat);

        var trans = m_tsr.get_trans_view(obj.render.world_tsr);
        m_tsr.transform_vec3(offset, p_world_tsr, trans);
        break;
    case CONS_TYPE_CHILD_OF:
        var prender = cons.obj_parent.render;
        var render = obj.render;

        m_tsr.multiply(prender.world_tsr, cons.tsr_offset, render.world_tsr);
        break;
    case CONS_TYPE_CHILD_OF_BONE:

        var tsr_offset = cons.tsr_offset;
        var p_tsr = _tsr_tmp;

        m_armat.get_bone_tsr(cons.obj_parent, cons.bone_name, true, false,
                             p_tsr);
        // from armature to world space
        m_tsr.multiply(cons.obj_parent.render.world_tsr, p_tsr, p_tsr);

        m_tsr.multiply(p_tsr, tsr_offset, obj.render.world_tsr);

        break;
    case CONS_TYPE_STIFF_VIEWPORT:
        var camobj = cons.obj_parent;
        var cam = m_cam.get_first_cam(camobj);

        var trans = m_tsr.get_trans_view(obj.render.world_tsr);

        var left = m_cam.get_edge(cam, "LEFT");
        var right = m_cam.get_edge(cam, "RIGHT");
        var top = m_cam.get_edge(cam, "TOP");
        var bottom = m_cam.get_edge(cam, "BOTTOM");

        if (cons.hor_units == "heights")
            var hor_stride = top - bottom;
        else
            var hor_stride = right - left;

        if (cons.left_edge)
            trans[0] = left + hor_stride * cons.left_right_dist;
        else
            trans[0] = right - hor_stride * cons.left_right_dist;

        if (cons.vert_units == "heights")
            var vert_stride = top - bottom;
        else
            var vert_stride = right - left;

        // in the camera's view space
        if (cons.top_edge)
            trans[1] = top - vert_stride * cons.top_bottom_dist;
        else
            trans[1] = bottom + vert_stride * cons.top_bottom_dist;

        // NOTE: ortho cameras have scaling problems
        if (m_cam.is_ortho(cam)) {
            trans[2] = -cons.distance;
        } else {
            trans[2] = -1;
            m_vec3.normalize(trans, trans);
            var scale = cons.distance/Math.abs(trans[2]);
            m_vec3.scale(trans, scale, trans);
        }

        m_tsr.transform_dir_vec3(trans, camobj.render.world_tsr, trans);
        var cam_trans = m_tsr.get_trans_view(camobj.render.world_tsr);
        m_vec3.add(cam_trans, trans, trans);

        var obj_quat = m_tsr.get_quat_view(obj.render.world_tsr);
        var cam_quat = m_tsr.get_quat_view(camobj.render.world_tsr);

        var rotation_offset = m_tsr.get_quat(cons.tsr_offset, _quat4_tmp2);
        m_quat.multiply(cam_quat, rotation_offset, obj_quat);

        break;
    default:
        break;
    }

    if (obj.render.type == "CAMERA" && obj.render.move_style != m_cam.MS_STATIC) {
        var corr_axis = obj.render.vertical_axis;
        if (cons.type == CONS_TYPE_SEMI_STIFF_OBJ) {
            var p_quat = m_tsr.get_quat_view(cons.obj_parent.render.world_tsr);
            corr_axis = m_vec3.transformQuat(corr_axis, p_quat, _parent_y_axis);
        }
        // the m_cam.correct_up calls update_camera_upside_down, is the followong code line necessary?
        m_cam.update_camera_upside_down(obj);
        m_cam.correct_up(obj, corr_axis);
    }
}

/**
 * Apply stiff-bone-to-object constraint.
 */
function append_stiff_bone_to_obj(armobj, obj, bone_name, offset,
        rotation_offset, scale_offset) {

    var cons = init_cons(BONE_CONS_TYPE_STIFF_OBJ);

    cons.bone_name = bone_name;
    cons.target = obj;
    cons.tsr_offset = m_tsr.create();
    m_tsr.set_trans(new Float32Array(offset), cons.tsr_offset);
    m_tsr.set_quat(new Float32Array(rotation_offset), cons.tsr_offset);
    m_tsr.set_scale(scale_offset, cons.tsr_offset);

    apply_bone_cons(armobj, cons);
    update_bone_cons(armobj, cons);
}

function apply_bone_cons(armobj, cons) {
    var target = cons.target;
    var bone_name = cons.bone_name;
    var bone_pointer = armobj.render.bone_pointers[bone_name];

    remove_arm_bone_descendant(target, armobj, bone_name);
    target.cons_armat_bone_descends.push([armobj, bone_name]);
    bone_pointer.constraint = cons;
}

function remove_arm_bone_descendant(obj, armobj, bone_name) {
    var cons_armat_bone_descends = obj.cons_armat_bone_descends
    for (var i = 0; i < cons_armat_bone_descends; i++) {
        var cons_desc = cons_armat_bone_descends[i];
        if (cons_desc[0] == armobj && cons_desc[1] == bone_name) {
            cons_armat_bone_descends.splice(i, 1)
            return;
        }
    }
}

exports.update_bone_constraint = function(armobj, bone_name) {
    var bone_pointer = armobj.render.bone_pointers[bone_name];
    if (bone_pointer.constraint)
        update_bone_cons(armobj, bone_pointer.constraint);
}

function update_bone_cons(armobj, cons) {
    switch (cons.type) {
    case BONE_CONS_TYPE_STIFF_OBJ:
        var target_obj = cons.target;
        var target_tsr = target_obj.render.world_tsr;
        var armobj_tsr = armobj.render.world_tsr;

        var b_tsr = _tsr_tmp;
        m_tsr.invert(armobj_tsr, b_tsr);
        m_tsr.multiply(b_tsr, target_tsr, b_tsr);

        m_armat.set_bone_tsr(armobj, cons.bone_name, b_tsr, false);
        break;
    default:
        break;
    }
    armobj.need_update_transform = true;
}

/**
 * uses _vec2_tmp, _vec2_tmp_2, _quat4_tmp
 */
function clamp_orientation(obj, cons) {

    var quat = m_tsr.get_quat_view(obj.render.world_tsr);
    var p_quat = m_tsr.get_quat_view(cons.obj_parent.render.world_tsr);
    var rotation_offset = m_tsr.get_quat(cons.tsr_offset, _quat4_tmp2);

    var quat_base = m_quat.multiply(p_quat, rotation_offset, _quat4_tmp);
    var base_angles = m_cam.get_camera_angles_from_quat(quat_base, _vec2_tmp);
    var curr_angles = m_cam.get_camera_angles_from_quat(quat, _vec2_tmp_2);
    
    var d_phi = m_util.calc_returning_angle(curr_angles[0], 
            base_angles[0] + cons.clamp_right, base_angles[0] + cons.clamp_left);
    var d_theta = m_util.calc_returning_angle(curr_angles[1], 
            base_angles[1] + cons.clamp_down, base_angles[1] + cons.clamp_up);
    m_util.rotate_quat(quat, obj.render.vertical_axis, d_phi, d_theta, quat);
}

exports.check_constraint = function(obj) {
    if (obj.constraint)
        return true;
    else
        return false;
}
/**
 * Remove object constraint
 */
exports.remove = function(obj, restore_transform) {
    if (obj.constraint.obj_parent)
        remove_parent_descendant(obj.constraint.obj_parent, obj);
    if (restore_transform) 
        m_tsr.copy(obj.constraint.tsr_restore, obj.render.world_tsr);
    obj.constraint = null;
}

/**
 * Get constraint type or null
 */
exports.get_type = function(obj) {
    if (obj.constraint)
        return obj.constraint.type;
    else
        return null;
}

exports.has_child_of = function(obj) {
    var cons = obj.constraint;

    if (cons && (cons.type == CONS_TYPE_CHILD_OF || 
            cons.type == CONS_TYPE_CHILD_OF_BONE))
        return true;
    else
        return false;
}

/**
 * Do not change returned value.
 */
exports.get_child_of_parent_tsr = function(obj) {
    var cons = obj.constraint;

    if (cons && cons.type == CONS_TYPE_CHILD_OF) {
        return cons.obj_parent.render.world_tsr;
    } else if (cons && cons.type == CONS_TYPE_CHILD_OF_BONE) {
        var p_tsr = _tsr_tmp;
        m_armat.get_bone_tsr(cons.obj_parent, cons.bone_name, true, false,
                             p_tsr);
        // from armature to world space
        m_tsr.multiply(cons.obj_parent.render.world_tsr, p_tsr, p_tsr);
        return p_tsr;
    } else
        return null;
}

/**
 * Get link to child-of TSR offset vector or null.
 */
exports.get_child_of_offset = function(obj) {
    var cons = obj.constraint;

    if (cons && (cons.type == CONS_TYPE_CHILD_OF || 
            cons.type == CONS_TYPE_CHILD_OF_BONE))
        return cons.tsr_offset;
    else
        return null;
}

exports.prepare_object_relations = function(bpy_obj, obj) {
    var render = obj.render;
    for (var i = 0; i < bpy_obj["constraints"].length; i++) {
        var bpy_constraint = bpy_obj["constraints"][i];
        var const_type = bpy_constraint["type"];
        // NOTE: temporary solution for old JSONs
        if (!bpy_constraint["target"])
            continue;
        var target_obj = bpy_constraint["target"]._object;
        if (const_type == "COPY_LOCATION") {
            var obj_pos_w = new Float32Array(m_tsr.get_trans_view(obj.render.world_tsr));
            var axes = new Float32Array(bpy_constraint["axes"]);
            append_copy_loc_obj(obj, target_obj, obj_pos_w, axes,
                    bpy_constraint["use_offset"], bpy_constraint["influence"]);
        } else if (const_type == "COPY_ROTATION") {
            var axes = new Float32Array(bpy_constraint["axes"]);
            append_copy_rot_obj(obj, target_obj, axes,
                    bpy_constraint["use_offset"], bpy_constraint["influence"]);
        } else if (const_type == "COPY_TRANSFORMS") {
            append_copy_trans_obj(obj, target_obj, bpy_constraint["influence"]);
        } else if (const_type == "TRACK_TO") {

            var track_axis_name = bpy_constraint["track_axis"];
            if (track_axis_name == "TRACK_Y")
                var track_axis = m_util.AXIS_Y;
            else if (track_axis_name == "TRACK_NEGATIVE_Y")
                var track_axis = m_util.AXIS_MY;
            else if (track_axis_name == "TRACK_X")
                var track_axis = m_util.AXIS_X;
            else if (track_axis_name == "TRACK_NEGATIVE_X")
                var track_axis = m_util.AXIS_MX;
            else if (track_axis_name == "TRACK_Z")
                var track_axis = m_util.AXIS_Z;
            else if (track_axis_name == "TRACK_NEGATIVE_Z")
                var track_axis = m_util.AXIS_MZ;

            var up_axis_name = bpy_constraint["up_axis"];
            if (up_axis_name == "UP_X")
                var up_axis = m_util.AXIS_X;
            else if (up_axis_name == "UP_Y")
                var up_axis = m_util.AXIS_Y;
            else if (up_axis_name == "UP_Z")
                var up_axis = m_util.AXIS_Z;

            var axes = new Float32Array([bpy_constraint["influence"]]);
            append_track_obj(obj, target_obj, track_axis, up_axis,
                    bpy_constraint["use_target_z"], axes);
        }
    }

    if (obj.parent) {

        // disable object physics on collision compound children 
        // they are just additional shapes for top level parent
        if (!obj.parent_is_dupli &&
                obj.physics_settings.use_collision_compound &&
                obj.parent.physics_settings.use_collision_compound)
            obj.use_obj_physics = false;

        var scenes_have_phy = false;
        for (var i = 0; i < obj.scenes_data.length; i++)
            if (obj.scenes_data[i].scene._physics) {
                scenes_have_phy = true;
                break;
            }
        if (scenes_have_phy && m_phy.has_dynamic_settings(obj)) {
            if (obj.parent_is_dupli)
                var offset = m_tsr.copy(render.world_tsr, m_tsr.create());
            else
                var offset = render.world_tsr;
            m_tsr.multiply(obj.parent.render.world_tsr, offset, render.world_tsr);
        } else if (obj.parent_is_dupli || !obj.parent_bone) {
            // get offset from render before child-of constraint being applied
            var offset = m_tsr.copy(render.world_tsr, m_tsr.create());

            // second condition is for cases when direct parenting is disabled
            // due to obj parent group mismatch
            if (obj.viewport_alignment && obj.parent.type == "CAMERA") {
                var positioning = {
                    distance: obj.viewport_alignment.distance,
                    rotation: m_tsr.get_quat_view(offset)
                }

                switch (obj.viewport_alignment.alignment) {
                case "TOP_LEFT":
                    positioning.top = 0;
                    positioning.left = 0;
                    break;
                case "TOP":
                    positioning.top = 0;
                    positioning.left = 0.5;
                    break;
                case "TOP_RIGHT":
                    positioning.top = 0;
                    positioning.right = 0;
                    break;
                case "LEFT":
                    positioning.top = 0.5;
                    positioning.left = 0;
                    break;
                case "CENTER":
                    positioning.top = 0.5;
                    positioning.left = 0.5;
                    break;
                case "RIGHT":
                    positioning.top = 0.5;
                    positioning.right = 0;
                    break;
                case "BOTTOM_LEFT":
                    positioning.bottom = 0;
                    positioning.left = 0;
                    break;
                case "BOTTOM":
                    positioning.bottom = 0;
                    positioning.left = 0.5;
                    break;
                case "BOTTOM_RIGHT":
                    positioning.bottom = 0;
                    positioning.right = 0;
                    break;
                }
                append_stiff_viewport(obj, obj.parent, positioning);
            } else
                append_child_of(obj, obj.parent, offset);
        } else {
            var offset = m_tsr.copy(render.world_tsr, m_tsr.create());
            append_child_of_bone(obj, obj.parent, obj.parent_bone,
                    offset);
        }
    }
    if (obj.type == "ARMATURE") {
        var pose_bones = bpy_obj["pose"]["bones"];
        for (var i = 0; i < pose_bones.length; i++) {
            var pose_bone = pose_bones[i];
            var constraints = pose_bone["constraints"];
            if (constraints)
                for (var j = 0; j < constraints.length; j++) {
                    var cons = constraints[j];
                    if (cons["type"] != "COPY_TRANSFORMS" || cons["subtarget"] || cons["mute"])
                        continue;

                    var target_obj = cons["target"]._object;
                    append_stiff_bone_to_obj(obj, target_obj, pose_bone["name"],
                                                    m_util.VEC3_IDENT,
                                                    m_util.QUAT4_IDENT, 1);
                }
        }
    }
}

}
