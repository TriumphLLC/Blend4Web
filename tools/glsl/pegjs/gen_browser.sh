#!/bin/bash

PEGJS=pegjs

PARSER_IN="gpp_parser.pegjs"
PARSER_OUT="../../../src/libs/gpp_parser.js"

TMP="/tmp/pegjs_tmp.js"

echo "Generate GLSL preprocessor parser"

$PEGJS --export-var "gpp_parser" $PARSER_IN $TMP

echo "Wrap in module and store"

(echo "/**" && \
 echo " * Auto-generated GLSL parser" && \
 echo " */" && \
 echo "var gpp_parser;" && \
 echo

 cat $TMP && \
 echo
 echo "export var parser = gpp_parser;" && \
 echo
 ) > $PARSER_OUT
