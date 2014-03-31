#import cellular2x2_caust

#export apply_caustics

#var CAUST_SPEED vec2(0.0)
#var CAUST_SCALE 0.0
#var CAUST_BRIGHT 0.0

//Add caustics to underwater objects
void apply_caustics (inout vec3 color, vec2 texcoord, float plane_pos, 
                    float time, float shadow_factor, vec3 normal, 
                    vec3 light_direction, vec3 sun_color_intens,
                    in vec3 pos_world) {

    vec3 light_vec = light_direction;
    float l_dot_l = max(dot (normal, light_vec), 0.0);

    // how strong will aberration effect be 
    float aberration = 0.025;

    // wave aberrations on texture coordinates
    texcoord.s  += 0.5  * sin( dot (pos_world + time, vec3(1.0)));
    texcoord.t  += 0.7  * (-sin( dot (pos_world - time, vec3(-0.7))));
    texcoord.st += 0.23 * cos( 4.0 * plane_pos - CAUST_SPEED.x * time);
    texcoord.st += 3.0  * sin( plane_pos - 0.3 * CAUST_SPEED.y * time);

    // side 1 - above the water, 0 - below the water)
    float water_side = max(sign(plane_pos), 0.0);

    //scale *= 1.0 + water_side;
    float scale = CAUST_SCALE * (1.0 + max(0.1 * plane_pos, 0.0));
    // matrix with all caustic channels
    mat3 m_caustics = cellular2x2_caust((texcoord / scale), aberration);

    float caustic_R = (m_caustics * vec3(1.0, 0.0, 0.0)).x;
    float caustic_G = (m_caustics * vec3(0.0, 1.0, 0.0)).x;
    float caustic_B = (m_caustics * vec3(0.0, 0.0, 1.0)).x;

    vec3 caustics = CAUST_BRIGHT * vec3(caustic_R, caustic_G, caustic_B);

    float caust_fade = shadow_factor * l_dot_l;

    // caustic is visible on surfaces above the water and facing down
    caust_fade = min(caust_fade + 0.5 * sign(-normal.y) * water_side, 1.0);
    // caustic above water is weaker as distance increases
    caust_fade *= 1.0 - water_side * (0.1 * plane_pos);

    caustics *= caust_fade;
    caustics *= caustics;
 
    //how strong depth of water effects on caustics brighness
    float factor = min(-plane_pos + 10.0, 1.0);
    color += max((2.0 * sun_color_intens * caustics) * factor, 0.0);
}
