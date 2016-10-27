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
 * Generates submeshes with primitive geometry.
 * @name primitives
 * @namespace
 * @exports exports as primitives
 */
b4w.module["__primitives"] = function(exports, require) {

var m_cfg   = require("__config");
var m_geom  = require("__geometry");
var m_print = require("__print");
var m_util  = require("__util");

var cfg_def  = m_cfg.defaults;

exports.generate_line = function() {
    var submesh = m_geom.init_submesh("LINE");

    var va_frame = m_util.create_empty_va_frame();
    va_frame["a_position"] = new Float32Array(3);
    va_frame["a_direction"] = new Float32Array(3);

    submesh.va_frames[0] = va_frame;
    submesh.indices = new Uint32Array(1);
    submesh.base_length = 1;

    return submesh;
}

exports.generate_plane = function(x_size, y_size) {
    var grid_submesh = generate_grid(2, 2, x_size, y_size);
    grid_submesh.name = "PLANE";

    return grid_submesh;
}

exports.generate_grid = generate_grid;
/**
 * Subdivisions and size are from the blender
 * @methodOf primitives
 */
function generate_grid(x_subdiv, y_subdiv, x_size, y_size) {

    var indices   = [];
    var positions = [];
    var texcoords = [];
    var tbn_quats = [];

    var delta_x = (2 * x_size) / (x_subdiv - 1);
    var delta_y = (2 * y_size) / (y_subdiv - 1);

    for (var i = 0; i < x_subdiv; i++) {

        var x = -x_size + i * delta_x;

        for (var j = 0; j < y_subdiv; j++) {

            var y = -y_size + j * delta_y;

            positions.push(x, y, 0);
            tbn_quats.push(0, 0, 0, 1);
            texcoords.push(i / (x_subdiv - 1), j / (y_subdiv -1));

            if (i && j) {
                var idx0 = i * y_subdiv + j;
                var idx1 = idx0 - 1;
                var idx2 = (i - 1) * y_subdiv + j;
                var idx3 = idx2 - 1;
                indices.push(idx0, idx1, idx2);
                indices.push(idx1, idx3, idx2);
            }
        }
    }

    // construct submesh

    var va_frame = m_util.create_empty_va_frame();

    va_frame["a_position"] = new Float32Array(positions);
    va_frame["a_tbn_quat"] = new Float32Array(tbn_quats);

    var submesh = m_geom.init_submesh("GRID_PLANE");

    submesh.va_frames[0] = va_frame;
    submesh.va_common["a_texcoord"] = new Float32Array(texcoords);
    submesh.indices = new Uint32Array(indices);
    submesh.base_length = positions.length/3;

    return submesh;
}

/**
 * Extract water submesh
 */
exports.generate_cascaded_grid = function(num_cascads, subdivs, detailed_dist) {

    var min_casc_size = detailed_dist / Math.pow(2, num_cascads - 1);
    var x_size   = min_casc_size;
    var y_size   = min_casc_size;

    var x_subdiv = subdivs + 1;
    var y_subdiv = subdivs + 1;

    var indices      = [];
    var positions    = [];
    var tbn_quats    = [];

    var prev_x = 0;
    var prev_y = 0;

    var last_added_ind = -1;

    function is_merged_vertex(i, j) {
        if ( (i % 2 == 1 && (j == 0 || j == y_subdiv - 1)) ||
             (j % 2 == 1 && (i == 0 || i == x_subdiv - 1)) )
            return true;
        else
            return false;
    }

    var prev_utmost_verts = []; // prev cascad utmost verts (x, y, ind)

    for (var c = 0; c < num_cascads; c++) {

        var delta_x = (2 * x_size) / (x_subdiv - 1);
        var delta_y = (2 * y_size) / (y_subdiv - 1);

        var cur_utmost_verts  = []; // current cascad utmost verts (x, y, ind)
        var casc_indices      = []; // current cascad indices
        var all_skipped       = 0;

        for (var i = 0; i < x_subdiv; i++) {

            var x = -x_size + i * delta_x;

            var indices_in_row = [];

            for (var j = 0; j < y_subdiv; j++) {

                var y = -y_size + j * delta_y;

                // process vertices only otside previous cascad
                if (!(x > -prev_x && x < prev_x &&
                      y > -prev_y && y < prev_y)) {

                    var coinciding_ind = null;

                    // check if there exist a vertex with the same coords
                    for (var k = 0; k < prev_utmost_verts.length; k+=3) {
                        if (x == prev_utmost_verts[k] && y == prev_utmost_verts[k+1]) {
                            coinciding_ind = prev_utmost_verts[k+2];
                            break;
                        }
                    }

                    if (coinciding_ind !== null) {
                        var idx0 = coinciding_ind;
                    } else
                        var idx0 = last_added_ind + 1;

                    // push to positions array if needed
                    if ( !is_merged_vertex(i, j) ) {
                        if (coinciding_ind == null) {
                            if ((j == 0 || j == y_subdiv - 1 ||
                                 i == 0 || i == x_subdiv - 1)) {

                                if (c == num_cascads - 1)
                                    var cascad_step = delta_x;
                                else
                                    var cascad_step = 2 * delta_x;

                                cur_utmost_verts.push(x, y, idx0);
                            } else
                                var cascad_step = delta_x;
                            positions.push(x, y, cascad_step);
                            tbn_quats.push(0.707,0,0,0.707);
                            last_added_ind++; 
                        }
                        indices_in_row.push(idx0);
                    } else {
                        indices_in_row.push(-2); // is odd utmost
                        all_skipped++;
                    }

                    if (i && j) {
                        // for not utmost vertices
                        if ( i == 1 ) {
                            // 2-nd column 
                            if (is_merged_vertex(i-1, j)) {
                                if ( j > 1) {
                                    var idx1 = idx0 - 1;
                                    var idx2 = casc_indices[i-1][j+1];
                                    var idx3 = idx2 - 1;
                                    indices.push(idx3, idx1, idx0);
                                    indices.push(idx2, idx3, idx0);
                                } else {
                                    var idx2 = casc_indices[i-1][j+1];
                                    var idx3 = idx2 - 1;
                                    indices.push(idx2, idx3, idx0);
                                }
                            } else if (!is_merged_vertex(i, j)) {
                                var idx1 = idx0 - 1;
                                var idx2 = casc_indices[i-1][j];
                                indices.push(idx2, idx1, idx0);
                            }
                        } else if ( i == x_subdiv - 1 ) {
                            // last column
                            if (!is_merged_vertex(i, j)) {
                                if (j == y_subdiv - 1) {
                                    // build lower-right corner
                                    var idx1 = idx0 - 1;
                                    var idx2 = casc_indices[i-1][j-1];
                                    var idx3 = casc_indices[i-2][j];
                                    indices.push(idx2, idx1, idx0);
                                    indices.push(idx3, idx2, idx0);
                                } else {
                                    var idx1 = idx0 - 1;
                                    var idx2 = casc_indices[i-1][j];
                                    var idx3 = idx2 - 1;
                                    var idx4 = idx2 + 1;
                                    indices.push(idx3, idx1, idx0);
                                    indices.push(idx2, idx3, idx0);
                                    indices.push(idx4, idx2, idx0);
                                    if (j == 2) {
                                        // build upper-right corner
                                        idx4 = casc_indices[i-2][j-2];
                                        indices.push(idx3, idx4, idx1);
                                    }
                                }
                            }
                        } else if ( j == 1 ) {
                            // 2-nd row
                            if (!is_merged_vertex(i, j-1)) {
                                var idx1 = indices_in_row[j-1];
                                var idx2 = casc_indices[i-1][j];
                                var idx3 = casc_indices[i-2][j-1];
                                indices.push(idx2, idx1, idx0);
                                indices.push(idx2, idx3, idx1);
                            } else {
                                var idx1 = casc_indices[i-1][j];
                                var idx2 = casc_indices[i-1][j-1];
                                indices.push(idx1, idx2, idx0);
                            }
                        } else if ( j == y_subdiv - 1 ) {
                            // last row
                            if (!is_merged_vertex(i, j)) {
                                var idx1 = indices_in_row[j-1];
                                var idx2 = casc_indices[i-1][j-1];
                                var idx3 = casc_indices[i-2][j];
                                indices.push(idx2, idx1, idx0);
                                indices.push(idx3, idx2, idx0);
                            }
                        } else if (casc_indices[i-1][j]   != -1
                                && casc_indices[i-1][j-1] != -1
                                && indices_in_row[j-1]     != -1) {

                            var idx1 = indices_in_row[j-1];
                            var idx2 = casc_indices[i-1][j];
                            var idx3 = casc_indices[i-1][j-1];
                            indices.push(idx2, idx1, idx0);
                            indices.push(idx2, idx3, idx1);
                            if (j == y_subdiv - 2 && is_merged_vertex(i, j+1)) {
                                var idx4 = casc_indices[i-1][j+1]
                                indices.push(idx4, idx2, idx0);
                            }
                        } else if (j == y_subdiv - 2 && is_merged_vertex(i, j+1)) {
                                var idx2 = casc_indices[i-1][j];
                                var idx4 = casc_indices[i-1][j+1]
                                indices.push(idx4, idx2, idx0);
                        }
                    }
                } else {
                    indices_in_row.push(-1);
                    all_skipped++;
                }
            }
            casc_indices.push(indices_in_row);

        }
        prev_utmost_verts = cur_utmost_verts;

        prev_x =  x_size;
        prev_y =  y_size;

        x_size *= 2;
        y_size *= 2;
    }

    // generate outer cascad from 8 vertices [Optional]
    var required_mesh_size = 20000;
    if (prev_x < required_mesh_size) {

        var casc_step = -(2 * prev_x) / (x_subdiv - 1);

        positions.push(-required_mesh_size, -required_mesh_size, casc_step);
        positions.push(-required_mesh_size,  required_mesh_size, casc_step);
        positions.push(-prev_x, -prev_y, casc_step);
        positions.push(-prev_x,  prev_y, casc_step);
        positions.push( required_mesh_size, -required_mesh_size, casc_step);
        positions.push( required_mesh_size,  required_mesh_size, casc_step);
        positions.push( prev_x, -prev_y, casc_step);
        positions.push( prev_x,  prev_y, casc_step);

        var idx0 = last_added_ind + 1;
        indices.push(idx0 + 1, idx0 + 2, idx0 + 3,
                     idx0 + 1, idx0 + 0, idx0 + 2,
                     idx0 + 2, idx0 + 4, idx0 + 6,
                     idx0 + 2, idx0 + 0, idx0 + 4,
                     idx0 + 1, idx0 + 7, idx0 + 5,
                     idx0 + 1, idx0 + 3, idx0 + 7,
                     idx0 + 7, idx0 + 4, idx0 + 5,
                     idx0 + 6, idx0 + 4, idx0 + 7);
        for (var i = 0; i < 8; i++)
            tbn_quats.push(0.707,0,0,0.707);
    }

    // construct submesh
    var va_frame = m_util.create_empty_va_frame();

    va_frame["a_position"] = new Float32Array(positions);
    va_frame["a_tbn_quat"] = new Float32Array(tbn_quats);

    var submesh = m_geom.init_submesh("MULTIGRID_PLANE");

    submesh.va_frames[0] = va_frame;
    submesh.indices = new Uint32Array(indices);
    submesh.base_length = positions.length/3;

    // debug wireframe mode
    if (cfg_def.water_wireframe_debug) {
        m_geom.submesh_drop_indices(submesh, 1, true);
        va_frame["a_polyindex"]  = m_geom.extract_polyindices(submesh);
    }

    return submesh;
}

/**
 * Generate submesh for shadeless rendering (w/o normals)
 * verts must be CCW if you look at the front face of triangle
 */
exports.generate_from_triangles = function(verts) {
    var len = verts.length;
    if (len % 3)
        m_util.panic("Wrong array");

    var indices   = [];
    var positions = [];

    for (var i = 0; i < len; i+=3) {
        var v1 = verts[i];
        var v2 = verts[i+1];
        var v3 = verts[i+2];

        add_vec3_to_array(v1, positions);
        add_vec3_to_array(v2, positions);
        add_vec3_to_array(v3, positions);

        indices.push(i, i+1, i+2);
    }

    // construct submesh

    var va_frame = m_util.create_empty_va_frame();

    va_frame["a_position"] = new Float32Array(positions);

    var submesh = m_geom.init_submesh("FROM_TRIANGLES");

    submesh.va_frames[0] = va_frame;
    submesh.indices = new Uint32Array(indices);
    submesh.base_length = positions.length/3;

    return submesh;
}

exports.generate_from_quads = generate_from_quads; 
/**
 * Generate submesh for shadeless rendering (w/o normals).
 * verts must be CCW if you look at the front face of quad
 * @methodOf primitives
 */
function generate_from_quads(verts) {


    var len = verts.length;
    if (len % 4)
        m_util.panic("Wrong array");

    var indices   = [];
    var positions = [];

    for (var i = 0; i < len; i+=4) {
        var v1 = verts[i];
        var v2 = verts[i+1];
        var v3 = verts[i+2];
        var v4 = verts[i+3];

        add_vec3_to_array(v1, positions);
        add_vec3_to_array(v2, positions);
        add_vec3_to_array(v3, positions);
        add_vec3_to_array(v4, positions);

        indices.push(i, i+1, i+2);
        indices.push(i, i+2, i+3);
    }

    // construct submesh

    var va_frame = m_util.create_empty_va_frame();

    va_frame["a_position"] = new Float32Array(positions);

    var submesh = m_geom.init_submesh("FROM_QUADS");

    submesh.va_frames[0] = va_frame;
    submesh.indices = new Uint32Array(indices);
    submesh.base_length = positions.length/3;

    return submesh;
}

/**
 * Generate frustum submesh from submesh corners.
 * <p>NOTE1: corners must be near and far planes
 * <p>NOTE2: near plane - CCW, far plane - CW (from viewer point)
 * <p>NOTE3: left buttom vertex of near and far plane are joined
 */
exports.generate_frustum = function(corners) {

    var corners = m_util.vectorize(corners, []); 

    // TODO: implement simple method to generate frustum geometry
    var quads = [];

    // near quad
    quads.push(corners[0], corners[1], corners[2], corners[3]);

    // left quad
    quads.push(corners[0], corners[3], corners[5], corners[4]);
    // top quad
    quads.push(corners[3], corners[2], corners[6], corners[5]);
    // right quad
    quads.push(corners[1], corners[7], corners[6], corners[2]);
    // buttom quad
    quads.push(corners[0], corners[4], corners[7], corners[1]);

    // far quad
    quads.push(corners[4], corners[5], corners[6], corners[7]);

    var submesh = generate_from_quads(quads);
    submesh.name = "FRUSTUM";

    return submesh;
}

exports.generate_fullscreen_tri = function() {

    var submesh = m_geom.init_submesh("FULLSCREEN_TRI");

    var va_frame = m_util.create_empty_va_frame();
    va_frame["a_position"] = new Float32Array([0, 0, 1, 0, 0, 1]);

    submesh.va_frames[0] = va_frame;
    submesh.indices = new Uint32Array([0, 1, 2]);
    submesh.base_length = 3;

    return submesh;
}

exports.generate_fullscreen_quad = function() {

    var submesh = m_geom.init_submesh("FULLSCREEN_QUAD");

    var va_frame = m_util.create_empty_va_frame();
    va_frame["a_position"] = new Float32Array([-1,  1, 1,  1, -1, -1, 1, -1]);

    submesh.va_frames[0] = va_frame;
    submesh.indices = new Uint32Array([0, 2, 1, 1, 2, 3]);
    submesh.base_length = 4;

    return submesh;
}

exports.generate_billboard = function() {

    var submesh = m_geom.init_submesh("BILLBOARD");

    var va_frame = m_util.create_empty_va_frame();
    va_frame["a_bb_vertex"] = m_geom.gen_bb_vertices(1);

    submesh.va_frames[0] = va_frame;
    submesh.indices = new Uint32Array([0, 2, 1, 0, 3, 2]);
    submesh.base_length = 4;

    return submesh;
}

exports.generate_cube = function() {

    var submesh = m_geom.init_submesh("CUBEMAP_BOARD");

    var va_frame = m_util.create_empty_va_frame();
    va_frame["a_position"] = new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]); 

    submesh.va_frames[0] = va_frame;
    submesh.indices = new Uint32Array([0, 2, 1, 0, 3, 2]);
    submesh.base_length = 4;

    return submesh;
}

