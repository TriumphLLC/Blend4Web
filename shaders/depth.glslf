/*============================================================================
                                  INCLUDES
============================================================================*/
#include <std_enums.glsl>

#include <precision_statement.glslf>
#include <pack.glslf>

//#extension GL_OES_standard_derivatives: enable

/*============================================================================
                                   UNIFORMS
============================================================================*/

uniform vec4 u_diffuse_color;

#if TEXTURE_COLOR
uniform sampler2D u_sampler;
#endif

#if SHADOW_SRC != SHADOW_SRC_NONE
# if SHADOW_SRC != SHADOW_SRC_MASK
uniform vec4 u_pcf_blur_radii;
uniform vec4 u_csm_center_dists;
# endif
uniform sampler2D u_shadow_map0;

# if CSM_SECTION1
uniform sampler2D u_shadow_map1;
# endif

# if CSM_SECTION2
uniform sampler2D u_shadow_map2;
# endif

# if CSM_SECTION3
uniform sampler2D u_shadow_map3;
# endif

#if SHADOW_SRC == SHADOW_SRC_MASK
uniform sampler2D u_shadow_mask;
#endif

#endif

/*============================================================================
                                   VARYINGS
============================================================================*/

#if TEXTURE_COLOR
varying vec2 v_texcoord;
#endif

#if SHADOW_DST == SHADOW_DST_NONE
varying float v_vertex_z;
#endif

#if SHADOW_SRC != SHADOW_SRC_NONE
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

#if SHADOW_SRC == SHADOW_SRC_MASK
varying vec3 v_tex_pos_clip;
#endif

#if SHADOW_SRC != SHADOW_SRC_MASK && SHADOW_SRC != SHADOW_SRC_NONE
varying vec4 v_pos_view;
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


#if SHADOW_SRC == SHADOW_SRC_NONE   // SHADOW_CAST or just DEPTH
# if SHADOW_DST == SHADOW_DST_NONE
    gl_FragColor = pack(v_vertex_z);
# elif SHADOW_DST == SHADOW_DST_DEPTH
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
# elif SHADOW_DST == SHADOW_DST_MASK // DEPTH + SHADOW_RECEIVE
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
# endif

#elif SHADOW_DST == SHADOW_DST_MASK // DEPTH + SHADOW_RECEIVE
    gl_FragColor = vec4(shadow_visibility(v_pos_view.z), 1.0, 1.0, 1.0);
#endif
}

