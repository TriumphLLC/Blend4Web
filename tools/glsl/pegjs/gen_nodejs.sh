#!/bin/bash

PEGJS_GLSL='pegjs --allowed-start-rules start,pp_start'
PEGJS_GPP=pegjs

echo "Generate GLSL parser"
PARSER_IN="glsl_parser.pegjs"
PARSER_OUT="../compiler/glsl_parser.js"
$PEGJS_GLSL $PARSER_IN $PARSER_OUT

echo "Generate GLSL preprocessor parser"
PARSER_IN="gpp_parser.pegjs"
PARSER_OUT="../compiler/gpp_parser.js"
$PEGJS_GPP $PARSER_IN $PARSER_OUT
