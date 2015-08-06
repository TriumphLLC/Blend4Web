#include <precision_statement.glslf>

#define POST_EFFECT_NONE 1
#define POST_EFFECT_GRAYSCALE 2
#define POST_EFFECT_X_BLUR 3
#define POST_EFFECT_Y_BLUR 4
#define POST_EFFECT_X_EXTEND 5
#define POST_EFFECT_Y_EXTEND 6

uniform vec2 u_texel_size;
uniform sampler2D u_color;

varying vec2 v_texcoord;

void main(void) {

#if POST_EFFECT == POST_EFFECT_NONE
    // copy exact
    gl_FragColor = texture2D(u_color, v_texcoord);

#elif POST_EFFECT == POST_EFFECT_GRAYSCALE
    vec4 c = texture2D(u_color, v_texcoord);

    gl_FragColor.rgb = vec3((c.r + c.g + c.b) / 3.0);
    gl_FragColor.a = 1.0;

#elif POST_EFFECT == POST_EFFECT_X_BLUR || POST_EFFECT == POST_EFFECT_Y_BLUR
    vec2 offset = vec2(0.0, 0.0);
    vec2 delta = u_texel_size; 
    vec4 color;

    color = texture2D(u_color, v_texcoord);
    gl_FragColor = color * 0.2270270270;

    offset += delta;
    color = texture2D(u_color, v_texcoord + offset);
    gl_FragColor += color * 0.1945945946;
    color = texture2D(u_color, v_texcoord - offset);
    gl_FragColor += color * 0.1945945946;

    offset += delta;
    color = texture2D(u_color, v_texcoord + offset);
    gl_FragColor += color * 0.1216216216;
    color = texture2D(u_color, v_texcoord - offset);
    gl_FragColor += color * 0.1216216216;

    offset += delta;
    color = texture2D(u_color, v_texcoord + offset);
    gl_FragColor += color * 0.0540540541;
    color = texture2D(u_color, v_texcoord - offset);
    gl_FragColor += color * 0.0540540541;

    offset += delta;
    color = texture2D(u_color, v_texcoord + offset);
    gl_FragColor += color * 0.0162162162;
    color = texture2D(u_color, v_texcoord - offset);
    gl_FragColor += color * 0.0162162162;

#elif POST_EFFECT == POST_EFFECT_X_GLOW_BLUR || POST_EFFECT == POST_EFFECT_Y_GLOW_BLUR
    vec2 offset = vec2(0.0, 0.0);
    vec2 delta = u_texel_size;
    vec4 color;

    // Sigma: 2.6
    // Kernel size: 21
    // 0.01% of the curve’s area outside the discrete kernel
    // Kernel (left side): [0.000102, 0.00041, 0.00142, 0.00425, 0.01099, 0.024549, 0.047383, 0.079019, 0.113861, 0.141763, 0.152507]    

    color = texture2D(u_color, v_texcoord);
    gl_FragColor = color * (1.0 - step(0.0, -color.a)) * 0.152507;

    offset += delta;
    color = texture2D(u_color, v_texcoord + offset);
    gl_FragColor += color * (1.0 - step(0.0, -color.a)) * 0.141763;
    color = texture2D(u_color, v_texcoord - offset);
    gl_FragColor += color * (1.0 - step(0.0, -color.a)) * 0.141763;

    offset += delta;
    color = texture2D(u_color, v_texcoord + offset);
    gl_FragColor += color * (1.0 - step(0.0, -color.a)) * 0.113861;
    color = texture2D(u_color, v_texcoord - offset);
    gl_FragColor += color * (1.0 - step(0.0, -color.a)) * 0.113861;

    offset += delta;
    color = texture2D(u_color, v_texcoord + offset);
    gl_FragColor += color * (1.0 - step(0.0, -color.a)) * 0.079019;
    color = texture2D(u_color, v_texcoord - offset);
    gl_FragColor += color * (1.0 - step(0.0, -color.a)) * 0.079019;

    offset += delta;
    color = texture2D(u_color, v_texcoord + offset);
    gl_FragColor += color * (1.0 - step(0.0, -color.a)) * 0.047383;
    color = texture2D(u_color, v_texcoord - offset);
    gl_FragColor += color * (1.0 - step(0.0, -color.a)) * 0.047383;

    offset += delta;
    color = texture2D(u_color, v_texcoord + offset);
    gl_FragColor += color * (1.0 - step(0.0, -color.a)) * 0.024549;
    color = texture2D(u_color, v_texcoord - offset);
    gl_FragColor += color * (1.0 - step(0.0, -color.a)) * 0.024549;

    offset += delta;
    color = texture2D(u_color, v_texcoord + offset);
    gl_FragColor += color * (1.0 - step(0.0, -color.a)) * 0.01099;
    color = texture2D(u_color, v_texcoord - offset);
    gl_FragColor += color * (1.0 - step(0.0, -color.a)) * 0.01099;

    offset += delta;
    color = texture2D(u_color, v_texcoord + offset);
    gl_FragColor += color * (1.0 - step(0.0, -color.a)) * 0.00425;
    color = texture2D(u_color, v_texcoord - offset);
    gl_FragColor += color * (1.0 - step(0.0, -color.a)) * 0.00425;

    offset += delta;
    color = texture2D(u_color, v_texcoord + offset);
    gl_FragColor += color * (1.0 - step(0.0, -color.a)) * 0.00142;
    color = texture2D(u_color, v_texcoord - offset);
    gl_FragColor += color * (1.0 - step(0.0, -color.a)) * 0.00142;

    gl_FragColor = clamp(gl_FragColor, 0.0, 1.0); 

#elif POST_EFFECT == POST_EFFECT_X_EXTEND || POST_EFFECT == POST_EFFECT_Y_EXTEND
    vec2 delta = u_texel_size;

    vec4 color = texture2D(u_color, v_texcoord);
    gl_FragColor = color;

    if (color.a == 0.0) {
        color = texture2D(u_color, v_texcoord + delta);
        if (color.a > 0.0)
            gl_FragColor = vec4(1.0, 1.0, 1.0, color.a);
        else {
            color = texture2D(u_color, v_texcoord - delta);
            if (color.a > 0.0)
                gl_FragColor = vec4(1.0, 1.0, 1.0, color.a);
        }
    }

#endif
}

