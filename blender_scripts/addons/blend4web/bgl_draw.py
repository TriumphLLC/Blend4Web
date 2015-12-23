# Copyright (C) 2014-2015 Triumph LLC
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

ZERO_EPSILON = 1e-5
TARGET_COLOR = [1, 0.667, 0.251]
HORIZ_COLOR = [0, 0, 1]
VERT_COLOR = [1, 0, 0]

BORDER_WIDTH = 4
LINE_WIDTH = 1
BORDER_ALPHA = 1
LINE_ALPHA = 0.4

NUM_SECTORS = 32
NUM_RINGS = 6

TARGET_SIZE = 4

class B4W_LimitsDrawHandler():
    _handler = None

    @classmethod
    def add_handler(cls):
        if cls._handler is None:
            cls._handler = bpy.types.SpaceView3D.draw_handler_add(cls.draw_limits, (), 
                    'WINDOW', 'POST_VIEW')

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
                and cam.data.b4w_show_limits_in_viewport):
            ms = cam.data.b4w_move_style

            if ms == "TARGET":
                view_dir = cam.data.b4w_target - cam.location
                orientation = get_camera_orientation(cam, view_dir)

                hor_rot_limits = get_target_hor_rot_limits(cam, orientation)
                vert_rot_limits = get_target_vert_rot_limits(cam, orientation)
                dist_limits = get_target_distance_limits(cam)

                rotation_mat = mathutils.Matrix.Rotation(-math.pi/2, 3, 'Z')
                draw_target_limits(cam, hor_rot_limits, dist_limits, 
                        rotation_mat, HORIZ_COLOR, cam.data.b4w_use_horizontal_clamping)

                # proper circle orientation
                rotation_mat = mathutils.Matrix.Rotation(-math.pi/2, 3, 'X')
                phi_middle = (wrap_2pi(hor_rot_limits[1] - hor_rot_limits[0]) / 2 
                        + hor_rot_limits[0] - math.pi / 2)
                rotation_mat.rotate(mathutils.Quaternion((0, 0, 1), phi_middle))
                draw_target_limits(cam, vert_rot_limits, dist_limits, 
                        rotation_mat, VERT_COLOR, cam.data.b4w_use_vertical_clamping)

                bgl.glColor4f(TARGET_COLOR[0], TARGET_COLOR[1], TARGET_COLOR[2], 1)
                draw_point(cam.data.b4w_target, TARGET_SIZE)
            elif ms == "EYE":
                view_dir = mathutils.Vector((0, 0, -1))
                view_dir.rotate(cam.matrix_world.to_quaternion())
                orientation = get_camera_orientation(cam, view_dir)

                hor_rot_limits = get_eye_hor_rot_limits(cam, orientation)
                vert_rot_limits = get_eye_vert_rot_limits(cam, orientation)

                rotation_mat = mathutils.Matrix.Rotation(math.pi/2, 3, 'Z')
                draw_eye_limits(cam, hor_rot_limits, None, 
                        rotation_mat, HORIZ_COLOR, cam.data.b4w_use_horizontal_clamping)

                # proper circle orientation
                rotation_mat = mathutils.Matrix.Rotation(math.pi/2, 3, 'X')
                phi_middle = (wrap_2pi(hor_rot_limits[1] - hor_rot_limits[0]) / 2 
                        + hor_rot_limits[0] + math.pi / 2)
                rotation_mat.rotate(mathutils.Quaternion((0, 0, 1), phi_middle))
                draw_eye_limits(cam, vert_rot_limits, None, 
                        rotation_mat, VERT_COLOR, cam.data.b4w_use_vertical_clamping)
            elif ms == "HOVER":
                view_dir = mathutils.Vector((0, 0, -1))
                view_dir.rotate(cam.matrix_world.to_quaternion())

                # camera view direction can be changed here
                res = mathutils.geometry.intersect_line_plane(cam.location, 
                        cam.location + view_dir, 
                        mathutils.Vector((0, 0, cam.data.b4w_hover_zero_level)), 
                        mathutils.Vector((0, 0, 1)))
                hover_pivot = (mathutils.Vector((cam.location.x, 
                        cam.location.y, cam.data.b4w_hover_zero_level)) 
                        if res is None else res)

                orientation = get_camera_orientation(cam, view_dir)

                hor_trans_limits = get_hover_hor_trans_limits(cam, hover_pivot)
                pivot_to_pos_vec = cam.location - hover_pivot
                if hor_trans_limits is not None:
                    hover_pivot.x  = min(max(hover_pivot.x, hor_trans_limits[0]), hor_trans_limits[1])
                vert_trans_limits = get_hover_vert_trans_limits(cam, hover_pivot)
                if vert_trans_limits is not None:
                    hover_pivot.y  = min(max(hover_pivot.y, vert_trans_limits[0]), vert_trans_limits[1])
                zoom_limits = get_hover_zoom_limits(cam, hover_pivot, orientation, hover_pivot - cam.location)

                rotation_mat = mathutils.Matrix.Rotation(orientation["phi"] - math.pi / 2, 3, 'Z')
                draw_hover_limits(cam, hover_pivot, hor_trans_limits, 
                        vert_trans_limits, zoom_limits, rotation_mat, orientation["theta"], pivot_to_pos_vec)

