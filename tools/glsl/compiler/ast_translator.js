var var_replacements = {}, directives = {}, node_directives = {}, 
        lamp_directives = {}, data_to_remove = {}, last_offset = 0;

var EMPTY_AST = -1;

exports.translate = function(ast) {
    init_globals(ast);
    var text = translation_unit(ast['result']);
    text = remove_odd_data(text);
    text = return_vardef(text);
    text = return_nodes(text);
    text = return_lamps(text);
    return text;
}

/*============================================================================
                                  RULES
============================================================================*/
function translation_unit(ast) {
    if (ast.length == 0)
        var text = get_special_comments(EMPTY_AST);
    else {
        var text = get_special_comments(0);

        for (var i = 0; i < ast.length; i++) {
            var unit = ast[i];
            text += external_declaration(unit);
        }
    }

    text = add_last_special_comments(text);

    return text;
}

function external_declaration(node) {
    var text = get_special_comments(node.offset);

    switch(node.decl.node) {
    case "function_definition":
        text += function_definition(node.decl);
        break;
    default:
        text += declaration(node.decl);
        break;
    }
   
    return text;
}

function declaration(node) {
    var text = get_special_comments(node.offset);

    switch(node.node) {
    case "function_declaration":
        text += function_declarator(node.function);
        text += punctuation(node.punctuation.semicolon);
        break;      
    case "init_declarator_list":
        text += init_declarator_list(node.list);
        text += punctuation(node.punctuation.semicolon);
        break;
    case "precision_declaration":
        text += keyword(node.keywords.key_precision) + " ";
        text += precision_qualifier(node.precision) + " ";
        text += type_specifier_no_prec(node.type);
        text += punctuation(node.punctuation.semicolon);
        break;
    }

    return text;
}

function init_declarator_list(node) {
    var text = get_special_comments(node.offset);

    for (var i = 0; i < node.vars.length; i++) {
        if (i == 0)
            text += single_declaration(node.vars[i]);
        else {
            text += punctuation(node.vars[i].punctuation.comma);
            text += identifier(node.vars[i].identifier);
            if (node.vars[i].identifier.array_size) {
                text += punctuation(node.vars[i].identifier.punctuation.left_bracket);
                text += constant_expression(node.vars[i].identifier.array_size);
                text += punctuation(node.vars[i].identifier.punctuation.right_bracket);
            }
            else if (node.vars[i].initializer) {
                text += operation(node.vars[i].operation);
                text += initializer(node.vars[i].initializer);
            }
        }
    }

    return text;
}

function single_declaration(node) {
    var text = get_special_comments(node.offset);

    switch (node.subtype) {
    case "simple":
        text += fully_specified_type(node.type);
        if (node.identifier) {
            text += " " + identifier(node.identifier);
            if (node.identifier.array_size) {
                text += punctuation(node.identifier.punctuation.left_bracket); 
                text += constant_expression(node.identifier.array_size);
                text += punctuation(node.identifier.punctuation.right_bracket);
            }
            else if (node.initializer) {
                text += operation(node.operation);
                text += initializer(node.initializer);
            }
        }
        break;
    case "invariant":
        text += keyword(node.keywords.key_invariant) + " ";
        text += identifier(node.identifier);
        break;
    }

    return text;
}

function function_definition(node) {
    var text = get_special_comments(node.offset);

    text += function_head(node.head);
    text += function_scope(node.scope);

    return text;
}

function function_head(node) {
    var text = get_special_comments(node.offset);

    text += fully_specified_type(node.type);
    text += " " + identifier(node.identifier);

    return text;
}

function function_scope(node) {
    var text = get_special_comments(node.offset);

    text += function_parameters(node.parameters);
    text += compound_statement_no_new_scope(node.body);

    return text;   
}

