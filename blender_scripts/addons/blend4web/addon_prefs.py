import bpy
from bpy.types import AddonPreferences
from bpy.props import StringProperty, IntProperty, BoolProperty
import os

import blend4web
b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_

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

    path = bpy.props.StringProperty(name=_("Reexport Path"),
            description = _("Directory with Exported Files (*.json or *.html)"),
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
    b4w_src_path = StringProperty(name=_("Blend4Web SDK Directory"), \
            subtype='DIR_PATH', update=update_b4w_src_path,
            description=_("Path to SDK"))
    b4w_port_number = IntProperty(name=_("Server Port"), default=6687, min=0,
            max=65535, description=_("Server port number"))
    b4w_server_auto_start = BoolProperty(name=_("Run development server "
            "automatically"), default = True, description=_("Run on Startup"))
    b4w_check_for_updates = BoolProperty(name=_("Check for updates"),
            default = False, description=_("Check for new addon version"))
    b4w_autodetect_sdk_path = bpy.props.StringProperty()
    b4w_enable_ext_requests = BoolProperty(name=_("Enable External Requests"),
            default = False, description=_("Enable external requests to the server"))

    b4w_available_for_update_version = bpy.props.StringProperty()
    b4w_reexport_paths = bpy.props.CollectionProperty(
        type=B4WReexportPath)
    b4w_reexport_path_index = IntProperty(default=-1, min=-1)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "b4w_src_path")

        layout.prop(self, "b4w_check_for_updates",
            text=_("Check For Updates on Startup"))
        if self.b4w_available_for_update_version:
            update_available = bpy.app.translations.pgettext_tip(_("Update is available: %s"), "Operator")
            layout.operator("wm.url_open", text=(update_available % \
            (self.b4w_available_for_update_version)), icon='URL').url = DOWNLOADS

        layout.label(text = _("Development Server:"))
        row = layout.row()
        row.prop(self, "b4w_server_auto_start", text=_("Run on Startup"))
        row.prop(self, "b4w_port_number")
        row.prop(self, "b4w_enable_ext_requests")
        for m in blend4web.init_mess:
            row = layout.row()
            row.label(m, icon="ERROR")


