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

from rna_prop_ui import PropertyPanel
import blend4web

b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_

# common properties for all B4W object panels
class DataButtonsPanel:
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "data"
    COMPAT_ENGINES = ["BLEND4WEB"]

    @classmethod
    def poll(cls, context):
        return context.scene.render.engine in cls.COMPAT_ENGINES

class MeshButtonsPanel(DataButtonsPanel):
    @classmethod
    def poll(cls, context):
        engine = context.scene.render.engine
        return context.mesh and (engine in cls.COMPAT_ENGINES)

class LampPanel(DataButtonsPanel):
    @classmethod
    def poll(cls, context):
        lamp = context.lamp
        return lamp and context.scene.render.engine in cls.COMPAT_ENGINES

class SpeakerPanel(DataButtonsPanel):
    @classmethod
    def poll(cls, context):
        speaker = context.speaker
        return speaker and context.scene.render.engine in cls.COMPAT_ENGINES

class CameraButtonsPanel(DataButtonsPanel):
    @classmethod
    def poll(cls, context):
        engine = context.scene.render.engine
        return context.camera and (engine in cls.COMPAT_ENGINES)

class B4W_DATA_PT_camera_dof(CameraButtonsPanel, Panel):
    bl_label = _("Depth of Field")
    bl_idname = "DATA_PT_b4w_camera_dof"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout

        cam = context.camera

        layout.label(text=_("Focus:"))

        split = layout.split()
        col = split.column()
        col.prop(cam, "dof_object", text="")

        col = split.column()
        sub = col.column()
        sub.active = cam.dof_object is None
        sub.prop(cam, "dof_distance", text=_("Distance"))

        split = layout.split()
        col = split.column()
        col.active = cam.b4w_dof_bokeh
        col.prop(cam, "b4w_dof_front_start", text=_("Front Start"))
        col.prop(cam, "b4w_dof_rear_start", text=_("Rear Start"))
        col = split.column()
        sub = col.column()
        sub.prop(cam, "b4w_dof_front_end", text=_("Front End"))
        sub.prop(cam, "b4w_dof_rear_end", text=_("Rear End"))

        row = layout.row()
        row.prop(cam, "b4w_dof_power", text=_("Power"))

        split = layout.split()
        col = split.column()
        col.prop(cam, "b4w_dof_bokeh", text=_("High Quality (Bokeh)"))
        col = split.column()
        sub = col.column()
        sub.active = cam.b4w_dof_bokeh
        sub.prop(cam, "b4w_dof_bokeh_intensity", text=_("Bokeh Intensity"))
        row = layout.row()
        row.active = cam.b4w_dof_bokeh
        row.prop(cam, "b4w_dof_foreground_blur", text=_("Foreground Blur"))

class B4W_DATA_PT_camera(CameraButtonsPanel, Panel):
    bl_label = _("Camera")

    def draw(self, context):
        layout = self.layout

        cam = context.camera

        layout.label(text=_("Sensor:"))

        split = layout.split()

        col = split.column(align=True)
        if cam.sensor_fit == 'AUTO':
            col.prop(cam, "sensor_width", text="Size")
        else:
            sub = col.column(align=True)
            sub.active = cam.sensor_fit == 'HORIZONTAL'
            sub.prop(cam, "sensor_width", text="Width")
            sub = col.column(align=True)
            sub.active = cam.sensor_fit == 'VERTICAL'
            sub.prop(cam, "sensor_height", text="Height")

        col = split.column(align=True)
        col.prop(cam, "sensor_fit", text="")

