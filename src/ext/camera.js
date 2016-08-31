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
 * API for controlling the camera within the bounds of the current camera model.
 * Use {@link module:transform|Transform API} for low-level actions.<br>
 * All functions require a valid camera object reference. Use
 * {@link module:scenes.get_object_by_name|scenes.get_object_by_name()} or
 * {@link module:scenes.get_active_camera|scenes.get_active_camera()} to obtain it.
 * The result of applying various transforms to a camera can be overridden by the 
 * present camera limits.
 * <p>
 * <b>API examples for this module</b>: 
 * {@link https://www.blend4web.com/doc/en/camera.html#camera-controls-api|English}, 
 * {@link https://www.blend4web.com/doc/ru/camera.html#camera-controls-api|Russian}.
 * </p>
 * @module camera
 * @local DistanceLimits
 * @local VerticalRotationLimits
 * @local HorizontalRotationLimits
 * @local HoverAngleLimits
 * @local VerticalTranslationLimits
 * @local HorizontalTranslationLimits
 * @local PivotLimits
 * @local VelocityParams
 * @local FrustumPlanes
 */
b4w.module["camera"] = function(exports, require) {

var m_cam      = require("__camera");
var m_cfg      = require("__config");
var m_cons     = require("__constraints");
var m_cont     = require("__container");
var m_mat4     = require("__mat4");
var m_math     = require("__math");
var m_obj_util = require("__obj_util");
var m_phy      = require("__physics");
var m_print    = require("__print");
var m_scs      = require("__scenes");
var m_trans    = require("__transform");
var m_tsr      = require("__tsr");
var m_util     = require("__util");
var m_vec3     = require("__vec3");
var m_vec4     = require("__vec4");

var cfg_ctl = m_cfg.controls;

var _vec2_tmp = new Float32Array(2);
var _vec3_tmp = new Float32Array(3);
var _vec3_tmp2 = new Float32Array(3);
var _vec4_tmp = new Float32Array(4);
var _mat3_tmp = new Float32Array(9);
var _limits_tmp = {};
var _limits_tmp2 = {};

/**
 * An object that defines distance limits for the HOVER/TARGET camera.
 * The "min" value must be less or equal than the "max" value.
 * @typedef {Object} DistanceLimits
 * @property {Number} min The minimum distance to the pivot.
 * @property {Number} max The maximum distance to the pivot.
 * @cc_externs min max
 */

/**
 * An object that defines limits for rotations in a vertical plane for the TARGET/EYE camera.
 * The limits are converted by engine into the range [-Pi, Pi] when set via API.
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @typedef {Object} VerticalRotationLimits
 * @property {Number} down The elevation angle in radians that restricts a downward rotation.
 * @property {Number} up The elevation angle in radians that restricts an upward rotation.
 * @property {Boolean} [camera_space=false] Define limits relative to the current
 * camera position/orientation, otherwise - in world space (by default).
 * @cc_externs down up camera_space
 */

/**
 * An object that defines limits for rotations in a horizontal plane for the TARGET/EYE camera.
 * The limits are converted by engine into the range [0, 2Pi] when set via API.
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @typedef {Object} HorizontalRotationLimits
 * @property {Number} left The azimuth angle in radians that restricts a leftward rotation.
 * @property {Number} right The azimuth angle in radians that restricts a rightward rotation.
 * @property {Boolean} [camera_space=false] Define limits relative to the current
 * camera position/orientation, otherwise - in world space (by default).
 * @cc_externs left right camera_space
 */

/**
 * An object that defines limits for rotations in a vertical plane for the HOVER camera.
 * The limits are converted by engine into the range [-Pi, Pi] and then clamped
 * to be in range [-Pi/2, 0] when set via API.
 * The "down" value must be greater or equal than the "up" value.
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @typedef {Object} HoverAngleLimits
 * @property {Number} down The elevation angle in radians that restricts a downward rotation.
 * @property {Number} up The elevation angle in radians that restricts an upward rotation.
 * @cc_externs down up
 */

/**
 * An object that defines limits for translations along the Z axis for the HOVER camera.
 * The "min" value must be less or equal than the "max" value.
 * @see https://www.blend4web.com/doc/en/camera.html#hover-translation-limits
 * @typedef {Object} VerticalTranslationLimits
 * @property {Number} min The minimum value that restricts camera translation along the Z axis.
 * @property {Number} max The maximum value that restricts camera translation along the Z axis.
 * @cc_externs min max
 */

/**
 * An object that defines limits for translations along the X axis for the HOVER camera.
 * The "min" value must be less or equal than the "max" value.
 * @see https://www.blend4web.com/doc/en/camera.html#hover-translation-limits
 * @typedef {Object} HorizontalTranslationLimits
 * @property {Number} min The minimum value that restricts camera translation along the X axis.
 * @property {Number} max The maximum value that restricts camera translation along the X axis.
 * @cc_externs min max
 */

/**
 * An object that defines limits for translations along the Y axis for the 
 * camera pivot point.
 * @typedef {Object} PivotLimits
 * @property {Number} min_y The minimum value that restricts pivot translation 
 * along the Y axis.
 * @property {Number} max_y The maximum value that restricts pivot translation 
 * along the Y axis.
 * @cc_externs min_y max_y
 */

/**
 * An object that defines velocity of the camera movement.
 * @typedef {Object} VelocityParams
 * @property {Number} [trans=Current velocity value] Translation velocity ([0,Infinity]).
 * @property {Number} [rot=Current velocity value] Rotation velocity ([0,Infinity]).
 * @property {Number} [zoom=Current velocity value] Zoom velocity ([0,1]).
 * @cc_externs trans rot zoom
 */

/**
 * An object that defines the STATIC camera parameters.
 * @typedef {Object} StaticCameraParams
 * @property {?Vec3} [pos=null] Position of the camera. Set to null to keep the current 
 * camera position.
 * @property {?Vec3} [look_at=null] Point the camera is looking at. Set to null to 
 * keep the existing camera orientation.
 * @cc_externs pos look_at
 */

/**
 * An object that defines the EYE camera parameters.
 * @typedef {Object} EyeCameraParams
 * @property {?Vec3} [pos=null] Position of the camera. Set to null to keep the 
 * current camera position.
 * @property {?Vec3} [look_at=null] Point the camera is looking at. Set to null 
 * to keep the existing camera orientation.
 * @property {?HorizontalRotationLimits} [horiz_rot_lim=null] Horizontal rotation 
 * limits. Set to null to disable the limits.
 * @property {?VerticalRotationLimits} [vert_rot_lim=null] Vertical rotation limits. 
 * Set to null to disable the limits.
 * @cc_externs pos look_at horiz_rot_lim vert_rot_lim
 */

/**
 * An object that defines the TARGET camera parameters.
 * @typedef {Object} TargetCameraParams
 * @property {?Vec3} [pos=null] Position of the camera. Set to null to keep the 
 * current camera position.
 * @property {Vec3} pivot Camera pivot point.
 * @property {?HorizontalRotationLimits} [horiz_rot_lim=null] Horizontal 
 * rotation limits. Set to null to disable the limits.
 * @property {?VerticalRotationLimits} [vert_rot_lim=null] Vertical rotation 
 * limits. Set to null to disable the limits.
 * @property {?DistanceLimits} [dist_lim=null] Distance limits. Set to null to 
 * disable the limits.
 * @property {?PivotLimits} [pivot_lim=null] Pivot limits. Set to 
 * null to disable the limits.
 * @property {Boolean} [use_panning=false] Use panning mode.
 * @cc_externs pos pivot horiz_rot_lim vert_rot_lim dist_lim use_panning
 */

/**
 * An object that defines the HOVER camera parameters.
 * @typedef {Object} HoverCameraParams
 * @property {?Vec3} [pos=null] Position of the camera. Set to null to keep the 
 * current camera position.
 * @property {Vec3} pivot Camera pivot point.
 * @property {?DistanceLimits} [dist_lim=null] Distance limits. Set to null to 
 * define the limits as fixed distance to the pivot which depends on the 
 * given pivot and camera positions.
 * @property {?HoverAngleLimits} [hover_angle_lim=null] Hover angle limits. 
 * Set to null to define the limits as fixed angle which depends on the given 
 * pivot and camera positions.
 * @property {?HorizontalTranslationLimits} [horiz_trans_lim=null] Horizontal 
 * translation limits. Set to null to disable the limits.
 * @property {?VerticalTranslationLimits} [vert_trans_lim=null] Vertical 
 * translation limits. Set to null to disable the limits.
 * @property {Boolean} [enable_horiz_rot=false] Enable horizontal rotation.
 * @cc_externs pos pivot dist_lim hover_angle_lim horiz_trans_lim vert_trans_lim
 * @cc_externs enable_horiz_rot
 */

/**
 * An object that defines the HOVER camera parameters.
 * @typedef {Object} HoverCameraParamsRel
 * @property {?Vec3} [pos=null] Position of the camera. Set to null to keep the 
 * current camera position.
 * @property {Vec3} pivot Camera pivot point.
 * @property {Number} [dist_interval=0] A distance variation around the established 
 * distance to the pivot: distance ± dist_interval/2. The resulted distance 
 * limits are clamped to be in range [0, +∞].
 * @property {Number} [angle_interval=0] A hover angle variation around the established
 * hover angle: hover angle ± angle_interval/2. The resulted hover angle limits 
 * are clamped to be in range [-PI/2, 0].
 * @property {Number} [t=0.5] An optional parameter which lies in range [0, 1] 
 * and defines the disposition of the given angle and distance intervals around 
 * the established values, for example: 
 * 0 - the given camera position is the nearest zoomed-in point, 
 * 1 - the given camera position is the farthest zoomed-out point, 
 * 0.5 (by default) - the given camera position is in the middle of the given 
 * intervals and can be zoomed equally in both directions.
 * @cc_externs pos pivot dist_interval angle_interval t
 */

 /**
 * Camera frustum planes object.
 * @typedef {Object} FrustumPlanes
 * @property {Plane} Left frustum plane.
 * @property {Plane} Right frustum plane.
 * @property {Plane} Top frustum plane.
 * @property {Plane} Bottom frustum plane.
 * @property {Plane} Near frustum plane.
 * @property {Plane} Far frustum plane.
 * @cc_externs left right top bottom near far
 */

/**
 * The camera's movement style: STATIC (non-interactive).
 * @const {CameraMoveStyle} module:camera.MS_STATIC
 */
exports.MS_STATIC = m_cam.MS_STATIC;
/**
 * The camera's movement style: TARGET.
 * @const {CameraMoveStyle} module:camera.MS_TARGET_CONTROLS
 */
exports.MS_TARGET_CONTROLS = m_cam.MS_TARGET_CONTROLS;
/**
 * The camera's movement style: EYE.
 * @const {CameraMoveStyle} module:camera.MS_EYE_CONTROLS
 */
exports.MS_EYE_CONTROLS = m_cam.MS_EYE_CONTROLS;
/**
 * The camera's movement style: HOVER.
 * @const {CameraMoveStyle} module:camera.MS_HOVER_CONTROLS
 */
exports.MS_HOVER_CONTROLS = m_cam.MS_HOVER_CONTROLS;

/**
 * Setup the STATIC camera.
 * @method module:camera.static_setup
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?StaticCameraParams} [params=null] The parameters of the STATIC camera.
 */
exports.static_setup = function(camobj, params) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("static_setup(): Wrong camera object");
        return;
    }

    m_cam.wipe_move_style(camobj);
    camobj.render.move_style = m_cam.MS_STATIC;

    if (params) {
        var pos = params.pos || m_tsr.get_trans_view(camobj.render.world_tsr);
        if (params.look_at)
            m_cam.set_look_at(camobj, pos, params.look_at);
        else
            m_trans.set_translation(camobj, pos);
    }

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);

    // init ortho properties after the camera was updated
    m_cam.init_ortho_props(camobj);
}

/**
 * Set position and orientation for the STATIC camera.
 * @method module:camera.static_set_look_at
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?Vec3} [pos=null] Position of the camera. Pass null to keep the current 
 * camera position.
 * @param {?Vec3} [look_at=null] Point the camera is looking at. Pass null to 
 * keep the existing camera orientation.
 */
exports.static_set_look_at = function(camobj, pos, look_at) {
    if (!m_cam.is_static_camera(camobj)) {
        m_print.error("static_set_look_at(): Wrong camera object or camera move style");
        return;
    }

    pos = pos || m_tsr.get_trans_view(camobj.render.world_tsr);
    if (look_at)
        m_cam.set_look_at(camobj, pos, look_at);
    else
        m_trans.set_translation(camobj, pos);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
};

/**
 * Set the STATIC camera's rotation from quaternion.
 * @method module:camera.static_set_rotation
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Quat} quat Quaternion vector.
 */
