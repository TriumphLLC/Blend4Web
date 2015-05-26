// textures
#define TEXTURE_COORDS_UV_ORCO  1
#define TEXTURE_COORDS_NORMAL   2

#define TEXTURE_BLEND_TYPE_MIX      1
#define TEXTURE_BLEND_TYPE_MULTIPLY 2

// shadows
#define SHADOW_SRC_NONE     1
#define SHADOW_SRC_DEPTH    2
#define SHADOW_SRC_MASK     3

#define SHADOW_DST_NONE     1
#define SHADOW_DST_DEPTH    2
#define SHADOW_DST_MASK     3

// materials
#define SPECULAR_PHONG      1
#define SPECULAR_COOKTORR   2
#define SPECULAR_WARDISO    3

#define DIFFUSE_LAMBERT     1
#define DIFFUSE_OREN_NAYAR  2
#define DIFFUSE_FRESNEL     3

#define MAPPING_TYPE_TEXTURE 0.0
#define MAPPING_TYPE_POINT 1.0
#define MAPPING_TYPE_VECTOR 2.0
#define MAPPING_TYPE_NORMAL 3.0

// world textures
#define MTEX_BLEND 0
#define MTEX_ADD 1
#define MTEX_SUB 2
#define MTEX_MUL 3
#define MTEX_SCREEN 4
#define MTEX_OVERLAY 5
#define MTEX_DIFF 6
#define MTEX_DIV 7
#define MTEX_DARK 8
#define MTEX_LIGHT 9
#define MTEX_BLEND_HUE 10
#define MTEX_BLEND_SAT 11
#define MTEX_BLEND_VAL 12
#define MTEX_BLEND_COLOR 13
#define MTEX_SOFT_LIGHT 14
#define MTEX_LIN_LIGHT 15

// reflections
#define REFL_NONE      0
#define REFL_MIRRORMAP 1
#define REFL_PLANE     2
#define REFL_CUBE      3
