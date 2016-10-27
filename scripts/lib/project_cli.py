#!/usr/bin/env python3

import configparser
import getopt
import glob
import imp
import itertools
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

from os.path import basename, join, normpath, exists, relpath, splitext, isfile, isdir, dirname
from pathlib import Path
from html.parser import HTMLParser
from collections import OrderedDict

from project_util import unix_path, get_proj_cfg, proj_cfg_value, cwd_rel_to_abs, cfg_create_list, print_flush, csv_str_to_dict

# console text colors
GREEN  = '\033[92m'
BLUE   = '\033[94m'
RED    = "\033[91m"
YELLOW = "\033[93m"
ENDCOL = "\033[0m"

# default engine type option
DEFAULT_ENGINE_TYPE_OPT = ""

# default closure compiler optimization options
DEFAULT_JS_OPTIMIZATION_OPT = "simple"

DEFAULT_PHYS_USING_OPT = True
DEFAULT_SMAA_USING_OPT = False

URANIUM_FILE_NAME      = "uranium.js"
URANIUM_FILE_NAME_BIN  = "uranium.js.mem"
SMAA_FILE_NAME_AREA    = "smaa_area_texture.png"
SMAA_FILE_NAME_SEARCH  = "smaa_search_texture.png"
SMAA_FILE_NAME_SEARCH  = "smaa_search_texture.png"
ENGINE_ADV_FILE_NAME   = "b4w.min.js"
ENGINE_WHITE_FILE_NAME = "b4w.whitespace.min.js"
ENGINE_SIM_FILE_NAME   = "b4w.simple.min.js"

# ignore these files during compilation/deployment
COMP_DEPL_IGNORE = ['project.py', '.b4w_project', '.b4w_icon.*']

MAT_DIR_NAME = "material_library"

_base_dir      = None
_cc_dir        = None
_engine_dir    = None
_src_dir       = None

_js_cc_params = None

_java_exec = "java"

# files deleted after compile project
_temporary_files = []


class HTMLProcessor(HTMLParser):
    def __init__(self, js_ignore=[], css_ignore=[]):
        HTMLParser.__init__(self)

        self.js = []
        self.css = []
        self.inline_js = False
        self.head = []
        self.js_ignore = js_ignore
        self.css_ignore = css_ignore

    def handle_endtag(self, tag):
        if tag == "script":
            if not self.inline_js:
                self.js[-1]["end_pos"] = self.getpos()
            else:
                self.inline_js = False
        elif tag == "head":
            self.head[-1]["end_pos"] = self.getpos()

    def handle_starttag(self, tag, attrs):
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
                    link["end_pos"] = (self.getpos()[0], self.offset + len(self.get_starttag_text()))

                    if mime_type == "text/css":
                        if attr[1] in self.css_ignore:
                            link["no_compile"] = True

                        self.css.append(link)
        elif tag == "head":
            self.head.append({"start_pos": self.getpos()})

def run(argv, base_dir):
    sys.path.append(join(base_dir, "scripts"))

    fill_global_paths(base_dir)

    try:
        opts, args = getopt.getopt(argv[1:], "hp:",
                ["help", "project=", "no-colorama"])
    except getopt.GetoptError as err:
        # NOTE: no colorama yet
        help("Incorrect command line arguments")
        sys.exit(1)

    proj_path = None

    cwd = os.getcwd()

    if exists(join(cwd, ".b4w_project")):
        proj_path = cwd

    no_colorama = False

    for o, a in opts:
        if o == "--help" or o == "-h":
            run_help()
        elif o == "--no-colorama":
            no_colorama = True
        elif o == "--project" or o == "-p":
            # works for absolute paths too
            proj_path = cwd_rel_to_abs(a)

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
    elif cmd == "compile" or cmd == "build":
        if not proj_path:
            help("Project directory not found")
            sys.exit(1)
        run_compile(args[1:], proj_path)
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
    else:
        help("Wrong project management command: " + cmd)
        sys.exit(1)

def fill_global_paths(base_dir):
    global _base_dir, _curr_work_dir, _cc_dir, _src_dir, _js_cc_params, _engine_dir, _java_exec

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
    _js_cc_params = [_java_exec, "-jar", js_cc_path, "--language_in=ECMASCRIPT5"]

    # engine sources directory
    _src_dir = join(base_dir, "src")

def run_help(cmd=""):
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
        help_compile()
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
    """
    Display generic help.
    """
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