exports.static_set_rotation = function(camobj, quat) {
    if (!m_cam.is_static_camera(camobj)) {
        m_print.error("static_set_rotation(): Wrong camera object or camera move style");
        return;
    }

    m_trans.set_rotation(camobj, quat);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
};

/**
 * Get the STATIC camera's rotation quaternion.
 * @method module:camera.static_get_rotation
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?Quat} [dest=new Float32Array(4);] Destination vector.
 * @returns {?Quat} Destination vector.
 */
exports.static_get_rotation = function(camobj, dest) {
    if (!m_cam.is_static_camera(camobj)) {
        m_print.error("static_get_rotation(): Wrong camera object or camera move style");
        return null;
    }

    dest = dest || new Float32Array(4);
    return m_trans.get_rotation(camobj, dest);
};

/**
 * Setup the EYE camera.
 * @method module:camera.eye_setup
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?EyeCameraParams} [params=null] The parameters of the EYE camera.
 */
exports.eye_setup = function(camobj, params) {

    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("eye_setup(): Wrong camera object");
        return;
    }
    if (params && params.horiz_rot_lim)
        if (typeof params.horiz_rot_lim.left != "number" 
                || typeof params.horiz_rot_lim.right != "number") {
            m_print.error("eye_setup(): Wrong horizontal limits object.");
            return;
        }
    if (params && params.vert_rot_lim)
        if (typeof params.vert_rot_lim.down != "number" 
                || typeof params.vert_rot_lim.up != "number") {
            m_print.error("eye_setup(): Wrong vertical limits object.");
            return;
        }

    m_cam.wipe_move_style(camobj);
    camobj.render.move_style = m_cam.MS_EYE_CONTROLS;

    if (params) {
        var pos = params.pos || m_tsr.get_trans_view(camobj.render.world_tsr);
        m_cam.setup_eye_model(camobj, pos, params.look_at, params.horiz_rot_lim, 
                params.vert_rot_lim);
    }

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);

    // init ortho after the camera was updated
    m_cam.init_ortho_props(camobj);
}

/**
 * Set position and orientation for the EYE camera.
 * @method module:camera.eye_set_look_at
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?Vec3} [pos=null] Position of the camera. Pass null to keep the current 
 * camera position.
 * @param {?Vec3} [look_at=null] Point the camera is looking at. Pass null to 
 * keep the existing camera orientation.
 */
exports.eye_set_look_at = function(camobj, pos, look_at) {
    if (!m_cam.is_eye_camera(camobj)) {
        m_print.error("eye_set_look_at(): Wrong camera object or camera move style");
        return;
    }

    pos = pos || m_tsr.get_trans_view(camobj.render.world_tsr);
    if (look_at)
        m_cam.set_look_at_corrected(camobj, pos, look_at);
    else
        m_trans.set_translation(camobj, pos);

    m_cons.correct_up(camobj, camobj.render.vertical_axis, true);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
};

/**
 * Rotate the EYE camera counterclockwise (CCW) around its origin by the given angles.
 * Performs delta rotation or sets the camera's absolute rotation depending on 
 * the "*_is_abs" parameters.
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @method module:camera.eye_rotate
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Number} phi Azimuth angle in radians.
 * @param {Number} theta Elevation angle in radians.
 * @param {Boolean} [phi_is_abs=false] Performs delta rotation if FALSE, sets 
 * camera's absolute rotation if TRUE.
 * @param {Boolean} [theta_is_abs=false] Performs delta rotation if FLASE, sets 
 * camera's absolute rotation if TRUE.
 */
exports.eye_rotate = function(camobj, phi, theta, phi_is_abs, theta_is_abs) {
    if (!m_cam.is_eye_camera(camobj)) {
        m_print.error("eye_rotate(): Wrong camera object or camera move style");
        return;
    }

    phi_is_abs = phi_is_abs || false;
    theta_is_abs = theta_is_abs || false;
    m_cam.rotate_eye_camera(camobj, phi, theta, phi_is_abs, theta_is_abs);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Set vertical rotation limits for the EYE camera.
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @method module:camera.eye_set_vertical_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?VerticalRotationLimits} [limits=null] Vertical rotation limits. 
 * Pass null to disable the limits.
 */
exports.eye_set_vertical_limits = function(camobj, limits) {
    if (!m_cam.is_eye_camera(camobj)) {
        m_print.error("eye_set_vertical_limits(): Wrong camera object or camera move style");
        return;
    }

    if (limits)
        if (typeof limits.down != "number" || typeof limits.up != "number") {
            m_print.error("eye_set_vertical_limits(): Incorrect limits object.");
            return;
        }

    m_cam.set_vertical_rot_limits(camobj, limits);
    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Get vertical rotation limits of the EYE camera (converted to the [-Pi, Pi] range).
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @method module:camera.eye_get_vertical_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?VerticalRotationLimits} [dest=new Object();] The receiving object.
 * @param {Boolean} [local=false] Use camera local space representation.
 * @returns {?VerticalRotationLimits} Vertical rotation limits or null if disabled.
 */
exports.eye_get_vertical_limits = function(camobj, dest, local) {
    if (!m_cam.is_eye_camera(camobj)) {
        m_print.error("eye_get_vertical_limits(): Wrong camera object or camera move style");
        return null;
    }

    var render = camobj.render;
    if (render.vertical_limits) {
        dest = dest || {};
        if (local) {
            dest.down = render.vertical_limits.down_local;
            dest.up = render.vertical_limits.up_local;
        } else {
            dest.down = render.vertical_limits.down;
            dest.up = render.vertical_limits.up;
        }
        dest.camera_space = local || false;
        return dest;
    } else
        return null;
}

/**
 * Set horizontal rotation limits for the EYE camera.
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @method module:camera.eye_set_horizontal_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?HorizontalRotationLimits} [limits=null] Horizontal rotation limits. 
 * Pass null to disable the limits.
 */
exports.eye_set_horizontal_limits = function(camobj, limits) {
    if (!m_cam.is_eye_camera(camobj)) {
        m_print.error("eye_set_horizontal_limits(): Wrong camera object or camera move style");
        return;
    }

    if (limits)
        if (typeof limits.left != "number" || typeof limits.right != "number") {
            m_print.error("eye_set_horizontal_limits(): Incorrect limits object.");
            return;
        }

    m_cam.set_horizontal_rot_limits(camobj, limits);
    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Get horizontal angle limits of the EYE camera (converted to the [0, 2Pi] range).
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @method module:camera.eye_get_horizontal_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?HorizontalRotationLimits} [dest=new Object();] The receiving object.
 * @param {Boolean} [local=false] Use camera local space representation.
 * @returns {?HorizontalRotationLimits} Horizontal rotation limits or null if disabled.
 */
exports.eye_get_horizontal_limits = function(camobj, dest, local) {
    if (!m_cam.is_eye_camera(camobj)) {
        m_print.error("eye_get_horizontal_limits(): Wrong camera object or camera move style");
        return null;
    }

    var render = camobj.render;
    if (render.horizontal_limits) {
        dest = dest || {};
        if (local) {
            dest.left = render.horizontal_limits.left_local;
            dest.right = render.horizontal_limits.right_local;
        } else {
            dest.left = render.horizontal_limits.left;
            dest.right = render.horizontal_limits.right;
        }
        dest.camera_space = local || false;
        return dest;
    } else
        return null;
}

/**
 * Setup the TARGET camera.
 * @method module:camera.target_setup
 * @param {Object3D} camobj Camera 3D-object.
 * @param {TargetCameraParams} params The parameters of the TARGET camera.
 */
exports.target_setup = function(camobj, params) {

    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("target_setup(): Wrong camera object");
        return;
    }
    if (params.horiz_rot_lim)
        if (typeof params.horiz_rot_lim.left != "number" 
                || typeof params.horiz_rot_lim.right != "number") {
            m_print.error("target_setup(): Wrong horizontal limits object");
            return;
        }
    if (params.vert_rot_lim)
        if (typeof params.vert_rot_lim.down != "number" 
                || typeof params.vert_rot_lim.up != "number") {
            m_print.error("target_setup(): Wrong vertical limits object");
            return;
        }
    if (params.dist_lim) {
        if (typeof params.dist_lim.min != "number" 
                || typeof params.dist_lim.max != "number" 
                || params.dist_lim.min > params.dist_lim.max) {
            m_print.error("target_setup(): Wrong distance limits object");
            return;
        }
        params.dist_lim.min = Math.max(params.dist_lim.min, 0);
        params.dist_lim.max = Math.max(params.dist_lim.max, 0);
    }

    if (params.pivot_lim) {
        if (typeof params.pivot_lim.min_y != "number" 
                || typeof params.pivot_lim.max_y != "number" 
                || params.pivot_lim.min_y > params.pivot_lim.max_y) {
            m_print.error("target_setup(): Wrong pivot limits object");
            return;
        }
    }

    m_cam.wipe_move_style(camobj);
    camobj.render.move_style = m_cam.MS_TARGET_CONTROLS;

    var pos = params.pos || m_tsr.get_trans_view(camobj.render.world_tsr);
    m_cam.setup_target_model(camobj, pos, params.pivot, params.horiz_rot_lim, 
            params.vert_rot_lim, params.dist_lim, params.pivot_lim, 
            params.use_panning || false);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);

    // init ortho after the camera was updated
    m_cam.init_ortho_props(camobj);
}

/**
 * Rotate the TARGET camera counterclockwise (CCW) around its pivot by the given 
 * angles.
 * Performs delta rotation or sets the camera's absolute rotation depending on 
 * the "*_is_abs" parameters.
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @method module:camera.target_rotate
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Number} phi Azimuth angle in radians.
 * @param {Number} theta Elevation angle in radians.
 * @param {Boolean} [phi_is_abs=false] Performs delta rotation if FALSE, sets 
 * camera's absolute rotation if TRUE.
 * @param {Boolean} [theta_is_abs=false] Performs delta rotation if FALSE, sets 
 * camera's absolute rotation if TRUE.
 */
exports.target_rotate = function(camobj, phi, theta, phi_is_abs, theta_is_abs) {
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("target_rotate(): Wrong camera object or camera move style");
        return;
    }

    phi_is_abs = phi_is_abs || false;
    theta_is_abs = theta_is_abs || false;
    m_cam.rotate_target_camera(camobj, phi, theta, phi_is_abs, theta_is_abs);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Set translation and pivot point for the TARGET camera.
 * The result of this operation can be corrected by existing limits.
 * @method module:camera.target_set_trans_pivot
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?Vec3} [trans=null] Translation vector. Pass null to keep the current 
 * camera position.
 * @param {?Vec3} [pivot=null] Pivot vector. Pass null to keep the current pivot 
 * point.
 */
exports.target_set_trans_pivot = function(camobj, trans, pivot) {
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("target_set_trans_pivot(): Wrong camera object or camera move style");
        return;
    }

    trans = trans || m_tsr.get_trans_view(camobj.render.world_tsr);
    pivot = pivot || camobj.render.pivot;
    m_cam.set_trans_pivot(camobj, trans, pivot);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Performs parallel translation for the TARGET camera. It works as similar as
 * the set_translation() method but uses the camera pivot to perform the translation.
 * @method module:camera.target_set_pivot_translation
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Vec3} trans New pivot position.
 */
exports.target_set_pivot_translation = function(camobj, trans) {
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("target_set_pivot_translation(): Wrong camera object or camera move style");
        return;
    }

    m_cam.set_target_pivot(camobj, trans);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Set distance to the pivot point for the TARGET camera.
 * The result of this operation can be corrected by existing limits.
 * @method module:camera.target_set_distance
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Number} distance Distance to the pivot point.
 */
exports.target_set_distance = function(camobj, distance) {
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("target_set_distance(): Wrong camera object or camera move style");
        return;
    }

    var dist_curr = m_trans.obj_point_distance(camobj, camobj.render.pivot);
    var dist_needed = Math.max(0, distance);

    // +y move backward
    m_trans.move_local(camobj, 0, dist_needed - dist_curr, 0);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Get distance to the pivot point for the TARGET camera.
 * @method module:camera.target_get_distance
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {Number} Distance to the pivot point.
 */
exports.target_get_distance = function(camobj) {
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("target_get_distance(): Wrong camera object or camera move style");
        return 0;
    }

    return m_trans.obj_point_distance(camobj, camobj.render.pivot);
}

/**
 * Zoom the TARGET camera to the object.
 * @method module:camera.target_zoom_object
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Object3D} obj Object 3D.
 */
