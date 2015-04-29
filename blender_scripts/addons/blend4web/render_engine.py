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
from . import interface

# Using native Blender Internal render engine because no
# render methods are implemented here
class B4WRenderEngine(bpy.types.RenderEngine):
    bl_idname = 'BLEND4WEB'
    bl_label = 'Blend4Web'
    bl_use_preview = False
    # use old shading nodes, game and internal
    # capabilities
    bl_use_shading_nodes = False
    # bl_use_game_engine = True
    # bl_use_internal_engine = True
    bl_use_native_node_tree = True
    # use_game_engine = True

# Supported panels
# Please keep unsupported panels as commented lines,
# it helps a little
def get_supported_native_panels():
    types = bpy.types
    panels = [
        "MATERIAL_PT_context_material",
        # "MATERIAL_MT_specials",
        # "MATERIAL_UL_matslots",
        "MATERIAL_PT_context_material",
        "MATERIAL_PT_preview",
        "MATERIAL_PT_pipeline",
        "MATERIAL_PT_diffuse",
        "MATERIAL_PT_specular",
        "MATERIAL_PT_shading",
        "MATERIAL_PT_transp",
        "MATERIAL_PT_mirror",
        # "MATERIAL_PT_sss",
        "MATERIAL_PT_halo",
        "MATERIAL_PT_flare",
        "MATERIAL_PT_game_settings",
        "MATERIAL_PT_physics",
        "MATERIAL_PT_strand",
        "MATERIAL_PT_options",
        # "MATERIAL_PT_shadow",
        # "MATERIAL_PT_transp_game",
        "VolumeButtonsPanel",
        "MATERIAL_PT_volume_density",
        "MATERIAL_PT_volume_shading",
        "MATERIAL_PT_volume_lighting",
        "MATERIAL_PT_volume_transp",
        "MATERIAL_PT_volume_integration",
        "MATERIAL_PT_volume_options",
        # "MATERIAL_PT_custom_props",
        "DATA_PT_custom_props_arm",
        # "BONE_PT_custom_props",
        "CAMERA_MT_presets",
        "SAFE_AREAS_MT_presets",
        "DATA_PT_context_camera",
        "DATA_PT_lens",
        "DATA_PT_camera",
        "DATA_PT_camera_dof",
        "DATA_PT_camera_display",
        "DATA_PT_camera_safe_areas",
        # "DATA_PT_custom_props_camera",
        "DATA_PT_curve_texture_space",
        # "DATA_PT_custom_props_curve",
        "LAMP_MT_sunsky_presets",
        "DATA_PT_context_lamp",
        "DATA_PT_preview",
        "DATA_PT_lamp",
        "DATA_PT_sunsky",
        "DATA_PT_shadow",
        "DATA_PT_area",
        "DATA_PT_spot",
        "DATA_PT_falloff_curve",
        # "DATA_PT_custom_props_lamp",
        # "DATA_PT_custom_props_lattice",
        "MESH_MT_vertex_group_specials",
        "MESH_MT_shape_key_specials",
        "DATA_PT_context_mesh",
        "DATA_PT_normals",
        "DATA_PT_texture_space",
        "DATA_PT_vertex_groups",
        "DATA_PT_shape_keys",
        "DATA_PT_uv_texture",
        "DATA_PT_vertex_colors",
        "DATA_PT_customdata",
        # "DATA_PT_custom_props_mesh",
        "DATA_PT_mball_texture_space",
        # "DATA_PT_custom_props_metaball",
        "DATA_PT_context_speaker",
        "DATA_PT_speaker",
        "DATA_PT_distance",
        "DATA_PT_cone",
        # "DATA_PT_custom_props_speaker",
        "RENDER_PT_freestyle",
        "RENDERLAYER_PT_freestyle",
        "RENDERLAYER_PT_freestyle_lineset",
        "RENDERLAYER_PT_freestyle_linestyle",
        "MATERIAL_PT_freestyle_line",
        "PHYSICS_PT_game_collision_bounds",
        "PHYSICS_PT_game_obstacles",
        # "RENDER_PT_embedded",
        # "RENDER_PT_game_player",
        # "RENDER_PT_game_stereo",
        # "RENDER_PT_game_shading",
        # "RENDER_PT_game_system",
        # "RENDER_PT_game_display",
        # "SCENE_PT_game_navmesh",
        "WORLD_PT_game_context_world",
        # "WORLD_PT_game_world",
        "WORLD_PT_game_mist",
        "WORLD_PT_game_physics",
        "WORLD_PT_game_physics_obstacles",
        "DATA_PT_shadow_game",
        "OBJECT_PT_levels_of_detail",
        "PARTICLE_MT_specials",
        "PARTICLE_MT_hair_dynamics_presets",
        "PARTICLE_PT_context_particles",
        "PARTICLE_PT_emission",
        "PARTICLE_PT_hair_dynamics",
        "PARTICLE_PT_cache",
        "PARTICLE_PT_velocity",
        # "PARTICLE_PT_rotation",
        "PARTICLE_PT_physics",
        "PARTICLE_PT_boidbrain",
        "PARTICLE_PT_render",
        "PARTICLE_PT_draw",
        # "PARTICLE_PT_children",
        "PARTICLE_PT_field_weights",
        # "PARTICLE_PT_force_fields",
        "PARTICLE_PT_vertexgroups",
        # "PARTICLE_PT_custom_props",
        "RENDER_PT_render",
        # "RENDER_PT_dimensions",
        # "RENDER_PT_antialiasing",
        # "RENDER_PT_motion_blur",
        "RENDER_PT_shading",
        # "RENDER_PT_performance",
        # "RENDER_PT_post_processing",
        # "RENDER_PT_stamp",
        "RENDER_PT_output",
        "RENDER_PT_encoding",
        "RENDER_PT_bake",
        "SCENE_PT_scene",
        "SCENE_PT_unit",
        "SCENE_PT_keying_sets",
        "SCENE_PT_keying_set_paths",
        "SCENE_PT_color_management",
        # "SCENE_PT_audio",
        # "SCENE_PT_physics",
        # "SCENE_PT_rigid_body_world",
        "PHYSICS_PT_game_physics",
        "PHYSICS_PT_game_collision_bounds",

        "SCENE_PT_rigid_body_cache",
        "SCENE_PT_rigid_body_field_weights",
        "SCENE_PT_simplify",
        # "SCENE_PT_custom_props",
        "TEXTURE_MT_specials",
        "TEXTURE_MT_envmap_specials",
        "TEXTURE_PT_context_texture",
        "TEXTURE_PT_preview",
        "TEXTURE_PT_colors",
        "TextureSlotPanel",
        "TEXTURE_PT_clouds",
        "TEXTURE_PT_wood",
        "TEXTURE_PT_marble",
        "TEXTURE_PT_magic",
        "TEXTURE_PT_blend",
        "TEXTURE_PT_stucci",
        "TEXTURE_PT_image",
        "TEXTURE_PT_image_sampling",
        "TEXTURE_PT_image_mapping",
        "TEXTURE_PT_envmap",
        "TEXTURE_PT_envmap_sampling",
        "TEXTURE_PT_musgrave",
        "TEXTURE_PT_voronoi",
        "TEXTURE_PT_distortednoise",
        "TEXTURE_PT_voxeldata",
        "TEXTURE_PT_pointdensity",
        "TEXTURE_PT_pointdensity_turbulence",
        "TEXTURE_PT_ocean",
        "TEXTURE_PT_mapping",
        "TEXTURE_PT_influence",
        # "TEXTURE_PT_custom_props",
        "WORLD_PT_context_world",
        # "WORLD_PT_preview",
        "WORLD_PT_world",
        # "WORLD_PT_ambient_occlusion",
        "WORLD_PT_environment_lighting",
        # "WORLD_PT_indirect_lighting",
        # "WORLD_PT_gather",
        # "WORLD_PT_mist",
        # "WORLD_PT_custom_props"
        ]
    return [getattr(types, p) for p in panels if hasattr(types, p)]

