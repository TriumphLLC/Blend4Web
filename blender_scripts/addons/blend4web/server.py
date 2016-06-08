import bpy
from bpy.props import StringProperty

import datetime
import os
import sys
import threading
import time
import webbrowser
import requests
import subprocess
import string
from collections import OrderedDict

import re
import imp
import queue
import pathlib
import hashlib
import shutil
import tempfile
import json

from os.path import basename, exists, join, normpath, relpath

from urllib.parse import quote, unquote

import blend4web
b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_, get_translate

WAIT_RESPONSE               = -1
SUB_THREAD_START_SERV_OK    = 0
SUB_THREAD_SERVER_EXC       = 1
SUB_THREAD_STOP_SERV_OK     = 2
SUB_THREAD_OTHER_EXC        = 3
MAIN_THREAD_START_EXC       = 4
MAIN_THREAD_STOP_EXC        = 5

ADDRESS = "localhost"
DEFAULT_FILENAME = "index.html"
WAITING_TIME = 10
STATUS_OK = 200

class B4WServerMessage(bpy.types.Operator):
    bl_idname = "b4w.server_message"
    bl_label = p_("Warning: Server error.", "Operator")
    bl_options = {"INTERNAL"}

    message = StringProperty(name=_("Message string"))

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        wm = context.window_manager
        context.window.cursor_set("DEFAULT")
        return wm.invoke_props_dialog(self, 450)

    def draw(self, context):
        self.layout.label(self.message, icon="ERROR")

class B4WLocalServer():

    server = None
    server_process = None
    server_status = WAIT_RESPONSE

    waiting_for_shutdown = False
    server_was_found_at_start = False

    error_message = ""

    proj_serv_mod = None

    @classmethod
    def get_root(cls):
        return bpy.context.user_preferences.addons[__package__].preferences.b4w_src_path

    @classmethod
    def get_proj_serv(cls):
        # improves performance and fixes shutdown issue
        # when no b4w_src_path available
        if cls.proj_serv_mod:
            return cls.proj_serv_mod

        root = cls.get_root()
        scripts_path = join(root, "scripts")
        proj_serv_tup = imp.find_module("project_server", [scripts_path])
        proj_serv = imp.load_module("project_util", proj_serv_tup[0],
                proj_serv_tup[1], proj_serv_tup[2])
        cls.proj_serv_mod = proj_serv
        return proj_serv

    @classmethod
    def get_python_binary(cls, minor_versions):
        python_path = bpy.app.binary_path_python

        # temporary OSX fix
        if sys.platform == "darwin" and python_path == "/usr/bin/python":

            # 1) try to find python in the distribution
            for mv in minor_versions:
                for suff in ["", "m"]:
                    path = normpath(os.path.join(
                        os.path.dirname(bpy.app.binary_path), "../Resources",
                        bpy.app.version_string[:4],"python", "bin", "python3.%s%s" % (mv, suff)))

                    if shutil.which(path):
                        return path

            # 2) try to find installed
            for mv in minor_versions:
                for suff in ["", "m"]:
                    path = "/Library/Frameworks/Python.framework/Versions/3.%s/bin/python3%s" % (minor_version, suff)
                    if shutil.which(path):
                        return path
        else:
            return python_path
        return None

    @classmethod
    def start(cls):
        if not cls.update_server_existed():
            root = cls.get_root()
            port = bpy.context.user_preferences.addons[__package__].preferences.b4w_port_number
            allow_ext_requests = bpy.context.user_preferences.addons[__package__].preferences.b4w_enable_ext_requests

            python_path = cls.get_python_binary(["5", "4"])
            if not python_path:
                print("Python3 not found", file=sys.stderr)
                return
            
            blender_path = bpy.app.binary_path

            proj_serv = cls.get_proj_serv()

            cls.server_status = WAIT_RESPONSE
            cls.server_process = threading.Thread(
                    target=proj_serv.create_server,
                    args=(root, port, allow_ext_requests, python_path,
                            blender_path, B4WLocalServer))
            cls.server_process.daemon = True

            #for converting resources on MACOS
            if sys.platform == "darwin" and not ":/usr/local/bin" in os.environ["PATH"]:
                os.environ["PATH"] = os.environ["PATH"] + ":/usr/local/bin"

            try:
                cls.server_process.start()
            except BaseException as ex:
                cls.server_status = MAIN_THREAD_START_EXC
                cls.server_process = None
                bpy.ops.b4w.server_message("INVOKE_DEFAULT", 
                        message=get_translate(_("Server starting error: ")) + str(ex))

            cls.wait_loop()

            if cls.server_status == SUB_THREAD_SERVER_EXC:
                bpy.ops.b4w.server_message("INVOKE_DEFAULT", 
                        message=get_translate(_("Server starting error: ")) +  cls.error_message)
            if cls.server_status == SUB_THREAD_OTHER_EXC:
                bpy.ops.b4w.server_message("INVOKE_DEFAULT", 
                        message=get_translate(_("Could not start the server: ")) + cls.error_message)

            cls.panel_redraw()

    @classmethod
    def shutdown(cls):
        if cls.server_process is not None:
            cls.server_status = WAIT_RESPONSE
            cls.waiting_for_shutdown = True
            try:
                if cls.server is not None:
                    proj_serv = cls.get_proj_serv()
                    proj_serv.stop_server()
                    cls.server.stop()
                cls.server_process = None
                cls.server = None
                cls.wait_loop()
            except BaseException as ex:
                cls.waiting_for_shutdown = False
                bpy.ops.b4w.server_message("INVOKE_DEFAULT", 
                        message=get_translate(_("Server stopping error: ")) + str(ex))
                cls.server_status = MAIN_THREAD_STOP_EXC

            cls.panel_redraw()

    @classmethod
    def update_server_existed(cls):
        is_existed = cls.check_server_existance()

        if is_existed:
            cls.server_status = SUB_THREAD_START_SERV_OK
        else:
            cls.server_status = SUB_THREAD_STOP_SERV_OK

        cls.panel_redraw()
        return is_existed

    @classmethod
    def check_server_existance(cls):
        server_found = False
        try:
            port = bpy.context.user_preferences.addons[__package__].preferences.b4w_port_number
            session = requests.Session()
            session.trust_env = False
            req = session.head("http://localhost:" + str(port))
        except:
            pass
        else:
            if (req.status_code == STATUS_OK and "B4W.LocalServer" in req.headers
                    and req.headers["B4W.LocalServer"] == "1"):
                server_found = True

        cls.server_was_found_at_start = server_found
        return server_found

    @classmethod
    def wait_loop(cls):
        begin_time = time.time()
        while cls.server_status == WAIT_RESPONSE:
            if time.time() - begin_time > WAITING_TIME:
                cls.waiting_for_shutdown = False
                cls.server_status = SUB_THREAD_STOP_SERV_OK
                break

    @classmethod
    def get_server_status(cls):
        return cls.server_status

    @classmethod
    def is_waiting_for_shutdown(cls):
        return cls.waiting_for_shutdown

    @classmethod
    def panel_redraw(cls):
        prop_area = None
        if bpy.context.screen:
            for area in bpy.context.screen.areas:
                if area.type == "PROPERTIES":
                    prop_area = area
        if prop_area:
            prop_area.tag_redraw()

    @classmethod
    def allow_actions(cls):
        # allow actions (starting/stopping) for the main server instance or for 
        # any instance if server wasn't already started
        return cls.server_process is not None or not cls.server_was_found_at_start

    @classmethod
    def open_url(cls, url):
        can_open = True
        if cls.server_process is None:
            can_open = cls.update_server_existed()
        if can_open:
            open_browser(url)

