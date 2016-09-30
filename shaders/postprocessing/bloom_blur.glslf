#version GLSL_VERSION

#include <precision_statement.glslf>
#include <std.glsl>

uniform vec2 u_texel_size;
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

    vec2 offset = vec2(0.0, 0.0);
    vec2 delta = u_texel_size;
    vec4 def_color = GLSL_TEXTURE(u_color, v_texcoord);

    GLSL_OUT_FRAG_COLOR = def_color * 0.0875447373698;
    offset += delta;
    GLSL_OUT_FRAG_COLOR += GLSL_TEXTURE(u_color, v_texcoord+offset) * 0.0858112354248; 
    GLSL_OUT_FRAG_COLOR += GLSL_TEXTURE(u_color, v_texcoord-offset) * 0.0858112354248; 
    offset += delta;
    GLSL_OUT_FRAG_COLOR += GLSL_TEXTURE(u_color, v_texcoord+offset) * 0.0808139781061; 
    GLSL_OUT_FRAG_COLOR += GLSL_TEXTURE(u_color, v_texcoord-offset) * 0.0808139781061; 
    offset += delta;
    GLSL_OUT_FRAG_COLOR += GLSL_TEXTURE(u_color, v_texcoord+offset) * 0.0731235112908; 
    GLSL_OUT_FRAG_COLOR += GLSL_TEXTURE(u_color, v_texcoord-offset) * 0.0731235112908;
    offset += delta;
    GLSL_OUT_FRAG_COLOR += GLSL_TEXTURE(u_color, v_texcoord+offset) * 0.0635705267419;
    GLSL_OUT_FRAG_COLOR += GLSL_TEXTURE(u_color, v_texcoord-offset) * 0.0635705267419;
    offset += delta;
    GLSL_OUT_FRAG_COLOR += GLSL_TEXTURE(u_color, v_texcoord+offset) * 0.0530985673112; 
    GLSL_OUT_FRAG_COLOR += GLSL_TEXTURE(u_color, v_texcoord-offset) * 0.0530985673112; 
    offset += delta;
    GLSL_OUT_FRAG_COLOR += GLSL_TEXTURE(u_color, v_texcoord+offset) * 0.0426125984122;
    GLSL_OUT_FRAG_COLOR += GLSL_TEXTURE(u_color, v_texcoord-offset) * 0.0426125984122;
    offset += delta;
    GLSL_OUT_FRAG_COLOR += GLSL_TEXTURE(u_color, v_texcoord+offset) * 0.0328565115809; 
    GLSL_OUT_FRAG_COLOR += GLSL_TEXTURE(u_color, v_texcoord-offset) * 0.0328565115809; 
    offset += delta;
    GLSL_OUT_FRAG_COLOR += GLSL_TEXTURE(u_color, v_texcoord+offset) * 0.0243407024472;
    GLSL_OUT_FRAG_COLOR += GLSL_TEXTURE(u_color, v_texcoord-offset) * 0.0243407024472;
    GLSL_OUT_FRAG_COLOR = max(0.7 * def_color, GLSL_OUT_FRAG_COLOR);

}

