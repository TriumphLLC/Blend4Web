/**
 * Copyright (C) 2014-2015 Triumph LLC
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
var m_textures = require("__textures");
var m_tsr      = require("__tsr");
var m_util     = require("__util");

var USE_BACKFACE_CULLING = true;

var DEBUG_DISABLE_RENDER_LOCK = false;

// special backgroud color for shadow map
var SHADOW_BG_COLOR = [1, 1, 1, 1];
var DEPTH_BG_COLOR = [1, 1, 1, 1];
var COLOR_PICKING_BG_COLOR = [0,0,0,1];
var BLACK_BG_COLOR = [0,0,0,0];

var SKY_HACK_COLOR = new Uint8Array([0.36*255, 0.56*255, 0.96*255, 255]);

var FLOAT_BYTE_SIZE = 4;

var CUBEMAP_UPPER_SIDE = 2;
var CUBEMAP_BOTTOM_SIDE = 3;

// smaa stuff
var JITTER = [new Float32Array([0.25, -0.25]),
              new Float32Array([-0.25, 0.25])];
var SUBSAMPLE_IND = [new Float32Array([1, 1, 1, 0]),
                     new Float32Array([2, 2, 2, 0])];

var _gl = null;
var _subpixel_index = 0;

var _vec3_tmp  = new Float32Array(3);
var _ivec4_tmp = new Uint8Array(4);
var _mat3_tmp  = new Float32Array(9);
var _tsr_tmp   = new Float32Array(8);

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

    if (subscene.type == "RESOLVE") {
        m_debug.render_time_start(subscene);
        draw_resolve(subscene);
        m_debug.render_time_stop(subscene);

        m_debug.check_gl("draw resolve");
    } else if (subscene.type == "COPY") {
        m_debug.render_time_start(subscene);
        draw_copy(subscene);
        m_debug.render_time_stop(subscene);

        m_debug.check_gl("draw copy");
    } else {
        m_debug.render_time_start(subscene);
        prepare_subscene(subscene);

        if (subscene.type == "MAIN_CUBE_REFLECT")
            draw_cube_reflection_subs(subscene);
        else
            draw_subs(subscene);

        m_debug.render_time_stop(subscene);

        m_debug.check_gl("draw subscene: " + subscene.type);
        // NOTE: fix for strange issue with skydome rendering
        _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);
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

        var bundles = subscene.bundles;
        for (var j = 0; j < bundles.length; j++)
            bundles[j].do_render = bundles[j].do_render_cube[i];

        draw_subs(subscene);
    }
}

function draw_resolve(subscene) {
    var camera = subscene.camera;

    _gl.bindFramebuffer(_gl.READ_FRAMEBUFFER, camera.framebuffer_prev);
    _gl.bindFramebuffer(_gl.DRAW_FRAMEBUFFER, camera.framebuffer);

    _gl.blitFramebuffer(
            0, 0, camera.width, camera.height,
            0, 0, camera.width, camera.height,
            _gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT, _gl.NEAREST);
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
    var bundles = subscene.bundles;
    for (var i = 0; i < bundles.length; i++) {
        var bundle = bundles[i];
        if (bundle.do_render) {
            var obj_render = bundle.obj_render;
            var batch = bundle.batch;
            draw_bundle(subscene, camera, obj_render, batch);
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

    if (subscene.type != "MAIN_CUBE_REFLECT")
        clear_binded_framebuffer(subscene);

    if (subscene.blend)
        _gl.enable(_gl.BLEND);
    else
        _gl.disable(_gl.BLEND);

    if (subscene.depth_test)
        _gl.enable(_gl.DEPTH_TEST);
    else
        _gl.disable(_gl.DEPTH_TEST);

    if (subscene.need_perm_uniforms_update) {
        update_subs_permanent_uniforms(subscene);
        subscene.need_perm_uniforms_update = false;
    }

    // prevent self-shadow issues
    switch (subscene.type) {
    case "DEPTH":
        if (cfg_def.ios_depth_hack) {
            _gl.enable(_gl.POLYGON_OFFSET_FILL);
            _gl.polygonOffset(5, 5);
        } else
            _gl.disable(_gl.POLYGON_OFFSET_FILL);
        _gl.cullFace(_gl.BACK);
        break;
    case "SHADOW_CAST":
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
    case "MAIN_PLANE_REFLECT":
        _gl.disable(_gl.POLYGON_OFFSET_FILL);
        _gl.cullFace(_gl.FRONT);
        break;
    case "MAIN_GLOW":
        if (cfg_def.msaa_samples > 1) {
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
        case "MAIN_GLOW":
            var bc = BLACK_BG_COLOR;
            break;
        case "SHADOW_CAST":
            var bc = SHADOW_BG_COLOR;
            break;
        case "DEPTH":
            var bc = DEPTH_BG_COLOR;
            break;
        case "COLOR_PICKING":
        case "COLOR_PICKING_XRAY":
        case "ANCHOR_VISIBILITY":
            var bc = COLOR_PICKING_BG_COLOR;
            break;
        case "OUTLINE_MASK":
        case "SMAA_BLENDING_WEIGHT_CALCULATION":
        case "SMAA_EDGE_DETECTION":
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

    if (subscene.type == "SMAA_BLENDING_WEIGHT_CALCULATION")
        subscene.jitter_subsample_ind = SUBSAMPLE_IND[_subpixel_index];
}

function draw_bundle(subscene, camera, obj_render, batch) {
    // do not check
    var shader = batch.shader;

    _gl.useProgram(shader.program);

    // retrieve buffers
    var bufs_data = batch.bufs_data;
    var attribute_setters = batch.attribute_setters;

    // setup uniforms that are common for all objects

    var transient_uniform_setters = shader.transient_uniform_setters;
    var i = transient_uniform_setters.length;
    while (i--) {
        var setter = transient_uniform_setters[i];
        setter.fun(_gl, setter.loc, subscene, obj_render, batch, camera);
    }

    // disable color mask if requested
    var cm = batch.color_mask;
    _gl.colorMask(cm, cm, cm, cm);
    _gl.depthMask(batch.depth_mask);

    if (USE_BACKFACE_CULLING) {
        if (batch.use_backface_culling)
            _gl.enable(_gl.CULL_FACE);
        else
            _gl.disable(_gl.CULL_FACE);
    }

    setup_textures(batch.textures);

    if (subscene.type == "SKY") {
        draw_sky_buffers(subscene, bufs_data, shader, obj_render,
                         attribute_setters);
        subscene.debug_render_calls+=6;
    } else {
        draw_buffers(bufs_data, attribute_setters, obj_render.va_frame);
        subscene.debug_render_calls++;
    }
}

function draw_sky_buffers(subscene, bufs_data, shader, obj_render,
        attribute_setters) {

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

            _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0,
                w_target, w_tex, 0);
            draw_buffers(bufs_data, attribute_setters, obj_render.va_frame);
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

function setup_float_attribute(attributes, name, value) {
    var attribute_loc = attributes[name];
    if (attribute_loc == undefined)
        return;

    _gl.vertexAttrib1f(attribute_loc, value);
}
function setup_vec2_attribute(attributes, name, value) {
    var attribute_loc = attributes[name];
    if (attribute_loc == undefined)
        return;

    _gl.vertexAttrib2fv(attribute_loc, value);
}
function setup_vec3_attribute(attributes, name, value) {
    var attribute_loc = attributes[name];
    if (attribute_loc == undefined)
        return;

    _gl.vertexAttrib3fv(attribute_loc, value);
}
function setup_vec4_attribute(attributes, name, value) {
    var attribute_loc = attributes[name];
    if (attribute_loc == undefined)
        return;

    _gl.vertexAttrib4fv(attribute_loc, value);
}

/**
 * frame used for vertex animation
 */
