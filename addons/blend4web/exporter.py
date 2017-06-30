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
from collections import OrderedDict
import hashlib
import json
import mathutils
import math
import os
import struct
import configparser
# import cProfile
import operator
import re
import imp
import sys

import blend4web

b4w_modules =  ["binary_module_hook",
                "anim_baker",
                "clusterer",
                "logic_node_tree",
                "addon_prefs",
                "server",
                "init_validation",
                "translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_, get_translate

BINARY_CHAR_SIZE = 1
BINARY_INT_SIZE = 4
BINARY_SHORT_SIZE = 2
BINARY_FLOAT_SIZE = 4

MSG_SYMBOL_WIDTH = 6
ROW_HEIGHT = 20

POS_ERR = 1
NOR_ERR = 2
TAN_ERR = 3
TCO_ERR = 4
TCO2_ERR = 5
GRP_ERR = 6
COL_ERR = 7
SHADE_TNB_ERR = 8


SUF_HAIR_DUPLI = "_HAIR_DUPLI"

PATH_TO_VIEWER = "apps_dev/viewer/viewer.html"

JSON_PRETTY_PRINT = False
SUPPORTED_OBJ_TYPES = ["MESH", "CURVE", "ARMATURE", "EMPTY", "CAMERA", "LAMP", \
        "SPEAKER", "FONT", "META", "SURFACE"]
SUPPORTED_NODES = ["NodeFrame", "ShaderNodeMaterial", "ShaderNodeCameraData", \
        "ShaderNodeValue", "ShaderNodeRGB", "ShaderNodeTexture", \
        "ShaderNodeGeometry", "ShaderNodeExtendedMaterial", "ShaderNodeLampData", \
        "ShaderNodeOutput", "ShaderNodeMixRGB", "ShaderNodeRGBCurve", \
        "ShaderNodeInvert", "ShaderNodeHueSaturation", "ShaderNodeNormal", \
        "ShaderNodeMapping", "ShaderNodeVectorCurve", "ShaderNodeValToRGB", \
        "ShaderNodeRGBToBW", "ShaderNodeMath", "ShaderNodeVectorMath", \
        "ShaderNodeSqueeze", "ShaderNodeSeparateRGB", "ShaderNodeCombineRGB", \
        "ShaderNodeSeparateHSV", "ShaderNodeCombineHSV", "ShaderNodeGamma", \
        "NodeReroute", "ShaderNodeGroup", "NodeGroupInput", "NodeGroupOutput", \
        "ShaderNodeOutputMaterial", "ShaderNodeBsdfDiffuse", "ShaderNodeBsdfGlossy", \
        "ShaderNodeBsdfTransparent", "ShaderNodeBsdfRefraction", "ShaderNodeBsdfGlass", \
        "ShaderNodeBsdfTranslucent", "ShaderNodeBsdfAnisotropic", "ShaderNodeBsdfVelvet", \
        "ShaderNodeBsdfToon", "ShaderNodeSubsurfaceScattering", "ShaderNodeEmission", \
        "ShaderNodeBsdfHair", "ShaderNodeAmbientOcclusion", "ShaderNodeHoldout", \
        "ShaderNodeVolumeAbsorption", "ShaderNodeVolumeScatter", "ShaderNodeBump", \
        "ShaderNodeNormalMap", "ShaderNodeVectorTransform", "ShaderNodeBlackbody", \
        "ShaderNodeSeparateXYZ", "ShaderNodeCombineXYZ", "ShaderNodeBrightContrast", \
        "ShaderNodeLightFalloff", "ShaderNodeTexImage", "ShaderNodeTexEnvironment", \
        "ShaderNodeTexSky", "ShaderNodeTexNoise", "ShaderNodeTexWave", \
        "ShaderNodeTexVoronoi", "ShaderNodeTexMusgrave", "ShaderNodeTexGradient", \
        "ShaderNodeTexMagic", "ShaderNodeTexChecker", "ShaderNodeTexBrick", \
        "ShaderNodeTexCoord", "ShaderNodeUVMap", "ShaderNodeParticleInfo", \
        "ShaderNodeHairInfo", "ShaderNodeObjectInfo", "ShaderNodeWireframe", \
        "ShaderNodeTangent", "ShaderNodeLayerWeight", "ShaderNodeLightPath", \
        "ShaderNodeAttribute", "ShaderNodeOutputLamp", "ShaderNodeScript", \
        "ShaderNodeMixShader", "ShaderNodeAddShader", "ShaderNodeNewGeometry", \
        "ShaderNodeFresnel", "ShaderNodeOutputWorld", "ShaderNodeBackground"]

PARALLAX_HEIGHT_MAP_INPUT_NAME = "Height Map"
PARALLAX_HEIGHT_MAP_INPUT_NODE = "ShaderNodeTexture"

# message type for primary_loaded, secondary_loaded or both data
M_PRIMARY = "PRIMARY"
M_SECONDARY = "SECONDARY"
M_ALL = "ALL"

# globals

# weak reference is not supported
_bpy_bindata_int = bytearray();
_bpy_bindata_float = bytearray();
_bpy_bindata_short = bytearray();
_bpy_bindata_ushort = bytearray();
_bpy_bindata_uchar = bytearray();

_export_data = None
_main_json_str = ""

_export_uuid_cache = None
_bpy_uuid_cache = None

_overrided_meshes = []

_is_html_export = False
_is_fast_preview = False

_export_filepath = None
_export_error = None
_file_error = None

_scene_active_layers = {}

_dupli_group_ids = {}

_b4w_export_warnings = []

_b4w_export_errors = []

_vehicle_integrity = {}

_rendered_scenes = []

_additional_scene_objects = []

# currently processed data
_curr_stack = {
    "scenes"   : [],
    "object"   : [],
    "data"     : [],
    "material" : [],
    "texture"  : [],
}

_fallback_camera = None
_fallback_world = None
_fallback_material = None
_fallback_texture = None

_default_material = None

_performed_cleanup = False

_proj_util_module = None

_dg_counter = 0

_unique_packed_images = None

_unique_packed_sounds = None

# speaker distance maximum
SPKDISTMAX = 10000

def use_split_normals(obj):
    r = False
    if obj.data and hasattr(obj.data, "use_auto_smooth "):
        r = obj.data.use_auto_smooth
    return r


class MaterialError(Exception):
    def __init__(self, message):
        self.message = message

    def __str__(self):
        return self.message

class PathError(Exception):
    def __init__(self, message):
        self.message = message

    def __str__(self):
        return self.message

class ExportError(Exception):
    def __init__(self, message, component, comment=None):
        self.message = message
        self.component_name = component.name
        self.component_type = component.rna_type.name
        self.comment = comment
        clean_exported_data()

    def __str__(self):
        return "Export error: " + self.component_name + ": " + self.message

class FileError(Exception):
    def __init__(self, message=None):
        self.message = message
        clean_exported_data()
    def __str__(self):
        return "Export file error: " + self.message

class ExportErrorDialog(bpy.types.Operator):
    bl_idname = "b4w.export_error_dialog"
    bl_label = p_("Export Error Dialog", "Operator")
    bl_options = {'INTERNAL'}

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        wm = context.window_manager
        window_width = calc_export_error_window_width()
        window_height = calc_export_error_window_height()
        context.window.cursor_warp(round(context.window.width / 2),
                round(context.window.height/2 + window_height / 2))

        return wm.invoke_props_dialog(self, window_width)

    def draw(self, context):
        global _export_error

        print(_export_error)

        row = self.layout.row()
        row.alignment = "CENTER"
        row.label(text=_("=== BLEND4WEB: EXPORT ERROR ==="))
        row = self.layout.row()
        row.label(text=get_translate(_("COMPONENT: ")) + _export_error.component_type.upper())
        row = self.layout.row()
        row.label(text=get_translate(_("NAME: ")) + _export_error.component_name)
        row = self.layout.row()
        row.label(text=get_translate(_("ERROR: ")) + _export_error.message)
        if _export_error.comment:
            row = self.layout.row()
            row.label(_export_error.comment)

class ExportMessagesDialog(bpy.types.Operator):
    bl_idname = "b4w.export_messages_dialog"
    bl_label = p_("Export Messages Dialog", "Operator")
    bl_options = {'INTERNAL'}

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        wm = context.window_manager
        window_width = calc_export_messages_window_width()
        window_height = calc_export_messages_window_height()
        context.window.cursor_warp(round(context.window.width / 2),
                round(context.window.height/2 + window_height / 2))

        return wm.invoke_props_dialog(self, window_width)

    def draw(self, context):
        global _b4w_export_warnings
        global _b4w_export_errors

        row = self.layout.row()
        row.alignment = "CENTER"
        row.label(text=_("=== BLEND4WEB: EXPORT MESSAGES ==="))
        if _b4w_export_errors:
            print(_b4w_export_errors)
            row = self.layout.row()
            row.label(text=_("ERRORS:"))
            for message in _b4w_export_errors:
                row = self.layout.row()
                row.label(message["text"])
            row = self.layout.row()
            if _b4w_export_warnings:
                row.label(text="")
        if _b4w_export_warnings:
            print(_b4w_export_warnings)
            row = self.layout.row()
            row.label(text=_("WARNINGS:"))
            for message in _b4w_export_warnings:
                row = self.layout.row()
                row.label(message["text"])

class FileErrorDialog(bpy.types.Operator):
    bl_idname = "b4w.file_error_dialog"
    bl_label = p_("File Error Dialog", "Operator")
    bl_options = {'INTERNAL'}

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        wm = context.window_manager
        window_width = calc_file_error_window_width()
        window_height = calc_file_error_window_height()
        context.window.cursor_warp(round(context.window.width / 2),
                round(context.window.height/2 + window_height / 2))

        return wm.invoke_props_dialog(self, window_width)

    def draw(self, context):
        global _file_error

        print(_file_error)

        row = self.layout.row()
        row.alignment = "CENTER"
        row.label(text=_("=== BLEND4WEB: FILE ERROR ==="))
        row = self.layout.row()
        row.label(text=get_translate(_("ERROR: ")) + _file_error.message)
        row = self.layout.row()

def calc_export_error_window_width():

    global _export_error

    num_symbols = 0

    if _export_error.message:
        num_symbols = len("ERROR: "+_export_error.message)

    if _export_error.comment:
        num_symbols = max(len(_export_error.comment), num_symbols)

    window_width = num_symbols * MSG_SYMBOL_WIDTH
    window_width = max(window_width, 220)

    return window_width

def calc_export_error_window_height():

    num_rows = 5
    if _export_error.comment:
        num_rows = 6
    window_height = num_rows * ROW_HEIGHT

    return window_height

def calc_file_error_window_width():

    global _file_error

    num_symbols = 0

    if _file_error.message:
        num_symbols = len("ERROR: "+_file_error.message)

    window_width = num_symbols * MSG_SYMBOL_WIDTH
    window_width = max(window_width, 220)

    return window_width

def calc_file_error_window_height():

    num_rows = 4
    window_height = num_rows * ROW_HEIGHT

    return window_height

def calc_export_messages_window_width():
    num_symbols = 0

    for message in _b4w_export_warnings:
        if num_symbols < len("WARNINGS: " + message["text"]):
            num_symbols = len("WARNINGS: " + message["text"])
    for message in _b4w_export_errors:
        if num_symbols < len("ERRORS: " + message["text"]):
            num_symbols = len("ERRORS: " + message["text"])

    window_width = num_symbols * MSG_SYMBOL_WIDTH
    window_width = max(window_width, 220)

    return window_width

def calc_export_messages_window_height():
    num_rows = 2

    if _b4w_export_errors:
        num_rows += 1 + len(_b4w_export_errors)
        if _b4w_export_warnings:
            num_rows += 1

    if _b4w_export_warnings:
        num_rows += 1 + len(_b4w_export_warnings)

    window_height = num_rows * ROW_HEIGHT
    return window_height


def warn(text, message_type=M_ALL):
    message = OrderedDict()
    message["text"] = text
    message["type"] = message_type
    _b4w_export_warnings.append(message)

def err(text, message_type=M_ALL):
    message = OrderedDict()
    message["text"] = text
    message["type"] = message_type
    _b4w_export_errors.append(message)

def get_filepath_blend(export_filepath):
    """return path to blend relative to json"""
    blend_abs = bpy.data.filepath

    if blend_abs:
        json_abs = export_filepath

        try:
            blend_rel = os.path.relpath(blend_abs, os.path.dirname(json_abs))
        except ValueError as exp:
            if _is_fast_preview:
                blend_rel = blend_abs
            else:
                _file_error = exp
                raise FileError("Export to different disk is forbidden")

        return guard_slashes(os.path.normpath(blend_rel))
    else:
        return ""

# some data components are not needed for the engine
# so assign "b4w_do_not_export" flags to them
# in order to reduce file size and processing power
def assign_do_not_export_flags():

    # we don't need bone custom shapes
    for obj in bpy.data.objects:
        pose = obj.pose
        if pose:
            for pbone in pose.bones:
                shape = pbone.custom_shape
                if shape:
                    shape.b4w_do_not_export = True

    # render result
    for img in bpy.data.images:
        if img.source == "VIEWER":
            img.b4w_do_not_export = True

def attach_export_properties(tags):
    for tag in tags:
        source = getattr(bpy.data, tag)
        for component in source:
            component["export_done"] = False
            if tag == "objects":
                component["curve_exp_done"] = False
                component["hair_exp_done"] = False
                component["force_to_mesh"] = False
            if tag == "groups":
                component["hair_exp_done"] = False
            if tag == "scenes":
                component["metaballs_processed"] = False

def check_dupli_groups(objects, group_number):
    global _dg_counter
    for obj in objects:
        if obj.dupli_group and obj.dupli_type == "GROUP" and\
                hasattr(obj.dupli_group, "objects"):
            _dg_counter += 1
            check_dupli_groups(obj.dupli_group.objects, _dg_counter)

        if obj.as_pointer() in _dupli_group_ids:
            _dupli_group_ids[obj.as_pointer()].append(group_number)
        else:
            _dupli_group_ids[obj.as_pointer()] = [group_number]

def detach_export_properties(tags):
    for tag in tags:
        source = getattr(bpy.data, tag)
        for component in source:
            if "export_done" in component:
                del component["export_done"]
            if "curve_exp_done" in component:
                del component["curve_exp_done"]
            if "hair_exp_done" in component:
                del component["hair_exp_done"]
            if "metaballs_processed" in component:
                del component["metaballs_processed"]
            if "force_to_mesh" in component:
                del component["force_to_mesh"]

def gen_uuid(comp, addition=""):
    # type + name + lib path/blend path
    s = comp.rna_type.name + comp.name
    if comp.library:
        s += comp.library.filepath
    else:
        s += bpy.data.filepath
    s += addition
    uuid = hashlib.md5(s.encode()).hexdigest()
    return uuid

def gen_uuid_dict(comp, addition=""):
    if comp:
        return OrderedDict({ "uuid": gen_uuid(comp, addition) })
    else:
        return ""

def guard_slashes(path):
    return path.replace('\\', '/')

def do_export(component):
    return not component.b4w_do_not_export

def object_is_valid(obj):
    return obj.type in SUPPORTED_OBJ_TYPES

def particle_object_is_valid(obj):
    data = obj.data
    return obj.type == "MESH" and not (data is None or not len(data.polygons))

def obj_to_mesh_needed(obj):
    """Check if object require copy of obj.data during export"""
    if (obj.type == "CURVE" or obj.type == "SURFACE" or obj.type == "META" 
            or obj.type == "FONT" or obj["force_to_mesh"]):
        return True
    elif (obj.type == "MESH"
            and (obj.b4w_apply_modifiers or obj.b4w_loc_export_vertex_anim 
            or use_split_normals(obj) or obj.b4w_shape_keys
            or obj.b4w_apply_scale
            or obj_auto_apply_modifiers(obj))):
        return True
    else:
        return False

def obj_auto_apply_scale(obj):
    if ('b4w_apply_scale' in obj.keys()
            or obj.parent
            or find_modifier(obj, "ARMATURE")
            or obj.b4w_loc_export_vertex_anim):
        return False
    else:
        return obj_has_nonuniform_scale(obj)

def obj_has_nonuniform_scale(obj):
    return not (obj.scale[0] == obj.scale[1] and obj.scale[1] == obj.scale[2])

def obj_auto_apply_modifiers(obj):
    if ('b4w_apply_modifiers' in obj.keys()
            or find_modifier(obj, "ARMATURE")
            or find_modifier(obj, "ARRAY")
            or obj.b4w_loc_export_vertex_anim):
        return False
    else:
        return obj_has_modifiers(obj) or obj_has_nonuniform_scale(obj)

def obj_has_modifiers(obj):
    return len(obj.modifiers) > 0

def get_obj_data(obj, scene):
    data = None
    if obj.data:
        if obj_to_mesh_needed(obj):
            data = obj.to_mesh(scene, obj.b4w_apply_modifiers or obj.b4w_apply_scale or obj_auto_apply_modifiers(obj), "PREVIEW")
            if data:
                if obj.type == "META":
                    for slot in obj.material_slots:
                        if slot.material is not None:
                            data.materials.append(slot.material)

                new_name_addition = None
                if obj.b4w_apply_modifiers or obj_auto_apply_modifiers(obj):
                    new_name_addition = "_MODIFIERS_APPLIED"
                elif obj.b4w_loc_export_vertex_anim:
                    new_name_addition = "_VERTEX_ANIM"
                elif use_split_normals(obj):
                    new_name_addition = "_VERTEX_NORMALS"
                elif obj.b4w_apply_scale or obj_auto_apply_scale(obj):
                    new_name_addition = "_NONUNIFORM_SCALE_APPLIED"
                elif obj.b4w_shape_keys:
                    new_name_addition =  "_SHAPE_KEYS"

                if new_name_addition is not None:
                    # prevent bugs when linked and local meshes have the same name
                    if obj.library is not None:
                        new_name_addition  = obj.library.filepath + new_name_addition
                    data.name = obj.name + new_name_addition

                if obj.type == "MESH":
                    data.b4w_override_boundings = obj.data.b4w_override_boundings

                    data.b4w_boundings.min_x = obj.data.b4w_boundings.min_x
                    data.b4w_boundings.min_y = obj.data.b4w_boundings.min_y
                    data.b4w_boundings.min_z = obj.data.b4w_boundings.min_z
                    data.b4w_boundings.max_x = obj.data.b4w_boundings.max_x
                    data.b4w_boundings.max_y = obj.data.b4w_boundings.max_y
                    data.b4w_boundings.max_z = obj.data.b4w_boundings.max_z
                else:
                    data.b4w_override_boundings = False

                if len(data.vertex_colors):
                    # NOTE: workaround for blender (v.2.70+) bug - restore vertex
                    # colors names
                    for i in range(len(obj.data.vertex_colors)):
                        data.vertex_colors[i].name = obj.data.vertex_colors[i].name

                _overrided_meshes.append(data)

                # parsing needed even if the original mesh is shareable
                data["export_done"] = False

            #NOTE: notifier on disabled armature notifiers
            #if find_modifier(obj, "ARMATURE"):
            #    warn("Object \"" + obj.name + "\" has armature modifier. " + \
            #         "It is disabled because of \"to mesh\" operation.")
        else:
            data = obj.data

    return data

def remove_overrided_meshes():
    for mesh in _overrided_meshes:
        bpy.data.meshes.remove(mesh)

def mesh_get_active_vc(mesh):
    # NOTE: cannot rely on vertex_colors.active or vertex_colors.active_index
    # properties (may be incorrect)
    if mesh.vertex_colors:
        for vc in mesh.vertex_colors:
            if vc.active:
                return vc

        return mesh.vertex_colors[0]

    return None

def mesh_get_active_uv(mesh):
    # NOTE: cannot rely on uv_textures.active or uv_textures.active_index
    # properties (may be incorrect)
    if mesh.uv_textures:
        for uv in mesh.uv_textures:
            if uv.active:
                return uv

        return mesh.uv_textures[0]

    return None

def scenes_store_select_all_layers():
    global _scene_active_layers
    _scene_active_layers = {}

    curr_scene = bpy.context.screen.scene
    active_cam = curr_scene.camera

    for scene in bpy.data.scenes:
        if (not scene.camera and active_cam and curr_scene != scene
                and not active_cam.name in scene.objects):
            scene.objects.link(active_cam)
        bpy.context.screen.scene = scene 
               
        if scene.name not in _scene_active_layers:
            _scene_active_layers[scene.name] = {}

        scene_lib_path = get_scene_lib_path(scene)
        layers = _scene_active_layers[scene.name][scene_lib_path] = []

        for i in range(len(scene.layers)):
            layers.append(scene.layers[i])
            scene.layers[i] = True
        if (not scene.camera and active_cam and curr_scene != scene
                    and not active_cam.name in scene.objects):
            scene.objects.unlink(active_cam)

    bpy.context.screen.scene = curr_scene

def scenes_restore_selected_layers():
    global _scene_active_layers

    for scene in bpy.data.scenes:
        if scene.name in _scene_active_layers:
            scene_lib_path = get_scene_lib_path(scene)
            if scene_lib_path in _scene_active_layers[scene.name]:
                layers_data = _scene_active_layers[scene.name][scene_lib_path]

                for i in range(len(layers_data)):
                    scene.layers[i] = layers_data[i]

    _scene_active_layers = {}

def get_scene_lib_path(scene):
    if scene.library:
        return scene.library.filepath
    else:
        return ""

def get_main_json_data():
    return _main_json_str

def get_binaries_data():
    bin_version = get_b4w_bin_info()
    return bin_version + _bpy_bindata_int + _bpy_bindata_float \
            + _bpy_bindata_short + _bpy_bindata_ushort + _bpy_bindata_uchar;

def get_packed_data():
    packed_data = {}

    for img_hash in _unique_packed_images:
        data = _unique_packed_images[img_hash]

        # filepath and packed_file are the same for all images
        bpy_image = _bpy_uuid_cache[data[0]]
        image_data = _export_uuid_cache[data[0]]
        packed_data[image_data["filepath"]] = b4w_bin.get_packed_data(
                bpy_image.packed_file.as_pointer())

    for snd_hash in _unique_packed_sounds:
        data = _unique_packed_sounds[snd_hash]
        
        # filepath and packed_file are the same for all sounds
        bpy_sound = _bpy_uuid_cache[data[0]]
        sound_data = _export_uuid_cache[data[0]]
        packed_data[sound_data["filepath"]] = b4w_bin.get_packed_data(
                bpy_sound.packed_file.as_pointer())

    return packed_data

def get_b4w_bin_info():
    format_version = blend4web.bl_info["b4w_format_version"]
    [major_version, minor_version] = format_version.split(".")
    return bytearray("B4WB", "UTF-8") + struct.pack("i", int(major_version)) \
            + struct.pack("i", int(minor_version))

def process_components(tags):
    for tag in tags:
        _export_data[tag] = []

    check_shared_data(bpy.data.scenes)
    for scene in getattr(bpy.data, "scenes"):
        if do_export(scene):
            process_scene(scene)
            _additional_scene_objects = []

    if not _export_data["scenes"]:
        raise FileError("No exported scene found. Can't perform export.")

    check_main_scene(_export_data["scenes"])

    for action in getattr(bpy.data, "actions"):
        if not (action.name + "_B4W_BAKED" in bpy.data.actions):
            process_action(action)

def check_main_scene(scenes):
    main_scene = None
    for scene in scenes:
        for texture in _rendered_scenes:
            if scene["name"] == texture.b4w_source_id:
                main_scene = None
                break
            else:
                main_scene = scene["name"]
        if main_scene:
            break

    if not main_scene:
        main_scene = scenes[0]
        for texture in _rendered_scenes:
            if (texture.b4w_source_id == main_scene["name"]):
                # replace material
                users_material = texture.users_material
                for material in users_material:
                    mat_uuid = gen_uuid(material)
                    update_material_fallback(mat_uuid, main_scene["name"])
                # replace texture
                tex_uuid = gen_uuid(texture)
                update_texture_fallback(tex_uuid, main_scene["name"])

def update_material_fallback(uuid, main_scene_name):

    uuids = [md for md in _export_data["materials"] if md["source_uuid"] == uuid]
    for md in uuids:
        _export_data["materials"].remove(md)

    err("The main scene \"" + main_scene_name +"\" can not be rendered " + 
            "by another scene. Material \"" + md["name"] 
            + "\" has been removed.")
    original_name = md["name"]

    fallback_material = get_fallback_material()
    for md in uuids:
        process_material(fallback_material, md["uuid"])

    for mat_data in _export_data["materials"]:
        if mat_data["source_uuid"] == uuid:
            mat_data["name"] = original_name

def update_texture_fallback(uuid, main_scene_name):
    
    for tex_data in _export_data["textures"]:
        if tex_data["uuid"] == uuid:
            err("The main scene \"" + main_scene_name +"\" can not be rendered " + 
                    "by another scene. Texture \"" + tex_data["name"] 
                    + "\" has been removed.")
            _export_data["textures"].remove(tex_data)
            break
    fallback_texture = get_fallback_texture()
    process_texture(fallback_texture, uuid)

def get_fallback_material():
    global _fallback_material
    if not _fallback_material:
        _fallback_material = bpy.data.materials.new("FALLBACK_MATERIAL")
        _fallback_material.diffuse_color = (1,0,1)
        _fallback_material.use_shadeless = True
    return _fallback_material

def get_default_material():
    global _default_material
    if not _default_material:
        _default_material = bpy.data.materials.new("DEFAULT")
    return _default_material

def get_fallback_texture():
    global _fallback_texture
    if not _fallback_texture:
        _fallback_texture = bpy.data.textures.new("FALLBACK_TEXTURE", "NONE")
    return _fallback_texture

def process_action(action):
    if "export_done" in action and action["export_done"]:
        return
    action["export_done"] = True

    act_data = OrderedDict()

    act_data["name"] = action.name
    act_data["uuid"] = gen_uuid(action)
    # just round here, non-decimal frames will be reported below
    act_data["frame_range"] = round_iterable(action.frame_range, 0)
    has_decimal_frames = False

    act_data["fcurves"] = OrderedDict()

    if len(action.fcurves) == 0:
        warn("The action \"%s\" has no fcurves" % action.name + ".")

    # collect fcurves indices
    fc_indices = OrderedDict()
    has_quat_rotation = False
    has_euler_rotation = False
    for i in range(len(action.fcurves)):
        path = action.fcurves[i].data_path

        if path not in fc_indices:
            fc_indices[path] = []
            has_quat_rotation |= path.find("rotation_quaternion") > -1
            has_euler_rotation |= path.find("rotation_euler") > -1

        fc_indices[path].append(i)

    # prefer quaternion rotation
    if has_quat_rotation and has_euler_rotation:
        for data_path in list(fc_indices):
            if data_path.find("rotation_euler") > -1:
                del fc_indices[data_path]

    wrong_action_names = []
    for data_path in fc_indices:
        is_scale = data_path.find("scale") > -1
        is_location = data_path.find("location") > -1
        is_rotation_quat = data_path.find("rotation_quaternion") > -1
        is_rotation_euler = data_path.find("rotation_euler") > -1
        is_node = data_path.find("nodes") == 0
        is_light_color = data_path.find("color") == 0
        is_environment_color = data_path.find("horizon_color") == 0 or data_path.find("zenith_color") == 0
        is_fog_color = data_path.find("b4w_fog_color") == 0

        num_channels = 1
        if is_scale or is_location or is_rotation_quat or is_rotation_euler:
            num_channels = 8
        elif is_light_color or is_environment_color or is_fog_color:
            num_channels = 3
        elif is_node:
            pattern = r'"([^"]*)"'
            matched = re.search(pattern, data_path)
            if matched:
                node_name = matched.groups()[0]
                num_channels_mat = get_mat_action_num_channels(action, node_name) or\
                                   get_ngroups_action_num_channels(action, node_name)

                if num_channels_mat != None:
                    num_channels = num_channels_mat

        for index in fc_indices[data_path]:
            if data_path not in act_data["fcurves"]:
                act_data["fcurves"][data_path] = OrderedDict()
            elif is_scale:
                # expect uniform scales so process only first available channel
                continue

            fcurve = action.fcurves[index]

            array_index = fcurve.array_index
            if is_scale:
                array_index = 0
            elif is_node and array_index == num_channels:
                # Do not export alpha channel for RGB nodes
                break

            keyframes_data = []
            previous = None # init variable
            last_frame_offset = 0 # init variable

            keyframes_processed = []

            for i in range(len(fcurve.keyframe_points)):
                keyframe_point = fcurve.keyframe_points[i]

                # avoid identical points
                if keyframe_point.co[0] in keyframes_processed:
                    continue
                else:
                    keyframes_processed.append(keyframe_point.co[0])

                interpolation = keyframe_point.interpolation
                if interpolation == "BEZIER":
                    intercode = 0
                elif interpolation == "LINEAR":
                    intercode = 1
                elif interpolation == "CONSTANT":
                    intercode = 2
                else:
                    if not action.name in wrong_action_names:
                        wrong_action_names.append(action.name)
                    interpolation = "BEZIER"
                    intercode = 0

                co = list(keyframe_point.co)
                hl = list(keyframe_point.handle_left)
                hr = list(keyframe_point.handle_right)

                # NOTE: decimal frames aren't supported, convert to integer
                # Delta is given because frames do not have exact values
                # on huge timeline
                if abs(round(co[0]) - co[0]) > 0.003:
                    has_decimal_frames = True

                co[0] = round(co[0])

                # write to plain array:
                    # interpolation code
                    # control point x and y
                    # left handle   x and y
                    # right handle  x and y

                if (i == len(fcurve.keyframe_points) - 1):
                    last_frame_offset = len(keyframes_data)
                keyframes_data.append(intercode)
                keyframes_data.extend(co)

                # file size optimization: left handle needed only if
                # PREVIOS keyframe point is bezier, right handle needed only if
                # THIS keyframe point is bezier
                if previous and (previous.interpolation != "LINEAR"
                        and previous.interpolation != "CONSTANT"):
                    keyframes_data.extend(hl)
                if interpolation == "BEZIER":
                    keyframes_data.extend(hr)

                # save THIS keyframe point as PREVIOS one for the next iteration
                previous = keyframe_point

            del keyframes_processed

            keyframes_data_bin = struct.pack("f" * len(keyframes_data),
                    *keyframes_data)

            act_data["fcurves"][data_path][array_index] = OrderedDict();
            act_data["fcurves"][data_path][array_index]["bin_data_pos"] = [
                len(_bpy_bindata_float) // BINARY_FLOAT_SIZE,
                len(keyframes_data_bin) // BINARY_FLOAT_SIZE
            ]
            act_data["fcurves"][data_path][array_index]["last_frame_offset"] \
                    = last_frame_offset

            act_data["fcurves"][data_path][array_index]["num_channels"] = num_channels

            _bpy_bindata_float.extend(keyframes_data_bin)

    for action_name in wrong_action_names:
        err("Wrong F-Curve interpolation mode for " + action_name +
                    ". Only BEZIER, LINEAR or CONSTANT mode is allowed " +
                    "for F-Curve interpolation. Switch to BEZIER.")

    if has_decimal_frames:
        err("The \"" + action.name + "\" action has decimal frames. " +
                "Converted to integer.")

    _export_data["actions"].append(act_data)
    _export_uuid_cache[act_data["uuid"]] = act_data
    _bpy_uuid_cache[act_data["uuid"]] = action

def get_mat_action_num_channels(action, node_name):
    mats = bpy.data.materials
    for mat in mats:
        node_tree = mat.node_tree
        if not node_tree:
            continue
        num_channels_mat = num_node_channels(action.name, node_tree, node_name)
        if num_channels_mat:
            return num_channels_mat
    # cycles world actions
    worlds = bpy.data.worlds
    for world in worlds:
        node_tree = world.node_tree
        if not node_tree:
            continue
        num_channels_mat = num_node_channels(action.name, node_tree, node_name)
        if num_channels_mat:
            return num_channels_mat
    return None

def get_ngroups_action_num_channels(action, node_name):
    ngroups = bpy.data.node_groups
    for ntree in ngroups:
        num_channels_ngroup = num_node_channels(action.name, ntree, node_name)
        if num_channels_ngroup:
            return num_channels_ngroup
    return None

def num_node_channels(action_name, node_tree, node_name):
    anim_data = node_tree.animation_data
    if not anim_data:
        return None

    node_action = anim_data.action
    if node_action and node_action.name == action_name:
        num = extract_node_action_num_channels(node_tree, node_name)
        if num:
            return num

    nla_tracks = anim_data.nla_tracks
    if nla_tracks:
        for track in nla_tracks:
            for strip in track.strips:
                action = strip.action
                if action and action.name == action_name:
                    num = extract_node_action_num_channels(node_tree, node_name)
                    if num:
                        return num
    return None

def extract_node_action_num_channels(node_tree, node_name):
    for node in node_tree.nodes:
        if node.name == node_name:
            if node.type == "RGB":
                return 3
            else:
                return 1
    return None


def process_scene(scene):
    if "export_done" in scene and scene["export_done"]:
        return
    scene["export_done"] = True

    global _curr_stack
    _curr_stack["scenes"].append(scene)

    scene_data = OrderedDict()

    scene_data["name"] = scene.name
    scene_data["uuid"] = gen_uuid(scene)

    process_scene_nla(scene, scene_data)

    scene_data["b4w_enable_dynamic_compressor"] \
            = scene.b4w_enable_dynamic_compressor

    process_scene_dyn_compr_settings(scene_data, scene)

    process_scene_shadow_settings(scene_data, scene)
    process_scene_god_rays_settings(scene_data, scene)
    process_scene_ssao_settings(scene_data, scene)
    process_scene_color_correction_settings(scene_data, scene)
    process_scene_bloom_settings(scene_data, scene)
    process_scene_motion_blur_settings(scene_data, scene)
    process_scene_glow_settings(scene_data, scene)

    scene_data["b4w_outline_color"] = round_iterable(scene.b4w_outline_color, 4)
    scene_data["b4w_outline_factor"] = round_num(scene.b4w_outline_factor, 2)

    scene_data["b4w_enable_physics"] = scene.b4w_enable_physics
    scene_data["b4w_render_shadows"] = scene.b4w_render_shadows
    scene_data["b4w_render_reflections"] = scene.b4w_render_reflections
    scene_data["b4w_reflection_quality"] = scene.b4w_reflection_quality
    scene_data["b4w_render_refractions"] = scene.b4w_render_refractions
    scene_data["b4w_render_dynamic_grass"] = scene.b4w_render_dynamic_grass
    scene_data["b4w_enable_god_rays"] = scene.b4w_enable_god_rays
    scene_data["b4w_enable_glow_materials"] = scene.b4w_enable_glow_materials
    scene_data["b4w_enable_ssao"] = scene.b4w_enable_ssao

    # NOTE: temporary backward compatibility, should be removed after some time
    scene_data["b4w_batch_grid_size"] = 0

    scene_data["b4w_anisotropic_filtering"] = scene.b4w_anisotropic_filtering
    scene_data["b4w_enable_bloom"] = scene.b4w_enable_bloom
    scene_data["b4w_enable_motion_blur"] = scene.b4w_enable_motion_blur
    scene_data["b4w_enable_color_correction"] = scene.b4w_enable_color_correction
    scene_data["b4w_antialiasing_quality"] = scene.b4w_antialiasing_quality
    scene_data["b4w_enable_object_selection"] = scene.b4w_enable_object_selection
    scene_data["b4w_enable_outlining"] = scene.b4w_enable_outlining
    scene_data["b4w_enable_anchors_visibility"] = scene.b4w_enable_anchors_visibility
    scene_data["b4w_lod_smooth_type"] = scene.b4w_lod_smooth_type
    scene_data["b4w_lod_hyst_interval"] = scene.b4w_lod_hyst_interval
    
    tags = scene.b4w_tags

    if scene.b4w_enable_tags:
        sdt = scene_data["b4w_tags"] = OrderedDict()
        sdt["title"] = tags.title
        sdt["description"] = get_tags_description(tags)
    else:
        scene_data["b4w_tags"] = None

    if hasattr(scene, "b4w_custom_prop"):
        scene_data["b4w_custom_prop"] = encode_custom_prop(scene.b4w_custom_prop)
    else:
        scene_data["b4w_custom_prop"] = None

    # process scene links
    scene_data["objects"] = []
    for obj in scene.objects:
        if do_export(obj) and object_is_valid(obj):
            scene_data["objects"].append(process_object(obj))

    camera = scene.camera
    if (camera and do_export(camera) and object_is_valid(camera)
            and camera.type == "CAMERA"):
        scene_data["camera"] = process_object(camera)
    else:
        scene_data["camera"] = None

    world = scene.world
    if world and do_export(world):
        scene_data["world"] = gen_uuid_dict(world)
        process_world(world)
    else:
        scene_data["world"] = None

    scene_data["frame_start"] = scene.frame_start
    scene_data["frame_end"] = scene.frame_end

    if len(scene.timeline_markers):
        scene_data["timeline_markers"] = OrderedDict()
        for marker in scene.timeline_markers:
            scene_data["timeline_markers"][marker.name] = marker.frame
    else:
        scene_data["timeline_markers"] = None

    scene_data["fps"] = scene.render.fps

    scene_data["audio_volume"] = round_num(scene.audio_volume, 3)
    scene_data["audio_doppler_speed"] = round_num(scene.audio_doppler_speed, 3)
    scene_data["audio_doppler_factor"] \
            = round_num(scene.audio_doppler_factor, 3)
    scene_data["audio_distance_model"] = scene.audio_distance_model

    # add CURVE objects buffer to scene data
    scene_data["objects"].extend(_additional_scene_objects)

    _export_data["scenes"].append(scene_data)
    _export_uuid_cache[scene_data["uuid"]] = scene_data
    _bpy_uuid_cache[scene_data["uuid"]] = scene
    check_scene_data(scene_data, scene)
    _curr_stack["scenes"].pop()

    clusterer.run(_export_uuid_cache, _bpy_uuid_cache, scene_data, 
            scene.b4w_cluster_size, scene.b4w_lod_cluster_size_mult)

def get_tags_description(tags):
    if tags.desc_source == "TEXT":
        return tags.description
    else:
        for text in bpy.data.texts:
            if text.name == tags.description:
                description = ""
                for line in text.lines:
                    description += line.body + "\n"
                return description
        return ""

def label_to_slot_num(scene, nla_script, label):
    """Returns -1 if no label was found"""
    for num in range(len(nla_script)):
        slot = nla_script[num]
        if slot['label'] == label:
            return num

    return -1

def markers_to_frame_range(scene, marker_start, marker_end):
    markers = scene.timeline_markers
    first_mask = True
    last_mask = True
    first = 0
    last = 0
    if marker_end not in markers:
        marker_end = ''
    if marker_start not in markers:
        marker_start = ''
    if marker_start == '':
        first_mask = False
    else:
        first = markers[marker_start].frame
        if first < scene.frame_start:
            first = scene.frame_start

    if marker_end == "":
        last_mask = False
    else:
        last = markers[marker_end].frame
        if last > scene.frame_end:
            last = scene.frame_end
    return [first, last], [first_mask, last_mask]

def get_node_idx_by_name(nodes, name):
    for i in range(len(nodes)):
        if nodes[i]["label"] == name:
            return i
    return -1

def get_logic_nodetree_name(scene):
    tree_name = scene.b4w_active_logic_node_tree

    # check tree name, allow empty name
    if (not tree_name in bpy.data.node_groups) or tree_name == "":
        warn("Wrong name of active logic node tree:'%s'" % str(tree_name) + ".")
        # Try to force set tree
        # firstly try to get active tree
        tree_name = ""
        try:
            for area in bpy.context.screen.areas:
                if area.type == "NODE_EDITOR":
                    for s in area.spaces:
                        if s.type == "NODE_EDITOR":
                            if s.tree_type == "B4WLogicNodeTreeType":
                                tree_name = s.node_tree.name
        except:
            # logic editor is not active
            pass

        if tree_name == "":
            # set first nodetree
            for t in bpy.data.node_groups:
                if t.bl_idname == "B4WLogicNodeTreeType":
                    tree_name = t.name

        if tree_name == "":
            err("Fail to force set of active logic node tree.")
        else:
            warn("Force to use '%s' as active logic node tree" % str(tree_name) + ".")

    return tree_name

def force_mute_node(node_data, desc=None):
    node_data['mute'] = True

def process_scene_nla(scene, scene_data):
    scene_data["b4w_use_nla"] = scene.b4w_use_nla
    scene_data["b4w_nla_cyclic"] = scene.b4w_nla_cyclic
    scene_data["b4w_logic_nodes"] = []
    scene_data["b4w_use_logic_editor"] = scene.b4w_use_logic_editor

    def check_url(slot):
        if slot["bools"]["url"]:
            if slot["variables_names"]["url"] != "":
                return True
        else:
            if slot["strings"]["url"] != "":
                return True

        err("Incorrect Logic script node " + "\"" + slot_data["name"] \
             + "\"" + ", falling back to simple sequential NLA.")
        scene_data["b4w_logic_nodes"] = []
        return False

    if not scene.b4w_use_logic_editor:
        return

    scripts = []
    tree_name = get_logic_nodetree_name(scene)

    if not tree_name == "":
        tree = bpy.data.node_groups[tree_name]
        scripts, errors = tree.get_tree()

        if len(errors) != 0:
            for name, mes in errors:
                err("Logic Editor wrong syntax in '%s': %s" % (name, mes) + ".")

    for script in scripts:
        scene_data["b4w_logic_nodes"].append([])
        nla_subtree = scene_data["b4w_logic_nodes"][-1]
        for slot in script:
            slot_data = OrderedDict()
            slot_data["label"] = slot['label']
            slot_data["name"] = slot["name"]
            slot_data["type"] = slot['type']
            slot_data["slot_idx_order"] = get_node_idx_by_name(script, slot['link_order'])
            slot_data["slot_idx_jump"] = -1
            slot_data["frame_range"] = [0,0]
            slot_data["object"] = None
            slot_data["operation"] = ""
            slot_data["param_name"] = ""
            slot_data["mute"] = slot["mute"]
            slot_data["anim_name"] = slot["param_anim_name"]
            slot_data["parse_json_vars"] = slot["parse_json_vars"]
            slot_data["parse_json_paths"] = slot["parse_json_paths"]
            slot_data["objects_paths"] = slot["objects_paths"]
            slot_data["materials_names"] = slot["materials_names"]
            slot_data["nodes_paths"] = slot["nodes_paths"]
            slot_data["floats"] = slot["floats"]
            slot_data["bools"] = slot["bools"]
            slot_data["variables"] = slot["variables_names"]
            slot_data["strings"] = slot["strings"]
            slot_data["shader_nd_type"] = slot["shader_nd_type"]
            slot_data["common_usage_names"] = slot["common_usage_names"]
            slot_data["encode_json_vars"] = slot["encode_json_vars"]
            slot_data["encode_json_paths"] = slot["encode_json_paths"]
            slot_data["links"] = {}

            if slot['type'] == "PLAY":
                frame_range, frame_range_mask = markers_to_frame_range(scene,
                        slot['param_marker_start'], slot['param_marker_end'])
                slot_data["frame_range"] = frame_range
                slot_data["frame_range_mask"] = frame_range_mask

            elif slot['type'] == "SELECT":
                obj = logic_node_tree.object_by_path(bpy.data.objects, slot['objects_paths']["id0"])
                if (obj and do_export(obj) and object_is_valid(obj)):
                    slot_data["object"] = slot["objects_paths"]["id0"]
                    if slot['link_jump']:
                        slot_data["slot_idx_jump"] = get_node_idx_by_name(script, slot['link_jump'])
                else:
                    force_mute_node(slot_data, "Object is not selected or not exported.")

            elif slot['type'] == "SWITCH_SELECT":
                ind = 0
                for k in slot["objects_paths"]:
                    obj = logic_node_tree.object_by_path(bpy.data.objects, slot["objects_paths"][k])
                    if (obj and do_export(obj) and object_is_valid(obj)):
                        idx = -1
                        if k in slot["links"]:
                            idx = get_node_idx_by_name(script, slot['links'][k])
                        slot_data["links"][k] = idx
                    else:
                        force_mute_node(slot_data, "Object is not selected or not exported.")
                        break
                    ind += 1

            elif slot['type'] == "PLAY_ANIM" or slot['type'] == "STOP_ANIM":
                # NOTE: temporary compatibility fix for deprecated SELECT_PLAY_ANIM node
                if "env" not in slot["bools"] or not slot["bools"]["env"]:
                    obj = logic_node_tree.object_by_path(bpy.data.objects, slot['objects_paths']["id0"])

                    if (obj and do_export(obj) and object_is_valid(obj)):
                        slot_data["object"] = slot['objects_paths']["id0"]
                    else:
                        force_mute_node(slot_data, "Object is not selected or not exported.")
                else:
                    wrld = logic_node_tree.object_by_path(bpy.data.worlds, slot['objects_paths']["id0"])

                    if (wrld and do_export(wrld)):
                        slot_data["object"] = slot['objects_paths']["id0"]
                    else:
                        force_mute_node(slot_data, "World is not selected or not exported.")

            elif slot['type'] == "INHERIT_MAT":
                for o in slot["objects_paths"]:
                    obj = logic_node_tree.object_by_path(bpy.data.objects, slot["objects_paths"][o])
                    if (obj and do_export(obj) and object_is_valid(obj) and obj.b4w_dynamic_geometry):
                        pass
                    else:
                        force_mute_node(slot_data)
                check_materials_names(slot, slot_data)

            elif slot['type'] == "SET_SHADER_NODE_PARAM":
                obj = logic_node_tree.object_by_path(bpy.data.objects, slot["objects_paths"]["id0"])
                if (obj and do_export(obj) and object_is_valid(obj)):
                    slot_data["object"] = slot['objects_paths']["id0"]
                else:
                    force_mute_node(slot_data, "Object is not selected or not exported.")
                if not slot_data['shader_nd_type']:
                    slot_data['mute'] = True

            elif slot['type'] == "APPLY_SHAPE_KEY":
                obj = logic_node_tree.object_by_path(bpy.data.objects, slot["objects_paths"]["id0"])
                if (obj and do_export(obj) and object_is_valid(obj)):
                    pass
                else:
                    force_mute_node(slot_data, "Object is not selected or not exported.")
                if slot_data['common_usage_names']['sk'] == '':
                    slot_data['mute'] = True

            elif slot['type'] == "JUMP" or slot['type'] == "CONDJUMP":
                slot_data["slot_idx_jump"] = get_node_idx_by_name(script, slot['link_jump'])

                if slot['type'] == "CONDJUMP":
                    if not slot['param_var_flag1']:
                        slot_data["variables"]["v1"][1] = -1

                    if not slot['param_var_flag2']:
                        slot_data["variables"]["v2"][1] = -1

            elif slot['type'] == "REGSTORE":
                if slot['param_var_flag1']:
                    slot_data["variables"]["vd"] = slot['param_var_define']

            elif slot['type'] == "MATH":
                slot_data["operation"] = slot['param_operation']
                if not slot['param_var_flag1']:
                    slot_data["variables"]["v1"][1] = -1
                if not slot['param_var_flag2']:
                    slot_data["variables"]["v2"][1] = -1
            elif slot['type'] == "REDIRECT":
                if not check_url(slot):
                    return
            elif slot['type'] == "SEND_REQ":
                if not check_url(slot):
                    return
            elif slot['type'] == "SHOW" or slot['type'] == "HIDE":
                obj = logic_node_tree.object_by_path(bpy.data.objects, slot['objects_paths']["id0"])
                if obj and do_export(obj) and object_is_valid(obj):
                    slot_data["object"] = slot['objects_paths']["id0"]
                else:
                    force_mute_node(slot_data, "Object is not selected or not exported.")

            elif slot['type'] == "PAGEPARAM":
                if slot['param_name']:
                    slot_data["param_name"] = slot['param_name']
                else:
                    force_mute_node(slot_data, "Bad param name")

                if slot['param_variable_type'] == "NUMBER":
                    slot_data["floats"]["ptp"] = 0
                else:
                    slot_data["floats"]["ptp"] = 1

            elif slot['type'] == "MOVE_CAMERA":
                check_objects_paths(slot, slot_data)

            elif slot['type'] == "SET_CAMERA_MOVE_STYLE":
                obj = logic_node_tree.object_by_path(bpy.data.objects, slot["objects_paths"]["id0"])
                if (obj and do_export(obj) and object_is_valid(obj)):
                    pass
                else:
                    force_mute_node(slot_data, "Object is not selected or not exported.")
                if slot["common_usage_names"]['camera_move_style'] in ["HOVER", "TARGET"] and slot['bools']['pvo']:
                    obj = logic_node_tree.object_by_path(bpy.data.objects, slot["objects_paths"]["id1"])
                    if (obj and do_export(obj) and object_is_valid(obj)):
                        pass
                    else:
                        force_mute_node(slot_data, "Object is not selected or not exported.")

            elif slot['type'] == "SET_CAMERA_LIMITS":
                obj = logic_node_tree.object_by_path(bpy.data.objects, slot["objects_paths"]["id0"])
                if (obj and do_export(obj) and object_is_valid(obj)):
                    pass
                else:
                    force_mute_node(slot_data, "Object is not selected or not exported.")

            elif slot['type'] == "MOVE_TO":
                check_objects_paths(slot, slot_data)

            elif slot['type'] == "TRANSFORM_OBJECT":
                check_objects_paths(slot, slot_data)

            elif slot['type'] == "STRING":
                #remove unused elements
                if slot['common_usage_names']['string_operation'] != "SPLIT":
                    del slot_data["variables"]["dst1"]
                if slot["common_usage_names"]['string_operation'] != "REPLACE":
                    del slot_data["bools"]["id2"]
                    del slot_data["variables"]["id2"]
                    del slot_data["strings"]["id2"]

            elif slot['type'] == "SPEAKER_PLAY" or slot['type'] == "SPEAKER_STOP":
                check_objects_paths(slot, slot_data)

            elif slot['type'] == "NOOP":
                pass

            nla_subtree.append(slot_data)

    # import pprint
    # pprint.pprint(scene_data["b4w_logic_nodes"])


def check_objects_paths(slot, slot_data):
    for o in slot["objects_paths"]:
        obj = logic_node_tree.object_by_path(bpy.data.objects, slot["objects_paths"][o])
        if (obj and do_export(obj) and object_is_valid(obj)):
            pass
        else:
            force_mute_node(slot_data, "Object is not selected or not exported.")

def check_materials_names(slot, slot_data):
    for index in slot["materials_names"]:
        mat = slot["materials_names"][index]
        obj = logic_node_tree.object_by_path(bpy.data.objects, slot["objects_paths"][index])

        if obj:
            obj_has_mat = False
            for mat_slot in obj.material_slots:
                if mat_slot.material and do_export(mat_slot.material) and mat_slot.material.name == mat:
                    obj_has_mat = True
                    break

            if not obj_has_mat:
                force_mute_node(slot_data)

def process_scene_dyn_compr_settings(scene_data, scene):
    dcompr = scene.b4w_dynamic_compressor_settings

    dct = scene_data["b4w_dynamic_compressor_settings"] = OrderedDict()
    dct["threshold"] = round_num(dcompr.threshold, 1)
    dct["knee"] = round_num(dcompr.knee, 1)
    dct["ratio"] = round_num(dcompr.ratio, 1)
    dct["attack"] = round_num(dcompr.attack, 3)
    dct["release"] = round_num(dcompr.release, 3)

def process_scene_shadow_settings(scene_data, scene):
    shadow = scene.b4w_shadow_settings

    dct = scene_data["b4w_shadow_settings"] = OrderedDict()

    dct["csm_resolution"] = int(shadow.csm_resolution)
    dct["blur_samples"] = shadow.blur_samples
    dct["soft_shadows"] = shadow.soft_shadows
    dct["self_shadow_polygon_offset"] = round_num(shadow.self_shadow_polygon_offset, 2)
    dct["self_shadow_normal_offset"] = round_num(shadow.self_shadow_normal_offset, 3)

    dct["b4w_enable_csm"] = shadow.b4w_enable_csm
    dct["csm_num"] = shadow.csm_num
    dct["csm_first_cascade_border"] = round_num(shadow.csm_first_cascade_border, 2)
    dct["first_cascade_blur_radius"] = round_num(shadow.first_cascade_blur_radius, 2)
    dct["csm_last_cascade_border"] = round_num(shadow.csm_last_cascade_border, 2)
    dct["last_cascade_blur_radius"] = round_num(shadow.last_cascade_blur_radius, 2)
    dct["fade_last_cascade"] = shadow.fade_last_cascade
    dct["blend_between_cascades"] = shadow.blend_between_cascades

def process_scene_god_rays_settings(scene_data, scene):
    god_rays = scene.b4w_god_rays_settings

    dct = scene_data["b4w_god_rays_settings"] = OrderedDict()
    dct["intensity"] = round_num(god_rays.intensity, 2)
    dct["max_ray_length"] = round_num(god_rays.max_ray_length, 2)
    dct["steps_per_pass"] = round_num(god_rays.steps_per_pass, 1)


def process_scene_ssao_settings(scene_data, scene):
    ssao = scene.b4w_ssao_settings

    dct = scene_data["b4w_ssao_settings"] = OrderedDict()
    dct["radius_increase"] = round_num(ssao.radius_increase, 2)
    dct["hemisphere"] = ssao.hemisphere
    dct["blur_depth"] = ssao.blur_depth
    dct["blur_discard_value"] = round_num(ssao.blur_discard_value, 2)
    dct["influence"] = round_num(ssao.influence, 3)
    dct["dist_factor"] = round_num(ssao.dist_factor, 2)
    dct["samples"] = int(ssao.samples)

def process_scene_color_correction_settings(scene_data, scene):
    ccs = scene.b4w_color_correction_settings

    dct = scene_data["b4w_color_correction_settings"] = OrderedDict()
    dct["brightness"] = round_num(ccs.brightness, 2)
    dct["contrast"] = round_num(ccs.contrast, 2)
    dct["exposure"] = round_num(ccs.exposure, 2)
    dct["saturation"] = round_num(ccs.saturation, 2)

def process_scene_bloom_settings(scene_data, scene):
    bloom = scene.b4w_bloom_settings

    dct = scene_data["b4w_bloom_settings"] = OrderedDict()
    dct["key"] = round_num(bloom.key, 2)
    dct["blur"] = round_num(bloom.blur, 2)
    dct["edge_lum"] = round_num(bloom.edge_lum, 2)
    dct["adaptive"] = bloom.adaptive
    dct["average_luminance"] = bloom.average_luminance

def process_scene_motion_blur_settings(scene_data, scene):
    motion_blur = scene.b4w_motion_blur_settings

    dct = scene_data["b4w_motion_blur_settings"] = OrderedDict()
    dct["motion_blur_factor"] = round_num(motion_blur.motion_blur_factor, 3)
    dct["motion_blur_decay_threshold"] \
            = round_num(motion_blur.motion_blur_decay_threshold, 3)

def process_scene_glow_settings(scene_data, scene):
    glow = scene.b4w_glow_settings

    dct = scene_data["b4w_glow_settings"] = OrderedDict()
    dct["render_glow_over_blend"] = glow.render_glow_over_blend
    dct["small_glow_mask_coeff"]  = round_num(glow.small_glow_mask_coeff, 3)
    dct["large_glow_mask_coeff"]  = round_num(glow.large_glow_mask_coeff, 3)
    dct["small_glow_mask_width"]  = round_num(glow.small_glow_mask_width, 2)
    dct["large_glow_mask_width"]  = round_num(glow.large_glow_mask_width, 2)

def check_main_metaball(obj, mesh_data):
    curr_scene = _curr_stack["scenes"][-1]
    is_main_metaball = (obj.type == "META" and mesh_data is not None and 
            not curr_scene["metaballs_processed"])
    if is_main_metaball:
        curr_scene["metaballs_processed"] = True

    return is_main_metaball

def process_object_type(obj, data, curve_as_curve):

    new_type = obj.type

    if obj.type != "EMPTY":
        if obj.data is None:
            # broken object data
            err("Object " + obj.name + " has no data or data is broken. "
                    + "Change object type to EMPTY.")
            return "EMPTY"

        is_main_metaball = check_main_metaball(obj, data)
        if data is None:
            # data != obj.data -> degenerated data was created through the "to_mesh" 
            # operation -> convert to EMPTY
            new_type = "EMPTY"
        else:
            if (obj.type == "SURFACE" or obj.type == "FONT" 
                    or obj.type == "CURVE" and not curve_as_curve):
                new_type = "MESH"

            if obj.type == "META":
                if is_main_metaball:
                    new_type = "MESH"
                else:
                    new_type = "EMPTY"

            if new_type == "MESH" and not len(data.polygons):
                new_type = "EMPTY"

            if new_type == "SPEAKER" and data.sound is None:
                new_type = "EMPTY"

        if new_type == "EMPTY":
            if obj.type == "SPEAKER":
                warn("Sound file is missing in the SPEAKER object \"" + obj.name 
                        + "\". Converted to EMPTY.")
            elif obj.type != "META" or is_main_metaball:
                warn("Object \"" + obj.name 
                        + "\" hasn't renderable data. Converted to EMPTY.")

    elif obj.b4w_line_renderer:
        new_type = "LINE";

    return new_type

def process_object(obj, is_curve=False, is_hair=False):

    prop = "export_done"
    postfix = ""
    if is_curve:
        prop = "curve_exp_done"
        postfix = prop
    if is_hair:
        prop = "hair_exp_done"
        postfix = prop

    if prop in obj and obj[prop]:
        return gen_uuid_dict(obj, postfix)
    obj[prop] = True

    _curr_stack["object"].append(obj)

    obj_data = OrderedDict()

    if is_hair:
        obj_data["name"] = obj.name + SUF_HAIR_DUPLI
    else:
        obj_data["name"] = obj.name
    obj_data["uuid"] = gen_uuid(obj, postfix)

    # process object links
    if is_curve:
        data = obj.data
    else:
        data = get_obj_data(obj, _curr_stack["scenes"][-1])

    obj_data["type"] = process_object_type(obj, data, is_curve)
    if obj.type == "FONT" and obj_data["type"] == "MESH":
        obj_data["body_text"] = obj.data.body
    else:
        obj_data["body_text"] = None

    obj_data["data"] = gen_uuid_dict(data)

    # process varyous obj data
    if obj_data["type"] == "MESH":
        # NOTE: process mesh returns unique uuid for every shared mesh with 
        # different materials (assigned to Object) 
        obj_data["data"] = OrderedDict({ "uuid": process_mesh(data, obj) })
    elif obj_data["type"] == "CURVE":
        process_curve(data)
    elif obj_data["type"] == "ARMATURE":
        process_armature(data)
    elif obj_data["type"] == "CAMERA":
        process_camera(data)
    elif obj_data["type"] == "LAMP":
        process_lamp(data)
    elif obj_data["type"] == "SPEAKER":
        process_speaker(data)

    proxy = obj.proxy
    if proxy and do_export(proxy) and object_is_valid(proxy):
        obj_data["proxy"] = process_object(proxy)
    else:
        obj_data["proxy"] = None

    dupli_group = obj.dupli_group
    if dupli_group and obj.dupli_type == "GROUP":
        obj_data["dupli_group"] = process_group(dupli_group)
        
        dg_uuid = obj_data["dupli_group"]["uuid"]
        dg_data = _export_uuid_cache[dg_uuid]
        if not dg_data["objects"]:
            err("Dupli group error for object " + obj.name + ". Objects from the \""  +
                    dg_data["name"] + "\" dupli group on the object \"" +
                    obj_data["name"] + "\" cannot be exported.")
            obj_data["dupli_group"] = None
    else:
        obj_data["dupli_group"] = None

    parent = obj.parent
    if parent and do_export(parent) and object_is_valid(parent) and not is_hair:
        obj_data["parent"] = process_object(parent)

        if obj.b4w_enable_viewport_alignment and parent.type == "CAMERA":
            obj_va = obj_data["b4w_viewport_alignment"] = OrderedDict()
            obj_va["alignment"] = obj.b4w_viewport_alignment.alignment
            obj_va["distance"] = obj.b4w_viewport_alignment.distance
        else:
            obj_data["b4w_viewport_alignment"] = None
    else:
        obj_data["parent"] = None
        obj_data["b4w_viewport_alignment"] = None
        obj_data["pinverse_tsr"] = None

    obj_data["parent_type"] = obj.parent_type
    obj_data["parent_bone"] = obj.parent_bone

    obj_data["b4w_cluster_data"] = OrderedDict()
    obj_data["b4w_cluster_data"]["cluster_id"] = -1
    obj_data["b4w_cluster_data"]["cluster_center"] = None
    # NOTE: unused
    obj_data["b4w_cluster_data"]["cluster_radius"] = 0

    # NOTE: give more freedom to objs with edited normals
    obj_data["modifiers"] = []
    if (obj_data["type"] == "MESH"
            and not (obj.b4w_apply_modifiers or obj.b4w_apply_scale or obj_auto_apply_modifiers(obj))):
        process_object_modifiers(obj_data["modifiers"], obj.modifiers, obj)

    if not is_hair:
        obj_data["constraints"] = process_constraints(obj, True)
        obj_data["particle_systems"] = process_object_particle_systems(obj, data)
    else:
        obj_data["constraints"] = []
        obj_data["particle_systems"] = []

    if not is_hair:
        process_animation_data(obj_data, obj, bpy.data.actions)
    else:
        obj_data["animation_data"] = OrderedDict()
        obj_data["animation_data"]["nla_tracks"] = []
        obj_data["animation_data"]["action"] = None

    # export custom properties
    obj_data["b4w_do_not_batch"] = obj.b4w_do_not_batch
    obj_data["b4w_dynamic_geometry"] = obj.b4w_dynamic_geometry
    obj_data["b4w_do_not_cull"] = obj.b4w_do_not_cull
    obj_data["b4w_disable_fogging"] = obj.b4w_disable_fogging
    obj_data["b4w_do_not_render"] = obj.b4w_do_not_render
    obj_data["b4w_hidden_on_load"] = obj.b4w_hidden_on_load
    obj_data["b4w_hide_chldr_on_load"] = obj.b4w_hidden_on_load and obj.b4w_hide_chldr_on_load
    obj_data["b4w_shadow_cast"] = obj.b4w_shadow_cast
    obj_data["b4w_shadow_receive"] = obj.b4w_shadow_receive
    obj_data["b4w_reflexible"] = obj.b4w_reflexible
    obj_data["b4w_reflexible_only"] = obj.b4w_reflexible_only
    obj_data["b4w_reflective"] = obj.b4w_reflective
    obj_data["b4w_reflection_type"] = obj.b4w_reflection_type
    obj_data["b4w_caustics"] = obj.b4w_caustics
    obj_data["b4w_wind_bending"] = obj.b4w_wind_bending
    obj_data["b4w_wind_bending_angle"] \
            = round_num(obj.b4w_wind_bending_angle, 1)
    obj_data["b4w_wind_bending_freq"] \
            = round_num(obj.b4w_wind_bending_freq, 2)
    obj_data["b4w_detail_bending_amp"] \
            = round_num(obj.b4w_detail_bending_amp, 4)
    obj_data["b4w_detail_bending_freq"] \
            = round_num(obj.b4w_detail_bending_freq, 3)
    obj_data["b4w_branch_bending_amp"] \
            = round_num(obj.b4w_branch_bending_amp, 4)
    obj_data["b4w_main_bend_stiffness_col"] \
            = obj.b4w_main_bend_stiffness_col

    detail_bend = obj.b4w_detail_bend_colors
    dct = obj_data["b4w_detail_bend_colors"] = OrderedDict()
    dct["leaves_stiffness_col"] = detail_bend.leaves_stiffness_col
    dct["leaves_phase_col"] = detail_bend.leaves_phase_col
    dct["overall_stiffness_col"] = detail_bend.overall_stiffness_col

    if is_hair:
        obj_data["lod_levels"] = []
    else:
        obj_data["lod_levels"] = process_object_lod_levels(obj)

    obj_data["b4w_proxy_inherit_anim"] = obj.b4w_proxy_inherit_anim

    obj_data["b4w_selectable"] = obj.b4w_selectable
    obj_data["b4w_outlining"] = obj.b4w_outlining
    obj_data["b4w_billboard"] = obj.b4w_billboard
    obj_data["b4w_pres_glob_orientation"] = obj.b4w_pres_glob_orientation
    obj_data["b4w_billboard_geometry"] = obj.b4w_billboard_geometry

    gw_set = obj.b4w_outline_settings
    dct = obj_data["b4w_outline_settings"] = OrderedDict()
    dct["outline_duration"] = round_num(gw_set.outline_duration, 2)
    dct["outline_period"] = round_num(gw_set.outline_period, 2)
    dct["outline_relapses"] = gw_set.outline_relapses

    obj_data["b4w_outline_on_select"] = obj.b4w_outline_on_select
    obj_data["b4w_use_default_animation"] = obj.b4w_use_default_animation
    obj_data["b4w_anim_behavior"] = obj.b4w_anim_behavior
    obj_data["b4w_animation_mixing"] = obj.b4w_animation_mixing

    obj_data["b4w_shadow_cast_only"] = obj.b4w_shadow_cast_only

    if not is_hair:
        obj_data["b4w_collision"] = obj.b4w_collision
        obj_data["b4w_collision_id"] = obj.b4w_collision_id

        obj_data["b4w_vehicle"] = obj.b4w_vehicle
        if obj.b4w_vehicle:
            vh_set = obj.b4w_vehicle_settings
            dct = obj_data["b4w_vehicle_settings"] = OrderedDict()
            dct["name"] = vh_set.name
            dct["part"] = vh_set.part
            dct["suspension_rest_length"] = round_num(vh_set.suspension_rest_length, 3)
            dct["suspension_compression"] = round_num(vh_set.suspension_compression, 3)
            dct["suspension_stiffness"] = round_num(vh_set.suspension_stiffness, 3)
            dct["suspension_damping"] = round_num(vh_set.suspension_damping, 3)
            dct["wheel_friction"] = round_num(vh_set.wheel_friction, 3)
            dct["roll_influence"] = round_num(vh_set.roll_influence, 3)
            dct["max_suspension_travel_cm"] \
                    = round_num(vh_set.max_suspension_travel_cm, 3)
            dct["force_max"] = round_num(vh_set.force_max, 3)
            dct["brake_max"] = round_num(vh_set.brake_max, 3)
            dct["steering_max"] = round_num(vh_set.steering_max, 3)
            dct["max_speed_angle"] = round_num(vh_set.max_speed_angle, 3)
            dct["delta_tach_angle"] = round_num(vh_set.delta_tach_angle, 3)
            dct["speed_ratio"] = round_num(vh_set.speed_ratio, 3)
            dct["steering_ratio"] = round_num(vh_set.steering_ratio, 3)
            dct["inverse_control"] = vh_set.inverse_control
            dct["floating_factor"] = round_num(vh_set.floating_factor, 3)
            dct["water_lin_damp"] = round_num(vh_set.water_lin_damp, 3)
            dct["water_rot_damp"] = round_num(vh_set.water_rot_damp, 3)
            dct["synchronize_position"] = vh_set.synchronize_position
        else:
            obj_data["b4w_vehicle_settings"] = None


        store_vehicle_integrity(obj_data)

        obj_data["b4w_character"] = obj.b4w_character
        if obj.b4w_character:
            ch_set = obj.b4w_character_settings
            dct = obj_data["b4w_character_settings"] = OrderedDict()
            dct["walk_speed"] = round_num(ch_set.walk_speed, 3)
            dct["run_speed"] = round_num(ch_set.run_speed, 3)
            dct["step_height"] = round_num(ch_set.step_height, 3)
            dct["jump_strength"] = round_num(ch_set.jump_strength, 3)
            dct["waterline"] = round_num(ch_set.waterline, 3)
        else:
            obj_data["b4w_character_settings"] = None

        obj_data["b4w_floating"] = obj.b4w_floating
        if obj.b4w_floating:
            fl_set = obj.b4w_floating_settings
            dct = obj_data["b4w_floating_settings"] = OrderedDict()
            dct["name"] = fl_set.name
            dct["part"] = fl_set.part
            dct["floating_factor"] = round_num(fl_set.floating_factor, 3)
            dct["water_lin_damp"] = round_num(fl_set.water_lin_damp, 3)
            dct["water_rot_damp"] = round_num(fl_set.water_rot_damp, 3)
            dct["synchronize_position"] = fl_set.synchronize_position
        else:
            obj_data["b4w_floating_settings"] = None

        process_object_pose(obj_data, obj, obj.pose)
        process_object_force_field(obj_data, obj.field)
    else:
        obj_data["b4w_collision"] = False
        obj_data["b4w_collision_id"] = ""
        obj_data["b4w_vehicle"] = False
        obj_data["b4w_vehicle_settings"] = None
        obj_data["b4w_character"] = False
        obj_data["b4w_character_settings"] = None
        obj_data["b4w_floating"] = False
        obj_data["b4w_floating_settings"] = None
        obj_data["pose"] = None
        obj_data["field"] = None

    obj_data["b4w_correct_bounding_offset"] = obj.b4w_correct_bounding_offset

    process_object_game_settings(obj_data, obj)

    rot = get_rotation_quat(obj)
    loc = obj.location
    if (not (obj_data["type"] == "MESH" and (obj.b4w_apply_scale or obj_auto_apply_scale(obj)))
        and not(obj_data["type"] == "EMPTY" and obj.type == "META")):
        sca = obj.scale
    else:
        sca = [1.0, 1.0, 1.0]

    obj_data["pass_index"] = obj.pass_index

    # resolving clean_parent_inverse issue
    if obj.parent:
        sca_parent = obj.parent.scale
        mat_inv_parent = obj.matrix_parent_inverse
        pinv_scale = mat_inv_parent.to_scale()
        pinv_rotation_quat = mat_inv_parent.to_quaternion()
        pinv_translation = mat_inv_parent.to_translation()
        loc = mat_inv_parent * loc
        if obj.parent.b4w_apply_scale or obj_auto_apply_scale(obj.parent):
            pinv_scale = list(map(operator.mul, sca_parent, pinv_scale))
            loc = list(map(operator.mul, sca_parent, loc))

        sca = list(map(operator.mul, sca, pinv_scale))
        rot.rotate(mat_inv_parent)
        obj_data["pinverse_tsr"] = round_iterable( 
            [pinv_translation[0], pinv_translation[1], pinv_translation[2], 
            pinv_scale[0],
            pinv_rotation_quat.x, pinv_rotation_quat.y, pinv_rotation_quat.z, pinv_rotation_quat.w], 5)

    obj_data["location"] = round_iterable([loc[0], loc[1], loc[2]], 5)

    obj_data["rotation_quaternion"] = round_iterable([rot[0], rot[1], rot[2], rot[3]], 5)

    obj_data["scale"] = round_iterable([sca[0], sca[1], sca[2]], 5)

    if obj.b4w_enable_object_tags:
        tags = obj.b4w_object_tags
        odt = obj_data["b4w_object_tags"] = OrderedDict()
        odt["title"] = tags.title
        odt["description"] = get_tags_description(tags)
        odt["category"] = tags.category
    else:
        obj_data["b4w_object_tags"] = None

    if hasattr(obj, "b4w_custom_prop"):
        obj_data["b4w_custom_prop"] = encode_custom_prop(obj.b4w_custom_prop)
    else:
        obj_data["b4w_custom_prop"] = None

    if obj.b4w_enable_anchor:
        anchor = obj.b4w_anchor
        odt = obj_data["b4w_anchor"] = OrderedDict()
        odt["type"] = anchor.type
        odt["detect_visibility"] = anchor.detect_visibility
        odt["element_id"] = anchor.element_id
        odt["max_width"] = anchor.max_width
    else:
        obj_data["b4w_anchor"] = None

    _export_data["objects"].append(obj_data)
    _export_uuid_cache[obj_data["uuid"]] = obj_data
    _bpy_uuid_cache[obj_data["uuid"]] = obj
    check_object_data(obj_data, obj)
    _curr_stack["object"].pop()

    return OrderedDict({ "uuid": obj_data["uuid"] })

def encode_custom_prop(prop):
    # property group, "object"
    if hasattr(prop, "bl_rna"):
        dic = OrderedDict()
        for key in sorted(prop.bl_rna.properties.keys()):
            if key == "rna_type":
                continue
            dic[key] = encode_custom_prop(getattr(prop, key))
        return dic
    # "primitive"
    elif (type(prop) == int or
             type(prop) == float or
             type(prop) == bool or
             type(prop) == str):
        return prop
    # "array"
    else:
        return [encode_custom_prop(i) for i in prop]

def get_rotation_quat(obj):
    if obj.rotation_mode == "AXIS_ANGLE":
        angle = obj.rotation_axis_angle[0]
        axis = obj.rotation_axis_angle[1:4]
        quat = mathutils.Quaternion(axis, angle)
    elif obj.rotation_mode == "QUATERNION":
        quat = obj.rotation_quaternion
    else:
        quat = obj.rotation_euler.to_quaternion()

    # NOTE: there can be set a non-normalized quaternion in Blender
    quat.normalize()
    return quat

def store_vehicle_integrity(obj_data):
    vehicle_settings = obj_data["b4w_vehicle_settings"]
    if vehicle_settings:
        if vehicle_settings["name"] not in _vehicle_integrity:
            _vehicle_integrity[vehicle_settings["name"]] = {
                "hull": None,
                "chassis": None,
                "bob": None,
                "other": None,
                "fl_wheel": None,
                "fr_wheel": None,
                "bl_wheel": None,
                "br_wheel": None,
                "steering_wheel": None,
                "speedometer": None,
                "tachometer": None
            }

        if vehicle_settings["part"] == "HULL":
            _vehicle_integrity[vehicle_settings["name"]]["hull"] = obj_data
        elif vehicle_settings["part"] == "CHASSIS":
            _vehicle_integrity[vehicle_settings["name"]]["chassis"] = obj_data
        elif vehicle_settings["part"] == "BOB":
            _vehicle_integrity[vehicle_settings["name"]]["bob"] = obj_data
        elif vehicle_settings["part"] == "WHEEL_FRONT_LEFT":
            _vehicle_integrity[vehicle_settings["name"]]["fl_wheel"] = obj_data
        elif vehicle_settings["part"] == "WHEEL_FRONT_RIGHT":
            _vehicle_integrity[vehicle_settings["name"]]["fr_wheel"] = obj_data
        elif vehicle_settings["part"] == "WHEEL_BACK_LEFT":
            _vehicle_integrity[vehicle_settings["name"]]["bl_wheel"] = obj_data
        elif vehicle_settings["part"] == "WHEEL_BACK_RIGHT":
            _vehicle_integrity[vehicle_settings["name"]]["br_wheel"] = obj_data
        elif vehicle_settings["part"] == "STEERING_WHEEL":
            _vehicle_integrity[vehicle_settings["name"]]["steering_wheel"] = obj_data
        elif vehicle_settings["part"] == "SPEEDOMETER":
            _vehicle_integrity[vehicle_settings["name"]]["speedometer"] = obj_data
        elif vehicle_settings["part"] == "TACHOMETER":
            _vehicle_integrity[vehicle_settings["name"]]["tachometer"] = obj_data
        else:
            _vehicle_integrity[vehicle_settings["name"]]["other"] = obj_data

def process_object_game_settings(obj_data, obj):
    game = obj.game

    dct = obj_data["game"] = OrderedDict()
    dct["physics_type"] = game.physics_type
    dct["use_ghost"] = game.use_ghost
    dct["use_sleep"] = game.use_sleep
    dct["mass"] = round_num(game.mass, 3)
    dct["velocity_min"] = round_num(game.velocity_min, 3)
    dct["velocity_max"] = round_num(game.velocity_max, 3)
    dct["damping"] = round_num(game.damping, 3)
    dct["rotation_damping"] = round_num(game.rotation_damping, 3)

    dct["lock_location_x"] = game.lock_location_x
    dct["lock_location_y"] = game.lock_location_y
    dct["lock_location_z"] = game.lock_location_z
    dct["lock_rotation_x"] = game.lock_rotation_x
    dct["lock_rotation_y"] = game.lock_rotation_y
    dct["lock_rotation_z"] = game.lock_rotation_z
    dct["collision_margin"] = game.collision_margin
    dct["collision_group"] = process_mask(game.collision_group)
    dct["collision_mask"] = process_mask(game.collision_mask)

    dct["use_collision_bounds"] = game.use_collision_bounds
    dct["collision_bounds_type"] = game.collision_bounds_type
    dct["use_collision_compound"] = game.use_collision_compound

def process_mask(bin_list):
    """Convert list of binaries to integer mask"""
    mask = 0
    for i in range(len(bin_list)):
        mask += int(bin_list[i]) * (2**i)

    return mask

# 3
def process_object_pose(obj_data, obj, pose):
    """export current pose"""

    obj_data["pose"] = None
    if pose:
        obj_data["pose"] = OrderedDict()
        obj_data["pose"]["bones"] = []

        pose_bones = pose.bones
        for pose_bone in pose_bones:

            pose_bone_data = OrderedDict()
            pose_bone_data["name"] = pose_bone.name

            # instead of link just provide index in armature
            pose_bone_data["bone"] = obj.data.bones.values().index(pose_bone.bone)

            # parent-child relationships
            parent_recursive = pose_bone.parent_recursive
            parent_recursive_indices = []

            parent_recursive_indices = [pose_bones.values().index(item) \
                    for item in parent_recursive]
            parent_recursive_indices = round_iterable(parent_recursive_indices)
            pose_bone_data["parent_recursive"] = parent_recursive_indices

            # MATH
            # L = armature bone "matrix_local"
            # B = pose bone "matrix_basis"
            # result = L * B * Li
            # skinned vertex = vertex * result

            # AXES CONVERTION
            # blender x - right, y - forward, z - up
            # opengl x - right, y - up, z - backward

            # R = mathutils.Matrix.Rotation(-math.pi / 2, 4, "X")
            # result = R * result * Ri = R * L * B * Li * Ri
            # each component can be separately converted because
            # R * L * B * Li * Ri = R * L * Ri * R * B * Ri * R * Li * Ri =
            # = (R * L * Ri) * (R * B * Ri) * (R * L * Ri)i
            # the latter because (A * B * C)i = (B * C)i * Ai = Ci * Bi * Ai

            # matrix_basis is pose transform relative to rest position
            # normally we get it from pose_bone.matrix_basis
            # but in order to bake inverse kinematics pose we
            # calculate "pseudo" matrix_basis from matrix_channel
            # which is pose accumulated through hierarchy
            # e.g. channel1 = rest0 * pose0 * rest0.inverted()
            #               * rest1 * pose1 * rest1.inverted()
            mch = pose_bone.matrix_channel

            # we need "own" matrix_channel component so remove parent if any
            parent = pose_bone.parent
            if parent:
                mch_par = parent.matrix_channel
                mch = mch_par.inverted_safe() * mch

            # bone matrix in rest position (see armature section)
            ml = pose_bone.bone.matrix_local

            # finally get "pseudo" (i.e. baked) matrix basis by reverse operation
            mb = ml.inverted_safe() * mch * ml

            # flatten
            mb = matrix4x4_to_list(mb)
            pose_bone_data["matrix_basis"] = round_iterable(mb, 5)

            comp_name = "bone: \"" + pose_bone.name + "\" in object: \"" + obj.name + "\""
            pose_bone_data["constraints"] = process_constraints(pose_bone, False)

            obj_data["pose"]["bones"].append(pose_bone_data)

def process_object_nla(nla_tracks_data, nla_tracks, actions):
    for track in nla_tracks:
        track_data = OrderedDict()
        track_data["name"] = track.name
        track_data["strips"] = []

        for strip in track.strips:
            if strip.mute:
                continue

            # can be a speaker converted to an empty object
            curr_obj = _curr_stack["object"][-1]
            if (strip.type == "SOUND" and (curr_obj.type != "SPEAKER"
                    or curr_obj.data.sound is None)):
                continue

            strip_data = OrderedDict()
            strip_data["name"] = strip.name
            strip_data["type"] = strip.type
            strip_data["frame_start"] = round_num(strip.frame_start, 3)
            strip_data["frame_end"] = round_num(strip.frame_end, 3)
            strip_data["use_reverse"] = strip.use_reverse
            strip_data["scale"] = strip.scale
            strip_data["repeat"] = strip.repeat
            strip_data["use_animated_time_cyclic"] \
                    = strip.use_animated_time_cyclic

            action = select_action(strip.action, actions)
            if action:
                strip_data["action"] = gen_uuid_dict(action)
            else:
                strip_data["action"] = None

            strip_data["action_frame_start"] = round_num(strip.action_frame_start, 3)
            strip_data["action_frame_end"] = round_num(strip.action_frame_end, 3)

            track_data["strips"].append(strip_data)

        nla_tracks_data.append(track_data)

def select_action(base_action, actions):
    if not base_action:
        return base_action

    # baked itself
    if anim_baker.has_baked_suffix(base_action):
        return base_action

    # search baked
    for action in actions:
        if action.name == (base_action.name + anim_baker.BAKED_SUFFIX):
            return action

    # not found
    return base_action

def process_object_force_field(obj_data, field):
    if field and field.type == 'WIND':
        dct = obj_data["field"] = OrderedDict()
        dct["type"] = field.type
        dct["strength"] = round_num(field.strength, 3)
        dct["seed"] = field.seed
    else:
        obj_data["field"] = None

def process_group(group, for_particles=False):

    if for_particles:
        prop = "hair_exp_done"
        postfix = prop
    else:
        prop = "export_done"
        postfix = ""

    if prop in group and group[prop]:
        return gen_uuid_dict(group, postfix)

    group[prop] = True

    group_data = OrderedDict()
    group_data["name"] = group.name
    if for_particles:
        group_data["name"] = group.name + SUF_HAIR_DUPLI
    else:
        group_data["name"] = group.name
    group_data["uuid"] = gen_uuid(group, postfix)

    # process group links
    group_data["objects"] = []
    for obj in group.objects:

        if for_particles:
            is_valid = particle_object_is_valid(obj)
        else:
            is_valid = object_is_valid(obj)

        if do_export(obj) and is_valid:
            group_data["objects"].append(process_object(obj, is_hair=for_particles))
        elif for_particles:
            err("Particle system error for object \"" + _curr_stack["object"][-1].name + \
                    "\". Invalid dupli object \"" + obj.name + "\".")

    _export_data["groups"].append(group_data)
    _export_uuid_cache[group_data["uuid"]] = group_data
    _bpy_uuid_cache[group_data["uuid"]] = group

    return OrderedDict({ "uuid": group_data["uuid"] }) 

def process_camera(camera):
    if "export_done" in camera and camera["export_done"]:
        return
    camera["export_done"] = True

    cam_data = OrderedDict()

    cam_data["name"] = camera.name
    cam_data["uuid"] = gen_uuid(camera)

    if camera.type == "PANO":
        # panoramic type
        warn("The \"" + camera.name + "\" camera has unsupported PANORAMIC type. " +
                "Changed to PERSPECTIVE type.")
        cam_data["type"] = "PERSP"
    else:
        cam_data["type"] = camera.type

    cam_data["angle"] = round_num(camera.angle, 6)
    cam_data["angle_y"] = round_num(camera.angle_y, 6)
    cam_data["sensor_fit"] = camera.sensor_fit
    cam_data["ortho_scale"] = round_num(camera.ortho_scale, 3)
    cam_data["clip_start"] = round_num(camera.clip_start, 3)
    cam_data["clip_end"] = round_num(camera.clip_end, 3)
    cam_data["dof_distance"] = round_num(camera.dof_distance, 3)
    cam_data["b4w_dof_front_start"] = round_num(camera.b4w_dof_front_start, 3)
    cam_data["b4w_dof_front_end"] = round_num(camera.b4w_dof_front_end, 3)
    cam_data["b4w_dof_rear_start"] = round_num(camera.b4w_dof_rear_start, 3)
    cam_data["b4w_dof_rear_end"] = round_num(camera.b4w_dof_rear_end, 3)
    cam_data["b4w_dof_power"] = round_num(camera.b4w_dof_power, 2)
    cam_data["b4w_dof_bokeh"] = camera.b4w_dof_bokeh
    cam_data["b4w_dof_bokeh_intensity"] = round_num(camera.b4w_dof_bokeh_intensity, 2)
    cam_data["b4w_dof_foreground_blur"] = camera.b4w_dof_foreground_blur
    cam_data["b4w_move_style"] = camera.b4w_move_style

    cam_data["b4w_hover_zero_level"] = camera.b4w_hover_zero_level

    cam_data["b4w_trans_velocity"] = round_num(camera.b4w_trans_velocity, 3)
    cam_data["b4w_rot_velocity"] = round_num(camera.b4w_rot_velocity, 3)
    cam_data["b4w_zoom_velocity"] = round_num(camera.b4w_zoom_velocity, 3)

    cam_data["b4w_use_target_distance_limits"] = camera.b4w_use_target_distance_limits
    cam_data["b4w_distance_min"] = round_num(camera.b4w_distance_min, 3)
    cam_data["b4w_distance_max"] = round_num(camera.b4w_distance_max, 3)

    # NOTE: don't round the limits to maintain correspondence between 
    # how they are displayed in Blender and the behavior in the engine
    cam_data["b4w_use_horizontal_clamping"] = camera.b4w_use_horizontal_clamping
    cam_data["b4w_rotation_left_limit"] = camera.b4w_rotation_left_limit
    cam_data["b4w_rotation_right_limit"] = camera.b4w_rotation_right_limit
    cam_data["b4w_horizontal_clamping_type"] = camera.b4w_horizontal_clamping_type

    cam_data["b4w_use_vertical_clamping"] = camera.b4w_use_vertical_clamping
    cam_data["b4w_rotation_down_limit"] = camera.b4w_rotation_down_limit
    cam_data["b4w_rotation_up_limit"] = camera.b4w_rotation_up_limit
    cam_data["b4w_vertical_clamping_type"] = camera.b4w_vertical_clamping_type

    cam_data["b4w_horizontal_translation_min"] \
            = round_num(camera.b4w_horizontal_translation_min, 3)
    cam_data["b4w_horizontal_translation_max"] \
            = round_num(camera.b4w_horizontal_translation_max, 3)

    cam_data["b4w_vertical_translation_min"] \
            = round_num(camera.b4w_vertical_translation_min , 3)
    cam_data["b4w_vertical_translation_max"] \
            = round_num(camera.b4w_vertical_translation_max , 3)

    cam_data["b4w_use_zooming"] = camera.b4w_use_zooming
    cam_data["b4w_hover_angle_min"] = camera.b4w_hover_angle_min
    cam_data["b4w_hover_angle_max"] = camera.b4w_hover_angle_max

    cam_data["b4w_enable_hover_hor_rotation"] \
            = camera.b4w_enable_hover_hor_rotation

    cam_data["b4w_use_panning"] = camera.b4w_use_panning

    cam_data["b4w_use_pivot_limits"] = camera.b4w_use_pivot_limits
    cam_data["b4w_pivot_z_min"] = camera.b4w_pivot_z_min
    cam_data["b4w_pivot_z_max"] = camera.b4w_pivot_z_max

    # translate to b4w coordinates
    b4w_target = [camera.b4w_target[0], camera.b4w_target[1], \
            camera.b4w_target[2]]
    cam_data["b4w_target"] = round_iterable(b4w_target, 3)

    # process camera links
    obj = camera.dof_object
    if obj and do_export(obj) and object_is_valid(obj):
        cam_data["dof_object"] = process_object(obj)
    else:
        cam_data["dof_object"] = None

    _export_data["cameras"].append(cam_data)
    _export_uuid_cache[cam_data["uuid"]] = cam_data
    _bpy_uuid_cache[cam_data["uuid"]] = camera

def process_curve(curve):
    if "export_done" in curve and curve["export_done"]:
        return
    curve["export_done"] = True

    curve_data = OrderedDict()

    curve_data["name"] = curve.name
    curve_data["uuid"] = gen_uuid(curve)
    curve_data["dimensions"] = curve.dimensions

    curve_data["splines"] = []

    for spline in curve.splines:
        spline_data = OrderedDict()

        spline_data["bezier_points"] = []

        spline_data["use_bezier_u"] = spline.use_bezier_u
        spline_data["use_cyclic_u"] = spline.use_cyclic_u
        spline_data["use_endpoint_u"] = spline.use_endpoint_u
        spline_data["order_u"] = spline.order_u

        points = []
        for point in spline.points:
            points.append(point.co[0])
            points.append(point.co[1])
            points.append(point.co[2])
            points.append(point.tilt)
            points.append(point.co[3])

        spline_data["points"] = round_iterable(points, 5)
        spline_data["type"] = spline.type

        curve_data["splines"].append(spline_data)

    _export_data["curves"].append(curve_data)
    _export_uuid_cache[curve_data["uuid"]] = curve_data
    _bpy_uuid_cache[curve_data["uuid"]] = curve

def process_lamp(lamp):
    if "export_done" in lamp and lamp["export_done"]:
        return
    lamp["export_done"] = True

    lamp_data = OrderedDict()

    process_animation_data(lamp_data, lamp, bpy.data.actions)

    lamp_data["name"] = lamp.name
    lamp_data["uuid"] = gen_uuid(lamp)

    if lamp.type == "AREA":
        lamp_data["type"] = "SUN"
        err("The lamp object \"" + lamp.name + "\" has unsupported AREA type. Changed to SUN.")
    else:
        lamp_data["type"] = lamp.type


    lamp_data["energy"] = round_num(lamp.energy, 3)
    lamp_data["distance"] = round_num(lamp.distance, 3)

    lamp_data["use_diffuse"] = lamp.use_diffuse
    lamp_data["use_specular"] = lamp.use_specular

    if (lamp.type == "POINT" or lamp.type == "SPOT"):
        lamp_data["falloff_type"] = lamp.falloff_type
        lamp_data["clip_start"] = lamp.shadow_buffer_clip_start
        lamp_data["clip_end"] = lamp.shadow_buffer_clip_end
        lamp_data["use_sphere"] = lamp.use_sphere
    else:
        lamp_data["falloff_type"] = None
        lamp_data["clip_start"] = 0.1
        lamp_data["clip_end"] = 30.0

    if (lamp.type == "SPOT"):
        lamp_data["spot_size"] = round_num(lamp.spot_size, 5)
        lamp_data["spot_blend"] = round_num(lamp.spot_blend, 3)
    else:
        lamp_data["spot_size"] = None
        lamp_data["spot_blend"] = None

    lamp_data["b4w_generate_shadows"] = lamp.use_shadow
    lamp_data["b4w_dynamic_intensity"] = lamp.b4w_dynamic_intensity
    lamp_data["color"] = round_iterable(lamp.color, 4)

    _export_data["lamps"].append(lamp_data)
    _export_uuid_cache[lamp_data["uuid"]] = lamp_data
    _bpy_uuid_cache[lamp_data["uuid"]] = lamp

def process_material(material, uuid = None):
    global _curr_stack
    _curr_stack["material"].append(material)

    mat_data = OrderedDict()

    mat_data["use_orco_tex_coord"] = False
    mat_data["name"] = material.name

    mat_data["use_nodes"] = material.use_nodes

    mat_data["diffuse_color"] = round_iterable(material.diffuse_color, 4)
    mat_data["diffuse_shader"] = material.diffuse_shader
    mat_data["roughness"] = round_num(material.roughness, 3)
    mat_data["diffuse_fresnel"] = round_num(material.diffuse_fresnel, 3)
    mat_data["diffuse_fresnel_factor"] \
            = round_num(material.diffuse_fresnel_factor, 3)
    mat_data["darkness"] = round_num(material.darkness, 3)
    mat_data["diffuse_toon_size"] = round_num(material.diffuse_toon_size, 3)
    mat_data["diffuse_toon_smooth"] = round_num(material.diffuse_toon_smooth, 3)
    mat_data["diffuse_intensity"] = round_num(material.diffuse_intensity, 3)
    mat_data["alpha"] = round_num(material.alpha, 4)
    mat_data["specular_alpha"] = round_num(material.specular_alpha, 4)

    raytrace_transparency = material.raytrace_transparency
    dct = mat_data["raytrace_transparency"] = OrderedDict()
    dct["fresnel"] = round_num(raytrace_transparency.fresnel, 4)
    dct["fresnel_factor"] = round_num(raytrace_transparency.fresnel_factor, 4)

    raytrace_mirror = material.raytrace_mirror
    dct = mat_data["raytrace_mirror"] = OrderedDict()
    dct["reflect_factor"] = round_num(raytrace_mirror.reflect_factor, 4)
    dct["fresnel"] = round_num(raytrace_mirror.fresnel, 4)
    dct["fresnel_factor"] = round_num(raytrace_mirror.fresnel_factor, 4)

    mat_data["specular_color"] = round_iterable(material.specular_color, 4)
    mat_data["specular_intensity"] = round_num(material.specular_intensity, 4)
    mat_data["specular_shader"] = material.specular_shader
    mat_data["specular_hardness"] = round_num(material.specular_hardness, 4)
    mat_data["specular_ior"] = round_num(material.specular_ior, 4)
    mat_data["specular_slope"] = round_num(material.specular_slope, 4)
    mat_data["specular_toon_size"] = round_num(material.specular_toon_size, 4)
    mat_data["specular_toon_smooth"] = round_num(material.specular_toon_smooth, 4)
    mat_data["emit"] = round_num(material.emit, 3)
    mat_data["ambient"] = round_num(material.ambient, 3)
    mat_data["use_vertex_color_paint"] = material.use_vertex_color_paint

    if mat_data["use_vertex_color_paint"] and not _curr_stack["data"][-1].vertex_colors:
        mat_data["use_vertex_color_paint"] = False
        err("Incomplete mesh \"" + _curr_stack["data"][-1].name +
            "\" Material settings require vertex colors.")

    # export custom properties
    mat_data["b4w_water"] = material.b4w_water
    mat_data["b4w_water_shore_smoothing"] = material.b4w_water_shore_smoothing
    mat_data["b4w_water_absorb_factor"] \
            = round_num(material.b4w_water_absorb_factor, 3)
    mat_data["b4w_water_dynamic"] = material.b4w_water_dynamic
    mat_data["b4w_waves_height"] = round_num(material.b4w_waves_height, 3)
    mat_data["b4w_waves_length"] = round_num(material.b4w_waves_length, 3)
    mat_data["b4w_generated_mesh"] = material.b4w_generated_mesh
    mat_data["b4w_water_num_cascads"] \
            = round_num(material.b4w_water_num_cascads, 1)
    mat_data["b4w_water_subdivs"] = round_num(material.b4w_water_subdivs, 1)
    mat_data["b4w_water_detailed_dist"] \
            = round_num(material.b4w_water_detailed_dist, 1)
    mat_data["b4w_water_fog_color"] \
            = round_iterable(material.b4w_water_fog_color, 4)
    mat_data["b4w_water_fog_density"] \
            = round_num(material.b4w_water_fog_density, 4)
    mat_data["b4w_foam_factor"] = round_num(material.b4w_foam_factor, 3)
    mat_data["b4w_shallow_water_col"] \
            = round_iterable(material.b4w_shallow_water_col, 4)
    mat_data["b4w_shore_water_col"] \
            = round_iterable(material.b4w_shore_water_col, 4)
    mat_data["b4w_shallow_water_col_fac"] \
            = round_num(material.b4w_shallow_water_col_fac, 3)
    mat_data["b4w_shore_water_col_fac"] \
            = round_num(material.b4w_shore_water_col_fac, 3)

    mat_data["b4w_water_dst_noise_scale0"] \
            = round_num(material.b4w_water_dst_noise_scale0, 3)
    mat_data["b4w_water_dst_noise_scale1"] \
            = round_num(material.b4w_water_dst_noise_scale1, 3)
    mat_data["b4w_water_dst_noise_freq0"] \
            = round_num(material.b4w_water_dst_noise_freq0, 3)
    mat_data["b4w_water_dst_noise_freq1"] \
            = round_num(material.b4w_water_dst_noise_freq1, 3)
    mat_data["b4w_water_dir_min_shore_fac"] \
            = round_num(material.b4w_water_dir_min_shore_fac, 3)
    mat_data["b4w_water_dir_freq"] = round_num(material.b4w_water_dir_freq, 3)
    mat_data["b4w_water_dir_noise_scale"] \
            = round_num(material.b4w_water_dir_noise_scale, 3)
    mat_data["b4w_water_dir_noise_freq"] \
            = round_num(material.b4w_water_dir_noise_freq, 3)
    mat_data["b4w_water_dir_min_noise_fac"] \
            = round_num(material.b4w_water_dir_min_noise_fac, 3)
    mat_data["b4w_water_dst_min_fac"] \
            = round_num(material.b4w_water_dst_min_fac, 3)
    mat_data["b4w_water_waves_hor_fac"] \
            = round_num(material.b4w_water_waves_hor_fac, 3)
    mat_data["b4w_water_sss_strength"] \
            = round_num(material.b4w_water_sss_strength, 3)
    mat_data["b4w_water_sss_width"] = round_num(material.b4w_water_sss_width, 3)
    mat_data["b4w_water_norm_uv_velocity"] = round_num(material.b4w_water_norm_uv_velocity, 3)
    mat_data["b4w_water_enable_caust"] = material.b4w_water_enable_caust
    mat_data["b4w_water_caust_scale"] = round_num(material.b4w_water_caust_scale, 3)
    mat_data["b4w_water_caust_brightness"] = round_num(material.b4w_water_caust_brightness, 3)

    mat_data["b4w_terrain"] = material.b4w_terrain
    mat_data["b4w_dynamic_grass_size"] = material.b4w_dynamic_grass_size
    mat_data["b4w_dynamic_grass_color"] = material.b4w_dynamic_grass_color

    # check dynamic grass vertex colors
    if material.b4w_terrain:
        if not check_vertex_color_empty(_curr_stack["data"][-1], mat_data["b4w_dynamic_grass_size"]) \
                or not check_vertex_color_empty(_curr_stack["data"][-1], mat_data["b4w_dynamic_grass_color"]):
            err("Incomplete mesh \"" +_curr_stack["data"][-1].name + 
                "\" Dynamic grass vertex colors required by material settings.")
            mat_data["b4w_terrain"] = False

    mat_data["b4w_do_not_render"] = material.b4w_do_not_render
    use_textures = check_available_textures(material)
    if material.b4w_lens_flares and not use_textures:
        mat_data["b4w_lens_flares"] = False
        warn("Unsupported texture type or texture is missing for Lens Flare material \""
                + material.name + "\".")
    else:
        mat_data["b4w_lens_flares"] = material.b4w_lens_flares
    mat_data["b4w_collision"] = material.b4w_collision
    mat_data["b4w_use_ghost"] = material.b4w_use_ghost
    mat_data["b4w_collision_id"] = material.b4w_collision_id
    mat_data["b4w_collision_margin"] = material.b4w_collision_margin
    mat_data["b4w_collision_group"] = process_mask(material.b4w_collision_group)
    mat_data["b4w_collision_mask"] = process_mask(material.b4w_collision_mask)
    mat_data["b4w_double_sided_lighting"] = material.b4w_double_sided_lighting
    mat_data["b4w_wettable"] = material.b4w_wettable
    mat_data["b4w_refractive"] = material.b4w_refractive
    mat_data["b4w_refr_bump"] = material.b4w_refr_bump

    mat_data["b4w_render_above_all"] = material.b4w_render_above_all

    process_material_physics(mat_data, material)

    mat_data["type"] = material.type

    mat_halo = material.halo

    mat_data["b4w_halo_sky_stars"] = material.b4w_halo_sky_stars
    mat_data["b4w_halo_stars_blend_height"] \
            = material.b4w_halo_stars_blend_height
    mat_data["b4w_halo_stars_min_height"] \
            = material.b4w_halo_stars_min_height

    dct = mat_data["halo"] = OrderedDict()
    dct["hardness"] = mat_halo.hardness
    dct["size"] = round_num(mat_halo.size, 3)

    # NOTE: Halo rings color in blender 2.68 is equal to mirror color
    dct["b4w_halo_rings_color"] = round_iterable(material.mirror_color, 4)
    # NOTE: Halo lines color in blender 2.68 is equal to specular color
    dct["b4w_halo_lines_color"] = round_iterable(material.specular_color, 4)

    dct["ring_count"] =  mat_halo.ring_count if mat_halo.use_ring else 0
    dct["line_count"] =  mat_halo.line_count if mat_halo.use_lines else 0
    dct["star_tip_count"] \
            =  mat_halo.star_tip_count if mat_halo.use_star else 0

    mat_data["use_transparency"] = material.use_transparency
    mat_data["use_shadeless"] = material.use_shadeless
    mat_data["use_tangent_shading"] = check_material_tangent_shading(material)
    mat_data["pass_index"] = material.pass_index

    mat_data["offset_z"] = round_num(material.offset_z, 2)

    game_settings = material.game_settings
    dct = mat_data["game_settings"] = OrderedDict()
    dct["alpha_blend"] = game_settings.alpha_blend
    dct["use_backface_culling"] = game_settings.use_backface_culling
    mat_data["uv_vc_key"] = ""
    # process material links
    if mat_data["use_nodes"]:
        process_node_tree(mat_data, material, False)
    else:
        mat_data["node_tree"] = None
    process_material_texture_slots(mat_data, material)

    if uuid is None:
        mat_data["uuid"] = gen_uuid(material, mat_data["uv_vc_key"])
    else:
        mat_data["uuid"] = uuid

    need_append = (not (mat_data["uuid"] in _export_uuid_cache) 
        or uuid is not None)

    if need_append:
        mat_data["source_uuid"] = gen_uuid(material)
        material["export_done"] = True
        _export_data["materials"].append(mat_data)
        _export_uuid_cache[mat_data["uuid"]] = mat_data
        _bpy_uuid_cache[mat_data["uuid"]] = material
    _curr_stack["material"].pop()

    return mat_data["uuid"]

def process_material_physics(mat_data, material):
    phy = material.physics

    dct = mat_data["physics"] = OrderedDict()
    dct["friction"] = round_num(phy.friction, 3)
    dct["elasticity"] = round_num(phy.elasticity, 3)

def check_available_textures(material):
    for slot in material.texture_slots:
        if slot and slot.use and slot.texture and not slot.texture.b4w_do_not_export:
            if slot.texture.type == "IMAGE":
                return True
    return False


def process_texture(texture, uuid = None):
    if "export_done" in texture and texture["export_done"] and uuid is None:
        return
    texture["export_done"] = True

    global _curr_stack
    _curr_stack["texture"].append(texture)

    tex_data = OrderedDict()

    tex_data["name"] = texture.name
    if uuid:
        tex_data["uuid"] = uuid
    else:
        tex_data["uuid"] = gen_uuid(texture)
    tex_data["type"] = texture.type

    tex_data["b4w_source_type"] = texture.b4w_source_type
    tex_data["b4w_source_id"] = texture.b4w_source_id
    tex_data["b4w_source_size"] = texture.b4w_source_size
    tex_data["b4w_enable_canvas_mipmapping"] = texture.b4w_enable_canvas_mipmapping

    if hasattr(texture, "extension"):
        tex_data["extension"] = texture.extension
    else:
        tex_data["extension"] = None

    if texture.type == "NONE":
        if texture.b4w_source_type == "SCENE":
            _rendered_scenes.append(texture)
        tex_data["extension"] = texture.b4w_extension

    tex_data["b4w_use_map_parallax"] = texture.b4w_use_map_parallax
    tex_data["b4w_parallax_scale"] = round_num(texture.b4w_parallax_scale, 3)
    tex_data["b4w_parallax_steps"] = round_num(texture.b4w_parallax_steps, 1)
    tex_data["b4w_parallax_lod_dist"] = round_num(texture.b4w_parallax_lod_dist, 3)
    tex_data["b4w_water_foam"] = texture.b4w_water_foam
    tex_data["b4w_foam_uv_freq"] = round_iterable(texture.b4w_foam_uv_freq, 3)

    tex_data["b4w_foam_uv_magnitude"] \
            = round_iterable(texture.b4w_foam_uv_magnitude, 3)
    tex_data["b4w_shore_dist_map"] = texture.b4w_shore_dist_map
    if texture.b4w_enable_tex_af:
        tex_data["b4w_anisotropic_filtering"] = texture.b4w_anisotropic_filtering
    else:
        tex_data["b4w_anisotropic_filtering"] = "OFF"
    tex_data["b4w_shore_boundings"] \
            = round_iterable(texture.b4w_shore_boundings, 3)
    tex_data["b4w_max_shore_dist"] = round_num(texture.b4w_max_shore_dist, 3)

    tex_data["b4w_disable_compression"] = texture.b4w_disable_compression
    tex_data["b4w_use_as_skydome"] = False
    tex_data["b4w_use_as_environment_lighting"] = False
    if texture.b4w_use_sky == "SKYDOME" or texture.b4w_use_sky == "BOTH":
        tex_data["b4w_use_as_skydome"] = True
    if texture.b4w_use_sky == "ENVIRONMENT_LIGHTING" or texture.b4w_use_sky == "BOTH":
        tex_data["b4w_use_as_environment_lighting"] = True

    # process texture links
    if hasattr(texture, "image"):
        if texture.image:
            image = texture.image
            if do_export(image):
                tex_data["image"] = gen_uuid_dict(image)
                try:
                    process_image(image)
                except PathError as ex:
                    err(str(ex))
                    tex_data["image"] = None
        else:
            tex_data["image"] = None
            warn("Texture \"" + texture.name + "\" has no image.")

    if (texture.type == "IMAGE" and texture.image and texture.image.source == "MOVIE"):
        tex_data["frame_duration"] = texture.image_user.frame_duration
        tex_data["frame_offset"] = texture.image_user.frame_offset
        tex_data["frame_start"] = texture.image_user.frame_start
        tex_data["use_auto_refresh"] = texture.image_user.use_auto_refresh
        tex_data["use_cyclic"] = texture.image_user.use_cyclic
        ctx = bpy.context.copy()
        ctx["edit_image"] = texture.image
        ctx["edit_image_user"] = texture.image_user
        bpy.ops.image.match_movie_length(ctx)
        tex_data["movie_length"] = texture.image_user.frame_duration
        tex_data["b4w_nla_video"] = texture.b4w_nla_video
        texture.image_user.frame_duration = tex_data["frame_duration"]
    else:
        tex_data["frame_duration"] = 0
        tex_data["frame_offset"] = 0
        tex_data["frame_start"] = 0
        tex_data["use_auto_refresh"] = False
        tex_data["use_cyclic"] = False
        tex_data["movie_length"] = 0
        tex_data["b4w_nla_video"] = False


    if texture.type == 'VORONOI':
        tex_data["noise_intensity"] = round_num(texture.noise_intensity, 3)
        tex_data["noise_scale"] = round_num(texture.noise_scale, 2)
    else:
        tex_data["noise_intensity"] = None
        tex_data["noise_scale"] = None

    use_ramp = texture.use_color_ramp
    tex_data["use_color_ramp"] = use_ramp

    if use_ramp:
        process_color_ramp(tex_data, texture.color_ramp)
    else:
        tex_data["color_ramp"] = None

    _export_data["textures"].append(tex_data)

    _export_uuid_cache[tex_data["uuid"]] = tex_data
    _bpy_uuid_cache[tex_data["uuid"]] = texture
    _curr_stack["texture"].pop()

def process_color_ramp(data, ramp):
    data["color_ramp"] = OrderedDict()
    data["color_ramp"]["elements"] = []

    for el in ramp.elements:
        el_data = OrderedDict()
        el_data["position"] = round_num(el.position, 3)
        el_data["color"] = round_iterable(el.color, 3)
        data["color_ramp"]["elements"].append(el_data)

def process_image(image):
    if "export_done" in image and image["export_done"]:
        return
    image["export_done"] = True

    image_data = OrderedDict()

    image_data["name"] = image.name
    image_data["uuid"] = gen_uuid(image)

    ext = os.path.splitext(image.filepath)[1]
    # NOTE: fix image path without extension, e.g. custom image created in
    # Blender and packed as PNG
    ext = ext if ext != "" else "." + image.file_format.lower()
    process_media_path(image, image_data, ext, _unique_packed_images)

    image_data["size"] = list(image.size)
    image_data["source"] = image.source
    image_data["colorspace_settings_name"] = image.colorspace_settings.name
    _export_data["images"].append(image_data)
    _export_uuid_cache[image_data["uuid"]] = image_data
    _bpy_uuid_cache[image_data["uuid"]] = image

def process_media_path(bpy_datablock, export_datablock, ext, unique_media_data):
    if bpy_datablock.packed_file is not None:
        data_buffer = bpy_datablock.packed_file.data
        # fix overwriting collision for export/html export
        if _is_html_export:
            data_buffer = bytearray(data_buffer)
            data_buffer.extend(bytes(b"%html_export%"))
        hash_str = hashlib.md5(data_buffer).hexdigest()

        if hash_str not in unique_media_data:
            unique_media_data[hash_str] = []
        unique_media_data[hash_str].append(export_datablock["uuid"])

        pack_filepath = hash_str + ext

        if bpy.data.filepath and _export_filepath is not None:
            export_dir = os.path.split(_export_filepath)[0]
            pack_filepath = os.path.join(export_dir, pack_filepath)
        else:
            pack_filepath = os.path.join(os.getcwd(), pack_filepath)

        pack_filepath = get_json_relative_filepath(pack_filepath)
        export_datablock["filepath"] = pack_filepath
    else:
        export_datablock["filepath"] = get_filepath(bpy_datablock)

def get_filepath(comp):
    path_b = comp.filepath.replace("//", "")

    # path to component relative to BLEND
    if comp.library:
        path_lib = bpy.path.abspath(comp.library.filepath).replace("//", "")
        path_lib_dir = os.path.dirname(path_lib)
        path_b_abs = os.path.join(path_lib_dir, path_b)
        path_b = bpy.path.relpath(path_b_abs).replace("//", "")

    return get_json_relative_filepath(path_b)

def get_json_relative_filepath(path):
    # absolute path to exported JSON
    path_exp = _export_filepath.replace("//", "")
    # absolute path to resource
    path_res = os.path.normpath(os.path.join(\
            os.path.dirname(bpy.data.filepath), path))
    # path to resource relative to JSON
    try:
        path_relative = os.path.relpath(path_res, os.path.dirname(path_exp))
    except ValueError as exp:
        if _is_fast_preview:
            return path_res
        else:
            _file_error = exp
            raise PathError("Loading of resources from different disk is forbidden. " +
                    "Couldn't load " + path_res)
    # clean
    return guard_slashes(os.path.normpath(path_relative))

def process_mesh(mesh, obj_user):
    global _curr_stack
    _curr_stack["data"].append(mesh)

    mesh["export_done"] = True

    # update needed from bmesh introduction (blender >= 2.63)
    # also note change faces -> tessfaces, uv_textures -> tessface_uv_textures
    mesh.update()
    mesh.calc_tessface()

    mesh_data = OrderedDict()
    mesh_data["name"] = mesh.name

    # NOTE: mesh uniqueness
    mat_names = ""
    for slot in obj_user.material_slots:

        if slot.material:
            material = slot.material
        else:
            material = get_default_material()
        
        mat_names += "%" + material.name

    mesh_data["uuid"] = gen_uuid(mesh, mat_names)

    if "export_done" in mesh and mesh["export_done"] and mesh_data["uuid"] in _export_uuid_cache:
        return mesh_data["uuid"]

    # process mesh links
    # faces' material_index'es correspond to
    # blender saves pointers to materials section of root
    # so we will save uuids here
    mesh_data["materials"] = []

    for slot in obj_user.material_slots:

        if slot.material:
            material = slot.material
        else:
            material = get_default_material()

        if do_export(material):

            try:
                mat_data_uuid = process_material(material)
                mesh_data["materials"].append({ "uuid": mat_data_uuid })
            except MaterialError as ex:
                fallback_material = get_fallback_material()
                process_material(fallback_material)

                mesh_data["materials"].append(gen_uuid_dict(fallback_material))
                err(str(ex) + " Material: " + "\"" + _curr_stack["material"][-1].name + "\".")
                _curr_stack["material"].pop()
                _curr_stack["texture"] = []

    # process object's props
    process_mesh_vertex_anim(mesh_data, obj_user)
    process_mesh_vertex_groups(mesh_data, obj_user)

    mesh_data["uv_textures"] = []
    for uv_texture in mesh.uv_textures:
        mesh_data["uv_textures"].append(uv_texture.name)

    active_vc = mesh_get_active_vc(mesh)
    if active_vc:
        mesh_data["active_vcol_name"] = active_vc.name
    else:
        mesh_data["active_vcol_name"] = None

    mesh_data["submeshes"] = []

    obj_ptr = obj_user.as_pointer()
    vertex_animation = bool(obj_user.b4w_loc_export_vertex_anim)
    edited_normals = bool(mesh.use_auto_smooth)
    vertex_groups = bool(obj_user.vertex_groups)
    shape_keys = bool(obj_user.b4w_shape_keys) and "key_blocks" in dir(mesh.shape_keys)

    if obj_user.b4w_apply_scale or obj_auto_apply_scale(obj_user):
        sca_obj = obj_user.scale
        for v_index in range(len(mesh.vertices)):
            vert = mesh.vertices[v_index]
            vert.co.x *= sca_obj[0]
            vert.co.y *= sca_obj[1]
            vert.co.z *= sca_obj[2]

    mesh_ptr = mesh.as_pointer()

    process_mesh_shape_keys(mesh_data, obj_user, mesh)
    if shape_keys:
        if not mesh.shape_keys.use_relative:
            err("Object \"" + obj_user.name + "\" has the mesh with shape keys."
                    + " The property \"Relative\" of mesh has been enabled.")
        obj_copy = obj_user.copy()
        obj_copy.name = obj_user.name + "_SHAPE_KEYS"
        bpy.context.scene.objects.link(obj_copy)
        cur_mesh = obj_copy.data
        obj_copy.data = mesh
        current_active_obj = bpy.context.scene.objects.active
        bpy.context.scene.objects.active = obj_copy
        obj_user["b4w_shape_keys_normals"] = []
        bpy.ops.object.mode_set(mode="EDIT")
        for i in range(0, len(mesh.shape_keys.key_blocks)):
            # update normals coords
            obj_copy.active_shape_key_index = i
            obj_copy.active_shape_key_index = i
            for vert in mesh.vertices:
                new_item = obj_user.b4w_shape_keys_normals.add()
                new_item.normal = vert.normal
        bpy.ops.object.mode_set(mode="OBJECT")
        bpy.context.scene.objects.active = current_active_obj
        mesh.calc_tessface()
        mesh.update()
        obj_copy.data = cur_mesh
        bpy.context.scene.objects.unlink(obj_copy)
        bpy.data.objects.remove(obj_copy)

    # NOTE: using original mesh.materials data for c-export instead of
    # derived mesh_data["materials"]
    if len(mesh_data["materials"]):
        for mat_index in range(len(obj_user.material_slots)):

            if obj_user.material_slots[mat_index].material:
                material = obj_user.material_slots[mat_index].material
            else:
                material = get_default_material()

            has_uv = len(mesh.uv_layers) > 0
            use_tnb_shading = check_material_tangent_shading(material)
            if use_tnb_shading and not has_uv:
                warn("Object:\"" + _curr_stack["object"][-1].name + "\" > " +
                        "Material:\"" + material.name + "\". Material " + 
                        "tangent shading is enabled, but object's mesh has no UV map.")
            if do_export(material):
                if material.type == "HALO":
                    disab_flat = True
                else:
                    disab_flat = False
                submesh_data = export_submesh(mesh, mesh_ptr, obj_user,
                        obj_ptr, mat_index, disab_flat, vertex_animation,
                        edited_normals, shape_keys, vertex_groups, mesh_data, 
                        use_tnb_shading and has_uv)
                mesh_data["submeshes"].append(submesh_data)
    else:
        submesh_data = export_submesh(mesh, mesh_ptr, obj_user, obj_ptr, -1,
                False, vertex_animation, edited_normals, shape_keys, vertex_groups,
                mesh_data, False)
        mesh_data["submeshes"].append(submesh_data)

    if len(mesh_data["materials"]) > 1:
        mesh.calc_tessface()
        bounding_data = b4w_bin.calc_bounding_data(mesh_ptr, -1)
        mesh_data["b4w_boundings"] = OrderedDict()
        process_mesh_boundings(mesh_data["b4w_boundings"], mesh, bounding_data, True)

    mesh_data["is_boundings_overridden"] = mesh.b4w_override_boundings

    _export_data["meshes"].append(mesh_data)
    _export_uuid_cache[mesh_data["uuid"]] = mesh_data
    _bpy_uuid_cache[mesh_data["uuid"]] = mesh
    _curr_stack["data"].pop()

    return mesh_data["uuid"]

def check_material_tangent_shading(material):
    if not material.use_nodes and material.use_tangent_shading:
        return True
    
    if material.use_nodes and check_tangent_shading_r(material):
        return True
    
    return False

def check_tangent_shading_r(source):
    if source.node_tree:
        for node in source.node_tree.nodes:
            if node.type == "MATERIAL" or node.type == "MATERIAL_EXT":
                if node.material and node.material.use_tangent_shading:
                    return True
            elif node.type == "GROUP":
                if check_tangent_shading_r(node):
                    return True
    return False

def process_mesh_boundings(mesh_bdata, mesh, bounding_data, whole_mesh):
    if mesh.b4w_override_boundings:
        bounding_box = mesh.b4w_boundings

        max_x = bounding_box.max_x
        min_x = bounding_box.min_x
        max_y = bounding_box.max_y
        min_y = bounding_box.min_y
        max_z = bounding_box.max_z
        min_z = bounding_box.min_z

        if min_x > max_x:
            min_x, max_x = max_x, min_x
        if min_y > max_y:
            min_y, max_y = max_y, min_y
        if min_z > max_z:
            min_z, max_z = max_z, min_z

        if (max_x != bounding_box.max_x or max_y != bounding_box.max_y
                or max_z != bounding_box.max_z):
            warn("Wrong overridden bounding box for mesh " + mesh.name +
                              ". Check the mesh's bounding box values.")

        dct = mesh_bdata["bb"] = OrderedDict()
        dct["max_x"] = round_num(max_x, 5)
        dct["min_x"] = round_num(min_x, 5)

        dct["max_y"] = round_num(max_y, 5)
        dct["min_y"] = round_num(min_y, 5)

        dct["max_z"] = round_num(max_z, 5)
        dct["min_z"] = round_num(min_z, 5)

        x_width = (max_x - min_x) / 2
        y_width = (max_y - min_y) / 2
        z_width = (max_z - min_z) / 2
        x_cen = (max_x + min_x) / 2
        y_cen = (max_y + min_y) / 2
        z_cen = (max_z + min_z) / 2
        bounding_center = round_iterable([x_cen, y_cen, z_cen], 5)

        # calculate ellipsoid boundings
        sq3 = math.sqrt(3)
        mesh_bdata["be_ax"] = round_iterable([sq3 * x_width, sq3 * y_width, sq3 * z_width], 5)
        mesh_bdata["be_cen"] = bounding_center

        if whole_mesh:
            srad = math.sqrt(x_width * x_width + y_width * y_width + z_width * z_width)
            crad = math.sqrt(x_width * x_width + y_width * y_width)
            mesh_bdata["bs_rad"] = round_num(srad, 5)
            mesh_bdata["bc_rad"] = round_num(crad, 5)

            mesh_bdata["bs_cen"] = bounding_center
            mesh_bdata["bc_cen"] = bounding_center
    else:
        dct = mesh_bdata["bb"] = OrderedDict()
        dct["max_x"] = round_num(bounding_data["max_x"], 5)
        dct["max_y"] = round_num(bounding_data["max_y"], 5)
        dct["max_z"] = round_num(bounding_data["max_z"], 5)
        dct["min_x"] = round_num(bounding_data["min_x"], 5)
        dct["min_y"] = round_num(bounding_data["min_y"], 5)
        dct["min_z"] = round_num(bounding_data["min_z"], 5)

        mesh_bdata["be_ax"] = round_iterable([
            bounding_data["eaxis_x"],
            bounding_data["eaxis_y"],
            bounding_data["eaxis_z"]
        ], 5)
        mesh_bdata["be_cen"] = round_iterable([
            bounding_data["ecen_x"],
            bounding_data["ecen_y"],
            bounding_data["ecen_z"]
        ], 5)
        if whole_mesh:
            mesh_bdata["bs_rad"] \
                    = round_num(bounding_data["srad"], 5)
            mesh_bdata["bc_rad"] \
                    = round_num(bounding_data["crad"], 5)
            mesh_bdata["bs_cen"] = round_iterable([
                bounding_data["scen_x"],
                bounding_data["scen_y"],
                bounding_data["scen_z"]
            ], 5)
            mesh_bdata["bc_cen"] = round_iterable([
                bounding_data["ccen_x"],
                bounding_data["ccen_y"],
                bounding_data["ccen_z"]
            ], 5)
    if whole_mesh:
        dct = mesh_bdata["bb_src"] = OrderedDict()
        dct["max_x"] = round_num(bounding_data["max_x"], 5)
        dct["max_y"] = round_num(bounding_data["max_y"], 5)
        dct["max_z"] = round_num(bounding_data["max_z"], 5)
        dct["min_x"] = round_num(bounding_data["min_x"], 5)
        dct["min_y"] = round_num(bounding_data["min_y"], 5)
        dct["min_z"] = round_num(bounding_data["min_z"], 5)

    dct = mesh_bdata["rbb"] = OrderedDict()
    av_point_len = len(bounding_data["bbrcen"]) // BINARY_FLOAT_SIZE
    dct["rbb_c"] = list(struct.unpack('f' * av_point_len, bounding_data["bbrcen"]))
    rbb_scale_len = len(bounding_data["bbrscale"]) // BINARY_FLOAT_SIZE
    dct["rbb_s"] = list(struct.unpack('f' * rbb_scale_len, bounding_data["bbrscale"]))

    eigenvectors_len = len(bounding_data["eigenvectors"]) // BINARY_FLOAT_SIZE
    e_vecs = list(struct.unpack('f' * eigenvectors_len,
            bounding_data["eigenvectors"]))
    mesh_bdata["caxis_x"] = [e_vecs[0], e_vecs[3], e_vecs[6]]
    mesh_bdata["caxis_y"] = [e_vecs[1], e_vecs[4], e_vecs[7]]
    mesh_bdata["caxis_z"] = [e_vecs[2], e_vecs[5], e_vecs[8]]

def get_mat_uv_usage(mesh, mat_index, obj_user):
    uv_usage = {}

    if mesh.uv_textures:
        # dynamic geometry means potential material inheritance, thus all 
        # UVs should be exported
        if obj_user.b4w_dynamic_geometry:
            for uv in mesh.uv_textures:
                uv_usage[uv.name] = 0b1
        else:
            for uv in mesh.uv_textures:
                uv_usage[uv.name] = 0b0

            mat = obj_user.material_slots[mat_index].material if mat_index >= 0 else None

            # mutually exclusive        
            nodes_usage = uv_nodes_usage(mat)
            stack_usage = uv_stack_tex_usage(mat)

            usage_data = {
                "nodes": nodes_usage,
                "stack": stack_usage
            }

            for usage_type in usage_data:
                for uv_name in usage_data[usage_type]:
                    if uv_name in uv_usage:
                        uv_usage[uv_name] = 0b1

    return uv_usage

def uv_nodes_usage(mat):
    nodes_usage = {}

    if mat is not None and mat.use_nodes and mat.node_tree is not None:
        uv_node_usage_iter(mat.node_tree, nodes_usage)

    return nodes_usage

def uv_node_usage_iter(node_tree, nodes_usage):
    for node in node_tree.nodes:

        uv_name = ""

        if node.type == "GEOMETRY" and node.outputs["UV"].is_linked:
                uv_name = get_uv_layer(_curr_stack["data"][-1], node.uv_layer)
                
        elif node.type == "UVMAP" and node.outputs["UV"].is_linked:
                uv_name = get_uv_layer(_curr_stack["data"][-1],  node.uv_map)

        elif node.type == "TEX_COORD" and node.outputs["UV"].is_linked:
                uv_name = get_uv_layer(_curr_stack["data"][-1],  "")

        elif node.type == "NORMAL_MAP":
            # no need to export a UV map in this case
            # if node.outputs["Normal"].is_linked:
            #     uv_name = get_uv_layer(_curr_stack["data"][-1],  node.uv_map)
            pass

        elif node.type == "GROUP" and node.node_tree is not None:
            uv_node_usage_iter(node.node_tree, nodes_usage)

        if uv_name != "":
            nodes_usage[uv_name] = True

    return nodes_usage

def uv_stack_tex_usage(mat):
    stack_usage = {}

    if mat is not None and not mat.use_nodes:

        slots = mat.texture_slots
        use_slots = mat.use_textures

        for i in range(len(slots)):
            slot = slots[i]
            if (slot is not None and use_slots[i] and slot.texture 
                    and do_export(slot.texture) and slot.texture_coords == "UV"):
                uv_name = get_uv_layer(_curr_stack["data"][-1], slot.uv_layer)

                if uv_name != "":
                    stack_usage[uv_name] = True

    return stack_usage

def get_mat_vc_channel_usage(mesh, mat_index, obj_user):
    vc_channel_usage = {}

    if mesh.vertex_colors:
        # dynamic geometry means potential material inheritance, thus all 
        # channels should be exported
        if obj_user.b4w_dynamic_geometry:
            for vc in mesh.vertex_colors:
                vc_channel_usage[vc.name] = 0b111
        else:
            for vc in mesh.vertex_colors:
                vc_channel_usage[vc.name] = 0b000

            mat = obj_user.material_slots[mat_index].material if mat_index >= 0 else None

            nodes_usage = vc_channel_nodes_usage(mat)
            dyn_grass_usage = vc_channel_dyn_grass_usage(mat)
            bending_usage = vc_channel_bending_usage(obj_user)
            color_paint_usage = vc_channel_color_paint_usage(mesh, mat)
            psys_inheritance_usage = vc_channel_psys_inheritance(obj_user)

            usage_data = {
                "nodes": nodes_usage,
                "dyn_grass": dyn_grass_usage,
                "bending": bending_usage,
                "color_paint": color_paint_usage,
                "psys_inheritance": psys_inheritance_usage
            }

            for usage_type in usage_data:
                for vc_name in usage_data[usage_type]:
                    if vc_name in vc_channel_usage:
                        vc_channel_usage[vc_name] |= usage_data[usage_type][vc_name]

    return vc_channel_usage

def vc_channel_nodes_usage(mat):
    vc_nodes_usage = {}

    if mat is not None and mat.node_tree is not None:
        vc_node_usage_iter(mat.node_tree, vc_nodes_usage)

    return vc_nodes_usage

def vc_node_usage_iter(node_tree, vc_nodes_usage):
    separate_rgb_out = {}
    geometry_vcols = {}

    for link in node_tree.links:
        if link.from_node.bl_idname == "ShaderNodeGeometry" \
                and link.from_socket.identifier == "Vertex Color":
            vcol_name = get_vertex_color(_curr_stack["data"][-1], link.from_node.color_layer)

            if vcol_name:
                to_name = link.to_node.name
                if vcol_name not in geometry_vcols:
                    geometry_vcols[vcol_name] = []
                if to_name not in geometry_vcols[vcol_name]:
                    geometry_vcols[vcol_name].append(to_name)

        elif link.from_node.bl_idname == "ShaderNodeSeparateRGB" \
                and link.from_socket.identifier in "RGB":
            seprgb_name = link.from_node.name
            mask = rgb_channels_to_mask(link.from_socket.identifier)
            if seprgb_name in separate_rgb_out:
                separate_rgb_out[seprgb_name] |= mask
            else:
                separate_rgb_out[seprgb_name] = mask
        elif link.from_node.type == "GROUP" \
                and link.from_node.node_tree is not None:
            vc_node_usage_iter(link.from_node.node_tree, vc_nodes_usage)

    for vcol_name in geometry_vcols:
        for to_name in geometry_vcols[vcol_name]:
            if to_name in separate_rgb_out:
                mask = separate_rgb_out[to_name]
            else:
                mask = rgb_channels_to_mask("RGB")
            if vcol_name in vc_nodes_usage:
                vc_nodes_usage[vcol_name] |= mask
            else:
                vc_nodes_usage[vcol_name] = mask

    return vc_nodes_usage

def vc_channel_dyn_grass_usage(mat):
    vc_dyn_grass_usage = {}

    if mat is not None and mat.b4w_terrain:
        grass_col = mat.b4w_dynamic_grass_color
        grass_size_col = mat.b4w_dynamic_grass_size
        if grass_col:
            vc_dyn_grass_usage[grass_col] = rgb_channels_to_mask("RGB")
        if grass_size_col:
            if grass_size_col in vc_dyn_grass_usage:
                vc_dyn_grass_usage[grass_size_col] |= rgb_channels_to_mask("R")
            else:
                vc_dyn_grass_usage[grass_size_col] = rgb_channels_to_mask("R")

    return vc_dyn_grass_usage

def vc_channel_bending_usage(obj):
    vc_bending_usage = {}
    if obj.b4w_wind_bending:
        main_stiff = obj.b4w_main_bend_stiffness_col
        leaves_stiff = obj.b4w_detail_bend_colors.leaves_stiffness_col
        leaves_phase = obj.b4w_detail_bend_colors.leaves_phase_col
        overall_stiff = obj.b4w_detail_bend_colors.overall_stiffness_col

        if main_stiff:
            if main_stiff in vc_bending_usage:
                vc_bending_usage[main_stiff] |= rgb_channels_to_mask("R")
            else:
                vc_bending_usage[main_stiff] = rgb_channels_to_mask("R")
        if leaves_stiff:
            if leaves_stiff in vc_bending_usage:
                vc_bending_usage[leaves_stiff] |= rgb_channels_to_mask("R")
            else:
                vc_bending_usage[leaves_stiff] = rgb_channels_to_mask("R")
        if leaves_phase:
            if leaves_phase in vc_bending_usage:
                vc_bending_usage[leaves_phase] |= rgb_channels_to_mask("G")
            else:
                vc_bending_usage[leaves_phase] = rgb_channels_to_mask("G")
        if overall_stiff:
            if overall_stiff in vc_bending_usage:
                vc_bending_usage[overall_stiff] |= rgb_channels_to_mask("B")
            else:
                vc_bending_usage[overall_stiff] = rgb_channels_to_mask("B")
    return vc_bending_usage

def vc_channel_color_paint_usage(mesh, mat):
    vc_cpaint_usage = {}

    if mat is not None and mat.use_vertex_color_paint and len(mesh.vertex_colors):
        vc_active = mesh_get_active_vc(mesh)
        if vc_active:
            vc_cpaint_usage[vc_active.name] = rgb_channels_to_mask("RGB")

    return vc_cpaint_usage

def vc_channel_psys_inheritance(obj):
    vc_psys_inheritance = {}

    # NOTE: export vertex color 'from_name' fully on emitter,
    # don't consider particles on this stage
    for psys in obj.particle_systems:
        pset = psys.settings
        vc_from_name = pset.b4w_vcol_from_name
        vc_to_name = pset.b4w_vcol_to_name

        if vc_from_name and vc_to_name:
            vc_psys_inheritance[vc_from_name] = rgb_channels_to_mask("RGB")

    return vc_psys_inheritance

def rgb_channels_to_mask(channel_name):
    mask = 0b000
    if "R" in channel_name:
        mask |= 0b100
    if "G" in channel_name:
        mask |= 0b010
    if "B" in channel_name:
        mask |= 0b001
    return mask

def export_submesh(mesh, mesh_ptr, obj_user, obj_ptr, mat_index, disab_flat,
        vertex_animation, edited_normals, shape_keys, vertex_groups, mesh_data, 
        use_tnb_shading):

    if vertex_animation:
        if len(obj_user.b4w_vertex_anim) == 0:
            err("Incorrect vertex animation for mesh \"" + mesh.name +
                    "\". Object has no vertex animation.")
            vertex_animation = False
        else:
            for anim in obj_user.b4w_vertex_anim:
                if len(anim.frames) == 0:
                    err("Incorrect vertex animation for mesh \"" + mesh.name +
                            "\". Unbaked \"" + anim.name + "\" vertex animation.")
                    vertex_animation = False
                    break
                elif len(mesh.vertices) != len(anim.frames[0].vertices):
                    err("Wrong vertex animation vertices count for mesh \"" +
                            mesh.name + "\". It doesn't match with the mesh vertices " +
                            "count for \"" + anim.name + "\"")
                    vertex_animation = False
                    break

    submesh_data = OrderedDict()
    mesh.calc_tessface()
    submesh_bounding_data = b4w_bin.calc_bounding_data(mesh_ptr, mat_index)
    submesh_data["boundings"] = OrderedDict()
    process_mesh_boundings(submesh_data["boundings"], mesh, submesh_bounding_data,
            False)

    if len(mesh_data["materials"]) <= 1:
        mesh_data["b4w_boundings"] = OrderedDict()
        process_mesh_boundings(mesh_data["b4w_boundings"], mesh, submesh_bounding_data, True)

    is_degenerate_mesh = not bool(max( \
            abs(submesh_bounding_data["max_x"] - submesh_bounding_data["min_x"]), \
            abs(submesh_bounding_data["max_y"] - submesh_bounding_data["min_y"]), \
            abs(submesh_bounding_data["max_z"] - submesh_bounding_data["min_z"])))

    vc_channel_usage = get_mat_vc_channel_usage(mesh, mat_index, obj_user)
    vc_mask_buffer = bytearray()

    for vc in mesh.vertex_colors:
        vc_mask_buffer.append(vc_channel_usage[vc.name])

    uv_usage = get_mat_uv_usage(mesh, mat_index, obj_user)
    uv_usage_buffer = bytearray()
    for uv in mesh.uv_textures:
        uv_usage_buffer.append(uv_usage[uv.name])

    mesh.calc_normals_split()
    mesh.calc_tessface()
    submesh = b4w_bin.export_submesh(mesh_ptr, obj_ptr, mat_index,
                disab_flat, vertex_animation, edited_normals, shape_keys, use_tnb_shading,
                vertex_groups, vc_mask_buffer, uv_usage_buffer, is_degenerate_mesh)

    status_len = len(submesh["status"]) // BINARY_INT_SIZE
    if status_len:
        status = struct.unpack('i' * status_len, submesh["status"])[0]
        if status == POS_ERR:
            err("Incorrect mesh " + mesh.name + ". Wrong vertices positions.")
        elif status == NOR_ERR:
            err("Incorrect mesh " + mesh.name + ". Wrong normals.")
        elif status == TAN_ERR:
            err("Incorrect mesh " + mesh.name + ". Wrong tangents.")
        elif status == TCO_ERR:
            err("Incorrect mesh " + mesh.name + ". Wrong texture coordinates.")
        elif status == TCO2_ERR:
            err("Incorrect mesh " + mesh.name + ". Wrong texture coordinates.")
        elif status == GRP_ERR:
            err("Incorrect mesh " + mesh.name + ". Wrong vertex group weights.")
        elif status == COL_ERR:
            err("Incorrect mesh " + mesh.name + ". Wrong vertex color values.")
        elif status == SHADE_TNB_ERR:
            err("Incorrect mesh " + mesh.name + ". Wrong shading tangents values.")

    submesh_data["base_length"] = submesh["base_length"]

    int_props = ["indices"]
    for prop_name in int_props:
        if prop_name in submesh:
            if len(submesh[prop_name]):
                submesh_data[prop_name] = [
                    len(_bpy_bindata_int) // BINARY_INT_SIZE,
                    len(submesh[prop_name]) // BINARY_INT_SIZE
                ]
                _bpy_bindata_int.extend(submesh[prop_name])
            else:
                submesh_data[prop_name] = [0, 0]

    float_props = ["position", "texcoord", "shade_tangs"]
    for prop_name in float_props:
        if prop_name in submesh:
            if len(submesh[prop_name]):
                submesh_data[prop_name] = [
                    len(_bpy_bindata_float) // BINARY_FLOAT_SIZE,
                    len(submesh[prop_name]) // BINARY_FLOAT_SIZE
                ]
                _bpy_bindata_float.extend(submesh[prop_name])
            else:
                submesh_data[prop_name] = [0, 0]

    short_props = ["normal", "tangent"]
    for prop_name in short_props:
        if prop_name in submesh:
            if len(submesh[prop_name]):
                submesh_data[prop_name] = [
                    len(_bpy_bindata_short) // BINARY_SHORT_SIZE,
                    len(submesh[prop_name]) // BINARY_SHORT_SIZE
                ]
                _bpy_bindata_short.extend(submesh[prop_name])
            else:
                submesh_data[prop_name] = [0, 0]

    ushort_props = ["group"]
    for prop_name in ushort_props:
        if prop_name in submesh:
            if len(submesh[prop_name]):
                submesh_data[prop_name] = [
                    len(_bpy_bindata_ushort) // BINARY_SHORT_SIZE,
                    len(submesh[prop_name]) // BINARY_SHORT_SIZE
                ]
                _bpy_bindata_ushort.extend(submesh[prop_name])
            else:
                submesh_data[prop_name] = [0, 0]

    uchar_props = ["color"]
    for prop_name in uchar_props:
        if prop_name in submesh:
            if len(submesh[prop_name]):
                submesh_data[prop_name] = [
                    len(_bpy_bindata_uchar) // BINARY_CHAR_SIZE,
                    len(submesh[prop_name]) // BINARY_CHAR_SIZE
                ]
                _bpy_bindata_uchar.extend(submesh[prop_name])
            else:
                submesh_data[prop_name] = [0, 0]

    submesh_data["vertex_colors"] = []
    for color_layer in mesh.vertex_colors:
        if color_layer.name in vc_channel_usage and vc_channel_usage[color_layer.name]:
            col_layer_data = OrderedDict()
            col_layer_data["name"] = color_layer.name
            col_layer_data["mask"] = vc_channel_usage[color_layer.name]
            submesh_data["vertex_colors"].append(col_layer_data)

    submesh_data["uv_layers"] = []
    for uv_layer in mesh.uv_textures:
        if uv_layer.name in uv_usage and uv_usage[uv_layer.name]:
            submesh_data["uv_layers"].append(uv_layer.name)

    return submesh_data

def find_material_mesh(material, meshes):
    """unused"""
    """Find material user"""

    for mesh in meshes:
        mats = mesh.materials
        for mat in mats:
            if mat == material:
                return mesh

    # not found
    return None

def process_mesh_vertex_anim(mesh_data, obj_user):
    """Vertex animation metadata"""
    mesh_data["b4w_vertex_anim"] = []

    if obj_user and obj_user.b4w_loc_export_vertex_anim:
        for va_item in obj_user.b4w_vertex_anim:
            # prevent storage of non-baked animation ("Empty")
            if not va_item.frames:
                continue

            va_item_data = OrderedDict()
            va_item_data["name"] = va_item.name
            va_item_data["frame_start"] = va_item.frame_start
            va_item_data["frame_end"] = va_item.frame_end
            va_item_data["averaging"] = va_item.averaging
            va_item_data["averaging_interval"] = va_item.averaging_interval
            va_item_data["allow_nla"] = va_item.allow_nla

            mesh_data["b4w_vertex_anim"].append(va_item_data)

def process_mesh_shape_keys(mesh_data, obj_user, mesh):
    mesh_data["b4w_shape_keys"] = []

    if obj_user and obj_user.b4w_shape_keys and "key_blocks" in dir(mesh.shape_keys):
        for key in mesh.shape_keys.key_blocks:
            sk_item_data = OrderedDict()
            sk_item_data["name"] = key.name
            sk_item_data["value"] = key.value
            mesh_data["b4w_shape_keys"].append(sk_item_data)

def process_mesh_vertex_groups(mesh_data, obj_user):
    """Only groups metadata exported here"""
    mesh_data["vertex_groups"] = []

    if obj_user and obj_user.vertex_groups:
        for vertex_group in obj_user.vertex_groups:
            vertex_group_data = OrderedDict()
            vertex_group_data["name"] = vertex_group.name
            vertex_group_data["index"] = vertex_group.index

            mesh_data["vertex_groups"].append(vertex_group_data)

def process_armature(armature):
    if "export_done" in armature and armature["export_done"]:
        return
    armature["export_done"] = True

    arm_data = OrderedDict()

    arm_data["name"] = armature.name
    arm_data["uuid"] = gen_uuid(armature)

    arm_data["bones"] = []
    bones = armature.bones
    for bone in bones:
        bone_data = OrderedDict()

        bone_data["name"] = bone.name

        # in bone space
        head = [bone.head[0], bone.head[1], bone.head[2]]
        tail = [bone.tail[0], bone.tail[1], bone.tail[2]]

        bone_data["head"] = round_iterable(head, 5)
        bone_data["tail"] = round_iterable(tail, 5)

        # in armature space
        hl = [bone.head_local[0], bone.head_local[1], bone.head_local[2]]
        tl = [bone.tail_local[0], bone.tail_local[1], bone.tail_local[2]]

        bone_data["head_local"] = round_iterable(hl, 5)
        bone_data["tail_local"] = round_iterable(tl, 5)

        # Bone Armature-Relative Matrix
        ml = bone.matrix_local

        # flatten
        ml = matrix4x4_to_list(ml)
        bone_data["matrix_local"] = round_iterable(ml, 5)

        arm_data["bones"].append(bone_data)

    _export_data["armatures"].append(arm_data)
    _export_uuid_cache[arm_data["uuid"]] = arm_data
    _bpy_uuid_cache[arm_data["uuid"]] = armature

def process_speaker(speaker):
    if "export_done" in speaker and speaker["export_done"]:
        return
    speaker["export_done"] = True

    spk_data = OrderedDict()

    spk_data["name"] = speaker.name
    spk_data["uuid"] = gen_uuid(speaker)

    sound = speaker.sound
    if sound:
        spk_data["sound"] = gen_uuid_dict(sound)
        try:
            process_sound(sound)
        except PathError as ex:
            err(str(ex))
            spk_data["sound"] = None
    else:
        spk_data["sound"] = None

    process_animation_data(spk_data, speaker, bpy.data.actions)

    # distance attenuation params
    spk_data["attenuation"] = round_num(speaker.attenuation, 3)
    spk_data["distance_reference"] = round_num(speaker.distance_reference, 3)

    dmax = speaker.distance_max
    if dmax > SPKDISTMAX:
        dmax = SPKDISTMAX

    spk_data["distance_max"] = round_num(dmax, 3)

    # spatialization params
    spk_data["cone_angle_inner"] = round_num(speaker.cone_angle_inner, 3)
    spk_data["cone_angle_outer"] = round_num(speaker.cone_angle_outer, 3)
    spk_data["cone_volume_outer"] = round_num(speaker.cone_volume_outer, 3)

    # common params
    spk_data["pitch"] = round_num(speaker.pitch, 3)
    spk_data["muted"] = speaker.muted
    spk_data["volume"] = round_num(speaker.volume, 3)

    # custom params
    spk_data["b4w_behavior"] = speaker.b4w_behavior
    spk_data["b4w_enable_doppler"] = speaker.b4w_enable_doppler
    spk_data["b4w_auto_play"] = speaker.b4w_auto_play
    spk_data["b4w_cyclic_play"] = speaker.b4w_cyclic_play
    spk_data["b4w_delay"] = round_num(speaker.b4w_delay, 3)
    spk_data["b4w_delay_random"] = round_num(speaker.b4w_delay_random, 3)
    spk_data["b4w_volume_random"] = round_num(speaker.b4w_volume_random, 3)
    spk_data["b4w_pitch_random"] = round_num(speaker.b4w_pitch_random, 3)
    spk_data["b4w_fade_in"] = round_num(speaker.b4w_fade_in, 3)
    spk_data["b4w_fade_out"] = round_num(speaker.b4w_fade_out, 3)
    spk_data["b4w_loop"] = speaker.b4w_loop
    spk_data["b4w_loop_start"] = speaker.b4w_loop_start
    spk_data["b4w_loop_end"] = speaker.b4w_loop_end

    _export_data["speakers"].append(spk_data)
    _export_uuid_cache[spk_data["uuid"]] = spk_data
    _bpy_uuid_cache[spk_data["uuid"]] = speaker

def process_sound(sound):
    if "export_done" in sound and sound["export_done"]:
        return
    sound["export_done"] = True

    sound_data = OrderedDict()
    sound_data["name"] = sound.name
    sound_data["uuid"] = gen_uuid(sound)

    ext = os.path.splitext(sound.filepath)[1]
    process_media_path(sound, sound_data, ext, _unique_packed_sounds)

    _export_data["sounds"].append(sound_data)
    _export_uuid_cache[sound_data["uuid"]] = sound_data
    _bpy_uuid_cache[sound_data["uuid"]] = sound

def process_particle(particle):
    """type ParticleSettings"""

    if "export_done" in particle and particle["export_done"]:
        # this means particle was successfully exported previously
        return gen_uuid(particle) in _bpy_uuid_cache

    particle["export_done"] = True

    part_data = OrderedDict()

    part_data["name"] = particle.name
    part_data["uuid"] = gen_uuid(particle)

    part_data["type"] = particle.type

    # emission
    part_data["count"] = particle.count
    part_data["emit_from"] = particle.emit_from

    part_data["frame_start"] = round_num(particle.frame_start, 3)
    part_data["frame_end"] = round_num(particle.frame_end, 3)
    part_data["lifetime"] = round_num(particle.lifetime, 3)
    part_data["lifetime_random"] = round_num(particle.lifetime_random, 3)

    # velocity
    part_data["normal_factor"] = round_num(particle.normal_factor, 3)
    part_data["factor_random"] = round_num(particle.factor_random, 3)

    # rotation

    # 'NONE, 'RAND', 'VELOCITY'
    part_data["use_rotations"] = particle.use_rotations
    part_data["angular_velocity_mode"] = particle.angular_velocity_mode
    part_data["angular_velocity_factor"] \
            = round_num(particle.angular_velocity_factor, 3)

    # physics
    part_data["particle_size"] = round_num(particle.particle_size, 3)
    part_data["mass"] = round_num(particle.mass, 3)
    # not used so far
    part_data["brownian_factor"] = round_num(particle.brownian_factor, 3)

    # renderer
    part_data["material"] = particle.material
    part_data["use_render_emitter"] = particle.use_render_emitter
    part_data["render_type"] = particle.render_type
    part_data["use_whole_group"] = particle.use_whole_group

    # field weights
    dct = part_data["effector_weights"] = OrderedDict()
    dct["gravity"] = round_num(particle.effector_weights.gravity, 3)
    dct["wind"] = round_num(particle.effector_weights.wind, 3)

    # "EMITTER"
    part_data["b4w_cyclic"] = particle.b4w_cyclic
    part_data["b4w_fade_in"] = round_num(particle.b4w_fade_in, 3)
    part_data["b4w_fade_out"] = round_num(particle.b4w_fade_out, 3)
    part_data["b4w_randomize_emission"] = particle.b4w_randomize_emission
    part_data["b4w_allow_nla"] = particle.b4w_allow_nla

    # "HAIR"
    part_data["b4w_initial_rand_rotation"] = particle.b4w_initial_rand_rotation
    part_data["use_rotation_dupli"] = particle.use_rotation_dupli
    part_data["b4w_rotation_type"] = particle.b4w_rotation_type
    part_data["b4w_rand_rotation_strength"] \
            = round_num(particle.b4w_rand_rotation_strength, 3)
    part_data["b4w_hair_billboard"] = particle.b4w_hair_billboard
    part_data["b4w_hair_billboard_type"] = particle.b4w_hair_billboard_type
    part_data["b4w_hair_billboard_jitter_amp"] \
            = round_num(particle.b4w_hair_billboard_jitter_amp, 3)
    part_data["b4w_hair_billboard_jitter_freq"] \
            = round_num(particle.b4w_hair_billboard_jitter_freq, 3)
    part_data["b4w_hair_billboard_geometry"] \
            = particle.b4w_hair_billboard_geometry
    part_data["b4w_dynamic_grass"] = particle.b4w_dynamic_grass
    part_data["b4w_dynamic_grass_scale_threshold"] \
            = particle.b4w_dynamic_grass_scale_threshold
    part_data["b4w_wind_bend_inheritance"] = particle.b4w_wind_bend_inheritance
    part_data["b4w_shadow_inheritance"] = particle.b4w_shadow_inheritance
    part_data["b4w_reflection_inheritance"] \
            = particle.b4w_reflection_inheritance
    part_data["b4w_vcol_from_name"] = particle.b4w_vcol_from_name
    part_data["b4w_vcol_to_name"] = particle.b4w_vcol_to_name

    part_data["b4w_billboard_align"] = particle.b4w_billboard_align
    part_data["billboard_tilt"] = particle.billboard_tilt
    part_data["billboard_tilt_random"] = particle.billboard_tilt_random

    part_data["b4w_coordinate_system"] = particle.b4w_coordinate_system

    part_data["b4w_enable_soft_particles"] = particle.b4w_enable_soft_particles
    part_data["b4w_particles_softness"] = particle.b4w_particles_softness

    # process particle links
    # NOTE: it seams only single slot supported
    part_data["texture_slots"] = []
    for slot in particle.texture_slots:
        if slot and slot.texture is not None and do_export(slot.texture):
            slot_data = OrderedDict()
            if slot.texture.type == "NONE" and slot.texture.b4w_source_type == "SCENE":
                fallback_texture = get_fallback_texture()
                slot_data["texture"] = gen_uuid_dict(fallback_texture)
                process_texture(fallback_texture)
                warn("\"" + particle.name + "\" particle settings has the \""
                        + slot.texture.name + "\" texture rendering a scene. "
                        + "It has been replaced by the default texture.")
            else:
                try:
                    if not slot.texture:
                        raise MaterialError("No texture for the \"" + particle.name + "\" particle settings texture slot.")
                    slot_data["use_map_size"] = slot.use_map_size
                    slot_data["texture"] = gen_uuid_dict(slot.texture)
                    process_texture(slot.texture)
                    part_data["texture_slots"].append(slot_data)
                except MaterialError as ex:
                    _curr_stack["texture"] = []
                    err(str(ex))

    if particle.type == "HAIR" and particle.render_type == "OBJECT":
        if particle.dupli_object is None:
            err("Particle system error for " + particle.name +
                    ". Dupli object isn't specified.")
            return False

        if not particle_object_is_valid(particle.dupli_object):
            err("Particle system error for " + particle.name +
                    ". Wrong dupli object type '" + particle.dupli_object.type)
            return False

        if not do_export(particle.dupli_object):
            err("Particle system error for " + particle.name +
                    ". Dupli object " + particle.dupli_object.name
                    + " has not been exported.")
            return False
        part_data["dupli_object"] = process_object(particle.dupli_object, is_hair=True)
    else:
        part_data["dupli_object"] = None

    part_data["dupli_weights"] = []
    if particle.type == "HAIR" and particle.render_type == "GROUP":
        if particle.dupli_group is None:
            err("Particle system error for particle " + particle.name +
                    ". Dupli group isn't specified")
            return False

        part_data["dupli_group"] = process_group(particle.dupli_group, for_particles=True)

        dg_uuid = part_data["dupli_group"]["uuid"]
        dg_data = _export_uuid_cache[dg_uuid]
        if not dg_data["objects"]:
            err("Particle system error for particle " + particle.name +
                    ". The \"" + dg_data["name"] + "\" dupli group contains no " +
                    "valid object for export")
            return False

        part_data["use_group_pick_random"] = particle.use_group_pick_random
        use_group_count = particle.use_group_count;
        part_data["use_group_count"] = use_group_count
        if use_group_count:
            process_particle_dupli_weights(part_data["dupli_weights"], particle)
    else:
        part_data["dupli_group"] = None
        part_data["use_group_pick_random"] = None
        part_data["use_group_count"] = None

    _export_data["particles"].append(part_data)
    _export_uuid_cache[part_data["uuid"]] = part_data
    _bpy_uuid_cache[part_data["uuid"]] = particle
    return True

def process_world(world):
    if "export_done" in world and world["export_done"]:
        return
    world["export_done"] = True

    _curr_stack["object"].append(world)

    world_data = OrderedDict()

    world_data["name"] = world.name
    world_data["uuid"] = gen_uuid(world)

    process_world_texture_slots(world_data, world)

    world_data["horizon_color"] = round_iterable(world.horizon_color, 4)
    world_data["zenith_color"] = round_iterable(world.zenith_color, 4)

    world_data["use_sky_paper"] = world.use_sky_paper
    world_data["use_sky_blend"] = world.use_sky_blend
    world_data["use_sky_real"] = world.use_sky_real

    world_data["b4w_use_default_animation"] = world.b4w_use_default_animation
    world_data["b4w_anim_behavior"] = world.b4w_anim_behavior

    world_data["use_nodes"] = world.use_nodes
    world_data["uv_vc_key"] = ""

    process_world_light_settings(world_data, world)
    process_world_sky_settings(world_data, world)
    process_world_mist_settings(world_data, world)

    process_animation_data(world_data, world, bpy.data.actions)

    if world_data["use_nodes"]:
        process_node_tree(world_data, world, False)
    else:
        world_data["node_tree"] = None

    _export_data["worlds"].append(world_data)
    _export_uuid_cache[world_data["uuid"]] = world_data
    _bpy_uuid_cache[world_data["uuid"]] = world

    _curr_stack["object"].pop()

def process_world_light_settings(world_data, world):
    light_settings = world.light_settings

    dct = world_data["light_settings"] = OrderedDict()
    dct["use_environment_light"] = light_settings.use_environment_light
    dct["environment_energy"] = round_num(light_settings.environment_energy, 3)
    dct["environment_color"] = light_settings.environment_color

def process_world_sky_settings(world_data, world):
    sky = world.b4w_sky_settings

    dct = world_data["b4w_sky_settings"] = OrderedDict()
    dct["render_sky"] = sky.render_sky
    dct["reflexible"] = sky.reflexible
    dct["reflexible_only"] = sky.reflexible_only
    dct["procedural_skydome"] = sky.procedural_skydome
    dct["use_as_environment_lighting"] = sky.use_as_environment_lighting
    dct["color"] = round_iterable(sky.color, 4)
    dct["rayleigh_brightness"] = round_num(sky.rayleigh_brightness, 2)
    dct["mie_brightness"] = round_num(sky.mie_brightness, 2)
    dct["spot_brightness"] = round_num(sky.spot_brightness, 1)
    dct["scatter_strength"] = round_num(sky.scatter_strength, 2)
    dct["rayleigh_strength"] = round_num(sky.rayleigh_strength, 2)
    dct["mie_strength"] = round_num(sky.mie_strength, 4)
    dct["rayleigh_collection_power"] = round_num(sky.rayleigh_collection_power, 2)
    dct["mie_collection_power"] = round_num(sky.mie_collection_power, 2)
    dct["mie_distribution"] = round_num(sky.mie_distribution, 2)

def process_world_mist_settings(world_data, world):
    mist = world.mist_settings

    dct = world_data["fog_settings"] = OrderedDict()
    dct["use_fog"] = mist.use_mist
    dct["intensity"] = round_num(mist.intensity, 3)
    dct["depth"] = round_num(mist.depth, 2)
    dct["start"] = round_num(mist.start, 2)
    dct["height"] = round_num(mist.height, 3)
    dct["falloff"] = mist.falloff
    dct["use_custom_color"] = world.b4w_use_custom_color
    dct["color"] = round_iterable(world.b4w_fog_color, 4)

def matrix4x4_to_list(m):
    m = m.transposed()
    result = []
    for i in range(0, 4):
        v = m[i]
        for j in range(0, 4):
            result.append(v[j])
    return result

def process_animation_data(obj_data, component, actions):
    adata = component.animation_data
    if adata:
        dct = obj_data["animation_data"] = OrderedDict()

        action = select_action(adata.action, actions)

        if action:
            dct["action"] = gen_uuid_dict(action)
        else:
            dct["action"] = None

        dct["nla_tracks"] = []
        if adata.nla_tracks:
            process_object_nla(dct["nla_tracks"], adata.nla_tracks, actions)
    else:
        obj_data["animation_data"] = None

def find_modifier(obj, mtype):
    for modifier in obj.modifiers:
        if modifier.type == mtype:
            return modifier

    return None

def process_object_modifiers(mod_data, modifiers, current_obj):
    for modifier in modifiers:
        modifier_data = OrderedDict()
        modifier_data["name"] = modifier.name
        # NOTE: don't export modifier in some cases
        if not process_modifier(modifier_data, modifier, current_obj):
            continue
        modifier_data["type"] = modifier.type
        mod_data.append(modifier_data)

def process_modifier(modifier_data, mod, current_obj):
    global _dupli_group_ids
    if mod.type == "ARMATURE":
        if not mod.object:
            err("The \"" + current_obj.name + "\" object's \"" + mod.name
                + "\" armature modifier has no armature object. "
                + "Modifier removed.")
            return False

        if not do_export(mod.object):
            err("The \"" + current_obj.name + "\" object has the \"" + mod.name
                + "\" armature modifier. Its armature object \"" + mod.object.name
                + "\" is not exported. Modifier removed.")
            return False

        if current_obj.b4w_loc_export_vertex_anim:
            err("The \"" + current_obj.name + "\" object has the \"" + mod.name
                + "\" armature modifier and a vertex animation. Modifier removed.")
            return False

        if mod.object.proxy:
            err("The \"" + current_obj.name + "\" object has the \"" + mod.name
                + "\" armature modifier. Its armature object \"" + mod.object.name
                + "\" is a proxy object. Modifier removed.")
            return False

        if mod.object.as_pointer() not in _dupli_group_ids:
            err("The \"" + current_obj.name + "\" object has the \"" + mod.name
                + "\" armature modifier. Its armature object \"" + mod.object.name
                + "\" is not in group. Modifier removed.")
            return False

        if len(set(_dupli_group_ids[mod.object.as_pointer()])
                    & set(_dupli_group_ids[current_obj.as_pointer()])) > 0:
            modifier_data["object"] = process_object(mod.object)
        else:
            err("The \"" + current_obj.name
                + "\" object has \"" + mod.name + "\" armature modifier which "
                + "references the wrong group. Modifier removed.")
            return False

    elif mod.type == "ARRAY":
        modifier_data["fit_type"] = mod.fit_type

        # 3 values for each fit type
        modifier_data["count"] = mod.count
        modifier_data["fit_length"] = round_num(mod.fit_length, 3)
        if mod.curve and object_is_valid(mod.curve):
            modifier_data["curve"] = process_object(mod.curve)
        else:
            modifier_data["curve"] = None

        modifier_data["use_constant_offset"] = mod.use_constant_offset

        cod = mod.constant_offset_displace
        cod = round_iterable([cod[0], cod[1], cod[2]], 5)
        modifier_data["constant_offset_displace"] = cod

        modifier_data["use_relative_offset"] = mod.use_relative_offset

        rod = mod.relative_offset_displace
        rod = round_iterable([rod[0], rod[1], rod[2]], 5)
        modifier_data["relative_offset_displace"] = rod

        modifier_data["use_object_offset"] = mod.use_object_offset
        if mod.offset_object and object_is_valid(mod.offset_object):
            modifier_data["offset_object"] = process_object(mod.offset_object)
        else:
            modifier_data["offset_object"] = None

    elif mod.type == "CURVE":
        if mod.object and object_is_valid(mod.object):
            modifier_data["object"] = process_object(mod.object, is_curve=True)
            # add object CURVE to buffer
            _additional_scene_objects.append(modifier_data["object"])
            if not (len(mod.object.data.splines) \
                    and mod.object.data.splines[0].type == "NURBS" \
                    and mod.object.data.splines[0].use_endpoint_u):
                err("The \"" + mod.name
                        + "\" curve modifier has unsupported curve object \""
                        + mod.object.name + "\". Modifier removed.")
                return False
        else:
            err("The \"" + mod.name
                    + "\"curve modifier has no curve object. Modifier removed.")
            return False
        modifier_data["deform_axis"] = mod.deform_axis

    return True

def process_constraints(obj, do_err):
    """export constraints (target attribute can have link to other objects)"""
    constraints = obj.constraints
    constraints_data = []
    for cons in constraints:
        cons_data = OrderedDict()
        cons_data["name"] = cons.name
        if process_constraint(cons_data, cons) and (not cons.mute or
                    cons.type == "LOCKED_TRACK" and cons.name == "REFLECTION PLANE"):
            cons_data["mute"] = cons.mute
            cons_data["type"] = cons.type
            if check_constr_validation(obj):
                if cons.is_valid or cons.type == "LOCKED_TRACK" and cons.name == "REFLECTION PLANE":
                    constraints_data.append(cons_data)
                elif do_err:
                    err("Object:\"" + _curr_stack["object"][-1].name + "\" > " +
                            "Constraint:\"" + cons.name + "\". Check constraint settings.")
            else:
                err("Object:\"" + _curr_stack["object"][-1].name
                        + "\". Constraint recursion is forbidden.")
        # else:
        #     err("Object:\"" + _curr_stack["object"][-1].name + "\" > " +
        #             "Constraint:\"" + cons.name + "\". Unsupported constraint type: " +
        #             "\"" + cons.type + "\".")

    return constraints_data

def check_constr_validation(obj):
    visited = []
    processed = [obj]
    return check_constr_rec_validation(obj, visited, processed)

def check_constr_rec_validation(obj, visited, processed):
    valid = True
    for constr in obj.constraints:
        target = constr.target
        if constr.is_valid and target:
            if target in processed:
                return False
            else:
                processed.append(target)
                valid = valid and check_constr_rec_validation(target, visited, processed)
                processed.remove(target)
                visited.append(target)
    return valid


def process_constraint(cons_data, cons):
    if cons.type == "COPY_TRANSFORMS":

        cons_data["target"] = obj_cons_target(cons)
        cons_data["subtarget"] = cons.subtarget
        cons_data["influence"] = cons.influence

        return True

    elif (cons.type == "COPY_LOCATION" or cons.type == "COPY_ROTATION" or
            cons.type == "COPY_SCALE"):

        cons_data["target"] = obj_cons_target(cons)
        cons_data["subtarget"] = cons.subtarget
        cons_data["use_offset"] = cons.use_offset
        cons_data["influence"] = cons.influence
        if cons.type != "COPY_SCALE":
            x = -1 if cons.invert_x else 1
            x = x if cons.use_x else 0
            y = -1 if cons.invert_y else 1
            y = y if cons.use_y else 0
            z = -1 if cons.invert_z else 1
            z = z if cons.use_z else 0
            cons_data["axes"] = [x, y, z]
        else:
            cons_data["axes"] = [1, 1, 1]

        return True

    elif cons.type == "TRACK_TO":
        cons_data["target"] = obj_cons_target(cons)
        cons_data["track_axis"] = cons.track_axis
        cons_data["up_axis"] = cons.up_axis
        cons_data["use_target_z"] = cons.use_target_z
        cons_data["influence"] = cons.influence

        return True

    elif cons.type == "LOCKED_TRACK" and cons.name == "REFLECTION PLANE":
        cons_data["target"] = obj_cons_target(cons)

        return True

    elif cons.type == "RIGID_BODY_JOINT":
        cons_data["target"] = obj_cons_target(cons)

        cons_data["pivot_type"] = cons.pivot_type

        cons_data["pivot_x"] = round_num(cons.pivot_x, 3)
        cons_data["pivot_y"] = round_num(cons.pivot_y, 3)
        cons_data["pivot_z"] = round_num(cons.pivot_z, 3)

        cons_data["axis_x"] = round_num(cons.axis_x, 4)
        cons_data["axis_y"] = round_num(cons.axis_y, 4)
        cons_data["axis_z"] = round_num(cons.axis_z, 4)

        # limits
        cons_data["use_limit_x"] = cons.use_limit_x
        cons_data["use_limit_y"] = cons.use_limit_y
        cons_data["use_limit_z"] = cons.use_limit_z

        cons_data["use_angular_limit_x"] = cons.use_angular_limit_x
        cons_data["use_angular_limit_y"] = cons.use_angular_limit_y
        cons_data["use_angular_limit_z"] = cons.use_angular_limit_z

        cons_data["limit_max_x"] = round_num(cons.limit_max_x, 3)
        cons_data["limit_max_y"] = round_num(cons.limit_max_y, 3)
        cons_data["limit_max_z"] = round_num(cons.limit_max_z, 3)
        cons_data["limit_min_x"] = round_num(cons.limit_min_x, 3)
        cons_data["limit_min_y"] = round_num(cons.limit_min_y, 3)
        cons_data["limit_min_z"] = round_num(cons.limit_min_z, 3)

        cons_data["limit_angle_max_x"] = round_num(cons.limit_angle_max_x, 4)
        cons_data["limit_angle_max_y"] = round_num(cons.limit_angle_max_y, 4)
        cons_data["limit_angle_max_z"] = round_num(cons.limit_angle_max_z, 4)
        cons_data["limit_angle_min_x"] = round_num(cons.limit_angle_min_x, 4)
        cons_data["limit_angle_min_y"] = round_num(cons.limit_angle_min_y, 4)
        cons_data["limit_angle_min_z"] = round_num(cons.limit_angle_min_z, 4)
        return True

    return False

def process_object_lod_levels(obj):
    """export lods"""

    if obj.type != "MESH" and obj.type != "EMPTY":
        return []

    lod_levels = obj.lod_levels
    obj_name = obj.name
    cons = obj.constraints

    lod_levels_data = []
    is_target_lod_empty = True

    for lod in lod_levels:

        if not is_target_lod_empty:
            err("Ignoring LODs after empty LOD for the \"" + obj_name + "\" object.")
            break

        if obj == lod.object:
            continue

        lods_data = OrderedDict()
        lods_data["distance"] = lod.distance

        if lod.object and do_export(lod.object) and object_is_valid(lod.object):
            lods_data["object"] = process_object(lod.object)
        else:
            lods_data["object"] = None

        lods_data["use_mesh"] = lod.use_mesh
        lods_data["use_material"] = lod.use_material

        lod_levels_data.append(lods_data)

        if not lod.object:
            is_target_lod_empty = False

    return lod_levels_data

def obj_cons_target(cons):
    if not cons.target:
        return None

    if cons.target and object_is_valid(cons.target):
        target_uuid = process_object(cons.target)
    else:
        target_uuid = None

    return target_uuid

def get_particle_system_scale(obj, obj_data, psys, vert_group_name):
    indices = []
    vertex_influence = []
    scales_data_bytearray = b4w_bin.calc_particle_scale(psys.as_pointer())

    ver_inf_len = len(scales_data_bytearray["face_uv"]) // BINARY_FLOAT_SIZE
    f_v_num_len = len(scales_data_bytearray["face_ver_num"]) // BINARY_INT_SIZE

    vertex_influence = struct.unpack('f' * ver_inf_len, 
            scales_data_bytearray["face_uv"])

    indices = struct.unpack('i' * f_v_num_len, 
            scales_data_bytearray["face_ver_num"])
    vg_index = obj.vertex_groups[vert_group_name].index
    scales = []

    # NOTE: object's vertex groups refer to object's mesh when trying to 
    # extract vertex weight, so it needs to assign the actual mesh to the 
    # current object in case of "to_mesh()" operation, which generates another mesh
    old_mesh = obj.data
    obj.data = obj_data
    len_tessfaces = len(obj_data.tessfaces)
    for i in range(len(psys.particles)):
        scale = 0
        # Some already distributed particles have wrong mapping to face
        # The cause is not known yet
        # Check the number of faces to prevent overflow
        if len_tessfaces > indices[i]:
            if psys.settings.emit_from != "VERT":
                obj_data.tessfaces[indices[i]].vertices

                vert = obj_data.tessfaces[indices[i]].vertices

                for j in range(0, len(vert)):
                    vert_index = vert[j]

                    weight = get_ver_weight_by_group_ind(psys, obj_data, vert_index, vg_index)
                    scale += weight * vertex_influence[i * 4 + j]
            else:
                vert_gr_ind = obj.vertex_groups[vert_group_name].index
                scale = get_ver_weight_by_group_ind(psys, old_mesh, indices[i], vert_gr_ind)
        else:
            warn("Wrong face number %s for particle %s in particle system '%s'" % (indices[i], i, psys.name))

        scale = max(min(scale, 1), 0)
        scales.append(scale)
    obj.data = old_mesh

    return scales

def get_ver_weight_by_group_ind(psys, obj_data, vert_index, vg_index):
    weight = 0
    # NOTE: it's necessary for corrupted meshes
    if vert_index < len(obj_data.vertices):
        for v_group in obj_data.vertices[vert_index].groups:
            if v_group.group == vg_index:
                weight = v_group.weight
        if psys.invert_vertex_group_length:
            weight = 1.0 - weight
    return weight

def process_object_particle_systems(obj, obj_data):
    psystems_data = []
    for m in obj.modifiers:
        if m.type == 'PARTICLE_SYSTEM' and m.particle_system:
            psys = m.particle_system
            if do_export(psys.settings):

                psys_data = OrderedDict()

                psys_data["name"] = psys.name
                psys_data["seed"] = psys.seed

                if not len(obj_data.tessfaces):
                    obj_data.calc_tessface()

                # export particle transforms for hairs
                # [x0,y0,z0,scale0,x1...]
                if (psys.settings.type == "HAIR" and not
                        psys.settings.b4w_randomize_location):
                    if (psys.settings.b4w_initial_rand_rotation 
                            or psys.settings.b4w_hair_billboard):
                        data_len = 4
                    else:
                        data_len = 8
                    transforms_length = len(psys.particles) * data_len
                    ptrans_ptr = b4w_bin.create_buffer_float(transforms_length)

                    vert_group_name = psys.vertex_group_length
                    if vert_group_name:
                        scales = get_particle_system_scale(obj, obj_data, psys, vert_group_name)
                    for i in range(len(psys.particles)):
                        particle = psys.particles[i]
                        x,y,z = particle.hair_keys[0].co_object(obj, m, particle).xyz

                        # calc length as z coord of the last hair key
                        #length = particle.hair_keys[-1:][0].co_local.z
                        #length = particle.hair_keys[-1:][0].co.z - z
                        length = (particle.hair_keys[-1:][0].co_local.xyz -
                                    particle.hair_keys[0].co_local.xyz).length
                        scale = particle.size * length
                        if vert_group_name:
                            scale *= scales[i]

                        ptrans_ptr = b4w_bin.buffer_insert_float(ptrans_ptr, i * data_len, x)
                        ptrans_ptr = b4w_bin.buffer_insert_float(ptrans_ptr, i * data_len + 1, y)
                        ptrans_ptr = b4w_bin.buffer_insert_float(ptrans_ptr, i * data_len + 2, z)
                        ptrans_ptr = b4w_bin.buffer_insert_float(ptrans_ptr, i * data_len + 3, scale)

                        if (not psys.settings.b4w_initial_rand_rotation
                                and not psys.settings.b4w_hair_billboard):
                            quat_w = particle.rotation[0]
                            quat_x = particle.rotation[1]
                            quat_y = particle.rotation[2]
                            quat_z = particle.rotation[3]

                            ptrans_ptr = b4w_bin.buffer_insert_float(ptrans_ptr, i * data_len + 4, quat_w)
                            ptrans_ptr = b4w_bin.buffer_insert_float(ptrans_ptr, i * data_len + 5, quat_x)
                            ptrans_ptr = b4w_bin.buffer_insert_float(ptrans_ptr, i * data_len + 6, quat_y)
                            ptrans_ptr = b4w_bin.buffer_insert_float(ptrans_ptr, i * data_len + 7, quat_z)

                    ptrans = b4w_bin.get_buffer_float(ptrans_ptr, transforms_length)

                    psys_data["transforms"] = [
                        len(_bpy_bindata_float) // BINARY_FLOAT_SIZE,
                        len(ptrans) // BINARY_FLOAT_SIZE
                    ]
                    _bpy_bindata_float.extend(ptrans)
                else:
                    psys_data["transforms"] = [0, 0]

                psys_data["settings"] = gen_uuid_dict(psys.settings)
                if process_particle(psys.settings):
                    psystems_data.append(psys_data)

    return psystems_data

def process_node_tree(data, tree_source, is_group = False):
    node_tree = tree_source.node_tree

    if node_tree == None:
        data["node_tree"] = None
        return

    dct = data["node_tree"] = OrderedDict()
    dct["nodes"] = []
    cut_link_names = []
    # node tree nodes
    for node in node_tree.nodes:
        if not validate_node(node):
            raise MaterialError("The " + "\"" + node.name + "\"" +" node is not supported. "
                    + "Nodes will be disabled for \"" + tree_source.name + "\".")

        node_data = OrderedDict()

        node_data["name"] = node.name
        node_data["type"] = node.type

        cut_inputs = False

        if (node.type == "OUTPUT_LAMP"):
            continue

        if node.type == "GEOMETRY":
            if node.outputs["UV"].is_linked:
                node_data["uv_layer"] = get_uv_layer(_curr_stack["data"][-1], node.uv_layer)
            else:
                node_data["uv_layer"] = node.uv_layer
            data["uv_vc_key"] += node.uv_layer + node_data["uv_layer"]

            if node.outputs["Orco"].is_linked:
                data["use_orco_tex_coord"] = True

            if node.outputs["Vertex Color"].is_linked:
                node_data["color_layer"] = get_vertex_color(_curr_stack["data"][-1], node.color_layer)
            else:
                node_data["color_layer"] = node.color_layer
            data["uv_vc_key"] += node.color_layer + node_data["color_layer"]
                
        elif node.type == "UVMAP":
            if node.outputs["UV"].is_linked:
                node_data["uv_layer"] = get_uv_layer(_curr_stack["data"][-1],  node.uv_map)
            else:
                node_data["uv_layer"] =  node.uv_map
            data["uv_vc_key"] += node.uv_map + node_data["uv_layer"]

        elif node.type == "TEX_COORD":
            if node.outputs["UV"].is_linked:
                node_data["uv_layer"] = get_uv_layer(_curr_stack["data"][-1],  "")
            else:
                node_data["uv_layer"] = ""
            data["uv_vc_key"] += node_data["uv_layer"]
            if node.outputs["Generated"].is_linked:
                data["use_orco_tex_coord"] = True

        elif node.type == "CURVE_VEC" or node.type == "CURVE_RGB":
            node_data["curve_mapping"] = OrderedDict()
            def extract_loc(point): return list(point.location.to_tuple())
            def extract_handle_type(point): return point.handle_type
            node_data["curve_mapping"]["curves_data"] = []
            node_data["curve_mapping"]["curves_handle_types"] = []
            node_data["curve_mapping"]["curve_extend"] = []
            for curve in node.mapping.curves:
                node_data["curve_mapping"]["curves_data"].append([point for point
                        in map(extract_loc, curve.points)])
                node_data["curve_mapping"]["curves_handle_types"].append([handle_type for handle_type
                        in map(extract_handle_type, curve.points)])
                node_data["curve_mapping"]["curve_extend"].append(curve.extend)

        elif node.type == "VALTORGB":
            process_color_ramp(node_data, node.color_ramp)
            node_data["color_ramp"]["interpolation"] = node.color_ramp.interpolation

        elif node.type == "GROUP":
            if node.node_tree.name == "B4W_REFRACTION" or node.node_tree.name == "REFRACTION":
                # NOTE: don't rely on "b4w_render_refractions" scene property here
                # because it may lead to rendering errors
                curr_alpha_blend = _curr_stack["material"][-1].game_settings.alpha_blend
                if curr_alpha_blend == "OPAQUE" or curr_alpha_blend == "CLIP":
                    raise MaterialError("Using B4W_REFRACTION node \"" + node.name 
                            + "\" with incorrect type of Alpha Blend.")

            if node.node_tree.name == "B4W_PARALLAX" or node.node_tree.name == "PARALLAX":
                for inp in node.inputs:
                    if inp.name == PARALLAX_HEIGHT_MAP_INPUT_NAME:
                        if (not len(inp.links) or inp.links[0].from_node.bl_idname 
                                != PARALLAX_HEIGHT_MAP_INPUT_NODE or inp.links[0].from_node.texture is None):
                            raise MaterialError("Wrong \"Height Map\" input " + 
                                    "for the \"" + node.name + "\" B4W_PARALLAX node. " +  
                                    "Only link from the TEXTURE node with a non-empty texture is allowed.")
                        break


            node_data["node_tree_name"] = node.node_tree.name
            node_data["node_group"] = gen_uuid_dict(node.node_tree)
            process_node_group(data, node)

        elif node.type == "MAPPING":
            node_data["translation"] = round_iterable(node.translation, 4)
            node_data["rotation"] = round_iterable(node.rotation, 4)
            node_data["scale"] = round_iterable(node.scale, 4)

            node_data["vector_type"] = node.vector_type

            node_data["use_min"] = node.use_min
            node_data["use_max"] = node.use_max

            node_data["min"] = round_iterable(node.min, 4)
            node_data["max"] = round_iterable(node.max, 4)

        elif node.type == "MATERIAL" or node.type == "MATERIAL_EXT":

            material = node.material

            node_data["material_name"] = material.name if material else ""
            node_data["specular_shader"] = material.specular_shader if material else "COOKTORR"
            node_data["specular_hardness"] \
                    = round_num(material.specular_hardness, 4) if material else 50
            node_data["specular_slope"] \
                    = round_num(material.specular_slope, 4) if material else 0.1
            node_data["specular_toon_size"] \
                    = round_num(material.specular_toon_size, 4) if material else 0.5
            node_data["specular_toon_smooth"] \
                    = round_num(material.specular_toon_smooth, 4) if material else 0.1
            node_data["specular_intensity"] \
                    = round_num(material.specular_intensity, 4) if material else 0.5
            node_data["specular_ior"] \
                    = round_num(material.specular_ior, 4) if material else 4

            node_data["diffuse_shader"] = material.diffuse_shader if material else "LAMBERT"
            node_data["use_shadeless"] = material.use_shadeless if material else False
            node_data["use_tangent_shading"] = material.use_tangent_shading if material else False
            node_data["specular_alpha"] = material.specular_alpha if material else 1
            node_data["alpha"] = material.alpha if material else 1
            node_data["diffuse_intensity"] = material.diffuse_intensity if material else 1
            node_data["roughness"] = round_num(material.roughness, 3) if material else 0.5
            node_data["diffuse_fresnel"] \
                    = round_num(material.diffuse_fresnel, 3) if material else 0.1
            node_data["diffuse_fresnel_factor"] \
                    = round_num(material.diffuse_fresnel_factor, 3) if material else 0.5
            node_data["darkness"] \
                    = round_num(material.darkness, 3) if material else 1
            node_data["diffuse_toon_size"] \
                    = round_num(material.diffuse_toon_size, 3) if material else 0.5
            node_data["diffuse_toon_smooth"] \
                    = round_num(material.diffuse_toon_smooth, 3) if material else 0.1
            if not material:
                cut_inputs = True
                cut_link_names.append(node.name)
                err("Empty material slot in node \"" + node.name + "\".")

            node_data["use_diffuse"] = node.use_diffuse
            node_data["use_specular"] = node.use_specular
            node_data["invert_normal"] = node.invert_normal

        elif node.type == "MATH":
            node_data["operation"] = node.operation
            node_data["use_clamp"] = node.use_clamp

        elif node.type == "MIX_RGB":
            node_data["blend_type"] = node.blend_type
            node_data["use_clamp"] = node.use_clamp

        elif node.type == "TEXTURE":

            if node.texture and do_export(node.texture):
                node_data["texture"] = gen_uuid_dict(node.texture)
                process_texture(node.texture)
            else:
                node_data["texture"] = None

        elif node.type == "TEX_IMAGE" or node.type == "TEX_ENVIRONMENT":
            if node.image and do_export(node.image):
                node_data["image"] = gen_uuid_dict(node.image)
                process_image(node.image)
            else:
                node_data["image"] = None

            node_data["color_space"] = node.color_space
            node_data["interpolation"] = node.interpolation
            node_data["projection"] = node.projection

            if node.type == "TEX_IMAGE":
                node_data["extension"] = node.extension

        elif node.type == "VECT_MATH":
            node_data["operation"] = node.operation

        elif node.type == "LAMP":
            if node.lamp_object is not None:
                node_data["lamp"] = gen_uuid_dict(node.lamp_object)

        elif node.type == "VECT_TRANSFORM":
            node_data["vector_type"] = node.vector_type
            node_data["convert_from"] = node.convert_from
            node_data["convert_to"] = node.convert_to

        elif node.type == "NORMAL_MAP":
            node_data["space"] = node.space
            if node.outputs["Normal"].is_linked:
                node_data["uv_map"] = get_uv_layer(_curr_stack["data"][-1],  node.uv_map)
            else:
                node_data["uv_map"] =  node.uv_map
            data["uv_vc_key"] += node.uv_map + node_data["uv_map"]

        elif node.type == "BUMP":
            node_data["invert"] = node.invert

        process_node_sockets(node_data, "inputs", node.inputs, cut_inputs)
        process_node_sockets(node_data, "outputs", node.outputs, False)

        dct["nodes"].append(node_data)

    # node tree links
    dct["links"] = []
    for link in node_tree.links:
        if not link.is_valid:
            raise MaterialError("Invalid link found in node material.")

        if link.to_node.type == "OUTPUT_LAMP" or link.to_node.name in cut_link_names:
            continue

        link_data = OrderedDict()

        # name is unique identifier here
        link_data["from_node"] = OrderedDict({ "name": link.from_node.name })
        link_data["to_node"] = OrderedDict({ "name": link.to_node.name })

        # identifier is unique identifier here
        link_data["from_socket"] \
                = OrderedDict({ "identifier": link.from_socket.identifier })
        link_data["to_socket"] \
                = OrderedDict({ "identifier": link.to_socket.identifier })

        dct["links"].append(link_data)

    # node animation data
    process_animation_data(dct, node_tree, bpy.data.actions)

    cleanup_node_tree_data(dct, is_group)

def validate_node(node):
    if node.bl_idname == "ShaderNodeGroup":

        if not node.node_tree:
            return False

        for group_node in node.node_tree.nodes:
            if not validate_node(group_node):
                print("Not valid: ", group_node.bl_idname)
                return False
        return True
    else:
        return node.bl_idname in SUPPORTED_NODES

def process_node_sockets(node_data, type_str, sockets, cut):
    node_data[type_str] = []

    if len(sockets):
        for sock in sockets:
            # system socket has no name
            if not sock.name:
                continue
            sock_data = OrderedDict()
            sock_data["name"] = sock.name
            sock_data["identifier"] = sock.identifier
            sock_data["is_linked"] = sock.is_linked and not cut

            if sock.type != "SHADER":
                rna_ident = sock.rna_type.identifier
                if (rna_ident == "NodeSocketVector" or rna_ident == "NodeSocketColor" or
                        rna_ident == "NodeSocketVectorDirection"):
                    sock_data["default_value"] = round_iterable(sock.default_value, 3)
                else:
                    sock_data["default_value"] = round_num(sock.default_value, 3)
            else:
                sock_data["default_value"] = [0, 0, 0]

            node_data[type_str].append(sock_data)

def process_node_group(data, node_group):
    if "export_done" in node_group.node_tree and node_group.node_tree["export_done"]:
        ng_data = _export_uuid_cache[gen_uuid(node_group.node_tree)]
        data["use_orco_tex_coord"] = data["use_orco_tex_coord"] or ng_data["use_orco_tex_coord"]
        data["uv_vc_key"] += ng_data["uv_vc_key"]
        return
    ng_data = OrderedDict()
    ng_data["name"] = node_group.node_tree.name
    ng_data["use_orco_tex_coord"] = False
    ng_data["uv_vc_key"] = ""
    ng_data["uuid"] = gen_uuid(node_group.node_tree)
    process_node_tree(ng_data, node_group, True)

    data["use_orco_tex_coord"] = data["use_orco_tex_coord"] or ng_data["use_orco_tex_coord"]
    data["uv_vc_key"] += ng_data["uv_vc_key"]
    _export_data["node_groups"].append(ng_data)
    _export_uuid_cache[ng_data["uuid"]] = ng_data
    _bpy_uuid_cache[ng_data["uuid"]] = node_group
    node_group.node_tree["export_done"] = True

def cleanup_node_tree_data(node_tree_data, is_group = False):
    nodes = node_tree_data["nodes"]
    links = node_tree_data["links"]

    main_output_conn_nodes = []
    for node_data in nodes[::-1]:
        if node_data["type"] == "OUTPUT" or node_data["type"] == "OUTPUT_MATERIAL" or node_data["type"] == "OUTPUT_WORLD":
            main_output_conn_nodes = get_conn_nodes(node_tree_data, node_data["name"])
            break

    glow_output_conn_nodes = []
    for node_data in nodes[::-1]:
        if node_data["type"] == "GROUP" and node_data["node_tree_name"] == "B4W_GLOW_OUTPUT":
            glow_output_conn_nodes = get_conn_nodes(node_tree_data, node_data["name"])
            break

    # union two sets of nodes
    # NOT PYTHONIC WAY, SHOULD BE IMPORVED
    new_nodes = main_output_conn_nodes
    for glow_node_data in glow_output_conn_nodes:
        found = False
        for new_node_data in new_nodes:
            if glow_node_data["name"] == new_node_data["name"]:
                found = True
                break
        if not found:
            new_nodes.append(glow_node_data)

    if is_group:
        group_output_conn_nodes = []
        for node_data in nodes[::-1]:
            if node_data["type"] == "GROUP_OUTPUT":
                group_output_conn_nodes = get_conn_nodes(node_tree_data, node_data["name"])
                break

        for group_node_data in group_output_conn_nodes:
            found = False
            for new_node_data in new_nodes:
                if group_node_data["name"] == new_node_data["name"]:
                    found = True
                    break
            if not found:
                new_nodes.append(group_node_data)

    node_tree_data["nodes"] = new_nodes
    # remove nodes not connected with outputs
    cleanup_loose_links(node_tree_data)

def get_conn_nodes(node_tree_data, node_name):
    visit_state = {};
    set_unvisited(node_tree_data, visit_state);

    get_conn_nodes_iter(node_tree_data, node_name, visit_state);

    new_nodes = [];
    for key, value in visit_state.items():
        if value:
            new_nodes.append(find_node_by_name(node_tree_data, key))

    return new_nodes

def get_conn_nodes_iter(node_tree_data, node_name, visit_state):
    links = node_tree_data["links"]

    if not visit_state[node_name]:
        visit_state[node_name] = True;
        for in_link_data in get_in_links(node_tree_data, node_name):
            get_conn_nodes_iter(node_tree_data, in_link_data["from_node"]["name"], visit_state);

def cleanup_loose_links(node_tree_data):
    nodes = node_tree_data["nodes"]
    links = node_tree_data["links"]

    # remove half-edges too
    node_tree_data["links"] = [link_data for link_data in links \
                                if find_node_by_name(node_tree_data, link_data["from_node"]["name"]) and \
                                find_node_by_name(node_tree_data, link_data["to_node"]["name"])]

def get_in_links(node_tree_data, node_name):
    links = node_tree_data["links"]
    in_links = []
    for link_data in links:
        if link_data["to_node"]["name"] == node_name:
            in_links.append(link_data)

    return in_links

def find_node_by_name(node_tree_data, node_name):
    nodes = node_tree_data["nodes"]

    for node_data in nodes:
        if node_data["name"] == node_name:
            return node_data

    return None

def set_unvisited(node_tree_data, visit_state):
    nodes = node_tree_data["nodes"]
    for node_data in nodes:
        visit_state[node_data["name"]] = False

def process_world_texture_slots(world_data, world):
    slots = world.texture_slots
    world_data["texture_slots"] = []
    world_data["use_orco_tex_coord"] = False
    for i in range(len(slots)):
        slot = slots[i]
        if slot:
            try:
                if not slot.texture:
                    raise MaterialError("No texture in the \"" + world.name + "\" world texture slot.")
                if do_export(slot.texture):
                    if slot.texture.b4w_use_sky != "OFF":
                        if slot.texture.type != "ENVIRONMENT_MAP":
                            raise MaterialError(slot.texture.type + " texture type is not supported"
                                    + " for world \"" + world.name + "\".")
                        elif not slot.texture.image is None and slot.texture.image.source == "MOVIE":
                            raise MaterialError("Environment map in the \"" + world.name \
                                    + "\" world texture slot cannot be a movie.")
                        slot_data = OrderedDict()
                        # there are a lot of properties in addition to these
                        slot_data["texture_coords"] = slot.texture_coords
                        slot_data["use_map_blend"] = slot.use_map_blend
                        slot_data["use_map_horizon"] = slot.use_map_horizon
                        slot_data["use_map_zenith_up"] = slot.use_map_zenith_up
                        slot_data["use_map_zenith_down"] = slot.use_map_zenith_down
                        slot_data["use_rgb_to_intensity"] = slot.use_rgb_to_intensity
                        #slot_data["use_stencil"] = slot.use_stencil
                        slot_data["offset"] = round_iterable(slot.offset, 3)
                        slot_data["scale"] = round_iterable(slot.scale, 3)
                        slot_data["blend_type"] = slot.blend_type
                        slot_data["blend_factor"] = slot.blend_factor
                        slot_data["horizon_factor"] = slot.horizon_factor
                        slot_data["zenith_up_factor"] = slot.zenith_up_factor
                        slot_data["zenith_down_factor"] = slot.zenith_down_factor
                        slot_data["invert"] = slot.invert
                        slot_data["color"] = round_iterable(slot.color, 4)
                        slot_data["texture"] = gen_uuid_dict(slot.texture)
                        slot_data["default_value"] = slot.default_value

                        process_texture(slot.texture)
                        world_data["texture_slots"].append(slot_data)
            except MaterialError as ex:
                _curr_stack["texture"] = []
                err(str(ex))

def process_material_texture_slots(mat_data, material):
    global _curr_stack
    slots = material.texture_slots
    use_slots = material.use_textures
    mat_data["texture_slots"] = []
    if material.game_settings.alpha_blend == "OPAQUE" and material.use_nodes:
        return
    for i in range(len(slots)):
        slot = slots[i]
        use = use_slots[i]
        if slot and use:
            if not slot.use_map_alpha and material.use_nodes:
                continue
            # check texture availability
            if not slot.texture:
                raise MaterialError("No texture in the texture slot.")
            if do_export(slot.texture):
                if slot.use_map_color_diffuse and slot.texture.type == "ENVIRONMENT_MAP":
                    raise MaterialError("Use of ENVIRONMENT_MAP as diffuse " \
                        "color is not supported. Use as mirror instead.")
                slot_data = OrderedDict()

                tc = slot.texture_coords
                check_tex_slot(slot)

                slot_data["texture_coords"] = tc

                if tc == "UV":
                    slot_data["uv_layer"] = get_uv_layer(_curr_stack["data"][-1], slot.uv_layer)
                else:
                    slot_data["uv_layer"] = ""
                mat_data["uv_vc_key"] += slot.uv_layer + slot_data["uv_layer"]

                slot_data["use_map_color_diffuse"] = slot.use_map_color_diffuse
                slot_data["diffuse_color_factor"] \
                        = round_num(slot.diffuse_color_factor, 3)
                slot_data["use_map_alpha"] = slot.use_map_alpha
                slot_data["alpha_factor"] = round_num(slot.alpha_factor, 3)
                slot_data["use_map_color_spec"] = slot.use_map_color_spec
                slot_data["specular_color_factor"] \
                        = round_num(slot.specular_color_factor, 3)
                slot_data["use_map_normal"] = slot.use_map_normal
                slot_data["normal_factor"] = round_num(slot.normal_factor, 3)
                slot_data["use_map_mirror"] = slot.use_map_mirror
                slot_data["mirror_factor"] = round_num(slot.mirror_factor, 3)
                slot_data["use_rgb_to_intensity"] = slot.use_rgb_to_intensity
                slot_data["use_stencil"] = slot.use_stencil
                slot_data["offset"] = round_iterable(slot.offset, 3)
                slot_data["scale"] = round_iterable(slot.scale, 3)
                slot_data["blend_type"] = slot.blend_type
                slot_data["texture"] = gen_uuid_dict(slot.texture)
                process_texture(slot.texture)

                mat_data["texture_slots"].append(slot_data)

                if slot.use_map_alpha and material.use_nodes:
                    break

def process_particle_dupli_weights(dupli_weights_data, particle):
    for i in range(len(particle.dupli_weights)):
        obj = particle.dupli_group.objects[i]

        if do_export(obj) and object_is_valid(obj):
            weight = particle.dupli_weights[i]
            # when exporting via command line linked particles are exported wrong
            if weight.name == "No object":
                raise ExportError("Missing particles dupli weights in particle system.",
                        particle, "Exporting via command line linked particles are exported wrong")

            weight_data = OrderedDict()

            origin_name = "".join(weight.name.split(": ")[:-1])

            weight_data["name"] = origin_name + SUF_HAIR_DUPLI
            weight_data["count"] = weight.count
            dupli_weights_data.append(weight_data)

def round_num(n, level=0):
    #NOTE: clamping to protect from possible Infinity values
    n = max(-(2**31),min(n, 2**31 - 1))
    rounded = round(n, level)
    if rounded%1 == 0:
        rounded = math.trunc(rounded)
    return rounded

def round_iterable(num_list, level=0):
    return [round_num(item, level) for item in num_list]

def get_default_path(is_html=False):
    scene = bpy.data.scenes[0]
    ext = ""

    if is_html:
        if scene.b4w_export_path_html != "":
            return bpy.path.abspath(scene.b4w_export_path_html)
        ext = ".html"
    else:
        if scene.b4w_export_path_json != "":
            return bpy.path.abspath(scene.b4w_export_path_json)
        ext = ".json"

    abs_blend_path = os.path.splitext(bpy.data.filepath)[0]
    if len(abs_blend_path) == 0:
        return "untitled" + ext

    # try to find .b4w_project and detect assets path
    abs_blend_dir, blend_name = os.path.split(abs_blend_path)
    curr_abs_dir = abs_blend_dir

    sdk_path = addon_prefs.sdk_path()
    if addon_prefs.has_valid_sdk_path() and sdk_path in abs_blend_dir:
        while curr_abs_dir != sdk_path:
            proj_cfg_path = os.path.join(curr_abs_dir, ".b4w_project")
            if os.path.isfile(proj_cfg_path):
                global _proj_util_module
                if not _proj_util_module:
                    scripts_path = os.path.join(sdk_path, "scripts", "lib")
                    f, filename, description = imp.find_module('project_util', [scripts_path])
                    _proj_util_module = imp.load_module('project_util', f, filename, description)

                proj_cfg = _proj_util_module.get_proj_cfg(curr_abs_dir)
                proj_blend_dirs = _proj_util_module.proj_cfg_value(proj_cfg,
                        "paths", "blend_dirs", None) or [""]

                curr_proj_blend_dir = ""
                for proj_blend_dir in proj_blend_dirs:
                    abs_proj_blend_dir = os.path.join(sdk_path, proj_blend_dir)
                    if abs_proj_blend_dir in abs_blend_dir:
                        curr_proj_blend_dir = os.path.relpath(abs_blend_dir, abs_proj_blend_dir);
                        break

                proj_assets_dirs = _proj_util_module.proj_cfg_value(proj_cfg,
                        "paths", "assets_dirs", None) or [""]

                # NOTE: take only first
                abs_proj_assets_dir = os.path.join(sdk_path, proj_assets_dirs[0])
                dest_assets_path = os.path.join(abs_proj_assets_dir, curr_proj_blend_dir)
                while not os.path.isdir(dest_assets_path):
                    dest_assets_path = os.path.dirname(dest_assets_path)

                return os.path.join(dest_assets_path, blend_name) + ext
            else:
                curr_abs_dir = os.path.dirname(curr_abs_dir)

    # try to detect standard assets path 
    if addon_prefs.has_valid_sdk_path():
        sdk_blender_path = addon_prefs.sdk_path("blender")

        try:
            rel_filepath = os.path.relpath(abs_blend_path, sdk_blender_path)
        except ValueError as exp:
            # different disk
            pass
        else:
            if rel_filepath.find("..") == -1:
                assets_path = os.path.join(addon_prefs.sdk_path(), "deploy",
                        "assets", rel_filepath)
                if os.path.exists(os.path.dirname(assets_path)):
                    return assets_path + ext

    return abs_blend_path + ext

def set_default_path(path, is_html=False):
    if bpy.data.filepath != "":
        try:
            path = bpy.path.relpath(path)
        except ValueError as exp:
            _file_error = exp
            raise FileError("Export to different disk is forbidden")
    for i in range(len(bpy.data.scenes)):
        if is_html:
            bpy.data.scenes[i].b4w_export_path_html = guard_slashes(path)
        else:
            bpy.data.scenes[i].b4w_export_path_json = guard_slashes(path)

class B4W_ExportProcessor(bpy.types.Operator):
    """Export for Blend4Web (.json)"""
    bl_idname = "export_scene.b4w_json"
    bl_label = p_("B4W Export JSON", "Operator")

    filepath = bpy.props.StringProperty(subtype='FILE_PATH', default = "")

    do_autosave = bpy.props.BoolProperty(
        name = _("Autosave blend File"),
        description = _("Automatically save the blend file after export"),
        default = True
    )

    strict_mode = bpy.props.BoolProperty(
        name = _("Strict Mode"),
        description = _("Block export if there are any errors or warnings"),
        default = False
    )

    run_in_viewer = bpy.props.BoolProperty(
        name = _("Run in Viewer"),
        description = _("Open the exported scene in the Viewer using the default browser"),
        default = False
    )

    override_filepath = bpy.props.StringProperty(
        name = _("Filepath"),
        description = _("Required for running in command line"),
        default = ""
    )

    save_export_path = bpy.props.BoolProperty(
        name = _("Save export path"),
        description = _("Save export path in blend file"),
        default = True
    )

    is_html_export = bpy.props.BoolProperty(
        name = _("Is HTML export"),
        description = _("Is html export"),
        default = False
    )

    is_fast_preview = bpy.props.BoolProperty(
        name = _("Fast preview"),
        description = _("Fast preview"),
        default = False
    )

    def execute(self, context):
        if self.override_filepath:
            self.filepath = self.override_filepath

        # append .json if needed
        filepath_val = self.filepath
        if not filepath_val.lower().endswith(".json"):
            filepath_val += ".json"

        try:
            self.run(filepath_val)
            # uncomment to see profiler results
            #cProfile.runctx("self.run(filepath_val)", globals(), locals())
        except ExportError as error:
            global _export_error
            _export_error = error
            bpy.ops.b4w.export_error_dialog('INVOKE_DEFAULT')
            return {'CANCELLED'}
        except FileError as error:
            global _file_error
            _file_error = error
            bpy.ops.b4w.file_error_dialog('INVOKE_DEFAULT')
            return {'CANCELLED'}

        return {"FINISHED"}

    def invoke(self, context, event):
        self.filepath = get_default_path()
        wm = context.window_manager
        wm.fileselect_add(self)

        # NOTE: select all layers on all scenes to avoid non-updating issues
        # NOTE: do it before execution!!!
        scenes_store_select_all_layers()
        return {"RUNNING_MODAL"}

    def cancel(self, context):
        # NOTE: restore selected layers
        scenes_restore_selected_layers()

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "do_autosave")
        layout.prop(self, "strict_mode")

        file_path = context.space_data.params.directory
        path_to_sdk = bpy.context.user_preferences.addons[__package__].preferences.b4w_src_path
        path_to_sdk = os.path.abspath(path_to_sdk)
        try:
            rel_filepath = os.path.relpath(file_path, path_to_sdk)

            if (rel_filepath.find(os.pardir) == -1 and
                    server.B4WLocalServer.get_server_status() == server.SUB_THREAD_START_SERV_OK):
                layout.prop(self, "run_in_viewer")
            else:
                self.run_in_viewer = False
        except:
            self.run_in_viewer = False

    def run(self, export_filepath):
        global _bpy_bindata_int
        _bpy_bindata_int = bytearray();

        global _bpy_bindata_float
        _bpy_bindata_float = bytearray();

        global _bpy_bindata_short
        _bpy_bindata_short = bytearray();

        global _bpy_bindata_ushort
        _bpy_bindata_ushort = bytearray();

        global _bpy_bindata_uchar
        _bpy_bindata_uchar = bytearray();

        global _export_filepath
        _export_filepath = export_filepath

        global _export_data
        _export_data = OrderedDict()

        global _main_json_str
        _main_json_str = "{}"

        global _curr_stack
        _curr_stack = {
            "scenes"   : [],
            "object"   : [],
            "data"     : [],
            "material" : [],
            "texture"  : [],
        }

        global _fallback_camera
        _fallback_camera = None

        global _fallback_world
        _fallback_world = None

        global _fallback_material
        _fallback_material = None

        global _fallback_texture
        _fallback_texture = None

        global _default_material
        _default_material = None

        global _rendered_scenes
        _rendered_scenes = []

        global _export_uuid_cache
        _export_uuid_cache = {}

        global _bpy_uuid_cache
        _bpy_uuid_cache = {}

        global _overrided_meshes
        _overrided_meshes = []

        global _is_html_export
        _is_html_export = self.is_html_export

        global _is_fast_preview
        _is_fast_preview = self.is_fast_preview

        global _b4w_export_warnings
        _b4w_export_warnings = []

        global _b4w_export_errors
        _b4w_export_errors = []

        global _vehicle_integrity
        _vehicle_integrity = {}

        global _dupli_group_ids
        _dupli_group_ids = {}

        global _unique_packed_images
        _unique_packed_images = {}

        global _unique_packed_sounds
        _unique_packed_sounds = {}

        global _dg_counter
        _dg_counter = 0

        global _additional_scene_objects
        _additional_scene_objects = []

        global _file_write_error

        global _performed_cleanup
        _performed_cleanup = False

        # escape from edit mode
        if bpy.context.mode == "EDIT_MESH":
            bpy.ops.object.mode_set(mode="OBJECT")

        assign_do_not_export_flags()

        tags = [
            "actions",
            "images",
            "textures",
            "materials",
            "meshes",
            "armatures",
            "cameras",
            "curves",
            "lamps",
            "sounds",
            "speakers",
            "particles",
            "objects",
            "groups",
            "scenes",
            "worlds",
            "node_groups"
        ]

        # generate export data
        _export_data["b4w_format_version"] = blend4web.bl_info["b4w_format_version"]
        _export_data["b4w_filepath_blend"] = get_filepath_blend(export_filepath)



        attach_export_properties(tags)
        for scene in bpy.data.scenes:
            # NOTE: update all scenes to avoid issue with particle systems
            # not needed?
            # scene.update()
            check_dupli_groups(scene.objects, _dg_counter)
            _dg_counter += 1
        process_components(tags)
        detach_export_properties(tags)

        check_vehicle_integrity()

        if (not self.strict_mode or not _b4w_export_errors 
                    and not _b4w_export_warnings):
            _export_data["binaries"] = []
            binary_data = OrderedDict()
            if len(_bpy_bindata_int) + len(_bpy_bindata_float) \
                     + len(_bpy_bindata_short) + len(_bpy_bindata_ushort) \
                     + len(_bpy_bindata_uchar):
                base = os.path.splitext(os.path.basename(export_filepath))[0]
                binary_load_path = base + '.bin'
                base = os.path.splitext(export_filepath)[0]
                binary_export_path = base + '.bin'
                binary_data["binfile"] = binary_load_path
            else:
                binary_export_path = None
                binary_data["binfile"] = None
            binary_data["int"] = 0
            binary_data["float"] = len(_bpy_bindata_int)
            binary_data["short"] = binary_data["float"] + len(_bpy_bindata_float)
            binary_data["ushort"] = binary_data["short"] + len(_bpy_bindata_short)
            binary_data["uchar"] = binary_data["ushort"] + len(_bpy_bindata_ushort)
            _export_data["binaries"].append(binary_data)

            _export_data["b4w_export_warnings"] = _b4w_export_warnings
            _export_data["b4w_export_errors"] = _b4w_export_errors

            # NOTE: much faster than dumping immediately to file (json.dump())
            if JSON_PRETTY_PRINT:
                _main_json_str = json.dumps(_export_data, indent=2, separators=(',', ': '))
            else:
                _main_json_str = json.dumps(_export_data)

            if not _is_html_export:
                # write packed files (images, sounds) for non-html export
                packed_data = get_packed_data()
                for path in packed_data:
                    abs_path = os.path.join(os.path.dirname(export_filepath), path)
                    try:
                        f = open(abs_path, "wb")
                    except IOError as exp:
                        _file_error = exp
                        raise FileError("Permission denied")
                    else:
                        f.write(packed_data[path])
                        f.close()

                # write main binary and json files
                try:
                    f  = open(export_filepath, "w")
                    if binary_export_path is not None:
                        fb = open(binary_export_path, "wb")
                except IOError as exp:
                    _file_error = exp
                    raise FileError("Permission denied")
                else:
                    f.write(_main_json_str)
                    f.close()
                        
                    if not _is_fast_preview and self.save_export_path:
                        set_default_path(export_filepath)

                    print("Scene saved to " + export_filepath)

                    if binary_export_path is not None:
                        # NOTE: write data in this order (4-bit, 4-bit, 2-bit, 2-bit
                        # arrays) to simplify data loading
                        fb.write(get_b4w_bin_info())
                        fb.write(_bpy_bindata_int)
                        fb.write(_bpy_bindata_float)
                        fb.write(_bpy_bindata_short)
                        fb.write(_bpy_bindata_ushort)
                        fb.write(_bpy_bindata_uchar)
                        fb.close()

                    if self.run_in_viewer:
                        path_to_sdk = bpy.context.user_preferences.addons[__package__].preferences.b4w_src_path
                        path_to_viewer = os.path.join(path_to_sdk, os.path.dirname(PATH_TO_VIEWER))
                        relpath_to_viewer = os.path.relpath(export_filepath, path_to_viewer)
                        relpath_to_viewer = guard_slashes(os.path.normpath(relpath_to_viewer))

                        port = bpy.context.user_preferences.addons[__package__].preferences.b4w_port_number
                        url = "http://localhost:" + str(port) + "/" + PATH_TO_VIEWER + "?load=" + relpath_to_viewer
                        server.open_browser(url)
                    print("EXPORT OK")
        else:
            bpy.ops.b4w.export_messages_dialog('INVOKE_DEFAULT')

        clean_exported_data()

        if self.do_autosave:
            filepath = bpy.data.filepath
            if filepath:
                if os.access(filepath, os.W_OK):
                    try:
                        bpy.ops.wm.save_mainfile(filepath=filepath)
                    except Exception as e:
                        # NOTE: raising exception here leads to segfault
                        print("Could not autosave: " + str(e))
                    print("File autosaved to " + filepath)
                else:
                    print("Could not autosave: permission denied")
            else:
                print("Could not autosave: no file")

        return "exported"

