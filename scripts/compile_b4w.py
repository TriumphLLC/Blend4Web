#!/usr/bin/env python3
"""Default python exec."""

import datetime
import getopt
import os
import platform
import re
import subprocess
import sys
import tempfile

from os.path import join, normpath
from mod_list import gen_module_list

BLUE = '\033[96m'
GREEN = '\033[92m'
RED = "\033[91m"
YELLOW = "\033[93m"
ENDCOL = "\033[0m"

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
COMMON_DIR = normpath(join(BASE_DIR, "..", "dist"))
WIN_JAVA_DIR = normpath(join(BASE_DIR, "..", "tools", "java", "win",
                        "openjdk-1.8.0.161-1.b14", "bin", "java.exe"))

DEFAULT_OPT = "SIMPLE_OPTIMIZATIONS"

ENGINE_NAME = "b4w.min.js"
ENGINE_NAME_SIMPLE = "b4w.simple.min.js"
ENGINE_NAME_WHITE = "b4w.whitespace.min.js"

CURRENT_DATE = "new Date({d.year}, {d.month}-1, {d.day}, {d.hour}, {d.minute},{d.second})".format(d=datetime.datetime.now())

ADDONS = []

externs_path = join("tools", "closure-compiler")

EXTERNS = [join(externs_path, "extern_fullscreen.js"),
           join(externs_path, "extern_gl-matrix.js"),
           join(externs_path, "extern_modules.js"),
           join(externs_path, "extern_pointerlock.js"),
           join(externs_path, "extern_webassembly.js")]

MERGED_SRC = [join(COMMON_DIR, "b4w.js")]

SRC_FILES = []

SRC_EXT_FILES = []

SRC_LIBS_FILES = []

EXCLUSION_MODULES = ['src/libs/gpp_parser.js']


