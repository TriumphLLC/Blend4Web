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
 * Rendering internal API.
 * Performs most of GPU (WebGL) operations.
 * GL context is registered by setup_context() function.
 * @name renderer
 * @namespace
 * @exports exports as renderer
 */
b4w.module["__renderer"] = function(exports, require) {

var m_batch    = require("__batch");
var m_cam      = require("__camera");
var m_cfg      = require("__config");
var m_debug    = require("__debug");
var m_ext      = require("__extensions");
var m_geom     = require("__geometry");
var m_quat     = require("__quat");
var m_subs     = require("__subscene");
var m_textures = require("__textures");
var m_tsr      = require("__tsr");
var m_util     = require("__util");
var m_ver      = require("__version");
var m_geom     = require("__geometry");

var m_vec3     = require("__vec3");

var USE_BACKFACE_CULLING = true;

var DEBUG_DISABLE_RENDER_LOCK = false;

// special backgroud color for shadow map
var SHADOW_BG_COLOR = [1, 1, 1, 1];
var DEPTH_BG_COLOR = [1, 1, 1, 1];
var COLOR_PICKING_BG_COLOR = [0,0,0,1];
var BLACK_BG_COLOR = [0,0,0,0];

var SKY_HACK_COLOR = new Uint8Array([0.36*255, 0.56*255, 0.96*255, 255]);

var CUBEMAP_UPPER_SIDE = 2;
var CUBEMAP_BOTTOM_SIDE = 3;

// smaa stuff
var JITTER = [new Float32Array([0.25, -0.25]),
              new Float32Array([-0.25, 0.25])];
var SUBSAMPLE_IND = [new Float32Array([1, 1, 1, 0]),
                     new Float32Array([2, 2, 2, 0])];

// DEBUG_VIEW render time calculation
var DEBUG_VIEW_RT_SMOOTH_INTERVALS = 15;

var _gl = null;
var _subpixel_index = 0;

var _gl_draw_elems_inst = null;
var _gl_vert_attr_div = null;
var _gl_draw_array = null;

var _gl_bind_vertex_array = null;

var _draw_batch = null;

var _vec3_tmp  = new Float32Array(3);
var _quat_tmp  = m_quat.create();
var _ivec4_tmp = new Uint8Array(4);

var cfg_ctx = m_cfg.context;
var cfg_def = m_cfg.defaults;

/**
 * Setup WebGL context
 * @param gl WebGL context
 */
exports.setup_context = function(gl) {

    var bc = cfg_def.background_color;
    gl.clearColor(bc[0], bc[1], bc[2], bc[3]);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    if (USE_BACKFACE_CULLING) {
        gl.enable(gl.CULL_FACE);
        gl.frontFace(gl.CCW);
        gl.cullFace(gl.BACK);
    } else {
        gl.disable(gl.CULL_FACE);
    }
    gl.enable(gl.BLEND);

    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // http://stackoverflow.com/questions/11521035/blending-with-html-background-in-webgl
    //gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    _gl = gl;
}


/**
 * Draw renders and batch to camera
 */
exports.draw = function(subscene) {

    if (!subscene.do_render)
        return;

    if (subscene.type == m_subs.RESOLVE) {
        m_debug.render_time_start_subs(subscene);
        draw_resolve(subscene);
        m_debug.render_time_stop_subs(subscene);

        m_debug.check_gl("draw resolve");
    } else if (subscene.type == m_subs.COPY) {
        m_debug.render_time_start_subs(subscene);
        draw_copy(subscene);
        m_debug.render_time_stop_subs(subscene);

        m_debug.check_gl("draw copy");
    } else {
        m_debug.render_time_start_subs(subscene);
        prepare_subscene(subscene);

        if (subscene.type == m_subs.MAIN_CUBE_REFLECT || subscene.type == m_subs.MAIN_CUBE_REFLECT_BLEND)
            draw_cube_reflection_subs(subscene);
        else
            draw_subs(subscene);

        m_debug.render_time_stop_subs(subscene);

        m_debug.check_gl("draw subscene: " + m_subs.subs_label(subscene));
        // NOTE: fix for strange issue with skydome rendering
        // NOTE: commented below code was checked on Windows. All is fine.
        // _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);
    }
}

function draw_cube_reflection_subs(subscene) {
    var camera           = subscene.camera;
    var color_attachment = camera.color_attachment;
    var w_tex            = color_attachment.w_texture;
    var v_matrs          = subscene.cube_view_matrices;

    // cube reflections are rendered in 6 directions
    for (var i = 0; i < 6; i++) {
        var w_target = get_cube_target_by_id(i);
        camera.view_matrix = subscene.cube_view_matrices[i];
        m_tsr.from_mat4(camera.view_matrix, camera.view_tsr);

        m_cam.calc_sky_vp_inverse(camera);

        _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0,
            w_target, w_tex, 0);

        clear_binded_framebuffer(subscene);

        var draw_data = subscene.draw_data;
        for (var j = 0; j < draw_data.length; j++)
            for (var k = 0; k < draw_data[j].bundles.length; k++) {
                var bundle = draw_data[j].bundles[k];
                bundle.do_render = bundle.do_render_cube[i];
            }

        draw_subs(subscene);
    }
}

function draw_resolve(subscene) {
    var camera = subscene.camera;

    _gl.bindFramebuffer(_gl.READ_FRAMEBUFFER, camera.framebuffer_prev);
    _gl.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, camera.framebuffer);

    var blit_mask = 0;

    if (camera.color_attachment)
        blit_mask |= _gl.COLOR_BUFFER_BIT;

    if (camera.depth_attachment)
        blit_mask |= _gl.DEPTH_BUFFER_BIT;

    _gl.blitFramebuffer(
            0, 0, camera.width, camera.height,
            0, 0, camera.width, camera.height,
            blit_mask, _gl.NEAREST);
}

function draw_copy(subscene) {
    var camera = subscene.camera;

    _gl.bindFramebuffer(_gl.FRAMEBUFFER, camera.framebuffer_prev);

    var tex = camera.color_attachment;
    var w_tex = tex.w_texture;
    _gl.bindTexture(_gl.TEXTURE_2D, w_tex);

    _gl.copyTexSubImage2D(_gl.TEXTURE_2D, 0,
            0, 0, 0, 0, camera.width, camera.height, 0);
}

