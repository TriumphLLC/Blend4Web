/*==============================================================================
                            AST ARRAYS MERGING
==============================================================================*/
var AST = null, SRC_FILENAME = null, FILE_INCLUDES = [null], IMPORT_EXPORT_DATA = null;
var _node_dirs = null;

// Type qualifiers
var UNIFORM = "uniform";
var ATTRIBUTE = "attribute";
var VARYING = "varying";

// Properties type
var ARRAY_DATA = 0;
var OBJECT_DATA = 1;
var OTHER_DATA = 2;

// Parent searching
var NOT_FOUND = 3;
var THIS_IS_ROOT = 4;

// Scope statuses
var DM_SCOPE_START = 5;
var DM_SCOPE_END = 6;

// Include statuses
var DM_INCLUDE_START = 7;
var DM_INCLUDE_END = 8;

// Declaration types
var DM_DECL_VAR = 9;
var DM_DECL_PARM_VAR = 10;
var DM_DECL_STRUCT_TYPE = 11;
var DM_DECL_STRUCT_FIELD = 12;
var DM_DECL_FUNC = 13;
var DM_DEFINE_FUNC = 14;

// Usage types
var DM_US_VAR = 15;
var DM_US_STRUCT_TYPE = 16;
var DM_US_FIELD = 17;
var DM_US_INVARIANT_DECL = 18;
var DM_US_FUNC_CALL = 19;

// Shared ids types
var SHARED_INCLUDE = 20;
var SHARED_VARYING = 21;

// Debug message levels
var DB_LOG = 22;
var DB_WARN = 23;
var DB_ERROR = 24;

// Debug message types
var DB_DECL_RESERVED = 25;
var DB_UNDECLARED_ID = 26;
var DB_BAD_QUAL_COLLISION = 27;
var DB_EXP_DATA_VIOLATION = 28;
var DB_IMP_DATA_VIOLATION = 29;
var DB_POSSIBLE_IMPORT = 30;
var DB_UNSUPPORTED_EXTENSION = 31;
var DB_EXT_ALL_WRONG_BEHAVIOR = 32;

// Obfuscation automat states
var QUAL_OBFUSCATE = 33;
var QUAL_OBFUSCATE_VARYING = 34;
var QUAL_DONT_OBFUSCATE = 35;
var QUAL_ERROR = 36;

// File types
var MAIN_SHADER_FILE = 37;
var INCLUDE_FILE = 38;


exports.run = function(ast, reserved_ids, shared_ids_data, varyings_aliases,
        dead_functions, dead_variables, filename) {
    init_data(ast, reserved_ids, shared_ids_data, varyings_aliases, dead_functions,
            dead_variables, filename);
    ast.result = traverse_ast(ast.result);

    flush_onefile_data();

    return {
        ast: ast,
        shared_ids_data: shared_data_manager.shared_ids_data,
        varyings_aliases: shared_data_manager.varyings_aliases,
        import_export: IMPORT_EXPORT_DATA
    }
}

function init_data(ast, reserved_ids, shared_ids_data, varyings_aliases,
        dead_functions, dead_variables, filename) {
    AST = ast.result;
    IMPORT_EXPORT_DATA = ast.import_export;
    SRC_FILENAME = filename;
    _node_dirs = ast.node_dirs;

    if (reserved_ids)
        reserved_words.vardef_additional = reserved_ids;

    shared_data_manager = {
        // input data
        incl_positions: ast.include_positions,
        // changable and output data
        shared_ids_data: shared_ids_data,
        varyings_aliases: varyings_aliases,
        // service data
        incl_names_stack: [null],
        dead_functions: dead_functions,
        dead_variables: dead_variables
    }

    id_generator = {
        generator_counter: 0,
        generator_source: generator_source,
        generator_base: generator_source.length,
        id_stash: []
    }

    data_manager = {
        main_sequence: [],
        // properties used in obfuscation pass
        service: {
            scopes_count : 0,
            // for searching declarations in ascending order of scopes
            curr_scopes_chain: [0],
            // for searching declarations before current index
            curr_seq_index: -1
        },
        // properties used in collecting pass
        auxiliaries: {
            // for cheking includes begin/end
            node_prev_offset: -1,
            node_curr_offset: 0,
            // for scopes identifying and indexing, 0 - global scope
            scopes_ids_stack: [0],
            scopes_id_counter: 0,
            extensions_pos: ast.extensions
        }
    }
}

/*==============================================================================
                                AST TRAVERSAL
==============================================================================*/
function traverse_ast(ast) {
    collect_id_data(ast);
    process_id_data(data_manager);
    return ast;
}

function collect_id_data(ast) {

    cb_before = function(object_data) {
        dm_read_offset(data_manager, object_data);
        dm_check_include(data_manager, object_data);
        dm_check_extension(data_manager, object_data);
        dm_check_scope(data_manager, object_data, DM_SCOPE_START);
        dm_shift_offset(data_manager, object_data);
    }

    cb_after = function(object_data) {
        dm_check_declaration(data_manager, object_data);
        dm_check_usage(data_manager, object_data);
        dm_check_scope(data_manager, object_data, DM_SCOPE_END);
    }

    traverse_data(ast, cb_before, cb_after);
}

function process_id_data(data_manager) {
    dm_service_actions(data_manager);
    dm_fix_includes(data_manager);
    dm_fix_obf_collisions(data_manager);
    dm_move_struct_fields(data_manager);
    dm_check_dead_functions(data_manager);
    dm_check_dead_variables(data_manager);
    dm_obfuscate(data_manager);
    dm_obfuscate_node_dirs(data_manager);
}

