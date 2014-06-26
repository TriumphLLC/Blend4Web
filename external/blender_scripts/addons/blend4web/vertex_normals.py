# (c) Blend4Web Development Team 2014
# (c) adsn 2012, Recalc Vertex Normals
# 
# This addon manipulates vertex normals and stores them into an object
# property.
# 
#
#
# ***** BEGIN GPL LICENSE BLOCK *****
#
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software Foundation,
# Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
#
# ***** END GPL LICENCE BLOCK *****
#
#bl_info = {
#    "name": "Recalc Vertex Normals",
#    "author": "adsn",
#    "version": (1, 1),
#    "blender": (2, 6, 3),
#    "location": "View3D > Toolbar",
#    "description": "This addon manipulates vertex normals and stores them into an object property.",
#    "warning": "",
#    "wiki_url": "",
#    "tracker_url": "",
#    "category": "Game Engine"}
    
import bpy
import mathutils
import bgl
from bpy.types import Panel
from rna_prop_ui import PropertyPanel

from math import sqrt

##########################################################
# draw UI ButtonS
class B4W_VertexNormalsUI(bpy.types.Panel):
    bl_idname = "Recalc Vertex Normals"
    bl_label = 'B4W Vertex Normals Editor'
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'TOOLS'
    bl_category = "Blend4Web"
    
    def __init__(self):
        pass

    @classmethod
    def poll(self, context):
        try:
            ob = context.active_object
            mode = context.mode
            return (ob.type == 'MESH')
        except AttributeError:
            return 0
      
    def draw(self, context):

        layout = self.layout
        box = self.layout.box()

        # update normals
        row = box.row()
        row.operator('object.b4w_update_normal_list', text = 'Reload Normals')

        row = box.row()
        row.operator('object.b4w_clean_up_normal_list', text = 'Clean up')
        
        # save normals
        row = box.row(align=True)
        row.prop(context.window_manager, 'b4w_vn_autosave', text = ' Autosave', toggle=True)
        row.operator('object.save_normals', text = 'Save')
        
        # draw normals
        row = box.row(align=True)
        row.prop(context.scene.tool_settings, "normal_size", text="Size")
        if context.window_manager.b4w_vn_drawnormal:
            if context.window_manager.b4w_vn_drawnormal == True:
                row.operator('object.draw_normals', text = 'Hide')
            elif context.window_manager.b4w_vn_drawnormal == False:
                row.operator('object.draw_normals', text = 'Show')
        else:
            row.operator('object.draw_normals', text = 'Show')
        
        # selection tools
        row = box.row(align=True)
        row.operator('object.invert_selection', text = 'Inv Sel')
        row.operator('object.select_vertex', text = 'Cycle Sel')
        
        # copy and paste
        row = box.row(align=True)
        row.operator('object.copy_normal', text = 'Copy')
        row.operator('object.paste_normal', text = 'Paste')
        
        # manipulate normals   
        box = self.layout.box()
        row = box.row()
        row.column().prop(context.window_manager, 'b4w_vn_customnormal2', expand = True, text='')
        # ball
        row.prop(context.window_manager, 'b4w_vn_customnormal1', text='')
        
        row = box.row(align=True)
        row.operator('object.tree_vertex_normals', text = 'Tree')
        row.operator('object.foliage_vertex_normals', text = 'Foliage')
        row.operator('object.face_vertex_normals', text = 'Face')
        row = box.row(align=True)
        row.operator('object.copy_normals_from_mesh', text = 'Copy from source mesh')
        row.operator('b4w.approx_normals_from_mesh', text = 'Approximate from source mesh')

##########################################################
# toggle vertices selection

##########################################################
# tree vertex normals
# process only selected vertices
# skip unselected to preserve normals on non transparent geometry

