#var WATER_LEVEL 0.0
#define INV_PI 0.318309886

#include <precision_statement.glslf>
#include <color_util.glslf>

#if WO_SKYTEX || PROCEDURAL_SKYDOME
uniform samplerCube u_sky;
#endif

#if !PROCEDURAL_SKYDOME && WO_SKYTEX

#include <std_enums.glsl>
#include <blending.glslf>

uniform vec4 u_sky_tex_fac; // blendfac, horizonfac, zenupfac, zendownfac
uniform vec3 u_sky_tex_color;
uniform float u_sky_tex_dvar;

vec3 col_blending(vec3 col1, vec3 col2, float factor, float facg)
{
    float fact = factor * facg;
#if BLENDTYPE == MIX
    return col_blend(col2, col1, fact);
#elif BLENDTYPE == ADD
    return col_add(col1, col2, fact);
#elif BLENDTYPE == SUBTRACT
    return col_sub(col1, col2, fact);
#elif BLENDTYPE == MULTIPLY
    return col_mul(col1, col2, fact);
#elif BLENDTYPE == SCREEN
    return col_screen(col1, col2, fact);
#elif BLENDTYPE == OVERLAY
    return col_overlay(col1, col2, fact);
#elif BLENDTYPE == DIFFERENCE
    return col_diff(col1, col2, fact);
#elif BLENDTYPE == DIVIDE
    return col_div(col1, col2, fact);
#elif BLENDTYPE == DARKEN
    return col_dark(col1, col2, fact);
#elif BLENDTYPE == LIGHTEN
    return col_light(col1, col2, fact);
#elif BLENDTYPE == HUE
    return col_hue(col2, col1, fact);
#elif BLENDTYPE == SATURATION
    return col_sat(col2, col1, fact);
#elif BLENDTYPE == VALUE
    return col_val(col2, col1, fact);
#elif BLENDTYPE == COLOR
    return col_color(col2, col1, fact);
#elif BLENDTYPE == SOFT_LIGHT
    return col_soft_light(col2, col1, fact);
#elif BLENDTYPE == LINEAR_LIGHT
    return col_lin_light(col2, col1, fact);
#endif
    return vec3(1.0, 0.0, 1.0);
}

float val_blending(float val1, float val2, float factor, float facg)
{
    vec3 col1 = vec3(val1), col2 = vec3(val2);
    float fact = factor * facg;
#if BLENDTYPE == MIX
    return col_blend(col2, col1, fact).x;
#elif BLENDTYPE == ADD
    return col_add(col1, col2, fact).x;
#elif BLENDTYPE == SUBTRACT
    return col_sub(col1, col2, fact).x;
#elif BLENDTYPE == MULTIPLY
    return val_mul(val1, val2, fact, facg);
#elif BLENDTYPE == SCREEN
    return val_screen(val1, val2, fact, facg);
#elif BLENDTYPE == OVERLAY
    return val_overlay(val1, val2, fact, facg);
#elif BLENDTYPE == DIFFERENCE
    return col_diff(col1, col2, fact).x;
#elif BLENDTYPE == DIVIDE
    return col_div(col1, col2, fact).x;
#elif BLENDTYPE == DARKEN
    return col_dark(col1, col2, fact).x;
#elif BLENDTYPE == LIGHTEN
    return col_light(col1, col2, fact).x;
#elif BLENDTYPE == SOFT_LIGHT
    return col_soft_light(col2, col1, fact).x;
#elif BLENDTYPE == LINEAR_LIGHT
    return col_lin_light(col2, col1, fact).x;
#endif
    return 0.0;
}
#endif

#if !PROCEDURAL_SKYDOME
uniform vec3 u_horizon_color;
uniform vec3 u_zenith_color;
#endif

#if WATER_EFFECTS && !DISABLE_FOG && !REFLECTION_PASS
uniform vec3 u_camera_eye_frag;
uniform vec3 u_sun_intensity;
uniform float u_environment_energy;
uniform vec4 u_underwater_fog_color_density;
#endif

varying vec3 v_ray;

#if !PROCEDURAL_SKYDOME && (WO_SKYTEX || WO_SKYBLEND)
varying vec2 v_texcoord;
#endif

