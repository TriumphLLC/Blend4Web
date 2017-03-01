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
 * Navigation mesh internal API.
 * @name navmesh
 * @namespace
 * @exports exports as navmesh
 */
b4w.module["__navmesh"] = function(exports, require) {

var m_geom  = require("__geometry");
var m_math  = require("__math");
var m_mat4  = require("__mat4");
var m_util  = require("__util");
var m_vec3  = require("__vec3");
var m_vec4  = require("__vec4");

// TODO: reduce count of tmp variables
var _vec3_tmp = m_vec3.create();
var _vec3_tmp2 = m_vec3.create();

var _vec4_tmp = m_vec4.create();
var _vec4_tmp2 = m_vec4.create();
var _vec4_tmp3 = m_vec4.create();

var _mat4_tmp = m_mat4.create();
var _mat4_tmp2 = m_mat4.create();
var _mat4_tmp3 = m_mat4.create();

var _accum_left_portal_tmp = m_vec3.create();
var _accum_right_portal_tmp = m_vec3.create();
var _accum_left_tmp = m_vec3.create();
var _accum_right_tmp = m_vec3.create();
var _apex_normal_tmp = m_vec3.create();

function merge_vertices(geometry) {
    var vertices_map = {}; // Hashmap for looking up vertex by position
                           // coordinates (and making sure they are unique)
    var unique = [];
    var changes = [];
    var v, key;
    var precision_points = 4; // number of decimal points, eg. 4 for epsilon of 0.0001
    var precision = Math.pow(10, precision_points);
    var i, il, face;
    var indices;

    for (i = 0, il = geometry.vertices.length; i < il; i++) {
        v = geometry.vertices[i];

        key = Math.round(v[0] * precision) + '_' + Math.round(v[1] * precision) +
            '_' + Math.round(v[2] * precision);

        if (vertices_map[key] === undefined) {
            vertices_map[key] = i;
            unique.push(v);
            changes[i] = unique.length - 1;
        } else {
            changes[i] = changes[vertices_map[key]];
        }
    }

    // If faces are completely degenerate after merging vertices, we
    // have to remove them from the geometry.
    var face_indices_to_remove = [];

    for (i = 0, il = geometry.faces.length; i < il; i++) {
        face = geometry.faces[i];
        face.indices[0] = changes[face.indices[0]];
        face.indices[1] = changes[face.indices[1]];
        face.indices[2] = changes[face.indices[2]];

        indices = [face.indices[0], face.indices[1], face.indices[2]];

        // If any duplicate vertices are found in a Face3
        // we have to remove the face as nothing can be saved
        for (var n = 0; n < 3; n++) {
            if (indices[n] == indices[(n + 1) % 3]) {
                face_indices_to_remove.push(i);
                break;
            }
        }
    }

    for (i = face_indices_to_remove.length - 1; i >= 0; i--) {
        var idx = face_indices_to_remove[i];
        geometry.faces.splice(idx, 1);
    }

    // Use unique set of vertices
    var diff = geometry.vertices.length - unique.length;
    geometry.vertices.length = 0;

    for (i = 0; i < unique.length; i++)
        geometry.vertices.push(unique[i])

    return diff;

}

function get_edge_key(vertex_ids_1, vertex_ids_2) {
    if (vertex_ids_1 > vertex_ids_2)
        return vertex_ids_2 + "-" + vertex_ids_1;
    else
        return vertex_ids_1 + "-" + vertex_ids_2;
}

function build_polygons_from_geometry(geometry) {
    var polygons = [];
    var vertices = geometry.vertices;
    // Convert the faces into a custom format that supports more than 3 vertices
    var polygon_id = 0;
    for (var i = 0; i < geometry.faces.length; i++) {
        var face = geometry.faces[i];
        polygons.push({
            id: polygon_id++,
            vertex_ids: face.indices,
            centroid: face.centroid,
            normal: face.normal,
            neighbours: []
        });
    }
    var navigation_mesh = {
        polygons: polygons,
        vertices: vertices
    };

    // Build a list of adjacent polygons
    var dict_edge_polygon = {};
    for (var i = 0; i < polygons.length; i++) {
        for (var j = 0; j < 3; j++) {
            var edge_key = get_edge_key(polygons[i].vertex_ids[j],
                    polygons[i].vertex_ids[(j + 1) % 3]);

            if (!(edge_key in dict_edge_polygon))
                dict_edge_polygon[edge_key] = [];
            dict_edge_polygon[edge_key].push(polygons[i]);
        }
    }

    var keys  = Object.keys(dict_edge_polygon);
    for (var i = 0, l = keys.length; i < l; i++) {
        var edge_key = keys[i];
        for (var j = 0; j < dict_edge_polygon[edge_key].length; j++)
            for (var k = j + 1; k < dict_edge_polygon[edge_key].length; k++) {
                dict_edge_polygon[edge_key][j].neighbours.push(
                        dict_edge_polygon[edge_key][k]);
                dict_edge_polygon[edge_key][k].neighbours.push(
                        dict_edge_polygon[edge_key][j]);
            }
    }

    return navigation_mesh;
}

function compute_centroids(geometry) {
    var f, face;
    for (f = 0; f < geometry.faces.length; f++) {

        face = geometry.faces[f];
        m_vec3.add(geometry.vertices[face.indices[0]], geometry.vertices[face.indices[1]], _vec3_tmp);
        m_vec3.add(_vec3_tmp, geometry.vertices[face.indices[2]], _vec3_tmp);

        m_vec3.scale(_vec3_tmp, 1/3, face.centroid);
    }
}

function compute_normals(geometry) {
    for (var i = 0; i < geometry.faces.length; i++) {

        var face = geometry.faces[i];

        var v1 = m_vec3.subtract(geometry.vertices[face.indices[1]],
                geometry.vertices[face.indices[0]], _vec3_tmp);
        var v2 = m_vec3.subtract(geometry.vertices[face.indices[2]],
                geometry.vertices[face.indices[0]], _vec3_tmp2);
        var normal = m_vec3.cross(v1, v2, _vec3_tmp);
        m_vec3.normalize(normal, normal);
        m_vec3.copy(normal, face.normal);
    }
}

function build_navigation_mesh(geometry) {
    compute_centroids(geometry);
    compute_normals(geometry);
    merge_vertices(geometry);
    var navmesh = build_polygons_from_geometry(geometry);
    return navmesh
}

function round_number(number, decimals) {
    return parseFloat(number.toFixed(decimals));
}

function build_islands(navmesh) {
    var polygons = navmesh.polygons;
    var islands = [];
    var island_count = 0;
    var spread_island_id = function (polygon) {
        var neighbours = polygon.neighbours;
        for (var i = 0; i < neighbours.length; i++) {
            var neighbour = neighbours[i];
            if (neighbour.island == undefined) {
                neighbour.island = polygon.island;
                spread_island_id(neighbour);
            }
        }
    };
    for (var i = 0; i < polygons.length; i++) {
        var polygon = polygons[i];
        if (polygon.island == undefined) {
            polygon.island = island_count++;
            spread_island_id(polygon)
        }
        if (!islands[polygon.island])
            islands[polygon.island] = [];

        islands[polygon.island].push(polygons[i]);
    }

    return islands;
}

function indexOf(l, v) {
    if (l.indexOf)
        return l.indexOf(v);
    else
        for (var i = 0; i < l.length; i++) {
            if (l[i] == v)
                return i;
        }
    return -1;
}

var get_shared_vertices_in_order = function (a, b) {
    function shift_l(uintvec) {
        var a = uintvec[0];
        uintvec[0] = uintvec[1];
        uintvec[1] = uintvec[2];
        uintvec[2] = a;
    }
    var a_list = a.vertex_ids;
    var b_list = b.vertex_ids;
    var shared_vertices = [];
    for (var i = 0; i < a_list.length; i++) {
        if (indexOf(b_list, a_list[i]) >= 0) {
            shared_vertices.push(a_list[i])
        }
    }
    if (shared_vertices.length < 2)
        return [];
    if (indexOf(shared_vertices, a_list[0]) >= 0 &&
        indexOf(shared_vertices, a_list[a_list.length - 1]) >= 0) {
        // Vertices on both edges are bad, so shift them once to the left
        shift_l(a_list);
    }
    if (indexOf(shared_vertices, b_list[0]) >= 0 &&
        indexOf(shared_vertices, b_list[b_list.length - 1]) >= 0) {
        // Vertices on both edges are bad, so shift them once to the left
        shift_l(b_list);
    }
    // Again!
    shared_vertices = [];
    for (var i = 0; i < a_list.length; i++) {
        if (indexOf(b_list, a_list[i]) >= 0)
            shared_vertices.push(a_list[i]);
    }
    return shared_vertices;
};

function group_navmesh(navmesh) {

    var ret = {};
    var vert = navmesh.vertices;
    for (var i = 0; i < vert.length; i++) {
        vert[i][0] = round_number(vert[i][0], 2);
        vert[i][1] = round_number(vert[i][1], 2);
        vert[i][2] = round_number(vert[i][2], 2);
    }

    ret.vertices = navmesh.vertices;
    var islands = build_islands(navmesh);
    ret.islands = [];

    var find_polygon_index = function (island, p) {
        for (var i = 0; i < island.length; i++) {
            if (p === island[i]) return i;
        }
    };

    for (var i = 0; i < islands.length; i++) {
        var new_island = [];
        var island = islands[i]
        for (var j = 0; j < island.length; j++) {
            var neighbours = [];
            var poly = island[j];
            for (var k = 0; k < poly.neighbours.length; k++) {
                neighbours.push(find_polygon_index(island, poly.neighbours[k]));
            }
            // Build a portal list to each neighbour
            var portals = [];
            for (var k = 0; k < poly.neighbours.length; k++) {
                portals.push(get_shared_vertices_in_order(poly, poly.neighbours[k]));
            }

            poly.centroid[0] = round_number(poly.centroid[0], 2);
            poly.centroid[1] = round_number(poly.centroid[1], 2);
            poly.centroid[2] = round_number(poly.centroid[2], 2);

            new_island.push({
                id: find_polygon_index(island, poly),
                neighbours: neighbours,
                vertex_ids: poly.vertex_ids,
                centroid: poly.centroid,
                normal: poly.normal,
                portals: portals,
                // astar
                f: 0,
                g: 0,
                h: 0,
                cost: 1.0,
                visited: false,
                closed: false,
                parent: null
                // end astar
            });

        }
        ret.islands.push(new_island);
    }
    return ret;
}

exports.navmesh_build_from_bufs_data = function(bufs_data) {
    var vertices = m_geom.get_vbo_source_by_type(bufs_data.vbo_source_data, m_geom.VBO_FLOAT);
    var indices = bufs_data.ibo_array;
    var faces = [];
    for (var i = 0; i < indices.length; i += 3) {
        faces.push({
            indices: new Uint32Array([indices[i], indices[i + 1], indices[i + 2]]),
            centroid: new Float32Array(3),
            normal: new Float32Array(3)
        })
    }
    var vert = [];
    for (var i = 0; i < vertices.length; i += 3) {
        var v = new Float32Array(3);
        v[0] = vertices[i];
        v[1] = vertices[i + 1];
        v[2] = vertices[i + 2];
        vert.push(v);
    }
    var geometry = {
        vertices: vert,
        faces: faces
    };
    return group_navmesh(build_navigation_mesh(geometry))
};

exports.navmesh_get_island = function(navmesh, position, distance_to_closest) {
    var closest_node_group = null;
    var distance = Number.MAX_VALUE;
    var islands = navmesh.islands;
    for (var i = 0; i < islands.length; i++) {
        for (var j = 0; j < islands[i].length; j++) {
            var node = islands[i][j];

            m_vec3.subtract(node.centroid, position, _vec3_tmp);
            var measured_distance = distance_to_closest(position, node.centroid,
                    node.vertex_ids, navmesh.vertices, distance);

            if (measured_distance < distance) {
                closest_node_group = i;
                distance = measured_distance;
            }
        }
    }

    return closest_node_group;
};

/**
 * A* search algorithm
 * https://github.com/bgrins/javascript-astar/
 */
function astar_search(graph, start_node, end_node, start_pos, target_pos, vertices) {
    function init(graph) {
        for (var x = 0; x < graph.length; x++) {
            var node = graph[x];
            node.f = 0;
            node.g = 0;
            node.h = 0;
            node.cost = 1.0;
            node.visited = false;
            node.closed = false;
            node.parent = null;
        }
    }

    function heuristic(pos1, pos2) {
        m_vec3.subtract(pos1, pos2, _vec3_tmp)
        return m_vec3.dot(_vec3_tmp, _vec3_tmp);
    }

    function get_neighbours(graph, node) {
        var ret = [];
        for (var e = 0; e < node.neighbours.length; e++) {
            ret.push(graph[node.neighbours[e]]);
        }
        return ret;
    }

    init(graph);
    var open_heap = m_math.binary_heap_new(function (node) {
        return node.f;
    });
    m_math.binary_heap_push(open_heap, start_node);

    while (open_heap.content.length > 0) {
        // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
        var current_node = m_math.binary_heap_pop(open_heap);
        // End case -- result has been found, return the traced path.
        if (current_node === end_node) {
            var curr = current_node;
            var ret = [];
            while (curr.parent) {
                ret.push(curr);
                curr = curr.parent;
            }
            // push first step of path
            ret.push(start_node)

            return ret.reverse();
        }

        // Normal case -- move current_node from open to closed, process each
        // of its neighbours.
        current_node.closed = true;

        // Find all neighbours for the current node. Optionally find diagonal
        // neighbours as well (false by default).
        var neighbours = get_neighbours(graph, current_node);

        for (var i = 0, il = neighbours.length; i < il; i++) {
            var neighbour = neighbours[i];

            if (neighbour.closed) {
                // Not a valid node to process, skip to next neighbour.
                continue;
            }

            // The g score is the shortest distance from start to current node.
            // We need to check if the path we have arrived at this neighbour
            // is the shortest one we have seen yet.
            var g_score = current_node.g + m_vec3.dist(neighbour.centroid,
                    current_node.centroid);
            var been_visited = neighbour.visited;

            if (!been_visited || g_score < neighbour.g) {

                // Found an optimal (so far) path to this node.
                // Take score for node to see how good it is.
                neighbour.visited = true;
                neighbour.parent = current_node;

                neighbour.h = neighbour.h || (heuristic(neighbour.centroid, target_pos) + heuristic(neighbour.centroid, start_pos));
                neighbour.g = g_score;
                neighbour.f = neighbour.g + neighbour.h;
                if (!been_visited) {
                    // Pushing to heap will put it in proper place based on the 'f' value.
                    m_math.binary_heap_push(open_heap, neighbour);
                } else {
                    // Already seen the node, but since it has been rescored we
                    // need to reorder it in the heap
                    m_math.binary_heap_rescore_element(open_heap, neighbour);
                }
            }
        }
    }
    // No result was found - empty array signifies failure to find path.
    return [];
}

function push_vec3(array, vec3) {
    array.push(vec3[0]);
    array.push(vec3[1]);
    array.push(vec3[2]);
}

function get_rotation_sign(origin, p1, p2, normal) {
    var dir_o_p1 = m_vec3.subtract(p1, origin, _vec3_tmp);
    var dir_o_p2 = m_vec3.subtract(p2, origin, _vec3_tmp2);
    var cross = m_vec3.cross(dir_o_p1, dir_o_p2, _vec3_tmp);
    return m_util.sign(m_vec3.dot(normal, cross));
}

function vequal(a, b) {
    m_vec3.subtract(a, b, _vec3_tmp);
    return m_vec3.dot(_vec3_tmp, _vec3_tmp) < 0.00001;
}

// uses _vec3_tmp, _vec3_tmp2, _mat4_tmp3
function update_accum_mat(accum_mat, curr_portal, prev_portal) {
    var curr_portal_dir = m_vec3.subtract(curr_portal.right,
            curr_portal.left, _vec3_tmp);
    var prev_normal = prev_portal.normal;
    var curr_normal = curr_portal.normal;

    var angle = Math.acos(m_vec3.dot(prev_normal, curr_normal));
    var is_right = m_util.sign(m_vec3.dot(curr_portal_dir,
            m_vec3.cross(prev_normal, curr_normal, _vec3_tmp2)));
    angle *= -is_right;

    var mat = m_mat4.identity(_mat4_tmp3);
    m_mat4.translate(mat, curr_portal.left, mat);
    m_mat4.rotate(mat, angle, curr_portal_dir, mat)
    m_mat4.translate(mat, m_vec3.scale(curr_portal.left, -1, _vec3_tmp2), mat);
    m_mat4.multiply(accum_mat, mat, accum_mat)
    return accum_mat;
}

// uses _vec3_tmp, _vec4_tmp, _vec4_tmp2, _vec4_tmp3
function get_point_on_navmesh(accum_begin_apex, accum_end_apex,
        begin_portal, end_portal,
        first_poly_normal, interapex_accum_mat, dest) {

    // four-dimensional point vector (w === 1)
    var accum_begin_portal = m_vec3.transformMat4(begin_portal,
            interapex_accum_mat, _vec4_tmp);
    accum_begin_portal[3] = 1;
    var accum_end_portal = m_vec3.transformMat4(end_portal,
            interapex_accum_mat, _vec3_tmp);

    // four-dimensional direction vector (w === 0)
    var accum_portal_dir = m_vec3.subtract(accum_end_portal,
            accum_begin_portal, _vec4_tmp2);
    var accum_apex_dir = m_vec3.subtract(accum_end_apex, accum_begin_apex,
            _vec3_tmp);

    var normal = m_vec3.cross(first_poly_normal, accum_apex_dir, _vec4_tmp3);

    if (Math.abs(m_vec3.dot(normal, accum_portal_dir)) < 0.01) {
        var t = 1/2;
    } else {
        // four-dimensional plane representation
        m_vec3.normalize(normal, normal);
        normal[3] = - m_vec3.dot(normal, accum_end_apex);
        var t = - m_vec4.dot(normal, accum_begin_portal) /
                m_vec4.dot(normal, accum_portal_dir);
    }

    var portal_dir = m_vec3.subtract(end_portal, begin_portal, _vec3_tmp);
    return m_vec3.scaleAndAdd(begin_portal, portal_dir, t, dest);
}

// uses _mat4_tmp
// dep: uses _vec3_tmp, _vec3_tmp2, _vec4_tmp, _vec4_tmp2, _vec4_tmp3, _mat4_tmp3
function update_crucial_on_navmesh(portals, accum_new_apex, new_apex_index,
        old_portal_apex, old_apex_index, apex_normal, pts_dest, return_normals,
        normals_dest) {
    var interapex_accum_mat = m_mat4.identity(_mat4_tmp);
    for (var j = old_apex_index; j < new_apex_index; j++) {
        if (portals[j].is_crucial) {
            if (j > old_apex_index || !j) {
                // use m_vec3.create(), bcz it is a new point.
                var navmesh_point = get_point_on_navmesh(
                        accum_new_apex, old_portal_apex,
                        portals[j].left, portals[j].right,
                        apex_normal, interapex_accum_mat,
                        m_vec3.create());
                push_vec3(pts_dest, navmesh_point);
                if (return_normals)
                    push_vec3(normals_dest, portals[j].normal);

                if (j)
                    update_accum_mat(interapex_accum_mat, portals[j], portals[j-1]);
            }
        }
    }
}

/**
 * Pulling the string
 * https://skatgame.net/mburo/ps/thesis_demyen_2006.pdf
 */
function string_pull(portals, return_normals) {
    var pts = [];
    var normals = [];
    // Init scan state
    var portal_apex, portal_left, portal_right;
    var accum_portal_left, accum_portal_right, apex_normal;
    var apex_index = 0;
    var left_index = 0;
    var right_index = 0;
    portal_apex = portals[0].right;
    portal_left = portals[0].left;
    portal_right = portals[0].right;
    accum_portal_left = m_vec3.copy(portal_left, _accum_left_portal_tmp);
    accum_portal_right = m_vec3.copy(portal_right, _accum_right_portal_tmp);
    apex_normal = m_vec3.copy(portals[0].normal, _apex_normal_tmp);

    // Add start point.
    push_vec3(pts, portal_apex);
    if (return_normals)
        push_vec3(normals, portals[0].normal);

    var accum_mat = m_mat4.identity(_mat4_tmp2);

    function update_apex(point, index) {
        apex_index = index;
        left_index = apex_index;
        right_index = apex_index;

        portal_apex = point;
        portal_left = portal_apex;
        portal_right = portal_apex;
        m_vec3.copy(point, accum_portal_left);
        m_vec3.copy(point, accum_portal_right);
        m_vec3.copy(portals[apex_index].normal, apex_normal);
    }

    for (var i = 1; i < portals.length; i++) {
        var left = portals[i].left;
        var right = portals[i].right;
        var accum_left = m_vec3.transformMat4(left, accum_mat, _accum_left_tmp);
        var accum_right = m_vec3.transformMat4(right, accum_mat, _accum_right_tmp);
        if (portals[i].is_crucial)
            update_accum_mat(accum_mat, portals[i], portals[i-1]);

        // Update right vertex.
        if (get_rotation_sign(portal_apex, accum_portal_right, accum_right,
                apex_normal) <= 0.0) {
            var eq = vequal(portal_apex, portal_right);
            if (eq || get_rotation_sign(portal_apex, accum_portal_left,
                    accum_right, apex_normal) > 0.0) {
                // Tighten the funnel.
                portal_right = right;
                m_vec3.copy(accum_right, accum_portal_right);
                right_index = i;
            } else {
                var left_is_apex = vequal(accum_portal_left, portal_apex);
                if (!left_is_apex)
                    update_crucial_on_navmesh(portals, accum_portal_left,
                            left_index, portal_apex, apex_index, apex_normal, pts,
                            return_normals, normals);
                accum_mat = m_mat4.identity(accum_mat);

                // Make current left the new apex.
                // Right over left, insert left to path and
                // restart scan from portal left point.
                update_apex(portal_left, left_index);

                // Restart scan
                i = apex_index;

                if (!left_is_apex) {
                    push_vec3(pts, portal_apex);
                    if (return_normals)
                        push_vec3(normals, portals[i].normal);
                }

                continue;
            }
        }

        // Update left vertex.
        if (get_rotation_sign(portal_apex, accum_portal_left, accum_left,
                apex_normal) >= 0.0) {
            var eq = vequal(portal_apex, portal_left);
            if (eq || get_rotation_sign(portal_apex, accum_portal_right,
                    accum_left, apex_normal) < 0.0) {
                // Tighten the funnel.
                portal_left = left;
                m_vec3.copy(accum_left, accum_portal_left);
                left_index = i;
            } else {
                var right_is_apex = vequal(accum_portal_right, portal_apex);
                if (!right_is_apex)
                    update_crucial_on_navmesh(portals, accum_portal_right,
                            right_index, portal_apex, apex_index, apex_normal, pts,
                            return_normals, normals);
                accum_mat = m_mat4.identity(accum_mat);

                // Make current right the new apex.
                // Left over right, insert right to path and
                // restart scan from portal right point.
                update_apex(portal_right, right_index);

                // Restart scan
                i = apex_index;
                if (!right_is_apex) {
                    push_vec3(pts, portal_apex);
                    if (return_normals)
                        push_vec3(normals, portals[i].normal);
                }

                continue;
            }
        }
    }

    var last_index = portals.length - 1;
    var last_portal_left = portals[last_index].left;
    var is_last_apex = vequal(portal_apex, last_portal_left);
    if (!is_last_apex) {
        update_crucial_on_navmesh(portals, accum_portal_left, last_index,
                portal_apex, apex_index, apex_normal, pts, return_normals,
                normals);
    }

    if (!is_last_apex || !apex_index) {
        // Append last point to path.
        push_vec3(pts, last_portal_left);
    }

    if (return_normals) {
        push_vec3(normals, portals[last_index].normal);
        return {
            "positions": new Float32Array(pts),
            "normals": new Float32Array(normals)
        }
    } else
        return {
            "positions": new Float32Array(pts),
            "normals": null
        }
}

function is_point_in_poly(poly, pt) {
    for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
        ((poly[i][1] <= pt[1] && pt[1] < poly[j][1]) ||
        (poly[j][1] <= pt[1] && pt[1] < poly[i][1])) &&
        (pt[0] < (poly[j][0] - poly[i][0]) * (pt[1] - poly[i][1]) /
        (poly[j][1] - poly[i][1]) + poly[i][0]) && (c = !c);
    return c;
}

exports.is_vector_in_poly = is_vector_in_poly;
function is_vector_in_poly(vector, vertex_ids, vertices) {
    var polygon_vertices = [];
    for (var i = 0; i < vertex_ids.length; i++) {
        var id = vertex_ids[i];
        polygon_vertices.push(vertices[id]);
    }
    if (is_point_in_poly(polygon_vertices, vector))
        return true;
    return false;
}

function get_navmesh_closest_node(all_nodes, vertices, position,
        allowed_distance, distance_function) {

    var closest_node = null;
    var distance = Number.MAX_VALUE;

    for (var i = 0; i < all_nodes.length; i++) {
        var node = all_nodes[i];

        var measured_distance = distance_function(position, node.centroid,

                node.vertex_ids, vertices, distance);

        if (measured_distance < distance) {
            closest_node = node;
            distance = measured_distance;
        }
    }

    if (allowed_distance > 0 && distance > allowed_distance)
        return null;
    else
        return closest_node;
}

function get_portal_from_to(a, b) {
    for (var i = 0; i < a.neighbours.length; i++) {
        if (a.neighbours[i] === b.id) {
            return a.portals[i];
        }
    }
};

function channel_push(portals, p1, p2, is_crucial, normal) {
    portals.push({
        left: p1,
        right: p2,
        is_crucial: is_crucial,
        normal: normal
    });
}

function get_pulled_string(path, start_pos, target_pos, vertices, return_normals) {
    var channel_portals = [];

    channel_push(channel_portals, start_pos, start_pos, false,
            path[0] && path[0].normal || m_util.AXIS_Z);

    for (var i = 0; i < path.length; i++) {
        var polygon = path[i];
        var next_polygon = path[i + 1];
        if (next_polygon) {
            // TODO: remove magic constant
            var is_crucial = Math.abs(m_vec3.dot(polygon.normal,
                    next_polygon.normal)) < 0.999;

            var portals = get_portal_from_to(polygon, next_polygon);
            channel_push(channel_portals,
                vertices[portals[0]],
                vertices[portals[1]],
                is_crucial,
                next_polygon.normal
            );
        }
    }

    channel_push(channel_portals, target_pos, target_pos, false,
            channel_portals[channel_portals.length - 1].normal);

    return string_pull(channel_portals, return_normals);
}

exports.navmesh_find_path = function(navmesh, start_pos, target_pos, options) {
    var path = find_path(navmesh, start_pos, target_pos, options);
    if (!path || !path.length)
        return null;

    // We got the corridor
    // Now pull the rope
    if (options.do_not_pull_string) {
        return get_centroid_string(path, options.return_normals);
    } else {
        var vertices = navmesh.vertices;
        return get_pulled_string(path, start_pos, target_pos, vertices,
                options.return_normals);
    }
}

function get_centroid_string(path, return_normals) {
    if (return_normals) {
        var string = new Float32Array(3 * path.length);
        for (var i = 0; i < path.length; i++)
            string.set(path[i].centroid, 3 * i);
        return {
            "positions": string,
            "normals": null
        };
    } else {
        var positions = new Float32Array(3 * path.length);
        var normals = new Float32Array(3 * path.length);
        for (var i = 0; i < path.length; i++) {
            positions.set(path[i].centroid, 3 * i);
            normals.set(path[i].normal, 3 * i)
        }
        return {
            "positions": positions,
            "normals": normals
        };
    }
}

function find_path(navmesh, start_pos, target_pos, options) {
    var island = options.island;
    var all_nodes = navmesh.islands[island];
    var vertices = navmesh.vertices;
    var start_node = get_navmesh_closest_node(all_nodes, vertices, start_pos,
            options.allowed_distance, options.distance_to_closest);

    if (!start_node)
        return null;

    var target_node = get_navmesh_closest_node(all_nodes, vertices, target_pos,
            options.allowed_distance, options.distance_to_farthest);

    if (!target_node)
        return null;

    return astar_search(all_nodes, start_node, target_node, start_pos,
            target_pos, vertices);
}

}
