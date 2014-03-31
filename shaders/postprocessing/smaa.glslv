
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
varying vec4 v_offset[3];
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

void smaa_edge_detection(vec2 texcoord,
                         out vec4 offset[3]) {
    offset[0] = u_texel_size.xyxy * vec4(-1.0, 0.0, 0.0, -1.0) + texcoord.xyxy;
    offset[1] = u_texel_size.xyxy * vec4( 1.0, 0.0, 0.0,  1.0) + texcoord.xyxy;
    offset[2] = u_texel_size.xyxy * vec4(-2.0, 0.0, 0.0, -2.0) + texcoord.xyxy;
}

void smaa_blending_weight_calculation(vec2 texcoord,
                                     out vec2 pixcoord,
                                     out vec4 offset[3]) {
    pixcoord = texcoord / u_texel_size;

    // We will use these offsets for the searches later on (see @PSEUDO_GATHER4):
    offset[0] = u_texel_size.xyxy * vec4(-0.25, -0.125,  1.25, -0.125) + texcoord.xyxy;
    offset[1] = u_texel_size.xyxy * vec4(-0.125, -0.25, -0.125,  1.25) + texcoord.xyxy;

    // And these for the searches, they indicate the ends of the loops:
    offset[2] = u_texel_size.xxyy * vec4(-2.0, 2.0, -2.0, 2.0) *
        float(SMAA_MAX_SEARCH_STEPS) + vec4(offset[0].xz, offset[1].yw);
}

void smaa_neighborhood_blending(vec2 texcoord,
                                out vec4 offset) {
    offset = u_texel_size.xyxy * vec4( 1.0, 0.0, 0.0,  1.0) + texcoord.xyxy;
}

void main(void) {

    v_texcoord = a_bb_vertex + 0.5;

#if SMAA_PASS == SMAA_EDGE_DETECTION
    smaa_edge_detection(v_texcoord, v_offset);
#elif SMAA_PASS == SMAA_BLENDING_WEIGHT_CALCULATION
    smaa_blending_weight_calculation(v_texcoord, v_pixcoord, v_offset);
#elif SMAA_PASS == SMAA_NEIGHBORHOOD_BLENDING
    smaa_neighborhood_blending(v_texcoord, v_offset);
#endif
    
    gl_Position = vec4(2.0 * a_bb_vertex.xy, 0.0, 1.0);
}
