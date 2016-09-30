#version GLSL_VERSION

#include <precision_statement.glslf>
#include <std.glsl>
#include <color_util.glslf>

uniform sampler2D u_outline_src;
uniform sampler2D u_outline_mask;
uniform sampler2D u_outline_mask_blurred;
uniform vec3 u_outline_color;
uniform float u_draw_outline;

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
    vec4 outline_src = GLSL_TEXTURE(u_outline_src, v_texcoord);
    GLSL_OUT_FRAG_COLOR = outline_src;

    if (u_draw_outline != 0.0) {
        vec4 outline_mask = GLSL_TEXTURE(u_outline_mask, v_texcoord);
        vec4 outline_mask_blurred = GLSL_TEXTURE(u_outline_mask_blurred, v_texcoord);

        float alpha_diff = outline_mask_blurred.a - outline_mask.a;

        if (alpha_diff != 0.0) {
            float outline_strength = smoothstep(0.0, 1.0, outline_mask_blurred.a);

            // NOTE: outlining outside object
            if (outline_mask.a == 0.0) {
                vec3 outline_color_srgb = u_outline_color;
                lin_to_srgb(outline_color_srgb);
                vec4 outline_color = vec4(clamp(outline_color_srgb, 0.0, 1.0), 1.0);
                GLSL_OUT_FRAG_COLOR = mix(outline_src, outline_color, outline_strength);
            }
        }
    }
}

