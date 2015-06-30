import bpy
import imp
import mathutils
import math
import os
import cProfile
import bgl

from bpy.types import Panel

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
    bl_label = "Levels of Detail"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        obj = context.object
        is_mesh = obj.type == "MESH" or obj.type == "FONT" \
               or obj.type == "META" or obj.type == "SURFACE"
        return (is_mesh and context.object
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
        row.operator("object.lod_add", text="Add", icon='ZOOMIN')
        row.menu("OBJECT_MT_lod_tools", text="", icon='TRIA_DOWN')

        row = layout.row()
        row.prop(obj, "b4w_lod_transition", text="Lod Transition Ratio")

class B4W_ObjectAnimation(ObjectButtonsPanel, Panel):
    bl_label = "Animation"
    bl_idname = "OBJECT_PT_b4w_animation"

    def draw(self, context):
        obj = context.object

        layout = self.layout
        layout.prop(context.object, "b4w_use_default_animation", text="Apply default animation")

        row = layout.row()
        row.active = obj.b4w_use_default_animation
        row.prop(obj, "b4w_anim_behavior", text="Behavior")

        if obj.type == "ARMATURE":
            row = layout.row()
            row.prop(obj, "b4w_animation_mixing", text="Animation Blending")

        if obj.proxy:
            row = layout.row(align=True)
            row.label("Proxy:")

            col = row.column()
            col.prop(obj, "b4w_proxy_inherit_anim", text="Inherit Animation")

class B4W_ObjectExportOptions(ObjectButtonsPanel, Panel):
    bl_label = "Export Options"
    bl_idname = "OBJECT_PT_b4w_export_options"

    def draw(self, context):
        obj = context.object

        layout = self.layout

        row = layout.row()
        row.prop(obj, "b4w_do_not_export", text="Do Not Export")

        row = layout.row(align=True)
        row.active = not obj.b4w_do_not_export

        if (obj.type == "MESH" or obj.type == "FONT" or obj.type == "META" 
                or obj.type == "SURFACE" or obj.type == "CURVE"):
            col = row.column()
            col.prop(obj, "b4w_apply_modifiers", text="Apply Modifiers")
            col.prop(obj, "b4w_apply_scale", text="Apply Scale And Modifiers")

        if obj.type == "MESH":
            col = row.column()
            col.prop(obj, "b4w_shape_keys", text="Export Shape Keys")
            col.prop(obj, "b4w_loc_export_vertex_anim", text="Export Vertex " +
                    "Animation")

class B4W_ObjectRenderProps(ObjectButtonsPanel, Panel):
    bl_label = "Rendering Properties"
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

        if is_mesh:
            row = layout.row()
            row.prop(obj, "b4w_do_not_render", text="Do Not Render")
        elif obj.type == "EMPTY":
            row = layout.row()

        if is_mesh or obj.type == "EMPTY":
            row.prop(obj, "b4w_do_not_batch", text="Force Dynamic Object")
        
        if is_mesh:
            row = layout.row()
            row.active = not obj.b4w_do_not_render
            row.prop(obj, "b4w_do_not_cull", text="Disable Frustum Culling")
            row.prop(obj, "b4w_dynamic_geometry", text="Dynamic Geometry")

class B4W_ObjectShadows(ObjectButtonsPanel, Panel):
    bl_label = "Shadows"
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
        row.prop(obj, "b4w_shadow_cast", text="Cast")
        row.prop(obj, "b4w_shadow_receive", text="Receive")

        if obj.b4w_shadow_cast:
            row = layout.row()
            row.prop(obj, "b4w_shadow_cast_only", text="Cast Only")

class B4W_ObjectBillboard(ObjectButtonsPanel, Panel):
    bl_label = "Billboard"
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
                text="Preserve Global Rotation and Scale")
        row = layout.row()
        row.label(text="Type:")
        row.prop(obj, "b4w_billboard_geometry", expand=True)