function draw_subs(subscene) {
    var camera = subscene.camera;
    var draw_data = subscene.draw_data;
    var current_program = null;

    var eye = m_tsr.get_trans(camera.world_tsr, _vec3_tmp);

    for (var i = 0; i < draw_data.length; i ++) {

        var ddata = draw_data[i];

        if (!ddata.do_render)
            continue;

        var shader = ddata.shader;
        var bundles = ddata.bundles;

        if (shader.program != current_program) {
            _gl.useProgram(shader.program);
            setup_scene_uniforms(subscene, camera, shader);
            current_program = shader.program;
        }

        for (var j = 0; j < bundles.length; j++) {
            var bundle = bundles[j];
            if (bundle.do_render) {
                var obj_render = bundle.obj_render;
                var batch = bundle.batch;

                m_debug.render_time_start_batch(batch);
                if (m_debug.is_debug_view_render_time_mode() && batch.type == "DEBUG_VIEW")
                    batch.debug_main_batch_render_time = m_util.smooth(
                            m_batch.batch_get_debug_storage(batch.debug_main_batch_id),
                            batch.debug_main_batch_render_time, 1, DEBUG_VIEW_RT_SMOOTH_INTERVALS);

                if (cfg_def.alpha_sort && batch.z_sort) // do it right before drawing
                    zsort(batch, obj_render, bundle.info_for_z_sort_updates, eye);

                draw_bundle(subscene, obj_render, batch, shader);

                m_debug.render_time_stop_batch(batch);
                if (m_debug.is_debug_view_render_time_mode() && batch.type == "MAIN")
                    m_batch.batch_set_debug_storage(batch.id, batch.debug_render_time);
            }
        }
    }
}

function setup_scene_uniforms(subs, camera, shader) {
    var transient_sc_uniform_setters = shader.transient_sc_uniform_setters;
    var j = transient_sc_uniform_setters.length;
    while (j--) {
        var setter = transient_sc_uniform_setters[j];
        setter.fun(_gl, setter.loc, subs, camera);
    }

    if (shader.need_uniforms_update && !shader.no_permanent_uniforms) {
        if (!shader.permanent_sc_uniform_setters.length)
            assign_uniform_setters(shader);

        var permanent_sc_uniform_setters = shader.permanent_sc_uniform_setters;
        var j = permanent_sc_uniform_setters.length;
        while (j--) {
            var setter = permanent_sc_uniform_setters[j];
            setter.fun(_gl, setter.loc, subs, camera);
        }
    }
}

exports.clear = function(subscene) {
    var camera = subscene.camera;
    _gl.bindFramebuffer(_gl.FRAMEBUFFER, camera.framebuffer);
    clear_binded_framebuffer(subscene);
}

function prepare_subscene(subscene) {

    var camera = subscene.camera;

    _gl.bindFramebuffer(_gl.FRAMEBUFFER, camera.framebuffer);

    if (subscene.assign_texture) {
        var tex = camera.color_attachment;

        _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0,
            tex.w_target, tex.w_texture, 0);
    }

    _gl.viewport(0, 0, camera.width, camera.height);

    if (subscene.type != m_subs.MAIN_CUBE_REFLECT && subscene.type != m_subs.MAIN_CUBE_REFLECT_BLEND)
        clear_binded_framebuffer(subscene);

    if (subscene.blend)
        _gl.enable(_gl.BLEND);
    else
        _gl.disable(_gl.BLEND);

    if (subscene.depth_test)
        _gl.enable(_gl.DEPTH_TEST);
    else
        _gl.disable(_gl.DEPTH_TEST);

    // prevent self-shadow issues
    switch (subscene.type) {
    case m_subs.SHADOW_CAST:
        _gl.enable(_gl.POLYGON_OFFSET_FILL);
        _gl.polygonOffset(subscene.self_shadow_polygon_offset,
                subscene.self_shadow_polygon_offset);
        /*
         * bad as it leads to impossibility to use backface culling
         * for some objects.
         * _gl.cullFace(_gl.FRONT);
         */
        _gl.cullFace(_gl.BACK);
        break;
    case m_subs.MAIN_PLANE_REFLECT:
    case m_subs.MAIN_PLANE_REFLECT_BLEND:
        _gl.disable(_gl.POLYGON_OFFSET_FILL);
        _gl.cullFace(_gl.FRONT);
        break;
    case m_subs.DEBUG_VIEW:
        // to overlap other batches
        _gl.enable(_gl.POLYGON_OFFSET_FILL);
        _gl.polygonOffset(-4, -4);
        _gl.cullFace(_gl.BACK);
        break;
    case m_subs.MAIN_GLOW:
        if (cfg_def.msaa_samples > 1 || cfg_def.safari_glow_hack) {
            // correct resolved depth offset
            _gl.enable(_gl.POLYGON_OFFSET_FILL);
            _gl.polygonOffset(-2, -2);
            break;
        }
        // else continue to default
    default:
        _gl.disable(_gl.POLYGON_OFFSET_FILL);
        _gl.cullFace(_gl.BACK);
    }

    // NOTE: temoporary disabled T2X mode due to artifacts with blend objects
    //if (cfg_def.smaa)
    //    setup_smaa_jitter(subscene);
}

function clear_binded_framebuffer(subscene) {
    if (subscene) {
        var bitfield = (subscene.clear_color ? _gl.COLOR_BUFFER_BIT : 0) |
            (subscene.clear_depth ? _gl.DEPTH_BUFFER_BIT : 0);

        // do nothing
        if (!bitfield)
            return;

        // NOTE: place in graph module?
        switch (subscene.type) {
        case m_subs.MAIN_GLOW:
            var bc = BLACK_BG_COLOR;
            break;
        case m_subs.SHADOW_CAST:
            var bc = SHADOW_BG_COLOR;
            break;
        case m_subs.SHADOW_RECEIVE:
            var bc = DEPTH_BG_COLOR;
            break;
        case m_subs.COLOR_PICKING:
        case m_subs.COLOR_PICKING_XRAY:
        case m_subs.ANCHOR_VISIBILITY:
            var bc = COLOR_PICKING_BG_COLOR;
            break;
        case m_subs.OUTLINE_MASK:
        case m_subs.SMAA_BLENDING_WEIGHT_CALCULATION:
        case m_subs.SMAA_EDGE_DETECTION:
            var bc = BLACK_BG_COLOR;
            break;
        default:
            var bc = cfg_def.background_color;
            break;
        }
    } else {
        var bitfield = _gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT;
        var bc = cfg_def.background_color;
    }

    // NOTE: activate them to make proper clean
    _gl.colorMask(true, true, true, true);
    _gl.depthMask(true);

    _gl.clearColor(bc[0], bc[1], bc[2], bc[3]);
    _gl.clear(bitfield);
}

function setup_smaa_jitter(subscene) {
    var jitter = JITTER[_subpixel_index]
    var camera = subscene.camera;

    subscene.jitter_projection_space[0] = jitter[0] * 2 / camera.width;
    subscene.jitter_projection_space[1] = jitter[1] * 2 / camera.height;

    if (subscene.type == m_subs.SMAA_BLENDING_WEIGHT_CALCULATION)
        subscene.jitter_subsample_ind = SUBSAMPLE_IND[_subpixel_index];
}

