# ##### BEGIN GPL LICENSE BLOCK #####
#
#  This program is free software; you can redistribute it and/or
#  modify it under the terms of the GNU General Public License
#  as published by the Free Software Foundation; either version 2
#  of the License, or (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program; if not, write to the Free Software Foundation,
#  Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
#
# ##### END GPL LICENSE BLOCK #####

# <pep8 compliant>

bl_info = {
    "name": "Screencast Keys",
    "author": "Paulo Gomes, Bart Crouch, John E. Herrenyo, Gaia Clary, Pablo Vazquez",
    "version": (1, 7),
    "blender": (2, 66, 0),
    "location": "3D View > Properties Panel > Screencast Keys",
    "warning": "",
    "description": "Display keys pressed in the 3D View, "
                   "useful for screencasts.",
    "wiki_url": "http://wiki.blender.org/index.php/Extensions:2.6/"
                "Py/Scripts/3D_interaction/Screencast_Key_Status_Tool",
    "tracker_url": "http://projects.blender.org/tracker/index.php?"
                   "func=detail&aid=21612",
    "category": "3D View"}

import bgl
import blf
import bpy
import time
import datetime


MOUSE_RATIO = 0.535


def getDisplayLocation(context):
    scene   = context.scene
    mouse_size = scene.screencast_keys_mouse_size

    pos_x = int( (context.region.width  - mouse_size * MOUSE_RATIO) * \
        scene.screencast_keys_pos_x / 100)
    pos_y = int( (context.region.height - mouse_size) *
        scene.screencast_keys_pos_y / 100)

    return(pos_x, pos_y)


def getBoundingBox(current_width, current_height, new_text):
    w,h = blf.dimensions(0,new_text)
    if w > current_width:
        current_width = w
    current_height += h

    return(current_width, current_height)


def draw_callback_px_text(self, context):
    wm = context.window_manager
    sc = context.scene
    if not wm.screencast_keys_keys:
        return

    font_size  = sc.screencast_keys_font_size
    mouse_size = sc.screencast_keys_mouse_size
    box_draw   = sc.screencast_keys_box_draw
    pos_x, pos_y = getDisplayLocation(context)
    label_time_max = sc.screencast_keys_fade_time

    # draw text in the 3D View
    blf.size(0, sc.screencast_keys_font_size, 72)
    blf.enable(0, blf.SHADOW)
    blf.shadow_offset(0, 1, -1)
    blf.shadow(0, 5, 0.0, 0.0, 0.0, 0.8)

    font_color_r, font_color_g, font_color_b, font_color_alpha = sc.screencast_keys_text_color
    final = 0
    row_count = len(self.key)

    keypos_x = pos_x

    if sc.screencast_keys_mouse_position == 'left':
        keypos_x += mouse_size * MOUSE_RATIO * 1.7
    if sc.screencast_keys_mouse != 'icon':
        keypos_x -= mouse_size * MOUSE_RATIO
    if sc.screencast_keys_mouse_position == 'right' and sc.screencast_keys_mouse != 'icon':
        keypos_x = pos_x

    shift = 0

    # we want to make sure we can shift vertically the text if the mouse is big,
    # but don't care if aligned to right 
    if mouse_size > font_size*row_count and not sc.screencast_keys_mouse_position == 'right':
        shift = (mouse_size - font_size*row_count) / 2

    text_width, text_height = 0,0
    row_count = 0
    alpha = 1.0

    for i in range(len(self.key)):
        label_time = time.time() - self.time[i]
        if label_time < label_time_max: # only display key-presses of last 2 seconds
            if label_time > (label_time_max / 1.2):
                blf.blur(0, 1)
            if label_time > (label_time_max / 1.1):
                blf.blur(0, 3)
            keypos_y = pos_y + shift + font_size*(i+0.1)

            blf.position(0, keypos_x, keypos_y , 0)
            alpha = min(1.0, max(0.0, label_time_max * (label_time_max - label_time)))
            bgl.glColor4f(font_color_r, font_color_g, font_color_b, font_color_alpha * alpha)
            blf.draw(0, self.key[i])
            text_width, text_height = getBoundingBox(text_width, text_height,
                self.key[i])
            row_count += 1
            final = i + 1
        else:
            break

    # remove blurriness 

    # disable shadows so they don't appear all over blender
    blf.blur(0,0)
    blf.disable(0, blf.SHADOW)

    # get rid of status texts that aren't displayed anymore
    self.key = self.key[:final]
    self.time = self.time[:final]

    # draw graphical representation of the mouse
    if sc.screencast_keys_mouse == 'icon':
        for shape in ["mouse", "left_button", "middle_button", "right_button"]:
            draw_mouse(context, shape, "outline", font_color_alpha * 0.4)
        final = 0

        for i in range(len(self.mouse)):
            click_time = time.time() - self.mouse_time[i]
            if click_time < 2:
                shape = map_mouse_event(self.mouse[i])
                if shape:
                    alpha = min(1.0, max(0.0, 2 * (2 - click_time)))
                    draw_mouse(context, shape, "filled", alpha)
                final = i + 1
            else:
                break

    # get rid of mouse clicks that aren't displayed anymore
    self.mouse = self.mouse[:final]
    self.mouse_time = self.mouse_time[:final]

