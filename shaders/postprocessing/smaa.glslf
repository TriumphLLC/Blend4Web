#version GLSL_VERSION

/**
 * Copyright (C) 2013 Jorge Jimenez (jorge@iryoku.com)
 * Copyright (C) 2013 Jose I. Echevarria (joseignacioechevarria@gmail.com)
 * Copyright (C) 2013 Belen Masia (bmasia@unizar.es)
 * Copyright (C) 2013 Fernando Navarro (fernandn@microsoft.com)
 * Copyright (C) 2013 Diego Gutierrez (diegog@unizar.es)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to
 * do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software. As clarification, there
 * is no requirement that the copyright notice and permission be included in
 * binary distributions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/*==============================================================================
                                    VARS
==============================================================================*/
#var SMAA_PASS SMAA_RESOLVE
#var SMAA_REPROJECTION 0
#var SMAA_PREDICATION 0
#var AA_METHOD AA_METHOD_SMAA_LOW

/*============================================================================*/

#include <precision_statement.glslf>
#include <std.glsl>
#include <pack.glslf>

uniform sampler2D u_color;

#if SMAA_PASS == SMAA_RESOLVE
uniform sampler2D u_color_prev;
#endif

#if SMAA_PASS == SMAA_NEIGHBORHOOD_BLENDING
uniform sampler2D u_blend;
#endif

#if SMAA_REPROJECTION
uniform sampler2D u_velocity_tex;
#endif

#if SMAA_PASS == SMAA_EDGE_DETECTION && SMAA_PREDICATION
uniform sampler2D u_predication_tex;
#endif

#if SMAA_PASS == SMAA_BLENDING_WEIGHT_CALCULATION
uniform sampler2D u_search_tex;
uniform sampler2D u_area_tex;
uniform vec4 u_subsample_indices;
#endif

uniform vec2 u_texel_size;

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec2 v_texcoord;

#if SMAA_PASS == SMAA_NEIGHBORHOOD_BLENDING
GLSL_IN vec4 v_offset;
#else
GLSL_IN vec4 v_offset_0;
GLSL_IN vec4 v_offset_1;
GLSL_IN vec4 v_offset_2;
#endif

#if SMAA_PASS == SMAA_BLENDING_WEIGHT_CALCULATION
GLSL_IN vec2 v_pixcoord;
#endif
//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*============================================================================*/