def check_vehicle_integrity():
    for name in _vehicle_integrity:
        if _vehicle_integrity[name]["chassis"] is None \
                and _vehicle_integrity[name]["hull"] is None:
            ref_obj = None
            for prop in _vehicle_integrity[name]:
                if _vehicle_integrity[name][prop] is not None:
                    ref_obj = _vehicle_integrity[name][prop]
                    break
            if ref_obj is not None:
                err("Incomplete vehicle. " +
                        "The \"" + name + "\" vehicle doesn't have any chassis or hull")
                disable_vehicle(_vehicle_integrity[name])
        elif (_vehicle_integrity[name]["chassis"] is not None and
                    _vehicle_integrity[name]["fl_wheel"] is None and
                    _vehicle_integrity[name]["bl_wheel"] is None and
                    _vehicle_integrity[name]["fr_wheel"] is None and
                    _vehicle_integrity[name]["br_wheel"] is None):
            err("Incomplete vehicle. " +
                    "The \"" + name + "\" vehicle requires at least one wheel")
            disable_vehicle(_vehicle_integrity[name])
        elif _vehicle_integrity[name]["hull"] is not None \
                and _vehicle_integrity[name]["bob"] is None:
            err("Incomplete vehicle. " +
                    "The \"" + name + "\" vehicle requires at least one bob")
            disable_vehicle(_vehicle_integrity[name])

