#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var ANCHOR_NUM 0

/*============================================================================*/

#include <std.glsl>

uniform vec3 u_position[ANCHOR_NUM];
uniform mat4 u_view_proj_matrix;
uniform vec2 u_texel_size;

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN float a_index;
//------------------------------------------------------------------------------

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {

    int face_index = int(mod(a_index, 3.0));
    int pos_index = int(a_index / 3.0);

    vec2 ver_offset;
    if (face_index == 0) {
        ver_offset = vec2(-4.0 * u_texel_size[0], -u_texel_size[1]);
    } else if (face_index == 1) {
        ver_offset = vec2(4.0 * u_texel_size[0], -u_texel_size[1]);
    } else {
        ver_offset = vec2(0.0, 5.0 * u_texel_size[1]);
    }
    vec4 pos_clip = u_view_proj_matrix * vec4(u_position[pos_index], 1.0);
    pos_clip.xy += ver_offset * pos_clip.w;

    gl_Position = pos_clip;
}
