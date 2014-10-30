#import u_csm_center_dists u_pcf_blur_radii
#import u_shadow_map0 u_shadow_map1 u_shadow_map2 u_shadow_map3 u_shadow_mask
#import v_shadow_coord0 v_shadow_coord1 v_shadow_coord2 v_shadow_coord3 \
v_tex_pos_clip v_pos_view
#import generate_dithering_tex

#export shadow_visibility calc_shadow_factor
#export shadow_ssao

#var CSM_BLEND_BETWEEN_CASCADES 1.0
#var CSM_FADE_LAST_CASCADE 1.0
#var SHADOW_TEX_RES 0.0

#define M_PI 3.14159265359

#if SHADOW_SRC == SHADOW_SRC_MASK
vec4 shadow_ssao;
#endif

#if SHADOW_SRC != SHADOW_SRC_NONE
const float SHADOW_BLUR_OFFSET = 0.1;
const float SHADOW_FADE_OFFSET = 0.1;

# if SHADOW_SRC != SHADOW_SRC_MASK
const float FIRST_CASCADE_BLUR_INDENT = 0.05;
# endif

# if SHADOW_SRC == SHADOW_SRC_DEPTH
// Poisson disk
mat4 POISSON_DISK_X = mat4(
    0.14383161, 0.34495938, -0.38277543, -0.26496911,
    0.53742981, 0.19984126, 0.79197514, -0.094184101,
    -0.94201624, -0.91588581, -0.2418884, 0.44323325,
    -0.81544232, 0.94558609, -0.81409955, 0.97484398
);

mat4 POISSON_DISK_Y = mat4(
    -0.1410079, 0.2938776, 0.27676845, -0.41893023,
    -0.4737342, 0.78641367, 0.19090188, -0.9293887,
    -0.39906216, 0.45771432, 0.99706507, -0.97511554,
    -0.87912464, -0.76890725, 0.9143759, 0.7564837
);
# endif

float shadow_map_visibility(vec3 shadow_coord, sampler2D shadow_map,
        float blur_radius) {

    float visibility;
    shadow_coord.z = clamp(shadow_coord.z, 0.0, 1.0);

# if SHADOW_SRC == SHADOW_SRC_DEPTH
    visibility = 0.0;

    // Poisson disk random rotation
    float rnd_val = generate_dithering_tex(shadow_coord.xy).x * M_PI;
    float rnd_cos = cos(rnd_val);
    float rnd_sin = sin(rnd_val);
    mat2 rotation_mat = mat2(rnd_cos, rnd_sin, -rnd_sin, rnd_cos);

    vec2 coords, offset;
    for (int i = 0; i < 4; i++)
        for (int j = 0; j < 4; j++) {
            offset.x = POISSON_DISK_X[i][j];
            offset.y = POISSON_DISK_Y[i][j];

            offset = rotation_mat * offset;
            coords = shadow_coord.xy + offset * blur_radius / SHADOW_TEX_RES;
            visibility += step(shadow_coord.z, texture2D(shadow_map, coords).r);
        }

    visibility /= 16.0;
# else
    visibility = 1.0;
# endif

    return clamp(visibility, 0.0, 1.0);
}

float shadow_map_visibility_overlap(vec3 shadow_coord0, sampler2D shadow_map0,
        vec3 shadow_coord1, sampler2D shadow_map1, float blur_radius0,
        float blur_radius1, float factor) {

    float vis0, vis1;
    shadow_coord0.z = clamp(shadow_coord0.z, 0.0, 1.0);
    shadow_coord1.z = clamp(shadow_coord1.z, 0.0, 1.0);

# if SHADOW_SRC == SHADOW_SRC_DEPTH
    vis0 = 0.0; vis1 = 0.0;

    // Poisson disk random rotation
    float rnd_val = generate_dithering_tex(shadow_coord0.xy).x * M_PI;
    float rnd_cos = cos(rnd_val);
    float rnd_sin = sin(rnd_val);
    mat2 rotation_mat = mat2(rnd_cos, rnd_sin, -rnd_sin, rnd_cos);

    vec2 coords, offset;
    for (int i = 0; i < 4; i++)
        for (int j = 0; j < 4; j++) {
            offset.x = POISSON_DISK_X[i][j];
            offset.y = POISSON_DISK_Y[i][j];
            offset = rotation_mat * offset;

            coords = shadow_coord0.xy + offset * blur_radius0 / SHADOW_TEX_RES;
            vis0 += step(shadow_coord0.z, texture2D(shadow_map0, coords).r);
            coords = shadow_coord1.xy + offset * blur_radius1 / SHADOW_TEX_RES;
            vis1 += step(shadow_coord1.z, texture2D(shadow_map1, coords).r);
        }

    vis0 = mix(vis0, vis1, factor);
    vis0 /= 16.0;
# else
    vis0 = 1.0;
# endif

    return clamp(vis0, 0.0, 1.0);
}

