#var AU_QUALIFIER uniform
#var MAX_BONES 0
#var PRECISION lowp

/*============================================================================
                                  INCLUDES
============================================================================*/
#include <std_enums.glsl>

#include <math.glslv>
#include <to_world.glslv>
#include <scale_texcoord.glslv>

/*============================================================================
                                  ATTRIBUTES
============================================================================*/

#define TEXCOORD (TEXTURE_COLOR && TEXTURE_COORDS == TEXTURE_COORDS_UV || TEXTURE_STENCIL_ALPHA_MASK || TEXTURE_SPEC || TEXTURE_NORM)

attribute vec3 a_position;
attribute vec3 a_normal;

#if TEXTURE_NORM
    attribute vec4 a_tangent;
#endif

#if SKINNED
    attribute vec4 a_influence;
#endif

#if WIND_BEND || DYNAMIC_GRASS || HAIR_BILLBOARD
    AU_QUALIFIER vec3 au_center_pos;
#endif

#if WIND_BEND
    #if MAIN_BEND_COL
        attribute float a_bending_col_main;
        #if DETAIL_BEND
            attribute vec3 a_bending_col_detail;
            AU_QUALIFIER float au_detail_bending_amp;
            AU_QUALIFIER float au_branch_bending_amp;
            AU_QUALIFIER float au_detail_bending_freq;
        #endif
    #endif
    AU_QUALIFIER float au_wind_bending_amp;
    AU_QUALIFIER float au_wind_bending_freq;
#endif

#if VERTEX_ANIM
    attribute vec3 a_position_next;
    attribute vec3 a_normal_next;
    #if TEXTURE_NORM
        attribute vec4 a_tangent_next;
    #endif
#endif

#if TEXCOORD
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
uniform vec3 u_camera_eye;

#if SMAA_JITTER
uniform vec2 u_subpixel_jitter;
#endif

#if DYNAMIC_GRASS
uniform sampler2D u_grass_map_depth;
uniform sampler2D u_grass_map_color;
uniform vec4 u_camera_quat;
uniform vec3 u_grass_map_dim;
uniform float u_grass_size;
uniform float u_scale_threshold;
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
uniform PRECISION float u_time;
#endif

#if VERTEX_ANIM
    uniform float u_va_frame_factor;
#endif

uniform vec3 u_texture_scale;

#if SHADOW_SRC != SHADOW_SRC_MASK && SHADOW_SRC != SHADOW_SRC_NONE
    uniform mat4 u_v_light_matrix;

    // bias light matrix
    uniform mat4 u_b_light_matrix;

    uniform mat4 u_p_light_matrix0;

    #if CSM_SECTION1
        uniform mat4 u_p_light_matrix1;
    #endif

    #if CSM_SECTION2
        uniform mat4 u_p_light_matrix2;
    #endif

    #if CSM_SECTION3
        uniform mat4 u_p_light_matrix3;
    #endif
#endif


/*============================================================================
                                   VARYINGS
============================================================================*/

varying vec3 v_eye_dir;
varying vec3 v_pos_world;
varying vec3 v_normal;

#if !DISABLE_FOG || (TEXTURE_NORM && PARALLAX) || (WATER_EFFECTS && CAUSTICS)
varying vec4 v_pos_view;
#endif

#if TEXTURE_NORM
    varying vec4 v_tangent;
#endif

#if TEXCOORD
    varying vec2 v_texcoord;
#endif

#if VERTEX_COLOR || DYNAMIC_GRASS
    varying vec3 v_color;
#endif

#if SHADOW_SRC != SHADOW_SRC_MASK && SHADOW_SRC != SHADOW_SRC_NONE
    varying vec4 v_shadow_coord0;
    #if CSM_SECTION1
        varying vec4 v_shadow_coord1;
    #endif
    #if CSM_SECTION2
        varying vec4 v_shadow_coord2;
    #endif
    #if CSM_SECTION3
        varying vec4 v_shadow_coord3;
    #endif
#endif

#if REFLECTIVE || SHADOW_SRC == SHADOW_SRC_MASK
    varying vec3 v_tex_pos_clip;
#endif

/*============================================================================
                                  INCLUDES
============================================================================*/

#include <dynamic_grass.glslv>
#include <shadow.glslv>
#include <skin.glslv>
#include <wind_bending.glslv>

/*============================================================================
                                    MAIN
============================================================================*/

