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
from bpy.props import StringProperty
import addon_utils

import blend4web

b4w_modules = ["b4w_bin_suffix", "translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

import os
from blend4web.translator import _, p_

class B4WInitErrorMessage(bpy.types.Operator):
    bl_idname = "b4w.init_error_message"
    bl_label = p_("Blend4Web initialization error!", "Operator")
    bl_options = {"INTERNAL"}

    message = StringProperty(name=_("Message string"))

    def execute(self, context):
        # NOTE: disable addon if binaries are incompatible
        if __package__ in bpy.context.user_preferences.addons:
            bpy.ops.wm.addon_disable(module=__package__)
        return {'FINISHED'}

    def cancel(self, context):
        # NOTE: disable addon if binaries are incompatible
        if __package__ in bpy.context.user_preferences.addons:
            bpy.ops.wm.addon_disable(module=__package__)

    def invoke(self, context, event):
        wm = context.window_manager
        context.window.cursor_set("DEFAULT")
        return wm.invoke_props_dialog(self, 450)

    def draw(self, context):
        self.layout.label(self.message, icon="ERROR")

class B4WDeprecatedPathToScriptsMessage(bpy.types.Operator):
    bl_idname = "b4w.deprecated_path_to_script"
    bl_label = p_("Warning: Deprecated path to scripts.", "Operator")
    bl_options = {"INTERNAL"}

    path = StringProperty(name=_("Path to SDK"))

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        wm = context.window_manager
        context.window.cursor_set("DEFAULT")
        return wm.invoke_props_dialog(self, 450)

    def draw(self, context):
        self.layout.label("Deprecated path to scripts. The correct path is "
                + self.path, icon="ERROR")

@bpy.app.handlers.persistent
def check_addon_dir(arg):

    if check_addon_dir in bpy.app.handlers.scene_update_pre:
        bpy.app.handlers.scene_update_pre.remove(check_addon_dir)

    path_to_scripts = bpy.context.user_preferences.filepaths.script_directory
    base_name = os.path.basename(path_to_scripts)
    dir_name = os.path.dirname(path_to_scripts)

    if base_name == "":
        base_name = os.path.basename(dir_name)
        dir_name = os.path.dirname(dir_name)

    if base_name == "blender_scripts":
        bpy.ops.b4w.deprecated_path_to_script("INVOKE_DEFAULT", path=dir_name)

@bpy.app.handlers.persistent
def bin_invalid_message(arg):
    # remove callback before another scene update aroused by init_error_message
    if bin_invalid_message in bpy.app.handlers.scene_update_pre:
        bpy.app.handlers.scene_update_pre.remove(bin_invalid_message)

    platform_data = b4w_bin_suffix.get_platform_data()
    message = "Addon is not compatible with \"" \
            + platform_data["system_name"] + " x" + platform_data["arch_bits"] \
            + "\" platform."
    bpy.ops.b4w.init_error_message("INVOKE_DEFAULT", message=message)

# NOTE: register class permanently to held it even after disabling an addon
bpy.utils.register_class(B4WInitErrorMessage)
bpy.utils.register_class(B4WDeprecatedPathToScriptsMessage)

def detect_sdk():
    init_script_path = None
    for mod in addon_utils.modules(refresh=False):
        if mod.bl_info['name'] == 'Blend4Web':
            init_script_path = mod.__file__
            break

    if not init_script_path:
        return None

    signaure_file_path = os.path.join(
        os.path.dirname(os.path.abspath(init_script_path)), "..", "..", "VERSION")
    result = None
    try:
        with open(signaure_file_path) as f:
            lines = f.readlines()
        params = lines[0].split()
        if not params[0] == "Blend4Web":
            return None
        # parse version
        v_split = params[1].split(".")
        version = []

        try:
            for v in v_split:
                version.append(int(v))
        except ValueError:
            return None
        vl_info_ver = mod.bl_info['version']

        # extend if lengths not equals
        for i in range(len(vl_info_ver) - len(version)):
            version.append(0)

        for i in range(len(vl_info_ver)):
            if not vl_info_ver[i] == version[i]:
                return None

        result = os.path.dirname(os.path.realpath(os.path.normpath(signaure_file_path)))
    except:
        return None

    return result