exports.target_zoom_object = function(camobj, obj) {
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("target_zoom_object(): Wrong camera object or camera move style");
        return;
    }

    var center = m_trans.get_object_center(obj, false, _vec3_tmp);

    var radius = m_trans.get_object_size(obj);
    var active_scene = m_scs.get_active();
    var cam_scene_data = m_obj_util.get_scene_data(camobj, active_scene);
    var main_camera = cam_scene_data.cameras[0];
    var ang_radius = m_cam.get_angular_diameter(main_camera) / 2;
    var dist_need = radius / Math.sin(ang_radius);
    var dist_current = m_trans.obj_point_distance(camobj, center);

    m_cam.set_trans_pivot(camobj, m_tsr.get_trans_view(camobj.render.world_tsr), center);
    // TODO: excess update
    m_trans.update_transform(camobj);

    // +y move backward
    m_trans.move_local(camobj, 0, dist_need - dist_current, 0);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Get the pivot point of the TARGET camera.
 * @method module:camera.target_get_pivot
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?Vec3} [dest=new Float32Array(3);] Pivot destination vector.
 * @returns {?Vec3} Pivot destination vector.
 */
exports.target_get_pivot = function(camobj, dest) {
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("target_get_pivot(): Wrong camera object or camera move style");
        return null;
    }

    dest = dest || new Float32Array(3);
    m_vec3.copy(camobj.render.pivot, dest);
    return dest;
}

/**
 * Set distance limits for the TARGET camera.
 * @method module:camera.target_set_distance_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?DistanceLimits} [limits=null] Distance limits. Pass null to disable 
 * the limits.
 */
exports.target_set_distance_limits = function(camobj, limits) {
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("target_set_distance_limits(): Wrong camera object or camera move style");
        return;
    }

    if (limits) {
        if (typeof limits.min != "number" || typeof limits.max != "number" 
                || limits.min > limits.max) {
            m_print.error("target_set_distance_limits(): Wrong limits object");
            return;
        }
        limits.min = Math.max(limits.min, 0);
        limits.max = Math.max(limits.max, 0);
    }

    m_cam.set_distance_limits(camobj, limits);
    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Get distance limits of the TARGET camera.
 * @method module:camera.target_get_distance_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?DistanceLimits} [dest=new Object();] The receiving object.
 * @returns {?DistanceLimits} Distance limits or null if disabled.
 */
exports.target_get_distance_limits = function(camobj, dest) {
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("target_get_distance_limits(): Wrong camera object or camera move style");
        return null;
    }

    var render = camobj.render;
    if (render.distance_limits) {
        dest = dest || {};
        dest.min = render.distance_limits.min;
        dest.max = render.distance_limits.max;
        return dest;
    } else
        return null;
}

/**
 * Set vertical rotation limits for the TARGET camera.
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @method module:camera.target_set_vertical_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?VerticalRotationLimits} [limits=null] Vertical rotation limits. 
 * Pass null to disable the limits.
 */
exports.target_set_vertical_limits = function(camobj, limits) {
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("target_set_vertical_limits(): Wrong camera object or camera move style");
        return;
    }

    if (limits)
        if (typeof limits.down != "number" || typeof limits.up != "number") {
            m_print.error("target_set_vertical_limits(): Wrong limits object");
            return;
        }

    m_cam.set_vertical_rot_limits(camobj, limits);
    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Get vertical rotation limits of the TARGET camera (converted to the [-Pi, Pi] range).
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @method module:camera.target_get_vertical_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?VerticalRotationLimits} [dest=new Object();] The receiving object.
 * @param {Boolean} [local=false] Use camera local space representation.
 * @returns {?VerticalRotationLimits} Vertical rotation limits or null if disabled.
 */
exports.target_get_vertical_limits = function(camobj, dest, local) {
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("target_get_vertical_limits(): Wrong camera object or camera move style");
        return null;
    }

    var render = camobj.render;
    if (render.vertical_limits) {
        dest = dest || {};
        if (local) {
            dest.down = render.vertical_limits.down_local;
            dest.up = render.vertical_limits.up_local;
        } else {
            dest.down = render.vertical_limits.down;
            dest.up = render.vertical_limits.up;
        }
        dest.camera_space = local || false;
        return dest;
    } else
        return null;
}

/**
 * Set horizontal rotation limits for the TARGET camera.
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @method module:camera.target_set_horizontal_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?HorizontalRotationLimits} [limits=null] Horizontal rotation limits.
 * Pass null to disable the limits.
 */
exports.target_set_horizontal_limits = function(camobj, limits) {
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("target_set_horizontal_limits(): Wrong camera object or camera move style");
        return;
    }

    if (limits)
        if (typeof limits.left != "number" || typeof limits.right != "number") {
            m_print.error("target_set_horizontal_limits(): Wrong limits object");
            return;
        }

    m_cam.set_horizontal_rot_limits(camobj, limits);
    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Get horizontal rotation limits of the TARGET camera (converted to the [0, 2Pi] range).
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @method module:camera.target_get_horizontal_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?HorizontalRotationLimits} [dest=new Object();] The receiving object.
 * @param {Boolean} [local=false] Use camera local space representation.
 * @returns {?HorizontalRotationLimits} Horizontal rotation limits or null if disabled.
 */
exports.target_get_horizontal_limits = function(camobj, dest, local) {
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("target_get_horizontal_limits(): Wrong camera object or camera move style");
        return null;
    }

    var render = camobj.render;
    if (render.horizontal_limits) {
        dest = dest || {};
        if (local) {
            dest.left = render.horizontal_limits.left_local;
            dest.right = render.horizontal_limits.right_local;
        } else {
            dest.left = render.horizontal_limits.left;
            dest.right = render.horizontal_limits.right;
        }
        dest.camera_space = local || false;
        return dest;
    } else
        return null;
}

/**
 * Set pivot limits for the TARGET camera.
 * @method module:camera.target_set_pivot_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?PivotLimits} [limits=null] Pivot limits. Pass null to 
 * disable the limits.
 */
exports.target_set_pivot_limits = function(camobj, limits) {
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("target_set_pivot_limits(): Wrong camera object or camera move style");
        return;
    }

    if (limits) {
        if (typeof limits.min_y != "number" || typeof limits.max_y != "number" 
                || limits.min_y > limits.max_y) {
            m_print.error("target_set_pivot_limits(): Wrong limits object");
            return;
        }
    }

    m_cam.set_pivot_limits(camobj, limits);
    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Get pivot limits of the TARGET camera.
 * @method module:camera.target_get_pivot_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?PivotLimits} [dest=new Object();] The receiving object.
 * @returns {?PivotLimits} pivot limits or null if disabled.
 */
exports.target_get_pivot_limits = function(camobj, dest) {
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("target_get_pivot_limits(): Wrong camera object or camera move style");
        return null;
    }

    var render = camobj.render;
    if (render.pivot_limits) {
        dest = dest || {};
        dest.min_y = render.pivot_limits.min_y;
        dest.max_y = render.pivot_limits.max_y;
        return dest;
    } else
        return null;
}

/**
 * Translate the pivot point of the TARGET camera in screen space.
 * Translation distance is defined with absolute value of parameters.
 * +h from left to right
 * +v from down to up
 * @method module:camera.target_pan_pivot
 * @param {Object3D} camobj Camera 3D-object
 * @param {Number} trans_h_delta Absolute delta of the horizontal translation.
 * @param {Number} trans_v_delta Absolute delta of the vertical translation.
 */
exports.target_pan_pivot = function(camobj, trans_h_delta, trans_v_delta) {
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("target_pan_pivot(): wrong object");
        return;
    }

    var render = camobj.render;

    if (render.use_panning) {
        var trans_vector = _vec3_tmp;
        trans_vector[0] = trans_h_delta;
        trans_vector[1] = 0;
        trans_vector[2] = trans_v_delta;

        m_tsr.transform_dir_vec3(trans_vector, render.world_tsr, trans_vector);

        m_vec3.add(render.pivot, trans_vector, render.pivot);

        var cam_trans = m_tsr.get_trans_view(render.world_tsr);
        m_vec3.add(cam_trans, trans_vector, cam_trans);

        m_trans.update_transform(camobj);
        m_phy.sync_transform(camobj);
    }
}

/**
 * Enable/disable panning for the TARGET camera.
 * @method module:camera.target_switch_panning
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Boolean} enable Enable or disable panning.
 */
exports.target_switch_panning = function(camobj, enable) {
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("target_switch_panning(): Wrong camera object or camera move style");
        return null;
    }

    camobj.render.use_panning = enable;
}

/**
 * Setup HOVER camera model with the distance and hover angle limits defined as 
 * variations around the current values which depend on the given camera/pivot 
 * positions.
 * @method module:camera.hover_setup_rel
 * @param {Object3D} camobj Camera 3D-object.
 * @param {HoverCameraParamsRel} params The parameters of the HOVER camera.
 */
exports.hover_setup_rel = function(camobj, params) {
    exports.hover_setup(camobj, { pos: params.pos, pivot: params.pivot });

    if (typeof params.dist_interval == "undefined")
        var dist_interval = 0;
    else
        var dist_interval = Math.max(params.dist_interval, 0);

    if (typeof params.angle_interval == "undefined")
        var angle_interval = 0;
    else
        var angle_interval = Math.max(params.angle_interval, 0);

    if (typeof params.t == "undefined")
        var t = 0.5;
    else
        var t = m_util.clamp(params.t, 0, 1);        

    var dist_lim = exports.hover_get_distance_limits(camobj, _limits_tmp);
    dist_lim.min = Math.max(dist_lim.min - t * dist_interval, 0);
    dist_lim.max = dist_lim.max + (1 - t) * dist_interval;

    var ha_lim = exports.hover_get_vertical_limits(camobj, _limits_tmp2);
    ha_lim.down = m_util.clamp(ha_lim.down + t * angle_interval, -Math.PI/2, 0);
    ha_lim.up = m_util.clamp(ha_lim.up - (1 - t) * angle_interval, -Math.PI/2, 0);

    m_cam.hover_set_distance_limits(camobj, dist_lim);
    m_cam.hover_set_vertical_limits(camobj, ha_lim);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);

    // init ortho after the camera was updated
    m_cam.init_ortho_props(camobj);
}

/**
 * Setup HOVER camera model.
 * @method module:camera.hover_setup
 * @param {Object3D} camobj Camera 3D-object.
 * @param {HoverCameraParams} params The parameters of the HOVER camera.
 */
exports.hover_setup = function(camobj, params) {

    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("hover_setup(): Wrong camera object");
        return;
    }

    if (params.dist_lim) {
        if (typeof params.dist_lim.min != "number" 
                || typeof params.dist_lim.max != "number"
                || params.dist_lim.min > params.dist_lim.max) {
            m_print.error("hover_setup(): Wrong distance limits object");
            return;
        }
        params.dist_lim.min = Math.max(params.dist_lim.min, 0);
        params.dist_lim.max = Math.max(params.dist_lim.max, 0);
    }
    if (params.hover_angle_lim)
        if (typeof params.hover_angle_lim.down != "number" 
                || typeof params.hover_angle_lim.up != "number"
                || params.hover_angle_lim.down < params.hover_angle_lim.up) {
            m_print.error("hover_setup(): Wrong hover angle limits object");
            return;
        }
    if (params.horiz_trans_lim)
        if (typeof params.horiz_trans_lim.min != "number" 
                || typeof params.horiz_trans_lim.max != "number"
                || params.horiz_trans_lim.min > params.horiz_trans_lim.max) {
            m_print.error("hover_setup(): Wrong horizontal translation limits object");
            return;
        }
    if (params.vert_trans_lim)
        if (typeof params.vert_trans_lim.min != "number" 
                || typeof params.vert_trans_lim.max != "number"
                || params.vert_trans_lim.min > params.vert_trans_lim.max) {
            m_print.error("hover_setup(): Wrong vertical translation limits object");
            return;
        }

    m_cam.wipe_move_style(camobj);
    camobj.render.move_style = m_cam.MS_HOVER_CONTROLS;

    var pos = params.pos || m_tsr.get_trans_view(camobj.render.world_tsr);
    m_cam.setup_hover_model(camobj, pos, params.pivot, params.dist_lim, 
            params.hover_angle_lim, params.horiz_trans_lim, 
            params.vert_trans_lim, params.enable_horiz_rot || false);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);

    // init ortho after the camera was updated
    m_cam.init_ortho_props(camobj);
}

/**
 * Rotate the HOVER camera around its pivot by the given angles.
 * Performs delta rotation or sets the camera's absolute rotation depending on 
 * the "*_is_abs" parameters.
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @method module:camera.hover_rotate
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Number} phi Azimuth angle in radians
 * @param {Number} theta Elevation angle in radians
 * @param {Boolean} [phi_is_abs=false] Performs delta rotation if FALSE, sets 
 * camera's absolute rotation if TRUE.
 * @param {Boolean} [theta_is_abs=false] Performs delta rotation if FALSE, sets 
 * camera's absolute rotation if TRUE.
 */
