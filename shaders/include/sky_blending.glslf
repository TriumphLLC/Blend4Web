#ifndef SKY_BLENDING_GLSLF
#define SKY_BLENDING_GLSLF

#include <std.glsl>
#include <blending.glslf>

/*==============================================================================
                                    VARS
==============================================================================*/
#var WO_SKYREAL 0
#var WO_SKYBLEND 0

#var BLENDTYPE MIX
#var MTEX_RGBTOINT 0
#var WOMAP_HORIZ 0
#var WOMAP_ZENUP 0
#var WOMAP_ZENDOWN 0
#var WOMAP_BLEND 0
#var MTEX_NEGATIVE 0

/*============================================================================*/

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

vec3 blend_sky_color(vec3 hor, vec3 zen, vec4 tcol, float blend, vec3 view)
{
    float tin = 1.0; // texture.tin does matter later
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
    if (dot(view, vec3(0.0, 0.0, 1.0)) >= 0.0) { // instead of skyflag
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
    vec3 sky_color = mix(hor, zen, blend);
#  else
    vec3 sky_color = hor;
#  endif
    return sky_color;
}

#endif