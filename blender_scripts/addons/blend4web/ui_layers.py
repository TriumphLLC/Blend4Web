import bpy
import imp
import mathutils
import math
import os
import cProfile
import bgl

from bpy.types import Panel

class B4W_RenderLayers(Panel):
    bl_label = "Render Layers"
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "render_layer"
    bl_options = {'HIDE_HEADER'}

    @classmethod
    def poll(cls, context):
        return context.scene.render.engine == "BLEND4WEB"

    def draw(self, context):
        layout = self.layout
        layout.label(text="Not available in Blend4Web")

def register():
    bpy.utils.register_class(B4W_RenderLayers)

def unregister():
    bpy.utils.unregister_class(B4W_RenderLayers)