def draw_callback_px_box(self, context):
    wm = context.window_manager
    sc = context.scene

    if not wm.screencast_keys_keys:
        return

    font_size  = sc.screencast_keys_font_size
    mouse_size = sc.screencast_keys_mouse_size

    if sc.screencast_keys_mouse_position == 'right':
        mouse_size = 25

    box_draw   = sc.screencast_keys_box_draw
    pos_x, pos_y = getDisplayLocation(context)

    # get text-width/height to resize the box
    blf.size(0, sc.screencast_keys_font_size, 72)
    box_width, box_height = sc.screencast_keys_box_width,0
    final = 0
    row_count = 0
    box_hide = sc.screencast_keys_box_hide
    label_time_max = sc.screencast_keys_fade_time

    for i in range(len(self.key)):
        label_time = time.time() - self.time[i]

        if label_time < label_time_max: # only display key-presses of last 4 seconds
            box_width, box_height = getBoundingBox(box_width, box_height, self.key[i])
            row_count += 1
            final = i + 1
            box_hide = False
        else:
            break

    # Got the size right, now draw box using proper colors
    box_color_r, box_color_g, box_color_b, box_color_alpha = sc.screencast_keys_box_color

    if box_draw and not box_hide:
        padding_x = 16
        padding_y = 12
        x0 = max(0, pos_x - padding_x)
        y0 = max(0, pos_y - padding_y)
        x1 = pos_x + box_width + mouse_size * MOUSE_RATIO * 1.3 + padding_x
        y1 = pos_y + max(mouse_size, font_size * row_count) + padding_y
        positions = [[x0, y0], [x0, y1], [x1, y1], [x1, y0]]
        settings = [[bgl.GL_QUADS, min(0.0, box_color_alpha)], [bgl.GL_LINE_LOOP, min(0.0, box_color_alpha)]]

        for mode, box_alpha in settings:
            bgl.glEnable(bgl.GL_BLEND)
            bgl.glBegin(mode)
            bgl.glColor4f(box_color_r, box_color_g, box_color_b, box_color_alpha)
            for v1, v2 in positions:
                bgl.glVertex2f(v1, v2)
            bgl.glEnd()

    if sc.screencast_keys_show_operator:
        draw_last_operator(context, pos_x, pos_y)

    if sc.screencast_keys_timer_show:
        draw_timer(context, pos_x, pos_y)

    # get rid of status texts that aren't displayed anymore
    self.key = self.key[:final]
    self.time = self.time[:final]


def draw_callback_px(self, context):
    draw_callback_px_text(self, context)
    draw_callback_px_box(self, context)


