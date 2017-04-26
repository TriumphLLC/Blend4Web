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
import imp
import mathutils
import math
import os
import cProfile
import bgl

from bpy.types import Panel

import blend4web
b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_
# common properties for all B4W world panels
class WorldButtonsPanel:
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "world"
    COMPAT_ENGINES = ["BLEND4WEB"]

    @classmethod
    def poll(cls, context):
        return (context.world and context.scene.render.engine in cls.COMPAT_ENGINES)

class B4W_OperatorWorldBackgroundShow(bpy.types.Operator):
    bl_idname = "b4w.world_background_show"
    bl_label = p_("Show", "Operator")
    bl_description = _('Enable the "World Background" option in 3D VIEW panels')
    bl_options = {"INTERNAL"}

    def invoke(self, context, event):
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                for space in area.spaces:
                    if space.type == "VIEW_3D":
                        space.show_world = True
        return {'FINISHED'}

class B4W_OperatorWorldBackgroundHide(bpy.types.Operator):
    bl_idname = "b4w.world_background_hide"
    bl_label = p_("Hide", "Operator")
    bl_description = _('Disable the "World Background" option in 3D VIEW panels')
    bl_options = {"INTERNAL"}

    def invoke(self, context, event):
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                for space in area.spaces:
                    if space.type == "VIEW_3D":
                        space.show_world = False
        return {'FINISHED'}

class B4W_WORLD_PT_world(WorldButtonsPanel, Panel):
    bl_label = _("World")
    bl_idname = "WORLD_PT_b4w_world"

    def draw(self, context):
        layout = self.layout

        world = context.world
        sky = world.b4w_sky_settings

        layout.prop(sky, "render_sky", text=_("Render Sky"))
        sky_is_active = getattr(sky, "render_sky")

        row = layout.row()
        row.active = sky_is_active
        row.prop(world, "use_nodes", text=_("Use Nodes (Cycles)"))
        is_node_world = getattr(world, "use_nodes")

        row = layout.row()
        row.active = sky_is_active and not is_node_world
        row.prop(world, "use_sky_paper")
        row.prop(world, "use_sky_blend")
        row.prop(world, "use_sky_real")

        row = layout.row()
        row.active = sky_is_active and not is_node_world
        row.column().prop(world, "horizon_color")
        col = row.column()
        col.prop(world, "zenith_color")

        row = layout.row()
        row.prop(sky, "reflexible", text=_("Reflect World"))
        row = layout.row()
        row.active = sky.reflexible
        row.prop(sky, "reflexible_only", text=_("Render Only Reflection"))

        row = layout.row()
        row.label("World Background:")
        row = layout.row()
        sides = row.split(align=True)
        sides.operator("b4w.world_background_show")
        sides.operator("b4w.world_background_hide")


class B4W_WORLD_PT_environment_lighting(WorldButtonsPanel, Panel):
    bl_label = _("Environment Lighting")
    bl_idname = "WORLD_PT_b4w_env_lighing"

    def draw_header(self, context):
        light = context.world.light_settings
        self.layout.prop(light, "use_environment_light", text="")

    def draw(self, context):
        layout = self.layout

        light = context.world.light_settings

        layout.active = light.use_environment_light

        split = layout.split()
        split.prop(light, "environment_energy", text=_("Energy"))
        split.prop(light, "environment_color", text="")

class B4W_WORLD_PT_mist(WorldButtonsPanel, Panel):
    bl_label = _("Mist")
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
        row.prop(mist_settings, "intensity", text=_("Minimum"))
        row.prop(mist_settings, "depth", text=_("Depth"))
        row = layout.row()
        row.prop(mist_settings, "start", text=_("Start"))
        row.prop(mist_settings, "height", text=_("Height"))
        row = layout.row()
        row.prop(mist_settings, "falloff", text=_("Falloff"))
        row = layout.row()
        row.prop(world, "b4w_use_custom_color", text=_("Use Custom Color"))
        row.active = not world.b4w_sky_settings.procedural_skydome
        row = layout.row()
        row.active = world.b4w_use_custom_color and (not world.b4w_sky_settings.procedural_skydome)
        row.prop(world, "b4w_fog_color", text=_("Fog Color"))

class B4W_WorldSky(WorldButtonsPanel, Panel):
    bl_label = _("Procedural Sky")
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

        layout.prop(sky, "use_as_environment_lighting", text=_("Use as Environment Lighting"))
        layout.prop(sky, "color", text=_("Sky Color"))
        layout.prop(sky, "rayleigh_brightness", text=_("Rayleigh Brightness"))
        layout.prop(sky, "mie_brightness", text=_("Mie Brightness"))
        layout.prop(sky, "spot_brightness", text=_("Spot Brightness"))
        layout.prop(sky, "scatter_strength", text=_("Scatter Strength"))
        layout.prop(sky, "rayleigh_strength", text=_("Rayleigh Strength"))
        layout.prop(sky, "mie_strength", text=_("Mie Strength"))
        layout.prop(sky, "rayleigh_collection_power", text=_("Rayleigh Collection Power"))
        layout.prop(sky, "mie_collection_power", text=_("Mie Collection Power"))
        layout.prop(sky, "mie_distribution", text=_("Mie Distribution"))

class B4W_WorldAnimation(WorldButtonsPanel, Panel):
    bl_label = _("Animation")
    bl_idname = "WORLD_PT_b4w_animation"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        world = context.world

        layout = self.layout
        layout.prop(world, "b4w_use_default_animation", text=_("Apply Default Animation"))

        row = layout.row()
        row.active = world.b4w_use_default_animation
        row.prop(world, "b4w_anim_behavior", text=_("Behavior"))

class B4W_WorldExportOptions(WorldButtonsPanel, Panel):
    bl_label = _("Export Options")
    bl_idname = "WORLD_PT_b4w_world_export_options"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        world = context.world
        layout = self.layout

        row = layout.row()
        row.prop(world, "b4w_do_not_export", text=_("Do Not Export"))

