#!/usr/bin/env python3

import getopt, json, os, sys, zipfile, re

# for UNIX-like OSes only
import fnmatch

from custom_json_encoder import CustomJSONEncoder

SRC=os.path.join(os.path.abspath(os.path.dirname(__file__)), "..")
DEST=os.path.join(SRC, "deploy", "pub")
GPL_TEMPLATE=os.path.join(SRC, "scripts", "templates", "gpl_header.license")
EULA_TEMPLATE=os.path.join(SRC, "scripts", "templates", "eula_header.license")
ADDON_PATH=os.path.join("blender_scripts", "addons", "blend4web")

LICENSE_PATHS=[
    {
        "paths": [os.path.join("src", "*.js")], 
        "file_type": ".js", 
        "license_type": set(("free", "pro")), 
        "except_paths": []
    },
    {
        "paths": [os.path.join(ADDON_PATH, "*.py")], 
        "file_type": ".py", 
        "license_type": set(("free",)), 
        "except_paths": [os.path.join(ADDON_PATH, "lib", "*.py")]
    },
]

def help():
    print("Usage: make_dist.py [-v version] [-f] DIST_FILE")

def process_dist_list(dist_path, version, force):
    print("Creating a distribution archive from " + str(dist_path))

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
            if check_path(path_root_rel, pos_patterns, neg_patterns):
                try:
                    path_arc = os.path.join(basename_dest, 
                            find_file_path(path_root_rel, pos_patterns))
                except ValueError as err:
                    print("Failed to create file: " + str(err))
                    exit(0)

                print("Writing:", path_root_rel)

                if (path_root_rel == "apps_dev/viewer/assets.json" or 
                        path_root_rel == "deploy/apps/viewer/assets.json"):
                    assets = assets_cleanup(path_curr_rel, pos_patterns,
                            neg_patterns)
                    # modify access rights
                    info = zipfile.ZipInfo(path_arc)
                    info.external_attr = 0o664 << 16
                    z.writestr(info, assets)
                elif path_root_rel == "index.html":
                    index = index_cleanup(path_curr_rel, basename_dest, version)
                    # modify access rights
                    info = zipfile.ZipInfo(path_arc)
                    info.external_attr = 0o664 << 16
                    z.writestr(info, index)
                else:
                    src = None
                    for rule in LICENSE_PATHS:
                        if check_path(path_root_rel, rule["paths"], rule["except_paths"]) \
                                and os.path.splitext(path_root_rel)[-1] == rule["file_type"]:

                            if basename_dest.split("_")[-1] == "pro" and "pro" in rule["license_type"]:
                                src = insert_license(path_curr_rel, rule["file_type"], EULA_TEMPLATE)
                            else:
                                if "free" in rule["license_type"]:
                                    src = insert_license(path_curr_rel, rule["file_type"], GPL_TEMPLATE)
                                elif "pro" in rule["license_type"]:
                                    src = insert_license(path_curr_rel, rule["file_type"], EULA_TEMPLATE)

                    if src:
                        # modify access rights
                        info = zipfile.ZipInfo(path_arc)
                        info.external_attr = 0o664 << 16
                        z.writestr(info, src)
                    else:
                        z.write(path_curr_rel, path_arc)

    z.close()

    print("Archive created: " + str(path_dest))

def insert_license(path, file_type, license_path):
    try:
        fp = open(path, "r")
    except IOError:
        print("Source file not found: " + path)
        exit(1)

    try:
        lic_fp = open(license_path, "r")
    except IOError:
        print("License file not found: " + license_path)
        exit(1)
    
    print("Insert license into file: " + path)

    in_str = fp.read()
    fp.close()

    lic_lines = lic_fp.readlines()
    lic_fp.close()

    out_str = ""
    if file_type == ".py":
        for line in lic_lines:
            out_str += "# " + line
        out_str += os.linesep * 2
    elif file_type == ".js":
        out_str += "/**" + os.linesep
        for line in lic_lines:
            out_str += ' * ' + line
        out_str += ' */' + os.linesep * 2

    out_str += in_str
    return out_str

def check_path(path, pos_patterns, neg_patterns):
    """Check path against positive and negative patterns"""
    result = False

    for pat in pos_patterns:
        # assign * to the end of the pattern to allow matching of dirs
        if pat[-1] != "*":
            pat = pat + "*"

        match = re.compile(r"^\d+\^").search(pat)

        if match:
            abs_path = pat.split(match.group())[1]
        else:
            abs_path = pat

        if fnmatch.fnmatch(path, abs_path):
            result = True

    # negative patterns have priority
    for pat in neg_patterns:
        if pat[-1] != "*":
            pat = pat + "*"

        if fnmatch.fnmatch(path, pat):
            result = False

    return result

def find_file_path(path, pos_patterns):

    path_arc = ""
    for pat in pos_patterns:
        match = re.compile(r"^\d+\^").search(pat)
        if match:
            abs_path = pat.split(match.group())[1]
            if abs_path[-1] != "*":
                abs_path += "*"
            if fnmatch.fnmatch(path, abs_path):
                abs_path = abs_path[0:-1]
                offset = int(match.group().split("^")[0])
                num = len(abs_path.split("/")) - offset
                if num < 0:
                    raise ValueError("Wrong num %i" % offset)
                for i in range(0, num):
                    abs_path = os.path.split(abs_path)[0]
                path_arc = os.path.relpath(path, abs_path)
                return path_arc
        else:
            if fnmatch.fnmatch(path, pat):
                return path
    return path
            

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

            path = os.path.normpath(os.path.join("deploy/assets",
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

def index_cleanup(index_path, basename_dist, version):

    try:
        fp = open(index_path, "r")
    except IOError:
        print("Index file not found: " + index_path)
        exit(1)

    print("Prepocessing index: " + index_path)

    index_str = fp.read()
    fp.close()

    # strip suffixes to simplify release process
    version_pure = version.replace("_pre", "").replace("_rc", "")

    # process version
    index_str = index_str.replace("<!--version-->", version_pure)

    # process exclusion directives
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
        opts, args = getopt.getopt(sys.argv[1:], "fv:", ["version="])
    except getopt.GetoptError as err:
        help()
        exit(1)

    if len(args) != 1:
        help()
        exit(1)

    dist = args[0]
    version = ""
    force = False

    for opt, val in opts:
        if opt in ("-v", "--version"):
            version = val
        elif opt == "-f":
            force = True
        else:
            help()
            exit(0)

    process_dist_list(dist, version, force)
