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
var m_particles = require("__particles");
var m_scs       = require("__scenes");
var m_sfx       = require("__sfx");
var m_tsr       = require("__tsr");
var m_util      = require("__util");

var m_vec3 = require("vec3");
var m_quat = require("quat");
var m_mat3 = require("mat3");
var m_mat4 = require("mat4");

var _vec3_tmp = new Float32Array(3);
var _quat4_tmp = new Float32Array(4);
var _mat3_tmp = new Float32Array(9);

var _elapsed = 0;

// transform in world space
exports.SPACE_WORLD = 0;
// transform in local space
exports.SPACE_LOCAL = 1;

exports.update = function(elapsed) {
    _elapsed = elapsed;
}

exports.set_translation = function(obj, trans) {
    if (m_cons.get_type(obj) == m_cons.CONS_TYPE_CHILD_OF) {
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.set_trans(trans, offset);
    } else {
        var render = obj._render;
        render.trans.set(trans);
    }
}

exports.get_translation = function(obj, dest) {
    if (m_cons.get_type(obj) == m_cons.CONS_TYPE_CHILD_OF) {
        var offset = m_cons.get_child_of_offset(obj);
        m_vec3.copy(m_tsr.get_trans_view(offset), dest);
    } else {
        m_vec3.copy(obj._render.trans, dest);
    }
}

exports.set_rotation = function(obj, quat) {

    if (m_cons.get_type(obj) == m_cons.CONS_TYPE_CHILD_OF) {
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.set_quat(quat, offset);
    } else {
        var render = obj._render;
        render.quat.set(quat);
    }
}

exports.get_rotation = function(obj, dest) {
    if (m_cons.get_type(obj) == m_cons.CONS_TYPE_CHILD_OF) {
        var offset = m_cons.get_child_of_offset(obj);
        m_quat.copy(m_tsr.get_quat_view(offset), dest);
    } else {
        m_quat.copy(obj._render.quat, dest);
    }
}

exports.set_rotation_euler = function(obj, euler) {
    if (m_cons.get_type(obj) == m_cons.CONS_TYPE_CHILD_OF) {
        var quat = m_util.euler_to_quat(euler, _quat4_tmp);
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.set_quat(quat, offset);
    } else {
        m_util.euler_to_quat(euler, obj._render.quat);
    }
}

exports.set_scale = function(obj, scale) {
    if (m_cons.get_type(obj) == m_cons.CONS_TYPE_CHILD_OF) {
        // NOTE: untested
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.set_scale(scale, offset);
    } else {
        obj._render.scale = scale;
    }
}

exports.get_scale = function(obj) {
    if (m_cons.get_type(obj) == m_cons.CONS_TYPE_CHILD_OF) {
        // NOTE: untested
        var offset = m_cons.get_child_of_offset(obj);
        return m_tsr.get_scale(offset);
    } else {
        return obj._render.scale;
    }
}

exports.get_tsr = function(obj, dest) {
    if (m_cons.get_type(obj) == m_cons.CONS_TYPE_CHILD_OF) {
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.copy(offset, dest);
    } else {
        var render = obj._render;
        m_tsr.set_sep(render.trans, render.scale, render.quat, dest);
    }
}

exports.set_tsr = function(obj, tsr) {
    if (m_cons.get_type(obj) == m_cons.CONS_TYPE_CHILD_OF) {
        var offset = m_cons.get_child_of_offset(obj);
        m_tsr.copy(tsr, offset);
    } else {
        var render = obj._render;
        render.trans[0] = tsr[0];
        render.trans[1] = tsr[1];
        render.trans[2] = tsr[2];
        render.scale = tsr[3];
        render.quat[0] = tsr[4];
        render.quat[1] = tsr[5];
        render.quat[2] = tsr[6];
        render.quat[3] = tsr[7];
    }
}

exports.get_object_size = function(obj) {

    if (obj._render.type == "STATIC")
        var render = obj._dyn_render;
    else
        var render = obj._render;

    var bpy_bb = obj["data"]["b4w_bounding_box"];

    var x_size = render.scale * (bpy_bb["max_x"] - bpy_bb["min_x"]);
    var y_size = render.scale * (bpy_bb["max_y"] - bpy_bb["min_y"]);
    var z_size = render.scale * (bpy_bb["max_z"] - bpy_bb["min_z"]);

    var size = 0.5 * Math.sqrt(x_size * x_size + y_size * y_size + z_size * z_size);
    return size;
}

