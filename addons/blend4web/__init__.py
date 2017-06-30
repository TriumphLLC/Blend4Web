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


bl_info = {
    "name": "Blend4Web",
    "author": "Blend4Web Development Team",
    "version": (17, 6, 0),
    "blender": (2, 78, 0),
    "b4w_format_version": "6.02",
    "location": "File > Import-Export",
    "description": "Tool for interactive 3D visualization on the Internet",
    "warning": "",
    "wiki_url": "https://www.blend4web.com/doc",
    "tracker_url": "https://www.blend4web.com/en/forums/forum/17/",
    "category": "Blend4Web"
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
import bpy

sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)),
    "lib"))

b4w_modules = [
    "bgl_camera_limits",
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
    "viewport_settings",
    "vertex_groups_to_materials",
    "shore_distance_baker",
    "remove_unused_vgroups",
    "boundings_draw",
    "render_engine",
    "update_checker",
    "custom_nodeitems_builtins",
    "logic_node_tree",
    "server",
    "addon_prefs",
    "ui_scene",
]

try:
    import blend4web
except ImportError:
    _init_is_ok = False
else:
    _init_is_ok = True
    for m in b4w_modules:
        exec(load_module_script.format(m))

from bpy.types import AddonPreferences
from bpy.props import StringProperty, IntProperty, BoolProperty

NODE_TREE_BLEND = "b4w_nodes.blend"

# addon initialization messages
init_mess = []

class B4WInitErrorDialog(bpy.types.Operator):
    bl_idname = "b4w.init_error_dialog"
    bl_label = "Blend4Web initialization error."
    bl_options = {"INTERNAL"}
    msg = bpy.props.StringProperty()

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        wm = context.window_manager
        context.window.cursor_set("DEFAULT")
        return wm.invoke_props_dialog(self, 450)

    def draw(self, context):
        row = self.layout.row()
        if (self.msg == ""):
            self.msg = "Incorrect addon directory name."
        row.label(self.msg, icon="ERROR")
bpy.utils.register_class(B4WInitErrorDialog)

@bpy.app.handlers.persistent
def draw_init_error_message(arg):
    if draw_init_error_message in bpy.app.handlers.scene_update_pre:
        bpy.app.handlers.scene_update_pre.remove(draw_init_error_message)
    bpy.ops.b4w.init_error_dialog("INVOKE_DEFAULT")

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
def cam_reform(arg):
    for cam in bpy.data.cameras:
        # camera limits
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

        # dof settings
        if "b4w_dof_front" in cam:
            cam.b4w_dof_front_end = cam["b4w_dof_front"]
            cam.b4w_dof_front_start = 0

        if "b4w_dof_rear" in cam:
            cam.b4w_dof_rear_end = cam["b4w_dof_rear"]
            cam.b4w_dof_rear_start = 0

def index_by_var_name(collection, name):
    for i in range(len(collection)):
        if collection[i].name == name:
            return i
    return -1

@bpy.app.handlers.persistent
def update_animated_glsl_mat(arg):
    if(bpy.context.window_manager.b4w_viewport_settings.update_material_animation):
        for m in bpy.data.materials:
            m.diffuse_color[0] = m.diffuse_color[0]
        bpy.context.scene.update()

