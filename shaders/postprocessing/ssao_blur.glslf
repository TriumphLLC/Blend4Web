#include <precision_statement.glslf>

#if SSAO_BLUR_DEPTH
#include <depth_fetch.glslf>
#endif

uniform sampler2D u_ssao_mask;
uniform vec2 u_texel_size;
varying vec2 v_texcoord;

#if SSAO_BLUR_DEPTH
uniform sampler2D u_depth;
uniform vec2 u_camera_range;
uniform float u_ssao_blur_discard_value;

float read_depth(in vec2 coord) {
    return depth_fetch(u_depth, coord, u_camera_range);
}
#endif

void main() {
   float sum = 0.0;

#if SSAO_BLUR_DEPTH
   float kdeph = read_depth(v_texcoord);
   float weight = 0.0;
   float amplif = u_ssao_blur_discard_value * 100.0;
#endif
   vec2 hlim = vec2(-2.0); // -2.0 - solve problem with aliasing
   for (int i = 0; i < 4; ++i) {
      for (int j = 0; j < 4; ++j) {
        vec2 offset = (hlim + vec2(float(i), float(j))) * u_texel_size;
        float svalue = texture2D(u_ssao_mask, v_texcoord + offset).g;

#if SSAO_BLUR_DEPTH
        float sdeph = read_depth(v_texcoord + offset);
        float test = 1.0 - clamp(abs(sdeph - kdeph) * amplif, 0.0, 1.0);
        sum += svalue * test;
        weight += test;
#else
        sum += svalue;
#endif
      }
   }

#if SSAO_BLUR_DEPTH
   gl_FragColor = vec4(texture2D(u_ssao_mask, v_texcoord).r, sum / weight, 0.0, 1.0);
#else
   gl_FragColor = vec4(texture2D(u_ssao_mask, v_texcoord).r, sum / 16.0, 0.0, 1.0);
#endif
}
