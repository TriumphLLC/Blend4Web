# Original idea from the Recalc Vertex Normals add-on by adsn
    
import bpy
import mathutils
import bgl
from bpy.types import Panel
from rna_prop_ui import PropertyPanel
import copy
from collections import namedtuple

from math import sqrt

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
    c = mathutils.Vector()
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
                context.window_manager.b4w_vn_customnormal1 = copy.copy(
                    b4w_loops_normals[array[i]])
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

        row = layout.row(align=True)
        row.active = context.active_object.data.use_auto_smooth
        row.operator('object.b4w_smooth_normals', text = p_('Average Split', "Operator"))
        row.enabled = is_edit_mode and context.window_manager.b4w_split

        row = layout.row()
        row.active = context.active_object.data.use_auto_smooth
        row.operator('object.b4w_normal_rotate', text = p_('Rotate', "Operator"))
        row.enabled = is_edit_mode

        # manipulate normals
        row = layout.row()
        row.active = context.active_object.data.use_auto_smooth
        row.column().prop(context.window_manager, 'b4w_vn_customnormal2',
            expand=True, text='')
        row.enabled = is_edit_mode
        # ball
        row.prop(context.window_manager, 'b4w_vn_customnormal1', text='')
        row.enabled = is_edit_mode

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

        # another edit operations
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
        vec1 = context.scene.cursor_location

        bpy.ops.object.mode_set(mode='OBJECT')

        for i in range(vert_index):
            if context.active_object.data.vertices[i].select == True:
                vec2 = obj.data.vertices[i].co
                newvec = vec2 - vec1 + obj.location
                newnormal = newvec.normalized()

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
                set_vertex_normal(i, (0.0, 0.0, 1.0))

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
        for i in range(vert_index):
            if obj.data.vertices[i].select == True:
                obj["b4w_select_vertex"] = i
                break
        array = b4w_vertex_to_loops_map[obj["b4w_select_vertex"]]
        ind = array[obj["b4w_select"]%len(array)]
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
        context.window_manager.b4w_vn_customnormal1)
    context.window_manager.b4w_vn_customnormal2 = copy.copy(
        context.window_manager.b4w_vn_customnormal1)

def update_custom_normal2(self, context):
    global b4w_vn_customnormal_updated
    b4w_vn_customnormal_updated = b4w_vn_customnormal_updated + 1
    if b4w_vn_customnormal_updated > 1:
        b4w_vn_customnormal_updated = 0
        return
    update_custom_normal(self, context,
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
    bl_label = p_("Average Split Normals", "Operator")
    bl_description = _('Average split normals')
    bl_options = {"INTERNAL"}

    def execute(self, context):
        vertices = context.active_object.data.vertices
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.object.mode_set(mode='OBJECT')
        check_b4w_obj_prop(context)
        load_loops_normals_into_global_cache(context.active_object)
        for i in range(len(vertices)):
            if vertices[i].select:
                n = mathutils.Vector()
                for j in b4w_vertex_to_loops_map[i]:
                    n = n + mathutils.Vector(b4w_loops_normals[j])
                n = n/(i+1)
                set_vertex_normal(i, (n.x,n.y,n.z))

        bpy.ops.object.mode_set(mode='OBJECT')
        context.active_object.data.normals_split_custom_set(b4w_loops_normals)
        bpy.ops.object.mode_set(mode='EDIT')

        return{'FINISHED'}

#------------ rotate normal -----------

class OperatorRotateNormal(bpy.types.Operator):
    bl_idname = "object.b4w_normal_rotate"
    bl_label = p_("Rotate Normal", "Operator")
    bl_options = {"INTERNAL"}

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

        rotation_helper_params.mouse_world = self.calc_mouse_world(context)
        if not rotation_helper_params.mouse_world:
            return

        if not self.mouse_world_old:
            self.mouse_world_old = self.calc_mouse_world(context)

        # calculate vector that point into eye and depends on center of rotation
        eye_n = mathutils.Vector(context.space_data.region_3d.view_matrix[2][:3])
        eye_co = (context.space_data.region_3d.view_location +
            eye_n*context.space_data.region_3d.view_distance)
        n = eye_co - rotation_helper_params.c
        n.normalize()

        # calculate projection of c on viewplane
        c_pr = rotation_helper_params.c+n*(n*
            (rotation_helper_params.mouse_world - rotation_helper_params.c))

        # calculate main vectors
        r_old = self.mouse_world_old - c_pr
        r = rotation_helper_params.mouse_world - c_pr

        # calculate projection of main vectors on orthogonal to view vector plane
        r_pr = r - n*r*n
        r_old_pr = r_old - n*r_old*n

        r_pr.normalize()
        r_old_pr.normalize()

        # calculate main rotation matrix
        matrix = r_old_pr.rotation_difference(r_pr).to_matrix()

        # correct rotation matrix in correspondence to constraint
        if rotation_helper_params.constraint:
            constraint = mathutils.Vector(rotation_helper_params.constraint)
            if n*constraint < 0:
                n = -n
            matrix = n.rotation_difference(constraint).to_matrix() * matrix

        if context.window_manager.b4w_split:
            update_custom_normal(self, context, matrix, "rotate",
                self.init_loops_normals)
        else:
            update_custom_normal(self, context, matrix, "rotate",
                self.init_normals)

    def modal(self, context, event):
        if event.type == 'MOUSEMOVE':
            self.mouse_x = event.mouse_x
            self.mouse_y = event.mouse_y
            self.execute(context)
        elif event.type == 'X':
            rotation_helper_params.constraint = (1,0,0)
        elif event.type == 'Y':
            rotation_helper_params.constraint = (0,1,0)
        elif event.type == 'Z':
            rotation_helper_params.constraint = (0,0,1)
        elif event.type == 'LEFTMOUSE':  # Confirm
            rotation_helper_params.is_active = False
            rotation_helper_params.constraint = None
            context.area.tag_redraw()
            return {'FINISHED'}
        elif event.type in ('RIGHTMOUSE', 'ESC'):  # Cancel
            rotation_helper_params.is_active = False
            rotation_helper_params.constraint = None
            bpy.ops.object.mode_set(mode="OBJECT")
            context.active_object.data.normals_split_custom_set(
                self.init_loops_normals)
            bpy.ops.object.mode_set(mode="EDIT")
            load_loops_normals_into_global_cache(context.active_object)
            context.area.tag_redraw()
            return {'CANCELLED'}

        context.area.tag_redraw()
        return {'RUNNING_MODAL'}

    def invoke(self, context, event):
        # initialization
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
        rotation_helper_params.c = mathutils.Vector((0,0,0))
        n = 0;
        for v in context.active_object.data.vertices:
            if v.select:
                rotation_helper_params.c = rotation_helper_params.c + v.co
                n = n + 1
                if context.window_manager.b4w_split:
                    break
        if n>0:
            rotation_helper_params.c = (context.active_object.matrix_world *
                (rotation_helper_params.c / n))

        rotation_helper_params.constraint = None

        self.mouse_world_old = self.calc_mouse_world(context)

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
    v1 = rotation_helper_params.c - n*25000
    v2 = rotation_helper_params.c + n*25000
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
    v1 = rotation_helper_params.c
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
# clear properties
def clear_properties():
    props = ['b4w_vn_customnormal1', 'b4w_vn_customnormal2',
             'b4w_vn_copynormal']
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
