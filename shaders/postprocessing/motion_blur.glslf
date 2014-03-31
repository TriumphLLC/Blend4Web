#var BLUR_DECAY_THRESHOLD 0.0

#include <precision_statement.glslf>

uniform sampler2D u_mb_tex_curr;
uniform sampler2D u_mb_tex_accum;
uniform float u_motion_blur_exp;

varying vec2 v_texcoord;

void main(void) {
    vec4 tex_curr = texture2D(u_mb_tex_curr, v_texcoord);
    vec4 tex_accum = texture2D(u_mb_tex_accum, v_texcoord);

    if (length(tex_curr - tex_accum) > BLUR_DECAY_THRESHOLD) {
        gl_FragColor = (1.0 - u_motion_blur_exp) * tex_curr 
                + u_motion_blur_exp * tex_accum;
    } else {
        gl_FragColor = tex_curr;
    }
}

