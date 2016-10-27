#!/usr/bin/env python3

import os,sys,subprocess,json,platform,shutil
from converter import check_alpha_usage

ASSETS_DIR = "../deploy/assets/"

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

_resource_dict = {}

DEPENDENCIES = ["identify", "convert"]
PATH_TO_UTILS_WIN = os.path.join("..", "tools", "converter_utils", "win")


def check_dependencies(dependencies):

    if platform.system() == "Windows":
        return True

    missing_progs = get_missing_progs(dependencies)
    needed_progs = {}
    for dep in missing_progs:
        if dep == "identify" or dep == "convert":
            needed_progs["ImageMagick"] = True
    for prog in needed_progs:
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

def run():
    try:
        sys.argv[1];

        if sys.argv[1] != "unused" and sys.argv[1] != "tex_users":
            help(1)
            return
    except:
        help(1)
        return

    if sys.argv[1] == "unused":
        func = check_unused
        extract_sounds = True

    if sys.argv[1] == "tex_users":
        try:
            sys.argv[2]

            if not check_file_existing(sys.argv[2]):
                print(RED + " [ERROR] " + ENDCOL + "File not found")
                return
        except:
            help(2)
            return

        func = check_used
        extract_sounds = False

    for root, dirs, files in os.walk(ASSETS_DIR):
        for f in files:
            extract_resources(root, f)

    use_image = False

    for root, dirs, files in os.walk(ASSETS_DIR):
        for f in files:
            if func(root, f):
                use_image = True

    if not use_image and func == check_used:
        print(RED + " [FILE UNUSED] " + ENDCOL)


def extract_resources(root, filename):
    if not is_json(filename):
        return

    path = os.path.join(root, filename)

    json_data = open(path)

    try:
        data = json.load(json_data)
        json_data.close()
    except:
        print(RED + " [BAD JSON]" + ENDCOL, path, WHITE)
        json_data.close()
        return

    for image in data.get("images"):
        add_resource(image, path)


    if sys.argv[1] == "unused":
        for sound in data.get("sounds"):
            add_resource(sound, path)


def add_resource(resource, path):
    filepath = resource.get("filepath")
    if filepath:
        filepath = os.path.abspath(os.path.normpath(os.path.join(os.path.dirname(path), filepath)))
        _resource_dict[filepath] = True


def check_unused(root, filename):
    """
    Displays all images paths, which not use in all scenes
    """
    if not check_dependencies(DEPENDENCIES):
        sys.exit(1)

    head_ext = os.path.splitext(filename)
    head = head_ext[0]
    ext = head_ext[1]

    path = os.path.abspath(os.path.join(root, filename))

    if (head.find(".min50") == -1 and (ext == ".jpg" or ext == ".jpeg" or ext == ".png")) or \
        (head.find(".altconv") == -1 and (ext == ".ogg" or ext == ".mp3" or ext == ".mp4")):

        if not path in _resource_dict:
            print(RED + " [FILE UNUSED]" + ENDCOL, path, WHITE)

    if platform.system() != "Windows":
        convert = "convert"
        identify = "identify"
    else:
        convert = os.path.normpath(os.path.join(PATH_TO_UTILS_WIN, "imagemagick", "convert.exe"))
        identify = os.path.normpath(os.path.join(PATH_TO_UTILS_WIN, "imagemagick", "identify.exe"))

    check_alpha_usage(path, ext, convert, identify)


def check_used(root, filename):
    """
    Displays all file paths with ".blend" extension, which use
    recieve image
    """
    if not is_json(filename):
        return

    exist = False

    path = os.path.abspath(os.path.join(root, filename))
    json_file = open(path)
    json_data = json.load(json_file)

    for image in json_data.get("images"):
        image_path = os.path.abspath(os.path.join(root, image["filepath"]))

        if image_path == sys.argv[2]:
            exist = True
            blend_path = os.path.abspath(os.path.join(root, json_data.get("b4w_filepath_blend")))
            print(GREEN + " [FILE USED IN]" + ENDCOL, blend_path, WHITE)

    return exist


def is_json(filename):
    """
    Checks file extension
    """
    ext = os.path.splitext(filename)[1]

    if not ext == ".json":
        return False

    return True


def help(state=1):
    """
    Prints help on wrong input
    """
    if state == 1:
        print("Specify conversion options:", "unused", "tex_users")

    if state == 2:
        print(RED + " [ERROR] " + ENDCOL + "Missed filepath argument")


def check_file_existing(filename):
    """
    Checks the existence of a file and file is image
    """
    exist = False
    ext = os.path.splitext(filename)[1]

    if ext == ".json" or ext == ".bin":
        return False

    for root, dirs, files in os.walk(ASSETS_DIR):
        for f in files:
            file_path = os.path.abspath(os.path.join(root, f))

            if file_path == filename:
                exist = True

    return exist


if __name__ == "__main__":
    run()
