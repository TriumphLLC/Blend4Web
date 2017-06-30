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


import copy
import bpy
from bpy.types import NodeTree, Node, NodeSocket
from bpy.props import StringProperty
import nodeitems_utils
from nodeitems_utils import NodeCategory, NodeItem
import mathutils
from bpy.types import UIList

import blend4web
b4w_modules = ["translator", "properties"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))
from blend4web.translator import _, p_
# WARN: The following lines is for translator.py
_("Child Node:"), _("Dupli Child:")

# result
node_props = ['param_marker_start', 'param_marker_end',
              'param_var_define', 'param_var_flag1', 'param_var_flag2',
              'param_operation', 'param_condition',
              'param_name', 'param_anim_name', 'param_variable_type',
              'param_string_operation', 'param_json_operation']

reg_items = [
        ("R8", "R8", "Register 8"),
        ("R7", "R7", "Register 7"),
        ("R6", "R6", "Register 6"),
        ("R5", "R5", "Register 5"),
        ("R4", "R4", "Register 4"),
        ("R3", "R3", "Register 3"),
        ("R2", "R2", "Register 2"),
        ("R1", "R1", "Register 1")
    ]

outline_items = [
        ("PLAY", _("PLAY"), _("Play Animation")),
        ("STOP", _("STOP"), _("Stop Animation")),
        ("INTENSITY", _("INTENSITY"), _("Intensity")),
    ]

send_request_type_items = [
        ("GET", _("GET"), _("GET Request")),
        ("POST", _("POST"), _("POST Request")),
    ]

variable_type_items = [
        ("NUMBER", _("Number"), _("Numeric variable")),
        ("STRING", _("String"), _("String variable"))
    ]

space_type_items = [
        ("WORLD", _("World"), _("World space")),
        ("PARENT", _("Parent"), _("Parent space")),
        ("LOCAL", _("Local"), _("Local space"))
    ]

cam_lim_space_type_items = [
        ("WORLD", _("World"), _("World space")),
        ("CAMERA", _("Camera"), _("Camera space"))
    ]

slot_type_enum = [
        ("NOOP", _("Noop"), _("No operation"), 0),
        ("PAGEPARAM", _("Page Param"), _("Store numeric page parameter to a " +
                "register"), 12),
        ("HIDE", _("Hide Object"), _("Hide Object"), 11),
        ("SHOW", _("Show Object"), _("Show Object"), 10),
        ("REDIRECT", _("Page Redirect"), _("Redirect current page to given URL"), 9),
        ("MATH", _("Math Operation"), _("Perform a math operation"), 1),
        ("REGSTORE", _("Variable Store"), _("Store a value to a variable"), 2),
        ("CONDJUMP", _("Conditional Jump"), _("Conditional jump"), 3),
        ("JUMP", _("Jump"), _("Jump to the slot by label"), 4),
        ("SELECT_PLAY", _("Select & Play Timeline (Deprecated)"), _("Select an object then play timeline"), 5),
        ("SELECT", _("Select (Deprecated)"), _("Select an object"), 6),
        ("PLAY", _("Play Timeline"), _("Play NLA animation"), 7),
        ("ENTRYPOINT", _("Entry Point"), _("Entry Point"), 8),
        ("PLAY_ANIM", _("Play Animation"), _("Play Object Animation"), 13),
        ("SEND_REQ", _("Send Request"), _("Send Request"), 14),
        ("INHERIT_MAT", _("Inherit Material"), _("Inherit Material"), 15),
        ("SET_SHADER_NODE_PARAM", _("Set Shader Node Param"), _("Set Shader Node Param"), 16),
        ("DELAY", _("Delay"), _("Set Delay Before Next Node Processing"), 17),
        ("APPLY_SHAPE_KEY", _("Apply Shape Key"), _("Set the value of the shape key"), 18),
        ("OUTLINE", _("Outline"), _("Play or stop outline animation"), 19),
        ("SELECT_PLAY_ANIM", _("Select & Play Animation (Deprecated)"), _("Select an object then play Object Animation"), 20),
        ("MOVE_CAMERA", _("Move Camera"), _("Set camera Translation and pivot"), 21),
        ("SET_CAMERA_MOVE_STYLE", _("Set Camera Move Style"), _("Set camera move style"), 22),
        ("SET_CAMERA_LIMITS", _("Set Camera Limits"), _("Set camera limits"), 36),
        ("SPEAKER_PLAY", _("Play Sound"), _("Play Sound"), 23),
        ("SWITCH_SELECT", _("Switch Select"), _("Switch select"), 24),
        ("STOP_ANIM", _("Stop Animation"), _("Stop Object Animation"), 25),
        ("SPEAKER_STOP", _("Stop Sound"), _("Stop Sound"), 26),
        ("STOP_TIMELINE", _("Stop Timeline"), _("Stop Timeline"), 27),
        ("MOVE_TO", _("Move To"), _("Move to"), 28),
        ("CONSOLE_PRINT", _("Console Print"), _("Console Print"), 29),
        ("TRANSFORM_OBJECT", _("Transform Object"), _("Transform Object"), 30),
        ("STRING", _("String Operation"), _("Perform a string operation"), 31),
        ("GET_TIMELINE", _("Get Timeline"), _("Get timeline current frame"), 32),
        ("JSON", _("JSON"), _("Perform a JSON operation"), 33),
        ("JS_CALLBACK", _("JS Callback"), _("Perform custom JavaScipt callback"), 34),
        ("EMPTY", _("Empty"), _("Empty node for rerouting"), 35)
    ]

operation_type_enum = [
            ("DIV", _("Divide"), _("Divide")),
            ("SUB", _("Subtract"), _("Subtract")),
            ("MUL", _("Multiply"), _("Multiply")),
            ("ADD", _("Add"), _("Add")),
            ("RAND", _("Random"), _("Random")),
            ("SIN", _("Sin"), _("Sin")),
            ("COS", _("Cos"), _("Cos")),
            ("TAN", _("Tan"), _("Tan")),
            ("ARCSIN", _("ArcSin"), _("ArcSin")),
            ("ARCCOS", _("ArcCos"), _("ArcCos")),
            ("ARCTAN", _("ArcTan"), _("ArcTan")),
            ("LOG", _("Log"), _("Log")),
            ("MIN", _("Min"), _("Min")),
            ("MAX", _("Max"), _("Max")),
            ("ROUND", _("Round"), _("Round")),
            ("MOD", _("Mod"), _("Mod")),
            ("ABS", _("Abs"), _("Abs"))
        ]

string_operation_type_enum = [
            ("JOIN", _("Join"), _("Join")),
            ("FIND", _("Find"), _("Find")),
            ("REPLACE", _("Replace"), _("Replace")),
            ("SPLIT", _("Split"), _("Split")),
            ("COMPARE", _("Compare"), _("Compare"))
        ]

json_operation_type_enum = [
        ("PARSE", _("PARSE"), _("Parse json")),
        ("ENCODE", _("ENCODE"), _("Encode json")),
]

condition_type_enum = [
            ("GEQUAL", _("Greater Than or Equal (>=)"), _("Greater than or equal")),
            ("LEQUAL", _("Less Than or Equal (<=)"), _("Less than or equal")),
            ("GREATER", _("Greater Than (>)"), _("Greater than")),
            ("LESS", _("Less Than (<)"), _("Less than")),
            ("NOTEQUAL", _("Not Equal (!=)"), _("Not equal")),
            ("EQUAL", _("Equal (=)"), _("Equal"))
        ]

js_cb_param_type_enum = [
    ("OBJECT", _("Object"), _("Object parameter")),
    ("VARIABLE", _("Variable"), _("Variable parameter")),
]

order_socket_color = (1.0, 1.0, 0.216, 0.5)
dummy_socket_color = (0.0, 0.0, 0.0, 0.0)

no_var_source_msg = _("No var source")

def tree_vars_update(tree, pure_locals = False):
    # set pure_locals to true during export
    # to keep local scope clean from global variables

    if not "subtrees" in tree:
        return

    # Fill global variables
    tree.variables.clear()
    for node in tree.nodes:
        if node.type in ["REGSTORE"]:
            # need checking if "gl" in bools because
            # logic_nodetree_reform may be not called yet
            if "gl" in node.bools and node.bools["gl"].bool:
                if not node.param_var_define in tree.variables:
                    tree.variables.add()
                    tree.variables[-1].name = node.param_var_define
    # Fill local variables
    for st in tree["subtrees"].keys():
        if st in tree.nodes:
            ep = tree.nodes[st]
            ep.variables.clear()
            for i in range(1,9):
                ep.variables.add()
                ep.variables[-1].name = "R%s" % i
            if not pure_locals:
                for gl in tree.variables:
                    if not gl.name in ep.variables:
                        ep.variables.add()
                        ep.variables[-1].name = gl.name
            for nname in tree["subtrees"][st]:
                if nname not in tree.nodes:
                    continue
                node = tree.nodes[nname]
                if node.type in ["REGSTORE"]:
                    if node.param_var_define != "" and node.param_var_flag1:
                        #NOTE: second condition for backwards compatibility
                        if ("gl" in node.bools and not node.bools["gl"].bool) or (not "gl" in node.bools):
                            if not node.param_var_define in ep.variables:
                                ep.variables.add()
                                ep.variables[-1].name = node.param_var_define
                if node.type in ["JSON"]:
                    for s in node.parse_json_list:
                        if not s.name in ep.variables:
                            ep.variables.add()
                            ep.variables[-1].name = s.name

def json_find_node_and_tree(gr):
    def node_have_target_prop(propgr, node):
        if node.type == "JSON":
            for gr in node.parse_json_list:
                if gr == propgr:
                    return True
        return False
    # fast way
    found_tree = None
    for tree in bpy.data.node_groups:
        if tree.bl_idname == "B4WLogicNodeTreeType":
            if tree.name == gr.tree_name:
                if gr.node_name in tree.nodes:
                    if node_have_target_prop(gr, tree.nodes[gr.node_name]):
                        found_tree = tree
                        break
    # brute force if tree is not found by name
    node = None
    if not found_tree:
        for tree in bpy.data.node_groups:
            if tree.bl_idname == "B4WLogicNodeTreeType":
                for node in tree.nodes:
                    if node.bl_idname == "B4W_logic_node":
                        if node_have_target_prop(gr, node):
                            gr.tree_name = tree.name
                            found_tree = tree
                            break
    return node, found_tree


def update_parse_json_list_item(self, context):
    node, tree = json_find_node_and_tree(self)
    if tree:
        tree_vars_update(tree)

def update_encode_json_list_item(self, context):
    node, tree = json_find_node_and_tree(self)
    if node:
        check_node(node)


class B4W_ParseRespUIList(UIList):
    def draw_item(self, context, layout, data, item, icon, active_data, active_propname, index):
        layout.prop(item, "name", text="", emboss=False, icon_value=icon)

class B4W_ParseRespPathUIList(UIList):
    def draw_item(self, context, layout, data, item, icon, active_data, active_propname, index):
        layout.prop(item, "path", text="", emboss=False, icon_value=icon)

class B4W_StringWrap(bpy.types.PropertyGroup):
    name = bpy.props.StringProperty(name = "name")

def check_node(node):
    err_msgs = node.error_messages.prop_err
    err_msgs.clear()
    if node.type in ["SELECT", "SELECT_PLAY", "SELECT_PLAY_ANIM", "SHOW", "HIDE",
                     "PLAY_ANIM", "APPLY_SHAPE_KEY", "OUTLINE", "STOP_ANIM"]:
        obj_ids = ["id0"]
        if node.type == "SELECT_PLAY_ANIM":
            obj_ids.append("id1")
        for id in obj_ids:
            if id in node.objects_paths:
                item = node.objects_paths[id]
                ob = object_by_bpy_collect_path(bpy.data.objects, item.path_arr)
                wd = object_by_bpy_collect_path(bpy.data.worlds, item.path_arr)
                if not ob and not wd:
                    node.add_error_message(err_msgs, _("Bad object field!"))
            else:
                # case when objects_paths is not filled yet (type_init not invoked yet)
                node.add_error_message(err_msgs, _("Bad object field!"))

    if node.type == "PAGEPARAM":
        if node.param_name == "":
            node.add_error_message(err_msgs, _("Page param field is empty!"))

    if node.type == "REDIRECT":
        if "url" in node.bools:
            if node.bools["url"].bool:
                if node.variables_names["url"].variable == "":
                    node.add_error_message(err_msgs, _("URL field is empty!"))
            else:
                if node.strings["url"].string == "":
                    node.add_error_message(err_msgs, _("URL field is empty!"))

    if node.type == "REGSTORE":
        if node.param_var_flag1: # define var
            if node.param_var_define == "":
                node.add_error_message(err_msgs, _("New var. field is empty!"))
        else:
            if "vd" in node.variables_names:
                if node.variables_names["vd"].variable == "":
                    node.add_error_message(err_msgs, _("Destination field is empty!"))

    if node.type in ["CONDJUMP", "MATH"]:
        if node.param_var_flag1:
            if node.variables_names["v1"].variable == "":
                node.add_error_message(err_msgs, _("Operand 1 field is empty!"))
        if node.param_var_flag2:
            if node.variables_names["v2"].variable == "":
                node.add_error_message(err_msgs, _("Operand 2 field is empty!"))

    if node.type in ["MATH"]:
        if node.param_var_flag1:
            if "vd" in node.variables_names:
                if node.variables_names["vd"].variable == "":
                    node.add_error_message(err_msgs, _("Destination field is empty!"))

    if node.type == "INHERIT_MAT":
        all_bad = False
        for i in range(2):
            name = "id%s"%i
            if not name in node.objects_paths:
                all_bad = True
                break
            item = node.objects_paths[name]
            ob = object_by_bpy_collect_path(bpy.data.objects, item.path_arr)
            if not ob:
                all_bad = True
            else:
                if not ob.b4w_dynamic_geometry:
                    node.add_error_message(err_msgs, _("Object \"" + ob.name + "\" must have " 
                            + "\"Dynamic Geometry & Materials\" flag enabled!"))
                if not str(node.materials_names[name].str) in ob.material_slots:
                    node.add_error_message(err_msgs, _("Material field is not correct!"))
        if all_bad:
            node.add_error_message(err_msgs, _("Object field is not correct!"))
            node.add_error_message(err_msgs, _("Material field is not correct!"))

    if node.type == "SET_SHADER_NODE_PARAM":
        all_bad = False
        name = "id0"
        all_bad = False
        if name in node.objects_paths:

            item = node.objects_paths[name]
            ob = object_by_bpy_collect_path(bpy.data.objects, item.path_arr)
            if not ob:
                all_bad = True
            else:
                if not node.materials_names[name].str in ob.material_slots:
                    node.add_error_message(err_msgs, _("Material field is not correct!"))
                else:
                    material = ob.material_slots[node.materials_names[name].str].material
                    if not hasattr(material, "node_tree"):
                        node.add_error_message(err_msgs, _("Please select node material!"))
                    else:
                        nd = node_by_bpy_collect_path(material.node_tree, node.nodes_paths[name].path_arr)
                        if not nd:
                            node.add_error_message(err_msgs, _("Node field is not correct!"))
                        else:
                            if not nd.bl_idname in ["ShaderNodeValue", "ShaderNodeRGB"]:
                                node.add_error_message(err_msgs, _("Selected node is not supported!"))

        else:
            all_bad = True

        if all_bad:
            node.add_error_message(err_msgs, _("Object field is not correct!"))
            node.add_error_message(err_msgs, _("Material field is not correct!"))
            node.add_error_message(err_msgs, _("Node field is not correct!"))

    if node.type == "APPLY_SHAPE_KEY":
        if "id0" in node.objects_paths:
            sk_ok = False
            ob = object_by_bpy_collect_path(bpy.data.objects, node.objects_paths["id0"].path_arr)
            if node.check_shapekey_store(ob):
                if node.common_usage_names["sk"].str in ob.data.shape_keys.key_blocks:
                    sk_ok = True
            if not sk_ok:
                node.add_error_message(err_msgs, "Shape key is not correct!")

    if node.type == "MOVE_CAMERA":
        if "id0" in node.objects_paths:
            ob = object_by_bpy_collect_path(bpy.data.objects, node.objects_paths["id0"].path_arr)
            camera_ok = False
            if ob:
                if ob.type == "CAMERA":
                    camera_ok = True
            if not camera_ok:
                node.add_error_message(err_msgs, "Camera field is not correct!")

            ob = object_by_bpy_collect_path(bpy.data.objects, node.objects_paths["id1"].path_arr)
            if not ob:
                node.add_error_message(err_msgs, "Destination field is not correct!")

            ob = object_by_bpy_collect_path(bpy.data.objects, node.objects_paths["id2"].path_arr)
            if not ob:
                node.add_error_message(err_msgs, "Look at field is not correct!")

    if node.type == "MOVE_TO":
        if "id0" in node.objects_paths:
            ob = object_by_bpy_collect_path(bpy.data.objects, node.objects_paths["id0"].path_arr)
            if not ob:
                node.add_error_message(err_msgs, "Object field is not correct!")

            ob = object_by_bpy_collect_path(bpy.data.objects, node.objects_paths["id1"].path_arr)
            if not ob:
                node.add_error_message(err_msgs, "Destination field is not correct!")

    if node.type == "TRANSFORM_OBJECT":
        if "id0" in node.objects_paths:
            ob = object_by_bpy_collect_path(bpy.data.objects, node.objects_paths["id0"].path_arr)
            if not ob:
                node.add_error_message(err_msgs, "Object field is not correct!")


    if node.type in ["SPEAKER_PLAY", "SPEAKER_STOP"]:
        id = "id0"
        if id in node.objects_paths:
            item = node.objects_paths[id]
            ob = object_by_bpy_collect_path(bpy.data.objects, item.path_arr)
            err = False
            if not ob:
                err = True
            elif not ob.type == "SPEAKER":
                err = True
            if err:
                node.add_error_message(err_msgs, _("Bad speaker field!"))
        else:
             node.add_error_message(err_msgs, _("Bad speaker field!"))

    if node.type in ["SWITCH_SELECT"]:
        for p1 in node.objects_paths:
            for p2 in node.objects_paths:
                if (not p1 == p2) and (p1.path == p2.path) and p1.path != "":
                    node.add_error_message(err_msgs, _("%s occurs more than one time") % p1.path)

                id = p1.name
                item = node.objects_paths[id]
                ob = object_by_bpy_collect_path(bpy.data.objects, item.path_arr)
                if not ob:
                    node.add_error_message(err_msgs, _("Bad object field: '%s'") % p1.path)

    if node.type in ["CONSOLE_PRINT"]:
        mess_err = True
        if "msg" in node.common_usage_names:
            if not node.common_usage_names["msg"].str == "":
                mess_err = False

        var_err = False
        for v in node.variables_names:
            if v.variable == "":
                var_err = True
                break

        if mess_err:
            node.add_error_message(err_msgs, _("Bad Message field!"))
        if var_err:
            node.add_error_message(err_msgs, _("Bad variable field!"))

    if node.type in ["GET_TIMELINE"]:
        if "vd" in node.variables_names:
            if node.variables_names["vd"].variable == "":
                    node.add_error_message(err_msgs, _("Destination field is empty!"))

    if node.type in ["NOOP"]:
        node.add_error_message(err_msgs, _("Node is not supported."))
        node.add_error_message(err_msgs, _("It could be outdated or created"))
        node.add_error_message(err_msgs, _("in a newer version of Blend4Web"))

    if node.type == "SET_CAMERA_MOVE_STYLE":
        if "id0" in node.objects_paths:
            ob = object_by_bpy_collect_path(bpy.data.objects, node.objects_paths["id0"].path_arr)
            if not ob or ob.type != "CAMERA":
                node.add_error_message(err_msgs, "Please select a valid camera object!")

            if node.param_camera_move_style in ["TARGET", "HOVER"] and node.bools["pvo"].bool:
                ob = object_by_bpy_collect_path(bpy.data.objects, node.objects_paths["id1"].path_arr)
                if not ob:
                    node.add_error_message(err_msgs, "Target field is not correct!")

    if node.type == "SET_CAMERA_LIMITS":
        if "id0" in node.objects_paths:
            ob = object_by_bpy_collect_path(bpy.data.objects, node.objects_paths["id0"].path_arr)
            if not ob or ob.type != "CAMERA":
                node.add_error_message(err_msgs, "Please select a valid camera object!")

    if len(err_msgs) > 0:
        return False
    else:
        return True

