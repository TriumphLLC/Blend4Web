#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var AA_METHOD AA_METHOD_FXAA_LIGHT
#var AA_QUALITY AA_QUALITY_LOW

/*============================================================================*/

#include <precision_statement.glslf>
#include <std.glsl>
#include <color_util.glslf>

uniform sampler2D u_color;
uniform vec2 u_texel_size;

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec2 v_texcoord;
//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*============================================================================*/

#if AA_METHOD == AA_METHOD_FXAA_LIGHT

# define FXAA_REDUCE_MIN (1.0/128.0)
# define FXAA_REDUCE_MUL (1.0/8.0)
# define FXAA_SPAN_MAX 8.0

vec4 get(float x, float y) {
    vec2 coord = v_texcoord + vec2(x,y) * u_texel_size;
    return GLSL_TEXTURE(u_color, coord);
}

vec4 fxaa_light() {
    vec4 rgbNW = get(-1.0,-1.0);
    vec4 rgbNE = get( 1.0,-1.0);
    vec4 rgbSW = get(-1.0, 1.0);
    vec4 rgbSE = get( 1.0, 1.0);
    vec4 rgbM  = get( 0.0, 0.0);

    float lumaM  = luma(rgbM);
    float lumaNW = luma(rgbNW);
    float lumaNE = luma(rgbNE);
    float lumaSW = luma(rgbSW);
    float lumaSE = luma(rgbSE);

    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

    vec2 dir;
    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));

    float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * 
            (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);

    float rcpDirMin = 1.0/(min(abs(dir.x), abs(dir.y)) + dirReduce);

    dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX), 
            max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX), dir * rcpDirMin)) * u_texel_size;
      
    vec4 rgbA = 0.5 * (
        GLSL_TEXTURE(u_color, v_texcoord + dir * (1.0/3.0 - 0.5)) +
        GLSL_TEXTURE(u_color, v_texcoord + dir * (2.0/3.0 - 0.5)));

    vec4 rgbB = rgbA * 0.5 + 0.25 * (
        GLSL_TEXTURE(u_color, v_texcoord + dir * -0.5) +
        GLSL_TEXTURE(u_color, v_texcoord + dir *  0.5));

    float lumaB = luma(rgbB);
    if ((lumaB < lumaMin) || (lumaB > lumaMax)) 
        return rgbA;
    else 
        return rgbB;
}

#elif AA_METHOD == AA_METHOD_FXAA_QUALITY

# define FXAA_GREEN_AS_LUMA 1
# include <fxaa.glslf>

# if AA_QUALITY == AA_QUALITY_HIGH
#  define FXAA_QUALITY_PRESET 39
#  define FXAA_QUALITY_SUBPIX 1.00
#  define FXAA_QUALITY_EDGE_THRESHOLD 0.063
#  define FXAA_QUALITY_EDGE_THRESHOLD_MIN 0.0312

# elif AA_QUALITY == AA_QUALITY_MEDIUM
#  define FXAA_QUALITY_PRESET 20
#  define FXAA_QUALITY_SUBPIX 0.65
#  define FXAA_QUALITY_EDGE_THRESHOLD 0.166
#  define FXAA_QUALITY_EDGE_THRESHOLD_MIN 0.0625

# elif AA_QUALITY == AA_QUALITY_LOW
#  define FXAA_QUALITY_PRESET 12
#  define FXAA_QUALITY_SUBPIX 0.50
#  define FXAA_QUALITY_EDGE_THRESHOLD 0.166
#  define FXAA_QUALITY_EDGE_THRESHOLD_MIN 0.0833

# endif // AA_QUALITY

#endif // AA_METHOD

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {
#if AA_METHOD == AA_METHOD_FXAA_LIGHT
    GLSL_OUT_FRAG_COLOR = fxaa_light();

#elif AA_METHOD == AA_METHOD_FXAA_QUALITY
    // NOTE: iPad hack
    vec2 vec2_tmp = u_texel_size;
    GLSL_OUT_FRAG_COLOR = FxaaPixelShader(
            v_texcoord,
            u_color,
            vec2_tmp,
            FXAA_QUALITY_SUBPIX,
            FXAA_QUALITY_EDGE_THRESHOLD,
            FXAA_QUALITY_EDGE_THRESHOLD_MIN);
#endif
}