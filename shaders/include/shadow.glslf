#var PRECISION lowp

#import u_csm_center_dists u_pcf_blur_radii
#import u_shadow_map0 u_shadow_map1 u_shadow_map2 u_shadow_map3 u_shadow_mask
#import v_shadow_coord0 v_shadow_coord1 v_shadow_coord2 v_shadow_coord3 \
v_tex_pos_clip v_pos_view
#import generate_dithering_tex

#export shadow_visibility calc_shadow_factor

#var CSM_BLEND_BETWEEN_CASCADES 1.0
#var CSM_FADE_LAST_CASCADE 1.0
#var SHADOW_TEX_RES 0.0

#define M_PI 3.14159265359

#if SHADOW_USAGE == SHADOW_MASK_GENERATION || SHADOW_USAGE == SHADOW_MAPPING_BLEND
const float SHADOW_BLUR_OFFSET = 0.1;
const float SHADOW_FADE_OFFSET = 0.1;
const float SINGLE_CASCADE_BORDER_INDENT = -0.01;
const float FIRST_CASCADE_BLUR_INDENT = 0.05;

// Poisson disk
// NOTE: use many vec4's to prevent firefox crash on mobile devices
vec4 POISSON_DISK_X_0 = vec4(0.14383161, 0.34495938, -0.38277543, -0.26496911);
vec4 POISSON_DISK_X_1 = vec4(0.53742981, 0.19984126, 0.79197514, -0.094184101);
vec4 POISSON_DISK_X_2 = vec4(-0.94201624, -0.91588581, -0.2418884, 0.44323325);
vec4 POISSON_DISK_X_3 = vec4(-0.81544232, 0.94558609, -0.81409955, 0.97484398);

vec4 POISSON_DISK_Y_0 = vec4(-0.1410079, 0.2938776, 0.27676845, -0.41893023);
vec4 POISSON_DISK_Y_1 = vec4(-0.4737342, 0.78641367, 0.19090188, -0.9293887);
vec4 POISSON_DISK_Y_2 = vec4(-0.39906216, 0.45771432, 0.99706507, -0.97511554);
vec4 POISSON_DISK_Y_3 = vec4(-0.87912464, -0.76890725, 0.9143759, 0.7564837);

bool is_tex_coords_inside(vec2 coords, float indent) {
    return all(lessThanEqual(coords, vec2(1.0 + indent)))
            && all(greaterThanEqual(coords, vec2(0.0 - indent)));
}

float calc_poisson_visibility(float poisson_disc_x, float poisson_disc_y,
        mat2 rotation_mat, vec3 shadow_coord, float blur_radius,
        PRECISION sampler2D shadow_map) {

    vec2 coords, offset;
    offset.x = poisson_disc_x;
    offset.y = poisson_disc_y;

    offset = rotation_mat * offset;
    coords = shadow_coord.xy + offset * blur_radius / SHADOW_TEX_RES;

# if !CSM_SECTION1
    // NOTE: fix issue with solid black border at the edge of the last cascade
    // caused by FIRST_CASCADE_BLUR_INDENT for single cascade scheme
    if (!is_tex_coords_inside(coords, SINGLE_CASCADE_BORDER_INDENT))
        return 1.0;
    else
# endif
        return step(shadow_coord.z, texture2D(shadow_map, coords).r);
}

float shadow_map_visibility(vec3 shadow_coord, PRECISION sampler2D shadow_map,
        float blur_radius) {

    float visibility = 0.0;
    shadow_coord.z = clamp(shadow_coord.z, 0.0, 1.0);

    // Poisson disk random rotation
    float rnd_val = generate_dithering_tex(shadow_coord.xy).x * M_PI;
    float rnd_cos = cos(rnd_val);
    float rnd_sin = sin(rnd_val);
    mat2 rotation_mat = mat2(rnd_cos, rnd_sin, -rnd_sin, rnd_cos);

    for (int i = 0; i < 4; i++) {
        visibility += calc_poisson_visibility(POISSON_DISK_X_0[i],
                POISSON_DISK_Y_0[i], rotation_mat, shadow_coord,
                blur_radius, shadow_map);
        visibility += calc_poisson_visibility(POISSON_DISK_X_1[i],
                POISSON_DISK_Y_1[i], rotation_mat, shadow_coord,
                blur_radius, shadow_map);
        visibility += calc_poisson_visibility(POISSON_DISK_X_2[i],
                POISSON_DISK_Y_2[i], rotation_mat, shadow_coord,
                blur_radius, shadow_map);
        visibility += calc_poisson_visibility(POISSON_DISK_X_3[i],
                POISSON_DISK_Y_3[i], rotation_mat, shadow_coord,
                blur_radius, shadow_map);
    }
    return clamp(visibility / 16.0, 0.0, 1.0);
}

