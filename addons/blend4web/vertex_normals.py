# Copyright (C) 2014-2016 Triumph LLC
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


# Original idea from the Recalc Vertex Normals add-on by adsn
    
import bpy
import mathutils
import bgl
from bpy.types import Panel
from rna_prop_ui import PropertyPanel
import copy
from collections import namedtuple

from math import sqrt
from math import radians

import blend4web
b4w_modules =  ["translator",]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))
from blend4web.translator import _, p_

global b4w_vertex_to_loops_map
b4w_vertex_to_loops_map = {}

global b4w_loops_normals
b4w_loops_normals = []

global b4w_loops_normals_select
b4w_loops_normals_select = []

global helper_handle
helper_handle = None

global b4w_vn_customnormal_updated
b4w_vn_customnormal_updated = False

class RotationHelperParams:
    is_active = False
    constraint = None
    degrees = None;
    c_world = mathutils.Vector()
    mouse_local = mathutils.Vector()
    mouse_world = mathutils.Vector()

global rotation_helper_params
rotation_helper_params = RotationHelperParams()

def set_vertex_normal(index, value):
    (x,y,z) = value
    l = sqrt(x*x + y*y + z*z)
    if l!= 0: # case when "Copy" not pressed yet
        newvalue = (x/l, y/l, z/l)
        if index in b4w_vertex_to_loops_map:
            for i in b4w_vertex_to_loops_map[index]:
                b4w_loops_normals[i] = newvalue

def resize_array_if_need(array, length, el = (0,0,0)):
    if len(array) != length:
        array.clear()
        for i in range(length):
            array.append(el)
        return True
    else:
        return False

def load_loops_normals(ob):
    loops_normals = []
    vertex_to_loops_map = {}
    ob.data.calc_normals_split()
    i = 0
    resize_array_if_need(loops_normals, len(ob.data.loops))
    for i in range(len(ob.data.loops)):
        l = ob.data.loops[i]
        if not l.vertex_index in vertex_to_loops_map:
            vertex_to_loops_map[l.vertex_index] = []
        vertex_to_loops_map[l.vertex_index].append(i)
        loops_normals[i] = (l.normal.x, l.normal.y, l.normal.z)
    return (loops_normals, vertex_to_loops_map)

def load_loops_normals_into_global_cache(ob):
    global b4w_loops_normals
    global b4w_vertex_to_loops_map
    b4w_loops_normals, b4w_vertex_to_loops_map = load_loops_normals(ob)
    resize_array_if_need(b4w_loops_normals_select, len(b4w_loops_normals))

def check_b4w_obj_prop(context):
    if 'b4w_select' not in context.active_object:
        context.active_object['b4w_select'] = 0
    if 'b4w_select_vertex' not in context.active_object:
        context.active_object['b4w_select_vertex'] = 0

def prepare(context):
    check_b4w_obj_prop(context)
    load_loops_normals_into_global_cache(context.active_object)

class B4W_ShapeKeysNormal(bpy.types.PropertyGroup):
    normal = bpy.props.FloatVectorProperty(name=_("Normal"), subtype="NONE",
            unit="NONE", size=3)

def b4w_select(self, context):
    b4w_split = context.window_manager.b4w_split
    obj = context.active_object
    size = 0

    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.mode_set(mode="EDIT")
    prepare(context)

    sel_vert = find_single_selected_vertex(obj)
    if sel_vert != -1:
        context.active_object['b4w_select_vertex'] = sel_vert

    b4w_select_vertex = context.active_object['b4w_select_vertex']

    array = []
    if not b4w_split:
        size = len(context.active_object.data.vertices)
        array = context.active_object.data.vertices
    else:
        size = len(b4w_vertex_to_loops_map[b4w_select_vertex])
        array = b4w_vertex_to_loops_map[b4w_select_vertex]

    obj['b4w_select'] = obj['b4w_select'] % size
    b4w_select = obj['b4w_select']

    if not b4w_split:
        obj['b4w_select_vertex'] = obj['b4w_select']

    bpy.ops.object.mode_set(mode='OBJECT')

    for i in range(size):
        select = i == b4w_select
        if not b4w_split:
            array[i].select = copy.copy(select)
        else:
            b4w_loops_normals_select[array[i]] = copy.copy(select)
            if select:
                global b4w_vn_customnormal_updated
                b4w_vn_customnormal_updated = True
                context.window_manager.b4w_vn_customnormal1 = copy.copy(
                    b4w_loops_normals[array[i]])
                b4w_vn_customnormal_updated = False
    bpy.ops.object.mode_set(mode='EDIT')

