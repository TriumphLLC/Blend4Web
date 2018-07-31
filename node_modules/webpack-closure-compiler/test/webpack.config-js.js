var path = require('path');
var ClosureCompilerPlugin = require('../index');

module.exports = {
  entry: path.join(__dirname, 'entry.js'),
  output: {
    path: path.join(__dirname, '/'),
    filename: 'bundle-js.js'
  },
  module: {
    loaders: [
      {
        test: /\.css$/,
        loader: 'css-loader'
      }
    ]
  },
  plugins: [
    new ClosureCompilerPlugin({
      jsCompiler: true,
      compiler: {
        language_in: 'ECMASCRIPT6',
        language_out: 'ECMASCRIPT5',
        compilation_level: 'ADVANCED',
        externs: [path.join(__dirname, 'externs.js')]
      }
    })
  ]
};
