/**
 * Checks and validates ast data. Generates info for complex multifile checking.
 * @alias validator
 */

var m_collect  = require("./ast_data_collector.js");
var m_consts   = require("./consts.js");
var m_debug    = require("./debug.js");
var m_reserved = require("./reserved_tokens.js");

// var _src_filename = "";

// var _dead_functions = {
//     dead: {
//         main_shaders: {},
//         includes: {}
//     },
//     alive: {
//         main_shaders: {},
//         includes: {}
//     }
// };

// var _dead_variables = {
//     dead: {
//         main_shaders: {},
//         includes: {}
//     },
//     alive: {
//         main_shaders: {},
//         includes: {}
//     }
// };

exports.validate = function(ast_data, vardef_ids, filename, filetype) {
    // _src_filename = filename;
    
    m_collect.init_ast(ast_data, vardef_ids, filename, filetype);
    m_collect.collect();

    // collect_dead_func_info();
    // collect_dead_vars_info();
    check_extensions();
}

/*==============================================================================
                            ONE-FILE ACTIONS
==============================================================================*/

/**
 * Check dead functions in a current file
 */
// function collect_dead_func_info() {
//     var declarations = get_func_declarations();
//     var result = get_dead_alive_info(declarations);

//     // remove previous dead functions if they are alive in current 'result'
//     for (var incl_name in result.alive.includes)
//         if (incl_name in _dead_functions.dead.includes)
//             for (var i = 0; i < result.alive.includes[incl_name].length; i++) {
//                 var func_name = result.alive.includes[incl_name][i];
//                 var dead_funcs = _dead_functions.dead.includes[incl_name];
//                 var index = dead_funcs.indexOf(func_name);
//                 if (index != -1)
//                     dead_funcs.splice(index, 1);
//             }

//     // remove current 'result' dead functions if they are already alive
//     for (var incl_name in result.dead.includes)
//         if (incl_name in _dead_functions.alive.includes)
//             for (var i = result.dead.includes[incl_name].length - 1; i >= 0 ; i--) {
//                 var func_name = result.dead.includes[incl_name][i];
//                 var alive_funcs = _dead_functions.alive.includes[incl_name];
//                 var index = alive_funcs.indexOf(func_name);
//                 if (index != -1)
//                     result.dead.includes[incl_name].splice(i, 1);
//             }

//     // merge dead and alive functions
//     for (var status in result)
//         for (var file_type in result[status])
//             for (var file_name in result[status][file_type]) {
//                 var decls = result[status][file_type][file_name];
//                 var filenames = _dead_functions[status][file_type];

//                 if (!(file_name in filenames))
//                     filenames[file_name] = [];
//                 for (var i = 0; i < decls.length; i++) {
//                     if (filenames[file_name].indexOf(decls[i]) == -1)
//                         filenames[file_name].push(decls[i]);
//                 }
//             }
// }

// function get_func_declarations() {
//     /*
//     Format of the 'declarations' object:
//     declarations {
//         DECLARATION_NAME: {
//             FILE_NAME: {
//                 is_include: Boolean,
//                 func_usages: [FUNC_NAME, ...]
//             },
//             ...
//         },
//         ...
//     }
//     */
//     var declarations = {};
//     var tmp_func_body_calls = [];

//     var cb = function(main_sequence, index, seq_node, scopes_chain, 
//             filenames_stack) {
//         switch (seq_node.type) {
//         case "declaration":
//             if (seq_node.decl_type == m_consts.DEFINE_FUNC 
//                     || seq_node.decl_type == m_consts.DECL_FUNC) {
//                 var decl_name = seq_node.decl_id.name;
//                 if (!(decl_name in declarations))
//                     declarations[decl_name] = {};

//                 var file_name = filenames_stack[filenames_stack.length - 1];
//                 if (!(file_name in declarations[decl_name]))
//                     declarations[decl_name][file_name] = {
//                         is_include: file_name != _src_filename,
//                         func_usages: []
//                     };

//                 for (var j = 0; j < tmp_func_body_calls.length; j++) {
//                     var func_usages = declarations[decl_name][file_name].func_usages;
//                     if (func_usages.indexOf(tmp_func_body_calls[j]) == -1)
//                         func_usages.push(tmp_func_body_calls[j]);
//                 }
//                 tmp_func_body_calls = [];
//             }
//             break;
//         case "id_usage":
//             if (seq_node.id_usage_type == m_consts.US_FUNC_CALL)
//                 tmp_func_body_calls.push(seq_node.id_usage_id.name);
//             break;
//         }
//     }
//     m_collect.traverse_collected_data(cb);
//     return declarations;
// }

