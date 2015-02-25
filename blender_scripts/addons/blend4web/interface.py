import bpy
import mathutils
import math
import os
import cProfile
import bgl
from .server import B4WStartServer
from . import nla_script

# serialize data to json

_OBJECT_PT_constraints = None

def check_vertex_color(mesh, vc_name):
    for color_layer in mesh.vertex_colors:
        if color_layer.name == vc_name:
            return True
    # no found
    return False

class B4W_ScenePanel(bpy.types.Panel):
    bl_label = "Blend4Web"
    bl_idname = "SCENE_PT_b4w"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "scene"

    def draw(self, context):
        layout = self.layout

        scene = context.scene
        if scene:
            row = layout.row()
            row.prop(scene, "b4w_do_not_export", text="Do not Export")

            row = layout.row()
            row.prop(scene, "b4w_use_nla", text="Use NLA")

            if getattr(scene, "b4w_use_nla"):
                row = layout.row()
                row.prop(scene, "b4w_nla_cyclic", text="Cyclic NLA")

                nla_script.draw(layout, context)

            row = layout.row()
            row.prop(scene, "b4w_enable_audio", text="Enable Audio")

            row = layout.row()
            row.active = getattr(scene, "b4w_enable_audio")
            row.prop(scene, "b4w_enable_dynamic_compressor", text="Dynamic Compressor")

            if (getattr(scene, "b4w_enable_audio") and
                    getattr(scene, "b4w_enable_dynamic_compressor")):
                dcompr = scene.b4w_dynamic_compressor_settings
                row = layout.row()
                box = row.box()
                col = box.column()
                col.label("Compressor settings:")
                row = col.row()
                row.prop(dcompr, "threshold", text="Threshold")
                row = col.row()
                row.prop(dcompr, "knee", text="Knee")
                row = col.row()
                row.prop(dcompr, "ratio", text="Ratio")
                row = col.row()
                row.prop(dcompr, "attack", text="Attack")
                row = col.row()
                row.prop(dcompr, "release", text="Release")

            row = layout.row()
            row.active = getattr(scene, "b4w_enable_audio")
            row.prop(scene, "b4w_enable_convolution_engine", text="Convolution Engine")

            row = layout.row()
            row.prop(scene, "b4w_enable_physics", text="Enable Physics")

            row = layout.row()
            row.prop(scene, "b4w_render_shadows", text="Render Shadows")

            row = layout.row()
            row.prop(scene, "b4w_enable_ssao", text="Enable SSAO")

            row = layout.row()
            row.prop(scene, "b4w_render_reflections", text="Render Reflections")

            row = layout.row()
            row.prop(scene, "b4w_render_refractions", text="Render Refractions")

            row = layout.row()
            row.prop(scene, "b4w_enable_god_rays", text="Enable God Rays")

            row = layout.row()
            row.prop(scene, "b4w_enable_bloom", text="Enable Bloom")

            row = layout.row()
            row.prop(scene, "b4w_enable_motion_blur", text="Enable Motion Blur")

            row = layout.row()
            row.prop(scene, "b4w_enable_color_correction", text="Enable Color Correction")

            row = layout.row()
            row.prop(scene, "b4w_enable_antialiasing", text="Enable Antialiasing")

            row = layout.row()
            row.prop(scene, "b4w_enable_tags", text="Enable Meta Tags")

            if context.scene.b4w_enable_tags:
                row = layout.row()
                box = row.box()
                col = box.column()
                col.label("Tags:")
                row = col.row()

                row.prop(context.scene.b4w_tags, "title", text="Title")
                row = col.row()
                row.prop(context.scene.b4w_tags, "description", text="Description")
                row = col.row()

            row = layout.row()
            row.prop(scene, "b4w_batch_grid_size", text="Batch Grid Size")

            split = layout.split()
            col = split.column()
            col.label(text="Anisotropic Filtering:")
            col = split.column()
            col.prop(scene, "b4w_anisotropic_filtering", text="")


