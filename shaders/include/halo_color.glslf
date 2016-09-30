#ifndef HALO_COLOR_GLSLF
#define HALO_COLOR_GLSLF

// #import u_diffuse_color;
// #import u_halo_rings_color;
// #import u_halo_lines_color;
// #import u_halo_hardness;
// #import u_halo_size;

// #import u_sun_intensity;
// #import u_halo_stars_blend;
// #import u_halo_stars_height;
// #import u_cam_water_depth;
// #import v_position_world;

// #import v_texcoord;
// #import v_vertex_random;

/*==============================================================================
                                    VARS
==============================================================================*/
#var NUM_RINGS 0
#var NUM_LINES 0
#var NUM_STARS 0
#var SKY_STARS 0

#var WAVES_HEIGHT 1.0

#var WATER_EFFECTS 0
#var DISABLE_FOG 0

/*============================================================================*/

#if NUM_RINGS > NUM_LINES
    const int rand_arr_length = NUM_RINGS;
#else
    const int rand_arr_length = NUM_LINES;
#endif

float mod001(float x) {
    return x - floor(x * (1.0 / 0.01)) * 0.01;
}

#if NUM_RINGS
void generate_rings(inout float ringf, in float randoms[rand_arr_length],
                     in float radist) {
    for (int a = 0; a < NUM_RINGS; a++) {

        // random number for every halo and every line (-40..0)
        float rand_ring = 40.0 * randoms[a];

        // ring size randomization
        float size_rand = 300.0 * (mod001(rand_ring) - 0.005);
        // ring blurrines randomization
        float blur_rand = rand_ring;

        // ring visibility factor
        float fac = abs(blur_rand * (u_halo_size * size_rand - radist));
        ringf += 1.0 - min(fac, 1.0); // if (fac < 1.0) ringf += (1.0 - fac);
    }
}
#endif

#if NUM_LINES
void generate_lines(inout float linef, in float randoms[rand_arr_length],
                     in float dist) {
    for (int a = 0; a < NUM_LINES; a++) {

        // random number for every halo and every line (-1..0)
        float rand_line = randoms[a];

        // line x coordinate randomization
        float x_random = rand_line;
        // line y coordinate randomization
        float y_random = 1000.0 * (mod001(rand_line) - 0.005);

        // line visibility factor
        float fac = 20.0 * abs(x_random * v_texcoord.x + y_random * v_texcoord.y);
        linef += 1.0 - min(fac, 1.0); // if (fac < 1.0) linef += (1.0 - fac);
    }
    linef *= dist;
}
#endif

void generate_stars(inout float dist, in vec2 texcoord) {
    float ster, angle;
    // rotation
    angle = atan(texcoord.y, texcoord.x);
    angle *= (1.0 + 0.25 * float(NUM_STARS));

    float co = cos(angle);
    float si = sin(angle);

    angle = (co * texcoord.x + si * texcoord.y)
          * (co * texcoord.y - si * texcoord.x);

    ster = abs(angle);

    if (ster < 1.0) {
        ster = ( 0.01 * u_halo_size) / (ster);
        // correct alpha with a star factor value
        dist *= sqrt(min(ster, 1.0));
    }
}


vec4 halo_color(void) {

    float dist = (v_texcoord.x * v_texcoord.x + v_texcoord.y * v_texcoord.y);
    float radist = sqrt(dist);
    dist = max(1.0 - dist, 0.0);

    // apply halo hardness
    dist = pow(dist, u_halo_hardness);

    float alpha = u_diffuse_color.a;

#if NUM_RINGS || NUM_LINES
    // generate array of random numbers long enough for both lines and rings
    float randoms[rand_arr_length];
    for (int i = 0; i < rand_arr_length; i++) {
        randoms[i] =  fract(v_vertex_random / float(i + 1)) - 1.0;
    }
#endif

#if NUM_RINGS
    float ringf = 0.0;
    generate_rings(ringf, randoms, radist);
#endif

#if NUM_LINES
    float linef = 0.0;
    generate_lines(linef, randoms, dist);
#endif

#if NUM_STARS
    generate_stars(dist, v_texcoord);
#endif

    dist *= alpha;
    vec3 color = u_diffuse_color.rgb;

#if NUM_RINGS
    // apply rings modification
    ringf *= dist;
    color += u_halo_rings_color * ringf;
    dist += ringf;
#endif

#if NUM_LINES
    // apply lines modification
    linef *= alpha;
    color += u_halo_lines_color * linef;
    dist += linef;
#endif

#if SKY_STARS
    // stars are visible only when sun has low brightness
    dist *= max(1.0 - 2.0 * u_sun_intensity.x, 0.0);
# if WATER_EFFECTS && !DISABLE_FOG

    // stars has lower alpha near the horizont
    float height_factor = u_halo_stars_blend
                          * (v_position_world.y - u_halo_stars_height);

    dist *= clamp(height_factor, 0.0, 1.0);
    // hide stars when underwater
    dist *= min(u_cam_water_depth + 2.0 * WAVES_HEIGHT, 1.0);
# endif

#endif

    vec4 vec_out = vec4(color, dist);
    return vec_out;
}

#endif