def disable_vehicle(vehicle_settings):
    vehicle_types = ["hull", "chassis", "bob", "other", "fl_wheel", "bl_wheel",
            "fr_wheel", "br_wheel", "steering_wheel", "speedometer", "tachometer"]
    for v_type in vehicle_types:
        if vehicle_settings[v_type]:
            vehicle_settings[v_type]["b4w_vehicle_settings"] = None
            vehicle_settings[v_type]["b4w_vehicle"] = False

# two objects with two different vert groups, but with one mesh
def check_shared_data(scenes):
    original_mesh_names = []
    for scene in scenes:
        for obj in scene.objects:
            if len(obj.vertex_groups):
                mesh = obj.data
                if mesh.name in original_mesh_names:
                    obj["force_to_mesh"] = True
                else:
                    original_mesh_names.append(mesh.name)

def create_fallback_camera(scene_data):
    global _fallback_camera

    camera_data = bpy.data.cameras.new("FALLBACK_CAMERA")
    _fallback_camera = bpy.data.objects.new(name="FALLBACK_CAMERA",
            object_data=camera_data)
    _fallback_camera["force_to_mesh"] = False
    view_3d_region = None
    screen_name = bpy.context.screen.name
    for area in bpy.data.screens[screen_name].areas:
        if area.type == "VIEW_3D":
            for space in area.spaces:
                if space.type == "VIEW_3D":
                    view_3d_region = space.region_3d
                    break

    if view_3d_region is None:
        for area in bpy.data.screens[screen_name].areas:
            for space in area.spaces:
                if space.type == "VIEW_3D":
                    view_3d_region = space.region_3d
                    break
            if view_3d_region is not None:
                break

    if view_3d_region is None:
        _fallback_camera.matrix_world = mathutils.Matrix.Identity(4)
        trans_vec = mathutils.Vector((0.0, 0.0, -10.00, 1.0))
        _fallback_camera.matrix_world = mathutils.Matrix.Translation(trans_vec)
    else:
        user_mode = view_3d_region.view_perspective
        view_3d_region.view_perspective = "PERSP"
        view_3d_region.update()
        _fallback_camera.matrix_world = view_3d_region.view_matrix
        _fallback_camera.matrix_world.invert()
        view_3d_region.view_perspective = user_mode

    uuid = process_object(_fallback_camera)
    scene_data["camera"] = uuid
    scene_data["objects"].append(uuid)
    