def get_camera_orientation(cam, view_dir, consider_upside_down=True):
    '''
    Angles are calculated relative to Blender Y direction. 
    '''
    # 2D vectors in the XOY plane
    # NOTE: view_vec_proj_xy = view_dir.resized(2) causes a segmentation fault 
    # error during the export
    view_vec_proj_xy = mathutils.Vector((view_dir.x, view_dir.y))
    # angle_signed function assumes that clockwise is positive 
    if view_vec_proj_xy.length == 0:
        cam_up_vec = mathutils.Vector((0, 1, 0))
        cam_up_vec.rotate(cam.matrix_world.to_quaternion())
        view_vec_proj_xy = mathutils.Vector((cam_up_vec.x, cam_up_vec.y))

    phi = -mathutils.Vector((0, 1)).angle_signed(view_vec_proj_xy)

    # 2D vectors in the YOZ plane
    view_vec_cp = view_dir.copy()    
    view_vec_cp.rotate(mathutils.Quaternion((0, 0, 1), phi).inverted())
    theta = -mathutils.Vector((1, 0)).angle_signed(mathutils.Vector((view_vec_cp.y, view_vec_cp.z)))
    
    cam_up_vec = mathutils.Vector((0, 1, 0))
    cam_up_vec.rotate(cam.matrix_world.to_quaternion())
    is_upside_down = cam_up_vec.z < 0

    if is_upside_down and consider_upside_down:
        phi += math.pi
        theta = math.copysign(math.pi, theta) - theta

    return {
        "phi": phi,
        "theta": theta,
        "is_upside_down": is_upside_down
    }

def get_target_hor_rot_limits(cam, orientation):
    if cam.data.b4w_use_horizontal_clamping:
        phi_from = cam.data.b4w_rotation_left_limit
        phi_to = cam.data.b4w_rotation_right_limit

        if cam.data.b4w_horizontal_clamping_type == "LOCAL":
            if not orientation["is_upside_down"]:
                phi_from = orientation["phi"] + cam.data.b4w_rotation_left_limit
                phi_to = orientation["phi"] + cam.data.b4w_rotation_right_limit
            else:
                phi_from = orientation["phi"] - cam.data.b4w_rotation_right_limit
                phi_to = orientation["phi"] - cam.data.b4w_rotation_left_limit

        return [wrap_2pi(phi_from), wrap_2pi(phi_to)]
    else:
        return [ZERO_EPSILON, 2 * math.pi]

