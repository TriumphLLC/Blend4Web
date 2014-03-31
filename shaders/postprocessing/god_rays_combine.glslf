#include <precision_statement.glslf>
#include <gamma.glslf>

uniform sampler2D u_main;
uniform sampler2D u_god_rays;

uniform float u_god_rays_intensity;

varying vec2 v_texcoord;

void main(void) {
    vec4 main_col = texture2D(u_main, v_texcoord);

    srgb_to_lin(main_col.rgb);

    vec3 fin_color = main_col.rgb +
                u_god_rays_intensity * (texture2D(u_god_rays, v_texcoord)).rgb;
    lin_to_srgb(fin_color);

    gl_FragColor.rgb = fin_color;
    gl_FragColor.a = main_col.a;
}
