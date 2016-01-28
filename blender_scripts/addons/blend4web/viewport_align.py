import bpy
import math
import mathutils
import blend4web

b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_

class B4W_VieportAlignmentFit(bpy.types.Operator):
    '''Align object in viewport'''
    bl_idname = "b4w.viewport_alignment_fit"
    bl_label = p_("Fit to Camera", "Operator")
    bl_options = {"INTERNAL"}
   
    def execute(self, context):
        obj = context.object

        if not (obj.parent and obj.parent.type == "CAMERA" and 
                obj.b4w_enable_viewport_alignment):
            self.report({"ERROR"}, _("Wrong object"))
            return {"FINISHED"}

        cam_data = obj.parent.data

        alignment = obj.b4w_viewport_alignment.alignment
        distance = obj.b4w_viewport_alignment.distance

        # [top-right, bottom-right, bottom-left, top-left]
        view_frame = cam_data.view_frame(context.scene)

        top = view_frame[0][1]
        bottom = view_frame[1][1]
        left = view_frame[2][0]
        right = view_frame[0][0]
        depth = view_frame[0][2]

        if alignment == "TOP_LEFT":
            v = mathutils.Vector((left, top, depth))
        elif alignment == "TOP":
            v = mathutils.Vector((0, top, depth))
        elif alignment == "TOP_RIGHT":
            v = mathutils.Vector((right, top, depth))
        elif alignment == "LEFT":
            v = mathutils.Vector((left, 0, depth))
        elif alignment == "CENTER":
            v = mathutils.Vector((0, 0, depth))
        elif alignment == "RIGHT":
            v = mathutils.Vector((right, 0, depth))
        elif alignment == "BOTTOM_LEFT":
            v = mathutils.Vector((left, bottom, depth))
        elif alignment == "BOTTOM":
            v = mathutils.Vector((0, bottom, depth))
        elif alignment == "BOTTOM_RIGHT":
            v = mathutils.Vector((right, bottom, depth))

        if cam_data.type == "PERSP":
            v = v.normalized()
            scale = distance / abs(v[2])
            v *= scale
        elif cam_data.type == "ORTHO":
            v[2] = -distance
        else:
            self.report({"ERROR"}, _("Unsupported camera type"))
            return {"FINISHED"}
        
        # convert location in local space to object location
        mat_inv_parent = obj.matrix_parent_inverse
        v = mat_inv_parent.inverted_safe() * v

        obj.location[0] = v[0]
        obj.location[1] = v[1]
        obj.location[2] = v[2]
        
        return {"FINISHED"}


