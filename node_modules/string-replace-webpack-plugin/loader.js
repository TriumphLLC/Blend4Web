/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author James Andersen @jandersen78
*/
var loaderUtils = require("loader-utils");
var StringReplacePlugin = require('./index.js');

module.exports = function(source, map) {
    var callback = this.async();
    var id = loaderUtils.parseQuery(this.query).id;

    var stringReplaceOptions = StringReplacePlugin.REPLACE_OPTIONS;
    if(!stringReplaceOptions.hasOwnProperty(id)) {
        this.emitWarning('no replacement options found for id ' + id);
    } else {
        var options = stringReplaceOptions[id];

        if(typeof source === "string") {
            options.replacements.forEach(function(repl) {
                source = source.replace(repl.pattern, repl.replacement.bind(this));
            }, this);
        } else {
            this.emitWarning("'source' received by loader was not a string");
        }
    }

    this.cacheable && this.cacheable();
    callback(null, source, map);
};