class B4W_VertexNormalsUI(bpy.types.Panel):
    # draw UI buttons
    bl_idname = "B4W_VIEW3D_PT_normal_editor"
    bl_label = _('Normal Editor')
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'TOOLS'
    bl_category = "Blend4Web"
    def __init__(self):
        pass

    @classmethod
    def poll(self, context):
        try:
            ob = context.active_object
            if ob.type == 'MESH':
                return True
            else:
                return False
        except AttributeError:
            return False

    def draw(self, context):
        is_edit_mode = context.active_object.mode == 'EDIT'

        layout = self.layout
        row = layout.row(align=True)
        row.prop(context.active_object.data, 'use_auto_smooth',
            text=_('Activate'), toggle=True, icon='MOD_NORMALEDIT')

        sep = layout.separator()

        # draw normals
        row = layout.row(align=True)
        row.active = context.active_object.data.use_auto_smooth
        row.prop(context.active_object.data, 'show_normal_loop', text=_('Show Normals'),
            toggle=True, icon='LOOPSEL')
        row.enabled = is_edit_mode
        row.prop(bpy.context.scene.tool_settings, 'normal_size', text=_('Size'))
        row.enabled = is_edit_mode

        # Split normals
        row = layout.row()
        row.prop(context.window_manager, 'b4w_split', text = _('Split Mode'),
                 toggle=True)
        row.enabled = is_edit_mode
        row.active = context.active_object.data.use_auto_smooth
        # selection tools
        # selected single vertex index
        row.prop(context.active_object, 'b4w_select', text=_('Index'))

        sep = layout.separator()

        row = layout.row()
        row.active = context.active_object.data.use_auto_smooth
        row.operator('object.b4w_normal_rotate', text = p_('Rotate', "Operator"))
        row.enabled = is_edit_mode

        row = layout.row()
        row.active = context.active_object.data.use_auto_smooth
        row.prop(context.window_manager, 'b4w_normal_edit_mode', expand=True)

        if context.window_manager.b4w_normal_edit_mode == "ABSOLUTE":
            # manipulate normals
            row = layout.row()
            row.active = context.active_object.data.use_auto_smooth
            row.column().prop(context.window_manager, 'b4w_vn_customnormal2',
                expand=True, text='')
            row.enabled = is_edit_mode
            # ball
            row.prop(context.window_manager, 'b4w_vn_customnormal1', text='')
            row.enabled = is_edit_mode
        else:
            row = layout.row(align=True)
            row.column(align=True).prop(context.window_manager, 'b4w_customnormal_offset', text='', expand=True)

            row = layout.row(align=True)
            row.operator("object.b4w_apply_offset", text="Sub", icon='ZOOMOUT').sign = -1
            row.operator("object.b4w_apply_offset", text="Add", icon='ZOOMIN').sign = 1

        layout.separator()

        # average
        row = layout.row(align=True)
        row.enabled = is_edit_mode
        row.active = context.active_object.data.use_auto_smooth
        row.operator('object.b4w_smooth_normals', text = p_('Average', "Operator"))

        # restore/smooth
        row = layout.row(align=True)
        row.active = context.active_object.data.use_auto_smooth
        row.operator('object.b4w_restore_normals', text = p_('Restore', "Operator"))
        row.enabled = is_edit_mode

        # copy and paste
        row = layout.row(align=True)
        row.active = context.active_object.data.use_auto_smooth
        row.operator('object.copy_normal', text = p_('Copy', "Operator"), icon='COPYDOWN')
        row.operator('object.paste_normal', text = p_('Paste', "Operator"), icon='PASTEDOWN')
        row.enabled = is_edit_mode

        sep = layout.separator()

        # other edit operations
        row = layout.row(align=True)
        row.active = context.active_object.data.use_auto_smooth
        row.operator('object.tree_vertex_normals', text = p_('Tree', "Operator"))
        row.operator('object.foliage_vertex_normals', text = p_('Foliage', "Operator"))
        row.operator('object.face_vertex_normals', text = p_('Face', "Operator"))
        row.enabled = not context.window_manager.b4w_split and is_edit_mode

        row = layout.row(align=True)
        row.active = context.active_object.data.use_auto_smooth
        if context.window_manager.b4w_copy_normal_method == "MATCHED":
            row.operator('object.copy_normals_from_mesh', text = p_('Copy From Mesh', "Operator"))
        else:
            row.operator('b4w.approx_normals_from_mesh', text = p_('Copy From Mesh', "Operator"))
        row.prop(context.window_manager, 'b4w_copy_normal_method', text='')
        row.enabled = not is_edit_mode

class B4W_TreeVertexNormals(bpy.types.Operator):
    # tree vertex normals
    # process only selected vertices
    # skip unselected to preserve normals on non transparent geometry

    bl_idname = 'object.tree_vertex_normals'
    bl_label = p_('Vertex Normal Tree', "Operator")
    bl_description = _('Align selected verts pointing away from 3d cursor')
    bl_options = {"INTERNAL"}

    def execute(self, context):
        bpy.ops.object.mode_set(mode='OBJECT')
        bpy.ops.object.mode_set(mode='EDIT')
        prepare(context)
        obj = context.active_object
        vert_index = len(bpy.context.active_object.data.vertices)
        obmat = context.active_object.matrix_world
        vec1 = obmat.inverted() * context.scene.cursor_location

        bpy.ops.object.mode_set(mode='OBJECT')

        for i in range(vert_index):
            if context.active_object.data.vertices[i].select == True:
                vec2 = obj.data.vertices[i].co
                newnormal = vec2 - vec1
                newnormal = newnormal.normalized()
                set_vertex_normal(i, (newnormal.x, newnormal.y, newnormal.z))

        bpy.ops.object.mode_set(mode='OBJECT')
        obj.data.normals_split_custom_set(b4w_loops_normals)
        bpy.ops.object.mode_set(mode='EDIT')

        context.area.tag_redraw()
        return {'FINISHED'}


class B4W_FoliageVertexNormals(bpy.types.Operator):
    # foliage vertex normals
    # align selected verts to global z axis
    bl_idname = 'object.foliage_vertex_normals'
    bl_label = p_('Vertex Normal Foliage', "Operator")
    bl_description = _('Selected verts to Z axis')
    bl_options = {"INTERNAL"}

    def execute(self, context):
        bpy.ops.object.mode_set(mode='OBJECT')
        bpy.ops.object.mode_set(mode='EDIT')
        prepare(context)
        obj = context.active_object
        vert_index = len(bpy.context.active_object.data.vertices)
        vec1 = context.scene.cursor_location

        bpy.ops.object.mode_set(mode='OBJECT')

        for i in range(vert_index):

            # selected verts will align on z-axis
            if context.active_object.data.vertices[i].select == True:
                normal = context.active_object.rotation_euler.to_matrix().inverted() * mathutils.Vector((0.0, 0.0, 1.0))
                set_vertex_normal(i, (normal.x, normal.y, normal.z))

        bpy.ops.object.mode_set(mode='OBJECT')
        obj.data.normals_split_custom_set(b4w_loops_normals)
        bpy.ops.object.mode_set(mode='EDIT')
        context.area.tag_redraw()

        return {'FINISHED'}

