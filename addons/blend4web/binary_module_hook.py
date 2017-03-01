# Copyright (C) 2014-2017 Triumph LLC
# 
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.


import os
import addon_utils
import errno
import time
import shutil
import tempfile
import blend4web
import bpy
import re

b4w_modules = ["b4w_bin_suffix", "translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_
from .b4w_bin_suffix import get_platform_suffix

def ensure_dir(dirname):
    try:
        os.makedirs(dirname)
    except OSError as e:
        if e.errno != errno.EEXIST:
            raise

def make_file_copy(orig, copy):
    # always make copy, so imp.load_dynamic will load updated binary
    copy = copy + "_%d" % int(time.time()*1000)
    shutil.copy(orig, copy)
    return copy

def get_binary_module_desc():
    for mod in addon_utils.modules(refresh=False):
        if mod.bl_info['name'] == 'Blend4Web':
            init_script_path = mod.__file__
            break
    libname = "b4w_bin" + get_platform_suffix()
    path = os.path.dirname(os.path.abspath(init_script_path))

    # Move the binary into 'temp' dir and link it from that path
    filename = libname + ".so"
    if libname.find("Windows") >= 0:
        filename = libname + ".pyd"
    v1 = bpy.app.version[0]
    v2 = bpy.app.version[1]
    lower = False
    higher = False
    filepath = ""
    while True:
        filepath = os.path.join(path, "bin", str(v1) + "_" + str(v2), filename)
        if not os.path.exists(filepath):
            # at least 2.76 version is always present
            if v1 < 2 or (v1 == 2 and v2 < 76):
                higher = True
                v1 = 2
                v2 = 76
            else:
                lower = True
                v2 -= 1
        else:
            break

    if lower:
        blend4web.init_mess.append(_("Using low version of Blend4Web binary module. Blend4Web update is recommended!"))
    if higher:
        blend4web.init_mess.append(_("Using high version of Blend4Web binary module. Blender update is recommended!"))

    tempdir = bpy.app.tempdir
    if tempdir == "":
        tempdir = os.path.join(path, "..", "temp")
    ensure_dir(tempdir)
    copy_filepath = os.path.join(tempdir, filename)

    # cleanup old copies
    files = [f for f in os.listdir(tempdir) if re.match(filename + r'.*', f)]
    for f in files:
        rmfile = os.path.join(tempdir, f)
        try:
            os.remove(rmfile)
        except BaseException:
            pass

    binary_path = make_file_copy(filepath, copy_filepath)
    return (libname, binary_path)
