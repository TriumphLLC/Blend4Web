import bpy
import sys
import os
import stat
import time


##--------------------------OVERRIDES-----------------------------

## PARA ESCENAS NUEVAS
bpy.types.Scene.overrides = bpy.props.StringProperty(default="[]")

## ------------------------------------ APPLY AND RESTORE OVERRIDES --------------------------------------

def DefOscApplyOverrides(self):
    types = {'MESH','META','CURVE'}
    for ob in bpy.data.objects:
        if ob.type in types:
            if not len(ob.material_slots):
                ob.data.materials.append(None)
    slotlist = { ob : [sl.material for sl in ob.material_slots] for ob in bpy.data.objects if ob.type in types if len (ob.material_slots)} 
    with open("%s_override.txt" % (os.path.join(os.path.dirname(bpy.data.filepath),bpy.context.scene.name)), mode="w") as file:
        file.write(str(slotlist))
    scene = bpy.context.scene    
    proptolist = list(eval(scene.overrides))   
    for group, material in proptolist:
        for object in bpy.data.groups[group].objects:
            if object.type in types:
                if len(object.data.materials):
                    object.data.materials.clear()
                    object.data.materials.append(bpy.data.materials[material])                 
 
def DefOscRestoreOverrides(self):
    types = {'MESH','META','CURVE'}
    with open("%s_override.txt" % (os.path.join(os.path.dirname(bpy.data.filepath),bpy.context.scene.name)), mode="r") as file:
        slotlist = eval(file.read())
        for ob,slots in slotlist.items():
            ob.data.materials.clear()
            for slot in slots:
                ob.data.materials.append(slot)   
 
## HAND OPERATOR    
class OscApplyOverrides(bpy.types.Operator):
    bl_idname = "render.apply_overrides"
    bl_label = "Apply Overrides in this Scene"
    bl_options = {"REGISTER", "UNDO"}

    def execute (self, context):
        DefOscApplyOverrides(self)
        return {'FINISHED'}

class OscRestoreOverrides(bpy.types.Operator):
    bl_idname = "render.restore_overrides"
    bl_label = "Restore Overrides in this Scene"
    bl_options = {"REGISTER", "UNDO"}

    def execute (self, context):
        DefOscRestoreOverrides(self)        
        return {'FINISHED'}

bpy.use_overrides = False
    
class OscOverridesOn(bpy.types.Operator):
    bl_idname = "render.overrides_on"
    bl_label = "Turn On Overrides"
    bl_options = {"REGISTER", "UNDO"}

    def execute (self, context):
        if bpy.use_overrides == False:
            bpy.app.handlers.render_pre.append(DefOscApplyOverrides)
            bpy.app.handlers.render_post.append(DefOscRestoreOverrides)  
            bpy.use_overrides = True
            print("Overrides on!")
        else:    
            bpy.app.handlers.render_pre.remove(DefOscApplyOverrides)
            bpy.app.handlers.render_post.remove(DefOscRestoreOverrides)    
            bpy.use_overrides = False
            print("Overrides off!")           
        return {'FINISHED'}  


## ------------------------------------ CHECK OVERRIDES --------------------------------------

class OscCheckOverrides (bpy.types.Operator):
    bl_idname = "render.check_overrides"
    bl_label = "Check Overrides"
    bl_options = {"REGISTER", "UNDO"}


    def execute (self, context):
        GROUPI = False
        GLOBAL = 0
        GLOBALERROR = 0

        print("==== STARTING CHECKING ====")
        print("")

        for SCENE in bpy.data.scenes[:]:
            MATLIST = []
            MATI = False

            for MATERIAL in bpy.data.materials[:]:
                MATLIST.append(MATERIAL.name)

            GROUPLIST=[]
            for GROUP in bpy.data.groups[:]:
                if GROUP.users > 0:
                    GROUPLIST.append(GROUP.name)

            print("   %s Scene is checking" % (SCENE.name))

            for OVERRIDE in list(eval(SCENE.overrides)):
                # REVISO OVERRIDES EN GRUPOS
                if OVERRIDE[0] in GROUPLIST:
                    pass
                else:
                    print("** %s group are in conflict." % (OVERRIDE[0]))
                    GROUPI = True
                    GLOBALERROR += 1
                # REVISO OVERRIDES EN GRUPOS
                if OVERRIDE[1] in MATLIST:
                    pass
                else:
                    print("** %s material are in conflict." % (OVERRIDE[1]))
                    MATI = True
                    GLOBALERROR += 1

            if MATI is False:
                print("-- Materials are ok.")
            else:
                GLOBAL+=1
            if GROUPI is False:
                print("-- Groups are ok.")
            else:
                GLOBAL+=1

        if GLOBAL < 1:
            self.report({'INFO'}, "Materials And Groups are Ok")
        if GLOBALERROR > 0:
            self.report({'WARNING'}, "Override Error: Look in the Console")
        print("")

        return {'FINISHED'}

