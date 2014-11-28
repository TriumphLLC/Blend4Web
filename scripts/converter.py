#!/usr/bin/python3

import math
import os,sys,subprocess, multiprocessing, re

ASSETS_DIR = "../external/deploy/assets"
APPS_DIR = "../external/deploy/apps"
TUTS_DIR = "../external/deploy/tutorials/examples"

WHITE  = "\033[97m"
YELLOW = "\033[93m"
RED    = "\033[91m"
ENDCOL = "\033[0m"

def help():
    print("usage: converter.py <conversion_option>")
    print("")
    print("""conversion options:
    resize_textures
    convert_dds
    convert_media
    cleanup_textures
    cleanup_dds
    cleanup_sounds""")


def resize_texture(args):
    root = args[0]
    filename = args[1]
    head_ext = os.path.splitext(filename)
    head = head_ext[0]
    ext = head_ext[1]
    if head.find(".min50") == -1 and (ext == ".jpg" or ext == ".jpeg" or ext == ".png"):
        path_from = os.path.join(root, filename)
        path_to = os.path.join(root, head + ".min50" + ext)

        # optimization: only convert modified src files (like make)
        if is_older(path_from, path_to):
            return

        print("resizing file", path_from)

        if is_cubemap(path_from):
            # use box filter  in order to prevent seams
            ret = os.spawnlp(os.P_WAIT, "convert", "convert", path_from, 
                    "-filter", "box", "-resize", "50%", path_to)
        else:
            ret = subprocess.call(["gm", "convert", "-filter", "Lanczos",
                                   "-scale", "50%", path_from, path_to])

        if ret:
            print("Conversion error")
            sys.exit(1)

def is_cubemap(path):
    ret = subprocess.check_output(["identify", "-format", "%w,%h", path])
    ret = ret.decode("utf-8").split(",")
    [w, h] = [int(ret[0]), int(ret[1])]
    return w*2 == h*3;

def convert_dds(args):
    root = args[0];
    filename = args[1];
    head_ext = os.path.splitext(filename)
    head = head_ext[0]
    ext = head_ext[1]
    if ext == ".jpg" or ext == ".jpeg" or ext == ".png":
        path_from = os.path.join(root, filename)
        path_to = path_from + ".dds"

        proc = subprocess.Popen(["identify", "-format", "%w %h", "-quiet", \
                path_from], stdout=subprocess.PIPE)
        size_data = proc.stdout.readline().split()
        width = int(size_data[0])
        height = int(size_data[1])

        if check_non_multiple_of_4(width, height):
            print(RED + " [INCOMPATIBLE IMAGE] " + WHITE \
                    + "Image size must be a multiple of 4:" + ENDCOL, path_from, \
                    WHITE)
            return

        if is_cubemap(path_from):
            return

        # optimization: only convert modified src files (like make)
        if is_older(path_from, path_to):
            return

        print("flipping", path_from)

        path_flipped = os.path.join(root, head + ".flipped" + ext)

        if ext == ".png":
            # force PNG32 format to protect greyscale images from darkening
            subprocess.call(["convert", path_from, "-flip", "PNG32:"+path_flipped])
        else:
            subprocess.call(["convert", path_from, "-flip", path_flipped])

        print("converting to dds", path_from)

        compression = check_compression_method(path_from, ext)

        if check_non_power_of_two(width, height):
            ret = subprocess.call(["nvcompress", compression, "-nomips", \
                    path_flipped, path_to])
        else:
            ret = subprocess.call(["nvcompress", compression, path_flipped, \
                    path_to])
        if ret:
            print("Conversion error. Can't swpan nvcompress process")
            sys.exit(1)

        print("removing flipped", path_from, "\n")
        ret = os.spawnlp(os.P_WAIT, "rm", "rm", path_flipped)

        if ret:
            print("Conversion error")
            sys.exit(1)

def check_non_multiple_of_4(width, height):
    return bool(width % 4 or height % 4)

def check_non_power_of_two(width, height):
    return bool(math.log(width, 2) % 1 or math.log(height, 2) % 1)

def check_compression_method(path, ext):

    if check_alpha_usage(path, ext):
        return "-bc3"

    return "-bc1"

def check_alpha_usage(path, ext):

    if ext != ".png":
        return False

    proc = subprocess.check_output(["identify", "-format", '%A', path])
    use_alpha = proc.decode("utf-8")

    if 'True' in use_alpha:
        proc = subprocess.check_output(["convert", path, "-scale", "1x1", "txt:-"])
        image_info_str = proc.decode("utf-8")

        alpha_str = get_last_substring(image_info_str, ",", ")")
        alpha = float(alpha_str)

        if alpha != 1:
            return True

        print(YELLOW + " [ALPHA UNUSED]" + ENDCOL, path, WHITE)

    return False


