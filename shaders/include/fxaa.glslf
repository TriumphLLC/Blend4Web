#ifndef FXAA_GLSLF
#define FXAA_GLSLF

/*==============================================================================
                                    VARS
==============================================================================*/
#var FXAA_BLEND4WEB 1
#var FXAA_QUALITY_P12 0.0

/*==============================================================================


                    NVIDIA FXAA 3.11 by TIMOTHY LOTTES


------------------------------------------------------------------------------
COPYRIGHT (C) 2010, 2011 NVIDIA CORPORATION. ALL RIGHTS RESERVED.
------------------------------------------------------------------------------
TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THIS SOFTWARE IS PROVIDED
*AS IS* AND NVIDIA AND ITS SUPPLIERS DISCLAIM ALL WARRANTIES, EITHER EXPRESS
OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. IN NO EVENT SHALL NVIDIA
OR ITS SUPPLIERS BE LIABLE FOR ANY SPECIAL, INCIDENTAL, INDIRECT, OR
CONSEQUENTIAL DAMAGES WHATSOEVER (INCLUDING, WITHOUT LIMITATION, DAMAGES FOR
LOSS OF BUSINESS PROFITS, BUSINESS INTERRUPTION, LOSS OF BUSINESS INFORMATION,
OR ANY OTHER PECUNIARY LOSS) ARISING OUT OF THE USE OF OR INABILITY TO USE
THIS SOFTWARE, EVEN IF NVIDIA HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH
DAMAGES.

------------------------------------------------------------------------------
                           INTEGRATION CHECKLIST
------------------------------------------------------------------------------
(1.)
In the shader source, setup defines for the desired configuration.
When providing multiple shaders (for different presets),
simply setup the defines differently in multiple files.
Example,

  #define FXAA_PC 1
  #define FXAA_HLSL_5 1
  #define FXAA_QUALITY_PRESET 12

Or,

  #define FXAA_360 1
  
Or,

  #define FXAA_PS3 1
  
Etc.

(2.)
Then include this file,

  #include "Fxaa3_11.h"

(3.)
Then call the FXAA pixel shader from within your desired shader.
Look at the FXAA Quality FxaaPixelShader() for docs on inputs.
As for FXAA 3.11 all inputs for all shaders are the same 
to enable easy porting between platforms.

  return FxaaPixelShader(...);

(4.)
Insure pass prior to FXAA outputs RGBL (see next section).
Or use,

  #define FXAA_GREEN_AS_LUMA 1

(5.)
Setup engine to provide the following constants
which are used in the FxaaPixelShader() inputs,

  vec2 fxaaQualityRcpFrame,
  float fxaaQualitySubpix,
  float fxaaQualityEdgeThreshold,
  float fxaaQualityEdgeThresholdMin

Look at the FXAA Quality FxaaPixelShader() for docs on inputs.

(6.)
Have FXAA vertex shader run as a full screen triangle,
and output "pos"
such that inputs in the pixel shader provide,

  // {xy} = center of pixel
  vec2 pos,

(7.)
Insure the texture sampler(s) used by FXAA are set to bilinear filtering.


------------------------------------------------------------------------------
                    INTEGRATION - RGBL AND COLORSPACE
------------------------------------------------------------------------------
FXAA3 requires RGBL as input unless the following is set, 

  #define FXAA_GREEN_AS_LUMA 1

In which case the engine uses green in place of luma,
and requires RGB input is in a non-linear colorspace.

RGB should be LDR (low dynamic range).
Specifically do FXAA after tonemapping.

RGB data as returned by a texture fetch can be non-linear,
or linear when FXAA_GREEN_AS_LUMA is not set.
Note an "sRGB format" texture counts as linear,
because the result of a texture fetch is linear data.
Regular "RGBA8" textures in the sRGB colorspace are non-linear.

If FXAA_GREEN_AS_LUMA is not set,
luma must be stored in the alpha channel prior to running FXAA.
This luma should be in a perceptual space (could be gamma 2.0).
Example pass before FXAA where output is gamma 2.0 encoded,

  color.rgb = ToneMap(color.rgb); // linear color output
  color.rgb = sqrt(color.rgb);    // gamma 2.0 color output
  return color;

To use FXAA,

  color.rgb = ToneMap(color.rgb);  // linear color output
  color.rgb = sqrt(color.rgb);     // gamma 2.0 color output
  color.a = dot(color.rgb, vec3(0.299, 0.587, 0.114)); // compute luma
  return color;

Another example where output is linear encoded,
say for instance writing to an sRGB formated render target,
where the render target does the conversion back to sRGB after blending,

  color.rgb = ToneMap(color.rgb); // linear color output
  return color;

To use FXAA,

  color.rgb = ToneMap(color.rgb); // linear color output
  color.a = sqrt(dot(color.rgb, vec3(0.299, 0.587, 0.114))); // compute luma
  return color;

Getting luma correct is required for the algorithm to work correctly.


------------------------------------------------------------------------------
                          BEING LINEARLY CORRECT?
------------------------------------------------------------------------------
Applying FXAA to a framebuffer with linear RGB color will look worse.
This is very counter intuitive, but happends to be true in this case.
The reason is because dithering artifacts will be more visiable 
in a linear colorspace.


------------------------------------------------------------------------------
                             COMPLEX INTEGRATION
------------------------------------------------------------------------------
Q. What if the engine is blending into RGB before wanting to run FXAA?

A. In the last opaque pass prior to FXAA,
   have the pass write out luma into alpha.
   Then blend into RGB only.
   FXAA should be able to run ok
   assuming the blending pass did not any add aliasing.
   This should be the common case for particles and common blending passes.

A. Or use FXAA_GREEN_AS_LUMA.

============================================================================*/

