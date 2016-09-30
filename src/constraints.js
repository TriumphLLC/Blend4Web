/**
 * Copyright (C) 2014-2016 Triumph LLC
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

var m_armat = require("__armature");
var m_cam   = require("__camera");
var m_mat3  = require("__mat3");
var m_print = require("__print");
var m_quat  = require("__quat");
var m_tsr   = require("__tsr");
var m_util  = require("__util");
var m_vec3  = require("__vec3");

var CONS_TYPE_STIFF_OBJ           = 1;
var CONS_TYPE_STIFF_BONE          = 2;
var CONS_TYPE_TRACK_OBJ           = 3;
var CONS_TYPE_TRACK_POINT         = 4;
var CONS_TYPE_FOLLOW_OBJ          = 5;
var CONS_TYPE_FOLLOW_POINT        = 6;
var CONS_TYPE_STIFF_TRANS_OBJ     = 7;
var CONS_TYPE_COPY_TRANS_OBJ      = 8;
var CONS_TYPE_SEMI_STIFF_OBJ      = 9;
var CONS_TYPE_SEMI_STIFF_CAM_OBJ  = 10;
var CONS_TYPE_CHILD_OF            = 11;
var CONS_TYPE_CHILD_OF_BONE       = 12;
var CONS_TYPE_SEMI_SOFT_CAM_OBJ   = 13;
var CONS_TYPE_STIFF_TRANS_ROT_OBJ = 14;
var CONS_TYPE_STIFF_VIEWPORT      = 15;

var BONE_CONS_TYPE_STIFF_OBJ = 1;

exports.CONS_TYPE_STIFF_OBJ = CONS_TYPE_STIFF_OBJ;
exports.CONS_TYPE_STIFF_BONE = CONS_TYPE_STIFF_BONE;
exports.CONS_TYPE_TRACK_OBJ = CONS_TYPE_TRACK_OBJ;
exports.CONS_TYPE_TRACK_POINT = CONS_TYPE_TRACK_POINT;
exports.CONS_TYPE_FOLLOW_OBJ = CONS_TYPE_FOLLOW_OBJ;
exports.CONS_TYPE_FOLLOW_POINT = CONS_TYPE_FOLLOW_POINT;
exports.CONS_TYPE_STIFF_TRANS_OBJ = CONS_TYPE_STIFF_TRANS_OBJ;
exports.CONS_TYPE_COPY_TRANS_OBJ = CONS_TYPE_COPY_TRANS_OBJ;
exports.CONS_TYPE_SEMI_STIFF_OBJ = CONS_TYPE_SEMI_STIFF_OBJ;
exports.CONS_TYPE_SEMI_STIFF_CAM_OBJ = CONS_TYPE_SEMI_STIFF_CAM_OBJ;
exports.CONS_TYPE_CHILD_OF = CONS_TYPE_CHILD_OF;
exports.CONS_TYPE_CHILD_OF_BONE = CONS_TYPE_CHILD_OF_BONE;
exports.CONS_TYPE_SEMI_SOFT_CAM_OBJ = CONS_TYPE_SEMI_SOFT_CAM_OBJ;
exports.CONS_TYPE_STIFF_TRANS_ROT_OBJ = CONS_TYPE_STIFF_TRANS_ROT_OBJ;
exports.CONS_TYPE_STIFF_VIEWPORT = CONS_TYPE_STIFF_VIEWPORT;

exports.BONE_CONS_TYPE_STIFF_OBJ = BONE_CONS_TYPE_STIFF_OBJ;

var _vec2_tmp   = new Float32Array(2);
var _vec2_tmp_2 = new Float32Array(2);
var _vec3_tmp   = new Float32Array(3);
var _vec3_tmp_2 = new Float32Array(3);
var _vec3_tmp_3 = new Float32Array(3);
var _vec4_tmp   = new Float32Array(4);
var _quat4_tmp  = new Float32Array(4);
var _mat3_tmp   = new Float32Array(9);
var _mat3_tmp2  = new Float32Array(9);
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
    cons.offset = new Float32Array(offset);
    cons.rotation_offset =
            rotation_offset ? new Float32Array(rotation_offset) : null;
    cons.scale_offset = scale_offset;

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
    cons.offset = new Float32Array(offset);
    cons.rotation_offset =
            rotation_offset ? new Float32Array(rotation_offset) : null;
    cons.scale_offset = scale_offset;

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

/**
 * Apply semi-stiff-to-object constraint.
 */
