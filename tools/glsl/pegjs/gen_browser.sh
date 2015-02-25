#!/bin/bash

PEGJS=pegjs

PARSER_IN="gpp_parser.pegjs"
PARSER_OUT="../../../src/libs/gpp_parser.js"

EVAL_IN="eval.pegjs"
EVAL_OUT="../../../src/libs/gpp_eval.js"

TMP="/tmp/pegjs_tmp.js"

echo "Generate GLSL preprocessor parser"

$PEGJS --export-var "exports.parser" $PARSER_IN $TMP

echo "Wrap in module and store"

(echo "\"use strict\"" && \
 echo
 echo "/**" && \
 echo " * Auto-generated GLSL parser" && \
 echo " */" && \
 echo "b4w.module[\"__gpp_parser\"] = function(exports, require) {" && \
 echo
 cat $TMP && \
 echo
 echo "}") > $PARSER_OUT


echo "Generate GLSL preprocessor expression evaluator"

$PEGJS --export-var "exports.parser" $EVAL_IN $TMP

echo "Wrap in module and store"

(echo "\"use strict\"" && \
 echo
 echo "/**" && \
 echo " * Auto-generated GLSL parser" && \
 echo " */" && \
 echo "b4w.module[\"__gpp_eval\"] = function(exports, require) {" && \
 echo
 cat $TMP && \
 echo
 echo "}") > $EVAL_OUT