def draw_last_operator(context, pos_x, pos_y):

    wm = context.window_manager
    sc = context.scene
    font_color_r, font_color_g, font_color_b, font_color_alpha = sc.screencast_keys_text_color
    pos_x, pos_y = getDisplayLocation(context)

    if wm.operators:
        last_operator = wm.operators[-1].bl_label

        blf.enable(0, blf.SHADOW)
        blf.shadow_offset(0, 1, -1)
        blf.shadow(0, 5, 0.0, 0.0, 0.0, 0.8)
        blf.size(0, sc.screencast_keys_font_size, 36)
        blf.position(0, pos_x - 14, pos_y - 30, 0)
        bgl.glColor4f(font_color_r, font_color_g, font_color_b, font_color_alpha * 0.8)
        blf.draw(0, "Last: %s" % (last_operator))
        blf.disable(0, blf.SHADOW)

def draw_timer(context, pos_x, pos_y):

    sc = context.scene
    #calculate overall time
    overall_time = datetime.timedelta(seconds=int(time.time() - ScreencastKeysStatus.overall_time[0]))

    timer_color_r, timer_color_g, timer_color_b, timer_color_alpha = sc.screencast_keys_timer_color
    pos_x = context.region.width - (sc.screencast_keys_timer_size * 12) + 12
    pos_y = 10

    #draw time
    blf.size(0, sc.screencast_keys_timer_size, 72)
    blf.position(0, pos_x, pos_y, 0)
    bgl.glColor4f(timer_color_r, timer_color_g, timer_color_b, timer_color_alpha)
    blf.draw(0, "Elapsed Time: %s" % (overall_time))

def draw_mouse(context, shape, style, alpha):
    # shape and position
    sc   = context.scene
    mouse_size = sc.screencast_keys_mouse_size
    font_size  = sc.screencast_keys_font_size
    box_draw = sc.screencast_keys_box_draw

    pos_x, pos_y = getDisplayLocation(context)

    if sc.screencast_keys_mouse_position == 'left':
        offset_x = pos_x
    if sc.screencast_keys_mouse_position == 'right':
        offset_x = context.region.width - pos_x - (mouse_size * MOUSE_RATIO)

    offset_y = pos_y
    if font_size > mouse_size:
        offset_y += (font_size - mouse_size) / 2

    shape_data = get_shape_data(shape)

    bgl.glTranslatef(offset_x, offset_y, 0)

    # color
    r, g, b, a = sc.screencast_keys_text_color
    bgl.glEnable(bgl.GL_BLEND)
    bgl.glColor4f(r, g, b, alpha)

    # inner shape for filled style
    if style == "filled":
        inner_shape = []
        for i in shape_data:
            inner_shape.append(i[0])

    # outer shape
    for i in shape_data:
        shape_segment = i
        shape_segment[0] = [mouse_size * k for k in shape_segment[0]]
        shape_segment[1] = [mouse_size * k for k in shape_segment[1]]
        shape_segment[2] = [mouse_size * k for k in shape_segment[2]]
        shape_segment[3] = [mouse_size * k for k in shape_segment[3]]

        # create the buffer
        shape_buffer = bgl.Buffer(bgl.GL_FLOAT, [4, 3], shape_segment)

        # create the map and draw the triangle fan
        bgl.glMap1f(bgl.GL_MAP1_VERTEX_3, 0.0, 1.0, 3, 4, shape_buffer)
        bgl.glEnable(bgl.GL_MAP1_VERTEX_3)

        if style == "outline":
            bgl.glBegin(bgl.GL_LINE_STRIP)
        else: # style == "filled"
            bgl.glBegin(bgl.GL_TRIANGLE_FAN)
        for j in range(10):
            bgl.glEvalCoord1f(j / 10.0)
        x, y, z = shape_segment[3]

        # make sure the last vertex is indeed the last one, to avoid gaps
        bgl.glVertex3f(x, y, z)
        bgl.glEnd()
        bgl.glDisable(bgl.GL_MAP1_VERTEX_3)

    # draw interior
    if style == "filled":
        bgl.glBegin(bgl.GL_TRIANGLE_FAN)
        for i in inner_shape:
            j = [mouse_size * k for k in i]
            x, y, z = j
            bgl.glVertex3f(x, y, z)
        bgl.glEnd()

    bgl.glTranslatef(-offset_x, -offset_y, 0)

