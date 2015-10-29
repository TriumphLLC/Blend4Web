#include <precision_statement.glslf>
#include <color_util.glslf>
#include <pack.glslf>

uniform sampler2D u_main;
uniform sampler2D u_god_rays;

uniform float u_god_rays_intensity;
uniform vec3 u_sun_intensity;

varying vec2 v_texcoord;

void main(void) {
    vec4 main_col = texture2D(u_main, v_texcoord);
    vec3 lcolorint = clamp(u_sun_intensity, 0.4, 0.8);

    srgb_to_lin(main_col.rgb);

    float god_rays = unpack_float(texture2D(u_god_rays, v_texcoord));
    vec3 fin_color = main_col.rgb
            + u_god_rays_intensity * vec3(god_rays) * lcolorint;
    lin_to_srgb(fin_color);

#if SAFARI_CANVAS_ALPHA_HACK
    gl_FragColor = vec4(fin_color, max(0.01, main_col.a));
#else
    gl_FragColor = vec4(fin_color, main_col.a);
#endif
}
