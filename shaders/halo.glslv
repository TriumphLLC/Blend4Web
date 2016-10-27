#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var PRECISION highp

#var WATER_EFFECTS 0
#var DISABLE_FOG 0
#var SKY_STARS 0
#var STATIC_BATCH 0

/*============================================================================*/
#include <std.glsl>
#include <math.glslv>
#include <to_world.glslv>

uniform mat3 u_view_tsr;
uniform mat4 u_proj_matrix;
uniform PRECISION float u_halo_size;
uniform vec3 u_camera_eye;

#if STATIC_BATCH
// NOTE:  mat3(0.0, 0.0, 0.0, --- trans
//             1.0, --- scale
//             0.0, 0.0, 0.0, 1.0, --- quat
//             0.0);
const mat3 u_model_tsr = mat3(0.0, 0.0, 0.0,
                              1.0,
                              0.0, 0.0, 0.0, 1.0,
                              0.0);
#else
uniform mat3 u_model_tsr;
#endif

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec3 a_position;
GLSL_IN vec2 a_halo_bb_vertex;
GLSL_IN float a_random_vals;
//------------------------------------------------------------------------------

GLSL_OUT vec2 v_texcoord;
GLSL_OUT float v_vertex_random;

#if WATER_EFFECTS && !DISABLE_FOG
GLSL_OUT vec4 v_position_world;
#endif

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {
    mat3 view_tsr = u_view_tsr;

    mat3 model_tsr = u_model_tsr;

    vec3 position = tsr9_transform(model_tsr, a_position);

    v_texcoord = a_halo_bb_vertex * 2.0 - 1.0;

    //random value for every halo (0..1)
    v_vertex_random = a_random_vals;

#if SKY_STARS
    mat3 bb_tsr = billboard_spherical(position, view_tsr);
    mat3 view_copy = view_tsr;
    view_copy[0][0] = 0.0;
    view_copy[0][1] = 0.0;
    view_copy[0][2] = 0.0;
#else
    mat3 bb_tsr = billboard_spherical(position, view_tsr);
#endif

    vec2 halo_bb_vertex = (a_halo_bb_vertex * 2.0 - 1.0) * u_halo_size;
    vec3 pos_local = vec3(halo_bb_vertex[0], 0.0, halo_bb_vertex[1]);
    vec3 pos_world = tsr9_transform(bb_tsr, pos_local);

#if SKY_STARS
    vec4 pos_clip = u_proj_matrix * vec4(tsr9_transform(view_copy, pos_world), 1.0);
    pos_clip.z = 0.99999 * pos_clip.w;
# if WATER_EFFECTS && !DISABLE_FOG
    v_position_world = vec4(pos_world, 1.0);
# endif
#else
    vec4 pos_clip = u_proj_matrix * vec4(tsr9_transform(view_tsr, pos_world), 1.0);
#endif

    gl_Position = pos_clip;
}
