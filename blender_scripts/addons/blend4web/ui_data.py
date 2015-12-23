# Copyright (C) 2014-2015 Triumph LLC
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
        col.prop(cam, "dof_object", text=_(""))

        col = split.column()
        sub = col.column()
        sub.active = cam.dof_object is None
        sub.prop(cam, "dof_distance", text=_("Distance"))

        row = layout.row()
        row.prop(cam, "b4w_dof_front", text=_("Front"))
        row.prop(cam, "b4w_dof_rear", text=_("Rear"))
        row.prop(cam, "b4w_dof_power", text=_("Power"))

class B4W_DATA_PT_camera(CameraButtonsPanel, Panel):
    bl_label = _("Camera")

    def draw(self, context):
        layout = self.layout

        cam = context.camera

        layout.label(text=_("Sensor:"))

        split = layout.split()

        col = split.column(align=True)
        if cam.sensor_fit == 'VERTICAL':
            col.prop(cam, "sensor_height", text=_("Height"))
        else:
            col.label(text=_("Unsupported sensor type."), icon="ERROR")

        col = split.column(align=True)
        col.prop(cam, "sensor_fit", text=_(""))

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
        col.prop(spk, "pitch")
        col = row.column()
        col.active = not bg_mus
        col.prop(spk, "b4w_pitch_random", text=_("Random Pitch"))

        row = layout.row()
        row.prop(spk, "b4w_fade_in", text=_("Fade-In"))
        row.prop(spk, "b4w_fade_out", text=_("Fade-Out"))


        row = layout.row()
        row.active = pos_snd
        row.prop(spk, "b4w_disable_doppler", text=_("Disable Doppler"))

        row = layout.row()
        row.prop(spk, "b4w_cyclic_play", text=_("Cyclic Play"))

        row = layout.row()
        row.prop(spk, "b4w_delay", text=_("Delay"))
        row.prop(spk, "b4w_delay_random", text=_("Random Delay"))

        row = layout.row()
        row.prop(spk, "b4w_loop", text=_("Loop"))

        # NOTE: not implemented
        #row = layout.row()
        #row.active = getattr(spk, "b4w_loop")
        #row.prop(spk, "b4w_loop_count", text=_("Loop Count"))

        #row = layout.row()
        #row.active = getattr(spk, "b4w_loop")
        #row.prop(spk, "b4w_loop_count_random", text=_("Random Loop Count"))

        #row = layout.row()
        #row.active = False
        #row.prop(spk, "b4w_playlist_id", text=_("Playlist ID"))

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
            layout.label(text=_("Area type is not supported"))
        else:
            split = layout.split()
            col = split.column()
            sub = col.column()
            sub.prop(lamp, "color", text=_(""))
            sub.prop(lamp, "energy")

            if lamp.type in {'POINT', 'SPOT'}:
                sub.label(text=_("Falloff:"))
                sub.prop(lamp, "distance")

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
    bl_label = _("Shadows")
    bl_idname = "B4W_DATA_PT_b4w_lamp_shadows"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        lmp = context.lamp
        layout.prop(lmp, "b4w_generate_shadows", text=_("Generate Shadows"))

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
                row.prop(cam, "b4w_horizontal_clamping_type", text=_(""))

                row = col.row()
                row.prop(cam, "b4w_use_vertical_clamping", 
                        text=_("Vertical Rotation Limits"))

                row = col.split(1/3, align=True)
                row.active = getattr(cam, "b4w_use_vertical_clamping")
                row.prop(cam, "b4w_rotation_down_limit", text=_("Down Angle"))
                row.prop(cam, "b4w_rotation_up_limit", text=_("Up Angle"))
                row.prop(cam, "b4w_vertical_clamping_type", text=_(""))

            if cam.b4w_move_style == "TARGET":
                row = col.row()
                row.prop(cam, "b4w_use_panning", text=_("Use Panning Mode"));

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

        return context.scene.render.engine in cls.COMPAT_ENGINES

def register():
    bpy.utils.register_class(B4W_DATA_PT_normals)
    bpy.utils.register_class(B4W_DATA_PT_spot)

    bpy.utils.register_class(B4W_DATA_PT_camera)
    bpy.utils.register_class(B4W_DATA_PT_camera_dof)
    bpy.utils.register_class(B4W_DATA_PT_lamp)
    bpy.utils.register_class(B4W_DATA_PT_speaker)
    bpy.utils.register_class(B4W_DATA_PT_distance)
    bpy.utils.register_class(B4W_DATA_PT_cone)

    bpy.utils.register_class(B4W_DataSpeakerTypePanel)

    bpy.utils.register_class(B4W_CameraMovePanel)
    bpy.utils.register_class(B4W_DataLampShadows)
    #bpy.utils.register_class(B4W_DATA_PT_custom_props)

def unregister():
    bpy.utils.unregister_class(B4W_DATA_PT_normals)
    bpy.utils.unregister_class(B4W_DATA_PT_spot)

    bpy.utils.unregister_class(B4W_DATA_PT_camera)
    bpy.utils.unregister_class(B4W_DATA_PT_camera_dof)
    bpy.utils.unregister_class(B4W_DATA_PT_lamp)
    bpy.utils.unregister_class(B4W_DATA_PT_speaker)
    bpy.utils.unregister_class(B4W_DATA_PT_distance)
    bpy.utils.unregister_class(B4W_DATA_PT_cone)

    bpy.utils.unregister_class(B4W_DataSpeakerTypePanel)

    bpy.utils.unregister_class(B4W_CameraMovePanel)
    bpy.utils.unregister_class(B4W_DataLampShadows)
    #bpy.utils.unregister_class(B4W_DATA_PT_custom_props)