class B4W_WorldPanel(bpy.types.Panel):
    bl_label = "Blend4Web"
    bl_idname = "WORLD_PT_b4w"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "world"

    def draw(self, context):
        layout = self.layout

        world = context.world
        if world:
            row = layout.row()
            row.prop(world, "b4w_do_not_export", text="Do not Export")

            col = layout.column()
            box = col.box()
            col = box.column()
            col.label("Glow Settings:")
            row = col.row()
            row.prop(world, "b4w_glow_color", text="Objects Glow Color")
            col.prop(world, "b4w_glow_factor", text="Glow Factor")

            col = layout.column()
            box = col.box()
            col = box.column()
            col.label("Fog Settings:")
            col.prop(world, "b4w_fog_density", text="Fog Density")
            col.prop(world, "b4w_fog_color", text="Fog Color")

            shadow = world.b4w_shadow_settings
            row = layout.row()
            box = row.box()
            col = box.column()
            col.label("Shadow Settings:")

            row = col.row()
            row.prop(shadow, "csm_resolution", text="Resolution")
            row = col.row()
            row.prop(shadow, "self_shadow_polygon_offset", text="Self-Shadow Polygon Offset")
            row = col.row()
            row.prop(shadow, "self_shadow_normal_offset", text="Self-Shadow Normal Offset")

            row = col.row()
            row.prop(shadow, "b4w_enable_csm", text="Enable CSM")

            if getattr(shadow, "b4w_enable_csm"):
                row = col.row()
                row.prop(shadow, "csm_num", text="CSM Number")

                col.label("CSM first cascade:")
                row = col.row()
                sides = row.split(align=True)
                sides.prop(shadow, "csm_first_cascade_border", text="Border")
                sides.prop(shadow, "first_cascade_blur_radius", text="Blur Radius")

                col.label("CSM last cascade:")
                row = col.row()
                sides = row.split(align=True)
                sides.prop(shadow, "csm_last_cascade_border", text="Border")
                sides.prop(shadow, "last_cascade_blur_radius", text="Blur Radius")
                row.active = getattr(shadow, "csm_num") > 1

                row = col.row()
                row.prop(shadow, "fade_last_cascade", text="Fade-Out Last Cascade")
                row = col.row()
                row.prop(shadow, "blend_between_cascades", text="Blend Between Cascades")
                row.active = getattr(shadow, "csm_num") > 1
            else:
                row = col.row()
                row.prop(shadow, "first_cascade_blur_radius", text="Blur Radius")

            ssao = world.b4w_ssao_settings
            row = layout.row()
            box = row.box()
            col = box.column()
            col.label("SSAO Settings:")
            row = col.row()
            row.prop(ssao, "radius_increase", text="Radius Increase")
            row = col.row()
            row.prop(ssao, "hemisphere", text="Use Hemisphere")
            row = col.row()
            row.prop(ssao, "blur_depth", text="Use Blur Depth Test")
            row = col.row()
            row.prop(ssao, "blur_discard_value", text="Blur Depth Test Discard Value")
            row = col.row()
            row.prop(ssao, "influence", text="Influence")
            row = col.row()
            row.prop(ssao, "dist_factor", text="Distance Factor")
            row = col.row()
            row.label("Samples:")
            row.prop(ssao, "samples", text="Samples", expand=True)

            sky = world.b4w_sky_settings
            row = layout.row()
            box = row.box()
            col = box.column()
            col.label("Sky Settings:")
            row = col.row()
            row.prop(sky, "reflexible", text="Reflexible")
            if sky.reflexible:
                row = col.row()
                row.prop(sky, "reflexible_only", text="Reflexible Only")
            row = col.row()
            row.prop(sky, "procedural_skydome", text="Procedural Skydome")
            if sky.procedural_skydome:
                row = col.row()
                row.prop(sky, "use_as_environment_lighting", text="Use as Environment Lighting")
                row = col.row()
                row.prop(sky, "color", text="Sky Color")
                row = col.row()
                row.prop(sky, "rayleigh_brightness", text="Rayleigh Brightness")
                row = col.row()
                row.prop(sky, "mie_brightness", text="Mie Brightness")
                row = col.row()
                row.prop(sky, "spot_brightness", text="Spot Brightness")
                row = col.row()
                row.prop(sky, "scatter_strength", text="Scatter Strength")
                row = col.row()
                row.prop(sky, "rayleigh_strength", text="Rayleigh Strength")
                row = col.row()
                row.prop(sky, "mie_strength", text="Mie Strength")
                row = col.row()
                row.prop(sky, "rayleigh_collection_power", text="Rayleigh Collection Power")
                row = col.row()
                row.prop(sky, "mie_collection_power", text="Mie Collection Power")
                row = col.row()
                row.prop(sky, "mie_distribution", text="Mie Distribution")

            god_rays = world.b4w_god_rays_settings
            row = layout.row()
            box = row.box()
            col = box.column()
            col.label("God Rays Settings:")
            row = col.row()
            row.prop(god_rays, "intensity", text="God Rays Intensity")
            row = col.row()
            row.prop(god_rays, "max_ray_length", text="Maximum Ray Length")
            row = col.row()
            row.prop(god_rays, "steps_per_pass", text="Steps per Pass")

            bloom = world.b4w_bloom_settings
            row = layout.row()
            box = row.box()
            col = box.column()
            col.label("Bloom settings:")
            row = col.row()
            row.prop(bloom, "key", text="Key")
            row = col.row()
            row.prop(bloom, "blur", text="Blur")
            row = col.row()
            row.prop(bloom, "edge_lum", text="Edge Luminance")

            motion_blur = world.b4w_motion_blur_settings
            row = layout.row()
            box = row.box()
            col = box.column()
            col.label("Motion Blur Settings:")
            row = col.row()
            row.prop(motion_blur, "motion_blur_factor", text="Motion Blur Factor")
            row = col.row()
            row.prop(motion_blur, "motion_blur_decay_threshold", \
                    text="Motion Blur Decay Threshold")

            ccs = world.b4w_color_correction_settings
            row = layout.row()
            box = row.box()
            col = box.column()
            col.label("Color Correction Settings:")
            row = col.row()
            row.prop(ccs, "brightness", text="Brightness")
            row = col.row()
            row.prop(ccs, "contrast", text="Contrast")
            row = col.row()
            row.prop(ccs, "exposure", text="Exposure")
            row = col.row()
            row.prop(ccs, "saturation", text="Saturation")

