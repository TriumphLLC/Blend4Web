#version GLSL_VERSION

#include <precision_statement.glslf>
#include <std.glsl>
#include <color_util.glslf>

uniform sampler2D u_sampler;

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
    vec4 color = GLSL_TEXTURE(u_sampler, v_texcoord);
    lin_to_srgb(color.rgb);
    premultiply_alpha(color.rgb, color.a);
    GLSL_OUT_FRAG_COLOR = color;
}
