#!/usr/bin/python3

import os,sys,subprocess,json, multiprocessing, time

ASSETS_DIR = "deploy/assets"
REEXPORTER = "blender_scripts/addons/blend4web/command_line_exporter.py"
GET_EXPORT_PATH = "blender_scripts/addons/blend4web/command_line_get_export_path.py"
MANIFEST_DIR = "deploy/assets/"
MANIFEST = MANIFEST_DIR + "assets.json"

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
_manifest = None

def help():
    print("Available options:", "report_only")

def reexport(path):

    json_data = open(path)

    try:
        data = json.load(json_data)
        json_data.close()
    except:
        print(RED + " [BAD JSON]" + ENDCOL, path)
        json_data.close()
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
    get_export_path_script = os.path.abspath(GET_EXPORT_PATH)
    reexporter_script = os.path.abspath(REEXPORTER)

    if not os.path.isfile(blend):
        print (RED + " [NO BLEND]" + ENDCOL, path)
        return


    ret = subprocess.check_output(["blender", "-b", blend, "-P", get_export_path_script], stderr=subprocess.STDOUT)
    ret = ret.decode("utf-8").split("B4W Export Path = ")[1].split("\n")[0]

    saved_path = os.path.normpath(ret)

    if not saved_path == os.path.abspath(path):
        print(RED + " [WRONG PATH]" + ENDCOL, path, blend)
        return

    if _manifest:
        short_path = path.split(MANIFEST_DIR)[1]
        if _manifest.find(short_path) == -1:
            print(YELLOW + " [NOT IN MANIFEST]" + ENDCOL, path, blend)

    if not _report_only:
        try:
            ret = subprocess.check_output(["blender", "-b", blend, "-P",
                    reexporter_script, "--", saved_path], stderr=subprocess.STDOUT)
            if ret.decode("utf-8").find("EXPORT OK") == -1:
                print(RED + " [EXPORT FAILURE]" + ENDCOL, path, blend)
            else:
                print(GREEN + " [OK]" + ENDCOL, path)
        except:
            print(RED + " [BLENDER CRASH]" + ENDCOL, path, blend)



if __name__ == "__main__":

    if len(sys.argv) == 1:
        _report_only = False
    elif sys.argv[1] == "report_only":
        _report_only = True
    else:
        help()
        exit(0)        

    start = time.time()

    # read manifest
    try:
        manifest_file = open(MANIFEST, "r")
        _manifest = manifest_file.read()
        manifest_file.close()
        print(GREEN + " [MANIFEST FOUND]" + ENDCOL, MANIFEST)
    except:
        print(RED + " [MANIFEST NOT FOUND]" + ENDCOL, MANIFEST)

    filepathes = []

    for root, dirs, files in os.walk(ASSETS_DIR):
        for f in files:
            ext = os.path.splitext(f)[1]
            if ext == ".json":
                path = os.path.join(root, f)
                if path != MANIFEST:
                    filepathes.append(path)

    count = multiprocessing.cpu_count()
    pool = multiprocessing.Pool(processes = count)
    pool.map(reexport, filepathes)

    print("Finished after:", round(time.time() - start), "seconds")

