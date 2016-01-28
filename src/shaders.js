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

var cfg_pth = m_cfg.paths;

var _compiled_shaders = {};
var _shader_ast_cache = {};
var _shader_texts = null;

var SHADERS = ["anchors.glslf",
    "anchors.glslv",
    "color_id.glslf",
    "color_id.glslv",
    "depth.glslf",
    "depth.glslv",
    "grass_map.glslf",
    "grass_map.glslv",
    "halo.glslf",
    "halo.glslv",
    "line.glslf",
    "line.glslv",
    "main.glslf",
    "main.glslv",
    "main_stack.glslf",
    "particles_color.glslf",
    "particles_color.glslv",
    "particles_texture.glslf",
    "particles_texture.glslv",
    "procedural_skydome.glslf",
    "procedural_skydome.glslv",
    "special_lens_flares.glslf",
    "special_lens_flares.glslv",
    "special_skydome.glslf",
    "special_skydome.glslv",
    "special_water.glslf",
    "special_water.glslv",
    "wireframe.glslf",
    "wireframe.glslv",

    "postprocessing/antialiasing.glslf",
    "postprocessing/bloom_combine.glslf",
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
    "include/lighting_nodes.glslf",
    "include/math.glslv",
    "include/mirror.glslf",
    "include/nodes.glslf",
    "include/nodes.glslv",
    "include/pack.glslf",
    "include/particles.glslv",
    "include/precision_statement.glslf",
    "include/procedural.glslf",
    "include/refraction.glslf",
    "include/scale_texcoord.glslv",
    "include/shadow.glslf",
    "include/shadow.glslv",
    "include/skin.glslv",
    "include/std_enums.glsl",
    "include/to_world.glslv",
    "include/wind_bending.glslv"];

var DEBUG_COMPILATION_UNIQUENESS = false;
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
 * Append or override existing directive for Shaders Info object.
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
            var value = dir[1];
        // else keep input value
    }

    // update existing directive
    for (var i = 0; i < dirs.length; i++)
        if (dirs[i][0] == name) {
            dirs[i][1] = value;
            return;
        }

    // or set new
    dirs.push([name, value]);
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

/**
 * Check if given name is a valid directive name and its value is true
 */
exports.is_enabled = function(shaders_info, name) {

    var dirs = shaders_info.directives;

    for (var i = 0; i < dirs.length; i++)
        if (dirs[i][0] == name && dirs[i][1] == 1)
            return true;

    return false;
}

/**
 * Set default directives according to shader names
 */
