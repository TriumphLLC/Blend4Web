#version GLSL_VERSION

#include <precision_statement.glslf>
#include <std.glsl>

uniform sampler2D u_main;
uniform sampler2D u_luminance;
uniform sampler2D u_average_lum;
uniform float u_bloom_edge_lum;

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec2 v_texcoord;
GLSL_IN float v_bloom_factor;
//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {
    float average_lum = GLSL_TEXTURE(u_average_lum, vec2(0.5)).r;
    float lum = GLSL_TEXTURE(u_luminance, v_texcoord).r;
    vec4 color = GLSL_TEXTURE(u_main, v_texcoord);

    float rel_lum = lum / average_lum;
    float edge_lum = u_bloom_edge_lum;

    GLSL_OUT_FRAG_COLOR = color * max(rel_lum - edge_lum, 0.0) * v_bloom_factor;

    // NOTE: possible tone mapping
    //float mapped_lum = 0.3;
    //float D = rel_lum * (1.0 + rel_lum / (mapped_lum * mapped_lum)) / (1.0 + rel_lum);
    //GLSL_OUT_FRAG_COLOR = vec4(D / lum);
}
