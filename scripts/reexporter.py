#!/usr/bin/env python3

import os,sys,subprocess,json, multiprocessing, platform, queue, time
from html.parser import HTMLParser

ROOT_DIR = os.path.normpath(os.path.join(os.path.abspath(os.path.dirname(__file__)), ".."))
DEPLOY_DIR = os.path.join(ROOT_DIR, "deploy")
ASSETS_DIR = os.path.join(ROOT_DIR, "deploy", "assets")
ADDON_DIR = os.path.join(ROOT_DIR, "blender_scripts", "addons", "blend4web")

MANIFEST = os.path.join(ROOT_DIR, "apps_dev", "viewer", "assets.json")

REEXPORTER = os.path.join(ADDON_DIR, "command_line_exporter.py")
HTML_REEXPORTER = os.path.join(ADDON_DIR, "command_line_html_exporter.py")
GET_EXPORT_PATH = os.path.join(ADDON_DIR, "command_line_get_export_path.py")
GET_EXPORT_HTML_PATH = os.path.join(ADDON_DIR, "command_line_get_export_html_path.py")

# colors
BLACK = "\033[90m"
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
MAGENTA = "\033[95m"
CYAN = "\033[96m"
WHITE = "\033[97m"
ENDCOL = "\033[0m"

_blender_exec = ""
_blender_report_op = None

_report_only = False
_json_only = False
_html_only = False

_manifest = None
_assets_file = open(MANIFEST)
_assets_data = json.load(_assets_file)
_assets_file.close()

_queue = multiprocessing.Queue()

class FindMeta(HTMLParser):
    def __init__(self):
        HTMLParser.__init__(self)

        self.b4w_meta = False
        self.b4w_export_path = ""

    def handle_starttag(self, tag, attr):
        if tag == "meta":
            check_meta = self.check_meta_attr(attr)

            if check_meta:
                self.b4w_meta = True
                self.b4w_export_path = check_meta

    def check_meta_attr(self, attr):
        for item in attr:
            if item[0] == "name" and item[1] == "b4w_export_path_html":
                for item_copy in attr:
                    if item_copy[0] == "content":
                        return item_copy[1]
        return False


def help():
    print("Available options:", "report_only,", "json_only,", "html_only")


def report(*args):
    if check_win():
        print_report(*args)
    else:
        _queue.put(args)

def print_report(type, preamble, *messages):

    message = " ".join(messages)

    if platform.system() == "Windows":
        is_win = True
    else:
        is_win = False

    if type == "ERROR":
        if _blender_report_op:
            _blender_report_op({"ERROR"}, preamble + " " + message)
        elif is_win:
            print(preamble, message)
        else:
            print(RED + " " + preamble + ENDCOL, message)
    elif type == "WARN":
        if _blender_report_op:
            _blender_report_op({"WARNING"}, preamble + " " + message)
        elif is_win:
            print(preamble, message)
        else:
            print(YELLOW + " " + preamble + ENDCOL, message)
    elif type == "GOOD":
        if _blender_report_op:
            _blender_report_op({"INFO"}, preamble + " " + message)
        elif is_win:
            print(preamble, message)
        else:
            print(GREEN + " " + preamble + ENDCOL, message)
    else:
        if _blender_report_op:
            _blender_report_op({"INFO"}, preamble + " " + message)
        else:
            print(preamble, message)

def reexport_json(path):
    json_data = open(path)

    try:
        data = json.load(json_data)
        json_data.close()
    except:
        report("ERROR", "[BAD JSON]", path)
        json_data.close()
        return

    if not ("get" in dir(data) and float(data.get("b4w_format_version")) > 0):
        return

    b2w_blend_path = data.get("b2w_filepath_blend")
    b4w_blend_path = data.get("b4w_filepath_blend")
    blend_path = b4w_blend_path or b2w_blend_path

    if blend_path == "":
        report("ERROR", "[UNSAVED BLEND]", path)
        return

    if not blend_path:
        report("ERROR", "[OLD]", path)
        return

    # use absolute paths to get blender happy
    blend = os.path.abspath(os.path.normpath(os.path.join(os.path.dirname(path), blend_path)))

    if not os.path.isfile(blend):
        report("ERROR", "[NO BLEND]", path)
        return

    ret = subprocess.check_output([_blender_exec, "-b", blend, "-P", GET_EXPORT_PATH], stderr=subprocess.STDOUT)
    ret = ret.decode("utf-8").split("B4W Export Path = ")[1].splitlines()[0]

    saved_path = os.path.normpath(ret)

    if not saved_path == os.path.abspath(path):
        report("ERROR", "[WRONG PATH]", path, blend)
        return

    if _manifest:
        coincidence = False
        file_abs_path = os.path.abspath(os.path.normpath(path))

        for items in _assets_data:

            if coincidence:
                break

            for item in items.get("items"):
                assets_abs_path = os.path.abspath(os.path.normpath(os.path.join(ASSETS_DIR, item.get("load_file"))))

                if assets_abs_path == file_abs_path:
                    coincidence = True
                    break

        if not coincidence:
            report("WARN", "[NOT IN MANIFEST]", path, blend)

    if not _report_only:
        try:
            ret = subprocess.check_output([_blender_exec, "-b", blend, "-P",
                    REEXPORTER, "--", saved_path], stderr=subprocess.STDOUT)
            if ret.decode("utf-8").find("EXPORT OK") == -1:
                report("ERROR", "[EXPORT FAILURE]", path, blend)
            else:
                report("GOOD", "[OK]", path)
        except:
            report("ERROR", "[BLENDER CRASH]", path, blend)

