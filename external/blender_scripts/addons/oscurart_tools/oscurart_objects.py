import bpy
import math
import sys
import os
import stat
import bmesh
import time
import random

##------------------------ SEARCH AND SELECT ------------------------

## SETEO VARIABLE DE ENTORNO
bpy.types.Scene.SearchAndSelectOt = bpy.props.StringProperty(default="Object name initials")


class SearchAndSelectOt(bpy.types.Operator):
    bl_idname = "object.search_and_select_osc"
    bl_label = "Search And Select"
    bl_options = {"REGISTER", "UNDO"}
    
    start = bpy.props.BoolProperty(name="Start With", default=True)
    count = bpy.props.BoolProperty(name="Contain", default=True)
    end = bpy.props.BoolProperty(name="End", default=True)
    
    def execute(self, context):
        for objeto in bpy.context.scene.objects:
            variableNombre = bpy.context.scene.SearchAndSelectOt
            if self.start:
                if objeto.name.startswith(variableNombre):
                    objeto.select = True
            if self.count:
                if objeto.name.count(variableNombre):
                    objeto.select = True        
            if self.end:
                if objeto.name.count(variableNombre):
                    objeto.select = True                          
        return {'FINISHED'}


##-------------------------RENAME OBJECTS----------------------------------

## CREO VARIABLE
bpy.types.Scene.RenameObjectOt = bpy.props.StringProperty(default="Type here")

class renameObjectsOt (bpy.types.Operator):
    bl_idname = "object.rename_objects_osc"
    bl_label = "Rename Objects"
    bl_options = {"REGISTER", "UNDO"}
    def execute(self,context):
        listaObj = bpy.context.selected_objects[:]
        for objeto in listaObj:
            objeto.name = bpy.context.scene.RenameObjectOt
        return {'FINISHED'}


##------------------------ DUPLICATE OBJECTS SYMMETRY ------------------------

def duplicateSymmetrical (self, disconect):
    for objeto in bpy.context.selected_objects:

        OBSEL = objeto
        bpy.ops.object.select_all(action='DESELECT')
        objeto.select = 1
        bpy.context.scene.objects.active = objeto
        bpy.ops.object.duplicate(linked=1)
        OBDUP=bpy.context.active_object
        print(OBDUP)
        OBDUP.driver_add("location")
        OBDUP.animation_data.drivers[0].driver.expression = "-var"
        OBDUP.animation_data.drivers[0].driver.variables.new()
        OBDUP.animation_data.drivers[0].driver.variables[0].type = "TRANSFORMS"
        OBDUP.animation_data.drivers[0].driver.variables[0].targets[0].id = objeto
        OBDUP.animation_data.drivers[0].driver.variables[0].targets[0].transform_type = 'LOC_X'
        OBDUP.animation_data.drivers[1].driver.expression = "var"
        OBDUP.animation_data.drivers[1].driver.variables.new()
        OBDUP.animation_data.drivers[1].driver.variables[0].type = "TRANSFORMS"
        OBDUP.animation_data.drivers[1].driver.variables[0].targets[0].id = objeto
        OBDUP.animation_data.drivers[1].driver.variables[0].targets[0].transform_type = 'LOC_Y'
        OBDUP.animation_data.drivers[2].driver.expression = "var"
        OBDUP.animation_data.drivers[2].driver.variables.new()
        OBDUP.animation_data.drivers[2].driver.variables[0].type = "TRANSFORMS"
        OBDUP.animation_data.drivers[2].driver.variables[0].targets[0].id = objeto
        OBDUP.animation_data.drivers[2].driver.variables[0].targets[0].transform_type = 'LOC_Z'
        OBDUP.driver_add("scale")
        OBDUP.animation_data.drivers[3].driver.expression = "-var"
        OBDUP.animation_data.drivers[3].driver.variables.new()
        OBDUP.animation_data.drivers[3].driver.variables[0].type = "TRANSFORMS"
        OBDUP.animation_data.drivers[3].driver.variables[0].targets[0].id = objeto
        OBDUP.animation_data.drivers[3].driver.variables[0].targets[0].transform_type = 'SCALE_X'
        OBDUP.animation_data.drivers[4].driver.expression = "var"
        OBDUP.animation_data.drivers[4].driver.variables.new()
        OBDUP.animation_data.drivers[4].driver.variables[0].type = "TRANSFORMS"
        OBDUP.animation_data.drivers[4].driver.variables[0].targets[0].id = objeto
        OBDUP.animation_data.drivers[4].driver.variables[0].targets[0].transform_type = 'SCALE_Y'
        OBDUP.animation_data.drivers[5].driver.expression = "var"
        OBDUP.animation_data.drivers[5].driver.variables.new()
        OBDUP.animation_data.drivers[5].driver.variables[0].type = "TRANSFORMS"
        OBDUP.animation_data.drivers[5].driver.variables[0].targets[0].id = objeto
        OBDUP.animation_data.drivers[5].driver.variables[0].targets[0].transform_type = 'SCALE_Z'
        OBDUP.driver_add("rotation_euler")
        OBDUP.animation_data.drivers[6].driver.expression = "var"
        OBDUP.animation_data.drivers[6].driver.variables.new()
        OBDUP.animation_data.drivers[6].driver.variables[0].type = "TRANSFORMS"
        OBDUP.animation_data.drivers[6].driver.variables[0].targets[0].id = objeto
        OBDUP.animation_data.drivers[6].driver.variables[0].targets[0].transform_type = 'ROT_X'
        OBDUP.animation_data.drivers[7].driver.expression = "-var"
        OBDUP.animation_data.drivers[7].driver.variables.new()
        OBDUP.animation_data.drivers[7].driver.variables[0].type = "TRANSFORMS"
        OBDUP.animation_data.drivers[7].driver.variables[0].targets[0].id = objeto
        OBDUP.animation_data.drivers[7].driver.variables[0].targets[0].transform_type = 'ROT_Y'
        OBDUP.animation_data.drivers[8].driver.expression = "-var"
        OBDUP.animation_data.drivers[8].driver.variables.new()
        OBDUP.animation_data.drivers[8].driver.variables[0].type = "TRANSFORMS"
        OBDUP.animation_data.drivers[8].driver.variables[0].targets[0].id = objeto
        OBDUP.animation_data.drivers[8].driver.variables[0].targets[0].transform_type = 'ROT_Z'

        if disconect != True:
            bpy.ops.object.make_single_user(obdata=True, object=True)
            bpy.context.active_object.driver_remove("location")
            bpy.context.active_object.driver_remove("rotation_euler")
            bpy.context.active_object.driver_remove("scale")