def run():
    """Run cli script."""
    optimization = DEFAULT_OPT
    engine_name = ENGINE_NAME_SIMPLE
    ext_path = None
    externs_js = []
    use_source_map = False
    show_warn = False

    try:
        opts, args = getopt.getopt(sys.argv[1:], "ho:e:d:bw",
                                   ["help",
                                    "optimization=",
                                    "external-js=",
                                    "destination="
                                    "use-source-map",
                                    "show-warn"])
    except getopt.GetoptError as err:
        help(err)
        sys.exit(0)

    for o, a in opts:
        if o == "--external-js" or o == "-e":
            externs_js.append(a)
        elif o == "--destination" or o == "-d":
            ext_path = a
        elif o == "--optimization" or o == "-o":
            if a == "simple":
                pass
            elif a == "advanced":
                optimization = "ADVANCED_OPTIMIZATIONS"
                engine_name = ENGINE_NAME
            elif a == "whitespace":
                optimization = "WHITESPACE_ONLY"
                engine_name = ENGINE_NAME_WHITE
        elif o == "--help" or o == "-h":
            help()
            sys.exit(0)
        elif o == "--use-source-map" or o == "-b":
            use_source_map = True
        elif o == "--show-warn" or o == "-w":
            show_warn = True

    if not ext_path:
        dest_engine_path = join(COMMON_DIR, engine_name)
    else:
        dest_engine_path = ext_path

    update_modules_lists()


    externs = prepare_externs(EXTERNS)

    if platform.system() == "Windows":
        java_exec = WIN_JAVA_DIR
    else:
        java_exec = 'java'

    # Info about the warning types:
    # https://github.com/google/closure-compiler/wiki/Warnings#warnings-categories
    compiler_params = [java_exec,
                       '-jar',
                       join(BASE_DIR,
                            "..",
                            "node_modules",
                            "google-closure-compiler", "compiler.jar"),
                       '--language_in=ECMASCRIPT5',
                       '--jscomp_off=checkTypes',
                       '--jscomp_off=nonStandardJsDocs',
                       '--jscomp_off=reportUnknownTypes',
                       "--hide_warnings_for=gl-matrix2.js",
                       "--hide_warnings_for=pako_inflate.js"]
    if not show_warn:
        compiler_params.append("--warning_level=QUIET")
        compiler_params.append("--jscomp_off=checkVars")
        compiler_params.append("--jscomp_off=accessControls")
        compiler_params.append("--jscomp_off=ambiguousFunctionDecl")
        compiler_params.append("--jscomp_off=checkEventfulObjectDisposal")
        compiler_params.append("--jscomp_off=checkRegExp")
        compiler_params.append("--jscomp_off=const")
        # NOTE: forcing jscomp_warning for the "constantProperty" as a workaround 
        # for the gcc bug with the Element.querySelector method
        compiler_params.append("--jscomp_warning=constantProperty")
        compiler_params.append("--jscomp_off=deprecated")
        compiler_params.append("--jscomp_off=deprecatedAnnotations")
        compiler_params.append("--jscomp_off=duplicateMessage")
        compiler_params.append("--jscomp_off=es3")
        compiler_params.append("--jscomp_off=es5Strict")
        compiler_params.append("--jscomp_off=externsValidation")
        compiler_params.append("--jscomp_off=fileoverviewTags")
        compiler_params.append("--jscomp_off=functionParams")
        compiler_params.append("--jscomp_off=globalThis")
        compiler_params.append("--jscomp_off=internetExplorerChecks")
        compiler_params.append("--jscomp_off=misplacedTypeAnnotation")
        compiler_params.append("--jscomp_off=missingPolyfill")
        compiler_params.append("--jscomp_off=missingProperties")
        compiler_params.append("--jscomp_off=missingReturn")
        compiler_params.append("--jscomp_off=msgDescriptions")
        compiler_params.append("--jscomp_off=newCheckTypes")
        compiler_params.append("--jscomp_off=suspiciousCode")
        compiler_params.append("--jscomp_off=strictModuleDepCheck")
        compiler_params.append("--jscomp_off=typeInvalidation")
        compiler_params.append("--jscomp_off=undefinedNames")
        compiler_params.append("--jscomp_off=undefinedVars")
        compiler_params.append("--jscomp_off=unknownDefines")
        compiler_params.append("--jscomp_off=unusedLocalVariables")
        compiler_params.append("--jscomp_off=uselessCode")
    else:
        compiler_params.append("--jscomp_warning=checkVars")
        compiler_params.append("--jscomp_warning=accessControls")
        compiler_params.append("--jscomp_warning=ambiguousFunctionDecl")
        compiler_params.append("--jscomp_warning=checkEventfulObjectDisposal")
        compiler_params.append("--jscomp_warning=checkRegExp")
        compiler_params.append("--jscomp_warning=const")
        compiler_params.append("--jscomp_warning=constantProperty")
        compiler_params.append("--jscomp_warning=deprecated")
        compiler_params.append("--jscomp_warning=deprecatedAnnotations")
        compiler_params.append("--jscomp_warning=duplicateMessage")
        compiler_params.append("--jscomp_warning=es3")
        compiler_params.append("--jscomp_warning=es5Strict")
        compiler_params.append("--jscomp_warning=externsValidation")
        compiler_params.append("--jscomp_warning=fileoverviewTags")
        compiler_params.append("--jscomp_warning=functionParams")
        compiler_params.append("--jscomp_warning=globalThis")
        compiler_params.append("--jscomp_warning=internetExplorerChecks")
        compiler_params.append("--jscomp_warning=misplacedTypeAnnotation")
        compiler_params.append("--jscomp_warning=missingPolyfill")
        compiler_params.append("--jscomp_warning=missingProperties")
        compiler_params.append("--jscomp_warning=missingReturn")
        compiler_params.append("--jscomp_warning=msgDescriptions")
        compiler_params.append("--jscomp_warning=newCheckTypes")
        compiler_params.append("--jscomp_warning=suspiciousCode")
        compiler_params.append("--jscomp_warning=strictModuleDepCheck")
        compiler_params.append("--jscomp_warning=typeInvalidation")
        compiler_params.append("--jscomp_warning=undefinedNames")
        compiler_params.append("--jscomp_warning=undefinedVars")
        compiler_params.append("--jscomp_warning=unknownDefines")
        compiler_params.append("--jscomp_warning=unusedLocalVariables")
        compiler_params.append("--jscomp_warning=uselessCode")

    externs_gen_file = tempfile.NamedTemporaryFile(mode="r+",
                                                   suffix=".js", delete=False)

    externs.append('--externs=' + externs_gen_file.name)

    append_externs_items(ADDONS, externs_gen_file)
    append_externs_items(SRC_EXT_FILES, externs_gen_file)

    externs_gen_file.seek(0)

    compiler_params.append('--compilation_level=' + optimization)

    tmp_engine_file = tempfile.NamedTemporaryFile(mode="r+", suffix=".js", delete=False, encoding="utf-8")
    if len(externs_js):
        refact_ext_js = check_modules(externs_js, tmp_engine_file,
                                      os.path.basename(dest_engine_path))
        refact_ext_js = ['--js=' + i for i in set(refact_ext_js)]
        compiler_params.extend(refact_ext_js)
    else:
        merged_src = check_modules(MERGED_SRC, tmp_engine_file)
        refact_merged_src = prepare_js(merged_src)
        compiler_params.extend(refact_merged_src)
    tmp_engine_file.close()

    compiler_params.extend(externs)

    if use_source_map:
        compiler_params.append("--create_source_map=" +
                               dest_engine_path + ".map")

    compiler_params.append('--js_output_file=' +
                           os.path.relpath(dest_engine_path))

    print("    " + "-" * (len(normpath(dest_engine_path)) +
          len("Compiling: ")))
    print(GREEN + "    Compiling" + ENDCOL + ":",
          BLUE + normpath(dest_engine_path) + ENDCOL)
    print("    " + "-" * (len(normpath(dest_engine_path)) +
          len("Compiling: ")))

    externs_gen_file.close()

    # print(" ".join(compiler_params))
    subprocess.call(compiler_params)

    if use_source_map:
        source_map_file = open(dest_engine_path + ".map", encoding="utf-8")
        source_map_text = source_map_file.read()
        source_map_file.close()
        source_map_text = re.sub(re.escape(normpath(join(BASE_DIR, ".."))), "",
                                     source_map_text)

        source_map_file = open(dest_engine_path + ".map", "w", encoding="utf-8")
        source_map_file.write(source_map_text)
        source_map_file.close()

        output_js_file = open(dest_engine_path, "a", encoding="utf-8")
        output_js_file.write("//# sourceMappingURL=/" +
                             os.path.normpath(
                                 os.path.relpath(
                                     dest_engine_path,
                                     os.path.join(BASE_DIR, ".."))) + ".map")
        output_js_file.close()

    try:
        os.remove(externs_gen_file.name)
    except:
        print("File ", externs_gen_file.name, " not found")

    try:
        os.remove(tmp_engine_file.name)
    except:
        print("File ", tmp_engine_file.name, " not found")


