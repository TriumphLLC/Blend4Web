#import u_reflectmap u_reflect_factor u_mirrormap u_mirror_factor
#import v_tex_pos_clip
#import srgb_to_lin

#export apply_mirror

#if REFLECTIVE || TEXTURE_MIRROR

#define BUMP 0.1

float fresnel_mirror(in vec3 eye_dir, in vec3 eye_reflected, in float N, in float r0)
{
    vec3 reflected_halfway = normalize(eye_reflected + eye_dir);
    float one_minus_cos_theta = 1.0 - dot(eye_dir, reflected_halfway);
    float r = r0 + (1.0 - r0) * pow(one_minus_cos_theta, N);

    return r;
}

void apply_mirror(inout vec3 base_color, in vec3 eye_dir, in vec3 normal, 
    in float N, in float r0, in vec2 n)
{
    vec3 eye_reflected = reflect(-eye_dir, normal);

    float r = fresnel_mirror(eye_dir, eye_reflected, N, r0);

# if REFLECTIVE
    vec2 refl_coord = v_tex_pos_clip.xy/ v_tex_pos_clip.z;
    refl_coord += n * BUMP;
    vec3 reflect_color = texture2D(u_reflectmap, refl_coord).rgb;

    srgb_to_lin(reflect_color.rgb);

    base_color = mix(base_color, reflect_color, u_reflect_factor * r);
# elif TEXTURE_MIRROR
    vec3 mirror_color = textureCube(u_mirrormap, eye_reflected).xyz;
    srgb_to_lin(mirror_color.rgb);

    base_color = mix(base_color, mirror_color, u_mirror_factor * r);
# endif
}

#endif
