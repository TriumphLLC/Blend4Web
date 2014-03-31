#include <precision_statement.glslf>
uniform sampler2D u_main;
uniform sampler2D u_bloom;

varying vec2 v_texcoord;

void main(void) {
    vec4 inp_color = texture2D(u_main, v_texcoord);
    vec4 bloom_color = texture2D(u_bloom, v_texcoord);

    vec4 color = inp_color;
    color += bloom_color;
    gl_FragColor = vec4(color.rgb, 1.0);
}
