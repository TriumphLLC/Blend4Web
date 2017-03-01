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
import math 
import time 
import mathutils 
import multiprocessing
import platform
import blend4web

b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_, get_translate

# NOTE: have a great influence on calc time
NUM_PROC = multiprocessing.cpu_count() * 4

##########################################################
# draw UI ButtonS
class B4W_ShoreDistanceBakerUI(bpy.types.Panel):
    bl_idname = _('Bake Shore Distance Map')
    bl_label = _('Bake Shore Distance Map')
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'TOOLS'
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

        layout = self.layout

        row = layout.row()
        row.prop(context.window_manager, 'b4w_shoremap_texure_size',
            text = _('Texture Size'))

        row = layout.row()
        row.prop(context.window_manager, 'b4w_max_shore_distance',
            text = _('Maximum Distance'))

        row = layout.row()
        row.operator('b4w.shore_distance_baker', text = _('Bake'), icon='REC')


def init_properties():
    bpy.types.WindowManager.b4w_max_shore_distance = bpy.props.IntProperty(
        name=_("B4W: shoremap max distance"),
        default=100)

    bpy.types.WindowManager.b4w_shoremap_texure_size = bpy.props.IntProperty(
        name=_("B4W: shoremap texture size"),
        default=128)

def clear_properties():
    props = ['b4w_max_shore_distance', 'b4w_shoremap_texure_size']
    for p in props:
        if bpy.context.window_manager.get(p) != None:
            del bpy.context.window_manager[p]
        try:
            x = getattr(bpy.types.WindowManager, p)
            del x
        except:
            pass

class B4W_ShoreDistanceBaker(bpy.types.Operator):
    '''Generate distance field to the nearest shore vertex'''
    bl_idname = "b4w.shore_distance_baker"
    bl_label = p_("B4W Shore Distance Baker", "Operator")
    bl_options = {"INTERNAL"}

    def execute(self, context):
        try:
            run()
        except BakeError as error:
            global _shore_bake_error
            _shore_bake_error = error
            bpy.ops.b4w.bake_error_dialog('INVOKE_DEFAULT')

        return {"FINISHED"}


class BakeError(Exception):
    def __init__(self, message, component = None):
        self.message = message
        self.component = component
    def __str__(self):
        if self.component is not None:
            return ("Shore bake error: " +
                    "Object" + self.component.name + ": " + self.message)
        else:
            return ("Shore bake error: " + self.message)


class BakeErrorDialog(bpy.types.Operator):
    bl_idname = "b4w.bake_error_dialog"
    bl_label = p_("Bake Error Dialog", "Operator")
    bl_options = {"INTERNAL"}

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        wm = context.window_manager
        return wm.invoke_popup(self)

    def draw(self, context):
        global _shore_bake_error

        print(_shore_bake_error)

        row = self.layout.row()
        row.alignment = "CENTER"
        row.label(_("=== BLEND4WEB: SHORE BAKE ERROR ==="))

        if _shore_bake_error.component is not None:
            row = self.layout.row()
            row.label(get_translate(_("COMPONENT: ")) + _shore_bake_error.component.rna_type.name.upper())
            row = self.layout.row()
            row.label(get_translate(_("NAME: ")) + _shore_bake_error.component.name)

        row = self.layout.row()
        row.label(get_translate(_("ERROR: ")) + _shore_bake_error.message)

