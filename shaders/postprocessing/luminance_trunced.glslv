#version GLSL_VERSION

#include <std.glsl>

uniform vec4 u_camera_quat;
uniform vec3 u_sun_direction;
uniform float u_bloom_key;

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec2 a_position;
//------------------------------------------------------------------------------

GLSL_OUT vec2 v_texcoord;
GLSL_OUT float v_bloom_factor;

/*============================================================================*/

void multiply_vec3 (in vec4 quat, in vec3 vec, out vec3 dest) {

    // calculate quat * vec
    float ix = quat.w * vec.x + quat.y * vec.z - quat.z * vec.y;
    float iy = quat.w * vec.y + quat.z * vec.x - quat.x * vec.z;
    float iz = quat.w * vec.z + quat.x * vec.y - quat.y * vec.x;
    float iw = -quat.x * vec.x - quat.y * vec.y - quat.z * vec.z;

    // calculate result * inverse quat
    dest.x = ix * quat.w - iw * quat.x - iy * quat.z + iz * quat.y;
    dest.y = iy * quat.w - iw * quat.y - iz * quat.x + ix * quat.z;
    dest.z = iz * quat.w - iw * quat.z - ix * quat.y + iy * quat.x;

}

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {

    v_texcoord = 2.0 * a_position;

    // bloom is visible only when cam is facing towards the sun
    vec3 cam_y_dir;
    multiply_vec3(u_camera_quat, UP_VECTOR, cam_y_dir);
    v_bloom_factor = dot(-cam_y_dir, u_sun_direction) * u_bloom_key;
    // if sun is below the horizont turn off bloom
    v_bloom_factor *= max(sign(u_sun_direction.z), 0.0);
    
    gl_Position = vec4(4.0 * (a_position.xy-0.25), 0.0, 1.0);
}

