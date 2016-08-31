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

var m_cfg      = require("__config");
var m_debug    = require("__debug");
var m_geom     = require("__geometry");
var m_obj_util = require("__obj_util");
var m_render   = require("__renderer");
var m_subs     = require("__subscene");
var m_tsr      = require("__tsr");
var m_util     = require("__util");
var m_vec3     = require("__vec3");

var cfg_def = m_cfg.defaults;

var USE_FRUSTUM_CULLING = true;

var SUBS_UPDATE_DO_RENDER = [
    m_subs.MAIN_OPAQUE,
    m_subs.MAIN_BLEND,
    m_subs.MAIN_PLANE_REFLECT,
    m_subs.MAIN_CUBE_REFLECT,
    m_subs.MAIN_PLANE_REFLECT_BLEND,
    m_subs.MAIN_CUBE_REFLECT_BLEND,
    m_subs.MAIN_GLOW,
    m_subs.MAIN_XRAY,
    m_subs.SHADOW_CAST,
    m_subs.SHADOW_RECEIVE,
    m_subs.OUTLINE_MASK,
    m_subs.DEBUG_VIEW,
    m_subs.COLOR_PICKING,
    m_subs.COLOR_PICKING_XRAY
];

var _vec3_tmp = new Float32Array(3);

/**
 * Set do_render flag for subscenes/bundles
 */
exports.prerender_subs = function(subs) {
    if (SUBS_UPDATE_DO_RENDER.indexOf(subs.type) > -1) {
        var has_render_bundles = false;
        var is_cube_subs = subs.type == m_subs.MAIN_CUBE_REFLECT
                        || subs.type == m_subs.MAIN_CUBE_REFLECT_BLEND;

        var draw_data = subs.draw_data;

        for (var i = 0; i < draw_data.length; i++) {

            var ddata = draw_data[i];
            var bundles = ddata.bundles;
            var draw_data_do_render = false;

            for (var j = 0; j < bundles.length; j++) {
                var bundle = bundles[j];
                var batch = bundle.batch;

                if (batch.shader_updated) {
                    //NOTE: happens after shader recompilation
                    if (m_subs.append_draw_data(subs, bundle))
                        subs.need_draw_data_sort = true;
                }

                if (is_cube_subs) {
                    for (var k = 0; k < 6; k++) {
                        subs.camera.frustum_planes = subs.cube_cam_frustums[k];
                        bundle.do_render_cube[k] = prerender_bundle(bundle, subs);
                        if (bundle.do_render_cube[k]) {
                            has_render_bundles = true;
                            draw_data_do_render = true;
                            update_particles_buffers(batch);
                        }
                    }
                } else {
                    bundle.do_render = prerender_bundle(bundle, subs);
                    if (bundle.do_render) {
                        has_render_bundles = true;
                        draw_data_do_render = true;
                        update_particles_buffers(batch);
                    }
                }
                if (subs.need_perm_uniforms_update)
                    batch.shader.need_uniforms_update = true;
            }
            ddata.do_render = draw_data_do_render;
        }
        subs.need_perm_uniforms_update = false;

        switch (subs.type) {
        case m_subs.DEBUG_VIEW:
            // NOTE: debug view subs rendered optionally
            break;
        default:
            // prevent bugs when blend is only one rendered
            if (subs.type == m_subs.MAIN_OPAQUE || subs.type == m_subs.SHADOW_RECEIVE 
                    || subs.type == m_subs.MAIN_GLOW || subs.type == m_subs.MAIN_PLANE_REFLECT
                    || subs.type == m_subs.MAIN_CUBE_REFLECT || has_render_bundles)
                subs.do_render = true;
            else {
                // clear subscene if it switches "do_render" flag to false
                if (subs.do_render)
                    m_render.clear(subs);
                subs.do_render = false;
            }
            break;
        }

        if (subs.type == m_subs.MAIN_BLEND || subs.type == m_subs.MAIN_XRAY)
            zsort(subs);

    } else {
        var draw_data = subs.draw_data;
        for (var i = 0; i < draw_data.length; i++) {
            var bundles = draw_data[i].bundles;
            for (var j = 0; j < bundles.length; j++) {
                var bundle = bundles[j];
                var batch = bundle.batch;

                if (subs.need_perm_uniforms_update)
                    batch.shader.need_uniforms_update = true;

                if (batch.shader_updated) {
                    //NOTE: happens after shader recompilation
                    if (m_subs.append_draw_data(subs, bundle))
                        subs.need_draw_data_sort = true;
                }
            }
        }
        subs.need_perm_uniforms_update = false;
    }

    if (subs.need_draw_data_sort)
        m_subs.sort_draw_data(subs);
}

/**
 * Perform Z-sort when camera moves
 * @methodOf camera
 */
function zsort(subs) {

    if (!cfg_def.alpha_sort)
        return;

    var eye = m_tsr.get_trans(subs.camera.world_tsr, _vec3_tmp);

    var draw_data = subs.draw_data;
    for (var i = 0; i < draw_data.length; i++) {
        var bundles = draw_data[i].bundles;
        for (var j = 0; j < bundles.length; j++) {

            var bundle = bundles[j];
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
}

/**
 * Calculate LOD visibility and cull out-of-frustum/subscene-specific bundles.
 * @returns {Boolean} do_render flag for bundle
 */
function prerender_bundle(bundle, subs) {

    var obj_render = bundle.obj_render;

    obj_render.is_visible = false;

    if (obj_render.hide)
        return false;

    var cam = subs.camera;

    if (subs.type == m_subs.SHADOW_CAST)
        var eye = cam.lod_eye;
    else
        var eye = m_tsr.get_trans(cam.world_tsr, _vec3_tmp);

    if (!is_lod_visible(obj_render, eye))
        return false;

    obj_render.is_visible = true;

    var batch = bundle.batch;

    if (subs.type == m_subs.DEBUG_VIEW)
        if (subs.debug_view_mode == m_debug.DV_BOUNDINGS)
            return batch.debug_sphere;
        else
            return !batch.debug_sphere;

    if (subs.type == m_subs.OUTLINE_MASK && obj_render.outline_intensity == 0)
        return false;

    if (is_out_of_frustum(obj_render, cam.frustum_planes, batch) &&
            USE_FRUSTUM_CULLING)
        return false;

    return true;
}

function is_out_of_frustum(obj_render, planes, batch) {

    if (obj_render.do_not_cull)
        return false;

    // optimization - check object sphere first
    var bs = obj_render.bs_world;
    var pt = bs.center;
    if (m_util.sphere_is_out_of_frustum(pt, planes, bs.radius))
        return true;
    else if (obj_render.do_not_use_be)
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

    var dist = m_vec3.dist(center, eye);

    if (dist < dist_min)
        return false;
    // for objects with no lods or with infinite lod_dist_max
    if (dist_max == m_obj_util.LOD_DIST_MAX_INFINITY)
        return true;

    // additional interval for transition, fixes LOD flickering
    var tr_int = obj_render.lod_transition_ratio * obj_render.bs_world.radius;

    if (dist < (dist_max + tr_int))
        return true;

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
