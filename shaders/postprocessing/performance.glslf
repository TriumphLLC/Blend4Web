#version GLSL_VERSION

#include <precision_statement.glslf>
#include <std.glsl>

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

    for (int i = 0; i < 10; i++) {
        vec2 uv_rand = vec2(fract(v_texcoord * vec2(i) * vec2(1.431, 3.921)));
        color += 0.01 * GLSL_TEXTURE(u_color, uv_rand);
    }

    GLSL_OUT_FRAG_COLOR = color;
}

