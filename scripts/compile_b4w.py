#!/usr/bin/env python3

import os, sys, subprocess, re, datetime, getopt

BLUE    = '\033[94m'
GREEN   = '\033[92m'
RED     = "\033[91m"
YELLOW  = "\033[93m"
ENDCOL  = "\033[0m"

_os_join = os.path.join
_os_norm = os.path.normpath

BASE_DIR          = os.path.abspath(os.path.dirname(__file__))

COMMON_DIR        = _os_join(BASE_DIR, "..", "deploy", "apps", "common")

ENGINE_NAME       = "b4w.min.js"
ENGINE_NAME_FULL  = "b4w.full.min.js"

CURRENT_DATE      = datetime.datetime.now().strftime("%d.%m.%Y %I:%M:%S")

COMPILER_PARAMS   = ['java',
                     '-jar',
                     _os_join(BASE_DIR,
                        "..",
                        "tools",
                        "closure-compiler", "compiler.jar"),
                     '--language_in=ECMASCRIPT5',
                     '--jscomp_off=nonStandardJsDocs']

ADDONS            = ["src/addons/app.js",
                     "src/addons/camera_anim.js",
                     "src/addons/gyroscope.js",
                     "src/addons/mixer.js",
                     "src/addons/npc_ai.js",
                     "src/addons/mouse.js",
                     "src/addons/preloader.js",
                     "src/addons/storage.js",
                     "src/addons/screenshooter.js"]

EXTERNS           = ["tools/closure-compiler/extern_fullscreen.js",
                     "tools/closure-compiler/extern_gl-matrix.js",
                     "tools/closure-compiler/extern_modules.js",
                     "tools/closure-compiler/extern_pointerlock.js",
                     "tools/closure-compiler/w3c_audio.js"]

SRC_FILES         = ['src/b4w.js',
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
                     'src/time.js',
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
                     'src/ext/objects.js',
                     'src/ext/main.js']

SRC_LIBS_FILES    = ['src/libs/gl-matrix2.js',
                     'src/libs/gpp_eval.js',
                     'src/libs/md5.js',
                     'src/libs/shader_texts.js']

EXCLUSION_MODULES = ['src/libs/gpp_parser.js']


def run():
    dest_file      = False
    compile_addons = False
    gen_globals    = False
    optimization   = "SIMPLE_OPTIMIZATIONS"
    ext_js         = []

    try:
        opts, args = getopt.getopt(sys.argv[1:], "hd:o:age:",
                                                ["help",
                                                 "destination=",
                                                 "optimization=",
                                                 "compile_addons",
                                                 "gen_globals",
                                                 "ext_js="])
    except getopt.GetoptError as err:
        help(err)
        sys.exit(0)

    for o, a in opts:
        if o == "--compile_addons" or o == "-a":
            compile_addons = True
        elif o == "--destination" or o == "-d":
            dest_file = a
        elif o == "--gen_globals" or o == "-g":
            gen_globals = True
        elif o == "--ext_js" or o == "-e":
            ext_js.append(a)
        elif o == "--optimization" or o == "-o":
            if a == "simple":
                optimization = "SIMPLE_OPTIMIZATIONS"
            elif a == "advanced":
                optimization = "ADVANCED_OPTIMIZATIONS"
            elif a == "whitespace":
                optimization = "WHITESPACE_ONLY"
        elif o == "--help" or o == "-h":
            help()
            sys.exit(0)

    if dest_file:
        dest_file_path = _os_norm(_os_join(dest_file))
    elif compile_addons:
        dest_file_path = _os_norm(_os_join(COMMON_DIR, ENGINE_NAME_FULL))
    else:
        dest_file_path = _os_norm(_os_join(COMMON_DIR, ENGINE_NAME))

    if len(ext_js):
        externs_gen_name = "app_globals.js"
    else:
        externs_gen_name = "extern_globals.js"

    EXTERNS.append(_os_norm(_os_join("tools",
                                     "closure-compiler",
                                     externs_gen_name)))

    externs = prepare_externs(EXTERNS)
    src_files = prepare_js(SRC_FILES)
    src_libs_files = prepare_js(SRC_LIBS_FILES)
    src_ext_files = prepare_js(SRC_EXT_FILES)

    compiler_params = list(COMPILER_PARAMS)

    externs_gen_file = open(_os_join(BASE_DIR, "..", "tools",
                                     "closure-compiler", externs_gen_name),
                        "a")

    externs_gen_file = open(_os_join(BASE_DIR, "..", "tools",
                                     "closure-compiler", externs_gen_name),
                        "w")

    append_externs_items(ADDONS, ext_js, externs_gen_file, gen_globals)
    append_externs_items(SRC_EXT_FILES, ext_js, externs_gen_file, gen_globals)

    externs_gen_file.close()

    refact_version()

    compiler_params.append('--compilation_level=' + optimization)

    if len(ext_js):
        refact_ext_js = check_modules(ext_js)

        refact_ext_js = ['--js=' + i for i in refact_ext_js]

        compiler_params.extend(refact_ext_js)

        refact_config(os.path.basename(dest_file_path))
    else:
        refact_config()
        compiler_params.extend(src_files)
        compiler_params.extend(src_libs_files)
        compiler_params.extend(src_ext_files)

        if compile_addons:
            addons = prepare_js(ADDONS)
            compiler_params.extend(addons)

    compiler_params.extend(externs)

    compiler_params.append('--js_output_file=' +
                           os.path.relpath(dest_file_path))

    print("    " + "-"*(len(dest_file_path) + len("Compiling : ")))
    print(GREEN + "    Compiling" + ENDCOL + " :",
          BLUE + dest_file_path + ENDCOL)
    print("    " + "-"*(len(dest_file_path) + len("Compiling : ")))

    subprocess.call(compiler_params)

    if os.path.exists(_os_join(BASE_DIR, "..", "version_rel.js")):
        os.remove(_os_join(BASE_DIR, "..", "version_rel.js"))
    if os.path.exists(_os_join(BASE_DIR, "..", "config_rel.js")):
        os.remove(_os_join(BASE_DIR, "..", "config_rel.js"))

    if len(ext_js):
        os.remove(_os_join(BASE_DIR, "..", "tools",
                           "closure-compiler", "app_globals.js"))


