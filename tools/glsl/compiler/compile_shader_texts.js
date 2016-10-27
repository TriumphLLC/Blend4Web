#!/usr/bin/env nodejs

var fs = require("fs");
var path = require("path");

var m_trans = require("./ast_translator.js");
var m_debug = require("./debug.js");
var m_glsl  = require("./glsl_parser.js");
var m_gpp   = require("./gpp_parser.js");
var m_obf   = require("./obfuscator.js");
var m_optim = require("./optimizator.js");
var m_valid = require("./validator.js");

process.chdir(__dirname);

var ROOT = "../../../";
var SHADERS_DIR              = "shaders/";
var INCLUDE_DIR              = "include/";
var POSTPROCESS_DIR          = "postprocessing/";
var PATH_TO_SHADERS_DIR      = ROOT + SHADERS_DIR;
var PATH_TO_INCLUDE_DIR      = ROOT + SHADERS_DIR + INCLUDE_DIR;
var PATH_TO_POSTPROCESS_DIR  = ROOT + SHADERS_DIR + POSTPROCESS_DIR;  

var OUTPUT_FILE_TEXTS   = ROOT + "src/libs/shader_texts.js";
var OUTPUT_MODULE_TEXTS = "shader_texts";

var CODE_DISPLAY_RANGE = 6;
var MAX_STAT_OUTPUT_COUNT = 30;

// set to false to see original error messages
var CATCH_ERRORS = true;

var config = {
    export_shaders: true,
    obfuscate: false,
    remove_braces: false,
    show_ast_tokens_stat: false
};
    
function compile(argv) {
    process_arguments(argv);

    var files = get_shader_files();

    for (var i = 0; i < files.length; i++) {  
        var file = files[i];

        // preprocess shader text
        file.text_raw = file.text = remove_comments(file.text);
        file.text = replace_include_dir(file.text);
        
        var result = process_directives(file.text, file.name);
        file.text = result.text;
        file.pp_units_simple = result.units;
    }

    // validate before compiling
    m_valid.check_used_includes(files);
    m_valid.validate_vars(files);

    var vardef_ids = [];
    for (var i = 0; i < files.length; i++) {  
        var file = files[i];

        // build AST
        file.ast_data = source_to_ast(file.text, file.name);
        vardef_ids = vardef_ids.concat(file.ast_data.vardef_ids);

        // optimize
        if (config.remove_braces)
            m_optim.delete_unused_braces(file.ast_data);
    }

    // obfuscate
    if (config.obfuscate)
        m_obf.obfuscate(files, vardef_ids);

    // build shader text
    for (var i = 0; i < files.length; i++) {
        files[i].text = ast_to_source(files[i].ast_data);
        files[i].text = return_include_dir(files[i].text);
        files[i].text = clean_source(files[i].text);
    }

    // validate after compiling
    for (var i = 0; i < files.length; i++) 
        if (!files[i].is_include)
            m_valid.check_version(files[i].text, files[i].name);

    // build pp AST
    for (var i = 0; i < files.length; i++)
        files[i].ast_pp = source_to_ast_pp(files[i].text, files[i].name);

    var ast_str = ast_to_json(files);

    if (config.show_ast_tokens_stat)
        process_ast_tokens_stat(ast_str);

    if (config.export_shaders)
        fs.writeFileSync(OUTPUT_FILE_TEXTS, ast_str);
    
    return;

    // // Ast building
    // var vardef_ids = [];
    // var ast_data_arrays = [];
    // for (var i = 0; i < files.main_files.length; i++) {
    //     var ast_parsing_result = source_to_ast(files.main_files[i].text_with_includes, 
    //             files.main_files[i].name);
    //     vardef_ids = vardef_ids.concat(ast_parsing_result.vardef_ids);
    //     ast_data_arrays.push(ast_parsing_result);
    // }

    // // Ast validation and optimization
    // for (var i = 0; i < files.main_files.length; i++) {
    //     m_valid.validate(ast_data_arrays[i], vardef_ids, files.main_files[i].name, 
    //             files.main_files[i].type);
    // }


    // // perform shaders validation after processing
    // m_valid.check_dead_functions();
    // m_valid.check_dead_variables();

    // get shaders texts
    // var include_texts = {}
    // for (var i = 0; i < files.main_files.length; i++) {
    //     // Listing manipulations
    //     var text = ast_to_source(ast_data_arrays[i]);
    //     var data = separate_include_code(text);

    //     files.main_files[i].text = data.text;

    //     for (var j = 0; j < data.include_blocks.length; j++) {
    //         var block = data.include_blocks[j];
    //         include_texts[block.name] = { text: block.text };
    //     }
    // }

    return;
}

