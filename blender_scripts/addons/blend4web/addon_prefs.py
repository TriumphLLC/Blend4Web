import bpy
from bpy.types import AddonPreferences
from bpy.props import StringProperty, IntProperty, BoolProperty
import os

DOWNLOADS = "https://www.blend4web.com/en/downloads/"

def update_b4w_src_path(addon_pref, context):
    if addon_pref.b4w_src_path != "":
        corrected_path = os.path.normpath(bpy.path.abspath(
            addon_pref.b4w_src_path))
        if not (addon_pref.b4w_src_path == corrected_path):
            addon_pref.b4w_src_path = corrected_path

class B4WReexportPath(bpy.types.PropertyGroup):

    def path_update(self, context):
        save_reexport_paths()

    path = bpy.props.StringProperty(name="Reexport Path",
            description = "Directory with Exported Files (*.json or *.html)",
            default = "", update = path_update)


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

class B4WPreferences(AddonPreferences):
    # this must match the addon name, use '__package__'
    # when defining this in a submodule of a python package.
    bl_idname = os.path.splitext(__name__)[0]
    b4w_src_path = StringProperty(name="Blend4Web SDK Directory", \
            subtype='DIR_PATH', update=update_b4w_src_path,
            description="Path to SDK")
    b4w_port_number = IntProperty(name="Server Port", default=6687, min=0,
            max=65535, description="Server port number")
    b4w_server_auto_start = BoolProperty(name="Run development server "
            "automatically", default = True, description="Run on Startup")
    b4w_check_for_updates = BoolProperty(name="Check for updates",
            default = False, description="Check for new addon version")
    b4w_autodetect_sdk_path = bpy.props.StringProperty()
    b4w_enable_ext_requests = BoolProperty(name="Enable External Requests",
            default = False, description="Enable external requests to the server")

    b4w_available_for_update_version = bpy.props.StringProperty()
    b4w_reexport_paths = bpy.props.CollectionProperty(
        type=B4WReexportPath)
    b4w_reexport_path_index = IntProperty(default=-1, min=-1)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "b4w_src_path")

        layout.prop(self, "b4w_check_for_updates",
            text="Check For Updates on Startup")
        if self.b4w_available_for_update_version:
            layout.operator("wm.url_open", text="Update is available: %s" % \
            (self.b4w_available_for_update_version), icon='URL').url = DOWNLOADS

        layout.label(text = "Development Server:")
        row = layout.row()
        row.prop(self, "b4w_server_auto_start", text="Run on Startup")
        row.prop(self, "b4w_port_number")
        row.prop(self, "b4w_enable_ext_requests")

def register():
    bpy.utils.register_class(B4WReexportPath)
    bpy.utils.register_class(B4WPreferences)

def unregister():
    bpy.utils.unregister_class(B4WReexportPath)
    bpy.utils.unregister_class(B4WPreferences)

