#var AU_QUALIFIER uniform
#var PRECISION lowp
#var MAX_BONES 0

/*============================================================================
                                  INCLUDES
============================================================================*/

#include <math.glslv>
#include <to_world.glslv>

/*============================================================================
                                  ATTRIBUTES
============================================================================*/

attribute vec3 a_position;
attribute vec3 a_normal;
attribute float a_polyindex;

#if !DEBUG_SPHERE
# if WIND_BEND
#  if MAIN_BEND_COL
attribute float a_bending_col_main;
#   if DETAIL_BEND
attribute vec3 a_bending_col_detail;
AU_QUALIFIER float au_detail_bending_amp;
AU_QUALIFIER float au_branch_bending_amp;
AU_QUALIFIER float au_detail_bending_freq;
#   endif
#  endif
AU_QUALIFIER float au_wind_bending_amp;
AU_QUALIFIER float au_wind_bending_freq;
# if BEND_CENTER_ONLY
    attribute vec3 a_emitter_center;
# endif
# endif

# if WIND_BEND || DYNAMIC_GRASS || BILLBOARD
AU_QUALIFIER vec3 au_center_pos;
# endif

# if VERTEX_ANIM
attribute vec3 a_position_next;
# endif

# if SKINNED
attribute vec4 a_influence;
# endif
#endif // DEBUG_SPHERE

/*============================================================================
                                   UNIFORMS
============================================================================*/

#if STATIC_BATCH
const mat4 u_model_matrix = mat4(1.0);
#else
uniform mat4 u_model_matrix;
#endif

uniform mat4 u_proj_matrix;
uniform mat4 u_view_matrix;

#if !DEBUG_SPHERE
# if WIND_BEND
uniform vec3 u_wind;
uniform PRECISION float u_time;
#  if BILLBOARD && BILLBOARD_JITTERED
uniform float u_jitter_amp;
uniform float u_jitter_freq;
#  endif
# endif

# if DYNAMIC_GRASS || BILLBOARD
uniform vec3 u_camera_eye;
# endif

# if VERTEX_ANIM
uniform float u_va_frame_factor;
# endif

# if SKINNED
uniform vec4 u_quatsb[MAX_BONES];
uniform vec4 u_transb[MAX_BONES];
#  if FRAMES_BLENDING
uniform vec4 u_quatsa[MAX_BONES];
uniform vec4 u_transa[MAX_BONES];
// near 0 if before, near 1 if after
uniform float u_frame_factor;
#  endif
# endif

# if DYNAMIC_GRASS
uniform sampler2D u_grass_map_depth;
uniform sampler2D u_grass_map_color;
uniform vec4 u_camera_quat;
uniform vec3 u_grass_map_dim;
uniform float u_grass_size;
uniform float u_scale_threshold;
# endif
#endif // DEBUG_SPHERE

/*============================================================================
                                   VARYINGS
============================================================================*/

varying vec3 v_barycentric;

/*============================================================================
                                  INCLUDES
============================================================================*/

#if !DEBUG_SPHERE
#include <skin.glslv>
#include <wind_bending.glslv>
#include <dynamic_grass.glslv>
#endif

/*============================================================================
                                    MAIN
============================================================================*/

void main() {
    if (a_polyindex == 0.0)
        v_barycentric = vec3(1.0, 0.0, 0.0);
    else if (a_polyindex == 1.0)
        v_barycentric = vec3(0.0, 1.0, 0.0);
    else if (a_polyindex == 2.0)
        v_barycentric = vec3(0.0, 0.0, 1.0);

    vec3 position = a_position;
    vec3 normal = a_normal;

#if DEBUG_SPHERE
    vertex world = to_world(position, vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0),
            u_model_matrix);
#else
# if VERTEX_ANIM
    position = mix(position, a_position_next, u_va_frame_factor);
#endif

# if SKINNED
    vec3 tangent = vec3(0.0);
    vec3 binormal = vec3(0.0);
    skin(position, tangent, binormal, normal);
#endif

# if WIND_BEND || DYNAMIC_GRASS || BILLBOARD
    vec3 center = au_center_pos;
# else
    vec3 center = vec3(0.0);
# endif

# if DYNAMIC_GRASS
    vertex world = grass_vertex(position, vec3(0.0), vec3(0.0), vec3(0.0),
            center, u_grass_map_depth, u_grass_map_color,
            u_grass_map_dim, u_grass_size, u_camera_eye, u_camera_quat,
            u_view_matrix);
# else
#  if BILLBOARD
    vec3 wcen = (u_model_matrix * vec4(center, 1.0)).xyz;
    mat4 model_matrix = billboard_matrix(u_camera_eye, wcen, u_view_matrix);
#   if WIND_BEND && BILLBOARD_JITTERED
    vec3 vec_seed = (u_model_matrix * vec4(center, 1.0)).xyz;
    model_matrix = model_matrix * bend_jitter_matrix(u_wind, u_time,
            u_jitter_amp, u_jitter_freq, vec_seed);
#   endif
    vertex world = to_world(position - center, center, vec3(0.0), vec3(0.0),
            vec3(0.0), model_matrix);
    world.center = wcen;
#  else
    vertex world = to_world(position, center, vec3(0.0), vec3(0.0), vec3(0.0),
            u_model_matrix);
#  endif
# endif

# if WIND_BEND
    bend_vertex(world.position, world.center, normal);
# endif
#endif // DEBUG_SPHERE

    vec4 pos_view = u_view_matrix * vec4(world.position, 1.0);
    gl_Position = u_proj_matrix * pos_view;
}