class B4W_ObjectReflections(ObjectButtonsPanel, Panel):
    bl_label = "Reflections"
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
        col.prop(obj, "b4w_reflective", text="Reflective")

        if obj.b4w_reflective:
            col.prop(obj, "b4w_reflection_type", text="Type")
            if obj.b4w_reflection_type == "PLANE":
                index = obj.b4w_refl_plane_index
                locked_cons = get_locked_track_constraint(obj, index)

                row = col.row()
                row.prop(locked_cons, "target", text="Reflection Plane")

        col = split.column()
        col.prop(obj, "b4w_reflexible", text="Reflexible")
        if obj.b4w_reflexible:
            col.prop(obj, "b4w_reflexible_only", text="Reflexible Only")


class B4W_ObjectOutlineSelect(ObjectButtonsPanel, Panel):
    bl_label = "Selection and Outlining"
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
        col.prop(obj, "b4w_selectable", text="Selectable")
        
        col = split.column()
        col.prop(obj, "b4w_outlining", text="Enable Outlining")
        row = col.row()
        row.active = obj.b4w_outlining and obj.b4w_selectable 
        row.prop(obj, "b4w_outline_on_select", text="Outline on Select")

        col.separator()
        row = col.row()
        row.active = obj.b4w_outlining
        row.prop(obj.b4w_outline_settings, "outline_duration", text="Duration")
        row = col.row()
        row.active = obj.b4w_outlining
        row.prop(obj.b4w_outline_settings, "outline_period", text="Period")
        row = col.row()
        row.active = obj.b4w_outlining
        row.prop(obj.b4w_outline_settings, "outline_relapses", text="Relapses")

class B4W_ObjectAnchors(ObjectButtonsPanel, Panel):
    bl_label = "Anchors"
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
        row.prop(obj, "b4w_enable_anchor", text="Enable Anchor")

        if obj.b4w_enable_anchor:
            row = col.row()
            row.prop(obj.b4w_anchor, "type", text="Type")

            if obj.b4w_anchor.type == "ELEMENT":
                row = col.row()
                row.prop(obj.b4w_anchor, "element_id", text="HTML Element ID")

            row = col.row()
            row.prop(obj.b4w_anchor, "detect_visibility", text="Detect "
                    "Visibility")

            if obj.b4w_anchor.type == "ANNOTATION":
                row = col.row()
                row.prop(obj.b4w_anchor, "max_width")

class B4W_ObjectTags(ObjectButtonsPanel, Panel):
    bl_label = "Meta Tags"
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
        row.prop(b4w_obj_tags, "title", text="Title")

        row = col.row()
        row.prop(b4w_obj_tags, "category", text="Category")

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
        row.label("Description Source:")
        row.prop(b4w_obj_tags, "desc_source", expand=True, text="Source")

class B4W_OBJECT_PT_duplication(ObjectButtonsPanel, Panel):
    bl_label = "Duplication"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout

        obj = context.object

        layout.prop(obj, "dupli_type", expand=True)

        if obj.dupli_type == 'GROUP':
            layout.prop(obj, "dupli_group", text="Group")
            if obj.type == "EMPTY" and obj.dupli_group:
                row = layout.row()
                row.prop(obj, "b4w_group_relative", text="Relative Group Coords")

        elif obj.dupli_type != 'NONE':
            row = layout.row()
            row.label("Wrong Dupli Type. Only Group type is supported.")

