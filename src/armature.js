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
 * Armature utility functions
 * @name armature
 * @namespace
 * @exports exports as armature
 */
b4w.module["__armature"] = function(exports, require) {
var m_util = require("__util");
var m_tsr  = require("__tsr");
var m_quat = require("__quat");
var m_mat4 = require("__mat4");
var m_vec3 = require("__vec3");

var _tsr_tmp = m_tsr.create();
var _tsr_tmp2 = m_tsr.create();
var _vec4_tmp = new Float32Array(4);
var _quat4_tmp = new Float32Array(4);
var _quat4_tmp2 = new Float32Array(4);

function init_bone_pointer() {
    var bone_ptr =
    {
        bone_index: 0,
        vgroup_index: -1,

        parent_bone_ptr: null,
        descend_bones_ptrs: [],
        chain: [],
        constraint: null,

        tsr_bone_rest:     m_tsr.create(),
        tsr_bone_pose:     m_tsr.create(),
        tsr_local_rest:    m_tsr.create(),
        tsr_local_pose:    m_tsr.create(),
        tsr_basis:         m_tsr.create(),
        tsr_channel_cache: m_tsr.create(),

        tsr_channel_cache_valid: false,

        tail: new Float32Array(3)
    };
    return bone_ptr;
}

exports.update_object = update_object;
function update_object(bpy_armobj, armobj) {
    var arm_bones = bpy_armobj["data"]["bones"];
    var pose_bones = bpy_armobj["pose"]["bones"];

    var bone_pointers = {};

    for (var i = 0; i < pose_bones.length; i++) {
        var pose_bone = pose_bones[i];
        var arm_bone = pose_bone["bone"];

        var bone_name = arm_bone["name"];
        var bpointer = bone_pointers[bone_name] = init_bone_pointer();

        var mat_loc = new Float32Array(arm_bone["matrix_local"]);
        var mat_loc_inv = new Float32Array(16);
        m_mat4.invert(mat_loc, mat_loc_inv);

        var mat_bas = new Float32Array(pose_bone["matrix_basis"]);

        var tail = bpointer.tail;
        m_vec3.subtract(m_util.f32(arm_bone["tail_local"]),
                m_util.f32(arm_bone["head_local"]), tail);
        // translate tail offset from armature to bone space
        m_util.vecdir_multiply_matrix(tail, mat_loc_inv, tail);

        m_tsr.from_mat4(mat_loc, bpointer.tsr_local_rest);
        m_tsr.from_mat4(mat_bas, bpointer.tsr_basis);
        m_tsr.copy(bpointer.tsr_local_rest, bpointer.tsr_local_pose);
    }

    for (var i = 0; i < arm_bones.length; i++) {
        var bone = arm_bones[i];
        var bone_name = bone["name"];
        var pose_bone = m_util.keysearch("name", bone_name, pose_bones);

        var bpointer = bone_pointers[bone_name];
        var parent_pose_bones = pose_bone["parent_recursive"];

        // include current bone to chain with its parents
        bpointer.chain.push(bpointer);
        for (var j = 0; j < parent_pose_bones.length; j++) {
            var parent_bone = parent_pose_bones[j];
            var parent_bone_name = parent_bone["name"];
            var parent_bone_ptr = bone_pointers[parent_bone_name];
            bpointer.chain.push(parent_bone_ptr);
        }

        if (parent_pose_bones.length) {
            var parent_bone = parent_pose_bones[0];
            var parent_bone_name = parent_bone["name"];
            var parent_bone_ptr = bone_pointers[parent_bone_name];
            bpointer.parent_bone_ptr = parent_bone_ptr;

            m_tsr.invert(parent_bone_ptr.tsr_local_rest, _tsr_tmp);
            m_tsr.multiply(_tsr_tmp, bpointer.tsr_local_rest,
                           bpointer.tsr_bone_rest);

            // store only direct bone's descendants
            parent_bone_ptr.descend_bones_ptrs.push(bpointer);
        } else
            m_tsr.copy(bpointer.tsr_local_rest, bpointer.tsr_bone_rest);

        bpointer.bone_index = i;
        bpointer.name = bone_name;

        m_tsr.multiply(bpointer.tsr_bone_rest, bpointer.tsr_basis,
                       bpointer.tsr_bone_pose);

    }
    armobj.render.bone_pointers = bone_pointers;
}

/**
 * Get armature bone pose data (animated or static)
 * uses _vec4_tmp, _quat4_tmp, _quat4_tmp2, _tsr_tmp, _tsr_tmp2
 */
exports.get_bone_tsr = function(armobj, bone_name, get_pose_tail,
                                use_bone_space, dest_tsr) {
    var render = armobj.render;

    var frame_factor = render.frame_factor;
    var bone_pointer = render.bone_pointers[bone_name];
    var index = bone_pointer.bone_index;
    var tsr_local = bone_pointer.tsr_local_rest;

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

    var tsr_bone = _tsr_tmp;
    m_tsr.set_transcale(transcale, tsr_bone);
    m_tsr.set_quat(quat, tsr_bone);

    if (get_pose_tail) {
        var tsr_local_tail = _tsr_tmp2;
        m_tsr.translate(tsr_local, bone_pointer.tail, tsr_local_tail);
        m_tsr.multiply(tsr_bone, tsr_local_tail, tsr_bone);
    } else
        m_tsr.multiply(tsr_bone, tsr_local, tsr_bone);

    if (use_bone_space) {
        var parent_bone_ptr = bone_pointer.parent_bone_ptr;
        if (parent_bone_ptr) {
            // move to bone space
            var tsr_par_local = parent_bone_ptr.tsr_local_pose;
            var inv_tsr_par_local = _tsr_tmp2;
            m_tsr.invert(tsr_par_local, inv_tsr_par_local);
            m_tsr.multiply(inv_tsr_par_local, tsr_bone, tsr_bone);
        }
        // calculate difference with rest pose tsr
        var tsr_bone_rest = bone_pointer.tsr_bone_rest;
        var inv_tsr_bone_rest = _tsr_tmp2;
        m_tsr.invert(tsr_bone_rest, inv_tsr_bone_rest);
        m_tsr.multiply(inv_tsr_bone_rest, tsr_bone, tsr_bone);
    }

    m_tsr.copy(tsr_bone, dest_tsr);
}

exports.set_bone_tsr = function(armobj, bone_name, tsr, use_bone_space) {
    var render = armobj.render;
    var bone_pointer = render.bone_pointers[bone_name];
    var trans_before = render.trans_before;
    var quats_before = render.quats_before;

    if (use_bone_space)
        m_tsr.multiply(bone_pointer.tsr_bone_rest, tsr,
                       bone_pointer.tsr_bone_pose);
    else
        m_tsr.copy(tsr, bone_pointer.tsr_local_pose);

    update_bone_tsr_r(bone_pointer, use_bone_space, trans_before, quats_before);
    render.frame_factor = 0;
    update_skinned_renders(armobj);
}

exports.update_skinned_renders = update_skinned_renders;
function update_skinned_renders(armobj) {
    var render = armobj.render;

    var skinned_renders = render.skinned_renders;
    var bone_maps = render.mesh_to_arm_bone_maps;

    for (var i = 0; i < skinned_renders.length; i++) {

        var skinned_render = skinned_renders[i];
        var bone_map = bone_maps[i];

        for (var j = 0; j < bone_map.length; j+=2) {
            var sk_ind = bone_map[j];
            var arm_ind = bone_map[j+1];

            for (var k = 0; k < 4; k++) {
                skinned_render.quats_before[sk_ind + k] =
                                            render.quats_before[arm_ind + k];
                skinned_render.quats_after [sk_ind + k] =
                                            render.quats_after [arm_ind + k];
                skinned_render.trans_before[sk_ind + k] =
                                            render.trans_before[arm_ind + k];
                skinned_render.trans_after [sk_ind + k] =
                                            render.trans_after [arm_ind + k];
            }
        }
        skinned_render.frame_factor = render.frame_factor;
    }
}

exports.update_bone_tsr_r = update_bone_tsr_r;
function update_bone_tsr_r(bone_pointer, use_bone_space, trans, quats) {

    var tsr_bone_pose = bone_pointer.tsr_bone_pose;
    var tsr_local_rest = bone_pointer.tsr_local_rest;
    var tsr_local_pose = bone_pointer.tsr_local_pose;

    var parent_bone_ptr = bone_pointer.parent_bone_ptr;
    if (parent_bone_ptr) {
        var tsr_par_local = parent_bone_ptr.tsr_local_pose;

        if (use_bone_space)
            m_tsr.multiply(tsr_par_local, tsr_bone_pose, tsr_local_pose);
        else {
            var inv_tsr_par_local = _tsr_tmp2;
            m_tsr.invert(tsr_par_local, inv_tsr_par_local);
            m_tsr.multiply(inv_tsr_par_local, tsr_local_pose, tsr_bone_pose);
        }
    } else
        if (use_bone_space)
            m_tsr.copy(tsr_bone_pose, tsr_local_pose);
        else
            m_tsr.copy(tsr_local_pose, tsr_bone_pose);

    var dest_tsr = _tsr_tmp;
    m_tsr.invert(tsr_local_rest, dest_tsr);
    m_tsr.multiply(tsr_local_pose, dest_tsr, dest_tsr);

    var index = bone_pointer.bone_index;

    trans[4*index]   = dest_tsr[0];
    trans[4*index+1] = dest_tsr[1];
    trans[4*index+2] = dest_tsr[2];
    trans[4*index+3] = dest_tsr[3];
    quats[4*index]   = dest_tsr[4];
    quats[4*index+1] = dest_tsr[5];
    quats[4*index+2] = dest_tsr[6];
    quats[4*index+3] = dest_tsr[7];

    var descend_ptrs = bone_pointer.descend_bones_ptrs;
    for (var i = 0; i < descend_ptrs.length; i++) {
        var desc_bone_ptr = descend_ptrs[i];
        // NOTE: temporary do not update child bones with constraints
        if (desc_bone_ptr.constraint)
            continue;
        update_bone_tsr_r(desc_bone_ptr, true, trans, quats)
    }
}

exports.check_bone = function(armobj, bone_name) {
    return bone_name in armobj.render.bone_pointers;
}

}
