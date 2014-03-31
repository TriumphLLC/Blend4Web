import bpy
import math
import os


## ------------- CHECK OVERRIDE LIST EXIST -----------------

def checkOverridesExist():
    for scene in bpy.data.scenes[:]:
        try:
            scene["OVERRIDE"]
        except:
            scene["OVERRIDE"] = "[]"


##-------------------------------- RENDER ALL SCENES ----------------------------


def defRenderAll (frametype):
    
    checkOverridesExist()
    
    LISTMAT=[]
    SCENES=bpy.data.scenes[:]
    ACTSCENE=bpy.context.scene
    FC=bpy.context.scene.frame_current
    FS=bpy.context.scene.frame_start
    FE=bpy.context.scene.frame_end
    print("---------------------")
    for OBJECT in bpy.data.objects[:]:
        SLOTLIST=[]
        try:
            if OBJECT.type=="MESH" or OBJECT.type == "META" or OBJECT.type == "CURVE":
                for SLOT in OBJECT.material_slots[:]:
                    SLOTLIST.append(SLOT.material)
                LISTMAT.append((OBJECT,SLOTLIST))
        except:
            pass
    for SCENE in SCENES:
        PROPTOLIST=list(eval(SCENE['OVERRIDE']))
        CURSC= SCENE.name
        PATH = SCENE.render.filepath
        ENDPATH = PATH
        FILEPATH=bpy.data.filepath
        bpy.context.window.screen.scene=SCENE
        if frametype == True:
            bpy.context.scene.frame_start=FC
            bpy.context.scene.frame_end=FC
            bpy.context.scene.frame_end=FC
            bpy.context.scene.frame_start=FC
        try:
            for OVERRIDE in PROPTOLIST:
                for OBJECT in bpy.data.groups[OVERRIDE[0]].objects[:]:
                    if OBJECT.type == "MESH" or OBJECT.type == "META" or OBJECT.type == "CURVE":
                        for SLOT in OBJECT.material_slots[:]:
                            SLOT.material=bpy.data.materials[OVERRIDE[1]]
        except:
            pass
        SCENENAME=os.path.basename(FILEPATH.rpartition(".")[0])
        LAYERLIST=[]
        for layer in SCENE.render.layers:
            if layer.use == 1:
                LAYERLIST.append(layer)
        for layers in LAYERLIST:
            for rl in LAYERLIST:
                rl.use= 0
            print("SCENE: "+CURSC)
            print("LAYER: "+layers.name)
            print("OVERRIDE: "+str(PROPTOLIST))
            SCENE.render.filepath = os.path.join(PATH,SCENENAME,CURSC,layers.name,"%s_%s_%s" % (SCENENAME,SCENE.name,layers.name))
            SCENE.render.layers[layers.name].use = 1
            bpy.ops.render.render(animation=True, write_still=True, layer=layers.name, scene= SCENE.name)
            print("DONE")
            print("---------------------")
        for layer in LAYERLIST:
            layer.use = 1
        SCENE.render.filepath = ENDPATH
        for OBJECT in LISTMAT:
            SLOTIND=0
            try:
                for SLOT in OBJECT[1]:
                    OBJECT[0].material_slots[SLOTIND].material=SLOT
                    SLOTIND+=1
            except:
                print("OUT OF RANGE")
        if frametype == True:
            SCENE.frame_start=FS
            SCENE.frame_end=FE
            SCENE.frame_end=FE
            SCENE.frame_start=FS
    bpy.context.window.screen.scene=ACTSCENE


class renderAll (bpy.types.Operator):
    bl_idname="render.render_all_scenes_osc"
    bl_label="Render All Scenes"

    frametype=bpy.props.BoolProperty(default=False)

    def execute(self,context):
        defRenderAll(self.frametype)
        return {'FINISHED'}


##--------------------------------RENDER SELECTED SCENES----------------------------

bpy.types.Scene.use_render_scene = bpy.props.BoolProperty()

