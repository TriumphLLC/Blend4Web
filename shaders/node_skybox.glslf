#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var USE_VIEW_TSR 0
#var USE_VIEW_TSR_INVERSE 0
#var USE_MODEL_TSR 0
#var USE_MODEL_TSR_INVERSE 0

#var NUM_VALUES 0
#var NUM_RGBS 0

/*==============================================================================
                                  INCLUDES
==============================================================================*/
#include <precision_statement.glslf>
#include <std.glsl>
#include <color_util.glslf>

/*==============================================================================
                                  UNIFORMS
==============================================================================*/
#if USE_NODE_VALUE
uniform float u_node_values[NUM_VALUES];
#endif

#if USE_NODE_RGB
uniform vec3 u_node_rgbs[NUM_RGBS];
#endif

#if USE_VIEW_TSR
uniform mat3 u_view_tsr_frag;
#endif

#if USE_VIEW_TSR_INVERSE
uniform mat3 u_view_tsr_inverse;
#endif

#if USE_MODEL_TSR
uniform mat3 u_model_tsr;
#endif

#if USE_MODEL_TSR_INVERSE
uniform mat3 u_model_tsr_inverse;
#endif

#if USE_NODE_CURVE_VEC || USE_NODE_CURVE_RGB || USE_NODE_VALTORGB
uniform sampler2D u_nodes_texture;
#endif

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec3 v_ray;
//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*==============================================================================
                                 NODE INCLUDES
==============================================================================*/
#include <nodes.glslf>

/*==============================================================================
                                    MAIN
==============================================================================*/
void main(void) {

#if USE_NODE_TEXTURE_ENVIRONMENT_EQUIRECTANGULAR || USE_NODE_TEXTURE_ENVIRONMENT_MIRROR_BALL \
        || USE_NODE_GEOMETRY_NO || USE_NODE_GEOMETRY_GL || USE_NODE_GEOMETRY_IN \
        || USE_NODE_TEX_COORD_GE || USE_NODE_TEX_COORD_OB || USE_NODE_TEX_COORD_NO \
        || USE_NODE_B4W_REFLECT_WORLD
    vec3 eye_dir = -normalize(v_ray);
#else
    vec3 eye_dir;
#endif
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

    nout_color = max(vec3(0.0), nout_color);
    lin_to_srgb(nout_color);

    GLSL_OUT_FRAG_COLOR = vec4(nout_color, _1_0);
}