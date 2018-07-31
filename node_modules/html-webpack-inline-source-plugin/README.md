Inline Source extension for the HTML Webpack Plugin
========================================
[![npm version](https://badge.fury.io/js/html-webpack-inline-source-plugin.svg)](https://badge.fury.io/js/html-webpack-inline-source-plugin) [![Build status](https://travis-ci.org/DustinJackson/html-webpack-inline-source-plugin.svg?branch=master)](https://travis-ci.org/DustinJackson/html-webpack-inline-source-plugin) [![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/Flet/semistandard)

Enhances [html-webpack-plugin](https://github.com/ampedandwired/html-webpack-plugin)
functionality by adding the `{inlineSource: 'regex string'}` option.

This is an extension plugin for the [webpack](http://webpack.github.io) plugin [html-webpack-plugin](https://github.com/ampedandwired/html-webpack-plugin).  It allows you to embed javascript and css source inline.

Installation
------------
You must be running webpack on node 4 or higher

Install the plugin with npm:
```shell
$ npm install --save-dev html-webpack-inline-source-plugin
```

Basic Usage
-----------
Require the plugin in your webpack config:

```javascript
var HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
```

Add the plugin to your webpack config as follows:

```javascript
plugins: [
  new HtmlWebpackPlugin(),
  new HtmlWebpackInlineSourcePlugin()
]  
```
The above configuration will actually do nothing due to the configuration defaults.

When you set `inlineSource` to a regular expression the source code for any javascript or css file names that match will be embedded inline in the resulting html document.
```javascript
plugins: [
  new HtmlWebpackPlugin({
		inlineSource: '.(js|css)$' // embed all javascript and css inline
	}),
  new HtmlWebpackInlineSourcePlugin()
]  
```

Sourcemaps
----------
If any source files contain a sourceMappingURL directive that isn't a data URI, then the sourcemap URL is corrected to be relative to the domain root (unless it already is) instead of to the original source file.

All sourcemap comment styles are supported:

* `//# ...`
* `//@ ...`
* `/*# ...*/`
* `/*@ ...*/`
