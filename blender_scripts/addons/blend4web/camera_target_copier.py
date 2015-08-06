import bpy
import mathutils

class B4W_Camera_Target_Copier(bpy.types.Operator):
    '''Use cursor location as camera target'''
    bl_idname = "b4w.camera_target_copy"
    bl_label = "B4W Camera Target Copy"
    bl_options = {"INTERNAL"}
   
    def execute(self, context):
        run()
        return {"FINISHED"}

def run():

    # get 3D cursor location and copy it to camera b4w_target
    cursor_location = mathutils.Vector((0, 0, 0))

    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    cursor_location = space.cursor_location

    cam = bpy.context.scene.camera
    if cam:
        cam.data.b4w_target = cursor_location

        
def register(): 
    bpy.utils.register_class(B4W_Camera_Target_Copier)

def unregister():
    bpy.utils.unregister_class(B4W_Camera_Target_Copier)

