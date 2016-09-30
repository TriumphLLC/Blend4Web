#ifndef CAUSTICS_GLSLF
#define CAUSTICS_GLSLF

/*==============================================================================
                                    VARS
==============================================================================*/
#var SUN_NUM 0
#var CAUST_SCALE 0.25
#var CAUST_SPEED vec2(0.0)
#var CAUST_BRIGHT 0.5

/*============================================================================*/

#include <procedural.glslf>
#include <math.glslv>

#define CAUSTICS_VIEW_DISTANCE 100.0

//Add caustics to underwater objects
void apply_caustics(inout vec3 color, float plane_pos,
                    float time, vec4 shadow_factor, vec3 normal,
                    vec3 sun_direction, vec3 sun_color_intens,
                    vec4 sun_q, vec3 pos_world, float view_dist) {

    if (view_dist > CAUSTICS_VIEW_DISTANCE)
        return;

    vec3 v = pos_world + normal;

    v.xz = 10.0 * sin(0.1 * v.xz);

    // rotate world coordinates to match sun directions
    vec3 rotated_world = qrot(qinv(sun_q), v);
    vec2 texcoord = rotated_world.xz;

    vec3 light_vec = sun_direction;
    float l_dot_l = max(dot (normal, light_vec), 0.0);

    // how strong will aberration effect be 
    float aberration = 0.025;
    vec2 caust_delta = CAUST_SPEED * time;

    // wave aberrations on texture coordinates
    texcoord.s  += 0.25 * sin( dot (pos_world + time, vec3(1.0)));
    texcoord.t  += 0.35 * (-sin( dot (pos_world - time, vec3(-0.7))));
    texcoord.st += 0.15 * cos( 4.0 * plane_pos - caust_delta.x)
                 + 1.5  * sin( plane_pos - 0.3 * caust_delta.y);

    float scale = CAUST_SCALE * (1.0 + max(0.1 * plane_pos, 0.0));

    vec3 caustics = cellular2x2_caust((texcoord / scale), aberration);
    caustics *= CAUST_BRIGHT;
    caustics *= caustics;

    float height_factor = min(0.25 * plane_pos, -plane_pos) + 1.0;
    height_factor = max(height_factor, 0.0);

    float fade = shadow_factor[SUN_NUM] * l_dot_l;

    // side: 1 - above the water, 0 - below the water)
    float water_side = max(sign(plane_pos), 0.0);

    // caustics kinda reflect to surfaces facing towards the water
    fade = fade + max(0.5 * sign(-normal.y) * water_side, 0.0);
    fade = min(fade, 1.0);

    color += sun_color_intens * caustics * height_factor * fade;
}

#endif

