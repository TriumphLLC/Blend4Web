bl_info = {
    "name": "Blend4Web",
    "author": "Blend4Web Development Team",
    "version": (15, 6, 0),
    "blender": (2, 75, 0),
    "b4w_format_version": "5.04",
    "location": "File > Import-Export",
    "description": "Tool for interactive 3D visualization on the Internet",
    "warning": "",
    "wiki_url": "https://www.blend4web.com/doc",
    "tracker_url": "https://www.blend4web.com/en/forums/forum/17/",
    "category": "Import-Export"
}

DOWNLOADS = "https://www.blend4web.com/en/downloads/"

import os
import sys
import copy
import traceback
import imp

sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)),
    "lib"))

import_module_script =  "if '{0}' in locals():\n" \
                        "    imp.reload({0})\n" \
                        "else:\n" \
                        "    from . import {0}"
b4w_modules = ["init_validation", "properties", "interface", "exporter", "html_exporter", "anim_baker",
               "vertex_anim_baker", "camera_target_copier", "vertex_normals", "vertex_groups_to_materials",
               "shore_distance_baker", "remove_unused_vgroups", "boundings_draw",
               "nla_script", "mass_reexport", "render_engine", "update_checker"]

for m in b4w_modules:
    exec(import_module_script.format(m))

import bpy
from bpy.types import AddonPreferences
from bpy.props import StringProperty, IntProperty, BoolProperty, PointerProperty

PATH_TO_ASSETS = "apps_dev/viewer"
ASSETS_NAME = "assets.json"
NODE_TREE_BLEND = "b4w_nodes.blend"

@bpy.app.handlers.persistent
def add_asset_file(arg):
    p = bpy.context.user_preferences.addons[__package__].preferences
    path_to_sdk = p.b4w_src_path
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
            elif "b4w_export_edited_normals" in obj.keys():
                obj["b4w_export_edited_normals"] = True
            elif obj.b4w_loc_export_vertex_anim:
                obj.b4w_loc_export_vertex_anim = True
            elif obj.b4w_shape_keys:
                obj.b4w_shape_keys = True

@bpy.app.handlers.persistent
def old_edited_normals_convert(arg):
    try:
        for ob in bpy.data.objects:
            if "b4w_export_edited_normals" in ob.keys():
                if "b4w_vertex_normal_list" in ob:
                    if len(ob["b4w_vertex_normal_list"]) != 0:
                        # this object use old normals
                        print("The object '%s' stores edited normals in old format, converting..." % ob.name)
                        if ob.data: # mesh can be None
                            nlist = []
                            for item in ob["b4w_vertex_normal_list"]:
                                nlist.append(item["normal"])
                            ob.data.normals_split_custom_set_from_vertices(
                                nlist)
                            ob.data.use_auto_smooth = True


            if "b4w_vertex_normal_list" in ob:
                del ob["b4w_vertex_normal_list"]
    except:
        tb = traceback.format_exc()
        print("CONVERSION OF EDITED NORMALS FAILED: %s" % tb)

def update_b4w_src_path(addon_pref, context):
    if addon_pref.b4w_src_path != "":
        corrected_path = os.path.normpath(bpy.path.abspath(
            addon_pref.b4w_src_path))
        if not (addon_pref.b4w_src_path == corrected_path):
            addon_pref.b4w_src_path = corrected_path

class B4WPreferences(AddonPreferences):
    # this must match the addon name, use '__package__'
    # when defining this in a submodule of a python package.
    bl_idname = __name__
    b4w_src_path = StringProperty(name="Blend4Web SDK Directory", \
            subtype='DIR_PATH', update=update_b4w_src_path)
    b4w_port_number = IntProperty(name="Server Port", default=6687, min=0,
            max=65535)
    b4w_server_auto_start = BoolProperty(name="Run development server "
            "automatically", default = True)
    b4w_autodetect_sdk_path = bpy.props.StringProperty()
    b4w_check_for_updates = BoolProperty(name="Check for updates",
                        default = False)
    b4w_available_for_update_version = bpy.props.StringProperty()

    b4w_reexport_paths = bpy.props.CollectionProperty(
        type=mass_reexport.B4WReexportPath)
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


def init_runtime_addon_data():
    p = bpy.context.user_preferences.addons[__package__].preferences
    if p.b4w_autodetect_sdk_path == "":
        sdk = init_validation.detect_sdk()
        if sdk:
            p.b4w_autodetect_sdk_path = sdk
        else:
            p.b4w_autodetect_sdk_path = ""
        if not (p.b4w_autodetect_sdk_path == "") and p.b4w_src_path == "":
                p.b4w_src_path = copy.copy(p.b4w_autodetect_sdk_path)

def register():

    nla_script.register()

    # core
    properties.register()
    interface.register()
    exporter.register()
    html_exporter.register()

    # TOOLS area
    vertex_normals.register()
    vertex_anim_baker.register()
    boundings_draw.register()
    remove_unused_vgroups.register()
    shore_distance_baker.register()
    anim_baker.register()

    # other operators
    camera_target_copier.register()

    vertex_groups_to_materials.register()

    server.register()

    mass_reexport.register()

    bpy.utils.register_class(B4WPreferences)
    init_runtime_addon_data()

    bpy.app.handlers.scene_update_pre.append(init_validation.validate_version)
    update_checker.register()
    bpy.app.handlers.load_post.append(add_asset_file)
    bpy.app.handlers.load_post.append(add_node_tree)
    bpy.app.handlers.load_post.append(fix_cam_limits_storage)
    bpy.app.handlers.load_post.append(fix_obj_export_props)
    bpy.app.handlers.scene_update_pre.append(server.check_server)
    bpy.app.handlers.load_post.append(old_edited_normals_convert)

    bpy.app.handlers.load_post.append(mass_reexport.load_reexport_paths)

    render_engine.register()

def unregister():
    render_engine.unregister()

    mass_reexport.unregister();
    nla_script.unregister()

    properties.unregister()
    interface.unregister()
    exporter.unregister()
    html_exporter.unregister()
    anim_baker.unregister()
    vertex_anim_baker.unregister()
    camera_target_copier.unregister()

    vertex_normals.unregister()
    vertex_groups_to_materials.unregister()
    shore_distance_baker.unregister()
    remove_unused_vgroups.unregister()
    boundings_draw.unregister()
    server.unregister()

    update_checker.unregister()
    bpy.utils.unregister_class(B4WPreferences)

if __name__ == "__main__":
    register()
