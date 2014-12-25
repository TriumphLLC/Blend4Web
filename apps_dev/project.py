#!/usr/bin/python3

import os, subprocess, shutil, getopt, sys

from pathlib import Path
from html.parser import HTMLParser


_os_norm = os.path.normpath
_os_join = os.path.join

GREEN  = '\033[92m'
RED    = "\033[91m"
YELLOW = "\033[93m"
ENDCOL = "\033[0m"

BASE_DIR      = _os_norm(os.path.abspath(os.path.dirname(__file__)))

SRC_PATH      = _os_norm(_os_join(BASE_DIR, "..", "src"))

GLOBALS_PATH  = _os_norm(_os_join(BASE_DIR, "..", "external",
                                  "deploy", "globals_detect"))

CP_EXT_PATH   = _os_join(BASE_DIR, "..", "tools", "closure-compiler")

JS_CP_PATH    = _os_norm(_os_join(CP_EXT_PATH, "compiler.jar"))

CSS_CP_PATH   = _os_norm(_os_join(
                BASE_DIR, "..", "tools", "yuicompressor", "yuicompressor.jar"))

JS_CP_PARAMS  = ["java",
                 "-jar",
                 JS_CP_PATH,
                 "--language_in=ECMASCRIPT5"]

CSS_CP_PARAMS = ["java",
                 "-jar",
                 CSS_CP_PATH]

EXTERNS       = [_os_norm(_os_join(CP_EXT_PATH, "extern_modules.js")),
                 _os_norm(_os_join(CP_EXT_PATH, "extern_jquery-1.9.js")),
                 _os_norm(_os_join(CP_EXT_PATH, "extern_globals.js")),
                 _os_norm(_os_join(CP_EXT_PATH, "extern_fullscreen.js")),
                 _os_norm(_os_join(CP_EXT_PATH, "extern_gl-matrix.js")),
                 _os_norm(_os_join(CP_EXT_PATH, "extern_pointerlock.js"))]

_apps_path    = _os_norm(_os_join(BASE_DIR, "..", "external",
                                  "deploy", "apps"))


class HTMLProcessor(HTMLParser):
    def __init__(self, app_path, app_path_name):
        HTMLParser.__init__(self)

        self.js = []
        self.ext_js = []
        self.css = []
        self.meta = []
        self.start_body = 0
        self.end_body = 0
        self.app_path = app_path
        self.app_path_name = app_path_name
        self.meta_list = []
        self.title = []
        self.is_title = False

    def handle_endtag(self, tag):
        if tag == "body":
            self.end_body = self.getpos()

        if tag == "title":
            self.is_title = False

    def handle_starttag(self, tag, attrs):
        if tag == "body":
            self.start_body = self.getpos()

        if tag == "script":
            for attr in attrs:
                if attr[0] == "src":
                    if (attr[1].startswith("https://") or
                        attr[1].startswith("http://") or
                        attr[1].startswith("//")):
                        self.ext_js.append(attr[1])

                    self.js.append(_os_norm(attr[1]))

        if tag == "link":
            for attr in attrs:
                if attr[0] == "href":
                    self.css.append(_os_norm(attr[1]))

        if tag == "meta":
            self.meta_list.append(attrs)

        if tag == "title":
            self.is_title = True

    def handle_data(self, data):
        if self.is_title:
            self.title = data


