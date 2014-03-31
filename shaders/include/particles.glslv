#export size_from_ramp color_from_ramp
#export fade_alpha

#define RAMPSIZE 4

float size_from_ramp(float t, float lifetime, vec2 ramp[RAMPSIZE]) {

    /* empty ramp */
    if (ramp[0][0] < 0.0)
        return 1.0;

    float where = t/lifetime;

    bool found = false;
    float l_pos = 0.0;
    float l_val = ramp[0][1];
    float r_pos = 1.0;
    float r_val = 1.0;

    for (int i = 0; i < RAMPSIZE; i++) {
        if (!found) {
            if (ramp[i][0] >= 0.0) {

                if (where >= l_pos && where < ramp[i][0]) {
                    //here
                    r_pos = ramp[i][0];
                    r_val = ramp[i][1];
                    found = true;
                } else if (where < l_pos || where >= ramp[i][0]) {
                    l_pos = ramp[i][0];
                    l_val = ramp[i][1];
                }
            } else if (ramp[i][0] < 0.0) {
                r_val = l_val;
                found = true;
            }
        }
    }
    // for RAMPSIZE+1 interval
    if (!found)
        r_val = l_val;

    float k = (r_val - l_val)/(r_pos - l_pos);
    return l_val + k * (where - l_pos);

}

vec3 color_from_ramp(float t, float lifetime, vec4 ramp[RAMPSIZE]) {

    /* empty ramp */
    if (ramp[0][0] < 0.0)
        return vec3(1.0, 1.0, 1.0);

    float where = t/lifetime;

    bool found = false;
    float l_pos = 0.0;
    vec3 l_val = ramp[0].yzw;
    float r_pos = 1.0;
    vec3 r_val = vec3(1.0, 1.0, 1.0);

    for (int i = 0; i < RAMPSIZE; i++) {
        if (!found) {
            if (ramp[i][0] >= 0.0) {

                if (where >= l_pos && where < ramp[i][0]) {
                    //here
                    r_pos = ramp[i][0];
                    r_val = ramp[i].yzw;
                    found = true;
                } else if (where < l_pos || where >= ramp[i][0]) {
                    l_pos = ramp[i][0];
                    l_val = ramp[i].yzw;
                }
            } else if (ramp[i][0] < 0.0) {
                r_val = l_val;
                found = true;
            }
        }
    }
    // for RAMPSIZE+1 interval
    if (!found)
        r_val = l_val;

    vec3 k = (r_val - l_val)/(r_pos - l_pos);
    return l_val + k * (where - l_pos);

}

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


