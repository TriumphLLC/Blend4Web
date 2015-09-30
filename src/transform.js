/**
 * Copyright (C) 2014-2015 Triumph LLC
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
 * Object transformation API
 * @name transform
 * @namespace
 * @exports exports as transform
 */
b4w.module["__transform"] = function(exports, require) {

var m_bounds    = require("__boundings");
var m_cam       = require("__camera");
var m_cons      = require("__constraints");
var m_lights    = require("__lights");
var m_mat3      = require("__mat3");
var m_mat4      = require("__mat4");
var m_particles = require("__particles");
var m_quat      = require("__quat");
var m_scs       = require("__scenes");
var m_sfx       = require("__sfx");
var m_tsr       = require("__tsr");
var m_obj       = require("__objects");
var m_obj_util  = require("__obj_util");
var m_util      = require("__util");
var m_vec3      = require("__vec3");
var m_vec4      = require("__vec4");

var _vec3_tmp = new Float32Array(3);
var _quat4_tmp = new Float32Array(4);
var _mat3_tmp = new Float32Array(9);
var _tsr_tmp = m_tsr.create();
var _tsr_tmp2 = m_tsr.create();

var _elapsed = 0;

// transform in world space
exports.SPACE_WORLD = 0;
// transform in local space
exports.SPACE_LOCAL = 1;
// transform in parent space
exports.SPACE_PARENT = 2;

exports.update = function(elapsed) {
    _elapsed = elapsed;
}

exports.set_translation = function(obj, trans) {
    var render = obj.render;

    if (m_cons.has_child_of(obj)) {
        m_tsr.set_trans(trans, render.tsr);
        var tsr_par = m_cons.get_child_of_parent_tsr(obj);
        var tsr_inv = m_tsr.invert(tsr_par, _tsr_tmp);
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.multiply(tsr_inv, render.tsr, offset);
    } else
        m_vec3.copy(trans, render.trans);
}

exports.set_translation_rel = set_translation_rel;
function set_translation_rel(obj, trans) {
    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.set_trans(trans, offset);
    } else {
        var render = obj.render;
        m_vec3.copy(trans, render.trans);
    }
}

exports.get_translation = function(obj, dest) {
    m_vec3.copy(obj.render.trans, dest);
    return dest;
}

exports.get_translation_rel = function(obj, dest) {
    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        m_vec3.copy(m_tsr.get_trans_view(offset), dest);
    } else {
        m_vec3.copy(obj.render.trans, dest);
    }
    return dest;
}

exports.set_rotation = set_rotation;
function set_rotation(obj, quat) {
    var render = obj.render;

    if (m_cons.has_child_of(obj)) {
        m_tsr.set_quat(quat, render.tsr);
        var tsr_par = m_cons.get_child_of_parent_tsr(obj);
        var tsr_inv = m_tsr.invert(tsr_par, _tsr_tmp);
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.multiply(tsr_inv, render.tsr, offset);
    } else
        m_quat.copy(quat, render.quat);
}

exports.set_rotation_rel = set_rotation_rel;
function set_rotation_rel(obj, quat) {
    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.set_quat(quat, offset);
    } else {
        var render = obj.render;
        m_quat.copy(quat, render.quat);
    }
}

exports.get_rotation = function(obj, dest) {
    m_quat.copy(obj.render.quat, dest);
    return dest;
}

exports.get_rotation_rel = function(obj, dest) {
    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        m_quat.copy(m_tsr.get_quat_view(offset), dest);
    } else {
        m_quat.copy(obj.render.quat, dest);
    }
    return dest;
}

exports.set_rotation_euler = function(obj, euler) {
    var quat = m_util.euler_to_quat(euler, _quat4_tmp);
    set_rotation(obj, quat);
}

exports.set_rotation_euler_rel = function(obj, euler) {
    var quat = m_util.euler_to_quat(euler, _quat4_tmp);
    set_rotation_rel(obj, quat);
}

exports.set_scale = function(obj, scale) {
    var render = obj.render;

    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        var scale_par = m_tsr.get_scale(m_cons.get_child_of_parent_tsr(obj));
        m_tsr.set_scale(scale/scale_par, offset);
    } else
        render.scale = scale;
}

exports.set_scale_rel = function(obj, scale) {
    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.set_scale(scale, offset);
    } else
        obj.render.scale = scale;
}

exports.get_scale = function(obj) {
    return obj.render.scale;
}

exports.get_scale_rel = function(obj) {
    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        return m_tsr.get_scale(offset);
    } else
        return obj.render.scale;
}

