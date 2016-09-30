#! /usr/bin/env python3

# use B4W_BLEND_VER environment variable to specify path where to store result binary
# using env to keep passing all cmd arguments into setup script
# example: B4W_BLEND_VER=2_76  python3 build.py

from distutils.core import setup, Extension
from distutils import sysconfig
import os
import sys
import re

B4W_PATH = os.path.join("..", "..", "addons", \
        "blend4web")
sys.path.append(B4W_PATH)
import b4w_bin_suffix

def set_command_line_arguments(debug_mode):
    sys.argv.insert(1, "build_ext")
    sys.argv.insert(2, "-i")
    if debug_mode:
        sys.argv.insert(3, "-g")

def get_ext_suffix():
    return sysconfig.get_config_var("EXT_SUFFIX")

def get_compiled_ext_path(extension_name, debug_mode):
    ext_suffix = get_ext_suffix()
    # --inplace (-i) option required
    if os.name == 'nt' and debug_mode:
        # extensions in debug_mode are named 'module_d.pyd' under windows
        return extension_name + '_d' + ext_suffix
    else:
        return extension_name + ext_suffix

def build(path):
    DEBUG_MODE = False
    EXTENSION_NAME = "b4w_bin"
    PL_SUFFIX = b4w_bin_suffix.get_platform_suffix()
    INIT_FUNC_NAME = "PyInit_b4w_bin" + PL_SUFFIX
    MODULE_NAME = "b4w_bin" + PL_SUFFIX

    set_command_line_arguments(DEBUG_MODE)
    include_dir=[os.path.join(os.getcwd(),'includes/blenlib/'),
                 os.path.join(os.getcwd(),'includes/blenkernel/'),
                 os.path.join(os.getcwd(),'includes/makesdna/')]
    module1 = Extension(EXTENSION_NAME,
            sources = ['bindings.c', 'mikktspace.c', 'weldmesh.c', 'vertex_cache.c'],
            undef_macros=['NDEBUG'],
            define_macros=[("MODULE_NAME", MODULE_NAME),
                    ("INIT_FUNC_NAME", INIT_FUNC_NAME)],
            export_symbols=[INIT_FUNC_NAME],
            include_dirs=include_dir)

    setup(name = 'B4W Export Utils',
            version = '1.0',
            description = 'Provides utility functions for b4w exporter',
            ext_modules = [module1])

    # NOTE: workaround for bug: http://bugs.python.org/issue16754
    dst_suffix = get_ext_suffix()
    dst_suffix = ".so" if dst_suffix == ".cpython-33m.so" or dst_suffix == ".cpython-34m.so" or "linux" in dst_suffix or "darwin" in dst_suffix else dst_suffix

    src = get_compiled_ext_path(EXTENSION_NAME, DEBUG_MODE)
    dst = os.path.join(B4W_PATH, "bin", path, EXTENSION_NAME) + PL_SUFFIX + dst_suffix

    # HACK: workaround when file already exists
    try:
        os.remove(dst)
    except:
        pass

    os.rename(src, dst)

if __name__ == "__main__":
    # get current blender version from addon module descriptor
    # for case if path to binary is not specified
    file = open(os.path.join(B4W_PATH, "__init__.py"))
    content = file.read()
    regex = '(?<=\"blender\":\s)\(.*\)'
    m = re.search(regex, content)
    from ast import literal_eval as make_tuple
    bl_version = make_tuple(m.group(0))

    path = "%s_%s" % (bl_version[0], bl_version[1])
    path = os.getenv('B4W_BLEND_VER', path)
    build(path)
