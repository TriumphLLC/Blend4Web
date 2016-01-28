#var AU_QUALIFIER uniform
#var PRECISION lowp
#var MAX_BONES 0

/*============================================================================
                                  INCLUDES
============================================================================*/

#include <math.glslv>
#include <to_world.glslv>

/*============================================================================
                                  ATTRIBUTES
============================================================================*/

attribute vec3 a_position;
attribute vec3 a_direction;

/*============================================================================
                                   UNIFORMS
============================================================================*/

uniform mat3 u_model_tsr;
uniform mat3 u_view_tsr;
uniform mat4 u_proj_matrix;
uniform float u_height;
uniform float u_line_width;

/*============================================================================
                                   VARYINGS
============================================================================*/

/*============================================================================
                                  INCLUDES
============================================================================*/

/*============================================================================
                                    MAIN
============================================================================*/

#define M_PI 3.14159265359

void main() {
    mat4 view_matrix = tsr_to_mat4(u_view_tsr);
    mat4 model_mat = tsr_to_mat4(u_model_tsr);

    vertex world = to_world(a_position, vec3(0.0), vec3(0.0), vec3(0.0),
            normalize(a_direction), model_mat);

    vec4 pos_cam = u_proj_matrix * view_matrix * vec4(world.position, 1.0);
    pos_cam.xyz /= pos_cam.w;

    vec2 dir_cam = (u_proj_matrix * view_matrix * vec4(world.normal, 0.0)).xy;

    float angle = M_PI/2.0;

    mat2 rot_z = mat2(cos(angle), sin(angle), -sin(angle), cos(angle));
    dir_cam = rot_z * normalize(dir_cam);

    // width - inverse aspect
    vec2 line_width = (u_line_width / u_height) *
            vec2(u_proj_matrix[0][0] / u_proj_matrix[1][1], 1.0);

    gl_Position = vec4(pos_cam.xy + dir_cam.xy * line_width / 2.0, pos_cam.z, 1.0);
    gl_Position *= pos_cam.w;
}
