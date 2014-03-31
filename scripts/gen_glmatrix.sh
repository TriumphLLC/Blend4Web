#!/bin/bash

DISTR="../../src/gl-matrix"
OUTFILE="../src/third_party/gl-matrix2.js"

function empty_line {
	echo "" >> "$1"
}

function store_module {
	name=$1
        path_in=$2
        path_out=$3
	deps=$4

        echo "Store module $path_in"

	empty_line $path_out

	echo "b4w.module[\"$name\"] = function(exports, require) {" >> $path_out

	empty_line $path_out


	for d in $deps; do
		echo "var $d = require(\"$d\");" >> $path_out
	done

	empty_line $path_out

	# increased precision: (1*10-6 -> 1*10-7)
	echo "var GLMAT_EPSILON = 0.0000001;" >> $path_out
	echo "var GLMAT_ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;" >> $path_out
	echo "var GLMAT_RANDOM = Math.random;" >> $path_out

	empty_line $path_out

	#cat $path_in >> $path_out
	
	sed 	-e "s/var[ \t]\+$name[ \t]*=[ \t]*{[ \t]*};/var $name = exports;/" \
		-e "s/\(vec3.cross[ \t]*(\)\([a-zA-Z0-9]\+\),\ \([a-zA-Z0-9, ]\+\)\();\)/\1\3,\ \2\4 \/\* NOTE: CUSTOM REORDER: (\2, \3)->(\3, \2)\ \*\//" \
		-e "s/\(quat.setAxisAngle[ \t]*(\)\([a-zA-Z0-9]\+\),\ \([a-zA-Z0-9,. ]\+\)\();\)/\1\3,\ \2\4 \/\* NOTE: CUSTOM REORDER: (\2, \3)->(\3, \2)\*\//" \
		-e "s/quat.normalize(out, quat\.fromMat3(out, matr));/quat.normalize(quat\.fromMat3(matr, out), out); \/\* NOTE: DOUBLE CUSTOM REORDER \*\//" \
		-e "s/\([a-z0-9]\+\.[a-zA-Z0-9]\+[ \t]*=[ \t]*function[ \t]*(\)out,\ \([a-zA-Z0-9, ]\+\)\()[ \t]*{\)/\1\2,\ out\3/" \
		-e "s/\(return[ \t]\+function[ \t]*(\)out,\ \([a-zA-Z0-9, ]\+\)\()[ \t]*{\)/\1\2,\ out\3/" \
		-e "s/\([a-z0-9]\+\.[a-zA-Z0-9]\+[ \t]*(\)out,\ \([a-zA-Z0-9, ]\+\)\()\)/\1\2,\ out\3/" \
		-e "s/\(fn[ \t]*(\)\([a-z]\+\),\ \([a-z, ]\+\)\()\)/\1\3,\ \2\4/" \
		-e "s/0.999999/0.9999999/" \
		$path_in >> $path_out

	empty_line $path_out

	echo "}" >> $path_out
}

echo "\"use strict\"" > $OUTFILE

empty_line $OUTFILE

echo "/**" >> $OUTFILE
echo " * Auto-generated set of modules." >> $OUTFILE
echo " * using glMatrix `cat $DISTR/VERSION`" >> $OUTFILE 
echo " * NOTE: pay attention to quat.rotationTo() and quat.setAxes()" >> $OUTFILE
echo " */" >> $OUTFILE

store_module "vec3" $DISTR/"src/gl-matrix/vec3.js" $OUTFILE ""
store_module "vec4" $DISTR/"src/gl-matrix/vec4.js" $OUTFILE ""
store_module "quat" $DISTR/"src/gl-matrix/quat.js" $OUTFILE "vec3 vec4 mat3"
store_module "mat3" $DISTR/"src/gl-matrix/mat3.js" $OUTFILE ""
store_module "mat4" $DISTR/"src/gl-matrix/mat4.js" $OUTFILE ""
