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
 * Shaders internal API.
 * @name shaders
 * @namespace
 * @exports exports as shaders
 */
b4w.module["__shaders"] = function(exports, require) {

var m_assets = require("__assets");
var m_cfg    = require("__config");
var m_debug  = require("__debug");
var m_print  = require("__print");
var m_util   = require("__util");

var cfg_def = m_cfg.defaults;
var cfg_lim = m_cfg.context_limits;
var cfg_pth = m_cfg.paths;

var DEBUG_INCOMPATIBLE_DIRECTIVES = false;

var _compiled_shaders = {};
var _shader_ast_cache = {};
var _shader_texts = null;
var _vars_cache = {};

var SHADERS = ["anchors.glslf",
    "anchors.glslv",
    "color_id.glslf",
    "color_id.glslv",
    "shadow.glslf",
    "shadow.glslv",
    "error.glslf",
    "error.glslv",
    "grass_map.glslf",
    "grass_map.glslv",
    "halo.glslf",
    "halo.glslv",
    "line.glslf",
    "line.glslv",
    "main.glslf",
    "main.glslv",
    "main_stack.glslf",
    "particle_system.glslf",
    "particle_system_stack.glslf",
    "particle_system.glslv",
    "proc_skybox.glslf",
    "skybox.glslv",
    "lens_flares.glslf",
    "lens_flares.glslv",
    "sky.glslf",
    "sky.glslv",
    "water.glslf",
    "water.glslv",
    "tex_skybox.glslf",
    "debug_view.glslf",
    "debug_view.glslv",

    "postprocessing/antialiasing.glslf",
    "postprocessing/bloom_combine.glslf",
    "postprocessing/coc.glslf",
    "postprocessing/compositing.glslf",
    "postprocessing/depth_pack.glslf",
    "postprocessing/dof.glslf",
    "postprocessing/glow.glslf",
    "postprocessing/bloom_blur.glslf",
    "postprocessing/god_rays.glslf",
    "postprocessing/god_rays.glslv",
    "postprocessing/god_rays_combine.glslf",
    "postprocessing/luminance.glslf",
    "postprocessing/luminance_av.glslf",
    "postprocessing/luminance_trunced.glslf",
    "postprocessing/luminance_trunced.glslv",
    "postprocessing/motion_blur.glslf",
    "postprocessing/outline.glslf",
    "postprocessing/performance.glslf",
    "postprocessing/postprocessing.glslf",
    "postprocessing/postprocessing.glslv",
    "postprocessing/smaa.glslf",
    "postprocessing/smaa.glslv",
    "postprocessing/ssao.glslf",
    "postprocessing/ssao_blur.glslf",
    "postprocessing/stereo.glslf",
    //"postprocessing/velocity.glslf",

    "include/blending.glslf",
    "include/caustics.glslf",
    "include/color_util.glslf",
    "include/depth_fetch.glslf",
    "include/dynamic_grass.glslv",
    "include/environment.glslf",
    "include/fog.glslf",
    "include/fxaa.glslf",
    "include/halo_color.glslf",
    "include/lighting_nodes.glslf",
    "include/math.glslv",
    "include/mirror.glslf",
    "include/nodes.glslf",
    "include/nodes.glslv",
    "include/pack.glslf",
    "include/particles.glslv",
    "include/particles_nodes.glslf",
    "include/particles_nodes.glslv",
    "include/precision_statement.glslf",
    "include/procedural.glslf",
    "include/refraction.glslf",
    "include/scale_texcoord.glslv",
    "include/shadow.glslf",
    "include/shadow.glslv",
    "include/skin.glslv",
    "include/sky_blending.glslf",
    "include/std.glsl",
    "include/to_world.glslv",
    "include/wind_bending.glslv"];

var DEBUG_COMPILATION_UNIQUENESS = false;

var VALID = 0;
var INVALID_TEX_IMAGE_UNITS = 1 << 0;
var INVALID_F_UNIFORM_VECTORS = 1 << 1;
var INVALID_V_UNIFORM_VECTORS = 1 << 2;
var INVALID_VERTEX_ATTRIBS = 1 << 3;
var INVALID_VARYING_VECTORS = 1 << 4;
var COMPILATION_ERROR = 1 << 5;

exports.VALID = VALID;
exports.INVALID_TEX_IMAGE_UNITS = INVALID_TEX_IMAGE_UNITS;
exports.INVALID_F_UNIFORM_VECTORS = INVALID_F_UNIFORM_VECTORS;
exports.INVALID_V_UNIFORM_VECTORS = INVALID_V_UNIFORM_VECTORS;
exports.INVALID_VERTEX_ATTRIBS = INVALID_VERTEX_ATTRIBS;
exports.INVALID_VARYING_VECTORS = INVALID_VARYING_VECTORS;
exports.COMPILATION_ERROR = COMPILATION_ERROR;

var SAMPLER_EXPR = /(?:^|[^a-zA-Z_])uniform.*?(sampler2D|samplerCube)(?=\s)(.*?\[\s*([0-9]*)\s*\])?/;
var UNIFORM_EXPR = /(?:^|[^a-zA-Z_])(uniform)(?=\s)\s*(float|vec2|vec3|vec4|ivec2|ivec3|ivec4|bvec2|bvec3|bvec4|mat2|mat3|mat4|sampler2D|samplerCube)\s*(.*?\[\s*([0-9]*)\s*\])?/;
var IN_EXPR = /(?:^|[^a-zA-Z_])(in)(?=\s)\s*(float|vec2|vec3|vec4|mat2|mat3|mat4)\s*(.*?\[\s*([0-9]*)\s*\])?/;
var VARYING_EXPR = /(?:^|[^a-zA-Z_])(varying)(?=\s)\s*(float|vec2|vec3|vec4|mat2|mat3|mat4)\s*(.*?\[\s*([0-9]*)\s*\])?/;

// 15 === 1 << 0 | 1 << 1 | 1 << 2 | 1 << 3
var FILLED_ROW_FLAGS = 15;

var _ivec2_tmp = new Int16Array(2);

var _varying_buffer = null;
var _fragment_uniform_buffer = null;
var _vertex_uniform_buffer = null;
var _top_non_filled_row = 0;
var _bottom_non_filled_row = 0;

var _debug_hash_codes = [];

var _gl = null;

var _shaders_loaded = false;

/**
 * Setup WebGL context
 * @param gl WebGL context
 */
exports.setup_context = function(gl) {
    _gl = gl;
}

exports.set_directive = set_directive;
/**
 * Override existing directive for Shaders Info object.
 * @methodOf shaders
 * @param shaders_info Shaders Info Object
 * @param {String} name Directive name
 * @param value Directive value, specify string to set from another directive
 */
function set_directive(shaders_info, name, value) {
    var dirs = shaders_info.directives;

    // another directive
    if (typeof value == "string") {
        var dir = get_directive(shaders_info, value);
        if (dir)
            value = dir[1];
    } else 
        // NOTE: for integer values passed as is
        value = String(value);

    // update existing directive
    for (var i = 0; i < dirs.length; i++)
        if (dirs[i][0] == name) {
            dirs[i][1] = value;
            return;
        }

    if (DEBUG_INCOMPATIBLE_DIRECTIVES)
        m_print.error("Incompatible directive '" + name + "' was set for shaders " 
                + shaders_info.vert + "/" + shaders_info.frag + ".");
}

exports.get_directive = get_directive;
/**
 * Get [directive_name, directive_value] pair.
 * @methodOf shaders
 * @param shaders_info Shaders Info Object
 * @param {String} name Directive name
 */
function get_directive(shaders_info, name) {
    var dirs = shaders_info.directives;

    for (var i = 0; i < dirs.length; i++)
        if (dirs[i][0] == name)
            return dirs[i];

    // not found
    return false;
}

function get_shader_default_vars(vert_name, frag_name) {
    var pair_id = vert_name + frag_name;
    
    if (!(pair_id in _vars_cache)) {
        var vert_ast = get_shader_ast(cfg_pth.shaders_path, vert_name);
        var frag_ast = get_shader_ast(cfg_pth.shaders_path, frag_name);

        var vert_vars = collect_vars(vert_ast);
        var frag_vars = collect_vars(frag_ast);

        for (var var_name in frag_vars)
            vert_vars[var_name] = frag_vars[var_name];

        var var_dirs = [];
        for (var var_name in vert_vars)
            var_dirs.push([var_name, vert_vars[var_name]]);

        _vars_cache[pair_id] = var_dirs;
    }
    return _vars_cache[pair_id];
}

/**
 * Set default directives according to shader names
 */
exports.set_default_directives = function(sinfo) {

    sinfo.directives = m_util.clone_object_json(get_shader_default_vars(sinfo.vert, sinfo.frag));
    set_directive(sinfo, "PRECISION", m_cfg.defaults.precision);

    if (m_cfg.defaults.precision == "highp")
        set_directive(sinfo, "EPSILON", glsl_value(0.000001));
    else
        set_directive(sinfo, "EPSILON", glsl_value(0.0001));

    set_directive(sinfo, "CONSTANTS_HACK", cfg_def.shader_constants_hack | 0);

    set_directive(sinfo, "SRGB", cfg_def.srgb_type);

    return;
}

/**
 * Return vertex shader name from shader info
 */
exports.get_vname = function(sinfo) {
    return sinfo.vert;
}

/**
 * Return fragment shader name from shader info
 */
exports.get_fname = function(sinfo) {
    return sinfo.frag;
}

exports.get_compiled_shader = get_compiled_shader;
/**
 * Compile, return and cache GL shader object from shader_id
 * @param shader_id JSONified shaders_info object
 * @methodOf shaders
 */
function get_compiled_shader(shaders_info) {
    var shader_id = JSON.stringify(shaders_info.vert) +
            JSON.stringify(shaders_info.frag) +
            JSON.stringify(shaders_info.directives) +
            JSON.stringify(shaders_info.node_elements);

    var compiled_shader = _compiled_shaders[shader_id];
    if (compiled_shader)
        return compiled_shader;

    // retrieve filenames of shaders
    var vshader = shaders_info.vert;
    var fshader = shaders_info.frag;

    // load the code
    var vshader_ast = get_shader_ast(cfg_pth.shaders_path, vshader);
    var fshader_ast = get_shader_ast(cfg_pth.shaders_path, fshader);
    if (!vshader_ast || !fshader_ast)
        return null;

    var vshader_text = preprocess_shader("vert", vshader_ast, shaders_info);
    var fshader_text = preprocess_shader("frag", fshader_ast, shaders_info);

    validate_shader_text(fshader_text, vshader_text, shaders_info);

    if (shaders_info.status === VALID) {
        // compile
        _compiled_shaders[shader_id] = compiled_shader =
            init_shader(_gl, vshader_text, fshader_text, shader_id, shaders_info);

        var f_compile_fail = !_gl.getShaderParameter(compiled_shader.fshader,
                _gl.COMPILE_STATUS);
        var v_compile_fail = !_gl.getShaderParameter(compiled_shader.vshader,
                _gl.COMPILE_STATUS);
        var link_fail = !_gl.getProgramParameter(compiled_shader.program,
                _gl.LINK_STATUS);

        if (f_compile_fail)
            m_debug.report_shader_compiling_error(compiled_shader.fshader,
                    shader_id, fshader_text);
        else if (v_compile_fail)
            m_debug.report_shader_compiling_error(compiled_shader.vshader,
                    shader_id, vshader_text);
        else if (link_fail)
            m_debug.report_shader_linking_error(compiled_shader.program,
                    shader_id, vshader_text, fshader_text);

        if (f_compile_fail || v_compile_fail || link_fail) {
            shaders_info.status |= COMPILATION_ERROR;
            compiled_shader = null;
        }
    } else
        compiled_shader = null;

    return compiled_shader;
}

function validate_shader_text(f_shader_text, v_shader_text, shaders_info) {
    // TODO: use complex validation
    var status = VALID;

    var tex_count = get_interface_variables_count(f_shader_text, SAMPLER_EXPR);
    shaders_info.texture_count = tex_count;
    if (tex_count > cfg_lim.max_texture_image_units)
        status |= INVALID_TEX_IMAGE_UNITS;

    create_variable_buffers();

    if (!check_uniforms_in_packing_limits(f_shader_text,
            _fragment_uniform_buffer, cfg_lim.max_fragment_uniform_vectors))
        status |= INVALID_F_UNIFORM_VECTORS;

    if (!check_uniforms_in_packing_limits(v_shader_text,
            _vertex_uniform_buffer, cfg_lim.max_vertex_uniform_vectors))
        status |= INVALID_V_UNIFORM_VECTORS;

    var attribute_count = get_attribute_count(v_shader_text);
    shaders_info.attribute_count = attribute_count;
    if (attribute_count > cfg_lim.max_vertex_attribs)
        status |= INVALID_VERTEX_ATTRIBS;

    if (!check_varyings_in_packing_limits(f_shader_text))
        status |= INVALID_VARYING_VECTORS;

    shaders_info.status = status;
}

function create_variable_buffers() {
    if (!_varying_buffer)
        _varying_buffer = new Uint32Array(cfg_lim.max_varying_vectors);

    if (!_fragment_uniform_buffer)
        _fragment_uniform_buffer = new Uint32Array(cfg_lim.max_fragment_uniform_vectors);

    if (!_vertex_uniform_buffer)
        _vertex_uniform_buffer = new Uint32Array(cfg_lim.max_vertex_uniform_vectors);
}

function sum(a, b) {
    return a + b;
}

function get_interface_variables_count(shader_text, expr) {
    var shader_list = shader_text.split(";");
    var uniforms_list = shader_list.map(function(statement) {
        var r = statement.match(expr);
        return r && (r[3]? parseInt(r[3]): 1);
    }).filter(function(decl) {
        return decl;
    });
    return (uniforms_list || []).reduce(sum, 0);
}

function get_attribute_count(v_shader_text) {
    if (cfg_def.webgl2) {
        // remove function parameters potentially containing "in"
        var v_shader_text_n = v_shader_text.replace(/(.*?)\([^()]*?\)(.*?)/g, "$1$2");
        return (v_shader_text_n.match(/(?:^|[^a-zA-Z_])in(?=\s)/g) || []).length;
    } else
        return (v_shader_text.match(/(?:^|[^a-zA-Z_])attribute(?=\s)/g) || []).length;
}

function cmp_variables(a, b) {
    var a_occupied_cols = get_occupied_cols(a.type);
    var b_occupied_cols = get_occupied_cols(b.type);
    var a_elems = a.array_size;
    var b_elems = b.array_size;

    if (a_occupied_cols > b_occupied_cols)
        return -1;
    else if (a_occupied_cols < b_occupied_cols)
        return 1;
    else if (a_elems > b_elems)
        return -1;
    else if (a_elems < b_elems)
        return 1;
    else
        return 0;
}

function check_varyings_in_packing_limits(shader_text) {
    if (cfg_def.webgl2) {
        // remove function parameters potentially containing "in"
        shader_text = shader_text.replace(/(.*?)\([^()]*?\)(.*?)/g, "$1$2");
        var expr = IN_EXPR;
    } else
        var expr = VARYING_EXPR;

    var shader_list = shader_text.split(";");
    var variables = shader_list.map(function(statement) {
        var r = statement.match(expr);
        return r && {
            type: r[2],
            array_size: (r[4]? parseInt(r[4]): 1)
        };
    }).filter(function(decl) {
        return decl;
    });

    return check_packing_limits(variables, _varying_buffer, cfg_lim.max_varying_vectors);
}

function check_uniforms_in_packing_limits(shader_text, buffer, max_uniforms) {
    var shader_list = shader_text.split(";");
    var variables = shader_list.map(function(statement) {
        var r = statement.match(UNIFORM_EXPR);
        return r && {
            type: r[2],
            array_size: (r[4]? parseInt(r[4]): 1)
        };
    }).filter(function(decl) {
        return decl;
    });

    return check_packing_limits(variables, buffer, max_uniforms);
}

function check_packing_limits(variables, buffer, max_row_count) {
    // 'variables' is list: [
    //     {
    //         type: one of {"float", "vec2", "vec3", "vec4", "mat2", "mat3", "mat4"}
    //         array_size: size of array, for example, it is 3 for float[3], mat2[3]
    //                 or 1 for float, mat2
    // }, ..
    // ]
    if (!variables.length)
        return true;

    for (var i = 0; i < max_row_count; i++)
        buffer[i] = 0;

    _bottom_non_filled_row = max_row_count;

    // NOTE: order variables according to GLSL 1.017 Appendix A, Section 7
    variables.sort(cmp_variables);

    var col3_top_non_filled_row = 0;
    var col4_top_non_filled_row = 0;
    var variable_number = 0;

    function process_4_column_variables() {
        while(variable_number < variables.length) {
            var variable = variables[variable_number];
            if (get_occupied_cols(variable.type) != 4)
                break;

            col4_top_non_filled_row += get_occupied_rows(variable.type) *
                    variable.array_size;
            variable_number++;
        }

        if (col4_top_non_filled_row > _bottom_non_filled_row)
            return false;
        _top_non_filled_row = col4_top_non_filled_row;

        fill_variable_buffer(buffer, 0, col4_top_non_filled_row, 0, 4);
        return true;
    }

    function process_3_column_variables() {
        var col3_rows_count = 0;
        while(variable_number < variables.length) {
            var variable = variables[variable_number];
            if (get_occupied_cols(variable.type) != 3)
                break;
            col3_rows_count += get_occupied_rows(variable.type) *
                    variable.array_size;
            variable_number++;
        }

        col3_top_non_filled_row = col4_top_non_filled_row + col3_rows_count;
        if (col3_top_non_filled_row > _bottom_non_filled_row)
            return false;

        fill_variable_buffer(buffer, col4_top_non_filled_row, col3_rows_count, 0, 3);
        return true;
    }

    function process_2_column_variables() {
        var col2_available_rows_count = _bottom_non_filled_row -
                col3_top_non_filled_row;
        var available_cols_01_rows_count = col2_available_rows_count;
        var available_cols_23_rows_count = col2_available_rows_count;
        while(variable_number < variables.length) {
            var variable = variables[variable_number];
            if (get_occupied_cols(variable.type) != 2)
                break;
            var rows_count = get_occupied_rows(variable.type) * variable.array_size;
            if (rows_count <= available_cols_01_rows_count)
                available_cols_01_rows_count -= rows_count;
            else if (rows_count <= available_cols_23_rows_count)
                available_cols_23_rows_count -= rows_count;
            else
                return false;
            variable_number++;
        }

        var used_cols_01_rows_count = col2_available_rows_count -
                available_cols_01_rows_count;
        var used_cols_23_rows_count = col2_available_rows_count -
                available_cols_23_rows_count;

        fill_variable_buffer(buffer, col3_top_non_filled_row, used_cols_01_rows_count, 0, 2);
        fill_variable_buffer(buffer, _bottom_non_filled_row - used_cols_23_rows_count,
                used_cols_23_rows_count, 2, 2);
        return true;
    }

    function process_1_column_variables() {
        while(variable_number < variables.length) {
            var variable = variables[variable_number];

            // get_occupied_cols(variable.type) == 1

            var rows_count = get_occupied_rows(variable.type) * variable.array_size;

            var smallest_column = -1;
            var smallest_size = max_row_count + 1;
            var top_row = -1;
            for (var column = 0; column < 4; column++) {
                var row_and_size = _ivec2_tmp;
                row_and_size[0] = 0;
                row_and_size[1] = 1;
                if (search_optimal_row_and_size(buffer, column, rows_count, row_and_size)) {
                    if (row_and_size[1] < smallest_size) {
                        top_row = row_and_size[0];
                        smallest_size = row_and_size[1];
                        smallest_column = column;
                    }
                }
            }

            if (smallest_column < 0)
                return false;

            fill_variable_buffer(buffer, top_row, rows_count, smallest_column, 1);
            variable_number++;
        }
        return true;
    }

    // NOTE: don't change call order
    return process_4_column_variables() && process_3_column_variables() &&
            process_2_column_variables() && process_1_column_variables();
}

function search_optimal_row_and_size(buffer, column, rows_count, dest) {
    // update _top_non_filled_row, _bottom_non_filled_row
    while (_top_non_filled_row < buffer.length &&
            buffer[_top_non_filled_row] === FILLED_ROW_FLAGS)
        _top_non_filled_row++;
    while (_bottom_non_filled_row > 0 &&
            buffer[_bottom_non_filled_row] === FILLED_ROW_FLAGS)
        _bottom_non_filled_row--

    // check if buffer has enough freed 'cells'
    if (_bottom_non_filled_row - _top_non_filled_row < rows_count)
        return false;

    var col_flags = 1 << column;
    var top_fit_row = 0;
    var smallest_fit_top = -1;
    var smallest_fit_size = buffer.length + 1;
    var found = false;

    for (var i = _top_non_filled_row; i <= _bottom_non_filled_row; i++) {
        var fit_row = i < _bottom_non_filled_row &&
                !(buffer[i] & col_flags);
        if (fit_row) {
            if (!found) {
                top_fit_row = i;
                found = true;
            }
        } else {
            if (found) {
                var size = i - top_fit_row;
                if (size >= rows_count && size < smallest_fit_size) {
                    smallest_fit_size = size;
                    smallest_fit_top = top_fit_row;
                }
            }
            found = false;
        }
    }

    if (smallest_fit_top < 0)
        return false;

    dest[0] = smallest_fit_top;
    dest[1] = smallest_fit_size;
    return true;
}

function fill_variable_buffer(buffer, row, rows_count, column, columns_count) {
    var col_flags = 0;
    for (var i = 0; i < columns_count; i++)
        col_flags |= 1 << (column + i);
    for (var i = 0; i < rows_count; i++)
        buffer[row + i] |= col_flags;
}

/*
 * Type is one of ["float","vec2","vec3","vec4","ivec2","ivec3",
 * "ivec4","bvec2","bvec3","bvec4","mat2","mat3","mat4"]
 */
function get_occupied_rows(type) {
    var rows = 0;
    switch (type) {
    case "mat4":
        rows = 4;
        break;
    case "mat3":
        rows = 3;
        break;
    case "mat2":
        rows = 2;
        break;
    default:
        rows = 1;
        break;
    }

    return rows;
}

function get_occupied_cols(type) {
    var cols = 0;
    switch (type) {
    case "mat4":
    case "vec4":
    case "ivec4":
    case "bvec4":
    // NOTE: mat2 occupies complete rows
    case "mat2":
        cols = 4;
        break;
    case "mat3":
    case "vec3":
    case "ivec3":
    case "bvec3":
        cols = 3;
        break;
    case "vec2":
    case "ivec2":
    case "bvec2":
        cols = 2;
        break;
    default:
        cols = 1;
        break;
    }

    return cols;
}

/**
 * Get shader AST.
 * Uses _shader_ast_cache
 */
function get_shader_ast(dir, filename) {
    var cache_id = dir + filename;

    if (_shader_ast_cache[cache_id])
        return _shader_ast_cache[cache_id];

    if (!_shader_texts) {
        var ast = require("shader_texts")[filename];
        if (!ast)
            return null;
    } else {
        var main_text = _shader_texts[filename];
        if (!main_text)
            return null;
        var ast = require("__gpp_parser").parser.parse(main_text);
    }

    _shader_ast_cache[cache_id] = ast;

    return ast;
}

function set_shader_texts(shader_name, shadet_text) {
    if (!_shader_texts)
        _shader_texts = {};
    _shader_texts[shader_name] = shadet_text;
}

exports.load_shaders = function() {

    _shaders_loaded = false;

    if (!b4w.module_check("shader_texts")) {

        var shader_assets = [];
        var asset_type = m_assets.AT_TEXT;

        for (var i = 0; i < SHADERS.length; i++) {
            var shader_path = m_util.normpath_preserve_protocol(cfg_pth.shaders_path
                    + SHADERS[i]);
            shader_assets.push({id:SHADERS[i], type:asset_type, url:shader_path});
        }

        var asset_cb = function(shader_text, shader_name, type, path) {
            set_shader_texts(shader_name, shader_text);
        }

        var pack_cb = function() {
            _shaders_loaded = true;
        }

        if (shader_assets.length)
            m_assets.enqueue(shader_assets, asset_cb, pack_cb);
        else
            m_print.error("Shaders have not been found.");
    } else
        _shaders_loaded = true;
}

exports.check_shaders_loaded = function() {
    return _shaders_loaded;
}

function combine_dir_tokens(type, shaders_info) {
    var dirs = {};

    var dirs_arr = shaders_info.directives || [];
    for (var i = 0; i < dirs_arr.length; i++)
        dirs[dirs_arr[i][0]] = [dirs_arr[i][1]];

    // define usage of the certain nodes
    for (var i = 0; i < shaders_info.node_elements.length; i++)
        dirs["USE_NODE_" + shaders_info.node_elements[i].id] = ["1"];

    // glsl version directives
    if (cfg_def.webgl2) {
        dirs["GLSL1"] = ["0"];
        dirs["GLSL3"] = ["1"];

        dirs["GLSL_VERSION"] = ["300 es"];

        dirs["GLSL_IN"] = ["in"];
        dirs["GLSL_OUT"] = ["out"];

        dirs["GLSL_OUT_FRAG_COLOR"] = ["glsl_out_frag_color"];

        dirs["GLSL_TEXTURE"] = ["texture"];
        dirs["GLSL_TEXTURE_CUBE"] = ["texture"];
        dirs["GLSL_TEXTURE_PROJ"] = ["textureProj"];
        dirs["GLSL_SMPLR2D_SHDW"] = ["sampler2DShadow"];
    } else {
        dirs["GLSL1"] = ["1"];
        dirs["GLSL3"] = ["0"];
        
        dirs["GLSL_VERSION"] = ["100"];

        dirs["GLSL_IN"] = (type == "vert") ? ["attribute"] : ["varying"];
        dirs["GLSL_OUT"] = (type == "vert") ? ["varying"] : [""];

        dirs["GLSL_OUT_FRAG_COLOR"] = ["gl_FragColor"];

        dirs["GLSL_TEXTURE"] = ["texture2D"];
        dirs["GLSL_TEXTURE_CUBE"] = ["textureCube"];
        dirs["GLSL_TEXTURE_PROJ"] = ["texture2DProj"];
        dirs["GLSL_SMPLR2D_SHDW"] = ["sampler2D"];
    }

    for (var dirname in dirs) {
        if (dirs[dirname][0].constructor != String)
            m_print.warn("Warning! The value of a directive '" + dirname + "' is not of type string.");
    }

    return dirs;
}

function collect_vars(ast) {
    var vars = {};

    // copypasted from tools/glsl/ast_traversal.js
    function traverse_data(data, cb_before, cb_after) {
        if (data instanceof Array)
            traverse_array(data, cb_before, cb_after);
        else if (data instanceof Object && data)
            traverse_object(data, cb_before, cb_after);
    }

    function traverse_array(array_data, cb_before, cb_after) {
        for (var i = 0; i < array_data.length; i++)
            traverse_data(array_data[i], cb_before, cb_after);
    }

    function traverse_object(object_data, cb_before, cb_after) {
        if (cb_before)
            cb_before(object_data);
        for (var prop in object_data)
            traverse_data(object_data[prop], cb_before, cb_after);
        if (cb_after)
            cb_after(object_data);
    }

    var vars_cb = function(ast_node) {
        if (ast_node.TYPE == "var")
            vars[ast_node.NAME] = ast_node.TOKENS.join("");
        else if (ast_node.TYPE == "include") {
            var ast_inc = get_shader_ast(cfg_pth.shaders_path,
                    cfg_pth.shaders_include_dir + ast_node.FILE);
            traverse_data(ast_inc, vars_cb);
        }
    }
    traverse_data(ast, vars_cb);

    return vars;
}

function preprocess_shader(type, ast, shaders_info) {

    var node_elements = shaders_info.node_elements;
    
    // output GLSL lines
    var lines = [];

    // set with predefined macros {"name": tokens}    
    var dirs = combine_dir_tokens(type, shaders_info);
    
    // NOTE: always empty: not properly implemented,
    // set with params for function-like macros {"name": params}
    var fdirs = {};

    var curr_file_stack = [shaders_info[type]];

    var undefined_dirs = {};

    var shader_nodes = {};

    var usage_inputs = [];
    for (var i in node_elements)
        for (var j in node_elements[i].inputs)
            usage_inputs.push(node_elements[i].inputs[j]);

    var frag_glsl_out_declaration = false;

    // entry element
    process_group(ast);

    var text = lines.join("\n");

    var input_index = 0;
    var output_index = 0;
    var param_index = 0;

    return text;

    function process_group(elem) {
        var parts = elem.PARTS;

        for (var i = 0; i < parts.length; i++) {
            var pelem = parts[i];
            switch(pelem.TYPE) {
            case "cond":
                process_condition(pelem);
                break;

            case "include":
                process_include(pelem);
                break;
            case "var":
                break;
            case "define":
                process_define(pelem);
                break;
            case "error":
                process_error(pelem);
                break;
            case "line":
                // NOTE: do nothing
                break;
            case "pragma":
                process_pragma(pelem);
                break;
            case "undef":
                process_undef(pelem);
                break;
            case "warning":
                process_warning(pelem);
                break;
            case "extension":
                process_extension(pelem);
                break;
            case "version":
                process_version(pelem);
            case "#":
                break;

            case "node":
                process_node(pelem);
                break;
            case "nodes_global":
                process_nodes_global(node_elements);
                break;
            case "nodes_main":
                process_nodes_main(node_elements);
                break;

            case "txt":
                process_text_tokens(pelem.TOKENS);
                break;
            default:
                m_util.panic("Unknown element type: " + pelem.TYPE);
                break;
            }
        }
    }

    function process_condition(elem) {
        var parts = elem.PARTS;

        for (var i = 0; i < parts.length; i++) {
            var pelem = parts[i];

            switch(pelem.TYPE) {
            case "if":
            case "elif":
                var expression = pelem.EXPRESSION;
                var result = expression_result(expression)

                if (result) {
                    process_group(pelem.GROUP);
                    return;
                }
                break;
            case "else":
                process_group(pelem.GROUP);
                return;
            case "ifdef":
                if (pelem.NAME in dirs)
                    process_group(pelem.GROUP);
                break;
            case "ifndef":
                if (!(pelem.NAME in dirs))
                    process_group(pelem.GROUP);
                break;
            }
        }
    }

    // throws SyntaxError if not parsed
    function expression_result(expression, node_dirs) {
        var expr_list = expand_macro(expression, dirs, fdirs, true, node_dirs);
        return eval_expression(expr_list);
    }

    function eval_expression(expr_list) {
        var operand_stack = [];

        for (var i = 0; i < expr_list.length; i++) {
            if (!(expr_list[i] instanceof Object)) {
                var operand = expr_list[i];

                var expr_identifier = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;

                if (expr_identifier.test(operand)) {
                    operand_stack.push(0);
                    if (operand.indexOf("USE_NODE_") != 0) {
                        var filename = curr_file_stack[curr_file_stack.length - 1];

                        if (!(filename in undefined_dirs))
                            undefined_dirs[filename] = [];

                        if (undefined_dirs[filename].indexOf(operand) == -1) {
                            undefined_dirs[filename].push(operand);
                            m_print.error("Undefined directive '" + operand 
                                    + "' in shader '" + filename 
                                    + "'. Should it be defined with #var/#node_var or #define?");
                        }
                    }
                } else
                    operand_stack.push(parseFloat(expr_list[i]));
            } else {
                switch (expr_list[i].TYPE) {
                case "conditional_expr":
                    var falseExpression = operand_stack.pop();
                    var trueExpression = operand_stack.pop();
                    var condition = operand_stack.pop();
                    if (condition)
                        operand_stack.push(trueExpression);
                    else
                        operand_stack.push(falseExpression);
                    break;
                case "logical_or_expr":
                    var result = operand_stack.pop();
                    for (var j = 0; j < expr_list[i].PLACES -1; j++) {
                        var operand = operand_stack.pop();
                        result = result || operand;
                    }
                    operand_stack.push(result);
                    break;
                case "logical_and_expr":
                    var result = operand_stack.pop();
                    for (var j = 0; j < expr_list[i].PLACES -1; j++) {
                        var operand = operand_stack.pop();
                        result = result && operand;
                    }
                    operand_stack.push(result);
                    break;
                case "logical_bitor_expr":
                    var result = operand_stack.pop();
                    for (var j = 0; j < expr_list[i].PLACES - 1; j++)
                      result |= operand_stack.pop();
                    operand_stack.push(result);
                    break;
                case "logical_bitxor_expr":
                    var result = operand_stack.pop();
                    for (var j = 0; j < expr_list[i].PLACES - 1; j++)
                      result ^= operand_stack.pop();
                    operand_stack.push(result);
                    break;
                case "logical_bitand_expr":
                    var result = operand_stack.pop();
                    for (var j = 0; j < expr_list[i].PLACES - 1; j++)
                      result &= operand_stack.pop();
                    operand_stack.push(result);
                    break;
                case "equal_expr":
                    var operand2 = operand_stack.pop();
                    var operand1 = operand_stack.pop();
                    operand_stack.push(operand1 == operand2);
                    break;
                case "non_equal_expr":
                    var operand2 = operand_stack.pop();
                    var operand1 = operand_stack.pop();
                    operand_stack.push(operand1 != operand2);
                    break;
                case "le_expr":
                    var operand2 = operand_stack.pop();
                    var operand1 = operand_stack.pop();
                    operand_stack.push(operand1 <= operand2);
                    break;
                case "ge_expr":
                    var operand2 = operand_stack.pop();
                    var operand1 = operand_stack.pop();
                    operand_stack.push(operand1 >= operand2);
                    break;
                case "l_expr":
                    var operand2 = operand_stack.pop();
                    var operand1 = operand_stack.pop();
                    operand_stack.push(operand1 < operand2);
                    break;
                case "g_expr":
                    var operand2 = operand_stack.pop();
                    var operand1 = operand_stack.pop();
                    operand_stack.push(operand1 > operand2);
                    break;
                case "left_shift_expr":
                    var operand1 = operand_stack.pop();
                    var operand2 = operand_stack.pop();
                    operand_stack.push(operand1 << operand2);
                    break;
                case "right_shift_expr":
                    var operand1 = operand_stack.pop();
                    var operand2 = operand_stack.pop();
                    operand_stack.push(operand1 >> operand2);
                    break;
                case "add_expr":
                    var operand1 = operand_stack.pop();
                    var operand2 = operand_stack.pop();
                    operand_stack.push(operand1 + operand2);
                    break;
                case "sub_expr":
                    var operand1 = operand_stack.pop();
                    var operand2 = operand_stack.pop();
                    operand_stack.push(operand1 - operand2);
                    break;
                case "mul_expr":
                    var operand1 = operand_stack.pop();
                    var operand2 = operand_stack.pop();
                    operand_stack.push(operand1 * operand2);
                    break;
                case "div_expr":
                    var operand1 = operand_stack.pop();
                    var operand2 = operand_stack.pop();
                    operand_stack.push(operand1 / operand2);
                    break;
                case "mod_expr":
                    var operand1 = operand_stack.pop();
                    var operand2 = operand_stack.pop();
                    operand_stack.push(operand1 % operand2);
                    break;
                case "pre_inc_expr":
                case "post_inc_expr":
                    var operand = operand_stack.pop();
                    operand_stack.push(++operand);
                    break;
                case "pre_dec_expr":
                case "post_dec_expr":
                    var operand = operand_stack.pop();
                    operand_stack.push(--operand);
                    break;
                case "positive_expr":
                    var operand = operand_stack.pop();
                    operand_stack.push(+operand);
                    break;
                case "negative_expr":
                    var operand = operand_stack.pop();
                    operand_stack.push(-operand);
                    break;
                case "one_compl_expr":
                    var operand = operand_stack.pop();
                    operand_stack.push(~operand);
                    break;
                case "logic_negative_expr":
                    var operand = operand_stack.pop();
                    operand_stack.push(!operand);
                    break;
                default:
                    m_util.panic("Unknown operation type: " + expr_list[i].TYPE);
                    break;
                }
            }
        }
        if (operand_stack.length == 1)
            return operand_stack[0];
        else
            m_util.panic("Incorrect expression: " + expr_list.join(" "));
    }

    function process_include(elem) {
        var file = elem.FILE;
        var ast_inc = get_shader_ast(cfg_pth.shaders_path,
                                     cfg_pth.shaders_include_dir + file);
        curr_file_stack.push("include/" + file);
        process_group(ast_inc);
        curr_file_stack.pop();
    }
    function process_define(elem) {
        var name = elem.NAME;
        var tokens = elem.TOKENS;
        dirs[name] = tokens;

        // if (elem.PARAMS)
        //     fdirs[name] = elem.PARAMS;
    }
    function process_error(elem) {
        var tokens = elem.TOKENS;
        m_util.panic("Shader error: #error " + tokens.join(" "));
    }
    function process_pragma(elem) {
        // return back to shader
        var name = elem.NAME;
        var tokens = elem.TOKENS;
        lines.push("#pragma " + name + " " + tokens.join(" "));
    }
    function process_undef(elem) {
        var name = elem.NAME;
        delete dirs[name];
        // delete fdirs[name];
    }
    function process_warning(elem) {
        var tokens = elem.TOKENS;
        m_print.warn("Shader warning: #warning " + tokens.join(" "));
    }
    function process_extension(elem) {
        var tokens = elem.TOKENS;
        var token_list = expand_macro(tokens, dirs, fdirs, false);
        lines.push("#extension " + token_list.join(" "));
    }

    function process_version(elem) {
        var tokens = elem.TOKENS;
        var token_list = expand_macro(tokens, dirs, fdirs, false);
        lines.push("#version " + token_list.join(" "));
    }

    function process_node(elem) {
        shader_nodes[elem.NAME] = elem;
    }

    function check_optional_node_param(nelem, decl, param_index) {

        if (nelem.id == "PARTICLE_INFO" && decl.IS_OPTIONAL) {
            if (dirs["PARTICLE_BATCH"] == 1) {
                var node_param_usage = false;
                switch(param_index) {
                    case 0:
                        node_param_usage = particle_output_usage(nelem.dirs, "PART_INFO_IND")
                                || particle_output_usage(nelem.dirs, "PART_INFO_AGE")
                                || particle_output_usage(nelem.dirs, "PART_INFO_LT")
                                || particle_output_usage(nelem.dirs, "PART_INFO_SIZE");
                        break;
                    case 1:
                        node_param_usage = particle_output_usage(nelem.dirs, "PART_INFO_LOC");
                        break;
                    case 2:
                        node_param_usage = particle_output_usage(nelem.dirs, "PART_INFO_VEL");
                        break;
                    case 3:
                        node_param_usage = particle_output_usage(nelem.dirs, "PART_INFO_A_VEL");
                        break;
                    case 4:
                        node_param_usage = particle_output_usage(nelem.dirs, "PART_INFO_IND");
                }
                return node_param_usage;
            }
            return false;
        }

        return true;
    }

    function process_nodes_global(node_elements) {
        for (var i = 0; i < node_elements.length; i++) {
            var nelem = node_elements[i];

            var node_parts = shader_nodes[nelem.id];

            // ignore node not found in shader
            if (!node_parts)
                continue;

            var param_index = 0;
            for (var j = 0; j < node_parts.DECLARATIONS.length; j++) {
                var decl = node_parts.DECLARATIONS[j];
                if (decl.TYPE == "node_param") {
                    if (check_optional_node_param(nelem, decl, param_index)) {

                        var token_str = decl.QUALIFIER.join(" ") + " ";
                        if (type == "vert")
                            token_str += nelem.vparams[param_index];
                        else if (type == "frag") {
                            token_str += nelem.params[param_index];
                            if (nelem.param_values[param_index] !== null)
                                token_str += "=" + nelem.param_values[param_index];
                        }
                        token_str += ";";
                        process_text_tokens(separate_tokens(token_str));
                    }
                    param_index++;
                }
            }
        }
    }

    function combine_node_dir_tokens(node_parts, nelem) {
        var filename = curr_file_stack[curr_file_stack.length - 1];

        var node_dirs = process_node_vars(node_parts);
        for (var i = 0; i < nelem.dirs.length; i++) {
            var dir_name = nelem.dirs[i][0];
            if (dir_name in node_dirs)
                node_dirs[dir_name] = [nelem.dirs[i][1]];
            else if (DEBUG_INCOMPATIBLE_DIRECTIVES)
                m_print.error("Incompatible node directive '" + dir_name 
                        + "' was set for node " + nelem.id + " in shader " 
                        + filename + ".");
        }

        var node_out_index = 0;
        for (var i = 0; i < node_parts.DECLARATIONS.length; i++) {
            var decl = node_parts.DECLARATIONS[i];

            if (decl.TYPE == "node_out") {
                var new_name = nelem.outputs[node_out_index];
                var use_out = usage_inputs.indexOf(new_name) > -1 | 0;
                node_dirs["USE_OUT_" + decl.NAME] = [use_out];
                node_out_index++;
            }

        }

        return node_dirs;
    }

    function process_node_vars(node_parts) {
        var vars = {}
        for (var i = 0; i < node_parts.NODE_VARS.length; i++) {
            var var_decl = node_parts.NODE_VARS[i];
            vars[var_decl.NAME] = [var_decl.TOKENS.join("")];
        }
        return vars;
    }

    function process_nodes_main(node_elements) {
        for (var i = 0; i < node_elements.length; i++) {
            var nelem = node_elements[i];
            var node_parts = shader_nodes[nelem.id];

            // ignore node not found in shader
            if (!node_parts)
                continue;

            var replaces = {};

            input_index = 0;
            output_index = 0;
            param_index = 0;

            var node_dirs = combine_node_dir_tokens(node_parts, nelem);
            process_node_declaration(nelem, node_parts.DECLARATIONS, replaces, node_dirs);
            lines.push("{");
            process_node_statements(nelem, node_parts.STATEMENTS, replaces, node_dirs);
            lines.push("}");
        }
    }

    function process_node_declaration(nelem, declarations, replaces, node_dirs) {
        for (var j = 0; j < declarations.length; j++) {
            var decl = declarations[j];

            switch (decl.TYPE) {
            case "node_in":
                var new_name = nelem.inputs[input_index];

                // value != null for nonlinked inputs
                if (nelem.input_values[input_index] !== null) {
                    // NOTE: don't create variable for some shader nodes in
                    //       case of using IS_OPTIONAL flag
                    // MATERIAL_BEGIN: input_index === 3 --- normal_in
                    // MATERIAL_BEGIN: input_index === 4 --- emit_intensity
                    // MATERIAL_END: input_index === 3 --- reflect_factor
                    // MATERIAL_END: input_index === 4 --- specular_alpha
                    // MATERIAL_END: input_index === 5 --- alpha_in

                    if ((nelem.id == "MATERIAL_BEGIN" && input_index === 3
                            || !node_dirs["MATERIAL_EXT"] &&
                            (nelem.id == "MATERIAL_BEGIN" && input_index === 4
                            || nelem.id == "MATERIAL_END" && input_index === 3
                            || nelem.id == "MATERIAL_END" && input_index === 4
                            || nelem.id == "MATERIAL_END" && input_index === 5)
                            || nelem.id == "TEXTURE_COLOR" || nelem.id == "TEXTURE_NORMAL")
                            && decl.IS_OPTIONAL) {
                        replaces[decl.NAME] = nelem.input_values[input_index];
                        input_index++;
                        continue;
                    }

                    var token_str = decl.QUALIFIER.join(" ") + " ";
                    token_str += new_name + "=" + nelem.input_values[input_index] + ";";
                    process_text_tokens(separate_tokens(token_str));
                }
                replaces[decl.NAME] = new_name;
                input_index++;
                break;
            case "node_out":
                var new_name = nelem.outputs[output_index];

                if (!decl.IS_OPTIONAL || usage_inputs.indexOf(new_name) > -1) {
                    var token_str = decl.QUALIFIER.join(" ") + " ";
                    token_str += new_name + ";";
                    process_text_tokens(separate_tokens(token_str));

                    replaces[decl.NAME] = new_name;
                }

                output_index++;
                break;
            case "node_param":
                if (type == "vert")
                    var new_name = nelem.vparams[param_index];
                else if (type == "frag")
                    var new_name = nelem.params[param_index];

                replaces[decl.NAME] = new_name;

                param_index++;
                break;
            }
        }
        return replaces;
    }

    function process_node_statements(nelem, statements, replaces, node_dirs) {
        for (var i = 0; i < statements.length; i++) {
            var part = statements[i];

            switch(part.TYPE) {
            case "node_cond":
                process_node_condition(nelem, part.PARTS, replaces, node_dirs);
                break;
            case "txt":
                var tokens = [];
                for (var k = 0; k < part.TOKENS.length; k++) {
                    var tok = part.TOKENS[k];

                    if (tok in replaces)
                        tokens.push(replaces[tok]);
                    else
                        tokens.push(tok);
                }
                process_text_tokens(tokens, node_dirs);
                break;
            }
        }
    }

    function process_node_condition(nelem, node_if_elements, replaces, node_dirs) {
        for (var i = 0; i < node_if_elements.length; i++) {
            var nielem = node_if_elements[i];

            switch(nielem.TYPE) {
            case "node_if":
            case "node_elif":
                var expression = nielem.EXPRESSION;
                var result = expression_result(expression, node_dirs);
                if (result) {
                    process_node_statements(nelem, nielem.STATEMENTS, replaces, node_dirs);
                    return;
                }

                break;
            case "node_else":
                process_node_statements(nelem, nielem.STATEMENTS, replaces, node_dirs);
                return;
            case "node_ifdef":
                if (nielem.NAME in dirs || nielem.NAME in node_dirs)
                    process_node_statements(nelem, nielem.STATEMENTS, replaces, node_dirs);
                break;
            case "node_ifndef":
                if (!(nielem.NAME in dirs) && !(nielem.NAME in node_dirs))
                    process_node_statements(nelem, nielem.STATEMENTS, replaces, node_dirs);
                break;
            }
        }
    }

    function separate_tokens(str) {
        // fractional number | identifier | one-symbol token excluding spaces
        return str.match(/([\d]+\.[\d]+|[\w]+|[^\s])/g);
    }

    function process_text_tokens(tokens, node_dirs) {
        tokens = preprocess_glsl_compat_tokens(tokens, type);

        if (tokens.length) {
            var token_list = expand_macro(tokens, dirs, fdirs, false, node_dirs);
            lines.push(token_list.join(" "));
        }
    }

    function preprocess_glsl_compat_tokens(tokens, type) {
        // using standard gl_FragColor, so the corresponding interface 
        // declaration isn't needed in GLSL ES 1.0
        if (!cfg_def.webgl2 && type == "frag") {

            var token_str = tokens.join(" ");

            // remove the last part (or the whole row) of the GLSL_OUT 
            // declaration if it's breaked in many rows
            if (frag_glsl_out_declaration) {
                if (token_str.match(/[^;]*;/)) {
                    token_str = token_str.replace(/[^;]*;/, "")
                    frag_glsl_out_declaration = false;
                } else
                    token_str = "";
            }

            // remove GLSL_OUT declaration on a single row
            token_str = token_str.replace(/GLSL_OUT [^;]*;/g, "");


            // remove the first part of the GLSL_OUT declaration if it's breaked 
            // in many rows
            if (token_str.match(/GLSL_OUT(?:$| [^;]*)/)) {
                token_str = token_str.replace(/GLSL_OUT(?:$| [^;]*)/, "");
                frag_glsl_out_declaration = true;
            }

            token_str = token_str.replace(/ {2,}/g, " ");
            token_str = token_str.trim();

            if (token_str)
                tokens = token_str.split(" ");
            else
                tokens = [];
        }

        return tokens;
    }

    /**
     * Analyze tokens and dirs and compose string
     * @param empty_as_zero treat empty directive as zero or just ignore
     * (#define ABC ... #if ABC => #if 0) vs (#define ABC ... #if ABC => #if ABC)
     */
    function expand_macro(tokens, dirs, fdirs, empty_as_zero, node_dirs) {
        var result = [];
        expand_macro_iter(tokens, dirs, fdirs, empty_as_zero, result, node_dirs);
        return result;
    }

    function expand_macro_iter(tokens, dirs, fdirs, empty_as_zero, result, node_dirs) {
        var filename = curr_file_stack[curr_file_stack.length - 1];

        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];

            if (node_dirs && token in node_dirs)
                var new_tokens = node_dirs[token];
            else if (token in dirs)
                var new_tokens = dirs[token];
            else {
                result.push(token);
                continue;            
            }

            if (new_tokens.length == 0 && empty_as_zero)
                result.push(0);
            else
                expand_macro_iter(new_tokens, dirs, fdirs, empty_as_zero, result, node_dirs);
        }
    }
}

