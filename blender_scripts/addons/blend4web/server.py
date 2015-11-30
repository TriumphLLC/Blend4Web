# Copyright (C) 2014-2015 Triumph LLC
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

import tornado.httpserver
import tornado.web
import tornado.websocket

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

COLOR_DICT = {
    '31': [(255, 0, 0), (128, 0, 0)],
    '32': [(0, 255, 0), (0, 128, 0)],
    '33': [(255, 255, 0), (128, 128, 0)],
    '34': [(0, 0, 255), (0, 0, 128)],
    '35': [(255, 0, 255), (128, 0, 128)],
    '36': [(0, 255, 255), (0, 128, 128)],
    '37': [(255, 255, 255), (128, 128, 128)],
    '91': [(255, 0, 0), (128, 0, 0)],
    '92': [(0, 255, 0), (0, 128, 0)],
    '93': [(255, 255, 0), (128, 128, 0)],
    '94': [(0, 0, 255), (0, 0, 128)],
    '95': [(255, 0, 255), (128, 0, 128)],
    '96': [(0, 255, 255), (0, 128, 128)],
    '97': [(255, 255, 255), (128, 128, 128)],
}

COLOR_REGEX = re.compile(r'\[(?P<arg_1>\d+)(;(?P<arg_2>\d+)(;(?P<arg_3>\d+))?)?m')
BOLD_TEMPLATE = '<span style="color: rgb{}; font-weight: bolder">'
LIGHT_TEMPLATE = '<span style="color: rgb{}">'

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

    @classmethod
    def start(cls):
        if not cls.update_server_existed():
            cls.server_status = WAIT_RESPONSE
            cls.server_process = threading.Thread(target=create_server)
            cls.server_process.daemon = True

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
                    cls.server.stop()
                    tornado.ioloop.IOLoop.instance().stop()
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

def create_server():
    port = bpy.context.user_preferences.addons[__package__].preferences.b4w_port_number
    root = bpy.context.user_preferences.addons[__package__].preferences.b4w_src_path
    allow_ext_requests = bpy.context.user_preferences.addons[__package__].preferences.b4w_enable_ext_requests

    if allow_ext_requests:
        address = ""
    else:
        address = ADDRESS

    application = tornado.web.Application([
        (r"/console/?$", ConsoleHandler),
        (r"/project/?$", ProjectRootHandler),
        (r"/project/sort/up/?$", ProjectSortUpHandler),
        (r"/project/sort/down/?$", ProjectSortDownHandler),
        (r"/project/show_b4w/?$", ProjectShowHandler),
        (r"/project/hide_b4w/?$", ProjectHideHandler),
        (r"/project/import/?$", UploadFile),
        (r"/project/.+$", ProjectRequestHandler),
        (r"/create/?$", ProjectCreateHandler),
        (r"/run_blender/(.*)$", RunBlenderHandler),
        (r"/tests/send_req_post/?$", TestSendReqPost),
        (r"/(.*)$", StaticFileHandlerNoCache,
            { "path": root, "default_filename": DEFAULT_FILENAME}),

    ])

    try:
        B4WLocalServer.server = tornado.httpserver.HTTPServer(application, max_buffer_size=10*1024*1024*1024)
        B4WLocalServer.server.listen(port, address=address)
        B4WLocalServer.server_status = SUB_THREAD_START_SERV_OK
        print("serving at port", port)
        c = tornado.ioloop.PeriodicCallback(ConsoleHandler.console_cb, 100)
        c.start()
        tornado.ioloop.IOLoop.instance().start()

        print("stop serving at port", port)
        B4WLocalServer.waiting_for_shutdown = False
        B4WLocalServer.server_status = SUB_THREAD_STOP_SERV_OK
    except OSError as ex:
        B4WLocalServer.server_process = None
        B4WLocalServer.server_status = SUB_THREAD_SERVER_EXC
        B4WLocalServer.error_message = str(ex)
    except BaseException as ex:
        B4WLocalServer.server_process = None
        B4WLocalServer.server_status = SUB_THREAD_OTHER_EXC
        B4WLocalServer.error_message = str(ex)

