#!/usr/bin/env python3

import os, subprocess, shutil, getopt, sys, re

from pathlib import Path
from html.parser import HTMLParser


_os_norm = os.path.normpath
_os_join = os.path.join

GREEN   = '\033[92m'
BLUE    = '\033[94m'
RED     = "\033[91m"
YELLOW  = "\033[93m"
ENDCOL  = "\033[0m"

BASE_DIR      = _os_norm(os.path.abspath(os.path.dirname(__file__)))

SRC_PATH      = _os_norm(_os_join(BASE_DIR, "..", "src"))

GLOBALS_PATH  = _os_norm(_os_join(BASE_DIR, "..",
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

ENGINE_CP     = ["python3", _os_norm(_os_join("..", "scripts",
                                              "compile_b4w.py"))]

EXTERNS       = [_os_norm(_os_join(CP_EXT_PATH, "extern_modules.js")),
                 _os_norm(_os_join(CP_EXT_PATH, "extern_jquery-1.9.js")),
                 _os_norm(_os_join(CP_EXT_PATH, "extern_globals.js")),
                 _os_norm(_os_join(CP_EXT_PATH, "extern_fullscreen.js")),
                 _os_norm(_os_join(CP_EXT_PATH, "extern_gl-matrix.js")),
                 _os_norm(_os_join(CP_EXT_PATH, "extern_pointerlock.js"))]

_apps_path    = _os_norm(_os_join(BASE_DIR, "..",
                                  "deploy", "apps"))

_version = None


class HTMLProcessor(HTMLParser):
    def __init__(self, app_path, app_path_name, js_ignore, css_ignore):
        HTMLParser.__init__(self)

        self.js = []
        self.css = []
        self.meta = []
        self.start_body = 0
        self.end_body = 0
        self.app_path = app_path
        self.app_path_name = app_path_name
        self.meta_list = []
        self.title = []
        self.is_title = False
        self.js_ignore = js_ignore
        self.css_ignore = css_ignore

    def handle_endtag(self, tag):
        if tag == "body":
            self.end_body = self.getpos()

        if tag == "title":
            self.is_title = False

    def handle_starttag(self, tag, attrs):
        if tag == "body":
            self.start_body = self.getpos()

        if tag == "script":
            script = {}

            for attr in attrs:
                script[attr[0]] = attr[1]

                if attr[0] == "src":
                    if (attr[1].startswith("https://") or
                            attr[1].startswith("http://") or
                            attr[1].startswith("//") or
                            os.path.basename(attr[1]) in self.js_ignore):
                        script["no_compile"] = True

            self.js.append(script)

        if tag == "link":
            link = {}

            for attr in attrs:
                link[attr[0]] = attr[1]

                if attr[0] == "href":
                    if os.path.basename(attr[1]) in self.css_ignore:
                        link["no_compile"] = True

                    self.css.append(link)

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
                            "hb:o:a:d:s:p:v:j:c:",
                           ["help",
                            "b4w=",
                            "optimization=",
                            "app=",
                            "dir=",
                            "assets=",
                            "assets_path=",
                            "version=",
                            "js_ignore=",
                            "css_ignore="])
    except getopt.GetoptError as err:
        sys.exit(1)

    if not len(opts):
        help("You must specify '-a' or '-app' option")
        sys.exit(1)

    opt_level   = "SIMPLE_OPTIMIZATIONS"
    app_name    = False
    engine_type = False
    ext_path    = False
    only_copy   = False
    only_single = False
    b4w_single  = False
    assets_path = ""

    global _apps_path, _version

    assets_paths     = []
    js_ignore_match  = []
    css_ignore_match = []

    for o, a in opts:
        if o == "--b4w" or o == "-b":
            if a == "copy":
                engine_type = "COPY"
                b4w_single = True
            elif a == "combine":
                engine_type = "COMBINE"
            elif a == "compile":
                engine_type = "COMPILE"
            elif a == "external":
                b4w_single = True
                pass
            else:
                help("Arg '" + a +
                     "' for 'b4w' option not recognize")
                sys.exit(0)
        elif o == "--optimization" or o == "-o":
            if a == "simple":
                opt_level = "SIMPLE_OPTIMIZATIONS"
            elif a == "advanced":
                opt_level = "ADVANCED_OPTIMIZATIONS"
            elif a == "whitespace":
                opt_level = "WHITESPACE_ONLY"
            else:
                help("Arg '" + a +
                     "' for 'optimization' option not recognize")
                sys.exit(0)
        elif o == "--app" or o == "-a":
            app_name = a
        elif o == "--assets_path" or o == "-p":
            assets_path = a
        elif o == "--assets" or o == "-s":
            assets_paths.append(a)
        elif o == "--version" or o == "-v":
            _version = a
        elif o == "--dir" or o == "-d":
            _apps_path = a
            ext_path = True
            only_copy = True
        elif o == "--js_ignore" or o == "-j":
            js_ignore_match.append(a)
            only_single = True
        elif o == "--css_ignore" or o == "-c":
            css_ignore_match.append(a)
        elif o == "--help" or o == "-h":
            help()
            sys.exit(0)

    if not engine_type and only_copy:
        help("You must choose 'copy'," +
             "'combine' or 'compile' args for -b option, " +
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

    check_app_struct(_os_norm(app_path))

    JS_CP_PARAMS.append("--compilation_level=" + opt_level)

    compile_app(app_name, engine_type, opt_level,
                assets_paths, ext_path, assets_path, js_ignore_match, css_ignore_match)


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


def compile_app(app_path, engine_type, opt_level,
                assets_paths, ext_path, app_assets_path, js_ignore_match, css_ignore_match):
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
                                _os_norm(_os_join(new_app_path,
                                  "assets",
                                  os.path.basename(_os_norm(assets_path)))))

    new_app_path_obj = Path(new_app_path)

    html_files = list(new_app_path_obj.rglob('*.html'))

    html_file = str([f for f in html_files
                                if str(f.parent) == new_app_path][0])

    js_ignore = []
    css_ignore = []

    for ignore in css_ignore_match:
        css_ignore.extend(new_app_path_obj.rglob(ignore))

    for ignore in js_ignore_match:
        js_ignore.extend(new_app_path_obj.rglob(ignore))

    css_ignore = [ignore.name for ignore in css_ignore]
    js_ignore = [ignore.name for ignore in js_ignore]

    parser, src_lines = parse_html_file(new_app_path, html_file,
                                        app_path_name, js_ignore, css_ignore)

    new_body_lines = parse_body(parser.start_body, parser.end_body, src_lines)

    css_files = list(new_app_path_obj.rglob('*.css'))

    css_paths = exist_css(parser.css, css_files,
                            app_path_name)

    out_css_file_path = _os_norm(_os_join(
                                     new_app_path, app_path_name + ".min.css"))

    if len(css_paths):
        compile_css(css_paths, app_path_name)

    js_files = list(new_app_path_obj.rglob('*.js'))

    js_paths = exist_js(parser.js, js_files,
                           app_path_name)

    out_js_file_path = _os_norm(_os_join(
                                    new_app_path, app_path_name + ".min.js"))

    if len(js_paths):
        compile_js(js_paths, app_path_name, opt_level, engine_type)

    compile_html(app_path_name, css_paths, js_paths, new_body_lines,
                 parser, engine_type, new_app_path, ext_path, app_assets_path)


def parse_html_file(new_app_path, html_file, app_path_name, js_ignore, css_ignore):
    parser = HTMLProcessor(new_app_path, app_path_name, js_ignore, css_ignore)
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
                 parser, engine_type, new_app_path, ext_path, assets_path):
    meta = parser.meta_list
    title = parser.title

    suffix = ""

    if _version:
        suffix = "?v=" + _version

    out_html_file_path = _os_norm(_os_join(
                                     new_app_path, app_path_name + ".html"))

    print_wrapper(out_html_file_path)

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

    engine_src = _os_norm(_os_join("..", "common", "b4w.full.min.js"))

    if engine_type:
        engine_path = _os_norm(
                        _os_join(
                            BASE_DIR,
                            "..", "deploy", "apps",
                            "common", "b4w.full.min.js"))

        smaa_area_path = _os_norm(
                _os_join(
                     BASE_DIR,
                     "..", "deploy", "apps",
                     "common", "smaa_area_texture.png"))

        shutil.copyfile(smaa_area_path, _os_norm(_os_join(
                                    new_app_path , "smaa_area_texture.png")))

        smaa_search_path = _os_norm(
                _os_join(
                     BASE_DIR,
                     "..", "deploy", "apps",
                     "common", "smaa_search_texture.png"))

        shutil.copyfile(smaa_search_path, _os_norm(_os_join(
                                    new_app_path, "smaa_search_texture.png")))

        phys_path = _os_norm(
                        _os_join(
                            BASE_DIR,
                            "..", "deploy", "apps",
                            "common", "uranium.js"))

        shutil.copyfile(phys_path, _os_norm(_os_join(
                                    new_app_path, "uranium.js")))

        phys_mem_path = phys_path + ".mem"
        if os.path.isfile(phys_mem_path):
            shutil.copyfile(phys_mem_path, _os_norm(_os_join(
                                            new_app_path, "uranium.js.mem")))

        if engine_type == "COPY":
            engine_src = "b4w.full.min.js"
            new_engine_path = _os_norm(_os_join(new_app_path, "b4w.full.min.js"))
            shutil.copyfile(engine_path, new_engine_path)

            change_assets_path(ext_path, new_engine_path, assets_path)

        if engine_type == "COMBINE":
            engine_src = False

            temp_js_path = _os_norm(_os_join(
                                    new_app_path, app_path_name + "_temp.js"))
            js_path = _os_norm(_os_join(
                                    new_app_path, app_path_name + ".min.js"))

            new_engine_path = _os_norm(_os_join(new_app_path, "b4w.full.min.js"))
            shutil.copyfile(engine_path, new_engine_path)

            change_assets_path(ext_path, new_engine_path, assets_path)

            with open(temp_js_path, 'wb') as temp_js:
                with open(new_engine_path,'rb') as f:
                    shutil.copyfileobj(f, temp_js, 1024*1024*10)
                with open(js_path, 'rb') as f:
                    shutil.copyfileobj(f, temp_js, 1024*1024*10)

            os.remove(js_path)
            os.rename(temp_js_path, js_path)
            os.remove(new_engine_path)

        if engine_type == "COMPILE":
            engine_src = False
            js_path = _os_norm(_os_join(
                                    new_app_path, app_path_name + ".min.js"))
            change_assets_path(ext_path, js_path, assets_path)

    inner_text.append(
        "\n    <title>" + title_text + "</title>")

    for parent in css_paths:
        rel = os.path.relpath(parent, start=new_app_path)

        inner_text.append(
            "\n    <link type='text/css' rel='stylesheet' href='" +
            _os_norm(_os_join(rel, app_path_name)) +
            ".min.css" + suffix + "'/>")

    for css in parser.css:
        if "no_compile" in css:
            css_string = "\n    <link"

            for attr in css:
                if attr == "no_compile":
                    continue

                css_string += " " + attr + "='" + css[attr] + "'"

            css_string += "/>"

            inner_text.append(css_string)

    if engine_src:
        inner_text.append(
            "\n    <script type='text/javascript' src='" +
            engine_src + suffix + "'></script>")

    for js in parser.js:
        if "no_compile" in js:
            js_string = "\n    <script"

            for attr in js:
                if attr == "no_compile":
                    continue

                js_string += " " + attr + "='" + js[attr] + "'"

            js_string += "></script>"

            inner_text.append(js_string)

    for parent in js_paths:
        rel = os.path.relpath(parent, start=new_app_path)

        inner_text.append(
            "\n    <script type='text/javascript' src='" +
            _os_norm(_os_join(rel, app_path_name)) + ".min.js" + suffix + "'></script>")


    inner_text.append("\n</head>\n")
    inner_text.extend(body_lines)
    inner_text.append("\n</html>")

    html_file.writelines(inner_text)

    html_file.close()