exports.hover_rotate = function(camobj, phi, theta, phi_is_abs, theta_is_abs) {
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("hover_rotate(): Wrong camera object or camera move style");
        return;
    }

    phi_is_abs = phi_is_abs || false;
    theta_is_abs = theta_is_abs || false;
    m_cam.rotate_hover_camera(camobj, phi, theta, phi_is_abs, theta_is_abs);
    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Performs parallel translation for the HOVER camera. It works as similar as
 * the set_translation() method but uses the camera pivot to perform the translation.
 * @method module:camera.hover_set_pivot_translation
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Vec3} trans New pivot position.
 */
exports.hover_set_pivot_translation = function(camobj, trans) {
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("hover_set_pivot_translation(): Wrong camera object or camera move style");
        return;
    }

    m_cam.set_hover_pivot(camobj, trans);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Get pivot position of the HOVER camera.
 * @method module:camera.hover_get_pivot
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Vec3} [dest=new Float32Array(3);] Destination vector for the pivot translation.
 * @returns {?Vec3} Destination vector for the pivot translation.
 */
exports.hover_get_pivot = function(camobj, dest) {
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("hover_get_pivot(): Wrong camera object or camera move style");
        return null;
    }

    dest = dest || new Float32Array(3);
    m_vec3.copy(camobj.render.hover_pivot, dest);
    return dest;
}

/**
 * Get distance to the pivot point for the HOVER camera.
 * @method module:camera.hover_get_distance
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {Number} Distance to the pivot.
 */
exports.hover_get_distance = function(camobj) {
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("hover_get_distance(): Wrong camera object or camera move style");
        return 0;
    }

    return m_trans.obj_point_distance(camobj, camobj.render.hover_pivot);
}

/**
 * Set vertical rotation (hover angle) limits for the HOVER camera.
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @method module:camera.hover_set_vertical_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {HoverAngleLimits} limits Hover angle limits
 */
exports.hover_set_vertical_limits = function(camobj, limits) {
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("hover_set_vertical_limits(): Wrong camera object or camera move style");
        return;
    }

    if (typeof limits.down != "number" || typeof limits.up != "number"
            || limits.down < limits.up) {
        m_print.error("hover_set_vertical_limits(): Wrong limits object");
        return;
    }

    m_cam.hover_set_vertical_limits(camobj, limits);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Get vertical rotation (hover angle) limits for the HOVER camera (converted to the [-Pi, 0] range).
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @method module:camera.hover_get_vertical_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?HoverAngleLimits} [dest=new Object();] The receiving object.
 * @returns {?HoverAngleLimits} Hover angle limits.
 */
exports.hover_get_vertical_limits = function(camobj, dest) {
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("hover_get_vertical_limits(): Wrong camera object or camera move style");
        return null;
    }

    var render = camobj.render;
    dest = dest || {};
    dest.down = render.vertical_limits.down;
    dest.up = render.vertical_limits.up;

    return dest;
}

/**
 * Set distance limits for the HOVER camera.
 * @method module:camera.hover_set_distance_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {DistanceLimits} limits Distance limits.
 */
exports.hover_set_distance_limits = function(camobj, limits) {
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("hover_set_distance_limits(): Wrong camera object or camera move style");
        return;
    }

    if (typeof limits.min != "number" || typeof limits.max != "number"
            || limits.min > limits.max) {
        m_print.error("hover_set_distance_limits(): Wrong limits object");
        return;
    }
    limits.min = Math.max(limits.min, 0);
    limits.max = Math.max(limits.max, 0);

    m_cam.hover_set_distance_limits(camobj, limits);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Get distance limits of the HOVER camera.
 * @method module:camera.hover_get_distance_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?DistanceLimits} [dest=new Object();] The receiving object.
 * @returns {?DistanceLimits} Distance limits.
 */
exports.hover_get_distance_limits = function(camobj, dest) {
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("hover_get_distance_limits(): Wrong camera object or camera move style");
        return null;
    }

    var render = camobj.render;
    dest = dest || {};
    dest.min = render.distance_limits.min;
    dest.max = render.distance_limits.max;
    return dest;
}

/**
 * Set vertical (along the Z axis) translation limits for the HOVER camera.
 * @see https://www.blend4web.com/doc/en/camera.html#hover-translation-limits
 * @method module:camera.hover_set_vert_trans_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?VerticalTranslationLimits} limits Vertical translation limits.
 * Pass null to disable the limits.
 */
exports.hover_set_vert_trans_limits = function(camobj, limits) {
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("hover_set_vert_trans_limits(): Wrong camera object or camera move style");
        return;
    }

    if (limits)
        if (typeof limits.min != "number" || typeof limits.max != "number"
                || limits.min > limits.max) {
            m_print.error("hover_set_vert_trans_limits(): Wrong limits object");
            return;
        }

    m_cam.set_vert_trans_limits(camobj, limits);
    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Get vertical translation limits of the HOVER camera.
 * @see https://www.blend4web.com/doc/en/camera.html#hover-translation-limits
 * @method module:camera.hover_get_vert_trans_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?VerticalTranslationLimits} [dest=new Object();] The receiving object.
 * @returns {?VerticalTranslationLimits} Vertical translation limits or null if disabled.
 */
exports.hover_get_vert_trans_limits = function(camobj, dest) {
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("hover_get_vert_trans_limits(): Wrong camera object or camera move style");
        return null;
    }

    var render = camobj.render;
    if (render.hover_vert_trans_limits) {
        dest = dest || {};
        dest.min = render.hover_vert_trans_limits.min;
        dest.max = render.hover_vert_trans_limits.max;
        return dest;
    } else
        return null;
}

/**
 * Set horizontal (along the X axis) translation limits for the HOVER camera.
 * @see https://www.blend4web.com/doc/en/camera.html#hover-translation-limits
 * @method module:camera.hover_set_horiz_trans_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?HorizontalTranslationLimits} limits Horizontal translation limits.
 * Pass null to disable the limits.
 */
exports.hover_set_horiz_trans_limits = function(camobj, limits) {
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("hover_set_horiz_trans_limits(): Wrong camera object or camera move style");
        return;
    }

    if (limits)
        if (typeof limits.min != "number" || typeof limits.max != "number"
                || limits.min > limits.max) {
            m_print.error("hover_set_horiz_trans_limits(): Wrong limits object");
            return;
        }

    m_cam.set_hor_trans_limits(camobj, limits);
    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Get horizontal translation limits of the HOVER camera.
 * @see https://www.blend4web.com/doc/en/camera.html#hover-translation-limits
 * @method module:camera.hover_get_horiz_trans_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?HorizontalTranslationLimits} [dest=new Object();] The receiving object.
 * @returns {?HorizontalTranslationLimits} Horizontal translation limits or null if disabled.
 */
exports.hover_get_horiz_trans_limits = function(camobj, dest) {
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("hover_get_horiz_trans_limits(): Wrong camera object or camera move style");
        return null;
    }

    var render = camobj.render;
    if (render.hover_horiz_trans_limits) {
        dest = dest || {};
        dest.min = render.hover_horiz_trans_limits.min;
        dest.max = render.hover_horiz_trans_limits.max;
        return dest;
    } else
        return null;
}

/**
 * Enable/disable horizontal rotation for the HOVER camera.
 * @method module:camera.hover_switch_horiz_rotation
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Boolean} enable Enable or disable the rotation.
 */
exports.hover_switch_horiz_rotation = function(camobj, enable) {
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("hover_switch_horiz_rotation(): Wrong camera object or camera move style");
        return null;
    }

    camobj.render.enable_hover_hor_rotation = enable;
}

/**
 * Check if the object is a camera and has the MS_STATIC movement style.
 * @method module:camera.is_static_camera
 * @param {Object3D} obj Object 3D
 * @returns {Boolean} The result of the checking.
 */
exports.is_static_camera = m_cam.is_static_camera;

/**
 * Check if the object is a camera and has the MS_TARGET_CONTROLS movement style.
 * @method module:camera.is_target_camera
 * @param {Object3D} obj Object 3D
 * @returns {Boolean} The result of the checking.
 */
exports.is_target_camera = m_cam.is_target_camera;

/**
 * Check if the object is a camera and has the MS_EYE_CONTROLS movement style.
 * @method module:camera.is_eye_camera
 * @param {Object3D} obj Object 3D
 * @returns {Boolean} The result of the checking.
 */
exports.is_eye_camera = m_cam.is_eye_camera;

/**
 * Check if the object is a camera and has the MS_HOVER_CONTROLS movement style.
 * @method module:camera.is_hover_camera
 * @param {Object3D} obj Object 3D
 * @returns {Boolean} The result of the checking.
 */
exports.is_hover_camera = m_cam.is_hover_camera;

function is_hmd_camera(camobj) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("is_hmd_camera(): Wrong camera object");
        return false;
    }

    var active_scene = m_scs.get_active();
    var cam_scene_data = m_obj_util.get_scene_data(camobj, active_scene);
    var cameras = cam_scene_data.cameras;
    for (var i = 0; i < cameras.length; i++) {
        var cam = cameras[i];

        if (cam.type == m_cam.TYPE_HMD_LEFT ||
                cam.type == m_cam.TYPE_HMD_RIGHT)
            return true;
    }

    return false;
}

/**
 * Set movement style (MS_*) for the camera.
 * @method module:camera.set_move_style
 * @param {Object3D} camobj Camera 3D-object.
 * @param {CameraMoveStyle} move_style Camera movement style
 * @returns {Boolean} Operation success flag.
 * @deprecated use {@link module:camera.static_setup|camera.static_setup} or 
 * {@link module:camera.eye_setup|camera.eye_setup} or 
 * {@link module:camera.target_setup|camera.target_setup} or 
 * {@link module:camera.hover_setup|camera.hover_setup} or 
 * {@link module:camera.hover_setup_rel|camera.hover_setup_rel} instead.
 */
exports.set_move_style = function(camobj, move_style) {

    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("set_move_style(): Wrong camera object");
        return false;
    }

    if (move_style != m_cam.MS_STATIC && move_style != m_cam.MS_EYE_CONTROLS
            && move_style != m_cam.MS_TARGET_CONTROLS && move_style != m_cam.MS_HOVER_CONTROLS) {
        m_print.error("set_move_style(): Wrong move style");
        return false;
    }

    m_cam.set_move_style(camobj, move_style);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);

    return true;
}

/**
 * Get movement style of the camera.
 * @method module:camera.get_move_style
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {?CameraMoveStyle} Camera movement style.
 */
exports.get_move_style = function(camobj) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("get_move_style(): Wrong camera object");
        return null;
    }

    return m_cam.get_move_style(camobj);
}

/**
 * Translates the STATIC/EYE camera. Performs parallel translation for the TARGET/HOVER
 * camera and its pivot.
 * @method module:camera.set_translation
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Vec3} trans New camera position.
 */
exports.set_translation = function(camobj, trans) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("set_translation(): Wrong camera object");
        return;
    }

    var render = camobj.render;

    if (m_cam.is_target_camera(camobj)) {
        var cam_trans = m_tsr.get_trans_view(render.world_tsr);
        var trans_delta = m_vec3.subtract(trans, cam_trans, _vec3_tmp);
        m_vec3.add(trans_delta, render.pivot, render.pivot);
    } else if (m_cam.is_hover_camera(camobj)) {
        var cam_trans = m_tsr.get_trans_view(render.world_tsr);
        var trans_delta = m_vec3.subtract(trans, cam_trans, _vec3_tmp);
        m_vec3.add(trans_delta, render.hover_pivot, render.hover_pivot);
    }
    m_trans.set_translation(camobj, trans);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Get the camera's translation vector.
 * @method module:camera.get_translation
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Vec3} [dest=new Float32Array(3);] Destination vector.
 * @returns {?Vec3} Destination vector.
 */
exports.get_translation = function(camobj, dest) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("get_translation(): Wrong camera object");
        return null;
    }

    dest = dest || new Float32Array(3);
    return m_trans.get_translation(camobj, dest);
}

/**
 * Rotate the TARGET/EYE/HOVER camera counterclockwise (CCW) by the given
 * angles depending on the camera's movement style.
 * Performs the delta rotation or sets the camera's absolute rotation depending
 * on the "*_is_abs" parameters.
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @method module:camera.rotate_camera
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Number} phi Azimuth angle in radians
 * @param {Number} theta Elevation angle in radians
 * @param {Boolean} [phi_is_abs=false] Performs delta rotation if FALSE, sets camera's absolute rotation if TRUE.
 * @param {Boolean} [theta_is_abs=false] Performs delta rotation if FALSE, sets camera's absolute rotation if TRUE.
 */