Use 'project.py help COMMAND' to read more about the command and it's arguments.
"""
        )

def help_print_err(err, subcmd=""):
    """
    Print formatted error message and hint for --help option
    """
    print("     " + "-"*(len(err)), file=sys.stderr)
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
    """
    Create a Blend4Web project directory structure for the given project.
    """
    try:
        opts, args = getopt.getopt(args, "C:BASPU:T:t:o:b:h:m",
                           ["author=",
                            "bundle",
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
    bundle = False
    do_copy_app_templates = False
    do_copy_scene_templates = False
    do_copy_project_script = False
    url_params = ""
    engine_type = DEFAULT_ENGINE_TYPE_OPT
    opt_level = DEFAULT_JS_OPTIMIZATION_OPT

    blender_exec = "blender"
    copy_materials = False

    for o, a in opts:
        if o == "--author" or o == "-C":
            author = a
        elif o == "--bundle" or o == "-B":
            bundle = True
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
            copy_materials = True
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

    webplayer_proj = engine_type in ["webplayer_html", "webplayer_json"]

    if bundle:
        bundled_msg = "bundled up "
    else:
        bundled_msg = ""

    if engine_type == "webplayer_json":
        print("Creating a new " + bundled_msg + "webplayer json project")
    elif engine_type == "webplayer_html":
        print("Creating a new " + bundled_msg + "webplayer html project")
    print("")
    print("Name:            ", name)
    if title:
        print("Title:           ", title)
    if author:
        print("Author (Company):", author)
    print("")

    dev_dir = join(_base_dir, "apps_dev", name)

    if bundle:
        blender_dir = dev_dir
        build_dir = dev_dir
        assets_dir = dev_dir
    else:
        blender_dir = join(_base_dir, "blender", name)
        build_dir = join(_base_dir, "deploy", "apps", name)
        assets_dir = join(_base_dir, "deploy", "assets", name)

    if webplayer_proj:
        build_dir = dev_dir

    dev_dir_rel = unix_path(relpath(dev_dir, _base_dir))
    blender_dir_rel = unix_path(relpath(blender_dir, _base_dir))
    build_dir_rel = unix_path(relpath(build_dir, _base_dir))
    assets_dir_rel = unix_path(relpath(assets_dir, _base_dir))

    if exists(dev_dir):
        print("Directory for source files already exists")
    else:
        print("Creating directory for source files:", dev_dir_rel)
        os.mkdir(dev_dir)

    if not bundle:
        if exists(build_dir):
            print("Directory for compiled files already exists")
        else:
            print("Creating directory for compiled files:", build_dir_rel)
            os.mkdir(build_dir)

        if exists(blender_dir):
            print("Directory for blend files already exists")
        else:
            print("Creating directory for blend files:", blender_dir_rel)
            os.mkdir(blender_dir)

        if exists(assets_dir):
            print("Directory for exported scenes already exists")
        else:
            print("Creating directory for exported scenes:", assets_dir_rel)
            os.mkdir(assets_dir)

    b4w_proj_file = join(dev_dir, ".b4w_project")

    if exists(b4w_proj_file):
        print("Project settings file already exists")
        return

    print("Creating project settings file:",
            unix_path(relpath(b4w_proj_file, _base_dir)))

    b4w_proj_cfg = configparser.ConfigParser()

    b4w_proj_cfg["info"] = OrderedDict([
        ("author", author),
        ("name", name),
        ("title", title),
        ("icon", "")
    ])

    b4w_proj_cfg["paths"] = OrderedDict([
        ("assets_dirs", cfg_create_list([assets_dir_rel])),
        ("blend_dirs", cfg_create_list([blender_dir_rel])),
        # it's better not to use blender exec from command line
        ("blender_exec", "blender"),
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
        ("use_physics", ""),
        ("use_smaa_textures", ""),
        ("version", "")
    ])

    b4w_proj_cfg["deploy"] = OrderedDict([
        ("assets_path_dest", "assets"),
        ("assets_path_prefix", "assets"),
        ("ignore", ""),
        ("override", "")
    ])

    if url_params:
        b4w_proj_cfg["url_params"] = csv_str_to_dict(url_params)

    with open(b4w_proj_file, "w") as configfile:
        b4w_proj_cfg.write(configfile)

    if do_copy_project_script:
        copy_project_script(_base_dir, dev_dir)

    if do_copy_app_templates and not webplayer_proj:
        copy_app_templates(name, dev_dir, _base_dir, _src_dir, bundle, title)

    if do_copy_scene_templates:
        copy_scene_templates(name, _base_dir, blender_dir, assets_dir,
                blender_exec, engine_type)

    if copy_materials:
        print("Copying material library")
        mat_dir = join(_base_dir, "blender", MAT_DIR_NAME)
        mat_lib_dir = join(blender_dir, MAT_DIR_NAME)
        shutil.copytree(mat_dir, mat_lib_dir,
                ignore=shutil.ignore_patterns("*.blend1", "promo",
                "material_library.blend", "free_material_library.blend"))
        mat_assets = join(_base_dir, "deploy", "assets", MAT_DIR_NAME)
        if bundle:
            os.mkdir(join(mat_lib_dir, "textures"))
            copy_bundled_imgs(mat_assets, join(mat_lib_dir, "textures"))
            is_bundle = "bundle"
        else:
            shutil.copytree(mat_assets, join(assets_dir, MAT_DIR_NAME),
                    ignore=shutil.ignore_patterns("*.json", "*.bin"))
            is_bundle = "not_bundle"
        print("Changing texture paths in the material library (may take a while)")
        print_flush()
        script_path = join(_base_dir, "scripts", "blender",
                "cli_change_texture_paths.py")
        correct_texture_paths(script_path, blender_exec,
                join(blender_dir, MAT_DIR_NAME), is_bundle)

    print(GREEN + "Project created" + ENDCOL)

def correct_texture_paths(script, blender_exec, mat_dir, bundle):
    for list_elem in os.listdir(mat_dir):
        abs_path = join(mat_dir, list_elem)
        if os.path.isdir(abs_path):
            correct_texture_paths(script, blender_exec, abs_path, bundle)
        elif splitext(abs_path)[-1] == ".blend":
            print("  " + abs_path)
            print_flush()
            subprocess.check_output([blender_exec, "-b", abs_path, "-P",
                    script, "-o", bundle])

def copy_bundled_imgs(mat_dir, assets_dir):
    for list_elem in os.listdir(mat_dir):
        abs_path = join(mat_dir, list_elem)
        if os.path.isdir(abs_path):
            copy_bundled_imgs(abs_path, assets_dir)
        elif (splitext(abs_path)[-1] != ".json" and splitext(abs_path)[-1] != ".bin"):
            shutil.copy(abs_path, join(assets_dir, list_elem))

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
    -B, --bundle                 create bundle project: all project files will
                                 be placed into a single directory
    -A, --copy-app-templates     copy application templates into the project
                                 directories
    -S, --copy-scene-templates   copy scene templates into project directories
    -T, --title=NAME             project title (human readable name)
    -t, --engine-type=TYPE       specify b4w engine type: 'external',
                                 'copy', compile'
    -e, --assets-path            specify assets url
    -o, --optimization=TYPE      set JavaScript optimization type: 
                                 'whitespace', 'simple' or 'advanced'
    -h, --help                   show this help and exit""")