// function get_dead_alive_info(declarations) {
//     var result = {
//         dead: {
//             main_shaders: {},
//             includes: {}
//         },
//         alive: {
//             main_shaders: {},
//             includes: {}
//         }
//     };

//     var level_func_curr = ["main"];
//     var level_func_next = [];
//     do {
//         for (var i = 0; i < level_func_curr.length; i++) {
//             for (var file_name in declarations[level_func_curr[i]]) {
//                 var f_us = declarations[level_func_curr[i]][file_name].func_usages;
//                 level_func_next.push.apply(level_func_next, f_us);
//             }
//             delete declarations[level_func_curr[i]];
//         }

//         level_func_curr = level_func_next;
//         level_func_next = [];

//         for (var i = 0; i < level_func_curr.length; i++)
//             fill_dead_func_result(result, declarations[level_func_curr[i]],
//                     level_func_curr[i], "alive");

//     } while (level_func_curr.length > 0);
//     for (var func_name in declarations)
//         fill_dead_func_result(result, declarations[func_name], func_name,
//                 "dead");

//     return result;
// }

// function fill_dead_func_result(result, decl_data, decl_name, status) {
//     for (var file_name in decl_data)
//         if (decl_data[file_name].is_include) {
//             if (!(file_name in result[status].includes))
//                 result[status].includes[file_name] = []
//             result[status].includes[file_name].push(decl_name);
//         } else {
//             if (!(file_name in result[status].main_shaders))
//                 result[status].main_shaders[file_name] = []
//             result[status].main_shaders[file_name].push(decl_name);
//         }
// }

/**
 * Check dead variables in current file
 */
// function collect_dead_vars_info() {
//     var var_declarations = get_var_declarations();

//     // NOTE: replace scope ids by include scope ids for further merging
//     for (var status in var_declarations) {
//         for (var decl_name in var_declarations[status]) {
//             var new_data = {}
//             for (var scope_id in var_declarations[status][decl_name]) {
//                 var data = var_declarations[status][decl_name][scope_id];

//                 if (data.file_type == m_consts.INCLUDE_FILE) {
//                     var incl_scope_id = data.incl_scope_id;
//                     new_data["incl_" + incl_scope_id] = data;
//                 } else
//                     new_data[scope_id] = data;
//             }
//             var_declarations[status][decl_name] = new_data;
//         }
//     }

//     // remove previous dead variables if they are alive in current 'var_declarations'
//     for (var decl_name in var_declarations.alive)
//         for (var scope_id in var_declarations.alive[decl_name]) {
//             var data = var_declarations.alive[decl_name][scope_id];

//             if (data.file_type == m_consts.INCLUDE_FILE) {
//                 var incl = _dead_variables.dead.includes;
//                 if (data.file_name in incl)
//                     if (decl_name in incl[data.file_name])
//                         if (scope_id in incl[data.file_name][decl_name])
//                             delete _dead_variables.dead.includes[data.file_name][decl_name][scope_id];
//             }
//         }

//     // remove current 'result' dead functions if they are already alive
//     for (var decl_name in var_declarations.dead)
//         for (var scope_id in var_declarations.dead[decl_name]) {
//             var data = var_declarations.dead[decl_name][scope_id];

//             if (data.file_type == m_consts.INCLUDE_FILE) {
//                 var incl = _dead_variables.alive.includes;
//                 if (data.file_name in incl)
//                     if (decl_name in incl[data.file_name])
//                         if (scope_id in incl[data.file_name][decl_name])
//                             delete var_declarations.dead[decl_name][scope_id];
//             }
//         }

//     // merge dead and alive variables
//     for (var status in var_declarations) {
//         for (var decl_name in var_declarations[status]) {
//             for (var scope_id in var_declarations[status][decl_name]) {
//                 var data = var_declarations[status][decl_name][scope_id];
//                 var file_type = (data.file_type == m_consts.INCLUDE_FILE)
//                         ? "includes" : "main_shaders";

//                 var files = _dead_variables[status][file_type];