def create_fallback_world(scene_data):
    global _fallback_world

    _fallback_world = bpy.data.worlds.new("FALLBACK_WORLD")
    scene_data["world"] = gen_uuid_dict(_fallback_world)
    process_world(_fallback_world)

def check_scene_data(scene_data, scene):
    # need camera
    if scene_data["camera"] is None:
        create_fallback_camera(scene_data)
        warn("Missing active camera or wrong active camera object in " +\
              scene.name + ".", M_PRIMARY)

    if scene_data["world"] is None:
        create_fallback_world(scene_data)
        warn("Missing world or wrong active world object in " +\
              scene.name + ".", M_PRIMARY)

# NOTE: unused
def get_exported_obj_first_rec(objects, obj_type = "ALL"):
    for obj in objects:
        obj_data = _export_uuid_cache[obj["uuid"]]

        if obj_type == "ALL" or obj_data["type"] == obj_type:
            return obj_data

        if obj_data["dupli_group"] is not None:
            group_data = _export_uuid_cache[obj_data["dupli_group"]["uuid"]]
            res = get_exported_obj_first_rec(group_data["objects"], obj_type)
            if res is not None:
                return res
    return None

def check_object_data(obj_data, obj):
    # check wind bending vertex colors
    if obj_data["type"] == "MESH" and obj_data["b4w_wind_bending"]:
        detail_bend = obj_data["b4w_detail_bend_colors"]

        m_s_col = obj_data["b4w_main_bend_stiffness_col"]
        l_s_col = detail_bend["leaves_stiffness_col"]
        l_p_col = detail_bend["leaves_phase_col"]
        o_s_col = detail_bend["overall_stiffness_col"]
        colors = m_s_col + l_s_col + l_p_col + o_s_col
        detail_colors = l_s_col + l_p_col + o_s_col

        if colors != "" and (m_s_col == "" or detail_colors != "" and \
                (l_s_col == "" or l_p_col == "" or o_s_col == "")):
            obj_data["b4w_main_bend_stiffness_col"] = ""
            detail_bend["leaves_stiffness_col"] = ""
            detail_bend["leaves_phase_col"] = ""
            detail_bend["overall_stiffness_col"] = ""
            err("Wind bending: vertex colors weren't properly assigned for \"" + obj.name +
                                "\". Properties were set to default values.")

        if (not check_vertex_color_empty(obj.data, m_s_col) \
                or not check_vertex_color_empty(obj.data, l_s_col) \
                or not check_vertex_color_empty(obj.data, l_p_col) \
                or not check_vertex_color_empty(obj.data, o_s_col)):
            obj_data["b4w_main_bend_stiffness_col"] = ""
            detail_bend["leaves_stiffness_col"] = ""
            detail_bend["leaves_phase_col"] = ""
            detail_bend["overall_stiffness_col"] = ""
            err("Wind bending: not all vertex colors exist for \"" + obj.name +
                                "\". Properties were set to default values.")

    check_obj_particle_systems(obj_data, obj)

