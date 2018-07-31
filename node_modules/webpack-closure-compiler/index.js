var path = require('path');
var fs = require('fs');
var gcc = require('./lib/runner');
var JsGcc = require('./lib/js_runner');
var RawSource = require('webpack-core/lib/RawSource');
var SourceMapConsumer = require('webpack-core/lib/source-map').SourceMapConsumer;
var SourceMapSource = require('webpack-core/lib/SourceMapSource');
var temp = require('temp').track();
var async = require('async');
var ModuleFilenameHelpers = require('webpack/lib/ModuleFilenameHelpers');
var snakeToCamel = require('./lib/utils').snakeToCamel;

function ClosureCompilerPlugin(options) {
  if (typeof options === 'object') {
    this.options = options;
  } else {
    this.options = {};
  }
  if (typeof this.options.compiler === 'object') {
    this.compilerOptions = this.options.compiler;
  } else {
    this.compilerOptions = {};
  }
  if (this.options.jsCompiler) {
    var opts = this.compilerOptions;
    var compilerOptions = Object.keys(opts)
      .reduce(function(o, k) {
        o[snakeToCamel(k)] = opts[k];
        return o;
      }, {});

    return new JsGcc({
      options: compilerOptions
    });
  }
}

ClosureCompilerPlugin.prototype.apply = function(compiler) {

  var options = this.options;
  var compilerOptions = this.compilerOptions;

  options.test = options.test || /\.js($|\?)/i;

  var queue = async.queue(function(task, callback) {

    if (options.test.test(task.file) === false) {
      return callback();
    }

    var input;
    var inputSourceMap;
    var outputSourceMapFile;

    if (compilerOptions['create_source_map']) {
      if (task.asset.sourceAndMap) {
        var sourceAndMap = task.asset.sourceAndMap();
        inputSourceMap = sourceAndMap.map;
        input = sourceAndMap.source;
      } else {
        inputSourceMap = task.asset.map();
        input = task.asset.source();
      }
      outputSourceMapFile = temp.openSync('ccwp-dump-', 'w+');
      compilerOptions['create_source_map'] = outputSourceMapFile.path;
    } else {
      input = task.asset.source();
    }

    gcc.compile(input, compilerOptions, function (err, stdout, stderr) {
      if (err) {
        task.error(new Error(task.file + ' from Closure Compiler\n' + err.message));
      } else {
        if (compilerOptions['create_source_map']) {
          var outputSourceMap = JSON.parse(fs.readFileSync(outputSourceMapFile.path));
          fs.unlinkSync(outputSourceMapFile.path);
          outputSourceMap.sources = outputSourceMap.sources.map(source => source === 'stdin' ? task.file : source);
          task.callback(new SourceMapSource(
              stdout, task.file, outputSourceMap, input, inputSourceMap));
        } else {
          task.callback(new RawSource(stdout));
        }
      }
      callback();
    });

  }, options['concurrency'] || 1);

  compiler.plugin('compilation', function(compilation) {
    compilation.plugin('normal-module-loader', function(context) {
      context.minimize = true;
    });

    compilation.plugin('optimize-chunk-assets', function(chunks, callback) {
      var pending = 0;
      var matching = 0;
      chunks.forEach(function(chunk) {
        chunk.files.forEach(function(file) {
          if (ModuleFilenameHelpers.matchObject(options, file)) {
            matching ++;
            pending ++;
            function done() {
              if (-- pending === 0) {
                callback();
              }
            }
            queue.push({
              file: file,
              asset: compilation.assets[file],
              callback: function(asset) {
                compilation.assets[file] = asset;
                done();
              },
              error: function(err) {
                console.error('Caught error: ', err);
                compilation.errors.push(err);
                done();
              },
            });
          }
        });
      });
      if (matching === 0) {
        callback();
      }
    });
  });
};

module.exports = ClosureCompilerPlugin;
