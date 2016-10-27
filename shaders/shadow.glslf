#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var PRECISION highp

#var NODES 0
#var REFLECTION_TYPE REFL_NONE
#var USE_TBN_SHADING 0
#var SHADELESS 0

#var USE_VIEW_MATRIX_INVERSE 0
#var USE_MODEL_MATRIX_INVERSE 0
#var USE_VIEW_MATRIX 0
#var USE_MODEL_MATRIX 0
#var USE_ENVIRONMENT_LIGHT 0
#var SKY_TEXTURE 0
#var SKY_COLOR 0
#var CAUSTICS 0
#var USE_REFRACTION 0
#var CALC_TBN_SPACE 0

#var USE_REFRACTION_CORRECTION 0
#var CSM_SECTION1 0
#var CSM_SECTION2 0
#var CSM_SECTION3 0
#var NUM_LIGHTS 0
#var NUM_LAMP_LIGHTS 0
#var TEXTURE_BLEND_TYPE TEXTURE_BLEND_TYPE_MIX
#var NUM_VALUES 0
#var NUM_RGBS 0
#var NUM_CAST_LAMPS 0
#var TEXTURE_COLOR 0
#var ALPHA 0
#var SHADOW_USAGE NO_SHADOWS
#var POISSON_DISK_NUM NO_SOFT_SHADOWS

/*==============================================================================
                                  INCLUDES
==============================================================================*/
#include <precision_statement.glslf>
#include <std.glsl>

#if NODES && ALPHA
#include <math.glslv>
#endif

/*==============================================================================
                                   UNIFORMS
==============================================================================*/

#if NODES && ALPHA
uniform float u_time;

uniform float u_environment_energy;

# if NUM_LIGHTS > 0
// light_factors packed in the w componnets
uniform vec4 u_light_positions[NUM_LIGHTS];
uniform vec3 u_light_directions[NUM_LIGHTS];
uniform vec4 u_light_color_intensities[NUM_LIGHTS];
# endif

uniform vec3 u_camera_eye_frag;

# if REFLECTION_TYPE == REFL_PLANE || USE_NODE_GEOMETRY_VW || USE_VIEW_MATRIX
uniform mat3 u_view_tsr_frag;
# endif

#if USE_VIEW_MATRIX_INVERSE
uniform mat3 u_view_tsr_inverse;
#endif
#if USE_MODEL_MATRIX
// it's always dynamic object
uniform mat3 u_model_tsr;
#endif
#if USE_MODEL_MATRIX_INVERSE
uniform mat3 u_model_tsr_inverse;
#endif

# if USE_ENVIRONMENT_LIGHT && SKY_TEXTURE
uniform samplerCube u_sky_texture;
# elif USE_ENVIRONMENT_LIGHT && SKY_COLOR
uniform vec3 u_horizon_color;
uniform vec3 u_zenith_color;
# endif

# if REFLECTION_TYPE == REFL_PLANE
uniform sampler2D u_plane_reflection;
# elif REFLECTION_TYPE == REFL_CUBE
uniform samplerCube u_cube_reflection;
# elif REFLECTION_TYPE == REFL_MIRRORMAP
uniform samplerCube u_mirrormap;
# endif

uniform float u_emit;
uniform float u_ambient;
uniform vec4  u_fresnel_params;

# if REFLECTION_TYPE == REFL_MIRRORMAP
uniform float u_mirror_factor;
# elif REFLECTION_TYPE == REFL_PLANE
uniform vec4 u_refl_plane;
# endif

# if USE_NODE_LAMP
uniform vec3 u_lamp_light_positions[NUM_LAMP_LIGHTS];
uniform vec3 u_lamp_light_directions[NUM_LAMP_LIGHTS];
uniform vec3 u_lamp_light_color_intensities[NUM_LAMP_LIGHTS];
# endif

# if USE_NODE_VALUE
uniform float u_node_values[NUM_VALUES];
# endif

# if USE_NODE_RGB
uniform vec3 u_node_rgbs[NUM_RGBS];
# endif

#else
# if TEXTURE_COLOR
uniform sampler2D u_colormap0;
uniform float u_alpha_factor;
# endif
uniform vec4 u_diffuse_color;

#endif // NODES && ALPHA

#if SHADOW_USAGE == SHADOW_MASK_GENERATION
# if POISSON_DISK_NUM != NO_SOFT_SHADOWS
uniform vec4 u_pcf_blur_radii;
# endif
uniform vec4 u_csm_center_dists;
uniform PRECISION GLSL_SMPLR2D_SHDW u_shadow_map0;

# if CSM_SECTION1 || NUM_CAST_LAMPS > 1
uniform PRECISION GLSL_SMPLR2D_SHDW u_shadow_map1;
# endif

# if CSM_SECTION2 || NUM_CAST_LAMPS > 2
uniform PRECISION GLSL_SMPLR2D_SHDW u_shadow_map2;
# endif

# if CSM_SECTION3 || NUM_CAST_LAMPS > 3
uniform PRECISION GLSL_SMPLR2D_SHDW u_shadow_map3;
# endif
#endif // SHADOW_USAGE == SHADOW_MASK_GENERATION

// NOTE: impossible case, needed for shader validator
#if SHADOW_USAGE == SHADOW_MAPPING_OPAQUE
uniform sampler2D u_shadow_mask;
#endif

