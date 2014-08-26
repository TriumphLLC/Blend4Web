#import u_p_time u_p_cyclic u_p_length
#import u_p_nfactor u_p_gravity u_p_mass u_p_wind u_p_max_lifetime
#import u_p_size_ramp u_p_fade_in u_p_fade_out u_p_color_ramp
#import a_position a_normal a_p_vels a_p_delay a_p_lifetime

#export fade_alpha calc_part_params part_params

#var EPSILON 0.0001

struct part_params {
    float size;
    vec3 position;
    float alpha;
    vec3 color;
    float angle;
};

#if SIZE_RAMP_LENGTH > 0
void process_size_ramp(inout float size, float where, vec2 left, vec2 right) {
    float gap_size = right.x - left.x;
    float mix_factor = (where - left.x) / gap_size;
    size = mix(size, right.y, clamp(mix_factor, 0.0, 1.0));
}
#endif

#if COLOR_RAMP_LENGTH > 0
void process_color_ramp(inout vec3 color, float where, vec4 left, vec4 right) {
    float gap_size = right.x - left.x;
    float mix_factor = (where - left.x) / gap_size;
    color = mix(color, right.yzw, clamp(mix_factor, 0.0, 1.0));
}
#endif

#if SIZE_RAMP_LENGTH > 0
float size_from_ramp(float t, float lifetime, vec2 ramp[SIZE_RAMP_LENGTH]) {

    float where = t/lifetime;
    float size = ramp[0].y;

# if UNROLL_LOOPS
#  if SIZE_RAMP_LENGTH > 1
        process_size_ramp(size, where, ramp[0], ramp[1]);
#  endif
#  if SIZE_RAMP_LENGTH > 2
        process_size_ramp(size, where, ramp[1], ramp[2]);
#  endif
#  if SIZE_RAMP_LENGTH > 3
        process_size_ramp(size, where, ramp[2], ramp[3]);
#  endif

# else // UNROLL LOOPS
    for (int i = 1; i < SIZE_RAMP_LENGTH; i++)
        process_size_ramp(size, where, ramp[i-1], ramp[i]);
# endif

    return size;
}
#endif

#if COLOR_RAMP_LENGTH > 0
vec3 color_from_ramp(float t, float lifetime, vec4 ramp[COLOR_RAMP_LENGTH]) {

    float where = t/lifetime;
    vec3 color = ramp[0].yzw;

# if UNROLL_LOOPS
#  if COLOR_RAMP_LENGTH > 1
        process_color_ramp(color, where, ramp[0], ramp[1]);
#  endif
#  if COLOR_RAMP_LENGTH > 2
        process_color_ramp(color, where, ramp[1], ramp[2]);
#  endif
#  if COLOR_RAMP_LENGTH > 3
        process_color_ramp(color, where, ramp[2], ramp[3]);
#  endif

# else // UNROLL LOOPS
    for (int i = 1; i < COLOR_RAMP_LENGTH; i++)
        process_color_ramp(color, where, ramp[i-1], ramp[i]);
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
    if (u_p_cyclic == 1) {
        t = mod(u_p_time, u_p_length) - a_p_delay;
        if (t < 0.0)
            t += u_p_length;
    }
    //} else {
    if (u_p_cyclic != 1) {
        t = u_p_time - a_p_delay;
    }

    if (t < 0.0 || t >= a_p_lifetime) {
        sp.size = 0.0001;
        sp.position = vec3(99999.0, 0.0, 0.0);
    }
    //} else {
    if (!(t < 0.0 || t >= a_p_lifetime)) {
        /* position */
        vec3 pos = a_position;
        vec3 norm = a_normal;

        /* cinematics */
        pos += u_p_nfactor * t * norm;
        pos += a_p_vels.xyz * t;
        pos.y -= u_p_gravity * t * t / 2.0;
        float mass = max(u_p_mass, EPSILON);
        pos += (u_p_wind/mass) * t * t /2.0;
        sp.position = pos;

        sp.angle = a_p_vels.w * t;

#if SIZE_RAMP_LENGTH > 0
        sp.size = size_from_ramp(t, u_p_max_lifetime, u_p_size_ramp);
#else
        sp.size = 1.0;
#endif
#if COLOR_RAMP_LENGTH > 0
        sp.color = color_from_ramp(t, u_p_max_lifetime, u_p_color_ramp);
#else
        sp.color = vec3(1.0);
#endif
        sp.alpha = fade_alpha(t, a_p_lifetime, u_p_fade_in, u_p_fade_out);
    }
    return sp;
}
