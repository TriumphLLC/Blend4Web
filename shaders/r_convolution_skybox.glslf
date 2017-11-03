#version GLSL_VERSION

#include <precision_statement.glslf>
#include <std.glsl>
#include <color_util.glslf>

uniform samplerCube u_sky_reflection;
uniform float u_roughness;

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

GLSL_IN vec3 v_ray;


float VanDerCorpus(int n, int base)
{
    float invBase = 1.0 / float(base);
    float denom   = 1.0;
    float result  = 0.0;

    for(int i = 0; i < 32; ++i)
    {
        if(n > 0)
        {
            denom   = mod(float(n), 2.0);
            result += denom * invBase;
            invBase = invBase / 2.0;
            n       = int(float(n) / 2.0);
        }
    }

    return result;
}

vec2 Hammersley(int i, int N)
{
    return vec2(float(i)/float(N), VanDerCorpus(i, 2));
}

vec3 ImportanceSampleGGX(vec2 Xi, vec3 N, float roughness)
{
    float a = roughness*roughness;
    
    float phi = 2.0 * M_PI * Xi.x;
    float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a*a - 1.0) * Xi.y));
    float sinTheta = sqrt(1.0 - cosTheta*cosTheta);
    
    // from spherical coordinates to cartesian coordinates
    vec3 H;
    H.x = cos(phi) * sinTheta;
    H.y = sin(phi) * sinTheta;
    H.z = cosTheta;
    
    // from tangent-space vector to world-space sample vector
    vec3 up        = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangent   = normalize(cross(up, N));
    vec3 bitangent = cross(N, tangent);
    
    vec3 sampleVec = tangent * H.x + bitangent * H.y + N * H.z;
    return normalize(sampleVec);
}

void main(void) {
    vec3 prefilteredColor = vec3(0.0);

    if (u_roughness != 0.0) {
        vec3 N = normalize(v_ray);    
        vec3 R = N;
        vec3 V = R;

        const int SAMPLE_COUNT = 1024;
        float totalWeight = 0.0;   
           
        for(int i = 0; i < SAMPLE_COUNT; ++i)
        {
            vec2 Xi = Hammersley(i, SAMPLE_COUNT);
            vec3 H  = ImportanceSampleGGX(Xi, N, u_roughness);
            vec3 L  = normalize(2.0 * dot(V, H) * H - V);

            float NdotL = max(dot(N, L), 0.0);
            if(NdotL > 0.0)
            {
                vec3 sky_color = GLSL_TEXTURE_CUBE(u_sky_reflection, L).rgb;
                srgb_to_lin(sky_color);

                prefilteredColor += sky_color * NdotL;
                totalWeight      += NdotL;
            }
        }
        prefilteredColor = prefilteredColor / totalWeight;
    } else {
        vec3 sky_color = GLSL_TEXTURE_CUBE(u_sky_reflection, normalize(v_ray)).rgb;
        srgb_to_lin(sky_color);

        prefilteredColor = sky_color;
    }


    GLSL_OUT_FRAG_COLOR = vec4(prefilteredColor, 1.0);
}