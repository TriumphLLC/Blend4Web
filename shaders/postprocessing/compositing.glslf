#include <precision_statement.glslf>

#include <color_util.glslf>

#define PI_4 0.785398163

uniform sampler2D u_color;

uniform float u_brightness; // -1..1
uniform float u_contrast; // -1..1

uniform float u_exposure; // 0..inf
uniform float u_saturation; // 0..inf

varying vec2 v_texcoord;

void main(void) {

    vec4 tex_input = texture2D(u_color, v_texcoord);

    vec3 color = tex_input.rgb;

    // brightness 
    if (u_brightness < 0.0) 
        color = color * (1.0 + u_brightness);
    else 
        color = color + ((1.0 - color) * u_brightness);

    // contrast
    color = (color - 0.5) * (tan((u_contrast + 1.0) * PI_4)) + 0.5;

    // exposure
    color *= u_exposure;

    // saturation
    float intensity = luma(vec4(color, 0.0));
    color = mix(vec3(intensity), color, u_saturation);

    //gl_FragColor = vec4(sqrt(color), tex_input.a);
    //gl_FragColor = vec4(pow(color, vec3(1.0/2.2)), tex_input.a);
    gl_FragColor = vec4(color, tex_input.a);
}