/**
 *                  _______  ___  ___       ___           ___
 *                 /       ||   \/   |     /   \         /   \
 *                |   (---- |  \  /  |    /  ^  \       /  ^  \
 *                 \   \    |  |\/|  |   /  /_\  \     /  /_\  \
 *              ----)   |   |  |  |  |  /  _____  \   /  _____  \
 *             |_______/    |__|  |__| /__/     \__\ /__/     \__\
 * 
 *                               E N H A N C E D
 *       S U B P I X E L   M O R P H O L O G I C A L   A N T I A L I A S I N G
 *
 *                         http://www.iryoku.com/smaa/
 *
 * Hi, welcome aboard!
 * 
 * Here you'll find instructions to get the shader up and running as fast as
 * possible.
 *
 * IMPORTANTE NOTICE: when updating, remember to update both this file and the
 * precomputed textures! They may change from version to version.
 *
 * The shader has three passes, chained together as follows:
 *
 *                           |input|------------------·
 *                              v                     |
 *                    [ SMAA*EdgeDetection ]          |
 *                              v                     |
 *                          |edges_tex|               |
 *                              v                     |
 *              [ SMAABlendingWeightCalculation ]     |
 *                              v                     |
 *                          |blend_tex|               |
 *                              v                     |
 *                [ SMAANeighborhoodBlending ] <------·
 *                              v
 *                           |output|
 *
 * Note that each [pass] has its own vertex and pixel shader. Remember to use
 * oversized triangles instead of quads to avoid overshading along the
 * diagonal.
 *
 * You've three edge detection methods to choose from: luma, color or depth.
 * They represent different quality/performance and anti-aliasing/sharpness
 * tradeoffs, so our recommendation is for you to choose the one that best
 * suits your particular scenario:
 *
 * - Depth edge detection is usually the fastest but it may miss some edges.
 *
 * - Luma edge detection is usually more expensive than depth edge detection,
 *   but catches visible edges that depth edge detection can miss.
 *
 * - Color edge detection is usually the most expensive one but catches
 *   chroma-only edges.
 *
 * For quickstarters: just use luma edge detection.
 *
 * The general advice is to not rush the integration process and ensure each
 * step is done correctly (don't try to integrate SMAA T2x with predicated edge
 * detection from the start!). Ok then, let's go!
 *
 *  1. The first step is to create two RGBA temporal render targets for holding
 *     |edges_tex| and |blend_tex|.
 *
 *     In DX10 or DX11, you can use a RG render target for the edges texture.
 *     In the case of NVIDIA GPUs, using RG render targets seems to actually be
 *     slower.
 *
 *     On the Xbox 360, you can use the same render target for resolving both
 *     |edges_tex| and |blend_tex|, as they aren't needed simultaneously.
 *
 *  2. Both temporal render targets |edges_tex| and |blend_tex| must be cleared
 *     each frame. Do not forget to clear the alpha channel!
 *
 *  3. The next step is loading the two supporting precalculated textures,
 *     'area_tex' and 'search_tex'. You'll find them in the 'Textures' folder as
 *     C++ headers, and also as regular DDS files. They'll be needed for the
 *     'SMAABlendingWeightCalculation' pass.
 *
 *     If you use the C++ headers, be sure to load them in the format specified
 *     inside of them.
 *
 *     You can also compress 'area_tex' and 'search_tex' using BC5 and BC4
 *     respectively, if you have that option in your content processor pipeline.
 *     When compressing then, you get a non-perceptible quality decrease, and a
 *     marginal performance increase.
 *
 *  4. All samplers must be set to linear filtering and clamp.
 *
 *     After you get the technique working, remember that 64-bit inputs have
 *     half-rate linear filtering on GCN.
 *
 *     If SMAA is applied to 64-bit color buffers, switching to point filtering
 *     when accesing them will increase the performance. Search for
 *     'SMAASamplePoint' to see which textures may benefit from point
 *     filtering, and where (which is basically the color input in the edge
 *     detection and resolve passes).
 *
 *  5. All texture reads and buffer writes must be non-sRGB, with the exception
 *     of the input read and the output write in
 *     'SMAANeighborhoodBlending' (and only in this pass!). If sRGB reads in
 *     this last pass are not possible, the technique will work anyway, but
 *     will perform antialiasing in gamma space.
 *
 *     IMPORTANT: for best results the input read for the color/luma edge 
 *     detection should *NOT* be sRGB.
 *
 *  6. Before including SMAA.h you'll have to setup the render target metrics,
 *     the target and any optional configuration defines. Optionally you can
 *     use a preset.
 *
 *     You have the following targets available: 
 *         SMAA_HLSL_3
 *         SMAA_HLSL_4
 *         SMAA_HLSL_4_1
 *         SMAA_GLSL_3 *
 *         SMAA_GLSL_4 *
 *
 *         * (See SMAA_INCLUDE_VS and SMAA_INCLUDE_PS below).
 *
 *     And four presets:
 *         SMAA_PRESET_LOW          (%60 of the quality)
 *         SMAA_PRESET_MEDIUM       (%80 of the quality)
 *         SMAA_PRESET_HIGH         (%95 of the quality)
 *         SMAA_PRESET_ULTRA        (%99 of the quality)
 *
 *     For example:
 *         #define SMAA_RT_METRICS float4(1.0 / 1280.0, 1.0 / 720.0, 1280.0, 720.0)
 *         #define SMAA_HLSL_4
 *         #define SMAA_PRESET_HIGH
 *         #include "SMAA.h"
 *
 *     Note that SMAA_RT_METRICS doesn't need to be a macro, it can be a
 *     uniform variable. The code is designed to minimize the impact of not
 *     using a constant value, but it is still better to hardcode it.
 *
 *     Depending on how you encoded 'area_tex' and 'search_tex', you may have to
 *     add (and customize) the following defines before including SMAA.h:
 *          #define SMAA_AREATEX_SELECT(sample) sample.rg
 *          #define SMAA_SEARCHTEX_SELECT(sample) sample.r
 *
 *     If your engine is already using porting macros, you can define
 *     SMAA_CUSTOM_SL, and define the porting functions by yourself.
 *
 *  7. Then, you'll have to setup the passes as indicated in the scheme above.
 *     You can take a look into SMAA.fx, to see how we did it for our demo.
 *     Checkout the function wrappers, you may want to copy-paste them!
 *
 *  8. It's recommended to validate the produced |edges_tex| and |blend_tex|.
 *     You can use a screenshot from your engine to compare the |edges_tex|
 *     and |blend_tex| produced inside of the engine with the results obtained
 *     with the reference demo.
 *
 *  9. After you get the last pass to work, it's time to optimize. You'll have
 *     to initialize a stencil buffer in the first pass (discard is already in
 *     the code), then mask execution by using it the second pass. The last
 *     pass should be executed in all pixels.
 *
 *
 * After this point you can choose to enable predicated thresholding,
 * temporal supersampling and motion blur integration:
 *
 * a) If you want to use predicated thresholding, take a look into
 *    SMAA_PREDICATION; you'll need to pass an extra texture in the edge
 *    detection pass.
 *
 * b) If you want to enable temporal supersampling (SMAA T2x):
 *
 * 1. The first step is to render using subpixel jitters. I won't go into
 *    detail, but it's as simple as moving each vertex position in the
 *    vertex shader, you can check how we do it in our DX10 demo.
 *
 * 2. Then, you must setup the temporal resolve. You may want to take a look
 *    into SMAAResolve for resolving 2x modes. After you get it working, you'll
 *    probably see ghosting everywhere. But fear not, you can enable the
 *    CryENGINE temporal reprojection by setting the SMAA_REPROJECTION macro.
 *    Check out SMAA_DECODE_VELOCITY if your velocity buffer is encoded.
 *
 * 3. The next step is to apply SMAA to each subpixel jittered frame, just as
 *    done for 1x.
 *
 * 4. At this point you should already have something usable, but for best
 *    results the proper area textures must be set depending on current jitter.
 *    For this, the parameter 'subsample_indices' of
 *    'blending_weight_calculation' must be set as follows, for our T2x
 *    mode:
 *
 *    @SUBSAMPLE_INDICES
 *
 *    | S# |  Camera Jitter   |  subsample_indices   |
 *    +----+------------------+---------------------+
 *    |  0 |  ( 0.25, -0.25)  |  float4(1, 1, 1, 0)  |
 *    |  1 |  (-0.25,  0.25)  |  float4(2, 2, 2, 0)  |
 *
 *    These jitter positions assume a bottom-to-top y axis. S# stands for the
 *    sample number.
 *
 * More information about temporal supersampling here:
 *    http://iryoku.com/aacourse/downloads/13-Anti-Aliasing-Methods-in-CryENGINE-3.pdf
 *
 * c) If you want to enable spatial multisampling (SMAA S2x):
 *
 * 1. The scene must be rendered using MSAA 2x. The MSAA 2x buffer must be
 *    created with:
 *      - DX10:     see below (*)
 *      - DX10.1:   D3D10_STANDARD_MULTISAMPLE_PATTERN or
 *      - DX11:     D3D11_STANDARD_MULTISAMPLE_PATTERN
 *
 *    This allows to ensure that the subsample order matches the table in
 *    @SUBSAMPLE_INDICES.
 *
 *    (*) In the case of DX10, we refer the reader to:
 *      - SMAA::detectMSAAOrder and
 *      - SMAA::msaaReorder
 *
 *    These functions allow to match the standard multisample patterns by
 *    detecting the subsample order for a specific GPU, and reordering
 *    them appropriately.
 *
 * 2. A shader must be run to output each subsample into a separate buffer
 *    (DX10 is required). You can use SMAASeparate for this purpose, or just do
 *    it in an existing pass (for example, in the tone mapping pass, which has
 *    the advantage of feeding tone mapped subsamples to SMAA, which will yield
 *    better results).
 *
 * 3. The full SMAA 1x pipeline must be run for each separated buffer, storing
 *    the results in the final buffer. The second run should alpha blend with
 *    the existing final buffer using a blending factor of 0.5.
 *    'subsample_indices' must be adjusted as in the SMAA T2x case (see point
 *    b).
 *
 * d) If you want to enable temporal supersampling on top of SMAA S2x
 *    (which actually is SMAA 4x):
 *
 * 1. SMAA 4x consists on temporally jittering SMAA S2x, so the first step is
 *    to calculate SMAA S2x for current frame. In this case, 'subsample_indices'
 *    must be set as follows:
 *
 *    | F# | S# |   Camera Jitter    |    Net Jitter     |   subsample_indices  |
 *    +----+----+--------------------+-------------------+----------------------+
 *    |  0 |  0 |  ( 0.125,  0.125)  |  ( 0.375, -0.125) |  float4(5, 3, 1, 3)  |
 *    |  0 |  1 |  ( 0.125,  0.125)  |  (-0.125,  0.375) |  float4(4, 6, 2, 3)  |
 *    +----+----+--------------------+-------------------+----------------------+
 *    |  1 |  2 |  (-0.125, -0.125)  |  ( 0.125, -0.375) |  float4(3, 5, 1, 4)  |
 *    |  1 |  3 |  (-0.125, -0.125)  |  (-0.375,  0.125) |  float4(6, 4, 2, 4)  |
 *
 *    These jitter positions assume a bottom-to-top y axis. F# stands for the
 *    frame number. S# stands for the sample number.
 *
 * 2. After calculating SMAA S2x for current frame (with the new subsample
 *    indices), previous frame must be reprojected as in SMAA T2x mode (see
 *    point b).
 *
 * e) If motion blur is used, you may want to do the edge detection pass
 *    together with motion blur. This has two advantages:
 *
 * 1. Pixels under heavy motion can be omitted from the edge detection process.
 *    For these pixels we can just store "no edge", as motion blur will take
 *    care of them.
 * 2. The center pixel tap is reused.
 *
 * Note that in this case depth testing should be used instead of stenciling,
 * as we have to write all the pixels in the motion blur pass.
 *
 * That's it!
 */

