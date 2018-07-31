'use strict';
var assert = require('assert');

function HtmlWebpackExcludeAssetsPlugin (options) {
  assert.equal(options, undefined, 'The HtmlWebpackExcludeAssetsPlugin does not accept any options');
}

HtmlWebpackExcludeAssetsPlugin.prototype.apply = function (compiler) {
  var self = this;

  // Hook into the html-webpack-plugin processing
  compiler.plugin('compilation', function (compilation) {
    compilation.plugin('html-webpack-plugin-alter-asset-tags', function (htmlPluginData, callback) {
      var excludeAssets = htmlPluginData.plugin.options.excludeAssets;
      // Skip if the plugin configuration didn't set `excludeAssets`
      if (!excludeAssets) {
        return callback(null, htmlPluginData);
      }

      if (excludeAssets.constructor !== Array) {
        excludeAssets = [excludeAssets];
      }

      // Skip invalid RegExp patterns
      var excludePatterns = excludeAssets.filter(function (excludePattern) {
        return excludePattern.constructor === RegExp;
      });

      var result = self.processAssets(excludePatterns, htmlPluginData);
      callback(null, result);
    });
  });
};

HtmlWebpackExcludeAssetsPlugin.prototype.isExcluded = function (excludePatterns, assetPath) {
  return excludePatterns.filter(function (excludePattern) {
    return excludePattern.test(assetPath);
  }).length > 0;
};

HtmlWebpackExcludeAssetsPlugin.prototype.processAssets = function (excludePatterns, pluginData) {
  var self = this;
  var body = [];
  var head = [];

  pluginData.head.forEach(function (tag) {
    if (!tag.attributes || !self.isExcluded(excludePatterns, tag.attributes.src || tag.attributes.href)) {
      head.push(tag);
    }
  });

  pluginData.body.forEach(function (tag) {
    if (!tag.attributes || !self.isExcluded(excludePatterns, tag.attributes.src || tag.attributes.href)) {
      body.push(tag);
    }
  });

  return { head: head, body: body, plugin: pluginData.plugin, chunks: pluginData.chunks, outputName: pluginData.outputName };
};

module.exports = HtmlWebpackExcludeAssetsPlugin;