class B4W_ObjectPanel(bpy.types.Panel):
    bl_label = "Blend4Web"
    bl_idname = "OBJECT_PT_b4w"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "object"


    def draw(self, context):
        layout = self.layout

        obj = context.object

        row = layout.row(align=True)
        row.label("Export options:")

        col = row.column()
        col.prop(obj, "b4w_do_not_export", text="Do not Export")

        if (obj.type == "MESH" or obj.type == "FONT" or obj.type == "META" 
                or obj.type == "SURFACE"):
            col.prop(obj, "b4w_apply_scale", text="Apply Scale")
            col.prop(obj, "b4w_apply_modifiers", text="Apply Modifiers")

        if obj.type == "MESH":
            col.prop(obj, "b4w_loc_export_vertex_anim", text="Export Vertex " +
                    "animation")
            col.prop(obj, "b4w_export_edited_normals", text="Export Edited Normals")


        row = layout.row(align=True)
        box = row.box()
        col = box.column()
        col.label("Animation:")

        row = col.row()
        row.prop(obj, "b4w_use_default_animation", text="Use Default")

        if obj.type == "ARMATURE":
            row = col.row()
            row.prop(obj, "b4w_animation_mixing", text="Animation Blending")

        row = col.row()
        row.prop(obj, "b4w_anim_behavior", text="Behavior")


        if obj.type == "EMPTY" and obj.dupli_group:
            row = layout.row()
            row.prop(obj, "b4w_group_relative", text="Relative Group Coords")

        if obj.proxy:
            row = layout.row(align=True)
            row.label("Proxy:")

            col = row.column()
            col.prop(obj, "b4w_proxy_inherit_anim", text="Inherit Animation")

        if (obj.type == "MESH" or obj.type == "FONT" or obj.type == "META" 
                or obj.type == "SURFACE"):

            row = layout.row()
            row.prop(obj, "b4w_do_not_batch", text="Do not Batch")

            row = layout.row()
            row.prop(obj, "b4w_dynamic_geometry", text="Dynamic Geometry")

            row = layout.row()
            row.prop(obj, "b4w_do_not_cull", text="Disable Frustum Culling")

            row = layout.row()
            row.prop(obj, "b4w_disable_fogging", text="Disable Fogging")

            row = layout.row()
            row.prop(obj, "b4w_do_not_render", text="Do not Render")

            row = layout.row()
            row.label("Shadows:")

            col = row.column()
            col.prop(obj, "b4w_shadow_cast", text="Cast")
            if obj.b4w_shadow_cast:
                col.prop(obj, "b4w_shadow_cast_only", text="Cast Only")
            col.prop(obj, "b4w_shadow_receive", text="Receive")

            row = layout.row()
            row.label("Reflections:")

            col = row.column()
            col.prop(obj, "b4w_reflexible", text="Reflexible")
            if obj.b4w_reflexible:
                col.prop(obj, "b4w_reflexible_only", text="Reflexible Only")

            col.prop(obj, "b4w_reflective", text="Reflective")

            if obj.b4w_reflective:
                index = obj.b4w_refl_plane_index
                locked_cons = get_locked_track_constraint(obj, index)
                if locked_cons:
                    row = layout.row()
                    row.prop(locked_cons, "target", text="Reflection Plane")

            row = layout.row()
            row.prop(obj, "b4w_caustics", text="Caustics")

            row = layout.row()
            row.prop(obj, "b4w_wind_bending", text="Wind Bending")

            if obj.b4w_wind_bending:

                row = layout.row(align=True)
                box = row.box()
                col = box.column()
                col.label("Main bending")
                row = col.row()
                row.prop(obj, "b4w_wind_bending_angle", slider=True, text="Angle")
                row.prop(obj, "b4w_wind_bending_freq", text="Frequency")
                row = col.row()

                icon_stiffnes = "NONE"
                icon_leaves_stiffness = "NONE"
                icon_phase = "NONE"
                icon_overall = "NONE"

                if obj.type == "MESH":
                    if obj.b4w_main_bend_stiffness_col != "":
                        icon_stiffnes = "ERROR"
                        if check_vertex_color(obj.data, obj.b4w_main_bend_stiffness_col):
                            icon_stiffnes = "GROUP_VCOL"
                    row.prop(obj, "b4w_main_bend_stiffness_col", text="Main Stiffness (A)", icon=icon_stiffnes)

                detail_bend = obj.b4w_detail_bend_colors
                row = layout.row(align=True)
                box = row.box()
                col = box.column()
                col.label("Detail Bending:")
                row = col.row()
                row.prop(obj, "b4w_detail_bending_amp", slider=True,
                        text="Detail Amplitude")
                row.prop(obj, "b4w_branch_bending_amp", slider=True,
                        text="Branch Amplitude")
                row = col.row()
                row.prop(obj, "b4w_detail_bending_freq", slider=True,
                        text="Detail Bending Frequency")
                row = col.row()
                if obj.type == "MESH":
                    if detail_bend.leaves_stiffness_col != "":
                        icon_leaves_stiffness = "ERROR"
                        if check_vertex_color(obj.data, detail_bend.leaves_stiffness_col):
                            icon_leaves_stiffness = "GROUP_VCOL"
                    row.prop(detail_bend, "leaves_stiffness_col", text="Leaves Stiffness (R)", icon=icon_leaves_stiffness)
                    row = col.row()
                    if detail_bend.leaves_phase_col != "":
                        icon_phase = "ERROR"
                        if check_vertex_color(obj.data, detail_bend.leaves_phase_col):
                            icon_phase = "GROUP_VCOL"
                    row.prop(detail_bend, "leaves_phase_col", text="Leaves Phase (G)", icon=icon_phase)
                    row = col.row()
                    if detail_bend.overall_stiffness_col != "":
                        icon_overall = "ERROR"
                        if check_vertex_color(obj.data, detail_bend.overall_stiffness_col):
                            icon_overall = "GROUP_VCOL"
                    row.prop(detail_bend, "overall_stiffness_col", text="Overall Stiffness (B)", icon=icon_overall)
            row = layout.row()
            row.prop(obj, "b4w_selectable", text="Selectable")

            if obj.b4w_selectable:
                row = layout.row()
                box = row.box()
                col = box.column()
                col.label("Glow Settings:")

                row = col.row()
                row.prop(obj.b4w_glow_settings, "glow_duration", text="Glow Duration")
                row = col.row()
                row.prop(obj.b4w_glow_settings, "glow_period", text="Glow Period")
                row = col.row()
                row.prop(obj.b4w_glow_settings, "glow_relapses", text="Glow Relapses")

            box = layout.box()
            box.prop(obj, "b4w_billboard", text="Billboard")
            if obj.b4w_billboard:
                box.prop(obj, "b4w_pres_glob_orientation", 
                        text="Preserve global orientation and scale")
                row = box.row()
                row.label("Billboarding geometry:")
                row.prop(obj, "b4w_billboard_geometry", expand=True)

            row = layout.row()
            row.prop(obj, "b4w_lod_transition", text="Lod Transition Ratio")

        row = layout.row()
        row.prop(obj, "b4w_enable_object_tags", text="Enable Meta Tags")

        if obj.b4w_enable_object_tags:
            row = layout.row()
            box = row.box()
            col = box.column()
            col.label("Tags:")
            row = col.row()

            row.prop(obj.b4w_object_tags, "title", text="Title")
            row = col.row()
            row.prop(obj.b4w_object_tags, "description", text="Description")
            row = col.row()
            row.prop(obj.b4w_object_tags, "category", text="Category")
            row = col.row()


def get_locked_track_constraint(obj, index):
    constraint_index = 0
    for cons in obj.constraints:
        if cons.type == "LOCKED_TRACK":
            if constraint_index == index:
                return cons
            constraint_index += 1

