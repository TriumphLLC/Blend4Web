/*============================================================================
                                  INCLUDES
============================================================================*/

#include <math.glslv>
#include <to_world.glslv>

/*============================================================================
                                  ATTRIBUTES
============================================================================*/

attribute vec3 a_position;

#if DYNAMIC_GRASS_SIZE
attribute float a_grass_size;
#endif
#if DYNAMIC_GRASS_COLOR
attribute vec3 a_grass_color;
#endif

/*============================================================================
                                   UNIFORMS
============================================================================*/

# if STATIC_BATCH
const mat4 u_model_matrix = mat4(1.0);
# else
uniform mat4 u_model_matrix;
# endif

uniform mat4 u_view_matrix;
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

/*============================================================================
                                   VARYINGS
============================================================================*/

#if DYNAMIC_GRASS_SIZE
# if DYNAMIC_GRASS_COLOR
varying vec4 v_grass_params;
# else
varying float v_grass_params;
# endif
#else
# if DYNAMIC_GRASS_COLOR
varying vec3 v_grass_params;
# endif
#endif

/*============================================================================
                                    MAIN
============================================================================*/

void main(void) {
# if BILLBOARD
    vec3 wcen = (u_model_matrix * vec4(vec3(0.0), 1.0)).xyz;
    mat4 model_matrix = billboard_matrix(u_camera_eye, wcen, u_view_matrix);
# if WIND_BEND && BILLBOARD_JITTERED
    model_matrix = model_matrix * bend_jitter_matrix(u_wind, u_time,
        u_jitter_amp, u_jitter_freq, vec3(0.0));
# endif
    vertex world = to_world(a_position, vec3(0.0), vec3(0.0), vec3(0.0),
            vec3(0.0), model_matrix);
    world.center = wcen;
# else
    vertex world = to_world(a_position, vec3(0.0), vec3(0.0), vec3(0.0),
            vec3(0.0), u_model_matrix);
# endif

    vec4 pos_clip = u_proj_matrix * u_view_matrix * vec4(world.position, 1.0);

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
