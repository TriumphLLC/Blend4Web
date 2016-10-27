#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var PRECISION highp
#var DOF_TYPE DOF_SIMPLE

/*============================================================================*/

precision PRECISION sampler2D;

#include <precision_statement.glslf>
#include <std.glsl>

#if DOF_TYPE == DOF_BOKEH
uniform highp sampler2D u_sharp;
uniform highp sampler2D u_blurred1;
uniform highp sampler2D u_blurred2;
uniform float u_dof_dist;

#else
#include <depth_fetch.glslf>

uniform sampler2D u_sharp;
uniform sampler2D u_blurred;
uniform sampler2D u_depth;
uniform float u_view_max_depth;
uniform float u_dof_dist;
uniform float u_dof_front_end;
uniform float u_dof_rear_end;
uniform vec2 u_camera_range;
#endif

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec2 v_texcoord;
//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {
    vec4 tex_sharp = GLSL_TEXTURE(u_sharp, v_texcoord);
    if (u_dof_dist > 0.0) {

#if DOF_TYPE == DOF_BOKEH
    // NOTE: see postprocessing/coc.glslf
        float coc;

        vec4 tex_blurred1 = GLSL_TEXTURE(u_blurred1, v_texcoord);
        vec4 tex_blurred2 = GLSL_TEXTURE(u_blurred2, v_texcoord);

        // combining blurs for hexagonal bokeh
        vec4 blurred =  min(tex_blurred1.rgba, tex_blurred2.rgba);
        coc = blurred.a;

        if (coc > 0.0) {
            // divide by coc to recover color
            blurred = vec4(blurred.rgb / coc, tex_sharp.a);

            // mix for smooth blurred areas borders
            GLSL_OUT_FRAG_COLOR = mix(tex_sharp, blurred, min(coc * 5.0, 1.0));
        }
        else
            GLSL_OUT_FRAG_COLOR = tex_sharp;

#elif DOF_TYPE == DOF_SIMPLE
        float depth = depth_fetch(u_depth, v_texcoord, u_camera_range);
        depth *= u_view_max_depth;
        float strength;
        if (depth < u_dof_dist)
            strength = (u_dof_dist - depth) / u_dof_front_end;
        else
            strength = (depth - u_dof_dist) / u_dof_rear_end;

        strength = clamp(strength, 0.0, 1.0);

        vec4 tex_blurred = GLSL_TEXTURE(u_blurred, v_texcoord);

        GLSL_OUT_FRAG_COLOR = mix(tex_sharp, tex_blurred, strength);

#else
        GLSL_OUT_FRAG_COLOR = tex_sharp;
#endif

    } else
        GLSL_OUT_FRAG_COLOR = tex_sharp;
}

