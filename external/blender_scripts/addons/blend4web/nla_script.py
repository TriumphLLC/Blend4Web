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

def marker_to_frame_range(scene, marker):
    markers = scene.timeline_markers
    if len(markers) and marker in markers:
        first = markers[marker].frame
        if first < scene.frame_start:
            first = scene.frame_start
        last = scene.frame_end

        for marker in markers:
            if marker.frame > first and marker.frame < last:
                last = marker.frame

        return [first, last]
    else:
        return [0,0]

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
            ("PLAY", "Play", "Play NLA animation"),
            ("SELECT", "Select & Jump", "Select an object"),
            ("SELECT_PLAY", "Select & Play", "Select an object then play"),
            ("JUMP", "Jump", "Jump to the slot by label"),
            ("NOOP", "Noop", "No operation")
        ]
    )
    param1 = bpy.props.StringProperty(
        name = "Script slot param 1",
        description = "Script slot param 1", 
        default = ""
    )
    param2 = bpy.props.StringProperty(
        name = "Script slot param 2",
        description = "Script slot param 2", 
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
            if check_marker(scene, slot.param1):
                icon = "MARKER"
            else:
                icon = "ERROR"
            col.prop(slot, "param1", text="Marker", icon=icon)

        elif slot.type == "SELECT":

            if object_by_name(scene.objects, slot.param1):
                icon = "OBJECT_DATA"
            else:
                icon = "ERROR"

            col.prop(slot, "param1", text="Object", icon=icon)

            if slot.param2 and label_to_slot_num(scene, slot.param2) > -1:
                icon = "NODE"
            else:
                icon = "ERROR"

            col.prop(slot, "param2", text="Target slot name", icon=icon)

        elif slot.type == "SELECT_PLAY":

            if object_by_name(scene.objects, slot.param1):
                icon = "OBJECT_DATA"
            else:
                icon = "ERROR"

            col.prop(slot, "param1", text="Object", icon=icon)

            if check_marker(scene, slot.param2):
                icon = "MARKER"
            else:
                icon = "ERROR"
            col.prop(slot, "param2", text="Marker", icon=icon)

        elif slot.type == "JUMP":
            if slot.param1 and label_to_slot_num(scene, slot.param1) > -1:
                icon = "NODE"
            else:
                icon = "ERROR"

            col.prop(slot, "param1", text="Target slot name", icon=icon)

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
