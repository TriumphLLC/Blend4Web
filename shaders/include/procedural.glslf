#ifndef PROCEDURAL_GLSLF
#define PROCEDURAL_GLSLF

vec4 mod289(vec4 x) {
    return x - floor(x * (_1_0 / 289.0)) * 289.0;
}

vec3 mod289(vec3 x) {
    return x - floor(x * (_1_0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
    return x - floor(x * (_1_0 / 289.0)) * 289.0;
}

vec4 mod7(vec4 x) {
    return x - floor(x * (_1_0 / 7.0)) * 7.0;
}

// Permutation polynomial: (34x^2 + 5x) mod 289
vec4 permute(vec4 x) {
    return mod289((34.0 * x + 5.0) * x);
}

// Cellular noise ("Worley noise") in 2D in GLSL.
// Copyright (c) Stefan Gustavson 2011-04-19. All rights reserved.
// This code is released under the conditions of the MIT license.
// See LICENSE file for details.

// Cellular noise, returning F1 and F2 in a vec2.
// Speeded up by using 2x2 search window instead of 3x3,
// at the expense of some strong pattern artifacts.
// F2 is often wrong and has sharp discontinuities.
// If you need a smooth F2, use the slower 3x3 version.
// F1 is sometimes wrong, too, but OK for most purposes.

#define K 0.142857142857 // 1/7
#define K2 0.0714285714285 // K/2
#define JITTER 0.7 // JITTER 1.0 makes F1 wrong more often

vec2 cellular2x2(vec2 P) {
    vec2 Pi = mod289(floor(P));
    vec2 Pf = fract(P);
    vec4 Pfx = Pf.x + vec4(-0.5, -1.5, -0.5, -1.5);
    vec4 Pfy = Pf.y + vec4(-0.5, -0.5, -1.5, -1.5);
    vec4 p = permute(Pi.x + vec4(_0_0, _1_0, 
            _0_0, _1_0));
    p = permute(p + Pi.y + vec4(_0_0, _0_0, 
            _1_0, _1_0));
    vec4 ox = mod7(p)*K+K2;
    vec4 oy = mod7(floor(p*K))*K+K2;
    vec4 dx = Pfx + JITTER*ox;
    vec4 dy = Pfy + JITTER*oy;
    vec4 d = dx * dx + dy * dy; // d11, d12, d21 and d22, squared
    // Sort out the two smallest distances
#if 1
    // Cheat and pick only F1
    d.xy = min(d.xy, d.zw);
    d.x = min(d.x, d.y);
    return d.xx; // F1 duplicated, F2 not computed
#else
    // Do it right and find both F1 and F2
    d.xy = (d.x < d.y) ? d.xy : d.yx; // Swap if smaller
    d.xz = (d.x < d.z) ? d.xz : d.zx;
    d.xw = (d.x < d.w) ? d.xw : d.wx;
    d.y = min(d.y, d.z);
    d.y = min(d.y, d.w);
    return sqrt(d.xy);
#endif
}

//Special Voronoi noise for caustics with aberration
vec3 cellular2x2_caust(vec2 P, float aber) {
    vec2 Pi = mod289(floor(P));
    vec2 Pf = fract(P);
    vec4 Pfx = Pf.x + vec4(-0.5, -1.5, -0.5, -1.5);
    vec4 Pfy = Pf.y + vec4(-0.5, -0.5, -1.5, -1.5);
    vec4 p = permute(Pi.x + vec4(_0_0, _1_0, 
            _0_0, _1_0));
    p = permute(p + Pi.y + vec4(_0_0, _0_0, 
            _1_0, _1_0));
    vec4 ox = mod7(p) * K + K2;
    vec4 oy = mod7(floor(p * K)) * K + K2;
    vec4 dx = Pfx + JITTER * ox;
    vec4 dy = Pfy + JITTER * oy;
    vec4 d1 = dx * dx + dy * dy; // d11, d12, d21 and d22, squared
    dx += aber;
    dy += aber;
    vec4 d2 = dx * dx + dy * dy; // d11, d12, d21 and d22, squared
    dx += aber;
    dy += aber;
    vec4 d3 = dx * dx + dy * dy; // d11, d12, d21 and d22, squared

    // Sort out the two smallest distances

    // Cheat and pick only F1
    d1.xy = min(d1.xy, d1.zw);
    d1.x = min(d1.x, d1.y);
    d2.xy = min(d2.xy, d2.zw);
    d2.x = min(d2.x, d2.y);
    d3.xy = min(d3.xy, d3.zw);
    d3.x = min(d3.x, d3.y);
    return vec3(d1.x, d2.x, d3.x); // F1 duplicated, F2 not computed
}

//
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//

vec3 permute3(vec3 x) {
    return mod289(((x*34.0)+_1_0)*x);
}

float snoise(vec2 v)
    {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                       -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
// First corner
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);

// Other corners
    vec2 i1;
    //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
    //i1.y = 1.0 - i1.x;
    i1 = (x0.x > x0.y) ? vec2(_1_0, _0_0) 
                       : vec2(_0_0, _1_0);
    // x0 = x0 - 0.0 + 0.0 * C.xx ;
    // x1 = x0 - i1 + 1.0 * C.xx ;
    // x2 = x0 - 1.0 + 2.0 * C.xx ;
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

// Permutations
    i = mod289(i); // Avoid truncation effects in permutation
    vec3 p = permute3( permute3( i.y + vec3(_0_0, i1.y, 
            _1_0 ))
            + i.x + vec3(_0_0, i1.x, _1_0 ));

    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 
                 _0_0);
    m = m*m ;
    m = m*m ;

// Gradients: 41 points uniformly over a line, mapped onto a diamond.
// The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

    vec3 x = 2.0 * fract(p * C.www) - _1_0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

// Normalise gradients implicitly by scaling m
// Approximation of: m *= inversesqrt( a0*a0 + h*h );
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

// Compute final noise value at P
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

// generating noise/pattern texture for dithering
vec2 generate_dithering_tex(vec2 coord) {

    float d1 = dot(coord, vec2(12.9898, 78.233));
    float d2 = dot(coord, vec2(12.9898, 78.233) * 2.0);

    float noiseX = fract(sin(d1) * 43758.5453) * 2.0 - _1_0;
    float noiseY = fract(sin(d2) * 43758.5453) * 2.0 - _1_0;

    return vec2(noiseX, noiseY);
}

#endif