def check_obj_particle_systems(obj_data, obj):
    for i in range(len(obj_data["particle_systems"])):
        psys_data = obj_data["particle_systems"][i]
        pset_uuid = psys_data["settings"]["uuid"]
        pset_data = _export_uuid_cache[pset_uuid]

        pset = _bpy_uuid_cache[pset_data["uuid"]]

        if (pset_data["type"] == "HAIR" and pset_data["render_type"] != "OBJECT" 
                and pset_data["render_type"] != "GROUP"):
            err("Particle system error. Unsupported render type " 
                    + "\"%s\" for the HAIR particles " % pset_data["render_type"]
                    + "\"%s\" on object \"%s\"." % (psys_data["name"], obj.name)
                    + " Particle system removed.")
            obj_data["particle_systems"][i] = None
            continue

        if (pset_data["type"] == "EMITTER" and pset_data["render_type"] != "HALO" 
                and pset_data["render_type"] != "BILLBOARD"):
            err("Particle system error. Unsupported render type " 
                    + "\"%s\" for the EMITTER particles " % pset_data["render_type"]
                    + "\"%s\" on object \"%s\"." % (psys_data["name"], obj.name)
                    + " Particle system removed.")
            obj_data["particle_systems"][i] = None
            continue

        if not check_vertex_color_empty(obj.data, pset_data["b4w_vcol_from_name"]):
            err("Particle system error for \"" + pset.name +
                    "\" The \"" + pset_data["b4w_vcol_from_name"] +
                    "\" vertex color specified in the \"from\" field is " +
                    "missing in the list of the \"" + obj_data["name"]
                    + "\" object's vertex colors.")
            pset_data["b4w_vcol_from_name"] = ""

        if pset_data["render_type"] == "OBJECT":
            dobj_uuid = pset_data["dupli_object"]["uuid"]
            dobj_data = _export_uuid_cache[dobj_uuid]
            dobj = _bpy_uuid_cache[dobj_data["uuid"]]

            if not check_vertex_color_empty(dobj.data, pset_data["b4w_vcol_to_name"]):
                err("Particle system error for \"" + pset.name +
                        "\" The \"" + pset_data["b4w_vcol_to_name"] +
                        "\" vertex color specified in the \"to\" field is " +
                        "missing in the list of the \"" + dobj_data["name"]
                        + "\" object's vertex colors.")
                pset_data["b4w_vcol_to_name"] = ""

        elif pset_data["render_type"] == "GROUP":
            dg_uuid = pset_data["dupli_group"]["uuid"]
            dg_data = _export_uuid_cache[dg_uuid]

            for item in dg_data["objects"]:
                dgobj_data = _export_uuid_cache[item["uuid"]]
                dgobj = _bpy_uuid_cache[dgobj_data["uuid"]]

                if not check_vertex_color_empty(dgobj.data, pset_data["b4w_vcol_to_name"]):
                    err("Particle system error" + pset.name +
                            "\" The \"" + pset_data["b4w_vcol_to_name"] +
                            "\" vertex color specified in the \"to\" field is " +
                            "missing in the \"" + dgobj_data["name"] +
                            "\" object (\"" + dg_data["name"] + "\" dupli group).")
                    pset_data["b4w_vcol_to_name"] = ""

    obj_data["particle_systems"] = [ps for ps in obj_data["particle_systems"] if ps is not None]