exports.rotate_camera = function(camobj, phi, theta, phi_is_abs, theta_is_abs) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("rotate_camera(): Wrong camera object");
        return;
    }

    phi_is_abs = phi_is_abs || false;
    theta_is_abs = theta_is_abs || false;

    if (m_cam.is_target_camera(camobj))
        m_cam.rotate_target_camera(camobj, phi, theta, phi_is_abs, theta_is_abs);
    else if (m_cam.is_eye_camera(camobj))
        m_cam.rotate_eye_camera(camobj, phi, theta, phi_is_abs, theta_is_abs);
    else if (m_cam.is_hover_camera(camobj))
        m_cam.rotate_hover_camera(camobj, phi, theta, phi_is_abs, theta_is_abs);
    else if (m_cam.is_static_camera(camobj))
        m_print.warn("rotate_camera(): not supported for STATIC cameras");
    else
        m_print.error("rotate_camera(): Wrong camera move style");

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Set velocity parameters for the camera.
 * @method module:camera.set_velocities
 * @param {Object3D} camobj Camera 3D-object.
 * @param {VelocityParams} velocity Velocity parameters.
 */
exports.set_velocities = function(camobj, velocity) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("set_velocities(): Wrong camera object");
        return;
    }

    var render = camobj.render;
    if (typeof velocity.trans == "number")
        render.velocity_trans = m_util.clamp(velocity.trans, 0, Infinity);
    if (typeof velocity.rot == "number")
        render.velocity_rot = m_util.clamp(velocity.rot, 0, Infinity);
    if (typeof velocity.zoom == "number")
        render.velocity_zoom = m_util.clamp(velocity.zoom, 0, 0.99);
}

/**
 * Get velocity parameters of the camera.
 * @method module:camera.get_velocities
 * @param {Object3D} camobj Camera 3D-object.
 * @param {VelocityParams} dest The receiving object.
 * @returns {?VelocityParams} Velocity parameters.
 */
exports.get_velocities = function(camobj, dest) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("get_velocities(): Wrong camera object");
        return null;
    }

    var render = camobj.render;
    dest = dest || {};
    dest.trans = render.velocity_trans;
    dest.rot = render.velocity_rot;
    dest.zoom = render.velocity_zoom;
    return dest;
}

/**
 * Check whether the camera is looking upwards.
 * @method module:camera.is_look_up
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {Boolean} The result of the checking.
 */
exports.is_look_up = function(camobj) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("is_look_up(): Wrong camera object");
        return false;
    }

    var quat = m_tsr.get_quat_view(camobj.render.world_tsr);
    var dir = m_util.quat_to_dir(quat, m_util.AXIS_MY, _vec3_tmp);

    return dir[1] >= 0;
}

/**
 * Get the angles of horizontal (azimuth) and vertical (elevation) rotation
 * (CCW as seen from the rotation axis) of the TARGET/HOVER camera, or the
 * analogous orientation angles of the EYE camera.
 * Intended for the cameras with corrected up vector.
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @method module:camera.get_camera_angles
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?Vec2} [dest=new Float32Array(2);] Destination vector for the camera
 * angles: [phi, theta], phi: [0, 2Pi], theta: [-Pi, Pi].
 * @returns {?Vec2} Destination vector for the camera angles: [phi, theta].
 */
exports.get_camera_angles = function(camobj, dest) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("get_camera_angles(): Wrong camera object");
        return null;
    }

    dest = dest || new Float32Array(2);
    m_cam.get_camera_angles(camobj, dest);
    return dest;
}

/**
 * Get the angles of horizontal (azimuth) and vertical (elevation) rotation
 * (CCW as seen from the rotation axis) of the TARGET/HOVER camera, or the
 * analogous orientation angles of the EYE camera.
 * The angles are converted for the character object.
 * Intended for the cameras with corrected up vector.
 * @see https://www.blend4web.com/doc/en/camera.html#camera-spherical-coordinates
 * @method module:camera.get_camera_angles_char
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?Vec2} [dest=new Float32Array(2);] Destination vector for the camera
 * angles: [phi, theta], phi: [0, 2Pi], theta: [-Pi, Pi].
 * @returns {?Vec2} Destination vector for the camera angles: [phi, theta].
 */
exports.get_camera_angles_char = function(camobj, dest) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("get_camera_angles_char(): Wrong camera object");
        return null;
    }

    dest = dest || new Float32Array(2);
    m_cam.get_camera_angles_char(camobj, dest);
    return dest;
}

/**
 * Set the distance to the convergence plane of the stereoscopic camera.
 * @method module:camera.set_stereo_distance
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Number} conv_dist Distance from the convergence plane.
 */
exports.set_stereo_distance = function(camobj, conv_dist) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("set_stereo_distance(): Wrong camera object");
        return;
    }

    var active_scene = m_scs.get_active();
    var cam_scene_data = m_obj_util.get_scene_data(camobj, active_scene);
    var cameras = cam_scene_data.cameras;
    for (var i = 0; i < cameras.length; i++) {
        var cam = cameras[i];
        if (cam.type == m_cam.TYPE_STEREO_LEFT ||
                cam.type == m_cam.TYPE_STEREO_RIGHT ||
                cam.type == m_cam.TYPE_HMD_LEFT ||
                cam.type == m_cam.TYPE_HMD_RIGHT)
            m_cam.set_stereo_params(cam, conv_dist, cam.stereo_eye_dist);
    }
}
/**
 * Get the distance from the convergence plane of the stereoscopic camera.
 * @method module:camera.get_stereo_distance
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {Number} Distance from convergence plane.
 */
exports.get_stereo_distance = function(camobj) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("get_stereo_distance(): Wrong camera object");
        return 0;
    }

    var active_scene = m_scs.get_active();
    var cam_scene_data = m_obj_util.get_scene_data(camobj, active_scene);
    var cameras = cam_scene_data.cameras;
    for (var i = 0; i < cameras.length; i++) {
        var cam = cameras[i];
        if (cam.type == m_cam.TYPE_STEREO_LEFT ||
                cam.type == m_cam.TYPE_STEREO_RIGHT)
            return cam.stereo_conv_dist;
    }

    return 0;
}

/**
 * Set the distance between eyes of the stereoscopic camera.
 * @method module:camera.set_eye_distance
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Number} eye_dist Distance between eyes.
 */
exports.set_eye_distance = function(camobj, eye_dist) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("set_eye_distance(): Wrong camera object");
        return;
    }
    var active_scene = m_scs.get_active();
    var cam_scene_data = m_obj_util.get_scene_data(camobj, active_scene);
    var cameras = cam_scene_data.cameras;
    m_cam.set_eye_distance(cameras, eye_dist);
}

/**
 * Get the distance between eyes of the stereoscopic camera.
 * @method module:camera.get_eye_distance
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {Number} Distance between eyes.
 */
exports.get_eye_distance = function(camobj) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("get_eye_distance(): Wrong camera object");
        return 0;
    }

    var active_scene = m_scs.get_active();
    var cam_scene_data = m_obj_util.get_scene_data(camobj, active_scene);
    var cameras = cam_scene_data.cameras;
    for (var i = 0; i < cameras.length; i++) {
        var cam = cameras[i];
        if (cam.type == m_cam.TYPE_STEREO_LEFT ||
                cam.type == m_cam.TYPE_STEREO_RIGHT ||
                cam.type == m_cam.TYPE_HMD_LEFT ||
                cam.type == m_cam.TYPE_HMD_RIGHT)
            return cam.stereo_eye_dist;
    }

    return 0;
}

/**
 * Set vertical axis of the camera.
 * @method module:camera.set_vertical_axis
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Vec3} axis Vertical axis.
 */
exports.set_vertical_axis = function(camobj, axis) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("set_vertical_axis(): Wrong camera object");
        return;
    }

    var render = camobj.render;
    m_vec3.copy(axis, render.vertical_axis);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Get vertical axis of the camera.
 * @method module:camera.get_vertical_axis
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?Vec3} [dest=m_vec3.create();] Destination vector.
 * @returns {?Vec3} Destination vector.
 */
exports.get_vertical_axis = function(camobj, dest) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("get_vertical_axis(): Wrong camera object");
        return;
    }

    if (!dest)
        dest = m_vec3.create();

    var render = camobj.render;
    m_vec3.copy(render.vertical_axis, dest);

    return dest;
}

/**
 * Translate the view plane of the camera.
 * Modify the projection matrix of the camera so it appears to be moving in up-down
 * and left-right directions. This method can be used to imitate character
 * walking/running/driving.
 * @method module:camera.translate_view
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Number} x X coord (positive - left to right).
 * @param {Number} y Y coord (positive - down to up).
 * @param {Number} angle Rotation angle (clockwise).
 */
exports.translate_view = function(camobj, x, y, angle) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("translate_view(): Wrong camera object");
        return;
    }

    var active_scene = m_scs.get_active();
    var cam_scene_data = m_obj_util.get_scene_data(camobj, active_scene);
    var cameras = cam_scene_data.cameras;
    for (var i = 0; i < cameras.length; i++) {
        var cam = cameras[i];

        // NOTE: camera projection matrix already has been updated in
        // set_view method of camera
        if (!cam.reflection_plane)
            m_cam.set_projection(cam, cam.aspect);

        var vec3_tmp = _vec3_tmp;
        vec3_tmp[0] = -x;
        vec3_tmp[1] = -y;
        vec3_tmp[2] = 0;

        m_mat4.translate(cam.proj_matrix, vec3_tmp, cam.proj_matrix);
        m_mat4.rotateZ(cam.proj_matrix, angle, cam.proj_matrix);

        m_cam.calc_view_proj_inverse(cam);
        m_cam.calc_sky_vp_inverse(cam);
    }
}

/**
 * Get camera view vector in world space.
 * @method module:camera.get_view_vector
 * @param {Object3D} camobj Camera 3D-object.
 * @param {?Vec3} [dest=new Float32Array(3);] Destination vector.
 * @returns {?Vec3} Destination vector.
 */
exports.get_view_vector = function(camobj, dest) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("get_view_vector(): Wrong camera object");
        return null;
    }

    dest = dest || new Float32Array(3);
    var quat = m_tsr.get_quat_view(camobj.render.world_tsr);
    m_util.quat_to_dir(quat, m_util.AXIS_MY, dest);

    return dest;
}

/**
 * Get the vertical angle of the camera's field of view.
 * @method module:camera.get_fov
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {Number} Camera field of view (in radians).
 */
exports.get_fov = function(camobj) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("get_fov(): Wrong camera object");
        return 0;
    }
    var active_scene = m_scs.get_active();
    var cam_scene_data = m_obj_util.get_scene_data(camobj, active_scene);
    var cameras = cam_scene_data.cameras;
    return m_util.deg_to_rad(cameras[0].fov);
}

/**
 * Set the vertical angle of the camera's field of view.
 * @method module:camera.set_fov
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Number} fov New camera field of view (in radians).
 */
exports.set_fov = function(camobj, fov) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("set_fov(): Wrong camera object");
        return;
    }

    var active_scene = m_scs.get_active();
    var cam_scene_data = m_obj_util.get_scene_data(camobj, active_scene);
    var cameras = cam_scene_data.cameras;
    for (var i = 0; i < cameras.length; i++) {
        var cam = cameras[i];

        cam.fov = m_util.rad_to_deg(fov);

        // see comments in translate_view()
        if (!cam.reflection_plane)
            m_cam.set_projection(cam, cam.aspect);

        m_cam.calc_view_proj_inverse(cam);
        m_cam.calc_sky_vp_inverse(cam);
    }
}

/**
 * Set the angles of the camera's field of view (for head-mounted display only).
 * @method module:camera.set_hmd_fov
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Vec4} hmd_left_fov New left camera field of view.
 * @param {Vec4} hmd_right_fov New right camera field of view.
 */
exports.set_hmd_fov = function(camobj, hmd_left_fov, hmd_right_fov) {
    if (!m_obj_util.is_camera(camobj) && !is_hmd_camera(camobj)) {
        m_print.error("set_hmd_fov(): Wrong camera object");
        return;
    }

    if (!hmd_left_fov || !hmd_right_fov)
        return;

    m_cam.set_hmd_fov(camobj, hmd_left_fov, hmd_right_fov);
}

/**
 * Correct the UP vector of the camera.
 * @method module:camera.correct_up
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Vec3} [y_axis=util.AXIS_Y] Axis vector.
 * @param {Boolean} [strict=false] Align camera exactly with the direction of 
 * the given axis vector (never with the opposite direction).
 */
exports.correct_up = function(camobj, y_axis, strict) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("correct_up(): Wrong camera object");
        return;
    }

    y_axis = y_axis || camobj.render.vertical_axis;
    m_cons.correct_up(camobj, y_axis, strict || false);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Set the orthogonal scale of the camera.
 * @method module:camera.set_ortho_scale
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Number} ortho_scale Orthogonal scale.
 */
