Exclude Assets extension for the HTML Webpack Plugin
========================================
[![npm version](https://badge.fury.io/js/html-webpack-exclude-assets-plugin.svg)](https://badge.fury.io/js/html-webpack-exclude-assets-plugin) [![Build Status](https://travis-ci.org/jamesjieye/html-webpack-exclude-assets-plugin.svg?branch=master)](https://travis-ci.org/jamesjieye/html-webpack-exclude-assets-plugin) [![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/Flet/semistandard)

Enhances [html-webpack-plugin](https://github.com/ampedandwired/html-webpack-plugin)
functionality by adding the `{excludeAssets: RegExp | [RegExp]}` option to allow you to exclude assets.

When adding an entry with third party css files, for example, `style: ['bootstrap/dist/css/bootstrap.css']`, to webpack, the injected scripts include style.js or style.[chunkhash].js. The `excludeChunks` option of `html-webpack-plugin` will exclude both style.css and style.js. With this plugin, you can keep style.css in and style.js out by setting `excludeAssets: /style.*.js/`.

You can also exclude CSS assets, for example, a theme CSS style, by setting `excludeAssets: /theme.*.css/`.

Installation
------------
You must be running webpack on node 0.12.x or higher

Install the plugin with npm:
```shell
$ npm install --save-dev html-webpack-exclude-assets-plugin
```


Basic Usage
-----------
Require the plugin in your webpack config:

```javascript
var HtmlWebpackExcludeAssetsPlugin = require('html-webpack-exclude-assets-plugin');
```

Add the plugin to your webpack config as follows:

```javascript
plugins: [
  new HtmlWebpackPlugin(),
  new HtmlWebpackExcludeAssetsPlugin()
]  
```

The above configuration will actually do nothing due to the configuration defaults.

When you set `excludeAssets` to an array of regular expressions or a single regular expression, the matched assets will be skipped when the chunks are injected into the HTML template.

```javascript
plugins: [
  new HtmlWebpackPlugin({
    excludeAssets: [/style.*.js/] // exclude style.js or style.[chunkhash].js 
  }),
  new HtmlWebpackExcludeAssetsPlugin()
]  
```
