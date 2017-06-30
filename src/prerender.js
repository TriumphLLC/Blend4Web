/**
 * Copyright (C) 2014-2017 Triumph LLC
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

var m_debug    = require("__debug");
var m_geom     = require("__geometry");
var m_obj      = require("__objects");
var m_render   = require("__renderer");
var m_subs     = require("__subscene");
var m_tsr      = require("__tsr");
var m_util     = require("__util");

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

    } else if (subs.need_perm_uniforms_update) {
        var draw_data = subs.draw_data;
        for (var i = 0; i < draw_data.length; i++) {
            var bundles = draw_data[i].bundles;
            for (var j = 0; j < bundles.length; j++) {
                var bundle = bundles[j];
                var batch = bundle.batch;

                    batch.shader.need_uniforms_update = true;
            }
        }
        subs.need_perm_uniforms_update = false;
    }

    if (subs.need_draw_data_sort)
        m_subs.sort_draw_data(subs);
}

/**
 * Calculate LOD visibility and cull out-of-frustum/subscene-specific bundles.
 * @returns {boolean} do_render flag for bundle
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

    var batch = bundle.batch;

    if (!m_obj.update_lod_visibility(batch, obj_render, eye))
        return false;

    obj_render.is_visible = true;

    if (subs.type == m_subs.DEBUG_VIEW)
        if (subs.debug_view_mode == m_debug.DV_BOUNDINGS)
            return batch.debug_sphere;
        else
            return !batch.debug_sphere;

    if (subs.type == m_subs.OUTLINE_MASK && obj_render.outline_intensity == 0)
        return false;

    if (!(batch.do_not_cull || !bundle.world_bounds) && USE_FRUSTUM_CULLING &&
            is_out_of_frustum(cam.frustum_planes, bundle.world_bounds.bs, 
            bundle.world_bounds.be, batch.use_be))
        return false;

    return true;
}

function is_out_of_frustum(planes, bs, be, use_be) {

    // optimization - check sphere first
    var pt = bs.center;
    if (m_util.sphere_is_out_of_frustum(pt, planes, bs.radius))
        return true;
    else if (!use_be)
        return false;

    var axis_x = be.axis_x;
    var axis_y = be.axis_y;
    var axis_z = be.axis_z;
    pt = be.center;
    var is_out = m_util.ellipsoid_is_out_of_frustum(pt, planes,
                                                      axis_x, axis_y, axis_z);
    return is_out;
}

function update_particles_buffers(batch) {
    // NOTE: update buffers only for visible bundles
    var pdata = batch.particles_data;
    if (!(pdata && pdata.need_buffers_update))
        return;

    var pbuf = batch.bufs_data;
    m_geom.make_dynamic(pbuf);

    var pointers = pbuf.pointers;

    var pos_offset = pointers["a_position"].offset;
    m_geom.vbo_source_data_set_attr(pbuf.vbo_source_data, "a_position", 
            pdata.positions_cache, pos_offset);

    var tbn_offset = pointers["a_tbn"].offset;
    m_geom.vbo_source_data_set_attr(pbuf.vbo_source_data, "a_tbn", 
            pdata.tbn_cache, tbn_offset);

    m_geom.update_gl_buffers(pbuf);
}

}
