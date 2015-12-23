#include <precision_statement.glslf>
#include <color_util.glslf>

uniform sampler2D u_sampler_left;
uniform sampler2D u_sampler_right;

varying vec2 v_texcoord;

#if !ANAGLYPH
// u_distortion_params = [distortion_coef_1, distortion_coef_2, distortion_scale, distortion_offset]
uniform vec4 u_distortion_params;
uniform int u_enable_hmd_stereo;

vec2 hmd_distorsion(vec2 texcoord, vec2 center) {
    vec2 theta = (texcoord - center) * vec2(2.0);
    float rsquare = theta.x * theta.x + theta.y * theta.y;
    vec2 rvector = theta * (1.0 + u_distortion_params[0] * rsquare
            + u_distortion_params[1] * rsquare * rsquare);
    return rvector * vec2(0.5) * u_distortion_params[2] + center;
}
#endif

void main(void) {
#if ANAGLYPH
    vec4 lc = texture2D(u_sampler_left, v_texcoord);
    vec4 rc = texture2D(u_sampler_right, v_texcoord);

    // Photoshop algorithm
    //gl_FragColor = vec4(lc[0], rc[1], rc[2], lc[3] + rc[3]);

    // Dubois algorithm

    vec3 lc3 = vec3(lc[0], lc[1], lc[2]);
    srgb_to_lin(lc3);

    vec3 rc3 = vec3(rc[0], rc[1], rc[2]);
    srgb_to_lin(rc3);

    mat3 left = mat3(0.437, -0.062, -0.048, 
                     0.449, -0.062, -0.050,
                     0.164, -0.024, -0.017);

    mat3 right = mat3(-0.011, 0.377, -0.026, 
                      -0.032, 0.761, -0.093 ,
                      -0.007, 0.009,  1.234);

    vec3 color = clamp(left * lc3, 0.0, 1.0) + clamp(right * rc3, 0.0, 1.0);
    lin_to_srgb(color);

    gl_FragColor = vec4(color, lc[3] + rc[3]);
#else
    if (u_enable_hmd_stereo != 0) {
        // TODO: fix chromatic aberration
        if (v_texcoord[0] < 0.5) {
            // left eye
            vec2 tc = hmd_distorsion(vec2(2.0 * v_texcoord[0], v_texcoord[1]),
                    vec2(0.5 + u_distortion_params[3] * 0.5, 0.5));
            if (clamp(tc, vec2(0.0), vec2(1.0)) != tc) {
                gl_FragColor = vec4(0.0);
            } else {
                gl_FragColor = texture2D(u_sampler_left, tc);
            }
        } else {
            // right eye
            vec2 tc = hmd_distorsion(vec2(2.0 * (v_texcoord[0] - 0.5), v_texcoord[1]),
                    vec2(0.5 - u_distortion_params[3] * 0.5, 0.5));
            if (clamp(tc, vec2(0.0), vec2(1.0)) != tc) {
                gl_FragColor = vec4(0.0);
            } else {
                gl_FragColor = texture2D(u_sampler_right, tc);
            }
        }
    } else {
        gl_FragColor = texture2D(u_sampler_left, v_texcoord);
    }
#endif // ANAGLYPH
}
