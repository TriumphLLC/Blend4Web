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


#====================== BEGIN GPL LICENSE BLOCK ============================
#
#  This program is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 3 of the License, or
#  (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program.  If not, see <http://www.gnu.org/licenses/>.
#  All rights reserved.
#
#======================= END GPL LICENSE BLOCK =============================

import bpy
import sys
import os
from blend4web.translator import _, p_
import bl_ui
from bl_ui.properties_paint_common import UnifiedPaintPanel

_RENDER_PT_encoding = bpy.types.RENDER_PT_encoding

_OBJECT_PT_delta_transform = bpy.types.OBJECT_PT_delta_transform
_OBJECT_PT_transform_locks = bpy.types.OBJECT_PT_transform_locks
_OBJECT_PT_relations = bpy.types.OBJECT_PT_relations
#_OBJECT_PT_groups = bpy.types.OBJECT_PT_groups
#_OBJECT_PT_display = bpy.types.OBJECT_PT_display
_OBJECT_PT_duplication = bpy.types.OBJECT_PT_duplication
_OBJECT_PT_relations_extras = bpy.types.OBJECT_PT_relations_extras
_OBJECT_PT_motion_paths = bpy.types.OBJECT_PT_motion_paths
_OBJECT_PT_custom_props = bpy.types.OBJECT_PT_custom_props
_OBJECT_PT_constraints = bpy.types.OBJECT_PT_constraints

_BONE_PT_constraints   = bpy.types.BONE_PT_constraints

_DATA_PT_custom_props_curve = bpy.types.DATA_PT_custom_props_curve
_DATA_PT_custom_props_lattice = bpy.types.DATA_PT_custom_props_lattice
_DATA_PT_custom_props_arm = bpy.types.DATA_PT_custom_props_arm
_DATA_PT_custom_props_metaball = bpy.types.DATA_PT_custom_props_metaball

_PHYSICS_PT_add = bpy.types.PHYSICS_PT_add
_PHYSICS_PT_cloth = bpy.types.PHYSICS_PT_cloth
_PHYSICS_PT_cloth_collision = bpy.types.PHYSICS_PT_cloth_collision
_PHYSICS_PT_cloth_cache = bpy.types.PHYSICS_PT_cloth_cache
_PHYSICS_PT_cloth_stiffness = bpy.types.PHYSICS_PT_cloth_stiffness
_PHYSICS_PT_cloth_sewing = bpy.types.PHYSICS_PT_cloth_sewing
_PHYSICS_PT_cloth_field_weights = bpy.types.PHYSICS_PT_cloth_field_weights

_PHYSICS_PT_dynamic_paint = bpy.types.PHYSICS_PT_dynamic_paint
_PHYSICS_PT_dp_advanced_canvas = bpy.types.PHYSICS_PT_dp_advanced_canvas
_PHYSICS_PT_dp_canvas_output = bpy.types.PHYSICS_PT_dp_canvas_output
_PHYSICS_PT_dp_canvas_initial_color = bpy.types.PHYSICS_PT_dp_canvas_initial_color
_PHYSICS_PT_dp_effects = bpy.types.PHYSICS_PT_dp_effects
_PHYSICS_PT_dp_cache = bpy.types.PHYSICS_PT_dp_cache
_PHYSICS_PT_dp_brush_source = bpy.types.PHYSICS_PT_dp_brush_source
_PHYSICS_PT_dp_brush_velocity = bpy.types.PHYSICS_PT_dp_brush_velocity
_PHYSICS_PT_dp_brush_wave = bpy.types.PHYSICS_PT_dp_brush_wave

_PHYSICS_PT_field = bpy.types.PHYSICS_PT_field
_PHYSICS_PT_collision = bpy.types.PHYSICS_PT_collision

_PHYSICS_PT_fluid = bpy.types.PHYSICS_PT_fluid
_PHYSICS_PT_domain_gravity = bpy.types.PHYSICS_PT_domain_gravity
_PHYSICS_PT_domain_boundary = bpy.types.PHYSICS_PT_domain_boundary
_PHYSICS_PT_domain_particles = bpy.types.PHYSICS_PT_domain_particles

_PHYSICS_PT_rigid_body = bpy.types.PHYSICS_PT_rigid_body
_PHYSICS_PT_rigid_body_collisions = bpy.types.PHYSICS_PT_rigid_body_collisions
_PHYSICS_PT_rigid_body_dynamics = bpy.types.PHYSICS_PT_rigid_body_dynamics
_PHYSICS_PT_rigid_body_constraint = bpy.types.PHYSICS_PT_rigid_body_constraint

_PHYSICS_PT_smoke = bpy.types.PHYSICS_PT_smoke
_PHYSICS_PT_smoke_flow_advanced = bpy.types.PHYSICS_PT_smoke_flow_advanced
_PHYSICS_PT_smoke_fire = bpy.types.PHYSICS_PT_smoke_fire
_PHYSICS_PT_smoke_adaptive_domain = bpy.types.PHYSICS_PT_smoke_adaptive_domain
_PHYSICS_PT_smoke_highres = bpy.types.PHYSICS_PT_smoke_highres
_PHYSICS_PT_smoke_groups = bpy.types.PHYSICS_PT_smoke_groups
_PHYSICS_PT_smoke_cache = bpy.types.PHYSICS_PT_smoke_cache
_PHYSICS_PT_smoke_field_weights = bpy.types.PHYSICS_PT_smoke_field_weights

_PHYSICS_PT_softbody = bpy.types.PHYSICS_PT_softbody
_PHYSICS_PT_softbody_cache = bpy.types.PHYSICS_PT_softbody_cache
_PHYSICS_PT_softbody_goal = bpy.types.PHYSICS_PT_softbody_goal
_PHYSICS_PT_softbody_edge = bpy.types.PHYSICS_PT_softbody_edge
_PHYSICS_PT_softbody_collision = bpy.types.PHYSICS_PT_softbody_collision
_PHYSICS_PT_softbody_solver = bpy.types.PHYSICS_PT_softbody_solver
_PHYSICS_PT_softbody_field_weights = bpy.types.PHYSICS_PT_softbody_field_weights

_VIEW3D_PT_tools_rigid_body = bpy.types.VIEW3D_PT_tools_rigid_body

_VIEW3D_HT_header_draw = bpy.types.VIEW3D_HT_header.draw
_INFO_MT_render_draw = bpy.types.INFO_MT_render.draw
_INFO_MT_help_draw = bpy.types.INFO_MT_help.draw

# should bee used for all Blend4Web panels
# if no COMPAT_ENGINES in Panel class
# then returns true, else looks for current engine in COMPAT_ENGINES
def base_poll(cls, context):
    if hasattr(cls,"COMPAT_ENGINES"):
        engine = context.scene.render.engine
        matching = [e for e in cls.COMPAT_ENGINES if engine in e]
        return matching
    else:
        return True

