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
import imp
import os

import blend4web

b4w_modules =["addon_prefs", "translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))
from blend4web.translator import _, p_

@bpy.app.handlers.persistent
def load_reexport_paths(arg):
    prefs = bpy.context.user_preferences.addons[__package__].preferences

    pfile = bpy.utils.user_resource("CONFIG", "b4w", True)

    try:
        pmod = imp.find_module("reexport_paths", [pfile])
    except ImportError:
        addon_prefs.save_reexport_paths()
        pmod = imp.find_module("reexport_paths", [pfile])

    loaded_paths = imp.load_module("reexport_paths", pmod[0], pmod[1], pmod[2])

    prefs.b4w_reexport_path_index = loaded_paths.index

    prefs.b4w_reexport_paths.clear()

    for path in loaded_paths.paths:
        prefs.b4w_reexport_paths.add()
        prefs.b4w_reexport_paths[-1].path = path

class UI_UL_reexport_paths(bpy.types.UIList):
    def draw_item(self, context, layout, data, item, icon, active_data, active_propname, index):
        if self.layout_type in {'DEFAULT', 'COMPACT'}:
            layout.label(item.path, icon="NEWFOLDER")
        elif self.layout_type in {'GRID'}:
            layout.alignment = 'CENTER'
            layout.label(item.path)


class B4WReexportPanel(bpy.types.Panel):
    bl_idname = "b4w.reexport_dialog"
    bl_label = _("Mass Reexporter")
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "render"
    bl_options = {'DEFAULT_CLOSED'}
    COMPAT_ENGINES = ["BLEND4WEB"]

    @classmethod
    def poll(cls, context):
        scene = context.scene
        return scene and (scene.render.engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        prefs = bpy.context.user_preferences.addons[__package__].preferences

        layout = self.layout

        if prefs.b4w_src_path == "" or not os.path.exists(prefs.b4w_src_path):
            layout.label(text = _("Blend4Web SDK was not found."))
            layout.label(text = _("Please download and configure it before using Mass Reexporter."))
            return

        layout.label(text = _("Check info window for export results."))
        
        row = layout.row()
        row.template_list("UI_UL_reexport_paths", "", prefs,
                "b4w_reexport_paths", prefs, "b4w_reexport_path_index", rows=3)

        col = row.column(align=True)
        col.operator("b4w.reexport_path_append", icon='ZOOMIN', text=_(""))
        col.operator("b4w.reexport_path_remove", icon='ZOOMOUT', text=_(""))

        paths = prefs.b4w_reexport_paths
        path_index = prefs.b4w_reexport_path_index

        # index is not saved each time it's updated to save time so may be incorrect
        if not paths or path_index < 0 or path_index >= len(paths):
            return

        row = layout.row(align=True)
        row.prop(paths[path_index], "path", text=_("Exported Directory"))
        row.operator("buttons.file_browse", text=_(""), icon='FILESEL').relative_path = False

        row = layout.row()
        row.operator("b4w.reexport", text=p_("Reexport", "Operator"))

class B4WReexportPathAppend(bpy.types.Operator):
    bl_idname      = "b4w.reexport_path_append"
    bl_label       = p_("Reexport Append", "Operator")
    bl_options     = {"INTERNAL"}
    bl_description = _("Append exported directory")

    def invoke(self, context, event):
        prefs = bpy.context.user_preferences.addons[__package__].preferences

        prefs.b4w_reexport_paths.add()
        prefs.b4w_reexport_path_index = len(prefs.b4w_reexport_paths) - 1

        addon_prefs.save_reexport_paths()

        return {"FINISHED"}

class B4WReexportPathRemove(bpy.types.Operator):
    bl_idname      = "b4w.reexport_path_remove"
    bl_label       = p_("Reexport Remove", "Operator")
    bl_options     = {"INTERNAL"}
    bl_description = _("Remove exported directory")

    def invoke(self, context, event):
        prefs = bpy.context.user_preferences.addons[__package__].preferences

        if prefs.b4w_reexport_path_index >= 0:
            prefs.b4w_reexport_paths.remove(prefs.b4w_reexport_path_index)

            if (prefs.b4w_reexport_path_index > 0 or
                    len(prefs.b4w_reexport_paths) == 0):
                prefs.b4w_reexport_path_index -= 1

        addon_prefs.save_reexport_paths()

        return {"FINISHED"}

class B4WReexport(bpy.types.Operator):
    bl_idname      = 'b4w.reexport'
    bl_label       = p_("Reexport", "Operator")
    bl_options     = {"INTERNAL"}
    bl_description = _("Perform mass reexport. Depending on amount of work this "
            "may take some time")

    def execute(self, context):
        obj = context.active_object

        prefs = bpy.context.user_preferences.addons[__package__].preferences

        scripts_path = os.path.join(prefs.b4w_src_path, "scripts")

        pmod = imp.find_module("process_blend", [scripts_path])
        processor = imp.load_module("process_blend", pmod[0], pmod[1], pmod[2])

        path_collection = prefs.b4w_reexport_paths

        context.window_manager.progress_begin(0, len(path_collection))

        for i, path_pgroup in enumerate(path_collection):
            path = path_pgroup.path

            if path and os.path.exists(path):
                context.window_manager.progress_update(i)
                processor.process_files(bpy.app.binary_path, path, path, self.report)

        context.window_manager.progress_end()

        return {'FINISHED'}
import sys
def register(): 
    bpy.utils.register_class(UI_UL_reexport_paths)
    bpy.utils.register_class(B4WReexportPathAppend)
    bpy.utils.register_class(B4WReexportPathRemove)
    bpy.utils.register_class(B4WReexportPanel)
    bpy.utils.register_class(B4WReexport)

def unregister(): 
    bpy.utils.unregister_class(UI_UL_reexport_paths)
    bpy.utils.unregister_class(B4WReexportPathAppend)
    bpy.utils.unregister_class(B4WReexportPathRemove)
    bpy.utils.unregister_class(B4WReexportPanel)
    bpy.utils.unregister_class(B4WReexport)
