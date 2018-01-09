/**
 * Created by jandersen on 3/23/15.
 */
var assert = require("assert");
var StringReplacePlugin = require("./index.js");

describe('StringReplacePlugin', function(){
    describe('#replace()', function(){
        it('should throw with invalid options', function(){
            assert.throws(function() {
                StringReplacePlugin.replace({
                    replacements: []
                })
            },
            /Invalid options/);

            assert.throws(function() {
                StringReplacePlugin.replace({})
            },
            /Invalid options/);
        });

        it('should not throw with valid options', function(){
            assert.doesNotThrow(function() {
                    var loaderStr = StringReplacePlugin.replace({
                        replacements: [{
                            pattern: /<!-- @secret (\w*?) -->/ig,
                            replacement: function (match, p1, offset, string) {
                                return secrets.web[p1];
                            }
                        }]
                    });

                    assert.ok(loaderStr.indexOf("!") === -1, 'No chained loaders expected');
                });
        });

        it('should add next loaders', function(){
            var loaderStr = StringReplacePlugin.replace('html-loader', {
                    replacements: [{
                        pattern: /<!-- @secret (\w*?) -->/ig,
                        replacement: function (match, p1, offset, string) {
                            return secrets.web[p1];
                        }
                    }]
                });
            assert.ok(loaderStr !== null);
            assert.ok(loaderStr.indexOf('html-loader!') === 0);
        });
    });

    describe('#apply()', function(){
        var plugin = new StringReplacePlugin(),
            loader = require("./loader.js"),
            replInst = {
                replacements: [{
                    pattern: /<!-- @secret (\w*?) -->/ig,
                    replacement: function (match, p1, offset, string) {
                        return 'replaced ==>' + p1 + '<==';
                    }
                }]
            },
            id = null,
            query = null,
            replaced = null;

        var callback = function() {
            return function(_, source) {
                replaced = source;
            };
        };
        var mockConfig = {
            options: {},
            emitWarning: console.log,
            async: callback
        };

        beforeEach(function(){
            // runs before each test in this block
            var loaderStr = StringReplacePlugin.replace('html-loader', replInst);
            var matches = loaderStr.match(/\?id=(\w*)(?=($|!))/);
            assert.ok(matches.length === 3);
            query = matches[0];
            id = matches[1];
        });

        it('should set replace options', function(){
            plugin.apply(mockConfig);

            var replOpts = mockConfig.options[StringReplacePlugin.REPLACE_OPTIONS];
            assert.ok(replOpts !== null, 'replace options should be present');
            assert.ok(replOpts[id] === replInst, 'replace options should contain id from loader');
        });

        it('should replace strings in source', function(){
            plugin.apply(mockConfig);
            mockConfig.query = query;
            loader.call(mockConfig, "some string");
            assert(replaced === "some string", "doesn't modify when there are no matches");

            loader.call(mockConfig, "some <!-- @secret stuff --> string");
            assert.equal(replaced, "some replaced ==>stuff<== string", "replaces matches");
        });

        it('should replace strings in source via options', function(){
            mockConfig.options.replacement = {
                before: 'replaced ==>',
                after: '<=='
            };
            plugin.apply(mockConfig);

            var replOpts = mockConfig.options[StringReplacePlugin.REPLACE_OPTIONS];

            replOpts[id] = {
                replacements: [{
                    pattern: /<!-- @secret (\w*?) -->/ig,
                    replacement: function (match, p1) {
                        return this.options.replacement.before + p1 + this.options.replacement.after;
                    }
                }]
            };

            mockConfig.query = query;

            loader.call(mockConfig, "some string");
            assert(replaced === "some string", "doesn't modify when there are no matches");

            loader.call(mockConfig, "some <!-- @secret stuff --> string");
            assert.equal(replaced, "some replaced ==>stuff<== string", "replaces matches");
        });
    })
});
