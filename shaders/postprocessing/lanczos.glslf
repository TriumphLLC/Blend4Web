#include <precision_statement.glslf>

uniform vec2 u_texel_size;
uniform sampler2D u_color;

varying vec2 v_texcoord;

void main(void) {
     vec4 color = texture2D(u_color, v_texcoord) * 0.38026;

     color += texture2D(u_color, v_texcoord - u_texel_size) * 0.27667;
     color += texture2D(u_color, v_texcoord + u_texel_size) * 0.27667;

     color += texture2D(u_color, v_texcoord - 2.0 * u_texel_size) * 0.08074;
     color += texture2D(u_color, v_texcoord + 2.0 * u_texel_size) * 0.08074;

     color += texture2D(u_color, v_texcoord - 3.0 * u_texel_size) * -0.02612;
     color += texture2D(u_color, v_texcoord + 3.0 * u_texel_size) * -0.02612;

     color += texture2D(u_color, v_texcoord - 4.0 * u_texel_size) * -0.02143;
     color += texture2D(u_color, v_texcoord + 4.0 * u_texel_size) * -0.02143;

     gl_FragColor = color;
}