/*============================================================================

                             INTEGRATION KNOBS

============================================================================*/
//
// FXAA_PS3 and FXAA_360 choose the console algorithm (FXAA3 CONSOLE).
// FXAA_360_OPT is a prototype for the new optimized 360 version.
//
// 1 = Use API.
// 0 = Don't use API.
//
/*--------------------------------------------------------------------------*/
#ifndef FXAA_PS3
    #define FXAA_PS3 0
#endif
/*--------------------------------------------------------------------------*/
#ifndef FXAA_360
    #define FXAA_360 0
#endif
/*--------------------------------------------------------------------------*/
#ifndef FXAA_360_OPT
    #define FXAA_360_OPT 0
#endif
/*==========================================================================*/
#ifndef FXAA_PC
    //
    // FXAA Quality
    // The high quality PC algorithm.
    //
    #define FXAA_PC 0
#endif
/*--------------------------------------------------------------------------*/
#ifndef FXAA_PC_CONSOLE
    //
    // The console algorithm for PC is included
    // for developers targeting really low spec machines.
    // Likely better to just run FXAA_PC, and use a really low preset.
    //
    #define FXAA_PC_CONSOLE 0
#endif
/*--------------------------------------------------------------------------*/
#ifndef FXAA_GLSL_120
    #define FXAA_GLSL_120 0
#endif
/*--------------------------------------------------------------------------*/
#ifndef FXAA_GLSL_130
    #define FXAA_GLSL_130 0
#endif
/*--------------------------------------------------------------------------*/
#ifndef FXAA_HLSL_3
    #define FXAA_HLSL_3 0
#endif
/*--------------------------------------------------------------------------*/
#ifndef FXAA_HLSL_4
    #define FXAA_HLSL_4 0
#endif
/*--------------------------------------------------------------------------*/
#ifndef FXAA_HLSL_5
    #define FXAA_HLSL_5 0
#endif
/*==========================================================================*/
#ifndef FXAA_GREEN_AS_LUMA
    //
    // For those using non-linear color,
    // and either not able to get luma in alpha, or not wanting to,
    // this enables FXAA to run using green as a proxy for luma.
    // So with this enabled, no need to pack luma in alpha.
    //
    // This will turn off AA on anything which lacks some amount of green.
    // Pure red and blue or combination of only R and B, will get no AA.
    //
    // Might want to lower the settings for
    //    fxaaQualityEdgeThresholdMin
    // In order to insure AA does not get turned off on colors 
    // which contain a minor amount of green.
    //
    // 1 = On.
    // 0 = Off.
    //
    #define FXAA_GREEN_AS_LUMA 0
#endif
/*--------------------------------------------------------------------------*/
#ifndef FXAA_EARLY_EXIT
    //
    // Controls algorithm's early exit path.
    // On PS3 turning this ON adds 2 cycles to the shader.
    // On 360 turning this OFF adds 10ths of a millisecond to the shader.
    // Turning this off on console will result in a more blurry image.
    // So this defaults to on.
    //
    // 1 = On.
    // 0 = Off.
    //
    #define FXAA_EARLY_EXIT 1
#endif
/*--------------------------------------------------------------------------*/
#ifndef FXAA_DISCARD
    //
    // Only valid for PC OpenGL currently.
    // Probably will not work when FXAA_GREEN_AS_LUMA = 1.
    //
    // 1 = Use discard on pixels which don't need AA.
    //     For APIs which enable concurrent TEX+ROP from same surface.
    // 0 = Return unchanged color on pixels which don't need AA.
    //
    #define FXAA_DISCARD 0
#endif
/*--------------------------------------------------------------------------*/
#ifndef FXAA_FAST_PIXEL_OFFSET
    //
    // Used for GLSL 120 only.
    //
    // 1 = GL API supports fast pixel offsets
    // 0 = do not use fast pixel offsets
    //
    #ifdef GL_EXT_gpu_shader4
        #define FXAA_FAST_PIXEL_OFFSET 1
    #endif
    #ifdef GL_NV_gpu_shader5
        #define FXAA_FAST_PIXEL_OFFSET 1
    #endif
    #ifdef GL_ARB_gpu_shader5
        #define FXAA_FAST_PIXEL_OFFSET 1
    #endif
    #ifndef FXAA_FAST_PIXEL_OFFSET
        #define FXAA_FAST_PIXEL_OFFSET 0
    #endif
#endif
/*--------------------------------------------------------------------------*/
#ifndef FXAA_GATHER4_ALPHA
    //
    // 1 = API supports gather4 on alpha channel.
    // 0 = API does not support gather4 on alpha channel.
    //
    #if (FXAA_HLSL_5 == 1)
        #define FXAA_GATHER4_ALPHA 1
    #endif
    #ifdef GL_ARB_gpu_shader5
        #define FXAA_GATHER4_ALPHA 1
    #endif
    #ifdef GL_NV_gpu_shader5
        #define FXAA_GATHER4_ALPHA 1
    #endif
    #ifndef FXAA_GATHER4_ALPHA
        #define FXAA_GATHER4_ALPHA 0
    #endif
#endif

