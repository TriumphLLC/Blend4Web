#var PRECISION lowp

#include <math.glslv>
#include <to_world.glslv>

attribute vec3 a_position;
attribute vec2 a_halo_bb_vertex;

uniform mat4 u_proj_matrix;
uniform mat4 u_view_matrix;
uniform PRECISION float u_halo_size;

varying vec2 v_texcoord;
varying float v_vertex_random;

#if STATIC_BATCH
const mat4 u_model_matrix = mat4(1.0);
#else
uniform mat4 u_model_matrix;
#endif

#if WATER_EFFECTS && !DISABLE_FOG
    varying vec4 v_position_world;
#endif

void main(void) {

    vec3 position = (u_model_matrix * vec4(a_position, 1.0)).xyz;

    v_texcoord = a_halo_bb_vertex * 2.0;

    //random value for every halo (0..1)
    v_vertex_random = fract(position.x + position.y + position.z);

#if SKY_STARS
    mat4 bb_matrix = billboard_spherical(position, u_view_matrix);
    mat4 view_copy = u_view_matrix;
    view_copy[3][0] = 0.0;
    view_copy[3][1] = 0.0;
    view_copy[3][2] = 0.0;
#else
    mat4 bb_matrix = billboard_spherical(position, u_view_matrix);
#endif

    vec4 pos_local = vec4(a_halo_bb_vertex * 2.0 * u_halo_size, 0.0, 1.0);
    vec4 pos_world = bb_matrix * pos_local;

#if SKY_STARS
    vec4 pos_clip = u_proj_matrix * view_copy * pos_world;
    pos_clip.z = 0.99999 * pos_clip.w;
# if WATER_EFFECTS && !DISABLE_FOG
    v_position_world = pos_world;
# endif
#else
    vec4 pos_clip = u_proj_matrix * u_view_matrix * pos_world;
#endif

    gl_Position = pos_clip;
}
