/**
 * Performs AST obfuscation.
 * @name obfuscator
 */

var m_collect  = require("./ast_data_collector.js");
var m_consts   = require("./consts.js");
var m_reserved = require("./reserved_tokens.js");

var _varyings_aliases = {};
var _shared_ids_data = [];
var _incl_shared_stack = [null];

var GEN_SOURCE = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
var _id_generator = {
    generator_counter: 0,
    id_stash: []
}

exports.obfuscate = function() {
    id_generator_cleanup();

    var cb = function(main_sequence, index, ast_node, scopes_chain, 
            filenames_stack) {
        switch (ast_node.type) {
        case "declaration":

            if (ast_node.decl_obfuscation_allowed) {
                ast_node.decl_id.old_name = ast_node.decl_id.name;
                ast_node.decl_id.name = null;

                if (ast_node.decl_id_type_qualifier == "varying") {
                    if (ast_node.decl_id.old_name in _varyings_aliases)
                        ast_node.decl_id.name = _varyings_aliases[ast_node.decl_id.old_name];
                    else {
                        var counter = get_id_above_shared(_id_generator.generator_counter);
                        ast_node.decl_id.name = generate_id(counter);
                        push_shared_id(ast_node.decl_id.old_name, 
                                _id_generator.generator_counter - 1, 
                                m_consts.SHARED_VARYING);
                        push_shared_id(ast_node.decl_id.old_name, 
                                _id_generator.generator_counter, 
                                m_consts.SHARED_VARYING);
                        _varyings_aliases[ast_node.decl_id.old_name] = ast_node.decl_id.name;
                    }
                } else {
                    // check existed ids for overloaded functions, definitions and declarations
                    // for the same function, preprocessing branching with same declarations, ...
                    for (var j = 0; j < index; j++) {
                        var ex_data = main_sequence[j];
                        if (ex_data.type == "declaration" 
                                && ex_data.decl_in_scope == ast_node.decl_in_scope)
                            if (ex_data.decl_id.old_name == ast_node.decl_id.old_name) {
                                ast_node.decl_id.name = ex_data.decl_id.name;
                                break;
                            }
                    }
                    if (ast_node.decl_id.name === null)
                        ast_node.decl_id.name = generate_id();
                }
            }

            if (ast_node.decl_id_type == "struct") {
                interrupt_gen_id(0);
                for (var j = 0; j < ast_node.fields.length; j++) {
                    ast_node.fields[j].decl_id.old_name = ast_node.fields[j].decl_id.name;
                    ast_node.fields[j].decl_id.name = generate_id();
                }
                restore_gen_id();
            }

            break;

        case "id_usage":
            if (!ast_node.id_usage_is_reserved) {
                var decl = m_collect.search_declaration(ast_node.id_usage_ast_uid,
                        ast_node.id_usage_id.name, ast_node.id_usage_type);

                if (decl && decl.decl_obfuscation_allowed) {
                    ast_node.id_usage_id.old_name = ast_node.id_usage_id.name;
                    ast_node.id_usage_id.name = decl.decl_id.name;
                }
            }
            break;

        case "include":
            if (ast_node.include_status == m_consts.INCLUDE_START) {
                var sh_data = search_shared_data(ast_node.include_name, m_consts.SHARED_INCLUDE);
                if (sh_data)
                    var id = sh_data.ids[0];
                else {
                    var id = get_id_above_shared(_id_generator.generator_counter);
                    push_shared_id(ast_node.include_name, id, m_consts.SHARED_INCLUDE);
                }
                interrupt_gen_id(id);
                _incl_shared_stack.push(ast_node.include_name);
            } else {
                var sh_data = search_shared_data(ast_node.include_name, m_consts.SHARED_INCLUDE);
                push_shared_id(ast_node.include_name, _id_generator.generator_counter, m_consts.SHARED_INCLUDE);
                restore_gen_id();
                _incl_shared_stack.pop();
            }
            break;
        }
    }
    m_collect.traverse_collected_data(cb);
}

/*==============================================================================
                      INCLUDE AND VARYING DATA MANAGING
==============================================================================*/

function search_shared_data(name, type) {
    for (var i = 0; i < _shared_ids_data.length; i++) {
        var data = _shared_ids_data[i];
        if (data.name == name && data.type == type)
            return data;
    }

    return null;
}

function push_shared_id(name, id, type) {
    var id_processed = false;

    for (var i = 0; i < _shared_ids_data.length; i++) {
        var data = _shared_ids_data[i];
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
        _shared_ids_data.push({
            type: type,
            name: name,
            ids: [id]
        });
}

// get first free id
function get_not_shared_id(curr_id) {
    var out_id = curr_id;
    var curr_incl_name = _incl_shared_stack[_incl_shared_stack.length - 1];

    for (var i = 0; i < _shared_ids_data.length; i++) {
        // NOTE: take into account all shared identifiers when we're outside an 
        // include and only varying identifiers when inside
        if (curr_incl_name === null || _shared_ids_data[i].type == m_consts.SHARED_VARYING) {
            var ids = _shared_ids_data[i].ids;
            if (curr_id >= ids[0] && curr_id < ids[1]) {
                out_id = get_not_shared_id(ids[1]);
                break;
            }
        }
    }

    return out_id;
}

// get first free id greater than any shared id
function get_id_above_shared(curr_id) {
    var out_id = curr_id;

    for (var i = 0; i < _shared_ids_data.length; i++) {
        var ids = _shared_ids_data[i].ids;
        for (var j = 0; j < ids.length; j++)
            if (ids[j] > out_id)
                out_id = ids[j];
    }

    return out_id;
}

/*==============================================================================
                               ID GENERATOR
==============================================================================*/
function generate_id(counter) {
    if (typeof counter !== "undefined")
        _id_generator.generator_counter = counter;

    _id_generator.generator_counter = get_not_shared_id(_id_generator.generator_counter);

    var digits = charcodes_by_number(_id_generator.generator_counter, GEN_SOURCE.length);
    var result = "";

    for (var i = 0; i < digits.length; i++) {
        if (digits.length > 1 && i == 0)
            // equivalent to 0,1,2,3,4,5,6,7,8,9,00,01,...
            result += GEN_SOURCE.charAt(digits[i] - 1);
        else
            result += GEN_SOURCE.charAt(digits[i]);
    }
    _id_generator.generator_counter++;

    if (!is_valid(result))
        result = generate_id();
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
            || m_reserved.is_b4w_specific(str));
}

function interrupt_gen_id(new_id) {
    _id_generator.id_stash.push(_id_generator.generator_counter);
    _id_generator.generator_counter = new_id;
}

function restore_gen_id() {
    if (_id_generator.id_stash.length)
        _id_generator.generator_counter = _id_generator.id_stash.pop();
}

exports.cleanup = function() {
    _varyings_aliases = {};
    _shared_ids_data.length = 0;
    _incl_shared_stack = [null];
    
    id_generator_cleanup();
}

function id_generator_cleanup() {
    _id_generator.generator_counter = 0;
    _id_generator.id_stash.length = 0;   
}

