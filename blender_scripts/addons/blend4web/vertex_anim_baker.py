import bpy
import mathutils
import math
import os

class VertexAnimVertex(bpy.types.PropertyGroup):
    # combine to single 6 dimensional vector to prevent some strange performance
    # penalties
    posnor = bpy.props.FloatVectorProperty(name="PosNor", subtype="NONE",
            unit="NONE", size=6)

class VertexAnimFrame(bpy.types.PropertyGroup):
    vertices = bpy.props.CollectionProperty(type=VertexAnimVertex,
        name="Vertices")
 
class VertexAnim(bpy.types.PropertyGroup):
    frames = bpy.props.CollectionProperty(type=VertexAnimFrame, name="Frames")
    frame_start = bpy.props.IntProperty(name="Start", 
            description="First frame of vertex animation",
            default=0, min=0, max=300000, soft_min=0, soft_max=30000, 
            subtype="TIME")
    frame_end = bpy.props.IntProperty(name="End", 
            description="End frame of vertex animation",
            default=0, min=0, max=300000, soft_min=0, soft_max=30000, 
            subtype="TIME")

    averaging = bpy.props.BoolProperty(name="Averaging", 
            description="Perform vertex animation averaging: mix end " +
            "frames with first ones", default=False)
    averaging_interval  = bpy.props.IntProperty(name="Interval",
            description="Averaging interval",
            default=5, min=0, max=1000, soft_min=1, soft_max=50,
            subtype="TIME")

    allow_nla = bpy.props.BoolProperty(name="Allow NLA", 
            description="Allow animation to be controlled by the NLA",
            default=True)


class B4W_VertexAnimBakerPanel(bpy.types.Panel):
    bl_label = "Bake Vertex Animation"
    bl_idname = "OBJECT_PT_va_baker"
    bl_space_type = "VIEW_3D"
    bl_region_type = "TOOLS"
    bl_category = "Blend4Web"

    @classmethod
    def poll(self, context):
        try:
            ob = context.active_object
            return (ob.type == 'MESH')
        except AttributeError:
            return False

    def draw(self, context):
        obj = context.active_object

        layout = self.layout
        
        # vertex animation view
        row = layout.row()
        row.template_list("UI_UL_list", "OBJECT_UL_va_baker", obj,
                "b4w_vertex_anim", obj, "b4w_vertex_anim_index", rows=3)
        col = row.column(align=True)
        col.operator("b4w.vertex_anim_add", icon='ZOOMIN', text="")
        col.operator("b4w.vertex_anim_remove", icon='ZOOMOUT', text="")

        # controls only for non-empty vertex animation view
        va = obj.b4w_vertex_anim
        if not va:
            return

        va_index = obj.b4w_vertex_anim_index

        row = layout.row()
        row.prop(va[va_index], "name", text="Name")

        row = layout.row(align=True)
        row.prop(va[va_index], "frame_start")
        row.prop(va[va_index], "frame_end")

        row = layout.row(align=True)
        row.prop(va[va_index], "averaging")
        row.prop(va[va_index], "averaging_interval")

        row = layout.row()
        row.prop(va[va_index], "allow_nla")

        row = layout.row()
        if va[va_index].frames:
            row.label(text="Status: " + str(len(va[va_index].frames)) + 
                    " frames recorded")
        else:
            row.label(text="Status: Empty")

        row = layout.row()
        row.operator("b4w.vertex_anim_bake", text="Bake", icon="REC")

        
class B4W_VertexAnimAddOperator(bpy.types.Operator):
    bl_idname      = 'b4w.vertex_anim_add'
    bl_label       = "Add vertex animation"
    bl_description = "Add vertex animation"
    bl_options = {"INTERNAL"}

    def invoke(self, context, event):
        obj = context.active_object

        va = obj.b4w_vertex_anim

        va.add()
        va[-1].name= "New Anim"
        va[-1].frame_start = context.scene.frame_start
        va[-1].frame_end = context.scene.frame_end

        return{'FINISHED'}
 
 
