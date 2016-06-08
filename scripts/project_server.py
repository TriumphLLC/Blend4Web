#!/usr/bin/env python3

import datetime
import getopt
import hashlib
import imp
import json
import os
import pathlib
import queue
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
        (r"/project/upload_icon/?$", UploadIconFile),
        (r"/project/info/.+$", ProjectInfoHandler),
        (r"/project/.+$", ProjectRequestHandler),
        (r"/create/?$", ProjectCreateHandler),
        (r"/export/?$", ProjectExportHandler),
        (r"/export/show_b4w/?$", ExportShowHandler),
        (r"/export/hide_b4w/?$", ExportHideHandler),
        (r"/run_blender/(.*)$", RunBlenderHandler),
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
                    file_type = f.split(".")[-1]
                    bin_file = f.split(".")[-2] + ".bin"
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
            with open(join(root, proj_path, ".b4w_project"), "w") as configfile:
                proj_cfg.write(configfile)


        with open(img_path, "wb") as img_file:
            img_file.write(proj_icon["body"])

        self.redirect("/project/")

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

        cmd = [python_path, join(root, "apps_dev", "project.py"),
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



class ProjectRootHandler(tornado.web.RequestHandler, ProjectManagerCli):
    def get(self):
        root = get_sdk_root()

        tpl_html_file = open(join(root, "index_assets", "templates", "projects.tmpl"), "r")
        tpl_html_str = tpl_html_file.read()
        tpl_html_file.close()

        tpl_elem_file = open(join(root, "index_assets", "templates",
                "projects_elem.tmpl"), "r")
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

            build_dir = normpath(proj_util.proj_cfg_value(proj_cfg, "paths",
                    "build_dir", ""))

            assets_dirs = proj_util.proj_cfg_value(proj_cfg, "paths", "assets_dirs", [])

            elem_ins = {}

            if icon:
                elem_ins["icon"] = '/' + proj_util.unix_path(join(path, icon))
            else:
                elem_ins["icon"] = '/scripts/templates/project.png'

            elem_ins["name"] = name

            elem_ins["info_url"] = '/project/info/' + quote(path, safe="")

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
                            if exists(join(root, build_dir, app)):
                                build_apps.append(proj_util.unix_path(join(build_dir, app)))

            else:
                # fallback app search - search only inside project-specific directories

                if engine_type == "webplayer_html":
                    for assets_dir in assets_dirs:
                        apps = [basename(str(p)) for p in pathlib.Path(join(root,
                                assets_dir)).glob("*.html")]
                        for app in apps:
                            player_apps.append(proj_util.unix_path(join(assets_dir,
                                    app)))

                elif engine_type == "webplayer_json":
                    for assets_dir in assets_dirs:
                        apps = [basename(str(p)) for p in pathlib.Path(join(root,
                                assets_dir)).glob("*.json")]
                        for app in apps:
                            player_apps.append(proj_util.unix_path(join(assets_dir,
                                    app)))
                else:

                    apps = [basename(str(p)) for p in pathlib.Path(join(root,
                            path)).glob("*.html")]
                    for app in apps:
                        dev_apps.append(proj_util.unix_path(join(path, app)))

                    if engine_type != "update":
                        apps = [basename(str(p)) for p in pathlib.Path(join(root,
                                build_dir)).glob("*.html")]
                        for app in apps:
                            build_apps.append(proj_util.unix_path(join(build_dir, app)))

            elem_ins["apps"] = ""

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

            for app in dev_apps:
                link = app

                if "url_params" in proj_cfg:
                    d = proj_util.dict_to_csv_str(proj_cfg["url_params"])
                    link += "?" + d.replace(",", "&")

                elem_ins["apps"] += self.app_link(basename(app), link, "dev")

            for app in build_apps:
                link = app

                if "url_params" in proj_cfg:
                    d = proj_util.dict_to_csv_str(proj_cfg["url_params"])
                    link += "?" + d.replace(",", "&")

                elem_ins["apps"] += self.app_link(basename(app), link, "build")


            path_insert = proj_util.unix_path(path)
            elem_ins["path"] = path_insert
            elem_ins["proj"] = self.shorten(path_insert, 50)

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
                    content += self.blend_link(link);

                elem_ins["blend_files"] += self.file_group(elem_ins["blend_files"],
                        root, blend_dir, content);

            elem_ins["json_files"] = ""

            for assets_dir in assets_dirs:
                assets_dir_obj = pathlib.Path(normpath(join(root, assets_dir)))
                json_files = list(assets_dir_obj.rglob('*.json'))
                json_files.sort()

                content = ""
                for file in json_files:
                    link = proj_util.unix_path(relpath(str(file), root))
                    content += self.json_link(link);

                elem_ins["json_files"] += self.file_group(elem_ins["json_files"], root,
                        assets_dir, content);

            elem_ins["ops"] = ""

            if (proj_util.proj_cfg_value(proj_cfg, "compile", "engine_type", None) in
                    ["external", "copy", "compile", "update"]):
                elem_ins["ops"] += ('<a href=/project/-p/' +
                        quote(normpath(path), safe="") +
                        '/compile/ title="Compile project app(s)">compile project</a><br>')

            elem_ins["ops"] += ('<a href=/project/-p/' +
                    quote(normpath(path), safe="") +
                    '/reexport/-b/' +
                    quote(_blender_path, safe="") +
                    '/ title="Re-export all scene files">re-export scenes</a><br>')

            elem_ins["ops"] += ('<a href=/project/-p/' +
                    quote(normpath(path), safe="") +
                    '/convert_resources/ ' +
                    'title="Convert project resources to alternative formats">' +
                    'convert resources</a><br>')

            elem_ins["ops"] += ('<a href=/project/-p/' +
                    quote(normpath(path), safe="") +
                    '/deploy/' +
                    quote(join("tmp", "downloads", name + ".zip"), safe="") +
                    ' title="Generate archive with deployed project">deploy project</a><br>')

            elem_ins["ops"] += ('<a onclick="show_confirm_window(this);return false;" href=/project/-p/' +
                    quote(normpath(path), safe="") +
                    '/remove/ title="Remove project">remove project</a>')

            table_insert += string.Template(tpl_elem_str).substitute(elem_ins)


        html_insertions = dict(table_insert=table_insert,
                               sort=sort_type,
                               show_hide_text=show_hide_text,
                               show_hide_link=show_hide_link,
                               link="/project/sort/" + sort_link + "/")

        out_html_str = string.Template(tpl_html_str).substitute(html_insertions)

        self.write(out_html_str)

    def app_link(self, name, link, prefix):
        return ('<div><a class="spoiler_item" href="/' + link +
                '" title="Run app">' + prefix + ": " + name + '</a></div>')

    def blend_link(self, link):
        return ('<div><a class="spoiler_item" href="/run_blender/' + link + '" ' +
                'title="Open in Blender">' + self.shorten(link) + '</a></div>')

    def json_link(self, link):
        return ('<div><a class="spoiler_item" ' +
                'href="/apps_dev/viewer/viewer.html?load=../../' + link + '" ' +
                'title="Open in Viewer">' + self.shorten(link) + '</a></div>')

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

        header = self.shorten(dir.strip("/ ") + "/", 50)

        html_insertions = dict(id=id, header=header, content=content)

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

            cmd = [python_path, join(root, "apps_dev", "project.py"),
                    "--no-colorama"]

            show_download_link = False

            for part in req.split("/"):
                if part == "export" or part == "deploy":
                    show_download_link = True

                cmd.append(unquote(part))

            if show_download_link:
                file_dir = join(root, os.path.dirname(cmd[-1]))
                os.makedirs(file_dir,  exist_ok=True)

                proj_util = get_proj_util_mod(root)

                ConsoleHandler.download_link = "/" + proj_util.unix_path(cmd[-1])

            ConsoleHandler.console_proc = self.exec_proc_async_pipe(cmd, root)

            html_file = open(join(root, "index_assets", "templates", "request.tmpl"), "r")
        else:
            html_file = open(join(root, "index_assets", "templates", "request_busy.tmpl"), "r")

        html_str = html_file.read()
        html_file.close()

        html_insertions = dict(download_link=ConsoleHandler.download_link)

        out_html_str = string.Template(html_str).substitute(html_insertions)

        self.write(out_html_str)



class ProjectCreateHandler(tornado.web.RequestHandler):
    def get(self):
        root = get_sdk_root()

        tpl_html_file = open(join(root, "index_assets", "templates", "create_form.tmpl"), "r")
        tpl_html_str = tpl_html_file.read()
        tpl_html_file.close()

        html_insertions = dict(blender_exec=quote(_blender_path, safe=""))

        html_str = string.Template(tpl_html_str).substitute(html_insertions)

        self.write(html_str)


class ProjectInfoHandler(tornado.web.RequestHandler):
    def get(self):
        root = get_sdk_root()

        tpl_html_file = open(join(root, "index_assets", "templates",
                "project_info.tmpl"), "r")
        tpl_html_str = tpl_html_file.read()
        tpl_html_file.close()

        path = self.request.uri.replace("/project/info/", "").strip("/? ")
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
        assets_path_prefix = proj_util.proj_cfg_value(proj_cfg, "deploy", "assets_path_prefix", "")

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
            "update": "Update",
            "copy": "Copy",
            "compile": "Compile",
            "external": "External"
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
            "assets_path_prefix": assets_path_prefix
        }

        html_str = string.Template(tpl_html_str).substitute(html_insertions)

        self.write(html_str)

class ProjectExportHandler(tornado.web.RequestHandler, ProjectManagerCli):
    def get(self):
        root = get_sdk_root()
        proj_util = get_proj_util_mod(root)

        tpl_html_file = open(join(root, "index_assets", "templates", "export_form.tmpl"), "r")
        tpl_html_str = tpl_html_file.read()
        tpl_html_file.close()

        tpl_elem_file = open(join(root, "index_assets", "templates",
                "export_form_elem.tmpl"), "r")
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

            elem_ins = dict(id=name, name=name, author=author, title=title)
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

class RunBlenderHandler(tornado.web.RequestHandler):
    def get(self, tail):
        root = get_sdk_root()

        if not shutil.which(_blender_path):
            html_str = "<p>Blender executable is not found, please open the scene manually."
            self.write(html_str)
            return

        cmd = [_blender_path]
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
    download_link = ""

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
            cls.download_link = ""
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
    os.chdir("/")
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
