#var NUM_POINTS 0

#include <math.glslv>

attribute float a_point;

uniform vec3 u_line_points[NUM_POINTS];

uniform mat4 u_view_proj_matrix;

void main(void) {
    vec3 position = u_line_points[int(a_point)];
    gl_Position = u_view_proj_matrix * vec4(position, 1.0);
}

