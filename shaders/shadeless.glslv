#var AU_QUALIFIER uniform
#var MAX_BONES 0

/*============================================================================
                                  INCLUDES
============================================================================*/

#include <precision_statement.glslf>
#include <math.glslv>
#include <to_world.glslv>
#include <scale_texcoord.glslv>

/*============================================================================
                                  ATTRIBUTES
============================================================================*/

attribute vec3 a_position;

#if SKINNED
    attribute vec4 a_influence;
#endif

#if WIND_BEND
    #if MAIN_BEND_COL
        attribute float a_bending_col_main;
        #if DETAIL_BEND
            attribute vec3 a_bending_col_detail;
            attribute vec3 a_normal;
            AU_QUALIFIER float au_detail_bending_amp;
            AU_QUALIFIER float au_branch_bending_amp;
            AU_QUALIFIER float au_detail_bending_freq;
        #endif
    #endif
    AU_QUALIFIER float au_wind_bending_amp;
    AU_QUALIFIER float au_wind_bending_freq;
#endif

#if WIND_BEND || HAIR_BILLBOARD
    AU_QUALIFIER vec3 au_center_pos;
#endif

#if VERTEX_ANIM
    attribute vec3 a_position_next;
#endif

uniform vec3 u_texture_scale;

#if TEXTURE_COLOR
    attribute vec2 a_texcoord;
#endif

#if VERTEX_COLOR
    attribute vec3 a_color;
#endif

/*============================================================================
                                   UNIFORMS
============================================================================*/

#if STATIC_BATCH
const mat4 u_model_matrix = mat4(1.0);
#else
uniform mat4 u_model_matrix;
#endif

uniform mat4 u_view_matrix;
uniform mat4 u_proj_matrix;
# if HAIR_BILLBOARD
uniform vec3 u_camera_eye;
# endif
#if SMAA_JITTER
uniform vec2 u_subpixel_jitter;
#endif


#if SKINNED
    uniform vec4 u_quatsb[MAX_BONES];
    uniform vec4 u_transb[MAX_BONES];

    #if FRAMES_BLENDING
        uniform vec4 u_quatsa[MAX_BONES];
        uniform vec4 u_transa[MAX_BONES];

        // near 0 if before, near 1 if after
        uniform float u_frame_factor;
    #endif
#endif

#if WIND_BEND
#if HAIR_BILLBOARD_JITTERED
uniform float u_jitter_amp;
uniform float u_jitter_freq;
#endif
uniform vec3 u_wind;
uniform float u_time;
#endif

#if VERTEX_ANIM
    uniform float u_va_frame_factor;
#endif

/*============================================================================
                                   VARYINGS
============================================================================*/

varying vec4 v_pos_view;

#if TEXTURE_COLOR
    varying vec2 v_texcoord;
#endif

#if VERTEX_COLOR
    varying vec3 v_color;
#endif

/*============================================================================
                                  INCLUDES
============================================================================*/

#include <skin.glslv>
#include <wind_bending.glslv>

/*============================================================================
                                    MAIN
============================================================================*/

void main(void) {

    vec3 position = a_position;

#if VERTEX_ANIM
    position = mix(position, a_position_next, u_va_frame_factor);
#endif

#if SKINNED
    vec3 tangent = vec3(0.0);
    vec3 binormal = vec3(0.0);
    vec3 normal = vec3(0.0);
    skin(position, tangent, binormal, normal);
#endif

#if WIND_BEND || DYNAMIC_GRASS || HAIR_BILLBOARD
    vec3 center = au_center_pos;
#else
    vec3 center = vec3(0.0);
#endif

#if HAIR_BILLBOARD
    vec3 wcen = (u_model_matrix * vec4(center, 1.0)).xyz;
    mat4 model_matrix = billboard_matrix(u_camera_eye, wcen, u_view_matrix);
# if WIND_BEND && HAIR_BILLBOARD_JITTERED
    vec3 vec_seed = (u_model_matrix * vec4(center, 1.0)).xyz;
    model_matrix = model_matrix * bend_jitter_matrix(u_wind, u_time, 
            u_jitter_amp, u_jitter_freq, vec_seed);
# endif
    vertex world = to_world(position - center, center, vec3(0.0), vec3(0.0), 
            vec3(0.0), model_matrix);
    world.center = wcen;
#else
    vertex world = to_world(position, center, vec3(0.0), vec3(0.0), vec3(0.0), 
            u_model_matrix);
#endif

#if WIND_BEND
# if MAIN_BEND_COL && DETAIL_BEND
    vec3 bend_normal = a_normal;
# else
    vec3 bend_normal = vec3(0.0);
# endif
    bend_vertex(world.position, world.center, bend_normal);
#endif

    #if TEXTURE_COLOR
        v_texcoord = scale_texcoord(a_texcoord, u_texture_scale);
    #endif

    #if VERTEX_COLOR
        v_color = a_color;
    #endif

    v_pos_view = u_view_matrix * vec4(world.position, 1.0);

    gl_Position = u_proj_matrix * v_pos_view;
#if SMAA_JITTER
    gl_Position.xy += u_subpixel_jitter * gl_Position.w;
#endif

}