# hardcoded data to draw the graphical represenation of the mouse
def get_shape_data(shape):
    data = []
    if shape == "mouse":
        data = [[[0.404, 0.032, 0.0],
            [0.096, 0.002, 0.0],
            [0.059, 0.126, 0.0],
            [0.04, 0.213, 0.0]],
            [[0.04, 0.213, 0.0],
            [-0.015, 0.465, 0.0],
            [-0.005, 0.564, 0.0],
            [0.032, 0.87, 0.0]],
            [[0.032, 0.87, 0.0],
            [0.05, 0.973, 0.0],
            [0.16, 1.002, 0.0],
            [0.264, 1.002, 0.0]],
            [[0.264, 1.002, 0.0],
            [0.369, 1.002, 0.0],
            [0.478, 0.973, 0.0],
            [0.497, 0.87, 0.0]],
            [[0.497, 0.87, 0.0],
            [0.533, 0.564, 0.0],
            [0.554, 0.465, 0.0],
            [0.499, 0.213, 0.0]],
            [[0.499, 0.213, 0.0],
            [0.490, 0.126, 0.0],
            [0.432, 0.002, 0.0],
            [0.404, 0.032, 0.0]]]
    elif shape == "left_button":
        data = [[[0.154, 0.763, 0.0],
            [0.126, 0.755, 0.0],
            [0.12, 0.754, 0.0],
            [0.066, 0.751, 0.0]],
            [[0.066, 0.751, 0.0],
            [0.043, 0.75, 0.0],
            [0.039, 0.757, 0.0],
            [0.039, 0.767, 0.0]],
            [[0.039, 0.767, 0.0],
            [0.047, 0.908, 0.0],
            [0.078, 0.943, 0.0],
            [0.155, 0.97, 0.0]],
            [[0.155, 0.97, 0.0],
            [0.174, 0.977, 0.0],
            [0.187, 0.975, 0.0],
            [0.191, 0.972, 0.0]],
            [[0.191, 0.972, 0.0],
            [0.203, 0.958, 0.0],
            [0.205, 0.949, 0.0],
            [0.199, 0.852, 0.0]],
            [[0.199, 0.852, 0.0],
            [0.195, 0.77, 0.0],
            [0.18, 0.771, 0.0],
            [0.154, 0.763, 0.0]]]
    elif shape == "middle_button":
        data = [[[0.301, 0.8, 0.0],
            [0.298, 0.768, 0.0],
            [0.231, 0.768, 0.0],
            [0.228, 0.8, 0.0]],
            [[0.228, 0.8, 0.0],
            [0.226, 0.817, 0.0],
            [0.225, 0.833, 0.0],
            [0.224, 0.85, 0.0]],
            [[0.224, 0.85, 0.0],
            [0.222, 0.873, 0.0],
            [0.222, 0.877, 0.0],
            [0.224, 0.9, 0.0]],
            [[0.224, 0.9, 0.0],
            [0.225, 0.917, 0.0],
            [0.226, 0.933, 0.0],
            [0.228, 0.95, 0.0]],
            [[0.228, 0.95, 0.0],
            [0.231, 0.982, 0.0],
            [0.298, 0.982, 0.0],
            [0.301, 0.95, 0.0]],
            [[0.301, 0.95, 0.0],
            [0.302, 0.933, 0.0],
            [0.303, 0.917, 0.0],
            [0.305, 0.9, 0.0]],
            [[0.305, 0.9, 0.0],
            [0.307, 0.877, 0.0],
            [0.307, 0.873, 0.0],
            [0.305, 0.85, 0.0]],
            [[0.305, 0.85, 0.0],
            [0.303, 0.833, 0.0],
            [0.302, 0.817, 0.0],
            [0.301, 0.8, 0.0]]]
    elif shape == "middle_down_button":
        data = [[[0.301, 0.8, 0.0],
            [0.298, 0.768, 0.0],
            [0.231, 0.768, 0.0],
            [0.228, 0.8, 0.0]],
            [[0.228, 0.8, 0.0],
            [0.226, 0.817, 0.0],
            [0.225, 0.833, 0.0],
            [0.224, 0.85, 0.0]],
            [[0.224, 0.85, 0.0],
            [0.264, 0.873, 0.0],
            [0.284, 0.873, 0.0],
            [0.305, 0.85, 0.0]],
            [[0.305, 0.85, 0.0],
            [0.303, 0.833, 0.0],
            [0.302, 0.817, 0.0],
            [0.301, 0.8, 0.0]]]
    elif shape == "middle_up_button":
        data = [[[0.270, 0.873, 0.0],
            [0.264, 0.873, 0.0],
            [0.222, 0.877, 0.0],
            [0.224, 0.9, 0.0]],
            [[0.224, 0.9, 0.0],
            [0.225, 0.917, 0.0],
            [0.226, 0.933, 0.0],
            [0.228, 0.95, 0.0]],
            [[0.228, 0.95, 0.0],
            [0.231, 0.982, 0.0],
            [0.298, 0.982, 0.0],
            [0.301, 0.95, 0.0]],
            [[0.301, 0.95, 0.0],
            [0.302, 0.933, 0.0],
            [0.303, 0.917, 0.0],
            [0.305, 0.9, 0.0]],
            [[0.305, 0.9, 0.0],
            [0.307, 0.877, 0.0],
            [0.284, 0.873, 0.0],
            [0.270, 0.873, 0.0]]]
    elif shape == "right_button":
        data = [[[0.375, 0.763, 0.0],
            [0.402, 0.755, 0.0],
            [0.408, 0.754, 0.0],
            [0.462, 0.751, 0.0]],
            [[0.462, 0.751, 0.0],
            [0.486, 0.75, 0.0],
            [0.49, 0.757, 0.0],
            [0.489, 0.767, 0.0]],
            [[0.489, 0.767, 0.0],
            [0.481, 0.908, 0.0],
            [0.451, 0.943, 0.0],
            [0.374, 0.97, 0.0]],
            [[0.374, 0.97, 0.0],
            [0.354, 0.977, 0.0],
            [0.341, 0.975, 0.0],
            [0.338, 0.972, 0.0]],
            [[0.338, 0.972, 0.0],
            [0.325, 0.958, 0.0],
            [0.324, 0.949, 0.0],
            [0.329, 0.852, 0.0]],
            [[0.329, 0.852, 0.0],
            [0.334, 0.77, 0.0],
            [0.348, 0.771, 0.0],
            [0.375, 0.763, 0.0]]]

    return(data)


