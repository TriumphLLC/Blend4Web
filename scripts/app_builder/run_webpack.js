const cmd_parser = require('command-line-args')
const path = require("path");
const fs = require("fs");
const ini_parser = require('ini-parser');
const webpack = require("webpack");
const html_parser = require("htmlparser2");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlStringReplace = require('html-string-replace-webpack-plugin');
const StringReplacePlugin = require("string-replace-webpack-plugin");
const consts = require("./constants");
const meta_data = require("./meta_data");
var websocket = require('websocket').client;

var _cmd_opt = null;
var _root = null;
var _watchings = null;

var _error = false;
var _state_desc = null;
var _html = null;
var _ws_connection = null;
var _ws_url = null;
var _log_file = null;
var _output_path = null;

function parse_cmd() {
    // Parse commandline options
    const option_definitions = [
        { name: 'verbose', alias: 'v', type: Boolean },
        { name: 'html', type: String, defaultOption: true },
        { name: 'root', type: String, defaultValue: path.join(__dirname, "..", "..") },
        { name: 'watch', type: Boolean, defaultValue: false },
        { name: 'output', type: String },
        { name: 'inject-relative-paths', type: Boolean, defaultValue: false },
        { name: 'websocket', type: String },
        { name: 'only-es6', type: Boolean, defaultValue: false }
    ]
    const options = cmd_parser(option_definitions)
    if (options.verbose)
        console.log("Options: \n", options);
    return options;
}

function extend_config_for_configjs(config, build_name) {
    if (!config.module)
        config.module = {};
    if (!config.module.loaders)
        config.module.loaders = [];

    config.module.loaders.unshift(
        {
            test: /config.js$/, loader: StringReplacePlugin.replace({
                replacements: [
                    {
                        pattern: /B4W_MAIN_MODULE/g,
                        replacement: function (match) {
                            return build_name + ".min.js"
                        }
                    }
                ]
            })
        }
    )
    config.plugins.unshift(new StringReplacePlugin());
}

function new_config(dest_path) {
    return {
        entry: ["script.js"],
        output: {
            path: ".",
            filename: 'bundle.js',
        },
        //devtool: "source-map",
        plugins: [
            new webpack.SourceMapDevToolPlugin({
                filename: '[file].map',
                append: `\n//# sourceMappingURL=${path.normalize(path.join("/", dest_path)).replace(/\\/g,"/")}/[url]`,
                exclude: []
            })
        ],
        resolve: {
            alias: {
                blend4web: path.resolve(_root, 'index.js')
            }
        },
    };
}


function bundle_path(name, output_path) {
    var bundle_path = path.join("/", path.relative(_root, output_path), name).replace(/\\/g,"/") + ".js";
    if (_cmd_opt["inject-relative-paths"]) {
        bundle_path = name + ".js";
    }
    return bundle_path;
}

function prefix_file(html, prefix) {
    return path.join(path.dirname(html), prefix + path.basename(html))
}

function extend_config_for_es6(config, html_desc, b4w_proj, output_path, stage_desc) {
    var stage = html_desc.build_stages.slice(-1)[0];
    var html_src = null;
    if (stage)
        html_src = stage.html;
    html_src = html_src ? html_src : html_desc.path;
    html_dst = path.join(output_path, path.basename(html_desc.path));
    if (stage_desc.gen_name)
        html_dst = prefix_file(html_dst, stage_desc.name + "_");

    var build_name = "b4w_app_bundle";

    // Entry
    config.entry = [];
    for (var m in html_desc.modules) {
        var html_dir = path.dirname(html_desc.path);
        config.entry.push(path.join(html_dir, html_desc.modules[m]));
    }

    // Output
    config.output = {
        path: path.resolve(output_path),
        filename: build_name + '.js',
    }

    // Plugins
    config.plugins.push(new HtmlWebpackPlugin({
        filename: html_dst,
        template: html_src,
        inject: false
    }))

    // All modules will be built in one bundle
    // So replace the script tag just once
    _script_replaced = false;
    config.plugins.push(new HtmlStringReplace({
        enable: true,
        patterns: [
            {
                match: /<script\b[\s]*type[\s]*=[\s]*"module"[^>]*>([\s\S]*?)<\/script>/gm,
                replacement: function (match) {
                    if (!_script_replaced) {
                        _script_replaced = true;
                        asset_loc = ""
                        if (_html.indexOf("apps_dev") >= 0)
                            asset_loc = "deploy/"
                        else
                            asset_loc = "projects/"
                        return "<script type=\"text\/javascript\" src=\"" + bundle_path(build_name, output_path) + "\"" + " b4w-offset=\"" + path.join(path.join(path.relative(output_path, _root), asset_loc)).replace(/\\/g,"/")+"\"> </script>";
                    }
                    else
                        return "";
                },
            },
        ]
    }))

    html_desc.build_stages.push({html: html_dst});
    // Disabled (currently config.js processing performs on the closure compiler stage)
    // extend_config_for_configjs(config, build_name);
}

