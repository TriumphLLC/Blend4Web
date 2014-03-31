/*============================================================================
                     NVIDIA FXAA 3.9 by TIMOTHY LOTTES
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
============================================================================*/
  
#include <precision_statement.glslf>

#define AA_METHOD_PASS 1
#define AA_METHOD_FXAA_LIGHT 2
#define AA_METHOD_FXAA_QUALITY 3

#define FXAA_REDUCE_MIN (1.0/128.0)
#define FXAA_REDUCE_MUL (1.0/8.0)
#define FXAA_SPAN_MAX 8.0

uniform sampler2D u_color;

uniform vec2 u_texel_size;
varying vec2 v_texcoord;

vec4 get(float x, float y) {
    vec2 coord = v_texcoord + vec2(x,y) * u_texel_size;
    return texture2D(u_color, coord);
}

float luma(vec4 color) {
    vec3 luma_coeff = vec3(0.299, 0.587, 0.114);
    float l = dot(color.rgb, luma_coeff);
    return l;
}

vec4 fxaa_light() {
    vec4 rgbNW = get(-1.0,-1.0);
    vec4 rgbNE = get( 1.0,-1.0);
    vec4 rgbSW = get(-1.0, 1.0);
    vec4 rgbSE = get( 1.0, 1.0);
    vec4 rgbM  = get( 0.0, 0.0);

    float lumaNW = luma(rgbNW);
    float lumaNE = luma(rgbNE);
    float lumaSW = luma(rgbSW);
    float lumaSE = luma(rgbSE);
    float lumaM  = luma(rgbM);

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
        texture2D(u_color, v_texcoord + dir * (1.0/3.0 - 0.5)) +
        texture2D(u_color, v_texcoord + dir * (2.0/3.0 - 0.5)));

    vec4 rgbB = rgbA * 0.5 + 0.25 * (
        texture2D(u_color, v_texcoord + dir * -0.5) +
        texture2D(u_color, v_texcoord + dir *  0.5));

    float lumaB = luma(rgbB);
    if ((lumaB < lumaMin) || (lumaB > lumaMax)) 
        return rgbA;
    else 
        return rgbB;
}

/*============================================================================

                              FXAA3 QUALITY - PC

============================================================================*/

// The minimum amount of local contrast required to apply algorithm.
//
// 1/3 - too little
// 1/4 - low quality
// 1/6 - default
// 1/8 - high quality
// 1/16 - overkill
#define FXAA_QUALITY_EDGE_THRESHOLD (1.0/6.0)

// Trims the algorithm from processing darks.
//
// 1/32 - visible limit
// 1/16 - high quality
// 1/12 - upper limit (default, the start of visible unfiltered edges)
#define FXAA_QUALITY_EDGE_THRESHOLD_MIN (1.0/12.0)

// Choose the amount of sub-pixel aliasing removal.
//
// 1   - upper limit (softer)
// 3/4 - default amount of filtering
// 1/2 - lower limit (sharper, less sub-pixel aliasing removal)
#define FXAA_QUALITY_SUBPIX (3.0/4.0)

