/**
 * @file HtmlStringReplace
 * @author niminjie(niminjiecide@gmail.com)
 */

var util = require('./util');

/**
 * @constructor
 *
 * @param {Object} options plugin options
 * @param {Array} options.patterns regex patterns and replacement function
 * @param {Boolean} enable whether enable this plugin or not
 */
function HtmlStringReplace(options) {
    this.patterns = options.patterns || [];

    // enable the plugin when not passing `enable` param
    this.enable = options.enable === undefined
                    ? true
                    : options.enable;
}

/**
 * apply plugin
 *
 * @param {Object} compiler webpack compiler
 */
HtmlStringReplace.prototype.apply = function (compiler) {
    var that = this;

    util.afterHtmlProcessing(compiler, function (htmlPluginData, callback) {
        if (that.enable) {
            htmlPluginData.html = that.replaceString(htmlPluginData.html, htmlPluginData.plugin.options);
        }

        callback(null, htmlPluginData);
    });
};

/**
 * replace html string
 *
 * @param {String} html html source
 * @param {Object} htmlPluginOptions `HtmlWebpackPlugin` options
 *
 * @return {String} replaced html string
 */
HtmlStringReplace.prototype.replaceString = function (html, htmlPluginOptions) {
    this.patterns.forEach(function (pattern) {
        var match = pattern.match || new RegExp();
        var replacement = pattern.replacement || util.defaultReplacement;

        html = html.replace(match, replacement);
    });

    return html;
};

module.exports = HtmlStringReplace;
