import bpy
from bpy.props import StringProperty
import addon_utils

import blend4web
from .b4w_bin_suffix import get_platform_data
import os

class B4WInitErrorMessage(bpy.types.Operator):
    bl_idname = "b4w.init_error_message"
    bl_label = "Blend4Web initialization error!"
    bl_options = {"INTERNAL"}

    message = StringProperty(name="Message string")

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

class B4WVersionMismatchMessage(bpy.types.Operator):
    bl_idname = "b4w.version_mismatch_message"
    bl_label = "Warning: Blender version mismatch."
    bl_options = {"INTERNAL"}

    message = StringProperty(name="Message string")

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        wm = context.window_manager
        context.window.cursor_set("DEFAULT")
        return wm.invoke_props_dialog(self, 450)

    def draw(self, context):
        self.layout.label(self.message, icon="ERROR")

@bpy.app.handlers.persistent
def validate_version(arg):
    if (bpy.app.version[0] != blend4web.bl_info["blender"][0]
            or bpy.app.version[1] != blend4web.bl_info["blender"][1]):
        message = "Blender " \
                + ".".join(map(str, blend4web.bl_info["blender"][:-1])) \
                + " is recommended for the Blend4Web addon. Current version is " \
                + ".".join(map(str, bpy.app.version[:-1]))

        # remove callback before another scene update aroused by init_error_message
        if validate_version in bpy.app.handlers.scene_update_pre:
            bpy.app.handlers.scene_update_pre.remove(validate_version)
        bpy.ops.b4w.version_mismatch_message("INVOKE_DEFAULT", message=message)

@bpy.app.handlers.persistent
def bin_invalid_message(arg):
    # remove callback before another scene update aroused by init_error_message
    if bin_invalid_message in bpy.app.handlers.scene_update_pre:
        bpy.app.handlers.scene_update_pre.remove(bin_invalid_message)

    platform_data = get_platform_data()
    message = "Addon is not compatible with \"" \
            + platform_data["system_name"] + " x" + platform_data["arch_bits"] \
            + "\" platform."
    bpy.ops.b4w.init_error_message("INVOKE_DEFAULT", message=message)

# NOTE: register class permanently to held it even after disabling an addon
bpy.utils.register_class(B4WInitErrorMessage)
bpy.utils.register_class(B4WVersionMismatchMessage)

def detect_sdk():
    init_script_path = None
    for mod in addon_utils.modules(refresh=False):
        if mod.bl_info['name'] == 'Blend4Web':
            init_script_path = mod.__file__
            break

    if not init_script_path:
        return None

    signaure_file_path = os.path.join(
        os.path.dirname(os.path.abspath(init_script_path)), "..", "..", "..", "VERSION")
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
