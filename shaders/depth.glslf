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

/*============================================================================
                                  INCLUDES
============================================================================*/
#include <std_enums.glsl>
#include <precision_statement.glslf>

# if !SHADELESS || NODES && ALPHA || SHADOW_USAGE == SHADOW_MASK_GENERATION
#include <procedural.glslf>
# endif

#if NODES && ALPHA
#include <pack.glslf>
#include <fog.glslf>

#include <lighting.glslf>
# if CAUSTICS
#include <caustics.glslf>
# endif

#include <gamma.glslf>
#include <math.glslv>
#endif // NODES && ALPHA

//#extension GL_OES_standard_derivatives: enable

/*============================================================================
                                   UNIFORMS
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
uniform mat4 u_view_matrix_frag;
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
# else
uniform vec4 u_diffuse_color;
# endif
#endif // NODES && ALPHA

#if SHADOW_USAGE == SHADOW_MASK_GENERATION
# if PERSPECTIVE_SHADOW_CAST
uniform float u_perspective_cast_far_bound;
# endif
uniform vec4 u_pcf_blur_radii;
uniform vec4 u_csm_center_dists;
uniform PRECISION sampler2D u_shadow_map0;

# if CSM_SECTION1
uniform PRECISION sampler2D u_shadow_map1;
# endif

# if CSM_SECTION2
uniform PRECISION sampler2D u_shadow_map2;
# endif

# if CSM_SECTION3
uniform PRECISION sampler2D u_shadow_map3;
# endif
#endif // SHADOW_USAGE == SHADOW_MASK_GENERATION

// NOTE: impossible case, needed for shader validator
#if SHADOW_USAGE == SHADOW_MAPPING_OPAQUE
uniform sampler2D u_shadow_mask;
#endif

#if USE_NODE_B4W_REFRACTION
uniform sampler2D u_refractmap;
# if USE_REFRACTION
uniform PRECISION sampler2D u_scene_depth;
# endif
#endif

/*============================================================================
                                   VARYINGS
============================================================================*/

#if NODES && ALPHA
//varying vec3 v_eye_dir;
varying vec3 v_pos_world;

# if USE_NODE_MATERIAL || USE_NODE_MATERIAL_EXT || USE_NODE_GEOMETRY_NO || CAUSTICS || CALC_TBN_SPACE
varying vec3 v_normal;
# endif
# if CALC_TBN_SPACE
varying vec4 v_tangent;
# endif
#else
# if TEXTURE_COLOR
varying vec2 v_texcoord;
# endif
#endif // NODES && ALPHA

#if SHADOW_USAGE == SHADOW_MASK_GENERATION || NODES && ALPHA
varying vec4 v_pos_view;
#endif

#if SHADOW_USAGE == SHADOW_MASK_GENERATION
varying vec4 v_shadow_coord0;

# if CSM_SECTION1
varying vec4 v_shadow_coord1;
# endif

# if CSM_SECTION2
varying vec4 v_shadow_coord2;
# endif

# if CSM_SECTION3
varying vec4 v_shadow_coord3;
# endif
#endif

#if REFLECTION_TYPE == REFL_PLANE || USE_NODE_B4W_REFRACTION
varying vec3 v_tex_pos_clip;
#endif

#if NODES && ALPHA
# if USE_NODE_B4W_REFRACTION && USE_REFRACTION
varying float v_view_depth;
# endif
#endif

/*============================================================================
                                  INCLUDE
============================================================================*/

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
    float nout_shadow_factor;
    float nout_alpha;

    nodes_main(nin_eye_dir,
            nout_color,
            nout_specular_color,
            nout_normal,
            nout_shadow_factor,
            nout_alpha);

    float alpha = nout_alpha;
# else // NODES
#  if TEXTURE_COLOR
    float alpha = (texture2D(u_colormap0, v_texcoord)).a;
#  else
    float alpha = u_diffuse_color.a;
#  endif
# endif // NODES
    if (alpha < 0.5)
        discard;
#endif

#if SHADOW_USAGE == NO_SHADOWS || SHADOW_USAGE == SHADOW_CASTING
    gl_FragColor = vec4(1.0);
#elif SHADOW_USAGE == SHADOW_MASK_GENERATION
    gl_FragColor = vec4(shadow_visibility(v_pos_view.z), 1.0, 1.0, 1.0);
#endif

// NOTE: It's a hack for PC using Arch Linux and Intel graphic card with open source drivers
#if NODES && ALPHA
# if CALC_TBN_SPACE
    gl_FragColor.a += 0.00001 * v_tangent.r;
# endif
#endif

}
