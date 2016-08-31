#version GLSL_VERSION

#include <precision_statement.glslf>

uniform sampler2D u_color;

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

    vec4 color = vec4(0.0);

    for (int i = 0; i < 100; i++)
        color += 0.001 * GLSL_TEXTURE(u_color, v_texcoord + vec2(0.001 * vec2(i)));

    GLSL_OUT_FRAG_COLOR = color;
}