# Using native Blender Internal render engine because no
# render methods are implemented here
class B4WRenderEngine(bpy.types.RenderEngine):
    bl_idname = 'BLEND4WEB'
    bl_label = 'Blend4Web'
    bl_use_preview = False
    # use old shading nodes, game and internal
    # capabilities
    bl_use_shading_nodes = False
    bl_use_native_node_tree = True
    bl_use_shading_nodes_custom = False

# Supported panels
# Please keep unsupported panels as commented lines,
# it helps a little
def get_supported_native_panels():
    types = bpy.types
    panels = [
        "MATERIAL_PT_context_material",
        # "MATERIAL_MT_specials",
        # "MATERIAL_UL_matslots",
        "MATERIAL_PT_preview",
        # "MATERIAL_PT_pipeline",
        # "MATERIAL_PT_diffuse",
        # "MATERIAL_PT_specular",
        # "MATERIAL_PT_shading",
        # "MATERIAL_PT_transp",
        # "MATERIAL_PT_mirror",
        # "MATERIAL_PT_sss",
        # "MATERIAL_PT_halo",
        # "MATERIAL_PT_flare",
        # "MATERIAL_PT_game_settings",
        # "MATERIAL_PT_physics",
        # "MATERIAL_PT_strand",
        # "MATERIAL_PT_options",
        # "MATERIAL_PT_shadow",
        # "MATERIAL_PT_transp_game",
        # "MATERIAL_PT_volume_density",
        # "MATERIAL_PT_volume_shading",
        # "MATERIAL_PT_volume_lighting",
        # "MATERIAL_PT_volume_transp",
        # "MATERIAL_PT_volume_integration",
        # "MATERIAL_PT_volume_options",
        # "MATERIAL_PT_custom_props",
        # "MATERIAL_PT_freestyle_line",
        # "BONE_PT_custom_props",
        "CAMERA_MT_presets",
        "SAFE_AREAS_MT_presets",
        # "DATA_PT_custom_props_arm",
        "DATA_PT_context_camera",
        "DATA_PT_lens",
        # "DATA_PT_camera",
        # "DATA_PT_camera_dof",
        "DATA_PT_camera_display",
        # "DATA_PT_camera_safe_areas",
        # "DATA_PT_custom_props_camera",
        "DATA_PT_curve_texture_space",
        # "DATA_PT_custom_props_curve",
        "DATA_PT_context_lamp",
        "DATA_PT_preview",
        # "DATA_PT_lamp",
        # "DATA_PT_sunsky",
        # "DATA_PT_shadow",
        # "DATA_PT_area",
        # "DATA_PT_spot",
        # "DATA_PT_falloff_curve",
        #"DATA_PT_custom_props_lamp",
        #"DATA_PT_custom_props_lattice",
        "DATA_PT_context_mesh",
        # "DATA_PT_normals",
        # "DATA_PT_texture_space",
        "DATA_PT_vertex_groups",
        # "DATA_PT_shape_keys",
        "DATA_PT_uv_texture",
        "DATA_PT_vertex_colors",
        "DATA_PT_customdata",
        # "DATA_PT_custom_props_mesh",
        "DATA_PT_mball_texture_space",
        # "DATA_PT_custom_props_metaball",
        "DATA_PT_context_speaker",
        # "DATA_PT_speaker",
        # "DATA_PT_distance",
        # "DATA_PT_cone",
        # "DATA_PT_custom_props_speaker",
        # "LAMP_MT_sunsky_presets",
        "MESH_MT_vertex_group_specials",
        "MESH_MT_shape_key_specials",
        # "RENDER_PT_freestyle",
        # "RENDERLAYER_PT_freestyle",
        # "RENDERLAYER_PT_freestyle_lineset",
        # "RENDERLAYER_PT_freestyle_linestyle",
        # "RENDER_PT_embedded",
        # "RENDER_PT_game_player",
        # "RENDER_PT_game_stereo",
        # "RENDER_PT_game_shading",
        # "RENDER_PT_game_system",
        # "RENDER_PT_game_display",
        # "RENDER_PT_render",
        # "RENDER_PT_dimensions",
        # "RENDER_PT_antialiasing",
        # "RENDER_PT_motion_blur",
        # "RENDER_PT_shading",
        # "RENDER_PT_performance",
        # "RENDER_PT_post_processing",
        # "RENDER_PT_stamp",
        # "RENDER_PT_output",
        # "RENDER_PT_encoding",
        # "RENDER_PT_bake",
        # "DATA_PT_shadow_game",
        # "OBJECT_PT_levels_of_detail",
        "PARTICLE_MT_specials",
        # "PARTICLE_MT_hair_dynamics_presets",
        # "PARTICLE_PT_context_particles",
        # "PARTICLE_PT_emission",
        # "PARTICLE_PT_hair_dynamics",
        # "PARTICLE_PT_cache",
        # "PARTICLE_PT_velocity",
        # "PARTICLE_PT_rotation",
        # "PARTICLE_PT_physics",
        # "PARTICLE_PT_boidbrain",
        # "PARTICLE_PT_render",
        # "PARTICLE_PT_draw",
        # "PARTICLE_PT_children",
        # "PARTICLE_PT_field_weights",
        # "PARTICLE_PT_force_fields",
        # "PARTICLE_PT_vertexgroups",
        # "PARTICLE_PT_custom_props",                                 
        # "SCENE_PT_scene",
        # "SCENE_PT_unit",
        # "SCENE_PT_keying_sets",
        # "SCENE_PT_keying_set_paths",
        # "SCENE_PT_color_management",
        # "SCENE_PT_audio",
        # "SCENE_PT_physics",
        # "SCENE_PT_rigid_body_world",
        "SCENE_PT_game_navmesh",
        # "SCENE_PT_rigid_body_cache",
        # "SCENE_PT_rigid_body_field_weights",
        # "SCENE_PT_simplify",
        # "SCENE_PT_custom_props",

        #"PHYSICS_PT_game_physics",
        #"PHYSICS_PT_game_collision_bounds",
        #"PHYSICS_PT_game_obstacles",
        "TEXTURE_MT_specials",
        "TEXTURE_MT_envmap_specials",
        "TEXTURE_PT_context_texture",
        # "TEXTURE_PT_preview",
        # "TEXTURE_PT_colors",
        # "TEXTURE_PT_clouds",
        # "TEXTURE_PT_wood",
        # "TEXTURE_PT_marble",
        # "TEXTURE_PT_magic",
        # "TEXTURE_PT_blend",
        # "TEXTURE_PT_stucci",
        # "TEXTURE_PT_image",
        # "TEXTURE_PT_image_sampling",
        # "TEXTURE_PT_image_mapping",
        # "TEXTURE_PT_envmap",
        # "TEXTURE_PT_envmap_sampling",
        # "TEXTURE_PT_musgrave",
        # "TEXTURE_PT_voronoi",
        # "TEXTURE_PT_distortednoise",
        # "TEXTURE_PT_voxeldata",
        # "TEXTURE_PT_pointdensity",
        # "TEXTURE_PT_pointdensity_turbulence",
        # "TEXTURE_PT_ocean",
        # "TEXTURE_PT_mapping",
        # "TEXTURE_PT_influence",
        # "TEXTURE_PT_custom_props",

        # "WORLD_PT_game_context_world",
        # "WORLD_PT_game_world",
        # "WORLD_PT_game_mist",
        # "WORLD_PT_game_physics",
        # "WORLD_PT_game_physics_obstacles",
        "WORLD_PT_context_world",
        "WORLD_PT_preview",
        # "WORLD_PT_world",
        # "WORLD_PT_ambient_occlusion",
        # "WORLD_PT_environment_lighting",
        # "WORLD_PT_indirect_lighting",
        # "WORLD_PT_gather",
        # "WORLD_PT_mist",
        # "WORLD_PT_custom_props"
        ]
    return [getattr(types, p) for p in panels if hasattr(types, p)]

