#!/usr/bin/env python3
"""Default python exec."""

import datetime
import configparser
import getopt
import glob
import imp
import mimetypes
import os
import platform
import re
import shutil
import string
import subprocess
import sys
import tempfile
import zipfile

from os.path import (basename, join, normpath, exists, relpath, splitext,
                     isfile, isdir, dirname)
from pathlib import Path
from html.parser import HTMLParser
from collections import OrderedDict
from urllib.parse import unquote
from project_util import (unix_path, get_proj_cfg, proj_cfg_value,
                          cwd_rel_to_abs, cfg_create_list, print_flush,
                          csv_str_to_dict)

# console text colors
GREEN = '\033[92m'
BLUE = '\033[96m'
RED = "\033[91m"
YELLOW = "\033[93m"
ENDCOL = "\033[0m"

# default engine type option
DEFAULT_ENGINE_TYPE_OPT = "copy"

# default closure compiler optimization options
DEFAULT_JS_OPTIMIZATION_OPT = "simple"

DEFAULT_BLENDER_EXEC = "blender"

MOD_DEV_PROJ_NAME = "modern"
STD_DEV_PROJ_NAME = "standard"
DEFAULT_PROJ_STRUCT = MOD_DEV_PROJ_NAME

DEFAULT_PHYS_USING_OPT = True

URANIUM_FILE_NAME = "uranium.js"
URANIUM_FILE_NAME_BIN = "uranium.js.mem"
ENGINE_ADV_FILE_NAME = "b4w.min.js"
ENGINE_WHITE_FILE_NAME = "b4w.whitespace.min.js"
ENGINE_SIM_FILE_NAME = "b4w.simple.min.js"

# ignore these files during compilation/deployment
COMP_DEPL_IGNORE = ['project.py', '.b4w_project', '.b4w_icon.*', '.map']

MAT_DIR_NAME = "material_library"
MAT_LIB_DIR_IGNORE = ["*.blend1", "promo", "material_library.blend",
                      "free_material_library.blend"]
MAT_LIB_ASSETS_IGNORE = ["*.json", "*.bin"]

PROJ_CONFIG_FILE_NAME = ".b4w_project"

WEBPLAYER_REL_BUILD_PATH = join("deploy", "apps", "webplayer")

_base_dir = None
_cc_dir = None
_engine_dir = None
_src_dir = None
_std_dev_dir = None
_mod_dev_dir = None

_js_cc_params = None

_java_exec = "java"

# files deleted after compile project
_temporary_files = []

_undeleted_files = []

OPTIMIZATION_DICT = {
    "advanced": "ADVANCED_OPTIMIZATIONS",
    "simple": "SIMPLE_OPTIMIZATIONS",
    "whitespace": "WHITESPACE_ONLY"
}

OPTIMIZATION_ENGINE_NAME_DICT = {
    "advanced": ENGINE_ADV_FILE_NAME,
    "simple": ENGINE_SIM_FILE_NAME,
    "whitespace": ENGINE_WHITE_FILE_NAME
}

ENGINE_TYPE_LIST = [
    "copy",
    "compile",
    "webplayer_json",
    "webplyer_html",
    "none"
]

BUILDED_TYPE_LIST = [
    "copy",
    "compile"
]

DEPRECATED_ENGINE_TYPE_LIST = {"update": "none", "external": "copy"}

AVAIL_SNIPPETS_LIST = [
    "bone_api",
    "camera_animation",
    "camera_move_styles",
    "canvas_texture",
    "change_image",
    "custom_anchors",
    "dynamic_geometry",
    "gamepad",
    "gyro",
    "instancing",
    "lines",
    "material_api",
    "morphing",
    "multitouch",
    "pathfinding",
    "raytest",
    "webcam",
    "vr"
]


class HTMLProcessor(HTMLParser):
    """Default python exec."""

    def __init__(self, js_ignore=[], css_ignore=[]):
        """Constructor."""
        HTMLParser.__init__(self)

        self.js = []
        self.css = []
        self.inline_js = False
        self.head = []
        self.js_ignore = js_ignore
        self.css_ignore = css_ignore

    def handle_endtag(self, tag):
        """Endtag handler."""
        if tag == "script":
            if not self.inline_js:
                self.js[-1]["end_pos"] = self.getpos()
            else:
                self.inline_js = False
        elif tag == "head":
            self.head[-1]["end_pos"] = self.getpos()

    def handle_starttag(self, tag, attrs):
        """Starttag handler."""
        if tag == "script":
            script = {}

            src = False

            script["start_pos"] = self.getpos()

            for attr in attrs:
                script[attr[0]] = attr[1]

                if attr[0] == "src":
                    src = True

                    if (attr[1].startswith("https://") or
                            attr[1].startswith("http://") or
                            attr[1].startswith("//") or
                            attr[1] in self.js_ignore):
                        script["no_compile"] = True

            if src:
                self.js.append(script)
            else:
                self.inline_js = True
        elif tag == "link":
            link = {}

            for attr in attrs:
                link[attr[0]] = attr[1]

                if attr[0] == "href":
                    mime_type = mimetypes.guess_type(attr[1])[0]

                    link["start_pos"] = self.getpos()
                    link["end_pos"] = (self.getpos()[0], self.offset +
                                       len(self.get_starttag_text()))

                    if mime_type == "text/css":
                        if attr[1] in self.css_ignore:
                            link["no_compile"] = True

                        self.css.append(link)
        elif tag == "head":
            self.head.append({"start_pos": self.getpos()})


def run(argv, base_dir):
    """Run script."""
    sys.path.append(join(base_dir, "scripts"))

    fill_global_paths(base_dir)

    try:
        opts, args = getopt.getopt(argv[1:], "hp:s:",
                                   ["help", "project=",
                                    "snippet=", "no-colorama"])
    except getopt.GetoptError as err:
        # NOTE: no colorama yet
        help("Incorrect command line arguments")
        sys.exit(1)

    proj_path = None

    cwd = os.getcwd()

    if exists(join(cwd, ".b4w_project")):
        proj_path = cwd

    no_colorama = False

    snippet_name = None

    for o, a in opts:
        # print(args)
        if o == "--help" or o == "-h":
            run_help()
        elif o == "--no-colorama":
            no_colorama = True
        elif o == "--project" or o == "-p":
            # works for absolute paths too
            proj_path = cwd_rel_to_abs(a)
        elif o == "--snippet" or o == "-s":
            snippet_name = a

    if not no_colorama:
        import colorama
        colorama.init()

    if not len(args):
        help("Specify project management command")
        sys.exit(1)
    cmd = args[0]

    if cmd == "help":
        if len(args) > 1:
            run_help(args[1])
        else:
            run_help()
    if cmd == "init":
        run_init(args[1:])
    elif cmd == "list":
        run_list(args[1:])
    elif cmd == "config":
        if not proj_path:
            help("Project directory not found")
            sys.exit(1)
        run_config(args[1:], proj_path)
    elif cmd == "compile" or cmd == "build":
        if not proj_path:
            help("Project directory not found")
            sys.exit(1)
        run_build(args[1:], proj_path)
    elif cmd == "clone":
        if not proj_path:
            help("Project directory not found")
            sys.exit(1)
        run_clone(args[1:], proj_path)
    elif cmd == "clone_snippet":
        if not snippet_name:
            help("Snippet not found")
            sys.exit(1)
        run_clone_snippet(args[1:], snippet_name)
    elif cmd == "convert_resources" or cmd == "convert-resources":
        if not proj_path:
            help("Project directory not found")
            sys.exit(1)
        run_convert_resources(args[1:], proj_path)
    elif cmd == "reexport":
        if not proj_path:
            help("Project directory not found")
            sys.exit(1)
        run_reexport(args[1:], proj_path)
    elif cmd == "remove":
        if not proj_path:
            help("Project directory not found")
            sys.exit(1)
        run_remove(args[1:], proj_path)
    elif cmd == "deploy":
        if not proj_path:
            help("Project directory not found")
            sys.exit(1)
        run_deploy(args[1:], proj_path)
    elif cmd == "check_deps" or cmd == "check-deps":
        run_check_deps(args[1:])
    elif cmd == "import":
        run_import(args[1:])
    elif cmd == "export":
        run_export(args[1:])
    elif cmd == "check_modules" or cmd == "check-modules":
        if not proj_path:
            help("Project directory not found")
            sys.exit(1)
        run_check_mods(proj_path)
    elif cmd == "update_modules" or cmd == "update-modules":
        if not proj_path:
            help("Project directory not found")
            sys.exit(1)
        run_update_mods(proj_path)
    elif cmd == "update_file_struct" or cmd == "update-file-struct":
        if not proj_path:
            help("Project directory not found")
            sys.exit(1)
        run_update_file_struct(args[1:], proj_path)
    else:
        help("Wrong project management command: " + cmd)
        sys.exit(1)


def fill_global_paths(base_dir):
    global _base_dir, _curr_work_dir, _cc_dir, _src_dir, _js_cc_params
    global _engine_dir, _java_exec, _mod_dev_dir, _std_dev_dir

    # sdk base directory
    _base_dir = base_dir

    if platform.system() == "Windows":
        _java_exec = normpath(join(base_dir, "tools", "java", "win",
                                   "openjdk-1.7.0", "bin", "java.exe"))
    elif not check_dependencies(["java"], False):
        _java_exec = ""

    # path to closure compiler directory
    _cc_dir = join(base_dir, "tools", "closure-compiler")

    # engine build directory
    _engine_dir = join(base_dir, "deploy", "apps", "common")

    # closure compiler executive file
    js_cc_path = join(_cc_dir, "compiler.jar")

    # closure compiler params
    _js_cc_params = [_java_exec, "-jar", js_cc_path,
                     "--language_in=ECMASCRIPT5"]

    # engine sources directory
    _src_dir = join(base_dir, "src")

    # modern developer directory
    _mod_dev_dir = join(base_dir, "projects")

    # standard developer directory
    _std_dev_dir = join(base_dir, "apps_dev")


def run_help(cmd=""):
    """Run console help."""
    if cmd == "":
        # display generic help
        help()
        sys.exit(0)
    elif cmd == "init":
        help_init()
        sys.exit(0)
    elif cmd == "list":
        help_list()
        sys.exit(0)
    elif cmd == "compile" or cmd == "build":
        help_build()
        sys.exit(0)
    elif cmd == "deploy":
        help_deploy()
        sys.exit(0)
    elif cmd == "reexport":
        help_reexport()
        sys.exit(0)
    elif cmd == "convert_resources":
        help_convert_resources()
        sys.exit(0)
    elif cmd == "check_deps" or cmd == "check-deps":
        help_check_deps()
        sys.exit(0)
    elif cmd == "check_modules" or cmd == "check-modules":
        help_check_modules()
        sys.exit(0)
    elif cmd == "update_modules" or cmd == "update-modules":
        help_update_modules()
        sys.exit(0)
    elif cmd == "update_file_struct" or cmd == "update-file-struct":
        help_update_file_struct()
        sys.exit(0)
    elif cmd == "import":
        help_import()
        sys.exit(0)
    elif cmd == "export":
        help_export()
        sys.exit(0)
    elif cmd == "remove":
        help_remove()
        sys.exit(0)
    else:
        help("Wrong project management command: " + cmd)
        sys.exit(1)


def help(err=""):
    """Display generic help."""
    if err:
        help_print_err(err)
    else:
        print("""\
Blend4Web project management.
Usage: project.py [-p|--project PROJECT] [--no-colorama] [-h|--help]
                  [COMMAND] [OPTION]...
Options:
    -p, --project   path to project
    --no-colorama   disable colorama extension
    -h, --help      show this help and exit

Commands:
    check-deps          check Project Manager dependencies

    list                list all projects
    init                init new project
    remove              remove project

    export              export project(s)
    import              import project(s)

    build               build project
    check-modules       check project app modules
    convert-resources   convert project media resources
    deploy              deploy project
    reexport            reexport project blend files to JSON/HTML
    update-modules      update project app modules
    update-file-struct  update project file structure

Use 'project.py help COMMAND' to read more about the command and it's arguments.
""")


def help_print_err(err, subcmd=""):
    """Print formatted error message and hint for --help option."""
    print("     " + "-" * (len(err)), file=sys.stderr)
    print("   ", RED, err, ENDCOL, file=sys.stderr)
    print("     " + "-"*(len(err)), file=sys.stderr)

    if subcmd:
        subcmd_str = " " + subcmd + " "
    else:
        subcmd_str = " "

    print("     " +
          "-"*(len("   Try './project.py" + subcmd_str + "--help' for more information.")),
          file=sys.stderr)
    print(BLUE, "   ", "Try '", GREEN, "./project.py" + subcmd_str + "--help'",
          BLUE, "for more information.", ENDCOL, file=sys.stderr)
    print("     " +
          "-"*(len("   Try './project.py" + subcmd_str + "--help' for more information.")),
          file=sys.stderr)