void main(void) {
    vec3 sky_color;
    vec3 ray = normalize(v_ray);

#if PROCEDURAL_SKYDOME
    sky_color = textureCube(u_sky, ray).rgb;
#elif !(WO_SKYTEX || WO_SKYBLEND)
    // 1. solid color
    sky_color = u_horizon_color;
    lin_to_srgb(sky_color);
#else
    // 2. blend color
    vec3 view;
# if WO_SKYPAPER
    view = vec3(v_texcoord, 0.0);
# else
    view = vec3(v_ray.xy, 0.0);
# endif

    // shadeSkyView
    // skip skyflag
    float blend = 0.0;
# if WO_SKYBLEND
#  if WO_SKYPAPER
#   if WO_SKYREAL
    blend = abs(v_texcoord.y);
#   else
    blend = (v_texcoord.y + 1.0) * 0.5;
#   endif
#  else
    float alpha = acos(ray.y);
#   if WO_SKYREAL
    blend = abs(alpha * INV_PI - 0.5) * 2.0;
#   else
    blend = 1.0 - alpha * INV_PI;
#   endif
#  endif
# endif

    vec3 hor = u_horizon_color;
    vec3 zen = u_zenith_color;

# if WO_SKYTEX
    // skip magic with view matrix

    float tin = 1.0; // texture.tin does matter later
    // tin can cause problems - see blender code
    vec4 tcol = textureCube(u_sky, ray);
    srgb_to_lin(tcol.rgb);
    tin = tcol.a;

#  if MTEX_RGBTOINT   // MTEX_RGBTOINT means RGB flag too
    tin = luma(tcol);
#  endif
#  if MTEX_NEGATIVE
#   if !MTEX_RGBTOINT
    tcol = vec4(vec3(1.0)-tcol.rgb, tcol.a);
#   else
    tin = 1.0 - tin;
#   endif
#  endif
// MTEX_STENCIL - does matter if only more than one texture mixes

#  if WOMAP_HORIZ || WOMAP_ZENUP || WOMAP_ZENDOWN
#   if MTEX_RGBTOINT
    tcol = vec4(u_sky_tex_color, 1.0);
#   else
    tin = tcol.a;
#   endif
// skip inverse gamma correction

#   if WOMAP_HORIZ
    hor = col_blending(tcol.rgb, hor, tin, u_sky_tex_fac[1]);
#   endif

#   if WOMAP_ZENUP || WOMAP_ZENDOWN
    float zenfac = 0.0;
#    if WO_SKYREAL
    if (dot(view, vec3(0.0, 1.0, 0.0)) >= 0.0) { // instead of skyflag
#     if WOMAP_ZENUP
        zenfac = u_sky_tex_fac[2];
#     else
        ;
#     endif
    }
#     if WOMAP_ZENDOWN
    else
        zenfac = u_sky_tex_fac[3];
#     endif
#    else // WO_SKYREAL
#     if WOMAP_ZENUP
    zenfac = u_sky_tex_fac[2];
#     elif WOMAP_ZENDOWN
    zenfac = u_sky_tex_fac[3];
#     endif
#    endif

    if (zenfac != 0.0)
        zen = col_blending(tcol.rgb, zen, tin, zenfac);
#   endif
#  endif // WOMAP_HORIZ || WOMAP_ZENUP || WOMAP_ZENDOWN

#  if WOMAP_BLEND
#   if !MTEX_RGBTOINT
    tin = dot(tcol.rgb, vec3(0.2126, 0.7152, 0.0722));
#   endif
    blend = val_blending(u_sky_tex_dvar, blend, tin, u_sky_tex_fac[0]);
#  endif

#  if WO_SKYBLEND
    sky_color = mix(hor, zen, blend);
#  else
    sky_color = hor;
#  endif
    lin_to_srgb(sky_color);
# else
    lin_to_srgb(hor);
    lin_to_srgb(zen);
#  if WO_SKYBLEND
    sky_color = mix(hor, zen, blend);
#  else
    sky_color = hor;
#  endif
# endif
#endif // PROCEDURAL_SKYDOME

#if WATER_EFFECTS && !DISABLE_FOG && !REFLECTION_PASS
    srgb_to_lin(sky_color);

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
    lin_to_srgb(sky_color);
#endif

   gl_FragColor = vec4(sky_color, 1.0);
}
