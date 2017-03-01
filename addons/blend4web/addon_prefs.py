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
from bpy.types import AddonPreferences
from bpy.props import StringProperty, IntProperty, BoolProperty
import os

import blend4web
b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_

DOWNLOADS = "https://www.blend4web.com/en/downloads/"

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
            "reexport_paths.py"), "w", encoding="utf-8") as pfile:
        pfile.write("index=" + str(index) + "\n")
        pfile.write("paths=" + str(paths))

class B4WPreferences(AddonPreferences):
    # this must match the addon name, use '__package__'
    # when defining this in a submodule of a python package.
    bl_idname = os.path.splitext(__name__)[0]
    b4w_src_path = bpy.props.StringProperty();
    b4w_port_number = IntProperty(name=_("Server Port"), default=6687, min=0,
            max=65535, description=_("Server port number"))
    b4w_server_auto_start = BoolProperty(name=_("Run development server "
            "automatically"), default = True, description=_("Run on Startup"))
    b4w_check_for_updates = BoolProperty(name=_("Check for updates"),
            default = False, description=_("Check for new addon version"))
    b4w_enable_ext_requests = BoolProperty(name=_("Enable External Requests"),
            default = False, description=_("Enable external requests to the server"))

    b4w_available_for_update_version = bpy.props.StringProperty()
    b4w_reexport_paths = bpy.props.CollectionProperty(
        type=B4WReexportPath)
    b4w_reexport_path_index = IntProperty(default=-1, min=-1)

    def draw(self, context):
        layout = self.layout

        layout.prop(self, "b4w_check_for_updates",
            text=_("Check For Updates on Startup"))
        if self.b4w_available_for_update_version:
            update_available = bpy.app.translations.pgettext_tip(_("Update is available: %s"), "Operator")
            layout.operator("wm.url_open", text=(update_available % \
            (self.b4w_available_for_update_version)), icon='URL').url = DOWNLOADS
        if has_valid_sdk_path():
            layout.label(text = _("Development Server:"))
            row = layout.row()
            row.prop(self, "b4w_server_auto_start", text=_("Run on Startup"))
            row.prop(self, "b4w_port_number")
            row.prop(self, "b4w_enable_ext_requests")
            for m in blend4web.init_mess:
                row = layout.row()
                row.label(m, icon="ERROR")

def get_prefs():
    return bpy.context.user_preferences.addons[__package__].preferences

def sdk_path(append_path=""):
    b4w_src_path = get_prefs().b4w_src_path
    return os.path.normpath(os.path.join(b4w_src_path, append_path))

def has_valid_sdk_path():
    b4w_src_path = get_prefs().b4w_src_path
    path_to_index = os.path.join(b4w_src_path, "index.html")
    return b4w_src_path != "" and os.path.exists(path_to_index)