##--------------------------------- OVERRIDES PANEL ---------------------------------- 
   
class OscOverridesGUI(bpy.types.Panel):
    bl_label = "Oscurart Material Overrides"
    bl_idname = "Oscurart Overrides List"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "render"
    def draw(self,context):
        
        layout = self.layout
        col = layout.column(align=1)
        colrow = col.row(align=1)
        colrow.operator("render.overrides_add_slot", icon = "ZOOMIN") 
        colrow.operator("render.overrides_remove_slot", icon = "ZOOMOUT")         
        col.operator("render.overrides_transfer", icon = "SHORTDISPLAY") 

        for i, m in enumerate(bpy.context.scene.ovlist):
            colrow = col.row(align=1)
            colrow.prop_search(m, "grooverride", bpy.data, "groups", text= "")  
            colrow.prop_search(m, "matoverride", bpy.data, "materials", text= "")
            if i != len(bpy.context.scene.ovlist)-1:
                pa = colrow.operator("ovlist.move_down", text="", icon="TRIA_DOWN")
                pa.index = i                
            if i > 0:
                p = colrow.operator("ovlist.move_up", text="", icon="TRIA_UP")
                p.index = i
            pb = colrow.operator("ovlist.kill", text="", icon="X")            
            pb.index = i

 
class OscOverridesUp (bpy.types.Operator): 
    bl_idname = 'ovlist.move_up'
    bl_label = 'Move Override up'
    bl_options = {'INTERNAL'}
   
    index = bpy.props.IntProperty(min=0)
   
    @classmethod
    def poll(self,context):
        return len(context.scene.ovlist) 
    def execute(self,context):
        ovlist = context.scene.ovlist
        ovlist.move(self.index,self.index-1) 

        return {'FINISHED'}   

class OscOverridesDown (bpy.types.Operator): 
    bl_idname = 'ovlist.move_down'
    bl_label = 'Move Override down'
    bl_options = {'INTERNAL'}
   
    index = bpy.props.IntProperty(min=0)
   
    @classmethod
    def poll(self,context):
        return len(context.scene.ovlist) 
    def execute(self,context):
        ovlist = context.scene.ovlist
        ovlist.move(self.index,self.index+1) 
        return {'FINISHED'}              

class OscOverridesKill (bpy.types.Operator): 
    bl_idname = 'ovlist.kill'
    bl_label = 'Kill Override'
    bl_options = {'INTERNAL'}
   
    index = bpy.props.IntProperty(min=0)
   
    @classmethod
    def poll(self,context):
        return len(context.scene.ovlist) 
    def execute(self,context):
        ovlist = context.scene.ovlist  
        ovlist.remove(self.index)  
        return {'FINISHED'}              


class OscOverridesProp(bpy.types.PropertyGroup):
    matoverride = bpy.props.StringProperty() 
    grooverride = bpy.props.StringProperty()        
        
bpy.utils.register_class(OscOverridesGUI)
bpy.utils.register_class(OscOverridesProp)
bpy.types.Scene.ovlist = bpy.props.CollectionProperty(type=OscOverridesProp)        


class OscTransferOverrides (bpy.types.Operator):    
    """Tooltip"""
    bl_idname = "render.overrides_transfer"
    bl_label = "Transfer Overrides"

    def execute(self, context):
        # CREO LISTA
        OSCOV = [[OVERRIDE.grooverride,OVERRIDE.matoverride]for OVERRIDE in bpy.context.scene.ovlist[:] if OVERRIDE.matoverride != "" if OVERRIDE.grooverride != ""]

        bpy.context.scene.overrides = str(OSCOV)
        return {'FINISHED'}   
    
class OscAddOverridesSlot (bpy.types.Operator):    
    """Tooltip"""
    bl_idname = "render.overrides_add_slot"
    bl_label = "Add Override Slot"

    def execute(self, context):
        prop = bpy.context.scene.ovlist.add()
        prop.matoverride = ""
        prop.grooverride = ""
        return {'FINISHED'}      

class OscRemoveOverridesSlot (bpy.types.Operator):    
    """Tooltip"""
    bl_idname = "render.overrides_remove_slot"
    bl_label = "Remove Override Slot"

    def execute(self, context):
        bpy.context.scene.ovlist.remove(len(bpy.context.scene.ovlist)-1)
        return {'FINISHED'} 
    
bpy.utils.register_class(OscTransferOverrides)
bpy.utils.register_class(OscAddOverridesSlot)
bpy.utils.register_class(OscRemoveOverridesSlot)