//-----------------------------------------------------------------------------
// SMAA Presets

# if AA_METHOD == AA_METHOD_SMAA_LOW
#define SMAA_THRESHOLD 0.15
#define SMAA_DISABLE_DIAG_DETECTION 1
#define SMAA_DISABLE_CORNER_DETECTION 1
# elif AA_METHOD == AA_METHOD_SMAA_MEDIUM
#define SMAA_THRESHOLD 0.1
#define SMAA_DISABLE_DIAG_DETECTION 1
#define SMAA_DISABLE_CORNER_DETECTION 1
# elif AA_METHOD == AA_METHOD_SMAA_HIGH
#define SMAA_THRESHOLD 0.1
#define SMAA_DISABLE_DIAG_DETECTION 0
#define SMAA_MAX_SEARCH_STEPS_DIAG 8
#define SMAA_CORNER_ROUNDING 25
# elif AA_METHOD == AA_METHOD_SMAA_ULTRA
#define SMAA_THRESHOLD 0.05
#define SMAA_DISABLE_DIAG_DETECTION 0
#define SMAA_MAX_SEARCH_STEPS_DIAG 16
#define SMAA_CORNER_ROUNDING 25
#endif

//-----------------------------------------------------------------------------
// Configurable Defines

/**
 * SMAA_THRESHOLD specifies the threshold or sensitivity to edges.
 * Lowering this value you will be able to detect more edges at the expense of
 * performance. 
 *
 * Range: [0, 0.5]
 *   0.1 is a reasonable value, and allows to catch most visible edges.
 *   0.05 is a rather overkill value, that allows to catch 'em all.
 *
 *   If temporal supersampling is used, 0.2 could be a reasonable value, as low
 *   contrast edges are properly filtered by just 2x.
 */
#ifndef SMAA_THRESHOLD
#define SMAA_THRESHOLD 0.1
#endif

/**
 * SMAA_DEPTH_THRESHOLD specifies the threshold for depth edge detection.
 * 
 * Range: depends on the depth range of the scene.
 */
#ifndef SMAA_DEPTH_THRESHOLD
#define SMAA_DEPTH_THRESHOLD (0.1 * SMAA_THRESHOLD)
#endif

/**
 * SMAA_MAX_SEARCH_STEPS_DIAG specifies the maximum steps performed in the
 * diagonal pattern searches, at each side of the pixel. In this case we jump
 * one pixel at time, instead of two.
 *
 * Range: [0, 20]
 *
 * On high-end machines it is cheap (between a 0.8x and 0.9x slower for 16 
 * steps), but it can have a significant impact on older machines.
 *
 * Define SMAA_DISABLE_DIAG_DETECTION to disable diagonal processing.
 */
#ifndef SMAA_MAX_SEARCH_STEPS_DIAG
#define SMAA_MAX_SEARCH_STEPS_DIAG 8
#endif

/**
 * SMAA_CORNER_ROUNDING specifies how much sharp corners will be rounded.
 *
 * Range: [0, 100]
 *
 * Define SMAA_DISABLE_CORNER_DETECTION to disable corner processing.
 */
#ifndef SMAA_CORNER_ROUNDING
#define SMAA_CORNER_ROUNDING 25
#endif

/**
 * If there is an neighbor edge that has SMAA_LOCAL_CONTRAST_FACTOR times
 * bigger contrast than current edge, current edge will be discarded.
 *
 * This allows to eliminate spurious crossing edges, and is based on the fact
 * that, if there is too much contrast in a direction, that will hide
 * perceptually contrast in the other neighbors.
 */
#ifndef SMAA_LOCAL_CONTRAST_ADAPTATION_FACTOR
#define SMAA_LOCAL_CONTRAST_ADAPTATION_FACTOR 2.0
#endif

/**
 * Predicated thresholding allows to better preserve texture details and to
 * improve performance, by decreasing the number of detected edges using an
 * additional buffer like the light accumulation buffer, object ids or even the
 * depth buffer (the depth buffer usage may be limited to indoor or short range
 * scenes).
 *
 * It locally decreases the luma or color threshold if an edge is found in an
 * additional buffer (so the global threshold can be higher).
 *
 * This method was developed by Playstation EDGE MLAA team, and used in 
 * Killzone 3, by using the light accumulation buffer. More information here:
 *     http://iryoku.com/aacourse/downloads/06-MLAA-on-PS3.pptx 
 */
#ifndef SMAA_PREDICATION
#define SMAA_PREDICATION 0
#endif

/**
 * Threshold to be used in the additional predication buffer. 
 *
 * Range: depends on the input, so you'll have to find the magic number that
 * works for you.
 */
#ifndef SMAA_PREDICATION_THRESHOLD
#define SMAA_PREDICATION_THRESHOLD 0.01
#endif

/**
 * How much to scale the global threshold used for luma or color edge
 * detection when using predication.
 *
 * Range: [1, 5]
 */
#ifndef SMAA_PREDICATION_SCALE
#define SMAA_PREDICATION_SCALE 2.0
#endif

/**
 * How much to locally decrease the threshold.
 *
 * Range: [0, 1]
 */
#ifndef SMAA_PREDICATION_STRENGTH
#define SMAA_PREDICATION_STRENGTH 0.4
#endif

/**
 * Temporal reprojection allows to remove ghosting artifacts when using
 * temporal supersampling. We use the CryEngine 3 method which also introduces
 * velocity weighting. This feature is of extreme importance for totally
 * removing ghosting. More information here:
 *    http://iryoku.com/aacourse/downloads/13-Anti-Aliasing-Methods-in-CryENGINE-3.pdf
 *
 * Note that you'll need to setup a velocity buffer for enabling reprojection.
 * For static geometry, saving the previous depth buffer is a viable
 * alternative.
 */
#ifndef SMAA_REPROJECTION
#define SMAA_REPROJECTION 0
#endif

/**
 * SMAA_REPROJECTION_WEIGHT_SCALE controls the velocity weighting. It allows to
 * remove ghosting trails behind the moving object, which are not removed by
 * just using reprojection. Using low values will exhibit ghosting, while using
 * high values will disable temporal supersampling under motion.
 *
 * Behind the scenes, velocity weighting removes temporal supersampling when
 * the velocity of the subsamples differs (meaning they are different objects).
 *
 * Range: [0, 80]
 */
#ifndef SMAA_REPROJECTION_WEIGHT_SCALE
#define SMAA_REPROJECTION_WEIGHT_SCALE 30.0
#endif