def run_init(args):
    """Create a Blend4Web project directory structure for the given project."""
    try:
        opts, args = getopt.getopt(args, "C:ASPU:T:t:o:b:h:m",
                                   ["author=",
                                    "copy-app-templates",
                                    "copy-scene-templates",
                                    "copy-project-script",
                                    "url-params=",
                                    "title=",
                                    "engine-type=",
                                    "optimization=",
                                    "blender-exec=",
                                    "help",
                                    "materials"])
    except getopt.GetoptError as err:
        help_init("Incorrect command line arguments")
        sys.exit(1)

    author = ""
    title = ""
    url_params = ""

    do_copy_app_templates = False
    do_copy_scene_templates = False
    do_copy_project_script = False
    do_copy_materials = False

    engine_type = DEFAULT_ENGINE_TYPE_OPT
    opt_level = DEFAULT_JS_OPTIMIZATION_OPT
    blender_exec = DEFAULT_BLENDER_EXEC

    for o, a in opts:
        if o == "--author" or o == "-C":
            author = a
        elif o == "--copy-app-templates" or o == "-A":
            do_copy_app_templates = True
        elif o == "--copy-scene-templates" or o == "-S":
            do_copy_scene_templates = True
        elif o == "--copy-project-script" or o == "-P":
            do_copy_project_script = True
        elif o == "--url-params" or o == "-U":
            url_params = a
        elif o == "--title" or o == "-T":
            title = a
        elif o == "--engine-type" or o == "-t":
            engine_type = a
        elif o == "--optimization" or o == "-o":
            opt_level = a
        elif o == "--blender-exec" or o == "-b":
            blender_exec = a
        elif o == "--materials" or o == "-m":
            do_copy_materials = True
        elif o == "--help" or o == "-h":
            help_init()
            sys.exit(0)

    if len(args) != 1:
        help_init("Please specify project name")
        sys.exit(1)

    name = args[0].strip()

    if not name:
        help_init("Please specify project name")
        sys.exit(1)

    if engine_type == "webplayer_json":
        print("Creating a new webplayer json project")
    elif engine_type == "webplayer_html":
        print("Creating a new webplayer html project")
    print("")
    print("Name:            ", name)
    if title:
        print("Title:           ", title)
    if author:
        print("Author (Company):", author)
    print("")

    if author == "Blend4Web":
        dev_dir = join(_base_dir, "apps_dev", name)
        blender_dir = join(_base_dir, "blender", name)
        build_dir = join(_base_dir, "deploy", "apps", name)
        assets_dir = join(_base_dir, "deploy", "assets", name)
    else:
        dev_dir = join(_base_dir, "projects", name)
        blender_dir = join(dev_dir, "blender")
        build_dir = join(dev_dir, "build")
        assets_dir = join(dev_dir, "assets")

    dev_dir_rel = unix_path(relpath(dev_dir, _base_dir))
    blender_dir_rel = unix_path(relpath(blender_dir, _base_dir))
    build_dir_rel = unix_path(relpath(build_dir, _base_dir))
    assets_dir_rel = unix_path(relpath(assets_dir, _base_dir))

    if exists(dev_dir):
        print(RED, "Project with the '" + name + "' name already exists.", ENDCOL)
        sys.exit(1)
    else:
        print("Creating directory for source files:", dev_dir_rel)
        os.makedirs(dev_dir, exist_ok=True)

    if engine_type in BUILDED_TYPE_LIST:
        print("Creating directory for compiled files:", build_dir_rel)
        os.mkdir(build_dir)
    else:
        build_dir_rel = ""

    print("Creating directory for blend files:", blender_dir_rel)
    os.mkdir(blender_dir)

    print("Creating directory for exported scenes:", assets_dir_rel)
    os.mkdir(assets_dir)

    b4w_proj_file = join(dev_dir, ".b4w_project")

    print("Creating project settings file:",
          unix_path(relpath(b4w_proj_file, _base_dir)))

    b4w_proj_cfg = configparser.ConfigParser()

    def_phys = ""
    assets_path_dest = ""
    assets_path_prefix = ""

    if engine_type in BUILDED_TYPE_LIST:
        def_phys = DEFAULT_PHYS_USING_OPT

    if engine_type == "none":
        def_phys = False

    if engine_type != "none":
        assets_path_dest = "assets"
        assets_path_prefix = "assets"

    b4w_proj_cfg["info"] = OrderedDict([
        ("author", author),
        ("icon", ""),
        ("name", name),
        ("title", title)
    ])

    b4w_proj_cfg["paths"] = OrderedDict([
        ("assets_dirs", cfg_create_list([assets_dir_rel])),
        ("blend_dirs", cfg_create_list([blender_dir_rel])),
        ("blender_exec", blender_exec),
        ("build_dir", build_dir_rel),
        ("deploy_dir", "")
    ])

    b4w_proj_cfg["compile"] = OrderedDict([
        ("apps", ""),
        ("css_ignore", ""),
        ("engine_type", engine_type),
        ("ignore", ""),
        ("js_ignore", ""),
        ("optimization", opt_level),
        ("use_physics", def_phys)
    ])

    b4w_proj_cfg["deploy"] = OrderedDict([
        ("assets_path_dest", assets_path_dest),
        ("assets_path_prefix", assets_path_prefix),
        ("ignore", ""),
        ("override", "")
    ])

    if url_params:
        b4w_proj_cfg["url_params"] = csv_str_to_dict(url_params)

    with open(b4w_proj_file, "w", encoding="utf-8", newline="\n") as configfile:
        b4w_proj_cfg.write(configfile)

    if do_copy_project_script:
        print("Copying project script")
        copy_project_script(_base_dir, dev_dir)

    ignore_app_template_copying = False

    if engine_type == "webplayer_html":
        ignore_app_template_copying = True
        print("App templates not available for 'webplayer html' project")

    if engine_type == "webplayer_json":
        ignore_app_template_copying = True
        print("App templates not available for 'webplayer json' project")

    if engine_type == "none":
        ignore_app_template_copying = True
        print("App templates not available for 'none' project")

    if do_copy_app_templates and not ignore_app_template_copying:
        print("Copying app templates")
        copy_app_templates(name, dev_dir, _base_dir, _src_dir, title, author)

    if do_copy_scene_templates:
        print("Copying scene templates")
        copy_scene_templates(name, _base_dir, blender_dir, assets_dir,
                blender_exec, engine_type, dev_dir)

    if do_copy_materials:
        print("Copying material library")
        mat_dir = join(_base_dir, "blender", MAT_DIR_NAME)
        mat_lib_dir = join(blender_dir, MAT_DIR_NAME)

        shutil.copytree(mat_dir, mat_lib_dir,
                ignore=shutil.ignore_patterns(*MAT_LIB_DIR_IGNORE))

        mat_assets = join(_base_dir, "deploy", "assets", MAT_DIR_NAME)

        shutil.copytree(mat_assets, join(assets_dir, MAT_DIR_NAME),
                ignore=shutil.ignore_patterns(*MAT_LIB_ASSETS_IGNORE))

        print("Changing texture paths in the material library (may take a while)")
        print_flush()
        script_path = join(_base_dir, "scripts", "blender",
                "cli_change_asset_paths.py")

        correct_texture_paths(script_path, blender_exec,
                join(blender_dir, MAT_DIR_NAME),
                mat_assets, join(assets_dir, MAT_DIR_NAME),
                mat_dir, mat_lib_dir)

    print(GREEN + "Project created" + ENDCOL)


def correct_texture_paths(script_path, blender_exec, mat_dir,
                          source_asset, target_asset,
                          source_blend, target_blend):
    for list_elem in os.listdir(mat_dir):
        abs_path = join(mat_dir, list_elem)
        if os.path.isdir(abs_path):
            correct_texture_paths(script_path, blender_exec, abs_path,
                                  source_asset, target_asset, source_blend,
                                  target_blend)
        elif splitext(abs_path)[-1] == ".blend":
            print("  " + abs_path)
            print_flush()

            try:
                subprocess.check_output([blender_exec, "-b", abs_path, "-P",
                                        script_path, "--", source_asset,
                                        target_asset, source_blend,
                                        target_blend],
                                        stderr=subprocess.STDOUT)
            except FileNotFoundError:
                print(RED, "Blender not found", ENDCOL)
                sys.exit(1)


def sdk_rel_to_abs(rel_path, base_dir=None):
    """Get absoulte path from the relative to base dir (SDK root)"""
    if not base_dir:
        base_dir = _base_dir
    return normpath(join(base_dir, rel_path))


def sdk_rel_to_abs_paths(rel_paths, base_dir=None):
    """Get absoulte paths from the relative to base dir (SDK root) ones"""
    if not base_dir:
        base_dir = _base_dir
    return [normpath(join(base_dir, p)) for p in rel_paths]


def help_init(err=""):
    """
    Display help for init.
    """
    if err:
        help_print_err(err, "init")
    else:
        print("""\
Usage: project.py init [OPTION]... NEW_PROJECT_NAME
Create a new project.
        
Options:
    -C, --author=NAME            author/company name
    -A, --copy-app-templates     copy application templates into the project
                                 directories
    -S, --copy-scene-templates   copy scene templates into project directories
    -m, --materials              copy material library into project directories
    -U, --url-params             specify url GET params
    -T, --title=NAME             project title (human readable name)
    -t, --engine-type=TYPE       specify b4w engine type: 'copy',
                                 'compile', 'none'
    -e, --assets-path            specify assets url
    -o, --optimization=TYPE      set JavaScript optimization type: 
                                 'whitespace', 'simple' or 'advanced'
    -h, --help                   show this help and exit""")


def copy_app_templates(proj_name, dev_dir, base_dir, src_dir, title, author):

    print("Copying application template files into destination directories:")

    # Checks

    out_html_file = join(dev_dir, proj_name + ".html")

    if exists(out_html_file):
        print("  file " + unix_path(relpath(out_html_file, base_dir)) +
              " already exists")
        return
    else:
        print("  " + unix_path(relpath(out_html_file, base_dir)))

    out_js_file = join(dev_dir, proj_name + ".js")

    if exists(out_js_file):
        print("  file " + unix_path(relpath(out_js_file, base_dir)) +
              " already exists")
        return
    else:
        print("  " + unix_path(relpath(out_js_file, base_dir)))

    out_css_file = join(dev_dir, proj_name + ".css")
    if exists(out_css_file):
        print("  file " + unix_path(relpath(out_css_file, base_dir)) +
              " already exists")
        return
    else:
        print("  " + unix_path(relpath(out_css_file, base_dir)))

    tpl_dir = join(base_dir, "scripts", "templates")

    # JS

    tpl_js_file = join(tpl_dir, "app.js")
    tpl_js_file_obj = open(tpl_js_file, "r", encoding="utf-8")
    tpl_js_str = tpl_js_file_obj.read()
    tpl_js_file_obj.close()

    if author == "Blend4Web":
        assets_path = "m_cfg.get_std_assets_path() + \"" + proj_name + "/\""
    else:
        assets_path = "m_cfg.get_assets_path(\"" + proj_name + "\")"

    html_insertions = dict(app_name=proj_name, assets_path=assets_path)

    out_js_str = string.Template(tpl_js_str).substitute(html_insertions)

    out_js_file_obj = open(out_js_file, 'w', encoding="utf-8", newline="\n")
    out_js_file_obj.writelines(out_js_str)
    out_js_file_obj.close()

    # CSS

    shutil.copyfile(join(tpl_dir, "app.css"), out_css_file)

    # HTML

    tpl_html_file = open(join(tpl_dir, "app.html"), "r", encoding="utf-8")
    tpl_html_str = tpl_html_file.read()
    tpl_html_file.close()

    import mod_list
    scripts = mod_list.gen_code(mod_list.gen_module_list("../../src/",
                                src_dir))

    if title == "":
        html_title = proj_name
    else:
        html_title = title

    html_insertions = dict(name=proj_name, arg_name=proj_name,
                           title=html_title, scripts=scripts)

    out_html_str = string.Template(tpl_html_str).substitute(html_insertions)

    out_html_file_obj = open(out_html_file, 'w', encoding="utf-8",
                             newline="\n")
    out_html_file_obj.writelines(out_html_str)
    out_html_file_obj.close()


def copy_scene_templates(proj_name, base_dir, blender_dir, assets_dir,
                         blender_exec, engine_type, dev_dir):

    print("Copying scene template files into destination directories:")

    blend_tpl = join(base_dir, "scripts", "templates", "scene.blend")
    logo_tpl = join(base_dir, "scripts", "templates", "logo.png")
    blend = join(blender_dir, proj_name + ".blend")
    logo = join(assets_dir, "logo.png")

    if exists(blend):
        print("  file " + unix_path(relpath(blend, base_dir)) +
              " already exists")
        return
    else:
        print("  " + unix_path(relpath(blend, base_dir)))

    shutil.copyfile(blend_tpl, blend)
    shutil.copyfile(logo_tpl, logo)

    if not shutil.which(blender_exec):
        print(YELLOW + "  Blender executable is not found, please add the path " 
                + "to Blender into the PATH environment variable")
        print(YELLOW + "  or export the scene manually.")
        return

    print("  exporting " + unix_path(relpath(blend, base_dir)))

    export_script = "cli_export_save.py"

    if engine_type == "webplayer_html":
        export_script = "cli_export_html_save.py"

    blender_cli_dir = join(base_dir, "scripts", "blender")
    reexporter = join(blender_cli_dir, export_script)

    saved_path = join(assets_dir, proj_name)

    if exists(saved_path):
        print("  file " + unix_path(relpath(saved_path, base_dir)) +
              " already exists")
        return
    else:
        print("  " + unix_path(relpath(saved_path, base_dir)))

    script_path = join(_base_dir, "scripts", "blender", "cli_change_asset_paths.py")

    correct_texture_paths(script_path, blender_exec, blender_dir,
                          blend_tpl, assets_dir,
                          blend_tpl, blender_dir)

    print_flush()

    subprocess.check_output([blender_exec, "-b", blend, "-P",
                            reexporter, "--", saved_path],
                            stderr=subprocess.STDOUT)


def copy_project_script(base_dir, dev_dir):
    print("Copying project.py script into project directory:")

    proj_in = join(base_dir, "apps_dev", "project.py")
    proj_out = join(dev_dir, "project.py")

    if exists(proj_out):
        print("  file " + unix_path(relpath(proj_out, base_dir)) +
              " already exists")
        return
    else:
        print("  " + unix_path(relpath(proj_out, base_dir)))

    shutil.copy(proj_in, proj_out)


def run_list(args):
    try:
        opts, args = getopt.getopt(args, "h", ["help"])
    except getopt.GetoptError as err:
        help_list("Incorrect command line arguments")
        sys.exit(1)

    for o, a in opts:
        if o == "--help" or o == "-h":
            help_list()
            sys.exit(0)

    proj_list = find_proj_list(_base_dir)

    for proj_dir in proj_list:
        proj_cfg = get_proj_cfg(proj_dir)
        print(proj_cfg.get("info", "name"), "->",
              unix_path(relpath(proj_dir, _base_dir)))


def find_proj_list(base_dir):
    proj_list = []

    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file == ".b4w_project":
                proj_list.append(root)

    return proj_list


def help_list(err=""):
    if err:
        help_print_err(err, "list")
    else:
        print("""\
Usage: project.py list [OPTION]
Display a list with all available applications.

Option:
    -h, --help     show this help and exit""")


def check_build_proj_path(build_proj_path):
    build_proj_path_obj = Path(build_proj_path)
    base_dir_obj = Path(_base_dir)

    base_dir_parts = base_dir_obj.parts
    base_dir_parts_len = len(base_dir_parts)
    build_proj_path_parts = build_proj_path_obj.parts
    build_proj_path_parts_len = len(build_proj_path_parts)

    if (base_dir_parts_len and
            build_proj_path_parts_len and
            build_proj_path_parts_len >= base_dir_parts_len and
            build_proj_path.startswith(_base_dir) and
            build_proj_path_parts[base_dir_parts_len - 1] == base_dir_parts[-1]):
        return

    help_build("Build project path outside from the sdk directory")
    sys.exit(1)


