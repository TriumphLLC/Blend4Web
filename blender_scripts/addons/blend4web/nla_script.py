import bpy

def label_to_slot_num(scene, label):
    """Returns -1 if no label was found"""

    nla_script = scene.b4w_nla_script

    for num in range(len(nla_script)):
        slot = nla_script[num]
        if slot.label == label:
            return num

    return -1

def check_marker(scene, marker):
    markers = scene.timeline_markers
    if len(markers) and marker in markers:
        return True
    else:
        return False

def markers_to_frame_range(scene, marker_start, marker_end):
    if not check_marker(scene, marker_start):
        return None

    if not (marker_end == "" or check_marker(scene, marker_end)):
        return None

    markers = scene.timeline_markers

    first = markers[marker_start].frame
    if first < scene.frame_start:
        first = scene.frame_start

    if marker_end == "":
        last = scene.frame_end

        for marker in markers:
            if marker.frame > first and marker.frame < last:
                last = marker.frame
    else:
        last = markers[marker_end].frame
        if last > scene.frame_end:
            last = scene.frame_end

    return [first, last]

def object_by_name(objects, name):
    """Allow 'dg_name1*dg_name2...*name' format for the object's name"""

    names = name.split("*", maxsplit=1)

    for obj in objects:
        if obj.name == names[0]:
            if len(names) == 1:
                return obj
            elif obj.dupli_group:
                return object_by_name(obj.dupli_group.objects, names[1])
            else:
                return None

    return None

class B4W_ScriptSlot(bpy.types.PropertyGroup):
    # labels are called "names" in the interface
    label = bpy.props.StringProperty(
        name = "Script slot name",
        description = "Script slot name", 
        default = ""
    )
    type = bpy.props.EnumProperty(
        name = "Script slot type",
        description = "Script slot type",
        default = "PLAY",
        items = [
            ("NOOP", "Noop", "No operation", 0),
            ("PAGEPARAM", "Page Param", "Store numeric page parameter to a " + 
                    "register", 12),
            ("HIDE", "Hide Object", "Hide object", 11),
            ("SHOW", "Show Object", "Show bject", 10),
            ("REDIRECT", "Page Redirect", "Redirect current page to given URL", 9),
            ("MATH", "Math operation", "Perform a math operation", 1),
            ("REGSTORE", "Register Store", "Store a value to a register", 2),
            ("CONDJUMP", "Conditional Jump", "Conditional jump", 3),
            ("JUMP", "Jump", "Jump to the slot by label", 4),
            # 8 ID is currently unused
            ("SELECT_PLAY", "Select & Play", "Select an object then play", 5),
            ("SELECT", "Select & Jump", "Select an object", 6),
            ("PLAY", "Play", "Play NLA animation", 7)
        ]
    )
    param_marker_start = bpy.props.StringProperty(
        name = "Start Marker",
        description = "First marker of the playback", 
        default = ""
    )
    param_marker_end = bpy.props.StringProperty(
        name = "End Marker",
        description = "Final marker of the playback", 
        default = ""
    )
    param_slot = bpy.props.StringProperty(
        name = "Target Slot",
        description = "Name of the target slot", 
        default = ""
    )
    param_object = bpy.props.StringProperty(
        name = "Object",
        description = "Name of the object", 
        default = ""
    )
    param_register1 = bpy.props.EnumProperty(
        name = "Register 1",
        description = "First register operand",
        default = "R1",
        items = [
            ("R8", "R8", "Register 8"),
            ("R7", "R7", "Register 7"),
            ("R6", "R6", "Register 6"),
            ("R5", "R5", "Register 5"),
            ("R4", "R4", "Register 4"),
            ("R3", "R3", "Register 3"),
            ("R2", "R2", "Register 2"),
            ("R1", "R1", "Register 1")
        ]
    )
    param_register2 = bpy.props.EnumProperty(
        name = "Register 2",
        description = "Second register operand",
        default = "R1",
        items = [
            ("R8", "R8", "Register 8"),
            ("R7", "R7", "Register 7"),
            ("R6", "R6", "Register 6"),
            ("R5", "R5", "Register 5"),
            ("R4", "R4", "Register 4"),
            ("R3", "R3", "Register 3"),
            ("R2", "R2", "Register 2"),
            ("R1", "R1", "Register 1")
        ]
    )
    param_register_dest = bpy.props.EnumProperty(
        name = "Destination Register",
        description = "Destination register operand",
        default = "R1",
        items = [
            ("R8", "R8", "Register 8"),
            ("R7", "R7", "Register 7"),
            ("R6", "R6", "Register 6"),
            ("R5", "R5", "Register 5"),
            ("R4", "R4", "Register 4"),
            ("R3", "R3", "Register 3"),
            ("R2", "R2", "Register 2"),
            ("R1", "R1", "Register 1")
        ]
    )

    param_number1 = bpy.props.FloatProperty(
        name = "Number",
        description = "First numeric operand",
        default = 0,
        step = 100
    )
    param_number2 = bpy.props.FloatProperty(
        name = "Number",
        description = "Second numeric operand",
        default = 0,
        step = 100
    )

    param_register_flag1 = bpy.props.BoolProperty(
        name = "Register",
        description = "First register operand",
        default = False
    )
    param_register_flag2 = bpy.props.BoolProperty(
        name = "Register",
        description = "Second register operand",
        default = False
    )

    param_operation = bpy.props.EnumProperty(
        name = "Operation",
        description = "Operation to perform on input operands",
        default = "ADD",
        items = [
            ("DIV", "Divide", "Divide"),
            ("SUB", "Subtract", "Subtract"),
            ("MUL", "Multiply", "Multiply"),
            ("ADD", "Add", "Add")
        ]
    )

    param_condition = bpy.props.EnumProperty(
        name = "Condition",
        description = "Conditonal operator",
        default = "EQUAL",
        items = [
            ("GEQUAL", "Greater Than or Equal (>=)", "Greater than or equal"),
            ("LEQUAL", "Less Than or Equal (<=)", "Less than or equal"),
            ("GREATER", "Greater Than (>)", "Greater than"),
            ("LESS", "Less Than (<)", "Less than"),
            ("NOTEQUAL", "Not Equal (!=)", "Not equal"),
            ("EQUAL", "Equal (=)", "Equal")
        ]
    )

    param_url = bpy.props.StringProperty(
        name = "URL",
        description = "Target URL", 
        default = "https://www.blend4web.com"
    )

    param_name = bpy.props.StringProperty(
        name = "Param Name",
        description = "Param name", 
        default = ""
    )

