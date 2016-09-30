#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var POST_EFFECT POST_EFFECT_NONE

/*============================================================================*/

#include <precision_statement.glslf>
#include <std.glsl>

uniform vec2 u_texel_size;
uniform sampler2D u_color;

#if POST_EFFECT == FLIP_CUBEMAP_COORDS
uniform int u_tex_number;
uniform vec2 u_delta;
#endif

#if POST_EFFECT == POST_EFFECT_DOF_BLUR
uniform float u_dof_bokeh_intensity;
#endif

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

#if POST_EFFECT == POST_EFFECT_NONE
    // copy exact
    GLSL_OUT_FRAG_COLOR = GLSL_TEXTURE(u_color, v_texcoord);

#elif POST_EFFECT == POST_EFFECT_GRAYSCALE
    vec4 c = GLSL_TEXTURE(u_color, v_texcoord);

    GLSL_OUT_FRAG_COLOR.rgb = vec3((c.r + c.g + c.b) / 3.0);
    GLSL_OUT_FRAG_COLOR.a = 1.0;

#elif POST_EFFECT == POST_EFFECT_BLUR
    vec2 offset = vec2(0.0, 0.0);
    vec2 delta = u_texel_size;
    vec4 color;

    color = GLSL_TEXTURE(u_color, v_texcoord);
    GLSL_OUT_FRAG_COLOR = color * 0.2270270270;

    offset += delta;
    color = GLSL_TEXTURE(u_color, v_texcoord + offset);
    GLSL_OUT_FRAG_COLOR += color * 0.1945945946;
    color = GLSL_TEXTURE(u_color, v_texcoord - offset);
    GLSL_OUT_FRAG_COLOR += color * 0.1945945946;

    offset += delta;
    color = GLSL_TEXTURE(u_color, v_texcoord + offset);
    GLSL_OUT_FRAG_COLOR += color * 0.1216216216;
    color = GLSL_TEXTURE(u_color, v_texcoord - offset);
    GLSL_OUT_FRAG_COLOR += color * 0.1216216216;

    offset += delta;
    color = GLSL_TEXTURE(u_color, v_texcoord + offset);
    GLSL_OUT_FRAG_COLOR += color * 0.0540540541;
    color = GLSL_TEXTURE(u_color, v_texcoord - offset);
    GLSL_OUT_FRAG_COLOR += color * 0.0540540541;

    offset += delta;
    color = GLSL_TEXTURE(u_color, v_texcoord + offset);
    GLSL_OUT_FRAG_COLOR += color * 0.0162162162;
    color = GLSL_TEXTURE(u_color, v_texcoord - offset);
    GLSL_OUT_FRAG_COLOR += color * 0.0162162162;

