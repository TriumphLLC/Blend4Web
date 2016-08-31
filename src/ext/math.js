/**
 * Copyright (C) 2014-2016 Triumph LLC
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
 * Math functions.
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
 * @typedef Plane
 * @type {Float32Array(4)}
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
    m_math.set_pline_point(dest, point1);

    m_vec3.subtract(point2, point1, _vec3_tmp);

    m_math.set_pline_directional_vec(dest, _vec3_tmp);

    return dest;
}

/**
 * Get the parametric line.
 * @method module:math.create_pline_from_point_vec
 * @param {Vec3} point First point.
 * @param {Vec3} vec Directional vecor.
 * @returns {ParametricLine} Parametric line.
 */
exports.create_pline_from_point_vec = function(point, vec) {
    var dest = new Float32Array(6);
    m_math.set_pline_point(dest, point);
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
 * @method module:math.set_pline_point
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
 * @param {Number} p_dist Plane signed distance from the origin.
 * @param {ParametricLine} pline Parametric line.
 * @param {Vec3} dest Destination vector.
 * @returns {?Vec3} Intersection point or null if the line is parallel to the plane.
 */
exports.line_plane_intersect = m_util.line_plane_intersect
/**
 * Calculate parametric line point.
 * @method module:math.calc_pline_point
 * @param {ParametricLine} pline Parametric line.
 * @param {Number} t Parameter (distance from initial point).
 * @returns {?Vec3} Destination point.
 */
exports.calc_pline_point = m_math.calc_pline_point;
/**
 * Calculate distance from point to plane.
 * @method module:math.point_plane_dist
 * @param {Vec3} point Point.
 * @param {Plane} plane Plane.
 * @returns {Number} Distance.
 */
exports.point_plane_dist = m_math.point_plane_dist;
}
