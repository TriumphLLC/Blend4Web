#!/usr/bin/python3

import os,sys,subprocess,json
from converter import check_alpha_usage

ASSETS_DIR = "../external/deploy/assets/"
MANIFEST = "assets.json"

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
            sys.argv[2];
        except:
            help(2)
            return

        func = check_used
        extract_sounds = False

    for root, dirs, files in os.walk(ASSETS_DIR):
        for f in files:
            extract_resources(root, f, extract_sounds)

    for root, dirs, files in os.walk(ASSETS_DIR):
        for f in files:
            func(root, f)


def extract_resources(root, filename, extract_sound):

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

    head_ext = os.path.splitext(filename)
    head = head_ext[0]
    ext = head_ext[1]

    path = os.path.abspath(os.path.join(root, filename))

    if (head.find(".min50") == -1 and (ext == ".jpg" or ext == ".jpeg" or ext == ".png")) or \
        (head.find(".lossconv") == -1 and (ext == ".ogg" or ext == ".mp3" or ext == ".mp4")):

        if not path in _resource_dict:
            print(RED + " [FILE UNUSED]" + ENDCOL, path, WHITE)

    check_alpha_usage(path, ext)


def check_used(root, filename):
    """
    Displays all file paths with ".blend" extension, which use
    recieve image
    """
    if not is_json(filename):
        return

    path = os.path.abspath(os.path.join(root, filename))
    json_file = open(path)
    json_data = json.load(json_file)

    for image in json_data.get("images"):
        image_path = os.path.abspath(os.path.join(root, image["filepath"]))

        if image_path == sys.argv[2]:
            blend_path = os.path.abspath(os.path.join(root, json_data.get("b4w_filepath_blend")))
            print(GREEN + " [FILE USED IN]" + ENDCOL, blend_path, WHITE)


def is_json(filename):

    ext = os.path.splitext(filename)[1]

    if not ext == ".json":
        return False

    if filename == MANIFEST:
        return False

    return True


def help(state=1):
    if state == 1:
        print("Specify conversion options:", "unused,", "tex_users")

    if state == 2:
        print("Missed filename")


if __name__ == "__main__":
    run()