float shadow_map_visibility_overlap(vec3 shadow_coord0, PRECISION sampler2D shadow_map0,
        vec3 shadow_coord1, PRECISION sampler2D shadow_map1, float blur_radius0,
        float blur_radius1, float factor) {

    float vis0, vis1;
    shadow_coord0.z = clamp(shadow_coord0.z, 0.0, 1.0);
    shadow_coord1.z = clamp(shadow_coord1.z, 0.0, 1.0);

    vis0 = 0.0; vis1 = 0.0;

    // Poisson disk random rotation
    float rnd_val = generate_dithering_tex(shadow_coord0.xy).x * M_PI;
    float rnd_cos = cos(rnd_val);
    float rnd_sin = sin(rnd_val);
    mat2 rotation_mat = mat2(rnd_cos, rnd_sin, -rnd_sin, rnd_cos);

    // NOTE: use different loops for sampling different shadow maps to avoid 
    // some issues on systems with free drivers (e.g. Arch)
    for (int i = 0; i < 4; i++) {
        vis0 += calc_poisson_visibility(POISSON_DISK_X_0[i],
                POISSON_DISK_Y_0[i], rotation_mat, shadow_coord0,
                blur_radius0, shadow_map0);
        vis0 += calc_poisson_visibility(POISSON_DISK_X_1[i],
                POISSON_DISK_Y_1[i], rotation_mat, shadow_coord0,
                blur_radius0, shadow_map0);
        vis0 += calc_poisson_visibility(POISSON_DISK_X_2[i],
                POISSON_DISK_Y_2[i], rotation_mat, shadow_coord0,
                blur_radius0, shadow_map0);
        vis0 += calc_poisson_visibility(POISSON_DISK_X_3[i],
                POISSON_DISK_Y_3[i], rotation_mat, shadow_coord0,
                blur_radius0, shadow_map0);
    }

    for (int i = 0; i < 4; i++) {
        vis1 += calc_poisson_visibility(POISSON_DISK_X_0[i],
                POISSON_DISK_Y_0[i], rotation_mat, shadow_coord1,
                blur_radius1, shadow_map1);
        vis1 += calc_poisson_visibility(POISSON_DISK_X_1[i],
                POISSON_DISK_Y_1[i], rotation_mat, shadow_coord1,
                blur_radius1, shadow_map1);
        vis1 += calc_poisson_visibility(POISSON_DISK_X_2[i],
                POISSON_DISK_Y_2[i], rotation_mat, shadow_coord1,
                blur_radius1, shadow_map1);
        vis1 += calc_poisson_visibility(POISSON_DISK_X_3[i],
                POISSON_DISK_Y_3[i], rotation_mat, shadow_coord1,
                blur_radius1, shadow_map1);
    }

    vis0 = mix(vis0, vis1, factor);
    vis0 /= 16.0;

    return clamp(vis0, 0.0, 1.0);
}

float get_edge_distance_tex(vec2 coords) {
    float a = min(coords.x, coords.y);
    float b = min(1.0 - coords.x, 1.0 - coords.y);
    return min(a, b);
}

float fade_shadow(float vis, float edge_dist) {
    if (edge_dist >= 0.0 && edge_dist <= SHADOW_FADE_OFFSET)
        vis = (vis - 1.0) / SHADOW_FADE_OFFSET * edge_dist + 1.0;
    return vis;
}

float get_visibility_blended(vec3 tex_coords0, vec3 tex_coords1,
        PRECISION sampler2D shadow_map0, PRECISION sampler2D shadow_map1, float blur_radius0,
        float blur_radius1, float center_dist, float depth) {

    float vis;

# if CSM_BLEND_BETWEEN_CASCADES
    float edge_dist = get_edge_distance_tex(tex_coords0.xy);
    if (-depth > center_dist && edge_dist >= 0.0
            && edge_dist <= SHADOW_BLUR_OFFSET
            && is_tex_coords_inside(tex_coords1.xy, 0.0)) {
        float blend_factor = 1.0 - edge_dist / SHADOW_BLUR_OFFSET;
        vis = shadow_map_visibility_overlap(tex_coords0,
                shadow_map0, tex_coords1, shadow_map1, blur_radius0,
                blur_radius1, blend_factor);
    } else
# endif
        vis = shadow_map_visibility(tex_coords0, shadow_map0, blur_radius0);

    return vis;
}

float get_visibility_faded(vec3 tex_coords, PRECISION sampler2D shadow_map,
        float blur_radius, float center_dist, float depth) {

    float vis = shadow_map_visibility(tex_coords, shadow_map, blur_radius);
# if CSM_FADE_LAST_CASCADE
    if (-depth > center_dist) {
        float edge_dist = get_edge_distance_tex(tex_coords.xy);
        vis = fade_shadow(vis, edge_dist);
    }
# endif

    return vis;
}