class B4W_TreeVertexNormals(bpy.types.Operator):
    bl_idname = 'object.tree_vertex_normals'
    bl_label = 'Vertex Normal Tree'
    bl_description = 'Align selected verts pointing away from 3d cursor'
        
    def execute(self, context):

        obj = context.active_object
        vert_index = len(bpy.context.active_object.data.vertices)
        vec1 = context.scene.cursor_location

        bpy.ops.object.mode_set(mode='OBJECT')

        if 'b4w_vertex_normal_list' not in context.active_object:
            context.active_object['b4w_vertex_normal_list'] = []
        if 'b4w_vertex_normal_list' in context.active_object:
            for i in range(vert_index):
                if context.active_object.data.vertices[i].select == True:
                    vec2 = obj.data.vertices[i].co
                    newvec = vec2 - vec1 + obj.location
                    newnormal = newvec.normalized()
    
                    obj.data.vertices[i].normal = newnormal
                
                # update vertex normal list
                if context.window_manager.b4w_vn_autosave == True:
                    if len(context.object.b4w_vertex_normal_list) <= i:
                        item = context.object.b4w_vertex_normal_list.add()
                        item.normal = obj.data.vertices[i].normal
                    else:
                        context.object.b4w_vertex_normal_list[i]['normal'] = obj.data.vertices[i].normal
        context.area.tag_redraw()
        return {'FINISHED'}


##########################################################
# foliage vertex normals
# align selected verts to global z axis

class B4W_FoliageVertexNormals(bpy.types.Operator):
    bl_idname = 'object.foliage_vertex_normals'
    bl_label = 'Vertex Normal Foliage'
    bl_description = 'Selected verts to Z axis, unselected away from 3d cursor'

    def execute(self, context):
        obj = context.active_object
        vert_index = len(bpy.context.active_object.data.vertices)
        vec1 = context.scene.cursor_location

        bpy.ops.object.mode_set(mode='OBJECT')
        
        if 'b4w_vertex_normal_list' not in context.active_object:
            context.active_object['b4w_vertex_normal_list'] = []
        if 'b4w_vertex_normal_list' in context.active_object:
            for i in range(vert_index):
                
                # selected verts will align on z-axis
                if context.active_object.data.vertices[i].select == True:
                    obj.data.vertices[i].normal = (0.0, 0.0, 1.0)
                
                # update vertex normal list
                if context.window_manager.b4w_vn_autosave == True:
                    if len(context.object.b4w_vertex_normal_list) <= i:
                        item = context.object.b4w_vertex_normal_list.add()
                        item.normal = obj.data.vertices[i].normal
                    else:
                        context.object.b4w_vertex_normal_list[i]['normal'] = obj.data.vertices[i].normal
        context.area.tag_redraw()
        return {'FINISHED'}

class B4W_FaceVertexNormals(bpy.types.Operator):
    bl_idname = 'object.face_vertex_normals'
    bl_label = 'Vertex Normal Face'
    bl_description = 'Copy face normal'

    def execute(self, context):
        obj = context.active_object
        mesh = obj.data

        bpy.ops.object.mode_set(mode='OBJECT')
        
        if 'b4w_vertex_normal_list' not in context.active_object:
            context.active_object['b4w_vertex_normal_list'] = []
        if 'b4w_vertex_normal_list' in context.active_object:

            sel_indices = []

            for i in range(len(mesh.vertices)):
                if mesh.vertices[i].select == True:
                    sel_indices.append(i)

            if len(sel_indices) < 3:
                self.report({'INFO'}, 'Please select at least 3 vertices')
                return {"FINISHED"}

            for p in mesh.polygons:
                all_in = True

                for i in sel_indices:
                    if mesh.vertices[i].index not in p.vertices:
                        all_in = False
                        break

                if all_in:
                    for i in sel_indices:
                        mesh.vertices[i].normal = p.normal

            # update vertex normal list
            for i in sel_indices:
                if context.window_manager.b4w_vn_autosave == True:
                    if len(obj.b4w_vertex_normal_list) <= i:
                        item = obj.b4w_vertex_normal_list.add()
                        item.normal = mesh.vertices[i].normal
                    else:
                        obj.b4w_vertex_normal_list[i]["normal"] = mesh.vertices[i].normal

        context.area.tag_redraw()
        return {'FINISHED'}

