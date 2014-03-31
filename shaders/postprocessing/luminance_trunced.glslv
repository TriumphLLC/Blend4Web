attribute vec2 a_bb_vertex;

uniform vec4 u_camera_quat;
uniform vec3 u_sun_direction;
uniform float u_bloom_key;

varying vec2 v_texcoord;
varying float v_bloom_factor;

const vec3 y_axis = vec3 (0.0, 1.0, 0.0);

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

void main(void) {

    v_texcoord = a_bb_vertex + 0.5;

    // bloom is visible only when cam is facing towards the sun
    vec3 cam_y_dir;
    multiply_vec3(u_camera_quat, y_axis, cam_y_dir);
    v_bloom_factor = dot(-cam_y_dir, u_sun_direction) * u_bloom_key;
    // if sun is below the horizont turn off bloom
    v_bloom_factor *= max(sign(u_sun_direction.y), 0.0);
    
    gl_Position = vec4(2.0 * a_bb_vertex.xy, 0.0, 1.0);
}

