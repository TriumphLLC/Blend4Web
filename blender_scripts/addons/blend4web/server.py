import bpy
from bpy.props import StringProperty

import datetime
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

def open_browser(url):
    try:
        webbrowser.open(url)
    except BaseException as ex:
        bpy.ops.b4w.server_message("INVOKE_DEFAULT", 
                message="Could not open browser: " + str(ex))
        
class B4WOpenSDK(bpy.types.Operator):
    bl_idname = "b4w.open_sdk"
    bl_label = "B4W Open SDK"
    bl_options = {"INTERNAL"}
   
    def execute(self, context):
        port = bpy.context.user_preferences.addons[__package__].preferences.b4w_port_number
        open_browser("http://" + ADDRESS + ":" + str(port))
        return {"FINISHED"}

class StopThread(StopIteration): pass
threading.SystemExit = SystemExit, StopThread

class B4WServerThread(threading.Thread):

    def stop(self):
        self.__stop = True

    def _bootstrap(self):
        if threading._trace_hook is not None:
            raise ValueError('Cannot run thread with tracing!')
        self.__stop = False
        sys.settrace(self.__trace)
        super()._bootstrap()

    def __trace(self, frame, event, arg):
        if self.__stop:
            raise StopThread()
        return self.__trace

class B4WStartServer(bpy.types.Operator):
    bl_idname = "b4w.start_server"
    bl_label = "B4W Start Server"
    bl_options = {"INTERNAL"}

    server_process = None
    waiting_for_serv = False
    error_message = ""
    server_status = WAIT_RESPONSE
    server = None
    def execute(self, context):
        B4WStartServer.server_status = WAIT_RESPONSE
        try:
            port = bpy.context.user_preferences.addons[__package__].preferences.b4w_port_number
            session = requests.Session()
            session.trust_env = False
            req = session.head("http://localhost:" + str(port)) 
        except:
            pass
        else:
            if req.status_code == STATUS_OK:
                if ("B4W.LocalServer" in req.headers and req.headers["B4W.LocalServer"] == "1"
                        and bpy.context.user_preferences.addons[__package__].preferences.b4w_server_auto_start):
                    B4WStartServer.server_status = SUB_THREAD_START_SERV_OK
                    return {"FINISHED"}
            else:
                return {"FINISHED"}
        if not B4WStartServer.server_process:
            B4WStartServer.server_process = B4WServerThread(target=create_server)
            B4WStartServer.server_process.daemon = True
            try:
                B4WStartServer.server_process.start()
            except BaseException as ex:
                B4WStartServer.server_status = MAIN_THREAD_START_EXC
                B4WStartServer.server_process = None
                bpy.ops.b4w.server_message("INVOKE_DEFAULT", 
                        message="Server starting error: " + str(ex))

        else:
            B4WStartServer.waiting_for_serv = True
            try:
                if B4WStartServer.server is not None:
                    B4WStartServer.server.stop()
                    tornado.ioloop.IOLoop.instance().stop()
                B4WStartServer.server_process.stop()
                B4WStartServer.server_process = None
                B4WStartServer.server = None
            except BaseException as ex:
                B4WStartServer.server_status = MAIN_THREAD_STOP_EXC
                B4WStartServer.waiting_for_serv = False
                bpy.ops.b4w.server_message("INVOKE_DEFAULT", 
                        message="Server stopping error: " + str(ex))

        begin_time = time.time()
        while B4WStartServer.server_status == WAIT_RESPONSE:
            if time.time() - begin_time > WAITING_TIME:
                B4WStartServer.waiting_for_serv = False
                B4WStartServer.server_status = SUB_THREAD_STOP_SERV_OK
                break

        if B4WStartServer.server_status == SUB_THREAD_SERVER_EXC:
            bpy.ops.b4w.server_message("INVOKE_DEFAULT", 
                    message="Server starting error: " +  B4WStartServer.error_message)

        if B4WStartServer.server_status == SUB_THREAD_STOP_SERV_OK:
            for area in context.screen.areas:
                if area.type == "PROPERTIES":
                    prop_area = area
            if prop_area:
                prop_area.tag_redraw()

        if B4WStartServer.server_status == SUB_THREAD_OTHER_EXC:
            bpy.ops.b4w.server_message("INVOKE_DEFAULT", 
                    message="Could not start the server: " + B4WStartServer.error_message)

        return {"FINISHED"}

class StaticFileHandlerNoCache(tornado.web.StaticFileHandler):
    def set_extra_headers(self, path):
        # Disable cache
        self.set_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.set_header("Expires", "0")
        now = datetime.datetime.now()
        exp = datetime.datetime(now.year - 1, now.month, now.day)
        self.set_header("Last-Modified", exp)
        self.add_header("B4W.LocalServer", "1")

def create_server():
    port = bpy.context.user_preferences.addons[__package__].preferences.b4w_port_number
    root = bpy.context.user_preferences.addons[__package__].preferences.b4w_src_path

    application = tornado.web.Application([
        (r"/(.*)$", StaticFileHandlerNoCache, 
                { "path": root, "default_filename": DEFAULT_FILENAME}),
    ])

    try:
        B4WStartServer.server = tornado.httpserver.HTTPServer(application)
        B4WStartServer.server.listen(port, address=ADDRESS)
        B4WStartServer.server_status = SUB_THREAD_START_SERV_OK
        print("serving at port", port)
        tornado.ioloop.IOLoop.instance().start()

        print("stop serving at port", port)
        B4WStartServer.waiting_for_serv = False
        B4WStartServer.server_status = SUB_THREAD_STOP_SERV_OK
    except OSError as ex:
        B4WStartServer.server_process = None
        B4WStartServer.server_status = SUB_THREAD_SERVER_EXC
        B4WStartServer.error_message = str(ex)
    except StopThread:
        print("stop serving at port", port)
        B4WStartServer.waiting_for_serv = False
        B4WStartServer.server_status = SUB_THREAD_STOP_SERV_OK
    except BaseException as ex:
        B4WStartServer.server_process = None
        B4WStartServer.server_status = SUB_THREAD_OTHER_EXC
        B4WStartServer.error_message = str(ex)

@bpy.app.handlers.persistent
def check_server(arg):
    if check_server in bpy.app.handlers.scene_update_pre:
        bpy.app.handlers.scene_update_pre.remove(check_server)
    if bpy.context.user_preferences.addons[__package__].preferences.b4w_server_auto_start:
        bpy.ops.b4w.start_server()

def register(): 
    bpy.utils.register_class(B4WStartServer)
    bpy.utils.register_class(B4WOpenSDK)
    bpy.utils.register_class(B4WServerMessage)

def unregister():
    bpy.utils.unregister_class(B4WStartServer)
    bpy.utils.unregister_class(B4WOpenSDK)
    bpy.utils.unregister_class(B4WServerMessage)