vec4 fxaa_quality() {

	vec2 posM;
	posM.x = v_texcoord.x;
	posM.y = v_texcoord.y;

	vec4 rgbyM = texture2D(u_color, posM);

    vec4 rgbS = get( 0.0, 1.0);
    vec4 rgbE = get( 1.0, 0.0);
    vec4 rgbN = get( 0.0,-1.0);
    vec4 rgbW = get(-1.0, 0.0);

    float lumaS = luma(rgbS);
    float lumaE = luma(rgbE);
    float lumaN = luma(rgbN);
    float lumaW = luma(rgbW);
    float lumaM = luma(rgbyM);

	float maxSM = max(lumaS, lumaM);
	float minSM = min(lumaS, lumaM);
	float maxESM = max(lumaE, maxSM);
	float minESM = min(lumaE, minSM);
	float maxWN = max(lumaN, lumaW);
	float minWN = min(lumaN, lumaW);
	float rangeMax = max(maxWN, maxESM);
	float rangeMin = min(minWN, minESM);
    float rangeMaxScaled = rangeMax * FXAA_QUALITY_EDGE_THRESHOLD;
	float range = rangeMax - rangeMin;
    float rangeMaxClamped = max(FXAA_QUALITY_EDGE_THRESHOLD_MIN, rangeMaxScaled);
	bool earlyExit = range < rangeMaxClamped;

	if (earlyExit)
		return rgbyM;

    vec4 rgbNW = get(-1.0,-1.0);
    vec4 rgbSE = get( 1.0, 1.0);
    vec4 rgbNE = get( 1.0,-1.0);
    vec4 rgbSW = get(-1.0, 1.0);

    float lumaNW = luma(rgbNW);
    float lumaSE = luma(rgbSE);
    float lumaNE = luma(rgbNE);
    float lumaSW = luma(rgbSW);

	float lumaNS = lumaN + lumaS;
	float lumaWE = lumaW + lumaE;
	float subpixRcpRange = 1.0 / range;
	float subpixNSWE = lumaNS + lumaWE;
	float edgeHorz1 = (-2.0 * lumaM) + lumaNS;
	float edgeVert1 = (-2.0 * lumaM) + lumaWE;

	float lumaNESE = lumaNE + lumaSE;
	float lumaNWNE = lumaNW + lumaNE;
	float edgeHorz2 = (-2.0 * lumaE) + lumaNESE;
	float edgeVert2 = (-2.0 * lumaN) + lumaNWNE;

	float lumaNWSW = lumaNW + lumaSW;
	float lumaSWSE = lumaSW + lumaSE;
	float edgeHorz4 = (abs(edgeHorz1) * 2.0) + abs(edgeHorz2);
	float edgeVert4 = (abs(edgeVert1) * 2.0) + abs(edgeVert2);
	float edgeHorz3 = (-2.0 * lumaW) + lumaNWSW;
	float edgeVert3 = (-2.0 * lumaS) + lumaSWSE;
	float edgeHorz = abs(edgeHorz3) + edgeHorz4;
	float edgeVert = abs(edgeVert3) + edgeVert4;

	float subpixNWSWNESE = lumaNWSW + lumaNESE;
	float lengthSign = u_texel_size.x;
	bool horzSpan = edgeHorz >= edgeVert;
	float subpixA = subpixNSWE * 2.0 + subpixNWSWNESE;

	if (!horzSpan)
		lumaN = lumaW;
	if (!horzSpan)
		lumaS = lumaE;
	if (horzSpan)
		lengthSign = u_texel_size.y;
	float subpixB = (subpixA * (1.0 / 12.0)) - lumaM;

	float gradientN = lumaN - lumaM;
	float gradientS = lumaS - lumaM;
	float lumaNN = lumaN + lumaM;
	float lumaSS = lumaS + lumaM;
	bool pairN = abs(gradientN) >= abs(gradientS);
	float gradient = max(abs(gradientN), abs(gradientS));
	if (pairN)
		lengthSign = -lengthSign;
	float subpixC = clamp(abs(subpixB) * subpixRcpRange, 0.0, 1.0);

	vec2 posB;
	posB.x = posM.x;
	posB.y = posM.y;
	vec2 offNP;
	offNP.x = (!horzSpan) ? 0.0 : u_texel_size.x;
	offNP.y = (horzSpan) ? 0.0 : u_texel_size.y;
	if (!horzSpan)
		posB.x += lengthSign * 0.5;
	if (horzSpan)
		posB.y += lengthSign * 0.5;

	vec2 posN;
	posN.x = posB.x - offNP.x;
	posN.y = posB.y - offNP.y;
	vec2 posP;
	posP.x = posB.x + offNP.x;
	posP.y = posB.y + offNP.y;
	float subpixD = ((-2.0) * subpixC) + 3.0;
    float lumaEndN = luma(texture2D(u_color, posN));
	float subpixE = subpixC * subpixC;
    float lumaEndP = luma(texture2D(u_color, posP));

	if (!pairN)
		lumaNN = lumaSS;
	float gradientScaled = gradient * 1.0 / 4.0;
	float lumaMM = lumaM - lumaNN * 0.5;
	float subpixF = subpixD * subpixE;
	bool lumaMLTZero = lumaMM < 0.0;

	lumaEndN -= lumaNN * 0.5;
	lumaEndP -= lumaNN * 0.5;
	bool doneN = abs(lumaEndN) >= gradientScaled;
	bool doneP = abs(lumaEndP) >= gradientScaled;
	if (!doneN)
		posN.x -= offNP.x * 1.5;
	if (!doneN)
		posN.y -= offNP.y * 1.5;
	bool doneNP = (!doneN) || (!doneP);
	if (!doneP)
		posP.x += offNP.x * 1.5;
	if (!doneP)
		posP.y += offNP.y * 1.5;
	if (doneNP) {

		if (!doneN)
            lumaEndN = luma(texture2D(u_color, posN.xy));
		if (!doneP)
            lumaEndP = luma(texture2D(u_color, posP.xy));
		if (!doneN)
			lumaEndN = lumaEndN - lumaNN * 0.5;
		if (!doneP)
			lumaEndP = lumaEndP - lumaNN * 0.5;
		doneN = abs(lumaEndN) >= gradientScaled;
		doneP = abs(lumaEndP) >= gradientScaled;
		if (!doneN)
			posN.x -= offNP.x * 2.0;
		if (!doneN)
			posN.y -= offNP.y * 2.0;
		doneNP = (!doneN) || (!doneP);
		if (!doneP)
			posP.x += offNP.x * 2.0;
		if (!doneP)
			posP.y += offNP.y * 2.0;
		if (doneNP) {

			if (!doneN)
                lumaEndN = luma(texture2D(u_color, posN.xy));
			if (!doneP)
                lumaEndP = luma(texture2D(u_color, posP.xy));
			if (!doneN)
				lumaEndN = lumaEndN - lumaNN * 0.5;
			if (!doneP)
				lumaEndP = lumaEndP - lumaNN * 0.5;
			doneN = abs(lumaEndN) >= gradientScaled;
			doneP = abs(lumaEndP) >= gradientScaled;
			if (!doneN)
				posN.x -= offNP.x * 2.0;
			if (!doneN)
				posN.y -= offNP.y * 2.0;
			doneNP = (!doneN) || (!doneP);
			if (!doneP)
				posP.x += offNP.x * 2.0;
			if (!doneP)
				posP.y += offNP.y * 2.0;
			if (doneNP) {

				if (!doneN)
                    lumaEndN = luma(texture2D(u_color, posN.xy));
				if (!doneP)
                    lumaEndP = luma(texture2D(u_color, posP.xy));
				if (!doneN)
					lumaEndN = lumaEndN - lumaNN * 0.5;
				if (!doneP)
					lumaEndP = lumaEndP - lumaNN * 0.5;
				doneN = abs(lumaEndN) >= gradientScaled;
				doneP = abs(lumaEndP) >= gradientScaled;
				if (!doneN)
					posN.x -= offNP.x * 4.0;
				if (!doneN)
					posN.y -= offNP.y * 4.0;
				doneNP = (!doneN) || (!doneP);
				if (!doneP)
					posP.x += offNP.x * 4.0;
				if (!doneP)
					posP.y += offNP.y * 4.0;
				if (doneNP) {

					if (!doneN)
                        lumaEndN = luma(texture2D(u_color, posN.xy));
					if (!doneP)
                        lumaEndP = luma(texture2D(u_color, posP.xy));
					if (!doneN)
						lumaEndN = lumaEndN - lumaNN * 0.5;
					if (!doneP)
						lumaEndP = lumaEndP - lumaNN * 0.5;
					doneN = abs(lumaEndN) >= gradientScaled;
					doneP = abs(lumaEndP) >= gradientScaled;
					if (!doneN)
						posN.x -= offNP.x * 2.0;
					if (!doneN)
						posN.y -= offNP.y * 2.0;
					if (!doneP)
						posP.x += offNP.x * 2.0;
					if (!doneP)
						posP.y += offNP.y * 2.0;
				}
			}
		}
	}

	float dstN = posM.x - posN.x;
	float dstP = posP.x - posM.x;
	if (!horzSpan)
		dstN = posM.y - posN.y;
	if (!horzSpan)
		dstP = posP.y - posM.y;

	bool goodSpanN = (lumaEndN < 0.0) != lumaMLTZero;
	float spanLength = (dstP + dstN);
	bool goodSpanP = (lumaEndP < 0.0) != lumaMLTZero;
	float spanLengthRcp = 1.0 / spanLength;

	bool directionN = dstN < dstP;
	float dst = min(dstN, dstP);
	bool goodSpan = directionN ? goodSpanN : goodSpanP;
	float subpixG = subpixF * subpixF;
	float pixelOffset = (dst * (-spanLengthRcp)) + 0.5;
    float subpixH = subpixG * FXAA_QUALITY_SUBPIX;

	float pixelOffsetGood = goodSpan ? pixelOffset : 0.0;
	float pixelOffsetSubpix = max(pixelOffsetGood, subpixH);
	if (!horzSpan)
		posM.x += pixelOffsetSubpix * lengthSign;
	if (horzSpan)
		posM.y += pixelOffsetSubpix * lengthSign;
	return texture2D(u_color, posM);
}


