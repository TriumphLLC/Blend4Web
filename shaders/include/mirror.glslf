#ifndef MIRROR_GLSLF
#define MIRROR_GLSLF

// #import u_plane_reflection u_mirrormap
// #import v_tex_pos_clip u_refl_plane
// #import u_fresnel_params
// #import u_cube_reflection

/*==============================================================================
                                    VARS
==============================================================================*/
#var REFLECTION_TYPE REFL_NONE
#var REFLECTION_PASS REFL_PASS_NONE
#var USE_BSDF_SKY_DIM

/*============================================================================*/

#include <std.glsl>

#if REFLECTION_TYPE == REFL_PLANE || REFLECTION_TYPE == REFL_CUBE || REFLECTION_TYPE == REFL_MIRRORMAP

#include <color_util.glslf>
#include <math.glslv>

#define REFL_BUMP 0.1

float fresnel_mirror(in vec3 eye_dir, vec3 eye_reflected, float N, float r0)
{
    vec3 reflected_halfway = normalize(eye_reflected + eye_dir);
    float one_minus_cos_theta = 1.0 - dot(eye_dir, reflected_halfway);
    float r = r0 + (1.0 - r0) * pow(one_minus_cos_theta, N);

    return r;
}

void apply_mirror(inout vec3 base_color, vec3 eye_dir, vec3 normal,
                  float reflect_factor, mat3 view_tsr)
{
    vec3 eye_reflected = reflect(-eye_dir, normal);

    float N  = u_fresnel_params[2];
    float r0 = u_fresnel_params[3];

    float r = 1.0;
    // NOTE: fix for devices with low precision
    if (N != 0.0)
        r = fresnel_mirror(eye_dir, eye_reflected, N, r0);

# if REFLECTION_TYPE == REFL_CUBE
    vec3 reflect_color = GLSL_TEXTURE_CUBE(u_cube_reflection, eye_reflected).xyz;
# elif REFLECTION_TYPE == REFL_PLANE
#  if REFLECTION_PASS == REFL_PASS_NONE
    vec3 norm_proj_refl = u_refl_plane.xyz * dot(normal, u_refl_plane.xyz);
    vec3 normal_offset = normal - norm_proj_refl;
    vec2 normal_offset_view = tsr9_transform_dir(view_tsr, normal_offset).xy;

    vec2 refl_coord = v_tex_pos_clip.xy/ v_tex_pos_clip.z;
    refl_coord += normal_offset_view * REFL_BUMP;
    vec3 reflect_color = GLSL_TEXTURE(u_plane_reflection, refl_coord).rgb;
#  else //REFLECTION_PASS == REFL_PASS_NONE
    vec3 reflect_color = vec3(1.0);
    reflect_factor = 0.0;
#  endif //REFLECTION_PASS == REFL_PASS_NONE
# elif REFLECTION_TYPE == REFL_MIRRORMAP
    vec3 reflect_color = GLSL_TEXTURE_CUBE(u_mirrormap, eye_reflected).xyz;
# endif

    srgb_to_lin(reflect_color.rgb);
    base_color = mix(base_color, reflect_color, reflect_factor * r);
}


// REFERENCES:
//  environment lighting approximation without preprocessing
//      http://graphics.cs.williams.edu/papers/EnvMipReport2013/
vec3 apply_mirror_bsdf(vec3 base_color, vec3 s_color, vec3 eye_dir, vec3 normal,
                       float metalness, float s_r, mat3 view_tsr)
{
# if REFLECTION_TYPE == REFL_CUBE && USE_BSDF_SKY_DIM
    float cos_theta = max(dot(normal, eye_dir), _0_0);
    float ks = metalness + (max(_1_0 - s_r, metalness) - metalness) * pow(_1_0 - cos_theta, 5.0);
    vec3 eye_reflected = reflect(-eye_dir, normal);
    float gexp = 2.0/(s_r*s_r) - 2.0;
#  if GLSL1
    float sky_tex_dim = u_bsdf_cube_sky_dim;
#  else
    float sky_tex_dim = float(textureSize(u_cube_reflection, 0).x);
#  endif

    float mip_level = log2(sky_tex_dim * sqrt(3.0)) - _0_5 * log2(gexp + _1_0);

    vec3 reflect_color = GLSL_TEXTURE_CUBE_LOD(u_cube_reflection, eye_reflected, mip_level).xyz;
    srgb_to_lin(reflect_color);
    reflect_color *= s_color;

    vec3 reflect_color_d = GLSL_TEXTURE_CUBE_LOD(u_cube_reflection, normal, 100.0).xyz;
    srgb_to_lin(reflect_color_d);
    reflect_color_d *= base_color;

    // energy conservation is broken
    // but it looks closer to Blender
    return reflect_color_d + ks * reflect_color;
# elif REFLECTION_TYPE == REFL_PLANE && REFLECTION_PASS == REFL_PASS_NONE
    vec3 norm_proj_refl = u_refl_plane.xyz * dot(normal, u_refl_plane.xyz);
    vec3 normal_offset = normal - norm_proj_refl;
    vec2 normal_offset_view = tsr9_transform_dir(view_tsr, normal_offset).xy;

    vec2 refl_coord = v_tex_pos_clip.xy/ v_tex_pos_clip.z;
    refl_coord += normal_offset_view * REFL_BUMP;
    vec3 reflect_color = GLSL_TEXTURE(u_plane_reflection, refl_coord).rgb;
    srgb_to_lin(reflect_color);
    reflect_color *= s_color;

    return mix(base_color, reflect_color, metalness);
# else
    vec3 reflect_color = s_color;

    return mix(base_color, reflect_color, metalness);
# endif
}

#endif

#endif