class B4W_DATA_PT_speaker(SpeakerPanel, Panel):
    bl_label = _("Sound")
    bl_idname = "DATA_PT_b4w_speaker"

    def draw(self, context):
        layout = self.layout

        spk = context.speaker
        pos_snd = (getattr(spk, "b4w_behavior") == "POSITIONAL")
        bg_mus = (getattr(spk, "b4w_behavior") == "BACKGROUND_MUSIC")

        split = layout.split(percentage=0.75)

        split.template_ID(spk, "sound", open="sound.open_mono")
        split.prop(spk, "muted")

        row = layout.row()
        col = row.column()
        col.prop(spk, "volume")
        col = row.column()
        col.active = not bg_mus
        col.prop(spk, "b4w_volume_random", text=_("Random Volume"))

        row = layout.row()
        col = row.column()
        # NOTE: temporary until <audio> pitch implementation
        col.active = not bg_mus
        col.prop(spk, "pitch")
        col = row.column()
        col.active = not bg_mus
        col.prop(spk, "b4w_pitch_random", text=_("Random Pitch"))

        row = layout.row()
        row.prop(spk, "b4w_fade_in", text=_("Fade-In"))
        row.prop(spk, "b4w_fade_out", text=_("Fade-Out"))


        row = layout.row()
        row.active = pos_snd
        row.prop(spk, "b4w_enable_doppler", text=_("Enable Doppler"))

        row = layout.row()
        row.prop(spk, "b4w_auto_play", text=_("Auto-play"))

        row = layout.row()
        row.prop(spk, "b4w_cyclic_play", text=_("Cyclic Play"))

        row = layout.row()
        row.prop(spk, "b4w_delay", text=_("Delay"))
        row.prop(spk, "b4w_delay_random", text=_("Random Delay"))

        row = layout.row()
        row.prop(spk, "b4w_loop", text=_("Loop"))

        row = layout.row()
        row.active = getattr(spk, "b4w_loop") and not bg_mus
        row.prop(spk, "b4w_loop_start", text=_("Loop Start"))
        row.prop(spk, "b4w_loop_end", text=_("Loop End"))

class B4W_DATA_PT_distance(SpeakerPanel, Panel):
    bl_label = _("Distance")
    bl_idname = "DATA_PT_b4w_distance"

    def draw(self, context):
        spk = context.speaker

        layout = self.layout
        layout.active = (getattr(spk, "b4w_behavior") == "POSITIONAL")

        split = layout.split()

        col = split.column()
        col.label(text=_("Volume:"))
        col.prop(spk, "attenuation")

        col = split.column()
        col.label(text=_("Distance:"))
        col.prop(spk, "distance_max", text=_("Maximum"))
        col.prop(spk, "distance_reference", text=_("Reference"))

class B4W_DATA_PT_cone(SpeakerPanel, Panel):
    bl_label = _("Cone")
    bl_idname = "DATA_PT_b4w_cone"

    def draw(self, context):
        spk = context.speaker

        layout = self.layout
        layout.active = (getattr(spk, "b4w_behavior") == "POSITIONAL")

        split = layout.split()

        col = split.column()
        col.label(text=_("Angle:"))
        col.prop(spk, "cone_angle_outer", text=_("Outer"))
        col.prop(spk, "cone_angle_inner", text=_("Inner"))

        col = split.column()
        col.label(text=_("Volume:"))
        col.prop(spk, "cone_volume_outer", text=_("Outer"))

class B4W_DATA_PT_shape_keys(MeshButtonsPanel, Panel):
    bl_label = "Shape Keys"

    @classmethod
    def poll(cls, context):
        engine = context.scene.render.engine
        obj = context.object
        return (obj and obj.type in {'MESH', 'LATTICE', 'CURVE', 'SURFACE'} and (engine in cls.COMPAT_ENGINES))

    def draw(self, context):
        layout = self.layout

        ob = context.object
        key = ob.data.shape_keys
        kb = ob.active_shape_key

        enable_edit = ob.mode != 'EDIT'
        enable_edit_value = False

        if ob.show_only_shape_key is False:
            if enable_edit or (ob.type == 'MESH' and ob.use_shape_key_edit_mode):
                enable_edit_value = True

        row = layout.row()

        rows = 2
        if kb:
            rows = 4
        row.template_list("MESH_UL_shape_keys", "", key, "key_blocks", ob, "active_shape_key_index", rows=rows)

        col = row.column()

        sub = col.column(align=True)
        sub.operator("object.b4w_shape_key_add", icon='ZOOMIN', text="")
        sub.operator("object.shape_key_remove", icon='ZOOMOUT', text="").all = False
        sub.menu("MESH_MT_shape_key_specials", icon='DOWNARROW_HLT', text="")
        sub.active = ob.mode != 'EDIT'

        if kb:
            col.separator()

            sub = col.column(align=True)
            sub.operator("object.shape_key_move", icon='TRIA_UP', text="").type = 'UP'
            sub.operator("object.shape_key_move", icon='TRIA_DOWN', text="").type = 'DOWN'

            split = layout.split(percentage=0.4)
            row = split.row()
            row.enabled = enable_edit
            row.prop(key, "use_relative")

            row = split.row()
            row.alignment = 'RIGHT'

            sub = row.row(align=True)
            sub.label()  # XXX, for alignment only
            subsub = sub.row(align=True)
            subsub.active = enable_edit_value
            subsub.prop(ob, "show_only_shape_key", text="")
            sub.prop(ob, "use_shape_key_edit_mode", text="")

            sub = row.row()
            if key.use_relative:
                sub.operator("object.shape_key_clear", icon='X', text="")
            else:
                sub.operator("object.shape_key_retime", icon='RECOVER_LAST', text="")

            if key.use_relative:
                if ob.active_shape_key_index != 0:
                    row = layout.row()
                    row.active = enable_edit_value
                    row.prop(kb, "value")

                    split = layout.split()

                    col = split.column(align=True)
                    col.active = enable_edit_value
                    col.label(text="Range:")
                    col.prop(kb, "slider_min", text="Min")
                    col.prop(kb, "slider_max", text="Max")

                    col = split.column(align=True)
                    col.active = enable_edit_value
                    col.label(text="Blend:")
                    col.prop_search(kb, "vertex_group", ob, "vertex_groups", text="")
                    col.prop_search(kb, "relative_key", key, "key_blocks", text="")

            else:
                layout.prop(kb, "interpolation")
                row = layout.column()
                row.active = enable_edit_value
                row.prop(key, "eval_time")