def update_modules_lists():
    """Get modules fromm the engine."""
    curr_dir = BASE_DIR

    sdk_root_dir = None

    while True:
        try:
            ver_file_path = os.path.join(curr_dir, "VERSION")

            with open(ver_file_path, encoding="utf-8") as f:
                lines = f.readlines()

            params = lines[0].split()

            if params[0] == "Blend4Web":
                sdk_root_dir = os.path.normpath(curr_dir)
                break
        except:
            pass

        up_dir = os.path.normpath(os.path.join(curr_dir, ".."))

        if up_dir == curr_dir:
            return None
        else:
            curr_dir = up_dir

    if not sdk_root_dir:
        return

    src_modules = gen_module_list("src", join(sdk_root_dir, "src"))

    global ADDONS, SRC_FILES, SRC_EXT_FILES, SRC_LIBS_FILES

    EXCLUSION_MODULES.append(join("src", "addons", "ns_compat.js"))
    ADDONS = list(filter(lambda x: x.startswith(join("src", "addons")) and
                  x not in EXCLUSION_MODULES, src_modules))
    SRC_LIBS_FILES = list(filter(lambda x: x.startswith(join("src", "libs")) and
                          x not in EXCLUSION_MODULES, src_modules))
    # CHECK: shader_texts is in ignore list. WHY?
    SRC_LIBS_FILES.append(join("src", "libs", "shader_texts.js"))
    SRC_EXT_FILES = list(filter(lambda x: x.startswith(join("src", "extern")) and
                         x not in EXCLUSION_MODULES, src_modules))
    SRC_FILES = list(set(src_modules) -
                     set(SRC_EXT_FILES) -
                     set(ADDONS) -
                     set(SRC_LIBS_FILES))


