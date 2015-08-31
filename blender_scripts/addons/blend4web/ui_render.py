import bpy
import imp
import mathutils
import math
import cProfile
import bgl

from . import server

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

class B4W_RenderReflRefr(RenderButtonsPanel, bpy.types.Panel):
    bl_label = "Reflections and Refractions"
    bl_idname = "RENDER_PT_b4w_refls_refrs"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        scene = context.scene

        layout = self.layout
        split = layout.split()
        col = split.column()
        col.prop(scene, "b4w_render_reflections", text="Reflections")
        row = col.row()
        row.active = scene.b4w_render_reflections == "ON"
        row.prop(scene, "b4w_reflection_quality", text="Quality")
        col = split.column()
        col.prop(scene, "b4w_render_refractions", text="Refractions")

class B4W_RenderMotionBlur(RenderButtonsPanel, bpy.types.Panel):
    bl_label = "Motion Blur"
    bl_idname = "RENDER_PT_b4w_MotionBlur"
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        self.layout.prop(context.scene, "b4w_enable_motion_blur", text="")

    def draw(self, context):
        scene = context.scene
        motion_blur = scene.b4w_motion_blur_settings

        layout = self.layout
        layout.active = getattr(scene, "b4w_enable_motion_blur")

        layout.prop(motion_blur, "motion_blur_factor", text="Factor")
        layout.prop(motion_blur, "motion_blur_decay_threshold",
                                                       text="Decay Threshold")

class B4W_RenderBloom(RenderButtonsPanel, bpy.types.Panel):
    bl_label = "Bloom"
    bl_idname = "RENDER_PT_b4w_Bloom"
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        self.layout.prop(context.scene, "b4w_enable_bloom", text="")

    def draw(self, context):
        scene = context.scene
        bloom = scene.b4w_bloom_settings

        layout = self.layout
        layout.active = getattr(scene, "b4w_enable_bloom")

        layout.prop(bloom, "key", text="Key")
        layout.prop(bloom, "blur", text="Blur")
        layout.prop(bloom, "edge_lum", text="Edge Luminance")

class B4W_RenderColorCorrection(RenderButtonsPanel, bpy.types.Panel):
    bl_label = "Color Correction"
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
        row.prop(ccs, "brightness", text="Brightness")
        row.prop(ccs, "contrast", text="Contrast")

        row = layout.row()
        row.prop(ccs, "exposure", text="Exposure")
        row.prop(ccs, "saturation", text="Saturation")

class B4W_RenderGlow(RenderButtonsPanel, bpy.types.Panel):
    bl_label = "Glow Materials"
    bl_idname = "RENDER_PT_b4w_GlowMats"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        scene = context.scene
        glow = scene.b4w_glow_settings

        layout = self.layout
        row = layout.row()
        row.prop(scene, "b4w_enable_glow_materials", text="Enable")

        panel_active = getattr(scene, "b4w_enable_glow_materials") in {"ON", "AUTO"}

        row = layout.row()
        row.active = panel_active
        row.label("Small Mask:")
        row = layout.row()
        row.active = panel_active
        col = row.column()
        col.prop(glow, "small_glow_mask_coeff", text="Intensity")
        col = row.column()
        col.prop(glow, "small_glow_mask_width", text="Width")

        row = layout.row()
        row.active = panel_active
        row.label("Large Mask:")
        row = layout.row()
        col = row.column()
        col.prop(glow, "large_glow_mask_coeff", text="Intensity")
        col = row.column()
        col.prop(glow, "large_glow_mask_width", text="Width")

        row = layout.row()
        row.active = panel_active
        row.prop(glow, "render_glow_over_blend", text="Render Glow Over Transparent Objects")

class B4W_RenderOutlining(RenderButtonsPanel, bpy.types.Panel):
    bl_label = "Object Outlining"
    bl_idname = "RENDER_PT_b4w_outlining"

    def draw(self, context):
        scene = context.scene

        layout = self.layout
        layout.prop(context.scene, "b4w_enable_outlining", text="Enable")

        row = layout.row()
        row.active = getattr(scene, "b4w_enable_outlining") in {"ON", "AUTO"}

        split = row.split()
        split.prop(scene, "b4w_outline_color", text="")
        split = row.split()
        split.prop(scene, "b4w_outline_factor", text="Factor")

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

        layout.prop(ssao, "radius_increase", text="Radius Increase")
        layout.prop(ssao, "hemisphere", text="Use Hemisphere")
        layout.prop(ssao, "blur_depth", text="Use Blur Depth Test")
        layout.prop(ssao, "blur_discard_value", text="Blur Depth Test Discard Value")
        layout.prop(ssao, "influence", text="Influence")
        layout.prop(ssao, "dist_factor", text="Distance Factor")

        row = layout.row()
        row.label("Samples:")
        row.prop(ssao, "samples", text="Samples", expand=True)