void main(void) {

    vec3 position = a_position;
    vec3 normal = a_normal;

#if TEXTURE_NORM
    vec3 tangent = vec3(a_tangent);
    vec3 binormal = a_tangent[3] * cross(normal, tangent);
#else
    vec3 tangent = vec3(0.0);
    vec3 binormal = vec3(0.0);
#endif

#if VERTEX_ANIM
    position = mix(position, a_position_next, u_va_frame_factor);
    normal = mix(normal, a_normal_next, u_va_frame_factor);

# if TEXTURE_NORM
    vec3 tangent_next = vec3(a_tangent);
    vec3 binormal_next = a_tangent_next[3] * cross(a_normal_next, tangent_next);

    tangent = mix(tangent, tangent_next, u_va_frame_factor);
    binormal = mix(binormal, binormal_next, u_va_frame_factor);
# endif
#endif

#if SKINNED
    skin(position, tangent, binormal, normal);
#endif

    // apply detailed wind bending (branches and leaves)

#if WIND_BEND || DYNAMIC_GRASS || HAIR_BILLBOARD
    vec3 center = au_center_pos;
#else
    vec3 center = vec3(0.0);
#endif

    #if TEXTURE_NORM
        #if DYNAMIC_GRASS
            vertex world = grass_vertex(position, tangent, binormal, normal,
                    center, u_grass_map_depth, u_grass_map_color,
                    u_grass_map_dim, u_grass_size, u_camera_eye, u_camera_quat,
                    u_view_matrix);
        #else
        # if HAIR_BILLBOARD
            vec3 wcen = (u_model_matrix * vec4(center, 1.0)).xyz;
            mat4 model_matrix = billboard_matrix(u_camera_eye, wcen, u_view_matrix);
        # if WIND_BEND && HAIR_BILLBOARD_JITTERED
            vec3 vec_seed = (u_model_matrix * vec4(center, 1.0)).xyz;
            model_matrix = model_matrix * bend_jitter_matrix(u_wind, u_time, 
                    u_jitter_amp, u_jitter_freq, vec_seed);
        # endif
            vertex world = to_world(position - center, center, tangent, binormal, normal,
                    model_matrix);
            world.center = wcen;
        # else
            vertex world = to_world(position, center, tangent, binormal, normal,
                    u_model_matrix);
        # endif
        #endif

        // calculate handedness as described in Math for 3D GP and CG, page 185
        float m = (dot(cross(world.normal, world.tangent),
            world.binormal) < 0.0) ? -1.0 : 1.0;

        v_tangent = vec4(world.tangent, m);
    #else
        #if DYNAMIC_GRASS
            vertex world = grass_vertex(position, vec3(0.0), vec3(0.0), normal,
                    center, u_grass_map_depth, u_grass_map_color,
                    u_grass_map_dim, u_grass_size, u_camera_eye, u_camera_quat,
                    u_view_matrix);
        #else
        # if HAIR_BILLBOARD
            vec3 wcen = (u_model_matrix * vec4(center, 1.0)).xyz;
            mat4 model_matrix = billboard_matrix(u_camera_eye, wcen, u_view_matrix);
        # if WIND_BEND && HAIR_BILLBOARD_JITTERED
            vec3 vec_seed = (u_model_matrix * vec4(center, 1.0)).xyz;
            model_matrix = model_matrix * bend_jitter_matrix(u_wind, u_time, 
                    u_jitter_amp, u_jitter_freq, vec_seed);
        # endif
            vertex world = to_world(position - center, center, vec3(0.0), vec3(0.0), normal,
                    model_matrix);
            world.center = wcen;
        # else
            vertex world = to_world(position, center, vec3(0.0), vec3(0.0), normal,
                    u_model_matrix);
        # endif
        #endif
    #endif


    #if WIND_BEND
        bend_vertex(world.position, world.center, normal);
    #endif

    v_pos_world = world.position;
    v_normal = world.normal;
    v_eye_dir = u_camera_eye - world.position;

    #if TEXCOORD
        v_texcoord = scale_texcoord(a_texcoord, u_texture_scale);
    #endif

    #if DYNAMIC_GRASS
        v_color = world.color;
    #elif VERTEX_COLOR
        v_color = a_color;
    #endif

    vec4 pos_view = u_view_matrix * vec4(world.position, 1.0);

    #if !DISABLE_FOG || (TEXTURE_NORM && PARALLAX) || (WATER_EFFECTS && CAUSTICS)
    v_pos_view = pos_view;
    #endif

    vec4 pos_clip = u_proj_matrix * pos_view;

    #if SMAA_JITTER
    pos_clip.xy += u_subpixel_jitter * pos_clip.w;
    #endif

    #if SHADOW_SRC == SHADOW_SRC_MASK
        get_shadow_coords(pos_clip);
    #elif SHADOW_SRC != SHADOW_SRC_NONE
        get_shadow_coords(world.position);
    #endif

    #if REFLECTIVE
        float xc = pos_clip.x;
        float yc = pos_clip.y;
        float wc = pos_clip.w;

        v_tex_pos_clip.x = (xc + wc) / 2.0;
        v_tex_pos_clip.y = (yc + wc) / 2.0;
        v_tex_pos_clip.z = wc;
    #endif

    gl_Position = pos_clip;
}
