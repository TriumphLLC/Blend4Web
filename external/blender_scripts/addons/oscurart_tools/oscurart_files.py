import bpy
import math
import sys
import os
import stat
import bmesh
import time
import random

##---------------------------RELOAD IMAGES------------------
class reloadImages (bpy.types.Operator):
    bl_idname = "image.reload_images_osc"
    bl_label = "Reload Images"
    bl_options = {"REGISTER", "UNDO"}
    def execute(self,context):
        for imgs in bpy.data.images:
            imgs.reload()
        return {'FINISHED'}


##------------------------ SAVE INCREMENTAL ------------------------

class saveIncremental(bpy.types.Operator):
    bl_idname = "file.save_incremental_osc"
    bl_label = "Save Incremental File"
    bl_options = {"REGISTER", "UNDO"}
    def execute(self, context):     
        filepath = bpy.data.filepath        
        if filepath.count("_v"):
            strnum = filepath.rpartition("_v")[-1].rpartition(".blend")[0]
            intnum = int(strnum)
            modnum = strnum.replace(str(intnum),str(intnum+1))    
            output = filepath.replace(strnum,modnum)
            basename = os.path.basename(filepath)            
            bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.path.dirname(filepath),"%s_v%s.blend" % (basename.rpartition("_v")[0],str(modnum))))

        else:
            output = filepath.rpartition(".blend")[0]+"_v01"
            bpy.ops.wm.save_as_mainfile(filepath=output)         
        
        return {'FINISHED'}

##------------------------ REPLACE FILE PATHS ------------------------

bpy.types.Scene.oscSearchText = bpy.props.StringProperty(default="Search Text")
bpy.types.Scene.oscReplaceText = bpy.props.StringProperty(default="Replace Text")

class replaceFilePath(bpy.types.Operator):
    bl_idname = "file.replace_file_path_osc"
    bl_label = "Replace File Path"
    bl_options = {"REGISTER", "UNDO"}
    def execute(self, context):
        TEXTSEARCH = bpy.context.scene.oscSearchText
        TEXTREPLACE = bpy.context.scene.oscReplaceText

        for image in bpy.data.images:
            image.filepath = image.filepath.replace(TEXTSEARCH,TEXTREPLACE)

        return {'FINISHED'}