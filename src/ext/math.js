/**
 * Copyright (C) 2014-2017 Triumph LLC
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
"use strict";

/**
 * Auxiliary math methods. For math methods operating on vectors, matrices or quaternions see the
 * corresponding modules.
 * @module math
 * @local Plane
 */
b4w.module["math"] = function(exports, require) {

var m_vec3     = require("__vec3");
var m_util     = require("__util");
var m_math     = require("__math");

var _vec3_tmp = new Float32Array(3);

/**
 * Plane represented as vec3 normal and distance to the origin.
 * @typedef {Float32Array(4)} Plane
 */

/**
 * Get the parametric line.
 * @method module:math.create_pline_from_points
 * @param {Vec3} point1 First point.
 * @param {Vec3} point2 Second point.
 * @returns {ParametricLine} Parametric line.
 */
exports.create_pline_from_points = function(point1, point2) {
    var dest = new Float32Array(6);
    m_math.set_pline_initial_point(dest, point1);

    m_vec3.subtract(point2, point1, _vec3_tmp);

    m_math.set_pline_directional_vec(dest, _vec3_tmp);

    return dest;
}

/**
 * Get the parametric line.
 * @method module:math.create_pline_from_point_vec
 * @param {Vec3} point First point.
 * @param {Vec3} vec Directional vector.
 * @returns {ParametricLine} Parametric line.
 */
exports.create_pline_from_point_vec = function(point, vec) {
    var dest = new Float32Array(6);
    m_math.set_pline_initial_point(dest, point);
    m_math.set_pline_directional_vec(dest, vec);

    return dest;
}

/**
 * Init the parametric line.
 * @method module:math.create_pline
 * @returns {ParametricLine} pline Parametric line.
 */
exports.create_pline = function() {
    return new Float32Array(6);
}
/**
 * Get the parametric line directional vector.
 * @method module:math.get_pline_directional_vec
 * @param {ParametricLine} pline Parametric line.
 * @param {?Vec3} [dest=new Float32Array(3);] Destination vector.
 * @returns {?Vec3} Destination vector.
 */
exports.get_pline_directional_vec = m_math.get_pline_directional_vec;
/**
 * Get the parametric line initial point.
 * @method module:math.get_pline_initial_point
 * @param {ParametricLine} pline Parametric line.
 * @param {?Vec3} [dest=new Float32Array(3);] Destination point.
 * @returns {?Vec3} Destination point.
 */
exports.get_pline_initial_point = m_math.get_pline_initial_point;
/**
 * Set the parametric line initial point.
 * @method module:math.set_pline_initial_point
 * @param {ParametricLine} pline Parametric line.
 * @param {Vec3} vec3 Point.
 */
exports.set_pline_initial_point = m_math.set_pline_initial_point;
/**
 * Set the parametric line directional vector.
 * @method module:math.set_pline_directional_vec
 * @param {ParametricLine} pline Parametric line.
 * @param {Vec3} vec3 Vector.
 */
exports.set_pline_directional_vec = m_math.set_pline_directional_vec;
/**
 * Calculate intersection point of a line and a plane.
 * @method module:math.line_plane_intersect
 * @see Lengyel E. - Mathematics for 3D Game Programming and Computer Graphics,
 * Third Edition. Chapter 5.2.1 Intersection of a Line and a Plane
 * @param {Vec3} pn Plane normal.
 * @param {number} p_dist Plane signed distance from the origin.
 * @param {ParametricLine} pline Parametric line.
 * @param {Vec3} dest Destination vector.
 * @returns {?Vec3} Intersection point or null if the line is parallel to the plane.
 */
exports.line_plane_intersect = m_util.line_plane_intersect
/**
 * Get the coordinates of a certain point on the given parametric line.
 * @method module:math.calc_pline_point
 * @param {ParametricLine} pline Parametric line.
 * @param {number} t Parameter - distance from the line initial point to a certain point.
 * @param {?Vec3} [dest=new Float32Array(3);] Destination point.
 * @returns {?Vec3} Destination point.
 */
exports.calc_pline_point = m_math.calc_pline_point;
/**
 * Calculate distance from point to plane.
 * @method module:math.point_plane_dist
 * @param {Vec3} point Point.
 * @param {Plane} plane Plane.
 * @returns {number} Distance.
 */
exports.point_plane_dist = m_math.point_plane_dist;
/**
 * Interpolate value with no easing, no acceleration.
 * @method module:math.linear_tween
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.linear_tween = m_math.linear_tween;
/**
 * Interpolate value with accelerating from zero velocity.
 * @method module:math.ease_in_quad
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_quad = m_math.ease_in_quad;
/**
 * Interpolate value with decelerating to zero velocity.
 * @method module:math.ease_out_quad
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_out_quad = m_math.ease_out_quad;
/**
 * Interpolate value with acceleration until halfway, then deceleration.
 * @method module:math.ease_in_out_quad
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_out_quad = m_math.ease_in_out_quad;
/**
 * Interpolate value with accelerating from zero velocity.
 * @method module:math.ease_in_cubic
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_cubic = m_math.ease_in_cubic;
/**
 * Interpolate value with decelerating to zero velocity.
 * @method module:math.ease_out_cubic
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_out_cubic = m_math.ease_out_cubic;
/**
 * Interpolate value with acceleration until halfway, then deceleration.
 * @method module:math.ease_in_out_cubic
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_out_cubic = m_math.ease_in_out_cubic;
/**
 * Interpolate value with accelerating from zero velocity.
 * @method module:math.ease_in_quart
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_quart = m_math.ease_in_quart;
/**
 * Interpolate value with decelerating to zero velocity.
 * @method module:math.ease_out_quart
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_out_quart = m_math.ease_out_quart;
/**
 * Interpolate value with acceleration until halfway, then deceleration.
 * @method module:math.ease_in_out_quart
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_out_quart = m_math.ease_in_out_quart;
/**
 * Interpolate value with decelerating from zero velocity.
 * @method module:math.ease_in_quint
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_quint = m_math.ease_in_quint;
/**
 * Interpolate value with decelerating to zero velocity.
 * @method module:math.ease_out_quint
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_out_quint = m_math.ease_out_quint;
/**
 * Interpolate value with acceleration until halfway, then deceleration.
 * @method module:math.ease_in_out_quint
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_out_quint = m_math.ease_in_out_quint;
/**
 * Interpolate value with decelerating from zero velocity.
 * @method module:math.ease_in_sine
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_sine = m_math.ease_in_sine;
/**
 * Interpolate value with decelerating to zero velocity.
 * @method module:math.ease_out_sine
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_out_sine = m_math.ease_out_sine;
/**
 * Interpolate value with acceleration until halfway, then decelerating.
 * @method module:math.ease_in_out_sine
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_out_sine = m_math.ease_in_out_sine;
/**
 * Interpolate value with decelerating from zero velocity.
 * @method module:math.ease_in_expo
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_expo = m_math.ease_in_expo;
/**
 * Interpolate value with decelerating to zero velocity.
 * @method module:math.ease_out_expo
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_out_expo = m_math.ease_out_expo;
/**
 * Interpolate value with acceleration until halfway, then decelerating.
 * @method module:math.ease_in_out_expo
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_out_expo = m_math.ease_in_out_expo;
/**
 * Interpolate value with decelerating from zero velocity.
 * @method module:math.ease_in_circ
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_circ = m_math.ease_in_circ;
/**
 * Interpolate value with decelerating to zero velocity.
 * @method module:math.ease_out_circ
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_out_circ = m_math.ease_out_circ;
/**
 * Interpolate value with acceleration until halfway, then deceleration.
 * @method module:math.ease_in_out_circ
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_out_circ = m_math.ease_in_out_circ;
/**
 * Interpolate value with decelerating from zero velocity.
 * @method module:math.ease_in_elastic
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_elastic = m_math.ease_in_elastic;
/**
 * Interpolate value with decelerating to zero velocity.
 * @method module:math.ease_out_elastic
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_out_elastic = m_math.ease_out_elastic;
/**
 * Interpolate value with acceleration until halfway, then deceleration.
 * @method module:math.ease_in_out_elastic
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_out_elastic = m_math.ease_in_out_elastic;
/**
 * Interpolate value with decelerating from zero velocity.
 * @method module:math.ease_in_back
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_back = m_math.ease_in_back;
/**
 * Interpolate value with decelerating to zero velocity.
 * @method module:math.ease_out_back
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_out_back = m_math.ease_out_back;
/**
 * Interpolate value with acceleration until halfway, then deceleration.
 * @method module:math.ease_in_out_back
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_out_back = m_math.ease_in_out_back;
/**
 * Interpolate value with decelerating from zero velocity.
 * @method module:math.ease_in_bounce
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_bounce = m_math.ease_in_bounce;
/**
 * Interpolate value with decelerating to zero velocity.
 * @method module:math.ease_out_bounce
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_out_bounce = m_math.ease_out_bounce;
/**
 * Interpolate value with acceleration until halfway, then deceleration.
 * @method module:math.ease_in_out_bounce
 * @param {number} t Current time.
 * @param {number} b Start value.
 * @param {number} c Change in value.
 * @param {number} d Duration.
 * @returns {number} Interpolated value.
 */
exports.ease_in_out_bounce = m_math.ease_in_out_bounce;

}