def append_externs_items(paths, ext_js, externs_gen_file, gen_globals):
    """
    Finds items in js files which must be added in extern file.
    """
    for path in paths:
        abs_path = _os_norm(_os_join(BASE_DIR, "..", path))

        if len(ext_js) and not abs_path in ext_js:
            continue

        f = open(abs_path)
        text = f.read()
        f.close()

        function_names = []

        if not len(ext_js):
            pattern = r'exports\.(?P<function>\S[^=^\s^(]*)'
            function_names = re.findall(pattern, text)

        if gen_globals:
            pattern = r'@cc_externs\s+(?P<cc_externs>[\S].+)'
            raw_attrs_names = re.findall(pattern, text)

            attrs_names = []

            for attr in raw_attrs_names:
                attrs_names.extend(re.findall(r'\S+', attr))

            function_names.extend(attrs_names)

        for func in function_names:
            externs_gen_file.write("Object.prototype." + func + ";\n")


def check_modules(ext_js):
    """
    Checks requirement of config.js and version.js.
    """
    refact_ext_js = []

    for js in ext_js:
        ex_module = False

        if _os_norm(_os_join(BASE_DIR, "..", "src", "config.js")) == js:
            refact_ext_js.append(_os_norm(_os_join(BASE_DIR, "..",
                                                   "config_rel.js")))
            continue

        if _os_norm(_os_join(BASE_DIR, "..", "src", "version.js")) == js:
            refact_ext_js.append(_os_norm(_os_join(BASE_DIR, "..",
                                                   "version_rel.js")))
            continue

        for ex in EXCLUSION_MODULES:
            if _os_norm(_os_join(BASE_DIR, "..", ex)) == js:
                ex_module = True
                break

        if not ex_module:
            refact_ext_js.append(js)

    return refact_ext_js


def refact_config(app_js=False):
    """
    Changes meta data in config.js file for working in compiled engine
    """
    config_js_file  = open(_os_join(BASE_DIR, "..", "src", "config.js"))
    config_js_text = config_js_file.readlines()
    config_js_file.close()

    config_rel_js_file = open(_os_join(BASE_DIR, "..", "config_rel.js"), "a")
    config_rel_js_file = open(_os_join(BASE_DIR, "..", "config_rel.js"), "w")
    config_rel_js_file.truncate()

    for line in config_js_text:
        pattern_1 = r'(resources_dir\s*:\s*[\"|\'])+(..\/deploy\/apps\/common)'
        pattern_2 = r'(ASSETS=..\/..\/)+(deploy\/)+(assets\/)'

        line = re.sub(pattern_1, r'\1.', line)
        line = re.sub(pattern_2, r'\1\3', line)

        if app_js:
            line = re.sub('USER_DEFINED_MODULE', app_js, line)

        config_rel_js_file.write(line)

    config_rel_js_file.close()


def refact_version():
    """
    Changes meta data in version.js file for working in compiled engine
    """
    version_file = open(_os_join(BASE_DIR, "..", "VERSION"))
    version_text = version_file.read()
    version_file.close()
    verc_text_regex = re.compile('\s')
    version_text = verc_text_regex.sub('', version_text)

    version_js_file = open(_os_join(BASE_DIR, "..", "src", "version.js"))
    version_js_text = version_js_file.readlines()
    version_js_file.close()

    version_rel_js_file = open(_os_join(BASE_DIR, "..",
                                        "version_rel.js"), "a")
    version_rel_js_file = open(_os_join(BASE_DIR, "..",
                                        "version_rel.js"), "w")
    version_rel_js_file.truncate()

    for line in version_js_text:
        pattern_1 = r'(var\sTYPE\s=\s[\'|\"])+(DEBUG)'
        pattern_2 = r'(var\sVERSION\s=\s[\"|\'])+( *|\s)'
        pattern_3 = r'(var\sDATE\s=\s[\"|\'])+( *|\s)'

        line = re.sub(pattern_1, r'\1RELEASE', line)
        line = re.sub(pattern_2, r'\g<1>' + version_text, line)
        line = re.sub(pattern_3, r'\g<1>' + CURRENT_DATE, line)

        version_rel_js_file.write(line)

    version_rel_js_file.close()


def prepare_js(paths):
    """
    Prepares js files for working with closure-compiler.
    """
    return ['--js=' + _os_join(BASE_DIR, "..", i) for i in paths]


def prepare_externs(paths):
    """
    Preparing externs files for working with closure-compiler.
    """
    return ['--externs=' + _os_join(BASE_DIR, "..", i) for i in paths]


def help(err=""):
    """
    Displays help for compiler.
    """
    print(err, "Usage: compile_b4w.py [-h] [-a] [-d] [-e] DIST_FILE")


if __name__ == "__main__":
    run()