def find_node(node_name, tree_name, find_item, type, node_types =
["INHERIT_MAT", "SET_SHADER_NODE_PARAM", "HIDE", "SHOW", "SELECT_PLAY", "PLAY_ANIM", "SELECT_PLAY_ANIM",
 "MOVE_CAMERA", "MOVE_TO", "TRANSFORM_OBJECT", "SPEAKER_PLAY","SPEAKER_STOP", "SWITCH_SELECT", "STOP_ANIM"
 "SET_CAMERA_MOVE_STYLE", "SET_CAMERA_LIMITS"]):
    node_found = None
    ng = bpy.data.node_groups
    if tree_name in bpy.data.node_groups:
        if node_name in ng[tree_name].nodes:
            node = ng[tree_name].nodes[node_name]
            for item in node.objects_paths:
                if find_item == item:
                    return node
    if not node_found:
        for tree in bpy.data.node_groups:
            if tree.bl_idname == "B4WLogicNodeTreeType":
                for node in tree.nodes:
                    if node.bl_idname == "B4W_logic_node":
                        if node.type in node_types:
                            if type == "mt":
                                storage = "materials_names"
                            if type == "ob":
                                storage = "objects_paths"
                            if type == "nd":
                                storage = "nodes_paths"
                            if type == "vr":
                                storage = "variables_names"
                            if type in ["sk", "msg"]:
                                storage = "common_usage_names"
                            for item in getattr(node, storage):
                                if find_item == item:
                                    find_item.tree_name = tree.name
                                    find_item.node_name = node.name
                                    return node
    return None

def update_named_material_str(self, context):
    node_found = find_node(self.node_name, self.tree_name, self, "mt")
    if node_found:
        check_node(node_found)
    else:
        print("can't find a node: %s:%s" %(self.tree_name, self.node_name))

def update_object_path(self, context):
    arr = self.path.split(">")
    ob = object_by_path(bpy.data.objects, arr)
    wd = object_by_path(bpy.data.worlds, arr)
    self.path_arr.clear()
    if ob or wd:
        for s in arr:
            self.path_arr.add()
            self.path_arr[-1].name = s
    node_found = find_node(self.node_name, self.tree_name, self, "ob")
    if node_found:
        if node_found.type == "SWITCH_SELECT":
            for s in node_found.outputs:
                if s.type == "DynOutputJump":
                    s.label_text = node_found.objects_paths[s.name].path
        check_node(node_found)
    else:
        print(_("can't find a node") + ": %s:%s" %(self.tree_name, self.node_name))

def update_common_usage_names(self, context):
    node_found = find_node(self.node_name, self.tree_name, self, self.name, ["APPLY_SHAPE_KEY", "CONSOLE_PRINT"])
    if node_found:
        check_node(node_found)
    else:
        print(_("can't find a node") + ": %s:%s" %(self.tree_name, self.node_name))

def update_node_path(self, context):
    node_found = find_node(self.node_name, self.tree_name, self, "nd", ["SET_SHADER_NODE_PARAM"])
    if not node_found:
        print(_("can't find a node") + ": %s:%s" %(self.tree_name, self.node_name))
        return
    arr = self.path.split(">")
    self.path_arr.clear()
    for s in arr:
        self.path_arr.add()
        self.path_arr[-1].name = s

    if node_found:
        check_node(node_found)

class B4W_LogicNodeNamedMaterialNameWrap(bpy.types.PropertyGroup):
    tree_name = bpy.props.StringProperty(name="tree_name")
    node_name = bpy.props.StringProperty(name="node_name")
    str = bpy.props.StringProperty(name="str", update = update_named_material_str)

class B4W_LogicNodeFloatWrap(bpy.types.PropertyGroup):
    float = bpy.props.FloatProperty(name="float")

class B4W_LogicNodeDurationWrap(bpy.types.PropertyGroup):
    float = bpy.props.FloatProperty(name="float", subtype = "TIME", unit="TIME", min = 0)

class B4W_LogicNodeAngleWrap(bpy.types.PropertyGroup):
    float = bpy.props.FloatProperty(name="float", subtype = "ANGLE", unit="ROTATION", step=10, precision=1)

class B4W_LogicNodeVelocityWrap(bpy.types.PropertyGroup):
    float = bpy.props.FloatProperty(name="float", min = 0)

def update_bool(self, context):
    #update vars if var scope was changed
    if self.name == "gl":
        for nodetree in bpy.data.node_groups:
            force_update_variables(nodetree)

class B4W_LogicNodeBoolWrap(bpy.types.PropertyGroup):
    bool = bpy.props.BoolProperty(name="bool", update = update_bool)

class B4W_LogicNodeStringWrap(bpy.types.PropertyGroup):
    string = bpy.props.StringProperty(name="string")

def update_variable(self, context):
    node = find_node(self.node_name,self.tree_name, self, "vr", ["SET_SHADER_NODE_PARAM", "CONSOLE_PRINT"])
    if node:
        check_node(node)

class B4W_LogicNodeVariableWrap(bpy.types.PropertyGroup):
    tree_name = bpy.props.StringProperty(name="tree_name")
    node_name = bpy.props.StringProperty(name="node_name")
    variable = bpy.props.StringProperty(
        name = "variable",
        description = "Variable name",
        default = "R1",
        update = update_variable
    )

class B4W_CommonUsageNames(bpy.types.PropertyGroup):
    tree_name = bpy.props.StringProperty(name="tree_name")
    node_name = bpy.props.StringProperty(name="node_name")
    str = bpy.props.StringProperty(name="str", update=update_common_usage_names)

class B4W_ObjectPathWrap(bpy.types.PropertyGroup):
    tree_name = bpy.props.StringProperty(name="tree_name")
    node_name = bpy.props.StringProperty(name="node_name")
    cur_dir = bpy.props.StringProperty(name="curdir")
    path_arr = bpy.props.CollectionProperty(name="path_array", type=B4W_StringWrap)
    path = bpy.props.StringProperty(name="path", update=update_object_path)

class B4W_NodePathWrap(bpy.types.PropertyGroup):
    tree_name = bpy.props.StringProperty(name="tree_name")
    node_name = bpy.props.StringProperty(name="node_name")
    cur_dir = bpy.props.StringProperty(name="curdir")
    path_arr = bpy.props.CollectionProperty(name="path_array", type=B4W_StringWrap)
    path = bpy.props.StringProperty(name="path", update=update_node_path)

class B4W_LogicEditorErrTextWrap(bpy.types.PropertyGroup):
    message = bpy.props.StringProperty(name="name")

class B4W_ParseJsonStringWrap(bpy.types.PropertyGroup):
    name = bpy.props.StringProperty(name = "name", update = update_parse_json_list_item)
    path = bpy.props.StringProperty(name = "path")
    tree_name = bpy.props.StringProperty(name = "tree_name")
    node_name = bpy.props.StringProperty(name = "node_name")

class B4W_EncodeJsonStringWrap(bpy.types.PropertyGroup):
    name = bpy.props.StringProperty(name = "name", update = update_encode_json_list_item)
    path = bpy.props.StringProperty(name = "path")
    tree_name = bpy.props.StringProperty(name = "tree_name")
    node_name = bpy.props.StringProperty(name = "node_name")

class B4W_JSCbParamWrap(bpy.types.PropertyGroup):
    type = bpy.props.EnumProperty(name="type", items=js_cb_param_type_enum, default="OBJECT")

class B4W_LogicEditorErrors(bpy.types.PropertyGroup):
    prop_err = bpy.props.CollectionProperty(name="prop_err", type= B4W_LogicEditorErrTextWrap)
    link_err = bpy.props.CollectionProperty(name="link_err", type= B4W_LogicEditorErrTextWrap)

def object_by_path(objects, path):
    if len(path) == 0:
        return None
    if not path[0] in objects:
        return None
    ob = objects[path[0]]
    for i in range(1,len(path)):
        if not ob.dupli_group:
            return None
        if not path[i] in ob.dupli_group.objects:
            return None
        ob = ob.dupli_group.objects[path[i]]
    return ob

def object_by_bpy_collect_path(objects, path):
    if len(path) == 0:
        return None
    if not path[0].name in objects:
        return None
    ob = objects[path[0].name]
    for i in range(1,len(path)):
        if not ob.dupli_group:
            return None
        if not path[i].name in ob.dupli_group.objects:
            return None
        ob = ob.dupli_group.objects[path[i].name]
    return ob

def node_by_bpy_collect_path(ntree, path):
    if not ntree:
        return None
    if len(path) == 0:
        return None
    if not path[0].name in ntree.nodes:
        return None
    nd = ntree.nodes[path[0].name]
    for i in range(1,len(path)):
        if not hasattr(nd, "node_tree"):
            return None
        if not nd.node_tree:
            return None
        if not path[i].name in nd.node_tree.nodes:
            return None
        nd = nd.node_tree.nodes[path[i].name]
    return nd

def node_by_ob_mt_nd( ob_item, mt_item, nd_item):
    ob = object_by_bpy_collect_path(bpy.data.objects, ob_item.path_arr)
    nd = None
    if ob:
        if mt_item.str in ob.material_slots:

            mat = ob.material_slots[mt_item.str].material
            if hasattr(mat, "node_tree"):
                nd = node_by_bpy_collect_path(mat.node_tree, nd_item.path_arr)
    return nd

