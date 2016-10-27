#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var PRECISION highp

#var CAUSTICS 0
#var CALC_TBN_SPACE 0
#var MAIN_BEND_COL 0
#var DETAIL_BEND 0
#var CALC_TBN 0
#var USE_INSTANCED_PARTCLS 0
#var TEXTURE_NORM_CO TEXTURE_COORDS_NONE
#var USE_TBN_SHADING 0
#var PARALLAX 0
#var WATER_EFFECTS 0
#var SMAA_JITTER 0

#var NODES 0
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
#var DISABLE_FOG 0
#var SHADOW_USAGE NO_SHADOWS
#var REFLECTION_PASS REFL_PASS_NONE
#var REFLECTION_TYPE REFL_NONE
#var REFRACTIVE 0

#var MAC_OS_SHADOW_HACK 0

#var CSM_SECTION1 0
#var CSM_SECTION2 0
#var CSM_SECTION3 0
#var NUM_CAST_LAMPS 0

#var TEXCOORD 0
#var VERTEX_COLOR 0

#var VERTEX_ANIM_MIX_NORMALS_FACTOR u_va_frame_factor
#var MAX_BONES 0

/*==============================================================================
                                  INCLUDES
==============================================================================*/
#include <std.glsl>

#include <math.glslv>
#include <to_world.glslv>
#include <scale_texcoord.glslv>

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec3 a_position;

#if !NODES || USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO || USE_NODE_NORMAL_MAP\
        || CAUSTICS || CALC_TBN_SPACE || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND \
        || USE_NODE_TEX_COORD_NO || CALC_TBN || TEXTURE_NORM_CO != TEXTURE_COORDS_NONE
GLSL_IN vec4 a_tbn_quat;
#endif

#if USE_INSTANCED_PARTCLS
GLSL_IN vec4 a_part_ts;
GLSL_IN vec4 a_part_r;
#endif

#if USE_TBN_SHADING
GLSL_IN vec3 a_shade_tangs;
#endif

#if SKINNED
GLSL_IN vec4 a_influence;
#endif

#if (WIND_BEND || DYNAMIC_GRASS || BILLBOARD) && !USE_INSTANCED_PARTCLS
AU_QUALIFIER vec3 au_center_pos;
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
# endif // MAIN_BEND_COL
AU_QUALIFIER float au_wind_bending_amp;
AU_QUALIFIER float au_wind_bending_freq;
# if BEND_CENTER_ONLY
GLSL_IN vec3 a_emitter_center;
# endif
#endif // WIND_BEND

#if VERTEX_ANIM
GLSL_IN vec3 a_position_next;
# if !NODES || USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO || USE_NODE_NORMAL_MAP \
        || CAUSTICS || CALC_TBN_SPACE || USE_NODE_TEX_COORD_NO
GLSL_IN vec4 a_tbn_quat_next;
# endif
#endif

#if !NODES
# if TEXCOORD
GLSL_IN vec2 a_texcoord;
# endif

# if VERTEX_COLOR
GLSL_IN vec3 a_color;
# endif
#endif // !NODES
//------------------------------------------------------------------------------

GLSL_OUT vec3 v_pos_world;
#if !NODES || USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO || USE_NODE_NORMAL_MAP\
        || CAUSTICS || CALC_TBN_SPACE || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND \
        || USE_NODE_TEX_COORD_NO
GLSL_OUT vec3 v_normal;
#endif

#if NODES || !DISABLE_FOG || (TEXTURE_NORM_CO != TEXTURE_COORDS_NONE && PARALLAX) \
        || (WATER_EFFECTS && CAUSTICS) || SHADOW_USAGE == SHADOW_MASK_GENERATION \
        || SHADOW_USAGE == SHADOW_MAPPING_BLEND
GLSL_OUT vec4 v_pos_view;
#endif

#if TEXTURE_NORM_CO != TEXTURE_COORDS_NONE || CALC_TBN_SPACE
GLSL_OUT vec4 v_tangent;
#endif

#if !NODES
GLSL_OUT vec3 v_eye_dir;
# if TEXCOORD
GLSL_OUT vec2 v_texcoord;
# endif

