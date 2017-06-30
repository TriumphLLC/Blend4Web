#!/usr/bin/env python3

import os,sys,subprocess,json, multiprocessing, platform, queue, time, getopt

from os.path import join, normpath
from html.parser import HTMLParser

ROOT_DIR = normpath(join(os.path.abspath(os.path.dirname(__file__)), ".."))
ASSETS_DIR = join(ROOT_DIR, "deploy", "assets")

BLENDER_CLI_DIR = join(ROOT_DIR, "scripts", "blender")

REEXPORTER = join(BLENDER_CLI_DIR, "cli_exporter.py")
RESAVER = join(BLENDER_CLI_DIR, "cli_resaver.py")
HTML_REEXPORTER = join(BLENDER_CLI_DIR, "cli_html_exporter.py")
GET_EXPORT_PATH = join(BLENDER_CLI_DIR, "cli_get_export_path.py")
GET_EXPORT_HTML_PATH = join(BLENDER_CLI_DIR, "cli_get_export_html_path.py")

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
            print(RED + preamble + ENDCOL, message)
    elif type == "WARN":
        if _blender_report_op:
            _blender_report_op({"WARNING"}, preamble + " " + message)
        elif is_win:
            print(preamble, message)
        else:
            print(YELLOW + preamble + ENDCOL, message)
    elif type == "GOOD":
        if _blender_report_op:
            _blender_report_op({"INFO"}, preamble + " " + message)
        elif is_win:
            print(preamble, message)
        else:
            print(GREEN + preamble + ENDCOL, message)
    else:
        if _blender_report_op:
            _blender_report_op({"INFO"}, preamble + " " + message)
        else:
            print(preamble, message)

    # minify stream delays
    sys.stdout.flush()

def process_json(path):
    try:
        json_data = open(path, encoding="utf-8")

        try:
            data = json.load(json_data)
            json_data.close()
        except:
            report("ERROR", "[BAD JSON]", path)
            json_data.close()
            return

        if not ("get" in dir(data) and data.get("b4w_format_version") is not None 
                    and float(data.get("b4w_format_version")) > 0):
            report("INFO", "[SKIP]", path)
            return

        blend_path = data.get("b4w_filepath_blend")

        if blend_path == "":
            report("ERROR", "[UNSAVED BLEND]", path)
            return

        if not blend_path:
            report("ERROR", "[OLD]", path)
            return

        # use absolute paths to get blender happy
        blend = os.path.abspath(normpath(join(os.path.dirname(path), blend_path)))

        if not os.path.isfile(blend):
            report("ERROR", "[NO BLEND]", path)
            return

        ret = subprocess.check_output([_blender_exec, "-b", blend, "-P",
                GET_EXPORT_PATH], stderr=subprocess.STDOUT)
        output = ret.decode("utf-8")

        if _operation == "report":
            report_blender_warnings(output, blend)

        saved_path = normpath(output.split("B4W Export Path = ")[1].splitlines()[0])

        if not saved_path == os.path.abspath(path):
            report("ERROR", "[WRONG PATH]", path, blend)
            return

        try:
            if _operation == "reexport":
                ret = subprocess.check_output([_blender_exec, "-b", blend, "-P",
                        REEXPORTER, "--", saved_path], stderr=subprocess.STDOUT)
                output = ret.decode("utf-8")
                if output.find("EXPORT OK") == -1:
                    report("ERROR", "[EXPORT FAILURE]", blend, path)
                else:
                    report("GOOD", "[OK]", path)
            elif _operation == "resave":
                resave(blend)
        except:
            report("ERROR", "[BLENDER CRASH]", blend, path)

    except Exception as e:
        report("ERROR", "[UNKNOWN ERROR]", path, str(e))

def report_blender_warnings(output, blend):
    for line in output.splitlines():
        if "Warning: " in line:
            report("WARN", "[WARNING]", blend, line.split("Warning: ")[1])
        elif "Error: " in line:
            # also handle RuntimeError:
            report("WARN", "[ERROR]", blend, line.split("Error: ")[-1])

def process_html(path):
    html_file = open(path, encoding="utf-8")
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

    blend = os.path.abspath(normpath(join(os.path.dirname(path), blend_path)))

    if not os.path.isfile(blend):
        report("ERROR", "[NO BLEND]", path)
        return

    ret = subprocess.check_output([_blender_exec, "-b", blend, "-P",
            GET_EXPORT_HTML_PATH], stderr=subprocess.STDOUT)
    output = ret.decode("utf-8")

    if _operation == "report":
        report_blender_warnings(output, blend)

    saved_path = normpath(output.split("B4W Export HTML Path = ")[1].split("\n")[0].strip("\r"))

    if not saved_path == os.path.abspath(path):
        report("ERROR", "[WRONG PATH]", path, blend)
        return

    if b4w_meta:
        try:
            if _operation == "reexport" or _operation == "reexport_conv_media":
                ret = subprocess.check_output([_blender_exec, "-b", blend, "-P",
                        HTML_REEXPORTER, "--", saved_path, "-o", _operation],
                        stderr=subprocess.STDOUT)
                output = ret.decode("utf-8")
                if output.find("EXPORT OK") == -1:
                    report("ERROR", "[EXPORT FAILURE]", blend, saved_path)
                else:
                    report("GOOD", "[OK]", path)
            elif _operation == "resave":
                resave(blend)
        except:
            report("ERROR", "[BLENDER CRASH]", blend, path)

def resave(blend):
    ret = subprocess.check_output(["blender", "-b", blend, "-P",
            RESAVER], stderr=subprocess.STDOUT)
    output = ret.decode("utf-8")

    failed = False
    for s in SAVE_FAIL_STRINGS:
        if output.find(s) != -1:
            failed = True

    if output.find("RESAVE OK") == -1 and failed:
        report("ERROR", "[SAVE FAILURE]", blend)
        print(output)
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
                    path = join(root, f)
                    filepathes.append(path)

    if _process_html:
        for root, dirs, files in os.walk(html_dir):
            for f in files:
                ext = os.path.splitext(f)[1]
                if ext == ".html":
                    path = join(root, f)
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

    process_files("blender", ASSETS_DIR, ASSETS_DIR)

    print("Finished after:", round(time.time() - start), "seconds")