class B4W_FaceVertexNormals(bpy.types.Operator):
    # face orientation
    bl_idname = 'object.face_vertex_normals'
    bl_label = p_('Vertex Normal Face', "Operator")
    bl_description = _('Copy face normal')
    bl_options = {"INTERNAL"}

    def execute(self, context):
        bpy.ops.object.mode_set(mode='OBJECT')
        bpy.ops.object.mode_set(mode='EDIT')
        prepare(context)
        obj = context.active_object
        mesh = obj.data

        bpy.ops.object.mode_set(mode='OBJECT')

        sel_indices = []

        for i in range(len(mesh.vertices)):
            if mesh.vertices[i].select == True:
                sel_indices.append(i)

        if len(sel_indices) < 3:
            self.report({'INFO'}, _('Please select at least 3 vertices'))
            return {"FINISHED"}

        for p in mesh.polygons:
            all_in = True

            for i in sel_indices:
                if mesh.vertices[i].index not in p.vertices:
                    all_in = False
                    break

            if all_in:
                for i in sel_indices:
                    set_vertex_normal(i, (p.normal.x, p.normal.y, p.normal.z))

        bpy.ops.object.mode_set(mode='OBJECT')
        obj.data.normals_split_custom_set(b4w_loops_normals)
        bpy.ops.object.mode_set(mode='EDIT')

        context.area.tag_redraw()
        return {'FINISHED'}

class B4W_CopyNormalsFromMesh(bpy.types.Operator):
    # copy normals from another mesh if |v1 - v2| -> 0

    bl_idname = 'object.copy_normals_from_mesh'
    bl_label = p_("B4W Copy Normals From Mesh (Matched)", "Operator")
    bl_description = _('Copy normals from the selected to the active mesh' +
                        ' for selected vertices')
    bl_options = {"INTERNAL"}

    def execute(self, context):
        prepare(context)
        norm_edited = False
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

            src_loops_normals, src_vert_to_loops_map = load_loops_normals(obj_source)

            delta = 0.000001
            verts_is_selected = False
            for v in verts_target:
                if v.select:
                    verts_is_selected = True
                    break
            verts_target_count = len(verts_target)
            for i in range(verts_target_count):
                if not verts_is_selected or verts_target[i].select:
                    for j in range(len(verts_source)):
                        if (verts_target[i].co - verts_source[j].co).length < delta:
                            n = mathutils.Vector()
                            for l in src_vert_to_loops_map[j]:
                                n = n + mathutils.Vector(src_loops_normals[l])
                            n = n / len(src_vert_to_loops_map[j])
                            set_vertex_normal(i, (n.x, n.y, n.z))
                            norm_edited = True
        if norm_edited:
            obj_target.data.normals_split_custom_set(b4w_loops_normals)

        context.area.tag_redraw()
        return {'FINISHED'}

class B4W_ApproxNormalsFromMesh(bpy.types.Operator):
    # copy normals from the nearest vertices of another mesh
    bl_idname = "b4w.approx_normals_from_mesh"
    bl_label = p_("B4W Copy Normals From Mesh (Nearest)", "Operator")
    bl_description = _("Approximate target mesh normals from source mesh")
    bl_options = {"INTERNAL"}

    def execute(self, context):
        prepare(context)
        if len(bpy.context.selected_objects) != 2:
            print('Wrong selection')
            self.report({'INFO'}, _('Please select 2 meshes'))
        else:
            self.approx_normals(context)
            context.area.tag_redraw()
        return {"FINISHED"}

    def approx_normals(self, context):
        obj_dst = context.active_object
        if context.selected_objects[0].name!=obj_dst.name:
            obj_src = context.selected_objects[0]
        else:
            obj_src = context.selected_objects[1]

        mesh_src = obj_src.data
        mesh_dst = obj_dst.data

        src_loops_normals, src_vert_to_loops_map = load_loops_normals(obj_src)

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
                        if vert_src.index in src_vert_to_loops_map: # vertex must be connected
                            min_distance = distance
                            min_index = vert_src.index
                n = mathutils.Vector()

                for l in src_vert_to_loops_map[min_index]:
                    n = n + mathutils.Vector(src_loops_normals[l])
                n = n / len(src_vert_to_loops_map[min_index])
                n = matr_dst.to_quaternion().inverted() \
                        * matr_src.to_quaternion() \
                        * n
                set_vertex_normal(vert_dst.index, (n.x, n.y, n.z))

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

        obj_dst.data.normals_split_custom_set(b4w_loops_normals)

def get_selected_split_normal_idx(obj):
    vert_index = len(obj.data.vertices)
    for i in range(vert_index):
        if obj.data.vertices[i].select == True:
            obj["b4w_select_vertex"] = i
            break
    array = b4w_vertex_to_loops_map[obj["b4w_select_vertex"]]
    return array[obj["b4w_select"]%len(array)]

