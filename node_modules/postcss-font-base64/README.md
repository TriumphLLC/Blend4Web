# Description
This postcss module takes your local custom font and encode it to a base64 string which is included in your css. The supported formats are currently woff, woff2, ttf, and eot. This module is subject to change. Contribution appreciated!

# Install
```shell
npm install --save-dev postcss-font-base64
```
or
```shell
yarn add postcss-font-base64 --dev
```
# Example
## Input
```css
@font-face {
    font-family: Scrabble;
    src:
        url("fonts/fakefont.eot?#iefix") format("embedded-opentype"),
        url("fonts/fakefont.woff") format("woff"),
        url("fonts/fakefont.ttf") format("truetype");
    font-weight: normal;
    font-style: normal;
}

```
## Output
```css
@font-face {
    font-family: "Scrabble";
    src:
      url(data:application/font-eot;charset=utf-8;base64sZEAABWRAAA...l54u0 format("embedded-opentype"),

      url(data:application/font-woff;charset=utf-8;base64d09GRgABAA...tZQAA format("woff"),

      url(data:application/font-tiff;charset=utf-8;base64AAEAAAARAQ...D0QAA format("truetype");

    font-weight: normal;
    font-style: normal;
}
```
# Config
In your postcss.config.js add this module:

```javascript
module.exports = {
    plugins: [
      ...
      require('postcss-font-base64')({
        //future options will be handled here
      })
    ]
}
```
# Options
There are currently no options available. Please suggest!

# Disclaimer
This is my first postCss plugin, feel free to contribute, comment or help out 🍺
