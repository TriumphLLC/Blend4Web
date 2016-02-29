#!/usr/bin/env python3

import os, sys

def get_base_dir(curr_work_dir):

    curr_dir = curr_work_dir

    while True:
        try:
            ver_file_path = os.path.join(curr_dir, "VERSION")

            with open(ver_file_path) as f:
                lines = f.readlines()

            params = lines[0].split()

            if params[0] == "Blend4Web":
                return os.path.normpath(curr_dir)
        except:
            pass

        up_dir = os.path.normpath(os.path.join(curr_dir, ".."))

        if up_dir == curr_dir:
            return None
        else:
            curr_dir = up_dir

if __name__ == "__main__":

    curr_work_dir = os.getcwd()

    base_dir = get_base_dir(curr_work_dir)

    if not base_dir:
        print("Blend4Web SDK not found, project management is not available")
        print("it's possible that you run this script outside SDK or SDK is broken")
        exit(1)

    sys.path.append(os.path.join(base_dir, "scripts", "lib"))

    import project_cli
    project_cli.run(sys.argv, base_dir)
