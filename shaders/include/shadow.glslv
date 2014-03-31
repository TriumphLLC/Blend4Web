#import v_shadow_coord0 v_shadow_coord1 v_shadow_coord2 v_shadow_coord3 \
v_tex_pos_clip
#import u_b_light_matrix u_v_light_matrix u_p_light_matrix0 u_p_light_matrix1 \
u_p_light_matrix2 u_p_light_matrix3 

#export get_shadow_coords

#if SHADOW_SRC != SHADOW_SRC_MASK && SHADOW_SRC != SHADOW_SRC_NONE

void get_shadow_coords(vec3 pos) {

    // NOTE scaling by 0.5 and adding 0.5 produces the same result 
    // as multiplying by the bias matrix

    v_shadow_coord0 = u_b_light_matrix * u_p_light_matrix0 * 
            u_v_light_matrix * vec4(pos, 1.0);

# if CSM_SECTION1
    v_shadow_coord1 = u_b_light_matrix * u_p_light_matrix1 * 
            u_v_light_matrix * vec4(pos, 1.0);
# endif

# if CSM_SECTION2
    v_shadow_coord2 = u_b_light_matrix * u_p_light_matrix2 * 
            u_v_light_matrix * vec4(pos, 1.0);
# endif

# if CSM_SECTION3
    v_shadow_coord3 = u_b_light_matrix * u_p_light_matrix3 *
            u_v_light_matrix * vec4(pos, 1.0);
# endif
}

#elif SHADOW_SRC == SHADOW_SRC_MASK

void get_shadow_coords(vec4 pos_clip) {

    float xc = pos_clip.x;
    float yc = pos_clip.y;
    float wc = pos_clip.w;

    v_tex_pos_clip.x = (xc + wc) / 2.0;
    v_tex_pos_clip.y = (yc + wc) / 2.0;
    v_tex_pos_clip.z = wc;
}

#endif
