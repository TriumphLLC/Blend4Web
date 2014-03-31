import bpy

def run():

    selected_objects = bpy.context.selected_objects
    if not len(selected_objects) == 2:
        raise Exception("2 objects must be selected")

    obj1 = selected_objects[0]
    obj2 = selected_objects[1]

    if obj1.type == "MESH" and obj2.type == "ARMATURE":
        meshobj = obj1 
        armobj = obj2
    elif obj2.type == "MESH" and obj1.type == "ARMATURE":
        meshobj = obj2 
        armobj = obj1
    else:
        raise Exception("objects must be MESH and ARMATURE")

    prefix = "DEF-"
    
    # assign rig as parent
    meshobj.parent = armobj

    # make armature modifier
    delete_all_armature_modifiers(meshobj)
    armmod = meshobj.modifiers.new("Armature", "ARMATURE")
    armmod.object = armobj

    # rename vertex groups
    for vgroup in meshobj.vertex_groups:
        # if not already renamed
        if vgroup.name.find(prefix) == -1: 
            vgroup.name = prefix + vgroup.name
    
    print("mesh object " + meshobj.name + \
        " assigned to armature object " + armobj.name)

def delete_all_armature_modifiers(meshobj):
    modifiers = meshobj.modifiers
    for modifier in modifiers:
        if modifier.type == "ARMATURE":
            modifiers.remove(modifier)

class B4W_Weights_Copier(bpy.types.Operator):
    '''B4W Weights Copier'''
    bl_idname = "b4w.weights_copy"
    bl_label = "B4W Weights Copy"
   
    def execute(self, context):
        run()
        return {"FINISHED"}

def register(): 
    bpy.utils.register_class(B4W_Weights_Copier)

def unregister(): 
    bpy.utils.unregister_class(B4W_Weights_Copier)
