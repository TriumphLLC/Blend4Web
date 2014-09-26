#export pack unpack_float unpack_vec2

// Encoding Floats to RGBA by Aras Pranckevičius
// http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/

float VALUE_255_PACK = 255.0;
float ZERO_VALUE_PACK = 0.0;
float UNITY_VALUE_PACK = 1.0;

// float -> vec4
vec4 pack(const in float value) {
    vec4 bit_shift = vec4(VALUE_255_PACK * VALUE_255_PACK * VALUE_255_PACK,
            VALUE_255_PACK * VALUE_255_PACK, VALUE_255_PACK, UNITY_VALUE_PACK);
    vec4 bit_mask = vec4(ZERO_VALUE_PACK, UNITY_VALUE_PACK / VALUE_255_PACK,
            UNITY_VALUE_PACK / VALUE_255_PACK, UNITY_VALUE_PACK / VALUE_255_PACK);
    vec4 res = fract(value * bit_shift);
    res -= res.xxyz * bit_mask;
    return res;
}

float unpack_float(const in vec4 rgba_depth) {
    float depth;
    vec4 bit_shift = vec4(UNITY_VALUE_PACK / (VALUE_255_PACK * VALUE_255_PACK
            * VALUE_255_PACK), UNITY_VALUE_PACK / (VALUE_255_PACK
            * VALUE_255_PACK), UNITY_VALUE_PACK / VALUE_255_PACK,
            UNITY_VALUE_PACK);
    depth = dot(rgba_depth, bit_shift);
    return depth;
}

// vec2 -> vec4
vec4 pack(const in vec2 vec) {
    vec2 bit_shift = vec2(VALUE_255_PACK, UNITY_VALUE_PACK);
    vec2 bit_mask = vec2(ZERO_VALUE_PACK, UNITY_VALUE_PACK/VALUE_255_PACK);

    vec4 res = fract(vec.xxyy * bit_shift.xyxy);
    res -= res.xxzz * bit_mask.xyxy;

    if (vec.r == UNITY_VALUE_PACK)
        res.rg = vec2(ZERO_VALUE_PACK, UNITY_VALUE_PACK);
    if (vec.g == UNITY_VALUE_PACK)
        res.ba = vec2(ZERO_VALUE_PACK, UNITY_VALUE_PACK);

    return res;
}

vec2 unpack_vec2(const in vec4 rgba_vec) {
    vec2 vec;
    vec2 bit_shift = vec2(UNITY_VALUE_PACK/VALUE_255_PACK, UNITY_VALUE_PACK);
    vec.r = dot(rgba_vec.rg, bit_shift);
    vec.g = dot(rgba_vec.ba, bit_shift);
    return vec;
}
