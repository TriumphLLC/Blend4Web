#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var NUM_VALUES 0
#var NUM_RGBS 0

#var PRECISION highp

#var NUM_LAMP_LIGHTS 0
#var NUM_LIGHTS 0

#var PROCEDURAL_FOG 0
#var SKY_TEXTURE 0
#var NORMAL_TEXCOORD 0
#var USE_VIEW_MATRIX 0
#var USE_VIEW_MATRIX_INVERSE 0
#var USE_MODEL_MATRIX 0
#var USE_MODEL_MATRIX_INVERSE 0

#var ALPHA 0
#var ALPHA_CLIP 0

#var SOFT_STRENGTH 0.25

#var SOFT_PARTICLES 0
#var NODES 0
#var DISABLE_FOG 0
#var WATER_EFFECTS 0
#var USE_FOG 0
#var USE_ENVIRONMENT_LIGHT 0
#var SKY_COLOR 0
#var REFLECTION_TYPE REFL_NONE
#var TEXTURE_NORM_CO TEXTURE_COORDS_NONE
#var CALC_TBN_SPACE 0
#var USE_TBN_SHADING 0
#var TEXTURE_COLOR 0

/*==============================================================================
                                  INCLUDES
==============================================================================*/
#include <precision_statement.glslf>
#include <std.glsl>

#include <color_util.glslf>
#if SOFT_PARTICLES || NODES
#include <pack.glslf>
#endif

/*==============================================================================
                               GLOBAL UNIFORMS
==============================================================================*/

uniform float u_environment_energy;

#if NUM_LIGHTS > 0
// light_factors packed in the w componnets
uniform vec4 u_light_positions[NUM_LIGHTS];
uniform vec3 u_light_directions[NUM_LIGHTS];
uniform vec4 u_light_color_intensities[NUM_LIGHTS];
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

#if USE_ENVIRONMENT_LIGHT && SKY_TEXTURE
uniform samplerCube u_sky_texture;
#elif USE_ENVIRONMENT_LIGHT && SKY_COLOR
uniform vec3 u_horizon_color;
uniform vec3 u_zenith_color;
#endif

/*==============================================================================
                               MATERIAL UNIFORMS
==============================================================================*/

uniform float u_emit;
uniform float u_ambient;

uniform float u_time;
uniform vec3 u_camera_eye_frag;

#if USE_NODE_LAMP
uniform vec3 u_lamp_light_positions[NUM_LAMP_LIGHTS];
uniform vec3 u_lamp_light_directions[NUM_LAMP_LIGHTS];
uniform vec3 u_lamp_light_color_intensities[NUM_LAMP_LIGHTS];
#endif

#if USE_NODE_VALUE
uniform float u_node_values[NUM_VALUES];
#endif

#if USE_NODE_RGB
uniform vec3 u_node_rgbs[NUM_RGBS];
#endif

#if NORMAL_TEXCOORD || REFLECTION_TYPE == REFL_PLANE || USE_NODE_GEOMETRY_VW || USE_VIEW_MATRIX
uniform mat3 u_view_tsr_frag;
#endif

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

#if SOFT_PARTICLES
uniform PRECISION sampler2D u_scene_depth;
uniform float u_view_max_depth;
#endif

#if USE_NODE_CURVE_VEC || USE_NODE_CURVE_RGB || USE_NODE_VALTORGB
uniform sampler2D u_nodes_texture;
#endif

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
#if TEXTURE_NORM_CO != TEXTURE_COORDS_NONE || CALC_TBN_SPACE || USE_TBN_SHADING
GLSL_IN vec4 v_tangent;
#endif

#if SOFT_PARTICLES
GLSL_IN vec3 v_tex_pos_clip;
#endif

#if TEXTURE_COLOR || USE_NODE_TEX_COORD_UV || USE_NODE_UV_MERGED || USE_NODE_UVMAP \
        || USE_NODE_GEOMETRY_UV || USE_NODE_GEOMETRY_OR || USE_NODE_TEX_COORD_GE
GLSL_IN vec2 v_texcoord;
#endif

GLSL_IN vec3 v_pos_world;

#if SOFT_PARTICLES || !DISABLE_FOG || NODES
GLSL_IN vec4 v_pos_view;
#endif

GLSL_IN vec3 v_normal;
//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*==============================================================================
                                  FUNCTIONS
==============================================================================*/

#if !DISABLE_FOG
#include <fog.glslf>
#endif

#include <math.glslv>
#include <particles_nodes.glslf>


/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {

    vec3 eye_dir = normalize(u_camera_eye_frag - v_pos_world);
    vec3 nout_color;
    vec3 nout_specular_color;
    vec3 nout_normal;
    vec4 nout_shadow_factor;
    float nout_alpha;

    mat3 nin_view_tsr              = mat3(0.0);

    mat3 nin_view_tsr_inverse      = mat3(0.0);
    mat3 nin_model_tsr             = mat3(0.0);
    mat3 nin_model_tsr_inverse     = mat3(0.0);

#if REFLECTION_TYPE == REFL_PLANE || USE_NODE_GEOMETRY_VW
    nin_view_tsr = u_view_tsr_frag;
#endif

#if USE_VIEW_MATRIX_INVERSE
    nin_view_tsr_inverse = u_view_tsr_inverse;
#endif
#if USE_MODEL_MATRIX
    nin_model_tsr = u_model_tsr;
#endif
#if USE_MODEL_MATRIX_INVERSE
    nin_model_tsr_inverse = u_model_tsr_inverse;
#endif

    nodes_main(eye_dir,
            nin_view_tsr,
            nin_view_tsr_inverse,
            nin_model_tsr,
            nin_model_tsr_inverse,
            nout_color,
            nout_specular_color,
            nout_normal,
            nout_shadow_factor,
            nout_alpha);

    vec3 color = nout_color;
    float alpha = nout_alpha;

#if ALPHA
# if ALPHA_CLIP
    if (alpha < 0.5)
        discard;
    alpha = 1.0; // prevent blending with html content
# endif  // ALPHA CLIP
#else  // ALPHA
    alpha = 1.0;
#endif  // ALPHA

#if !DISABLE_FOG
    fog(color, length(v_pos_view), eye_dir, 1.0);
#endif

#if SOFT_PARTICLES
    float view_depth = -v_pos_view.z / u_view_max_depth;
    vec4 scene_depth_rgba = GLSL_TEXTURE_PROJ(u_scene_depth, v_tex_pos_clip);
    float scene_depth = unpack_float(scene_depth_rgba);
    float delta = scene_depth - view_depth;
    float depth_diff = u_view_max_depth / SOFT_STRENGTH * delta;
    alpha = alpha * min(depth_diff, 1.0);
#endif
    lin_to_srgb(color);
#if ALPHA && !ALPHA_CLIP 
    premultiply_alpha(color, alpha);
#endif
    GLSL_OUT_FRAG_COLOR = vec4(color, alpha);
}
