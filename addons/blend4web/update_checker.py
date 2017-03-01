# Copyright (C) 2014-2017 Triumph LLC
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



import urllib
import bpy
import json
import blend4web

b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_

def check_for_update(blender_version, b4w_version):
    try:
        r = urllib.request.urlopen('https://www.blend4web.com/get_versions/', timeout=1).read()
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
    b4w_current_version = "%02d.%02d.%d" % (ver[0], ver[1], ver[2])
    bv = bpy.app.version
    blender_current_version = "%d.%02d.%d" % (bv[0], bv[1], bv[2])
    if check:
        # uncomment for testing
        # blender_current_version = '2.75'
        # b4w_current_version = '15.09'
        new_ver = check_for_update(blender_current_version, b4w_current_version)
        if new_ver:
            pref.b4w_available_for_update_version = new_ver
            bpy.ops.b4w.update_message('INVOKE_DEFAULT')

class B4WUpdateMessage(bpy.types.Operator):
    bl_idname = "b4w.update_message"
    bl_label = p_("Message", "Context")

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        wm = context.window_manager
        return wm.invoke_popup(self, width=400, height=200)

    def draw(self, context):
        pref = bpy.context.user_preferences.addons[__package__].preferences
        version_message = bpy.app.translations.pgettext_tip(_("New version of Blend4Web is available: %s"))
        self.layout.label(version_message % \
            (pref.b4w_available_for_update_version))
        self.layout.operator("wm.url_open", text=_("Download"), icon='URL').url = "https://www.blend4web.com/en/downloads/"

def register():
    bpy.app.handlers.scene_update_pre.append(check_for_update_callback)

def unregister():
    if check_for_update_callback in bpy.app.handlers.scene_update_pre:
        bpy.app.handlers.scene_update_pre.remove(check_for_update_callback)
