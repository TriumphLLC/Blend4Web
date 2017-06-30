#!/usr/bin/env python3

import datetime
import getopt
import hashlib
import imp
import json
import os
import pathlib
import re
import shutil
import subprocess
import string
import sys
import tempfile
import threading

from os.path import basename, exists, join, normpath, relpath
from collections import OrderedDict
from urllib.parse import quote, unquote

# NOTE: consider that path to lib directory will never change
sys.path.append(join(os.path.abspath(os.path.dirname(__file__)), "lib"))

import tornado.httpserver
import tornado.web
import tornado.websocket
import tornado.queues

# NOTE: should match same enums in addon's server.py
SUB_THREAD_START_SERV_OK    = 0
SUB_THREAD_SERVER_EXC       = 1
SUB_THREAD_STOP_SERV_OK     = 2
SUB_THREAD_OTHER_EXC        = 3

ADDRESS = "localhost"
DEFAULT_FILENAME = "index.html"

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

CGC_PATH = "cgc"

MAX_SHOWN_FILE_GRP_ITEMS = 3

_root = None
_port = None
_python_path = None
_blender_path = None
_use_comp_player = False

def create_server(root, port, allow_ext_requests, python_path, blender_path, B4WLocalServer):
    global _root, _port, _python_path, _blender_path

    _root = root
    _port = port
    _python_path = python_path
    _blender_path = blender_path

    if allow_ext_requests:
        address = ""
    else:
        address = ADDRESS

    application = tornado.web.Application([
        (r"/console/?$", ConsoleHandler),
        (r"/project/?$", ProjectRootHandler),
        (r"/scenes_list/?$", GetScenesListHandler),
        (r"/project/sort/up/?$", ProjectSortUpHandler),
        (r"/project/sort/down/?$", ProjectSortDownHandler),
        (r"/project/show_b4w/?$", ProjectShowHandler),
        (r"/project/hide_b4w/?$", ProjectHideHandler),
        (r"/project/import/?$", UploadProjectFile),
        (r"/check_build_proj_path/$", CheckBuildProjPathHandler),
        (r"/project/upload_icon/?$", UploadIconFile),
        (r"/project/info/.+$", ProjectInfoHandler),
        (r"/project/config/.+$", ProjectConfigHandler),
        (r"/save_config/(.*)$", ProjectSaveConfigHandler),
        (r"/project/edit/.+$", ProjectEditHandler),
        (r"/project/clone_snippet/(.*)$", ProjectCloneSnippetHandler),
        (r"/project/.+$", ProjectRequestHandler),
        (r"/create/?$", ProjectCreateHandler),
        (r"/export/?$", ProjectExportHandler),
        (r"/export/show_b4w/?$", ExportShowHandler),
        (r"/export/hide_b4w/?$", ExportHideHandler),
        (r"/run_blender/(.*)$", RunBlenderHandler),
        (r"/analyze_shader/(.*)$", AnalyzeShaderHandler),
        (r"/get_file_body/(.*)$", GetFileBodyHandler),
        (r"/get_proj_names/$", GetProjNamesHandler),
        (r"/save_file/(.*)$", SaveFileHandler),
        (r"/create_file/(.*)$", CreateFileHandler),
        (r"/tests/send_req/?$", TestSendReq),
        (r"/tests/time_of_day/?$", TestTimeOfDay),
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

def get_sdk_root():
    return _root

def stop_server():
    tornado.ioloop.IOLoop.instance().stop()

class GetScenesListHandler(tornado.web.RequestHandler):
    """
    scenes data list has the following format:

    [dirname1, file1, [dirname2, file2, file3], file4, file5, [dirname3, file6, file7]]

    so first item in the list is a name of the current directory
    """
    def get(self):
        root = get_sdk_root()

        proj_util = get_proj_util_mod(root)
        assets_root = os.path.join(root, "deploy", "assets")

        def gen_dir_scene_data(curr_dir):
            scenes_data = [proj_util.unix_path(relpath(curr_dir, root))]
            listdir = os.listdir(curr_dir)
            listdir.sort()

            for f in listdir:
                f_abs_path = os.path.join(curr_dir, f)
                if os.path.isdir(f_abs_path):
                    scenes_data.append(gen_dir_scene_data(f_abs_path))
                else:
                    file_name_list = f.split(".")
                    if len(file_name_list) >= 2:
                        file_type = file_name_list[-1]
                        bin_file = ".".join(file_name_list[:-1]) + ".bin"
                        if file_type == "json" and os.path.isfile(os.path.join(curr_dir, bin_file)):
                            scenes_data.append(proj_util.unix_path(relpath(f_abs_path, root)))
                            #scenes_data.sort()

            return scenes_data

        scenes_data = gen_dir_scene_data(assets_root)
        self.write(json.dumps(scenes_data))

class StaticFileHandlerNoCache(tornado.web.StaticFileHandler):
    def set_extra_headers(self, path):
        # Disable cache
        self.set_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.set_header("Expires", "0")
        self.set_header("Access-Control-Allow-Origin", "*")
        now = datetime.datetime.now()
        exp = datetime.datetime(now.year - 1, 1, 1)
        self.set_header("Last-Modified", exp)
        self.add_header("B4W.LocalServer", "1")

class UploadProjectFile(tornado.web.RequestHandler):
    def post(self):
        if not "zip_file" in self.request.files:
            return self.send_error(status_code=400)

        temp_file = tempfile.NamedTemporaryFile(mode="wb", suffix=".zip", delete=False)
        temp_file.write(self.request.files["zip_file"][0]["body"])
        temp_file.seek(0)
        temp_file.close()

        self.redirect("/project/import/" + quote(temp_file.name, safe=""))

class UploadIconFile(tornado.web.RequestHandler):
    def post(self):
        files = self.request.files

        if not "proj_icon" in files:
            return self.send_error(status_code=400)

        proj_path = self.get_argument("proj_path");
        proj_icon = files["proj_icon"][0];

        root = get_sdk_root()
        proj_util = get_proj_util_mod(root)

        proj_cfg = proj_util.get_proj_cfg(join(root, proj_path))

        icon = proj_util.proj_cfg_value(proj_cfg, "info", "icon")

        if icon:
            icon_name = (os.path.splitext(icon)[0] +
                    os.path.splitext(proj_icon["filename"])[1])
        else:
            icon_name = ".b4w_icon" + os.path.splitext(proj_icon["filename"])[1]

        img_path = join(root, proj_path, icon_name)

        # NOTE: do not override image which has the same name and may be used
        # for some other purposes
        if not icon and exists(img_path):
            self.redirect("/project/")

        # update project config
        if icon != icon_name:
            proj_cfg["info"]["icon"] = icon_name
            with open(join(root, proj_path, ".b4w_project"), "w", encoding="utf-8", newline="\n") as configfile:
                proj_cfg.write(configfile)

        with open(img_path, "wb") as img_file:
            img_file.write(proj_icon["body"])

        self.redirect("/project/config/" + quote(proj_path, safe=""))

class CheckBuildProjPathHandler(tornado.web.RequestHandler):
    def post(self):
        root = get_sdk_root()
        req = unquote(self.request.body.decode("utf-8"))

        self.write(str(normpath(join(root, req)).startswith(normpath(root))))

class GetFileBodyHandler(tornado.web.RequestHandler):
    def post(self, tail):
        root = get_sdk_root()
        file_name = self.request.body.decode("utf-8")

        targeted_file = open(join(root, unquote(file_name)), "r", encoding="utf-8")
        strs = targeted_file.read()
        targeted_file.close()

        self.write(strs)

class SaveFileHandler(tornado.web.RequestHandler):
    def post(self, tail):
        root = get_sdk_root()
        file_name = self.get_argument("file_name", strip=False)
        body = self.get_argument("body", strip=False)

        targeted_file = open(join(root, unquote(file_name)), "w", encoding="utf-8", newline="\n")

        targeted_file.write(body)
        targeted_file.close()

class CreateFileHandler(tornado.web.RequestHandler):
    def post(self, tail):
        root = get_sdk_root()
        file_name = unquote(self.get_argument("file_name", strip=False))
        proj_path = unquote(self.get_argument("proj_path", strip=False))
        body = unquote(self.get_argument("body", strip=False))
        proj_abs_path = normpath(join(root, proj_path))
        user_path = normpath(join(proj_abs_path, file_name))
        user_path_parts = pathlib.Path(user_path).parts
        proj_path_parts = pathlib.Path(proj_abs_path).parts
        proj_util = get_proj_util_mod(root)

        if len(user_path_parts) <= len(proj_path_parts):
            self.set_status(400)
            self.write("Path is outside the directory of the project!")

            return

        if not user_path.startswith(proj_abs_path):
            self.set_status(400)
            self.write("Path is outside the directory of the project!")

            return

        if not pathlib.Path(user_path).suffix in [".css", ".js", ".html"]:
            self.set_status(400)
            self.write("Only .html, .js and .css files can be saved.")

            return

        if os.path.isfile(user_path):
            self.set_status(400)
            self.write("Saving over existing files is not allowed!")

            return

        os.makedirs(str(pathlib.Path(user_path).parent), exist_ok=True)

        targeted_file = open(user_path, "w", encoding="utf-8", newline="\n")

        targeted_file.write(body)
        targeted_file.close()

        self.write(quote(proj_util.unix_path(relpath(user_path, root)), safe=""))

class AnalyzeShaderHandler(tornado.web.RequestHandler):
    def post(self, tail):
        kind = tail.strip("/? ")
        data = self.request.body.decode("utf-8")

        try:
            resp = self.process_shader_nvidia(kind, data)
        except BaseException as err:
            self.set_status(500)
            self.finish(str(err))
        else:
            self.write(resp)

    def process_shader_nvidia(self, kind, data_in):
        """Process by nvidia cg toolkit"""

        if shutil.which(CGC_PATH) is None:
            raise BaseException("NVIDIA Cg Toolkit not found.")

        tmp_in = tempfile.NamedTemporaryFile(mode="w", suffix=".glsl", delete=False)
        tmp_in.write(data_in)
        tmp_in.close()

        if kind == "vert":
            profile = "gp4vp"   # NV_gpu_program4 and NV_vertex_program4
            lang = "-oglsl"
        elif kind == "frag":
            profile = "gp4fp"   # NV_gpu_program4 and NV_fragment_program4
            lang = "-oglsl"
        elif kind == "vert_gles":
            profile = "gp4vp"   # NV_gpu_program4 and NV_vertex_program4
            lang = "-ogles"
        elif kind == "frag_gles":
            profile = "gp4fp"   # NV_gpu_program4 and NV_fragment_program4
            lang = "-ogles"

        tmp_out = tempfile.NamedTemporaryFile(mode="r", suffix=".txt", delete=False)

        ret = subprocess.check_output([CGC_PATH, lang, "-profile", profile,
                tmp_in.name, "-o", tmp_out.name])

        tmp_out.seek(0)
        data_out = tmp_out.read()
        tmp_out.close()

        os.remove(tmp_in.name)
        os.remove(tmp_out.name)

        return data_out


class TestSendReq(tornado.web.RequestHandler):
    def post(self):
        req = json.loads(self.request.body.decode("utf-8"))
        if req["f"]["f1"]["field1"] == 1 and req["f"]["f2"]["field2"][2] == "2":
            resp = {"resp" : 2}
        else:
            resp = {}
        self.write(resp)

    def get(self):
        json = {
                "f" : {
                       "field1" : "10",
                       "field2" : "20",
                       "field3" : ["333", "bbb"],
                       "field4" : "NaN",
                       "field5" : "Infinity",
                       "field6" : "null",
                       "field7" : "undefined"
                    }
        }
        self.write(json)

class TestTimeOfDay(tornado.web.RequestHandler):
    def post(self):
        req = json.loads(self.request.body.decode("utf-8"))
        time = req["hours"]
        hours = int(time.split(':', 2)[0])
        if hours > 9 and hours < 19:
            resp = {"time_of_day" : "day"}
        else:
            resp = {"time_of_day" : "night"}
        self.write(resp)

class ProjectManagerCli():
    """Abstraction layer to project manager cli"""

    def get_proj_list(self, root, sort_reverse=False):
        proj_util = get_proj_util_mod(root)
        python_path = _python_path

        cmd = [python_path, "-E", join(root, "apps_dev", "project.py"),
                "--no-colorama"]

        cmd.append("list")

        out = self.exec_proc_sync(cmd, root)

        if out[0]:
            print("Project list internal error", file=sys.stderr)
            return []

        proj_strs = out[1].splitlines()

        if sort_reverse:
            proj_strs.sort()
            proj_strs.reverse()
        else:
            proj_strs.sort()

        proj_list = []

        for s in proj_strs:
            name = s.split("->")[0].strip(" ")
            path = s.split("->")[1].strip(" ")

            path_abs = normpath(join(root, path))
            proj_cfg = proj_util.get_proj_cfg(path_abs)

            proj_list.append({"name": name, "path": path, "config": proj_cfg})

        return proj_list

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

    def exec_proc_async_pipe(self, cmd, root):
        cwd = os.getcwd()

        # switch to SDK
        os.chdir(root)

        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT, universal_newlines=True)

        # restore
        os.chdir(cwd)

        console_queue = tornado.queues.Queue()
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

class ProjectRootHandler(tornado.web.RequestHandler, ProjectManagerCli):
    def get(self):
        root = get_sdk_root()

        tpl_html_file = open(join(root, "index_assets", "templates", "project_list.tmpl"), "r", encoding="utf-8")
        tpl_html_str = tpl_html_file.read()
        tpl_html_file.close()

        tpl_elem_file = open(join(root, "index_assets", "templates",
                "project_list_elem.tmpl"), "r", encoding="utf-8")
        tpl_elem_str = tpl_elem_file.read()
        tpl_elem_file.close()

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

        proj_util = get_proj_util_mod(root)

        if sort_type == "down":
            projects = self.get_proj_list(root, True)
        else:
            projects = self.get_proj_list(root, False)

        for p in projects:
            name = p["name"]
            path = p["path"]
            proj_cfg = p["config"]

            icon = proj_util.proj_cfg_value(proj_cfg, "info", "icon")
            author = proj_util.proj_cfg_value(proj_cfg, "info", "author")

            if author == "Blend4Web" and hide_b4w:
                continue

            build_dir = proj_util.proj_cfg_value(proj_cfg, "paths", "build_dir")

            if build_dir:
                build_dir = normpath(build_dir)

            assets_dirs = proj_util.proj_cfg_value(proj_cfg, "paths", "assets_dirs", [])

            elem_ins = {}

            if icon:
                elem_ins["icon"] = '/' + proj_util.unix_path(join(path, icon))
            else:
                elem_ins["icon"] = '/scripts/templates/project.png'

            elem_ins["title"] = proj_util.proj_cfg_value(proj_cfg, "info", "title", "")
            elem_ins["name"] = name

            elem_ins["info_url"] = '/project/info/' + quote(path, safe="")
            elem_ins["edit_url"] = '/project/edit/' + quote(path, safe="")
            elem_ins["config_url"] = '/project/config/' + quote(path, safe="")

            # TODO: specify apps config syntax (including dev-build separation)
            apps = proj_util.proj_cfg_value(proj_cfg, "compile", "apps", [])
            engine_type = proj_util.proj_cfg_value(proj_cfg, "compile", "engine_type", None)

            dev_apps = []
            build_apps = []
            player_apps = []

            if len(apps):
                if engine_type in ["webplayer_html", "webplayer_json"]:
                    for app in apps:
                        for assets_dir in assets_dirs:
                            if exists(join(root, assets_dir, app)):
                                player_apps.append(proj_util.unix_path(join(assets_dir, app)))
                else:
                    for app in apps:
                        if exists(join(root, path, app)):
                            dev_apps.append(proj_util.unix_path(join(path, app)))

                    if engine_type != "update":
                        for app in apps:
                            if build_dir and exists(join(root, build_dir, app)):
                                build_apps.append(proj_util.unix_path(join(build_dir, app)))

            else:
                # fallback app search - search only inside project-specific directories

                if engine_type == "webplayer_html":
                    for assets_dir in assets_dirs:
                        apps = [str(p) for p in pathlib.Path(join(root,
                                assets_dir)).rglob("*.html")]

                        for app in apps:
                            player_apps.append(proj_util.unix_path(relpath(app, root)))

                elif engine_type == "webplayer_json":
                    for assets_dir in assets_dirs:
                        apps = [basename(str(p)) for p in pathlib.Path(join(root,
                                assets_dir)).glob("*.json")]
                        for app in apps:
                            player_apps.append(proj_util.unix_path(join(assets_dir,
                                    app)))
                else:
                    apps = [proj_util.unix_path(relpath(str(html), root))
                            for html in pathlib.Path(normpath(join(root, path))).rglob("*.html")
                            if not str(html).startswith(normpath(join(root, build_dir)))]

                    dev_apps.extend(apps)

                    if engine_type != "update" and build_dir:
                        apps = [proj_util.unix_path(relpath(str(html), root))
                                for html in pathlib.Path(join(root, build_dir)).rglob("*.html")]

                        build_apps.extend(apps)

            elem_ins["apps"] = ""

            player_apps.sort()

            for app in player_apps:
                if engine_type == "webplayer_json":
                    if _use_comp_player:
                        player = proj_util.unix_path(join("deploy", "apps", "webplayer",
                                "webplayer.html"))
                        link = player + "?load=" + proj_util.unix_path(join("..", "..", "..", app))
                    else:
                        player = proj_util.unix_path(join("apps_dev", "webplayer",
                                "webplayer.html"))
                        link = player + "?load=" + proj_util.unix_path(join("..", "..", app))
                else:
                    link = app

                if "url_params" in proj_cfg:
                    d = proj_util.dict_to_csv_str(proj_cfg["url_params"])
                    d = d.replace(",", "&")

                    if engine_type == "webplayer_json":
                        link += "&" + d;
                    elif engine_type == "webplayer_html":
                        link += "?" + d;

                elem_ins["apps"] += self.app_link(basename(app), link, "player")

            dev_apps.sort()

            for app in dev_apps:
                link = app

                if "url_params" in proj_cfg:
                    d = proj_util.dict_to_csv_str(proj_cfg["url_params"])

                    if d:
                        link += "?" + d.replace(",", "&")

                elem_ins["apps"] += self.app_link(basename(app), link, "dev")

            build_apps.sort()

            for app in build_apps:
                link = app

                if "url_params" in proj_cfg:
                    d = proj_util.dict_to_csv_str(proj_cfg["url_params"])

                    if d:
                        link += "?" + d.replace(",", "&")

                elem_ins["apps"] += self.app_link(basename(app), link, "build")


            path_insert = proj_util.unix_path(path)
            elem_ins["path"] = path_insert
            elem_ins["proj"] = self.shorten(path_insert, 50)

            if build_dir:
                build_dir_insert = proj_util.unix_path(normpath(build_dir))

                if build_dir_insert != path_insert and build_dir_insert != '.':
                    elem_ins["proj"] += "<br>" + self.shorten(build_dir_insert, 50)

            elem_ins["blend_files"] = ""

            blend_dirs = proj_util.proj_cfg_value(proj_cfg, "paths", "blend_dirs", [])

            for blend_dir in blend_dirs:
                blend_dir_obj = pathlib.Path(normpath(join(root, blend_dir)))
                blend_files = list(blend_dir_obj.rglob('*.blend'))
                blend_files.sort()

                content = ""

                for file in blend_files:
                    link = proj_util.unix_path(relpath(str(file), root))
                    content += self.blend_link(link, blend_dir);

                if len(blend_dirs) > 1 or len(blend_files) > MAX_SHOWN_FILE_GRP_ITEMS:
                    show_hidden = True
                else:
                    show_hidden = False

                elem_ins["blend_files"] += self.file_group(elem_ins["blend_files"],
                        root, proj_util.unix_path(blend_dir), content, show_hidden);

            elem_ins["json_files"] = ""

            for assets_dir in assets_dirs:
                assets_dir_obj = pathlib.Path(normpath(join(root, assets_dir)))
                json_files = list(assets_dir_obj.rglob('*.json'))
                json_files.sort()

                content = ""
                for file in json_files:
                    link = proj_util.unix_path(relpath(str(file), root))
                    content += self.json_link(link, assets_dir);

                if len(assets_dirs) > 1 or len(json_files) > MAX_SHOWN_FILE_GRP_ITEMS:
                    show_hidden = True
                else:
                    show_hidden = False

                elem_ins["json_files"] += self.file_group(elem_ins["json_files"], root,
                        proj_util.unix_path(assets_dir), content, show_hidden);

            elem_ins["ops"] = ""

            if (proj_util.proj_cfg_value(proj_cfg, "compile", "engine_type", None) in
                    ["external", "copy", "compile"]) and build_dir:
                elem_ins["ops"] += ('<a href=/project/-p/' +
                        quote(normpath(path), safe="") +
                        '/build/ title="Compile project app(s)">build project</a>')

                if proj_util.proj_cfg_value(proj_cfg, "compile", "engine_type", None) != 'none':
                    elem_ins["ops"] += ('<a href=/project/-p/' +
                            quote(normpath(path), safe="") +
                            '/check_modules/ title="Check project modules">check modules</a>')

            elem_ins["ops"] += ('<a href=/project/-p/' +
                    quote(normpath(path), safe="") +
                    '/reexport/-b/' +
                    quote(_blender_path, safe="") +
                    '/ title="Re-export all scene files">re-export scenes</a>')

            if normpath(join(root, path)).startswith(normpath(join(root, "projects"))):
                elem_ins["ops"] += ('<a onclick="show_clone_confirm_window(this);return false;" href=/project/-p/' +
                    quote(normpath(path), safe="") + '/clone/ ' +
                    'title="Create new project based on current" >clone project</a>')

            elem_ins["ops"] += ('<a href=/project/-p/' +
                    quote(normpath(path), safe="") +
                    '/convert_resources/ ' +
                    'title="Convert project resources to alternative formats">' +
                    'convert resources</a>')

            if proj_util.proj_cfg_value(proj_cfg, "compile", "engine_type", None) != "none":
                elem_ins["ops"] += ('<a href=/project/-p/' +
                        quote(normpath(path), safe="") +
                        '/deploy/' +
                        quote(join("tmp", "downloads", name + ".zip"), safe="") +
                        ' title="Generate archive with deployed project">deploy project</a>')

            elem_ins["ops"] += ('<a onclick="show_confirm_window(this);return false;" href=/project/-p/' +
                    quote(normpath(path), safe="") +
                    '/remove/ title="Remove project">remove project</a>')

            if (author != "Blend4Web" and
                    path.startswith("apps_dev") and
                    assets_dir != build_dir and
                    blend_dir != assets_dir):

                elem_ins["ops"] += ('<a href=/project/-p/' +
                        quote(normpath(path), safe="") +
                        '/update_file_struct/-b/' +
                        quote(_blender_path, safe="") +
                        '/ title="Update file hierarchy and move project contents to projects/ directory.">' +
                        'update file structure</a>')

            table_insert += string.Template(tpl_elem_str).substitute(elem_ins)

        html_insertions = dict(table_insert=table_insert,
                               sort=sort_type,
                               show_hide_text=show_hide_text,
                               show_hide_link=show_hide_link,
                               link="/project/sort/" + sort_link + "/")

        out_html_str = string.Template(tpl_html_str).substitute(html_insertions)

        self.write(out_html_str)

    def app_link(self, name, link, prefix):
        return ('<div><a target="_blank" class="spoiler_item" href="/' + link +
                '" title="Run app">' + prefix + ": " + name + '</a></div>')

    def blend_link(self, link, dir):
        link_text = self.shorten(link.replace(dir, "")).lstrip("/")
        return ('<div><a target="_blank" class="spoiler_item" href="/run_blender/' + link + '" ' +
                'title="Open in Blender">' + link_text + '</a></div>')

    def json_link(self, link, dir):
        link_text = self.shorten(link.replace(dir, "")).lstrip("/")
        return ('<div><a target="_blank" class="spoiler_item" ' +
                'href="/apps_dev/viewer/viewer.html?load=../../' + link + '" ' +
                'title="Open in Viewer">' + link_text + '</a></div>')

    def shorten(self, s, maxlen=60):
        if len(s) > maxlen:
            return "..." + s[-(maxlen-3):]
        else:
            return s

    def file_group(self, s, root, dir, content, show_hidden):
        header = self.shorten(dir.strip("/ ") + "/", 50)

        if not content:
            return "<div>" + header + "</div>"

        tpl_html_file = open(join(root, "index_assets", "templates", "spoiler.tmpl"), "r", encoding="utf-8")
        tpl_html_str = tpl_html_file.read()
        tpl_html_file.close()

        id = hashlib.md5((dir+content).encode()).hexdigest()

        if show_hidden:
            html_insertions = dict(id=id, header=header, content=content,
                    display_show_content="inline", display_hide_content="none")
        else:
            html_insertions = dict(id=id, header=header, content=content,
                    display_show_content="none", display_hide_content="inline")

        return string.Template(tpl_html_str).substitute(html_insertions)

def get_proj_util_mod(root):
    scripts_path = join(root, "scripts")

    pmod = imp.find_module("project_util",
            [join(scripts_path, "lib")])
    proj_util = imp.load_module("project_util", pmod[0], pmod[1], pmod[2])

    return proj_util

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

class ExportShowHandler(tornado.web.RequestHandler):
    def get(self):
        self.set_cookie("hide_b4w", "show")
        self.redirect("/export/")

class ExportHideHandler(tornado.web.RequestHandler):
    def get(self):
        self.set_cookie("hide_b4w", "hide")
        self.redirect("/export/")

class ProjectRequestHandler(tornado.web.RequestHandler, ProjectManagerCli):
    def get(self):
        root = get_sdk_root()

        if not ConsoleHandler.console_proc:
            req = self.request.uri.replace("/project/", "").strip("/? ")

            python_path = _python_path

            cmd = [python_path, "-E", join(root, "apps_dev", "project.py"),
                    "--no-colorama"]

            show_download_link = False
            show_update_link = False

            for part in req.split("/"):
                if part == "export" or part == "deploy":
                    show_download_link = True
                elif part == "check_modules":
                    show_update_link = True

                cmd.append(unquote(part))

            if show_download_link:
                file_dir = join(root, os.path.dirname(cmd[-1]))
                os.makedirs(file_dir,  exist_ok=True)

                proj_util = get_proj_util_mod(root)

                ConsoleHandler.download_link = "/" + proj_util.unix_path(cmd[-1])

            if show_update_link:
                ConsoleHandler.update_link = "/project/" + re.sub("check_modules$", "update_modules", req)

            ConsoleHandler.console_proc = self.exec_proc_async_pipe(cmd, root)

            html_file = open(join(root, "index_assets", "templates", "request.tmpl"), "r", encoding="utf-8")
        else:
            html_file = open(join(root, "index_assets", "templates", "request_busy.tmpl"), "r", encoding="utf-8")

        html_str = html_file.read()
        html_file.close()

        html_insertions = dict(download_link=ConsoleHandler.download_link,
                               update_link=ConsoleHandler.update_link)

        out_html_str = string.Template(html_str).substitute(html_insertions)

        self.write(out_html_str)

class ProjectCreateHandler(tornado.web.RequestHandler):
    def get(self):
        root = get_sdk_root()

        tpl_html_file = open(join(root, "index_assets", "templates", "project_create.tmpl"), "r", encoding="utf-8")
        tpl_html_str = tpl_html_file.read()
        tpl_html_file.close()

        html_insertions = dict(blender_exec=quote(_blender_path, safe=""))

        html_str = string.Template(tpl_html_str).substitute(html_insertions)

        self.write(html_str)

class ProjectCloneSnippetHandler(tornado.web.RequestHandler):
    def get(self, tail):
        root = normpath(get_sdk_root())

        try:
            snippet_name = self.get_query_argument("snippet_name")
        except:
            html_str = "Snippet name not specified"
            self.write(html_str)
            return

        try:
            new_project_name = self.get_query_argument("new_proj_name")
        except:
            html_str = "New project name not specified"
            self.write(html_str)
            return

        self.redirect("/project/-s/" + quote(snippet_name, safe="") +
                      "/clone_snippet/-n/" + quote(new_project_name, safe="") +
                      "/-b/" + quote(_blender_path, safe=""))

class ProjectEditHandler(tornado.web.RequestHandler):
    def get(self):
        root = get_sdk_root()
        path = self.request.uri.replace("/project/edit/", "").strip("/? ")
        path = join(root, unquote(path))
        proj_util = get_proj_util_mod(root)

        config_file = []
        css_file_list = list(pathlib.Path(path).rglob("*.css"))
        js_file_list = list(pathlib.Path(path).rglob("*.js"))
        html_file_list = list(pathlib.Path(path).rglob("*.html"))

        config_file.extend(css_file_list)
        config_file.extend(js_file_list)
        config_file.extend(html_file_list)

        if path.startswith(join(root, "projects")):
            ignore_build = pathlib.Path(join(path, "build")).rglob("*")
            ignore_assets = pathlib.Path(join(path, "assets")).rglob("*")
            ignore_blender = pathlib.Path(join(path, "blender")).rglob("*")
            config_file = list(set(config_file) - set(ignore_build) - set(ignore_assets) - set(ignore_blender))

        strs = ""

        for f in config_file:
            strs += '<div data-path="' + quote(str(f), safe="") + '" class="edit_file">' + proj_util.unix_path(str(f.relative_to(root))) + '</div>\n'

        strs += '<input type="hidden" name="proj_path" id="proj_path" value="' + quote(path, safe="") + '">'
        strs += '<input type="hidden" name="sdk_path" id="sdk_path" value="' + quote(root, safe="") + '">'

        tpl_html_file = open(join(root, "index_assets", "templates", "project_edit.tmpl"), "r", encoding="utf-8")

        tpl_html_str = tpl_html_file.read()
        tpl_html_file.close()

        html_insertions = dict(content=strs)

        html_str = string.Template(tpl_html_str).substitute(html_insertions)

        self.write(html_str)

class ProjectConfigHandler(tornado.web.RequestHandler):
    def get(self):
        root = get_sdk_root()

        proj_util = get_proj_util_mod(root)

        path = self.request.uri.replace("/project/config/", "").strip("/? ")
        path = unquote(path)

        proj_cfg = proj_util.get_proj_cfg(join(root, path))

        author = proj_util.proj_cfg_value(proj_cfg, "info", "author", "")
        icon = proj_util.proj_cfg_value(proj_cfg, "info", "icon", "")
        name = proj_util.proj_cfg_value(proj_cfg, "info", "name", "")
        title = proj_util.proj_cfg_value(proj_cfg, "info", "title", "")

        apps = proj_util.proj_cfg_value(proj_cfg, "compile", "apps", "")
        engine_type = proj_util.proj_cfg_value(proj_cfg, "compile", "engine_type", "")
        opt_level = proj_util.proj_cfg_value(proj_cfg, "compile", "optimization", "simple")
        js_ignore = proj_util.proj_cfg_value(proj_cfg, "compile", "js_ignore", "")

        use_physics = proj_util.proj_cfg_value(proj_cfg, "compile", "use_physics", True)

        if engine_type == "webplayer_html":
            use_physics = False

        css_ignore = proj_util.proj_cfg_value(proj_cfg, "compile", "css_ignore", "")
        build_ignore = proj_util.proj_cfg_value(proj_cfg, "compile", "ignore", "")

        blender_exec = proj_util.proj_cfg_value(proj_cfg, "paths", "blender_exec", "")
        build_dir = proj_util.proj_cfg_value(proj_cfg, "paths", "build_dir", "")
        blend_dirs = proj_util.proj_cfg_value(proj_cfg, "paths", "blend_dirs", [])
        assets_dirs = proj_util.proj_cfg_value(proj_cfg, "paths", "assets_dirs", [])
        deploy_dir = proj_util.proj_cfg_value(proj_cfg, "paths", "deploy_dir", "")

        deploy_assets_path_dest = proj_util.proj_cfg_value(proj_cfg, "deploy", "assets_path_dest", "")
        deploy_assets_path_prefix = proj_util.proj_cfg_value(proj_cfg, "deploy", "assets_path_prefix", "")
        deploy_ignore = proj_util.proj_cfg_value(proj_cfg, "deploy", "ignore", "")
        override = proj_util.proj_cfg_value(proj_cfg, "deploy", "override", "")

        if icon:
            icon_path = '/' + proj_util.unix_path(join(path, icon))
        else:
            icon_path = '/scripts/templates/project.png'

        if "url_params" in proj_cfg:
            url_params = proj_util.dict_to_csv_str(proj_cfg["url_params"])
        else:
            url_params = ""

        tpl_html_file = open(join(root, "index_assets", "templates",
                "project_config.tmpl"), "r", encoding="utf-8")
        tpl_html_str = tpl_html_file.read()
        tpl_html_file.close()

        html_insertions = {"name": name,
                           "title": title,
                           "author": author,
                           "engine_type": engine_type,
                           "opt_level": opt_level,
                           "deploy_assets_path_prefix": deploy_assets_path_prefix,
                           "deploy_assets_path_dest": deploy_assets_path_dest,
                           "path": path,
                           "apps": ";".join(apps),
                           "override": override or "",
                           "build_ignore": ";".join(build_ignore),
                           "deploy_dir": deploy_dir,
                           "use_physics": use_physics,
                           "blender_exec": blender_exec,
                           "assets_dirs": ";".join(assets_dirs),
                           "blend_dirs": ";".join(blend_dirs),
                           "deploy_ignore": ";".join(deploy_ignore),
                           "url_params": url_params,
                           "icon": icon_path,
                           "build_dir": build_dir,
                           "js_ignore": ";".join(js_ignore),
                           "css_ignore": ";".join(css_ignore)}

        html_str = string.Template(tpl_html_str).substitute(html_insertions)

        self.write(html_str)

class ProjectSaveConfigHandler(tornado.web.RequestHandler):
    def post(self, tail):
        root = get_sdk_root()
        proj_path = self.get_argument("proj_path", strip=False)

        proj_util = get_proj_util_mod(root)
        proj_cfg = proj_util.get_proj_cfg(join(root, proj_path))

        opt_level = self.get_argument("opt_level", strip=False)
        apps = self.get_argument("apps", strip=False)
        build_ignore = self.get_argument("build_ignore", strip=False)
        css_ignore = self.get_argument("css_ignore", strip=False)
        js_ignore = self.get_argument("js_ignore", strip=False)
        use_physics = self.get_argument("use_physics", strip=False)
        blender_exec = self.get_argument("blender_exec", strip=False)

        author = self.get_argument("author", strip=False)
        title = self.get_argument("title", strip=False)

        assets_path_dest = self.get_argument("assets_path_dest", strip=False)
        assets_path_prefix = self.get_argument("assets_path_prefix", strip=False)
        ignore = self.get_argument("ignore", strip=False)

        url_params = self.get_argument("url_params", strip=False)

        if not url_params:
            proj_cfg["url_params"] = {}
        else:
            url_params = proj_util.csv_str_to_dict(self.get_argument("url_params", strip=False))
            proj_cfg["url_params"] = url_params

        proj_cfg["info"]["author"] = author
        proj_cfg["info"]["title"] = title

        proj_cfg["paths"]["blender_exec"] = blender_exec

        proj_cfg["compile"]["apps"] = apps
        proj_cfg["compile"]["optimization"] = opt_level
        proj_cfg["compile"]["css_ignore"] = css_ignore
        proj_cfg["compile"]["js_ignore"] = js_ignore
        proj_cfg["compile"]["ignore"] = build_ignore

        if use_physics:
            proj_cfg["compile"]["use_physics"] = "True"
        else:
            proj_cfg["compile"]["use_physics"] = "False"

        proj_cfg["deploy"]["assets_path_dest"] = assets_path_dest
        proj_cfg["deploy"]["assets_path_prefix"] = assets_path_prefix
        proj_cfg["deploy"]["ignore"] = ignore

        with open(join(root, proj_path, ".b4w_project"), "w", encoding="utf-8", newline="\n") as configfile:
            proj_cfg.write(configfile)

class ProjectInfoHandler(tornado.web.RequestHandler):
    def get(self):
        root = get_sdk_root()

        tpl_html_file = open(join(root, "index_assets", "templates",
                "project_info.tmpl"), "r", encoding="utf-8")
        tpl_html_str = tpl_html_file.read()
        tpl_html_file.close()

        path = self.request.uri.replace("/project/info/", "").strip("/? ")
        config_link = "/project/config/" + path
        path = unquote(path)

        proj_util = get_proj_util_mod(root)
        proj_cfg = proj_util.get_proj_cfg(join(root, path))
        name = proj_util.proj_cfg_value(proj_cfg, "info", "name", "")
        title = proj_util.proj_cfg_value(proj_cfg, "info", "title", "")
        author = proj_util.proj_cfg_value(proj_cfg, "info", "author", "")
        icon = proj_util.proj_cfg_value(proj_cfg, "info", "icon", "")
        build_dir = proj_util.proj_cfg_value(proj_cfg, "paths", "build_dir", "")
        assets_dirs = proj_util.proj_cfg_value(proj_cfg, "paths", "assets_dirs", [])
        blend_dirs = proj_util.proj_cfg_value(proj_cfg, "paths", "blend_dirs", [])
        engine_type = proj_util.proj_cfg_value(proj_cfg, "compile", "engine_type", "")
        optimization = proj_util.proj_cfg_value(proj_cfg, "compile", "optimization", "")
        js_ignore = proj_util.proj_cfg_value(proj_cfg, "compile", "js_ignore", "")
        css_ignore = proj_util.proj_cfg_value(proj_cfg, "compile", "css_ignore", "")
        compilation_ignore = proj_util.proj_cfg_value(proj_cfg, "compile", "ignore", "")
        assets_path_dest = proj_util.proj_cfg_value(proj_cfg, "deploy", "assets_path_dest", "")
        assets_path_prefix = proj_util.proj_cfg_value(proj_cfg, "deploy", "assets_path_prefix", "")
        deployment_ignore = proj_util.proj_cfg_value(proj_cfg, "deploy", "ignore", "")

        # size of all project directories
        dirs = [path]
        if build_dir:
            dirs.append(build_dir)
        dirs.extend(blend_dirs)
        dirs.extend(assets_dirs)
        size = proj_util.calc_proj_size(dirs, root)

        if "url_params" in proj_cfg:
            url_params = proj_util.dict_to_csv_str(proj_cfg["url_params"])
            url_params = url_params.replace(",", "<br>")
        else:
            url_params = ""

        apps = proj_util.proj_cfg_value(proj_cfg, "compile", "apps", [])
        if len(apps):
            apps = "<br>".join(apps)
        else:
            apps = "[detected automatically]"

        engine_type_replacer = {
            "webplayer_html": "WebPlayer HTML",
            "webplayer_json": "WebPlayer JSON",
            "none": "none",
            "update": "none",
            "copy": "Copy",
            "compile": "Compile",
            "external": "Copy"
        }

        html_insertions = {
            "name": name,
            "title": title,
            "author": author,
            "icon": icon,
            "apps": apps,
            "engine_type": engine_type_replacer[engine_type],
            "size": round(size / 1024 / 1024),
            "path": path,
            "build_dir": build_dir,
            "blend_dirs": "<br>".join(blend_dirs),
            "assets_dirs": "<br>".join(assets_dirs),
            "config_path": proj_util.unix_path(join(path, ".b4w_project")),
            "url_params": url_params,
            "optimization": optimization,
            "js_ignore": "<br>".join(js_ignore),
            "css_ignore": "<br>".join(css_ignore),
            "compilation_ignore": compilation_ignore,
            "assets_path_dest": assets_path_dest,
            "config_link": config_link,
            "assets_path_prefix": assets_path_prefix,
            "deployment_ignore": deployment_ignore
        }

        html_str = string.Template(tpl_html_str).substitute(html_insertions)

        self.write(html_str)

class ProjectExportHandler(tornado.web.RequestHandler, ProjectManagerCli):
    def get(self):
        root = get_sdk_root()
        proj_util = get_proj_util_mod(root)

        tpl_html_file = open(join(root, "index_assets", "templates", "project_export.tmpl"), "r", encoding="utf-8")
        tpl_html_str = tpl_html_file.read()
        tpl_html_file.close()

        tpl_elem_file = open(join(root, "index_assets", "templates",
                "project_export_elem.tmpl"), "r", encoding="utf-8")
        tpl_elem_str = tpl_elem_file.read()
        tpl_elem_file.close()

        hide_b4w = False
        show_hide_link = "/export/hide_b4w/"
        show_hide_text = "Hide"

        if self.get_cookie("hide_b4w") == "hide":
            hide_b4w = True
            show_hide_link = "/export/show_b4w/"
            show_hide_text = "Show"

        projects = self.get_proj_list(root)

        content = ""

        for p in projects:
            name = p["name"]
            path = p["path"]
            proj_cfg = p["config"]

            author = proj_util.proj_cfg_value(proj_cfg, "info", "author")

            if author == "Blend4Web" and hide_b4w:
                continue

            author = proj_util.proj_cfg_value(proj_cfg, "info", "author", "")
            title = proj_util.proj_cfg_value(proj_cfg, "info", "title", "")

            elem_ins = dict(id=quote(str(path), safe=""), name=name, author=author, title=title)
            elem_str = string.Template(tpl_elem_str).substitute(elem_ins)

            content += elem_str

        # must end with slash to mantain cross-platform behavior
        export_dir = quote(join("tmp", "downloads", ""), safe="")

        html_insertions = dict(content=content,
                               export_dir=export_dir,
                               show_hide_text=show_hide_text,
                               show_hide_link=show_hide_link)
        html_str = string.Template(tpl_html_str).substitute(html_insertions)

        self.write(html_str)

class GetProjNamesHandler(tornado.web.RequestHandler, ProjectManagerCli):
    def get(self):
        root = get_sdk_root()
        projects = self.get_proj_list(root, True)

        proj_names = [p["name"] for p in projects]

        self.write(json.dumps(proj_names))

class RunBlenderHandler(tornado.web.RequestHandler):
    def get(self, tail):
        root = get_sdk_root()

        if not shutil.which(_blender_path):
            html_str = ("<p>Blender executable is not found, please add the path" 
                    + " to Blender into the PATH environment variable or open the scene manually.")
            self.write(html_str)
            return

        cmd = [_blender_path]
        cmd.append(normpath(join(root, tail.strip("/? "))))

        proc = subprocess.Popen(cmd);

        html_file = open(join(root, "index_assets", "templates", "run_blender.tmpl"), "r", encoding="utf-8")
        html_str = html_file.read()
        html_file.close()

        self.write(html_str)


class ConsoleHandler(tornado.websocket.WebSocketHandler):
    websocket_conn = None
    console_proc = None
    console_queue = None
    download_link = ""
    update_link = ""

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
            except tornado.queues.QueueEmpty:
                break
            else:
                cls.websocket_conn.write_message(cls.ansi_to_html(line))

        if cls.console_proc.poll() != None:
            cls.console_proc = None
            cls.websocket_conn.close()
            cls.download_link = ""
            cls.update_link = ""
            cls.websocket_conn = None

    @classmethod
    def ansi_to_html(cls, text):
        text = text.replace('\x1b[0m', '</span>')
        text = text.replace('\x1b', '')

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

def help():
    print("""\
Blend4Web project management server
Usage: project_server.py [-p|--port PORT] [-w|--compiled-webplayer] [-h|--help]

Options:
    -p, --port                  listen this port (6687 by default)
    -d, --daemonize             detach server process
    -w, --compiled-webplayer    use compiled webplayer to run scene files
    -h, --help                  show this help and exit
""")

def daemonize():
    try:
        pid = os.fork()
        # parent
        if pid > 0:
            print("forking child process with pid " + str(pid))
            sys.exit(0)
    except OSError as ex:
        print("fork failed: " + str(ex), file=sys.stderr)
        sys.exit(1)

    # decouple from parent environment
    os.setsid()
    os.umask(0)

def run():
    try:
        opts, args = getopt.getopt(sys.argv[1:],
                "p:dwh", ["port=", "daemonize", "compiled_webplayer", "help"])
    except getopt.GetoptError as err:
        print(err, file=sys.stderr)
        sys.exit(1)

    port = 6687
    for o, a in opts:
        if o == "--port" or o == "-p":
            port = int(a)
        elif o == "--daemonize" or o == "-d":
            daemonize()
        elif o == "--compiled-webplayer" or o == "-w":
            global _use_comp_player
            _use_comp_player = True
        elif o == "--help" or o == "-h":
            help()
            exit(0)

    root = join(os.path.abspath(os.path.dirname(__file__)), "..")

    class B4WLocalServer():
        pass

    serv_cls = B4WLocalServer

    create_server(root, port, True, sys.executable, "blender", serv_cls)

    if serv_cls.server_status == SUB_THREAD_SERVER_EXC:
        print("server start failed: " + serv_cls.error_message, file=sys.stderr)
    elif serv_cls.server_status == SUB_THREAD_OTHER_EXC:
        print("server error: " + serv_cls.error_message, file=sys.stderr)

if __name__ == "__main__":
    run()