function draw_bundle(subscene, obj_render, batch, shader) {
    // setup uniforms
    var transient_uniform_setters = shader.transient_uniform_setters;
    var i = transient_uniform_setters.length;
    while (i--) {
        var setter = transient_uniform_setters[i];
        setter.fun(_gl, setter.loc, obj_render, batch);
    }

    if (shader.need_uniforms_update && !shader.no_permanent_uniforms) {
        if (!shader.permanent_uniform_setters.length)
            assign_uniform_setters(shader);

        var permanent_uniform_setters = shader.permanent_uniform_setters;
        var i = permanent_uniform_setters.length;
        while (i--) {
            var setter = permanent_uniform_setters[i];
            setter.fun(_gl, setter.loc, obj_render, batch);
        }
        shader.need_uniforms_update = false;
    }

    _gl.depthMask(batch.depth_mask);

    if (USE_BACKFACE_CULLING) {
        if (batch.use_backface_culling)
            _gl.enable(_gl.CULL_FACE);
        else
            _gl.disable(_gl.CULL_FACE);
    }

    setup_textures(batch.textures);

    if (subscene.type == m_subs.SKY) {
        draw_sky(subscene, batch, shader);
        subscene.debug_render_calls+=6;
    } else {
        _draw_batch(batch, obj_render.va_frame);
        subscene.debug_render_calls++;
    }
}

/**
 * Perform Z-sort when camera moves
 */
function zsort(batch, obj_render, info, eye) {

    var bufs_data = batch.bufs_data;

    // update if camera shifted enough
    var cam_shift = m_vec3.dist(eye, info.zsort_eye_last);

    // take batch geometry size into account
    var shift_param = cfg_def.alpha_sort_threshold * Math.min(info.bb_min_side, 1);
    var batch_cam_updated = cam_shift > shift_param;

    if (!batch_cam_updated && !obj_render.force_zsort)
        return;

    m_geom.update_buffers_movable(bufs_data, info, obj_render.world_tsr, eye);

    // remember new coords
    m_vec3.copy(eye, info.zsort_eye_last);

    obj_render.force_zsort = false;
}

function draw_sky(subscene, batch, shader) {

    var camera = subscene.camera;
    var uniforms = shader.uniforms;
    var color_attachment = camera.color_attachment;
    var w_tex            = color_attachment.w_texture;

    var v_matrs = subscene.cube_view_matrices;

    for (var i = 0; i < 6; i++) {
        var w_target = get_cube_target_by_id(i);

        if (cfg_def.clear_procedural_sky_hack) {
            var w_target_cube = _gl.TEXTURE_CUBE_MAP;
            _gl.bindTexture(w_target_cube, w_tex);
            _gl.texImage2D(w_target, 0, _gl.RGBA,
                    1, 1, 0, _gl.RGBA, _gl.UNSIGNED_BYTE, SKY_HACK_COLOR);
        } else {
            _gl.uniformMatrix4fv(uniforms["u_cube_view_matrix"], false, v_matrs[i]);

            _gl.uniform4fv(uniforms["u_sky_tex_fac"], subscene.sky_tex_fac);
            _gl.uniform3fv(uniforms["u_sky_tex_color"], subscene.sky_tex_color);
            _gl.uniform1f(uniforms["u_sky_tex_dvar"], subscene.sky_tex_default_value);
            _gl.uniform3fv(uniforms["u_horizon_color"], subscene.horizon_color);
            _gl.uniform3fv(uniforms["u_zenith_color"], subscene.zenith_color);

            _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0,
                w_target, w_tex, 0);
            _draw_batch(batch, 0);
        }
        if (subscene.need_fog_update && i != CUBEMAP_BOTTOM_SIDE)
            update_subs_sky_fog(subscene, i);
    }
}

function update_subs_sky_fog(subscene, cubemap_side_ind) {
    // get pixel from every side of cubemap for procedural fog calculation
    var col = _ivec4_tmp;

    if (cfg_def.clear_procedural_sky_hack)
        col.set(SKY_HACK_COLOR);
    else {
        // TODO: Avoid read pixels here. Better to recalculate it manually
        _gl.readPixels(191, 191, 1, 1, _gl.RGBA, _gl.UNSIGNED_BYTE, col);
        if (col[0] == 255 || col[1] == 255 || col[2] == 255) {
            _gl.readPixels(191, 220, 1, 1, _gl.RGBA, _gl.UNSIGNED_BYTE, col);
        }
    }

    var res_r = col[0]; var res_g = col[1]; var res_b = col[2];

    res_r /= 255;
    res_g /= 255;
    res_b /= 255;

    if (cubemap_side_ind === CUBEMAP_UPPER_SIDE) {
        subscene.cube_fog[3]  = res_r;
        subscene.cube_fog[7]  = res_g;
        subscene.cube_fog[11] = res_b;
    } else if (cubemap_side_ind < 2) {
        subscene.cube_fog[4 * cubemap_side_ind]     = res_r;
        subscene.cube_fog[4 * cubemap_side_ind + 1] = res_g;
        subscene.cube_fog[4 * cubemap_side_ind + 2] = res_b;
    } else {
        subscene.cube_fog[4 * (cubemap_side_ind - 2)]     = res_r;
        subscene.cube_fog[4 * (cubemap_side_ind - 2) + 1] = res_g;
        subscene.cube_fog[4 * (cubemap_side_ind - 2) + 2] = res_b;
    }
}

function get_cube_target_by_id(id) {
    switch (id) {
    case 0:
        return _gl.TEXTURE_CUBE_MAP_POSITIVE_X;
    case 1:
        return _gl.TEXTURE_CUBE_MAP_NEGATIVE_X;
    case 2:
        return _gl.TEXTURE_CUBE_MAP_POSITIVE_Y;
    case 3:
        return _gl.TEXTURE_CUBE_MAP_NEGATIVE_Y;
    case 4:
        return _gl.TEXTURE_CUBE_MAP_POSITIVE_Z;
    case 5:
        return _gl.TEXTURE_CUBE_MAP_NEGATIVE_Z;
    }
}

exports.assign_attribute_setters = function(batch) {
    var attr_setters = batch.attribute_setters;
    attr_setters.length = 0;

    var bufs_data = batch.bufs_data;
    var shader = batch.shader;

    var pointers = bufs_data.pointers;
    var attributes = shader.attributes;

    for (var name in attributes) {
        var p = pointers[name];
        var vbo_type = m_geom.get_vbo_type_by_attr_name(name);
        var gl_type = m_geom.get_gl_type_by_attr_name(name);
        var type_size = m_geom.get_type_size_by_attr_name(name);

        var setter = {
            vbo_type: vbo_type,
            gl_type: gl_type,
            loc: attributes[name],
            base_offset: p.offset * type_size,
            frame_length: p.frames > 1 ? p.length * type_size : 0,
            num_comp: p.num_comp,
            stride: p.stride * type_size,
            divisor: p.divisor
        };
        attr_setters.push(setter);
    }

    if (m_ver.type() == "DEBUG")
        for (var name in pointers) {
            var vbo_type = m_geom.get_vbo_type_by_attr_name(name);
            var index = m_geom.search_vbo_index_by_type(bufs_data.vbo_data, vbo_type);
            var vbo_obj = bufs_data.vbo_data[index];

            var sh_pair_str = batch.shaders_info.vert + " | " + batch.shaders_info.frag;
            var byte_size = pointers[name].length * pointers[name].frames 
                    * m_geom.get_type_size_by_attr_name(name);
            m_debug.fill_vbo_garbage_info(vbo_obj.debug_id, sh_pair_str, name, 
                    byte_size, name in attributes);
        }

    if (cfg_def.allow_vao_ext)
        assign_vao(batch);
}

