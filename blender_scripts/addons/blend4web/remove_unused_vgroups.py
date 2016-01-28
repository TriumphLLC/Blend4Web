import bpy
import blend4web

b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_

class B4W_RemoveUnusedVertexGroupsUI(bpy.types.Panel):
    bl_idname = _("Vertex groups")
    bl_label = _("Clean Unused Vertex Groups")
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'TOOLS'
    bl_category = "Blend4Web"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(self, context):
        try:
            ob = context.active_object
            return (ob.type == 'MESH')
        except AttributeError:
            return False

    def draw(self, context):
        layout = self.layout
        layout.operator('b4w.remove_unused_vgroups', text = 'Clean', icon='CANCEL')

class B4W_Remove_Unused_Vertex_Groups(bpy.types.Operator):
    '''Remove vertex groups which are not being used by any armature'''
    bl_idname = "b4w.remove_unused_vgroups"
    bl_label = p_("B4W Remove Unused VGroups", "Operator")
    bl_options = {"INTERNAL"}

    def execute(self, context):
        run(self)
        return {"FINISHED"}


def run(self):

    obj = bpy.context.object
    vgroups = obj.vertex_groups
    counter = 0

    for vgroup in vgroups:
        if vgroup_is_unused(obj, vgroup):
            vgroups.remove(vgroup)
            counter = counter + 1

    self.report({"INFO"}, "Removed " + str(counter) + " vertex groups")


def vgroup_is_unused(obj, search_vgroup):

    for vert in obj.data.vertices:
        for vgroup in vert.groups:
            if vgroup.group == search_vgroup.index:
                return False
    return True


def register():
    bpy.utils.register_class(B4W_Remove_Unused_Vertex_Groups)
    bpy.utils.register_class(B4W_RemoveUnusedVertexGroupsUI)

def unregister():
    bpy.utils.unregister_class(B4W_Remove_Unused_Vertex_Groups)
    bpy.utils.unregister_class(B4W_RemoveUnusedVertexGroupsUI)

