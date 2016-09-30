#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var PRECISION highp

/*============================================================================*/

precision PRECISION sampler2D;

#include <precision_statement.glslf>
#include <std.glsl>
#include <pack.glslf>
#include <depth_fetch.glslf>

uniform sampler2D u_depth;
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

void main(void) {
    GLSL_OUT_FRAG_COLOR = pack(clamp(depth_fetch(u_depth, v_texcoord, 
            u_camera_range), 0.0, 0.999999));
}

