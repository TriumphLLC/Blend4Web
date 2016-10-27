#ifndef STD_ENUMS_GLSL
#define STD_ENUMS_GLSL

/*==============================================================================
                                    VARS
==============================================================================*/
#var CONSTANTS_HACK 0

/*============================================================================*/

// textures
#define TEXTURE_COORDS_NONE     0
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

#define POISSON_X_16           4
#define POISSON_X_8            2
#define POISSON_X_4            1
#define NO_SOFT_SHADOWS        0

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

// dof
#define DOF_SIMPLE  0
#define DOF_BOKEH   1

// coc
#define COC_ALL          0
#define COC_FOREGROUND   1
#define COC_COMBINE      2

// NOTE: keep node constants synchronized with:
//              src/nodemat.js : append_nmat_node
//              src/batch.js   : update_batch_material_nodes
//
// for vector transform
#define VT_WORLD_TO_WORLD    0
#define VT_WORLD_TO_OBJECT   1
#define VT_WORLD_TO_CAMERA   2
#define VT_OBJECT_TO_WORLD   3
#define VT_OBJECT_TO_OBJECT  4
#define VT_OBJECT_TO_CAMERA  5
#define VT_CAMERA_TO_WORLD   6
#define VT_CAMERA_TO_OBJECT  7
#define VT_CAMERA_TO_CAMERA  8

#define VT_POINT    0
#define VT_VECTOR   1
#define VT_NORMAL   2

// for normal map
#define NM_TANGENT         0
#define NM_OBJECT          1
#define NM_WORLD           2
#define NM_BLENDER_OBJECT  3
#define NM_BLENDER_WORLD   4

// billboard particles
#define BILLBOARD_ALIGN_VIEW 1
#define BILLBOARD_ALIGN_XY 2
#define BILLBOARD_ALIGN_YZ 3
#define BILLBOARD_ALIGN_ZX 4

// postprocessing effects
#define POST_EFFECT_NONE       1
#define POST_EFFECT_GRAYSCALE  2
#define POST_EFFECT_BLUR       3
#define POST_EFFECT_GLOW_BLUR  4
#define POST_EFFECT_DOF_BLUR   5
#define POST_EFFECT_ALPHA_BLUR 6
#define POST_EFFECT_EXTEND     7
#define FLIP_CUBEMAP_COORDS    8

// debug view modes
#define DV_NONE 0
#define DV_OPAQUE_WIREFRAME 1
#define DV_TRANSPARENT_WIREFRAME 2
#define DV_FRONT_BACK_VIEW 3
#define DV_BOUNDINGS 4
#define DV_CLUSTERS_VIEW 5
#define DV_BATCHES_VIEW 6
#define DV_RENDER_TIME 7

// SSAO quality
#define SSAO_QUALITY_8 1
#define SSAO_QUALITY_16 2
#define SSAO_QUALITY_24 3
#define SSAO_QUALITY_32 4

// AA stuff
#define AA_METHOD_FXAA_LIGHT 1
#define AA_METHOD_FXAA_QUALITY 2

#define AA_QUALITY_LOW 0
#define AA_QUALITY_MEDIUM 1
#define AA_QUALITY_HIGH 2

// SMAA pass
#define SMAA_RESOLVE 1
#define SMAA_EDGE_DETECTION 2
#define SMAA_BLENDING_WEIGHT_CALCULATION 3
#define SMAA_NEIGHBORHOOD_BLENDING 4

// SMAA antialiasing method
#define AA_METHOD_SMAA_LOW 1
#define AA_METHOD_SMAA_MEDIUM 2
#define AA_METHOD_SMAA_HIGH 3
#define AA_METHOD_SMAA_ULTRA 4

// REFLECTION_PASS type
#define REFL_PASS_NONE 0
#define REFL_PASS_PLANE 1
#define REFL_PASS_CUBE 2

// SRGB type
#define SRGB_NONE 0
#define SRGB_SIMPLE 1
#define SRGB_PROPER 2

#define M_PI 3.14159265359
#define M_PI_4 0.785398163
#define INV_PI 0.318309886

#define UP_VECTOR vec3(0.0, 0.0, 1.0)
#define RIGHT_VECTOR vec3(1.0, 0.0, 0.0)
#define TOWARD_VECTOR vec3(0.0, -1.0, 0.0)

// NOTE: "too many shader constants" hack for some mobile devices; 
// use glsl variables, defines don't work here

#if CONSTANTS_HACK
float _0_0 = 0.0;
float _0_5 = 0.5;
float _1_0 = 1.0;
float _255_0 = 255.0;
#else
#define _0_0 0.0
#define _0_5 0.5
#define _1_0 1.0
#define _255_0 255.0
#endif

#endif