def copy_app_templates(proj_name, dev_dir, base_dir, src_dir, bundle, title):

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

    if bundle:
        tpl_js_file = join(tpl_dir, "app_bundle.js")
    else:
        tpl_js_file = join(tpl_dir, "app.js")
    tpl_js_file_obj = open(tpl_js_file, "r")
    tpl_js_str = tpl_js_file_obj.read()
    tpl_js_file_obj.close()

    html_insertions = dict(name=proj_name)

    out_js_str = string.Template(tpl_js_str).substitute(html_insertions)

    out_js_file_obj = open(out_js_file, 'w', encoding="utf-8")
    out_js_file_obj.writelines(out_js_str)
    out_js_file_obj.close()

    # CSS

    shutil.copyfile(join(tpl_dir, "app.css"), out_css_file)

    # HTML

    tpl_html_file = open(join(tpl_dir, "app.html"), "r")
    tpl_html_str = tpl_html_file.read()
    tpl_html_file.close()

    if bundle:
        scripts = "<script type=\"text/javascript\" src=\"b4w.min.js\"></script>"
    else:
        import mod_list
        scripts = mod_list.gen_code(mod_list.gen_module_list("../../src/", src_dir))

    if title == "":
        html_title = proj_name
    else:
        html_title = title

    html_insertions = dict(name=proj_name, title=html_title, scripts=scripts)

    out_html_str = string.Template(tpl_html_str).substitute(html_insertions)

    out_html_file_obj = open(out_html_file, 'w', encoding="utf-8")
    out_html_file_obj.writelines(out_html_str)
    out_html_file_obj.close()

def copy_scene_templates(proj_name, base_dir, blender_dir, assets_dir,
        blender_exec, engine_type):

    print("Copying scene template files into destination directories:")

    blend_tpl = join(base_dir, "scripts", "templates", "scene.blend")
    blend = join(blender_dir, proj_name + ".blend")

    if exists(blend):
        print("  file " + unix_path(relpath(blend, base_dir)) +
                " already exists")
        return
    else:
        print("  " + unix_path(relpath(blend, base_dir)))

    shutil.copyfile(blend_tpl, blend)

    if not shutil.which(blender_exec):
        print("  Blender executable is not found")
        print("  please export the scene manually")
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

    print_flush()

    subprocess.check_output([blender_exec, "-b", blend, "-P",
            reexporter, "--", saved_path])

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

