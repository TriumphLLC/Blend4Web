#version GLSL_VERSION

#include <precision_statement.glslf>
#include <std.glsl>
#include <color_util.glslf>

uniform sampler2D u_color;

uniform float u_brightness; // -1..1
uniform float u_contrast; // -1..1

uniform float u_exposure; // 0..inf
uniform float u_saturation; // 0..inf

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec2 v_texcoord;
//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {

    vec4 tex_input = GLSL_TEXTURE(u_color, v_texcoord);

    vec3 color = tex_input.rgb;

    // brightness 
    if (u_brightness < 0.0) 
        color = color * (1.0 + u_brightness);
    else 
        color = color + ((1.0 - color) * u_brightness);

    // contrast
    color = (color - 0.5) * (tan((u_contrast + 1.0) * M_PI_4)) + 0.5;

    // exposure
    color *= u_exposure;

    // saturation
    float intensity = luma(vec4(color, 0.0));
    color = mix(vec3(intensity), color, u_saturation);

    //GLSL_OUT_FRAG_COLOR = vec4(sqrt(color), tex_input.a);
    //GLSL_OUT_FRAG_COLOR = vec4(pow(color, vec3(1.0/2.2)), tex_input.a);
    GLSL_OUT_FRAG_COLOR = vec4(color, tex_input.a);
}