class B4W_CopyNormalsFromMesh(bpy.types.Operator):
    bl_idname = 'object.copy_normals_from_mesh'
    bl_label = 'Copy normals from source mesh'
    bl_description = 'Copy normals from selected to active mesh for selected vertices'
    
    def execute(self, context):
        self.generate_normal_list(context)

        if len(bpy.context.selected_objects) != 2:
            print('Wrong selection')
        else:
            obj_target = context.active_object
            if context.selected_objects[0].name!=obj_target.name:
                obj_source = context.selected_objects[0]
            else:
                obj_source = context.selected_objects[1]

            verts_target = obj_target.data.vertices
            verts_source = obj_source.data.vertices


            verts_is_selected = False
            for v in verts_target:
                if v.select:
                    verts_is_selected = True
                    break

            verts_target_count = len(verts_target)
            for i in range(verts_target_count):
                if not verts_is_selected or verts_target[i].select:
                    for j in range(len(verts_source)):
                        if verts_target[i].co[0] == verts_source[j].co[0]: 
                            if verts_target[i].co[1] == verts_source[j].co[1]:
                                if verts_target[i].co[2] == verts_source[j].co[2]:
                                    obj_target.b4w_vertex_normal_list[i]['normal'] \
                                            = verts_source[j].normal
        bpy.ops.object.b4w_update_normal_list()
        context.area.tag_redraw()
        return {'FINISHED'}

    def generate_normal_list(self, context):
        if 'b4w_vertex_normal_list' not in context.active_object:
            context.active_object['b4w_vertex_normal_list'] = []

        obj = context.active_object
        vert_index = len(context.active_object.data.vertices)

        for i in range(vert_index):
            # update vertex normal list
            if len(context.object.b4w_vertex_normal_list) <= i:
                item = context.object.b4w_vertex_normal_list.add()
                item.normal = obj.data.vertices[i].normal
            else:
                context.object.b4w_vertex_normal_list[i]['normal'] \
                        = obj.data.vertices[i].normal

class B4W_ApproxNormalsFromMesh(bpy.types.Operator):
    bl_idname = "b4w.approx_normals_from_mesh"
    bl_label = "Approximate normals from source mesh"
    bl_description = "Approximate target mesh normals from source mesh"
   
    def execute(self, context):
        if len(bpy.context.selected_objects) != 2:
            print('Wrong selection')
        else:
            self.generate_normal_list(context)
            self.approx_normals(context)
            bpy.ops.object.b4w_update_normal_list()
            context.area.tag_redraw()
            return {"FINISHED"}

    def generate_normal_list(self, context):
        if 'b4w_vertex_normal_list' not in context.active_object:
            context.active_object['b4w_vertex_normal_list'] = []

        obj = context.active_object
        vert_index = len(context.active_object.data.vertices)

        for i in range(vert_index):
            # update vertex normal list
            if len(context.object.b4w_vertex_normal_list) <= i:
                item = context.object.b4w_vertex_normal_list.add()
                item.normal = obj.data.vertices[i].normal
            else:
                context.object.b4w_vertex_normal_list[i]['normal'] \
                        = obj.data.vertices[i].normal

    def approx_normals(self, context):
        obj_dst = context.active_object
        if context.selected_objects[0].name!=obj_dst.name:
            obj_src = context.selected_objects[0]
        else:
            obj_src = context.selected_objects[1]

        mesh_src = obj_src.data
        mesh_dst = obj_dst.data

        dst_vert_list = mesh_dst.vertices
        src_vert_list = mesh_src.vertices
        matr_src = obj_src.matrix_world
        matr_dst = obj_dst.matrix_world

        # remember old vertices positions
        old_dst_co_list = [0] * 3 * len(dst_vert_list)
        old_src_co_list = [0] * 3 * len(src_vert_list)
        for i in range(len(dst_vert_list)):
            old_dst_co_list[i * 3]     = dst_vert_list[i].co[0]
            old_dst_co_list[i * 3 + 1] = dst_vert_list[i].co[1]
            old_dst_co_list[i * 3 + 2] = dst_vert_list[i].co[2]
        for i in range(len(src_vert_list)):
            old_src_co_list[i * 3]     = src_vert_list[i].co[0]
            old_src_co_list[i * 3 + 1] = src_vert_list[i].co[1]
            old_src_co_list[i * 3 + 2] = src_vert_list[i].co[2]
        
        # transform vertices to world space 
        for vert_dst in dst_vert_list:
            vert_dst.co = matr_dst * vert_dst.co
        for vert_src in src_vert_list:
            vert_src.co = matr_src * vert_src.co


        # approximate normals
        verts_is_selected = False
        for v in dst_vert_list:
            if v.select:
                verts_is_selected = True
                break

        for vert_dst in dst_vert_list:
            if not verts_is_selected or vert_dst.select == True:
                min_distance = 1E10
                min_index = -1
                for vert_src in src_vert_list:
                    distance = sqrt(pow(vert_dst.co[0]-vert_src.co[0],2) \
                            + pow(vert_dst.co[1]-vert_src.co[1],2)
                            + pow(vert_dst.co[2]-vert_src.co[2],2))
                    if distance<min_distance:
                        min_distance = distance
                        min_index = vert_src.index

                obj_dst.b4w_vertex_normal_list[vert_dst.index]['normal'] \
                        = matr_dst.to_quaternion().inverted() \
                        * matr_src.to_quaternion() \
                        * src_vert_list[min_index].normal

        # reset destination mesh's vertices positions
        for vert_dst in dst_vert_list:
            vert_dst.co[0] = old_dst_co_list[vert_dst.index * 3]
            vert_dst.co[1] = old_dst_co_list[vert_dst.index * 3 + 1]
            vert_dst.co[2] = old_dst_co_list[vert_dst.index * 3 + 2]

        # reset source mesh's vertices positions
        for vert_src in src_vert_list:
            vert_src.co[0] = old_src_co_list[vert_src.index * 3]
            vert_src.co[1] = old_src_co_list[vert_src.index * 3 + 1]
            vert_src.co[2] = old_src_co_list[vert_src.index * 3 + 2]

