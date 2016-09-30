#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var SKY_STARS 0
#var WATER_EFFECTS 0
#var DISABLE_FOG 0

/*============================================================================*/

#include <precision_statement.glslf>
#include <std.glsl>

uniform vec4  u_diffuse_color;
uniform vec3  u_halo_rings_color;
uniform vec3  u_halo_lines_color;
uniform float u_halo_hardness;
uniform float u_halo_size;

#if SKY_STARS
uniform vec3 u_sun_intensity;

# if WATER_EFFECTS && !DISABLE_FOG
uniform float u_halo_stars_blend;
uniform float u_halo_stars_height;
uniform float u_cam_water_depth;
# endif

#endif

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
#if SKY_STARS && WATER_EFFECTS && !DISABLE_FOG
GLSL_IN vec4 v_position_world;
#endif

GLSL_IN vec2 v_texcoord;
GLSL_IN float v_vertex_random;
//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*==============================================================================
                                  INCLUDES
==============================================================================*/

#include <color_util.glslf>
#include <halo_color.glslf>

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {
    vec4 frag_color = halo_color();
    vec3 color = frag_color.rgb;
    float dist = frag_color.a;
    lin_to_srgb(color);
    premultiply_alpha(color, dist);
    GLSL_OUT_FRAG_COLOR = vec4(color, dist);
}
