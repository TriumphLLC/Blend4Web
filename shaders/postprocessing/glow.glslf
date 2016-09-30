#version GLSL_VERSION

#include <precision_statement.glslf>
#include <std.glsl>

uniform sampler2D u_src_color;
uniform sampler2D u_glow_mask_small;
uniform sampler2D u_glow_mask_large;

uniform float u_glow_mask_small_coeff;
uniform float u_glow_mask_large_coeff;

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

    vec4 src_color = GLSL_TEXTURE(u_src_color, v_texcoord);
    vec4 mask_small = GLSL_TEXTURE(u_glow_mask_small, v_texcoord);
    vec4 mask_large = GLSL_TEXTURE(u_glow_mask_large, v_texcoord);

    GLSL_OUT_FRAG_COLOR = src_color;
   
    if (mask_large.a != 0.0) {
        // outside object inside mask_large

        float alpha_large_out = u_glow_mask_large_coeff * mask_large.a;
        alpha_large_out = clamp(alpha_large_out, 0.0, 1.0);
        GLSL_OUT_FRAG_COLOR.rgb = mix(GLSL_OUT_FRAG_COLOR.rgb, mask_large.rgb / mask_large.a, alpha_large_out);
        GLSL_OUT_FRAG_COLOR.a = mix(GLSL_OUT_FRAG_COLOR.a, 1.0, alpha_large_out);
    }
    if (mask_small.a != 0.0) {
        // outside object inside mask_small
    
        float alpha_small_out = u_glow_mask_small_coeff * mask_small.a;
        alpha_small_out = clamp(alpha_small_out, 0.0, 1.0);
        GLSL_OUT_FRAG_COLOR.rgb = mix(GLSL_OUT_FRAG_COLOR.rgb, mask_small.rgb / mask_small.a, alpha_small_out);
        GLSL_OUT_FRAG_COLOR.a = mix(GLSL_OUT_FRAG_COLOR.a, 1.0, alpha_small_out);
    }
}