class B4WShutdownServer(bpy.types.Operator):
    bl_idname = "b4w.stop_server"
    bl_label = p_("B4W Stop Server", "Operator")
    bl_description = _("Stop server")
    bl_options = {"INTERNAL"}

    def execute(self, context):
        B4WLocalServer.shutdown()
        return {"FINISHED"}

class B4WStartServer(bpy.types.Operator):
    bl_idname = "b4w.start_server"
    bl_label = p_("B4W Start Server", "Operator")
    bl_description = _("Start server")
    bl_options = {"INTERNAL"}

    def execute(self, context):
        B4WLocalServer.start()
        return {"FINISHED"}

class B4WOpenSDK(bpy.types.Operator):
    bl_idname = "b4w.open_sdk"
    bl_label = p_("B4W Open SDK", "Operator")
    bl_description = _("Open Blend4Web SDK")
    bl_options = {"INTERNAL"}

    def execute(self, context):
        port = context.user_preferences.addons[__package__].preferences.b4w_port_number
        B4WLocalServer.open_url("http://" + ADDRESS + ":" + str(port))
        return {"FINISHED"}

class B4WOpenProjManager(bpy.types.Operator):
    bl_idname = "b4w.open_proj_manager"
    bl_label = p_("B4W Open Project Manager", "Operator")
    bl_description = _("Open Project Manager")
    bl_options = {"INTERNAL"}

    def execute(self, context):
        port = context.user_preferences.addons[__package__].preferences.b4w_port_number
        B4WLocalServer.open_url("http://" + ADDRESS + ":" + str(port) +
                "/project/")
        return {"FINISHED"}

class B4WPreviewScene(bpy.types.Operator):
    bl_idname = "b4w.preview"
    bl_label = p_("B4W Preview", "Operator")
    bl_description = _("Preview the current scene in the Viewer")
    bl_options = {"INTERNAL"}

    def execute(self, context):
        root = bpy.context.user_preferences.addons[__package__].preferences.b4w_src_path
        tmpdir = join(root, "tmp")
        if not exists(tmpdir):
            os.mkdir(tmpdir)
        bpy.ops.export_scene.b4w_json(do_autosave = False, run_in_viewer = True,
                override_filepath=join(tmpdir, "preview.json"),
                save_export_path = False)
        return {"FINISHED"}

def open_browser(url):
    try:
        webbrowser.open(url)
    except BaseException as ex:
        bpy.ops.b4w.server_message("INVOKE_DEFAULT",
                message=get_translate(_("Could not open browser: ")) + str(ex))


@bpy.app.handlers.persistent
def init_server(arg):
    if init_server in bpy.app.handlers.scene_update_pre:
        bpy.app.handlers.scene_update_pre.remove(init_server)

    if has_valid_sdk_dir():
        already_started = B4WLocalServer.update_server_existed()
        if (bpy.context.user_preferences.addons[__package__].preferences.b4w_server_auto_start
                and not already_started):
            bpy.ops.b4w.start_server()

def has_valid_sdk_dir():
    b4w_src_path = bpy.context.user_preferences.addons[__package__].preferences.b4w_src_path
    path_to_index = join(b4w_src_path, "index.html")
    normpath(path_to_index)
    return b4w_src_path != "" and exists(path_to_index)

def register():
    bpy.app.handlers.scene_update_pre.append(init_server)