def custom_poll(context):
    matching = "BLEND4WEB" not in context.scene.render.engine
    return  context.object and matching

class OBJECT_PT_delta_transform_new(bpy.types.OBJECT_PT_delta_transform):
    @classmethod
    def poll(cls, context):
        return custom_poll(context)
class OBJECT_PT_transform_locks_new(bpy.types.OBJECT_PT_transform_locks):
    @classmethod
    def poll(cls, context):
        return custom_poll(context)
class OBJECT_PT_relations_new(bpy.types.OBJECT_PT_relations):
    @classmethod
    def poll(cls, context):
        return custom_poll(context)
# class OBJECT_PT_groups_new(bpy.types.OBJECT_PT_groups):
#     @classmethod
#     def poll(cls, context):
#         return custom_poll(context)
# class OBJECT_PT_display_new(bpy.types.OBJECT_PT_display):
#     @classmethod
#     def poll(cls, context):
#         return custom_poll(context)
class OBJECT_PT_duplication_new(bpy.types.OBJECT_PT_duplication):
    @classmethod
    def poll(cls, context):
        return custom_poll(context)
class OBJECT_PT_relations_extras_new(bpy.types.OBJECT_PT_relations_extras):
    @classmethod
    def poll(cls, context):
        return custom_poll(context)
class OBJECT_PT_motion_paths_new(bpy.types.OBJECT_PT_motion_paths):
    @classmethod
    def poll(cls, context):
        return custom_poll(context)
class OBJECT_PT_custom_props_new(bpy.types.OBJECT_PT_custom_props):
    @classmethod
    def poll(cls, context):
        return custom_poll(context)
class OBJECT_PT_constraints_new(bpy.types.OBJECT_PT_constraints):
    @classmethod
    def poll(cls, context):
        return custom_poll(context)
class BONE_PT_constraints_new(bpy.types.BONE_PT_constraints):
    @classmethod
    def poll(cls, context):
        return custom_poll(context)

class PHYSICS_PT_add_new(bpy.types.PHYSICS_PT_add):
    @classmethod
    def poll(cls, context):
        rd = context.scene.render
        return not rd.use_game_engine and custom_poll(context)

class RENDER_PT_encoding_new(bpy.types.RENDER_PT_encoding):
    @classmethod
    def poll(cls, context):
        rd = context.scene.render
        return (rd.image_settings.file_format in {'FFMPEG', 'XVID', 'H264', 'THEORA'}
               and "BLEND4WEB" not in context.scene.render.engine)

# cloth physics panels
def custom_cloth_poll(context):
    ob = context.object
    rd = context.scene.render
    matching = "BLEND4WEB" not in context.scene.render.engine
    return (ob and ob.type == 'MESH') and (not rd.use_game_engine) \
           and (context.cloth) and custom_poll(context) and matching
class PHYSICS_PT_cloth_new(bpy.types.PHYSICS_PT_cloth):
    @classmethod
    def poll(cls, context):
        return custom_cloth_poll(context)
class PHYSICS_PT_cloth_collision_new(bpy.types.PHYSICS_PT_cloth_collision):
    @classmethod
    def poll(cls, context):
        return custom_cloth_poll(context)
class PHYSICS_PT_cloth_cache_new(bpy.types.PHYSICS_PT_cloth_cache):
    @classmethod
    def poll(cls, context):
        return custom_cloth_poll(context)
class PHYSICS_PT_cloth_stiffness_new(bpy.types.PHYSICS_PT_cloth_stiffness):
    @classmethod
    def poll(cls, context):
        return custom_cloth_poll(context)
class PHYSICS_PT_cloth_sewing_new(bpy.types.PHYSICS_PT_cloth_sewing):
    @classmethod
    def poll(cls, context):
        return custom_cloth_poll(context)
class PHYSICS_PT_cloth_field_weights_new(bpy.types.PHYSICS_PT_cloth_field_weights):
    @classmethod
    def poll(cls, context):
        return custom_cloth_poll(context)

# dyn paint physics panels
def custom_dyn_paint_poll(context):
    ob = context.object
    rd = context.scene.render
    matching = "BLEND4WEB" not in context.scene.render.engine
    return ((ob and ob.type == 'MESH') and (not rd.use_game_engine)
            and context.dynamic_paint and matching)

class PHYSICS_PT_dynamic_paint_new(bpy.types.PHYSICS_PT_dynamic_paint):
    @classmethod
    def poll(cls, context):
        return custom_dyn_paint_poll(context)
class PHYSICS_PT_dp_advanced_canvas_new(bpy.types.PHYSICS_PT_dp_advanced_canvas):
    @classmethod
    def poll(cls, context):
        md = context.dynamic_paint
        rd = context.scene.render
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (md and md.ui_type == 'CANVAS' and md.canvas_settings
                and md.canvas_settings.canvas_surfaces.active
                and (not rd.use_game_engine) and matching)
class PHYSICS_PT_dp_canvas_output_new(bpy.types.PHYSICS_PT_dp_canvas_output):
    @classmethod
    def poll(cls, context):
        md = context.dynamic_paint
        rd = context.scene.render
        if not (md and md.ui_type == 'CANVAS' and md.canvas_settings):
            return 0
        surface = context.dynamic_paint.canvas_settings.canvas_surfaces.active
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (surface and
                (not (surface.surface_format == 'VERTEX' and (surface.surface_type in {'DISPLACE', 'WAVE'}))) and
                (not rd.use_game_engine) and matching)
class PHYSICS_PT_dp_canvas_initial_color_new(bpy.types.PHYSICS_PT_dp_canvas_initial_color):
    @classmethod
    def poll(cls, context):
        md = context.dynamic_paint
        rd = context.scene.render
        if not (md and md.ui_type == 'CANVAS' and md.canvas_settings):
            return 0
        surface = context.dynamic_paint.canvas_settings.canvas_surfaces.active
        matching = "BLEND4WEB" not in context.scene.render.engine
        return ((surface and surface.surface_type == 'PAINT') and (not
                rd.use_game_engine) and matching)
