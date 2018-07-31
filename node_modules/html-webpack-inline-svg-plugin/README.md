Inline SVG extension for the HTML Webpack Plugin
========================================
[![npm version](https://badge.fury.io/js/html-webpack-inline-svg-plugin.svg)](https://badge.fury.io/js/html-webpack-inline-svg-plugin) [![Build status](https://travis-ci.org/theGC/html-webpack-inline-svg-plugin.svg)](https://travis-ci.org/theGC/html-webpack-inline-svg-plugin)

Allows you to inline SVGs that are parsed by [html-webpack-plugin](https://github.com/ampedandwired/html-webpack-plugin).

Now you can easily add inline SVGs to your output html. Combined with techniques such as: [Icon System with SVG Sprites](https://css-tricks.com/svg-sprites-use-better-icon-fonts/) you have a simple way of ensuring your svg referenced icons are always visible.

The plugin relies on [svgo](https://github.com/svg/svgo) to optimise SVGs. You can configure it's settings, check below for more details.

Installation
------------
Install the plugin with npm:
```shell
$ npm install --save-dev html-webpack-inline-svg-plugin
```

**or** [yarn](https://yarnpkg.com/):
```shell
$ yarn add html-webpack-inline-svg-plugin --dev
```

Usage
-----------
Require the plugin in your webpack config:

```javascript
const HtmlWebpackInlineSVGPlugin = require('html-webpack-inline-svg-plugin');
```

Add the plugin to your webpack config as follows:

```javascript
plugins: [
    new HtmlWebpackPlugin(),
    new HtmlWebpackInlineSVGPlugin()
]
```

Add `img` tags with `inline` attribute and `.svg` file as src to your template/s that the html-webpack-plugin is processing (the default is `index.html`).

```html
<!-- Works: below img tag will be removed and replaced by the content of the svg in its src -->
<img inline src="static/icons.svg">

<!-- Ignored: this img will not be touched as it has no inline attribute -->
<img src="static/foo.svg">

<!-- Broken: this plugin will ignore this src as it is not an svg -->
<img inline src="static/i-will-be-ignored.png">
```

Getting to your SVGs
-----------

References to your `*.svg` files within the `img` tags src should be relative to your project root, this is usually the directory your `package.json` file sits in:

```
my-project
-- package.json
-- <node_modules>
-- <static>
---- icons.svg
---- foo.svg
---- ...
```

With the above structure inlining icons.svg would look like: `<img inline src="static/icons.svg">`

Config
-----------
To configure SVGO (module used to optimise your SVGs), add an `svgoConfig` object to your `html-webpack-plugin` config:

```javascript
plugins: [
    new HtmlWebpackPlugin({
        svgoConfig: {
            removeTitle: false,
            removeViewBox: true,
        },
    }),
    new HtmlWebpackInlineSVGPlugin()
]
```

For a full list of the SVGO config (default) params we are using check out: [svgo-config.js](svgo-config.js). The config you set is merged with our defaults, it does not replace it.

Features
-----------

* Optimises / minimizes the output SVG
* Allows for deep nested SVGs
* Ignores broken tags - incase you are outputting templates for various parts of the page
* Performs no html decoding so supports language tags, i.e. `<?php echo 'foo bar'; ?>`

Known Issues
-----------

* none currently

Contribution
-----------

You're free to contribute to this project by submitting issues and/or pull requests. This project is test-driven, so keep in mind that every change and new feature should be covered by tests.

License
-----------

This project is licensed under [MIT](https://github.com/theGC/html-webpack-inline-svg-plugin/blob/master/LICENSE).

