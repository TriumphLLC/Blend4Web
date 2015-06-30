import bpy
import imp
import mathutils
import math
import os
import cProfile
import bgl

from bpy.types import Panel

from rna_prop_ui import PropertyPanel

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
    bl_label = "Depth of Field"
    bl_idname = "DATA_PT_b4w_camera_dof"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout

        cam = context.camera

        layout.label(text="Focus:")

        split = layout.split()
        col = split.column()
        col.prop(cam, "dof_object", text="")

        col = split.column()
        sub = col.column()
        sub.active = cam.dof_object is None
        sub.prop(cam, "dof_distance", text="Distance")

        row = layout.row()
        row.prop(cam, "b4w_dof_front", text="Front")
        row.prop(cam, "b4w_dof_rear", text="Rear")
        row.prop(cam, "b4w_dof_power", text="Power")

class B4W_DATA_PT_camera(CameraButtonsPanel, Panel):
    bl_label = "Camera"

    def draw(self, context):
        layout = self.layout

        cam = context.camera

        layout.label(text="Sensor:")

        split = layout.split()

        col = split.column(align=True)
        if cam.sensor_fit == 'VERTICAL':
            col.prop(cam, "sensor_height", text="Height")
        else:
            col.label(text="Unsupported sensor type.", icon="ERROR")

        col = split.column(align=True)
        col.prop(cam, "sensor_fit", text="")

class B4W_DATA_PT_speaker(SpeakerPanel, Panel):
    bl_label = "Sound"
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
        col.prop(spk, "b4w_volume_random", text="Random Volume")

        row = layout.row()
        col = row.column()
        col.prop(spk, "pitch")
        col = row.column()
        col.active = not bg_mus
        col.prop(spk, "b4w_pitch_random", text="Random Pitch")

        row = layout.row()
        row.prop(spk, "b4w_fade_in", text="Fade-In")
        row.prop(spk, "b4w_fade_out", text="Fade-Out")


        row = layout.row()
        row.active = pos_snd
        row.prop(spk, "b4w_disable_doppler", text="Disable Doppler")

        row = layout.row()
        row.prop(spk, "b4w_cyclic_play", text="Cyclic Play")

        row = layout.row()
        row.prop(spk, "b4w_delay", text="Delay")
        row.prop(spk, "b4w_delay_random", text="Random Delay")

        row = layout.row()
        row.prop(spk, "b4w_loop", text="Loop")

        # NOTE: not implemented
        #row = layout.row()
        #row.active = getattr(spk, "b4w_loop")
        #row.prop(spk, "b4w_loop_count", text="Loop Count")

        #row = layout.row()
        #row.active = getattr(spk, "b4w_loop")
        #row.prop(spk, "b4w_loop_count_random", text="Random Loop Count")

        #row = layout.row()
        #row.active = False
        #row.prop(spk, "b4w_playlist_id", text="Playlist ID")

class B4W_DATA_PT_distance(SpeakerPanel, Panel):
    bl_label = "Distance"
    bl_idname = "DATA_PT_b4w_distance"

    def draw(self, context):
        spk = context.speaker

        layout = self.layout
        layout.active = (getattr(spk, "b4w_behavior") == "POSITIONAL")

        split = layout.split()

        col = split.column()
        col.label("Volume:")
        col.prop(spk, "attenuation")

        col = split.column()
        col.label("Distance:")
        col.prop(spk, "distance_max", text="Maximum")
        col.prop(spk, "distance_reference", text="Reference")

class B4W_DATA_PT_cone(SpeakerPanel, Panel):
    bl_label = "Cone"
    bl_idname = "DATA_PT_b4w_cone"

    def draw(self, context):
        spk = context.speaker

        layout = self.layout
        layout.active = (getattr(spk, "b4w_behavior") == "POSITIONAL")

        split = layout.split()

        col = split.column()
        col.label("Angle:")
        col.prop(spk, "cone_angle_outer", text="Outer")
        col.prop(spk, "cone_angle_inner", text="Inner")

        col = split.column()
        col.label("Volume:")
        col.prop(spk, "cone_volume_outer", text="Outer")

