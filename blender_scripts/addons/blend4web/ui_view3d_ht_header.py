import bpy
import imp

import blend4web

b4w_modules = ["server", "translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_

def b4w_fast_preview(self, context):
    if server.has_valid_sdk_dir():
        is_started = server.B4WLocalServer.get_server_status() == server.SUB_THREAD_START_SERV_OK
        
        if context.scene.render.engine=="BLEND4WEB":
            self.layout.operator("b4w.preview",
                        text=p_("Fast Preview", "Operator"), icon="ZOOM_ALL")

def register():
    bpy.types.VIEW3D_HT_header.append(b4w_fast_preview)

def unregister():
    bpy.types.VIEW3D_HT_header.remove(b4w_fast_preview)