def get_eye_hor_rot_limits(cam, orientation):
    if cam.data.b4w_use_horizontal_clamping:
        phi_from = -cam.data.b4w_rotation_right_limit
        phi_to = -cam.data.b4w_rotation_left_limit

        if cam.data.b4w_horizontal_clamping_type == "LOCAL":
            if not orientation["is_upside_down"]:
                phi_from = orientation["phi"] - cam.data.b4w_rotation_right_limit
                phi_to = orientation["phi"] - cam.data.b4w_rotation_left_limit
            else:
                phi_from = orientation["phi"] + cam.data.b4w_rotation_left_limit
                phi_to = orientation["phi"] + cam.data.b4w_rotation_right_limit

        return [wrap_2pi(phi_from), wrap_2pi(phi_to)]
    else:
        return [ZERO_EPSILON, 2 * math.pi]

def get_target_vert_rot_limits(cam, orientation):
    if cam.data.b4w_use_vertical_clamping:
        theta_from = -cam.data.b4w_rotation_up_limit
        theta_to = -cam.data.b4w_rotation_down_limit

        if cam.data.b4w_vertical_clamping_type == "LOCAL":
            if not orientation["is_upside_down"]:
                theta_from = orientation["theta"] - cam.data.b4w_rotation_up_limit
                theta_to = orientation["theta"] - cam.data.b4w_rotation_down_limit
            else:
                theta_from = orientation["theta"] + cam.data.b4w_rotation_down_limit
                theta_to = orientation["theta"] + cam.data.b4w_rotation_up_limit

        return [wrap_2pi(theta_from), wrap_2pi(theta_to)]
    else:
        return [ZERO_EPSILON, 2 * math.pi]

def get_eye_vert_rot_limits(cam, orientation):
    if cam.data.b4w_use_vertical_clamping:
        theta_from = cam.data.b4w_rotation_down_limit
        theta_to = cam.data.b4w_rotation_up_limit

        if cam.data.b4w_vertical_clamping_type == "LOCAL":
            if not orientation["is_upside_down"]:
                theta_from = orientation["theta"] + cam.data.b4w_rotation_down_limit
                theta_to = orientation["theta"] + cam.data.b4w_rotation_up_limit
            else:
                theta_from = orientation["theta"] - cam.data.b4w_rotation_up_limit
                theta_to = orientation["theta"] - cam.data.b4w_rotation_down_limit
        return [wrap_2pi(theta_from), wrap_2pi(theta_to)]
    else:
        return [ZERO_EPSILON, 2 * math.pi]

def get_target_distance_limits(cam):
    if (cam.data.b4w_use_target_distance_limits 
        and cam.data.b4w_distance_min <= cam.data.b4w_distance_max):
        return [cam.data.b4w_distance_min, cam.data.b4w_distance_max]
    else:
        return None

def get_hover_hor_trans_limits(cam, hover_pivot):
    limits = None
    if cam.data.b4w_use_horizontal_clamping:
        trans_min = cam.data.b4w_horizontal_translation_min
        trans_max = cam.data.b4w_horizontal_translation_max

        if trans_min <= trans_max:
            limits = [trans_min, trans_max]

    return limits
        
def get_hover_vert_trans_limits(cam, hover_pivot):
    limits = None
    if cam.data.b4w_use_vertical_clamping:
        trans_min = cam.data.b4w_vertical_translation_min
        trans_max = cam.data.b4w_vertical_translation_max

        if trans_min <= trans_max:
            limits = [trans_min, trans_max]

    return limits

def get_hover_zoom_limits(cam, hover_pivot, orientation, dir_to_pivot):
    if cam.data.b4w_use_zooming:
        min_dist = cam.data.b4w_distance_min
        max_dist = cam.data.b4w_distance_max
        if min_dist > max_dist:
            min_dist = max_dist = dir_to_pivot.length

        down_angle = -cam.data.b4w_hover_angle_min
        up_angle = -cam.data.b4w_hover_angle_max

        if down_angle < up_angle:
            down_angle = up_angle = orientation["theta"]

        return [min_dist, max_dist, wrap_2pi(down_angle), wrap_2pi(up_angle)]
    else:
        return None
        # view_dir = hover_pivot - cam.location
        # min_dist = max_dist = view_dir.length

        # orientation = get_camera_orientation(cam, view_dir, False)
        # down_angle = up_angle = orientation["theta"]

    # return [min_dist, max_dist, down_angle, up_angle]

