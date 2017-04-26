#version GLSL_VERSION

#include <precision_statement.glslf>
#include <std.glsl>
uniform sampler2D u_input;
uniform float u_mipmap_1x1;

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/

//------------------------------------------------------------------------------

GLSL_IN vec2 v_texcoord;
GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {

    float average_lum = max(GLSL_TEXTURE(u_input, v_texcoord, u_mipmap_1x1).r, 0.01);
    GLSL_OUT_FRAG_COLOR = vec4(vec3(average_lum), 1.0);
}
