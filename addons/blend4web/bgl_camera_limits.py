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


import bgl
import bpy
import math
import mathutils

# drawing hacks
RANGE_2PI = [1e-5, 2 * math.pi]
RADIUS_EPS = 0.001 # epsilon to keep the direction in case of a zero radius vector

# drawing styles
BORDER_WIDTH = 4
NORMAL_WIDTH = 1
BORDER_ALPHA = 1
NORMAL_ALPHA = 0.4

NORMAL_POINT_SIZE = 4
BOLD_POINT_SIZE = 7

NUM_SECTORS = 128
NUM_RINGS = 6

EYE_DRAW_RADIUS = 10

# drawing colors
ORANGE_COLOR = [1, 0.667, 0.251]
BLUE_COLOR = [0, 0, 1]
RED_COLOR = [1, 0, 0]


class B4W_LimitsDrawHandler():
    _handler = None

    @classmethod
    def add_handler(cls):
        if cls._handler is None:
            cls._handler = bpy.types.SpaceView3D.draw_handler_add(cls.draw_limits, 
                    (), 'WINDOW', 'POST_VIEW')

    @classmethod
    def remove_handler(cls):
        if cls._handler is not None:
            bpy.types.SpaceView3D.draw_handler_remove(cls._handler, 'WINDOW')
            cls._handler = None

    @classmethod
    def draw_limits(cls):
        bgl.glEnable(bgl.GL_BLEND)
        bgl.glDisable(bgl.GL_DEPTH_TEST);

        cam = bpy.context.active_object

        if (cam is not None and cam.type == "CAMERA" 
                and cam.data.b4w_show_limits_in_viewport and cam_has_limits(cam)):

            ms = cam.data.b4w_move_style

            if ms == "TARGET":
                # get orientation
                view_dir = cam.data.b4w_target - cam.location
                orientation = get_camera_orientation(cam, view_dir)

                # get limits
                hor_rot_limits = get_target_hor_rot_limits(cam, orientation)
                vert_rot_limits = get_target_vert_rot_limits(cam, orientation)
                dist_limits = get_target_distance_limits(cam)

                # draw limits
                rotation_mat = mathutils.Matrix.Rotation(-math.pi / 2, 3, 'Z')
                draw_target_limits(cam, hor_rot_limits, dist_limits, 
                        rotation_mat, BLUE_COLOR, cam.data.b4w_use_horizontal_clamping)

                rotation_mat = mathutils.Matrix.Rotation(-math.pi / 2, 3, 'X')
                phi_middle = (wrap_2pi(hor_rot_limits[1] - hor_rot_limits[0]) / 2 
                        + hor_rot_limits[0] - math.pi / 2)
                rotation_mat.rotate(mathutils.Quaternion((0, 0, 1), phi_middle))
                draw_target_limits(cam, vert_rot_limits, dist_limits, 
                        rotation_mat, RED_COLOR, cam.data.b4w_use_vertical_clamping)

                bgl.glColor4f(ORANGE_COLOR[0], ORANGE_COLOR[1], ORANGE_COLOR[2], 1)
                draw_point(cam.data.b4w_target, NORMAL_POINT_SIZE)
            elif ms == "EYE":
                # get orientation
                view_dir = mathutils.Vector((0, 0, -1))
                view_dir.rotate(cam.matrix_world.to_quaternion())
                orientation = get_camera_orientation(cam, view_dir)

                # get limits
                hor_rot_limits = get_eye_hor_rot_limits(cam, orientation)
                vert_rot_limits = get_eye_vert_rot_limits(cam, orientation)

                # draw limits
                rotation_mat = mathutils.Matrix.Rotation(math.pi / 2, 3, 'Z')
                draw_eye_limits(cam, hor_rot_limits, rotation_mat, BLUE_COLOR, 
                        cam.data.b4w_use_horizontal_clamping)

                rotation_mat = mathutils.Matrix.Rotation(math.pi / 2, 3, 'X')
                phi_middle = (wrap_2pi(hor_rot_limits[1] - hor_rot_limits[0]) / 2 
                        + hor_rot_limits[0] + math.pi / 2)
                rotation_mat.rotate(mathutils.Quaternion((0, 0, 1), phi_middle))
                draw_eye_limits(cam, vert_rot_limits, rotation_mat, RED_COLOR, 
                        cam.data.b4w_use_vertical_clamping)
            elif ms == "HOVER":
                # get orientation
                view_dir = mathutils.Vector((0, 0, -1))
                view_dir.rotate(cam.matrix_world.to_quaternion())
                orientation = get_camera_orientation(cam, view_dir)

                # get limits
                res = mathutils.geometry.intersect_line_plane(cam.location, 
                        cam.location + view_dir, 
                        mathutils.Vector((0, 0, cam.data.b4w_hover_zero_level)), 
                        mathutils.Vector((0, 0, 1)))
                cross_point = (mathutils.Vector((cam.location.x, 
                        cam.location.y, cam.data.b4w_hover_zero_level)) 
                        if res is None else res)
                rad_vec = cam.location - cross_point
                
                hor_trans_limits = get_hover_hor_trans_limits(cam)
                vert_trans_limits = get_hover_vert_trans_limits(cam)
                zoom_limits = get_hover_zoom_limits(cam, orientation["theta"], 
                        rad_vec.length)

                hover_pivot = calc_hover_pivot(cross_point, hor_trans_limits, 
                        vert_trans_limits)

                rotation_mat = mathutils.Matrix.Rotation(orientation["phi"] - math.pi / 2, 3, 'Z')
                draw_hover_limits(cam, hover_pivot, hor_trans_limits, 
                        vert_trans_limits, zoom_limits, rotation_mat, 
                        orientation["theta"], rad_vec)

                bgl.glColor4f(ORANGE_COLOR[0], ORANGE_COLOR[1], ORANGE_COLOR[2], 1)
                draw_point(hover_pivot, NORMAL_POINT_SIZE)