/**
 * Return uv sphere submesh
 *
 * size - sphere radius
 */
exports.generate_uv_sphere = function(segments, rings, size, center, 
        use_smooth, use_wireframe) {
    var submesh = m_geom.init_submesh("UV_SPHERE");

	var x, y;
    
    var positions = [];
    var grid_positions = [];
    var indices = [];

	for (y = 0; y <= rings; y++) {
		for (x = 0; x <= segments; x++) {

			var u = x / segments;
			var v = y / rings;

			var xpos = -size * Math.cos(u * 2*Math.PI) * Math.sin(v * Math.PI);
			var ypos = size * Math.cos(v * Math.PI);
			var zpos = size * Math.sin(u * 2*Math.PI) * Math.sin(v * Math.PI);

            // clamp near-zero values to improve TBN smoothing quality
            if (use_smooth) {
                var edge = 0.00001;
                xpos = (Math.abs(xpos) < edge) ? 0 : xpos;
                ypos = (Math.abs(ypos) < edge) ? 0 : ypos;
                zpos = (Math.abs(zpos) < edge) ? 0 : zpos;
            }

			grid_positions.push(xpos + center[0], ypos + center[1], 
                    zpos + center[2]);
		}
	}

    var v_index = 0;
	for (y = 0; y < rings; y++) {
		for (x = 0; x < segments; x++) {

			var v1 = extract_vec3(grid_positions, (segments+1)*y + x + 1);
			var v2 = extract_vec3(grid_positions, (segments+1)*y + x);
			var v3 = extract_vec3(grid_positions, (segments+1)*(y + 1) + x);
			var v4 = extract_vec3(grid_positions, (segments+1)*(y + 1) + x + 1);
            
            // upper pole
			if (Math.abs(v1[1]) == (size + center[1])) {

                add_vec3_to_array(v1, positions);
                add_vec3_to_array(v3, positions);
                add_vec3_to_array(v4, positions);

                if (use_wireframe)
                    indices.push(v_index, v_index+1, v_index+1, v_index+2, 
                            v_index+2, v_index);
                else
                    indices.push(v_index, v_index+1, v_index+2);
                v_index += 3;

            // lower pole
			} else if (Math.abs(v3[1]) == (size + center[1])) {
                add_vec3_to_array(v1, positions);
                add_vec3_to_array(v2, positions);
                add_vec3_to_array(v3, positions);

                if (use_wireframe)
                    indices.push(v_index, v_index+1, v_index+1, v_index+2, 
                            v_index+2, v_index);
                else
                    indices.push(v_index, v_index+1, v_index+2);
                v_index += 3;

			} else {
                add_vec3_to_array(v1, positions);
                add_vec3_to_array(v2, positions);
                add_vec3_to_array(v3, positions);
                add_vec3_to_array(v4, positions);

                if (use_wireframe) {
                    indices.push(v_index, v_index+1);
                    indices.push(v_index+1, v_index+2);
                    indices.push(v_index+2, v_index+3);
                    indices.push(v_index+3, v_index);
                } else {
                    indices.push(v_index, v_index+1, v_index+2);
                    indices.push(v_index, v_index+2, v_index+3);
                }

                v_index += 4;
			}
		}
	}

    // construct submesh

    var va_frame = {};

    va_frame["a_position"] = positions;

    if (use_wireframe) {
        va_frame["a_tbn_quat"] = [];
    } else {

        var shared_indices = m_geom.calc_shared_indices(indices, 
                grid_positions, positions);

        var normals = m_geom.calc_normals(indices, positions, 
                shared_indices);
        va_frame["a_tbn_quat"] = m_util.gen_tbn_quats(normals);
    }

    submesh.va_frames[0] = va_frame;
    submesh.indices = indices;
    submesh.base_length = positions.length/3;

    return submesh;
}

/**
 * Position in vectors, not values
 */
function extract_vec3(array, position) {
    var offset = position*3;
    var x = array[offset];
    var y = array[offset+1];
    var z = array[offset+2];

    return [x,y,z];
}

function add_vec3_to_array(vec, array) {
    array.push(vec[0], vec[1], vec[2]);
}

exports.generate_index = function(num) {

    var submesh = m_geom.init_submesh("INDEX");

    var va_frame = m_util.create_empty_va_frame();
    va_frame["a_index"] = new Float32Array(num);
    for (var i = 0; i < num; i++)
        va_frame["a_index"][i] = i;

    submesh.va_frames[0] = va_frame;
    submesh.indices = new Uint16Array(0);
    submesh.base_length = num;

    return submesh;
}


}
