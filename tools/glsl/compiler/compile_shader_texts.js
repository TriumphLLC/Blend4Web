#!/usr/bin/env nodejs

var fs = require("fs");

var m_proc  = require("./ast_processor.js");
var m_trans = require("./ast_translator.js");
var m_glsl  = require("./glsl_parser.js");
var m_gpp   = require("./gpp_parser.js");
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

// NOTE: set to false to see original error messages
var CATCH_ERRORS = true;

var config = {
    export_shaders: true,
    obfuscate: false,
    optimize_decl: false,
    remove_braces: false
};
m_proc.config = config;
    
function compile(argv) {
    process_arguments(argv);

    var files = get_shader_files();

    // Remove comments
    for (var type in files)
        for (var i = 0; i < files[type].length; i++) {  
            var text = remove_comments(files[type][i].text);
            files[type][i].text_no_comments = text;
        }

    // Preprocessing directives (#include, #define, #var, ...)
    var used_includes = [];
    for (var i = 0; i < files.main_files.length; i++) { 
        var incl_data = insert_includes(files.main_files[i].text_no_comments, files.include_files);
        used_includes = used_includes.concat(incl_data.used_includes);
        var text = process_directives(incl_data.text, files.main_files[i].name);
        files.main_files[i].text_with_includes = text;
    }
    check_used_includes(used_includes, files.include_files);

    // Ast building
    var vardef_ids = [];
    var ast_arrays = [];
    for (var i = 0; i < files.main_files.length; i++) {
        var ast_parsing_result = source_to_ast(files.main_files[i].text_with_includes, 
                files.main_files[i].name);
        vardef_ids = vardef_ids.concat(ast_parsing_result.vardef_ids);
        ast_arrays.push(ast_parsing_result);
    }

    // Ast processing
    for (var i = 0; i < files.main_files.length; i++)
        ast_arrays[i] = process_ast(ast_arrays[i], vardef_ids, 
                files.main_files[i].name);

    // perform shaders validation after processing
    m_valid.check_dead_functions();
    m_valid.check_dead_variables();
    m_valid.check_import_export_tokens();

    // get shaders texts
    var include_texts = {}
    for (var i = 0; i < files.main_files.length; i++) {
        // Listing manipulations
        var text = ast_to_source(ast_arrays[i]);
        var data = separate_include_code(text);

        files.main_files[i].text = data.text;

        for (var j = 0; j < data.include_blocks.length; j++) {
            var block = data.include_blocks[j];

            if (block.name in include_texts) {
                if (include_texts[block.name].text !== block.text) {
                    fail("Error! Ambiguous obfuscation in include file '" 
                            + block.name + "'.");
                    return;
                }
            } else
                include_texts[block.name] = {
                    text: block.text
                }
        }
    }

    // Get preprocessed ast from shaders texts
    for (var i = 0; i < files.main_files.length; i++)
        files.main_files[i].ast_pp = source_to_ast_pp(files.main_files[i].text, 
                files.main_files[i].name);

    for (var name in include_texts)
        include_texts[name].ast_pp = source_to_ast_pp(include_texts[name].text, 
                name);

    if (config.export_shaders)
        export_ast(files.main_files, include_texts);

    return;
}

function process_arguments(argv) {
    for (var i = 0; i < argv.length; i++) {
        if (argv[i] == "--dry")
            config.export_shaders = false;
        if (argv[i] == "--obf")
            config.obfuscate = true;
        if (argv[i] == "--opt_decl")
            config.optimize_decl = true;
        if (argv[i] == "--rem_braces")
            config.remove_braces = true;
    }
}

function get_shader_files() {
    var main_files = load_files(PATH_TO_SHADERS_DIR);
    main_files = main_files.concat(load_files(PATH_TO_POSTPROCESS_DIR));
    var include_files = load_files(PATH_TO_INCLUDE_DIR);
    return {
        main_files: main_files,
        include_files: include_files
    }
}

function load_files(dir) {
    var file_names = fs.readdirSync(dir);
    
    var files = [];
    for (var i in file_names) {
        var name = file_names[i];

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
            files.push({ name: name, text: text, type: type, dir: dir });
        }
    }

    return files;
}