function function_parameters(node) {
    var text = get_special_comments(node.offset);

    text += punctuation(node.punctuation.left_paren);
    for (var i = 0; i < node.parameters.length; i++) {
        var parm = node.parameters[i];
        if (i > 0)
            text += punctuation(node.parameters[i].punctuation.comma);
        text += parameter_declaration(parm);
    }
    text += punctuation(node.punctuation.right_paren);

    return text;
}

function function_declarator(node) {
    var text = get_special_comments(node.offset);

    text += function_head(node.head);
    text += function_parameters(node.parameters);

    return text;      
}

function compound_statement_no_new_scope(node) {
    return compound_statement_scope(node);
}

function compound_statement_with_scope(node) {
    return compound_statement_scope(node);
}

function statement_list(node) {
    var text = get_special_comments(node.offset);

    for (var i = 0; i < node.list.length; i++)
        text += statement_no_new_scope(node.list[i]);

    return text;
}

function statement_with_scope(node) {
    var text = get_special_comments(node.offset);

    switch(node.statement.node) {
    case "compound_statement_no_new_scope":
        text += compound_statement_no_new_scope(node.statement);
        break;
    case "simple_statement":
        text += simple_statement(node.statement);
    }

    return text;
}

function statement_no_new_scope(node) {
    var text = get_special_comments(node.offset);

    switch(node.statement.node) {
    case "compound_statement_with_scope":
        text += compound_statement_with_scope(node.statement);
        break;
    case "simple_statement":
        text += simple_statement(node.statement);
    }

    return text;
}

function simple_statement(node) {
    var text = get_special_comments(node.offset);

    switch(node.statement.node) {
    case "declaration_statement":
        text += declaration_statement(node.statement);
        break;
    case "expression_statement":
        text += expression_statement(node.statement);
        break;
    case "selection_statement":
        text += selection_statement(node.statement);
        break;
    case "iteration_statement":
        text += iteration_statement(node.statement);
        break;
    case "jump_statement":
        text += jump_statement(node.statement);
        break;
    }

    return text;
}

function expression_statement(node) {
    var text = get_special_comments(node.offset);

    if (node.statement)
        text += expression(node.statement);
    text += punctuation(node.punctuation.semicolon);

    return text;
}

function declaration_statement(node) {
    return declaration(node.statement);
}

function selection_statement(node) {
    var text = get_special_comments(node.offset);

    text += keyword(node.keywords.key_if);
    text += punctuation(node.punctuation.left_paren);
    text += expression(node.expression);
    text += punctuation(node.punctuation.right_paren);
    text += statement_with_scope(node.if_actions);
    if (node.else_actions) {
        text += keyword(node.keywords.key_else);
        if (node.else_actions.statement.node == "simple_statement")
            text += " ";
        text += statement_with_scope(node.else_actions);
    }

    return text;
}

function iteration_statement(node) {
    var text = get_special_comments(node.offset);

    switch (node.type) {
    case "while":
        text += keyword(node.keywords.key_while);
        text += punctuation(node.punctuation.left_paren);
        text += condition(node.condition);
        text += punctuation(node.punctuation.right_paren);

        switch (node.body.node) {
        case "compound_statement_no_new_scope":
            text += compound_statement_no_new_scope(node.body);
            break;
        case "simple_statement":
            text += simple_statement(node.body);
            break;
        }
        break;
    case "do_while":
        text += keyword(node.keywords.key_do);

        switch (node.body.node) {
        case "compound_statement_no_new_scope":
            text += compound_statement_no_new_scope(node.body);
            break;
        case "simple_statement":
            text += " " + simple_statement(node.body);
            break;
        }
        text += keyword(node.keywords.key_while);
        text += punctuation(node.punctuation.left_paren);
        text += expression(node.condition);
        text += punctuation(node.punctuation.right_paren);
        text += punctuation(node.punctuation.semicolon);
        break;
    case "for_loop":
        text += keyword(node.keywords.key_for);
        text += punctuation(node.punctuation.left_paren);
        text += for_init_statement(node.for_init_statement);
        text += for_rest_statement(node.for_rest_statement);
        text += punctuation(node.punctuation.right_paren);

        switch (node.body.node) {
        case "compound_statement_no_new_scope":
            text += compound_statement_no_new_scope(node.body);
            break;
        case "simple_statement":
            text += simple_statement(node.body);
            break;
        }
        break;
    }

    return text;
}

