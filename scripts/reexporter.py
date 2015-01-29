#!/usr/bin/python3

import os,sys,subprocess,json, multiprocessing, time
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

_report_only = None
_json_only = None
_html_only = None
_manifest = None

_assets_file = open(MANIFEST)
_assets_data = json.load(_assets_file)
_assets_file.close()

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


def reexport_json(path):
    json_data = open(path)

    try:
        data = json.load(json_data)
        json_data.close()
    except:
        print(RED + " [BAD JSON]" + ENDCOL, path)
        json_data.close()
        return

    if not ("get" in dir(data) and float(data.get("b4w_format_version")) > 0):
        return

    b2w_blend_path = data.get("b2w_filepath_blend")
    b4w_blend_path = data.get("b4w_filepath_blend")
    blend_path = b4w_blend_path or b2w_blend_path

    if blend_path == "":
        print(RED + " [UNSAVED BLEND]" + ENDCOL, path)
        return

    if not blend_path:
        print(RED + " [OLD]" + ENDCOL, path)
        return

    # use absolute paths to get blender happy
    blend = os.path.abspath(os.path.normpath(os.path.join(os.path.dirname(path), blend_path)))

    if not os.path.isfile(blend):
        print (RED + " [NO BLEND]" + ENDCOL, path)
        return

    ret = subprocess.check_output(["blender", "-b", blend, "-P", GET_EXPORT_PATH], stderr=subprocess.STDOUT)
    ret = ret.decode("utf-8").split("B4W Export Path = ")[1].split("\n")[0]

    saved_path = os.path.normpath(ret)

    if not saved_path == os.path.abspath(path):
        print(RED + " [WRONG PATH]" + ENDCOL, path, blend)
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
            print(YELLOW + " [NOT IN MANIFEST]" + ENDCOL, path, blend)

    if not _report_only:
        try:
            ret = subprocess.check_output(["blender", "-b", blend, "-P",
                    REEXPORTER, "--", saved_path], stderr=subprocess.STDOUT)
            if ret.decode("utf-8").find("EXPORT OK") == -1:
                print(RED + " [EXPORT FAILURE]" + ENDCOL, path, blend)
            else:
                print(GREEN + " [OK]" + ENDCOL, path)
        except:
            print(RED + " [BLENDER CRASH]" + ENDCOL, path, blend)


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
        print(RED + " [EMPTY META CONTENT]" + ENDCOL, path)
        return

    blend = os.path.abspath(os.path.normpath(os.path.join(os.path.dirname(path), blend_path)))

    if not os.path.isfile(blend):
        print (RED + " [NO BLEND]" + ENDCOL, path)
        return

    ret = subprocess.check_output(["blender", "-b", blend, "-P", GET_EXPORT_HTML_PATH], stderr=subprocess.STDOUT)
    ret = ret.decode("utf-8").split("B4W Export HTML Path = ")[1].split("\n")[0]
    saved_path = os.path.normpath(ret)

    if not saved_path == os.path.abspath(path):
        print(RED + " [WRONG PATH]" + ENDCOL, path, blend)
        return

    if not _report_only:
        if b4w_meta:
            try:
                ret = subprocess.check_output(["blender", "-b", blend, "-P",
                        HTML_REEXPORTER, "--", saved_path], stderr=subprocess.STDOUT)
                if ret.decode("utf-8").find("EXPORT OK") == -1:
                    print(RED + " [EXPORT FAILURE]" + ENDCOL, saved_path, blend)
                else:
                    print(GREEN + " [OK]" + ENDCOL, path)
            except:
                print(RED + " [BLENDER CRASH]" + ENDCOL, path, blend)


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
            print(GREEN + " [MANIFEST FOUND]" + ENDCOL, MANIFEST)
        except:
            print(RED + " [MANIFEST NOT FOUND]" + ENDCOL, MANIFEST)

    filepathes = []
    html_filepathes = []

    if (not _html_only and _json_only) or (not _html_only and not _json_only):
        for root, dirs, files in os.walk(DEPLOY_DIR):
            for f in files:
                ext = os.path.splitext(f)[1]
                if ext == ".json":
                    path = os.path.join(root, f)
                    filepathes.append(path)

    if (_html_only and not _json_only) or (not _html_only and not _json_only):
        for root, dirs, files in os.walk(ROOT_DIR):
            for f in files:
                ext = os.path.splitext(f)[1]
                if ext == ".html":
                    path = os.path.join(root, f)
                    html_filepathes.append(path)

    count = multiprocessing.cpu_count()
    pool = multiprocessing.Pool(processes = count)
    pool.map(reexport_json, filepathes)
    pool.map(reexport_html, html_filepathes)

    print("Finished after:", round(time.time() - start), "seconds")