def cam_has_limits(cam):
    ms = cam.data.b4w_move_style
    if ms == "TARGET":
        return (cam.data.b4w_use_target_distance_limits or 
                cam.data.b4w_use_horizontal_clamping or cam.data.b4w_use_vertical_clamping)
    elif ms == "EYE":
        return cam.data.b4w_use_horizontal_clamping or cam.data.b4w_use_vertical_clamping
    elif ms == "HOVER":
        return True
    else:
        return False

# angles are calculated relative to Blender Y direction. 
def get_camera_orientation(cam, view_dir):

    cam_up_vec = mathutils.Vector((0, 1, 0))
    cam_up_vec.rotate(cam.matrix_world.to_quaternion())
    is_upside_down = cam_up_vec.z < 0

    # 2D vectors in the XOY plane
    # NOTE: view_vec_proj_xy = view_dir.resized(2) causes a segmentation fault 
    # error during the export
    view_vec_proj_xy = mathutils.Vector((view_dir.x, view_dir.y))
    if view_vec_proj_xy.length == 0:
        view_vec_proj_xy = mathutils.Vector((cam_up_vec.x, cam_up_vec.y))
    # angle_signed function assumes that clockwise is positive 
    phi = -mathutils.Vector((0, 1)).angle_signed(view_vec_proj_xy)

    # 2D vectors in the YOZ plane
    view_vec_cp = view_dir.copy()    
    view_vec_cp.rotate(mathutils.Quaternion((0, 0, 1), phi).inverted())
    theta = -mathutils.Vector((1, 0)).angle_signed(mathutils.Vector((view_vec_cp.y, view_vec_cp.z)))
    
    if is_upside_down:
        phi += math.pi
        theta = math.copysign(math.pi, theta) - theta

    return {
        "phi": phi,
        "theta": theta,
        "is_upside_down": is_upside_down
    }

def get_target_hor_rot_limits(cam, orientation):
    if cam.data.b4w_use_horizontal_clamping:
        return calc_angle_limits(orientation["phi"], 
                cam.data.b4w_rotation_left_limit, 
                cam.data.b4w_rotation_right_limit, 
                cam.data.b4w_horizontal_clamping_type == "LOCAL", 
                orientation["is_upside_down"])
    else:
        return RANGE_2PI

def get_eye_hor_rot_limits(cam, orientation):
    if cam.data.b4w_use_horizontal_clamping:
        return calc_angle_limits(orientation["phi"], 
                -cam.data.b4w_rotation_right_limit, 
                -cam.data.b4w_rotation_left_limit, 
                cam.data.b4w_horizontal_clamping_type == "LOCAL", 
                orientation["is_upside_down"])
    else:
        return RANGE_2PI

