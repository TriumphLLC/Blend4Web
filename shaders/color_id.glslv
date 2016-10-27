#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var PRECISION highp

#var NODES 0
#var CAUSTICS 0
#var CALC_TBN_SPACE 0
#var MAIN_BEND_COL 0
#var DETAIL_BEND 0
#var CALC_TBN 0
#var USE_TBN_SHADING 0


#var ALPHA 0
#var TEXTURE_COLOR 0
#var AU_QUALIFIER GLSL_IN
#var STATIC_BATCH 0
#var WIND_BEND 0
#var BEND_CENTER_ONLY 0
#var BILLBOARD_PRES_GLOB_ORIENTATION 0
#var BILLBOARD 0
#var BILLBOARD_JITTERED 0
#var DYNAMIC_GRASS 0
#var SKINNED 0
#var FRAMES_BLENDING 0
#var VERTEX_ANIM 0

#var SMAA_JITTER 0

#var VERTEX_ANIM_MIX_NORMALS_FACTOR u_va_frame_factor
#var MAX_BONES 0

#var REFLECTION_TYPE REFL_NONE
#var REFRACTIVE 0

/*==============================================================================
                                  INCLUDES
==============================================================================*/
#include <std.glsl>

#include <math.glslv>
#include <to_world.glslv>
#include <scale_texcoord.glslv>

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
#if BILLBOARD || DYNAMIC_GRASS
uniform vec3 u_camera_eye;
#endif

#if NODES && ALPHA
# if SMAA_JITTER
uniform vec2 u_subpixel_jitter;
# endif

# if USE_NODE_B4W_REFRACTION
uniform PRECISION float u_view_max_depth;
# endif
#endif // NODES && ALPHA

#if SKINNED
uniform vec4 u_quatsb[MAX_BONES];
uniform vec4 u_transb[MAX_BONES];
uniform vec4 u_arm_rel_trans;
uniform vec4 u_arm_rel_quat;

# if FRAMES_BLENDING
uniform vec4 u_quatsa[MAX_BONES];
uniform vec4 u_transa[MAX_BONES];

// near 0 if before, near 1 if after
uniform float u_frame_factor;
# endif
#endif

#if WIND_BEND
# if BILLBOARD_JITTERED
uniform float u_jitter_amp;
uniform float u_jitter_freq;
# endif
uniform vec3 u_wind;
uniform PRECISION float u_time;
#endif

#if VERTEX_ANIM
uniform float u_va_frame_factor;
#endif

#if TEXTURE_COLOR
uniform vec3 u_texture_scale;
#endif

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec3 a_position;

#if USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO || USE_NODE_NORMAL_MAP \
        || CAUSTICS || CALC_TBN_SPACE || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND \
        || CALC_TBN
GLSL_IN vec4 a_tbn_quat;
#endif

#if NODES && ALPHA
# if USE_TBN_SHADING
GLSL_IN vec3 a_shade_tangs;
# endif
#endif // NODES && ALPHA

#if SKINNED
GLSL_IN vec4 a_influence;
#endif

#if WIND_BEND
# if MAIN_BEND_COL
GLSL_IN float a_bending_col_main;
#  if DETAIL_BEND
GLSL_IN vec3 a_bending_col_detail;
AU_QUALIFIER float au_detail_bending_amp;
AU_QUALIFIER float au_branch_bending_amp;
AU_QUALIFIER float au_detail_bending_freq;
#  endif
# endif

AU_QUALIFIER float au_wind_bending_amp;
AU_QUALIFIER float au_wind_bending_freq;
# if BEND_CENTER_ONLY
GLSL_IN vec3 a_emitter_center;
# endif
#endif // WIND_BEND

#if WIND_BEND || BILLBOARD
AU_QUALIFIER vec3 au_center_pos;
#endif

#if VERTEX_ANIM
GLSL_IN vec3 a_position_next;
# if NODES && ALPHA
#  if USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO || USE_NODE_NORMAL_MAP \
        || CAUSTICS || CALC_TBN_SPACE
GLSL_IN vec4 a_tbn_quat_next;
#  endif
# endif
#endif

#if TEXTURE_COLOR
GLSL_IN vec2 a_texcoord;
#endif

#if USE_TBN_SHADING
GLSL_OUT vec3 v_shade_tang;
#endif
//------------------------------------------------------------------------------

#if NODES && ALPHA
//GLSL_OUT vec3 v_eye_dir;
GLSL_OUT vec3 v_pos_world;
GLSL_OUT vec4 v_pos_view;

# if USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO || USE_NODE_NORMAL_MAP\
        || CAUSTICS || CALC_TBN_SPACE || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND
GLSL_OUT vec3 v_normal;
# endif
# if CALC_TBN_SPACE
GLSL_OUT vec4 v_tangent;
# endif

# if REFLECTION_TYPE == REFL_PLANE || USE_NODE_B4W_REFRACTION
GLSL_OUT vec3 v_tex_pos_clip;
# endif

# if USE_NODE_B4W_REFRACTION && REFRACTIVE
GLSL_OUT float v_view_depth;
# endif

#else // NODES && ALPHA
# if TEXTURE_COLOR
GLSL_OUT vec2 v_texcoord;
# endif
#endif // NODES && ALPHA

/*==============================================================================
                                  INCLUDES
==============================================================================*/

#include <skin.glslv>
#include <wind_bending.glslv>

#if NODES && ALPHA
#include <nodes.glslv>
#endif

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {
    mat3 view_tsr = u_view_tsr;
    vec3 position = a_position;

#if NODES && ALPHA && (CALC_TBN_SPACE || USE_NODE_MATERIAL_BEGIN || USE_NODE_NORMAL_MAP \
        || USE_NODE_GEOMETRY_NO || CAUSTICS || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND) \
        || USE_TBN_SHADING && CALC_TBN
    vec3 normal = qrot(a_tbn_quat, vec3(0.0, 1.0, 0.0));
