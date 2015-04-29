#var WATER_LEVEL 0.0
#define INV_PI 0.318309886

#include <precision_statement.glslf>
#include <gamma.glslf>

#if USE_SKY_TEXTURE
uniform samplerCube u_sky;
#elif USE_SKY_BLEND
uniform vec3 u_zenith_color;
#endif

uniform vec3 u_horizon_color;

#if WATER_EFFECTS && !DISABLE_FOG
    uniform vec3 u_camera_eye_frag;
    uniform vec3 u_sun_intensity;
    uniform float u_environment_energy;
    uniform vec4 u_underwater_fog_color_density;
#endif

varying vec3 v_ray;

#if USE_SKY_BLEND && USE_SKY_PAPER
varying vec2 v_texcoord;
#endif


void main(void) {
    vec3 sky_color;

#if WATER_EFFECTS && !DISABLE_FOG && !REFLECTION_PASS || !USE_SKY_PAPER && USE_SKY_BLEND
    vec3 ray = normalize(v_ray);
#endif

#if USE_SKY_TEXTURE
    sky_color = textureCube(u_sky, v_ray).rgb;
#elif USE_SKY_BLEND
    float col_fac;
# if USE_SKY_PAPER
#  if USE_SKY_REAL
    col_fac = abs(v_texcoord.y);
#  else
    col_fac = (v_texcoord.y + 1.0) * 0.5;
#  endif
# else
    float alpha = acos(ray.y);
#  if USE_SKY_REAL
    col_fac = abs(alpha * INV_PI - 0.5) * 2.0;
#  else
    col_fac = 1.0 - alpha * INV_PI;
#  endif
# endif  // USE_SKY_PAPER
    vec3 hor = u_horizon_color;
    vec3 zen = u_zenith_color;
    lin_to_srgb(hor);
    lin_to_srgb(zen);
    sky_color = mix(hor, zen, col_fac);
#else
    sky_color = u_horizon_color;
    lin_to_srgb(sky_color);
#endif  // USE_SKY_TEXTURE

#if WATER_EFFECTS && !DISABLE_FOG && !REFLECTION_PASS
    srgb_to_lin(sky_color.rgb);

    // apply underwater fog to the skyplane
    float cam_depth = u_camera_eye_frag.y - WATER_LEVEL;
    cam_depth = min(-cam_depth * 0.03, 0.8);
    float sun_color_intens = clamp(length(u_sun_intensity) + u_environment_energy, 0.0, 1.0);

    // color of underwater depth
    vec3 depth_col = vec3(0.0);

    vec4 fog_color = u_underwater_fog_color_density;
    fog_color.rgb = mix(fog_color.rgb, depth_col, min(-ray.y + cam_depth, 1.0))
                        * sun_color_intens;

    // fog blending factor
    float factor = clamp(sign(ray.y - 0.05 * cam_depth), 0.0, 1.0);

    sky_color = mix(fog_color.rgb, sky_color, factor);

    lin_to_srgb(sky_color.rgb);
#endif

    gl_FragColor = vec4(sky_color, 1.0);
}
