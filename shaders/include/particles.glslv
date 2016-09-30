#ifndef PARTICLES_GLSLV
#define PARTICLES_GLSLV

// #import u_p_time u_p_cyclic u_p_length
// #import u_p_nfactor u_p_gravity u_p_mass u_p_wind_fac u_p_max_lifetime
// #import u_p_fade_in u_p_fade_out u_p_color_ramp u_color_ramp_tex
// #import u_model_tsr u_wind
// #import a_position a_normal a_p_vels a_p_data

/*==============================================================================
                                    VARS
==============================================================================*/
#var EPSILON 0.000001
#var COLOR_RAMP_LENGTH 0
#var WORLD_SPACE 0
#var USE_COLOR_RAMP 0

/*============================================================================*/

#include <math.glslv>

struct part_params {
    float size;
    vec3 position;
    float alpha;
    vec3 color;
    float angle;
    vec3 velocity;
    vec3 ang_velocity;
    float age;
};

#if COLOR_RAMP_LENGTH > 0
void process_color_ramp(inout vec3 color, float where, vec4 left, vec4 right) {
    float gap_size = right.x - left.x;
    float mix_factor = (where - left.x) / gap_size;
    color = mix(color, right.yzw, clamp(mix_factor, 0.0, 1.0));
}
#endif

#if COLOR_RAMP_LENGTH > 0
vec3 color_from_ramp(float t, float lifetime, vec4 ramp[COLOR_RAMP_LENGTH]) {

    float where = t/lifetime;
    vec3 color = ramp[0].yzw;
    // avoid loops becaus of performance issues on some mobiles
# if COLOR_RAMP_LENGTH > 1
    process_color_ramp(color, where, ramp[0], ramp[1]);
# endif
# if COLOR_RAMP_LENGTH > 2
    process_color_ramp(color, where, ramp[1], ramp[2]);
# endif
# if COLOR_RAMP_LENGTH > 3
    process_color_ramp(color, where, ramp[2], ramp[3]);
# endif
    return color;
}
#endif

/* 
 * Calculate alpha according to fade-in and fade-out intervals
 */
float fade_alpha(float t, float lifetime, float fade_in, float fade_out) {

    float fin = max(0.01, min(lifetime, fade_in));
    float fout = max(0.01, min(lifetime, fade_out));
    float fout_start = lifetime - fout;

    float alpha = clamp(t/fin, 0.0, 1.0) -
            step(fout_start, t) * (t - fout_start) / fout;

    return alpha;
}

part_params calc_part_params(void) {

    part_params sp;

    float t;
    float lifetime = a_p_data[0];
    float delay = a_p_data[1];
    if (u_p_cyclic == 1) {
        t = mod(u_p_time, u_p_length) - delay;
        if (t < 0.0)
            t += u_p_length;
    }
    //} else {
    if (u_p_cyclic != 1) {
        t = u_p_time - delay;
    }

    if (t < 0.0 || t >= lifetime) {
        sp.size = 0.0001;
        sp.position = vec3(99999.0, 0.0, 0.0);
    }
    //} else {
    if (!(t < 0.0 || t >= lifetime)) {
        /* position */

    vec3 norm_tbn = qrot(a_tbn_quat, vec3(0.0, 1.0, 0.0));
#if WORLD_SPACE
        vec3 pos = a_position;
        vec3 norm = norm_tbn;
#else
        vec3 pos = tsr9_transform(u_model_tsr, a_position);
        vec3 norm = tsr9_transform_dir(u_model_tsr, norm_tbn);
#endif

        /* cinematics */
        vec3 vel = u_p_nfactor * norm;
        vel += a_p_vels.xyz;
        vel.z -= u_p_gravity * t / 2.0;
        float mass = max(u_p_mass, EPSILON);
        vel += (u_p_wind_fac * u_wind / mass) * t /2.0;

        sp.age = t;
        sp.velocity = vel;
        sp.ang_velocity = norm_tbn * a_p_vels.w;

        sp.position = pos + vel * t;

        sp.angle = a_p_vels.w * t;

#if USE_COLOR_RAMP
        sp.size = GLSL_TEXTURE(u_color_ramp_tex, vec2(t / u_p_max_lifetime, 0.5)).g;
#else
        sp.size = 1.0;
#endif
#if COLOR_RAMP_LENGTH > 0
        sp.color = color_from_ramp(t, u_p_max_lifetime, u_p_color_ramp);
#else
        sp.color = vec3(1.0);
#endif
        sp.alpha = fade_alpha(t, a_p_data[0], u_p_fade_in, u_p_fade_out);
    }
    return sp;
}

#endif