##########################################################
# custom vertex normal vector
## custom 1
def update_custom_normal1(self, context):

    obj = context.active_object
    if 'b4w_vertex_normal_list' not in context.active_object:
        context.active_object['b4w_vertex_normal_list'] = []
    if 'b4w_vertex_normal_list' in context.active_object:
        vert_index = len(context.active_object.data.vertices)
        for i in range(vert_index):
            # selected verts align on custom normal
            if context.active_object.data.vertices[i].select == True:
                obj.data.vertices[i].normal = context.window_manager.b4w_vn_customnormal1
            
            # unselected verts are skipped 
            elif context.active_object.data.vertices[i].select == False:
                pass
            
            # update vertex normal list
            if context.window_manager.b4w_vn_autosave == True:
                if len(context.object.b4w_vertex_normal_list) <= i:
                    item = context.object.b4w_vertex_normal_list.add()
                    item.normal = obj.data.vertices[i].normal
                else:
                    context.object.b4w_vertex_normal_list[i]['normal'] = obj.data.vertices[i].normal

## custom 2
def update_custom_normal2(self, context):

    obj = context.active_object
    if 'b4w_vertex_normal_list' not in context.active_object:
        context.active_object['b4w_vertex_normal_list'] = []
    if 'b4w_vertex_normal_list' in context.active_object:
        vert_index = len(context.active_object.data.vertices)
        for i in range(vert_index):
            # selected verts align on custom normal
            if context.active_object.data.vertices[i].select == True:
                obj.data.vertices[i].normal = context.window_manager.b4w_vn_customnormal2
            
            # unselected verts are skipped 
            elif context.active_object.data.vertices[i].select == False:
                pass
            # update vertex normal list
            if context.window_manager.b4w_vn_autosave == True:
                if len(context.object.b4w_vertex_normal_list) <= i:
                    item = context.object.b4w_vertex_normal_list.add()
                    item.normal = obj.data.vertices[i].normal
                else:
                    context.object.b4w_vertex_normal_list[i]['normal'] = obj.data.vertices[i].normal



##########################################################
# select next vertex
class B4W_SelectVertex(bpy.types.Operator):
    bl_idname = 'object.select_vertex'
    bl_label = 'Select Vertex'
    bl_description = 'Toggles vertex selection'

    def execute(self, context):
        obj = context.active_object
        vert_index = len(context.active_object.data.vertices)
        
        if 'b4w_select_vertex' not in context.active_object:
            context.active_object['b4w_select_vertex'] = 0
    
        if 'b4w_select_vertex' in context.active_object:
            
            for h in range(vert_index):
                if context.active_object.data.vertices[h].select == True:
                    obj['b4w_select_vertex'] = h
 
            if obj['b4w_select_vertex'] < vert_index-1:
                obj['b4w_select_vertex'] += 1
            else:
                obj['b4w_select_vertex'] = 0

            # select next vertex
            for i in range(vert_index):
                
                if i == obj['b4w_select_vertex']:
                    context.active_object.data.vertices[i].select = True
                else:
                    context.active_object.data.vertices[i].select = False

            return {'FINISHED'}  
##########################################################
# invert vertex selection
class B4W_InvertSelection(bpy.types.Operator):
    bl_idname = 'object.invert_selection'
    bl_label = 'Invert Selection'
    bl_description = 'Inverts Selected Vertices'

    def execute(self, context):
        obj = context.active_object
        vert_index = len(context.active_object.data.vertices)
        # inverse selection
        for i in range(vert_index):
            
            if context.active_object.data.vertices[i].select == True:
                context.active_object.data.vertices[i].select = False
            else:
                context.active_object.data.vertices[i].select = True

        return {'FINISHED'}

