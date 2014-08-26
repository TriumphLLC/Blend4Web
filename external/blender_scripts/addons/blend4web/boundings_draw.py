import bpy
import mathutils
import math
import bgl
from bpy.types import Panel
from rna_prop_ui import PropertyPanel


##########################################################
# draw UI Buttons
class B4W_BoundingsDrawUI(bpy.types.Panel):
    bl_idname = "Draw Overrided bounding boxes"
    bl_label = 'B4W Bounding Box Draw'
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'TOOLS'
    bl_category = "Blend4Web"

    def __init__(self):
        pass

    @classmethod
    def poll(self, context):
        try:
            ob = context.active_object
            mode = context.mode
            return (ob.type == 'MESH')
        except AttributeError:
            return 0

    def draw(self, context):

        layout = self.layout
        row = layout.row()

        wm = context.window_manager

        if wm.b4w_draw_boundings:
            if wm.b4w_draw_boundings == True:
                row.operator('mesh.draw_boundings', text = 'Hide Bounding Box').processed_att = "b4w_draw_boundings"
            elif wm.b4w_draw_boundings == False:
                row.operator('mesh.draw_boundings', text = 'Show Bounding Box').processed_att = "b4w_draw_boundings"
        else:
            row.operator('mesh.draw_boundings', text = 'Show Bounding Box').processed_att = "b4w_draw_boundings"

        row = layout.row()
        if wm.b4w_draw_bound_sphere:
            if wm.b4w_draw_bound_sphere == True:
                row.operator('mesh.draw_boundings', text = 'Hide Bounding Sphere').processed_att = "b4w_draw_bound_sphere"
            elif wm.b4w_draw_bound_sphere == False:
                row.operator('mesh.draw_boundings', text = 'Show Bounding Sphere').processed_att = "b4w_draw_bound_sphere"
        else:
            row.operator('mesh.draw_boundings', text = 'Show Bounding Sphere').processed_att = "b4w_draw_bound_sphere"

        row = layout.row()
        if wm.b4w_draw_bound_ellipsoid:
            if wm.b4w_draw_bound_ellipsoid == True:
                row.operator('mesh.draw_boundings', text = 'Hide Bounding Ellipsoid').processed_att = "b4w_draw_bound_ellipsoid"
            elif wm.b4w_draw_bound_ellipsoid == False:
                row.operator('mesh.draw_boundings', text = 'Show Bounding Ellipsoid').processed_att = "b4w_draw_bound_ellipsoid"
        else:
            row.operator('mesh.draw_boundings', text = 'Show Bounding Ellipsoid').processed_att = "b4w_draw_bound_ellipsoid"

def InitGLOverlay(self, context):

    obj = context.active_object

    if obj != None and obj.type == 'MESH' and obj.data.b4w_override_boundings:

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

        if context.window_manager.b4w_draw_boundings:
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

        if context.window_manager.b4w_draw_bound_sphere:
            #draw spehere
            bgl.glLineWidth(1)
            bgl.glColor4f(1.0,0.5,1.0,1.0) 

            r = math.sqrt(x_width*x_width + y_width*y_width + z_width*z_width) / 2
            draw_elipse(cen, r, (1, 0, 0), 1, wm)
            draw_elipse(cen, r, (0, 1, 0), 1, wm)
            draw_elipse(cen, r, (0, 0, 1), 1, wm)

            bgl.glDisable(bgl.GL_BLEND)

        if context.window_manager.b4w_draw_bound_ellipsoid:

            #draw ellipsoid
            bgl.glLineWidth(1)
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

class B4W_DrawBoundings(bpy.types.Operator):
    bl_idname = 'mesh.draw_boundings'
    bl_label = 'draw_boundings'
    bl_description = 'Draw boundings in object mode'
    _handle = None
    processed_att = bpy.props.StringProperty()

    def modal(self, context, event):
        if not (context.window_manager.b4w_draw_boundings or
                context.window_manager.b4w_draw_bound_sphere or
                context.window_manager.b4w_draw_bound_ellipsoid):
            update_view3d_area()
            bpy.types.SpaceView3D.draw_handler_remove(self._handle, 'WINDOW')
            return {'CANCELLED'}
        return {'PASS_THROUGH'}

    def cancel(self, context):
        if (    context.window_manager.b4w_draw_boundings or
                context.window_manager.b4w_draw_bound_sphere or
                context.window_manager.b4w_draw_bound_ellipsoid):
            context.window_manager.b4w_draw_boundings = False
            context.window_manager.b4w_draw_bound_sphere = False
            context.window_manager.b4w_draw_bound_ellipsoid = False
            bpy.types.SpaceView3D.draw_handler_remove(self._handle, 'WINDOW')

        return {'CANCELLED'}

    def invoke(self, context, event):

        at = getattr(context.window_manager, self.processed_att)
        if (    context.window_manager.b4w_draw_boundings == False and
                context.window_manager.b4w_draw_bound_sphere == False and
                context.window_manager.b4w_draw_bound_ellipsoid == False):


            setattr(context.window_manager, self.processed_att, not at)
            self._handle = bpy.types.SpaceView3D.draw_handler_add(InitGLOverlay, (self, context), 'WINDOW', 'POST_VIEW')
            context.window_manager.modal_handler_add(self)
            update_view3d_area()
            return {'RUNNING_MODAL'}
        else:
            setattr(context.window_manager, self.processed_att, not at)
            update_view3d_area()
            return {'CANCELLED'}

def update_view3d_area():
    for area in bpy.context.window.screen.areas:
        if area.type == 'VIEW_3D':
            area.tag_redraw()

def init_properties():
    bpy.types.WindowManager.b4w_draw_boundings = bpy.props.BoolProperty(
        name = "B4W: draw boundings",
        default = False,
        )

    bpy.types.WindowManager.b4w_draw_bound_sphere = bpy.props.BoolProperty(
        name = "B4W: draw bound sphere",
        default = False,
        )

    bpy.types.WindowManager.b4w_draw_bound_ellipsoid = bpy.props.BoolProperty(
        name = "B4W: draw bound ellipsoid",
        default = False,
        )

def clear_properties():
    props = ['b4w_draw_boundings', 'b4w_draw_bound_sphere', 'b4w_draw_bound_ellipsoid']
    for p in props:
        if bpy.context.window_manager.get(p) != None:
            del bpy.context.window_manager[p]
        try:
            x = getattr(bpy.types.WindowManager, p)
            del x
        except:
            pass

def register():

    bpy.utils.register_class(B4W_BoundingsDrawUI)
    bpy.utils.register_class(B4W_DrawBoundings)

    init_properties()

def unregister():

    bpy.utils.unregister_class(B4W_BoundingsDrawUI)
    bpy.utils.unregister_class(B4W_DrawBoundings)

    clear_properties()

