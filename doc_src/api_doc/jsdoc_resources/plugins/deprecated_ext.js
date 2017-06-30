/**
 * @overview Extension for the @deprecated tag. Allows to specify the version since 
 * which a particular deprecation was introduced.
 * Usage: @deprecated [VERSION] TEXT
 * @module deprecated_ext
 * @author Blend4Web <info@blend4web.com>
 */
"use strict";

exports.handlers = {
    newDoclet: function(e) {
        if (e.doclet.deprecated) {
            var depr_str = e.doclet.deprecated.trim();
            var res = depr_str.match(/\[([^\[\]]*)\](.*)/)

            if (res) {
                e.doclet.deprecated = res[2].trim();
                e.doclet.b4w_deprecated_since = res[1].trim();
            } else
                e.doclet.b4w_deprecated_since = "";
        }

    }
};