function extend_config_for_es5(config, html_desc, b4w_proj, output_path, stage_desc) {
    var build_name = "b4w"    ;
    var stage = html_desc.build_stages.slice(-1)[0];
    var html_src = null;
    if (stage)
        html_src = stage.html;
    html_src = html_src ? html_src : html_desc.path;
    html_dst = path.join(output_path, path.basename(html_desc.path))
    if (stage_desc.gen_name)
        html_dst = prefix_file(html_dst, stage_desc.name + "_");

    // Entry

    config.entry = [];
    config.entry.push(path.join(_root, "index.js"));

    // Output
    config.output = {
        path: path.resolve(output_path),
        filename: build_name+".js",
        sourceMapFilename: build_name+'.js.map'
    }

    // Plugins
    config.plugins.push(new HtmlWebpackPlugin({
        filename: html_dst,
        template: html_src,
        inject: false
    }))

    config.plugins.push(new HtmlStringReplace({
        enable: true,
        patterns: [
            {
                match: /<script\b[\s]*type[\s]*=[\s]*["']text\/javascript["'][\s]* src=["']([^>]*[\/\\]dist[\/\\]b4w.js)["'][^>]*>[\s\S]*?<\/script>/gm,
                replacement: function (match) {
                    return "<script type=\"text\/javascript\" src=\"" + bundle_path(build_name, output_path) + "\" b4w-offset=\"" + path.join(path.relative(output_path, _root)).replace(/\\/g,"/")+"\"> </script>";
                },
            },
        ]
    }))

    html_desc.build_stages.push({html: html_dst});
}

var webpack_options = {
    colors: { level: 2, hasBasic: true, has256: true, has16m: false },
    exclude: [ 'node_modules' ] 
}

function append_log(data) {
    if (!_log_file) {
        if (!fs.existsSync(_output_path))
            fs.mkdirSync(_output_path);
        _log_file = path.join(_output_path, "webpack.log");
        if (fs.existsSync(_log_file))
            fs.unlinkSync(_log_file);
    }
    fs.appendFileSync(_log_file, data, 'utf8');
}

function compilerCallback(err, stats) {
    _error = false;
    _state_desc = null;
    if (err) {
        var lastHash = null;
        _state_desc = stats.compilation.errors;
        _error = true;
        append_log(_state_desc);
        if (!_cmd_opt.watch)
            process.exit(consts.RET_ERROR);
    } else {
        if(stats.hash !== lastHash) {var WebSocketClient = require('websocket').client;
            lastHash = stats.hash;
            _state_desc = stats.toString(webpack_options) + "\n";
            if (_cmd_opt.verbose)
                process.stdout.write(_state_desc);
            append_log(_state_desc);
        }
        if (!_cmd_opt.watch)
            process.exit(consts.RET_TRUE);
    }
    if (_cmd_opt.websocket) {
        send_state();
    }
    _script_replaced = false;
}

function run_webpack(html_desc, b4w_proj, need_wp) {
    rel_output_path = path.relative(_root, _output_path);

    if (_cmd_opt.verbose) {
        console.log("Output path: " + _output_path)
    }

    // To prevent webpack cyclic update
    // we should use different names for esch stage
    var stages = [];
    if (need_wp & consts.RET_TRUE)
        stages.push({name: "es6"});
    if (need_wp & consts.RET_ES5_ENGINE && !_cmd_opt["only-es6"])
        stages.push({name: "engine"});

    if (stages.length > 1) {
        for (var i = 0; i < stages.length-1; i++) {
            stages[i].gen_name = true;
        }
    }
    function get_stage(name) {
        for (var i = 0; i < stages.length; i++) {
            if (stages[i].name == name)
                return stages[i];
        }
        return null;
    }

    config = [];
    for (var i = 0; i < stages.length; i++) {
        config.push(new_config(rel_output_path));
        switch (stages[i].name) {
            case "es6":
                extend_config_for_es6(config[config.length-1], html_desc, b4w_proj, _output_path, stages[i]);
                break;
            case "engine":
                extend_config_for_es5(config[config.length-1], html_desc, b4w_proj, _output_path, stages[i]);
                break;
        }
    }

    if (_cmd_opt.verbose) {
        console.log(config);
    }
    compiler = webpack(config);
    if (_cmd_opt.watch) {
        _watchings = compiler.watch(true, compilerCallback);
    }
    else
        compiler.run(compilerCallback);
}

function get_state() {
    if (_error)
        return "error";
    if (!_watchings)
        return "pending";
    var state = "ok";
    for (var i = 0; i < _watchings.watchings.length; i++) {
        if (_watchings.watchings[i].running == true) {
            state = "pending";
        }
    }
    return state;
}

function build_engine() {
    // building engine
    var config = require("../../webpack.config")
    compiler = webpack(config);
    if (_cmd_opt.watch) {
        _watchings = compiler.watch(true, compilerCallback);
    }
    else
        compiler.run(compilerCallback);
}

function exit_when_built() {
    setInterval(()=>{if (get_state() == "ok") process.exit(consts.RET_FALSE);})
}

function send_state() {
    if (_ws_connection.connected) {
        var state = get_state();
        _ws_connection.send(JSON.stringify(
            {
                type: "builder",
                id: _html,
                state: state,
                description: _state_desc
            }
        ))
    }
}

function run_websocket() {
    var client = new websocket();
    ws_connect = () => client.connect(_ws_url);
    
    client.on('connectFailed', function(error) {
        console.log('Connect Error: ' + error.toString());
        exit_when_built();
    });
    client.on('connect', function(connection) {
        _ws_connection = connection;
        connection.on('error', function(error) {
            console.log('Connect Error: ' + error.toString());
            exit_when_built();
        });
        connection.on('close', function() {
            exit_when_built()
        });
        // setInterval(send_state, 2000);
        // send_state();
    });
    ws_connect();
}

var main = function () { 
    _cmd_opt = parse_cmd();
    _root = _cmd_opt.root;
    var html = _cmd_opt.html;
    _ws_url = _cmd_opt.websocket;
    _html = html;

    _output_path = _cmd_opt.output ? _cmd_opt.output : path.join(_root, "tmp")
    _output_path = path.isAbsolute(_output_path) ? _output_path : path.join(_root, _output_path)
    
    if (_cmd_opt.watch && _cmd_opt.websocket)
        run_websocket();

    if (html) {
        if (!path.isAbsolute(html))
            html = path.join(_cmd_opt.root, _cmd_opt.html)
        
        if (!fs.existsSync(html) || fs.lstatSync(html).isDirectory()) {
            console.error(html + " is not a file")
            return consts.RET_ERROR;
        }
        
        var desc = meta_data.get_meta_data(html, _cmd_opt.verbose);
        var need_wp = meta_data.need_webpack(desc.html, desc.proj, _cmd_opt.verbose);
        if (_cmd_opt.verbose)
            console.log("NEED_WEBPACK: " + need_wp);
        if (need_wp) {
            run_webpack(desc.html, desc.proj, need_wp);
        } else {
            console.log("Webpack processing is not needed");
            process.exit(consts.RET_FALSE);
        }
    } else {
        build_engine();
    }
} 
if (require.main === module) {
    main();
}