#import u_horizon_color;
#import u_zenith_color;
#import u_sky_texture;

#export get_environment_color

vec3 get_environment_color(vec3 normal) {
#if USE_ENVIRONMENT_LIGHT
# if SKY_TEXTURE
    return textureCube(u_sky_texture, normal).rgb;
# elif SKY_COLOR
    float sky_factor = 0.5 * normal.y + 0.5; // dot of vertical vector and normal
    return mix(u_horizon_color, u_zenith_color, sky_factor);
# else
    return vec3(1.0);
# endif
#else
    return vec3(0.0);
#endif
}