################################################################################

def draw_target_limits(cam, rot_limits, dist_limits, rotation_mat, draw_color, use_limits):

    dist_min = 0 if dist_limits is None else dist_limits[0]
    dist_max = ((cam.data.b4w_target - cam.location).length 
            if dist_limits is None else dist_limits[1])

    points_from = []
    points_to = []

    # draw arcs
    for i in range(NUM_RINGS + 1):
        is_border_arc = i == 0 or (i == NUM_RINGS and dist_limits is not None)

        alpha = BORDER_ALPHA if is_border_arc else LINE_ALPHA
        lwidth = BORDER_WIDTH if is_border_arc else LINE_WIDTH
        bgl.glColor4f(draw_color[0], draw_color[1], draw_color[2], alpha)
        bgl.glLineWidth(lwidth)
        
        arc_radius = (dist_max - dist_min) * i / NUM_RINGS + dist_min
        points = draw_arc(cam.data.b4w_target, arc_radius, (0, 0, 1), 
                rot_limits[0], rot_limits[1], rotation_mat)

        # draw external arcs
        if is_border_arc:
            bgl.glColor4f(draw_color[0], draw_color[1], draw_color[2], LINE_ALPHA)
            bgl.glLineWidth(LINE_WIDTH)
            draw_arc(cam.data.b4w_target, arc_radius, (0, 0, 1), 
                    rot_limits[1], rot_limits[0], rotation_mat)

        if i == 0:
            points_from = points
        if i == NUM_RINGS:
            points_to = points

    # draw radii
    for i in range(len(points_from)):
        is_border_radius = (i == 0 or i == len(points_from) - 1) and use_limits
        alpha = BORDER_ALPHA if is_border_radius else LINE_ALPHA
        lwidth = BORDER_WIDTH if is_border_radius else LINE_WIDTH
        bgl.glColor4f(draw_color[0], draw_color[1], draw_color[2], alpha)

        if dist_limits is not None:
            draw_line(points_from[i], points_to[i], lwidth)
        else:
            point_to = 1.1 * (points_to[i] - points_from[i]) + points_from[i]
            draw_line(points_from[i], point_to, lwidth)

def draw_eye_limits(cam, rot_limits, dist_limits, rotation_mat, draw_color, 
        use_limits):

    dist_min = 0 if dist_limits is None else dist_limits[0]
    dist_max = 10

    points_from = []
    points_to = []

    # draw arcs
    for i in range(NUM_RINGS + 1):
        is_border_arc = i == 0 or (i == NUM_RINGS and dist_limits is not None)

        alpha = BORDER_ALPHA if is_border_arc else LINE_ALPHA
        lwidth = BORDER_WIDTH if is_border_arc else LINE_WIDTH
        bgl.glColor4f(draw_color[0], draw_color[1], draw_color[2], alpha)
        bgl.glLineWidth(lwidth)
        
        arc_radius = (dist_max - dist_min) * i / NUM_RINGS + dist_min
        points = draw_arc(cam.location, arc_radius, (0, 0, 1), 
                rot_limits[0], rot_limits[1], rotation_mat)

        # draw external arcs
        if is_border_arc:
            bgl.glColor4f(draw_color[0], draw_color[1], draw_color[2], LINE_ALPHA)
            bgl.glLineWidth(LINE_WIDTH)
            draw_arc(cam.location, arc_radius, (0, 0, 1), 
                    rot_limits[1], rot_limits[0], rotation_mat)

        if i == 0:
            points_from = points
        if i == NUM_RINGS:
            points_to = points

    # draw radii
    for i in range(len(points_from)):
        is_border_radius = (i == 0 or i == len(points_from) - 1) and use_limits
        alpha = BORDER_ALPHA if is_border_radius else LINE_ALPHA
        lwidth = BORDER_WIDTH if is_border_radius else LINE_WIDTH
        bgl.glColor4f(draw_color[0], draw_color[1], draw_color[2], alpha)

        if dist_limits is not None:
            draw_line(points_from[i], points_to[i], lwidth)
        else:
            point_to = 1.1 * (points_to[i] - points_from[i]) + points_from[i]
            draw_line(points_from[i], point_to, lwidth)
    