//                 if (!(data.file_name in files))
//                     files[data.file_name] = {};
//                 if (!(decl_name in files[data.file_name]))
//                     files[data.file_name][decl_name] = {};
//                 if (!(scope_id in files[data.file_name][decl_name]))
//                     files[data.file_name][decl_name][scope_id]
//                             = var_declarations[status][decl_name][scope_id];
//             }
//         }
//     }
// }

// function get_var_declarations() {
//     /*
//     Format of 'var_declarations' object:
//     var_declarations = {
//         dead: {
//             DECLARATION_NAME {
//                 SCOPE_ID: DECLARATION_DATA,
//                 ...
//             },
//             ...
//         }
//         alive: {
//             DECLARATION_NAME {
//                 SCOPE_ID: DECLARATION_DATA,
//                 ...
//             },
//             ...
//         }
//     }
//     */
//     var var_declarations = {
//         dead: {},
//         alive: {}
//     }

//     var checked_decl_types = [m_consts.DECL_VAR, m_consts.DECL_PARM_VAR, m_consts.DECL_STRUCT_TYPE]
//     var checked_usage_types = [m_consts.US_VAR, m_consts.US_STRUCT_TYPE]

//     // include scopes manager
//     var ism = {
//         counters: [0],
//         ids: []
//     }

//     var cb = function(main_sequence, index, seq_node, scopes_chain, 
//             filenames_stack) {
//         var file_type = (filenames_stack.length == 1) ? m_consts.MAIN_SHADER_FILE 
//                 : m_consts.INCLUDE_FILE;

//         switch (seq_node.type) {
//         case "include":
//             if (seq_node.include_status == m_consts.INCLUDE_START) {
//                 ism.counters.push(0);
//                 ism.ids.push([0]);
//             } else {
//                 ism.counters.pop();
//                 ism.ids.pop();
//             }
//             break;

//         case "scope":
//             // NOTE: include scope ids for identifying same/different variables
//             if (file_type == m_consts.INCLUDE_FILE) {
//                 if (seq_node.scope_status == m_consts.SCOPE_START) {
//                     var next_id = ++ism.counters[ism.counters.length - 1];
//                     ism.ids[ism.ids.length - 1].push(next_id);
//                 } else
//                     ism.ids[ism.ids.length - 1].pop();
//             }
//             break;

//         case "declaration":
//             if (checked_decl_types.indexOf(seq_node.decl_type) != -1) {
//                 var decl_name = seq_node.decl_id.name;

//                 // NOTE: there can not be declarations using reserved tokens, so
//                 // this check would be useless, but we have GLSL_OUT_FRAG_COLOR 
//                 // as an exception 
//                 if (!m_reserved.is_reserved(decl_name)) {
//                     if (!(decl_name in var_declarations.dead))
//                         var_declarations.dead[decl_name] = {}

//                     var decl = {
//                         decl: seq_node,
//                         file_type: file_type,
//                         file_name: filenames_stack[filenames_stack.length - 1]
//                     };

//                     var curr_include_ids = ism.ids[ism.ids.length - 1];
//                     decl.incl_scope_id = (file_type == m_consts.INCLUDE_FILE)
//                             ? curr_include_ids[curr_include_ids.length - 1] : null;
//                     var_declarations.dead[decl_name][seq_node.decl_in_scope] = decl;

//                     // NOTE: for preprocessing redeclaration delete 'alive' var and
//                     // treat variable as new one
//                     if (decl_name in var_declarations.alive)
//                         if (seq_node.decl_in_scope in var_declarations.alive[decl_name])
//                             delete var_declarations.alive[decl_name][seq_node.decl_in_scope];
//                 }
//             }
//             break;

//         case "id_usage":
//             if (checked_usage_types.indexOf(seq_node.id_usage_type) != -1) {
//                 var name = seq_node.id_usage_id.name;
//                 if (!m_reserved.is_reserved(name) && name in var_declarations.dead)
//                     for (var j = scopes_chain.length - 1; j >= 0; j--) {
//                         var scope_id = scopes_chain[j];
//                         if (scope_id in var_declarations.dead[name]) {
//                             if (!(name in var_declarations.alive))
//                                 var_declarations.alive[name] = {}
//                             var_declarations.alive[name][scope_id]
//                                     = var_declarations.dead[name][scope_id];
//                             delete var_declarations.dead[name][scope_id];
//                             break;
//                         }
//                     }
//             }
//             break;
//         }
//     }
//     m_collect.traverse_collected_data(cb);