def get_last_substring(source, start, end):

    start_pos = source.rindex(start) + len(start)
    end_pos   = source.rindex(end)
    return source[start_pos : end_pos]

def is_older(path, path2):
    """Check if path is older than path2
    nothing is older than something
    nothing is non older than nothing"""

    if os.path.isfile(path) and not os.path.isfile(path2):
        return False
    elif not os.path.isfile(path) and os.path.isfile(path2):
        return True
    elif not os.path.isfile(path) and not os.path.isfile(path2):
        return False
    elif os.path.getmtime(path) < os.path.getmtime(path2):
        return True
    else:
        return False

def convert_media(args):
    root = args[0]
    filename = args[1]
    head_ext = os.path.splitext(filename)
    head = head_ext[0]
    ext = head_ext[1]

    if (head.find(".lossconv") == -1 and
            (ext == ".ogg" or ext == ".mp3" or ext == ".mp4" or 
             ext == ".ogv" or ext == ".webm" or ext == ".m4v")):
        path_from = os.path.join(root, filename)

        if ext == ".ogg":
            new_ext = ".mp4"
        elif ext == ".mp3":
            new_ext = ".ogg"
        elif ext == ".mp4":
            new_ext = ".ogg"

        elif ext == ".ogv":
            new_ext = ".m4v"
        elif ext == ".webm":
            new_ext = ".m4v"
        elif ext == ".m4v":
            new_ext = ".webm"

        path_to = os.path.join(root, head + ".lossconv" + new_ext)

        # optimization: only convert modified src files (like make)
        if is_older(path_from, path_to):
            return

        print("converting media file", path_from)

        if avconv_conv(path_from, path_to):
            print("Conversion error")
            sys.exit(1)

def avconv_conv(path_from, path_to):

    ext_to = os.path.splitext(path_to)[1]
    args = ["avconv", "-y", "-i", path_from]

    if ext_to == ".ogg":
        args += ["-acodec", "libvorbis"]
    elif ext_to == ".mp3":
        args += ["-acodec", "mp3"]
    elif ext_to == ".mp4" or ext_to == ".m4v":
        # NOTE: use -strict experimental to allow AAC in avconv
        # NOTE: resample all to 48000 (96000 is incompatible with AAC)
        args += ["-acodec", "aac", "-strict", "experimental", "-ar", "48000"] 

    args += [path_to]
    print(args)

    return os.spawnvp(os.P_WAIT, "avconv", args)

def remove_sound(args):
    root = args[0]
    file = args[1]
    ext = os.path.splitext(file)[1]
    if (".lossconv" in file and
            (ext == ".ogg" or ext == ".mp3" or ext == ".mp4")):
        print("removing", os.path.join(root, file))
        os.remove(os.path.join(root, file))

def remove_min50_image(args):
    root = args[0]
    file = args[1]
    ext = os.path.splitext(file)[1]
    if (ext == ".jpg" or ext == ".jpeg" or ext == ".png") and ".min50" in file:
        print("removing", os.path.join(root, file))
        os.remove(os.path.join(root, file))

def remove_dds(args):
    root = args[0]
    file = args[1]
    if ".jpg.dds" in file or ".jpeg.dds" in file or ".png.dds" in file:
        print("removing", os.path.join(root, file))
        os.remove(os.path.join(root, file))


if __name__ == "__main__":

    if len(sys.argv) != 2:
        help()
        exit(0)

    task = sys.argv[1]

    paths = [ASSETS_DIR, TUTS_DIR]

    if task == "convert_media":
        paths.append(APPS_DIR)
        handler = convert_media

    elif task == "cleanup_sounds":
        paths.append(APPS_DIR)
        handler = remove_sound

    elif task == "resize_textures":
        handler = resize_texture

    elif task == "cleanup_textures":
        handler = remove_min50_image

    elif task == "convert_dds":
        handler = convert_dds

    elif task == "cleanup_dds":
        handler = remove_dds

    else:
        help()
        exit(0)

    args = [];

    for path in paths:
        abs_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), path)
        for root, dirs, files in os.walk(abs_path):
            for f in files:
                args.append([root, f])

    cpu_count = multiprocessing.cpu_count()
    pool = multiprocessing.Pool(processes = cpu_count)
    pool.map(handler, args)