/**
 * SMAA_MAX_SEARCH_STEPS specifies the maximum steps performed in the
 * horizontal/vertical pattern searches, at each side of the pixel.
 *
 * In number of pixels, it's actually the double. So the maximum line length
 * perfectly handled by, for example 16, is 64 (by perfectly, we meant that
 * longer lines won't look as good, but still antialiased).
 *
 * Range: [0, 112]
 */
#ifndef SMAA_MAX_SEARCH_STEPS
#define SMAA_MAX_SEARCH_STEPS 16
#endif

//-----------------------------------------------------------------------------
// Non-Configurable Defines

#define SMAA_AREATEX_MAX_DISTANCE 16
#define SMAA_AREATEX_MAX_DISTANCE_DIAG 20
#define SMAA_AREATEX_PIXEL_SIZE (1.0 / vec2(160.0, 560.0))
#define SMAA_AREATEX_SUBTEX_SIZE (1.0 / 7.0)
#define SMAA_SEARCHTEX_SIZE vec2(66.0, 33.0)
#define SMAA_SEARCHTEX_PACKED_SIZE vec2(64.0, 16.0)
#define SMAA_CORNER_ROUNDING_NORM (float(SMAA_CORNER_ROUNDING) / 100.0)



#if SMAA_PASS == SMAA_EDGE_DETECTION
/**
 * Gathers current pixel, and the top-left neighbors.
 */
vec3 smaa_gather_neighbours(vec2 texcoord,
                            sampler2D tex) {
    float p = GLSL_TEXTURE(tex, texcoord).r;
    float p_left = GLSL_TEXTURE(tex, v_offset_0.xy).r;
    float p_top  = GLSL_TEXTURE(tex, v_offset_0.zw).r;
    return vec3(p, p_left, p_top);
}
#endif

#if SMAA_PASS == SMAA_EDGE_DETECTION
/**
 * Adjusts the threshold by means of predication.
 */
vec2 smaa_calculate_predicated_threshold(vec2 texcoord,
                                         sampler2D predication_tex) {
    vec3 neighbours = smaa_gather_neighbours(texcoord, predication_tex);
    vec2 delta = abs(neighbours.xx - neighbours.yz);
    vec2 edges = step(SMAA_PREDICATION_THRESHOLD, delta);
    return SMAA_PREDICATION_SCALE * SMAA_THRESHOLD * (1.0 - SMAA_PREDICATION_STRENGTH * edges);
}
#endif

/**
 * Conditional move:
 */
void smaa_movc(bvec2 cond, inout vec2 variable, vec2 value) {
    if (cond.x) variable.x = value.x;
    if (cond.y) variable.y = value.y;
}

void smaa_movc(bvec4 cond, inout vec4 variable, vec4 value) {
    smaa_movc(cond.xy, variable.xy, value.xy);
    smaa_movc(cond.zw, variable.zw, value.zw);
}

vec2 round_val(vec2 x) {
    return sign(x) * floor(abs(x) + .5);
}

vec4 round_val(vec4 x) {
    return sign(x) * floor(abs(x) + .5);
}


//-----------------------------------------------------------------------------
// Edge Detection Pixel Shaders (First Pass)

/**
 * Luma Edge Detection
 *
 * IMPORTANT NOTICE: luma edge detection requires gamma-corrected colors, and
 * thus 'color_tex' should be a non-sRGB texture.
 */
#if SMAA_PASS == SMAA_EDGE_DETECTION
vec2 smaa_luma_edge_detection(vec2 texcoord,
                              sampler2D color_tex
                              #if SMAA_PREDICATION
                              , sampler2D predication_tex
                              #endif
                              ) {
    // Calculate the threshold:
    #if SMAA_PREDICATION
    vec2 threshold = smaa_calculate_predicated_threshold(texcoord, predication_tex);
    #else
    vec2 threshold = vec2(SMAA_THRESHOLD, SMAA_THRESHOLD);
    #endif

    // Calculate lumas:
    vec3 weights = vec3(0.2126, 0.7152, 0.0722);
    float L = dot(GLSL_TEXTURE(color_tex, texcoord).rgb, weights);

    float L_left = dot(GLSL_TEXTURE(color_tex, v_offset_0.xy).rgb, weights);
    float Ltop  = dot(GLSL_TEXTURE(color_tex, v_offset_0.zw).rgb, weights);

    // We do the usual threshold:
    vec4 delta;
    delta.xy = abs(L - vec2(L_left, Ltop));
    vec2 edges = step(threshold, delta.xy);

    // Then discard if there is no edge:
    if (dot(edges, vec2(1.0, 1.0)) == 0.0)
        discard;

    // Calculate right and bottom deltas:
    float L_right = dot(GLSL_TEXTURE(color_tex, v_offset_1.xy).rgb, weights);
    float L_bottom  = dot(GLSL_TEXTURE(color_tex, v_offset_1.zw).rgb, weights);
    delta.zw = abs(L - vec2(L_right, L_bottom));

    // Calculate the maximum delta in the direct neighborhood:
    vec2 max_delta = max(delta.xy, delta.zw);

    // Calculate left-left and top-top deltas:
    float L_leftleft = dot(GLSL_TEXTURE(color_tex, v_offset_2.xy).rgb, weights);
    float L_toptop = dot(GLSL_TEXTURE(color_tex, v_offset_2.zw).rgb, weights);
    delta.zw = abs(vec2(L_left, Ltop) - vec2(L_leftleft, L_toptop));

    // Calculate the final maximum delta:
    max_delta = max(max_delta.xy, delta.zw);
    float final_delta = max(max_delta.x, max_delta.y);

    // Local contrast adaptation:
    edges.xy *= step(final_delta, SMAA_LOCAL_CONTRAST_ADAPTATION_FACTOR * delta.xy);

    return edges;
}

/**
 * Color Edge Detection
 *
 * IMPORTANT NOTICE: color edge detection requires gamma-corrected colors, and
 * thus 'color_tex' should be a non-sRGB texture.
 */

