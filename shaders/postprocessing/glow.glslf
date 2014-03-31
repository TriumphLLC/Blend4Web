#include <precision_statement.glslf>
#include <gamma.glslf>

uniform sampler2D u_glow_src;
uniform sampler2D u_glow_mask;
uniform sampler2D u_glow_mask_blurred;
uniform vec3 u_glow_color;
uniform float u_draw_glow;

varying vec2 v_texcoord;

void main(void) {
    vec4 glow_src = texture2D(u_glow_src, v_texcoord);
    gl_FragColor = glow_src;

    if (u_draw_glow != 0.0) {
        vec4 glow_mask = texture2D(u_glow_mask, v_texcoord);
        vec4 glow_mask_blurred = texture2D(u_glow_mask_blurred, v_texcoord);

        float alpha_diff = glow_mask_blurred.a - glow_mask.a;

        if (alpha_diff != 0.0) {
            float glow_strength = smoothstep(0.0, 1.0, glow_mask_blurred.a);

            // NOTE: glowing outside object
            if (glow_mask.a == 0.0) {
                vec3 glow_color_srgb = u_glow_color;
                lin_to_srgb(glow_color_srgb);
                vec4 glow_color = vec4(clamp(glow_color_srgb, 0.0, 1.0), glow_strength);

                gl_FragColor = mix(glow_src, glow_color, glow_strength);
            }
        }
    }
}

