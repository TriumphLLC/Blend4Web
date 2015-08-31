import copy
import bpy
from bpy.types import NodeTree, Node, NodeSocket
from bpy.props import StringProperty
import nodeitems_utils
from nodeitems_utils import NodeCategory, NodeItem
import mathutils

slot_node_joint_props = ['param_marker_start', 'param_marker_end',
             'param_register1', 'param_register2', 'param_register_dest',
             'param_number1', 'param_number2', 'param_register_flag1',
             'param_register_flag2', 'param_operation', 'param_condition',
             'param_url', 'param_name']

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

slot_type_enum = [
        ("NOOP", "Noop", "No operation", 0),
        ("PAGEPARAM", "Page Param", "Store numeric page parameter to a " +
                "register", 12),
        ("HIDE", "Hide Object", "Hide object", 11),
        ("SHOW", "Show Object", "Show bject", 10),
        ("REDIRECT", "Page Redirect", "Redirect current page to given URL", 9),
        ("MATH", "Math Operation", "Perform a math operation", 1),
        ("REGSTORE", "Register Store", "Store a value to a register", 2),
        ("CONDJUMP", "Conditional Jump", "Conditional jump", 3),
        ("JUMP", "Jump", "Jump to the slot by label", 4),
        ("SELECT_PLAY", "Select & Play", "Select an object then play", 5),
        ("SELECT", "Select & Jump", "Select an object", 6),
        ("PLAY", "Play", "Play NLA animation", 7),
        ("ENTRYPOINT", "Entry Point", "Entry Point", 8)
    ]

operation_type_enum = [
            ("DIV", "Divide", "Divide"),
            ("SUB", "Subtract", "Subtract"),
            ("MUL", "Multiply", "Multiply"),
            ("ADD", "Add", "Add")
        ]

condition_type_enum =[
            ("GEQUAL", "Greater Than or Equal (>=)", "Greater than or equal"),
            ("LEQUAL", "Less Than or Equal (<=)", "Less than or equal"),
            ("GREATER", "Greater Than (>)", "Greater than"),
            ("LESS", "Less Than (<)", "Less than"),
            ("NOTEQUAL", "Not Equal (!=)", "Not equal"),
            ("EQUAL", "Equal (=)", "Equal")
        ]

jump_socket_color = (0.0, 0.0, 1.0, 0.5)
order_socket_color = (1.0, 1.0, 0.216, 0.5)

error_color = (1.0, 0.0, 0.0)

class B4W_LogicEditorErrTextWrap(bpy.types.PropertyGroup):
    message = bpy.props.StringProperty(name="text")

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
        if not path[i] in ob.dupli_group.objects:
            return None
        ob = ob.dupli_group.objects[path[i]]
    return ob

def get_slot_type(slot):
    for t in slot_type_enum:
        if "type" in slot:
            type = slot["type"]
        else:
            # default Play
            type = 7
        if t[3] == type:
            return t[0]