exports.set_tsr = function(obj, tsr) {
    var render = obj.render;

    if (m_cons.has_child_of(obj)) {
        m_tsr.set_trans(trans, render.tsr);
        var tsr_par = m_cons.get_child_of_parent_tsr(obj);
        var tsr_inv = m_tsr.invert(tsr_par, _tsr_tmp);
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.multiply(tsr_inv, render.tsr, offset);
    } else
        set_tsr_raw(obj, tsr);
}

exports.set_tsr_rel = set_tsr_rel;
function set_tsr_rel(obj, tsr) {
    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.copy(tsr, offset);
    } else
        set_tsr_raw(obj, tsr);
}

function set_tsr_raw(obj, tsr) {
    var render = obj.render;
    render.trans[0] = tsr[0];
    render.trans[1] = tsr[1];
    render.trans[2] = tsr[2];
    render.scale = tsr[3];
    render.quat[0] = tsr[4];
    render.quat[1] = tsr[5];
    render.quat[2] = tsr[6];
    render.quat[3] = tsr[7];
}

exports.get_tsr = function(obj, dest) {
    var render = obj.render;
    m_tsr.set_sep(render.trans, render.scale, render.quat, dest);
    return dest;
}

exports.get_tsr_rel = get_tsr_rel;
function get_tsr_rel(obj, dest) {
    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.copy(offset, dest);
    } else {
        var render = obj.render;
        m_tsr.set_sep(render.trans, render.scale, render.quat, dest);
    }
    return dest;
}

exports.get_object_size = function(obj) {

    var render = obj.render;
    var bb = render.bb_original;

    var x_size = render.scale * (bb.max_x - bb.min_x);
    var y_size = render.scale * (bb.max_y - bb.min_y);
    var z_size = render.scale * (bb.max_z - bb.min_z);

    var size = 0.5 * Math.sqrt(x_size * x_size + y_size * y_size + z_size * z_size);
    return size;
}

exports.get_object_center = function(obj, calc_bs_center, dest) {

    if (!dest)
        var dest = new Float32Array(3);

    if (calc_bs_center) {
        var render = obj.render;
        m_vec3.copy(render.bs_world.center, dest);
    } else {

        var render = obj.render;
        var bb = render.bb_original;

        dest[0] = (bb.max_x + bb.min_x)/2;
        dest[1] = (bb.max_y + bb.min_y)/2;
        dest[2] = (bb.max_z + bb.min_z)/2;

        m_vec3.transformMat4(dest, render.world_matrix, dest);
    }

    return dest;
}

/**
 * Calculate new translation based on distances in local space
 */
exports.move_local = function(obj, dx, dy, dz) {
    var p_tsr = get_tsr_rel(obj, _tsr_tmp);

    var trans = _vec3_tmp;

    trans[0] = dx;
    trans[1] = dy;
    trans[2] = dz;

    m_tsr.transform_vec3(trans, p_tsr, trans);
    set_translation_rel(obj, trans);
}

exports.rotate_local = function(obj, quat) {
    var p_tsr = get_tsr_rel(obj, _tsr_tmp);
    var tsr = m_tsr.set_quat(quat, m_tsr.identity(_tsr_tmp2));

    m_tsr.multiply(p_tsr, tsr, tsr);
    set_tsr_rel(obj, tsr);
}


exports.update_transform = update_transform;
/**
 * Set object render world_matrix.
 * NOTE: do not try to update batched objects (buggy _dg_parent influence)
 * @methodOf transform
 * @param {Object3D} obj Object 3D
 */
