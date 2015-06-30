#var PRECISION lowp

/*============================================================================
                                  INCLUDES
============================================================================*/
#include <std_enums.glsl>

#include <precision_statement.glslf>

//#extension GL_OES_standard_derivatives: enable

/*============================================================================
                                   UNIFORMS
============================================================================*/

uniform vec4 u_diffuse_color;

#if TEXTURE_COLOR
uniform sampler2D u_sampler;
#endif

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
#endif

// NOTE: impossible case, needed for shader validator
#if SHADOW_USAGE == SHADOW_MAPPING_OPAQUE
uniform sampler2D u_shadow_mask;
#endif

/*============================================================================
                                   VARYINGS
============================================================================*/

#if TEXTURE_COLOR
varying vec2 v_texcoord;
#endif

#if SHADOW_USAGE == SHADOW_MASK_GENERATION
varying vec4 v_pos_view;
varying vec4 v_shadow_coord0;

# if CSM_SECTION1
varying vec4 v_shadow_coord1;
# endif

# if CSM_SECTION2
varying vec4 v_shadow_coord2;
# endif

#if CSM_SECTION3
varying vec4 v_shadow_coord3;
# endif
#endif

// NOTE: impossible case, needed for shader validator
#if SHADOW_USAGE == SHADOW_MAPPING_OPAQUE
varying vec3 v_tex_pos_clip;
#endif

/*============================================================================
                                  INCLUDE
============================================================================*/

#if !SHADELESS
#include <procedural.glslf>
#include <shadow.glslf>
#endif

/*============================================================================
                                    MAIN
============================================================================*/

void main(void) {

#if ALPHA
# if TEXTURE_COLOR
    float alpha = (texture2D(u_sampler, v_texcoord)).a;
# else
    float alpha = u_diffuse_color.a;
# endif
    if (alpha < 0.5)
        discard;
#endif


#if SHADOW_USAGE == NO_SHADOWS || SHADOW_USAGE == SHADOW_CASTING
    gl_FragColor = vec4(1.0);
#elif SHADOW_USAGE == SHADOW_MASK_GENERATION
    gl_FragColor = vec4(shadow_visibility(v_pos_view.z), 1.0, 1.0, 1.0);
#endif
}