@bpy.app.handlers.persistent
def logic_nodetree_reform(arg):
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
                        # fix aftereffect of the bug
                        # https://www.blend4web.com/en/forums/topic/1398/
                        tmp = []
                        dur = 0
                        for d in node.durations:
                            if d.name == "dur":
                                tmp.append(d)
                        if len(tmp) > 0:
                            dur = node.durations["dur"].float
                            while "dur" in node.durations:
                                ind = index_by_var_name(node.durations, "dur")
                                if dur == 0:
                                    dur = node.durations[ind].float
                                node.durations.remove(ind)

                        if not "dur" in node.durations:
                            node.durations.add()
                            node.durations[-1].name = "dur"
                        node.durations["dur"].float = dur
                        #

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

                    if node.type == "SEND_REQ":
                        if not "prs" in node.bools:
                            node.bools.add()
                            node.bools[-1].name = "prs"
                            node.bools[-1].bool = True
                        if not "enc" in node.bools:
                            node.bools.add()
                            node.bools[-1].name = "enc"
                            node.bools[-1].bool = True
                        if not "dst" in node.variables_names:
                            node.variables_names.add()
                            node.variables_names[-1].name = "dst"
                        if not "dst1" in node.variables_names:
                            node.variables_names.add()
                            node.variables_names[-1].name = "dst1"
                        if not "ct" in node.bools:
                            node.bools.add()
                            node.bools[-1].name = "ct"
                        if not "ct" in node.strings:
                            node.strings.add()
                            node.strings[-1].name = "ct"

                    if node.type in ["SEND_REQ", "REDIRECT"]:
                        if not "url" in node.strings:
                            node.strings.add()
                            node.strings[-1].name = "url"
                            def_url = "https://www.blend4web.com" if "param_url" not in node else node["param_url"]
                            node.strings[-1].string = def_url
                        if not "url" in node.bools:
                            node.bools.add()
                            node.bools[-1].name = "url"
                        if not "url" in node.variables_names:
                            node.variables_names.add()
                            node.variables_names[-1].name = "url"        

                    if node.type == "PAGEPARAM":
                        if not "hsh" in node.bools:
                            node.bools.add()
                            node.bools[-1].name = "hsh"

                    if node.type == "REGSTORE":
                        if not "gl" in node.bools:
                            node.bools.add()
                            node.bools[-1].name = "gl"

                    # moving old properties to variables_names
                    if node.type in ["MATH", "CONDJUMP", "PAGEPARAM", "REGSTORE"]:
                        if not "v1" in node.variables_names:
                            node.variables_names.add()
                            node.variables_names[-1].name = "v1"
                            var = "R1" if "param_var1" not in node else node["param_var1"]
                            node.variables_names[-1].variable = var
                            if "param_var1" in node:
                                del node["param_var1"]
                        if not "v2" in node.variables_names:
                            node.variables_names.add()
                            node.variables_names[-1].name = "v2"
                            var = "R1" if "param_var2" not in node else node["param_var2"]
                            node.variables_names[-1].variable = var
                            if "param_var2" in node:
                                del node["param_var2"]
                        if not "vd" in node.variables_names:
                            node.variables_names.add()
                            node.variables_names[-1].name = "vd"
                            var = "R1" if "param_var_dest" not in node else node["param_var_dest"]
                            node.variables_names[-1].variable = var
                            if "param_var_dest" in node:
                                del node["param_var_dest"]
                    if node.type in ["MATH", "CONDJUMP", "REGSTORE"]:
                        if not "inp1" in node.floats:
                            node.floats.add()
                            node.floats[-1].name = "inp1"
                            node.floats[-1].float = 0 if "param_number1" not in node else node["param_number1"]
                            if "param_number1" in node:
                                del node["param_number1"]
                    if node.type in ["MATH", "CONDJUMP"]:
                        if not "inp2" in node.floats:
                            node.floats.add()
                            node.floats[-1].name = "inp2"
                            node.floats[-1].float = 0 if "param_number2" not in node else node["param_number2"]
                            if "param_number2" in node:
                                del node["param_number2"]
                    if node.type in ["REGSTORE"]:
                        if not "inp1" in node.strings:
                            node.strings.add()
                            node.strings[-1].name = "inp1"
                            node.strings[-1].string = "" if "param_string1" not in node else node["param_string1"]
                            if "param_string1" in node:
                                del node["param_string1"]

                    if node.type == "GET_TIMELINE":
                        if not "nla" in node.bools:
                            node.bools.add()
                            node.bools[-1].name = "nla"
                            node.bools[-1].bool = True

                    if node.type in ["PLAY_ANIM", "STOP_ANIM"]:
                        if not "env" in node.bools:
                            node.bools.add()
                            node.bools[-1].name = "env"

                    if node.type == "CONDJUMP":
                        if not "str" in node.bools:
                            node.bools.add()
                            node.bools[-1].name = "str"
                        if not "inp1" in node.strings:
                            node.strings.add()
                            node.strings[-1].name = "inp1"
                        if not "inp2" in node.strings:
                            node.strings.add()
                            node.strings[-1].name = "inp2"

                    if node.type in ["SHOW", "HIDE"]:
                        if not "ch" in node.bools:
                            node.bools.add()
                            node.bools[-1].name = "ch"

                    if node.type == "ENTRYPOINT":
                        if not "js" in node.bools:
                            node.bools.add()
                            node.bools[-1].name = "js"


def init_runtime_addon_data():
    p = bpy.context.user_preferences.addons[__package__].preferences
    p.b4w_src_path = init_validation.detect_sdk() or "";

def register():
    if not _init_is_ok:
        bpy.app.handlers.scene_update_pre.append(draw_init_error_message)
        return

    bpy.utils.register_module(__name__)
    # core
    properties.register()
    logic_node_tree.register()
    exporter.register()
    html_exporter.register()

    # TOOLS area
    vertex_normals.register()
    vertex_anim_baker.register()
    boundings_draw.register()
    viewport_settings.register()
    shore_distance_baker.register()
    anim_baker.register()

    # other operators
    update_checker.register()
    bgl_camera_limits.register()
    render_engine.register()
    custom_nodeitems_builtins.register()
    server.register()
    translator.register()
    interface.register()

    init_runtime_addon_data()

    bpy.app.handlers.load_post.append(add_node_tree)
    bpy.app.handlers.load_post.append(cam_reform)
    bpy.app.handlers.scene_update_pre.append(init_validation.check_addon_dir)
    bpy.app.handlers.load_post.append(logic_nodetree_reform)
    # tweak for viewport
    bpy.app.handlers.frame_change_post.append(update_animated_glsl_mat)

def unregister():
    if not _init_is_ok:
        bpy.app.handlers.scene_update_pre.append(draw_init_error_message)
        return

    bpy.utils.unregister_module(__name__)

    render_engine.unregister()
    custom_nodeitems_builtins.unregister()

    bgl_camera_limits.unregister()
    logic_node_tree.unregister()

    properties.unregister()
    exporter.unregister()
    html_exporter.unregister()

    vertex_normals.unregister()
    shore_distance_baker.unregister()
    boundings_draw.unregister()
    viewport_settings.unregister()
    server.B4WLocalServer.shutdown()
    update_checker.unregister()
    interface.unregister()
    translator.unregister()

if __name__ == "__main__":
    register()
