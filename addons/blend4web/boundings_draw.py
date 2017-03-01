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
import bgl
from bpy.types import Panel
from rna_prop_ui import PropertyPanel
import blend4web

b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_

_draw_handler = None

##########################################################
# draw UI Buttons
class B4W_BoundingsDrawUI(bpy.types.Panel):
    bl_idname = _('Override Bounding Volumes')
    bl_label = _('Override Bounding Volumes')
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'TOOLS'
    bl_category = 'Blend4Web'
    bl_options = {'DEFAULT_CLOSED'}

    def __init__(self):
        pass

    @classmethod
    def poll(self, context):
        try:
            ob = context.active_object
            return (ob.type == 'MESH')
        except AttributeError:
            return 0

    def draw(self, context):

        layout = self.layout

        ob = context.active_object
        wm = context.window_manager
        msh = ob.data

        row = layout.row()
        row.label(text=_("Show Boundings:"))

        row = layout.row(align=True)
        row.prop(wm, 'b4w_draw_bound_box', text=_('Boxes'), toggle=True)
        row.prop(wm, 'b4w_draw_bound_sphere', text=_('Spheres'), toggle=True)
        row.prop(wm, 'b4w_draw_bound_ellipsoid', text=_('Ellipsoids'), toggle=True)

        sep = layout.separator()

        self.layout.prop(msh, "b4w_override_boundings", text=_("Override Mesh Boundings"), toggle=True)
        boundings = msh.b4w_boundings

        row = layout.row(align=True)
        row.active = msh.b4w_override_boundings
        row.prop(boundings, "min_x", text=_("Min X"))
        row.prop(boundings, "max_x", text=_("Max X"))
        row = layout.row(align=True)
        row.active = msh.b4w_override_boundings
        row.prop(boundings, "min_y", text=_("Min Y"))
        row.prop(boundings, "max_y", text=_("Max Y"))
        row = layout.row(align=True)
        row.active = msh.b4w_override_boundings
        row.prop(boundings, "min_z", text=_("Min Z"))
        row.prop(boundings, "max_z", text=_("Max Z"))

def draw_boundings(self, context):
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and obj.data.b4w_override_boundings:

            bounding_box = obj.data.b4w_boundings

            min_x = bounding_box.min_x
            max_x = bounding_box.max_x
            min_y = bounding_box.min_y
            max_y = bounding_box.max_y
            min_z = bounding_box.min_z
            max_z = bounding_box.max_z

            x_width = max_x - min_x
            y_width = max_y - min_y
            z_width = max_z - min_z

            cen = [0]*3
            cen[0] = (max_x + min_x) / 2
            cen[1] = (max_y + min_y) / 2
            cen[2] = (max_z + min_z) / 2

            wm = obj.matrix_world

            if context.window_manager.b4w_draw_bound_box:
                bgl.glEnable(bgl.GL_BLEND)
                bgl.glLineWidth(2)
                # set colour
                bgl.glColor4f(0.5,1.0,1.0,1.0) 

                # draw boundings
                bgl.glBegin(bgl.GL_LINE_STRIP)
                co = mathutils.Vector((min_x,min_y,min_z))
                co = wm * co
                bgl.glVertex3f(co[0], co[1], co[2])
                co = mathutils.Vector((max_x,min_y,min_z))
                co = wm * co
                bgl.glVertex3f(co[0], co[1], co[2])
                co = mathutils.Vector((max_x,max_y,min_z))
                co = wm * co
                bgl.glVertex3f(co[0], co[1], co[2])
                co = mathutils.Vector((min_x,max_y,min_z))
                co = wm * co
                bgl.glVertex3f(co[0], co[1], co[2])
                bgl.glEnd()

                bgl.glBegin(bgl.GL_LINE_STRIP)
                co = mathutils.Vector((min_x,min_y,max_z))
                co = wm * co
                bgl.glVertex3f(co[0], co[1], co[2])
                co = mathutils.Vector((min_x,min_y,min_z))
                co = wm * co
                bgl.glVertex3f(co[0], co[1], co[2])
                co = mathutils.Vector((min_x,max_y,min_z))
                co = wm * co
                bgl.glVertex3f(co[0], co[1], co[2])
                co = mathutils.Vector((min_x,max_y,max_z))
                co = wm * co
                bgl.glVertex3f(co[0], co[1], co[2])
                bgl.glEnd()

                bgl.glBegin(bgl.GL_LINE_STRIP)
                co = mathutils.Vector((max_x,min_y,max_z))
                co = wm * co
                bgl.glVertex3f(co[0], co[1], co[2])
                co = mathutils.Vector((min_x,min_y,max_z))
                co = wm * co
                bgl.glVertex3f(co[0], co[1], co[2])
                co = mathutils.Vector((min_x,max_y,max_z))
                co = wm * co
                bgl.glVertex3f(co[0], co[1], co[2])
                co = mathutils.Vector((max_x,max_y,max_z))
                co = wm * co
                bgl.glVertex3f(co[0], co[1], co[2])
                bgl.glEnd()

                bgl.glBegin(bgl.GL_LINE_STRIP)
                co = mathutils.Vector((max_x,max_y,min_z))
                co = wm * co
                bgl.glVertex3f(co[0], co[1], co[2])
                co = mathutils.Vector((max_x,max_y,max_z))
                co = wm * co
                bgl.glVertex3f(co[0], co[1], co[2])
                co = mathutils.Vector((max_x,min_y,max_z))
                co = wm * co
                bgl.glVertex3f(co[0], co[1], co[2])
                co = mathutils.Vector((max_x,min_y,min_z))
                co = wm * co
                bgl.glVertex3f(co[0], co[1], co[2])
                bgl.glEnd()
                bgl.glLineWidth(1)

            if context.window_manager.b4w_draw_bound_sphere:
                #draw spehere
                bgl.glColor4f(1.0,0.5,1.0,1.0)

                r = math.sqrt(x_width*x_width + y_width*y_width + z_width*z_width) / 2
                draw_elipse(cen, r, (1, 0, 0), 1, wm)
                draw_elipse(cen, r, (0, 1, 0), 1, wm)
                draw_elipse(cen, r, (0, 0, 1), 1, wm)

                bgl.glDisable(bgl.GL_BLEND)

            if context.window_manager.b4w_draw_bound_ellipsoid:

                #draw ellipsoid
                bgl.glColor4f(1.0,1.0,0.5,1.0)

                sq3 = math.sqrt(3) / 2

                draw_elipse(cen, sq3*z_width, (1, 0, 0), y_width/z_width, wm)
                draw_elipse(cen, sq3*x_width, (0, 1, 0), z_width/x_width, wm)
                draw_elipse(cen, sq3*x_width, (0, 0, 1), y_width/x_width, wm)

                bgl.glDisable(bgl.GL_BLEND)

