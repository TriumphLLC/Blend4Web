#var WATER_LEVEL 0.0
#var WAVES_HEIGHT 0.0
#var NUM_LAMP_LIGHTS 0
#var NUM_VALUES 0
#var NUM_RGBS 0

#var PARALLAX_STEPS 0.0
#var PARALLAX_LOD_DIST 0.0
#var WATER_LEVEL 0.0
#var WAVES_HEIGHT 0.0

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
#include <std_enums.glsl>

#include <precision_statement.glslf>
#include <pack.glslf>
#if !SHADELESS
#include <procedural.glslf>
# if CAUSTICS
#include <caustics.glslf>
# endif
#endif

#include <color_util.glslf>
#include <math.glslv>

/*============================================================================
                               GLOBAL UNIFORMS
============================================================================*/

uniform float u_time;

#if USE_ENVIRONMENT_LIGHT && SKY_TEXTURE
uniform samplerCube u_sky_texture;
#elif USE_ENVIRONMENT_LIGHT && SKY_COLOR
uniform vec3 u_horizon_color;
uniform vec3 u_zenith_color;
#endif

uniform float u_environment_energy;

#if !SHADELESS

# if NUM_LIGHTS > 0
uniform vec3 u_light_positions[NUM_LIGHTS];
uniform vec3 u_light_directions[NUM_LIGHTS];
uniform vec3 u_light_color_intensities[NUM_LIGHTS];
uniform vec4 u_light_factors[NUM_LFACTORS];
# endif

# if WATER_EFFECTS && CAUSTICS
uniform vec4 u_sun_quaternion;
# endif
#endif

uniform vec3 u_camera_eye_frag;

#if NORMAL_TEXCOORD || REFLECTION_TYPE == REFL_PLANE || USE_NODE_B4W_VECTOR_VIEW
uniform mat3 u_view_tsr_frag;
#endif

#if !DISABLE_FOG
uniform vec4 u_fog_color_density;
# if WATER_EFFECTS
uniform vec4 u_underwater_fog_color_density;
uniform float u_cam_water_depth;
# endif
# if PROCEDURAL_FOG
uniform mat4 u_cube_fog;
# endif
# if USE_FOG
uniform vec4 u_fog_params; // intensity, depth, start, height
# endif
#endif

#if WATER_EFFECTS || !DISABLE_FOG
uniform vec3 u_sun_intensity;
#endif

#if WATER_EFFECTS && CAUSTICS
uniform vec3 u_sun_direction;
#endif

/*============================================================================
                               SAMPLER UNIFORMS
============================================================================*/

#if REFLECTION_TYPE == REFL_PLANE
uniform sampler2D u_plane_reflection;
#elif REFLECTION_TYPE == REFL_CUBE
uniform samplerCube u_cube_reflection;
#elif REFLECTION_TYPE == REFL_MIRRORMAP
uniform samplerCube u_mirrormap;
#endif

#if SHADOW_USAGE == SHADOW_MAPPING_OPAQUE
uniform sampler2D u_shadow_mask;
#elif SHADOW_USAGE == SHADOW_MAPPING_BLEND
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
#endif

#if REFRACTIVE || USE_NODE_B4W_REFRACTION
uniform sampler2D u_refractmap;
#endif

#if USE_NODE_B4W_REFRACTION && USE_REFRACTION && REFRACTIVE && USE_REFRACTION_CORRECTION
uniform PRECISION sampler2D u_scene_depth;
#endif

/*============================================================================
                               MATERIAL UNIFORMS
============================================================================*/

uniform float u_emit;
uniform float u_ambient;
uniform vec4  u_fresnel_params;

#if REFLECTION_TYPE == REFL_PLANE || REFLECTION_TYPE == REFL_CUBE
#elif REFLECTION_TYPE == REFL_MIRRORMAP
uniform float u_mirror_factor;
#endif

#if REFLECTION_TYPE == REFL_PLANE
uniform vec4 u_refl_plane;
#endif

#if USE_NODE_LAMP
uniform vec3 u_lamp_light_positions[NUM_LAMP_LIGHTS];
uniform vec3 u_lamp_light_directions[NUM_LAMP_LIGHTS];
uniform vec3 u_lamp_light_color_intensities[NUM_LAMP_LIGHTS];
uniform vec4 u_lamp_light_factors[NUM_LAMP_LIGHTS];
#endif

#if USE_NODE_VALUE
uniform float u_node_values[NUM_VALUES];
#endif

#if USE_NODE_RGB
uniform vec3 u_node_rgbs[NUM_RGBS];
#endif

/*============================================================================
                                   VARYINGS
============================================================================*/

varying vec3 v_pos_world;

#if USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO \
        || CAUSTICS || CALC_TBN_SPACE || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND \
        || USE_NODE_TEX_COORD_NO
varying vec3 v_normal;
#endif

