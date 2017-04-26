#!/bin/bash
DEST=../deploy/apps/common
cp -v build/uranium.js $DEST/
cp -v build/uranium.js.mem $DEST/
cp -v build/uranium_wasm.js $DEST/
cp -v build/uranium_wasm.wasm $DEST/