/*
vec2 color_edge_detection(vec2 texcoord,
                          sampler2D color_tex
                          #if SMAA_PREDICATION
                          , sampler2D predication_tex
                          #endif
                          ) {
    // Calculate the threshold:
    #if SMAA_PREDICATION
    vec2 threshold = smaa_calculate_predicated_threshold(texcoord, predication_tex);
    #else
    vec2 threshold = vec2(SMAA_THRESHOLD, SMAA_THRESHOLD);
    #endif

    // Calculate color deltas:
    vec4 delta;
    vec3 C = GLSL_TEXTURE(color_tex, texcoord).rgb;

    vec3 Cleft = GLSL_TEXTURE(color_tex, v_offset_0.xy).rgb;
    vec3 t = abs(C - Cleft);
    delta.x = max(max(t.r, t.g), t.b);

    vec3 Ctop  = GLSL_TEXTURE(color_tex, v_offset_0.zw).rgb;
    t = abs(C - Ctop);
    delta.y = max(max(t.r, t.g), t.b);

    // We do the usual threshold:
    vec2 edges = step(threshold, delta.xy);

    // Then discard if there is no edge:
    if (dot(edges, vec2(1.0, 1.0)) == 0.0)
        discard;

    // Calculate right and bottom deltas:
    vec3 Cright = GLSL_TEXTURE(color_tex, v_offset_1.xy).rgb;
    t = abs(C - Cright);
    delta.z = max(max(t.r, t.g), t.b);

    vec3 Cbottom  = GLSL_TEXTURE(color_tex, v_offset_1.zw).rgb;
    t = abs(C - Cbottom);
    delta.w = max(max(t.r, t.g), t.b);

    // Calculate the maximum delta in the direct neighborhood:
    vec2 max_delta = max(delta.xy, delta.zw);

    // Calculate left-left and top-top deltas:
    vec3 Cleftleft  = GLSL_TEXTURE(color_tex, v_offset_2.xy).rgb;
    t = abs(C - Cleftleft);
    delta.z = max(max(t.r, t.g), t.b);

    vec3 Ctoptop = GLSL_TEXTURE(color_tex, v_offset_2.zw).rgb;
    t = abs(C - Ctoptop);
    delta.w = max(max(t.r, t.g), t.b);

    // Calculate the final maximum delta:
    max_delta = max(max_delta.xy, delta.zw);
    float final_delta = max(max_delta.x, max_delta.y);

    // Local contrast adaptation:
    edges.xy *= step(final_delta, SMAA_LOCAL_CONTRAST_ADAPTATION_FACTOR * delta.xy);

    return edges;
}
*/
/**
 * Depth Edge Detection
 */
/*
vec2 depth_edge_detection(vec2 texcoord,
                          sampler2D depth_tex) {
    vec3 neighbours = smaa_gather_neighbours(texcoord, depth_tex);
    vec2 delta = abs(neighbours.xx - vec2(neighbours.y, neighbours.z));
    vec2 edges = step(SMAA_DEPTH_THRESHOLD, delta);

    if (dot(edges, vec2(1.0, 1.0)) == 0.0)
        discard;

    return edges;
}

*/
#endif

//-----------------------------------------------------------------------------
// Diagonal Search Functions

#if !SMAA_DISABLE_DIAG_DETECTION

/**
 * Allows to decode two binary values from a bilinear-filtered access.
 */
vec2 decode_diag_biliner_access(vec2 e) {
    // Bilinear access for fetching 'e' have a 0.25 offset, and we are
    // interested in the R and G edges:
    //
    // +---G---+-------+
    // |   x o R   x   |
    // +-------+-------+
    //
    // Then, if one of these edge is enabled:
    //   Red:   (0.75 * X + 0.25 * 1) => 0.25 or 1.0
    //   Green: (0.75 * 1 + 0.25 * X) => 0.75 or 1.0
    //
    // This function will unpack the values (mad + mul + round):
    // wolframalpha.com: round_val(x * abs(5 * x - 5 * 0.75)) plot 0 to 1
    e.r = e.r * abs(5.0 * e.r - 5.0 * 0.75);
    return round_val(e);
}

vec4 decode_diag_biliner_access(vec4 e) {
    e.rb = e.rb * abs(5.0 * e.rb - 5.0 * 0.75);
    return round_val(e);
}

/**
 * These functions allows to perform diagonal pattern searches.
 */
vec2 search_diag1(sampler2D edges_tex, vec2 texcoord, vec2 dir, out vec2 e) {
    vec4 coord = vec4(texcoord, -1.0, 1.0);
    vec3 t = vec3(u_texel_size, 1.0);

    for (int i = 0; i < SMAA_MAX_SEARCH_STEPS_DIAG; i++) {

        if (coord.z < float(SMAA_MAX_SEARCH_STEPS_DIAG - 1) && coord.w > 0.9) {
            coord.xyz += t * vec3(dir, 1.0);
            e = GLSL_TEXTURE(edges_tex, coord.xy, 0.0).rg;
            coord.w = dot(e, vec2(0.5, 0.5));
        }
    }
    return coord.zw;
}

vec2 search_diag2(sampler2D edges_tex, vec2 texcoord, vec2 dir, out vec2 e) {
    vec4 coord = vec4(texcoord, -1.0, 1.0);
    coord.x += 0.25 * u_texel_size.x; // See @SearchDiag2Optimization
    vec3 t = vec3(u_texel_size, 1.0);

    for (int i = 0; i < SMAA_MAX_SEARCH_STEPS_DIAG; i++) {

        if (coord.z < float(SMAA_MAX_SEARCH_STEPS_DIAG - 1) && coord.w > 0.9) {
            coord.xyz = t * vec3(dir, 1.0) + coord.xyz;

            // @SearchDiag2Optimization
            // Fetch both edges at once using bilinear filtering:
            e = GLSL_TEXTURE(edges_tex, coord.xy, 0.0).rg;
            e = decode_diag_biliner_access(e);

            // Non-optimized version:
            // e.g = GLSL_TEXTURE(edges_tex, coord.xy, 0.0).g;
            // e.r = GLSL_TEXTURE(edges_tex, coord.xy + vec2(1, 0), 0.0).r;

            coord.w = dot(e, vec2(0.5, 0.5));
        }

    }
    return coord.zw;
}

/** 
 * Similar to smaa_area, this calculates the area corresponding to a certain
 * diagonal distance and crossing edges 'e'.
 */
vec2 smaa_area_diag(sampler2D area_tex, vec2 dist, vec2 e, float offset) {
    vec2 texcoord = vec2(SMAA_AREATEX_MAX_DISTANCE_DIAG, SMAA_AREATEX_MAX_DISTANCE_DIAG) * e + dist;

    // We do a scale and bias for mapping to texel space:
    texcoord = SMAA_AREATEX_PIXEL_SIZE * texcoord + 0.5 * SMAA_AREATEX_PIXEL_SIZE;

    // Diagonal areas are on the second half of the texture:
    texcoord.x += 0.5;

    // Move to proper place, according to the subpixel offset:
    texcoord.y += SMAA_AREATEX_SUBTEX_SIZE * offset;
    // Do it!
    return GLSL_TEXTURE(area_tex, texcoord, 0.0).rg;
}

/**
 * This searches for diagonal patterns and returns the corresponding weights.
 */