def defRenderSelected(frametype):
    
    checkOverridesExist()
    
    ACTSCENE = bpy.context.scene
    LISTMAT = []
    SCENES = bpy.data.scenes[:]
    FC = bpy.context.scene.frame_current
    FS = bpy.context.scene.frame_start
    FE = bpy.context.scene.frame_end
    for OBJECT in bpy.data.objects[:]:
        SLOTLIST=[]
        try:
            if OBJECT.type == "MESH" or OBJECT.type == "META" or OBJECT.type == "CURVE":
                for SLOT in OBJECT.material_slots[:]:
                    SLOTLIST.append(SLOT.material)

                LISTMAT.append((OBJECT,SLOTLIST))
        except:
            pass
    for SCENE in SCENES:
        if SCENE.use_render_scene:
            PROPTOLIST = list(eval(SCENE['OVERRIDE']))
            CURSC = SCENE.name
            PATH = SCENE.render.filepath
            ENDPATH = PATH
            FILEPATH = bpy.data.filepath
            print("---------------------")
            bpy.context.window.screen.scene = SCENE
            if frametype  ==  True:
                bpy.context.scene.frame_start = FC
                bpy.context.scene.frame_end = FC
                bpy.context.scene.frame_end = FC
                bpy.context.scene.frame_start = FC
            try:
                for OVERRIDE in PROPTOLIST:
                    for OBJECT in bpy.data.groups[OVERRIDE[0]].objects[:]:
                        if OBJECT.type == "MESH" or OBJECT.type == "META" or OBJECT.type == "CURVE":
                            for SLOT in OBJECT.material_slots[:]:
                                SLOT.material=bpy.data.materials[OVERRIDE[1]]
            except:
                pass
            SCENENAME=os.path.basename(FILEPATH.rpartition(".")[0])
            LAYERLIST=[]
            for layer in SCENE.render.layers:
                if layer.use == 1:
                    LAYERLIST.append(layer)
            for layers in LAYERLIST:
                for rl in LAYERLIST:
                    rl.use= 0
                print("SCENE: "+CURSC)
                print("LAYER: "+layers.name)
                print("OVERRIDE: "+str(PROPTOLIST))
                SCENE.render.filepath = os.path.join(PATH,SCENENAME,CURSC,layers.name,"%s_%s_%s" % (SCENENAME,SCENE.name,layers.name))
                SCENE.render.layers[layers.name].use = 1
                bpy.ops.render.render(animation=True, layer=layers.name, write_still=True, scene= SCENE.name)
                print("DONE")
                print("---------------------")
            for layer in LAYERLIST:
                layer.use = 1
            SCENE.render.filepath = ENDPATH
            for OBJECT in LISTMAT:
                SLOTIND = 0
                try:
                    for SLOT in OBJECT[1]:
                        OBJECT[0].material_slots[SLOTIND].material = SLOT
                        SLOTIND += 1
                except:
                    print("OUT OF RANGE")
            if frametype == True:
                SCENE.frame_start = FS
                SCENE.frame_end = FE
                SCENE.frame_end = FE
                SCENE.frame_start = FS
    bpy.context.window.screen.scene = ACTSCENE

class renderSelected (bpy.types.Operator):
    bl_idname="render.render_selected_scenes_osc"
    bl_label="Render Selected Scenes"

    frametype=bpy.props.BoolProperty(default=False)

    def execute(self,context):
        defRenderSelected(self.frametype)
        return {'FINISHED'}

##--------------------------------RENDER CURRENT SCENE----------------------------

