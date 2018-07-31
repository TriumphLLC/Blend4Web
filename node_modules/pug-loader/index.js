var path = require("path");
var dirname = path.dirname;
var loaderUtils = require("loader-utils");
var nodeResolve = require("resolve").sync;
var walk = require('pug-walk');

module.exports = function(source) {
	this.cacheable && this.cacheable();

	var modulePaths = {};
	modulePaths.pug = require.resolve("pug");
	modulePaths.load = nodeResolve("pug-load", {basedir: dirname(modulePaths.pug)});
	modulePaths.runtime = nodeResolve("pug-runtime", {basedir: dirname(modulePaths.pug)});

	var pug = require(modulePaths.pug);
	var load = require(modulePaths.load);

	var req = loaderUtils.getRemainingRequest(this).replace(/^!/, "");

	var query = loaderUtils.getOptions(this) || {};

	var loadModule = this.loadModule;
	var resolve = this.resolve;
	var loaderContext = this;
	var callback;

	var fileContents = {};
	var filePaths = {};

	var missingFileMode = false;
	function getFileContent(context, request) {
		request = loaderUtils.urlToRequest(request, query.root)
		var baseRequest = request;
		var filePath;

		filePath = filePaths[context + " " + request];
		if(filePath) return filePath;

		var isSync = true;
		resolve(context, request, function(err, _request) {
			if(err) {
				resolve(context, request, function(err2, _request) {
					if(err2) return callback(err2);

					request = _request;
					next();
				});
				return;
			}

			request = _request;
			next();
			function next() {
				loadModule("-!" + path.join(__dirname, "stringify.loader.js") + "!" + request, function(err, source) {
					if(err) return callback(err);

					filePaths[context + " " + baseRequest] = request;
					fileContents[request] = JSON.parse(source);

					if(!isSync) {
						run();
					}
				});
			}
		});

		filePath = filePaths[context + " " + baseRequest];
		if(filePath) return filePath;

		isSync = false;
		missingFileMode = true;
		throw "continue";
	}

	var plugin = loadModule ? {
		postParse: function (ast) {
			return walk(ast, function (node) {
				if ([
					"Mixin",
					"MixinBlock",
					"NamedBlock"
				].indexOf(node.type) !== -1) {
					ast._mustBeInlined = true;
				}
			});
		},
		resolve: function (request, source) {
			if (!callback) {
				callback = loaderContext.async();
			}

			if (!callback) {
				return load.resolve(request, source);
			}

			var context = dirname(source.split("!").pop());
			return getFileContent(context, request);
		},
		read: function (path) {
			if (!callback) {
				return load.read(path);
			}

			return fileContents[path];
		},
		postLoad: function postLoad(ast) {
			return walk(ast, function (node, replace) {
				if (node.file && node.file.ast) {
					postLoad(node.file.ast);
				}

				if (node.type === "Include") {
					if (node.file.ast._mustBeInlined) {
						ast._mustBeInlined = true;
					}
				}
			}, function (node, replace) {
				if (node.type === "Include" && !(node.block && node.block.nodes.length) && !node.file.ast._mustBeInlined) {
					replace({
						type: "Code",
						val: "require(" + loaderUtils.stringifyRequest(loaderContext, node.file.fullPath) + ").call(this, locals)",
						buffer: true,
						mustEscape: false,
						isInline: false,
						line: node.line,
						filename: node.filename
					});
				}
			});
		}
	} : {};

	run();
	function run() {
		try {
			var tmplFunc = pug.compileClient(source, {
				filename: req,
				doctype: query.doctype || "html",
				pretty: query.pretty,
				self: query.self,
				compileDebug: loaderContext.debug || false,
				globals: ["require"].concat(query.globals || []),
				name: "template",
				inlineRuntimeFunctions: false,
				filters: query.filters,
				plugins: [
					plugin
				].concat(query.plugins || [])
			});
		} catch(e) {
			if(missingFileMode) {
				// Ignore, it'll continue after async action
				missingFileMode = false;
				return;
			}
			loaderContext.callback(e);
			return;
		}
		var runtime = "var pug = require(" + loaderUtils.stringifyRequest(loaderContext, "!" + modulePaths.runtime) + ");\n\n";
		loaderContext.callback(null, runtime + tmplFunc.toString() + ";\nmodule.exports = template;");
	}
}