class B4W_ObjectWindBending(ObjectButtonsPanel, Panel):
    bl_label = "Wind Bending"
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
        col.label("Detail Bending:")
        col.prop(obj, "b4w_detail_bending_amp", slider=True,
                text="Amplitude")
        col.prop(obj, "b4w_branch_bending_amp", slider=True,
                text="Branch Amplitude")
        col.prop(obj, "b4w_detail_bending_freq", slider=True,
                text="Bending Frequency")
        col.separator()
        if obj.type == "MESH":
            if detail_bend.leaves_stiffness_col != "":
                icon_leaves_stiffness = "ERROR"
                if check_vertex_color(obj.data, detail_bend.leaves_stiffness_col):
                    icon_leaves_stiffness = "GROUP_VCOL"
            col.prop(detail_bend, "leaves_stiffness_col", text="Leaves Stiffness (R)", icon=icon_leaves_stiffness)
            if detail_bend.leaves_phase_col != "":
                icon_phase = "ERROR"
                if check_vertex_color(obj.data, detail_bend.leaves_phase_col):
                    icon_phase = "GROUP_VCOL"
            col.prop(detail_bend, "leaves_phase_col", text="Leaves Phase (G)", icon=icon_phase)
            if detail_bend.overall_stiffness_col != "":
                icon_overall = "ERROR"
                if check_vertex_color(obj.data, detail_bend.overall_stiffness_col):
                    icon_overall = "GROUP_VCOL"
            col.prop(detail_bend, "overall_stiffness_col", text="Overall Stiffness (B)", icon=icon_overall)

        # main bending
        col = split.column()
        col.label("Main Bending:")
        col.prop(obj, "b4w_wind_bending_angle", slider=True, text="Angle")
        col.prop(obj, "b4w_wind_bending_freq", text="Frequency")

        col.label(text="")
        col.separator()

        if obj.type == "MESH":
            if obj.b4w_main_bend_stiffness_col != "":
                icon_stiffnes = "ERROR"
                if check_vertex_color(obj.data, obj.b4w_main_bend_stiffness_col):
                    icon_stiffnes = "GROUP_VCOL"
            col.prop(obj, "b4w_main_bend_stiffness_col", text="Main Stiffness (A)", icon=icon_stiffnes)


class B4W_ObjectEffects(ObjectButtonsPanel, Panel):
    bl_label = "Special Effects"
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
        row.prop(obj, "b4w_disable_fogging", text="Disable Fogging")

        row = layout.row()
        row.prop(obj, "b4w_caustics", text="Caustics")

def register():
    bpy.utils.register_class(B4W_OBJECT_PT_duplication)
    bpy.utils.register_class(B4W_OBJECT_PT_levels_of_detail)

    bpy.utils.register_class(B4W_ObjectEffects)
    bpy.utils.register_class(B4W_ObjectExportOptions)
    bpy.utils.register_class(B4W_ObjectAnimation)
    bpy.utils.register_class(B4W_ObjectRenderProps)
    bpy.utils.register_class(B4W_ObjectShadows)
    bpy.utils.register_class(B4W_ObjectReflections)
    bpy.utils.register_class(B4W_ObjectOutlineSelect)
    bpy.utils.register_class(B4W_ObjectAnchors)
    bpy.utils.register_class(B4W_ObjectTags)
    bpy.utils.register_class(B4W_ObjectWindBending)
    bpy.utils.register_class(B4W_ObjectBillboard)

def unregister():
    bpy.utils.unregister_class(B4W_OBJECT_PT_duplication)
    bpy.utils.unregister_class(B4W_OBJECT_PT_levels_of_detail)

    bpy.utils.unregister_class(B4W_ObjectEffects)
    bpy.utils.unregister_class(B4W_ObjectExportOptions)
    bpy.utils.unregister_class(B4W_ObjectAnimation)
    bpy.utils.unregister_class(B4W_ObjectRenderProps)
    bpy.utils.unregister_class(B4W_ObjectShadows)
    bpy.utils.unregister_class(B4W_ObjectReflections)
    bpy.utils.unregister_class(B4W_ObjectOutlineSelect)
    bpy.utils.unregister_class(B4W_ObjectAnchors)
    bpy.utils.unregister_class(B4W_ObjectTags)
    bpy.utils.unregister_class(B4W_ObjectWindBending)
    bpy.utils.unregister_class(B4W_ObjectBillboard)