def run_clone_snippet(args, snippet_name):
    if snippet_name not in AVAIL_SNIPPETS_LIST:
        help_build("Snippet with current name does not exist")
        sys.exit(1)

    snippets_abs_path = join(_base_dir, "apps_dev", "code_snippets")
    proj_cfg = get_proj_cfg(snippets_abs_path)
    blend_dirs = proj_cfg_value(proj_cfg, "paths", "blend_dirs", [])
    assets_dirs = proj_cfg_value(proj_cfg, "paths", "assets_dirs", [])
    blender_exec = proj_cfg_value(proj_cfg, "paths", "blender_exec", "blender")

    if not len(blend_dirs):
        help_build("You must specify blender dirs in config file")
        sys.exit(1)

    if not len(assets_dirs):
        help_build("You must specify assets dirs in config file")
        sys.exit(1)

    cur_snippet_blend = normpath(join(_base_dir, blend_dirs[0], snippet_name))
    cur_snippet_assets = normpath(join(_base_dir, assets_dirs[0],
                                  snippet_name))
    cur_snippet_js = normpath(join(_base_dir, "apps_dev", "code_snippets",
                              "scripts", snippet_name + ".js"))
    cur_snippet_css = normpath(join(_base_dir, "apps_dev", "code_snippets",
                               "css", snippet_name + ".css"))

    try:
        opts, args = getopt.getopt(args,
                                   "hn:b:",
                                   ["help",
                                    "new-proj-name=",
                                    "blender-exec="])
    except getopt.GetoptError as err:
        help_build("Incorrect command line arguments")
        sys.exit(1)

    new_proj_name = None

    for o, a in opts:
        if o == "--new-proj-name" or o == "-n":
            new_proj_name = a
        elif o == "--blender-exec" or o == "-b":
            blender_exec = a
        elif o == "--help" or o == "-h":
            help_clone_snippet()
            sys.exit(0)

    if not new_proj_name:
        help_clone_snippet("You must specify new project name")
        sys.exit(1)

    if not isfile(blender_exec) and not shutil.which(blender_exec):
        help_clone_snippet("Blender not found")
        sys.exit(1)

    new_proj_path = join(_base_dir, "projects", new_proj_name)

    if exists(new_proj_path):
        help_build("Project path already exists")
        sys.exit(1)

    os.makedirs(new_proj_path)

    if exists(cur_snippet_assets):
        shutil.copytree(cur_snippet_assets, join(new_proj_path, "assets"))

    if exists(cur_snippet_blend):
        shutil.copytree(cur_snippet_blend, join(new_proj_path, "blender"))

    if exists(cur_snippet_js):
        shutil.copy(cur_snippet_js, join(new_proj_path, new_proj_name + ".js"))

    css_lines = [
        "body {",
        "  background-color: #fff;",
        "  margin: 0;",
        "  overflow: hidden;",
        "}",

        "#main_canvas_container {",
        "  position: absolute;",
        "  left: 0px;",
        "  top: 0px;",
        "  width: 100%;",
        "  height: 100%;",
        "}"
    ]

    if exists(cur_snippet_css):
        css_file = open(cur_snippet_css, "r", encoding="utf-8", newline="\n")
        css_tmp_lines = css_file.readlines()
        css_file.close()

        css_lines.extend(css_tmp_lines)

    new_css_file_name = join(new_proj_path, new_proj_name + ".css")

    new_css_file = open(new_css_file_name, "w", encoding="utf-8", newline="\n")
    new_css_file.writelines(css_lines)
    new_css_file.close()

    b4w_proj_cfg = configparser.ConfigParser()
    b4w_proj_file = join(new_proj_path, ".b4w_project")

    b4w_proj_cfg["info"] = OrderedDict([
        ("author", ""),
        ("icon", ""),
        ("name", new_proj_name),
        ("title", "")
    ])

    b4w_proj_cfg["paths"] = OrderedDict([
        ("assets_dirs", unix_path(join("projects", new_proj_name, "assets")) + ";"),
        ("blend_dirs", unix_path(join("projects", new_proj_name, "blender")) + ";"),
        ("blender_exec", proj_cfg_value(proj_cfg, "paths", "blender_exec", "blender")),
        ("build_dir", unix_path(normpath(relpath(join(new_proj_path, "build"), _base_dir)))),
        ("deploy_dir", "")
    ])

    b4w_proj_cfg["compile"] = OrderedDict([
        ("apps", ""),
        ("css_ignore", ""),
        ("engine_type", "copy"),
        ("ignore", ""),
        ("js_ignore", ""),
        ("optimization", "simple"),
        ("use_physics", True)
    ])

    b4w_proj_cfg["deploy"] = OrderedDict([
        ("assets_path_dest", "assets"),
        ("assets_path_prefix", "assets"),
        ("ignore", ""),
        ("override", "")
    ])

    with open(b4w_proj_file, "w", encoding="utf-8", newline="\n") as configfile:
        b4w_proj_cfg.write(configfile)

    out_html_file = join(new_proj_path, new_proj_name + ".html")

    tpl_dir = join(_base_dir, "scripts", "templates")
    tpl_html_file = open(join(tpl_dir, "app.html"), "r", encoding="utf-8")
    tpl_html_str = tpl_html_file.read()
    tpl_html_file.close()

    import mod_list
    scripts = mod_list.gen_code(mod_list.gen_module_list("../../src/", join(_base_dir, "src")))

    assets_path = "m_cfg.get_assets_path(\"" + new_proj_name + "\")"
    html_insertions = dict(name=new_proj_name, assets_path=assets_path, scripts=scripts, title="")

    out_html_str = string.Template(tpl_html_str).substitute(html_insertions)

    out_html_file_obj = open(out_html_file, 'w', encoding="utf-8", newline="\n")
    out_html_file_obj.writelines(out_html_str)
    out_html_file_obj.close()

    js_file = open(join(new_proj_path, new_proj_name + ".js"), 'r', encoding="utf-8", newline="\n")
    js_lines = js_file.readlines()
    js_file.close()

    tmp_js_lines = []

    for line in js_lines:
        line = re.sub("b4w\.register\(\"" + snippet_name, "b4w.register(\"" + new_proj_name, line)
        line = re.sub("APP_ASSETS_PATH *=(.*?);", "APP_ASSETS_PATH = m_cfg.get_assets_path(\"" + new_proj_name + "\");", line)
        tmp_js_lines.append(line)

    tmp_js_lines.append("b4w.require(\""+ new_proj_name + "\").init();")

    js_file = open(join(new_proj_path, new_proj_name + ".js"), 'w', encoding="utf-8", newline="\n")
    js_file.writelines(tmp_js_lines)
    js_file.close()

    script_path = join(_base_dir, "scripts", "blender", "cli_change_asset_paths.py")

    if cur_snippet_blend and cur_snippet_assets:
        print("Changing assets paths (may take a while):")
        correct_texture_paths(script_path, blender_exec, join(new_proj_path, "blender"),
                              cur_snippet_assets, join(new_proj_path, "assets"),
                              cur_snippet_blend, join(new_proj_path, "blender"))

    print(GREEN + "Snippet cloning completed." + ENDCOL)
    sys.exit(0)

def run_clone(args, dev_proj_path):
    proj_struct = get_proj_struct(dev_proj_path)

    if proj_struct != MOD_DEV_PROJ_NAME:
        help_build("Old project structure")
        sys.exit(1)

    try:
        new_proj_name = args[0].strip()
    except:
        help_build("You must specify new project name")
        sys.exit(1)

    new_proj_path = join(_base_dir, "projects", new_proj_name)

    if not new_proj_path.startswith(_base_dir):
        help_build("Build project path outside from the sdk directory")
        sys.exit(1)

    if exists(new_proj_path):
        help_build("Project path already exists")
        sys.exit(1)

    shutil.copytree(dev_proj_path, new_proj_path)

    proj_cfg = get_proj_cfg(new_proj_path)

    js_file_path = normpath(join(new_proj_path, proj_cfg["info"]["name"] + ".js"))

    if exists(js_file_path):
        js_file = open(js_file_path, 'r', encoding="utf-8", newline="\n")
        js_lines = js_file.readlines()
        js_file.close()

        tmp_js_lines = []

        for line in js_lines:
            line = re.sub("APP_ASSETS_PATH *=(.*?);", "APP_ASSETS_PATH = m_cfg.get_assets_path(\"" + new_proj_name + "\");", line)
            tmp_js_lines.append(line)

        js_file = open(js_file_path, 'w', encoding="utf-8", newline="\n")
        js_file.writelines(tmp_js_lines)
        js_file.close()

    proj_cfg["info"]["name"] = new_proj_name
    proj_cfg["paths"]["assets_dirs"] = unix_path(join("projects", new_proj_name, "assets"))
    proj_cfg["paths"]["blend_dirs"] = unix_path(join("projects", new_proj_name, "blender"))
    proj_cfg["paths"]["build_dir"] = unix_path(join("projects", new_proj_name, "build"))

    b4w_proj_file = list(Path(new_proj_path).glob(".b4w_project"))[0].as_posix()

    with open(b4w_proj_file, "w", encoding="utf-8", newline="\n") as configfile:
        proj_cfg.write(configfile)

    print(GREEN + "Project cloning completed." + ENDCOL)
    sys.exit(0)

