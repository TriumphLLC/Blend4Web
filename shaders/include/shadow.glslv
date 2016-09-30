#ifndef SHADOW_GLSLV
#define SHADOW_GLSLV

// #import u_normal_offset u_v_light_ts u_v_light_r u_v_light_tsr\
// u_p_light_matrix0 u_p_light_matrix1 u_p_light_matrix2 u_p_light_matrix3
// #import v_shadow_coord0 v_shadow_coord1 v_shadow_coord2 v_shadow_coord3

/*==============================================================================
                                    VARS
==============================================================================*/
#var MAC_OS_SHADOW_HACK 0
#var SHADOW_TEX_RES 2048.0

#var SHADOW_USAGE NO_SHADOWS
#var NUM_CAST_LAMPS 0
#var CSM_SECTION1 0
#var CSM_SECTION2 0
#var CSM_SECTION3 0

/*============================================================================*/

#include <std.glsl>

#if SHADOW_USAGE == SHADOW_MASK_GENERATION || SHADOW_USAGE == SHADOW_MAPPING_BLEND

#include <math.glslv>

vec4 get_shadow_coords_shifted(mat4 light_proj_matrix, vec4 pos_light_space, mat4 v_light_matrix) {
    // NOTE: shift coords to remove shadow map panning

    //NOTE: v_light_matrix[3] is world space point (0.0, 0.0, 0.0, 1.0)
    // translated into light view space
    vec2 shift = (light_proj_matrix * v_light_matrix[3]).xy;
    float half_tex_res = SHADOW_TEX_RES / 2.0;
    shift = floor(shift * half_tex_res + 0.5) / half_tex_res - shift;

    vec4 shadow_coord = light_proj_matrix * pos_light_space;
    shadow_coord.xy += shift;
    // moving from unit cube [-1,1] to [0,1]
    // NOTE scaling by 0.5 and adding 0.5 produces the same result
    // as multiplying by the bias matrix
    shadow_coord.xyz = 0.5 * (shadow_coord.xyz + shadow_coord.w);
    return shadow_coord;
}

void get_shadow_coords(vec3 pos, vec3 nor) {

# if MAC_OS_SHADOW_HACK
    mat4 v_light_matrix = tsr_to_mat4(u_v_light_tsr[0]);
# else
    mat4 v_light_matrix = tsr_to_mat4(mat3(u_v_light_ts[0], u_v_light_r[0], 0.0));
# endif

    // apply normal offset to prevent shadow acne
    vec4 pos_light = v_light_matrix * vec4(pos + u_normal_offset * nor,
            1.0);

    v_shadow_coord0 = get_shadow_coords_shifted(u_p_light_matrix0, pos_light, v_light_matrix);

    // NUM_CAST_LAMPS and CSM_SECTION are mutually exclusive directives
# if NUM_CAST_LAMPS > 1
#  if MAC_OS_SHADOW_HACK
    v_light_matrix = tsr_to_mat4(u_v_light_tsr[1]);
#  else
    v_light_matrix = tsr_to_mat4(mat3(u_v_light_ts[1], u_v_light_r[1], 0.0));
#  endif
    pos_light = v_light_matrix * vec4(pos + u_normal_offset * nor, 1.0);
    v_shadow_coord1 = get_shadow_coords_shifted(u_p_light_matrix1, pos_light, v_light_matrix);
# endif

# if NUM_CAST_LAMPS > 2
#  if MAC_OS_SHADOW_HACK
    v_light_matrix = tsr_to_mat4(u_v_light_tsr[2]);
#  else
    v_light_matrix = tsr_to_mat4(mat3(u_v_light_ts[2], u_v_light_r[2], 0.0));
#  endif
    pos_light = v_light_matrix * vec4(pos + u_normal_offset * nor, 1.0);
    v_shadow_coord2 = get_shadow_coords_shifted(u_p_light_matrix2, pos_light, v_light_matrix);
# endif

# if NUM_CAST_LAMPS > 3
#  if MAC_OS_SHADOW_HACK
    v_light_matrix = tsr_to_mat4(u_v_light_tsr[3]);
#  else
    v_light_matrix = tsr_to_mat4(mat3(u_v_light_ts[3], u_v_light_r[3], 0.0));
#  endif
    pos_light = v_light_matrix * vec4(pos + u_normal_offset * nor, 1.0);
    v_shadow_coord3 = get_shadow_coords_shifted(u_p_light_matrix3, pos_light, v_light_matrix);
# endif

# if CSM_SECTION1
    v_shadow_coord1 = get_shadow_coords_shifted(u_p_light_matrix1, pos_light, v_light_matrix);
# endif

# if CSM_SECTION2
    v_shadow_coord2 = get_shadow_coords_shifted(u_p_light_matrix2, pos_light, v_light_matrix);
# endif

# if CSM_SECTION3
    v_shadow_coord3 = get_shadow_coords_shifted(u_p_light_matrix3, pos_light, v_light_matrix);
# endif
}
#endif

#endif
