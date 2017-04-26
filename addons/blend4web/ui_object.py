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

def check_vertex_color(mesh, vc_name):
    for color_layer in mesh.vertex_colors:
        if color_layer.name == vc_name:
            return True
    # no found
    return False

# common properties for all B4W object panels
class ObjectButtonsPanel:
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "object"
    COMPAT_ENGINES = ["BLEND4WEB"]

    @classmethod
    def poll(cls, context):
        return (context.object and context.scene.render.engine in cls.COMPAT_ENGINES)

def get_locked_track_constraint(obj, index):
    constraint_index = 0
    for cons in obj.constraints:
        if cons.type == "LOCKED_TRACK":
            if constraint_index == index:
                return cons
            constraint_index += 1

class B4W_OBJECT_PT_levels_of_detail(ObjectButtonsPanel, Panel):
    bl_label = _("Levels of Detail")
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        obj = context.object
        is_mesh = obj.type == "MESH" or obj.type == "FONT" \
               or obj.type == "META" or obj.type == "SURFACE"
        is_empty = obj.type == "EMPTY"
        return ((is_mesh or is_empty) and context.object
                and context.scene.render.engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        layout = self.layout
        obj = context.object

        col = layout.column()

        for i, level in enumerate(obj.lod_levels):
            if i == 0:
                continue
            box = col.box()
            row = box.row()
            row.prop(level, "object", text="")
            row.operator("object.lod_remove", text="", icon='PANEL_CLOSE').index = i

            row = box.row()
            row.prop(level, "distance")
            row = row.row(align=True)
            row.prop(level, "use_mesh", text="")
            row.prop(level, "use_material", text="")

        row = col.row(align=True)
        row.operator("object.lod_add", text=_("Add"), icon='ZOOMIN')
        row.menu("OBJECT_MT_lod_tools", text="", icon='TRIA_DOWN')

class B4W_ObjectAnimation(ObjectButtonsPanel, Panel):
    bl_label = _("Animation")
    bl_idname = "OBJECT_PT_b4w_animation"

    def draw(self, context):
        obj = context.object

        layout = self.layout
        layout.prop(context.object, "b4w_use_default_animation", text=_("Apply Default Animation"))

        row = layout.row()
        row.active = obj.b4w_use_default_animation
        row.prop(obj, "b4w_anim_behavior", text=_("Behavior"))

        if obj.type == "ARMATURE":
            row = layout.row()
            row.prop(obj, "b4w_animation_mixing", text=_("Animation Blending"))

        if obj.proxy:
            row = layout.row(align=True)
            row.label(text=_("Proxy:"))

            col = row.column()
            col.prop(obj, "b4w_proxy_inherit_anim", text=_("Inherit Animation"))

class B4W_ObjectExportOptions(ObjectButtonsPanel, Panel):
    bl_label = _("Export Options")
    bl_idname = "OBJECT_PT_b4w_export_options"

    def draw(self, context):
        obj = context.object

        layout = self.layout

        row = layout.row()
        row.prop(obj, "b4w_do_not_export", text=_("Do Not Export"))

        row = layout.row(align=True)
        row.active = not obj.b4w_do_not_export

        if (obj.type == "MESH" or obj.type == "FONT" or obj.type == "META" 
                or obj.type == "SURFACE" or obj.type == "CURVE"):
            col = row.column()
            col.prop(obj, "b4w_apply_modifiers", text=_("Apply Modifiers"))
            col.prop(obj, "b4w_apply_scale", text=_("Apply Scale And Modifiers"))

        if obj.type == "MESH":
            col = row.column()
            col.prop(obj, "b4w_shape_keys", text=_("Export Shape Keys"))
            col.prop(obj, "b4w_loc_export_vertex_anim", text=_("Export Vertex " +
                    "Animation"))

class B4W_ObjectRenderProps(ObjectButtonsPanel, Panel):
    bl_label = _("Rendering Properties")
    bl_idname = "OBJECT_PT_b4w_render_props"

    @classmethod
    def poll(cls, context):
        obj = context.object
        right_type = obj.type in {"MESH", "FONT", "META", "SURFACE", "EMPTY"}
        return (right_type and context.object
                and context.scene.render.engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        obj = context.object
        is_mesh = obj.type in {"MESH", "FONT", "META", "SURFACE"}

        layout = self.layout

        row = layout.row()
        row.prop(obj, "b4w_hidden_on_load", text=_("Hidden"))
        row = layout.row()
        if len(obj.children):
            row.prop(obj, "b4w_hide_chldr_on_load", text=_("Hidden Children"))
            row.active = obj.b4w_hidden_on_load

        if is_mesh:
            row = layout.row()
            row.prop(obj, "b4w_do_not_render", text=_("Do Not Render"))
        elif obj.type == "EMPTY":
            row = layout.row()

        if is_mesh or obj.type == "EMPTY":
            row.prop(obj, "b4w_do_not_batch", text=_("Force Dynamic Object"))
        
        if is_mesh:
            row = layout.row()
            row.active = not obj.b4w_do_not_render
            row.prop(obj, "b4w_do_not_cull", text=_("Disable Frustum Culling"))
            row.prop(obj, "b4w_dynamic_geometry", text=_("Dynamic Geometry & Materials"))
        elif obj.type == "EMPTY":
            row = layout.row()
            row.prop(obj, "b4w_line_renderer", text=_("Line Renderer"))

class B4W_ObjectShadows(ObjectButtonsPanel, Panel):
    bl_label = _("Shadows")
    bl_idname = "OBJECT_PT_b4w_shadows"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        obj = context.object
        is_mesh = obj.type == "MESH" or obj.type == "FONT" \
               or obj.type == "META" or obj.type == "SURFACE"
        return (is_mesh and context.object
                and context.scene.render.engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        obj = context.object

        layout = self.layout

        row = layout.row()
        row.prop(obj, "b4w_shadow_cast", text=_("Cast Shadows "))
        row.prop(obj, "b4w_shadow_receive", text=_("Receive Shadows "))

        if obj.b4w_shadow_cast:
            row = layout.row()
            row.prop(obj, "b4w_shadow_cast_only", text=_("Cast Only "))

class B4W_ObjectBillboard(ObjectButtonsPanel, Panel):
    bl_label = _("Billboard")
    bl_idname = "OBJECT_PT_b4w_billboard"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        obj = context.object
        is_mesh = obj.type == "MESH" or obj.type == "FONT" \
               or obj.type == "META" or obj.type == "SURFACE"
        return (is_mesh and context.object
                and context.scene.render.engine in cls.COMPAT_ENGINES)

    def draw_header(self, context):
        self.layout.prop(context.object, "b4w_billboard", text="")

    def draw(self, context):
        obj = context.object
        layout = self.layout
        layout.active = obj.b4w_billboard

        layout.prop(obj, "b4w_pres_glob_orientation",
                text=_("Preserve Global Rotation and Scale"))
        row = layout.row()
        row.label(text=_("Type:"))
        row.prop(obj, "b4w_billboard_geometry", expand=True)

class B4W_ObjectReflections(ObjectButtonsPanel, Panel):
    bl_label = _("Real-Time Reflections")
    bl_idname = "OBJECT_PT_b4w_reflections"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        obj = context.object
        is_mesh = obj.type == "MESH" or obj.type == "FONT" \
               or obj.type == "META" or obj.type == "SURFACE"
        return (is_mesh and context.object
                and context.scene.render.engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        obj = context.object

        layout = self.layout

        split = layout.split()
        col = split.column()
        col.prop(obj, "b4w_reflective", text=_("Reflective"))

        if obj.b4w_reflective:
            col.prop(obj, "b4w_reflection_type", text=_("Type"))

            if obj.b4w_reflection_type == "PLANE":
                index = obj.b4w_refl_plane_index
                locked_cons = get_locked_track_constraint(obj, index)
                col.label(text=_("Reflection Plane:"))
                col.prop(locked_cons, "target", text="")

        col = split.column()
        col.prop(obj, "b4w_reflexible", text=_("Reflexible"))
        if obj.b4w_reflexible:
            col.prop(obj, "b4w_reflexible_only", text=_("Reflexible Only"))


class B4W_ObjectOutlineSelect(ObjectButtonsPanel, Panel):
    bl_label = _("Selection and Outlining")
    bl_idname = "OBJECT_PT_b4w_outline_selectable"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        obj = context.object
        is_mesh = obj.type == "MESH" or obj.type == "FONT" \
               or obj.type == "META" or obj.type == "SURFACE"
        return (is_mesh and context.object
                and context.scene.render.engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        obj = context.object

        layout = self.layout

        split = layout.split()
        col = split.column()
        col.prop(obj, "b4w_selectable", text=_("Selectable"))
        
        col = split.column()
        col.prop(obj, "b4w_outlining", text=_("Enable Outlining"))
        row = col.row()
        row.active = obj.b4w_outlining and obj.b4w_selectable 
        row.prop(obj, "b4w_outline_on_select", text=_("Outline on Select"))

        col.separator()
        row = col.row()
        row.active = obj.b4w_outlining
        row.prop(obj.b4w_outline_settings, "outline_duration", text=_("Duration"))
        row = col.row()
        row.active = obj.b4w_outlining
        row.prop(obj.b4w_outline_settings, "outline_period", text=_("Period"))
        row = col.row()
        row.active = obj.b4w_outlining
        row.prop(obj.b4w_outline_settings, "outline_relapses", text=_("Relapses"))

class B4W_ObjectAnchors(ObjectButtonsPanel, Panel):
    bl_label = _("Anchors")
    bl_idname = "OBJECT_PT_b4w_anchors"

    @classmethod
    def poll(cls, context):
        obj = context.object
        return (obj.type == "EMPTY" and context.object
                and context.scene.render.engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        obj = context.object

        layout = self.layout

        col = layout.column()
        row = col.row()
        row.prop(obj, "b4w_enable_anchor", text=_("Enable Anchor"))

        if obj.b4w_enable_anchor:
            row = col.row()
            row.prop(obj.b4w_anchor, "type", text=_("Type"))

            if obj.b4w_anchor.type == "ELEMENT":
                row = col.row()
                row.prop(obj.b4w_anchor, "element_id", text=_("HTML Element ID"))

            row = col.row()
            row.prop(obj.b4w_anchor, "detect_visibility", text=_("Detect " +
                    "Visibility"))

            if obj.b4w_anchor.type == "ANNOTATION":
                row = col.row()
                row.prop(obj.b4w_anchor, "max_width")

class B4W_ObjectTags(ObjectButtonsPanel, Panel):
    bl_label = _("Meta Tags")
    bl_idname = "OBJECT_PT_b4w_tags"
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        self.layout.prop(context.object, "b4w_enable_object_tags", text="")

    def draw(self, context):
        obj = context.object
        b4w_obj_tags = obj.b4w_object_tags

        layout = self.layout
        layout.active = getattr(obj, "b4w_enable_object_tags")

        col = layout.column()
        row = col.row()
        row.prop(b4w_obj_tags, "title", text=_("Title"))

        row = col.row()
        row.prop(b4w_obj_tags, "category", text=_("Category"))

        row = col.row()
        if b4w_obj_tags.desc_source == "TEXT":
            icon = "NONE"
        else:
            icon = "ERROR"
            for text in bpy.data.texts:
                if text.name == b4w_obj_tags.description:
                    icon = "TEXT"
                    break
        row.prop(b4w_obj_tags, "description", icon=icon)

        row = col.row()
        row.label(text=_("Description Source:"))
        row.prop(b4w_obj_tags, "desc_source", expand=True, text=_("Source"))

class B4W_OBJECT_PT_relations(ObjectButtonsPanel, Panel):
    bl_label = _("Relations")

    def draw(self, context):
        layout = self.layout

        ob = context.object

        split = layout.split()

        col = split.column()
        col.prop(ob, "layers")
        #col.separator()
        #col.prop(ob, "pass_index")

        col = split.column()
        col.label(text="Parent:")
        col.prop(ob, "parent", text="")

        sub = col.column()
        sub.prop(ob, "parent_type", text="")
        parent = ob.parent
        if parent and ob.parent_type == 'BONE' and parent.type == 'ARMATURE':
            sub.prop_search(ob, "parent_bone", parent.data, "bones", text="")
        sub.active = (parent is not None)

        if parent and parent.type == "CAMERA":
            enable_align = ob.b4w_enable_viewport_alignment
            align = ob.b4w_viewport_alignment

            layout.prop(ob, "b4w_enable_viewport_alignment",
                    text=_("Viewport Alignment"))

            row = layout.row()
            row.active = enable_align
            row.prop(align, "alignment")

            row = layout.row()
            row.active = enable_align
            row.prop(align, "distance")

            row = layout.row()
            row.active = enable_align
            row.operator("b4w.viewport_alignment_fit")

class B4W_OBJECT_PT_duplication(ObjectButtonsPanel, Panel):
    bl_label = _("Duplication")
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout

        obj = context.object

        layout.prop(obj, "dupli_type", expand=True)

        if obj.dupli_type == 'GROUP':
            layout.prop(obj, "dupli_group", text=_("Group"))

        elif obj.dupli_type != 'NONE':
            row = layout.row()
            row.label(text=_("Wrong Dupli Type. Only Group type is supported."))

class B4W_ObjectWindBending(ObjectButtonsPanel, Panel):
    bl_label = _("Wind Bending")
    bl_idname = "OBJECT_PT_b4w_wind_bending"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        obj = context.object
        is_mesh = obj.type == "MESH" or obj.type == "FONT" \
               or obj.type == "META" or obj.type == "SURFACE"
        return (is_mesh and context.object
                and context.scene.render.engine in cls.COMPAT_ENGINES)

    def draw_header(self, context):
        self.layout.prop(context.object, "b4w_wind_bending", text="")

    def draw(self, context):
        obj = context.object

        icon_stiffnes = "NONE"
        icon_leaves_stiffness = "NONE"
        icon_phase = "NONE"
        icon_overall = "NONE"

        layout = self.layout
        layout.active = getattr(obj, "b4w_wind_bending")

        split = layout.split()

        # main bending
        detail_bend = obj.b4w_detail_bend_colors
        col = split.column()
        col.label(text=_("Detail Bending:"))
        col.prop(obj, "b4w_detail_bending_amp", slider=True,
                text=_("Amplitude"))
        col.prop(obj, "b4w_branch_bending_amp", slider=True,
                text=_("Branch Amplitude"))
        col.prop(obj, "b4w_detail_bending_freq", slider=True,
                text=_("Bending Frequency"))
        col.separator()
        if obj.type == "MESH":
            if detail_bend.leaves_stiffness_col != "":
                icon_leaves_stiffness = "ERROR"
                if check_vertex_color(obj.data, detail_bend.leaves_stiffness_col):
                    icon_leaves_stiffness = "GROUP_VCOL"
            col.prop(detail_bend, "leaves_stiffness_col", text=_("Leaves Stiffness (R)"), icon=icon_leaves_stiffness)
            if detail_bend.leaves_phase_col != "":
                icon_phase = "ERROR"
                if check_vertex_color(obj.data, detail_bend.leaves_phase_col):
                    icon_phase = "GROUP_VCOL"
            col.prop(detail_bend, "leaves_phase_col", text=_("Leaves Phase (G)"), icon=icon_phase)
            if detail_bend.overall_stiffness_col != "":
                icon_overall = "ERROR"
                if check_vertex_color(obj.data, detail_bend.overall_stiffness_col):
                    icon_overall = "GROUP_VCOL"
            col.prop(detail_bend, "overall_stiffness_col", text=_("Overall Stiffness (B)"), icon=icon_overall)

        # main bending
        col = split.column()
        col.label(text=_("Main Bending:"))
        col.prop(obj, "b4w_wind_bending_angle", slider=True, text=_("Angle"))
        col.prop(obj, "b4w_wind_bending_freq", text=_("Frequency"))

        col.label(text="")
        col.separator()

        if obj.type == "MESH":
            if obj.b4w_main_bend_stiffness_col != "":
                icon_stiffnes = "ERROR"
                if check_vertex_color(obj.data, obj.b4w_main_bend_stiffness_col):
                    icon_stiffnes = "GROUP_VCOL"
            col.prop(obj, "b4w_main_bend_stiffness_col", text=_("Main Stiffness (A)"), icon=icon_stiffnes)


class B4W_ObjectEffects(ObjectButtonsPanel, Panel):
    bl_label = _("Special Effects")
    bl_idname = "OBJECT_PT_b4w_effects"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        obj = context.object

        if not obj:
            return False

        if obj.type not in {'MESH','FONT','META','SURFACE'}:
            return False

        return context.scene.render.engine in cls.COMPAT_ENGINES

    def draw(self, context):
        obj = context.object
        layout = self.layout

        row = layout.row()
        row.prop(obj, "b4w_disable_fogging", text=_("Disable Fogging"))

        row = layout.row()
        row.prop(obj, "b4w_caustics", text=_("Caustics"))