vec2 smaa_calculate_diag_weights(sampler2D edges_tex, sampler2D area_tex,
                                vec2 texcoord, vec2 e, vec4 subsample_indices) {
    vec2 weights = vec2(0.0, 0.0);

    // Search for the line ends:
    vec4 d;
    vec2 end;
    if (e.r > 0.0) {
        d.xz = search_diag1(edges_tex, texcoord, vec2(-1.0,  1.0), end);
        d.x += float(end.y > 0.9);
    } else
        d.xz = vec2(0.0, 0.0);
    d.yw = search_diag1(edges_tex, texcoord, vec2(1.0, -1.0), end);

    if (d.x + d.y > 2.0) { // d.x + d.y + 1 > 3
        // Fetch the crossing edges:
        vec4 coords = vec4(-d.x + 0.25, d.x, d.y, -d.y - 0.25) * u_texel_size.xyxy + texcoord.xyxy;
        vec4 c;
        c.xy = GLSL_TEXTURE(edges_tex, coords.xy + u_texel_size * vec2(-1,  0), 0.0).rg;
        c.zw = GLSL_TEXTURE(edges_tex, coords.zw + u_texel_size * vec2( 1,  0), 0.0).rg;
        c.yxwz = decode_diag_biliner_access(c.xyzw);

        // Merge crossing edges at each side into a single value:
        vec2 cc = vec2(2.0, 2.0) * c.xz + c.yw;

        // Remove the crossing edge if we didn't found the end of the line:
        smaa_movc(bvec2(step(0.9, d.zw)), cc, vec2(0.0, 0.0));

        // Fetch the areas for this line:
        weights += smaa_area_diag(area_tex, d.xy, cc, subsample_indices.z);
    }

    // Search for the line ends:
    d.xz = search_diag2(edges_tex, texcoord, vec2(-1, -1), end);
    if (GLSL_TEXTURE(edges_tex, texcoord + u_texel_size * vec2(1, 0), 0.0).r > 0.0) {
        d.yw = search_diag2(edges_tex, texcoord, vec2(1, 1), end);
        d.y += float(end.y > 0.9);
    } else
        d.yw = vec2(0.0, 0.0);

    if (d.x + d.y > 2.0) { // d.x + d.y + 1 > 3
        // Fetch the crossing edges:
        vec4 coords = vec4(-d.x, -d.x, d.y, d.y) * u_texel_size.xyxy + texcoord.xyxy;
        vec4 c;
        c.x  = GLSL_TEXTURE(edges_tex, coords.xy + u_texel_size * vec2(-1,  0), 0.0).g;
        c.y  = GLSL_TEXTURE(edges_tex, coords.xy + u_texel_size * vec2( 0, -1), 0.0).r;
        c.zw = GLSL_TEXTURE(edges_tex, coords.zw + u_texel_size * vec2( 1,  0), 0.0).gr;
        vec2 cc = vec2(2.0, 2.0) * c.xz + c.yw;

        // Remove the crossing edge if we didn't found the end of the line:
        smaa_movc(bvec2(step(0.9, d.zw)), cc, vec2(0, 0));

        // Fetch the areas for this line:
        weights += smaa_area_diag(area_tex, d.xy, cc, subsample_indices.w).gr;
    }
    return weights;
}
#endif

//-----------------------------------------------------------------------------
// Horizontal/Vertical Search Functions

/**
 * This allows to determine how much length should we add in the last step
 * of the searches. It takes the bilinearly interpolated edge (see 
 * @PSEUDO_GATHER4), and adds 0, 1 or 2, depending on which edges and
 * crossing edges are active.
 */
float search_length(sampler2D search_tex, vec2 e, float offset) {
    // The texture is flipped vertically, with left and right cases taking half
    // of the space horizontally:
    vec2 scale = SMAA_SEARCHTEX_SIZE * vec2(0.5, -1.0);
    vec2 bias = SMAA_SEARCHTEX_SIZE * vec2(offset, 1.0);

    // Scale and bias to access texel centers:
    scale += vec2(-1.0,  1.0);
    bias  += vec2( 0.5, -0.5);

    // Convert from pixel coordinates to texcoords:
    // (We use SMAA_SEARCHTEX_PACKED_SIZE because the texture is cropped)
    scale *= 1.0 / SMAA_SEARCHTEX_PACKED_SIZE;
    bias *= 1.0 / SMAA_SEARCHTEX_PACKED_SIZE;

    // Lookup the search texture:
    return GLSL_TEXTURE(search_tex, scale * e + bias, 0.0).r;
}

/**
 * Horizontal/vertical search functions for the 2nd pass.
 */
float search_x_left(sampler2D edges_tex, sampler2D search_tex, vec2 texcoord,
                    float end) {
    /**
     * @PSEUDO_GATHER4
     * This texcoord has been offset by (-0.25, -0.125) in the vertex shader to
     * sample between edge, thus fetching four edges in a row.
     * Sampling with different offsets in each direction allows to disambiguate
     * which edges are active from the four fetched ones.
     */
    vec2 e = vec2(0.0, 1.0);

    for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) {
        if (texcoord.x > end && 
               e.g > 0.8281 && // Is there some edge not activated?
               e.r == 0.0) { // Or is there a crossing edge that breaks the line?
            e = GLSL_TEXTURE(edges_tex, texcoord, 0.0).rg;
            texcoord = -vec2(2.0, 0.0) * u_texel_size + texcoord;
        }
    }

    float offset = -(255.0 / 127.0) * search_length(search_tex, e, 0.0) + 3.25;
    return u_texel_size.x * offset + texcoord.x;
}

float search_x_right(sampler2D edges_tex, sampler2D search_tex, vec2 texcoord,
                     float end) {
    vec2 e = vec2(0.0, 1.0);
    for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) {
        if (texcoord.x < end && 
               e.g > 0.8281 && // Is there some edge not activated?
               e.r == 0.0) { // Or is there a crossing edge that breaks the line?
            e = GLSL_TEXTURE(edges_tex, texcoord, 0.0).rg;
            texcoord = vec2(2.0, 0.0) * u_texel_size + texcoord;
        }
    }
    float offset = -(255.0 / 127.0) * search_length(search_tex, e, 0.5) + 3.25;
    return -u_texel_size.x * offset + texcoord.x;
}

float search_y_up(sampler2D edges_tex, sampler2D search_tex, vec2 texcoord,
                  float end) {
    vec2 e = vec2(1.0, 0.0);
    for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) {
        if (texcoord.y > end &&
               e.r > 0.8281 && // Is there some edge not activated?
               e.g == 0.0) { // Or is there a crossing edge that breaks the line?
            e = GLSL_TEXTURE(edges_tex, texcoord, 0.0).rg;
            texcoord = -vec2(0.0, 2.0) * u_texel_size + texcoord;
        }
    }
    float offset = -(255.0 / 127.0) * search_length(search_tex, e.gr, 0.0) + 3.25;
    return u_texel_size.y * offset + texcoord.y;
}

float search_y_down(sampler2D edges_tex, sampler2D search_tex, vec2 texcoord,
                    float end) {
    vec2 e = vec2(1.0, 0.0);
    for (int i = 0; i < SMAA_MAX_SEARCH_STEPS; i++) {
        if (texcoord.y < end &&
               e.r > 0.8281 && // Is there some edge not activated?
               e.g == 0.0) { // Or is there a crossing edge that breaks the line?
            e = GLSL_TEXTURE(edges_tex, texcoord, 0.0).rg;
            texcoord = vec2(0.0, 2.0) * u_texel_size + texcoord;
        }
    }
    float offset = -(255.0 / 127.0) * search_length(search_tex, e.gr, 0.5) + 3.25;
    return -u_texel_size.y * offset + texcoord.y;
}