def run_build(args, dev_proj_path):
    # standard or modern project structure
    proj_struct = get_proj_struct(dev_proj_path)
    proj_cfg = get_proj_cfg(dev_proj_path)
    conf_proj_name = proj_cfg_value(proj_cfg, "info", "name", "")

    if not conf_proj_name:
        help_build("Required project name. Please, specify project name in the '.b4w_project' file.")
        sys.exit(1)

    proj_name = conf_proj_name

    default_build_proj_path = get_build_proj_path(proj_name, proj_struct)
    conf_build_proj_path = proj_cfg_value(proj_cfg, "paths", "build_dir", default_build_proj_path)

    build_proj_path = sdk_rel_to_abs(conf_build_proj_path)

    conf_engine_type = proj_cfg_value(proj_cfg, "compile", "engine_type", "none")
    engine_type = conf_engine_type

    conf_opt_level = proj_cfg_value(proj_cfg, "compile", "optimization", DEFAULT_JS_OPTIMIZATION_OPT)
    opt_level = conf_opt_level

    use_physics = proj_cfg_value(proj_cfg, "compile", "use_physics", DEFAULT_PHYS_USING_OPT)

    apps = proj_cfg_value(proj_cfg, "compile", "apps", [])

    js_ignore = proj_cfg_value(proj_cfg, "compile", "js_ignore", [])
    css_ignore = proj_cfg_value(proj_cfg, "compile", "css_ignore", [])
    ignore = proj_cfg_value(proj_cfg, "compile", "ignore", [])

    version = ""

    try:
        opts, args = getopt.getopt(args,
                            "ht:o:a:v:j:c:i:fbw",
                           ["help",
                            "engine-type=",
                            "engine_type=",
                            "optimization=",
                            "app=",
                            "version=",
                            "js-ignore=",
                            "js_ignore=",
                            "css-ignore=",
                            "css_ignore=",
                            "ignore=",
                            "use-physics",
                            "use_physics",
                            "use-source-map",
                            "show-warn"])
    except getopt.GetoptError as err:
        help_build("Incorrect command line arguments")
        sys.exit(1)

    apps_tmp = []
    js_ignore_tmp = []
    css_ignore_tmp = []
    ignore_tmp = []
    use_source_map = False
    show_warn = False

    # NOTE: underscores are only for compatibility, remove ASAP
    for o, a in opts:
        if o == "--engine-type" or o == "--engine_type" or o == "-t":
            engine_type = a
        elif o == "--optimization" or o == "-o":
            opt_level = a
        elif o == "--app" or o == "-a":
            apps_tmp.append(cwd_rel_to_abs(a))
        elif o == "--version" or o == "-v":
            version = a
        elif o == "--js-ignore" or o == "--js_ignore" or o == "-j":
            js_ignore_tmp.append(a)
        elif o == "--css-ignore" or o == "--css_ignore" or o == "-c":
            css_ignore_tmp.append(a)
        elif o == "--ignore" or o == "-i":
            ignore_tmp.append(a)
        elif o == "--use-physics" or o == "--use_physics" or o == "-f":
            use_physics = a
        elif o == "--use-source-map" or o == "-b":
            use_source_map = True
        elif o == "--show-warn" or o == "-w":
            show_warn = True
        elif o == "--help" or o == "-h":
            help_build()
            sys.exit(0)

    engine_type = check_engine_type(engine_type)

    if engine_type == "external":
        engine_type = "copy"

    if (engine_type and engine_type in ENGINE_TYPE_LIST
            and not engine_type in BUILDED_TYPE_LIST):
        help_build("Build option not available for the current type project")
        sys.exit(1)

    check_build_proj_path(build_proj_path)

    if len(ignore_tmp):
        ignore = ignore_tmp

    ignore.extend(COMP_DEPL_IGNORE)

    print(GREEN + "Building project" + ENDCOL + ": " + BLUE + proj_name + ENDCOL)

    if engine_type == "none":
        if exists(build_proj_path):
            shutil.rmtree(build_proj_path)

        shutil.copytree(dev_proj_path, build_proj_path,
                ignore=shutil.ignore_patterns(*ignore))

        print("-"*(len("Project building completed.")))
        print(GREEN + "Project building completed." + ENDCOL)
        print("-"*(len("Project building completed.")))

        return

    if engine_type in BUILDED_TYPE_LIST and not _java_exec:
        help_build("Project's engine type requires Java")
        sys.exit(1)

    if len(apps_tmp):
        apps = apps_tmp

    if not len(apps):
        apps = list(Path(dev_proj_path).rglob("*.html"))
    else:
        apps = [Path(join(dev_proj_path, app)) for app in apps]
        html_apps = list(set(Path(dev_proj_path).rglob("*.html")) -
                         set(apps) -
                         set(Path(join(dev_proj_path, "build")).rglob("*.html")) -
                         set([Path(join(dev_proj_path, i)) for i in ignore]))

        for html_app in html_apps:
            parser = parse_html_file(html_app.as_posix())
            cur_js_dict = list(filter(lambda x: not dirname(normpath(join(str(html_app.parent), x["src"]))).startswith(_src_dir), parser.js))

            for js in cur_js_dict:
                _undeleted_files.append(normpath(join(build_proj_path, relpath(html_app.parent.as_posix(), dev_proj_path), js["src"])))

            for css in parser.css:
                _undeleted_files.append(normpath(join(build_proj_path, relpath(html_app.parent.as_posix(), dev_proj_path), css["href"])))

    if proj_struct == MOD_DEV_PROJ_NAME:
        apps = list(set(apps) - set(Path(join(dev_proj_path, "build")).rglob("*.html")) -
                                set(Path(join(dev_proj_path, "assets")).rglob("*.html")) -
                                set(Path(join(dev_proj_path, "modern")).rglob("*.html")))

    check_proj_struct(dev_proj_path, apps)

    if len(js_ignore_tmp):
        js_ignore = js_ignore_tmp

    if len(css_ignore_tmp):
        css_ignore = css_ignore_tmp

    app_ignore = ignore[:]

    if proj_struct == MOD_DEV_PROJ_NAME:
        app_ignore.append("blender")
        app_ignore.append("assets")
        app_ignore.append("build")

    for i in app_ignore:
        apps = list(filter(lambda app: not normpath(app.as_posix()).startswith(normpath(join(dev_proj_path, i))), apps))

    global _js_cc_params
    _js_cc_params.append("--compilation_level=" + OPTIMIZATION_DICT[opt_level])

    _js_cc_params.append("--jscomp_off=checkTypes")
    _js_cc_params.append("--jscomp_off=nonStandardJsDocs")
    _js_cc_params.append("--jscomp_off=reportUnknownTypes")

    if not show_warn:
        _js_cc_params.append("--warning_level=QUIET")
        _js_cc_params.append("--jscomp_off=checkVars")
        _js_cc_params.append("--jscomp_off=accessControls")
        _js_cc_params.append("--jscomp_off=ambiguousFunctionDecl")
        _js_cc_params.append("--jscomp_off=checkEventfulObjectDisposal")
        _js_cc_params.append("--jscomp_off=checkRegExp")
        _js_cc_params.append("--jscomp_off=const")
        # NOTE: forcing jscomp_warning for the "constantProperty" as a workaround 
        # for the gcc bug with the Element.querySelector method
        _js_cc_params.append("--jscomp_warning=constantProperty")
        _js_cc_params.append("--jscomp_off=deprecated")
        _js_cc_params.append("--jscomp_off=deprecatedAnnotations")
        _js_cc_params.append("--jscomp_off=duplicateMessage")
        _js_cc_params.append("--jscomp_off=es3")
        _js_cc_params.append("--jscomp_off=es5Strict")
        _js_cc_params.append("--jscomp_off=externsValidation")
        _js_cc_params.append("--jscomp_off=fileoverviewTags")
        _js_cc_params.append("--jscomp_off=functionParams")
        _js_cc_params.append("--jscomp_off=globalThis")
        _js_cc_params.append("--jscomp_off=internetExplorerChecks")
        _js_cc_params.append("--jscomp_off=misplacedTypeAnnotation")
        _js_cc_params.append("--jscomp_off=missingPolyfill")
        _js_cc_params.append("--jscomp_off=missingProperties")
        _js_cc_params.append("--jscomp_off=missingReturn")
        _js_cc_params.append("--jscomp_off=msgDescriptions")
        _js_cc_params.append("--jscomp_off=newCheckTypes")
        _js_cc_params.append("--jscomp_off=suspiciousCode")
        _js_cc_params.append("--jscomp_off=strictModuleDepCheck")
        _js_cc_params.append("--jscomp_off=typeInvalidation")
        _js_cc_params.append("--jscomp_off=undefinedNames")
        _js_cc_params.append("--jscomp_off=undefinedVars")
        _js_cc_params.append("--jscomp_off=unknownDefines")
        _js_cc_params.append("--jscomp_off=unusedLocalVariables")
        _js_cc_params.append("--jscomp_off=uselessCode")
    else:
        _js_cc_params.append("--jscomp_warning=checkVars")
        _js_cc_params.append("--jscomp_warning=accessControls")
        _js_cc_params.append("--jscomp_warning=ambiguousFunctionDecl")
        _js_cc_params.append("--jscomp_warning=checkEventfulObjectDisposal")
        _js_cc_params.append("--jscomp_warning=checkRegExp")
        _js_cc_params.append("--jscomp_warning=const")
        _js_cc_params.append("--jscomp_warning=constantProperty")
        _js_cc_params.append("--jscomp_warning=deprecated")
        _js_cc_params.append("--jscomp_warning=deprecatedAnnotations")
        _js_cc_params.append("--jscomp_warning=duplicateMessage")
        _js_cc_params.append("--jscomp_warning=es3")
        _js_cc_params.append("--jscomp_warning=es5Strict")
        _js_cc_params.append("--jscomp_warning=externsValidation")
        _js_cc_params.append("--jscomp_warning=fileoverviewTags")
        _js_cc_params.append("--jscomp_warning=functionParams")
        _js_cc_params.append("--jscomp_warning=globalThis")
        _js_cc_params.append("--jscomp_warning=internetExplorerChecks")
        _js_cc_params.append("--jscomp_warning=misplacedTypeAnnotation")
        _js_cc_params.append("--jscomp_warning=missingPolyfill")
        _js_cc_params.append("--jscomp_warning=missingProperties")
        _js_cc_params.append("--jscomp_warning=missingReturn")
        _js_cc_params.append("--jscomp_warning=msgDescriptions")
        _js_cc_params.append("--jscomp_warning=newCheckTypes")
        _js_cc_params.append("--jscomp_warning=suspiciousCode")
        _js_cc_params.append("--jscomp_warning=strictModuleDepCheck")
        _js_cc_params.append("--jscomp_warning=typeInvalidation")
        _js_cc_params.append("--jscomp_warning=undefinedNames")
        _js_cc_params.append("--jscomp_warning=undefinedVars")
        _js_cc_params.append("--jscomp_warning=unknownDefines")
        _js_cc_params.append("--jscomp_warning=unusedLocalVariables")
        _js_cc_params.append("--jscomp_warning=uselessCode")

    conf_assets_dirs = proj_cfg_value(proj_cfg, "paths", "assets_dirs", [])

    params = {
        "build_proj_path":   build_proj_path,
        "css_ignore":        css_ignore,
        "conf_assets_dirs":  conf_assets_dirs,
        "proj_struct":       proj_struct,
        "dev_proj_path":     dev_proj_path,
        "engine_type":       engine_type,
        "ignore":            ignore,
        "js_ignore":         js_ignore,
        "opt_level":         opt_level,
        "proj_name":         proj_name,
        "remove_exist_dir":  True,
        "use_source_map":    use_source_map,
        "use_physics":       use_physics,
        "version":           version
    }

    for n, app in enumerate(apps):
        if n > 0:
            params["remove_exist_dir"] = False

        build_app(app, **params)

    for f in _temporary_files:
        if exists(f) and f not in _undeleted_files:
            os.remove(f)

    print(GREEN + "Project building completed." + ENDCOL)

def check_engine_type(engine_type):
    if engine_type in ENGINE_TYPE_LIST:
        return engine_type

    if engine_type in DEPRECATED_ENGINE_TYPE_LIST:
        print("-"*(len("'" + engine_type + "' engine type is deprecated and replaced by '" + DEPRECATED_ENGINE_TYPE_LIST[engine_type] + "' type")))
        print(YELLOW + "'" + engine_type + "' engine type is deprecated and replaced by '" + DEPRECATED_ENGINE_TYPE_LIST[engine_type] + "' type" + ENDCOL)
        print("-"*(len("'" + engine_type + "' engine type is deprecated and replaced by '" + DEPRECATED_ENGINE_TYPE_LIST[engine_type] + "' type")))
        return DEPRECATED_ENGINE_TYPE_LIST[engine_type]

    if not engine_type:
        print("-"*(len("Empty engine type is replaced by 'none' type")))
        print(YELLOW + "Empty engine type is replaced by 'none' type" + ENDCOL)
        print("-"*(len("Empty engine type is replaced by 'none' type")))
        return "none"

    help_build("Incorrect engine type - " + engine_type)
    sys.exit(1)


def get_build_proj_path(proj_name, proj_struct):
    if proj_struct == MOD_DEV_PROJ_NAME:
        return normpath(join(_base_dir, "projects", proj_name, "build"))

    if proj_struct == STD_DEV_PROJ_NAME:
        return normpath(join(_base_dir, "deploy", "apps", proj_name))

    help_build("Unsupported project structure")
    sys.exit(1)


def get_proj_struct(dev_proj_path):
    if normpath(dev_proj_path).startswith(_mod_dev_dir):
        return MOD_DEV_PROJ_NAME

    if normpath(dev_proj_path).startswith(_std_dev_dir):
        return STD_DEV_PROJ_NAME

    return DEFAULT_PROJ_STRUCT


def check_proj_struct(dev_proj_path, apps):
    """
    Checks project structure.
    """
    if not len(apps):
        help_build("Project must contain only one HTML file in the root directory")
        sys.exit(1)

    for app in apps:
        if not isfile(join(dev_proj_path, str(app))):
            help_build(app.name + " HTML file does not exist")
            sys.exit(1)

    files = []

    for path, paths, filenames in os.walk(dev_proj_path):
        for f in filenames:
            files.append(join(path, f))

    html_files = list(filter(lambda f: f.split('.')[-1] == 'html', files))

    for app in apps:
        if not normpath(join(dev_proj_path, str(app))) in files:
            help_build("Main HTML file must be in the root directory")
            sys.exit(1)

def is_abs(src):
    return (src.startswith("https://") or
            src.startswith("http://") or
            src.startswith("//"))


def build_app(app, **kwargs):
    dev_proj_path     = kwargs["dev_proj_path"]
    build_proj_path   = kwargs["build_proj_path"]
    engine_type       = kwargs["engine_type"]
    opt_level         = kwargs["opt_level"]
    use_physics       = kwargs["use_physics"]
    use_source_map    = kwargs["use_source_map"]

    copy_ignore = kwargs["ignore"][:]

    if kwargs["proj_struct"] == MOD_DEV_PROJ_NAME:
        copy_ignore.append("blender")
        copy_ignore.append("assets")

    if kwargs["remove_exist_dir"]:
        if exists(build_proj_path):
            shutil.rmtree(build_proj_path)
        shutil.copytree(dev_proj_path, build_proj_path,
                ignore=shutil.ignore_patterns(*copy_ignore))

    build_proj_path_obj = Path(build_proj_path)

    html_file  = join(build_proj_path, relpath(app.as_posix(), dev_proj_path))

    css_ignore = []
    js_ignore  = []

    for ignore in kwargs["css_ignore"]:
        css_ignore.extend(build_proj_path_obj.rglob(ignore))

    for ignore in kwargs["js_ignore"]:
        js_ignore.extend(build_proj_path_obj.rglob(ignore))

    css_ignore = [relpath(css.as_posix(), build_proj_path) for css in css_ignore]
    js_ignore = [relpath(js.as_posix(), build_proj_path) for js in js_ignore]

    parser = parse_html_file(html_file, js_ignore, css_ignore)
    css_pos = {}
    js_pos = {}

    for css in filter(lambda x: not "no_compile" in x, parser.css):
        css_dir = normpath(dirname(css["href"]))

        if not css_dir in css_pos or css_pos[css_dir][0] > css["start_pos"][0]:
            css_pos[css_dir] = [css["start_pos"][0], css["start_pos"][1]]

    cur_mods_dict = list(filter(lambda x: not is_abs(x["src"]) and dirname(normpath(join(str(app.parent), unix_path(x["src"])))).startswith(_src_dir), parser.js))

    try:
        engine_pos = [cur_mods_dict[0]["start_pos"][0], cur_mods_dict[0]["start_pos"][1]]
    except:
        engine_pos = None

    if engine_pos is None:
        for js in parser.js:
            _undeleted_files.append(join(build_proj_path, relpath(normpath(join(str(app.parent), js["src"])), dev_proj_path)))

        for css in parser.css:
            _undeleted_files.append(join(build_proj_path, relpath(normpath(join(str(app.parent), css["href"])), dev_proj_path)))

        return

    cur_js_dict = list(filter(lambda x: not is_abs(x["src"]) and not dirname(normpath(join(str(app.parent), unix_path(x["src"])))).startswith(_src_dir), parser.js))

    for js in filter(lambda x: not "no_compile" in x, cur_js_dict):
        js_dir = normpath(dirname(js["src"]))

        if not js_dir in js_pos or js_pos[js_dir][0] > js["start_pos"][0]:
            js_pos[js_dir] = [js["start_pos"][0], js["start_pos"][1]]

    remove_mods_from_html(html_file, parser.js, "</script>", False)
    remove_mods_from_html(html_file, parser.css, False, False)

    css_files = list(build_proj_path_obj.rglob('*.css'))
    css_paths = exist_css(parser.css, css_files, normpath(join(html_file, "..")))

    if len(css_paths):
        compile_css(css_paths, app.stem)

    js_files = list(build_proj_path_obj.rglob('*.js'))
    js_paths = exist_js(parser.js, js_files, normpath(join(html_file, "..")))

    if len(js_paths):
        compile_js(js_paths, app.stem, opt_level, engine_type, use_source_map, dev_proj_path, build_proj_path)

    params = {
        "app":               app,
        "build_proj_path":   build_proj_path,
        "conf_assets_dirs":  kwargs["conf_assets_dirs"],
        "css_paths":         css_paths,
        "engine_type":       engine_type,
        "js_paths":          js_paths,
        "html_file":         html_file,
        "parser":            parser,
        "js_pos":            js_pos,
        "css_pos":           css_pos,
        "engine_pos":        engine_pos,
        "use_physics":       use_physics,
        "opt_level":         opt_level,
        "version":           kwargs["version"]
    }

    build_html(**params)

    delete_after_files = kwargs["ignore"]

    for f in delete_after_files:
        abs_file_path = join(build_proj_path, f)

        if isdir(abs_file_path):
            shutil.rmtree(abs_file_path)
        elif exists(abs_file_path):
            os.remove(abs_file_path)

def parse_html_file(html_file, js_ignore=[], css_ignore=[]):
    parser = HTMLProcessor(js_ignore, css_ignore)
    src_file = open(html_file, encoding="utf-8")
    src_text = src_file.read()
    src_file.seek(0)
    src_file.close()

    parser.feed(src_text)

    return parser

