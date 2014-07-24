attribute vec3 a_position;

uniform mat4 u_sky_vp_inverse;

varying vec3 v_ray;

void main(void) {

    // z = 0.999999; compare with lens_flares and stars
    vec4 position = vec4(a_position.xy, 0.9999999, 1.0);
    vec4 ray = u_sky_vp_inverse * position;

    v_ray = ray.xyz; 

    gl_Position = position;
}
