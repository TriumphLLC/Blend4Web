#ifndef DEPTH_FETCH_GLSLF
#define DEPTH_FETCH_GLSLF

#include <std.glsl>

#var SHADOW_USAGE NO_SHADOWS
#var CAMERA_TYPE CAM_TYPE_PERSP

#if SHADOW_USAGE == SHADOW_CASTING
float depth_pack(in float depth_linear, in vec2 cam_range) {
    float near = cam_range.x;
    float far = cam_range.y;
# if CAMERA_TYPE == CAM_TYPE_PERSP
    return far * (1.0 - near / depth_linear) / (far - near);
# else
    return (depth_linear - near) / (far - near);
# endif  
}
#else
float depth_fetch(in sampler2D depth_tex, in vec2 coord, in vec2 cam_range) {

    float depth = GLSL_TEXTURE(depth_tex, coord).r;

    float near = cam_range.x;
    float far = cam_range.y;

    float depth_linear = 2.0 * near / (near + far - (2.0 * depth - 1.0) * (far - near));

    return depth_linear;
}
#endif

#endif