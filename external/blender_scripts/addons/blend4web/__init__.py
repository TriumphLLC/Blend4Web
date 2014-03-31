bl_info = {
    "name": "Blend4Web",
    "author": "Blend4Web Development Team",
    "version": (14, 2, 28),
    "blender": (2, 70, 0),
    "b4w_format_version": "4.01",
    "api": 60991,
    "location": "File > Import-Export",
    "description": "Blend4Web is a Blender-friendly 3D web framework",
    "warning": "",
    "wiki_url": "blend4web.com",
    "tracker_url": "blend4web.com",
    "category": "Import-Export"
}

import os

import bpy
from bpy.types import AddonPreferences
from bpy.props import StringProperty

from . import b4w_renamer

# B4W custom properties
from . import properties

# B4W custom panels and buttons
from . import interface

# Blend4Web exporter
from . import exporter

# Blend4Web HTML exporter
from . import html_exporter

# Script for baking skeletal animation
from . import anim_baker

# Script for baking vertex animation
from . import vertex_anim_baker

# Copies cursor location as Blend4Web camera target
from . import camera_target_copier

# Old script needed for transfer of animation from Maya
from . import weights_copy

# Some scripts written by the artist
from . import split_actions, weights_mirror 

from . import vertex_normals

from . import vertex_groups_to_materials

from . import shore_distance_baker

from . import remove_unused_vgroups

from . import boundings_draw

def update_b4w_src_path(addon_pref, context):
    if addon_pref.b4w_src_path != "":
        corrected_path = os.path.normpath(bpy.path.abspath(addon_pref.b4w_src_path))
        if not (addon_pref.b4w_src_path == corrected_path):
            addon_pref.b4w_src_path = corrected_path

class B4WPreferences(AddonPreferences):
    # this must match the addon name, use '__package__'
    # when defining this in a submodule of a python package.
    bl_idname = __name__
    b4w_src_path = StringProperty(name="Path to b4w source", \
            subtype='DIR_PATH', update=update_b4w_src_path)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "b4w_src_path", text="Path to b4w source")

class VersionValidator(bpy.types.Operator):
    bl_idname = "b4w.validate_version"
    bl_label = "Version mismatch warning!"
    bl_options = {"INTERNAL"}

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        wm = context.window_manager
        context.window.cursor_set("DEFAULT")
        return wm.invoke_props_dialog(self, 450)

    def draw(self, context):
        layout = self.layout
        layout.label("Blender version " + ".".join(map(str, bl_info["blender"]))
                + " is required by Blend4Web addon. Current version is " 
                + ".".join(map(str, bpy.app.version)),
                icon="ERROR")

@bpy.app.handlers.persistent
def validate_version(arg):
    # NOTE: context.window is None on blender start
    if (bpy.app.version[0] != bl_info["blender"][0]
            or bpy.app.version[1] != bl_info["blender"][1]) \
            and bpy.context.window is not None:
        bpy.ops.b4w.validate_version("INVOKE_DEFAULT")

def register():
    properties.register()
    interface.register()
    exporter.register()
    html_exporter.register()
    vertex_anim_baker.register()
    anim_baker.register()
    camera_target_copier.register()
    
    weights_copy.register()
    split_actions.register()
    weights_mirror.register()

    vertex_normals.register()
    vertex_groups_to_materials.register()
    shore_distance_baker.register()
    remove_unused_vgroups.register()
    boundings_draw.register()
    b4w_renamer.register()

    bpy.utils.register_class(B4WPreferences)

    bpy.utils.register_class(VersionValidator)
    bpy.app.handlers.load_post.append(validate_version)

def unregister():
    properties.unregister()
    interface.unregister()
    exporter.unregister()
    html_exporter.unregister()
    vertex_anim_baker.unregister()
    anim_baker.unregister()
    camera_target_copier.unregister()

    weights_copy.unregister()
    split_actions.unregister()
    weights_mirror.unregister()    

    vertex_normals.unregister()
    vertex_groups_to_materials.unregister()
    shore_distance_baker.unregister()
    remove_unused_vgroups.unregister()
    boundings_draw.unregister()

    bpy.utils.unregister_class(B4WPreferences)

    bpy.utils.unregister_class(VersionValidator)

if __name__ == "__main__":
    register()