# return the shape that belongs to the given event
def map_mouse_event(event):
    shape = False

    if event == 'LEFTMOUSE':
        shape = "left_button"
    elif event == 'MIDDLEMOUSE':
        shape = "middle_button"
    elif event == 'RIGHTMOUSE':
        shape = "right_button"
    elif event == 'WHEELDOWNMOUSE':
        shape = "middle_down_button"
    elif event == 'WHEELUPMOUSE':
        shape = "middle_up_button"

    return(shape)

class ScreencastKeysStatus(bpy.types.Operator):
    bl_idname = "view3d.screencast_keys"
    bl_label = "Screencast Keys"
    bl_description = "Display keys pressed in the 3D View"
    last_activity = 'NONE'

    _handle = None
    _timer = None

    @staticmethod
    def handle_add(self, context):
        ScreencastKeysStatus._handle = bpy.types.SpaceView3D.draw_handler_add(draw_callback_px, (self, context), 'WINDOW', 'POST_PIXEL')
        ScreencastKeysStatus._timer = context.window_manager.event_timer_add(0.075, context.window)

    @staticmethod
    def handle_remove(context):
        if ScreencastKeysStatus._handle is not None:
            context.window_manager.event_timer_remove(ScreencastKeysStatus._timer)
            bpy.types.SpaceView3D.draw_handler_remove(ScreencastKeysStatus._handle, 'WINDOW')
        ScreencastKeysStatus._handle = None
        ScreencastKeysStatus._timer = None

    def modal(self, context, event):
        if context.area:
            context.area.tag_redraw()

        if event.type == 'TIMER':
            # no input, so no need to change the display
            return {'PASS_THROUGH'}

        scene = context.scene
        # keys that shouldn't show up in the 3D View
        mouse_keys = ['MOUSEMOVE','MIDDLEMOUSE','LEFTMOUSE',
         'RIGHTMOUSE', 'WHEELDOWNMOUSE','WHEELUPMOUSE']
        ignore_keys = ['LEFT_SHIFT', 'RIGHT_SHIFT', 'LEFT_ALT',
         'RIGHT_ALT', 'LEFT_CTRL', 'RIGHT_CTRL', 'TIMER',
         'MOUSEMOVE', 'INBETWEEN_MOUSEMOVE']
        if scene.screencast_keys_mouse != 'text':
            ignore_keys.extend(mouse_keys)

        if event.value == 'PRESS' or (event.value == 'RELEASE' and \
        self.last_activity == 'KEYBOARD' and event.type in mouse_keys):
            # add key-press to display-list
            sc_keys = []

            if event.ctrl:
                sc_keys.append("Ctrl ")
            if event.alt:
                sc_keys.append("Alt ")
            if event.shift:
                sc_keys.append("Shift ")

            sc_amount = ""

            if self.key:
                #print("Is a key")
                if event.type not in ignore_keys and event.type in self.key[0]:
                    mods = "+ ".join(sc_keys)
                    old_mods = "+ ".join(self.key[0].split("+ ")[:-1])
                    if mods == old_mods:
                        amount = self.key[0].split(" x")
                        if len(amount) >= 2:
                            sc_amount = " x" + str(int(amount[-1]) + 1)
                        else:
                            sc_amount = " x2"
                        del self.key[0]
                        del self.time[0]

            if event.type not in ignore_keys:
                #print("Recorded as key")
                sc_keys.append(event.type)
                self.key.insert(0, "+ ".join(sc_keys) + sc_amount)
                self.time.insert(0, time.time())

            elif event.type in mouse_keys and \
            scene.screencast_keys_mouse == 'icon':
                #print("Recorded as mouse press")
                self.mouse.insert(0, event.type)
                self.mouse_time.insert(0, time.time())

            if event.type in mouse_keys:
                self.last_activity = 'MOUSE'
            else:
                self.last_activity = 'KEYBOARD'
            #print("Last activity set to:", self.last_activity)

        if not context.window_manager.screencast_keys_keys:
            # stop script
            ScreencastKeysStatus.handle_remove(context)
            return {'CANCELLED'}

        return {'PASS_THROUGH'}

    def cancel(self, context):
        if context.window_manager.screencast_keys_keys:
            ScreencastKeysStatus.handle_remove(context)
            context.window_manager.screencast_keys_keys = False

    def invoke(self, context, event):
        if context.area.type == 'VIEW_3D':
            if context.window_manager.screencast_keys_keys is False:
                # operator is called for the first time, start everything
                context.window_manager.screencast_keys_keys = True
                self.key = []
                self.time = []
                self.mouse = []
                self.mouse_time = []
                ScreencastKeysStatus.overall_time = []
                ScreencastKeysStatus.handle_add(self, context)
                ScreencastKeysStatus.overall_time.insert(0, time.time())
                context.window_manager.modal_handler_add(self)
                return {'RUNNING_MODAL'}
            else:
                # operator is called again, stop displaying
                context.window_manager.screencast_keys_keys = False
                self.key = []
                self.time = []
                self.mouse = []
                self.mouse_time = []
                ScreencastKeysStatus.overall_time = []
                return {'CANCELLED'}
        else:
            self.report({'WARNING'}, "3D View not found, can't run Screencast Keys")
            return {'CANCELLED'}