class PHYSICS_PT_dp_effects_new(bpy.types.PHYSICS_PT_dp_effects):
    @classmethod
    def poll(cls, context):
        md = context.dynamic_paint
        rd = context.scene.render
        if not (md and md.ui_type == 'CANVAS' and md.canvas_settings):
            return False
        surface = context.dynamic_paint.canvas_settings.canvas_surfaces.active
        matching = "BLEND4WEB" not in context.scene.render.engine
        return ((surface and surface.surface_type == 'PAINT')
                and (not rd.use_game_engine) and matching)
class PHYSICS_PT_dp_cache_new(bpy.types.PHYSICS_PT_dp_cache):
    @classmethod
    def poll(cls, context):
        md = context.dynamic_paint
        rd = context.scene.render
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (md and
                md.ui_type == 'CANVAS' and
                md.canvas_settings and
                md.canvas_settings.canvas_surfaces.active and
                md.canvas_settings.canvas_surfaces.active.is_cache_user and
                (not rd.use_game_engine)
                and matching)
class PHYSICS_PT_dp_brush_source_new(bpy.types.PHYSICS_PT_dp_brush_source):
    @classmethod
    def poll(cls, context):
        md = context.dynamic_paint
        rd = context.scene.render
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (md and md.ui_type == 'BRUSH' and md.brush_settings
                and (not rd.use_game_engine) and matching)
class PHYSICS_PT_dp_brush_velocity_new(bpy.types.PHYSICS_PT_dp_brush_velocity):
    @classmethod
    def poll(cls, context):
        md = context.dynamic_paint
        rd = context.scene.render
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (md and md.ui_type == 'BRUSH' and md.brush_settings
                and (not rd.use_game_engine) and matching)
class PHYSICS_PT_dp_brush_wave_new(bpy.types.PHYSICS_PT_dp_brush_wave):
    @classmethod
    def poll(cls, context):
        md = context.dynamic_paint
        rd = context.scene.render
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (md and md.ui_type == 'BRUSH' and md.brush_settings and (not
                rd.use_game_engine) and matching)

# field
class PHYSICS_PT_field_new(bpy.types.PHYSICS_PT_field):
    @classmethod
    def poll(cls, context):
        ob = context.object
        rd = context.scene.render
        matching = "BLEND4WEB" not in context.scene.render.engine
        return ((not rd.use_game_engine) and (ob.field)
                and (ob.field.type != 'NONE') and matching)
class PHYSICS_PT_collision_new(bpy.types.PHYSICS_PT_collision):
    @classmethod
    def poll(cls, context):
        ob = context.object
        rd = context.scene.render
        matching = "BLEND4WEB" not in context.scene.render.engine
        return ((ob and ob.type == 'MESH') and (not rd.use_game_engine)
                and (context.collision) and matching)
class PHYSICS_PT_fluid_new(bpy.types.PHYSICS_PT_fluid):
    @classmethod
    def poll(cls, context):
        ob = context.object
        rd = context.scene.render
        matching = "BLEND4WEB" not in context.scene.render.engine
        return ((ob and ob.type == 'MESH') and (not rd.use_game_engine)
                and (context.fluid) and matching)
class PHYSICS_PT_domain_gravity_new(bpy.types.PHYSICS_PT_domain_gravity):
    @classmethod
    def poll(cls, context):
        md = context.fluid
        rd = context.scene.render
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (md and md.settings and (md.settings.type == 'DOMAIN')
               and (not rd.use_game_engine) and matching)
class PHYSICS_PT_domain_boundary_new(bpy.types.PHYSICS_PT_domain_boundary):
    @classmethod
    def poll(cls, context):
        md = context.fluid
        rd = context.scene.render
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (md and md.settings and (md.settings.type == 'DOMAIN')
                and (not rd.use_game_engine) and matching)
class PHYSICS_PT_domain_particles_new(bpy.types.PHYSICS_PT_domain_particles):
    @classmethod
    def poll(cls, context):
        md = context.fluid
        rd = context.scene.render
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (md and md.settings and (md.settings.type == 'DOMAIN')
                and (not rd.use_game_engine) and matching)

# rigidbody
class PHYSICS_PT_rigid_body_new(bpy.types.PHYSICS_PT_rigid_body):
    @classmethod
    def poll(cls, context):
        obj = context.object
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (obj and obj.rigid_body and
                (not context.scene.render.use_game_engine) and matching)
class PHYSICS_PT_rigid_body_collisions_new(bpy.types.PHYSICS_PT_rigid_body_collisions):
    @classmethod
    def poll(cls, context):
        obj = context.object
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (obj and obj.rigid_body and
                (not context.scene.render.use_game_engine) and matching)
class PHYSICS_PT_rigid_body_dynamics_new(bpy.types.PHYSICS_PT_rigid_body_dynamics):
    @classmethod
    def poll(cls, context):
        obj = context.object
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (obj and obj.rigid_body and
                obj.rigid_body.type == 'ACTIVE' and
                (not context.scene.render.use_game_engine) and matching)
class PHYSICS_PT_rigid_body_constraint_new(bpy.types.PHYSICS_PT_rigid_body_constraint):
    @classmethod
    def poll(cls, context):
        ob = context.object
        rd = context.scene.render
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (ob and ob.rigid_body_constraint and (not rd.use_game_engine)
                and matching)

class PHYSICS_PT_smoke_new(bpy.types.PHYSICS_PT_smoke):
    @classmethod
    def poll(cls, context):
        ob = context.object
        rd = context.scene.render
        matching = "BLEND4WEB" not in context.scene.render.engine
        return ((ob and ob.type == 'MESH') and (not rd.use_game_engine)
                and matching and (context.smoke))
class PHYSICS_PT_smoke_flow_advanced_new(bpy.types.PHYSICS_PT_smoke_flow_advanced):
    @classmethod
    def poll(cls, context):
        md = context.smoke
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (md and (md.smoke_type == 'FLOW') and
                (md.flow_settings.smoke_flow_source == 'MESH') and matching)
class PHYSICS_PT_smoke_fire_new(bpy.types.PHYSICS_PT_smoke_fire):
    @classmethod
    def poll(cls, context):
        md = context.smoke
        matching = "BLEND4WEB" not in context.scene.render.engine
        return md and (md.smoke_type == 'DOMAIN') and matching
class PHYSICS_PT_smoke_adaptive_domain_new(bpy.types.PHYSICS_PT_smoke_adaptive_domain):
    @classmethod
    def poll(cls, context):
        md = context.smoke
        matching = "BLEND4WEB" not in context.scene.render.engine
        return md and (md.smoke_type == 'DOMAIN') and matching
class PHYSICS_PT_smoke_highres_new(bpy.types.PHYSICS_PT_smoke_highres):
    @classmethod
    def poll(cls, context):
        md = context.smoke
        rd = context.scene.render
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (md and (md.smoke_type == 'DOMAIN') and
                (not rd.use_game_engine) and matching)