def run_compile(args, dev_proj_path):
    proj_cfg = get_proj_cfg(dev_proj_path)
    default_build_dir = normpath(join(_base_dir, "deploy", "apps", basename(dev_proj_path)))
    conf_build_dir = proj_cfg_value(proj_cfg, "paths", "build_dir", default_build_dir)
    build_proj_path = sdk_rel_to_abs(conf_build_dir)

    conf_proj_name = proj_cfg_value(proj_cfg, "info", "name", "")

    if not conf_proj_name:
        help_compile("Required project name")
        sys.exit(1)

    proj_name = conf_proj_name

    conf_engine_type = proj_cfg_value(proj_cfg, "compile", "engine_type", DEFAULT_ENGINE_TYPE_OPT)
    engine_type = get_engine_type(conf_engine_type)

    conf_opt_level = proj_cfg_value(proj_cfg, "compile", "optimization", DEFAULT_JS_OPTIMIZATION_OPT)
    opt_level = get_opt_level(conf_opt_level)

    version = proj_cfg_value(proj_cfg, "compile", "version", "")

    use_physics = proj_cfg_value(proj_cfg, "compile", "use_physics", DEFAULT_PHYS_USING_OPT)
    use_smaa_textures = proj_cfg_value(proj_cfg, "compile", "use_smaa_textures", DEFAULT_SMAA_USING_OPT)

    apps = proj_cfg_value(proj_cfg, "compile", "apps", [])

    js_ignore = proj_cfg_value(proj_cfg, "compile", "js_ignore", [])
    css_ignore = proj_cfg_value(proj_cfg, "compile", "css_ignore", [])
    ignore = proj_cfg_value(proj_cfg, "compile", "ignore", [])

    try:
        opts, args = getopt.getopt(args,
                            "ht:o:a:v:j:c:i:fm",
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
                            "use-smaa-textures"
                            "use_smaa_textures"])
    except getopt.GetoptError as err:
        help_compile("Incorrect command line arguments")
        sys.exit(1)

    apps_tmp = []
    js_ignore_tmp = []
    css_ignore_tmp = []
    ignore_tmp = []

    # NOTE: underscores are only for compatibility, remove ASAP
    for o, a in opts:
        if o == "--engine-type" or o == "--engine_type" or o == "-t":
            engine_type = get_engine_type(a)
        elif o == "--optimization" or o == "-o":
            opt_level = get_opt_level(a)
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
        elif o == "--use-smaa-textures" or o == "--use_smaa_textures" or o == "-m":
            use_smaa_textures = a
        elif o == "--help" or o == "-h":
            help_compile()
            sys.exit(0)

    if len(ignore_tmp):
        ignore = ignore_tmp

    ignore.extend(COMP_DEPL_IGNORE)

    if not engine_type:
        if exists(build_proj_path):
            shutil.rmtree(build_proj_path)

        shutil.copytree(dev_proj_path, build_proj_path,
                ignore=shutil.ignore_patterns(*ignore))

        print(GREEN + "Project building finished" + ENDCOL)

        return

    if engine_type in ["WEBPLAYER_JSON", "WEBPLAYER_HTML"]:
        help_compile("Compile option not available")
        sys.exit(1)

    if engine_type in ["COMPILE", "EXTERNAL", "COPY"] and not _java_exec:
        help_compile("Project's engine type requires Java")
        sys.exit(1)

    if len(apps_tmp):
        apps = apps_tmp

    if not len(apps):
        apps = list(Path(dev_proj_path).rglob("*.html"))
    else:
        apps = [Path(app) for app in apps]

    check_proj_struct(dev_proj_path, apps)

    if len(js_ignore_tmp):
        js_ignore = js_ignore_tmp

    if len(css_ignore_tmp):
        css_ignore = css_ignore_tmp

    for i in ignore:
        apps = list(filter(lambda app: not app.as_posix().startswith(normpath(join(dev_proj_path, i))), apps))

    global _js_cc_params
    _js_cc_params.append("--compilation_level=" + opt_level)
    params = {
        "build_proj_path":   build_proj_path,
        "css_ignore":        css_ignore,
        "dev_proj_path":     dev_proj_path,
        "engine_type":       engine_type,
        "ignore":            ignore,
        "js_ignore":         js_ignore,
        "opt_level":         opt_level,
        "proj_name":         proj_name,
        "remove_exist_dir":  True,
        "use_physics":       use_physics,
        "use_smaa_textures": use_smaa_textures,
        "version":           version
    }

    print(GREEN + "Building project" + ENDCOL + ": " + BLUE + proj_name + ENDCOL)

    for n, app in enumerate(apps):
        if n > 0:
            params["remove_exist_dir"] = False

        compile_app(app, **params)

    for f in _temporary_files:
        if exists(f):
            os.remove(f)

    print(GREEN + "Project building finished" + ENDCOL)

def get_engine_type(option_str):
    """
    Get engine type string from config/command line option
    """
    if option_str == "copy":
        return "COPY"
    elif option_str == "compile":
        return "COMPILE"
    elif option_str == "external":
        return "EXTERNAL"
    elif option_str == "wp_json":
        return "WEBPLAYER_JSON"
    elif option_str == "wp_html":
        return "WEBPLAYER_HTML"
    elif not option_str or option_str == "none":
        return ""
    else:
        help_compile("Incorrect engine type option")
        sys.exit(1)