exports.assign_vao = assign_vao;
function assign_vao(batch) {
    var vao_ext = m_ext.get_vertex_array_object();
    var attr_setters = batch.attribute_setters;
    var bufs_data = batch.bufs_data;
    var pointers = bufs_data.pointers;

    batch.vaos.length = 0

    var frames = 1;
    // find the maximum frame length among all pointers to create enough VAOs
    for (var name in pointers)
        frames = Math.max(frames, pointers[name].frames);

    for (var i = 0; i < frames; i++) {

        var vao = vao_ext.createVertexArray();
        _gl_bind_vertex_array(vao);

        if (bufs_data.ibo)
            _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, bufs_data.ibo);

        for (var j = 0; j < bufs_data.vbo_data.length; j++) {
            _gl.bindBuffer(_gl.ARRAY_BUFFER, bufs_data.vbo_data[j].vbo);

            for (var k = 0; k < attr_setters.length; k++) {
                var setter = attr_setters[k];
                if (setter.vbo_type == bufs_data.vbo_data[j].type) {
                    _gl.enableVertexAttribArray(setter.loc);
                    var offset = setter.base_offset + setter.frame_length * i;

                    var normalized = setter.gl_type == _gl.FLOAT ? false : true;
                    _gl.vertexAttribPointer(setter.loc, setter.num_comp, setter.gl_type, normalized,
                            setter.stride, offset);
                    _gl_vert_attr_div(setter.loc, setter.divisor);
                }
            }
        }

        _gl_bind_vertex_array(null);

        batch.vaos.push(vao);
    }
}

exports.cleanup_vao = function(batch) {
    var ext = m_ext.get_vertex_array_object();
    for (var i = 0; i < batch.vaos.length; i++)
        ext.deleteVertexArray(batch.vaos[i]);
    batch.vaos.length = 0;
}

exports.clone_attribute_setters = function(setters) {
    var setters_new = [];

    for (var i = 0; i < setters.length; i++) {
        var setter = setters[i];

        var setter_new = {
            vbo_type: setter.vbo_type,
            gl_type: setter.gl_type,
            loc: setter.loc,
            base_offset: setter.base_offset,
            frame_length: setter.frame_length,
            num_comp: setter.num_comp,
            stride: setter.stride,
            divisor: setter.divisor
        };

        setters_new.push(setter);
    }
    return setters_new;
}

