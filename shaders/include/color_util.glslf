#ifndef COLOR_UTIL_GLSLF
#define COLOR_UTIL_GLSLF

#define PREMULTIPLY_ALPHA 1

#var SRGB SRGB_NONE

#include <std.glsl>

void srgb_to_lin(inout float color)
{
#if SRGB == SRGB_SIMPLE
    color = pow(color, 2.2);
#elif SRGB == SRGB_PROPER
    if (color <= 0.04045)
        color = color / 12.92;
    else
        color = pow(color + 0.055/1.055, 2.4);
#endif
}

void lin_to_srgb(inout float color)
{
#if SRGB == SRGB_SIMPLE
    color = pow(color, 2.2);
#elif SRGB == SRGB_PROPER
    if (color <= 0.00031308)
        color = color * 12.92;
    else
        color = 1.055*pow(color, 1.0 / 2.4) - 0.055;
#endif
}

void srgb_to_lin(inout vec3 color)
{
#if SRGB == SRGB_SIMPLE
    color = pow(color, vec3(2.2));
#elif SRGB == SRGB_PROPER
    srgb_to_lin(color.r);
    srgb_to_lin(color.g);
    srgb_to_lin(color.b);
#endif
}

void lin_to_srgb(inout vec3 color)
{
#if SRGB == SRGB_SIMPLE
    color = pow(color, vec3(1.0 / 2.2));
#elif SRGB == SRGB_PROPER
    lin_to_srgb(color.r);
    lin_to_srgb(color.g);
    lin_to_srgb(color.b);
#endif
}

void premultiply_alpha(inout vec3 color, in float alpha)
{
#if PREMULTIPLY_ALPHA
    color = color * alpha;
#endif
}

float luma(vec4 color) {
    vec3 luma_coeff = vec3(0.299, 0.587, 0.114);
    float l = dot(color.rgb, luma_coeff);
    return l;
}

#endif
