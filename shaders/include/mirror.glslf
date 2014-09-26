#import u_reflectmap u_mirrormap u_mirror_factor u_view_matrix_frag u_refl_plane
#import v_tex_pos_clip
#import srgb_to_lin

#export apply_mirror

#if REFLECTIVE || TEXTURE_MIRROR

#define REFL_BUMP 0.1

float fresnel_mirror(in vec3 eye_dir, in vec3 eye_reflected, in float N, in float r0)
{
    vec3 reflected_halfway = normalize(eye_reflected + eye_dir);
    float one_minus_cos_theta = 1.0 - dot(eye_dir, reflected_halfway);
    float r = r0 + (1.0 - r0) * pow(one_minus_cos_theta, N);

    return r;
}

void apply_mirror(inout vec3 base_color, in vec3 eye_dir, in vec3 normal,
    in float N, in float r0, in float reflect_factor)
{
    vec3 eye_reflected = reflect(-eye_dir, normal);

    float r = 1.0;
    // NOTE: fix for devices with low precision
    if (N != 0.0)
        r = fresnel_mirror(eye_dir, eye_reflected, N, r0);

# if REFLECTIVE
    vec3 norm_proj_refl = u_refl_plane.xyz * dot(normal, u_refl_plane.xyz);
    vec3 normal_offset = normal - norm_proj_refl;
    vec2 normal_offset_view = (u_view_matrix_frag * vec4(normal_offset, 0.0)).xy;

    vec2 refl_coord = v_tex_pos_clip.xy/ v_tex_pos_clip.z;
    refl_coord += normal_offset_view * REFL_BUMP;
    vec3 reflect_color = texture2D(u_reflectmap, refl_coord).rgb;

    srgb_to_lin(reflect_color.rgb);

    base_color = mix(base_color, reflect_color, reflect_factor * r);
# elif TEXTURE_MIRROR
    vec3 mirror_color = textureCube(u_mirrormap, eye_reflected).xyz;
    srgb_to_lin(mirror_color.rgb);

    base_color = mix(base_color, mirror_color, u_mirror_factor * r);
# endif
}

#endif