exports.assign_uniform_setters = assign_uniform_setters;
function assign_uniform_setters(shader) {
    var uniforms = shader.uniforms;

    var transient_uniform_setters = shader.transient_uniform_setters;
    var permanent_uniform_setters = shader.permanent_uniform_setters;
    var transient_sc_uniform_setters = shader.transient_sc_uniform_setters;
    var permanent_sc_uniform_setters = shader.permanent_sc_uniform_setters;

    transient_uniform_setters.length = 0;
    permanent_uniform_setters.length = 0;
    transient_sc_uniform_setters.length = 0;
    permanent_sc_uniform_setters.length = 0;

    for (var uni in uniforms) {
        var transient_uni = false;

        var scene_fun = null;
        var fun = null;

        switch (uni) {
        // from camera
        case "u_proj_matrix":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniformMatrix4fv(loc, false, camera.proj_matrix);
            }
            transient_uni = true;
            break;
        case "u_view_refl_matrix":
            // NOTE: used for reflection
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniformMatrix4fv(loc, false, camera.view_refl_matrix);
            }
            transient_uni = true;
            break;
        case "u_view_tsr":
        case "u_view_tsr_frag":
            scene_fun = function(gl, loc, subscene, camera) {
                if (camera.reflection_plane)
                    gl.uniformMatrix3fv(loc, false, camera.real_view_tsr);
                else
                    gl.uniformMatrix3fv(loc, false, camera.view_tsr);
            }
            transient_uni = true;
            break;
        case "u_view_tsr_inverse":
            scene_fun = function(gl, loc, subscene, camera) {
                if (camera.reflection_plane)
                    gl.uniformMatrix3fv(loc, false, camera.real_view_tsr_inv);
                else
                    gl.uniformMatrix3fv(loc, false, camera.view_tsr_inv);
            }
            transient_uni = true;
            break;
        case "u_shadow_cast_billboard_view_tsr":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniformMatrix3fv(loc, false, camera.shadow_cast_billboard_view_tsr);
            }
            transient_uni = true;
            break;
        case "u_view_proj_prev":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniformMatrix4fv(loc, false, camera.prev_view_proj_matrix);
            }
            transient_uni = true;
            break;
        case "u_view_proj_matrix":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniformMatrix4fv(loc, false, camera.view_proj_matrix);
            }
            transient_uni = true;
            break;
        case "u_view_proj_inverse":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniformMatrix4fv(loc, false, camera.view_proj_inv_matrix);
            }
            transient_uni = true;
            break;
        case "u_sky_vp_inverse":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniformMatrix4fv(loc, false, camera.sky_vp_inv_matrix);
            }
            transient_uni = true;
            break;
        case "u_camera_eye":
        case "u_camera_eye_frag":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform3fv(loc, m_tsr.get_trans(camera.world_tsr, _vec3_tmp));
            }
            transient_uni = true;
            break;
        case "u_camera_quat":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform4fv(loc, m_tsr.get_quat(camera.world_tsr, _quat_tmp));
            }
            transient_uni = true;
            break;
        case "u_view_max_depth":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, camera.far);
            }
            transient_uni = true;
            break;
        case "u_camera_range":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform2f(loc, camera.near, camera.far);
            }
            break;
        case "u_csm_center_dists":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform4fv(loc, camera.csm_center_dists);
            }
            break;
        case "u_height":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, camera.height);
            }
            transient_uni = true;
            break;
        case "u_pcf_blur_radii":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform4fv(loc, camera.pcf_blur_radii);
            }
            break;
        // depth of field
        case "u_dof_dist":
            scene_fun = function(gl, loc, subscene, camera) {
                if (camera.dof_on)
                    gl.uniform1f(loc, camera.dof_distance);
                else
                    gl.uniform1f(loc, 0);
            }
            transient_uni = true;
            break;
        case "u_dof_front_start":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, camera.dof_front_start);
            }
            transient_uni = true;
            break;
        case "u_dof_front_end":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, camera.dof_front_end);
            }
            transient_uni = true;
            break;
        case "u_dof_rear_start":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, camera.dof_rear_start);
            }
            transient_uni = true;
            break;
        case "u_dof_rear_end":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, camera.dof_rear_end);
            }
            transient_uni = true;
            break;
        case "u_dof_bokeh_intensity":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, camera.dof_bokeh_intensity);
            }
            transient_uni = true;
            break;

        case "u_cam_water_depth":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.cam_water_depth);
            }
            transient_uni = true;
            break;
        case "u_waves_height":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.water_waves_height);
            }
            break;
        case "u_waves_length":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.water_waves_length);
            }
            break;
        case "u_fog_color_density":
            scene_fun = function(gl, loc, subscene, camera) {
                // NOTE: unused alpha channel
                gl.uniform4fv(loc, subscene.fog_color_density);
            }
            break;
        case "u_fog_params":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform4fv(loc, subscene.fog_params);
            }
            break;
        case "u_underwater_fog_color_density":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform4fv(loc, subscene.water_fog_color_density);
            }
            break;
        case "u_bloom_key":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.bloom_key);
            }
            break;
        case "u_bloom_edge_lum":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.bloom_edge_lum);
            }
            break;

        case "u_time":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.time);
            }
            transient_uni = true;
            break;
        case "u_wind":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform3fv(loc, subscene.wind);
            }
            transient_uni = true;
            break;

        case "u_sky_tex_dvar":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.sky_tex_default_value);
            }
            break;
        case "u_sky_tex_fac":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform4fv(loc, subscene.sky_tex_fac);
            }
            break;
        case "u_sky_tex_color":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform3fv(loc, subscene.sky_tex_color);
            }
            break;
        case "u_horizon_color":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform3fv(loc, subscene.horizon_color);
            }
            break;
        case "u_zenith_color":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform3fv(loc, subscene.zenith_color);
            }
            break;
        case "u_environment_energy":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.environment_energy);
            }
            break;

        // sky
        case "u_sky_color":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform3fv(loc, subscene.sky_color);
            }
            break;
        case "u_rayleigh_brightness":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.rayleigh_brightness);
            }
            break;
        case "u_mie_brightness":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.mie_brightness);
            }
            break;
        case "u_spot_brightness":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.spot_brightness);
            }
            break;
        case "u_scatter_strength":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.scatter_strength);
            }
            break;
        case "u_rayleigh_strength":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.rayleigh_strength);
            }
            break;
        case "u_mie_strength":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.mie_strength);
            }
            break;
        case "u_rayleigh_collection_power":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.rayleigh_collection_power);
            }
            break;
        case "u_mie_collection_power":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.mie_collection_power);
            }
            break;
        case "u_mie_distribution":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.mie_distribution);
            }
            break;

        // light
        case "u_light_positions":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform4fv(loc, subscene.light_positions);
            }
            break;
        case "u_light_directions":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform3fv(loc, subscene.light_directions);
            }
            break;
        case "u_light_color_intensities":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform4fv(loc, subscene.light_color_intensities);
            }
            break;
        case "u_sun_quaternion":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform4fv(loc, subscene.sun_quaternion);
            }
            break;
        case "u_sun_intensity":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform3fv(loc, subscene.sun_intensity);
            }
            break;
        case "u_sun_direction":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform3fv(loc, subscene.sun_direction);
            }
            break;

        // debug (subscene)
        case "u_debug_view_mode":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1i(loc, subscene.debug_view_mode);
            }
            break;
        case "u_debug_colors_seed":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.debug_colors_seed);
            }
            break;
        case "u_debug_render_time_threshold":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.debug_render_time_threshold);
            }
            break;

        case "u_subpixel_jitter":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform2fv(loc, subscene.jitter_projection_space);
            }
            transient_uni = true;
            break;
        case "u_subsample_indices":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform4fv(loc, subscene.jitter_subsample_ind);
            }
            transient_uni = true;
            break;

        // god_rays
        case "u_radial_blur_step":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.radial_blur_step);
            }
            break;
        case "u_god_rays_intensity":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.god_rays_intensity);
            }
            break;

        // ssao
        case "u_ssao_radius_increase":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.ssao_radius_increase);
            }
            break;
        case "u_ssao_blur_discard_value":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.ssao_blur_discard_value);
            }
            transient_uni = true;
            break;
        case "u_ssao_influence":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.ssao_influence);
            }
            break;
        case "u_ssao_dist_factor":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.ssao_dist_factor);
            }
            break;
        case "u_texel_size":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform2fv(loc, subscene.texel_size);
            }
            transient_uni = true;
            break;
        // shadow receive subscene
        case "u_normal_offset":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.self_shadow_normal_offset);
            }
            break;
        case "u_v_light_ts":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform4fv(loc, subscene.v_light_ts);
            }
            transient_uni = true;
            break;
        case "u_v_light_r":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform4fv(loc, subscene.v_light_r);
            }
            transient_uni = true;
            break;
        case "u_v_light_tsr":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniformMatrix3fv(loc, false, subscene.v_light_tsr);
            }
            transient_uni = true;
            break;
        // NOTE: add more if needed
        case "u_p_light_matrix0":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniformMatrix4fv(loc, false, subscene.p_light_matrix[0]);
            }
            transient_uni = true;
            break;
        case "u_p_light_matrix1":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniformMatrix4fv(loc, false, subscene.p_light_matrix[1]);
            }
            transient_uni = true;
            break;
        case "u_p_light_matrix2":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniformMatrix4fv(loc, false, subscene.p_light_matrix[2]);
            }
            transient_uni = true;
            break;
        case "u_p_light_matrix3":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniformMatrix4fv(loc, false, subscene.p_light_matrix[3]);
            }
            transient_uni = true;
            break;
        case "u_outline_color":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform3fv(loc, subscene.outline_color);
            }
            break;
        case "u_draw_outline":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.draw_outline_flag);
            }
            transient_uni = true;
            break;

        // for glow
        case "u_glow_mask_small_coeff":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.small_glow_mask_coeff);
            }
            transient_uni = true;
            break;
        case "u_glow_mask_large_coeff":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.large_glow_mask_coeff);
            }
            transient_uni = true;
            break;

        // color correction
        case "u_brightness":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.brightness);
            }
            break;
        case "u_contrast":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.contrast);
            }
            break;
        case "u_exposure":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.exposure);
            }
            break;
        case "u_saturation":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.saturation);
            }
            break;

        // hmd params
        case "u_enable_hmd_stereo":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1i(loc, subscene.enable_hmd_stereo);
            }
            break;
        case "u_distortion_params":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform4fv(loc, subscene.distortion_params);
            }
            break;
        case "u_chromatic_aberration_coefs":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform4fv(loc, subscene.chromatic_aberration_coefs);
            }
            break
        case "u_motion_blur_exp":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.motion_blur_exp);
            }
            transient_uni = true;
            break;
        case "u_motion_blur_decay_threshold":
            scene_fun = function(gl, loc, subscene, camera) {
                gl.uniform1f(loc, subscene.mb_decay_threshold);
            }
            transient_uni = true;
            break;

        // obj render
        case "u_model_tsr":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniformMatrix3fv(loc, false, obj_render.world_tsr);
            }
            transient_uni = true;
            break;
        case "u_model_tsr_inverse":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniformMatrix3fv(loc, false, obj_render.world_tsr_inv);
            }
            transient_uni = true;
            break;
        case "u_transb":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform4fv(loc, obj_render.trans_before);
            }
            transient_uni = true;
            break;
        case "u_transa":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform4fv(loc, obj_render.trans_after);
            }
            transient_uni = true;
            break;
        case "u_arm_rel_trans":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform4fv(loc, obj_render.arm_rel_trans);
            }
            transient_uni = true;
            break;
        case "u_arm_rel_quat":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform4fv(loc, obj_render.arm_rel_quat);
            }
            transient_uni = true;
            break;
        case "u_quat":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform4fv(loc, m_tsr.get_quat(obj_render.world_tsr, _quat_tmp));
            }
            transient_uni = true;
            break;
        case "u_quatsb":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform4fv(loc, obj_render.quats_before);
            }
            transient_uni = true;
            break;
        case "u_quatsa":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform4fv(loc, obj_render.quats_after);
            }
            transient_uni = true;
            break;
        case "u_frame_factor":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, obj_render.frame_factor);
            }
            transient_uni = true;
            break;

        case "au_center_pos":
            fun = function(gl, loc, obj_render, batch) {
                // consider zeros by default
                //gl.uniform3fv(loc, obj_render.center_pos);
            }
            transient_uni = true;
            break;
        case "au_wind_bending_amp":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, obj_render.wind_bending_amp);
            }
            transient_uni = true;
            break;
        case "au_wind_bending_freq":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, obj_render.wind_bending_freq);
            }
            transient_uni = true;
            break;
        case "au_detail_bending_freq":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, obj_render.detail_bending_freq);
            }
            transient_uni = true;
            break;
        case "au_detail_bending_amp":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, obj_render.detail_bending_amp);
            }
            transient_uni = true;
            break;
        case "au_branch_bending_amp":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, obj_render.branch_bending_amp);
            }
            transient_uni = true;
            break;
        case "u_node_values":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1fv(loc, batch.node_values);
            }
            transient_uni = true;
            break;
        case "u_node_rgbs":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform3fv(loc, batch.node_rgbs);
            }
            transient_uni = true;
            break;

        // batch
        case "u_diffuse_color":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform4fv(loc, batch.diffuse_color);
            }
            transient_uni = true;
            break;
        case "u_diffuse_intensity":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.diffuse_intensity);
            }
            transient_uni = true;
            break;
        case "u_diffuse_params":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform2fv(loc, batch.diffuse_params);
            }
            transient_uni = true;
            break;
        case "u_emit":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.emit);
            }
            transient_uni = true;
            break;
        case "u_ambient":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.ambient);
            }
            transient_uni = true;
            break;
        case "u_specular_color":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform3fv(loc, batch.specular_color);
            }
            transient_uni = true;
            break;
        case "u_specular_alpha":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.specular_alpha);
            }
            transient_uni = true;
        break;
        case "u_specular_params":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform3fv(loc, batch.specular_params);
            }
            transient_uni = true;
            break;
        case "u_reflect_factor":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.reflect_factor);
            }
            transient_uni = true;
            break;
        case "u_mirror_factor":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.mirror_factor);
            }
            transient_uni = true;
            break;
        case "u_grass_map_dim":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform3fv(loc, batch.grass_map_dim);
            }
            transient_uni = true;
            break;
        case "u_grass_size":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.grass_size);
            }
            transient_uni = true;
            break;
        case "u_scale_threshold":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.grass_scale_threshold);
            }
            transient_uni = true;
            break;
        case "u_cube_fog":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniformMatrix4fv(loc, false, batch.cube_fog);
            }
            break;
        case "u_jitter_amp":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.jitter_amp);
            }
            transient_uni = true;
            break;
        case "u_jitter_freq":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.jitter_freq);
            }
            transient_uni = true;
            break;
        case "u_wireframe_edge_color":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform3fv(loc, batch.wireframe_edge_color);
            }
            break;
        case "u_cluster_id":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.cluster_id);
            }
            transient_uni = true;
            break;
        case "u_batch_debug_id_color":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.debug_id_color);
            }
            transient_uni = true;
            break;
        case "u_batch_debug_main_render_time":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.debug_main_batch_render_time);
            }
            transient_uni = true;
            break;
        case "u_refr_bump":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.refr_bump);
            }
            transient_uni = true;
            break;
        case "u_line_width":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.line_width);
            }
            transient_uni = true;
            break;

        // lamp_data
        case "u_lamp_light_positions":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform3fv(loc, batch.lamp_light_positions);
            }
            break;
        case "u_lamp_light_directions":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform3fv(loc, batch.lamp_light_directions);
            }
            break;
        case "u_lamp_light_color_intensities":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform3fv(loc, batch.lamp_light_color_intensities);
            }
            break;

        // halo
        case "u_halo_size":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.halo_size);
            }
            transient_uni = true;
            break;
        case "u_halo_hardness":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.halo_hardness);
            }
            transient_uni = true;
            break;
        case "u_halo_rings_color":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform3fv(loc, batch.halo_rings_color);
            }
            transient_uni = true;
            break;
        case "u_halo_lines_color":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform3fv(loc, batch.halo_lines_color);
            }
            transient_uni = true;
            break;
        case "u_halo_stars_blend":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.halo_stars_blend);
            }
            transient_uni = true;
            break;
        case "u_halo_stars_height":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.halo_stars_height);
            }
            transient_uni = true;
            break;
        case "u_fresnel_params":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform4fv(loc, batch.fresnel_params);
            }
            transient_uni = true;
            break;
        case "u_texture_scale":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform3fv(loc, batch.texture_scale);
            }
            transient_uni = true;
            break;
        case "u_parallax_scale":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.parallax_scale);
            }
            transient_uni = true;
            break;
        case "u_color_id":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform3fv(loc, obj_render.color_id);
            }
            transient_uni = true;
            break;
        case "u_line_points":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform3fv(loc, batch.line_points);
            }
            transient_uni = true;
            break;

        // texture factors
        case "u_diffuse_color_factor":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.diffuse_color_factor);
            }
            transient_uni = true;
            break;
        case "u_alpha_factor":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.alpha_factor);
            }
            transient_uni = true;
            break;
        case "u_specular_color_factor":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.specular_color_factor);
            }
            transient_uni = true;
            break;
        case "u_normal_factor":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.normal_factor);
            }
            transient_uni = true;
            break;

        case "u_normalmap0_scale":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform2fv(loc, batch.normalmap_scales[0]);
            }
            transient_uni = true;
            break;
        case "u_normalmap1_scale":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform2fv(loc, batch.normalmap_scales[1]);
            }
            transient_uni = true;
            break;
        case "u_normalmap2_scale":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform2fv(loc, batch.normalmap_scales[2]);
            }
            transient_uni = true;
            break;
        case "u_normalmap3_scale":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform2fv(loc, batch.normalmap_scales[3]);
            }
            transient_uni = true;
            break;
        case "u_foam_factor":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.foam_factor);
            }
            transient_uni = true;
            break;
        case "u_foam_uv_freq":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform2fv(loc, batch.foam_uv_freq);
            }
            transient_uni = true;
            break;
        case "u_foam_mag":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform2fv(loc, batch.foam_mag);
            }
            transient_uni = true;
            break;
        case "u_foam_scale":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform2fv(loc, batch.foam_scale);
            }
            transient_uni = true;
            break;
        case "u_water_norm_uv_velocity":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.water_norm_uv_velocity);
            }
            transient_uni = true;
            break;
        case "u_shallow_water_col":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform3fv(loc, batch.shallow_water_col);
            }
            transient_uni = true;
            break;
        case "u_shore_water_col":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform3fv(loc, batch.shore_water_col);
            }
            transient_uni = true;
            break;
        case "u_water_shallow_col_fac":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.shallow_water_col_fac);
            }
            transient_uni = true;
            break;
        case "u_water_shore_col_fac":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.shore_water_col_fac);
            }
            transient_uni = true;
            break;

        case "u_p_length":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.particles_data.time_length);
            }
            transient_uni = true;
            break;
        case "u_p_cyclic":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1i(loc, batch.particles_data.cyclic);
            }
            transient_uni = true;
            break;
        case "u_p_max_lifetime":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.particles_data.lifetime);
            }
            transient_uni = true;
            break;
        case "u_p_fade_in":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.particles_data.fade_in);
            }
            transient_uni = true;
            break;
        case "u_p_fade_out":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.particles_data.fade_out);
            }
            transient_uni = true;
            break;
        case "u_p_size":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.particles_data.size);
            }
            transient_uni = true;
            break;
        case "u_p_alpha_start":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.particles_data.alpha_start);
            }
            transient_uni = true;
            break;
        case "u_p_alpha_end":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.particles_data.alpha_end);
            }
            transient_uni = true;
            break;
        case "u_p_nfactor":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.particles_data.nfactor);
            }
            transient_uni = true;
            break;
        case "u_p_gravity":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.particles_data.gravity);
            }
            transient_uni = true;
            break;
        case "u_p_mass":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.particles_data.mass);
            }
            transient_uni = true;
            break;
        case "u_p_color_ramp":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform4fv(loc, batch.particles_data.color_ramp);
            }
            transient_uni = true;
            break;
        case "u_p_wind_fac":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.particles_data.wind_factor);
            }
            transient_uni = true;
            break;

        case "u_p_time":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.particles_data.time);
            }
            transient_uni = true;
            break;

        case "u_p_tilt":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.particles_data.tilt);
            }
            transient_uni = true;
            break;

        case "u_p_tilt_rand":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, batch.particles_data.tilt_rand);
            }
            transient_uni = true;
            break;

        // anchor visibility
        case "u_position":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform3fv(loc, batch.anchor_positions);
            }
            transient_uni = true;
            break;

        // for vertex anim
        case "u_va_frame_factor":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, obj_render.va_frame_factor);
            }
            transient_uni = true;
            break;

        case "u_refl_plane":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform4fv(loc, obj_render.reflection_plane);
            }
            transient_uni = true;
            break;


        // for outline
        case "u_outline_intensity":
            fun = function(gl, loc, obj_render, batch) {
                gl.uniform1f(loc, obj_render.outline_intensity);
            }
            transient_uni = true;
            break;
        default:
            break;
        }

        if (fun) {
            var setter = {
                name: uni,
                fun: fun,
                loc: uniforms[uni]
            }

            if (transient_uni)
                transient_uniform_setters.push(setter);
            else
                permanent_uniform_setters.push(setter);
        }

        if (scene_fun) {
            var setter = {
                name: uni,
                fun: scene_fun,
                loc: uniforms[uni]
            }
            if (transient_uni)
                transient_sc_uniform_setters.push(setter);
            else
                permanent_sc_uniform_setters.push(setter);
        }
    }
    if (permanent_uniform_setters.length || permanent_sc_uniform_setters.length) {
        var table = shader.permanent_uniform_setters_table;

        for (var i in table)
            delete table[i];

        for (var i = 0; i < permanent_uniform_setters.length; i++) {
            var setter = permanent_uniform_setters[i];
            table[setter.name] = setter;
        }
        for (var i = 0; i < permanent_sc_uniform_setters.length; i++) {
            var setter = permanent_sc_uniform_setters[i];
            table[setter.name] = setter;
        }
    } else
        // optimization
        shader.no_permanent_uniforms = true;
}