def parse_body(start_body, end_body, src_lines):
    first_line = src_lines[start_body[0] - 1][start_body[1]:]
    last_line  = src_lines[end_body[0] - 1][:end_body[1]] + "</body>"

    new_body_lines = []
    new_body_lines.append(first_line)

    if start_body[0] != end_body[0]:
        new_body_lines.extend(src_lines[start_body[0]:end_body[0] - 1])
        new_body_lines.append(last_line)

    return new_body_lines

def build_html(**kwargs):
    parser = kwargs["parser"]

    app = kwargs["app"]
    build_proj_path = kwargs["build_proj_path"]
    css_paths = kwargs["css_paths"]
    engine_type = kwargs["engine_type"]
    engine_pos = kwargs["engine_pos"]
    js_paths = kwargs["js_paths"]
    out_html_file_path = kwargs["html_file"]
    css_pos = kwargs["css_pos"]
    js_pos = kwargs["js_pos"]
    opt_level = kwargs["opt_level"]
    use_physics = kwargs["use_physics"]
    version = kwargs["version"]

    suffix = ""

    if not version:
        version = datetime.datetime.now().strftime("%d%m%Y%H%M%S")

    suffix = "?v=" + version

    print("    " + "-"*(len(relpath(out_html_file_path, _base_dir)) + len("Processing: ")))
    print_wrapper(relpath(out_html_file_path, _base_dir))
    print("    " + "-"*(len(relpath(out_html_file_path, _base_dir)) + len("Processing: ")))

    engine_file_name = OPTIMIZATION_ENGINE_NAME_DICT[opt_level]

    engine_path = normpath(join(_engine_dir, engine_file_name))
    engine_src = False

    if engine_type == "external":
        engine_type = "copy"

    if use_physics:
        copy_phys_to_proj_path(build_proj_path);

    if engine_type == "copy":
        engine_src = engine_file_name
        new_engine_path = normpath(join(build_proj_path, engine_file_name))
        shutil.copyfile(engine_path, new_engine_path)

    rel_assets_root = "."

    if len(kwargs["conf_assets_dirs"]):
        rel_assets_root = kwargs["conf_assets_dirs"][0]

    if engine_type in ["compile", "copy"]:
        change_build_assets_prefix(build_proj_path, rel_assets_root)

        if engine_type == "compile":
            change_build_version(build_proj_path, False, version, js_paths)
        else:
            change_build_version(build_proj_path, engine_file_name, version, False)

        if use_physics:
            change_uranium_mem_path(build_proj_path, version)

    css_strs = {}

    for parent in css_paths:
        rel = relpath(parent, start=join(out_html_file_path, ".."))

        css_strs[str(css_pos[rel][0])] = \
            ['<link type="text/css" rel="stylesheet" href="' + \
            unix_path(normpath(join(rel, app.stem))) + \
            '.min.css' + suffix + '">', css_pos[rel][1]]

    engine_str = ""

    if engine_src:
        engine_str =\
            '<script type="text/javascript" src="' +\
            unix_path(join(relpath(build_proj_path, start=join(out_html_file_path, "..")), engine_src)) + suffix + '"></script>'

    js_strs = {}

    for parent in js_paths:
        rel = relpath(parent, start=join(out_html_file_path, ".."))

        js_strs[str(js_pos[rel][0])] = \
            ['<script type="text/javascript" src="' +\
            unix_path(normpath(join(rel, app.stem))) + '.min.js' + suffix + '"></script>', js_pos[rel][1]]

    html_file = open(out_html_file_path, encoding="utf-8")
    src_text = html_file.readlines()
    html_file.seek(0)
    html_file.close()
    tmp = []

    if not engine_pos is None:
        for i, line in enumerate(src_text, start=1):
            if i == engine_pos[0]:
                tmp.append(line[0:engine_pos[1]] + engine_str + line[engine_pos[1]:])
            elif str(i) in css_strs:
                tmp.append(line[0:css_strs[str(i)][1]] + css_strs[str(i)][0] + line[css_strs[str(i)][1]:])
            elif str(i) in js_strs:
                tmp.append(line[0:js_strs[str(i)][1]] + js_strs[str(i)][0] + line[js_strs[str(i)][1]:])
            else:
                tmp.append(line)

    html_file = open(out_html_file_path, 'w', encoding="utf-8", newline="\n")
    html_file.writelines(tmp)
    html_file.close()

    html_file = open(out_html_file_path, 'r', encoding="utf-8", newline="\n")
    html_text = html_file.read()
    html_file.close()

    html_file = open(out_html_file_path, 'w', encoding="utf-8", newline="\n")
    html_file.write(re.sub(r'>\s+<', '> <', html_text))
    html_file.close()

def copy_phys_to_proj_path(proj_path):
    shutil.copy(join(_engine_dir, URANIUM_FILE_NAME), proj_path)
    shutil.copy(join(_engine_dir, URANIUM_FILE_NAME_BIN), proj_path)

def change_build_version(build_proj_path, engine_file_name, version, js_paths=False):
    processed_files = []

    if engine_file_name:
        processed_files.append(join(build_proj_path, engine_file_name))

    if js_paths:
        for i in js_paths.values():
            processed_files.extend(i)

        processed_files = [i.strip(".js") + ".min.js" for i in processed_files]

    for path in processed_files:
        if not exists(path):
            continue

        processed_file = open(path, "r", encoding="utf-8")
        file_data = processed_file.read()
        processed_file.close()

        file_data = re.sub("_b4w_ver_.*?([\'|\"])", str(version) + r"\1",  file_data)

        processed_file = open(path, "w", encoding="utf-8")
        processed_file.write(file_data)
        processed_file.close()

def change_build_assets_prefix(build_proj_path, rel_assets_root):
    proj_path_obj = Path(normpath(build_proj_path))
    js_files = list(proj_path_obj.rglob('*.js'))

    for js_file in js_files:
        engine_file = open(str(js_file), "r", encoding="utf-8")
        file_data = engine_file.read()
        engine_file.close()

        prefix = unix_path(join(relpath(_base_dir, js_file.parent.as_posix()), "deploy", "assets"))
        prefix = prefix.replace("../deploy/", "")
        proj_prefix = unix_path(relpath(join(_base_dir, rel_assets_root), js_file.parent.as_posix()))

        file_data = re.sub("(\"|\')(B4W_ASSETS_PATH=__JS__\/)(?!\'|\")(.*?)(\"|\')", r"\1\2" + prefix + r"\/\4", file_data)
        file_data = re.sub("(\"|\')(B4W_PROJ_ASSETS_PATH=__JS__\/)(?!\'|\")(.*?)(\"|\')", r"\1\2" + proj_prefix + r"\/\4", file_data)

        engine_file = open(str(js_file), "w", encoding="utf-8")
        engine_file.write(file_data)
        engine_file.close()

def change_deploy_assets_prefix(new_engine_path, assets_path_prefix):
    proj_path_obj = Path(normpath(new_engine_path))
    js_files = list(proj_path_obj.rglob('*.js'))

    for js_file in js_files:
        engine_file = open(str(js_file), "r", encoding="utf-8")
        file_data = engine_file.read()
        engine_file.close()

        if not re.match("^(((.*?)\/\/)|(\/))", assets_path_prefix):
            assets_path_prefix = unix_path(assets_path_prefix)

        if assets_path_prefix and assets_path_prefix[-1] != "/":
            assets_path_prefix += "/"

        file_data = re.sub("(\"|\')(B4W_ASSETS_PATH=)(?!\'|\")(.*?)(\"|\')", r"\1\2" + assets_path_prefix + r"\4", file_data)
        file_data = re.sub("(\"|\')(B4W_PROJ_ASSETS_PATH=)(?!\'|\")(.*?)(\"|\')", r"\1\2" +  assets_path_prefix + r"\4", file_data)

        engine_file = open(str(js_file), "w", encoding="utf-8")
        engine_file.write(file_data)
        engine_file.close()


def change_b4w_path(new_app_dir):
    """
    Modifies path to engine in the standalone application.
    """
    new_app_dir_obj = Path(normpath(new_app_dir))
    html_paths = list(new_app_dir_obj.rglob('*.html'))

    for html_path in html_paths:
        if os.path.samefile(new_app_dir, html_path.parent.as_posix()):
            continue

        html_file = open(str(html_path), "r", encoding="utf-8")
        file_data = html_file.read()
        html_file.close()

        new_path = unix_path(relpath(new_app_dir, html_path.parent.as_posix()))

        new_data = re.sub("(src\s*=[\"|\'])([\w/.]*)(b4w.[\w.]*min.js)", "\\1" +
                new_path + "/\\3", file_data)

        html_file = open(str(html_path), "w", encoding="utf-8")
        html_file.write(new_data)
        html_file.close()

def compile_css(css_paths, file_name):
    # yuicompressor executive file
    css_yc_path = normpath(join(_base_dir, "tools", "yuicompressor", "yuicompressor.jar"))

    # closure compiler params
    CSS_YP_PARAMS = [_java_exec, "-jar", css_yc_path]

    for parent in css_paths:
        with open(normpath(join(parent, 'temp_css.css')), 'wb') as temp_css:
            for filename in css_paths[parent]:
                with open(filename, 'rb') as f:
                    shutil.copyfileobj(f, temp_css, 1024*1024*10)

        output_css_path = join(parent, file_name + ".min.css")
        temp_css_path = normpath(join(parent, "temp_css.css"))

        css_adv_params = list.copy(CSS_YP_PARAMS)
        css_adv_params.append(temp_css_path)
        css_adv_params.append("-o")
        css_adv_params.append(output_css_path)

        print("    " + "-"*(len(relpath(output_css_path, _base_dir)) + len("Processing: ")))
        print_wrapper(relpath(output_css_path, _base_dir))
        print("    " + "-"*(len(relpath(output_css_path, _base_dir)) + len("Processing: ")))

        print_flush()

        subprocess.call(css_adv_params)

        for css in css_paths[parent]:
            _temporary_files.append(css)

        os.remove(temp_css_path)

def append_externs_items(paths, externs_gen_file):
    """
    Finds items in js files which must be added in extern file.
    """
    for path in paths:
        abs_path = str(path)

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

def compile_js(js_paths, file_name, opt_level, engine_type, use_source_map, dev_proj_path, build_proj_path):
    # engine compiler path

    ENGINE_CP = [sys.executable,
            normpath(join(_base_dir, "scripts", "compile_b4w.py"))]

    # closure compiler externs
    if opt_level == "advanced" or opt_level == "simple":
        EXTERNS = [normpath(join(_cc_dir, "extern_modules.js")),
                   normpath(join(_cc_dir, "extern_jquery-1.9.js")),
                   normpath(join(_cc_dir, "extern_fullscreen.js")),
                   normpath(join(_cc_dir, "extern_gl-matrix.js")),
                   normpath(join(_cc_dir, "extern_pointerlock.js"))]

    for parent in js_paths:
        if engine_type == "compile":
            ENGINE_CP_TMP = ENGINE_CP[:]
            ENGINE_CP_TMP.extend(["--external-js=" + join(_src_dir, "b4w.js")])
            ENGINE_CP_TMP.extend(["--external-js=" +
                              i for i in get_used_modules(js_paths[parent])])
            ENGINE_CP_TMP.extend(["--external-js=" + i for i in js_paths[parent]])
            ENGINE_CP_TMP.extend(["-d", join(parent, file_name + ".min.js")])
            ENGINE_CP_TMP.append("--optimization=" + OPTIMIZATION_DICT[opt_level])

            proc = subprocess.Popen(ENGINE_CP_TMP, stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT, universal_newlines=True)

            print_flush()

            print(proc.communicate()[0].strip("\n"))
        else:
            prepared_src_js = ["--js=" + x for x in js_paths[parent]]

            output_js_path = join(parent, file_name + ".min.js")

            js_adv_params = list.copy(_js_cc_params)

            externs_gen_file = None

            if opt_level == "advanced" or opt_level == "simple":
                apps_dir = join(_base_dir, "apps_dev")

                externs_gen_file = tempfile.NamedTemporaryFile(mode="r+", suffix=".js", delete=False)

                addons_path_obj = Path(join(_src_dir, "addons"))
                ext_path_obj    = Path(join(_src_dir, "ext"))

                addons = addons_path_obj.rglob('*.js')
                ext    = ext_path_obj.rglob('*.js')

                append_externs_items(addons, externs_gen_file)
                append_externs_items(ext, externs_gen_file)

                externs_gen_file.seek(0)

                ext_adv = list.copy(EXTERNS)

                ext_adv.append(externs_gen_file.name)

                prepared_src_ext = ["--externs=" + join(apps_dir, x)
                                               for x in ext_adv]

                js_adv_params.extend(prepared_src_ext)

            if use_source_map:
                js_adv_params.append("--create_source_map=" + output_js_path + ".map")
                js_adv_params.append("--source_map_format=V3")

            js_adv_params.extend(prepared_src_js)
            js_adv_params.append(
                "--js_output_file=" + output_js_path)

            print("    " + "-"*(len(relpath(output_js_path, _base_dir)) + len("Processing: ")))
            print_wrapper(relpath(output_js_path, _base_dir))
            print("    " + "-"*(len(relpath(output_js_path, _base_dir)) + len("Processing: ")))

            # NOTE: fixes deadlocks on windows
            proc = subprocess.Popen(js_adv_params, stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT, universal_newlines=True)

            print_flush()

            output = proc.communicate()[0]

            if len(output):
                print(output)

            if externs_gen_file:
                externs_gen_file.close()

                try:
                    os.remove(externs_gen_file.name)
                except:
                    print("File ", externs_gen_file.name, " not found")

            if use_source_map:
                source_map_file = open(output_js_path + ".map")
                source_map_text = source_map_file.read()
                source_map_file.close()
                src_paths = ["/" + relpath(join(dev_proj_path, relpath(i, build_proj_path)), _base_dir) for i in js_paths[parent]]

                new_source_map_text = re.sub("(\"sources\":)\[.*\]", r"\1" + str(src_paths).replace('\'', '"'), source_map_text)

                source_map_file = open(output_js_path + ".map", "w")
                source_map_file.write(new_source_map_text)
                source_map_file.close()

                if exists(output_js_path):
                    output_js_file = open(output_js_path, "a")
                    output_js_file.write("//# sourceMappingURL=/" + relpath(output_js_path + ".map", _base_dir))
                    output_js_file.close()

        for js in js_paths[parent]:
            _temporary_files.append(js)

