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


import bpy
import blend4web

b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_

class B4W_ViewportSettings(bpy.types.PropertyGroup):
    update_material_animation = bpy.props.BoolProperty(
        name = _("update_material_animation"),
        description = _("Update animated shader when frame is changed"),
        default = False
    )

##########################################################
# draw UI Buttons
class B4W_ViewportTweaksDrawUI(bpy.types.Panel):
    bl_idname = _('Viewport')
    bl_label = _('Viewport')
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'TOOLS'
    bl_category = 'Blend4Web'

    def __init__(self):
        pass

    @classmethod
    def poll(self, context):
        return True

    def draw(self, context):
        layout = self.layout
        row = layout.row()
        row.prop(bpy.context.window_manager.b4w_viewport_settings,
                 "update_material_animation", text=_("Update Material Animation"), expand=True)

def init_properties():
    b4w_viewport_settings = bpy.props.PointerProperty(
        name = _("B4W: viewport settings"),
        type = B4W_ViewportSettings
    )
    bpy.types.WindowManager.b4w_viewport_settings = b4w_viewport_settings

def clear_properties():
    props = ['b4w_viewport_settings']
    for p in props:
        if bpy.context.window_manager.get(p) != None:
            del bpy.context.window_manager[p]
        try:
            x = getattr(bpy.types.WindowManager, p)
            del x
        except:
            pass

def register():
    init_properties()

def unregister():
    clear_properties()