exports.assign_texture_uniforms = function(batch) {
    var shader = batch.shader;
    var textures = batch.textures;
    var names = batch.texture_names;

    _gl.useProgram(shader.program);

    for (var i = 0; i < textures.length; i++) {
        var tex = textures[i];
        var name = names[i];
        _gl.uniform1i(shader.uniforms[name], i);
    }
}

function setup_textures(textures) {

    var gl = _gl;

    for (var i = 0; i < textures.length; i++) {
        var tex = textures[i];
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(tex.w_target, tex.w_texture);
    }
}

exports.read_pixels = read_pixels;
/**
 * Get pixels from the framebuffer. Used for objects picking.
 * @param framebuffer FBO
 * @param x x-coord starting from left
 * @param y y-coord starting from bottom
 * @param [width=1] Width of rectangle to read
 * @param [height=1] Height of rectangle to read
 * @param {Uint8Array} storage Destination array of pixel channels
 * @returns {Uint8Array} Destination array of pixel channels
 */
function read_pixels(framebuffer, x, y, width, height, storage) {

    if (!width)
        var width = 1;
    if (!height)
        var height = 1;
    if (!storage)
        var storage = new Uint8Array(4 * width * height);
    if (storage.length != 4 * width * height)
        m_util.panic("read_pixels(): Wrong storage");

    _gl.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer);
    _gl.readPixels(x, y, width, height, _gl.RGBA, _gl.UNSIGNED_BYTE, storage);
    _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);

    return storage;
}