exports.append_semi_stiff_obj = function(obj, obj_parent, offset, rotation_offset) {

    var cons = init_cons(CONS_TYPE_SEMI_STIFF_OBJ);
    var quat = m_tsr.get_quat_view(obj.render.world_tsr);
    var p_quat = m_tsr.get_quat_view(obj_parent.render.world_tsr);

    // link to parent object
    cons.obj_parent = obj_parent;
    cons.offset = new Float32Array(offset);

    cons.parent_prev_rotation = new Float32Array(p_quat);

    // override initial rotation for object
    if (rotation_offset) {
        m_quat.copy(rotation_offset, quat);
        m_quat.multiply(p_quat, quat, quat);
    }

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

/**
 * Apply semi-stiff-to-object constraint with camera rotation clamping.
 */
exports.append_semi_stiff_cam_obj = function(obj, obj_parent, offset,
                                             rotation_offset, clamp_left,
                                             clamp_right, clamp_up, clamp_down) {

    var cons = init_cons(CONS_TYPE_SEMI_STIFF_CAM_OBJ);
    var quat = m_tsr.get_quat_view(obj.render.world_tsr);
    var p_quat = m_tsr.get_quat_view(obj_parent.render.world_tsr);

    // link to parent object
    cons.obj_parent = obj_parent;
    cons.offset = new Float32Array(offset);
    cons.parent_prev_rotation = new Float32Array(p_quat);

    cons.clamp_left = m_util.angle_wrap_0_2pi(clamp_left);
    cons.clamp_right = m_util.angle_wrap_0_2pi(clamp_right);
    cons.clamp_up = m_util.angle_wrap_periodic(clamp_up, -Math.PI, Math.PI);
    cons.clamp_down = m_util.angle_wrap_periodic(clamp_down, -Math.PI, Math.PI);

    if (rotation_offset) {
        cons.rotation_offset = new Float32Array(rotation_offset);

        // override initial rotation for object
        m_quat.copy(rotation_offset, quat);
        m_quat.multiply(p_quat, quat, quat);
    } else
        cons.rotation_offset = m_quat.create();

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

exports.append_semi_soft_cam_obj = function(obj, obj_parent, offset, softness) {

    var cons = init_cons(CONS_TYPE_SEMI_SOFT_CAM_OBJ);

    // link to parent object
    cons.obj_parent = obj_parent;
    cons.offset = new Float32Array(offset);
    cons.softness = softness;

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

exports.append_stiff_trans_rot_obj = function(obj, obj_parent, offset, rotation_offset, scale_offset) {

    var cons = init_cons(CONS_TYPE_STIFF_TRANS_ROT_OBJ);

    // link to parent object
    cons.obj_parent = obj_parent;
    cons.offset = new Float32Array(offset);
    cons.scale_offset = scale_offset || 1;

    cons.rotation_offset =
            rotation_offset ? new Float32Array(rotation_offset) : null;

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

function init_cons(type) {

    var cons = {};
    cons.type = type;

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
exports.append_track_obj = function(obj, obj_parent) {
    var cons = init_cons(CONS_TYPE_TRACK_OBJ);

    // link to parent object
    cons.obj_parent = obj_parent;
    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}
/**
 * Append track-to-point constraint.
 */
exports.append_track_point = function(obj, target) {
    var cons = init_cons(CONS_TYPE_TRACK_POINT);

    cons.target = new Float32Array(target);
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

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}
/**
 * Append follow point constraint.
 */
exports.append_follow_point = function(obj, target, dist_min, dist_max) {
    var cons = init_cons(CONS_TYPE_FOLLOW_POINT);

    cons.target = new Float32Array(target);
    cons.dist_min = dist_min;
    cons.dist_max = dist_max;

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

/**
 * Apply stiff translation constraint.
 */
exports.append_stiff_trans_obj = function(obj, obj_parent, offset) {
    var cons = init_cons(CONS_TYPE_STIFF_TRANS_OBJ);

    cons.obj_parent = obj_parent;
    cons.offset = new Float32Array(offset);

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

/**
 * Apply copy translation constraint.
 */
exports.append_copy_trans_obj = function(obj, obj_parent, offset) {
    var cons = init_cons(CONS_TYPE_COPY_TRANS_OBJ);

    cons.obj_parent = obj_parent;
    cons.offset = new Float32Array(offset);

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

/**
 * Append child of constraint.
 */
exports.append_child_of = function(obj, obj_parent, tsr_offset) {
    var cons = init_cons(CONS_TYPE_CHILD_OF);

    cons.obj_parent = obj_parent;
    cons.tsr_offset = new Float32Array(tsr_offset);

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

/**
 * Append child of constraint.
 */
exports.append_child_of_bone = function(obj, armobj, bone_name, tsr_offset) {
    var cons = init_cons(CONS_TYPE_CHILD_OF_BONE);

    cons.obj_parent = armobj;
    cons.bone_name = bone_name;
    cons.tsr_offset = new Float32Array(tsr_offset);

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

exports.append_stiff_viewport = function(obj, camobj, positioning) {
    var cons = init_cons(CONS_TYPE_STIFF_VIEWPORT);

    cons.obj_parent = camobj;

    if (m_util.isdef(positioning.left)) {
        cons.left_edge = true;
        cons.left_right_dist = positioning.left;
    } else if (m_util.isdef(positioning.right)) {
        cons.left_edge = false;
        cons.left_right_dist = positioning.right;
    } else {
        m_print.error("append_stiff_viewport: Wrong positioning params");
        return;
    }

    if (m_util.isdef(positioning.top)) {
        cons.top_edge = true;
        cons.top_bottom_dist = positioning.top;
    } else if (m_util.isdef(positioning.bottom)) {
        cons.top_edge = false;
        cons.top_bottom_dist = positioning.bottom;
    } else {
        m_print.error("append_stiff_viewport: Wrong positioning params");
        return;
    }

    if (m_util.isdef(positioning.distance)) {
        cons.distance = positioning.distance;
    } else {
        m_print.error("append_stiff_viewport: Wrong positioning params");
        return;
    }

    if (m_util.isdef(positioning.rotation))
        cons.rotation_offset = new Float32Array(positioning.rotation);
    else
        cons.rotation_offset = null;

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

        var quat = m_tsr.get_quat_view(obj.render.world_tsr);

        var p_world_tsr = cons.obj_parent.render.world_tsr;
        var p_quat = m_tsr.get_quat_view(cons.obj_parent.render.world_tsr);

        if (cons.rotation_offset) {
            m_quat.copy(cons.rotation_offset, quat);
            m_quat.multiply(p_quat, quat, quat);
        } else
            m_quat.copy(p_quat, quat);

        var trans = m_tsr.transform_vec3(cons.offset, p_world_tsr, _vec3_tmp);
        m_tsr.set_trans(trans, obj.render.world_tsr);
        var p_scale = m_tsr.get_scale(cons.obj_parent.render.world_tsr);
        m_tsr.set_scale(cons.scale_offset * p_scale, obj.render.world_tsr);

        break;
    case CONS_TYPE_SEMI_STIFF_OBJ:


        var trans = m_tsr.get_trans_view(obj.render.world_tsr);
        var quat = m_tsr.get_quat_view(obj.render.world_tsr);

        var p_world_tsr = cons.obj_parent.render.world_tsr;
        var p_quat = m_tsr.get_quat_view(cons.obj_parent.render.world_tsr);

        // Qp * Qp_prev_inv * Q
        m_quat.multiply(
                m_quat.invert(cons.parent_prev_rotation, cons.parent_prev_rotation),
                quat, quat);
        m_quat.multiply(p_quat, quat, quat);

        m_tsr.transform_vec3(cons.offset, p_world_tsr, trans);
        m_quat.copy(p_quat, cons.parent_prev_rotation);

        break;
    case CONS_TYPE_SEMI_STIFF_CAM_OBJ:

        var trans = m_tsr.get_trans_view(obj.render.world_tsr);
        var quat = m_tsr.get_quat_view(obj.render.world_tsr);

        var p_world_tsr = cons.obj_parent.render.world_tsr;
        var p_quat = m_tsr.get_quat_view(cons.obj_parent.render.world_tsr);

        // Qp * Qp_prev_inv * Q
        m_quat.multiply(
                m_quat.invert(cons.parent_prev_rotation, cons.parent_prev_rotation),
                quat, quat);
        m_quat.multiply(p_quat, quat, quat);

        m_tsr.transform_vec3(cons.offset, p_world_tsr, trans);
        m_quat.copy(p_quat, cons.parent_prev_rotation)

        clamp_orientation(obj, cons);

        break;
    case CONS_TYPE_SEMI_SOFT_CAM_OBJ:

        var trans          = m_tsr.get_trans_view(obj.render.world_tsr);
        var quat           = m_tsr.get_quat_view(obj.render.world_tsr);
        var p_world_tsr    = cons.obj_parent.render.world_tsr;
        var p_trans        = m_tsr.get_trans_view(p_world_tsr);
        var softness       = cons.softness;
        var trans_pivot    = _vec3_tmp;
        var quat_pivot     = _quat4_tmp;
        var softness_ratio = 0.16;

        m_tsr.transform_vec3(cons.offset, p_world_tsr, trans_pivot);

        m_util.smooth_v(trans_pivot, trans, elapsed, softness, trans);

        var dir_to_obj = _vec3_tmp;
        m_vec3.sub(p_trans, trans, dir_to_obj);
        m_vec3.normalize(dir_to_obj, dir_to_obj);
        cam_rotate_to(quat, dir_to_obj, quat_pivot);
        m_util.smooth_q(quat_pivot, quat, elapsed, softness * softness_ratio, quat);

        break;
    case CONS_TYPE_STIFF_BONE:
        var quat = m_tsr.get_quat_view(obj.render.world_tsr);
        var p_tsr = _tsr_tmp;

        m_armat.get_bone_tsr(cons.obj_parent, cons.bone_name, true, false,
                             p_tsr);
        // from armature to world space
        m_tsr.multiply(cons.obj_parent.render.world_tsr, p_tsr, p_tsr);

        quat[0] = p_tsr[4];
        quat[1] = p_tsr[5];
        quat[2] = p_tsr[6];
        quat[3] = p_tsr[7];

        if (cons.rotation_offset) {
            m_quat.copy(cons.rotation_offset, quat);
            m_quat.multiply(quat, cons.rotation_offset, quat);
        }

        m_tsr.set_scale(cons.scale_offset * p_tsr[3], obj.render.world_tsr);

        var trans = m_tsr.get_trans_view(obj.render.world_tsr);
        m_tsr.transform_vec3(cons.offset, p_tsr, trans);

        break;
    case CONS_TYPE_TRACK_OBJ:
        var trans = m_tsr.get_trans_view(obj.render.world_tsr);
        var quat = m_tsr.get_quat_view(obj.render.world_tsr);
        var t_trans = m_tsr.get_trans_view(cons.obj_parent.render.world_tsr);

        rotate_to(trans, quat, t_trans);
        break;
    case CONS_TYPE_TRACK_POINT:
        var trans = m_tsr.get_trans_view(obj.render.world_tsr);
        var quat = m_tsr.get_quat_view(obj.render.world_tsr);
        var t_trans = cons.target;

        rotate_to(trans, quat, t_trans);
        break;

    case CONS_TYPE_FOLLOW_OBJ:
        var trans = m_tsr.get_trans_view(obj.render.world_tsr);
        var quat = m_tsr.get_quat_view(obj.render.world_tsr);
        var t_trans = m_tsr.get_trans_view(cons.obj_parent.render.world_tsr);

        rotate_to(trans, quat, t_trans);

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
    case CONS_TYPE_FOLLOW_POINT:
        var trans = m_tsr.get_trans_view(obj.render.world_tsr);
        var quat = m_tsr.get_quat_view(obj.render.world_tsr);
        var t_trans = cons.target;

        rotate_to(trans, quat, t_trans);

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
        m_tsr.transform_vec3(cons.offset, p_world_tsr, trans);
        break;
    case CONS_TYPE_COPY_TRANS_OBJ:
        var p_trans = m_tsr.get_trans_view(cons.obj_parent.render.world_tsr);
        var trans = m_tsr.get_trans_view(obj.render.world_tsr);
        m_vec3.add(p_trans, cons.offset, trans);
        break;
    case CONS_TYPE_STIFF_TRANS_ROT_OBJ:

        var quat = m_tsr.get_quat_view(obj.render.world_tsr);

        var p_world_tsr = cons.obj_parent.render.world_tsr;
        var p_quat = m_tsr.get_quat_view(cons.obj_parent.render.world_tsr);

        if (cons.rotation_offset) {
            m_quat.copy(cons.rotation_offset, quat);
            m_quat.multiply(p_quat, quat, quat);
        } else
            m_quat.copy(p_quat, quat);
        var trans = m_tsr.get_trans_view(obj.render.world_tsr);
        m_tsr.transform_vec3(cons.offset, p_world_tsr, trans);
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

        if (cons.left_edge) {
            var left = m_cam.get_edge(cam, "LEFT");
            trans[0] = left + hor_stride * cons.left_right_dist;
        } else {
            var right = m_cam.get_edge(cam, "RIGHT");
            trans[0] = right - hor_stride * cons.left_right_dist;
        }

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

        if (cons.rotation_offset) {
            m_quat.copy(cons.rotation_offset, obj_quat);
            m_quat.multiply(cam_quat, obj_quat, obj_quat);
        } else
            m_quat.copy(cam_quat, obj_quat);

        break;
    default:
        break;
    }

    if (obj.render.type == "CAMERA") {
        var corr_axis = obj.render.vertical_axis;
        if (cons.type == CONS_TYPE_SEMI_STIFF_CAM_OBJ) {
            var p_quat = m_tsr.get_quat_view(cons.obj_parent.render.world_tsr);
            corr_axis = m_vec3.transformQuat(corr_axis, p_quat, _parent_y_axis);
        }

        m_cam.update_camera_upside_down(obj);
        correct_up(obj, corr_axis);
    }
}

/**
 * Apply stiff-bone-to-object constraint.
 */
exports.append_stiff_bone_to_obj = function(armobj, obj, bone_name, offset,
        rotation_offset, scale_offset) {

    var cons = init_cons(BONE_CONS_TYPE_STIFF_OBJ);
    var bone_pointer = armobj.render.bone_pointers[bone_name];

    cons.bone_name = bone_name;
    cons.target = obj;
    cons.offset = new Float32Array(offset);
    cons.rotation_offset =
            rotation_offset ? new Float32Array(rotation_offset) : null;
    cons.scale_offset = scale_offset;

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

    var quat_base = m_quat.multiply(p_quat, cons.rotation_offset, _quat4_tmp);
    var base_angles = m_cam.get_camera_angles_from_quat(quat_base, _vec2_tmp);
    var curr_angles = m_cam.get_camera_angles_from_quat(quat, _vec2_tmp_2);

    var d_phi = m_util.calc_returning_angle(curr_angles[0], 
            base_angles[0] + cons.clamp_right, base_angles[0] + cons.clamp_left);
    var d_theta = m_util.calc_returning_angle(curr_angles[1], 
            base_angles[1] + cons.clamp_down, base_angles[1] + cons.clamp_up);
    m_cam.rotate_eye_camera(obj, d_phi, d_theta);
}

/**
 * Apply rotation to quat
 */
exports.rotate_to = rotate_to;
function rotate_to(trans, quat, target) {
    var dir_from = _vec3_tmp;
    m_util.quat_to_dir(quat, m_util.AXIS_MZ, dir_from);
    m_vec3.normalize(dir_from, dir_from);

    var dir_to = _vec3_tmp_2;
    m_vec3.subtract(target, trans, dir_to);
    m_vec3.normalize(dir_to, dir_to);

    var rotation = m_util.rotation_to_stable(dir_from, dir_to, _vec4_tmp);

    m_quat.multiply(rotation, quat, quat);
    m_quat.normalize(quat, quat);
}

/**
 * Fix camera rotation on target.
 * uses _mat3_tmp, _mat3_tmp2
 */
function cam_rotate_to(quat, dir, dest) {
    // convenient to use 3x3 matrix
    var mat_dst = _mat3_tmp;

    var x_cam_world = mat_dst.subarray(0, 3);
    var y_cam_world = mat_dst.subarray(3, 6);
    var z_cam_world = mat_dst.subarray(6, 9);

    m_vec3.copy(dir, z_cam_world);
    m_vec3.negate(z_cam_world, z_cam_world);
    m_vec3.normalize(z_cam_world, z_cam_world);

    var up_down = Boolean(Math.abs(m_vec3.dot(dir, m_util.AXIS_Z)) > 0.999999);

    if (up_down) {
        var mat_src = m_mat3.fromQuat(m_quat.normalize(quat, dest), _mat3_tmp2);
        m_vec3.copy(mat_src.subarray(0, 3), x_cam_world);
    } else
        m_vec3.cross(m_util.AXIS_Z, z_cam_world, x_cam_world);

    m_vec3.normalize(x_cam_world, x_cam_world);

    m_vec3.cross(z_cam_world, x_cam_world, y_cam_world);
    m_vec3.normalize(y_cam_world, y_cam_world);

    m_quat.fromMat3(mat_dst, dest);
    m_quat.normalize(dest, dest);
}

exports.correct_up = correct_up;
/**
 * Rotate camera to fix UP direction.
 * Uses _vec3_tmp, _vec3_tmp_2, _vec3_tmp_3
 */
function correct_up(camobj, up_axis, strict) {
    var render = camobj.render;
    var quat = m_tsr.get_quat_view(render.world_tsr);

    // local camera Z in world space
    var z_cam_world = m_util.quat_to_dir(quat, m_util.AXIS_Z, _vec3_tmp)
    m_vec3.normalize(z_cam_world, z_cam_world);
    // handle extreme case (camera looks UP or DOWN)
    if (Math.abs(m_vec3.dot(up_axis, z_cam_world)) > 0.999999)
        var rotation = m_quat.identity(_quat4_tmp);
    else {

        var x_cam_world_new = m_vec3.cross(up_axis, z_cam_world, _vec3_tmp_2);

        m_vec3.normalize(x_cam_world_new, x_cam_world_new);

        if (render.move_style == m_cam.MS_TARGET_CONTROLS) {
            if (render.target_cam_upside_down)
                m_vec3.negate(x_cam_world_new, x_cam_world_new);
        } else {
            // Y coord of local camera Z axis in parent(!) space
            var my_cam_world = m_util.quat_to_dir(quat, m_util.AXIS_MY, _vec3_tmp_3);
            if (m_vec3.dot(my_cam_world, up_axis) > 0)
                m_vec3.negate(x_cam_world_new, x_cam_world_new);
        }

        var x_cam_world = m_util.quat_to_dir(quat, m_util.AXIS_X, _vec3_tmp_3);
        m_vec3.normalize(x_cam_world, x_cam_world);

        var cosine = m_util.clamp(m_vec3.dot(x_cam_world, x_cam_world_new), -1, 1);

        if (cosine <= -0.999999) {
            var angle = Math.acos(cosine);
            var rotation = m_quat.setAxisAngle(z_cam_world, angle, _quat4_tmp);
        } else
            var rotation = m_quat.rotationTo(x_cam_world, x_cam_world_new, _quat4_tmp);

        m_quat.normalize(rotation, rotation);
    }

    m_quat.multiply(rotation, quat, quat);

    // strictly align camera with the given UP vector direction
    if (strict) {
        var y_cam_world = m_util.quat_to_dir(quat, m_util.AXIS_Y, _vec3_tmp);
        if (m_vec3.dot(up_axis, y_cam_world) < 0)
            m_quat.rotateZ(quat, Math.PI, quat)
    }

    m_cam.update_camera_upside_down(camobj);
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
exports.remove = function(obj) {
    if (obj.constraint.obj_parent)
        remove_parent_descendant(obj.constraint.obj_parent, obj);

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

}
