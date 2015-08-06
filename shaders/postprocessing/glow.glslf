#include <precision_statement.glslf>

uniform sampler2D u_src_color;
uniform sampler2D u_glow_mask_small;
uniform sampler2D u_glow_mask_large;

uniform float u_glow_mask_small_coeff;
uniform float u_glow_mask_large_coeff;

varying vec2 v_texcoord;

void main(void) {

    vec4 src_color = texture2D(u_src_color, v_texcoord);
    vec4 mask_small = texture2D(u_glow_mask_small, v_texcoord);
    vec4 mask_large = texture2D(u_glow_mask_large, v_texcoord);

    gl_FragColor = src_color;
   
    if (mask_large.a != 0.0) {
        // outside object inside mask_large

        float alpha_large_out = u_glow_mask_large_coeff * mask_large.a;
        alpha_large_out = clamp(alpha_large_out, 0.0, 1.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, mask_large.rgb / mask_large.a, alpha_large_out);
        gl_FragColor.a = mix(gl_FragColor.a, 1.0, alpha_large_out);
    }
    if (mask_small.a != 0.0) {
        // outside object inside mask_small
    
        float alpha_small_out = u_glow_mask_small_coeff * mask_small.a;
        alpha_small_out = clamp(alpha_small_out, 0.0, 1.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, mask_small.rgb / mask_small.a, alpha_small_out);
        gl_FragColor.a = mix(gl_FragColor.a, 1.0, alpha_small_out);
    }
}