#if USE_NODE_B4W_REFRACTION
uniform sampler2D u_refractmap;
# if USE_REFRACTION && USE_REFRACTION_CORRECTION
uniform PRECISION sampler2D u_scene_depth;
# endif
#endif

#if USE_NODE_CURVE_VEC || USE_NODE_CURVE_RGB || USE_NODE_VALTORGB
uniform sampler2D u_nodes_texture;
#endif

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
#if NODES && ALPHA
//GLSL_IN vec3 v_eye_dir;
GLSL_IN vec3 v_pos_world;

# if USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO || USE_NODE_NORMAL_MAP \
        || CAUSTICS || CALC_TBN_SPACE
GLSL_IN vec3 v_normal;
# endif
# if CALC_TBN_SPACE
GLSL_IN vec4 v_tangent;
# endif
#else
# if TEXTURE_COLOR
GLSL_IN vec2 v_texcoord;
# endif
#endif // NODES && ALPHA

#if SHADOW_USAGE == SHADOW_MASK_GENERATION || NODES && ALPHA
GLSL_IN vec4 v_pos_view;
#endif

#if SHADOW_USAGE == SHADOW_MASK_GENERATION
GLSL_IN vec4 v_shadow_coord0;

# if CSM_SECTION1 || NUM_CAST_LAMPS > 1
GLSL_IN vec4 v_shadow_coord1;
# endif

# if CSM_SECTION2 || NUM_CAST_LAMPS > 2
GLSL_IN vec4 v_shadow_coord2;
# endif

# if CSM_SECTION3 || NUM_CAST_LAMPS > 3
GLSL_IN vec4 v_shadow_coord3;
# endif
#endif

#if REFLECTION_TYPE == REFL_PLANE || USE_NODE_B4W_REFRACTION
GLSL_IN vec3 v_tex_pos_clip;
#endif

#if NODES && ALPHA
# if USE_NODE_B4W_REFRACTION && USE_REFRACTION
GLSL_IN float v_view_depth;
# endif
#endif

#if USE_TBN_SHADING
GLSL_IN vec3 v_shade_tang;
#endif
//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*==============================================================================
                                  INCLUDE
==============================================================================*/

#if !SHADELESS || NODES && ALPHA || SHADOW_USAGE == SHADOW_MASK_GENERATION
#include <shadow.glslf>
#endif

#if NODES && ALPHA
#include <nodes.glslf>
#endif

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {

#if ALPHA
# if NODES
    vec3 eye_dir = u_camera_eye_frag - v_pos_world;
    vec3 nin_eye_dir = normalize(eye_dir);
    vec3 nout_color;
    vec3 nout_specular_color;
    vec3 nout_normal;
    vec4 nout_shadow_factor;
    float nout_alpha;

    mat3 nin_view_tsr              = mat3(0.0);
    mat3 nin_view_tsr_inverse      = mat3(0.0);
    mat3 nin_model_tsr             = mat3(0.0);
    mat3 nin_model_tsr_inverse     = mat3(0.0);


#  if REFLECTION_TYPE == REFL_PLANE || USE_NODE_GEOMETRY_VW || USE_VIEW_MATRIX
        nin_view_tsr = u_view_tsr_frag;
#  endif

#  if USE_VIEW_MATRIX_INVERSE
    nin_view_tsr_inverse = u_view_tsr_inverse;
#  endif
#  if USE_MODEL_MATRIX
    nin_model_tsr = u_model_tsr;
#  endif
#  if USE_MODEL_MATRIX_INVERSE
    nin_model_tsr_inverse = u_model_tsr_inverse;
#  endif

    nodes_main(nin_eye_dir,
            nin_view_tsr,
            nin_view_tsr_inverse,
            nin_model_tsr,
            nin_model_tsr_inverse,
            nout_color,
            nout_specular_color,
            nout_normal,
            nout_shadow_factor,
            nout_alpha);

    float alpha = nout_alpha;
# else // NODES
#  if TEXTURE_COLOR
    float alpha = (GLSL_TEXTURE(u_colormap0, v_texcoord)).a;
#   if TEXTURE_BLEND_TYPE == TEXTURE_BLEND_TYPE_MIX
    float texture_alpha = u_alpha_factor * alpha;
    texture_alpha += (1.0 - step(0.0, texture_alpha));
    alpha = mix(texture_alpha, 1.0, u_diffuse_color.a);
#   endif
#  else
    float alpha = u_diffuse_color.a;
#  endif
# endif // NODES
    if (alpha < 0.5)
        discard;
#endif

#if SHADOW_USAGE == NO_SHADOWS || SHADOW_USAGE == SHADOW_CASTING
    GLSL_OUT_FRAG_COLOR = vec4(1.0);
#elif SHADOW_USAGE == SHADOW_MASK_GENERATION
    GLSL_OUT_FRAG_COLOR = shadow_visibility(v_pos_view.z);
#endif

// NOTE: It's a hack for PC using Arch Linux and Intel graphic card with open source drivers
#if NODES && ALPHA
# if CALC_TBN_SPACE
    GLSL_OUT_FRAG_COLOR.a *= clamp(v_tangent.r, 0.999999999, 1.0);
# endif
#endif

}
