#import u_normal_offset u_b_light_matrix u_v_light_matrix \
u_p_light_matrix0 u_p_light_matrix1 u_p_light_matrix2 u_p_light_matrix3
#import v_shadow_coord0 v_shadow_coord1 v_shadow_coord2 v_shadow_coord3

#export get_shadow_coords

#var SHADOW_TEX_RES 0.0

#if SHADOW_USAGE == SHADOW_MASK_GENERATION || SHADOW_USAGE == SHADOW_MAPPING_BLEND

vec4 get_shadow_coords_shifted(mat4 light_proj_matrix, vec4 pos_light_space) {
    // NOTE: shift coords to remove shadow map panning

    //NOTE: u_v_light_matrix[3] is world space point (0.0, 0.0, 0.0, 1.0)
    // translated into light view space
    vec2 shift = (light_proj_matrix * u_v_light_matrix[3]).xy;
    float half_tex_res = SHADOW_TEX_RES / 2.0;
    shift = floor(shift * half_tex_res + 0.5) / half_tex_res - shift;

    vec4 shadow_coord = light_proj_matrix * pos_light_space;
    shadow_coord.xy += shift;
    shadow_coord = u_b_light_matrix * shadow_coord;

    return shadow_coord;
}

void get_shadow_coords(vec3 pos, vec3 nor) {

    // NOTE scaling by 0.5 and adding 0.5 produces the same result
    // as multiplying by the bias matrix

    // apply normal offset to prevent shadow acne
    vec4 pos_light = u_v_light_matrix * vec4(pos + u_normal_offset * nor,
            1.0);

    v_shadow_coord0 = get_shadow_coords_shifted(u_p_light_matrix0, pos_light);

# if CSM_SECTION1
    v_shadow_coord1 = get_shadow_coords_shifted(u_p_light_matrix1, pos_light);
# endif

# if CSM_SECTION2
    v_shadow_coord2 = get_shadow_coords_shifted(u_p_light_matrix2, pos_light);
# endif

# if CSM_SECTION3
    v_shadow_coord3 = get_shadow_coords_shifted(u_p_light_matrix3, pos_light);
# endif
}
#endif