class PHYSICS_PT_smoke_groups_new(bpy.types.PHYSICS_PT_smoke_groups):
    @classmethod
    def poll(cls, context):
        md = context.smoke
        rd = context.scene.render
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (md and (md.smoke_type == 'DOMAIN') and (not rd.use_game_engine)
                and matching)
class PHYSICS_PT_smoke_cache_new(bpy.types.PHYSICS_PT_smoke_cache):
    @classmethod
    def poll(cls, context):
        md = context.smoke
        rd = context.scene.render
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (md and (md.smoke_type == 'DOMAIN') and (not rd.use_game_engine)
                and matching)
class PHYSICS_PT_smoke_field_weights_new(bpy.types.PHYSICS_PT_smoke_field_weights):
    @classmethod
    def poll(cls, context):
        md = context.smoke
        rd = context.scene.render
        matching = "BLEND4WEB" not in context.scene.render.engine
        return (md and (md.smoke_type == 'DOMAIN') and (not rd.use_game_engine)
                and matching)

def custom_softbody_poll(context):
    ob = context.object
    rd = context.scene.render
    matching = "BLEND4WEB" not in context.scene.render.engine
    return (ob and (ob.type == 'MESH' or ob.type == 'LATTICE'or ob.type == 'CURVE')
            and (not rd.use_game_engine) and (context.soft_body) and matching)

# softbody
class PHYSICS_PT_softbody_new(bpy.types.PHYSICS_PT_softbody):
    @classmethod
    def poll(cls, context):
        return custom_softbody_poll(context)
class PHYSICS_PT_softbody_cache_new(bpy.types.PHYSICS_PT_softbody_cache):
    @classmethod
    def poll(cls, context):
        return custom_softbody_poll(context)
class PHYSICS_PT_softbody_goal_new(bpy.types.PHYSICS_PT_softbody_goal):
    @classmethod
    def poll(cls, context):
        return custom_softbody_poll(context)
class PHYSICS_PT_softbody_edge_new(bpy.types.PHYSICS_PT_softbody_edge):
    @classmethod
    def poll(cls, context):
        return custom_softbody_poll(context)
class PHYSICS_PT_softbody_collision_new(bpy.types.PHYSICS_PT_softbody_collision):
    @classmethod
    def poll(cls, context):
        return custom_softbody_poll(context)
class PHYSICS_PT_softbody_solver_new(bpy.types.PHYSICS_PT_softbody_solver):
    @classmethod
    def poll(cls, context):
        return custom_softbody_poll(context)
class PHYSICS_PT_softbody_field_weights_new(bpy.types.PHYSICS_PT_softbody_field_weights):
    @classmethod
    def poll(cls, context):
        return custom_softbody_poll(context)
class VIEW3D_PT_tools_rigid_body_new(bpy.types.VIEW3D_PT_tools_rigid_body):
    @classmethod
    def poll(cls, context):
        return "BLEND4WEB" not in context.scene.render.engine

def LOGIC_HT_header_append(self, context):
    if "BLEND4WEB" in context.scene.render.engine:
        layout = self.layout.row(align=True)
        layout.label(_("Not available in Blend4Web. Please use the Node Editor."), icon = 'ERROR')
        layout.operator(
                "wm.url_open", text="Logic Editor Documentation", icon='URL',
                ).url = _("https://www.blend4web.com/doc/en/logic_editor.html")

def NOT_AVAILABLE_header_append(self, context):
    if "BLEND4WEB" in context.scene.render.engine:
        layout = self.layout.row(align=True)
        layout.label(_("This editor is not available in Blend4Web."), icon = 'ERROR')

def B4W_Splash(self, context):
    global custom_icons
    row = self.layout.row(align=True)
    row.label("Blend4Web version: %s.%s.%s" % sys.modules["blend4web"].bl_info['version'],
                 icon_value=custom_icons["b4w_icon"].icon_id)
    row = self.layout.row()
    row.label("")

def INFO_MT_render_draw_new(self, context):
    global custom_icons
    if "BLEND4WEB" not in context.scene.render.engine:
         _INFO_MT_render_draw(self, context)
    else:
        layout = self.layout
        layout.operator("b4w.preview",
                        text=_("Fast Preview"), icon_value=custom_icons["b4w_icon"].icon_id)

def INFO_MT_help_draw_new(self, context):
    if "BLEND4WEB" not in context.scene.render.engine:
        _INFO_MT_help_draw(self, context)
    else:
        layout = self.layout
        layout.operator("wm.url_open", text=_("Blend4Web Manual"), text_ctxt="*",
                icon='HELP').url = bpy.app.translations.pgettext_iface(
                _("https://www.blend4web.com/doc/en/index.html"))
        layout.operator("wm.url_open", text=_("API Reference"), text_ctxt="*",
                icon='HELP').url = "https://www.blend4web.com/api_doc/index.html"
        layout.operator("wm.url_open", text=_("Release Notes"), text_ctxt="*",
                icon='URL').url = bpy.app.translations.pgettext_iface(
                _("https://www.blend4web.com/doc/en/release_notes.html"))

        layout.separator()

        layout.operator("wm.url_open", text=_("Blend4Web Website"), text_ctxt="*",
                icon='URL').url = "https://www.blend4web.com"
        layout.operator("wm.url_open", text=_("Community Forums"), text_ctxt="*",
                icon='URL',).url = bpy.app.translations.pgettext_iface(
                _("https://www.blend4web.com/en/forums/"))

        layout.separator()

        layout.operator("wm.url_open", text=_("Report a Bug"), text_ctxt="*",
                icon='URL').url = bpy.app.translations.pgettext_iface(
                _("https://www.blend4web.com/en/forums/forum/17/"))

        layout.separator()

        layout.operator("wm.splash", icon='BLENDER')