def get_target_vert_rot_limits(cam, orientation):
    if cam.data.b4w_use_vertical_clamping:
        return calc_angle_limits(orientation["theta"], 
                -cam.data.b4w_rotation_up_limit, 
                -cam.data.b4w_rotation_down_limit, 
                cam.data.b4w_vertical_clamping_type == "LOCAL", 
                orientation["is_upside_down"])
    else:
        return RANGE_2PI

def get_eye_vert_rot_limits(cam, orientation):
    if cam.data.b4w_use_vertical_clamping:
        return calc_angle_limits(orientation["theta"], 
                cam.data.b4w_rotation_down_limit, 
                cam.data.b4w_rotation_up_limit, 
                cam.data.b4w_vertical_clamping_type == "LOCAL", 
                orientation["is_upside_down"])
    else:
        return RANGE_2PI

def calc_angle_limits(angle, angle_min, angle_max, is_local, is_upside_down):
    res_min = ((angle - angle_max if is_upside_down else angle + angle_min) 
            if is_local else angle_min)
    res_max = ((angle - angle_min if is_upside_down else angle + angle_max) 
            if is_local else angle_max)
    return [wrap_2pi(res_min), wrap_2pi(res_max)]

def get_target_distance_limits(cam):
    if (cam.data.b4w_use_target_distance_limits 
        and cam.data.b4w_distance_min <= cam.data.b4w_distance_max):
        return [cam.data.b4w_distance_min, cam.data.b4w_distance_max]
    else:
        return None

def get_hover_hor_trans_limits(cam):
    limits = None
    if cam.data.b4w_use_horizontal_clamping:
        trans_min = cam.data.b4w_horizontal_translation_min
        trans_max = cam.data.b4w_horizontal_translation_max

        if trans_min <= trans_max:
            limits = [trans_min, trans_max]

    return limits
        
def get_hover_vert_trans_limits(cam):
    limits = None
    if cam.data.b4w_use_vertical_clamping:
        trans_min = cam.data.b4w_vertical_translation_min
        trans_max = cam.data.b4w_vertical_translation_max

        if trans_min <= trans_max:
            limits = [trans_min, trans_max]

    return limits

def get_hover_zoom_limits(cam, elev_angle, pivot_dist):
    min_dist = max_dist = pivot_dist
    down_angle = up_angle = elev_angle

    if cam.data.b4w_use_zooming:
        if cam.data.b4w_distance_min <= cam.data.b4w_distance_max:
            min_dist = cam.data.b4w_distance_min
            max_dist = cam.data.b4w_distance_max    

        if -cam.data.b4w_hover_angle_max <= -cam.data.b4w_hover_angle_min:
            down_angle = -cam.data.b4w_hover_angle_min
            up_angle = -cam.data.b4w_hover_angle_max

    return [min_dist, max_dist, wrap_2pi(down_angle), wrap_2pi(up_angle)]

def calc_hover_pivot(cross_point, hor_trans_limits, vert_trans_limits):
    x = cross_point.x
    y = cross_point.y
    if hor_trans_limits is not None:
        x  = min(max(cross_point.x, hor_trans_limits[0]), hor_trans_limits[1])
    if vert_trans_limits is not None:
        y  = min(max(cross_point.y, vert_trans_limits[0]), vert_trans_limits[1])
    return mathutils.Vector((x, y, cross_point.z))

def draw_target_limits(cam, rot_limits, dist_limits, rotation_mat, draw_color, use_limits):
    dist_min = 0 if dist_limits is None else dist_limits[0]
    dist_max = ((cam.data.b4w_target - cam.location).length 
            if dist_limits is None else dist_limits[1])

    # draw external lines
    if dist_limits is not None:
        arc_min = get_arc_points(cam.data.b4w_target, lambda x: dist_min, 
                (0, 0, 1), RANGE_2PI[0], RANGE_2PI[1], rotation_mat)
        draw_limit_strip(arc_min, draw_color)
        arc_max = get_arc_points(cam.data.b4w_target, lambda x: dist_max, 
                (0, 0, 1), RANGE_2PI[0], RANGE_2PI[1], rotation_mat)
        draw_limit_strip(arc_max, draw_color)

    # draw main lines
    arcs = []
    for i in range(NUM_RINGS + 1):
        arc_radius = (dist_max - dist_min) * i / NUM_RINGS + dist_min
        arcs.append(get_arc_points(cam.data.b4w_target, lambda x: arc_radius, 
                (0, 0, 1), rot_limits[0], rot_limits[1], rotation_mat))

    for i in range(len(arcs)):
        is_border = dist_limits is not None and (i == 0 or i == len(arcs) - 1)
        draw_limit_strip(arcs[i], draw_color, is_border)

    for i in range(len(arcs[0])):
        is_border = use_limits and (i == 0 or i == len(arcs[0]) - 1)
        draw_limit_strip([arcs[0][i], arcs[-1][i]], draw_color, is_border)

    bgl.glLineWidth(1)

