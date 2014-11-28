#!/usr/bin/env python3

import getopt, json, os, sys, zipfile

# for UNIX-like OSes only
import fnmatch

from custom_json_encoder import CustomJSONEncoder

SRC=os.path.join(os.path.abspath(os.path.dirname(__file__)), "..")
DEST=os.path.join(SRC, "external", "deploy", "pub")

def help():
    print("Usage: make_dist.py [-i] [-v version] [-f] DIST_FILE")

def process_dist_list(dist_path, ignore_path, version, force):

    startup_string = "Creating a distribution archive from " + str(dist_path)
    if ignore_path:
        startup_string += " (ignoring the source directory hierarchy)"

    print(startup_string)

    try:
        dist_file = open(dist_path, "r")
        dist = dist_file.read()
        dist_file.close()
    except:
        print("Wrong dist file")
        return

    pos_patterns = []
    neg_patterns = []

    for line in dist.splitlines(False):
        # handle comments, ignore spaces
        line = line.split("#")[0].strip()

        if not len(line):
            continue

        if line[0] == "!":
            neg_patterns.append(line.strip(" !"))
        else:
            pos_patterns.append(line)

    basename_dest = os.path.basename(dist_path).split(".lst")[0]

    if version:
        dest_version_suffix = "_" + version.replace(".", "_")
    else:
        dest_version_suffix = ""

    path_dest = os.path.join(DEST, basename_dest + dest_version_suffix + ".zip")

    if os.path.isfile(path_dest):
        if force:
            print("Overwriting existing archive: " + path_dest)
        else:
            print("Archive already exists, remove or use -f option: " + path_dest)
            exit(0)

    if not os.path.exists(DEST):
        os.mkdir(DEST)

    z = zipfile.ZipFile(path_dest, "w", compression=zipfile.ZIP_DEFLATED)

    for root, dirs, files in os.walk(SRC):
        for file in files:
            path_curr_rel = os.path.join(root, file)
            path_root_rel = os.path.relpath(path_curr_rel, SRC)
            if ignore_path:
                path_arc = os.path.join(basename_dest,
                        os.path.basename(path_root_rel))
            else:
                path_arc = os.path.join(basename_dest, path_root_rel)

            if check_path(path_root_rel, pos_patterns, neg_patterns):
                print("Writing:", path_root_rel)

                if path_root_rel == "external/deploy/assets/assets.json":
                    assets = assets_cleanup(path_curr_rel, pos_patterns,
                            neg_patterns)
                    # modify access rights
                    info = zipfile.ZipInfo(path_arc)
                    info.external_attr = 0o664 << 16
                    z.writestr(info, assets)
                elif path_root_rel == "index.html":
                    index = index_cleanup(path_curr_rel, basename_dest)
                    # modify access rights
                    info = zipfile.ZipInfo(path_arc)
                    info.external_attr = 0o664 << 16
                    z.writestr(info, index)
                else:
                    z.write(path_curr_rel, path_arc)

    z.close()

    print("Archive created: " + str(path_dest))

def check_path(path, pos_patterns, neg_patterns):
    """Check path against positive and negative patterns"""
    result = False

    for pat in pos_patterns:
        # assign * to the end of the pattern to allow matching of dirs
        if not "*" in pat:
            pat = pat + "*"

        if fnmatch.fnmatch(path, pat):
            result = True

    # negative patterns have priority
    for pat in neg_patterns:
        if not "*" in pat:
            pat = pat + "*"

        if fnmatch.fnmatch(path, pat):
            result = False

    return result


def assets_cleanup(path, pos_patterns, neg_patterns):
    """Returns bytes with cleaned assets.json file"""

    try:
        fp_in = open(path, "r")
    except IOError:
        print("Assets file not found: " + path)
        exit(1)

    print("Performing cleanup: " + path)

    try:
        obj = json.load(fp_in)
    except ValueError as err:
        print("Failed to parse JSON: " + str(err))
        exit(1)

    fp_in.close()

    obj_new = assets_cleanup_obj(obj, pos_patterns, neg_patterns)

    assets_str = json.dumps(obj_new, indent=4, separators=(',', ': '),
            sort_keys=True, cls=CustomJSONEncoder)

    return assets_str.encode()

def assets_cleanup_obj(sections, pos_patterns, neg_patterns):
    sections_new = []

    for sec in sections:
        items = sec["items"]
        items_new = []

        for item in items:

            path = os.path.normpath(os.path.join("external/deploy/assets",
                    item["load_file"]))

            if check_path(path, pos_patterns, neg_patterns):
                items_new.append(item)
            else:
                print("Remove item: " + sec["name"] + ": " + item["name"])

        if len(items_new) == 0:
            print("Remove section: " + sec["name"])
        else:
            sec_new = {
                "name" : sec["name"],
                "items" : items_new
            }
            sections_new.append(sec_new)

    return sections_new

def index_cleanup(index_path, basename_dist):

    try:
        fp = open(index_path, "r")
    except IOError:
        print("Index file not found: " + index_path)
        exit(1)

    print("Performing index cleanup: " + index_path)

    index_str = fp.read()
    fp.close()

    index_spl = index_str.split("<!--" + basename_dist + "-->")

    if not len(index_spl) % 2:
        print("No pair for index exclusion directive")
        exit(1)

    out_str = ""
    for i in range(len(index_spl)):
        if not i % 2:
            out_str += index_spl[i]

    return out_str

if __name__ == "__main__":

    try:
        opts, args = getopt.getopt(sys.argv[1:], "ifv:", ["ignore-path", "version="])
    except getopt.GetoptError as err:
        help()
        exit(1)

    if len(args) != 1:
        help()
        exit(1)

    dist = args[0]
    ignore_path = False
    version = ""
    force = False

    for opt, val in opts:
        if opt in ("-i", "--ignore-path"):
            ignore_path = True
        elif opt in ("-v", "--version"):
            version = val
        elif opt == "-f":
            force = True
        else:
            help()
            exit(0)

    process_dist_list(dist, ignore_path, version, force)