function init_shader(gl, vshader_text, fshader_text,
                     shader_id, shaders_info) {

    var vshader = compile_shader(gl, shader_id, vshader_text,
        gl.VERTEX_SHADER, shaders_info);
    var fshader = compile_shader(gl, shader_id, fshader_text,
        gl.FRAGMENT_SHADER, shaders_info);

    var program = gl.createProgram();

    gl.attachShader(program, vshader);
    gl.attachShader(program, fshader);
    gl.linkProgram(program);

    var compiled_shader = {
        // save link to shader objects just to delete them during cleanup
        vshader    : vshader,
        fshader    : fshader,
        program    : program,
        attributes : {},
        uniforms   : {},

        permanent_uniform_setters : m_util.create_non_smi_array(),
        permanent_sc_uniform_setters : m_util.create_non_smi_array(),
        // speeds up access by uniform name
        permanent_uniform_setters_table : {},
        need_uniforms_update: true,
        no_permanent_uniforms: false,

        transient_uniform_setters : m_util.create_non_smi_array(),
        transient_sc_uniform_setters : m_util.create_non_smi_array(),

        // NOTE: for debug purposes
        shaders_info: m_util.clone_object_json(shaders_info),

        shader_id: shader_id,
        cleanup_gl_data_on_unload: true
    };

    var att_count = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (var i = 0; i < att_count; i++) {
        var att = gl.getActiveAttrib(program, i);
        var att_name = att.name;
        var att_loc = gl.getAttribLocation(program, att_name);

        compiled_shader.attributes[att_name] = att_loc;
    }

    var uni_count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < uni_count; i++) {
        var uni = gl.getActiveUniform(program, i);
        var uni_name = uni.name.split("[0]").join("");
        var uni_loc = gl.getUniformLocation(program, uni_name);
        compiled_shader.uniforms[uni_name] = uni_loc;
    }

    return compiled_shader;
}

