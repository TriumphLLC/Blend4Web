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
 * Object transformation API
 * @name transform
 * @namespace
 * @exports exports as transform
 */
b4w.module["__transform"] = function(exports, require) {

var m_bounds   = require("__boundings");
var m_cam      = require("__camera");
var m_cons     = require("__constraints");
var m_lights   = require("__lights");
var m_obj      = require("__objects");
var m_obj_util = require("__obj_util");
var m_scs      = require("__scenes");
var m_sfx      = require("__sfx");
var m_tsr      = require("__tsr");
var m_util     = require("__util");
var m_vec3     = require("__vec3");

var _vec3_tmp  = new Float32Array(3);
var _vec3_tmp2 = new Float32Array(3);
var _quat_tmp = new Float32Array(4);
var _mat3_tmp  = new Float32Array(9);
var _tsr_tmp   = m_tsr.create();
var _tsr_tmp2  = m_tsr.create();

var _elapsed = 0;
var _update_counter = 0;

// transform in world space
exports.SPACE_WORLD = 0;
// transform in local space
exports.SPACE_LOCAL = 1;

exports.update = function(elapsed) {
    _elapsed = elapsed;
    _update_counter++;
}

exports.set_translation = function(obj, trans) {
    var render = obj.render;

    if (m_cons.has_child_of(obj)) {
        m_tsr.set_trans(trans, render.world_tsr);
        var tsr_par = m_cons.get_child_of_parent_tsr(obj);
        var tsr_inv = m_tsr.invert(tsr_par, _tsr_tmp);
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.multiply(tsr_inv, render.world_tsr, offset);
    } else
        m_tsr.set_trans(trans, render.world_tsr);
}

exports.set_translation_rel = set_translation_rel;
function set_translation_rel(obj, trans) {
    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.set_trans(trans, offset);
    } else {
        var render = obj.render;
        m_tsr.set_trans(trans, render.world_tsr);
    }
}

exports.get_translation = function(obj, dest) {
    m_tsr.get_trans(obj.render.world_tsr, dest);
    return dest;
}

exports.get_translation_rel = function(obj, dest) {
    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.get_trans(offset, dest);
    } else
        m_tsr.get_trans(obj.render.world_tsr, dest);

    return dest;
}

exports.set_rotation = set_rotation;
function set_rotation(obj, quat) {
    var render = obj.render;

    if (m_cons.has_child_of(obj)) {
        m_tsr.set_quat(quat, render.world_tsr);
        var tsr_par = m_cons.get_child_of_parent_tsr(obj);
        var tsr_inv = m_tsr.invert(tsr_par, _tsr_tmp);
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.multiply(tsr_inv, render.world_tsr, offset);
    } else
        m_tsr.set_quat(quat, render.world_tsr);
}

exports.set_rotation_rel = set_rotation_rel;
function set_rotation_rel(obj, quat) {
    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.set_quat(quat, offset);
    } else
        m_tsr.set_quat(quat, obj.render.world_tsr);
}

exports.get_rotation = get_rotation;
function get_rotation(obj, dest) {
    m_tsr.get_quat(obj.render.world_tsr, dest);
    return dest;
}

exports.get_rotation_rel = get_rotation_rel;
function get_rotation_rel(obj, dest) {
    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.get_quat(offset, dest);
    } else
        m_tsr.get_quat(obj.render.world_tsr, dest);
    return dest;
}

exports.set_rotation_euler = function(obj, euler) {
    var quat = m_util.euler_to_quat(euler, _quat_tmp);
    set_rotation(obj, quat);
}

exports.set_rotation_euler_rel = function(obj, euler) {
    var quat = m_util.euler_to_quat(euler, _quat_tmp);
    set_rotation_rel(obj, quat);
}

exports.get_rotation_euler = function(obj, dest) {
    var quat = get_rotation(obj, _quat_tmp);
    dest = m_util.quat_to_euler(euler, dest);
    return dest;
}

exports.get_rotation_euler_rel = function(obj, dest) {
    var quat = get_rotation_rel(obj, _quat_tmp);
    dest = m_util.quat_to_euler(euler, dest);
    return dest;
}

exports.set_scale = function(obj, scale) {
    var render = obj.render;

    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        var scale_par = m_tsr.get_scale(m_cons.get_child_of_parent_tsr(obj));
        m_tsr.set_scale(scale/scale_par, offset);
    } else
        m_tsr.set_scale(scale, render.world_tsr);
}

exports.set_scale_rel = function(obj, scale) {
    var render = obj.render;

    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.set_scale(scale, offset);
    } else
        m_tsr.set_scale(scale, render.world_tsr);
}

exports.get_scale = function(obj) {
    return m_tsr.get_scale(obj.render.world_tsr);
}

exports.get_scale_rel = function(obj) {
    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        return m_tsr.get_scale(offset);
    } else
        return m_tsr.get_scale(obj.render.world_tsr);
}

exports.set_tsr = function(obj, tsr) {
    m_tsr.copy(tsr, obj.render.world_tsr);

    if (m_cons.has_child_of(obj)) {
        var tsr_par = m_cons.get_child_of_parent_tsr(obj);
        var tsr_inv = m_tsr.invert(tsr_par, _tsr_tmp);
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.multiply(tsr_inv, obj.render.world_tsr, offset);
    }
}

exports.set_tsr_rel = set_tsr_rel;
function set_tsr_rel(obj, tsr) {
    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.copy(tsr, offset);
    } else
        m_tsr.copy(tsr, obj.render.world_tsr);
}


exports.get_tsr = function(obj, dest) {
    return m_tsr.copy(obj.render.world_tsr, dest);
}

