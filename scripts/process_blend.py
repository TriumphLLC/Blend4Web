#!/usr/bin/env python3

import os,sys,subprocess,json, multiprocessing, platform, queue, time, getopt
from html.parser import HTMLParser

ROOT_DIR = os.path.normpath(os.path.join(os.path.abspath(os.path.dirname(__file__)), ".."))
DEPLOY_DIR = os.path.join(ROOT_DIR, "deploy")
ASSETS_DIR = os.path.join(ROOT_DIR, "deploy", "assets")
BLENDER_CLI_DIR = os.path.join(ROOT_DIR, "scripts", "blender")

MANIFEST = os.path.join(ROOT_DIR, "apps_dev", "viewer", "assets.json")

REEXPORTER = os.path.join(BLENDER_CLI_DIR, "cli_exporter.py")
RESAVER = os.path.join(BLENDER_CLI_DIR, "cli_resaver.py")
HTML_REEXPORTER = os.path.join(BLENDER_CLI_DIR, "cli_html_exporter.py")
GET_EXPORT_PATH = os.path.join(BLENDER_CLI_DIR, "cli_get_export_path.py")
GET_EXPORT_HTML_PATH = os.path.join(BLENDER_CLI_DIR, "cli_get_export_html_path.py")

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

SAVE_FAIL_STRINGS = ["EDITED NORMALS CONVERTION FAILED", "CONVERSION OF NLA SLOTS FAILED"]

_blender_exec = ""
_blender_report_op = None

_process_html = True
_process_json = True
_operation = "reexport"

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
    print("Available options:", "report,", "reexport,", "reexport_conv_media,", "resave")
    print("Flags: -h - process html files,")
    print("       -j - process json files.")

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

    # minify stream delays
    sys.stdout.flush()

def process_json(path):
    try:
        json_data = open(path)

        try:
            data = json.load(json_data)
            json_data.close()
        except:
            report("ERROR", "[BAD JSON]", path)
            json_data.close()
            return

        if not ("get" in dir(data) and data.get("b4w_format_version") is not None 
                    and float(data.get("b4w_format_version")) > 0):
            report("INFO", "[SKIP JSON]", path)
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

        try:
            if _operation == "reexport":
                ret = subprocess.check_output([_blender_exec, "-b", blend, "-P",
                        REEXPORTER, "--", saved_path], stderr=subprocess.STDOUT)
                if ret.decode("utf-8").find("EXPORT OK") == -1:
                    report("ERROR", "[EXPORT FAILURE]", path, blend)
                else:
                    report("GOOD", "[OK]", path)
            elif _operation == "resave":
                resave(blend)
        except:
            report("ERROR", "[BLENDER CRASH]", path, blend)

    except Exception as e:
        report("ERROR", "[UNKNOWN ERROR]", path)

def process_html(path):
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

    ret = subprocess.check_output([_blender_exec, "-b", blend, "-P",
            GET_EXPORT_HTML_PATH], stderr=subprocess.STDOUT)
    ret = ret.decode("utf-8").split("B4W Export HTML Path = ")[1].split("\n")[0]
    saved_path = os.path.normpath(ret)

    if not saved_path == os.path.abspath(path):
        report("ERROR", "[WRONG PATH]", path, blend)
        return

    if b4w_meta:
        try:
            if _operation == "reexport" or _operation == "reexport_conv_media":
                ret = subprocess.check_output([_blender_exec, "-b", blend, "-P",
                        HTML_REEXPORTER, "--", saved_path, "-o", _operation], stderr=subprocess.STDOUT)
                if ret.decode("utf-8").find("EXPORT OK") == -1:
                    report("ERROR", "[EXPORT FAILURE]", saved_path, blend)
                else:
                    report("GOOD", "[OK]", path)
            elif _operation == "resave":
                resave(blend)
        except:
            report("ERROR", "[BLENDER CRASH]", path, blend)

def resave(blend):
    ret = subprocess.check_output(["blender", "-b", blend, "-P",
            RESAVER], stderr=subprocess.STDOUT)
    r = ret.decode("utf-8")

    failed = False
    for s in SAVE_FAIL_STRINGS:
        if r.find(s) != -1:
            failed = True

    if r.find("RESAVE OK") == -1 and failed:
        report("ERROR", "[SAVE FAILURE]", blend)
        print(ret)
    else:
        report("GOOD", "[OK]", blend)

def check_win():
    if platform.system() == "Windows":
        return True
    else:
        return False

def process_files(blender_exec, json_dir, html_dir, blender_report_op=None):
    global _queue, _blender_exec, _blender_report_op, _process_json, _process_html

    _blender_exec = blender_exec
    _blender_report_op = blender_report_op

    filepathes = []
    html_filepathes = []

    if _process_json:
        for root, dirs, files in os.walk(json_dir):
            for f in files:
                ext = os.path.splitext(f)[1]
                if ext == ".json":
                    path = os.path.join(root, f)
                    filepathes.append(path)

    if _process_html:
        for root, dirs, files in os.walk(html_dir):
            for f in files:
                ext = os.path.splitext(f)[1]
                if ext == ".html":
                    path = os.path.join(root, f)
                    html_filepathes.append(path)

    # no multiprocessing on window
    if check_win():
        for f in filepathes:
            process_json(f)

        for f in html_filepathes:
            process_html(f)
    else:
        count = multiprocessing.cpu_count()
        pool = multiprocessing.Pool(processes = count)

        result = pool.map_async(process_json, filepathes)

        while not result.ready():
            try:
                msg = _queue.get(timeout=1)
                print_report(*msg)
            except queue.Empty:
                pass

        result = pool.map_async(process_html, html_filepathes)

        while not result.ready():
            try:
                msg = _queue.get(timeout=1)
                print_report(*msg)
            except queue.Empty:
                pass

if __name__ == "__main__":

    try:
        opts, args = getopt.getopt(sys.argv[1:], "jh", ["d"])
    except getopt.GetoptError as err:
        print(err)
        sys.exit(1)

    if not len(args) or len(args) > 1 or \
                not (args[0] in ("reexport", "reexport_conv_media", "resave", "report")):
        help()
        sys.exit(1)

    if args[0] in ("reexport", "reexport_conv_media", "resave", "report"):
        _operation = args[0]

    _process_html = False
    _process_json = False

    for opt in opts:
        if opt[0] == "-j":
            _process_json = True
        elif opt[0] == "-h":
            _process_html = True
        else:
            help()
            exit(0)

    start = time.time()

    # read manifest
    if _process_json:
        try:
            manifest_file = open(MANIFEST, "r")
            _manifest = manifest_file.read()
            manifest_file.close()
            report("GOOD", "[MANIFEST FOUND]", MANIFEST)
        except:
            report("ERROR", "[MANIFEST NOT FOUND]", MANIFEST)

    process_files("blender", DEPLOY_DIR, ROOT_DIR)

    print("Finished after:", round(time.time() - start), "seconds")