def get_opt_level(option_str):
    """
    Get optimization level string from config/command line option
    """
    if option_str == "simple":
        return "SIMPLE_OPTIMIZATIONS"
    elif option_str == "advanced":
        return "ADVANCED_OPTIMIZATIONS"
    elif option_str == "whitespace":
        return "WHITESPACE_ONLY"
    else:
        help_compile("Incorrect optimization option")
        sys.exit(1)

def check_proj_struct(dev_proj_path, apps):
    """
    Checks project structure.
    """
    if not len(apps):
        help_compile("Project must contain only one HTML file in the root directory")
        sys.exit(1)

    for app in apps:
        if not isfile(join(dev_proj_path, str(app))):
            help_compile(app.name + " HTML file does not exist")
            sys.exit(1)

    files = []

    for path, paths, filenames in os.walk(dev_proj_path):
        for f in filenames:
            files.append(join(path, f))

    html_files = list(filter(lambda f: f.split('.')[-1] == 'html', files))

    for app in apps:
        if not normpath(join(dev_proj_path, str(app))) in files:
            help_compile("Main HTML file must be in the root directory")
            sys.exit(1)

def compile_app(app, **kwargs):
    dev_proj_path     = kwargs["dev_proj_path"]
    build_proj_path   = kwargs["build_proj_path"]
    engine_type       = kwargs["engine_type"]
    opt_level         = kwargs["opt_level"]
    use_physics       = kwargs["use_physics"]
    use_smaa_textures = kwargs["use_smaa_textures"]

    if kwargs["remove_exist_dir"]:
        if exists(build_proj_path):
            shutil.rmtree(build_proj_path)
        shutil.copytree(dev_proj_path, build_proj_path,
                ignore=shutil.ignore_patterns(*kwargs["ignore"]))

    build_proj_path_obj = Path(build_proj_path)

    html_file  = join(build_proj_path, app.name)
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

        if not css_dir in css_pos or css_pos[css_dir] > css["start_pos"][0]:
            css_pos[css_dir] = css["start_pos"][0]

    cur_mods_dict = list(filter(lambda x: dirname(normpath(join(dev_proj_path, x["src"]))).startswith(_src_dir), parser.js))

    engine_pos = cur_mods_dict[0]["start_pos"][0]

    cur_js_dict = list(filter(lambda x: not dirname(normpath(join(dev_proj_path, x["src"]))).startswith(_src_dir), parser.js))

    for js in filter(lambda x: not "no_compile" in x, cur_js_dict):
        js_dir = normpath(dirname(js["src"]))

        if not js_dir in js_pos or js_pos[js_dir] > js["start_pos"][0]:
            js_pos[js_dir] = js["start_pos"][0]

    remove_mods_from_html(html_file, parser.js)
    remove_mods_from_html(html_file, parser.css, True)

    css_files = list(build_proj_path_obj.rglob('*.css'))
    css_paths = exist_css(parser.css, css_files, build_proj_path)

    if len(css_paths):
        compile_css(css_paths, app.stem)

    js_files = list(build_proj_path_obj.rglob('*.js'))
    js_paths = exist_js(parser.js, js_files, build_proj_path)

    if len(js_paths):
        compile_js(js_paths, app.stem, opt_level, engine_type)

    params = {
        "app":               app,
        "build_proj_path":   build_proj_path,
        "css_paths":         css_paths,
        "engine_type":       engine_type,
        "js_paths":          js_paths,
        "html_file":         html_file,
        "parser":            parser,
        "js_pos":            js_pos,
        "css_pos":           css_pos,
        "engine_pos":        engine_pos,
        "use_physics":       use_physics,
        "use_smaa_textures": use_smaa_textures,
        "opt_level":         opt_level,
        "version":           kwargs["version"]
    }

    compile_html(**params)

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