vec4 shadow_visibility(float depth) {

    float vis = 1.0;

    // NOTE: possible division by zero
    vec3 shadow_coord0 = v_shadow_coord0.xyz / v_shadow_coord0.w;
    // fix for shadow maps from perspective camera (actually works for 
    // all cameras): no shadows behind the camera
    if (v_shadow_coord0.w < 0.0)
        shadow_coord0.z = 0.0;
# if CSM_SECTION1 || NUM_CAST_LAMPS > 1
    vec3 shadow_coord1 = v_shadow_coord1.xyz / v_shadow_coord1.w;
    if (v_shadow_coord1.w < 0.0)
        shadow_coord1.z = 0.0;
# endif
# if CSM_SECTION2 || NUM_CAST_LAMPS > 2
    vec3 shadow_coord2 = v_shadow_coord2.xyz / v_shadow_coord2.w;
    if (v_shadow_coord2.w < 0.0)
        shadow_coord2.z = 0.0;
# endif
# if CSM_SECTION3 || NUM_CAST_LAMPS > 3
    vec3 shadow_coord3 = v_shadow_coord3.xyz / v_shadow_coord3.w;
    if (v_shadow_coord3.w < 0.0)
        shadow_coord3.z = 0.0;
# endif

# if CSM_SECTION1
    if (is_tex_coords_inside(shadow_coord0.xy, 0.0)) {
        vis = get_visibility_blended(shadow_coord0, shadow_coord1,
                u_shadow_map0, u_shadow_map1, u_pcf_blur_radii[0],
                u_pcf_blur_radii[1], u_csm_center_dists[0], depth);
    }
# else
    // NOTE: small indent for single cascade blur (especially for non-csm scheme)
    if (is_tex_coords_inside(shadow_coord0.xy, FIRST_CASCADE_BLUR_INDENT)) {
        vis = get_visibility_faded(shadow_coord0, u_shadow_map0,
                u_pcf_blur_radii[0], u_csm_center_dists[0], depth);
    }
# endif


# if CSM_SECTION1
    else {
        if (is_tex_coords_inside(shadow_coord1.xy, 0.0)) {
#  if CSM_SECTION2
            vis = get_visibility_blended(shadow_coord1, shadow_coord2,
                u_shadow_map1, u_shadow_map2, u_pcf_blur_radii[1],
                u_pcf_blur_radii[2], u_csm_center_dists[1], depth);
#  else
            vis = get_visibility_faded(shadow_coord1, u_shadow_map1,
                u_pcf_blur_radii[1], u_csm_center_dists[1], depth);
#  endif
        }


#  if CSM_SECTION2
        else {
            if (is_tex_coords_inside(shadow_coord2.xy, 0.0)) {
#   if CSM_SECTION3
                vis = get_visibility_blended(shadow_coord2, shadow_coord3,
                    u_shadow_map2, u_shadow_map3, u_pcf_blur_radii[2],
                    u_pcf_blur_radii[3], u_csm_center_dists[2], depth);
#   else
                vis = get_visibility_faded(shadow_coord2, u_shadow_map2,
                    u_pcf_blur_radii[2], u_csm_center_dists[2], depth);
#   endif
            }


#   if CSM_SECTION3
            else {
                if (is_tex_coords_inside(shadow_coord3.xy, 0.0))
                    vis = get_visibility_faded(shadow_coord3, u_shadow_map3,
                        u_pcf_blur_radii[3], u_csm_center_dists[3], depth);
            }
#   endif // CSM_SECTION3
        }
#  endif // CSM_SECTION2
    }
# endif // CSM_SECTION1

# if NUM_CAST_LAMPS > 1
    float vis_lamp_1 = shadow_map_visibility(shadow_coord1, u_shadow_map1, u_pcf_blur_radii[0]);
# else
    float vis_lamp_1 = 0.0;
# endif

# if NUM_CAST_LAMPS > 2
    float vis_lamp_2 = shadow_map_visibility(shadow_coord2, u_shadow_map2, u_pcf_blur_radii[0]);
# else
    float vis_lamp_2 = 0.0;
# endif

# if NUM_CAST_LAMPS > 3
    float vis_lamp_3 = shadow_map_visibility(shadow_coord3, u_shadow_map3, u_pcf_blur_radii[0]);
# else
    float vis_lamp_3 = 1.0;
# endif

    return vec4(vis, vis_lamp_1, vis_lamp_2, vis_lamp_3);
}

#endif  // SHADOW_USAGE == SHADOW_MASK_GENERATION || SHADOW_USAGE == SHADOW_MAPPING_BLEND

vec4 calc_shadow_factor(inout vec3 D) {
#if SHADOW_USAGE == SHADOW_MAPPING_OPAQUE
    // TODO:
    vec4 visibility = texture2DProj(u_shadow_mask, v_tex_pos_clip);
# if NUM_CAST_LAMPS < 3
    D *= visibility.a;
# endif
    return visibility;
#elif SHADOW_USAGE == SHADOW_MASK_GENERATION || SHADOW_USAGE == SHADOW_MAPPING_BLEND
    vec4 visibility = shadow_visibility(v_pos_view.z);
    return visibility;
#else
    return vec4(1.0);
#endif
}
