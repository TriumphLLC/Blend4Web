#!/usr/bin/env python3

import copy
import math
import os, sys, subprocess, multiprocessing, re, getopt, platform, errno
import shutil
import struct
import hashlib
import glob
import math
import gzip

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

ASSETS_DIR = os.path.join(BASE_DIR, "..", "deploy", "assets")

PATH_TO_UTILS_WIN = os.path.join(BASE_DIR, "..", "tools", "converter_utils", "win")

NO_CONV_NAME = ".b4w_no_conv"

DEPENDENCIES = ["avconv", "identify", "nvcompress", "convert", "ffmpeg", 
        "ffprobe", "PVRTexToolCLI"]
WINDOWS_EXTERNAL_DEPS = ["PVRTexToolCLI"]

WHITE  = "\033[97m"
YELLOW = "\033[93m"
RED    = "\033[91m"
ENDCOL = "\033[0m"

SEQ_VIDEO_FPS = 12

def help():
    print("""usage: converter.py [-d dir_path | --dir dir_path] [-j jobs | --jobs jobs]
                    [-v | --verbose] <command>""")
    print("")
    print("""commands:
    resize_textures       convert textures to lower resolution
    convert_dds           convert textures to DDS format
    convert_pvr           convert textures to PVR format
    convert_media         convert audio and video files to alternative formats
    compress_gzip         compress json/bin/pvr/dds files to gzip

    cleanup_textures      cleanup low resolution textures
    cleanup_dds           cleanup textures converted to DDS
    cleanup_pvr           cleanup textures converted to PVR
    cleanup_media         cleanup converted media
    cleanup_gzip          cleanup compressed json/bin/pvr/dds

    check_dependencies    check converter dependencies

    compress_png          compress PNG images (requires OptiPNG in the PATH variable)

options:
    -d, --dir dir_path    specify alternative directory with converted files
    -j, --jobs jobs       specify the number of jobs to run simultaneously
                          if not given or 0, the number will be calculated
                          automatically based on CPU count
    -v, --verbose         print more information about files being converted
""")

def print_flush():
    sys.stdout.flush()
    sys.stderr.flush()

def check_dependencies(dependencies):

    if platform.system() == "Windows":
        deps_intersection = list(set(dependencies) & set(WINDOWS_EXTERNAL_DEPS))
        if len(deps_intersection):
            dependencies = deps_intersection
        else:
            return True

    missing_progs = get_missing_progs(dependencies)
    if "ffmpeg" in missing_progs and not "avconv" in missing_progs:
        index = missing_progs.index("ffmpeg")
        del missing_progs[index]
    if "avconv" in missing_progs and not "ffmpeg" in missing_progs:
        index = missing_progs.index("avconv")
        del missing_progs[index]
    needed_progs = {}
    for dep in missing_progs:
        if dep == "avconv" or dep == "ffmpeg":
            needed_progs["Libav or FFmpeg"] = True
        elif dep == "identify" or dep == "convert":
            needed_progs["ImageMagick"] = True
        elif dep == "ffprobe":
            needed_progs["FFprobe"] = True
        elif dep == "nvcompress":
            needed_progs["NVIDIA Texture Tools"] = True
        elif dep == "qt-faststart":
            needed_progs["Qt-faststart (optional)"] = True
        elif dep == "optipng":
            needed_progs["OptiPNG"] = True
        elif dep == "PVRTexToolCLI":
            needed_progs["PVRTexTool"] = True

    for prog in needed_progs:
        color = RED
        if prog == "PVRTexTool":
            color = YELLOW
        print(color + "Couldn't find", prog + ".")
    if len(missing_progs) > 0:
        return False
    return True

def get_missing_progs(dependencies):
    missing_progs = []
    for dep in dependencies:
        if not shutil.which(dep):
            missing_progs.append(dep)
    return missing_progs

def compress_png_handler(args):
    root = args["root"]
    filename = args["filename"]
    compress = args["compress_png"]

    head_ext = os.path.splitext(filename)
    head = head_ext[0]
    ext = head_ext[1]
    ext_low = ext.lower()

    if ext_low == ".png":
        img_path = os.path.join(root, filename)
        ret = subprocess.call([compress, "-o7", img_path])
        print_flush()

