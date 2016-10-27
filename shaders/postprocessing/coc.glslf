#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var PRECISION highp
#var COC_TYPE COC_ALL

/*============================================================================*/

precision PRECISION sampler2D;

#include <precision_statement.glslf>
#include <std.glsl>
#include <depth_fetch.glslf>

uniform sampler2D u_color;
uniform sampler2D u_depth;
#if COC_TYPE == COC_COMBINE
uniform sampler2D u_coc_fg;
#endif
uniform float u_view_max_depth;
uniform float u_dof_dist;
uniform float u_dof_front_start;
uniform float u_dof_front_end;
uniform float u_dof_rear_start;
uniform float u_dof_rear_end;
uniform vec2 u_camera_range;

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec2 v_texcoord;
//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*==============================================================================
                                    MAIN
==============================================================================*/

// REFERENCES:
//  general coc (circle of confusion) and foreground blur:
//      http://http.developer.nvidia.com/GPUGems3/gpugems3_ch28.html
//
//  bokeh imitation:
//      http://ivizlab.sfu.ca/papers/cgf2012.pdf
//      http://www.frostbite.com/2011/08/more-performance-five-rendering-ideas-from-battlefield-3-and-need-for-speed-the-run/

void main(void) {

    vec4 color = GLSL_TEXTURE(u_color, v_texcoord);
    if (u_dof_dist > 0.0) {
        float depth = depth_fetch(u_depth, v_texcoord, u_camera_range);
        depth *= u_view_max_depth;
        float coc = 0.0;

#if COC_TYPE == COC_COMBINE
        vec4 color_fg = GLSL_TEXTURE(u_coc_fg, v_texcoord);
        float coc_fg = color_fg.a;
#endif

        if (depth < u_dof_dist)
            coc = (u_dof_dist - depth - u_dof_front_start) / (u_dof_front_end - u_dof_front_start);
#if COC_TYPE != COC_FOREGROUND
        else
            coc = (depth - u_dof_dist - u_dof_rear_start) / (u_dof_rear_end - u_dof_rear_start);
#endif

        coc = clamp(coc, 0.0, 1.0);

#if COC_TYPE == COC_COMBINE
        coc = max(coc, coc_fg);
#endif

#if COC_TYPE == COC_FOREGROUND
        GLSL_OUT_FRAG_COLOR = vec4(coc);
#else
        // multiply color by coc to prevent intensity leakage
        GLSL_OUT_FRAG_COLOR = vec4(color.xyz * coc, coc);
#endif

    } else
        GLSL_OUT_FRAG_COLOR = vec4(color.xyz, 0.0);
}