def change_assets_path(ext_path, new_engine_path, assets_path):
    """
    Modifies path for assets in standalone application.
    """
    if ext_path:
        engine_file = open(new_engine_path, "r")
        file_data = engine_file.read()
        engine_file.close()
        new_data = file_data.replace("ASSETS=../../assets/",
                                     "ASSETS=" + assets_path + "assets/")

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

        print_wrapper(output_css_path)

        subprocess.call(css_adv_params)

        for css in css_paths[parent]:
            os.remove(css)

        os.remove(temp_css_path)


def compile_js(js_paths, file_name, opt_level, engine_type):
    for parent in js_paths:
        if engine_type == "COMPILE":
            ENGINE_CP.extend(["--ext_js=" + _os_join(GLOBALS_PATH, "begin.js")])
            ENGINE_CP.extend(["--ext_js=" + _os_join(SRC_PATH, "b4w.js")])
            ENGINE_CP.extend(["--ext_js=" +
                              i for i in get_used_modules(js_paths[parent])])
            ENGINE_CP.extend(["--ext_js=" + i for i in js_paths[parent]])
            ENGINE_CP.extend(["--ext_js=" + _os_join(GLOBALS_PATH, "end.js")])
            ENGINE_CP.extend(["-d", _os_join(parent, file_name + ".min.js")])
            ENGINE_CP.extend(["-g"])

            if opt_level == "ADVANCED_OPTIMIZATIONS":
                ENGINE_CP.append("--optimization=advanced")
            elif opt_level == "WHITESPACE_ONLY":
                ENGINE_CP.append("--optimization=whitespace")

            subprocess.call(ENGINE_CP)
        else:
            prepared_src_js = ["--js=" + x for x in js_paths[parent]]

            output_js_path = _os_join(parent, file_name + ".min.js")

            js_adv_params = list.copy(JS_CP_PARAMS)

            if opt_level == "ADVANCED_OPTIMIZATIONS":
                prepared_src_ext = ["--externs=" + _os_join(BASE_DIR, x)
                                               for x in EXTERNS]
                js_adv_params.extend(prepared_src_ext)

            js_adv_params.extend(prepared_src_js)
            js_adv_params.append(
                "--js_output_file=" + output_js_path)

            print_wrapper(output_js_path)

            subprocess.call(js_adv_params)

        for js in js_paths[parent]:
            os.remove(js)


