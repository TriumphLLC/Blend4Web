#version GLSL_VERSION

#include <precision_statement.glslf>
#include <std.glsl>
uniform sampler2D u_main;
uniform sampler2D u_bloom;

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
    vec4 inp_color = GLSL_TEXTURE(u_main, v_texcoord);
    vec4 bloom_color = GLSL_TEXTURE(u_bloom, v_texcoord);

    GLSL_OUT_FRAG_COLOR = inp_color + bloom_color;
}
