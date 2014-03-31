#include <precision_statement.glslf>
uniform sampler2D u_input;

varying vec2 v_texcoord;

void main(void) {
    vec4 inp_color = texture2D(u_input, v_texcoord);
    float luminance = dot(inp_color.rgb, vec3(0.2126, 0.7152, 0.0722));
    gl_FragColor = vec4(vec3(luminance), 1.0);
}
