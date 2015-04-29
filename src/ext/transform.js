"use strict";

/**
 * Object transformations API.
 * With some exceptions specified below, make sure that the objects are dynamic.
 * @module transform
 */
b4w.module["transform"] = function(exports, require) {

var m_print   = require("__print");
var physics   = require("__physics");
var m_trans = require("__transform");
var util      = require("__util");
var m_obj     = require("__objects");

var _vec3_tmp = new Float32Array(3);
var _quat4_tmp = new Float32Array(4);

/**
 * Transform in the local space
 * @const module:transform.SPACE_LOCAL
 */
exports.SPACE_LOCAL = m_trans.SPACE_LOCAL;
/**
 * Transform in the world space
 * @const module:transform.SPACE_WORLD
 */
exports.SPACE_WORLD = m_trans.SPACE_WORLD;

/**
 * Set the object translation.
 * @method module:transform.set_translation
 * @param {Object} obj Object ID
 * @param {Number} x X coord
 * @param {Number} y Y coord
 * @param {Number} z Z coord
 */
exports.set_translation = function(obj, x, y, z) {
    if (m_obj.is_dynamic(obj)) {
        _vec3_tmp[0] = x;
        _vec3_tmp[1] = y;
        _vec3_tmp[2] = z;

        m_trans.set_translation(obj, _vec3_tmp);
        m_trans.update_transform(obj);
        physics.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj["name"] + "\" is not dynamic.");
}
/**
 * Set the object translation (vector form).
 * @method module:transform.set_translation_v
 * @param {Object} obj Object ID
 * @param {Float32Array} trans Translation vector
 */
exports.set_translation_v = function(obj, trans) {
    if (m_obj.is_dynamic(obj)) {
        m_trans.set_translation(obj, trans);
        m_trans.update_transform(obj);
        physics.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj["name"] + "\" is not dynamic.");
}

/**
 * Set the object translation relative to another object.
 * @method module:transform.set_translation_rel
 * @param {Object} obj Object ID
 * @param {Number} x X coord
 * @param {Number} y Y coord
 * @param {Number} z Z coord
 * @param {Object} obj_parent Parent object ID
 */
exports.set_translation_rel = function(obj, x, y, z, obj_parent) {
    if (m_obj.is_dynamic(obj)) {
        _vec3_tmp[0] = x;
        _vec3_tmp[1] = y;
        _vec3_tmp[2] = z;

        var trans = obj_parent._render.trans;
        var quat = obj_parent._render.quat;

        util.transform_vec3(_vec3_tmp, 1, quat, trans, _vec3_tmp);

        m_trans.set_translation(obj, _vec3_tmp);
        m_trans.update_transform(obj);
        physics.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj["name"] + "\" is not dynamic.");
}

/**
 * Get vector with object translation.
 * @method module:transform.get_translation
 * @param {Object} obj Object ID
 * @param {Float32Array} [dest] Destination vector
 * @returns {Float32Array} Destination vector
 */
exports.get_translation = function(obj, dest) {
    if (!dest)
        var dest = new Float32Array(3);

    m_trans.get_translation(obj, dest);
    return dest;
}

/**
 * Set object rotation
 * @method module:transform.set_rotation
 * @param {Object} obj Object ID
 * @param {Number} x X part of quaternion
 * @param {Number} y Y part of quaternion
 * @param {Number} z Z part of quaternion
 * @param {Number} w W part of quaternion
 */
exports.set_rotation = function(obj, x, y, z, w) {
    if (m_obj.is_dynamic(obj)) {
        _quat4_tmp[0] = x;
        _quat4_tmp[1] = y;
        _quat4_tmp[2] = z;
        _quat4_tmp[3] = w;

        m_trans.set_rotation(obj, _quat4_tmp);
        m_trans.update_transform(obj);
        physics.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj["name"] + "\" is not dynamic.");
}

/**
 * @method module:transform.set_rotation_quat
 * @deprecated Use set_rotation() instead
 */
exports.set_rotation_quat = function() {
    m_print.error("set_rotation_quat() deprecated, use set_rotation() instead");
    return exports.set_rotation;
}

/**
 * Set object rotation (vector form)
 * @method module:transform.set_rotation_v
 * @param {Object} obj Object ID
 * @param {Float32Array} quat Quaternion vector
 */
exports.set_rotation_v = function(obj, quat) {
    if (m_obj.is_dynamic(obj)) {
        m_trans.set_rotation(obj, quat);
        m_trans.update_transform(obj);
        physics.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj["name"] + "\" is not dynamic.");
}
/**
 * @method module:transform.set_rotation_quat_v
 * @deprecated Use set_rotation_v() instead
 */
exports.set_rotation_quat_v = function() {
    m_print.error("set_rotation_quat_v() deprecated, use set_rotation_v() instead");
    return exports.set_rotation_v;
}

/**
 * Get object rotation quaternion.
 * @method module:transform.get_rotation
 * @param {Object} obj Object ID
 * @param {Float32Array} [opt_dest] Destination vector
 * @returns {Float32Array} Destination vector
 */
exports.get_rotation = function(obj, opt_dest) {
    if (!opt_dest)
        var opt_dest = new Float32Array(4);

    m_trans.get_rotation(obj, opt_dest);
    return opt_dest;
}
/**
 * @method module:transform.get_rotation_quat
 * @deprecated Use get_rotation() instead
 */
exports.get_rotation_quat = function() {
    m_print.error("get_rotation_quat() deprecated, use get_rotation() instead");
    return exports.get_rotation;
}

/**
 * Set euler rotation in the YZX intrinsic system.
 * Using euler angles is discouraged, use quaternion instead.
 * @method module:transform.set_rotation_euler
 * @param {Object} obj Object ID
 * @param {Number} x Angle X
 * @param {Number} y Angle Y
 * @param {Number} z Angle Z
 */
exports.set_rotation_euler = function(obj, x, y, z) {
    if (m_obj.is_dynamic(obj)) {
        _vec3_tmp[0] = x;
        _vec3_tmp[1] = y;
        _vec3_tmp[2] = z;

        m_trans.set_rotation_euler(obj, _vec3_tmp);
        m_trans.update_transform(obj);
        physics.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj["name"] + "\" is not dynamic.");
}
/**
 * Set euler rotation in vector form.
 * Using euler angles is discouraged, use quaternion instead.
 * @method module:transform.set_rotation_euler_v
 * @param {Object} obj Object ID
 * @param {Float32Array} euler Vector with euler angles
 */
exports.set_rotation_euler_v = function(obj, euler) {
    if (m_obj.is_dynamic(obj)) {
        m_trans.set_rotation_euler(obj, euler);
        m_trans.update_transform(obj);
        physics.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj["name"] + "\" is not dynamic.");
}

/**
 * Set the object scale.
 * @method module:transform.set_scale
 * @param {Object} obj Object ID
 * @param {Number} scale Object scale
 */
exports.set_scale = function(obj, scale) {
    if (m_obj.is_dynamic(obj)) {
        m_trans.set_scale(obj, scale);
        m_trans.update_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj["name"] + "\" is not dynamic.");
}
/**
 * Get the object scale.
 * @method module:transform.get_scale
 * @param {Object} obj Object ID
 * @returns {Number} scale
 */
exports.get_scale = function(obj) {
    return m_trans.get_scale(obj);
}

/**
 * Reset EMPTY's transform to allow child objects behave in the absolute (world) space.
 * Works only for EMPTYes with "relative group coords" option enabled.
 * @method module:transform.empty_reset_transform
 * @param {Object} obj Object ID
 */
exports.empty_reset_transform = function(obj) {
    if (obj["type"] != "EMPTY") {
        m_print.error("Wrong object: " + obj["name"]);
        return false;
    }

    for (var i = 0; i < obj._descends.length; i++)
        if (!m_obj.is_dynamic(obj._descends[i])) {
            m_print.error("Wrong object: \"" + obj._descends[i]["name"] + "\" is not dynamic.");
            return;
        }
            

    m_trans.set_translation(obj, [0, 0, 0]);
    m_trans.set_rotation(obj, [0, 0, 0, 1]);
    m_trans.set_scale(obj, 1);
    m_trans.update_transform(obj);
    physics.sync_transform(obj);
}

/**
 * Get object size (maximum radius, calculated from bounding box).
 * @method module:transform.get_object_size
 * @param {Object} obj Object ID
 * @returns {Number} Object size
 */
exports.get_object_size = function(obj) {

    if (!util.is_mesh(obj)) {
        m_print.error("Wrong object: " + obj["name"]);
        return 0;
    }

    return m_trans.get_object_size(obj);
}
/**
 * Get the object center in the world space.
 * Works for dynamic and static objects.
 * @method module:transform.get_object_center
 * @param {Object} obj Object ID
 * @param {Boolean} calc_bs_center Use the object's bounding sphere to
 * calculate center, otherwise the use bounding box.
 * @param {Float32Array} [dest] Destination vector
 * @returns {Float32Array} Destination vector
 */
exports.get_object_center = function(obj, calc_bs_center, dest) {

    if (!util.is_mesh(obj)) {
        m_print.error("Wrong object: " + obj["name"]);
        return null;
    }

    return m_trans.get_object_center(obj, calc_bs_center, dest);
}

/**
 * Perform incremental object movement in the local space.
 * @method module:transform.move_local
 * @param {Object} obj Object ID
 * @param {Number} x DeltaX coord
 * @param {Number} y DeltaY coord
 * @param {Number} z DeltaZ coord
 */
exports.move_local = function(obj, dx, dy, dz) {
    if (m_obj.is_dynamic(obj)) {
        m_trans.move_local(obj, dx, dy, dz);
        m_trans.update_transform(obj);
        physics.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj["name"] + "\" is not dynamic.");
}

/**
 * Get object bounding box.
 * @method module:transform.get_object_bounding_box
 * @param {Object} obj Object ID
 * @returns {Object} Bounding box
 * @cc_externs max_x min_x max_y min_y max_z min_z
 */
exports.get_object_bounding_box = function(obj) {
    return m_trans.get_object_bounding_box(obj);
}

/**
 * Get object tsr.
 * @method module:transform.get_tsr
 * @param {Object} obj Object ID
 * @param {Float32Array} [dest] Destination vector
 * @returns {Float32Array} Destination vector
 */
exports.get_tsr = function(obj, dest) {
    if (!dest)
        var dest = new Float32Array(8);

    if (m_obj.is_dynamic(obj)) {
        m_trans.get_tsr(obj, dest);

        return dest;
    } else
        m_print.error("Wrong object: \"" + obj["name"] + "\" is not dynamic.");
}

/**
 * Set the object tsr.
 * @method module:transform.set_tsr
 * @param {Object} obj Object ID
 * @param {Float32Array} tsr vector
 */
exports.set_tsr = function(obj, tsr) {
    if (m_obj.is_dynamic(obj)) {
        m_trans.set_tsr(obj, tsr);
        m_trans.update_transform(obj);
        physics.sync_transform(obj);
    } else
        m_print.error("Wrong object: \"" + obj["name"] + "\" is not dynamic.");
}

/**
 * Get distance between the two objects.
 * @param {Object} obj1 Object ID 1
 * @param {Object} obj2 Object ID 2
 * @returns {Number} Distance
 */
exports.distance = function(obj1, obj2) {
    return m_trans.distance(obj1, obj2);
}


}