function process_arguments(argv) {
    for (var i = 0; i < argv.length; i++) {
        if (argv[i] == "--dry")
            config.export_shaders = false;
        if (argv[i] == "--obf")
            config.obfuscate = true;
        if (argv[i] == "--rem_braces")
            config.remove_braces = true;
        if (argv[i] == "--stat")
            config.show_ast_tokens_stat = true;
    }
}

function get_shader_files() {
    var files = load_files(PATH_TO_SHADERS_DIR);
    files = files.concat(load_files(PATH_TO_POSTPROCESS_DIR));
    files = files.concat(load_files(PATH_TO_INCLUDE_DIR, true));
    return files;
}

function load_files(dir, is_include) {
    var file_names = fs.readdirSync(dir);
    
    var files = [];
    for (var i in file_names) {
        var name = file_names[i];

        var fullpath = path.join(dir, name);
        var relpath = path.relative(PATH_TO_SHADERS_DIR, fullpath);

        var is_shader = false;
        var type = null;
        if (name.indexOf(".glslv") > -1) {
            is_shader = true;
            type = "vert";
        } else if (name.indexOf(".glslf") > -1) {
            is_shader = true;
            type = "frag";
        } else if (name.indexOf(".glsl") > -1) {
            is_shader = true;
            type = "comm";
        }
        // NOTE: excluding hidden files
        is_shader &= (name.indexOf(".") != 0);

        if (is_shader) {
            var text = fs.readFileSync(dir + name, "UTF8");
            files.push({ 
                name: name,
                relpath: relpath,
                text: text,
                text_raw: null,
                ast_data: null,
                ast_pp: null,
                pp_units_simple: null,
                is_include: is_include || false,
                type: type, 
            });
        }
    }

    return files;
}

function remove_comments(text) {
    var expr_single = /\/\/.*$/gm;
    var expr_multi = /\/\*[\s\S]*?\*\//g;
    return text.replace(expr_single, "").replace(expr_multi, "");
}