class B4W_DataPanel(bpy.types.Panel):
    bl_label = "Blend4Web"
    bl_idname = "DATA_PT_b4w"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "data"

    def draw(self, context):
        layout = self.layout

        cam = context.camera
        if cam:
            row = layout.row(align=True)
            row.prop(cam, "b4w_move_style", text="Move Style")

            if cam.b4w_move_style == "TARGET":
                row = layout.column()
                row.prop(cam, "b4w_target", text="Target Location")
                row.operator("b4w.camera_target_copy", text="Copy Cursor Location")

            if cam.b4w_move_style == "TARGET" \
                    or cam.b4w_move_style == "EYE" \
                    or cam.b4w_move_style == "HOVER":
                row = layout.row()
                row.prop(cam, "b4w_trans_velocity", text="Translation Velocity")
                row = layout.row()
                row.prop(cam, "b4w_rot_velocity", text="Rotation Velocity")

            if cam.b4w_move_style == "TARGET" \
                    or cam.b4w_move_style == "HOVER":
                row = layout.row()
                row.prop(cam, "b4w_zoom_velocity", text="Zoom Velocity")

            if cam.b4w_move_style == "TARGET" \
                    or cam.b4w_move_style == "EYE" \
                    or cam.b4w_move_style == "HOVER":
                box = layout.box()
                col = box.column()
                col.label("Camera limits:")

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
                row.label("Camera angle limits:")
                row = col.split(0.5, align=True)
                row.active = getattr(cam, "b4w_use_distance_limits")
                row.prop(cam, "b4w_hover_angle_min", text="Min")
                row.prop(cam, "b4w_hover_angle_max", text="Max")

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

            row = layout.row()
            row.prop(cam, "b4w_dof_front", text="Dof Front Distance")

            row = layout.row()
            row.prop(cam, "b4w_dof_rear", text="Dof Rear Distance")

            row = layout.row()
            row.prop(cam, "b4w_dof_power", text="Dof Power")

        spk = context.speaker
        if spk:
            row = layout.row()
            row.prop(spk, "b4w_behavior", text="Speaker Behavior")

            row = layout.row()
            row.active = (getattr(spk, "b4w_behavior") == "POSITIONAL")
            row.prop(spk, "b4w_disable_doppler", text="Disable Doppler")

            row = layout.row()
            row.prop(spk, "b4w_cyclic_play", text="Cyclic Play")

            row = layout.row()
            row.prop(spk, "b4w_delay", text="Delay")

            row = layout.row()
            row.prop(spk, "b4w_delay_random", text="Random Delay")

            row = layout.row()
            row.active = (getattr(spk, "b4w_behavior") != "BACKGROUND_MUSIC")
            row.prop(spk, "b4w_volume_random", text="Random Volume")

            row = layout.row()
            row.active = (getattr(spk, "b4w_behavior") != "BACKGROUND_MUSIC")
            row.prop(spk, "b4w_pitch_random", text="Random Pitch")

            row = layout.row(align=True)
            row.prop(spk, "b4w_fade_in", text="Fade-In")
            row.prop(spk, "b4w_fade_out", text="Fade-Out")

            row = layout.row()
            row.prop(spk, "b4w_loop", text="Loop")

            # NOTE: not implemented
            row = layout.row()
            row.active = getattr(spk, "b4w_loop") and False
            row.prop(spk, "b4w_loop_count", text="Loop Count")

            # NOTE: not implemented
            row = layout.row()
            row.active = getattr(spk, "b4w_loop") and False
            row.prop(spk, "b4w_loop_count_random", text="Random Loop Count")

            # NOTE: not implemented
            row = layout.row()
            row.active = False
            row.prop(spk, "b4w_playlist_id", text="Playlist ID")

        lmp = context.lamp
        if lmp:
            row = layout.row()
            row.prop(lmp, "b4w_generate_shadows", text="Generate Shadows")

            if lmp.type == "SUN":
                row = layout.row()
                row.prop(lmp, "b4w_dynamic_intensity", text="Dynamic Intensity")

        msh = context.mesh
        if msh:
            row = layout.row()
            row.prop(msh, "b4w_override_boundings", text="Override Boundings")

            if getattr(msh, "b4w_override_boundings"):
                row = layout.row()
                boundings = msh.b4w_boundings
                row.prop(boundings, "min_x", text="Minimum X")
                row.prop(boundings, "max_x", text="Maximum X")
                row = layout.row()
                row.prop(boundings, "min_y", text="Minimum Y")
                row.prop(boundings, "max_y", text="Maximum Y")
                row = layout.row()
                row.prop(boundings, "min_z", text="Minimum Z")
                row.prop(boundings, "max_z", text="Maximum Z")
                row = layout.row()

class B4W_RenderPanel(bpy.types.Panel):
    bl_label = "Blend4Web"
    bl_idname = "RENDER_PT_b4w"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "render"

    def draw(self, context):
        layout = self.layout
        path_to_index = os.path.join(bpy.context.user_preferences.addons[__package__].preferences.b4w_src_path, "index.html")
        os.path.normpath(path_to_index)
        if os.path.exists(path_to_index):
            box = layout.box()
            if B4WStartServer.server_process is not None:
                    box.label(text = ("Development server is running."))
                    box.operator("b4w.start_server", text="Stop", icon="PAUSE")
                    box.operator("b4w.open_sdk", text="Open SDK", icon="URL")
            else:
                if B4WStartServer.waiting_for_serv:
                    box.label(text = ("Stopping server..."))
                else:
                    box.label(text = ("Development server is down."))
                    box.operator("b4w.start_server", text="Start", icon="PLAY")
        else:
            layout.label(text = ("Blend4Web SDK was not found."))
        
