#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var PRECISION highp

#var DEPTH_RGBA 0
#var WATER_EFFECTS 0
#var STEPS_PER_PASS 10.0

/*============================================================================*/

precision PRECISION sampler2D;

#include <precision_statement.glslf>
#include <std.glsl>
#include <depth_fetch.glslf>
#include <procedural.glslf>
#include <pack.glslf>

uniform float u_time;
uniform float u_radial_blur_step;

uniform sampler2D u_input;

#if DEPTH_RGBA
uniform vec2 u_camera_range;
#endif

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
#if DEPTH_RGBA && WATER_EFFECTS
GLSL_IN float v_underwater;
GLSL_IN vec2 v_texture_offset;
#endif

GLSL_IN vec2 v_texcoord;
GLSL_IN vec4 v_sun_pos_clip;
//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {

    // delta from current pixel to sun position
    vec2 delta = (v_sun_pos_clip.xy - v_texcoord);
    float dist = length(delta);

    // Step vector (uv space)
    vec2 stepv = u_radial_blur_step * delta/dist;
    // Number of iterations between pixel and sun
    float iters = dist/u_radial_blur_step;

    //Correction for near the sun positions
    stepv *= min(iters, STEPS_PER_PASS) / STEPS_PER_PASS;
    iters = max(iters, STEPS_PER_PASS);
    
    vec2 uv = v_texcoord;

    // NOTE: Mac doesn't support iterations with float variables
    float intens = 0.0;
    const int steps_per_pass = int(STEPS_PER_PASS);
    int iters_int = int(iters + 0.5);
    for (int i = 0; i < steps_per_pass; i += 1) {
        
        if (i <= iters_int) {
            //On the first iteration Depth map is being unpacked and blurred.
            //On further iterations only performs blur of the given texture.
#if DEPTH_RGBA
            float depth = depth_fetch(u_input, uv, u_camera_range);
            intens += max((1.0 - pow(dist, 0.3)) * step(0.9, depth), 0.0); //brighter at center
#else
            vec4 input_col = GLSL_TEXTURE(u_input, uv);
            intens += unpack_float(input_col);
#endif
        }
        uv += stepv;
    }

#if DEPTH_RGBA && WATER_EFFECTS
    vec2 texcoord = v_texcoord + v_texture_offset;
    float noise =
        cellular2x2(
            vec2(2.5 * (texcoord.x),
                 2.5 * (texcoord.y) + 1.0 * u_time)
        ).x

        + 0.75 * cellular2x2(
            vec2(5.0 * (texcoord.x) - 0.66 * u_time,
                 5.0 * (texcoord.y) + 0.66 * u_time)
        ).x

        + 0.5 * snoise(
            vec2(7.5 * (texcoord.x) + 0.33 * u_time,
                 7.5 * (texcoord.y) - 0.33 * u_time)
        );

    noise *= clamp(1.2 - sqrt(0.2 * dist), 0.0, 1.0) * v_underwater;
    intens = max(noise, intens);
#endif

    GLSL_OUT_FRAG_COLOR = pack(intens / STEPS_PER_PASS);
}
