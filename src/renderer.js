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

var config     = require("__config");
var debug      = require("__debug");
var m_textures = require("__textures");

var cfg_def = config.defaults;

var _gl = null;

var USE_BACKFACE_CULLING = true;

var DEBUG_DISABLE_RENDER_LOCK = false;

// special backgroud color for shadow map
var SHADOW_BG_COLOR = [1, 1, 1, 1];
var DEPTH_BG_COLOR = [1, 1, 1, 1];
var COLOR_PICKING_BG_COLOR = [0,0,0,1];
var GLOW_MASK_BG_COLOR = [0,0,0,0];

var FLOAT_BYTE_SIZE = 4;

var _render_lock = false;
var _ivec4_tmp   = new Uint8Array(4);
var _subpixel_index = 0;

var CUBEMAP_BOTTOM_SIDE = 0;
var CUBEMAP_UPPER_SIDE  = 1;

// smaa stuff
var JITTER = [new Float32Array([0.25, -0.25]),
              new Float32Array([-0.25, 0.25])];
var SUBSAMPLE_IND = [new Float32Array([1, 1, 1, 0]),
                     new Float32Array([2, 2, 2, 0])];


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

    prepare_subscene_render(subscene);

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
    debug.check_gl("draw subscene: " + subscene.type);
    // NOTE: fix for strange issue with skydome rendering
    _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);
}

function prepare_subscene_render(subscene) {

    var camera = subscene.camera;

    _gl.bindFramebuffer(_gl.FRAMEBUFFER, camera.framebuffer);

    if (subscene.assign_texture) {
        var tex = camera.color_attachment;

        _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, 
            tex.w_target, tex.w_texture, 0);
    }

    _gl.viewport(0, 0, camera.width, camera.height);

    clear(subscene);

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
    case "SHADOW_CAST":
        _gl.enable(_gl.POLYGON_OFFSET_FILL);
        _gl.polygonOffset(1.0 * cfg_def.poly_offset_multiplier, 
                1.0 * cfg_def.poly_offset_multiplier);
        /*
         * bad as it leads to impossibility to use backface culling 
         * for some objects.
         * Instead visibility falloff is used to reduce 
         * self-shadowing artefacts.
         * _gl.cullFace(_gl.FRONT); 
         */
        _gl.cullFace(_gl.BACK);
        break;
    case "MAIN_REFLECT":
        _gl.disable(_gl.POLYGON_OFFSET_FILL);
        _gl.cullFace(_gl.FRONT);
        break;
    case "SMAA_BLENDING_WEIGHT_CALCULATION":

        subscene.jitter_subsample_ind = SUBSAMPLE_IND[_subpixel_index];

        _gl.disable(_gl.POLYGON_OFFSET_FILL);
        _gl.cullFace(_gl.BACK);
        break;
    default:
        _gl.disable(_gl.POLYGON_OFFSET_FILL);
        _gl.cullFace(_gl.BACK);
    }

    if (cfg_def.smaa)
        setup_smaa_jitter(subscene);
}