/*============================================================================
                         FXAA CONSOLE - TUNING KNOBS
============================================================================*/
//
// Consoles the sharpness of edges.
// 
// Due to the PS3 being ALU bound, 
// there are only two safe values here: 4 and 8.
// These options use the shaders ability to a free *|/ by 4|8.
//
// 8.0 is sharper
// 4.0 is softer
// 2.0 is really soft (good for vector graphics inputs)
//
#define FXAA_CONSOLE_EDGE_SHARPNESS 8.0
/*--------------------------------------------------------------------------*/
//
// The minimum amount of local contrast required to apply algorithm.
// The console setting has a different mapping than the quality setting.
//
// This only applies when FXAA_EARLY_EXIT is 1.
//
// Due to the PS3 being ALU bound, 
// there are only two safe values here: 0.25 and 0.125.
// These options use the shaders ability to a free *|/ by 4|8.
//
// 0.125 leaves less aliasing, but is softer
// 0.25 leaves more aliasing, and is sharper
//
#define FXAA_CONSOLE_EDGE_THRESHOLD 0.125
/*--------------------------------------------------------------------------*/
//
// Trims the algorithm from processing darks.
// The console setting has a different mapping than the quality setting.
//
// This only applies when FXAA_EARLY_EXIT is 1.
//
// This does not apply to PS3.
// PS3 was simplified to avoid more shader instructions.
// 
#define FXAA_CONSOLE_EDGE_THRESHOLD_MIN 0.05
/*============================================================================

                      FXAA3 CONSOLE - PC PIXEL SHADER

------------------------------------------------------------------------------
Using a modified version of the PS3 version here to best target old hardware.
============================================================================*/
/*--------------------------------------------------------------------------*/
/*
vec4 FxaaPixelShader(

    // {xy} = center of pixel
    vec2 pos,

    // {xy__} = upper left of pixel
    // {__zw} = lower right of pixel
    vec4 posPos,

    // {rgb_} = color in linear or perceptual color space
    // {___a} = alpha output is junk value
    sampler2D tex,

    // This must be from a constant/uniform.
    // {x___} = 2.0/screenWidthInPixels
    // {_y__} = 2.0/screenHeightInPixels
    // {__z_} = 0.5/screenWidthInPixels
    // {___w} = 0.5/screenHeightInPixels
    vec4 rcpFrameOpt 
) {
*/
/*
vec4 fxaa_light2() {

    vec4 posPos;
    posPos.xy = v_texcoord + vec2(-1.0,  1.0) * u_texel_size;
    posPos.zw = v_texcoord + vec2( 1.0, -1.0) * u_texel_size;

    vec4 rcpFrameOpt = vec4(2.0 * u_texel_size.x, 2.0 * u_texel_size.y, 
                            0.5 * u_texel_size.x, 0.5 * u_texel_size.y);

    vec3 luma = vec3(0.299, 0.587, 0.114);

    vec4 dir;
    dir.y = 0.0;
    vec4 lumaNe = texture2D(u_color, posPos.zy); 
    lumaNe.w = dot(lumaNe.rgb, luma);
    lumaNe.w += float(1.0/384.0);
    dir.x = -lumaNe.w;
    dir.z = -lumaNe.w;

    vec4 lumaSw = texture2D(u_color, posPos.xw);
    lumaSw.w = dot(lumaSw.rgb, luma);
    dir.x += lumaSw.w;
    dir.z += lumaSw.w;

    vec4 lumaNw = texture2D(u_color, posPos.xy);
    lumaNw.w = dot(lumaNw.rgb, luma);
    dir.x -= lumaNw.w;
    dir.z += lumaNw.w;

    vec4 lumaSe = texture2D(u_color, posPos.zw);
    lumaSe.w = dot(lumaSe.rgb, luma);
    dir.x += lumaSe.w;
    dir.z -= lumaSe.w;

    vec4 rgbyM = texture2D(u_color, v_texcoord.xy);
    float lumaM = dot(rgbyM.rgb, luma);

    float lumaMin = min(min(lumaNw.w, lumaSw.w), min(lumaNe.w, lumaSe.w));
    float lumaMax = max(max(lumaNw.w, lumaSw.w), max(lumaNe.w, lumaSe.w));

    float lumaMinM = min(lumaMin, lumaM); 
    float lumaMaxM = max(lumaMax, lumaM); 

    if ((lumaMaxM - lumaMinM) < max(FXAA_CONSOLE_EDGE_THRESHOLD_MIN, lumaMax * FXAA_CONSOLE_EDGE_THRESHOLD))
        return rgbyM;

    vec4 dir1_pos;
    dir1_pos.xy = normalize(dir.xyz).xz;
    float dirAbsMinTimesC = min(abs(dir1_pos.x), abs(dir1_pos.y)) * float(FXAA_CONSOLE_EDGE_SHARPNESS);

    vec4 dir2_pos;
    dir2_pos.xy = clamp(dir1_pos.xy / dirAbsMinTimesC, float(-2.0), float(2.0));
    dir1_pos.zw = v_texcoord.xy;
    dir2_pos.zw = v_texcoord.xy;
    vec4 temp1N;
    temp1N.xy = dir1_pos.zw - dir1_pos.xy * rcpFrameOpt.zw;

    temp1N = texture2D(u_color, temp1N.xy); 
    vec4 rgby1;
    rgby1.xy = dir1_pos.zw + dir1_pos.xy * rcpFrameOpt.zw;

    rgby1 = texture2D(u_color, rgby1.xy); 
    rgby1 = (temp1N + rgby1) * 0.5;

    vec4 temp2N;
    temp2N.xy = dir2_pos.zw - dir2_pos.xy * rcpFrameOpt.xy;
    temp2N = texture2D(u_color, temp2N.xy); 

    vec4 rgby2;
    rgby2.xy = dir2_pos.zw + dir2_pos.xy * rcpFrameOpt.xy;
    rgby2 = texture2D(u_color, rgby2.xy);
    rgby2 = (temp2N + rgby2) * 0.5; 

    rgby2 = (rgby2 + rgby1) * 0.5;

    rgby2.w = dot(rgby2.rgb, luma);

    bool twoTapLt = rgby2.w < lumaMin; 
    bool twoTapGt = rgby2.w > lumaMax; 

    if (twoTapLt || twoTapGt) 
        rgby2 = rgby1;

    return rgby2; 
}
*/
void main(void) {
#if AA_METHOD == AA_METHOD_PASS
    gl_FragColor = texture2D(u_color, v_texcoord);

#elif AA_METHOD == AA_METHOD_FXAA_LIGHT
    gl_FragColor = fxaa_light();

#elif AA_METHOD == AA_METHOD_FXAA_QUALITY
    gl_FragColor = fxaa_quality();
    //gl_FragColor = fxaa_light2();

#else

    gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0) * texture2D(u_color, v_texcoord);

#endif
}

