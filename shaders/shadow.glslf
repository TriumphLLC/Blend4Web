#version GLSL_VERSION

/*==============================================================================
                            VARS FOR THE COMPILER
==============================================================================*/
#var WATER_LEVEL 0.0
#var WAVES_HEIGHT 0.0
#var NUM_LAMP_LIGHTS 0
#var NUM_VALUES 0
#var NUM_RGBS 0

// node dirs
#var MAPPING_TRS_MATRIX mat4(0.0)
#var MAPPING_SCALE vec3(0.0)
#var MAPPING_TRANSLATION vec3(0.0)
#var MAPPING_MIN_CLIP vec3(0.0)
#var MAPPING_MAX_CLIP vec3(0.0)
#var MAPPING_IS_NORMAL 0.0
#var RGB_IND 0
#var VALUE_IND 0
#var LAMP_INDEX 0
// lamp dirs
#var NUM_LIGHTS 0
#var LAMP_IND 0
#var LAMP_SPOT_SIZE 0
#var LAMP_SPOT_BLEND 0
#var LAMP_LIGHT_DIST 0
#var LAMP_LIGHT_FACT_IND 0
#var LAMP_FAC_CHANNELS rgb
#var LAMP_SHADOW_MAP_IND 0
#var NUM_LFACTORS 0

/*==============================================================================
                                  INCLUDES
==============================================================================*/
#include <std_enums.glsl>
#include <precision_statement.glslf>

# if !SHADELESS || NODES && ALPHA || SHADOW_USAGE == SHADOW_MASK_GENERATION
#include <procedural.glslf>
# endif

#if NODES && ALPHA
#include <pack.glslf>

#include <color_util.glslf>
#include <math.glslv>

# if CAUSTICS
#include <caustics.glslf>
# endif

#endif // NODES && ALPHA

/*==============================================================================
                                   UNIFORMS
==============================================================================*/

#if NODES && ALPHA
uniform float u_time;

uniform float u_environment_energy;

# if NUM_LIGHTS > 0
uniform vec3 u_light_positions[NUM_LIGHTS];
uniform vec3 u_light_directions[NUM_LIGHTS];
uniform vec3 u_light_color_intensities[NUM_LIGHTS];
uniform vec4 u_light_factors[NUM_LFACTORS];
# endif

uniform vec3 u_camera_eye_frag;

# if REFLECTION_TYPE == REFL_PLANE || USE_NODE_GEOMETRY_VW
uniform mat3 u_view_tsr_frag;
# endif

# if USE_ZUP_VIEW_MATRIX
uniform mat3 u_view_zup_tsr;
# endif
# if USE_ZUP_VIEW_MATRIX_INVERSE
uniform mat3 u_view_zup_tsr_inverse;
# endif
# if USE_ZUP_MODEL_MATRIX
uniform mat3 u_model_zup_tsr;
# endif
# if USE_ZUP_MODEL_MATRIX_INVERSE
uniform mat3 u_model_zup_tsr_inverse;
# endif

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
uniform vec4 u_lamp_light_factors[NUM_LAMP_LIGHTS];
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
uniform vec4 u_pcf_blur_radii;
uniform vec4 u_csm_center_dists;
uniform PRECISION sampler2D u_shadow_map0;

# if CSM_SECTION1 || NUM_CAST_LAMPS > 1
uniform PRECISION sampler2D u_shadow_map1;
# endif

# if CSM_SECTION2 || NUM_CAST_LAMPS > 2
uniform PRECISION sampler2D u_shadow_map2;
# endif

# if CSM_SECTION3 || NUM_CAST_LAMPS > 3
uniform PRECISION sampler2D u_shadow_map3;
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
#include <mirror.glslf>
#include <environment.glslf>


# if USE_NODE_B4W_REFRACTION
#  if USE_REFRACTION
#include <refraction.glslf>
#  endif
# endif

#include <nodes.glslf>
#endif // NODES && ALPHA

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

    mat4 nin_view_matrix = mat4(0.0);
    mat4 nin_zup_view_matrix = mat4(0.0);
    mat4 nin_zup_view_matrix_inverse = mat4(0.0);
    mat4 nin_zup_model_matrix = mat4(0.0);
    mat4 nin_zup_model_matrix_inverse = mat4(0.0);

#  if REFLECTION_TYPE == REFL_PLANE || USE_NODE_GEOMETRY_VW
        nin_view_matrix = tsr_to_mat4(u_view_tsr_frag);
#  endif

#  if USE_ZUP_VIEW_MATRIX
        nin_zup_view_matrix = tsr_to_mat4(u_view_zup_tsr);
#  endif
#  if USE_ZUP_VIEW_MATRIX_INVERSE
        nin_zup_view_matrix_inverse = tsr_to_mat4(u_view_zup_tsr_inverse);
#  endif
#  if USE_ZUP_MODEL_MATRIX
        nin_zup_model_matrix = tsr_to_mat4(u_model_zup_tsr);
#  endif
#  if USE_ZUP_MODEL_MATRIX_INVERSE
        nin_zup_model_matrix_inverse = tsr_to_mat4(u_model_zup_tsr_inverse);
#  endif

    nodes_main(nin_eye_dir,
            nin_view_matrix,
            nin_zup_view_matrix,
            nin_zup_view_matrix_inverse,
            nin_zup_model_matrix,
            nin_zup_model_matrix_inverse,
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