# main function for update custom normals
# trans_param depends on trans_type
# if trans_type == rotate -> strans_param == rotation matrix,
# else trans_param is normal vector
def update_custom_normal(self, context, trans_param, trans_type = "set",
        init_normals = None):
    global b4w_loops_normals

    # toggle mode for update selection
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.mode_set(mode="EDIT")

    check_b4w_obj_prop(context)
    # forced to load normals always because smooth/flat shading can be changed
    # no simple way to detect this change
    load_loops_normals_into_global_cache(context.active_object)
    #
    normals_edited = False
    obj = context.active_object
    vert_index = len(obj.data.vertices)
    if not context.window_manager.b4w_split:
        for i in range(vert_index):
            # selected verts align on custom normal
            if obj.data.vertices[i].select == True:
                normals_edited = True
                if trans_type == "rotate":
                    n = trans_param * mathutils.Vector(init_normals[i])
                else:
                    n = copy.copy(trans_param)
                    n.normalize()
                set_vertex_normal(i, (n.x, n.y, n.z))
    else:
        ind = get_selected_split_normal_idx(obj)

        if trans_type == "rotate":
            oldn = mathutils.Vector(init_normals[ind])
            n = trans_param * oldn
        else:
            n = copy.copy(trans_param)
            n.normalize()
        b4w_loops_normals[ind] = (n.x, n.y, n.z)
        normals_edited = True

    if normals_edited:
        bpy.ops.object.mode_set(mode="OBJECT")
        obj.data.normals_split_custom_set(b4w_loops_normals)
        bpy.ops.object.mode_set(mode="EDIT")

def update_custom_normal1(self, context):
    global b4w_vn_customnormal_updated
    b4w_vn_customnormal_updated = b4w_vn_customnormal_updated + 1
    if b4w_vn_customnormal_updated > 1:
        b4w_vn_customnormal_updated = 0
        return
    update_custom_normal(self, context,
        context.active_object.matrix_world.inverted()*context.window_manager.b4w_vn_customnormal1)
    context.window_manager.b4w_vn_customnormal2 = copy.copy(
        context.window_manager.b4w_vn_customnormal1)

def update_custom_normal2(self, context):
    global b4w_vn_customnormal_updated
    b4w_vn_customnormal_updated = b4w_vn_customnormal_updated + 1
    if b4w_vn_customnormal_updated > 1:
        b4w_vn_customnormal_updated = 0
        return
    update_custom_normal(self, context, context.active_object.matrix_world.inverted()*
        context.window_manager.b4w_vn_customnormal2)
    if context.window_manager.b4w_vn_customnormal2.length != 0:
        context.window_manager.b4w_vn_customnormal1 = copy.copy(
            context.window_manager.b4w_vn_customnormal2)

def find_single_selected_vertex(object):
    vertices = object.data.vertices
    found = 0
    last = -1
    for i in range(len(vertices)):
        if vertices[i].select:
            last = i
            found += 1
    if found == 1:
        return last
    else:
        return -1

class B4W_CopyNormal(bpy.types.Operator):
    # copy normal
    bl_idname = 'object.copy_normal'
    bl_label = p_('Copy Normal', "Operator")
    bl_description = _('Copies normal from selected Vertex')
    bl_options = {"INTERNAL"}

    def execute(self, context):
        bpy.ops.object.mode_set(mode="OBJECT")
        bpy.ops.object.mode_set(mode="EDIT")
        prepare(context)
        obj = context.active_object
        vert_index = len(context.active_object.data.vertices)
        if not context.window_manager.b4w_split:
            check = 0
            # inverse selection
            for h in range(vert_index):
                if context.active_object.data.vertices[h].select == True:
                    check += 1
            if check == 1:
                for i in range(vert_index):
                    if context.active_object.data.vertices[i].select == True:
                        result = mathutils.Vector()
                        for l in b4w_vertex_to_loops_map[i]:
                            result = result + mathutils.Vector(b4w_loops_normals[l])
                        result = result / len(b4w_vertex_to_loops_map[i])
                        context.window_manager.b4w_vn_copynormal = result

            else:
                self.report({'INFO'}, _('Please select a single vertex'))
            return {'FINISHED'}
        else:
            for i in range(vert_index):
                if obj.data.vertices[i].select == True:
                    obj["b4w_select_vertex"] = i
                    break
            array = b4w_vertex_to_loops_map[obj["b4w_select_vertex"]]
            ind = array[obj["b4w_select"]%len(array)]
            context.window_manager.b4w_vn_copynormal = mathutils.Vector(b4w_loops_normals[ind])
            return {'FINISHED'}

class B4W_PasteNormal(bpy.types.Operator):
    # paste normal
    bl_idname = 'object.paste_normal'
    bl_label = p_('Paste Normal', "Operator")
    bl_description = _('Paste normal to selected Vertex')
    bl_options = {"INTERNAL"}

    def execute(self, context):
        bpy.ops.object.mode_set(mode="OBJECT")
        bpy.ops.object.mode_set(mode="EDIT")
        obj = context.active_object
        check_b4w_obj_prop(context)
        load_loops_normals_into_global_cache(obj)
        vert_index = len(context.active_object.data.vertices)

        check = 0
        normals_edited = False

        if not context.window_manager.b4w_split:
            for h in range(vert_index):
                if context.active_object.data.vertices[h].select == True:
                    check += 1
            if check >= 1:
                for i in range(vert_index):
                    if context.active_object.data.vertices[i].select == True:
                        n = context.window_manager.b4w_vn_copynormal
                        set_vertex_normal(i, (n[0], n[1], n[2]))
                        normals_edited = True
            else:
                self.report({'INFO'}, _('Please select at least one vertex'))
        else:
            array = b4w_vertex_to_loops_map[obj["b4w_select_vertex"]]
            ind = array[obj["b4w_select"]%len(array)]
            n = context.window_manager.b4w_vn_copynormal
            b4w_loops_normals[ind] = (n[0], n[1], n[2])
            normals_edited = True

        if normals_edited:
            bpy.ops.object.mode_set(mode="OBJECT")
            obj.data.normals_split_custom_set(b4w_loops_normals)
            bpy.ops.object.mode_set(mode="EDIT")
        return {'FINISHED'}

