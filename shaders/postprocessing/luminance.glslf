#version GLSL_VERSION

#include <precision_statement.glslf>
#include <std.glsl>
uniform sampler2D u_input;

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
    vec4 inp_color = GLSL_TEXTURE(u_input, v_texcoord);
    float luminance = dot(inp_color.rgb, vec3(0.2126, 0.7152, 0.0722));
    GLSL_OUT_FRAG_COLOR = vec4(vec3(luminance), 1.0);
}