def VIEW3D_HT_header_draw_new(self, context):
    if "BLEND4WEB" not in context.scene.render.engine:
        _VIEW3D_HT_header_draw(self, context)
    else:
        layout = self.layout

        view = context.space_data
        # mode_string = context.mode
        obj = context.active_object
        toolsettings = context.tool_settings

        row = layout.row(align=True)
        row.template_header()

        bpy.types.VIEW3D_MT_editor_menus.draw_collapsible(context, layout)

        # Contains buttons like Mode, Pivot, Manipulator, Layer, Mesh Select Mode...
        row = layout
        layout.template_header_3D()

        if obj:
            mode = obj.mode
            # Particle edit
            if mode == 'PARTICLE_EDIT':
                row.prop(toolsettings.particle_edit, "select_mode", text="", expand=True)

            # Occlude geometry
            if ((view.viewport_shade not in {'BOUNDBOX', 'WIREFRAME'} and (mode == 'PARTICLE_EDIT' or (mode == 'EDIT' and obj.type == 'MESH'))) or
                    (mode == 'WEIGHT_PAINT')):
                row.prop(view, "use_occlude_geometry", text="")

            # Proportional editing
            if context.gpencil_data and context.gpencil_data.use_stroke_edit_mode:
                row = layout.row(align=True)
                row.prop(toolsettings, "proportional_edit", icon_only=True)
                if toolsettings.proportional_edit != 'DISABLED':
                    row.prop(toolsettings, "proportional_edit_falloff", icon_only=True)
            elif mode in {'EDIT', 'PARTICLE_EDIT'}:
                row = layout.row(align=True)
                row.prop(toolsettings, "proportional_edit", icon_only=True)
                if toolsettings.proportional_edit != 'DISABLED':
                    row.prop(toolsettings, "proportional_edit_falloff", icon_only=True)
            elif mode == 'OBJECT':
                row = layout.row(align=True)
                row.prop(toolsettings, "use_proportional_edit_objects", icon_only=True)
                if toolsettings.use_proportional_edit_objects:
                    row.prop(toolsettings, "proportional_edit_falloff", icon_only=True)
        else:
            # Proportional editing
            if context.gpencil_data and context.gpencil_data.use_stroke_edit_mode:
                row = layout.row(align=True)
                row.prop(toolsettings, "proportional_edit", icon_only=True)
                if toolsettings.proportional_edit != 'DISABLED':
                    row.prop(toolsettings, "proportional_edit_falloff", icon_only=True)

        # Snap
        show_snap = False
        if obj is None:
            show_snap = True
        else:
            if mode not in {'SCULPT', 'VERTEX_PAINT', 'WEIGHT_PAINT', 'TEXTURE_PAINT'}:
                show_snap = True
            else:
                paint_settings = UnifiedPaintPanel.paint_settings(context)
                if paint_settings:
                    brush = paint_settings.brush
                    if brush and brush.stroke_method == 'CURVE':
                        show_snap = True

        if show_snap:
            snap_element = toolsettings.snap_element
            row = layout.row(align=True)
            row.prop(toolsettings, "use_snap", text="")
            row.prop(toolsettings, "snap_element", icon_only=True)
            if snap_element == 'INCREMENT':
                row.prop(toolsettings, "use_snap_grid_absolute", text="")
            else:
                row.prop(toolsettings, "snap_target", text="")
                if obj:
                    if mode == 'EDIT':
                        row.prop(toolsettings, "use_snap_self", text="")
                    if mode in {'OBJECT', 'POSE', 'EDIT'} and snap_element != 'VOLUME':
                        row.prop(toolsettings, "use_snap_align_rotation", text="")

            if snap_element == 'VOLUME':
                row.prop(toolsettings, "use_snap_peel_object", text="")
            elif snap_element == 'FACE':
                row.prop(toolsettings, "use_snap_project", text="")

        # AutoMerge editing
        if obj:
            if (mode == 'EDIT' and obj.type == 'MESH'):
                layout.prop(toolsettings, "use_mesh_automerge", text="", icon='AUTOMERGE_ON')

        # Pose
        if obj and mode == 'POSE':
            row = layout.row(align=True)
            row.operator("pose.copy", text="", icon='COPYDOWN')
            row.operator("pose.paste", text="", icon='PASTEDOWN').flipped = False
            row.operator("pose.paste", text="", icon='PASTEFLIPDOWN').flipped = True

        # GPencil
        if context.gpencil_data and context.gpencil_data.use_stroke_edit_mode:
            row = layout.row(align=True)
            row.operator("gpencil.copy", text="", icon='COPYDOWN')
            row.operator("gpencil.paste", text="", icon='PASTEDOWN')

            # XXX: icon
            layout.prop(context.gpencil_data, "use_onion_skinning", text="Onion Skins", icon='PARTICLE_PATH')

            row = layout.row(align=True)
            row.prop(context.tool_settings.gpencil_sculpt, "use_select_mask")
            row.prop(context.tool_settings.gpencil_sculpt, "selection_alpha", slider=True)