class B4W_ApplyOffset(bpy.types.Operator):
    bl_idname = "object.b4w_apply_offset"
    bl_label = p_("Apply offset", "Operator")
    bl_description = _('Apply offset for selected normals')
    bl_options = {"INTERNAL"}
    sign = bpy.props.IntProperty(
        name = "B4W: offset sign",
        description = _("Offset sign"),
        default = 1
    )
    def execute(self, context):
        bpy.ops.object.mode_set(mode='OBJECT')
        bpy.ops.object.mode_set(mode='EDIT')
        vertices = context.active_object.data.vertices
        check_b4w_obj_prop(context)
        load_loops_normals_into_global_cache(context.active_object)
        context.active_object.data.calc_normals()
        offset = context.active_object.rotation_euler.to_matrix().inverted() * context.window_manager.b4w_customnormal_offset

        if context.window_manager.b4w_split:
            idx = get_selected_split_normal_idx(context.active_object)
            self.apply(idx, offset)
        else:
            for i in range(len(vertices)):
                    if vertices[i].select:
                        for l in b4w_vertex_to_loops_map[i]:
                            self.apply(l, offset)
        bpy.ops.object.mode_set(mode='OBJECT')
        context.active_object.data.normals_split_custom_set(b4w_loops_normals)
        bpy.ops.object.mode_set(mode='EDIT')
        return{'FINISHED'}

    def apply(self, idx, offset):
        x, y, z = b4w_loops_normals[idx]
        n = mathutils.Vector((x + self.sign * offset.x,
                              y + self.sign * offset.y,
                              z + self.sign * offset.z)).normalized()
        b4w_loops_normals[idx] = (n.x, n.y, n.z)


class B4W_RestoreNormals(bpy.types.Operator):
    # clean up normal list
    bl_idname = "object.b4w_restore_normals"
    bl_label = p_("Restore Normals from vertices", "Operator")
    bl_description = _('Restore normals from vertices')
    bl_options = {"INTERNAL"}

    def execute(self, context):
        bpy.ops.object.mode_set(mode='OBJECT')
        bpy.ops.object.mode_set(mode='EDIT')
        vertices = context.active_object.data.vertices
        polygons = context.active_object.data.polygons
        check_b4w_obj_prop(context)
        load_loops_normals_into_global_cache(context.active_object)
        context.active_object.data.calc_normals()
        if not context.window_manager.b4w_split:
            # copy normals from vertexes
            for i in range(len(vertices)):
                n = vertices[i].normal
                if vertices[i].select == True:
                    set_vertex_normal(i, (n.x,n.y,n.z))
        else:
            # copy normals from polygons
            # bruteforce, so it is very slow
            for i in range(len(vertices)):
                if vertices[i].select:
                    for l in b4w_vertex_to_loops_map[i]:
                        for p in polygons:
                            for li in p.loop_indices:
                                if li == l:
                                    n = p.normal
                                    b4w_loops_normals[l] = (n.x, n.y, n.z)

        bpy.ops.object.mode_set(mode='OBJECT')
        context.active_object.data.normals_split_custom_set(b4w_loops_normals)
        bpy.ops.object.mode_set(mode='EDIT')

        return{'FINISHED'}

class B4W_SmoothNormals(bpy.types.Operator):
    # clean up normal list
    bl_idname = "object.b4w_smooth_normals"
    bl_label = p_("Average Normals", "Operator")
    bl_description = _('Average normals')
    bl_options = {"INTERNAL"}

    def execute(self, context):
        vertices = context.active_object.data.vertices
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.object.mode_set(mode='OBJECT')
        check_b4w_obj_prop(context)
        load_loops_normals_into_global_cache(context.active_object)
        N = mathutils.Vector()
        for i in range(len(vertices)):
            if vertices[i].select:
                n = mathutils.Vector()
                for j in b4w_vertex_to_loops_map[i]:
                    n = n + mathutils.Vector(b4w_loops_normals[j])
                n.normalize()
                if context.window_manager.b4w_split:
                    set_vertex_normal(i, (n.x,n.y,n.z))
                else:
                    N += n
        N.normalize()

        if not context.window_manager.b4w_split:
            for i in range(len(vertices)):
                if vertices[i].select:
                    set_vertex_normal(i, (N.x, N.y, N.z))

        bpy.ops.object.mode_set(mode='OBJECT')
        context.active_object.data.normals_split_custom_set(b4w_loops_normals)
        bpy.ops.object.mode_set(mode='EDIT')

        return{'FINISHED'}

#------------ rotate normal -----------