class B4W_ScriptAddOperator(bpy.types.Operator):
    bl_idname      = 'b4w.nla_script_add'
    bl_label       = "Add"
    bl_description = "Add new script slot"

    def invoke(self, context, event):
        scene = context.scene
        script = scene.b4w_nla_script

        script.add()

        slot_cnt = 0

        while (True):
            old_slot_cnt = slot_cnt

            for slot in script:
                if slot.label == "SLOT_" + str(slot_cnt):
                    slot_cnt+=1

            if old_slot_cnt == slot_cnt:
                break

        index = len(script)-1
        script[index].name = "SLOT_" + str(slot_cnt)
        script[index].label = "SLOT_" + str(slot_cnt)

        return {'FINISHED'}

class B4W_ScriptRemOperator(bpy.types.Operator):
    bl_idname      = 'b4w.nla_script_remove'
    bl_label       = "Remove"
    bl_description = "Remove selected script slot"

    def invoke(self, context, event):
        scene = context.scene
        script = scene.b4w_nla_script

        for index in range(len(script)):
            if script[index] == context.nla_script_slot:
                script.remove(index)
                break;

        return {'FINISHED'}

class B4W_ScriptUpOperator(bpy.types.Operator):
    bl_idname      = 'b4w.nla_script_up'
    bl_label       = "Up"
    bl_description = "Move script slot up"

    def invoke(self, context, event):
        scene = context.scene
        script = scene.b4w_nla_script

        for index in range(len(script)):
            if script[index] == context.nla_script_slot and index > 0:
                script.move(index, index-1)
                break;

        return {'FINISHED'}

class B4W_ScriptDownOperator(bpy.types.Operator):
    bl_idname      = 'b4w.nla_script_down'
    bl_label       = "Down"
    bl_description = "Move script slot down"

    def invoke(self, context, event):
        scene = context.scene
        script = scene.b4w_nla_script

        for index in range(len(script)):
            if script[index] == context.nla_script_slot and index < len(script)-1:
                script.move(index, index+1)
                break;

        return {'FINISHED'}