# if SHADOW_SRC != SHADOW_SRC_MASK
bool is_tex_coords_inside(vec2 coords, float indent) {
    return all(lessThanEqual(coords, vec2(1.0 + indent)))
            && all(greaterThanEqual(coords, vec2(0.0 - indent)));
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
        sampler2D shadow_map0, sampler2D shadow_map1, float blur_radius0,
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

float get_visibility_faded(vec3 tex_coords, sampler2D shadow_map,
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

float shadow_visibility(float depth) {

    float vis = 1.0;

    vec3 shadow_coord0 = v_shadow_coord0.xyz / v_shadow_coord0.w;
#  if CSM_SECTION1
    vec3 shadow_coord1 = v_shadow_coord1.xyz / v_shadow_coord1.w;
#  endif
#  if CSM_SECTION2
    vec3 shadow_coord2 = v_shadow_coord2.xyz / v_shadow_coord2.w;
#  endif
#  if CSM_SECTION3
    vec3 shadow_coord3 = v_shadow_coord3.xyz / v_shadow_coord3.w;
#  endif

#  if CSM_SECTION1
    if (is_tex_coords_inside(shadow_coord0.xy, 0.0)) {
        vis = get_visibility_blended(shadow_coord0, shadow_coord1,
                u_shadow_map0, u_shadow_map1, u_pcf_blur_radii[0],
                u_pcf_blur_radii[1], u_csm_center_dists[0], depth);
    }
#  else
    // NOTE: small indent for single cascade blur (especially for non-csm scheme)
    if (is_tex_coords_inside(shadow_coord0.xy, FIRST_CASCADE_BLUR_INDENT)) {
        vis = get_visibility_faded(shadow_coord0, u_shadow_map0,
                u_pcf_blur_radii[0], u_csm_center_dists[0], depth);
    }
#  endif


#  if CSM_SECTION1
    else {
        if (is_tex_coords_inside(shadow_coord1.xy, 0.0)) {
#   if CSM_SECTION2
            vis = get_visibility_blended(shadow_coord1, shadow_coord2,
                u_shadow_map1, u_shadow_map2, u_pcf_blur_radii[1],
                u_pcf_blur_radii[2], u_csm_center_dists[1], depth);
#   else
            vis = get_visibility_faded(shadow_coord1, u_shadow_map1,
                u_pcf_blur_radii[1], u_csm_center_dists[1], depth);
#   endif
        }


#   if CSM_SECTION2
        else {
            if (is_tex_coords_inside(shadow_coord2.xy, 0.0)) {
#    if CSM_SECTION3
                vis = get_visibility_blended(shadow_coord2, shadow_coord3,
                    u_shadow_map2, u_shadow_map3, u_pcf_blur_radii[2],
                    u_pcf_blur_radii[3], u_csm_center_dists[2], depth);
#    else
                vis = get_visibility_faded(shadow_coord2, u_shadow_map2,
                    u_pcf_blur_radii[2], u_csm_center_dists[2], depth);
#    endif
            }


#    if CSM_SECTION3
            else {
                if (is_tex_coords_inside(shadow_coord3.xy, 0.0))
                    vis = get_visibility_faded(shadow_coord3, u_shadow_map3,
                        u_pcf_blur_radii[3], u_csm_center_dists[3], depth);
            }
#    endif // CSM_SECTION3
        }
#   endif // CSM_SECTION2
    }
#  endif // CSM_SECTION1

    return vis;
}

# endif

#endif  // !SHADOW_SRC_NONE

float calc_shadow_factor(inout vec3 D) {
#if SHADOW_SRC == SHADOW_SRC_MASK
    // TODO:
    vec2 visibility = texture2DProj(u_shadow_mask, v_tex_pos_clip).rg;
    //vec3 shadow = mix(u_shadow_color, vec3(1.0), vec3(visibility.r));
    vec3 shadow = vec3(visibility.r);
    float ssao = visibility.g;
    shadow_ssao = vec4(shadow, ssao);
    D *= shadow_ssao.a;
    return shadow_ssao.r;
#elif SHADOW_SRC != SHADOW_SRC_NONE
    return shadow_visibility(v_pos_view.z);
#else
    return 1.0;
#endif
}
