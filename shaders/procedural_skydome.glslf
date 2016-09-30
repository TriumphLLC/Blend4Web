#version GLSL_VERSION

#include <precision_statement.glslf>
#include <std.glsl>
#include <color_util.glslf>

uniform vec3 u_sky_color;
uniform vec3 u_sun_direction;

uniform float u_rayleigh_brightness;
uniform float u_mie_brightness;
uniform float u_spot_brightness;
uniform float u_scatter_strength;
uniform float u_rayleigh_strength;
uniform float u_mie_strength;
uniform float u_rayleigh_collection_power;
uniform float u_mie_collection_power;
uniform float u_mie_distribution;
//vec3 Kr = vec3(0.18867780436772762, 0.4978442963618773, 0.6616065586417131); // air

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec3 v_ray;
//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*============================================================================*/

const float surface_height = 0.99;
const float intensity = 1.8;
const int step_count = 8;

float atmospheric_depth(vec3 position, vec3 dir) {
    float a = dot(dir, dir);
    float b = 2.0*dot(dir, position);
    float c = dot(position, position)-1.0;
    float det = b*b-4.0*a*c;
    float detSqrt = sqrt(det);
    float q = (-b - detSqrt)/2.0;
    float t1 = c/q;
    return t1;
}

float phase(float alpha, float g) {
    float a = 3.0*(1.0-g*g);
    float b = 2.0*(2.0+g*g);
    float c = 1.0+alpha*alpha;
    float d = pow(1.0+g*g-2.0*g*alpha, 1.5);
    d = max(d, 0.00001);
    return (a/b)*(c/d);
}

float horizon_extinction(vec3 position, vec3 dir, float radius) {
    float u = dot(dir, -position);
    if(u<0.0){
        return 1.0;
    }
    vec3 near = position + u*dir;
    if(length(near) < radius){
        return 0.0;
    }
    else if (length(near) >= radius){
        vec3 v2 = normalize(near)*radius - position;
        float diff = acos(dot(normalize(v2), dir));
        return smoothstep(0.0, 1.0, pow(diff*2.0, 3.0));
    }
    else
        return 1.0;
}

vec3 absorb(float dist, vec3 color, float factor){
    return color-color*pow(u_sky_color, vec3(factor/dist));
}

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {

    vec3 ray = normalize(v_ray);
    vec3 ldir = u_sun_direction;
    float alpha = dot(ray, ldir);

    float rayleigh_factor = phase(alpha, -0.01) * u_rayleigh_brightness * ldir.z;
    float mie_factor = phase(alpha - 0.5, u_mie_distribution) * u_mie_brightness
                       * (1.0 - ldir.z);
    float spot = smoothstep(0.0, 100.0, phase(alpha, 0.9995)) * u_spot_brightness;

    vec3 eye_position = vec3(0.0, 0.0, surface_height);
    float eye_depth = atmospheric_depth(eye_position, ray);
    float step_length = eye_depth/float(step_count);
    float eye_extinction = horizon_extinction(eye_position, ray, 
                                              surface_height - 0.3);

    vec3 rayleigh_collected = vec3(0.0, 0.0, 0.0);
    vec3 mie_collected = vec3(0.0, 0.0, 0.0);

    for(int i=0; i < step_count; i++) {

        float sample_distance = step_length * float(i);

        vec3 position    = eye_position + ray * sample_distance;
        float extinction = horizon_extinction(position,
                                              ldir,
                                              surface_height - 0.2
                                             );
        float sample_depth = atmospheric_depth(position, ldir);
        vec3 influx = absorb(sample_depth, vec3(intensity), u_scatter_strength)
                      * extinction;
        rayleigh_collected += absorb(sqrt(sample_distance), u_sky_color * influx, 
                                     u_rayleigh_strength);

        mie_collected += absorb(sample_distance, influx, u_mie_strength);
    }

    rayleigh_collected = rayleigh_collected * eye_extinction 
                         * pow(eye_depth, u_rayleigh_collection_power) 
                         / float(step_count);

    mie_collected      = (mie_collected * eye_extinction 
                         * pow(eye_depth, u_mie_collection_power)) 
                         / float(step_count);

    vec3 color = vec3(spot * mie_collected 
                    + mie_factor * mie_collected
                    + rayleigh_factor * rayleigh_collected);

    lin_to_srgb(color);
    GLSL_OUT_FRAG_COLOR = vec4(color, 1.0);
}
