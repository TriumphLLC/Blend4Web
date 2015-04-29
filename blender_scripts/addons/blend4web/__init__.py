bl_info = {
    "name": "Blend4Web",
    "author": "Blend4Web Development Team",
    "version": (15, 4, 0),
    "blender": (2, 74, 0),
    "b4w_format_version": "5.03",
    "location": "File > Import-Export",
    "description": "Blend4Web is a Blender-friendly 3D web framework",
    "warning": "",
    "wiki_url": "http://www.blend4web.com/doc",
    "category": "Import-Export"
}

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), "lib"))

if "bpy" in locals():
    import imp
    imp.reload(init_validation)
    imp.reload(properties)
    imp.reload(interface)
    imp.reload(exporter)
    imp.reload(html_exporter)
    imp.reload(anim_baker)
    imp.reload(vertex_anim_baker)
    imp.reload(camera_target_copier)
    imp.reload(weights_copy)
    imp.reload(split_actions)
    imp.reload(weights_mirror)
    imp.reload(vertex_normals)
    imp.reload(vertex_groups_to_materials)
    imp.reload(shore_distance_baker)
    imp.reload(remove_unused_vgroups)
    imp.reload(boundings_draw)
    imp.reload(nla_script)
else:
    # B4W addon validation on start
    from . import init_validation

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

    # scripts written by the artist
    from . import split_actions
    from . import weights_mirror

    from . import vertex_normals
    from . import vertex_groups_to_materials
    from . import shore_distance_baker
    from . import remove_unused_vgroups
    from . import boundings_draw
    from . import nla_script
    from . import server

import bpy
from bpy.types import AddonPreferences
from bpy.props import StringProperty, IntProperty, BoolProperty
from . import render_engine

PATH_TO_ASSETS = "apps_dev/viewer"
ASSETS_NAME = "assets.json"
NODE_TREE_BLEND = "b4w_nodes.blend"

@bpy.app.handlers.persistent
def add_asset_file(arg):
    path_to_sdk = bpy.context.user_preferences.addons[__package__].preferences.b4w_src_path
    os.path.abspath(path_to_sdk)
    path_to_assets = os.path.join(path_to_sdk, PATH_TO_ASSETS, ASSETS_NAME)
    path_to_assets = exporter.guard_slashes(os.path.normpath(path_to_assets))
    if os.path.isfile(path_to_assets):
        for text in bpy.data.texts:
            if text.b4w_assets_load and text.name == ASSETS_NAME:
                if (text.filepath != path_to_assets or text.is_modified):
                    bpy.data.texts.remove(text)
                    break
                else:
                    return
        text = bpy.data.texts.load(path_to_assets)
        text.b4w_assets_load = True
    else:
        for text in bpy.data.texts:
            if text.b4w_assets_load:
                bpy.data.texts.remove(text)
                break

@bpy.app.handlers.persistent
def add_node_tree(arg):
    path_to_tree = os.path.join(os.path.dirname(__file__), NODE_TREE_BLEND)
    path_to_tree = exporter.guard_slashes(os.path.normpath(path_to_tree))
    if os.path.isfile(path_to_tree):
        with bpy.data.libraries.load(path_to_tree) as (data_from, data_to):
            for b4w_node in data_from.node_groups:
                if not b4w_node in bpy.data.node_groups:
                    data_to.node_groups.append(b4w_node)

@bpy.app.handlers.persistent
def fix_cam_limits_storage(arg):
    for cam in bpy.data.cameras:
        if "b4w_rotation_down_limit_storage" in cam:
            cam.b4w_rotation_down_limit = cam["b4w_rotation_down_limit_storage"]
            del cam["b4w_rotation_down_limit_storage"]

        if "b4w_rotation_up_limit_storage" in cam:
            cam.b4w_rotation_up_limit = cam["b4w_rotation_up_limit_storage"]
            del cam["b4w_rotation_up_limit_storage"]

# NOTE: for compatibility with old versions
@bpy.app.handlers.persistent
def fix_obj_export_props(arg):
    for obj in bpy.data.objects:
        if obj.type == "MESH":
            if obj.b4w_apply_scale:
                obj.b4w_apply_scale = True
            elif obj.b4w_apply_modifiers:
                obj.b4w_apply_modifiers = True
            elif obj.b4w_export_edited_normals:
                obj.b4w_export_edited_normals = True
            elif obj.b4w_loc_export_vertex_anim:
                obj.b4w_loc_export_vertex_anim = True
            elif obj.b4w_shape_keys:
                obj.b4w_shape_keys = True

def update_b4w_src_path(addon_pref, context):
    if addon_pref.b4w_src_path != "":
        corrected_path = os.path.normpath(bpy.path.abspath(addon_pref.b4w_src_path))
        if not (addon_pref.b4w_src_path == corrected_path):
            addon_pref.b4w_src_path = corrected_path

class B4WPreferences(AddonPreferences):
    # this must match the addon name, use '__package__'
    # when defining this in a submodule of a python package.
    bl_idname = __name__
    b4w_src_path = StringProperty(name="Path to Blend4Web SDK", \
            subtype='DIR_PATH', update=update_b4w_src_path)
    b4w_port_number = IntProperty(name="Server port", default=6687, min=0, 
            max=65535)
    b4w_register_render = BoolProperty(name="Register B4W Render",
                        default = False)

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "b4w_src_path", text="Path to Blend4Web SDK")
        layout.prop(self, "b4w_port_number", text="Server port")
        layout.prop(self, "b4w_register_render", text="Register Blend4Web render engine (Experimental)")

def register():
    nla_script.register()

    properties.register()
    interface.register()
    exporter.register()
    html_exporter.register()
    anim_baker.register()
    vertex_anim_baker.register()
    camera_target_copier.register()
    
    weights_copy.register()
    split_actions.register()
    weights_mirror.register()

    vertex_normals.register()
    vertex_groups_to_materials.register()
    shore_distance_baker.register()
    remove_unused_vgroups.register()
    boundings_draw.register()
    server.register()

    bpy.utils.register_class(B4WPreferences)

    bpy.app.handlers.scene_update_pre.append(init_validation.validate_version)
    bpy.app.handlers.load_post.append(add_asset_file)
    bpy.app.handlers.load_post.append(add_node_tree)
    bpy.app.handlers.load_post.append(fix_cam_limits_storage)
    bpy.app.handlers.load_post.append(fix_obj_export_props)

    render_engine.register()

def unregister():
    render_engine.unregister()

    nla_script.unregister()

    properties.unregister()
    interface.unregister()
    exporter.unregister()
    html_exporter.unregister()
    anim_baker.unregister()
    vertex_anim_baker.unregister()
    camera_target_copier.unregister()

    weights_copy.unregister()
    split_actions.unregister()
    weights_mirror.unregister()    

    vertex_normals.unregister()
    vertex_groups_to_materials.unregister()
    shore_distance_baker.unregister()
    remove_unused_vgroups.unregister()
    boundings_draw.unregister()
    server.unregister()

    bpy.utils.unregister_class(B4WPreferences)

if __name__ == "__main__":
    register()
