/**
 * @file util
 * @author niminjie(niminjiecide@gmail.com)
 */

module.exports = {
    /**
     * Get `html-webpack-plugin-after-html-processing` callback
     *
     * @param {Object} compiler webpack compiler
     * @param {Function} callback callback
     */
    afterHtmlProcessing: function(compiler, callback) {
        compiler.plugin('compilation', function (compilation) {
            compilation.plugin('html-webpack-plugin-after-html-processing', callback);
        });
    },

    /**
     * default replacement function
     *
     * @param {String} match matched string
     * @return {String}
     */
    defaultReplace(match) {
        return match;
    }
};
