import bpy
import imp
import os

class B4WReexportPath(bpy.types.PropertyGroup):

    def path_update(self, context):
        save_reexport_paths()

    path = bpy.props.StringProperty(name="Reexport Path",
            description = "Directory with Exported Files (*.json or *.html)",
            default = "", update = path_update)


@bpy.app.handlers.persistent
def load_reexport_paths(arg):
    prefs = bpy.context.user_preferences.addons[__package__].preferences

    pfile = bpy.utils.user_resource("CONFIG", "b4w", True)

    try:
        pmod = imp.find_module("reexport_paths", [pfile])
    except ImportError:
        save_reexport_paths()
        pmod = imp.find_module("reexport_paths", [pfile])

    loaded_paths = imp.load_module("reexport_paths", pmod[0], pmod[1], pmod[2])

    prefs.b4w_reexport_path_index = loaded_paths.index

    prefs.b4w_reexport_paths.clear()

    for path in loaded_paths.paths:
        prefs.b4w_reexport_paths.add()
        prefs.b4w_reexport_paths[-1].path = path

def save_reexport_paths():
    prefs = bpy.context.user_preferences.addons[__package__].preferences

    index = prefs.b4w_reexport_path_index

    paths = []

    for path in prefs.b4w_reexport_paths:
        paths.append(path.path)

    with open(os.path.join(bpy.utils.user_resource("CONFIG", "b4w", True),
            "reexport_paths.py"), "w") as pfile:
        pfile.write("index=" + str(index) + "\n")
        pfile.write("paths=" + str(paths))

class UI_UL_reexport_paths(bpy.types.UIList):
    def draw_item(self, context, layout, data, item, icon, active_data, active_propname, index):
        if self.layout_type in {'DEFAULT', 'COMPACT'}:
            layout.label(item.path, icon="NEWFOLDER")
        elif self.layout_type in {'GRID'}:
            layout.alignment = 'CENTER'
            layout.label(item.path)


class B4WReexportPanel(bpy.types.Panel):
    bl_idname = "b4w.reexport_dialog"
    bl_label = "Mass Reexporter"
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
            layout.label(text = "Blend4Web SDK was not found.")
            layout.label(text = "Please download and configure it before using Mass Reexporter.")
            return

        layout.label(text = "Check info window for export results.")
        
        row = layout.row()
        row.template_list("UI_UL_reexport_paths", "", prefs,
                "b4w_reexport_paths", prefs, "b4w_reexport_path_index", rows=3)

        col = row.column(align=True)
        col.operator("b4w.reexport_path_append", icon='ZOOMIN', text="")
        col.operator("b4w.reexport_path_remove", icon='ZOOMOUT', text="")

        paths = prefs.b4w_reexport_paths
        path_index = prefs.b4w_reexport_path_index

        # index is not saved each time it's updated to save time so may be incorrect
        if not paths or path_index < 0 or path_index >= len(paths):
            return

        row = layout.row(align=True)
        row.prop(paths[path_index], "path", text="Exported Directory")
        row.operator("buttons.file_browse", text="", icon='FILESEL').relative_path = False

        row = layout.row()
        row.operator("b4w.reexport", text="Reexport")

class B4WReexportPathAppend(bpy.types.Operator):
    bl_idname      = "b4w.reexport_path_append"
    bl_label       = "Reexport Append"
    bl_options     = {"INTERNAL"}
    bl_description = "Append exported directory"

    def invoke(self, context, event):
        prefs = bpy.context.user_preferences.addons[__package__].preferences

        prefs.b4w_reexport_paths.add()
        prefs.b4w_reexport_path_index = len(prefs.b4w_reexport_paths) - 1

        save_reexport_paths()

        return {"FINISHED"}

class B4WReexportPathRemove(bpy.types.Operator):
    bl_idname      = "b4w.reexport_path_remove"
    bl_label       = "Reexport Remove"
    bl_options     = {"INTERNAL"}
    bl_description = "Remove exported directory"

    def invoke(self, context, event):
        prefs = bpy.context.user_preferences.addons[__package__].preferences

        if prefs.b4w_reexport_path_index >= 0:
            prefs.b4w_reexport_paths.remove(prefs.b4w_reexport_path_index)

            if (prefs.b4w_reexport_path_index > 0 or
                    len(prefs.b4w_reexport_paths) == 0):
                prefs.b4w_reexport_path_index -= 1

        save_reexport_paths()

        return {"FINISHED"}

class B4WReexport(bpy.types.Operator):
    bl_idname      = 'b4w.reexport'
    bl_label       = "Reexport"
    bl_options     = {"INTERNAL"}
    bl_description = ("Perform mass reexport. Depending on amount of work this "
            "may take some time.")

    def execute(self, context):
        obj = context.active_object

        prefs = bpy.context.user_preferences.addons[__package__].preferences

        scripts_path = os.path.join(prefs.b4w_src_path, "scripts")

        rmod = imp.find_module("reexporter", [scripts_path])
        reexporter = imp.load_module("reexporter", rmod[0], rmod[1], rmod[2])

        path_collection = prefs.b4w_reexport_paths

        context.window_manager.progress_begin(0, len(path_collection))

        for i, path_pgroup in enumerate(path_collection):
            path = path_pgroup.path

            if path and os.path.exists(path):
                context.window_manager.progress_update(i)
                reexporter.reexport(bpy.app.binary_path, path, path, self.report)

        context.window_manager.progress_end()

        return {'FINISHED'}

def register(): 
    bpy.utils.register_class(UI_UL_reexport_paths)
    bpy.utils.register_class(B4WReexportPath)
    bpy.utils.register_class(B4WReexportPathAppend)
    bpy.utils.register_class(B4WReexportPathRemove)
    bpy.utils.register_class(B4WReexportPanel)
    bpy.utils.register_class(B4WReexport)

def unregister(): 
    bpy.utils.unregister_class(UI_UL_reexport_paths)
    bpy.utils.unregister_class(B4WReexportPath)
    bpy.utils.unregister_class(B4WReexportPathAppend)
    bpy.utils.unregister_class(B4WReexportPathRemove)
    bpy.utils.unregister_class(B4WReexportPanel)
    bpy.utils.unregister_class(B4WReexport)
