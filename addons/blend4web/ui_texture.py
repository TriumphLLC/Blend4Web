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
from bl_ui.properties_material import active_node_mat

from bpy.types import (
        Brush,
        FreestyleLineStyle,
        Lamp,
        Material,
        Object,
        ParticleSettings,
        Texture,
        World,
        )
import blend4web

b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_
SUPPORTED_PARTICLE_TEX_TYPES = {'BLEND'}
SUPPORTED_WORLD_TEX_TYPES = {'ENVIRONMENT_MAP'}
SUPPORTED_MAT_TEX_TYPES = {'IMAGE','ENVIRONMENT_MAP','NONE'}

def check_tex_compatibility(context):
    tex = context.texture

    if tex.use_nodes:
        return False

    engine  = context.scene.render.engine
    idblock = context_tex_datablock(context)

    if (isinstance(idblock, ParticleSettings) and tex.type in
                                SUPPORTED_PARTICLE_TEX_TYPES):
        return True
    elif (isinstance(idblock, Material) and tex.type in
                                SUPPORTED_MAT_TEX_TYPES):
        return True
    elif (isinstance(idblock, World) and tex.type in
                                SUPPORTED_WORLD_TEX_TYPES):
        return True
    else:
        return False

# common properties for all B4W texture panels
class TextureButtonsPanel:
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "texture"
    COMPAT_ENGINES = ["BLEND4WEB"]

    @classmethod
    def poll(cls, context):
        tex = context.texture
        if not tex:
            return False
        engine = context.scene.render.engine
        is_compat_tex = check_tex_compatibility(context)
        return (is_compat_tex
            and context.scene.render.engine in cls.COMPAT_ENGINES)

