/**
 * Collects different data from AST.
 * @name ast_data_collector
 */

var m_search   = require("./ast_search.js");
var m_trav     = require("./ast_traversal.js");
var m_consts   = require("./consts.js");
var m_debug    = require("./debug.js");
var m_reserved = require("./reserved_tokens.js");

var _collected_data = null;
var _auxiliary_data = null;
var _curr_includes_stack = null;
var _src_filename = "";
var _ast_root_uid = -1;

// for searching declarations in ascending order of scopes
var _curr_scopes_chain = [0];

// for searching declarations before current index
var _curr_seq_index = -1;


exports.init = function(ast_input, filename) {
    init_data(ast_input);
    _src_filename = filename;
}

function init_data(ast_input) {
    _collected_data = {
        main_sequence: []
    };

    _auxiliary_data = {
        // for scopes identifying and indexing, 0 - global scope
        scopes_ids_stack: [0],
        scopes_id_counter: 0
    };
    _curr_includes_stack = [null];
    _qual_init_state = 0;
    _ast_root_uid = ast_input.ast.uid;
}

/*==============================================================================
                            AST DATA COLLECTING
==============================================================================*/

exports.collect = function(ast_input) {
    init_data(ast_input);
    collect_data(ast_input.ast);
    return _collected_data;
}

function collect_data(ast) {
    cb_before = function(ast_node) {
        check_special_comments(ast_node);
        check_scope(ast_node, m_consts.SCOPE_START);
    }

    cb_after = function(ast_node) {
        check_declaration(ast_node);
        check_usage(ast_node);
        check_scope(ast_node, m_consts.SCOPE_END);
    }
    m_trav.traverse_data(ast, cb_before, cb_after);

    fix_includes();
    fix_obf_collisions();
    move_struct_fields();
}

function check_special_comments(ast_node) {
    if (ast_node.before_comments) {
        for (var i = 0; i < ast_node.before_comments.length; i++) {
            var comment_str = ast_node.before_comments[i];
            check_include(comment_str);
            check_extension(comment_str);
            check_nodes_lamps_main(comment_str);
        }
    }
}

function check_include(comment_str) {
    var expr = /\/\*%(include|include_end)%(.*?)%\*\//;
    var res = expr.exec(comment_str);
    if (res) {
        var incl_type = res[1];
        var incl_name = res[2];

        if (incl_type == "include") {
            var status = m_consts.INCLUDE_START;
            _curr_includes_stack.push(incl_name);
        } else {
            var status = m_consts.INCLUDE_END;
            _curr_includes_stack.pop();
        }

        push_include_data(status, incl_name);
    }
}

function check_extension(comment_str) {
    var expr = /\/\*%directive% *?# *?(extension) *?([0-9a-zA-Z_]+) ?: ?(require|enable|warn|disable) *%directive_end%\*\//;
    var res = expr.exec(comment_str);
    if (res)
        push_extension_data(res[2], res[3]);
}

function check_nodes_lamps_main(comment_str) {
    var expr_main = /\/\*%(nodes_main|lamps_main)%\*\//gi;
    var expr_main_end = /\/\*%(nodes_main|lamps_main)_end%\*\//gi;

    var res = expr_main_end.exec(comment_str);
    if (res)
        push_nodes_lamps_main_data(res[1], false);
    else {
        res = expr_main.exec(comment_str);
        if (res)
            push_nodes_lamps_main_data(res[1], true);
    }
}

function check_scope(ast_node, scope_status) {
    if (ast_node.new_scope)
        push_scope_data(ast_node, scope_status);
}

