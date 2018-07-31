var _ = require('lodash');
var loaderUtils = require('loader-utils');

function processOptions(source, options) {
  if (!_.isUndefined(options.search) && !_.isUndefined(options.replace)) {
    if (!_.isUndefined(options.flags)) {
      options.search = new RegExp(options.search, options.flags);
    }

    var newSource = source.replace(options.search, options.replace);
    if (options.strict && (newSource === source)) {
      throw new Error('Cannot replace ' + options.search + ' → ' + options.replace);
    }
  } else if (options.strict) {
    throw new Error('Cannot replace: undefined search or/and option(s) → ' + JSON.stringify(options));
  }

  return newSource;
}

module.exports = function (source, map) {
  this.cacheable();

  var options = loaderUtils.getOptions(this);

  if (_.isArray(options.multiple)) {
    options.multiple.forEach(function (suboptions) {
      suboptions.strict = (!_.isUndefined(suboptions.strict) ? suboptions.strict : options.strict);
      source = processOptions(source, suboptions);
    });
  } else {
    source = processOptions(source, options);
  }

  this.callback(null, source, map);
};
