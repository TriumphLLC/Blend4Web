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

// no shadows: full disabled shadows, certain subs without shadows (REFLECT/GLOW), 
// non-casting and/or non-receiving batches
#define NO_SHADOWS             1
// shadow casting: SHADOW_CAST subs
#define SHADOW_CASTING         2 
// shadow mask generation: DEPTH subs
#define SHADOW_MASK_GENERATION 3
// shadow mapping: MAIN_OPAQUE subs
#define SHADOW_MAPPING_OPAQUE  4
// shadow mapping: MAIN_BLEND/MAIN_XRAY subs
#define SHADOW_MAPPING_BLEND   5

// materials
#define SPECULAR_PHONG      1
#define SPECULAR_COOKTORR   2
#define SPECULAR_WARDISO    3
#define SPECULAR_BLINN      4
#define SPECULAR_TOON       5

#define DIFFUSE_LAMBERT     1
#define DIFFUSE_OREN_NAYAR  2
#define DIFFUSE_FRESNEL     3
#define DIFFUSE_MINNAERT    4
#define DIFFUSE_TOON        5

#define MAPPING_TYPE_TEXTURE 0.0
#define MAPPING_TYPE_POINT 1.0
#define MAPPING_TYPE_VECTOR 2.0
#define MAPPING_TYPE_NORMAL 3.0

// world textures
#define MIX 0
#define ADD 1
#define SUBTRACT 2
#define MULTIPLY 3
#define SCREEN 4
#define OVERLAY 5
#define DIFFERENCE 6
#define DIVIDE 7
#define DARKEN 8
#define LIGHTEN 9
#define HUE 10
#define SATURATION 11
#define VALUE 12
#define COLOR 13
#define SOFT_LIGHT 14
#define LINEAR_LIGHT 15

// reflections
#define REFL_NONE      0
#define REFL_MIRRORMAP 1
#define REFL_PLANE     2
#define REFL_CUBE      3

// fog types
#define INVERSE_QUADRATIC 0
#define LINEAR 1
#define QUADRATIC 2

// lamps
#define HEMI  1
#define SPOT  2
#define POINT 3
#define SUN   4