function check_declaration(ast_node) {
    var decl_type = null;
    var decl_id = null;
    var decl_id_type = null;
    var decl_id_type_qualifier = null;
    var decl_node_inoutparam = false;

    switch(ast_node.node) {
    case "function_declaration":
        decl_type = m_consts.DECL_FUNC;
        decl_id = ast_node.function.head.identifier;
        decl_id_type = get_type_name(ast_node.function.head.type);
        decl_id_type_qualifier = null;
        break;
    case "function_definition":
        decl_type = m_consts.DEFINE_FUNC;
        decl_id = ast_node.head.identifier;
        decl_id_type = get_type_name(ast_node.head.type);
        decl_id_type_qualifier = null;
        break;
    case "single_declaration":
        if (ast_node.subtype == "simple") {
            if (ast_node.identifier){
                decl_type = m_consts.DECL_VAR;
                decl_id = ast_node.identifier;
                decl_id_type = get_type_name(ast_node.type);
                decl_id_type_qualifier = get_type_qualifier(ast_node.type);
                decl_node_inoutparam = ast_node.is_node_inoutparam_decl;
            }
        }
        break;
    case "single_declaration_line":
        if (ast_node.identifier) {
            decl_type = m_consts.DECL_VAR;
            decl_id = ast_node.identifier;
            var decl_list_node = m_search.get_nearest_parent_by_uid(
                    ast_node.identifier.uid, ["declarator_list"]);
            // get first single_declaration from parent
            decl_id_type = get_type_name(decl_list_node.vars[0].type);
            decl_id_type_qualifier = get_type_qualifier(decl_list_node.vars[0].type);
        }
        break;
    case "struct_declarator":
        decl_type = m_consts.DECL_STRUCT_FIELD;
        decl_id = ast_node.identifier;
        decl_id_type = get_type_name(ast_node.type);
        decl_id_type_qualifier = null;
        break;
    case "struct_specifier":
        decl_type = m_consts.DECL_STRUCT_TYPE;
        decl_id = ast_node.struct_type.identifier;
        decl_id_type = "struct";
        decl_id_type_qualifier = null;
        break;
    case "parameter_declarator":
        decl_type = m_consts.DECL_PARM_VAR;
        decl_id = ast_node.identifier;
        decl_id_type = get_type_name(ast_node.type);
        decl_id_type_qualifier = get_type_qualifier(ast_node.type);
        break;
    case "condition_initializer":
        decl_type = m_consts.DECL_VAR;
        decl_id = ast_node.identifier;
        decl_id_type = get_type_name(ast_node.id_type);
        decl_id_type_qualifier = get_type_qualifier(ast_node.id_type);
        break;
    }

    if (decl_type !== null) {
        var ids_stack = _auxiliary_data.scopes_ids_stack;
        var data = {
            type: "declaration",
            decl_type: decl_type,
            decl_id: decl_id,
            decl_id_type: decl_id_type,
            decl_id_type_qualifier: decl_id_type_qualifier,
            decl_id_type_qualifier_origin: decl_id_type_qualifier,
            decl_is_reserved: m_reserved.is_reserved(decl_id.name),
            decl_in_scope: ids_stack[ids_stack.length - 1],
            decl_in_include: _curr_includes_stack[_curr_includes_stack.length - 1],
            decl_node_inoutparam: decl_node_inoutparam
        }

        data.decl_obfuscation_allowed = !data.decl_is_reserved
                && allow_qualifier_obfuscation(data.decl_id_type_qualifier)
                && !m_reserved.is_b4w_specific(data.decl_id.name);

        if (data.decl_is_reserved && !m_reserved.is_special(data.decl_id.name))
            m_debug.debug_message(m_consts.DECL_RESERVED, get_current_file_name(), 
                    data.decl_id.name, data.decl_type);

        _collected_data.main_sequence.push(data);
    }
}

function check_usage(ast_node) {
    var identifier = null;
    var usage_type = null;

    switch(ast_node.node) {
    case "single_declaration":
    case "single_declaration_line":
        if (ast_node.subtype == "invariant") {
            identifier = ast_node.identifier;
            usage_type = m_consts.US_INVARIANT_DECL;
        }
        break;
    case "field_selection":
        identifier = ast_node.identifier;
        usage_type = m_consts.US_FIELD;
        break;
    // for user-defined functions, constructor functions and struct constructors
    case "function_call":
        switch(ast_node.identifier.name.node) {
        case "keyword_node":
            identifier = ast_node.identifier.name;
            break;
        case "struct_type":
            identifier = ast_node.identifier.name.identifier;
            break;
        default:
            identifier = ast_node.identifier;
            break;
        }
        usage_type = m_consts.US_FUNC_CALL;
        break;
    case "primary_expression":
        if (ast_node.expression && ast_node.expression.node == "identifier") {
            identifier = ast_node.expression;
            usage_type = m_consts.US_VAR;
        }
        break;
    case "type_specifier_no_prec":
        if (ast_node.name.node == "struct_type") {
            identifier = ast_node.name.identifier;
            usage_type = m_consts.US_STRUCT_TYPE;
        }
        break;
    }

    if (identifier !== null) {
        var data = {
            type: "id_usage",
            id_usage_id: identifier,
            id_usage_type: usage_type,
            id_usage_ast_uid: ast_node.uid,
            id_usage_is_reserved: m_reserved.is_reserved(identifier.name)
        }
        _collected_data.main_sequence.push(data);
    }
}

function push_include_data(include_status, include_name) {
    var data = {
        type: "include",
        include_status: include_status,
        include_name: include_name
    }
    _collected_data.main_sequence.push(data);
}