def defRenderCurrent (frametype):
    
    checkOverridesExist()
    
    LISTMAT = []
    SCENE = bpy.context.scene
    FC = bpy.context.scene.frame_current
    FS = bpy.context.scene.frame_start
    FE = bpy.context.scene.frame_end

    print("---------------------")
    for OBJECT in bpy.data.objects[:]:
        SLOTLIST = []
        try:
            if OBJECT.type == "MESH" or OBJECT.type == "META" or OBJECT.type == "CURVE":
                for SLOT in OBJECT.material_slots[:]:
                    SLOTLIST.append(SLOT.material)
                LISTMAT.append((OBJECT,SLOTLIST))
        except:
            pass
    PROPTOLIST = list(eval(SCENE['OVERRIDE']))
    CURSC = SCENE.name
    PATH = SCENE.render.filepath
    ENDPATH = PATH
    FILEPATH = bpy.data.filepath
    if frametype == True:
        bpy.context.scene.frame_start = FC
        bpy.context.scene.frame_end = FC
        bpy.context.scene.frame_end = FC
        bpy.context.scene.frame_start = FC
    try:
        for OVERRIDE in PROPTOLIST:
            for OBJECT in bpy.data.groups[OVERRIDE[0]].objects[:]:
                if OBJECT.type == "MESH" or OBJECT.type == "META" or OBJECT.type == "CURVE":
                    for SLOT in OBJECT.material_slots[:]:
                        SLOT.material = bpy.data.materials[OVERRIDE[1]]
    except:
        pass
    SCENENAME=os.path.basename(FILEPATH.rpartition(".")[0])
    LAYERLIST=[]
    for layer in SCENE.render.layers:
        if layer.use == 1:
            LAYERLIST.append(layer)
    for layers in LAYERLIST:
        for rl in LAYERLIST:
            rl.use= 0
        print("SCENE: "+CURSC)
        print("LAYER: "+layers.name)
        print("OVERRIDE: "+str(PROPTOLIST))
        SCENE.render.filepath = os.path.join(PATH,SCENENAME,CURSC,layers.name,"%s_%s_%s" % (SCENENAME,SCENE.name,layers.name))
        SCENE.render.layers[layers.name].use = 1
        bpy.ops.render.render(animation=True, layer=layers.name, write_still=1, scene= SCENE.name)
        print("DONE")
        print("---------------------")
    for layer in LAYERLIST:
        layer.use = 1
    SCENE.render.filepath = ENDPATH
    for OBJECT in LISTMAT:
        SLOTIND = 0
        try:
            for SLOT in OBJECT[1]:
                OBJECT[0].material_slots[SLOTIND].material=SLOT
                SLOTIND += 1
        except:
            print("FUERA DE RANGO")
    if frametype == True:
        SCENE.frame_start = FS
        SCENE.frame_end = FE
        SCENE.frame_end = FE
        SCENE.frame_start = FS

class renderCurrent (bpy.types.Operator):
    bl_idname="render.render_current_scene_osc"
    bl_label="Render Current Scene"

    frametype=bpy.props.BoolProperty(default=False)

    def execute(self,context):

        defRenderCurrent(self.frametype)

        return {'FINISHED'}


##--------------------------RENDER CROP----------------------
bpy.types.Scene.rcPARTS = bpy.props.IntProperty(default=0, min=2, max=50, step=1)

def OscRenderCropFunc():
    
    checkOverridesExist()
    
    SCENENAME = os.path.split(bpy.data.filepath)[-1].partition(".")[0]
    PARTS = bpy.context.scene.rcPARTS
    CHUNKYSIZE = 1/PARTS
    FILEPATH = bpy.context.scene.render.filepath
    bpy.context.scene.render.use_border = True
    bpy.context.scene.render.use_crop_to_border = True
    for PART in range(PARTS):
        bpy.context.scene.render.border_min_y = PART*CHUNKYSIZE
        bpy.context.scene.render.border_max_y = (PART*CHUNKYSIZE)+CHUNKYSIZE
        bpy.context.scene.render.filepath = "%s_part%s" % (os.path.join(FILEPATH,SCENENAME,bpy.context.scene.name,SCENENAME),PART)
        bpy.ops.render.render(animation=False, write_still=True)
        
    bpy.context.scene.render.filepath = FILEPATH    
        
