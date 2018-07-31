const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlWebpackInlineSourcePlugin = require("html-webpack-inline-source-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const HtmlWebpackExcludeAssetsPlugin = require("html-webpack-exclude-assets-plugin");
const HtmlWebpackInlineSVGPlugin = require('html-webpack-inline-svg-plugin');
const webpack = require("webpack");
const base64 = require("postcss-base64");
const base64Font = require("postcss-font-base64");
const gen_externs = require("../../scripts/app_builder/gen_closure_externs.js");
const get_sdk_version = require("../../scripts/app_builder/get_sdk_version.js");
const fs = require("fs");

const htmlTemplatePath = "./src/template/template.pug";
const appName = "webplayer";

module.exports = function (env) {
    var config = {
        entry: "./src/js/webplayer.js",
        output: {
            path: path.resolve(__dirname, "build"),
            filename: appName + ".js",
            sourceMapFilename: appName + ".js.map"
        },
        module: {
            rules: [
                {
                    test: /\.scss$/,
                    use: ExtractTextPlugin.extract({
                        use: [{
                            loader: "css-loader"
                        }, {
                            loader: "postcss-loader",
                            options: {
                                exec: false,
                                plugins: (loader) => [
                                    base64({
                                        extensions: [".svg", ".png"]
                                    })
                                ]
                            }
                        }, {
                            loader: "postcss-loader",
                            options: {
                                exec: false,
                                plugins: (loader) => [
                                    base64Font({
                                        extensions: [".woff", ".woff2"]
                                    })
                                ]
                            }
                        }, {
                            loader: "sass-loader"
                        }]
                    })
                },
                {
                    test: /\.(jpg|svg|png|woff|woff2)$/,
                    loader: "file-loader",
                    options: {
                        name: "[path][name].[ext]"
                    },
                },
                {
                    test: /\.pug$/,
                    loader: "pug-loader",
                    options: {
                        pretty: true,
                        self: true
                    },
                }
            ]
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: htmlTemplatePath,
                filename: path.join("template/" + appName + "_template.html"),
                isTemplate: true,
                excludeAssets: [/.*.js/, /.*.css/],
                svgoConfig: {
                    removeTitle: false,
                    removeViewBox: true,
                },
            }),
            new HtmlWebpackPlugin({
                filename: appName + ".html",
                template: htmlTemplatePath,
                svgoConfig: {
                    removeTitle: false,
                    removeViewBox: true,
                },
            }),
            new HtmlWebpackInlineSVGPlugin(),
            new ExtractTextPlugin(appName + ".css"),
            new HtmlWebpackExcludeAssetsPlugin()
        ],
        resolve: {
            alias: {
                blend4web: path.resolve(path.join(__dirname, "..", ".."), "index.js")
            }
        },
        devServer: {
            contentBase: [path.join(__dirname, "..", ".."), __dirname],
            host: "127.0.0.1"
        },
    };

    var production = false;
    if (env) {
        if (env.production) {
            production = true;
        }
    }

    if (production) {
        // patch version.js
        var d = new Date();
        var date_str = d.getFullYear() + ", " + (d.getMonth() + 1) + ", " + d.getDate() + ", " + d.getHours() + ", " + d.getMinutes() + ", " + d.getSeconds();
        var version = get_sdk_version.get_sdk_version();
        config.module.rules.push(
            {
                test: /version\.js/,
                loader: 'string-replace-loader',
                query: {
                    multiple: [
                        { search: 'var TYPE = "DEBUG";', replace: 'var TYPE = "RELEASE";' },
                        { search: 'var DATE = null;', replace: 'var DATE = new Date('+date_str+');' },
                        { search: 'var VERSION = null;', replace: `var VERSION = [${parseInt(version[0])}, ${parseInt(version[1])}, ${parseInt(version[2])}] ;` },
                        { search: 'var PREVENT_CACHE = "_b4w_ver_";', replace: 'var PREVENT_CACHE = "_b4w_ver_' + version.join('_') + '_";' }
                    ]
                }
            })
        // correct path to the uranium physics engine in config.js
        config.module.rules.push(
            {
                test: /config\.js/,
                loader: 'string-replace-loader',
                query: {
                    multiple: [
                        { search: 'B4W_URANIUM_PATH=/dist/uranium/', replace: 'B4W_URANIUM_PATH=uranium/' }
                    ]
                }
            })
        const ClosureCompilerPlugin = require('webpack-closure-compiler');

        var externs_path = path.join("..", "..", "dist", "misc", "closure_externs")
        gen_externs.write_externs(path.join(externs_path, "extern_b4w.js"));
        var ClosureFlags = {
            language_in: "ECMASCRIPT6",
            jscomp_off: ["duplicate"],
            externs: [
                path.join(externs_path, "extern_b4w.js")
            ],

            jscomp_warning: [
                "checkVars",
                "accessControls",
                "ambiguousFunctionDecl",
                "checkEventfulObjectDisposal",
                "checkRegExp",
                "const",
                "constantProperty",
                "deprecated",
                "deprecatedAnnotations",
                "duplicateMessage",
                "es3",
                "es5Strict",
                "externsValidation",
                "fileoverviewTags",
                "functionParams",
                "globalThis",
                "internetExplorerChecks",
                "missingPolyfill",
                "missingProperties",
                "missingReturn",
                "msgDescriptions",
                "suspiciousCode",
                "strictModuleDepCheck",
                "typeInvalidation",
                "undefinedNames",
                "undefinedVars",
                "unknownDefines",
                "uselessCode",
                // "misplacedTypeAnnotation",
                // "newCheckTypes",
                // "unusedLocalVariables"
            ],
            compilation_level: "ADVANCED_OPTIMIZATIONS",
        };
        config.plugins.push(
            new ClosureCompilerPlugin({
                compiler: ClosureFlags,
                concurrency: 3,
            })
        )
    } else {
        config.plugins.push(
            new webpack.SourceMapDevToolPlugin({
                filename: '[file].map',
            })
        )
    }

    return config;
}