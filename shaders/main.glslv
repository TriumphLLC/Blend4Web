#var AU_QUALIFIER uniform
#var MAX_BONES 0
#var NUM_CAST_LAMPS 0
#var PRECISION lowp
#var VERTEX_ANIM_MIX_NORMALS_FACTOR u_va_frame_factor

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

attribute vec3 a_position;

#if !NODES || USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO \
        || CAUSTICS || CALC_TBN_SPACE || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND \
        || USE_NODE_TEX_COORD_NO
attribute vec3 a_normal;
#endif

#if TEXTURE_NORM_CO || CALC_TBN_SPACE
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
#  endif
# endif // MAIN_BEND_COL
    AU_QUALIFIER float au_wind_bending_amp;
    AU_QUALIFIER float au_wind_bending_freq;
# if BEND_CENTER_ONLY
    attribute vec3 a_emitter_center;
# endif
#endif // WIND_BEND

#if VERTEX_ANIM
    attribute vec3 a_position_next;
# if !NODES || USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO \
        || CAUSTICS || CALC_TBN_SPACE || USE_NODE_TEX_COORD_NO
    attribute vec3 a_normal_next;
#  if TEXTURE_NORM_CO || CALC_TBN_SPACE
    attribute vec4 a_tangent_next;
#  endif
# endif
#endif

#if !NODES
# if TEXCOORD
    attribute vec2 a_texcoord;
# endif

# if VERTEX_COLOR
    attribute vec3 a_color;
# endif
#endif // !NODES
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

#if REFLECTION_PASS
uniform mat4 u_view_matrix;
#else
uniform mat3 u_view_tsr;
#endif

uniform mat4 u_proj_matrix;
#if !NODES || BILLBOARD
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

/*============================================================================
                                   VARYINGS
============================================================================*/

varying vec3 v_pos_world;
#if !NODES || USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO \
        || CAUSTICS || CALC_TBN_SPACE || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND \
        || USE_NODE_TEX_COORD_NO
varying vec3 v_normal;
#endif

#if NODES || !DISABLE_FOG || (TEXTURE_NORM_CO && PARALLAX) || (WATER_EFFECTS && CAUSTICS) || SHADOW_USAGE == SHADOW_MASK_GENERATION || SHADOW_USAGE == SHADOW_MAPPING_BLEND
varying vec4 v_pos_view;
#endif

#if TEXTURE_NORM_CO || CALC_TBN_SPACE
varying vec4 v_tangent;
#endif

#if !NODES
varying vec3 v_eye_dir;
# if TEXCOORD
varying vec2 v_texcoord;
# endif

# if VERTEX_COLOR || DYNAMIC_GRASS
varying vec3 v_color;
# endif
#endif


#if SHADOW_USAGE == SHADOW_MAPPING_BLEND
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

#if REFLECTION_TYPE == REFL_PLANE || SHADOW_USAGE == SHADOW_MAPPING_OPAQUE \
        || REFRACTIVE || USE_NODE_B4W_REFRACTION
varying vec3 v_tex_pos_clip;
#endif

#if REFRACTIVE && (!NODES || USE_NODE_B4W_REFRACTION)
varying float v_view_depth;
#endif
/*============================================================================
                                  INCLUDES
============================================================================*/

#include <dynamic_grass.glslv>
#include <shadow.glslv>
#include <skin.glslv>
#include <wind_bending.glslv>

#if NODES
#include <nodes.glslv>
#endif // NODES

/*============================================================================
                                    MAIN
============================================================================*/