class OperatorRotateNormal(bpy.types.Operator):
    bl_idname = "object.b4w_normal_rotate"
    bl_label = p_("Rotate Normal", "Operator")
    bl_options = {"INTERNAL"}

    number_strs =\
        [["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"],
        ["NUMPAD_0", "NUMPAD_1", "NUMPAD_2", "NUMPAD_3", "NUMPAD_4", "NUMPAD_5", "NUMPAD_6", "NUMPAD_7", "NUMPAD_8", "NUMPAD_9"]]

    number_arr = []

    def calc_mouse_view(self, context):
        a = None
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                for r in area.regions:
                    if r.type == 'WINDOW':
                        if (r.x <= self.mouse_x < (r.x+area.width) and
                            r.y <= self.mouse_y < (r.y + area.height)):
                            a = r

        if a:
            width = a.width
            height = a.height
            a_x = a.x
            a_y = a.y
        else:
            return None
        mouse = mathutils.Vector(((self.mouse_x- a_x)/width*2 -1,
            (self.mouse_y - a_y)/height*2 -1 , 0 ))
        mouse = context.space_data.region_3d.window_matrix.inverted() * mouse
        return mouse
    def calc_mouse_world(self, context):
        mouse = self.calc_mouse_view(context)
        if mouse:
            return context.space_data.region_3d.view_matrix.inverted() * mouse
        else:
            return None

    def execute(self, context):
        # here is main rotation logic

        global rotation_helper_params

        # calculate vector that point into eye and depends on center of rotation
        eye_n = mathutils.Vector(context.space_data.region_3d.view_matrix[2][:3])
        eye_co = (context.space_data.region_3d.view_location +
            eye_n*context.space_data.region_3d.view_distance)
        obimat = context.active_object.matrix_world.inverted()
        c_local = obimat * rotation_helper_params.c_world
        eye_co_local = obimat * eye_co
        n = eye_co_local - c_local
        n.normalize()

        if rotation_helper_params.degrees:
            if rotation_helper_params.constraint:
                matrix = mathutils.Quaternion(bpy.context.active_object.matrix_world.inverted() *
                                              mathutils.Vector(rotation_helper_params.constraint),
                                              -radians(rotation_helper_params.degrees)).to_matrix()
            else:
                matrix = mathutils.Quaternion(n, -radians(rotation_helper_params.degrees)).to_matrix()
        else:
            rotation_helper_params.mouse_world = self.calc_mouse_world(context)
            if not rotation_helper_params.mouse_world:
                return
            rotation_helper_params.mouse_local = context.active_object.matrix_world.inverted() *\
                                                 rotation_helper_params.mouse_world

            if not self.mouse_local_old:
                self.mouse_local_old = rotation_helper_params.mouse_local

            # calculate projection of c_local on viewplane
            c_pr = c_local + n * (n *
                (rotation_helper_params.mouse_local - c_local))

            # calculate main vectors
            r_old = self.mouse_local_old - c_pr
            r = rotation_helper_params.mouse_local - c_pr

            # calculate projection of main vectors on orthogonal to view vector plane
            r_pr = r - n*r*n
            r_old_pr = r_old - n*r_old*n

            r_pr.normalize()
            r_old_pr.normalize()

            # calculate main rotation matrix
            matrix = r_old_pr.rotation_difference(r_pr).to_matrix()

            # correct rotation matrix in correspondence to constraint
            if rotation_helper_params.constraint:
                constraint = context.active_object.matrix_world.inverted() * mathutils.Vector(rotation_helper_params.constraint)
                if n*constraint < 0:
                    n = -n
                matrix = n.rotation_difference(constraint).to_matrix() * matrix

        if context.window_manager.b4w_split:
            update_custom_normal(self, context, matrix, "rotate",
                self.init_loops_normals)
        else:
            update_custom_normal(self, context, matrix, "rotate",
                self.init_normals)

    def number_str_to_int(self, number_str):
        try:
            try:
                n = self.number_strs[0].index(number_str)
            except ValueError:
                n = -1
            if n >= 0:
                return n
            else:
                return self.number_strs[1].index(number_str)
        except ValueError:
            return -1

    def number_arr_to_int(self, number_str_arr):
        l = len(number_str_arr)-1
        number = 0
        for i in range(0, len(number_str_arr)):
            number += self.number_str_to_int(number_str_arr[i]) * pow(10, l - i)

        return number

    def calc_typed_rotation(self):
        if len(self.number_arr) > 1:
            degrees = self.number_arr_to_int(self.number_arr[1:])
            rotation_helper_params.degrees = degrees*self.number_arr[0]
        else:
            rotation_helper_params.degrees = 0

    def modal(self, context, event):
        if event.type == "MOUSEMOVE":
            self.mouse_x = event.mouse_x
            self.mouse_y = event.mouse_y
            if not rotation_helper_params.degrees:
                self.execute(context)
        elif event.type == 'X':
            rotation_helper_params.constraint = (1,0,0)
            context.area.tag_redraw()
        elif event.type == 'Y':
            rotation_helper_params.constraint = (0,1,0)
            context.area.tag_redraw()
        elif event.type == 'Z':
            rotation_helper_params.constraint = (0,0,1)
            context.area.tag_redraw()
        elif event.type in ["LEFTMOUSE", "RET"]:  # Confirm
            rotation_helper_params.is_active = False
            rotation_helper_params.constraint = None
            rotation_helper_params.degrees = None
            context.area.tag_redraw()
            return {'FINISHED'}
        elif event.type in ["MINUS", "NUMPAD_MINUS"]:
            if len(self.number_arr) == 0:
                self.number_arr.append(-1)
        elif event.type == "BACK_SPACE":
            if event.value == "PRESS":
                if len(self.number_arr):
                    self.number_arr.pop()
                    self.calc_typed_rotation()
                    self.execute(context)
        elif self.number_str_to_int(event.type) >= 0:
            if event.value == "PRESS":
                if len(self.number_arr) == 0:
                    self.number_arr.append(1)
                self.number_arr.append(event.type)
                self.calc_typed_rotation()
                self.execute(context)
        elif event.type in ('RIGHTMOUSE', 'ESC'):  # Cancel
            rotation_helper_params.is_active = False
            rotation_helper_params.constraint = None
            rotation_helper_params.degrees = None
            bpy.ops.object.mode_set(mode="OBJECT")
            context.active_object.data.normals_split_custom_set(
                self.init_loops_normals)
            bpy.ops.object.mode_set(mode="EDIT")
            load_loops_normals_into_global_cache(context.active_object)
            context.area.tag_redraw()
            return {'CANCELLED'}
        # context.area.tag_redraw()
        return {'RUNNING_MODAL'}

    def invoke(self, context, event):
        # initialization
        self.number_arr.clear()
        if not context.active_object.data.use_auto_smooth:
            return {'CANCELLED'}
        global b4w_loops_normals
        global b4w_vertex_to_loops_map
        global rotation_helper_params

        # toggle mode for update selection
        bpy.ops.object.mode_set(mode="OBJECT")
        bpy.ops.object.mode_set(mode="EDIT")

        load_loops_normals_into_global_cache(context.active_object)

        rotation_helper_params.is_active = True
        self.mouse_x = event.mouse_x
        self.mouse_y = event.mouse_y

        # make a copy of all normals which will be as start data
        self.init_loops_normals = copy.copy(b4w_loops_normals)
        if not context.window_manager.b4w_split:
            self.init_normals = []
            i = 0
            j = 0
            for v in context.active_object.data.vertices:
                vert = mathutils.Vector()
                # check for floating vertices
                if i in b4w_vertex_to_loops_map:
                    for j in b4w_vertex_to_loops_map[i]:
                        vert = vert + mathutils.Vector(b4w_loops_normals[j])
                else:
                    vert = mathutils.Vector()
                vert = vert / (j+1)
                i = i + 1
                self.init_normals.append(vert)

        # calculate rotation center
        rotation_helper_params.c_world = mathutils.Vector((0,0,0))
        n = 0;
        for v in context.active_object.data.vertices:
            if v.select:
                rotation_helper_params.c_world = rotation_helper_params.c_world + v.co
                n = n + 1
                if context.window_manager.b4w_split:
                    break
        if n>0:
            rotation_helper_params.c_world = (context.active_object.matrix_world *
                (rotation_helper_params.c_world / n))

        rotation_helper_params.constraint = None

        mouse_world = self.calc_mouse_world(context)
        if mouse_world:
            self.mouse_local_old = context.active_object.matrix_world.inverted() * mouse_world
        else:
            self.mouse_local_old = None

        self.execute(context)
        context.window_manager.modal_handler_add(self)
        return {'RUNNING_MODAL'}

