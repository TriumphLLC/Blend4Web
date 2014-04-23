import bpy
from bpy.props import StringProperty

import blend4web
from .b4w_bin_suffix import get_platform_data

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
        layout = self.layout
        layout.label(self.message, icon="ERROR")

@bpy.app.handlers.persistent
def validate_version(arg):
    if (bpy.app.version[0] != blend4web.bl_info["blender"][0]
            or bpy.app.version[1] != blend4web.bl_info["blender"][1]):
        message = "Blender version " \
                + ".".join(map(str, blend4web.bl_info["blender"][:-1])) \
                + " is required by Blend4Web addon. Current version is " \
                + ".".join(map(str, bpy.app.version[:-1]))

        # remove callback before another scene update aroused by init_error_message
        if validate_version in bpy.app.handlers.scene_update_pre:
            bpy.app.handlers.scene_update_pre.remove(validate_version)
        bpy.ops.b4w.init_error_message("INVOKE_DEFAULT", message=message)

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