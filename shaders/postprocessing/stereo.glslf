#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var ANAGLYPH 0

/*============================================================================*/

#include <precision_statement.glslf>
#include <std.glsl>
#include <color_util.glslf>

uniform sampler2D u_sampler_left;
uniform sampler2D u_sampler_right;

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec2 v_texcoord;
//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*============================================================================*/

#if !ANAGLYPH
uniform int u_enable_hmd_stereo;

// u_distortion_params = [distortion_coef_1, distortion_coef_2, base_line_factor, inter_lens_factor]
uniform vec4 u_distortion_params;
uniform vec4 u_chromatic_aberration_coefs;

void hmd_distorsion(vec2 texcoord, vec2 center, float size, sampler2D sampler) {
    vec2 theta = (texcoord - center) * 2.0;
    theta /= size;
    float rsquare = theta.x * theta.x + theta.y * theta.y;
    vec2 rvector = theta * (1.0 + u_distortion_params[0] * rsquare
            + u_distortion_params[1] * rsquare * rsquare);
    vec2 tc = rvector * 0.5 / (1.0 + u_distortion_params[0] + u_distortion_params[1]);

    if (length(u_chromatic_aberration_coefs) > 0.0) {
        vec2 tc_r = tc * (1.0 + u_chromatic_aberration_coefs[0] +
                rsquare * u_chromatic_aberration_coefs[1]) + center;
        vec2 tc_g = tc + center;
        vec2 tc_b = tc * (1.0 + u_chromatic_aberration_coefs[2] +
                rsquare * u_chromatic_aberration_coefs[3]) + center;

        if (clamp(tc_b, 0.0, 1.0) != tc_b) {
            GLSL_OUT_FRAG_COLOR = vec4(0.0);
        } else {
            vec4 orig_rgba = GLSL_TEXTURE(sampler, tc_g);

            GLSL_OUT_FRAG_COLOR[0] = GLSL_TEXTURE(sampler, tc_r).x;
            GLSL_OUT_FRAG_COLOR[1] = orig_rgba.y;
            GLSL_OUT_FRAG_COLOR[2] = GLSL_TEXTURE(sampler, tc_b).z;
            GLSL_OUT_FRAG_COLOR[3] = orig_rgba.w;
        }
    } else {
        tc = tc * size + center;
        if (clamp(tc, 0.0, 1.0) != tc) {
            GLSL_OUT_FRAG_COLOR = vec4(0.0);
        } else {
            GLSL_OUT_FRAG_COLOR = GLSL_TEXTURE(sampler, tc);
        }
    }
}
#endif // !ANAGLYPH

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {
#if ANAGLYPH
    vec4 lc = GLSL_TEXTURE(u_sampler_left, v_texcoord);
    vec4 rc = GLSL_TEXTURE(u_sampler_right, v_texcoord);

    // Photoshop algorithm
    //GLSL_OUT_FRAG_COLOR = vec4(lc[0], rc[1], rc[2], lc[3] + rc[3]);

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

    GLSL_OUT_FRAG_COLOR = vec4(color, lc[3] + rc[3]);
#else // ANAGLYPH
    if (u_enable_hmd_stereo != 0) {
        if (v_texcoord[0] < 0.5) {
            // left eye
            vec2 texcoord = vec2(2.0 * v_texcoord[0], v_texcoord[1]);
            vec2 center = vec2(0.5 - (u_distortion_params[3] - 0.5) / 2.0, u_distortion_params[2]);
            float size = 2.0 * u_distortion_params[3];
            hmd_distorsion(texcoord, center, size, u_sampler_left);
        } else {
            // right eye
            vec2 texcoord = vec2(2.0 * (v_texcoord[0] - 0.5), v_texcoord[1]);
            vec2 center = vec2(0.5 + (u_distortion_params[3] - 0.5) / 2.0, u_distortion_params[2]);
            float size = 2.0 * u_distortion_params[3];
            hmd_distorsion(texcoord, center, size, u_sampler_right);
        }
    } else {
        GLSL_OUT_FRAG_COLOR = GLSL_TEXTURE(u_sampler_left, v_texcoord);
    }
#endif // ANAGLYPH
}
