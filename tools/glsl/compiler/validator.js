/**
 * Checks and validates ast data. Generates info for complex multifile checking.
 * @alias validator
 */

var m_collect  = require("./ast_data_collector.js");
var m_consts   = require("./consts.js");
var m_debug    = require("./debug.js");
var m_reserved = require("./reserved_tokens.js");

var _src_filename = "";

var _dead_functions = {
    dead: {
        main_shaders: {},
        includes: {}
    },
    alive: {
        main_shaders: {},
        includes: {}
    }
};

var _dead_variables = {
    dead: {
        main_shaders: {},
        includes: {}
    },
    alive: {
        main_shaders: {},
        includes: {}
    }
};

var _import_export_info = {};

exports.validate = function(ast_input, vardef_ids, filename, filetype) {
    _src_filename = filename;
    
    m_collect.init_ast(ast_input, vardef_ids, filename, filetype);
    m_collect.collect();

    collect_dead_func_info();
    collect_dead_vars_info();
    collect_import_export_data(ast_input.import_export);
    check_extensions();
}

/*==============================================================================
                            ONE-FILE ACTIONS
==============================================================================*/

/**
 * Check dead functions in a current file
 */
function collect_dead_func_info() {
    var declarations = get_func_declarations();
    var result = get_dead_alive_info(declarations);

    // remove previous dead functions if they are alive in current 'result'
    for (var incl_name in result.alive.includes)
        if (incl_name in _dead_functions.dead.includes)
            for (var i = 0; i < result.alive.includes[incl_name].length; i++) {
                var func_name = result.alive.includes[incl_name][i];
                var dead_funcs = _dead_functions.dead.includes[incl_name];
                var index = dead_funcs.indexOf(func_name);
                if (index != -1)
                    dead_funcs.splice(index, 1);
            }

    // remove current 'result' dead functions if they are already alive
    for (var incl_name in result.dead.includes)
        if (incl_name in _dead_functions.alive.includes)
            for (var i = result.dead.includes[incl_name].length - 1; i >= 0 ; i--) {
                var func_name = result.dead.includes[incl_name][i];
                var alive_funcs = _dead_functions.alive.includes[incl_name];
                var index = alive_funcs.indexOf(func_name);
                if (index != -1)
                    result.dead.includes[incl_name].splice(i, 1);
            }

    // merge dead and alive functions
    for (var status in result)
        for (var file_type in result[status])
            for (var file_name in result[status][file_type]) {
                var decls = result[status][file_type][file_name];
                var filenames = _dead_functions[status][file_type];

                if (!(file_name in filenames))
                    filenames[file_name] = [];
                for (var i = 0; i < decls.length; i++) {
                    if (filenames[file_name].indexOf(decls[i]) == -1)
                        filenames[file_name].push(decls[i]);
                }
            }
}

function get_func_declarations() {
    /*
    Format of the 'declarations' object:
    declarations {
        DECLARATION_NAME: {
            FILE_NAME: {
                is_include: Boolean,
                func_usages: [FUNC_NAME, ...]
            },
            ...
        },
        ...
    }
    */
    var declarations = {};
    var tmp_func_body_calls = [];

    var cb = function(main_sequence, index, seq_node, scopes_chain, 
            filenames_stack) {
        switch (seq_node.type) {
        case "declaration":
            if (seq_node.decl_type == m_consts.DEFINE_FUNC 
                    || seq_node.decl_type == m_consts.DECL_FUNC) {
                var decl_name = seq_node.decl_id.name;
                if (!(decl_name in declarations))
                    declarations[decl_name] = {};

                var file_name = filenames_stack[filenames_stack.length - 1];
                if (!(file_name in declarations[decl_name]))
                    declarations[decl_name][file_name] = {
                        is_include: file_name != _src_filename,
                        func_usages: []
                    };

                for (var j = 0; j < tmp_func_body_calls.length; j++) {
                    var func_usages = declarations[decl_name][file_name].func_usages;
                    if (func_usages.indexOf(tmp_func_body_calls[j]) == -1)
                        func_usages.push(tmp_func_body_calls[j]);
                }
                tmp_func_body_calls = [];
            }
            break;
        case "id_usage":
            if (seq_node.id_usage_type == m_consts.US_FUNC_CALL)
                tmp_func_body_calls.push(seq_node.id_usage_id.name);
            break;
        }
    }
    m_collect.traverse_collected_data(cb);
    return declarations;
}