function draw_buffers(bufs_data, attribute_setters, frame) {

    _gl.bindBuffer(_gl.ARRAY_BUFFER, bufs_data.vbo);

    for (var i = 0; i < attribute_setters.length; i++) {
        var setter = attribute_setters[i];

        _gl.enableVertexAttribArray(setter.loc);

        var offset = setter.base_offset + setter.frame_length * frame;
        _gl.vertexAttribPointer(setter.loc, setter.num_comp, _gl.FLOAT, false, 0,
                offset);
    }

    // draw

    if (bufs_data.ibo) {
        _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, bufs_data.ibo);
        _gl.drawElements(bufs_data.mode, bufs_data.count, bufs_data.ibo_type, 0);
    } else
        _gl.drawArrays(bufs_data.mode, 0, bufs_data.count);

    // cleanup attributes
    for (var i = 0; i < attribute_setters.length; i++) {
        var setter = attribute_setters[i];
        _gl.disableVertexAttribArray(setter.loc);
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
    if (!bufs_data || !shader)
        m_util.panic("Incomplete batch");

    var pointers = bufs_data.pointers;
    var attributes = shader.attributes;
    for (var name in attributes) {
        var p = pointers[name];
        var setter = {
            loc: attributes[name],
            base_offset: p.offset * FLOAT_BYTE_SIZE,
            frame_length: p.frames > 1 ? p.length * FLOAT_BYTE_SIZE : 0,
            num_comp: p.num_comp
        };

        attr_setters.push(setter);
    }
}

