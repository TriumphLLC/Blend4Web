#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var PRECISION highp

#var NODES 0
#var USE_TBN_SHADING 0

#var ALPHA 0
#var ALPHA_CLIP 0
#var TEXTURE_COLOR 0
#var SHADOW_USAGE NO_SHADOWS
#var USE_OUTLINE 0

#var USE_VIEW_TSR 0
#var USE_VIEW_TSR_INVERSE 0
#var USE_MODEL_TSR 0
#var USE_MODEL_TSR_INVERSE 0
#var CALC_TBN_SPACE 0
#var CAMERA_TYPE CAM_TYPE_PERSP
#var USE_POSITION_CLIP 0

#var USE_REFRACTION 0
#var USE_REFRACTION_CORRECTION 0
#var USE_ENVIRONMENT_LIGHT 0
#var TEXTURE_BLEND_TYPE TEXTURE_BLEND_TYPE_MIX
#var NUM_LIGHTS 0
#var NUM_LAMP_LIGHTS 0
#var SKY_TEXTURE 0
#var SKY_COLOR 0
#var NUM_VALUES 0
#var NUM_RGBS 0
#var REFLECTION_TYPE REFL_NONE
#var POISSON_DISK_NUM NO_SOFT_SHADOWS
#var USE_DERIVATIVES_EXT 0

#var USE_LOD_SMOOTHING 0

# if GLSL1 && USE_DERIVATIVES_EXT
#extension GL_OES_standard_derivatives: enable
# endif

/*==============================================================================
                                  INCLUDES
==============================================================================*/
#include <precision_statement.glslf>
#include <std.glsl>

#if NODES && ALPHA
#include <math.glslv>
#endif

#if USE_LOD_SMOOTHING
#include <coverage.glslf>
#endif

/*==============================================================================
                               GLOBAL UNIFORMS
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

#if (USE_NODE_FRESNEL || USE_NODE_LAYER_WEIGHT) && CAMERA_TYPE == CAM_TYPE_ORTHO
uniform vec3 u_camera_direction;
#endif

# if REFLECTION_TYPE == REFL_PLANE || USE_VIEW_TSR
uniform mat3 u_view_tsr_frag;
# endif

#if USE_VIEW_TSR_INVERSE
uniform mat3 u_view_tsr_inverse;
#endif
#if USE_MODEL_TSR
// it's always dynamic object
uniform mat3 u_model_tsr;
#endif
#if USE_MODEL_TSR_INVERSE
uniform mat3 u_model_tsr_inverse;
#endif

# if USE_ENVIRONMENT_LIGHT && SKY_TEXTURE
uniform samplerCube u_sky_texture;
# elif USE_ENVIRONMENT_LIGHT && SKY_COLOR
uniform vec3 u_horizon_color;
uniform vec3 u_zenith_color;
# endif
#else // NODES && ALPHA
uniform vec4 u_diffuse_color;
# if TEXTURE_COLOR
uniform sampler2D u_sampler;
uniform float u_alpha_factor;
# endif
#endif // NODES && ALPHA

#if !USE_OUTLINE
uniform vec3 u_color_id;
#endif

#if USE_NODE_CURVE_VEC || USE_NODE_CURVE_RGB || USE_NODE_VALTORGB
uniform sampler2D u_nodes_texture;
#endif

/*==============================================================================
                                   UNIFORMS
==============================================================================*/
#if NODES && ALPHA
# if REFLECTION_TYPE == REFL_PLANE
uniform sampler2D u_plane_reflection;
# elif REFLECTION_TYPE == REFL_CUBE
uniform samplerCube u_cube_reflection;
# elif REFLECTION_TYPE == REFL_MIRRORMAP
uniform samplerCube u_mirrormap;
# endif

