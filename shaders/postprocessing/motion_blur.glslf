
#include <precision_statement.glslf>

uniform sampler2D u_mb_tex_curr;
uniform sampler2D u_mb_tex_accum;
uniform float u_motion_blur_exp;
uniform float u_motion_blur_decay_threshold;

varying vec2 v_texcoord;

// NOTE: texture precision issue (may not occur at low FPS)
// the less the better
float TEX_PRECISION_TRESHOLD = 0.0042;

void main(void) {
    vec4 tex_curr = texture2D(u_mb_tex_curr, v_texcoord);
    vec4 tex_accum = texture2D(u_mb_tex_accum, v_texcoord);

    if (length(tex_curr - tex_accum) > u_motion_blur_decay_threshold) {
        vec4 blurred_col = (1.0 - u_motion_blur_exp) * tex_curr 
                + u_motion_blur_exp * tex_accum;
        
        vec4 delta_blur = blurred_col - tex_accum;
        vec4 delta_curr = tex_curr - tex_accum;

        // NOTE: clamp doesn't fit here, for the "minVal > maxVal" case
        vec4 delta = min(max(abs(delta_blur), vec4(TEX_PRECISION_TRESHOLD)), 
                abs(delta_curr)) * sign(delta_blur);

        gl_FragColor = tex_accum + delta;
    } else {
        gl_FragColor = tex_curr;
    }
}