/*============================================================================
                      FXAA CONSOLE PS3 - TUNING KNOBS
============================================================================*/
#ifndef FXAA_CONSOLE_PS3_EDGE_SHARPNESS
    //
    // Consoles the sharpness of edges on PS3 only.
    // Non-PS3 tuning is done with shader input.
    //
    // Due to the PS3 being ALU bound,
    // there are only two safe values here: 4 and 8.
    // These options use the shaders ability to a free *|/ by 2|4|8.
    //
    // 8.0 is sharper
    // 4.0 is softer
    // 2.0 is really soft (good for vector graphics inputs)
    //
    #if 1
        #define FXAA_CONSOLE_PS3_EDGE_SHARPNESS 8.0
    #endif
    #if 0
        #define FXAA_CONSOLE_PS3_EDGE_SHARPNESS 4.0
    #endif
    #if 0
        #define FXAA_CONSOLE_PS3_EDGE_SHARPNESS 2.0
    #endif
#endif
/*--------------------------------------------------------------------------*/
#ifndef FXAA_CONSOLE_PS3_EDGE_THRESHOLD
    //
    // Only effects PS3.
    // Non-PS3 tuning is done with shader input.
    //
    // The minimum amount of local contrast required to apply algorithm.
    // The console setting has a different mapping than the quality setting.
    //
    // This only applies when FXAA_EARLY_EXIT is 1.
    //
    // Due to the PS3 being ALU bound,
    // there are only two safe values here: 0.25 and 0.125.
    // These options use the shaders ability to a free *|/ by 2|4|8.
    //
    // 0.125 leaves less aliasing, but is softer
    // 0.25 leaves more aliasing, and is sharper
    //
    #if 1
        #define FXAA_CONSOLE_PS3_EDGE_THRESHOLD 0.125
    #else
        #define FXAA_CONSOLE_PS3_EDGE_THRESHOLD 0.25
    #endif
#endif

/*============================================================================
                        FXAA QUALITY - TUNING KNOBS
------------------------------------------------------------------------------
NOTE the other tuning knobs are now in the shader function inputs!
============================================================================*/
#ifndef FXAA_QUALITY_PRESET
    //
    // Choose the quality preset.
    // This needs to be compiled into the shader as it effects code.
    // Best option to include multiple presets is to 
    // in each shader define the preset, then include this file.
    // 
    // OPTIONS
    // -----------------------------------------------------------------------
    // 10 to 15 - default medium dither (10=fastest, 15=highest quality)
    // 20 to 29 - less dither, more expensive (20=fastest, 29=highest quality)
    // 39       - no dither, very expensive 
    //
    // NOTES
    // -----------------------------------------------------------------------
    // 12 = slightly faster then FXAA 3.9 and higher edge quality (default)
    // 13 = about same speed as FXAA 3.9 and better than 12
    // 23 = closest to FXAA 3.9 visually and performance wise
    //  _ = the lowest digit is directly related to performance
    // _  = the highest digit is directly related to style
    // 
    #define FXAA_QUALITY_PRESET 12
#endif


/*============================================================================

                           FXAA QUALITY - PRESETS

============================================================================*/

/*============================================================================
                     FXAA QUALITY - MEDIUM DITHER PRESETS
============================================================================*/
#if (FXAA_QUALITY_PRESET == 10)
    #define FXAA_QUALITY_PS 3
    #define FXAA_QUALITY_P0 1.5
    #define FXAA_QUALITY_P1 3.0
    #define FXAA_QUALITY_P2 12.0
#endif
/*--------------------------------------------------------------------------*/
#if (FXAA_QUALITY_PRESET == 11)
    #define FXAA_QUALITY_PS 4
    #define FXAA_QUALITY_P0 1.0
    #define FXAA_QUALITY_P1 1.5
    #define FXAA_QUALITY_P2 3.0
    #define FXAA_QUALITY_P3 12.0
#endif
/*--------------------------------------------------------------------------*/
#if (FXAA_QUALITY_PRESET == 12)
    #define FXAA_QUALITY_PS 5
    #define FXAA_QUALITY_P0 1.0
    #define FXAA_QUALITY_P1 1.5
    #define FXAA_QUALITY_P2 2.0
    #define FXAA_QUALITY_P3 4.0
    #define FXAA_QUALITY_P4 12.0
#endif
/*--------------------------------------------------------------------------*/
#if (FXAA_QUALITY_PRESET == 13)
    #define FXAA_QUALITY_PS 6
    #define FXAA_QUALITY_P0 1.0
    #define FXAA_QUALITY_P1 1.5
    #define FXAA_QUALITY_P2 2.0
    #define FXAA_QUALITY_P3 2.0
    #define FXAA_QUALITY_P4 4.0
    #define FXAA_QUALITY_P5 12.0
#endif
/*--------------------------------------------------------------------------*/
#if (FXAA_QUALITY_PRESET == 14)
    #define FXAA_QUALITY_PS 7
    #define FXAA_QUALITY_P0 1.0
    #define FXAA_QUALITY_P1 1.5
    #define FXAA_QUALITY_P2 2.0
    #define FXAA_QUALITY_P3 2.0
    #define FXAA_QUALITY_P4 2.0
    #define FXAA_QUALITY_P5 4.0
    #define FXAA_QUALITY_P6 12.0
#endif
/*--------------------------------------------------------------------------*/
#if (FXAA_QUALITY_PRESET == 15)
    #define FXAA_QUALITY_PS 8
    #define FXAA_QUALITY_P0 1.0
    #define FXAA_QUALITY_P1 1.5
    #define FXAA_QUALITY_P2 2.0
    #define FXAA_QUALITY_P3 2.0
    #define FXAA_QUALITY_P4 2.0
    #define FXAA_QUALITY_P5 2.0
    #define FXAA_QUALITY_P6 4.0
    #define FXAA_QUALITY_P7 12.0
#endif

