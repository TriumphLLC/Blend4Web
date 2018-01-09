import platform
import os
from os.path import (join, realpath, dirname, normpath)
def node_path():
    osname = platform.system()
    node_exec = join("node-v8.9.1-linux-x86", "bin", "node")
    if platform.machine() == "x86_64":
        node_exec = join("node-v8.9.1-linux-x64", "bin", "node")
    if osname == "Windows":
        node_exec = join("node-v8.9.1-win-x86", "node.exe")
    elif osname == "Darwin":
        node_exec = join("node-v8.9.1-darwin-x64", "bin", "node")

    root = join(dirname(realpath(__file__)), "..", "tools", "node")

    return normpath(join(root, node_exec))