class B4W_DATA_PT_normals(MeshButtonsPanel, Panel):
    bl_label = _("Normals")

    def draw(self, context):
        layout = self.layout

        mesh = context.mesh

        split = layout.split()

        col = split.column()
        col.prop(mesh, "use_auto_smooth")

        col = split.column()
        col.active = mesh.use_auto_smooth and not mesh.has_custom_normals
        col.prop(mesh, "auto_smooth_angle", text=_("Angle"))

class B4W_DATA_PT_lamp(LampPanel, Panel):
    bl_label = _("Lamp")

    def draw(self, context):
        layout = self.layout

        lamp = context.lamp

        layout.prop(lamp, "type", expand=True)

        if lamp.type == "AREA":
            layout.label(text=_("AREA type is not supported"), icon="ERROR")
        else:
            split = layout.split()
            col = split.column()
            sub = col.column()
            sub.prop(lamp, "color", text="")
            sub.prop(lamp, "energy")

            if lamp.type in {'POINT', 'SPOT'}:
                sub.label(text=_("Falloff:"))
                sub.prop(lamp, "falloff_type", text="")
                if lamp.falloff_type != "INVERSE_SQUARE":
                    row = layout.row()
                    row.label(_("%s type is not supported.") % lamp.falloff_type,
                            icon="ERROR")
                else:
                    sub.prop(lamp, "distance")

                col.prop(lamp, "use_sphere")

            if lamp.type == 'AREA':
                col.prop(lamp, "distance")
                col.prop(lamp, "gamma")

            col = split.column()
            col.prop(lamp, "use_specular")
            col.prop(lamp, "use_diffuse")

        if lamp.type == "SUN":
            row = layout.row()
            row.prop(lamp, "b4w_dynamic_intensity", text=_("Dynamic Intensity"))


class B4W_DataLampShadows(LampPanel, Panel):
    bl_label = _("Shadow")
    bl_idname = "B4W_DATA_PT_b4w_lamp_shadows"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        lmp = context.lamp
        layout.prop(lmp, "use_shadow", text=_("Shadow"))
        if lmp.type == "SPOT" or lmp.type == "POINT":
            row = layout.row()
            row.active = lmp.use_shadow
            row.prop(lmp, "shadow_buffer_clip_start", text=_("Clip Start"))
            row.prop(lmp, "shadow_buffer_clip_end", text=_("Clip End"))