class ScreencastKeysTimerReset(bpy.types.Operator):
    """Reset Timer"""
    bl_idname = "view3d.screencast_keys_timer_reset"
    bl_label = "Reset Timer"
    bl_description = "Set the timer back to zero"

    def execute(self, context):
        ScreencastKeysStatus.overall_time = [time.time()]
        return {'FINISHED'}


# properties used by the script
def init_properties():
    scene = bpy.types.Scene
    wm = bpy.types.WindowManager

    scene.screencast_keys_pos_x = bpy.props.IntProperty(
        name="Position X",
        description="Margin on the X axis",
        default=3,
        min=0,
        max=100)
    scene.screencast_keys_pos_y = bpy.props.IntProperty(
        name="Position Y",
        description="Margin on the Y axis",
        default=10,
        min=0,
        max=100)
    scene.screencast_keys_font_size = bpy.props.IntProperty(
        name="Text Size",
        description="Text size displayed on 3D View",
        default=24, min=10, max=150)
    scene.screencast_keys_mouse_size = bpy.props.IntProperty(
        name="Mouse Size",
        description="Mouse size displayed on 3D View",
        default=33, min=10, max=150)
    scene.screencast_keys_text_color = bpy.props.FloatVectorProperty(
        name="Text / Icon Color",
        description="Color for the text and mouse icon",
        default=(1.0, 1.0, 1.0, 1.0),
        min=0.1,
        max=1,
        subtype='COLOR',
        size=4)
    scene.screencast_keys_box_color = bpy.props.FloatVectorProperty(
        name="Box Color",
        description="Box color",
        default=(0.0, 0.0, 0.0, 0.3),
        min=0,
        max=1,
        subtype='COLOR',
        size=4)
    scene.screencast_keys_box_width = bpy.props.IntProperty(
        name="Box Width",
        description="Box default width (resizes with text if needed)",
        default = 0,
        min = 0,
        max = 2048,
        soft_max = 1024)
    scene.screencast_keys_mouse = bpy.props.EnumProperty(
        items=(("none", "No Mouse", "Don't display mouse events"),
              ("icon", "Icon", "Display graphical representation of "\
               "the mouse"),
              ("text", "Text", "Display mouse events as text lines")),
        name="Mouse Display",
        description="Display mouse events",
        default='icon')
    scene.screencast_keys_mouse_position = bpy.props.EnumProperty(
        items=(("left", "Left", "Align to the left"),
              ("right", "Right", "Align to the right")),
        name="Icon Position",
        description="Align the mouse icon on the 3D View",
        default='left')
    scene.screencast_keys_box_draw = bpy.props.BoolProperty(
        name="Display Box",
        description = "Display a bounding box behind the text",
        default = True)
    scene.screencast_keys_box_hide = bpy.props.BoolProperty(
        name="Hide Box",
        description = "Hide the box when no key is pressed",
        default = False)
    scene.screencast_keys_fade_time = bpy.props.FloatProperty(
        name="Fade Out Time",
        description = "Time in seconds for keys to last on screen",
        default = 3.5,
        min = 0.5,
        max = 10.0,
        soft_max = 5.0,
        step = 10,
        subtype = 'TIME')
    scene.screencast_keys_show_operator = bpy.props.BoolProperty(
        name="Display Last Operator",
        description = "Display the last operator used",
        default = True)
    scene.screencast_keys_timer_show = bpy.props.BoolProperty(
        name="Display Timer",
        description = "Counter of the elapsed time in H:MM:SS since the script started",
        default = False)
    scene.screencast_keys_timer_size = bpy.props.IntProperty(
        name="Time Size",
        description="Time size displayed on 3D View",
        default=12, min=8, max=100)
    scene.screencast_keys_timer_color = bpy.props.FloatVectorProperty(
        name="Time Color",
        description="Color for the time display",
        default=(1.0, 1.0, 1.0, 0.3),
        min=0,
        max=1,
        subtype='COLOR',
        size=4)

    # Runstate initially always set to False
    # note: it is not stored in the Scene, but in window manager:
    wm.screencast_keys_keys = bpy.props.BoolProperty(default=False)