##########################################################
# copy normal
class B4W_CopyNormal(bpy.types.Operator):
    bl_idname = 'object.copy_normal'
    bl_label = 'Copy Normal'
    bl_description = 'Copies normal from selected Vertex'

    def execute(self, context):
        obj = context.active_object
        vert_index = len(context.active_object.data.vertices)
        
        check = 0
        # inverse selection
        for h in range(vert_index):
            if context.active_object.data.vertices[h].select == True:
                check += 1
        if check == 1:
            for i in range(vert_index):
                if context.active_object.data.vertices[i].select == True:
                    context.window_manager.b4w_vn_copynormal = context.active_object.data.vertices[i].normal
        
        else:
            self.report({'INFO'}, 'please select a single vertex')
        return {'FINISHED'}

##########################################################
# paste normal
class B4W_PasteNormal(bpy.types.Operator):
    bl_idname = 'object.paste_normal'
    bl_label = 'Paste Normal'
    bl_description = 'Paste normal to selected Vertex'

    def execute(self, context):
        obj = context.active_object
        vert_index = len(context.active_object.data.vertices)
        
        check = 0
        # inverse selection
        if 'b4w_select_vertex' not in context.active_object:
            context.active_object['b4w_select_vertex'] = 0
    
        if 'b4w_select_vertex' in context.active_object:
            for h in range(vert_index):
                if context.active_object.data.vertices[h].select == True:
                    check += 1
            if check >= 1:
                for i in range(vert_index):
                    if context.active_object.data.vertices[i].select == True:
                        context.active_object.data.vertices[i].normal = context.window_manager.b4w_vn_copynormal
                        
                    if context.window_manager.b4w_vn_autosave == True:
                        if len(context.object.b4w_vertex_normal_list) <= i:
                            item = context.object.b4w_vertex_normal_list.add()
                            item.normal = obj.data.vertices[i].normal
                        else:
                            context.object.b4w_vertex_normal_list[i]['normal'] = obj.data.vertices[i].normal
            else:
                self.report({'INFO'}, 'please select at least one vertex')
        
        context.area.tag_redraw()
        return {'FINISHED'}

##########################################################
# save all vertexnormals
class B4W_SaveNormals(bpy.types.Operator):

    bl_idname = 'object.save_normals'
    bl_label = 'Save Normals'
    bl_description = 'Save Vertex Normals'
        
    def execute(self, context):

        obj = context.active_object
        vert_index = len(bpy.context.active_object.data.vertices)

        bpy.ops.object.mode_set(mode='OBJECT')
        
        if 'b4w_vertex_normal_list' not in context.active_object:
            context.active_object['b4w_vertex_normal_list'] = []
            
        if 'b4w_vertex_normal_list' in context.active_object:
            for i in range(vert_index):
               
                # update vertex normal list
                if len(context.object.b4w_vertex_normal_list) <= i:
                    item = context.object.b4w_vertex_normal_list.add()
                    item.normal = obj.data.vertices[i].normal
                # add items to list if too short
                else:
                    context.object.b4w_vertex_normal_list[i]['normal'] = obj.data.vertices[i].normal
            return {'FINISHED'}

##########################################################
# create vertex normal list for saving them normals
class B4W_VertexNormalList(bpy.types.PropertyGroup):
    normal = bpy.props.FloatVectorProperty(default=(0.0, 0.0, 0.0))

# update list
class B4W_UpdateNormalList(bpy.types.Operator):
    bl_idname = "object.b4w_update_normal_list" 
    bl_label = "Update Vertex Normals"
    bl_description = 'Update vertex normals after EDITMODE'
    
    def execute(self, context):
        vertices = context.active_object.data.vertices
        obj = context.active_object
       
        bpy.ops.object.mode_set(mode='OBJECT')
        
        for i in range(len(obj.b4w_vertex_normal_list)):
            vertices[i].normal = obj.b4w_vertex_normal_list[i]['normal']
        
        context.area.tag_redraw()

        # reset normals control interface
        #context.window_manager.b4w_vn_customnormal1 = mathutils.Vector((0.0, 0.0, 1.0))
        #context.window_manager.b4w_vn_customnormal2 = mathutils.Vector((0.0, 0.0, 1.0))
        
        return{'FINISHED'}