class B4W_DATA_PT_spot(LampPanel, Panel):
    bl_label = _("Spot Shape")

    @classmethod
    def poll(cls, context):
        lamp = context.lamp
        engine = context.scene.render.engine
        return (lamp and lamp.type == 'SPOT') and (engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        layout = self.layout

        lamp = context.lamp

        split = layout.split()

        col = split.column()
        sub = col.column()
        sub.prop(lamp, "spot_size", text=_("Size"))
        sub.prop(lamp, "spot_blend", text=_("Blend"), slider=True)
        #col.prop(lamp, "use_square")
        col.prop(lamp, "show_cone")

        col = split.column()

        #col.active = (lamp.shadow_method != 'BUFFER_SHADOW' or lamp.shadow_buffer_type != 'DEEP')
        #col.prop(lamp, "use_halo")
        #sub = col.column(align=True)
        #sub.active = lamp.use_halo
        #sub.prop(lamp, "halo_intensity", text=_("Intensity"))
        #if lamp.shadow_method == 'BUFFER_SHADOW':
        #    sub.prop(lamp, "halo_step", text=_("Step"))

class B4W_CameraMovePanel(CameraButtonsPanel, Panel):
    bl_label = _("Camera Move Style")
    bl_idname = "DATA_PT_b4w_camera_move_style"

    def draw(self, context):
        cam = context.camera

        if cam:
            layout = self.layout
            row = layout.row(align=True)
            row.prop(cam, "b4w_move_style", text=_("Move Style"))

            if cam.b4w_move_style == "TARGET":
                row = layout.column()
                row.prop(cam, "b4w_target", text=_("Target Location"))
                row.operator("b4w.camera_target_copy", text=_("Look At Cursor"))

            box = layout.box()
            col = box.column()
            col.label(text=_("Camera Velocities:"))
            row = col.row()
            row.prop(cam, "b4w_trans_velocity", text=_("Translation Velocity"))
            row.active = cam.b4w_move_style in ["TARGET", "EYE", "HOVER"]
            row = col.row()
            row.prop(cam, "b4w_rot_velocity", text=_("Rotation Velocity"))
            row.active = cam.b4w_move_style in ["TARGET", "EYE", "HOVER"]
            row = col.row()
            row.prop(cam, "b4w_zoom_velocity", text=_("Zoom Velocity"))
            row.active = cam.b4w_move_style in ["TARGET", "HOVER"]

            if cam.b4w_move_style == "TARGET" \
                    or cam.b4w_move_style == "EYE" \
                    or cam.b4w_move_style == "HOVER":
                box = layout.box()
                col = box.column()
                col.label(text=_("Camera Limits"))

            row = col.row()
            row.prop(cam, "b4w_show_limits_in_viewport",
                    text=_("Display Limits in Viewport"))

            if cam.b4w_move_style == "HOVER":
                row = col.row()
                row.prop(cam, "b4w_use_horizontal_clamping",
                        text=_("Horizontal Translation Limits"))

                row = col.split(0.5, align=True)
                row.active = getattr(cam, "b4w_use_horizontal_clamping")
                row.alert = (getattr(cam, "b4w_horizontal_translation_min") 
                        > getattr(cam, "b4w_horizontal_translation_max"))
                row.prop(cam, "b4w_horizontal_translation_min", text=_("MinX"))
                row.prop(cam, "b4w_horizontal_translation_max", text=_("MaxX"))

                row = col.row()
                row.prop(cam, "b4w_use_vertical_clamping", 
                        text=_("Vertical Translation Limits"))

                row = col.split(0.5, align=True)
                row.active = getattr(cam, "b4w_use_vertical_clamping")
                row.alert = (getattr(cam, "b4w_vertical_translation_min") 
                        > getattr(cam, "b4w_vertical_translation_max"))
                row.prop(cam, "b4w_vertical_translation_min", text=_("MinY"))
                row.prop(cam, "b4w_vertical_translation_max", text=_("MaxY"))

            if cam.b4w_move_style == "TARGET":
                row = col.row()
                row.prop(cam, "b4w_use_target_distance_limits", text=_("Distance Limits"))

                row = col.split(0.5, align=True)
                row.active = getattr(cam, "b4w_use_target_distance_limits")
                row.alert = (getattr(cam, "b4w_distance_min") 
                        > getattr(cam, "b4w_distance_max"))
                row.prop(cam, "b4w_distance_min", text=_("Min"))
                row.prop(cam, "b4w_distance_max", text=_("Max"))

            if cam.b4w_move_style == "HOVER":

                row = col.row()
                row.prop(cam, "b4w_use_zooming", text=_("Use Zooming"))

                row = col.row()
                row.active = getattr(cam, "b4w_use_zooming")

                row = col.split(0.3, align=True)
                row.active = getattr(cam, "b4w_use_zooming")
                row.label("Distance Limits:")
                row.alert = (getattr(cam, "b4w_distance_min") 
                        > getattr(cam, "b4w_distance_max"))
                row.prop(cam, "b4w_distance_min", text=_("Min"))
                row.prop(cam, "b4w_distance_max", text=_("Max"))

                row = col.split(0.3, align=True)
                row.active = getattr(cam, "b4w_use_zooming")
                row.label("Vertical Rotation Limits:")
                row.alert = (getattr(cam, "b4w_hover_angle_min") 
                        > getattr(cam, "b4w_hover_angle_max"))
                row.prop(cam, "b4w_hover_angle_min", text=_("Down"))
                row.prop(cam, "b4w_hover_angle_max", text=_("Up"))

                row = col.row()
                row.prop(cam, "b4w_hover_zero_level", text=_("Zero Level"))

                row = col.row()
                row.prop(cam, "b4w_enable_hover_hor_rotation", 
                        text=_("Use Horizontal Rotation"))

            if cam.b4w_move_style == "TARGET" or cam.b4w_move_style == "EYE":
                row = col.row()
                row.prop(cam, "b4w_use_horizontal_clamping", 
                        text=_("Horizontal Rotation Limits"))

                row = col.split(1/3, align=True)
                row.active = getattr(cam, "b4w_use_horizontal_clamping")
                row.prop(cam, "b4w_rotation_left_limit", text=_("Left Angle"))
                row.prop(cam, "b4w_rotation_right_limit", text=_("Right Angle"))
                row.prop(cam, "b4w_horizontal_clamping_type", text="")

                row = col.row()
                row.prop(cam, "b4w_use_vertical_clamping", 
                        text=_("Vertical Rotation Limits"))

                row = col.split(1/3, align=True)
                row.active = getattr(cam, "b4w_use_vertical_clamping")
                row.prop(cam, "b4w_rotation_down_limit", text=_("Down Angle"))
                row.prop(cam, "b4w_rotation_up_limit", text=_("Up Angle"))
                row.prop(cam, "b4w_vertical_clamping_type", text="")

            if cam.b4w_move_style == "TARGET":
                row = col.row()
                row.prop(cam, "b4w_use_pivot_limits", text=_("Pivot Translation Limits"))
                row = col.split(0.5, align=True)
                row.active = getattr(cam, "b4w_use_pivot_limits")
                row.alert = (getattr(cam, "b4w_pivot_z_min") 
                        > getattr(cam, "b4w_pivot_z_max"))  
                row.prop(cam, "b4w_pivot_z_min", text=_("MinZ"))
                row.prop(cam, "b4w_pivot_z_max", text=_("MaxZ"))

                row = col.row()
                row.prop(cam, "b4w_use_panning", text=_("Use Panning Mode"))

class B4W_DataSpeakerTypePanel(SpeakerPanel, Panel):
    bl_label = _("Speaker behavior")
    bl_idname = "DATA_PT_b4w_speaker_behavior"
    bl_options = {'HIDE_HEADER'}

    def draw(self, context):
        layout = self.layout
        spk = context.speaker

        row = layout.row()
        row.prop(spk, "b4w_behavior", text=_("Speaker Behavior"))



class B4W_DATA_PT_custom_props(DataButtonsPanel, PropertyPanel, Panel):
    _context_path = "object.data"
    _property_type = None

    @classmethod
    def poll(cls, context):
        if context.mesh:
            cls._property_type = bpy.types.Mesh
        elif context.camera:
            cls._property_type = bpy.types.Camera
        elif context.speaker:
            cls._property_type = bpy.types.Speaker
        elif context.armature:
            cls._property_type = bpy.types.Armature
        elif context.curve:
            cls._property_type = bpy.types.Curve
        elif context.lattice:
            cls._property_type = bpy.types.Lattice
        elif context.lamp:
            cls._property_type = bpy.types.Lamp
        elif context.meta_ball:
            cls._property_type = bpy.types.MetaBall

        return context.scene.render.engine in cls.COMPAT_ENGINES

class OperatorAddShapeKey(bpy.types.Operator):
    bl_idname  = "object.b4w_shape_key_add"
    bl_label   = p_("Add shape key to the object", "Operator")
    bl_options = {"INTERNAL"}

    def execute(self, context):
        obj = context.active_object
        if obj.mode == 'EDIT':
            return {'FINISHED'}
        # auto apply default animaton
        if not "b4w_shape_keys" in obj.keys():
            obj.b4w_shape_keys = True

        return bpy.ops.object.shape_key_add(from_mix=False)