//     return var_declarations;
// }

function check_extensions() {
    var cb = function(main_sequence, index, seq_node, scopes_chain, 
            filenames_stack) {
        if (seq_node.type == "extension") {
            var curr_filename = filenames_stack[filenames_stack.length - 1];
            if (seq_node.name == "all" && (seq_node.behavior == "require" 
                    || seq_node.behavior == "enable"))
                m_debug.debug_message(m_consts.EXT_ALL_WRONG_BEHAVIOR, 
                        curr_filename, seq_node.behavior);
            else if (!m_reserved.extension_is_supported(seq_node.name))
                m_debug.debug_message(m_consts.UNSUPPORTED_EXTENSION, 
                        curr_filename, seq_node.name);
        }
    }
    m_collect.traverse_collected_data(cb);
}

exports.check_version = function(shader_text, file_name) {
    if (!shader_text.match(/^#version GLSL_VERSION/))
        m_debug.debug_message(m_consts.VERSION_REQUIRED, file_name);
}

exports.check_used_includes = function(files) {
    var files_dict = {};
    var used_includes = {};
    for (var i = 0; i < files.length; i++) {
        files_dict[files[i].relpath] = files[i];
        if (files[i].is_include)
            used_includes[files[i].relpath] = 0;
    }

    for (var path in files_dict) 
        if (!files_dict[path].is_include)
            check_file_includes(files_dict, path, used_includes);

    for (var path in used_includes)
        if (used_includes[path] == 0)
            console.warn("Warning! Include file '" + path + "' is not used in any shader.");
}

function check_file_includes(files_dict, path, used_includes) {
    if (!files_dict[path]) {
        m_debug.fail("Error! Missing include file: " + path + ".");
        return;
    }

    var units = files_dict[path].pp_units_simple;
    for (var i = 0; i < units.length; i++) {
        var unit = units[i][0];
        if (unit.node == "include" && unit.type == "include") {
            var incl_path = "include/" + unit.name;
            used_includes[incl_path] = 1;
            check_file_includes(files_dict, incl_path, used_includes);
        }
    }
}

exports.validate_vars = function(files) {
    var pp_dict = {};
    for (var i = 0; i < files.length; i++)
        pp_dict[files[i].relpath] = files[i].pp_units_simple;

    var warnings = {};
    for (var path in pp_dict)
        process_vars_ast(pp_dict, path, warnings);

    for (var warn_id in warnings)
        console.warn(warnings[warn_id]);

    report_excess_vars(files);
}

function process_vars_ast(pp_dict, path, warnings, defines, include_paths) {
    if (!pp_dict[path])
        return;

    defines = defines || {};
    include_paths = include_paths || [];
    
    var all_vars = {};
    var non_node_vars = {};
    var _curr_node = null;

    for (var i = 0; i < pp_dict[path].length; i++) {
        var unit = pp_dict[path][i][0];
        if (unit.node == "include" && unit.type == "include") {
            var incl_path = "include/" + unit.name;
            
            // avoid circular including
            if (include_paths.indexOf(incl_path) == -1) {
                include_paths.push(incl_path);
                process_vars_ast(pp_dict, incl_path, warnings, defines, include_paths);
            }
        } else if (unit.node == "directive") {
            switch(unit.type) {
            case "var":
                if (token_is_special(unit.repl.from))
                    console.warn("Warning! Special token '" + unit.repl.from 
                            + "' is forbidden to use in a #var directive. File: " 
                            + path + ".");
                all_vars[unit.repl.from] = 1;
                non_node_vars[unit.repl.from] = 1;
                break;
            case "define":
                if (token_is_special(unit.repl.from))
                    console.warn("Warning! Special token '" + unit.repl.from 
                            + "' is forbidden to use in a #define directive. File: " 
                            + path + ".");
                defines[unit.repl.from] = 1;
                break;
            case "undef":
                if (token_is_special(unit.identifier))
                    console.warn("Warning! Special token '" + unit.identifier 
                            + "' is forbidden to use in a #undef directive. File: " 
                            + path + ".");
                delete defines[unit.identifier];
                break;
            case "if":
            case "elif":
                var err_tokens = get_err_tokens(unit.contents, defines, all_vars);
                for (var j = 0; j < err_tokens.length; j++) {
                    var warn_id = err_tokens[j] + "%" + path;
                    warnings[warn_id] = "Warning! Undefined directive '" + err_tokens[j] 
                            + "'. Should it be defined with #var/#node_var or #define? File: " 
                            + path + ".";
                }
                break;
            }
        } else if (unit.node == "node_directive") {
            switch (unit.type) {
            case "node":
                _curr_node = unit.name;
                break;
            case "node_var":
                if (token_is_special(unit.repl.from))
                    console.warn("Warning! Special token '" + unit.repl.from 
                            + "' is forbidden to use in a #node_var directive. Node: " 
                            + _curr_node + ". File: " + path + ".");
                all_vars[unit.repl.from] = 1;
                break;
            case "endnode":
                all_vars = JSON.parse(JSON.stringify(non_node_vars));
                _curr_node = null;
                break;
            case "node_condition":
                if (unit.subtype == "node_if" || unit.subtype == "node_elif") {
                    var err_tokens = get_err_tokens(unit.contents, defines, all_vars);
                    for (var j = 0; j < err_tokens.length; j++) {
                        var warn_id = err_tokens[j] + "%" + _curr_node + "%" + path;
                        warnings[warn_id] = "Warning! Undefined directive '" + err_tokens[j] 
                                + "' in node '" + _curr_node 
                                + "'. Should it be defined with #var/#node_var or #define? File: " 
                                + path + ".";
                    }
                }
                break;
            }
        }
    }
}

function get_err_tokens(str, defines, vars) {
    var err_tokens = [];
    
    var tokens = parse_tokens(str);
    for (var i = 0; i < tokens.length; i++) {
        var tok = tokens[i];
        if (tok in defines || tok in vars || token_is_special(tok))
            continue;

        if (err_tokens.indexOf(tok) == -1)
            err_tokens.push(tok);
    }

    return err_tokens;
}

function report_excess_vars(files) {
    for (var i = 0; i < files.length; i++) {
        var vars = {};

        for (var j = 0; j < files[i].pp_units_simple.length; j++) {
            var unit = files[i].pp_units_simple[j][0];
            if (unit.type == "var") {
                var token = unit.repl.from;
                var re_repl = new RegExp("# *var +" + token + ".*", "g");
                var re_search = new RegExp(token);
                if (files[i].text_raw.replace(re_repl, "").search(re_search) == -1)
                    console.warn("Warning! Excess #var directive '" + token 
                            + "'. File: " + files[i].relpath + ".");
            }
        }
    }
}

function token_is_special(token) {
    return token == "GLSL1" || token == "GLSL3" || token.indexOf("GLSL_") == 0 
            || token.indexOf("USE_NODE_") == 0 || token.indexOf("USE_OUT_") == 0;
}

function parse_tokens(str) {
    return str.match(/[a-zA-Z_]\w*/g) || [];
}

/*==============================================================================
                            COMMON CHECKINGS
==============================================================================*/

/**
 * Check dead functions.
 * Intended to use after all shaders would be processed.
 */
// exports.check_dead_functions = function() {
//     for (var file_type in _dead_functions.dead)
//         for (var file_name in _dead_functions.dead[file_type]) {
//             var func_decls = _dead_functions.dead[file_type][file_name];
//             for (var i = 0; i < func_decls.length; i++) {
//                 var message = "Warning! Function '" + func_decls[i] + "' is declared in ";
//                 message += (file_type == "includes") ? "include file '" : "file '";
//                 message += file_name + "', but never used.";
//                 console.warn(message);
//             }
//         }
// }

/**
 * Check dead variables.
 * Intended to use after all shaders would be processed.
 */
// exports.check_dead_variables = function() {
//     for (var file_type in _dead_variables.dead)
//         for (var file_name in _dead_variables.dead[file_type])
//             for (var var_name in _dead_variables.dead[file_type][file_name])
//                 for (var scope_id in _dead_variables.dead[file_type][file_name][var_name]) {
//                     var message = "Warning! Variable '" + var_name + "' is declared in ";
//                     message += (file_type == "includes") ? "include file '" : "file '";
//                     message += file_name + "', but never used.";
//                     console.warn(message);
//                 }
// }