class B4W_MaterialPanel(bpy.types.Panel):
    bl_label = "Blend4Web"
    bl_idname = "MATERIAL_PT_b4w"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "material"

    def draw(self, context):
        layout = self.layout

        mat = context.material

        # prevent errors when panel is empty
        if mat:
            row = layout.row()
            row.prop(mat, "b4w_do_not_export", text="Do not Export")

            row = layout.row()
            row.prop(mat, "b4w_do_not_render", text="Do not Render")

            if mat.game_settings.alpha_blend not in ["OPAQUE", "CLIP"]:
                row = layout.row()
                row.prop(mat, "b4w_render_above_all", text="Render Above All")

            if mat.type == "HALO":
                row = layout.row()
                row.prop(mat, "b4w_halo_sky_stars", text = "Special: Stars");

                if mat.b4w_halo_sky_stars:
                    row = layout.row()
                    row.prop(mat, "b4w_halo_stars_blend_height", text = "Blending Height");

                    row = layout.row()
                    row.prop(mat, "b4w_halo_stars_min_height", text = "Stars minimum height");
            else:

                row = layout.row()
                row.prop(mat, "b4w_water", text="Special: Water")

                if mat.b4w_water:

                    row = layout.row()
                    box = row.box()
                    col = box.column()
                    col.label("Water Settings:")

                    row = col.row()
                    row.prop(mat, "b4w_water_shore_smoothing", text="Shore Smoothing")

                    row = col.row()
                    row.active = getattr(mat, "b4w_water_shore_smoothing")
                    row.prop(mat, "b4w_water_absorb_factor", text="Water Absorb Factor")

                    row = col.row()
                    row.label(text = ("Underwater fog:"))
                    row = col.row()
                    split = row.split()
                    split.prop(mat, "b4w_water_fog_color", text="")
                    split.prop(mat, "b4w_water_fog_density", text="Density")

                    row = col.row()
                    row.label(text = ("Shallow water:"))
                    row = col.row()
                    split = row.split()
                    split.prop(mat, "b4w_shallow_water_col", text="")
                    split.prop(mat, "b4w_shallow_water_col_fac", text="Factor")

                    row = col.row()
                    row.label(text = ("Shore water:"))
                    row = col.row()
                    split = row.split()
                    split.prop(mat, "b4w_shore_water_col", text="")
                    split.prop(mat, "b4w_shore_water_col_fac", text="Factor")

                    row = col.row()
                    row.prop(mat, "b4w_water_sss_strength", text="Sss Strength")
                    row.prop(mat, "b4w_water_sss_width", text="Sss Width")

                    row = col.row()
                    row.prop(mat, "b4w_foam_factor", text="Water Foam Factor")

                    row = col.row()
                    row.prop(mat, "b4w_water_norm_uv_velocity", text="Normalmap UV Velocity")

                    row = col.row()
                    row.prop(mat, "b4w_water_dynamic", text="Water Dynamic")

                    row = col.row()
                    row.active = getattr(mat, "b4w_water_dynamic")
                    row.prop(mat, "b4w_waves_height", text="Wave Height")
                    row.prop(mat, "b4w_waves_length", text="Wave Length")

                    row = col.row()
                    row.active = getattr(mat, "b4w_water_dynamic")
                    row.prop(mat, "b4w_water_dst_noise_scale0", text="Noise Dist Scale 0")
                    row.prop(mat, "b4w_water_dst_noise_scale1", text="Noise Dist Scale 1")

                    row = col.row()
                    row.active = getattr(mat, "b4w_water_dynamic")
                    row.prop(mat, "b4w_water_dst_noise_freq0", text="Noise Dist Freq 0")
                    row.prop(mat, "b4w_water_dst_noise_freq1", text="Noise Dist Freq 1")

                    row = col.row()
                    row.active = getattr(mat, "b4w_water_dynamic")
                    row.prop(mat, "b4w_water_dir_min_shore_fac", text="Min Dir Shore Fac")
                    row.prop(mat, "b4w_water_dir_freq", text="Dir Frequency")

                    row = col.row()
                    row.active = getattr(mat, "b4w_water_dynamic")
                    row.prop(mat, "b4w_water_dir_noise_scale", text="Noise Dir Scale")
                    row.prop(mat, "b4w_water_dir_noise_freq", text="Noise Dir Freq")

                    row = col.row()
                    row.active = getattr(mat, "b4w_water_dynamic")
                    row.prop(mat, "b4w_water_dir_min_noise_fac", text="Min Dir Noise Fac")
                    row.prop(mat, "b4w_water_dst_min_fac", text="Min Dist Fac")

                    row = col.row()
                    row.active = getattr(mat, "b4w_water_dynamic")
                    row.prop(mat, "b4w_water_waves_hor_fac", text="Horizontal Factor")

                    row = col.row()
                    row.prop(mat, "b4w_generated_mesh", text="Generate Mesh")

                    row = col.row()
                    row.active = getattr(mat, "b4w_generated_mesh")

                    # calculate vertices number in generated mesh
                    n = getattr(mat, "b4w_water_num_cascads")
                    s = getattr(mat, "b4w_water_subdivs")
                    count = (n*(s + 1)*(s + 1) - 4*(n - 1)*s
                           - 2*s - (n - 1)*(s/2 - 1)*(s/2 - 1)
                           + 8)
                    row.label(text = ("Number of vertices " + repr(count)))

                    row = col.row()
                    row.active = getattr(mat, "b4w_generated_mesh")
                    row.prop(mat, "b4w_water_num_cascads", text="Number Of Cascades")

                    row = col.row()
                    row.active = getattr(mat, "b4w_generated_mesh")
                    row.prop(mat, "b4w_water_subdivs", text="Number Of Subdivisions")

                    row = col.row()
                    row.active = getattr(mat, "b4w_generated_mesh")
                    row.prop(mat, "b4w_water_detailed_dist", text="Detailed Distance")

                icon_size = "NONE"
                icon_color = "NONE"
                obj = bpy.context.active_object
                row = layout.row()
                row.prop(mat, "b4w_terrain", text="Terrain Dynamic Grass")

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
                row.active = getattr(mat, "b4w_terrain")
                row.prop(mat, "b4w_dynamic_grass_size", text="Dynamic Grass Size (R)", icon=icon_size)

                row = layout.row()
                row.active = getattr(mat, "b4w_terrain")
                row.prop(mat, "b4w_dynamic_grass_color", text="Dynamic Grass Color (RGB)", icon=icon_color)

                row = layout.row()
                row.prop(mat, "b4w_collision", text="Special: Collision")

                if mat.b4w_collision:
                    row = layout.row()
                    row.prop(mat, "b4w_use_ghost", text="Ghost")

                    row = layout.row()
                    row.prop(mat, "b4w_collision_id", text="Collision ID")

                    col = layout.column()
                    col.prop(mat, "b4w_collision_group", text="Collision Group")
                    col = layout.column()
                    col.prop(mat, "b4w_collision_mask", text="Collision Mask")

                row = layout.row()
                row.prop(mat, "b4w_wettable", text="Wettable")

                row = layout.row()
                row.prop(mat, "b4w_double_sided_lighting", text = "Double-sided Lighting")
                row = layout.row()

                if not mat.use_nodes:
                    row.prop(mat, "b4w_refractive", text = "Refractive")
                    if mat.b4w_refractive:
                        row = layout.row()
                        box = row.box()
                        col = box.column()
                        col.label("Refraction Settings:")
                        row = col.row()
                        row.prop(mat, "b4w_refr_bump", text="Refraction Bump")


