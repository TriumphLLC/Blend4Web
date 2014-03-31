COMMON_DIR=external/deploy/apps/common

case ${1} in
	whitespace)
		OUT_FILE=$COMMON_DIR/b4w.white.min.js
		OPT_LEVEL=WHITESPACE_ONLY
		;;
	simple)
		OUT_FILE=$COMMON_DIR/b4w.simple.min.js
		OPT_LEVEL=SIMPLE_OPTIMIZATIONS
		;;
	advanced | *)
		OUT_FILE=$COMMON_DIR/b4w.min.js
		OPT_LEVEL=ADVANCED_OPTIMIZATIONS
		;;
esac

#echo "Level used: $OPT_LEVEL"

# prepare version.js
# VERSION = VERSION file
# DEBUG->RELEASE
# DATE=$(date)
VERSION=v`cat VERSION`
sed -e "s/VERSION\([ \t]*\)=\([ \t]*\)\([\'\"]\)\([\'\"]\)/VERSION\1=\2\3$VERSION\4/" \
	-e "s/TYPE\([ \t]*\)=\([ \t]*\)\([\'\"]\)DEBUG\([\'\"]\)/TYPE\1=\2\3RELEASE\4/" \
	-e "s/DATE\([ \t]*\)=\([ \t]*\)\([\'\"]\)\([\'\"]\)/DATE\1=\2\3$(date +%d.%m.%Y\ %H:%M:%S)\4/" \
	src/version.js > version_rel.js

# prepare config.js
# uranium_path : relative to compiled engine path
# smaa textures : relative to compiled engine path
sed -e "s/\(uranium_path[ \t]*:[ \t]*\)\([\'\"]\)[a-zA-Z_./]*\([\'\"]\)/\1\2\.\.\/common\/uranium\.js\3/" \
    -e "s/\(smaa_search_texture_path[ \t]*:[ \t]*\)\([\'\"]\)[a-zA-Z_./]*\([\'\"]\)/\1\2\.\.\/common\/smaa_search_texture\.png\3/" \
    -e "s/\(smaa_area_texture_path[ \t]*:[ \t]*\)\([\'\"]\)[a-zA-Z_./]*\([\'\"]\)/\1\2\.\.\/common\/smaa_area_texture\.png\3/" \
    src/config.js > config_rel.js

java -jar closure-compiler/compiler.jar \
    --compilation_level $OPT_LEVEL \
    --jscomp_off=nonStandardJsDocs \
    --externs closure-compiler/extern_web_audio.js \
    --externs closure-compiler/extern_gl-matrix.js \
    --externs closure-compiler/extern_modules.js \
    --js=src/modules.js \
    --js=version_rel.js \
    --js=config_rel.js \
    --js=src/boundings.js \
    --js=src/constraints.js \
    --js=src/controls.js \
    --js=src/curve.js \
    --js=src/dds.js \
    --js=src/debug.js \
    --js=src/extensions.js \
    --js=src/graph.js \
    --js=src/ipc.js \
    --js=src/hud.js \
    --js=src/renderer.js \
    --js=src/shaders.js \
    --js=glsl_utils/compiler/out/shader_texts.js \
    --js=src/geometry.js \
    --js=src/particles.js \
    --js=src/primitives.js \
    --js=src/prerender.js \
    --js=src/print.js \
    --js=src/reformer.js \
    --js=src/scenegraph.js \
    --js=src/textures.js \
    --js=src/assets.js \
    --js=src/loader.js \
    --js=src/camera.js \
    --js=src/lights.js \
    --js=src/scenes.js \
    --js=src/physics.js \
    --js=src/data.js \
    --js=src/batch.js \
    --js=src/nodemat.js \
    --js=src/animation.js \
    --js=src/transform.js \
    --js=src/tsr.js \
    --js=src/util.js \
    --js=src/sfx.js \
    --js=src/third_party/gl-matrix2.js \
    --js=src/third_party/gpp_eval.js \
    --js=src/third_party/md5.js \
    --js=src/ext/animation.js \
    --js=src/ext/assets.js \
    --js=src/ext/camera.js \
    --js=src/ext/config.js \
    --js=src/ext/controls.js \
    --js=src/ext/constraints.js \
    --js=src/ext/data.js \
    --js=src/ext/debug.js \
    --js=src/ext/hud.js \
    --js=src/ext/lights.js \
    --js=src/ext/material.js \
    --js=src/ext/physics.js \
    --js=src/ext/scenes.js \
    --js=src/ext/sfx.js \
    --js=src/ext/shaders.js \
    --js=src/ext/transform.js \
    --js=src/ext/util.js \
    --js=src/ext/version.js \
    --js=src/ext/main.js \
    --js_output_file=$OUT_FILE

rm version_rel.js
rm config_rel.js
