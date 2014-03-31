#include <precision_statement.glslf>
uniform sampler2D u_input;

void main(void) {
    float luminance;

    float sum_lum = 0.0;

    //iterate over 400 pixels in the image
    for (float i = 0.025; i < 1.0; i += 0.05)
        for (float j = 0.025; j < 1.0; j += 0.05) {
            // Avoid zero values as log will be -infinity
            luminance = max(texture2D( u_input, vec2(i, j) ).r, 0.01);
            sum_lum += log(luminance);
        }
    float average_lum = exp(sum_lum / 400.0);

    gl_FragColor = vec4(vec3(average_lum), 1.0);
}