# if VERTEX_COLOR || DYNAMIC_GRASS
GLSL_OUT vec3 v_color;
# endif
#endif


#if SHADOW_USAGE == SHADOW_MAPPING_BLEND
GLSL_OUT vec4 v_shadow_coord0;
# if CSM_SECTION1 || NUM_CAST_LAMPS > 1
GLSL_OUT vec4 v_shadow_coord1;
# endif
# if CSM_SECTION2 || NUM_CAST_LAMPS > 2
GLSL_OUT vec4 v_shadow_coord2;
# endif
# if CSM_SECTION3 || NUM_CAST_LAMPS > 3
GLSL_OUT vec4 v_shadow_coord3;
# endif
#endif

#if REFLECTION_TYPE == REFL_PLANE || SHADOW_USAGE == SHADOW_MAPPING_OPAQUE \
        || REFRACTIVE || USE_NODE_B4W_REFRACTION
GLSL_OUT vec3 v_tex_pos_clip;
#endif

#if REFRACTIVE && (!NODES || USE_NODE_B4W_REFRACTION)
GLSL_OUT float v_view_depth;
#endif

#if USE_TBN_SHADING
GLSL_OUT vec3 v_shade_tang;
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

#if REFLECTION_PASS == REFL_PASS_PLANE
uniform mat4 u_view_refl_matrix;
#endif

uniform mat3 u_view_tsr;


uniform mat4 u_proj_matrix;
#if !NODES || BILLBOARD || DYNAMIC_GRASS
uniform vec3 u_camera_eye;
#endif

#if SMAA_JITTER
uniform vec2 u_subpixel_jitter;
#endif

#if DYNAMIC_GRASS
uniform PRECISION sampler2D u_grass_map_depth;
uniform sampler2D u_grass_map_color;
uniform vec4 u_camera_quat;
uniform vec3 u_grass_map_dim;
uniform float u_grass_size;
uniform float u_scale_threshold;
#endif

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
#endif // SKINNED

#if WIND_BEND
# if BILLBOARD_JITTERED
uniform float u_jitter_amp;
uniform float u_jitter_freq;
# endif
uniform vec3 u_wind;
uniform PRECISION float u_time;
#endif // WIND_BEND

#if VERTEX_ANIM
    uniform float u_va_frame_factor;
#endif

#if !NODES
uniform vec3 u_texture_scale;
#endif

#if SHADOW_USAGE == SHADOW_MAPPING_BLEND
uniform float u_normal_offset;
# if MAC_OS_SHADOW_HACK
uniform mat3 u_v_light_tsr[NUM_CAST_LAMPS];
# else
uniform vec4 u_v_light_ts[NUM_CAST_LAMPS];
uniform vec4 u_v_light_r[NUM_CAST_LAMPS];
# endif

uniform mat4 u_p_light_matrix0;

# if CSM_SECTION1 || NUM_CAST_LAMPS > 1
uniform mat4 u_p_light_matrix1;
# endif

# if CSM_SECTION2 || NUM_CAST_LAMPS > 2
uniform mat4 u_p_light_matrix2;
# endif

# if CSM_SECTION3 || NUM_CAST_LAMPS > 3
uniform mat4 u_p_light_matrix3;
# endif
#endif

#if REFRACTIVE || USE_NODE_B4W_REFRACTION
uniform PRECISION float u_view_max_depth;
#endif

/*==============================================================================
                                  INCLUDES
==============================================================================*/

#include <dynamic_grass.glslv>
#include <shadow.glslv>
#include <skin.glslv>
#include <wind_bending.glslv>