def check_vertex_color_empty(mesh, vc_name):
    # Allow special case for empty vertex color layer name
    if vc_name == "":
        return True
    for color_layer in mesh.vertex_colors:
        if color_layer.name == vc_name:
            return True
    # no found
    return False

def get_uv_layer(mesh, uv_layer_name):
    if uv_layer_name == "":
        if mesh.uv_textures:
            return mesh_get_active_uv(mesh).name
        else:
            return ""

    return uv_layer_name

def get_vertex_color(mesh, vc_name):
    if vc_name == "":
        if mesh.vertex_colors:
            return mesh_get_active_vc(mesh).name
        else:
            return ""

    return vc_name

def check_tex_slot(tex_slot):
    tex = tex_slot.texture
    tc = tex_slot.texture_coords

    if tex and tex.type == "IMAGE" and (tc != "UV" and tc != "NORMAL"
            and tc != "ORCO"):
        raise MaterialError("Wrong texture coordinates type in texture \"" + tex.name + "\".")

def clean_exported_data():
    # NOTE: restore previous selected layers
    global _fallback_camera
    global _fallback_world
    global _fallback_material
    global _fallback_texture
    global _default_material
    global _performed_cleanup
    global _curr_stack

    if _performed_cleanup:
        return

    scenes_restore_selected_layers()
    if _fallback_camera:
        cam_data = _fallback_camera.data
        bpy.data.objects.remove(_fallback_camera)
        bpy.data.cameras.remove(cam_data)
        _fallback_camera = None
    if _fallback_world:
        bpy.data.worlds.remove(_fallback_world)
        _fallback_world = None
    if _fallback_material:
        bpy.data.materials.remove(_fallback_material)
        _fallback_material = None
    if _fallback_texture:
        bpy.data.textures.remove(_fallback_texture)
        _fallback_texture = None
    if _default_material:
        bpy.data.materials.remove(_default_material)
        _default_material = None

    _curr_stack = {
        "scenes"   : [],
        "object"   : [],
        "data"     : [],
        "material" : [],
        "texture"  : [],
    }

    remove_overrided_meshes()
    _performed_cleanup = True