exports.set_default_directives = function(sinfo) {

    sinfo.directives = [];

    var dir_names = [
        "ALPHA",
        "ALPHA_CLIP",
        "ANAGLYPH",
        "BEND_CENTER_ONLY",
        "BILLBOARD_PRES_GLOB_ORIENTATION",
        "CAUSTICS",
        "CSM_BLEND_BETWEEEN_CASCADES",
        "CSM_FADE_LAST_CASCADE",
        "CSM_SECTION0",
        "CSM_SECTION1",
        "CSM_SECTION2",
        "CSM_SECTION3",
        "DEBUG_SPHERE",
        "DEBUG_SPHERE_DYNAMIC",
        "DEPTH_RGBA",
        "DISABLE_DISTORTION_CORRECTION",
        "DISABLE_FOG",
        "DOUBLE_SIDED_LIGHTING",
        "DYNAMIC",
        "DYNAMIC_GRASS",
        "DYNAMIC_GRASS_COLOR",
        "DYNAMIC_GRASS_SIZE",
        "FOAM",
        "FRAMES_BLENDING",
        "BILLBOARD_JITTERED",
        "BILLBOARD_SPHERICAL",
        "HAIR_BILLBOARD",
        "SHADOW_TEX_RES",
        "MAIN_BEND_COL",
        "MAX_BONES",
        "NODES_GLOW",
        "NUM_NORMALMAPS",
        "PARALLAX",
        "PARALLAX_STEPS",
        "PROCEDURAL_FOG",
        "PROCEDURAL_SKYDOME",
        "REFLECTION",
        "REFLECTION_PASS",
        "REFLECTION_TYPE",
        "REFRACTIVE",
        "USE_REFRACTION",
        "USE_REFRACTION_CORRECTION",
        "SHORE_SMOOTHING",
        "SKINNED",
        "SKY_COLOR",
        "SKY_TEXTURE",
        "SSAO_HEMISPHERE",
        "SSAO_BLUR_DEPTH",
        "SSAO_ONLY",
        "SSAO_WHITE",
        "STATIC_BATCH",
        "TEXTURE_COLOR",
        "TEXTURE_NORM",
        "TEXTURE_SPEC",
        "TEXTURE_STENCIL_ALPHA_MASK",
        "VERTEX_ANIM",
        "VERTEX_ANIM_MIX_NORMALS_FACTOR",
        "VERTEX_COLOR",
        "WATER_EFFECTS",
        "WIND_BEND",
        "DETAIL_BEND",
        "SHORE_PARAMS",
        "ALPHA_AS_SPEC",
        "DEPTH_RGBA",
        "MTEX_NEGATIVE",
        "MTEX_RGBTOINT",
        "NUM_LIGHTS",
        "NUM_LFACTORS",
        "NUM_LAMP_LIGHTS",
        "MAX_STEPS",
        "BILLBOARD_ALIGN",
        "SHADOW_USAGE",
        "POST_EFFECT",
        "SSAO_QUALITY",
        "TEXTURE_BLEND_TYPE",
        "TEXTURE_COORDS",
        "AA_METHOD",
        "AU_QUALIFIER",
        "BILLBOARD",
        "BILLBOARD_RANDOM",
        "PRECISION",
        "EPSILON",
        "USE_ENVIRONMENT_LIGHT",
        "USE_FOG",
        "WEBGL2",
        "WO_SKYBLEND",
        "WO_SKYPAPER",
        "WO_SKYREAL",
        "WO_SKYTEX",
        "WOMAP_BLEND",
        "WOMAP_HORIZ",
        "WOMAP_ZENUP",
        "WOMAP_ZENDOWN",
        "WIREFRAME_QUALITY",
        "SIZE_RAMP_LENGTH",
        "COLOR_RAMP_LENGTH",
        "PARTICLES_SHADELESS",
        "NUM_CAST_LAMPS",
        "SUN_NUM",
        "MAC_OS_SHADOW_HACK"
    ];

    for (var i = 0; i < dir_names.length; i++) {
        var name = dir_names[i];
        var val;

        switch(name) {
        // default 0
        case "ALPHA":
        case "ALPHA_CLIP":
        case "ANAGLYPH":
        case "BILLBOARD_PRES_GLOB_ORIENTATION":
        case "CAUSTICS":
        case "CSM_SECTION0":
        case "CSM_SECTION1":
        case "CSM_SECTION2":
        case "CSM_SECTION3":
        case "DEBUG_SPHERE":
        case "DEBUG_SPHERE_DYNAMIC":
        case "DEPTH_RGBA":
        case "DISABLE_DISTORTION_CORRECTION":
        case "DISABLE_FOG":
        case "DOUBLE_SIDED_LIGHTING":
        case "DYNAMIC":
        case "DYNAMIC_GRASS":
        case "DYNAMIC_GRASS_COLOR":
        case "DYNAMIC_GRASS_SIZE":
        case "FOAM":
        case "FRAMES_BLENDING":
        case "BILLBOARD_JITTERED":
        case "MAIN_BEND_COL":
        case "MAX_BONES":
        case "MTEX_NEGATIVE":
        case "MTEX_RGBTOINT":
        case "NODES_GLOW":
        case "NUM_LIGHTS":
        case "NUM_LFACTORS":
        case "NUM_NORMALMAPS":
        case "PARALLAX":
        case "PARALLAX_STEPS":
        case "PROCEDURAL_FOG":
        case "PROCEDURAL_SKYDOME":
        case "REFLECTION":
        case "REFLECTION_PASS":
        case "REFLECTION_TYPE":
        case "REFRACTIVE":
        case "USE_REFRACTION":
        case "USE_REFRACTION_CORRECTION":
        case "SHORE_SMOOTHING":
        case "SKINNED":
        case "SKY_COLOR":
        case "SKY_TEXTURE":
        case "SSAO_HEMISPHERE":
        case "SSAO_BLUR_DEPTH":
        case "SSAO_ONLY":
        case "SSAO_WHITE":
        case "STATIC_BATCH":
        case "TEXTURE_COLOR":
        case "TEXTURE_NORM":
        case "TEXTURE_SPEC":
        case "TEXTURE_STENCIL_ALPHA_MASK":
        case "VERTEX_ANIM":
        case "VERTEX_COLOR":
        case "WATER_EFFECTS":
        case "WIND_BEND":
        case "DETAIL_BEND":
        case "SHORE_PARAMS":
        case "BILLBOARD":
        case "BILLBOARD_RANDOM":
        case "HAIR_BILLBOARD":
        case "USE_ENVIRONMENT_LIGHT":
        case "USE_FOG":
        case "WO_SKYBLEND":
        case "WO_SKYPAPER":
        case "WO_SKYREAL":
        case "WO_SKYTEX":
        case "WOMAP_BLEND":
        case "WOMAP_HORIZ":
        case "WOMAP_ZENUP":
        case "WOMAP_ZENDOWN":
        case "WIREFRAME_QUALITY":
        case "SIZE_RAMP_LENGTH":
        case "COLOR_RAMP_LENGTH":
        case "PARTICLES_SHADELESS":
        case "SMAA_JITTER":
        case "NUM_CAST_LAMPS":
        case "SUN_NUM":
        case "MAC_OS_SHADOW_HACK":
            val = 0;
            break;

        // default 1
        case "ALPHA_AS_SPEC":
        case "BEND_CENTER_ONLY":
        case "CSM_BLEND_BETWEEEN_CASCADES":
        case "CSM_FADE_LAST_CASCADE":
        case "DEPTH_RGBA":
        case "BILLBOARD_SPHERICAL":
        case "NUM_LAMP_LIGHTS":
        case "MAX_STEPS":
            val = 1;
            break;

        // integer number
        case "WEBGL2":
            val = m_cfg.defaults.webgl2 | 0;
            break;
        
        // float
        case "EPSILON":
            if (m_cfg.defaults.precision == "highp")
                val = 0.000001;
            else
                val = 0.0001;
            break;
        case "SHADOW_TEX_RES":
            val = glsl_value(2048.0);
            break;

        // string
        case "AA_METHOD":
            val = "AA_METHOD_FXAA_QUALITY";
            break;
        case "AU_QUALIFIER":
            // NOTE: check it
            val = "NOT_ASSIGNED";
            break;
        case "BILLBOARD_ALIGN":
            val = "BILLBOARD_ALIGN_VIEW";
            break;
        case "POST_EFFECT":
            val = "POST_EFFECT_NONE";
            break;
        case "SHADOW_USAGE":
            val = "NO_SHADOWS";
            break;
        case "SSAO_QUALITY":
            val = "SSAO_QUALITY_32";
            break;
        case "TEXTURE_BLEND_TYPE":
            val = "TEXTURE_BLEND_TYPE_MIX";
            break;
        case "TEXTURE_COORDS":
            val = "TEXTURE_COORDS_UV_ORCO";
            break;
        case "PRECISION":
            val = m_cfg.defaults.precision;
            break;
        case "VERTEX_ANIM_MIX_NORMALS_FACTOR":
            val = "u_va_frame_factor";
            break;
        default:
            m_print.error("Unknown directive (" + sinfo.vert + ", " +
                    sinfo.frag +"): " + name);
            break;
        }

        set_directive(sinfo, name, val);
    }
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

/**
 * Inherit directive values
 * directives should exist in both shaders_info objects
 */
exports.inherit_directives = function(sinfo_to, sinfo_from) {
    var dirs = sinfo_from.directives;

    for (var i = 0; i < dirs.length; i++) {
        var name = dirs[i][0];
        var value = dirs[i][1];

        if (get_directive(sinfo_to, name))
            set_directive(sinfo_to, name, value);
    }
}

exports.get_compiled_shader = get_compiled_shader;
/**
 * Compile, return and cache GL shader object from shader_id
 * @param shader_id JSONified shaders_info object
 * @methodOf shaders
 */
function get_compiled_shader(shaders_info) {

    var shader_id = JSON.stringify(shaders_info);

    var compiled_shader = _compiled_shaders[shader_id];
    if (compiled_shader)
        return compiled_shader;

    // retrieve filenames of shaders
    var vshader = shaders_info.vert;
    var fshader = shaders_info.frag;

    // load the code
    var vshader_ast = get_shader_ast(cfg_pth.shaders_dir, vshader);
    var fshader_ast = get_shader_ast(cfg_pth.shaders_dir, fshader);
    if (!vshader_ast || !fshader_ast)
        return null;

    var vshader_text = preprocess_shader("vert", vshader_ast, shaders_info);
    var fshader_text = preprocess_shader("frag", fshader_ast, shaders_info);

    // compile
    _compiled_shaders[shader_id] = compiled_shader =
        init_shader(_gl, vshader_text, fshader_text, shader_id, shaders_info);

    return compiled_shader;
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
            var shader_path = m_util.normpath_preserve_protocol(cfg_pth.shaders_dir
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

function preprocess_shader(type, ast, shaders_info) {

    var node_elements = shaders_info.node_elements;
    // prepend by define directives
    var dirs_arr = shaders_info.directives || [];

    // output GLSL lines
    var lines = [];
    // set with predefined macros {"name": tokens}
    var dirs = {};
    for (var i = 0; i < dirs_arr.length; i++)
        dirs[dirs_arr[i][0]] = [dirs_arr[i][1]];

    for (var i = 0; i < node_elements.length; i++)
        dirs["USE_NODE_" + node_elements[i].id] = [1];
    // set with params for function-like macros {"name": params}
    var fdirs = {};

    var shader_nodes = {};

    var usage_inputs = [];
    for (var i in node_elements)
        for (var j in node_elements[i].inputs)
            usage_inputs.push(node_elements[i].inputs[j]);

    // entry element
    process_group(ast);

    var text = lines.join("\n");

    var input_index = 0;
    var output_index = 0;
    var param_index = 0;

    return text;

    function process_group(elem) {
        var parts = elem.parts;

        for (var i = 0; i < parts.length; i++) {
            var pelem = parts[i];
            switch(pelem.type) {
            case "condition":
                process_condition(pelem);
                break;

            case "include":
                process_include(pelem);
                break;
            case "var":
            case "export":
            case "import":
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

            case "textline":
                process_textline(pelem);
                break;
            default:
                throw "Unknown element type: " + pelem.type;
                break;
            }
        }
    }

    function process_condition(elem) {
        var parts = elem.parts;

        for (var i = 0; i < parts.length; i++) {
            var pelem = parts[i];

            switch(pelem.type) {
            case "if":
            case "elif":
                var expression = pelem.expression;
                var result = expression_result(expression)

                if (result) {
                    process_group(pelem.group);
                    return;
                }
                break;
            case "else":
                process_group(pelem.group);
                return;
            case "ifdef":
                if (pelem.name in dirs)
                    process_group(pelem.group);
                break;
            case "ifndef":
                if (!(pelem.name in dirs))
                    process_group(pelem.group);
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

                if (expr_identifier.test(operand))
                    operand_stack.push(0);
                else
                    operand_stack.push(parseFloat(expr_list[i]));
            } else {
                switch (expr_list[i].type) {
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
                    for (var j = 0; j < expr_list[i].places -1; j++) {
                        var operand = operand_stack.pop();
                        result = result || operand;
                    }
                    operand_stack.push(result);
                    break;
                case "logical_and_expr":
                    var result = operand_stack.pop();
                    for (var j = 0; j < expr_list[i].places -1; j++) {
                        var operand = operand_stack.pop();
                        result = result && operand;
                    }
                    operand_stack.push(result);
                    break;
                case "logical_bitor_expr":
                    var result = operand_stack.pop();
                    for (var j = 0; j < expr_list[i].places - 1; j++)
                      result |= operand_stack.pop();
                    operand_stack.push(result);
                    break;
                case "logical_bitxor_expr":
                    var result = operand_stack.pop();
                    for (var j = 0; j < expr_list[i].places - 1; j++)
                      result ^= operand_stack.pop();
                    operand_stack.push(result);
                    break;
                case "logical_bitand_expr":
                    var result = operand_stack.pop();
                    for (var j = 0; j < expr_list[i].places - 1; j++)
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
                    m_util.panic("Unknown operation type: " + expr_list[i].type);
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
        var file = elem.file;
        var ast_inc = get_shader_ast(cfg_pth.shaders_dir,
                                     cfg_pth.shaders_include_dir + file);
        process_group(ast_inc);
    }
    function process_define(elem) {
        var name = elem.name;
        var tokens = elem.tokens;
        dirs[name] = tokens;

        if (elem.params)
            fdirs[name] = elem.params;
    }
    function process_error(elem) {
        var tokens = elem.tokens;
        throw "Shader error: #error " + tokens.join(" ");
    }
    function process_pragma(elem) {
        // return back to shader
        var name = elem.name;
        var tokens = elem.tokens;
        lines.push("#pragma " + name + " " + tokens.join(" "));
    }
    function process_undef(elem) {
        var name = elem.name;
        delete dirs[name];
        delete fdirs[name];
    }
    function process_warning(elem) {
        var tokens = elem.tokens;
        m_print.warn("Shader warning: #warning " + tokens.join(" "));
    }
    function process_extension(elem) {
        var tokens = elem.tokens;
        var token_list = expand_macro(tokens, dirs, fdirs, false);
        lines.push("#extension " + token_list.join(" "));
    }


    function process_node(elem) {
        shader_nodes[elem.name] = elem;
    }

    function process_nodes_global(node_elements) {

        for (var i = 0; i < node_elements.length; i++) {
            var nelem = node_elements[i];

            var node_parts = shader_nodes[nelem.id];

            // ignore node not found in shader
            if (!node_parts)
                continue;

            var param_index = 0;
            for (var j = 0; j < node_parts.declarations.length; j++) {
                var part = node_parts.declarations[j];
                if (part.type == "node_param") {
                    var glob_var_line = part.qualifier.join(" ") + " ";

                    if (type == "vert") {
                        glob_var_line += nelem.vparams[param_index];
                    } else if (type == "frag") {
                        glob_var_line += nelem.params[param_index];

                        if (nelem.param_values[param_index] !== null)
                            glob_var_line += " = " + nelem.param_values[param_index];
                    }
                    glob_var_line += ";";

                    lines.push(glob_var_line);
                    param_index++;
                }
            }
        }
    }

    function process_nodes_main(nodes) {
        for (var i = 0; i < nodes.length; i++) {
            var nelem = nodes[i];
            var node_parts = shader_nodes[nelem.id];

            // ignore node not found in shader
            if (!node_parts)
                continue;

            var replaces = {};
            var node_dirs = {};

            for (var j = 0; j < nelem.dirs.length; j++) {
                node_dirs[nelem.dirs[j][0]] = [nelem.dirs[j][1]];
            }

            input_index = 0;
            output_index = 0;
            param_index = 0;

            process_node_declaration(nelem, node_parts.declarations, replaces, node_dirs);
            lines.push("{");
            process_node_statements(nelem, node_parts.statements, replaces, node_dirs);
            lines.push("}");
        }
    }

    function process_node_declaration(nelem, declarations, replaces, node_dirs) {
        for (var j = 0; j < declarations.length; j++) {
            var decl = declarations[j];

            switch (decl.type) {
            case "node_in":
                var new_name = nelem.inputs[input_index];

                // value != null for nonlinked inputs
                if (nelem.input_values[input_index] !== null) {
                    // NOTE: don't create variable for some shader nodes in
                    //       case of using is_optional flag
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
                            && decl.is_optional) {
                        replaces[decl.name] = nelem.input_values[input_index];
                        input_index++;
                        continue;
                    }

                    var main_var_line = decl.qualifier.join(" ") + " ";
                    main_var_line += new_name;
                    main_var_line += " = " + nelem.input_values[input_index];
                    main_var_line += ";";
                    lines.push(main_var_line);
                }
                replaces[decl.name] = new_name;
                input_index++;
                break;
            case "node_out":
                var new_name = nelem.outputs[output_index];

                if (!decl.is_optional || usage_inputs.indexOf(new_name) > -1) {
                    var main_var_line = decl.qualifier.join(" ") + " ";
                    main_var_line += new_name;
                    main_var_line += ";";
                    lines.push(main_var_line);

                    replaces[decl.name] = new_name;
                }

                if (usage_inputs.indexOf(new_name) > -1)
                    node_dirs["USE_OUT_" + decl.name] = [1];

                output_index++;
                break;
            case "node_param":
                if (type == "vert")
                    var new_name = nelem.vparams[param_index];
                else if (type == "frag")
                    var new_name = nelem.params[param_index];

                replaces[decl.name] = new_name;

                param_index++;
                break;
            }
        }
        return replaces;
    }

    function process_node_statements(nelem, statements, replaces, node_dirs) {
        for (var i = 0; i < statements.length; i++) {
            var part = statements[i];

            switch(part.type) {
            case "node_condition":
                process_node_condition(nelem, part.parts, replaces, node_dirs);
                break;
            case "textline":
                var tokens = [];
                for (var k = 0; k < part.tokens.length; k++) {
                    var tok = part.tokens[k];

                    if (tok in replaces)
                        tokens.push(replaces[tok]);
                    else
                        tokens.push(tok);
                }

                var token_list = expand_macro(tokens, dirs, fdirs, true, node_dirs);
                lines.push(token_list.join(" "));
                break;
            }
        }
    }

    function process_node_condition(nelem, node_if_elements, replaces, node_dirs) {
        for (var i = 0; i < node_if_elements.length; i++) {
            var nielem = node_if_elements[i];

            switch(nielem.type) {
            case "node_if":
            case "node_elif":
                var expression = nielem.expression;
                var result = expression_result(expression, node_dirs);
                if (result) {
                    process_node_statements(nelem, nielem.statements, replaces, node_dirs);
                    return;
                }

                break;
            case "node_else":
                process_node_statements(nelem, nielem.statements, replaces, node_dirs);
                return;
            case "node_ifdef":
                if (nielem.name in dirs || nielem.name in node_dirs)
                    process_node_statements(nelem, nielem.statements, replaces, node_dirs);
                break;
            case "node_ifndef":
                if (!(nielem.name in dirs) && !(nielem.name in node_dirs))
                    process_node_statements(nelem, nielem.statements, replaces, node_dirs);
                break;
            }
        }
    }

    function process_textline(elem) {
        var tokens = elem.tokens;
        var token_list = expand_macro(tokens, dirs, fdirs, false);
        lines.push(token_list.join(" "));
    }
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
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        if (token in dirs || node_dirs && token in node_dirs) {
            // TODO
            //if (token in fdirs) {
            //}

            var new_tokens = node_dirs && node_dirs[token] || dirs[token];
            if (new_tokens.length == 0 && empty_as_zero)
                result.push(0);
            else
                expand_macro_iter(new_tokens, dirs, fdirs, empty_as_zero, result, node_dirs);
        } else
            result.push(token);
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

    gl.validateProgram(program);
    if (gl.getProgramParameter(program, gl.VALIDATE_STATUS) == gl.FALSE)
        m_print.error("shader program is not valid", shader_id);

    m_debug.check_shader_linking(program, shader_id, vshader, fshader,
        vshader_text, fshader_text);

    var compiled_shader = {
        // save link to shader objects just to delete them during cleanup
        vshader    : vshader,
        fshader    : fshader,
        program    : program,
        attributes : {},
        uniforms   : {},

        permanent_uniform_setters : [],
        // speeds up access by uniform name
        permanent_uniform_setters_table : {},

        transient_uniform_setters : [],

        // NOTE: for debug purposes
        shaders_info: shaders_info
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

    m_debug.check_shader_compiling(shader, shader_id, shader_text);

    return shader;
}

exports.get_compiled_shaders = function() {
    return _compiled_shaders;
}

exports.cleanup = cleanup;

function cleanup() {

    for (var shader_id in _compiled_shaders) {
        var shader = _compiled_shaders[shader_id];
        _gl.deleteProgram(shader.program);
        // shaders automatically detached here

        _gl.deleteShader(shader.vshader);
        _gl.deleteShader(shader.fshader);
        delete _compiled_shaders[shader_id];
    }

    for (var id in _shader_ast_cache)
        delete _shader_ast_cache[id];

    for (var hc in _debug_hash_codes)
        delete _debug_hash_codes[hc];
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
        throw "Wrong glsl value dimension";
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

exports.get_varyings_count = function(shader) {
    return (_gl.getShaderSource(shader).match(/(?:^|\s)varying(?=\s)/g) || []).length;
}

}