exports.get_tsr_rel = get_tsr_rel;
function get_tsr_rel(obj, dest) {
    if (m_cons.has_child_of(obj)) {
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.copy(offset, dest);
    } else
        m_tsr.copy(obj.render.world_tsr, dest);
    return dest;
}

exports.get_object_size = function(obj) {

    var render = obj.render;
    var bb = render.bb_original;

    var scale  = m_tsr.get_scale(render.world_tsr);
    var x_size = scale * (bb.max_x - bb.min_x);
    var y_size = scale * (bb.max_y - bb.min_y);
    var z_size = scale * (bb.max_z - bb.min_z);

    var size = 0.5 * Math.sqrt(x_size * x_size + y_size * y_size + z_size * z_size);
    return size;
}

exports.get_object_center = function(obj, calc_bs_center, dest) {
    if (calc_bs_center) {
        var render = obj.render;
        m_vec3.copy(render.bs_world.center, dest);
    } else {

        var render = obj.render;
        var bb = render.bb_original;

        dest[0] = (bb.max_x + bb.min_x)/2;
        dest[1] = (bb.max_y + bb.min_y)/2;
        dest[2] = (bb.max_z + bb.min_z)/2;

        m_tsr.transform_vec3(dest, render.world_tsr, dest);
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
 * Set object render world_tsr.
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
    var trans = m_tsr.get_trans(render.world_tsr, _vec3_tmp);
    var quat = m_tsr.get_quat(render.world_tsr, _quat_tmp);

    m_bounds.bounding_box_transform(render.bb_local, render.world_tsr, render.bb_world);
    m_bounds.bounding_sphere_transform(render.bs_local, render.world_tsr, render.bs_world);

    if (render.use_batches_boundings) {
        for (var i = 0; i < scenes_data.length; i++) {
            var batches = scenes_data[i].batches;
            for (var j = 0; j < batches.length; j++) {
                var batch = batches[j];
                m_bounds.bounding_box_transform(batch.bb_local,
                        render.world_tsr, batch.bb_world);
                m_bounds.bounding_sphere_transform(batch.bs_local,
                        render.world_tsr, batch.bs_world);
                if (batch.use_be)
                    m_bounds.bounding_ellipsoid_transform(batch.be_local,
                            render.world_tsr, batch.be_world);
            }
        }
    } else if (render.use_be)
        m_bounds.bounding_ellipsoid_transform(render.be_local, render.world_tsr, render.be_world)

    switch (obj_type) {
    case "MESH":
        // used in some node materials
        if (obj.need_inv_zup_tsr)
            m_tsr.invert(obj.render.world_tsr, obj.render.world_tsr_inv);
        var armobj = obj.armobj;
        if (armobj) {
            var armobj_tsr = armobj.render.world_tsr;
            m_tsr.invert(armobj_tsr, _tsr_tmp);
            m_tsr.multiply(_tsr_tmp, render.world_tsr, _tsr_tmp);
            m_tsr.get_transcale(_tsr_tmp, render.arm_rel_trans);
            m_tsr.get_quat(_tsr_tmp, render.arm_rel_quat);
        }

        render.force_zsort = true;

        break;
    case "CAMERA":
        for (var i = 0; i < scenes_data.length; i++)
            m_cam.update_camera_transform(obj, scenes_data[i]);
        break;
    case "SPEAKER":
        m_sfx.speaker_update_transform(obj, _elapsed, _update_counter);
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
            case "MESH":
                if (render.shadow_cast)
                    m_scs.schedule_shadow_update(scene);

                var cube_refl_subs = sc_data.cube_refl_subs;
                if (render.cube_reflection_id != null && cube_refl_subs) {
                    m_scs.update_cube_reflect_subs(cube_refl_subs, trans);
                }
                break;
            case "EMPTY":
                m_obj.update_force(obj);
                break;
            case "CAMERA":
                m_scs.schedule_grass_map_update(scene);
                if (sc_render.shadow_params) {
                    // camera movement only influence csm shadows
                    if (sc_render.shadow_params.enable_csm)
                        m_scs.schedule_shadow_update(scene);
                    var cam_scene_data = m_obj_util.get_scene_data(obj, scene);
                    var cam_main = cam_scene_data.cameras[0];
                    m_scs.update_shadow_billboard_view(cam_main, sc_render.graph);
                }
                // listener only for active scene camera
                if (m_scs.get_active() == scene &&
                        m_scs.get_camera(scene) == obj)
                    m_sfx.listener_update_transform(scene, trans, quat,
                            _elapsed, _update_counter);
                break;
            case "LAMP":
                m_scs.update_lamp_scene(obj, scene);
                break;
            }

            var plane_refl_subs = sc_data.plane_refl_subs;
            var refl_objs = obj.reflective_objs;
            if (refl_objs.length) {
                for (var j = 0; j < plane_refl_subs.length; j++) {
                    var cam = plane_refl_subs[j].camera;
                    m_scs.update_plane_reflect_subs(plane_refl_subs[j], trans, quat);
                    m_obj_util.update_refl_objects(refl_objs, cam.reflection_plane);
                    m_cam.set_view(cam, m_scs.get_camera(scene));
                    m_util.extract_frustum_planes(cam.view_proj_matrix, cam.frustum_planes);
                }
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
}

exports.distance = function(obj1, obj2) {
    var trans1 = m_tsr.get_trans(obj1.render.world_tsr, _vec3_tmp);
    var trans2 = m_tsr.get_trans(obj2.render.world_tsr, _vec3_tmp2);
    return m_vec3.dist(trans1, trans2);
}

exports.obj_point_distance = function(obj, point) {
    var trans = m_tsr.get_trans(obj.render.world_tsr, _vec3_tmp);
    return m_vec3.dist(trans, point);
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
