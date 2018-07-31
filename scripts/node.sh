#!/bin/bash

SCRIPTPATH=$(dirname "$0")
_path=$SCRIPTPATH/../tools/node/node-v8.9.4-linux-x86/bin
MACHINE_TYPE=`uname -m`
if [ ${MACHINE_TYPE} == 'x86_64' ]; then
  _path=$SCRIPTPATH/../tools/node/node-v8.9.4-linux-x64/bin
fi

suff=

case "$OSTYPE" in
  darwin*)  _path=$SCRIPTPATH/../tools/node/node-v8.9.4-darwin-x64/bin ;; 
  msys*)    _path=$SCRIPTPATH/../tools/node/node-v8.9.4-win-x86 ; suf=.exe ;;
  cygwin*)  _path=$SCRIPTPATH/../tools/node/node-v8.9.4-win-x86 ;;
esac

PATH=$_path:$PATH $_path/node$suf $@