#------------- hotkey -------------

def menu_func(self, context):
    self.layout.operator(OperatorRotateNormal.bl_idname)
addon_keymaps = []

def register_hotkey():
    bpy.types.VIEW3D_MT_object.append(menu_func)

    # handle the keymap
    wm = bpy.context.window_manager
    # if running not in background
    if wm.keyconfigs:
        km = wm.keyconfigs.addon.keymaps.new(name='Mesh', space_type='EMPTY')
        kmi = km.keymap_items.new(OperatorRotateNormal.bl_idname, 'R', 'PRESS',
            ctrl=True, shift=True)
        addon_keymaps.append(km)

def unregister_hotkey():
    bpy.types.VIEW3D_MT_object.remove(menu_func)

    # handle the keymap
    wm = bpy.context.window_manager
    if wm.keyconfigs:
        for km in addon_keymaps:
            wm.keyconfigs.addon.keymaps.remove(km)
        # clear the list
        del addon_keymaps[:]

#------------ draw helpers ---------

def draw_axis():
    n = mathutils.Vector(rotation_helper_params.constraint)
    v1 = rotation_helper_params.c_world - n*25000
    v2 = rotation_helper_params.c_world + n*25000
    bgl.glColor4f(n.x, n.y, n.z, 0.5)

    # draw line
    bgl.glEnable(bgl.GL_BLEND)
    bgl.glLineWidth(1)
    bgl.glBegin(bgl.GL_LINES)
    bgl.glVertex3f(v1.x,v1.y,v1.z)
    bgl.glVertex3f(v2.x,v2.y,v2.z)
    bgl.glEnd()
    bgl.glDisable(bgl.GL_BLEND)

def draw_normal(context, vertexloc, vertexnorm, objscale, is_selected = True):
    # draw normals in object mode
    obj = context.active_object
    color1, thick1 = (0.5, 1.0, 1.0, 1.0), 3

    # input in localspace
    vertexloc = copy.copy(vertexloc)
    vertexloc.resize_4d()
    obmat = obj.matrix_world
    r1 = obmat*vertexloc
    r1.resize_3d()
    del vertexloc
    r2 = obj.rotation_euler.to_matrix() * mathutils.Vector(vertexnorm)
    r2 = r2* objscale
    r2 = r2* context.scene.tool_settings.normal_size + r1

    bgl.glEnable(bgl.GL_BLEND)

    bgl.glLineWidth(thick1)
    # set colour
    bgl.glColor4f(*color1)
    # draw line
    bgl.glBegin(bgl.GL_LINES)

    bgl.glVertex3f(r1.x,r1.y,r1.z)
    bgl.glVertex3f(r2.x,r2.y,r2.z)

    bgl.glEnd()
    bgl.glDisable(bgl.GL_BLEND)

def draw_rotation_line():
    v1 = rotation_helper_params.c_world
    if rotation_helper_params.mouse_world:
        v2 = rotation_helper_params.mouse_world
    else:
        v2 = mathutils.Vector()

    bgl.glEnable(bgl.GL_BLEND)
    bgl.glEnable(bgl.GL_LINE_STIPPLE)
    bgl.glLineWidth(1)
    bgl.glLineStipple(3, 0xAAAA)
    bgl.glDepthMask(bgl.GL_FALSE)
    bgl.glDisable(bgl.GL_DEPTH_TEST);
    bgl.glColor4f(0, 0, 0, 1)
    bgl.glBegin(bgl.GL_LINES)
    bgl.glVertex3f(v1.x,v1.y,v1.z)
    bgl.glVertex3f(v2.x,v2.y,v2.z)
    bgl.glEnd()
    bgl.glEnable(bgl.GL_DEPTH_TEST);
    bgl.glDepthMask(bgl.GL_TRUE)
    bgl.glDisable(bgl.GL_LINE_STIPPLE)
    bgl.glDisable(bgl.GL_BLEND)