def resize_textures_handler(args):
    root = args["root"]
    filename = args["filename"]

    convert = args["convert"]
    identify = args["identify"]
    dds_convert = args["dds_convert"]

    head_ext = os.path.splitext(filename)
    head = head_ext[0]
    ext = head_ext[1]
    ext_low = ext.lower()
    if head.find(".min50") == -1 and (ext_low == ".jpg" or ext_low == ".jpeg" or ext_low == ".png" or \
            ext_low == ".gif" or ext_low == ".bmp"):
        path_from = os.path.join(root, filename)
        path_to = os.path.join(root, head + ".min50" + ext)

        # optimization: only convert modified src files (like make)
        if is_older(path_from, path_to):
            return

        print("resizing tex", path_from)

        if is_cubemap(path_from, identify):
            # use box filter  in order to prevent seams
            ret = subprocess.call([convert, path_from, "-filter", "box",
                    "-resize", "50%", path_to])
        else:
            convert_params = ["(", "+clone", "-channel", "A", "-separate", "+channel", ")",
                    "-alpha", "off"]

            ret = subprocess.call([convert, path_from] + convert_params +
                    ["-resize", "50%", "-compose", "CopyOpacity", "-composite", path_to])
        if ret:
            print("conversion error", path_from, file=sys.stderr)
            sys.exit(1)

        print_flush()

def is_cubemap(path, identify):
    ret = subprocess.check_output([identify, "-format", "%w,%h", path])
    ret = ret.decode("utf-8").split(",")
    [w, h] = [int(ret[0]), int(ret[1])]
    return w*2 == h*3;

def calc_square_size(width, height):
    w = max(8, 1 << math.ceil(math.log(width,2)))
    h = max(8, 1 << math.ceil(math.log(height,2)))
    return max(w, h)

def convert_dds_handler(args):
    root = args["root"]
    filename = args["filename"]

    convert = args["convert"]
    identify = args["identify"]
    dds_convert = args["dds_convert"]

    head_ext = os.path.splitext(filename)
    head = head_ext[0]
    ext = head_ext[1]
    ext_low = ext.lower()

    verbose = args["verbose"]
    path_from = os.path.join(root, filename)

    if ext_low == ".jpg" or ext_low == ".jpeg" or ext_low == ".png" or \
            ext_low == ".gif" or ext_low == ".bmp":
        path_to = path_from + ".dds"
        proc = subprocess.Popen([identify, "-format", "%w %h", "-quiet", \
                path_from], stdout=subprocess.PIPE)
        size_data = proc.stdout.readline().split()
        width = int(size_data[0])
        height = int(size_data[1])

        if check_non_multiple_of_4(width, height):
            print(RED + "[INCOMPATIBLE IMAGE] " + WHITE \
                    + "Image size must be a multiple of 4:" + ENDCOL, path_from, \
                    WHITE, file=sys.stderr)
            return

        # optimization: only convert modified src files (like make)
        if is_older(path_from, path_to):
            return

        if verbose:
            print("flipping", path_from)

        #can't convert from gif and bmp to dds directly
        if ext_low == ".gif" or ext_low == ".bmp":
            path_flipped = os.path.join(root, head + ".flipped" + ".png")
        else:
            path_flipped = os.path.join(root, head + ".flipped" + ext)

        if verbose:
            sp_stdout = None
        else:
            sp_stdout = subprocess.DEVNULL

        if ext_low == ".png":
            # force PNG32 format to protect greyscale images from darkening
            subprocess.call([convert, path_from, "-flip",
                "PNG32:"+path_flipped])
        else:
            subprocess.call([convert, path_from, "-flip", path_flipped])

        print("converting to dds", path_from)

        compression = check_dds_compression_method(path_from, ext, convert, identify)

        if check_non_power_of_two(width, height):
            ret = subprocess.call([dds_convert, compression, "-nomips", \
                    path_flipped, path_to], stdout=sp_stdout)
        else:
            ret = subprocess.call([dds_convert, compression, path_flipped, \
                    path_to], stdout=sp_stdout)
        if ret:
            print("Conversion error. Can't swpan nvcompress process",
                    file=sys.stderr)
            sys.exit(1)

        if verbose:
            print("removing flipped", path_from, "\n")
        remove_if_exist(path_flipped)

        print_flush()