class TextureErrorPanel(Panel):
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "texture"
    bl_label = _("Preview")
    COMPAT_ENGINES = ["BLEND4WEB"]

    @classmethod
    def poll(cls, context):

        tex = context.texture
        if not tex:
            return False

        engine = context.scene.render.engine
        is_compat_tex = check_tex_compatibility(context)
        return ((not is_compat_tex)
            and context.scene.render.engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        layout = self.layout
        tex = context.texture
        layout.label(text=_("Texture type is not compatible with current texture context."), icon="ERROR")

class TextureTypePanel(TextureButtonsPanel):

    @classmethod
    def poll(cls, context):
        tex = context.texture
        if not tex:
            return False
        is_compat_tex = check_tex_compatibility(context)
        engine = context.scene.render.engine
        return (tex.type == cls.tex_type) and is_compat_tex and (engine in cls.COMPAT_ENGINES)

class TextureSlotPanel(TextureButtonsPanel):

    @classmethod
    def poll(cls, context):

        if not hasattr(context, "texture_slot"):
            return False

        tex = context.texture

        if tex.use_nodes:
            return False

        engine = context.scene.render.engine
        return TextureButtonsPanel.poll(context) and (engine in cls.COMPAT_ENGINES)

def context_tex_datablock(context):
    idblock = context.material
    if idblock:
        return active_node_mat(idblock)

    idblock = context.lamp
    if idblock:
        return idblock

    idblock = context.world
    if idblock:
        return idblock

    idblock = context.brush
    if idblock:
        return idblock

    idblock = context.line_style
    if idblock:
        return idblock

    if context.particle_system:
        idblock = context.particle_system.settings

    return idblock

class B4W_TEXTURE_PT_preview(TextureButtonsPanel, Panel):
    bl_label = _("Preview")

    def draw(self, context):

        layout = self.layout
        tex = context.texture

        slot = getattr(context, "texture_slot", None)
        idblock = context_tex_datablock(context)

        if idblock:
            layout.template_preview(tex, parent=idblock, slot=slot)
        else:
            layout.template_preview(tex, slot=slot)

        #Show Alpha Button for Brush Textures, see #29502
        if context.space_data.texture_context == 'BRUSH':
            layout.prop(tex, "use_preview_alpha")


class B4W_TEXTURE_PT_mapping(TextureSlotPanel, Panel):
    bl_label = _("Mapping")

    @classmethod
    def poll(cls, context):
        idblock = context_tex_datablock(context)
        if isinstance(idblock, Brush) and not context.sculpt_object:
            return False

        if not getattr(context, "texture_slot", None):
            return False

        return TextureSlotPanel.poll(context)

    def draw(self, context):
        layout = self.layout

        idblock = context_tex_datablock(context)

        tex = context.texture_slot

        if not isinstance(idblock, Brush):
            split = layout.split(percentage=0.3)
            col = split.column()
            col.label(text=_("Coordinates:"))
            col = split.column()
            col.prop(tex, "texture_coords", text="")
            texcoord = tex.texture_coords

            if texcoord == 'ORCO':
                """
                ob = context.object
                if ob and ob.type == 'MESH':
                    split = layout.split(percentage=0.3)
                    split.label(text=_("Mesh:"))
                    split.prop(ob.data, "texco_mesh", text="")
                """
            elif texcoord == 'UV':
                split = layout.split(percentage=0.3)
                split.label(text=_("Map:"))
                ob = context.object
                if ob and ob.type == 'MESH':
                    split.prop_search(tex, "uv_layer", ob.data, "uv_textures", text="")
                else:
                    split.prop(tex, "uv_layer", text="")

            elif texcoord not in {'GLOBAL','NORMAL','STRAND','VIEW'}:
                layout.label(text=_("This coordinates type is not supported."), icon="ERROR")

            layout.column().prop(tex, "scale")

class B4W_TEXTURE_PT_envmap(TextureTypePanel, Panel):
    bl_label = _("Environment Map")
    tex_type = 'ENVIRONMENT_MAP'

    def draw(self, context):
        layout = self.layout

        tex = context.texture
        env = tex.environment_map

        row = layout.row()
        row.prop(env, "source", expand=True)
        row.menu("TEXTURE_MT_envmap_specials", icon='DOWNARROW_HLT', text="")

        if env.source == 'IMAGE_FILE':
            layout.template_ID(tex, "image", open="image.open")
            layout.template_image(tex, "image", tex.image_user, compact=True)
        else:
            layout.label(text=_("This environment map type is not supported"), icon="ERROR")

class B4W_TEXTURE_PT_colors(TextureButtonsPanel, Panel):
    bl_label = _("Colors")
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        tex = context.texture
        engine = context.scene.render.engine
        idblock = context_tex_datablock(context)
        return (tex and tex.type == 'BLEND' and
            context.scene.render.engine in cls.COMPAT_ENGINES and
            (isinstance(idblock, ParticleSettings)))

    def draw(self, context):
        layout = self.layout

        tex = context.texture

        layout.prop(tex, "use_color_ramp", text=_("Ramp"))
        if tex.use_color_ramp:
            layout.template_color_ramp(tex, "color_ramp", expand=True)

class B4W_TEXTURE_PT_image_sampling(TextureTypePanel, Panel):
    bl_label = _("Image Sampling")
    bl_options = {'DEFAULT_CLOSED'}
    tex_type = 'IMAGE'

    def draw(self, context):
        layout = self.layout

        idblock = context_tex_datablock(context)
        tex = context.texture
        slot = getattr(context, "texture_slot", None)

        split = layout.split()

        col = split.column()
        row = col.row()
        row.active = bool(tex.image and tex.image.use_alpha)
        row.prop(tex, "use_alpha", text=_("Use Alpha"))

        #Only for Material based textures, not for Lamp/World...
        if slot and isinstance(idblock, Material):
            col = split.column()
            col.prop(tex, "use_normal_map")

class B4W_TextureExport(TextureButtonsPanel, Panel):
    bl_label = _("Export Options")
    bl_idname = "TEXTURE_PT_b4w_export"

    def draw(self, context):
        tex = context.texture
        layout = self.layout

        idblock = context_tex_datablock(context)

        if tex:
            row = layout.row()
            row.prop(tex, "b4w_do_not_export", text=_("Do Not Export"))

            active = not tex.b4w_do_not_export

            if tex.type in ['IMAGE','ENVIRONMENT_MAP']:
                row = layout.row()
                row.prop(tex, "b4w_disable_compression", text=_("Disable Compression"))
                row.active = active

            if isinstance(idblock, Material):
                row = layout.row()
                row.active = active
                row.prop(tex, "b4w_enable_tex_af", text=_("Enable Anisotropic Filtering"))
                row = layout.row()
                row.active = tex.b4w_enable_tex_af
                row.prop(tex, "b4w_anisotropic_filtering", text=_("Anisotropic Filtering"))

                if tex.type == "IMAGE":
                    row = layout.row()
                    row.active = active
                    row.prop(tex, "b4w_shore_dist_map", text=_("Shore Distance Map"))

                elif tex.type == "NONE":
                    icon_source = "NONE"
                    if tex.b4w_source_type == "SCENE":
                        icon_source = "ERROR"
                        for scene in bpy.data.scenes:
                            if scene.name == tex.b4w_source_id:
                                icon_source = "SCENE_DATA"
                                break
                    
                    row = layout.row()
                    row.active = active
                    row.prop(tex, "b4w_source_type", text=_("Source Type"))
                    if tex.b4w_source_type != "NONE":
                        if tex.b4w_source_type == "SCENE":
                            row = layout.row()
                            row.active = active
                            row.prop(tex, "b4w_source_id", text=_("Source ID"), icon=icon_source)
                        row = layout.row()
                        row.active = active
                        row.prop(tex, "b4w_source_size", text=_("Source Size"))
                        row = layout.row()
                        row.active = active
                        row.prop(tex, "b4w_extension", text=_("Extension"))
                        if tex.b4w_source_type == "CANVAS":
                            layout.prop(tex, "b4w_enable_canvas_mipmapping", text=_("Enable Mipmapping"))

            elif isinstance(idblock, World) and tex.type == "ENVIRONMENT_MAP":
                row = layout.row()
                row.active = active
                row.prop(tex, "b4w_use_sky", text=_("Sky Texture Usage"))

class B4W_TextureWaterFoam(TextureTypePanel, Panel):
    bl_label = _("Water Foam")
    bl_idname = "TEXTURE_PT_b4w_water_foam"
    tex_type = 'IMAGE'
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        self.layout.prop(context.texture, "b4w_water_foam", text="")

    def draw(self, context):
        tex = context.texture
        layout = self.layout

        layout.active = tex.b4w_water_foam

        layout.prop(tex, "b4w_foam_uv_freq", text=_("UV Frequency"))
        layout.prop(tex, "b4w_foam_uv_magnitude", text=_("UV Magnitude"))

class B4W_TEXTURE_PT_influence(TextureSlotPanel, Panel):
    bl_label = _("Influence")

    @classmethod
    def poll(cls, context):
        idblock = context_tex_datablock(context)
        if isinstance(idblock, Brush):
            return False

        if not getattr(context, "texture_slot", None):
            return False

        return TextureSlotPanel.poll(context)

    def draw(self, context):

        layout = self.layout

        idblock = context_tex_datablock(context)

        tex = context.texture_slot

        def factor_but(layout, toggle, factor, name, active=True):
            row = layout.row(align=True)
            row.prop(tex, toggle, text="")
            row.active = active
            sub = row.row(align=True)
            sub.active = getattr(tex, toggle) and active
            sub.prop(tex, factor, text=name, slider=True)
            return sub  # XXX, temp. use_map_normal needs to override.

        if isinstance(idblock, Material):
            if idblock.type in {'SURFACE', 'WIRE'}:
                split = layout.split()

                col = split.column()
                col.label(text=_("Diffuse:"))
                #factor_but(col, "use_map_diffuse", "diffuse_factor", "Intensity")
                factor_but(col, "use_map_color_diffuse", "diffuse_color_factor", "Color")
                factor_but(col, "use_map_alpha", "alpha_factor", "Alpha", active=tex.use_map_color_diffuse)
                #factor_but(col, "use_map_translucency", "translucency_factor", "Translucency")

                col.label(text=_("Specular:"))
                #factor_but(col, "use_map_specular", "specular_factor", "Intensity")
                factor_but(col, "use_map_color_spec", "specular_color_factor", "Color")
                #factor_but(col, "use_map_hardness", "hardness_factor", "Hardness")

                col = split.column()
                col.label(text=_("Shading:"))
                # factor_but(col, "use_map_ambient", "ambient_factor", "Ambient")
                # factor_but(col, "use_map_emit", "emit_factor", "Emit")
                factor_but(col, "use_map_mirror", "mirror_factor", "Mirror")
                # factor_but(col, "use_map_raymir", "raymir_factor", "Ray Mirror")

                col.label(text=_("Geometry:"))
                sub_tmp = factor_but(col, "use_map_normal", "normal_factor", "Normal")
                sub_tmp.active = tex.use_map_normal

                #factor_but(col, "use_map_warp", "warp_factor", "Warp")
                #factor_but(col, "use_map_displacement", "displacement_factor", "Displace")


        elif isinstance(idblock, World):
            split = layout.split()

            col = split.column()
            factor_but(col, "use_map_blend", "blend_factor", "Blend")
            factor_but(col, "use_map_horizon", "horizon_factor", "Horizon")

            col = split.column()
            factor_but(col, "use_map_zenith_up", "zenith_up_factor", "Zenith Up")
            factor_but(col, "use_map_zenith_down", "zenith_down_factor", "Zenith Down")

        elif isinstance(idblock, ParticleSettings):
            split = layout.split()

            col = split.column()
            col.label(text=_("General:"))
            factor_but(col, "use_map_size", "size_factor", "Size")

        layout.separator()

        if not isinstance(idblock, ParticleSettings):
            split = layout.split()

            col = split.column()
            col.prop(tex, "blend_type", text=_("Blend"))
            col.prop(tex, "use_rgb_to_intensity")
            # color is used on gray-scale textures even when use_rgb_to_intensity is disabled.
            col.prop(tex, "color", text="")

            col = split.column()
            col.prop(tex, "invert", text=_("Negative"))
            col.prop(tex, "use_stencil")

        if isinstance(idblock, Material) or isinstance(idblock, World):
            col.prop(tex, "default_value", text=_("DVar"), slider=True)

class B4W_TEXTURE_PT_image_mapping(TextureTypePanel, Panel):
    bl_label = _("Image Mapping")
    bl_options = {'DEFAULT_CLOSED'}
    tex_type = 'IMAGE'

    def draw(self, context):
        layout = self.layout
        tex = context.texture
        layout.prop(tex, "extension")

class B4W_TEXTURE_PT_image(TextureTypePanel, Panel):
    bl_label = _("Image")
    tex_type = 'IMAGE'

    def draw(self, context):
        layout = self.layout
        tex = context.texture

        layout.template_image(tex, "image", tex.image_user)

        idblock = context_tex_datablock(context)
        if isinstance(idblock, Material):
            if (tex and tex.type == "IMAGE" and tex.image is not None 
                    and tex.image.source == "MOVIE"):
                row = layout.row()
                row.prop(tex, "b4w_nla_video", text="Allow NLA")

class B4W_ParallaxPanel(TextureTypePanel, Panel):
    bl_label = _("Parallax")
    bl_idname = "TEXTURE_PT_b4w_parallax"
    tex_type = 'IMAGE'

    def draw_header(self, context):
        self.layout.prop(context.texture, "b4w_use_map_parallax", text="")

    def draw(self, context):
        tex = context.texture
        layout = self.layout

        layout.active = getattr(tex, "b4w_use_map_parallax")
        row = layout.row()
        row.prop(tex, "b4w_parallax_scale", text=_("Scale"), slider=True)
        row.prop(tex, "b4w_parallax_steps", text=_("Steps"), slider=True)
        row.prop(tex, "b4w_parallax_lod_dist", text=_("Lod Distance"), slider=True)