class StaticFileHandlerNoCache(tornado.web.StaticFileHandler):
    def set_extra_headers(self, path):
        # Disable cache
        self.set_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.set_header("Expires", "0")
        now = datetime.datetime.now()
        exp = datetime.datetime(now.year - 1, now.month, now.day)
        self.set_header("Last-Modified", exp)
        self.add_header("B4W.LocalServer", "1")

class UploadFile(tornado.web.RequestHandler):
    def post(self):
        if not "zip_file" in self.request.files:
            return self.send_error(status_code=400)

        temp_file = tempfile.NamedTemporaryFile(mode="wb", suffix=".zip", delete=False)
        temp_file.write(self.request.files["zip_file"][0]["body"])
        temp_file.seek(0)
        temp_file.close()

        self.redirect("/project/import/" + quote(temp_file.name, safe=""))

class TestSendReqPost(tornado.web.RequestHandler):
    def post(self):
        req = json.loads(self.request.body.decode("utf-8"))
        if req["field1"] == 1 and req["field2"] == 2:
            resp = {"resp":2}
        else:
            resp = {}
        self.write(resp)

class ProjectRootHandler(tornado.web.RequestHandler):
    def get(self):
        root = bpy.context.user_preferences.addons[__package__].preferences.b4w_src_path
        scripts_path = join(root, "scripts")
        python_path = bpy.app.binary_path_python

        # temporary fix
        if sys.platform == "darwin" and python_path == "/usr/bin/python":
            if not shutil.which("/Library/Frameworks/Python.framework/Versions/3.4/bin/python3"):
                self.write("Python3 not found")
                return

            python_path = "/Library/Frameworks/Python.framework/Versions/3.4/bin/python3"

        cmd = [python_path, join(root, "apps_dev", "project.py"),
                "--no-colorama"]

        tpl_html_file = open(join(root, "index_assets", "templates", "projects.tmpl"), "r")
        tpl_html_str = tpl_html_file.read()
        tpl_html_file.close()

        cmd.append("list")

        out = self.exec_proc_sync(cmd, root)

        if out[0]:
            self.write("Project list error")
            return

        proj_strs = out[1].splitlines()
        proj_strs.sort()

        table_insert = ""

        sort_type = "up"
        sort_link = "down"
        hide_b4w = False
        show_hide_link = "/project/hide_b4w/"
        show_hide_text = "Hide"

        if self.get_cookie("hide_b4w") == "hide":
            hide_b4w = True
            show_hide_link = "/project/show_b4w/"
            show_hide_text = "Show"

        if self.get_cookie("sort") == "down":
            sort_type = "down"
            sort_link = "up"

        if sort_type == "down":
            proj_strs.reverse()
        else:
            proj_strs.sort()

        for s in proj_strs:
            name = s.split("->")[0].strip(" ")
            path = s.split("->")[1].strip(" ")

            pmod = imp.find_module("project_cli",
                    [join(scripts_path, "lib")])
            proj = imp.load_module("project_cli", pmod[0], pmod[1], pmod[2])

            path_abs = normpath(join(root, path))
            proj_cfg = proj.get_proj_cfg(path_abs)

            author = proj.proj_cfg_value(proj_cfg, "info", "author")

            if author == "Blend4Web" and hide_b4w:
                continue

            build_dir = normpath(proj.proj_cfg_value(proj_cfg, "paths",
                    "build_dir", ""))

            table_insert += "<tr>"
            table_insert += '<td>'
            table_insert += name

            # TODO: specify apps config syntax (including dev-build separation)
            apps = proj.proj_cfg_value(proj_cfg, "compile", "apps", [])

            if not len(apps):
                dev_app = join(path, name + "_dev.html")

                if exists(normpath(join(root, dev_app))):
                    apps.append(proj.unix_path(dev_app))

                build_app = join(build_dir, name + ".html")

                if exists(normpath(join(root, build_app))):
                    apps.append(proj.unix_path(build_app))

                engine_type = proj.proj_cfg_value(proj_cfg, "compile", "engine_type", None)

                if engine_type == "webplayer_html":
                    apps.extend([join(i, name + ".html")
                        for i in proj.proj_cfg_value(proj_cfg, "paths", "assets_dirs")
                            if exists(join(i, name + ".html"))])

                if engine_type == "webplayer_json":
                    apps.extend([proj.unix_path(join("apps_dev", "webplayer", "webplayer_dev.html?load=", i, name + ".json"))
                        for i in proj.proj_cfg_value(proj_cfg, "paths", "assets_dirs")
                            if exists(join(root, i, name + ".json"))])

            else:
                dev_apps = [proj.unix_path(join(path, app))
                        for app in apps if exists(join(root, path, app))]
                build_apps = [proj.unix_path(join(build_dir, app))
                        for app in apps if exists(join(root, build_dir, app))]

                apps = []

                apps.extend(dev_apps)
                apps.extend(build_apps)

            for app in apps:
                table_insert += self.app_link(app)

            table_insert += '</td>'

            table_insert += '<td>'

            path_insert = proj.unix_path(path)
            table_insert += self.shorten(path_insert, 50)

            build_dir_insert = proj.unix_path(normpath(build_dir))

            if build_dir_insert != path_insert and build_dir_insert != '.':
                table_insert +=  '<br>'
                table_insert += self.shorten(build_dir_insert, 50)

            table_insert += '</td>'


            blend_dirs = proj.proj_cfg_value(proj_cfg, "paths", "blend_dirs", [])

            table_insert += '<td>'

            for blend_dir in blend_dirs:
                blend_dir_obj = pathlib.Path(normpath(join(root, blend_dir)))
                blend_files = list(blend_dir_obj.rglob('*.blend'))
                blend_files.sort()

                content = ""

                for file in blend_files:
                    link = proj.unix_path(relpath(str(file), root))
                    content += self.blend_link(link) + "<br>"

                table_insert += self.file_group(table_insert, root, blend_dir,
                        content);

            table_insert += '</td>'

            assets_dirs = proj.proj_cfg_value(proj_cfg, "paths", "assets_dirs", [])

            table_insert += '<td>'
            for assets_dir in assets_dirs:
                assets_dir_obj = pathlib.Path(normpath(join(root, assets_dir)))
                json_files = list(assets_dir_obj.rglob('*.json'))
                json_files.sort()

                content = ""
                for file in json_files:
                    link = proj.unix_path(relpath(str(file), root))
                    content += self.json_link(link) + "<br>"

                table_insert += self.file_group(table_insert, root,
                        assets_dir, content);
            table_insert += '</td>'

            table_insert += '<td>'

            if (proj.proj_cfg_value(proj_cfg, "compile", "engine_type", None) in
                    ["external", "copy", "compile", "update"]):
                table_insert += ('<a href=/project/-p/' +
                        quote(normpath(path), safe="") +
                        '/compile/>compile project</a><br>')

            table_insert += ('<a href=/project/-p/' +
                    quote(normpath(path), safe="") +
                    '/reexport/-b/' +
                    quote(bpy.app.binary_path, safe="") +
                    '/>re-export scenes</a><br>')

            table_insert += ('<a href=/project/-p/' +
                    quote(normpath(path), safe="") +
                    '/convert_resources/>convert resources</a><br>')

            table_insert += ('<a href=/project/export/' +
                             quote(normpath(basename(path)), safe="") + '/' +
                             quote(normpath(join("tmp", "downloads", name + ".zip")), safe="") +
                             '>export project archive</a><br>')

            table_insert += ('<a onclick="show_confirm_window(this);return false;" href=/project/-p/' +
                    quote(normpath(path), safe="") +
                    '/remove/>remove project</a>')

            table_insert += '</td>'

            table_insert += "</tr>"

        html_insertions = dict(table_insert=table_insert,
                               sort=sort_type,
                               show_hide_text=show_hide_text,
                               show_hide_link=show_hide_link,
                               link="/project/sort/" + sort_link + "/")

        out_html_str = string.Template(tpl_html_str).substitute(html_insertions)

        self.write(out_html_str)

    def exec_proc_sync(self, cmd, root):
        cwd = os.getcwd()

        # switch to SDK
        os.chdir(root)

        try:
            out = (0, subprocess.check_output(cmd, stderr=subprocess.STDOUT,
                    universal_newlines=True))
        except subprocess.CalledProcessError as ex:
            out = (ex.returncode, ex.output)

        # restore
        os.chdir(cwd)

        return out

    def app_link(self, link):
        return ('<br><a class="spoiler" href="/' + link + '">' +
                basename(link) + '</a>')

    def blend_link(self, link):
        return ('<a class="spoiler" href="/run_blender/' + link + '">' +
                self.shorten(link) + '</a>')

    def html_link(self, link):
        return ('<a class="spoiler" href="/' + link + '">' +
                self.shorten(link) + '</a>')

    def json_link(self, link):
        return ('<a class="spoiler" ' + 
                'href="/apps_dev/viewer/viewer_dev.html?load=../../' + link +
                '">' + self.shorten(link) + '</a>')

    def shorten(self, s, maxlen=60):
        if len(s) > maxlen:
            return "..." + s[-(maxlen-3):]
        else:
            return s

    def file_group(self, s, root, dir, content):
        if not len(content):
            return ""

        tpl_html_file = open(join(root, "index_assets", "templates", "spoiler.tmpl"), "r")
        tpl_html_str = tpl_html_file.read()
        tpl_html_file.close()

        id = hashlib.md5((dir+content).encode()).hexdigest()

        header = self.shorten(dir.strip("/ ") + "/*", 50)

        html_insertions = dict(id=id, header=header, content=content)

        return string.Template(tpl_html_str).substitute(html_insertions)

