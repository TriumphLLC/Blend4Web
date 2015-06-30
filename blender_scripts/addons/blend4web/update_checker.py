__author__ = 'dal'

import urllib
import bpy
import json
import blend4web

def check_for_update(blender_version, b4w_version):
    try:
        r = urllib.request.urlopen('https://www.blend4web.com/get_versions/', timeout=1).readall()
    except urllib.error.URLError as e:
        print("B4W Can't check for updates: %s" % e)
        return None
    try:
        list = json.loads(r.decode("utf-8"))
        fresh_b4w_version = None
        for i in range(0, len(list), 2):
            if blender_version.find(list[i]) >= 0:
                if fresh_b4w_version is None:
                    fresh_b4w_version = list[i+1]
                else:
                    if fresh_b4w_version < list[i+1]:
                        fresh_b4w_version = list[i+1]
        if fresh_b4w_version:
            if fresh_b4w_version > b4w_version:
                return fresh_b4w_version
            else:
                return None
    except:
        return None

@bpy.app.handlers.persistent
def check_for_update_callback(arg):
    if check_for_update_callback in bpy.app.handlers.scene_update_pre:
        bpy.app.handlers.scene_update_pre.remove(check_for_update_callback)

    pref = bpy.context.user_preferences.addons[__package__].preferences
    pref.b4w_available_for_update_version = ""
    check = pref.b4w_check_for_updates
    ver = blend4web.bl_info["version"]
    b4w_current_version = "%s.%02d.%02d" % (ver[0], ver[1], ver[2])
    bv = bpy.app.version
    blender_current_version = "%s.%02d.%02d" % (bv[0], bv[1], bv[2])
    if check:
        # uncomment for testing
        # blender_current_version = '2.74'
        # b4w_current_version = '15.03'
        new_ver = check_for_update(blender_current_version, b4w_current_version)
        if new_ver:
            pref.b4w_available_for_update_version = new_ver
            bpy.ops.b4w.update_message('INVOKE_DEFAULT')

class B4WUpdateMessage(bpy.types.Operator):
    bl_idname = "b4w.update_message"
    bl_label = "Message"

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        wm = context.window_manager
        return wm.invoke_popup(self, width=400, height=200)

    def draw(self, context):
        pref = bpy.context.user_preferences.addons[__package__].preferences
        self.layout.label("New version of Blend4Web is available: %s" % \
            (pref.b4w_available_for_update_version))
        self.layout.operator("wm.url_open", text="Download", icon='URL').url = "https://www.blend4web.com/en/downloads/"

def register():
    bpy.utils.register_class(B4WUpdateMessage)
    bpy.app.handlers.scene_update_pre.append(check_for_update_callback)

def unregister():
    if check_for_update_callback in bpy.app.handlers.scene_update_pre:
        bpy.app.handlers.scene_update_pre.remove(check_for_update_callback)
    bpy.utils.unregister_class(B4WUpdateMessage)