#elif POST_EFFECT == POST_EFFECT_GLOW_BLUR
    vec2 offset = vec2(0.0, 0.0);
    vec2 delta = u_texel_size;
    vec4 color;

    // Sigma: 2.6
    // Kernel size: 21
    // 0.01% of the curve’s area outside the discrete kernel
    // Kernel (left side): [0.000102, 0.00041, 0.00142, 0.00425, 0.01099, 0.024549, 0.047383, 0.079019, 0.113861, 0.141763, 0.152507]    

    color = GLSL_TEXTURE(u_color, v_texcoord);
    GLSL_OUT_FRAG_COLOR = color * (1.0 - step(0.0, -color.a)) * 0.152507;

    offset += delta;
    color = GLSL_TEXTURE(u_color, v_texcoord + offset);
    GLSL_OUT_FRAG_COLOR += color * (1.0 - step(0.0, -color.a)) * 0.141763;
    color = GLSL_TEXTURE(u_color, v_texcoord - offset);
    GLSL_OUT_FRAG_COLOR += color * (1.0 - step(0.0, -color.a)) * 0.141763;

    offset += delta;
    color = GLSL_TEXTURE(u_color, v_texcoord + offset);
    GLSL_OUT_FRAG_COLOR += color * (1.0 - step(0.0, -color.a)) * 0.113861;
    color = GLSL_TEXTURE(u_color, v_texcoord - offset);
    GLSL_OUT_FRAG_COLOR += color * (1.0 - step(0.0, -color.a)) * 0.113861;

    offset += delta;
    color = GLSL_TEXTURE(u_color, v_texcoord + offset);
    GLSL_OUT_FRAG_COLOR += color * (1.0 - step(0.0, -color.a)) * 0.079019;
    color = GLSL_TEXTURE(u_color, v_texcoord - offset);
    GLSL_OUT_FRAG_COLOR += color * (1.0 - step(0.0, -color.a)) * 0.079019;

    offset += delta;
    color = GLSL_TEXTURE(u_color, v_texcoord + offset);
    GLSL_OUT_FRAG_COLOR += color * (1.0 - step(0.0, -color.a)) * 0.047383;
    color = GLSL_TEXTURE(u_color, v_texcoord - offset);
    GLSL_OUT_FRAG_COLOR += color * (1.0 - step(0.0, -color.a)) * 0.047383;

    offset += delta;
    color = GLSL_TEXTURE(u_color, v_texcoord + offset);
    GLSL_OUT_FRAG_COLOR += color * (1.0 - step(0.0, -color.a)) * 0.024549;
    color = GLSL_TEXTURE(u_color, v_texcoord - offset);
    GLSL_OUT_FRAG_COLOR += color * (1.0 - step(0.0, -color.a)) * 0.024549;

    offset += delta;
    color = GLSL_TEXTURE(u_color, v_texcoord + offset);
    GLSL_OUT_FRAG_COLOR += color * (1.0 - step(0.0, -color.a)) * 0.01099;
    color = GLSL_TEXTURE(u_color, v_texcoord - offset);
    GLSL_OUT_FRAG_COLOR += color * (1.0 - step(0.0, -color.a)) * 0.01099;

    offset += delta;
    color = GLSL_TEXTURE(u_color, v_texcoord + offset);
    GLSL_OUT_FRAG_COLOR += color * (1.0 - step(0.0, -color.a)) * 0.00425;
    color = GLSL_TEXTURE(u_color, v_texcoord - offset);
    GLSL_OUT_FRAG_COLOR += color * (1.0 - step(0.0, -color.a)) * 0.00425;

    offset += delta;
    color = GLSL_TEXTURE(u_color, v_texcoord + offset);
    GLSL_OUT_FRAG_COLOR += color * (1.0 - step(0.0, -color.a)) * 0.00142;
    color = GLSL_TEXTURE(u_color, v_texcoord - offset);
    GLSL_OUT_FRAG_COLOR += color * (1.0 - step(0.0, -color.a)) * 0.00142;

    GLSL_OUT_FRAG_COLOR = clamp(GLSL_OUT_FRAG_COLOR, 0.0, 1.0); 

#elif POST_EFFECT == POST_EFFECT_DOF_BLUR
    vec2 offset = vec2(0.0, 0.0);
    vec2 delta = u_texel_size;
    vec4 color;
    vec4 avg_color;
    vec4 max_color;
    float coc;
    float bokeh_intensity = u_dof_bokeh_intensity;

    color = GLSL_TEXTURE(u_color, v_texcoord);
    avg_color = color;
    max_color = color;

    coc = color.a;
    delta = coc * delta;

    for (int i = 0; i < 12; i += 2) {
        offset += delta;

        color = GLSL_TEXTURE(u_color, v_texcoord + offset);
        avg_color += color;
        max_color = max(max_color, color);

        color = GLSL_TEXTURE(u_color, v_texcoord - offset);
        avg_color += color;
        max_color = max(max_color, color);
    }

    avg_color /= 13.0;

    GLSL_OUT_FRAG_COLOR = mix(avg_color, max_color, bokeh_intensity);

#elif POST_EFFECT == POST_EFFECT_ALPHA_BLUR
    vec2 offset = vec2(0.0, 0.0);
    vec2 delta = u_texel_size;
    vec4 color;
    vec4 avg_color;
    vec4 max_color;

    color = GLSL_TEXTURE(u_color, v_texcoord);
    max_color = max(max_color, color);
    avg_color = color;
    avg_color.a = color.a * 0.2270270270;

    offset += delta;
    color = GLSL_TEXTURE(u_color, v_texcoord + offset);
    max_color.a = max(max_color.a, color.a);
    avg_color.a += color.a * 0.1945945946;
    color = GLSL_TEXTURE(u_color, v_texcoord - offset);
    max_color.a = max(max_color.a, color.a);
    avg_color.a += color.a * 0.1945945946;

    offset += delta;
    color = GLSL_TEXTURE(u_color, v_texcoord + offset);
    max_color.a = max(max_color.a, color.a);
    avg_color.a += color.a * 0.1216216216;
    color = GLSL_TEXTURE(u_color, v_texcoord - offset);
    max_color.a = max(max_color.a, color.a);
    avg_color.a += color.a * 0.1216216216;

    offset += delta;
    color = GLSL_TEXTURE(u_color, v_texcoord + offset);
    max_color.a = max(max_color.a, color.a);
    avg_color.a += color.a * 0.0540540541;
    color = GLSL_TEXTURE(u_color, v_texcoord - offset);
    max_color.a = max(max_color.a, color.a);
    avg_color.a += color.a * 0.0540540541;

    offset += delta;
    color = GLSL_TEXTURE(u_color, v_texcoord + offset);
    max_color.a = max(max_color.a, color.a);
    avg_color.a += color.a * 0.0162162162;
    color = GLSL_TEXTURE(u_color, v_texcoord - offset);
    max_color.a = max(max_color.a, color.a);
    avg_color.a += color.a * 0.0162162162;

    GLSL_OUT_FRAG_COLOR = mix(avg_color, max_color, 0.5);