exports.update_batch_permanent_uniform = function(batch, uni_name) {

    var shader = batch.shader;
    if (shader.no_permanent_uniforms)
        return;

    _gl.useProgram(shader.program);

    if (!shader.permanent_uniform_setters.length)
        assign_uniform_setters(shader);

    var setter = shader.permanent_uniform_setters_table[uni_name];
    setter.fun(_gl, setter.loc, null, batch);
}

/**
 * Unified function to create new render target.
 * if specified attachments must have the same size
 * use texture.resize() method
 */
exports.render_target_create = function(color_attachment, depth_attachment) {
    var framebuffer = _gl.createFramebuffer();
    _gl.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer);

    // renderbuffer/texture/null
    if (m_textures.is_renderbuffer(color_attachment)) {
        var renderbuffer = color_attachment.w_renderbuffer;

        _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0,
                _gl.RENDERBUFFER, renderbuffer);
    } else if (m_textures.is_texture(color_attachment)) {
        var texture = color_attachment;

        var w_tex = texture.w_texture;
        var w_target = (texture.w_target == _gl.TEXTURE_CUBE_MAP) ?
                        _gl.TEXTURE_CUBE_MAP_NEGATIVE_Z : texture.w_target;

        _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0,
                w_target, w_tex, 0);
    }

    // renderbuffer/texture/null
    if (m_textures.is_renderbuffer(depth_attachment)) {
        var renderbuffer = depth_attachment.w_renderbuffer;

        _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.DEPTH_ATTACHMENT,
                _gl.RENDERBUFFER, renderbuffer);
    } else if (m_textures.is_texture(depth_attachment)) {
        var texture = depth_attachment;

        var w_tex = texture.w_texture;
        var w_target = texture.w_target;

        _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.DEPTH_ATTACHMENT, w_target,
                w_tex, 0);
    }
    m_debug.check_bound_fb();

    // switch back to the window-system provided framebuffer
    _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);

    return framebuffer;
}

