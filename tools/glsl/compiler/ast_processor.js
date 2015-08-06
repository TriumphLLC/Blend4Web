/**
 * Processing AST.
 * @name ast_processor
 */

var m_collect     = require("./ast_data_collector.js");
var m_search      = require("./ast_search.js");
var m_obfuscator  = require("./obfuscator.js");
var m_optimizator = require("./optimizator.js");
var m_reserved    = require("./reserved_tokens.js");
var m_valid       = require("./validator.js");

exports.config = {};

exports.run = function(ast_input, reserved_ids, filename) {
    init_data(ast_input, reserved_ids, filename);
    process_ast(ast_input);
    return ast_input;
}

function init_data(ast_input, reserved_ids, filename) {
    m_collect.init(ast_input, filename);
    m_search.set_uids(ast_input.uid_to_nodes);
    m_reserved.set_vardef_tokens(reserved_ids);
    m_valid.init(filename);
}

function process_ast(ast_input) {
    m_collect.collect(ast_input);

    m_valid.collect_dead_func_info();
    m_valid.collect_dead_vars_info();
    m_valid.collect_import_export_data(ast_input.import_export);
    m_valid.check_extensions();

    if (exports.config.optimize_decl)
        m_optimizator.optimize_declarations(ast_input.ast.uid);
    if (exports.config.remove_braces)
        m_optimizator.delete_unused_braces(ast_input.ast);

    // recalc uids and collect data again after changing the AST
    m_search.recalc_ast_uids(ast_input);
    m_collect.collect(ast_input);

    if (exports.config.obfuscate)
        m_obfuscator.obfuscate();

    update_node_conditions(ast_input);
}

/*==============================================================================
                            SERVICE ACTIONS
==============================================================================*/

// Update directives from obfuscated or node_*_var_* names
function update_node_conditions(ast_input) {
    // {node_name: {old_name: new_name}}
    var new_old_inout_ids = {};

    var cb = function(main_sequence, index, ast_node, scopes_chain, 
            filenames_stack) {
        if (ast_node.type == "declaration") {
            var name = get_origin_name(ast_node.decl_id);
            var expr_node_inout_old_name = /node_(.*?)_var_(.*)/g;
            if (res = expr_node_inout_old_name.exec(name)) {

                var node_name = res[1];
                var origin_name = res[2];
                var replacer_name = ast_node.decl_id.name;

                if (!new_old_inout_ids[node_name])
                    new_old_inout_ids[node_name] = {};

                new_old_inout_ids[node_name][origin_name] = replacer_name;
            }
        }
    }
    m_collect.traverse_collected_data(cb);

    for (var i in ast_input.node_with_node_condition) {
        var node_uid = ast_input.node_with_node_condition[i];
        var node = m_search.get_node_by_uid(node_uid);

        for (var j in node.before_comments) {
            var expr_node_condition = /\n\/\*%node_condition%(.*?)%(.*?)%(.*?)%\*\/\n/g;
            var expr_contain_use_decl = /USE_OUT_(.*?)([^_0-9a-zA-Z]|$)/g;

            if ((res = expr_node_condition.exec(node.before_comments[j])) != null) {
                var source_txt = res[1];
                var node_name = res[2];
                
                while ((parts = expr_contain_use_decl.exec(source_txt)) != null) {
                    var origin_name = parts[1];
                    if (node_name in new_old_inout_ids) {
                        var replacer_name = new_old_inout_ids[node_name][origin_name];

                        node.before_comments[j] = node.before_comments[j].replace(
                                new RegExp("\(USE_OUT_\)" + origin_name), 
                                "$1" + replacer_name)
                    }
                }
            }
        }
    }
}

function get_origin_name(id) {
    return id.old_name ? id.old_name : id.name;
}