def get_b4w_panels():
    types = interface
    panels = [
      "B4W_PhysicsPanel",
      "B4W_ScenePanel",
      "B4W_WorldPanel",
      "B4W_ObjectPanel",
      "B4W_DataPanel",
      "B4W_RenderPanel",
      "B4W_MaterialPanel",
      "B4W_TexturePanel",
      "B4W_ParticlePanel",
      "B4W_PhysicsPanel",
      "CustomConstraintsPanel",
        ]

    return [getattr(types, p) for p in panels if hasattr(types, p)]

def custom_poll(context):
    matching = "BLEND4WEB" not in context.scene.render.engine
    return  context.object and matching

class OBJECT_PT_delta_transform_new(bpy.types.OBJECT_PT_delta_transform):
    @classmethod
    def poll(cls, context):
        return custom_poll(context)

class OBJECT_PT_relations_extras_new(bpy.types.OBJECT_PT_relations_extras):
    @classmethod
    def poll(cls, context):
        return custom_poll(context)

def register():
    register_render = bpy.context.user_preferences.addons[__package__].preferences.b4w_register_render
    if register_render:
        bpy.utils.register_class(B4WRenderEngine)
        for panel in get_supported_native_panels():
            panel.COMPAT_ENGINES.add('BLEND4WEB') # append
        for panel in get_b4w_panels():
            panel.COMPAT_ENGINES = ['BLEND4WEB'] # overwrite

        # Replacing existent panels by subclasses with custom poll method
        global _OBJECT_PT_delta_transform
        _OBJECT_PT_delta_transform = bpy.types.OBJECT_PT_delta_transform
        bpy.utils.unregister_class(bpy.types.OBJECT_PT_delta_transform)
        bpy.utils.register_class(OBJECT_PT_delta_transform_new)

        global _OBJECT_PT_relations_extras
        _OBJECT_PT_relations_extras = bpy.types.OBJECT_PT_relations_extras
        bpy.utils.unregister_class(bpy.types.OBJECT_PT_relations_extras)
        bpy.utils.register_class(OBJECT_PT_relations_extras_new)
        #

def unregister():
    register_render = bpy.context.user_preferences.addons[__package__].preferences.b4w_register_render
    if register_render:
        global _OBJECT_PT_delta_transform
        bpy.utils.unregister_class(OBJECT_PT_delta_transform_new)
        bpy.utils.register_class(_OBJECT_PT_delta_transform)

        global _OBJECT_PT_relations_extras
        bpy.utils.unregister_class(OBJECT_PT_relations_extras_new)
        bpy.utils.register_class(_OBJECT_PT_relations_extras)

        # bpy.utils.unregister_class(B4WRenderEngine)