def draw_eye_limits(cam, rot_limits, rotation_mat, draw_color, use_limits):
    arcs = []
    for i in range(NUM_RINGS + 1):
        arc_radius = EYE_DRAW_RADIUS * i / NUM_RINGS
        arcs.append(get_arc_points(cam.location, lambda x: arc_radius, 
                (0, 0, 1), rot_limits[0], rot_limits[1], rotation_mat))

    for i in range(len(arcs)):
        draw_limit_strip(arcs[i], draw_color)

    for i in range(len(arcs[0])):
        is_border = use_limits and (i == 0 or i == len(arcs[0]) - 1)
        draw_limit_strip([arcs[0][i], arcs[-1][i]], draw_color, is_border)

    bgl.glLineWidth(1)

def draw_hover_limits(cam, hover_pivot, hor_trans_limits, vert_trans_limits, 
        zoom_limits, rotation_mat, orient_theta, pivot_to_pos_vec):

    if hor_trans_limits is not None or vert_trans_limits is not None:
        bottom = -10 if vert_trans_limits is None else vert_trans_limits[0]
        top = 10 if vert_trans_limits is None else vert_trans_limits[1]
        left = -10 if hor_trans_limits is None else hor_trans_limits[0]
        right = 10 if hor_trans_limits is None else hor_trans_limits[1]

        lt = mathutils.Vector((left, top, hover_pivot.z))
        rt = mathutils.Vector((right, top, hover_pivot.z))
        lb = mathutils.Vector((left, bottom, hover_pivot.z))
        rb = mathutils.Vector((right, bottom, hover_pivot.z))

        if hor_trans_limits is not None:
            draw_limit_strip([lt, lb], ORANGE_COLOR)
            draw_limit_strip([rt, rb], ORANGE_COLOR)

        if vert_trans_limits is not None:
            draw_limit_strip([lt, rt], ORANGE_COLOR)
            draw_limit_strip([lb, rb], ORANGE_COLOR)

    if zoom_limits is not None:

        # get trajectory points
        cam_theta = hover_clamp_camera_angle(orient_theta, zoom_limits[3], zoom_limits[2])
        def hover_radius(angle):
            angle_range = wrap_2pi(zoom_limits[2] - zoom_limits[3])
            coeff = 1 if angle_range == 0 else wrap_2pi(angle - zoom_limits[3]) / angle_range
            radius = (1 - coeff) * zoom_limits[1] + coeff * zoom_limits[0]
            if radius == 0:
                radius += RADIUS_EPS
            return radius

        arc_to_cam_pos = get_arc_points(hover_pivot, hover_radius, (0, 1, 0), 
                zoom_limits[3], cam_theta, rotation_mat)
        arc_from_cam_pos = get_arc_points(hover_pivot, hover_radius, (0, 1, 0), 
                cam_theta, zoom_limits[2], rotation_mat)
        arc = arc_to_cam_pos + arc_from_cam_pos
        cam_pos = arc_to_cam_pos[-1]

        # draw trajectory
        draw_limit_strip(arc, ORANGE_COLOR, True)

        # draw restricting points and lines
        bgl.glColor4f(RED_COLOR[0], RED_COLOR[1], RED_COLOR[2], 1)
        draw_point(arc[0], BOLD_POINT_SIZE)
        draw_point(arc[-1], BOLD_POINT_SIZE)

        vec_high = arc[0] - hover_pivot
        vec_high.normalize()
        vec_high *= zoom_limits[1] + 3
        vec_low = arc[-1] - hover_pivot
        vec_low.normalize()
        vec_low *= zoom_limits[0] + 3
        draw_line(hover_pivot, hover_pivot + vec_low, 1)
        draw_line(hover_pivot, hover_pivot + vec_high, 1)

        # draw camera trajectory position
        bgl.glColor4f(BLUE_COLOR[0], BLUE_COLOR[1], BLUE_COLOR[2], 1)
        draw_point(cam_pos, BOLD_POINT_SIZE)

        # draw horizontal rotation trajectory
        if cam.data.b4w_enable_hover_hor_rotation:
            center = mathutils.Vector((hover_pivot.x, hover_pivot.y, cam_pos.z))
            arc_radius = (cam_pos - center).length
            arc = get_arc_points(center, lambda x: arc_radius, (0, 0, 1), 
                    RANGE_2PI[0], RANGE_2PI[1])
            draw_limit_strip(arc, BLUE_COLOR, True)