function push_scope_data(ast_node, scope_status) {
    var id_stack = _auxiliary_data.scopes_ids_stack;

    if (scope_status == m_consts.SCOPE_START) {
        var curr_id = ++_auxiliary_data.scopes_id_counter;
        id_stack.push(curr_id);
    } else if (scope_status == m_consts.SCOPE_END)
        var curr_id = id_stack.pop();

    var data = {
        type: "scope",
        scope_status: scope_status,
        scope_type: ast_node.node,
        scope_id: curr_id,
        scope_uid: ast_node.uid
    }
    _collected_data.main_sequence.push(data);
}

function push_nodes_lamps_main_data(type, is_beginning) {
    var data = {
        type: type,
        is_beginning: is_beginning
    }
    _collected_data.main_sequence.push(data);
}

function push_extension_data(ext_name, ext_behavior) {
    var data = {
        type: "extension",
        name: ext_name,
        behavior: ext_behavior
    }
    _collected_data.main_sequence.push(data);
}

/*==============================================================================
                             SERVICE ACTIONS
==============================================================================*/

/**
 * Fix includes closing in main_sequence
 * TODO: rewrite (with _curr_includes_stack analyzing) with filenames_stack analyzing 
 */
function fix_includes() {
    var opened_includes = [];

    var cb = function(main_sequence, index, ast_node, scopes_chain, 
            filenames_stack) {
        if (ast_node.type == "include")
            if (ast_node.include_status == m_consts.INCLUDE_START)
                opened_includes.push(ast_node);
            else
                opened_includes.pop();
    }
    traverse_collected_data(cb);

    for (var i = opened_includes.length - 1; i >= 0; i--) {
        var incl_data = {
            type: "include",
            include_status: m_consts.INCLUDE_END,
            include_name: opened_includes[i].include_name
        }
        _collected_data.main_sequence.push(incl_data);
        _curr_includes_stack.pop();
    }
}

/**
 * Fix obfuscation status collisions
 */
function fix_obf_collisions() {
    var redef_coll_types = [m_consts.DECL_VAR, m_consts.DECL_PARM_VAR, m_consts.DECL_STRUCT_TYPE]

    var scopes = {};
    var qualifiers = {};

    var cb = function(main_sequence, index, ast_node, scopes_chain, 
            filenames_stack) {
        if (ast_node.type == "declaration" 
                && redef_coll_types.indexOf(ast_node.decl_type) != -1) {
            var scope_id = ast_node.decl_in_scope;
            var name = ast_node.decl_id.name;
            var qual = ast_node.decl_id_type_qualifier;

            if (!(scope_id in scopes)) {
                scopes[scope_id] = {};
                qualifiers[scope_id] = {};
            }
            if (!(name in scopes[scope_id])) {
                scopes[scope_id][name] = [];
                qualifiers[scope_id][name] = [];
            }

            scopes[scope_id][name].push(ast_node);
            qualifiers[scope_id][name].push(qual);
        }
    }
    traverse_collected_data(cb);

    for (var scope_id in qualifiers) {
        for (var name in qualifiers[scope_id]) {
            var qual_array = qualifiers[scope_id][name];
            var state = pp_qual_run(qual_array);
            switch (state) {
            case m_consts.QUAL_OBFUSCATE:
                break;
            case m_consts.QUAL_OBFUSCATE_VARYING:
                for (var j = 0; j < scopes[scope_id][name].length; j++)
                    scopes[scope_id][name][j].decl_id_type_qualifier = "varying";
                break;
            case m_consts.QUAL_DONT_OBFUSCATE:
                for (var j = 0; j < scopes[scope_id][name].length; j++) {
                    scopes[scope_id][name][j].decl_id_type_qualifier = "uniform";
                    scopes[scope_id][name][j].decl_obfuscation_allowed = false;
                }
                break;
            case m_consts.QUAL_ERROR:
                m_debug.debug_message(m_consts.BAD_QUAL_COLLISION, 
                        get_current_file_name(), name);
                break;
            }
        }
    }
}

/**
 * Make links from structure to its fields and remove them from main_sequence
 */
