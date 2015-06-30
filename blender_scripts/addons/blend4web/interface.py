import bpy
import mathutils
import math
import os
import cProfile
import bgl

from . import render_engine
from . import ui_render
from . import ui_layers
from . import ui_scene
from . import ui_world
from . import ui_object
from . import ui_data
from . import ui_material
from . import ui_texture
from . import ui_particle
from . import ui_physics

# serialize data to json

def get_locked_track_constraint(obj, index):
    constraint_index = 0
    for cons in obj.constraints:
        if cons.type == "LOCKED_TRACK":
            if constraint_index == index:
                return cons
            constraint_index += 1

class CustomConstraintsPanel(bpy.types.OBJECT_PT_constraints):
    COMPAT_ENGINES = ['BLEND4WEB']

    @classmethod
    def poll(cls, context):
        return render_engine.base_poll(cls,context)

    def draw_constraint(self, context, con):

        if con.type == "LOCKED_TRACK":

            layout = self.layout
            box = layout.box()

            box.label("LOCKED_TRACK constraint reserved for " + con.name)

        else:
            bpy.types.OBJECT_PT_constraints_new.draw_constraint(self, context, con)

def add_remove_refl_plane(obj):
    if obj.b4w_reflection_type == "PLANE" and obj.b4w_reflective:
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
    ui_render.register()
    ui_layers.register()
    ui_scene.register()
    ui_world.register()
    ui_object.register()
    ui_data.register()
    ui_material.register()
    ui_texture.register()
    ui_particle.register()
    ui_physics.register()

    bpy.utils.register_class(CustomConstraintsPanel)

def unregister():
    ui_render.unregister()
    ui_layers.unregister()
    ui_scene.unregister()
    ui_world.unregister()
    ui_object.unregister()
    ui_data.unregister()
    ui_material.unregister()
    ui_texture.unregister()
    ui_particle.unregister()
    ui_physics.unregister()

    bpy.utils.unregister_class(CustomConstraintsPanel)
