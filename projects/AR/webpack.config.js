const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlStringReplace = require('html-string-replace-webpack-plugin');
const StringReplacePlugin = require("string-replace-webpack-plugin");
const path = require("path");
const fs = require("fs");

const config = {
    entry: './AR.js',
    output: {
        path: __dirname,
        filename: 'bundle.js'
    },
    devtool: 'source-map',
    module: {
        loaders: [
            {
                test: /AR.js$/, loader: StringReplacePlugin.replace({
                    replacements: [
                        {
                            pattern: /var APP_ASSETS_PATH = m_cfg.get_std_assets_path\("AR"\);/g,
                            replacement: function (match) {
                                return "var APP_ASSETS_PATH = \"assets/\";"
                            }
                        }
                    ]
                })
            },
            {
                test: /shaders.js$/, loader: StringReplacePlugin.replace({
                    replacements: [
                        {
                            pattern: /m_gpp_parser = _m_gpp_parser;/g,
                            replacement: function (match) {
                                return ""
                            }
                        }
                    ]
                })
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            filename: "index.html",
            template: "AR.html",
            inject: false
        }),
        new HtmlStringReplace({
            enable: true,
            patterns: [
                {
                    match: /<script type="module" src="AR.js"><\/script>/gm,
                    replacement: function (match) {
                        return "<script type=\"text/javascript\" src=\"bundle.js\"></script>";
                    },
                },
            ]
        })
    ],
    devServer: {
        index: 'index.html',
        openPage: 'index.html',
        host: '0.0.0.0',
        port: 8443,
        open: true,
        https: true
    }
};

var b4w_module = path.resolve(__dirname, "..", "..", 'index.js');
if (fs.existsSync(b4w_module)) {
    config.resolve = {
        alias: {
            blend4web: b4w_module
        }
    }
}

module.exports = config;
