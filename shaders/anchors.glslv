#var ANCHOR_NUM 0

#include <math.glslv>

attribute float a_index;
uniform vec3 u_position[ANCHOR_NUM];

uniform mat4 u_view_proj_matrix;

void main(void) {
    gl_Position = u_view_proj_matrix * vec4(u_position[int(a_index)], 1.0);
    gl_PointSize = 4.0;
}
