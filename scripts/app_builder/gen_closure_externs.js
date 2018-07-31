const cmd_parser = require('command-line-args')
const path = require("path");
const fs = require("fs");

function parse_cmd() {
    // Parse commandline options
    const option_definitions = [
        { name: 'verbose', alias: 'v', type: Boolean,
          name: 'out', alias: 'o', type: String, defaultOption: true }
    ]
    const options = cmd_parser(option_definitions)
    if (options.verbose)
        console.log("Options: \n", options);
    return options;
}

var _cmp_opt;

function list_js_files(dir) {
    const walk_sync = function (d, l) {
        if (fs.statSync(d).isDirectory())
            fs.readdirSync(d).map(f => walk_sync(path.join(d, f), l))
        else
            l.push(d);
        return l
    }
    var l = []
    return walk_sync(dir, l).filter(function( elm ) {return elm.match(/.*\.js$/i);});
}

function externs_from_file(file_path, records) {
    var file = fs.readFileSync(file_path);
    var f = file.toString();

    var records_tmp = [];
    var func_names_re = /exports\.(\S[^=^\s^(]*)/g;
    while (m = func_names_re.exec(f))
    records_tmp.push(m[1])

    var cc_externs_re = /@cc_externs\s+([\S].+)/g;
    while (m = cc_externs_re.exec(f))
        Array.prototype.push.apply(records_tmp, m[1].split(/\s+/g));

    for (var i in records_tmp) {
        if (records_tmp[i])
            records.push("Object.prototype." + records_tmp[i] + ";\n");
    }
}

exports.get_externs = function() {
    var addons = list_js_files(path.join(__dirname, "../../src/addons"))
    var extern = list_js_files(path.join(__dirname, "../../src/extern"))

    var l = [];
    Array.prototype.push.apply(l, addons);
    Array.prototype.push.apply(l, extern);

    var records = [];
    for (var i in l) {
        externs_from_file(l[i], records);
    }

    var externs_path = path.join(__dirname, "..", "..", "tools", "closure-compiler")
    var prepared_externs = [
        path.join(externs_path, "extern_fullscreen.js"),
        path.join(externs_path, "extern_gl-matrix.js"),
        path.join(externs_path, "extern_jquery-1.9.js"),
        path.join(externs_path, "extern_modules.js"),
        path.join(externs_path, "extern_pointerlock.js"),
        path.join(externs_path, "extern_webassembly.js"),
    ]

    var text = records.join("")

    for (i in prepared_externs) {
        var f = prepared_externs[i];
        text += fs.readFileSync(f).toString();
    }

    return text;
}

exports.write_externs = function(out) {
    var text = exports.get_externs();
    fs.writeFileSync(out, text);
}

function main() {
    _cmd_opt = parse_cmd();
    var text = exports.get_externs();
    fs.writeFileSync(_cmd_opt.out, text);
}

if (require.main === module) {
    var ret = main();
    process.exit(ret); 
}