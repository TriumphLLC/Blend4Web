#include <particles.glslv>

attribute vec3 a_position;
attribute vec3 a_normal;
attribute float a_p_delay;
attribute float a_p_lifetime;
attribute vec4 a_p_vels;

uniform vec2 u_p_size_ramp[RAMPSIZE];
uniform vec4 u_p_color_ramp[RAMPSIZE];
uniform float u_p_time;
uniform float u_p_starttime;
uniform float u_p_endtime;
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

struct part_params {
    float size;
    vec3 position;
    float alpha;
    vec3 color;
    float angle;
};

part_params calc_part_params(void) {

    float t_common = u_p_time - u_p_starttime;
    part_params sp;

    if (t_common < 0.0) {
        sp.size = 0.0001;
        sp.position = vec3(99999.0, 0.0, 0.0);
    }
    //} else {
    if (!(t_common < 0.0)) {

        float t;
        if (u_p_cyclic == 1) {
            float delta = u_p_endtime - u_p_starttime;
            t = mod(t_common, delta) - a_p_delay;
            if (t < 0.0)
                t += delta;
        }
        //} else {
        if (u_p_cyclic != 1) {
            t = t_common - a_p_delay;
        }

        if (t < 0.0 || t >= a_p_lifetime) {
            sp.size = 0.0001;
            sp.position = vec3(99999.0, 0.0, 0.0);
        }
        //} else {
        if (!(t < 0.0 || t >= a_p_lifetime)) {
            /* position */
            vec3 pos = a_position;
            vec3 norm  = a_normal;

            /* cinematics */
            pos += u_p_nfactor * t * norm;
            pos += a_p_vels.xyz * t;
            pos.y -= u_p_gravity * t * t / 2.0;
            pos += (u_p_wind/u_p_mass) * t * t /2.0;
            sp.position = pos;
        
            sp.angle = a_p_vels.w * t;

            sp.size = size_from_ramp(t, u_p_max_lifetime, u_p_size_ramp);
            
            sp.alpha = fade_alpha(t, a_p_lifetime, u_p_fade_in, u_p_fade_out);
            sp.color = color_from_ramp(t, u_p_max_lifetime, u_p_color_ramp);
        }
    }

    return sp;
}

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