def draw_hover_limits(cam, hover_pivot, hor_trans_limits, vert_trans_limits, 
        zoom_limits, rotation_mat, orient_theta, pivot_to_pos_vec):

    bgl.glColor4f(TARGET_COLOR[0], TARGET_COLOR[1], TARGET_COLOR[2], 1)
    if hor_trans_limits is not None:
        bottom = -10 if vert_trans_limits is None else vert_trans_limits[0]
        top = 10 if vert_trans_limits is None else vert_trans_limits[1]

        point_bottom = mathutils.Vector((hor_trans_limits[0], bottom, hover_pivot.z))
        point_top = mathutils.Vector((hor_trans_limits[0], top, hover_pivot.z))
        draw_line(point_bottom, point_top, 1)

        point_bottom.x = hor_trans_limits[1]
        point_top.x = hor_trans_limits[1]
        draw_line(point_bottom, point_top, 1)

    if vert_trans_limits is not None:
        left = -10 if hor_trans_limits is None else hor_trans_limits[0]
        right = 10 if hor_trans_limits is None else hor_trans_limits[1]

        point_left = mathutils.Vector((left, vert_trans_limits[0], hover_pivot.z))
        point_right = mathutils.Vector((right, vert_trans_limits[0], hover_pivot.z))
        draw_line(point_left, point_right, 1)

        point_left.y = vert_trans_limits[1]
        point_right.y = vert_trans_limits[1]
        draw_line(point_left, point_right, 1)

    if zoom_limits is not None:
        cam_theta = hover_clamp_camera_angle(orient_theta, zoom_limits[3], zoom_limits[2])
        cam_pos_dest = mathutils.Vector((0, 0, 0))
        points = draw_hover_trajectory(hover_pivot, zoom_limits[1], zoom_limits[0], 
                (0, 1, 0), zoom_limits[3], zoom_limits[2], rotation_mat, cam_theta, cam_pos_dest)

        bgl.glColor4f(VERT_COLOR[0], VERT_COLOR[1], VERT_COLOR[2], 1)
        draw_point(points[0], TARGET_SIZE + 3)
        draw_point(points[-1], TARGET_SIZE + 3)

        vec_high = points[0] - hover_pivot
        vec_high.normalize()
        vec_high *= zoom_limits[1] + 3
        vec_low = points[-1] - hover_pivot
        vec_low.normalize()
        vec_low *= zoom_limits[0] + 3
        draw_line(hover_pivot, hover_pivot + vec_low, 1)
        draw_line(hover_pivot, hover_pivot + vec_high, 1)

        bgl.glColor4f(HORIZ_COLOR[0], HORIZ_COLOR[1], HORIZ_COLOR[2], 1)
        draw_point(cam_pos_dest, TARGET_SIZE + 3)
    else:
        bgl.glColor4f(VERT_COLOR[0], VERT_COLOR[1], VERT_COLOR[2], 1)
        draw_line(hover_pivot, hover_pivot + pivot_to_pos_vec, 1)
        bgl.glColor4f(HORIZ_COLOR[0], HORIZ_COLOR[1], HORIZ_COLOR[2], 1) 
        draw_point(hover_pivot + pivot_to_pos_vec, TARGET_SIZE + 3)

    bgl.glColor4f(TARGET_COLOR[0], TARGET_COLOR[1], TARGET_COLOR[2], 1)
    draw_point(hover_pivot, TARGET_SIZE)

