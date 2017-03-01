#!/usr/bin/env python3

import configparser
import os
import sys

from os.path import basename, join, normpath, exists, relpath, splitext, isfile, isdir
from collections import OrderedDict

def unix_path(path):
    # only relative paths allowed
    assert not os.path.isabs(path)
    return path.replace('\\', '/')

def get_proj_cfg(proj_dir):
    """
    Get the cfg_parser object from '.b4w_project' file.
    """
    b4w_proj_cfg = configparser.ConfigParser()
    b4w_proj_cfg.read(join(proj_dir, ".b4w_project"), encoding="utf-8")

    return b4w_proj_cfg

def proj_cfg_value(cfg_parser, section, option, fallback=None):
    """
    Get the value from the cfg_parser via section and option.
    """
    if not cfg_parser:
        return fallback

    val = cfg_parser.get(section, option, fallback = fallback)

    # provide fallback for empty options too 
    if val == "" or val == fallback:
        return fallback

    if (option == "blend_dirs" or
        option == "assets_dirs" or
        option == "apps" or
        option == "ignore" or
        option == "js_ignore" or
        option == "css_ignore"):

        return cfg_extract_list(val)
    elif (option == "override" or
          option == "use_physics" or
          option == "use_smaa_textures"):

        return cfg_parser.getboolean(section, option)
    else:
        return val

def cfg_extract_list(s):
    s_list = s.strip(";").split(";")
    return [i.strip(" ") for i in s_list]

def cwd_rel_to_abs(rel_path):
    """Get absoulte paths from the relative to current dir ones"""
    return normpath(join(os.getcwd(), rel_path))

def cfg_create_list(l):
    return ";".join(l) + ";"

def csv_str_to_dict(s):
    params_sep = s.strip(",").split(",")
    params = [i.strip(" ") for i in params_sep]

    key_vals = []

    for param in params:
        key_val = [i.strip(" ") for i in param.split("=")]
        if len(key_val) < 2:
            key_val.append("")
        key_vals.append(tuple(key_val))

    refactered_key_vals = []

    for key_val in key_vals:
        refactered_key_vals.append(key_val[:2])

    try:
        return OrderedDict(refactered_key_vals)
    except:
        return OrderedDict()

def dict_to_csv_str(d):
    items = []
    for key,val in d.items():
        if val:
            items.append(key + "=" + val)
        else:
            items.append(key)

    return ",".join(items)

def calc_proj_size(dirs_in, root):

    # copy and normalize
    paths = [normpath(d) for d in dirs_in]

    unique_paths = []

    for path in paths:
        is_child = False

        for path2 in paths:
            # path is a child of path2
            if path != path2 and os.path.commonprefix([path, path2]) == path2:
                is_child = True
                break;

        if not path in unique_paths and not is_child:
            unique_paths.append(path)

    total_size = 0

    for path in unique_paths:
        for dirpath, dirnames, filenames in os.walk(join(root, path)):
            for f in filenames:
                fp = join(dirpath, f)
                total_size += os.path.getsize(fp)

    return total_size

def print_flush():
    sys.stdout.flush()
    sys.stderr.flush()
