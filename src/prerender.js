"use strict";

/**
 * Prerender module, perform culling/lod stuff.
 * @name prerender
 * @namespace
 * @exports exports as scenes
 */
b4w.module["__prerender"] = function(exports, require) {

var m_cfg   = require("__config");
var m_debug = require("__debug");
var m_geom  = require("__geometry");
var m_util  = require("__util");

var m_vec3  = require("vec3");

var cfg_def = m_cfg.defaults;

var USE_FRUSTUM_CULLING = true;
var USE_LOD_TRANSITION = false;
var SUBS_UPDATE_DO_RENDER = ["MAIN_OPAQUE", "MAIN_BLEND", "MAIN_REFLECT", 
        "SHADOW_CAST", "DEPTH", "GLOW_MASK", "WIREFRAME", "COLOR_PICKING"];

/**
 * Set do_render flag for subscenes/bundles
 */
exports.prerender_subs = function(subs) {
    if (SUBS_UPDATE_DO_RENDER.indexOf(subs.type) > -1) {
        var has_render_bundles = false;
        var bundles = subs.bundles;

        for (var i = 0; i < bundles.length; i++) {
            var bundle = bundles[i];

            prerender_bundle(bundle, subs);
            if (bundle.do_render)
                has_render_bundles = true;
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
            else
                subs.do_render = false;
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
    var eye = subs.camera.eye;

    // update if coords changed more than for 1 unit
    if (m_vec3.dist(eye, subs.zsort_eye_last) > cfg_def.alpha_sort_threshold) {

        if (!cfg_def.alpha_sort || !subs.bundles)
            return;

        for (var i = 0; i < subs.bundles.length; i++) {
            var bundle = subs.bundles[i];
            var batch = bundle.batch;
            var world_matrix = bundle.obj_render.world_matrix;
                        
            if (batch && batch.blend 
                    && batch.zsort_type != m_geom.ZSORT_DISABLED) {
                var bufs_data = batch.bufs_data;

                if (!bufs_data || !bundle.do_render)
                    continue;

                var info = bufs_data.info_for_z_sort_updates;
                if (info && info.type == m_geom.ZSORT_BACK_TO_FRONT)
                    m_geom.update_buffers_movable(bufs_data, world_matrix, eye);
            }
        }

        // remember new coords
        subs.zsort_eye_last[0] = eye[0];
        subs.zsort_eye_last[1] = eye[1];
        subs.zsort_eye_last[2] = eye[2];
    }
}

/**
 * Set do_render flag for render object based on it's current state
 */
function prerender_bundle(bundle, subs) {

    var obj_render = bundle.obj_render;
    var cam = subs.camera;

    bundle.do_render = true;

    obj_render.is_visible = false;

    if (!obj_render) {
        bundle.do_render = false;
        return;
    }

    if (obj_render.hide) {
        bundle.do_render = false;
        return;
    }

    if (!is_lod_visible(obj_render, cam)) {
        bundle.do_render = false;
        return;
    }

    obj_render.is_visible = true;

    if (subs.type == "GLOW_MASK" && !Boolean(bundle.batch.glow_intensity)) {
        bundle.do_render = false;
        return;
    }

    if (USE_FRUSTUM_CULLING && is_out_of_frustum(obj_render, cam.frustum_planes)) {
        bundle.do_render = false;
        return;
    }

    if (subs.type == "WIREFRAME")
        if (bundle.batch.wireframe_mode == m_debug.WIREFRAME_MODES["WM_DEBUG_SPHERES"])
            bundle.do_render = bundle.batch.debug_sphere;
        else
            bundle.do_render = !bundle.batch.debug_sphere;
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

    // Additional interval for last lod to perform fade-out 
    if (USE_LOD_TRANSITION && obj_render.last_lod)
        dist_max += obj_render.bs_world.radius;

    var dist = Math.sqrt((center[0] - eye[0]) * (center[0] - eye[0]) +
            (center[1] - eye[1])*(center[1] - eye[1]) +
            (center[2] - eye[2])*(center[2] - eye[2]));

    var tr_int = USE_LOD_TRANSITION ? cfg_def.lod_transition_interval : 0;

    if (dist >= Math.max(0, dist_min - tr_int) && dist < dist_max)
        return true;
    else
        return false;
}

}