class B4W_LogicNodeTree(NodeTree):
    bl_idname = 'B4WLogicNodeTreeType'
    bl_label = 'Blend4Web logic'
    bl_description = 'Blend4Web logic nodes'
    bl_icon = 'NODETREE'

    # infinite_recursion_prevent = False
    @classmethod
    def poll(self, context):
        p = context.scene.render.engine == 'BLEND4WEB'
        # This hack restores the value, but leads to the impossibility of removal of the tree, so it is disabled.
        # if p:
        #     # hack
        #     try:
        #         if self.infinite_recursion_prevent:
        #             self.infinite_recursion_prevent = False
        #             return p
        #         else:
        #             self.infinite_recursion_prevent = True
        #             # calling context.space_data.tree_type led to nodetree poll invoking
        #             # so we must prevent infinit recursion
        #             tree_type = context.space_data.tree_type
        #             if tree_type == self.bl_idname:
        #                 # saving active nodetree to avoid active tree reset after switching between different tree types
        #                 attr_name = "b4w_logic_editor_nodespace_selected_nodetree"
        #                 if not attr_name in context.window_manager:
        #                     context.window_manager[attr_name] = ""
        #                 if not context.space_data.node_tree:
        #                     if not context.window_manager[attr_name] == "":
        #                         tree_name = context.window_manager[attr_name]
        #                         if tree_name in bpy.data.node_groups:
        #                             context.space_data.node_tree = bpy.data.node_groups[tree_name]
        #                 else:
        #                     # there are cases when type is right but name is default for another trees
        #                     if context.space_data.node_tree.name not in ["Compositing Nodetree", "Shader Nodetree", "Texture Nodetree"]:
        #                         context.window_manager[attr_name] = context.space_data.node_tree.name
        #     except:
        #         pass
        return p

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

        def get_node_desc(ntree, node):
            ret = {}
            ret["type"] = node.type
            ret['label'] = node.label2
            ret['name'] = node.name
            ret['object_path'] = node.get_object_path()
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

            for p in slot_node_joint_props:
                ret[p] = getattr(node, p)
            ret["mute"] = node.mute
            return ret

        ntree = self

        self.clear_errors()
        # check syntax
        subtrees = check_tree(ntree)
        self.collect_errors()

        scripts = []
        if subtrees:
            for st in subtrees:
                scripts.append([])
                script = scripts[-1]
                for n in st:
                    script.append(get_node_desc(ntree, n))
        return (scripts, self["errors"])

    def get_node_by_label2(self, nodes, label2):
        for n in nodes:
            if n.bl_idname == "B4W_logic_node":
                if n.label2 == label2:
                    return n

    def import_slots(self, scene):
        ntree = self
        ntree.nodes.clear()
        ntree.links.clear()

        node_start_x = -1000
        node_start_y = 0

        node_x = node_start_x
        prev_node = None

        cyclic = False
        if "b4w_nla_cyclic" in scene:
            cyclic = scene["b4w_nla_cyclic"]

        # Algorithm
        # 1) make slots copy
        # 2) add order
        # 3) remove jumps
        # 4) remove noops
        # 5) make links

        def rm_jump(b4w_slots):
            for i in range(len(b4w_slots)):
                if get_slot_type(b4w_slots[i]) == "JUMP":
                    b4w_slots[i-1]["order"] = b4w_slots[i]["param_slot"]
                    for s in b4w_slots:
                        if "param_slot" in s:
                            if s["param_slot"] == b4w_slots[i]["label"]:
                                s["param_slot"] = b4w_slots[i]["param_slot"]
                    del b4w_slots[i]
                    return True
            return False

        def rm_noop(b4w_slots):
            for i in range(len(b4w_slots)):
                if get_slot_type(b4w_slots[i]) == "NOOP":
                    order = None
                    if "order" in b4w_slots[i]:
                        order = b4w_slots[i]["order"]
                    if order:
                        for s in b4w_slots:
                            if "param_slot" in s:
                                if s["param_slot"] == b4w_slots[i]["label"]:
                                    s["param_slot"] = order
                            if s["order"] == b4w_slots[i]["label"]:
                                s["order"] = order
                    del b4w_slots[i]
                    return True
            return False


        # working copy
        b4w_slots = scene['b4w_nla_script']

        if cyclic:
            b4w_slots[-1]["order"] =  b4w_slots[0]["label"]

        # store order link
        for i in range(len(b4w_slots)-1):
            b4w_slots[i]["order"] = b4w_slots[i+1]["label"]

        # remove jumps
        search_jump = True
        while search_jump:
            search_jump = rm_jump(b4w_slots)

        # remove noops
        search_noop = True
        while search_noop:
            search_noop = rm_noop(b4w_slots)

        # make nodes
        for i in range(len(b4w_slots)):
            node = ntree.nodes.new("B4W_logic_node")
            copy_slot_to_node(b4w_slots[i], node)
            node.location = (node_x, node_start_y)
            node_x = node_x + node.width + 50

        # make entry point node
        entry = ntree.nodes.new("B4W_logic_node")
        entry.type = "ENTRYPOINT"
        entry["order"] = b4w_slots[0]["label"]
        entry.location = (node_start_x - entry.width - 50, node_start_y)

        for i in range(len(ntree.nodes)):
            if ntree.nodes[i].bl_idname == "B4W_logic_node":
                # make order links
                n = self.get_node_by_label2(ntree.nodes, ntree.nodes[i]["order"])
                if not n:
                    continue
                x0,y0 = ntree.nodes[i].location
                x1,y1 = n.location
                if "Order_Output_Socket" in ntree.nodes[i].outputs:
                    if x1 - x0 <= 0:
                        reroute1 = ntree.nodes.new("NodeReroute")
                        reroute1.location = (x0+ntree.nodes[i].width+20, y0- 300)
                        reroute2 = ntree.nodes.new("NodeReroute")
                        reroute2.location = (x1 - 20, y1- 300)
                        ntree.links.new(ntree.nodes[i].outputs["Order_Output_Socket"], reroute1.inputs[0])
                        ntree.links.new(reroute1.outputs[0], reroute2.inputs[0])
                        ntree.links.new(reroute2.outputs[0], n.inputs["Order_Input_Socket"])
                    else:
                        ntree.links.new(ntree.nodes[i].outputs["Order_Output_Socket"], n.inputs["Order_Input_Socket"])

                # make jump links
                if ntree.nodes[i].type in ["CONDJUMP", "SELECT"]:
                    n = self.get_node_by_label2(ntree.nodes, ntree.nodes[i].param_slot)
                    x0,y0 = ntree.nodes[i].location
                    x1,y1 = n.location
                    if x1 - x0 <= 0:
                        reroute1 = ntree.nodes.new("NodeReroute")
                        reroute1.location = (x0+ntree.nodes[i].width+20, y0- 300)
                        reroute2 = ntree.nodes.new("NodeReroute")
                        reroute2.location = (x1 - 20, y1- 300)
                        ntree.links.new(ntree.nodes[i].outputs["Jump_Output_Socket"], reroute1.inputs[0])
                        ntree.links.new(reroute1.outputs[0], reroute2.inputs[0])
                        ntree.links.new(reroute2.outputs[0], n.inputs["Order_Input_Socket"])
                    else:
                        ntree.links.new(ntree.nodes[i].outputs["Jump_Output_Socket"], n.inputs["Order_Input_Socket"])

        self.clear_errors()
        entrypoints = check_entry_point(ntree)
        if entrypoints:
            check_connectivity(ntree, entrypoints)
        check_nodes(ntree)

        return{'FINISHED'}

