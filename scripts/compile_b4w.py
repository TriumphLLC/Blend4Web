#!/usr/bin/python3

import os, sys, subprocess, re, datetime, getopt

BASE_DIR          = os.path.abspath(os.path.dirname(__file__))
COMMON_DIR        = os.path.join(BASE_DIR, "..", "external/deploy/apps/common/")

ENGINE_NAME       = "b4w.min.js"
ENGINE_NAME_FULL  = "b4w.full.min.js"

CURRENT_DATE      = datetime.datetime.now().strftime("%d.%m.%Y %I:%M:%S")

COMPILER_PARAMS   = ['java',
                     '-jar',
                     os.path.relpath(os.path.join(BASE_DIR, "..", "tools", "closure-compiler/compiler.jar")),
                     '--compilation_level=ADVANCED_OPTIMIZATIONS',
                     '--language_in=ECMASCRIPT5',
                     '--jscomp_off=nonStandardJsDocs']

ADDONS            = ["src/addons/app.js",
                     "src/addons/camera_anim.js",
                     "src/addons/mixer.js",
                     "src/addons/npc_ai.js",
                     "src/addons/mouse.js",
                     "src/addons/preloader.js",
                     "src/addons/storage.js"]

EXTERNS           = ["tools/closure-compiler/extern_gl-matrix.js",
                     "tools/closure-compiler/extern_globals.js",
                     "tools/closure-compiler/extern_modules.js",
                     "tools/closure-compiler/extern_pointerlock.js",
                     "tools/closure-compiler/w3c_audio.js"]

SRC_FILES         = ['src/modules.js',
                     'version_rel.js',
                     'config_rel.js',
                     'src/boundings.js',
                     'src/compat.js',
                     'src/constraints.js',
                     'src/controls.js',
                     'src/curve.js',
                     'src/dds.js',
                     'src/debug.js',
                     'src/extensions.js',
                     'src/graph.js',
                     'src/ipc.js',
                     'src/hud.js',
                     'src/renderer.js',
                     'src/shaders.js',
                     'src/geometry.js',
                     'src/objects.js',
                     'src/particles.js',
                     'src/primitives.js',
                     'src/prerender.js',
                     'src/print.js',
                     'src/reformer.js',
                     'src/scenegraph.js',
                     'src/textures.js',
                     'src/assets.js',
                     'src/loader.js',
                     'src/nla.js',
                     'src/camera.js',
                     'src/lights.js',
                     'src/scenes.js',
                     'src/physics.js',
                     'src/data.js',
                     'src/batch.js',
                     'src/nodemat.js',
                     'src/animation.js',
                     'src/transform.js',
                     'src/tsr.js',
                     'src/util.js',
                     'src/sfx.js']

SRC_EXT_FILES     = ['src/ext/animation.js',
                     'src/ext/assets.js',
                     'src/ext/camera.js',
                     'src/ext/config.js',
                     'src/ext/controls.js',
                     'src/ext/constraints.js',
                     'src/ext/data.js',
                     'src/ext/debug.js',
                     'src/ext/geometry.js',
                     'src/ext/hud.js',
                     'src/ext/lights.js',
                     'src/ext/material.js',
                     'src/ext/particles.js',
                     'src/ext/physics.js',
                     'src/ext/scenes.js',
                     'src/ext/sfx.js',
                     'src/ext/shaders.js',
                     'src/ext/textures.js',
                     'src/ext/transform.js',
                     'src/ext/util.js',
                     'src/ext/version.js',
                     'src/ext/main.js']

SRC_LIBS_FILES =    ['src/libs/gl-matrix2.js',
                     'src/libs/gpp_eval.js',
                     'src/libs/md5.js',
                     'src/libs/shader_texts.js']