/*============================================================================
                     FXAA QUALITY - LOW DITHER PRESETS
============================================================================*/
#if (FXAA_QUALITY_PRESET == 20)
    #define FXAA_QUALITY_PS 3
    #define FXAA_QUALITY_P0 1.5
    #define FXAA_QUALITY_P1 2.0
    #define FXAA_QUALITY_P2 8.0
#endif
/*--------------------------------------------------------------------------*/
#if (FXAA_QUALITY_PRESET == 21)
    #define FXAA_QUALITY_PS 4
    #define FXAA_QUALITY_P0 1.0
    #define FXAA_QUALITY_P1 1.5
    #define FXAA_QUALITY_P2 2.0
    #define FXAA_QUALITY_P3 8.0
#endif
/*--------------------------------------------------------------------------*/
#if (FXAA_QUALITY_PRESET == 22)
    #define FXAA_QUALITY_PS 5
    #define FXAA_QUALITY_P0 1.0
    #define FXAA_QUALITY_P1 1.5
    #define FXAA_QUALITY_P2 2.0
    #define FXAA_QUALITY_P3 2.0
    #define FXAA_QUALITY_P4 8.0
#endif
/*--------------------------------------------------------------------------*/
#if (FXAA_QUALITY_PRESET == 23)
    #define FXAA_QUALITY_PS 6
    #define FXAA_QUALITY_P0 1.0
    #define FXAA_QUALITY_P1 1.5
    #define FXAA_QUALITY_P2 2.0
    #define FXAA_QUALITY_P3 2.0
    #define FXAA_QUALITY_P4 2.0
    #define FXAA_QUALITY_P5 8.0
#endif
/*--------------------------------------------------------------------------*/
#if (FXAA_QUALITY_PRESET == 24)
    #define FXAA_QUALITY_PS 7
    #define FXAA_QUALITY_P0 1.0
    #define FXAA_QUALITY_P1 1.5
    #define FXAA_QUALITY_P2 2.0
    #define FXAA_QUALITY_P3 2.0
    #define FXAA_QUALITY_P4 2.0
    #define FXAA_QUALITY_P5 3.0
    #define FXAA_QUALITY_P6 8.0
#endif
/*--------------------------------------------------------------------------*/
#if (FXAA_QUALITY_PRESET == 25)
    #define FXAA_QUALITY_PS 8
    #define FXAA_QUALITY_P0 1.0
    #define FXAA_QUALITY_P1 1.5
    #define FXAA_QUALITY_P2 2.0
    #define FXAA_QUALITY_P3 2.0
    #define FXAA_QUALITY_P4 2.0
    #define FXAA_QUALITY_P5 2.0
    #define FXAA_QUALITY_P6 4.0
    #define FXAA_QUALITY_P7 8.0
#endif
/*--------------------------------------------------------------------------*/
#if (FXAA_QUALITY_PRESET == 26)
    #define FXAA_QUALITY_PS 9
    #define FXAA_QUALITY_P0 1.0
    #define FXAA_QUALITY_P1 1.5
    #define FXAA_QUALITY_P2 2.0
    #define FXAA_QUALITY_P3 2.0
    #define FXAA_QUALITY_P4 2.0
    #define FXAA_QUALITY_P5 2.0
    #define FXAA_QUALITY_P6 2.0
    #define FXAA_QUALITY_P7 4.0
    #define FXAA_QUALITY_P8 8.0
#endif
/*--------------------------------------------------------------------------*/
#if (FXAA_QUALITY_PRESET == 27)
    #define FXAA_QUALITY_PS 10
    #define FXAA_QUALITY_P0 1.0
    #define FXAA_QUALITY_P1 1.5
    #define FXAA_QUALITY_P2 2.0
    #define FXAA_QUALITY_P3 2.0
    #define FXAA_QUALITY_P4 2.0
    #define FXAA_QUALITY_P5 2.0
    #define FXAA_QUALITY_P6 2.0
    #define FXAA_QUALITY_P7 2.0
    #define FXAA_QUALITY_P8 4.0
    #define FXAA_QUALITY_P9 8.0
#endif
/*--------------------------------------------------------------------------*/
#if (FXAA_QUALITY_PRESET == 28)
    #define FXAA_QUALITY_PS 11
    #define FXAA_QUALITY_P0 1.0
    #define FXAA_QUALITY_P1 1.5
    #define FXAA_QUALITY_P2 2.0
    #define FXAA_QUALITY_P3 2.0
    #define FXAA_QUALITY_P4 2.0
    #define FXAA_QUALITY_P5 2.0
    #define FXAA_QUALITY_P6 2.0
    #define FXAA_QUALITY_P7 2.0
    #define FXAA_QUALITY_P8 2.0
    #define FXAA_QUALITY_P9 4.0
    #define FXAA_QUALITY_P10 8.0
#endif
/*--------------------------------------------------------------------------*/
#if (FXAA_QUALITY_PRESET == 29)
    #define FXAA_QUALITY_PS 12
    #define FXAA_QUALITY_P0 1.0
    #define FXAA_QUALITY_P1 1.5
    #define FXAA_QUALITY_P2 2.0
    #define FXAA_QUALITY_P3 2.0
    #define FXAA_QUALITY_P4 2.0
    #define FXAA_QUALITY_P5 2.0
    #define FXAA_QUALITY_P6 2.0
    #define FXAA_QUALITY_P7 2.0
    #define FXAA_QUALITY_P8 2.0
    #define FXAA_QUALITY_P9 2.0
    #define FXAA_QUALITY_P10 4.0
    #define FXAA_QUALITY_P11 8.0
#endif