class B4W_LogicEditorNode:
    @classmethod
    def poll(cls, ntree):
        return ntree.bl_idname == 'B4WLogicNodeTreeType'

class B4W_LogicNodeJumpSocket(NodeSocket):
    bl_idname = 'SlotJumpSocketType'
    bl_label = 'SlotJumpSocketOutput'
    def draw(self, context, layout, node, text):
        layout.label("Target")

    def draw_color(self, context, node):
        return jump_socket_color

class B4W_LogicNodeOrderSocket(NodeSocket):
    bl_idname = 'SlotOrderSocketType'
    bl_label = 'LogicOperator Node Socket'
    def draw(self, context, layout, node, text):
        if node.type == "ENTRYPOINT":
            layout.label("Next")
            return
        if self.name in ["Order_Input_Socket"]:
                layout.label("Previous")
        if node.type == "CONDJUMP":
            if self.name in ["Order_Output_Socket"]:
                layout.label("False")
            elif self.name in ["Jump_Output_Socket"]:
                layout.label("True")
        elif node.type == "SELECT":
            if self.name in ["Order_Output_Socket"]:
                layout.label("Miss")
            elif self.name in ["Jump_Output_Socket"]:
                layout.label("Hit")
        else:
            if self.name in ["Order_Output_Socket"]:
                layout.label("Next")

    def draw_color(self, context, node):
        return order_socket_color

