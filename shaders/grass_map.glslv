#version GLSL_VERSION

/*==============================================================================
                                VARS
==============================================================================*/
#var DYNAMIC_GRASS_SIZE 0
#var DYNAMIC_GRASS_COLOR 0
#var WIND_BEND 0

#var STATIC_BATCH 0
#var BILLBOARD 0
#var BILLBOARD_JITTERED 0

/*==============================================================================
                                  INCLUDES
==============================================================================*/
#include <std.glsl>
#include <math.glslv>
#include <to_world.glslv>

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec3 a_position;

#if DYNAMIC_GRASS_SIZE
GLSL_IN float a_grass_size;
#endif
#if DYNAMIC_GRASS_COLOR
GLSL_IN vec3 a_grass_color;
#endif
//------------------------------------------------------------------------------

#if DYNAMIC_GRASS_SIZE
# if DYNAMIC_GRASS_COLOR
GLSL_OUT vec4 v_grass_params;
# else
GLSL_OUT float v_grass_params;
# endif
#else
# if DYNAMIC_GRASS_COLOR
GLSL_OUT vec3 v_grass_params;
# endif
#endif

/*==============================================================================
                                   UNIFORMS
==============================================================================*/

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

uniform mat3 u_view_tsr;
uniform mat4 u_proj_matrix;
# if BILLBOARD
uniform vec3 u_camera_eye;
# endif

#if WIND_BEND && BILLBOARD_JITTERED
uniform vec3 u_wind;
uniform float u_time;
uniform float u_jitter_amp;
uniform float u_jitter_freq;
#endif

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {
    mat3 view_tsr = u_view_tsr;

    mat3 model_tsr = u_model_tsr;
# if BILLBOARD
    vec3 wcen = tsr9_transform(model_tsr, vec3(0.0));

    mat3 model_tsr = billboard_tsr(u_camera_eye, wcen, view_tsr);
#  if WIND_BEND && BILLBOARD_JITTERED
    model_tsr = bend_jitter_rotate_tsr(u_wind, u_time,
        u_jitter_amp, u_jitter_freq, vec3(0.0), model_tsr);
#  endif
    vertex world = to_world(a_position, vec3(0.0), vec3(0.0), vec3(0.0),
            vec3(0.0), vec3(0.0), model_tsr);
    world.center = wcen;
# else
    vertex world = to_world(a_position, vec3(0.0), vec3(0.0), vec3(0.0),
            vec3(0.0), vec3(0.0), model_tsr);
# endif

    vec4 pos_clip = u_proj_matrix * vec4(tsr9_transform(view_tsr, world.position), 1.0);

#if DYNAMIC_GRASS_SIZE
# if DYNAMIC_GRASS_COLOR
    v_grass_params = vec4(a_grass_size, a_grass_color);
# else
    v_grass_params = a_grass_size;
# endif
#else
# if DYNAMIC_GRASS_COLOR
    v_grass_params = a_grass_color;
# endif
#endif

    gl_Position = pos_clip;
}
