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
import blend4web

b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_

class B4W_Vertex_Groups_To_Materials(bpy.types.Operator):
    '''Convert vertex groups to materials'''
    bl_idname = "b4w.vertex_groups_to_materials"
    bl_label = p_("B4W Vertex Groups To Materials", "Operator")
    bl_options = {"INTERNAL"}
   
    def execute(self, context):
        run()
        return {"FINISHED"}

def run():

    # escape from edit mode
    if bpy.context.mode == "EDIT_MESH":
        bpy.ops.object.mode_set(mode="OBJECT") 

    obj_src_name = bpy.context.object.name

    obj_dst_name = obj_src_name + "_VGROUPS_TO_MATS"

    scene = bpy.data.scenes[0]

    # remove results of previous running
    obj_dst_old = bpy.data.objects.get(obj_dst_name)
    if obj_dst_old:
        scene.objects.unlink(obj_dst_old)
        bpy.data.objects.remove(obj_dst_old)

    mesh_dst_old = bpy.data.meshes.get(obj_dst_name)
    if mesh_dst_old:
        bpy.data.meshes.remove(mesh_dst_old)

    # copy source object
    obj_src = bpy.data.objects[obj_src_name]
    mesh_dst = obj_src.to_mesh(scene, True, "PREVIEW")
    mesh_dst.name = obj_dst_name
    obj_dst = bpy.data.objects.new(obj_dst_name, mesh_dst)
    scene.objects.link(obj_dst)
    
    # also copy parent for convenience
    if obj_src.parent:
        obj_dst.parent = obj_src.parent

    # remove material slots from destination obj 
    bpy.context.scene.objects.active = obj_dst
    num_slots = len(obj_dst.material_slots)
    for i in range(0, num_slots):
        bpy.ops.object.material_slot_remove()

    # remove uvs from destination mesh
    num_slots = len(mesh_dst.uv_textures)
    for i in range(0, num_slots):
        bpy.ops.mesh.uv_texture_remove()

    # remove vertex colors from destination mesh
    num_slots = len(mesh_dst.vertex_colors)
    for i in range(0, num_slots):
        bpy.ops.mesh.vertex_color_remove()

    # select new object
    bpy.ops.object.select_pattern(pattern=obj_dst_name, case_sensitive=True, extend=False)

    # deselect faces in edit mode
    bpy.ops.object.editmode_toggle()
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.editmode_toggle()

    # add first placeholder material
    mat = bpy.data.materials.new(obj_dst_name)
    obj_dst.data.materials.append(mat)

    # add materials which have names similar to vertex groups names of the source obj
    for vgroup in obj_src.vertex_groups:
        mat = bpy.data.materials.get(vgroup.name)
        if mat:
            obj_dst.data.materials.append(mat)

    # assign materials to polygons according to vertex groups
    mesh_src = obj_src.data
    for polygon_src in mesh_src.polygons:
        # get corresponding polygon in destination mesh
        polygon_dst = mesh_dst.polygons[polygon_src.index]

        vgroup_index = get_vgroup_index(polygon_src, mesh_src.vertices)
        if vgroup_index == -1:
            polygon_dst.select = True
        else:
            vgroup_name = obj_src.vertex_groups[vgroup_index].name
            mat_index = mesh_dst.materials.find(vgroup_name)
            if mat_index == -1:
                polygon_dst.select = True
            else:            
                polygon_dst.material_index = mat_index
                polygon_dst.select = False
          
    # show results in viewport
    mesh_dst.update()
    
    # delete polygons covered by placeholder material; they were selected earlier
    bpy.ops.object.editmode_toggle()
    bpy.ops.mesh.delete(type="FACE")
    bpy.ops.object.editmode_toggle()
    
    # delete placeholder material
    bpy.ops.object.material_slot_remove()
    bpy.data.materials.remove(bpy.data.materials.get(obj_dst_name))


# find to which vertex group belong all polygon vertices 
def get_vgroup_index(polygon, mesh_vertices):

    vert_index0 = polygon.vertices[0]
    vert0 = mesh_vertices[vert_index0]

    # find first vert group in first vertex which all other vertices also own
    for group in vert0.groups:
        if all_verts_in_group(group, polygon.vertices, mesh_vertices):
            return group.group
        
    return -1
        
def all_verts_in_group(group, polygon_vertices, mesh_vertices):
    group_index = group.group
    group_weight = group.weight # unused so far
    for vert_index in polygon_vertices:
        vert = mesh_vertices[vert_index]
        if not vert_in_group(vert, group_index):
            return False
    return True

def vert_in_group(vert, group_index):
    for group in vert.groups:
        if group.group == group_index:
            return True
    return False
 

