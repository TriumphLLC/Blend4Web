import bpy
import imp
import mathutils
import math
import os
import cProfile
import bgl

from bpy.types import Panel

# common properties for all B4W world panels
class WorldButtonsPanel:
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "world"
    COMPAT_ENGINES = ["BLEND4WEB"]

    @classmethod
    def poll(cls, context):
        return (context.world and context.scene.render.engine in cls.COMPAT_ENGINES)

class B4W_WORLD_PT_world(WorldButtonsPanel, Panel):
    bl_label = "World"
    bl_idname = "WORLD_PT_b4w_world"

    def draw(self, context):
        layout = self.layout

        world = context.world

        sky = world.b4w_sky_settings
        layout.prop(context.world.b4w_sky_settings, "render_sky", text="Render Sky")

        sky_is_active = getattr(sky, "render_sky")

        row = layout.row()
        row.active = sky_is_active
        row.prop(world, "use_sky_paper")
        row.prop(world, "use_sky_blend")
        row.prop(world, "use_sky_real")

        row = layout.row()
        row.active = sky_is_active
        row.column().prop(world, "horizon_color")
        col = row.column()
        col.prop(world, "zenith_color")
        col.active = sky_is_active and world.use_sky_blend
        row.column().prop(world, "ambient_color")

        row = layout.row()
        row.prop(sky, "reflexible", text="Reflect World")
        row = layout.row()
        row.active = sky.reflexible
        row.prop(sky, "reflexible_only", text="Render Only Reflection")

class B4W_WORLD_PT_environment_lighting(WorldButtonsPanel, Panel):
    bl_label = "Environment Lighting"
    bl_idname = "WORLD_PT_b4w_env_lighing"

    def draw_header(self, context):
        light = context.world.light_settings
        self.layout.prop(light, "use_environment_light", text="")

    def draw(self, context):
        layout = self.layout

        light = context.world.light_settings

        layout.active = light.use_environment_light

        split = layout.split()
        split.prop(light, "environment_energy", text="Energy")
        split.prop(light, "environment_color", text="")

class B4W_WORLD_PT_mist(WorldButtonsPanel, Panel):
    bl_label = "Mist"
    bl_idname = "WORLD_PT_b4w_mist"
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        mist_settings = context.world.mist_settings
        self.layout.prop(mist_settings, "use_mist", text="")

    def draw(self, context):
        layout = self.layout

        world = context.world
        mist_settings = world.mist_settings

        layout.active = mist_settings.use_mist
        row = layout.row()
        row.prop(mist_settings, "intensity", text="Minimum")
        row.prop(mist_settings, "depth", text="Depth")
        row = layout.row()
        row.prop(mist_settings, "start", text="Start")
        row.prop(mist_settings, "height", text="Height")
        row = layout.row()
        row.prop(mist_settings, "falloff", text="Fall off")
        row = layout.row()
        row.prop(world, "b4w_use_custom_color", text="Use custom color")
        row.active = not world.b4w_sky_settings.procedural_skydome
        row = layout.row()
        row.active = world.b4w_use_custom_color and (not world.b4w_sky_settings.procedural_skydome)
        row.prop(world, "b4w_fog_color", text="Fog color")

class B4W_WorldSky(WorldButtonsPanel, Panel):
    bl_label = "Procedural Sky"
    bl_idname = "WORLD_PT_b4w_sky"
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        world = context.world
        sky = world.b4w_sky_settings
        self.layout.prop(sky, "procedural_skydome", text="")

    def draw(self, context):
        world = context.world
        sky = world.b4w_sky_settings

        layout = self.layout
        layout.active = sky.procedural_skydome

        layout.prop(sky, "use_as_environment_lighting", text="Use as Environment Lighting")
        layout.prop(sky, "color", text="Sky Color")
        layout.prop(sky, "rayleigh_brightness", text="Rayleigh Brightness")
        layout.prop(sky, "mie_brightness", text="Mie Brightness")
        layout.prop(sky, "spot_brightness", text="Spot Brightness")
        layout.prop(sky, "scatter_strength", text="Scatter Strength")
        layout.prop(sky, "rayleigh_strength", text="Rayleigh Strength")
        layout.prop(sky, "mie_strength", text="Mie Strength")
        layout.prop(sky, "rayleigh_collection_power", text="Rayleigh Collection Power")
        layout.prop(sky, "mie_collection_power", text="Mie Collection Power")
        layout.prop(sky, "mie_distribution", text="Mie Distribution")

class B4W_WorldExportOptions(WorldButtonsPanel, Panel):
    bl_label = "Export Options"
    bl_idname = "WORLD_PT_b4w_world_export_options"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        world = context.world
        layout = self.layout

        row = layout.row()
        row.prop(world, "b4w_do_not_export", text="Do Not Export")

def register():
    bpy.utils.register_class(B4W_WORLD_PT_world)
    bpy.utils.register_class(B4W_WORLD_PT_environment_lighting)
    bpy.utils.register_class(B4W_WORLD_PT_mist)

    bpy.utils.register_class(B4W_WorldSky)
    bpy.utils.register_class(B4W_WorldExportOptions)

def unregister():
    bpy.utils.unregister_class(B4W_WORLD_PT_world)
    bpy.utils.unregister_class(B4W_WORLD_PT_environment_lighting)
    bpy.utils.unregister_class(B4W_WORLD_PT_mist)

    bpy.utils.unregister_class(B4W_WorldSky)
    bpy.utils.unregister_class(B4W_WorldExportOptions)