def register():

    global _RENDER_PT_encoding
    global _OBJECT_PT_delta_transform
    global _OBJECT_PT_transform_locks
    global _OBJECT_PT_relations
    #global _OBJECT_PT_groups
    #global _OBJECT_PT_display
    global _OBJECT_PT_duplication
    global _OBJECT_PT_relations_extras
    global _OBJECT_PT_motion_paths
    global _OBJECT_PT_custom_props
    global _OBJECT_PT_constraints

    global _BONE_PT_constraints

    global _DATA_PT_custom_props_curve
    global _DATA_PT_custom_props_lattice
    global _DATA_PT_custom_props_arm
    global _DATA_PT_custom_props_metaball

    global _PHYSICS_PT_add
    global _PHYSICS_PT_cloth
    global _PHYSICS_PT_cloth_collision
    global _PHYSICS_PT_cloth_cache
    global _PHYSICS_PT_cloth_stiffness
    global _PHYSICS_PT_cloth_sewing
    global _PHYSICS_PT_cloth_field_weights
    global _PHYSICS_PT_dynamic_paint
    global _PHYSICS_PT_dp_advanced_canvas
    global _PHYSICS_PT_dp_canvas_output
    global _PHYSICS_PT_dp_canvas_initial_color
    global _PHYSICS_PT_dp_effects
    global _PHYSICS_PT_dp_cache
    global _PHYSICS_PT_dp_brush_source
    global _PHYSICS_PT_dp_brush_velocity
    global _PHYSICS_PT_dp_brush_wave
    global _PHYSICS_PT_field
    global _PHYSICS_PT_collision
    global _PHYSICS_PT_fluid
    global _PHYSICS_PT_domain_gravity
    global _PHYSICS_PT_domain_boundary
    global _PHYSICS_PT_domain_particles
    global _PHYSICS_PT_rigid_body
    global _PHYSICS_PT_rigid_body_collisions
    global _PHYSICS_PT_rigid_body_dynamics
    global _PHYSICS_PT_rigid_body_constraint
    global _PHYSICS_PT_smoke
    global _PHYSICS_PT_smoke_flow_advanced
    global _PHYSICS_PT_smoke_fire
    global _PHYSICS_PT_smoke_adaptive_domain
    global _PHYSICS_PT_smoke_highres
    global _PHYSICS_PT_smoke_groups
    global _PHYSICS_PT_smoke_cache
    global _PHYSICS_PT_smoke_field_weights
    global _PHYSICS_PT_softbody
    global _PHYSICS_PT_softbody_cache
    global _PHYSICS_PT_softbody_goal
    global _PHYSICS_PT_softbody_edge
    global _PHYSICS_PT_softbody_collision
    global _PHYSICS_PT_softbody_solver
    global _PHYSICS_PT_softbody_field_weights
    global _VIEW3D_PT_tools_rigid_body
    global _VIEW3D_HT_header_draw
    global _INFO_MT_render_draw
    global _INFO_MT_help_draw

    for panel in get_supported_native_panels():
        panel.COMPAT_ENGINES.add('BLEND4WEB') # append

    ##############
    # UNREGISTER #
    ##############

    # Replacing existent panels by subclasses with custom poll method
    bpy.utils.unregister_class(_RENDER_PT_encoding)
    bpy.utils.unregister_class(_OBJECT_PT_delta_transform)
    bpy.utils.unregister_class(_OBJECT_PT_transform_locks)
    bpy.utils.unregister_class(_OBJECT_PT_relations)
    #bpy.utils.unregister_class(_OBJECT_PT_groups)
    #bpy.utils.unregister_class(_OBJECT_PT_display)

    bpy.utils.unregister_class(_OBJECT_PT_duplication)
    bpy.utils.unregister_class(_OBJECT_PT_relations_extras)
    bpy.utils.unregister_class(_OBJECT_PT_motion_paths)
    bpy.utils.unregister_class(_OBJECT_PT_custom_props)
    bpy.utils.unregister_class(_OBJECT_PT_constraints)

    bpy.utils.unregister_class(_BONE_PT_constraints)

    bpy.utils.unregister_class(_DATA_PT_custom_props_curve)
    bpy.utils.unregister_class(_DATA_PT_custom_props_lattice)
    bpy.utils.unregister_class(_DATA_PT_custom_props_arm)
    bpy.utils.unregister_class(_DATA_PT_custom_props_metaball)

    bpy.utils.unregister_class(_PHYSICS_PT_add)
    # cloth
    bpy.utils.unregister_class(_PHYSICS_PT_cloth)
    bpy.utils.unregister_class(_PHYSICS_PT_cloth_collision)
    bpy.utils.unregister_class(_PHYSICS_PT_cloth_cache)
    bpy.utils.unregister_class(_PHYSICS_PT_cloth_stiffness)
    bpy.utils.unregister_class(_PHYSICS_PT_cloth_sewing)
    bpy.utils.unregister_class(_PHYSICS_PT_cloth_field_weights)
    # dyn paint
    bpy.utils.unregister_class(_PHYSICS_PT_dynamic_paint)
    bpy.utils.unregister_class(_PHYSICS_PT_dp_advanced_canvas)
    bpy.utils.unregister_class(_PHYSICS_PT_dp_canvas_output)
    bpy.utils.unregister_class(_PHYSICS_PT_dp_canvas_initial_color)
    bpy.utils.unregister_class(_PHYSICS_PT_dp_effects)
    bpy.utils.unregister_class(_PHYSICS_PT_dp_cache)
    bpy.utils.unregister_class(_PHYSICS_PT_dp_brush_source)
    bpy.utils.unregister_class(_PHYSICS_PT_dp_brush_velocity)
    bpy.utils.unregister_class(_PHYSICS_PT_dp_brush_wave)
    # field
    bpy.utils.unregister_class(_PHYSICS_PT_field)
    bpy.utils.unregister_class(_PHYSICS_PT_collision)
    # fluid
    bpy.utils.unregister_class(_PHYSICS_PT_fluid)
    bpy.utils.unregister_class(_PHYSICS_PT_domain_gravity)
    bpy.utils.unregister_class(_PHYSICS_PT_domain_boundary)
    bpy.utils.unregister_class(_PHYSICS_PT_domain_particles)
    # rigidbody
    bpy.utils.unregister_class(_PHYSICS_PT_rigid_body)
    bpy.utils.unregister_class(_PHYSICS_PT_rigid_body_collisions)
    bpy.utils.unregister_class(_PHYSICS_PT_rigid_body_dynamics)
    bpy.utils.unregister_class(_PHYSICS_PT_rigid_body_constraint)
    # smoke
    bpy.utils.unregister_class(_PHYSICS_PT_smoke)
    bpy.utils.unregister_class(_PHYSICS_PT_smoke_flow_advanced)
    bpy.utils.unregister_class(_PHYSICS_PT_smoke_fire)
    bpy.utils.unregister_class(_PHYSICS_PT_smoke_adaptive_domain)
    bpy.utils.unregister_class(_PHYSICS_PT_smoke_highres)
    bpy.utils.unregister_class(_PHYSICS_PT_smoke_groups)
    bpy.utils.unregister_class(_PHYSICS_PT_smoke_cache)
    bpy.utils.unregister_class(_PHYSICS_PT_smoke_field_weights)
    # softbody
    bpy.utils.unregister_class(_PHYSICS_PT_softbody)
    bpy.utils.unregister_class(_PHYSICS_PT_softbody_cache)
    bpy.utils.unregister_class(_PHYSICS_PT_softbody_goal)
    bpy.utils.unregister_class(_PHYSICS_PT_softbody_edge)
    bpy.utils.unregister_class(_PHYSICS_PT_softbody_collision)
    bpy.utils.unregister_class(_PHYSICS_PT_softbody_solver)
    bpy.utils.unregister_class(_PHYSICS_PT_softbody_field_weights)
    bpy.utils.unregister_class(_VIEW3D_PT_tools_rigid_body)
    bpy.types.VIEW3D_HT_header.draw = VIEW3D_HT_header_draw_new
    bpy.types.INFO_MT_render.draw = INFO_MT_render_draw_new
    bpy.types.INFO_MT_help.draw = INFO_MT_help_draw_new
    bpy.types.LOGIC_HT_header.append(LOGIC_HT_header_append)
    bpy.types.SEQUENCER_HT_header.append(NOT_AVAILABLE_header_append)
    bpy.types.CLIP_HT_header.append(NOT_AVAILABLE_header_append)
    bpy.types.USERPREF_MT_splash_footer.prepend(B4W_Splash)

    load_icons()

def load_icons():
    global custom_icons
    import bpy.utils.previews
    custom_icons = bpy.utils.previews.new()
    mod = sys.modules["blend4web"]
    path = os.path.join(os.path.dirname(os.path.abspath(sys.modules["blend4web"].__file__)),
                        "icons", "icon.png")
    custom_icons.load("b4w_icon", path, 'IMAGE')

def unload_icons():
    global custom_icons
    bpy.utils.previews.remove(custom_icons)