class oscDuplicateSymmetricalOp (bpy.types.Operator):
    bl_idname = "object.duplicate_object_symmetry_osc"
    bl_label = "Oscurart Duplicate Symmetrical"
    bl_options = {"REGISTER", "UNDO"}

    desconecta = bpy.props.BoolProperty(name="Keep Connection", default=True)

    def execute(self,context):

        duplicateSymmetrical(self, self.desconecta)

        return {'FINISHED'}

##---------------------------REMOVE MODIFIERS Y APPLY MODIFIERS------------------

class oscRemModifiers (bpy.types.Operator):
    bl_idname = "object.modifiers_remove_osc"
    bl_label = "Remove modifiers"
    bl_options = {"REGISTER", "UNDO"}
    def execute(self,context):
        for objeto in bpy.context.selected_objects:
            for modificador in objeto.modifiers:
                print(modificador.type)
                bpy.context.scene.objects.active=objeto
                bpy.ops.object.modifier_remove(modifier=modificador.name)
        return {'FINISHED'}

class oscApplyModifiers (bpy.types.Operator):
    bl_idname = "object.modifiers_apply_osc"
    bl_label = "Apply modifiers"
    bl_options = {"REGISTER", "UNDO"}
    def execute(self,context):
        for objeto in bpy.context.selected_objects:
            bpy.ops.object.select_all(action='DESELECT')
            bpy.context.scene.objects.active=objeto
            objeto.select = True
            if objeto.data.users >= 2:
                bpy.ops.object.make_single_user(type='SELECTED_OBJECTS', object=True, obdata=True, material=False, texture=False, animation=False)
            for modificador in objeto.modifiers:
                try:
                    bpy.ops.object.modifier_apply(apply_as="DATA", modifier=modificador.name)
                except:
                    bpy.ops.object.modifier_remove(modifier=modificador.name) 
                    print("* Modifier %s skipping apply" % (modificador.name))   

        return {'FINISHED'}


## ------------------------------------ RELINK OBJECTS--------------------------------------


def relinkObjects (self):

    LISTSCENE=[]

    for SCENE in bpy.data.scenes[:]:
        if bpy.selection_osc[-1] in SCENE.objects[:]:
            LISTSCENE.append(SCENE)

    OBJECTS = bpy.selection_osc[:-1]
    ACTOBJ = bpy.selection_osc[-1] 
    OBJSEL = bpy.selection_osc[:]

    LISTSCENE.remove(bpy.context.scene)

    bpy.ops.object.select_all(action='DESELECT')

    for OBJETO in OBJECTS:
        if OBJETO.users != len(bpy.data.scenes):
            print(OBJETO.name)
            OBJETO.select = True

    for SCENE in LISTSCENE:
        bpy.ops.object.make_links_scene(scene=SCENE.name)
    
    bpy.context.scene.objects.active=ACTOBJ
    for OBJ in OBJSEL:
        OBJ.select=True

class OscRelinkObjectsBetween (bpy.types.Operator):
    bl_idname = "object.relink_objects_between_scenes"
    bl_label = "Relink Objects Between Scenes"
    bl_options = {"REGISTER", "UNDO"}


    def execute (self, context):
        relinkObjects(self)
        return {'FINISHED'}


## ------------------------------------ COPY GROUPS AND LAYERS--------------------------------------