function remove_comments(text) {
    var expr_single = /\/\/.*$/gm;
    var expr_multi = /\/\*[\s\S]*?\*\//g;
    return text.replace(expr_single, "").replace(expr_multi, "");
}

function insert_includes(text, include_array) {
    var used_includes = [];

    var expr = /# *?include *?<(.*?)>/g;
    while ((res = expr.exec(text)) != null) {
        var include_is_found = false;
        for (var i = 0; i < include_array.length; i++) {
            var incl = include_array[i];

            if (incl.name == res[1]) {
                var expr_str = "# *?include *?<" + res[1] + ">";
                var repl_expr = new RegExp(expr_str, "");
                text = text.replace(repl_expr, "#include%" + res[1] + "%\n" + incl.text 
                        + "\n#include_end%" + res[1] + "%");
                include_is_found = true;
            }
        }
        if (!include_is_found)
            fail("Error! Include '" + res[1] + "' not found.");
        if (used_includes.indexOf(res[1]) == -1)
            used_includes.push(res[1]);
    }
    return {
        text: text,
        used_includes: used_includes
    }
}

function process_directives(text, file_name) {
    if (CATCH_ERRORS)
        try {
            var result = m_glsl.parse(text, {startRule: "pp_start"});
        } catch(err) {
            var message = pegjs_error_message(err, file_name, text);
            fail(message);
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
            fail(message);
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
            fail(message);
        }
    else {
        // NOTE: fix parser issue when some directive is ended by EOF
        text += "\n";
        var result = m_gpp.parse(text);
    }
    return result;
}

function process_ast(ast_data, reserved_ids, filename) {
    return m_proc.run(ast_data, reserved_ids, filename);
}

function ast_to_source(ast_data) {
    return m_trans.translate(ast_data);
}

function separate_include_code(text) {
    var include_blocks = [];

    var expr = /\/\*%include%(.*?)%\*\/([\s\S]*?)\/\*%include_end%.*?%\*\//gm;
    while ((res = expr.exec(text)) != null) {
        include_blocks.push({
            name: res[1],
            text: clean_source(res[2])
        });
    }

    text = clean_source(text.replace(expr, "#include<$1>"));

    return {
        include_blocks: include_blocks,
        text: text
    }
}

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
            .replace(semic_repeat, ";");
}

function check_used_includes(used_includes, existed_includes) {
    for (var i = 0; i < existed_includes.length; i++) {
        var name = existed_includes[i].name;
        if (used_includes.indexOf(name) == -1)
            console.warn("Warning! Include file '" + name 
                    + "' not used in any shader, would be omitted!");
    }
}

/**
 * Note: unused
 */
function export_texts(files, include_texts) {
    var shade_array = [];
    for (var i = 0; i < files.length; i++) {
        var path = "";
        if (files[i].dir == PATH_TO_POSTPROCESS_DIR)
            path = "postprocessing/";

        var text = files[i].text.replace(/\n/g, "\\n");
        var shade_str = "\"" + path + files[i].name + "\": \"" + text + "\"";
        shade_array.push(shade_str);
    }

    for (var name in include_texts) {
        var text = include_texts[name].text.replace(/\n/g, "\\n");
        var shade_str = "\"include/" + name + "\": \"" + text + "\"";
        shade_array.push(shade_str);   
    }

    var str = "";
    str += "b4w.module[\"" + OUTPUT_MODULE_TEXTS + "\"] = function(exports, require) {\n";
    str += shade_array.join();
    str += "}";

    fs.writeFileSync(OUTPUT_FILE_TEXTS, str);
}

function export_ast(files, include_texts) {
    var data = { }
    for (var i = 0; i < files.length; i++) {
        var path = "";
        if (files[i].dir == PATH_TO_POSTPROCESS_DIR)
            path = "postprocessing/";
        data[path + files[i].name] = files[i].ast_pp;
    }

    for (var name in include_texts) {
        data["include/" + name] = include_texts[name].ast_pp;
    }

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

    fs.writeFileSync(OUTPUT_FILE_TEXTS, str);
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

function fail(message) {
    console.error(message);
    process.exit(1);
}

compile(process.argv);