class B4W_LogicNodeTree(NodeTree):
    bl_idname = 'B4WLogicNodeTreeType'
    bl_label = _('Blend4Web logic')
    bl_description = _('Blend4Web logic nodes')
    bl_icon = 'NODETREE'

    # contains global variables
    variables = bpy.props.CollectionProperty(
        name = _("B4W: Global Variables"),
        description = _("Global Variables"),
        type = B4W_StringWrap,
    )

    @classmethod
    def poll(self, context):
        return context.scene.render.engine == 'BLEND4WEB'

    def update_connectivity(self):
        entrypoints = check_entry_point(self)
        if entrypoints:
            clear_links_err(self)
            check_connectivity(self, entrypoints)
        tree_vars_update(self)

    def update(self):
        self.update_connectivity()
        # limit reroute links to reduce trees overlapping
        for n in self.nodes:
            if n.bl_idname == "NodeReroute":
                n.outputs[0].link_limit = 1
                n.inputs[0].link_limit = 1

    def collect_errors(self):
        if not "errors" in self:
            self["errors"] = []
        errors = self["errors"]
        if hasattr(errors,"to_list"):
            errors = errors.to_list()
        for n in self.nodes:
            if n.bl_idname == "B4W_logic_node":
                for err in n.error_messages.prop_err:
                    errors.append((n.name, err.message))
                for err in n.error_messages.link_err:
                    errors.append((n.name, err.message))
        self["errors"] = errors

    def clear_errors(self):
        if "errors" in self:
            del self["errors"]

    def get_tree(self):

        def is_global(ntree, node, var_name):
            ret = False
            if "entryp" in node:
                if var_name in ntree.nodes[node["entryp"]].variables:
                    ret = False
                elif var_name in ntree.variables:
                    ret = True
            return ret

        def get_node_desc(ntree, node):
            ret = {}
            ret["type"] = node.type
            ret['label'] = node.label2
            ret['name'] = node.name
            ret["link_order"] = ""
            ret["link_jump"] = ""
            if "Jump_Output_Socket" in node.outputs:
                if node.outputs["Jump_Output_Socket"].is_linked:
                    r = get_target_input_node(ntree, node.outputs["Jump_Output_Socket"])
                    if r:
                        target_n, target_sock = r
                        ret['link_jump'] = target_n.label2
            if "Order_Output_Socket" in node.outputs:
                if node.outputs["Order_Output_Socket"].is_linked:
                    r = get_target_input_node(ntree, node.outputs["Order_Output_Socket"])
                    if r:
                        target_n, target_sock = r
                        ret['link_order'] = target_n.label2

            for p in node_props:
                ret[p] = getattr(node, p)
            ret["mute"] = node.mute

            ret["parse_json_vars"] = []
            ret["parse_json_paths"] = []
            ret["objects_paths"] = {}
            for o in node.objects_paths:
                arr = []
                for s in o.path_arr:
                    arr.append(s.name)
                ret["objects_paths"][o.name] = arr
            ret["materials_names"] = {}
            for o in node.materials_names:
                ret["materials_names"][o.name] = o.str
            for s in node.parse_json_list:
                ret["parse_json_vars"].append(s.name)
                ret["parse_json_paths"].append(s.path)
            ret["nodes_paths"] = {}
            for o in node.nodes_paths:
                arr = []
                for s in o.path_arr:
                    arr.append(s.name)
                ret["nodes_paths"][o.name] = arr
            ret["variables_names"] = {}
            for o in node.variables_names:
                ret["variables_names"][o.name] = [is_global(ntree, node, o.variable), o.variable]

            ret["common_usage_names"] = {}
            for o in node.common_usage_names:
                ret["common_usage_names"][o.name] = o.str
            ret["common_usage_names"]["outline_operation"] = node.outline_operation
            ret["common_usage_names"]["camera_move_style"] = node.param_camera_move_style
            ret["common_usage_names"]["request_type"] = node.param_request_type
            ret["common_usage_names"]["param_anim_behavior"] = node.param_anim_behavior
            ret["common_usage_names"]["space_type"] = node.param_space_type
            ret["common_usage_names"]["cam_lim_hor_rot_space_type"] = node.param_cam_lim_hor_rot_space_type
            ret["common_usage_names"]["cam_lim_vert_rot_space_type"] = node.param_cam_lim_vert_rot_space_type
            ret["common_usage_names"]["string_operation"] = node.param_string_operation
            ret["common_usage_names"]["json_operation"] = node.param_json_operation
            ret["common_usage_names"]["variable_type"] = node.param_variable_type
            ret["common_usage_names"]["condition"] = node.param_condition
            ret["common_usage_names"]["js_cb_params"] = {}
            for o in node.js_cb_params:
                ret["common_usage_names"]["js_cb_params"][o.name] = o.type
            ret["bools"] = {}
            for o in node.bools:
                ret["bools"][o.name] = o.bool

            ret["shader_nd_type"] = None
            if node.type == "SET_SHADER_NODE_PARAM":
                nd = node_by_ob_mt_nd(node.objects_paths["id0"], node.materials_names["id0"], node.nodes_paths["id0"])
                if nd:
                    ret["shader_nd_type"] = nd.bl_idname

            ret["floats"] = {}
            for f in node.floats:
                ret["floats"][f.name] = f.float
            for f in node.durations:
                ret["floats"][f.name] = f.float
            for f in node.angles:
                ret["floats"][f.name] = f.float
            for f in node.velocities:
                ret["floats"][f.name] = f.float

            ret["strings"] = {}
            for o in node.strings:
                ret["strings"][o.name] = o.string

            if ret["type"] == "SWITCH_SELECT":
                links = {}
                for sock in node.outputs:
                    if sock.type == "DynOutputJump":
                        r = get_target_input_node(ntree, node.outputs[sock.name])
                        if r:
                            target_n, target_sock = r
                            links[sock.name] = target_n.label2
                ret["links"] = links

            ret["encode_json_vars"] = []
            ret["encode_json_paths"] = []
            for s in node.encode_json_list:
                ret["encode_json_vars"].append(s.name)
                ret["encode_json_paths"].append(s.path)

            return ret

        ntree = self

        self.clear_errors()
        # check syntax
        subtrees = check_tree(ntree)
        self.collect_errors()

        # Keep global and local variables separated
        # for further scope detection
        tree_vars_update(ntree, True);
        scripts = []
        ind_added = 0
        if subtrees:
            for st in subtrees:
                scripts.append([])
                script = scripts[-1]
                for n in st:
                    script.append(get_node_desc(ntree, n))
                # replace SELECT&PLAY
                for s in script:
                    if s["type"] == "SELECT_PLAY":
                        play = copy.copy(s)
                        play["type"] = "PLAY"
                        play["label"] = "SLOT_EX_" + str(ind_added)
                        ind_added += 1
                        s["type"] = "SELECT"
                        s["link_jump"] = play["label"]
                        script.append(play)
                    if s["type"] == "SELECT_PLAY_ANIM":
                        play_anim = copy.deepcopy(s)
                        play_anim["type"] = "PLAY_ANIM"
                        play_anim["objects_paths"]["id0"] = play_anim["objects_paths"]["id1"]
                        del play_anim["objects_paths"]["id1"]
                        play_anim["label"] = "SLOT_EX_" + str(ind_added)
                        ind_added += 1
                        s["type"] = "SELECT"
                        s["link_jump"] = play_anim["label"]
                        del s["objects_paths"]["id1"]
                        script.append(play_anim)

        # Reset local variables: mix with global
        tree_vars_update(ntree, False);

        return (scripts, self["errors"])

    def get_node_by_label2(self, nodes, label2):
        for n in nodes:
            if n.bl_idname == "B4W_logic_node":
                if n.label2 == label2:
                    return n

class B4W_LogicEditorNode:
    @classmethod
    def poll(cls, ntree):
        return ntree.bl_idname == 'B4WLogicNodeTreeType'

class B4W_LogicNodeJumpSocket(NodeSocket):
    bl_idname = 'SlotJumpSocketType'
    bl_label = _('SlotJumpSocketOutput')
    def draw(self, context, layout, node, text):
        layout.label(_("Target"))

    def draw_color(self, context, node):
        return jump_socket_color

class B4W_LogicNodeOrderSocket(NodeSocket):
    bl_idname = 'SlotOrderSocketType'
    bl_label = _('LogicOperator Node Socket')
    label_text = bpy.props.StringProperty(
        name = _("Label"),
        description = _("Label"),
        default = "",
    )
    type = bpy.props.StringProperty(
        name = _("Type"),
        description = _("Type"),
        default = "Order",
    )
    def draw(self, context, layout, node, text):
        if node.type == "ENTRYPOINT":
            layout.label(_("Next"))
            return
        if self.name in ["Order_Input_Socket"]:
            layout.label(_("Previous"))
        if node.type == "CONDJUMP":
            if self.name in ["Order_Output_Socket"]:
                layout.label(_("False"))
            elif self.name in ["Jump_Output_Socket"]:
                layout.label(_("True"))
        elif node.type == "SELECT":
            if self.name in ["Order_Output_Socket"]:
                layout.label(_("Miss"))
            elif self.name in ["Jump_Output_Socket"]:
                layout.label(_("Hit"))
        elif node.type == "SWITCH_SELECT":
            if self.name in ["Order_Output_Socket"]:
                layout.label(_("Miss"))
            if self.type == "DynOutputJump":
                label_text = bpy.app.translations.pgettext_tip("%s Hit")
                layout.label(label_text%self.label_text)
                o = layout.operator("node.b4w_logic_remove_dyn_jump_sock", icon='ZOOMOUT', text="")
                o.node_tree = node.id_data.name
                o.node = node.name
                o.sock = self.name
            if self.type == "DummyDynOutput":
                layout.label(_("Add Socket") + self.label_text)
                o = layout.operator("node.b4w_logic_add_dyn_jump_sock", icon='ZOOMIN', text="")
                o.node_tree = node.id_data.name
                o.node = node.name
                o.sock = self.name
        else:
            if self.name in ["Order_Output_Socket"]:
                layout.label(_("Next"))

    def draw_color(self, context, node):
        if self.type == "DummyDynOutput":
            return dummy_socket_color
        return order_socket_color