def get_arc_points(center, rad_func, axis, angle_min, angle_max, local_transf_mat=None):
    points = []

    base_axis = mathutils.Vector((0, 0, 1))
    axis = mathutils.Vector(axis)
    dot = base_axis.dot(axis)
    cross = base_axis.cross(axis)
    axis_rotation = mathutils.Matrix.Rotation(math.acos(dot), 4, cross)

    co_from = calc_circ_coords(center, rad_func(angle_min), axis_rotation, angle_min, local_transf_mat)
    points.append(co_from)

    angle_range = wrap_2pi(angle_max - angle_min)
    for i in range(1, NUM_SECTORS + 1):
        i *= 2 * math.pi / NUM_SECTORS
       
        if i < angle_range:
            co = calc_circ_coords(center, rad_func(i + angle_min), axis_rotation, i + angle_min, local_transf_mat)
            points.append(co)

    co_to = calc_circ_coords(center, rad_func(angle_max), axis_rotation, angle_max, local_transf_mat)
    points.append(co_to)

    return points

# this is a copypasted engine function util.calc_returning_angle()
def hover_clamp_camera_angle(angle, angle_min, angle_max):

    clamped_angle = angle

    # rotate unit circle to ease calculation
    rot = 2 * math.pi - angle_min;
    angle_min = 0;
    angle_max += rot;
    angle_max = wrap_2pi(angle_max);
    angle += rot;
    angle = wrap_2pi(angle);

    if angle > angle_max:
        # clamp to the proximal edge
        delta_to_up = angle_max - angle;
        delta_to_down = 2 * math.pi - angle;

        if -delta_to_up > delta_to_down:
            angle = angle + delta_to_down

        clamped_angle += delta_to_down if -delta_to_up > delta_to_down else delta_to_up

    return wrap_2pi(clamped_angle)

def calc_circ_coords(center, radius, axis_rotation, angle, local_transf_mat):
    co = (math.cos(angle) * radius, math.sin(angle) * radius, 0)
    co = mathutils.Vector(co)
    co = axis_rotation * co
    if local_transf_mat is not None:
        co = local_transf_mat * co
    co += center
    return co

def wrap_2pi(angle):
    return angle - angle // (2 * math.pi) * 2 * math.pi

def draw_limit_strip(points, color, is_border=False):
    alpha = BORDER_ALPHA if is_border else NORMAL_ALPHA
    lwidth = BORDER_WIDTH if is_border else NORMAL_WIDTH
    bgl.glColor4f(color[0], color[1], color[2], alpha)
    bgl.glLineWidth(lwidth)

    bgl.glBegin(bgl.GL_LINE_STRIP)
    for point in points:
        bgl.glVertex3f(point.x, point.y, point.z)
    bgl.glEnd()
    bgl.glLineWidth(1)

def draw_point(pos, size):
    bgl.glPointSize(size)
    bgl.glBegin(bgl.GL_POINTS)
    bgl.glVertex3f(pos.x, pos.y, pos.z)
    bgl.glEnd()
    bgl.glPointSize(1)

def draw_line(point0, point1, width):
    bgl.glLineWidth(width)
    bgl.glBegin(bgl.GL_LINE_STRIP)
    bgl.glVertex3f(point0.x, point0.y, point0.z)
    bgl.glVertex3f(point1.x, point1.y, point1.z)
    bgl.glEnd()
    bgl.glLineWidth(1)

def register():
    B4W_LimitsDrawHandler.add_handler()

def unregister():
    B4W_LimitsDrawHandler.remove_handler()
    