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
 * Math internal functions.
 * @name math
 * @namespace
 * @exports exports as math
 */
b4w.module["__math"] = function(exports, require) {

var m_mat3 = require("__mat3");
var m_vec3 = require("__vec3");

var _vec3_tmp = new Float32Array(3);
var _mat3_tmp = new Float32Array(9);
var _mat3_tmp2 = new Float32Array(9);
var _mat3_tmp3 = new Float32Array(9);
var _mat3_tmp4 = new Float32Array(9);

var MAX_ITER_NUM = 100;

exports.get_pline_directional_vec = function(pline, dest) {
    dest = dest || new Float32Array(3);
    dest[0] = pline[3];
    dest[1] = pline[4];
    dest[2] = pline[5];
    return dest;
}

exports.get_pline_initial_point = function(pline, dest) {
    dest = dest || new Float32Array(3);
    return m_vec3.copy(pline, dest);
}

exports.set_pline_initial_point = function(pline, point) {
    m_vec3.copy(point, pline);
}

exports.set_pline_directional_vec = function(pline, vec) {
    m_vec3.normalize(vec, _vec3_tmp);
    pline[3] = _vec3_tmp[0];
    pline[4] = _vec3_tmp[1];
    pline[5] = _vec3_tmp[2];
}

exports.calc_pline_point = function(pline, t, dest) {
    dest = dest || new Float32Array(3);
    dest[0] = pline[0] + pline[3] * t;
    dest[1] = pline[1] + pline[4] * t;
    dest[2] = pline[2] + pline[5] * t;
}

exports.calk_average_position = function(points, dest) {
    dest[0] = 0; dest[1] = 0; dest[2] = 0;
    for (var i = 0; i < points.length; i = i + 3) {
        dest[0] += points[i];
        dest[1] += points[i + 1];
        dest[2] += points[i + 2];
    }
    return m_vec3.scale(dest, 3 / points.length, dest);
}

exports.calc_covariance_matrix = function(points, average_pos, dest) {

    for (var i = 0; i < dest.length; i++)
        dest[i] = 0;

    for (var i = 0; i < points.length; i = i + 3) {
        var xm = points[i] - average_pos[0];
        var ym = points[i + 1] - average_pos[1];
        var zm = points[i + 2] - average_pos[2];
        dest[0] += xm * xm;
        dest[1] += xm * ym;
        dest[2] += xm * zm;
        dest[4] += ym * ym;
        dest[5] += ym * zm;
        dest[8] += zm * zm;
    }
    dest[3] = dest[1];
    dest[6] = dest[2];
    dest[7] = dest[5];
    for (var i = 0; i < dest.length; i++)
        dest[i] *= 3 / points.length;
    return dest;
}

exports.find_eigenvectors = function(m, err, dest) {

    var matrix = m_mat3.copy(m, _mat3_tmp);

    if (calc_canonical_mat_error(matrix) < err) {
        return m_mat3.identity(dest);
    }

    var rot_matrix = find_elem_rotation_matrix(matrix, _mat3_tmp2);
    var rot_matrix_t = m_mat3.transpose(rot_matrix, _mat3_tmp3);
    m_mat3.multiply(matrix, rot_matrix_t, _mat3_tmp4);
    m_mat3.multiply(rot_matrix, _mat3_tmp4, matrix);
    var eigenvectors = m_mat3.copy(rot_matrix, dest);

    var count = 1;
    while (err <= calc_canonical_mat_error(matrix) && count < MAX_ITER_NUM) {
        var rot_matrix = find_elem_rotation_matrix(matrix, _mat3_tmp2);
        var rot_matrix_t = m_mat3.transpose(rot_matrix, _mat3_tmp3);
        m_mat3.multiply(matrix, rot_matrix_t, _mat3_tmp4);
        m_mat3.multiply(rot_matrix, _mat3_tmp4, matrix);
        m_mat3.multiply(rot_matrix, eigenvectors, eigenvectors);
        count++;
    }
    return eigenvectors;
}

function find_elem_rotation_matrix(m, dest) {

    var max = m[1];
    var ind = 1;
    for (var i = 2; i < m.length; i++)
        if (i != 4 && i!= 8 && Math.abs(m[i]) > Math.abs(max)) {
            max = m[i];
            ind = i;
        }
    var ii = Math.floor(ind / 3);
    var jj = ind % 3;
    var fi = 0.5 * Math.atan(2 * max / (m[ii * 3 + ii] - m[jj * 3 + jj]));

    for (var i = 0; i < dest.length; i++)
        if (i == 0 || i == 4 || i == 8)
            dest[i] = 1;
        else
            dest[i] = 0;
    dest[jj + ii * 3] = - Math.sin(fi);
    dest[ii + jj * 3] = Math.sin(fi);
    dest[ii + ii * 3] = Math.cos(fi);
    dest[jj + jj * 3] = Math.cos(fi);

    return dest;
}

function calc_canonical_mat_error(m) {
    return Math.sqrt(m[1] * m[1] + m[2] * m[2] + m[5] * m[5]);
}
/**
 * Calculate distance from point to plane.
 */
exports.point_plane_dist = function(pt, plane) {
    return plane[0] * pt[0] + plane[1] * pt[1] + plane[2] * pt[2] + plane[3];
}

/**
 *  Binary heap http://eloquentjavascript.net/1st_edition/appendix2.html
 */
exports.binary_heap_new = binary_heap_new;
function binary_heap_new(score_function) {
    return {
        content: [],
        score_function: score_function
    }
}

exports.binary_heap_push = binary_heap_push;
function binary_heap_push(heap, element) {
    heap.content.push(element);
    binary_heap_sink_down(heap, heap.content.length - 1);
}

function binary_heap_sink_down(heap, n) {
    // Fetch the element that has to be sunk.
    var element = heap.content[n];

    // When at 0, an element can not sink any further.
    while (n > 0) {
        // Compute the parent element's index, and fetch it.
        var parent_n = ((n + 1) >> 1) - 1,
            parent = heap.content[parent_n];
        // Swap the elements if the parent is greater.
        if (heap.score_function(element) < heap.score_function(parent)) {
            heap.content[parent_n] = element;
            heap.content[n] = parent;
            // Update 'n' to continue at the new position.
            n = parent_n;
        }
        // Found a parent that is less, no need to sink any further.
        else {
            break;
        }
    }
}

exports.binary_heap_pop = binary_heap_pop;
function binary_heap_pop(heap) {
    // Store the first element so we can return it later.
    var result = heap.content[0];
    // Get the element at the end of the array.
    var end = heap.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it bubble up.
    if (heap.content.length > 0) {
        heap.content[0] = end;
        binary_heap_bubble_up(heap, 0);
    }
    return result;
}

exports.binary_heap_remove = binary_heap_remove;
function binary_heap_remove(heap, node) {
    var i = heap.content.indexOf(node);

    // When it is found, the process seen in 'pop' is repeated
    // to fill up the hole.
    var end = heap.content.pop();

    if (i !== heap.content.length - 1) {
        heap.content[i] = end;

        if (heap.score_function(end) < heap.score_function(node)) {
            binary_heap_sink_down(i);
        } else {
            binary_heap_bubble_up(i);
        }
    }
}

exports.binary_heap_rescore_element = binary_heap_rescore_element;
function binary_heap_rescore_element(heap, node) {
    binary_heap_sink_down(heap, heap.content.indexOf(node));
}

function binary_heap_bubble_up(heap, n) {
    // Look up the target element and its score.
    var length = heap.content.length,
        element = heap.content[n],
        elem_score = heap.score_function(element);
    while (true) {
        // Compute the indices of the child elements.
        var child2_n = (n + 1) << 1,
            child1_n = child2_n - 1;
        // This is used to store the new position of the element,
        // if any.
        var swap = null;
        // If the first child exists (is inside the array)...
        if (child1_n < length) {
            // Look it up and compute its score.
            var child1 = heap.content[child1_n],
                child1_score = heap.score_function(child1);

            // If the score is less than our element's, we need to swap.
            if (child1_score < elem_score)
                swap = child1_n;
        }
        // Do the same checks for the other child.
        if (child2_n < length) {
            var child2 = heap.content[child2_n],
                child2_score = heap.score_function(child2);
            if (child2_score < (swap === null ? elem_score : child1_score)) {
                swap = child2_n;
            }
        }
        // If the element needs to be moved, swap it, and continue.
        if (swap !== null) {
            heap.content[n] = heap.content[swap];
            heap.content[swap] = element;
            n = swap;
        }
        // Otherwise, we are done.
        else {
            break;
        }
    }
}


}