def append_externs_items(paths, externs_gen_file):
    """Find items in js files which must be added in extern file."""
    for path in paths:
        abs_path = normpath(join(BASE_DIR, "..", path))

        f = open(abs_path, encoding="utf-8")
        text = f.read()
        f.close()

        function_names = []

        pattern = r'exports\.(?P<function>\S[^=^\s^(]*)'
        function_names = re.findall(pattern, text)

        pattern = r'@cc_externs\s+(?P<cc_externs>[\S].+)'
        raw_attrs_names = re.findall(pattern, text)

        attrs_names = []

        for attr in raw_attrs_names:
            attrs_names.extend(re.findall(r'\S+', attr))

        function_names.extend(attrs_names)

        for func in function_names:
            externs_gen_file.write("Object.prototype." + func + ";\n")


def check_modules(ext_js, engine_tmp, app_js=False):
    """Check requirement of config.js and version.js."""
    refact_ext_js = []

    version_file = open(join(BASE_DIR, "..", "VERSION"), encoding="utf-8")
    version_text = version_file.read().split()[1]
    cache_text = version_text.replace(".", "_")
    version_file.close()
    verc_text_regex = re.compile('\s')
    version_arr = map(lambda x: str(int(x)),
                      verc_text_regex.sub('', version_text).split("."))
    version_text = "[" + ",".join(version_arr) + "]"

    for js in ext_js:
        ex_module = False

        for ex in EXCLUSION_MODULES:
            if normpath(join(BASE_DIR, "..", ex)) == js:
                ex_module = True
                break

        if not ex_module and (js.startswith(COMMON_DIR) or app_js):
            engine_file = open(js, encoding="utf-8")
            engine_text = engine_file.readlines()
            engine_file.close()

            for line in engine_text:
                pattern_0 = r'(B4W_URANIUM_PATH=)+(\/dist\/uranium\/)'
                line = re.sub(pattern_0, r'\1uranium\/', line)

                pattern_1 = r'(var\sTYPE\s=\s[\'|\"])+(DEBUG)'
                line = re.sub(pattern_1, r'\1RELEASE', line)

                pattern_2 = r'(var\sVERSION\s=\s)null'
                line = re.sub(pattern_2, r'\1' + version_text, line)

                pattern_3 = r'(var\sDATE\s=\s)null'
                line = re.sub(pattern_3, r'\1' + CURRENT_DATE, line)

                pattern_4 = '(var\sPREVENT_CACHE\s=\s[\'|\"]_b4w_ver_[\'|\"])'
                line = re.sub(pattern_4, 'var PREVENT_CACHE = "_b4w_ver_' +
                            cache_text + '_"', line)

                if app_js:
                    line = re.sub('B4W_MAIN_MODULE', app_js, line)
                engine_tmp.write(line)

            refact_ext_js.append(engine_tmp.name)

            ex_module = True

        if not ex_module:
            refact_ext_js.append(js)

    return refact_ext_js

def prepare_js(paths):
    """Prepare js files for working with closure-compiler."""
    return ['--js=' + normpath(join(BASE_DIR, "..", i)) for i in paths]


def prepare_externs(paths):
    """Prepare externs files for working with closure-compiler."""
    return ['--externs=' + join(BASE_DIR, "..", i) for i in paths]


def help(err=""):
    """Display help for compiler."""
    print(err, "Usage: compile_b4w.py [-h] [-b] [-a] [-d] [-e] [-w] DIST_FILE")


if __name__ == "__main__":
    run()