def convert_pvr_handler(args):
    root = args["root"]
    filename = args["filename"]

    convert = args["convert"]
    identify = args["identify"]

    head_ext = os.path.splitext(filename)
    ext = head_ext[1]
    ext_low = ext.lower()

    verbose = args["verbose"]
    path_from = os.path.join(root, filename)

    if ext_low == ".jpg" or ext_low == ".jpeg" or ext_low == ".png" or \
            ext_low == ".bmp":
        path_to = os.path.join(root, path_from + ".pvr")

        if is_older(path_from, path_to):
            return

        proc = subprocess.Popen([identify, "-format", "%w %h", "-quiet", \
                    path_from], stdout=subprocess.PIPE)
        size_data = proc.stdout.readline().split()
        width = int(size_data[0])
        height = int(size_data[1])
        square_size = calc_square_size(width, height)

        compression = check_pvr_compression_method(path_from, ext, convert, identify)
        args = ["PVRTexToolCLI", "-f", compression]
        args += ["-r", str(square_size) + "," + str(square_size)]
        args += ["-m", "10"]
        args += ["-flip", "y"]
        args += ["-i", path_from]
        args += ["-o", path_from + ".pvr"]

        if verbose:
            sp_stdout = None
        else:
            sp_stdout = subprocess.DEVNULL

        print("converting to pvr", path_from)
        if width != square_size or height != square_size:
            print("resize to " + str(square_size) + "x" + str(square_size))

        subprocess.call(args, stdout=sp_stdout, stderr=sp_stdout)

        print_flush()
        

def remove_if_exist(filename):
    try:
        os.remove(filename)
    except OSError as e:
        if e.errno != errno.ENOENT: # errno.ENOENT = no such file or directory
            raise

def check_non_multiple_of_4(width, height):
    return bool(width % 4 or height % 4)

def check_non_power_of_two(width, height):
    return bool(math.log(width, 2) % 1 or math.log(height, 2) % 1)

def check_dds_compression_method(path, ext, convert, identify):

    if check_alpha_usage(path, ext, convert, identify):
        return "-bc3"

    return "-bc1"

def check_pvr_compression_method(path, ext, convert, identify):

    if check_alpha_usage(path, ext, convert, identify):
        return "PVRTC1_4"

    return "PVRTC1_4_RGB"

def check_alpha_usage(path, ext, convert, identify):

    if ext != ".png":
        return False

    proc = subprocess.check_output([identify, "-format", '%A', path])
    use_alpha = proc.decode("utf-8")
    if 'True' in use_alpha or 'Blend' in use_alpha:
        proc = subprocess.check_output([convert, path, "-format", "%[opaque]", "info:"])
        opaque = proc.decode("utf-8")
        if opaque == "false":
            return True
        print(YELLOW + "[ALPHA UNUSED]" + ENDCOL, path, WHITE, file=sys.stderr)

    return False

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

def convert_media_handler(args):

    root = args["root"]
    filename = args["filename"]

    media_converter = args["media_converter"]
    media_data = args["media_data"]
    faststart = args["faststart"]

    head_ext = os.path.splitext(filename)
    head = head_ext[0]
    ext = head_ext[1]
    ext_low = ext.lower()

    verbose = args["verbose"]

    if (head.find(".altconv") == -1 and
            (ext_low == ".ogg" or ext_low == ".mp3" or ext_low == ".mp4" or
            ext_low == ".ogv" or ext_low == ".webm" or ext_low == ".m4v" or
            ext_low == ".oga" or ext_low == ".m4a")):

        path_from = os.path.join(root, filename)

        has_audio, has_video = has_streams(media_data, path_from, verbose)
    
        if has_audio:
            if ext_low == ".ogg" or ext_low == ".ogv" or ext_low == ".oga":
                new_ext = ".m4a"
            elif ext_low == ".mp3":
                new_ext = ".oga"
            elif ext_low == ".mp4" or ext_low == ".m4v" or ext_low == ".m4a":
                new_ext = ".oga"
            elif ext == ".webm":
                new_ext = ".m4a"

            path_to = os.path.join(root, head + ".altconv" + new_ext)

            # optimization: only convert modified src files (like make)
            if is_older(path_from, path_to):
                return

            print("converting media (audio)", path_from)

            if media_conv(path_from, path_to, media_converter, verbose,
                    has_video, False):
                print("conversion error", file=sys.stderr)
                sys.exit(1)

            qt_faststart_conv(path_to, faststart, verbose)

        if has_video:
            if ext_low == ".ogg" or ext_low == ".ogv" or ext_low == ".oga":
                new_ext = ".m4v"
            elif ext_low == ".webm":
                new_ext = ".m4v"
            elif ext_low == ".mp3":
                new_ext = ".webm"
            elif ext_low == ".mp4" or ext_low == ".m4v" or ext_low == ".m4a":
                new_ext = ".webm"

            path_to = os.path.join(root, head + ".altconv" + new_ext)

            # optimization: only convert modified src files (like make)
            if not is_older(path_from, path_to):
                print("converting media (video)", path_from)
                if media_conv(path_from, path_to, media_converter, verbose, False,
                        True):
                    print("conversion error", file=sys.stderr)
                    sys.exit(1)

                qt_faststart_conv(path_to, faststart, verbose)

            new_ext = ".seq"
            path_to = os.path.join(root, head + ".altconv" + new_ext)

            if not is_older(path_from, path_to):
                print("converting media", path_from, "(seq)")

                if sequential_video_file_conv(path_from, path_to, media_converter,
                        verbose):
                    print("conversion error", file=sys.stderr)
                    sys.exit(1)

        print_flush()