function jump_statement(node) {
    var text = get_special_comments(node.offset);

    text += keyword(node.type);
    if (node.returned_exp)
        text += " " + expression(node.returned_exp);
    text += punctuation(node.punctuation.semicolon);
    return text;
}

function condition(node) {
    var text = get_special_comments(node.offset);

    switch(node.condition.node) {
    case "condition_initializer":
        text += condition_initializer(node.condition);
        break;
    case "expression":
        text += expression(node.condition);
        break;
    }

    return text;
}

function condition_initializer(node) {
    var text = get_special_comments(node.offset);

    text += fully_specified_type(node.id_type) + " " + identifier(node.identifier);
    text += operation(node.operation);
    text += initializer(node.initializer);

    return text;
}

function initializer(node) {
    return assignment_expression(node);
}

function for_init_statement(node) {
    var text = get_special_comments(node.offset);

    switch (node.statement.node) {
    case "declaration_statement":
        text += declaration_statement(node.statement);
        break;
    case "expression_statement":
        text += expression_statement(node.statement);
        break;
    }

    return text;
}

function for_rest_statement(node) {
    var text = get_special_comments(node.offset);

    if (node.condition)
        text += condition(node.condition);
    text += punctuation(node.punctuation.semicolon);
    if (node.expression)
        text += expression(node.expression);

    return text;
}


function fully_specified_type(node) {
    var text = get_special_comments(node.offset);

    if (node.type_qualifier)
        text += type_qualifier(node.type_qualifier) + " " ;
    if (node.precision_qualifier)
        text += precision_qualifier(node.precision_qualifier) + " " ;

    text += type_specifier_no_prec(node.type_specifier);

    return text;
}

function identifier(node) {
    var text = get_special_comments(node.offset);

    text += node.name;
        
    return text;
}

function parameter_declaration(node) {
    var text = get_special_comments(node.offset);

    if (node.type_qualifier)
        text += type_qualifier(node.type_qualifier) + " ";
    if (node.parameter_qualifier)
        text += parameter_qualifier(node.parameter_qualifier) + " ";

    switch(node.parameter.node) {
    case "parameter_declarator":
        text += parameter_declarator(node.parameter);
        break;
    case "parameter_type_specifier":
        text += parameter_type_specifier(node.parameter);
        break;
    }

    return text;
}

function parameter_type_specifier(node) {
    var text = get_special_comments(node.offset);

    text += type_specifier(node.type);
    if (node.array_size) {
        text += punctuation(node.punctuation.left_bracket);
        text += constant_expression(node.array_size);
        text += punctuation(node.punctuation.right_bracket);
     }

    return text;
}

function type_qualifier(node) {
    var text = get_special_comments(node.offset);

    if (node.value instanceof Array)
        for (var i = 0; i < node.value.length; i++) {
            if (i > 0)
                text += " ";
            text += keyword(node.value[i]);
        }
    else
        text += keyword(node.value);

    return text;
}

function parameter_qualifier(node) {
    var text = get_special_comments(node.offset);
    return text + keyword(node.value);
}

function parameter_declarator(node) {
    var text = get_special_comments(node.offset);

    text += type_specifier(node.type) + " " + identifier(node.identifier);
    if (node.identifier.type == "array") {
        text += punctuation(node.identifier.punctuation.left_bracket);
        text += constant_expression(node.identifier.array_size);
        text += punctuation(node.identifier.punctuation.right_bracket);
    }

    return text;
}