exports.set_ortho_scale = function(camobj, ortho_scale) {
    if (!m_obj_util.is_camera(camobj) || !m_cam.is_ortho_camera(camobj)) {
        m_print.error("set_ortho_scale(): Wrong camera object");
        return;
    }

    var render = camobj.render;

    if (m_cam.is_target_camera(camobj)) {
        var trans = m_tsr.get_trans_view(render.world_tsr);
        var dir_dist = m_vec3.dist(trans, render.pivot);
        render.init_top = ortho_scale / 2 * render.init_dist / dir_dist;
    } else if (m_cam.is_hover_camera(camobj)) {
        var trans = m_tsr.get_trans_view(render.world_tsr);
        var dir_dist = m_vec3.distance(trans, render.hover_pivot);
        render.init_top = ortho_scale / 2 * render.init_dist / dir_dist;
    } else {
        var active_scene = m_scs.get_active();
        var cam_scene_data = m_obj_util.get_scene_data(camobj, active_scene);
        // hover camera without distance limits, EYE or STATIC camera
        cam_scene_data.cameras[0].top = ortho_scale / 2;
    }

    m_cam.update_ortho_scale(camobj);
}

/**
 * Get the orthogonal scale of the camera.
 * @method module:camera.get_ortho_scale
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {Number} Orthogonal scale.
 */
exports.get_ortho_scale = function(camobj) {
    if (!m_obj_util.is_camera(camobj) || !m_cam.is_ortho_camera(camobj)) {
        m_print.error("get_ortho_scale(): Wrong camera object");
        return 0;
    }
    var active_scene = m_scs.get_active();
    var cam_scene_data = m_obj_util.get_scene_data(camobj, active_scene);
    return cam_scene_data.cameras[0].top * 2;
}

/**
 * Check whether the camera is an ORTHO camera.
 * @method module:camera.is_ortho_camera
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {Boolean} The result of the checking.
 */
exports.is_ortho_camera = function(camobj) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("is_ortho_camera(): Wrong camera object");
        return false;
    }

    return m_cam.is_ortho_camera(camobj);
}

/**
 * Calculate the direction of the camera ray based on the Canvas coordinates.
 * The origin of the Canvas space is located in the top left corner of the Canvas.
 * @method module:camera.calc_ray
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Number} canvas_x X Canvas coordinate.
 * @param {Number} canvas_y Y Canvas coordinate.
 * @param {?ParametricLine} [dest=new Float32Array(6);] Destination parametric line.
 * @returns {?ParametricLine} Destination parametric line.
 */
exports.calc_ray = function(camobj, canvas_x, canvas_y, dest) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("calc_ray(): Wrong camera object");
        return null;
    }
    var active_scene = m_scs.get_active();
    var cam_scene_data = m_obj_util.get_scene_data(camobj, active_scene);
    var cam = cam_scene_data.cameras[0];
    // NOTE: It's for compatibility.
    if (dest && dest.length == 3)
        m_print.error_once("dest parameter in the function \"calc_ray\" " +
                "should be type of parametric line.");
    else
        dest = dest || new Float32Array(6);

    switch (cam.type) {
    case m_cam.TYPE_PERSP:
    case m_cam.TYPE_PERSP_ASPECT:
    case m_cam.TYPE_STEREO_LEFT:
    case m_cam.TYPE_STEREO_RIGHT:
        var top_1m = Math.tan(cam.fov * Math.PI / 360.0);
        var right_1m = top_1m * cam.aspect;

        var dir = _vec3_tmp;

        var viewport_xy = m_cont.canvas_to_viewport_coords(canvas_x, canvas_y,
            _vec2_tmp, cam);

        // in the camera's local space
        dir[0] = (2.0 * viewport_xy[0] / cam.width - 1.0) * right_1m;
        dir[1] = -1;
        dir[2] = (2.0 * viewport_xy[1] / cam.height - 1.0) * top_1m;

        m_tsr.transform_dir_vec3(dir, camobj.render.world_tsr, dir);

        m_vec3.normalize(dir, dir);

        if (dest.length == 3)
            m_vec3.copy(dir, dest);
        else {
            var cam_eye = m_trans.get_translation(camobj, _vec3_tmp2);
            m_math.set_pline_initial_point(dest, cam_eye);
            m_math.set_pline_directional_vec(dest, dir);
        }

        return dest;
    case m_cam.TYPE_ORTHO:

        var dir = _vec3_tmp;
        var viewport_xy = m_cont.canvas_to_viewport_coords(canvas_x, canvas_y,
                _vec2_tmp, cam);

        dir[0] = (2.0 * viewport_xy[0] / cam.width - 1.0) * cam.top * cam.aspect;
        dir[1] = 0;
        dir[2] = (2.0 * viewport_xy[1] / cam.height - 1.0) * cam.top;

        m_tsr.transform_vec3(dir, camobj.render.world_tsr, dir);
        m_vec3.copy(dir, dest);

        var quat = m_tsr.get_quat_view(camobj.render.world_tsr, _vec4_tmp);
        m_vec3.transformQuat(m_util.AXIS_MY, quat, dir);

        m_math.set_pline_directional_vec(dest, dir);
        return dest;
    default:
        m_print.error("calc_ray(): Non-compatible camera");
        return dest;
    }
}

/**
 * Project the 3D point to the Canvas.
 * Returned coordinates are measured in CSS pixels.
 * @method module:camera.project_point
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Vec3} point Point in world space.
 * @param {Vec2|Vec3} [dest=new Float32Array(2);] Destination canvas coordinates
 * (vec2 - X/Y, vec3 - X/Y/DEPTH).
 * @returns {Vec2|Vec3} Destination canvas coordinates.
 */
exports.project_point = function(camobj, point, dest) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("project_point(): Wrong camera object");
        return null;
    }

    dest = dest || new Float32Array(2);
    return m_cam.project_point(camobj, point, dest);
}

/**
 * Check whether the camera has distance limits.
 * @method module:camera.has_distance_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {Boolean} The result of the checking.
 */
exports.has_distance_limits = function(camobj) {
    return (m_cam.is_target_camera(camobj) || m_cam.is_hover_camera(camobj)) 
        && camobj.render.distance_limits !== null;
}

/**
 * Check whether the camera has any vertical rotation limits.
 * @method module:camera.has_vertical_rot_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {Boolean} The result of the checking.
 */
exports.has_vertical_rot_limits = function(camobj) {
    return (m_cam.is_eye_camera(camobj) || m_cam.is_target_camera(camobj) 
            || m_cam.is_hover_camera(camobj)) && camobj.render.vertical_limits !== null;
}

/**
 * Check whether the EYE/TARGET camera has any vertical limits.
 * @method module:camera.has_vertical_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {Boolean} The result of the checking.
 * @deprecated use {@link module:camera.has_vertical_rot_limits|camera.has_vertical_rot_limits} instead.
 */
exports.has_vertical_limits = function(camobj) {
    m_print.error_deprecated("has_vertical_limits", "has_vertical_rot_limits");
    if (!m_cam.is_target_camera(camobj) && !m_cam.is_eye_camera(camobj)) {
        m_print.error("has_vertical_limits(): Wrong camera object");
        return false;
    }
    return camobj.render.vertical_limits !== null;
}

/**
 * Check whether the camera has any horizontal rotation limits.
 * @method module:camera.has_horizontal_rot_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {Boolean} The result of the checking.
 */
exports.has_horizontal_rot_limits = function(camobj) {
    return (m_cam.is_target_camera(camobj) || m_cam.is_eye_camera(camobj)) 
            && camobj.render.horizontal_limits !== null;
}

 /**
 * Check whether the EYE/TARGET camera has any horizontal limits.
 * @method module:camera.has_horizontal_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {Boolean} The result of the checking.
 * @deprecated use {@link module:camera.has_horizontal_rot_limits|camera.has_horizontal_rot_limits} instead.
 */
exports.has_horizontal_limits = function(camobj) {
    m_print.error_deprecated("has_horizontal_limits", "has_horizontal_rot_limits");
    if (!m_cam.is_target_camera(camobj) && !m_cam.is_eye_camera(camobj)) {
        m_print.error("has_horizontal_limits(): Wrong camera object");
        return false;
    }
    return camobj.render.horizontal_limits !== null;
}

/**
 * Check whether the camera has any vertical translation limits.
 * @method module:camera.has_vertical_trans_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {Boolean} The result of the checking.
 */
exports.has_vertical_trans_limits = function(camobj) {
    return m_cam.is_hover_camera(camobj) && camobj.render.hover_vert_trans_limits !== null;
}

/**
 * Check whether the camera has any horizontal translation limits.
 * @method module:camera.has_horizontal_trans_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @returns {Boolean} The result of the checking.
 */
exports.has_horizontal_trans_limits = function(camobj) {
    return m_cam.is_hover_camera(camobj) && camobj.render.hover_horiz_trans_limits !== null;
}

/**
 * Translate the pivot point of the TARGET camera in screen space.
 * Translation distance is defined with distance factor between origin and
 * pivot points.
 * +h from left to right
 * +v from down to up
 * @method module:camera.move_pivot
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Number} trans_h_delta Delta of the horizontal translation.
 * @param {Number} trans_v_delta Delta of the vertical translation.
 * @deprecated use {@link module:camera.get_velocities|camera.get_velocities} instead.
 */
exports.move_pivot = function(camobj, trans_h_delta, trans_v_delta) {
    m_print.error_deprecated("move_pivot", "target_pan_pivot");
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("move_pivot(): wrong object");
        return;
    }

    var render = camobj.render;

    if (render.use_panning) {
        var cam_trans = m_tsr.get_trans_view(render.world_tsr);
        var dist_vector = m_vec3.subtract(cam_trans, render.pivot, _vec3_tmp2);

        var trans_vector = _vec3_tmp;
        trans_vector[0] = trans_h_delta;
        trans_vector[1] = 0;
        trans_vector[2] = trans_v_delta;
        m_vec3.scale(trans_vector, m_vec3.len(dist_vector), trans_vector);

        m_tsr.transform_dir_vec3(trans_vector, render.world_tsr, trans_vector);

        m_vec3.add(render.pivot, trans_vector, render.pivot);
        m_vec3.add(cam_trans, trans_vector, cam_trans);

        m_trans.update_transform(camobj);
        m_phy.sync_transform(camobj);
    }
}

/**
 * Set the velocity parameters for the camera.
 * @method module:camera.set_velocity_params
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Vec3} velocity Camera velocity params (velocity_trans, velocity_rot, velocity_zoom)
 * @deprecated use {@link module:camera.set_velocities|camera.set_velocities} instead.
 */
exports.set_velocity_params = function(camobj, velocity) {
    m_print.error_deprecated("set_velocity_params", "set_velocities");
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("set_velocity_params(): Wrong camera object");
        return;
    }

    var render = camobj.render;
    render.velocity_trans = m_util.clamp(velocity[0], 0, Infinity);
    render.velocity_rot = m_util.clamp(velocity[1], 0, Infinity);
    render.velocity_zoom = m_util.clamp(velocity[2], 0, 0.99);
}

/**
 * Get the velocity parameters of the camera.
 * @method module:camera.get_velocity_params
 * @param {Object3D} camobj Camera 3D-object.
 * @param {Vec3} [dest=vec3.create()] Velocity params [velocity_trans, velocity_rot,
 * velocity_zoom].
 * @returns {?Vec3} Velocity params [velocity_trans, velocity_rot,
 * velocity_zoom].
 * @deprecated use {@link module:camera.get_velocities|camera.get_velocities} instead.
 */
exports.get_velocity_params = function(camobj, dest) {
    m_print.error_deprecated("get_velocity_params", "get_velocities");
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("get_velocity_params(): Wrong camera object");
        return null;
    }

    dest = dest || new Float32Array(3);

    var render = camobj.render;
    dest[0] = render.velocity_trans;
    dest[1] = render.velocity_rot;
    dest[2] = render.velocity_zoom;

    return dest;
}

/**
 * Remove the horizontal clamping limits from the TARGET/EYE/HOVER camera.
 * @method module:camera.clear_horizontal_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @deprecated use {@link module:camera.target_set_horizontal_limits|camera.target_set_horizontal_limits},
 * {@link module:camera.eye_set_horizontal_limits|camera.eye_set_horizontal_limits} or
 * {@link module:camera.hover_set_horiz_trans_limits|camera.hover_set_horiz_trans_limits} with passing null as the "limits" argument.
 */
exports.clear_horizontal_limits = function(camobj) {
    m_print.error_once("camera.clear_horizontal_limits() deprecated, use " +
            "camera.target_set_horizontal_limits(), camera.eye_set_horizontal_limits() " +
            "or camera.hover_set_horiz_trans_limits() with passing null as the \"limits\" argument.");

    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("clear_horizontal_limits(): Wrong camera object");
        return;
    }

    if (m_cam.is_target_camera(camobj) || m_cam.is_eye_camera(camobj))
        camobj.render.horizontal_limits = null;
    else if (m_cam.is_hover_camera(camobj))
        camobj.render.hover_horiz_trans_limits = null;
}