class ProjectSortUpHandler(tornado.web.RequestHandler):
    def get(self):
        self.set_cookie("sort", "up")
        self.redirect("/project/")

class ProjectSortDownHandler(tornado.web.RequestHandler):
    def get(self):
        self.set_cookie("sort", "down")
        self.redirect("/project/")

class ProjectShowHandler(tornado.web.RequestHandler):
    def get(self):
        self.set_cookie("hide_b4w", "show")
        self.redirect("/project/")

class ProjectHideHandler(tornado.web.RequestHandler):
    def get(self):
        self.set_cookie("hide_b4w", "hide")
        self.redirect("/project/")

class ProjectRequestHandler(tornado.web.RequestHandler):
    def get(self):
        root = bpy.context.user_preferences.addons[__package__].preferences.b4w_src_path

        if not ConsoleHandler.console_proc:
            req = self.request.uri.replace("/project/", "").strip("/? ")

            scripts_path = join(root, "scripts")

            python_path = bpy.app.binary_path_python

            # temporary fix
            if sys.platform == "darwin" and python_path == "/usr/bin/python":
                if not shutil.which("/Library/Frameworks/Python.framework/Versions/3.4/bin/python3"):
                    self.write("python3 not found")
                    return

                python_path = "/Library/Frameworks/Python.framework/Versions/3.4/bin/python3"

            cmd = [python_path, join(root, "apps_dev", "project.py"),
                    "--no-colorama"]

            is_export = False

            for part in req.split("/"):
                if part == "export":
                    is_export = True

                cmd.append(unquote(part))

            if is_export:
                file_dir = join(root, os.path.dirname(cmd[-1]))
                os.makedirs(file_dir,  exist_ok=True)
                port = bpy.context.user_preferences.addons[__package__].preferences.b4w_port_number

                pmod = imp.find_module("project_cli",
                        [join(scripts_path, "lib")])
                proj = imp.load_module("project_cli", pmod[0], pmod[1], pmod[2])

                ConsoleHandler.export_link = "/" + proj.unix_path(cmd[-1])

            ConsoleHandler.console_proc = self.exec_proc_async_pipe(cmd, root)

            html_file = open(join(root, "index_assets", "templates", "request.tmpl"), "r")
        else:
            html_file = open(join(root, "index_assets", "templates", "request_busy.tmpl"), "r")

        html_str = html_file.read()
        html_file.close()

        html_insertions = dict(export_link=ConsoleHandler.export_link)

        out_html_str = string.Template(html_str).substitute(html_insertions)

        self.write(out_html_str)

    def exec_proc_async_pipe(self, cmd, root):
        cwd = os.getcwd()

        # switch to SDK
        os.chdir(root)

        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT, universal_newlines=True)

        # restore
        os.chdir(cwd)

        console_queue = queue.Queue()
        ConsoleHandler.console_queue = console_queue

        t = threading.Thread(target=self.enqueue_output, args=(proc.stdout,
                console_queue))
        t.daemon = True
        t.start()

        return proc

    def enqueue_output(self, out, queue):
        for line in iter(out.readline, ""):
            queue.put(line)
        out.close()