class B4W_TexturePanel(bpy.types.Panel):
    bl_label = "Blend4Web"
    bl_idname = "TEXTURE_PT_b4w"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "texture"

    def draw(self, context):
        tex = context.texture
        layout = self.layout

        if tex and tex.type == "NONE":
            icon_source = "NONE"
            if tex.b4w_source_type == "SCENE":
                icon_source = "ERROR"
                for scene in bpy.data.scenes:
                    if scene.name == tex.b4w_source_id:
                        icon_source = "SCENE_DATA"
                        break
            else:
                for texture in bpy.data.textures:
                    if (texture.b4w_source_id == tex.b4w_source_id 
                            and texture != tex or tex.b4w_source_id == ""):
                        icon_source = "ERROR"
                        break
            layout.prop(tex, "b4w_source_type", text="Source Type")
            if tex.b4w_source_type != "NONE":
                layout.prop(tex, "b4w_source_id", text="Source ID", icon=icon_source)
                layout.prop(tex, "b4w_source_size", text="Source Size")
                layout.prop(tex, "b4w_extension", text="Extension")
                if tex.b4w_source_type == "CANVAS":
                    layout.prop(tex, "b4w_enable_canvas_mipmapping", text="Enable Mipmapping")

        if tex:
            if tex.type == "ENVIRONMENT_MAP" and len(tex.users_material) == 0:
                row = layout.row()
                row.prop(tex, "b4w_do_not_export", text="Do not Export")

                split = layout.split()
                col = split.column()
                col.label(text="Anisotropic Filtering:")
                col = split.column()
                col.prop(tex, "b4w_anisotropic_filtering", text="")

                split = layout.split()
                col = split.column()
                col.label(text="Sky Texture Usage:")
                col = split.column()
                col.prop(tex, "b4w_use_sky", text="")

                row = layout.row()
                row.prop(tex, "b4w_disable_compression", text="Disable Compression")

            else:
                row = layout.row()
                row.prop(tex, "b4w_do_not_export", text="Do not Export")

                split = layout.split()
                col = split.column()
                col.label(text="Parallax:")
                row = layout.row(align=True)
                row.prop(tex, "b4w_use_map_parallax", text="")
                sub = row.row()
                sub.active = getattr(tex, "b4w_use_map_parallax")
                sub.prop(tex, "b4w_parallax_scale", text="Parallax Scale", slider=True)
                sub.prop(tex, "b4w_parallax_steps", text="Parallax Steps", slider=True)
                row = layout.row(align=True)
                row.active = getattr(tex, "b4w_use_map_parallax")
                row.prop(tex, "b4w_parallax_lod_dist", text="Parallax Lod Distance", slider=True)
                layout.row()

                split = layout.split()
                col = split.column()
                col.label(text="Anisotropic Filtering:")
                col = split.column()
                col.prop(tex, "b4w_anisotropic_filtering", text="")

                split = layout.split()
                col = split.column()
                col.label(text="UV Translation Velocity:")

                row = layout.row()
                row.prop(tex, "b4w_water_foam", text="Water Foam")

                if tex.b4w_water_foam:
                    row = layout.row()
                    row.prop(tex, "b4w_foam_uv_freq", text="UV Frequency")

                    row = layout.row()
                    row.prop(tex, "b4w_foam_uv_magnitude", text="UV Magnitude")

                row = layout.row()
                row.prop(tex, "b4w_disable_compression", text="Disable Compression")

                row = layout.row()
                row.prop(tex, "b4w_shore_dist_map", text="Shore Distance Map")