function type_specifier(node) {
    var text = get_special_comments(node.offset);

    if (node.precision)
        text += precision_qualifier(node.precision) + " ";
    text += type_specifier_no_prec(node.type_specifier);

    return text;
}

function precision_qualifier(node) {
    var text = get_special_comments(node.offset);
    text += keyword(node.value);
    return text;
}

function type_specifier_no_prec(node) {
    var text = get_special_comments(node.offset);

    switch(node.name.node) {
    case "keyword_node":
        text += keyword(node.name);
        break;
    case "struct_type":
        text += struct_type(node.name);
        break;
    case "struct_specifier":
        text += struct_specifier(node.name);
        break;
    }

    return text;
}

function struct_specifier(node) {
    var text = get_special_comments(node.offset);

    text += keyword(node.keywords.key_struct);
    if (node.struct_type)
        text += " " + identifier(node.struct_type.identifier);
    text += punctuation(node.punctuation.left_brace);
    text += struct_declaration_list(node.declaration_list);
    text += punctuation(node.punctuation.right_brace);

    return text;
}

function struct_declaration_list(node) {
    var text = get_special_comments(node.offset);

    for (var i = 0; i < node.list.length; i++)
        text += struct_declaration(node.list[i]);

    return text;
}

function struct_declaration(node) {
    var text = get_special_comments(node.offset);

    text += type_specifier(node.type) + " ";
    text += struct_declarator_list(node.declarator_list);
    text += punctuation(node.punctuation.semicolon);

    return text;
}

function struct_declarator_list(node) {
    var text = get_special_comments(node.offset);

    for (var i = 0; i < node.list.length; i++) {
        if (i > 0)
            text += punctuation(node.list[i].punctuation.comma);
        text += struct_declarator(node.list[i]);
    }

    return text;
}

function struct_declarator(node) {
    var text = get_special_comments(node.offset);

    text += identifier(node.identifier);
    if (node.identifier.array_size) {
        text += punctuation(node.identifier.punctuation.left_bracket);
        text += constant_expression(node.identifier.array_size);
        text += punctuation(node.identifier.punctuation.right_bracket);
    }

    return text;
}

function constant_expression(node) {
    return conditional_expression(node);
}

function conditional_expression(node) {
    var text = get_special_comments(node.offset);

    text += exp_recursive_traverse(node.condition);

    if (node.if_true !== null) {
        text += punctuation(node.punctuation.question);
        text += exp_recursive_traverse(node.if_true);
        text += punctuation(node.punctuation.colon);
        text += exp_recursive_traverse(node.if_false);
    }

    return text;

}

function exp_recursive_traverse(node) {
    var text = "";

    switch (node.node) {
    // chainable expressions
    case "logical_or_expression":
    case "logical_xor_expression":
    case "logical_and_expression":
    case "inclusive_or_expression":
    case "exclusive_or_expression":
    case "and_expression":
    case "equality_expression":
    case "relational_expression":
    case "shift_expression":
    case "additive_expression":
    case "multiplicative_expression":
        text += exp_binary_common(node)
        break;
    // unary_expressions
    case "prefix_expression":
        text += prefix_expression(node);
        break;
    case "postfix_expression":
        text += postfix_expression(node);
        break;
    // primary_expression
    case "primary_expression":
        text += primary_expression(node);
        break;
    // function_call
    case "function_call":
        text += function_call(node);
        break;
    // other
    case "expression":
        text += expression(node);
        break;
    case "assignment_expression":
        text += assignment_expression(node);
        break;
    }

    return text;
}

function exp_binary_common(node) {
    var text = get_special_comments(node.offset);

    text += exp_recursive_traverse(node.left);
    text += operation(node.operator);
    text += exp_recursive_traverse(node.right);

    return text;
}

function prefix_expression(node) {
    var text = get_special_comments(node.offset);

    text += operation(node.operator);
    text += exp_recursive_traverse(node.expression);

    return text;
}

