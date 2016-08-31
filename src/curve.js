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
 * Curve internal API.
 * Currently only NURBS (blender path curves) supported.
 * @name curve
 * @namespace
 * @exports exports as curve
 */
b4w.module["__curve"] = function(exports, require) {

var m_print = require("__print");
var m_util  = require("__util");
var m_vec3  = require("__vec3");

var SPLINE_POINTS = 1000;

/**
 * Create spline object to apply curve modifier
 */
exports.create_spline = function(bpy_obj) {
    var spline = {};

    var bpy_curve = bpy_obj["data"];

    // NOTE: only single endpoint (path) NURBS supported
    var bpy_spline = bpy_curve["splines"][0];
    if (!(bpy_spline && bpy_spline["type"] == "NURBS" && 
                bpy_spline["use_endpoint_u"]))
        return null;

    var order = bpy_spline["order_u"];
    spline.order = order;

    var points = bpy_spline["points"];

    var knot = gen_open_knot(points.length/5, order, []);
    spline.knot = knot;

    if (bpy_curve["dimensions"] == "2D")
        spline.is_3d = false;
    else if (bpy_curve["dimensions"] == "3D")
        spline.is_3d = true;
    else
        m_util.panic("Wrong curve dimensions");

    var cpoints = [];
    var weights = [];

    for (var i = 0; i < points.length; i+=5) {
        cpoints.push(points[i]);    // x
        cpoints.push(points[i+1]);  // y
        cpoints.push(points[i+2]);  // z
        if (spline.is_3d)
            cpoints.push(points[i+3]);  // tilt
        weights.push(points[i+4]);
    }

    spline.cpoints = cpoints;
    spline.weights = weights;

    // render spline to calculate cumulative length of segments
    // required for length--->t translation
    var points = spline_points(spline, SPLINE_POINTS, []);
    var ncoords = spline.is_3d ? 4 : 3;

    var clen = new Float32Array(SPLINE_POINTS);
    clen[0] = 0;

    for (var i = 1; i < SPLINE_POINTS; i+=1) {
        var x0 = points[(i-1) * ncoords];
        var y0 = points[(i-1) * ncoords + 1];
        var z0 = points[(i-1) * ncoords + 2];

        var x = points[i * ncoords];
        var y = points[i * ncoords + 1];
        var z = points[i * ncoords + 2];

        var len = Math.sqrt((x-x0)*(x-x0) + (y-y0)*(y-y0) + (z-z0)*(z-z0));
        clen[i] = clen[i-1] + len;
    }
    spline.cumulative_length = clen;

    return spline;
}

/**
 * Generate B-spline open knot vector.
 * @param n Number of control points
 * @param order Order of basis function
 * @param [x] Destination vector
 */
function gen_open_knot(n, order, dest) {
    if (!dest)
        var dest = [];

    var nplusorder = n + order;
    var nplus2 = n + 2;

    dest[0] = 0;

    for (var i = 2; i <= nplusorder; i++) {
        if ((i > order) && (i < nplus2))
            dest[i-1] = dest[i-2] + 1;
        else
            dest[i-1] = dest[i-2];
    }

    return dest;
}

/**
 * Generate a B-spline periodic uniform knot vector.
 * @param n Number of control points
 * @param order Order of basis function
 * @param [x] Destination vector
 */
function gen_periodic_knot(n, order, dest) {
    if (!dest)
        var dest = [];

    var nplusorder = n + order;
    var nplus2 = n + 2;

    dest[0] = 0;

    for (var i = 2; i <= nplusorder; i++) {
        dest[i-1] = i - 1;
    }

    return dest;
}

/**
 * Calc rational basis for NURBS
 * @param order Order of basis function
 * @param t Curve parameter
 * @param knot Knot vector
 * @param weights Weights vector (of length n)
 * @param [r] Destination vector
 */
function gen_rational_basis(order, t, knot, weights, r) {

    var n = weights.length;

    if (!r)
        var r = new Float32Array(n);

    var nplusorder = n + order;

    // calculate the first order nonrational basis functions Ni,1
    var temp = new Float32Array(nplusorder);

    for (var i = 1; i <= nplusorder-1; i++) {
        if ((t >= knot[i-1]) && (t < knot[i+1-1]))
            temp[i-1] = 1;
        else
            temp[i-1] = 0;
    }

    // calculate the higher order nonrational basis functions
    for (var k = 2; k <= order; k++) {
        for (var i = 1; i <= nplusorder-k; i++) {
            // if the lower order basis function is zero skip the calculation
            if (temp[i-1] != 0)
                var d = ((t - knot[i-1]) * temp[i-1]) / (knot[i+k-1-1]-knot[i-1]);
            else
                var d = 0;

            // if the lower order basis function is zero skip the calculation
            if (temp[i+1-1] != 0)
                var e = ((knot[i+k-1] - t) * temp[i+1-1]) / (knot[i+k-1] - knot[i+1-1]);
            else
                var e = 0;

            temp[i-1] = d + e;
        }
    }

    // pick up last point
    if (t == knot[nplusorder-1])
        temp[n-1] = 1;

    // calculate sum for denominator of rational basis functions
    var sum = 0.0;
    for (var i = 1; i <= n; i++)
        sum = sum + temp[i-1] * weights[i-1];

    // form rational basis functions and put in r vector
    for (var i = 1; i <= n; i++) {
        if (sum != 0)
            r[i-1] = (temp[i-1] * weights[i-1]) / sum;
        else
            r[i-1] = 0;
    }

    return r;
}

/**
 * Calc derivatives of rational basis functions
 */
function gen_rational_dbasis(order, t, knot, weights, rd) {
    
    var num = weights.length;

    if (!rd)
        var rd = new Float32Array(num);

    var n = new Float32Array(num);
    var d = new Float32Array(num);

    gen_basis_d(num, order, t, knot, n, d);

    var sum = 0.0;
    for (var i = 1; i <= num; i++)
        sum = sum + n[i-1] * weights[i-1];

    var dsum = 0.0;
    for (var i = 1; i <= num; i++)
        dsum = dsum + d[i-1] * weights[i-1];

    // form derivatives of rational basis functions
    for (var i = 1; i <= num; i++) {
        if (sum != 0) {
            var rd1 = (d[i-1] * weights[i-1]) / sum;
            var rd2 = (n[i-1] * weights[i-1] * dsum) / (sum * sum);
                
            rd[i-1] = rd1 + rd2;
        } else
            rd[i-1] = 0;
    }

    return rd;
}

/**
 * Calc non-rational b-spline basis functions and their derivatives
 */
function gen_basis_d(num, order, t, knot, n, d) {

    if (!n)
        var n = new Float32Array(num);
    if (!d)
        var d = new Float32Array(num);

    var nplusorder = num + order;

    // initialized by zero values
    var temp = new Float32Array(nplusorder);
    var tempd = new Float32Array(nplusorder);

    // calculate the first order basis functions Ni,1

    for (var i = 1; i <= nplusorder-1; i++) {
        if ((t >= knot[i-1]) && (t < knot[i+1-1]))
            temp[i-1] = 1;
        else
            temp[i-1] = 0;
    }

    // pick up last point
    if (t == knot[nplusorder-1])
        temp[num-1] = 1;

    // calculate the higher order basis functions

    for (var k = 2; k <= order; k++) {
        for (var i = 1; i <= nplusorder-k; i++) {
            if (temp[i-1] != 0)
                var b1 = ((t-knot[i-1])*temp[i-1])/(knot[i+k-1-1]-knot[i-1]);
            else
                var b1 = 0;

            if (temp[i+1-1] != 0)     
                var b2 = ((knot[i+k-1]-t)*temp[i+1-1])/(knot[i+k-1]-knot[i+1-1]);
            else
                var b2 = 0;

            // first derivative
            if (temp[i-1] != 0)       
                var f1 = temp[i-1]/(knot[i+k-1-1]-knot[i-1]);
            else
                var f1 = 0;

            if (temp[i+1-1] != 0)
                var f2 = -temp[i+1-1]/(knot[i+k-1]-knot[i+1-1]);
            else
                var f2 = 0;

            if (tempd[i-1] != 0)
                var f3 = ((t-knot[i-1])*tempd[i-1])/(knot[i+k-1-1]-knot[i-1]);
            else
                var f3 = 0;

            if (tempd[i+1-1] != 0)
                var f4 = ((knot[i+k-1]-t)*tempd[i+1-1])/(knot[i+k-1]-knot[i+1-1]);
            else
                var f4 = 0;


            temp[i-1] = b1 + b2;
            tempd[i-1] = f1 + f2 + f3 + f4;
        }
    }

    for (var i = 1; i <= num; i++) {
        n[i-1] = temp[i-1];
        d[i-1] = tempd[i-1];
    }

    return n;
}



/**
 * Requires open knot vector
 */
function spline_points(spline, num, dest) {

    if (!dest)
        var dest = [];

    var cpoints = spline.cpoints;
    var ncoords = spline.is_3d ? 4 : 3;
    var weights = spline.weights;
    var knot = spline.knot;
    var order = spline.order;

    var n = cpoints.length / ncoords;
    var nplusorder = n + order;

    // calculate the points on the rational B-spline curve

    var t = 0;
    var step = knot[nplusorder-1] / (num-1);
    var icount = 0;

    for (var i = 0; i < num; i++) {

        if (knot[nplusorder - 1] - t < 5e-6)
            t = knot[nplusorder-1];

        // generate the basis function for this value of t
        var basis = gen_rational_basis(order, t, knot, weights);

        // generate a point on the curve
        for (var j = 0; j < ncoords; j++) {

            dest[ncoords*i + j] = 0.0;

            // do local matrix multiplication
            for (var k = 0; k < n; k++) {
                var temp = basis[k] * cpoints[ncoords*k + j];
                dest[ncoords*i + j] += temp;
            }
        }

        t = t + step;
    }

    return dest;
}

/**
 * Generate single spline point, located at given t.
 * @param spline Spline object
 * @param t Spline parameter
 * @param [dest] Destination vector
 */
exports.spline_point = function(spline, t, dest) {
    if (!dest)
        var dest = [];

    var t = clamped_t(spline, t);

    var cpoints = spline.cpoints;
    var ncoords = spline.is_3d ? 4 : 3;
    var weights = spline.weights;
    var knot = spline.knot;
    var order = spline.order;

    var n = cpoints.length / ncoords;
    var nplusorder = n + order;

    if (knot[nplusorder - 1] - t < 5e-6)
        t = knot[nplusorder-1];

    var basis = new Float32Array(n);
    gen_rational_basis(order, t, knot, weights, basis);

    for (var i = 0; i < ncoords; i++) {

        dest[i] = 0.0;

        for (var j = 0; j < n; j++)
            dest[i] += basis[j] * cpoints[ncoords*j + i];
    }

    return dest;
}

function clamped_t(spline, t) {
    var t_clamped = Math.max(t, 0.0);

    var max_t = spline_max_t(spline);
    t_clamped = Math.min(t, max_t);

    return t_clamped;
}

/**
 * Generate single spline derivative, located at given t.
 * @param spline Spline object
 * @param t Spline parameter
 * @param [dest] Destination vector
 */
exports.spline_derivative = function(spline, t, dest) {
    if (!dest)
        var dest = [];

    var cpoints = spline.cpoints;
    var ncoords = spline.is_3d ? 4 : 3;
    var weights = spline.weights;
    var knot = spline.knot;
    var order = spline.order;

    var n = cpoints.length / ncoords;
    var nplusorder = n + order;

    if (knot[nplusorder - 1] - t < 5e-6)
        t = knot[nplusorder-1];

    var dbasis = new Float32Array(n);
    gen_rational_dbasis(order, t, knot, weights, dbasis);

    for (var i = 0; i < ncoords; i++) {

        dest[i] = 0.0;

        for (var j = 0; j < n; j++)
            dest[i] += dbasis[j] * cpoints[ncoords*j + i];
    }

    return dest;
}

exports.spline_max_t = spline_max_t;
/**
 * Get spline maximum parameter value.
 * @param spline Spline object
 */
function spline_max_t(spline) {
    var knot = spline.knot;
    return knot[knot.length - 1];
}

exports.spline_length = spline_length;
/**
 * Get spline length.
 * @methodOf curve
 * @param spline Spline object
 */
function spline_length(spline) {
    var clen = spline.cumulative_length;
    return clen[clen.length - 1];
}

/**
 * Convert length on the spline to parameter t.
 * @param spline Spline object
 * @param len Length along the spline
 * @returns Clamped t param
 */
exports.spline_len_to_t = function(spline, len) {

    if (len <= 0)
        return 0;

    var max_t = spline_max_t(spline);
    if (len >= spline_length(spline))
        return max_t; 

    var clen = spline.cumulative_length;
    var index = m_util.binary_search_max(clen, len, 0, clen.length-1);

    // simple linear interpolation
    var index_float = index + (len - clen[index]) / (clen[index+1] - clen[index]);

    var t = max_t * index_float / SPLINE_POINTS;
    return t;
}

exports.linear_interpolation = function(y1, x1, y0, x0, x) {
    return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
}

exports.linear = function(x, v1, v4) {
    var x1 = v1[0], y1 = v1[1],
        x2 = v4[0], y2 = v4[1];
    var k = (y2 - y1) / (x2 - x1);
    var b = y1 - k * x1;
    return k * x + b;
}


exports.bezier = function(x, v1, v2, v3, v4, precision) {

    // first find parameter t corresponding to x
    var t = bezier_find_root(0, 1, x, v1[0], v2[0], v3[0], v4[0], precision);

    // then calc y from t
    var y = bezier_parametric(t, v1[1], v2[1], v3[1], v4[1]);

    return y;
}

function bezier_find_root(t0_so_far, t1_so_far, x_needed, x0, x1, x2, x3, precision) {

    // split the interval
    var t = t0_so_far + (t1_so_far - t0_so_far) / 2;

    var x = bezier_parametric(t, x0, x1, x2, x3);

    var dx = x - x_needed;

    var precision = precision? precision : 0.01;

    if (Math.abs(dx) < precision)
        return t;

    if (dx > 0)
        return bezier_find_root(t0_so_far, t, x_needed, x0, x1, x2, x3, precision);
    else
        return bezier_find_root(t, t1_so_far, x_needed, x0, x1, x2, x3, precision);
}

function bezier_parametric(t, p0, p1, p2, p3) {
    var t1 = 1 - t;

    return p0 * t1 * t1 * t1 +
       3 * p1 * t1 * t1 * t +
       3 * p2 * t1 * t  * t +
           p3 * t  * t  * t;
}

exports.calchandle_curvemap = function(bezt, prev, next, h1, h2) {

    var p1 = new Float32Array(3);
    var p2 = new Float32Array(3);
    var p3 = new Float32Array(3);

    var dvec_a = new Float32Array(3);
    var dvec_b = new Float32Array(3);

    var tvec = new Float32Array(3);

    m_vec3.copy(bezt[1], p2);

    if (prev == null) {
        m_vec3.copy(next[1], p3);
        p1[0] = 2.0 * p2[0] - p3[0];
        p1[1] = 2.0 * p2[1] - p3[1];
    } else
        m_vec3.copy(prev[1], p1);

    if (next == null) {
        m_vec3.copy(prev[1], p1);
        p3[0] = 2.0 * p2[0] - p1[0];
        p3[1] = 2.0 * p2[1] - p1[1];
    } else
        m_vec3.copy(next[1], p3);

    m_vec3.subtract(p2, p1, dvec_a);
    m_vec3.subtract(p3, p2, dvec_b);

    var len_a = m_vec3.length(dvec_a);
    var len_b = m_vec3.length(dvec_b);

    if (len_a == 0.0)
        len_a = 1.0;
    if (len_b == 0.0)
        len_b = 1.0;

    if (h1 == "AUTO" || h2 == "AUTO") {
        tvec[0] = dvec_b[0] / len_b + dvec_a[0] / len_a;
        tvec[1] = dvec_b[1] / len_b + dvec_a[1] / len_a;

        var len = m_vec3.length(tvec) * 2.5614;

        if (len != 0) {

            if (h1 == "AUTO") {
                len_a /= len;
                m_vec3.scaleAndAdd(p2, tvec, -len_a, bezt[0]);
            }

            if (h2 == "AUTO") {
                len_b /= len;
                m_vec3.scaleAndAdd(p2, tvec, len_b, bezt[2]);
            }
        }
    }

    if (h1 == "VECTOR")
        m_vec3.scaleAndAdd(p2, dvec_a, -1.0 / 3.0, bezt[0]);

    if (h2 == "VECTOR")
        m_vec3.scaleAndAdd(p2, dvec_b, 1.0 / 3.0, bezt[2]);
}

/**
 * The total length of the handles is not allowed to be more
 * than the horizontal distance between (v1-v4).
 * (prevent curve loops)
 */
exports.correct_bezpart = function(v1, v2, v3, v4) {

    var h1 = [];
    var h2 = [];
    var len1, len2, len, fac;

    // calc handle deltas
    h1[0] = v1[0] - v2[0];
    h1[1] = v1[1] - v2[1];

    h2[0] = v4[0] - v3[0];
    h2[1] = v4[1] - v3[1];

    // calculate distances:
    // len- span of time between keyframes
    // len1 - length of handle of start key
    // len2 - length of handle of end key
    len = v4[0]- v1[0];
    len1 = Math.abs(h1[0]);
    len2 = Math.abs(h2[0]);

    // if the handles have no length, no need to do any corrections
    if ((len1 + len2) == 0)
        return;

    // the two handles cross over each other, so force them
    // apart using the proportion they overlap
    if (len1 + len2 > len) {
        fac = len / (len1 + len2);

        v2[0] = v1[0] - fac * h1[0];
        v2[1] = v1[1] - fac * h1[1];

        v3[0] = v4[0] - fac * h2[0];
        v3[1] = v4[1] - fac * h2[1];
    }
}

}