exports.clear = clear;
function clear(subscene) {
    if (subscene) {
        var bitfield = (subscene.clear_color ? _gl.COLOR_BUFFER_BIT : 0) | 
            (subscene.clear_depth ? _gl.DEPTH_BUFFER_BIT : 0);

        // do nothing
        if (!bitfield)
            return;

        // NOTE: place in graph module?
        switch (subscene.type) {
        case "SHADOW_CAST":
            var bc = SHADOW_BG_COLOR;
            break;
        case "DEPTH":
            var bc = DEPTH_BG_COLOR;
            break;
        case "SHORE_SMOOTHING":
            var bc = SHADOW_BG_COLOR;
            break;
        case "COLOR_PICKING":
            var bc = COLOR_PICKING_BG_COLOR;
            break;
        case "GLOW_MASK":
            var bc = GLOW_MASK_BG_COLOR;
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
}

function draw_bundle(subscene, camera, obj_render, batch) {

    // do not check
    var shader = batch.shader;

    if (!shader.transient_uniform_setters)
        assign_uniform_setters(shader);

    _gl.useProgram(shader.program);

    // retrieve buffers
    var bufs_data = batch.bufs_data;

    // setup uniforms that are common for all objects 
    var uniforms = shader.uniforms;
    var transient_uniform_setters = shader.transient_uniform_setters;
    var transient_uniform_names   = shader.transient_uniform_names;

    var i = transient_uniform_names.length;
    while (i--) {
        var uni = transient_uniform_names[i];
        transient_uniform_setters[uni](_gl, uniforms[uni], subscene, obj_render,
                                       batch, camera);
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

    setup_textures(batch.textures, batch.texture_names, uniforms);

    if (subscene.type == "SKY")
        draw_sky_buffers(subscene, bufs_data, shader, obj_render);
    else
        draw_buffers(bufs_data, shader, obj_render.va_frame);

    subscene.debug_render_calls++;
}

function draw_sky_buffers(subscene, bufs_data, shader, obj_render) {

    var camera = subscene.camera;
    var uniforms = shader.uniforms;

    var v_matrs = subscene.cube_view_matrices;

    for (var i = 0; i < 6; i++) {

        _gl.uniformMatrix4fv(uniforms["u_cube_view_matrix"], false, v_matrs[i]);

        var w_target         = get_cube_target_by_id(i);
        var color_attachment = camera.color_attachment;
        var w_tex            = color_attachment.w_texture;

        _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, 
            w_target, w_tex, 0);

        draw_buffers(bufs_data, shader, obj_render.va_frame);

        if (subscene.need_fog_update && i != CUBEMAP_BOTTOM_SIDE)
            update_subs_sky_fog(subscene, i);

    }
    subscene.debug_render_calls++;
}

function update_subs_sky_fog(subscene, cubemap_side_ind) {
    // get pixel from every side of cubemap for procedural fog calculation
    var col = _ivec4_tmp;

    _gl.readPixels(191, 191, 1, 1, _gl.RGBA, _gl.UNSIGNED_BYTE, col);
    if (col[0] == 255 || col[1] == 255 || col[2] == 255) {
        _gl.readPixels(191, 220, 1, 1, _gl.RGBA, _gl.UNSIGNED_BYTE, col);
    }
    var res_r = col[0]; var res_g = col[1]; var res_b = col[2];

    res_r /= 255;
    res_g /= 255;
    res_b /= 255;

    if (cubemap_side_ind === CUBEMAP_UPPER_SIDE) {
        subscene.cube_fog[3]  = res_r;
        subscene.cube_fog[7]  = res_g;
        subscene.cube_fog[11] = res_b;
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
function draw_buffers(bufs_data, shader, frame) {

    // setup attritbutes

    var attributes = shader.attributes;
    var attribute_names = shader.attribute_names;

    _gl.bindBuffer(_gl.ARRAY_BUFFER, bufs_data.vbo);

    var pointers = bufs_data.pointers;

    var i = attribute_names.length;
    while(i--) {
        var attr = attribute_names[i];
        var attribute_loc = attributes[attr];
        var p = pointers[attr];

        _gl.enableVertexAttribArray(attribute_loc);
        if (frame && p.frames > 1)
            var offset = (p.offset + frame * p.length) * FLOAT_BYTE_SIZE;
        else
            var offset = p.offset * FLOAT_BYTE_SIZE;
        _gl.vertexAttribPointer(attribute_loc, p.num_comp, _gl.FLOAT, false, 0, 
                offset);
    }

    // draw
    
    if (bufs_data.ibo) {
        _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, bufs_data.ibo);
        _gl.drawElements(bufs_data.mode, bufs_data.count, bufs_data.ibo_type, 0);
    } else
        _gl.drawArrays(bufs_data.mode, 0, bufs_data.count);

    // cleanup attributes
    var i = attribute_names.length;
    while(i--) {
        var attr = attribute_names[i];
        _gl.disableVertexAttribArray(attributes[attr]);
    }
}

function get_cube_target_by_id(id) {
    switch (id) {
    case 0:
        return _gl.TEXTURE_CUBE_MAP_NEGATIVE_Y;
        break;
    case 1:
        return _gl.TEXTURE_CUBE_MAP_POSITIVE_Y;
        break;
    case 2:
        return _gl.TEXTURE_CUBE_MAP_POSITIVE_X;
        break;
    case 3:
        return _gl.TEXTURE_CUBE_MAP_NEGATIVE_X;
        break;
    case 4:
        return _gl.TEXTURE_CUBE_MAP_POSITIVE_Z;
        break;
    case 5:
        return _gl.TEXTURE_CUBE_MAP_NEGATIVE_Z;
        break;
    }
}

function assign_uniform_setters(shader) {
    var uniforms = shader.uniforms;

    var transient_uniform_names = [];
    var transient_uniform_setters = {};
    var permanent_uniform_names = [];
    var permanent_uniform_setters = {};

    for (var uni in uniforms) {
        var transient_uni = false;

        switch(uni) {

        // from camera
        case "u_proj_matrix":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix4fv(loc, false, camera.proj_matrix);
            }
            transient_uni = true;
            break;
        case "u_view_matrix":
        case "u_view_matrix_frag":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix4fv(loc, false, camera.view_matrix);
            }
            transient_uni = true;
            break;
        case "u_view_proj_prev":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix4fv(loc, false, camera.prev_view_proj_matrix);
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
                gl.uniform3fv(loc, camera.eye);
            }
            transient_uni = true;
            break;
        case "u_camera_eye_last":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, camera.eye_last);
            }
            transient_uni = true;
            break;
        case "u_camera_quat": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, camera.quat);
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
        case "u_caust_scale":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.caust_scale);
            }
            break;
        case "u_caust_bright":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.caust_brightness);
            }
            break;
        case "u_caust_speed":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, subscene.caust_speed);
            }
            break;
        case "u_fog_color_density":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, subscene.fog_color_density);
            }
            break;
        case "u_underwater_fog_color_density":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, subscene.water_fog_color_density);
            }
            break;
        case "u_shadow_visibility_falloff":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.shadow_visibility_falloff);
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
        case "u_light_factors1": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, subscene.light_factors1);
            }
            break;
        case "u_light_factors2": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, subscene.light_factors2);
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
        case "u_model_matrix": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix4fv(loc, false, obj_render.world_matrix);
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
        case "u_quat":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, obj_render.quat);
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
                //gl.uniform4fv(loc, obj_render.center_pos);
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
        case "u_specular_params": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, batch.specular_params);
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
                gl.uniform3fv(loc, batch.color_id);
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

        // animated uv velocities
        case "u_colormap0_uv_velocity":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, batch.colormap0_uv_velocity);        
            }
            transient_uni = true;
            break;
        case "u_normalmap0_uv_velocity":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, batch.normalmap_uv_velocities[0]);        
            }
            transient_uni = true;
            break;
        case "u_normalmap1_uv_velocity":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, batch.normalmap_uv_velocities[1]);        
            }
            transient_uni = true;
            break;
        case "u_normalmap2_uv_velocity":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, batch.normalmap_uv_velocities[2]);        
            }
            transient_uni = true;
            break;
        case "u_normalmap3_uv_velocity":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, batch.normalmap_uv_velocities[3]);        
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

        // particles
        case "u_p_starttime": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.p_starttime);
            }
            transient_uni = true;
            break;
        case "u_p_endtime": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.p_endtime);
            }
            transient_uni = true;
            break;
        case "u_p_cyclic": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1i(loc, batch.p_cyclic);
            }
            transient_uni = true;
            break;
        case "u_p_max_lifetime": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.p_max_lifetime);
            }
            transient_uni = true;
            break;
        case "u_p_fade_in": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.p_fade_in);
            }
            transient_uni = true;
            break;
        case "u_p_fade_out": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.p_fade_out);
            }
            transient_uni = true;
            break;
        case "u_p_size": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.p_size);
            }
            transient_uni = true;
            break;
        case "u_p_alpha_start": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.p_alpha_start);
            }
            transient_uni = true;
            break;
        case "u_p_alpha_end": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.p_alpha_end);
            }
            transient_uni = true;
            break;
        case "u_p_nfactor": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.p_nfactor);
            }
            transient_uni = true;
            break;
        case "u_p_gravity": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.p_gravity);
            }
            transient_uni = true;
            break;
        case "u_p_mass": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.p_mass);
            }
            transient_uni = true;
            break;
        case "u_p_size_ramp": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, batch.p_size_ramp);
            }
            transient_uni = true;
            break;
        case "u_p_color_ramp": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, batch.p_color_ramp);
            }
            transient_uni = true;
            break;
        case "u_p_wind": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, batch.p_wind);
            }
            transient_uni = true;
            break;
        case "u_texel_size":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform2fv(loc, batch.texel_size);
            }
            transient_uni = true;
            break;

        case "u_p_time":
            // particles time
            // updated here because particles module do not have own update()
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                // don't use object timeline, use global instead
                if (batch.p_cyclic === 1)
                    var p_time = subscene.time % (batch.p_endtime - batch.p_starttime);
                else
                    var p_time = obj_render.time;

                gl.uniform1f(uniforms["u_p_time"], p_time);
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
        case "u_v_light_matrix":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix4fv(loc, false, subscene.v_light_matrix);
            }
            transient_uni = true;
            break;
        case "u_b_light_matrix":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniformMatrix4fv(loc, false, subscene.b_light_matrix);
            }
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
        case "u_refl_plane": 
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform4fv(loc, subscene.reflection_plane);
            }
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
        case "u_ssao_dithering_amount":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.ssao_dithering_amount);
            }
            break;
        case "u_ssao_gauss_center":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.ssao_gauss_center);
            }
            break;
        case "u_ssao_gauss_width_square":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.ssao_gauss_width_square);
            }
            break;
        case "u_ssao_gauss_width_left_square":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.ssao_gauss_width_left_square);
            }
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
                gl.uniform1f(loc, camera.dof_distance);
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

        // for glow
        case "u_glow_intensity":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, batch.glow_intensity);
            }
            transient_uni = true;
            break;
        case "u_glow_color":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform3fv(loc, subscene.glow_color);
            }
            break;
        case "u_draw_glow":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.draw_glow_flag);
            }
            transient_uni = true;
            break;
            
        // blur depth
        case "u_blur_depth_edge_size":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.blur_depth_edge_size);
            }
            break;
        case "u_blur_depth_diff_threshold":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.blur_depth_diff_threshold);
            }
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
        case "u_saturation":
            var fun = function(gl, loc, subscene, obj_render, batch, camera) {
                gl.uniform1f(loc, subscene.saturation);
            }
            break;

        default:
            var fun = null;
            break;
        }

        if (fun) {
            if (transient_uni) {
                transient_uniform_names.push(uni);
                transient_uniform_setters[uni] = fun;
            } else {
                permanent_uniform_names.push(uni);
                permanent_uniform_setters[uni]  = fun;
            }
        }
    }

    shader.transient_uniform_setters = transient_uniform_setters;
    shader.transient_uniform_names   = transient_uniform_names;
    shader.permanent_uniform_setters  = permanent_uniform_setters;
    shader.permanent_uniform_names    = permanent_uniform_names;
}