def draw_helpers():
    context = bpy.context
    obj = context.active_object

    if (context.active_object != None and obj.type == 'MESH' and
            context.active_object.mode == 'EDIT'):
        line_width = bgl.Buffer(bgl.GL_FLOAT, 1)
        bgl.glGetFloatv(bgl.GL_LINE_WIDTH, line_width)
        if context.window_manager.b4w_split and "b4w_select_vertex" in obj:
            vertex = obj.data.vertices
            if not obj["b4w_select_vertex"] in b4w_vertex_to_loops_map:
                return
            array = b4w_vertex_to_loops_map[obj["b4w_select_vertex"]]
            ind = array[obj["b4w_select"]%len(array)]
            n = b4w_loops_normals[ind]
            draw_normal(context, vertex[obj["b4w_select_vertex"]].co, n, 1)
        if rotation_helper_params.is_active:
            draw_rotation_line()
            if rotation_helper_params.constraint:
                draw_axis()
        bgl.glLineWidth(line_width.to_list()[0])

def draw_helper_callback_enable():
    global helper_handle

    if helper_handle:
        return
    context = bpy.context

    helper_handle = bpy.types.SpaceView3D.draw_handler_add(draw_helpers, (),
        'WINDOW', 'POST_VIEW')

    for window in context.window_manager.windows:
        for area in window.screen.areas:
            if area.type == 'VIEW_3D':
                for region in area.regions:
                    if region.type == 'WINDOW':
                        region.tag_redraw()

def draw_helper_callback_disable():
    global helper_handle
    if not helper_handle:
        return
    try:
        bpy.types.SpaceView3D.draw_handler_remove(helper_handle, 'WINDOW')
    except:
        # already removed
        pass

#-----------------------------------

def init_properties():

    bpy.types.Object.b4w_shape_keys_normals = bpy.props.CollectionProperty(
        name=_("B4W: shape keys normal list"),
        type=B4W_ShapeKeysNormal,
        description=_("Shape keys normal list"))

    bpy.types.WindowManager.b4w_split = bpy.props.BoolProperty(
         name=_("B4W: edit split normals"),
         default=False,
         description=_("Edit split normals"))

    bpy.types.Object.b4w_select = bpy.props.IntProperty(
        name=_("B4W: selected normal"),
        default=0,
        update=b4w_select,
        description=_("Index of selected normal"))

    bpy.types.Object.b4w_select_vertex = bpy.props.IntProperty(
        name=_("B4W: selected vertex"),
        default=0,
        description=_("Index of selected vertex"))

    bpy.types.WindowManager.b4w_vn_copynormal = bpy.props.FloatVectorProperty(
        name=_("B4W: vertex normal copy"),
        default=(0.0, 0.0, 0.0),
        description=_("Vertex normal copy"))

    bpy.types.WindowManager.b4w_vn_customnormal1 = bpy.props.FloatVectorProperty(
        name=_("B4W: custom vertex normal 1"),
        default=(0.0, 0.0, 1.0),
        subtype = 'DIRECTION',
        update=update_custom_normal1,
        description=_("Custom vertex normal"))

    bpy.types.WindowManager.b4w_vn_customnormal2 = bpy.props.FloatVectorProperty(
        name=_("B4W: custom vertex normal 2"),
        default=(0.0, 0.0, 1.0),
        subtype = 'TRANSLATION',
        update=update_custom_normal2,
        description=_("Custom vertex normal"))

    bpy.types.WindowManager.b4w_customnormal_offset = bpy.props.FloatVectorProperty(
        name=_("B4W: custom vertex normal offset"),
        default=(0.0, 0.0, 0.0),
        subtype = 'TRANSLATION',
        description=_("Custom vertex normal offset"))

    bpy.types.WindowManager.b4w_copy_normal_method = bpy.props.EnumProperty(
        name = "B4W: method of copying normals",
        description = _("Copy from vertices"),
        items = [
            ("MATCHED", _("Matched Vertices"),
                _("Copy normals only from matched vertices of the source mesh"), 0),
            ("NEAREST", _("Nearest Vertices"),
                _("Copy normals from nearest vertices of the source mesh"), 1),
            # ("INTERPOLATED", "Interpolated Vertices",  "", 2), # -> proposed
        ],
        default = "NEAREST"
    )

    bpy.types.WindowManager.b4w_normal_edit_mode = bpy.props.EnumProperty(
        name = "B4W: edit mode",
        description = _("Normal Editor edit mode"),
        items =  [
        ("ABSOLUTE", "Absolute", "", 1),
        ("OFFSET", "Offset", "", 2)
        ],
        default = "ABSOLUTE"
    )

# clear properties
def clear_properties():
    # actually window_manager props are not stored in blend file
    # but keep this for future
    props = ['b4w_vn_customnormal1', 'b4w_vn_customnormal2',
             'b4w_vn_copynormal', 'b4w_customnormal_offset', 'b4w_normal_edit_mode']
    for p in props:
        if bpy.context.window_manager.get(p) != None:
            del bpy.context.window_manager[p]
        try:
            x = getattr(bpy.types.WindowManager, p)
            del x
        except:
            pass

def register():
    draw_helper_callback_enable()
    register_hotkey()
    init_properties()

def unregister():
    draw_helper_callback_disable()
    unregister_hotkey()
    clear_properties()
