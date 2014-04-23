#var BILLBOARD_ALIGN 0

#include <particles.glslv>
#include <math.glslv>
#include <to_world.glslv>

#define BILLBOARD_ALIGN_VIEW 1
#define BILLBOARD_ALIGN_XY 2
#define BILLBOARD_ALIGN_YZ 3
#define BILLBOARD_ALIGN_ZX 4

attribute vec3 a_position;
attribute vec3 a_normal;
attribute float a_p_delay;
attribute float a_p_lifetime;
attribute vec4 a_p_vels;
attribute vec2 a_p_bb_vertex;

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

uniform mat4 u_proj_matrix;
uniform mat4 u_view_matrix;
uniform float u_p_size;

varying float v_alpha;
varying vec3 v_color;
varying vec2 v_texcoord;
varying vec4 v_pos_view;


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

// 1->2
float vec_vec_angle(vec2 v1, vec2 v2) {
    return (atan(v2.y, v2.x) - atan(v1.y, v1.x));
}

void main(void) {

    part_params pp;
    pp = calc_part_params();

    float rotation_angle;
    mat4 bb_matrix;
    
    if (BILLBOARD_ALIGN == BILLBOARD_ALIGN_VIEW) {
        rotation_angle = pp.angle;
        // NOTE: there is no simple way to extract camera eye from view matrix
        bb_matrix = billboard_spherical(pp.position, u_view_matrix);
    } else if (BILLBOARD_ALIGN == BILLBOARD_ALIGN_XY) {
        rotation_angle = pp.angle;
        bb_matrix = identity();
        bb_matrix[3] = vec4(pp.position, 1.0);
    } else if (BILLBOARD_ALIGN == BILLBOARD_ALIGN_YZ) {
        rotation_angle = pp.angle;
        bb_matrix = rotation_y(radians(90.0));
        bb_matrix[3] = vec4(pp.position, 1.0);
    } else if (BILLBOARD_ALIGN == BILLBOARD_ALIGN_ZX) {
        // NOTE: scattering only in horizontal space 
        rotation_angle = vec_vec_angle(vec2(0.0, -1.0), vec2(a_normal.x,
                a_normal.z)) + pp.angle;
        bb_matrix = rotation_x(radians(-90.0));
        bb_matrix[3] = vec4(pp.position, 1.0);
    }
    
    vec4 pos_local = vec4(a_p_bb_vertex * 2.0 * pp.size * u_p_size, 0.0, 1.0);
    vec4 pos_world = bb_matrix * rotation_z(rotation_angle) * pos_local;

    v_pos_view = u_view_matrix * pos_world;

    vec4 pos_clip = u_proj_matrix * v_pos_view;
    gl_Position = pos_clip;

    v_alpha = pp.alpha;
    v_color = pp.color;
    v_texcoord = a_p_bb_vertex + 0.5;
}

