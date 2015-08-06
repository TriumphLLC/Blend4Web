"use strict";

/**
 * Constraints internal API.
 * @name constraints
 * @namespace
 * @exports exports as constraints
 */
b4w.module["__constraints"] = function(exports, require) {

var m_tsr  = require("__tsr");
var m_util = require("__util");
var m_cam  = require("__camera");

var m_vec3 = require("vec3");
var m_vec4 = require("vec4");
var m_quat = require("quat");
var m_mat3 = require("mat3");
var m_mat4 = require("mat4");

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
var CONS_TYPE_SEMI_SOFT_CAM_OBJ   = 12;
var CONS_TYPE_STIFF_TRANS_ROT_OBJ = 13;
var CONS_TYPE_STIFF_VIEWPORT      = 14;

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
exports.CONS_TYPE_SEMI_SOFT_CAM_OBJ = CONS_TYPE_SEMI_SOFT_CAM_OBJ;
exports.CONS_TYPE_STIFF_TRANS_ROT_OBJ = CONS_TYPE_STIFF_TRANS_ROT_OBJ;
exports.CONS_TYPE_STIFF_VIEWPORT = CONS_TYPE_STIFF_VIEWPORT;

var _vec2_tmp   = new Float32Array(2);
var _vec2_tmp_2 = new Float32Array(2);
var _vec3_tmp   = new Float32Array(3);
var _vec3_tmp_2 = new Float32Array(3);
var _vec3_tmp_3 = new Float32Array(3);
var _vec4_tmp   = new Float32Array(4);
var _quat4_tmp  = new Float32Array(4);
var _quat4_tmp2 = new Float32Array(4);
var _tsr8_tmp   = new Float32Array(16);
var _tsr8_tmp2  = new Float32Array(16);
var _mat3_tmp   = new Float32Array(9);
var _mat3_tmp2  = new Float32Array(9);
var _tsr8_tmp   = new Float32Array(8);

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
    var quat = obj._render.quat;
    var p_quat = obj_parent._render.quat;

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
    var quat = obj._render.quat;
    var p_quat = obj_parent._render.quat;

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

    if (obj._constraint && obj._constraint.obj_parent)
        remove_parent_descendant(obj._constraint.obj_parent, obj);

    if (cons.obj_parent)
        assign_parent_descendant(cons.obj_parent, obj);

    // may override previous
    obj._constraint = cons;
}

exports.assign_parent_descendant = assign_parent_descendant;
function assign_parent_descendant(obj_parent, obj) {
    if (obj_parent._descends.indexOf(obj) == -1)
        obj_parent._descends.push(obj);
    else
        throw "Descendant object override is forbidden";
}