class renderCrop (bpy.types.Operator):
    bl_idname="render.render_crop_osc"
    bl_label="Render Crop: Render!"
    def execute(self,context):
        OscRenderCropFunc()
        return {'FINISHED'}

##---------------------------BATCH MAKER------------------
def defoscBatchMaker(TYPE):
    
    checkOverridesExist() # overrides list exist
    
    if os.sys.platform.startswith("w"):
        print("PLATFORM: WINDOWS")
        SYSBAR = os.sep
        EXTSYS = ".bat"
        QUOTES = '"'
    else:
        print("PLATFORM:LINUX")
        SYSBAR = os.sep
        EXTSYS = ".sh"
        QUOTES = ''
    
    FILENAME = bpy.data.filepath.rpartition(SYSBAR)[-1].rpartition(".")[0]
    BINDIR = bpy.app[4]
    SHFILE = os.path.join (bpy.data.filepath.rpartition(SYSBAR)[0] , FILENAME + EXTSYS)
    
    with open(SHFILE,"w") as FILE:
        # assign permission in linux
        if EXTSYS == ".sh":
            try:
                os.chmod(SHFILE, stat.S_IRWXU)
            except:
                print("** Oscurart Batch maker can not modify the permissions.")    
    
        FILE.writelines("%s%s%s -b %s -x 1 -o %s -P %s%s.py  -s %s -e %s -a" %
            (QUOTES,BINDIR,QUOTES,bpy.data.filepath,bpy.context.scene.render.filepath,bpy.data.filepath.rpartition(SYSBAR)[0]+
            SYSBAR,TYPE,str(bpy.context.scene.frame_start),str(bpy.context.scene.frame_end)) )

    
    RLATFILE =  "%s%sosRlat.py" % (bpy.data.filepath.rpartition(SYSBAR)[0] , SYSBAR )
    if not os.path.isfile(RLATFILE):
        with open(RLATFILE,"w")  as file:      
            if EXTSYS == ".sh":
                try:
                    os.chmod(RLATFILE, stat.S_IRWXU)  
                except:
                    print("** Oscurart Batch maker can not modify the permissions.")                             
            file.writelines("import bpy \nbpy.ops.render.render_all_scenes_osc()\nbpy.ops.wm.quit_blender()")

    else:
        print("The All Python files Skips: Already exist!")   
         
    RSLATFILE = "%s%sosRSlat.py" % (bpy.data.filepath.rpartition(SYSBAR)[0] , SYSBAR)    
    if not os.path.isfile(RSLATFILE):  
        with  open(RSLATFILE,"w")  as file:          
            if EXTSYS == ".sh":
                try:
                    os.chmod(RSLATFILE, stat.S_IRWXU)   
                except:
                    print("** Oscurart Batch maker can not modify the permissions.")                            
            file.writelines("import bpy \nbpy.ops.render.render_selected_scenes_osc()\nbpy.ops.wm.quit_blender()")
    else:
        print("The Selected Python files Skips: Already exist!")          

class oscBatchMaker (bpy.types.Operator):
    bl_idname = "file.create_batch_maker_osc"
    bl_label = "Make render batch"
    bl_options = {'REGISTER', 'UNDO'}

    type = bpy.props.EnumProperty(
            name="Render Mode",
            description="Select Render Mode.",
            items=(('osRlat', "All Scenes", "Render All Layers At Time"),
                   ('osRSlat', "Selected Scenes", "Render Only The Selected Scenes")),
            default='osRlat',
            )


    def execute(self,context):
        defoscBatchMaker(self.type)
        return {'FINISHED'}

