import os
import addon_utils
import errno
import time
import shutil
import tempfile

from .b4w_bin_suffix import get_platform_suffix

def ensure_dir(dirname):
    try:
        os.makedirs(dirname)
    except OSError as e:
        if e.errno != errno.EEXIST:
            raise

def ensure_file_overwrite_access(filepath):
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except BaseException:
            filepath =  filepath + "_%d" % int(time.time()*1000)
            # recursion
            # filepath = ensure_file_overwrite_access(filepath)
    return filepath

def make_file_copy(orig, copy):
    copy = ensure_file_overwrite_access(copy)
    shutil.copy(orig, copy)
    return copy

def get_binary_module_desc():
    for mod in addon_utils.modules(refresh=False):
        if mod.bl_info['name'] == 'Blend4Web':
            init_script_path = mod.__file__
            break
    libname = "b4w_bin" + get_platform_suffix()
    path = os.path.dirname(os.path.abspath(init_script_path))
    binary_path = os.path.join(path, libname + ".so")

    # For windows move the binary into 'temp' dir and link it from that path
    if libname.find("Windows") >= 0:
        filename = libname + ".pyd"
        filepath = os.path.join(path,filename)
        tempdir = tempfile.gettempdir()
        if tempdir is None:
            tempdir = os.path.join(path, "..", "temp")
        ensure_dir(tempdir)
        copy_filepath = os.path.join(tempdir, filename)
        binary_path = make_file_copy(filepath, copy_filepath)

    return (libname, binary_path)