def run():
    check_sdk_resources()

    try:
        opts, args = getopt.getopt(sys.argv[1:],
                            "hb:o:a:d:s:",
                           ["help",
                            "b4w=",
                            "optimization=",
                            "app=",
                            "dir=",
                            "assets="])
    except getopt.GetoptError as err:
        sys.exit(1)

    if not len(opts):
        help("You must specify '-a' or '-app' option")
        sys.exit(1)

    opt_level   = "SIMPLE"
    app_name    = False
    engine_type = False
    ext_path    = False
    only_copy   = False

    global _apps_path

    assets_paths = []

    for o, a in opts:
        if o == "--b4w" or o == "-b":
            if a == "copy":
                engine_type = "COPY"
            elif a == "combine":
                engine_type = "COMBINE"
            elif a == "compile":
                engine_type = "COMPILE"
        elif o == "--optimization" or o == "-o":
            if a == "advanced":
                opt_level = "ADVANCED"
        elif o == "--app" or o == "-a":
            app_name = a
        elif o == "--assets" or o == "-s":
            assets_paths.append(a)
        elif o == "--dir" or o == "-d":
            _apps_path = a
            ext_path = True
            only_copy = True
        elif o == "--help" or o == "-h":
            help()
            sys.exit(0)

    if not engine_type and only_copy:
        help("You must choose 'COPY' or 'COMBINE' args for -b option, " +
             "if you're going build standalone app")
        sys.exit(0)

    if not app_name:
        help("You must specify '-a' or '-app'")
        sys.exit(0)

    app_path = _os_join(BASE_DIR, app_name)

    if not os.path.exists(app_path):
        help("Application folder does not exist")
        sys.exit(0)

    if not ext_path and len(assets_paths):
        help("You can use '-s' option only with '-d' option")
        sys.exit(0)

    check_app_struct(app_path)

    JS_CP_PARAMS.append("--compilation_level=" + opt_level + "_OPTIMIZATIONS")

    compile_app(app_name, engine_type, opt_level, assets_paths, ext_path)


def check_sdk_resources():
    """
    Checks required resourses in SDK and their paths.
    """
    msg = "SDK structure is damaged"

    if os.path.basename(BASE_DIR) != "apps_dev":
        help(msg)
        sys.exit(0)

    if not os.path.isdir(SRC_PATH):
        help(msg)
        sys.exit(0)


def check_app_struct(app_path):
    """
    Checks application structure.
    """
    app_path_obj = Path(app_path)
    html_files = list(app_path_obj.rglob('*.html'))
    in_root = False

    if not len(html_files):
        help("Main HTML file does not exist")
        sys.exit(0)

    for html_file in html_files:
        if str(html_file.parent) == app_path:
            if not in_root:
                in_root = True
            else:
                help("Application must \
                      contain only one HTML file in the root directory")
                sys.exit(0)

    if not in_root:
        help("Main HTML file must be in the root directory")
        sys.exit(0)


def compile_app(app_path, engine_type, opt_level, assets_paths, ext_path):
    app_path_obj = Path(app_path)
    app_path_name = app_path_obj.parts[-1]

    new_app_path = _os_norm(_os_join(_apps_path, app_path_name))

    if os.path.exists(new_app_path):
        if ext_path:
            help("External path already exist")
            sys.exit(0)

        shutil.rmtree(new_app_path)

    shutil.copytree(app_path, new_app_path)

    if ext_path and len(assets_paths):
        for assets_path in assets_paths:
            if os.path.exists(assets_path):
                shutil.copytree(assets_path,
                                new_app_path +
                                "/assets/" +
                                os.path.basename(_os_norm(assets_path)))

    new_app_path_obj = Path(new_app_path)

    html_files = list(new_app_path_obj.rglob('*.html'))

    html_file = str([f for f in html_files
                                if str(f.parent) == new_app_path][0])

    parser, src_lines = parse_html_file(new_app_path, html_file, app_path_name)
    new_body_lines = parse_body(parser.start_body, parser.end_body, src_lines)

    css_files = list(new_app_path_obj.rglob('*.css'))
    css_paths = exist_files(parser.css,
                                         css_files,
                                         app_path_name)
    out_css_file_path = _os_norm(_os_join(
                                     new_app_path, app_path_name + ".min.css"))

    if len(css_paths):
        compile_css(css_paths, app_path_name)

    js_files = list(new_app_path_obj.rglob('*.js'))

    js_paths = exist_files(parser.js,
                                       js_files,
                                       app_path_name)
    out_js_file_path = _os_norm(_os_join(
                                    new_app_path, app_path_name + ".min.js"))

    if len(js_paths):
        compile_js(js_paths, app_path_name, opt_level)

    compile_html(app_path_name, css_paths, js_paths, new_body_lines,
                 parser, engine_type, new_app_path, ext_path)