exports.remove_parent_descendant = remove_parent_descendant;
function remove_parent_descendant(obj_parent, obj) {
    var ind = obj_parent._descends.indexOf(obj);
    if (ind != -1)
        obj_parent._descends.splice(ind, 1);
    else
        throw "No descendant object";
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

exports.append_stiff_viewport = function(obj, camobj, positioning) {
    var cons = init_cons(CONS_TYPE_STIFF_VIEWPORT);

    cons.obj_parent = camobj;

    if ("left" in positioning) {
        cons.left_edge = true;
        cons.left_right_dist = positioning["left"];
    } else if ("right" in positioning) {
        cons.left_edge = false;
        cons.left_right_dist = positioning["right"];
    } else {
        m_print.error("append_stiff_viewport: Wrong positioning params");
        return;
    }

    if ("top" in positioning) {
        cons.top_edge = true;
        cons.top_bottom_dist = positioning["top"];
    } else if ("bottom" in positioning) {
        cons.top_edge = false;
        cons.top_bottom_dist = positioning["bottom"];
    } else {
        m_print.error("append_stiff_viewport: Wrong positioning params");
        return;
    }

    if ("distance" in positioning) {
        cons.distance = positioning["distance"];
    } else {
        m_print.error("append_stiff_viewport: Wrong positioning params");
        return;
    }

    if ("rotation" in positioning) {
        cons.rotation_offset = new Float32Array(positioning["rotation"]);
    } else
        cons.rotation_offset = null;

    apply_cons(obj, cons);
    update_cons(obj, cons, 0);
}

/**
 * Executed frequently.
 */
exports.update_constraint = function(obj, elapsed) {
    if (obj._constraint)
        update_cons(obj, obj._constraint, elapsed);
}

/**
 * Only trans/quat affected by constraint here
 */
function update_cons(obj, cons, elapsed) {
    switch (cons.type) {
    case CONS_TYPE_STIFF_OBJ:

        var quat = obj._render.quat;

        var p_world_matrix = cons.obj_parent._render.world_matrix;
        var p_quat = cons.obj_parent._render.quat;

        if (cons.rotation_offset) {
            m_quat.copy(cons.rotation_offset, quat);
            m_quat.multiply(p_quat, quat, quat);
        } else
            m_quat.copy(p_quat, quat);

        m_vec3.transformMat4(cons.offset, p_world_matrix, obj._render.trans);
        obj._render.scale = cons.scale_offset * cons.obj_parent._render.scale;

        break;
    case CONS_TYPE_SEMI_STIFF_OBJ:

        var trans = obj._render.trans;
        var quat = obj._render.quat;

        var p_world_matrix = cons.obj_parent._render.world_matrix;
        var p_quat = cons.obj_parent._render.quat;

        // Qp * Qp_prev_inv * Q
        m_quat.multiply(
                m_quat.invert(cons.parent_prev_rotation, cons.parent_prev_rotation),
                quat, quat);
        m_quat.multiply(p_quat, quat, quat);

        m_vec3.transformMat4(cons.offset, p_world_matrix, trans);
        m_quat.copy(p_quat, cons.parent_prev_rotation);

        break;
    case CONS_TYPE_SEMI_STIFF_CAM_OBJ:

        var trans = obj._render.trans;
        var quat = obj._render.quat;

        var p_world_matrix = cons.obj_parent._render.world_matrix;
        var p_quat = cons.obj_parent._render.quat;

        // Qp * Qp_prev_inv * Q
        m_quat.multiply(
                m_quat.invert(cons.parent_prev_rotation, cons.parent_prev_rotation),
                quat, quat);
        m_quat.multiply(p_quat, quat, quat);

        m_vec3.transformMat4(cons.offset, p_world_matrix, trans);
        m_quat.copy(p_quat, cons.parent_prev_rotation)

        clamp_orientation(obj, cons);

        break;
    case CONS_TYPE_SEMI_SOFT_CAM_OBJ:

        var trans          = obj._render.trans;
        var quat           = obj._render.quat;
        var p_world_matrix = cons.obj_parent._render.world_matrix;
        var p_trans        = cons.obj_parent._render.trans;
        var softness       = cons.softness;
        var trans_pivot    = _vec3_tmp;
        var quat_pivot     = _quat4_tmp;
        var softness_ratio = 0.16;

        m_vec3.transformMat4(cons.offset, p_world_matrix, trans_pivot);

        m_util.smooth_v(trans_pivot, trans, elapsed, softness, trans);

        var dir_to_obj = _vec3_tmp;
        m_vec3.sub(p_trans, trans, dir_to_obj);
        m_vec3.normalize(dir_to_obj, dir_to_obj);
        cam_rotate_to(quat, dir_to_obj, quat_pivot);
        m_util.smooth_q(quat_pivot, quat, elapsed, softness * softness_ratio, quat);

        break;
    case CONS_TYPE_STIFF_BONE:
        var quat = obj._render.quat;

        var p_transscale = _vec4_tmp;
        var p_quat = _quat4_tmp;

        get_bone_pose(cons.obj_parent, cons.bone_name, true, p_transscale, 
                p_quat);

        if (cons.rotation_offset) {
            m_quat.copy(cons.rotation_offset, quat);
            m_quat.multiply(p_quat, quat, quat);
        } else
            m_quat.copy(p_quat, quat);

        obj._render.scale = cons.scale_offset * p_transscale[3];

        m_util.transform_vec3(cons.offset, p_transscale[3], p_quat, p_transscale, 
                obj._render.trans);

        break;
    case CONS_TYPE_TRACK_OBJ:
        var trans = obj._render.trans;
        var quat = obj._render.quat;
        var t_trans = cons.obj_parent._render.trans;

        rotate_to(trans, quat, t_trans);
        break;
    case CONS_TYPE_TRACK_POINT:
        var trans = obj._render.trans;
        var quat = obj._render.quat;
        var t_trans = cons.target;

        rotate_to(trans, quat, t_trans);
        break;

    case CONS_TYPE_FOLLOW_OBJ:
        var trans = obj._render.trans;
        var quat = obj._render.quat;
        var t_trans = cons.obj_parent._render.trans;

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
        var trans = obj._render.trans;
        var quat = obj._render.quat;
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
        var p_world_matrix = cons.obj_parent._render.world_matrix;
        m_vec3.transformMat4(cons.offset, p_world_matrix, obj._render.trans);
        break;
    case CONS_TYPE_COPY_TRANS_OBJ:
        var p_trans = cons.obj_parent._render.trans;
        var trans = obj._render.trans;
        m_vec3.add(p_trans, cons.offset, trans);
        break;
    case CONS_TYPE_STIFF_TRANS_ROT_OBJ:

        var quat = obj._render.quat;

        var p_world_matrix = cons.obj_parent._render.world_matrix;
        var p_quat = cons.obj_parent._render.quat;

        if (cons.rotation_offset) {
            m_quat.copy(cons.rotation_offset, quat);
            m_quat.multiply(p_quat, quat, quat);
        } else
            m_quat.copy(p_quat, quat);

        m_vec3.transformMat4(cons.offset, p_world_matrix, obj._render.trans);
        break;
    case CONS_TYPE_CHILD_OF:
        var prender = cons.obj_parent._render;
        var ptsr = m_tsr.create_sep(prender.trans, prender.scale, prender.quat,
                _tsr8_tmp);
        var tsr_offset = cons.tsr_offset;

        m_tsr.multiply(ptsr, tsr_offset, ptsr);

        var trans = obj._render.trans;
        trans[0] = ptsr[0];
        trans[1] = ptsr[1];
        trans[2] = ptsr[2];

        obj._render.scale = ptsr[3];

        var quat = obj._render.quat;
        quat[0] = ptsr[4];
        quat[1] = ptsr[5];
        quat[2] = ptsr[6];
        quat[3] = ptsr[7];

        break;
    case CONS_TYPE_STIFF_VIEWPORT:
        var camobj = cons.obj_parent;
        var cam = m_cam.get_first_cam(camobj);

        var trans = obj._render.trans;

        var top = m_cam.get_edge(cam, "TOP");
        var bottom = m_cam.get_edge(cam, "BOTTOM");
        var height = top - bottom;

        if (cons.left_edge) {
            var left = m_cam.get_edge(cam, "LEFT");
            trans[0] = left + height * cons.left_right_dist;
        } else {
            var right = m_cam.get_edge(cam, "RIGHT");
            trans[0] = right - height * cons.left_right_dist;
        }

        // in the camera's local space (not view space)
        if (cons.top_edge)
            trans[2] = -(top - height * cons.top_bottom_dist);
        else
            trans[2] = -(bottom + height * cons.top_bottom_dist);

        // NOTE: ortho cameras have scaling problems
        if (m_cam.is_ortho(cam)) {
            trans[1] = -cons.distance;
        } else {
            trans[1] = -1;
            m_vec3.normalize(trans, trans);
            var scale = cons.distance/Math.abs(trans[1]);
            m_vec3.scale(trans, scale, trans);
        }

        m_tsr.transform_dir_vec3(trans, camobj._render.tsr, trans);
        m_vec3.add(camobj._render.trans, trans, trans);

        var quat = obj._render.quat;

        if (cons.rotation_offset) {
            m_quat.copy(cons.rotation_offset, quat);
            m_quat.multiply(camobj._render.quat, quat, quat);
        } else
            m_quat.copy(camobj._render.quat, quat);

        break;
    default:
        break;
    }

    if (obj._render.type == "CAMERA") {
        var corr_axis = m_util.AXIS_Y;
        if (cons.type == CONS_TYPE_SEMI_STIFF_CAM_OBJ) {
            var p_quat = cons.obj_parent._render.quat;
            corr_axis = m_vec3.transformQuat(corr_axis, p_quat, _parent_y_axis);
        }

        m_cam.update_camera_upside_down(obj);
        correct_up(obj, corr_axis);
    }
}

/**
 * uses _vec2_tmp, _vec2_tmp_2, _quat4_tmp
 */
function clamp_orientation(obj, cons) {
    var quat = obj._render.quat;
    var p_quat = cons.obj_parent._render.quat;

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
    m_util.quat_to_dir(quat, m_util.AXIS_MY, dir_from);
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

    m_vec3.copy(dir, y_cam_world);
    m_vec3.negate(y_cam_world, y_cam_world);
    m_vec3.normalize(y_cam_world, y_cam_world);

    var up_down = Boolean(Math.abs(m_vec3.dot(dir, m_util.AXIS_Y)) > 0.999999);

    if (up_down) {
        var mat_src = m_mat3.fromQuat(m_quat.normalize(quat, dest), _mat3_tmp2);
        m_vec3.copy(mat_src.subarray(0, 3), x_cam_world);
    } else
        m_vec3.cross(m_util.AXIS_Y, y_cam_world, x_cam_world);

    m_vec3.normalize(x_cam_world, x_cam_world);

    m_vec3.cross(x_cam_world, y_cam_world, z_cam_world);
    m_vec3.normalize(z_cam_world, z_cam_world);

    m_quat.fromMat3(mat_dst, dest);
    m_quat.normalize(dest, dest);
}

exports.correct_up = correct_up;
/**
 * Rotate camera to fix UP direction.
 * Uses _vec3_tmp, _vec3_tmp_2, _vec3_tmp_3
 */
function correct_up(camobj, y_axis) {
    var render = camobj._render;
    var quat = render.quat;

    var y_world = y_axis;

    // local camera Y in world space
    var y_cam_world = m_util.quat_to_dir(render.quat, m_util.AXIS_Y, _vec3_tmp)
    m_vec3.normalize(y_cam_world, y_cam_world);
    // handle extreme case (camera looks UP or DOWN)
    if (Math.abs(m_vec3.dot(y_world, y_cam_world)) > 0.999999)
        var rotation = m_quat.identity(_quat4_tmp);
    else {

        var x_cam_world_new = m_vec3.cross(y_world, y_cam_world, _vec3_tmp_2);

        m_vec3.normalize(x_cam_world_new, x_cam_world_new);

        if (render.move_style == m_cam.MS_TARGET_CONTROLS) {
            if (render.target_cam_upside_down)
                m_vec3.negate(x_cam_world_new, x_cam_world_new);
        } else {
            // Y coord of local camera Z axis in parent(!) space
            var z_cam_world = m_util.quat_to_dir(render.quat, m_util.AXIS_Z, _vec3_tmp_3);
            if (m_vec3.dot(z_cam_world, y_axis) > 0)
                m_vec3.negate(x_cam_world_new, x_cam_world_new);
        }

        var x_cam_world = m_util.quat_to_dir(render.quat, m_util.AXIS_X, _vec3_tmp_3);
        m_vec3.normalize(x_cam_world, x_cam_world);

        var cosine = m_util.clamp(m_vec3.dot(x_cam_world, x_cam_world_new), -1, 1);
        var angle = Math.acos(cosine);

        if (cosine <= -0.999999)
            var rotation = m_quat.setAxisAngle(y_cam_world, angle, _quat4_tmp);
        else
            var rotation = m_quat.rotationTo(x_cam_world, x_cam_world_new, _quat4_tmp);

        m_quat.normalize(rotation, rotation);
    }

    m_quat.multiply(rotation, quat, quat);
    m_cam.update_camera_upside_down(camobj);
}

exports.check_constraint = function(obj) {
    if (obj._constraint)
        return true;
    else
        return false;
}
/**
 * Remove object constraint
 */
exports.remove = function(obj) {
    if (obj._constraint.obj_parent)
        remove_parent_descendant(obj._constraint.obj_parent, obj);

    obj._constraint = null;
}

/**
 * Get constraint type or null
 */
exports.get_type = function(obj) {
    if (obj._constraint)
        return obj._constraint.type;
    else
        return null;
}

exports.get_parent = function(obj) {
    if (obj._constraint && obj._constraint.obj_parent)
        return obj._constraint.obj_parent;
    else
        return null;
}

/**
 * Get link to child-of TSR offset vector or null.
 */
exports.get_child_of_offset = function(obj) {
    if (obj._constraint && obj._constraint.type == CONS_TYPE_CHILD_OF)
        return obj._constraint.tsr_offset;
    else
        return null;
}


exports.get_bone_pose = get_bone_pose;
/**
 * Get armature bone pose data (animated or static)
 * NOTE: need to be somewhere else
 * uses _vec4_tmp, _quat4_tmp, _quat4_tmp2, _tsr8_tmp, _tsr8_tmp2
 */
function get_bone_pose(armobj, bone_name, get_pose_tail, dest_transscale,
        dest_quat) {

    var render = armobj._render;

    var frame_factor = render.frame_factor;
    var bone_pointer = render.bone_pointers[bone_name];
    var index = bone_pointer.deform_bone_index;
    var pose_bone_index = bone_pointer.pose_bone_index;
    var bone = armobj["pose"]["bones"][pose_bone_index];
    var tsr_local = bone._tsr_local;

    var transcale = _vec4_tmp;

    var trans_before = render.trans_before;
    var trans_after = render.trans_after;
    var quats_before = render.quats_before;
    var quats_after = render.quats_after;

    var x = trans_before[4*index];
    var y = trans_before[4*index+1];
    var z = trans_before[4*index+2];
    var s = trans_before[4*index+3];

    var xn = trans_after[4*index];
    var yn = trans_after[4*index+1];
    var zn = trans_after[4*index+2];
    var sn = trans_after[4*index+3];

    transcale[0] = (1-frame_factor) * x + frame_factor * xn;
    transcale[1] = (1-frame_factor) * y + frame_factor * yn;
    transcale[2] = (1-frame_factor) * z + frame_factor * zn;
    transcale[3] = (1-frame_factor) * s + frame_factor * sn;

    var quat = _quat4_tmp;
    var quatn = _quat4_tmp2;

    quat[0] = quats_before[4*index];
    quat[1] = quats_before[4*index+1];
    quat[2] = quats_before[4*index+2];
    quat[3] = quats_before[4*index+3];

    quatn[0] = quats_after[4*index];
    quatn[1] = quats_after[4*index+1];
    quatn[2] = quats_after[4*index+2];
    quatn[3] = quats_after[4*index+3];

    m_quat.slerp(quat, quatn, frame_factor, quat);

    var tsr_bone = _tsr8_tmp;
    m_tsr.set_transcale(transcale, tsr_bone);
    m_tsr.set_quat(quat, tsr_bone);

    if (get_pose_tail) {
        var tsr_local_tail = _tsr8_tmp2;
        m_tsr.translate(tsr_local, bone._tail, tsr_local_tail);
        m_tsr.multiply(tsr_bone, tsr_local_tail, tsr_bone);
    } else
        m_tsr.multiply(tsr_bone, tsr_local, tsr_bone);

    // from armature to world space
    m_tsr.multiply(render.tsr, tsr_bone, tsr_bone);

    dest_transscale[0] = tsr_bone[0];
    dest_transscale[1] = tsr_bone[1];
    dest_transscale[2] = tsr_bone[2];
    dest_transscale[3] = tsr_bone[3];

    if (dest_quat) {
        dest_quat[0] = tsr_bone[4];
        dest_quat[1] = tsr_bone[5];
        dest_quat[2] = tsr_bone[6];
        dest_quat[3] = tsr_bone[7];
    }
}

}
