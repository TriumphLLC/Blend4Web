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
 * Navigation mesh internal API.
 * @name navmesh
 * @namespace
 * @exports exports as navmesh
 */
b4w.module["__navmesh"] = function(exports, require) {

var m_vec3  = require("__vec3");
var m_geom  = require("__geometry");
var m_math  = require("__math")

var _vec3_tmp = new Float32Array(3);

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
        var dup_index = -1;

        // If any duplicate vertices are found in a Face3
        // we have to remove the face as nothing can be saved
        for (var n = 0; n < 3; n++) {
            if (indices[n] == indices[(n + 1) % 3]) {
                dup_index = n;
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
    for (i in unique) {
        geometry.vertices.push(unique[i])
    }
    return diff;

}

function array_intersect() {
    var i, shortest, n_shortest, n, len, ret = [], obj = {}, n_others;
    n_others = arguments.length - 1;
    n_shortest = arguments[0].length;
    shortest = 0;
    for (i = 0; i <= n_others; i++) {
        n = arguments[i].length;
        if (n < n_shortest) {
            shortest = i;
            n_shortest = n;
        }
    }

    for (i = 0; i <= n_others; i++) {
        n = (i === shortest) ? 0 : (i || shortest); // Read the shortest array first.
                                                    // Read the first array instead
                                                    // of the shortest
        len = arguments[n].length;
        for (var j = 0; j < len; j++) {
            var elem = arguments[n][j];
            if (obj[elem] === i - 1) {
                if (i === n_others) {
                    ret.push(elem);
                    obj[elem] = 0;
                } else {
                    obj[elem] = i;
                }
            } else if (i === 0) {
                obj[elem] = 0;
            }
        }
    }
    return ret;
}

function build_polygon_neighbours(polygon, navmesh) {
    polygon.neighbours = [];

    // All other nodes that contain at least two of our vertices are our neighbours
    for (var i = 0, len = navmesh.polygons.length; i < len; i++) {
        if (polygon === navmesh.polygons[i]) continue;

        // Don't check polygons that are too far, since the intersection tests
        // take a long time
        m_vec3.subtract(polygon.centroid, navmesh.polygons[i].centroid, _vec3_tmp)
        var dot = m_vec3.dot(_vec3_tmp, _vec3_tmp);
        if (dot > 100 * 100) continue;

        var matches = array_intersect(polygon.vertex_ids, navmesh.polygons[i].vertex_ids);

        if (matches.length >= 2) {
            polygon.neighbours.push(navmesh.polygons[i]);
        }
    }
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
            neighbours: []
        });
    }
    var navigation_mesh = {
        polygons: polygons,
        vertices: vertices
    };

    // Build a list of adjacent polygons
    for (var i = 0; i < polygons.length; i++) {
        build_polygon_neighbours(polygons[i], navigation_mesh);
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

function build_navigation_mesh(geometry) {
    compute_centroids(geometry);
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
        if (b_list.indexOf(a_list[i]) >= 0) {
            shared_vertices.push(a_list[i])
        }
    }
    if (shared_vertices.length < 2)
        return [];
    if (shared_vertices.indexOf(a_list[0]) >= 0 &&
            shared_vertices.indexOf(a_list[a_list.length - 1]) >= 0) {
        // Vertices on both edges are bad, so shift them once to the left
        shift_l(a_list);
    }
    if (shared_vertices.indexOf(b_list[0]) >= 0 &&
            shared_vertices.indexOf(b_list[b_list.length - 1]) >= 0) {
        // Vertices on both edges are bad, so shift them once to the left
        shift_l(b_list);
    }
    // Again!
    shared_vertices = [];
    for (var i = 0; i < a_list.length; i++) {
        if (b_list.indexOf(a_list[i]) >= 0)
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
        faces.push({indices: new Uint32Array([indices[i], indices[i + 1], indices[i + 2]]),
                    centroid: new Float32Array(3)})
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
function astar_search(graph, start, end) {
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
    m_math.binary_heap_push(open_heap, start);
    var iter = 0;
    while (open_heap.content.length > 0) {
        // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
        var current_node = m_math.binary_heap_pop(open_heap);
        // End case -- result has been found, return the traced path.
        if (current_node === end) {
            var curr = current_node;
            var ret = [];
            while (curr.parent) {
                ret.push(curr);
                curr = curr.parent;
            }
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
            var g_score = current_node.g + neighbour.cost;
            var been_visited = neighbour.visited;

            if (!been_visited || g_score < neighbour.g) {

                // Found an optimal (so far) path to this node.
                // Take score for node to see how good it is.
                neighbour.visited = true;
                neighbour.parent = current_node;
                neighbour.h = neighbour.h || heuristic(neighbour.centroid, end.centroid);
                neighbour.g = g_score;
                neighbour.f = neighbour.g + neighbour.h;
                iter++;
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

/**
 * Pulling the string
 * https://skatgame.net/mburo/ps/thesis_demyen_2006.pdf
 */
function string_pull(portals) {
    var pts = [];
    // Init scan state
    var portal_apex, portal_left, portal_right;
    var apex_index = 0;
    var leftIndex = 0;
    var rightIndex = 0;

    portal_apex = portals[0].right;
    portal_left = portals[0].left;
    portal_right = portals[0].right;

    // Add start point.
    pts.push(portal_apex);

    function triarea2(a, b, c) {
        var ax = b[0] - a[0];
        var ay = b[1] - a[1];
        var bx = c[0] - a[0];
        var by = c[1] - a[1];
        return -(bx * ay - ax * by);
    }

    function vequal(a, b) {
        m_vec3.subtract(a, b, _vec3_tmp);
        return m_vec3.dot(_vec3_tmp, _vec3_tmp) < 0.00001;
    }

    for (var i = 1; i < portals.length; i++) {
        var left = portals[i].left;
        var right = portals[i].right;
        // Update right vertex.
        if (triarea2(portal_apex, portal_right, right) <= 0.0) {
            var eq = vequal(portal_apex, portal_right);
            if (eq || triarea2(portal_apex, portal_left, right) > 0.0) {
                // Tighten the funnel.
                portal_right = right;
                rightIndex = i;
            } else {
                // Right over left, insert left to path and
                // restart scan from portal left point.
                pts.push(portal_left);

                // Make current left the new apex.
                portal_apex = portal_left;
                apex_index = leftIndex;

                // Reset portal
                portal_left = portal_apex;
                portal_right = portal_apex;
                leftIndex = apex_index;
                rightIndex = apex_index;

                // Restart scan
                i = apex_index;
                continue;
            }
        }

        // Update left vertex.
        if (triarea2(portal_apex, portal_left, left) >= 0.0) {
            var eq = vequal(portal_apex, portal_left);
            if (eq || triarea2(portal_apex, portal_right, left) < 0.0) {
                // Tighten the funnel.
                portal_left = left;
                leftIndex = i;
            } else {
                // Left over right, insert right to path and
                // restart scan from portal right point.
                pts.push(portal_right);

                // Make current right the new apex.
                portal_apex = portal_right;
                apex_index = rightIndex;

                // Reset portal
                portal_left = portal_apex;
                portal_right = portal_apex;
                leftIndex = apex_index;
                rightIndex = apex_index;

                // Restart scan
                i = apex_index;
                continue;
            }
        }
    }

    if ((pts.length === 0) || (!vequal(pts[pts.length - 1],
            portals[portals.length - 1].left))) {

        // Append last point to path.
        pts.push(portals[portals.length - 1].left);
    }

    return pts;
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

exports.navmesh_find_path = navmesh_find_path;
function navmesh_find_path(navmesh, start_pos, target_pos, group,
                            allowed_distance_to_navmesh, do_not_pull_string, distance_to_closest,
                            distance_to_farthest) {
    var all_nodes = navmesh.islands[group];
    var vertices = navmesh.vertices;

    var closest_node = null;
    var distance = Number.MAX_VALUE;

    for (var i = 0; i < all_nodes.length; i++) {
        var node = all_nodes[i];
        var measured_distance = distance_to_closest(start_pos, node.centroid,
                node.vertex_ids, vertices, distance);

        if (measured_distance < distance) {
            closest_node = node;
            distance = measured_distance;
        }
    }
    if (allowed_distance_to_navmesh > 0) {
        if (distance > allowed_distance_to_navmesh) {
            closest_node = null;
        }
    }

    if (!closest_node) {
        return null;
    }

    var farthest_node = null;
    distance = Number.MAX_VALUE;

    for (var i = 0; i < all_nodes.length; i++) {
        var node = all_nodes[i];
        var measured_distance = distance_to_farthest(target_pos, node.centroid,
                node.vertex_ids, vertices, distance);

        if (measured_distance < distance) {
            farthest_node = node;
            distance = measured_distance;
        }
    }

    if (allowed_distance_to_navmesh > 0) {
        if (distance > allowed_distance_to_navmesh) {
            farthest_node = null;
        }
    }

    if (!farthest_node) {
        return null;
    }

    var paths = astar_search(all_nodes, closest_node, farthest_node);
    var get_portal_from_to = function(a, b) {
        for (var i = 0; i < a.neighbours.length; i++) {
            if (a.neighbours[i] === b.id) {
                return a.portals[i];
            }
        }
    };

    function channel_push(portals, p1, p2) {
        portals.push({
            left: p1,
            right: p2
        });
    }

    var path = [];
    path.push(closest_node);
    if (!do_not_pull_string) {
        // We got the corridor
        // Now pull the rope
        var channel_portals = [];
        channel_push(channel_portals, start_pos, start_pos);

        for (var i = 0; i < paths.length; i++) {
            var polygon = paths[i];
            var next_polygon = paths[i + 1];
            if (next_polygon) {
                var portals = get_portal_from_to(polygon, next_polygon);
                channel_push(channel_portals,
                    vertices[portals[0]],
                    vertices[portals[1]]
                );
            }
        }

        channel_push(channel_portals, target_pos, target_pos);
        var string = string_pull(channel_portals);

        for (var i = 0; i < string.length; i++) {
            var v = new Float32Array(3);
            m_vec3.copy(string[i], v);
            path.push(v);
        }
    } else {
        for (var i = 0; i < paths.length; i++) {
            var v = new Float32Array(3);
            m_vec3.copy(paths[i].centroid, v);
            path.push(v);
        }
    }

    return path;
}
}