def draw_elipse(cen, r, axis, xy_ratio, mat):

    base_axis = mathutils.Vector((0, 0, 1))
    axis = mathutils.Vector(axis)

    dot = base_axis.dot(axis)
    cross = base_axis.cross(axis)

    rot_mat = mathutils.Matrix.Rotation(math.acos(dot), 4, cross)

    bgl.glBegin(bgl.GL_LINE_STRIP)

    iterations = 32
    for i in range (iterations + 1):
        i = (1 if i == iterations + 1 else i)
        i *= 2 * math.pi / iterations
        co = (math.cos(i) * r, math.sin(i) * r * xy_ratio, 0)
        co = mathutils.Vector(co)

        co = rot_mat * co

        co[0] += cen[0]
        co[1] += cen[1]
        co[2] += cen[2]

        co = mat * co
        bgl.glVertex3f(co[0], co[1], co[2])

    bgl.glEnd()

def update_view3d_area():
    for area in bpy.context.window.screen.areas:
        if area.type == 'VIEW_3D':
            area.tag_redraw()

def switch_boundings_draw(self, context):
    global _draw_handler
    wm = context.window_manager
    if wm.b4w_draw_bound_box or wm.b4w_draw_bound_sphere or \
                                wm.b4w_draw_bound_ellipsoid:
        _draw_handler = bpy.types.SpaceView3D.draw_handler_add(draw_boundings,
                                    (self, context), 'WINDOW', 'POST_VIEW')
    else:
        bpy.types.SpaceView3D.draw_handler_remove(_draw_handler, 'WINDOW')


def init_properties():
    bpy.types.WindowManager.b4w_draw_bound_box = bpy.props.BoolProperty(
        name = _("B4W: draw bounding box"),
        default = False,
        update = switch_boundings_draw
        )

    bpy.types.WindowManager.b4w_draw_bound_sphere = bpy.props.BoolProperty(
        name = _("B4W: draw bounding sphere"),
        default = False,
        update = switch_boundings_draw
        )

    bpy.types.WindowManager.b4w_draw_bound_ellipsoid = bpy.props.BoolProperty(
        name = _("B4W: draw bounding ellipsoid"),
        default = False,
        update = switch_boundings_draw
        )

def clear_properties():
    props = ['b4w_draw_bound_box', 'b4w_draw_bound_sphere', 'b4w_draw_bound_ellipsoid']
    for p in props:
        if bpy.context.window_manager.get(p) != None:
            del bpy.context.window_manager[p]
        try:
            x = getattr(bpy.types.WindowManager, p)
            del x
        except:
            pass

def register():
    init_properties()

def unregister():
    clear_properties()

