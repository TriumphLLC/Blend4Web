#version GLSL_VERSION

#var WO_SKYTEX 0
#var WO_SKYREAL 0
#var WO_SKYBLEND 0

#var WO_SKYPAPER 0

#include <precision_statement.glslf>
#include <std.glsl>
#include <color_util.glslf>

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

GLSL_IN vec3 v_ray;
GLSL_IN vec2 v_texcoord;

#if WO_SKYTEX
uniform samplerCube u_sky_texture;
#endif

uniform vec4 u_sky_tex_fac; // blendfac, horizonfac, zenupfac, zendownfac
uniform vec3 u_sky_tex_color;
uniform float u_sky_tex_dvar;

uniform vec3 u_horizon_color;
uniform vec3 u_zenith_color;

#if WO_SKYTEX
#include <sky_blending.glslf>
#endif

void main(void) {
    vec3 ray = normalize(v_ray);
    vec3 sky_color;
    // shadeSkyView
    // skip skyflag
    float blend = 0.0;

#if WO_SKYPAPER
# if WO_SKYTEX
    sky_color = GLSL_TEXTURE_CUBE(u_sky_texture, ray).xyz;
    srgb_to_lin(sky_color);
# else
    sky_color = vec3(1.0);
# endif
#else

# if WO_SKYBLEND
    float alpha = acos(ray.z);
#  if WO_SKYREAL
    blend = abs(alpha * INV_PI - 0.5) * 2.0;
#  else
    blend = 1.0 - alpha * INV_PI;
#  endif
# endif

    vec3 hor = u_horizon_color;
    vec3 zen = u_zenith_color;

# if WO_SKYTEX
    vec4 tcol = GLSL_TEXTURE_CUBE(u_sky_texture, ray);
    srgb_to_lin(tcol.rgb);
    vec3 view = vec3(v_ray.xy, 0.0);
    sky_color = blend_sky_color(hor, zen, tcol, blend, view);
# else // WO_SKYTEX
#  if WO_SKYBLEND
    sky_color = mix(hor, zen, blend);
#  else
    sky_color = hor;
#  endif
# endif
#endif

    lin_to_srgb(sky_color);
    GLSL_OUT_FRAG_COLOR = vec4(sky_color, 1.0);
}