class B4W_VertexAnimRemOperator(bpy.types.Operator):
    bl_idname      = 'b4w.vertex_anim_remove'
    bl_label       = "Remove vertex animation"
    bl_description = "Remove vertex animation"
    bl_options = {"INTERNAL"}

    def invoke(self, context, event):
        obj = context.active_object
       
        va = obj.b4w_vertex_anim
       
        if obj.b4w_vertex_anim_index >= 0:
           va.remove(obj.b4w_vertex_anim_index)
           obj.b4w_vertex_anim_index -= 1

        return{'FINISHED'}

class B4W_VertexAnimBakeOperator(bpy.types.Operator):
    bl_idname      = 'b4w.vertex_anim_bake'
    bl_label       = "Bake vertex animation"
    bl_description = "Bake vertex animation"
    bl_options = {"INTERNAL"}

    def bake_frame(self, mesh, va_frame):
        """Bake only vertices, other params can be extracted from mesh"""

        va_verts = va_frame.vertices

        for vertex in mesh.vertices:
            va_verts.add()
            co = vertex.co
            normal = vertex.normal
            # rotate by 90 degrees around X axis
            va_verts[-1].posnor = [co[0], co[2], -co[1],
                                    normal[0], normal[2], -normal[1]]

    def bake(self, obj, va_item):

        if obj.type != "MESH": return False

        mesh = obj.data
        current_frame = bpy.context.scene.frame_current
        frames = va_item.frames
        # remove old elements
        if frames:
            for i in range(len(frames)):
                # NOTE: consider more optimizied version
                frames.remove(0)

        start = va_item.frame_start
        end = va_item.frame_end

        for frame in range(start, end + 1):
            bpy.context.scene.frame_set(frame)

            mesh_tmp = obj.to_mesh(bpy.context.scene, True, 'PREVIEW')
            frames.add()
            # save frame number as string (for user convenience)
            frames[-1].name = str(frame)
            self.bake_frame(mesh_tmp, frames[-1])
            # cleanup
            bpy.data.meshes.remove(mesh_tmp)
        bpy.context.scene.frame_set(current_frame)
        return True

    def find_deform_object(self, obj):
        """Try to find object which deforms given obj"""
        for mod in obj.modifiers:
            if mod.type == "MESH_DEFORM":
                return mod.object

        return None
        

    def invoke(self, context, event):
        obj = context.active_object
       
        va = obj.b4w_vertex_anim
        va_index = obj.b4w_vertex_anim_index

        if va_index < len(va):
            self.report({"INFO"}, "Bake start")

            if self.bake(obj, va[va_index]):
                self.report({"INFO"}, "Bake finish")
            else:
                self.report({"ERROR"}, "Bake error")

        return{'FINISHED'}


def register(): 
    bpy.utils.register_class(VertexAnimVertex)
    bpy.utils.register_class(VertexAnimFrame)
    bpy.utils.register_class(VertexAnim)

    bpy.utils.register_class(B4W_VertexAnimBakerPanel)

    bpy.utils.register_class(B4W_VertexAnimAddOperator)
    bpy.utils.register_class(B4W_VertexAnimRemOperator)
    bpy.utils.register_class(B4W_VertexAnimBakeOperator)

    bpy.types.Object.b4w_vertex_anim =\
            bpy.props.CollectionProperty(type=VertexAnim,
                name="B4W: vertex animation")
    bpy.types.Object.b4w_vertex_anim_index =\
            bpy.props.IntProperty(name="B4W: vertex animation index")


def unregister(): 
    bpy.utils.unregister_class(VertexAnim)
    bpy.utils.unregister_class(VertexAnimFrame)
    bpy.utils.unregister_class(VertexAnimVertex)

    bpy.utils.unregister_class(B4W_VertexAnimBakerPanel)

    bpy.utils.unregister_class(B4W_VertexAnimAddOperator)
    bpy.utils.unregister_class(B4W_VertexAnimRemOperator)
    bpy.utils.unregister_class(B4W_VertexAnimBakeOperator)
