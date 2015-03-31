#var ANCHOR_NUM 0

attribute float a_index;
uniform vec3 u_position[ANCHOR_NUM];

uniform mat4 u_view_matrix;
uniform mat4 u_proj_matrix;

void main(void) {
    vec4 pos_view = u_view_matrix * vec4(u_position[int(a_index)], 1.0);
    gl_Position = u_proj_matrix * pos_view;
    gl_PointSize = 4.0;
}
