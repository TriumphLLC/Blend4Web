/**
 * Optimization procedures which change shader AST.
 * @name optimizator
 */

var m_collect = require("./ast_data_collector.js");
var m_search  = require("./ast_search.js");
var m_trans   = require("./ast_translator.js");
var m_trav    = require("./ast_traversal.js");
var m_consts  = require("./consts.js");
var m_glsl    = require("./glsl_parser.js");

exports.optimize_declarations = function(max_uid) {
    // {id: [{scope: declaration_scope, 
    //        type: type, 
    //        global_id: global_id}]}
    // [{scope: declaration_scope, type: type, global_id: global_id}] --- stack of definitions
    var id_to_global_id = {};

    // {type: [id]}
    var free_global_id = {};

    // {type: next_id}
    var next_num_ident = {};

    var is_in_function = false;
    var is_in_iteration = false;
    var is_in_nodes_main = false;
    // {uid: 1}
    var out_nodes_main_ident = {};
    var names_should_be_freed = {};

    set_last_usage();

    var cb = function(main_sequence, index, ast_node, scopes_chain, 
            filenames_stack) {

        switch (ast_node.type) {
        case "declaration":
            if (is_in_function) {
                if (!is_in_nodes_main)
                    out_nodes_main_ident[ast_node.decl_id.name] = 1;

                if (ast_node.decl_type == m_consts.DECL_VAR 
                        && !ast_node.decl_id_type_qualifier
                        && !ast_node.decl_node_inoutparam) {

                    // NOTE: don't optimize "for_init_statement" 
                    // see GLSL ES 1.0 (Appendix A: Limitations for ES 2.0)
                    var parent = m_search.get_nearest_parent_by_uid(ast_node.decl_id.uid, 
                            ["for_init_statement", "statement_list"]);
                    if (parent.node == "for_init_statement")
                        break;

                    // NOTE: don't optimize structure variable
                    if (m_collect.search_declaration(null,
                            ast_node.decl_id_type, m_consts.US_STRUCT_TYPE))
                        break;
                    
                    // NOTE: don't optimize array
                    if (ast_node.decl_id.type == "array")
                        break;

                    // NOTE: don't optimize variable declared with replaceable type or name
                    parent = m_search.get_nearest_parent_by_uid(ast_node.decl_id.uid, 
                            ["simple_statement"])
                    parent_smpl = m_search.get_nearest_parent_by_node(parent)
                    var node = m_search.get_node_by_uid(ast_node.decl_id.uid)
                    var all_comments = parent_smpl.before_comments.concat(node.before_comments);
                    if (all_comments.length) {
                        var repl_begin_expr = /\/\*%replace%from%(.*?)%to%(.*?)%\*\//gi;
                        var found = false;

                        for (var i = 0; i < all_comments.length; i++) {
                            if (repl_begin_expr.exec(all_comments[i])) {
                                found = true;
                                break;
                            }
                        }
                        if (found)
                            break;
                    }

                    // NOTE: id_to_global_id[ast_node.decl_id.name] 
                    //          && get_last_list_elem(id_to_global_id[ast_node.decl_id.name])["scope"] == ast_node.decl_in_scope
                    //      is mean that ast_node is second declaration in scope (#if)
                    if (!id_to_global_id[ast_node.decl_id.name]
                            || get_last_list_elem(id_to_global_id[ast_node.decl_id.name])["scope"] 
                                    != ast_node.decl_in_scope) {

                        if (free_global_id[ast_node.decl_id_type] 
                                && free_global_id[ast_node.decl_id_type].length)
                            var func_global_id = free_global_id[ast_node.decl_id_type].shift();
                        else {
                            // construct name of the new "global" variable
                            next_num_ident[ast_node.decl_id_type] = (next_num_ident[ast_node.decl_id_type] || 0) + 1;
                            var func_global_id = "_" + ast_node.decl_id_type + "_tmp" + 
                                    next_num_ident[ast_node.decl_id_type];
                        }

                        if (!id_to_global_id[ast_node.decl_id.name])
                            id_to_global_id[ast_node.decl_id.name] = [];


                        id_to_global_id[ast_node.decl_id.name].push({
                            scope: ast_node.decl_in_scope,
                            type: ast_node.decl_id_type,
                            global_id: func_global_id
                        });
                    }

                    // free unused "global" variable
                    if (ast_node.is_last_usage) {
                        if (!free_global_id[ast_node.decl_id_type])
                            free_global_id[ast_node.decl_id_type] = [];
                        free_global_id[ast_node.decl_id_type].unshift(func_global_id);
                    }

                    // change ast
                    var declaration_expr_node = m_search.get_node_by_uid(ast_node.decl_id.uid);
                    var last_definition = get_last_list_elem(id_to_global_id[ast_node.decl_id.name]);
                    declaration_expr_node.name = last_definition["global_id"];

                    var parent_child = m_search.get_nearest_parent_child_by_node(
                            declaration_expr_node, ["declarator_list"]); 
                    var parent = m_search.get_nearest_parent_by_node(
                            declaration_expr_node, ["init_declarator_list"]);
                    
                    var index = parent.list.vars.indexOf(parent_child);
                    if (index == parent.list.vars.length - 1 ) {
                        var expression_src = m_trans.decl_to_exp(parent);
                        var expression_statement_node = m_glsl.parse(expression_src, 
                                {startRule: "expression_statement_start", init_node_uid: max_uid + 1});
                        max_uid = expression_statement_node.uid;

                        var declaration_stat_node = m_search.get_nearest_parent_by_node(
                            parent, ["declaration_statement"]);
                        var declaration_stat_parent_node = m_search.get_nearest_parent_by_node(
                            declaration_stat_node);

                        declaration_stat_parent_node.statement = expression_statement_node;
                        expression_statement_node.parent_uid = declaration_stat_parent_node.uid;
                    }
                }
            }
            break;
        case "id_usage":
            if (is_in_function) {
                var curr_scope = scopes_chain[scopes_chain.length - 1];

                if (ast_node.id_usage_type == m_consts.US_VAR
                        && ast_node.id_usage_id.node == "identifier" 
                        && id_to_global_id[ast_node.id_usage_id.name] 
                        && get_last_list_elem(id_to_global_id[ast_node.id_usage_id.name])) {

                    var last_definition = get_last_list_elem(id_to_global_id[ast_node.id_usage_id.name]);

                    // free unused "global" variable
                    if (ast_node.is_last_usage && !is_in_iteration && (!is_in_nodes_main
                            || !(ast_node.id_usage_id.name in out_nodes_main_ident))) {
                        if (!free_global_id[last_definition["type"]])
                            free_global_id[last_definition["type"]] = [];
                        free_global_id[last_definition["type"]].unshift(last_definition["global_id"]);
                    } else if (is_in_nodes_main 
                            && ast_node.id_usage_id.name in out_nodes_main_ident) {
                        if (!names_should_be_freed[last_definition["type"]])
                            names_should_be_freed[last_definition["type"]] = [];
                        names_should_be_freed[last_definition["type"]].push(last_definition["global_id"]);
                    }
                    ast_node.id_usage_id.name = last_definition["global_id"];
                } 
            }
            break;
        case "scope":
            if (ast_node.scope_type == "function_scope") {
                if (ast_node.scope_status == m_consts.SCOPE_START)
                    is_in_function = true;
                else if (ast_node.scope_status == m_consts.SCOPE_END) {
                    // declaration of "global" variables
                    for (var type in next_num_ident) {
                        var new_declaration_str = type + " ";
                        var first_decl = true;

                        for (var j = 1; j <= next_num_ident[type]; j++) {
                            if (j != 1)
                                new_declaration_str += ",";    
                            new_declaration_str += "_" + type + "_tmp" + j;
                        
                        }
                        new_declaration_str += ";";
                        var new_decl_list = m_glsl.parse(new_declaration_str, 
                                { startRule: "statement_no_new_scope_start", init_node_uid: max_uid + 1});

                        // NOTE: scope_node.body.list.list --- a place after a brace of the function
                        var scope_node = m_search.get_node_by_uid(ast_node.scope_uid);
                        scope_node.body.list.list.unshift(new_decl_list);
                        max_uid = new_decl_list.uid;                        
                    }

                    is_in_function = false;
                    id_to_global_id = {};
                    free_global_id = {};
                    names_should_be_freed = {};
                    next_num_ident = {};
                    out_nodes_main_ident = {};
                }
            } else if (ast_node.scope_status == m_consts.SCOPE_END) {
                for (var name in id_to_global_id) {
                    var last_definition = get_last_list_elem(id_to_global_id[name]);

                    if (last_definition["scope"] == ast_node.scope_uid)
                        id_to_global_id[name].pop();
                } 
            }
            

            if (ast_node.scope_status == m_consts.SCOPE_START)
                is_in_iteration |= ast_node.scope_type == "iteration_statement";
            else
                is_in_iteration = m_search.get_nearest_parent_by_uid( 
                    ast_node.scope_uid, ["iteration_statement"]) ? true: false;
            break;
        case "nodes_main":
            is_in_nodes_main = ast_node.is_beginning;
            if (!ast_node.is_beginning)
                out_nodes_main_ident = {};
            else
                for (var type in names_should_be_freed)
                    free_global_id.unshift.apply(free_global_id, names_should_be_freed[type]);
            break;
        }
    }
    m_collect.traverse_collected_data(cb);
}