#elif POST_EFFECT == POST_EFFECT_EXTEND
    vec2 delta = u_texel_size;

    vec4 color = GLSL_TEXTURE(u_color, v_texcoord);
    GLSL_OUT_FRAG_COLOR = color;

    if (color.a == 0.0) {
        color = GLSL_TEXTURE(u_color, v_texcoord + delta);
        if (color.a > 0.0)
            GLSL_OUT_FRAG_COLOR = vec4(1.0, 1.0, 1.0, color.a);
        else {
            color = GLSL_TEXTURE(u_color, v_texcoord - delta);
            if (color.a > 0.0)
                GLSL_OUT_FRAG_COLOR = vec4(1.0, 1.0, 1.0, color.a);
        }
    }

#elif POST_EFFECT == FLIP_CUBEMAP_COORDS
    float delta_x = u_delta[0];
    float delta_y = u_delta[1];
    float rel_x_dim = 1.0 / 3.0;
    float rel_y_dim = 0.5;
    vec2 scale = vec2(rel_x_dim, rel_y_dim);
    if (u_tex_number == 0) {
        // +X
        vec2 texcoord = mat2(0.0, -1.0, 1.0, 0.0) * v_texcoord * scale + vec2(2.0 * rel_x_dim, rel_y_dim);
        texcoord[0] = max(texcoord[0], 2.0 * rel_x_dim + delta_x);
        texcoord[1] = max(texcoord[1], delta_y);
        GLSL_OUT_FRAG_COLOR = GLSL_TEXTURE(u_color, vec2(texcoord[0], rel_y_dim - texcoord[1]));
    } else if (u_tex_number == 1) {
        // -X
        vec2 texcoord = mat2(0.0, -1.0, 1.0, 0.0) * v_texcoord * scale + vec2(0.0, rel_y_dim);
        texcoord[0] = max(texcoord[0], delta_x);
        texcoord[1] = min(texcoord[1], rel_y_dim - delta_y);
        GLSL_OUT_FRAG_COLOR = GLSL_TEXTURE(u_color, vec2(rel_x_dim - texcoord[0], texcoord[1]));
    } else if (u_tex_number == 2) {
        // +Y
        vec2 texcoord = v_texcoord * scale + vec2(2.0 * rel_x_dim, rel_y_dim);
        texcoord[0] = max(texcoord[0], 2.0 * rel_x_dim + delta_x);
        texcoord[1] = min(texcoord[1], 1.0 - delta_y);
        GLSL_OUT_FRAG_COLOR = GLSL_TEXTURE(u_color, vec2(texcoord[0], 1.5 - texcoord[1]));
    } else if (u_tex_number == 3) {
        // -Y
        vec2 texcoord = v_texcoord * scale + vec2(rel_x_dim, 0.0);
        texcoord[0] = max(texcoord[0], rel_x_dim + delta_x);
        texcoord[0] = min(texcoord[0], 2.0 * rel_x_dim - delta_x);
        texcoord[1] = min(texcoord[1], rel_y_dim - delta_y);
        GLSL_OUT_FRAG_COLOR = GLSL_TEXTURE(u_color, vec2(1.0 - texcoord[0], texcoord[1]));
    } else if (u_tex_number == 4) {
        // +Z
        vec2 texcoord = v_texcoord * scale + vec2(rel_x_dim, rel_y_dim);
        texcoord[0] = max(texcoord[0], rel_x_dim + delta_x);
        texcoord[0] = min(texcoord[0], 2.0 * rel_x_dim - delta_x);
        texcoord[1] = min(texcoord[1], 1.0 - delta_y);
        GLSL_OUT_FRAG_COLOR = GLSL_TEXTURE(u_color, vec2(texcoord[0], 3.0 * rel_y_dim - texcoord[1]));
    } else {
        // -Z
        vec2 texcoord = v_texcoord * scale + vec2(0.0, rel_y_dim);
        texcoord[0] = max(texcoord[0], delta_x);
        texcoord[1] = min(texcoord[1], 1.0 - delta_y);
        texcoord[1] = max(texcoord[1], rel_y_dim + delta_y);
        GLSL_OUT_FRAG_COLOR = GLSL_TEXTURE(u_color, vec2(rel_x_dim - texcoord[0], texcoord[1]));
    }

#endif
}

