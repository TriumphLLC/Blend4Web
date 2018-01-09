#!/bin/bash
SCRIPTPATH=$(dirname "$0")
DEST=$SCRIPTPATH/../dist/uranium
install -D -v $SCRIPTPATH/build/uranium.js $DEST/uranium.js
install -D -v $SCRIPTPATH/build/uranium.js.mem $DEST/uranium.js.mem
install -D -v $SCRIPTPATH/build/uranium_wasm.js $DEST/uranium_wasm.js
install -D -v $SCRIPTPATH/build/uranium_wasm.wasm $DEST/uranium_wasm.wasm
