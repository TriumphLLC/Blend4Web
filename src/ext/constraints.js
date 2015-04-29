"use strict";

/** 
 * Object constraints API.
 * @module constraints
 */
b4w.module["constraints"] = function(exports, require) {

var m_cam  = require("__camera");
var m_cons  = require("__constraints");
var m_phy   = require("__physics");
var m_trans = require("__transform");

/**
 * Append a stiff constraint.
 * @method module:constraints.append_stiff
 * @param {Object} obj Object ID
 * @param {(Object|Array)} target Object ID or [Armature object ID, Bone Name]
 * @param {Float32Array} offset Offset in parent local space
 * @param {Float32Array} [rotation_offset] Rotation offset in parent local space
 * @param {Number} [scale_offset] Scale offset in parent local space
 */
exports.append_stiff = function(obj, target, offset, rotation_offset, 
        scale_offset) {

    scale_offset = scale_offset || 1;
    if (target instanceof Array && target.length == 2)
        m_cons.append_stiff_bone(obj, target[0], target[1], offset, 
                rotation_offset, scale_offset);
    else
        m_cons.append_stiff_obj(obj, target, offset, rotation_offset, 
                scale_offset);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}
/**
 * Append a semi-stiff constraint.
 * @method module:constraints.append_semi_stiff
 * @param {Object} obj Object ID
 * @param {Object} target Object ID or [Armature object ID, Bone Name]
 * @param {Float32Array} offset Offset in parent local space
 * @param {Float32Array} [rotation_offset] Rotation offset in parent local space
 */
exports.append_semi_stiff = function(obj, target, offset, rotation_offset) {
    m_cons.append_semi_stiff_obj(obj, target, offset, rotation_offset);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}
/**
 * Append a semi-stiff constraint with camera rotation clamping.
 * @see https://www.blend4web.com/doc/en/camera.html#api
 * @method module:constraints.append_semi_stiff_cam
 * @param {Object} obj Object ID
 * @param {(Object|Array)} target Object ID or [Armature object ID, Bone Name]
 * @param {Float32Array} offset Offset in parent local space
 * @param {Float32Array} [rotation_offset] Rotation offset in parent local space
 * @param {Number} clamp_left Clamp camera rotation left for the azimuth angle
 * @param {Number} clamp_right Clamp camera rotation right for the azimuth angle
 * @param {Number} clamp_up Clamp camera rotation up for the elevation angle
 * @param {Number} clamp_down Clamp camera rotation down for the elevation angle
 */
exports.append_semi_stiff_cam = function(obj, target, offset, rotation_offset, 
                                            clamp_left, clamp_right, 
                                            clamp_up, clamp_down) {
    if (!m_cam.is_eye_camera(obj)) {
        m_print.error("append_semi_stiff_cam(): Wrong object");
        return null;
    }
    
    m_cons.append_semi_stiff_cam_obj(obj, target, offset, rotation_offset, 
                                          clamp_left, clamp_right, 
                                          clamp_up, clamp_down);
    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}
/**
 * Append a semi-soft constraint.
 * @method module:constraints.append_semi_soft_cam
 * @param {Object} obj Object ID
 * @param {(Object|Array)} target Object ID or [Armature object ID, Bone Name]
 * @param {Float32Array} offset Offset in parent local space
 * @param {Number} [softness=0.25] value of camera's smooth
 */
exports.append_semi_soft_cam = function(obj, target, offset, softness) {
    if (!softness || softness < 0)
        softness = 0.25;
    m_cons.append_semi_soft_cam_obj(obj, target, offset, softness);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}
/**
 * Append a stiff translation constraint.
 * @method module:constraints.append_stiff_trans
 * @param {Object} obj Object ID
 * @param {Object} target Object ID
 * @param {Float32Array} offset Offset in target local space
 */
exports.append_stiff_trans = function(obj, target, offset) {
    m_cons.append_stiff_trans_obj(obj, target, offset);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}
/**
 * Append a copy translation constraint.
 * @method module:constraints.append_copy_trans
 * @param {Object} obj Object ID
 * @param {Object} target Object ID
 * @param {Float32Array} offset Offset in world space
 */
exports.append_copy_trans = function(obj, target, offset) {
    m_cons.append_copy_trans_obj(obj, target, offset);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}
/**
 * Append a stiff translation/rotation constraint.
 * @method module:constraints.append_stiff_trans_rot
 * @param {Object} obj Object ID
 * @param {Object} target Object ID
 * @param {Float32Array} offset Offset in world space
 * @param {Float32Array} rotation_offset Rotation offset in world space
 */
exports.append_stiff_trans_rot = function(obj, target, offset, rotation_offset) {
    m_cons.append_stiff_trans_rot_obj(obj, target, offset, rotation_offset, 1.0);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}
/**
 * Append a track constraint.
 * @method module:constraints.append_track
 * @param {Object} obj Object ID
 * @param {(Object|Float32Array)} target Target object ID or vector
 */
exports.append_track = function(obj, target) {
    if (target.length == 3)
        m_cons.append_track_point(obj, target);
    else
        m_cons.append_track_obj(obj, target);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}
/**
 * Append a follow constraint.
 * @method module:constraints.append_follow
 * @param {Object} obj Object ID
 * @param {(Object|Float32Array)} target Target object ID or vector
 * @param {Number} offset_min Minimum offset
 * @param {Number} offset_max Maximum offset
 */
exports.append_follow = function(obj, target, offset_min, offset_max) {
    if (target.length == 3)
        m_cons.append_follow_point(obj, target, offset_min, offset_max);
    else
        m_cons.append_follow_obj(obj, target, offset_min, offset_max);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Append a stiff viewport constraint.
 * @method module:constraints.append_stiff_viewport
 * @param {Object} obj Object ID
 * @param {Object} camobj Camer object ID
 * @param {Number} x_rel X offset as fraction to camera height.
 * @param {Number} y_rel Y offset as fraction to camera height.
 * @param {Number} dist Distance from the camera
 */
exports.append_stiff_viewport = function(obj, camobj, positioning) {
    m_cons.append_stiff_viewport(obj, camobj, positioning);

    m_trans.update_transform(obj);
    m_phy.sync_transform(obj);
}

/**
 * Remove the object's constraint (if any).
 * @method module:constraints.remove
 * @param {Object} obj Object ID
 */
exports.remove = function(obj) {
    if (obj._constraint)
        m_cons.remove(obj);
}

/**
 * Get object's parent object.
 * @method module:constraints.get_parent
 * @param {Object} obj Object ID
 */
exports.get_parent = m_cons.get_parent;

}