function setup_textures(textures, names, uniforms) {
    var len = textures.length | 0;

    if (len === 0) {
        return;
    } else if (len === 1) {
        _gl.activeTexture(_gl.TEXTURE0);
        _gl.bindTexture(textures[0].w_target, textures[0].w_texture);
    } else {
        for (var i = 0; i < len; i++) {
            var tex = textures[i];
            var name = names[i];

            _gl.activeTexture(_gl.TEXTURE0 + i);
            _gl.bindTexture(tex.w_target, tex.w_texture);
            _gl.uniform1i(uniforms[name], i);
        }
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
        throw "Wrong storage";

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

        if (!shader.permanent_uniform_setters)
            assign_uniform_setters(shader);

        var permanent_uniform_setters = shader.permanent_uniform_setters;
        var permanent_uniform_names   = shader.permanent_uniform_names;

        var j = permanent_uniform_names.length;
        while (j--) {
            var uni = permanent_uniform_names[j];
            permanent_uniform_setters[uni](_gl, uniforms[uni], subscene,
                                        obj_render, batch, camera);
        }
    }
}

exports.update_batch_permanent_uniform = function(batch, uni_name) {

    var shader = batch.shader;
    _gl.useProgram(shader.program);

    var uniforms = shader.uniforms;
    var uni_setters = shader.permanent_uniform_setters;

    if (!uni_setters)
        assign_uniform_setters(shader);

    uni_setters[uni_name](_gl, uniforms[uni_name], null, null, batch, null);
}

/**
 * Unified function to create new render target.
 * if specified attachments must have the same size
 * use texture.resize() method
 */
exports.render_target_create = function(color_attachment, depth_attachment) {
    var framebuffer = _gl.createFramebuffer();
    _gl.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer);

    // texture/null
    if (color_attachment) {
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
    debug.check_bound_fb();

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

    if (m_textures.is_texture(color_attachment))
        _gl.deleteTexture(color_attachment.w_texture);

    if (m_textures.is_renderbuffer(depth_attachment))
        _gl.deleteRenderbuffer(depth_attachment.w_renderbuffer);
    else if (m_textures.is_texture(depth_attachment))
        _gl.deleteTexture(depth_attachment.w_texture);

    _gl.deleteFramebuffer(framebuffer);
}

exports.lock = function() {
    _render_lock = true;
}
exports.unlock = function() {
    _render_lock = false;
}
exports.is_locked = function() {
    return DEBUG_DISABLE_RENDER_LOCK ? false : _render_lock;
}

exports.increment_subpixel_index = function() {
    _subpixel_index = (_subpixel_index + 1) % 2;
}

/**
 * Perform module cleanup
 */
exports.cleanup = function() {
    _render_lock = false;
}

}