## --------------------------------------PYTHON BATCH--------------------------------------------------------
def defoscPythonBatchMaker(BATCHTYPE,SIZE):
    
    checkOverridesExist() # overrides list exist
    
    # REVISO SISTEMA
    if os.sys.platform.startswith("w"):
        print("PLATFORM: WINDOWS")
        SYSBAR = "\\"
        EXTSYS = ".bat"
        QUOTES = '"'
    else:
        print("PLATFORM:LINUX")
        SYSBAR = "/"
        EXTSYS = ".sh"    
        QUOTES = ''
    
    # CREO VARIABLES
    FILENAME = bpy.data.filepath.rpartition(SYSBAR)[-1].rpartition(".")[0]
    SHFILE = "%s%s%s_PythonSecureBatch.py"   % (bpy.data.filepath.rpartition(SYSBAR)[0],SYSBAR,FILENAME)
    BATCHLOCATION = "%s%s%s%s"   % (bpy.data.filepath.rpartition(SYSBAR)[0],SYSBAR,FILENAME,EXTSYS)
    
    with open(SHFILE,"w") as FILEBATCH:
            
        if EXTSYS == ".bat":
            BATCHLOCATION=BATCHLOCATION.replace("\\","/")    
        
        # SI EL OUTPUT TIENE DOBLE BARRA LA REEMPLAZO
        FRO=bpy.context.scene.render.filepath        
        if bpy.context.scene.render.filepath.count("//"):
            FRO=bpy.context.scene.render.filepath.replace("//", bpy.data.filepath.rpartition(SYSBAR)[0]+SYSBAR)         
        if EXTSYS == ".bat":
            FRO=FRO.replace("\\","/")                
                     
        #CREO BATCH
        bpy.ops.file.create_batch_maker_osc(type=BATCHTYPE)
        
        SCRIPT = "import os \nREPITE= True \nBAT= '%s'\nSCENENAME ='%s' \nDIR='%s%s' \ndef RENDER():\n    os.system(BAT) \ndef CLEAN():\n    global REPITE\n    FILES  = [root+'/'+FILE for root, dirs, files in os.walk(os.getcwd()) if len(files) > 0 for FILE in files if FILE.count('~') == False]\n    RESPUESTA=False\n    for FILE in FILES:\n        if os.path.getsize(FILE) < %s:\n            os.remove(FILE)\n            RESPUESTA= True\n    if RESPUESTA:\n        REPITE=True\n    else:\n        REPITE=False\nREPITE=True\nwhile REPITE:\n    REPITE=False\n    RENDER()\n    os.chdir(DIR)\n    CLEAN()" % (BATCHLOCATION,FILENAME,FRO,FILENAME,SIZE)        
        
        # DEFINO ARCHIVO DE BATCH
        FILEBATCH.writelines(SCRIPT)    
    
    
    # ARCHIVO CALL
    CALLFILENAME = bpy.data.filepath.rpartition(SYSBAR)[-1].rpartition(".")[0]
    CALLFILE = "%s%s%s_CallPythonSecureBatch%s"   % (bpy.data.filepath.rpartition(SYSBAR)[0],SYSBAR,CALLFILENAME,EXTSYS)  

    with open(CALLFILE,"w") as CALLFILEBATCH:
        
        SCRIPT = "python %s" % (SHFILE)
        CALLFILEBATCH.writelines(SCRIPT)
  
    if EXTSYS == ".sh":
        try:
            os.chmod(CALLFILE, stat.S_IRWXU)  
            os.chmod(SHFILE, stat.S_IRWXU) 
        except:
            print("** Oscurart Batch maker can not modify the permissions.")      

    
class oscPythonBatchMaker (bpy.types.Operator):
    bl_idname = "file.create_batch_python"
    bl_label = "Make Batch Python"
    bl_options = {'REGISTER', 'UNDO'}

    size = bpy.props.IntProperty(name="Size in Bytes", default=10, min=0)
    
    type = bpy.props.EnumProperty(
            name="Render Mode",
            description="Select Render Mode.",
            items=(('osRlat', "All Scenes", "Render All Layers At Time"),
                   ('osRSlat', "Selected Scenes", "Render Only The Selected Scenes")),
            default='osRlat',
            )

    def execute(self,context):
        defoscPythonBatchMaker(self.type, self.size)
        return {'FINISHED'}
 
