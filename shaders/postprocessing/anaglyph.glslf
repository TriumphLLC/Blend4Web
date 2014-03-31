#include <precision_statement.glslf>

uniform sampler2D u_sampler_left;
uniform sampler2D u_sampler_right;

varying vec2 v_texcoord;

void main(void) {

    vec4 lc = texture2D(u_sampler_left, v_texcoord);
    vec4 rc = texture2D(u_sampler_right, v_texcoord);

    gl_FragColor = vec4(lc[0], rc[1], rc[2], lc[3] + rc[3]);
}