/*============================================================================
                     FXAA QUALITY - EXTREME QUALITY
============================================================================*/
#if (FXAA_QUALITY_PRESET == 39)
    #define FXAA_QUALITY_PS 12
    #define FXAA_QUALITY_P0 1.0
    #define FXAA_QUALITY_P1 1.0
    #define FXAA_QUALITY_P2 1.0
    #define FXAA_QUALITY_P3 1.0
    #define FXAA_QUALITY_P4 1.0
    #define FXAA_QUALITY_P5 1.5
    #define FXAA_QUALITY_P6 2.0
    #define FXAA_QUALITY_P7 2.0
    #define FXAA_QUALITY_P8 2.0
    #define FXAA_QUALITY_P9 2.0
    #define FXAA_QUALITY_P10 4.0
    #define FXAA_QUALITY_P11 8.0
#endif

// B4W begin
#include <color_util.glslf>
// B4W end

/*============================================================================

                                API PORTING

============================================================================*/

float FxaaSat(float x) {
    return clamp(x, 0.0, 1.0);
}

/*--------------------------------------------------------------------------*/
#if (FXAA_BLEND4WEB == 1)
    vec4 FxaaTexTop(sampler2D t, vec2 p) {
        return GLSL_TEXTURE(t, p);
    }

    vec4 FxaaTexOff(sampler2D t, vec2 p, vec2 o, vec2 r) {
        return GLSL_TEXTURE(t, p + (o * r));
    }
#endif

// B4W comment begin
// #if (FXAA_GLSL_120 == 1)
//     // Requires,
//     //  #version 120
//     // And at least,
//     //  #extension GL_EXT_gpu_shader4 : enable
//     //  (or set FXAA_FAST_PIXEL_OFFSET 1 to work like DX9)
//     #define FxaaTexTop(t, p) texture2DLod(t, p, 0.0)
//     #if (FXAA_FAST_PIXEL_OFFSET == 1)
//         #define FxaaTexOff(t, p, o, r) texture2DLodOffset(t, p, 0.0, o)
//     #else
//         #define FxaaTexOff(t, p, o, r) texture2DLod(t, p + (o * r), 0.0)
//     #endif
//     #if (FXAA_GATHER4_ALPHA == 1)
//         // use #extension GL_ARB_gpu_shader5 : enable
//         #define FxaaTexAlpha4(t, p) textureGather(t, p, 3)
//         #define FxaaTexOffAlpha4(t, p, o) textureGatherOffset(t, p, o, 3)
//         #define FxaaTexGreen4(t, p) textureGather(t, p, 1)
//         #define FxaaTexOffGreen4(t, p, o) textureGatherOffset(t, p, o, 1)
//     #endif
// #endif
// B4W comment end

/*============================================================================
                   GREEN AS LUMA OPTION SUPPORT FUNCTION
============================================================================*/
// #if (FXAA_GREEN_AS_LUMA == 0)
//     float luma(vec4 rgba) { return rgba.w; }
// #else
//     float luma(vec4 rgba) { return rgba.y; }
// #endif

// /*============================================================================

//                              FXAA3 QUALITY - PC

