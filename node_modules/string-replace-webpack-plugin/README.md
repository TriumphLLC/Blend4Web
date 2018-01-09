# string replace plugin for webpack

## Usage example

``` javascript
var StringReplacePlugin = require("string-replace-webpack-plugin");
module.exports = {
   module: {
      loaders: [
         // configure replacements for file patterns
         { 
            test: /index.html$/,
            loader: StringReplacePlugin.replace({
                replacements: [
                    {
                        pattern: /<!-- @secret (\w*?) -->/ig,
                        replacement: function (match, p1, offset, string) {
                            return secrets.web[p1];
                        }
                    }
                ]})
            }
      ]
   },
   plugins: [
      // an instance of the plugin must be present
      new StringReplacePlugin()
   ]
}
```

This allows for arbitrary strings to be replaced as part of the module build process.  The original intent is to replace API
keys in modules prior to deployment.

## API

``` javascript
StringReplacePlugin.replace([nextLoaders: string], options, [prevLoaders: string])
```

* `nextLoaders` loaders to follow the replacement
* `options`
  * `replacements` disables the plugin
    * `pattern` a regex to match against the file contents
    * `replacement` an ECMAScript [string replacement function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter)
* `prevLoaders` loaders to apply prior to the replacement

## License

MIT (http://www.opensource.org/licenses/mit-license.php)
