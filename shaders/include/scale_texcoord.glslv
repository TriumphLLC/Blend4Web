#ifndef SCALE_TEXCOORD_GLSLV
#define SCALE_TEXCOORD_GLSLV

vec2 scale_texcoord(vec2 texcoord, vec3 texture_scale) {
    // blender scales relative to (0.5, 0.5) point
    return (texcoord + 0.5) * texture_scale.xy - 0.5;
}

#endif