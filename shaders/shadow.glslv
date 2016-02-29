#var AU_QUALIFIER uniform
#var MAX_BONES 0
#var NUM_CAST_LAMPS 0
#var SHADOW_TEX_RES 0.0
#var VERTEX_ANIM_MIX_NORMALS_FACTOR u_va_frame_factor

/*============================================================================
                                  INCLUDES
============================================================================*/
#include <std_enums.glsl>
#include <precision_statement.glslf>

#include <math.glslv>
#include <to_world.glslv>
#include <scale_texcoord.glslv>

/*============================================================================
                                  ATTRIBUTES
============================================================================*/

attribute vec3 a_position;

#if USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO \
        || CAUSTICS || CALC_TBN_SPACE || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND \
        || SHADOW_USAGE == SHADOW_MASK_GENERATION
attribute vec3 a_normal;
#endif

#if NODES && ALPHA && CALC_TBN_SPACE
attribute vec4 a_tangent;
#endif

#if SKINNED
attribute vec4 a_influence;
#endif

#if WIND_BEND || DYNAMIC_GRASS || BILLBOARD
AU_QUALIFIER vec3 au_center_pos;
#endif

#if WIND_BEND
# if MAIN_BEND_COL
attribute float a_bending_col_main;
#  if DETAIL_BEND
attribute vec3 a_bending_col_detail;
AU_QUALIFIER float au_detail_bending_amp;
AU_QUALIFIER float au_branch_bending_amp;
AU_QUALIFIER float au_detail_bending_freq;
#  endif  // DETAIL_BEND
# endif  // MAIN_BEND_COL
AU_QUALIFIER float au_wind_bending_amp;
AU_QUALIFIER float au_wind_bending_freq;
# if BEND_CENTER_ONLY
    attribute vec3 a_emitter_center;
# endif
#endif  // WIND_BEND

#if VERTEX_ANIM
attribute vec3 a_position_next;
# if NODES && ALPHA
#  if USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO || CAUSTICS || CALC_TBN_SPACE
attribute vec3 a_normal_next;
#   if CALC_TBN_SPACE
attribute vec4 a_tangent_next;
#   endif
#  endif
# endif
#endif // VERTEX_ANIM

#if !(NODES && ALPHA) && TEXTURE_COLOR
attribute vec2 a_texcoord;
#endif

/*============================================================================
                                   UNIFORMS
============================================================================*/

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

#if SMAA_JITTER
uniform vec2 u_subpixel_jitter;
#endif

uniform mat3 u_view_tsr;
uniform mat4 u_proj_matrix;
# if DYNAMIC_GRASS || BILLBOARD
uniform vec3 u_camera_eye;
# endif

#if BILLBOARD && SHADOW_USAGE == SHADOW_CASTING
uniform mat3 u_shadow_cast_billboard_view_tsr;
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

    #if FRAMES_BLENDING
        uniform vec4 u_quatsa[MAX_BONES];
        uniform vec4 u_transa[MAX_BONES];

        // near 0 if before, near 1 if after
        uniform float u_frame_factor;
    #endif
#endif

#if WIND_BEND
#if BILLBOARD_JITTERED
uniform float u_jitter_amp;
uniform float u_jitter_freq;
#endif
uniform vec3 u_wind;
uniform float u_time;
#endif

#if VERTEX_ANIM
uniform float u_va_frame_factor;
#endif

#if !(NODES && ALPHA) && TEXTURE_COLOR
uniform vec3 u_texture_scale;
#endif

#if SHADOW_USAGE == SHADOW_MASK_GENERATION
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

#if USE_NODE_B4W_REFRACTION
uniform PRECISION float u_view_max_depth;
#endif

/*============================================================================
                                   VARYINGS
============================================================================*/

#if NODES && ALPHA
//varying vec3 v_eye_dir;
varying vec3 v_pos_world;

# if USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO \
        || CAUSTICS || CALC_TBN_SPACE || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND
varying vec3 v_normal;
# endif
# if CALC_TBN_SPACE
varying vec4 v_tangent;
# endif

#else
# if TEXTURE_COLOR
varying vec2 v_texcoord;
# endif
#endif

#if SHADOW_USAGE == SHADOW_MASK_GENERATION || NODES && ALPHA
varying vec4 v_pos_view;
#endif

#if SHADOW_USAGE == SHADOW_MASK_GENERATION
varying vec4 v_shadow_coord0;

# if CSM_SECTION1 || NUM_CAST_LAMPS > 1
varying vec4 v_shadow_coord1;
# endif

# if CSM_SECTION2 || NUM_CAST_LAMPS > 2
varying vec4 v_shadow_coord2;
# endif

# if CSM_SECTION3 || NUM_CAST_LAMPS > 3
varying vec4 v_shadow_coord3;
# endif
#endif

#if REFLECTION_TYPE == REFL_PLANE || USE_NODE_B4W_REFRACTION
varying vec3 v_tex_pos_clip;
#endif

#if NODES && ALPHA
# if USE_NODE_B4W_REFRACTION && REFRACTIVE
varying float v_view_depth;
# endif
#endif

/*============================================================================
                                  INCLUDES
============================================================================*/

#include <dynamic_grass.glslv>
#include <shadow.glslv>
#include <skin.glslv>
#include <wind_bending.glslv>

#if NODES && ALPHA
#include <nodes.glslv>
#endif
/*============================================================================
                                    MAIN
============================================================================*/