exports.get_object_center = function(obj, calc_bs_center, dest) {

    if (!dest)
        var dest = new Float32Array(3);

    if (calc_bs_center) {
        var render = obj._render;
        m_vec3.copy(render.bs_world.center, dest);
    } else {

        if (obj._render.type == "STATIC")
            var render = obj._dyn_render;
        else
            var render = obj._render;

        var bpy_bb = obj["data"]["b4w_bounding_box"];

        dest[0] = (bpy_bb["max_x"] + bpy_bb["min_x"])/2;
        dest[1] = (bpy_bb["max_y"] + bpy_bb["min_y"])/2;
        dest[2] = (bpy_bb["max_z"] + bpy_bb["min_z"])/2;

        m_vec3.transformMat4(dest, render.world_matrix, dest);
    }

    return dest;
}

/**
 * Calculate new translation based on distances in local space
 */
exports.move_local = function(obj, dx, dy, dz) {
    var render = obj._render;

    var trans_local = _vec3_tmp;
    trans_local[0] = dx;
    trans_local[1] = dy;
    trans_local[2] = dz;

    var mat = m_mat3.fromMat4(render.world_matrix, _mat3_tmp);
    m_vec3.transformMat3(trans_local, mat, trans_local);
    m_vec3.add(render.trans, trans_local, render.trans);
}


exports.update_transform = update_transform;
/**
 * Set object render world_matrix.
 * NOTE: do not try to update batched objects (buggy _dg_parent influence)
 * @methodOf transform
 * @param {Object} obj Object ID
 */
function update_transform(obj) {

    var render = obj._render;

    m_cons.update_constraint(obj, _elapsed);
    m_cam.update_camera(obj);

    if (obj["type"] == "CAMERA")
        m_cam.clamp_limits(obj);

    // should not change after constraint update
    var trans = render.trans;
    var scale = render.scale;
    var quat = render.quat;

    m_tsr.set_sep(trans, scale, quat, render.tsr);

    var wm = render.world_matrix;

    m_mat4.identity(wm);
    m_mat4.fromQuat(quat, wm);

    // TODO: remove world matrix and move to tsr system
    if (obj["type"] != "CAMERA")
        m_util.scale_mat4(wm, scale, wm);

    wm[12] = trans[0];
    wm[13] = trans[1];
    wm[14] = trans[2];

    m_mat4.invert(wm, render.inv_world_matrix);

    if (obj._anim_slots && m_particles.has_anim_particles(obj))
        m_particles.update_emitter_transform(obj);

    // NOTE: available only after batch creation (really needed now?)
    if (render.bb_local && render.bb_world) {
        m_bounds.bounding_box_transform(render.bb_local, wm, render.bb_world);
        m_bounds.bounding_sphere_transform(render.bs_local, wm, render.bs_world);
        m_bounds.bounding_ellipsoid_transform(render.be_local, render.tsr,
                                             render.be_world)
        if (render.shadow_cast)
            m_scs.schedule_shadow_update(m_scs.get_active());
    }

    switch (obj["type"]) {
    case "SPEAKER":
        m_sfx.speaker_update_transform(obj, _elapsed);
        break;
    case "CAMERA":
        m_cam.update_camera_transform(obj);
        if (m_scs.check_active())
            m_sfx.listener_update_transform(m_scs.get_active(), trans, quat, _elapsed);
        break;
    case "LAMP":
        m_lights.update_light_transform(obj);
        if (m_scs.check_active())
            m_scs.update_lamp_scene(obj, m_scs.get_active());
        break;
    case "EMPTY":
        if (obj["field"])
            m_scs.update_force(obj);
        break;
    }

    if (obj["type"] == "LAMP" || obj["type"] == "CAMERA") {
        if (m_scs.check_active()) {
            var active_scene = m_scs.get_active();
            m_scs.schedule_shadow_update(active_scene);
            m_scs.schedule_grass_map_update(active_scene);
        }
    }

    var descends = obj._descends;

    for (var i = 0; i < descends.length; i++)
        update_transform(descends[i]);
}

exports.distance = function(obj1, obj2) {
    return m_vec3.dist(obj1._render.trans, obj2._render.trans);
}

exports.obj_point_distance = function(obj, point) {
    return m_vec3.dist(obj._render.trans, point);
}

exports.get_object_bounding_box = function(obj) {
    return {
        max_x: obj._render.bb_world.max_x,
        min_x: obj._render.bb_world.min_x,
        max_y: obj._render.bb_world.max_y,
        min_y: obj._render.bb_world.min_y,
        max_z: obj._render.bb_world.max_z,
        min_z: obj._render.bb_world.min_z
    };
}

}