void main(void) {

#if REFLECTION_PASS
    mat4 view_matrix = u_view_matrix;
#else
    mat4 view_matrix = tsr_to_mat4(u_view_tsr);
#endif

    mat4 model_mat = tsr_to_mat4(u_model_tsr);

    vec3 position = a_position;

# if CALC_TBN_SPACE || USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO || \
        CAUSTICS || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND || !NODES
    vec3 normal = a_normal;
# else
    vec3 normal = vec3(0.0);
# endif

# if CALC_TBN_SPACE || !NODES && TEXTURE_NORM_CO == TEXTURE_COORDS_UV_ORCO
    vec3 tangent = vec3(a_tangent);
    vec3 binormal = a_tangent[3] * cross(normal, tangent);
# elif !NODES && TEXTURE_NORM_CO == TEXTURE_COORDS_NORMAL
    // NOTE: absolutely not precise. Better too avoid using such a setup
    vec3 world_pos = (model_mat * vec4(a_position, 1.0)).xyz;
    vec3 norm_world = normalize((model_mat * vec4(a_normal, 0.0)).xyz);
    vec3 eye_dir = world_pos - u_camera_eye;
    vec3 binormal = cross(eye_dir, norm_world);
    vec3 tangent = cross(norm_world, binormal);
# else
    vec3 tangent = vec3(0.0);
    vec3 binormal = vec3(0.0);
# endif

#if VERTEX_ANIM
    position = mix(position, a_position_next, u_va_frame_factor);
# if !NODES || USE_NODE_MATERIAL_BEGIN \
        || USE_NODE_GEOMETRY_NO || CAUSTICS || CALC_TBN_SPACE
    normal = mix(normal, a_normal_next, VERTEX_ANIM_MIX_NORMALS_FACTOR);
# endif
# if TEXTURE_NORM_CO
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

#if WIND_BEND || DYNAMIC_GRASS || BILLBOARD
    vec3 center = au_center_pos;
#else
    vec3 center = vec3(0.0);
#endif

#if DYNAMIC_GRASS
    vertex world = grass_vertex(position, tangent, binormal, normal,
            center, u_grass_map_depth, u_grass_map_color,
            u_grass_map_dim, u_grass_size, u_camera_eye, u_camera_quat,
            view_matrix);
#else
# if BILLBOARD
    vec3 wcen = (model_mat * vec4(center, 1.0)).xyz;

#  if BILLBOARD_PRES_GLOB_ORIENTATION && !STATIC_BATCH
    mat4 model_matrix = billboard_matrix_global(u_camera_eye, wcen,
            view_matrix, model_mat);
#  else
    mat4 model_matrix = billboard_matrix(u_camera_eye, wcen, view_matrix);
#  endif

#  if WIND_BEND && BILLBOARD_JITTERED
    vec3 vec_seed = (model_mat * vec4(center, 1.0)).xyz;
    model_matrix = model_matrix * bend_jitter_matrix(u_wind, u_time,
            u_jitter_amp, u_jitter_freq, vec_seed);
#  endif  // WIND_BEND && BILLBOARD_JITTERED
    vertex world = to_world(position - center, center, tangent, binormal, normal,
            model_matrix);
    world.center = wcen;
# else  // BILLBOARD
    vertex world = to_world(position, center, tangent, binormal, normal,
            model_mat);
# endif  // BILLBOARD
#endif  // DYNAMIC_GRASS

#if TEXTURE_NORM_CO || CALC_TBN_SPACE
    // calculate handedness as described in Math for 3D GP and CG, page 185
    float m = (dot(cross(world.normal, world.tangent),
        world.binormal) < 0.0) ? -1.0 : 1.0;

    v_tangent = vec4(world.tangent, m);
#endif

#if WIND_BEND
    bend_vertex(world.position, world.center, normal);
#endif

    v_pos_world = world.position;

#if !NODES || USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO \
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

    vec4 pos_view = view_matrix * vec4(world.position, 1.0);

#if NODES || !DISABLE_FOG || (TEXTURE_NORM_CO && PARALLAX) || (WATER_EFFECTS && CAUSTICS) || SHADOW_USAGE == SHADOW_MASK_GENERATION || SHADOW_USAGE == SHADOW_MAPPING_BLEND
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