def run():
    dest_file      = False
    compile_addons = False
    gen_globals    = False

    try:
        opts, args = getopt.getopt(sys.argv[1:], "hd:ag", ["help", "destination=", "compile_addons", "gen_globals"])
    except getopt.GetoptError as err:
        help(err)
        sys.exit(1)

    for o, a in opts:
        if o == "--compile_addons" or o == "-a":
            compile_addons = True
        elif o == "--destination" or o == "-d":
            dest_file = a
        elif o == "--gen_globals" or o == "-g":
            gen_globals = True
        elif o == "--help" or o == "-h":
            help()
            sys.exit(0)

    if dest_file:
        dest_file_path = os.path.join(dest_file)
    elif compile_addons:
        dest_file_path = os.path.join(COMMON_DIR, ENGINE_NAME_FULL)
    else:
        dest_file_path = os.path.join(COMMON_DIR, ENGINE_NAME)

    version_file = open(os.path.join(BASE_DIR, "..", "VERSION"))
    version_text = version_file.read()
    version_file.close()
    verc_text_regex = re.compile('\s')
    version_text = verc_text_regex.sub('', version_text)

    version_js_file = open(os.path.join(BASE_DIR, "..", "src/version.js"))
    version_js_text = version_js_file.readlines()
    version_js_file.close()

    version_rel_js_file = open(os.path.join(BASE_DIR, "..","version_rel.js"), "a")
    version_rel_js_file = open(os.path.join(BASE_DIR, "..","version_rel.js"), "w")
    version_rel_js_file.truncate()

    for line in version_js_text:
        line = re.sub(r'(var\sTYPE\s=\s[\'|\"])+(DEBUG)', r'\1RELEASE', line)
        line = re.sub(r'(var\sVERSION\s=\s[\"|\'])+( *|\s)', r'\g<1>' + version_text, line)
        line = re.sub(r'(var\sDATE\s=\s[\"|\'])+( *|\s)', r'\g<1>' + CURRENT_DATE, line)

        version_rel_js_file.write(line)

    version_rel_js_file.close()

    config_js_file  = open(os.path.join(BASE_DIR, "..", "src/config.js"))
    config_js_text = config_js_file.readlines()
    config_js_file.close()

    config_rel_js_file = open(os.path.join(BASE_DIR, "..","config_rel.js"), "a")
    config_rel_js_file = open(os.path.join(BASE_DIR, "..","config_rel.js"), "w")
    config_rel_js_file.truncate()

    for line in config_js_text:
        line = re.sub(r'(resources_dir\s*:\s*[\"|\'])+(..\/external\/deploy\/apps\/common)', r'\1.', line)
        line = re.sub(r'(ASSETS=..\/..\/)+(external\/deploy\/)+(assets\/)', r'\1\3', line)

        config_rel_js_file.write(line)

    config_rel_js_file.close()

    # add path to files
    addons  = ['--js=' + os.path.relpath(os.path.join(BASE_DIR, "..", i)) for i in ADDONS]
    externs = ['--externs=' + os.path.relpath(os.path.join(BASE_DIR, "..", i)) for i in EXTERNS]
    src_files = ['--js=' + os.path.relpath(os.path.join(BASE_DIR, "..", i)) for i in SRC_FILES]
    src_libs_files = ['--js=' + os.path.relpath(os.path.join(BASE_DIR, "..", i)) for i in SRC_LIBS_FILES]
    src_ext_files = ['--js=' + os.path.relpath(os.path.join(BASE_DIR, "..", i)) for i in SRC_EXT_FILES]

    compiler_params = list(COMPILER_PARAMS)

    externs_gen_file = open(os.path.join(BASE_DIR, "../", "tools", "closure-compiler/extern_globals.js"), "a")
    externs_gen_file = open(os.path.join(BASE_DIR, "../", "tools", "closure-compiler/extern_globals.js"), "w")

    for addon in ADDONS:
        f = open(os.path.join(BASE_DIR, "..", addon))
        text = f.read()
        f.close()

        function_names = re.findall(r'exports\.(?P<function>\S[^=^\s^(]*)', text)

        if gen_globals:
            raw_attrs_names = re.findall(r'@cc_externs\s+(?P<cc_externs>[\S].+)', text)
            attrs_names = []

            for attr in raw_attrs_names:
                attrs_names.extend(re.findall(r'\S+', attr))

            function_names.extend(attrs_names)

        for func in function_names:
            externs_gen_file.write("Object.prototype." + func + ";\n")

    for ext in SRC_EXT_FILES:
        f = open(os.path.join(BASE_DIR, "..", ext))
        text = f.read()
        f.close()

        function_names = re.findall(r'exports\.(?P<function>\S[^=^\s^(]*)', text)

        if gen_globals:
            raw_attrs_names = re.findall(r'@cc_externs\s+(?P<cc_externs>[\S].+)', text)
            attrs_names = []

            for attr in raw_attrs_names:
                attrs_names.extend(re.findall(r'\S+', attr))

            function_names.extend(attrs_names)

        for func in function_names:
            externs_gen_file.write("Object.prototype." + func + ";\n")

    externs_gen_file.close()

    compiler_params.extend(externs)
    compiler_params.extend(src_files)
    compiler_params.extend(src_libs_files)
    compiler_params.extend(src_ext_files)

    if compile_addons:
        compiler_params.extend(addons)

    compiler_params.append('--js_output_file=' + os.path.relpath(dest_file_path))

    subprocess.call(compiler_params)

    os.remove(os.path.join(BASE_DIR, "..","version_rel.js"))
    os.remove(os.path.join(BASE_DIR, "..","config_rel.js"))

def help(err=""):
    print(err, "Usage: compile_b4w.py [-h] [-a] [-d] DIST_FILE")

if __name__ == "__main__":
    run()
