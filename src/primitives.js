/**
 * Copyright (C) 2014-2015 Triumph LLC
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
    var submesh = m_util.create_empty_submesh("LINE");

    var va_frame = m_util.create_empty_va_frame();
    va_frame["a_position"] = new Float32Array(3);
    va_frame["a_direction"] = new Float32Array(3);

    submesh.va_frames[0] = va_frame;
    submesh.indices = new Uint32Array(1);
    submesh.base_length = 1;

    return submesh;
}

exports.generate_plane = function(x_size, z_size) {
    var grid_submesh = generate_grid(2, 2, x_size, z_size);
    grid_submesh.name = "PLANE";

    return grid_submesh;
}

exports.generate_grid = generate_grid;
/**
 * Subdivisions and size are from the blender
 * @methodOf primitives
 */
function generate_grid(x_subdiv, z_subdiv, x_size, z_size) {

    var indices   = [];
    var positions = [];
    var normals   = [];
    var texcoords = [];

    var delta_x = (2 * x_size) / (x_subdiv - 1);
    var delta_z = (2 * z_size) / (z_subdiv - 1);

    for (var i = 0; i < x_subdiv; i++) {

        var x = -x_size + i * delta_x;

        for (var j = 0; j < z_subdiv; j++) {

            var z = -z_size + j * delta_z;

            positions.push(x, 0, z);
            normals.push(0, 1, 0);
            texcoords.push(i / (x_subdiv - 1), j / (z_subdiv -1));

            if (i && j) {
                var idx0 = i * z_subdiv + j;
                var idx1 = idx0 - 1;
                var idx2 = (i - 1) * z_subdiv + j;
                var idx3 = idx2 - 1;
                indices.push(idx0, idx1, idx2);
                indices.push(idx1, idx3, idx2);
            }
        }
    }

    // construct submesh

    var va_frame = m_util.create_empty_va_frame();

    va_frame["a_position"] = new Float32Array(positions);
    va_frame["a_normal"] = new Float32Array(normals);

    var submesh = m_util.create_empty_submesh("GRID_PLANE");

    submesh.va_frames[0] = va_frame;
    submesh.va_common["a_texcoord"] = new Float32Array(texcoords);
    submesh.indices = new Uint32Array(indices);
    submesh.base_length = positions.length/3;

    return submesh;
}

/**
 * Extract water submesh
 */