#if NODES || !DISABLE_FOG || (TEXTURE_NORM_CO && PARALLAX) || (WATER_EFFECTS && CAUSTICS) || SHADOW_USAGE == SHADOW_MASK_GENERATION || SHADOW_USAGE == SHADOW_MAPPING_BLEND
varying vec4 v_pos_view;
#endif

#if TEXTURE_NORM_CO || CALC_TBN_SPACE
varying vec4 v_tangent;
#endif

#if SHADOW_USAGE == SHADOW_MAPPING_BLEND
varying vec4 v_shadow_coord0;
# if CSM_SECTION1 || NUM_CAST_LAMPS > 1
varying vec4 v_shadow_coord1;
# endif
# if CSM_SECTION2 || NUM_CAST_LAMPS > 2
varying vec4 v_shadow_coord2;
# endif
# if CSM_SECTION3 || NUM_CAST_LAMPS > 3
varying vec4 v_shadow_coord3;
# endif
#endif

#if REFLECTION_TYPE == REFL_PLANE || SHADOW_USAGE == SHADOW_MAPPING_OPAQUE \
        || REFRACTIVE || USE_NODE_B4W_REFRACTION
varying vec3 v_tex_pos_clip;
#endif

#if REFRACTIVE && USE_NODE_B4W_REFRACTION
varying float v_view_depth;
#endif

/*============================================================================
                                  INCLUDES
============================================================================*/

#include <mirror.glslf>
#include <environment.glslf>

#if !SHADELESS
#include <shadow.glslf>
#endif

#if USE_NODE_B4W_REFRACTION && USE_REFRACTION
#include <refraction.glslf>
#endif

#include <nodes.glslf>

#if !DISABLE_FOG
#include <fog.glslf>
#endif

/*============================================================================
                                    MAIN
============================================================================*/

void main(void) {

#if NODES || !DISABLE_FOG || (TEXTURE_NORM_CO && PARALLAX) || (WATER_EFFECTS && CAUSTICS) || SHADOW_USAGE == SHADOW_MASK_GENERATION || SHADOW_USAGE == SHADOW_MAPPING_BLEND
    float view_dist = length(v_pos_view);
#endif

# if WATER_EFFECTS
    float dist_to_water = v_pos_world.y - WATER_LEVEL;
# endif

# if WATER_EFFECTS || !DISABLE_FOG || (CAUSTICS && WATER_EFFECTS)
    vec3 sun_color_intens = u_sun_intensity;
# endif

    vec3 eye_dir = normalize(u_camera_eye_frag - v_pos_world);
    vec3 nout_color;
    vec3 nout_specular_color;
    vec3 nout_normal;
    vec4 nout_shadow_factor;
    float nout_alpha;

#  if USE_NODE_B4W_VECTOR_VIEW || REFLECTION_TYPE == REFL_PLANE
    mat4 nin_view_matrix = tsr_to_mat4(u_view_tsr_frag);

    nodes_main(eye_dir,
            nin_view_matrix,
            nout_color,
            nout_specular_color,
            nout_normal,
            nout_shadow_factor,
            nout_alpha);
#  else
    nodes_main(eye_dir,
            mat4(0.0),
            nout_color,
            nout_specular_color,
            nout_normal,
            nout_shadow_factor,
            nout_alpha);
#  endif

    vec3 color = nout_color;
    float alpha = nout_alpha;
    vec3 normal = nout_normal;
    vec4 shadow_factor = nout_shadow_factor;

#if !SHADELESS
# if WATER_EFFECTS
#  if WETTABLE
    //darken slightly to simulate wet surface
    color = max(color - sqrt(0.01 * -min(dist_to_water, 0.0)), 0.5 * color);
#  endif
#  if CAUSTICS
    apply_caustics(color, dist_to_water, u_time, shadow_factor, normal,
                   u_sun_direction, sun_color_intens, u_sun_quaternion,
                   v_pos_world, view_dist);
#  endif  // CAUSTICS
# endif  //WATER_EFFECTS
#endif  //SHADELESS

#if ALPHA
# if ALPHA_CLIP
    if (alpha < 0.5)
        discard;
    alpha = 1.0; // prevent blending with html content
# endif  // ALPHA CLIP
#else  // ALPHA
# if !NODES_GLOW
    alpha = 1.0;
# endif
#endif  // ALPHA


#if !DISABLE_FOG
# if WATER_EFFECTS
    fog(color, length(v_pos_view), eye_dir, dist_to_water);
# else
    fog(color, length(v_pos_view), eye_dir, 1.0);
# endif
#endif

#if SSAO_ONLY && SHADOW_USAGE == SHADOW_MAPPING_OPAQUE
    vec2 visibility = texture2DProj(u_shadow_mask, v_tex_pos_clip).rg;
    float ssao = visibility.g;
    color = vec3(ssao);
#endif

    lin_to_srgb(color);
#if ALPHA && !ALPHA_CLIP || NODES_GLOW
    premultiply_alpha(color, alpha);
#endif
    gl_FragColor = vec4(color, alpha);
}
