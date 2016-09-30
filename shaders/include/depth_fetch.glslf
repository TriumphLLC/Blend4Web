#ifndef DEPTH_FETCH_GLSLF
#define DEPTH_FETCH_GLSLF

float depth_fetch(in sampler2D depth_tex, in vec2 coord, in vec2 cam_range) {

    float depth = GLSL_TEXTURE(depth_tex, coord).r;

    float near = cam_range.x;
    float far = cam_range.y;

    //float depth_linear = 2.0 * near / (near + far - depth * (far - near));
    float depth_linear = 2.0 * near / (near + far - (2.0 * depth - 1.0) * (far - near));

    return depth_linear;
}

#endif