class ProjectCreateHandler(tornado.web.RequestHandler):
    def get(self):
        root = bpy.context.user_preferences.addons[__package__].preferences.b4w_src_path

        tpl_html_file = open(join(root, "index_assets", "templates", "create_form.tmpl"), "r")
        tpl_html_str = tpl_html_file.read()
        tpl_html_file.close()

        html_insertions = dict(blender_exec=quote(bpy.app.binary_path, safe=""))

        html_str = string.Template(tpl_html_str).substitute(html_insertions)

        self.write(html_str)

class RunBlenderHandler(tornado.web.RequestHandler):
    def get(self, tail):
        root = bpy.context.user_preferences.addons[__package__].preferences.b4w_src_path

        cmd = [bpy.app.binary_path]
        cmd.append(normpath(join(root, tail.strip("/? "))))

        proc = subprocess.Popen(cmd);

        html_file = open(join(root, "index_assets", "templates", "run_blender.tmpl"), "r")
        html_str = html_file.read()
        html_file.close()

        self.write(html_str)

class ConsoleHandler(tornado.websocket.WebSocketHandler):
    websocket_conn = None
    console_proc = None
    console_queue = None
    export_link = ""

    def open(self, *args):
        self.__class__.websocket_conn = self

    def on_message(self, message):
        pass

    def on_close(self):
        self.__class__.console_proc = None
        self.__class__.websocket_conn = None

    @classmethod
    def console_cb(cls):
        if not (cls.websocket_conn and cls.console_proc):
            return

        while True:
            try:
                line = cls.console_queue.get_nowait()
            except queue.Empty:
                break
            else:
                cls.websocket_conn.write_message(cls.ansi_to_html(line))

        if cls.console_proc.poll() != None:
            cls.console_proc = None
            cls.websocket_conn.close()
            cls.export_link = ""
            cls.websocket_conn = None

    @classmethod
    def ansi_to_html(cls, text):
        text = text.replace('[0m', '</span>')

        def single_sub(match):
            argsdict = match.groupdict()
            if argsdict['arg_3'] is None:
                if argsdict['arg_2'] is None:
                    color, bold = argsdict['arg_1'], 0
                else:
                    color, bold = argsdict['arg_1'], int(argsdict['arg_2'])
            else:
                color, bold = argsdict['arg_2'], int(argsdict['arg_3'])

            if bold:
                return BOLD_TEMPLATE.format(COLOR_DICT[color][1])
            return LIGHT_TEMPLATE.format(COLOR_DICT[color][0])

        return COLOR_REGEX.sub(single_sub, text)

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
    bpy.utils.register_class(B4WStartServer)
    bpy.utils.register_class(B4WShutdownServer)
    bpy.utils.register_class(B4WOpenSDK)
    bpy.utils.register_class(B4WOpenProjManager)
    bpy.utils.register_class(B4WPreviewScene)
    bpy.utils.register_class(B4WServerMessage)

def unregister():
    bpy.utils.unregister_class(B4WStartServer)
    bpy.utils.unregister_class(B4WShutdownServer)
    bpy.utils.unregister_class(B4WOpenSDK)
    bpy.utils.unregister_class(B4WOpenProjManager)
    bpy.utils.unregister_class(B4WPreviewScene)
    bpy.utils.unregister_class(B4WServerMessage)