/**
 * Remove the vertical clamping limits from the TARGET/EYE/HOVER camera.
 * @method module:camera.clear_vertical_limits
 * @param {Object3D} camobj Camera 3D-object.
 * @deprecated use {@link module:camera.target_set_vertical_limits|camera.target_set_vertical_limits},
 * {@link module:camera.eye_set_vertical_limits|camera.eye_set_vertical_limits} or
 * {@link module:camera.hover_set_vert_trans_limits|camera.hover_set_vert_trans_limits} with passing null as the "limits" argument.
 */
exports.clear_vertical_limits = function(camobj) {
    m_print.error_once("camera.clear_vertical_limits() deprecated, use " +
            "camera.target_set_vertical_limits(), camera.eye_set_vertical_limits() " +
            "or camera.hover_set_vert_trans_limits() with passing null as the \"limits\" argument.");

    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("clear_vertical_limits(): Wrong camera object");
        return;
    }

    if (m_cam.is_target_camera(camobj) || m_cam.is_eye_camera(camobj))
        camobj.render.vertical_limits = null;
    else if (m_cam.is_hover_camera(camobj))
        camobj.render.hover_vert_trans_limits = null;
}

/**
 * Remove the hover angle limits from the HOVER camera.
 * @method module:camera.clear_hover_angle_limits
 * @param {Object3D} camobj Camera object.
 * @deprecated
 */
exports.clear_hover_angle_limits = function(camobj) {
    m_print.error_once("camera.clear_hover_angle_limits() deprecated, HOVER camera always has hover angle limits");
}

/**
 * Low-level method to set position of the STATIC/EYE camera.
 * @method module:camera.set_look_at
 * @param {Object3D} camobj Camera object
 * @param {Vec3} eye Eye point (position of the camera)
 * @param {Vec3} target Target point (point the camera is looking at)
 * @param {Vec3} [up=util.AXIS_Y] Up vector ("up" direction of the camera)
 * @deprecated use {@link module:camera.static_set_look_at|camera.static_set_look_at}
 * or {@link module:camera.eye_set_look_at|camera.eye_set_look_at} instead.
 */
exports.set_look_at = function(camobj, eye, target, up) {
    m_print.error_deprecated_arr("camera.set_look_at",
            ["camera.static_set_look_at", "camera.eye_set_look_at"]);
    up = up || camobj.render.vertical_axis;

    m_cam.set_look_at(camobj, eye, target);
    m_cons.correct_up(camobj, up, true);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
};

/**
 * Rotate the EYE camera counterclockwise (CCW) around its origin by the given angles.
 * Performs the delta rotation or sets the camera's absolute rotation depending on the "*_is_abs" parameters.
 * @see https://www.blend4web.com/doc/en/camera.html#api
 * @method module:camera.rotate_eye_camera
 * @param {Object3D} camobj Camera object
 * @param {Number} phi Azimuth angle in radians
 * @param {Number} theta Elevation angle in radians
 * @param {Boolean} [phi_is_abs=false] For phi angle: if FALSE performs delta rotation, if TRUE sets camera absolute rotation
 * @param {Boolean} [theta_is_abs=false] For theta angle: if FALSE performs delta rotation, if TRUE sets camera absolute rotation
 * @deprecated use {@link module:camera.eye_rotate|camera.eye_rotate}
 * or {@link module:camera.rotate_camera|camera.rotate_camera} instead.
 */
exports.rotate_eye_camera = function(camobj, phi, theta, phi_is_abs, theta_is_abs) {
    m_print.error_deprecated_arr("camera.rotate_eye_camera",
            ["camera.eye_rotate", "camera.rotate_camera"]);

    if (!m_cam.is_eye_camera(camobj)) {
        m_print.error("rotate_eye_camera(): wrong object");
        return;
    }

    m_cam.rotate_eye_camera(camobj, phi, theta, phi_is_abs, theta_is_abs);
    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Rotate the TARGET camera counterclockwise (CCW) around its pivot by the given angles.
 * Performs the delta rotation or sets the camera's absolute rotation depending on the "*_is_abs" parameters.
 * @see https://www.blend4web.com/doc/en/camera.html#api
 * @method module:camera.rotate_target_camera
 * @param {Object3D} camobj Camera object
 * @param {Number} phi Azimuth angle in radians
 * @param {Number} theta Elevation angle in radians
 * @param {Boolean} [phi_is_abs=false] For phi angle: if FALSE performs delta rotation, if TRUE sets camera absolute rotation
 * @param {Boolean} [theta_is_abs=false] For theta angle: if FALSE performs delta rotation, if TRUE sets camera absolute rotation
 * @deprecated use {@link module:camera.target_rotate|camera.target_rotate}
 * or {@link module:camera.rotate_camera|camera.rotate_camera} instead.
 */
exports.rotate_target_camera = function(camobj, phi, theta, phi_is_abs, theta_is_abs) {
    m_print.error_deprecated_arr("camera.rotate_target_camera",
            ["camera.target_rotate", "camera.rotate_camera"]);
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("rotate_target_camera(): wrong object");
        return;
    }

    m_cam.rotate_target_camera(camobj, phi, theta, phi_is_abs, theta_is_abs);
    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Set the translation and the pivot point for the TARGET camera.
 * @method module:camera.set_trans_pivot
 * @param {Object3D} camobj Camera Object 3D
 * @param {Vec3} trans Translation vector
 * @param {Vec3} pivot Pivot vector
 * @deprecated use {@link module:camera.target_set_trans_pivot|camera.target_set_trans_pivot}
 * instead.
 */
exports.set_trans_pivot = function(camobj, trans, pivot) {
    m_print.error_deprecated("camera.set_trans_pivot", "camera.target_set_trans_pivot");
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("set_trans_pivot(): Wrong object or camera move style");
        return;
    }

    m_cam.set_trans_pivot(camobj, trans, pivot);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Zoom the camera to the object.
 * @method module:camera.zoom_object
 * @param {Object3D} camobj Camera object
 * @param {Object3D} obj Object 3D
 * @deprecated use {@link module:camera.target_zoom_object|camera.target_zoom_object} instead.
 */
exports.zoom_object = function(camobj, obj) {
    m_print.error_deprecated("camera.zoom_object", "camera.target_zoom_object");

    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("zoom_object(): wrong object");
        return;
    }

    var calc_bs_center = false;

    var center = _vec3_tmp;
    m_trans.get_object_center(obj, calc_bs_center, center);
    set_pivot(camobj, center);
    m_trans.update_transform(camobj);

    var radius = m_trans.get_object_size(obj);
    var active_scene = m_scs.get_active();
    var cam_scene_data = m_obj_util.get_scene_data(camobj, active_scene);
    var main_camera = cam_scene_data.cameras[0];
    var ang_radius = m_cam.get_angular_diameter(main_camera) / 2;

    var dist_need = radius / Math.sin(ang_radius);
    var dist_current = m_trans.obj_point_distance(camobj, center);

    // +y move backward
    m_trans.move_local(camobj, 0, dist_need - dist_current, 0);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Set the pivot point for the TARGET camera.
 * @method module:camera.set_pivot
 * @param {Object3D} camobj Camera object
 * @param {Vec3} coords New pivot vector.
 * @deprecated use {@link module:camera.target_set_trans_pivot|camera.target_set_trans_pivot} instead.
 */
exports.set_pivot = set_pivot;
function set_pivot(camobj, coords) {
    m_print.error_deprecated("camera.set_pivot", "camera.target_set_trans_pivot");
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("set_pivot(): Wrong object or camera move style");
        return;
    }

    m_vec3.copy(coords, camobj.render.pivot);
    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Rotate the HOVER camera around its pivot by the given angles.
 * Performs the delta rotation or sets the camera's absolute rotation depending on the "*_is_abs" parameters.
 * @see https://www.blend4web.com/doc/en/camera.html#api
 * @method module:camera.rotate_hover_camera
 * @param {Object3D} camobj Camera object
 * @param {Number} phi Azimuth angle in radians
 * @param {Number} theta Elevation angle in radians
 * @param {Boolean} [phi_is_abs=false] For phi angle: if FALSE performs delta rotation, if TRUE sets camera absolute rotation
 * @param {Boolean} [theta_is_abs=false] For theta angle: if FALSE performs delta rotation, if TRUE sets camera absolute rotation
 * @deprecated use {@link module:camera.hover_rotate|camera.hover_rotate} instead.
 */
exports.rotate_hover_camera = function(camobj, phi, theta, phi_is_abs, theta_is_abs) {
    m_print.error_deprecated("camera.rotate_hover_camera", "camera.hover_rotate");
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("rotate_hover_camera(): wrong object");
        return;
    }

    m_cam.rotate_hover_camera(camobj, phi, theta, phi_is_abs, theta_is_abs);
    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Get the pivot translation of the HOVER camera.
 * @method module:camera.get_hover_cam_pivot
 * @param {Object3D} camobj Camera object
 * @param {Vec3} [dest=vec3.create()] Destination translation pivot vector.
 * @returns {?Vec3} Destination translation pivot vector.
 * @deprecated use {@link module:camera.hover_get_pivot|camera.hover_get_pivot} instead.
 */
exports.get_hover_cam_pivot = function(camobj, dest) {
    m_print.error_deprecated("camera.get_hover_cam_pivot", "camera.hover_get_pivot");
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("get_hover_cam_pivot(): wrong object");
        return null;
    }

    if (!dest)
        dest = new Float32Array(3);

    m_vec3.copy(camobj.render.hover_pivot, dest);

    return dest;
}

/**
 * Get the eye point (position) of the camera.
 * @method module:camera.get_eye
 * @param {Object3D} camobj Camera object
 * @param {Vec3} [dest=vec3.create()] Destination eye vector.
 * @returns {?Vec3} Destination eye vector.
 * @deprecated use {@link module:camera.get_translation|camera.get_translation} instead.
 */
exports.get_eye = function(camobj, dest) {
    m_print.error_deprecated("camera.get_eye", "camera.get_translation");
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("get_eye(): Wrong object");
        return null;
    }

    return m_cam.get_eye(camobj, dest);
}

/**
 * Get the pivot point of the camera.
 * @method module:camera.get_pivot
 * @param {Object3D} camobj Camera object
 * @param {Vec3} [dest] Destination pivot vector.
 * @returns {?Vec3} Destination pivot vector.
 * @deprecated use {@link module:camera.target_get_pivot|camera.target_get_pivot} instead.
 */
exports.get_pivot = function(camobj, dest) {
    m_print.error_deprecated("camera.get_pivot", "camera.target_get_pivot");
    if (!m_cam.is_target_camera(camobj)) {
        m_print.error("get_pivot(): Wrong object or camera move style");
        return null;
    }

    if (!dest)
        var dest = new Float32Array(3);

    var render = camobj.render;

    m_vec3.copy(render.pivot, dest);
    return dest;
}

/**
 * Set translation for the HOVER camera.
 * @method module:camera.hover_cam_set_translation
 * @param {Object3D} camobj Camera object
 * @param {Vec3} trans Translation vector.
 * @deprecated use {@link module:camera.set_translation|camera.set_translation} instead.
 */
exports.hover_cam_set_translation = function(camobj, trans) {
    m_print.error_deprecated("camera.hover_cam_set_translation", "camera.set_translation");
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("hover_cam_set_translation(): wrong object");
        return;
    }

    var render = camobj.render;
    var cam_trans = m_tsr.get_trans_view(render.world_tsr);
    var trans_delta = m_vec3.subtract(trans, cam_trans, _vec3_tmp);
    m_vec3.add(trans_delta, render.hover_pivot, render.hover_pivot);
    m_trans.set_translation(camobj, trans);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Set the pivot point for the HOVER camera.
 * @method module:camera.set_hover_pivot
 * @param {Object3D} camobj Camera object
 * @param {Vec3} coords Pivot vector.
 * @deprecated use {@link module:camera.hover_set_pivot_translation|camera.hover_set_pivot_translation} instead.
 */
exports.set_hover_pivot = function(camobj, coords) {
    m_print.error_deprecated("camera.set_hover_pivot", "camera.hover_set_pivot_translation");
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("set_hover_pivot(): Wrong object or camera move style");
        return;
    }

    m_cam.set_hover_pivot(camobj, coords);

    m_trans.update_transform(camobj);
    m_phy.sync_transform(camobj);
}

/**
 * Get the hover angle limits for the HOVER camera, converted to the [-Pi, 0] range.
 * @see https://www.blend4web.com/doc/en/camera.html#api
 * @method module:camera.get_hover_angle_limits
 * @param {Object3D} camobj Camera object
 * @param {Vec2} [angles] Destination vector [hover_angle_limits.down, hover_angle_limits.up].
 * @returns {?Vec2} Destination vector [hover_angle_limits.down, hover_angle_limits.up].
 * @deprecated use {@link module:camera.hover_get_vertical_limits|camera.hover_get_vertical_limits} instead.
 */
