attribute vec3 a_position;

uniform mat4 u_cube_view_matrix;

varying vec3 v_ray;

void main(void) {
    
    vec4 position = vec4(a_position.xy, 0.999999, 1.0);
    vec4 ray = u_cube_view_matrix * position;

    v_ray = ray.xyz; 

    gl_Position = position;
}