/** 
 * Ok, we have the distance and both crossing edges. So, what are the areas
 * at each side of current edge?
 */
vec2 smaa_area(sampler2D area_tex, vec2 dist, float e1, float e2, float offset) {
    // Rounding prevents precision errors of bilinear filtering:
    vec2 texcoord = vec2(SMAA_AREATEX_MAX_DISTANCE, SMAA_AREATEX_MAX_DISTANCE)
                    * round_val(4.0 * vec2(e1, e2)) + dist;
    
    // We do a scale and bias for mapping to texel space:
    texcoord = SMAA_AREATEX_PIXEL_SIZE * texcoord +  0.5 * SMAA_AREATEX_PIXEL_SIZE;

    // Move to proper place, according to the subpixel offset:
    texcoord.y = SMAA_AREATEX_SUBTEX_SIZE * offset +  texcoord.y;

    // Do it!
    return GLSL_TEXTURE(area_tex, texcoord, 0.0).rg;
}

//-----------------------------------------------------------------------------
// Corner Detection Functions

void detect_horizontal_corner_pattern(sampler2D edges_tex, inout vec2 weights,
                                      vec4 texcoord, vec2 d) {
# if !SMAA_DISABLE_CORNER_DETECTION
    vec2 leftRight = step(d.xy, d.yx);
    vec2 flooring = (1.0 - SMAA_CORNER_ROUNDING_NORM) * leftRight;

    flooring /= leftRight.x + leftRight.y; // Reduce blending for pixels in the center of a line.

    vec2 factor = vec2(1.0, 1.0);
    factor.x -= flooring.x * GLSL_TEXTURE(edges_tex, texcoord.xy + u_texel_size * vec2(0,  1), 0.0).r;
    factor.x -= flooring.y * GLSL_TEXTURE(edges_tex, texcoord.zw + u_texel_size * vec2(1,  1), 0.0).r;
    factor.y -= flooring.x * GLSL_TEXTURE(edges_tex, texcoord.xy + u_texel_size * vec2(0, -2), 0.0).r;
    factor.y -= flooring.y * GLSL_TEXTURE(edges_tex, texcoord.zw + u_texel_size * vec2(1, -2), 0.0).r;

    weights *= clamp(factor, 0.0, 1.0);
# endif
}

void detect_vertical_corner_pattern(sampler2D edges_tex, inout vec2 weights,
                                    vec4 texcoord, vec2 d) {
# if !SMAA_DISABLE_CORNER_DETECTION
    vec2 leftRight = step(d.xy, d.yx);
    vec2 flooring = (1.0 - SMAA_CORNER_ROUNDING_NORM) * leftRight;

    flooring /= leftRight.x + leftRight.y;

    vec2 factor = vec2(1.0, 1.0);
    factor.x -= flooring.x * GLSL_TEXTURE(edges_tex, texcoord.xy + u_texel_size * vec2( 1, 0), 0.0).g;
    factor.x -= flooring.y * GLSL_TEXTURE(edges_tex, texcoord.zw + u_texel_size * vec2( 1, 1), 0.0).g;
    factor.y -= flooring.x * GLSL_TEXTURE(edges_tex, texcoord.xy + u_texel_size * vec2(-2, 0), 0.0).g;
    factor.y -= flooring.y * GLSL_TEXTURE(edges_tex, texcoord.zw + u_texel_size * vec2(-2, 1), 0.0).g;

    weights *= clamp(factor, 0.0, 1.0);
# endif
}

//-----------------------------------------------------------------------------
// Blending Weight Calculation Pixel Shader (Second Pass)

#if SMAA_PASS == SMAA_BLENDING_WEIGHT_CALCULATION
vec4 blending_weight_calculation(vec2 texcoord,
                                 vec2 pixcoord,
                                 sampler2D edges_tex,
                                 sampler2D area_tex,
                                 sampler2D search_tex,
                                 vec4 subsample_indices) { // Just pass zero for SMAA 1x, see @SUBSAMPLE_INDICES.

    vec4 weights = vec4(0.0, 0.0, 0.0, 0.0);

    vec2 e = GLSL_TEXTURE(edges_tex, texcoord).rg;

    if (e.g > 0.0) { // Edge at north
# if !SMAA_DISABLE_DIAG_DETECTION
        // Diagonals have both north and west edges, so searching for them in
        // one of the boundaries is enough.
        weights.rg = smaa_calculate_diag_weights(edges_tex, area_tex, texcoord,
                                                 e, subsample_indices);

        // We give priority to diagonals, so if we find a diagonal we skip
        // horizontal/vertical processing.
        if (weights.r == -weights.g) { // weights.r + weights.g == 0.0
# endif

        vec2 d;

        // Find the distance to the left:
        vec3 coords;
        coords.x = search_x_left(edges_tex, search_tex, v_offset_0.xy, v_offset_2.x);
        coords.y = v_offset_1.y; // v_offset_1.y = texcoord.y - 0.25 * u_texel_size.y (@CROSSING_OFFSET)
        d.x = coords.x;

        // Now fetch the left crossing edges, two at a time using bilinear
        // filtering. Sampling at -0.25 (see @CROSSING_OFFSET) enables to
        // discern what value each edge has:
        float e1 = GLSL_TEXTURE(edges_tex, coords.xy, 0.0).r;

        // Find the distance to the right:
        coords.z = search_x_right(edges_tex, search_tex, v_offset_0.zw, v_offset_2.y);
        d.y = coords.z;

        // We want the distances to be in pixel units (doing this here allow to
        // better interleave arithmetic and memory accesses):
        d = abs(round_val(d / u_texel_size.xx - pixcoord.xx));


        // smaa_area below needs a sqrt, as the areas texture is compressed
        // quadratically:
        vec2 sqrt_d = sqrt(d);

        // Fetch the right crossing edges:
        float e2 = GLSL_TEXTURE(edges_tex, coords.zy + u_texel_size * vec2(1, 0), 0.0).r;

        // Ok, we know how this pattern looks like, now it is time for getting
        // the actual area:
        weights.rg = smaa_area(area_tex, sqrt_d, e1, e2, subsample_indices.y);

        // Fix corners:
        coords.y = texcoord.y;
        detect_horizontal_corner_pattern(edges_tex, weights.rg, coords.xyzy, d);

# if !SMAA_DISABLE_DIAG_DETECTION
        } else
            e.r = 0.0; // Skip vertical processing.
# endif
    }

    if (e.r > 0.0) { // Edge at west
        vec2 d;

        // Find the distance to the top:
        vec3 coords;
        coords.y = search_y_up(edges_tex, search_tex, v_offset_1.xy, v_offset_2.z);
        coords.x = v_offset_0.x; // v_offset_1.x = texcoord.x - 0.25 * u_texel_size.x;
        d.x = coords.y;

        // Fetch the top crossing edges:
        float e1 = GLSL_TEXTURE(edges_tex, coords.xy, 0.0).g;

        // Find the distance to the bottom:
        coords.z = search_y_down(edges_tex, search_tex, v_offset_1.zw, v_offset_2.w);
        d.y = coords.z;

        // We want the distances to be in pixel units:
        d = abs(round_val(d / u_texel_size.yy - pixcoord.yy));

        // smaa_area below needs a sqrt, as the areas texture is compressed 
        // quadratically:
        vec2 sqrt_d = sqrt(d);

        // Fetch the bottom crossing edges:
        float e2 = GLSL_TEXTURE(edges_tex, coords.xz + u_texel_size * vec2(0, 1), 0.0).g;

        // Get the area for this direction:
        weights.ba = smaa_area(area_tex, sqrt_d, e1, e2, subsample_indices.x);

        // Fix corners:
        coords.x = texcoord.x;
        detect_vertical_corner_pattern(edges_tex, weights.ba, coords.xyxz, d);
    }
    return weights;
}
#endif