def draw(layout, context):
    scene = context.scene

    if not scene:
        return

    layout.active = getattr(scene, "b4w_use_nla")

    row = layout.row()
    row.operator("b4w.nla_script_add", icon='ZOOMIN', text="Append NLA script slot")

    script = scene.b4w_nla_script
    for slot in script:
        col = layout.column(align=True)
        col.context_pointer_set("nla_script_slot", slot)

        row = col.box().row()
        row.prop(slot, "label", text="")

        sub_row = row.row(align=True)
        sub_row.operator("b4w.nla_script_down", icon='TRIA_DOWN', text="")
        sub_row.operator("b4w.nla_script_up", icon='TRIA_UP', text="")

        row = row.row(align=False)
        row.operator("b4w.nla_script_remove", icon='X', text="")

        split = col.box().split()
        col = split.column()
        col.prop(slot, "type", text="Type")

        if slot.type == "PLAY":
            if check_marker(scene, slot.param_marker_start):
                icon = "MARKER"
            else:
                icon = "ERROR"
            col.prop(slot, "param_marker_start", icon=icon)

            if slot.param_marker_end == "":
                icon = "NONE"
            elif check_marker(scene, slot.param_marker_end):
                icon = "MARKER"
            else:
                icon = "ERROR"
            col.prop(slot, "param_marker_end", icon=icon)

        elif slot.type == "SELECT":

            if object_by_name(scene.objects, slot.param_object):
                icon = "OBJECT_DATA"
            else:
                icon = "ERROR"

            col.prop(slot, "param_object", icon=icon)

            if slot.param_slot and label_to_slot_num(scene, slot.param_slot) > -1:
                icon = "NODE"
            else:
                icon = "ERROR"

            col.prop(slot, "param_slot", icon=icon)

        elif slot.type == "SELECT_PLAY":

            if object_by_name(scene.objects, slot.param_object):
                icon = "OBJECT_DATA"
            else:
                icon = "ERROR"

            col.prop(slot, "param_object", icon=icon)

            if check_marker(scene, slot.param_marker_start):
                icon = "MARKER"
            else:
                icon = "ERROR"
            col.prop(slot, "param_marker_start", icon=icon)

            if slot.param_marker_end == "":
                icon = "NONE"
            elif check_marker(scene, slot.param_marker_end):
                icon = "MARKER"
            else:
                icon = "ERROR"
            col.prop(slot, "param_marker_end", icon=icon)

        elif slot.type == "JUMP":
            if slot.param_slot and label_to_slot_num(scene, slot.param_slot) > -1:
                icon = "NODE"
            else:
                icon = "ERROR"

            col.prop(slot, "param_slot", icon=icon)

        elif slot.type == "CONDJUMP":

            col.prop(slot, "param_condition")

            row = col.row()
            row.label("First operand:")
            if slot.param_register_flag1:
                row.prop(slot, "param_register1", text="")
            else:
                row.prop(slot, "param_number1")
            row.prop(slot, "param_register_flag1")

            row = col.row()
            row.label("Second operand:")
            if slot.param_register_flag2:
                row.prop(slot, "param_register2", text="")
            else:
                row.prop(slot, "param_number2")
            row.prop(slot, "param_register_flag2")

            if slot.param_slot and label_to_slot_num(scene, slot.param_slot) > -1:
                icon = "NODE"
            else:
                icon = "ERROR"

            col.prop(slot, "param_slot", icon=icon)

        elif slot.type == "REGSTORE":

            row = col.row()

            row.label("Register:")
            row.prop(slot, "param_register_dest", text="")
            row.prop(slot, "param_number1")

        elif slot.type == "MATH":

            col.prop(slot, "param_operation")

            row = col.row()
            row.label("First operand:")
            if slot.param_register_flag1:
                row.prop(slot, "param_register1", text="")
            else:
                row.prop(slot, "param_number1")
            row.prop(slot, "param_register_flag1")

            row = col.row()
            row.label("Second operand:")
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
            if slot.param_url == "":
                icon = "ERROR"
            else:
                icon = "URL"

            col.prop(slot, "param_url", icon=icon)

        elif slot.type == "SHOW" or slot.type == "HIDE":
            if object_by_name(scene.objects, slot.param_object):
                icon = "OBJECT_DATA"
            else:
                icon = "ERROR"

            col.prop(slot, "param_object", icon=icon)

        elif slot.type == "PAGEPARAM":
            if slot.param_name == "":
                icon = "ERROR"
            else:
                icon = "UI"

            col.prop(slot, "param_name", icon=icon)

            row = col.row()
            row.label("Destination:")
            row.prop(slot, "param_register_dest", text="")
            row.label("")

def register():
    bpy.utils.register_class(B4W_ScriptSlot)
    bpy.utils.register_class(B4W_ScriptAddOperator)
    bpy.utils.register_class(B4W_ScriptRemOperator)
    bpy.utils.register_class(B4W_ScriptUpOperator)
    bpy.utils.register_class(B4W_ScriptDownOperator)

def unregister():
    bpy.utils.unregister_class(B4W_ScriptSlot)
    bpy.utils.unregister_class(B4W_ScriptAddOperator)
    bpy.utils.unregister_class(B4W_ScriptRemOperator)
    bpy.utils.unregister_class(B4W_ScriptUpOperator)
    bpy.utils.unregister_class(B4W_ScriptDownOperator)