class B4W_LogicNode(Node, B4W_LogicEditorNode):

    bl_idname = 'B4W_logic_node'
    bl_label = 'B4WLogicNode'

    def update_prop_callback(self, context):
        self.check_node()

    def update(self):
        clear_links_err(self.id_data)
        entrypoints = check_entry_point(self.id_data)
        if entrypoints:
            check_connectivity(self.id_data, entrypoints)
        self.check_node()
        for n in self.id_data.nodes:
            if n.bl_idname == "NodeReroute":
                n.outputs[0].link_limit = 1
                n.inputs[0].link_limit = 1

    def type_init(self, context):
        if self.type == "ENTRYPOINT":
            if not "Order_Output_Socket" in self.outputs:
                s = self.outputs.new('SlotOrderSocketType', "Order_Output_Socket")
                s.link_limit = 1
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

        if self.type in ["SELECT_PLAY", "PLAY", "HIDE", "SHOW", "SELECT"]:
            self.width = 190
        if self.type in ["PAGE_PARAM"]:
            self.width = 150
        if self.type in ["REDIRECT"]:
            self.width = 250
        if self.type in ["MATH", "CONDJUMP"]:
            self.width = 250
        if self.type in ["REGSTORE"]:
            self.width = 180
        if self.type in ["JUMP"]:
            self.width = 100

    type = bpy.props.EnumProperty(name="type",items=slot_type_enum, update=type_init)

    param_marker_start = bpy.props.StringProperty(
        name = "Start Marker",
        description = "First marker of the playback",
        default = "",
        update = update_prop_callback
    )
    param_marker_end = bpy.props.StringProperty(
        name = "End Marker",
        description = "Final marker of the playback",
        default = "",
        update = update_prop_callback
    )
    param_slot = bpy.props.StringProperty(
        name = "Target Slot",
        description = "Name of the target slot",
        default = "",
        update = update_prop_callback
    )
    def update_ob(self, context, n):
        for i in range(n+1,10):
            setattr(self, 'ob%s'%i, "")
        self.update_prop_callback(context)

    def update_ob0(self, context):
        self.update_ob(context, 0)
    def update_ob1(self, context):
        self.update_ob(context, 1)
    def update_ob2(self, context):
        self.update_ob(context, 2)
    def update_ob3(self, context):
        self.update_ob(context, 3)
    def update_ob4(self, context):
        self.update_ob(context, 4)
    def update_ob5(self, context):
        self.update_ob(context, 5)
    def update_ob6(self, context):
        self.update_ob(context, 6)
    def update_ob7(self, context):
        self.update_ob(context, 7)
    def update_ob8(self, context):
        self.update_ob(context, 8)
    def update_ob9(self, context):
        self.update_ob(context, 9)

    ob0 = bpy.props.StringProperty(name="ob0", update = update_ob0)
    ob1 = bpy.props.StringProperty(name="ob1", update = update_ob1)
    ob2 = bpy.props.StringProperty(name="ob2", update = update_ob2)
    ob3 = bpy.props.StringProperty(name="ob3", update = update_ob3)
    ob4 = bpy.props.StringProperty(name="ob4", update = update_ob4)
    ob5 = bpy.props.StringProperty(name="ob5", update = update_ob5)
    ob6 = bpy.props.StringProperty(name="ob6", update = update_ob6)
    ob7 = bpy.props.StringProperty(name="ob7", update = update_ob7)
    ob8 = bpy.props.StringProperty(name="ob8", update = update_ob8)
    ob9 = bpy.props.StringProperty(name="ob9", update = update_ob9)

    param_register1 = bpy.props.EnumProperty(
        name = "Register 1",
        description = "First register operand",
        default = "R1",
        items = reg_items,
        update = update_prop_callback
    )
    param_register2 = bpy.props.EnumProperty(
        name = "Register 2",
        description = "Second register operand",
        default = "R1",
        items = reg_items,
        update = update_prop_callback
    )
    param_register_dest = bpy.props.EnumProperty(
        name = "Destination Register",
        description = "Destination register operand",
        default = "R1",
        items = reg_items,
        update = update_prop_callback
    )
    param_number1 = bpy.props.FloatProperty(
        name = "Num",
        description = "First numeric operand",
        default = 0,
        step = 100,
        update = update_prop_callback
    )
    param_number2 = bpy.props.FloatProperty(
        name = "Num",
        description = "Second numeric operand",
        default = 0,
        step = 100,
        update = update_prop_callback
    )
    param_register_flag1 = bpy.props.BoolProperty(
        name = "Register",
        description = "First register operand",
        default = False,
        update = update_prop_callback
    )
    param_register_flag2 = bpy.props.BoolProperty(
        name = "Register",
        description = "Second register operand",
        default = False,
        update = update_prop_callback
    )
    param_operation = bpy.props.EnumProperty(
        name = "Operation",
        description = "Operation to perform on input operands",
        default = "ADD",
        items = operation_type_enum,
        update = update_prop_callback
    )
    param_condition = bpy.props.EnumProperty(
        name = "Condition",
        description = "Conditonal operator",
        default = "EQUAL",
        items = condition_type_enum,
        update = update_prop_callback
    )
    param_url = bpy.props.StringProperty(
        name = "URL",
        description = "Target URL",
        default = "https://www.blend4web.com",
        update = update_prop_callback
    )
    param_name = bpy.props.StringProperty(
        name = "Param Name",
        description = "Param name",
        default = "",
        update = update_prop_callback
    )
    # used for identification
    label2 = bpy.props.StringProperty(
        name = "label2",
        description = "label2",
        default = ""
    )
    error_messages = bpy.props.PointerProperty(
        name = "Error messages",
        description = "Error messages",
        type = B4W_LogicEditorErrors
    )

    def add_error_message(self, list, message):
        found = False
        for m in list:
            if m.message == message:
                found = True
        if not found:
            list.add()
            list[-1].message = message

    def check_node(self):
        err_msgs = self.error_messages.prop_err
        err_msgs.clear()
        if self.type in ["SELECT", "SELECT_PLAY", "SHOW", "HIDE"]:
            path = self.get_object_path()
            if not object_by_path(bpy.data.objects, path):
                self.add_error_message(err_msgs, "Object field is empty!")

        if self.type in ["PLAY", "SELECT_PLAY"]:
            if self.param_marker_start == "":
                self.add_error_message(err_msgs, "Start marker field is empty!")

        if self.type == "PAGEPARAM":
            if self.param_name == "":
                self.add_error_message(err_msgs, "Page param field is empty!")

        if self.type == "REDIRECT":
            if self.param_url == "":
                self.add_error_message(err_msgs, "Url field is empty!")

        if len(err_msgs) > 0:
            return False
        else:
            return True

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
        self.update_label2()

    def init(self, context):
        self.update_label2()
        self.check_node()

    def draw_object_item(self, col):
        row = col.row()
        percent = 0.50
        split = row.split(percentage=percent)
        ob = self.ob0
        dupgr = bpy.data
        if ob in dupgr.objects and not dupgr.objects[ob].dupli_group:
            icon_id = 'OBJECT_DATA'
        else:
            icon_id = 'GROUP'
        split.label("Object:")
        split.prop_search(self, 'ob0', dupgr, 'objects', text='', icon =icon_id)

        for i in range(1,10):
            if ob in dupgr.objects and dupgr.objects[ob].dupli_group:
                row = col.row()
                split = row.split(percentage=percent)
                obold = getattr(self, 'ob%s'%i)
                icon_id = 'GROUP'
                if obold in dupgr.objects[ob].dupli_group.objects:
                    if dupgr.objects[ob].dupli_group.objects[obold].dupli_group:
                        icon_id = 'GROUP'
                    else:
                        icon_id = 'OBJECT_DATA'
                split.label("")
                split.prop_search(self, 'ob%s'%i, dupgr.objects[ob].dupli_group, 'objects', text='', icon = icon_id)

                dupgr = dupgr.objects[ob].dupli_group
                ob = getattr(self, 'ob%s'%i)
            else:
                break

    def draw_marker(self, col, prop_name, label):
        row = col.row()
        spl = row.split(percentage = 0.50)
        spl.label(label)
        spl.prop_search(self, prop_name, bpy.context.scene, 'timeline_markers', text='', icon='MARKER')

    def draw_start_end_markers(self, col):
        self.draw_marker(col, "param_marker_start", "Start Marker:")
        self.draw_marker(col, "param_marker_end", "End Marker:")

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
        col.context_pointer_set("logic_node", slot)

        if not self.type in ("NOOP", "JUMP") :
            split = col.split()
            col = split.column()

        if self.type == "PLAY":
            self.draw_start_end_markers(col)

        elif slot.type == "SELECT":
            self.draw_object_item(col)

        elif slot.type == "SELECT_PLAY":

            self.draw_object_item(col)
            self.draw_start_end_markers(col)

        elif slot.type == "JUMP":
            pass
        elif slot.type == "CONDJUMP":

            col.prop(slot, "param_condition")

            row = col.row()
            row.label("Operand1:")
            if slot.param_register_flag1:
                row.prop(slot, "param_register1", text="")
            else:
                row.prop(slot, "param_number1")
            row.prop(slot, "param_register_flag1")

            row = col.row()
            row.label("Operand2:")
            if slot.param_register_flag2:
                row.prop(slot, "param_register2", text="")
            else:
                row.prop(slot, "param_number2")
            row.prop(slot, "param_register_flag2")

        elif slot.type == "REGSTORE":

            row = col.row()

            row.label("Register:")
            row.prop(slot, "param_register_dest", text="")
            row.prop(slot, "param_number1")

        elif slot.type == "MATH":

            col.prop(slot, "param_operation")

            row = col.row()
            row.label("Operand1:")
            if slot.param_register_flag1:
                row.prop(slot, "param_register1", text="")
            else:
                row.prop(slot, "param_number1")
            row.prop(slot, "param_register_flag1")

            row = col.row()
            row.label("Operand2:")
            if slot.param_register_flag2:
                row.prop(slot, "param_register2", text="")
            else:
                row.prop(slot, "param_number2")
            row.prop(slot, "param_register_flag2")

            row = col.row()
            row.label("Destination:")
            row.prop(slot, "param_register_dest", text="")
            row.label("")

        elif slot.type == "REDIRECT":
            row = col.row()
            spl = row.split(percentage=0.10)
            spl.label("Url:")
            spl.prop(slot, "param_url", text="")

        elif slot.type == "SHOW" or slot.type == "HIDE":
            self.draw_object_item(col)

        elif slot.type == "PAGEPARAM":
            row = col.row()
            spl = row.split(percentage=0.50)
            spl.label('Param Name:')
            spl.prop(slot, "param_name", text = '')

            row = col.row()
            spl = row.split(percentage=0.50)
            spl.label("Destination:")
            spl.prop(slot, "param_register_dest", text="")

    def draw_label(self):
        for t in slot_type_enum:
            if t[0] == self.type:
                return t[1]
        return "Logic Node"