exports.debug_get_compilation_stats = function() {
    return _debug_hash_codes;
}

function debug_compilation_uniqueness(shader_id, shader_text, shader_type, shaders_info) {

    if (shader_type == _gl.VERTEX_SHADER)
        var shader_filename = shaders_info.vert;
    else
        var shader_filename = shaders_info.frag;

    var hc = m_util.hash_code_string(shader_text, 0);
    var info = _debug_hash_codes[hc];

    if (info) {
        info.count++;
    } else {
        info = {
            count: 1,
            shader_filename: shader_filename,
            hc: hc
        };
        _debug_hash_codes[hc] = info;
    }
}

function compile_shader(gl, shader_id, shader_text, shader_type, shaders_info) {

    if (DEBUG_COMPILATION_UNIQUENESS)
        debug_compilation_uniqueness(shader_id, shader_text, shader_type, shaders_info);

    var shader = gl.createShader(shader_type);
    gl.shaderSource(shader, shader_text);
    gl.compileShader(shader);

    return shader;
}

exports.get_compiled_shaders = function() {
    return _compiled_shaders;
}

exports.cleanup = cleanup;
function cleanup() {
    for (var shader_id in _compiled_shaders)
        cleanup_shader(_compiled_shaders[shader_id]);

    for (var id in _shader_ast_cache)
        delete _shader_ast_cache[id];

    for (var hc in _debug_hash_codes)
        delete _debug_hash_codes[hc];

    _varying_buffer = null;
    _fragment_uniform_buffer = null;
    _vertex_uniform_buffer = null;
    _vars_cache = {};
}

