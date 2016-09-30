#ifndef PACK_GLSLF
#define PACK_GLSLF

// Encoding Floats to RGBA by Aras Pranckevičius
// http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/

// float -> vec4
vec4 pack(const in float value) {
    vec4 bit_shift = vec4(_255_0 * _255_0 * _255_0,
            _255_0 * _255_0, _255_0, _1_0);
    vec4 bit_mask = vec4(_0_0, _1_0 / _255_0,
            _1_0 / _255_0, _1_0 / _255_0);
    vec4 res = fract(value * bit_shift);
    res -= res.xxyz * bit_mask;
    return res;
}

float unpack_float(const in vec4 rgba_depth) {
    float depth;
    vec4 bit_shift = vec4(_1_0 / (_255_0 * _255_0
            * _255_0), _1_0 / (_255_0
            * _255_0), _1_0 / _255_0,
            _1_0);
    depth = dot(rgba_depth, bit_shift);
    return depth;
}

// vec2 -> vec4
vec4 pack(const in vec2 vec) {
    vec2 bit_shift = vec2(_255_0, _1_0);
    vec2 bit_mask = vec2(_0_0, _1_0/_255_0);

    vec4 res = fract(vec.xxyy * bit_shift.xyxy);
    res -= res.xxzz * bit_mask.xyxy;

    if (vec.r == _1_0)
        res.rg = vec2(_0_0, _1_0);
    if (vec.g == _1_0)
        res.ba = vec2(_0_0, _1_0);

    return res;
}

vec2 unpack_vec2(const in vec4 rgba_vec) {
    vec2 vec;
    vec2 bit_shift = vec2(_1_0/_255_0, _1_0);
    vec.r = dot(rgba_vec.rg, bit_shift);
    vec.g = dot(rgba_vec.ba, bit_shift);
    return vec;
}

#endif
