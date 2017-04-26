#ifndef COVERAGE_GLSLF
#define COVERAGE_GLSLF

#include <procedural.glslf>

// the amount of different coverage levels
const float COVERAGE_PIX_COUNT = 1000.0;

bool coverage_is_frag_visible(float alpha, float cmp_logic) {
    if (cmp_logic < 0.0)
        alpha = 1.0 - alpha;
    float coverage_level = floor(alpha * COVERAGE_PIX_COUNT);
    float rand_level = floor(generate_rand_val(gl_FragCoord.xy) * COVERAGE_PIX_COUNT);
    
    if (cmp_logic > 0.0)
        // direct: alpha = 1 means fully rendered object
        return rand_level < coverage_level;
    else
        // inverse: alpha = 1 means fully discarded object
        return rand_level >= coverage_level;
}

#endif