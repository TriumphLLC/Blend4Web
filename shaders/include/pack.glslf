#export pack unpack_depth unpack_vec2

// Encoding Floats to RGBA by Aras Pranckevičius 
// http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/

// float -> vec4
vec4 pack(const in float depth) {
    const vec4 bit_shift = vec4(255.0*255.0*255.0, 255.0*255.0, 255.0, 1.0);
    const vec4 bit_mask = vec4(0.0, 1.0/255.0, 1.0/255.0, 1.0/255.0);
    vec4 res = fract(depth * bit_shift);
    res -= res.xxyz * bit_mask;
    return res;
}

float unpack_depth(const in vec4 rgba_depth) {
    float depth;
    const vec4 bit_shift = vec4(1.0/(255.0*255.0*255.0), 1.0/(255.0*255.0), 1.0/255.0, 1.0);
    depth = dot(rgba_depth, bit_shift);
    return depth;
}

// vec2 -> vec4
vec4 pack(const in vec2 vec) {
    const vec2 bit_shift = vec2(255.0, 1.0);
    const vec2 bit_mask = vec2(0.0, 1.0/255.0);

    vec4 res = fract(vec.xxyy * bit_shift.xyxy);
    res -= res.xxzz * bit_mask.xyxy;

    if (vec.r == 1.0)
        res.rg = vec2(0.0, 1.0);
    if (vec.g == 1.0)
        res.ba = vec2(0.0, 1.0);

    return res;
}

vec2 unpack_vec2(const in vec4 rgba_vec) {
    vec2 vec;
    const vec2 bit_shift = vec2(1.0/255.0, 1.0);
    vec.r = dot(rgba_vec.rg, bit_shift);
    vec.g = dot(rgba_vec.ba, bit_shift);
    return vec;
}