function update_transform(obj) {
    var render = obj.render;
    var scenes_data = obj.scenes_data;

    var obj_type = obj.type;

    // NOTE: need to update before constraints, because they rely on to this flag
    if (obj_type == "CAMERA")
        m_cam.update_camera_upside_down(obj);

    m_cons.update_constraint(obj, _elapsed);

    if (obj_type == "CAMERA")
        m_cam.update_camera(obj);

    // should not change after constraint update
    var trans = render.trans;
    var scale = render.scale;
    var quat = render.quat;

    m_tsr.set_sep(trans, scale, quat, render.tsr);

    var wm = render.world_matrix;

    m_mat4.fromQuat(quat, wm);

    // TODO: remove world matrix and move to tsr system
    if (obj_type != "CAMERA")
        m_util.scale_mat4(wm, scale, wm);

    wm[12] = trans[0];
    wm[13] = trans[1];
    wm[14] = trans[2];

    m_mat4.invert(wm, render.inv_world_matrix);

    // NOTE: available only after batch creation (really needed now?)
    if (render.bb_local && render.bb_world) {
        m_bounds.bounding_box_transform(render.bb_local, wm, render.bb_world);
        m_bounds.bounding_sphere_transform(render.bs_local, wm, render.bs_world);
        m_bounds.bounding_ellipsoid_transform(render.be_local, render.tsr,
                                             render.be_world)
    }

    switch (obj_type) {
    case "SPEAKER":
        m_sfx.speaker_update_transform(obj, _elapsed);
        break;
    case "MESH":
        var armobj = obj.armobj;
        if (armobj) {
            var armobj_tsr = armobj.render.tsr;
            m_tsr.invert(armobj_tsr, _tsr_tmp);
            m_tsr.multiply(_tsr_tmp, render.tsr, _tsr_tmp);
            m_vec4.set(_tsr_tmp[0], _tsr_tmp[1], _tsr_tmp[2], _tsr_tmp[3],
                     render.arm_rel_trans);
            m_quat.set(_tsr_tmp[4], _tsr_tmp[5], _tsr_tmp[6], _tsr_tmp[7],
                     render.arm_rel_quat);
        }
        break;
    case "CAMERA":
        m_cam.update_camera_transform(obj);
        // listener only for active scene camera
        if (m_scs.check_active()) {
            var active_scene = m_scs.get_active();
            if (m_scs.get_camera(active_scene) == obj)
                m_sfx.listener_update_transform(active_scene, trans, quat,
                                                _elapsed);
        }
        break;
    case "LAMP":
        m_lights.update_light_transform(obj);
        break;
    }

    for (var i = 0; i < scenes_data.length; i++) {
        var sc_data = scenes_data[i];
        if (sc_data.is_active) {
            var scene = sc_data.scene;
            var sc_render = scene._render;
            var batches = sc_data.batches;

            switch (obj_type) {
            case "LAMP":
                m_scs.update_lamp_scene(obj, scene);
                break;
            case "CAMERA":
                m_scs.schedule_grass_map_update(scene);
                // camera movement only influence csm shadows
                if (sc_render.shadow_params &&
                        sc_render.shadow_params.enable_csm)
                    m_scs.schedule_shadow_update(scene);
                break;
            case "MESH":
                if (render.bb_local && render.bb_world) {
                    if (render.shadow_cast)
                        m_scs.schedule_shadow_update(scene);

                    var cube_refl_subs = sc_data.cube_refl_subs;
                    if (render.cube_reflection_id != null && cube_refl_subs)
                        m_scs.update_cube_reflect_subs(cube_refl_subs, trans);
                }
                if (obj.anim_slots.length &&
                        m_particles.obj_has_anim_particles(obj))
                    m_particles.update_emitter_transform(obj, batches);
                break;
            case "EMPTY":
                m_obj.update_force(obj);
                break;
            }

            var plane_refl_subs = sc_data.plane_refl_subs;
            var refl_objs = obj.reflective_objs;
            if (refl_objs.length && plane_refl_subs) {
                var cam = plane_refl_subs.camera;
                m_scs.update_plane_reflect_subs(plane_refl_subs, trans, quat);
                m_obj_util.update_refl_objects(refl_objs, cam.reflection_plane);
                m_cam.set_view(cam, m_scs.get_camera(scene));
                m_util.extract_frustum_planes(cam.view_proj_matrix, cam.frustum_planes);
            }
        }
    }

    var cons_descends = obj.cons_descends;
    for (var i = 0; i < cons_descends.length; i++)
        update_transform(cons_descends[i]);

    var cons_armat_bone_descends = obj.cons_armat_bone_descends;
    for (var i = 0; i < cons_armat_bone_descends.length; i++) {
        var cons_armat_desc = cons_armat_bone_descends[i];
        var armobj = cons_armat_desc[0];
        var bone_name = cons_armat_desc[1];
        m_cons.update_bone_constraint(armobj, bone_name);
    }

    render.force_zsort = true;
}

exports.distance = function(obj1, obj2) {
    return m_vec3.dist(obj1.render.trans, obj2.render.trans);
}

exports.obj_point_distance = function(obj, point) {
    return m_vec3.dist(obj.render.trans, point);
}

exports.get_object_bounding_box = function(obj) {
    return {
        max_x: obj.render.bb_world.max_x,
        min_x: obj.render.bb_world.min_x,
        max_y: obj.render.bb_world.max_y,
        min_y: obj.render.bb_world.min_y,
        max_z: obj.render.bb_world.max_z,
        min_z: obj.render.bb_world.min_z
    };
}

}
