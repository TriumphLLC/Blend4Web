#include <precision_statement.glslf>
#include <color_util.glslf>

uniform sampler2D u_outline_src;
uniform sampler2D u_outline_mask;
uniform sampler2D u_outline_mask_blurred;
uniform vec3 u_outline_color;
uniform float u_draw_outline;

varying vec2 v_texcoord;

void main(void) {
    vec4 outline_src = texture2D(u_outline_src, v_texcoord);
    gl_FragColor = outline_src;

    if (u_draw_outline != 0.0) {
        vec4 outline_mask = texture2D(u_outline_mask, v_texcoord);
        vec4 outline_mask_blurred = texture2D(u_outline_mask_blurred, v_texcoord);

        float alpha_diff = outline_mask_blurred.a - outline_mask.a;

        if (alpha_diff != 0.0) {
            float outline_strength = smoothstep(0.0, 1.0, outline_mask_blurred.a);

            // NOTE: outlining outside object
            if (outline_mask.a == 0.0) {
                vec3 outline_color_srgb = u_outline_color;
                lin_to_srgb(outline_color_srgb);
                vec4 outline_color = vec4(clamp(outline_color_srgb, 0.0, 1.0), 1.0);
                gl_FragColor = mix(outline_src, outline_color, outline_strength);
            }
        }
    }
}