exports.cleanup_shader = cleanup_shader;
function cleanup_shader(shader) {
    _gl.deleteProgram(shader.program);
    _gl.deleteShader(shader.vshader);
    _gl.deleteShader(shader.fshader);
    delete _compiled_shaders[shader.shader_id];
}

exports.debug_shaders_info = function(shaders_info) {
    var dirs = shaders_info.directives;
    m_print.log("Shader: " + shaders_info.vert + " " + shaders_info.frag +
            ", " + String(dirs.length) + " directives: ");
    for (var i = 0; i < dirs.length; i++)
        m_print.log("  " + dirs[i][0], dirs[i][1]);
}

/**
 * dim = 0 - assign automatically
 */
exports.glsl_value = glsl_value;
function glsl_value(value, dim) {
    if (!dim && value.length)
        dim = value.length;
    else if (!dim)
        dim = 1;

    switch (dim) {
    case 1:
        return glsl_float(value);
        break;
    case 2:
        return "vec2(" + glsl_float(value[0]) + "," + glsl_float(value[1]) + ")";
        break;
    case 3:
        return "vec3(" + glsl_float(value[0]) + "," + glsl_float(value[1]) + "," +
                glsl_float(value[2]) + ")";
        break;
    case 4:
        return "vec4(" + glsl_float(value[0]) + "," + glsl_float(value[1]) + "," +
                glsl_float(value[2]) + "," + glsl_float(value[3]) + ")";
        break;
    case 9:
        return "mat3(" + glsl_float(value[0]) + "," + glsl_float(value[1]) + "," +
                glsl_float(value[2]) + "," + glsl_float(value[3]) + "," +
                glsl_float(value[4]) + "," + glsl_float(value[5]) + "," +
                glsl_float(value[6]) + "," + glsl_float(value[7]) + "," +
                glsl_float(value[8]) + ")";
        break;
    case 16:
        return "mat4(" + glsl_float(value[0]) + "," + glsl_float(value[1]) + "," +
                glsl_float(value[2]) + "," + glsl_float(value[3]) + "," +
                glsl_float(value[4]) + "," + glsl_float(value[5]) + "," +
                glsl_float(value[6]) + "," + glsl_float(value[7]) + "," +
                glsl_float(value[8]) + "," + glsl_float(value[9]) + "," +
                glsl_float(value[10]) + "," + glsl_float(value[11]) + "," +
                glsl_float(value[12]) + "," + glsl_float(value[13]) + "," +
                glsl_float(value[14]) + "," + glsl_float(value[15]) + ")";
        break;
    default:
        m_util.panic("Wrong glsl value dimension");
        break;
    }
}

function glsl_float(value) {
    return ((value % 1) ? String(value) : String(value) + ".0");
}

exports.check_uniform = function(shader, name) {
    if (name in shader.uniforms)
        return true;
    else
        return false;
}

function particle_output_usage(ndirs, dir) {
    for (var i = 0; i < ndirs.length; i++)
        if (ndirs[i][0] == dir)
            return true;
    return false;
}

exports.reset = function() {
    _gl = null;
}

}
