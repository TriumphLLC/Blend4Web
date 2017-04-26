#version GLSL_VERSION

#include <precision_statement.glslf>
#include <std.glsl>

#var BLUR_PASS_NUM BLUR_PASS_5

uniform sampler2D u_main;

#if BLUR_PASS_NUM >= BLUR_PASS_1
uniform sampler2D u_bloom_level_0;
#endif

#if BLUR_PASS_NUM >= BLUR_PASS_2
uniform sampler2D u_bloom_level_1;
#endif

#if BLUR_PASS_NUM >= BLUR_PASS_3
uniform sampler2D u_bloom_level_2;
#endif

#if BLUR_PASS_NUM >= BLUR_PASS_4
uniform sampler2D u_bloom_level_3;
#endif

#if BLUR_PASS_NUM >= BLUR_PASS_5
uniform sampler2D u_bloom_level_4;
#endif


/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec2 v_texcoord;
//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {
    vec4 inp_color = GLSL_TEXTURE(u_main, v_texcoord);
    vec4 bloom_color = vec4(0.0);
#if BLUR_PASS_NUM >= BLUR_PASS_1
    bloom_color += GLSL_TEXTURE(u_bloom_level_0, v_texcoord);
#endif
#if BLUR_PASS_NUM >= BLUR_PASS_2
    bloom_color += GLSL_TEXTURE(u_bloom_level_1, v_texcoord);
#endif
#if BLUR_PASS_NUM >= BLUR_PASS_3
    bloom_color += GLSL_TEXTURE(u_bloom_level_2, v_texcoord);
#endif
#if BLUR_PASS_NUM >= BLUR_PASS_4
    bloom_color += GLSL_TEXTURE(u_bloom_level_3, v_texcoord);
#endif
#if BLUR_PASS_NUM >= BLUR_PASS_5
    bloom_color += GLSL_TEXTURE(u_bloom_level_4, v_texcoord);
#endif

    GLSL_OUT_FRAG_COLOR = inp_color + bloom_color;
}