class B4W_LogicNodeCategory(NodeCategory):
    @classmethod
    def poll(cls, context):
        return context.space_data.tree_type == 'B4WLogicNodeTreeType'

node_categories = [
    B4W_LogicNodeCategory("Logic Nodes", "Logic Nodes", items=[
        NodeItem("B4W_logic_node", label="Entry Point",settings={"type": repr("ENTRYPOINT")}),
        NodeItem("B4W_logic_node", label="Play",settings={"type": repr("PLAY")}),
        NodeItem("B4W_logic_node", label="Page Param",settings={"type": repr("PAGEPARAM")}),
        NodeItem("B4W_logic_node", label="Hide Object",settings={"type": repr("HIDE")}),
        NodeItem("B4W_logic_node", label="Show Object",settings={"type": repr("SHOW")}),
        NodeItem("B4W_logic_node", label="Page Redirect",settings={"type": repr("REDIRECT")}),
        NodeItem("B4W_logic_node", label="Math Operation",settings={"type": repr("MATH")}),
        NodeItem("B4W_logic_node", label="Register Store",settings={"type": repr("REGSTORE")}),
        NodeItem("B4W_logic_node", label="Conditional Jump",settings={"type": repr("CONDJUMP")}),
        NodeItem("B4W_logic_node", label="Select & Play",settings={"type": repr("SELECT_PLAY")}),
        NodeItem("B4W_logic_node", label="Select & Jump",settings={"type": repr("SELECT")})
        ]),
    B4W_LogicNodeCategory("Layout", "Layout", items=[
        NodeItem("NodeFrame"),
        NodeItem("NodeReroute"),
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
            if not n.check_node():
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
                n.add_error_message(n.error_messages.link_err, "Entry Point node is not found!")

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
    err = False
    if len(ntree.nodes) == 0:
        if "errors" not in ntree:
            ntree["errors"] = []
        ntree.append((ntree.name, "Node tree is empty!"))
        return False

    for n in ntree.nodes:
        if n.bl_idname == "B4W_logic_node":
            if "Order_Input_Socket" in n.inputs:
                if n.inputs["Order_Input_Socket"].is_linked == False:
                    n.add_error_message(n.error_messages.link_err, "Input is not connected!")
    subtrees = []
    for ep in entrypoints:
        connected = [ep]
        check_conn(ntree, ep, connected)
        subtrees.append(connected)

    for n in ntree.nodes:
        if n.bl_idname == "B4W_logic_node":
            not_connected = n
            for st in subtrees:
                if n in st:
                    not_connected = None
            if not_connected:
                n.add_error_message(n.error_messages.link_err, "No path from Entry point!")
                err = True
    # check subtrees overlap
    arr = []
    for st in subtrees:
        for n in st:
            if n in arr:
                n.add_error_message(n.error_messages.link_err, "Subtrees overlapping is not allowed!")
                err = True
            else:
                arr.append(n)

    if err:
        return None
    else:
        return subtrees

def check_tree(ntree):
    # check_links_types(ntree)
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

def copy_node_to_slot(ntree, node, slot):
    slot['label'] = node.label2
    slot['object_path'] = node.get_object_path()
    if "Jump_Output_Socket" in node.outputs:
        if node.outputs["Jump_Output_Socket"].is_linked:
            r = get_target_input_node(ntree, node.outputs["Jump_Output_Socket"])
            if r:
                target_n, target_sock = r
                slot['param_slot'] = target_n.label2
            else:
                slot['param_slot'] = ""
    for p in slot_node_joint_props:
        slot[p] = getattr(node, p)

def copy_slot_to_node(slot, node):
    order = 0
    if "order" in slot:
        order =  slot["order"]
    node["order"] = order
    node.label2 = slot['label']
    if 'param_object' in slot:
        names = slot['param_object'].split("*", maxsplit=1)
        if len(names)>1:
            node.ob0 = names[0]
            node.ob1 = names[1]
        else:
            node.ob0 = names[0]
    if 'param_slot' in slot:
        node.param_slot = slot['param_slot']

    node.type = get_slot_type(slot)
    for p in slot_node_joint_props:
        if p in slot:
            if p in ['param_register1', 'param_register2','param_register_dest']:
                setattr(node, p, reg_items[slot[p]][0])
            elif p in ["type"]:
                for t in slot_type_enum:
                    if t[3] == slot[p]:
                        setattr(node, p, t[0])
            elif p in ["param_operation"]:
                setattr(node, p, operation_type_enum[slot[p]][0])
            elif p in ["param_condition"]:
                setattr(node, p, condition_type_enum[slot[p]][0])
            else:
                setattr(node, p, slot[p])

def b4w_logic_editor_refresh_available_trees():
    trees = bpy.context.scene.b4w_available_logic_trees
    trees.clear()
    for t in bpy.data.node_groups:
        if t.bl_idname == 'B4WLogicNodeTreeType':
            trees.add()
            trees[-1].name = t.name

class OperatorMuteNode(bpy.types.Operator):
    bl_idname = "node.b4w_logic_node_mute_toggle"
    bl_label = "Toggle Node Mute"
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

def menu_func(self, context):
    self.layout.operator(OperatorMuteNode.bl_idname)
addon_keymaps = []

def register_hotkey():
    bpy.utils.register_class(OperatorMuteNode)
    bpy.types.NODE_MT_node.append(menu_func)

    # handle the keymap
    wm = bpy.context.window_manager
    # if running not in background
    if wm.keyconfigs:
        km = wm.keyconfigs.addon.keymaps.new(name='Node Editor', space_type='NODE_EDITOR')
        kmi = km.keymap_items.new(OperatorMuteNode.bl_idname, 'M', 'PRESS')
        addon_keymaps.append(km)

def unregister_hotkey():
    bpy.utils.unregister_class(OperatorMuteNode)
    bpy.types.NODE_MT_node.remove(menu_func)

    # handle the keymap
    wm = bpy.context.window_manager
    if wm.keyconfigs:
        for km in addon_keymaps:
            wm.keyconfigs.addon.keymaps.remove(km)
        # clear the list
        del addon_keymaps[:]

def register():
    bpy.utils.register_class(B4W_LogicEditorErrTextWrap)
    bpy.utils.register_class(B4W_LogicEditorErrors)
    bpy.utils.register_class(B4W_LogicNodeTree)
    bpy.utils.register_class(B4W_LogicNode)
    bpy.utils.register_class(B4W_LogicNodeJumpSocket)
    bpy.utils.register_class(B4W_LogicNodeOrderSocket)

    nodeitems_utils.register_node_categories("B4W_LOGIC_CUSTOM_NODES", node_categories)
    register_hotkey()

def unregister():
    nodeitems_utils.unregister_node_categories("B4W_LOGIC_CUSTOM_NODES")

    bpy.utils.unregister_class(B4W_LogicNodeTree)
    bpy.utils.unregister_class(B4W_LogicNode)
    bpy.utils.unregister_class(B4W_LogicNodeOrderSocket)
    bpy.utils.unregister_class(B4W_LogicNodeJumpSocket)
    bpy.utils.unregister_class(B4W_LogicEditorErrors)
    bpy.utils.unregister_class(B4W_LogicEditorErrTextWrap)
    unregister_hotkey()

if __name__ == "__main__":
    register()
