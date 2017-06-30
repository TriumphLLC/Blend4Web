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

from bpy.app.translations import pgettext_iface as iface_
import blend4web

b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_

def check_vertex_color(mesh, vc_name):
    for color_layer in mesh.vertex_colors:
        if color_layer.name == vc_name:
            return True
    # no found
    return False

def active_node_mat(mat):
    # TODO, 2.4x has a pipeline section, for 2.5 we need to communicate
    # which settings from node-materials are used
    if mat is not None:
        mat_node = mat.active_node_material
        if mat_node:
            return mat_node
        else:
            return mat

    return None

def check_material(mat):
    if mat is not None:
        if mat.use_nodes:
            if mat.active_node_material is not None:
                return True
            return False
        return True
    return False

def simple_material(mat):
    if (mat is not None) and (not mat.use_nodes):
        return True
    return False

# common properties for all B4W material panels
class MaterialButtonsPanel:
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "material"
    COMPAT_ENGINES = ["BLEND4WEB"]

    @classmethod
    def poll(cls, context):
        return (context.material and context.scene.render.engine in cls.COMPAT_ENGINES)

class B4W_MATERIAL_PT_diffuse(MaterialButtonsPanel, Panel):
    bl_label = _("Diffuse")

    @classmethod
    def poll(cls, context):
        mat = context.material
        engine = context.scene.render.engine
        return check_material(mat) and (mat.type in {'SURFACE', 'WIRE'}) and (engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        layout = self.layout

        mat = active_node_mat(context.material)

        split = layout.split()

        col = split.column()
        col.prop(mat, "diffuse_color", text="")
        sub = col.column()
        sub.active = (not mat.use_shadeless)
        sub.prop(mat, "diffuse_intensity", text=_("Intensity"))

        col = split.column()
        col.active = (not mat.use_shadeless)
        col.prop(mat, "diffuse_shader", text="")

        col = layout.column()
        col.active = (not mat.use_shadeless)
        if mat.diffuse_shader == 'OREN_NAYAR':
            col.prop(mat, "roughness")
        elif mat.diffuse_shader == 'MINNAERT':
            col.prop(mat, "darkness")
        elif mat.diffuse_shader == 'TOON':
            row = col.row()
            row.prop(mat, "diffuse_toon_size", text=_("Size"))
            row.prop(mat, "diffuse_toon_smooth", text=_("Smooth"))
        elif mat.diffuse_shader == 'FRESNEL':
            row = col.row()
            row.prop(mat, "diffuse_fresnel", text=_("Fresnel"))
            row.prop(mat, "diffuse_fresnel_factor", text=_("Factor"))

class B4W_MATERIAL_PT_specular(MaterialButtonsPanel, Panel):
    bl_label = _("Specular")

    @classmethod
    def poll(cls, context):
        mat = context.material
        engine = context.scene.render.engine
        return check_material(mat) and (mat.type in {'SURFACE', 'WIRE'}) and (engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        layout = self.layout

        mat = active_node_mat(context.material)

        layout.active = (not mat.use_shadeless)

        split = layout.split()

        col = split.column()
        col.prop(mat, "specular_color", text="")
        col.prop(mat, "specular_intensity", text=_("Intensity"))

        col = split.column()
        col.prop(mat, "specular_shader", text="")

        col = layout.column()
        if mat.specular_shader in {'COOKTORR', 'PHONG'}:
            col.prop(mat, "specular_hardness", text=_("Hardness"))
        elif mat.specular_shader == 'BLINN':
            row = col.row()
            row.prop(mat, "specular_hardness", text=_("Hardness"))
            row.prop(mat, "specular_ior", text=_("IOR"))
        elif mat.specular_shader == 'WARDISO':
            col.prop(mat, "specular_slope", text=_("Slope"))
        elif mat.specular_shader == 'TOON':
            row = col.row()
            row.prop(mat, "specular_toon_size", text=_("Size"))
            row.prop(mat, "specular_toon_smooth", text=_("Smooth"))

class B4W_MATERIAL_PT_shading(MaterialButtonsPanel, Panel):
    bl_label = _("Shading")

    @classmethod
    def poll(cls, context):
        mat = context.material
        engine = context.scene.render.engine
        return check_material(mat) and (mat.type in {'SURFACE', 'WIRE'}) and (engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        layout = self.layout

        mat = active_node_mat(context.material)

        if mat.type in {'SURFACE', 'WIRE'}:
            split = layout.split()

            col = split.column()
            sub = col.column()
            sub.active = not mat.use_shadeless
            sub.prop(mat, "emit")
            sub.prop(mat, "ambient")

            col = split.column()
            col.prop(mat, "use_shadeless")
            col.prop(mat, "use_tangent_shading")
            col.prop(mat, "b4w_double_sided_lighting", text = _("Double-Sided Lighting"))


class B4W_MATERIAL_PT_transp(MaterialButtonsPanel, Panel):
    bl_label = _("Transparency")

    @classmethod
    def poll(cls, context):
        mat = context.material
        engine = context.scene.render.engine
        return (mat and (mat.type in {'SURFACE', 'WIRE','HALO'})
                and (engine in cls.COMPAT_ENGINES))

    def draw(self, context):
        layout = self.layout

        mat = active_node_mat(context.material)

        layout.prop(mat, "use_transparency", text=_("Show Transparency"))
        split = layout.split()
        col = split.column()
        col.active = not mat.use_nodes
        col.prop(mat, "alpha")
        col.prop(mat, "specular_alpha", text=_("Specular"))

        col = split.column()
        game = context.material.game_settings
        col.prop(game, "alpha_blend", text=_("Type"))
        col.prop(mat, "offset_z")

class B4W_MATERIAL_PT_mirror(MaterialButtonsPanel, Panel):
    bl_label = _("Mirror")
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        mat = context.material
        engine = context.scene.render.engine
        return check_material(mat) and (mat.type in {'SURFACE', 'WIRE'}) and (engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        layout = self.layout

        mat = active_node_mat(context.material)

        raym = mat.raytrace_mirror

        layout.prop(raym, "use", text=_("Show Reflectivity"))
        split = layout.split()

        col = split.column()
        col.prop(raym, "reflect_factor")

        col = split.column()
        col.prop(raym, "fresnel")
        sub = col.column()
        sub.active = (raym.fresnel > 0.0)
        sub.prop(raym, "fresnel_factor", text=_("Blend"))

class B4W_MATERIAL_PT_halo(MaterialButtonsPanel, Panel):
    bl_label = _("Halo")

    @classmethod
    def poll(cls, context):
        mat = context.material
        engine = context.scene.render.engine
        return mat and (mat.type == 'HALO') and (engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        layout = self.layout

        mat = context.material  # don't use node material
        halo = mat.halo

        def number_but(layout, toggle, number, name, color):
            row = layout.row(align=True)
            row.prop(halo, toggle, text="")
            sub = row.column(align=True)
            sub.active = getattr(halo, toggle)
            sub.prop(halo, number, text=name, translate=False)
            if not color == "":
                sub.prop(mat, color, text="")

        split = layout.split()

        col = split.column()
        col.prop(mat, "alpha")
        col.prop(mat, "diffuse_color", text="")

        col = split.column()
        col.prop(halo, "size")
        col.prop(halo, "hardness")

        layout.label(text=_("Options:"))

        number_but(layout, "use_ring", "ring_count", iface_(_("Rings")), "mirror_color")
        number_but(layout, "use_lines", "line_count", iface_(_("Lines")), "specular_color")
        number_but(layout, "use_star", "star_tip_count", iface_(_("Star Tips")), "")

        row = layout.row()
        row.prop(mat, "b4w_halo_sky_stars", text = _("Special: Stars"));

        if mat.b4w_halo_sky_stars:
            row = layout.row()
            row.prop(mat, "b4w_halo_stars_blend_height", text = _("Blending Height"));

            row = layout.row()
            row.prop(mat, "b4w_halo_stars_min_height", text = _("Minimum Height"));

class B4W_MATERIAL_PT_rendering_options(MaterialButtonsPanel, Panel):
    bl_label = _("Rendering Options")

    @classmethod
    def poll(cls, context):
        mat = context.material
        engine = context.scene.render.engine
        return (mat and (mat.type in {'SURFACE', 'WIRE', 'HALO'})
                and (engine in cls.COMPAT_ENGINES))

    def draw(self, context):
        layout = self.layout
        base_mat = context.material
        mat = active_node_mat(base_mat)

        split = layout.split()
        col = split.column()
        col.prop(mat, "b4w_do_not_render", text=_("Do Not Render"))

        col = split.column()
        col.active = base_mat.game_settings.alpha_blend not in ["OPAQUE", "CLIP"]
        col.prop(mat, "b4w_render_above_all", text=_("Render Above All"))

        row = layout.row()
        game = context.material.game_settings
        row.prop(game, "use_backface_culling")
        row.prop(mat, "use_vertex_color_paint")

        split = layout.split()
        col = split.column()
        col.prop(mat, "b4w_wettable", text=_("Wettable"))

        split = layout.split()
        col = split.column()
        col.prop(mat, "b4w_lens_flares", text=_("Lens Flare"))

        col = split.column()
        col.active = not mat.use_nodes
        col.prop(mat, "b4w_refractive", text = _("Refractive"))
        row = col.row()
        row.active = mat.b4w_refractive
        row.prop(mat, "b4w_refr_bump", text=_("Refraction Bump"))

class B4W_MaterialExport(MaterialButtonsPanel, bpy.types.Panel):
    bl_label = _("Export Options")
    bl_idname = "MATERIAL_PT_b4w_export"

    def draw(self, context):
        layout = self.layout

        mat = context.material

        # prevent errors when panel is empty
        if mat:
            row = layout.row()
            row.prop(mat, "b4w_do_not_export", text=_("Do Not Export"))

class B4W_TerrainDynGrass(MaterialButtonsPanel, bpy.types.Panel):
    bl_label = _("Terrain Dynamic Grass")
    bl_idname = "MATERIAL_PT_b4w_terrain"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        mat = context.material
        return (mat and (mat.type in {'SURFACE'}) and
                context.scene.render.engine in cls.COMPAT_ENGINES)

    def draw_header(self, context):
        mat = context.material
        self.layout.prop(mat, "b4w_terrain", text="")

    def draw(self, context):
        mat = context.material

        layout = self.layout
        layout.active = getattr(mat, "b4w_terrain")

        icon_size = "NONE"
        icon_color = "NONE"
        obj = bpy.context.active_object

        grass_size = mat.b4w_dynamic_grass_size
        grass_color = mat.b4w_dynamic_grass_color

        if grass_size != "":
            icon_size = "ERROR"
        if grass_color != "":
            icon_color = "ERROR"

        if obj.type == "MESH":
            if check_vertex_color(obj.data, grass_size):
                icon_size = "GROUP_VCOL"
            if check_vertex_color(obj.data, grass_color):
                icon_color = "GROUP_VCOL"

        row = layout.row()
        row.prop(mat, "b4w_dynamic_grass_size", text=_("Grass Size (R)"), icon=icon_size)

        row = layout.row()
        row.prop(mat, "b4w_dynamic_grass_color", text=_("Grass Color (RGB)"), icon=icon_color)

class B4W_CollisionMaterial(MaterialButtonsPanel, bpy.types.Panel):
    bl_label = _("Special: Collision")
    bl_idname = "MATERIAL_PT_b4w_collision"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        mat = context.material
        return (mat and (mat.type in {'SURFACE', 'HALO'}) and
                context.scene.render.engine in cls.COMPAT_ENGINES)

    def draw_header(self, context):
        mat = context.material
        self.layout.prop(mat, "b4w_collision", text="")

    def draw(self, context):
        mat = context.material

        layout = self.layout
        layout.active = mat.b4w_collision

        row = layout.row()
        row.prop(mat, "b4w_use_ghost", text=_("Ghost"))

        row = layout.row()
        row.prop(mat, "b4w_collision_id", text=_("Collision ID"))

        col = layout.column()
        col.prop(mat, "b4w_collision_margin", text=_("Margin"))

        phys = context.material.physics  # don't use node material

        split = layout.split()
        row = split.row()
        row.prop(phys, "friction")
        row.prop(phys, "elasticity", slider=True)

        col = layout.column()
        col.prop(mat, "b4w_collision_group", text=_("Collision Group"))
        col = layout.column()
        col.prop(mat, "b4w_collision_mask", text=_("Collision Mask"))


class B4W_WaterMaterial(MaterialButtonsPanel, bpy.types.Panel):
    bl_label = _("Water")
    bl_idname = "MATERIAL_PT_b4w_water"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        mat = context.material
        return (simple_material(mat) and (mat.type in {'SURFACE'}) and
                context.scene.render.engine in cls.COMPAT_ENGINES)

    def draw_header(self, context):
        mat = context.material
        self.layout.prop(mat, "b4w_water", text="")

    def draw(self, context):
        mat = context.material

        layout = self.layout
        layout.active = mat.b4w_water

        split = layout.split()

        col = split.column()
        col.prop(mat, "b4w_water_shore_smoothing", text=_("Shore Smoothing"))
        row = col.row()
        row.active = getattr(mat, "b4w_water_shore_smoothing")
        row.prop(mat, "b4w_water_absorb_factor", text=_("Absorb Factor"))

        col = split.column()
        col.label(text=_("Foam:"))
        col.prop(mat, "b4w_foam_factor", text=_("Factor"))

        layout.separator()

        split = layout.split()
        col = split.column()
        col.label(text = _("Shallow water:"))
        col.prop(mat, "b4w_shallow_water_col", text="")
        col.prop(mat, "b4w_shallow_water_col_fac", text=_("Factor"))

        col.label(text = _("Underwater fog:"))
        col.prop(mat, "b4w_water_fog_color", text="")
        col.prop(mat, "b4w_water_fog_density", text=_("Density"))

        col = split.column()
        col.label(text = _("Shore water:"))
        col.prop(mat, "b4w_shore_water_col", text="")
        col.prop(mat, "b4w_shore_water_col_fac", text=_("Factor"))

        layout.separator()

        split = layout.split()
        col = split.column()
        col.label(text=_("Sub Surface Scattering"))
        col.prop(mat, "b4w_water_sss_strength", text=_("Strength"))
        col.prop(mat, "b4w_water_sss_width", text=_("Width"))

        col = split.column()
        col.label(text=_("Ripples (NormalMap)"))
        col.prop(mat, "b4w_water_norm_uv_velocity", text=_("Velocity"))

        layout.separator()

        row = layout.row()
        row.prop(mat, "b4w_water_dynamic", text=_("Waves"))

        row = layout.row()
        row.active = getattr(mat, "b4w_water_dynamic")
        row.prop(mat, "b4w_waves_height", text=_("Waves Height"))
        row.prop(mat, "b4w_waves_length", text=_("Waves Length"))

        row = layout.row()
        row.active = getattr(mat, "b4w_water_dynamic")
        row.prop(mat, "b4w_water_dst_noise_scale0", text=_("Noise Dist Scale 0"))
        row.prop(mat, "b4w_water_dst_noise_scale1", text=_("Noise Dist Scale 1"))

        row = layout.row()
        row.active = getattr(mat, "b4w_water_dynamic")
        row.prop(mat, "b4w_water_dst_noise_freq0", text=_("Noise Dist Freq 0"))
        row.prop(mat, "b4w_water_dst_noise_freq1", text=_("Noise Dist Freq 1"))

        row = layout.row()
        row.active = getattr(mat, "b4w_water_dynamic")
        row.prop(mat, "b4w_water_dir_min_shore_fac", text=_("Min Dir Shore Fac"))
        row.prop(mat, "b4w_water_dir_freq", text=_("Dir Frequency"))

        row = layout.row()
        row.active = getattr(mat, "b4w_water_dynamic")
        row.prop(mat, "b4w_water_dir_noise_scale", text=_("Noise Dir Scale"))
        row.prop(mat, "b4w_water_dir_noise_freq", text=_("Noise Dir Freq"))

        row = layout.row()
        row.active = getattr(mat, "b4w_water_dynamic")
        row.prop(mat, "b4w_water_dir_min_noise_fac", text=_("Min Dir Noise Fac"))
        row.prop(mat, "b4w_water_dst_min_fac", text=_("Min Dist Fac"))

        row = layout.row()
        row.active = getattr(mat, "b4w_water_dynamic")
        row.prop(mat, "b4w_water_waves_hor_fac", text=_("Horizontal Factor"))

        layout.separator()

        split = layout.split()

        col = split.column()
        col.prop(mat, "b4w_generated_mesh", text=_("Generate Mesh"))

        row = col.row()
        row.active = getattr(mat, "b4w_generated_mesh")
        row.prop(mat, "b4w_water_num_cascads", text=_("Cascades Number"))

        row = col.row()
        row.active = getattr(mat, "b4w_generated_mesh")
        row.prop(mat, "b4w_water_subdivs", text=_("Subdivisions"))

        row = col.row()
        row.active = getattr(mat, "b4w_generated_mesh")
        row.prop(mat, "b4w_water_detailed_dist", text=_("Detailed Distance"))

        row = col.row()
        row.active = getattr(mat, "b4w_generated_mesh")

        # calculate vertices number in generated mesh
        n = getattr(mat, "b4w_water_num_cascads")
        s = getattr(mat, "b4w_water_subdivs")
        count = (n*(s + 1)*(s + 1) - 4*(n - 1)*s
               - 2*s - (n - 1)*(s/2 - 1)*(s/2 - 1)
               + 8)
        row.label(text = (_("Number of vertices ") + repr(count)))

        col = split.column()
        row = col.row()
        row.prop(mat, "b4w_water_enable_caust", text=_("Caustics"))

        row = col.row()
        row.active = getattr(mat, "b4w_water_enable_caust")
        row.prop(mat, "b4w_water_caust_scale", text=_("Scale"))

        row = col.row()
        row.active = getattr(mat, "b4w_water_enable_caust")
        row.prop(mat, "b4w_water_caust_brightness", text=_("Brightness"))