class B4W_LogicNode(Node, B4W_LogicEditorNode):

    bl_idname = 'B4W_logic_node'
    bl_label = 'B4WLogicNode'

    _label_tmp = ""

    def update_reg_flag_callback(self, context):
        self.update_var_def_callback(context)
        self.update_prop_callback(context)

    def update_prop_callback(self, context):
        check_node(self)

    def update_var_def_callback(self, context):
        # If variable source node name changed
        self.id_data.update_connectivity()
        check_node(self)

    def update(self):
        check_node(self)

    def type_init(self, context):
        # update vars always when new node was added

        if self.type in ["SELECT_PLAY", "PLAY", "HIDE", "SHOW", "SELECT", "PLAY_ANIM", "DELAY",
                         "MOVE_CAMERA", "MOVE_TO", "TRANSFORM_OBJECT", "SPEAKER_PLAY", "SPEAKER_STOP", "SWITCH_SELECT", "STOP_ANIM"
                         "STOP_TIMELINE", "GET_TIMELINE", "SET_CAMERA_MOVE_STYLE", "SET_CAMERA_LIMITS"]:
            self.width = 190
        if self.type in ["PAGEPARAM"]:
            self.width = 220
        if self.type in ["REDIRECT"]:
            self.width = 250
        if self.type in ["MATH", "CONDJUMP", "SEND_REQ", "APPLY_SHAPE_KEY", "OUTLINE"]:
            self.width = 250
        if self.type in ["REGSTORE"]:
            self.width = 200
        if self.type in ["JUMP", "EMPTY"]:
            self.width = 100
        if self.type in ["STRING", "JSON", "JS_CALLBACK"]:
            self.width = 280

        self.update_var_def_callback(context)
        if self.type == "ENTRYPOINT":
            if not "Order_Output_Socket" in self.outputs:
                s = self.outputs.new('SlotOrderSocketType', "Order_Output_Socket")
                s.link_limit = 1
            self.bools.add()
            self.bools[-1].name = "js"
            return

        if self.type in ["SWITCH_SELECT"]:
            name = "id0"
            s = self.outputs.new("SlotOrderSocketType", name)
            s.link_limit = 1
            s.type = "DynOutputJump"
            s = self.outputs.new("SlotOrderSocketType", "Jump_Dummy_Output_Socket")
            s.link_limit = 1
            s.type = "DummyDynOutput"
            s = self.outputs.new('SlotOrderSocketType', "Order_Output_Socket")
            s.link_limit = 1
            s = self.inputs.new("SlotOrderSocketType", "Order_Input_Socket")
            s.link_limit = 999

            self.objects_paths.add()
            item = self.objects_paths[-1]
            item.tree_name = self.id_data.name
            item.node_name = self.name
            item.name = name
            return

        tagret_req = ["CONDJUMP", "SELECT"]

        if self.type in tagret_req:
            if not "Jump_Output_Socket" in self.outputs:
                s = self.outputs.new('SlotOrderSocketType', "Jump_Output_Socket")
                s.link_limit = 1
        if not "Order_Output_Socket" in self.outputs and self.type not in ["REDIRECT"]:
            s = self.outputs.new('SlotOrderSocketType', "Order_Output_Socket")
            s.link_limit = 1
        if not "Order_Input_Socket" in self.inputs:
            s = self.inputs.new('SlotOrderSocketType', "Order_Input_Socket")
            s.link_limit = 999

        if self.type in ["INHERIT_MAT"]:
            self.width = 250
            for i in range(2):
                name = "id%s" % i
                self.objects_paths.add()
                item = self.objects_paths[-1]
                item.tree_name = self.id_data.name
                item.node_name = self.name
                item.name = name
                self.materials_names.add()
                item = self.materials_names[-1]
                item.name = name
                item.tree_name = self.id_data.name
                item.node_name = self.name
        if self.type in ["SET_SHADER_NODE_PARAM"]:
            self.width = 250
            name = "id0"

            self.objects_paths.add()
            item = self.objects_paths[-1]
            item.tree_name = self.id_data.name
            item.node_name = self.name
            item.name = name

            self.materials_names.add()
            item = self.materials_names[-1]
            item.name = name
            item.tree_name = self.id_data.name
            item.node_name = self.name

            self.nodes_paths.add()
            item = self.nodes_paths[-1]
            item.tree_name = self.id_data.name
            item.node_name = self.name
            item.name = name

            for i in range(3):
                self.floats.add()
                self.floats[-1].name = "id%s"%i
                self.bools.add()
                self.bools[-1].name = "id%s"%i
                self.variables_names.add()
                self.variables_names[-1].name = "id%s"%i

        if self.type in ["DELAY"]:
            self.durations.add()
            self.durations[-1].name = "dl"
            self.bools.add()
            self.bools[-1].name = "dl"
            self.variables_names.add()
            self.variables_names[-1].name = "dl"

        if self.type in ["SELECT_PLAY", "PLAY_ANIM","SELECT_PLAY_ANIM", "SELECT", "SHOW",
                         "HIDE", "APPLY_SHAPE_KEY", "OUTLINE", "STOP_ANIM"]:
            name = "id0"
            self.objects_paths.add()
            item = self.objects_paths[-1]
            item.tree_name = self.id_data.name
            item.node_name = self.name
            item.name = name

        if self.type in ["SHOW", "HIDE"]:
            self.bools.add()
            self.bools[-1].name = "ch"

        if self.type in ["PLAY_ANIM", "SELECT_PLAY_ANIM", "SELECT", "SPEAKER_PLAY", "PLAY"]:
            self.bools.add()
            self.bools[-1].name = "not_wait"
            if self.type == "SPEAKER_PLAY":
                self.bools[-1].bool = True
            if self.type == "PLAY_ANIM":
                self.bools.add()
                self.bools[-1].name = "env"

        if self.type in ["STOP_ANIM"]:
            self.bools.add()
            self.bools[-1].name = "env"

        if self.type in ["SELECT_PLAY_ANIM"]:
            name = "id1"
            self.objects_paths.add()
            item = self.objects_paths[-1]
            item.tree_name = self.id_data.name
            item.node_name = self.name
            item.name = name

        if self.type in ["APPLY_SHAPE_KEY"]:
            self.common_usage_names.add()
            self.common_usage_names[-1].name ="sk"
            item = self.common_usage_names["sk"]
            item.tree_name = self.id_data.name
            item.node_name = self.name
            self.floats.add()
            self.floats[-1].name = "skv"
            self.bools.add()
            self.bools[-1].name = "skv"
            self.variables_names.add()
            self.variables_names[-1].name = "skv"

        if self.type in ["OUTLINE"]:
            # add intensity
            self.floats.add()
            self.floats[-1].name = "in"
            self.bools.add()
            self.bools[-1].name = "in"
            self.variables_names.add()
            self.variables_names[-1].name = "in"

        if self.type in ["MOVE_CAMERA"]:
            for i in range(3):
                name = "id%s"%i
                self.objects_paths.add()
                item = self.objects_paths[-1]
                item.tree_name = self.id_data.name
                item.node_name = self.name
                item.name = name
            self.durations.add()
            self.durations[-1].name = "dur"
            self.bools.add()
            self.bools[-1].name = "dur"
            self.variables_names.add()
            self.variables_names[-1].name = "dur"

        if self.type in ["MOVE_TO"]:
            for i in range(2):
                name = "id%s"%i
                self.objects_paths.add()
                item = self.objects_paths[-1]
                item.tree_name = self.id_data.name
                item.node_name = self.name
                item.name = name
            self.durations.add()
            self.durations[-1].name = "dur"
            self.bools.add()
            self.bools[-1].name = "dur"
            self.variables_names.add()
            self.variables_names[-1].name = "dur"

        if self.type in ["TRANSFORM_OBJECT"]:
            name = "id0"
            self.objects_paths.add()
            item = self.objects_paths[-1]
            item.tree_name = self.id_data.name
            item.node_name = self.name
            item.name = name
            #translation
            self.floats.add()
            self.floats[-1].name = "trx"
            self.bools.add()
            self.bools[-1].name = "trx"
            self.variables_names.add()
            self.variables_names[-1].name = "trx"
            self.floats.add()
            self.floats[-1].name = "try"
            self.bools.add()
            self.bools[-1].name = "try"
            self.variables_names.add()
            self.variables_names[-1].name = "try"
            self.floats.add()
            self.floats[-1].name = "trz"
            self.bools.add()
            self.bools[-1].name = "trz"
            self.variables_names.add()
            self.variables_names[-1].name = "trz"
            #rotation
            self.angles.add()
            self.angles[-1].name = "rox"
            self.bools.add()
            self.bools[-1].name = "rox"
            self.variables_names.add()
            self.variables_names[-1].name = "rox"
            self.angles.add()
            self.angles[-1].name = "roy"
            self.bools.add()
            self.bools[-1].name = "roy"
            self.variables_names.add()
            self.variables_names[-1].name = "roy"
            self.angles.add()
            self.angles[-1].name = "roz"
            self.bools.add()
            self.bools[-1].name = "roz"
            self.variables_names.add()
            self.variables_names[-1].name = "roz"
            #scale
            self.floats.add()
            self.floats[-1].name = "sc"
            self.floats[-1].float = 1
            self.bools.add()
            self.bools[-1].name = "sc"
            self.variables_names.add()
            self.variables_names[-1].name = "sc"
            #duration
            self.durations.add()
            self.durations[-1].name = "dur"
            self.bools.add()
            self.bools[-1].name = "dur"
            self.variables_names.add()
            self.variables_names[-1].name = "dur"

        if self.type in ["SPEAKER_PLAY", "SPEAKER_STOP"]:
            name = "id0"
            self.objects_paths.add()
            item = self.objects_paths[-1]
            item.tree_name = self.id_data.name
            item.node_name = self.name
            item.name = name

        if self.type in ["STOP_ANIM", "STOP_TIMELINE"]:
            self.bools.add()
            self.bools[-1].name = "rst"

        if self.type in ["CONSOLE_PRINT"]:
            self.variables_names.add()
            self.variables_names[-1].name = "id0"
            self.common_usage_names.add()
            self.common_usage_names[-1].name = "msg"

        if self.type in ["STRING"]:
            for i in range(3):
                self.strings.add()
                self.strings[-1].name = "id%s"%i
                self.bools.add()
                self.bools[-1].name = "id%s"%i
                self.variables_names.add()
                self.variables_names[-1].name = "id%s"%i
            self.variables_names.add()
            self.variables_names[-1].name = "dst"
            self.variables_names.add()
            self.variables_names[-1].name = "dst1"

        if self.type in ["SEND_REQ", "REDIRECT"]:
            self.strings.add()
            self.strings[-1].name = "url"
            self.strings[-1].string = "https://www.blend4web.com"
            self.bools.add()
            self.bools[-1].name = "url"
            self.variables_names.add()
            self.variables_names[-1].name = "url"

        if self.type in ["SEND_REQ"]:
            self.variables_names[-1].name = "dst"
            self.variables_names.add()
            self.variables_names[-1].name = "dst1"
            self.bools.add()
            self.bools[-1].name = "ct"
            self.strings.add()
            self.strings[-1].name = "ct"

        if self.type in ["PAGEPARAM"]:
            self.bools.add()
            self.bools[-1].name = "hsh"

        if self.type in ["MATH", "CONDJUMP", "PAGEPARAM", "REGSTORE"]:
            self.variables_names.add()
            self.variables_names[-1].name = "v1"
            self.variables_names.add()
            self.variables_names[-1].name = "v2"
            self.variables_names.add()
            self.variables_names[-1].name = "vd"
            if self.type in ["MATH", "CONDJUMP", "REGSTORE"]:
                self.floats.add()
                self.floats[-1].name = "inp1"
            if self.type in ["MATH", "CONDJUMP"]:
                self.floats.add()
                self.floats[-1].name = "inp2"
            if self.type in ["REGSTORE"]:
                self.strings.add()
                self.strings[-1].name = "inp1"
                self.bools.add()
                self.bools[-1].name = "gl"
            if self.type in ["CONDJUMP"]:
                self.bools.add()
                self.bools[-1].name = "str"
                self.bools[-1].description = "AAA"
                self.strings.add()
                self.strings[-1].name = "inp1"
                self.strings.add()
                self.strings[-1].name = "inp2"

        if self.type in ["GET_TIMELINE"]:
            self.variables_names.add()
            self.variables_names[-1].name = "vd"
            self.bools.add()
            self.bools[-1].name = "nla"
            self.bools[-1].bool = True

        if self.type in ["JSON"]:
            self.variables_names.add()
            self.variables_names[-1].name = "jsn"

        if self.type in ["JS_CALLBACK"]:
            self.strings.add()
            self.strings[-1].name = "cb"
            self.bools.add()
            self.bools[-1].name = "cb"
            self.variables_names.add()
            self.variables_names[-1].name = "cb"

        if self.type in ["SET_CAMERA_MOVE_STYLE"]:
            name = "id0"
            self.objects_paths.add()
            item = self.objects_paths[-1]
            item.tree_name = self.id_data.name
            item.node_name = self.name
            item.name = name

            # velocities
            self.velocities.add()
            self.velocities[-1].name = "vtr"
            self.velocities[-1].float = 1.0
            self.bools.add()
            self.bools[-1].name = "vtr"
            self.variables_names.add()
            self.variables_names[-1].name = "vtr"
            self.velocities.add()
            self.velocities[-1].name = "vro"
            self.velocities[-1].float = 1.0
            self.bools.add()
            self.bools[-1].name = "vro"
            self.variables_names.add()
            self.variables_names[-1].name = "vro"
            self.velocities.add()
            self.velocities[-1].name = "vzo"
            self.velocities[-1].float = 0.1
            self.bools.add()
            self.bools[-1].name = "vzo"
            self.variables_names.add()
            self.variables_names[-1].name = "vzo"
            # pivot
            self.floats.add()
            self.floats[-1].name = "pvx"
            self.bools.add()
            self.bools[-1].name = "pvx"
            self.variables_names.add()
            self.variables_names[-1].name = "pvx"
            self.floats.add()
            self.floats[-1].name = "pvy"
            self.bools.add()
            self.bools[-1].name = "pvy"
            self.variables_names.add()
            self.variables_names[-1].name = "pvy"
            self.floats.add()
            self.floats[-1].name = "pvz"
            self.bools.add()
            self.bools[-1].name = "pvz"
            self.variables_names.add()
            self.variables_names[-1].name = "pvz"
            self.bools.add()
            self.bools[-1].name = "pvo"
            name = "id1"
            self.objects_paths.add()
            item = self.objects_paths[-1]
            item.tree_name = self.id_data.name
            item.node_name = self.name
            item.name = name

        if self.type in ["SET_CAMERA_LIMITS"]:
            name = "id0"
            self.objects_paths.add()
            item = self.objects_paths[-1]
            item.tree_name = self.id_data.name
            item.node_name = self.name
            item.name = name

            # distance limits
            self.bools.add()
            self.bools[-1].name = "dsl"
            self.floats.add()
            self.floats[-1].name = "dslmin"
            self.bools.add()
            self.bools[-1].name = "dslmin"
            self.variables_names.add()
            self.variables_names[-1].name = "dslmin"
            self.floats.add()
            self.floats[-1].name = "dslmax"
            self.bools.add()
            self.bools[-1].name = "dslmax"
            self.variables_names.add()
            self.variables_names[-1].name = "dslmax"

            # horizontal rotation limits
            self.bools.add()
            self.bools[-1].name = "hrl"
            self.angles.add()
            self.angles[-1].name = "hrlleft"
            self.bools.add()
            self.bools[-1].name = "hrlleft"
            self.variables_names.add()
            self.variables_names[-1].name = "hrlleft"
            self.angles.add()
            self.angles[-1].name = "hrlright"
            self.bools.add()
            self.bools[-1].name = "hrlright"
            self.variables_names.add()
            self.variables_names[-1].name = "hrlright"
            self.bools.add()
            self.bools[-1].name = "hrlright"
            self.variables_names.add()
            self.variables_names[-1].name = "hrlright"

            # vertical rotation limits
            self.bools.add()
            self.bools[-1].name = "vrl"
            self.angles.add()
            self.angles[-1].name = "vrldown"
            self.bools.add()
            self.bools[-1].name = "vrldown"
            self.variables_names.add()
            self.variables_names[-1].name = "vrldown"
            self.angles.add()
            self.angles[-1].name = "vrlup"
            self.bools.add()
            self.bools[-1].name = "vrlup"
            self.variables_names.add()
            self.variables_names[-1].name = "vrlup"

            # pivot translation limits
            self.bools.add()
            self.bools[-1].name = "pvl"
            self.floats.add()
            self.floats[-1].name = "pvlmin"
            self.bools.add()
            self.bools[-1].name = "pvlmin"
            self.variables_names.add()
            self.variables_names[-1].name = "pvlmin"
            self.floats.add()
            self.floats[-1].name = "pvlmax"
            self.bools.add()
            self.bools[-1].name = "pvlmax"
            self.variables_names.add()
            self.variables_names[-1].name = "pvlmax"

            # horizontal translation limits
            self.bools.add()
            self.bools[-1].name = "htl"
            self.floats.add()
            self.floats[-1].name = "htlmin"
            self.bools.add()
            self.bools[-1].name = "htlmin"
            self.variables_names.add()
            self.variables_names[-1].name = "htlmin"
            self.floats.add()
            self.floats[-1].name = "htlmax"
            self.bools.add()
            self.bools[-1].name = "htlmax"
            self.variables_names.add()
            self.variables_names[-1].name = "htlmax"

            # vertical translation limits
            self.bools.add()
            self.bools[-1].name = "vtl"
            self.floats.add()
            self.floats[-1].name = "vtlmin"
            self.bools.add()
            self.bools[-1].name = "vtlmin"
            self.variables_names.add()
            self.variables_names[-1].name = "vtlmin"
            self.floats.add()
            self.floats[-1].name = "vtlmax"
            self.bools.add()
            self.bools[-1].name = "vtlmax"
            self.variables_names.add()
            self.variables_names[-1].name = "vtlmax"

    type = bpy.props.EnumProperty(name="type",items=slot_type_enum, update=type_init)

    param_marker_start = bpy.props.StringProperty(
        name = _("Start Marker"),
        description = _("First marker of the playback"),
        default = "",
        update = update_prop_callback
    )
    param_marker_end = bpy.props.StringProperty(
        name = _("End Marker"),
        description = _("Final marker of the playback"),
        default = "",
        update = update_prop_callback
    )
    param_slot = bpy.props.StringProperty(
        name = _("Target Slot"),
        description = _("Name of the target slot"),
        default = "",
        update = update_prop_callback
    )
    param_var_define = bpy.props.StringProperty(
        name = _("Define Var"),
        description = _("Variable name"),
        update = update_var_def_callback
    )
    param_var_flag1 = bpy.props.BoolProperty(
        name = _("Variable"),
        description = _("First variable operand"),
        default = False,
        update = update_reg_flag_callback
    )
    param_var_flag2 = bpy.props.BoolProperty(
        name = _("Variable"),
        description = _("Second variable operand"),
        default = False,
        update = update_prop_callback
    )
    param_operation = bpy.props.EnumProperty(
        name = _("Operation"),
        description = _("Operation to perform on input operands"),
        default = "ADD",
        items = operation_type_enum,
        update = update_prop_callback
    )
    outline_operation = bpy.props.EnumProperty(
        name = _("Operation"),
        description = _("Operation to control outline animation"),
        default = "PLAY",
        items = outline_items,
    )
    param_camera_move_style = bpy.props.EnumProperty(
        name = _("Camera movement style"),
        description = _("Camera movement style"),
        default = "TARGET",
        items = properties.b4w_camera_move_style_items,
    )
    param_anim_behavior = bpy.props.EnumProperty(
        name = _("B4W: animation behavior"),
        description = _("The behavior of finished animation: stop, repeat or reset"),
        default = "FINISH_STOP",
        items = properties.b4w_anim_behavior_items
    )
    param_request_type = bpy.props.EnumProperty(
        name = _("Method"),
        description = _("Request method"),
        default = "GET",
        items = send_request_type_items
    )
    param_condition = bpy.props.EnumProperty(
        name = _("Condition"),
        description = _("Conditonal operator"),
        default = "EQUAL",
        items = condition_type_enum,
        update = update_prop_callback
    )
    param_name = bpy.props.StringProperty(
        name = _("Param Name"),
        description = _("Param name"),
        default = "",
        update = update_prop_callback
    )
    # used for identification
    label2 = bpy.props.StringProperty(
        name = _("label2"),
        description = "label2",
        default = ""
    )
    error_messages = bpy.props.PointerProperty(
        name = _("Error messages"),
        description = _("Error messages"),
        type = B4W_LogicEditorErrors
    )
    param_anim_name = bpy.props.StringProperty(
        name = _("Anim. Name"),
        description = _("Animation Name"),
        default = ""
    )
    # used only in entry points
    # contains variables for current thread
    variables = bpy.props.CollectionProperty(
        name = _("B4W: Variables"),
        description = _("Variables for current thread"),
        type = B4W_StringWrap,
    )

    objects_paths = bpy.props.CollectionProperty(
        name = _("B4W: Objects Paths"),
        description = _("Contain a pointer to target object"),
        type = B4W_ObjectPathWrap
    )

    nodes_paths = bpy.props.CollectionProperty(
        name = _("B4W: Nodes Paths"),
        description = _("Contain a pointer to target node"),
        type = B4W_NodePathWrap
    )

    materials_names = bpy.props.CollectionProperty(
        name = _("B4W: Materials names"),
        description = _("Contain a materials names"),
        type = B4W_LogicNodeNamedMaterialNameWrap
    )

    floats = bpy.props.CollectionProperty(
        name = _("B4W: float array"),
        description = _("Contain floats"),
        type = B4W_LogicNodeFloatWrap
    )

    durations = bpy.props.CollectionProperty(
        name = _("B4W: duration array"),
        description = _("Contain durations"),
        type = B4W_LogicNodeDurationWrap
    )

    angles = bpy.props.CollectionProperty(
        name = _("B4W: angle array"),
        description = _("Contain angles"),
        type = B4W_LogicNodeAngleWrap
    )

    velocities = bpy.props.CollectionProperty(
        name = _("B4W: velocities array"),
        description = _("Contain velocities"),
        type = B4W_LogicNodeVelocityWrap
    )

    bools = bpy.props.CollectionProperty(
        name = _("B4W: bools array"),
        description = _("Contain bools"),
        type = B4W_LogicNodeBoolWrap
    )

    strings = bpy.props.CollectionProperty(
        name = _("B4W: string array"),
        description = _("Contain strings"),
        type = B4W_LogicNodeStringWrap
    )

    variables_names = bpy.props.CollectionProperty(
        name = _("B4W: variables array"),
        description = _("Contain variables"),
        type = B4W_LogicNodeVariableWrap
    )

    common_usage_names = bpy.props.CollectionProperty(
        name = _("B4W: common usage names"),
        description = _("Contain common usage name storage"),
        type = B4W_CommonUsageNames
    )

    js_cb_params = bpy.props.CollectionProperty(
        name = _("B4W: JS callback params"),
        description = _("Contain params for custom JS callback"),
        type = B4W_JSCbParamWrap
    )

    param_variable_type = bpy.props.EnumProperty(
        name = _("Variable type"),
        description = _("Variable type"),
        default = "NUMBER",
        items = variable_type_items,
        update = update_prop_callback
    )

    param_string_operation = bpy.props.EnumProperty(
        name = _("String operation"),
        description = _("String operation to perform on input operands"),
        default = "JOIN",
        items = string_operation_type_enum,
        update = update_prop_callback
    )

    param_space_type = bpy.props.EnumProperty(
        name = _("Space type"),
        description = _("Space type"),
        default = "WORLD",
        items = space_type_items,
        update = update_prop_callback
    )

    param_cam_lim_hor_rot_space_type = bpy.props.EnumProperty(
        name = _("Camera horizontal limits space"),
        description = _("Camera horizontal rotation limits space"),
        default = "CAMERA",
        items = cam_lim_space_type_items,
        update = update_prop_callback
    )

    param_cam_lim_vert_rot_space_type = bpy.props.EnumProperty(
        name = _("Camera vertical limits space"),
        description = _("Camera vertical rotation limits space"),
        default = "CAMERA",
        items = cam_lim_space_type_items,
        update = update_prop_callback
    )

    param_json_operation = bpy.props.EnumProperty(
        name = _("JSON operation"),
        description = _("JSON operation"),
        default = "PARSE",
        items = json_operation_type_enum
    )

    parse_json_list = bpy.props.CollectionProperty(type=B4W_ParseJsonStringWrap, name="B4W: parse json list")
    parse_json_list_active_index = bpy.props.IntProperty(name="B4W: parse json list index")

    encode_json_list = bpy.props.CollectionProperty(type=B4W_ParseJsonStringWrap, name="B4W: encode json items list")
    encode_json_list_active_index = bpy.props.IntProperty(name="B4W: encode json items list index")

    def add_error_message(self, list, message):
        found = False
        for m in list:
            if m.message == message:
                found = True
        if not found:
            list.add()
            list[-1].message = message

    def get_object_path(self):
        path = []
        for i in range(0, 10):
            ob = getattr(self,"ob%s"%i)
            if ob == "":
                break;
            path.append(ob)
        return path

    def update_label2(self):
        ntree = self.id_data
        slot_cnt = 0
        while (True):
            old_slot_cnt = slot_cnt
            for node in ntree.nodes:
                if node.bl_idname == "B4W_logic_node":
                    if node.label2 == "SLOT_" + str(slot_cnt):
                        slot_cnt+=1
            if old_slot_cnt == slot_cnt:
                break

        self.label2 = "SLOT_" + str(slot_cnt)

    def copy(self, node):
        # id_data can be None when just Ctrl+C is pressed
        # id_data is not none when Ctrl+V is pressed
        if self.id_data:
            self.update_label2()

    def init(self, context):
        self.update_label2()
        check_node(self)

    def draw_marker(self, col, prop_name, label):
        row = col.row()
        spl = row.split(percentage = 0.50)
        spl.label(label)
        spl.prop_search(self, prop_name, bpy.context.scene, 'timeline_markers', text='', icon='MARKER')

    def draw_start_end_markers(self, col):
        self.draw_marker(col, "param_marker_start", "Start Marker:")
        self.draw_marker(col, "param_marker_end", "End Marker:")

    # common method to draw object/world/material/node selector
    # Dict used for optimazation. If dict is not None it must contain
    # object, world, material and node values ('ob', 'wd', mt', 'nd')
    def draw_selector(self, layout, index, name, dict, type = "ob", icon=None):
        no_source = None
        child_str = _("Child")
        if dict:
            ob = dict["ob"]
            nd = dict["nd"]
            mt = dict["mt"]
            wd = dict["wd"]
        else:
            ob = nd = mt = wd = None
        key = "id"
        if type == "ob":
            storage_name = "objects_paths"
            default_search = "objects"
            default_src = bpy.data
            child_str = _("Dupli Child")
        elif type == "wd":
            storage_name = "objects_paths"
            default_search = "worlds"
            default_src = bpy.data
            child_str = _("Dupli Child")
        elif type == "nd":
            child_str = _("Child Node")
            storage_name = "nodes_paths"
            default_search = "nodes"
            if not ob:
                item = self.objects_paths["%s%s"%(key,index)]
                ob = object_by_bpy_collect_path(bpy.data.objects, item.path_arr)
            if ob:
                mt_item = self.materials_names["%s%s"%(key,index)]
                default_src = None
                if not mt:
                    if mt_item.str in ob.material_slots:
                        mt = ob.material_slots[mt_item.str].material
                nd_item = self.nodes_paths["%s%s"%(key,index)]
                if mt:
                    if not nd:
                        if mt.node_tree:
                            if len(nd_item.path_arr):
                                nd = node_by_bpy_collect_path(mt.node_tree, nd_item.path_arr)
                    if not nd or not default_src:
                        if not mt.node_tree:
                            no_source = _("Not node material")
                        default_src = mt.node_tree
            else:
                default_src = None
            if not mt:
                no_source = _("Wrong Material field")
        elif type == "mt":
            row = layout.row(align=True)

            item = self.materials_names["%s%s"%(key,index)]
            row.label(_("Material:"))
            if ob:
                if icon:
                    row.prop_search(item, "str", ob, 'material_slots', text='', icon=icon)
                else:
                    row.prop_search(item, "str", ob, 'material_slots', text='')
            else:
                row.label(_('Object is not selected'))
            return {"ob": ob, "mt": mt, "nd": nd, "wd": wd}

        storage = getattr(self, storage_name)
        item = storage["%s%s"%(key,index)]
        row = layout.row()
        row.label(name)
        row = layout.row(align=True)
        if no_source:
            row.label(no_source)
        else:

            if ">" not in item.path and default_src:
                if icon:
                    row.prop_search(item, "path", default_src, default_search, text='', icon=icon)
                else:
                    row.prop_search(item, "path", default_src, default_search, text='')
            else:
                row.prop(item, "path", text = '')
            if type == "wd":
                wd, child_src = self.get_child_src(item, index, wd, type)
                return {"ob": ob, "mt": mt, "nd": nd, "wd": wd}
            ob, child_src = self.get_child_src(item, index, ob, type)
            l = self.get_selector_list_len(type, index)
            if (l == 1 and child_src) or (l > 1):
                row = layout.row(align=True)
                row.label(child_str+":")

                op = row.operator("node.b4w_logic_edit_object_item_level", icon='ZOOMOUT', text="")
                op.node_tree = self.id_data.name
                op.node = self.name
                op.item = "%s%s"%(key,index)
                op.reverse = True
                op.type = type

                op = row.operator("node.b4w_logic_edit_object_item_level", icon='ZOOMIN', text="")
                op.node_tree = self.id_data.name
                op.node = self.name
                op.item = "%s%s"%(key,index)
                op.reverse = False
                op.type = type

                col1 = row.column(align = True)

                if child_src:
                    col1.prop_search(item, "cur_dir", child_src, default_search, text='')
                else:
                    col1.label(_("No child elements"))
        return {"ob": ob, "mt": mt, "nd": nd, "wd": wd}
    def get_selector_list_len(self, type, index):
        if type == "ob":
            return len(self.objects_paths["id%s"%index].path_arr)
        if type == "nd":
            return len(self.nodes_paths["id%s"%index].path_arr)
    def get_child_src(self, item, index, o, type = "ob"):
        if type == "ob":
            if not o:
                o = object_by_bpy_collect_path(bpy.data.objects, item.path_arr)
            if len(item.path_arr):
                if o:
                    obj_list_src = o.dupli_group
                else:
                    obj_list_src = None
            else:
                obj_list_src = None
            return o, obj_list_src
        if type == "nd":
            obj_list_src = None
            name = "id%s"%index
            node_by_ob_mt_nd( self.objects_paths[name], self.materials_names[name], self.nodes_paths[name])
            if len(item.path_arr) and not self.materials_names[index].str == "":
                if not o:
                    o = object_by_bpy_collect_path(bpy.data.objects, self.objects_paths[index].path_arr)
                if o:
                    if self.materials_names[index].str in o.material_slots:
                        mat = o.material_slots[self.materials_names[index].str].material
                        if hasattr(mat, "node_tree"):
                            nd = node_by_bpy_collect_path(mat.node_tree, item.path_arr)
                            if nd:
                                if hasattr(nd, "node_tree"):
                                    obj_list_src = nd.node_tree
                            else:
                                obj_list_src = None
            else:
                obj_list_src = None
            return o, obj_list_src
        if type == "wd":
            if not o:
                o = object_by_bpy_collect_path(bpy.data.worlds, item.path_arr)
            obj_list_src = None
            return o, obj_list_src

    def check_shapekey_store(self, ob):
        if ob:
            if ob.data:
                if hasattr(ob.data, "shape_keys"):
                    if hasattr(ob.data.shape_keys, "key_blocks"):
                        if ob.data.shape_keys.key_blocks:
                            return True
        return False

    def draw_buttons(self, context, layout):
        scene = context.scene

        if not scene:
            return

        if len(self.error_messages.link_err) > 0 or len(self.error_messages.prop_err) > 0:
            # b = layout.box()
            b = layout
            for m in self.error_messages.link_err:
                c = b.column()
                c.label(m.message, icon = 'ERROR')
            for m in self.error_messages.prop_err:
                c = b.column()
                c.label(m.message, icon = 'ERROR')

        slot = self
        col = layout.column(align=True)

        if not self.type in ("NOOP", "JUMP") :
            split = col.split()
            col = split.column()

        if self.type == "PLAY":
            self.draw_start_end_markers(col)
            col.prop(slot.bools["not_wait"], "bool", text="Do Not Wait")

        elif slot.type == "SELECT":
            self.draw_selector(col, 0, "Object:", None, "ob")
            col.prop(slot.bools["not_wait"], "bool", text="Do Not Wait")

        elif slot.type == "PLAY_ANIM":
            col.prop(slot.bools["env"], "bool", text="Environment Anim.")
            if not self.bools["env"].bool:
                self.draw_selector(col, 0, "Object:", None, "ob")
            else:
                self.draw_selector(col, 0, "World:", None, "wd")
            col.prop(slot, "param_anim_name")
            row = col.row()
            row.label("Behavior:")
            row.prop(slot, "param_anim_behavior", text="")
            col.prop(slot.bools["not_wait"], "bool", text=_("Do Not Wait"))

        elif slot.type == "STOP_ANIM":
            col.prop(slot.bools["env"], "bool", text="Environment Anim.")
            if not self.bools["env"].bool:
                self.draw_selector(col, 0, "Object:", None, "ob")
            else:
                self.draw_selector(col, 0, "World:", None, "wd")
            col.prop(self.bools["rst"], "bool", text="Set First Frame")

        elif slot.type == "STOP_TIMELINE":
            col.prop(self.bools["rst"], "bool", text="Set First Frame")

        elif slot.type == "SELECT_PLAY_ANIM":
            self.draw_selector(col, 0, _("Select Object:"), None, "ob")
            self.draw_selector(col, 1, _("Animate Object:"), None, "ob")
            row = col.row()
            row.prop(slot, "param_anim_name")
            row = col.row()
            row.prop(slot.bools["not_wait"], "bool", text=_("Do Not Wait"))

        elif slot.type == "SELECT_PLAY":
            self.draw_selector(col, 0, _("Object:"), None, "ob")
            self.draw_start_end_markers(col)

        elif slot.type == "OUTLINE":
            self.draw_selector(col, 0, _("Object:"), None, "ob")
            col.prop(self, "outline_operation")
            row = col.row(align = True)
            if self.outline_operation == "INTENSITY":
                if self.bools["in"].bool:
                    if "entryp" in self:
                        row.prop_search(self.variables_names["in"], "variable",
                            self.id_data.nodes[self["entryp"]], 'variables', text='')
                    else:
                        row.label(no_var_source_msg)
                else:
                    row.prop(self.floats["in"], "float", text = _("Intensity"))
                row.prop(self.bools["in"], "bool", text = _("Variable"))

        elif slot.type == "APPLY_SHAPE_KEY":
            dict = self.draw_selector(col, 0, _("Object:"), None, "ob")
            ob = dict["ob"]
            if self.check_shapekey_store(ob):
                col.prop_search(self.common_usage_names["sk"], "str",
                                dict["ob"].data.shape_keys, "key_blocks", text = _("Shape Key"))
                row = col.row(align = True)
                if self.bools["skv"].bool:
                    if "entryp" in self:
                        row.prop_search(self.variables_names["skv"], "variable",
                                        self.id_data.nodes[self["entryp"]], 'variables', text='')
                    else:
                        row.label(no_var_source_msg)
                else:
                    row.prop(self.floats["skv"], "float", text = _("Value"))
                row.prop(self.bools["skv"], "bool", text = _("Variable"))
            else:
                col.label(_("No shape key source"))
        elif slot.type == "JUMP":
            pass
        elif slot.type == "CONDJUMP":
            col.prop(slot, "param_condition")

            row = col.row()
            row.label(_("Operand1:"))
            if slot.param_var_flag1:
                if "entryp" in self:
                    row.prop_search(self.variables_names["v1"], "variable",
                                    self.id_data.nodes[self["entryp"]], 'variables', text='')
                else:
                    row.label(no_var_source_msg)
            elif self.bools["str"].bool:
                row.prop(self.strings["inp1"], "string", text='')
            else:
                row.prop(self.floats["inp1"], "float", text='')
            row.prop(slot, "param_var_flag1")

            row = col.row()
            row.label(_("Operand2:"))
            if slot.param_var_flag2:
                if "entryp" in self:
                    row.prop_search(self.variables_names["v2"], "variable",
                                    self.id_data.nodes[self["entryp"]], 'variables', text='')
                else:
                    row.label(no_var_source_msg)
            elif self.bools["str"].bool:
                row.prop(self.strings["inp2"], "string", text='')
            else:
                row.prop(self.floats["inp2"], "float", text='')
            row.prop(slot, "param_var_flag2")

            row = col.row()
            row.prop(self.bools["str"], "bool", text=_("String Operands"))

        elif slot.type == "REGSTORE":
            row1 = col.row()
            row1.prop(slot, "param_var_flag1", text=_("New Variable"))
            col = layout.column(align=True)
            row = col.row()
            if slot.param_var_flag1:
                row.prop(slot, "param_var_define", text=_("New var."))
                row1.prop(slot.bools["gl"], "bool", text=_("Global"))
            else:
                if "entryp" in self:
                    row.prop_search(self.variables_names["vd"], "variable",
                                    self.id_data.nodes[self["entryp"]], 'variables', text=_('Var. name'))
                else:
                    row.label(no_var_source_msg)
            row = col.row()
            row.prop(slot, "param_variable_type", text=_("Var. type"))
            if slot.param_variable_type == "NUMBER":
                row = col.row()
                row.prop(self.floats["inp1"], "float", text='')
            else:
                row = col.row()
                row.prop(self.strings["inp1"], "string", text='')

        elif slot.type == "MATH":
            col.prop(slot, "param_operation")

            row = col.row()
            row.label(_("Operand1:"))
            if slot.param_var_flag1:
                if "entryp" in self:
                    row.prop_search(self.variables_names["v1"], "variable",
                                    self.id_data.nodes[self["entryp"]], 'variables', text='')
                else:
                    row.label(no_var_source_msg)
            else:
                row.prop(self.floats["inp1"], "float", text='')
            row.prop(slot, "param_var_flag1")

            row = col.row()
            row.label(_("Operand2:"))
            if slot.param_var_flag2:
                if "entryp" in self:
                    row.prop_search(self.variables_names["v2"], "variable",
                                    self.id_data.nodes[self["entryp"]], 'variables', text='')
                else:
                    row.label(no_var_source_msg)
            else:
                row.prop(self.floats["inp2"], "float", text='')
            row.prop(slot, "param_var_flag2")

            row = col.row()
            row.label(_("Destination:"))
            if "entryp" in self:
                    row.prop_search(self.variables_names["vd"], "variable",
                                    self.id_data.nodes[self["entryp"]], 'variables', text='')
            else:
                row.label(no_var_source_msg)
            row.label("")

        elif slot.type == "REDIRECT":
            row = col.row()
            row.prop(self.bools["url"], "bool", text = _("Variable URL"))
            row = col.row()
            spl = row.split(percentage=0.10)
            spl.label(_("Url:"))
            if not self.bools["url"].bool:
                spl.prop(self.strings["url"], "string", text = "")
            else:
                if "entryp" in self:
                    spl.prop_search(self.variables_names["url"], "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = "")
                else:
                    spl.label(no_var_source_msg)

        elif slot.type == "SEND_REQ":
            row = col.row()
            col1 = col
            row.prop(self, "param_request_type")
            row = col.row()
            row.prop(self.bools["url"], "bool", text = _("Variable URL"))
            row = col.row()
            spl = row.split(percentage=0.10)
            spl.label(_("Url:"))
            if not self.bools["url"].bool:
                spl.prop(self.strings["url"], "string", text = "")
            else:
                if "entryp" in self:
                    spl.prop_search(self.variables_names["url"], "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = "")
                else:
                    spl.label(no_var_source_msg)
            row = col.row()
            row = col.row()
            row.label(_("Response Params:"))
            row = col.row()
            row.prop(self.bools["ct"], "bool", text=_("Content-Type:"))
            if self.bools["ct"].bool:
                row.prop(self.strings["ct"], "string", text="")
            else:
                row.label("Auto")
            row = col.row()
            if "entryp" in self:
                row.prop_search(self.variables_names["dst"], "variable",
                            self.id_data.nodes[self["entryp"]], "variables", text = "")
            else:
                row.label(no_var_source_msg)

            if slot.param_request_type == "POST":
                row = col1.row()
                row.label(_("Request Params:"))
                row = col1.row()
                if "entryp" in self:
                    row.prop_search(self.variables_names["dst1"], "variable",
                            self.id_data.nodes[self["entryp"]], "variables", text = "")
                else:
                    row.label(no_var_source_msg)

        elif slot.type == "INHERIT_MAT":
            names = ["Source:", "Destination:"]
            for i in range(2):
                d = self.draw_selector(col, i, _(names[i]), None, "ob")
                self.draw_selector(col, i, _(names[i]), d, "mt")

                if i == 0:
                    row = col.row(align=True)
                    row.label('')

        elif slot.type == "SET_SHADER_NODE_PARAM":
            d = self.draw_selector(col, 0, _("Object:"), None, "ob")
            d = self.draw_selector(col, 0, _("Material:"), d, "mt")
            d = self.draw_selector(col, 0, _("Node:"), d, "nd")
            if d["nd"]:
                col.label(_("Parameters:"))
                l = 0
                if d["nd"].bl_idname == "ShaderNodeRGB":
                    l = 3
                    col.label(_("RGB:"))
                elif d["nd"].bl_idname == "ShaderNodeValue":
                    l = 1
                    col.label(_("Value:"))
                else:
                    col.label(_("No editable parameters available"))

                for i in range(l):
                    row = col.row(align=True)
                    if not self.bools["id%s"%i].bool:
                        row.prop(self.floats["id%s"%i], "float", text = "")
                    else:
                        if "entryp" in self:
                            row.prop_search(self.variables_names["id%s"%i], "variable",
                                            self.id_data.nodes[self["entryp"]], "variables", text = "")
                        else:
                            row.label(no_var_source_msg)

                    row.prop(self.bools["id%s"%i], "bool", text = _("Variable"))

        elif slot.type == "DELAY":
            col.label(_("Value:"))
            row = col.row(align=True)
            if not self.bools["dl"].bool:
                row.prop(self.durations["dl"], "float", text = "")
            else:
                if "entryp" in self:
                    row.prop_search(self.variables_names["dl"], "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = "")
                else:
                    row.label(no_var_source_msg)

            row.prop(self.bools["dl"], "bool", text = _("Variable"))

        elif slot.type == "SHOW" or slot.type == "HIDE":
            self.draw_selector(col, 0, _("Object:"), None, "ob")
            row = col.row()
            row.prop(self.bools["ch"], "bool", text = _("Process child objects"))

        elif slot.type == "PAGEPARAM":
            row = col.row()
            spl = row.split(percentage=0.50)
            spl.label(_('Param Name:'))
            spl.prop(slot, "param_name", text = '')

            row = col.row()
            spl = row.split(percentage=0.50)
            spl.label(_("Destination:"))
            if "entryp" in self:
                spl.prop_search(self.variables_names["v1"], "variable",
                                self.id_data.nodes[self["entryp"]], 'variables', text='')
            else:
                spl.label(no_var_source_msg)

            row = col.row()
            row.prop(slot, "param_variable_type", text=_("Param type"))
            row = col.row()
            row.prop(self.bools["hsh"], "bool", text = _("Hash param"))

        elif slot.type == "MOVE_CAMERA":
            self.draw_selector(col, 0, _("Camera:"), None, "ob", icon="OUTLINER_OB_CAMERA")
            self.draw_selector(col, 1, _("Destination:"), None, "ob")
            self.draw_selector(col, 2, _("Look at:"), None, "ob")
            col.label(_("Duration:"))
            row = col.row(align=True)
            if not self.bools["dur"].bool:
                row.prop(self.durations["dur"], "float", text = "")
            else:
                if "entryp" in self:
                    row.prop_search(self.variables_names["dur"], "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = "")
                else:
                    row.label(no_var_source_msg)

            row.prop(self.bools["dur"], "bool", text = _("Variable"))

        elif slot.type == "MOVE_TO":
            self.draw_selector(col, 0, _("Object:"), None, "ob")
            self.draw_selector(col, 1, _("Destination:"), None, "ob")
            col.label(_("Duration:"))
            row = col.row(align=True)
            if not self.bools["dur"].bool:
                row.prop(self.durations["dur"], "float", text = "")
            else:
                if "entryp" in self:
                    row.prop_search(self.variables_names["dur"], "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = "")
                else:
                    row.label(no_var_source_msg)

            row.prop(self.bools["dur"], "bool", text = _("Variable"))

        elif slot.type == "TRANSFORM_OBJECT":
            self.draw_selector(col, 0, _("Object:"), None, "ob")
            row = col.row()
            row.prop(self, "param_space_type", text = _("Space"))

            col.label(_("Location:"))
            row = col.row()
            if not self.bools["trx"].bool:
                row.prop(self.floats["trx"], "float", text = _("x"))
            else:
                if "entryp" in self:
                    row.prop_search(self.variables_names["trx"], "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = "")
                else:
                    row.label(no_var_source_msg)
            row.prop(self.bools["trx"], "bool", text = _("Variable"))
            row = col.row()
            if not self.bools["try"].bool:
                row.prop(self.floats["try"], "float", text = _("y"))
            else:
                if "entryp" in self:
                    row.prop_search(self.variables_names["try"], "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = "")
                else:
                    row.label(no_var_source_msg)
            row.prop(self.bools["try"], "bool", text = _("Variable"))
            row = col.row()
            if not self.bools["trz"].bool:
                row.prop(self.floats["trz"], "float", text = _("z"))
            else:
                if "entryp" in self:
                    row.prop_search(self.variables_names["trz"], "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = "")
                else:
                    row.label(no_var_source_msg)
            row.prop(self.bools["trz"], "bool", text = _("Variable"))

            col.label(_("Rotation:"))
            row = col.row()
            if not self.bools["rox"].bool:
                row.prop(self.angles["rox"], "float", text = _("x"))
            else:
                if "entryp" in self:
                    row.prop_search(self.variables_names["rox"], "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = "")
                else:
                    row.label(no_var_source_msg)
            row.prop(self.bools["rox"], "bool", text = _("Variable"))
            row = col.row()
            if not self.bools["roy"].bool:
                row.prop(self.angles["roy"], "float", text = _("y"))
            else:
                if "entryp" in self:
                    row.prop_search(self.variables_names["roy"], "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = "")
                else:
                    row.label(no_var_source_msg)
            row.prop(self.bools["roy"], "bool", text = _("Variable"))
            row = col.row()
            if not self.bools["roz"].bool:
                row.prop(self.angles["roz"], "float", text = _("z"))
            else:
                if "entryp" in self:
                    row.prop_search(self.variables_names["roz"], "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = "")
                else:
                    row.label(no_var_source_msg)
            row.prop(self.bools["roz"], "bool", text = _("Variable"))

            col.label(_("Scale:"))
            row = col.row(align=True)
            if not self.bools["sc"].bool:
                row.prop(self.floats["sc"], "float", text = "")
            else:
                if "entryp" in self:
                    row.prop_search(self.variables_names["sc"], "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = "")
                else:
                    row.label(no_var_source_msg)
            row.prop(self.bools["sc"], "bool", text = _("Variable"))

            col.label(_("Duration:"))
            row = col.row(align=True)
            if not self.bools["dur"].bool:
                row.prop(self.durations["dur"], "float", text = "")
            else:
                if "entryp" in self:
                    row.prop_search(self.variables_names["dur"], "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = "")
                else:
                    row.label(no_var_source_msg)
            row.prop(self.bools["dur"], "bool", text = _("Variable"))

        elif slot.type == "SET_CAMERA_MOVE_STYLE":
            self.draw_selector(col, 0, _("Camera:"), None, "ob", icon="OUTLINER_OB_CAMERA")
            col.label(_("New Camera Move Style:"))
            col.prop(self, "param_camera_move_style", text="")
            row = col.row(align=True)

            if self.param_camera_move_style in ["EYE", "HOVER", "TARGET"]:
                col.label(_("Velocities:"))
                row = col.row()
                if not self.bools["vtr"].bool:
                    row.prop(self.velocities["vtr"], "float", text = _("Translation"))
                else:
                    if "entryp" in self:
                        row.prop_search(self.variables_names["vtr"], "variable",
                                        self.id_data.nodes[self["entryp"]], "variables", text = "")
                    else:
                        row.label(no_var_source_msg)
                row.prop(self.bools["vtr"], "bool", text = _("Variable"))
                row = col.row()
                if not self.bools["vro"].bool:
                    row.prop(self.velocities["vro"], "float", text = _("Rotation"))
                else:
                    if "entryp" in self:
                        row.prop_search(self.variables_names["vro"], "variable",
                                        self.id_data.nodes[self["entryp"]], "variables", text = "")
                    else:
                        row.label(no_var_source_msg)
                row.prop(self.bools["vro"], "bool", text = _("Variable"))
                row = col.row()

            if self.param_camera_move_style in ["HOVER", "TARGET"]:
                if not self.bools["vzo"].bool:
                    row.prop(self.velocities["vzo"], "float", text = _("Zoom"))
                else:
                    if "entryp" in self:
                        row.prop_search(self.variables_names["vzo"], "variable",
                                        self.id_data.nodes[self["entryp"]], "variables", text = "")
                    else:
                        row.label(no_var_source_msg)
                row.prop(self.bools["vzo"], "bool", text = _("Variable"))
                row = col.row()

            # pivot
                lbl = 'Pivot:' if self.param_camera_move_style == "HOVER" else "Target:"
                col.label(_(lbl))
                row = col.row()
                row.prop(self.bools["pvo"], "bool", text = _("Use Object"))
                row = col.row()
                if self.bools["pvo"].bool:
                    self.draw_selector(col, 1, "", None, "ob")
                else:
                    if not self.bools["pvx"].bool:
                        row.prop(self.floats["pvx"], "float", text = _("x"))
                    else:
                        if "entryp" in self:
                            row.prop_search(self.variables_names["pvx"], "variable",
                                            self.id_data.nodes[self["entryp"]], "variables", text = "")
                        else:
                            row.label(no_var_source_msg)
                    row.prop(self.bools["pvx"], "bool", text = _("Variable"))
                    row = col.row()

                    if not self.bools["pvy"].bool:
                        row.prop(self.floats["pvy"], "float", text = _("y"))
                    else:
                        if "entryp" in self:
                            row.prop_search(self.variables_names["pvy"], "variable",
                                            self.id_data.nodes[self["entryp"]], "variables", text = "")
                        else:
                            row.label(no_var_source_msg)
                    row.prop(self.bools["pvy"], "bool", text = _("Variable"))
                    row = col.row()

                    if not self.bools["pvz"].bool:
                        row.prop(self.floats["pvz"], "float", text = _("z"))
                    else:
                        if "entryp" in self:
                            row.prop_search(self.variables_names["pvz"], "variable",
                                            self.id_data.nodes[self["entryp"]], "variables", text = "")
                        else:
                            row.label(no_var_source_msg)
                    row.prop(self.bools["pvz"], "bool", text = _("Variable"))

        elif slot.type == "SET_CAMERA_LIMITS":
            self.draw_selector(col, 0, _("Camera:"), None, "ob", icon="OUTLINER_OB_CAMERA")

            # col.label(_("Distance Limits:"))
            row = col.row(align=True)
            row.prop(self.bools["dsl"], "bool", text = _("Distance Limits:"))
            if self.bools["dsl"].bool:
                row = col.row(align=True)
                row.prop(self.floats["dslmin"], "float", text = _("Min"))
                row.prop(self.floats["dslmax"], "float", text = _("Max"))

            row = col.row(align=True)
            row.prop(self.bools["hrl"], "bool", text = _("Hor. Rotation Limits:"))
            if self.bools["hrl"].bool:
                row = col.row(align=True)
                row.prop(self.angles["hrlleft"], "float", text = _("Left"))
                row.prop(self.angles["hrlright"], "float", text = _("Right"))
                row = col.row(align=True)
                col.prop(self, "param_cam_lim_hor_rot_space_type", text="Space")

            row = col.row(align=True)
            row.prop(self.bools["vrl"], "bool", text = _("Vert. Rotation Limits:"))
            if self.bools["vrl"].bool:
                row = col.row(align=True)
                row.prop(self.angles["vrldown"], "float", text = _("Down"))
                row.prop(self.angles["vrlup"], "float", text = _("Up"))
                row = col.row(align=True)
                col.prop(self, "param_cam_lim_vert_rot_space_type", text="Space")

            row = col.row(align=True)
            row.prop(self.bools["pvl"], "bool", text = _("Pivot Translation Limits:"))
            if self.bools["pvl"].bool:
                row = col.row(align=True)
                row.prop(self.floats["pvlmin"], "float", text = _("Min"))
                row.prop(self.floats["pvlmax"], "float", text = _("Max"))

            row = col.row(align=True)
            row.prop(self.bools["htl"], "bool", text = _("Hor. Translation Limits:"))
            if self.bools["htl"].bool:
                row = col.row(align=True)
                row.prop(self.floats["htlmin"], "float", text = _("Min"))
                row.prop(self.floats["htlmax"], "float", text = _("Max"))

            row = col.row(align=True)
            row.prop(self.bools["vtl"], "bool", text = _("Vert. Translation Limits:"))
            if self.bools["vtl"].bool:
                row = col.row(align=True)
                row.prop(self.floats["vtlmin"], "float", text = _("Min"))
                row.prop(self.floats["vtlmax"], "float", text = _("Max"))

        elif slot.type in ["SPEAKER_PLAY", "SPEAKER_STOP"]:
            self.draw_selector(col, 0, _("Speaker:"), None, "ob", icon = "OUTLINER_OB_SPEAKER")
            if slot.type == "SPEAKER_PLAY":
                col.prop(slot.bools["not_wait"], "bool", text="Do Not Wait")

        elif slot.type == "SWITCH_SELECT":
            for id in self.objects_paths:
                index = id.name[2:]
                self.draw_selector(col, index, _("Object:"), None, "ob")

        elif slot.type == "CONSOLE_PRINT":
            if "msg" in self.common_usage_names:
                col.prop(self.common_usage_names["msg"], "str", text="Message")
            for var in self.variables_names:
                row = col.row()
                if "entryp" in self:
                    row.prop_search(var, "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = "")
                else:
                    row.label(no_var_source_msg)
                op = row.operator(OperatorLogicConsolePrintRemoveVar.bl_idname,  icon='ZOOMOUT', text="")
                op.node_tree = self.id_data.name
                op.node = self.name
                op.var = var.name
            op = col.operator(OperatorLogicConsolePrintAddVar.bl_idname,  icon='ZOOMIN', text="")
            op.node_tree = self.id_data.name
            op.node = self.name

        elif slot.type == "STRING":
            col.prop(self, "param_string_operation", text=_("Operation"))
            if self.param_string_operation == "COMPARE":
                row = col.row()
                col.prop(self, "param_condition", text = _("Condition"))
            for i in range(2):
                col.label("Operand%s"%str(i+1))
                row = col.row(align=True)
                if not self.bools["id%s"%i].bool:
                    col.prop(self.strings["id%s"%i], "string", text = "")
                else:
                    if "entryp" in self:
                        row.prop_search(self.variables_names["id%s"%i], "variable",
                                self.id_data.nodes[self["entryp"]], "variables", text = "")
                    else:
                        row.label(no_var_source_msg)
                col.prop(self.bools["id%s"%i], "bool", text = _("Variable"))
            if self.param_string_operation == "REPLACE":
                col.label("Operand3")
                row = col.row(align=True)
                if not self.bools["id2"].bool:
                    col.prop(self.strings["id2"], "string", text = "")
                else:
                    if "entryp" in self:
                        row.prop_search(self.variables_names["id2"], "variable",
                                self.id_data.nodes[self["entryp"]], "variables", text = "")
                    else:
                        row.label(no_var_source_msg)
                col.prop(self.bools["id2"], "bool", text = _("Variable"))
            col.label("Destination")
            row = col.row(align=True)
            if "entryp" in self:
                row.prop_search(self.variables_names["dst"], "variable",
                                self.id_data.nodes[self["entryp"]], "variables", text = "")
            else:
                row.label(no_var_source_msg)
            if self.param_string_operation == "SPLIT":
                col.label("Destination2")
                row = col.row(align=True)
                if "entryp" in self:
                    row.prop_search(self.variables_names["dst1"], "variable",
                                self.id_data.nodes[self["entryp"]], "variables", text = "")
                else:
                    row.label(no_var_source_msg)

        elif slot.type == "GET_TIMELINE":
            row = col.row()
            row.prop(self.bools["nla"], "bool", text = _("NLA Timeline"))
            col.label("Destination:")
            row = col.row(align=True)
            if "entryp" in self:
                row.prop_search(self.variables_names["vd"], "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = "")
            else:
                row.label(no_var_source_msg)

        elif slot.type == "JSON":
            row = col.row()
            if "entryp" in self:
                row.prop_search(self.variables_names["jsn"], "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = "JSON")
            else:
                row.label(no_var_source_msg)
            row = col.row()
            row.prop(self, "param_json_operation")

            row = col.row()
            split = row.split()
            if self.param_json_operation == "PARSE":
                col = split.column()
                col.label("Paths:")
                col.template_list("B4W_ParseRespPathUIList", "", slot, "parse_json_list",
                              slot, "parse_json_list_active_index", rows=3)
                col = split.column()
                col.label("Variables:")
                col.template_list("B4W_ParseRespUIList", "", slot, "parse_json_list",
                              slot, "parse_json_list_active_index", rows=3)
                col = row.column(align=True)
                col.label("")
                col.scale_x = 0.1
                op = col.operator("node.b4w_logic_parse_json_list_add", icon='ZOOMIN', text="")
                op.node_tree = self.id_data.name
                op.node = self.name
                op.list_id = "parse"
                op = col.operator("node.b4w_logic_parse_json_list_remove", icon='ZOOMOUT', text="")
                op.node_tree = self.id_data.name
                op.node = self.name
                op.list_id = "parse"
            else:
                col = split.column()
                col.label("Paths:")
                col.template_list("B4W_ParseRespPathUIList", "", slot, "encode_json_list",
                              slot, "encode_json_list_active_index", rows=3)
                col = split.column()
                col.label("Variables:")
                col.template_list("B4W_ParseRespUIList", "", slot, "encode_json_list",
                              slot, "encode_json_list_active_index", rows=3)
                col = row.column(align=True)
                col.label("")
                col.scale_x = 0.1
                op = col.operator("node.b4w_logic_parse_json_list_add", icon='ZOOMIN', text="")
                op.node_tree = self.id_data.name
                op.node = self.name
                op.list_id = "encode"
                op = col.operator("node.b4w_logic_parse_json_list_remove", icon='ZOOMOUT', text="")
                op.node_tree = self.id_data.name
                op.node = self.name
                op.list_id = "encode"

        elif slot.type == "JS_CALLBACK":
            col.label(_("Callback ID:"))
            row = col.row()
            if not self.bools["cb"].bool:
                row.prop(self.strings["cb"], "string", text ="")
            else:
                if "entryp" in self:
                    row.prop_search(self.variables_names["cb"], "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = "")
                else:
                    row.label(no_var_source_msg)
            row.prop(self.bools["cb"], "bool", text = _("Variable"))
            col.label("In Params:")
            row = col.row()

            keys = (param.name for param in self.variables_names if param.name[:2] == "id")
            for key in keys:
                index = key[2:]
                if self.js_cb_params[key].type == "OBJECT":
                    self.draw_selector(row, index, str(index) + ":", None, "ob")
                else:
                    if "entryp" in self:
                        row.prop_search(self.variables_names[key], "variable",
                                        self.id_data.nodes[self["entryp"]], "variables", text = str(index))
                    else:
                        row.label(no_var_source_msg)
                row.prop(self.js_cb_params[key], "type", text="")
                op = row.operator("node.b4w_js_cb_param_remove", icon='ZOOMOUT', text="")
                op.node_tree = self.id_data.name
                op.node = self.name
                op.list_id = "in"
                op.param_key = key
                row = col.row()

            row = col.row()
            op = col.operator("node.b4w_js_cb_param_add", icon='ZOOMIN', text="")
            op.node_tree = self.id_data.name
            op.node = self.name
            op.list_id = "in"

            col.label("Out Params:")
            row = col.row()
            keys = (param.name for param in self.variables_names if param.name[:3] == "out")
            for key in keys:
                index = key[3:]
                if "entryp" in self:
                    row.prop_search(self.variables_names[key], "variable",
                                    self.id_data.nodes[self["entryp"]], "variables", text = str(index))
                else:
                    row.label(no_var_source_msg)
                op = row.operator("node.b4w_js_cb_param_remove", icon='ZOOMOUT', text="")
                op.node_tree = self.id_data.name
                op.node = self.name
                op.list_id = "out"
                op.param_key = key
                row = col.row()

            row = col.row()
            op = col.operator("node.b4w_js_cb_param_add", icon='ZOOMIN', text="")
            op.node_tree = self.id_data.name
            op.node = self.name
            op.list_id = "out"

        elif slot.type == "ENTRYPOINT":
            col.prop(self.bools["js"], "bool", text = _("Run From Script"))

    def draw_label(self):
        for t in slot_type_enum:
            if t[0] == self.type:
                B4W_LogicNode._label_tmp = bpy.app.translations.pgettext_iface(t[1])
                return B4W_LogicNode._label_tmp
        return _("Logic Node")

class B4W_LogicNodeCategory(NodeCategory):
    @classmethod
    def poll(cls, context):
        return context.space_data.tree_type == 'B4WLogicNodeTreeType'

node_categories = [
    B4W_LogicNodeCategory("Control Flow", _("Control Flow"), items=[
        NodeItem("B4W_logic_node", label=_("Entry Point"),settings={"type": repr("ENTRYPOINT")}),
        NodeItem("B4W_logic_node", label=_("Switch Select"),settings={"type": repr("SWITCH_SELECT")}),
        NodeItem("B4W_logic_node", label=_("Delay"),settings={"type": repr("DELAY")}),
        #NodeItem("B4W_logic_node", label=_("Jump"),settings={"type": repr("JUMP")}),
        NodeItem("B4W_logic_node", label=_("Conditional Jump"),settings={"type": repr("CONDJUMP")}),
        NodeItem("B4W_logic_node", label=_("JS Callback"),settings={"type": repr("JS_CALLBACK")}),
    ]),
    B4W_LogicNodeCategory("Animation", _("Animation"), items=[
        NodeItem("B4W_logic_node", label=_("Play Timeline"),settings={"type": repr("PLAY")}),
        NodeItem("B4W_logic_node", label=_("Stop Timeline"),settings={"type": repr("STOP_TIMELINE")}),
        NodeItem("B4W_logic_node", label=_("Get Timeline"),settings={"type": repr("GET_TIMELINE")}),
        NodeItem("B4W_logic_node", label=_("Play Animation"),settings={"type": repr("PLAY_ANIM")}),
        NodeItem("B4W_logic_node", label=_("Stop Animation"),settings={"type": repr("STOP_ANIM")}),
    ]),
    B4W_LogicNodeCategory("Camera", _("Camera"), items=[
        NodeItem("B4W_logic_node", label=_("Move Camera"),settings={"type": repr("MOVE_CAMERA")}),
        NodeItem("B4W_logic_node", label=_("Set Camera Move Style"),settings={"type": repr("SET_CAMERA_MOVE_STYLE")}),
        NodeItem("B4W_logic_node", label=_("Set Camera Limits"),settings={"type": repr("SET_CAMERA_LIMITS")}),
    ]),
    B4W_LogicNodeCategory("Object", _("Object"), items=[
        NodeItem("B4W_logic_node", label=_("Show Object"),settings={"type": repr("SHOW")}),
        NodeItem("B4W_logic_node", label=_("Hide Object"),settings={"type": repr("HIDE")}),
        NodeItem("B4W_logic_node", label=_("Transform Object"),settings={"type": repr("TRANSFORM_OBJECT")}),
        NodeItem("B4W_logic_node", label=_("Move To"),settings={"type": repr("MOVE_TO")}),
        NodeItem("B4W_logic_node", label=_("Apply Shape Key"),settings={"type": repr("APPLY_SHAPE_KEY")}),
        NodeItem("B4W_logic_node", label=_("Outline"),settings={"type": repr("OUTLINE")}),
        NodeItem("B4W_logic_node", label=_("Set Shader Node Param"),settings={"type": repr("SET_SHADER_NODE_PARAM")}),
        NodeItem("B4W_logic_node", label=_("Inherit Material"),settings={"type": repr("INHERIT_MAT")}),
    ]),
    B4W_LogicNodeCategory("Operations", _("Operations"), items=[
        NodeItem("B4W_logic_node", label=_("Variable Store"),settings={"type": repr("REGSTORE")}),
        NodeItem("B4W_logic_node", label=_("Math Operation"),settings={"type": repr("MATH")}),
        NodeItem("B4W_logic_node", label=_("String Operation"),settings={"type": repr("STRING")}),
    ]),
    B4W_LogicNodeCategory("Sound", _("Sound"), items=[
        NodeItem("B4W_logic_node", label=_("Play Sound"),settings={"type": repr("SPEAKER_PLAY")}),
        NodeItem("B4W_logic_node", label=_("Stop Sound"),settings={"type": repr("SPEAKER_STOP")}),
    ]),
    B4W_LogicNodeCategory("Network", _("Network"), items=[
        NodeItem("B4W_logic_node", label=_("Send Request"),settings={"type": repr("SEND_REQ")}),
        NodeItem("B4W_logic_node", label=_("JSON"),settings={"type": repr("JSON")}),
        NodeItem("B4W_logic_node", label=_("Page Param"),settings={"type": repr("PAGEPARAM")}),
        NodeItem("B4W_logic_node", label=_("Page Redirect"),settings={"type": repr("REDIRECT")}),
    ]),
    B4W_LogicNodeCategory("Debug", _("Debug"), items=[
        NodeItem("B4W_logic_node", label=_("Console Print"),settings={"type": repr("CONSOLE_PRINT")})
    ]),
    # B4W_LogicNodeCategory("Deprecared", _("Deprecated"), items=[
    #     #NodeItem("B4W_logic_node", label=_("Select (Deprecated)"),settings={"type": repr("SELECT")}),
    #     #NodeItem("B4W_logic_node", label=_("Select & Play Timeline (Deprecated)"),settings={"type": repr("SELECT_PLAY")}),
    #     #NodeItem("B4W_logic_node", label=_("Select & Play Animation (Deprecated)"),settings={"type": repr("SELECT_PLAY_ANIM")}),
    # ]),
    B4W_LogicNodeCategory("Layout", _("Layout"), items=[
        NodeItem("NodeFrame"),
        NodeItem("NodeReroute"),
        NodeItem("B4W_logic_node", label=_("Empty"),settings={"type": repr("EMPTY")}),
    ])
    ]


def get_link_by_TO_socket(ntree, socket):
    for l in ntree.links:
        if socket == l.to_socket:
            return l
    return None

def get_link_by_FROM_socket(ntree, socket):
    for l in ntree.links:
        if socket == l.from_socket:
            return l
    return None

def link_get_forward_target(ntree, link):
    if not link:
        return None
    n = link.to_node
    if n.bl_idname == "NodeReroute":
        s = n.outputs[0]
        l = get_link_by_FROM_socket(ntree,s)
        if l:
            return link_get_forward_target(ntree, l)
        else:
            return None
    else:
        return n, link.to_socket

def link_get_backward_target(ntree, link):
    n = link.from_node
    if n.bl_idname == "NodeReroute":
        s = n.inputs[0]
        l = get_link_by_TO_socket(ntree,s)
        if l:
            return link_get_backward_target(ntree, l)
        else:
            return None
    else:
        return n, link.from_socket

def check_nodes(ntree):
    for n in ntree.nodes:
        if n.bl_idname == "B4W_logic_node":
            if not check_node(n):
                for m in n.error_messages.prop_err:
                    return False
    return True

def check_entry_point(ntree):
    err = False
    arr = []
    for n in ntree.nodes:
        if n.bl_idname == "B4W_logic_node":
            if n.type == "ENTRYPOINT":
                arr.append(n)

    if len(arr) == 0:
        for n in ntree.nodes:
            if n.bl_idname == "B4W_logic_node":
                n.add_error_message(n.error_messages.link_err, _("Entry Point node is not found!"))

    return arr

def check_conn(ntree, node, connected):
    if node.bl_idname == "B4W_logic_node":
        for s in node.outputs:
            if s.is_linked:
                r = get_target_input_node(ntree,s)
                if r:
                    n,s = r
                    if not n in connected:
                        connected.append(n)
                        check_conn(ntree, n, connected)

def check_connectivity(ntree, entrypoints):
    if len(ntree.nodes) == 0:
        if "errors" not in ntree:
            ntree["errors"] = []
        ntree.append((ntree.name, _("Node tree is empty!")))
        return False

    for n in ntree.nodes:
        if n.bl_idname == "B4W_logic_node":
            if "Order_Input_Socket" in n.inputs:
                if n.inputs["Order_Input_Socket"].is_linked == False:
                    n.add_error_message(n.error_messages.link_err, _("Input is not connected!"))
    subtrees = {}
    ntree["subtrees"] = {}
    for ep in entrypoints:
        connected = [ep]
        check_conn(ntree, ep, connected)
        subtrees[ep] = connected
        a = []
        for n in connected:
            n["entryp"] = ep.name
            a.append(n.name)
        ntree["subtrees"][ep.name] = a

    for n in ntree.nodes:
        if n.bl_idname == "B4W_logic_node":
            not_connected = n
            for st in subtrees.values():
                if n in st:
                    not_connected = None
            if not_connected:
                if "entryp" in n:
                    del n["entryp"]
                n.add_error_message(n.error_messages.link_err, _("No path from Entry point!"))
    # check subtrees overlap
    arr = []
    for st in subtrees.values():
        for n in st:
            if n in arr:
                n.add_error_message(n.error_messages.link_err, _("Subtrees overlapping is not allowed!"))
            else:
                arr.append(n)

    return subtrees.values()

def check_tree(ntree):
    subtrees = None
    entrypoints = check_entry_point(ntree)
    if entrypoints:
        subtrees = check_connectivity(ntree, entrypoints)
    check_nodes(ntree)
    return subtrees

def clear_links_err(ntree):
    for n in ntree.nodes:
        if n.bl_idname == "B4W_logic_node":
            n.error_messages.link_err.clear()

def get_target_input_node(ntree, socket):
    l = get_link_by_FROM_socket(ntree, socket)
    return link_get_forward_target(ntree, l)

class OperatorMuteNode(bpy.types.Operator):
    bl_idname = "node.b4w_logic_node_mute_toggle"
    bl_label = p_("Toggle Node Mute", "Operator")
    bl_options = {"INTERNAL"}
    def invoke(self, context, event):
        done = False
        for area in bpy.context.screen.areas:
            if area.type == "NODE_EDITOR":
                for s in area.spaces:
                    if s.type == "NODE_EDITOR":
                        if s.tree_type == "B4WLogicNodeTreeType":
                            for n in s.node_tree.nodes:
                                if n.bl_idname == "B4W_logic_node" and n.select:
                                    n.mute = not n.mute
                                    done = True
                                    # there is no API for internal_links yet
                                    # if n.mute:
                                    #     n.internal_links.new((n.inputs["Order_Input_Socket"],
                                    #                           n.outputs["Order_Output_Socket"]))
                                    # else:
                                    #     n.internal_links.clear()

                                    # trick to force update node after mute setting
                                    n.location = n.location
        if not done:
            bpy.ops.node.mute_toggle()

        return {'FINISHED'}

def force_update_variables(nodetree):
    # for example if variable source node name changed
    # we must recalculate tree["subtrees"]
    entrypoints = check_entry_point(nodetree)
    if entrypoints:
        check_connectivity(nodetree, entrypoints)
    tree_vars_update(nodetree)

class OperatorLogicParseJsonListAdd(bpy.types.Operator):
    bl_idname = "node.b4w_logic_parse_json_list_add"
    bl_label = p_("Parse json list add item", "Operator")
    node_tree = bpy.props.StringProperty(
        name = _("Node tree"),
    )
    node = bpy.props.StringProperty(
        name = _("Node name"),
    )
    list_id = bpy.props.StringProperty(
        name = "Node name",
        default = "parse"
    )
    def invoke(self, context, event):
        def gen_var_name(list):
            ind = 0
            while (True):
                old_ind = ind
                for s in list:
                    if s.name == "var" + str(ind):
                        ind+=1
                if old_ind == ind:
                    break
            return "var" + str(ind)
        for nodetree in bpy.data.node_groups:
            if nodetree.name == self.node_tree:
                for node in nodetree.nodes:
                    if node.name == self.node:
                        if self.list_id == "parse":
                            node.parse_json_list.add()
                            new_name = gen_var_name(node.parse_json_list)
                            node.parse_json_list[-1].name = new_name
                            node.parse_json_list[-1].path = new_name
                            node.parse_json_list[-1].tree_name = self.node_tree
                            node.parse_json_list[-1].node_name = node.name
                            force_update_variables(nodetree)
                        else:
                            node.encode_json_list.add()
                            new_name = gen_var_name(node.encode_json_list)
                            node.encode_json_list[-1].name = new_name
                            node.encode_json_list[-1].path = new_name
                            node.encode_json_list[-1].tree_name = self.node_tree
                            node.encode_json_list[-1].node_name = node.name

        return {'FINISHED'}

def index_by_key(coll, key):
    i = 0
    for k in coll:
        if k.name == key:
            return i
        i += 1
    return -1

class OperatorLogicRemoveDynJumpSock(bpy.types.Operator):
    bl_idname = "node.b4w_logic_remove_dyn_jump_sock"
    bl_label = p_("Remove dynamic jump socket", "Operator")
    node_tree = bpy.props.StringProperty(
        name = _("Node tree"),
    )
    node = bpy.props.StringProperty(
        name = _("Node name"),
    )
    sock = bpy.props.StringProperty(
        name = _("Socket name"),
    )
    def invoke(self, context, event):
        for nodetree in bpy.data.node_groups:
            if nodetree.name == self.node_tree:
                for node in nodetree.nodes:
                    if node.name == self.node:
                        for s in node.outputs:
                            if s.name == self.sock:
                                ind = index_by_key(node.objects_paths, s.name)
                                node.objects_paths.remove(ind)
                                node.outputs.remove(s)
        return {'FINISHED'}

def sock_pos_by_name(sockets, name):
    for i in range(len(sockets)):
        if sockets[i].name == name:
            return i
    return -1

class OperatorLogicConsolePrintAddVar(bpy.types.Operator):
    bl_idname = "node.b4w_logic_console_print_add_var"
    bl_label = p_("Add new variable", "Operator")
    node_tree = bpy.props.StringProperty(
        name = _("Node tree"),
    )
    node = bpy.props.StringProperty(
        name = _("Node name"),
    )
    def invoke(self, context, event):
        for nodetree in bpy.data.node_groups:
            if nodetree.name == self.node_tree:
                for node in nodetree.nodes:
                    if node.name == self.node:
                        cnt = 0
                        while (True):
                            old_cnt = cnt
                            for p in node.variables_names:
                                if p.name == "id" + str(cnt):
                                    cnt+=1
                            if old_cnt == cnt:
                                break

                        name = "id"+str(cnt)
                        node.variables_names.add()
                        node.variables_names[-1].name = name
                        check_node(node)
                        return{'FINISHED'}

        return {'FINISHED'}

class OperatorLogicConsolePrintRemoveVar(bpy.types.Operator):
    bl_idname = "node.b4w_logic_console_print_remove_var"
    bl_label = p_("Remove variable", "Operator")
    node_tree = bpy.props.StringProperty(
        name = _("Node tree"),
    )
    node = bpy.props.StringProperty(
        name = _("Node name"),
    )
    var = bpy.props.StringProperty(
        name = _("var id"),
    )
    def invoke(self, context, event):
        for nodetree in bpy.data.node_groups:
            if nodetree.name == self.node_tree:
                for node in nodetree.nodes:
                    if node.name == self.node:
                        ind = index_by_key(node.variables_names, self.var)
                        node.variables_names.remove(ind)
                        check_node(node)
                        return{'FINISHED'}

        return {'FINISHED'}

class OperatorLogicAddDynJumpSock(bpy.types.Operator):
    bl_idname = "node.b4w_logic_add_dyn_jump_sock"
    bl_label = p_("Add dynamic jump socket", "Operator")
    node_tree = bpy.props.StringProperty(
        name = _("Node tree"),
    )
    node = bpy.props.StringProperty(
        name = _("Node name"),
    )
    sock = bpy.props.StringProperty(
        name = _("Socket name"),
    )
    def invoke(self, context, event):
        for nodetree in bpy.data.node_groups:
            if nodetree.name == self.node_tree:
                for node in nodetree.nodes:
                    if node.name == self.node:
                        for s in node.outputs:
                            if s.name == self.sock:
                                coll = node.objects_paths
                                cnt = 0
                                while (True):
                                    old_cnt = cnt
                                    for p in coll:
                                        if p.name == "id" + str(cnt):
                                            cnt+=1
                                    if old_cnt == cnt:
                                        break

                                p = node.objects_paths.add()
                                name = "id"+str(cnt)
                                p.name = name
                                s = node.outputs.new("SlotOrderSocketType", name)
                                s.link_limit = 1
                                s.type = "DynOutputJump"
                                ind = sock_pos_by_name(node.outputs, "Jump_Dummy_Output_Socket")
                                node.outputs.move(ind, len(node.outputs)-1)
                                ind = sock_pos_by_name(node.outputs, "Order_Output_Socket")
                                node.outputs.move(ind, len(node.outputs)-1)
                                return{'FINISHED'}

        return {'FINISHED'}

class OperatorLogicParseJsonListRemove(bpy.types.Operator):
    bl_idname = "node.b4w_logic_parse_json_list_remove"
    bl_label = p_("Parse json list remove item", "Operator")
    node_tree = bpy.props.StringProperty(
        name = "Node tree",
    )
    node = bpy.props.StringProperty(
        name = "Node name",
    )
    list_id = bpy.props.StringProperty(
        name = "Node name",
        default = "parse"
    )
    def invoke(self, context, event):
        for nodetree in bpy.data.node_groups:
            if nodetree.name == self.node_tree:
                for node in nodetree.nodes:
                    if node.name == self.node:
                        if self.list_id == "parse":
                            node.parse_json_list.remove(node.parse_json_list_active_index)
                            force_update_variables(nodetree)
                        else:
                            node.encode_json_list.remove(node.encode_json_list_active_index)

        return {'FINISHED'}

class OperatorLogicNodesEditObjectItemLevel(bpy.types.Operator):
    bl_idname = "node.b4w_logic_edit_object_item_level"
    bl_label = p_("Edit object item level", "Operator")
    node_tree = bpy.props.StringProperty(
        name = _("Node tree"),
    )
    node = bpy.props.StringProperty(
        name = _("Node name"),
    )
    item = bpy.props.StringProperty(
        name = _("Item name"),
    )
    type = bpy.props.StringProperty(
        name = _("Item type"),
    )
    reverse = bpy.props.BoolProperty(
        name = _("reverse"),
        description = _("Delete dir if true"),
        default = False,
    )
    def invoke(self, context, event):
        def make_path(arr):
            path = ""
            for s in arr:
                split = ""
                if path != "":
                    split = ">"
                path = path + split + s.name
            return path
        for nodetree in bpy.data.node_groups:
            if nodetree.name == self.node_tree:
                for node in nodetree.nodes:
                    if node.name == self.node:
                        if self.type == "ob":
                            item = node.objects_paths[self.item]
                            if not self.reverse:
                                if item.cur_dir == "":
                                    return {'FINISHED'}
                                item.path_arr.add()
                                item.path_arr[-1].name = str(item.cur_dir)
                                ob = object_by_bpy_collect_path(bpy.data.objects, item.path_arr)
                                if not ob:
                                    item.path_arr.remove(len(item.path_arr) - 1)
                                item.path = make_path(item.path_arr)
                                item.cur_dir = ""
                            else:
                                if len(item.path_arr):
                                    item.path_arr.remove(len(item.path_arr) - 1)
                                    item.path = make_path(item.path_arr)
                                    item.cur_dir = ""
                            ob = object_by_bpy_collect_path(bpy.data.objects, item.path_arr)
                            if ob and ob.dupli_group:
                                if len(ob.dupli_group.objects):
                                    item.cur_dir = ob.dupli_group.objects[0].name
                            else:
                                item.cur_dir = ""
                        elif self.type == "nd":
                            nd_item = node.nodes_paths[self.item]
                            ob_item = node.objects_paths[self.item]
                            mt_item = node.materials_names[self.item]
                            if not self.reverse:
                                if nd_item.cur_dir == "":
                                    return {'FINISHED'}
                                nd_item.path_arr.add()
                                nd_item.path_arr[-1].name = str(nd_item.cur_dir)
                                nd = node_by_ob_mt_nd(ob_item, mt_item, nd_item)
                                if not nd:
                                    nd_item.path_arr.remove(len(nd_item.path_arr) - 1)
                                nd_item.path = make_path(nd_item.path_arr)
                                nd_item.cur_dir = ""
                            else:
                                if len(nd_item.path_arr):
                                    nd_item.path_arr.remove(len(nd_item.path_arr) - 1)
                                    nd_item.path = make_path(nd_item.path_arr)
                                    nd_item.cur_dir = ""
                            nd = node_by_ob_mt_nd(ob_item, mt_item, nd_item)
                            if nd:
                                if hasattr(nd, "node_tree"):
                                    if len(nd.node_tree.nodes):
                                        nd_item.cur_dir = nd.node_tree.nodes[0].name
                            else:
                                nd_item.cur_dir = ""
        return {'FINISHED'}

class OperatorLogicJSCallbackParamAdd(bpy.types.Operator):
    bl_idname = "node.b4w_js_cb_param_add"
    bl_label = p_("JS callback params add item", "Operator")
    node_tree = bpy.props.StringProperty(
        name = _("Node tree"),
    )
    node = bpy.props.StringProperty(
        name = _("Node name"),
    )
    list_id = bpy.props.StringProperty(
        name = "Node name",
        default = "in"
    )
    def invoke(self, context, event):
        for nodetree in bpy.data.node_groups:
            if nodetree.name == self.node_tree:
                for node in nodetree.nodes:
                    if node.name == self.node:
                        if self.list_id == "in":
                            coll = node.objects_paths
                            cnt = 0
                            for p in coll:
                                if p.name == "id" + str(cnt):
                                    cnt+=1

                            name = "id"+str(cnt)
                            p = node.objects_paths.add()
                            p.name = name
                            p = node.variables_names.add()
                            p.name = name
                            p = node.js_cb_params.add()
                            p.name = name

                            return{'FINISHED'}
                        elif self.list_id == "out":
                            coll = node.variables_names
                            cnt = 0
                            for p in coll:
                                if p.name == "out" + str(cnt):
                                    cnt+=1

                            name = "out"+str(cnt)
                            p = node.variables_names.add()
                            p.name = name

                            return{'FINISHED'}
        return {'FINISHED'}

class OperatorLogicJSCallbackParamRemove(bpy.types.Operator):
    bl_idname = "node.b4w_js_cb_param_remove"
    bl_label = p_("JS callback params remove item", "Operator")
    node_tree = bpy.props.StringProperty(
        name = "Node tree",
    )
    node = bpy.props.StringProperty(
        name = "Node name",
    )
    list_id = bpy.props.StringProperty(
        name = "Node name",
        default = "in"
    )
    param_key= bpy.props.StringProperty(
        name = "Node name",
    )
    def invoke(self, context, event):
        def shift_coll_keys(coll_generator, prefix):
            i = 0
            for param in coll_generator:
                param.name = prefix + str(i)
                i += 1

        for nodetree in bpy.data.node_groups:
            if nodetree.name == self.node_tree:
                for node in nodetree.nodes:
                    if node.name == self.node:
                        if self.list_id == "in":
                            ind = index_by_key(node.objects_paths, self.param_key)
                            node.objects_paths.remove(ind)
                            ind = index_by_key(node.variables_names, self.param_key)
                            node.variables_names.remove(ind)
                            ind = index_by_key(node.js_cb_params, self.param_key)
                            node.js_cb_params.remove(ind)
                            #correct indexes in collections
                            in_coll = (param for param in node.objects_paths if param.name[:2] == "id")
                            shift_coll_keys(in_coll, "id")
                            in_coll = (param for param in node.variables_names if param.name[:2] == "id")
                            shift_coll_keys(in_coll, "id")
                            in_coll = (param for param in node.js_cb_params if param.name[:2] == "id")
                            shift_coll_keys(in_coll, "id")

                            return{'FINISHED'}
                        elif self.list_id == "out":
                            ind = index_by_key(node.variables_names, self.param_key)
                            node.variables_names.remove(ind)
                            #correct indexes in collections
                            out_coll = (param for param in node.variables_names if param.name[:3] == "out")
                            shift_coll_keys(out_coll, "out")

                            return{'FINISHED'}
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(OperatorMuteNode.bl_idname)
addon_keymaps = []

def register_hotkey():
    bpy.types.NODE_MT_node.append(menu_func)

    # handle the keymap
    wm = bpy.context.window_manager
    # if running not in background
    if wm.keyconfigs:
        km = wm.keyconfigs.addon.keymaps.new(name='Node Editor', space_type='NODE_EDITOR')
        kmi = km.keymap_items.new(OperatorMuteNode.bl_idname, 'M', 'PRESS')
        addon_keymaps.append(km)

def unregister_hotkey():
    bpy.types.NODE_MT_node.remove(menu_func)

    # handle the keymap
    wm = bpy.context.window_manager
    if wm.keyconfigs:
        for km in addon_keymaps:
            wm.keyconfigs.addon.keymaps.remove(km)
        # clear the list
        del addon_keymaps[:]

def register():
    nodeitems_utils.register_node_categories("B4W_LOGIC_CUSTOM_NODES", node_categories)
    register_hotkey()

def unregister():
    nodeitems_utils.unregister_node_categories("B4W_LOGIC_CUSTOM_NODES")
    unregister_hotkey()