def get_used_modules(js_files):
    pattern_1 = r'= *require\([\"|\'](.*)[\"\']\)'
    pattern_2 = r'b4w\.module+\[[\"|\'](.*)[\"|\']\] *= *function'
    pattern_3 = r'b4w\.module+\[[\"|\'](.*)[\"|\']\] *= *b4w\.module'

    modules = []
    module_names = {}
    reserved_mods = []
    paths = {}

    for root, dirs, files in os.walk(SRC_PATH):
        files = [f for f in files if os.path.splitext(f)[1] == ".js"]

        paths[root] = files

    for js_file in js_files:
        f = open(js_file)
        string = f.read()
        f.close()

        modules.extend(re.findall(pattern_1, string))

        for path in paths:
            for f in paths[path]:
                with open(os.path.join(path, f)) as ff:
                    text = ff.read()
                    file_modules = re.findall(pattern_2, text)
                    file_modules.extend(re.findall(pattern_3, text))

                    for file_module in file_modules:
                        if not file_module in module_names:
                            module_names[file_module] = os.path.join(path, f)

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
        css_src = _os_norm(_os_join(_apps_path, app_path_name, item["href"]))

        if "no_compile" in item:
            continue

        for item_file in files:
            css_file = _os_norm(str(item_file))

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
        js_src = _os_norm(_os_join(_apps_path, app_path_name, item["src"]))

        if "no_compile" in item:
            continue

        for item_file in files:
            js_file = _os_norm(str(item_file))

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
    print("    " + "-"*(len(output_path) + len("  Compiling : ")))
    print(GREEN, "   Compiling", ENDCOL, ":", BLUE, output_path, ENDCOL)
    print("    " + "-"*(len(output_path) + len("  Compiling : ")))


def help(err=""):
    """
    Display help for compiler.
    """
    if err:
        print("     " + "-"*(len(err)))
        print("   ", RED, err, ENDCOL)
        print("     " + "-"*(len(err)))
        print("     " +
              "-"*(len("   Try './project.py --help' for more information.")))
        print(BLUE, "   ", "Try '", GREEN, "./project.py --help'",
              BLUE, "for more information.", ENDCOL)
        print("     " +
              "-"*(len("   Try './project.py --help' for more information.")))
    else:
        print("Arguments:")
        print("    -a, --app=APP              \
            application directory name")
        print("    -b, --b4w=TYPE             \
            b4w engine type: 'external', 'copy', 'combine', 'compile' ")
        print("    -c, --css_ignore           \
            no compile css file")
        print("    -d, --dir                  \
            choose application directory")
        print("    -h, --help                 \
            give this help list")
        print("    -j, --js_ignore            \
            no compile js file")
        print("    -o, --optimization=TYPE    \
            javaScript optimization type: 'whitespace', 'simple' or 'advanced'")
        print("    -p, --assets_path          \
            choose assets path for compiled app")
        print("    -s, --assets               \
            choose assets directory")
        print("    -v, --version              \
            add version to js and css files")

if __name__ == "__main__":
    run()
