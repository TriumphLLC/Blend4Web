#version GLSL_VERSION

#include <precision_statement.glslf>
#include <std.glsl>
uniform sampler2D u_input;

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/

//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {
    float luminance;

    float sum_lum = 0.0;

    float w = 0.025;
    float h = 0.025;
    //iterate over 400 pixels in the image
    // NOTE: Mac doesn't support iterations with float variables
    for (int i = 0; i < 20; i += 1) {
        h = 0.025;
        for (int j = 0; j < 20; j += 1) {
            // Avoid zero values as log will be -infinity
            luminance = max(GLSL_TEXTURE( u_input, vec2(w, h) ).r, 0.01);
            sum_lum += log(luminance);
            h += 0.05;
        }
        w += 0.05;
    }
    float average_lum = exp(sum_lum / 400.0);

    GLSL_OUT_FRAG_COLOR = vec4(vec3(average_lum), 1.0);
}