exports.assign_uniform_setters = assign_uniform_setters;

function assign_uniform_setters(shader) {
    var uniforms = shader.uniforms;

    var transient_uniform_setters = [];
    var permanent_uniform_setters = [];
    var permanent_uniform_setters_table = {};

    for (var uni in uniforms) {
        var transient_uni = false;

        switch (uni) {
        // from camera
        case "u_proj_matrix":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix4fv(loc, false, camera.proj_matrix);
            }
            transient_uni = true;
            break;
        case "u_view_matrix":
            // NOTE: used for reflection
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix4fv(loc, false, camera.view_matrix);
            }
            transient_uni = true;
            break;
        case "u_view_tsr":
        case "u_view_tsr_frag":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix3fv(loc, false, camera.view_tsr);
            }
            transient_uni = true;
            break;
        case "u_shadow_cast_billboard_view_tsr":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix3fv(loc, false, camera.shadow_cast_billboard_view_tsr);
            }
            transient_uni = true;
            break;
        case "u_view_proj_prev":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix4fv(loc, false, camera.prev_view_proj_matrix);
            }
            transient_uni = true;
            break;
        case "u_view_proj_matrix":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix4fv(loc, false, camera.view_proj_matrix);
            }
            transient_uni = true;
            break;
        case "u_view_proj_inverse":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix4fv(loc, false, camera.view_proj_inv_matrix);
            }
            transient_uni = true;
            break;
        case "u_sky_vp_inverse":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix4fv(loc, false, camera.sky_vp_inv_matrix);
            }
            transient_uni = true;
            break;
        case "u_camera_eye":
        case "u_camera_eye_frag":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, m_tsr.get_trans_value(camera.world_tsr, _vec3_tmp));
            }
            transient_uni = true;
            break;
        case "u_camera_quat":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, m_tsr.get_quat_view(camera.world_tsr));
            }
            transient_uni = true;
            break;
        case "u_view_max_depth":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, camera.far);
            }
            transient_uni = true;
            break;
        case "u_camera_range":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2f(loc, camera.near, camera.far);
            }
            break;
        case "u_csm_center_dists":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, camera.csm_center_dists);
            }
            break;

        case "u_cam_water_depth":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.cam_water_depth);
            }
            transient_uni = true;
            break;
        case "u_waves_height":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.water_waves_height);
            }
            break;
        case "u_waves_length":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.water_waves_length);
            }
            break;
        case "u_fog_color_density":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                // NOTE: unused alpha channel
                gl.uniform4fv(loc, subscene.fog_color_density);
            }
            break;
        case "u_fog_params":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, subscene.fog_params);
            }
            break;
        case "u_underwater_fog_color_density":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, subscene.water_fog_color_density);
            }
            break;
        case "u_bloom_key":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.bloom_key);
            }
            break;
        case "u_bloom_edge_lum":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.bloom_edge_lum);
            }
            break;

        case "u_time":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.time);
            }
            transient_uni = true;
            break;
        case "u_wind":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, subscene.wind);
            }
            transient_uni = true;
            break;

        case "u_sky_tex_dvar":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.sky_tex_default_value);
            }
            break;
        case "u_sky_tex_fac":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, subscene.sky_tex_fac);
            }
            break;
        case "u_sky_tex_color":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, subscene.sky_tex_color);
            }
            break;
        case "u_horizon_color":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, subscene.horizon_color);
            }
            break;
        case "u_zenith_color":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, subscene.zenith_color);
            }
            break;
        case "u_environment_energy":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.environment_energy);
            }
            break;

        // sky
        case "u_sky_color":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, subscene.sky_color);
            }
            break;
        case "u_rayleigh_brightness":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.rayleigh_brightness);
            }
            break;
        case "u_mie_brightness":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.mie_brightness);
            }
            break;
        case "u_spot_brightness":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.spot_brightness);
            }
            break;
        case "u_scatter_strength":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.scatter_strength);
            }
            break;
        case "u_rayleigh_strength":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.rayleigh_strength);
            }
            break;
        case "u_mie_strength":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.mie_strength);
            }
            break;
        case "u_rayleigh_collection_power":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.rayleigh_collection_power);
            }
            break;
        case "u_mie_collection_power":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.mie_collection_power);
            }
            break;
        case "u_mie_distribution":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.mie_distribution);
            }
            break;

        // light
        case "u_light_positions":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, subscene.light_positions);
            }
            break;
        case "u_light_directions":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, subscene.light_directions);
            }
            break;
        case "u_light_color_intensities":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, subscene.light_color_intensities);
            }
            break;
        case "u_light_factors":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, subscene.light_factors);
            }
            break;
        case "u_sun_quaternion":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, subscene.sun_quaternion);
            }
            break;
        case "u_sun_intensity":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, subscene.sun_intensity);
            }
            break;
        case "u_sun_direction":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, subscene.sun_direction);
            }
            break;

        case "u_height":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, camera.height);
            }
            transient_uni = true;
            break;

        // obj render
        case "u_model_tsr":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix3fv(loc, false, obj_render.world_tsr);
            }
            transient_uni = true;
            break;
        case "u_transb":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, obj_render.trans_before);
            }
            transient_uni = true;
            break;
        case "u_transa":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, obj_render.trans_after);
            }
            transient_uni = true;
            break;
        case "u_arm_rel_trans":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, obj_render.arm_rel_trans);
            }
            transient_uni = true;
            break;
        case "u_arm_rel_quat":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, obj_render.arm_rel_quat);
            }
            transient_uni = true;
            break;
        case "u_quat":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                var quat = m_tsr.get_quat_view(obj_render.world_tsr);
                gl.uniform4fv(loc, quat);
            }
            transient_uni = true;
            break;
        case "u_quatsb":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, obj_render.quats_before);
            }
            transient_uni = true;
            break;
        case "u_quatsa":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, obj_render.quats_after);
            }
            transient_uni = true;
            break;
        case "u_frame_factor":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, obj_render.frame_factor);
            }
            transient_uni = true;
            break;

        case "au_center_pos":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                // consider zeros by default
                //gl.uniform3fv(loc, obj_render.center_pos);
            }
            transient_uni = true;
            break;
        case "au_wind_bending_amp":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, obj_render.wind_bending_amp);
            }
            transient_uni = true;
            break;
        case "au_wind_bending_freq":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, obj_render.wind_bending_freq);
            }
            transient_uni = true;
            break;
        case "au_detail_bending_freq":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, obj_render.detail_bending_freq);
            }
            transient_uni = true;
            break;
        case "au_detail_bending_amp":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, obj_render.detail_bending_amp);
            }
            transient_uni = true;
            break;
        case "au_branch_bending_amp":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, obj_render.branch_bending_amp);
            }
            transient_uni = true;
            break;
        case "u_node_values":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1fv(loc, obj_render.mats_values);
            }
            transient_uni = true;
            break;
        case "u_node_rgbs":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, obj_render.mats_rgbs);
            }
            transient_uni = true;
            break;

        // batch
        case "u_diffuse_color":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, batch.diffuse_color);
            }
            transient_uni = true;
            break;
        case "u_diffuse_intensity":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.diffuse_intensity);
            }
            transient_uni = true;
            break;
        case "u_diffuse_params":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, batch.diffuse_params);
            }
            transient_uni = true;
            break;
        case "u_emit":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.emit);
            }
            transient_uni = true;
            break;
        case "u_ambient":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.ambient);
            }
            transient_uni = true;
            break;
        case "u_specular_color":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, batch.specular_color);
            }
            transient_uni = true;
            break;
        case "u_specular_alpha":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.specular_alpha);
            }
            transient_uni = true;
        break;
        case "u_specular_params":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, batch.specular_params);
            }
            transient_uni = true;
            break;
        case "u_reflect_factor":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.reflect_factor);
            }
            transient_uni = true;
            break;
        case "u_mirror_factor":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.mirror_factor);
            }
            transient_uni = true;
            break;
        case "u_grass_map_dim":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, batch.grass_map_dim);
            }
            transient_uni = true;
            break;
        case "u_grass_size":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.grass_size);
            }
            transient_uni = true;
            break;
        case "u_scale_threshold":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.grass_scale_threshold);
            }
            transient_uni = true;
            break;
        case "u_cube_fog":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix4fv(loc, false, batch.cube_fog);
            }
            break;
        case "u_jitter_amp":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.jitter_amp);
            }
            transient_uni = true;
            break;
        case "u_jitter_freq":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.jitter_freq);
            }
            transient_uni = true;
            break;
        case "u_wireframe_mode":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1i(loc, batch.wireframe_mode);
            }
            break;
        case "u_wireframe_edge_color":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, batch.wireframe_edge_color);
            }
            break;
        case "u_subpixel_jitter":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, subscene.jitter_projection_space);
            }
            transient_uni = true;
            break;
        case "u_subsample_indices":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, subscene.jitter_subsample_ind);
            }
            transient_uni = true;
            break;
        case "u_refr_bump":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.refr_bump);
            }
            transient_uni = true;
            break;
        case "u_line_width":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.line_width);
            }
            transient_uni = true;
            break;

        // lamp_data
        case "u_lamp_light_positions":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, batch.lamp_light_positions);
            }
            break;
        case "u_lamp_light_directions":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, batch.lamp_light_directions);
            }
            break;
        case "u_lamp_light_color_intensities":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, batch.lamp_light_color_intensities);
            }
            break;
        case "u_lamp_light_factors":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, batch.lamp_light_factors);
            }
            break;

        // halo
        case "u_halo_size":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.halo_size);
            }
            transient_uni = true;
            break;
        case "u_halo_hardness":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.halo_hardness);
            }
            transient_uni = true;
            break;
        case "u_halo_rings_color":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, batch.halo_rings_color);
            }
            transient_uni = true;
            break;
        case "u_halo_lines_color":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, batch.halo_lines_color);
            }
            transient_uni = true;
            break;
        case "u_halo_stars_blend":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.halo_stars_blend);
            }
            transient_uni = true;
            break;
        case "u_halo_stars_height":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.halo_stars_height);
            }
            transient_uni = true;
            break;
        case "u_fresnel_params":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, batch.fresnel_params);
            }
            transient_uni = true;
            break;
        case "u_texture_scale":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, batch.texture_scale);
            }
            transient_uni = true;
            break;
        case "u_parallax_scale":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.parallax_scale);
            }
            transient_uni = true;
            break;
        case "u_color_id":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, obj_render.color_id);
            }
            transient_uni = true;
            break;
        case "u_line_points":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, batch.line_points);
            }
            transient_uni = true;
            break;

        // texture factors
        case "u_diffuse_color_factor":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.diffuse_color_factor);
            }
            transient_uni = true;
            break;
        case "u_alpha_factor":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.alpha_factor);
            }
            transient_uni = true;
            break;
        case "u_specular_color_factor":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.specular_color_factor);
            }
            transient_uni = true;
            break;
        case "u_normal_factor":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.normal_factor);
            }
            transient_uni = true;
            break;

        case "u_normalmap0_scale":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, batch.normalmap_scales[0]);
            }
            transient_uni = true;
            break;
        case "u_normalmap1_scale":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, batch.normalmap_scales[1]);
            }
            transient_uni = true;
            break;
        case "u_normalmap2_scale":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, batch.normalmap_scales[2]);
            }
            transient_uni = true;
            break;
        case "u_normalmap3_scale":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, batch.normalmap_scales[3]);
            }
            transient_uni = true;
            break;
        case "u_foam_factor":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.foam_factor);
            }
            transient_uni = true;
            break;
        case "u_foam_uv_freq":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, batch.foam_uv_freq);
            }
            transient_uni = true;
            break;
        case "u_foam_mag":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, batch.foam_mag);
            }
            transient_uni = true;
            break;
        case "u_foam_scale":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, batch.foam_scale);
            }
            transient_uni = true;
            break;
        case "u_water_norm_uv_velocity":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.water_norm_uv_velocity);
            }
            transient_uni = true;
            break;
        case "u_shallow_water_col":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, batch.shallow_water_col);
            }
            transient_uni = true;
            break;
        case "u_shore_water_col":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, batch.shore_water_col);
            }
            transient_uni = true;
            break;
        case "u_water_shallow_col_fac":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.shallow_water_col_fac);
            }
            transient_uni = true;
            break;
        case "u_water_shore_col_fac":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.shore_water_col_fac);
            }
            transient_uni = true;
            break;

        case "u_p_length":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.particles_data.time_length);
            }
            transient_uni = true;
            break;
        case "u_p_cyclic":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1i(loc, batch.particles_data.cyclic);
            }
            transient_uni = true;
            break;
        case "u_p_max_lifetime":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.particles_data.lifetime);
            }
            transient_uni = true;
            break;
        case "u_p_fade_in":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.particles_data.fade_in);
            }
            transient_uni = true;
            break;
        case "u_p_fade_out":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.particles_data.fade_out);
            }
            transient_uni = true;
            break;
        case "u_p_size":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.particles_data.size);
            }
            transient_uni = true;
            break;
        case "u_p_alpha_start":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.particles_data.alpha_start);
            }
            transient_uni = true;
            break;
        case "u_p_alpha_end":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.particles_data.alpha_end);
            }
            transient_uni = true;
            break;
        case "u_p_nfactor":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.particles_data.nfactor);
            }
            transient_uni = true;
            break;
        case "u_p_gravity":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.particles_data.gravity);
            }
            transient_uni = true;
            break;
        case "u_p_mass":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.particles_data.mass);
            }
            transient_uni = true;
            break;
        case "u_p_size_ramp":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, batch.particles_data.size_ramp);
            }
            transient_uni = true;
            break;
        case "u_p_color_ramp":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, batch.particles_data.color_ramp);
            }
            transient_uni = true;
            break;
        case "u_p_wind_fac":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.particles_data.wind_factor);
            }
            transient_uni = true;
            break;
        case "u_texel_size":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, subscene.texel_size);
            }
            transient_uni = true;
            break;

        case "u_p_time":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.particles_data.time);
            }
            transient_uni = true;
            break;

        // anchor visibility
        case "u_position":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, batch.positions);
            }
            transient_uni = true;
            break;

        // for vertex anim
        case "u_va_frame_factor":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, obj_render.va_frame_factor);
            }
            transient_uni = true;
            break;

        // shadow receive subscene
        case "u_normal_offset":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.self_shadow_normal_offset);
            }
            break;
        case "u_pcf_blur_radii":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, camera.pcf_blur_radii);
            }
            break;
        case "u_v_light_ts":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, subscene.v_light_ts);
            }
            transient_uni = true;
            break;
        case "u_v_light_r":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, subscene.v_light_r);
            }
            transient_uni = true;
            break;
        case "u_v_light_tsr":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix3fv(loc, false, subscene.v_light_tsr);
            }
            transient_uni = true;
            break;
        // NOTE: add more if needed
        case "u_p_light_matrix0":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix4fv(loc, false, subscene.p_light_matrix[0]);
            }
            transient_uni = true;
            break;
        case "u_p_light_matrix1":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix4fv(loc, false, subscene.p_light_matrix[1]);
            }
            transient_uni = true;
            break;
        case "u_p_light_matrix2":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix4fv(loc, false, subscene.p_light_matrix[2]);
            }
            transient_uni = true;
            break;
        case "u_p_light_matrix3":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix4fv(loc, false, subscene.p_light_matrix[3]);
            }
            transient_uni = true;
            break;
        case "u_motion_blur_exp":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.motion_blur_exp);
            }
            transient_uni = true;
            break;
        case "u_motion_blur_decay_threshold":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.mb_decay_threshold);
            }
            transient_uni = true;
            break;
        case "u_refl_plane":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, obj_render.reflection_plane);
            }
            transient_uni = true;
            break;

        // for god_rays
        case "u_radial_blur_step":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.radial_blur_step);
            }
            break;
        case "u_god_rays_intensity":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.god_rays_intensity);
            }
            break;

        // screen-space ambient occlusion
        case "u_ssao_radius_increase":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.ssao_radius_increase);
            }
            break;
        case "u_ssao_blur_discard_value":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.ssao_blur_discard_value);
            }
            transient_uni = true;
            break;
        case "u_ssao_influence":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.ssao_influence);
            }
            break;
        case "u_ssao_dist_factor":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.ssao_dist_factor);
            }
            break;

        // depth of field
        case "u_dof_dist":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                if (camera.dof_on)
                    gl.uniform1f(loc, camera.dof_distance);
                else
                    gl.uniform1f(loc, 0);
            }
            transient_uni = true;
            break;
        case "u_dof_front":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, camera.dof_front);
            }
            transient_uni = true;
            break;
        case "u_dof_rear":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, camera.dof_rear);
            }
            transient_uni = true;
            break;

        // for outline
        case "u_outline_intensity":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, obj_render.outline_intensity);
            }
            transient_uni = true;
            break;
        case "u_outline_color":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, subscene.outline_color);
            }
            break;
        case "u_draw_outline":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.draw_outline_flag);
            }
            transient_uni = true;
            break;

        // for glow
        case "u_glow_mask_small_coeff":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.small_glow_mask_coeff);
            }
            transient_uni = true;
            break;
        case "u_glow_mask_large_coeff":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.large_glow_mask_coeff);
            }
            transient_uni = true;
            break;

        // color correction
        case "u_brightness":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.brightness);
            }
            break;
        case "u_contrast":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.contrast);
            }
            break;
        case "u_exposure":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.exposure);
            }
            break;
        case "u_saturation":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.saturation);
            }
            break;

        // hmd params
        case "u_enable_hmd_stereo":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1i(loc, subscene.enable_hmd_stereo);
            }
            break;
        case "u_distortion_params":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, subscene.distortion_params);
            }
            break;
        case "u_chromatic_aberration_coefs":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, subscene.chromatic_aberration_coefs);
            }
            break;
        default:
            var fun = null;
            break;
        }

        if (fun) {
            var setter = {
                name: uni,
                fun: fun,
                loc: uniforms[uni]
            }

            if (transient_uni) {
                transient_uniform_setters.push(setter);
            } else {
                permanent_uniform_setters.push(setter);
                permanent_uniform_setters_table[uni] = setter;
            }
        }
    }

    // TODO: do not override
    shader.transient_uniform_setters = transient_uniform_setters;
    shader.permanent_uniform_setters = permanent_uniform_setters;
    shader.permanent_uniform_setters_table = permanent_uniform_setters_table;
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
    for (var i = 0; i < textures.length; i++) {
        var tex = textures[i];
        _gl.activeTexture(_gl.TEXTURE0 + i);
        _gl.bindTexture(tex.w_target, tex.w_texture);
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

function update_subs_permanent_uniforms(subscene) {

    var camera = subscene.camera;
    var bundles = subscene.bundles;

    for (var i = 0; i < bundles.length; i++) {
        var bundle = bundles[i];

        var batch = bundle.batch;
        var shader = batch.shader;
        _gl.useProgram(shader.program);

        var obj_render = bundle.obj_render;

        var uniforms = shader.uniforms;

        if (!shader.permanent_uniform_setters.length)
            assign_uniform_setters(shader);

        var permanent_uniform_setters = shader.permanent_uniform_setters;
        var j = permanent_uniform_setters.length;
        while (j--) {
            var setter = permanent_uniform_setters[j];
            setter.fun(_gl, setter.loc, subscene, obj_render, batch, camera);
        }
    }
}

exports.update_batch_permanent_uniform = function(batch, uni_name) {

    var shader = batch.shader;
    _gl.useProgram(shader.program);

    if (!shader.permanent_uniform_setters.length)
        assign_uniform_setters(shader);

    var setter = shader.permanent_uniform_setters_table[uni_name];
    setter.fun(_gl, setter.loc, null, null, batch, null);
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
    var attribute_setters = batch.attribute_setters;
    var bufs_data = batch.bufs_data;
    draw_buffers(bufs_data, attribute_setters, 0);

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

    _gl.bindTexture(w_target, null);

    _gl.activeTexture(_gl.TEXTURE0);
    _gl.bindTexture(w_target, w_tex);

    _gl.useProgram(shader.program);
    var attribute_setters = batch.attribute_setters;
    var bufs_data = batch.bufs_data;
    draw_buffers(bufs_data, attribute_setters, 0);

    _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);
    _gl.bindTexture(w_target, null);
}

/**
 * Perform module cleanup
 */
exports.cleanup = function() {
    _subpixel_index = 0;
}

}
