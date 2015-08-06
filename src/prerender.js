"use strict";

/**
 * Prerender module, perform culling/lod stuff.
 * @name prerender
 * @namespace
 * @exports exports as scenes
 */
b4w.module["__prerender"] = function(exports, require) {

var m_cfg    = require("__config");
var m_debug  = require("__debug");
var m_geom   = require("__geometry");
var m_render = require("__renderer");
var m_util   = require("__util");
var m_vec3   = require("__vec3");

var cfg_def = m_cfg.defaults;

var USE_FRUSTUM_CULLING = true;
var SUBS_UPDATE_DO_RENDER = ["MAIN_OPAQUE", "MAIN_BLEND", "MAIN_PLANE_REFLECT",
        "MAIN_CUBE_REFLECT", "MAIN_GLOW", "SHADOW_CAST", "DEPTH", "OUTLINE_MASK",
        "WIREFRAME", "COLOR_PICKING", "MAIN_XRAY", "COLOR_PICKING_XRAY"];

/**
 * Set do_render flag for subscenes/bundles
 */
exports.prerender_subs = function(subs) {
    if (SUBS_UPDATE_DO_RENDER.indexOf(subs.type) > -1) {
        var has_render_bundles = false;
        var bundles = subs.bundles;

        for (var i = 0; i < bundles.length; i++) {
            var bundle = bundles[i];
            if (subs.type == "MAIN_CUBE_REFLECT") {
                for (var j = 0; j < 6; j++) {
                    subs.camera.frustum_planes = subs.cube_cam_frustums[j];
                    bundle.do_render_cube[j] = prerender_bundle(bundle, subs);
                    if (bundle.do_render_cube[j])
                        has_render_bundles = true;
                }
            } else {
                bundle.do_render = prerender_bundle(bundle, subs);
                if (bundle.do_render)
                    has_render_bundles = true;
            }
        }

        var cam = subs.camera;

        switch (subs.type) {
        case "WIREFRAME":
            // NOTE: wireframe subs rendered optionally
            break;
        default:
            // prevent rare bugs when blend is only one rendered
            if (subs.type === "MAIN_OPAQUE" || subs.type === "DEPTH" 
                    || has_render_bundles)
                subs.do_render = true;
            else {
                // clear subscene if it switches "do_render" flag to false
                if (subs.do_render)
                    m_render.clear(subs);
                subs.do_render = false;
            }
            break;
        }
    }
    if (subs.type == "MAIN_BLEND")
        zsort(subs);
}

/**
 * Perform Z-sort when camera moves
 * @methodOf camera
 */
function zsort(subs) {

    if (!cfg_def.alpha_sort || !subs.bundles)
        return;

    var eye = subs.camera.eye;

    // update if coords changed more than for 1 unit
    var cam_updated =
        m_vec3.dist(eye, subs.zsort_eye_last) > cfg_def.alpha_sort_threshold;

    for (var i = 0; i < subs.bundles.length; i++) {
        var bundle = subs.bundles[i];
        var obj_render = bundle.obj_render;

        if (!obj_render.force_zsort && !cam_updated)
            continue;

        var batch = bundle.batch;

        if (batch && batch.blend && batch.zsort_type != m_geom.ZSORT_DISABLED) {
            var bufs_data = batch.bufs_data;

            if (!bufs_data || !bundle.do_render)
                continue;

            var info = bufs_data.info_for_z_sort_updates;
            if (info && info.type == m_geom.ZSORT_BACK_TO_FRONT) {
                var world_matrix = obj_render.world_matrix;
                m_geom.update_buffers_movable(bufs_data, world_matrix, eye);
            }
        }
        obj_render.force_zsort = false;
    }

    // remember new coords
    if (cam_updated)
        m_vec3.copy(eye, subs.zsort_eye_last);
}

/**
 * Set do_render flag for render object based on it's current state
 * Returns do_render flag for bundle
 */
function prerender_bundle(bundle, subs) {

    var obj_render = bundle.obj_render;
    var cam = subs.camera;

    obj_render.is_visible = false;

    if (!obj_render)
        return false;

    if (obj_render.hide)
        return false;

    if (!is_lod_visible(obj_render, cam))
        return false;

    obj_render.is_visible = true;

    if (subs.type == "OUTLINE_MASK" && !Boolean(obj_render.outline_intensity))
        return false;

    if (USE_FRUSTUM_CULLING && is_out_of_frustum(obj_render, cam.frustum_planes))
        return false;

    if (subs.type == "WIREFRAME")
        if (bundle.batch.wireframe_mode == m_debug.WIREFRAME_MODES["WM_DEBUG_SPHERES"])
            return bundle.batch.debug_sphere;
        else
            return !bundle.batch.debug_sphere;

    return true;
}

function is_out_of_frustum(obj_render, planes) {

    if (obj_render.do_not_cull)
        return false;

    if (obj_render.type === "STATIC") {
        var bs = obj_render.bs_world;
        var pt = bs.center;
        var radius = bs.radius;
        var is_out = m_util.sphere_is_out_of_frustum(pt, planes, radius);
    } else {
        var be = obj_render.be_world;
        var pt = be.center;
        var axis_x = be.axis_x;
        var axis_y = be.axis_y;
        var axis_z = be.axis_z;
        var is_out = m_util.ellipsoid_is_out_of_frustum(pt, planes,
                                                      axis_x, axis_y, axis_z);
    }

    return is_out;
}

function is_lod_visible(obj_render, camera) {
    var eye = camera.eye;
    var center = obj_render.bs_world.center;

    var dist_min = obj_render.lod_dist_min;
    var dist_max = obj_render.lod_dist_max;

    var dist = Math.sqrt((center[0] - eye[0]) * (center[0] - eye[0]) +
            (center[1] - eye[1])*(center[1] - eye[1]) +
            (center[2] - eye[2])*(center[2] - eye[2]));

    // additional interval for transition, fixes LOD flickering
    var tr_int = obj_render.lod_transition_ratio * obj_render.bs_world.radius;

    if (dist >= dist_min && dist < (dist_max + tr_int))
        return true;
    else
        return false;
}

}