function postfix_expression(node) {
    var text = get_special_comments(node.offset);

    text += exp_recursive_traverse(node.expression);
    text += operation(node.operator);

    return text;
}

function primary_expression(node) {
    var text = get_special_comments(node.offset);
    
    var exp = node.expression;
    switch(exp.node) {
    case "float_constant":
    case "integer_constant":
    case "bool_constant":
        text += exp_constant(exp);
        break;
    case "identifier":
        text += identifier(exp);
        break;
    case "paren_expression":
        text += paren_expression(exp);
        break;
    }

    return text;
}

function exp_constant(node) {
    var text = get_special_comments(node.offset);
    return text + node.value;
}

function paren_expression(node) {
    var text = get_special_comments(node.offset);

    text += punctuation(node.punctuation.left_paren);
    text += expression(node.expression);
    text += punctuation(node.punctuation.right_paren);

    return text;
}


function operation(node) {
    var text = get_special_comments(node.offset);

    switch(node.node) {
    case "operation_node":
        text += node.data;
        break;
    case "field_selection":
        text += punctuation(node.punctuation.dot);
        text += identifier(node.identifier);
        break;
    case "index_accessor":
        text += punctuation(node.punctuation.left_bracket);
        text += expression(node.index);
        text += punctuation(node.punctuation.right_bracket);
        break;
    }
    return text;
}

function expression(node) {
    var text = get_special_comments(node.offset);
    for (var i = 0; i < node.list.length; i++) {
        if (i > 0)
            text += punctuation(node.list[i].punctuation.comma);
        text += exp_recursive_traverse(node.list[i]);
    }

    return text;
}

function assignment_expression(node) {
    var text = get_special_comments(node.offset);

    switch (node.left.node) {
    case "conditional_expression":
        text += conditional_expression(node.left);
        break;
    default:
        text += exp_recursive_traverse(node.left);
        break;
    }

    if (node.operator !== null) {
        text += operation(node.operator);
        text += assignment_expression(node.right);
    }

    return text;
}

function function_call(node) {
    var text = get_special_comments(node.offset);

    text += function_identifier(node.identifier);

    for (var i = 0; i < node.parameters.length; i++) {
        if (i > 0)
            text += punctuation(node.parameters[i].punctuation.comma);
        text += assignment_expression(node.parameters[i]);
    }

    text += punctuation(node.punctuation.right_paren);
    
    return text;
}

function function_identifier(node) {
    var text = get_special_comments(node.offset);

    switch(node.name.node) {
    // NOTE: every non-keyword function identifier (function call) was 
    // harmlessly parsed as a struct_type (constructor call)
    case "struct_type":
        text += struct_type(node.name);
        break;
    case "keyword_node":
        text += keyword(node.name);
        break;
    }
    text += punctuation(node.punctuation.left_paren);

    return text;
}

function struct_type(node) {
    var text = get_special_comments(node.offset);
    return text + identifier(node.identifier);
}

/*============================================================================
                                  SERVICE
============================================================================*/
// NOTE: import/export data doesn't convert into comments and doesn't return to source 

function get_special_comments(node_offset) {
    var text = "";

    if (node_offset || node_offset === 0) {
        var comments = [];
        var merged_comments = {};

        comments.push(get_comment(node_offset, directives, true, true));
        comments.push(get_comment(node_offset, node_directives, true, true));
        comments.push(get_comment(node_offset, lamp_directives, true, true));
        comments.push(get_comment(node_offset, var_replacements, false, false));
        comments.push(get_comment(node_offset, data_to_remove, true, false));

        for (var i = 0; i < comments.length; i++)
            for (var offset in comments[i])
                merged_comments[offset] = comments[i][offset];

        for (var offset in merged_comments)
            text += merged_comments[offset];

        last_offset = node_offset;
    } else
        console.warn('Node offset undefined');

    return text;
}

