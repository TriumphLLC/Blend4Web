#include <precision_statement.glslf>

uniform sampler2D u_main;
uniform sampler2D u_luminance;
uniform sampler2D u_average_lum;
uniform float u_bloom_edge_lum;

varying vec2 v_texcoord;
varying float v_bloom_factor;

void main(void) {
    float average_lum = texture2D(u_average_lum, vec2(0.5)).r;
    float lum = texture2D(u_luminance, v_texcoord).r;
    vec4 color = texture2D(u_main, v_texcoord);

    float rel_lum = lum / average_lum;
    float edge_lum = u_bloom_edge_lum;

    gl_FragColor = color * max(rel_lum - edge_lum, 0.0) * v_bloom_factor;

    // NOTE: possible tone mapping
    //float mapped_lum = 0.3;
    //float D = rel_lum * (1.0 + rel_lum / (mapped_lum * mapped_lum)) / (1.0 + rel_lum);
    //gl_FragColor = vec4(D / lum);
}