exports.get_hover_angle_limits = function(camobj, angles) {
    m_print.error_deprecated("camera.get_hover_angle_limits", "camera.hover_get_vertical_limits");
    if (!m_cam.is_hover_camera(camobj)) {
        m_print.error("get_hover_angle_limits(): wrong object");
        return null;
    }

    angles = angles || new Float32Array(2);
    angles[0] = camobj.render.vertical_limits.down;
    angles[1] = camobj.render.vertical_limits.up;

    return angles;
}

/**
 * Get the distance limits of the TARGET/HOVER camera.
 * @method module:camera.get_cam_dist_limits
 * @param {Object3D} camobj Camera object
 * @param {Vec2} [dist] Array of distance limits [distance_max, distance_min].
 * @returns {?Vec2} Array of distance limits [distance_max, distance_min].
 * @deprecated use {@link module:camera.hover_get_distance_limits|camera.hover_get_distance_limits}
 * or {@link module:camera.target_get_distance_limits|camera.target_get_distance_limits} instead.
 */
exports.get_cam_dist_limits = function(camobj, dist) {
    m_print.error_deprecated_arr("camera.get_cam_dist_limits",
            ["camera.hover_get_distance_limits", "camera.target_get_distance_limits"]);
    if (!m_cam.is_hover_camera(camobj) && !m_cam.is_target_camera(camobj)) {
        m_print.error("get_cam_dist_limits(): wrong object");
        return null;
    }

    if (camobj.render.distance_limits) {
        dist = dist || new Float32Array(2);

        dist[0] = camobj.render.distance_limits.max;
        dist[1] = camobj.render.distance_limits.min;
    } else
        return null;

    return dist;
}

/**
 * Set the vertical angle limits for the TARGET/EYE camera, or the vertical (Z axis)
 * translation limits for the HOVER camera.
 * @see https://www.blend4web.com/doc/en/camera.html#api
 * @method module:camera.apply_vertical_limits
 * @param {Object3D} camobj Camera object
 * @param {Number} down_value Vertical down limit
 * @param {Number} up_value Vertical up limit
 * @param {Space} [space=transform.SPACE_WORLD] Space to make clamping relative to (actual for the TARGET/EYE camera)
 * @deprecated use {@link module:camera.eye_set_vertical_limits|camera.eye_set_vertical_limits},
 * {@link module:camera.target_set_vertical_limits|camera.target_set_vertical_limits} or
 * {@link module:camera.hover_set_vert_trans_limits|camera.hover_set_vert_trans_limits} instead.
 */
exports.apply_vertical_limits = function(camobj, down_value, up_value, space) {
    m_print.error_deprecated_arr("camera.apply_vertical_limits",
            ["camera.eye_set_vertical_limits", "camera.target_set_vertical_limits",
            "camera.hover_set_vert_trans_limits"]);

    if (m_cam.is_target_camera(camobj)) {
        var limits = _limits_tmp;
        limits.down = down_value;
        limits.up = up_value;
        limits.camera_space = space == m_trans.SPACE_LOCAL;
        exports.target_set_vertical_limits(camobj, limits);
    } else if (m_cam.is_eye_camera(camobj)) {
        var limits = _limits_tmp;
        limits.down = down_value;
        limits.up = up_value;
        limits.camera_space = space == m_trans.SPACE_LOCAL;
        exports.eye_set_vertical_limits(camobj, limits);
    } else if (m_cam.is_hover_camera(camobj)) {
        var limits = _limits_tmp;
        limits.min = down_value;
        limits.max = up_value;
        exports.hover_set_vert_trans_limits(camobj, limits);
    } else
        m_print.error("apply_vertical_limits(): wrong object");
}

/**
 * Set the hover angle limits for the HOVER camera.
 * @see https://www.blend4web.com/doc/en/camera.html#api
 * @method module:camera.apply_hover_angle_limits
 * @param {Object3D} camobj Camera object
 * @param {Number} down_angle Down hover angle limit
 * @param {Number} up_angle Up hover angle limit
 * @deprecated use {@link module:camera.hover_set_vertical_limits|camera.hover_set_vertical_limits} instead.
 */
exports.apply_hover_angle_limits = function(camobj, down_angle, up_angle) {
    m_print.error_deprecated("camera.apply_hover_angle_limits", "camera.hover_set_vertical_limits");

    var limits = _limits_tmp;
    limits.down = down_angle;
    limits.up = up_angle;
    exports.hover_set_vertical_limits(camobj, limits);
}

/**
 * Set the distance limits for the TARGET/HOVER camera.
 * @method module:camera.apply_distance_limits
 * @param {Object3D} camobj Camera object
 * @param {Number} min Minimum distance to target
 * @param {Number} max Maximum distance to target
 * @deprecated use {@link module:camera.target_set_distance_limits|camera.target_set_distance_limits}
 * or {@link module:camera.hover_set_distance_limits|camera.hover_set_distance_limits} instead.
 */
exports.apply_distance_limits = function(camobj, min, max) {
    m_print.error_deprecated_arr("camera.apply_distance_limits",
            ["camera.target_set_distance_limits", "camera.hover_set_distance_limits"]);

    if (m_cam.is_target_camera(camobj)) {
        var limits = _limits_tmp;
        limits.min = min;
        limits.max = max;
        exports.target_set_distance_limits(camobj, limits);
    } else if (m_cam.is_hover_camera(camobj)) {
        var limits = _limits_tmp;
        limits.min = min;
        limits.max = max;
        exports.hover_set_distance_limits(camobj, limits);
    } else
        m_print.error("apply_distance_limits(): wrong object");
}

/**
 * Remove the distance clamping limits from the TARGET camera.
 * @method module:camera.clear_distance_limits
 * @param {Object3D} camobj Camera object.
 * @deprecated use {@link module:camera.target_set_distance_limits|camera.target_set_distance_limits} instead.
 */
exports.clear_distance_limits = function(camobj) {
    m_print.error_deprecated("camera.clear_distance_limits", "camera.target_set_distance_limits");
    exports.target_set_distance_limits(camobj, null);
}

/**
 * Get the vertical angle limits of the TARGET/EYE camera (converted to the [-Pi, Pi] range), or
 * the vertical translation limits of the HOVER camera.
 * @see https://www.blend4web.com/doc/en/camera.html#api
 * @method module:camera.get_vertical_limits
 * @param {Object3D} camobj Camera Object 3D
 * @param {Vec2} [dest] Destination vector for the camera limits: [down, up] rotation or [Min, Max] translation limits.
 * @returns {?Vec2} Destination vector for the camera limits: [down, up] rotation or [Min, Max] translation limits.
 * @deprecated use {@link module:camera.eye_get_vertical_limits|camera.eye_get_vertical_limits},
 * {@link module:camera.target_get_vertical_limits|camera.target_get_vertical_limits}
 * or {@link module:camera.hover_get_vert_trans_limits|camera.hover_get_vert_trans_limits} instead.
 */
exports.get_vertical_limits = function(camobj, dest) {
    m_print.error_deprecated_arr("camera.get_vertical_limits",
            ["camera.eye_get_vertical_limits", "camera.target_get_vertical_limits",
            "camera.hover_get_vert_trans_limits"]);
    if (!m_cam.is_target_camera(camobj)
            && !m_cam.is_eye_camera(camobj)
            && !m_cam.is_hover_camera(camobj)) {
        m_print.error("get_vertical_limits(): wrong object");
        return null;
    }
    var render = camobj.render;

    dest = dest || new Float32Array(2);
    if (m_cam.is_eye_camera(camobj) || m_cam.is_target_camera(camobj)) {
        if (render.vertical_limits) {
            dest[0] = render.vertical_limits.down;
            dest[1] = render.vertical_limits.up;
            return dest;
        }
    } else if (m_cam.is_hover_camera(camobj)) {
        if (render.hover_vert_trans_limits) {
            dest[0] = render.hover_vert_trans_limits.min;
            dest[1] = render.hover_vert_trans_limits.max;
            return dest;
        }
    }
    return null;
}

/**
 * Set the horizontal angle limits for the TARGET/EYE camera, or the horizontal (X axis)
 * translation limits for the HOVER camera.
 * @see https://www.blend4web.com/doc/en/camera.html#api
 * @method module:camera.apply_horizontal_limits
 * @param {Object3D} camobj Camera object
 * @param {Number} left_value Horizontal left limit
 * @param {Number} right_value Horizontal right limit
 * @param {Space} [space=transform.SPACE_WORLD] Space to make clamping relative to (actual for the TARGET/EYE camera).
 * @deprecated use {@link module:camera.eye_set_horizontal_limits|camera.eye_set_horizontal_limits},
 * {@link module:camera.target_set_horizontal_limits|camera.target_set_horizontal_limits}
 * or {@link module:camera.hover_set_horiz_trans_limits|camera.hover_set_horiz_trans_limits} instead.
 */
exports.apply_horizontal_limits = function(camobj, left_value, right_value,
        space) {
    m_print.error_deprecated_arr("camera.apply_horizontal_limits",
            ["camera.eye_set_horizontal_limits", "camera.target_set_horizontal_limits",
            "camera.hover_set_horiz_trans_limits"]);

    if (m_cam.is_target_camera(camobj)) {
        var limits = _limits_tmp;
        limits.left = left_value;
        limits.right = right_value;
        limits.camera_space = space == m_trans.SPACE_LOCAL;
        exports.target_set_horizontal_limits(camobj, limits);
    } else if (m_cam.is_eye_camera(camobj)) {
        var limits = _limits_tmp;
        limits.left = left_value;
        limits.right = right_value;
        limits.camera_space = space == m_trans.SPACE_LOCAL;
        exports.eye_set_horizontal_limits(camobj, limits);
    } else if (m_cam.is_hover_camera(camobj)) {
        var limits = _limits_tmp;
        limits.min = left_value;
        limits.max = right_value;
        exports.hover_set_horiz_trans_limits(camobj, limits);
    } else
        m_print.error("apply_horizontal_limits(): wrong object");
}

/**
 * Get the horizontal angle limits of the TARGET/EYE camera (converted to the [0, 2Pi] range), or
 * the horizontal translation limits of the HOVER camera.
 * @see https://www.blend4web.com/doc/en/camera.html#api
 * @method module:camera.get_horizontal_limits
 * @param {Object3D} camobj Camera Object 3D
 * @param {Vec2} [dest] Destination vector for the camera limits: [left, right] rotation or [Min, Max] translation limits.
 * @returns {?Vec2} Destination vector for the camera limits: [left, right] rotation or [Min, Max] translation limits.
 * @deprecated use {@link module:camera.eye_get_horizontal_limits|camera.eye_get_horizontal_limits},
 * {@link module:camera.target_get_horizontal_limits|camera.target_get_horizontal_limits}
 * or {@link module:camera.hover_get_horiz_trans_limits|camera.hover_get_horiz_trans_limits} instead.
 */
exports.get_horizontal_limits = function(camobj, dest) {
    m_print.error_deprecated_arr("camera.get_horizontal_limits",
            ["camera.eye_get_horizontal_limits", "camera.target_get_horizontal_limits",
            "camera.hover_get_horiz_trans_limits"]);
    if (!m_cam.is_target_camera(camobj)
            && !m_cam.is_eye_camera(camobj)
            && !m_cam.is_hover_camera(camobj)) {
        m_print.error("get_horizontal_limits(): wrong object");
        return null;
    }
    var render = camobj.render;

    dest = dest || new Float32Array(2);

    if (m_cam.is_eye_camera(camobj) || m_cam.is_target_camera(camobj)) {
        if (render.horizontal_limits) {
            dest[0] = render.horizontal_limits.left;
            dest[1] = render.horizontal_limits.right;
            return dest;
        }
    } else if (m_cam.is_hover_camera(camobj)) {
        if (render.hover_horiz_trans_limits) {
            dest[0] = render.hover_horiz_trans_limits.min;
            dest[1] = render.hover_horiz_trans_limits.max;
            return dest;
        }
    }
    return null;
}
/**
 * Get camera frustum planes.
 * @method module:camera.get_frustum_planes
 * @param {Object3D} camobj Camera object.
 * @param {FrustumPlanes} planes Frustum planes object.
 * @returns {?FrustumPlanes} Frustum planes object.
 */
exports.get_frustum_planes = function(camobj, planes) {
    if (!m_obj_util.is_camera(camobj)) {
        m_print.error("get_frustum_planes(): Wrong camera object");
        return null;
    }
    var active_scene = m_scs.get_active();
    var cam_scene_data = m_obj_util.get_scene_data(camobj, active_scene);
    var fr_planes = cam_scene_data.cameras[0].frustum_planes;
    m_vec4.copy(fr_planes.left, planes.left);
    m_vec4.copy(fr_planes.right, planes.right);
    m_vec4.copy(fr_planes.top, planes.top);
    m_vec4.copy(fr_planes.bottom, planes.bottom);
    m_vec4.copy(fr_planes.near, planes.near);
    m_vec4.copy(fr_planes.far, planes.far);

    return planes;
}

}
