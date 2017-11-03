#version GLSL_VERSION

#include <precision_statement.glslf>
#include <std.glsl>
#include <color_util.glslf>

uniform samplerCube u_sky_reflection;

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

GLSL_IN vec3 v_ray;


void main(void) {
    vec3 ray = normalize(v_ray);
    vec3 sky_color;



    vec3 irradiance = vec3(0.0);

    vec3 up    = vec3(0.0, 0.0, 1.0);
    vec3 right = vec3(1.0, 0.0, 0.0);

    const float sampleDelta = 0.025;
    float nrSamples = 0.0;
    for (float phi = 0.0; phi < 2.0 * M_PI; phi += sampleDelta)
    {
        for (float theta = 0.0; theta < 0.5 * M_PI; theta += sampleDelta)
        {
            // spherical to cartesian (in tangent space)
            vec3 tangentSample = vec3(sin(theta) * cos(phi),  sin(theta) * sin(phi), cos(theta));
            // tangent space to world
            vec3 sampleVec = tangentSample.x * right + tangentSample.y * up + tangentSample.z * ray;

            vec3 sky_color = GLSL_TEXTURE_CUBE(u_sky_reflection, sampleVec).rgb;
            srgb_to_lin(sky_color);

            irradiance += sky_color * cos(theta) * sin(theta);
            nrSamples++;
        }
    }
    irradiance = M_PI * irradiance * (1.0 / float(nrSamples));

    GLSL_OUT_FRAG_COLOR = vec4(irradiance, 1.0);
}