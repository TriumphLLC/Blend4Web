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

class B4W_RenderLayers(Panel):
    bl_label = _("Render Layers")
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "render_layer"
    bl_options = {'HIDE_HEADER'}

    @classmethod
    def poll(cls, context):
        return context.scene.render.engine == "BLEND4WEB"

    def draw(self, context):
        layout = self.layout
        layout.label(text=_("Not available in Blend4Web"))

