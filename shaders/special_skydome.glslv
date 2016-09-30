#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var PROCEDURAL_SKYDOME 0
#var WO_SKYTEX 0
#var WO_SKYBLEND 0

/*============================================================================*/

#include <std.glsl>

uniform mat4 u_sky_vp_inverse;

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec3 a_position;
//------------------------------------------------------------------------------

GLSL_OUT vec3 v_ray;

#if !PROCEDURAL_SKYDOME && (WO_SKYTEX || WO_SKYBLEND)
GLSL_OUT vec2 v_texcoord;
#endif

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {

    // z = 0.999999; compare with lens_flares and stars
    vec4 position = vec4(a_position.xy, 0.9999999, 1.0);
    vec4 ray = u_sky_vp_inverse * position;

    v_ray = ray.xyz;

#if !PROCEDURAL_SKYDOME && (WO_SKYTEX || WO_SKYBLEND)
    v_texcoord = a_position.xy;
#endif

    gl_Position = position;
}
