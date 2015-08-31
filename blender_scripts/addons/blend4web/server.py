import bpy
from bpy.props import StringProperty

import datetime
import os
import sys
import threading
import time
import webbrowser
import requests

import tornado.httpserver
import tornado.web

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
    bl_label = "Warning: Server error."
    bl_options = {"INTERNAL"}

    message = StringProperty(name="Message string")

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
                        message="Server starting error: " + str(ex))

            cls.wait_loop()

            if cls.server_status == SUB_THREAD_SERVER_EXC:
                bpy.ops.b4w.server_message("INVOKE_DEFAULT", 
                        message="Server starting error: " +  cls.error_message)
            if cls.server_status == SUB_THREAD_OTHER_EXC:
                bpy.ops.b4w.server_message("INVOKE_DEFAULT", 
                        message="Could not start the server: " + cls.error_message)

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
                        message="Server stopping error: " + str(ex))
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
    bl_label = "B4W Stop Server"
    bl_options = {"INTERNAL"}

    def execute(self, context):
        B4WLocalServer.shutdown()
        return {"FINISHED"}

class B4WStartServer(bpy.types.Operator):
    bl_idname = "b4w.start_server"
    bl_label = "B4W Start Server"
    bl_options = {"INTERNAL"}

    def execute(self, context):
        B4WLocalServer.start()
        return {"FINISHED"}

class B4WOpenSDK(bpy.types.Operator):
    bl_idname = "b4w.open_sdk"
    bl_label = "B4W Open SDK"
    bl_options = {"INTERNAL"}
   
    def execute(self, context):
        port = context.user_preferences.addons[__package__].preferences.b4w_port_number
        B4WLocalServer.open_url("http://" + ADDRESS + ":" + str(port))
        return {"FINISHED"}

def open_browser(url):
    try:
        webbrowser.open(url)
    except BaseException as ex:
        bpy.ops.b4w.server_message("INVOKE_DEFAULT", 
                message="Could not open browser: " + str(ex))

def create_server():
    port = bpy.context.user_preferences.addons[__package__].preferences.b4w_port_number
    root = bpy.context.user_preferences.addons[__package__].preferences.b4w_src_path
    allow_ext_requests = bpy.context.user_preferences.addons[__package__].preferences.b4w_enable_ext_requests

    if allow_ext_requests:
        address = ""
    else:
        address = ADDRESS

    application = tornado.web.Application([
        (r"/(.*)$", StaticFileHandlerNoCache, 
                { "path": root, "default_filename": DEFAULT_FILENAME}),
    ])

    try:
        B4WLocalServer.server = tornado.httpserver.HTTPServer(application)
        B4WLocalServer.server.listen(port, address=address)
        B4WLocalServer.server_status = SUB_THREAD_START_SERV_OK
        print("serving at port", port)
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
    path_to_index = os.path.join(b4w_src_path, "index.html")
    os.path.normpath(path_to_index)
    return b4w_src_path != "" and os.path.exists(path_to_index)

def register(): 
    bpy.utils.register_class(B4WStartServer)
    bpy.utils.register_class(B4WShutdownServer)
    bpy.utils.register_class(B4WOpenSDK)
    bpy.utils.register_class(B4WServerMessage)

def unregister():
    bpy.utils.unregister_class(B4WStartServer)
    bpy.utils.unregister_class(B4WShutdownServer)
    bpy.utils.unregister_class(B4WOpenSDK)
    bpy.utils.unregister_class(B4WServerMessage)
