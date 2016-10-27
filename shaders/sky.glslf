#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var WO_SKYTEX 0
#var WO_SKYREAL 0
#var WO_SKYBLEND 0

#var PROCEDURAL_SKYDOME 0
#var WATER_EFFECTS 0
#var DISABLE_FOG 0
#var WO_SKYPAPER 0

#var REFLECTION_PASS REFL_PASS_NONE
#var WATER_LEVEL 0.0


/*============================================================================*/

#include <precision_statement.glslf>
#include <std.glsl>
#include <color_util.glslf>

uniform samplerCube u_sky;

#if WATER_EFFECTS && !DISABLE_FOG && REFLECTION_PASS == REFL_PASS_NONE
uniform vec3 u_camera_eye_frag;
uniform vec4 u_underwater_fog_color_density;
#endif

#if WO_SKYBLEND && WO_SKYPAPER
uniform vec4 u_sky_tex_fac; // blendfac, horizonfac, zenupfac, zendownfac
uniform vec3 u_sky_tex_color;
uniform float u_sky_tex_dvar;
uniform vec3 u_horizon_color;
uniform vec3 u_zenith_color;
#endif

#if WO_SKYBLEND && WO_SKYPAPER && WO_SKYTEX
#include <sky_blending.glslf>
#endif

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec3 v_ray;
#if !PROCEDURAL_SKYDOME && (WO_SKYTEX || WO_SKYBLEND)
GLSL_IN vec2 v_texcoord;
#endif

//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {
    vec3 sky_color;
    vec3 ray = normalize(v_ray);

#if WO_SKYBLEND && WO_SKYPAPER
    float blend = 0.0;
# if WO_SKYREAL
    blend = abs(v_texcoord.y);
# else
    blend = (v_texcoord.y + 1.0) * 0.5;
# endif
    vec3 hor = u_horizon_color;
    vec3 zen = u_zenith_color;
# if WO_SKYTEX
    vec3 view = vec3(v_texcoord, 0.0);
    vec4 tcol = GLSL_TEXTURE_CUBE(u_sky, ray);
    srgb_to_lin(tcol.rgb);
    sky_color = blend_sky_color(hor, zen, tcol, blend, view);
# else // WO_SKYTEX
    sky_color = mix(hor, zen, blend);
# endif
#else
    sky_color = GLSL_TEXTURE_CUBE(u_sky, ray).rgb;
    srgb_to_lin(sky_color);
#endif


#if WATER_EFFECTS && !DISABLE_FOG && REFLECTION_PASS == REFL_PASS_NONE
    // apply underwater fog to the skyplane
    float cam_depth = WATER_LEVEL - u_camera_eye_frag.z;

    // color of underwater depth
    vec3 depth_col = vec3(0.0);

    vec3 fog_color = mix(u_underwater_fog_color_density.rgb, depth_col, min(-ray.z, 1.0));
    fog_color *= min(1.0 - min(0.03 * cam_depth, 0.8), 1.0);

    // fog blending factor
    float factor = clamp(sign(0.01 * cam_depth - ray.z), 0.0, 1.0);

    sky_color = mix(sky_color, fog_color, factor);
#endif

    lin_to_srgb(sky_color);
    GLSL_OUT_FRAG_COLOR = vec4(sky_color, 1.0);
}
