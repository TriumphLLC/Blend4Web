import bpy
import os
import webbrowser
from bpy.props import StringProperty
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading, sys
import time

WAIT_RESPONSE               = -1
SUB_THREAD_START_SERV_OK    = 0
SUB_THREAD_SERVER_EXC       = 1
SUB_THREAD_STOP_SERV_OK     = 2
SUB_THREAD_OTHER_EXC        = 3
MAIN_THREAD_START_EXC       = 4
MAIN_THREAD_STOP_EXC        = 5

WAITING_TIME = 15000

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
   
    def execute(self, context):
        port = bpy.context.user_preferences.addons[__package__].preferences.b4w_port_number
        open_browser("http://localhost:" + str(port))
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
    bl_label = "B4W Start server"

    server_process = None
    waiting_for_serv = False
    error_message = ""
    server_status = WAIT_RESPONSE
    server = None
    def execute(self, context):
        B4WStartServer.server_status = WAIT_RESPONSE
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
                    B4WStartServer.server.shutdown()
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

def create_server():
    port = bpy.context.user_preferences.addons[__package__].preferences.b4w_port_number
    src_path = bpy.context.user_preferences.addons[__package__].preferences.b4w_src_path
    cur_dir = os.curdir
    os.chdir(src_path)

    try:
        B4WStartServer.server = HTTPServer(('', port), SimpleHTTPRequestHandler)
        B4WStartServer.server_status = SUB_THREAD_START_SERV_OK
        print("serving at port", port)
        B4WStartServer.server.serve_forever()

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
        B4WStartServer.server_status = SUB_THREAD_OTHER_EXC
        B4WStartServer.error_message = str(ex)
    os.chdir(cur_dir)

def register(): 
    bpy.utils.register_class(B4WStartServer)
    bpy.utils.register_class(B4WOpenSDK)
    bpy.utils.register_class(B4WServerMessage)

def unregister():
    bpy.utils.unregister_class(B4WStartServer)
    bpy.utils.unregister_class(B4WOpenSDK)
    bpy.utils.unregister_class(B4WServerMessage)

