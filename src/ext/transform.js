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
 * Object transformations API.
 * With some exceptions specified below, make sure that the objects are dynamic.
 * @module transform
 */
b4w.module["transform"] = function(exports, require) {

var m_obj_util = require("__obj_util");
var m_phy      = require("__physics");
var m_print    = require("__print");
var m_quat     = require("__quat");
var m_trans    = require("__transform");
var m_tsr      = require("__tsr");
var m_util     = require("__util");

var _tsr_tmp = m_tsr.create();
var _vec3_tmp = new Float32Array(3);
var _quat4_tmp = new Float32Array(4);

/**
 * Transform in the local space
 * @const {Space} module:transform.SPACE_LOCAL
 * @deprecated Not needed anymore.
 */
exports.SPACE_LOCAL = m_trans.SPACE_LOCAL;
/**
 * Transform in the world space
 * @const {Space} module:transform.SPACE_WORLD
 * @deprecated Not needed anymore.
 */
exports.SPACE_WORLD = m_trans.SPACE_WORLD;

/**
 * Set the object translation.
 * @method module:transform.set_translation
 * @param {Object3D} obj Object 3D
 * @param {Number} x X coord
 * @param {Number} y Y coord
 * @param {Number} z Z coord
 */
exports.set_translation = function(obj, x, y, z) {
    if (m_obj_util.is_dynamic(obj)) {
        _vec3_tmp[0] = x;
        _vec3_tmp[1] = y;
        _vec3_tmp[2] = z;

        m_trans.set_translation(obj, _vec3_tmp);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}
/**
 * Set the object translation (in the coordinate space of its parent).
 * @method module:transform.set_translation_rel
 * @param {Object3D} obj Object 3D
 * @param {Number} x X coord
 * @param {Number} y Y coord
 * @param {Number} z Z coord
 */
exports.set_translation_rel = function(obj, x, y, z) {
    if (m_obj_util.is_dynamic(obj)) {
        _vec3_tmp[0] = x;
        _vec3_tmp[1] = y;
        _vec3_tmp[2] = z;

        m_trans.set_translation_rel(obj, _vec3_tmp);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Set the object translation (vector form).
 * @method module:transform.set_translation_v
 * @param {Object3D} obj Object 3D
 * @param {Vec3} trans Translation vector
 */
exports.set_translation_v = function(obj, trans) {
    if (m_obj_util.is_dynamic(obj)) {
        m_trans.set_translation(obj, trans);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Set the object translation in vector form
 * (in the coordinate space of its parent).
 * @method module:transform.set_translation_rel_v
 * @param {Object3D} obj Object 3D
 * @param {Vec3} trans Translation vector
 */
exports.set_translation_rel_v = function(obj, trans) {
    if (m_obj_util.is_dynamic(obj)) {
        m_trans.set_translation_rel(obj, trans);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Set the object translation relatively to another object.
 * @method module:transform.set_translation_obj_rel
 * @param {Object3D} obj Transformed object
 * @param {Number} x X coord
 * @param {Number} y Y coord
 * @param {Number} z Z coord
 * @param {Object3D} obj_ref Reference object
 */
exports.set_translation_obj_rel = function(obj, x, y, z, obj_ref) {
    if (m_obj_util.is_dynamic(obj)) {
        _vec3_tmp[0] = x;
        _vec3_tmp[1] = y;
        _vec3_tmp[2] = z;

        var trans = m_tsr.get_trans_view(obj_ref.render.world_tsr);
        var quat = m_tsr.get_quat_view(obj_ref.render.world_tsr);

        m_util.transform_vec3(_vec3_tmp, 1, quat, trans, _vec3_tmp);

        m_trans.set_translation(obj, _vec3_tmp);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Get the object's translation vector.
 * @method module:transform.get_translation
 * @param {Object3D} obj Object 3D
 * @param {Vec3} [dest] Destination vector
 * @returns {Vec3} Destination vector
 */
exports.get_translation = function(obj, dest) {
    if (!dest)
        var dest = new Float32Array(3);

    m_trans.get_translation(obj, dest);
    return dest;
}

/**
 * Get the object's translation vector (in the coordinate space of its parent).
 * @method module:transform.get_translation_rel
 * @param {Object3D} obj Object 3D
 * @param {Vec3} [dest] Destination vector
 * @returns {Vec3} Destination vector
 */
exports.get_translation_rel = function(obj, dest) {
    if (!dest)
        var dest = new Float32Array(3);

    m_trans.get_translation_rel(obj, dest);
    return dest;
}

/**
 * Set the object's rotation quaternion.
 * @method module:transform.set_rotation
 * @param {Object3D} obj Object 3D
 * @param {Number} x X part of quaternion
 * @param {Number} y Y part of quaternion
 * @param {Number} z Z part of quaternion
 * @param {Number} w W part of quaternion
 */
exports.set_rotation = function(obj, x, y, z, w) {
    if (m_obj_util.is_dynamic(obj)) {
        _quat4_tmp[0] = x;
        _quat4_tmp[1] = y;
        _quat4_tmp[2] = z;
        _quat4_tmp[3] = w;

        m_trans.set_rotation(obj, _quat4_tmp);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Set the object's rotation quaternion (in the coordinate space of its parent).
 * @method module:transform.set_rotation_rel
 * @param {Object3D} obj Object 3D
 * @param {Number} x X part of quaternion
 * @param {Number} y Y part of quaternion
 * @param {Number} z Z part of quaternion
 * @param {Number} w W part of quaternion
 */
exports.set_rotation_rel = function(obj, x, y, z, w) {
    if (m_obj_util.is_dynamic(obj)) {
        _quat4_tmp[0] = x;
        _quat4_tmp[1] = y;
        _quat4_tmp[2] = z;
        _quat4_tmp[3] = w;

        m_trans.set_rotation_rel(obj, _quat4_tmp);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Set the object's rotation in vector form.
 * @method module:transform.set_rotation_v
 * @param {Object3D} obj Object 3D
 * @param {Quat} quat Quaternion vector
 */
exports.set_rotation_v = function(obj, quat) {
    if (m_obj_util.is_dynamic(obj)) {
        m_trans.set_rotation(obj, quat);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}
/**
 * Set the object's rotation in vector form
 * (in the coordinate space of its parent).
 * @method module:transform.set_rotation_rel_v
 * @param {Object3D} obj Object 3D
 * @param {Quat} quat Quaternion vector
 */
exports.set_rotation_rel_v = function(obj, quat) {
    if (m_obj_util.is_dynamic(obj)) {
        m_trans.set_rotation_rel(obj, quat);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Get the object's rotation quaternion.
 * @method module:transform.get_rotation
 * @param {Object3D} obj Object 3D
 * @param {Quat} [opt_dest] Destination vector
 * @returns {Quat} Destination vector
 */
exports.get_rotation = function(obj, opt_dest) {
    if (!opt_dest)
        var opt_dest = new Float32Array(4);

    m_trans.get_rotation(obj, opt_dest);
    return opt_dest;
}

/**
 * Get the object's rotation quaternion
 * (in the coordinate space of its parent).
 * @method module:transform.get_rotation_rel
 * @param {Object3D} obj Object 3D
 * @param {Quat} [opt_dest] Destination vector
 * @returns {Quat} Destination vector
 */
exports.get_rotation_rel = function(obj, opt_dest) {
    if (!opt_dest)
        var opt_dest = new Float32Array(4);

    m_trans.get_rotation_rel(obj, opt_dest);
    return opt_dest;
}

/**
 * Set euler rotation in the YZX intrinsic system.
 * Using euler angles is discouraged, use quaternion instead.
 * @method module:transform.set_rotation_euler
 * @param {Object3D} obj Object 3D
 * @param {Number} x Angle X
 * @param {Number} y Angle Y
 * @param {Number} z Angle Z
 */
exports.set_rotation_euler = function(obj, x, y, z) {
    if (m_obj_util.is_dynamic(obj)) {
        _vec3_tmp[0] = x;
        _vec3_tmp[1] = y;
        _vec3_tmp[2] = z;

        m_trans.set_rotation_euler(obj, _vec3_tmp);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Set euler rotation in the YZX intrinsic system
 * (in the coordinate space of its parent).
 * Using euler angles is discouraged, use quaternion instead.
 * @method module:transform.set_rotation_euler_rel
 * @param {Object3D} obj Object 3D
 * @param {Number} x Angle X
 * @param {Number} y Angle Y
 * @param {Number} z Angle Z
 */
exports.set_rotation_euler_rel = function(obj, x, y, z) {
    if (m_obj_util.is_dynamic(obj)) {
        _vec3_tmp[0] = x;
        _vec3_tmp[1] = y;
        _vec3_tmp[2] = z;

        m_trans.set_rotation_euler_rel(obj, _vec3_tmp);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Set euler rotation in vector form.
 * Using euler angles is discouraged, use quaternion instead.
 * @method module:transform.set_rotation_euler_v
 * @param {Object3D} obj Object 3D
 * @param {Euler} euler Vector with euler angles
 */
exports.set_rotation_euler_v = function(obj, euler) {
    if (m_obj_util.is_dynamic(obj)) {
        m_trans.set_rotation_euler(obj, euler);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Set euler rotation in vector form relatively to its parent
 * (in the coordinate space of its parent).
 * Using euler angles is discouraged, use quaternion instead.
 * @method module:transform.set_rotation_euler_rel_v
 * @param {Object3D} obj Object 3D
 * @param {Euler} euler Vector with euler angles
 */
exports.set_rotation_euler_rel_v = function(obj, euler) {
    if (m_obj_util.is_dynamic(obj)) {
        m_trans.set_rotation_euler_rel(obj, euler);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Set the object scale.
 * @method module:transform.set_scale
 * @param {Object3D} obj Object 3D
 * @param {Number} scale Object scale
 */
exports.set_scale = function(obj, scale) {
    if (m_obj_util.is_dynamic(obj)) {
        m_trans.set_scale(obj, scale);
        m_trans.update_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Set the object's scale
 * (in the coordinate space of its parent).
 * @method module:transform.set_scale_rel
 * @param {Object3D} obj Object 3D
 * @param {Number} scale Object scale
 */
exports.set_scale_rel = function(obj, scale) {
    if (m_obj_util.is_dynamic(obj)) {
        m_trans.set_scale_rel(obj, scale);
        m_trans.update_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Get the object scale.
 * @method module:transform.get_scale
 * @param {Object3D} obj Object 3D
 * @returns {Number} scale
 */
exports.get_scale = function(obj) {
    return m_trans.get_scale(obj);
}

/**
 * Get the object scale
 * (in the coordinate space of its parent).
 * @method module:transform.get_scale_rel
 * @param {Object3D} obj Object 3D
 * @returns {Number} scale
 */
exports.get_scale_rel = function(obj) {
    return m_trans.get_scale_rel(obj);
}

/**
 * Reset EMPTY's transform to allow child objects behave in the absolute (world) space.
 * @method module:transform.empty_reset_transform
 * @param {Object3D} obj Object 3D
 */
exports.empty_reset_transform = function(obj) {
    if (obj.type != "EMPTY") {
        m_print.error("Wrong object: " + obj.name);
        return;
    }

    for (var i = 0; i < obj.cons_descends.length; i++)
        if (!m_obj_util.is_dynamic(obj.cons_descends[i])) {
            m_print.error("Wrong object: \"" + obj.cons_descends[i].name 
                    + "\" is not dynamic.");
            return;
        }

    m_trans.set_translation(obj, [0, 0, 0]);
    m_trans.set_rotation(obj, [0, 0, 0, 1]);
    m_trans.set_scale(obj, 1);
    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Get object size (maximum radius, calculated from bounding box).
 * @method module:transform.get_object_size
 * @param {Object3D} obj Object 3D
 * @returns {Number} Object size
 */
exports.get_object_size = function(obj) {

    if (!m_obj_util.is_mesh(obj)) {
        m_print.error("Wrong object: " + obj.name);
        return 0;
    }

    return m_trans.get_object_size(obj);
}
/**
 * Get the object center in the world space.
 * Works for dynamic and static objects.
 * @method module:transform.get_object_center
 * @param {Object3D} obj Object 3D
 * @param {Boolean} calc_bs_center Use the object's bounding sphere to
 * calculate center, otherwise use the bounding box.
 * @param {Vec3} [dest] Destination vector
 * @returns {Vec3} Destination vector
 */
exports.get_object_center = function(obj, calc_bs_center, dest) {

    if (!m_obj_util.is_mesh(obj)) {
        m_print.error("Wrong object: " + obj.name);
        return null;
    }

    return m_trans.get_object_center(obj, calc_bs_center, dest);
}

/**
 * Perform incremental object translation in the local space.
 * @method module:transform.move_local
 * @param {Object3D} obj Object 3D
 * @param {Number} dx Translation offset along X axis
 * @param {Number} dy Translation offset along Y axis
 * @param {Number} dz Translation offset along Z axis
 */
exports.move_local = function(obj, dx, dy, dz) {
    if (m_obj_util.is_dynamic(obj)) {
        m_trans.move_local(obj, dx, dy, dz);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Perform incremental rotation around X axis in the local space.
 * @method module:transform.rotate_x_local
 * @param {Object3D} obj Object 3D
 * @param {Number} angle Angle
 */
exports.rotate_x_local = function(obj, angle) {
    if (m_obj_util.is_dynamic(obj)) {
        var quat = m_quat.setAxisAngle(m_util.AXIS_X, angle, _quat4_tmp);
        m_trans.rotate_local(obj, quat);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Perform incremental rotation around Y axis in the local space.
 * @method module:transform.rotate_y_local
 * @param {Object3D} obj Object 3D
 * @param {Number} angle Angle
 */
exports.rotate_y_local = function(obj, angle) {
    if (m_obj_util.is_dynamic(obj)) {
        var quat = m_quat.setAxisAngle(m_util.AXIS_Y, angle, _quat4_tmp);
        m_trans.rotate_local(obj, quat);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Perform incremental rotation around Z axis in the local space.
 * @method module:transform.rotate_z_local
 * @param {Object3D} obj Object 3D
 * @param {Number} angle Angle
 */
exports.rotate_z_local = function(obj, angle) {
    if (m_obj_util.is_dynamic(obj)) {
        var quat = m_quat.setAxisAngle(m_util.AXIS_Z, angle, _quat4_tmp);
        m_trans.rotate_local(obj, quat);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Get object bounding box.
 * @method module:transform.get_object_bounding_box
 * @param {Object3D} obj Object 3D
 * @returns {BoundingBox} Bounding box
 * @cc_externs max_x min_x max_y min_y max_z min_z
 */
exports.get_object_bounding_box = function(obj) {
    return m_trans.get_object_bounding_box(obj);
}

/**
 * Set the object's TSR vector.
 * @method module:transform.set_tsr
 * @param {Object3D} obj Object 3D
 * @param {TSR} tsr vector
 */
exports.set_tsr = function(obj, tsr) {
    if (m_obj_util.is_dynamic(obj)) {
        m_trans.set_tsr(obj, tsr);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Set the object's TSR vector
 * (in the coordinate space of its parent).
 * @method module:transform.set_tsr_rel
 * @param {Object3D} obj Object 3D
 * @param {TSR} tsr vector
 */
exports.set_tsr_rel = function(obj, tsr) {
    if (m_obj_util.is_dynamic(obj)) {
        m_trans.set_tsr_rel(obj, tsr);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Return an object's transformation in TSR form.
 * @method module:transform.get_tsr
 * @param {Object3D} obj Object 3D
 * @param {TSR} [dest] Destination vector.
 * @returns {TSR} Destination vector.
 */
exports.get_tsr = function(obj, dest) {
    if (!dest)
        var dest = new Float32Array(8);

    m_trans.get_tsr(obj, dest);

    return dest;
}

/**
 * Return the object transformation in TSR form.
 * (in the coordinate space of its parent).
 * @method module:transform.get_tsr_rel
 * @param {Object3D} obj Object 3D
 * @param {TSR} [dest] Destination vector.
 * @returns {TSR} Destination vector.
 */
exports.get_tsr_rel = function(obj, dest) {
    if (!dest)
        var dest = new Float32Array(8);

    m_trans.get_tsr_rel(obj, dest);

    return dest;
}

/**
 * Get distance between the two objects.
 * @param {Object3D} obj1 Object 3D 1
 * @param {Object3D} obj2 Object 3D 2
 * @returns {Number} Distance
 */
exports.distance = function(obj1, obj2) {
    return m_trans.distance(obj1, obj2);
}

/**
 * Set the object's transformation matrix.
 * It's better to use TSR form.
 * @method module:transform.set_matrix
 * @param {Object3D} obj Object 3D
 * @param {Mat4} mat Matrix
 */
exports.set_matrix = function(obj, mat) {
    if (m_obj_util.is_dynamic(obj)) {
        m_tsr.from_mat4(mat, _tsr_tmp);
        m_trans.set_tsr(obj, _tsr_tmp);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Set the object's transformation matrix
 * (in the coordinate space of its parent).
 * It's better to use TSR form.
 * @method module:transform.set_matrix_rel
 * @param {Object3D} obj Object 3D
 * @param {Mat4} mat Matrix
 */
exports.set_matrix_rel = function(obj, mat) {
    if (m_obj_util.is_dynamic(obj)) {
        m_tsr.from_mat4(mat, _tsr_tmp);
        m_trans.set_tsr_rel(obj, _tsr_tmp);
        m_trans.update_transform(obj);
        m_phy.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj.name + "\" is not dynamic.");
}

/**
 * Return the object's transformation matrix.
 * It's better to use TSR form.
 * @method module:transform.get_matrix
 * @param {Object3D} obj Object 3D
 * @param {Mat4} [dest] Destination matrix.
 * @returns {Mat4} Destination matrix.
 */
exports.get_matrix = function(obj, dest) {
    if (!dest)
        var dest = new Float32Array(16);

    m_trans.get_tsr(obj, _tsr_tmp);
    m_tsr.to_mat4(_tsr_tmp, dest);

    return dest;
}

/**
 * Return the object's transformation matrix
 * (in the coordinate space of its parent).
 * It's better to use TSR form.
 * @method module:transform.get_matrix_rel
 * @param {Object3D} obj Object 3D
 * @param {Mat4} [dest] Destination matrix.
 * @returns {Mat4} Destination matrix.
 */
exports.get_matrix_rel = function(obj, dest) {
    if (!dest)
        var dest = new Float32Array(16);

    m_trans.get_tsr_rel(obj, _tsr_tmp);
    m_tsr.to_mat4(_tsr_tmp, dest);

    return dest;
}

}
