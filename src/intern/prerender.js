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
import register from "../util/register.js";

import m_debug_subscene_fact from "./debug/subscene.js";
import m_geom_fact from "./geometry.js";
import m_obj_fact from "./objects.js";
import m_render_fact from "./renderer.js";
import m_subs_fact from "./subscene.js";
import * as m_tsr from "./tsr.js";
import * as m_util from "./util.js";
import * as m_vec3 from "../libs/gl_matrix/vec3.js";

/**
 * Prerender module, perform culling/lod stuff.
 * @name prerender
 * @namespace
 * @exports exports as scenes
 */
function Int_prerender(ns, exports) {

var m_debug_subscene = m_debug_subscene_fact(ns);
var m_geom     = m_geom_fact(ns);
var m_obj      = m_obj_fact(ns);
var m_render   = m_render_fact(ns);
var m_subs     = m_subs_fact(ns);

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

                if (bundle.do_render) {
                    var cam = subs.camera;
                    var cam_pos = m_tsr.get_trans(cam.world_tsr, _vec3_tmp);
                    var z_index = get_z_index(bundle, cam_pos);
                    bundle.z_index = z_index;
                } else {
                    bundle.z_index = Infinity;
                }
            }

            if (bundles.length > 0 && !bundles[0].batch.blend) {
                sort_bundles(bundles);
                draw_data.z_index = bundles[0].z_index;
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

function sort_bundles(bundles) {
    bundles.sort(sort_fun);
}

function sort_fun(a, b) {
    return a.z_index - b.z_index;
}

function get_z_index(bundle, cam_pos) {
    if (bundle.world_bounds) {
        var bs = bundle.world_bounds.bs;

        // Return z_index heuristically.
        // CHECK: Why do we use exacly this expression?
        return m_vec3.squaredDistance(bs.center, cam_pos) + bs.radius * bs.radius;
    } else {
        return Infinity;
    }
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
        if (subs.debug_view_mode == m_debug_subscene.DV_BOUNDINGS)
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

var int_prerender_factory = register("__prerender", Int_prerender);

export default int_prerender_factory;