def parse_html_file(new_app_path, html_file, app_path_name):
    parser = HTMLProcessor(new_app_path, app_path_name)
    src_file = open(html_file)
    src_text = src_file.read()
    src_file.seek(0)
    src_lines = src_file.readlines()
    src_file.close()

    os.remove(html_file)

    parser.feed(src_text)

    if not parser.start_body:
        help("HTML file not valid")
        sys.exit(0)

    return parser, src_lines


def parse_body(start_body, end_body, src_lines):
    first_line = src_lines[start_body[0] - 1][start_body[1]:]
    last_line = src_lines[end_body[0] - 1][:end_body[1]] + "</body>"

    new_body_lines = []
    new_body_lines.append(first_line)
    new_body_lines.extend(src_lines[start_body[0]:end_body[0] - 1])
    new_body_lines.append(last_line)

    return new_body_lines


def compile_html(app_path_name, css_paths, js_paths, body_lines,
                 parser, engine_type, new_app_path, ext_path):
    meta = parser.meta_list
    title = parser.title

    out_html_file_path = _os_norm(_os_join(
                                     new_app_path, app_path_name + ".html"))

    print(GREEN + "Compiling :", out_html_file_path + ENDCOL)

    html_file = open(out_html_file_path, 'w')

    inner_text = []
    inner_text.append("<!DOCTYPE html>\n<head>")

    if meta:
        meta_item = ""

        for item in meta:
            meta_item += "\n    <meta "

            for i in item:
                meta_item += i[0] + "=" + "'" + i[1] + "' "

            meta_item += "/>"

        inner_text.append(meta_item)

    title_text = app_path_name

    if title:
        title_text = title

    engine_src = "../common/b4w.full.min.js"

    if engine_type:
        engine_path = _os_norm(
                        _os_join(
                            BASE_DIR,
                            "..", "external", "deploy", "apps",
                            "common", "b4w.full.min.js"))

        smaa_area_path = _os_norm(
                _os_join(
                     BASE_DIR,
                     "..", "external", "deploy", "apps",
                     "common", "smaa_area_texture.png"))

        shutil.copyfile(smaa_area_path, _os_norm(_os_join(
                                    new_app_path , "smaa_area_texture.png")))

        smaa_search_path = _os_norm(
                _os_join(
                     BASE_DIR,
                     "..", "external", "deploy", "apps",
                     "common", "smaa_search_texture.png"))

        shutil.copyfile(smaa_search_path, _os_norm(_os_join(
                                    new_app_path, "smaa_search_texture.png")))

        phys_path = _os_norm(
                        _os_join(
                            BASE_DIR,
                            "..", "external", "deploy", "apps",
                            "common", "uranium.js"))

        shutil.copyfile(phys_path, _os_norm(_os_join(
                                    new_app_path, "uranium.js")))

        if engine_type == "COPY":
            engine_src = "b4w.full.min.js"
            new_engine_path = _os_norm(_os_join(new_app_path, "b4w.full.min.js"))
            shutil.copyfile(engine_path, new_engine_path)

            change_assets_path(ext_path, new_engine_path)

        if engine_type == "COMBINE" or engine_type == "COMPILE":
            engine_src = False

            temp_js_path = _os_norm(_os_join(
                                    new_app_path, app_path_name + "_temp.js"))
            js_path = _os_norm(_os_join(
                                    new_app_path, app_path_name + ".min.js"))

            new_engine_path = _os_norm(_os_join(new_app_path, "b4w.full.min.js"))
            shutil.copyfile(engine_path, new_engine_path)

            change_assets_path(ext_path, new_engine_path)

            with open(temp_js_path, 'wb') as temp_js:
                    with open(new_engine_path,'rb') as f:
                        shutil.copyfileobj(f, temp_js, 1024*1024*10)
                    with open(js_path, 'rb') as f:
                        shutil.copyfileobj(f, temp_js, 1024*1024*10)

            os.remove(js_path)
            os.rename(temp_js_path, js_path)
            os.remove(new_engine_path)

    inner_text.append(
        "\n    <title>" + title_text + "</title>")

    for parent in css_paths:
        rel = os.path.relpath(parent, start=new_app_path)

        inner_text.append(
            "\n    <link type='text/css' rel='stylesheet' href='" +
            _os_norm(_os_join(rel, app_path_name)) +
            ".min.css'/>")

    if engine_src:
        inner_text.append(
            "\n    <script type='text/javascript' src='" +
            engine_src + "'></script>")

    for parent in js_paths:
        rel = os.path.relpath(parent, start=new_app_path)

        inner_text.append(
            "\n    <script type='text/javascript' src='" +
            _os_norm(_os_join(rel, app_path_name)) + ".min.js'></script>")

    for js in parser.ext_js:
        inner_text.append(
            "\n    <script type='text/javascript' src='" + js + "'></script>")

    inner_text.append("\n</head>")
    inner_text.extend(body_lines)
    inner_text.append("\n</html>")

    html_file.writelines(inner_text)

    html_file.close()