def reexport_html(path):
    html_file = open(path)
    html_data  = html_file.read()

    html_parser = FindMeta()
    html_parser.feed(html_data)
    html_file.close()

    blend_path = html_parser.b4w_export_path
    b4w_meta = html_parser.b4w_meta

    if not b4w_meta:
        return

    if blend_path == "" and b4w_meta:
        report("ERROR", "[EMPTY META CONTENT]", path)
        return

    blend = os.path.abspath(os.path.normpath(os.path.join(os.path.dirname(path), blend_path)))

    if not os.path.isfile(blend):
        report("ERROR", " [NO BLEND]", path)
        return

    ret = subprocess.check_output([_blender_exec, "-b", blend, "-P", GET_EXPORT_HTML_PATH], stderr=subprocess.STDOUT)
    ret = ret.decode("utf-8").split("B4W Export HTML Path = ")[1].split("\n")[0]
    saved_path = os.path.normpath(ret)

    if not saved_path == os.path.abspath(path):
        report("ERROR", "[WRONG PATH]", path, blend)
        return

    if not _report_only:
        if b4w_meta:
            try:
                ret = subprocess.check_output([_blender_exec, "-b", blend, "-P",
                        HTML_REEXPORTER, "--", saved_path], stderr=subprocess.STDOUT)
                if ret.decode("utf-8").find("EXPORT OK") == -1:
                    report("ERROR", "[EXPORT FAILURE]", saved_path, blend)
                else:
                    report("GOOD", "[OK]", path)
            except:
                report("ERROR", "[BLENDER CRASH]", path, blend)

def check_win():
    if platform.system() == "Windows":
        return True
    else:
        return False

def reexport(blender_exec, json_dir, html_dir, blender_report_op=None):
    global _queue, _blender_exec, _blender_report_op, _html_only, _json_only

    _blender_exec = blender_exec
    _blender_report_op = blender_report_op

    filepathes = []
    html_filepathes = []

    if (not _html_only and _json_only) or (not _html_only and not _json_only):
        for root, dirs, files in os.walk(json_dir):
            for f in files:
                ext = os.path.splitext(f)[1]
                if ext == ".json":
                    path = os.path.join(root, f)
                    filepathes.append(path)

    if (_html_only and not _json_only) or (not _html_only and not _json_only):
        for root, dirs, files in os.walk(html_dir):
            for f in files:
                ext = os.path.splitext(f)[1]
                if ext == ".html":
                    path = os.path.join(root, f)
                    html_filepathes.append(path)

    # no multiprocessing on window
    if check_win():
        for f in filepathes:
            reexport_json(f)

        for f in html_filepathes:
            reexport_html(f)
    else:
        count = multiprocessing.cpu_count()
        pool = multiprocessing.Pool(processes = count)

        result = pool.map_async(reexport_json, filepathes)

        while not result.ready():
            try:
                msg = _queue.get(timeout=1)
                print_report(*msg)
            except queue.Empty:
                pass

        result = pool.map_async(reexport_html, html_filepathes)

        while not result.ready():
            try:
                msg = _queue.get(timeout=1)
                print_report(*msg)
            except queue.Empty:
                pass

if __name__ == "__main__":

    if len(sys.argv) == 1:
        _report_only = False
    elif sys.argv[1] == "report_only":
        _report_only = True
    elif sys.argv[1] == "json_only":
        _json_only = True
    elif sys.argv[1] == "html_only":
        _html_only = True
    else:
        help()
        exit(0)

    start = time.time()

    # read manifest
    if not _html_only:
        try:
            manifest_file = open(MANIFEST, "r")
            _manifest = manifest_file.read()
            manifest_file.close()
            report("GOOD", "[MANIFEST FOUND]", MANIFEST)
        except:
            report("ERROR", "[MANIFEST NOT FOUND]", MANIFEST)

    reexport("blender", DEPLOY_DIR, ROOT_DIR)

    print("Finished after:", round(time.time() - start), "seconds")

