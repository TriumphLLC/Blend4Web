/**
 * Performs AST obfuscation.
 * @name obfuscator
 */

var m_collect  = require("./ast_data_collector.js");
var m_reserved = require("./reserved_tokens.js");
var m_search   = require("./ast_search.js");


var GEN_SOURCE = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
var _generator_counter = 0;

exports.obfuscate = function(files, vardef_ids) {
    var obf_info = {};

    var append_name = function(name, can_obfuscate) {
        if (!(name in obf_info))
            obf_info[name] = { can_obfuscate: true, new_name: null };
        obf_info[name].can_obfuscate = obf_info[name].can_obfuscate && can_obfuscate;
    }

    var collect_cb = function(main_sequence, index, seq_node, scopes_chain, 
            filenames_stack) {
        if (seq_node.type == "declaration") {
            append_name(seq_node.decl_id.name, seq_node.decl_obfuscation_allowed);
            if (seq_node.decl_id_type == "struct")
                for (var i = 0; i < seq_node.fields.length; i++)
                    append_name(seq_node.fields[i].decl_id.name, 
                            seq_node.fields[i].decl_obfuscation_allowed);
        }
    }

    for (var i = 0; i < files.length; i++) {
        m_collect.init_ast(files[i].ast_data, vardef_ids, files[i].name, 
                files[i].type);
        m_collect.collect();
        m_collect.traverse_collected_data(collect_cb);
    }

    var get_new_name = function(old_name) {
        var new_name = old_name;

        if (obf_info[old_name] && obf_info[old_name].can_obfuscate) {
            if (!obf_info[old_name].new_name)
                obf_info[old_name].new_name = generate_name();

            new_name = obf_info[old_name].new_name;
        }
        return new_name;
    }

    var obfuscate_cb = function(main_sequence, index, seq_node, scopes_chain, 
            filenames_stack) {

        if (seq_node.type == "id_usage") {
            var name = seq_node.id_usage_id.name;
            seq_node.id_usage_id.old_name = name;
            seq_node.id_usage_id.name = get_new_name(name);
        }

        if (seq_node.type == "declaration") {
            var name = seq_node.decl_id.name;
            seq_node.decl_id.old_name = name;
            seq_node.decl_id.name = get_new_name(name);

            if (seq_node.decl_id_type == "struct")
                for (var i = 0; i < seq_node.fields.length; i++) {
                    var name = seq_node.fields[i].decl_id.name;
                    seq_node.fields[i].decl_id.old_name = name;
                    seq_node.fields[i].decl_id.name = get_new_name(name);
                }
        }
    }

    for (var i = 0; i < files.length; i++) {
        m_collect.init_ast(files[i].ast_data, vardef_ids, files[i].name, 
                files[i].type);
        m_collect.collect();
        m_collect.traverse_collected_data(obfuscate_cb);
        // must be done after obfuscation
        update_node_conditions(files[i].ast_data);
    }
}

// Update directives from obfuscated or node_*_var_* names
function update_node_conditions(ast_data) {
    // {node_name: {old_name: new_name}}
    var new_old_inout_ids = {};

    var cb = function(main_sequence, index, seq_node, scopes_chain, 
            filenames_stack) {
        if (seq_node.type == "declaration") {
            var name = get_origin_name(seq_node.decl_id);
            var expr_node_inout_old_name = /node_(.*?)_var_(.*)/g;
            if (res = expr_node_inout_old_name.exec(name)) {

                var node_name = res[1];
                var origin_name = res[2];
                var replacer_name = seq_node.decl_id.name;

                if (!new_old_inout_ids[node_name])
                    new_old_inout_ids[node_name] = {};

                new_old_inout_ids[node_name][origin_name] = replacer_name;
            }
        }
    }
    m_collect.traverse_collected_data(cb);

    for (var i in ast_data.node_with_node_condition) {
        var node_uid = ast_data.node_with_node_condition[i];
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

function generate_name(counter) {
    if (typeof counter !== "undefined")
        _generator_counter = counter;

    var digits = charcodes_by_number(_generator_counter, GEN_SOURCE.length);
    var result = "";

    for (var i = 0; i < digits.length; i++) {
        if (digits.length > 1 && i == 0)
            // equivalent to 0,1,2,3,4,5,6,7,8,9,00,01,...
            result += GEN_SOURCE.charAt(digits[i] - 1);
        else
            result += GEN_SOURCE.charAt(digits[i]);
    }
    _generator_counter++;

    if (!is_valid(result))
        result = generate_name();
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
    return !(m_reserved.is_reserved(str) || m_reserved.is_vardef(str) 
            || m_reserved.is_b4w_specific(str) || m_reserved.is_vector_accessor(str));
}

function get_origin_name(id) {
    return id.old_name ? id.old_name : id.name;
}

// not used
exports.cleanup = function() {
    _generator_counter = 0;
}