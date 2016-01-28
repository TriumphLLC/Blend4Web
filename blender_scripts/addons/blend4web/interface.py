import bpy
import mathutils
import math
import os
import cProfile
import bgl

import blend4web
b4w_modules = [
    "render_engine",
    "ui_render",
    "ui_layers",
    "ui_scene",
    "ui_world",
    "ui_object",
    "ui_data",
    "ui_material",
    "ui_texture",
    "ui_particle",
    "ui_physics",
    "ui_view3d_ht_header",
    "translator"
]

for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_, get_translate
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

            box.label(get_translate(_("LOCKED_TRACK constraint reserved for ")) + con.name)

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
    ui_view3d_ht_header.register()

def unregister():
    ui_view3d_ht_header.unregister()