// ============================================================================*/
// /*--------------------------------------------------------------------------*/
vec4 FxaaPixelShader(
    //
    // Use noperspective interpolation here (turn off perspective interpolation).
    // {xy} = center of pixel
    vec2 pos,
    //
    // Input color texture.
    // {rgb_} = color in linear or perceptual color space
    // if (FXAA_GREEN_AS_LUMA == 0)
    //     {___a} = luma in perceptual color space (not linear)
    sampler2D tex,
    //
    // Only used on FXAA Quality.
    // This must be from a constant/uniform.
    // {x_} = 1.0/screenWidthInPixels
    // {_y} = 1.0/screenHeightInPixels
    vec2 fxaaQualityRcpFrame,
    //
    // Only used on FXAA Quality.
    // This used to be the FXAA_QUALITY__SUBPIX define.
    // It is here now to allow easier tuning.
    // Choose the amount of sub-pixel aliasing removal.
    // This can effect sharpness.
    //   1.00 - upper limit (softer)
    //   0.75 - default amount of filtering
    //   0.50 - lower limit (sharper, less sub-pixel aliasing removal)
    //   0.25 - almost off
    //   0.00 - completely off
    float fxaaQualitySubpix,
    //
    // Only used on FXAA Quality.
    // This used to be the FXAA_QUALITY__EDGE_THRESHOLD define.
    // It is here now to allow easier tuning.
    // The minimum amount of local contrast required to apply algorithm.
    //   0.333 - too little (faster)
    //   0.250 - low quality
    //   0.166 - default
    //   0.125 - high quality 
    //   0.063 - overkill (slower)
    float fxaaQualityEdgeThreshold,
    //
    // Only used on FXAA Quality.
    // This used to be the FXAA_QUALITY__EDGE_THRESHOLD_MIN define.
    // It is here now to allow easier tuning.
    // Trims the algorithm from processing darks.
    //   0.0833 - upper limit (default, the start of visible unfiltered edges)
    //   0.0625 - high quality (faster)
    //   0.0312 - visible limit (slower)
    // Special notes when using FXAA_GREEN_AS_LUMA,
    //   Likely want to set this to zero.
    //   As colors that are mostly not-green
    //   will appear very dark in the green channel!
    //   Tune by looking at mostly non-green content,
    //   then start at zero and increase until aliasing is a problem.
    float fxaaQualityEdgeThresholdMin
) {
/*--------------------------------------------------------------------------*/
    vec2 posM;
    posM.x = pos.x;
    posM.y = pos.y;
    #if (FXAA_GATHER4_ALPHA == 1)
        // B4W comment begin
        // #if (FXAA_DISCARD == 0)
        //     vec4 rgbyM = FxaaTexTop(tex, posM);
        //     #if (FXAA_GREEN_AS_LUMA == 0)
        //         #define lumaM rgbyM.w
        //     #else
        //         #define lumaM rgbyM.y
        //     #endif
        // #endif
        // #if (FXAA_GREEN_AS_LUMA == 0)
        //     vec4 luma4A = FxaaTexAlpha4(tex, posM);
        //     vec4 luma4B = FxaaTexOffAlpha4(tex, posM, vec2(-1, -1));
        // #else
        //     vec4 luma4A = FxaaTexGreen4(tex, posM);
        //     vec4 luma4B = FxaaTexOffGreen4(tex, posM, vec2(-1, -1));
        // #endif
        // #if (FXAA_DISCARD == 1)
        //     #define lumaM luma4A.w
        // #endif
        // #define lumaE luma4A.z
        // #define lumaS luma4A.x
        // #define lumaSE luma4A.y
        // #define lumaNW luma4B.w
        // #define lumaN luma4B.z
        // #define lumaW luma4B.x
        // B4W comment end
    #else
        vec4 rgbyM = FxaaTexTop(tex, posM);
        float lumaM = luma(rgbyM);
        float lumaS = luma(FxaaTexOff(tex, posM, vec2( 0, 1), fxaaQualityRcpFrame.xy));
        float lumaE = luma(FxaaTexOff(tex, posM, vec2( 1, 0), fxaaQualityRcpFrame.xy));
        float lumaN = luma(FxaaTexOff(tex, posM, vec2( 0,-1), fxaaQualityRcpFrame.xy));
        float lumaW = luma(FxaaTexOff(tex, posM, vec2(-1, 0), fxaaQualityRcpFrame.xy));
    #endif
/*--------------------------------------------------------------------------*/
    float maxSM = max(lumaS, lumaM);
    float minSM = min(lumaS, lumaM);
    float maxESM = max(lumaE, maxSM);
    float minESM = min(lumaE, minSM);
    float maxWN = max(lumaN, lumaW);
    float minWN = min(lumaN, lumaW);
    float rangeMax = max(maxWN, maxESM);
    float rangeMin = min(minWN, minESM);
    float rangeMaxScaled = rangeMax * fxaaQualityEdgeThreshold;
    float range = rangeMax - rangeMin;
    float rangeMaxClamped = max(fxaaQualityEdgeThresholdMin, rangeMaxScaled);
    bool earlyExit = range < rangeMaxClamped;
/*--------------------------------------------------------------------------*/
    if(earlyExit)
        return rgbyM;
/*--------------------------------------------------------------------------*/
    #if (FXAA_GATHER4_ALPHA == 0)
        float lumaNW = luma(FxaaTexOff(tex, posM, vec2(-1,-1), fxaaQualityRcpFrame.xy));
        float lumaSE = luma(FxaaTexOff(tex, posM, vec2( 1, 1), fxaaQualityRcpFrame.xy));
        float lumaNE = luma(FxaaTexOff(tex, posM, vec2( 1,-1), fxaaQualityRcpFrame.xy));
        float lumaSW = luma(FxaaTexOff(tex, posM, vec2(-1, 1), fxaaQualityRcpFrame.xy));
    #else
        // B4W comment begin
        // float lumaNE = luma(FxaaTexOff(tex, posM, vec2(1, -1), fxaaQualityRcpFrame.xy));
        // float lumaSW = luma(FxaaTexOff(tex, posM, vec2(-1, 1), fxaaQualityRcpFrame.xy));
        // B4W comment end
    #endif
/*--------------------------------------------------------------------------*/
    float lumaNS = lumaN + lumaS;
    float lumaWE = lumaW + lumaE;
    float subpixRcpRange = 1.0/range;
    float subpixNSWE = lumaNS + lumaWE;
    float edgeHorz1 = (-2.0 * lumaM) + lumaNS;
    float edgeVert1 = (-2.0 * lumaM) + lumaWE;
/*--------------------------------------------------------------------------*/
    float lumaNESE = lumaNE + lumaSE;
    float lumaNWNE = lumaNW + lumaNE;
    float edgeHorz2 = (-2.0 * lumaE) + lumaNESE;
    float edgeVert2 = (-2.0 * lumaN) + lumaNWNE;
/*--------------------------------------------------------------------------*/
    float lumaNWSW = lumaNW + lumaSW;
    float lumaSWSE = lumaSW + lumaSE;
    float edgeHorz4 = (abs(edgeHorz1) * 2.0) + abs(edgeHorz2);
    float edgeVert4 = (abs(edgeVert1) * 2.0) + abs(edgeVert2);
    float edgeHorz3 = (-2.0 * lumaW) + lumaNWSW;
    float edgeVert3 = (-2.0 * lumaS) + lumaSWSE;
    float edgeHorz = abs(edgeHorz3) + edgeHorz4;
    float edgeVert = abs(edgeVert3) + edgeVert4;
/*--------------------------------------------------------------------------*/
    float subpixNWSWNESE = lumaNWSW + lumaNESE;
    float lengthSign = fxaaQualityRcpFrame.x;
    bool horzSpan = edgeHorz >= edgeVert;
    float subpixA = subpixNSWE * 2.0 + subpixNWSWNESE;
/*--------------------------------------------------------------------------*/
    if(!horzSpan) lumaN = lumaW;
    if(!horzSpan) lumaS = lumaE;
    if(horzSpan) lengthSign = fxaaQualityRcpFrame.y;
    float subpixB = (subpixA * (1.0/12.0)) - lumaM;
/*--------------------------------------------------------------------------*/
    float gradientN = lumaN - lumaM;
    float gradientS = lumaS - lumaM;
    float lumaNN = lumaN + lumaM;
    float lumaSS = lumaS + lumaM;
    bool pairN = abs(gradientN) >= abs(gradientS);
    float gradient = max(abs(gradientN), abs(gradientS));
    if(pairN) lengthSign = -lengthSign;
    float subpixC = FxaaSat(abs(subpixB) * subpixRcpRange);
/*--------------------------------------------------------------------------*/
    vec2 posB;
    posB.x = posM.x;
    posB.y = posM.y;
    vec2 offNP;
    offNP.x = (!horzSpan) ? 0.0 : fxaaQualityRcpFrame.x;
    offNP.y = ( horzSpan) ? 0.0 : fxaaQualityRcpFrame.y;
    if(!horzSpan) posB.x += lengthSign * 0.5;
    if( horzSpan) posB.y += lengthSign * 0.5;
/*--------------------------------------------------------------------------*/
    vec2 posN;
    posN.x = posB.x - offNP.x * FXAA_QUALITY_P0;
    posN.y = posB.y - offNP.y * FXAA_QUALITY_P0;
    vec2 posP;
    posP.x = posB.x + offNP.x * FXAA_QUALITY_P0;
    posP.y = posB.y + offNP.y * FXAA_QUALITY_P0;
    float subpixD = ((-2.0)*subpixC) + 3.0;
    float lumaEndN = luma(FxaaTexTop(tex, posN));
    float subpixE = subpixC * subpixC;
    float lumaEndP = luma(FxaaTexTop(tex, posP));
/*--------------------------------------------------------------------------*/
    if(!pairN) lumaNN = lumaSS;
    float gradientScaled = gradient * 1.0/4.0;
    float lumaMM = lumaM - lumaNN * 0.5;
    float subpixF = subpixD * subpixE;
    bool lumaMLTZero = lumaMM < 0.0;
/*--------------------------------------------------------------------------*/
    lumaEndN -= lumaNN * 0.5;
    lumaEndP -= lumaNN * 0.5;
    bool doneN = abs(lumaEndN) >= gradientScaled;
    bool doneP = abs(lumaEndP) >= gradientScaled;
    if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P1;
    if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P1;
    bool doneNP = (!doneN) || (!doneP);
    if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P1;
    if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P1;
/*--------------------------------------------------------------------------*/
    if(doneNP) {
        if(!doneN) lumaEndN = luma(FxaaTexTop(tex, posN.xy));
        if(!doneP) lumaEndP = luma(FxaaTexTop(tex, posP.xy));
        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
        doneN = abs(lumaEndN) >= gradientScaled;
        doneP = abs(lumaEndP) >= gradientScaled;
        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P2;
        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P2;
        doneNP = (!doneN) || (!doneP);
        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P2;
        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P2;
/*--------------------------------------------------------------------------*/
        #if (FXAA_QUALITY_PS > 3)
        if(doneNP) {
            if(!doneN) lumaEndN = luma(FxaaTexTop(tex, posN.xy));
            if(!doneP) lumaEndP = luma(FxaaTexTop(tex, posP.xy));
            if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
            if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
            doneN = abs(lumaEndN) >= gradientScaled;
            doneP = abs(lumaEndP) >= gradientScaled;
            if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P3;
            if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P3;
            doneNP = (!doneN) || (!doneP);
            if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P3;
            if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P3;
/*--------------------------------------------------------------------------*/
            #if (FXAA_QUALITY_PS > 4)
            if(doneNP) {
                if(!doneN) lumaEndN = luma(FxaaTexTop(tex, posN.xy));
                if(!doneP) lumaEndP = luma(FxaaTexTop(tex, posP.xy));
                if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                doneN = abs(lumaEndN) >= gradientScaled;
                doneP = abs(lumaEndP) >= gradientScaled;
                if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P4;
                if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P4;
                doneNP = (!doneN) || (!doneP);
                if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P4;
                if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P4;
/*--------------------------------------------------------------------------*/
                #if (FXAA_QUALITY_PS > 5)
                if(doneNP) {
                    if(!doneN) lumaEndN = luma(FxaaTexTop(tex, posN.xy));
                    if(!doneP) lumaEndP = luma(FxaaTexTop(tex, posP.xy));
                    if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                    if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                    doneN = abs(lumaEndN) >= gradientScaled;
                    doneP = abs(lumaEndP) >= gradientScaled;
                    if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P5;
                    if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P5;
                    doneNP = (!doneN) || (!doneP);
                    if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P5;
                    if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P5;
/*--------------------------------------------------------------------------*/
                    #if (FXAA_QUALITY_PS > 6)
                    if(doneNP) {
                        if(!doneN) lumaEndN = luma(FxaaTexTop(tex, posN.xy));
                        if(!doneP) lumaEndP = luma(FxaaTexTop(tex, posP.xy));
                        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                        doneN = abs(lumaEndN) >= gradientScaled;
                        doneP = abs(lumaEndP) >= gradientScaled;
                        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P6;
                        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P6;
                        doneNP = (!doneN) || (!doneP);
                        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P6;
                        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P6;
/*--------------------------------------------------------------------------*/
                        #if (FXAA_QUALITY_PS > 7)
                        if(doneNP) {
                            if(!doneN) lumaEndN = luma(FxaaTexTop(tex, posN.xy));
                            if(!doneP) lumaEndP = luma(FxaaTexTop(tex, posP.xy));
                            if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                            if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                            doneN = abs(lumaEndN) >= gradientScaled;
                            doneP = abs(lumaEndP) >= gradientScaled;
                            if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P7;
                            if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P7;
                            doneNP = (!doneN) || (!doneP);
                            if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P7;
                            if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P7;
/*--------------------------------------------------------------------------*/
    #if (FXAA_QUALITY_PS > 8)
    if(doneNP) {
        if(!doneN) lumaEndN = luma(FxaaTexTop(tex, posN.xy));
        if(!doneP) lumaEndP = luma(FxaaTexTop(tex, posP.xy));
        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
        doneN = abs(lumaEndN) >= gradientScaled;
        doneP = abs(lumaEndP) >= gradientScaled;
        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P8;
        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P8;
        doneNP = (!doneN) || (!doneP);
        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P8;
        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P8;
/*--------------------------------------------------------------------------*/
        #if (FXAA_QUALITY_PS > 9)
        if(doneNP) {
            if(!doneN) lumaEndN = luma(FxaaTexTop(tex, posN.xy));
            if(!doneP) lumaEndP = luma(FxaaTexTop(tex, posP.xy));
            if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
            if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
            doneN = abs(lumaEndN) >= gradientScaled;
            doneP = abs(lumaEndP) >= gradientScaled;
            if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P9;
            if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P9;
            doneNP = (!doneN) || (!doneP);
            if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P9;
            if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P9;
/*--------------------------------------------------------------------------*/
            #if (FXAA_QUALITY_PS > 10)
            if(doneNP) {
                if(!doneN) lumaEndN = luma(FxaaTexTop(tex, posN.xy));
                if(!doneP) lumaEndP = luma(FxaaTexTop(tex, posP.xy));
                if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                doneN = abs(lumaEndN) >= gradientScaled;
                doneP = abs(lumaEndP) >= gradientScaled;
                if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P10;
                if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P10;
                doneNP = (!doneN) || (!doneP);
                if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P10;
                if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P10;
/*--------------------------------------------------------------------------*/
                #if (FXAA_QUALITY_PS > 11)
                if(doneNP) {
                    if(!doneN) lumaEndN = luma(FxaaTexTop(tex, posN.xy));
                    if(!doneP) lumaEndP = luma(FxaaTexTop(tex, posP.xy));
                    if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                    if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                    doneN = abs(lumaEndN) >= gradientScaled;
                    doneP = abs(lumaEndP) >= gradientScaled;
                    if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P11;
                    if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P11;
                    doneNP = (!doneN) || (!doneP);
                    if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P11;
                    if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P11;
/*--------------------------------------------------------------------------*/
                    #if (FXAA_QUALITY_PS > 12)
                    if(doneNP) {
                        if(!doneN) lumaEndN = luma(FxaaTexTop(tex, posN.xy));
                        if(!doneP) lumaEndP = luma(FxaaTexTop(tex, posP.xy));
                        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                        doneN = abs(lumaEndN) >= gradientScaled;
                        doneP = abs(lumaEndP) >= gradientScaled;
                        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P12;
                        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P12;
                        doneNP = (!doneN) || (!doneP);
                        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P12;
                        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P12;
/*--------------------------------------------------------------------------*/
                    }
                    #endif
/*--------------------------------------------------------------------------*/
                }
                #endif
/*--------------------------------------------------------------------------*/
            }
            #endif
/*--------------------------------------------------------------------------*/
        }
        #endif
/*--------------------------------------------------------------------------*/
    }
    #endif
/*--------------------------------------------------------------------------*/
                        }
                        #endif
/*--------------------------------------------------------------------------*/
                    }
                    #endif
/*--------------------------------------------------------------------------*/
                }
                #endif
/*--------------------------------------------------------------------------*/
            }
            #endif
/*--------------------------------------------------------------------------*/
        }
        #endif
/*--------------------------------------------------------------------------*/
    }
/*--------------------------------------------------------------------------*/
    float dstN = posM.x - posN.x;
    float dstP = posP.x - posM.x;
    if(!horzSpan) dstN = posM.y - posN.y;
    if(!horzSpan) dstP = posP.y - posM.y;
/*--------------------------------------------------------------------------*/
    bool goodSpanN = (lumaEndN < 0.0) != lumaMLTZero;
    float spanLength = (dstP + dstN);
    bool goodSpanP = (lumaEndP < 0.0) != lumaMLTZero;
    float spanLengthRcp = 1.0/spanLength;
/*--------------------------------------------------------------------------*/
    bool directionN = dstN < dstP;
    float dst = min(dstN, dstP);
    bool goodSpan = directionN ? goodSpanN : goodSpanP;
    float subpixG = subpixF * subpixF;
    float pixelOffset = (dst * (-spanLengthRcp)) + 0.5;
    float subpixH = subpixG * fxaaQualitySubpix;
/*--------------------------------------------------------------------------*/
    float pixelOffsetGood = goodSpan ? pixelOffset : 0.0;
    float pixelOffsetSubpix = max(pixelOffsetGood, subpixH);
    if(!horzSpan) posM.x += pixelOffsetSubpix * lengthSign;
    if( horzSpan) posM.y += pixelOffsetSubpix * lengthSign;
    #if (FXAA_DISCARD == 1) || (FXAA_BLEND4WEB == 1)
        return FxaaTexTop(tex, posM);
    #else
        return vec4(FxaaTexTop(tex, posM).xyz, lumaM);
    #endif
}
/*==========================================================================*/

#endif