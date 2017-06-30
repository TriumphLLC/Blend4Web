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

class B4W_RemoveConstraint(bpy.types.Operator):
    '''Remove constraint from object or bone'''
    bl_idname = "b4w.remove_constraint"
    bl_label = p_("Remove Constraint", "Operator")
    bl_options = {"INTERNAL"}

    cons_name = bpy.props.StringProperty(name="Constraint")

    def execute(self, context):

        container = context.object
        bone = context.active_pose_bone

        if bone:
            container = bone

        constraint = None

        for c in container.constraints:
            if c.name == self.cons_name:
                constraint = c
                break

        if constraint:
            container.constraints.remove(constraint)

        return {'FINISHED'}

class CustomConstraintsPanel(bpy.types.OBJECT_PT_constraints):
    COMPAT_ENGINES = ['BLEND4WEB']

    @classmethod
    def poll(cls, context):
        return render_engine.base_poll(cls,context)

    def draw_constraint(self, context, cons):

        layout = self.layout

        if cons.type == "LOCKED_TRACK" and cons.name == "REFLECTION PLANE":
            box = layout.box()
            box.label(get_translate(_("LOCKED_TRACK constraint reserved for ")) + cons.name)

        elif (cons.type == "RIGID_BODY_JOINT" or cons.type == "COPY_LOCATION"
                    or cons.type == "COPY_ROTATION" or cons.type == "COPY_TRANSFORMS"
                    or cons.type == "TRACK_TO"):
            bpy.types.OBJECT_PT_constraints_new.draw_constraint(self, context, cons)

        else:
            obj = context.object
            box = layout.box()
            box.label(cons.name + get_translate(_(" constraint is not supported.")), icon="ERROR")
            box.operator("b4w.remove_constraint", text=_("Remove"), icon='PANEL_CLOSE').cons_name = cons.name

class CustomBoneConstraintsPanel(bpy.types.BONE_PT_constraints):
    COMPAT_ENGINES = ['BLEND4WEB']

    @classmethod
    def poll(cls, context):
        return render_engine.base_poll(cls,context)

    def draw_constraint(self, context, cons):

        layout = self.layout

        if cons.type == 'COPY_TRANSFORMS':
            bpy.types.BONE_PT_constraints_new.draw_constraint(self, context, cons)

        else:
            obj = context.object
            box = layout.box()
            box.label(cons.name + get_translate(_(" constraint is not supported.")), icon="ERROR")
            box.operator("b4w.remove_constraint", text=_("Remove"), icon='PANEL_CLOSE').cons_name = cons.name


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