def change_assets_path(ext_path, new_engine_path):
    """
    Modifies path for assets in standalone application.
    """
    if ext_path:
        engine_file = open(new_engine_path, "r")
        file_data = engine_file.read()
        engine_file.close()
        new_data = file_data.replace("ASSETS=../../assets/",
                                     "ASSETS=assets/")

        engine_file = open(new_engine_path, "w")
        engine_file.write(new_data)
        engine_file.close()


def compile_css(css_paths, file_name):
    for parent in css_paths:
        with open(_os_norm(_os_join(parent, 'temp_css.css')),'wb') as temp_css:
            for filename in css_paths[parent]:
                with open(filename,'rb') as f:
                    shutil.copyfileobj(f, temp_css, 1024*1024*10)

        output_css_path = _os_join(parent, file_name + ".min.css")
        temp_css_path = _os_norm(_os_join(parent, "temp_css.css"))

        css_adv_params = list.copy(CSS_CP_PARAMS)
        css_adv_params.append(temp_css_path)
        css_adv_params.append("-o")
        css_adv_params.append(output_css_path)

        print(GREEN + "Compiling :", output_css_path + ENDCOL)

        subprocess.call(css_adv_params)

        for css in css_paths[parent]:
            os.remove(css)

        os.remove(temp_css_path)


def compile_js(js_paths, file_name, opt_level):
    for parent in js_paths:
        prepared_src_js = ["--js=" + x for x in js_paths[parent]]

        output_js_path = _os_join(parent, file_name + ".min.js")

        js_adv_params = list.copy(JS_CP_PARAMS)

        if opt_level == "ADVANCED":
            prepared_src_ext = ["--externs=" + _os_join(BASE_DIR, x)
                                           for x in EXTERNS]
            js_adv_params.extend(prepared_src_ext)

        js_adv_params.extend(prepared_src_js)
        js_adv_params.append(
            "--js_output_file=" + output_js_path)

        print(GREEN + "Compiling :", output_js_path + ENDCOL)

        subprocess.call(js_adv_params)

        for js in js_paths[parent]:
            os.remove(js)


def exist_files(included_files, files, app_path_name):
    """
    Checks files are included in html and exists in application directory.
    """
    processed_files = {}
    extern_files = []

    src_path_obj = Path(SRC_PATH)
    src_obj_files = list(src_path_obj.rglob('*.js'))
    src_file_paths = [str(x) for x in src_obj_files]

    file_paths = [str(x) for x in files]

    for item in included_files:
        for item_file in files:
            if _os_norm(
                _os_join(_apps_path,
                        app_path_name, item)) == _os_norm(str(item_file)):

                parent = str(item_file.parent)

                if parent in processed_files:
                    processed_files[parent].append(
                        _os_norm(
                            _os_join(_apps_path, app_path_name, item)))
                else:
                    processed_files[parent] = [_os_norm(
                        _os_join(_apps_path, app_path_name, item))]
                break

    return processed_files


def help(err=""):
    if err:
        print("project.py: ", RED + err + ENDCOL)
        print("Try './project.py --help' for more information.")
    else:
        print("Arguments:")
        print("    -a, --app=APP              \
            application directory name")
        print("    -o, --optimization=TYPE    \
            javaScript optimization type: 'simple' or 'advanced'")
        print("    -b, --b4w                  \
            copy b4w engine into application direcotory")
        print("    -d, --dir                  \
            choose application directory")
        print("    -s, --assets                  \
            choose assets directory")
        print("    -h, --help                 \
            give this help list")

if __name__ == "__main__":
    run()