# if USE_NODE_B4W_REFRACTION
uniform sampler2D u_refractmap;
#  if USE_REFRACTION && USE_REFRACTION_CORRECTION
uniform PRECISION sampler2D u_scene_depth;
#  endif
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
# if SHADOW_USAGE == SHADOW_MASK_GENERATION
#  if POISSON_DISK_NUM != NO_SOFT_SHADOWS
uniform vec4 u_pcf_blur_radii;
#  endif
uniform vec4 u_csm_center_dists;
uniform PRECISION GLSL_SMPLR2D_SHDW u_shadow_map0;
uniform PRECISION GLSL_SMPLR2D_SHDW u_shadow_map1;
uniform PRECISION GLSL_SMPLR2D_SHDW u_shadow_map2;
uniform PRECISION GLSL_SMPLR2D_SHDW u_shadow_map3;
uniform sampler2D u_shadow_mask;
# endif
#endif // NODES && ALPHA

# if USE_OUTLINE
uniform float u_outline_intensity;
# endif

#if USE_NODE_OBJECT_INFO
uniform vec3 u_obj_info;
#endif

#if USE_LOD_SMOOTHING
uniform float u_lod_coverage;
uniform float u_lod_cmp_logic;
#endif



/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
#if NODES && ALPHA
GLSL_IN vec3 v_pos_world;
GLSL_IN vec4 v_pos_view;
GLSL_IN vec3 v_normal;

# if CALC_TBN_SPACE
GLSL_IN vec4 v_tangent;
# endif

#if REFLECTION_TYPE == REFL_PLANE || USE_POSITION_CLIP
GLSL_IN vec3 v_tex_pos_clip;
# endif

# if USE_NODE_B4W_REFRACTION && USE_REFRACTION
GLSL_IN float v_view_depth;
# endif

// NOTE: impossible case, needed for shader validator
# if SHADOW_USAGE == SHADOW_MASK_GENERATION
GLSL_IN vec4 v_shadow_coord0;
GLSL_IN vec4 v_shadow_coord1;
GLSL_IN vec4 v_shadow_coord2;
GLSL_IN vec4 v_shadow_coord3;
# endif
#else // NODES && ALPHA

# if TEXTURE_COLOR
GLSL_IN vec2 v_texcoord;
# endif
#endif // NODES && ALPHA

#if USE_TBN_SHADING
GLSL_IN vec3 v_shade_tang;
#endif
//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*==============================================================================
                                  FUNCTIONS
==============================================================================*/
#if NODES && ALPHA
#include <nodes.glslf>
#endif

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {

#if ALPHA
# if NODES
    vec3 eye_dir = normalize(u_camera_eye_frag - v_pos_world);
    vec3 nout_color;
    vec3 nout_specular_color;
    vec3 nout_normal;
    vec4 nout_shadow_factor;
    float nout_alpha;

    nodes_main(eye_dir,
            nout_color,
            nout_specular_color,
            nout_normal,
            nout_shadow_factor,
            nout_alpha);

    float alpha = nout_alpha;
# else // NODES
#  if TEXTURE_COLOR
    float alpha = (GLSL_TEXTURE(u_sampler, v_texcoord)).a;
#   if TEXTURE_BLEND_TYPE == TEXTURE_BLEND_TYPE_MIX
    float texture_alpha = u_alpha_factor * alpha;
    texture_alpha += (1.0 - step(0.0, texture_alpha));
    alpha = mix(texture_alpha, 1.0, u_diffuse_color.a);
#   endif
#  else
    float alpha = u_diffuse_color.a;
#  endif
# endif // NODES
# if ALPHA_CLIP
    if (alpha < 0.5)
        discard;
    alpha = 1.0;
# endif
#endif

#if USE_LOD_SMOOTHING
    if (!coverage_is_frag_visible(u_lod_coverage, u_lod_cmp_logic))
        discard;
#endif

#if USE_OUTLINE
    GLSL_OUT_FRAG_COLOR = vec4(1.0, 1.0, 1.0, u_outline_intensity);
#else
    GLSL_OUT_FRAG_COLOR = vec4(u_color_id, 1.0);
#endif
}
