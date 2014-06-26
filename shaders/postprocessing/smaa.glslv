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

#define SMAA_EDGE_DETECTION 1
#define SMAA_BLENDING_WEIGHT_CALCULATION 2
#define SMAA_NEIGHBORHOOD_BLENDING 3

#define AA_METHOD_SMAA_LOW 1
#define AA_METHOD_SMAA_MEDIUM 2
#define AA_METHOD_SMAA_HIGH 3
#define AA_METHOD_SMAA_ULTRA 4

attribute vec2 a_bb_vertex;

uniform vec2 u_texel_size;

varying vec2 v_texcoord;

#if SMAA_PASS == SMAA_NEIGHBORHOOD_BLENDING
varying vec4 v_offset;
#else
varying vec4 v_offset_0;
varying vec4 v_offset_1;
varying vec4 v_offset_2;
#endif

#if SMAA_PASS == SMAA_BLENDING_WEIGHT_CALCULATION
varying vec2 v_pixcoord;
#endif

//-----------------------------------------------------------------------------
// SMAA Presets

# if AA_METHOD == AA_METHOD_SMAA_LOW
#define SMAA_MAX_SEARCH_STEPS 4
# elif AA_METHOD == AA_METHOD_SMAA_MEDIUM
#define SMAA_MAX_SEARCH_STEPS 8
# elif AA_METHOD == AA_METHOD_SMAA_HIGH
#define SMAA_MAX_SEARCH_STEPS 16
# elif AA_METHOD == AA_METHOD_SMAA_ULTRA
#define SMAA_MAX_SEARCH_STEPS 32
#endif

//-----------------------------------------------------------------------------
// Configurable Defines

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

#if SMAA_PASS == SMAA_EDGE_DETECTION
void smaa_edge_detection(vec2 texcoord) {
    v_offset_0 = u_texel_size.xyxy * vec4(-1.0, 0.0, 0.0, -1.0) + texcoord.xyxy;
    v_offset_1 = u_texel_size.xyxy * vec4( 1.0, 0.0, 0.0,  1.0) + texcoord.xyxy;
    v_offset_2 = u_texel_size.xyxy * vec4(-2.0, 0.0, 0.0, -2.0) + texcoord.xyxy;
}

#elif SMAA_PASS == SMAA_BLENDING_WEIGHT_CALCULATION
void smaa_blending_weight_calculation(vec2 texcoord, out vec2 pixcoord) {
    pixcoord = texcoord / u_texel_size;

    // We will use these offsets for the searches later on (see @PSEUDO_GATHER4):
    v_offset_0 = u_texel_size.xyxy * vec4(-0.25, -0.125,  1.25, -0.125) + texcoord.xyxy;
    v_offset_1 = u_texel_size.xyxy * vec4(-0.125, -0.25, -0.125,  1.25) + texcoord.xyxy;

    // And these for the searches, they indicate the ends of the loops:
    v_offset_2 = u_texel_size.xxyy * vec4(-2.0, 2.0, -2.0, 2.0) *
        float(SMAA_MAX_SEARCH_STEPS) + vec4(v_offset_0.xz, v_offset_1.yw);
}

#elif SMAA_PASS == SMAA_NEIGHBORHOOD_BLENDING
void smaa_neighborhood_blending(vec2 texcoord) {
    v_offset = u_texel_size.xyxy * vec4( 1.0, 0.0, 0.0,  1.0) + texcoord.xyxy;
}
#endif

void main(void) {

    v_texcoord = a_bb_vertex + 0.5;

#if SMAA_PASS == SMAA_EDGE_DETECTION
    smaa_edge_detection(v_texcoord);
#elif SMAA_PASS == SMAA_BLENDING_WEIGHT_CALCULATION
    smaa_blending_weight_calculation(v_texcoord, v_pixcoord);
#elif SMAA_PASS == SMAA_NEIGHBORHOOD_BLENDING
    smaa_neighborhood_blending(v_texcoord);
#endif
    
    gl_Position = vec4(2.0 * a_bb_vertex.xy, 0.0, 1.0);
}