def qt_faststart_conv(path_to, faststart, verbose):
    if check_dependencies(["qt-faststart"]):
        result = qt_faststart(path_to, faststart, verbose)
        if result is not None:
            if result:
                print("conversion error (qt_faststart)", file=sys.stderr)
                # sys.exit(1)
            else:
                os.remove(path_to)
                os.rename(path_to + ".tmp", path_to)

def media_conv(path_from, path_to, media_converter, verbose, cut_video, is_video):

    ext_to = os.path.splitext(path_to)[1]
    args = [media_converter, "-y", "-i", path_from]

    if cut_video:
        args += ["-vn"]
    else:
        if ext_to == ".oga" or ext_to == ".ogv":
            args += ["-acodec", "libvorbis"]
        elif ext_to == ".mp3":
            args += ["-acodec", "mp3"]
        # remove audio stream
        if is_video:
            args += ["-an"]
    if ext_to == ".mp4" or ext_to == ".m4v" or ext_to == ".m4a":
        # NOTE: use -strict experimental to allow AAC in avconv
        # NOTE: resample all to 48000 (96000 is incompatible with AAC)
        args += ["-acodec", "aac", "-strict", "experimental", "-ar", "48000"]

        if verbose:
            args += ["-loglevel", "info"]
            print(" ".join(args))
        else:
            args += ["-loglevel", "warning"]

    args += [path_to]

    return subprocess.call(args)

def has_streams(media_data, path, verbose):
    args = [media_data, "-show_streams", path]

    if verbose:
        args += ["-loglevel", "info"]
        print(" ".join(args))
    else:
        args += ["-loglevel", "warning"]

    ret = str(subprocess.check_output(args))
    return ret.find("audio") > 0, ret.find("video") > 0

def qt_faststart(path, faststart, verbose):
    ext_to = os.path.splitext(path)[1]

    if ext_to == ".mp4" or ext_to == ".m4v" or ext_to == ".m4a":
        if verbose:
            sp_stdout = None
        else:
            sp_stdout = subprocess.DEVNULL

        return subprocess.call([faststart, path, path + ".tmp"],
                stdout=sp_stdout)
    return None