class B4W_ParticlePanel(bpy.types.Panel):
    bl_label = "Blend4Web"
    bl_idname = "PARTICLE_PT_b4w"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "particle"

    def draw(self, context):

        if not context.particle_system:
            return

        layout = self.layout
        pset = context.particle_system.settings


        if pset.type == "EMITTER":
            if pset.render_type != "BILLBOARD" and pset.render_type != "HALO":
                split = layout.split()
                col = split.column()
                col.label(text="The \"Emitter\" Particle System Requires \"Halo\"" + 
                        " or \"Billboard\" render type.")
                return

            row = layout.row()
            row.prop(pset, "b4w_do_not_export", text="Do not Export")

            row = layout.row()
            row.prop(pset, "b4w_cyclic", text="Cyclic Emission")

            row = layout.row()
            row.prop(pset, "b4w_allow_nla", text="Allow NLA")

            row = layout.row()
            row.prop(pset, "b4w_randomize_emission", text="Random Emission")

            row = layout.row()
            row.prop(pset, "b4w_billboard_align", text="Billboard Align")

            row = layout.row()
            row.label("Dissolve intervals:")

            row = layout.row(align=True)
            row.prop(pset, "b4w_fade_in", text="Fade-In")
            row.prop(pset, "b4w_fade_out", text="Fade-Out")

            row = layout.row()
            row.prop(pset, "b4w_coordinate_system", text="Coordinate System")

        if pset.type == "HAIR":
            if pset.render_type != "GROUP" and pset.render_type != "OBJECT":
                split = layout.split()
                col = split.column()
                col.label(text="The \"Hair\" Particle System Requires \"Object\"" + 
                        " or \"Group\" render type.")
                return

            row = layout.row()
            row.prop(pset, "b4w_do_not_export", text="Do not Export")

            row = layout.row()
            row.prop(pset, "b4w_randomize_location", text="Random Location And Size")

            row = layout.row()
            row.prop(pset, "b4w_initial_rand_rotation", text="Initial Random Rotation")

            if getattr(pset, "b4w_initial_rand_rotation"):
                row = layout.row()
                row.prop(pset, "b4w_rotation_type", text="Rotation Type")
                row = layout.row()
                row.prop(pset, "b4w_rand_rotation_strength", text="Rotation Strength")

            row = layout.row()
            row.prop(pset, "b4w_hair_billboard", text="Billboard")

            if getattr(pset, "b4w_hair_billboard"):
                row = layout.row()
                row.prop(pset, "b4w_hair_billboard_type", text="Billboard Type")

                if getattr(pset, "b4w_hair_billboard_type") == "JITTERED":
                    row = layout.row(align=True)
                    row.prop(pset, "b4w_hair_billboard_jitter_amp", text="Jitter Amplitude")
                    row.prop(pset, "b4w_hair_billboard_jitter_freq", text="Jitter Frequency")

                row = layout.row()
                row.label("Billboard Geometry:")
                row.prop(pset, "b4w_hair_billboard_geometry", expand=True)

            box = layout.box()
            row = box.row()
            row.prop(pset, "b4w_dynamic_grass", text="Dynamic Grass")

            if getattr(pset, "b4w_dynamic_grass"):
                row = box.row()
                row.prop(pset, "b4w_dynamic_grass_scale_threshold",
                        text="Scale Threshold")

            row = layout.row(align=True)
            box = row.box()
            col = box.column()
            col.label("Properties Inheritance")

            row = col.row()
            row.label("Wind Bending:")
            row.prop(pset, "b4w_wind_bend_inheritance", text="B4W_Wind_Bend_Inheritance", expand=True)

            row = col.row()
            row.label("Shadows:")
            row.prop(pset, "b4w_shadow_inheritance", text="B4W_Shadow_Inheritance", expand=True)

            row = col.row()
            row.label("Reflection:")
            row.prop(pset, "b4w_reflection_inheritance", text="B4W_Reflection_Inheritance", expand=True)

            row = col.row()
            row.label("Vertex Color:")
            row = col.row()


            icon_from = "NONE"
            icon_to = "NONE"

            from_name = pset.b4w_vcol_from_name
            to_name = pset.b4w_vcol_to_name
            if from_name != "":
                icon_from = "ERROR"
                mesh_from = bpy.context.active_object.data

                if mesh_from and check_vertex_color(mesh_from, from_name):
                    icon_from = "GROUP_VCOL"

            if to_name != "":
                icon_to = "ERROR"    
                if pset.render_type == "OBJECT" and pset.dupli_object \
                        and pset.dupli_object.type == "MESH":
                    mesh_to = pset.dupli_object.data
                    if check_vertex_color(mesh_to, to_name):
                        icon_to = "GROUP_VCOL"

                if pset.render_type == "GROUP" and pset.dupli_group:
                    for obj in pset.dupli_group.objects:
                        if obj.type == "MESH" and check_vertex_color(obj.data, to_name):
                            icon_to = "GROUP_VCOL"
                        else:
                            icon_to = "ERROR"
                            break

            row.prop(pset, "b4w_vcol_from_name", text="From", expand=True, icon=icon_from)
            row.prop(pset, "b4w_vcol_to_name", text="To", expand=True, icon=icon_to)