def compile_html(**kwargs):
    parser   = kwargs["parser"]

    app                = kwargs["app"]
    build_proj_path    = kwargs["build_proj_path"]
    css_paths          = kwargs["css_paths"]
    engine_type        = kwargs["engine_type"]
    engine_pos         = kwargs["engine_pos"]
    js_paths           = kwargs["js_paths"]
    out_html_file_path = kwargs["html_file"]
    css_pos            = kwargs["css_pos"]
    js_pos             = kwargs["js_pos"]
    opt_level          = kwargs["opt_level"]
    use_physics        = kwargs["use_physics"]
    use_smaa_textures  = kwargs["use_smaa_textures"]

    suffix = ""

    if kwargs["version"]:
        suffix = "?v=" + kwargs["version"]

    print_wrapper(out_html_file_path)

    if opt_level == "ADVANCED_OPTIMIZATIONS":
        engine_file_name = ENGINE_ADV_FILE_NAME
    elif opt_level == "SIMPLE_OPTIMIZATIONS":
        engine_file_name = ENGINE_SIM_FILE_NAME
    elif opt_level == "WHITESPACE_ONLY":
        engine_file_name = ENGINE_WHITE_FILE_NAME

    engine_path = normpath(join(_engine_dir, engine_file_name))
    engine_src  = False

    if engine_type != "EXTERNAL":
        if use_physics:
            copy_phys_to_proj_path(build_proj_path);

        if use_smaa_textures:
            copy_smaa_to_proj_path(build_proj_path);

        if engine_type == "COPY":
            engine_src = engine_file_name
            new_engine_path = normpath(join(build_proj_path, engine_file_name))
            shutil.copyfile(engine_path, new_engine_path)

        if engine_type in ["COMPILE", "COPY"]:
            assets_rel_path = relpath(join(_base_dir, "deploy", "assets"), build_proj_path)
            change_assets_path(build_proj_path, assets_rel_path)
    else:
        engine_src = join(relpath(_engine_dir, build_proj_path), engine_file_name)

    css_strs = {}

    for parent in css_paths:
        rel = relpath(parent, start=build_proj_path)

        css_strs[str(css_pos[rel])] = \
            "<link type='text/css' rel='stylesheet' href='" + \
            unix_path(normpath(join(rel, app.stem))) + \
            ".min.css" + suffix + "'/>"

    engine_str = ""

    if engine_src:
        engine_str =\
            "<script type='text/javascript' src='" +\
            unix_path(engine_src) + suffix + "'></script>"

    js_strs = {}

    for parent in js_paths:
        rel = relpath(parent, start=build_proj_path)

        js_strs[str(js_pos[rel])] = \
            "<script type='text/javascript' src='" +\
            unix_path(normpath(join(rel, app.stem))) + ".min.js" + suffix + "'></script>"

    html_file = open(out_html_file_path, encoding="utf-8")
    src_text = html_file.readlines()
    html_file.seek(0)
    html_file.close()
    tmp = []

    for i, line in enumerate(src_text, start=2):
        tmp.append(line)

        if i == engine_pos:
            tmp.extend(engine_str)
        elif str(i) in css_strs:
            tmp.extend(css_strs[str(i)])
        elif str(i) in js_strs:
            tmp.extend(js_strs[str(i)])

    html_file = open(out_html_file_path, 'w', encoding="utf-8")
    html_file.writelines(tmp)
    html_file.close()

def copy_smaa_to_proj_path(proj_path):
    shutil.copy(join(_engine_dir, SMAA_FILE_NAME_AREA), proj_path)
    shutil.copy(join(_engine_dir, SMAA_FILE_NAME_SEARCH), proj_path)

def copy_phys_to_proj_path(proj_path):
    shutil.copy(join(_engine_dir, URANIUM_FILE_NAME), proj_path)
    shutil.copy(join(_engine_dir, URANIUM_FILE_NAME_BIN), proj_path)

def change_assets_path(new_engine_path, assets_path_prefix):
    """
    Modifies path for assets in standalone application.
    """
    # export_proj_path
    proj_path_obj = Path(normpath(new_engine_path))
    js_files = list(proj_path_obj.rglob('*.js'))

    for js_file in js_files:
        engine_file = open(str(js_file), "r")
        file_data = engine_file.read()
        engine_file.close()

        if not re.match("^(((.*?)\/\/)|(\/))", assets_path_prefix):
            assets_path_prefix = unix_path(assets_path_prefix)

        new_data = re.sub("(\"|\')(B4W_ASSETS_PATH=)(?!\'|\")(.*?)(\"|\')", "\\1\\2" + assets_path_prefix + "/\\4", file_data)

        engine_file = open(str(js_file), "w")
        engine_file.write(new_data)
        engine_file.close()