//-----------------------------------------------------------------------------
// Neighborhood Blending Pixel Shader (Third Pass)

#if SMAA_PASS == SMAA_NEIGHBORHOOD_BLENDING
vec4 neighborhood_blending(vec2 texcoord,
                           sampler2D color_tex,
                           sampler2D blend_tex
                           #if SMAA_REPROJECTION
                           , sampler2D velocity_tex
                           #endif
                           ) {
    // Fetch the blending weights for current pixel:
    vec4 a;
    a.x = GLSL_TEXTURE(blend_tex, v_offset.xy).a; // Right
    a.y = GLSL_TEXTURE(blend_tex, v_offset.zw).g; // Top
    a.wz = GLSL_TEXTURE(blend_tex, texcoord).xz; // Bottom / Left

    // Is there any blending weight with a value greater than 0.0?
    if (dot(a, vec4(1.0, 1.0, 1.0, 1.0)) < 1e-5) {
        vec4 color = GLSL_TEXTURE(color_tex, texcoord, 0.0);

# if SMAA_REPROJECTION
        vec4 vel_tex = GLSL_TEXTURE(velocity_tex, v_texcoord);
        vec2 velocity = 2.0 * unpack_vec2(vel_tex) - 1.0;

        // Pack velocity into the alpha channel:
        color.a = sqrt(2.0 * length(velocity));
# endif

        return color;
    } else {
        bool h = max(a.x, a.z) > max(a.y, a.w); // max(horizontal) > max(vertical)

        // Calculate the blending offsets:
        vec4 blending_offset = vec4(0.0, a.y, 0.0, a.w);
        vec2 blending_weight = a.yw;
        smaa_movc(bvec4(h, h, h, h), blending_offset, vec4(a.x, 0.0, a.z, 0.0));
        smaa_movc(bvec2(h, h), blending_weight, a.xz);
        blending_weight /= dot(blending_weight, vec2(1.0, 1.0));

        // Calculate the texture coordinates:
        vec4 blending_coord = blending_offset * vec4(u_texel_size, - u_texel_size) + texcoord.xyxy;

        // We exploit bilinear filtering to mix current pixel with the chosen
        // neighbor:
        vec4 color = blending_weight.x * GLSL_TEXTURE(color_tex, blending_coord.xy, 0.0);
        color += blending_weight.y * GLSL_TEXTURE(color_tex, blending_coord.zw, 0.0);

# if SMAA_REPROJECTION
        // Antialias velocity for proper reprojection in a later stage:
        vec4 vel_tex = GLSL_TEXTURE(velocity_tex, blending_coord.xy);
        vec2 velocity_add = 2.0 * unpack_vec2(vel_tex) - 1.0;
        vec2 velocity = blending_weight.x * velocity_add;

        vel_tex = GLSL_TEXTURE(velocity_tex, blending_coord.zw);
        velocity_add = 2.0 * unpack_vec2(vel_tex) - 1.0;
        velocity += blending_weight.y * velocity_add;

        // Pack velocity into the alpha channel:
        color.a = sqrt(2.0 * length(velocity));
# endif

        return color;
    }
}
#endif

//-----------------------------------------------------------------------------
// Temporal Resolve Pixel Shader (Optional Pass)

#if SMAA_PASS == SMAA_RESOLVE
vec4 resolve(vec2 texcoord,
             sampler2D current_color_tex,
             sampler2D previous_color_tex
             #if SMAA_REPROJECTION
             , sampler2D velocity_tex
             #endif
             ) {
# if SMAA_REPROJECTION
    vec4 vel_tex = GLSL_TEXTURE(velocity_tex, v_texcoord);

    vec2 velocity;
    velocity = 2.0 * unpack_vec2(vel_tex) - 1.0;

    // Fetch current pixel:
    vec4 current = GLSL_TEXTURE(current_color_tex, texcoord);

    // Reproject current coordinates and fetch previous pixel:
    vec4 previous = GLSL_TEXTURE(previous_color_tex, texcoord - velocity);

    // Attenuate the previous pixel if the velocity is different:
    float delta = abs(current.a * current.a - previous.a * previous.a) / 2.0;
    float weight = 0.5 * clamp(1.0 - sqrt(delta) * SMAA_REPROJECTION_WEIGHT_SCALE, 0.0, 1.0);

    // Blend the pixels according to the calculated weight:
    vec4 color = mix(current, previous, weight);
    color.a = 1.0;
    return color;
# else
    // Just blend the pixels:
    vec4 current = GLSL_TEXTURE(current_color_tex, texcoord);
    vec4 previous = GLSL_TEXTURE(previous_color_tex, texcoord);
    return mix(current, previous, 0.5);
# endif
}
#endif

void main(void) {
#if SMAA_PASS == SMAA_EDGE_DETECTION
    vec4 color = vec4(smaa_luma_edge_detection(v_texcoord, u_color
                                               #if SMAA_PREDICATION
                                               , u_predication_tex
                                               #endif
                                               ), 0.0, 0.0);

#elif SMAA_PASS == SMAA_BLENDING_WEIGHT_CALCULATION
    vec4 color = blending_weight_calculation(v_texcoord, v_pixcoord,
                                             u_color, u_area_tex,
                                             u_search_tex, u_subsample_indices);

#elif SMAA_PASS == SMAA_NEIGHBORHOOD_BLENDING
    vec4 color = neighborhood_blending(v_texcoord, u_color, u_blend
                                       #if SMAA_REPROJECTION
                                       , u_velocity_tex
                                       #endif
                                       );
#elif SMAA_PASS == SMAA_RESOLVE
    vec4 color = vec4(resolve(v_texcoord, u_color, u_color_prev
                              #if SMAA_REPROJECTION
                              , u_velocity_tex
                              #endif
                              ));
#else
    vec4 color = GLSL_TEXTURE(u_color, v_texcoord);
#endif
    
    GLSL_OUT_FRAG_COLOR = color;
}
