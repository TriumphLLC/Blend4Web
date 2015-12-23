# Copyright (C) 2014-2015 Triumph LLC
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


bl_info = {
    "name": "Blend4Web",
    "author": "Blend4Web Development Team",
    "version": (15, 12, 0),
    "blender": (2, 76, 0),
    "b4w_format_version": "5.07",
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

sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)),
    "lib"))

b4w_modules = [
    "bgl_draw",
    "translator",
    "init_validation",
    "properties",
    "interface",
    "exporter",
    "html_exporter",
    "anim_baker",
    "vertex_anim_baker",
    "camera_target_copier",
    "viewport_align",
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
    "addon_prefs",
    "ui_scene",
]
for m in b4w_modules:
    exec(load_module_script.format(m))
import bpy
from bpy.types import AddonPreferences
from bpy.props import StringProperty, IntProperty, BoolProperty

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

        if "b4w_use_distance_limits" in cam:
            cam.b4w_use_target_distance_limits = cam["b4w_use_distance_limits"]
            cam.b4w_use_zooming = cam["b4w_use_distance_limits"]
            del cam["b4w_use_distance_limits"]            

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

def nla_slots_to_nodetree_convert():
    for scene in bpy.data.scenes:
        if "b4w_nla_script" in scene:
            try:
                if len(scene["b4w_nla_script"]):
                    print("The scene '%s' use NLA slots, converting into tree..." % scene.name)
                    tree = bpy.data.node_groups.new("B4WLogicNodeTree", "B4WLogicNodeTreeType")
                    tree.import_slots(scene)
                    tree.use_fake_user = True
                    ui_scene.b4w_logic_editor_refresh_available_trees()
                    scene.b4w_active_logic_node_tree = tree.name
                    scene.b4w_use_logic_editor = True

                    del scene["b4w_nla_script"]
            except:
                tb = traceback.format_exc()
                print("CONVERSION OF NLA SLOTS FAILED: %s" % tb)

@bpy.app.handlers.persistent
def logic_nodetree_reform(arg):
    nla_slots_to_nodetree_convert()
    for tree in bpy.data.node_groups:
        if tree.bl_idname == "B4WLogicNodeTreeType":
            for node in tree.nodes:
                if node.bl_idname == "B4W_logic_node":
                    # registers
                    for item in [("param_register1", 7, "param_var1"),
                                      ("param_register2", 6, "param_var2"),
                                      ("param_register_dest", 7, "param_var_dest")]:
                        ind = item[1]
                        if item[0] in node:
                            node.update_var_def_callback(bpy.context)
                            ind = node[item[0]]
                            setattr(node, item[2], "R%s" % (8 - ind))
                            del node[item[0]]
                    for item in [("param_register_flag1", "param_var_flag1"),
                                 ("param_register_flag2", "param_var_flag2")]:
                        if item[0] in node:
                            setattr(node, item[1], node[item[0]])
                            del node[item[0]]

                    if "ob0" in node:
                        path = ""
                        if not "id0" in node.objects_paths:
                            node.objects_paths.add()
                            item = node.objects_paths[-1].name = "id0"
                        item = node.objects_paths["id0"]
                        item.node_name = node.name
                        item.tree_name = tree.name
                        for i in range (10):
                            if "ob%s"%i in node:
                                ob = node["ob%s"%i]
                                if ob == "":
                                    break;
                                delim = ">" if len(path) else ""
                                item.path_arr.add()
                                path += delim + ob
                                item.path_arr[-1].name = ob
                        for i in range (10):
                            if "ob%s"%i in node:
                                del node["ob%s"%i]
                        item.path = path

                    if node.type == "SELECT":
                        if not "not_wait" in node.bools:
                            node.bools.add()
                            node.bools[-1].name = "not_wait"

                    if node.type == "MOVE_CAMERA":
                        if not "dur" in node.bools:
                            node.bools.add()
                            node.bools[-1].name = "dur"
                        if not "dur" in node.floats:
                            node.durations.add()
                            node.durations[-1].name = "dur"
                        if not "dur" in node.variables_names:
                            node.variables_names.add()
                            node.variables_names[-1].name = "dur"

                    if node.type == "DELAY":
                        if "dl" in node.floats and not "dl" in node.durations:
                            node.durations.add()
                            node.durations[-1].name = "dl"
                            i = 0
                            for k in node.floats:
                                if k.name == "dl":
                                    break
                                i += 1
                            node.durations["dl"].float = node.floats["dl"].float
                            node.floats.remove(i)

                    if node.type in ["SPEAKER_PLAY", "PLAY"]:
                        if not "not_wait" in node.bools:
                            node.bools.add()
                            node.bools[-1].name = "not_wait"
                            if node.type == "SPEAKER_PLAY":
                                node.bools[-1].bool = True

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
    properties.register()
    logic_node_tree.register()
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

    viewport_align.register()

    vertex_groups_to_materials.register()

    server.register()

    mass_reexport.register()

    bgl_draw.register()

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
    bpy.app.handlers.load_post.append(logic_nodetree_reform)

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

    mass_reexport.unregister()
    bgl_draw.unregister()
    logic_node_tree.unregister()

    properties.unregister()
    interface.unregister()
    exporter.unregister()
    html_exporter.unregister()
    anim_baker.unregister()
    vertex_anim_baker.unregister()
    camera_target_copier.unregister()
    viewport_align.unregister()

    vertex_normals.unregister()
    vertex_groups_to_materials.unregister()
    shore_distance_baker.unregister()
    remove_unused_vgroups.unregister()
    boundings_draw.unregister()
    server.B4WLocalServer.shutdown()
    server.unregister()

    update_checker.unregister()
    addon_prefs.unregister()

    bpy.app.translations.unregister("B4WTranslator")

if __name__ == "__main__":
    register()
