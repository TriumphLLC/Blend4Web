# Copyright (C) 2014-2017 Triumph LLC
# 
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.


import bpy
import mathutils
import math
import os
import blend4web

b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_

class VertexAnimVertex(bpy.types.PropertyGroup):
    # combine to single 6 dimensional vector to prevent some strange performance
    # penalties
    posnor = bpy.props.FloatVectorProperty(name=_("PosNor"), subtype="NONE",
            unit="NONE", size=6)

class VertexAnimFrame(bpy.types.PropertyGroup):
    vertices = bpy.props.CollectionProperty(type=VertexAnimVertex,
        name=_("Vertices"))
 
class VertexAnim(bpy.types.PropertyGroup):
    frames = bpy.props.CollectionProperty(type=VertexAnimFrame, name=_("Frames"))
    frame_start = bpy.props.IntProperty(name=_("Start"), 
            description=_("First frame of vertex animation"),
            default=0, min=0, max=300000, soft_min=0, soft_max=30000, 
            subtype="TIME")
    frame_end = bpy.props.IntProperty(name=_("End"), 
            description=_("End frame of vertex animation"),
            default=0, min=0, max=300000, soft_min=0, soft_max=30000, 
            subtype="TIME")

    averaging = bpy.props.BoolProperty(name=_("Averaging"), 
            description=_("Perform vertex animation averaging: mix end ") +
            "frames with first ones", default=False)
    averaging_interval  = bpy.props.IntProperty(name=_("Interval"),
            description=_("Averaging interval"),
            default=5, min=0, max=1000, soft_min=1, soft_max=50,
            subtype="TIME")

    allow_nla = bpy.props.BoolProperty(name=_("Allow NLA"), 
            description=_("Allow animation to be controlled by the NLA"),
            default=True)


class B4W_VertexAnimBakerPanel(bpy.types.Panel):
    bl_label = _("Bake Vertex Animation")
    bl_idname = "OBJECT_PT_va_baker"
    bl_space_type = "VIEW_3D"
    bl_region_type = "TOOLS"
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
        row.prop(va[va_index], "name", text=_("Name"))

        row = layout.row(align=True)
        row.prop(va[va_index], "frame_start")
        row.prop(va[va_index], "frame_end")

        #row = layout.row(align=True)
        #row.prop(va[va_index], "averaging")
        #row.prop(va[va_index], "averaging_interval")

        row = layout.row()
        row.prop(va[va_index], "allow_nla")

        row = layout.row()
        if va[va_index].frames:
            text = bpy.app.translations.pgettext_iface(_("Status: ")) + \
                    str(len(va[va_index].frames)) + \
                    bpy.app.translations.pgettext_iface(_(" frames recorded"))
            row.label(text=text)
        else:
            row.label(text=_("Status: Empty"))

        row = layout.row()
        row.operator("b4w.vertex_anim_bake", text=_("Bake"), icon="REC")

        
class B4W_VertexAnimAddOperator(bpy.types.Operator):
    bl_idname      = 'b4w.vertex_anim_add'
    bl_label       = p_("Add vertex animation", "Operator")
    bl_description = _("Add new vertex animation")
    bl_options = {"INTERNAL"}

    def invoke(self, context, event):
        obj = context.active_object

        va = obj.b4w_vertex_anim

        va.add()
        va[-1].name= _("New Anim")
        va[-1].frame_start = context.scene.frame_start
        va[-1].frame_end = context.scene.frame_end

        return{'FINISHED'}
 
 
class B4W_VertexAnimRemOperator(bpy.types.Operator):
    bl_idname      = 'b4w.vertex_anim_remove'
    bl_label       = p_("Remove vertex animation", "Operator")
    bl_description = _("Remove existing vertex animation")
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
    bl_label       = p_("Bake vertex animation", "Operator")
    bl_description = _("Bake vertex animation")
    bl_options = {"INTERNAL"}

    def bake_frame(self, mesh, va_frame):
        """Bake only vertices, other params can be extracted from mesh"""

        va_verts = va_frame.vertices

        for vertex in mesh.vertices:
            va_verts.add()
            co = vertex.co
            normal = vertex.normal
            # rotate by 90 degrees around X axis
            va_verts[-1].posnor = [co[0], co[1], co[2],
                                    normal[0], normal[1], normal[2]]

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
            self.report({"INFO"}, _("Bake start"))

            if self.bake(obj, va[va_index]):
                self.report({"INFO"}, _("Bake finish"))
                # auto enable vertex animation export and usage
                if not "b4w_loc_export_vertex_anim" in obj.keys():
                    obj.b4w_loc_export_vertex_anim = True
            else:
                self.report({"ERROR"}, _("Bake error"))

        return{'FINISHED'}


def register(): 
    bpy.types.Object.b4w_vertex_anim =\
            bpy.props.CollectionProperty(type=VertexAnim,
                name=_("B4W: vertex animation"))
    bpy.types.Object.b4w_vertex_anim_index =\
            bpy.props.IntProperty(name=_("B4W: vertex animation index"))