class B4W_ExportPathGetter(bpy.types.Operator):
    """Get Export Path for blend file"""
    bl_idname = "b4w.get_export_path"
    bl_label = p_("B4W Get Export Path", "Operator")
    bl_options = {'INTERNAL'}

    def execute(self, context):

        print("B4W Export Path = " + get_default_path())

        return {"FINISHED"}


def b4w_export_menu_func(self, context):
    self.layout.operator(B4W_ExportProcessor.bl_idname, \
        text="Blend4Web (.json)").filepath = get_default_path()

def check_binaries():
    # NOTE: check if binary is available
    libname, path = binary_module_hook.get_binary_module_desc()
    try:
        m = imp.load_dynamic(libname, path)
    except BaseException as bin_err:
        print("Can't load Blend4Web binary module, the cause "
              "can be tmp directory, which doesn't allow execution. "
              "Try to change it in 'Blender User Preferences' "
              "('Temp' field on the 'File' tab.", file=sys.stderr)
        print("B4W binary error: exception text: '%s'" % bin_err, file=sys.stderr)
        m = None

    if not m:
        bpy.app.handlers.scene_update_pre.append(init_validation.bin_invalid_message)
    else:
        globals()["b4w_bin"] = m

def check_version():
    if (bpy.app.version[0] != blend4web.bl_info["blender"][0]
            or bpy.app.version[1] != blend4web.bl_info["blender"][1]):
        message = _("Blender %s is recommended for the Blend4Web addon. Current version is %s") % \
                  (".".join(map(str, blend4web.bl_info["blender"][:-1])), ".".join(map(str, bpy.app.version[:-1])))
        blend4web.init_mess.append(message)

def log_warnings():
    import sys
    for m in blend4web.init_mess:
        print("B4W Warning: %s" % m, file=sys.stderr)

def register():
    check_version()
    check_binaries()
    log_warnings()
    bpy.types.INFO_MT_file_export.append(b4w_export_menu_func)

def unregister():
    bpy.types.INFO_MT_file_export.remove(b4w_export_menu_func)
