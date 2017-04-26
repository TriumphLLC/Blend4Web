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
import cProfile
import bgl

import blend4web

b4w_modules = ["server", "addon_prefs", "translator", "render_engine"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_
# common properties for all B4W render panels
class RenderButtonsPanel:
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "render"
    COMPAT_ENGINES = ["BLEND4WEB"]

    @classmethod
    def poll(cls, context):
        scene = context.scene
        return scene and (scene.render.engine in cls.COMPAT_ENGINES)

class B4W_RenderDevServer(RenderButtonsPanel, bpy.types.Panel):
    bl_label = _("Development Tools")
    bl_idname = "RENDER_PT_b4w_server"

    def draw(self, context):
        layout = self.layout
        if addon_prefs.has_valid_sdk_path():
            is_started = server.B4WLocalServer.get_server_status() == server.SUB_THREAD_START_SERV_OK
            is_waiting_for_shutdown = server.B4WLocalServer.is_waiting_for_shutdown()
            allow_actions = server.B4WLocalServer.allow_actions()

            if is_started:
                layout.label(text = _("Development server is running."))
            elif is_waiting_for_shutdown:
                layout.label(text = _("Stopping server..."))
            else:
                layout.label(text = _("Development server is off."))

            if allow_actions:
                if is_started:
                    layout.operator("b4w.stop_server", text=p_("Stop Server", "Operator"), icon="PAUSE")
                elif not is_waiting_for_shutdown:
                    layout.operator("b4w.start_server", text=p_("Start Server", "Operator"), icon="PLAY")
            else:
                layout.label(text = _("Server is run by another Blender instance."))

            if is_started:
                layout.operator("b4w.open_sdk", text=p_("SDK Index", "Operator"), icon="URL")
                layout.operator("b4w.open_proj_manager",
                        text=p_("Project Manager", "Operator"), icon="URL")
                layout.operator("b4w.preview",
                        text=p_("Fast Preview", "Operator"), icon_value=render_engine.custom_icons["b4w_icon"].icon_id)

        else:
            row = layout.row()
            row.label(text = _("Development server is unavailable for standalone Blend4Web add-on."))
            row = layout.row()
            row.label(text = _("Remove standalone Blend4Web add-on (if installed) and install Blend4Web SDK."))

class B4W_OperatorSetRecommendedOptions(bpy.types.Operator):
    bl_idname = "b4w.set_recommended_options"
    bl_label = p_("Set recommended options", "Operator")
    bl_description = _('Enable "World Space Shading", switch material mode to "GLSL", switch viewport shading to "Material", switch active camera sensor fit to "Vertical"')
    bl_options = {"INTERNAL"}
    def invoke(self, context, event):
        for scene in bpy.data.scenes:
            if hasattr(scene.render, "use_world_space_shading"):
                scene.render.use_world_space_shading = True
            scene.game_settings.material_mode = "GLSL"
            # can be any object from the scene
            if scene.camera and scene.camera.type == "CAMERA":
                scene.camera.data.sensor_fit = "VERTICAL"

        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                for space in area.spaces:
                    if space.type == "VIEW_3D":
                        space.viewport_shade = "MATERIAL"
        return {'FINISHED'}

class B4W_Shading(RenderButtonsPanel, bpy.types.Panel):
    bl_label = _("Shading")
    bl_idname = "RENDER_PT_b4w_shading"

    @classmethod
    def poll(cls, context):
        scene = context.scene
        return (scene.render.engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        layout = self.layout
        scene = context.scene
        layout.operator("b4w.set_recommended_options", text=p_("Set Recommended Options", "Operator"), icon="MAT_SPHERE_SKY")
        if hasattr(scene.render, "use_world_space_shading"):
            layout.prop(scene.render, "use_world_space_shading", text=_("World Space Shading"))


class B4W_RenderShadows(RenderButtonsPanel, bpy.types.Panel):
    bl_label = _("Shadows")
    bl_idname = "RENDER_PT_b4w_shadows"

    def draw(self, context):
        scene = context.scene
        shadow = scene.b4w_shadow_settings

        layout = self.layout

        layout.prop(scene, "b4w_render_shadows", text=_("Render Shadows"))

        col = layout.column()
        col.active = scene.b4w_render_shadows in {"ON", "AUTO"}
        row = col.row()
        row.prop(shadow, "soft_shadows", text=_("Soft Shadows"))
        row = col.row()
        row.prop(shadow, "blur_samples", text=_("Blur Samples"))
        row.active = getattr(shadow, "soft_shadows")
        row = col.row()
        row.prop(shadow, "csm_resolution", text=_("Resolution"))
        row = col.row()
        row.prop(shadow, "self_shadow_polygon_offset", text=_("Self-Shadow Polygon Offset"))
        row = col.row()
        row.prop(shadow, "self_shadow_normal_offset", text=_("Self-Shadow Normal Offset"))

        row = col.row()
        row.prop(shadow, "b4w_enable_csm", text=_("Enable CSM"))

        if getattr(shadow, "b4w_enable_csm"):
            row = col.row()
            row.prop(shadow, "csm_num", text=_("CSM Number"))

            col.label(text=_("CSM first cascade:"))
            row = col.row()
            sides = row.split(align=True)
            sides.prop(shadow, "csm_first_cascade_border", text=_("Border"))
            sides.prop(shadow, "first_cascade_blur_radius", text=_("Blur Radius"))

            col.label(text=_("CSM last cascade:"))
            row = col.row()
            sides = row.split(align=True)
            sides.prop(shadow, "csm_last_cascade_border", text=_("Border"))
            sides.prop(shadow, "last_cascade_blur_radius", text=_("Blur Radius"))
            row.active = getattr(shadow, "csm_num") > 1

            row = col.row()
            row.prop(shadow, "fade_last_cascade", text=_("Fade-Out Last Cascade"))
            row = col.row()
            row.prop(shadow, "blend_between_cascades", text=_("Blend Between Cascades"))
            row.active = getattr(shadow, "csm_num") > 1
        else:
            row = col.row()
            row.prop(shadow, "first_cascade_blur_radius", text=_("Blur Radius"))


class B4W_RenderReflRefr(RenderButtonsPanel, bpy.types.Panel):
    bl_label = _("Reflections and Refractions")
    bl_idname = "RENDER_PT_b4w_refls_refrs"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        scene = context.scene

        layout = self.layout
        split = layout.split()
        col = split.column()
        col.prop(scene, "b4w_render_reflections", text=_("Reflections"))
        row = col.row()
        row.active = scene.b4w_render_reflections == "ON"
        row.prop(scene, "b4w_reflection_quality", text=_("Quality"))
        col = split.column()
        col.prop(scene, "b4w_render_refractions", text=_("Refractions"))

class B4W_RenderOutlining(RenderButtonsPanel, bpy.types.Panel):
    bl_label = _("Object Outlining")
    bl_idname = "RENDER_PT_b4w_outlining"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        scene = context.scene

        layout = self.layout
        layout.prop(context.scene, "b4w_enable_outlining", text=_("Enable"))

        row = layout.row()
        row.active = getattr(scene, "b4w_enable_outlining") in {"ON", "AUTO"}

        split = row.split()
        split.prop(scene, "b4w_outline_color", text="")
        split = row.split()
        split.prop(scene, "b4w_outline_factor", text=_("Factor"))

class B4W_RenderGlow(RenderButtonsPanel, bpy.types.Panel):
    bl_label = _("Glow Materials")
    bl_idname = "RENDER_PT_b4w_GlowMats"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        scene = context.scene
        glow = scene.b4w_glow_settings

        layout = self.layout
        row = layout.row()
        row.prop(scene, "b4w_enable_glow_materials", text=_("Enable"))

        panel_active = getattr(scene, "b4w_enable_glow_materials") in {"ON", "AUTO"}

        row = layout.row()
        row.active = panel_active
        row.label(text=_("Small Mask:"))
        row = layout.row()
        row.active = panel_active
        col = row.column()
        col.prop(glow, "small_glow_mask_coeff", text=_("Intensity"))
        col = row.column()
        col.prop(glow, "small_glow_mask_width", text=_("Width"))

        row = layout.row()
        row.active = panel_active
        row.label(text=_("Large Mask:"))
        row = layout.row()
        col = row.column()
        col.prop(glow, "large_glow_mask_coeff", text=_("Intensity"))
        col = row.column()
        col.prop(glow, "large_glow_mask_width", text=_("Width"))

        row = layout.row()
        row.active = panel_active
        row.prop(glow, "render_glow_over_blend", text=_("Render Glow Over Transparent Objects"))

class B4W_RenderAntialiasing(RenderButtonsPanel, bpy.types.Panel):
    bl_label = _("Anti-Aliasing")
    bl_idname = "RENDER_PT_b4w_antialiasing"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        scene = context.scene

        layout = self.layout
        layout.prop(scene, "b4w_antialiasing_quality", text=_("AA Quality"))

class B4W_SceneAniso(RenderButtonsPanel, bpy.types.Panel):
    bl_label = _("Anisotropic Filtering")
    bl_idname = "RENDER_PT_b4w_nla"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene = context.scene
        layout.prop(scene, "b4w_anisotropic_filtering", text="")

class B4W_RenderBloom(RenderButtonsPanel, bpy.types.Panel):
    bl_label = _("Bloom")
    bl_idname = "RENDER_PT_b4w_Bloom"
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        self.layout.prop(context.scene, "b4w_enable_bloom", text="")

    def draw(self, context):
        scene = context.scene
        bloom = scene.b4w_bloom_settings

        layout = self.layout
        layout.active = getattr(scene, "b4w_enable_bloom")

        layout.prop(bloom, "adaptive", text=_("Use Adaptive"))
        if not getattr(bloom, "adaptive"):
            layout.prop(bloom, "average_luminance", text=_("Average Luminance"))
        layout.prop(bloom, "key", text=_("Intensity"))
        layout.prop(bloom, "blur", text=_("Blur"))
        layout.prop(bloom, "edge_lum", text=_("Edge Luminance"))

class B4W_RenderMotionBlur(RenderButtonsPanel, bpy.types.Panel):
    bl_label = _("Motion Blur")
    bl_idname = "RENDER_PT_b4w_MotionBlur"
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        self.layout.prop(context.scene, "b4w_enable_motion_blur", text="")

    def draw(self, context):
        scene = context.scene
        motion_blur = scene.b4w_motion_blur_settings

        layout = self.layout
        layout.active = getattr(scene, "b4w_enable_motion_blur")

        layout.prop(motion_blur, "motion_blur_factor", text=_("Factor"))
        layout.prop(motion_blur, "motion_blur_decay_threshold",
                                                       text=_("Decay Threshold"))

class B4W_RenderSSAO(RenderButtonsPanel, bpy.types.Panel):
    bl_label = "Ambient Occlusion (SSAO)"
    bl_idname = "RENDER_PT_b4w_SSAO"
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        self.layout.prop(context.scene, "b4w_enable_ssao", text="")

    def draw(self, context):
        scene = context.scene
        ssao = scene.b4w_ssao_settings

        layout = self.layout
        layout.active = getattr(scene, "b4w_enable_ssao")

        layout.prop(ssao, "radius_increase", text=_("Radius Increase"))
        layout.prop(ssao, "hemisphere", text=_("Use Hemisphere"))
        layout.prop(ssao, "blur_depth", text=_("Use Blur Depth Test"))
        layout.prop(ssao, "blur_discard_value", text=_("Blur Depth Test Discard Value"))
        layout.prop(ssao, "influence", text=_("Influence"))
        layout.prop(ssao, "dist_factor", text=_("Distance Factor"))

        row = layout.row()
        row.label(text=_("Samples:"))
        row.prop(ssao, "samples", text=_("Samples"), expand=True)

class B4W_RenderGodRays(RenderButtonsPanel, bpy.types.Panel):
    bl_label = _("God Rays")
    bl_idname = "RENDER_PT_b4w_GodRays"
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        self.layout.prop(context.scene, "b4w_enable_god_rays", text="")

    def draw(self, context):
        scene = context.scene
        god_rays = scene.b4w_god_rays_settings

        layout = self.layout
        layout.active = getattr(scene, "b4w_enable_god_rays")

        layout.prop(god_rays, "intensity", text=_("Intensity"))
        layout.prop(god_rays, "max_ray_length", text=_("Maximum Ray Length"))
        layout.prop(god_rays, "steps_per_pass", text=_("Steps per Pass"))

class B4W_RenderColorCorrection(RenderButtonsPanel, bpy.types.Panel):
    bl_label = _("Color Correction")
    bl_idname = "RENDER_PT_b4w_ColorCorrection"
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        self.layout.prop(context.scene, "b4w_enable_color_correction", text="")

    def draw(self, context):
        scene = context.scene
        ccs = scene.b4w_color_correction_settings

        layout = self.layout
        layout.active = getattr(scene, "b4w_enable_color_correction")

        row = layout.row()
        row.prop(ccs, "brightness", text=_("Brightness"))
        row.prop(ccs, "contrast", text=_("Contrast"))

        row = layout.row()
        row.prop(ccs, "exposure", text=_("Exposure"))
        row.prop(ccs, "saturation", text=_("Saturation"))

class B4W_RenderTimeline(RenderButtonsPanel, bpy.types.Panel):
    bl_label = _("Timeline")
    bl_idname = "RENDER_PT_b4w_timeline"
    bl_options = {'DEFAULT_CLOSED'}

    _frame_rate_args_prev = None
    _preset_class = None

    @staticmethod
    def _draw_framerate_label(*args):
        # avoids re-creating text string each draw
        if B4W_RenderTimeline._frame_rate_args_prev == args:
            return B4W_RenderTimeline._frame_rate_ret

        fps, fps_base, preset_label = args

        if fps_base == 1.0:
            fps_rate = round(fps)
        else:
            fps_rate = round(fps / fps_base, 2)

        # TODO: Change the following to iterate over existing presets
        custom_framerate = (fps_rate not in {23.98, 24, 25, 29.97, 30, 50, 59.94, 60})

        if custom_framerate is True:
            fps_label_text = "Custom (%r fps)" % fps_rate
            show_framerate = True
        else:
            fps_label_text = "%r fps" % fps_rate
            show_framerate = (preset_label == "Custom")

        B4W_RenderTimeline._frame_rate_args_prev = args
        B4W_RenderTimeline._frame_rate_ret = args = (fps_label_text, show_framerate)
        return args

    @staticmethod
    def draw_framerate(sub, rd):
        if B4W_RenderTimeline._preset_class is None:
            B4W_RenderTimeline._preset_class = bpy.types.RENDER_MT_framerate_presets

        args = rd.fps, rd.fps_base, B4W_RenderTimeline._preset_class.bl_label
        fps_label_text, show_framerate = B4W_RenderTimeline._draw_framerate_label(*args)

        sub.menu("RENDER_MT_framerate_presets", text=fps_label_text)

        if show_framerate:
            sub.prop(rd, "fps")
            sub.prop(rd, "fps_base", text="/")

    def draw(self, context):
        scene = context.scene
        rd = scene.render

        layout = self.layout
        split = layout.split()

        col = split.column()
        sub = col.column(align=True)
        sub.label(text=_("Frame Range:"))
        sub.prop(scene, "frame_start")
        sub.prop(scene, "frame_end")

        sub.label(text=_("Frame Rate:"))

        self.draw_framerate(sub, rd)

class B4W_RenderDynamicGrass(RenderButtonsPanel, bpy.types.Panel):
    bl_label = _("Dynamic Grass")
    bl_idname = "RENDER_PT_b4w_DynGrass"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        scene = context.scene

        layout = self.layout
        layout.prop(scene, "b4w_render_dynamic_grass", text=_("Enable"))
