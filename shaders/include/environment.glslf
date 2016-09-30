#ifndef ENVIRONMENT_GLSLF
#define ENVIRONMENT_GLSLF

// #import u_horizon_color;
// #import u_zenith_color;
// #import u_sky_texture;

/*==============================================================================
                                    VARS
==============================================================================*/
#var USE_ENVIRONMENT_LIGHT 0
#var SKY_COLOR 0
#var SKY_TEXTURE 0

/*============================================================================*/

vec3 get_environment_color(vec3 normal) {
#if USE_ENVIRONMENT_LIGHT
# if SKY_TEXTURE
    return GLSL_TEXTURE_CUBE(u_sky_texture, normal).rgb;
# elif SKY_COLOR
    float sky_factor = 0.5 * normal.z + 0.5; // dot of vertical vector and normal
    return mix(u_horizon_color, u_zenith_color, sky_factor);
# else
    return vec3(1.0);
# endif
#else
    return vec3(0.0);
#endif
}

#endif