void main(void) {
    mat4 view_matrix = tsr_to_mat4(u_view_tsr);

    vec3 position = a_position;

#if SHADOW_USAGE == SHADOW_MASK_GENERATION || CALC_TBN_SPACE || USE_NODE_MATERIAL_BEGIN \
        || USE_NODE_GEOMETRY_NO \
        || CAUSTICS || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND 
    vec3 normal = a_normal;
#else
    vec3 normal = vec3(0.0);
#endif

#if NODES && ALPHA && CALC_TBN_SPACE
    vec3 tangent = vec3(a_tangent);
    vec3 binormal = a_tangent[3] * cross(normal, tangent);
#else
    vec3 tangent = vec3(0.0);
    vec3 binormal = vec3(0.0);
#endif

#if VERTEX_ANIM
    position = mix(position, a_position_next, u_va_frame_factor);
# if NODES && ALPHA
#  if USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO || CAUSTICS || CALC_TBN_SPACE
    normal = mix(normal, a_normal_next, VERTEX_ANIM_MIX_NORMALS_FACTOR);
#  endif
#  if CALC_TBN_SPACE
    vec3 tangent_next = vec3(a_tangent);
    vec3 binormal_next = a_tangent_next[3] * cross(a_normal_next, tangent_next);
    tangent = mix(tangent, tangent_next, u_va_frame_factor);
    binormal = mix(binormal, binormal_next, u_va_frame_factor);
#  endif
# endif // NODES && ALPHA
#endif // VERTEX_ANIM

#if SKINNED
    skin(position, tangent, binormal, normal);
#endif

#if WIND_BEND || DYNAMIC_GRASS || BILLBOARD
    vec3 center = au_center_pos;
#else
    vec3 center = vec3(0.0);
#endif

#if DYNAMIC_GRASS
    vertex world = grass_vertex(position, vec3(0.0), vec3(0.0), normal, center,
            u_grass_map_depth, u_grass_map_color, u_grass_map_dim, u_grass_size,
            u_camera_eye, u_camera_quat, view_matrix);
#else

    mat4 model_mat = tsr_to_mat4(u_model_tsr);

# if BILLBOARD
    vec3 wcen = (model_mat * vec4(center, 1.0)).xyz;
// NOTE: only for non-particles geometry on SHADOW_CAST subscene
# if !HAIR_BILLBOARD && SHADOW_USAGE == SHADOW_CASTING
    mat4 bill_view_matrix = tsr_to_mat4(u_shadow_cast_billboard_view_tsr);
# else
    mat4 bill_view_matrix = view_matrix;
# endif

# if BILLBOARD_PRES_GLOB_ORIENTATION && !STATIC_BATCH
    mat4 model_matrix = billboard_matrix_global(u_camera_eye, wcen, 
            bill_view_matrix, model_mat);
# else
    mat4 model_matrix = billboard_matrix(u_camera_eye, wcen, bill_view_matrix);
# endif

#  if WIND_BEND && BILLBOARD_JITTERED
    model_matrix = model_matrix * bend_jitter_matrix(u_wind, u_time,
            u_jitter_amp, u_jitter_freq, wcen);
#  endif
    vertex world = to_world(position - center, center, vec3(0.0), vec3(0.0), normal,
            model_matrix);
    world.center = wcen;
# else
    vertex world = to_world(position, center, vec3(0.0), vec3(0.0), normal,
            model_mat);
# endif
#endif

#if WIND_BEND
# if MAIN_BEND_COL && DETAIL_BEND
    vec3 bend_normal = a_normal;
# else
    vec3 bend_normal = vec3(0.0);
# endif
    bend_vertex(world.position, world.center, bend_normal);
#endif

#if NODES && ALPHA
    v_pos_world = world.position;

# if USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO \
        || CAUSTICS || CALC_TBN_SPACE || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND
    v_normal = world.normal;
# endif
# if CALC_TBN_SPACE
    // calculate handedness as described in Math for 3D GP and CG, page 185
    float m = (dot(cross(world.normal, world.tangent),
                   world.binormal) < 0.0) ? -1.0 : 1.0;

    v_tangent = vec4(world.tangent, m);
# endif

#endif // NODES && ALPHA
    vec4 pos_view = view_matrix * vec4(world.position, 1.0);
    vec4 pos_clip = u_proj_matrix * pos_view;

#if SMAA_JITTER
    pos_clip.xy += u_subpixel_jitter * pos_clip.w;
#endif

#if NODES && ALPHA
# if REFLECTION_TYPE == REFL_PLANE || USE_NODE_B4W_REFRACTION
    v_tex_pos_clip = clip_to_tex(pos_clip);
# endif

# if USE_NODE_B4W_REFRACTION && REFRACTIVE
    v_view_depth = -v_pos_view.z / u_view_max_depth;
# endif
    nodes_main();
#else
# if TEXTURE_COLOR
    v_texcoord = scale_texcoord(a_texcoord, u_texture_scale);
# endif
#endif // NODES && ALPHA

#if SHADOW_USAGE == SHADOW_MASK_GENERATION
    get_shadow_coords(world.position, world.normal);
#endif

#if SHADOW_USAGE == SHADOW_MASK_GENERATION || NODES && ALPHA
    v_pos_view = pos_view;
#endif

#if SHADOW_USAGE == SHADOW_CASTING
    // NOTE: shift coords to remove shadow map panning

    // NOTE: view_matrix[3] is world space origin translated into light space
    vec2 shift = (u_proj_matrix * view_matrix[3]).xy;
    float half_tex_res = SHADOW_TEX_RES / 2.0;
    shift = floor(shift * half_tex_res + 0.5) / half_tex_res - shift;
    pos_clip.xy += shift;
#endif

    gl_Position = pos_clip;
}