class B4W_PhysicsPanel(bpy.types.Panel):
    bl_label = "Blend4Web"
    bl_idname = "PHYSICS_PT_b4w"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "physics"

    def draw(self, context):
        layout = self.layout
        obj = context.object

        if bpy.context.scene.render.engine == "BLENDER_GAME":

            row = layout.row()
            row.prop(obj, "b4w_collision", text="Detect Collisions")

            if obj.b4w_collision:
                row = layout.row()
                row.prop(obj, "b4w_collision_id", text="Collision ID")

            row = layout.row()
            row.prop(obj, "b4w_floating", text="Floating")

            if obj.b4w_floating:
                row = layout.row()
                box = row.box()
                col = box.column()
                col.label("Floating Settings:")
                row = col.row()

                row.prop(obj.b4w_floating_settings, "name", text="Floater Name")
                row = col.row()
                row.prop(obj.b4w_floating_settings, "part", text="Part")

                if (obj.b4w_floating_settings.part == "MAIN_BODY"):
                    row = col.row()
                    row.prop(obj.b4w_floating_settings, "floating_factor",
                            text="Floating Factor")
                    row = col.row()
                    row.prop(obj.b4w_floating_settings, "water_lin_damp",
                            text="Water Linear Damping")
                    row = col.row()
                    row.prop(obj.b4w_floating_settings, "water_rot_damp",
                            text="Water Rotation Damping")

                if (obj.b4w_floating_settings.part == "BOB"):
                    row = col.row()
                    row.prop(obj.b4w_floating_settings, "synchronize_position",
                            text="Synchronize Bob Position")

            row = layout.row()
            row.prop(obj, "b4w_vehicle", text="Vehicle")

            if obj.b4w_vehicle:
                row = layout.row()
                box = row.box()
                col = box.column()
                col.label("Vehicle Settings:")
                row = col.row()

                row.prop(obj.b4w_vehicle_settings, "name", text="Vehicle Name")
                row = col.row()
                row.prop(obj.b4w_vehicle_settings, "part", text="Part")

                if (obj.b4w_vehicle_settings.part == "WHEEL_FRONT_LEFT" or
                        obj.b4w_vehicle_settings.part == "WHEEL_FRONT_RIGHT" or
                        obj.b4w_vehicle_settings.part == "WHEEL_BACK_LEFT" or
                        obj.b4w_vehicle_settings.part == "WHEEL_BACK_RIGHT"):
                    row = col.row()
                    row.prop(obj.b4w_vehicle_settings, "suspension_rest_length",
                            text="Suspension Rest Length")

                if (obj.b4w_vehicle_settings.part == "CHASSIS" or
                        obj.b4w_vehicle_settings.part == "HULL"):
                    row = col.row()
                    row.prop(obj.b4w_vehicle_settings, "force_max",
                            text="Force Max")
                    row.prop(obj.b4w_vehicle_settings, "brake_max",
                            text="Brake Max")

                if (obj.b4w_vehicle_settings.part == "CHASSIS"):
                    row = col.row()
                    row.prop(obj.b4w_vehicle_settings, "suspension_compression",
                            text="Suspension Compression")
                    row = col.row()
                    row.prop(obj.b4w_vehicle_settings, "suspension_stiffness",
                            text="Suspension Stiffness")
                    row = col.row()
                    row.prop(obj.b4w_vehicle_settings, "suspension_damping",
                            text="Suspension Damping")
                    row = col.row()
                    row.prop(obj.b4w_vehicle_settings, "wheel_friction",
                            text="Wheel Friction")
                    row = col.row()
                    row.prop(obj.b4w_vehicle_settings, "roll_influence",
                            text="Roll Influence")
                    row = col.row()
                    row.prop(obj.b4w_vehicle_settings, "max_suspension_travel_cm",
                            text="Max Suspension Travel Cm")

                if (obj.b4w_vehicle_settings.part == "HULL"):
                    row = col.row()
                    row.prop(obj.b4w_vehicle_settings, "floating_factor",
                            text="Floating Factor")
                    row = col.row()
                    row.prop(obj.b4w_vehicle_settings, "water_lin_damp",
                            text="Water Linear Damping")
                    row = col.row()
                    row.prop(obj.b4w_vehicle_settings, "water_rot_damp",
                            text="Water Rotation Damping")

                if (obj.b4w_vehicle_settings.part == "BOB"):
                    row = col.row()
                    row.prop(obj.b4w_vehicle_settings, "synchronize_position",
                            text="Synchronize Bob Position")

                if (obj.b4w_vehicle_settings.part == "STEERING_WHEEL"):
                    row = col.row()
                    row.prop(obj.b4w_vehicle_settings, "steering_ratio",
                            text="Steering Ratio")
                    row.prop(obj.b4w_vehicle_settings, "steering_max",
                            text="Steering Max")
                    row = col.row()
                    row.prop(obj.b4w_vehicle_settings, "inverse_control",
                            text="Inverse Control")

                if (obj.b4w_vehicle_settings.part == "TACHOMETER"):
                    row = col.row()
                    row.prop(obj.b4w_vehicle_settings, "delta_tach_angle",
                            text="Delta Tach Angle")

                if (obj.b4w_vehicle_settings.part == "SPEEDOMETER"):
                    row = col.row()
                    row.prop(obj.b4w_vehicle_settings, "max_speed_angle",
                            text="Max Speed Angle")
                    row.prop(obj.b4w_vehicle_settings, "speed_ratio",
                            text="Speed Ratio")

            if obj.type == "MESH":

                row = layout.row()
                row.prop(obj, "b4w_character", text="Character")

                if obj.b4w_character:

                    row = layout.row()
                    box = row.box()
                    col = box.column()
                    col.label("Character settings:")

                    row = col.row()
                    row.prop(obj.b4w_character_settings, "walk_speed", text="Walk Speed")
                    row = col.row()
                    row.prop(obj.b4w_character_settings, "run_speed", text="Run Speed")
                    row = col.row()
                    row.prop(obj.b4w_character_settings, "step_height", text="Step Height")
                    row = col.row()
                    row.prop(obj.b4w_character_settings, "jump_strength", text="Jump Strength")
                    row = col.row()
                    row.prop(obj.b4w_character_settings, "waterline", text="Waterline")

                split = layout.split()
                col = split.column()
                col.label(text="Bounding Box Correction:")
                col = split.column()
                col.prop(obj, "b4w_correct_bounding_offset", text="")


class CustomConstraintsPanel(bpy.types.OBJECT_PT_constraints):
    def draw_constraint(self, context, con):

        if con.type == "LOCKED_TRACK":

            layout = self.layout
            box = layout.box()

            box.label("LOCKED_TRACK constraint reserved for " + con.name)

        else:
            global _OBJECT_PT_constraints
            _OBJECT_PT_constraints.draw_constraint(self, context, con)


def add_remove_refl_plane(obj):

    if obj.b4w_reflective:
        #add reflection plane
        bpy.ops.object.constraint_add(type="LOCKED_TRACK")

        # TODO: index was needed for deprecated LODs
        index = 0
        obj.b4w_refl_plane_index = index

        cons = get_locked_track_constraint(obj, index)
        cons.name = "REFLECTION PLANE"
        # disable fake LOCKED_TRACK constraint
        cons.mute = True

    else:
        #remove reflection plane

        index = obj.b4w_refl_plane_index

        if index >= 0:
            cons = get_locked_track_constraint(obj, index)
            obj.constraints.remove(cons)

def register():
    global _OBJECT_PT_constraints

    bpy.utils.register_class(B4W_RenderPanel)
    bpy.utils.register_class(B4W_ScenePanel)
    bpy.utils.register_class(B4W_WorldPanel)
    bpy.utils.register_class(B4W_ObjectPanel)
    bpy.utils.register_class(B4W_DataPanel)
    bpy.utils.register_class(B4W_MaterialPanel)
    bpy.utils.register_class(B4W_TexturePanel)
    bpy.utils.register_class(B4W_ParticlePanel)
    bpy.utils.register_class(B4W_PhysicsPanel)

    _OBJECT_PT_constraints = bpy.types.OBJECT_PT_constraints
    bpy.utils.unregister_class(bpy.types.OBJECT_PT_constraints)
    bpy.utils.register_class(CustomConstraintsPanel)

def unregister():
    global _OBJECT_PT_constraints

    bpy.utils.unregister_class(B4W_RenderPanel)
    bpy.utils.unregister_class(B4W_ScenePanel)
    bpy.utils.unregister_class(B4W_WorldPanel)
    bpy.utils.unregister_class(B4W_ObjectPanel)
    bpy.utils.unregister_class(B4W_DataPanel)
    bpy.utils.unregister_class(B4W_MaterialPanel)
    bpy.utils.unregister_class(B4W_TexturePanel)
    bpy.utils.unregister_class(B4W_ParticlePanel)
    bpy.utils.unregister_class(B4W_PhysicsPanel)

    bpy.utils.unregister_class(CustomConstraintsPanel)
    bpy.utils.register_class(_OBJECT_PT_constraints)

