#include <precision_statement.glslf>
#include <gamma.glslf>

uniform sampler2D u_sampler;

varying vec2 v_texcoord;

void main(void) {
    vec4 color = texture2D(u_sampler, v_texcoord);
    lin_to_srgb(color.rgb);
    premultiply_alpha(color.rgb, color.a);
    gl_FragColor = color;
}
