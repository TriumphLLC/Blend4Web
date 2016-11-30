#version GLSL_VERSION

/*==============================================================================
                                  INCLUDES
==============================================================================*/
#include <std.glsl>
#include <math.glslv>
#include <to_world.glslv>

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec3 a_position;
GLSL_IN vec3 a_direction;
//------------------------------------------------------------------------------


/*==============================================================================
                                   UNIFORMS
==============================================================================*/

uniform mat3 u_model_tsr;
uniform mat3 u_view_tsr;
uniform mat4 u_proj_matrix;
uniform float u_height;
uniform float u_line_width;

/*==============================================================================
                                    MAIN
==============================================================================*/

void main() {
    mat3 view_tsr = u_view_tsr;
    mat3 model_tsr = u_model_tsr;

    vertex world = to_world(a_position, vec3(0.0), vec3(0.0), vec3(0.0),
            vec3(0.0), normalize(a_direction), model_tsr);

    vec4 pos_cam = u_proj_matrix * vec4(tsr9_transform(view_tsr, world.position), 1.0);
    pos_cam.xyz /= pos_cam.w;

    vec4 pos_side_cam = u_proj_matrix * vec4(tsr9_transform(view_tsr, 
            world.position + world.normal), 1.0);
    pos_side_cam.xyz /= pos_side_cam.w;

    float aspect = u_proj_matrix[1][1] / u_proj_matrix[0][0];

    vec2 dir_cam = (pos_side_cam - pos_cam).xy;
    dir_cam.x *= aspect;

    float angle = M_PI / 2.0;
    mat2 rot_z = mat2(cos(angle), sin(angle), -sin(angle), cos(angle));
    dir_cam = rot_z * dir_cam;
    dir_cam = normalize(dir_cam);

    // width - inverse aspect
    vec2 line_width = (u_line_width / u_height) * vec2(1.0 / aspect, 1.0);
    gl_Position = vec4(pos_cam.xy + dir_cam.xy * line_width / 2.0, pos_cam.z, 1.0);
    gl_Position *= pos_cam.w;
}