class B4W_DATA_PT_normals(MeshButtonsPanel, Panel):
    bl_label = "Normals"

    def draw(self, context):
        layout = self.layout

        mesh = context.mesh

        split = layout.split()

        col = split.column()
        col.prop(mesh, "use_auto_smooth")

        col = split.column()
        col.active = mesh.use_auto_smooth and not mesh.has_custom_normals
        col.prop(mesh, "auto_smooth_angle", text="Angle")

class B4W_DATA_PT_lamp(LampPanel, Panel):
    bl_label = "Lamp"

    def draw(self, context):
        layout = self.layout

        lamp = context.lamp

        layout.prop(lamp, "type", expand=True)

        if lamp.type == "AREA":
            layout.label("Area type is not supported")
        else:
            split = layout.split()
            col = split.column()
            sub = col.column()
            sub.prop(lamp, "color", text="")
            sub.prop(lamp, "energy")

            if lamp.type in {'POINT', 'SPOT'}:
                sub.label(text="Falloff:")
                sub.prop(lamp, "distance")

            if lamp.type == 'AREA':
                col.prop(lamp, "distance")
                col.prop(lamp, "gamma")

            col = split.column()
            col.prop(lamp, "use_specular")
            col.prop(lamp, "use_diffuse")

        if lamp.type == "SUN":
            row = layout.row()
            row.prop(lamp, "b4w_dynamic_intensity", text="Dynamic Intensity")

class B4W_DataLampShadows(LampPanel, Panel):
    bl_label = "Shadows"
    bl_idname = "B4W_DATA_PT_b4w_lamp_shadows"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        lmp = context.lamp
        layout.prop(lmp, "b4w_generate_shadows", text="Generate Shadows")

class B4W_DATA_PT_spot(LampPanel, Panel):
    bl_label = "Spot Shape"

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
        sub.prop(lamp, "spot_size", text="Size")
        sub.prop(lamp, "spot_blend", text="Blend", slider=True)
        #col.prop(lamp, "use_square")
        col.prop(lamp, "show_cone")

        col = split.column()

        #col.active = (lamp.shadow_method != 'BUFFER_SHADOW' or lamp.shadow_buffer_type != 'DEEP')
        #col.prop(lamp, "use_halo")
        #sub = col.column(align=True)
        #sub.active = lamp.use_halo
        #sub.prop(lamp, "halo_intensity", text="Intensity")
        #if lamp.shadow_method == 'BUFFER_SHADOW':
        #    sub.prop(lamp, "halo_step", text="Step")