################################################################################

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

def draw_arc(center, radius, axis, angle_min, angle_max, local_transf_mat=None):
    base_axis = mathutils.Vector((0, 0, 1))
    axis = mathutils.Vector(axis)
    dot = base_axis.dot(axis)
    cross = base_axis.cross(axis)
    axis_rotation = mathutils.Matrix.Rotation(math.acos(dot), 4, cross)

    bgl.glBegin(bgl.GL_LINE_STRIP)

    phi_range = wrap_2pi(angle_max - angle_min)

    points = []

    co_from = calc_circ_coords(center, radius, axis_rotation, angle_min, local_transf_mat)
    bgl.glVertex3f(co_from.x, co_from.y, co_from.z)
    points.append(co_from)

    for i in range(1, NUM_SECTORS + 1):
        i *= 2 * math.pi / NUM_SECTORS
       
        if i < phi_range:
            co = calc_circ_coords(center, radius, axis_rotation, i + angle_min, local_transf_mat)
            bgl.glVertex3f(co.x, co.y, co.z)
            points.append(co)

    co_to = calc_circ_coords(center, radius, axis_rotation, angle_max, local_transf_mat)
    bgl.glVertex3f(co_to.x, co_to.y, co_to.z)
    points.append(co_to)

    bgl.glEnd()

    return points

def draw_hover_trajectory(center, radius_min, radius_max, axis, angle_min, 
        angle_max, local_transf_mat=None, cam_theta=None, cam_dest=None):
    base_axis = mathutils.Vector((0, 0, 1))
    axis = mathutils.Vector(axis)
    dot = base_axis.dot(axis)
    cross = base_axis.cross(axis)
    axis_rotation = mathutils.Matrix.Rotation(math.acos(dot), 4, cross)

    bgl.glBegin(bgl.GL_LINE_STRIP)

    phi_range = wrap_2pi(angle_max - angle_min)

    points = []

    cam_pos_drawed = False

    for i in range(0, NUM_SECTORS + 1):
        angle = i * 2 * math.pi / NUM_SECTORS
       
        if angle < phi_range:
            if angle >= wrap_2pi(cam_theta - angle_min) and not cam_pos_drawed:
                coeff = wrap_2pi(cam_theta - angle_min) / phi_range
                radius = (1 - coeff) * radius_min + (coeff) * radius_max
                co = calc_circ_coords(center, radius, axis_rotation, cam_theta, local_transf_mat)
                bgl.glVertex3f(co.x, co.y, co.z)
                points.append(co)
                cam_pos_drawed = True
                cam_dest.x = co.x
                cam_dest.y = co.y
                cam_dest.z = co.z

            coeff = angle / phi_range
            radius = (1 - coeff) * radius_min + (coeff) * radius_max
            co = calc_circ_coords(center, radius, axis_rotation, angle + angle_min, local_transf_mat)
            bgl.glVertex3f(co.x, co.y, co.z)
            points.append(co)

    if angle_max >= cam_theta and not cam_pos_drawed:
        coeff = wrap_2pi(cam_theta - angle_min) / phi_range
        radius = (1 - coeff) * radius_min + (coeff) * radius_max
        co = calc_circ_coords(center, radius, axis_rotation, cam_theta, local_transf_mat)
        bgl.glVertex3f(co.x, co.y, co.z)
        points.append(co)
        cam_pos_drawed = True
        cam_dest.x = co.x
        cam_dest.y = co.y
        cam_dest.z = co.z

    co_to = calc_circ_coords(center, radius_max, axis_rotation, angle_max, local_transf_mat)
    bgl.glVertex3f(co_to.x, co_to.y, co_to.z)
    points.append(co_to)

    bgl.glEnd()

    return points

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
    