def unregister():
    global _RENDER_PT_encoding
    global _OBJECT_PT_delta_transform
    global _OBJECT_PT_transform_locks
    global _OBJECT_PT_relations
    #global _OBJECT_PT_groups
    #global _OBJECT_PT_display
    global _OBJECT_PT_duplication
    global _OBJECT_PT_relations_extras
    global _OBJECT_PT_motion_paths
    global _OBJECT_PT_custom_props
    global _OBJECT_PT_constraints

    global _BONE_PT_constraints

    global _DATA_PT_custom_props_curve
    global _DATA_PT_custom_props_lattice
    global _DATA_PT_custom_props_arm
    global _DATA_PT_custom_props_metaball

    global _PHYSICS_PT_add
    global _PHYSICS_PT_cloth
    global _PHYSICS_PT_cloth_collision
    global _PHYSICS_PT_cloth_cache
    global _PHYSICS_PT_cloth_stiffness
    global _PHYSICS_PT_cloth_sewing
    global _PHYSICS_PT_cloth_field_weights
    global _PHYSICS_PT_dynamic_paint
    global _PHYSICS_PT_dp_advanced_canvas
    global _PHYSICS_PT_dp_canvas_output
    global _PHYSICS_PT_dp_canvas_initial_color
    global _PHYSICS_PT_dp_effects
    global _PHYSICS_PT_dp_cache
    global _PHYSICS_PT_dp_brush_source
    global _PHYSICS_PT_dp_brush_velocity
    global _PHYSICS_PT_dp_brush_wave
    global _PHYSICS_PT_field
    global _PHYSICS_PT_collision
    global _PHYSICS_PT_fluid
    global _PHYSICS_PT_domain_gravity
    global _PHYSICS_PT_domain_boundary
    global _PHYSICS_PT_domain_particles
    global _PHYSICS_PT_rigid_body
    global _PHYSICS_PT_rigid_body_collisions
    global _PHYSICS_PT_rigid_body_dynamics
    global _PHYSICS_PT_rigid_body_constraint
    global _PHYSICS_PT_smoke
    global _PHYSICS_PT_smoke_flow_advanced
    global _PHYSICS_PT_smoke_fire
    global _PHYSICS_PT_smoke_adaptive_domain
    global _PHYSICS_PT_smoke_highres
    global _PHYSICS_PT_smoke_groups
    global _PHYSICS_PT_smoke_cache
    global _PHYSICS_PT_smoke_field_weights
    global _PHYSICS_PT_softbody
    global _PHYSICS_PT_softbody_cache
    global _PHYSICS_PT_softbody_goal
    global _PHYSICS_PT_softbody_edge
    global _PHYSICS_PT_softbody_collision
    global _PHYSICS_PT_softbody_solver
    global _PHYSICS_PT_softbody_field_weights
    global _VIEW3D_PT_tools_rigid_body

    ############
    # REGISTER #
    ############
    bpy.utils.register_class(_RENDER_PT_encoding)
    bpy.utils.register_class(_OBJECT_PT_delta_transform)
    bpy.utils.register_class(_OBJECT_PT_transform_locks)
    bpy.utils.register_class(_OBJECT_PT_relations)
    #bpy.utils.register_class(_OBJECT_PT_groups)
    #bpy.utils.register_class(_OBJECT_PT_display)
    bpy.utils.register_class(_OBJECT_PT_duplication)
    bpy.utils.register_class(_OBJECT_PT_relations_extras)
    bpy.utils.register_class(_OBJECT_PT_motion_paths)
    bpy.utils.register_class(_OBJECT_PT_custom_props)
    bpy.utils.register_class(_OBJECT_PT_constraints)

    bpy.utils.register_class(_BONE_PT_constraints)

    bpy.utils.register_class(_DATA_PT_custom_props_curve)
    bpy.utils.register_class(_DATA_PT_custom_props_lattice)
    bpy.utils.register_class(_DATA_PT_custom_props_arm)
    bpy.utils.register_class(_DATA_PT_custom_props_metaball)

    bpy.utils.register_class(_PHYSICS_PT_add)
    # cloth
    bpy.utils.register_class(_PHYSICS_PT_cloth)
    bpy.utils.register_class(_PHYSICS_PT_cloth_collision)
    bpy.utils.register_class(_PHYSICS_PT_cloth_cache)
    bpy.utils.register_class(_PHYSICS_PT_cloth_stiffness)
    bpy.utils.register_class(_PHYSICS_PT_cloth_sewing)
    bpy.utils.register_class(_PHYSICS_PT_cloth_field_weights)
    # dyn paint
    bpy.utils.register_class(_PHYSICS_PT_dynamic_paint)
    bpy.utils.register_class(_PHYSICS_PT_dp_advanced_canvas)
    bpy.utils.register_class(_PHYSICS_PT_dp_canvas_output)
    bpy.utils.register_class(_PHYSICS_PT_dp_canvas_initial_color)
    bpy.utils.register_class(_PHYSICS_PT_dp_effects)
    bpy.utils.register_class(_PHYSICS_PT_dp_cache)
    bpy.utils.register_class(_PHYSICS_PT_dp_brush_source)
    bpy.utils.register_class(_PHYSICS_PT_dp_brush_velocity)
    bpy.utils.register_class(_PHYSICS_PT_dp_brush_wave)
    # field
    bpy.utils.register_class(_PHYSICS_PT_field)
    bpy.utils.register_class(_PHYSICS_PT_collision)
    # fluid
    bpy.utils.register_class(_PHYSICS_PT_fluid)
    bpy.utils.register_class(_PHYSICS_PT_domain_gravity)
    bpy.utils.register_class(_PHYSICS_PT_domain_boundary)
    bpy.utils.register_class(_PHYSICS_PT_domain_particles)
    # rigidbody
    bpy.utils.register_class(_PHYSICS_PT_rigid_body)
    bpy.utils.register_class(_PHYSICS_PT_rigid_body_collisions)
    bpy.utils.register_class(_PHYSICS_PT_rigid_body_dynamics)
    bpy.utils.register_class(_PHYSICS_PT_rigid_body_constraint)
    # smoke
    bpy.utils.register_class(_PHYSICS_PT_smoke)
    bpy.utils.register_class(_PHYSICS_PT_smoke_flow_advanced)
    bpy.utils.register_class(_PHYSICS_PT_smoke_fire)
    bpy.utils.register_class(_PHYSICS_PT_smoke_adaptive_domain)
    bpy.utils.register_class(_PHYSICS_PT_smoke_highres)
    bpy.utils.register_class(_PHYSICS_PT_smoke_groups)
    bpy.utils.register_class(_PHYSICS_PT_smoke_cache)
    bpy.utils.register_class(_PHYSICS_PT_smoke_field_weights)
    # softbody
    bpy.utils.register_class(_PHYSICS_PT_softbody)
    bpy.utils.register_class(_PHYSICS_PT_softbody_cache)
    bpy.utils.register_class(_PHYSICS_PT_softbody_goal)
    bpy.utils.register_class(_PHYSICS_PT_softbody_edge)
    bpy.utils.register_class(_PHYSICS_PT_softbody_collision)
    bpy.utils.register_class(_PHYSICS_PT_softbody_solver)
    bpy.utils.register_class(_PHYSICS_PT_softbody_field_weights)
    # view3d
    bpy.utils.register_class(_VIEW3D_PT_tools_rigid_body)
    bpy.types.VIEW3D_HT_header.draw = _VIEW3D_HT_header_draw
    bpy.types.INFO_MT_render.draw = _INFO_MT_render_draw
    bpy.types.INFO_MT_help.draw = _INFO_MT_help_draw
    bpy.types.LOGIC_HT_header.remove(LOGIC_HT_header_append)
    bpy.types.SEQUENCER_HT_header.remove(NOT_AVAILABLE_header_append)
    bpy.types.CLIP_HT_header.remove(NOT_AVAILABLE_header_append)

    unload_icons()