def get_used_modules(js_files):
    pattern_1 = r'= *require\([\"|\'](.*)[\"\']\)'
    pattern_2 = r'b4w\.module+\[[\"|\'](.*)[\"|\']\] *= *function'
    pattern_3 = r'b4w\.module+\[[\"|\'](.*)[\"|\']\] *= *b4w\.module'

    modules = []
    module_names = {}
    reserved_mods = []
    paths = {}

    for root, dirs, files in os.walk(_src_dir):
        files = [f for f in files if splitext(f)[1] == ".js"]

        paths[root] = files

    for js_file in js_files:
        f = open(js_file, encoding="utf-8")

        try:
            string = f.read()
        except UnicodeDecodeError as err:
            print(RED, "File", js_file, "has an unsupported encoding. Please save it in UTF-8 encoding.", ENDCOL)
            sys.exit(1)
        f.close()

        modules.extend(re.findall(pattern_1, string))

        for path in paths:
            for f in paths[path]:
                with open(join(path, f), encoding="utf-8") as ff:
                    try:
                        text = ff.read()
                    except UnicodeDecodeError as err:
                        print(RED, "File", join(path, f), "has an unsupported encoding. Please save it in UTF-8 encoding.", ENDCOL)
                        sys.exit(1)

                    file_modules = re.findall(pattern_2, text)
                    file_modules.extend(re.findall(pattern_3, text))

                    for file_module in file_modules:
                        if not file_module in module_names:
                            module_names[file_module] = join(path, f)

    for module in modules:
        check_file_modules(module, module_names, reserved_mods, pattern_1)

    return reserved_mods

def check_file_modules(module, module_names, reserved_mods, pattern_1):
    if not module in module_names:
        return

    if not module_names[module] in reserved_mods:
        reserved_mods.append(module_names[module])

    with open(module_names[module], encoding="utf-8") as parent_module:
        par_mod_text = parent_module.read()
        ch_modules = re.findall(pattern_1, par_mod_text)

        for ch_module in ch_modules:
            if not module_names[ch_module] in reserved_mods:
                check_file_modules(ch_module, module_names,
                                   reserved_mods, pattern_1)

def exist_css(included_files, files, app_path_name):
    """
    Checks css files are included in html and exists in application directory.
    """
    processed_files = {}

    for item in included_files:
        css_src = normpath(join(app_path_name, item["href"]))

        if "no_compile" in item:
            continue

        for item_file in files:
            css_file = normpath(str(item_file))

            if css_src == css_file:
                parent = str(item_file.parent)

                if parent in processed_files:
                    processed_files[parent].append(css_file)
                else:
                    processed_files[parent] = [css_file]
                break

    return processed_files

def exist_js(included_files, files, app_path_name):
    """
    Checks js files are included in html and exists in application directory.
    """
    processed_files = {}

    for item in included_files:
        if not 'src' in item:
            continue

        js_src = normpath(join(app_path_name, item["src"]))

        if "no_compile" in item:
            continue

        for item_file in files:
            js_file = normpath(str(item_file))

            if js_src == js_file:
                parent = str(item_file.parent)

                if parent in processed_files:
                    processed_files[parent].append(js_file)
                else:
                    processed_files[parent] = [js_file]
                break

    return processed_files

def print_wrapper(output_path):
    """
    Wraps print by horizontal lines.
    """
    print(GREEN + "    Processing" + ENDCOL + ": " + BLUE + output_path + ENDCOL)

def check_dependencies(dependencies, do_print=True):
    missing_progs = get_missing_progs(dependencies)
    needed_progs = {}

    for dep in missing_progs:
        if dep == "java":
            needed_progs["Java"] = True
    for prog in needed_progs:
        if do_print:
            print("Couldn't find", prog)
    if len(missing_progs) > 0:
        return False
    return True

def get_missing_progs(dependencies):
    missing_progs = []
    for dep in dependencies:
        if not shutil.which(dep):
            missing_progs.append(dep)
    return missing_progs

def help_build(err=""):
    if err:
        help_print_err(err, "build")
    else:
        print("""\
Usage: project.py [-p|--project PROJECT] build [OPTION]...
Build the project's application(s).

Options:
    -a, --app=APP             specify source application html file
    -b, --source-map          use source map
    -c, --css-ignore          skip css file
    -j, --js-ignore           skip js file
    -i, --ignore              skip any file
    -o, --optimization=TYPE   set JavaScript optimization type
    -v, --version             add version to js and css urls
    -h, --help                show this help and exit""")

def help_clone_snippet(err=""):
    if err:
        help_print_err(err, "clone-snippet")
    else:
        print("""\
Usage: project.py [-s|--snippet-name SNIPPET_NAME] clone-snippet [OPTION]...
Create new project based on the snippet.

Options:
    -n, --new-proj-name=NEW_PROJECT_NAME    specify new project name
    -b, --blender-exec=BLENDER_EXEC_PATH    path to blender executable
    -h, --help                              show this help and exit""")

def run_config(args, proj_path):
    config_file = join(proj_path, PROJ_CONFIG_FILE_NAME)

    if not exists(config_file):
        help_convert_resources("Config file does not exist.")

    proj_cfg = get_proj_cfg(proj_path)

    print(proj_cfg_value(proj_cfg, "paths", "assets_dirs", []))

def run_convert_resources(args, proj_path):
    try:
        opts, args = getopt.getopt(args, "hs:", ["help", "assets="])
    except getopt.GetoptError as err:
        help_convert_resources("Incorrect command line arguments")
        sys.exit(1)

    assets_dirs = []

    for o, a in opts:
        if o == "--help" or o == "-h":
            help_convert_resources()
            sys.exit(0)
        elif o == "--assets" or o == "-s":
            assets_dirs.append(cwd_rel_to_abs(a))

    if not len(assets_dirs):
        proj_cfg = get_proj_cfg(proj_path)
        assets_dirs = sdk_rel_to_abs_paths(proj_cfg_value(proj_cfg, "paths",
                "assets_dirs", []))

    python_path = sys.executable
    conv_path = join(_base_dir, "scripts", "converter.py")

    for assets_dir in assets_dirs:
        # NOTE: crashes if some utility is not found
        print("Processing directory: " + relpath(assets_dir, _base_dir))
        print("Creating minified copies of textures...")
        print_flush()
        subprocess.check_call([python_path, conv_path, "-d", assets_dir, "resize_textures"])
        print("Converting textures to DDS...")
        print_flush()
        subprocess.check_call([python_path, conv_path, "-d", assets_dir, "convert_dds"])
        print("Converting textures to PVR...")
        print_flush()
        subprocess.check_call([python_path, conv_path, "-d", assets_dir, "convert_pvr"])
        print("Creating audio and video files of alternative formats...")
        print_flush()
        subprocess.check_call([python_path, conv_path, "-d", assets_dir, "convert_media"])
        print("Creating gzip-compressed .json/.bin/.pvr/.dds files...")
        print_flush()
        subprocess.check_call([python_path, conv_path, "-d", assets_dir, "compress_gzip"])

    print(GREEN + "Project assets converted." + ENDCOL)

def help_convert_resources(err=""):
    if err:
        help_print_err(err, "convert_resources")
    else:
        print("""\
Usage: project.py [-p|--project PROJECT] convert_resources [OPTION]...
Convert project resources (textures/audio/video) to alternative formats.

Options:
    -s, --assets   source assets directory
    -h, --help     show this help and exit""")

def run_reexport(args, proj_path):
    """
    Reexport blender scenes.
    """
    try:
        opts, args = getopt.getopt(args, "hs:b:",
                ["help", "assets=", "blender-exec=", "blender_exec="])
    except getopt.GetoptError as err:
        help_reexport("Incorrect command line arguments")
        sys.exit(1)

    assets_dirs = []

    proj_cfg = get_proj_cfg(proj_path)

    blender_exec = proj_cfg_value(proj_cfg, "paths", "blender_exec", "blender")

    for o, a in opts:
        if o == "--help" or o == "-h":
            help_reexport()
            sys.exit(0)
        elif o == "--assets" or o == "-s":
            assets_dirs.append(cwd_rel_to_abs(a))
        elif o == "--blender-exec" or o == "--blender_exec" or o == "-b":
            blender_exec = a

    if not len(assets_dirs):
        assets_dirs = sdk_rel_to_abs_paths(proj_cfg_value(proj_cfg, "paths",
                "assets_dirs", []))

    scripts_path = join(_base_dir, "scripts")
    proc_blend_mod = imp.find_module("process_blend", [scripts_path])
    proc_blend = imp.load_module("process_blend", proc_blend_mod[0],
            proc_blend_mod[1], proc_blend_mod[2])

    for assets_dir in assets_dirs:
        proc_blend.process_files(blender_exec, assets_dir, assets_dir)

    print(GREEN + "Assets reexported" + ENDCOL)

def help_reexport(err=""):
    if err:
        help_print_err(err, "reexport")
    else:
        print("""\
Usage: project.py [-p|--project PROJECT] reexport [OPTION]...
Rexport project *.blend files.

Options:
    -s, --assets         specify source assets directory
    -b, --blender-exec   path to blender executable
    -h, --help           show this help and exit""")

def run_remove(args, proj_path):
    """
    Remove existing project with all files.
    """
    proj_cfg    = get_proj_cfg(proj_path)

    build_proj_path = sdk_rel_to_abs(proj_cfg_value(proj_cfg, "paths",
                      "build_dir", normpath(join(_base_dir, "deploy", "apps",
                      basename(proj_path)))))

    deploy_rel_path = proj_cfg_value(proj_cfg, "paths", "assets_dirs", [])
    blend_rel_path = proj_cfg_value(proj_cfg, "paths", "blend_dirs", [])

    deploy_abs_path = [normpath(join(_base_dir, p)) for p in deploy_rel_path]
    blend_abs_path = [normpath(join(_base_dir, p)) for p in blend_rel_path]

    for p in blend_abs_path:
        if isdir(p):
            shutil.rmtree(p)

    for p in deploy_abs_path:
        if isdir(p):
            shutil.rmtree(p)

    if isdir(build_proj_path):
        shutil.rmtree(build_proj_path)

    if isdir(proj_path):
        shutil.rmtree(proj_path)

    print(GREEN + "The project " + basename(proj_path) + " has been removed" + ENDCOL)

def run_deploy(args, proj_path):
    """
    Deploy project into the external directory with all required files.
    """
    proj_cfg    = get_proj_cfg(proj_path)
    proj_struct = get_proj_struct(proj_path)

    proj_name = proj_cfg_value(proj_cfg, "info", "name", basename(proj_path))
    engine_type = proj_cfg_value(proj_cfg, "compile", "engine_type")

    try:
        opts, args = getopt.getopt(args,
                                    "e:E:os:t:hi:",
                                   ["assets-dest=",
                                    "assets-prefix=",
                                    "override",
                                    "assets=",
                                    "engine-type=",
                                    "help",
                                    "ignore="])
    except getopt.GetoptError as err:
        help_deploy("Incorrect command line arguments")
        sys.exit(1)

    deploy_abs_path = None

    deploy_rel_path = proj_cfg_value(proj_cfg, "paths", "deploy_dir")
    author = proj_cfg_value(proj_cfg, "info", "author", "")

    if deploy_rel_path:
        deploy_abs_path = normpath(join(_base_dir, deploy_rel_path))

    assets_path_dest     = proj_cfg_value(proj_cfg, "deploy",
            "assets_path_dest", "assets")
    assets_path_prefix   = proj_cfg_value(proj_cfg, "deploy",
            "assets_path_prefix", "assets")
    remove_exist_ext_dir = proj_cfg_value(proj_cfg, "deploy", "override", False)
    build_proj_path      = sdk_rel_to_abs(proj_cfg_value(proj_cfg, "paths",
                           "build_dir", normpath(join(_base_dir, "deploy", "apps",
                           basename(proj_path)))))

    assets_dirs = []

    ignore = []

    for o, a in opts:
        if o == "--assets-dest" or o == "-e":
            assets_path_dest = unix_path(normpath(a))
        elif o == "--assets-prefix" or o == "-E":
            assets_path_prefix = a
        elif o == "--override" or o == "-o":
            remove_exist_ext_dir = True
        elif o == "--ignore" or o == "-i":
            ignore.append(a)
        elif o == "--assets" or o == "-s":
            assets_dirs.append(cwd_rel_to_abs(a))
        elif o == "--engine-type" or o == "-t":
            engine_type = a
        elif o == "--help" or o == "-h":
            help_deploy()
            sys.exit(0)

    if not len(assets_dirs):
        assets_dirs = sdk_rel_to_abs_paths(proj_cfg_value(proj_cfg, "paths",
                "assets_dirs", []))

    if len(args):
        deploy_abs_path = cwd_rel_to_abs(args[0])

    if not len(ignore):
        ignore = proj_cfg_value(proj_cfg, "deploy", "ignore", [])

    ignore.extend(COMP_DEPL_IGNORE)

    if not isdir(build_proj_path):
        if proj_struct == STD_DEV_PROJ_NAME:
            help_deploy("Build project directory does not exist")
            sys.exit(1)
        elif proj_struct == MOD_DEV_PROJ_NAME:
            abs_wp_build_path = join(_base_dir, WEBPLAYER_REL_BUILD_PATH)

            if not exists(abs_wp_build_path):
                help_deploy("You must have built webplayer app")
                sys.exit(1)

            build_proj_path = assets_dirs[0]
        else:
            help_deploy("Unknown project structure")
            sys.exit(1)

    if not deploy_abs_path:
        help_deploy("You must specify deploy directory")
        sys.exit(1)

    if isdir(deploy_abs_path):
        if remove_exist_ext_dir:
            shutil.rmtree(deploy_abs_path)
            archive = None
        else:
            help_deploy("Deploy directory already exists")
            sys.exit(1)
    elif guess_zip(deploy_abs_path):
        archive = deploy_abs_path
        tmpdir_obj = tempfile.TemporaryDirectory()
        deploy_abs_path = join(tmpdir_obj.name, "archive_content_dir")
    else:
        archive = None

    if engine_type == "webplayer_html":
        html_files = list(Path(build_proj_path).rglob("*.html"))

        if len(html_files):
            os.makedirs(join(deploy_abs_path, Path(build_proj_path).stem), exist_ok=True)

        for html_file in html_files:
            shutil.copy(join(build_proj_path, html_file.as_posix()), deploy_abs_path)
    else:
        shutil.copytree(build_proj_path, deploy_abs_path,
                ignore=shutil.ignore_patterns(*ignore))

    for assets_dir in assets_dirs:
        if exists(assets_dir) and assets_dir != build_proj_path:
            if relpath(assets_dir, _base_dir).startswith("projects"):
                shutil.copytree(assets_dir, join(deploy_abs_path, assets_path_dest))
            else:
                shutil.copytree(assets_dir, join(deploy_abs_path, assets_path_dest,
                                                 relpath(assets_dir,
                                                         join(_base_dir, "deploy", "assets"))))
        else:
            assets_path_prefix = ""

    if engine_type == "external":
        engine_type = "copy"

    if author != "Blend4Web" and engine_type in ["copy", "compile"]:
        change_b4w_path(deploy_abs_path)
    elif engine_type == "webplayer_json":
        webplayer_path = normpath(join(_base_dir, "deploy", "apps", "webplayer"))

        for f in glob.glob(join(webplayer_path, '*.*')):
            shutil.copy(f, deploy_abs_path)

    change_deploy_assets_prefix(deploy_abs_path, assets_path_prefix)

    if engine_type == "webplayer_json":
        refact_wp_assets_path(deploy_abs_path, assets_path_prefix, proj_cfg)

    if archive:
        print("Compressing deployed project")
        compress_dir(archive, deploy_abs_path, proj_name)

    print(GREEN + "Project " + proj_name + " has been deployed" + ENDCOL)

