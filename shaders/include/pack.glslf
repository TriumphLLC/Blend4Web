#export pack_depth unpack_depth

// Encoding Floats to RGBA by Aras Pranckevičius 
// http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/

vec4 pack_depth(const in float depth) {
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