function get_dead_alive_info(declarations) {
    var result = {
        dead: {
            main_shaders: {},
            includes: {}
        },
        alive: {
            main_shaders: {},
            includes: {}
        }
    };

    var level_func_curr = ["main"];
    var level_func_next = [];
    do {
        for (var i = 0; i < level_func_curr.length; i++) {
            for (var file_name in declarations[level_func_curr[i]]) {
                var f_us = declarations[level_func_curr[i]][file_name].func_usages;
                level_func_next.push.apply(level_func_next, f_us);
            }
            delete declarations[level_func_curr[i]];
        }

        level_func_curr = level_func_next;
        level_func_next = [];

        for (var i = 0; i < level_func_curr.length; i++)
            fill_dead_func_result(result, declarations[level_func_curr[i]],
                    level_func_curr[i], "alive");

    } while (level_func_curr.length > 0);
    for (var func_name in declarations)
        fill_dead_func_result(result, declarations[func_name], func_name,
                "dead");

    return result;
}

function fill_dead_func_result(result, decl_data, decl_name, status) {
    for (var file_name in decl_data)
        if (decl_data[file_name].is_include) {
            if (!(file_name in result[status].includes))
                result[status].includes[file_name] = []
            result[status].includes[file_name].push(decl_name);
        } else {
            if (!(file_name in result[status].main_shaders))
                result[status].main_shaders[file_name] = []
            result[status].main_shaders[file_name].push(decl_name);
        }
}

/**
 * Check dead variables in current file
 */
function collect_dead_vars_info() {
    var var_declarations = get_var_declarations();

    // NOTE: replace scope ids by include scope ids for further merging
    for (var status in var_declarations) {
        for (var decl_name in var_declarations[status]) {
            var new_data = {}
            for (var scope_id in var_declarations[status][decl_name]) {
                var data = var_declarations[status][decl_name][scope_id];

                if (data.file_type == m_consts.INCLUDE_FILE) {
                    var incl_scope_id = data.incl_scope_id;
                    new_data["incl_" + incl_scope_id] = data;
                } else
                    new_data[scope_id] = data;
            }
            var_declarations[status][decl_name] = new_data;
        }
    }

    // remove previous dead variables if they are alive in current 'var_declarations'
    for (var decl_name in var_declarations.alive)
        for (var scope_id in var_declarations.alive[decl_name]) {
            var data = var_declarations.alive[decl_name][scope_id];

            if (data.file_type == m_consts.INCLUDE_FILE) {
                var incl = _dead_variables.dead.includes;
                if (data.file_name in incl)
                    if (decl_name in incl[data.file_name])
                        if (scope_id in incl[data.file_name][decl_name])
                            delete _dead_variables.dead.includes[data.file_name][decl_name][scope_id];
            }
        }

    // remove current 'result' dead functions if they are already alive
    for (var decl_name in var_declarations.dead)
        for (var scope_id in var_declarations.dead[decl_name]) {
            var data = var_declarations.dead[decl_name][scope_id];

            if (data.file_type == m_consts.INCLUDE_FILE) {
                var incl = _dead_variables.alive.includes;
                if (data.file_name in incl)
                    if (decl_name in incl[data.file_name])
                        if (scope_id in incl[data.file_name][decl_name])
                            delete var_declarations.dead[decl_name][scope_id];
            }
        }

    // merge dead and alive variables
    for (var status in var_declarations) {
        for (var decl_name in var_declarations[status]) {
            for (var scope_id in var_declarations[status][decl_name]) {
                var data = var_declarations[status][decl_name][scope_id];
                var file_type = (data.file_type == m_consts.INCLUDE_FILE)
                        ? "includes" : "main_shaders";

                var files = _dead_variables[status][file_type];

                if (!(data.file_name in files))
                    files[data.file_name] = {};
                if (!(decl_name in files[data.file_name]))
                    files[data.file_name][decl_name] = {};
                if (!(scope_id in files[data.file_name][decl_name]))
                    files[data.file_name][decl_name][scope_id]
                            = var_declarations[status][decl_name][scope_id];
            }
        }
    }
}