exports.generate_multigrid = function(num_cascads, subdivs, detailed_dist) {

    var min_casc_size = detailed_dist / Math.pow(2, num_cascads - 1);
    var x_size   = min_casc_size;
    var z_size   = min_casc_size;

    var x_subdiv = subdivs + 1;
    var z_subdiv = subdivs + 1;

    var indices      = [];
    var positions    = [];

    var prev_x = 0;
    var prev_z = 0;

    var last_added_ind = -1;

    function is_merged_vertex(i, j) {
        if ( (i % 2 == 1 && (j == 0 || j == z_subdiv - 1)) ||
             (j % 2 == 1 && (i == 0 || i == x_subdiv - 1)) )
            return true;
        else
            return false;
    }

    var prev_utmost_verts = []; // prev cascad utmost verts (x, z, ind)

    for (var c = 0; c < num_cascads; c++) {

        var delta_x = (2 * x_size) / (x_subdiv - 1);
        var delta_z = (2 * z_size) / (z_subdiv - 1);

        var cur_utmost_verts  = []; // current cascad utmost verts (x, z, ind)
        var casc_indices      = []; // current cascad indices
        var all_skipped       = 0;

        for (var i = 0; i < x_subdiv; i++) {

            var x = -x_size + i * delta_x;

            var indices_in_row = [];

            for (var j = 0; j < z_subdiv; j++) {

                var z = -z_size + j * delta_z;

                // process vertices only otside previous cascad
                if (!(x > -prev_x && x < prev_x &&
                      z > -prev_z && z < prev_z)) {

                    var coinciding_ind = null;

                    // check if there exist a vertex with the same coords
                    for (var k = 0; k < prev_utmost_verts.length; k+=3) {
                        if (x == prev_utmost_verts[k] && z == prev_utmost_verts[k+1]) {
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
                            if ((j == 0 || j == z_subdiv - 1 ||
                                 i == 0 || i == x_subdiv - 1)) {

                                if (c == num_cascads - 1)
                                    var cascad_step = delta_x;
                                else
                                    var cascad_step = 2 * delta_x;

                                cur_utmost_verts.push(x, z, idx0);
                            } else
                                var cascad_step = delta_x;
                            positions.push(x, cascad_step, z);
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
                                    indices.push(idx0, idx1, idx3);
                                    indices.push(idx0, idx3, idx2);
                                } else {
                                    var idx2 = casc_indices[i-1][j+1];
                                    var idx3 = idx2 - 1;
                                    indices.push(idx0, idx3, idx2);
                                }
                            } else if (!is_merged_vertex(i, j)) {
                                var idx1 = idx0 - 1;
                                var idx2 = casc_indices[i-1][j];
                                indices.push(idx0, idx1, idx2);
                            }
                        } else if ( i == x_subdiv - 1 ) {
                            // last column
                            if (!is_merged_vertex(i, j)) {
                                if (j == z_subdiv - 1) {
                                    // build lower-right corner
                                    var idx1 = idx0 - 1;
                                    var idx2 = casc_indices[i-1][j-1];
                                    var idx3 = casc_indices[i-2][j];
                                    indices.push(idx0, idx1, idx2);
                                    indices.push(idx0, idx2, idx3);
                                } else {
                                    var idx1 = idx0 - 1;
                                    var idx2 = casc_indices[i-1][j];
                                    var idx3 = idx2 - 1;
                                    var idx4 = idx2 + 1;
                                    indices.push(idx0, idx1, idx3);
                                    indices.push(idx0, idx3, idx2);
                                    indices.push(idx0, idx2, idx4);
                                    if (j == 2) {
                                        // build upper-right corner
                                        idx4 = casc_indices[i-2][j-2];
                                        indices.push(idx1, idx4, idx3);
                                    }
                                }
                            }
                        } else if ( j == 1 ) {
                            // 2-nd row
                            if (!is_merged_vertex(i, j-1)) {
                                var idx1 = indices_in_row[j-1];
                                var idx2 = casc_indices[i-1][j];
                                var idx3 = casc_indices[i-2][j-1];
                                indices.push(idx0, idx1, idx2);
                                indices.push(idx1, idx3, idx2);
                            } else {
                                var idx1 = casc_indices[i-1][j];
                                var idx2 = casc_indices[i-1][j-1];
                                indices.push(idx0, idx2, idx1);
                            }
                        } else if ( j == z_subdiv - 1 ) {
                            // last row
                            if (!is_merged_vertex(i, j)) {
                                var idx1 = indices_in_row[j-1];
                                var idx2 = casc_indices[i-1][j-1];
                                var idx3 = casc_indices[i-2][j];
                                indices.push(idx0, idx1, idx2);
                                indices.push(idx0, idx2, idx3);
                            }
                        } else if (casc_indices[i-1][j]   != -1
                                && casc_indices[i-1][j-1] != -1
                                && indices_in_row[j-1]     != -1) {

                            var idx1 = indices_in_row[j-1];
                            var idx2 = casc_indices[i-1][j];
                            var idx3 = casc_indices[i-1][j-1];
                            indices.push(idx0, idx1, idx2);
                            indices.push(idx1, idx3, idx2);
                            if (j == z_subdiv - 2 && is_merged_vertex(i, j+1)) {
                                var idx4 = casc_indices[i-1][j+1]
                                indices.push(idx0, idx2, idx4);
                            }
                        } else if (j == z_subdiv - 2 && is_merged_vertex(i, j+1)) {
                                var idx2 = casc_indices[i-1][j];
                                var idx4 = casc_indices[i-1][j+1]
                                indices.push(idx0, idx2, idx4);
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
        prev_z =  z_size;

        x_size *= 2;
        z_size *= 2;
    }

    // generate outer cascad from 8 vertices [Optional]
    var required_mesh_size = 20000;
    if (prev_x < required_mesh_size) {

        var casc_step = -(2 * prev_x) / (x_subdiv - 1);

        positions.push(-required_mesh_size, casc_step, -required_mesh_size  );
        positions.push(-required_mesh_size, casc_step,  required_mesh_size  );
        positions.push(-prev_x, casc_step, -prev_z);
        positions.push(-prev_x, casc_step,  prev_z);
        positions.push( required_mesh_size, casc_step, -required_mesh_size  );
        positions.push( required_mesh_size, casc_step,  required_mesh_size  );
        positions.push( prev_x, casc_step, -prev_z);
        positions.push( prev_x, casc_step,  prev_z);

        var idx0 = last_added_ind + 1;
        indices.push(idx0 + 3, idx0 + 2, idx0 + 1,
                     idx0 + 2, idx0 + 0, idx0 + 1,
                     idx0 + 6, idx0 + 4, idx0 + 2,
                     idx0 + 4, idx0 + 0, idx0 + 2,
                     idx0 + 5, idx0 + 7, idx0 + 1,
                     idx0 + 7, idx0 + 3, idx0 + 1,
                     idx0 + 5, idx0 + 4, idx0 + 7,
                     idx0 + 7, idx0 + 4, idx0 + 6);
    }

    // construct submesh
    var va_frame = m_util.create_empty_va_frame();

    va_frame["a_position"] = new Float32Array(positions);

    var submesh = m_util.create_empty_submesh("multigrid_plane");

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
        throw "Wrong array";

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

    var submesh = m_util.create_empty_submesh("FROM_TRIANGLES");

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
        throw "Wrong array";

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

    var submesh = m_util.create_empty_submesh("FROM_QUADS");

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

    var submesh = m_util.create_empty_submesh("FULLSCREEN_TRI");

    var va_frame = m_util.create_empty_va_frame();
    va_frame["a_position"] = new Float32Array([0, 0, 1, 0, 0, 1]);

    submesh.va_frames[0] = va_frame;
    submesh.indices = new Uint32Array([0, 1, 2]);
    submesh.base_length = 3;

    return submesh;
}

exports.generate_fullscreen_quad = function() {

    var submesh = m_util.create_empty_submesh("FULLSCREEN_QUAD");

    var va_frame = m_util.create_empty_va_frame();
    va_frame["a_position"] = new Float32Array([-1,  1, 1,  1, -1, -1, 1, -1]);

    submesh.va_frames[0] = va_frame;
    submesh.indices = new Uint32Array([0, 2, 1, 1, 2, 3]);
    submesh.base_length = 4;

    return submesh;
}

exports.generate_billboard = function() {

    var submesh = m_util.create_empty_submesh("BILLBOARD");

    var va_frame = m_util.create_empty_va_frame();
    va_frame["a_bb_vertex"] = new Float32Array([-0.5,-0.5, -0.5,0.5, 0.5,0.5, 0.5,-0.5]);

    submesh.va_frames[0] = va_frame;
    submesh.indices = new Uint32Array([0, 2, 1, 0, 3, 2]);
    submesh.base_length = 4;

    return submesh;
}

exports.generate_cube = function() {

    var submesh = m_util.create_empty_submesh("CUBEMAP_BOARD");

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
    var submesh = m_util.create_empty_submesh("UV_SPHERE");

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
        va_frame["a_normal"] = [];
    } else {

        var shared_indices = m_geom.calc_shared_indices(indices, 
                grid_positions, positions);

        va_frame["a_normal"] = m_geom.calc_normals(indices, positions, 
                shared_indices);
    }

    va_frame["a_tangent"] = [];

    submesh.va_common["a_influence"] = [];
    submesh.va_common["a_color"]     = [];
    submesh.va_common["a_texcoord"]  = [];
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

    var submesh = m_util.create_empty_submesh("INDEX");

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