def help_deploy(err=""):
    if err:
        help_print_err(err, "deploy")
    else:
        print("""\
Usage: project.py [-p|--project PROJECT] deploy [OPTION]... [DIRECTORY]
Deploy the project into the given directory.

Options:
    -e, --assets-dest       destination assets directory ("assets" by default)
    -E, --assets-prefix     assets URL prefix ("assets" by default)
    -o, --override          remove deploy dir if it exists
    -s, --assets            override project's assets directory(s)
    -h, --help              display this help and exit""")


def refact_wp_assets_path(deploy_abs_path, assets_path_prefix, proj_cfg):
    path_obj = Path(deploy_abs_path)
    json_files = list(path_obj.glob("*.json"))

    if not len(json_files):
        return

    main_json_rel_path = join(assets_path_prefix, relpath(str(json_files[0]), deploy_abs_path))

    webplayer_js_path = join(deploy_abs_path, "webplayer.min.js")

    webplayer_js_file = open(webplayer_js_path, encoding="utf-8")
    webplayer_js_src = webplayer_js_file.read()
    webplayer_js_file.close()
    webplayer_js_src = re.sub("([\'|\"]*load[\'|\"]*: *[\'|\"])(__ASSETS_LOADING_PATH__)([\'|\"])", r'\g<1>' + main_json_rel_path + r'\g<3>', webplayer_js_src)

    if proj_cfg.has_option("url_params", "compressed_textures_pvr"):
        webplayer_js_src = re.sub("([\'|\"]*compressed_textures_pvr[\'|\"]*: *[\'|\"])(__COMPRESSED_TEXTURES_PVR__)([\'|\"])", r'\g<1>' + "ON" + r'\g<3>', webplayer_js_src)
    if proj_cfg.has_option("url_params", "compressed_textures"):
        webplayer_js_src = re.sub("([\'|\"]*compressed_textures_dds[\'|\"]*: *[\'|\"])(__COMPRESSED_TEXTURES_DDS__)([\'|\"])", r'\g<1>' + "ON" + r'\g<3>', webplayer_js_src)
    if proj_cfg.has_option("url_params", "show_fps"):
        webplayer_js_src = re.sub("([\'|\"]*show_fps[\'|\"]*: *[\'|\"])(__SHOW_FPS__)([\'|\"])", r'\g<1>' + "ON" + r'\g<3>', webplayer_js_src)
    if proj_cfg.has_option("url_params", "no_social"):
        webplayer_js_src = re.sub("([\'|\"]*no_social[\'|\"]*: *[\'|\"])(__NO_SOCIAL__)([\'|\"])", r'\g<1>' + "ON" + r'\g<3>', webplayer_js_src)
    if proj_cfg.has_option("url_params", "alpha"):
        webplayer_js_src = re.sub("([\'|\"]*alpha[\'|\"]*: *[\'|\"])(__ALPHA__)([\'|\"])", r'\g<1>' + "ON" + r'\g<3>', webplayer_js_src)
    if proj_cfg.has_option("url_params", "min_capabilities"):
        webplayer_js_src = re.sub("([\'|\"]*min_capabilities[\'|\"]*: *[\'|\"])(__MIN_CAPABILITIES__)([\'|\"])", r'\g<1>' + "ON" + r'\g<3>', webplayer_js_src)
    if proj_cfg.has_option("url_params", "autorotate"):
        webplayer_js_src = re.sub("([\'|\"]*autorotate[\'|\"]*: *[\'|\"])(__AUTOROTATE__)([\'|\"])", r'\g<1>' + "ON" + r'\g<3>', webplayer_js_src)
    if proj_cfg.has_option("url_params", "compressed_gzip"):
        webplayer_js_src = re.sub("([\'|\"]*compressed_gzip[\'|\"]*: *[\'|\"])(__COMPRESSED_GZIP__)([\'|\"])", r'\g<1>' + "ON" + r'\g<3>', webplayer_js_src)

    webplayer_js_file = open(webplayer_js_path, "w", encoding="utf-8")
    webplayer_js_file.write(webplayer_js_src)
    webplayer_js_file.close()


def run_check_deps(args):
    """
    Check dependencies
    """
    try:
        opts, args = getopt.getopt(args, "h", ["help"])
    except getopt.GetoptError as err:
        help_check_deps("Incorrect command line arguments")
        sys.exit(1)

    for o, a in opts:
        if o == "--help" or o == "-h":
            help_check_deps()
            sys.exit(0)

    print("Checking dependencies for JavaScript/CSS compilers:")
    if check_dependencies(["java"]):
        print("All programs have been installed.")

    print("")

    print("Checking resource converter dependencies:")

    conv_path = join(_base_dir, "scripts", "converter.py")
    python_path = sys.executable
    print_flush()
    subprocess.check_call([python_path, conv_path, "check_dependencies"])

def help_check_deps(err=""):
    if err:
        help_print_err(err, "check-deps")
    else:
        print("""\
Usage: project.py check-deps [OPTION]
Check external dependencies, required for proper project management operation.

Options:
    -h, --help       show this help and exit""")

def run_import(args):
    """
    Import project(s)
    """
    try:
        opts, args = getopt.getopt(args, "h", ["help"])
    except getopt.GetoptError as err:
        help_import("Incorrect command line arguments")
        sys.exit(1)

    for o, a in opts:
        if o == "--help" or o == "-h":
            help_import()
            sys.exit(0)

    if len(args) != 1:
        help_import("Specify imported project directory or archive")
        sys.exit(1)

    input_base_path = cwd_rel_to_abs(args[0])

    if isdir(input_base_path):
        input_base_dir = input_base_path

        if not check_sdk_base_dir(input_base_dir):
            help_import("Invalid imported project directory")
            sys.exit(1)
    elif guess_zip(input_base_path):
        tmpdir_obj = tempfile.TemporaryDirectory()
        tmpdir = tmpdir_obj.name

        print("Extracting project archive")
        print_flush()

        try:
            z = zipfile.ZipFile(input_base_path, "r")
        except zipfile.BadZipFile as err:
            print(RED, err, ENDCOL, file=sys.stderr)
            sys.exit(1)

        z.extractall(path=tmpdir)
        tmpdir_files = [join(tmpdir, f) for f in os.listdir(tmpdir)]

        input_base_dir = None

        for file in tmpdir_files:
            if isdir(file) and check_sdk_base_dir(file):
                input_base_dir = file
                break

        if not input_base_dir:
            help_import("Invalid project archive")
            sys.exit(1)
    else:
        help_import("Invalid imported project path")
        sys.exit(1)

    proj_list = find_proj_list(input_base_dir)

    for proj_path in proj_list:

        proj_path_dst = join(_base_dir, relpath(proj_path, input_base_dir))

        if exists(join(proj_path_dst, ".b4w_project")):
            print("Ingore existing project:", basename(proj_path))
            continue

        print("New project found:", basename(proj_path))

        if not exists(proj_path_dst):
            print("Copy project directory", relpath(proj_path, input_base_dir))
            shutil.copytree(proj_path, proj_path_dst)

        proj_cfg = get_proj_cfg(proj_path)

        build_proj_path = proj_cfg_value(proj_cfg, "paths", "build_dir",
                normpath(join(_base_dir, "deploy", "apps", basename(proj_path))))

        build_proj_path = sdk_rel_to_abs(build_proj_path, input_base_dir)

        build_proj_path_dst = join(_base_dir, relpath(build_proj_path,
                input_base_dir))

        if not exists(build_proj_path_dst) and isdir(build_proj_path):
            print("Copy build directory:", relpath(build_proj_path, input_base_dir))
            shutil.copytree(build_proj_path, build_proj_path_dst)

        blend_dirs = proj_cfg_value(proj_cfg, "paths", "blend_dirs",
                [normpath(join(_base_dir, "blender", basename(proj_path)))])
        for blend_dir in blend_dirs:
            blend_dir = sdk_rel_to_abs(blend_dir, input_base_dir)

            blend_dir_dst = join(_base_dir, relpath(blend_dir, input_base_dir))

            if not exists(blend_dir_dst) and isdir(blend_dir):
                print("Copy blend directory:", relpath(blend_dir, input_base_dir))
                shutil.copytree(blend_dir, blend_dir_dst)

        assets_dirs = proj_cfg_value(proj_cfg, "paths", "assets_dirs",
                [normpath(join(_base_dir, "deploy", "assets", basename(proj_path)))])
        for assets_dir in assets_dirs:
            assets_dir = sdk_rel_to_abs(assets_dir, input_base_dir)
            assets_dir_dst = join(_base_dir, relpath(assets_dir, input_base_dir))

            if not exists(assets_dir_dst) and isdir(assets_dir):
                print("Copy assets directory:", relpath(assets_dir, input_base_dir))
                shutil.copytree(assets_dir, assets_dir_dst)

        engine_type = proj_cfg_value(proj_cfg, "compile", "engine_type", "copy")

        if engine_type in ["copy", "compile", "external"]:
            print("Check modules in the '", basename(proj_path),"' project.")
            run_check_mods(proj_path_dst)

    print(GREEN + "Project imported" + ENDCOL)

def check_sdk_base_dir(path):
    """Check SDK directory"""

    params = get_sdk_ver_params(path)
    if params[0] == "Blend4Web":
        return True
    else:
        return False

def get_sdk_ver_params(path):
    ver_file_path = join(path, "VERSION")

    with open(ver_file_path, encoding="utf-8") as f:
        lines = f.readlines()

    if not len(lines):
        print(RED, "SDK archive is damaged", ENDCOL, file=sys.stderr)
        sys.exit(1)

    params = lines[0].split()

    return params

def help_import(err=""):
    if err:
        help_print_err(err, "import")
    else:
        print("""\
Usage: project.py import [OPTION] DIRECTORY
       project.py import [OPTION] ARCHIVE
Import one or more projects from directory or ZIP archive.

Options:
    -h, --help   show this help and exit""")

def run_export(args):
    """
    Export project(s)
    """
    try:
        opts, args = getopt.getopt(args, "h", ["help"])
    except getopt.GetoptError as err:
        help_export("Incorrect command line arguments")
        sys.exit(1)

    archive = False

    for o, a in opts:
        if o == "--help" or o == "-h":
            help_export()
            sys.exit(0)

    if len(args) < 2:
        help_export("Specify exported project(s) and destination directory/archive")
        sys.exit(1)

    path_dst = cwd_rel_to_abs(args.pop())

    if isdir(path_dst):
        print("Destination directory already exists")
        sys.exit(1)
    elif guess_zip(path_dst):
        tmpdir_obj = tempfile.TemporaryDirectory()
        base_dir_dst = tmpdir_obj.name
        archive = True
    else:
        base_dir_dst = path_dst
        archive = False

    proj_paths = [normpath(join(_base_dir, unquote(i))) for i in args]

    proj_list = find_proj_list(_base_dir)

    for proj_path in proj_list:
        proj_cfg = get_proj_cfg(proj_path)
        proj_name = proj_cfg_value(proj_cfg, "info", "name", basename(proj_path))

        if not proj_path in proj_paths:
            continue

        print("Exporting project:", proj_name)

        proj_path_dst = join(base_dir_dst, relpath(proj_path, _base_dir))

        print("Copy project directory", relpath(proj_path, _base_dir))
        shutil.copytree(proj_path, proj_path_dst)

        build_proj_path = proj_cfg_value(proj_cfg, "paths", "build_dir",
                normpath(join(_base_dir, "deploy", "apps", basename(proj_path))))
        build_proj_path = sdk_rel_to_abs(build_proj_path, _base_dir)
        build_proj_path_dst = join(base_dir_dst, relpath(build_proj_path,
                _base_dir))

        if not exists(build_proj_path_dst) and isdir(build_proj_path):
            print("Copy build directory:", relpath(build_proj_path, _base_dir))
            shutil.copytree(build_proj_path, build_proj_path_dst)

        blend_dirs = proj_cfg_value(proj_cfg, "paths", "blend_dirs",
                [normpath(join(_base_dir, "blender", basename(proj_path)))])
        for blend_dir in blend_dirs:
            blend_dir = sdk_rel_to_abs(blend_dir, _base_dir)

            blend_dir_dst = join(base_dir_dst, relpath(blend_dir, _base_dir))

            if not exists(blend_dir_dst) and isdir(blend_dir):
                print("Copy blend directory:", relpath(blend_dir, _base_dir))
                shutil.copytree(blend_dir, blend_dir_dst)

        assets_dirs = proj_cfg_value(proj_cfg, "paths", "assets_dirs",
                [normpath(join(_base_dir, "deploy", "assets", basename(proj_path)))])
        for assets_dir in assets_dirs:
            assets_dir = sdk_rel_to_abs(assets_dir, _base_dir)
            assets_dir_dst = join(base_dir_dst, relpath(assets_dir, _base_dir))

            if not exists(assets_dir_dst) and isdir(assets_dir):
                print("Copy assets directory:", relpath(assets_dir, _base_dir))
                shutil.copytree(assets_dir, assets_dir_dst)

    ver_path_dst = join(base_dir_dst, "VERSION")

    if not exists(ver_path_dst):
        params = get_sdk_ver_params(_base_dir)
        version = params[1]

        with open(ver_path_dst, "w", encoding="utf-8") as f:
            f.write("Blend4Web " + version + " PROJECT\n")

    if archive:
        print("Compressing project archive")
        compress_dir(path_dst, base_dir_dst)

    print(GREEN + "Export complete" + ENDCOL)

