#include <precision_statement.glslf>
#include <depth_fetch.glslf>
#include <procedural.glslf>

#define SSAO_QUALITY_8 1
#define SSAO_QUALITY_16 2
#define SSAO_QUALITY_24 3
#define SSAO_QUALITY_32 4

uniform sampler2D u_color;
uniform sampler2D u_depth;
uniform sampler2D u_ssao_special_tex;
uniform vec2 u_camera_range;
uniform vec2 u_texel_size;

varying vec2 v_texcoord;

uniform float u_ssao_radius_increase; // sampling radius increase
uniform float u_ssao_influence; // how much ao affects final rendering
uniform float u_ssao_dist_factor; // how much ao decreases with distance

float read_depth(in vec2 coord) {
    return depth_fetch(u_depth, coord, u_camera_range);
}

void main(void) {

    // TODO replace this by rendering to one channel using color mask
    float tex_input = texture2D(u_color, v_texcoord).r;
#if SSAO_WHITE
    gl_FragColor = vec4(tex_input, 1.0, 0.0, 1.0);
    return;
#endif

    vec3 rot = normalize(2.0 * texture2D(u_ssao_special_tex, v_texcoord * 0.25 / u_texel_size).rgb - 1.0);

    float depth = read_depth(v_texcoord);
    float kdepth = depth * (u_camera_range.y - u_camera_range.x);

#if SSAO_QUALITY == SSAO_QUALITY_8
    const float snum = 8.0;
    const int csize= 1;
#elif SSAO_QUALITY == SSAO_QUALITY_16
    const float snum = 16.0;
    const int csize= 2;
#elif SSAO_QUALITY == SSAO_QUALITY_24
    const float snum = 24.0;
    const int csize= 3;
#elif SSAO_QUALITY == SSAO_QUALITY_32
    const float snum = 32.0;
    const int csize= 4;
#endif

    float offsc = u_ssao_radius_increase * 0.001; // was 0.01
    const float scstep = 1.0 + 2.4 / snum;
    float res = 0.0;

    for (int i = 0; i < csize; i++)
        for (int x = -1; x <= 1; x += 2)
            for (int y = -1; y <= 1; y += 2)
                for (int z = -1; z <= 1; z += 2) {
                    vec3 rotoff = reflect(normalize(vec3(x,y,z)), rot) * (offsc *= scstep);
                    vec3 spos = vec3(v_texcoord, kdepth);
                    spos += vec3(rotoff.xy, rotoff.z * kdepth * 2.0);
#if SSAO_HEMISPHERE
                    // 1.4 - more samples close to kernel
                    spos.z -= 1.4 * (spos.z - kdepth) * step(kdepth, spos.z);
#endif
                    float sdepth = read_depth(spos.xy) * (u_camera_range.y - u_camera_range.x);
                    float rfuncf = clamp((kdepth - sdepth) / sdepth, 0.0, 1.0);
#if SSAO_HEMISPHERE
                    res += mix(1.0, rfuncf, step(sdepth, spos.z));
#else
                    res += mix(step(spos.z, sdepth), 0.5, rfuncf);
#endif
                }

    res = res / snum;
// amplification function
#if SSAO_HEMISPHERE
    res = clamp(res * res + 0.6 * res, 0.0, 1.0);
#else
    res = clamp(res * res + res, 0.0, 1.0);
#endif

    float ssao_influence = u_ssao_influence * (1.0 - u_ssao_dist_factor * depth);
    res = mix(1.0, res, ssao_influence);

    gl_FragColor = vec4(tex_input, res, 0.0, 1.0);
}
