/**
 * Optimization procedures
 * @name optimizator
 */

var m_search  = require("./ast_search.js");
var m_trav    = require("./ast_traversal.js");

/**
 * Delete unused braces. Doesn't change the structure of AST.
 */
exports.delete_unused_braces = function(ast_data) {
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
    m_trav.traverse_data(ast_data.ast, cb_before, cb_after);
} 