def compress_dir(archive, directory, root_arc=None):
    z = zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED)

    # calc archive root directory based on archive name
    if not root_arc:
        root_arc = basename(archive).split(".zip")[0]

    for root, dirs, files in os.walk(directory):
        for file in files:
            path = join(root, file)
            path_arc = join(root_arc, relpath(path, directory))
            z.write(path, path_arc)

def guess_zip(path):
    if (mimetypes.guess_type(path)[0] in
            ["application/zip", "application/x-zip-compressed"]):
        return True
    else:
        return False

def help_export(err=""):
    if err:
        help_print_err(err, "export")
    else:
        print("""\
Usage: project.py export PROJECT... DIRECTORY
       project.py export PROJECT... ARCHIVE
Export one or more projects to directory or ZIP archive.

Options:
    -h, --help   show this help and exit""")

def help_remove(err=""):
    if err:
        help_print_err(err, "remove")
    else:
        print("""\
Usage: project.py PROJECT... DIRECTORY remove
Remove project with all files.

Options:
    -h, --help   show this help and exit""")

def help_check_modules(err=""):
    if err:
        help_print_err(err, "check-modules")
    else:
        print("""\
Usage: project.py PROJECT... DIRECTORY check-modules
Check engine modules.

Options:
    -h, --help   show this help and exit""")

def help_update_modules(err=""):
    if err:
        help_print_err(err, "update-modules")
    else:
        print("""\
Usage: project.py PROJECT... DIRECTORY update-modules
Update engine modules.

Options:
    -h, --help   show this help and exit""")

def run_check_mods(proj_path):
    """Check project modules."""

    proj_cfg = get_proj_cfg(proj_path)
    apps = proj_cfg_value(proj_cfg, "compile", "apps", [])
    ignore = proj_cfg_value(proj_cfg, "compile", "ignore", [])
    author = proj_cfg_value(proj_cfg, "info", "author", "")

    if not len(apps):
        apps = list(Path(proj_path).rglob("*.html"))
    else:
        apps = [Path(join(proj_path, app)) for app in apps]

    ignore = [normpath(join(proj_path, i)) for i in ignore]

    if author != "Blend4Web":
        apps = list(filter(lambda app: not app.as_posix() in ignore, apps))
        apps = list(filter(lambda app: app.parts[-2] != "build", apps))
        apps = list(filter(lambda app: app.parts[-2] != "assets", apps))
        apps = list(filter(lambda app: app.parts[-2] != "blender", apps))

    check_proj_struct(proj_path, apps)

    from mod_list import gen_module_list

    engine_type = proj_cfg_value(proj_cfg, "compile", "engine_type", "none")

    if not engine_type in ["external", "compile", "copy"]:
        help("Incorrect engine type; use 'external', 'copy' or 'compile'")
        sys.exit(1)

    for app in apps:
        src_modules = gen_module_list(_src_dir, _src_dir)
        used = []
        unused = []
        parser = HTMLProcessor()
        src_file = open(normpath(app.as_posix()), encoding="utf-8")
        src_text = src_file.read()
        src_file.seek(0)
        src_file.close()
        parser.feed(src_text)

        mods = list(filter(lambda x: not is_abs(x["src"]) and normpath(join(str(app.parent), unix_path(x["src"]))).startswith(_src_dir), parser.js))
        used.extend(list(set(src_modules) - set([normpath(join(str(app.parent), unix_path(x["src"]))) for x in mods])))
        unused.extend(list(set([normpath(join(str(app.parent), unix_path(x["src"]))) for x in mods]) - set(src_modules)))

        is_ok = True

        for m in used:
            if is_ok:
                is_ok = False

            print(" Module '" + relpath(m, _src_dir) + "' is missing in the '" + app.name + "', please include it or run 'Update Modules'.")

        for m in unused:
            if is_ok:
                is_ok = False

            print(" Incorrect module '" + relpath(m, _src_dir) + "' in the '" + app.name + "', please remove it or run 'Update Modules'.")

        if is_ok:
            print(GREEN, "Module check complete. No problems detected in the '" + app.name + "'.", ENDCOL)

def run_update_mods(proj_path):
    """Update project modules."""

    proj_cfg = get_proj_cfg(proj_path)
    apps = proj_cfg_value(proj_cfg, "compile", "apps", [])
    ignore = proj_cfg_value(proj_cfg, "compile", "ignore", [])
    author = proj_cfg_value(proj_cfg, "info", "author", "")

    if not len(apps):
        apps = list(Path(proj_path).rglob("*.html"))
    else:
        apps = [Path(join(proj_path, app)) for app in apps]

    ignore = [normpath(join(proj_path, i)) for i in ignore]

    apps = list(filter(lambda app: not app.as_posix() in ignore, apps))

    if author != "Blend4Web":
        apps = list(filter(lambda app: str(app.relative_to(proj_path).parts[0]) != "build", apps))
        apps = list(filter(lambda app: str(app.relative_to(proj_path).parts[0]) != "assets", apps))
        apps = list(filter(lambda app: str(app.relative_to(proj_path).parts[0]) != "blender", apps))

    from mod_list import gen_module_list

    engine_type = proj_cfg_value(proj_cfg, "compile", "engine_type", "none")

    # check right engine type
    if not engine_type in ["external", "compile", "copy"]:
        help("Incorrect engine type; use 'external', 'copy' or 'compile'")
        sys.exit(1)

    for app in apps:
        src_modules = gen_module_list(relpath(_src_dir, str(app.parent)), _src_dir)

        # current html file js with meta info (like start_pos, end_pos)
        cur_js_dict = get_cur_js_dict(normpath(join(proj_path, app.as_posix())))

        # current html file modules with meta info (like start_pos, end_pos)
        cur_mods_dict = list(filter(lambda x: not is_abs(x["src"]) and dirname(normpath(join(proj_path, unix_path(x["src"])))).startswith(_src_dir), cur_js_dict))

        # remove all src modules from html file
        remove_mods_from_html(normpath(app.as_posix()), cur_mods_dict, "</script>")

        # get first line for srs sripts
        first_line = get_first_js_line(cur_mods_dict, normpath(app.as_posix()))

        # insert right src modules
        insert_src_modules(normpath(app.as_posix()), src_modules, first_line)

    print(GREEN, "Update complete.")

def get_cur_js_dict(html_file_obj):
    parser = HTMLProcessor()
    src_file = open(html_file_obj, encoding="utf-8")
    src_text = src_file.read()
    src_file.seek(0)
    src_file.close()
    parser.feed(src_text)

    return parser.js

def remove_mods_from_html(html_file_obj, cur_mods_dict, end_tag=False, strip=True):
    indent = 0

    if end_tag:
        indent = len(end_tag)

    html_file = open(html_file_obj, encoding="utf-8")
    src_text = html_file.readlines()
    html_file.seek(0)
    html_file.close()
    tmp = []

    ziped_cur_mods_dict = {}

    for i in cur_mods_dict:
        ziped_cur_mods_dict[i["start_pos"][0]] = []

    for i in cur_mods_dict:
        ziped_cur_mods_dict[i["start_pos"][0]].append(i)

    for i in ziped_cur_mods_dict:
        if len(ziped_cur_mods_dict[i]) > 1:
            ziped_cur_mods_dict[i] = sorted(ziped_cur_mods_dict[i], key=lambda x: x["start_pos"][1], reverse=True)

    for i, line in enumerate(src_text):
        exist = False

        if i + 1 in ziped_cur_mods_dict and not "no_compile" in ziped_cur_mods_dict[i + 1][0]:
            new_line = line
            exist = True

            for j in ziped_cur_mods_dict[i + 1]:
                new_line = new_line.replace(line[j["start_pos"][1]:j["end_pos"][1] + indent], "")

            if strip:
                tmp.append(new_line.strip("\n"))
            else:
                tmp.append(new_line)

        if not exist:
            tmp.append(line)

    html_file = open(html_file_obj, 'w', encoding="utf-8", newline="\n")
    html_file.writelines(tmp)
    html_file.close()

def get_first_js_line(cur_mods_dict, html_file_obj):
    if len(cur_mods_dict):
        return cur_mods_dict[0]["start_pos"][0] - 2

    return get_start_head_line(html_file_obj)

def get_start_head_line(html_file_obj):
    parser = HTMLProcessor()
    src_file = open(html_file_obj, encoding="utf-8")
    src_text = src_file.read()
    src_file.seek(0)
    src_file.close()
    parser.feed(src_text)

    try:
        parser.head[0]["start_pos"][0]
    except:
        help_export("HTML valid error. HTML must contain head tag.")
        sys.exit(1)

    return parser.head[0]["start_pos"][0]

def insert_src_modules(html_file_obj, src_modules, first_line):
    html_file = open(html_file_obj, encoding="utf-8")
    src_text = html_file.readlines()
    html_file.seek(0)
    html_file.close()
    tmp = []

    for i, line in enumerate(src_text):
        tmp.append(line)

        if i == first_line:
            for src_module in src_modules:
                tmp.append('<script type="text/javascript" src="' + src_module + '"></script>\n')

    html_file = open(html_file_obj, 'w', encoding="utf-8", newline="\n")
    html_file.writelines(tmp)
    html_file.close()

def run_update_file_struct(args, proj_path):
    """Update project structure."""

    try:
        opts, args = getopt.getopt(args, "hb:",
                ["help", "blender-exec=", "blender_exec="])
    except getopt.GetoptError as err:
        help_reexport("Incorrect command line arguments")
        sys.exit(1)

    proj_cfg = get_proj_cfg(proj_path)

    blender_exec = proj_cfg_value(proj_cfg, "paths", "blender_exec", "blender")

    for o, a in opts:
        if o == "--help" or o == "-h":
            help_update_file_struct()
            sys.exit(0)
        elif o == "--blender-exec" or o == "--blender_exec" or o == "-b":
            blender_exec = a

    new_proj_path = join(_base_dir, "projects", os.path.basename(proj_path))

    if exists(new_proj_path):
        print(RED, "Target directory exists.", ENDCOL, file=sys.stderr)
        sys.exit(1)

    print("Updating project file structure")
    print("Old project directory:", proj_path)
    print("New project directory:", new_proj_path)

    new_assets_path = join(new_proj_path, "assets")
    new_blender_path = join(new_proj_path, "blender")

    print("Copy project directory")
    shutil.copytree(proj_path, new_proj_path)

    proj_cfg = get_proj_cfg(new_proj_path)

    old_assets_paths = proj_cfg_value(proj_cfg, "paths", "assets_dirs", [])
    old_blender_paths = proj_cfg_value(proj_cfg, "paths", "blend_dirs", [])

    print("Copy assets directory")
    for old_assets_path in old_assets_paths:
        old_assets_abs_path = join(_base_dir, old_assets_path)
        shutil.copytree(old_assets_abs_path, new_assets_path)

    print("Copy blender directory")
    for old_blender_path in old_blender_paths:
        old_blender_abs_path = join(_base_dir, old_blender_path)
        shutil.copytree(old_blender_abs_path, new_blender_path)

    os.makedirs(new_assets_path, exist_ok=True)
    os.makedirs(new_blender_path, exist_ok=True)

    b4w_proj_file = join(new_proj_path, ".b4w_project")

    proj_cfg["paths"]["assets_dirs"] = os.path.relpath(new_assets_path,
            _base_dir) + ";"
    proj_cfg["paths"]["blend_dirs"] = os.path.relpath(new_blender_path,
            _base_dir) + ";"
    proj_cfg["paths"]["build_dir"] = os.path.relpath(join(new_proj_path,
        "build"), _base_dir)

    with open(b4w_proj_file, "w", encoding="utf-8", newline="\n") as configfile:
        proj_cfg.write(configfile)

    script_path = join(_base_dir, "scripts", "blender", "cli_change_asset_paths.py")

    if len(old_assets_paths) and len(old_blender_paths):
        print("Changing assets paths (may take a while):")
        correct_texture_paths(script_path, blender_exec, new_blender_path,
                              old_assets_paths[0], new_assets_path,
                              old_blender_paths[0], new_blender_path)

    print(YELLOW + "Please note that m_config.get_std_assets_path() no longer specifies project" + ENDCOL)
    print(YELLOW + "assets directory within the new file structure." + ENDCOL)
    print(YELLOW + "Replace it by m_config.get_assets_path(\"PROJECT_NAME\") method." + ENDCOL)
    print(YELLOW + "Refer to User Manual for more info." + ENDCOL)
    print()

    print(GREEN + "Update complete" + ENDCOL)

def help_update_file_struct(err=""):
    if err:
        help_print_err(err, "update-file-struct")
    else:
        print("""\
Usage: project.py PROJECT... DIRECTORY update-file-struct
Update project file structure.

Options:
    -b, --blender-exec   path to blender executable
    -h, --help   show this help and exit""")


def change_uranium_mem_path(build_proj_path, version):
    uranium_path = join(build_proj_path, URANIUM_FILE_NAME)

    uranium_file = open(uranium_path, "r", encoding="utf-8")
    uranium_file_data = uranium_file.read()
    uranium_file.close()

    regexp_pattern = r"uranium.js.mem"

    uranium_file_data = re.sub(regexp_pattern, r"uranium.js.mem?v=" + str(version), uranium_file_data)

    uranium_file = open(uranium_path, "w", encoding="utf-8")
    uranium_file.write(uranium_file_data)
    uranium_file.close()


def get_base_dir(curr_work_dir):
    curr_dir = curr_work_dir

    while True:
        try:
            ver_file_path = os.path.join(curr_dir, "VERSION")

            with open(ver_file_path, encoding="utf-8") as f:
                lines = f.readlines()

            params = lines[0].split()

            if params[0] == "Blend4Web":
                return os.path.normpath(curr_dir)
        except:
            pass

        up_dir = os.path.normpath(os.path.join(curr_dir, ".."))

        if up_dir == curr_dir:
            return None
        else:
            curr_dir = up_dir