# if CALC_TBN_SPACE
    vec3 tangent = qrot(a_tbn_quat, vec3(1.0, 0.0, 0.0));
    vec3 binormal = sign(a_tbn_quat[3]) * cross(normal, tangent);
# else
    vec3 tangent = vec3(0.0);
    vec3 binormal = vec3(0.0);
# endif
#else 
    vec3 normal = vec3(0.0);
    vec3 tangent = vec3(0.0);
    vec3 binormal = vec3(0.0);
#endif

    mat3 model_tsr = u_model_tsr;

#if USE_TBN_SHADING
# if CALC_TBN
    vec3 norm_world = normalize(tsr9_transform_dir(u_model_tsr, normal));
    vec3 shade_binormal = cross(vec3(0.0, 0.0, 1.0), norm_world);
    vec3 shade_tangent = cross(norm_world, shade_binormal);
# else
    vec3 shade_tangent = a_shade_tangs;
# endif
#else
    vec3 shade_tangent = vec3(0.0);
#endif

#if VERTEX_ANIM
    position = mix(position, a_position_next, u_va_frame_factor);
# if NODES && ALPHA
#  if USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO || USE_NODE_NORMAL_MAP \
        || CAUSTICS || CALC_TBN_SPACE
    vec3 normal_next = qrot(a_tbn_quat_next, vec3(0.0, 1.0, 0.0));
    normal = mix(normal, normal_next, VERTEX_ANIM_MIX_NORMALS_FACTOR);
#  endif
#  if CALC_TBN_SPACE
    vec3 tangent_next = qrot(a_tbn_quat_next, vec3(1.0, 0.0, 0.0));
    vec3 binormal_next = sign(a_tbn_quat_next[3]) * cross(normal_next, tangent_next);
    tangent = mix(tangent, tangent_next, u_va_frame_factor);
    binormal = mix(binormal, binormal_next, u_va_frame_factor);
#  endif
# endif
#endif

#if SKINNED
    skin(position, tangent, binormal, normal);
#endif

#if WIND_BEND || BILLBOARD
    vec3 center = au_center_pos;
#else
    vec3 center = vec3(0.0);
#endif

#if BILLBOARD
    vec3 wcen = tsr9_transform(model_tsr, center);

# if BILLBOARD_PRES_GLOB_ORIENTATION && !STATIC_BATCH
    model_tsr = billboard_tsr_global(u_camera_eye, wcen,
            view_tsr, model_tsr);
# else
    model_tsr = billboard_tsr(u_camera_eye, wcen, view_tsr);
# endif

# if WIND_BEND && BILLBOARD_JITTERED
    model_tsr = bend_jitter_rotate_tsr(u_wind, u_time,
            u_jitter_amp, u_jitter_freq, wcen, model_tsr);
# endif
    vertex world = to_world(position - center, center, vec3(0.0), shade_tangent,
            vec3(0.0), vec3(0.0), model_tsr);
    world.center = wcen;
#else
    vertex world = to_world(position, center, vec3(0.0), shade_tangent, vec3(0.0),
            vec3(0.0), model_tsr);
#endif

#if WIND_BEND
# if NODES && ALPHA
    bend_vertex(world.position, world.center, normal, mat4(0.0));
# else
#  if MAIN_BEND_COL && DETAIL_BEND
    vec3 bend_normal = qrot(a_tbn_quat, vec3(0.0, 1.0, 0.0));
#  else
    vec3 bend_normal = vec3(0.0);
#  endif
    bend_vertex(world.position, world.center, bend_normal, mat4(0.0));
# endif // NODES && ALPHA
#endif // WIND_BEND

#if !(NODES && ALPHA)
# if TEXTURE_COLOR
    v_texcoord = scale_texcoord(a_texcoord, u_texture_scale);
# endif
#endif // !(NODES && ALPHA)

#if NODES && ALPHA
    v_pos_world = world.position;

# if USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO || USE_NODE_NORMAL_MAP \
        || CAUSTICS || CALC_TBN_SPACE || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND
    v_normal = world.normal;
# endif
# if CALC_TBN_SPACE
    // calculate handedness as described in Math for 3D GP and CG, page 185
    float m = (dot(cross(world.normal, world.tangent),
                   world.binormal) < 0.0) ? -1.0 : 1.0;

    v_tangent = vec4(world.tangent, m);
# endif
# if USE_TBN_SHADING
    v_shade_tang = world.shade_tang;
# endif

    v_pos_view = vec4(tsr9_transform(view_tsr, world.position), 1.0);

    vec4 pos_clip = u_proj_matrix * v_pos_view;

# if SMAA_JITTER
    pos_clip.xy += u_subpixel_jitter * pos_clip.w;
# endif

# if REFLECTION_TYPE == REFL_PLANE || USE_NODE_B4W_REFRACTION
    float xc = pos_clip.x;
    float yc = pos_clip.y;
    float wc = pos_clip.w;

    v_tex_pos_clip.x = (xc + wc) / 2.0;
    v_tex_pos_clip.y = (yc + wc) / 2.0;
    v_tex_pos_clip.z = wc;
# endif

# if USE_NODE_B4W_REFRACTION && REFRACTIVE
    v_view_depth = -v_pos_view.z / u_view_max_depth;
# endif
    nodes_main();
#endif // NODES && ALPHA

    gl_Position = u_proj_matrix * vec4(tsr9_transform(view_tsr, world.position), 1.0);
}