function get_var_declarations() {
    /*
    Format of 'var_declarations' object:
    var_declarations = {
        dead: {
            DECLARATION_NAME {
                SCOPE_ID: DECLARATION_DATA,
                ...
            },
            ...
        }
        alive: {
            DECLARATION_NAME {
                SCOPE_ID: DECLARATION_DATA,
                ...
            },
            ...
        }
    }
    */
    var var_declarations = {
        dead: {},
        alive: {}
    }

    var checked_decl_types = [m_consts.DECL_VAR, m_consts.DECL_PARM_VAR, m_consts.DECL_STRUCT_TYPE]
    var checked_usage_types = [m_consts.US_VAR, m_consts.US_STRUCT_TYPE]

    // include scopes manager
    var ism = {
        counters: [0],
        ids: []
    }

    var cb = function(main_sequence, index, seq_node, scopes_chain, 
            filenames_stack) {
        var file_type = (filenames_stack.length == 1) ? m_consts.MAIN_SHADER_FILE 
                : m_consts.INCLUDE_FILE;

        switch (seq_node.type) {
        case "include":
            if (seq_node.include_status == m_consts.INCLUDE_START) {
                ism.counters.push(0);
                ism.ids.push([0]);
            } else {
                ism.counters.pop();
                ism.ids.pop();
            }
            break;

        case "scope":
            // NOTE: include scope ids for identifying same/different variables
            if (file_type == m_consts.INCLUDE_FILE) {
                if (seq_node.scope_status == m_consts.SCOPE_START) {
                    var next_id = ++ism.counters[ism.counters.length - 1];
                    ism.ids[ism.ids.length - 1].push(next_id);
                } else
                    ism.ids[ism.ids.length - 1].pop();
            }
            break;

        case "declaration":
            if (checked_decl_types.indexOf(seq_node.decl_type) != -1) {
                var decl_name = seq_node.decl_id.name;

                // NOTE: there can not be declarations using reserved tokens, so
                // this check would be useless, but we have GLSL_OUT_FRAG_COLOR 
                // as an exception 
                if (!m_reserved.is_reserved(decl_name)) {
                    if (!(decl_name in var_declarations.dead))
                        var_declarations.dead[decl_name] = {}

                    var decl = {
                        decl: seq_node,
                        file_type: file_type,
                        file_name: filenames_stack[filenames_stack.length - 1]
                    };

                    var curr_include_ids = ism.ids[ism.ids.length - 1];
                    decl.incl_scope_id = (file_type == m_consts.INCLUDE_FILE)
                            ? curr_include_ids[curr_include_ids.length - 1] : null;
                    var_declarations.dead[decl_name][seq_node.decl_in_scope] = decl;

                    // NOTE: for preprocessing redeclaration delete 'alive' var and
                    // treat variable as new one
                    if (decl_name in var_declarations.alive)
                        if (seq_node.decl_in_scope in var_declarations.alive[decl_name])
                            delete var_declarations.alive[decl_name][seq_node.decl_in_scope];
                }
            }
            break;

        case "id_usage":
            if (checked_usage_types.indexOf(seq_node.id_usage_type) != -1) {
                var name = seq_node.id_usage_id.name;
                if (!m_reserved.is_reserved(name) && name in var_declarations.dead)
                    for (var j = scopes_chain.length - 1; j >= 0; j--) {
                        var scope_id = scopes_chain[j];
                        if (scope_id in var_declarations.dead[name]) {
                            if (!(name in var_declarations.alive))
                                var_declarations.alive[name] = {}
                            var_declarations.alive[name][scope_id]
                                    = var_declarations.dead[name][scope_id];
                            delete var_declarations.dead[name][scope_id];
                            break;
                        }
                    }
            }
            break;
        }
    }
    m_collect.traverse_collected_data(cb);

    return var_declarations;
}

/**
 * Check import/export tokens in current file. Also spawns some error messages.
 */
function collect_import_export_data(import_export_tokens) {
    var import_export_tokens = fill_import_export_usage(import_export_tokens);

    for (var incl_name in import_export_tokens)
        if (!(incl_name in _import_export_info))
            _import_export_info[incl_name] = import_export_tokens[incl_name];
}

