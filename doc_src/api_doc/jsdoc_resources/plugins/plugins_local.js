/**
    @overview Make references to local things local.
    @module plugins/local
    @author Michael Mathews <micmath@gmail.com>
 */
'use strict';
var thisModule = '',
    registry = {};

function reset() {
    thisModule = '';
    registry = {};
}

exports.defineTags = function(dictionary) {
    dictionary.defineTag('local', {
        onTagged: function(doclet, tag) {
            registry[tag.text] = true;
        }
    });
}

exports.handlers = {
    jsdocCommentFound: function(e) {
        if (thisModule) for (var local in registry) {

            // B4W: commented
            // e.comment = e.comment.replace("{" + local, "{" + thisModule+'~'+local);

            var re = new RegExp("([^a-zA-Z0-9])" + local, "g");
            e.comment = e.comment.replace(re, "$1"+thisModule+'~'+local);
        }
    },
    
    newDoclet: function(e) {
        if (e.doclet.kind === 'module') {
            thisModule = e.doclet.longname;
        }
        else {
            if (thisModule) for (var local in registry) {
                var augment;
                if (e.doclet.augments) {
                    for (var i = 0, len = e.doclet.augments.length; i < len; i++) {
                        augment = e.doclet.augments[i];
                        if (augment && augment.indexOf(local) === 0) {
                            e.doclet.augments[i] = thisModule+'~'+e.doclet.augments[i];
                        }
                    }
                }
                
                if (e.doclet.longname.indexOf(local) === 0) {
                    e.doclet.longname = thisModule+'~'+e.doclet.longname;
                }
            }
        }
    },
    fileComplete: function(e) {
        reset();
    }
};