class B4W_CameraMovePanel(CameraButtonsPanel, Panel):
    bl_label = "Camera Move Style"
    bl_idname = "DATA_PT_b4w_camera_move_style"

    def draw(self, context):
        cam = context.camera

        if cam:
            layout = self.layout
            row = layout.row(align=True)
            row.prop(cam, "b4w_move_style", text="Move Style")

            if cam.b4w_move_style == "TARGET":
                row = layout.column()
                row.prop(cam, "b4w_target", text="Target Location")
                row.operator("b4w.camera_target_copy", text="Copy Cursor Location")

            box = layout.box()
            col = box.column()
            col.label("Camera Velocities:")
            row = col.row()
            row.prop(cam, "b4w_trans_velocity", text="Translation Velocity")
            row.active = cam.b4w_move_style in ["TARGET", "EYE", "HOVER"]
            row = col.row()
            row.prop(cam, "b4w_rot_velocity", text="Rotation Velocity")
            row.active = cam.b4w_move_style in ["TARGET", "EYE", "HOVER"]
            row = col.row()
            row.prop(cam, "b4w_zoom_velocity", text="Zoom Velocity")
            row.active = cam.b4w_move_style in ["TARGET", "HOVER"]

            if cam.b4w_move_style == "TARGET" \
                    or cam.b4w_move_style == "EYE" \
                    or cam.b4w_move_style == "HOVER":
                box = layout.box()
                col = box.column()
                col.label("Camera Limits:")

            if cam.b4w_move_style == "HOVER":
                row = col.row()
                row.prop(cam, "b4w_use_horizontal_clamping",
                        text="Use Horizontal Translation Limits")

                row = col.split(0.5, align=True)
                row.active = getattr(cam, "b4w_use_horizontal_clamping")
                row.prop(cam, "b4w_horizontal_translation_min", text="Min")
                row.prop(cam, "b4w_horizontal_translation_max", text="Max")

                row = col.row()
                row.prop(cam, "b4w_use_vertical_clamping", 
                        text="Use Vertical Translation Limits")

                row = col.split(0.5, align=True)
                row.active = getattr(cam, "b4w_use_vertical_clamping")
                row.prop(cam, "b4w_vertical_translation_min", text="Min")
                row.prop(cam, "b4w_vertical_translation_max", text="Max")

            if cam.b4w_move_style == "TARGET" or cam.b4w_move_style == "HOVER":
                row = col.row()
                row.prop(cam, "b4w_use_distance_limits", text="Use Distance Limits")

                row = col.split(0.5, align=True)
                row.active = getattr(cam, "b4w_use_distance_limits")
                row.prop(cam, "b4w_distance_min", text="Min")
                row.prop(cam, "b4w_distance_max", text="Max")

            if cam.b4w_move_style == "HOVER":
                row = col.row()
                row.active = getattr(cam, "b4w_use_distance_limits")
                row.label("Hover Angle Limits:")
                row = col.split(0.5, align=True)
                row.active = getattr(cam, "b4w_use_distance_limits")
                row.prop(cam, "b4w_hover_angle_min", text="Down Angle")
                row.prop(cam, "b4w_hover_angle_max", text="Up Angle")

                row = col.row()
                row.active = getattr(cam, "b4w_use_distance_limits")
                row.prop(cam, "b4w_enable_hover_hor_rotation", 
                        text="Use Horizontal Rotation")

            if cam.b4w_move_style == "TARGET" or cam.b4w_move_style == "EYE":
                row = col.row()
                row.prop(cam, "b4w_use_horizontal_clamping", 
                        text="Use Horizontal Rotation Clamping")

                row = col.split(1/3, align=True)
                row.active = getattr(cam, "b4w_use_horizontal_clamping")
                row.prop(cam, "b4w_rotation_left_limit", text="Left Angle")
                row.prop(cam, "b4w_rotation_right_limit", text="Right Angle")
                row.prop(cam, "b4w_horizontal_clamping_type", text="")

                row = col.row()
                row.prop(cam, "b4w_use_vertical_clamping", 
                        text="Use Vertical Rotation Clamping")

                row = col.split(1/3, align=True)
                row.active = getattr(cam, "b4w_use_vertical_clamping")
                row.prop(cam, "b4w_rotation_down_limit", text="Down Angle")
                row.prop(cam, "b4w_rotation_up_limit", text="Up Angle")
                row.prop(cam, "b4w_vertical_clamping_type", text="")

            if cam.b4w_move_style == "TARGET":
                row = col.row()
                row.prop(cam, "b4w_use_panning", text="Use Panning Mode");

class B4W_DataSpeakerTypePanel(SpeakerPanel, Panel):
    bl_label = "Speaker behavior"
    bl_idname = "DATA_PT_b4w_speaker_behavior"
    bl_options = {'HIDE_HEADER'}

    def draw(self, context):
        layout = self.layout
        spk = context.speaker

        row = layout.row()
        row.prop(spk, "b4w_behavior", text="Speaker Behavior")



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