def sequential_video_file_conv(path_from, path_to, media_converter, verbose):

    tmp_folder = os.path.join(os.path.dirname(path_from), 
            hashlib.md5(path_from.encode()).hexdigest())
    ext = os.path.splitext(path_from)[1]
    # TODO: fix crashes when the folder already exists
    os.mkdir(tmp_folder)

    fps = str(SEQ_VIDEO_FPS)
    if ext == ".m4v":
        args = [media_converter, "-i", path_from, "-r", fps,
                "-strict", "experimental", 
                os.path.join(tmp_folder, "_seq_tmp" + ext)]
    else:
        args = [media_converter, "-i", path_from, "-r", fps,
                os.path.join(tmp_folder, "_seq_tmp" + ext)]

    if verbose:
        args += ["-loglevel", "info"]
        print(" ".join(args))
    else:
        args += ["-loglevel", "warning"]

    res = subprocess.call(args)
    if res != 0:
        shutil.rmtree(tmp_folder)
        print("could not convert video ", path_from, file=sys.stderr)
        return res

    args = [media_converter, "-i", os.path.join(tmp_folder, "_seq_tmp" + ext),
            os.path.join(tmp_folder, "out%08d.jpg")]

    if verbose:
        args += ["-loglevel", "info"]
        print(" ".join(args))
    else:
        args += ["-loglevel", "warning"]

    res = subprocess.call(args)
    if res != 0:
        shutil.rmtree(tmp_folder)
        print("could not split frames ", path_from, file=sys.stderr)
        return res

    try:
        sequential_video = open(path_to, "wb")
    except OSError as exp:
        raise FileError("Permission denied")
    else:
        number_of_files = len(glob.glob(tmp_folder + "/*.jpg"))

        sequential_video.write(bytes("B4WSWWWWHHHH", "UTF-8"))

        sequential_video.write(struct.pack("i", number_of_files))
        sequential_video.write(struct.pack("i", SEQ_VIDEO_FPS))

        for i in range(1, number_of_files + 1):
            number = str(i)
            try:
                frame = open(tmp_folder + "/out" + number.zfill(8) + ".jpg", "rb")
            except OSError as exp:
                raise FileError("Permission denied")
            else:
                file_stat = os.stat(tmp_folder + "/out" + number.zfill(8) + ".jpg")
                size = file_stat.st_size
                sequential_video.write(struct.pack("i", size))
                sequential_video.write(frame.read())
                for j in range(4 - size % 4):
                    sequential_video.write(struct.pack("B", 0))
                frame.close()

        sequential_video.close()
        shutil.rmtree(tmp_folder)
        return None


def cleanup_media_handler(args):
    root = args["root"]
    filename = args["filename"]

    ext = os.path.splitext(filename)[1]
    ext_low = ext.lower()
    if (".seq" in filename or ".altconv" in filename and
            (ext_low == ".ogg" or ext_low == ".mp3" or ext_low == ".mp4" or
            ext_low == ".ogv" or ext_low == ".webm" or ext_low == ".m4v" or
            ext_low == ".oga" or ext_low == ".m4a")):
        print("removing", os.path.join(root, filename))
        os.remove(os.path.join(root, filename))

        print_flush()

def cleanup_textures_handler(args):
    root = args["root"]
    filename = args["filename"]

    ext = os.path.splitext(filename)[1]
    ext_low = ext.lower()
    if (ext_low == ".jpg" or ext_low == ".jpeg" or ext_low == ".png" or ext_low == ".gif" or ext_low == ".bmp") and \
            ".min50" in filename:
        print("removing", os.path.join(root, filename))
        os.remove(os.path.join(root, filename))

        print_flush()

def cleanup_dds_handler(args):
    root = args["root"]
    filename = args["filename"]
    filename_low = filename.lower()

    if (".jpg.dds" in filename_low or ".jpeg.dds" in filename_low or
            ".png.dds" in filename_low or ".gif.dds" in filename_low or ".bmp.dds" in filename_low):
        print("removing", os.path.join(root, filename))
        os.remove(os.path.join(root, filename))

        print_flush()

def cleanup_pvr_handler(args):
    root = args["root"]
    filename = args["filename"]
    filename_low = filename.lower()

    if (".jpg.pvr" in filename_low or ".jpeg.pvr" in filename_low or
            ".png.pvr" in filename_low or ".gif.pvr" in filename_low or ".bmp.pvr" in filename_low):
        print("removing", os.path.join(root, filename))
        os.remove(os.path.join(root, filename))

        print_flush()

def cleanup_gzip_handler(args):
    root = args["root"]
    filename = args["filename"]
    filename_low = filename.lower()

    if (".bin.gz" in filename_low or ".json.gz" in filename_low or
            ".dds.gz" in filename_low or ".pvr.gz" in filename_low):
        print("removing", os.path.join(root, filename))
        os.remove(os.path.join(root, filename))

        print_flush()

def compress_gzip_handler(args):
    root = args["root"]
    filename = args["filename"]
    ext = os.path.splitext(filename)[1]

    if ext == ".bin" or ext == ".json" or ext == ".dds" or ext == ".pvr":
        with open(os.path.join(root, filename), 'rb') as f_in:
            with gzip.open(os.path.join(root, filename) + '.gz', 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)

    print_flush()

