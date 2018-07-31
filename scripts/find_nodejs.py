import platform
import os
from os.path import (join, realpath, dirname, normpath)

import lzma
import tarfile

import zipfile

def node_bin_dir():
    osname = platform.system()

    # default
    node_dir = join("node-v8.9.4-linux-x86", "bin")
    if platform.machine() == "x86_64":
        node_dir = join("node-v8.9.4-linux-x64", "bin")

    if osname == "Windows":
        node_dir = join("node-v8.9.4-win-x86")
    elif osname == "Darwin":
        node_dir = join("node-v8.9.4-darwin-x64", "bin")
    root = join(dirname(realpath(__file__)), "..", "tools", "node")

    return normpath(join(root, node_dir))

def node_path():
    node_dir = node_bin_dir()
    osname = platform.system()
    node = "node"
    if osname == "Windows":
        node = "node.exe"

    return join(node_dir, node)

def npm_path():
    node_dir = node_bin_dir()
    osname = platform.system()
    npm = "npm"
    if osname == "Windows":
        npm = "npm.cmd"

    return join(node_dir, npm)

def node_dist():
    osname = platform.system()
    root = os.path.join(dirname(realpath(__file__)), "..", "tools", "node")
    name = "node-v8.9.4-linux-x86.tar.xz"
    if platform.machine() == "x86_64":
        name = "node-v8.9.4-linux-x64.tar.xz"
    if  osname == "Windows":
        name = "node-v8.9.4-win-x86.zip"
    elif osname == "Darwin":
        name = "node-v8.9.4-darwin-x64.tar.gz"
    
    return normpath(os.path.join(root, name))

def winapi_path(dos_path, encoding=None):
    path = os.path.abspath(dos_path)
    if path.startswith("\\\\"):
        path = "\\\\?\\UNC\\" + path[2:]
    else:
        path = "\\\\?\\" + path 
    return path

# solution for unzip long paths
class ZipfileLongPaths(zipfile.ZipFile):
    def _extract_member(self, member, targetpath, pwd):
        targetpath = winapi_path(targetpath)
        return zipfile.ZipFile._extract_member(self, member, targetpath, pwd)

def ensure_node():
    if not (os.path.exists(node_path()) and os.path.exists(npm_path())):
        dist = node_dist()
        dest = os.path.dirname(dist)
        if not os.path.exists(dist):
            return False
        if dist.endswith("tar.xz"):
            with lzma.open(dist) as f:
                with tarfile.open(fileobj=f) as tar:
                    tar.extractall(dest)
        if dist.endswith(".zip"):            
            with ZipfileLongPaths(dist,"r") as zip:
                zip.extractall(dest)
        if dist.endswith("tar.gz"):
            with tarfile.open(dist) as tar:
                tar.extractall(dest)
    return True

if __name__ == "__main__":
    if ensure_node():
        print({
            "node": node_path(),
            "npm": npm_path()
        })