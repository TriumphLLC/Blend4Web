#import u_shadow_map0 u_shadow_map1 u_shadow_map2 u_shadow_map3 u_shadow_mask
#import v_shadow_coord0 v_shadow_coord1 v_shadow_coord2 v_shadow_coord3 \
v_tex_pos_clip v_pos_view
#import unpack_depth

#export shadow_map_visibility shadow_visibility calc_shadow_factor
#export shadow_ssao

#var CSM_SECTION_DIST0 0.0
#var CSM_SECTION_DIST1 0.0
#var CSM_SECTION_DIST2 0.0
#var CSM_SECTION_DIST3 0.0
#var PCF_TEXEL_SIZE 0.0

#if SHADOW_SRC == SHADOW_SRC_MASK
vec4 shadow_ssao;
#endif

#if SHADOW_SRC != SHADOW_SRC_NONE

# if SHADOW_SRC == SHADOW_SRC_RGBA_PCF
float get(sampler2D tex, vec3 texcoord, float x, float y) {
    vec2 coord = texcoord.xy + vec2(x,y) * PCF_TEXEL_SIZE;
    vec4 rgba_depth = texture2D(tex, coord);

    return unpack_depth(rgba_depth);
}
# endif

float shadow_map_visibility(vec3 shadow_coord, sampler2D shadow_map, float shadow_visibility_falloff) {

    float visibility;

    shadow_coord.z = clamp(shadow_coord.z, 0.0, 1.0);

    // bias against self-shadow 
    //shadow_coord.z -= 0.0005;

# if SHADOW_SRC == SHADOW_SRC_RGBA
	vec4 rgba_depth = texture2D(shadow_map, shadow_coord.xy);
	float depth = unpack_depth(rgba_depth);

    if (all(lessThan(shadow_coord.xy, vec2(1.0))) && 
            all(greaterThan(shadow_coord.xy, vec2(0.0))) && 
            depth < shadow_coord.z) {

        // light bleed mapping
        // http://developer.amd.com/wordpress/media/2012/10/D3DTutorial05_Real-Time_Skin_Rendering.pdf
        float diff = shadow_coord.z - depth;
        visibility = exp(-diff * shadow_visibility_falloff);
    } else
        visibility = 1.0;

# elif SHADOW_SRC == SHADOW_SRC_RGBA_PCF
    vec4 depth;

    // 2x2
    depth.r = get(shadow_map, shadow_coord, 0.5, 0.5);
    depth.g = get(shadow_map, shadow_coord, 0.5,-0.5);
    depth.b = get(shadow_map, shadow_coord,-0.5,-0.5);
    depth.a = get(shadow_map, shadow_coord,-0.5, 0.5);

    vec4 z = vec4(shadow_coord.z, shadow_coord.z, shadow_coord.z, shadow_coord.z);

    if (all(lessThan(shadow_coord.xy, vec2(1.0))) && 
            all(greaterThan(shadow_coord.xy, vec2(0.0))))
        visibility = dot(vec4(greaterThanEqual(depth, z)), vec4(0.25, 0.25, 0.25, 0.25));
    else
	    visibility = 1.0;

# elif SHADOW_SRC == SHADOW_SRC_VSM
    vec4 depth_square = texture2D(shadow_map, shadow_coord.xy);
    float m1 = depth_square.r;
    float m2 = depth_square.g;

    if (all(lessThan(shadow_coord.xy, vec2(1.0))) && 
            all(greaterThan(shadow_coord.xy, vec2(0.0))) && 
            m1 < shadow_coord.z) {
        float variance = m2 - m1*m1;
        //variance = max(variance, 0.0002);
        float delta = shadow_coord.z - m1;
        
        visibility = variance / (variance + delta * delta);
    } else
	    visibility = 1.0;

# elif SHADOW_SRC == SHADOW_SRC_DEPTH
	float depth = texture2D(shadow_map, shadow_coord.xy).r;

    if (all(lessThan(shadow_coord.xy, vec2(1.0))) && 
            all(greaterThan(shadow_coord.xy, vec2(0.0))) && 
            depth < shadow_coord.z) {
        visibility = 0.0;
        
        // light bleed mapping
        // http://developer.amd.com/wordpress/media/2012/10/D3DTutorial05_Real-Time_Skin_Rendering.pdf
        float diff = shadow_coord.z - depth;
        visibility = exp(-diff * shadow_visibility_falloff);
    } else
        visibility = 1.0;
# endif

    return clamp(visibility, 0.0, 1.0);
}

# if SHADOW_SRC != SHADOW_SRC_MASK
float shadow_visibility(float depth, float vis_falloff) {

    vec3 shadow_coord;
    float vis = 1.0;

    // inverted (positive) view depth
    float view_depth_inv = -depth;

    if (view_depth_inv < CSM_SECTION_DIST0) {
        shadow_coord = v_shadow_coord0.xyz / v_shadow_coord0.w;
        vis = shadow_map_visibility(shadow_coord, u_shadow_map0, vis_falloff);
    }
#  if CSM_SECTION1
    else if (view_depth_inv < CSM_SECTION_DIST1) {
        shadow_coord = v_shadow_coord1.xyz / v_shadow_coord1.w;
        vis = shadow_map_visibility(shadow_coord, u_shadow_map1, vis_falloff);
    } 
#  endif
#  if CSM_SECTION2
    else if (view_depth_inv < CSM_SECTION_DIST2) {
        shadow_coord = v_shadow_coord2.xyz / v_shadow_coord2.w;
        vis = shadow_map_visibility(shadow_coord, u_shadow_map2, vis_falloff);
    }
#  endif
#  if CSM_SECTION3
    else if (view_depth_inv < CSM_SECTION_DIST3) {
        shadow_coord = v_shadow_coord3.xyz / v_shadow_coord3.w;
        vis = shadow_map_visibility(shadow_coord, u_shadow_map3, vis_falloff);
    }
#  endif
    return vis;
}

# endif

#endif  // !SHADOW_SRC_NONE

float calc_shadow_factor(in float shadow_visibility_falloff,
                         inout vec3 D) {
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
    return shadow_visibility(v_pos_view.z, shadow_visibility_falloff);
#else
    return 1.0;
#endif
}