function fill_import_export_usage(import_export_tokens) {
    var cb = function(main_sequence, index, seq_node, scopes_chain, 
            filenames_stack) {

        switch (seq_node.type) {
        case "declaration":
            // set usage flag for export tokens
            if (filenames_stack.length > 1) {
                var curr_include_name = filenames_stack[filenames_stack.length - 1];
                if (curr_include_name in import_export_tokens)
                    if (seq_node.decl_id.name in import_export_tokens[curr_include_name]["export"])
                        import_export_tokens[curr_include_name]["export"][seq_node.decl_id.name] = 1;
            }
            break;

        case "id_usage":
            // set usage flag for import tokens            
            if (!seq_node.id_usage_is_reserved) {
                var decl = m_collect.search_declaration(seq_node.id_usage_ast_uid,
                        seq_node.id_usage_id.name, seq_node.id_usage_type);

                var curr_filename = filenames_stack[filenames_stack.length - 1];
                if (filenames_stack.length > 1)
                    var curr_include_name = filenames_stack[filenames_stack.length - 1];
                else
                    var curr_include_name = null;

                if (curr_include_name) {
                    if (decl === null || decl.decl_in_include != curr_include_name)
                        if (curr_include_name in import_export_tokens)
                            if (seq_node.id_usage_id.name in import_export_tokens[curr_include_name]["import"])
                                import_export_tokens[curr_include_name]["import"][seq_node.id_usage_id.name] = 1;
                            else if (seq_node.id_usage_type != m_consts.US_FIELD)
                                m_debug.debug_message(m_consts.POSSIBLE_IMPORT, 
                                        curr_include_name, 
                                        seq_node.id_usage_id.name, 
                                        seq_node.id_usage_type);
                }

                if (decl) {
                    // check include export violations
                    if (seq_node.id_usage_type != m_consts.US_FIELD) {
                        var incl_name = decl.decl_in_include;
                        if (incl_name !== null && incl_name != curr_include_name) {
                            if (incl_name in import_export_tokens)
                                if (!(seq_node.id_usage_id.name in import_export_tokens[incl_name]["export"]))
                                    m_debug.debug_message(m_consts.EXP_DATA_VIOLATION,
                                            curr_filename, 
                                            seq_node.id_usage_id.name, 
                                            seq_node.id_usage_type,
                                            incl_name);
                        }
                    }
                } else if (!(seq_node.id_usage_type == m_consts.US_FIELD
                        && seq_node.id_usage_id.name.replace(/[rgbaxyzwstpq]/g, "").length == 0)) {

                    // check include import violations
                    var import_violation = false;
                    if (curr_include_name && curr_include_name in import_export_tokens)
                        if (seq_node.id_usage_id.name in import_export_tokens[curr_include_name]["import"])
                            import_violation = true;

                    if (import_violation)
                        m_debug.debug_message(m_consts.IMP_DATA_VIOLATION, 
                                curr_filename, seq_node.id_usage_id.name,
                                seq_node.id_usage_type);
                    else
                        m_debug.debug_message(m_consts.UNDECLARED_ID, 
                                curr_filename, seq_node.id_usage_id.name,     
                                seq_node.id_usage_type);
                }
            }
            break;
        }
    }
    m_collect.traverse_collected_data(cb);

    return import_export_tokens;
}

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

/*==============================================================================
                            COMMON CHECKINGS
==============================================================================*/

/**
 * Check import/export tokens.
 * Intended to use after all shaders would be processed.
 */
exports.check_import_export_tokens = function() {
    for (var incl_name in _import_export_info)
        for (token_type in _import_export_info[incl_name])
            for (var token_name in _import_export_info[incl_name][token_type])
                if (_import_export_info[incl_name][token_type][token_name] == 0) {
                    var message = "Unused " + token_type + " token '"
                            + token_name + "' in include file '" + incl_name + "'.";
                    if (token_type == "export")
                        m_debug.fail("Error! " + message);
                    else
                        console.warn("Warning! " + message);
                }
}

/**
 * Check dead functions.
 * Intended to use after all shaders would be processed.
 */
exports.check_dead_functions = function() {
    for (var file_type in _dead_functions.dead)
        for (var file_name in _dead_functions.dead[file_type]) {
            var func_decls = _dead_functions.dead[file_type][file_name];
            for (var i = 0; i < func_decls.length; i++) {
                var message = "Warning! Function '" + func_decls[i] + "' is declared in ";
                message += (file_type == "includes") ? "include file '" : "file '";
                message += file_name + "', but never used.";
                console.warn(message);
            }
        }
}

/**
 * Check dead variables.
 * Intended to use after all shaders would be processed.
 */
exports.check_dead_variables = function() {
    for (var file_type in _dead_variables.dead)
        for (var file_name in _dead_variables.dead[file_type])
            for (var var_name in _dead_variables.dead[file_type][file_name])
                for (var scope_id in _dead_variables.dead[file_type][file_name][var_name]) {
                    var message = "Warning! Variable '" + var_name + "' is declared in ";
                    message += (file_type == "includes") ? "include file '" : "file '";
                    message += file_name + "', but never used.";
                    console.warn(message);
                }
}