def change_b4w_path(new_app_dir):
    """
    Modifies path to engine in the standalone application.
    """
    new_app_dir_obj = Path(normpath(new_app_dir))
    html_paths = list(new_app_dir_obj.rglob('*.html'))

    for html_path in html_paths:
        html_file = open(str(html_path), "r")
        file_data = html_file.read()
        html_file.close()

        new_path = unix_path(relpath(join(new_app_dir, "common"),
                dirname(str(html_path))))

        new_data = re.sub("(src\s*=')([\w/.]*)(b4w.[\w.]*min.js)", "\\1" +
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

        print_wrapper(output_css_path)

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

        f = open(abs_path, encoding = "utf-8")
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

def compile_js(js_paths, file_name, opt_level, engine_type):
    # engine compiler path
    ENGINE_CP = [sys.executable,
            normpath(join(_base_dir, "scripts", "compile_b4w.py"))]

    # closure compiler externs
    if opt_level == "ADVANCED_OPTIMIZATIONS":
        EXTERNS = [normpath(join(_cc_dir, "extern_modules.js")),
                   normpath(join(_cc_dir, "extern_jquery-1.9.js")),
                   normpath(join(_cc_dir, "w3c_dom1.js")),
                   normpath(join(_cc_dir, "extern_fullscreen.js")),
                   normpath(join(_cc_dir, "extern_gl-matrix.js")),
                   normpath(join(_cc_dir, "extern_pointerlock.js"))]

    for parent in js_paths:
        if engine_type == "COMPILE":
            ENGINE_CP.extend(["--external-js=" + join(_src_dir, "b4w.js")])
            ENGINE_CP.extend(["--external-js=" +
                              i for i in get_used_modules(js_paths[parent])])
            ENGINE_CP.extend(["--external-js=" + i for i in js_paths[parent]])
            ENGINE_CP.extend(["-d", join(parent, file_name + ".min.js")])

            if opt_level == "ADVANCED_OPTIMIZATIONS":
                ENGINE_CP.append("--optimization=advanced")
            elif opt_level == "WHITESPACE_ONLY":
                ENGINE_CP.append("--optimization=whitespace")

            proc = subprocess.Popen(ENGINE_CP, stdout=subprocess.PIPE, 
                    stderr=subprocess.STDOUT, universal_newlines=True)

            print_flush()

            print(proc.communicate()[0])
        else:
            prepared_src_js = ["--js=" + x for x in js_paths[parent]]

            output_js_path = join(parent, file_name + ".min.js")

            js_adv_params = list.copy(_js_cc_params)

            externs_gen_file = None

            if opt_level == "ADVANCED_OPTIMIZATIONS":
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

            js_adv_params.extend(prepared_src_js)
            js_adv_params.append(
                "--js_output_file=" + output_js_path)

            print_wrapper(output_js_path)

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
        f = open(js_file)
        string = f.read()
        f.close()

        modules.extend(re.findall(pattern_1, string))

        for path in paths:
            for f in paths[path]:
                with open(join(path, f)) as ff:
                    text = ff.read()
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

    reserved_mods.append(module_names[module])

    with open(module_names[module]) as parent_module:
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

def help_compile(err=""):
    if err:
        help_print_err(err, "build")
    else:
        print("""\
Usage: project.py [-p|--project PROJECT] build [OPTION]...
Build the project's application(s).

Options:
    -a, --app=APP             specify source application html file
    -c, --css-ignore          skip css file
    -j, --js-ignore           skip js file
    -i, --ignore              skip any file
    -o, --optimization=TYPE   set javaScript optimization type
    -t, --engine-type=TYPE    specify b4w engine type (external, copy, compile)
    -v, --version             add version to js and css urls
    -h, --help                show this help and exit""")

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
        print("Resizing textures")
        print_flush()
        subprocess.check_call([python_path, conv_path, "-d", assets_dir, "resize_textures"])
        print("Compressing textures")
        print_flush()
        subprocess.check_call([python_path, conv_path, "-d", assets_dir, "convert_dds"])
        print("Converting media files")
        print_flush()
        subprocess.check_call([python_path, conv_path, "-d", assets_dir, "convert_media"])

    print(GREEN + "Project resources converted" + ENDCOL)

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
        help_deploy("Build project directory does not exist")
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

    shutil.copytree(build_proj_path, deploy_abs_path,
            ignore=shutil.ignore_patterns(*ignore))
    for assets_dir in assets_dirs:
        if exists(assets_dir) and assets_dir != build_proj_path:
            shutil.copytree(assets_dir, join(deploy_abs_path, assets_path_dest,
                    relpath(assets_dir, join(_base_dir, "deploy", "assets"))))
        else:
            assets_path_prefix = ""

    if engine_type == "external":
        common_path = normpath(join(_base_dir, "deploy", "apps", "common"))
        # TODO: copy files according to project configuration
        shutil.copytree(common_path, join(deploy_abs_path, "common"))
        change_b4w_path(deploy_abs_path)
        assets_path_prefix = join("..", assets_path_prefix)
    elif engine_type == "webplayer_json":
        webplayer_path = normpath(join(_base_dir, "deploy", "apps", "webplayer"))

        for f in glob.glob(join(webplayer_path, '*.*')):
            shutil.copy(f, deploy_abs_path)

    change_assets_path(deploy_abs_path, assets_path_prefix)

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
    -t, --engine-type=TYPE  override project's engine type config
                            (external, copy, compile)
    -h, --help              display this help and exit""")

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
        z = zipfile.ZipFile(input_base_path, "r")
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

    print(GREEN + "Project imported" + ENDCOL)

def check_sdk_base_dir(path):
    """Check SDK or Project Bundle directory"""

    params = get_sdk_ver_params(path)

    if params[0] == "Blend4Web":
        return True
    else:
        return False

def get_sdk_ver_params(path):
    ver_file_path = join(path, "VERSION")

    with open(ver_file_path) as f:
        lines = f.readlines()

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

    proj_names = args

    proj_list = find_proj_list(_base_dir)

    for proj_path in proj_list:

        proj_cfg = get_proj_cfg(proj_path)
        proj_name = proj_cfg_value(proj_cfg, "info", "name", basename(proj_path))

        if not proj_name in proj_names:
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

        with open(ver_path_dst, "w") as f:
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

    if not len(apps):
        apps = list(Path(proj_path).rglob("*.html"))
    else:
        apps = [Path(app) for app in apps]

    ignore = [normpath(join(proj_path, i)) for i in ignore]

    apps = list(filter(lambda app: not app.as_posix() in ignore, apps))

    check_proj_struct(proj_path, apps)

    from mod_list import gen_module_list

    src_modules = gen_module_list(_src_dir, _src_dir)

    engine_type = proj_cfg_value(proj_cfg, "compile", "engine_type", "external")

    if not engine_type in ["external", "compile", "copy"]:
        help("Incorrect engine type; use 'external', 'copy' or 'compile'")
        sys.exit(1)

    for app in apps:
        used = []
        unused = []
        parser = HTMLProcessor()
        src_file = open(normpath(join(proj_path, app.as_posix())), encoding="utf-8")
        src_text = src_file.read()
        src_file.seek(0)
        src_file.close()
        parser.feed(src_text)
        mods = list(filter(lambda x: normpath(join(proj_path,x["src"])).startswith(_src_dir), parser.js))

        used.extend(list(set(src_modules) -
                         set([normpath(join(proj_path, x["src"])) for x in mods])))

        unused.extend(list(set([normpath(join(proj_path, x["src"])) for x in mods]) -
                           set(src_modules)))

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

    if not len(apps):
        apps = list(Path(proj_path).rglob("*.html"))
    else:
        apps = [Path(app) for app in apps]

    ignore = [normpath(join(proj_path, i)) for i in ignore]

    apps = list(filter(lambda app: not app.as_posix() in ignore, apps))

    check_proj_struct(proj_path, apps)

    from mod_list import gen_module_list

    src_modules = gen_module_list(relpath(_src_dir, proj_path), _src_dir)
    src_modules_obj = [Path(normpath(module)) for module in src_modules]

    engine_type = proj_cfg_value(proj_cfg, "compile", "engine_type", "external")

    # check right engine type
    if not engine_type in ["external", "compile", "copy"]:
        help("Incorrect engine type; use 'external', 'copy' or 'compile'")
        sys.exit(1)

    for app in apps:
        # current html file js with meta info (like start_pos, end_pos)
        cur_js_dict = get_cur_js_dict(normpath(join(proj_path, app.as_posix())))

        # current html file modules with meta info (like start_pos, end_pos)
        cur_mods_dict = list(filter(lambda x: dirname(normpath(join(proj_path, x["src"]))).startswith(_src_dir), cur_js_dict))

        # remove all src modules from html file
        remove_mods_from_html(normpath(join(proj_path, app.as_posix())), cur_mods_dict)

        # get first line for srs sripts
        first_line = get_first_js_line(cur_mods_dict, normpath(join(proj_path, app.as_posix())))

        # insert right src modules
        insert_src_modules(normpath(join(proj_path, app.as_posix())), src_modules, first_line)

    print(GREEN, "Update complete.")

def get_cur_js_dict(html_file_obj):
    parser = HTMLProcessor()
    src_file = open(html_file_obj, encoding="utf-8")
    src_text = src_file.read()
    src_file.seek(0)
    src_file.close()
    parser.feed(src_text)

    return parser.js

def remove_mods_from_html(html_file_obj, cur_mods_dict, css=False):
    indent = 9

    if css:
        indent = 0

    html_file = open(html_file_obj, encoding="utf-8")
    src_text = html_file.readlines()
    html_file.seek(0)
    html_file.close()
    tmp = []

    for i, line in enumerate(src_text):
        exist = False

        for cur_mod_dict in cur_mods_dict:
            if cur_mod_dict["start_pos"][0] == i + 1 and not "no_compile" in cur_mod_dict:
                exist = True
                new_line = line.replace(line[cur_mod_dict["start_pos"][1]:
                                             cur_mod_dict["end_pos"][1] + indent], "")
                tmp.append(new_line)

                break

        if not exist:
            tmp.append(line)

    html_file = open(html_file_obj, 'w', encoding="utf-8")
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
        parser.head[0]["end_pos"][0]
    except:
        help_export("HTML valid error. HTML must contain head tag.")
        sys.exit(1)

    return parser.head[0]["end_pos"][0]

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

    html_file = open(html_file_obj, 'w', encoding="utf-8")
    html_file.writelines(tmp)
    html_file.close()
