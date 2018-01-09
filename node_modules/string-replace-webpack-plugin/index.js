/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author James Andersen @jandersen78
*/

var opts = {};

function StringReplacePlugin() {}

// export the replacement options
// so that the loader can refer to them
StringReplacePlugin.REPLACE_OPTIONS = opts;

module.exports = StringReplacePlugin;

/**
 * Create a loader string including replacement
 * @param [nextLoaders]
 * @param replaceOptions
 * @param [prevLoaders]
 * @returns {string}
 */
StringReplacePlugin.replace = function(nextLoaders, replaceOptions, prevLoaders) {
    // shift params to account for optional nextLoaders
    if(!prevLoaders && (typeof replaceOptions === "string")) {
        prevLoaders = replaceOptions;
        replaceOptions = nextLoaders;
        nextLoaders = undefined;
    } else if(!replaceOptions){
        replaceOptions = nextLoaders;
        nextLoaders = undefined;
    }

    if(!replaceOptions || !replaceOptions.hasOwnProperty("replacements")
        || !Array.isArray(replaceOptions.replacements) || replaceOptions.replacements.length == 0) {
        throw new Error("Invalid options for StringReplaceOptions.  Ensure the options objects has an array of replacements");
    }

    var id = Math.random().toString(36).slice(2);
    opts[id] = replaceOptions;
    var replaceLoader = require.resolve("./loader") + "?id=" + id,
        val = replaceLoader;
    if(nextLoaders || prevLoaders) {
        var loaders = [replaceLoader];
        if(nextLoaders) loaders.unshift(nextLoaders);
        if(prevLoaders) loaders.push(prevLoaders);
        val = loaders.join("!");
    }

    return val;
};


StringReplacePlugin.prototype.apply = function(compiler) {
};