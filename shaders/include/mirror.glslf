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

    float N  = u_fresnel_params[0];
    float r0 = u_fresnel_params[1];

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
    // CHECK: if we have to use tsr9_transform_normal !!!
    vec2 normal_offset_view = tsr9_transform_normal(view_tsr, normal_offset).xy;

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

#elif REFLECTION_TYPE == REFL_PBR_STANDARD

vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness)
{
    float min_cos_theta = 1.0 - cosTheta;
    float min_cos_theta5 = min_cos_theta * min_cos_theta;
    min_cos_theta5 = min_cos_theta5 * min_cos_theta * min_cos_theta5;

    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * min_cos_theta5;
}

vec3 apply_mirror_bsdf(vec3 base_color, vec3 s_color, vec3 eye_dir, vec3 normal,
                       float metalness, float s_r, mat3 view_tsr)
{
    float cos_theta = max(dot(normalize(normal), eye_dir), _0_0);
    vec3 eye_reflected = reflect(-eye_dir, normal);
    float roughness = sqrt(s_r);

    vec3 F0 = vec3(0.04);
    F0      = mix(F0, s_color, metalness);

    vec3 F = fresnelSchlickRoughness(cos_theta, F0, roughness);

    vec3 kS = F;
    vec3 kD = vec3(_1_0) - kS;
    kD *= vec3(1.0 - metalness);

    vec3 irradiance = GLSL_TEXTURE_CUBE(u_cube_irradiance, normal).xyz;
    vec3 diffuse    = irradiance * base_color;

    const float MAX_REFLECTION_LOD = 5.0;
    vec3 prefilteredColor = GLSL_TEXTURE_CUBE_LOD(u_cube_r_convolution, eye_reflected, roughness * MAX_REFLECTION_LOD).rgb;
    vec2 envBRDF  = GLSL_TEXTURE(u_brdf, vec2(cos_theta, roughness)).rg;
    vec3 specular = prefilteredColor * (F * envBRDF.x + envBRDF.y);

    vec3 ambient = (kD * diffuse + specular);

    return ambient;
}

#elif REFLECTION_TYPE == REFL_PBR_SIMPLE

vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness)
{
    float min_cos_theta = 1.0 - cosTheta;
    float min_cos_theta5 = min_cos_theta * min_cos_theta;
    min_cos_theta5 = min_cos_theta5 * min_cos_theta * min_cos_theta5;

    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * min_cos_theta5;
}

// REFERENCES:
//  environment lighting approximation without preprocessing
//      http://graphics.cs.williams.edu/papers/EnvMipReport2013/
vec3 apply_mirror_bsdf(vec3 base_color, vec3 s_color, vec3 eye_dir, vec3 normal,
                       float metalness, float s_r, mat3 view_tsr)
{
# if USE_BSDF_SKY_DIM

    vec3 N = normalize(normal);

    float cos_theta = max(dot(N, eye_dir), _0_0);
    vec3 eye_reflected = reflect(-eye_dir, normal);
    // Blinn-Phong exponent
    float gexp = max(2.0/(s_r*s_r) - 2.0, _0_0);;

    vec3 F0 = vec3(0.04);
    F0      = mix(F0, s_color, metalness);

    vec3 F = fresnelSchlickRoughness(cos_theta, F0, sqrt(s_r));

    vec3 kS = F;
    vec3 kD = vec3(_1_0) - kS;
    kD *= 1.0 - metalness;

    vec3 diffuse = GLSL_TEXTURE_CUBE_LOD(u_sky_reflection, N, 100.0).xyz;
    srgb_to_lin(diffuse);
    diffuse *= base_color;

#  if GLSL1
    float sky_tex_dim = u_bsdf_cube_sky_dim;
#  else
    float sky_tex_dim = float(textureSize(u_sky_reflection, 0).x);
#  endif

    float mip_level = log2((sky_tex_dim * sqrt(3.0)) / sqrt(gexp + _1_0));

    vec3 specular = GLSL_TEXTURE_CUBE_LOD(u_sky_reflection, eye_reflected, mip_level).xyz;
    srgb_to_lin(specular);

    vec3 ambient = kD * diffuse + kS * specular;

    return ambient;
# else
    return base_color;
# endif
}
#endif

#endif
