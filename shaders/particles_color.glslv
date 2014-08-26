#var COLOR_RAMP_LENGTH 0
#var SIZE_RAMP_LENGTH 0

attribute vec3 a_position;
attribute vec3 a_normal;
attribute float a_p_delay;
attribute float a_p_lifetime;
attribute vec4 a_p_vels;

#if COLOR_RAMP_LENGTH > 0
uniform vec4 u_p_color_ramp[COLOR_RAMP_LENGTH];
#endif
#if SIZE_RAMP_LENGTH > 0
uniform vec2 u_p_size_ramp[SIZE_RAMP_LENGTH];
#endif

uniform float u_p_time;
uniform float u_p_length;
uniform int u_p_cyclic;
uniform float u_p_fade_in;
uniform float u_p_fade_out;

uniform float u_p_nfactor;
uniform float u_p_gravity;
uniform float u_p_mass;
uniform vec3 u_p_wind;

uniform float u_p_max_lifetime;

uniform mat4 u_view_matrix;
uniform mat4 u_proj_matrix;
uniform float u_height;
uniform float u_p_size;

varying float v_alpha;
varying vec3 v_color;
varying vec3 v_pos_view;

#include <particles.glslv>

void main(void) {
    part_params pp;
    pp = calc_part_params();

    vec4 pos_view = u_view_matrix * vec4(pp.position, 1.0);
    gl_Position = u_proj_matrix * pos_view;
    
    v_alpha = pp.alpha;
    v_color = pp.color;

    v_pos_view = pos_view.xyz;

    float pos_size = u_height * u_proj_matrix[1][1] * u_p_size / gl_Position.z;
    gl_PointSize = pp.size * pos_size;
}