class B4W_RenderGodRays(RenderButtonsPanel, bpy.types.Panel):
    bl_label = "God Rays"
    bl_idname = "RENDER_PT_b4w_GodRays"
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        self.layout.prop(context.scene, "b4w_enable_god_rays", text="")

    def draw(self, context):
        scene = context.scene
        god_rays = scene.b4w_god_rays_settings

        layout = self.layout
        layout.active = getattr(scene, "b4w_enable_god_rays")

        layout.prop(god_rays, "intensity", text="Intensity")
        layout.prop(god_rays, "max_ray_length", text="Maximum Ray Length")
        layout.prop(god_rays, "steps_per_pass", text="Steps per Pass")

class B4W_RenderAntialiasing(RenderButtonsPanel, bpy.types.Panel):
    bl_label = "Antialiasing"
    bl_idname = "RENDER_PT_b4w_antialiasing"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        scene = context.scene

        layout = self.layout
        layout.prop(scene, "b4w_enable_antialiasing", text="Enable Antialiasing")

class B4W_SceneAniso(RenderButtonsPanel, bpy.types.Panel):
    bl_label = "Anisotropic Filtering"
    bl_idname = "RENDER_PT_b4w_nla"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene = context.scene
        layout.prop(scene, "b4w_anisotropic_filtering", text="")

class B4W_RenderShadows(RenderButtonsPanel, bpy.types.Panel):
    bl_label = "Shadows"
    bl_idname = "RENDER_PT_b4w_shadows"

    def draw(self, context):
        scene = context.scene
        shadow = scene.b4w_shadow_settings

        layout = self.layout

        layout.prop(scene, "b4w_render_shadows", text="Render Shadows")

        col = layout.column()
        col.active = scene.b4w_render_shadows in {"ON", "AUTO"}
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


class B4W_RenderDevServer(RenderButtonsPanel, bpy.types.Panel):
    bl_label = "Development Server"
    bl_idname = "RENDER_PT_b4w_server"

    def draw(self, context):
        layout = self.layout
        if server.has_valid_sdk_dir():
            is_started = server.B4WLocalServer.get_server_status() == server.SUB_THREAD_START_SERV_OK
            is_waiting_for_shutdown = server.B4WLocalServer.is_waiting_for_shutdown()
            allow_actions = server.B4WLocalServer.allow_actions()

            if is_started:
                layout.label(text = ("Development server is running."))
            elif is_waiting_for_shutdown:
                layout.label(text = ("Stopping server..."))
            else:
                layout.label(text = ("Development server is down."))

            if allow_actions:
                if is_started:
                    layout.operator("b4w.stop_server", text="Stop", icon="PAUSE")
                elif not is_waiting_for_shutdown:
                    layout.operator("b4w.start_server", text="Start", icon="PLAY")
            else:
                layout.label(text = ("Server actions are available in the other Blender instance."))

            if is_started:
                layout.operator("b4w.open_sdk", text="Open SDK", icon="URL")

        else:
            layout.label(text = ("Blend4Web SDK was not found."))

class B4W_RenderTimeline(RenderButtonsPanel, bpy.types.Panel):
    bl_label = "Timeline"
    bl_idname = "RENDER_PT_b4w_timeline"

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
        sub.label(text="Frame Range:")
        sub.prop(scene, "frame_start")
        sub.prop(scene, "frame_end")

        sub.label(text="Frame Rate:")

        self.draw_framerate(sub, rd)

def register():
    bpy.utils.register_class(B4W_RenderDevServer)
    bpy.utils.register_class(B4W_RenderTimeline)
    bpy.utils.register_class(B4W_RenderShadows)
    bpy.utils.register_class(B4W_RenderOutlining)
    bpy.utils.register_class(B4W_RenderReflRefr)
    bpy.utils.register_class(B4W_RenderGlow)
    bpy.utils.register_class(B4W_RenderSSAO)
    bpy.utils.register_class(B4W_RenderGodRays)
    bpy.utils.register_class(B4W_RenderBloom)
    bpy.utils.register_class(B4W_RenderMotionBlur)
    bpy.utils.register_class(B4W_RenderColorCorrection)
    bpy.utils.register_class(B4W_SceneAniso)
    bpy.utils.register_class(B4W_RenderAntialiasing)

def unregister():
    bpy.utils.unregister_class(B4W_RenderDevServer)
    bpy.utils.unregister_class(B4W_RenderTimeline)
    bpy.utils.unregister_class(B4W_RenderShadows)
    bpy.utils.unregister_class(B4W_RenderOutlining)
    bpy.utils.unregister_class(B4W_RenderReflRefr)
    bpy.utils.unregister_class(B4W_RenderGlow)
    bpy.utils.unregister_class(B4W_RenderSSAO)
    bpy.utils.unregister_class(B4W_RenderGodRays)
    bpy.utils.unregister_class(B4W_RenderBloom)
    bpy.utils.unregister_class(B4W_RenderMotionBlur)
    bpy.utils.unregister_class(B4W_RenderColorCorrection)
    bpy.utils.unregister_class(B4W_SceneAniso)
    bpy.utils.unregister_class(B4W_RenderAntialiasing)

