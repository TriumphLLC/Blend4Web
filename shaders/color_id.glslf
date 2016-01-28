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

/*============================================================================
                                  INCLUDES
============================================================================*/
#include <precision_statement.glslf>
#include <std_enums.glsl>

#if NODES && ALPHA
#include <pack.glslf>

#include <procedural.glslf>
# if CAUSTICS
#include <caustics.glslf>
# endif

#include <color_util.glslf>
#include <math.glslv>
#endif // NODES && ALPHA

/*============================================================================
                               GLOBAL UNIFORMS
============================================================================*/

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

# if USE_NODE_B4W_VECTOR_VIEW || REFLECTION_TYPE == REFL_PLANE
uniform mat3 u_view_tsr_frag;
# endif

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

/*============================================================================
                                   UNIFORMS
============================================================================*/
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
#  if USE_REFRACTION
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
uniform vec4 u_lamp_light_factors[NUM_LAMP_LIGHTS];
# endif

# if USE_NODE_VALUE
uniform float u_node_values[NUM_VALUES];
# endif

# if USE_NODE_RGB
uniform vec3 u_node_rgbs[NUM_RGBS];
# endif
#endif // NODES && ALPHA

# if USE_OUTLINE
uniform float u_outline_intensity;
# endif

/*============================================================================
                                   VARYINGS
============================================================================*/
#if NODES && ALPHA
//varying vec3 v_eye_dir;
varying vec3 v_pos_world;
varying vec4 v_pos_view;

# if USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO || CAUSTICS || CALC_TBN_SPACE
varying vec3 v_normal;
# endif
# if CALC_TBN_SPACE
varying vec4 v_tangent;
# endif

# if REFLECTION_TYPE == REFL_PLANE || USE_NODE_B4W_REFRACTION
varying vec3 v_tex_pos_clip;
# endif

# if USE_NODE_B4W_REFRACTION && USE_REFRACTION
varying float v_view_depth;
# endif

// NOTE: impossible case, needed for shader validator
# if SHADOW_USAGE == SHADOW_MASK_GENERATION
varying vec4 v_shadow_coord0;
varying vec4 v_shadow_coord1;
varying vec4 v_shadow_coord2;
varying vec4 v_shadow_coord3;
uniform vec4 u_pcf_blur_radii;
uniform vec4 u_csm_center_dists;
uniform sampler2D u_shadow_map0;
uniform sampler2D u_shadow_map1;
uniform sampler2D u_shadow_map2;
uniform sampler2D u_shadow_map3;
uniform sampler2D u_shadow_mask;
# endif
#else // NODES && ALPHA

# if TEXTURE_COLOR
varying vec2 v_texcoord;
# endif

#endif // NODES && ALPHA


/*============================================================================
                                  FUNCTIONS
============================================================================*/
#if NODES && ALPHA
#include <shadow.glslf>
#include <mirror.glslf>
#include <environment.glslf>


#if USE_NODE_B4W_REFRACTION
# if USE_REFRACTION
# include <refraction.glslf>
# endif
#endif

#include <nodes.glslf>
#endif // NODES && ALPHA

/*============================================================================
                                    MAIN
============================================================================*/

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

#  if USE_NODE_B4W_VECTOR_VIEW || REFLECTION_TYPE == REFL_PLANE
    mat4 nin_view_matrix = tsr_to_mat4(u_view_tsr_frag);

    nodes_main(nin_eye_dir,
            nin_view_matrix,
            nout_color,
            nout_specular_color,
            nout_normal,
            nout_shadow_factor,
            nout_alpha);
#  else
    nodes_main(nin_eye_dir,
            mat4(0.0),
            nout_color,
            nout_specular_color,
            nout_normal,
            nout_shadow_factor,
            nout_alpha);
#  endif

    float alpha = nout_alpha;
# else // NODES
#  if TEXTURE_COLOR
    float alpha = (texture2D(u_sampler, v_texcoord)).a;
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

#if USE_OUTLINE
	gl_FragColor = vec4(1.0, 1.0, 1.0, u_outline_intensity);
#else
	gl_FragColor = vec4(u_color_id, 1.0);
#endif
}