function move_struct_fields() {
    var struct_scopes = {}

    var cb = function(main_sequence, index, ast_node, scopes_chain, 
            filenames_stack) {
        if (ast_node.type == "declaration" && ast_node.decl_id_type == "struct") {
            var scope_id = main_sequence[index - 1].scope_id;
            struct_scopes[index] = get_scope_boundaries(scope_id);
        }
    }
    traverse_collected_data(cb);

    for (var struct_index in struct_scopes) {
        var struct = _collected_data.main_sequence[struct_index];
        struct.fields = [];

        var bnd = struct_scopes[struct_index];
        if (bnd !== null) {
            for (var i = bnd[0] + 1; i < bnd[1]; i++) {
                struct.fields.push(_collected_data.main_sequence[i]);
                _collected_data.main_sequence[i] = null;
            }
            _collected_data.main_sequence[bnd[0]] = null;
            _collected_data.main_sequence[bnd[1]] = null;
        }
    }

    for (var i = _collected_data.main_sequence.length - 1; i >= 0; i--)
        if (_collected_data.main_sequence[i] === null)
            _collected_data.main_sequence.splice(i, 1);
}

/*==============================================================================
                        TRAVERSING COLLECTED DATA
==============================================================================*/

/**
 * Traverse data collected from the AST.
 * Return any positive value from callback to interrupt traversal.
 */
exports.traverse_collected_data = traverse_collected_data;
function traverse_collected_data(callback) {
    _curr_scopes_chain = [0];
    _curr_seq_index = -1;
    var filenames_stack = [_src_filename];

    for (var i = 0; i < _collected_data.main_sequence.length; i++) {
        var ast_node = _collected_data.main_sequence[i];
        _curr_seq_index = i;

        switch (ast_node.type) {
        case "include":
            if (ast_node.include_status == m_consts.INCLUDE_START)
                filenames_stack.push(ast_node.include_name);
            break;
        case "scope":
            if (ast_node.scope_status == m_consts.SCOPE_START)
                _curr_scopes_chain.push(ast_node.scope_id);
            break;
        }

        var res = callback(_collected_data.main_sequence, i, ast_node, 
                _curr_scopes_chain.slice(), filenames_stack.slice());

        switch (ast_node.type) {
        case "include":
            if (ast_node.include_status == m_consts.INCLUDE_END)
                filenames_stack.pop();
            break;
        case "scope":
            if (ast_node.scope_status == m_consts.SCOPE_END)
                _curr_scopes_chain.pop();
            break;
        }

        if (res)
            break;
    }
}

/*==============================================================================
                            AST DATA SEARCHING
==============================================================================*/

/**
 * Search declaration for some identifier.
 * NOTE: Intended for searching while traversing collected data
 */
exports.search_declaration = search_declaration;
function search_declaration(identifier_ast_uid, identifier_name, usage_type) {
    var decl = null;

    if (usage_type != m_consts.US_FIELD)
        for (var i = 0; i < _curr_seq_index; i++) {
            var data = _collected_data.main_sequence[i];
            if (data.type == "declaration"
                    && _curr_scopes_chain.indexOf(data.decl_in_scope) != -1
                    && get_origin_name(data.decl_id) == identifier_name)
                // last declaration needed
                decl = data;
        }
    else if (identifier_ast_uid !== null)
        decl = search_field_decl(identifier_ast_uid, identifier_name);

    return decl
}

function search_field_decl(field_ast_uid, field_name) {
    var field_decl = null;

    var struct_name = get_struct_name_by_field(field_ast_uid);

    if (struct_name) {
        var struct_type_decl = search_struct_type_decl(struct_name.penult_str_name);
        if (struct_type_decl)
            field_decl = get_struct_field_decl(struct_type_decl, field_name);
    }
    return field_decl;
}

function get_struct_name_by_field(field_ast_uid) {
    var struct_name = null;

    var parent_node = m_search.get_nearest_parent_by_uid(field_ast_uid);

    if (parent_node && parent_node.uid !== _ast_root_uid)
        struct_name = get_struct_name_by_parent(parent_node);

    return struct_name;
}

function get_struct_field_decl(struct_type_decl, field_name) {
    var field = null;

    if (struct_type_decl && struct_type_decl.decl_id_type == "struct")
        for (var i = 0; i < struct_type_decl.fields.length; i++) {
            var decl_name = get_origin_name(struct_type_decl.fields[i].decl_id);
            if (decl_name == field_name) {
                field = struct_type_decl.fields[i];
                break;
            }
        }

    return field;
}

