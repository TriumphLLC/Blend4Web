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
var m_tsr    = require("__tsr");
var m_util   = require("__util");
var m_vec3   = require("__vec3");

var cfg_def = m_cfg.defaults;

var USE_FRUSTUM_CULLING = true;
var SUBS_UPDATE_DO_RENDER = ["MAIN_OPAQUE", "MAIN_BLEND",
        "MAIN_PLANE_REFLECT", "MAIN_CUBE_REFLECT", "MAIN_PLANE_REFLECT_BLEND",
        "MAIN_CUBE_REFLECT_BLEND", "MAIN_GLOW", "SHADOW_CAST", "SHADOW_RECEIVE",
        "OUTLINE_MASK", "DEBUG_VIEW", "COLOR_PICKING", "MAIN_XRAY",
        "COLOR_PICKING_XRAY"];

var _vec3_tmp = new Float32Array(3);

/**
 * Set do_render flag for subscenes/bundles
 */
exports.prerender_subs = function(subs) {
    if (SUBS_UPDATE_DO_RENDER.indexOf(subs.type) > -1) {
        var has_render_bundles = false;
        var bundles = subs.bundles;

        for (var i = 0; i < bundles.length; i++) {
            var bundle = bundles[i];
            var batch = bundle.batch;
            if (subs.type == "MAIN_CUBE_REFLECT"
                    || subs.type == "MAIN_CUBE_REFLECT_BLEND") {
                for (var j = 0; j < 6; j++) {
                    subs.camera.frustum_planes = subs.cube_cam_frustums[j];
                    bundle.do_render_cube[j] = prerender_bundle(bundle, subs);
                    if (bundle.do_render_cube[j]) {
                        has_render_bundles = true;
                        update_particles_buffers(batch);
                    }
                }
            } else {
                bundle.do_render = prerender_bundle(bundle, subs);
                if (bundle.do_render) {
                    has_render_bundles = true;
                    update_particles_buffers(batch);
                }
            }

            if (subs.need_perm_uniforms_update)
                batch.shader.need_uniforms_update = true;
        }
        subs.need_perm_uniforms_update = false;

        switch (subs.type) {
        case "DEBUG_VIEW":
            // NOTE: debug view subs rendered optionally
            break;
        default:
            // prevent bugs when blend is only one rendered
            if (subs.type === "MAIN_OPAQUE" || subs.type === "SHADOW_RECEIVE" 
                    || subs.type === "MAIN_GLOW" || subs.type === "MAIN_PLANE_REFLECT"
                    || subs.type === "MAIN_CUBE_REFLECT" || has_render_bundles)
                subs.do_render = true;
            else {
                // clear subscene if it switches "do_render" flag to false
                if (subs.do_render)
                    m_render.clear(subs);
                subs.do_render = false;
            }
            break;
        }
    } else if (subs.need_perm_uniforms_update) {
        var bundles = subs.bundles;
        for (var i = 0; i < bundles.length; i++) {
            if (subs.need_perm_uniforms_update)
                bundles[i].batch.shader.need_uniforms_update = true;
        }
        subs.need_perm_uniforms_update = false;
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

    var eye = m_tsr.get_trans_value(subs.camera.world_tsr, _vec3_tmp);

    for (var i = 0; i < subs.bundles.length; i++) {

        var bundle = subs.bundles[i];
        if (!bundle.do_render)
            continue;

        var obj_render = bundle.obj_render;
        var batch = bundle.batch;

        if (batch && batch.z_sort) {
            var bufs_data = batch.bufs_data;

            if (!bufs_data)
                continue;

            var info = bufs_data.info_for_z_sort_updates;

            // update if camera shifted enough
            var cam_shift = m_vec3.dist(eye, info.zsort_eye_last);

            // take batch geometry size into account
            var shift_param = cfg_def.alpha_sort_threshold * Math.min(info.bb_min_side, 1);
            var batch_cam_updated = cam_shift > shift_param;

            if (!batch_cam_updated && !obj_render.force_zsort)
                continue;

            m_geom.update_buffers_movable(bufs_data, obj_render.world_tsr, eye);

            // remember new coords
            m_vec3.copy(eye, info.zsort_eye_last);
        }
        obj_render.force_zsort = false;
    }
}

/**
 * Set do_render flag for render object based on it's current state
 * Returns do_render flag for bundle
 */
function prerender_bundle(bundle, subs) {

    var obj_render = bundle.obj_render;
    var batch = bundle.batch;

    obj_render.is_visible = false;

    if (obj_render.hide)
        return false;

    var cam = subs.camera;

    if (subs.type == "SHADOW_CAST")
        var eye = cam.lod_eye;
    else
        var eye = m_tsr.get_trans_value(cam.world_tsr, _vec3_tmp);

    if (!is_lod_visible(obj_render, eye))
        return false;

    obj_render.is_visible = true;

    if (subs.type == "OUTLINE_MASK" && !Boolean(obj_render.outline_intensity))
        return false;

    if (USE_FRUSTUM_CULLING && is_out_of_frustum(obj_render, cam.frustum_planes, batch))
        return false;

    if (subs.type == "DEBUG_VIEW")
        if (bundle.batch.debug_view_mode == m_debug.DV_DEBUG_SPHERES)
            return bundle.batch.debug_sphere;
        else
            return !bundle.batch.debug_sphere;

    return true;
}

function is_out_of_frustum(obj_render, planes, batch) {

    if (obj_render.do_not_cull)
        return false;

    var be = batch.be_world;
    var pt = be.center;
    var axis_x = be.axis_x;
    var axis_y = be.axis_y;
    var axis_z = be.axis_z;
    var is_out = m_util.ellipsoid_is_out_of_frustum(pt, planes,
                                                      axis_x, axis_y, axis_z);
    return is_out;
}

function is_lod_visible(obj_render, eye) {

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

function update_particles_buffers(batch) {
    // NOTE: update buffers only for visible bundles
    var pdata = batch.particles_data;
    if (!(pdata && pdata.need_buffers_update))
        return;

    var pbuf = batch.bufs_data;
    m_geom.make_dynamic(pbuf);
    var vbo_array = pbuf.vbo_array;

    var pointers = pbuf.pointers;
    var pos_pointer = pointers["a_position"];
    var norm_pointer = pointers["a_normal"];

    vbo_array.set(pdata.positions_cache, pos_pointer.offset);
    vbo_array.set(pdata.normals_cache, norm_pointer.offset);

    m_geom.update_gl_buffers(pbuf);
}

}
