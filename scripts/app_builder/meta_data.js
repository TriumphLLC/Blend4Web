const cmd_parser = require('command-line-args')
const path = require("path");
const fs = require("fs");
const ini_parser = require('ini-parser');
const html_parser = require("htmlparser2");
const consts = require("./constants");

function parse_cmd() {
    // Parse commandline options
    const option_definitions = [
        { name: 'verbose', alias: 'v', type: Boolean },
        { name: 'html', type: String, defaultOption: true }
    ]
    const options = cmd_parser(option_definitions)
    if (options.verbose)
        console.log("Options: \n", options);
    return options;
}

exports.parse_project = parse_project;
function parse_project(path) {
    return ini_parser.parse(fs.readFileSync(path, 'utf-8'));
}

exports.find_project = find_project;
function find_project(html, verbose) {
    // Find nearest .b4w_project
    var dir_name = path.dirname(html);

    var proj_found = null;
    var dir_tmp = dir_name
    while (true) {
        if (fs.lstatSync(dir_tmp).isDirectory()) {
            if (dir_tmp == dir_name) {
                proj_found = null;
                break;
            }
            var proj_found = path.join(dir_tmp, ".b4w_project");
            if (fs.existsSync(proj_found)) {
                break;
            } else {
                dir_tmp = path.normalize(path.join(dir_tmp, ".."));
            }
        } else {
            break;
        }
    }
    if (verbose)
        if (proj_found)
            console.log("Found nearest .b4w_project: ", proj_found);
        else
            console.log(".b4w_project not found");
    return proj_found;
}

exports.parse_html = parse_html;
function parse_html(html_path) {
    var html_desc = {
        path: html_path,
        modules: [],
        scripts: [],
        nomodules: [],
        build_stages: []
    }
    var parser = new html_parser.Parser({
        onopentag: function (name, attribs) {
            if (name === "script") {
                if (attribs.src) { // skip html inline scripts
                    switch (attribs.type) {
                        case "module":
                            html_desc.modules.push(attribs.src);
                            break;
                        case "text/javascript":
                            html_desc.scripts.push(attribs.src);
                            break;
                        case "nomodule":
                            html_desc.nomodules.push(attribs.src);
                            break;
                        default:
                            html_desc.scripts.push(attribs.src);
                            break;
                    }
                }
            }
        }
    }, { decodeEntities: true });

    parser.write(fs.readFileSync(html_path, 'utf-8'));
    parser.end();

    return html_desc;
}

exports.need_webpack = need_webpack;
function need_webpack(html_desc, project, verbose) {
    var ret = consts.RET_FALSE;
    if (html_desc.modules.length) {
        if (verbose)
            console.log("-html uses modules");
        ret |= consts.RET_TRUE;
    }
    for (var i in html_desc.scripts) {
        if (html_desc.scripts[i].replace(/\\/g,"/").indexOf("dist/b4w.js") >= 0) {
            if (verbose)
                console.log("-html uses es5-compiled blend4web");
            ret |= consts.RET_ES5_ENGINE;
        }
    }
    return ret;
}

exports.get_meta_data = get_meta_data;
function get_meta_data(html, verbose) {
    var project_path = find_project(html);
    var project = null;
    if (project_path) {
        project = parse_project(project_path);
    }
    
    var html_desc = parse_html(html)
    if (verbose)
        console.log("Html description: ", html_desc)
    return {proj: project, html: html_desc};
}

var main = function () {
    cmd_opt = parse_cmd();
    var html = path.resolve(cmd_opt.html);
    
    if (!fs.existsSync(html) || fs.lstatSync(html).isDirectory()) {
        console.error(html + " is not a file")
        process.exit(consts.RET_ERROR);
    }
    
    var meta_data = get_meta_data(html);
    console.log(JSON.stringify(meta_data));
}

if (require.main === module) {
    var ret = main();
    process.exit(ret); 
}