function get_struct_name_by_parent(node, usage_type) {
    var s_name = null;

    switch(node.node) {
    case "postfix_expression":

        s_name = get_struct_name_by_parent(node.expression, m_consts.US_VAR);
        if (s_name)
            if (node.operator.node == "field_selection") {
                if (s_name.last_str_name)
                    s_name = s_name.last_str_name;

                var struct_type_decl = search_struct_type_decl(s_name);
                if (struct_type_decl) {
                    var name = get_origin_name(node.operator.identifier);
                    var field_decl = get_struct_field_decl(struct_type_decl, name);

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
            s_name = get_struct_name_by_parent(node.identifier.name.identifier, m_consts.US_FUNC_CALL);
            break;
        case "keyword_node":
            s_name = get_struct_name_by_parent(node.identifier.name, m_consts.US_FUNC_CALL);
            break;
        case "identifier":
            s_name = get_struct_name_by_parent(node.identifier, m_consts.US_FUNC_CALL);
            break;
        }
        break;
    case "primary_expression":
        s_name = get_struct_name_by_parent(node.expression, m_consts.US_VAR);
        break;
    case "paren_expression":
        s_name = get_struct_name_by_parent(node.expression, m_consts.US_VAR);
        break;
    case "identifier":
        var node_name = get_origin_name(node);
        var s_decl = search_declaration(node.uid, node_name, usage_type);
        if (s_decl)
            s_name = s_decl.decl_id_type;
        break;
    }

    return s_name;
}

function search_struct_type_decl(type_name) {
    return search_declaration(null, type_name, m_consts.US_STRUCT_TYPE);
}

/*==============================================================================
                       QUALIFIERS OBFUSCATION COLLISIONS
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
var QUAL_MATRIX = [
    {"attribute": 2, "uniform": 2, "varying": 1, "const": 0, null: 0},
    {"attribute": 3, "uniform": 3, "varying": 1, "const": 1, null: 1},
    {"attribute": 2, "uniform": 2, "varying": 3, "const": 2, null: 2},
    {"attribute": 3, "uniform": 3, "varying": 3, "const": 3, null: 3}
]
var _qual_init_state = 0;

function pp_qual_run(input) {
    var state = _qual_init_state;
    for (var i = 0; i < input.length; i++) {
        var symbol = input[i];
        state = QUAL_MATRIX[state][symbol]
        if (state == 3)
            break;
    }

    switch (state) {
    case 0:
        state = m_consts.QUAL_OBFUSCATE;
        break;
    case 1:
        state = m_consts.QUAL_OBFUSCATE_VARYING;
        break;
    case 2:
        state = m_consts.QUAL_DONT_OBFUSCATE;
        break;
    case 3:
        state = m_consts.QUAL_ERROR;
        break;
    }

    return state;
}

/*==============================================================================
                                    UTILS
==============================================================================*/

function get_scope_boundaries(scope_id) {
    var from = null;
    var to = null;

    var cb = function(main_sequence, index, ast_node, scopes_chain, 
            filenames_stack) {
        if (from !== null && to !== null)
            return true;

        if (ast_node.type == "scope" && ast_node.scope_id == scope_id) {
            if (ast_node.scope_status == m_consts.SCOPE_START)
                from = index;
            else if (ast_node.scope_status == m_consts.SCOPE_END)
                to = index;
        }
    }
    traverse_collected_data(cb);

    if (from !== null && to !== null)
        return [from, to];
    else
        return null;
}

function get_type_name(ast_node) {
    var type = ast_node.type_specifier.name;

    switch(type.node) {
    case "keyword_node":
        return type.name;
    case "struct_type":
        return type.identifier.name;
    case "struct_specifier":
        return type.struct_type.identifier.name;
    default:
        return null;
    }
}

function get_type_qualifier(ast_node) {
    var qual = null;

    var type = ast_node.type_qualifier;
    if (type) {
        var inst = get_instance(type.value);
        switch(inst) {
        case m_consts.ARRAY_DATA:
            qual = m_consts.VARYING;
            break;
        case m_consts.OBJECT_DATA:
            qual = type.value.name;
            break;
        }
    }

    return qual;
}

function get_instance(data) {
    if (data === null)
        return m_consts.OTHER_DATA;
    else if(data instanceof Array)
        return m_consts.ARRAY_DATA;
    else if(data instanceof Object)
        return m_consts.OBJECT_DATA;
    else
        return m_consts.OTHER_DATA;
}

// TODO: move to obfuscator
function allow_qualifier_obfuscation(qual) {
    var res = true;
    if (qual == m_consts.UNIFORM || qual == m_consts.ATTRIBUTE)
        res = false;
    return res;
}

function get_current_file_name() {
    return _curr_includes_stack.length 
            && _curr_includes_stack[_curr_includes_stack.length - 1] 
            || _src_filename;
}

// TODO: copypasted from ast_processor.js
function get_origin_name(id) {
    return id.old_name ? id.old_name : id.name;
}
