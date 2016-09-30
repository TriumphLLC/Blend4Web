#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var DYNAMIC_GRASS_SIZE 0
#var DYNAMIC_GRASS_COLOR 0

/*==============================================================================
                                  INCLUDES
==============================================================================*/
#include <precision_statement.glslf>
#include <std.glsl>

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
#if DYNAMIC_GRASS_SIZE
# if DYNAMIC_GRASS_COLOR
GLSL_IN vec4 v_grass_params;
# else
GLSL_IN float v_grass_params;
# endif
#else
# if DYNAMIC_GRASS_COLOR
GLSL_IN vec3 v_grass_params;
# endif
#endif
//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {
#if DYNAMIC_GRASS_SIZE
# if DYNAMIC_GRASS_COLOR
    GLSL_OUT_FRAG_COLOR = v_grass_params;
# else
    GLSL_OUT_FRAG_COLOR = vec4(v_grass_params, vec3(1.0));
# endif
#else
# if DYNAMIC_GRASS_COLOR
    GLSL_OUT_FRAG_COLOR = vec4(1.0, v_grass_params);
# else
    // 1 scale, white color
    GLSL_OUT_FRAG_COLOR = vec4(1.0);
# endif
#endif
    
}

