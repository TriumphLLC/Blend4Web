/*============================================================================
                                  INCLUDES
============================================================================*/
#include <precision_statement.glslf>

/*============================================================================
                                   VARYINGS
============================================================================*/

#if DYNAMIC_GRASS_SIZE
# if DYNAMIC_GRASS_COLOR
varying vec4 v_grass_params;
# else
varying float v_grass_params;
# endif
#else
# if DYNAMIC_GRASS_COLOR
varying vec3 v_grass_params;
# endif
#endif

/*============================================================================
                                    MAIN
============================================================================*/

void main(void) {
#if DYNAMIC_GRASS_SIZE
# if DYNAMIC_GRASS_COLOR
	gl_FragColor = v_grass_params;
# else
	gl_FragColor = vec4(v_grass_params, vec3(1.0));
# endif
#else
# if DYNAMIC_GRASS_COLOR
	gl_FragColor = vec4(1.0, v_grass_params);
# else
	// 1 scale, white color
	gl_FragColor = vec4(1.0);
# endif
#endif
    
}

