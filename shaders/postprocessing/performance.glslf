#include <precision_statement.glslf>

uniform sampler2D u_color;

varying vec2 v_texcoord;

void main(void) {

    vec4 color = vec4(0.0);

    for (int i = 0; i < 100; i++)
        color += 0.001 * texture2D(u_color, v_texcoord + vec2(0.001 * vec2(i)));

    gl_FragColor = color;
}