exports.render_target_cleanup = function(framebuffer, color_attachment,
        depth_attachment, width, height) {

    // handle simple case first
    if (framebuffer == null) {
        _gl.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer);
        _gl.viewport(0, 0, width, height);
        _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

        return;
    }

    if (m_textures.is_renderbuffer(color_attachment))
        _gl.deleteRenderbuffer(color_attachment.w_renderbuffer);
    else if (m_textures.is_texture(color_attachment))
        _gl.deleteTexture(color_attachment.w_texture);

    if (m_textures.is_renderbuffer(depth_attachment))
        _gl.deleteRenderbuffer(depth_attachment.w_renderbuffer);
    else if (m_textures.is_texture(depth_attachment))
        _gl.deleteTexture(depth_attachment.w_texture);

    _gl.deleteFramebuffer(framebuffer);
}

exports.increment_subpixel_index = function() {
    _subpixel_index = (_subpixel_index + 1) % 2;
}

exports.draw_resized_cubemap_texture = function(texture, w_target, pot_dim, img_dim, w_tex,
        tex_num) {
    var w_texture = texture.w_texture;

    _gl.viewport(0, 0, pot_dim, pot_dim);

    _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0,
            w_target, w_texture, 0);

    var batch = m_batch.create_postprocessing_batch("FLIP_CUBEMAP_COORDS");
    var shader = batch.shader;

    _gl.activeTexture(_gl.TEXTURE0);
    _gl.bindTexture(_gl.TEXTURE_2D, w_tex);

    var delta_x = 0;
    var delta_y = 0;
    if (pot_dim != img_dim) {
        delta_x = 1.0 / (6 * img_dim);
        delta_y = 1.0 / (4 * img_dim);
    }
    _gl.uniform1i(shader.uniforms["u_tex_number"], tex_num);
    _gl.uniform2fv(shader.uniforms["u_delta"], [delta_x, delta_y]);

    _gl.useProgram(shader.program);
    _draw_batch(batch, 0);

    _gl.bindTexture(_gl.TEXTURE_2D, null);
}

exports.draw_resized_texture = function(texture, size_x, size_y, fbo, w_tex,
            batch_type) {
    _gl.bindFramebuffer(_gl.FRAMEBUFFER, fbo);

    var w_texture = texture.w_texture;
    var w_target = texture.w_target;
    _gl.bindTexture(w_target, w_texture);

    _gl.viewport(0, 0, size_x, size_y);

    _gl.texImage2D(w_target, 0, _gl.RGBA, size_x, size_y, 0, _gl.RGBA,
            _gl.UNSIGNED_BYTE, null);

    _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0,
            w_target, w_texture, 0);

    var batch = m_batch.create_postprocessing_batch(batch_type);
    var shader = batch.shader;

    _gl.activeTexture(_gl.TEXTURE0);
    _gl.bindTexture(w_target, w_tex);

    _gl.useProgram(shader.program);
    _draw_batch(batch, 0);

    _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);
    _gl.bindTexture(w_target, null);
}

/**
 * Perform module cleanup
 */
exports.cleanup = function() {
    _subpixel_index = 0;
}

exports.set_draw_methods = function() {
    var inst_arr = m_ext.get_instanced_arrays();
    var vao_ext = m_ext.get_vertex_array_object();
    cfg_def.allow_instanced_arrays_ext = inst_arr? true: false;
    cfg_def.allow_vao_ext = vao_ext? true: false;

    if (inst_arr) {
        _gl_draw_elems_inst = function(mode, count, type, offset, primcount) {
            inst_arr.drawElementsInstanced(mode, count, type, offset, primcount);
        };
        _gl_vert_attr_div = function(loc, div) {
            inst_arr.vertexAttribDivisor(loc, div);
        };
        _gl_draw_array = function(mode, first, count, primcount) {
            inst_arr.drawArraysInstanced(mode, first, count, primcount);
        };
    } else {
        _gl_draw_elems_inst = function(mode, count, type, offset) {
            _gl.drawElements(mode, count, type, offset);
        };
        _gl_vert_attr_div = function(loc, div) {
            //pass
        };
        _gl_draw_array = function(mode, first, count, primcount) {
            _gl.drawArrays(mode, first, count);
        };
    }

    if (vao_ext) {
        _gl_bind_vertex_array = function(vao) {
            vao_ext.bindVertexArray(vao);
        }
        _draw_batch = function(batch, frame) {
            var bufs_data = batch.bufs_data;
            _gl_bind_vertex_array(batch.vaos[frame]);

            // draw
            if (bufs_data.ibo) {
                _gl_draw_elems_inst(bufs_data.mode, bufs_data.count,
                        bufs_data.ibo_type, 0, bufs_data.instance_count);
            } else
                _gl_draw_array(bufs_data.mode, 0, bufs_data.count,
                        bufs_data.instance_count);

            _gl_bind_vertex_array(null);
        }
    } else {
        _draw_batch = function(batch, frame) {
            var bufs_data = batch.bufs_data;
            var attr_setters = batch.attribute_setters;

            for (var i = 0; i < bufs_data.vbo_data.length; i++) {
                _gl.bindBuffer(_gl.ARRAY_BUFFER, bufs_data.vbo_data[i].vbo);

                for (var j = 0; j < attr_setters.length; j++) {
                    var setter = attr_setters[j];
                    if (setter.vbo_type == bufs_data.vbo_data[i].type) {
                        _gl.enableVertexAttribArray(setter.loc);
                        var offset = setter.base_offset + setter.frame_length * frame;

                        var normalized = setter.gl_type == _gl.FLOAT ? false : true;
                        _gl.vertexAttribPointer(setter.loc, setter.num_comp, 
                                setter.gl_type, normalized, setter.stride, offset);
                        _gl_vert_attr_div(setter.loc, setter.divisor);
                    }
                }
            }

            // draw
            if (bufs_data.ibo) {
                _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, bufs_data.ibo);
                _gl_draw_elems_inst(bufs_data.mode, bufs_data.count,
                        bufs_data.ibo_type, 0, bufs_data.instance_count);
            } else
                _gl_draw_array(bufs_data.mode, 0, bufs_data.count,
                        bufs_data.instance_count);

            // cleanup attributes
            for (var i = 0; i < attr_setters.length; i++) {
                var setter = attr_setters[i];
                _gl.disableVertexAttribArray(setter.loc);
            }
        }
    }
}

exports.reset = function() {
    _gl = null;
    _gl_draw_elems_inst = null;
    _gl_vert_attr_div = null;
    _gl_draw_array = null;
    _gl_bind_vertex_array = null;
}

}
