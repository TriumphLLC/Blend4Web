import bpy

class B4W_Remove_Unused_Vertex_Groups(bpy.types.Operator):
    '''Remove Unused VGroups'''
    bl_idname = "b4w.remove_unused_vgroups"
    bl_label = "B4W Remove Unused VGroups"
   
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

def unregister():
    bpy.utils.unregister_class(B4W_Remove_Unused_Vertex_Groups)