# clean up normal list
class B4W_CleanUpNormalList(bpy.types.Operator):
    bl_idname = "object.b4w_clean_up_normal_list" 
    bl_label = "Clean Up Vertex Normals List"
    bl_description = 'Clean up vertex normals list'
    
    def execute(self, context):
        vertices = context.active_object.data.vertices

        context.active_object['b4w_vertex_normal_list'] = []
        for vert in vertices:
            item = context.active_object.b4w_vertex_normal_list.add()
            item.normal = vert.normal

        context.area.tag_redraw()

        # reset normals control interface
        #context.window_manager.b4w_vn_customnormal1 = mathutils.Vector((0.0, 0.0, 1.0))
        #context.window_manager.b4w_vn_customnormal2 = mathutils.Vector((0.0, 0.0, 1.0))
        
        return{'FINISHED'}

##########################################################
##########################################################
# draw Normals in OBJECTMODE
def draw_line(self, context, vertexloc, vertexnorm, colour, thick):
    obj = context.active_object
    
    #get obj rotation
    rot = obj.rotation_euler.to_matrix().inverted()
    scale = obj.scale
    vertex = vertexloc * rot
    normal = vertexnorm * rot

    x1 = vertex[0] * scale[0] + obj.location[0]
    y1 = vertex[1] * scale[1] + obj.location[1]
    z1 = vertex[2] * scale[2] + obj.location[2]
    
    x2 = normal[0]*context.scene.tool_settings.normal_size* scale[0] + x1
    y2 = normal[1]*context.scene.tool_settings.normal_size* scale[1] + y1
    z2 = normal[2]*context.scene.tool_settings.normal_size* scale[2] + z1
    
    bgl.glEnable(bgl.GL_BLEND)
    bgl.glLineWidth(thick)
    # set colour
    bgl.glColor4f(*colour)
    
    # draw line
    bgl.glBegin(bgl.GL_LINE_STRIP)
    bgl.glVertex3f(x1,y1,z1)
    bgl.glVertex3f(x2,y2,z2)
    bgl.glEnd()
    bgl.glDisable(bgl.GL_BLEND)
    
def InitGLOverlay(self, context):

    obj = context.active_object
    
    if context.active_object != None and obj.type == 'MESH':
        vertex = context.active_object.data.vertices
        vert_index = len(vertex)
        for i in range(vert_index):
            # selected verts will align on z-axis
            if vertex[i].select == True:
                draw_line(self, context, vertex[i].co, vertex[i].normal, (0.5,1.0,1.0,0.1),3)
                draw_line(self, context, vertex[i].co, vertex[i].normal, (0.5,1.0,1.0,1.0),1)
            # unselected verts will align on 3d cursor
            elif vertex[i].select == False:
                draw_line(self, context, vertex[i].co, vertex[i].normal, (0.0,0.0,0.0,0.6),3)
                draw_line(self, context, vertex[i].co, vertex[i].normal, (0.0,0.6,0.8,0.6),1)

# draw normals in object mode operator
class B4W_DrawNormals(bpy.types.Operator):
    bl_idname = 'object.draw_normals'
    bl_label = 'draw_normals'
    bl_description = 'Draw normals in OBJECTMODE'
    _handle = None
    
    def modal(self, context, event):
        if not context.window_manager.b4w_vn_drawnormal:
            context.area.tag_redraw()
            bpy.types.SpaceView3D.draw_handler_remove(self._handle, 'WINDOW')
            return {'CANCELLED'}
        return {'PASS_THROUGH'}
    
    def cancel(self, context):
        if context.window_manager.b4w_vn_drawnormal:
            bpy.types.SpaceView3D.draw_handler_remove(self._handle, 'WINDOW')
            context.window_manager.b4w_vn_drawnormal = False
        return {'CANCELLED'}
    
    def invoke(self, context, event):
        if context.area.type == 'VIEW_3D':
            if context.window_manager.b4w_vn_drawnormal == False:
                context.window_manager.b4w_vn_drawnormal = True
                context.window_manager.modal_handler_add(self)
                self._handle = bpy.types.SpaceView3D.draw_handler_add(InitGLOverlay, (self, context), 'WINDOW', 'POST_VIEW')
                context.area.tag_redraw()
                return {'RUNNING_MODAL'}
            else:
                context.window_manager.b4w_vn_drawnormal = False
                return {'CANCELLED'}
        else:
            self.report({'WARNING'}, "View3D not found, can't run operator")
            return {'CANCELLED'}