function get_comment(node_offset, comments_array, new_line, process_empty_ast) {
    var comments_data = {};
    
    for (var offset in comments_array) {
        if ((offset >= last_offset) && (offset <= node_offset)
                || (node_offset === EMPTY_AST && process_empty_ast)) {
            var text = comments_array[offset];
            if (new_line) {
                text = "\n" + text + "\n";
            }
            delete comments_array[offset];
            comments_data[offset] = text;
        }
    }
    
    return comments_data;
}

function add_last_special_comments(text) {
    for (var offset in var_replacements)
        text += var_replacements[offset];
    for (var offset in directives)
        text += "\n" + directives[offset] + "\n";
    for (var offset in node_directives)
        text += "\n" + node_directives[offset] + "\n";
    for (var offset in lamp_directives)
        text += "\n" + lamp_directives[offset] + "\n";

    return text;
}

function compound_statement_scope(node) {
    var text = get_special_comments(node.offset);
    text += punctuation(node.punctuation.left_brace);
    text += statement_list(node.list);
    text += punctuation(node.punctuation.right_brace);
    return text;
}

function punctuation(node) {
    var text = get_special_comments(node.offset);
    return text + node.data;
}

function keyword(node) {
    var text = get_special_comments(node.offset);
    return text + node.name;
}

function init_globals(ast) {
    if (ast.vars_repl)
        var_replacements = ast.vars_repl;
    if (ast.dirs)
        directives = ast.dirs;
    if (ast.node_dirs)
        node_directives = ast.node_dirs;
    if (ast.lamp_dirs)
        lamp_directives = ast.lamp_dirs;
    if (ast.to_remove)
        data_to_remove = ast.to_remove;
}

function remove_odd_data(text) {
    var expr = /\/\*%remove%nodes_main_duplicate%\*\/((?:.|[\s\S])*?)\/\*%remove_end%nodes_main_duplicate%\*\//gi;
    text = text.replace(expr, "#nodes_main");

    var expr = /\/\*%remove%(.*?)%\*\/((?:.|[\s\S])*?)\/\*%remove_end%(.*?)%\*\//gi;
    text = text.replace(expr, "");

    return text;
}

function return_vardef(text) {
    var expr = /\/\*%replace%from%(.*?)%to%(.*?)%\*\/.*?\/\*%replace_end%\*\//gi;
    text = text.replace(expr, " $1 ");

    expr = /  +/i
    text = text.replace(expr, " ");

    return text;
}