# removal of properties when script is disabled
def clear_properties():
    props = (
        "screencast_keys_keys",
        "screencast_keys_mouse",
        "screencast_keys_font_size",
        "screencast_keys_mouse_size",
        "screencast_keys_mouse_position",
        "screencast_keys_fade_time",
        "screencast_keys_pos_x",
        "screencast_keys_pos_y",
        "screencast_keys_box_draw",
        "screencast_keys_text_color",
        "screencast_keys_box_color",
        "screencast_keys_box_hide",
        "screencast_keys_box_width",
        "screencast_keys_show_operator",
        "screencast_keys_timer_show",
        "screencast_keys_timer_color",
        "screencast_keys_timer_size",
    )

    wm = bpy.context.window_manager
    for p in props:
        if p in wm:
            del wm[p]


# defining the panel
class OBJECT_PT_keys_status(bpy.types.Panel):
    bl_label = "Screencast Keys"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"

    def draw(self, context):
        sc = context.scene
        wm = context.window_manager
        layout = self.layout

        if not wm.screencast_keys_keys:
            layout.operator("view3d.screencast_keys", text="Start Display",
                icon = "PLAY")
        else:
            layout.operator("view3d.screencast_keys", text="Stop Display",
                icon = "PAUSE")

            split = layout.split()

            col = split.column()
            sub = col.column(align=True)
            sub.label(text="Size:")
            sub.prop(sc, "screencast_keys_font_size", text="Text")
            sub.prop(sc, "screencast_keys_mouse_size", text="Mouse")

            col = split.column()
            sub = col.column(align=True)
            sub.label(text="Position:")
            sub.prop(sc, "screencast_keys_pos_x", text="X")
            sub.prop(sc, "screencast_keys_pos_y", text="Y")

            row = layout.row(align=True)
            row.prop(sc, "screencast_keys_text_color")
            row = layout.row(align=True)
            row.prop(sc, "screencast_keys_fade_time")

            layout.separator()

            row = layout.row(align=True)
            row.prop(sc, "screencast_keys_mouse", text="Mouse")
            row = layout.row(align=True)
            row.enabled = sc.screencast_keys_mouse == 'icon'
            row.prop(sc, "screencast_keys_mouse_position", expand=True)

            layout.label(text="Display:")
            row = layout.row(align=True)
            row.prop(sc, "screencast_keys_box_draw", text="Box")
            row = layout.row(align=True)
            row.active = sc.screencast_keys_box_draw
            row.prop(sc, "screencast_keys_box_color", text="")
            row.prop(sc, "screencast_keys_box_hide", text="Hide")
            row = layout.row(align=True)
            row.active = sc.screencast_keys_box_draw
            row.prop(sc, "screencast_keys_box_width")
            row = layout.row(align=True)
            row.prop(sc, "screencast_keys_show_operator", text="Last Operator")

            split = layout.split()

            col = split.column()
            sub = col.column(align=True)
            sub.prop(sc, "screencast_keys_timer_show", text="Time")
            col = split.column()
            sub = col.column(align=True)
            sub.active = sc.screencast_keys_timer_show
            sub.prop(sc, "screencast_keys_timer_color", text="")

            row = layout.row(align=True)
            row.enabled = sc.screencast_keys_timer_show
            row.prop(sc, "screencast_keys_timer_size")
            row = layout.row(align=True)
            row.enabled = sc.screencast_keys_timer_show
            row.operator("view3d.screencast_keys_timer_reset", text="Reset")

classes = (ScreencastKeysStatus,
           ScreencastKeysTimerReset,
           OBJECT_PT_keys_status)


# store keymaps here to access after registration
addon_keymaps = []


def register():
    init_properties()
    for c in classes:
        bpy.utils.register_class(c)

    wm = bpy.context.window_manager
    kc = wm.keyconfigs.addon
    if kc:
        km = kc.keymaps.new(name='3D View', space_type='VIEW_3D')
        kmi = km.keymap_items.new('view3d.screencast_keys', 'C', 'PRESS', shift=True, alt=True)
        addon_keymaps.append((km, kmi))


def unregister():
    # incase its enabled
    ScreencastKeysStatus.handle_remove(bpy.context)

    for c in classes:
        bpy.utils.unregister_class(c)

    # handle the keymap
    for km, kmi in addon_keymaps:
        km.keymap_items.remove(kmi)
    addon_keymaps.clear()

    clear_properties()


if __name__ == "__main__":
    register()