##########################################################
# init properties
def init_properties():
    
    bpy.types.Object.b4w_vertex_normal_list = bpy.props.CollectionProperty(
        name="B4W: vertex normal list",
        type=B4W_VertexNormalList)
        
    bpy.types.Object.b4w_select_vertex = bpy.props.IntProperty(
        name="B4W: selected vertex normal",
        default=0)
    
    bpy.types.WindowManager.b4w_vn_autosave = bpy.props.BoolProperty(
        name="B4W: vertex normal autosave",
        default=False)
    
    bpy.types.WindowManager.b4w_vn_drawnormal = bpy.props.BoolProperty(
        name="B4W: vertex normal draw",
        default=False)
    
    bpy.types.WindowManager.b4w_vn_copynormal = bpy.props.FloatVectorProperty(
        name="B4W: vertex normal copy",
        default=(0.0, 0.0, 0.0))
    
    bpy.types.WindowManager.b4w_vn_customnormal1 = bpy.props.FloatVectorProperty(
        name="B4W: custom vertex normal 1",
        default=(0.0, 0.0, 1.0),
        subtype = 'DIRECTION',
        update=update_custom_normal1)

    bpy.types.WindowManager.b4w_vn_customnormal2 = bpy.props.FloatVectorProperty(
        name="B4W: custom vertex normal 2",
        default=(0.0, 0.0, 1.0),
        subtype = 'TRANSLATION',
        #unit = 'ROTATION',
        update=update_custom_normal2)

# clear properties
def clear_properties():
    props = ['b4w_vn_drawnormal', 'b4w_vn_customnormal1', 'b4w_vn_customnormal2',
            'b4w_vn_autosave', 'b4w_vn_copynormal']
    for p in props:
        if bpy.context.window_manager.get(p) != None:
            del bpy.context.window_manager[p]
        try:
            x = getattr(bpy.types.WindowManager, p)
            del x
        except:
            pass
    
##########################################################
### REGISTERING
#def add_object_button(self, context):
#    self.layout.operator(
#        VertexNormals.bl_idname,
#        text='Vertex Normals',
#        icon='NODE_SEL')

def register():
    
    bpy.utils.register_class(B4W_VertexNormalList)
    bpy.utils.register_class(B4W_TreeVertexNormals)
    bpy.utils.register_class(B4W_FoliageVertexNormals)
    bpy.utils.register_class(B4W_FaceVertexNormals)
    bpy.utils.register_class(B4W_CopyNormalsFromMesh)
    bpy.utils.register_class(B4W_ApproxNormalsFromMesh)
    bpy.utils.register_class(B4W_VertexNormalsUI)
    bpy.utils.register_class(B4W_UpdateNormalList)
    bpy.utils.register_class(B4W_CleanUpNormalList)
    bpy.utils.register_class(B4W_SaveNormals)
    bpy.utils.register_class(B4W_DrawNormals)
    bpy.utils.register_class(B4W_SelectVertex)
    bpy.utils.register_class(B4W_InvertSelection)
    bpy.utils.register_class(B4W_CopyNormal)
    bpy.utils.register_class(B4W_PasteNormal)
    
    init_properties()

def unregister():
    
    bpy.utils.unregister_class(B4W_VertexNormalList)   
    bpy.utils.unregister_class(B4W_TreeVertexNormals)
    bpy.utils.unregister_class(B4W_FoliageVertexNormals)
    bpy.utils.unregister_class(B4W_FaceVertexNormals)
    bpy.utils.unregister_class(B4W_CopyNormalsFromMesh)
    bpy.utils.unregister_class(B4W_ApproxNormalsFromMesh)
    bpy.utils.unregister_class(B4W_VertexNormalsUI)
    bpy.utils.unregister_class(B4W_UpdateNormalList)
    bpy.utils.unregister_class(B4W_CleanUpNormalList)
    bpy.utils.unregister_class(B4W_SaveNormals)
    bpy.utils.unregister_class(B4W_DrawNormals)
    bpy.utils.unregister_class(B4W_SelectVertex)
    bpy.utils.unregister_class(B4W_InvertSelection)
    bpy.utils.unregister_class(B4W_CopyNormal)
    bpy.utils.unregister_class(B4W_PasteNormal)
    
    clear_properties()
    
