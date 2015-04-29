#!/bin/bash

echo "Build Windows 32 bit module"

CC=i686-w64-mingw32-gcc 
CCOPTS="-DINIT_FUNC_NAME=PyInit_b4w_bin_Windows_32 -I/home/dal/.wine/drive_c/Python34/include"
#LDOPTS=""
LDOPTS="-Lwin_libs -lpython3_32"
#PYTHONLIB="win_libs/libpython3_32.a"
#PYTHONLIB="$HOME/.wine/drive_c/Python33_32/libs/libpython33.a"
OUT="../../blender_scripts/addons/blend4web/b4w_bin_Windows_32.pyd"

$CC $CCOPTS -c bindings.c
$CC $CCOPTS -c mikktspace.c
$CC $CCOPTS -c weldmesh.c

$CC -shared $CCOPTS -o $OUT bindings.c mikktspace.o weldmesh.o $PYTHONLIB $LDOPTS

rm bindings.o mikktspace.o weldmesh.o

#echo "Build Windows 64 bit module"
#
#CC=x86_64-w64-mingw32-gcc 
#CCOPTS="-DINIT_FUNC_NAME=PyInit_b4w_bin_Windows_64 -I/home/al/.wine/drive_c/Python33_64/include"
##LDOPTS=""
#LDOPTS="-Lwin_libs -lpython3_64"
##PYTHONLIB="win_libs/libpython3_64.a"
##PYTHONLIB="$HOME/.wine/drive_c/Python33_32/libs/libpython33.a"
##PYTHONLIB="$HOME/Downloads/Python-3.3.3/PC/libpython3.a"
##PYTHONLIB=""
#OUT="../../external/blender_scripts/addons/blend4web/b4w_bin_Windows_64.pyd"
#
#$CC $CCOPTS -c bindings.c
#$CC $CCOPTS -c mikktspace.c
#$CC $CCOPTS -c weldmesh.c
#
#$CC -shared $CCOPTS -o $OUT bindings.c mikktspace.o weldmesh.o $PYTHONLIB $LDOPTS
#
#rm bindings.o mikktspace.o weldmesh.o

#echo "Build Linux 32 bit module"
#CC=gcc
#
#OUT="../../external/blender_scripts/addons/blend4web/b4w_bin_Linux_32.so"
#CCOPTS="-DINIT_FUNC_NAME=PyInit_b4w_bin_Linux_32 -I/usr/include/python3.4 -pthread -g -Wall -Wl,-Bsymbolic-functions -fPIC"
#
#$CC -shared $CCOPTS bindings.c mikktspace.c weldmesh.c -o $OUT