function return_nodes(text) {
    var node_tokens = {};

    var expr_node_inout_param = /\/\*%(node_in|node_out|node_param)%\*\/\s*((?:.|[\s\S])*?);\s*\/\*%(?:node_in_end|node_out_end|node_param_end)%(.*?)%(.*?)%(\d+)%\*\//gm;
    var expr_textlines = /\/\*%node_textline%(.*?)%\*\/((?:.|[\s\S])*?)\/\*%node_textline_end%(\d+)%\*\//g;
    var expr_condition = /\/\*%node_condition%((?:.|[\s\S])*?)%(.*?)%(\d+)%\*\//g;

    // get node_params, node_in, node_out, textline tokens
    while ((res = expr_node_inout_param.exec(text)) != null) {
        var type = res[1];
        var value = res[2];
        var is_optional = (res[3] === "true");
        var node_parent = res[4];
        var offset = parseInt(res[5]);
        if (!(node_parent in node_tokens))
            node_tokens[node_parent] = [];

        var text_str = "#" + type.trim() + (is_optional ? " optional ": " ") + value.trim() + "\n";
        node_tokens[node_parent].push({
            text: text_str,
            offset: offset
        });
    }

    while ((res = expr_textlines.exec(text)) != null) {
        var value = res[2];
        var node_parent = res[1];
        var offset = parseInt(res[3]);

        if (!(node_parent in node_tokens))
            node_tokens[node_parent] = [];
        node_tokens[node_parent].push({
            text: value.trim() + "\n",
            offset: offset            
        });
    }

    while ((res = expr_condition.exec(text)) != null) {
        var source_txt = res[1];
        var node_parent = res[2];
        var offset = parseInt(res[3]);
        if (!(node_parent in node_tokens))
            node_tokens[node_parent] = [];
        node_tokens[node_parent].push({
            text: source_txt + "\n",
            offset: offset
        });
    }

    for (var i in node_tokens) 
        node_tokens[i].sort( function(a, b) {
            return a.offset - b.offset;
        });

    
    // remove node_params, node_in, node_out, textlines comments
    text = text.replace(expr_node_inout_param, "");
    text = text.replace(expr_textlines, "");
    text = text.replace(expr_condition, "");

    // return node_params, node_in, node_out directives
    for (var node in node_tokens) {
        var expr_str = "(\\/\\*%node%" + node 
                + "%\\*\\/)((?:.|[\\s\\S])*?)(\\/\\*%endnode%\\*\\/)";
        expr = new RegExp(expr_str, "im");

        var nodes_txt = "";

        for (var i in node_tokens[node])
            nodes_txt += node_tokens[node][i].text
        var replacement = "$1$2" + nodes_txt + "\n" + "$3";
        text = text.replace(expr, replacement);
    }
    // return nodes_global, nodes_main directives after all node lines processed
    expr = /\/\*%(nodes_(?:global|main))%\*\/(?:.|[\s\S])*?\/\*%nodes_(?:global|main)_end%\*\//gi;
    text = text.replace(expr, "#$1");
    // return node, endnode directives
    expr = /\/\*%node%(.*?)%\*\//gi;
    text = text.replace(expr, "#node $1");
    expr = /\/\*%endnode%\*\//gi;
    text = text.replace(expr, "#endnode");
    return text;
}

function return_lamps(text) {
    var lamp_tokens = {};

    var expr_textlines = /\/\*%lamp_textline%(.*?)%\*\/((?:.|[\s\S])*?)\/\*%lamp_textline_end%(\d+)%\*\//g;

    // get textline tokens
    while ((res = expr_textlines.exec(text)) != null) {
        var value = res[2];
        var lamp_parent = res[1];
        var offset = parseInt(res[3]);

        if (!(lamp_parent in lamp_tokens))
            lamp_tokens[lamp_parent] = [];
        lamp_tokens[lamp_parent].push({
            text: value.trim() + "\n",
            offset: offset            
        });
    }

    for (var i in lamp_tokens) 
        lamp_tokens[i].sort( function(a, b) {
            return a.offset - b.offset;
        });

    // remove textlines comments
    text = text.replace(expr_textlines, "");

    // return lamp textlines
    for (var lamp_name in lamp_tokens) {
        var expr_str = "(\\/\\*%lamp%" + lamp_name 
                + "%\\*\\/)((?:.|[\\s\\S])*?)(\\/\\*%endlamp%\\*\\/)";
        expr = new RegExp(expr_str, "im");

        var lamps_str = "";
        for (var i = 0; i < lamp_tokens[lamp_name].length; i++)
            lamps_str += lamp_tokens[lamp_name][i].text;
        var replacement = "$1$2" + lamps_str + "\n" + "$3";
        text = text.replace(expr, replacement);
    }

    // return lamps_main directives after all lamp lines processed
    expr = /\/\*%(lamps_main)%\*\/(?:.|[\s\S])*?\/\*%lamps_main_end%\*\//gi;
    text = text.replace(expr, "#$1");
    // return lamp, endlamp directives
    expr = /\/\*%lamp%(.*?)%\*\//gi;
    text = text.replace(expr, "#lamp $1");
    expr = /\/\*%endlamp%\*\//gi;
    text = text.replace(expr, "#endlamp");

    return text;
}