function replace_include_dir(text) {
    return text.replace(/# *?include *?<(.*?)>/g, "#include%$1%\n#include_end%$1%");
}

function return_include_dir(text) {
    var expr = /\/\*%include%(.*?)%\*\/([\s\S]*?)\/\*%include_end%.*?%\*\//gm;
    return text.replace(expr, "#include<$1>");
}

// function insert_includes(text, include_array) {
//     var used_includes = [];

//     var expr = /# *?include *?<(.*?)>/g;
//     while ((res = expr.exec(text)) != null) {
//         var include_is_found = false;
//         for (var i = 0; i < include_array.length; i++) {
//             var incl = include_array[i];

//             if (incl.name == res[1]) {
//                 var expr_str = "# *?include *?<" + res[1] + ">";
//                 var repl_expr = new RegExp(expr_str, "");
//                 text = text.replace(repl_expr, "#include%" + res[1] + "%\n" + incl.text 
//                         + "\n#include_end%" + res[1] + "%");
//                 include_is_found = true;
//             }
//         }
//         if (!include_is_found)
//             m_debug.fail("Error! Include '" + res[1] + "' not found.");
//         if (used_includes.indexOf(res[1]) == -1)
//             used_includes.push(res[1]);
//     }
//     return {
//         text: text,
//         used_includes: used_includes
//     }
// }

function process_directives(text, file_name) {
    if (CATCH_ERRORS)
        try {
            var result = m_glsl.parse(text, {startRule: "pp_start"});
        } catch(err) {
            var message = pegjs_error_message(err, file_name, text);
            m_debug.fail(message);
        }
    else
        var result = m_glsl.parse(text, {startRule: "pp_start"});
    return result;
}

function source_to_ast(text, file_name) {
    if (CATCH_ERRORS)
        try {
            var result = m_glsl.parse(text);
        } catch(err) {
            var message = pegjs_error_message(err, file_name, text);
            m_debug.fail(message);
        }
    else
        var result = m_glsl.parse(text);
    return result;
}

function source_to_ast_pp(text, file_name) {
    if (CATCH_ERRORS)
        try {
            // NOTE: fix parser issue when some directive is ended by EOF
            text += "\n";
            var result = m_gpp.parse(text);
        } catch(err) {
            var message = pegjs_error_message(err, file_name, text);
            m_debug.fail(message);
        }
    else {
        // NOTE: fix parser issue when some directive is ended by EOF
        text += "\n";
        var result = m_gpp.parse(text);
    }
    return result;
}

function ast_to_source(ast_data) {
    return m_trans.translate(ast_data);
}

// function separate_include_code(text) {
//     var include_blocks = [];

//     var expr = /\/\*%include%(.*?)%\*\/([\s\S]*?)\/\*%include_end%.*?%\*\//gm;
//     while ((res = expr.exec(text)) != null) {
//         include_blocks.push({
//             name: res[1],
//             text: clean_source(res[2])
//         });
//     }

//     text = clean_source(text.replace(expr, "#include<$1>"));

//     return {
//         include_blocks: include_blocks,
//         text: text
//     }
// }

function clean_source(text) {
    var lb_double = /\n(\n)+/g;
    var lb_first = /^\n*/;
    var sp_double = / {2,}/g;

    // don't affect directives
    var sp_right = /^([^(?:.*?#.*?)])([^0-9a-z_])( +)/gi;
    var sp_left = /^([^(?:.*?#.*?)])( +)([^0-9a-z_])/gi;

    var semic_repeat = /(;){2,}/g;
    
    return text.replace(lb_first, "").replace(lb_double, "\n").replace(sp_double, " ")
            .replace(sp_right, "$1$2").replace(sp_left, "$1$3")
            .replace(semic_repeat, ";").trim();
}

function ast_to_json(files) {
    var data = { }
    
    for (var i = 0; i < files.length; i++)
        data[files[i].relpath] = files[i].ast_pp;

    var data_strings = [];
    // NOTE: remove properties quotes, remain them for shaders names
    for (name in data) {
        var str = "exports[\"" + name + "\"] = ";
        str += JSON.stringify(data[name], colon_repl)
                .replace(/\"([^,(\")"]+)\":/g,"$1:").replace(/%:%/g, ":");
        data_strings.push(str);
    }

    var str = "";
    str += "b4w.module[\"" + OUTPUT_MODULE_TEXTS + "\"] = function(exports, require) {";
    str += data_strings.join();
    str += "}";

    return str;
}

// NOTE: Protect colon quotes from removing by regexp
function colon_repl(key, value) {
    if (value == ":")
        value = "%:%";
    return value;
}

function pegjs_error_message(err, file_name, file_text) {
    var message = "\n" + err.name + ". " + err.message + "\nFile: " + file_name
            + ", line: " + err.line + ", column: " + err.column + ".";

    var line_index = err.line - 1;
    var text_lines = file_text.split("\n");
    var interval = [0, text_lines.length - 1];
    if (line_index - CODE_DISPLAY_RANGE > interval[0])
        interval[0] = line_index - CODE_DISPLAY_RANGE;
    if (line_index + CODE_DISPLAY_RANGE < interval[1])
        interval[1] = line_index + CODE_DISPLAY_RANGE;

    var source = "\n";
    for (var i = interval[0]; i <= interval[1]; i++)
        source += (i + 1) + ": " + text_lines[i] + "\n";
    source += "\n";

    message += "\n" + source;
    return message
}

function process_ast_tokens_stat(ast_str) {
    var result = ast_str.match(/([a-zA-Z_0-9]+)(?=[^a-zA-Z_0-9])/g) || [];

    var stat_info = {};
    for (var i = 0; i < result.length; i++) {
        var token = result[i];
        if (token in stat_info) {
            stat_info[token][0] += token.length;
            stat_info[token][1] += 1;
        } else
            stat_info[token] = [token.length, 1];
    }

    var stat_info_sorted = [];
    for (var token in stat_info)
        stat_info_sorted.push([token, stat_info[token][0], stat_info[token][1]])

    stat_info_sorted.sort(function(a, b) {
        return b[1] - a[1];
    });


    var str_format = function(str, len) {
        str = str.toString();
        if (str.length < len)
            str = str + new Array(len - str.length + 1).join(" ");
        return str;
    }

    var count = Math.min(stat_info_sorted.length, MAX_STAT_OUTPUT_COUNT);

    console.log("----------------------------------------------------------------------");
    console.log(str_format("token", 50), str_format("count*len", 10), str_format("count", 10));    
    console.log("----------------------------------------------------------------------");
    for (var i = 0; i < count; i++) {
        var item = stat_info_sorted[i];
        console.log(str_format(item[0], 50), str_format(item[1], 10), str_format(item[2], 10));
    }
    console.log("----------------------------------------------------------------------");
}

compile(process.argv);