if __name__ == "__main__":

    try:
        opts, args = getopt.getopt(sys.argv[1:],
                "d:j:vh", ["dir=", "jobs=", "verbose", "help"])
    except getopt.GetoptError as err:
        print(err)
        sys.exit(1)

    path = os.path.normpath(ASSETS_DIR)

    handler_args = {
        "verbose": False
    }

    jobs = 0

    for o, a in opts:
        if o == "--dir" or o == "-d":
            if os.path.isdir(a):
                path = a
            else:
                print("Directory does not exist", file=sys.stderr)
                sys.exit(1)
        elif o == "--jobs" or o == "-j":
            try:
                jobs = int(a)
            except ValueError:
                print("Invalid number of jobs", file=sys.stderr)
                sys.exit(1)
        elif o == "--verbose" or o == "-v":
            handler_args["verbose"] = True

    if not len(args):
        help()
        sys.exit(1)

    if len(args) > 1:
        print("You may specify only one assignment", file=sys.stderr)
        print()
        help()
        sys.exit(1)

    task = args[0]

    if task == "convert_media":
        if not check_dependencies(["ffmpeg", "avconv", "ffprobe"]):
            print(RED + "Skipping media conversion.")
            sys.exit(0)
        handler = convert_media_handler

    elif task == "cleanup_media":
        handler = cleanup_media_handler

    elif task == "resize_textures":
        if not check_dependencies(["convert"]):
            print(RED + "Skipping texture resizing.")
            sys.exit(0)
        handler = resize_textures_handler

    elif task == "cleanup_textures":
        handler = cleanup_textures_handler

    elif task == "convert_dds":
        if not check_dependencies(["convert", "identify", "nvcompress"]):
            print(RED + "Skipping DDS conversion.")
            sys.exit(0)
        handler = convert_dds_handler

    elif task == "convert_pvr":
        if not check_dependencies(["convert", "identify", "PVRTexToolCLI"]):
            print(YELLOW + "Skipping PVR conversion.")
            sys.exit(0)
        handler = convert_pvr_handler

    elif task == "cleanup_dds":
        handler = cleanup_dds_handler

    elif task == "cleanup_pvr":
        handler = cleanup_pvr_handler

    elif task == "compress_png":
        if not check_dependencies(["optipng"]):
            print(RED + "Skipping PNG compression.")
            sys.exit(0)
        handler = compress_png_handler

    elif task == "check_dependencies":
        if check_dependencies(DEPENDENCIES):
            print("All programs have been installed.")
        sys.exit(0)

    elif task == "compress_gzip":
        handler = compress_gzip_handler

    elif task == "cleanup_gzip":
        handler = cleanup_gzip_handler

    else:
        help()
        exit(0)

    if platform.system() != "Windows":
        handler_args["convert"] = "convert"
        handler_args["identify"] = "identify"

        handler_args["dds_convert"] = "nvcompress"
        handler_args["media_data"] = "ffprobe"

        missing_progs = get_missing_progs(DEPENDENCIES)
        if not "ffmpeg" in missing_progs:
            handler_args["media_converter"] = "ffmpeg"
        else:
            handler_args["media_converter"] = "avconv"
        handler_args["faststart"] = "qt-faststart"
    else:
        handler_args["convert"] = os.path.normpath(os.path.join(PATH_TO_UTILS_WIN,
                "imagemagick", "convert.exe"))
        handler_args["identify"] = os.path.normpath(os.path.join(PATH_TO_UTILS_WIN,
                "imagemagick", "identify.exe"))

        handler_args["dds_convert"] = os.path.normpath(os.path.join(PATH_TO_UTILS_WIN,
                "nvcompress", "nvcompress.exe"))

        handler_args["media_converter"] = os.path.normpath(os.path.join(PATH_TO_UTILS_WIN,
                "ffmpeg", "ffmpeg.exe"))
        handler_args["media_data"] = os.path.normpath(os.path.join(PATH_TO_UTILS_WIN,
                "ffmpeg", "ffprobe.exe"))
        handler_args["faststart"] = os.path.normpath(os.path.join(PATH_TO_UTILS_WIN,
                "qt-faststart", "qt-faststart.exe"))
    handler_args["compress_png"] = "optipng";

    args_list = []

    for root, dirs, files in os.walk(path):
        for f in files:
            if not os.path.isfile(os.path.join(root, NO_CONV_NAME)):
                handler_args["root"] = root
                handler_args["filename"] = f
                args_list.append(copy.copy(handler_args))

    if jobs == 0:
        cpu_count = multiprocessing.cpu_count()
    else:
        cpu_count = jobs
    pool = multiprocessing.Pool(processes = cpu_count)
    pool.map(handler, args_list)

