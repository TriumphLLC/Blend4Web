"use strict";

/**
 * Shaders internal API.
 * @name shaders
 * @namespace
 * @exports exports as shaders
 */
b4w.module["__shaders"] = function(exports, require) {

var config     = require("__config");
var m_print    = require("__print");
var m_debug    = require("__debug");
var gpp_eval   = require("__gpp_eval");
var assets     = require("__assets");
var util       = require("__util");

var cfg_pth = config.paths;

// shader texts available for compiled version only
if (b4w.module_check(config.paths.shader_texts_module)) {
    var shader_texts = require(config.paths.shader_texts_module);
    var gpp_parser = null;
} else {
    var shader_texts = null;
    var gpp_parser = require("__gpp_parser");
}

var _compiled_shaders = {};
var _shader_ast_cache = {};

var DEBUG_COMPILATION_UNIQUENESS = false;
var _debug_hash_codes = [];

var _gl = null;

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
        "BEND_CENTER_ONLY",
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
        "NUM_NORMALMAPS",
        "PARALLAX",
        "PARALLAX_STEPS",
        "PROCEDURAL_FOG",
        "REFLECTION",
        "REFLECTION_PASS",
        "REFLECTIVE",
        "REFRACTIVE",
        "SHORE_SMOOTHING",
        "SKINNED",
        "SKY_TEXTURE",
        "SSAO_HEMISPHERE",
        "SSAO_BLUR_DEPTH",
        "SSAO_ONLY",
        "SSAO_WHITE",
        "STATIC_BATCH",
        "TEXTURE_COLOR",
        "TEXTURE_MIRROR",
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
        "NUM_LIGHTS",
        "NUM_LAMP_LIGHTS",
        "MAX_STEPS",
        "BILLBOARD_ALIGN",
        "SHADOW_SRC",
        "SHADOW_DST",
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
        "WIREFRAME_QUALITY",
        "SIZE_RAMP_LENGTH",
        "COLOR_RAMP_LENGTH",
        "PARTICLES_SHADELESS"
    ];

    for (var i = 0; i < dir_names.length; i++) {
        var name = dir_names[i];
        var val;

        switch(name) {
        // default 0
        case "ALPHA":
        case "ALPHA_CLIP":
        case "CAUSTICS":
        case "CSM_SECTION0":
        case "CSM_SECTION1":
        case "CSM_SECTION2":
        case "CSM_SECTION3":
        case "DEBUG_SPHERE":
        case "DEBUG_SPHERE_DYNAMIC":
        case "DEPTH_RGBA":
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
        case "NUM_NORMALMAPS":
        case "PARALLAX":
        case "PARALLAX_STEPS":
        case "PROCEDURAL_FOG":
        case "REFLECTION":
        case "REFLECTION_PASS":
        case "REFLECTIVE":
        case "REFRACTIVE":
        case "SHORE_SMOOTHING":
        case "SKINNED":
        case "SKY_TEXTURE":
        case "SSAO_HEMISPHERE":
        case "SSAO_BLUR_DEPTH":
        case "SSAO_ONLY":
        case "SSAO_WHITE":
        case "STATIC_BATCH":
        case "TEXTURE_COLOR":
        case "TEXTURE_MIRROR":
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
        case "WIREFRAME_QUALITY":
        case "SIZE_RAMP_LENGTH":
        case "COLOR_RAMP_LENGTH":
        case "PARTICLES_SHADELESS":
        case "SMAA_JITTER":
            val = 0;
            break;

        // default 1
        case "ALPHA_AS_SPEC":
        case "BEND_CENTER_ONLY":
        case "CSM_BLEND_BETWEEEN_CASCADES":
        case "CSM_FADE_LAST_CASCADE":
        case "DEPTH_RGBA":
        case "BILLBOARD_SPHERICAL":
        case "NUM_LIGHTS":
        case "NUM_LAMP_LIGHTS":
        case "MAX_STEPS":
            val = 1;
            break;

        // default > 1
        // ...

        // float
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
        case "SHADOW_SRC":
            val = "SHADOW_SRC_NONE";
            break;
        case "SHADOW_DST":
            val = "SHADOW_DST_NONE";
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
            val = config.defaults.precision;
            break;
        case "EPSILON":
            if (config.defaults.precision == "highp")
                val = 0.000001;
            else
                val = 0.0001;
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
function get_compiled_shader(shaders_info, node_elements) {

    var shader_id = JSON.stringify(shaders_info) + JSON.stringify(node_elements);

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

    // prepend by define directives

    var directives = shaders_info.directives || [];
    var vshader_text = preprocess_shader("vert", vshader_ast, directives, node_elements);
    var fshader_text = preprocess_shader("frag", fshader_ast, directives, node_elements);

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

    if (shader_texts) {
        var ast = shader_texts[filename];
        if (!ast)
            return null;
    } else {
        var main_text = assets.get_text_sync(dir + filename, false);
        if (!main_text)
            return null;
        var ast = gpp_parser.parser.parse(main_text);
    }

    _shader_ast_cache[cache_id] = ast;

    return ast;
}

function preprocess_shader(type, ast, dirs_arr, node_elements) {
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

    // entry element
    process_group(ast);

    var text = lines.join("\n");
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
                try {
                    var result = expression_result(expression)
                } catch (e) {
                    // TODO: need better error explanation
                    throw "Failed to process #" + pelem.type + " expression: "
                        + expression.join(" ");
                }

                if (result) {
                    process_group(pelem.group);
                    return;
                }
                break;
            case "else":
                process_group(pelem.group);
                break;
            case "ifdef":
                if (pelem.name in dirs)
                    process_group(pelem.group);
                break
            case "ifndef":
                if (!(pelem.name in dirs))
                    process_group(pelem.group);
                break
            }
        }
    }

    // throws SyntaxError if not parsed
    function expression_result(expression) {
        var expr_str = expand_macro(expression, dirs, fdirs, true);
        return gpp_eval.parser.parse(expr_str);
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
        lines.push("#extension " + expand_macro(tokens, dirs, fdirs, false));
    }


    function process_node(elem) {
        var name = elem.name;
        var group_parts = elem.group.parts;
        shader_nodes[name] = group_parts;
    }

    function process_nodes_global(node_elements) {
        for (var i = 0; i < node_elements.length; i++) {
            var nelem = node_elements[i];

            var node_parts = shader_nodes[nelem.id];
            // ignore node not found in shader
            if (!node_parts)
                continue;

            var param_index = 0;

            for (var j = 0; j < node_parts.length; j++) {
                var part = node_parts[j];
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

    function process_nodes_main(node_elements) {
        var replaces = {};

        for (var i = 0; i < node_elements.length; i++) {
            var nelem = node_elements[i];

            var node_parts = shader_nodes[nelem.id];
            // ignore node not found in shader
            if (!node_parts)
                continue;

            var input_index = 0;
            var output_index = 0;
            var param_index = 0;

            replaces[i] = {};
            for (var j = 0; j < node_parts.length; j++) {
                var part = node_parts[j];

                switch (part.type) {
                case "node_in":
                    var new_name = nelem.inputs[input_index];

                    if (nelem.input_values[input_index] !== null) {
                        var main_var_line = part.qualifier.join(" ") + " ";
                        main_var_line += new_name;
                        main_var_line += " = " + nelem.input_values[input_index];

                        main_var_line += ";";
                        lines.push(main_var_line);
                    }

                    replaces[i][part.name] = new_name;

                    input_index++;
                    break;
                case "node_out":
                    var new_name = nelem.outputs[output_index];

                    var main_var_line = part.qualifier.join(" ") + " ";
                    main_var_line += new_name;
                    main_var_line += ";";
                    lines.push(main_var_line);

                    replaces[i][part.name] = new_name;

                    output_index++;
                    break;
                case "node_param":

                    if (type == "vert")
                        var new_name = nelem.vparams[param_index];
                    else if (type == "frag")
                        var new_name = nelem.params[param_index];

                    replaces[i][part.name] = new_name;

                    param_index++;
                    break;
                }
            }
        }

        for (var i = 0; i < node_elements.length; i++) {
            var nelem = node_elements[i];

            var node_parts = shader_nodes[nelem.id];
            // ignore node not found in shader
            if (!node_parts)
                continue;

            for (var j = 0; j < node_parts.length; j++) {
                var part = node_parts[j];

                if (part.type == "textline") {
                    var new_part = {
                        type: "textline",
                        tokens: []
                    }

                    for (var k = 0; k < part.tokens.length; k++) {
                        var tok = part.tokens[k];

                        if (tok in replaces[i])
                            new_part.tokens.push(replaces[i][tok]);
                        else
                            new_part.tokens.push(tok);
                    }

                    process_textline(new_part);
                }
            }

        }
    }

    function process_textline(elem) {
        var tokens = elem.tokens;
        lines.push(expand_macro(tokens, dirs, fdirs, false));
    }
}

/**
 * Analyze tokens and dirs and compose string
 * @param empty_as_zero treat empty directive as zero or just ignore
 * (#define ABC ... #if ABC => #if 0) vs (#define ABC ... #if ABC => #if ABC)
 */
function expand_macro(tokens, dirs, fdirs, empty_as_zero) {
    var result = [];
    expand_macro_iter(tokens, dirs, fdirs, empty_as_zero, result);
    return result.join(" ");
}


function expand_macro_iter(tokens, dirs, fdirs, empty_as_zero, result) {
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        if (token in dirs) {
            // TODO
            //if (token in fdirs) {
            //}

            var new_tokens = dirs[token];
            if (new_tokens.length == 0 && empty_as_zero)
                result.push(0);
            else
                expand_macro_iter(new_tokens, dirs, fdirs, empty_as_zero, result);
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
        m_print.error("B4W Error - shader program is not valid", shader_id);

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

    var hc = util.hash_code_string(shader_text, 0);
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

}
