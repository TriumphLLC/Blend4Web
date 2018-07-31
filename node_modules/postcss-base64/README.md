postcss-base64, a [PostCSS](https://github.com/postcss/postcss/) plugin, replaces urls or values inside `url()` functions with their base64 encoded strings.

[GitHub](https://github.com/jelmerdemaat/postcss-base64) | [NPM](https://www.npmjs.com/package/postcss-base64) | [@jelmerdemaat](https://twitter.com/jelmerdemaat)

[![Build Status](https://travis-ci.org/jelmerdemaat/postcss-base64.svg?branch=master)](https://travis-ci.org/jelmerdemaat/postcss-base64)
[![bitHound Code](https://www.bithound.io/github/jelmerdemaat/postcss-base64/badges/code.svg)](https://www.bithound.io/github/jelmerdemaat/postcss-base64)
[![bitHound Dependencies](https://www.bithound.io/github/jelmerdemaat/postcss-base64/badges/dependencies.svg)](https://www.bithound.io/github/jelmerdemaat/postcss-base64/master/dependencies/npm)

## Install

Install it from [NPM](https://www.npmjs.com/package/postcss-base64):

```
npm install postcss-base64
```

## Use

Load this plugin as a PostCSS module and give _either or both_ of these options:

#### extensions

An array of extensions of files that have to be encoded, including the leading dot.

`extensions: ['.svg']`

#### pattern

A valid regex pattern to match against the string inside `url()` definitions to encode. Can not match file urls (use `extensions` for this).

`pattern: /<svg.*<\/svg>/i`

#### root

A root folder in which to search for the files. The path in the CSS file gets appended to this. Default: `process.cwd()` (current working directory).

`root: 'any/path/to/files/'`

#### prepend

String value to prepend before the outputted base64 code. Works only in combination with the pattern approach, for now.

`prepend: 'data:image/svg+xml;base64,'`

#### excludeAtFontFace

Boolean, defines wether `@font-face` rules are ignored. Default: `true`.

`excludeAtFontFace: false`

### NodeJS
Using PostCSS in NodeJS, the approach would be as follows:
```js
var opts = {
    extensions: ['.png', '.svg'], // Replaces png and svg files
    pattern: /<svg.*<\/svg>/i // Replaces inline <svg>...</svg> strings
};

output = postcss().use(base64(opts)).process(src).css;
```

### Gulp
Using a build system like Gulp the approach would be as follows:
```js
var gulp = require('gulp'),
    postcss = require('gulp-postcss'),
    base64 = require('postcss-base64');

gulp.task('css', function () {
  gulp.src('test.css')
      .pipe(postcss([
        base64({
          extensions: ['.svg']
        })
      ]))
      .pipe(gulp.dest('output/'));
});
```

### More info
Only strings inside `url(...)` functions are replaced.

Partially replacing strings with the `pattern` option is possible. If the input CSS is:

```css
.selector {
  background-image: url('<svg>...</svg>');
}
```
And your options are:
```js
var opts = {
  pattern: /<svg.*<\/svg>/i,
  prepend: 'data:image/svg+xml;base64,'
}
```
The output will be:
```css
.selector {
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4...');
}
```