def process_pixels(queue, minx, maxx, miny, maxy, max_shore_dist, texture_size,
                   tiles, num_x_tiles, tile_x_length, tile_y_length,
                   list_length, p_ind, water_level):

    data_list = [0] * list_length

    # iterate over all pixels and find distance values
    num_processed_tiles = min(8, len(tiles))

    x_max = maxx + max_shore_dist
    x_min = minx - max_shore_dist
    y_max = maxy + max_shore_dist
    y_min = miny - max_shore_dist

    # meters per texture pixel
    x_mult = (x_max - x_min) / texture_size;
    y_mult = (y_max - y_min) / texture_size;

    start = p_ind * list_length // 4

    for px in range(0, list_length // 4):
        dst_loc_x = x_min + x_mult * ((start + px) % texture_size + 0.5)
        dst_loc_y = y_min + y_mult * ((start + px) // texture_size + 0.5)

        # 1-ST STAGE: find nearest vertices in all tiles
        new_src_vert_list = nearest_vertices(tiles, num_x_tiles, tile_x_length,
                                             tile_y_length, minx, miny,
                                             dst_loc_x, dst_loc_y,
                                             num_processed_tiles)

        min_dist_sqr = max_shore_dist * max_shore_dist
        closest_ver_dir = [0] * 3
        closest_ver_norm = [0] * 3

        # 2-ND STAGE: find the nearest vertex in generated verts list
        for vert_src in new_src_vert_list:
            v_src_loc = vert_src.co
            cur = [0] * 3
            cur[0] = v_src_loc[0] - dst_loc_x
            cur[1] = v_src_loc[1] - dst_loc_y
            cur[2] = v_src_loc[2] - water_level
            dist_sqr = cur[0]**2 + cur[1]**2

            if dist_sqr < min_dist_sqr:
                min_dist_sqr = dist_sqr
                closest_ver_dir = cur
                closest_ver_norm = vert_src.normal

        min_dist = math.sqrt(min_dist_sqr)

        # direction
        closest_ver_dir[0] /= min_dist
        closest_ver_dir[1] /= min_dist
        closest_ver_dir[2] /= min_dist
        data_list[px * 4]     =  closest_ver_dir[0] / 2 + 0.5
        data_list[px * 4 + 1] = -closest_ver_dir[1] / 2 + 0.5

        # pack depth in two colors (g, b)
        min_dist /= max_shore_dist

        if min_dist < 1.0:
            res_a = math.modf(min_dist)[0]
            res_b = math.modf(min_dist * 255)[0]
            res_g = math.modf(min_dist * 255 * 255)[0]

            data_list[px * 4 + 3] = res_a
            data_list[px * 4 + 2] = res_b - res_g / 255
        else:
            data_list[px * 4 + 3] = 1.0
            data_list[px * 4 + 2] = 0.0

    if check_win():
        return data_list
    else:
        queue.put([p_ind, data_list])


def nearest_vertices(tiles, num_x_tiles, tile_x_length, tile_y_length,
                     minx, miny, dst_loc_x, dst_loc_y, num_processed_tiles):

    tiles_heap = []
    dists_heap = []
    heap_size = 0

    max_tile_dist_sqr = 0
    ind_max = -1

    # generate list of nearest tiles
    for i in range(len(tiles)):
        if len(tiles[i]) != 0:
            x = i % num_x_tiles
            y = i // num_x_tiles

            dx = minx + (x + 0.5) * tile_x_length - dst_loc_x
            dy = miny + (y + 0.5) * tile_y_length - dst_loc_y
            tile_dist_sqr = dx*dx + dy*dy

            if (heap_size < num_processed_tiles):
                tiles_heap.append(i)
                dists_heap.append(tile_dist_sqr)

                if (tile_dist_sqr > max_tile_dist_sqr):
                    max_tile_dist_sqr = tile_dist_sqr
                    ind_max = heap_size

                heap_size += 1

            else:

                if (tile_dist_sqr < max_tile_dist_sqr):
                    tiles_heap[ind_max] = i
                    dists_heap[ind_max] = tile_dist_sqr

                    # find a heap's new maximum
                    heap_max = 0
                    for j in range (heap_size):
                        local_dist = dists_heap[j]
                        if local_dist > heap_max:
                            heap_max = local_dist
                            ind_max = j

                    max_tile_dist_sqr = heap_max

    # generate a list of nearest vertices
    vert_list = []
    for i in tiles_heap:
        vert_list.extend(tiles[i])

    return vert_list

def check_win():
    if platform.system() == "Windows":
        return True
    else:
        return False

def run():

    max_shore_dist = bpy.context.window_manager.b4w_max_shore_distance
    texture_size = bpy.context.window_manager.b4w_shoremap_texure_size

    # escape from edit mode
    if bpy.context.mode == "EDIT_MESH":
        bpy.ops.object.mode_set(mode="OBJECT")

    if len(bpy.context.selected_editable_objects) == 0:
        raise BakeError(get_translate(_("No objects selected")))

    if len(bpy.context.selected_editable_objects) == 1:
        raise BakeError(get_translate(_("Source object is not selected.")))

    objects = bpy.data.objects

    # destination object
    obj_dst_name = bpy.context.object.name
    obj_dst = objects.get(obj_dst_name)

    if len(obj_dst.material_slots) == 0:
        raise BakeError(obj_dst.name + get_translate(_(" doesn't have a material.")), obj_dst)

    mesh_dst = obj_dst.data
    dst_ver_list = mesh_dst.vertices

    # old destination obj vertices positions
    old_dst_co_list = [0] * 3 * len(dst_ver_list)
    for i in range(len(dst_ver_list)):
        old_dst_co_list[i * 3]     = dst_ver_list[i].co[0]
        old_dst_co_list[i * 3 + 1] = dst_ver_list[i].co[1]
        old_dst_co_list[i * 3 + 2] = dst_ver_list[i].co[2]

    # transform dst vertices to the world space
    for vert_dst in dst_ver_list:
        vert_dst.co = obj_dst.matrix_world * vert_dst.co

    # source objects
    objs_src = []
    objs_src_ver_list = []
    old_objs_src_co_list = []
    for obj in bpy.context.selected_editable_objects:
        if obj.name != obj_dst_name:

            if obj.type != "MESH":
                raise BakeError(get_translate(_("Source object is not \"Mesh\".")), obj)

            objs_src.append(obj)
            src_ver_list = obj.data.vertices
            objs_src_ver_list.append(src_ver_list);

            # old source obj vertices positions
            old_src_co_list = [0] * 3 * len(src_ver_list)
            for i in range(len(src_ver_list)):
                old_src_co_list[i * 3]     = src_ver_list[i].co[0]
                old_src_co_list[i * 3 + 1] = src_ver_list[i].co[1]
                old_src_co_list[i * 3 + 2] = src_ver_list[i].co[2]

            old_objs_src_co_list.append(old_src_co_list)

            # transform src vertices to the world space
            for vert_src in src_ver_list:
                vert_src.co = obj.matrix_world * vert_src.co

    # set water level to the z coord of destination object
    level = obj_dst.location[2]

    # set starting search values
    minx =  1000000.0
    maxx = -1000000.0
    miny =  1000000.0
    maxy = -1000000.0

    # generate list consisting only from vertices wich z is close to the level
    src_ver_selected = []
    for src_ver_list in objs_src_ver_list:
        for vert_src in src_ver_list:
            v_src_z = vert_src.co[2]
            if v_src_z >= level - 0.2 and v_src_z < level + 1:
                src_ver_selected.append(vert_src)
                # set search rectangle dimensions
                minx = min(vert_src.co[0], minx)
                maxx = max(vert_src.co[0], maxx)
                miny = min(vert_src.co[1], miny)
                maxy = max(vert_src.co[1], maxy)

    # generate tiled structure for the source mesh
    # num_tiles has to be around 0.4 of src_ver_selected (experimental number)
    xy_appr_product = 0.4 * len(src_ver_selected)

    x_size = (maxx - minx)
    y_size = (maxy - miny)

    if y_size != 0 and x_size != 0:
        xy_ratio = x_size / y_size
    else:
        xy_ratio = 1

    if x_size == 0:
        num_x_tiles = 1
    else:
        num_x_tiles = round(math.sqrt(xy_appr_product * xy_ratio))
        num_x_tiles = max(num_x_tiles, 1)

    if y_size == 0:
        num_y_tiles = 1
    else:
        num_y_tiles = round(num_x_tiles / xy_ratio)
        num_y_tiles = max(num_y_tiles, 1)

    tile_x_length = x_size / num_x_tiles
    tile_y_length = y_size / num_y_tiles

    num_tiles = num_x_tiles * num_y_tiles

    # initialize array of tiles
    tiles = [ [] for i in range(num_tiles) ]

    for vert_src in src_ver_selected:
        v_src_x = vert_src.co[0]
        v_src_y = vert_src.co[1]
        if x_size != 0:
            x_coord = math.floor( (v_src_x - minx) / tile_x_length )
        else:
            x_coord = 0

        if y_size != 0:
            y_coord = math.floor( (v_src_y - miny) / tile_y_length )
        else:
            y_coord = 0

        if x_coord == num_x_tiles:
            x_coord = num_x_tiles - 1
        if y_coord == num_y_tiles:
            y_coord = num_y_tiles - 1

        tiles[y_coord * num_x_tiles + x_coord].append(vert_src)

    x_max = maxx + max_shore_dist
    x_min = minx - max_shore_dist
    y_max = maxy + max_shore_dist
    y_min = miny - max_shore_dist

    data_length = 4 * texture_size * texture_size

    # list of distance values
    if check_win():
        dist_list = process_pixels(None, minx, maxx, miny, maxy, max_shore_dist,
                           texture_size, tiles, num_x_tiles, tile_x_length,
                           tile_y_length, data_length, 0, level)
    else:
        # break calculations into several processes
        dist_list = [] * data_length

        q = multiprocessing.Queue();
        part_length = data_length // NUM_PROC;
        proc_list = []
        for i in range(NUM_PROC):
            p = multiprocessing.Process(target = process_pixels,
                         args=(q, minx, maxx, miny, maxy, max_shore_dist,
                               texture_size, tiles, num_x_tiles, tile_x_length,
                               tile_y_length, part_length, i, level)
                        )
            proc_list.append(p)
            p.start()

        requests = []
        for i in range(NUM_PROC):
            r = q.get()
            requests.append(r)

        for p in proc_list:
            p.join()

        for i in range(NUM_PROC):
            for r in requests:
                if r[0] == i:
                    dist_list.extend(r[1])

    store_to_texture(dist_list, x_max, x_min, y_max, y_min, max_shore_dist,
                     texture_size, obj_dst)

    # reset destination mesh's vertices positions
    for vert_dst in dst_ver_list:
        vert_dst.co[0] = old_dst_co_list[vert_dst.index * 3]
        vert_dst.co[1] = old_dst_co_list[vert_dst.index * 3 + 1]
        vert_dst.co[2] = old_dst_co_list[vert_dst.index * 3 + 2]

    # reset source mesh's vertices positions
    for i in range(len(objs_src_ver_list)):
        src_ver_list = objs_src_ver_list[i]
        old_src_co_list = old_objs_src_co_list[i]
        for vert_src in src_ver_list:
            vert_src.co[0] = old_src_co_list[vert_src.index * 3]
            vert_src.co[1] = old_src_co_list[vert_src.index * 3 + 1]
            vert_src.co[2] = old_src_co_list[vert_src.index * 3 + 2]

    # show results in viewport
    mesh_dst.update()

def store_to_texture(data, x_max, x_min, y_max, y_min, max_shore_dist,
                     texture_size, obj_dst):

    material_dst = obj_dst.material_slots[0].material
    dst_tex_slot = None
    dst_texture  = None

    for tex_slot in material_dst.texture_slots:
        if tex_slot and tex_slot.texture.b4w_shore_dist_map:
            dst_tex_slot = tex_slot
            dst_texture  = tex_slot.texture
            break

    if not dst_tex_slot:
        # create new texture slot
        dst_tex_slot = material_dst.texture_slots.add()
        dst_tex_slot.use_map_color_diffuse = False
        dst_tex_slot.texture_coords = 'ORCO'

    if not dst_texture:
        # create new texture
        dst_texture = bpy.data.textures.new('ShoreDistance', type = 'IMAGE')
        dst_texture.b4w_shore_dist_map = True
        dst_texture.use_fake_user = True
        dst_tex_slot.texture = dst_texture

    # write additional data to texture
    dst_texture.b4w_shore_boundings[0] = x_max
    dst_texture.b4w_shore_boundings[1] = x_min
    dst_texture.b4w_shore_boundings[2] = y_max
    dst_texture.b4w_shore_boundings[3] = y_min
    dst_texture.b4w_max_shore_dist = max_shore_dist

    if not dst_texture.image:
        # create new image
        dst_texture.image = bpy.data.images.new(name   =_('ShoreDistance'),
                                                width  = texture_size,
                                                height = texture_size)
    dst_texture.image.pixels = data

def register():
    init_properties()

def unregister():
    clear_properties()
