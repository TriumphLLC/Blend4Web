bl_info = {
    "name": "Blend4Web",
    "author": "Blend4Web Development Team",
    "version": (15, 8, 0),
    "blender": (2, 75, 0),
    "b4w_format_version": "5.05",
    "location": "File > Import-Export",
    "description": "Tool for interactive 3D visualization on the Internet",
    "warning": "",
    "wiki_url": "https://www.blend4web.com/doc",
    "tracker_url": "https://www.blend4web.com/en/forums/forum/17/",
    "category": "Import-Export"
}

load_module_script =\
        "import importlib\n" \
        "if '{0}' in locals():\n" \
        "    #print('reload: %s' % '{0}')\n" \
        "    importlib.reload({0})\n" \
        "else:\n" \
        "    #print('import: %s' % '{0}')\n" \
        "    from . import {0}"

DOWNLOADS = "https://www.blend4web.com/en/downloads/"

import os
import sys
import copy
import traceback
import imp

sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)),
    "lib"))

b4w_modules = [
    "init_validation",
    "properties",
    "interface",
    "exporter",
    "html_exporter",
    "anim_baker",
    "vertex_anim_baker",
    "camera_target_copier",
    "vertex_normals",
    "vertex_groups_to_materials",
    "shore_distance_baker",
    "remove_unused_vgroups",
    "boundings_draw",
    "mass_reexport",
    "render_engine",
    "update_checker",
    "custom_nodeitems_builtins",
    "logic_node_tree",
    "server",
]

for m in b4w_modules:
    exec(load_module_script.format(m))

import bpy
from bpy.types import AddonPreferences
from bpy.props import StringProperty, IntProperty, BoolProperty
from . import translator
from . import addon_prefs

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

def need_append(b4w_node):
    if not b4w_node in bpy.data.node_groups:
        return True
    for node_tree in bpy.data.node_groups:
        if node_tree.name == b4w_node and not node_tree.library:
            return False
    return True

@bpy.app.handlers.persistent
def add_node_tree(arg):
    path_to_tree = os.path.join(os.path.dirname(__file__), NODE_TREE_BLEND)
    path_to_tree = exporter.guard_slashes(os.path.normpath(path_to_tree))
    if os.path.isfile(path_to_tree):
        with bpy.data.libraries.load(path_to_tree) as (data_from, data_to):
            for b4w_node in data_from.node_groups:
                if need_append(b4w_node):
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

@bpy.app.handlers.persistent
def nla_slots_to_nodetree_convert(arg):

        for scene in bpy.data.scenes:
            if "b4w_nla_script" in scene:
                try:
                    if len(scene["b4w_nla_script"]):
                        print("The scene '%s' use NLA slots, converting into tree..." % scene.name)
                        tree = bpy.data.node_groups.new("B4WLogicNodeTree", "B4WLogicNodeTreeType")
                        tree.import_slots(scene)
                        tree.use_fake_user = True
                        logic_node_tree.b4w_logic_editor_refresh_available_trees()
                        scene.b4w_active_logic_node_tree = tree.name
                        scene.b4w_use_logic_editor = True

                        del scene["b4w_nla_script"]
                except:
                    tb = traceback.format_exc()
                    print("CONVERSION OF NLA SLOTS FAILED: %s" % tb)

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

    bpy.app.translations.register("B4WTranslator", translator.get_translation_dict())
    # core
    logic_node_tree.register()
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

    addon_prefs.register()

    init_runtime_addon_data()

    bpy.app.handlers.scene_update_pre.append(init_validation.validate_version)
    update_checker.register()
    bpy.app.handlers.load_post.append(add_asset_file)
    bpy.app.handlers.load_post.append(add_node_tree)
    bpy.app.handlers.load_post.append(fix_cam_limits_storage)
    bpy.app.handlers.load_post.append(fix_obj_export_props)
    bpy.app.handlers.scene_update_pre.append(server.init_server)
    bpy.app.handlers.load_post.append(old_edited_normals_convert)
    bpy.app.handlers.load_post.append(nla_slots_to_nodetree_convert)

    bpy.app.handlers.load_post.append(mass_reexport.load_reexport_paths)

    do_not_register = False
    for arg in sys.argv:
        if arg.startswith("b4w_lang"):
            do_not_register = True

    if not do_not_register:
        render_engine.register()
        custom_nodeitems_builtins.register()

def unregister():

    do_not_unregister = False
    for arg in sys.argv:
        if arg.startswith("b4w_lang"):
            do_not_unregister = True

    if not do_not_unregister:
        render_engine.unregister()
        custom_nodeitems_builtins.unregister()

    bpy.app.translations.unregister("B4WTranslator")

    mass_reexport.unregister();
    logic_node_tree.unregister()

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
    server.B4WLocalServer.shutdown()
    server.unregister()

    update_checker.unregister()
    addon_prefs.unregister()

if __name__ == "__main__":
    register()