function set_last_usage() {
    // {id: [{scope: declaration_scope,
    //        data:  data}]}
    // [{scope: declaration_scope, data:  data}] --- stack of definitions
    var last_usage = {};
    var is_in_function = false;

    var cb = function(main_sequence, index, ast_node, scopes_chain, 
            filenames_stack) {
        var curr_scope = scopes_chain[scopes_chain.length - 1];

        switch (ast_node.type) {
        case "scope":
            if (ast_node.scope_status == m_consts.SCOPE_START) {
                if (ast_node.scope_type == "function_scope")
                    is_in_function = true;
            } else if (ast_node.scope_status == m_consts.SCOPE_END) {
                if (ast_node.scope_type == "function_scope") {
                    is_in_function = false;
                    last_usage = {};
                }

                for (var id in last_usage) {
                    var last_usage_in_scope = get_last_list_elem(last_usage[id]);
                    if (last_usage_in_scope) 
                        if (last_usage_in_scope.scope == curr_scope) {
                            last_usage_in_scope.is_last_usage = true;
                            last_usage[id].pop();
                        } else {
                            last_usage_in_scope.is_last_usage = false;
                        }
                }
            }
            break;
        case "declaration":
            if (!is_in_function)
                break;
            if (ast_node.decl_id.node == "identifier"
                    && ast_node.decl_type == m_consts.DECL_VAR) {
                if (!last_usage[ast_node.decl_id.name])
                    last_usage[ast_node.decl_id.name] = [];
                ast_node.is_last_usage = true; 

                var last_usage_in_scope = get_last_list_elem(last_usage[ast_node.decl_id.name]); 
                if (!last_usage_in_scope || last_usage_in_scope.scope != curr_scope)
                        last_usage[ast_node.decl_id.name].push({scope: curr_scope, data: ast_node});
                else if (last_usage_in_scope.scope == curr_scope) {
                    last_usage_in_scope.data.is_last_usage = false;
                    last_usage_in_scope.data = ast_node;
                }
            }
            break;
        case "id_usage":
            if (!is_in_function)
                break;
            if (ast_node.id_usage_id.node == "identifier"
                    && ast_node.id_usage_type == m_consts.US_VAR) {
                var last_usage_in_scope = get_last_list_elem(last_usage[ast_node.id_usage_id.name]);
                if (last_usage_in_scope) {
                    ast_node.is_last_usage = true;
                    last_usage_in_scope.data.is_last_usage = false;
                    last_usage_in_scope.data = ast_node;
                }
            }
            break;
        }
    }
    m_collect.traverse_collected_data(cb);
}

/**
 * Delete unused braces. Doesn't changes structure of AST.
 */
exports.delete_unused_braces = function(ast) {
    // compound_statement_with_scope could have braces that might be removed  
    var scope_stack = [];

    cb_before = function(ast_node) {
        if (ast_node.new_scope) 
            scope_stack.push(ast_node);
        switch (ast_node.node) {
        case "compound_statement_with_scope":
            ast_node.without_braces = true;
            break;
        case "declaration_statement":
            // Don't remove braces of compound_statement_with_scope containing declaration_statement

            if (scope_stack.length > 0) {
                var last_scope = scope_stack[scope_stack.length - 1];

                if (last_scope && last_scope.node == "compound_statement_with_scope") {
                    last_scope.without_braces = false;
                }
            }
            break;
        }
    }

    cb_after = function(ast_node) {
        if (ast_node.new_scope)
            scope_stack.pop();
    }
    m_trav.traverse_data(ast, cb_before, cb_after);
} 

function get_last_list_elem(list) {
    if (list && list.length)
        return list[list.length - 1];
    return null;
}
