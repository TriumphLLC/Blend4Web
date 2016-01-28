#import u_plane_reflection u_mirrormap u_mirror_factor
#import v_tex_pos_clip u_refl_plane
#import u_fresnel_params
#import u_cube_reflection srgb_to_lin

#export apply_mirror

#if REFLECTION_TYPE == REFL_PLANE || REFLECTION_TYPE == REFL_CUBE || REFLECTION_TYPE == REFL_MIRRORMAP

#define REFL_BUMP 0.1

float fresnel_mirror(in vec3 eye_dir, vec3 eye_reflected, float N, float r0)
{
    vec3 reflected_halfway = normalize(eye_reflected + eye_dir);
    float one_minus_cos_theta = 1.0 - dot(eye_dir, reflected_halfway);
    float r = r0 + (1.0 - r0) * pow(one_minus_cos_theta, N);

    return r;
}

void apply_mirror(inout vec3 base_color, vec3 eye_dir, vec3 normal,
                  float reflect_factor, mat4 view_matrix)
{
    vec3 eye_reflected = reflect(-eye_dir, normal);

    float N  = u_fresnel_params[2];
    float r0 = u_fresnel_params[3];

    float r = 1.0;
    // NOTE: fix for devices with low precision
    if (N != 0.0)
        r = fresnel_mirror(eye_dir, eye_reflected, N, r0);

# if REFLECTION_TYPE == REFL_CUBE
    vec3 reflect_color = textureCube(u_cube_reflection, eye_reflected).xyz;
# elif REFLECTION_TYPE == REFL_PLANE
#  if !REFLECTION_PASS
    vec3 norm_proj_refl = u_refl_plane.xyz * dot(normal, u_refl_plane.xyz);
    vec3 normal_offset = normal - norm_proj_refl;
    vec2 normal_offset_view = (view_matrix * vec4(normal_offset, 0.0)).xy;

    vec2 refl_coord = v_tex_pos_clip.xy/ v_tex_pos_clip.z;
    refl_coord += normal_offset_view * REFL_BUMP;
    vec3 reflect_color = texture2D(u_plane_reflection, refl_coord).rgb;
#  else //!REFLECTION_PASS
    vec3 reflect_color = vec3(1.0);
    reflect_factor = 0.0;
#  endif //!REFLECTION_PASS
# elif REFLECTION_TYPE == REFL_MIRRORMAP
    vec3 reflect_color = textureCube(u_mirrormap, eye_reflected).xyz;
    reflect_factor = u_mirror_factor;
# endif

    srgb_to_lin(reflect_color.rgb);
    base_color = mix(base_color, reflect_color, reflect_factor * r);
}

#endif