#if NODES
#include <nodes.glslv>
#endif // NODES

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {

#if REFLECTION_PASS == REFL_PASS_PLANE
    mat4 view_refl_matrix = u_view_refl_matrix;
#else
    mat4 view_refl_matrix = mat4(0.0);
#endif
    mat3 view_tsr = u_view_tsr;

#if USE_INSTANCED_PARTCLS
    mat3 model_tsr = mat3(a_part_ts[0], a_part_ts[1], a_part_ts[2],
                        a_part_ts[3], a_part_r[0], a_part_r[1],
                        a_part_r[2], a_part_r[3], 1.0);
# if !STATIC_BATCH
    model_tsr = tsr_multiply(u_model_tsr, model_tsr);
# endif
#else
# if !DYNAMIC_GRASS
    mat3 model_tsr = u_model_tsr;
# endif
#endif

    vec3 position = a_position;

#if CALC_TBN_SPACE || USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO || USE_NODE_NORMAL_MAP \
        || CAUSTICS || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND || !NODES \
        || USE_TBN_SHADING && CALC_TBN
    vec3 norm_tbn = qrot(a_tbn_quat, vec3(0.0, 1.0, 0.0));
#endif

#if CALC_TBN_SPACE || USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO || USE_NODE_NORMAL_MAP \
        || CAUSTICS || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND || !NODES
    vec3 normal = norm_tbn;
#else
    vec3 normal = vec3(0.0);
#endif

#if CALC_TBN_SPACE || !NODES && TEXTURE_NORM_CO == TEXTURE_COORDS_UV_ORCO
    vec3 tangent = qrot(a_tbn_quat, vec3(1.0, 0.0, 0.0));
    // - cross(tangent, normal) --- blender space binormal
    vec3 binormal = sign(a_tbn_quat[3]) * cross(normal, tangent);
#elif !NODES && TEXTURE_NORM_CO == TEXTURE_COORDS_NORMAL
    // NOTE: absolutely not precise. Better too avoid using such a setup
    vec3 world_pos = tsr9_transform(model_tsr, position);
    vec3 norm_world = normalize(tsr9_transform_dir(model_tsr, norm_tbn));
    vec3 eye_dir = world_pos - u_camera_eye;
    vec3 binormal = cross(eye_dir, norm_world);
    vec3 tangent = cross(norm_world, binormal);
#else
    vec3 tangent = vec3(0.0);
    vec3 binormal = vec3(0.0);
#endif

#if USE_TBN_SHADING
# if CALC_TBN
    vec3 norm_world = normalize(tsr9_transform_dir(model_tsr, norm_tbn));
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

#if !NODES || USE_NODE_MATERIAL_BEGIN || USE_NODE_NORMAL_MAP \
        || USE_NODE_GEOMETRY_NO || CAUSTICS || CALC_TBN_SPACE \
        || TEXTURE_NORM_CO != TEXTURE_COORDS_NONE
    vec3 norm_tbn_next = qrot(a_tbn_quat_next, vec3(0.0, 1.0, 0.0));
#endif

# if !NODES || USE_NODE_MATERIAL_BEGIN || USE_NODE_NORMAL_MAP \
        || USE_NODE_GEOMETRY_NO || CAUSTICS || CALC_TBN_SPACE
    normal = mix(normal, norm_tbn_next, VERTEX_ANIM_MIX_NORMALS_FACTOR);
# endif
# if TEXTURE_NORM_CO != TEXTURE_COORDS_NONE
    vec3 tangent_next = qrot(a_tbn_quat_next, vec3(1.0, 0.0, 0.0));
    vec3 binormal_next = sign(a_tbn_quat_next[3]) * cross(norm_tbn_next, tangent_next);

    tangent = mix(tangent, tangent_next, u_va_frame_factor);
    binormal = mix(binormal, binormal_next, u_va_frame_factor);
# endif
#endif

#if SKINNED
    skin(position, tangent, binormal, normal);
#endif

    // apply detailed wind bending (branches and leaves)

#if (WIND_BEND || DYNAMIC_GRASS || BILLBOARD) && !USE_INSTANCED_PARTCLS
    vec3 center = au_center_pos;
#elif DYNAMIC_GRASS && USE_INSTANCED_PARTCLS
    vec3 center = a_part_ts.xyz;
    position = tsr9_transform(model_tsr, position);
#else
    vec3 center = vec3(0.0);
#endif

#if DYNAMIC_GRASS
    vertex world = grass_vertex(position, tangent, shade_tangent, binormal, normal,
            center, u_grass_map_depth, u_grass_map_color,
            u_grass_map_dim, u_grass_size, u_camera_eye, u_camera_quat,
            view_tsr);
#else
# if BILLBOARD
    vec3 wcen = tsr9_transform(model_tsr, center);
#  if REFLECTION_PASS == REFL_PASS_PLANE
    position = (view_refl_matrix * vec4(position, 1.0)).xyz;
    center = (view_refl_matrix * vec4(center, 1.0)).xyz;
    wcen = (view_refl_matrix * vec4(wcen, 1.0)).xyz;
#  endif

#  if BILLBOARD_PRES_GLOB_ORIENTATION && !STATIC_BATCH || USE_INSTANCED_PARTCLS
    model_tsr = billboard_tsr_global(u_camera_eye, wcen,
            view_tsr, model_tsr);
#  else
    model_tsr = billboard_tsr(u_camera_eye, wcen, view_tsr);
#  endif

#  if WIND_BEND && BILLBOARD_JITTERED
    vec3 vec_seed = wcen;
    model_tsr = bend_jitter_rotate_tsr(u_wind, u_time,
            u_jitter_amp, u_jitter_freq, vec_seed, model_tsr);
#  endif  // WIND_BEND && BILLBOARD_JITTERED
    vertex world = to_world(position - center, center, tangent, shade_tangent,
            binormal, normal, model_tsr);
    world.center = wcen;
# else  // BILLBOARD
    vertex world = to_world(position, center, tangent, shade_tangent, binormal,
            normal, model_tsr);
# endif  // BILLBOARD
#endif  // DYNAMIC_GRASS

#if TEXTURE_NORM_CO != TEXTURE_COORDS_NONE || CALC_TBN_SPACE
    // calculate handedness as described in Math for 3D GP and CG, page 185
    float m = (dot(cross(world.normal, world.tangent),
        world.binormal) < 0.0) ? -1.0 : 1.0;
    v_tangent = vec4(world.tangent, m);
#endif

#if USE_TBN_SHADING
    v_shade_tang = world.shade_tang;
#endif

#if WIND_BEND
    bend_vertex(world.position, world.center, normal, view_refl_matrix);
#endif

    v_pos_world = world.position;

#if !NODES || USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO || USE_NODE_NORMAL_MAP\
        || CAUSTICS || CALC_TBN_SPACE || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND
    v_normal = world.normal;
#endif

#if !NODES
    v_eye_dir = u_camera_eye - world.position;

# if TEXCOORD
    v_texcoord = scale_texcoord(a_texcoord, u_texture_scale);
# endif

# if DYNAMIC_GRASS
    v_color = world.color;
# elif VERTEX_COLOR
    v_color = a_color;
# endif
#endif // !NODES

#if REFLECTION_PASS == REFL_PASS_PLANE && !BILLBOARD
    vec4 pos_view = view_refl_matrix * vec4(world.position, 1.0);
    pos_view.xyz = tsr9_transform(view_tsr, pos_view.xyz);
#else
    vec4 pos_view = vec4(tsr9_transform(view_tsr, world.position), 1.0);
#endif

#if NODES || !DISABLE_FOG || (TEXTURE_NORM_CO != TEXTURE_COORDS_NONE && PARALLAX) \
        || (WATER_EFFECTS && CAUSTICS) || SHADOW_USAGE == SHADOW_MASK_GENERATION \
        || SHADOW_USAGE == SHADOW_MAPPING_BLEND
    v_pos_view = pos_view;
#endif

    vec4 pos_clip = u_proj_matrix * pos_view;

#if SMAA_JITTER
    pos_clip.xy += u_subpixel_jitter * pos_clip.w;
#endif

#if REFLECTION_TYPE == REFL_PLANE || SHADOW_USAGE == SHADOW_MAPPING_OPAQUE \
        || REFRACTIVE || USE_NODE_B4W_REFRACTION
    v_tex_pos_clip = clip_to_tex(pos_clip);
#endif

#if SHADOW_USAGE == SHADOW_MAPPING_BLEND
    get_shadow_coords(world.position, world.normal);
#endif

#if REFRACTIVE && (!NODES || USE_NODE_B4W_REFRACTION)
    v_view_depth = -pos_view.z / u_view_max_depth;
#endif

#if NODES
    nodes_main();
#endif

    gl_Position = pos_clip;
}
