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
import imp

import blend4web

b4w_modules = ["server", "addon_prefs", "translator", "render_engine"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_

def b4w_fast_preview(self, context):
    is_started = server.B4WLocalServer.is_started()

    if (context.scene.render.engine == "BLEND4WEB"
            or context.scene.render.engine == "CYCLES"):
        if is_started:
            row = self.layout.row(align=True)
            row.operator("b4w.preview",
                        text=p_("Fast Preview", "Operator"), icon_value=render_engine.custom_icons["b4w_icon"].icon_id)
            preferences = addon_prefs.get_prefs()
            icon = "LINKED" if preferences.b4w_sync_with_browser else "UNLINKED"
            row.prop(preferences, "b4w_sync_with_browser", icon=icon, text="", expand=False)

def register():
    bpy.types.VIEW3D_HT_header.append(b4w_fast_preview)

def unregister():
    bpy.types.VIEW3D_HT_header.remove(b4w_fast_preview)