function traverse_data(data, cb_before, cb_after) {
    var instance = get_instance(data);

    switch (instance) {
    case ARRAY_DATA:
        traverse_array(data, cb_before, cb_after);
        break;
    case OBJECT_DATA:
        traverse_object(data, cb_before, cb_after);
        break;
    }
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

/*==============================================================================
                            NAMESPACES AND SCOPING
==============================================================================*/
var data_manager;

// Data manager collecting data
function dm_read_offset(data_manager, node) {
    if (node.offset)
        data_manager.auxiliaries.node_curr_offset = node.offset;
}

function dm_shift_offset(data_manager, node) {
    if (node.offset)
        data_manager.auxiliaries.node_prev_offset = data_manager.auxiliaries.node_curr_offset;
}

function dm_check_scope(data_manager, node, scope_status) {
    if (node.new_scope)
        dm_push_scope_data(data_manager, scope_status, node.node);
}

function dm_check_include(data_manager, node) {
    if (node.offset) {
        var include_bounds = {}

        for (var incl_name in shared_data_manager.incl_positions) {
            var incl_data = shared_data_manager.incl_positions[incl_name];
            for (var i = 0; i < incl_data.length; i++) {
                var offsets = incl_data[i];

                for (var i = 0; i < offsets.length; i++)
                    if (data_manager.auxiliaries.node_prev_offset < offsets[i]
                            && data_manager.auxiliaries.node_curr_offset > offsets[i])
                        include_bounds[offsets[i]] = [i==0 ? DM_INCLUDE_START : DM_INCLUDE_END, incl_name];
            }
        }

        for (var offset in include_bounds) {
            var bound_data = include_bounds[offset];
            dm_push_include_data(data_manager, bound_data[0], bound_data[1]);
            if (bound_data[0] == DM_INCLUDE_START)
                FILE_INCLUDES.push(bound_data[1]);
            else
                FILE_INCLUDES.pop();
        }
    }
}

function dm_check_extension(data_manager, node) {
    if (node.offset)
        for (var offset in data_manager.auxiliaries.extensions_pos) {
            var ext_data = data_manager.auxiliaries.extensions_pos[offset];
            if (data_manager.auxiliaries.node_prev_offset < offset
                    && data_manager.auxiliaries.node_curr_offset > offset)

                if (ext_data.name == "all")
                    switch (ext_data.behavior) {
                    case "warn":
                    case "disable":
                        for (var ext in reserved_words.extensions)
                            reserved_words.extensions[ext].behavior = ext_data.behavior;
                        break;
                    case "require":
                    case "enable":
                        debug_message(DB_EXT_ALL_WRONG_BEHAVIOR, ext_data.behavior);
                        break;
                    default:
                        // NOTE: unreachable case, failed at parsing
                        break;
                    }
                else
                    if (ext_data.name in reserved_words.extensions)
                        reserved_words.extensions[ext_data.name].behavior = ext_data.behavior;
                    else
                        debug_message(DB_UNSUPPORTED_EXTENSION, ext_data.name);
        }
}

function dm_check_declaration(data_manager, node) {

    var decl_type = null;
    var decl_id = null;
    var decl_id_type = null;
    var decl_id_type_qualifier = null;

    switch(node.node) {
    case "function_declaration":
        decl_type = DM_DECL_FUNC;
        decl_id = node.function.head.identifier;
        decl_id_type = get_type_name(node.function.head.type);
        decl_id_type_qualifier = null;
        break;
    case "function_definition":
        decl_type = DM_DEFINE_FUNC;
        decl_id = node.head.identifier;
        decl_id_type = get_type_name(node.head.type);
        decl_id_type_qualifier = null;
        break;
    case "single_declaration":
    case "single_declaration_line":
        if (node.subtype == "simple")
            if (node.identifier) {
                decl_type = DM_DECL_VAR;
                decl_id = node.identifier;
                decl_id_type = get_type_name(node.type);
                decl_id_type_qualifier = get_type_qualifier(node.type);
            }
        break;
    case "struct_declarator":
        decl_type = DM_DECL_STRUCT_FIELD;
        decl_id = node.identifier;
        decl_id_type = get_type_name(node.type);
        decl_id_type_qualifier = null;
        break;
    case "struct_specifier":
        decl_type = DM_DECL_STRUCT_TYPE;
        decl_id = node.struct_type.identifier;
        decl_id_type = "struct";
        decl_id_type_qualifier = null;
        break;
    case "parameter_declarator":
        decl_type = DM_DECL_PARM_VAR;
        decl_id = node.identifier;
        decl_id_type = get_type_name(node.type);
        decl_id_type_qualifier = get_type_qualifier(node.type);
        break;
    case "condition_initializer":
        decl_type = DM_DECL_VAR;
        decl_id = node.identifier;
        decl_id_type = get_type_name(node.id_type);
        decl_id_type_qualifier = get_type_qualifier(node.id_type);
        break;
    }

    if (decl_type !== null) {
        var ids_stack = data_manager.auxiliaries.scopes_ids_stack;
        var data = {
            type: "declaration",
            decl_type: decl_type,
            decl_id: decl_id,
            decl_id_type: decl_id_type,
            decl_id_type_qualifier: decl_id_type_qualifier,
            decl_id_type_qualifier_origin: decl_id_type_qualifier,
            decl_is_reserved: is_reserved(decl_id.name),
            decl_in_scope: ids_stack[ids_stack.length - 1],
            decl_in_include: FILE_INCLUDES[FILE_INCLUDES.length - 1]
        }

        data.decl_obfuscation_allowed = !data.decl_is_reserved
                && allow_obfuscation(data.decl_id_type_qualifier)
                && b4w_disable_obfuscation.indexOf(data.decl_id.name) == -1;

        if (data.decl_is_reserved
                && reserved_words.special.indexOf(data.decl_id.name) == -1)
            debug_message(DB_DECL_RESERVED, data.decl_id.name, data.decl_type);

        data_manager.main_sequence.push(data);
    }
}

function dm_check_usage(data_manager, node) {

    var identifier = null;
    var usage_type = null;

    switch(node.node) {
    case "single_declaration":
    case "single_declaration_line":
        if (node.subtype == "invariant") {
            identifier = node.identifier;
            usage_type = DM_US_INVARIANT_DECL;
        }
        break;
    case "field_selection":
        identifier = node.identifier;
        usage_type = DM_US_FIELD;
        break;
    // for user-defined functions, constructor functions and struct constructors
    case "function_call":
        switch(node.identifier.name.node) {
        case "keyword_node":
            identifier = node.identifier.name;
            break;
        case "struct_type":
            identifier = node.identifier.name.identifier;
            break;
        default:
            identifier = node.identifier;
            break;
        }
        usage_type = DM_US_FUNC_CALL;
        break;
    case "primary_expression":
        if (node.expression && node.expression.node == "identifier") {
            identifier = node.expression;
            usage_type = DM_US_VAR;
        }
        break;
    case "type_specifier_no_prec":
        if (node.name.node == "struct_type") {
            identifier = node.name.identifier;
            usage_type = DM_US_STRUCT_TYPE;
        }
        break;
    }

    if (identifier !== null) {
        var data = {
            type: "id_usage",
            id_usage_id: identifier,
            id_usage_type: usage_type,
            id_usage_ast_uid: node.uid,
            id_usage_is_reserved: is_reserved(identifier.name)
        }
        data_manager.main_sequence.push(data);
    }
}

// Data manager postprocessing
function dm_move_struct_fields(data_manager) {
    var struct_scopes = {}

    for (var i = 0; i < data_manager.main_sequence.length; i++) {
        var data = data_manager.main_sequence[i];
        if (data.type == "declaration" && data.decl_id_type == "struct") {
            var scope_id = data_manager.main_sequence[i - 1].scope_id;
            struct_scopes[i] = dm_get_scope_boundaries(data_manager, scope_id);
        }
    }

    for (var struct_id in struct_scopes) {
        var struct = data_manager.main_sequence[struct_id];
        struct.fields = [];

        var bnd = struct_scopes[struct_id];
        if (bnd !== null) {
            for (var i = bnd[0] + 1; i < bnd[1]; i++) {
                struct.fields.push(data_manager.main_sequence[i]);
                data_manager.main_sequence[i] = null;
            }
            data_manager.main_sequence[bnd[0]] = null;
            data_manager.main_sequence[bnd[1]] = null;
        }
    }

    for (var i = data_manager.main_sequence.length - 1; i >= 0; i--)
        if (data_manager.main_sequence[i] === null)
            data_manager.main_sequence.splice(i, 1);
}

/**
 * Total scopes count
 */
function dm_service_actions(data_manager) {
    data_manager.scopes_count = data_manager.auxiliaries.scopes_id_counter + 1;
}

/**
 * Fix includes closing in main_sequence
 */
 function dm_fix_includes(data_manager) {
    var opened_includes = [];
    for (var i = 0; i < data_manager.main_sequence.length; i++) {
        var data = data_manager.main_sequence[i];
        if (data.type == "include")
            if (data.include_status == DM_INCLUDE_START)
                opened_includes.push(data);
            else
                opened_includes.pop();
    }

    for (var i = opened_includes.length - 1; i >= 0; i--) {
        var incl_data = {
            type: "include",
            include_status: DM_INCLUDE_END,
            include_name: opened_includes[i].include_name
        }
        data_manager.main_sequence.push(incl_data);
        FILE_INCLUDES.pop();
    }
}

/**
 * Fix obfuscation status collisions
 */
function dm_fix_obf_collisions(data_manager) {
    var redef_coll_types = [DM_DECL_VAR, DM_DECL_PARM_VAR, DM_DECL_STRUCT_TYPE]

    var scopes = []
    var qualifiers = []
    for (var i = 0; i < data_manager.scopes_count; i++) {
        scopes.push({});
        qualifiers.push({});
    }

    for (var i = 0; i < data_manager.main_sequence.length; i++) {
        var data = data_manager.main_sequence[i];
        if (data.type == "declaration" && redef_coll_types.indexOf(data.decl_type) != -1) {
            var scope_id = data.decl_in_scope;
            var name = data.decl_id.name;
            var qual = data.decl_id_type_qualifier;

            if (!(name in scopes[scope_id])) {
                scopes[scope_id][name] = [];
                qualifiers[scope_id][name] = [];
            }
            scopes[scope_id][name].push(data);
            qualifiers[scope_id][name].push(qual);
        }
    }

    for (var i = 0; i < qualifiers.length; i++) {
        for (var name in qualifiers[i]) {
            var qual_array = qualifiers[i][name];
            var state = pp_qual_run(qual_array);
            switch (state) {
            case QUAL_OBFUSCATE:
                break;
            case QUAL_OBFUSCATE_VARYING:
                for (var j = 0; j < scopes[i][name].length; j++)
                    scopes[i][name][j].decl_id_type_qualifier = "varying";
                break;
            case QUAL_DONT_OBFUSCATE:
                for (var j = 0; j < scopes[i][name].length; j++) {
                    scopes[i][name][j].decl_id_type_qualifier = "uniform";
                    scopes[i][name][j].decl_obfuscation_allowed = false;
                }
                break;
            case QUAL_ERROR:
                debug_message(DB_BAD_QUAL_COLLISION, name);
                break;
            }
        }
    }
}


/**
 * Check dead functions in current file
 *
 * Format of 'result' object:
 *  result {
 *      dead: {
 *          main_shaders {
 *              FILENAME: [DECLARATION_NAME, ...],
 *              ...
 *          },
 *          includes: {
 *              FILENAME: [DECLARATION_NAME, ...],
 *              ...
 *          }
 *      alive: {...}
 *  }
 *
 * Format of 'declarations' object:
 *  declarations {
 *      DECLARATION_NAME: {
 *          FILE_NAME: {
 *              is_include: Boolean,
 *              func_usages: [FUNC_NAME, ...]
 *          },
 *          ...
 *      },
 *      ...
 *  }
 *
 */
function dm_check_dead_functions(data_manager) {
    var result = {
        dead: {
            main_shaders: {},
            includes: {}
        },
        alive: {
            main_shaders: {},
            includes: {}
        }
    }


    // collect functions data
    var declarations = {};
    var tmp_func_body_calls = [];
    var filenames = [SRC_FILENAME];
    for (var i = 0; i < data_manager.main_sequence.length; i++) {
        var data = data_manager.main_sequence[i];

        switch (data.type) {
        case "include":
            if (data.include_status == DM_INCLUDE_START)
                filenames.push(data.include_name);
            else if (data.include_status == DM_INCLUDE_END)
                filenames.pop();
            break;

        case "declaration":
            if (data.decl_type == DM_DEFINE_FUNC || data.decl_type == DM_DECL_FUNC) {
                var decl_name = data.decl_id.name;
                var file_name = filenames[filenames.length - 1];
                if (!(decl_name in declarations))
                    declarations[decl_name] = {};
                if (!(file_name in declarations[decl_name]))
                    declarations[decl_name][file_name] = {
                        is_include: file_name != SRC_FILENAME,
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
            if (data.id_usage_type == DM_US_FUNC_CALL)
                tmp_func_body_calls.push(data.id_usage_id.name);
            break;
        }
    }


    // separate used/unused functions
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
            dm_fill_dead_func_result(result, declarations[level_func_curr[i]],
                    level_func_curr[i], "alive");

    } while (level_func_curr.length > 0);
    for (var func_name in declarations)
        dm_fill_dead_func_result(result, declarations[func_name], func_name,
                "dead");


    // Combine data from current file with previous data in shared_data_manger

    // remove previous dead functions if they are alive in current 'result'
    for (var incl_name in result.alive.includes)
        if (incl_name in shared_data_manager.dead_functions.dead.includes)
            for (var i = 0; i < result.alive.includes[incl_name].length; i++) {
                var func_name = result.alive.includes[incl_name][i];
                var shared_dead_funcs
                        = shared_data_manager.dead_functions.dead.includes[incl_name];
                var index = shared_dead_funcs.indexOf(func_name);
                if (index != -1)
                    shared_dead_funcs.splice(index, 1);
            }

    // remove current 'result' dead functions if they are already alive
    for (var incl_name in result.dead.includes)
        if (incl_name in shared_data_manager.dead_functions.alive.includes)
            for (var i = result.dead.includes[incl_name].length - 1; i >= 0 ; i--) {
                var func_name = result.dead.includes[incl_name][i];
                var shared_alive_funcs
                        = shared_data_manager.dead_functions.alive.includes[incl_name];
                var index = shared_alive_funcs.indexOf(func_name);
                if (index != -1)
                    result.dead.includes[incl_name].splice(i, 1);
            }

    // merge dead and alive functions
    for (var status in result)
        for (var file_type in result[status])
            for (var file_name in result[status][file_type]) {
                var decls = result[status][file_type][file_name];
                var filenames = shared_data_manager.dead_functions[status][file_type];

                if (!(file_name in filenames))
                    filenames[file_name] = [];
                for (var i = 0; i < decls.length; i++) {
                    if (filenames[file_name].indexOf(decls[i]) == -1)
                        filenames[file_name].push(decls[i]);
                }
            }
}

/**
 * Check dead variables in current file
 *
 * Format of 'var_declarations' object:
 *  var_declarations = {
 *      dead: {
 *          DECLARATION_NAME {
 *              SCOPE_ID: DECLARATION_DATA,
 *              ...
 *          },
 *          ...
 *      }
 *      alive: {
 *          DECLARATION_NAME {
 *              SCOPE_ID: DECLARATION_DATA,
 *              ...
 *          },
 *          ...
 *      }
 *  }
 *
 * Format of 'dead_variables' field in 'shared_data_manager' object:
 *  dead_variables = {
 *      dead: {
 *          main_shaders {
 *              FILENAME: [DECLARATION_NAME, ...],
 *              ...
 *          },
 *          includes: {
 *              FILENAME: [DECLARATION_NAME, ...],
 *              ...
 *          }
 *      alive: {...}
 *  }
 *
 */
function dm_check_dead_variables(data_manager) {
    var checked_decl_types = [DM_DECL_VAR, DM_DECL_PARM_VAR, DM_DECL_STRUCT_TYPE]
    var checked_usage_types = [DM_US_VAR, DM_US_STRUCT_TYPE]

    var var_declarations = {
        dead: {},
        alive: {}
    }

    var scopes_chain = [0];

    // include scopes manager
    var ism = {
        counters: [0],
        ids: []
    }

    // collect variables data
    for (var i = 0; i < data_manager.main_sequence.length; i++) {
        var data = data_manager.main_sequence[i];
        var file_type = (FILE_INCLUDES.length == 1) ? MAIN_SHADER_FILE : INCLUDE_FILE;

        switch (data.type) {
        case "include":
            if (data.include_status == DM_INCLUDE_START) {
                FILE_INCLUDES.push(data.include_name);
                ism.counters.push(0);
                ism.ids.push([0]);
            } else {
                FILE_INCLUDES.pop();
                ism.counters.pop();
                ism.ids.pop();
            }
            break;

        case "scope":
            if (data.scope_status == DM_SCOPE_START)
                scopes_chain.push(data.scope_id);
            else
                scopes_chain.pop();

            // NOTE: include scope ids for identifying same/different variables
            if (file_type == INCLUDE_FILE) {
                if (data.scope_status == DM_SCOPE_START) {
                    var next_id = ++ism.counters[ism.counters.length - 1];
                    ism.ids[ism.ids.length - 1].push(next_id);
                } else
                    ism.ids[ism.ids.length - 1].pop();
            }
            break;

        case "declaration":
            if (checked_decl_types.indexOf(data.decl_type) != -1) {
                var decl_name = data.decl_id.name;

                if (!(decl_name in var_declarations.dead))
                    var_declarations.dead[decl_name] = {}

                var incl_name = FILE_INCLUDES[FILE_INCLUDES.length - 1];

                var decl = {
                    decl: data,
                    file_type: file_type,
                    file_name: (incl_name === null) ? SRC_FILENAME: incl_name,
                };

                var curr_include_ids = ism.ids[ism.ids.length - 1];
                decl.incl_scope_id = (file_type == INCLUDE_FILE)
                        ? curr_include_ids[curr_include_ids.length - 1] : null;
                var_declarations.dead[decl_name][data.decl_in_scope] = decl;

                // NOTE: for preprocessing redeclaration delete 'alive' var and
                // treat variable as new one
                if (decl_name in var_declarations.alive)
                    if (data.decl_in_scope in var_declarations.alive[decl_name])
                        delete var_declarations.alive[decl_name][data.decl_in_scope];
            }
            break;

        case "id_usage":
            if (checked_usage_types.indexOf(data.id_usage_type) != -1) {
                var name = data.id_usage_id.name;
                if (!is_reserved(name) && name in var_declarations.dead)
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

    // NOTE: replace scope ids by include scope ids for further merging
    for (var status in var_declarations) {
        for (var decl_name in var_declarations[status]) {
            var new_data = {}
            for (var scope_id in var_declarations[status][decl_name]) {
                var data = var_declarations[status][decl_name][scope_id];

                if (data.file_type == INCLUDE_FILE) {
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

            if (data.file_type == INCLUDE_FILE) {
                var incl = shared_data_manager.dead_variables.dead.includes;
                if (data.file_name in incl)
                    if (decl_name in incl[data.file_name])
                        if (scope_id in incl[data.file_name][decl_name])
                            delete shared_data_manager.dead_variables.dead
                                    .includes[data.file_name][decl_name][scope_id];
            }
        }

    // remove current 'result' dead functions if they are already alive
    for (var decl_name in var_declarations.dead)
        for (var scope_id in var_declarations.dead[decl_name]) {
            var data = var_declarations.dead[decl_name][scope_id];

            if (data.file_type == INCLUDE_FILE) {
                var incl = shared_data_manager.dead_variables.alive.includes;
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
                var file_type = (data.file_type == INCLUDE_FILE)
                        ? "includes" : "main_shaders";

                var sh_data_files = shared_data_manager.dead_variables[status][file_type];

                if (!(data.file_name in sh_data_files))
                    sh_data_files[data.file_name] = {};
                if (!(decl_name in sh_data_files[data.file_name]))
                    sh_data_files[data.file_name][decl_name] = {};
                if (!(scope_id in sh_data_files[data.file_name][decl_name]))
                    sh_data_files[data.file_name][decl_name][scope_id]
                            = var_declarations[status][decl_name][scope_id];
            }
        }
    }
}

function dm_obfuscate(data_manager) {
    for (var i = 0; i < data_manager.main_sequence.length; i++) {
        data_manager.service.curr_seq_index = i;
        var data = data_manager.main_sequence[i];

        switch (data.type) {
        case "declaration":
            // set usage flag for export tokens
            var curr_incl = FILE_INCLUDES[FILE_INCLUDES.length - 1];
            if (curr_incl !== null)
                if (curr_incl in IMPORT_EXPORT_DATA)
                    if (data.decl_id.name in IMPORT_EXPORT_DATA[curr_incl]["export"])
                        IMPORT_EXPORT_DATA[curr_incl]["export"][data.decl_id.name] = 1;

            if (data.decl_obfuscation_allowed) {
                data.decl_id.old_name = data.decl_id.name;
                data.decl_id.name = null;

                if (data.decl_id_type_qualifier == "varying") {
                    if (data.decl_id.old_name in shared_data_manager.varyings_aliases)
                        data.decl_id.name = shared_data_manager.varyings_aliases[data.decl_id.old_name];
                    else {
                        var counter = get_id_above_shared(id_generator.generator_counter);
                        data.decl_id.name = generate_id(id_generator, counter);
                        push_shared_id(data.decl_id.old_name, id_generator.generator_counter - 1, SHARED_VARYING);
                        push_shared_id(data.decl_id.old_name, id_generator.generator_counter, SHARED_VARYING);
                        shared_data_manager.varyings_aliases[data.decl_id.old_name] = data.decl_id.name;
                    }
                }
                else {
                    // check existed ids for overloaded functions, definitions and declarations
                    // for the same function, preprocessing branching with same declarations, ...
                    for (var j = 0; j < i; j++) {
                        var ex_data = data_manager.main_sequence[j];
                        if (ex_data.type == "declaration" && ex_data.decl_in_scope == data.decl_in_scope)
                            if (ex_data.decl_id.old_name == data.decl_id.old_name) {
                                data.decl_id.name = ex_data.decl_id.name;
                                break;
                            }
                    }
                    if (data.decl_id.name === null)
                        data.decl_id.name = generate_id(id_generator);
                }
            }
            if (data.decl_id_type == "struct") {
                interrupt_gen_id(0);
                for (var j = 0; j < data.fields.length; j++) {
                    data.fields[j].decl_id.old_name = data.fields[j].decl_id.name;
                    data.fields[j].decl_id.name = generate_id(id_generator);
                }
                restore_gen_id();
            }

            break;

        case "id_usage":
            if (!data.id_usage_is_reserved) {
                var decl = search_declaration(data_manager, data.id_usage_ast_uid,
                        data.id_usage_id.name, data.id_usage_type);

                var curr_incl = FILE_INCLUDES[FILE_INCLUDES.length - 1];
                // set usage flag for import tokens
                if (curr_incl !== null)
                    if (decl === null || decl.decl_in_include != curr_incl)
                        if (curr_incl in IMPORT_EXPORT_DATA)
                            if (data.id_usage_id.name in IMPORT_EXPORT_DATA[curr_incl]["import"]) {
                                IMPORT_EXPORT_DATA[curr_incl]["import"][data.id_usage_id.name] = 1;
                                import_presence = true;
                            } else if (data.id_usage_type != DM_US_FIELD)
                                debug_message(DB_POSSIBLE_IMPORT, data.id_usage_id.name, data.id_usage_type);

                if (decl) {
                    // check include export violations
                    if (data.id_usage_type != DM_US_FIELD) {
                        var incl_name = decl.decl_in_include;
                        if (incl_name !== null && incl_name != FILE_INCLUDES[FILE_INCLUDES.length - 1]) {
                            if (incl_name in IMPORT_EXPORT_DATA)
                                if (!(data.id_usage_id.name in IMPORT_EXPORT_DATA[incl_name]["export"]))
                                    debug_message(DB_EXP_DATA_VIOLATION,
                                            data.id_usage_id.name, data.id_usage_type,
                                            incl_name);
                        }
                    }

                    if (decl.decl_obfuscation_allowed) {
                        data.id_usage_id.old_name = data.id_usage_id.name;
                        data.id_usage_id.name = decl.decl_id.name;
                    }
                } else if (!(data.id_usage_type == DM_US_FIELD
                        && data.id_usage_id.name.replace(/[rgbaxyzwstpq]/g, "").length == 0)) {

                    // check include import violations
                    var import_violation = false;
                    if (curr_incl !== null)
                        if (curr_incl in IMPORT_EXPORT_DATA)
                            if (data.id_usage_id.name in IMPORT_EXPORT_DATA[curr_incl]["import"])
                                import_violation = true;

                    if (import_violation)
                        debug_message(DB_IMP_DATA_VIOLATION, data.id_usage_id.name,
                                data.id_usage_type);
                    else
                        debug_message(DB_UNDECLARED_ID, data.id_usage_id.name, data.id_usage_type);
                }
            }
            break;

        case "scope":
            if (data.scope_status == DM_SCOPE_START) {
                data_manager.service.curr_scopes_chain.push(data.scope_id);
                // similar ids in paralleled scopes
                // cannot use because of redeclaration bugs in webgl implementation on some devices
                //interrupt_gen_id(id_generator.generator_counter);
            } else {
                data_manager.service.curr_scopes_chain.pop();
                // similar ids in paralleled scopes
                // cannot use because of redeclaration bugs in webgl implementation on some devices
                //restore_gen_id();
            }
            break;

        case "include":
            if (data.include_status == DM_INCLUDE_START) {
                var sh_data = search_shared_data(data.include_name, SHARED_INCLUDE);
                if (sh_data)
                    var id = sh_data.ids[0];
                else {
                    var id = get_id_above_shared(id_generator.generator_counter);
                    push_shared_id(data.include_name, id, SHARED_INCLUDE);
                }
                interrupt_gen_id(id);
                shared_data_manager.incl_names_stack.push(data.include_name);
                FILE_INCLUDES.push(data.include_name);
            } else {
                var sh_data = search_shared_data(data.include_name, SHARED_INCLUDE);
                push_shared_id(data.include_name, id_generator.generator_counter, SHARED_INCLUDE);
                restore_gen_id();
                shared_data_manager.incl_names_stack.pop();
                FILE_INCLUDES.pop();
            }
            break;
        }
    }
}

function dm_obfuscate_node_dirs(data_manager) {
    var new_old_inout_ids = {};

    for (var i = 0; i < data_manager.main_sequence.length; i++) {
        var data = data_manager.main_sequence[i];
        if (data.type == "declaration" && data.decl_id.old_name) {
            var expr_node_inout_old_name = /node_(.*?)_var_(.*)/g;
            if (res = expr_node_inout_old_name.exec(data.decl_id.old_name)) {

                var node_name = res[1];
                var old_name = res[2];
                var new_name = data.decl_id.name;

                if (!new_old_inout_ids[node_name])
                    new_old_inout_ids[node_name] = {};

                new_old_inout_ids[node_name][old_name] = new_name;
            }
        }
    }
    
    for (var i in _node_dirs) {
        var expr_node_condition = /\/\*%node_condition%(.*?)%(.*?)%(.*?)%\*\//g;
        var expr_contain_use_decl = /USE_OUT_(.*?)([^_0-9a-zA-Z]|$)/g;

        if ((res = expr_node_condition.exec(_node_dirs[i])) != null) {
            var source_txt = res[1];
            var node_name = res[2];
            
            while ((parts = expr_contain_use_decl.exec(source_txt)) != null) {
                var old_name = parts[1];
                var new_name = new_old_inout_ids[node_name][old_name];

                _node_dirs[i] = _node_dirs[i].replace(
                        new RegExp("\(USE_OUT_\)" + old_name), 
                        "$1" + new_name)
            }
        }
    }
}

// Data manager utilities
function dm_push_scope_data(data_manager, scope_status, scope_type) {
    var id_stack = data_manager.auxiliaries.scopes_ids_stack;

    if (scope_status == DM_SCOPE_START) {
        var curr_id = ++data_manager.auxiliaries.scopes_id_counter;
        id_stack.push(curr_id);
    } else if (scope_status == DM_SCOPE_END)
        var curr_id = id_stack.pop();

    var data = {
        type: "scope",
        scope_status: scope_status,
        scope_type: scope_type,
        scope_id: curr_id
    }
    data_manager.main_sequence.push(data);
}

function dm_push_include_data(data_manager, include_status, include_name) {
    var data = {
        type: "include",
        include_status: include_status,
        include_name: include_name
    }
    data_manager.main_sequence.push(data);
}

function dm_get_scope_boundaries(data_manager, scope_id) {
    var from = null;
    var to = null;

    for (var i = 0; i < data_manager.main_sequence.length; i++) {
        if (from !== null && to !== null)
            break;

        var data = data_manager.main_sequence[i];
        if (data.type == "scope" && data.scope_id == scope_id) {
            if (data.scope_status == DM_SCOPE_START)
                from = i;
            else if (data.scope_status == DM_SCOPE_END)
                to = i;
        }
    }

    if (from !== null && to !== null)
        return [from, to];
    else
        return null;
}

function dm_fill_dead_func_result(result, decl_data, decl_name, status) {
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

/*==============================================================================
                      INCLUDE AND VARYING DATA MANAGING
==============================================================================*/
var shared_data_manager;

function search_shared_data(name, type) {
    for (var i = 0; i < shared_data_manager.shared_ids_data.length; i++) {
        var data = shared_data_manager.shared_ids_data[i];
        if (data.name == name && data.type == type)
            return data;
    }

    return null;
}

function push_shared_id(name, id, type) {
    var id_processed = false;

    for (var i = 0; i < shared_data_manager.shared_ids_data.length; i++) {
        var data = shared_data_manager.shared_ids_data[i];
        if (data.name == name && data.type == type) {
            if (data.ids.length == 2)
                data.ids[1] = id;
            else
                data.ids.push(id);
            id_processed = true;
            break;
        }
    }

    if (!id_processed)
        shared_data_manager.shared_ids_data.push({
            type: type,
            name: name,
            ids: [id]
        });
}

// get first free id
function get_not_shared_id(curr_id) {
    var out_id = curr_id;
    var curr_incl_name = shared_data_manager.incl_names_stack[
            shared_data_manager.incl_names_stack.length - 1];
    if (curr_incl_name === null)
        for (var i = 0; i < shared_data_manager.shared_ids_data.length; i++) {
            var ids = shared_data_manager.shared_ids_data[i].ids;
            if (curr_id >= ids[0] && curr_id < ids[1]) {
                out_id = get_not_shared_id(ids[1]);
                break;
            }
        }

    return out_id;
}

// get first free id greater than any shared id
function get_id_above_shared(curr_id) {
    var out_id = curr_id;
    if (shared_data_manager.shared_ids_data.length)
        for (var i = 0; i < shared_data_manager.shared_ids_data.length; i++) {
            var ids = shared_data_manager.shared_ids_data[i].ids;
            for (var j = 0; j < ids.length; j++)
                if (ids[j] > out_id)
                    out_id = ids[j];
        }

    return out_id;
}

/*==============================================================================
                          DECLARATIONS SEARCHING
==============================================================================*/

function search_declaration(data_manager, node_ast_uid, name, type) {
    var decl = null;

    if (type != DM_US_FIELD)
        for (var i = 0; i < data_manager.service.curr_seq_index; i++) {
            var data = data_manager.main_sequence[i];
            if (data.type == "declaration"
                    && data_manager.service.curr_scopes_chain.indexOf(data.decl_in_scope) != -1
                    && get_id_name(data.decl_id) == name)
                // last declaration needed
                decl = data;
        }
    else if (node_ast_uid !== null)
        decl = search_field_decl(AST, node_ast_uid, name);

    return decl
}

function search_field_decl(ast, field_ast_uid, field_name) {
    var field_decl = null;

    var struct_name = get_struct_name_by_field(ast, field_ast_uid);

    if (struct_name) {
        var struct_decl = search_struct_decl(struct_name.penult_str_name);
        if (struct_decl)
            field_decl = get_struct_field_decl(struct_decl, field_name);
    }
    return field_decl;
}

function get_struct_name_by_field(ast, field_ast_uid) {
    var struct_name = null;

    var parent_node = search_node_parent(ast, field_ast_uid);

    if (parent_node !== THIS_IS_ROOT && parent_node !== NOT_FOUND)
        struct_name = get_struct_name_by_parent(parent_node);

    return struct_name;
}

function get_struct_field_decl(struct_decl, field_name) {
    var field = null;

    if (struct_decl && struct_decl.decl_id_type == "struct")
        for (var i = 0; i < struct_decl.fields.length; i++)
            if (struct_decl.fields[i].decl_id.old_name == field_name) {
                field = struct_decl.fields[i];
                break;
            }

    return field;
}

function get_struct_name_by_parent(node, id_type) {
    var s_name = null;

    switch(node.node) {
    case "postfix_expression":

        s_name = get_struct_name_by_parent(node.expression, DM_US_VAR);
        if (s_name)
            if (node.operator.node == "field_selection") {
                if (s_name.last_str_name)
                    s_name = s_name.last_str_name;

                var struct_decl = search_struct_decl(s_name);
                if (struct_decl) {
                    var name = get_id_name(node.operator.identifier);
                    var field_decl = get_struct_field_decl(struct_decl, name);

                    s_name = {
                        last_str_name: field_decl.decl_id_type,
                        penult_str_name: s_name
                    }
                }
            }
        break;
    case "function_call":
        switch(node.identifier.name.node) {
        case "struct_type":
            s_name = get_struct_name_by_parent(node.identifier.name.identifier, DM_US_FUNC_CALL);
            break;
        case "keyword_node":
            s_name = get_struct_name_by_parent(node.identifier.name, DM_US_FUNC_CALL);
            break;
        case "identifier":
            s_name = get_struct_name_by_parent(node.identifier, DM_US_FUNC_CALL);
            break;
        }
        break;
    case "primary_expression":
        s_name = get_struct_name_by_parent(node.expression, DM_US_VAR);
        break;
    case "paren_expression":
        s_name = get_struct_name_by_parent(node.expression, DM_US_VAR);
        break;
    case "identifier":
        var node_name = get_id_name(node);
        var s_decl = search_declaration(data_manager, node.uid, node_name, id_type);
        if (s_decl)
            s_name = s_decl.decl_id_type;
        break;
    }

    return s_name;
}

function search_struct_decl(name) {
    var struct_type_decl = null;
    struct_type_decl = search_declaration(data_manager, null, name, DM_US_STRUCT_TYPE);
    return struct_type_decl;
}

function search_node_parent(data, ast_uid) {
    var nodes_parents = [];
    // root "data" is an array of declarations, but other "data" can be object too
    switch(get_instance(data)) {
    case ARRAY_DATA:
        nodes_parents = flat_array(data);
        break;
    case OBJECT_DATA:
        nodes_parents.push(data);
        break;
    }

    do {
        var nodes_childs = [];
        for (var i = 0; i < nodes_parents.length; i++) {
            var node = nodes_parents[i];

            // such node can be reached only if it is root/in root array
            if (node.uid == ast_uid)
                return THIS_IS_ROOT;

            var childs = flat_array(node);

            for (var j = 0; j < childs.length; j++)
                if (childs[j].uid == ast_uid)
                    return node;

            nodes_childs.push.apply(nodes_childs, childs);
        }
        nodes_parents = nodes_childs;
    } while(nodes_parents.length > 0);

    return NOT_FOUND;
}

/*==============================================================================
                               ID GENERATOR
==============================================================================*/
var generator_source = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
var id_generator;

function generate_id(gen, counter) {
    if (typeof counter !== "undefined")
        gen.generator_counter = counter;

    gen.generator_counter = get_not_shared_id(gen.generator_counter);

    var digits = charcodes_by_number(gen.generator_counter, gen.generator_base);
    var result = "";

    for (var i = 0; i < digits.length; i++) {
        if (digits.length > 1 && i==0)
            // equivalent to 0,1,2,3,4,5,6,7,8,9,00,01,...
            result += gen.generator_source.charAt(digits[i] - 1);
        else
            result += gen.generator_source.charAt(digits[i]);
    }
    gen.generator_counter++;

    if (!is_valid(result))
        result = generate_id(gen);
    return result;
}

function charcodes_by_number(number, base) {
    var digits = [];

    number += base;
    var dig_count = Math.floor(Math.log(number) / Math.log(base));
    number -= Math.pow(base, dig_count);

    while(number >= base) {
        var remainder = number % base;
        digits.push(remainder);
        number = (number - remainder) / base;
    }
    digits.push(number);

    for (var i = 0; i < dig_count - digits.length; i++)
        digits.push(0);

    return digits.reverse();
}

// check if new generated identifier name is valid
function is_valid(str) {
    if (is_reserved(str))
        return false;

    if (b4w_disable_obfuscation.indexOf(str) != -1)
        return false;

    if (reserved_words.vardef_additional.indexOf(str) > -1)
        return false;

    // NOTE: disallow names from all extensions even disabled
    for (var ext_name in reserved_words.extensions)
        if (reserved_words.extensions[ext_name].behavior == "disable"
                && reserved_words.extensions[ext_name].reserved.indexOf(str) > -1)
            return false;

    return true;
}

function interrupt_gen_id(new_id) {
    id_generator.id_stash.push(id_generator.generator_counter);
    id_generator.generator_counter = new_id;
}

function restore_gen_id() {
    var id = id_generator.id_stash.pop();
    if (id)
        id_generator.generator_counter = id;
}

/*==============================================================================
                              RESERVED WORDS
==============================================================================*/
// TODO: support GLSL macros related to extensions?

var reserved_words = {
    keywords: ["attribute", "const", "uniform", "varying", "break",
        "continue", "do", "for", "while", "if", "else", "in", "out", "inout",
        "float", "int", "void", "bool", "true", "false", "lowp", "mediump",
        "highp", "precision", "invariant", "discard", "return", "mat2",
        "mat3", "mat4", "vec2", "vec3", "vec4", "ivec2", "ivec3", "ivec4",
        "bvec2", "bvec3", "bvec4", "sampler2D", "samplerCube", "struct"
    ],
    future_use_keywords: ["asm", "class", "union", "enum", "typedef",
        "template", "this", "packed", "goto", "switch", "default", "inline",
        "noinline", "volatile", "public", "static", "extern", "external",
        "interface", "flat", "long", "short", "double", "half", "fixed",
        "unsigned", "superp", "input", "output", "hvec2", "hvec3", "hvec4",
        "dvec2", "dvec3", "dvec4", "fvec2", "fvec3", "fvec4", "sampler1D",
        "sampler3D", "sampler1DShadow", "sampler2DShadow", "sampler2DRect",
        "sampler3DRect", "sampler2DRectShadow", "sizeof", "cast", "namespace",
        "using"
    ],
    vector_components: ["xyzw", "rgba", "stpq"],
    built_in: ["radians", "degrees", "sin", "cos", "tan", "asin", "acos",
        "atan", "pow", "exp", "log", "exp2", "log2", "sqrt", "inversesqrt",
        "abs", "sign", "floor", "ceil", "fract", "mod", "min", "max", "clamp",
        "mix", "step", "smoothstep", "length", "distance", "dot", "cross",
        "normalize", "faceforward", "reflect", "refract", "matrixCompMult",
        "lessThan", "lessThanEqual", "greaterThan", "greaterThanEqual",
        "equal", "notEqual", "any", "all", "not", "texture2DLod",
        "texture2DProjLod", "textureCubeLod", "texture2D", "texture2DProj",
        "textureCube"
    ],
    extensions: {
        GL_OES_standard_derivatives: {
            behavior: "disable",
            reserved: ["dFdx", "dFdy", "fwidth"]
        }
    },
    prefixes: ["gl_", "webgl_"],
    infixes: ["__"],
    special: ["main"],

    vardef_additional: [],
}

// NOTE: specific b4w identifiers coming from engine
var b4w_disable_obfuscation = ["ZERO_VALUE_NODES", "UNITY_VALUE_NODES"];

/*==============================================================================
                                    UTILS
==============================================================================*/

function get_instance(data) {
    if (data === null)
        return OTHER_DATA;
    else if(data.constructor == Array)
        return ARRAY_DATA;
    else if(data.constructor == Object)
        return OBJECT_DATA;
    else
        return OTHER_DATA;
}

function flat_array(data) {
    var flat = [];

    for (var prop in data)
        if (data[prop])
            switch(get_instance(data[prop])) {
            case ARRAY_DATA:
                flat.push.apply(flat, flat_array(data[prop]));
                break;
            case OBJECT_DATA:
                flat.push(data[prop]);
                break;
            }

    return flat;
}

function is_reserved(name) {
    if (reserved_words.keywords.indexOf(name) > -1)
        return true;
    if (reserved_words.future_use_keywords.indexOf(name) > -1)
        return true;
    if (reserved_words.built_in.indexOf(name) > -1)
        return true;
    for (var i = 0; i < reserved_words.prefixes.length; i++) {
        var prefix = reserved_words.prefixes[i];
        if (name.indexOf(prefix) == 0)
            return true;
    }
    for (var i = 0; i < reserved_words.infixes.length; i++) {
        var infix = reserved_words.infixes[i];
        if (name.indexOf(infix) > -1)
            return true;
    }

    if (reserved_words.special.indexOf(name) > -1)
        return true;

    for (var ext_name in reserved_words.extensions)
        switch (reserved_words.extensions[ext_name].behavior) {
        case "required":
        case "enable":
        case "warn":
            if (reserved_words.extensions[ext_name].reserved.indexOf(name) > -1)
                return true;
            break;
        }

    return false;
}

function allow_obfuscation(qual) {
    var res = true;
    if (qual == UNIFORM || qual == ATTRIBUTE)
        res = false;
    return res;
}

function get_id_name(id) {
    return id.old_name ? id.old_name : id.name;
}

function get_type_name(node) {
    var type = node.type_specifier.name;

    switch(type.node) {
    case "keyword_node":
        return get_id_name(type);
    case "struct_type":
        return get_id_name(type.identifier);
    case "struct_specifier":
        return get_id_name(type.struct_type.identifier);
    default:
        return null;
    }
}

function get_type_qualifier(node) {
    var qual = null;

    var type = node.type_qualifier;
    if (type) {
        var inst = get_instance(type.value);
        switch(inst) {
        case ARRAY_DATA:
            qual = VARYING;
            break;
        case OBJECT_DATA:
            qual = type.value.name;
            break;
        }
    }

    return qual;
}

// Flash service data, needed to be flashed for every shader
function flush_onefile_data() {}

/*==============================================================================
                  PREPROCESSING QUALIFIERS COLLISIONS AUTOMAT
==============================================================================*/
/**
 * State matrix
 *
 * 0: obfuscate
 * 1: obfuscate as varying
 * 2: don't obfuscate
 * 3: error
 *
 * Initial state: 0
 */
var pp_qual_matrix = [
    {"attribute": 2, "uniform": 2, "varying": 1, "const": 0, null: 0},
    {"attribute": 3, "uniform": 3, "varying": 1, "const": 1, null: 1},
    {"attribute": 2, "uniform": 2, "varying": 3, "const": 2, null: 2},
    {"attribute": 3, "uniform": 3, "varying": 3, "const": 3, null: 3}
]
var pp_qual_init_state = 0;

function pp_qual_run(input) {
    var state = pp_qual_init_state;
    for (var i = 0; i < input.length; i++) {
        var symbol = input[i];
        state = pp_qual_matrix[state][symbol]
        if (state == 3)
            break;
    }

    switch (state) {
    case 0:
        state = QUAL_OBFUSCATE;
        break;
    case 1:
        state = QUAL_OBFUSCATE_VARYING;
        break;
    case 2:
        state = QUAL_DONT_OBFUSCATE;
        break;
    case 3:
        state = QUAL_ERROR;
        break;
    }

    return state;
}

/*==============================================================================
                                    DEBUG
==============================================================================*/
// Identical messages, duplications won't be displayed
var db_ident_messages = [];

function debug_message(message_type) {
    var message = null;
    var message_level = DB_LOG;

    switch (message_type) {
    case DB_DECL_RESERVED:
        var identifier_name = arguments[1];
        var declaration_type = arguments[2];
        message_level = DB_ERROR;
        message = "Using reserved word in "
                + decl_type_to_description(declaration_type) + " '"
                + identifier_name + "'. ";
        break;

    case DB_UNDECLARED_ID:
        var identifier_name = arguments[1];
        var usage_type = arguments[2];
        message_level = DB_ERROR;
        message = "Undeclared "
                + usage_type_to_description(usage_type) + ": '"
                + identifier_name + "'. ";
        break;

    case DB_BAD_QUAL_COLLISION:
        var identifier_name = arguments[1];
        message_level = DB_ERROR;
        message = "Bad preprocessing collision while obfuscation identifier: '"
                + identifier_name + "'. Varying/uniform or varying/attribute "
                + "qualifiers combination. ";
        break;

    case DB_EXP_DATA_VIOLATION:
        var identifier_name = arguments[1];
        var usage_type = arguments[2];
        var incl_name = arguments[3];
        message_level = DB_ERROR;

        message = "Undeclared "
                + usage_type_to_description(usage_type) + ": '"
                + identifier_name + "'. Possibly exporting needed in include file '" + incl_name + "'. ";
        break;

    case DB_IMP_DATA_VIOLATION:
        var identifier_name = arguments[1];
        var usage_type = arguments[2];
        message_level = DB_ERROR;

        message = "Undeclared "
                + usage_type_to_description(usage_type) + ": '"
                + identifier_name + "'. Importing data missed. ";
        break;

    case DB_POSSIBLE_IMPORT:
        var identifier_name = arguments[1];
        var usage_type = arguments[2];
        message_level = DB_ERROR;

        message = "Undeclared "
                + usage_type_to_description(usage_type) + ": '"
                + identifier_name + "'. Possibly importing needed. ";
        break;

    case DB_UNSUPPORTED_EXTENSION:
        var extension_name = arguments[1];
        message_level = DB_ERROR;

        message = "Extension " + extension_name + " is unsupported in obfuscator. "
        break;

    case DB_EXT_ALL_WRONG_BEHAVIOR:
        var behavior = arguments[1];
        message_level = DB_ERROR;

        message = "'all' extension cannot have '" + behavior + "' behavior. "
        break;
    }

    if (message !== null) {
        var incl_name = FILE_INCLUDES[FILE_INCLUDES.length - 1];
        message += "File: '" + ((incl_name !== null) ? incl_name: SRC_FILENAME) + "'";

        if (db_ident_messages.indexOf(message) == -1) {
            db_ident_messages.push(message);
            switch (message_level) {
            case DB_LOG:
                console.log("Log: " + message);
                break;
            case DB_WARN:
                console.warn("Warning! " + message);
                break;
            case DB_ERROR:
                fail("Error! " + message);
                break;
            }
        }
    }
}

function decl_type_to_description(decl_type) {
    var desc = null;

    switch (decl_type) {
    case DM_DECL_VAR:
        desc = "variable declaration";
        break;
    case DM_DECL_PARM_VAR:
        desc = "function parameter declaration";
        break;
    case DM_DECL_STRUCT_TYPE:
        desc = "struct declaration";
        break;
    case DM_DECL_STRUCT_FIELD:
        desc = "struct field declaration";
        break;
    case DM_DECL_FUNC:
        desc = "function declaration";
        break;
    case DM_DEFINE_FUNC:
        desc = "function definition";
        break;
    default:
        desc = "declaration";
        break;
    }

    return desc;
}

function usage_type_to_description(usage_type) {
    var desc = null;

    switch (usage_type) {
    case DM_US_VAR:
        desc = "variable";
        break;
    case DM_US_STRUCT_TYPE:
        desc = "structure type";
        break;
    case DM_US_FIELD:
        desc = "structure field";
        break;
    case DM_US_INVARIANT_DECL:
        desc = "variable and invariant qualifying";
        break;
    case DM_US_FUNC_CALL:
        desc = "function";
        break;
    default:
        desc = "identifier";
        break;
    }

    return desc;
}

function fail(message) {
    console.error(message);
    process.exit(1);
}

exports.log = log;
function log(data) {
    console.log(JSON.stringify(data, null, 4));
}