def CopyObjectGroupsAndLayers (self):

    OBSEL=bpy.selection_osc[:]
    GLOBALLAYERS=list(OBSEL[-1].layers[:])
    ACTSCENE=bpy.context.scene
    GROUPS=OBSEL[-1].users_group
    ACTOBJ=OBSEL[-1]
    
    for OBJECT in OBSEL[:-1]:
        for scene in bpy.data.scenes[:]:

            # SI EL OBJETO ACTIVO ESTA EN LA ESCENA
            if ACTOBJ in scene.objects[:] and OBJECT in scene.objects[:]:
                scene.object_bases[OBJECT.name].layers[:] = scene.object_bases[ACTOBJ.name].layers[:] 
            elif ACTOBJ not in scene.objects[:] and OBJECT in scene.objects[:]: 
                scene.object_bases[OBJECT.name].layers[:] = list(GLOBALLAYERS)                  
                
        # REMUEVO DE TODO GRUPO
        for GROUP in bpy.data.groups[:]:
            if GROUP in OBJECT.users_group[:]:
                GROUP.objects.unlink(OBJECT)
                
        # INCLUYO OBJETO EN GRUPOS    
        for GROUP in GROUPS:
            GROUP.objects.link(OBJECT)            
 
    bpy.context.window.screen.scene = ACTSCENE
    bpy.context.scene.objects.active=ACTOBJ
    
class OscCopyObjectGAL (bpy.types.Operator):
    bl_idname = "object.copy_objects_groups_layers"
    bl_label = "Copy Groups And Layers"
    bl_options = {"REGISTER", "UNDO"}


    def execute (self, context):
        CopyObjectGroupsAndLayers (self)
        return {'FINISHED'}



## ------------------------------------ SELECTION --------------------------------------
bpy.selection_osc=[]

def select_osc():
    if bpy.context.mode == "OBJECT":
        obj = bpy.context.object
        sel = len(bpy.context.selected_objects)

        if sel == 0:
            bpy.selection_osc=[]
        else:
            if sel == 1:
                bpy.selection_osc=[]
                bpy.selection_osc.append(obj)
            elif sel > len(bpy.selection_osc):
                for sobj in bpy.context.selected_objects:
                    if (sobj in bpy.selection_osc) == False:
                        bpy.selection_osc.append(sobj)

            elif sel < len(bpy.selection_osc):
                for it in bpy.selection_osc:
                    if (it in bpy.context.selected_objects) == False:
                        bpy.selection_osc.remove(it)

class OscSelection(bpy.types.Header):
    bl_label = "Selection Osc"
    bl_space_type = "VIEW_3D"

    def __init__(self):
        select_osc()

    def draw(self, context):
        """
        layout = self.layout
        row = layout.row()
        row.label("Sels: "+str(len(bpy.selection_osc)))
        """

##=============== DISTRIBUTE ======================    


def ObjectDistributeOscurart (self, X, Y, Z):
    if len(bpy.selection_osc[:]) > 1:
        # VARIABLES
        dif = bpy.selection_osc[-1].location-bpy.selection_osc[0].location
        chunkglobal = dif/(len(bpy.selection_osc[:])-1)
        chunkx = 0
        chunky = 0
        chunkz = 0
        deltafst = bpy.selection_osc[0].location
        
        #ORDENA
        for OBJECT in bpy.selection_osc[:]:          
            if X:  OBJECT.location.x=deltafst[0]+chunkx
            if Y:  OBJECT.location[1]=deltafst[1]+chunky
            if Z:  OBJECT.location.z=deltafst[2]+chunkz
            chunkx+=chunkglobal[0]
            chunky+=chunkglobal[1]
            chunkz+=chunkglobal[2]
    else:  
        self.report({'ERROR'}, "Selection is only 1!")      
    
class DialogDistributeOsc(bpy.types.Operator):
    bl_idname = "object.distribute_osc"
    bl_label = "Distribute Objects"       
    Boolx = bpy.props.BoolProperty(name="X")
    Booly = bpy.props.BoolProperty(name="Y")
    Boolz = bpy.props.BoolProperty(name="Z")
    
    def execute(self, context):
        ObjectDistributeOscurart(self, self.Boolx,self.Booly,self.Boolz)
        return {'FINISHED'}
    def invoke(self, context, event):
        self.Boolx = True
        self.Booly = True
        self.Boolz = True        
        return context.window_manager.invoke_props_dialog(self)




## ======================== SET LAYERS TO OTHER SCENES =====================================


def DefSetLayersToOtherScenes():
    actsc = bpy.context.screen.scene
    for object in bpy.context.selected_objects[:]:
        bpy.context.screen.scene = actsc  
        lyrs = object.layers[:]
        for scene in bpy.data.scenes[:]:
            if object in scene.objects[:]:
                bpy.context.screen.scene = scene
                object.layers = lyrs  
            else:
                print ("* %s is not in %s" % (object.name, scene.name))    
  
        
    bpy.context.screen.scene = actsc        
    
    
class SetLayersToOtherScenes (bpy.types.Operator):
    bl_idname = "object.set_layers_to_other_scenes"
    bl_label = "Copy actual Layers to Other Scenes"
    bl_options = {"REGISTER", "UNDO"}


    def execute (self, context):
        DefSetLayersToOtherScenes()
        return {'FINISHED'}